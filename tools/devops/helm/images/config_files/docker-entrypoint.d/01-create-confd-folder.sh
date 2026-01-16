#!/bin/sh

set -e

create_confd_folder() {
  local output_dir="${NGINX_ENVSUBST_OUTPUT_DIR:-/etc/nginx/conf.d}"
  [ ! -d "$output_dir" ] || return 0
  mkdir -p "$output_dir"
}

create_confd_folder

exit 0
