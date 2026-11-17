#!/usr/bin/env python3
"""The sea slugs' look-alike candidates (a survey, nothing enters the game): docs/reviews/2026-11-17-seaslug-lookalikes-survey.md.

Pierre, 2026-11-17: had we looked at every look-alike and confusion group already published online? This tool gathers
them from two kinds of source and writes one file of candidates, tools/seaslug_lookalikes_cand.json, that the game does
not read (the decided pairs stay in tools/seaslugs.json lookalikes, read by tools/seaslug_game.py).

Sources:
  - iNaturalist's "similar species" (v1/identifications/similar_species): for a taxon, the taxa of the same rank that its
    observations were also identified as, or whose observations were also identified as it, with the number of such
    observations (iNaturalist: "ordered by combined frequency", so a pair's count is the same from either side). Asked for
    each species and genus of the subject's circles (seaslug.json: 205 species, 78 genera) in the Philippines (place 6873)
    and worldwide; with the observations of each taxon in both scopes (every quality grade, as similar_species counts)
    for the rates. Rule C7: tools/inat.py (one request a second, a User-Agent, paced retries), the species counts batched.
  - WoRMS (REST AphiaSourcesByAphiaID, for the same species and genera): the references it cites; a reference whose title
    names a colour group, mimicry, cryptic species or a species complex makes a set of the species citing it.
  - English Wikipedia (each species' own article, the wikitext 50 titles a request) and GBIF (each species' descriptions,
    the treatments extracted from papers): the sentences that compare (KEY) and name a species of the list, quoted.
  - The literature sets of tools/seaslug_lookalikes_source.json (hand-kept: each set with its source, a quote and what was
    read, rule C2): the Sea Slug Forum, Nudi Pixel's look-alike groups, the papers. A member named by a synonym or by
    WoRMS's accepted name is read as the list's name (recorded in the group's `as`).

Kept (rules C6, C8): a partner in the subject (seaslug.json) or confirmed in the Philippines (tools/seaslugs.json, the
452 species rule C8 confirms; at the genus rank, a genus of one of them). The other partners are listed apart with why.

tools/seaslug_lookalikes_cand.json:
  - pairs [{rank: species|genus, a, b, ph {n, share [a, b], rate [a, b]}, world {...}, genus {ph, world, pairs} (a
    genus pair: the species pairs across the two genera, summed), lit [set ids], text [{src, of, ref, quote}] (at most
    3), crossGenus, crossFamily, kept [a, b]: "subject" or "confirmed", genusOnly (a genus pair with no species pair of
    the subject nor a set under it: identifiers who disagree at the genus rank only, species outside the subject, or a
    genus split or renamed whose old identifications stay behind)}], the strongest first
    (Philippine count, then the world's). share: of all the
    confusions iNaturalist lists for that side (the sum of its counts in that scope), the part with the other side; rate:
    the count over that side's observations in that scope. null where that side was not asked (not in the subject).
    A pair is listed when one count reaches floor (source), or a literature set holds both.
  - groups [{id, kind: literature|worms|inat, rank, members, outside, ...}]: the literature sets; the WoRMS sets; and
    the iNaturalist groups, the connected species of the pairs that reach groupFloor (source), each with its genera and
    families.
  - others [{rank, taxon, partner, ph, world, why}]: the partners neither in the subject nor confirmed, from floor up.

  python3 tools/seaslug_lookalikes.py --pull [PARTS]
                                                ask the network (PARTS, comma-separated: inat, worms, text; all by
                                                default, the others kept), write tools/seaslug_lookalikes_pull.json
                                                (about 25 minutes in all), then build
  python3 tools/seaslug_lookalikes.py           build tools/seaslug_lookalikes_cand.json offline from the pull
  python3 tools/seaslug_lookalikes.py --check   exit 1 when the committed file differs from a fresh build
Tests: node --test tests/seaslug-lookalikes.test.js.
"""
import argparse
import datetime
import html
import json
import os
import re
import sys
import urllib.parse
import zoneinfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import inat  # noqa: E402

