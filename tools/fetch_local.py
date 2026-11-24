# Fetches candidate photos (iNaturalist, open licence) the site doesn't use yet: taken near Dauin (40 km), plus elsewhere
# in the Philippines for genera with few Dauin photos, nearest first: within REGION_KM of Dauin (Negros, Cebu, Bohol,
# Siquijor, northern Mindanao), then the rest of the country, so a species never seen in the Philippines does not come
# in through a wider search. Captive observations (aquariums) are left out at the source (captive=false).
# Last resort, when the Philippines tiers have nothing more: Research Grade photos taken elsewhere, only of species
# confirmed in the Philippines by the presence rule (tools/presence.py, rule C8), at most WORLD_CAP waiting (loc world).
# Accepted IDs: Research Grade, or a genus-level community ID (Needs ID, 2+ identifications agreeing on the genus or
# below), or, in the Philippines only, a trusted expert's identification (EXPERTS) at the genus or below that no other
# current identification disagrees with (expert_ok). Abroad: Research Grade only.
# Licences: CC0, CC BY, CC BY-NC, never share-alike (it would block a later commercial reuse), checked photo by photo.
# drop_share_alike takes the waiting share-alike candidates out of data/cand.json at each run (never one curation.json names);
# the share-alike photos already on the site are the admin's to keep or remove (admin To do › Share-alike), never here.
# Pierre's own observations are no part of those caps (rule P1, docs/decisions/2026-11-24-own-observations-everywhere.md):
# one read of his observations of every genus (own_pool), every one taken with every usable photo before the caps, the
# Key-only need and PER_OBS apply, on the fish's and the sea slugs' criteria for his own (own_take: identified at the
# genus or below, Research Grade or Needs ID; his photo even without a licence); they count as waiting, so a genus they
# fill takes no other observer's. --own: his only.
# Caps, so the pile to sort stays small: at most DAUIN_CAP Dauin observations waiting per genus, Philippines ones only
# while the genus has fewer than POOR Dauin photos, at most PH_CAP waiting. Each observation brings all its photos
# (PER_OBS guards against an odd one with dozens; a game question shows the views of one colony); sorting by view,
# quality and near-duplicates is the judging pass's (judging/BRIEF.md).
# Key-only genera (data.json "x" genera no game asks, tools/genera.py): a sheet and the Coral ID Key show at most
# CAP.sheet (core.js, 6) photos of a view, and only Colony and Close-up matter, so such a genus keeps at most as many
# observations waiting, over all sources, as the colonies it still lacks (key_need); one that lacks none gets nothing.
# Only waiting candidates count, so a re-run (GitHub Action after each publish) refills what the admin sorted. Lists them
# in data.json "cand"; the app ignores it, the admin approves candidates in admin.html. Run from the repo root.
# New candidates are not downloaded (r: 1 = shown straight from iNaturalist): only those the admin adds are, by
# tools/fetch_approved.py (GitHub Action on each curation.json publish), so the repo never stores rejected photos.
# --plan: offline, prints as JSON what a run would refill (new observations it may add per genus and source, and a
# Key-only genus's need) without asking iNaturalist; tests/fetch_local.test.js checks it.
# --tidy: offline, refills nothing: only puts back the photos the admin restored, drops the excluded photos and the waiting
# share-alike candidates, and re-splits data.json / data/cand.json (tidy(), which every refill ends with), so the lists follow
# a Publish without asking iNaturalist.
import json, math, re, sys, urllib.request
import inat  # the one paced, retried iNaturalist client (rule C7)
from collections import Counter
from datajson import load_all, dump_all, curated  # data.json + data/cand.json (candidates waiting live in data/cand.json)
from excluded import excluded, drop_excluded, restore_unexcluded, load_gone, save_gone, set_aside, SUG
from genera import key_only, cap_sheet
from presence import confirmed_species  # the presence rule, defined once
from taxonomy import inat_taxon  # the iNaturalist taxon of each genus, from tools/taxonomy.json
from rights import licence, rights_rank  # a photo's licence and its rights tie-break, as core.js licOf / rightsRank
UA = {'User-Agent': inat.UA}
LIC = 'cc-by,cc-by-nc,cc0'  # never share-alike: cc-by-sa and cc-by-nc-sa left out
LICS = set(LIC.split(','))
# Trusted identifiers: `thamnasteroid` is by far the top identifier of stony corals in the
# Philippines; an observation whose identification by them is at the genus searched or below, with no other current
# identification disagreeing, is accepted in the Philippines tiers, as a genus-level community taxon is (gid).
EXPERTS = {'thamnasteroid'}
# The iNaturalist taxon searched for a genus is the one tools/taxonomy.json gives it (gen.<genus>.inat.id): no search by name, so no homonym guard (the Astrea snail and plant, the
# fire, blue and organ pipe corals off Scleractinia). A genus the file does not hold (new in data.json: run
# tools/taxonomy.py) or whose taxon is inactive is skipped and said so. Another taxon only by the admin's decision.
DAUIN = 'lat=9.19&lng=123.26&radius=40'
REGION_KM = 250  # the second ring around Dauin, then all the Philippines
REGION = f'lat=9.19&lng=123.26&radius={REGION_KM}'
DAUIN_CAP, PH_CAP, WORLD_CAP, PER_OBS = 15, 6, 6, 12
# One-off backlog runs, mainly for the genera that lack photos:
#   python3 tools/fetch_local.py --dauin 30 --ph 20 --ph-all [Genus...]
# --dauin / --ph raise the caps (observations waiting), --ph-all fetches Philippines candidates whatever the Dauin count.
def flag(name, default):
    a = sys.argv
    return int(a[a.index(name) + 1]) if name in a else default
