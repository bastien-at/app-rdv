FROM electronuserland/builder:wine

ENV DOCKER_HOME='/home/docker'
ENV TZ=Europe/Paris

# Create user context
RUN mkdir -p ${DOCKER_HOME} && \
    chmod 777 ${DOCKER_HOME} /etc/passwd /etc/group

# Copy config/bin files
COPY ./bin/docker-entrypoint.sh /usr/local/bin/docker-entrypoint

ENTRYPOINT ["docker-entrypoint"]
