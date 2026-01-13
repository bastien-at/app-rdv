DEVOPS_MAKEFILE_DIR := $(realpath $(dir $(lastword $(MAKEFILE_LIST))))
include $(DEVOPS_MAKEFILE_DIR)/common.Makefile



# Config
# ------

# Target that support command args
TARGETS_AS_COMMAND_TO_ADD = php php-xdebug php-profile composer
ifdef TARGETS_AS_COMMAND
    TARGETS_AS_COMMAND := $(TARGETS_AS_COMMAND) $(TARGETS_AS_COMMAND_TO_ADD)
else
    TARGETS_AS_COMMAND := $(TARGETS_AS_COMMAND_TO_ADD)
endif



# Helpers
DOCKER_EXEC_PHP ?= $(DOCKER_COMPOSE_EXEC) -w /var/www/$(if $(USE_PARALLEL_ENV),html-parallel-env,html)/symfony/$(notdir $(PROJECT_DIR)) $(if $(USE_PARALLEL_ENV),-e USE_PARALLEL_ENV=1,) -u www-data php8
DOCKER_EXEC_PHP_ROOT ?= $(subst -u www-data,-u root,$(DOCKER_EXEC_PHP))


# Targets
# -------
ifeq (,$(call TEST_TARGET,"php"))
## Execute PHP command (support command syntax)
php:
	$(DOCKER_EXEC_PHP) php $(COMMAND_ARGS) $(args)
endif

ifeq (,$(call TEST_TARGET,"php-xdebug"))
## Execute PHP commmand with xdebug enabled in debug mode (support command syntax)
php-xdebug:
	$(DOCKER_EXEC_PHP) php-xdebug $(COMMAND_ARGS) $(args)
endif

ifeq (,$(call TEST_TARGET,"php-xdebug-enable-auto-start"))
## Force xdebug auto start (not need cookie nor query param) on php container
php-xdebug-enable-auto-start:
	$(DOCKER_EXEC_PHP_ROOT) sed -i -E 's#xdebug.start_with_request=.+#xdebug.start_with_request=yes#' /etc/php/*/mods-available/xdebug.ini
	$(DOCKER_EXEC_PHP_ROOT) bash -c '/etc/init.d/php*-fpm reload'
endif

ifeq (,$(call TEST_TARGET,"php-xdebug-disable-auto-start"))
## Disable xdebug auto start on php container
php-xdebug-disable-auto-start:
	$(DOCKER_EXEC_PHP_ROOT) sed -i -E 's#xdebug.start_with_request=.+#xdebug.start_with_request=trigger#' /etc/php/*/mods-available/xdebug.ini
	$(DOCKER_EXEC_PHP_ROOT) bash -c '/etc/init.d/php*-fpm reload'
endif

ifeq (,$(call TEST_TARGET,"php-profile"))
## Execute PHP commmand with xdebug enabled in profile mode (support command syntax)
php-profile:
	$(DOCKER_EXEC_PHP) php-profile $(COMMAND_ARGS) $(args)
endif

ifeq (,$(call TEST_TARGET,"php-pcov-enable"))
## Enable pcov on php container (support command syntax)
php-pcov-enable:
	$(DOCKER_EXEC_PHP_ROOT) bash -c "sed -i -E 's#pcov.enabled=.+#pcov.enabled=1#' /etc/php/*/mods-available/pcov.ini"
	$(DOCKER_EXEC_PHP_ROOT) bash -c '/etc/init.d/php*-fpm reload'
endif

ifeq (,$(call TEST_TARGET,"php-pcov-disable"))
## Disable pcov on php container
php-pcov-disable:
	$(DOCKER_EXEC_PHP_ROOT) bash -c "sed -i -E 's#pcov.enabled=.+#pcov.enabled=\\\$${PCOV_ENABLED}#' /etc/php/*/mods-available/pcov.ini"
	$(DOCKER_EXEC_PHP_ROOT) bash -c '/etc/init.d/php*-fpm reload'
endif

ifeq (,$(call TEST_TARGET,"composer"))
## Execute composer command (support command syntax)
composer:
	$(DOCKER_EXEC_PHP) composer $(COMMAND_ARGS) $(args)
endif