FROM dunglas/frankenphp:php8.3.10-bookworm

ENV ACCEPT_EULA=Y
ENV DEBIAN_FRONTEND=noninteractive

# Install essential
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        apt-transport-https \
        curl \
        gnupg \
        lsb-release \
        software-properties-common; \
    ln -fs /usr/share/zoneinfo/Europe/Paris /etc/localtime;

# Setup custom repositories
RUN curl -sS https://packages.blackfire.io/gpg.key \
        | gpg --dearmor \
        | tee /usr/share/keyrings/blackfire.gpg \
    ; \
    printf "Types: deb\nURIs: http://packages.blackfire.io/debian\nSuites: any\nComponents: main\nArchitectures: $(dpkg --print-architecture)\nEnabled: Yes\nSigned-By: /usr/share/keyrings/blackfire.gpg" \
        | tee /etc/apt/sources.list.d/blackfire.sources \
    ; \

# Install apps : supervisor, nginx, PHP, SQL Server...
RUN apt-get update; \
    ACCEPT_EULA=Y apt-get install -yqq --no-install-recommends \
        git \
        locales \
        nano \
        openssh-client \
        supervisor \
        unzip \
        zip;

## Install PHP extenions
RUN install-php-extensions \
        amqp \
        bcmath \
        curl \
        gd \
        imap \
        intl \
        mbstring \
        opcache \
        pdo_mysql \
        pcov \
        pgsql \
        redis \
        soap \
        ssh2 \
        xdebug \
        xml \
        zip;

RUN set -eux; \
    curl -L https://github.com/a8m/envsubst/releases/download/v1.2.0/envsubst-`uname -s`-`uname -m` -o envsubst; \
    chmod +x envsubst; \
    mv envsubst /usr/local/bin

RUN set -eux; \
    echo "en_US.UTF-8 UTF-8" > /etc/locale.gen; \
    locale-gen; \
    # composer
    curl -sS https://getcomposer.org/installer \
        | php -- --install-dir=/usr/local/bin --filename=composer --version=2.7.6 \
    ; \
    # blackfire cli
    mkdir -p /tmp/blackfire; \
    curl -L https://blackfire.io/api/v1/releases/client/linux_static/amd64 \
        | tar zxp -C /tmp/blackfire \
    ; \
    mv /tmp/blackfire/blackfire /usr/bin/blackfire; \
    rm -rf \
        /etc/supervisor/conf.d/* \
        /tmp/blackfire \
        /var/lib/apt/lists/*

RUN install-php-extensions sqlsrv pdo_sqlsrv pdo_pgsql

RUN apt-get update && apt-get install -yqq --no-install-recommends blackfire-php && rm -rf $PHP_INI_DIR/conf.d/*blackfire*

# Copy config/bin files
COPY ./8.3/php.ini $PHP_INI_DIR/php.ini
COPY ./8.3/php.ini $PHP_INI_DIR/php-cli.ini
COPY ./common/xdebug.ini $PHP_INI_DIR/conf.d/z-01-xdebug.ini
COPY ./common/pcov.ini $PHP_INI_DIR/conf.d/z-01-pcov.ini
COPY ./common/blackfire.ini $PHP_INI_DIR/conf.d/z-01-blackfire.ini

RUN set -eux; \
    sed -i -E "s/^memory_limit *=.+/memory_limit=-1/" $PHP_INI_DIR/php-cli.ini; \
    sed -i -E "s/^opcache.validate_timestamps *=.+/opcache.validate_timestamps = 1/" $PHP_INI_DIR/php-cli.ini;
#    echo "extension=sqlsrv.so" > $PHP_INI_DIR/conf.d/sqlsrv.ini; \
#    echo "extension=pdo_sqlsrv.so" > $PHP_INI_DIR/conf.d/pdo_sqlsrv.ini;


RUN rm -rf $PHP_INI_DIR/conf.d/*xdebug*


COPY ./8.3/supervisor/*.conf /etc/supervisor/conf.d/

COPY ./common/bin/* /usr/local/bin/
COPY --from=docker-common ./bin/docker-entrypoint.sh /usr/local/bin/docker-entrypoint
COPY --from=docker-common ./docker-entrypoint.d /docker-entrypoint.d

ENV DOCKER_ENTRYPOINT_DEFAULT_BIN="php -c $PHP_INI_DIR/php-cli.ini"



# Update openssl conf to authorize tls1 (needed on connection to sage :/)
# https://github.com/microsoft/msphpsql/issues/1112
RUN set -eux; \
    printf "\n[default_conf]\nssl_conf = ssl_sect\n\n[ssl_sect]\nsystem_default = system_default_sect\n\n[system_default_sect]\nMinProtocol = TLSv1\nCipherString = DEFAULT:@SECLEVEL=0\n" >> /etc/ssl/openssl.cnf; \
    sed -i -E "s#openssl_conf = .+#openssl_conf = default_conf#" /etc/ssl/openssl.cnf


#ENTRYPOINT ["docker-entrypoint"]



RUN   apt-get update && apt-get install -yqq --no-install-recommends procps htop

ENV DOCKER_HOME='/home/docker'
ENV GIT_BRANCH=unassigned
ENV GIT_PR_NAMESPACE=unassigned
ENV GIT_PR_NUM=unassigned
ENV PHYSICAL_ENV=unassigned
ARG DOCKER_BASE_IMAGE_VERSION
ENV DOCKER_ENTRYPOINT_DEFAULT_BIN='php'
ENV PHP_OPCACHE_CLI_ENABLED=1
ENV PHP_OPCACHE_VALIDATE_TIMESTAMP=0
ENV PHP_OPCACHE_PRELOAD=''
ENV PHP_OPCACHE_PRELOAD_USER='www-data'
ENV PHP_MAX_EXECUTION_TIME=60
ENV PCOV_ENABLED=0
ENV PHP_IDE_CONFIG='serverName=docker'
ENV FPM_MODE='static'
ENV FPM_MAX_CHILDREN=4
ENV FPM_MAX_REQUESTS=2000
ENV FPM_START_SERVERS=2
ENV FPM_MIN_SPARE=1
ENV FPM_MAX_SPARE=3
ENV FPM_PROCESS_IDLE_TIMEOUT="10s"
ENV NGINX_WORKER_CONNECTIONS=512
ENV DOCKER_BASE_IMAGE_VERSION=$DOCKER_BASE_IMAGE_VERSION
ENV ELASTIC_APM_SERVICE_NAME='default'
ENV ELASTIC_APM_ENABLED='false'
ENV ELASTIC_APM_SERVER_URL=''
ENV ELASTIC_APM_DISABLE_INSTRUMENTATIONS='*'
ENV ELASTIC_APM_SPAN_MIN_DURATION='default=10,external-http=0'
ENV ELASTIC_APM_STACK_TRACE_LIMIT=5
ENV ELASTIC_APM_GROUP_SPANS='true'
ENV ELASTIC_APM_CAPTURE_ERRORS='false'
ENV ELASTIC_APM_LOG_LEVEL='OFF'

ARG USER=1000

RUN \
	# Use "adduser -D ${USER}" for alpine based distros
	adduser --disabled-password --no-create-home -u 1000 --gecos "" xx; \
	# Add additional capability to bind to port 80 and 443
	setcap CAP_NET_BIND_SERVICE=+eip /usr/local/bin/frankenphp; \
	# Give write access to /data/caddy and /config/caddy
	chown -R ${USER}:${USER} /data/caddy && chown -R ${USER}:${USER} /config/caddy;