#!/bin/sh
set -e

sed -E "s~^(.+:$(id -u):$(id -g):.*):.+:([^:]+)$~\1:${DOCKER_HOME}:\2~" /etc/passwd_host > /etc/passwd
cp /etc/group_host /etc/group
export HOME="${DOCKER_HOME}"
mkdir -p ~/.wine

if [ "${1#-}" != "$1" ]; then
    set -- nodejs "$@"
fi
exec "$@"
