# This helper file must be included on each main makefile
# Shell to use
SHELL := /bin/bash

# Helpers
NDEF ?= $(if $(value $(1)),,$(error $(1) not set))
TEST_TARGET ?= $(shell echo $$(grep "^$(1):" $(MAKEFILE_LIST) | wc -l | sed -E 's~^1$$~~'))
MAKE := $(MAKE) -s --no-print-directory

# Rainbow printers
RED ?= /bin/echo -e "\x1b[31m$1\x1b[0m"
GREEN ?= /bin/echo -e "\x1b[32m$1\x1b[0m"
YELLOW ?= /bin/echo -e "\x1b[33m$1\x1b[0m"
BLUE ?= /bin/echo -e "\x1b[34m$1\x1b[0m"
PURPLE ?= /bin/echo -e "\x1b[35m$1\x1b[0m"
CYAN ?= /bin/echo -e "\x1b[36m$1\x1b[0m"
COMMA ?= ,
