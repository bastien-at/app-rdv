import os
import time
import pika
import redis
import json
import re
import configparser
import copy
from pymysqlreplication import BinLogStreamReader
from pymysqlreplication.row_event import (
    DeleteRowsEvent,
    UpdateRowsEvent,
    WriteRowsEvent,
)
from pymysqlreplication.event import (
    HeartbeatLogEvent,
)


# Get values of primary key columns from row
def _get_identifier(binlog_event, values):
    identifier = {}
    if not binlog_event.primary_key:
        keys = values.keys()
    elif isinstance(binlog_event.primary_key, str):
        keys = (binlog_event.primary_key,)
    else:
        keys = binlog_event.primary_key

    for colname in keys:
        identifier[colname] = str(values[colname])

    return identifier


def _get_all_data_as_string(obj):
    for i in obj:
        obj[i] = str(obj[i])

    return obj


def _init_channel():
    global amqp_connection, amqp_channel
    amqp_connection = pika.BlockingConnection(amqp_parameters)
    amqp_channel = amqp_connection.channel()
    amqp_channel.confirm_delivery()


def _add_config_about_value_to_publish(
    event_root_notifications, publish_to, data, when, full_data
):
    for key in data:
        # full_data as argument and this condition is an optim to not push too much messages on product_best_sku_update_batch
        # push is "long" and too much push create a latency
        # another way to do that, split watcher to 2 watchers, one on pdt, one on other tables
        if (key == "price" or key == "solde") and full_data["table"] == "product_details_trad" and (full_data["identifier"]["id_lang"] != "0" or full_data["identifier"]["id_site"] != "1"):
            continue

        if key in event_root_notifications:
            value = data[key]
            if "*" in event_root_notifications[key] and value != "None":
                _add_config_to_publish(
                    publish_to, event_root_notifications[key]["*"]["*"]
                )
            if when in event_root_notifications[key]:
                if value in event_root_notifications[key][when]:
                    _add_config_to_publish(
                        publish_to, event_root_notifications[key][when][value]
                    )
                elif "*" in event_root_notifications[key][when] and value != "None":
                    _add_config_to_publish(
                        publish_to, event_root_notifications[key][when]["*"]
                    )


def _add_config_to_publish(publish_to, notification_config):
    for queue in notification_config:
        publish_to[queue] = notification_config[queue]


def _add_identifier_header(conf, uid):
    identifier_header_key = (
        "X-Message-Stamp-Common\\Infrastructure\\Messenger\\Stamp\\IdentifierStamp"
    )

    if "headers" not in conf:
        conf["headers"] = {}

    conf["headers"][identifier_header_key] = json.dumps(
        [{"identifier": uid, "appName": "mysql-replication-watcher"}]
    )


def _publish_message(queue, conf, data_json, uid, retry=False):
    global amqp_connection, amqp_channel

    conf_local = copy.deepcopy(conf)
    _add_identifier_header(conf_local, uid)

    try:
        if "delay" in conf_local:
            _publish_delayed_message(queue, conf_local, data_json)
        else:
            _publish_direct_message(queue, conf_local, data_json)

    except pika.exceptions.StreamLostError as exception:
        if retry:
            raise exception
        print(
            '{"log_source": "mysql-replication-watcher", '
            '"type":"rabbit", "message": "recreate_connection"}'
        )
        _init_channel()
        _publish_message(queue, conf, data_json, uid, True)


def _publish_direct_message(queue, conf, data_json):
    amqp_channel.basic_publish(
        exchange=queue,
        routing_key="",
        body=data_json,
        properties=pika.BasicProperties(
            headers=conf["headers"], delivery_mode=amqp_delivery_mode
        ),
    )


def _publish_delayed_message(queue, conf, data_json):
    amqp_channel.queue_declare(queue=queue, durable=True, arguments=conf["args"])
    amqp_channel.queue_bind(exchange="delays", queue=queue, routing_key=queue)

    amqp_channel.basic_publish(
        exchange="delays",
        routing_key=queue,
        body=data_json,
        properties=pika.BasicProperties(
            headers=conf["headers"], delivery_mode=amqp_delivery_mode
        ),
        mandatory=True,
    )


# Sleep mode
if os.getenv("SLEEP_MODE"):
    time.sleep(2592000)
    exit(1)

# Read config
script_dir = os.path.dirname(os.path.abspath(__file__))
config = configparser.ConfigParser()
config.read(script_dir + "/config.ini.dist")
if os.getenv("PHYSICAL_ENV") and os.path.isfile(
    script_dir + "/config.physical." + os.getenv("PHYSICAL_ENV") + ".ini"
):
    config.read(script_dir + "/config.physical." + os.getenv("PHYSICAL_ENV") + ".ini")
