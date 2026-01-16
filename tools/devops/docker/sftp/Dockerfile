FROM debian:bookworm-slim

ENV SSH_USERS_COMMON_GROUP_ID=""

RUN apt-get update -yqq && apt-get install -yqq --no-install-recommends openssh-server mysecureshell

COPY ssh /etc/ssh/
COPY docker-entrypoint /usr/local/bin/docker-entrypoint
RUN mkdir -p /run/sshd && \
    chmod 4755 /usr/bin/mysecureshell

EXPOSE 22

ENTRYPOINT ["docker-entrypoint"]
