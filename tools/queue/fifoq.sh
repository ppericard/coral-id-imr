#!/usr/bin/env bash
# The merge queue's waiters in arrival order (REE-220): wait for the turn, then run nightq.sh on the given PRs. The turn
# is: no train running, no other queue script running (nightq, seqver, chainq, afterver), and no fifoq.sh started
# earlier still alive. So waves never race on main ("main moved": the trains of #1478 and #1474, 2026-11-23), and the
# oldest wave goes first. nightq.sh does the gates, the security ask, the pinned head and the trains.
# Usage: bash fifoq.sh N [N...]   (log: $QUEUE_DIR/nightq.log; tickets: $QUEUE_DIR/fifoq.tickets)
# TURN_POLL seconds between turn checks (default 30; the tests lower it).
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
TURN_POLL=${TURN_POLL:-30}
TICKETS=$QUEUE_DIR/fifoq.tickets
log() { echo "$(TZ=Asia/Manila date +%H:%M) $*" | tee -a "$LOG"; }

# start_of PID: that process's start time ("" when it does not run). A ticket names a pid and its start, so a pid that
# wrapped to another process never keeps a dead queue's place.
start_of() { ps -o lstart= -p "$1" 2>/dev/null | tr -s ' '; }
# ticket_new: this queue's place, named by arrival (epoch nanoseconds, then pid). The ticket is written whole to a hidden
# file and published by one rename, named at that moment: another waiter never sees it empty (and drops it as dead).
ticket_new() {
  local tmp t
  mkdir -p "$TICKETS" || return 1
  tmp=$TICKETS/.new.$$
  start_of $$ > "$tmp" && [ -s "$tmp" ] || { rm -f "$tmp"; return 1; }
  t=$TICKETS/$(date +%s%N).$$
  mv "$tmp" "$t" && echo "$t"
}
# ticket_alive FILE: does the process the ticket names still run, started when the ticket says?
ticket_alive() {
  local pid=${1##*.} s
  s=$(start_of "$pid")
  [ -n "$s" ] && [ "$s" = "$(cat "$1" 2>/dev/null)" ]
}
# ticket_older MINE: is a live ticket older than MINE? (arrival order, never process ids or ages: ids wrap and ages
# tie; a dead queue's ticket is removed)
ticket_older() {
  local f
  for f in "$TICKETS"/*; do
    [ -e "$f" ] || continue
    [ "${f##*/}" \< "${1##*/}" ] || continue
    if ticket_alive "$f"; then return 0; fi
    rm -f "$f"
  done
  return 1
}
# its_turn MINE: no train, no other queue script, no earlier ticket
its_turn() { ! train_running && ! running "nightq|seqver|chainq|afterver" && ! ticket_older "$1"; }

fifoq() {
  local n
  [ $# -gt 0 ] || { echo "usage: bash fifoq.sh N [N...]" >&2; return 2; }
  for n in "$@"; do case "$n" in '' | *[!0-9]*) echo "not a PR number: $n" >&2; return 2;; esac; done
  cd "$REPO_DIR" || return 1
  TICKET=$(ticket_new) || { log "fifoq: cannot write $TICKETS"; return 1; }
  trap 'rm -f "$TICKET"' EXIT
  log "--- fifo wave queued $*: ticket ${TICKET##*/}"
  until its_turn "$TICKET"; do sleep "$TURN_POLL"; done
  log "--- fifo wave $*: its turn"
  bash "$Q/nightq.sh" "$@"
}

# run when executed, not when sourced (the tests source it)
if [ "${BASH_SOURCE[0]}" = "$0" ]; then fifoq "$@"; exit $?; fi
