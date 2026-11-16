require('./slot.js').testGuard();
// The sea-slug species list and its popularity signals (tools/build_seaslugs.py; Pierre, 2026-11-15, Q369): the parsing
// of the replies and pages, and the stars and circles rules, on made-up data with a stubbed network (nothing leaves the
// machine); and tools/seaslugs.json derives as written.
const test = require('node:test'),
  assert = require('node:assert'),
  path = require('path'),
  {spawnSync} = require('child_process');
const TOOLS = path.join(__dirname, '..', 'tools');
const py = body => {
  const code = `import json, sys\nsys.path.insert(0, ${JSON.stringify(TOOLS)})\nimport build_seaslugs as b\n${body}`;
  const r = spawnSync('python3', ['-c', code], {encoding: 'utf8'});
  assert.strictEqual(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};

test('pull pages by id until an empty page; taxa and places batched', () => {
  const o = py(`
asked = []
class Net:
    def get(self, url):
        asked.append(url)
        above = int(url.split('id_above=')[1].split('&')[0]) if 'id_above=' in url else None
        if '/v2/observations' in url:
            return {'results': [{'id': i, 'taxon': {'id': 5, 'ancestor_ids': [1, 4, 5]}, 'place_ids': [9]}
                                for i in range(above + 1, min(above + 3, 5) + 1)] if above < 5 else []}
        if '/taxa/' in url:
            return {'results': [{'id': 5, 'name': 'Aa bb', 'rank': 'species', 'preferred_common_name': 'Bee'}]}
        return {'results': [{'id': 9, 'name': 'Prov', 'admin_level': 10}]}
obs, urls = b.pull(Net(), 47113, 6873)
t, p = b.taxa_places(Net(), obs)
print(json.dumps({'ids': [x['id'] for x in obs], 'pages': len(urls), 'taxa': t, 'places': p,
                  'first': urls[0].split('?')[1].split('&fields')[0]}))
`);
  assert.deepStrictEqual(o.ids, [1, 2, 3, 4, 5]);
  assert.strictEqual(o.pages, 3, 'two full pages, then an empty one ends it');
  assert.strictEqual(o.first, 'taxon_id=47113&place_id=6873&quality_grade=research&per_page=200&order_by=id&order=asc&id_above=0');
  assert.deepStrictEqual(o.taxa['5'], {name: 'Aa bb', rank: 'species', cn: 'Bee'});
  assert.deepStrictEqual(o.places['9'], {name: 'Prov', level: 10});
});

test('world counts are exact: a species with an observed subspecies is asked alone (Codex review #950)', () => {
  const o = py(`
asked = []
class Net:
    def get(self, url):
        asked.append(url.split('/v1/')[1].split('?')[0])
        if 'species_counts' in url:
            return {'total_results': 3, 'results': [{'taxon': {'id': 10, 'ancestor_ids': [1, 10]}, 'count': 7},
                                                    {'taxon': {'id': 21, 'ancestor_ids': [1, 20, 21]}, 'count': 4},
                                                    {'taxon': {'id': 20, 'ancestor_ids': [1, 20]}, 'count': 2}]}
        return {'total_results': 9}
print(json.dumps([b.world_counts(Net(), [10, 20, 30], 'quality_grade=research'), asked]))
`);
  assert.deepStrictEqual(o[0], {10: 7, 20: 9, 30: 0}, 'species 20 has a subspecies row: its own count is asked alone');
  assert.deepStrictEqual(o[1], ['observations/species_counts', 'observations']);
});

test('aggregate: distinct observers, a subspecies counts for its species, near Dauin by distance, rule C8, licences', () => {
  const o = py(`
taxa = {1: {'name': 'Nudibranchia', 'rank': 'order'}, 2: {'name': 'Fam', 'rank': 'family'}, 3: {'name': 'Aa', 'rank': 'genus'},
        10: {'name': 'Aa one', 'rank': 'species', 'cn': 'One'}, 11: {'name': 'Aa one minor', 'rank': 'subspecies'},
        20: {'name': 'Aa two', 'rank': 'species'}}
places = {7: {'name': 'Negros Oriental', 'level': 10}, 8: {'name': 'Batangas', 'level': 10}, 6873: {'name': 'Philippines', 'level': 0}}
dauin, far = '9.19,123.26', '13.7,120.9'
def ob(t, anc, u, loc, pl, lic=(), juv=False):
    return {'taxon': {'id': t, 'rank': taxa[t]['rank'], 'ancestor_ids': anc}, 'user': {'id': u}, 'location': loc,
            'place_ids': [6873, pl], 'photos': [{'license_code': x} for x in lic], 'faves_count': 0,
            'annotations': [{'controlled_attribute_id': 1, 'controlled_value_id': 8}] if juv else []}
A = [1, 2, 3, 10]
obs = [ob(10, A, 'u1', dauin, 7, ('cc-by-nc', 'cc-by')), ob(11, A + [11], 'u2', dauin, 7, ('cc-by-nc',), True),
       ob(10, A, 'u3', far, 8, ('cc-by-nc-sa',)), ob(10, A, 'u3', far, 8),
       ob(20, [1, 2, 3, 20], 'u1', far, 8), ob(20, [1, 2, 3, 20], 'u2', far, 8)]
r = b.aggregate(obs, {'Nudibranchia': 1}, taxa, places, {'lat': 9.19, 'lon': 123.26, 'radiusKm': 40})
print(json.dumps({str(k): v for k, v in r.items()}))
`);
  const one = o['10'],
    two = o['20'];
  assert.strictEqual(one.name, 'Aa one');
  assert.strictEqual(one.group, 'Nudibranchia');
  assert.strictEqual(one.inatFamily, 'Fam');
  assert.strictEqual(one.obs, 4, 'the subspecies observation counts for its species');
  assert.strictEqual(one.observers, 3);
  assert.strictEqual(one.nearObservers, 2);
  assert.strictEqual(one.near, true, '2 observers within 40 km: confirmed near Dauin (rule C8)');
  assert.deepStrictEqual(one.phBy, ['observers', 'near']);
  assert.deepStrictEqual(one.photos, {open: 1, nc: 1, other: 2}, 'an observation counts in its best licence class');
  assert.deepStrictEqual(one.juv, {area: 1});
  assert.strictEqual(one.prov, 2);
  assert.deepStrictEqual(one.provTop, [
    ['Batangas', 0.5],
    ['Negros Oriental', 0.5]
  ]);
  assert.strictEqual(one.top, 0.5, 'the most active observer made 2 of its 4 observations');
  assert.deepStrictEqual(two.phBy, [], '2 observers, none near Dauin: not confirmed');
  assert.ok(!JSON.stringify(o).includes('u1'), 'no observer id in the output');
});

test('Wikipedia: redirects and normalised titles resolved; the article kinds', () => {
  const o = py(`
class Net:
    def get(self, url):
        return {'query': {'normalized': [{'from': 'aa one', 'to': 'Aa one'}],
                          'redirects': [{'from': 'Aa two', 'to': 'Two dancer'}, {'from': 'Aa three', 'to': 'Aa'}],
                          'pages': {'1': {'title': 'Aa one'}, '2': {'title': 'Two dancer'}, '3': {'title': 'Aa'},
                                    '-1': {'title': 'Aa four', 'missing': ''}}}}
t = b.wiki_titles(Net(), ['aa one', 'Aa two', 'Aa three', 'Aa four'])
k = [b.article_kind('Aa one', 'Aa one', set()), b.article_kind('Aa two', 'Two dancer', set()),
     b.article_kind('Aa three', 'Aa', set()), b.article_kind('Aa five', 'Two dancer', {'Two dancer'})]
print(json.dumps({'t': t, 'k': k}))
`);
  assert.deepStrictEqual(o.t, {'aa one': 'Aa one', 'Aa two': 'Two dancer', 'Aa three': 'Aa'});
  assert.deepStrictEqual(o.k, ['own', 'named', 'higher', 'shared']);
});

test('page_text: the visible text and photo captions without scripts, the title, the date published (never a <time>)', () => {
  const o = py(`
raw = '''<html><head><title>Old title</title><meta property="og:title" content="Top 5 slugs &amp; more">
<meta property="article:published_time" content="2023-05-04T10:00:00+08:00"><script>var x = "Aa one";</script>
<style>.Aa{}</style></head><body><p>We saw <i>Aa</i> <i>one</i> at Anilao.</p><time datetime="2020-01-01">x</time></body></html>'''
t, d, s, x = b.page_text(raw)
t2, d2, s2, _ = b.page_text('<script type="application/ld+json">{"datePublished": "2019-02-03"}</script><p>hi</p>')
_, d3, s3, x3 = b.page_text('<time datetime="2026-11-14">x</time><p><em>Cyerce nigra</em>and</p><img alt="Melibe colemani, a phantom">')
print(json.dumps([t, d, x.strip(), t2, d2, s, s2, d3, s3, x3]))
`);
  assert.strictEqual(o[0], 'Top 5 slugs & more');
  assert.strictEqual(o[1], '2023-05-04');
  assert.match(o[2], /We saw Aa one at Anilao\./);
  assert.doesNotMatch(o[2], /var x/);
  assert.strictEqual(o[4], '2019-02-03');
  assert.deepStrictEqual([o[5], o[6]], ['article:published_time', 'JSON-LD datePublished']);
  assert.deepStrictEqual([o[7], o[8]], [null, null], 'a <time> element is not the page date (a sidebar note can carry one)');
  assert.match(o[9], /Cyerce nigra and/, 'a tag boundary separates words');
  assert.match(o[9], /Melibe colemani, a phantom/, 'photo captions are read');
});

test('mentions: full names, synonyms, abbreviations only when unambiguous, nicknames; a species once per page', () => {
  const o = py(`
forms = {'Chromodoris annae': 'Chromodoris annae', 'Ceratosoma alleni': 'Miamira alleni', 'Miamira alleni': 'Miamira alleni',
         'Chromodoris willani': 'Chromodoris willani', 'Ceratosoma willani': 'Ceratosoma willani', 'Jorunna parva': 'Jorunna parva',
         'Hypselodoris apolegma': 'Hypselodoris apolegma'}
nicks = {'sea bunny': 'Jorunna parva'}
t = ("We met Chromodoris  ANNAE twice, then the CERATOSOMA ALLENI (now Miamira). Chromodoris annae again. "
     "A sea bunny! Then C. willani and H. apolegma.")
print(json.dumps(b.mentions(t, forms, nicks)))
`);
  assert.deepStrictEqual(o['Chromodoris annae'], ['name']);
  assert.deepStrictEqual(o['Miamira alleni'], ['name'], 'a WoRMS synonym lands on the accepted species');
  assert.deepStrictEqual(o['Jorunna parva'], ['nickname']);
  assert.ok(!('Chromodoris willani' in o) && !('Ceratosoma willani' in o), 'C. willani: two species whose genus is on the page');
  assert.ok(!('Hypselodoris apolegma' in o), 'H. apolegma: Hypselodoris is not written in full on the page');
  const p = py(
    `print(json.dumps(b.mentions('Chromodoris annae and C. willani', {'Chromodoris annae': 'a', 'Chromodoris willani': 'w'}, {})))`
  );
  assert.deepStrictEqual(p, {a: ['name'], w: ['abbr']});
  const s = py(
    `print(json.dumps([b.site_of('https://www.dan.org/?p=1'), b.site_of('https://world.dan.org/x'), b.site_of('https://australiangeographic.com.au/a')]))`
  );
  assert.deepStrictEqual(s, ['dan.org', 'dan.org', 'australiangeographic.com.au'], 'mentions count per site, not per URL');
});

test('stars: (W + M) / 2 on log scales, genus articles and out-of-scope pages not counted, Pierre edits; circles', () => {
  const o = py(`
sp = lambda n, v, k, obs: {'name': n, 'wiki': {'views': v, 'kind': k} if v is not None else None, 'observers': obs, 'cells': 1, 'obs': obs}
species = [sp('Aa', 9999, 'own', 1), sp('Bb', 99, 'named', 50), sp('Cc', 999999, 'higher', 40), sp('Dd', None, None, 30),
           sp('Ee', 9, 'own', 20), sp('Ff', None, None, 10)]
pg = lambda s, scope, names, ok=True: {'site': s, 'scope': scope, 'readable': ok, 'species': names}
pages = [pg('a.com', 'ph', ['Aa', 'Dd']), pg('b.com', 'general', ['Aa']), pg('b.com', 'ph', ['Aa']),
         pg('c.com', 'out', ['Ee']), pg('d.com', 'ph', ['Ee'], False)]
sc = b.stars_scores(species, pages)
st = b.stars_set(sc, 2)
st2 = b.stars_set(sc, 2, add=['Ff'], remove=['Dd'])
c = b.circles(species, st, 4, [1])
src = {'stars': {'size': 2}, 'circles': {'one': 4, 'next': [1]}}
rows = [dict(s) for s in species]
p = b.derive(rows, pages, src)
print(json.dumps({'sc': sc, 'st': st, 'st2': st2, 'c': c, 'p': p, 'again': b.derive([dict(s) for s in species], pages, src) == p,
                  'rows': {r['name']: [r['rank'], r['circle'], r['star']] for r in rows}}))
`);
  assert.deepStrictEqual(o.sc.Aa, [1, 1, 1, 2], 'the best views and the best sites (a.com, b.com: b.com once)');
  assert.deepStrictEqual(o.sc.Cc, [0, 0, 0, 0], 'a genus article does not count');
  assert.deepStrictEqual(o.sc.Dd, [0.3155, 0, 0.6309, 1]);
  assert.deepStrictEqual(o.sc.Bb, [0.25, 0.5, 0, 0]);
  assert.deepStrictEqual(o.sc.Ee, [0.125, 0.25, 0, 0], 'an out page and an unreadable page do not count');
  assert.deepStrictEqual(o.st, ['Aa', 'Dd']);
  assert.deepStrictEqual(o.st2, ['Aa', 'Bb', 'Ff'], 'Pierre removes Dd (the next score, Bb, replaces it) and adds Ff (Q377)');
  assert.deepStrictEqual(o.c, {Aa: 1, Dd: 1, Bb: 1, Cc: 1, Ee: 2, Ff: 3}, 'circle 1: the stars, then the most common to 4');
  assert.deepStrictEqual(o.p.stars, ['Aa', 'Dd']);
  assert.deepStrictEqual(o.p.sizes, {1: 4, 2: 1, 3: 1});
  assert.deepStrictEqual(o.p.leaveOneSiteOut, {'a.com': 1}, 'without a.com, Dd leaves the stars');
  assert.ok(o.again, 'the derive stage is deterministic');
  assert.deepStrictEqual(o.rows.Bb, [1, 1, false]);
});

test('tools/seaslugs.json derives as written (build_seaslugs.py --check, offline)', () => {
  const r = spawnSync('python3', [path.join(TOOLS, 'build_seaslugs.py'), '--check'], {encoding: 'utf8'});
  assert.strictEqual(r.status, 0, (r.stdout || '') + (r.stderr || ''));
});

test('tools/seaslugs.json holds no observer id and every species passes rule C8', () => {
  const d = require('../tools/seaslugs.json');
  for (const s of d.species) {
    assert.ok(s.phBy.length > 0, s.name);
    assert.ok(!('users' in s) && !('user' in s), s.name);
  }
  assert.strictEqual(d.counts.confirmed, d.species.length);
});
