# Fetches candidate photos (iNaturalist, open licence) that the site doesn't use yet: taken near Dauin (40 km), plus
# elsewhere in the Philippines for genera with few Dauin photos, nearest first: within REGION_KM of Dauin (Negros, Cebu,
# Bohol, Siquijor, northern Mindanao), then the rest of the country. Never outside the Philippines (Pierre, 2026-11-03:
# a species never seen in the Philippines must not come in through a wider search).
# Captive observations (aquariums) are left out at the source (captive=false).
# Last resort (Pierre, 2026-11-03: "si vraiment on est en galère … seulement si l'espèce est confirmée aux Philippines"):
# when the Philippines tiers leave room (nothing more there), Research Grade photos taken elsewhere, but only of species
# with Research Grade observations in the Philippines (iNaturalist species counts), at most WORLD_CAP waiting (loc world). Accepted IDs: Research Grade, or a genus-level community
# ID (Needs ID, at least 2 identifications agreeing on the genus or below: iNat needs 2+ IDs for a community taxon).
# Caps (Pierre, 2026-10-31, so the pile to sort stays small): at most DAUIN_CAP Dauin observations waiting per genus,
# Philippines ones only while the genus has fewer than POOR Dauin photos, at most PH_CAP waiting. Each observation brings
# ALL its photos (PER_OBS only guards against an odd one with dozens; Pierre, 2026-11-01: "on my observations I take at
# least three: the colony, closer, a macro"; a game question shows the views of ONE colony). No order is assumed: an
# observer may take five photos at one zoom; sorting by view, quality and near-duplicates is for the judging pass
# afterwards (judging/AGENTS.md), so that what Pierre sees keeps a real variety. Until then it was 2 photos per
# observation (its first and last) and the caps counted photos.
# Finder-only genera (Pierre, 2026-11-03: "quiz first"; data.json "x" genera no game asks, tools/genera.py): a sheet and
# the Coral Finder show at most CAP.sheet (core.js, 6) photos of a view, and only Colony and Close-up matter ("nobody uses
# the Coral Finder on a corallite close-up"). So such a genus keeps at most as many observations waiting, over all
# sources, as the colonies it still lacks (finder_need: 6 per Colony and Close-up view, minus the colonies it already has
# there), and a genus that lacks none gets no new candidates. Game genera keep the caps above.
# Only waiting candidates count, so a re-run (GitHub Action after each publish) refills what Pierre sorted. Lists them in data.json "cand".
# The app ignores "cand"; Pierre approves candidates in admin.html. Run from the repo root.
# New candidates are NOT downloaded (r: 1 = shown straight from iNaturalist, from src): only the ones Pierre adds are,
# by tools/fetch_approved.py (GitHub Action on each curation.json publish), so the repo never stores rejected photos.
# --plan: offline, prints as JSON what a run would refill (new observations it may add per genus and source, and a
# Finder-only genus's need) without asking iNaturalist; tests/fetch_local.test.js checks it.
import json, re, sys, time, urllib.request
from collections import Counter
from datajson import load_all, dump_all  # data.json + cand.json (candidates waiting live in cand.json)
from excluded import excluded, drop_excluded, set_aside, SUG
from genera import finder_only, cap_sheet
UA = {'User-Agent': 'coral-id-imr/1.0'}
LIC = 'cc-by,cc-by-nc,cc0,cc-by-sa,cc-by-nc-sa'
SCLERACTINIA = 47532  # iNaturalist taxon for stony corals; guards against homonym genera (e.g. Astrea snails)
DAUIN = 'lat=9.19&lng=123.26&radius=40'
REGION_KM = 250  # Pierre, 2026-11-03: "un rayon de 200 km autour de Dauin ou 300 km", then all the Philippines
REGION = f'lat=9.19&lng=123.26&radius={REGION_KM}'
DAUIN_CAP, PH_CAP, WORLD_CAP, PER_OBS = 15, 6, 6, 12
# One-off backlog runs (Pierre, 2026-11-01: "fetch a good backlog quickly, mainly for the genera that lack photos"):
#   python3 tools/fetch_local.py --dauin 30 --ph 20 --ph-all [Genus...]
# --dauin / --ph raise the caps (observations waiting), --ph-all fetches Philippines candidates whatever the Dauin count.
def flag(name, default):
    a = sys.argv
    return int(a[a.index(name) + 1]) if name in a else default
