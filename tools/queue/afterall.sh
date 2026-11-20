#!/usr/bin/env bash
# Run nightq.sh on the given PRs once nothing else of the queue runs or waits (nightq, seqver, chainq, afterver):
# it lets the Code.gs version queue go first.
# Usage: bash afterall.sh N [N...]
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
sleep 5
while running "nightq|seqver|chainq|afterver"; do sleep 30; done
echo "--- after-all wave $(TZ=Asia/Manila date +%H:%M): $*" >> "$LOG"
bash "$Q/nightq.sh" "$@"
