#!/usr/bin/env bash

set -ea
source .env

curl -s -u "elastic:$ELASTIC_PASSWORD" https://logs.alltricks.sexy:9200/_cat/shards | \
	grep -P ".ds-.*-(at|tv)_" | \
	grep -o -P "(logs|metrics-apm.app.apm_server|traces-apm)-(at|tv)_[a-z_-]+" | \
	sort -u | \
	rev |  \
	cut -c 2- |  \
	rev \
	xargs -I '{}' curl -s -u "elastic:$$ELASTIC_PASSWORD" https://logs.alltricks.sexy:9200/{}/_rollover -X POST
