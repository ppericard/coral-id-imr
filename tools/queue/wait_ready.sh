#!/usr/bin/env bash
# Wait until every check run on each PR's head has completed (max ~25 min), then print the PR state lines.
# Usage: bash wait_ready.sh N [N...]
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
for i in $(seq 1 75); do
  busy=0
  for n in "$@"; do
    sha=$(gh api $R/pulls/$n --jq .head.sha)
    p=$(gh api "$R/commits/$sha/check-runs?per_page=100" --jq '[.check_runs[]|select(.status!="completed")]|length')
    [ "$p" != "0" ] && busy=1
  done
  [ $busy = 0 ] && break
  sleep 20
done
bash "$Q/prstate.sh" "$@"
