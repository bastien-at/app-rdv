FROM debian:bookworm-slim AS not-final-pecl

ENV ACCEPT_EULA=Y
ENV DEBIAN_FRONTEND=noninteractive

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        apt-transport-https \
        curl \
        gnupg \
        lsb-release \
        software-properties-common \
    ; \
    curl -sS https://packages.sury.org/php/apt.gpg \
        | gpg --dearmor \
        | tee /usr/share/keyrings/php.gpg; \
    printf "Types: deb\nURIs: https://packages.sury.org/php/\nSuites: $(lsb_release -sc)\nComponents: main\nEnabled: Yes\nSigned-By: /usr/share/keyrings/php.gpg" \
        | tee /etc/apt/sources.list.d/php.sources

RUN set -eux; \
    apt-get update; \
    apt-get install -yqq --no-install-recommends \
        g++ \
        git \
        libmemcached-dev \
        libxml2-dev \
        make \
        php-pear \
        php8.4-dev \
        unixodbc-dev \
    ; \
    rm -rf /var/lib/apt/lists/*

RUN pecl config-set php_ini /etc/php/8.4/fpm/php.ini; \
    pecl config-set php_bin /usr/bin/php8.4; \
    pecl install \
        pdo_sqlsrv-5.10.0 \
        sqlsrv-5.10.0 \
        xdebug \
    ; \
    pecl clear-cache

#####################################################################################
#####################################################################################

FROM debian:bookworm-slim AS dev

ENV ACCEPT_EULA=Y
ENV DEBIAN_FRONTEND=noninteractive
ENV DOCKER_HOME='/home/docker'
ENV GIT_BRANCH=unassigned
ENV GIT_PR_NAMESPACE=unassigned
ENV GIT_PR_NUM=unassigned
ENV PHYSICAL_ENV=unassigned

COPY --from=not-final-pecl /usr/lib/php/20240924/pdo_sqlsrv.so /usr/lib/php/20240924/pdo_sqlsrv.so
COPY --from=not-final-pecl /usr/lib/php/20240924/sqlsrv.so /usr/lib/php/20240924/sqlsrv.so
COPY --from=not-final-pecl /usr/lib/php/20240924/xdebug.so /usr/lib/php/20240924/xdebug.so

# Install
RUN set -eux; \
    apt-get update; \
    # Install essential & setup custom repositories
    apt-get install -y --no-install-recommends \
        apt-transport-https \
        curl \
        gnupg \
        lsb-release \
        software-properties-common \
    ; \
    # Blackfire - package
    curl -sS https://packages.blackfire.io/gpg.key \
        | gpg --dearmor \
        | tee /usr/share/keyrings/blackfire.gpg \
    ; \
    printf "Types: deb\nURIs: http://packages.blackfire.io/debian\nSuites: any\nComponents: main\nArchitectures: $(dpkg --print-architecture)\nEnabled: Yes\nSigned-By: /usr/share/keyrings/blackfire.gpg" \
        | tee /etc/apt/sources.list.d/blackfire.sources \
    ; \
    # PHP - package
    curl -sS https://packages.sury.org/php/apt.gpg \
        | gpg --dearmor \
        | tee /usr/share/keyrings/php.gpg \
    ; \
    printf "Types: deb\nURIs: https://packages.sury.org/php/\nSuites: $(lsb_release -sc)\nComponents: main\nEnabled: Yes\nSigned-By: /usr/share/keyrings/php.gpg" \
        | tee /etc/apt/sources.list.d/php.sources \
    ; \
    # MicroSoft
    curl -sS  https://packages.microsoft.com/keys/microsoft.asc \
        | gpg --dearmor \
        | tee /usr/share/keyrings/microsoft.gpg \
    ; \
    # Le package msodbcsql17 n'est pas encore disponible dans le repo debian 12 de microsoft, on le récupère de puis le repo debian 11 de microsoft
    printf "Types: deb\nURIs: https://packages.microsoft.com/debian/11/prod\nSuites: bullseye\nComponents: main\nArchitectures: amd64,armhf,arm64\nEnabled: Yes\nSigned-By: /usr/share/keyrings/microsoft.gpg" \
        | tee /etc/apt/sources.list.d/mssql-release.sources \
    ; \
    #printf "Types: deb\nURIs: https://packages.microsoft.com/debian/$(lsb_release -sr)/prod\nSuites: $(lsb_release -sc)\nComponents: main\Architectures: amd64,armhf,arm64\nEnabled: Yes\nSigned-By: /usr/share/keyrings/microsoft.gpg" \
    #    | tee /etc/apt/sources.list.d/mssql-release.sources \
    #; \
    ln -fs /usr/share/zoneinfo/Europe/Paris /etc/localtime; \
    # Install apps : supervisor, nginx, PHP, SQL Server...
    apt-get update; \
    (v=$(apt-get -V -s install php8.4-amqp | grep -ioP "inst php8.4-amqp \(\K([^ ]+)" | grep -vP "2\.[^ ]+") && echo "\033[0;31mphp8.4-amqp has a new major version ($v), check changes before continue and update Dockerfile...\033[0m" && exit 1) || true; \
    (v=$(apt-get -V -s install php8.4-imap | grep -ioP "inst php8.4-imap \(\K([^ ]+)" | grep -vP "3:1\.[^ ]+") && echo "\033[0;31mphp8.4-imap has a new major version ($v), check changes before continue and update Dockerfile...\033[0m" && exit 1) || true; \
    (v=$(apt-get -V -s install php8.4-pcov | grep -ioP "inst php8.4-pcov \(\K([^ ]+)" | grep -vP "1\.[^ ]+") && echo "\033[0;31mphp8.4-pcov has a new major version ($v), check changes before continue and update Dockerfile...\033[0m" && exit 1) || true; \
    (v=$(apt-get -V -s install php8.4-redis | grep -ioP "inst php8.4-redis \(\K([^ ]+)" | grep -vP "6\.[^ ]+") && echo "\033[0;31mphp8.4-redis has a new major version ($v), check changes before continue and update Dockerfile...\033[0m" && exit 1) || true; \
    (v=$(apt-get -V -s install php8.4-ssh2 | grep -ioP "inst php8.4-ssh2 \(\K([^ ]+)" | grep -vP "1\.[^ ]+") && echo "\033[0;31mphp8.4-ssh2 has a new major version ($v), check changes before continue and update Dockerfile...\033[0m" && exit 1) || true; \
    apt-get install -yqq --no-install-recommends \
        blackfire \
        blackfire-php \
        git \
        locales \
        msodbcsql17 \
        nano \
        nginx \
        libnginx-mod-http-headers-more-filter \
        openssh-client \
        php-pear \
        php8.4-amqp \
        php8.4-bcmath \
        php8.4-cli \
        php8.4-curl \
        php8.4-common \
        php8.4-dev \
        php8.4-fpm \
        php8.4-gd \
        php8.4-imap \
        php8.4-intl \
        php8.4-mbstring \
        php8.4-mysql \
        php8.4-opentelemetry \
        php8.4-pcov \
        php8.4-pgsql \
        php8.4-redis \
        php8.4-soap \
        php8.4-ssh2 \
        php8.4-xml \
        php8.4-zip \
        supervisor=4.2.5-1 \
        unixodbc-dev \
        unzip \
        zip

# Install elastic-apm extension and remove default config file links (to be able to use `phpdismod/phpenmod`)
# Copy custom changes too (see README in ./common/elastic-apm-agent-php/src)
RUN set -eux; \
    curl -sSLO https://storage.googleapis.com/avanis-packages/apm-agent-php_1.14.1_amd64.deb; \
    dpkg -i apm-agent-php_*.deb; \
    rm -rf apm-agent-php_*.deb; \
    rm -rf /etc/php/*/*/conf.d/*elastic-apm*.ini; \
    ( \
     [ "7e8ce4df98133656255e7e9f7150e9c9" = "$(md5sum /opt/elastic/apm-agent-php/src/ElasticApm/Impl/Tracer.php | cut -f1 -d' ')" ] && \
     [ "a64e020bee9bed849dd211e4b0b7da2a" = "$(md5sum /opt/elastic/apm-agent-php/src/ElasticApm/Impl/Span.php | cut -f1 -d' ')" ] && \
     [ "6f58fb9b9b6e219b4d0c7fd74182e55d" = "$(md5sum /opt/elastic/apm-agent-php/src/ElasticApm/Impl/Config/Snapshot.php | cut -f1 -d' ')" ] \
    ) || (echo "ERROR : At least one ElasticApm file change from last build, check ./common/elastic-apm-agent-php/src/README.md" && exit 16)
COPY ./common/elastic-apm-agent-php/src/ /opt/elastic/apm-agent-php/src/

RUN set -eux; \
    curl -L https://github.com/a8m/envsubst/releases/download/v1.2.0/envsubst-`uname -s`-`uname -m` -o envsubst; \
    chmod +x envsubst; \
    mv envsubst /usr/local/bin

RUN set -eux; \
    echo "en_US.UTF-8 UTF-8" > /etc/locale.gen; \
    locale-gen; \
    # composer
    curl -sS https://getcomposer.org/installer \
        | php -- --install-dir=/usr/local/bin --filename=composer --version=2.8.8 \
    ; \
    rm -rf \
        /etc/nginx/nginx.conf \
        /etc/nginx/sites-enabled/* \
        /etc/nginx/sites-available/* \
        /etc/supervisor/conf.d/* \
        /var/lib/apt/lists/*

# Copy config/bin files
COPY ./common/nginx/*.conf /etc/nginx/
COPY ./common/nginx/*.conf.template /etc/nginx/
COPY ./common/supervisor/*.conf /etc/supervisor/conf.d/
#COPY ./8.4/nginx/*.conf /etc/nginx/
#COPY ./8.4/nginx/*.conf.template /etc/nginx/
COPY ./8.4/supervisor/*.conf /etc/supervisor/conf.d/
COPY ./8.4/www.conf /etc/php/8.4/fpm/pool.d/www.conf
COPY ./8.4/php.ini  /etc/php/8.4/fpm/php.ini
COPY ./8.4/php.ini  /etc/php/8.4/cli/php.ini
COPY ./8.4/opentelemetry.ini /etc/php/8.4/mods-available/opentelemetry.ini
COPY ./common/elastic-apm.ini /etc/php/8.4/mods-available/elastic-apm.ini
COPY ./common/xdebug.ini /etc/php/8.4/mods-available/xdebug.ini
COPY ./common/bin/* /usr/local/bin/
COPY --from=docker-common ./bin/docker-entrypoint.sh /usr/local/bin/docker-entrypoint
COPY --from=docker-common ./docker-entrypoint.d /docker-entrypoint.d

# PHP config
RUN set -eux; \
    sed -i -E "s/^memory_limit *=.+/memory_limit=-1/" /etc/php/8.4/cli/php.ini; \
    sed -i -E "s/^opcache.validate_timestamps *=.+/opcache.validate_timestamps = 1/" /etc/php/8.4/cli/php.ini; \
    sed -i -E "s/^opcache.file_cache *=.+//" /etc/php/8.4/fpm/php.ini; \
    sed -i -E "s#^extension=.*#$(sed -n '/^extension=/p' /opt/elastic/apm-agent-php/etc/elastic-apm.ini)#" /etc/php/8.4/mods-available/elastic-apm.ini; \
    echo "extension=sqlsrv.so" > /etc/php/8.4/mods-available/sqlsrv.ini; \
    echo "extension=pdo_sqlsrv.so" > /etc/php/8.4/mods-available/pdo_sqlsrv.ini; \
    echo 'pcov.enabled=${PCOV_ENABLED}' >> /etc/php/8.4/mods-available/pcov.ini; \
    echo 'pcov.directory=/var/www/html' >> /etc/php/8.4/mods-available/pcov.ini; \
    echo 'pcov.exclude="~.+/(vendor|node_modules)/.+~"' >> /etc/php/8.4/mods-available/pcov.ini; \
    echo "; priority=90" > /etc/php/8.4/mods-available/blackfire.ini; \
    echo "extension=blackfire.so" >> /etc/php/8.4/mods-available/blackfire.ini; \
    echo "blackfire.agent_socket = unix:///var/run/blackfire/agent.sock" >> /etc/php/8.4/mods-available/blackfire.ini; \
    echo "blackfire.apm_enabled = 0" >> /etc/php/8.4/mods-available/blackfire.ini; \
    pecl config-set php_ini /etc/php/8.4/fpm/php.ini; \
    phpenmod \
        elastic-apm \
        pdo_sqlsrv \
        sqlsrv \
        xdebug \
    ; \
    # PHP-FPM permissions
    touch /var/log/php-fpm.log; \
    mkdir -p \
        /var/run/php \
        /var/www/php-opcache \
    ; \
    chown www-data:www-data \
        /var/log/php-fpm.log \
        /var/run/php \
        /var/www/php-opcache \
    ; \
    chmod 770  \
        /var/log/php-fpm.log \
        /var/run/php \
        /var/www/php-opcache \
    ; \
    # Blackfire dir \
    mkdir /var/run/blackfire; \
    # Create user context
    mkdir -p \
        ${DOCKER_HOME}/.config/composer \
        ${DOCKER_HOME}/.cache; \
    chmod -R 777 ${DOCKER_HOME}

# Update openssl conf to authorize tls1 (needed on connection to sage :/)
# https://github.com/microsoft/msphpsql/issues/1112
RUN set -eux; \
    printf "\n[default_conf]\nssl_conf = ssl_sect\n\n[ssl_sect]\nsystem_default = system_default_sect\n\n[system_default_sect]\nMinProtocol = TLSv1\nCipherString = DEFAULT:@SECLEVEL=0\n" >> /etc/ssl/openssl.cnf; \
    sed -i -E "s#openssl_conf = .+#openssl_conf = default_conf#" /etc/ssl/openssl.cnf

RUN apt-get install -yqq --no-install-recommends

EXPOSE 8080
EXPOSE 443

# Keep these variables at the end, it's default values used at runtime only or just info data that not impact previous steps
ARG DOCKER_BASE_IMAGE_VERSION
ENV DOCKER_ENTRYPOINT_DEFAULT_BIN='php'
ENV PHP_ALLOW_URL_FOPEN='On'
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

ENTRYPOINT ["docker-entrypoint"]

#####################################################################################
#####################################################################################

FROM dev AS prod

RUN set -eux; \
    phpdismod xdebug; \
    apt-get remove -y \
        apt-transport-https \
        git \
        gnupg \
        lsb-release \
        php8.4-dev \
        php8.4-pcov \
        php-pear \
        software-properties-common \
    ; \
    apt-get auto-remove -y; \
    rm -rf \
        /etc/php/8.4/mods-available/pcov.ini \
        /home/docker \
        /var/lib/apt/lists/* \
        /var/log/php-fpm.log \
        /var/run/php \
    ; \
    mkdir -p  \
        /etc/nginx/sites-enabled \
        /run/php \
    ; \
    chgrp -R www-data /etc/supervisor/conf.d; \
    chmod -R 775 /etc/supervisor/conf.d; \
    chmod -R 755 /var/www/php-opcache; \
    chown www-data:www-data /var/www/php-opcache

#####################################################################################
#####################################################################################

FROM dev AS wkhtmltopdf-dev

RUN apt-get update && apt-get install -yqq --no-install-recommends wkhtmltopdf

#####################################################################################
#####################################################################################

FROM prod AS wkhtmltopdf-prod

RUN apt-get update && apt-get install -yqq --no-install-recommends wkhtmltopdf
