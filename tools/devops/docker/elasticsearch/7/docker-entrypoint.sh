#!/bin/bash
set -e

KEYS_DIR="/etc/elasticsearch/gcs-keys"
#KEYS_DIR="/tmp/gcs-keys"

env | grep -Po 'GCS_CLIENT_KEY_[A-Z0-9_-]+' | while read -r var; do
  clientname=$(echo $var | grep -Po 'GCS_CLIENT_KEY_(\K[A-Z0-9_-]+)')
  clientname=$(echo "${clientname,,}")
  echo ${!var} > ${KEYS_DIR}/${clientname}.json

  echo "GCS key added from env var $var in ${KEYS_DIR}/${clientname}.json"
done

for f in ${KEYS_DIR}/*.json; do
  [ -e "$f" ] || continue
  clientname=$(basename -s .json $f)
  clientname=$(echo "${clientname,,}")
  echo "Add GCS key ${KEYS_DIR}/${clientname}.json to key keystore ${clientname}..."
  echo elasticsearch-keystore add-file -f gcs.client.${clientname}.credentials_file ${f} | tee
done

exec /usr/local/bin/docker-entrypoint.sh "$@"