"""The fish game's record of each photo in play, as tools/fish_game.py would build it from the judging today
(tests/fishjuvcard.test.js runs it): prints one JSON line {photo: {jt, ph}} for every photo in play whose judging note or
code concerns a juvenile, and fish-s330-cand-551266134 (a goatfish whose own note says it is no juvenile)."""
import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import fish_game as G  # noqa: E402

fish, cur, cand, sug, refs, codes, crops, keep = G.inputs(ROOT)
F = (cur or {}).get('fish') or {}
species = {s['id']: s for s in (fish or {}).get('species') or []}
out = {}
for sid, p, orig, route in G.in_play(cur, cand, sug, fish, refs, codes, keep):
    r = G.record(sid, p, F, sug, orig, species, route)
    f = r['f']
    note = ((sug or {}).get(f) or {}).get('n') or ''
    if re.search(r'juvenile', note, re.I) or 'j' in (r.get('jt') or '')[7:] or f == 'fish-s330-cand-551266134':
        out[f] = {'jt': r.get('jt'), 'ph': r.get('ph'), 'note': note}
print(json.dumps(out, sort_keys=True))
