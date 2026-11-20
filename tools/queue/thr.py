"""Print a PR's unresolved review threads (from the ccr/review_threads JSON) with each first comment's body.
Usage: thr.py THREADS_JSON   (QUEUE_REPO overrides the repository, default ppericard/coral-id-imr)"""
import json
import os
import subprocess
import sys

REPO = os.environ.get('QUEUE_REPO', 'ppericard/coral-id-imr')

for t in json.load(open(sys.argv[1], encoding='utf-8')):
    if t.get('resolved'):
        continue
    cid = t['comment_ids'][0]
    body = subprocess.run(['gh', 'api', 'repos/%s/pulls/comments/%d' % (REPO, cid), '--jq', '.body'],
                          capture_output=True, text=True).stdout
    body = body.split('Useful?')[0].strip()
    print('== %s:%s (comment %d, outdated=%s)' % (t['path'], t['line'], cid, t.get('outdated')))
    print(body[:1200])
    print()
