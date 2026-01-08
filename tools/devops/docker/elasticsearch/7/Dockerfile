FROM elasticsearch:7.17.21 AS gcs

USER root

RUN bin/elasticsearch-plugin install --batch repository-gcs
RUN mkdir -p /etc/elasticsearch/gcs-keys && chown elasticsearch:root /etc/elasticsearch/gcs-keys

COPY docker-entrypoint.sh /usr/local/bin/custom-docker-entrypoint.sh

RUN chmod 0555 /usr/local/bin/custom-docker-entrypoint.sh

ENTRYPOINT ["/bin/tini", "--", "/usr/local/bin/custom-docker-entrypoint.sh"]

USER elasticsearch:root

#####################################################################################
#####################################################################################

FROM gcs AS gcs-dev

RUN chmod 777 /usr/share/elasticsearch/{config,logs,plugins}
