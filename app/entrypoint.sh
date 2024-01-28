#!/usr/bin/env bash

set -eEuo pipefail

case "$1" in
  start)
    exec npm run start
    ;;
  test)
    exec npm run test
    ;;
  hang)
    exec tail -f /dev/null
  ;;
esac
