#!/usr/bin/env bash
# Shared settings of the queue scripts (sourced, never run). See tools/queue/README.md.
#   QUEUE_DIR       log and state directory, outside the repo (default ~/.cache/reefid-queue)
#   QUEUE_REPO      GitHub repository (default ppericard/coral-id-imr)
#   REPO_DIR        the main checkout the scripts work from (default: the checkout this folder belongs to)
#   QUEUE_TRAILERS  commit trailers for assignver.sh's commit (default: none)
Q=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
QUEUE_DIR=${QUEUE_DIR:-$HOME/.cache/reefid-queue}
mkdir -p "$QUEUE_DIR"
QUEUE_REPO_NAME=${QUEUE_REPO:-ppericard/coral-id-imr}
R=repos/$QUEUE_REPO_NAME
LOG=$QUEUE_DIR/nightq.log
if [ -z "${REPO_DIR:-}" ]; then
  gc=$(git -C "$Q" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
  REPO_DIR=$(dirname "$gc")
fi
# trusted_root WT: print a shadow root on which to run origin/main's reviewed tools over the PR checkout WT (an absolute
# path). A PR's own tools/*.py must never run with the queue's credentials (security review of #1315), the way the
# session hooks run main's tools/brief.py. tools/ is main's tree; every other top-level entry, and every data file
# under tools/ (not .py, .sh, .js), is a link to WT's, so a tool reads and writes the PR's data, never its code.
# Run its scripts as python3 -E "$T/tools/X.py" (a script run by path puts only its own folder on sys.path, never the
# cwd; -I would drop that folder too). Remove it with rm -rf (links are unlinked, never followed).
trusted_root() {
  local wt=$1 t p
  t=$(mktemp -d "$QUEUE_DIR/trusted.XXXXXX") || return 1
  # main's tools/ out of a throwaway index (git archive skips tools/: .gitattributes export-ignore)
  GIT_INDEX_FILE="$t.index" git -C "$wt" read-tree --prefix=tools/ origin/main:tools \
    && GIT_INDEX_FILE="$t.index" git -C "$wt" checkout-index -a --prefix="$t/" || { rm -rf "$t" "$t.index"; return 1; }
  rm -f "$t.index"
  while IFS= read -r p; do
    [ "$p" = tools ] || ln -sfn "$wt/$p" "$t/$p"
  done < <(git -C "$wt" ls-files | cut -d/ -f1 | sort -u)
  while IFS= read -r -d '' p; do
    case "$p" in *.py|*.sh|*.js|*.mjs|*.cjs) continue;; esac
    mkdir -p "$t/$(dirname "$p")"
    ln -sfn "$wt/$p" "$t/$p"
  done < <(git -C "$wt" ls-files -z -- tools)
  echo "$t"
}
# need_trusted: set T to the trusted root of the current directory (a PR checkout) once, removed when the script exits.
need_trusted() { [ -n "${T:-}" ] || { T=$(trusted_root "$PWD") || exit 1; trap 'rm -rf "$T"' EXIT; }; }
# running NAME|NAME...: is a queue script of that name running? (matches the bash process, never a waiter's own line)
running() { pgrep -f "^bash (.*/)?($1)\.sh" >/dev/null; }
# train_running: is a merge train running?
train_running() { pgrep -f "^python3 tools/train.py" >/dev/null; }
