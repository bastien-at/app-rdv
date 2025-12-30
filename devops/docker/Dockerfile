FROM europe-west1-docker.pkg.dev/avanis-infra-gke-dev/docker/node-22:1.2.1-prod

COPY ./backend /var/www/backend
COPY ./frontend /var/www/frontend
COPY ./*.js /var/www/
COPY ./*.json /var/www/
COPY ./devops/supervisor/* /etc/supervisor/conf.d/

RUN rm /etc/supervisor/conf.d/srv_nginx.conf; \
    cd /var/www && npm install;

ENV AUTOSTART_APPS=true

ENTRYPOINT ["docker-entrypoint"]
