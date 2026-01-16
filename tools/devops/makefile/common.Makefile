.PHONY: $(shell grep -hoP "^[a-zA-Z0-9_-][^\. ]+(?=:[^=]*$$)" $(MAKEFILE_LIST))
.SILENT:
.DEFAULT_GOAL := help

ifndef ROOT_DIR
    $(error ROOT_DIR is not set, please set it on the first line of your makefile)
endif

ifeq (,$(findstring helper.Makefile,$(MAKEFILE_LIST)))
    #$(error "helper.Makefile" is not included, add "include $$(ROOT_DIR)/tools/devops/makefile/helper.Makefile" at the begining of your Makefile, just after ROOT_DIR definition)
    include $(ROOT_DIR)/tools/devops/makefile/helper.Makefile
endif

ifneq (,$(DEVOPS_MAKEFILE_DIR))
    ifeq ($(USE_PARALLEL_ENV),1)
        ifeq (,$(shell test -d $(ROOT_DIR)/../avanis-parallel-env && echo ok))
            $(error $(ROOT_DIR)/../avanis-parallel-env not exists$(COMMA) need to run make up before)
        endif
        ifneq (,$(shell git status -s -uno 2> /dev/null | tail -n1))
            $(error Workspace has uncommited changes$(COMMA) commit or remove them to be able to run a command with parallel en enabled)
        endif
        ifeq (,$(shell bash $(DEVOPS_MAKEFILE_DIR)/scripts/update-parallel-env.sh 1>&2 && echo ok))
            $(error Error during parallel app refresh, check logs above)
        endif
    endif
endif



# Helpers
PROJECT_DIR ?= $(realpath $(dir $(firstword $(MAKEFILE_LIST))))
DOCKER_COMPOSE_BIN ?= $(if $(shell command -v docker-compose 2> /dev/null), docker-compose, docker compose)
DOCKER_COMPOSE_FILE ?= $(shell find $(ROOT_DIR) -maxdepth 2 -name docker-compose.yaml | head -n 1)
DOCKER_COMPOSE_OVERRIDE_FILE ?= $(subst .yaml,.override.yaml,$(DOCKER_COMPOSE_FILE))
DOCKER_COMPOSE_AND_MAKE_DIR ?= $(realpath $(dir $(DOCKER_COMPOSE_FILE)))
DOCKER_COMPOSE ?= $(if $(wildcard $(DOCKER_COMPOSE_OVERRIDE_FILE)),$(DOCKER_COMPOSE_BIN) -f $(DOCKER_COMPOSE_FILE) -f $(DOCKER_COMPOSE_OVERRIDE_FILE),$(DOCKER_COMPOSE_BIN) -f $(DOCKER_COMPOSE_FILE))
DOCKER_COMPOSE_EXEC ?= $(if $(DOCKER_COMPOSE_DISABLE_TTY),$(DOCKER_COMPOSE) exec -T,$(DOCKER_COMPOSE) exec)
DOCKER_COMPOSE_EXEC_WITHOUT_TTY ?= $(DOCKER_COMPOSE) exec -T
MAIN_CONTAINER_DEFAULT_USER ?=


# Targets
# -------

ifeq (,$(call TEST_TARGET,"docker-up"))
## Containers - Up
docker-up:
	$(MAKE) -f $(DOCKER_COMPOSE_AND_MAKE_DIR)/Makefile up
endif

ifeq (,$(call TEST_TARGET,"docker-stop"))
## Containers - Stop
docker-stop:
	$(MAKE) -f $(DOCKER_COMPOSE_AND_MAKE_DIR)/Makefile stop
endif

ifeq (,$(call TEST_TARGET,"bash-main-container"))
## Containers - Run bash on main container of the app (vars : user=optional, user to use, default is your user; usage 'make bash-main-container user=root')
bash-main-container:
	$(MAKE) -f $(DOCKER_COMPOSE_AND_MAKE_DIR)/Makefile bash-container container=$(MAIN_CONTAINER) user=$(user)
endif

ifeq (,$(call TEST_TARGET,"bash-container"))
## Containers - Run bash on a container (vars : container=service name from docker-compose / user=optional, user to use, default is your user; usage 'make bash-container container=php7 user=root')
bash-container:
	$(MAKE) -f $(DOCKER_COMPOSE_AND_MAKE_DIR)/Makefile bash-container
endif

