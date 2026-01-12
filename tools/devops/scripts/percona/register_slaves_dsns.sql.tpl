CREATE TABLE IF NOT EXISTS avanis.slave_dsn (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `parent_id` int(11) DEFAULT NULL,
    `dsn` varchar(255) NOT NULL,
    PRIMARY KEY (`id`)
);

TRUNCATE avanis.slave_dsn;

insert into avanis.slave_dsn values __DATA__;