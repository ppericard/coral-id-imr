#!/usr/bin/env bash
# PR state line for the integrator: head, checks, Codex receipt on head, Codex's security review for the full head
# (secreview.py), unresolved threads, findings and security comments on the head nobody answered (headfind.py; "?"
# when they could not be read), Choices I made.
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
  ok=1  # any page that could not be read leaves unanswered@head at "?", which nightq.sh treats as not clean
  iok=1
  gh api --paginate "$R/issues/$n/comments?per_page=100" > "$d/issue.json" 2>/dev/null || { ok=0; iok=0; }
  # Codex's security review for the exact full head (secreview.py): "<state> <sha>"; nightq.sh trains only on
  # "completed" for the head it is about to train, so unread comments leave "?" (REE-232)
  sec="? $sha"
  if [ $iok = 1 ]; then sec=$(python3 -I "$Q/secreview.py" "$sha" "$d/issue.json" 2>/dev/null | head -1); fi
  # Codex's receipt on the head: its "Codex Review: ..." line; "summary" for its comment on the head without one (a
  # findings summary); "none". Codex may signal a clean review only through its summary's review-state marker and a 👍
  # (REE-344): with no receipt line ("summary" or "none"), the latest marker of the Codex bot is the clean receipt only
  # when its code review is completed for this full head, has_any_findings and has_unresolved_findings both false.
  # Anything else (another commit, findings true or null, running, unreadable, the marker twice) keeps today's value,
  # which nightq.sh skips. The marker's braces can come HTML-escaped, as secreview.py reads them.
  codex=$(jq -rs --arg short "$short" --arg sha "$sha" --arg clean "Didn't find any major issues (codex-review-state:v1)" '
    def unesc: gsub("&#(?<n>[0-9]+);"; [.n|tonumber]|implode) | gsub("&quot;"; "\"") | gsub("&lt;"; "<") | gsub("&gt;"; ">") | gsub("&amp;"; "&");
    def clean($sha): (.body // "" | unesc) as $b
      | [$b|match("<!--\\s*codex-review-state:v1\\s+(\\{[\\s\\S]*?\\})\\s*-->"; "g")] as $m
      | if ($m|length) != 1 or ($b|indices("codex-review-state:v1")|length) != 1 then false
        else ($m[0].captures[0].string|fromjson|.code_review) as $r
          | ($r|type) == "object" and $r.status == "completed" and $r.commit_sha == $sha
            and $r.has_any_findings == false and $r.has_unresolved_findings == false end;
    (add // []) | [.[]|select(.user.login=="chatgpt-codex-connector[bot]" and .user.type=="Bot")] as $bot
    | ([$bot[]|select(.body|test($short))|.body|capture("Codex Review: (?<v>[^\\n]*)").v // "summary"]|last // "none") as $text
    | if $text == "summary" or $text == "none" then
        (try ([$bot[]|select(.body // "" | contains("codex-review-state:v1"))]|sort_by(.updated_at // .created_at // "")|last|clean($sha)) catch false) as $ok
        | if $ok == true then $clean else $text end
      else $text end' "$d/issue.json" 2>/dev/null || echo none)
  gh api --paginate "$R/pulls/$n/comments?per_page=100" > "$d/review.json" 2>/dev/null || ok=0
  rc=$(jq -rs --arg sha "$sha" '(add // []) | [.[]|select(.commit_id==$sha)]|length' "$d/review.json" 2>/dev/null || echo "?")
  gh api $R/pulls/$n/ccr/review_threads > "$d/threads.json" 2>/dev/null || ok=0
  th=$(jq -r '[.[]|select(.resolved==false)]|length' "$d/threads.json" 2>/dev/null || echo "?")
  hd=$(gh api $R/commits/$sha --jq .commit.committer.date 2>/dev/null) || ok=0
  [ -n "$hd" ] || ok=0
  un="?"
  if [ $ok = 1 ]; then un=$(python3 -I "$Q/headfind.py" "$sha" "$hd" "$d/review.json" "$d/threads.json" "$d/issue.json" 2>/dev/null | head -1); fi
  ch=$(echo "$j" | jq -r '.body' | awk '/^## Choices I made/{f=1;next} /^## /{f=0} f' | grep -v '^\s*$' | head -1 | cut -c1-50)
  echo "#$n $st ${sha:0:7} merge=$ms [$labels] checks: $checks | codex@head: $codex | security@head: ${sec:-? $sha} | head comments: $rc | open threads: $th | unanswered@head: ${un:-?} | choices: ${ch:-<empty>}"
done
