#!/bin/bash

IGNORE_USER_REGEX="^(avanis|avanis-ro|bi|repl|mysql-watcher|jenkins-prod|datadog|system user|root|retool|proxysql)$"

ptkill_base () {
  local host="$1"
  local user="$2"
  local password="$3"
  local mode="${4:-dry-run}"  # "dry-run" ou "run"

  if [[ -z "$host" ]]; then
    echo "host undefined"
    exit 8
  fi

  if [[ -z "$user" ]]; then
    echo "user undefined"
    exit 8
  fi

  if [[ -z "$password" ]]; then
    echo "password undefined"
    exit 8
  fi

  local args=(
    --host="${host}"
    --user="${user}"
    --password="${password}"
    --run-time=1
    --interval=1
    --busy-time=1
    --idle-time=1
    --victims=all
    --ignore-user="${IGNORE_USER_REGEX}"
    --print
    --json
  )

  if [[ "$mode" == "run" ]]; then
    args+=(--kill)
  fi

  pt-kill "${args[@]}" 2>&1
}

ptkill_dry_run () {
  local host="$1"
  local user="$2"
  local password="$3"

  ptkill_base "${host}" "${user}" "${password}" "dry-run"
}

ptkill_run () {
  local host="$1"
  local user="$2"
  local password="$3"

  ptkill_base "${host}" "${user}" "${password}" "run"
}
