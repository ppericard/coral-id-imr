#!/bin/bash
# FIFO grouped train: waits until each given PR is green with a clean Codex review and no open thread, then waits its
# turn behind every trainq.sh started earlier (by elapsed time, not pid: pids wrap) and while tools/train.py runs,
# then dry-runs and trains the PRs together, retrying when main moved.
# Usage: bash trainq.sh N [N...]   (from the main checkout)
cd /home/user/coral-id-imr || exit 1
ok() { bash tools/queue/prstate.sh "$1" | grep -q " 0 pending,  failed | codex@head: Didn't find.*open threads: 0 | unanswered@head: 0"; }
for i in $(seq 1 120); do
  all=1
  for n in "$@"; do ok "$n" || { all=0; break; }; done
  [ $all = 1 ] && break
  sleep 90
done
for n in "$@"; do bash tools/queue/prstate.sh "$n" | cut -c1-200; done
[ $all = 1 ] || { echo "not ready after the wait: nothing queued"; exit 0; }
me=$(ps -o etimes= -p $$ | tr -d ' ')
older() {
  for p in $(pgrep -f "^bash /tmp/claude-0/.*/scratchpad/trainq\.sh"); do
    [ "$p" = "$$" ] && continue
    e=$(ps -o etimes= -p "$p" 2>/dev/null | tr -d ' ')
    [ -n "$e" ] && [ "$e" -gt "$(ps -o etimes= -p $$ | tr -d ' ')" ] && { echo "$p"; return; }
  done
}
while pgrep -f "tools/train.py" >/dev/null || [ -n "$(older)" ]; do sleep 30; done
echo "--- dry run $(TZ=Asia/Manila date +%H:%M): $*"
python3 tools/train.py --dry-run "$@" 2>&1 | tail -15 | cut -c1-220
for i in 1 2 3 4; do
  out=$(python3 tools/train.py "$@" 2>&1)
  echo "$out" | tail -12 | cut -c1-220
  echo "$out" | grep -q "it moved, try again\|main moved" || break
  echo "--- retry $i"; sleep 20
done
