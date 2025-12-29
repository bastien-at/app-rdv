#!/usr/bin/env bash

# Run this script from host machine

set -ex;

export ACCEPT_EULA=Y
export DEBIAN_FRONTEND=noninteractive
export TZ=Europe/Paris

if [ "$(id -u)" -ne 0 ]; then
  echo "Initialization script must executed with granted privileges : use root or sudo.";
  exit 1;
fi

path="$(cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P)";

# Install common utilities
apt-get update;
apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  make \
;

if [ ! -f /etc/apt/sources.list.d/docker.list ]; then
  # Remove native docker from Ubuntu repository
  apt-get remove \
    docker \
    docker.io \
    containerd \
  ;
  apt-get autoremove;

  # Install Docker from official Docker repository
  mkdir -p /etc/apt/keyrings;

  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor \
    | tee /etc/apt/keyrings/docker.gpg \
  ;

  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    | tee /etc/apt/sources.list.d/docker.list > /dev/null \
  ;

  apt-get update;
  apt-get install -y --no-install-recommends \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-compose-plugin \
  ;
fi

if [ ! -f /etc/apt/sources.list.d/google-cloud-sdk.list ]; then
  mkdir -p /usr/share/keyrings;

  curl https://packages.cloud.google.com/apt/doc/apt-key.gpg \
    | gpg --dearmor \
    | tee /usr/share/keyrings/cloud.google.gpg \
  ;

  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/cloud.google.gpg] \
    https://packages.cloud.google.com/apt cloud-sdk main" \
    | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list > /dev/null \
  ;

  apt-get update;
  apt-get install -y --no-install-recommends \
    google-cloud-cli \
  ;
fi

# Configure docker
echo '{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "2"
  }
}' > /etc/docker/daemon.json

# Use bind mount instead volume
# https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html#_always_bind_data_volumes
mkdir -p /data/backup;
mkdir -p /data/elasticsearch/data;
mkdir -p /data/elasticsearch/snapshots/;
chmod -R 0777 /data/elasticsearch/data;
chmod -R 0777 /data/elasticsearch/snapshots;

mkdir -p /data/grafana;
chmod -R 0777 /data/grafana;

mkdir -p /data/oncall;
chmod -R 0777 /data/oncall;

if [ ! -f /etc/sysctl.d/50-elk-stack.conf ]; then
  # Create sysctl config file
  echo -e "# Auto-generated file; don't edit manually\n" > /etc/sysctl.d/50-elk-stack.conf;

  # Increase max virtual memory areas (default: 65530)
  # https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html#_set_vm_max_map_count_to_at_least_262144
  echo "vm.max_map_count=262144" >> /etc/sysctl.d/50-elk-stack.conf;

  # Disable swapping (swappiness chosen, cf url below) (default: 60)
  # https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html#_disable_swapping
  echo "vm.swappiness=1" >> /etc/sysctl.d/50-elk-stack.conf;
fi

# Apply changes
sysctl -p /etc/sysctl.d/50-elk-stack.conf

# Add systemd unit to manage start/stop on system boot/shutdown
cp "$path/../systemd/elk.service" /etc/systemd/system/elk.service
cp "$path/../systemd/notifier.service" /etc/systemd/system/notifier.service
cp "$path/../systemd/certbot-renew.service" /etc/systemd/system/certbot-renew.service
cp "$path/../systemd/certbot-renew.timer" /etc/systemd/system/certbot-renew.timer
systemctl enable elk.service
systemctl start elk.service
systemctl enable notifier.service
systemctl start notifier.service
systemctl enable certbot-renew.service
systemctl start certbot-renew.service
