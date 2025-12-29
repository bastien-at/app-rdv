.PHONY: $(shell grep -hoP "^[a-zA-Z0-9_-][^\. ]+(?=:[^=]*$$)" $(MAKEFILE_LIST))
.SILENT:
.DEFAULT_GOAL := help

ROOT_DIR ?= $(realpath $(dir $(firstword $(MAKEFILE_LIST))))

# Shell to use
SHELL := /bin/bash

# Helpers
DOCKER_COMPOSE_BIN ?= $(if $(shell command -v docker-compose 2> /dev/null), docker-compose, docker compose)
DOCKER_COMPOSE_FILE ?= $(shell find $(ROOT_DIR) -maxdepth 1 -name docker-compose.yaml | head -n 1)
DOCKER_COMPOSE_OVERRIDE_FILE ?= $(subst .yaml,.override.yaml,$(DOCKER_COMPOSE_FILE))
DOCKER_COMPOSE_AND_MAKE_DIR ?= $(realpath $(dir $(DOCKER_COMPOSE_FILE)))
DOCKER_COMPOSE ?= $(if $(wildcard $(DOCKER_COMPOSE_OVERRIDE_FILE)),$(DOCKER_COMPOSE_BIN) -f $(DOCKER_COMPOSE_FILE) -f $(DOCKER_COMPOSE_OVERRIDE_FILE),$(DOCKER_COMPOSE_BIN) -f $(DOCKER_COMPOSE_FILE)) -f extensions/fleet/fleet-compose.yml -f extensions/heartbeat/heartbeat-compose.yml
DOCKER_COMPOSE_EXEC ?= $(if $(DOCKER_COMPOSE_DISABLE_TTY),$(DOCKER_COMPOSE) exec -T,$(DOCKER_COMPOSE) exec)
DOCKER_COMPOSE_EXEC_WITHOUT_TTY ?= $(DOCKER_COMPOSE) exec -T
MAKE ?= make --no-print-directory
#NDEF ?= $(if $(value $(1)),,$(error $(1) not set))
TEST_TARGET ?= $(shell (( $$(grep "^$(1):" $(MAKEFILE_LIST) | wc -l) > 1 )) && echo "ok")

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

# Required for target "generate-k8s-resources"
ifeq (,$(wildcard .env))
  $(error "No .env file detected, get it from backup (see README-avanis.md -> Backup) or create a new one from dist file before continue ")
endif
include .env

# Check versions in .env files
CHECK_VERSION_RESULT ?= $(shell (difflist=$$(diff --color <(grep -h _VERSION .env | sort) <(grep -h _VERSION .env.dist | sort) | grep -oP '[A-Z_]+VERSION' | sort -u | sed ':a;N;$$!ba;s/\n/ - /g' || echo "") && \
	( \
		[ "$$difflist" = "" ] || \
		printf "${RED_CODE}Value of '$$difflist' in .env and .env.dist files are not same, please fix before continue !${NOCOLOR_CODE}\n" \
	)))
ifneq (,$(CHECK_VERSION_RESULT))
  $(error ${CHECK_VERSION_RESULT})
endif


# Targets
# -------

# Containers
# -----
## Containers - Up | `make init`
init:
	$(DOCKER_COMPOSE) up --detach --remove-orphans --scale fleet-server=0 --scale heartbeat=0

