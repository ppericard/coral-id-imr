#!/usr/bin/env python3
"""The fish held-out photo set (ROADMAP "A held-out photo set"; design note docs/reviews/2026-11-15-held-out-photo-set-design.md;
Pierre, 2026-11-16, Q385): writes fish-holdout.json, the fish observations kept out of practice for an honest mastery
exam (rule L9) and the transfer check. Data only: no game reads the file yet (the wiring comes after the species level's
draw rework, #975).

The rule, per species (the finest fish unit: a species' observations are its genus's and family's too, so every rank gets
its exam photos from it):
  - Eligible: an observation in play (fish-game.json) none of whose photos is Pierre's own (own: rule P1, "never left
    out", and he has seen them all), a reference source's photo (rep) or of reference level (fish_game.ref_level, core.js
    refLevel: the cards', covers' and first photos' kind, rule P1). The surprise-only species (fish.json wink) are left
    out (no game unit). A whole observation is in or out (rule P4: one question, one observation).
  - How many: RATE (10%) of its eligible observations, at least FLOOR (5, the exam's model.js EXAM.n), never leaving
    fewer than KEEP (8, the admin's per-species photo target, autosort.js FISHT.obs) of its observations in practice.
  - Which: the eligible observations in the order of a fixed hash of their id (sha256 of SALT and the id), first ones
    first. Deterministic, never by source, licence or observer (rule P1: fish have no source priority).
  - Sticky: an observation held out stays held out while it is in play and eligible, whatever photos are added; a
    species under its count takes the next eligible observations by the same hash order; only a species left with fewer
    than KEEP in practice (photos gone from play) gives some back, the last in hash order first. --fresh draws again
    from nothing (before the wiring ships only: a re-draw after players answered held-out photos splits the analyses).

Pierre's ★ covers and featured picks (curation.json fish genera) are not read here, so a Publish never makes the file
stale: the reader leaves a picked photo out of the held-out set (it is shown on the cards).

  python3 tools/holdout.py           write fish-holdout.json from fish-game.json, fish.json and the file itself
  python3 tools/holdout.py --check   exit 1 when the file is not what a run would write (CI)
  python3 tools/holdout.py --stats   print the counts per rank (family, genus, species with a common name)
"""
import argparse
import hashlib
import json
import math
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fish_game import ref_level  # noqa: E402  (core.js refLevel's copy)
from fetch_fish import is_wink  # noqa: E402  (a surprise-only family or teaching entry)
import fish_short  # noqa: E402  (an observation's short id)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = 'fish-holdout.json'
RATE, FLOOR, KEEP, SALT = 0.10, 5, 8, 'fish-holdout'
RULE = {'unit': 'species', 'rate': RATE, 'floor': FLOOR, 'keep': KEEP, 'salt': SALT}
ABOUT = ('the fish observations held out of practice, by species (tools/holdout.py; ROADMAP "A held-out photo set"): '
         'the training draw leaves them out, the mastery exam draws from them')


def obs_of(p):
    """The observation a game record belongs to: its short id (fish_short: an iNaturalist observation by its id alone),
    else the photo's own name."""
    return str(fish_short.short({'o': p.get('o')}).get('o') or p['f']) if p.get('o') else str(p['f'])


def rank(o):
    """The fixed order observations are held out in: a hash of the salt and the observation id."""
    return hashlib.sha256((SALT + ':' + o).encode()).hexdigest()


def wink_species(fish):
    """The species met only on the surprise cards (fish.json families and teaching entries marked wink)."""
    return {s for x in [*(fish.get('families') or []), *(fish.get('teach') or [])] if isinstance(x, dict) and is_wink(x)
            for s in x.get('species') or []}


def pool(game, fish):
    """{species id: {observation: eligible}} of the observations in play (game: fish-game.json photos)."""
    W, out = wink_species(fish or {}), {}
    for L in ((game or {}).get('photos') or {}).values():
        for p in L or []:
            if not p or not p.get('f') or not p.get('sp') or p['sp'] in W:
                continue
            o, ok = obs_of(p), not (p.get('own') or p.get('rep') or ref_level(p))
            S = out.setdefault(p['sp'], {})
            S[o] = S.get(o, True) and ok
    return out


