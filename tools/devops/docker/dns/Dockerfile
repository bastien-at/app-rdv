FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/Paris

RUN set -x
RUN apt-get update -yqq && apt-get install -yqq --no-install-recommends apt-transport-https ca-certificates curl procps psmisc
RUN curl -fsSLO https://download.docker.com/linux/static/stable/x86_64/docker-20.10.3.tgz && \
    tar zxvf docker-20.10.3.tgz --strip 1 -C /usr/local/bin docker/docker && \
    rm docker-20.10.3.tgz

COPY docker-entrypoint /usr/local/bin/docker-entrypoint
COPY docker-auto-update-hosts /usr/local/bin/docker-auto-update-hosts
COPY docker-auto-update-hosts.sysvinit /etc/init.d/docker-auto-update-hosts
COPY predefined_hosts /etc/predefined_hosts

ENTRYPOINT ["docker-entrypoint"]