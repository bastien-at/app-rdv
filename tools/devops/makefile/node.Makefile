DEVOPS_MAKEFILE_DIR := $(realpath $(dir $(lastword $(MAKEFILE_LIST))))
include $(DEVOPS_MAKEFILE_DIR)/common.Makefile



# Config
# ------

# Target that support command args
TARGETS_AS_COMMAND_TO_ADD = node yarn npm
ifdef TARGETS_AS_COMMAND
    TARGETS_AS_COMMAND := $(TARGETS_AS_COMMAND) $(TARGETS_AS_COMMAND_TO_ADD)
else
    TARGETS_AS_COMMAND := $(TARGETS_AS_COMMAND_TO_ADD)
endif



# Helpers
DOCKER_EXEC_NODE ?= $(DOCKER_COMPOSE_EXEC) -u www-data -w /var/www/html node22



# Targets
# -------
ifeq (,$(call TEST_TARGET,"node"))
## Execute Node command (support command syntax)
node:
	$(DOCKER_EXEC_NODE) node $(COMMAND_ARGS) $(args)
endif

ifeq (,$(call TEST_TARGET,"yarn"))
## Execute Yarn command (support command syntax)
yarn:
	$(DOCKER_EXEC_NODE) yarn $(COMMAND_ARGS) $(args)
endif

ifeq (,$(call TEST_TARGET,"npm"))
## Execute NPM command (support command syntax)
npm:
	$(DOCKER_EXEC_NODE) npm $(COMMAND_ARGS) $(args)
endif

ifeq (,$(call TEST_TARGET,"install"))
## Install
install:
	$(DOCKER_EXEC_NODE) yarn install
endif
