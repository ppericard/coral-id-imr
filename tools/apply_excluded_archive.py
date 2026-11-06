"""excluded.json (tools/excluded.py), from git history. Needs the history (in a shallow clone:
git fetch --filter=blob:none --unshallow origin; the Candidate photos workflow checks out with fetch-depth 0, blob:none).

    python3 tools/apply_excluded_archive.py           # seed: every photo curation.json excludes that data.json and
                                                       # cand.json no longer hold gets its last record in history, with its
                                                       # place, so that Pierre's Restore brings it back (fetch_local.py tidy)
    python3 tools/apply_excluded_archive.py --files   # the image file of every archived photo Pierre restored that has no
                                                       # online original (an IMR lecture photo: git is its only backup, and its
                                                       # exclusion removed it from img/), back into img/ from history

Both re-runnable. --files runs in the Candidate photos workflow before tools/photos.py (which makes the smaller sizes
from the file) and before the final tidy (which holds such a photo back while its file is missing: excluded.py files_ok),
so a restored lecture photo comes back by itself with its files, committed to img/ with it.
"""
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from excluded import EX, _lists, load_gone, save_gone, files_ok, excluded
from photos import IMG, SUFFIXES
from datajson import ROOT, load_all


def git(*a, text=True):
    return subprocess.run(['git', *a], cwd=ROOT, capture_output=True, text=text)


def show(rev, path):
    r = git('show', f'{rev}:{path}')
    try:
        return json.loads(r.stdout) if r.returncode == 0 else None
    except ValueError:
        return None


def seed():
    gone = load_gone()
    have = {p.get('f') for _, L in _lists(load_all()) for p in L}
    want = {f for f in EX if f not in have and f not in gone}
    revs = git('log', '--format=%H', '--', 'data.json', 'cand.json').stdout.split()
    for rev in revs:  # newest first: each photo's last record
        if not want: break
        d = show(rev, 'data.json') or {}
        c = (show(rev, 'cand.json') or {}).get('cand') or {}
        for g, L in c.items():
            d.setdefault('cand', {}).setdefault(g, []).extend(L)
        for at, L in _lists(d):
            for i, p in enumerate(L):
                if p.get('f') in want:
                    gone[p['f']] = {**at, 'i': i, 'p': p}
                    want.discard(p['f'])
    save_gone(gone)
    print(f'excluded.json: {len(gone)} photos kept; not found in the history: {sorted(want) or "none"}')


def files():
    """The files of the restored photos that tidy holds back for want of them (no src, no file in img/)."""
    for f, r in sorted(load_gone().items()):
        if excluded(f) or files_ok(r['p']): continue
        for suf in SUFFIXES:  # the sizes git kept (once only the full size); tools/photos.py makes the others
            path = f'img/{f}{suf}.webp'
            if os.path.exists(os.path.join(ROOT, path)): continue
            rev = git('log', '-1', '--format=%H', '--diff-filter=D', '--', path).stdout.strip()
            blob = git('show', f'{rev}^:{path}', text=False) if rev else None
            if blob and blob.returncode == 0 and blob.stdout:
                with open(os.path.join(IMG, f + suf + '.webp'), 'wb') as fh: fh.write(blob.stdout)
                print('back from git history:', path)
        if not files_ok(r['p']):
            print(f'{f}: restored, but its file is not in the history: it stays in excluded.json', file=sys.stderr)


if __name__ == '__main__':
    files() if '--files' in sys.argv else seed()
