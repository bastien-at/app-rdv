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

if [ "" = "$DATABASE" ]; then
  echo "Database is missing !"
  exit 8
fi

if [ "" = "$TABLE" ]; then
  echo "Table is missing !"
  exit 8
fi

if [ "" = "$ALTER" ]; then
  echo "Alter is missing !"
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

if [ "" = "$CHUNK_SIZE" ]; then
  echo "Chunk size is missing !"
  exit 8
fi

TABLE_OLD="_${TABLE}_old"

PERCONA_ARGS=""
if [[ "$IGNORE_ALTER_CHECK" == "true" ]]; then
  PERCONA_ARGS="$PERCONA_ARGS --no-check-alter"
fi

ALL_HOSTS="$MASTER_HOST $SLAVES_HOSTS"
for HOST in $ALL_HOSTS; do
  ptkill_run "$HOST" "${USER}" "${PASSWORD/,/\\,}"
done

echo "=== Save FK names to remove from old table ==="
echo "
SELECT
    CONCAT('ALTER TABLE $DATABASE.$TABLE_OLD DROP FOREIGN KEY ', CONSTRAINT_NAME, ';') AS drop_statement
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE CONSTRAINT_SCHEMA = '$DATABASE'
    AND TABLE_NAME='$TABLE'
    AND REFERENCED_TABLE_NAME IS NOT NULL
" | mysql --column-names=FALSE -h $MASTER_HOST -u $USER -p$PASSWORD > /tmp/drop_source_fk.sql

echo "=== Register slaves in slave_dsn table ==="
cat /app/register_slaves_dsns.sql.tpl | sed "s#__DATA__#$(echo $SLAVES_HOSTS | sed -E "s#([^ ]+)#(NULL,NULL,'\\1'),#g" | sed 's/.\{1\}$//')#" | \
  mysql -h $MASTER_HOST -u $USER -p$PASSWORD --init-command="SET sql_log_bin=OFF;"

echo "=== Execute optimize ==="
pt-online-schema-change -h $MASTER_HOST --user $USER --password "${PASSWORD/,/\\,}" \
  --alter-foreign-keys-method="rebuild_constraints" --print --no-drop-old-table \
  --alter "$ALTER" D=$DATABASE,t=$TABLE --chunk-size=$CHUNK_SIZE --pause-file /app/alter.sleep \
  `# --recursion-method=none` \
  --recursion-method dsn=D=avanis,t=slave_dsn --max-lag 1s --check-interval 1 \
  --execute $PERCONA_ARGS

echo "=== Remove slave_dsn table ==="
echo "DROP TABLE IF EXISTS avanis.slave_dsn" | mysql -h $MASTER_HOST -u $USER -p$PASSWORD --init-command="SET sql_log_bin=OFF;"

echo "=== Remove FK from old table ==="
mysql -h $MASTER_HOST -u $USER -p$PASSWORD --init-command="SET FOREIGN_KEY_CHECKS=0;" < /tmp/drop_source_fk.sql

echo "=== Rename FKs ==="
# Query here is "same" as query in cleaner
echo "
SELECT CONCAT('ALTER TABLE ', fks2.quotedSourceTableName, ' ', GROUP_CONCAT(fks2.query), ', ', GROUP_CONCAT(fks2.drop), ';') AS alter_statement_for_new_name_combined
FROM (
    SELECT fks.quotedSourceTableName, CONCAT(
                   'ADD CONSTRAINT ', fks.quotedNewConstraintName, ' ',
                   'FOREIGN KEY (', GROUP_CONCAT(fks.quotedSourceColumnName), ') ',
                   'REFERENCES ', fks.quotedTargetTableName, ' (',
                   GROUP_CONCAT(fks.quotedTargetColumnName),
                   ') ',
                   'ON DELETE ', fks.deleteRule, ' ',
                   'ON UPDATE ', fks.updateRule
               )  AS 'query',
               CONCAT('DROP FOREIGN KEY ', fks.quotedConstraintName) as 'drop'
    FROM (
             SELECT
                 CONCAT('\`', kcu.CONSTRAINT_NAME, '\`') AS quotedConstraintName,
                 CONCAT('\`',
                     CASE
                         WHEN kcu.CONSTRAINT_NAME REGEXP '^\_{1}[A-Za-z0-9]{2}.*$'
                             THEN SUBSTR(kcu.CONSTRAINT_NAME, 2, LENGTH(kcu.CONSTRAINT_NAME))
                         WHEN kcu.CONSTRAINT_NAME REGEXP '^\_{2}[A-Za-z0-9]{2}.*$'
                             THEN SUBSTR(kcu.CONSTRAINT_NAME, 3, LENGTH(kcu.CONSTRAINT_NAME))
                     END
                     , '\`') AS quotedNewConstraintName,
                 CONCAT(kcu.TABLE_SCHEMA, '.', kcu.TABLE_NAME) AS quotedSourceTableName,
                 CONCAT('\`', kcu.COLUMN_NAME, '\`') AS quotedSourceColumnName,
                 CONCAT('\`', kcu.REFERENCED_TABLE_SCHEMA, '\`.\`', kcu.REFERENCED_TABLE_NAME, '\`') AS quotedTargetTableName,
                 CONCAT('\`', kcu.REFERENCED_COLUMN_NAME, '\`') AS quotedTargetColumnName,
                 rc.DELETE_RULE AS deleteRule,
                 rc.UPDATE_RULE AS updateRule
             FROM information_schema.KEY_COLUMN_USAGE AS kcu
                 INNER JOIN information_schema.REFERENTIAL_CONSTRAINTS AS rc ON
                     kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME AND
                     kcu.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
             WHERE
                 kcu.CONSTRAINT_SCHEMA = '$DATABASE'
                     AND ASCII( kcu.CONSTRAINT_NAME) LIKE ASCII('_%')
                     AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
             ORDER BY
                 kcu.ORDINAL_POSITION DESC
         ) AS fks
    GROUP BY
        fks.quotedConstraintName,
        fks.quotedSourceTableName,
        fks.quotedTargetTableName,
        fks.deleteRule,
        fks.updateRule
    ORDER BY
        fks.quotedSourceTableName,
        fks.quotedConstraintName) as fks2
GROUP BY fks2.quotedSourceTableName
" | mysql --column-names=FALSE -h $MASTER_HOST -u $USER -p$PASSWORD > /tmp/rename_fk.sql
mysql -h $MASTER_HOST -u $USER -p$PASSWORD --init-command="SET FOREIGN_KEY_CHECKS=0;" < /tmp/rename_fk.sql
