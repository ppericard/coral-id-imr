#!/usr/bin/env bash
# Print the failing jobs of a commit or branch, with the error lines of each job's log.
# Usage: bash failjobs.sh REF   (a sha, or a branch such as train/20261119-160417)
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
sha=$(gh api $R/commits/$1 --jq .sha) || exit 1
gh api "$R/commits/$sha/check-runs?per_page=100" --jq '.check_runs[] | select(.conclusion=="failure") | "\(.id) \(.name)"' | while read -r id name; do
  echo "=== $name ($id)"
  gh api $R/actions/jobs/$id/logs 2>/dev/null | grep -E "not ok|✗|FAIL|Error|AssertionError|expected|actual|Timeout|timed out" | grep -v "^.*# Subtest" | head -25 | cut -c1-260
done
