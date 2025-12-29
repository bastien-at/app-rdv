from jinja2 import Environment, FileSystemLoader, select_autoescape
import sqlite3
import json
import requests
import time
from filters import *

discord_urls = {
    #'default': 'https://discord.com/api/webhooks/1122892746605215796/FokBsEBXZP2zHZ9t2ZRqPhyzRIF1FV48omB6mri02DITEwwuHbmyk5sd5iwkqs4YB1__'
    'default': 'https://discord.com/api/webhooks/1118896108865867786/8yKrIIxNkuBVRhS-w3bKTSqFi1gtamH0RR-HSbN5wZ4mol9j3KMYAH1ftoJKrkuwmqx8',
    'AT Back - Alerte classique': 'https://discord.com/api/webhooks/1118896108865867786/8yKrIIxNkuBVRhS-w3bKTSqFi1gtamH0RR-HSbN5wZ4mol9j3KMYAH1ftoJKrkuwmqx8',
    'AT Back - Alerte Jenkins': 'https://discord.com/api/webhooks/1118905738266431563/yjK5FTW5ypTCR0GNyxrGErVRhKY1h4-y9gEXNlO180iCg8EHnaiy7rAUvqARAsoQBAIM',
    'AT Front - Alerte classique': 'https://discord.com/api/webhooks/1426129804599754793/dqB0OQzu5zgpjlswoHAw0V4-sIO7C76y9SL1pAztZzOQyVkmJa62Yadal7Yju6zmKihB',
    'TV - Alerte classique': 'https://discord.com/api/webhooks/1124335099710820362/XFRMKPyH6KWXgxyGQFMejT-aWguMg7Wq8PjpK2S4G6XPj0RvtC5Vk65HbVLR-YOHD4mc',
    'TV - Alerte Jenkins': 'https://discord.com/api/webhooks/1124335389256200352/KNHzfX8E2G8vzYO6mRbT7YmdLTJgnS8auQEl30ylsN6zlGjFf09ZOeEY6GtpfdGM5BM9',
    'DEVOPS - Alerte classique': 'https://discord.com/api/webhooks/1130411039599640668/MKZ3hMgTakPVjubk6T2eFrvu6y3TAVAEWhq5v3R__c96Y2XRT7c9sObRnEs-JCOGuqu2',
    'DEVOPS - Alerte critique': 'https://discord.com/api/webhooks/1130411039599640668/MKZ3hMgTakPVjubk6T2eFrvu6y3TAVAEWhq5v3R__c96Y2XRT7c9sObRnEs-JCOGuqu2',
    'DEVOPS - No data ou erreur': 'https://discord.com/api/webhooks/1130411039599640668/MKZ3hMgTakPVjubk6T2eFrvu6y3TAVAEWhq5v3R__c96Y2XRT7c9sObRnEs-JCOGuqu2',
    'AT Back - Alerte critique': 'https://discord.com/api/webhooks/1347189124939120640/hFRg9vJwkuLt7jW-BdmoaTD5HdXGuD5_FjcfSR9RinDf8De08Jg8Ci3nQvbl8SUb6Fe0?thread_id=1347509196685443082',
    'AT Front - Alerte critique': 'https://discord.com/api/webhooks/1347189124939120640/hFRg9vJwkuLt7jW-BdmoaTD5HdXGuD5_FjcfSR9RinDf8De08Jg8Ci3nQvbl8SUb6Fe0?thread_id=1347509196685443082',
    'TV - Alerte critique': 'https://discord.com/api/webhooks/1354105381093117993/1aeZROpNlZz3l2SOhcE_hkKWTYBWOoNVcXDGqwA2K6OV51AzTM7AqQ6CIHV7K4aaosz9?thread_id=1354105024065568939'
}
discord_roles = {
    'default': '773827716260560916',
    'TV - Alerte critique': '1027513914759585792',
    'DEVOPS - Alerte critique': '1344681128669478952',
    'DEVOPS - No data ou erreur': False
}

loop = 0
jinja_env = Environment(loader=FileSystemLoader('/usr/local/bin/log/scripts/notifier'))
jinja_env.filters["tojson_pretty"] = to_pretty_json
jinja_template = jinja_env.get_template('discord.template.j2')

print("Init notifier db if needed")

con_notifier = sqlite3.connect("/usr/local/bin/log/scripts/notifier/notifier.db")
cur_notifier = con_notifier.cursor()
cur_notifier.execute("CREATE TABLE IF NOT EXISTS last_execution (date_time text)")
execution_dates = cur_notifier.execute("select date_time, datetime('now', '-10 second') from last_execution limit 1").fetchone()
if not execution_dates:
    print("Init last_execution table")
    cur_notifier.execute("insert into last_execution values(datetime('now', '-1 hour'))")
    cur_notifier.execute('commit')

con = sqlite3.connect("/data/oncall/oncall.db")
cur = con.cursor()

while True:
    pings_in_loop = {}
    execution_dates = cur_notifier.execute("select date_time, datetime('now', '-10 second') from last_execution limit 1").fetchone()
    cur_notifier.execute("update last_execution set date_time='{}'".format(execution_dates[1]))
    cur_notifier.execute('commit')
    print("Execution times", execution_dates)

    con = sqlite3.connect("/data/oncall/oncall.db")
    cur = con.cursor()
    rows = cur.execute("""
        select id, resolved, acknowledged, public_primary_key, json_extract(raw_escalation_snapshot, '$.escalation_chain_snapshot.name')
        from alerts_alertgroup
        where
            (resolved=false and acknowledged=false and started_at>="{}" and started_at<"{}")
            OR
            (resolved=false and acknowledged=true and acknowledged_at>="{}" and acknowledged_at<"{}")
            OR
            (resolved=true and resolved_at>="{}" and resolved_at<"{}")
        order by id asc
    """.format(execution_dates[0], execution_dates[1], execution_dates[0], execution_dates[1], execution_dates[0], execution_dates[1]))

    cur2 = con.cursor()
    for row in  rows:
        alert = cur2.execute(
            """
                select raw_request_data
                from alerts_alert where group_id={}
                order by created_at {} limit 1
            """.format(row[0], "asc" if not row[1] else "desc")
        ).fetchone()

        print("Alert payload", alert)

        payload=json.loads(alert[0])

        # Detect if payload come from legacy integration or not
        if ('receiver' in payload):
            payload = payload['alerts'][0]

        if ('warning' in payload['labels'] and payload['labels']['warning']):
            print("Ignored")
            continue

        # Get ping (ping only once by loop)
        ping = discord_roles.get(row[4], discord_roles["default"])
        try:
            critical = payload['labels']['critical']
        except:
            critical = False
        if not (critical and not row[1] and not row[2] and not ping in pings_in_loop):
            ping = None
        else:
            pings_in_loop[ping] = True

        render = jinja_template.render(
            payload=payload,
            alert_group_id=row[3],
            alert_group_resolved=row[1],
            alert_group_acknowledged=row[2],
            ping=ping
        )
        print("Template result", render)
        data = json.loads(render)

        if 'Discord' in payload['annotations']:
            url=payload['annotations']['Discord']
        else:
            url=discord_urls.get(row[4], discord_urls["default"])

        requests.post(url, json = data)

    loop += 1
    if loop == (3600/10):
        print("Quit to avoid memory leak...")
        quit()
    print('Wait 10s... ({})'.format(loop))
    time.sleep(10)
