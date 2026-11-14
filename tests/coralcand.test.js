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
  });
  Object.values(D.course).forEach(add);
  Object.values(D.cand || {}).forEach(add);
  const P = py(`from fetch_local import licence\nD = json.load(open('data.json'))\nout = []
def add(L): out.extend(licence(p) for p in (L or []))
for g in [*D['gen'].values(), *D['x']['gen'].values()]:
    for L in (g.get('views') or {}).values(): add(L)
    for L in (g.get('more') or {}).values(): add(L)
for L in D['course'].values(): add(L)
for L in (D.get('cand') or {}).values(): add(L)
print(json.dumps(out))`);
  assert.deepStrictEqual(P, all.map(licence));
  all.filter(p => p.lic && p.a).forEach(p => assert.strictEqual(licence({a: p.a}), p.lic, `${p.f}: lic ${p.lic}, credit ${p.a}`));
});

test('cand.json: no share-alike candidate waits (only those curation.json names may stay, e.g. one Pierre added, or restored)', () => {
  const C = read('cand.json').cand;
  Object.entries(C).forEach(([g, L]) => L.forEach(p => assert.ok(p.restored || !shareAlike(p), `${g}: ${p.f} ${p.lic}`)));
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

// A Publish with exclusions (2026-11-06): Pierre's exclusion takes a photo out of every list, kept in excluded.json with its
// place; his Restore (admin Genera › Excluded) puts it back by itself; an excluded candidate is not "used" by curation.json.
const EXCL = `import excluded as X
X.EX = {'a-wide-1': 'excluded', 'a-cand-2': 'excluded', 'a-cand-3': 'auto', 'a-cand-4': 'excluded', 'imrl-p1_i1': 'excluded'}
X.IDS = {X.pid(f) for f in X.EX} - {None}
def unexclude(f):
    del X.EX[f]; X.IDS.clear(); X.IDS.update({X.pid(f) for f in X.EX} - {None})
U = 'https://inaturalist-open-data.s3.amazonaws.com/photos/1/original.jpg'
d = {'gen': {'A': {'views': {'wide': [{'f': 'a-wide-0', 'src': U}, {'f': 'a-wide-1', 'src': U}, {'f': 'a-wide-5', 'src': U}]}}},
     'course': {'A': [{'f': 'imrl-p1_i1'}]},  # an IMR lecture photo: no online original, its file gone with its exclusion
     'cand': {'A': [{'f': 'a-cand-2', 'lic': 'cc-by', 'src': U}, {'f': 'a-cand-3', 'src': U}, {'f': 'a-cand-4', 'lic': 'cc-by-sa', 'src': U},
                    {'f': 'a-cand-6', 'lic': 'cc-by-sa', 'src': U}]}}
F = lambda: {'wide': [p['f'] for p in d['gen']['A']['views']['wide']], 'cand': [p['f'] for p in d['cand'].get('A', [])]}`;

test('drop_excluded keeps what it removes; restore_unexcluded puts an un-excluded photo back at its place, once', () => {
  const R = py(`${EXCL}
gone = {}
X.drop_excluded(d, gone)
a = F()
places = {f: [r['in'], r.get('k'), r.get('v'), r['i']] for f, r in gone.items()}
none = X.restore_unexcluded(d, gone)
unexclude('a-wide-1'); unexclude('imrl-p1_i1')
back = X.restore_unexcluded(d, gone)
again = X.restore_unexcluded(d, gone)
print(json.dumps({'after': a, 'places': places, 'none': none, 'back': back, 'again': again, 'restored': F(), 'left': sorted(gone),
  'course': [p['f'] for p in d['course']['A']]}))`);
  assert.deepStrictEqual(
    R.after,
    {wide: ['a-wide-0', 'a-wide-5'], cand: ['a-cand-3', 'a-cand-6']},
    "Pierre's exclusions go, the auto one stays"
  );
  assert.deepStrictEqual(R.places, {
    'a-wide-1': ['gen', 'views', 'wide', 1],
    'a-cand-2': ['cand', null, null, 0],
    'a-cand-4': ['cand', null, null, 2],
    'imrl-p1_i1': ['course', null, null, 0]
  });
  assert.deepStrictEqual(R.none, [[], []], 'nothing comes back while it is excluded');
  assert.deepStrictEqual(R.back, [['a-wide-1'], ['imrl-p1_i1']], 'a photo with no online original and no file in img/ is held back');
  assert.deepStrictEqual(R.again, [[], ['imrl-p1_i1']], 'restored once');
  assert.deepStrictEqual(R.restored.wide, ['a-wide-0', 'a-wide-1', 'a-wide-5'], 'back at its place');
  assert.deepStrictEqual(R.left, ['a-cand-2', 'a-cand-4', 'imrl-p1_i1'], 'the held one stays in excluded.json (Codex review #628)');
  assert.deepStrictEqual(R.course, []);
});

test('fetch_local tidy: excluded candidates kept in excluded.json (share-alike ones too), waiting share-alike dropped', () => {
  const R = py(`${EXCL}
import fetch_local as fl, io, contextlib
fl.curated = lambda: set()
gone = {}
with contextlib.redirect_stdout(io.StringIO()): fl.tidy(d, gone)
a = F()
unexclude('a-cand-4')
with contextlib.redirect_stdout(io.StringIO()): fl.tidy(d, gone)
mark = [p.get('restored') for p in d['cand']['A'] if p['f'] == 'a-cand-4']
with contextlib.redirect_stdout(io.StringIO()): fl.tidy(d, gone)
print(json.dumps({'after': a, 'gone': sorted(gone), 'restored': F()['cand'], 'mark': mark}))`);
  assert.deepStrictEqual(R.after, {wide: ['a-wide-0', 'a-wide-5'], cand: ['a-cand-3']});
  assert.deepStrictEqual(
    R.restored,
    ['a-cand-3', 'a-cand-4'],
    'a share-alike candidate Pierre restores comes back as a candidate he can add, and stays (Codex review #628)'
  );
  assert.deepStrictEqual(R.mark, [1]);
  assert.deepStrictEqual(R.gone, ['a-cand-2', 'a-wide-1', 'imrl-p1_i1']);
});

test('curated(): an id curation.json excludes is not used, even if a genus still names it', () => {
  const tmp = path.join(require('os').tmpdir(), `cur-${process.pid}.json`);
  fs.writeFileSync(tmp, JSON.stringify({genera: {A: {add: {'a-cand-1': 'wide', 'a-cand-2': 'wide'}}}, exclude: {'a-cand-2': 'excluded'}}));
  try {
    const R = py(
      `from datajson import curated\nk = curated(${JSON.stringify(tmp)})\nprint(json.dumps(['a-cand-1' in k, 'a-cand-2' in k]))`
    );
    assert.deepStrictEqual(R, [true, false]);
  } finally {
    fs.unlinkSync(tmp);
  }
});

test('the photo lists follow curation.json: nothing Pierre excluded in data.json or cand.json, nothing un-excluded left in excluded.json', () => {
  const cur = read('curation.json').exclude || {},
    gone = read('excluded.json').photos,
    D = read('data.json'),
    C = read('cand.json'),
    F = [];
  const walk = o =>
    Array.isArray(o) ? o.forEach(walk) : o && typeof o === 'object' ? (o.f && F.push(o.f), Object.values(o).forEach(walk)) : 0;
  ['gen', 'course', 'cand', 'cmp', 'x'].forEach(k => walk(D[k]));
  walk(C.cand);
  const fix = 'run python3 tools/fetch_local.py --tidy';
  assert.deepStrictEqual(
    F.filter(f => cur[f] && cur[f] !== 'auto'),
    [],
    fix
  );
  // Held back on purpose (tools/excluded.py restore_unexcluded): no online original and no file in img/, which the
  // workflow's tools/apply_excluded_archive.py --files could not take back from git history.
  const held = ([f, r]) => !r.p.src && !fs.existsSync(path.join(ROOT, 'img', f + '.webp'));
  assert.deepStrictEqual(
    Object.entries(gone)
      .filter(([f]) => !cur[f])
      .filter(x => !held(x))
      .map(([f]) => f),
    [],
    fix
  );
  Object.entries(gone).forEach(([f, r]) => assert.strictEqual(r.p.f, f));
});

test('the Candidate photos workflow starts from the latest main and tidies the lists before its commit', () => {
  const y = fs.readFileSync(path.join(ROOT, '.github/workflows/approved-photos.yml'), 'utf8');
  // The photos job (read-only) makes the commit; photos-push (tests/photospush.test.js) pushes it.
  const job = y.slice(y.indexOf('\n  photos:\n'), y.indexOf('\n  photos-push:\n'));
  assert.match(job, /actions\/checkout@v\d+\n\s+with:\n\s+ref: main\n/, 'a queued run must see the commit of the run before it');
  const tidy = job.indexOf('python tools/fetch_local.py --tidy'),
    commit = job.indexOf('name: Prepare the commit');
  assert.ok(tidy > 0 && tidy < commit, 'the tidy step runs before the commit');
  const files = job.indexOf('python tools/apply_excluded_archive.py --files'),
    sizes = job.indexOf('python tools/photos.py');
  assert.ok(files > 0 && files < sizes && sizes < tidy, 'a restored lecture photo: its file from history, its sizes, then back');
  assert.match(job, /fetch-depth: 0\n\s+filter: blob:none/, 'the history, for --files');
  assert.match(job, /git add data\.json cand\.json excluded\.json fish-game\.json img/);
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
    if '/taxa' in u: raise AssertionError('a genus taxon comes from tools/taxonomy.json: ' + u)
    return {'results': OBS if 'radius=40' in u else [], 'total_results': len(OBS) if 'radius=40' in u else 0}
fl.get = get
fl.load_all = lambda: {'gen': {'A': {'views': {}}}, 'x': {'gen': {}}, 'cand': {}}
fl.key_only = lambda d: []
fl.open = lambda *a, **k: io.StringIO('{}')
fl.excluded = lambda *a, **k: False
fl.set_aside = lambda f: False
fl.drop_excluded = lambda d, gone=None: None
fl.load_gone = lambda: {}
fl.save_gone = lambda g: None
fl.curated = lambda: set()
fl.confirmed_species = lambda *a, **k: []
fl.dump_all = lambda d: SAVED.update(d)
fl.inat_taxon = lambda g, s='coral': {'A': 10}.get(g)
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
fl.load_gone = lambda: {}
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

// ROADMAP "Taxonomy reference" (Pierre, 2026-11-05, Q49): the candidate search asks the iNaturalist taxon
// tools/taxonomy.json gives a genus, never a search by name (no homonym guard needed); a genus the file does not hold,
// or whose taxon is inactive, is skipped, said so, and costs no request.
test('fetch_local / cand_gaps / coral_presence: the genus taxon comes from tools/taxonomy.json, no name search', () => {
  ['fetch_local.py', 'cand_gaps.py', 'coral_presence.py'].forEach(f => {
    const src = fs.readFileSync(path.join(ROOT, 'tools', f), 'utf8');
    assert.ok(!/taxa\?q=/.test(src), `${f} still searches a genus by name`);
    assert.match(src, /^from taxonomy import inat_taxon\b/m, `${f} reads the taxon from tools/taxonomy.json`);
  });
  const R = py(`import importlib.util, io, contextlib
s = importlib.util.spec_from_file_location('fl', 'tools/fetch_local.py'); fl = importlib.util.module_from_spec(s); s.loader.exec_module(fl)
URLS = []
fl.get = lambda u: URLS.append(u) or {'results': [], 'total_results': 0}
fl.load_all = lambda: {'gen': {'A': {'views': {}}, 'B': {'views': {}}}, 'x': {'gen': {}}, 'cand': {}}
fl.key_only = lambda d: []
fl.open = lambda *a, **k: io.StringIO('{}')
fl.excluded = lambda *a, **k: False
fl.set_aside = lambda f: False
fl.drop_excluded = lambda d, gone=None: None
fl.load_gone = lambda: {}
fl.save_gone = lambda g: None
fl.curated = lambda: set()
fl.confirmed_species = lambda *a, **k: []
fl.dump_all = lambda d: None
fl.inat_taxon = lambda g, s='coral': {'A': 10}.get(g)
sys.argv = ['x']
out = io.StringIO()
with contextlib.redirect_stdout(out): fl.main()
import taxonomy as X
T = json.load(open('tools/taxonomy.json'))['coral']['gen']
print(json.dumps({'urls': URLS, 'out': out.getvalue(), 'real': all(X.inat_taxon(g) == r['inat']['id'] for g, r in T.items()),
  'none': [X.inat_taxon('Xus'), X.inat_taxon('Astrea', 'fish')]}))`);
  assert.ok(R.urls.length > 0, 'genus A searched');
  R.urls.forEach(u => assert.match(u, /\/observations\?taxon_id=10&/, u));
  assert.match(R.out, /^B has no active iNaturalist taxon in tools\/taxonomy\.json/m);
  assert.ok(R.real, 'inat_taxon gives every genus its taxonomy.json id');
  assert.deepStrictEqual(R.none, [null, null], 'a genus or a subject the file does not hold');
});
