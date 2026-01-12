ARG ELASTIC_VERSION

# https://www.docker.elastic.co/
FROM docker.elastic.co/logstash/logstash:${ELASTIC_VERSION:-9.0.4}

# Allow TLSv1 et TLSv1.1 to java.security
RUN sed -i 's/, *TLSv1\.1//g; s/, *TLSv1//g' /usr/share/logstash/jdk/conf/security/java.security

# Add your logstash plugins setup here
RUN logstash-plugin install logstash-integration-jdbc

COPY --chown=logstash:root ./mssql-jdbc-12.10.0.jre11.jar /usr/share/logstash/logstash-core/lib/jars/mssql-jdbc-12.10.0.jre11.jar
COPY --chown=logstash:root ./mysql-connector-j-8.0.33.jar /usr/share/logstash/logstash-core/lib/jars/mysql-connector-j-8.0.33.jar
