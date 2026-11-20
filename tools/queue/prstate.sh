#!/usr/bin/env bash
# PR state line for the integrator: head, checks, Codex receipt on head, unresolved threads, findings and security
# comments on the head nobody answered (headfind.py; "?" when they could not be read), Choices I made.
# Usage: bash prstate.sh N [N...]
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
d=$(mktemp -d "$QUEUE_DIR/prstate.XXXXXX") || exit 1
trap 'rm -rf "$d"' EXIT
for n in "$@"; do
  j=$(gh api $R/pulls/$n)
  sha=$(echo "$j" | jq -r .head.sha)
  st=$(echo "$j" | jq -r .state)
  ms=$(echo "$j" | jq -r .mergeable_state)
  labels=$(gh api $R/issues/$n --jq '[.labels[].name]|join(",")')
  checks=$(gh api "$R/commits/$sha/check-runs?per_page=100" --jq '[.check_runs[]] as $c | "\($c|length) runs, \([$c[]|select(.status!="completed")]|length) pending, \([$c[]|select(.conclusion=="failure" or .conclusion=="cancelled" or .conclusion=="timed_out")|.name]|join("+")) failed"')
  short=${sha:0:10}
  # every page of the issue comments (a receipt can sit past the first 100), then the latest one for this head
  gh api --paginate "$R/issues/$n/comments?per_page=100" > "$d/issue.json" 2>/dev/null
  codex=$(jq -rs --arg short "$short" '(add // []) | [.[]|select(.user.login|test("codex";"i"))|select(.body|test($short))|.body|capture("Codex Review: (?<v>[^\\n]*)").v // "summary"]|last // "none"' "$d/issue.json" 2>/dev/null || echo none)
  gh api --paginate "$R/pulls/$n/comments?per_page=100" > "$d/review.json" 2>/dev/null
  rc=$(jq -rs --arg sha "$sha" '(add // []) | [.[]|select(.commit_id==$sha)]|length' "$d/review.json" 2>/dev/null || echo "?")
  gh api $R/pulls/$n/ccr/review_threads > "$d/threads.json" 2>/dev/null
  th=$(jq -r '[.[]|select(.resolved==false)]|length' "$d/threads.json" 2>/dev/null || echo "?")
  hd=$(gh api $R/commits/$sha --jq .commit.committer.date 2>/dev/null)
  un=$(python3 -I "$Q/headfind.py" "$sha" "${hd:-9999}" "$d/review.json" "$d/threads.json" "$d/issue.json" 2>/dev/null | head -1)
  ch=$(echo "$j" | jq -r '.body' | awk '/^## Choices I made/{f=1;next} /^## /{f=0} f' | grep -v '^\s*$' | head -1 | cut -c1-50)
  echo "#$n $st ${sha:0:7} merge=$ms [$labels] checks: $checks | codex@head: $codex | head comments: $rc | open threads: $th | unanswered@head: ${un:-?} | choices: ${ch:-<empty>}"
done
