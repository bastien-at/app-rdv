FROM debian:bookworm-slim

ENV ACCEPT_EULA Y
ENV DEBIAN_FRONTEND noninteractive

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        apt-transport-https \
        cron \
        curl \
        gnupg \
        tzdata \
        software-properties-common \
        sudo \
        wondershaper \
    ; \
    curl -sS https://packages.cloud.google.com/apt/doc/apt-key.gpg \
        | gpg --dearmor \
        | tee /etc/apt/trusted.gpg.d/cloud.google.gpg \
    ; \
    echo "deb [signed-by=/etc/apt/trusted.gpg.d/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" \
        | tee /etc/apt/sources.list.d/google-cloud-sdk.list \
    ; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        google-cloud-cli  \
    ;

RUN set -eux; \
    adduser --disabled-password --gecos '' docker; \
    adduser docker sudo; \
    mkdir -p /home/docker/avanis-mysql-dump-prod-cleaned; \
    echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

COPY ./dl.sh /home/docker/dl.sh

RUN set -eux; \
    chown -R docker:docker /home/docker; \
    chmod +x /home/docker/dl.sh; \
    crontab -l | { cat; echo "5 12 * * 1,3 bash /home/docker/dl.sh avanis-mysql-dump-prod-cleaned"; } | crontab - ; \
    crontab -l | { cat; echo "5 7 * * 1,3 bash /home/docker/dl.sh avanis-postgres-dump-prod-cleaned"; } | crontab - ; \
    crontab -l | { cat; echo "5 4 * * 1,3 bash /home/docker/dl.sh trocvelo-mysql-dump-prod-cleaned"; } | crontab - ; \
    crontab -l | { cat; echo "5 6 * * 1,3 bash /home/docker/dl.sh trocvelo-es-dump-prod-cleaned"; } | crontab - ; \
    touch /var/log/cron.log

CMD cron && tail -f /var/log/cron.log
