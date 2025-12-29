ifndef MYSQL_DUMP_BUCKET
    $(error MYSQL_DUMP_BUCKET is not set, please set it before include this makefile)
endif
ifndef MYSQL_ROOT_PASS
    $(error MYSQL_ROOT_PASS is not set, please set it before include this makefile)
endif

MYSQL_MASTER ?= mysql-master
MYSQL_SLAVE ?= mysql-slave
MYSQL_REPLICATION_WATCHER ?= ""
MYSQL_REPLICATION_WATCHER_RESET_REDIS_COMMAND ?= redis redis-cli -n 1 del mysql_cdc_last_file mysql_cdc_last_pos
MYSQL_INIT_SCRIPTS ?= ""

# MySQL
# -----
## MySQL - Download last version of data from google bucket to backup dir (data/mysql/backup) or add date argument to download specific backup (mysql-download date="2022-12-02")
mysql-download:
	bash $(ROOT_DIR)/tools/devops/makefile/scripts/check-mysql-download.sh
ifdef date
	rm -rf $(ROOT_DIR)/data/mysql/$(date)
	mkdir $(ROOT_DIR)/data/mysql/$(date)
	if [ "$$(gcloud storage ls --format=gsutil gs://$(MYSQL_DUMP_BUCKET) | grep $(date) | tail -n 1)" ]; then \
		gcloud storage rsync --delete-unmatched-destination-objects --recursive --exclude="\.gitkeep" $$(gcloud storage ls --format=gsutil gs://$(MYSQL_DUMP_BUCKET) | grep $(date) | tail -n 1) $(ROOT_DIR)/data/mysql/$(date); \
	else \
		echo "no backup for this date $(date)"; \
		rm -rf $(ROOT_DIR)/data/mysql/$(date); \
	fi
else
	gcloud storage rsync --delete-unmatched-destination-objects --recursive --exclude="\.gitkeep" $$(gcloud storage ls --format=gsutil gs://$(MYSQL_DUMP_BUCKET) | sort | tail -n 1) $(ROOT_DIR)/data/mysql/backup
endif

## MySQL - Download last version of data BBA lan
mysql-download-from-lan-bba:
	echo "SSH password is 'raspberry'"
	rsync -rtPhW --delete --inplace --exclude=.gitignore --exclude=.gitkeep --force pi@it-raspberry-bba.avanis.org:~/Documents/$(MYSQL_DUMP_BUCKET)/last/ $(ROOT_DIR)/data/mysql/backup

## MySQL - Download last version of data MLB lan
mysql-download-from-lan-mlb:
	echo "SSH password is 'avanis-78'"
	rsync -rtPhW --delete --inplace --exclude=.gitignore --exclude=.gitkeep --force dev@it-raspberry-mlb.avanis.org:/usr/share/downloader/data/$(MYSQL_DUMP_BUCKET)/last/ $(ROOT_DIR)/data/mysql/backup

## MySQL - Reset data of mysql service from your backup data (data/mysql/backup) or add dir argument to download specific backup (mysql-reset-from-backup dir="backup-2022-12-02")
mysql-reset-from-backup:
	$(eval dir := backup)
	test -d $(ROOT_DIR)/data/mysql/$(dir) || (echo "Dir $(ROOT_DIR)/data/mysql/$(dir) not exists" && exit 1)
	$(DOCKER_COMPOSE) stop $(MYSQL_MASTER) $(MYSQL_SLAVE)
	$(MAKE) -f $(ROOT_DIR)/docker/Makefile _mysql-stop-replication-watcher
	$(DOCKER_COMPOSE) rm -v -f $(MYSQL_MASTER)
	rm -rf $(ROOT_DIR)/data/mysql/master/* $(ROOT_DIR)/data/mysql/slave/*
	echo "Copy data/mysql/$(dir) to data/mysql/master..."
	cp -r $(ROOT_DIR)/data/mysql/$(dir)/* $(ROOT_DIR)/data/mysql/master
	$(DOCKER_COMPOSE) up -d $(MYSQL_MASTER) --wait
	$(MAKE) -f $(ROOT_DIR)/docker/Makefile _mysql-init-scripts
	$(MAKE) -f $(ROOT_DIR)/docker/Makefile _mysql-reset-replication-watcher

## MySQL - Reset data of mysql service from google bucket data (get last version)
mysql-reset-from-bucket:
	$(DOCKER_COMPOSE) stop $(MYSQL_MASTER) $(MYSQL_SLAVE)
	$(MAKE) -f $(ROOT_DIR)/docker/Makefile _mysql-stop-replication-watcher
	$(DOCKER_COMPOSE) rm -v -f $(MYSQL_MASTER)
	rm -rf $(ROOT_DIR)/data/mysql/slave/*
	gcloud storage rsync --delete-unmatched-destination-objects --recursive --exclude="\.gitkeep" $$(gcloud storage ls --format=gsutil gs://$(MYSQL_DUMP_BUCKET) | sort | tail -n 1) $(ROOT_DIR)/data/mysql/master
	$(DOCKER_COMPOSE) up -d $(MYSQL_MASTER) --wait
	$(MAKE) -f $(ROOT_DIR)/docker/Makefile _mysql-init-scripts
	$(MAKE) -f $(ROOT_DIR)/docker/Makefile _mysql-reset-replication-watcher

## Helper to launch
_mysql-init-scripts:
ifneq ($(MYSQL_INIT_SCRIPTS),"")
	for file in "$(MYSQL_INIT_SCRIPTS)"; do $(DOCKER_COMPOSE_EXEC_WITHOUT_TTY) -e MYSQL_PWD='$(MYSQL_ROOT_PASS)' $(MYSQL_MASTER) mysql -u root < $$file; done
else
	echo "No MySQL init scripts to run..."
endif

## Helper to stop replication watcher
_mysql-stop-replication-watcher:
ifneq ($(MYSQL_REPLICATION_WATCHER),"")
	$(DOCKER_COMPOSE) stop $(MYSQL_REPLICATION_WATCHER)
else
	echo "No replication watcher to stop..."
endif

## Helper to reset data about replication watcher
_mysql-reset-replication-watcher:
ifneq ($(MYSQL_REPLICATION_WATCHER),"")
	$(DOCKER_COMPOSE) stop $(MYSQL_REPLICATION_WATCHER)
	$(DOCKER_COMPOSE) exec $(MYSQL_REPLICATION_WATCHER_RESET_REDIS_COMMAND) || echo "Replication-watcher : Redis not running, skip clean redis data"
	$(DOCKER_COMPOSE) up -d $(MYSQL_REPLICATION_WATCHER)
else
	echo "No replication watcher to reset..."
endif
