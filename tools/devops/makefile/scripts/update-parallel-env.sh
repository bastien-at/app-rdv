#!/bin/bash
set -e

echo "== Start refresh parallel app =="
DIR_IN_REPO=$(git rev-parse --show-prefix)
COMMIT=$(git rev-parse HEAD)
cd $(git rev-parse --show-toplevel)/../avanis-parallel-env
git reset --hard
git clean -fd
git fetch
git checkout $COMMIT
cd $DIR_IN_REPO
rm -rf var/cache/*
# Not use 1 as value to avoid recursive calls
USE_PARALLEL_ENV=2 make composer args='install --no-scripts'

echo "== End refresh parallel app =="
echo ""
