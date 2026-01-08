#!/bin/bash

set -ex

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

if [ "" = "$TABLE" ] && [ "" = "$TABLE_OLD" ]; then
  echo "Table is missing !"
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

if [ "" = "$DELETE_CHUNK_SIZE" ]; then
  echo "Delete chunk size is missing !"
  exit 8
fi

TABLE_OLD="${TABLE_OLD:-_${TABLE}_old}"

echo "=== Delete indexes from old table ==="
echo "
SELECT
    CONCAT(
        'ALTER TABLE ',
        TABLE_SCHEMA,'.',TABLE_NAME,' ',
        'DROP INDEX ',
        INDEX_NAME, ', ALGORITHM=INPLACE, LOCK=none;'
    )  AS 'query'
FROM
    information_schema.STATISTICS
WHERE
    TABLE_SCHEMA='$DATABASE' AND TABLE_NAME='$TABLE_OLD' AND INDEX_NAME!='PRIMARY'
GROUP BY
    TABLE_SCHEMA,
    TABLE_NAME,
    INDEX_NAME
ORDER BY
    TABLE_SCHEMA ASC,
    TABLE_NAME ASC,
    INDEX_NAME ASC;
" | mysql --column-names=FALSE -h $MASTER_HOST -u $USER -p$PASSWORD > /tmp/drop_indexes.sql
mysql -h $MASTER_HOST -u $USER -p$PASSWORD < /tmp/drop_indexes.sql
echo "Done, wait 60s.."
sleep 60

echo "=== Delete data from old table ==="
NB=1
LOOP=0
while [[ "$NB" != "0" ]]; do
  echo "Delete batch... ($LOOP)"
  NB=$(echo "DELETE FROM $DATABASE.$TABLE_OLD LIMIT $DELETE_CHUNK_SIZE; SELECT ROW_COUNT() as DelRowCount;" | mysql -h $MASTER_HOST -u $USER -p$PASSWORD --column-names=FALSE 2>/dev/null )
  sleep 1
  LOOP=$(( LOOP+1 ))
done
echo "Done, wait 60s.."
sleep 60

echo "=== Wait table is really empty everywhere ==="
for SLAVE_HOST in $SLAVES_HOSTS; do
  NB=1
  LOOP=0
  while [[ "$NB" != "0" ]]; do
    echo "Check slave ${SLAVE_HOST}... ($LOOP)"
    NB=$(echo "SELECT count(*) FROM $DATABASE.$TABLE_OLD LIMIT 1;" | mysql -h $SLAVE_HOST -u $USER -p$PASSWORD --column-names=FALSE 2>/dev/null )
    if [[ "$NB" = "0" ]]; then
      break
    fi
    sleep 5
    LOOP=$(( LOOP+1 ))
  done
  echo "Slave ${SLAVE_HOST} is OK"
done

echo "=== Optimize old table ==="
echo "OPTIMIZE TABLE $DATABASE.$TABLE_OLD" | mysql -h $MASTER_HOST -u $USER -p$PASSWORD --init-command="SET sql_log_bin=OFF;"
for SLAVE_HOST in $SLAVES_HOSTS; do
  echo "OPTIMIZE TABLE $DATABASE.$TABLE_OLD" | mysql -h $SLAVE_HOST -u $USER -p$PASSWORD
done
echo "Done, wait 60s.."
sleep 60

echo "=== Drop old table (master without replication, slaves, master with replication to replicate on delayed slaves) ==="
echo "DROP TABLE IF EXISTS $DATABASE.$TABLE_OLD" | mysql -h $MASTER_HOST -u $USER -p$PASSWORD --init-command="SET sql_log_bin=OFF;"
for SLAVE_HOST in $SLAVES_HOSTS; do
  echo "DROP TABLE IF EXISTS $DATABASE.$TABLE_OLD" | mysql -h $SLAVE_HOST -u $USER -p$PASSWORD
done
echo "DROP TABLE IF EXISTS $DATABASE.$TABLE_OLD" | mysql -h $MASTER_HOST -u $USER -p$PASSWORD