## Containers - Up | `make up elasticsearch`
up: init-cert
	systemctl restart notifier.service
	systemctl restart certbot-renew.service
	systemctl restart certbot-renew.timer
	if [[ "$(filter-out $@,$(MAKECMDGOALS))" != "" ]]; then \
		$(DOCKER_COMPOSE) up --detach --remove-orphans $(filter-out $@,$(MAKECMDGOALS)); \
	else \
		echo "Start elasticsearch"; \
		$(DOCKER_COMPOSE) up --detach --remove-orphans elasticsearch $(filter-out $@,$(MAKECMDGOALS)); \
		source .env.dist && source .env; \
		for j in `seq 1 300`; do \
			if ( $(DOCKER_COMPOSE) ps -q --status exited elasticsearch | grep -E ".+" > /dev/null 2>&1 ); then \
				break; \
			fi; \
			if ( curl -s -u "elastic:$$ELASTIC_PASSWORD" https://logs.alltricks.sexy:9200/_cluster/health | grep -E 'yellow|green' > /dev/null 2>&1 ); then \
				started=1; \
				break; \
			fi; \
			echo "Wait elasticsearch is up..."; \
			sleep 2; \
		done && ([ -n "$$started" ] || (echo "elasticsearch not up, stop!" && exit 8)); \
		echo "Start other components"; \
		$(DOCKER_COMPOSE) up --detach --remove-orphans $(filter-out $@,$(MAKECMDGOALS)); \
	fi;

## Initialize let's encrypt certificate
init-cert:
	./scripts/certbot.sh create

## Renew let's encrypt certificate
renew-cert:
	./scripts/certbot.sh renew


## Containers - Build | `make build`
build:
	$(DOCKER_COMPOSE) build $(filter-out $@,$(MAKECMDGOALS))

## Containers - Stop | `make stop elasticsearch`
stop:
	systemctl stop notifier.service
	systemctl stop certbot-renew.service
	systemctl stop certbot-renew.timer
	$(DOCKER_COMPOSE) stop $(filter-out $@,$(MAKECMDGOALS))

## Containers - Stop and up | `make reload elasticsearch`
reload:
	$(MAKE) restart $(filter-out $@,$(MAKECMDGOALS))
	$(MAKE) up $(filter-out $@,$(MAKECMDGOALS))

## Containers - Restart | `make restart fleet-server`
restart:
	systemctl restart notifier.service
	$(DOCKER_COMPOSE) restart $(filter-out $@,$(MAKECMDGOALS))

## Containers - Ps | `make ps`
ps:
	$(DOCKER_COMPOSE) ps

## Containers - Logs | `make logs elasticsearch kibana`
logs:
	$(DOCKER_COMPOSE) logs $(filter-out $@,$(MAKECMDGOALS))

## Containers - Exec | `make exec kibana bash`
exec:
	$(DOCKER_COMPOSE) exec -it $(filter-out $@,$(MAKECMDGOALS))

## Containers - Exec as root | `make exec-as-root kibana bash`
exec-as-root:
	$(DOCKER_COMPOSE) exec -it -u root $(filter-out $@,$(MAKECMDGOALS))

# Kube
# -----
## Kube - Generate Kubernetes resources - Usage : `make generate-k8s-resources TV_STAGING` or `make generate-k8s-resources AT_PROD`
generate-k8s-resources:
	$(eval mode := display)
	$(eval PROJECT := $(shell echo '$(filter-out $@,$(MAKECMDGOALS))' | tr '[:lower:]' '[:upper:]'))
	$(eval app := $(shell echo '$(PROJECT)' | cut -d "_" -f 1 | tr '[:upper:]' '[:lower:]'))
	$(eval env := $(shell echo '$(PROJECT)' | cut -d "_" -f 2 | tr '[:upper:]' '[:lower:]'))
	if [[ -z "${${PROJECT}_GKE_FLEET_ENROLLMENT_TOKEN}" ]] || [[ -z "${${PROJECT}_KSM_FLEET_ENROLLMENT_TOKEN}" ]] || [[ -z "${${PROJECT}_RUM_FLEET_ENROLLMENT_TOKEN}" ]]; then echo "Missing / wrong env to use : AT_PROD, AT_STAGING, TV_PROD or TV_STAGING"; exit 1; fi
	FLEET_ENROLLMENT_TOKEN=${${PROJECT}_GKE_FLEET_ENROLLMENT_TOKEN} KSM_FLEET_ENROLLMENT_TOKEN=${${PROJECT}_KSM_FLEET_ENROLLMENT_TOKEN} RUM_FLEET_ENROLLMENT_TOKEN=${${PROJECT}_RUM_FLEET_ENROLLMENT_TOKEN} bash scripts/create-elastic-agent-helm-values.sh "${mode}" "${app}" "${env}"

## Kube - Generate and apply Kubernetes resources - Usage : `make apply-k8s-resources TV_STAGING` or `make apply-k8s-resources AT_PROD`
apply-k8s-resources:
	@printf "You are authenticate on cluster ${YELLOW_CODE}$(shell kubectl config current-context)${NOCOLOR_CODE}.\n"
	(echo -n 'Are you sure you want to continue (y/[n]) ? ' && read confirm && [[ "$${confirm,,}" = "y" ]])
	$(MAKE) generate-k8s-resources mode=apply $(filter-out $@,$(MAKECMDGOALS))

## Kube - Rollout all agents
rollout-k8s-daemonsets:
	(echo -n 'You need authenticate your kubectl on correct cluster before continue, is it ok (y/[n]) ? ' && read confirm && [[ "$${confirm,,}" = "y" ]])
	kubectl rollout restart daemonset/elastic-agent -n elastic-agent
	kubectl rollout restart daemonset/elastic-agent-jobs -n elastic-agent
	kubectl rollout restart deployment/elastic-agent-kube-state-metrics -n elastic-agent
	kubectl rollout restart deployment/elastic-agent-real-user-monitoring -n elastic-agent

# ES
# -----
## Elasticsearch - Rollover all logs indexes
es-rollover-logs-indexes:
	scripts/rollover-logs-indexes.sh


# Helper - Remove warning with $(filter-out $@,$(MAKECMDGOALS)
%:
	@:

## Help
ifeq (,$(call TEST_TARGET,"help"))
COLOR_RESET   = \033[0m
COLOR_INFO    = \033[32m
COLOR_COMMENT = \033[33m
help:
	@printf "${COLOR_COMMENT}Usage:${COLOR_RESET}\n"
	@printf " make [target]\n\n"
	@printf "${COLOR_COMMENT}Available targets:${COLOR_RESET}\n"
	@awk '/^[^_][a-zA-Z\-_0-9\.@]+:([a-zA-Z\-_0-9\.@ ]+)?$$/ { \
		helpMessage = match(lastLine, /^## (.*)/); \
        helpCommand = substr($$1, 0, index($$1, ":")); \
        if (helpCommand != "help:" && helpCommand != "@:" && helpCommand != ".PHONY:" && helpCommand != ".SILENT:") { \
            if (helpMessage) { \
                helpMessage = substr(lastLine, RSTART + 3, RLENGTH); \
                printf " \033[32m%-24s\033[0m %s\n", helpCommand, helpMessage; \
            } else { \
                printf " \033[32m%-24s\033[0m %s\n", helpCommand, ""; \
            } \
        } \
	} \
	{ lastLine = $$0 }' $(MAKEFILE_LIST)
endif
