#!/usr/bin/env bash
# The merge queue, one PR at a time: bring it up to date (uptodate.sh), wait for every check and Codex's
# receipt on the head, then a train of that PR alone. A PR that cannot be updated alone, goes red, or gets a Codex
# finding is skipped and logged for the integrator. Never re-runs a train (rule W23).
# Usage: bash nightq.sh N [N...]   (log: $QUEUE_DIR/nightq.log)
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
log() { echo "$(TZ=Asia/Manila date +%H:%M) $*" | tee -a "$LOG"; }
cd "$REPO_DIR" || exit 1
for n in "$@"; do
  # wait for any running train (never the waiter's own line: match the python process)
  while train_running; do sleep 30; done
  state=$(gh api $R/pulls/$n --jq .state)
  if [ "$state" != "open" ]; then log "#$n: $state, skipped"; continue; fi
  up=$(bash "$Q/uptodate.sh" "$n" 2>&1 | tail -1)
  log "#$n: $up"
  case "$up" in *"needs a hand"*|*"local changes"*) log "#$n: SKIPPED (update needs a hand)"; continue;; esac
  # wait for checks (max ~40 min) and Codex's receipt on the head (max ~30 min more)
  sleep 60
  bash "$Q/wait_ready.sh" "$n" >/dev/null 2>&1
  i=0
  sm=0
  while [ $i -lt 60 ]; do
    i=$((i + 1))
    line=$(bash "$Q/prstate.sh" "$n")
    pend=$(echo "$line" | sed -n 's/.* \([0-9]*\) pending.*/\1/p')
    codex=$(echo "$line" | sed -n 's/.*codex@head: \([^|]*\) |.*/\1/p')
    echo "$(TZ=Asia/Manila date +%H:%M) #$n wait $i pend=$pend codex=$codex" >> "$QUEUE_DIR/nightq.debug"
    if [ "$pend" = "0" ] && [ "$codex" != "none" ] && [ "$codex" != "summary" ]; then break; fi
    # a findings receipt ("summary") on the head is Codex's answer: give it 3 minutes, then go on
    if [ "$pend" = "0" ] && [ "$codex" = "summary" ]; then
      sm=$((sm + 1))
      [ $sm -ge 6 ] && break
    fi
    sleep 30
  done
  line=$(bash "$Q/prstate.sh" "$n")
  log "$line"
  failed=$(echo "$line" | sed -n 's/.*pending, \([^|]*\) failed.*/\1/p' | tr -d ' ')
  if [ -n "$failed" ]; then log "#$n: SKIPPED (red on head: $failed)"; continue; fi
  case "$line" in *"Didn't find any major issues"*) ;; *) log "#$n: SKIPPED (Codex not clean on head)"; continue;; esac
  case "$line" in *"open threads: 0 |"*) ;; *) log "#$n: SKIPPED (open threads)"; continue;; esac
  # a finding on the head can exist before its thread does, and a security bot's comment is no thread: both count
  # like a Codex finding (merge contract); "?" (unreadable) skips too
  case "$line" in *"unanswered@head: 0 |"*) ;; *) log "#$n: SKIPPED (findings or security comments on the head, not answered)"; continue;; esac
  # a pending changes entry, as train.py and sheet_version.py count one: any file there but the folder's README
  if git -C "$REPO_DIR" diff --name-only --diff-filter=AM origin/main...origin/$(gh api $R/pulls/$n --jq .head.ref) 2>/dev/null |
    grep '^tools/sync/changes/' | grep -qv '/README\.md$'; then
    log "#$n: SKIPPED (needs a VERSION assign)"; continue
  fi
  git pull -q
  # the head the gates above read (prstate's short sha) must still be the PR's head; train.py pins only the head it
  # fetches itself (follow-up in README: pass the validated SHA into the train)
  cur=$(gh api $R/pulls/$n --jq .head.sha)
  case "$cur" in "$(echo "$line" | awk '{print $3}')"*) ;; *) log "#$n: SKIPPED (head moved since the gates were read)"; continue;; esac
  out=$(TRAIN_REPO="$QUEUE_REPO_NAME" python3 tools/train.py "$n" 2>&1 | tail -4)
  log "#$n train: $(echo "$out" | tr '\n' ' ')"
done
log "queue done"
