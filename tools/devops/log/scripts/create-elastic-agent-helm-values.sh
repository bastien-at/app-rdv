#!/usr/bin/env bash

# Run this script from a machine with helm and granted privileges to connect to GKE Cluster

set -ex;

mode="${1:-display}";
app="${2:-}";
env="${3:-}";

if ! command -v envsubst &> /dev/null; then
    echo "envsubst could not be found.";
    exit 1;
fi

if ! command -v helm &> /dev/null; then
    echo "helm could not be found.";
    exit 2;
fi

if [ "$mode" = "apply" ] && ! command -v kubectl &> /dev/null; then
    echo "kubectl could not be found.";
    exit 2;
fi

path="$(cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P)";
helm_path=$(realpath "$path/../kubernetes/helm")

test -f "$path/../.env" && export $(grep -v '^#' "$path/../.env" | xargs);

temp_file=$(mktemp);
temp_helm_file=$(mktemp);

trap "rm -f $temp_file $temp_helm_file" 0 2 3 15;

helm_value_project_file="$helm_path/values.${app}.${env}.yaml"
if [[ ! -f "$helm_value_project_file" ]]; then
    echo "${helm_value_project_file} does not exists.";
    exit 1;
fi

cd "$helm_path";

helm template --namespace "${K8S_NAMESPACE}" -f "$helm_path/charts/elastic-agent/values.yaml" -f "$helm_value_project_file" . > "$temp_helm_file" ;

envsubst $(env | grep -P ".+=" | grep -Po "^[A-Z0-9_]+" | sed -E 's#^(.+)$#\\\$\1#' | tr '\n' ',' | rev | cut -c 2- | rev) < "$temp_helm_file" > "$temp_file";

cat "$temp_file";

if [ "$mode" = "apply" ]; then
  kubectl apply -f "$temp_file" --namespace="${K8S_NAMESPACE}";
fi
