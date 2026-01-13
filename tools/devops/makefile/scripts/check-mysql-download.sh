#!/bin/bash

set -e

# Config
domains=(
    "it-raspberry-bba.avanis.org"
    "it-raspberry-mlb.avanis.org"
)

# Functions
check_ip() {
    local ip="$1"

    ping -c 1 -W 1 "$ip" > /dev/null
}

# Main
ips=()
for domain in "${domains[@]}"; do
    ip=$(dig +short "$domain")
    [[ -n "$ip" ]] && ips+=("$ip")
done

for ip in "${ips[@]}"; do
    if check_ip "$ip"; then
        echo "Use local download command : mysql-download-from-lan-bba/mysql-download-from-lan-mlb"
        exit 1;
    fi
done
