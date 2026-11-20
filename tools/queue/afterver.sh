#!/usr/bin/env bash
# Run seqver.sh on the given Code.gs PRs once no queue wave, seqver.sh or chainq.sh run is going on.
# Usage: bash afterver.sh N [N...]
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
sleep 5
while running "nightq|seqver|chainq"; do sleep 30; done
echo "--- after-ver wave $(TZ=Asia/Manila date +%H:%M): $*" >> "$LOG"
bash "$Q/seqver.sh" "$@"