SOURCE = os.path.join(ROOT, 'tools', 'seaslug_lookalikes_source.json')
PULL = os.path.join(ROOT, 'tools', 'seaslug_lookalikes_pull.json')
OUT = os.path.join(ROOT, 'tools', 'seaslug_lookalikes_cand.json')
WORMS = 'https://www.marinespecies.org/rest/'
WIKI = 'https://en.wikipedia.org/w/api.php'
GBIF = 'https://api.gbif.org/v1/'
SCOPES = ('ph', 'world')
TAXA_BATCH = 30  # ids a v1/taxa request
LIT_TITLE = re.compile(r'colou?r groups?|mimic|cryptic|species complex|look-?alike', re.I)


def load(p, default=None):
    if not os.path.exists(p):
        return default
    with open(p, encoding='utf-8') as fh:
        return json.load(fh)


# ---------------------------------------------------------------- the pull (network)


def root_of(t, roots):
    """The subject's root group (Nudibranchia, Sacoglossa...) a taxon of iNaturalist sits under, or None (not a sea slug)."""
    anc = set(t.get('ancestor_ids') or []) | {t.get('id')}
    return next((n for n, i in roots.items() if i in anc), None)


def genus_ids(get, species_ids):
    """{genus name: iNaturalist id} for the species ids: their parents, batched (TAXA_BATCH a request), climbing a
    subgenus or a section to the genus."""
    out, ask, seen = {}, sorted(set(species_ids)), set()
    while ask:
        up = set()
        for B in inat.chunks(ask, TAXA_BATCH):
            for t in (get(f"{inat.V1}taxa/{','.join(map(str, B))}") or {}).get('results') or []:
                seen.add(t['id'])
                if t.get('rank') == 'genus':
                    out[t['name']] = t['id']
                elif t.get('rank') in ('species', 'subgenus', 'section', 'complex', 'subspecies') and t.get('parent_id'):
                    up.add(t['parent_id'])
        ask = sorted(up - seen)
    return out


def similar(get, taxon, place=None):
    """[(partner id, count)] and {partner id: (name, rank, ancestor_ids)} from similar_species, in place or worldwide."""
    q = f'taxon_id={taxon}' + (f'&place_id={place}' if place else '')
    d = get(f'{inat.V1}identifications/similar_species?{q}') or {}
    rows, taxa = [], {}
    for r in d.get('results') or []:
        t = r.get('taxon') or {}
        if t.get('id') is None:
            continue
        rows.append([t['id'], r.get('count') or 0])
        taxa[t['id']] = (t.get('name'), t.get('rank'), t.get('ancestor_ids') or [])
    return rows, taxa


def obs_counts(get, species, genera, place):
    """{taxon id: its observations (every quality grade) in place or worldwide}: the species batched (species_counts,
    tools/inat.py leaf_counts), a species species_counts cannot count exactly and every genus asked alone (per_page=0)."""
    q = f'place_id={place}' if place else ''
    out = inat.leaf_counts(get, species, q)
    for t in [x for x, n in out.items() if n is None] + sorted(set(genera)):
        d = get(f'{inat.V1}observations?taxon_id={t}' + (f'&{q}' if q else '') + '&per_page=0') or {}
        out[t] = d.get('total_results') or 0
    return out


def worms_genera(get, names):
    """{genus name: its WoRMS AphiaID} (AphiaRecordsByMatchNames, 50 names a request; an exact match only)."""
    out = {}
    for B in inat.chunks(sorted(names), 50):
        q = '&'.join('scientificnames[]=' + urllib.parse.quote(n) for n in B)
        for n, recs in zip(B, get(f'{WORMS}AphiaRecordsByMatchNames?{q}&marine_only=false', missing=True) or []):
            r = next((r for r in recs or [] if r.get('match_type') == 'exact'), None)
            if r:
                out[n] = r.get('valid_AphiaID') or r['AphiaID']
    return out


def worms_sources(get, aphia):
    """[[use, reference, link]] WoRMS cites for an AphiaID."""
    return [[s.get('use'), s.get('reference'), s.get('doi') or s.get('link') or s.get('url')]
            for s in get(f'{WORMS}AphiaSourcesByAphiaID/{aphia}', missing=True) or []]


