#!/usr/bin/env bash
# Code.gs PRs one after another: for each, once no queue wave runs, assign its sheet version on the current main
# (assignver.sh), then run its own wave (nightq.sh). A PR whose assignment fails is logged and skipped.
# Usage: bash seqver.sh N [N...]
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
for n in "$@"; do
  sleep 5
  while running nightq; do sleep 30; done
  st=$(gh api $R/pulls/$n --jq .state)
  [ "$st" != "open" ] && { echo "$(TZ=Asia/Manila date +%H:%M) #$n: $st, skipped (seqver)" >> "$LOG"; continue; }
  out=$(bash "$Q/assignver.sh" "$n" 2>&1 | tail -1)
  echo "$(TZ=Asia/Manila date +%H:%M) #$n assignver: $out" >> "$LOG"
  case "$out" in *"assigned, pushed"*|*"nothing to assign"*) bash "$Q/nightq.sh" "$n" ;; *) echo "$(TZ=Asia/Manila date +%H:%M) #$n: SKIPPED (version step needs a hand)" >> "$LOG" ;; esac
done