if os.path.isfile(script_dir + "/config.ini"):
    config.read(script_dir + "/config.ini")
if os.getenv("CUSTOM_CONFIG"):
    config.read_string(os.getenv("CUSTOM_CONFIG"))

# Main
test_mode = bool(int(config["WATCHER"]["test_mode"]))

# Init AMQP connection
amqp_delivery_mode = int(
    config["WATCHER"]["amqp_delivery_mode"]
    if "amqp_delivery_mode" in config["WATCHER"]
    else pika.spec.PERSISTENT_DELIVERY_MODE
)
amqp_credentials = pika.PlainCredentials(
    config["AMQP"]["user"], config["AMQP"]["password"]
)
amqp_parameters = pika.ConnectionParameters(
    config["AMQP"]["host"],
    int(config["AMQP"]["port"]),
    config["AMQP"]["vhost"],
    amqp_credentials,
    heartbeat=10,
)
_init_channel()

# Init redis connection
redis_connection = redis.Redis(
    host=config["REDIS"]["host"],
    port=int(config["REDIS"]["port"]),
    decode_responses=True,
    db=config["REDIS"]["database"],
)
start_log_file = redis_connection.get("mysql_cdc_last_file")
start_log_pos = redis_connection.get("mysql_cdc_last_pos")
if start_log_pos:
    start_log_pos = int(start_log_pos)
print(
    '{"log_source": "mysql-replication-watcher", "type":"init", "start_log_pos":"'
    + str(start_log_pos)
    + '", "start_log_file":"'
    + str(start_log_file)
    + '"}'
)

# Build notifications rules
notifications = {}
for key in config["NOTIFICATIONS"]:
    queue, type, schema, table, column, when, value = key.split(".")

    # Config assertions
    if not type in ["insert", "delete", "update"]:
        raise AssertionError('TYPE should be "insert", "delete" or "update" on ' + key)
    if column == "*" and (when != "*" or value != "*"):
        raise AssertionError('WHEN and VALUE should be "*" if COLUMN is "*" on ' + key)
    if when == "*" and value != "*":
        raise AssertionError('VALUE should be "*" if WHEN is "*" on ' + key)
    if column != "*" and type != "update" and when != "data":
        raise AssertionError(
            'WHEN should be "data" if COLUMN is not "*" on an insert/delete on ' + key
        )
    if column != "*" and type == "update" and not when in ["*", "before", "after"]:
        raise AssertionError(
            'WHEN should be "*"/"before"/"after" if COLUMN is not "*" on an update on '
            + key
        )

    notifications.setdefault(type, {}).setdefault(schema, {}).setdefault(
        table, {}
    ).setdefault(column, {}).setdefault(when, {}).setdefault(
        value if value != "null" else "None", {}
    ).setdefault(queue, {})["headers"] = {"type": config["NOTIFICATIONS"][key]}
    if len(config["NOTIFICATIONS"][key].split(",")) > 1:
        del notifications[type][schema][table][column][when][value][queue]
        conf = dict(v.split(":") for v in config["NOTIFICATIONS"][key].split(","))
        if test_mode:
            conf["delay"] = "999999" + conf["delay"]
        conf["args"] = {
            "x-dead-letter-exchange": queue,
            "x-dead-letter-routing-key": "",
            "x-expires": int(conf["delay"]) + 10000,
            "x-message-ttl": int(conf["delay"]),
        }
        delayed_queue = "delay_{}__{}_delay".format(queue, conf["delay"])
        conf["headers"] = {
            "type": conf["class"],
            "X-Message-Stamp-Symfony\\Component\\Messenger\\Stamp\\DelayStamp": '[{"delay": '
            + conf["delay"]
            + "}]",
        }
        del conf["class"]
        notifications[type][schema][table][column][when][value][delayed_queue] = conf

amqp_channel.exchange_declare(exchange="delays", durable=True, exchange_type="direct")

# Ignored tables regex
ignored_tables_regex = False
if "ignored_tables_regex" in config["WATCHER"]:
    ignored_tables_regex = r"" + config["WATCHER"]["ignored_tables_regex"]

# Ignored tables env var
ignored_tables = (
    config["WATCHER"]["ignored_tables"].split(",")
    if config["WATCHER"]["ignored_tables"]
    else None
)
if os.getenv("ADD_IGNORED_TABLES"):
    if not ignored_tables:
        ignored_tables = []
    ignored_tables = ignored_tables + os.getenv("ADD_IGNORED_TABLES").split(",")

