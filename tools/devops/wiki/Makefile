.PHONY: $(shell grep -hoP "^[a-zA-Z0-9_-][^\. ]+(?=:[^=]*$$)" $(MAKEFILE_LIST))
.SILENT:
.DEFAULT_GOAL := help

SHELL := /bin/bash
HELM ?= helm
HELM_RELEASE_NAME = wiki
K8S_NAMESPACE = wiki
CURRENT_CLUSTER ?= $(shell kubectl config current-context)
VALUES_FILE ?= $(shell [[ "${CURRENT_CLUSTER}" = "gke_avanis-infra-gke_europe-west1-b_avanis-prod-5bfed527" ]] && echo "values-prod.yaml" || echo "values-staging.yaml")

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



## Add WikiJS repository
add-repos:
	$(HELM) repo add requarks https://charts.js.wiki/
	$(HELM) repo add cowboysysop https://cowboysysop.github.io/charts/

## Update dependencies
update-dependency: add-repos
	$(HELM) dependency update . -n $(K8S_NAMESPACE)

## Build dependencies
build-dependency: add-repos
	$(HELM) dependency build . -n $(K8S_NAMESPACE)

## Dry run - Install project to the Kubernetes cluster
install-dry-run: _confirm-cluster update-dependency
	$(HELM) install $(HELM_RELEASE_NAME) . -n $(K8S_NAMESPACE) --dry-run --debug -f ${VALUES_FILE}

## Install project to the Kubernetes cluster
install: _confirm-cluster update-dependency _create-namespace
	$(HELM) install $(HELM_RELEASE_NAME) . -n $(K8S_NAMESPACE) -f ${VALUES_FILE}

## Dry run - Upgrade projet to the Kubernetes cluster
upgrade-dry-run: _confirm-cluster build-dependency
	$(HELM) upgrade $(HELM_RELEASE_NAME) . -n $(K8S_NAMESPACE) --dry-run -f ${VALUES_FILE} --debug

## Upgrade project to the Kubernetes cluster
upgrade: _confirm-cluster build-dependency
	$(HELM) upgrade $(HELM_RELEASE_NAME) . -n $(K8S_NAMESPACE) -f ${VALUES_FILE}

## Remove project from cluster
uninstall: _confirm-cluster
	$(HELM) uninstall $(HELM_RELEASE_NAME) -n $(K8S_NAMESPACE)
	kubectl delete namespace $(K8S_NAMESPACE)

_create-namespace:
	kubectl create namespace $(K8S_NAMESPACE) || true

_confirm-cluster:
	@printf "You are authenticate on cluster ${YELLOW_CODE}${CURRENT_CLUSTER} (${VALUES_FILE} will be used)${NOCOLOR_CODE}.\n"
	(echo -n 'Are you sure you want to continue (y/[n]) ? ' && read confirm && [[ "$${confirm,,}" = "y" ]])

## Help
ifeq (,$(call TEST_TARGET,"help"))
COLOR_RESET   = \033[0m
COLOR_INFO    = \033[32m
COLOR_COMMENT = \033[33m
help:
	@printf "${COLOR_COMMENT}Usage:${COLOR_RESET}\n"
	@printf " make [target]\n\n"
	@printf "${COLOR_COMMENT}Available targets:${COLOR_RESET}\n"
	@awk '/^[a-zA-Z\-_0-9\.@]+:([a-zA-Z\-_0-9\.@ ]+)?$$/ { \
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