PHILIPPINES = 'place_id=6873'
POOR = 15  # fewer Dauin photos (site + candidates) than this: also fetch Philippines candidates
# iNaturalist slows clients down with HTTP 429 ("normal_throttling"). Every request goes through tools/inat.py
# (rule C7, shared by every iNaturalist tool): it waits PACE (1 s) after the last one and, on 429, 5xx or a network
# error, waits (Retry-After when given, else WAITS: 5, 15, 30, 60, 120 s) and tries again, failing only after the last.
# The searches below are one per genus and source on purpose: they are in votes order, and iNaturalist orders the
# observations of equal votes in no fixed way, so a search over several genera at once would not give each genus the
# same 200. The presence rule's counts are batched.


def get(u):
    return inat.get(u)


OWN = 'ppericard'  # Pierre's iNaturalist login: his observations come in whatever the room (rule P1)
DAUIN_LL, DAUIN_KM = (9.19, 123.26), 40  # DAUIN, as the fish's tier_of reads it


def own_pool(get, tids):
    """Every observation of Pierre's in the genus taxa `tids`, one search read to its end (a few hundred in all, 200 a
    request; rule C7): Research Grade or Needs ID, never captive, with a photo (its licence is checked photo by photo in
    own_take: his photo needs none). Each genus then takes its own from this one read, whatever its room: no per-genus
    search of his."""
    ids = ','.join(map(str, sorted(set(tids))))
    q = f'https://api.inaturalist.org/v1/observations?taxon_id={ids}&user_login={OWN}&quality_grade=research,needs_id&captive=false&photos=true&order_by=id&order=desc&per_page=200'
    out, below = [], None
    while ids:
        r = get(q + (f'&id_below={below}' if below else ''))['results']
        out += r
        if len(r) < 200: break
        below = min(o['id'] for o in r)
    return out


def own_place(o):
    """Where an observation was made: 'dauin' (within DAUIN_KM of Dauin), 'ph' (the Philippines) or 'world'."""
    try:
        la, lo = (float(x) for x in (o.get('location') or '').split(','))
    except ValueError:
        la = lo = None
    if la is not None:
        a, b = math.radians(DAUIN_LL[0]), math.radians(la)
        h = math.sin((b - a) / 2) ** 2 + math.cos(a) * math.cos(b) * math.sin(math.radians(lo - DAUIN_LL[1]) / 2) ** 2
        if 6371 * 2 * math.asin(math.sqrt(h)) <= DAUIN_KM: return 'dauin'
    return 'ph' if 6873 in (o.get('place_ids') or []) else 'world'


