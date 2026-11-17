#!/usr/bin/env python3
"""The fish held-out photo set (ROADMAP "A held-out photo set"; design note docs/reviews/2026-11-15-held-out-photo-set-design.md;
Pierre, 2026-11-16, Q385; 2026-11-18: exam only, "Je pensais qu'on gardait des photos pour la fin"): writes
fish-holdout.json, the fish observations kept out of practice for an honest mastery exam (rule L9): the app never shows
them in practice, and the exam asks them first (core.js fishHeld, model.js examSet).

The rule, per exam unit (Pierre, 2026-11-18 ~06:11 Manila: "Il en faut suffisament pour refaire l'examen plusieurs fois,
si et seulement si on a assez de photos par ailleurs"):
  - Exam units: the units with a mastery exam (model.js examOn; a species unit has none, app.js noex): every family in
    play (fish.json families, the surprise-only ones left out), and the scientific genera (app.js fishGenera: the genera
    of a circle-1 family, each with its species of circle 1).
  - Eligible: an observation in play (fish-game.json) none of whose photos is Pierre's own (own: rule P1, "never left
    out", and he has seen them all), a reference source's photo (rep) or of reference level (fish_game.ref_level, core.js
    refLevel: the cards', covers' and first photos' kind, rule P1). The surprise-only species (fish.json wink) are left
    out (no game unit). A whole observation is in or out (rule P4: one question, one observation).
  - How many: TARGET (15: three exams of model.js EXAM.n = 5) per exam unit, taken across its species in turn (its
    species order in fish.json: the commonness order, the most met first), never leaving a species with fewer than KEEP
    (8, the admin's per-species photo target, autosort.js FISHT.obs) of its observations in practice. A unit that cannot
    reach TARGET under that limit holds what it can, possibly none (its exam then asks the photos seen least). The
    families first, then the genera topped up to TARGET (a genus's observations are its family's too).
  - Which: within a species, its eligible observations in the order of a fixed hash of their id (sha256 of SALT and the
    id), first ones first. Deterministic, never by source, licence or observer (rule P1: fish have no source priority).
  - Sticky: an observation held out stays held out while it is in play and eligible, whatever photos are added; a unit
    under its target takes the next eligible observations by the same order; only a species left with fewer than KEEP in
    practice (photos gone from play) gives some back, the last in hash order first. A file made under another rule is
    drawn again from nothing (as --fresh: a re-draw after players answered held-out photos splits the analyses).

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
TARGET, KEEP, SALT = 15, 8, 'fish-holdout'
EXAM_N = 5  # model.js EXAM.n: an exam's questions (TARGET is three exams' worth)
RULE = {'unit': 'exam', 'target': TARGET, 'keep': KEEP, 'salt': SALT}
ABOUT = ('the fish observations held out of practice, by species, sized per exam unit (tools/holdout.py; ROADMAP '
         '"A held-out photo set"): never shown in practice, the mastery exam asks them first')


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


def exam_units(fish):
    """[(unit id, [species ids])] of the units with a mastery exam, families first: every family in play (not a
    surprise-only one), then the scientific genera (app.js fishGenera: a circle-1 family's genera with their circle-1
    species), each with its species in fish.json order (the commonness order)."""
    sp = {s['id']: s for s in fish.get('species') or [] if isinstance(s, dict) and s.get('id')}
    gens = {g['id']: g for g in fish.get('genera') or [] if isinstance(g, dict) and g.get('id')}
    fams = [f for f in fish.get('families') or [] if isinstance(f, dict) and f.get('id') and not is_wink(f)]
    out = [(f['id'], list(f.get('species') or [])) for f in fams]
    for f in fams:
        if f.get('circle') != 1:
            continue
        for gid in f.get('genera') or []:
            S = [s for s in (gens.get(gid) or {}).get('species') or [] if (sp.get(s) or {}).get('circle') == 1]
            if S:
                out.append((gid, S))
    return out


def build(game, fish, prev=None):
    """{species id: [observation ids held out]} (sorted), sticky from prev (a former output's held, or None)."""
    had = {o for L in ((prev or {}).values()) for o in L or []}
    P = pool(game, fish)
    E = {s: sorted((o for o, ok in O.items() if ok), key=rank) for s, O in P.items()}
    cap = {s: max(0, min(len(E[s]), len(P[s]) - KEEP)) for s in P}  # never fewer than KEEP in practice
    held = {s: [o for o in E[s] if o in had][:cap[s]] for s in P}
    for _, S in exam_units(fish):
        take(held, E, cap, [s for s in dict.fromkeys(S) if s in P])
    return dict(sorted((s, sorted(L)) for s, L in held.items() if L))


def take(held, E, cap, S):
    """Tops exam unit S (its species in order, a family's or a genus's: one rule for both) up to TARGET held-out
    observations, one species at a time in turn, each its next eligible observation in hash order, only while that
    species keeps at least KEEP in practice after the take (cap: Pierre, 2026-11-18, "si et seulement si on a assez de
    photos par ailleurs"); a unit that cannot reach TARGET so holds what it can. held: {species: [observation]}, changed
    in place; E: each species' eligible observations in hash order. Returns how many the unit holds."""
    need = TARGET - sum(len(held[s]) for s in S)
    while need > 0:
        took = False
        for s in S:
            if need > 0 and len(held[s]) < cap[s]:
                held[s].append(next(o for o in E[s] if o not in held[s]))
                need, took = need - 1, True
        if not took:
            break
    return TARGET - max(0, need)


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
    """{observations, held, units: {families, genera: {units, target, some, none}}, under}: the observations in play and
    held out; per kind of exam unit, those that reach TARGET held out, hold fewer, hold none; the species with fewer than
    KEEP observations in practice (already so before any hold-out)."""
    P = pool(game, fish)
    H = {s: set(L) for s, L in held.items()}
    fams = {f['id'] for f in fish.get('families') or [] if isinstance(f, dict)}
    out = {}
    for uid, S in exam_units(fish):
        n = sum(len(H.get(s, ())) for s in set(S) if s in P)
        if not any(s in P for s in S):
            continue
        k = out.setdefault('families' if uid in fams else 'genera', {'units': 0, 'target': 0, 'some': 0, 'none': 0})
        k['units'] += 1
        k['target' if n >= TARGET else 'some' if n else 'none'] += 1
    return {'observations': sum(map(len, P.values())), 'held': sum(map(len, H.values())), 'units': out,
            'under': sum(len(O) - len(H.get(s, ())) < KEEP for s, O in P.items()),
            'already': sum(len(O) < KEEP for O in P.values())}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--check', action='store_true', help='exit 1 when the file is not what a run would write')
    ap.add_argument('--stats', action='store_true', help='print the counts per rank')
    ap.add_argument('--fresh', action='store_true', help='draw again from nothing (never once the wiring ships)')
    a = ap.parse_args()
    game, fish, old = read('fish-game.json'), read('fish.json'), current()
    prev = None if a.fresh or not old or old.get('rule') != RULE else old.get('held')
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
