FROM debian:bookworm-slim

ENV FTP_SSL="0"
ENV FTP_USERS_COMMON_GROUP_ID=""

RUN apt-get update -yqq && apt-get install -yqq --no-install-recommends vsftpd

COPY vsftpd /etc/vsftpd/
COPY docker-entrypoint /usr/local/bin/docker-entrypoint
RUN mkdir -p /var/run/vsftpd/empty

EXPOSE 21

ENTRYPOINT ["docker-entrypoint"]