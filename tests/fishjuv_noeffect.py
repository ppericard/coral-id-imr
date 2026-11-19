"""The juvenile label has no effect on the game (tests/fishjuv.test.js runs it): tools/fish_game.py plan, which gives
every fish photo in play its ease and tags (the judging's caps: tools/fish_judge.py cap, juv_early), gives the same plan
from fish.json as it is, with every species' jv taken out, and with every jv set to another class. Prints one JSON line:
{same, photos}."""
import copy
import json
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import fish_game as G  # noqa: E402

fish, cur, cand, sug, refs, codes, crops, keep = G.inputs(ROOT)
prev = G.load(ROOT, 'fish-game.json', {})
boxes = G.boxes_in(ROOT)


def run(f):
    return json.dumps(G.plan(f, cur, cand, sug, prev, refs, codes, crops, None, keep, boxes), sort_keys=True, default=str)


def variant(f, put):
    f = copy.deepcopy(f)
    for s in f['species']:
        put(s)
    return f


base = run(fish)
none = run(variant(fish, lambda s: s.pop('jv', None)))
flip = run(variant(fish, lambda s: s.__setitem__('jv', {'c': 'off', 'line': 'x', 'src': [], 'look': s['id']})))
print(json.dumps({'same': base == none == flip, 'labels': sum(1 for s in fish['species'] if 'jv' in s), 'size': len(base)}))
