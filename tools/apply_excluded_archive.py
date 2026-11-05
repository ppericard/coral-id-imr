"""Seeds excluded.json (tools/excluded.py) with the photos Pierre excluded before it existed: for every photo curation.json
excludes that data.json and cand.json no longer hold, its last record in git history (data.json or cand.json), with its
place, so that his Restore (admin Genera › Excluded) brings it back (tools/fetch_local.py tidy). Re-runnable: a photo
already archived, or still in the lists, is left alone. Needs the history of data.json (a shallow clone:
git fetch --filter=blob:none --unshallow origin).

    python3 tools/apply_excluded_archive.py
"""
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from excluded import EX, _lists, load_gone, save_gone
from datajson import ROOT, load_all


def show(rev, path):
    try:
        return json.loads(subprocess.run(['git', 'show', f'{rev}:{path}'], cwd=ROOT, capture_output=True, check=True, text=True).stdout)
    except (subprocess.CalledProcessError, ValueError):
        return None


def main():
    gone = load_gone()
    have = {p.get('f') for _, L in _lists(load_all()) for p in L}
    want = {f for f in EX if f not in have and f not in gone}
    revs = subprocess.run(['git', 'log', '--format=%H', '--', 'data.json', 'cand.json'], cwd=ROOT, capture_output=True,
                          check=True, text=True).stdout.split()
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


if __name__ == '__main__':
    main()
