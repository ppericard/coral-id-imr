#!/bin/bash
# Queue a grouped train behind every earlier queued train: waits while tools/train.py runs or an older
# aftertrain.sh/trainnext.sh script is alive, then dry-runs and trains the given PRs, retrying when main moved.
# Usage: bash trainnext.sh N [N...]   (from the main checkout)
cd /home/user/coral-id-imr || exit 1
older() { pgrep -f "^bash /tmp/claude-0/.*/scratchpad/(aftertrain|trainnext)\.sh" | awk -v me=$$ '$1<me' | head -1; }
sleep 15
while pgrep -f "tools/train.py" >/dev/null || [ -n "$(older)" ]; do sleep 30; done
echo "--- dry run $(TZ=Asia/Manila date +%H:%M): $*"
python3 tools/train.py --dry-run "$@" 2>&1 | tail -15 | cut -c1-220
for i in 1 2 3 4; do
  out=$(python3 tools/train.py "$@" 2>&1)
  echo "$out" | tail -12 | cut -c1-220
  echo "$out" | grep -q "it moved, try again\|main moved" || break
  echo "--- retry $i"; sleep 20
done
