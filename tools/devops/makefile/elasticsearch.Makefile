ifndef ELASTICSEARCH_DUMP_BUCKET
    $(error ELASTICSEARCH_DUMP_BUCKET is not set, please set it before include this makefile)
endif

ELASTICSEARCH_MASTER ?= elasticsearch

# ES
# --
## ES - Download last version of data from google bucket to backup dir (data/elasticsearch/backup) or add date argument to download specific backup (elasticsearch-download date="2022-12-02")
elasticsearch-download:
ifdef date
	rm -rf $(ROOT_DIR)/data/elasticsearch/$(date)
	mkdir -p $(ROOT_DIR)/data/elasticsearch/$(date)
	if [ "$$(gcloud storage ls --format=gsutil gs://$(ELASTICSEARCH_DUMP_BUCKET) | grep $(date) | tail -n 1)" ]; then \
		gcloud storage rsync --delete-unmatched-destination-objects --recursive --exclude="\.gitkeep" $$(gcloud storage ls --format=gsutil gs://$(ELASTICSEARCH_DUMP_BUCKET) | grep $(date) | tail -n 1) $(ROOT_DIR)/data/elasticsearch/$(date); \
	else \
		echo "no backup for this date $(date)"; \
		rm -rf $(ROOT_DIR)/data/elasticsearch/$(date); \
	fi
else
	gcloud storage rsync --delete-unmatched-destination-objects --recursive --exclude="\.gitkeep" $$(gcloud storage ls --format=gsutil gs://$(ELASTICSEARCH_DUMP_BUCKET) | sort | tail -n 1) $(ROOT_DIR)/data/elasticsearch/backup
endif

## ES - Download last version of data BBA lan
elasticsearch-download-from-lan-bba:
	echo "SSH password is 'raspberry'"
	rsync -rtPh --delete --exclude=.gitignore --exclude=.gitkeep --force pi@it-raspberry-bba.avanis.org:~/Documents/$(ELASTICSEARCH_DUMP_BUCKET)/last/ $(ROOT_DIR)/data/elasticsearch/backup

## ES - Download last version of data MBL lan
elasticsearch-download-from-lan-mlb:
	echo "SSH password is 'avanis-78'"
	rsync -rtPh --delete --inplace --no-compress --info=progress2 --exclude=.gitignore --exclude=.gitkeep --force dev@it-raspberry-mlb.avanis.org:/usr/share/downloader/data/$(ELASTICSEARCH_DUMP_BUCKET)/last/ $(ROOT_DIR)/data/elasticsearch/backup

## ES - Reset data of elasticsearch service from your backup data (data/elasticsearch/backup) or add dir argument to download specific backup (elasticsearch-reset-from-backup dir="backup-2022-12-02")
elasticsearch-reset-from-backup:
	$(eval dir := backup)
	test -d $(ROOT_DIR)/data/elasticsearch/$(dir) || (echo "Dir $(ROOT_DIR)/data/elasticsearch/$(dir) not exists" && exit 1)
	$(DOCKER_COMPOSE) stop $(ELASTICSEARCH_MASTER)
	$(DOCKER_COMPOSE) rm -v -f $(ELASTICSEARCH_MASTER)
	rm -rf $(ROOT_DIR)/data/elasticsearch/master/*
	echo "Copy data/elasticsearch/backup to data/elasticsearch/master..."
	cp -r $(ROOT_DIR)/data/elasticsearch/$(dir)/* $(ROOT_DIR)/data/elasticsearch/master
	$(DOCKER_COMPOSE) up -d $(ELASTICSEARCH_MASTER) --wait

## ES - Reset data of elasticsearch service from google bucket data (get last version)
elasticsearch-reset-from-bucket:
	$(DOCKER_COMPOSE) stop $(ELASTICSEARCH_MASTER)
	$(DOCKER_COMPOSE) rm -v -f $(ELASTICSEARCH_MASTER)
	rm -rf $(ROOT_DIR)/data/elasticsearch/*
	gcloud storage rsync --delete-unmatched-destination-objects --recursive --exclude="\.gitkeep" $$(gcloud storage ls --format=gsutil gs://$(ELASTICSEARCH_DUMP_BUCKET) | sort | tail -n 1) $(ROOT_DIR)/data/elasticsearch/master
	$(DOCKER_COMPOSE) up -d $(ELASTICSEARCH_MASTER) --wait
