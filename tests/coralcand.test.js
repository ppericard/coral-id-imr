// Coral candidates (Pierre, 2026-11-05): no share-alike licences any more (aligned with the fish rules), the share-alike
// photos already on the site left to him (admin To do › Share-alike, presence.js shareAlike / saQueue), and an observation
// whose identification by the trusted expert `thamnasteroid` no other identification disagrees with, accepted in the Philippines tiers
// (tools/fetch_local.py expert_ok). Offline: iNaturalist is stubbed. Needs python3, like the other checks.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const py = code =>
  JSON.parse(execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools')\n${code}`], {cwd: ROOT, encoding: 'utf8'}));
const {licence, shareAlike, saQueue} = require('../presence.js');

test('licence lists: CC0, CC BY, CC BY-NC only, in every coral search; never share-alike', () => {
  // build_extra.py is a script that rebuilds data.json x when run (never imported here): it takes LIC from fetch_local.
  assert.match(fs.readFileSync(path.join(ROOT, 'tools/build_extra.py'), 'utf8'), /^from fetch_local import LIC, photo_ok\b/m);
  const R = py(`import fetch_local as fl, cand_gaps as cg
print(json.dumps({'fl': fl.LIC, 'cg': cg.LIC, 'ok': [fl.photo_ok({'license_code': c}) for c in ('cc0', 'cc-by', 'cc-by-nc', 'cc-by-sa', 'cc-by-nc-sa', 'cc-by-nd', None)]}))`);
  [R.fl, R.cg].forEach(L => assert.deepStrictEqual(L.split(',').sort(), ['cc-by', 'cc-by-nc', 'cc0']));
  assert.deepStrictEqual(R.ok, [true, true, true, false, false, false, false]);
  // No other coral tool keeps a licence list with share-alike in it (a comma-separated list, as iNaturalist takes).
  ['fetch_local.py', 'cand_gaps.py', 'build_extra.py', 'fetch_approved.py'].forEach(f =>
    assert.ok(
      !/cc[-\w]*,[-\w,]*-sa\b|-sa,cc/.test(fs.readFileSync(path.join(ROOT, 'tools', f), 'utf8')),
      `${f} lists a share-alike licence`
    )
  );
});

test('licence(): the recorded lic, else the credit line; Python and the admin read every photo of data.json alike', () => {
  const ex = [
    {lic: 'cc-by-sa', a: '(c) X, some rights reserved (CC BY)'},
    {a: '(c) X, some rights reserved (CC BY-NC-SA)'},
    {a: '(c) X, some rights reserved (CC BY)'},
    {a: '(c) X, no rights reserved (CC0)'},
    {a: 'no rights reserved'},
    {a: 'IMR lecture'},
    {}
  ];
  const want = ['cc-by-sa', 'cc-by-nc-sa', 'cc-by', 'cc0', 'cc0', null, null];
  assert.deepStrictEqual(ex.map(licence), want);
  assert.deepStrictEqual(ex.map(shareAlike), [true, true, false, false, false, false, false]);
  assert.deepStrictEqual(py(`from fetch_local import licence\nprint(json.dumps([licence(p) for p in ${JSON.stringify(ex)}]))`), want);
  // Every photo record of data.json: same licence in Python and in the admin, and a recorded lic agrees with its credit.
  const D = read('data.json'),
    all = [];
  const add = L => (L || []).forEach(p => all.push(p));
  [...Object.values(D.gen), ...Object.values(D.x.gen)].forEach(g => {
    Object.values(g.views || {}).forEach(add);
    Object.values(g.more || {}).forEach(add);
    add(g.book);
  });
  Object.values(D.course).forEach(add);
  Object.values(D.cand || {}).forEach(add);
  const P = py(`from fetch_local import licence\nD = json.load(open('data.json'))\nout = []
def add(L): out.extend(licence(p) for p in (L or []))
for g in [*D['gen'].values(), *D['x']['gen'].values()]:
    for L in (g.get('views') or {}).values(): add(L)
    for L in (g.get('more') or {}).values(): add(L)
    add(g.get('book'))
for L in D['course'].values(): add(L)
for L in (D.get('cand') or {}).values(): add(L)
print(json.dumps(out))`);
  assert.deepStrictEqual(P, all.map(licence));
  all.filter(p => p.lic && p.a).forEach(p => assert.strictEqual(licence({a: p.a}), p.lic, `${p.f}: lic ${p.lic}, credit ${p.a}`));
});

test('cand.json: no share-alike candidate waits (only those curation.json names may stay, e.g. one Pierre added)', () => {
  const C = read('cand.json').cand;
  Object.entries(C).forEach(([g, L]) => L.forEach(p => assert.ok(!shareAlike(p), `${g}: ${p.f} ${p.lic}`)));
});

test('drop_share_alike: drops waiting share-alike candidates, never one curation.json names; re-runnable', () => {
  const R = py(`from fetch_local import drop_share_alike
d = {'cand': {'A': [{'f': 'a1', 'lic': 'cc-by-sa'}, {'f': 'a2', 'lic': 'cc-by'}, {'f': 'a3', 'lic': 'cc-by-nc-sa'}, {'f': 'a4'}],
              'B': [{'f': 'b1', 'a': '(c) X, some rights reserved (CC BY-SA)'}]}}
g1 = drop_share_alike(d, {'a3'})
g2 = drop_share_alike(d, {'a3'})
print(json.dumps({'gone': g1, 'again': g2, 'left': {g: [p['f'] for p in L] for g, L in d['cand'].items()}}))`);
  assert.deepStrictEqual(R, {gone: ['a1', 'b1'], again: [], left: {A: ['a2', 'a3', 'a4']}}, 'a licence it cannot read is not dropped');
});

// One full refill for genus A, near Dauin only (the other tiers answer nothing), against a stubbed iNaturalist.
const RUN = `import importlib.util, io, contextlib
s = importlib.util.spec_from_file_location('fl', 'tools/fetch_local.py'); fl = importlib.util.module_from_spec(s); s.loader.exec_module(fl)
A, B, FAM = {'id': 10, 'ancestor_ids': [1, 47532, 5]}, {'id': 20, 'ancestor_ids': [1, 47532, 5]}, {'id': 5, 'ancestor_ids': [1, 47532]}
SP = {'id': 11, 'name': 'A b', 'ancestor_ids': [1, 47532, 5, 10]}
SP2 = {'id': 12, 'name': 'A c', 'ancestor_ids': [1, 47532, 5, 10]}
ORD = {'id': 47532, 'name': 'Scleractinia', 'ancestor_ids': [1]}
def ph(i, lic='cc-by'): return {'id': i, 'license_code': lic, 'attribution': f'(c) X ({lic})', 'url': f'https://x/{i}/square.jpg'}
def ident(who, t, current=True): return {'user': {'login': who}, 'taxon': t, 'current': current}
def ob(i, ids, grade='needs_id', photos=None, taxon=SP, ct=None, agree=None):
    return {'id': i, 'quality_grade': grade, 'taxon': {**taxon, 'name': taxon.get('name', 'A')}, 'user': {'login': 'obs%d' % i},
            'identifications': ids, 'community_taxon_id': ct, 'identifications_most_agree': agree, 'photos': photos or [ph(i * 10)]}
OBS = [
  ob(1, [ident('a', SP), ident('b', SP), ident('c', SP)], 'research', [ph(11), ph(12, 'cc-by-sa'), ph(13, 'cc-by-nc-sa')]),  # RG: its SA photos left out
  ob(2, [ident('thamnasteroid', SP)]),                                   # single expert ID, species of A: accepted
  ob(3, [ident('someone', SP)]),                                         # single ID by someone else: refused
  ob(4, [ident('thamnasteroid', SP), ident('someone', {**B, 'name': 'B'})]),  # disagreeing IDs: refused
  ob(5, [ident('thamnasteroid', SP), ident('someone', SP)]),             # expert + an agreeing ID: accepted
  ob(6, [ident('thamnasteroid', FAM)], taxon={**FAM, 'name': 'F'}),       # expert ID above the genus: refused
  ob(7, [ident('thamnasteroid', {**A, 'name': 'A'})], taxon={**A, 'name': 'A'}),  # expert ID at the genus: accepted
  ob(8, [ident('someone', SP, False), ident('thamnasteroid', SP)]),      # an ID withdrawn: the expert's is the only one
  ob(9, [ident('THAMNASTEROID', SP)], photos=[ph(91, 'cc-by-sa')]),     # accepted, but its only photo is share-alike
  ob(12, [ident('x', SP), ident('y', SP)], ct=11, agree=True),           # genus-level community taxon: accepted as before
  ob(13, [ident('obs13', ORD), ident('thamnasteroid', {**A, 'name': 'A'})], taxon={**A, 'name': 'A'}, ct=47532, agree=True),  # coarse observer ID refined by the expert: accepted
  ob(14, [ident('obs14', {**B, 'name': 'B'}), ident('thamnasteroid', {**A, 'name': 'A'})], taxon={**A, 'name': 'A'}),  # observer's other genus: refused
  ob(15, [ident('obs15', SP), ident('thamnasteroid', {**A, 'name': 'A'})], taxon={**A, 'name': 'A'}),  # a species below the expert's genus: accepted
  ob(16, [ident('obs16', SP2), ident('thamnasteroid', SP)]),            # another species of the genus, off the expert's line: refused
]
URLS, SAVED = [], {}
def get(u):
    URLS.append(u)
    if '/taxa?' in u: return {'results': [{'name': 'A', 'id': 10, 'ancestor_ids': [1, 47532, 5]}]}
    return {'results': OBS if 'radius=40' in u else [], 'total_results': len(OBS) if 'radius=40' in u else 0}
fl.get = get
fl.load_all = lambda: {'gen': {'A': {'views': {}}}, 'x': {'gen': {}}, 'cand': {}}
fl.key_only = lambda d: []
fl.open = lambda *a, **k: io.StringIO('{}')
fl.excluded = lambda *a, **k: False
fl.set_aside = lambda f: False
fl.drop_excluded = lambda d: None
fl.curated = lambda: set()
fl.confirmed_species = lambda *a, **k: []
fl.dump_all = lambda d: SAVED.update(d)
sys.argv = ['x', 'A']
with contextlib.redirect_stdout(io.StringIO()): fl.main()
C = SAVED['cand']['A']`;

test("fetch_local refill: thamnasteroid's undisputed ID accepted in the Philippines tiers; share-alike photos left out photo by photo", () => {
  const R = py(`${RUN}
print(json.dumps({'obs': sorted({int(p['o'].rsplit('/', 1)[1]) for p in C}), 'photos': sorted(p['f'] for p in C),
  'gid': sorted({int(p['o'].rsplit('/', 1)[1]) for p in C if p.get('gid')}),
  'lic': [u for u in URLS if '/observations?' in u]}))`);
  assert.deepStrictEqual(
    R.obs,
    [1, 2, 5, 7, 8, 12, 13, 15],
    'RG, undisputed expert IDs at the genus or below, a community taxon; nothing else'
  );
  assert.deepStrictEqual(R.photos, [
    'a-cand-11',
    'a-cand-120',
    'a-cand-130',
    'a-cand-150',
    'a-cand-20',
    'a-cand-50',
    'a-cand-70',
    'a-cand-80'
  ]);
  assert.deepStrictEqual(R.gid, [2, 5, 7, 8, 12, 13, 15], 'Needs ID observations keep the gid mark');
  R.lic.forEach(u => {
    assert.match(u, /photo_license=cc-by,cc-by-nc,cc0&/);
    assert.ok(!/-sa\b/.test(u), u);
  });
});

test('expert_ok / ph_ok: the rule itself; abroad stays Research Grade only', () => {
  const R = py(`${RUN}
print(json.dumps({'expert': [fl.expert_ok(o, 10) for o in OBS], 'ph': [fl.ph_ok(o, 10) for o in OBS],
  'world': [u for u in URLS if 'not_in_place' in u or 'quality_grade=research&' in u]}))`);
  assert.deepStrictEqual(R.expert, [false, true, false, false, true, false, true, true, true, false, true, false, true, false]);
  assert.deepStrictEqual(R.ph, [true, true, false, false, true, false, true, true, true, true, true, false, true, false]);
});

test('fetch_local --plan stays offline (no iNaturalist request) and says which share-alike candidates a run would drop', () => {
  const R = py(`import importlib.util, io, contextlib
s = importlib.util.spec_from_file_location('fl', 'tools/fetch_local.py'); fl = importlib.util.module_from_spec(s); s.loader.exec_module(fl)
def boom(*a, **k): raise AssertionError('network')
fl.get = boom
fl.urllib.request.urlopen = boom
fl.load_all = lambda: {'gen': {'A': {'views': {}}}, 'x': {'gen': {}}, 'cand': {'A': [
  {'f': 'a1', 'o': 'o1', 'loc': 'dauin', 'lic': 'cc-by-sa'}, {'f': 'a2', 'o': 'o2', 'loc': 'dauin', 'lic': 'cc-by'},
  {'f': 'a3', 'o': 'o3', 'loc': 'dauin', 'lic': 'cc-by-nc-sa'}]}}
fl.key_only = lambda d: []
fl.open = lambda *a, **k: io.StringIO('{}')
fl.excluded = lambda *a, **k: False
fl.set_aside = lambda f: False
fl.curated = lambda: {'a3'}
sys.argv = ['x', '--plan']
out = io.StringIO()
with contextlib.redirect_stdout(out): fl.main()
print(out.getvalue())`);
  assert.deepStrictEqual(R, {A: {keyonly: false, need: null, dauin: 12, ph: 6, drop: 1}});
});

test('saQueue: the share-alike photos on the site, not removed, not kept; never removed for Pierre', () => {
  const L = {
    A: [
      {f: 'a1', lic: 'cc-by-sa', base: 'wide'},
      {f: 'a2', lic: 'cc-by', base: 'wide'},
      {f: 'a3', a: '(c) X (CC BY-NC-SA)', base: 'macro', extra: true},
      {f: 'a4', lic: 'cc-by-nc-sa', base: 'medium'}
    ],
    B: [{f: 'b1', lic: 'cc-by-sa', base: 'wide'}]
  };
  const q = saQueue(
    ['A', 'B'],
    n => L[n],
    (n, p) => p.f === 'a4',
    f => f === 'b1'
  );
  assert.deepStrictEqual(
    q.map(p => [p.genus, p.f, p.fv]),
    [
      ['A', 'a1', 'wide'],
      ['A', 'a3', 'macro']
    ]
  );
});
