#!/bin/bash
# Wait until each given PR has every check done and green and a clean Codex review on its head with no open
# thread (at most ~3 hours), then queue them as one train behind the earlier trains (trainnext.sh).
# Usage: bash readytrain.sh N [N...]   (from the main checkout)
cd /home/user/coral-id-imr || exit 1
S=/tmp/claude-0/-home-user-coral-id-imr/ea3574a7-6def-5bdd-aad6-789825693d57/scratchpad
ok() { bash tools/queue/prstate.sh "$1" | grep -q " 0 pending,  failed | codex@head: Didn't find.*open threads: 0 | unanswered@head: 0"; }
for i in $(seq 1 120); do
  all=1
  for n in "$@"; do ok "$n" || { all=0; break; }; done
  [ $all = 1 ] && break
  sleep 90
done
for n in "$@"; do bash tools/queue/prstate.sh "$n" | cut -c1-200; done
[ $all = 1 ] || { echo "not ready after the wait: nothing queued"; exit 0; }
bash "$S/trainnext.sh" "$@"
