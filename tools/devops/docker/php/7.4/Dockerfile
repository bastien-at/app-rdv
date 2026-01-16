FROM php:7.4 AS not-final-pecl

RUN set -eux; \
    apt-get update; \
    apt-get install -yqq --no-install-recommends \
        unixodbc-dev

RUN pecl install  \
        sqlsrv-5.10.1 \
        pdo_sqlsrv-5.10.1 \
        xdebug-3.1.6

FROM debian:bookworm-slim AS not-final-build-mysqlnd-ms

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
        php7.4-dev \
        unixodbc-dev \
    ; \
    rm -rf /var/lib/apt/lists/*

RUN set -eux; \
    git clone https://github.com/sergiotabanelli/mysqlnd_ms.git /usr/local/src/mysqlnd_ms; \
    cd /usr/local/src/mysqlnd_ms; \
    phpize; \
    rm configure; \
    aclocal; \
    autoreconf; \
    ./configure; \
    make --jobs="$(nproc)"; \
    make install

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
ENV SYMFONY_ENV=unassigned

RUN set -eux; \
    apt-get update; \
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
    # Node 16 and Yarn
    echo "Package: nodejs" >> /etc/apt/preferences.d/preferences; \
    echo "Pin: origin deb.nodesource.com" >> /etc/apt/preferences.d/preferences; \
    echo "Pin-Priority: 1001" >> /etc/apt/preferences.d/preferences; \
    curl -sL https://deb.nodesource.com/setup_16.x \
        | bash - \
    ; \
    curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg \
        | gpg --dearmor \
        | tee /usr/share/keyrings/yarn.gpg \
    ; \
    printf "Types: deb\nURIs: https://dl.yarnpkg.com/debian/\nSuites: stable\nComponents: main\nEnabled: Yes\nSigned-By: /usr/share/keyrings/yarn.gpg" \
        | tee /etc/apt/sources.list.d/yarn.sources \
    ; \
    #printf "Types: deb\nURIs: https://packages.microsoft.com/debian/$(lsb_release -sr)/prod\nSuites: $(lsb_release -sc)\nComponents: main\Architectures: amd64,armhf,arm64\nEnabled: Yes\nSigned-By: /usr/share/keyrings/microsoft.gpg" \
    #    | tee /etc/apt/sources.list.d/mssql-release.sources \
    #; \
    ln -fs /usr/share/zoneinfo/Europe/Paris /etc/localtime

RUN set -eux; \
    apt-get update; \
    (v=$(apt-get -V -s install php8.3-memcache | grep -ioP "inst php8.3-memcache \(\K([^ ]+)" | grep -vP "1\.[^ ]+") && echo "\033[0;31mphp8.3-memcache has a new major version ($v), check changes before continue and update Dockerfile...\033[0m" && exit 1) || true; \
    (v=$(apt-get -V -s install php8.3-memcached | grep -ioP "inst php8.3-memcached \(\K([^ ]+)" | grep -vP "3\.[^ ]+") && echo "\033[0;31mphp8.3-memcached has a new major version ($v), check changes before continue and update Dockerfile...\033[0m" && exit 1) || true; \
    (v=$(apt-get -V -s install php8.3-redis | grep -ioP "inst php8.3-redis \(\K([^ ]+)" | grep -vP "6\.[^ ]+") && echo "\033[0;31mphp8.3-redis has a new major version ($v), check changes before continue and update Dockerfile...\033[0m" && exit 1) || true; \
    (v=$(apt-get -V -s install php8.3-ssh2 | grep -ioP "inst php8.3-ssh2 \(\K([^ ]+)" | grep -vP "1\.[^ ]+") && echo "\033[0;31mphp8.3-ssh2 has a new major version ($v), check changes before continue and update Dockerfile...\033[0m" && exit 1) || true; \
    apt-get install -yqq --no-install-recommends \
        blackfire \
        blackfire-php \
        build-essential \
        geoip-database \
        git \
        locales \
        msodbcsql17 \
        nano \
        nginx \
        libnginx-mod-http-headers-more-filter \
        nodejs \
        openssh-client \
        php-pear \
        php7.4-bcmath \
        php7.4-cli \
        php7.4-curl \
        php7.4-common \
        php7.4-dev \
        php7.4-fpm \
        php7.4-gd \
        php7.4-imap \
        php7.4-intl \
        php7.4-json\
        php7.4-mbstring \
        php7.4-memcache \
        php7.4-memcached \
        php7.4-mysql \
        php7.4-redis \
        php7.4-soap \
        php7.4-ssh2 \
        php7.4-xml \
        php7.4-zip \
        supervisor=4.2.5-1 \
        unixodbc-dev \
        unzip \
        yarn \
        zip \
        zlib1g-dev

# Download geoipupdate specific version; geoipupdate version from debian contrib repository is to old and does not works.
RUN set -eux; \
    curl -sSLO https://github.com/maxmind/geoipupdate/releases/download/v6.1.0/geoipupdate_6.1.0_linux_amd64.deb; \
    dpkg -i geoipupdate_*.deb; \
    rm -rf geoipupdate_*.deb

# Compile libpng-1.2
RUN set -eux; \
    curl -L -o libpng-1.2.59.tar.xz https://sourceforge.net/projects/libpng/files/libpng12/1.2.59/libpng-1.2.59.tar.xz/download; \
    tar xvfJ libpng-1.2.59.tar.xz; \
    cd libpng-1.2.59/; \
    ./configure; \
    make check; \
    make install; \
    cd ../; \
    rm -rf libpng-1.2.59/

# Install elastic-apm extension and remove default config file links (to be able to use `phpdismod/phpenmod`)
# Copy custom changes too (see README in ./common/elastic-apm-agent-php/src)
RUN set -eux; \
    curl -sSLO https://github.com/elastic/apm-agent-php/releases/download/v1.13.0/apm-agent-php_1.13.0_amd64.deb; \
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
    mv envsubst /usr/local/bin; \
    echo "en_US.UTF-8 UTF-8" > /etc/locale.gen; \
    locale-gen; \
    rm -rf \
        /etc/nginx/nginx.conf \
        /etc/nginx/sites-available/* \
        /etc/nginx/sites-enabled/* \
        /etc/supervisor/conf.d/* \
        /var/lib/apt/lists/*

COPY --from=not-final-build-mysqlnd-ms /usr/lib/php/20190902/mysqlnd_ms.so  /usr/lib/php/20190902/mysqlnd_ms.so
COPY --from=not-final-pecl /usr/local/lib/php/extensions/no-debug-non-zts-20190902/pdo_sqlsrv.so /usr/lib/php/20190902/pdo_sqlsrv.so
COPY --from=not-final-pecl /usr/local/lib/php/extensions/no-debug-non-zts-20190902/sqlsrv.so /usr/lib/php/20190902/sqlsrv.so
COPY --from=not-final-pecl /usr/local/lib/php/extensions/no-debug-non-zts-20190902/xdebug.so /usr/lib/php/20190902/xdebug.so
COPY ./common/geoip/GeoIP.conf /etc/GeoIP.conf

# Composer
RUN curl -sS https://getcomposer.org/installer \
        | php -- --install-dir=/usr/local/bin --filename=composer --version=1.10.26

# Copy config/bin files
COPY ./common/nginx/*.conf /etc/nginx/
COPY ./common/nginx/*.conf.template /etc/nginx/
COPY ./common/supervisor/*.conf /etc/supervisor/conf.d/
#COPY ./7.4/nginx/*.conf /etc/nginx/
#COPY ./7.4/nginx/*.conf.template /etc/nginx/
COPY ./7.4/supervisor/*.conf /etc/supervisor/conf.d/
COPY ./7.4/www.conf /etc/php/7.4/fpm/pool.d/www.conf
COPY ./7.4/php.ini /etc/php/7.4/fpm/php.ini
COPY ./7.4/php.ini /etc/php/7.4/cli/php.ini
COPY ./7.4/mysqlnd_ms.ini /etc/php/7.4/mods-available/
COPY ./7.4/mysqlnd_ms_plugin.ini /etc/php/
COPY ./common/elastic-apm.ini /etc/php/7.4/mods-available/elastic-apm.ini
COPY ./common/xdebug.ini /etc/php/7.4/mods-available/xdebug.ini
COPY ./common/bin/* /usr/local/bin/
COPY --from=docker-common ./bin/docker-entrypoint.sh /usr/local/bin/docker-entrypoint
COPY --from=docker-common ./docker-entrypoint.d /docker-entrypoint.d

# PHP Config
RUN sed -i -E "s/^memory_limit *=.+/memory_limit=-1/" /etc/php/7.4/cli/php.ini; \
    sed -i -E "s/^opcache.validate_timestamps *=.+/opcache.validate_timestamps = 1/" /etc/php/7.4/cli/php.ini; \
    sed -i -E "s/^opcache.file_cache *=.+//" /etc/php/7.4/fpm/php.ini; \
    sed -i -E "s#^extension=.*#$(sed -n '/^extension=/p' /opt/elastic/apm-agent-php/etc/elastic-apm.ini)#" /etc/php/7.4/mods-available/elastic-apm.ini; \
    echo "extension=sqlsrv.so" > /etc/php/7.4/mods-available/sqlsrv.ini; \
    echo "extension=pdo_sqlsrv.so" > /etc/php/7.4/mods-available/pdo_sqlsrv.ini; \
    echo "; priority=90" > /etc/php/7.4/mods-available/blackfire.ini; \
    echo "extension=blackfire.so" >> /etc/php/7.4/mods-available/blackfire.ini; \
    echo "blackfire.agent_socket = unix:///var/run/blackfire/agent.sock" >> /etc/php/7.4/mods-available/blackfire.ini; \
    echo "blackfire.apm_enabled = 0" >> /etc/php/7.4/mods-available/blackfire.ini; \
    phpenmod \
        elastic-apm \
        mysqlnd_ms \
        pdo_sqlsrv \
        sqlsrv \
        xdebug \
    ; \
    phpdismod blackfire; \
    # PHP-FPM permissions
    touch /var/log/php-fpm.log; \
    mkdir -p \
        /var/run/php \
        /var/www/php-opcache \
    ; \
    chown www-data:www-data \
        /var/log/php-fpm.log \
        /var/run/php /var/www/php-opcache \
    ; \
    chmod 770 \
        /var/log/php-fpm.log \
        /var/run/php \
        /var/www/php-opcache \
    ; \
    # Blackfire dir \
    mkdir /var/run/blackfire; \
    # Create user context
    mkdir -p \
        ${DOCKER_HOME}/.composer \
        ${DOCKER_HOME}/.cache; \
    chmod -R 777 ${DOCKER_HOME}


# Update openssl conf to authorize tls1 (needed on connection to sage :/)
# https://github.com/microsoft/msphpsql/issues/1112
RUN set -eux; \
    printf "\n[default_conf]\nssl_conf = ssl_sect\n\n[ssl_sect]\nsystem_default = system_default_sect\n\n[system_default_sect]\nMinProtocol = TLSv1\nCipherString = DEFAULT:@SECLEVEL=0\n" >> /etc/ssl/openssl.cnf; \
    sed -i -E "s#openssl_conf = .+#openssl_conf = default_conf#" /etc/ssl/openssl.cnf

# Download GeoIP databases
RUN set -eux; \
    geoipupdate -v

EXPOSE 8080
EXPOSE 443

# Keep these variables at the end, it's default values used at runtime only or just info data that not impact previous steps
ARG DOCKER_BASE_IMAGE_VERSION
ENV DOCKER_ENTRYPOINT_DEFAULT_BIN='php'
ENV PHP_OPCACHE_CLI_ENABLED=1
ENV PHP_OPCACHE_VALIDATE_TIMESTAMP=0
ENV PHP_OPCACHE_PRELOAD=''
ENV PHP_OPCACHE_PRELOAD_USER='www-data'
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
ENV ELASTIC_RUM_ACTIVE='0'
ENV ELASTIC_RUM_BREAKDOWN_METRICS='0'
ENV ELASTIC_RUM_DISTRIBUTED_TRACING='0'
ENV ELASTIC_RUM_PROPAGATE_TRACESTATE='0'
ENV ELASTIC_RUM_SERVICE_NAME='default'
ENV ELASTIC_RUM_SERVER_URL=''

ENTRYPOINT ["docker-entrypoint"]

#####################################################################################
#####################################################################################

FROM dev AS prod

RUN apt-get remove -y \
        build-essential \
        apt-transport-https \
        gnupg \
        php7.4-dev \
        php-pear \
        software-properties-common \
        zlib1g-dev \
    ; \
    apt-get auto-remove -y; \
    rm -rf \
        /home/docker \
        /var/lib/apt/lists/* \
        /var/log/php-fpm.log \
        /var/run/php \
    ; \
    mkdir -p \
        /etc/nginx/sites-enabled \
        /run/php \
    ; \
    chgrp -R www-data /etc/supervisor/conf.d; \
    chmod -R 775 /etc/supervisor/conf.d; \
    chmod -R 755 /var/www/php-opcache; \
    chown www-data:www-data /var/www/php-opcache; \
    phpdismod xdebug
