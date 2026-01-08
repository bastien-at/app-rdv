generate_config_from() {
  local suffix=".template"
  find "$1" -mindepth 1 -maxdepth 1 -type f -name "*$suffix" -print | while read -r template; do
    echo envsubst -i ${template} -o ${template%.template}
     test -f ${template%.template} || envsubst -i ${template} -o ${template%.template}
  done
}

generate_config_from /etc/nginx
generate_config_from /etc/nginx/conf.d
generate_config_from /etc/nginx/sites-available

if [[ "$PHYSICAL_ENV" = "dev" ]]; then
    rm -rf /etc/nginx/sites-enabled/*
    ( [ -n "$(find /etc/nginx/sites-available/ -name "*.conf" -print -quit)" ] && ln -s /etc/nginx/sites-available/*.conf /etc/nginx/sites-enabled/ ) || true
fi
