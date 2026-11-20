#!/usr/bin/env bash
# Push a worktree's branch once no merge train runs. Usage: bash pushwait.sh WORKTREE BRANCH
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$1" || exit 1
while train_running; do sleep 15; done
git push -q -u origin "HEAD:$2" && echo "pushed $(git rev-parse --short HEAD)"
