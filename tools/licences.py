#!/usr/bin/env python3
"""The licence refresh: reads again, from iNaturalist, the licence and the credit of every iNaturalist photo the app
lists, and brings the stored ones up to date (an author can change the licence of their photos at any time, in either
direction: Pierre moved all his to CC BY on 2026-11-15; ROADMAP "Rights tagged for a later split": "authors can change
it"). No field is added: a record keeps its shape, only its a (the credit) and lic (the licence code) change, and with
lic its rights class and tie-break (tools/rights.py, core.js rightsRank), which every reader derives from them.

What it reads and writes (FILES), each through its own writer, so an unchanged file keeps its bytes:
  - fish-cand.json, tools/fish_refs.json: the sources of the fish photos in play (tools/fish_game.py record copies a and
    lic from them at each run), and the sheet-only photos of fish-photos.json ("sheet");
  - fish-game.json, the fish photos in play, and fish-photos.json "photos", its first photos, written again from it
    (tools/fish_game.py first_photos: the licence is the last key of their order);
  - data.json (the coral photos in play, the candidates curation.json names), cand.json (the coral candidates waiting),
    excluded.json (the photos Pierre excluded, kept for his Restore: tools/excluded.py restore_unexcluded puts one back
    without a licence check, so one whose licence the rules now refuse leaves it too, the rest only follow).
Not read: points.json (a point's photos carry a, o, src only as a fallback, written by hand; no licence there),
tools/fish_judge.json "add" (the stopgap's additions, no longer read by the game), curation.json (rule A1: it holds no
credit anyway).

Which photos: every record with an iNaturalist observation (o) and photo id (in src, else in its name f). IMR lecture and
FishBase photos are left as they are. The observations are asked by id, BATCH a request, through tools/inat.py (rule C7:
about one request a second, its User-Agent names the project only, paced retries); a request that still fails stops the
run before anything is written.

What a new licence does (the existing licence rules, nothing new):
  - one the rules accept: the credit and the licence code are updated, more open or stricter alike (CC BY-NC -> CC BY
    moves the photo up the tie-break, CC BY -> CC BY-NC down);
  - one they do not accept leaves play, reported (printed, and as a warning in the workflow), never kept silently:
      fish (tools/fetch_fish.py lic_ok: CC0, CC BY, CC BY-NC; Pierre's own without a licence): the record leaves every
      fish list (its candidate, its reference photo, its sheet-only entry, fish-game.json), so the next run of
      tools/fish_game.py does not bring it back; one Pierre added in the admin leaves with it (fish_game.py in_play
      finds no record for it);
      corals (tools/fetch_local.py LICS: CC0, CC BY, CC BY-NC): an all-rights-reserved or "no derivatives" photo leaves
      data.json, cand.json or excluded.json (his Restore cannot bring it back). Share-alike follows rule P1: a coral candidate waiting is dropped by tools/fetch_local.py
      drop_share_alike at the same workflow run (never one curation.json names); a coral photo in play stays, its
      licence updated, for Pierre to keep or remove (admin To do › Share-alike); both are reported;
    a photo that leaves comes back only through the candidate searches, once its licence allows it again (they search
    the accepted licences only);
  - an observation or a photo iNaturalist no longer returns (deleted, hidden, made private) is reported and left as it
    is: no answer is not a licence.
Pierre's own photos (own, or his login on iNaturalist) follow the same rules, as the candidate searches do.

    python3 tools/licences.py                 ask iNaturalist, update the files, print the report
    python3 tools/licences.py --dry           ask, print the report, write nothing
    python3 tools/licences.py --summary FILE  also append the report to FILE in Markdown (the workflow's step summary),
                                              and print each photo that left play as a GitHub warning
Run weekly by the Candidate photos workflow (.github/workflows/approved-photos.yml), and by hand when needed.
Tests: tests/licences.test.js.
"""
import argparse
import json
import os
import re
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import inat  # noqa: E402  the one paced, retried iNaturalist client (rule C7)
import fish_short  # noqa: E402  fish-game.json's short form
from fetch_fish import lic_ok, PIERRE  # noqa: E402  the fish licence rule; Pierre's iNaturalist login