KEY = re.compile(r'\bsimilar|resembl|confus|mistak|mimic|look-?alike|distinguish|differs?\b|differing|unlike', re.I)
BINOM = re.compile(r'\b([A-Z][a-z]+|[A-Z]\.)\s([a-z]{3,})\b')
# A comparing sentence counts for a look-alike when it is about the look: a colour or pattern word, or a body part
# without an anatomy word (a radula, a jaw, the reproductive system... compare what a photo does not show).
VISUAL = re.compile(r'colou?r|pattern|appearance|external|outward|\blook|confus|mistak|mimic|resembl|marking|spot|stripe|'
                    r'\blines?\b|\bband|border|\brings?\b', re.I)
PART = re.compile(r'rhinophor|gill|mantle|cerat|notum|tubercle|papill|\bfoot\b|\bbody\b|shape', re.I)
ANAT = re.compile(r'radula|jaw|teeth|tooth|penis|reproductive|epiderm|spicul|prostat|ampulla|gizzard|cladistic|'
                  r'molecular|\bclade', re.I)


def about_look(s):
    return bool(KEY.search(s)) and bool(VISUAL.search(s) or (PART.search(s) and not ANAT.search(s)))


def sentences(text):
    """The sentences of a plain text that compare (KEY) and name a binomial, each at most 600 characters."""
    out = []
    for s in re.split(r'(?<=[.!?])\s+(?=[A-Z(])', re.sub(r'\s+', ' ', text or '')):
        s = s.strip()
        if KEY.search(s) and BINOM.search(s):
            out.append(s[:600])
    return out


def plain_wiki(t):
    """Wikitext to plain text, up to the reference lists: no references, templates, tables, files; links to their
    label."""
    t = re.split(r'^==\s*(?:References|Bibliography|Further reading|External links|Notes|Sources)\s*==', t or '',
                 flags=re.M | re.I)[0]
    t = re.sub(r'<ref[^>]*/>|<ref[^>]*>.*?</ref>|<!--.*?-->', '', t, flags=re.S)
    while True:
        u = re.sub(r'\{\{[^{}]*\}\}|\{\|[^{}]*?\|\}', '', t)
        if u == t:
            break
        t = u
    t = re.sub(r'\[\[(?:File|Image|Category):[^\]]*\]\]', '', t)
    t = re.sub(r'\[\[([^\]|]*\|)?([^\]]*)\]\]', r'\2', t)
    return html.unescape(re.sub(r"'{2,}|<[^>]+>|^=+.*?=+$", '', t, flags=re.M))


def wiki_texts(get, titles):
    """{title: the comparing sentences of its English Wikipedia article} (the wikitext, 50 titles a request, redirects
    followed)."""
    out = {}
    for B in inat.chunks(sorted(set(titles)), 50):
        q = urllib.parse.urlencode({'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main',
                                    'format': 'json', 'formatversion': 2, 'redirects': 1, 'titles': '|'.join(B)})
        d = get(f'{WIKI}?{q}') or {}
        back = {r['to']: r['from'] for r in (d.get('query') or {}).get('redirects') or []}
        for p in (d.get('query') or {}).get('pages') or []:
            rev = (p.get('revisions') or [{}])[0]
            txt = ((rev.get('slots') or {}).get('main') or {}).get('content')
            if txt:
                out[back.get(p['title'], p['title'])] = sentences(plain_wiki(txt))
    return out


def gbif_texts(get, names):
    """{name: [[source, type, sentence]]}: the comparing sentences of the descriptions GBIF holds for each species
    (species/match, then species/{key}/descriptions; the treatments Plazi and others extracted from papers)."""
    out = {}
    for n in sorted(set(names)):
        m = get(f'{GBIF}species/match?name={urllib.parse.quote(n)}&kingdom=Animalia') or {}
        if m.get('rank') != 'SPECIES' or m.get('matchType') not in ('EXACT', 'FUZZY') or not m.get('usageKey'):
            continue
        rows, off = [], 0
        while True:
            d = get(f'{GBIF}species/{m["usageKey"]}/descriptions?limit=100&offset={off}') or {}
            for r in d.get('results') or []:
                txt = html.unescape(re.sub(r'<[^>]+>', ' ', r.get('description') or ''))
                rows += [[(r.get('source') or '')[:200], r.get('type'), s] for s in sentences(txt)]
            off += 100
            if d.get('endOfRecords', True) or off >= 500:
                break
        out[n] = rows
    return out


PARTS = ('inat', 'worms', 'text')


