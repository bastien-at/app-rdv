#!/usr/bin/env bash

if [ -z "$1" ]; then
  echo "Usage: $0 <package_manager>"
  echo "Please specify 'composer' or 'npm' as the package manager."
  exit 1
fi

package_manager="$1"

# Vérifier si la valeur du package manager est 'composer' ou 'npm'
if [ "$package_manager" != "composer" ] && [ "$package_manager" != "npm" ]; then
  echo "Invalid package manager specified. Please use 'composer' or 'npm'."
  exit 1
fi

set -ex

parent_dir="${2:-$(git rev-parse --show-toplevel)}"
if [ -z "$parent_dir" ]; then
  echo "Parent directory not found"
  exit 1
fi

debug_dir="${parent_dir}/.autoupgrade"
rm -rf "$debug_dir"
mkdir -p "$debug_dir"

function implode() {
  local IFS="$1"
  shift
  echo "$*"
}

composer_install() {
  make composer args="install --quiet --no-interaction"
}

composer_outdated() {
  make composer args="outdated --no-interaction --direct --format json ${*}"
}

composer_require() {
  make composer args="require --no-interaction ${*}"
}

composer_require_no_update_specific_packages() {
  if [[ -n "${*}" ]]; then
    composer_require "--no-update ${*}"
  fi
}

composer_require_no_update_specific_packages_dev() {
  if [[ -n "${*}" ]]; then
    composer_require "--dev --no-update ${*}"
  fi
}

composer_update() {
  make composer args="update --no-interaction --no-scripts"
}

composer_upgrade() {
  make composer args="upgrade --no-interaction --no-scripts"
}

composer_show() {
  make composer args="show --format=json"
}

package_manager_composer() {
  local folder="$1"
  shift

  local app="$1"
  shift

  local ignore_upgrade_packages=("$@")
  local debug_file_prefix=$(echo "$folder" | sed 's#/#_#g')
  local outdated_packages_prod=$(mktemp "${debug_dir}/${debug_file_prefix}_outdated_packages_prod.XXXXXX")
  local outdated_packages_all=$(mktemp "${debug_dir}/${debug_file_prefix}_outdated_packages_all.XXXXXX")
  local outdated_packages_dev=$(mktemp "${debug_dir}/${debug_file_prefix}_outdated_packages_dev.XXXXXX")
  local initial_packages=$(mktemp "${debug_dir}/${debug_file_prefix}_initial_packages.XXXXXX")
  local final_packages=$(mktemp "${debug_dir}/${debug_file_prefix}_final_packages.XXXXXX")

  cd "$folder" >/dev/null 2>&1 || exit

  # Composer install
  composer_install

  # Initial packages
  composer_show | jq -r '.installed[] | "\(.name):\(.version)"' | sort > "$initial_packages"

  # Update
  composer_update

  # Collect outdated packages
  (composer_outdated "" \
    | jq -r '.installed | map(.name + ":^" + .latest) | .[]' \
    | grep -v -E "$(implode '|' "${ignore_upgrade_packages[@]}")" || true) \
    > "$outdated_packages_all"
  (composer_outdated "--no-dev" \
    | jq -r '.installed | map(.name + ":^" + .latest) | .[]' \
    | grep -v -E "$(implode '|' "${ignore_upgrade_packages[@]}")" || true) \
    > "$outdated_packages_prod"
  sort "$outdated_packages_all" "$outdated_packages_prod" \
    | uniq -u \
    > "$outdated_packages_dev"

  # Upgrade without install
  composer_require_no_update_specific_packages "$(cat "$outdated_packages_prod" | tr '\n' ' ')"
  composer_require_no_update_specific_packages_dev "$(cat "$outdated_packages_dev" | tr '\n' ' ')"

  # Remove cache
  rm -rf var/cache/*

  # Finally install all upgrade
  composer_upgrade

  # Final packages
  composer_show | jq -r '.installed[] | "\(.name):\(.version)"' | sort > "$final_packages"

  # Compare initial and final packages to generate report
  diff=$(comm -3 "$initial_packages" "$final_packages")
  if echo "$diff" | grep -q .; then
    {
      echo "Bumps $app with $(($(echo "$diff" | wc -l) / 2)) updates in the $folder directory:"
      echo "| Package | From | To |"
      echo "| --- | --- | --- |"

      echo "$diff" | while IFS=: read -r name initial_version; do
        if grep -q "^$name:" "$initial_packages"; then
          final_version=$(grep "^$name:" "$final_packages" | cut -d ':' -f 2)
          echo "| $name | \`$initial_version\` | \`$final_version\` |"
        fi
      done

      echo ""
    }
  fi

  cd - >/dev/null 2>&1
}

main() {
  local IFS
  declare -a autoupgrade_files

  while IFS= read -r file; do
    if jq -e --arg pm "$package_manager" '.["package-manager"] == $pm' "$file" > /dev/null; then
      priority=$(jq -e '.["priority"] // 50' "$file")
      autoupgrade_files+=( "$priority $file" )
    fi
  done < <(find "$parent_dir" -type f -name ".autoupgrade.json" -printf "%P\n")

  IFS=$'\n' sorted_autoupgrade_files=($(sort -nr <<<"${autoupgrade_files[*]}"))
  unset IFS

  for autoupgrade_file in "${sorted_autoupgrade_files[@]}"; do
    autoupgrade_file=$(echo "$autoupgrade_file" | awk '{print $2}')
    local folder=$(dirname "$autoupgrade_file")
    local app=$(jq -r '.app' "$autoupgrade_file")
    local ignore_upgrade_packages=( $(jq -r '.["ignore-upgrade-packages"] | .[]' "$autoupgrade_file") )

    if [[ "$package_manager" == "composer" ]]; then
      package_manager_composer "$folder" "$app" "${ignore_upgrade_packages[@]}"
    fi
  done
}

main