def quota(n_eligible, n_all):
    """How many observations a species holds out: RATE of the eligible ones, at least FLOOR, KEEP left in practice."""
    return max(0, min(max(math.ceil(RATE * n_eligible), FLOOR), n_eligible, n_all - KEEP))


def build(game, fish, prev=None):
    """{species id: [observation ids held out]} (sorted), sticky from prev (a former output's held, or None)."""
    had = {o for L in ((prev or {}).values()) for o in L or []}
    out = {}
    for sp, O in pool(game, fish).items():
        E = sorted((o for o, ok in O.items() if ok), key=rank)
        held = [o for o in E if o in had]
        k = quota(len(E), len(O))
        held += [o for o in E if o not in had][:max(0, k - len(held))]
        held = sorted(held, key=rank)[:max(0, len(O) - KEEP)]  # never fewer than KEEP in practice
        if held:
            out[sp] = sorted(held)
    return dict(sorted(out.items()))


def stale(old, held):
    """The stored file old (or None) is not what a run writes: another rule, or another set than held."""
    return not old or old.get('rule') != RULE or old.get('held') != held


def read(name):
    with open(os.path.join(ROOT, name), encoding='utf-8') as f:
        return json.load(f)


def current():
    try:
        return read(OUT)
    except FileNotFoundError:
        return None


def stats(game, fish, held):
    """{observations, held, ranks: {rank: {units, under, already, exam, some}}}: the observations in play and held out;
    per rank, its units with photos in play, those with fewer than KEEP observations in practice (already: before any
    hold-out), with at least FLOOR held out (a full exam), with at least one."""
    sp = {s['id']: s for s in fish.get('species') or []}
    H = {o for L in held.values() for o in L}
    ranks = {'family': lambda s: s.get('family'), 'genus': lambda s: s.get('genus'),
             'species': lambda s: s['id'] if s.get('cn') else None}
    out = {}
    for r, f in ranks.items():
        U = {}
        for sid, O in pool(game, fish).items():
            u = f(sp.get(sid) or {'id': sid})
            if u:
                U.setdefault(u, set()).update(O)
        out[r] = {'units': len(U), 'under': sum(len(O - H) < KEEP for O in U.values()),
                  'already': sum(len(O) < KEEP for O in U.values()), 'exam': sum(len(O & H) >= FLOOR for O in U.values()),
                  'some': sum(bool(O & H) for O in U.values())}
    n = sum(len(O) for O in pool(game, fish).values())
    return {'observations': n, 'held': len(H), 'ranks': out}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--check', action='store_true', help='exit 1 when the file is not what a run would write')
    ap.add_argument('--stats', action='store_true', help='print the counts per rank')
    ap.add_argument('--fresh', action='store_true', help='draw again from nothing (never once the wiring ships)')
    a = ap.parse_args()
    game, fish, old = read('fish-game.json'), read('fish.json'), current()
    prev = None if a.fresh or not old else old.get('held')
    held = build(game, fish, prev)
    if a.stats:
        print(json.dumps(stats(game, fish, held), indent=1))
        return 0
    if a.check:
        if stale(old, held):
            print(f'{OUT} is not what tools/holdout.py writes from fish-game.json and fish.json: run it', file=sys.stderr)
            return 1
        print(f'{OUT}: {sum(map(len, held.values()))} observations held out, as the rule gives')
        return 0
    doc = {'v': 1, 'built': date.today().isoformat() if stale(old, held) else old['built'], 'about': ABOUT, 'rule': RULE, 'held': held}
    with open(os.path.join(ROOT, OUT), 'w', encoding='utf-8') as f:
        f.write('{\n' + ',\n'.join(f' {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}' for k, v in doc.items() if k != 'held'))
        f.write(',\n "held": {\n' + ',\n'.join(f'  {json.dumps(k)}: {json.dumps(v)}' for k, v in held.items()) + '\n }\n}\n')
    print(f'{OUT}: {sum(map(len, held.values()))} observations of {len(held)} species held out')
    return 0


if __name__ == '__main__':
    sys.exit(main())