def pull(get, tree, source, today=None, log=print, parts=PARTS, prev=None, L=None):
    """Everything the build reads from the network, for the species and genera of the tree (seaslug.json): parts
    'inat' (similar species, observations), 'worms' (the references), 'text' (Wikipedia and GBIF's comparing
    sentences); the parts not asked are kept from prev (the committed pull)."""
    P = dict(prev or {})
    if 'inat' in parts:
        P.update(pull_inat(get, tree, source, today, log))
    if 'worms' in parts:
        P.update(pull_worms(get, tree, log))
    if 'text' in parts:
        P.update(pull_text(get, tree, L, log))
    if get is inat.get:  # summed over the pulls that made the file
        req = dict(P.get('requests') or {})
        for h, n in inat.calls.items():
            req[h] = req.get(h, 0) + n
        P['requests'] = dict(sorted(req.items()))
    return P


def pull_inat(get, tree, source, today=None, log=print):
    """The 'inat' part: the genera's ids, the observations and the similar species in both scopes, the partners."""
    roots, place = source['roots'], source['place']
    sp = {s['inat']: s for s in tree['species'] if s.get('inat')}  # a species with no name yet has no taxon (Q389)
    log(f'pull: {len(sp)} species')
    gen = genus_ids(get, sp)
    names = sorted({g['name'] for g in tree['genera']})
    miss = [n for n in names if n not in gen]
    if miss:
        raise SystemExit('seaslug_lookalikes: no iNaturalist genus for ' + ', '.join(miss))
    gen = {n: gen[n] for n in names}
    asked = sorted(sp) + [gen[n] for n in names]
    today = today or datetime.datetime.now(zoneinfo.ZoneInfo('Asia/Manila')).date().isoformat()  # the instance's day
    P = {'pulled': today, 'place': place, 'genera': gen,
         'obs': {}, 'similar': {k: {} for k in SCOPES}, 'taxa': {}}
    for k in SCOPES:
        log(f'pull: observations, {k}')
        P['obs'][k] = {str(t): n for t, n in sorted(obs_counts(get, sorted(sp), gen.values(), place if k == 'ph' else None).items())}
    for k in SCOPES:
        for i, t in enumerate(asked):
            if i % 50 == 0:
                log(f'pull: similar species, {k}, {i}/{len(asked)}')
            rows, taxa = similar(get, t, place if k == 'ph' else None)
            P['similar'][k][str(t)] = rows
            for x, (n, r, anc) in taxa.items():
                P['taxa'][str(x)] = [n, r, root_of({'id': x, 'ancestor_ids': anc}, roots)]
    P['taxa'] = dict(sorted(P['taxa'].items(), key=lambda kv: int(kv[0])))
    return P


def pull_worms(get, tree, log=print):
    """The 'worms' part: the genera's AphiaIDs, the references WoRMS cites for each species and genus."""
    log('pull: WoRMS')
    wg = worms_genera(get, sorted({g['name'] for g in tree['genera']}))
    aph = sorted({s['ref'] for s in tree['species'] if s.get('ref')} | set(wg.values()))
    return {'wormsGenera': wg, 'worms': {str(a): worms_sources(get, a) for a in aph}}


def pull_text(get, tree, L, log=print):
    """The 'text' part of the pull: {wiki: {species: [sentences]}, gbif: {species: [[source, type, sentence]]}} for the
    species of the tree (Wikipedia: the species with an article of their own in the list, tools/seaslugs.json wiki)."""
    names = [s['name'] for s in tree['species']]
    own = {s['name']: s['wiki']['title'] for s in (L or {}).get('species') or []
           if s['name'] in set(names) and (s.get('wiki') or {}).get('kind') == 'own' and s['wiki'].get('title')}
    log(f'pull: Wikipedia, {len(own)} articles')
    W = wiki_texts(get, own.values())
    log(f'pull: GBIF, {len(names)} species')
    G = gbif_texts(get, names)
    return {'wiki': {n: W[t] for n, t in sorted(own.items()) if W.get(t)},
            'gbif': {n: r for n, r in sorted(G.items()) if r}}