BATCH = 200  # observations a request (iNaturalist's most per page)
FIELDS = 'id,user.login,photos.id,photos.license_code,photos.attribution'
CORAL_OK = ('cc0', 'cc-by', 'cc-by-nc')  # tools/fetch_local.py LICS
SHARE_ALIKE = ('cc-by-sa', 'cc-by-nc-sa')
# (file, subject, role): every list loses a photo whose new licence the rules refuse; "gone" (excluded.json: {f: {place,
# p: record}}) loses its entry, and a photo turned share-alike there is not reported (out of play). fish-photos.json is handled apart (its sheet, then its first
# photos from fish-game.json).
FILES = (('fish-cand.json', 'fish', 'cand'), (os.path.join('tools', 'fish_refs.json'), 'fish', 'play'),
         ('fish-game.json', 'fish', 'play'), ('data.json', 'coral', 'play'), ('cand.json', 'coral', 'cand'),
         ('excluded.json', 'coral', 'gone'))
PHOTOS_FILE = 'fish-photos.json'
OBS_RE = re.compile(r'^(?:https://www\.inaturalist\.org/observations/)?(\d+)$')
SRC_RE = re.compile(r'^https://(?:inaturalist-open-data\.s3\.amazonaws\.com|static\.inaturalist\.org)/photos/(\d+)/')
NAME_RE = re.compile(r'(?:^fi|-)(\d+)[cd]?$')  # fi<id> (a reference photo), <genus or species>-<view or cand>-<id>[c|d]


def ids(p):
    """(observation id, photo id) of an iNaturalist photo record, or None (an IMR lecture or FishBase photo)."""
    if not isinstance(p, dict) or p.get('imr') or p.get('cf'):
        return None
    m = OBS_RE.match(str(p.get('o') or ''))
    if not m:
        return None
    s = SRC_RE.match(str(p.get('src') or '')) or NAME_RE.search(str(p.get('f') or ''))
    return (m.group(1), s.group(1)) if s else None


def lists(v):
    """Every list of photo records in v (records: dicts with f and a), wherever it sits."""
    if isinstance(v, dict):
        for x in v.values():
            yield from lists(x)
    elif isinstance(v, list):
        if any(isinstance(x, dict) and 'f' in x and 'a' in x for x in v):
            yield v
        for x in v:
            if isinstance(x, (dict, list)):
                yield from lists(x)


def records(v):
    """Every photo record in v (a dict with f and a), in a list or not (excluded.json keeps each under its place, p)."""
    if isinstance(v, dict):
        if 'f' in v and isinstance(v.get('a'), str):
            yield v
        for x in v.values():
            yield from records(x)
    elif isinstance(v, list):
        for x in v:
            yield from records(x)


def credit(a):
    """iNaturalist's attribution as the records store it: what follows the licence cut (", uploaded by ..." on some)."""
    return re.sub(r'(\(CC[^)]*\)).*$', r'\1', (a or '').strip())


def author(a):
    """The name a credit gives ("(c) Name, some rights reserved (CC BY)" -> "Name"); '' when it gives none ("no rights
    reserved", iNaturalist's CC0 credit)."""
    m = re.match(r'^\(c\)\s*(.+?),\s*[^,]*$', a or '') or re.match(r'^\(c\)\s*(.+)$', a or '')
    return m.group(1).strip() if m else ''


def fetch(obs, get=None):
    """{photo id: (licence code or None, attribution, observer login)} and the observation ids answered, for the
    observations obs (ids), BATCH a request. A request that fails after tools/inat.py's retries raises."""
    get = get or inat.get
    found, seen = {}, set()
    for B in inat.chunks(sorted(obs, key=int), BATCH):
        d = get(f'{inat.V2}observations?id={",".join(B)}&per_page={BATCH}&fields={FIELDS}') or {}
        for o in d.get('results') or []:
            seen.add(str(o.get('id')))
            login = (o.get('user') or {}).get('login')
            for ph in o.get('photos') or []:
                code = (ph.get('license_code') or '').lower() or None
                found[str(ph.get('id'))] = (code, ph.get('attribution') or '', login)
    return found, seen


def usable(subject, role, code, own):
    """The licence rules on iNaturalist's licence code: True (keep), False (leaves play) or 'sa' (a share-alike coral photo:
    kept and reported, rule P1; a waiting candidate is dropped by tools/fetch_local.py drop_share_alike)."""
    if subject == 'fish':
        return lic_ok(code, own)
    if code in CORAL_OK or (own and not code):
        return True
    return 'sa' if code in SHARE_ALIKE else False


