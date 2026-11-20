"""Every fish photo in play as tools/fish_game.py would record it from the judging and the curation today
(tests/fishjuvdiff.test.js runs it): prints one JSON line {photo: [species id, tags jt, phase ph]}, the juvenile card's
inputs (quiz.js juvCard), before the photos workflow rebuilds fish-game.json."""
import json
import os
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
    out[r['f']] = [r.get('sp') or '', r.get('jt') or '', r.get('ph') or '']
print(json.dumps(out, sort_keys=True))
