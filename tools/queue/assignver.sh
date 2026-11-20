#!/usr/bin/env bash
# Bring a Code.gs PR up to date with main and assign its sheet script VERSION (rule D3), then push and ask Codex.
# Settles only the version files (Code.gs, HISTORY.md: main's side, then sync_core --fix) and the decisions index;
# any other conflict aborts ("needs a hand"). Usage: bash assignver.sh PR_NUMBER
# The commit carries the trailers in $QUEUE_TRAILERS (e.g. "Co-Authored-By: ...<newline>Claude-Session: ..."); unset, none.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
n=$1
cd "$REPO_DIR" || exit 1
ref=$(gh api $R/pulls/$n --jq .head.ref)
git fetch -q origin main "$ref" || exit 1
wt=$(git worktree list --porcelain | awk -v b="refs/heads/$ref" '/^worktree /{w=$2} $0=="branch "b{print w}')
if [ -z "$wt" ]; then wt=.claude/worktrees/av$n; git worktree add -q "$wt" -B "$ref" "origin/$ref" || exit 1; fi
cd "$wt" || exit 1
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then echo "#$n: $wt has local changes, left alone"; exit 1; fi
git merge -q --ff-only "origin/$ref" 2>/dev/null
if ! git merge-base --is-ancestor origin/main HEAD; then
  git merge -q --no-edit origin/main >/dev/null 2>&1
  for f in $(git diff --name-only --diff-filter=U); do
    case "$f" in
      tools/sync/Code.gs|tools/sync/HISTORY.md) git checkout -q --theirs "$f" ;;
      docs/decisions/README.md) git checkout -q --theirs "$f" ;;
      docs/ANSWERS.md) python3 -I "$Q/resolve_append.py" "$f" >/dev/null ;;
      *) echo "#$n: conflict in $f: needs a hand"; git merge --abort; exit 2 ;;
    esac
    git add "$f"
  done
  python3 tools/sync_core.py --fix >/dev/null && git add tools/sync/Code.gs
  [ -f tools/decisions_index.py ] && python3 tools/decisions_index.py --fix >/dev/null && git add -A docs/decisions/
  if [ -f "$(git rev-parse --git-dir)/MERGE_HEAD" ]; then git commit -q --no-edit || exit 1
  elif [ -n "$(git status --porcelain --untracked-files=no)" ]; then git commit -q -m "Code.gs: core.js copied after merging main" || exit 1; fi
fi
# The version files always start from main's (an auto-merge can fold an old entry into main's): the branch's changes
# file is brought back from history when an earlier assignment removed it.
cf=tools/sync/changes/$(echo "$ref" | tr '/' '-').md
if [ ! -f "$cf" ]; then c=$(git log --diff-filter=D --format=%h -1 -- "$cf"); [ -n "$c" ] && git show "$c^:$cf" > "$cf"; fi
if ! ls tools/sync/changes/*.md 2>/dev/null | grep -v README >/dev/null; then echo "#$n: no changes file: nothing to assign"; exit 3; fi
# HISTORY.md is main's; Code.gs keeps the branch's code with main's line 1 and VERSION (never main's whole file:
# that wiped #1285's code on 2026-11-20).
git checkout origin/main -- tools/sync/HISTORY.md
git show origin/main:tools/sync/Code.gs > "$QUEUE_DIR/main_Code.gs"
python3 -I "$Q/mainver.py" "$QUEUE_DIR/main_Code.gs" tools/sync/Code.gs >/dev/null || exit 1
python3 tools/sync_core.py --fix >/dev/null
out=$(python3 tools/sheet_version.py --assign 2>&1 | tail -1)
v=$(grep -o "^const VERSION = [0-9]*" tools/sync/Code.gs | grep -o "[0-9]*$")
git add -A tools/sync/Code.gs tools/sync/HISTORY.md tools/sync/changes
git add -u
if [ -n "$(git diff --cached --name-only)" ]; then
  if [ -n "${QUEUE_TRAILERS:-}" ]; then
    git commit -q -m "Sheet script v$v assigned at merge" -m "$QUEUE_TRAILERS" || exit 1
  else
    git commit -q -m "Sheet script v$v assigned at merge" || exit 1
  fi
fi
python3 tools/check_versions.py >/dev/null || { echo "#$n: check_versions failed after v$v, not pushed"; exit 2; }
python3 tools/sync_core.py --check >/dev/null || { echo "#$n: sync_core failed, not pushed"; exit 2; }
while train_running; do sleep 20; done
git push -q origin "HEAD:$ref" || exit 1
gh api -X POST $R/issues/$n/comments -F body=@"$Q/codex.md" >/dev/null
echo "#$n: v$v assigned, pushed $(git rev-parse --short HEAD)"