def own_take(pool, tid, usedp, confirmed=lambda: (), skip=lambda pid: False):
    """Pierre's own observations of the genus tid in `pool` (own_pool), as [(observation, its photos, loc)], whatever the
    genus's room, caps and waiting count (rule P1, docs/decisions/2026-11-24-own-observations-everywhere.md), as the
    fish's and the sea slugs' (fetch_fish.usable_obs): identified at the genus or below, Research Grade or Needs ID,
    whoever named it, in the Philippines; abroad (the one difference, rules P1 and C8) Research Grade of a species
    confirmed in the Philippines (confirmed() gives their taxon ids). EVERY photo with an accepted licence or none (his
    own: never share-alike nor ND) not taken yet (usedp, updated here: photo ids; skip(id): an excluded photo), never cut
    to PER_OBS. The caller records them; they count as waiting, so they take room from others."""
    out = []
    for o in pool:
        if (o.get('user') or {}).get('login') != OWN or not in_genus(o.get('taxon'), tid):
            continue
        loc = own_place(o)
        if loc == 'world' and not (accepted(o, tid, loc) and {(o.get('taxon') or {}).get('id'), *((o.get('taxon') or {}).get('ancestor_ids') or [])} & set(confirmed())):
            continue
        P = [ph for ph in o['photos'] if (photo_ok(ph) or not ph.get('license_code')) and str(ph['id']) not in usedp and not skip(ph['id'])]
        if P:
            usedp.update(str(ph['id']) for ph in P)
            out.append((o, P, loc))
    return out


def cand_record(g, o, ph, loc):
    """The candidate of genus g for photo ph of observation o, found in `loc` (data.json "cand"'s fields)."""
    return dict(f=f'{g.lower()}-cand-{ph["id"]}', a=ph['attribution'], lic=ph['license_code'] or 'own', o=f'https://www.inaturalist.org/observations/{o["id"]}', t=o['taxon']['name'], own=o['user']['login'] == OWN, loc=loc, src=ph['url'].replace('square', 'original'), r=1, **({} if o['quality_grade'] == 'research' else {'gid': 1}))


def tie_key(o, P, rank):
    """The last keys of an observation in the shortlist (main): Research Grade before the genus-level and expert IDs (the
    order main lists them in; Codex review #742), then its votes (iNaturalist's order, most first), then its rights
    (rights_rank of its best photo P: an open licence or Pierre's own first; Pierre, 2026-11-08, Q270: a tie-break only),
    then its place in the list. An observation without a votes count keeps its place (rank), as before."""
    own = (o.get('user') or {}).get('login') == 'ppericard'
    v = o.get('cached_votes_total')
    best = min(rights_rank({'lic': ph.get('license_code'), 'own': own}) for ph in P)
    grade = 0 if o.get('quality_grade') == 'research' else 1
    return (grade, -v, best, rank) if isinstance(v, int) else (grade, rank, best, rank)


def share_alike(p):
    """A share-alike photo (CC BY-SA, CC BY-NC-SA): no longer accepted for corals (Pierre, 2026-11-05)."""
    return (licence(p) or '').endswith('-sa')


def drop_share_alike(d, keep):
    """Takes the waiting share-alike candidates out of d['cand'], except those curation.json names (keep:
    datajson.curated(), e.g. a candidate Pierre added) and those Pierre restored from Excluded (restored: 1,
    excluded.py restore_unexcluded). Returns the photo ids dropped."""
    gone = []
    for g, L in list((d.get('cand') or {}).items()):
        k = [p for p in L if p['f'] in keep or p.get('restored') or not share_alike(p)]
        gone += [p['f'] for p in L if p not in k]
        if k: d['cand'][g] = k
        else: del d['cand'][g]
    return gone


def in_genus(t, tid):
    """Taxon t is the genus tid or below it."""
    t = t or {}
    return t.get('id') == tid or tid in (t.get('ancestor_ids') or [])


def genus_ok(o, tid):
    """Needs ID observation whose community taxon is this genus or below it, with most identifications agreeing."""
    t = o.get('taxon') or {}
    return bool(o.get('community_taxon_id')) and bool(o.get('identifications_most_agree')) and o['community_taxon_id'] == t.get('id') and in_genus(t, tid)


def lineage(a, b):
    """Taxa a and b on one line of descent: the same, or one an ancestor of the other (no disagreement)."""
    a, b = a or {}, b or {}
    return a.get('id') == b.get('id') or a.get('id') in (b.get('ancestor_ids') or []) or b.get('id') in (a.get('ancestor_ids') or [])


