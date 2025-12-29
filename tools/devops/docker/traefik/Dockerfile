FROM traefik:3.6.1

COPY traefik.yml /etc/traefik/traefik.yml

ENV TZ=Europe/Paris

COPY docker-entrypoint /usr/local/bin/docker-entrypoint

ENTRYPOINT ["docker-entrypoint"]
CMD ["traefik"]
