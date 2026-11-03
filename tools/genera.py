"""The genera the games play, read from core.js so they are defined once (Pierre, 2026-11-03: no genus-specific case).

core.js BENTHIC (Millepora, a slate genus) and BONUS (the opt-in bonus genera) are the genera of data.json "x" that the
games ask, beside the IMR coral slate (data.json "gen"). The other "x" genera are Finder-only: Identify > Coral Finder
and their genus sheet, never a game. Same rules as core.js slateOf / gameOf.

    from genera import game_genera, finder_only   # scripts in tools/ (python3 tools/x.py puts tools/ on sys.path)
"""
import json, os, re

CORE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'core.js')


def _list(src, name):
    m = re.search(r'\b' + name + r"\s*=\s*(\[[^\]]*\])", src)
    if not m: raise ValueError(f'core.js: no {name} list')
    return json.loads(m.group(1).replace("'", '"'))


def lists():
    """(BENTHIC, BONUS) as core.js defines them."""
    src = open(CORE, encoding='utf-8').read()
    return _list(src, 'BENTHIC'), _list(src, 'BONUS')


def cap_sheet():
    """core.js CAP.sheet: the photos a genus sheet shows per view, the cap of a Finder-only genus (admin.js capOf)."""
    m = re.search(r'\bCAP\s*=\s*\{[^}]*\bsheet:\s*(\d+)', open(CORE, encoding='utf-8').read())
    if not m: raise ValueError('core.js: no CAP.sheet')
    return int(m.group(1))


def game_genera(d):
    """core.js gameOf: the IMR coral slate, then BENTHIC and BONUS genera present in data.json "x"."""
    X = (d.get('x') or {}).get('gen') or {}
    benthic, bonus = lists()
    return [n for n in d['gen'] if n not in X] + [n for n in benthic + bonus if n in X]


def finder_only(d):
    """The genera of data.json "x" no game asks, in data.json order."""
    G = set(game_genera(d))
    return [n for n in ((d.get('x') or {}).get('gen') or {}) if n not in G]
