FROM python:3.12.4-alpine3.20

WORKDIR /app

RUN pip install redis pika mysql-replication==0.45.1

COPY ./mysql-replication-watcher.py /app/mysql-replication-watcher.py
COPY ./config.ini.dist /app/config.ini.dist

CMD [ "python", "-u", "/app/mysql-replication-watcher.py" ]
