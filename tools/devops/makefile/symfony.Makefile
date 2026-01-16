DEVOPS_MAKEFILE_DIR := $(realpath $(dir $(lastword $(MAKEFILE_LIST))))
include $(DEVOPS_MAKEFILE_DIR)/php.Makefile



# Config
# ------

# Target that support command args
TARGETS_AS_COMMAND_TO_ADD = phpcodesniffer phpcodesniffer-hard phpfixer phpfixer-hard phpunit phpunit-xdebug phpunit-coverage console console-xdebug blackfire
ifdef TARGETS_AS_COMMAND
    TARGETS_AS_COMMAND := $(TARGETS_AS_COMMAND) $(TARGETS_AS_COMMAND_TO_ADD)
else
    TARGETS_AS_COMMAND := $(TARGETS_AS_COMMAND_TO_ADD)
endif

# SF config
SYMFONY_BIN_DIR ?= ./vendor/bin
PHP_FIXER_OPTS ?= --diff-format udiff



# Targets
# -------
ifeq (,$(call TEST_TARGET,"install"))
## Install
install:
	$(DOCKER_EXEC_PHP) find var/cache -mindepth 1 -name '*' -exec rm -rf {} \; 2>/dev/null | tee
	$(DOCKER_EXEC_PHP) composer install
endif

ifeq (,$(call TEST_TARGET,"console"))
## Execute symfony console (support command syntax)
console:
	$(DOCKER_EXEC_PHP) php bin/console $(COMMAND_ARGS) $(args)
endif

ifeq (,$(call TEST_TARGET,"console-xdebug"))
## Execute symfony console with xdebug enabled in debug mode (support command syntax)
console-xdebug:
	$(DOCKER_EXEC_PHP) php-xdebug bin/console $(COMMAND_ARGS) $(args)
endif

ifeq (,$(call TEST_TARGET,"console-profile"))
## Execute symfony console with xdebug enabled in profile mode (support command syntax)
console-profile:
	$(DOCKER_EXEC_PHP) php-profile bin/console $(COMMAND_ARGS) $(args)
endif

