#!/usr/bin/env bash
# The merge queue, one PR at a time: bring it up to date (uptodate.sh), wait for every check, Codex's receipt and
# Codex's completed security review on the head (full SHA), then a train of that PR alone. A PR that cannot be updated alone, goes red, or gets a Codex
# finding is skipped and logged for the integrator. Never re-runs a train (rule W23).
# Usage: bash nightq.sh N [N...]   (log: $QUEUE_DIR/nightq.log)
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
log() { echo "$(TZ=Asia/Manila date +%H:%M) $*" | tee -a "$LOG"; }
# Codex's security review from a prstate line: "<state> <full sha>" (secreview.py), read from the first field that starts
# with "security@head: " (the line ends with the PR's own "Choices I made" text, which could imitate the field)
security_of() { echo "$1" | awk -F' [|] ' '{for (i = 1; i <= NF; i++) if (index($i, "security@head: ") == 1) {print substr($i, 16); exit}}'; }
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
  asked=""
  while [ $i -lt 60 ]; do
    i=$((i + 1))
    line=$(bash "$Q/prstate.sh" "$n")
    pend=$(echo "$line" | sed -n 's/.* \([0-9]*\) pending.*/\1/p')
    codex=$(echo "$line" | sed -n 's/.*codex@head: \([^|]*\) |.*/\1/p')
    sec=$(security_of "$line")
    echo "$(TZ=Asia/Manila date +%H:%M) #$n wait $i pend=$pend codex=$codex security=$sec" >> "$QUEUE_DIR/nightq.debug"
    # the security review settled (completed, findings or failed); running, absent, stale and "?" are waited for
    case "${sec%% *}" in completed|findings|failed:*) secdone=1;; *) secdone=0;; esac
    # Codex reviews security by itself only when a PR opens: a later head (an agent's push, uptodate.sh's merge of
    # main, a VERSION assign) gets none unless asked. Ask once per head, once its checks are done (REE-232).
    case "${sec%% *}" in stale|absent)
      if [ "$pend" = "0" ] && [ "$asked" != "${sec#* }" ]; then
        gh api -X POST $R/issues/$n/comments -F body=@"$Q/codex-security.md" >/dev/null &&
          asked=${sec#* } && log "#$n: asked Codex for a security review of ${asked:0:7}"
      fi;;
    esac
    if [ "$pend" = "0" ] && [ "$codex" != "none" ] && [ "$codex" != "summary" ] && [ $secdone = 1 ]; then break; fi
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
  # the receipt field only, never the whole line (a PR's own text could carry the phrase)
  codex=$(echo "$line" | sed -n 's/.*codex@head: \([^|]*\) |.*/\1/p')
  case "$codex" in "Didn't find any major issues"*) ;; *) log "#$n: SKIPPED (Codex not clean on head)"; continue;; esac
  # Codex's security review completed for the exact full head (merge contract; REE-232): running, absent, done on
  # another commit, failed, with findings or unreadable is not ready, and no findings is no proof it finished
  sec=$(security_of "$line")
  secsha=${sec#* }
  case "$sec" in "completed "*) ;; *) log "#$n: SKIPPED (Codex security review not completed on the head: ${sec:-?})"; continue;; esac
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
  # the security review must be for this very head, full SHA (not a prefix)
  if [ "$cur" != "$secsha" ]; then log "#$n: SKIPPED (the security review read is not for head $cur)"; continue; fi
  out=$(TRAIN_REPO="$QUEUE_REPO_NAME" python3 tools/train.py "$n" 2>&1 | tail -4)
  log "#$n train: $(echo "$out" | tr '\n' ' ')"
done
log "queue done"