def update(p, code, attr, own):
    """Brings record p to the licence code and attribution read; True when it changed. The credit is replaced when the
    licence or the author's name changed, never for its wording alone (iNaturalist words a credit by the asker's locale,
    and the tools stored some in a shorter form: tools/fish_refs.py credit)."""
    old = (p.get('lic'), p.get('a'))
    lic = code or ('own' if own else '')
    if 'lic' in p:
        p['lic'] = lic
    a = credit(attr)
    if a and (lic != old[0] or author(a) != author(old[1])):
        p['a'] = a
    return (p.get('lic'), p.get('a')) != old


def pierre_nc(docs):
    """Pierre's photos still credited CC BY-NC, per file (the count the 2026-11-15 change brings to 0)."""
    return {f: sum(1 for p in records(d) if 'Pierre Pericard' in p['a'] and '(CC BY-NC)' in p['a'])
            for f, d in docs.items()}


def load(root, f):
    p = os.path.join(root, f)
    if not os.path.exists(p):
        return None
    d = json.load(open(p, encoding='utf-8'))
    return fish_short.full_doc(d) if f == 'fish-game.json' else d


def refresh(docs, found, seen, subject_of, role_of):
    """Applies what iNaturalist said (found, seen: fetch) to the loaded files docs {file: doc}, in place. Returns the
    report: {changed, opener, stricter, credit: Counters by file (credit: the credit alone, an author renamed), left:
    [(file, f, old lic, new code)], sa: [(file, f, new code)], missing: [(file, f, why)]}."""
    rep = {'changed': Counter(), 'opener': Counter(), 'stricter': Counter(), 'credit': Counter(), 'left': [], 'sa': [],
           'missing': []}

    def one(f, p, subject, role):
        """Brings record p up to date; False when it leaves play."""
        k = ids(p)
        if not k:
            return True
        o, ph = k
        if ph not in found:
            rep['missing'].append((f, p['f'], 'observation gone' if o not in seen else 'photo gone'))
            return True
        code, attr, login = found[ph]
        own = bool(p.get('own')) or login == PIERRE
        ok = usable(subject, role, code, own)
        if ok is False:
            rep['left'].append((f, p['f'], p.get('lic'), code))
            return False
        if ok == 'sa' and role != 'gone' and (p.get('lic') or '') != code:
            rep['sa'].append((f, p['f'], code))
        old = p.get('lic')
        if update(p, code, attr, own):
            rep['changed'][f] += 1
            if p.get('lic') == old:
                rep['credit'][f] += 1
            else:
                rep['opener' if open_rank(p.get('lic')) < open_rank(old) else 'stricter'][f] += 1
        return True

    for f, d in docs.items():
        if d is None:
            continue
        subject, role = subject_of[f], role_of[f]
        if role == 'gone':
            G = d.get('photos') or {}
            for k in [k for k, r in G.items() if isinstance(r, dict) and isinstance(r.get('p'), dict)
                      and not one(f, r['p'], subject, role)]:
                del G[k]
            continue
        for L in list(lists(d)):
            L[:] = [p for p in L if not isinstance(p, dict) or one(f, p, subject, role)]
        for k in ('cand', 'sheet'):  # a species or genus left with no candidate is not listed (as their writers do)
            if isinstance(d.get(k), dict):
                for g in [g for g, L in d[k].items() if isinstance(L, list) and not L]:
                    del d[k][g]
    return rep


def open_rank(lic):
    """How open a licence code is, for the report: CC0, CC BY, CC BY-NC, the share-alike ones, then the rest ("no
    derivatives", none)."""
    order = ('cc0', 'cc-by', 'cc-by-nc', 'cc-by-sa', 'cc-by-nc-sa')
    return order.index(lic) if lic in order else len(order)


def write_all(root, docs, before):
    """Writes every file that changed, each through its writer; fish-photos.json's first photos again from fish-game.json."""
    from datajson import dump
    import fish_game
    import fish_refs
    for f, d in docs.items():
        if f == PHOTOS_FILE or d is None or d == before[f]:
            continue
        p = os.path.join(root, f)
        if f == 'fish-game.json':
            text = fish_game.dumps(d)
            open(p, 'w', encoding='utf-8').write(text)
        elif f == os.path.join('tools', 'fish_refs.json'):
            fish_refs.write(d, p)
        else:
            dump(d, p)
    game = docs.get('fish-game.json')
    fp = docs.get(PHOTOS_FILE)
    if game is not None and fp is not None:
        cur = load(root, 'curation.json') or {}
        first = fish_game.first_photos(game['photos'], cur, load(root, 'fish.json'))
        fish_game.write_photos(root, before[PHOTOS_FILE], first, fp.get('sheet') or {})


