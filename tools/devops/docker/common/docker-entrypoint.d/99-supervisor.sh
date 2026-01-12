stop_gracefully() {
  # Send signal to supervisor, wait ending and wait 2 more seconds to be sure every logs are written
  kill -SIGQUIT $pid
  wait $pid
  sleep 2
}

# If no argument on run, launch supervisor
if [ -z "${1+x}" ]; then
    trap stop_gracefully SIGTERM

    # supervisor
    /usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf &
    pid=$!
    wait "$pid"
fi
