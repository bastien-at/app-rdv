#!/bin/bash

# Vars
common_script_dir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
job=""
pod=""
main_container="${main_container:-php}"
main_container_position="${main_container_position:-0}"

# Colors
function echored { echo -e "\033[1;31m$1\033[0m"; }
function echoblue { echo -e "\033[1;34m$1\033[0m"; }
function echogreen { echo -e "\033[1;32m$1\033[0m"; }
function echoyellow { echo -e "\033[1;33m$1\033[0m"; }
function echocyan { echo -e "\033[1;36m$1\033[0m"; }
function echopurple { echo -e "\033[1;35m$1\033[0m"; }

# Function call on script exit
_error() {
  exit_code=$?
  echoblue ""
  echoblue "Execution exit code is : $exit_code"
}


# Run command with retry method
_cmd_retry() {
  exit_on_error_enabled=0
  if echo $- | grep "e"; then
    exit_on_error_enabled=1
  fi
  set +e

  local logs result first_end_time
  local regex_retry="(connection refused)|(connection reset by peer)|(The connection to the server .+ was refused)|(Unable to connect to the server)|(You must be logged in to the server)|(Request had insufficient authentication scopes)"
  local regex_not_found="(Error from server \(NotFound\): .+ not found)"
  local regex_check_pod_gone_away="(Error from server \(NotFound\): pods .+ not found)"

  "$@" >retry_stdout 2>retry_stderr
  result=$?
  logs=$(cat retry_stdout retry_stderr)

  if [[ $logs =~ $regex_check_pod_gone_away ]]; then
    echoyellow "Pod gone away, check if a new one start and execute command again..."
  	_get_pod_name
    "$@" >retry_stdout 2>retry_stderr
    result=$?
    logs=$(cat retry_stdout retry_stderr)
  fi

  first_end_time=$(date +%s)
  while [[ "$result" != "0" ]] && (([[ $logs =~ $regex_retry ]] && [[ $(( $(date +%s)-first_end_time )) -le 600 ]]) || ([[ $logs =~ $regex_not_found ]] && [[ $(( $(date +%s)-first_end_time )) -le 60 ]])) && sleep 10; do
    "$@" >retry_stdout 2>retry_stderr
    result=$?
    logs=$(cat retry_stdout retry_stderr)
  done

  if [[ "$exit_on_error_enabled" = "1" ]]; then
    set -e
  fi
  cat retry_stdout
  cat retry_stderr >&2

  return $result
}

# Get pod name from job name
_get_pod_name() {
  if [[ "$pod" = "" ]]; then
    pod=$(_cmd_retry kubectl get -n ${kube_namespace} pods --selector=job-name=${job} --output=jsonpath='{.items[*].metadata.name}')
    if [[ "$pod" = "" ]]; then
      echored "No pod name found"
      exit 1
    fi
    echoblue "Pod name : ${pod}"
  fi
}


# Init
trap "_error" EXIT
set -e
set -x


# Gcloud auth
export KUBECONFIG=kube.conf
_cmd_retry gcloud container clusters get-credentials ${gcp_cluster} \
  --zone europe-west1-b --project ${gcp_project} --account jenkins-compute-prod@avanis-infra-gke.iam.gserviceaccount.com


# Build full yaml
cat job.yaml > full.yaml
[ -f containers.sh ] && sed -e "s#^#        #" containers.sh >> full.yaml
[ -f commands.sh ] && sed -e "s#^#              #" commands.sh >> full.yaml


# Logs
job_start_time=$(date +%s)
## ELK
echo -n '{"log_source":"jenkins","message":"Start '${JOB_NAME}'","job":"'${JOB_NAME}'","state":"start","build":"'${BUILD_URL}'"}' | nc -4u -w1 localhost 8085


# Create job
ret=$(_cmd_retry kubectl create -n ${kube_namespace} -f full.yaml)
echoblue "Kube result : ${ret}"


# Get job name
job=$(echo "${ret}" | grep -Po '(?<=job.batch.)([^ ]+)(?= created)')
if [[ "$job" = "" ]]; then
  echored "No job name found"
  exit 1
fi
echoblue "Job name : ${job}"

# Wait, get exit code, retry if needed and display logs
set +e
exit=0
_wait_job_ending() {
  # Wait job end (kubectl timeout option not work every time so add a bash timeout too)
  echoblue "Wait job is active..."
  _cmd_retry timeout 6m kubectl -n ${kube_namespace} wait job/${job} --for=jsonpath='{.status.active}'=1 --timeout=5m
  _get_pod_name
  echoblue "Wait main container is terminated..."
  timeout 65m kubectl -n ${kube_namespace} wait pod/${pod} --for=jsonpath='{.status.containerStatuses['${main_container_position}'].state.terminated}' --timeout=60m

  # Get exit code
  exit=$(_cmd_retry kubectl get -n ${kube_namespace} pod -o jsonpath="{.status.containerStatuses[${main_container_position}].state.terminated.exitCode}" ${pod} | tee)

  # If no exit code after that, check if status is active and rewait
  if [[ "" = "$exit" ]]; then
  	echored "Wait finished but no exit code retrieved..."
    active=$(_cmd_retry kubectl get -n ${kube_namespace} jobs ${job} -o jsonpath='{.status.active}')
    if [[ "$active" = "1" ]]; then
      echoblue "Main container seems to be always active, continue to wait..."
      _wait_job_ending
    else
      echoblue "Main container seems to be finished, try to get exit code..."
      exit=$(_cmd_retry kubectl get -n ${kube_namespace} pod -o jsonpath="{.status.containerStatuses[${main_container_position}].state.terminated.exitCode}" ${pod} | tee)
      if [[ "" = "$exit" ]]; then
        echored "No exit code found"
        exit=1
      fi
    fi
  else
  	echoblue "Main container finished with exit code ${exit}"
  fi
}

set +x
echoblue "\n\n"
echoblue "Logs ELK (copy url, click not work) : \"https://logs.alltricks.sexy:5601/app/discover#/view/39472680-feea-11ed-8753-0d2aed619f48?_g=(filters:!(),time:(from:now-30d,to:now))&_a=(filters:!(),query:(language:kuery,query:'kubernetes.labels.jenkins-job:${JOB_NAME} AND kubernetes.labels.jenkins-build:${BUILD_NUMBER}'))\""

echoblue "\nExecution pending, wait main container ending..."
set -x
_wait_job_ending

echoblue "Wait job marked as completed..."
if [[ "${exit}" != "0" ]]; then
  timeout 6m kubectl -n ${kube_namespace} wait jobs/${job} --for=condition=Failed=True --timeout=5m
else
  timeout 6m kubectl -n ${kube_namespace} wait jobs/${job} --for=condition=Complete=True --timeout=5m
fi

set +x
echoblue "\n\n"
echoblue "Logs ELK (copy url, click not work) : \"https://logs.alltricks.sexy:5601/app/discover#/view/39472680-feea-11ed-8753-0d2aed619f48?_g=(filters:!(),time:(from:now-30d,to:now))&_a=(filters:!(),query:(language:kuery,query:'kubernetes.labels.jenkins-job:${JOB_NAME} AND kubernetes.labels.jenkins-build:${BUILD_NUMBER}'))\""

exit $exit
