#!/bin/bash

set -ex

source ptkill-util.sh

if [ "" = "$USER" ]; then
  echo "User is missing !"
  exit 8
fi

if [ "" = "$PASSWORD" ]; then
  echo "Password is missing !"
  exit 8
fi

if [ "" = "$MASTER_HOST" ]; then
  echo "Master is missing !"
  exit 8
fi

if [ "" = "$SLAVES_HOSTS" ]; then
  echo "Slaves hosts is missing !"
  exit 8
fi

ALL_HOSTS="$MASTER_HOST $SLAVES_HOSTS"
for HOST in $ALL_HOSTS; do
  ptkill_dry_run "${HOST}" "${USER}" "${PASSWORD/,/\\,}"
done
