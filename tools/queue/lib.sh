#!/usr/bin/env bash
# Shared settings of the queue scripts (sourced, never run). See tools/queue/README.md.
#   QUEUE_DIR       log and state directory, outside the repo (default ~/.cache/reefid-queue)
#   QUEUE_REPO      GitHub repository (default ppericard/coral-id-imr)
#   REPO_DIR        the main checkout the scripts work from (default: the checkout this folder belongs to)
#   QUEUE_TRAILERS  commit trailers for assignver.sh's commit (default: none)
Q=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
QUEUE_DIR=${QUEUE_DIR:-$HOME/.cache/reefid-queue}
mkdir -p "$QUEUE_DIR"
R=repos/${QUEUE_REPO:-ppericard/coral-id-imr}
LOG=$QUEUE_DIR/nightq.log
if [ -z "${REPO_DIR:-}" ]; then
  gc=$(git -C "$Q" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
  REPO_DIR=$(dirname "$gc")
fi
# running NAME|NAME...: is a queue script of that name running? (matches the bash process, never a waiter's own line)
running() { pgrep -f "^bash (.*/)?($1)\.sh" >/dev/null; }
# train_running: is a merge train running?
train_running() { pgrep -f "^python3 tools/train.py" >/dev/null; }
