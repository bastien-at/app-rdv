SELECT UNIX_TIMESTAMP(timestamp) as last_sync FROM mysql_master_slave_checker, (select sleep(5)) as sleep;