ifeq (,$(call TEST_TARGET,"cc-all"))
## Caches - Clear all caches of all apps
cc-all:
	$(MAKE) -f $(DOCKER_COMPOSE_AND_MAKE_DIR)/Makefile cc-all
endif

ifeq (,$(call TEST_TARGET,"cc-varnish"))
## Purge varnish
cc-varnish:
	$(MAKE) -f $(DOCKER_COMPOSE_AND_MAKE_DIR)/Makefile cc-varnish
endif

ifeq (,$(call TEST_TARGET,"cc-memcache"))
## Flush memcache
cc-memcache:
	$(MAKE) -f $(DOCKER_COMPOSE_AND_MAKE_DIR)/Makefile cc-memcache
endif

ifeq (,$(call TEST_TARGET,"cc-redis"))
## Flush redis
cc-redis:
	$(MAKE) -f $(DOCKER_COMPOSE_AND_MAKE_DIR)/Makefile cc-redis
endif

ifeq (,$(call TEST_TARGET,"_wait-up-container"))
# Wait a container is up by execution a command on it (eg make _wait-up-container command="..." loops=60 pause=1)
_wait-up-container:
	for j in `seq 1 $(loops)`; do \
		if ( $(DOCKER_COMPOSE) ps -a -q --status exited $(container) | grep -E ".+" > /dev/null 2>&1 ); then \
			break; \
		fi; \
		if ( $(command) > /dev/null 2>&1 ); then \
			started=1; \
			break; \
		fi; \
		echo "Wait $(container) is up..."; \
		sleep $(pause); \
	done && ([ -n "$$started" ] || (echo "$(container) not up, stop!" && exit 8))
endif

ifeq (,$(call TEST_TARGET,"_apply-patch"))
# Apply a patch
# Arguments
#  service : service name
#  command : command to execute
#            if command to execute contains $ (subrocess, variables...), use 4 $ instead one and use simples quotes on command argument
#            eg : command='a=$$$$(docker ps) && echo $$$$a'
#  strategy : by default, patch is not applied if concerned service/container was never created, use "always" value to ignore that
_apply-patch:
	[ "$(strategy)" = "always" ] || $(DOCKER_COMPOSE) ps -aq $(service) | grep -E "." > /dev/null || exit 0; \
	current=$$(docker inspect $$($(DOCKER_COMPOSE) ps -aq $(service)) 2> /dev/null | grep 'service.version' | grep -E "[0-9]+\.[0-9]+\.[0-9]+" -o || echo "1.0.0"); \
	if [ "$(patch)" != "$$current" ] && [ "$(patch)" = "$$(printf "$$current\n$(patch)" | sort -rV | head -n 1)" ]; then \
	  echo "Upgrade $(service) from $$current to $(patch)..."; \
	  $(command); \
	fi;
endif

## Help
ifeq (,$(call TEST_TARGET,"help"))
COLOR_RESET   = \033[0m
COLOR_INFO    = \033[32m
COLOR_COMMENT = \033[33m
help:
	@printf "${COLOR_COMMENT}Usage:${COLOR_RESET}\n"
	@printf " make [target]\n\n"
	@printf "${COLOR_COMMENT}Usage on make as command (eg php, phpunit...)${COLOR_RESET}\n"
	@printf " basic : make [target] [arg1] [arg2]\n"
	@printf " with options (--foo, -f...), use -- before first option : make [target] -- [--arg1] [-arg2]\n"
	@printf " with usage of '=' or ':', use args='...' instead basic : make [target] args='--arg1=value -arg2'\n\n"
	@printf "${COLOR_COMMENT}Available targets:${COLOR_RESET}\n"
	@awk '/^[^_][a-zA-Z\-_0-9\.@]+:([a-zA-Z\-_0-9\.@ ]+)?$$/ { \
		helpMessage = match(lastLine, /^## (.*)/); \
        helpCommand = substr($$1, 0, index($$1, ":")); \
        if (helpCommand != "help:" && helpCommand != ".PHONY:" && helpCommand != ".SILENT:") { \
            if (helpMessage) { \
                helpMessage = substr(lastLine, RSTART + 3, RLENGTH); \
                printf " \033[32m%-24s\033[0m %s\n", helpCommand, helpMessage; \
            } else { \
                printf " \033[32m%-24s\033[0m %s\n", helpCommand, ""; \
            } \
        } \
	} \
	{ lastLine = $$0 }' $(MAKEFILE_LIST) | sort -u -t ':' -k '1,1'
endif