PHILIPPINES = 'place_id=6873'
POOR = 15  # fewer Dauin photos (site + candidates) than this: also fetch Philippines candidates
get = lambda u: json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60))


def kept_views(g, G, cur):
    """A Finder-only genus's Colony and Close-up views: wide + medium, or wide + macro for a 2-level genus (curation lv,
    else data.json levels), whose macro photos are its close-ups (admin.js label, capViews)."""
    lv = ((cur.get('genera') or {}).get(g) or {}).get('lv') or (2 if G[g].get('levels') == 2 else 3)
    return ('wide', 'macro') if lv == 2 else ('wide', 'medium')


def colonies(g, G, cand, cur, excl=lambda f: False):
    """{view: distinct colonies (observations)} of genus g's photos as curated: data.json views, moved (curation move)
    and the candidates Pierre added (curation add, whichever genus list holds them), without hidden, excluded,
    sheet-only (use 'ref'), several-corals or Coral Finder book photos. A 2-level genus's medium photos join wide (as the admin's viewOf)."""
    gens = cur.get('genera') or {}
    k = gens.get(g) or {}
    hide, move, add, out = set(k.get('hide') or []), k.get('move') or {}, k.get('add') or {}, k.get('out') or {}
    # A colony set to "sheet only" (curation use 'ref') no longer counts, as admin.js gamePool (Codex review #390).
    ref = {f for f, u in (cur.get('use') or {}).items() if u == 'ref'}
    lv2 = kept_views(g, G, cur)[1] == 'macro'
    by = {}
    def put(p, v, mv=move):
        if p.get('multi') or p.get('cf') or p['f'] in hide or p['f'] in ref or excl(p['f']): return
        v = mv.get(p['f'], v)
        if lv2 and v == 'medium': v = 'wide'
        by.setdefault(v, set()).add(p.get('o') or p['f'])
    # "Not this genus" (curation out, as admin.js photos/cands; Codex review #390): a photo sent away leaves the genus,
    # one sent here from another genus joins it in its view.
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
    return {v: len(s) for v, s in by.items()}


def finder_need(g, G, cand, cur, excl=lambda f: False, cap=None):
    """Colonies a Finder-only genus still lacks: cap (core.js CAP.sheet) per Colony and Close-up view, minus those it has."""
    cap = cap_sheet() if cap is None else cap
    have = colonies(g, G, cand, cur, excl)
    return sum(max(0, cap - have.get(v, 0)) for v in kept_views(g, G, cur))


def room(cap, waiting_here, need=None, waiting_all=0):
    """New observations a run may add for one genus and source: up to the source's cap of observations waiting; for a
    Finder-only genus (need not None) also no more, over all sources, than the colonies it lacks."""
    r = cap - waiting_here
    return r if need is None else min(r, need - waiting_all)