# Init mysql binlog connection
mysql_settings = {
    "host": config["MYSQL"]["host"],
    "port": int(config["MYSQL"]["port"]),
    "user": config["MYSQL"]["user"],
    "passwd": config["MYSQL"]["password"],
}
stream = BinLogStreamReader(
    connection_settings=mysql_settings,
    server_id=int(config["WATCHER"]["server_id"]),
    blocking=True,
    ignore_decode_errors=True,
    log_file=start_log_file,
    log_pos=start_log_pos,
    resume_stream=True,
    slave_heartbeat=int(config["WATCHER"]["heartbeat"]),
    only_events=[DeleteRowsEvent, WriteRowsEvent, UpdateRowsEvent, HeartbeatLogEvent],
    only_schemas=config["WATCHER"]["only_schemas"].split(",")
    if config["WATCHER"]["only_schemas"]
    else None,
    only_tables=config["WATCHER"]["only_tables"].split(",")
    if config["WATCHER"]["only_tables"]
    else None,
    ignored_schemas=config["WATCHER"]["ignored_schemas"].split(",")
    if config["WATCHER"]["ignored_schemas"]
    else None,
    ignored_tables=ignored_tables,
)

last_timestamp = 0
for binlog_event in stream:
    if isinstance(binlog_event, HeartbeatLogEvent):
        data = dict(
            log_source="mysql-replication-watcher",
            timestamp=binlog_event.timestamp * 1000,
            type="heartbeat",
            log_file=stream.log_file,
            log_pos=stream.log_pos,
        )
        data_json = json.dumps(data)
        print(data_json)
        continue

    for row in binlog_event.rows:
        if ignored_tables_regex and re.match(
            ignored_tables_regex, binlog_event.schema + "." + binlog_event.table
        ):
            continue

        data = dict(
            log_source="mysql-replication-watcher",
            timestamp=binlog_event.timestamp * 1000,
            schema=binlog_event.schema,
            table=binlog_event.table,
            identifier={},
            before={},
            after={},
            data={},
            log_file=stream.log_file,
            log_pos=stream.log_pos,
        )
        if isinstance(binlog_event, DeleteRowsEvent):
            data["type"] = "delete"
            data["identifier"] = _get_identifier(binlog_event, row["values"])
            data["data"] = _get_all_data_as_string(row["values"])
        elif isinstance(binlog_event, UpdateRowsEvent):
            data["type"] = "update"
            data["identifier"] = _get_identifier(binlog_event, row["before_values"])
            for colname in row["after_values"]:
                if row["after_values"][colname] != row["before_values"][colname]:
                    data["before"][colname] = str(row["before_values"][colname])
                    data["after"][colname] = str(row["after_values"][colname])
        elif isinstance(binlog_event, WriteRowsEvent):
            data["type"] = "insert"
            data["identifier"] = _get_identifier(binlog_event, row["values"])
            data["data"] = _get_all_data_as_string(row["values"])

        if (
            data["type"] in notifications
            and data["schema"] in notifications[data["type"]]
            and data["table"] in notifications[data["type"]][data["schema"]]
        ):
            publish_to = {}
            event_root_notifications = notifications[data["type"]][data["schema"]][
                data["table"]
            ]

            if "*" in event_root_notifications:
                _add_config_to_publish(
                    publish_to, event_root_notifications["*"]["*"]["*"]
                )
            if data["type"] != "update":
                _add_config_about_value_to_publish(
                    event_root_notifications, publish_to, data["data"], "data", data
                )
            else:
                _add_config_about_value_to_publish(
                    event_root_notifications, publish_to, data["before"], "before", data
                )
                _add_config_about_value_to_publish(
                    event_root_notifications, publish_to, data["after"], "after", data
                )

            if publish_to:
                data["publish_to"] = ", ".join(publish_to.keys())
                data["uid"] = os.urandom(5).hex()

        data_json = json.dumps(data)

        if data.get("publish_to"):
            for queue in publish_to:
                _publish_message(queue, publish_to[queue], data_json, data["uid"])

        print(data_json)

        if (binlog_event.timestamp - last_timestamp) > 1:
            last_timestamp = binlog_event.timestamp
            redis_connection.set("mysql_cdc_last_file", stream.log_file)
            redis_connection.set("mysql_cdc_last_pos", stream.log_pos)
            print('{"log_source": "mysql-replication-watcher", "type":"marker"}')

stream.close()