def dump_pull(P):
    """One taxon a line under each section, so a new pull reads as a diff."""
    head = {k: P[k] for k in ('pulled', 'place', 'requests')}
    lines = ['{', ' "_doc": ' + json.dumps('Written by tools/seaslug_lookalikes.py --pull (its doc says what each part '
                                           'is); read by its build. Not read by the app.') + ',']
    lines += [f' {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)},' for k, v in head.items()]
    secs = [('genera', P['genera']), ('wormsGenera', P['wormsGenera'])]
    secs += [(f'obs.{k}', P['obs'][k]) for k in SCOPES] + [(f'similar.{k}', P['similar'][k]) for k in SCOPES]
    secs += [('taxa', P['taxa']), ('worms', P['worms']), ('wiki', P.get('wiki') or {}), ('gbif', P.get('gbif') or {})]
    for j, (name, d) in enumerate(secs):
        items = list(d.items())
        lines.append(f' {json.dumps(name)}: {{')
        lines += [f'  {json.dumps(str(k))}: {json.dumps(v, ensure_ascii=False)}' + (',' if i < len(items) - 1 else '')
                  for i, (k, v) in enumerate(items)]
        lines.append(' }' + (',' if j < len(secs) - 1 else ''))
    return '\n'.join(lines + ['}']) + '\n'


def read_pull(d):
    """The pull as dump_pull wrote it, its dotted sections nested back."""
    P = {k: v for k, v in d.items() if '.' not in k and k != '_doc'}
    for k, v in d.items():
        if '.' in k:
            a, b = k.split('.', 1)
            P.setdefault(a, {})[b] = v
    return P


# ---------------------------------------------------------------- the build (offline)


def rnd(x):
    return None if x is None else round(x, 3)