ifeq (,$(call TEST_TARGET,"cc"))
## Clear symfony cache and execute warmup
cc:
	rm -rf var/cache/*
	$(DOCKER_EXEC_PHP) php bin/console cache:clear
endif

ifeq (,$(call TEST_TARGET,"ci"))
## Execute all CI targets (phpcs, phpunit...)
ci: phpcs tests
endif

ifeq (,$(call TEST_TARGET,"ci-on-parallel-env"))
## Execute all CI targets (phpcs, phpunit...) on parallel env
ci-on-parallel-env:
	USE_PARALLEL_ENV=1 $(MAKE) ci
endif

ifeq (,$(call TEST_TARGET,"phpcs"))
## Execute all code style checking targets
phpcs: phpfixer phpcodesniffer
endif

ifeq (,$(call TEST_TARGET,"phpcs-hard"))
## Execute all code style repair targets
phpcs-hard: phpfixer-hard phpcodesniffer-hard
endif

ifeq (,$(call TEST_TARGET,"phpcodesniffer"))
## Execute PHP Codesniffer (support command syntax)
phpcodesniffer:
	$(DOCKER_EXEC_PHP) php $(SYMFONY_BIN_DIR)/phpcs --parallel=4 $(COMMAND_ARGS) $(ARGS)
endif

ifeq (,$(call TEST_TARGET,"phpcodesniffer-hard"))
## Execute PHP Codesniffer fixer (support command syntax)
phpcodesniffer-hard:
	$(DOCKER_EXEC_PHP) php $(SYMFONY_BIN_DIR)/phpcbf --parallel=4 $(COMMAND_ARGS) $(ARGS)
endif

ifeq (,$(call TEST_TARGET,"phpfixer"))
## Execute PHP Fixer in dry mode (support command syntax)
phpfixer:
	$(DOCKER_EXEC_PHP) php $(SYMFONY_BIN_DIR)/php-cs-fixer fix --allow-risky=yes --dry-run --diff --show-progress dots -v $(PHP_FIXER_OPTS) $(COMMAND_ARGS) $(ARGS)
endif

ifeq (,$(call TEST_TARGET,"phpfixer-hard"))
## Execute PHP Fixer in fixer mode (support command syntax)
phpfixer-hard:
	$(DOCKER_EXEC_PHP) php $(SYMFONY_BIN_DIR)/php-cs-fixer fix --allow-risky=yes $(COMMAND_ARGS) $(ARGS)
endif

ifeq (,$(call TEST_TARGET,"phpmd"))
## Execute PHPMD
phpmd:
	$(DOCKER_EXEC_PHP) php $(SYMFONY_BIN_DIR)/phpmd src/ text phpmd.xml --suffixes php $(COMMAND_ARGS) $(ARGS)
endif

ifeq (,$(call TEST_TARGET,"phpstan"))
## Execute PHPStan
phpstan:
	$(DOCKER_EXEC_PHP) php $(SYMFONY_BIN_DIR)/phpstan analyse -v $(COMMAND_ARGS) $(ARGS)
endif

ifeq (,$(call TEST_TARGET,"tests"))
## Execute all test targets
tests: phpunit behat
endif

ifeq (,$(call TEST_TARGET,"phpunit"))
## Execute PHPUnit (support command syntax)
phpunit:
	$(DOCKER_EXEC_PHP) php -d zend.enable_gc=0 -d memory_limit=-1 $(SYMFONY_BIN_DIR)/phpunit --no-coverage $(COMMAND_ARGS) $(ARGS)
endif

ifeq (,$(call TEST_TARGET,"phpunit-xdebug"))
## Execute PHPUnit with xdebug enabled (support command syntax)
phpunit-xdebug:
	$(DOCKER_EXEC_PHP) php-xdebug -d zend.enable_gc=0 -d memory_limit=-1 $(SYMFONY_BIN_DIR)/phpunit --no-coverage $(COMMAND_ARGS) $(ARGS)
endif

ifeq (,$(call TEST_TARGET,"phpunit-coverage"))
## Execute PHPUnit with coverage enabled (support command syntax)
phpunit-coverage:
	$(DOCKER_EXEC_PHP) php-xdebug -d zend.enable_gc=0 -d memory_limit=-1 -d xdebug.mode=coverage $(SYMFONY_BIN_DIR)/phpunit $(COMMAND_ARGS) $(ARGS)
endif

ifeq (,$(call TEST_TARGET,"behat"))
## Execute Behat (support command syntax)
behat:
	$(DOCKER_EXEC_PHP) php $(SYMFONY_BIN_DIR)/behat $(COMMAND_ARGS) $(ARGS)
endif

ifeq (,$(call TEST_TARGET,"behat-xdebug"))
## Execute Behat with xdebug enabled (support command syntax)
behat-xdebug:
	$(DOCKER_EXEC_PHP) php-xdebug $(SYMFONY_BIN_DIR)/behat --xdebug $(COMMAND_ARGS) $(ARGS)
endif

ifeq (,$(call TEST_TARGET,"behat-on-parallel-env"))
## Execute Behat on parallel env (support command syntax)
behat-on-parallel-env:
	USE_PARALLEL_ENV=1 $(MAKE) behat
endif

ifeq (,$(call TEST_TARGET,"blackfire"))
## Run blackfire cli
blackfire:
	$(DOCKER_EXEC_PHP) blackfire $(COMMAND_ARGS) $(ARGS)
endif

ifeq (,$(call TEST_TARGET,"blackfire-enable"))
## Enable blackfire
blackfire-enable:
	$(DOCKER_EXEC_PHP_ROOT) bash -c "phpenmod blackfire && supervisorctl restart php-fpm && supervisorctl start blackfire"
	echo "Done"
endif

ifeq (,$(call TEST_TARGET,"blackfire-disable"))
## Disable blackfire
blackfire-disable:
	$(DOCKER_EXEC_PHP_ROOT) bash -c "phpdismod blackfire && supervisorctl restart php-fpm && supervisorctl stop blackfire"
	echo "Done"
endif