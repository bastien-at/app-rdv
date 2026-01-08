# If argument on run, execute arguments
if [ -n "${1+x}" ]; then
    if [ "${1#-}" != "$1" ]; then
        (test -n "$DOCKER_ENTRYPOINT_DEFAULT_BIN" || (echo '\e[31mDOCKER_ENTRYPOINT_DEFAULT_BIN is not defined..."\e[0m' && exit 8))

        set -- $DOCKER_ENTRYPOINT_DEFAULT_BIN "$@"
    fi

    cmd="$(printf "%q " "$@")"

    if [ "bash " = "$cmd" ] || [ "sh " = "$cmd" ]; then
        su -P -w "$(env | grep -Eo '^[^=]+' | grep -Ev '^(HOME|SHELL|USER|LOGNAME|PATH|IFS)$' | tr '\n' ',')" www-data -c "$cmd"
        exit $?
    fi

    su -w "$(env | grep -Eo '^[^=]+' | grep -Ev '^(HOME|SHELL|USER|LOGNAME|PATH|IFS)$' | tr '\n' ',')" www-data -c "$cmd"
    exit $?
fi
