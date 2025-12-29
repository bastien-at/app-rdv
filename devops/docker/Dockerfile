FROM europe-west1-docker.pkg.dev/avanis-infra-gke-dev/docker/node-22:1.2.1-prod

COPY ./backend /var/www/backend
COPY ./frontend /var/www/frontend
COPY ./*.js /var/www/
COPY ./*.json /var/www/
COPY ./devops/supervisor/* /etc/supervisor/conf.d/

RUN rm /etc/supervisor/conf.d/srv_nginx.conf; \
    npm install; \
    chown -R www-data:www-data /var/www;

USER root

ENTRYPOINT ["docker-entrypoint"]
