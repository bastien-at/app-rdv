#!/bin/bash
ROOT_DIR="$(dirname -- "$0")/.."

source "$ROOT_DIR/.env.dist" && source "$ROOT_DIR/.env"

policy_details=$(curl -s -u "superuser:$ELASTIC_PASSWORD_SUPERUSER" https://logs.alltricks.sexy:9200/_ilm/policy/avanis-index-lifecycle-policy)
indices=$(curl -s -u "superuser:$ELASTIC_PASSWORD_SUPERUSER" 'https://logs.alltricks.sexy:9200/_cat/indices?h=index&v=false&expand_wildcards=all&s=index')

for indice in $indices; do
  if ! echo "$policy_details" | grep "\"$indice\"" > /dev/null; then
    echo $indice
    curl -s -u "superuser:$ELASTIC_PASSWORD_SUPERUSER" -X POST "https://logs.alltricks.sexy:9200/$indice/_ilm/remove" -H 'Content-Type: application/json' > /dev/null
    curl -s -u "superuser:$ELASTIC_PASSWORD_SUPERUSER" -X PUT "https://logs.alltricks.sexy:9200/$indice/_settings" -H 'Content-Type: application/json' -d '{"index":{"lifecycle":{"name":"avanis-index-lifecycle-policy"},"number_of_replicas":"0","mapping": {"total_fields":{"limit":"10000"}}}}' > /dev/null
  fi
done;