def build(L, tree, source, P):
    """The candidates file from the list L (tools/seaslugs.json), the tree (seaslug.json), the source and the pull."""
    fl, gfl = source['floor'], source['groupFloor']
    conf = {s['name']: s for s in L['species']}  # rule C8: the species confirmed in the Philippines
    alias = {}  # a synonym or WoRMS's accepted name -> the list's name (a source may use either)
    for s in L['species']:
        for x in [*(s.get('syn') or []), (s.get('worms') or {}).get('accepted')]:
            if x and x != s['name'] and x not in conf:
                alias.setdefault(x, s['name'])
    byid = {s['inat']: s['name'] for s in L['species'] if s.get('inat')}
    game = {s['name'] for s in tree['species']}
    gid = {s['inat']: s['name'] for s in tree['species'] if s.get('inat')}  # a species with no name yet has no taxon (Q389)
    ggame = {g['name'] for g in tree['genera']}
    gconf = {s['genus'] for s in L['species']}
    gfam = {s['genus']: s['family'] for s in L['species']}
    genid = {int(v): k for k, v in P['genera'].items()}
    taxa = P['taxa']

    def kept(name, rank):
        if rank == 'species':
            return 'subject' if name in game else 'confirmed' if name in conf else None
        return 'subject' if name in ggame else 'confirmed' if name in gconf else None

    def why(pid, rank):
        n, r, root = taxa.get(str(pid)) or [None, None, None]
        if r != rank:
            return f'rank {r}'
        if not root:
            return 'not a sea slug'
        if rank == 'genus':
            return 'a sea-slug genus with no species confirmed in the Philippines (rule C8)'
        return 'a sea slug not confirmed in the Philippines (rule C8)'

    def name_of(pid, rank):
        if rank == 'species' and pid in byid:
            return byid[pid]  # the list's name (iNaturalist's, as the list took it)
        n = (taxa.get(str(pid)) or [None])[0]
        return alias.get(n, n) if rank == 'species' else n

    def fam(name, rank):
        return gfam.get(name.split(' ')[0] if rank == 'species' else name)

    pairs, others = {}, {}
    for rank, asked in (('species', gid), ('genus', genid)):
        for k in SCOPES:
            sims, obs = P['similar'][k], P['obs'][k]
            for t, me in sorted(asked.items()):
                rows = sims.get(str(t)) or []
                tot = sum(n for _, n in rows)
                for pid, n in rows:
                    other = name_of(pid, rank)
                    if not other or other == me:
                        continue
                    if (taxa.get(str(pid)) or [None, rank])[1] != rank or not kept(other, rank):
                        o = others.setdefault((rank, me, other), {'rank': rank, 'taxon': me, 'partner': other,
                                                                   'ph': 0, 'world': 0, 'why': why(pid, rank)})
                        o[k] = max(o[k], n)
                        continue
                    a, b = sorted((me, other))
                    p = pairs.setdefault((rank, a, b), {'rank': rank, 'a': a, 'b': b})
                    s = p.setdefault(k, {'n': 0, 'share': [None, None], 'rate': [None, None]})
                    s['n'] = max(s['n'], n)
                    i = 0 if me == a else 1
                    s['share'][i] = rnd(n / tot) if tot else None
                    s['rate'][i] = rnd(n / obs[str(t)]) if obs.get(str(t)) else None
    # a genus pair also counts its species pairs across the two genera (every species pair kept, before the floor)
    for (rank, a, b), p in list(pairs.items()):
        if rank != 'species':
            continue
        ga, gb = a.split(' ')[0], b.split(' ')[0]
        if ga == gb or not (kept(ga, 'genus') and kept(gb, 'genus')):
            continue
        x, y = sorted((ga, gb))
        g = pairs.setdefault(('genus', x, y), {'rank': 'genus', 'a': x, 'b': y})
        s = g.setdefault('genus', {'ph': 0, 'world': 0, 'pairs': 0})
        s['ph'] += (p.get('ph') or {}).get('n', 0)
        s['world'] += (p.get('world') or {}).get('n', 0)
        s['pairs'] += 1

    # the literature sets (the source) and WoRMS's
    groups = []
    for S in source.get('sets') or []:
        rank = S['rank']
        res = [alias.get(m, m) if rank == 'species' else m for m in S['members']]
        mem = list(dict.fromkeys(m for m in res if kept(m, rank)))
        groups.append({'id': S['id'], 'kind': 'literature', 'rank': rank, 'members': mem,
                       'outside': [m for m in res if not kept(m, rank)],
                       **({'as': {a: b for a, b in zip(S['members'], res) if a != b}} if res != S['members'] else {}),
                       **{k: S[k] for k in ('source', 'quote', 'read', 'note') if k in S}})
    refs = {}
    aph = {s['ref']: s['name'] for s in tree['species'] if s.get('ref')}
    for a, rows in P['worms'].items():
        name = aph.get(int(a))
        for use, ref, link in rows if name else []:
            if ref and LIT_TITLE.search(ref):
                refs.setdefault(ref, {'link': link, 'members': set()})['members'].add(name)
    for ref, r in sorted(refs.items()):
        if len(r['members']) >= 2:
            m = re.match(r"\s*([A-Za-zÀ-ÿ'\-]+).*?\((\d{4})", ref)
            sid = 'worms:' + (f'{m.group(1)}{m.group(2)}' if m else str(len(groups))) + ':' + \
                  re.sub(r'[^a-z]+', '-', ' '.join(LIT_TITLE.findall(ref)).lower()).strip('-')
            groups.append({'id': sid, 'kind': 'worms', 'rank': 'species', 'members': sorted(r['members']), 'outside': [],
                           'source': ref + (f' {r["link"]}' if r['link'] else ''),
                           'read': 'WoRMS AphiaSourcesByAphiaID: the title only; the paper may treat several groups'})
    # the comparing sentences of Wikipedia and of GBIF's descriptions: the species of the list they name (rule C6)
    epi = {}
    for n in conf:
        g, e = n.split(' ')[:2]
        epi.setdefault((g[0], e), set()).add(n)

    def resolve(g, e, me):
        """(the list's name, None), (None, a sea-slug name the list lacks) or (None, None)."""
        if g.endswith('.'):
            c = epi.get((g[0], e), set())
            c = c if len(c) == 1 else {x for x in c if x.split(' ')[0] == me.split(' ')[0]}
            return (next(iter(c)), None) if len(c) == 1 else (None, None)
        n = f'{g} {e}'
        if n in conf or n in alias:
            return alias.get(n, n), None
        return None, n

    def compares(s, me):
        """The pairs a sentence of me's text states and the sea-slug names it uses that the list lacks: the species
        named before the comparing word against those named after it, me standing in for a side that names none ("It
        is similar to X", "X, which looks similar to this species"); a side whose only names are not in the list
        stands for nobody ("Y is similar in colour to X", in me's text, pairs neither with me)."""
        k = KEY.search(s).start()
        side, seen, unk = ([], []), [False, False], set()
        for m in BINOM.finditer(s):
            g, e = m.groups()
            if not (g.endswith('.') or g in gconf):
                continue  # a capitalised word, not a sea-slug genus
            x, u = resolve(g, e, me)
            i = int(m.start() > k)
            seen[i] = True
            if x:
                side[i].append(x)
            elif u:
                unk.add(u)
        a = side[0] or ([] if seen[0] else [me])
        b = side[1] or ([] if seen[1] else [me])
        return {tuple(sorted((x, y))) for x in a for y in b if x != y}, unk - {me}
    texts = [(me, 'Wikipedia', None, s) for me, L1 in sorted((P.get('wiki') or {}).items()) for s in L1]
    texts += [(me, 'GBIF', ref, s) for me, L1 in sorted((P.get('gbif') or {}).items()) for ref, _, s in L1]
    for me, src, ref, s in texts:
        if me not in game or not about_look(s):
            continue
        found, unk = compares(s, me)
        for a, b in sorted(found):
            T = pairs.setdefault(('species', a, b), {'rank': 'species', 'a': a, 'b': b}).setdefault('text', [])
            q = {'src': src, 'of': me, **({'ref': ref} if ref else {}), 'quote': s[:300]}
            if len(T) < 3 and q not in T:
                T.append(q)
        for other in sorted(unk):
            o = others.setdefault(('species', me, other), {'rank': 'species', 'taxon': me, 'partner': other, 'ph': 0,
                                                            'world': 0, 'why': 'a sea slug not confirmed in the '
                                                                               'Philippines (rule C8)'})
            o.setdefault('text', [])
            if src not in o['text']:
                o['text'].append(src)

    ids = {}
    for G in groups:
        for x in G['members']:
            for y in G['members']:
                if x < y:
                    ids.setdefault((G['rank'], x, y), []).append(G['id'])
    for key, L1 in ids.items():
        pairs.setdefault(key, {'rank': key[0], 'a': key[1], 'b': key[2]})['lit'] = sorted(set(L1))

    def strong(p, f):
        g = p.get('genus') or {}
        return any((p.get(k) or {}).get('n', 0) >= f[k] or g.get(k, 0) >= f[k] for k in SCOPES)

    out = []
    for (rank, a, b), p in pairs.items():
        if not (strong(p, fl) or p.get('lit') or p.get('text')):
            continue
        ga, gb = (a.split(' ')[0], b.split(' ')[0]) if rank == 'species' else (a, b)
        p['crossGenus'] = ga != gb
        p['crossFamily'] = fam(a, rank) != fam(b, rank)
        p['kept'] = [kept(a, rank), kept(b, rank)]
        if rank == 'genus' and not p.get('genus') and not p.get('lit'):
            p['genusOnly'] = True  # no species pair of the subject under it (see the doc)
        out.append(p)
    key = lambda p: (-(p.get('ph') or {}).get('n', 0) - (p.get('genus') or {}).get('ph', 0),
                     -(p.get('world') or {}).get('n', 0) - (p.get('genus') or {}).get('world', 0),
                     p['rank'] != 'species', p['a'], p['b'])
    out.sort(key=key)

    # the iNaturalist groups: species connected by pairs that reach groupFloor
    up = {}

    def find(x):
        while up.setdefault(x, x) != x:
            up[x] = up[up[x]]
            x = up[x]
        return x
    edges = [p for p in out if p['rank'] == 'species' and strong(p, gfl)]
    for p in edges:
        up[find(p['a'])] = find(p['b'])
    comp = {}
    for p in edges:
        comp.setdefault(find(p['a']), []).append(p)
    for E in sorted(comp.values(), key=lambda E: (-sum((p.get('ph') or {}).get('n', 0) for p in E), E[0]['a'])):
        mem = sorted({x for p in E for x in (p['a'], p['b'])})
        if len(mem) < 3:
            continue  # a pair is in pairs already
        groups.append({'id': 'inat:' + mem[0].replace(' ', '-'), 'kind': 'inat', 'rank': 'species', 'members': mem,
                       'outside': [], 'edges': len(E),
                       'ph': sum((p.get('ph') or {}).get('n', 0) for p in E),
                       'world': sum((p.get('world') or {}).get('n', 0) for p in E),
                       'genera': sorted({m.split(' ')[0] for m in mem}),
                       'families': sorted({fam(m, 'species') or '?' for m in mem})})
    oth = sorted((o for o in others.values() if o['ph'] >= fl['ph'] or o['world'] >= fl['world'] or o.get('text')),
                 key=lambda o: (-o['ph'], -o['world'], o['taxon'], o['partner']))
    nsp = sum(1 for p in out if p['rank'] == 'species')
    return {
        'v': 1,
        'pulled': P['pulled'],
        'place': P['place'],
        'requests': P.get('requests') or {},
        'floor': fl,
        'groupFloor': gfl,
        'counts': {
            'asked': {'species': len(gid), 'genera': len(genid)},
            'pairs': {'species': nsp, 'genus': len(out) - nsp,
                      'crossGenus': sum(1 for p in out if p['rank'] == 'species' and p['crossGenus']),
                      'crossFamily': sum(1 for p in out if p['crossFamily']),
                      'withLit': sum(1 for p in out if p.get('lit')),
                      'withText': sum(1 for p in out if p.get('text')),
                      'genusOnly': sum(1 for p in out if p.get('genusOnly'))},
            'groups': {k: sum(1 for G in groups if G['kind'] == k) for k in ('literature', 'worms', 'inat')},
            'others': len(oth),
        },
        'pairs': out,
        'groups': groups,
        'others': oth,
    }