def main():
    DAUIN_CAP_, PH_CAP_ = flag('--dauin', DAUIN_CAP), flag('--ph', PH_CAP)
    PH_ALL = '--ph-all' in sys.argv
    PLAN = '--plan' in sys.argv
    d = load_all()
    # The Coral Finder's extra genera (data.json x, tools/build_extra.py) get candidates too; the three that are not
    # stony corals (fire, blue, organ pipe coral) are matched as animals instead of under Scleractinia.
    GEN = {**d['gen'], **((d.get('x') or {}).get('gen') or {})}
    FINDER = set(finder_only(d))
    NONSCL = {n for n, g in GEN.items() if (g.get('x') or {}).get('nonscl')}
    ONLY = {a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith('--') and sys.argv[i - 1] not in ('--dauin', '--ph')}
    used = {p.get('o') for g in GEN.values() for L in [*g['views'].values(), *(g.get('more') or {}).values()] for p in L}
    usedp = {re.sub(r'\D', '', p['f'].split('-')[-1]) for g in GEN.values() for L in [*g['views'].values(), *(g.get('more') or {}).values()] for p in L}
    cand = d.get("cand") or {}
    usedp |= {p['f'].split('-')[-1] for L in cand.values() for p in L}
    # Needs ID observation whose community taxon is this genus or below it, with most identifications agreeing.
    def genus_ok(o, tid):
        t = o.get('taxon') or {}
        return bool(o.get('community_taxon_id')) and o.get('identifications_most_agree') and o['community_taxon_id'] == t.get('id') and (t.get('id') == tid or tid in (t.get('ancestor_ids') or []))
    # Pierre's decisions on candidates (curation.json): added, rejected (seen 'cand:f'), sent to another genus, excluded.
    CUR = json.load(open('curation.json'))
    ADDED = {f for k in (CUR.get('genera') or {}).values() for f in (k.get('add') or {})}
    GONE = {f for k in (CUR.get('genera') or {}).values() for f in (k.get('out') or {})} | {k[5:] for k in (CUR.get('seen') or {}) if k.startswith('cand:')}
    # Candidates still waiting for Pierre: the caps count only these, so each run refills what he has sorted.
    waiting = lambda p: p['f'] not in ADDED and p['f'] not in GONE and not excluded(p['f']) and not set_aside(p['f'])
    def dauin_n(g):
        x = GEN[g]
        return sum(p.get('loc') == 'dauin' or p.get('own') for L in x['views'].values() for p in L) + sum(p.get('loc') == 'dauin' and p['f'] not in GONE and not excluded(p['f']) for p in cand.get(g, []))
    # Observations waiting for genus g: from one source (loc) or all.
    # A Finder-only genus's candidates guessed to be in a view it does not keep (Corallites) are not shown (admin.js
    # candQueue, capViews): they do not count as waiting either (Codex review #390), or they would hold the room.
    # Nor do those of a view that already has its colonies (Codex review #390): admin.js candQueue marks them full and
    # hides them, and they would hold the room another view lacks.
    HAVE, CAPS = {}, cap_sheet()
    def shown(g, p):
        if g not in FINDER: return True
        v = (SUG.get(p['f']) or {}).get('v') or p.get('vg')
        keep = kept_views(g, GEN, CUR)
        if keep[1] == 'macro' and v == 'medium': v = 'wide'
        if not v: return True
        if g not in HAVE: HAVE[g] = colonies(g, GEN, cand, CUR, excluded)
        return v in keep and HAVE[g].get(v, 0) < CAPS
    def waiting_obs(g, loc=None):
        return {p.get('o') for p in cand.get(g, []) if (loc is None or p.get('loc') == loc) and waiting(p) and shown(g, p)}
    need = lambda g: finder_need(g, GEN, cand, CUR, excluded) if g in FINDER else None
    def room_for(g, where):
        loc = 'dauin' if where == DAUIN else 'world' if where == 'world' else 'ph'
        if where != DAUIN and dauin_n(g) >= POOR and not PH_ALL: return loc, 0
        return loc, room({'dauin': DAUIN_CAP_, 'ph': PH_CAP_, 'world': WORLD_CAP}[loc], len(waiting_obs(g, loc)), need(g), len(waiting_obs(g)))
    if PLAN:
        print(json.dumps({g: {'finder': g in FINDER, 'need': need(g), **{k: max(0, r) for k, r in (room_for(g, w) for w in (DAUIN, PHILIPPINES))}} for g in GEN if not ONLY or g in ONLY}))
        return
    for g in GEN:
        if ONLY and g not in ONLY: continue
        if need(g) == 0:
            print(g, 'enough for a Finder-only genus, not refilled'); continue
        T = [t for t in get(f'https://api.inaturalist.org/v1/taxa?q={g}&rank=genus&per_page=10')['results'] if t['name'] == g and (SCLERACTINIA in t.get('ancestor_ids', []) or (g in NONSCL and t.get('iconic_taxon_name') == 'Animalia'))]
        if not T: print('no taxon', g); continue
        # The region around Dauin fills the Philippines room first; the whole country only takes what room is left.
        ph_room = 0
        for where in (DAUIN, REGION, PHILIPPINES, 'world'):
            loc, r = room_for(g, where)
            if where == 'world':
                if ph_room <= 0: continue  # the Philippines still had candidates: no need to look further
                sp = get(f'https://api.inaturalist.org/v1/observations/species_counts?taxon_id={T[0]["id"]}&{PHILIPPINES}&quality_grade=research&captive=false&per_page=200')['results']
                sp = [x['taxon']['id'] for x in sp if x['taxon'].get('rank') == 'species']
                if not sp: continue  # no species confirmed in the Philippines: nothing from abroad
                where = f'taxon_id={",".join(map(str, sp))}&not_in_place=6873'
            if r <= 0: continue
            out = cand.setdefault(g, [])
            W = waiting_obs(g, loc)  # observations already waiting
            q = where if loc == 'world' else f'taxon_id={T[0]["id"]}&{where}'
            grade = 'research' if loc == 'world' else 'research,needs_id'  # abroad: species-level IDs only
            res = get(f'https://api.inaturalist.org/v1/observations?{q}&quality_grade={grade}&captive=false&photos=true&photo_license={LIC}&order_by=votes&per_page=200')
            obs, more = res['results'], res.get('total_results', 0) > len(res['results'])
            # Research Grade first, then genus-level community IDs (votes order within each).
            obs = [o for o in obs if o['quality_grade'] == 'research'] + [o for o in obs if o['quality_grade'] == 'needs_id' and genus_ok(o, T[0]['id'])]
            # Shortlist that varies (Pierre): pick one by one the observation whose species and observer are least represented
            # so far (votes order breaks ties), and take all its photos.
            pool = []
            for rank, o in enumerate(obs):
                P = [ph for ph in o['photos'] if ph.get('license_code') and str(ph['id']) not in usedp and not excluded(photo_id=ph['id'])][:PER_OBS]
                if P: pool.append((o, P, rank))
            n = Counter()
            for p in out: n['t', p.get('t')] += 1
            while pool and r > 0:
                o, P, rank = min(pool, key=lambda x: (n['t', x[0]['taxon']['name']], n['u', x[0]['user']['login']], x[2]))
                pool = [x for x in pool if x[0]['id'] != o['id']]
                url = f'https://www.inaturalist.org/observations/{o["id"]}'
                n['t', o['taxon']['name']] += 1; n['u', o['user']['login']] += 1
                # An observation already waiting (more of its photos) is not a new one: only new observations use the room.
                if url not in W: W.add(url); r -= 1
                for ph in P:
                    usedp.add(str(ph['id']))
                    out.append(dict(f=f'{g.lower()}-cand-{ph["id"]}', a=ph['attribution'], lic=ph['license_code'], o=url, t=o['taxon']['name'], own=o['user']['login'] == 'ppericard', loc=loc, src=ph['url'].replace('square', 'original'), r=1, **({} if o['quality_grade'] == 'research' else {'gid': 1})))
            # Room the whole country could not fill, from ALL its observations: when the one page read is not all of them,
            # later pages may still hold some, so nothing from abroad (Codex review #388).
            if where == PHILIPPINES: ph_room = 0 if more else r
            time.sleep(0.5)
        if g in cand and not cand[g]: del cand[g]
        print(g, len(cand.get(g, [])))
    d['cand'] = cand
    drop_excluded(d)
    dump_all(d)
    print('total', sum(map(len, cand.values())))


if __name__ == '__main__':
    main()
