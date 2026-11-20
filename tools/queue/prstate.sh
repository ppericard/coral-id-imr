#!/usr/bin/env bash
# PR state line for the integrator: head, checks, Codex receipt on head, unresolved threads, Choices I made.
# Usage: bash prstate.sh N [N...]
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
for n in "$@"; do
  j=$(gh api $R/pulls/$n)
  sha=$(echo "$j" | jq -r .head.sha)
  st=$(echo "$j" | jq -r .state)
  ms=$(echo "$j" | jq -r .mergeable_state)
  labels=$(gh api $R/issues/$n --jq '[.labels[].name]|join(",")')
  checks=$(gh api "$R/commits/$sha/check-runs?per_page=100" --jq '[.check_runs[]] as $c | "\($c|length) runs, \([$c[]|select(.status!="completed")]|length) pending, \([$c[]|select(.conclusion=="failure" or .conclusion=="cancelled" or .conclusion=="timed_out")|.name]|join("+")) failed"')
  short=${sha:0:10}
  codex=$(gh api "$R/issues/$n/comments?per_page=100" --jq "[.[]|select(.user.login|test(\"codex\";\"i\"))|select(.body|test(\"$short\"))|.body|capture(\"Codex Review: (?<v>[^\\n]*)\").v // \"summary\"]|last // \"none\"")
  rc=$(gh api "$R/pulls/$n/comments?per_page=100" --jq "[.[]|select(.commit_id==\"$sha\")]|length")
  th=$(gh api $R/pulls/$n/ccr/review_threads --jq '[.[]|select(.resolved==false)]|length')
  ch=$(echo "$j" | jq -r '.body' | awk '/^## Choices I made/{f=1;next} /^## /{f=0} f' | grep -v '^\s*$' | head -1 | cut -c1-50)
  echo "#$n $st ${sha:0:7} merge=$ms [$labels] checks: $checks | codex@head: $codex | head comments: $rc | open threads: $th | choices: ${ch:-<empty>}"
done