def dump(o):
    """One pair, group or other a line."""
    lines = ['{', ' "_doc": ' + json.dumps('Built by tools/seaslug_lookalikes.py (its doc says what each field is) from '
                                           'tools/seaslug_lookalikes_pull.json, tools/seaslug_lookalikes_source.json, '
                                           'tools/seaslugs.json and seaslug.json; the survey: '
                                           'docs/reviews/2026-11-17-seaslug-lookalikes-survey.md. Candidates only: '
                                           'not read by the app nor the game.') + ',']
    keys = [k for k in o if k not in ('pairs', 'groups', 'others')]
    lines += [f' {json.dumps(k)}: {json.dumps(o[k], ensure_ascii=False)},' for k in keys]
    for j, k in enumerate(('pairs', 'groups', 'others')):
        lines.append(f' {json.dumps(k)}: [')
        lines += ['  ' + json.dumps(x, ensure_ascii=False) + (',' if i < len(o[k]) - 1 else '') for i, x in enumerate(o[k])]
        lines.append(' ]' + (',' if j < 2 else ''))
    return '\n'.join(lines + ['}']) + '\n'


def inputs(root=ROOT):
    j = lambda *p: load(os.path.join(root, *p))
    return (j('tools', 'seaslugs.json'), j('seaslug.json'), j('tools', 'seaslug_lookalikes_source.json'),
            read_pull(j('tools', 'seaslug_lookalikes_pull.json') or {}))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--pull', nargs='?', const=','.join(PARTS), metavar='PARTS',
                    help='ask the network (the parts, comma-separated: ' + ', '.join(PARTS) + '; all by default; the '
                         'others kept from the committed pull), write the pull, then build')
    ap.add_argument('--check', action='store_true', help='exit 1 when the committed file differs from a fresh build')
    a = ap.parse_args()
    L, tree, source, P = inputs()
    if a.pull:
        parts = [x for x in a.pull.split(',') if x]
        if not parts or set(parts) - set(PARTS):
            ap.error('--pull takes ' + ', '.join(PARTS))
        P = pull(inat.get, tree, source, log=lambda m: print(m, file=sys.stderr), parts=parts, prev=P, L=L)
        with open(PULL, 'w', encoding='utf-8') as fh:
            fh.write(dump_pull(P))
        P = read_pull(load(PULL))
    s = dump(build(L, tree, source, P))
    if a.check:
        if load(OUT) is None or open(OUT, encoding='utf-8').read() != s:
            print('seaslug_lookalikes: out of date, run python3 tools/seaslug_lookalikes.py', file=sys.stderr)
            sys.exit(1)
        return
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write(s)
    c = json.loads(s)['counts']
    print(f"seaslug_lookalikes_cand.json: {c['pairs']['species']} species pairs, {c['pairs']['genus']} genus pairs, "
          f"groups {c['groups']}, {c['others']} partners left out")


if __name__ == '__main__':
    main()
