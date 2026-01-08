FROM node:22-bookworm-slim AS dev

ENV ACCEPT_EULA=Y
ENV DEBIAN_FRONTEND=noninteractive
ENV DOCKER_HOME='/home/docker'
ENV GIT_BRANCH=unassigned
ENV GIT_PR_NAMESPACE=unassigned
ENV GIT_PR_NUM=unassigned
ENV PHYSICAL_ENV=unassigned
ENV TZ=Europe/Paris
ENV NODE_PATH="/usr/local/lib/node_modules"

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        curl \
        git \
        locales \
        nano \
        nginx \
        libnginx-mod-http-headers-more-filter \
        openssh-client \
        supervisor \
    ; \
    rm -rf /var/lib/apt/lists/*; \
    echo "fr_FR.UTF-8 UTF-8" > /etc/locale.gen; \
    locale-gen; \
    update-locale LANG=fr_FR.UTF-8; \
    corepack enable

RUN npm install pm2@5.4.3 elastic-apm-node@4.13.0 -g && mkdir -p ${DOCKER_HOME}/.pm2

RUN curl -L https://github.com/a8m/envsubst/releases/download/v1.2.0/envsubst-`uname -s`-`uname -m` -o envsubst; \
    chmod +x envsubst; \
    mv envsubst /usr/local/bin

RUN rm -rf \
    /etc/nginx/nginx.conf \
    /etc/nginx/sites-available/* \
    /etc/nginx/sites-enabled/* \
    /etc/supervisor/conf.d/* \
    /var/lib/apt/lists/*

# Copy config/bin files
COPY ./22/nginx/nginx.conf.template /etc/nginx/nginx.conf.template
COPY ./22/supervisor/*.conf /etc/supervisor/conf.d/
COPY --from=docker-common ./bin/docker-entrypoint.sh /usr/local/bin/docker-entrypoint
COPY --from=docker-common ./docker-entrypoint.d /docker-entrypoint.d

RUN set -eux; \
    userdel -r node; \
    mkdir -p ${DOCKER_HOME}/.config/alltricks-terminal; \
    chmod -R 777 ${DOCKER_HOME} /etc/passwd /etc/group

EXPOSE 3000
EXPOSE 3001
EXPOSE 8001

# Keep these variables at the end, it's default values used at runtime only or just info data that not impact previous steps
ARG DOCKER_BASE_IMAGE_VERSION
ENV DOCKER_BASE_IMAGE_VERSION=$DOCKER_BASE_IMAGE_VERSION
ENV DOCKER_ENTRYPOINT_DEFAULT_BIN='nodejs'
ENV ELASTIC_APM_ENABLED='false'
ENV ELASTIC_APM_SERVER_URL=''
ENV ELASTIC_APM_SERVICE_NAME='default'
ENV ELASTIC_APM_USE_PATH_AS_TRANSACTION_NAME=true
ENV ELASTIC_APM_OPENTELEMETRY_BRIDGE_ENABLED=true
ENV ELASTIC_APM_LOG_LEVEL='off'
ENV NEXT_OTEL_VERBOSE=0
ENV NEXT_OTEL_FETCH_DISABLED=1
ENV OTEL_NODE_DISABLED_INSTRUMENTATIONS="net,dns,fetch"
ENV ELASTIC_RUM_ACTIVE='0'
ENV ELASTIC_RUM_SERVICE_NAME='default'
ENV ELASTIC_APM_SERVER_URL=''
ENV ELASTIC_RUM_SAMPLE_RATE=1

ENTRYPOINT ["docker-entrypoint"]

#####################################################################################
#####################################################################################

FROM dev AS wine

RUN set -eux; \
    dpkg --add-architecture i386; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        dbus-x11 \
        libasound2 \
        libatk-bridge2.0-0 \
        libgbm1 \
        libgconf-2-4 \
        libgtk3.0 \
        libnotify-dev \
        libnss3 \
        libpng-dev \
        libxss1 \
        wine \
        wine32:i386 \
        xvfb \
    ; \
    rm -rf /var/lib/apt/lists/*

#####################################################################################
#####################################################################################

FROM dev AS prod

RUN set -eux; \
    apt-get remove -y \
        build-essential \
        ca-certificates \
        git \
        openssh-client \
    ; \
    apt-get auto-remove -y; \
    rm -rf \
        /home/docker \
        /var/lib/apt/lists/* \
    ; \
    mkdir -p /etc/nginx/sites-enabled