def expert_ok(o, tid):
    """Needs ID observation whose current identification by a trusted expert (EXPERTS) is at the genus tid or below, and
    that no other current identification disagrees with (Pierre, 2026-11-05: trust thamnasteroid's identification; the
    integrator's review of #568). Agreeing = on one line of descent with the expert's taxon: an observer's coarse
    "Stony corals" refined by the expert to the genus is accepted (iNaturalist then has no genus-level community taxon:
    the coarse ID does not support the genus); another genus, or a taxon off that line, refuses. Withdrawn identifications
    do not count; an expert ID above the genus is refused."""
    ids = [i for i in (o.get('identifications') or []) if i.get('current', True)]
    ex = [i for i in ids if ((i.get('user') or {}).get('login') or '').lower() in EXPERTS]
    if not ex: return False
    et = ex[0].get('taxon')
    if not (in_genus(et, tid) and in_genus(o.get('taxon'), tid)): return False
    return all(lineage(i.get('taxon'), et) for i in ids if i not in ex)


def ph_ok(o, tid):
    """An observation the Philippines tiers accept: Research Grade, a genus-level community ID, or an expert's ID."""
    return o.get('quality_grade') == 'research' or (o.get('quality_grade') == 'needs_id' and (genus_ok(o, tid) or expert_ok(o, tid)))


def accepted(o, tid, loc):
    """The identification a tier accepts for genus tid: the Philippines tiers (dauin, ph) take what ph_ok takes; abroad
    (loc world) takes Research Grade only. main uses it, and tools/photo_recheck.py asks it again of a photo in play."""
    return o.get('quality_grade') == 'research' if loc == 'world' else ph_ok(o, tid)


def photo_ok(ph):
    """A photo with an accepted licence (checked photo by photo: one observation may mix licences)."""
    return (ph.get('license_code') or '').lower() in LICS


def kept_views(g, G, cur):
    """A Key-only genus's Colony and Close-up views: wide + medium, or wide + macro for a 2-level genus (curation lv,
    else data.json levels), whose macro photos are its close-ups (admin.js label, capViews)."""
    lv = ((cur.get('genera') or {}).get(g) or {}).get('lv') or (2 if G[g].get('levels') == 2 else 3)
    return ('wide', 'macro') if lv == 2 else ('wide', 'medium')


def _forms():
    """forms.json growth-form guesses {file: form} (admin.js AUTOF); a missing file reads as none."""
    try: return json.load(open('forms.json')).get('gf') or {}
    except (OSError, ValueError): return {}
FORMS = _forms()


def colonies(g, G, cand, cur, excl=lambda f: False):
    """{view: distinct colonies (observations)} of genus g's photos as the admin's gamePool counts them (Codex review
    #390: one rule, mirrored here): data.json views, moved (curation move) and the candidates Pierre added (curation
    add, whichever genus list holds them), with "Not this genus" (curation out) applied both ways; without hidden,
    excluded, sheet-only (curation use 'ref'), extra, several-corals or coral skeleton (skel, rule P6) photos. Views as admin.js
    viewOf: a genus switched to 2 levels by curation (lv) has its medium photos join wide, a genus with 2 levels in
    data.json keeps them apart. Colony leaves out a photo whose growth form is not visible ('x', curation gf, else
    the judging pass's or forms.json's guess, as admin.js fOf) unless the genus has a single growth form."""
    gens = cur.get('genera') or {}
    k = gens.get(g) or {}
    hide, move, add, out = set(k.get('hide') or []), k.get('move') or {}, k.get('add') or {}, k.get('out') or {}
    ref = {f for f, u in (cur.get('use') or {}).items() if u == 'ref'}
    merge = kept_views(g, G, cur)[1] == 'macro' and G[g].get('levels') != 2
    gf = cur.get('gf') or {}
    form = lambda f: re.sub('[pn]', '', gf.get(f) or '') or re.sub('[pn]', '', (SUG.get(f) or {}).get('fm') or FORMS.get(f) or '')
    got = []  # (view, photo): every photo of the genus as curated, before the game filters
    def put(p, v, mv=move):
        v = mv.get(p['f'], v)
        got.append(('wide' if merge and v == 'medium' else v, p))
    for v, L in (G[g].get('views') or {}).items():
        for p in L:
            if p['f'] not in out: put(p, v)
    for L in cand.values():
        for p in L:
            if p['f'] in add and p['f'] not in out: put(p, add[p['f']])
    for m, km in gens.items():
        if m == g or m not in G: continue
        sent = {f for f, t in (km.get('out') or {}).items() if t == g}
        if not sent: continue
        for v, L in (G[m].get('views') or {}).items():
            for p in L:
                if p['f'] in sent: put(p, v, km.get('move') or {})
        madd = km.get('add') or {}
        for L in cand.values():
            for p in L:
                if p['f'] in sent and p['f'] in madd: put(p, madd[p['f']], {})
    one_form = len({form(p['f']) for _, p in got if not p.get('multi') and p['f'] not in hide} - {'', 'x'}) == 1
    by = {}
    for v, p in got:
        if p.get('multi') or p.get('extra') or p.get('skel') or p['f'] in hide or p['f'] in ref or excl(p['f']): continue
        if v == 'wide' and form(p['f']) == 'x' and not one_form: continue
        by.setdefault(v, set()).add(p.get('o') or p['f'])
    return {v: len(s) for v, s in by.items()}


