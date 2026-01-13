#!/bin/bash

# Usage : Run a consumer with `bash signal_dispatcher_queue_to_memory_file.sh php bin/console messenger:consume my-queue`.
# `stop_gracefully` function is triggered on exit/term/quit and create a file watch by Symfony Messenger listeners

stop_gracefully () {
  touch "$shared_file"
  wait "$pid"
}

command=(${*})
command_string=$(printf "%s" "${*}")
command_regex='^php bin/console messenger:consume ([a-z0-9_.-]+) .*'

if [[ ! "$command_string" =~ $command_regex ]]; then
  echo "Symfony consumer command does not match regex '$command_regex'"
  exit 1
fi;

shared_file="/dev/shm/queue_${BASH_REMATCH[1]}_stop_asked"

rm -f "$shared_file"
trap stop_gracefully EXIT SIGTERM SIGQUIT

"${command[@]}" &
pid=$!
wait $pid


