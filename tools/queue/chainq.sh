#!/usr/bin/env bash
# Run nightq.sh on the given PRs once every running nightq.sh wave has finished.
# Usage: bash chainq.sh N [N...]
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
sleep 5
while running nightq; do sleep 30; done
echo "--- chained wave $(TZ=Asia/Manila date +%H:%M): $*" >> "$LOG"
bash "$Q/nightq.sh" "$@"
