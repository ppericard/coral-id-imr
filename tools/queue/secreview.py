"""The state of Codex's security review for one exact head commit (merge contract, AGENTS.md: every Codex finding and
security alert fixed or answered; REE-232). The queue trains a PR only on "completed": a review still running, absent,
failed, done on another commit, or that cannot be read is not ready, and no findings is no proof that it finished.

Codex keeps one summary comment per PR up to date. Its hidden markers carry the review's state as JSON:
  <!-- codex-review-state:v1 {"security_review": {"commit_sha": ..., "status": ..., "has_unresolved_findings": ...}, ...} -->
  <!-- codex-security-review:v1 {"headSha": ..., "status": ..., ...} -->
Only comments by the Codex bot account count (a PR's own text or a person's comment can quote the markers).

Prints one line: "<state> <SHA>", the state being one of
  completed      both markers name this commit, say completed, and no unresolved finding is left
  findings       completed with unresolved findings
  running        under way (running, queued, pending, in_progress)
  failed:<s>     any other status s (failed, error, cancelled, ...)
  stale          the latest state is for another commit (a review of this one has not reported yet)
  absent         no state from Codex at all
  ?              unreadable: a bad SHA argument, a file that does not parse, a marker that does not parse or lacks its
                 fields, or the two markers disagreeing
Usage: secreview.py SHA ISSUE_COMMENTS   (SHA: the full 40-character head; ISSUE_COMMENTS: a file of `gh api --paginate`
output, one JSON array per page, concatenated)"""
import html
import json
import re
import sys

BOT = 'chatgpt-codex-connector[bot]'
STATE = re.compile(r'<!--\s*codex-review-state:v1\s+(\{.*?\})\s*-->', re.S)
SECURITY = re.compile(r'<!--\s*codex-security-review:v1\s+(\{.*?\})\s*-->', re.S)
FULL_SHA = re.compile(r'[0-9a-f]{40}')
RUNNING = {'running', 'queued', 'pending', 'in_progress'}


class Unreadable(Exception):
    pass


def pages(path):
    """Every item of a file of concatenated JSON arrays (gh api --paginate)."""
    text = open(path, encoding='utf-8').read()
    dec, i, items = json.JSONDecoder(), 0, []
    while True:
        while i < len(text) and text[i].isspace():
            i += 1
        if i >= len(text):
            return items
        page, i = dec.raw_decode(text, i)
        items.extend(page if isinstance(page, list) else [page])


def marker(rx, body):
    """The one JSON object of this marker in the body, None when the body has none."""
    found = rx.findall(body)
    if not found:
        return None
    if len(found) > 1:
        raise Unreadable('marker twice')
    try:
        obj = json.loads(found[-1])
    except ValueError:
        raise Unreadable('marker JSON')
    if not isinstance(obj, dict):
        raise Unreadable('marker JSON')
    return obj


def review_of(body):
    """(sha, status, unresolved) of the security review this comment reports, None when it reports none."""
    body = html.unescape(body or '')
    st, sec = marker(STATE, body), marker(SECURITY, body)
    if st is None and sec is None:
        return None
    found = []
    if st is not None:
        r = st.get('security_review')
        if not isinstance(r, dict):
            raise Unreadable('state without security_review')
        found.append((r.get('commit_sha'), r.get('status'), r.get('has_unresolved_findings')))
    if sec is not None:
        found.append((sec.get('headSha'), sec.get('status'), None))
    for sha, status, _ in found:
        if sha is None and status is None:
            continue  # a marker written before its review started (the summary's first state)
        if not isinstance(sha, str) or not FULL_SHA.fullmatch(sha.lower()) or not isinstance(status, str) or not status:
            raise Unreadable('marker fields')
    found = [(s.lower(), t.lower(), u) for s, t, u in found if not (s is None and t is None)]
    if not found:
        return None
    if len({(s, t) for s, t, _ in found}) > 1:
        raise Unreadable('markers disagree')
    sha, status = found[0][0], found[0][1]
    return sha, status, any(u is True for _, _, u in found)


def state(sha, comments):
    reports = []
    for c in comments:
        if not isinstance(c, dict):
            raise Unreadable('comment')
        user = c.get('user') or {}
        if user.get('login') != BOT or user.get('type') != 'Bot':
            continue
        r = review_of(c.get('body'))
        if r is not None:
            reports.append((c.get('updated_at') or c.get('created_at') or '', r))
    if not reports:
        return 'absent'
    mine = [r for _, r in sorted(reports, key=lambda x: x[0]) if r[0] == sha]
    if not mine:
        return 'stale'
    _, status, unresolved = mine[-1]
    if status == 'completed':
        return 'findings' if unresolved else 'completed'
    if status in RUNNING:
        return 'running'
    return 'failed:' + re.sub(r'[^a-z_]', '', status)[:20]


def main(argv):
    if len(argv) != 3:
        print(__doc__.split('\n')[0], file=sys.stderr)
        return 2
    sha = argv[1].lower()
    try:
        if not FULL_SHA.fullmatch(sha):
            raise Unreadable('SHA')
        out = state(sha, pages(argv[2]))
    except (Unreadable, OSError, ValueError):
        out = '?'
    print('%s %s' % (out, sha))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