def key_need(g, G, cand, cur, excl=lambda f: False, cap=None):
    """Colonies a Key-only genus still lacks: cap (core.js CAP.sheet) per Colony and Close-up view, minus those it has."""
    cap = cap_sheet() if cap is None else cap
    have = colonies(g, G, cand, cur, excl)
    return sum(max(0, cap - have.get(v, 0)) for v in kept_views(g, G, cur))


def room(cap, waiting_here, need=None, waiting_all=0):
    """New observations a run may add for one genus and source: up to the source's cap of observations waiting; for a
    Key-only genus (need not None) also no more, over all sources, than the colonies it lacks."""
    r = cap - waiting_here
    return r if need is None else min(r, need - waiting_all)


def tidy(d, gone=None):
    """Brings the photo lists in line with curation.json, offline: puts back the photos Pierre restored (un-excluded in
    admin Genera › Excluded) from data/excluded.json, drops the photos he excluded (tools/excluded.py drop_excluded: from every
    list, candidates included, each kept in data/excluded.json; the auto-sort's exclusions keep their candidate entry, for its
    Undo), then the waiting share-alike candidates. dump_all then splits the candidates: data.json keeps those
    curation.json uses, data/cand.json the others. Every refill ends with it; --tidy runs it alone. gone: data/excluded.json
    "photos" (read and written here when not given)."""
    own = gone is None
    if own: gone = load_gone()
    back, held = restore_unexcluded(d, gone)
    if back: print('restored (no longer excluded):', ', '.join(back))
    if held: print('not excluded any more, held in data/excluded.json (its file is not in img/, or its genus left):', ', '.join(held))
    drop_excluded(d, gone)  # first, so an excluded share-alike candidate is kept too, for a Restore
    sa = drop_share_alike(d, curated())
    if sa: print('share-alike candidates dropped:', len(sa))
    if own: save_gone(gone)
    return d


