#!/bin/bash

set -eux

bucket="$1"

mkdir -p /usr/share/downloader/data/"$bucket"
cd /usr/share/downloader/data/"$bucket"

gcloud auth activate-service-account --key-file=/home/docker/avanis-infra-gke-dev.json
url=$(gcloud storage ls --format=gsutil gs://"$bucket" | sort | tail -n 1)
if [ -f "last/version_url.txt" ] && [ "$url" = "$(cat last/version_url.txt)" ]; then
  echo "Last local version is same as last distant version, do nothing..."
  exit 0
fi

rm -rf previous
mkdir -p pending last

sudo wondershaper eth0 102400 102400
gcloud storage rsync --delete-unmatched-destination-objects --recursive --exclude="\.gitkeep" $url pending/
echo "$url" > pending/version_url.txt
sudo wondershaper clear eth0

rm -rf last
mv pending last
