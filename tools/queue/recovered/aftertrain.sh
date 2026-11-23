#!/bin/bash
# Wait until no tools/train.py runs, then dry-run and train the given PRs together, retrying when main moved.
# Usage: bash aftertrain.sh N [N...]   (run from the main checkout)
cd /home/user/coral-id-imr || exit 1
sleep 15
while pgrep -f "tools/train.py" >/dev/null; do sleep 30; done
echo "--- dry run $(TZ=Asia/Manila date +%H:%M): $*"
python3 tools/train.py --dry-run "$@" 2>&1 | tail -15 | cut -c1-220
for i in 1 2 3 4; do
  out=$(python3 tools/train.py "$@" 2>&1)
  echo "$out" | tail -12 | cut -c1-220
  echo "$out" | grep -q "it moved, try again\|main moved" || break
  echo "--- retry $i"; sleep 20
done
