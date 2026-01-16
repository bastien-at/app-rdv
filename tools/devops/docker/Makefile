.PHONY: $(shell grep -hE "^[a-zA-Z0-9_-].+:.*$$" $(MAKEFILE_LIST) | sed 's#:##')
.SILENT:
.DEFAULT_GOAL := help
SHELL := /bin/bash

# Rainbow printers
RED ?= /bin/echo -e "\x1b[31m$1\x1b[0m"
GREEN ?= /bin/echo -e "\x1b[32m$1\x1b[0m"
YELLOW ?= /bin/echo -e "\x1b[33m$1\x1b[0m"
BLUE ?= /bin/echo -e "\x1b[34m$1\x1b[0m"
PURPLE ?= /bin/echo -e "\x1b[35m$1\x1b[0m"
CYAN ?= /bin/echo -e "\x1b[36m$1\x1b[0m"
COMMA ?= ,
RED_CODE = \033[31m
GREEN_CODE = \033[32m
YELLOW_CODE = \033[33m
NOCOLOR_CODE  = \033[0m
MAKE ?= make --no-print-directory
NDEF ?= $(if $(value $(1)),,$(error $(1) not set))

# Varnish
# -----
## Build varnish
build-varnish:
	IMAGE=varnish bash scripts/build.sh
## Push varnish
push-varnish:
	IMAGE=varnish bash scripts/push.sh
## Build & push varnish
build-and-push-varnish:
	PUSH=1 IMAGE=varnish bash scripts/build.sh

# RabbitMQ
# -----
## Build rabbitmq
build-rabbitmq:
	IMAGE=rabbitmq bash scripts/build.sh
## Push rabbitmq
push-rabbitmq:
	IMAGE=rabbitmq bash scripts/push.sh
## Build & push rabbitmq
build-and-push-rabbitmq:
	PUSH=1 IMAGE=rabbitmq bash scripts/build.sh

# FTP
# -----
## Build ftp
build-ftp:
	IMAGE=ftp bash scripts/build.sh
## Push ftp
push-ftp:
	IMAGE=ftp bash scripts/push.sh
## Build & push ftp
build-and-push-ftp:
	PUSH=1 IMAGE=ftp bash scripts/build.sh

# SFTP
# -----
## Build sftp
build-sftp:
	IMAGE=sftp bash scripts/build.sh
## Push sftp
push-sftp:
	IMAGE=sftp bash scripts/push.sh
## Build & push sftp
build-and-push-sftp:
	PUSH=1 IMAGE=sftp bash scripts/build.sh

# DNS
# -----
## Build dns
build-dns:
	IMAGE=dns bash scripts/build.sh
## Push dns
push-dns:
	IMAGE=dns bash scripts/push.sh
## Build & push dns
build-and-push-dns:
	PUSH=1 IMAGE=dns bash scripts/build.sh

# Traefik
# -----
## Build traefik
build-traefik:
	IMAGE=traefik bash scripts/build.sh
## Push traefik
push-traefik:
	IMAGE=traefik bash scripts/push.sh
## Build & push traefik
build-and-push-traefik:
	PUSH=1 IMAGE=traefik bash scripts/build.sh

# Node 22
# -----
## Build Node 22
build-node-22:
	IMAGE=node-22 BUILD_PATH=node DOCKERFILE=22/Dockerfile bash scripts/build.sh
## Push Node 22
push-node-22:
	IMAGE=node-22 BUILD_PATH=node DOCKERFILE=22/Dockerfile bash scripts/push.sh
## Build & push Node 22
build-and-push-node-22:
	PUSH=1 IMAGE=node-22 BUILD_PATH=node DOCKERFILE=22/Dockerfile bash scripts/build.sh

# PHP 7.4
# -----
## Build PHP 7.4
build-php-74:
	IMAGE=php-7.4 BUILD_PATH=php DOCKERFILE=7.4/Dockerfile bash scripts/build.sh
## Push PHP 7.4
push-php-74:
	IMAGE=php-7.4 BUILD_PATH=php DOCKERFILE=7.4/Dockerfile bash scripts/push.sh
## Build & push PHP 7.4
build-and-push-php-74:
	PUSH=1 IMAGE=php-7.4 BUILD_PATH=php DOCKERFILE=7.4/Dockerfile bash scripts/build.sh

# PHP 8.4
# -----
## Build PHP 8.4
build-php-84:
	IMAGE=php-8.4 BUILD_PATH=php DOCKERFILE=8.4/Dockerfile bash scripts/build.sh
## Push PHP 8.4
push-php-84:
	IMAGE=php-8.4 BUILD_PATH=php DOCKERFILE=8.4/Dockerfile bash scripts/push.sh
## Build & push PHP 8.4
build-and-push-php-84:
	PUSH=1 IMAGE=php-8.4 BUILD_PATH=php DOCKERFILE=8.4/Dockerfile bash scripts/build.sh

# Cypress
# -----
## Build Cypress
build-cypress:
	NEW_TAG=as_target IMAGE=cypress bash scripts/build.sh
## Push Cypress
push-cypress:
	NEW_TAG=as_target IMAGE=cypress bash scripts/push.sh
## Build & push Cypress
build-and-push-cypress:
	NEW_TAG=as_target PUSH=1 IMAGE=cypress bash scripts/build.sh

# ElasticSearch 7
# -----
## Build ElasticSearch 7
build-elasticsearch-7:
	NEW_TAG=as_source_and_target IMAGE=elasticsearch BUILD_PATH=elasticsearch/7 bash scripts/build.sh
## Push ElasticSearch 7
push-elasticsearch-7:
	NEW_TAG=as_source_and_target IMAGE=elasticsearch BUILD_PATH=elasticsearch/7 bash scripts/push.sh
## Build & push ElasticSearch 7
build-and-push-elasticsearch-7:
	NEW_TAG=as_source_and_target PUSH=1 IMAGE=elasticsearch BUILD_PATH=elasticsearch/7 bash scripts/build.sh

# Mysql Replication Watcher
# -----
## Build Mysql Replication Watcher
build-mysql-replication-watcher:
	IMAGE=mysql-replication-watcher BUILD_PATH=mysql-replication-watcher bash scripts/build.sh
## Push Mysql Replication Watcher
push-mysql-replication-watcher:
	IMAGE=mysql-replication-watcher BUILD_PATH=mysql-replication-watcher bash scripts/push.sh
## Build & push Mysql Replication Watcher
build-and-push-mysql-replication-watcher:
	PUSH=1 IMAGE=mysql-replication-watcher BUILD_PATH=mysql-replication-watcher bash scripts/build.sh

## Help
ifeq (,$(call TEST_TARGET,"help"))
help:
	@printf "${YELLOW_CODE}Usage:${NOCOLOR_CODE}\n"
	@printf " make [target]\n\n"
	@printf "${YELLOW_CODE}Available targets:${NOCOLOR_CODE}\n"
	@awk '/^[^_][a-zA-Z\-_0-9\.@]+:([a-zA-Z\-_0-9\.@ ]+)?$$/ { \
		helpMessage = match(lastLine, /^## (.*)/); \
		helpCommand = substr($$1, 0, index($$1, ":")); \
		if (helpCommand != "help:" && helpCommand != "@:" && helpCommand != ".PHONY:" && helpCommand != ".SILENT:") { \
			if (helpMessage) { \
				helpMessage = substr(lastLine, RSTART + 3, RLENGTH); \
				printf " \033[32m%-32s\033[0m %s\n", helpCommand, helpMessage; \
			} else { \
				printf " \033[32m%-32s\033[0m %s\n", helpCommand, ""; \
			} \
		} \
	} \
	{ lastLine = $$0 }' $(MAKEFILE_LIST)
endif