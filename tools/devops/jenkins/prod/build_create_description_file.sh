#!/bin/bash
echo "Logs : <a target=\"_blank\" href=\"https://logs.alltricks.sexy:5601/app/discover#/view/39472680-feea-11ed-8753-0d2aed619f48?_g=(filters:!(),time:(from:now-30d,to:now))&_a=(filters:!(),query:(language:kuery,query:'kubernetes.labels.jenkins-job:${JOB_NAME} AND kubernetes.labels.jenkins-build:${BUILD_NUMBER}'))\">ELK</a><br/>" > build-descr.txt
echo "Script : ${commands:--}" | sed '/^[[:space:]]*$/d' | head -n 3 | sed 's#$#<br/>#g' | sed -E 's#\$[a-z0-9{]#$$#gi' >> build-descr.txt
