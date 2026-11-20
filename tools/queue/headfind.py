"""Count the findings on a PR's current head that nobody has answered (merge contract, AGENTS.md: every Codex finding
and security alert fixed or answered). Prints the count, then one line per finding.
  - review comments: a top-level comment by a bot on the head commit, not in a resolved thread, with no reply (a
    finding can exist before its thread does: docs/INTEGRATOR.md "Merge");
  - security comments: an issue comment by a bot that talks about security (not Codex's review receipt), posted since
    the head commit, with no later comment from a person.
Usage: headfind.py SHA HEAD_DATE REVIEW_COMMENTS THREADS ISSUE_COMMENTS
(the last three are files holding `gh api --paginate` output: one JSON array per page, concatenated)"""
import json
import re
import sys

SECURITY = re.compile(r'security|secret|vulnerab|codeql|alert', re.I)
# Codex's own receipt and its review summary table (which always says "Security Review"): its findings are inline
# review comments, counted above
RECEIPT = re.compile(r'Codex Review:|codex-pull-request-review-summary|codex-review-receipt')


def pages(path):
    """Every item of a file of concatenated JSON arrays."""
    text = open(path, encoding='utf-8').read()
    dec, i, items = json.JSONDecoder(), 0, []
    while True:
        while i < len(text) and text[i].isspace():
            i += 1
        if i >= len(text):
            return items
        page, i = dec.raw_decode(text, i)
        items.extend(page if isinstance(page, list) else [page])


def is_bot(c):
    return (c.get('user') or {}).get('type') == 'Bot'


def findings(sha, head_date, review, threads, issue):
    resolved = {cid for t in threads if t.get('resolved') for cid in t.get('comment_ids', [])}
    replied = {c.get('in_reply_to_id') for c in review if c.get('in_reply_to_id')}
    found = []
    for c in review:
        if c.get('commit_id') != sha or c.get('in_reply_to_id') or not is_bot(c):
            continue
        if c['id'] in resolved or c['id'] in replied:
            continue
        found.append('review comment %s on %s:%s' % (c['id'], c.get('path'), c.get('line')))
    for k, c in enumerate(issue):
        if not is_bot(c) or RECEIPT.search(c.get('body') or '') or not SECURITY.search(c.get('body') or ''):
            continue
        if (c.get('created_at') or '') < head_date:
            continue
        # the queue's own "@codex review" requests are no answer
        if any(not is_bot(d) and not (d.get('body') or '').lstrip().startswith('@codex') and (d.get('created_at') or '') > c['created_at'] for d in issue[k + 1:]):
            continue
        found.append('security comment %s by %s' % (c['id'], c['user']['login']))
    return found


if __name__ == '__main__':
    sha, head_date, rv, th, iss = sys.argv[1:6]
    out = findings(sha, head_date, pages(rv), pages(th), pages(iss))
    print(len(out))
    for line in out:
        print(line)
