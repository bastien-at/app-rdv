#!/bin/bash
ROOT_DIR="$(dirname -- "$0")/.."

source "$ROOT_DIR/.env.dist" && source "$ROOT_DIR/.env"

# Backup
BACKUP_DIR="/data/backup"
BACKUP_DAILY_DIR="$BACKUP_DIR/$(date '+%Y-%m-%d')"

# Create backup folders
mkdir -p \
  "$BACKUP_DIR/elasticsearch/snapshots" \
  "$BACKUP_DAILY_DIR/cron" \
  "$BACKUP_DAILY_DIR/grafana" \
  "$BACKUP_DAILY_DIR/oncall"

## Local backup
# Clean old backups
find /data/backup/* -maxdepth 1 -type d -ctime +30 -exec rm -rf {} \;

# .env
cp "$ROOT_DIR/.env" $BACKUP_DAILY_DIR

# Cron
crontab -l > "$BACKUP_DAILY_DIR/cron/cron"

# Grafana
cp "$ROOT_DIR/grafana/.env" "$BACKUP_DAILY_DIR/grafana"
cp -r /data/grafana/ "$BACKUP_DAILY_DIR/grafana/data"
sqlite3 "$BACKUP_DAILY_DIR/grafana/data/grafana.db" 'PRAGMA wal_checkpoint(TRUNCATE);'
sqlite3 "$BACKUP_DAILY_DIR/grafana/data/grafana.db" 'VACUUM;'
# // After restore data if grafana says : "Error: ✗ unable to open database file: permission denied", execute `chmod -R a+w /data/grafana`.

# Oncall
cp -r /data/oncall/ "$BACKUP_DAILY_DIR/oncall/data"
sqlite3 "$BACKUP_DAILY_DIR/oncall/data/oncall.db" 'PRAGMA wal_checkpoint(TRUNCATE);'
sqlite3 "$BACKUP_DAILY_DIR/oncall/data/oncall.db" 'VACUUM;'

# Elasticsearch snapshots (include 30 days of snapshots)
rm -rf "$BACKUP_DIR/elasticsearch/snapshots"
cp -r /data/elasticsearch/snapshots/ "$BACKUP_DIR/elasticsearch/snapshots"

## Remote backup
gcloud auth activate-service-account --key-file=/root/avanis-infra-gke-dev.json
gcloud storage rsync --delete-unmatched-destination-objects --recursive $BACKUP_DIR gs://avanis-logs-stack-backup/