def main():
    DAUIN_CAP_, PH_CAP_ = flag('--dauin', DAUIN_CAP), flag('--ph', PH_CAP)
    PH_ALL = '--ph-all' in sys.argv
    PLAN = '--plan' in sys.argv
    d = load_all()
    if '--tidy' in sys.argv:
        # Offline, no iNaturalist: the Candidate photos workflow runs it last, before its commit, so a Publish with
        # exclusions or un-added candidates leaves data.json and data/cand.json consistent.
        dump_all(tidy(d))
        print('photo lists tidied')
        return
    # The Coral Finder's extra genera (data.json x, tools/build_extra.py) get candidates too.
    GEN = {**d['gen'], **((d.get('x') or {}).get('gen') or {})}
    KEY_ONLY = set(key_only(d))
    ONLY = {a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith('--') and sys.argv[i - 1] not in ('--dauin', '--ph')}
    used = {p.get('o') for g in GEN.values() for L in [*g['views'].values(), *(g.get('more') or {}).values()] for p in L}
    usedp = {re.sub(r'\D', '', p['f'].split('-')[-1]) for g in GEN.values() for L in [*g['views'].values(), *(g.get('more') or {}).values()] for p in L}
    cand = d.get("cand") or {}
    usedp |= {p['f'].split('-')[-1] for L in cand.values() for p in L}
    # A photo the admin restored comes back under its own name at the end (tidy), never as a new candidate.
    usedp |= {re.sub(r'\D', '', f.split('-')[-1]) for f in load_gone()}
    # The admin's decisions on candidates (curation.json): added, rejected (seen 'cand:f'), sent to another genus, excluded.
    CUR = json.load(open('curation.json'))
    ADDED = {f for k in (CUR.get('genera') or {}).values() for f in (k.get('add') or {})}
    GONE = {f for k in (CUR.get('genera') or {}).values() for f in (k.get('out') or {})} | {k[5:] for k in (CUR.get('seen') or {}) if k.startswith('cand:')}
    # Candidates still waiting for the admin: the caps count only these, so each run refills what he has sorted.
    waiting = lambda p: p['f'] not in ADDED and p['f'] not in GONE and not excluded(p['f']) and not set_aside(p['f']) and not p.get('skel')
    def dauin_n(g):
        x = GEN[g]
        return sum(p.get('loc') == 'dauin' or p.get('own') for L in x['views'].values() for p in L) + sum(p.get('loc') == 'dauin' and p['f'] not in GONE and not excluded(p['f']) for p in cand.get(g, []))
    # Observations waiting for genus g: from one source (loc) or all.
    # A Key-only genus's candidates guessed to be in a view it does not keep (Corallites) are not shown (admin.js
    # candQueue, capViews): they do not count as waiting either, or they would hold the room.
    # Nor do those of a view that already has its colonies: admin.js candQueue marks them full and
    # hides them, and they would hold the room another view lacks.
    HAVE, CAPS = {}, cap_sheet()
    def shown(g, p):
        if g not in KEY_ONLY: return True
        v = (SUG.get(p['f']) or {}).get('v') or p.get('vg')
        keep = kept_views(g, GEN, CUR)
        if keep[1] == 'macro' and v == 'medium': v = 'wide'
        if not v: return True
        if g not in HAVE: HAVE[g] = colonies(g, GEN, cand, CUR, excluded)
        return v in keep and HAVE[g].get(v, 0) < CAPS
    def waiting_obs(g, loc=None):
        return {p.get('o') for p in cand.get(g, []) if (loc is None or p.get('loc') == loc) and waiting(p) and shown(g, p)}
    need = lambda g: key_need(g, GEN, cand, CUR, excluded) if g in KEY_ONLY else None
    def room_for(g, where):
        loc = 'dauin' if where == DAUIN else 'world' if where == 'world' else 'ph'
        if where != DAUIN and dauin_n(g) >= POOR and not PH_ALL: return loc, 0
        return loc, room({'dauin': DAUIN_CAP_, 'ph': PH_CAP_, 'world': WORLD_CAP}[loc], len(waiting_obs(g, loc)), need(g), len(waiting_obs(g)))
    if PLAN:
        # drop: waiting share-alike candidates a run would take out of data/cand.json (drop_share_alike), shown only when some.
        keep = curated()
        drop = Counter(g for g, L in cand.items() for p in L if p['f'] not in keep and not p.get('restored') and share_alike(p))
        print(json.dumps({g: {'keyonly': g in KEY_ONLY, 'need': need(g), **{k: max(0, r) for k, r in (room_for(g, w) for w in (DAUIN, PHILIPPINES))}, **({'drop': drop[g]} if drop[g] else {})} for g in GEN if not ONLY or g in ONLY}))
        return
    # Pierre's own observations of every genus, one read (own_pool), taken whatever the genus's room, caps and Key-only need
    # (rule P1: every one that meets the usual criteria, with every usable photo; they count as waiting for the room of
    # the others). --own: his alone, no other search.
    TIDS = {g: inat_taxon(g, 'coral') for g in GEN if not ONLY or g in ONLY}
    POOL = own_pool(get, [t for t in TIDS.values() if t])
    for g in GEN:
        if ONLY and g not in ONLY: continue
        tid = TIDS[g]
        if not tid: print(g, 'has no active iNaturalist taxon in tools/taxonomy.json (run python3 tools/taxonomy.py): skipped'); continue
        def confirmed(tid=tid, memo={}):  # the species of the genus confirmed in the Philippines: asked once, only for an observation abroad
            if 'sp' not in memo: memo['sp'] = list(confirmed_species(get, tid, 'coral', '&captive=false'))
            return memo['sp']
        mine_ = own_take(POOL, tid, usedp, confirmed, lambda i: excluded(photo_id=i))
        for o, P, loc in mine_:
            for ph in P: cand.setdefault(g, []).append(cand_record(g, o, ph, loc))
        if mine_: print(g, "Pierre's own:", len(mine_), 'observations,', sum(len(P) for _, P, _ in mine_), 'photos')
        if '--own' in sys.argv: continue
        if need(g) == 0:
            print(g, 'enough for a Key-only genus, not refilled'); continue
        # The region around Dauin fills the Philippines room first; the whole country only takes what room is left.
        ph_room = 0
        for where in (DAUIN, REGION, PHILIPPINES, 'world'):
            loc, r = room_for(g, where)
            if where == 'world':
                if ph_room <= 0: continue  # the Philippines still had candidates: no need to look further
                # Only species the presence rule confirms in the Philippines (tools/presence.py, rule C8).
                sp = sorted(confirmed_species(get, tid, 'coral', '&captive=false'))
                if not sp: continue  # no species confirmed in the Philippines: nothing from abroad
                where = f'taxon_id={",".join(map(str, sp))}&not_in_place=6873'
            if r <= 0: continue
            out = cand.setdefault(g, [])
            W = waiting_obs(g, loc)  # observations already waiting
            q = where if loc == 'world' else f'taxon_id={tid}&{where}'
            grade = 'research' if loc == 'world' else 'research,needs_id'  # abroad: species-level IDs only
            res = get(f'https://api.inaturalist.org/v1/observations?{q}&quality_grade={grade}&captive=false&photos=true&photo_license={LIC}&order_by=votes&per_page=200')
            obs, more = res['results'], res.get('total_results', 0) > len(res['results'])
            # Research Grade first, then genus-level community IDs and expert IDs (votes order within each); abroad
            # Research Grade only (the query asks for nothing else).
            obs = [o for o in obs if o['quality_grade'] == 'research'] + [o for o in obs if o['quality_grade'] != 'research' and accepted(o, tid, loc)]
            # Shortlist that varies: pick one by one the observation whose species and observer are least represented
            # so far (votes order breaks ties), and take all its photos. Between observations of as many votes, one with an
            # open licence (CC0, CC BY) or the admin's own before CC BY-NC (tie_key: rights_rank of its best photo, a
            # tie-break only), then the votes order.
            pool = []
            for rank, o in enumerate(obs):
                P = [ph for ph in o['photos'] if photo_ok(ph) and str(ph['id']) not in usedp and not excluded(photo_id=ph['id'])][:PER_OBS]
                if P: pool.append((o, P, tie_key(o, P, rank)))
            n = Counter()
            for p in out: n['t', p.get('t')] += 1
            while pool and r > 0:
                o, P, _k = min(pool, key=lambda x: (n['t', x[0]['taxon']['name']], n['u', x[0]['user']['login']], x[2]))
                pool = [x for x in pool if x[0]['id'] != o['id']]
                url = f'https://www.inaturalist.org/observations/{o["id"]}'
                n['t', o['taxon']['name']] += 1; n['u', o['user']['login']] += 1
                # An observation already waiting (more of its photos) is not a new one: only new observations use the room.
                if url not in W: W.add(url); r -= 1
                for ph in P:
                    usedp.add(str(ph['id']))
                    out.append(cand_record(g, o, ph, loc))
            # Room the whole country could not fill, from ALL its observations: when the one page read is not all of them,
            # later pages may still hold some, so nothing from abroad.
            if where == PHILIPPINES: ph_room = 0 if more else r
        if g in cand and not cand[g]: del cand[g]
        print(g, len(cand.get(g, [])))
    d['cand'] = cand
    tidy(d)
    dump_all(d)
    print('total', sum(map(len, d.get('cand', {}).values())))


if __name__ == '__main__':
    main()
