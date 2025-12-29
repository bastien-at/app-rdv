FROM ubuntu:22.04

ENV ACCEPT_EULA=Y
ENV DEBIAN_FRONTEND=noninteractive
ENV VARNISH_PORT=80
ENV VARNISH_MEMORY=100m
ENV VARNISH_PIPE_TIMEOUT=60

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        curl \
        gettext-base \
        nano \
    	varnish \
    ; \
    rm -rf /var/lib/apt/lists/*

EXPOSE 80/tcp

CMD envsubst < /etc/varnish/default.vcl.tpl > /etc/varnish/default.vcl && \
    exec varnishd -j unix -F -f /etc/varnish/default.vcl -s malloc,${VARNISH_MEMORY} -a 0.0.0.0:${VARNISH_PORT} -p pipe_timeout=${VARNISH_PIPE_TIMEOUT}