def report_text(rep, nc_before, nc_after, md=False):
    lines = []
    files = sorted(set(rep['changed']) | set(nc_before))
    lines.append('Licence refresh: ' + (', '.join(f'{f} {rep["changed"][f]} changed ({rep["opener"][f]} more open, '
                                                  f'{rep["stricter"][f]} stricter, {rep["credit"][f]} credit only)'
                                                  for f in files if rep['changed'][f]) or 'nothing changed'))
    lines.append("Pierre's photos credited CC BY-NC: " + ', '.join(f'{f} {nc_before[f]} -> {nc_after[f]}' for f in files if f in nc_before))
    lines.append(f'Left play (licence the rules refuse): {len(rep["left"])}')
    lines += [f'  {f}: {x} ({old or "none"} -> {new or "all rights reserved"})' for f, x, old, new in rep['left']]
    lines.append(f'Turned share-alike (corals: kept in play for Pierre, a waiting candidate dropped by tools/fetch_local.py): {len(rep["sa"])}')
    lines += [f'  {f}: {x} ({new})' for f, x, new in rep['sa']]
    miss = Counter((f, why) for f, _, why in rep['missing'])
    lines.append(f'Not found on iNaturalist (left as they are): {len(rep["missing"])}'
                 + (': ' + ', '.join(f'{f} {n} {why}' for (f, why), n in sorted(miss.items())) if miss else ''))
    if md:
        return '\n'.join(['### ' + lines[0]] + [('- ' + x if not x.startswith('  ') else '  - ' + x.strip()) for x in lines[1:]]) + '\n'
    return '\n'.join(lines)


def run(root=ROOT, get=None, write=True, summary=None, log=print):
    """Loads the files, asks iNaturalist, applies, writes (unless write is False); returns the report."""
    names = [f for f, _, _ in FILES] + [PHOTOS_FILE]
    docs = {f: load(root, f) for f in names}
    before = json.loads(json.dumps(docs))
    subject_of = {f: s for f, s, _ in FILES}
    role_of = {f: r for f, _, r in FILES}
    subject_of[PHOTOS_FILE], role_of[PHOTOS_FILE] = 'fish', 'play'
    # fish-photos.json: its sheet-only photos only (its first photos follow fish-game.json).
    work = {f: d for f, d in docs.items() if f != PHOTOS_FILE}
    if docs.get(PHOTOS_FILE) is not None:
        work[PHOTOS_FILE] = {'sheet': docs[PHOTOS_FILE].get('sheet') or {}}
    obs = {k[0] for d in work.values() if d is not None for p in records(d) for k in [ids(p)] if k}
    found, seen = fetch(obs, get)
    nc_before = pierre_nc({f: d for f, d in docs.items() if d is not None})
    rep = refresh(work, found, seen, subject_of, role_of)
    if docs.get(PHOTOS_FILE) is not None:
        docs[PHOTOS_FILE]['sheet'] = work[PHOTOS_FILE]['sheet']
    if write:
        write_all(root, docs, before)
        after = {f: load(root, f) for f in names}
    else:
        after = docs
    nc_after = pierre_nc({f: d for f, d in after.items() if d is not None})
    rep['asked'] = len(obs)
    log(f'{len(obs)} observations asked, {len(seen)} answered')
    log(report_text(rep, nc_before, nc_after))
    if summary:
        with open(summary, 'a', encoding='utf-8') as fh:
            fh.write(report_text(rep, nc_before, nc_after, md=True))
        for f, x, old, new in rep['left']:
            log(f'::warning title=Photo left play (licence)::{f}: {x} is now {new or "all rights reserved"} (was {old or "none"})')
    rep['nc'] = (nc_before, nc_after)
    return rep


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--dry', action='store_true', help='ask and report, write nothing')
    ap.add_argument('--summary', help='append the report in Markdown to this file; warn for each photo that left play')
    a = ap.parse_args()
    run(write=not a.dry, summary=a.summary)


if __name__ == '__main__':
    main()
