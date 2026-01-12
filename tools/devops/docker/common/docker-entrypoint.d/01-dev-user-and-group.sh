if [[ "$PHYSICAL_ENV" = "dev" ]]; then
    (test -n "$USER_ID" || (echo '\e[31mUSER_ID is not defined..."\e[0m' && exit 8))
    (test -n "$GROUP_ID" || (echo '\e[31mGROUP_ID is not defined..."\e[0m' && exit 8))

    # I don't why, but sometimes, on container creation usermod/groupmod log etc files for a very long time, so try to use sed..
    #usermod -u $USER_ID -s /bin/bash -d $DOCKER_HOME www-data
    #groupmod -g $GROUP_ID www-data
    sed -i -E "s#^(www-data:[^:]*):([^:]*):([^:]*):([^:]*):([^:]*):/usr/sbin/nologin\$#\1:$USER_ID:$GROUP_ID:\4:$DOCKER_HOME:/bin/bash#" /etc/passwd
    sed -i -E "s#^(www-data:[^:]*):.+:\$#\1:$GROUP_ID:#" /etc/group
fi
