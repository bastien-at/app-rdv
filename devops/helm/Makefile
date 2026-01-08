.SILENT:
.ONESHELL:
SHELL := /bin/bash

MAKE := $(MAKE) -s --no-print-directory
NDEF ?= $(if $(value $(1)),,$(error $(1) not set))
GET_CHART_VERSION ?= $$(cat $(1) | grep -oP '^version: "?\K([^"]+)')
GS_BUCKET_NAME = helm-charts-avanis-prod

# Rainbow printers
RED ?= /bin/echo -e "\x1b[31m$1\x1b[0m"
GREEN ?= /bin/echo -e "\x1b[32m$1\x1b[0m"
YELLOW ?= /bin/echo -e "\x1b[33m$1\x1b[0m"
BLUE ?= /bin/echo -e "\x1b[34m$1\x1b[0m"
PURPLE ?= /bin/echo -e "\x1b[35m$1\x1b[0m"
CYAN ?= /bin/echo -e "\x1b[36m$1\x1b[0m"

upload:
	$(call GREEN,Uploading booking...)
	rm -rf /tmp/booking /tmp/booking.tgz
	cp -Lr . /tmp/booking
	cd /tmp/booking
	tar czvfh /tmp/booking.tgz . > /dev/null
	gsutil cp /tmp/booking.tgz gs://$(GS_BUCKET_NAME)/booking/$(call GET_CHART_VERSION,"Chart.yaml")/chart.tgz
	gsutil cp values.prod.yaml gs://$(GS_BUCKET_NAME)/booking/$(call GET_CHART_VERSION,"Chart.yaml")/values.prod.yaml