#!/bin/bash
set -e

source <(ls -v -1 /docker-entrypoint.d/* | xargs cat)