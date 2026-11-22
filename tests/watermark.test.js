require('./slot.js').testGuard();
// The watermark flag (judging/FISH.md "Watermark"): a fish photo with a visible watermark or
// text (a photographer's name, a logo) carries the judged flag w. Home skips it (home.js homeOk: the band, its tiles and
// the Identify door's art); the games keep it as it is (no cap, no ease, no reference level, no order changes), so a
// watermark is never a reason to leave play. The pass's w reaches tags the auto-sort copied into the curation, never the
// tags the admin set by hand, so the admin's Watermark off is kept (autosort.js treeMarked, tools/fish_game.py marked);
// a reference photo's tags and ease in the curation count too. tools/judging_fish.py watermark writes the flags of
// judging/fish-watermark.json into each photo's single judgement. Offline: fixtures and the repository's own files.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  vm = require('vm'),
  {execFileSync} = require('child_process'),
  block = require('./block.js');
const A = require('../autosort.js'),
  C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const py = (code, ...args) =>
  JSON.parse(
    execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, ${JSON.stringify(path.join(ROOT, 'tools'))})\n${code}`, ...args], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 << 20
    })
  );

test('the code: w is a typed flag, in the order j c a w, before the tool-made p and r; the admin toggles it', () => {
  assert.strictEqual(A.treeTag('p1g0sl1jpr', 'w'), 'p1g0sl1jwpr');
  assert.strictEqual(A.treeTag('p1g0sl1jwpr', 'w'), 'p1g0sl1jpr', 'his tap takes it off');
  assert.strictEqual(A.treeTag('p1g0sl1w', 0, 'o'), 'o1g0sl1w', 'a tag change keeps it (the code is valid)');
  const out = py(`from fish_judge import with_flag, cap, CODE
print(json.dumps([with_flag('p1g0sl15', 'w'), with_flag('p1g0sl1jc3', 'w'), with_flag('p1g0sl1w5', 'w'), cap('p1g0sl1jw5', True, 'fishbase'), bool(CODE.match('p1g0sl1wj5'))]))`);
  // A typed flag out of order still reads (the data holds aj and cj); with_flag writes the rubric's order.
  assert.deepStrictEqual(out, ['p1g0sl1w5', 'p1g0sl1jcw3', 'p1g0sl1w5', [5, 'p1g0sl1jwpr'], true]);
});

test('games unchanged: w caps nothing and moves no ease, reference level, order, tile or sure decision', () => {
  const codes = ['p1g0sl1', 'p1g0sm1r', 'o1g1sl1', 'p1g0sl1j', 'h1g0sl1', 'p1g0sls'];
  const addW = jt => A.treeTag(jt, 'w');
  for (const jt of codes)
    for (const e of [2, 4, 5]) {
      const p = {f: 'x', jt, e, rep: /r/.test(jt) ? 'inaturalist' : undefined},
        q = {...p, jt: addW(jt)};
      assert.strictEqual(C.refLevel(q), C.refLevel(p), `refLevel ${jt} ${e}`);
      assert.strictEqual(C.refScore(q.jt), C.refScore(p.jt), `refScore ${jt}`);
      const sure = x => JSON.stringify(x && x.tags ? {...x, tags: x.tags.replace('w', '')} : x);
      assert.strictEqual(sure(A.treeSure({jt: q.jt, e, k: 'best'})), sure(A.treeSure({jt, e, k: 'best'})), `treeSure ${jt}`);
    }
  const L = codes.map((jt, i) => ({f: 'p' + i, jt, e: 5 - (i % 3)})),
    W = L.map(p => ({...p, jt: addW(p.jt)}));
  assert.deepStrictEqual(
    C.easyRank(W).map(p => p.f),
    C.easyRank(L).map(p => p.f),
    'the order photos are met in'
  );
  const out = py(
    `import fish_game as G, fish_judge as J
cs = json.loads(sys.argv[1])
print(json.dumps([[G.tile_tags(c) == G.tile_tags(G.marked(c, c + 'w', True)), G.judged_sure(c, 3) == G.judged_sure(G.marked(c, c + 'w', True), 3), G.ref_score(c) == G.ref_score(G.marked(c, c + 'w', True))] for c in cs]
 + [J.cap(c + '4', False)[0] == J.cap(J.with_flag(c + '4', 'w'), False)[0] for c in ['p1g0sl1', 'h1g0sl1', 'p1g0sl1j', 'p0g3sl1']]))`,
    JSON.stringify(codes.map(c => c.replace(/[pr]+$/, '')))
  );
  out.forEach((x, i) => assert.ok(Array.isArray(x) ? x.every(Boolean) : x, `case ${i}`));
});

// The auto-sort's copy of the pass's tags (log code with t) takes the pass's w; tags the admin set (t gone: treeOwn) stand.
const CASES = [
  // [his tags, the pass's jt, his log code, expected]
  ['p1g0sl1', 'p1g0sl1w', 'ate', 'p1g0sl1w'],
  ['p1g0sl1', 'p1g0sl1w', 'ae', 'p1g0sl1'],
  ['p1g0sl1', 'p1g0sl1w', 'ate@k9', 'p1g0sl1w'],
  ['p1g0sl1', 'p1g0sl1w', null, 'p1g0sl1'],
  ['p1g0sl1jp', 'p1g0sl1jwp', 'atep', 'p1g0sl1jwp'],
  ['p1g0sl1', 'p1g0sl1', 'ate', 'p1g0sl1'],
  ['p1g0sl1w', 'p1g0sl1', 'ae', 'p1g0sl1w']
];
test('the pass’s w on the auto-sort’s copy only, the same in the admin and in tools/fish_game.py', () => {
  const Fof = ([mine, , code]) => ({tags: {x: mine}, ...(code ? {auto: {'2026-11-05': {x: code}}} : {})});
  const js = CASES.map(c => A.treeTagsMine(Fof(c), 'x', c[1]));
  assert.deepStrictEqual(
    js,
    CASES.map(c => c[3])
  );
  const pyOut = py(
    `import fish_game as G
cs = json.loads(sys.argv[1])
out = []
for mine, passed, code, _ in cs:
    F = {'tags': {'x': mine}, **({'auto': {'2026-11-05': {'x': code}}} if code else {})}
    out.append(G.mine_tags(F, 'x', passed))
print(json.dumps(out))`,
    JSON.stringify(CASES)
  );
  assert.deepStrictEqual(pyOut, js, 'python agrees');
  // The latest day's code wins (autosort.js treeIdx): an edit of his after the copy keeps his tags.
  const F = {tags: {x: 'p1g0sl1'}, auto: {'2026-11-05': {x: 'ate'}, '2026-11-09': {x: 'ae'}}};
  assert.strictEqual(A.treeTagsMine(F, 'x', 'p1g0sl1w'), 'p1g0sl1');
  assert.deepStrictEqual(
    py(`import fish_game as G\nprint(json.dumps(sorted(G.tags_auto(json.loads(sys.argv[1])))))`, JSON.stringify(F)),
    []
  );
  // A photo the auto-sort brought back (log b, Q438) carries its copy as an add does; a Check is never a b.
  const B = {tags: {x: 'p1g0sl1', y: 'p1g0sl1'}, auto: {'2026-11-12': {x: 'r', y: 'r'}, '2026-11-20': {x: 'btec', y: '?bt'}}};
  assert.deepStrictEqual(
    ['x', 'y'].map(f => A.treeTagsAuto(B, f)),
    [true, false]
  );
  assert.deepStrictEqual(py(`import fish_game as G\nprint(json.dumps(sorted(G.tags_auto(json.loads(sys.argv[1])))))`, JSON.stringify(B)), [
    'x'
  ]);
});

test('fish_game.py record: a reference photo takes Pierre’s tags and ease; his Watermark off stands on every route', () => {
  const out = py(`import fish_game as G
ref = {'f': 'fi1', 'o': 'https://www.inaturalist.org/observations/1', 'src': 'x', 'e': 5, 'jt': 'p1g0sl1wr', 'rep': 'inaturalist'}
cand = {'f': 'fish-s1-cand-2', 'o': 'https://www.inaturalist.org/observations/2', 'src': 'x'}
sug = {'fish-s1-cand-2': {'jt': 'p1g0sl1w', 'e': 4}}
F0 = {}
F1 = {'tags': {'fi1': 'p1g0sl1r', 'fish-s1-cand-2': 'p1g0sl1'}, 'ease': {'fi1': 3}, 'auto': {'d': {'fish-s1-cand-2': 'ate'}}}
F2 = {'tags': {'fish-s1-cand-2': 'p1g0sl1'}, 'auto': {'d': {'fish-s1-cand-2': 'ae'}}}
r = lambda F, p, route: (lambda x: [x['jt'], x['e']])(G.record('s1', p, F, sug, 's1', {}, route))
print(json.dumps([r(F0, ref, 'ref'), r(F1, ref, 'ref'), r(F0, cand, 'cand'), r(F1, cand, 'cand'), r(F2, cand, None)]))`);
  assert.deepStrictEqual(out, [
    ['p1g0sl1wr', 5], // the judged code
    ['p1g0sl1r', 3], // his tags (Watermark off) and ease
    ['p1g0sl1w', 4],
    ['p1g0sl1w', 4], // the auto-sort's copy takes the pass's w
    ['p1g0sl1', 4] // his own tags stand
  ]);
});

// home.js on its own block, with app.js's helpers stubbed.
function home(gx = {}) {
  const hs = fs.readFileSync(path.join(ROOT, 'home.js'), 'utf8'),
    juvP = p => !!p && (p.ph === 'juvenile' || /j/.test(String(p.jt || '').slice(7))),
    ctx = {
      cover: g => g.coverP || g.views.wide[0],
      juvP,
      adultFirst: L => L.find(p => !juvP(p)) || L[0] || null,
      refLevel: C.refLevel,
      GX: n => gx[n]
    };
  vm.createContext(ctx);
  vm.runInContext(
    block(hs, 'const LAND_AR = [', 'const ph = (n, v) =>', {file: 'home.js'}) +
      '\nthis.tile = tilePhoto; this.pool = landPool; this.unit = homeUnit; this.ok = homeOk;',
    ctx
  );
  return ctx;
}
test('Home skips a photo with a watermark: the band’s pool, a tile’s own pick, his cover; a family with only those is not drawn', () => {
  const ref = (f, o = {}) => ({f, ar: 1.5, jt: 'p1g0sl1', e: 5, ...o}),
    a = ref('a'),
    aw = ref('aw', {jt: 'p1g0sl1w'}),
    b = ref('b'),
    cw = ref('cw', {jt: 'p1g0sl1wr', e: 4, rep: 'inaturalist'}),
    sq = ref('sq', {ar: 1}),
    sqw = ref('sqw', {ar: 1, jt: 'p1g0sl1w'});
  const H = home({u1: {views: {wide: [sqw, aw]}}, u2: {views: {wide: [aw, sq]}}}),
    fs_ = L => Array.from(L, p => p.f);
  assert.ok(C.refLevel(aw) && C.refLevel(cw), 'reference level unchanged');
  assert.deepStrictEqual(fs_(H.pool({views: {wide: [aw, a, cw, b]}})), ['a', 'b']);
  assert.deepStrictEqual(fs_(H.pool({views: {wide: [a, b]}, coverP: aw})), ['a', 'b'], 'his cover with a watermark: skipped on Home');
  assert.strictEqual(H.tile({views: {wide: [aw, a]}, coverP: cw}, true).f, 'a');
  assert.strictEqual(H.tile({views: {wide: [sqw, aw, sq]}}, true).f, 'sq', 'nothing suits: the first without a watermark');
  assert.ok(!H.unit('u1'), 'only photos with a watermark: the family is not drawn');
  assert.ok(H.unit('u2'));
  assert.ok(H.ok({f: 'coral'}), 'a photo with no judged code (corals) is fine');
});

test('tools/judging_fish.py watermark: the flag into the single judgement, in place, the files’ layout kept', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'watermark-'));
  fs.mkdirSync(path.join(dir, 'judging', 'fish'), {recursive: true});
  fs.mkdirSync(path.join(dir, 'tools'));
  const cand =
      '{\n "photos": {\n  "fish-s001-cand-11": {\n   "code": "p1g0sl1j4",\n   "keep": "best"\n  },\n  "fish-s001-cand-12": {\n   "code": "p1g0sl14",\n   "keep": "alt"\n  }\n }\n}\n',
    judge = '{\n"photos": {\n"t01": {"fi11": "p1g0sl1j4", "fi13": "o1g0sl15", "fi14": "p1g0sl15"}\n}\n}\n';
  fs.writeFileSync(path.join(dir, 'judging', 'fish', 's001.json'), cand);
  fs.writeFileSync(path.join(dir, 'tools', 'fish_judge.json'), judge);
  // fi11 is the reference copy of a candidate (its candidate file is its judgement); fi13 a reference photo only.
  fs.writeFileSync(path.join(dir, 'judging', 'fish-watermark.json'), JSON.stringify({photos: {fi11: 'a name', fi13: 'a logo'}}));
  const run = check => py(`import judging_fish as JF\nprint(json.dumps(JF.watermark_fix(sys.argv[1], ${check ? 'True' : 'False'})))`, dir);
  assert.deepStrictEqual(run(true), [
    ['fi11', 'judging/fish/s001.json', 'p1g0sl1j4', 'p1g0sl1jw4'],
    ['fi13', 'tools/fish_judge.json', 'o1g0sl15', 'o1g0sl1w5']
  ]);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'tools', 'fish_judge.json'), 'utf8'), judge, '--check writes nothing');
  run(false);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'judging', 'fish', 's001.json'), 'utf8'), cand.replace('"p1g0sl1j4"', '"p1g0sl1jw4"'));
  assert.strictEqual(fs.readFileSync(path.join(dir, 'tools', 'fish_judge.json'), 'utf8'), judge.replace('"o1g0sl15"', '"o1g0sl1w5"'));
  assert.deepStrictEqual(run(true), [], 'done once');
  fs.rmSync(dir, {recursive: true, force: true});
});

test('the repository: every photo of the watermark pass carries w where the game reads it; the pass is complete', () => {
  const W = read('judging/fish-watermark.json'),
    marks = Object.keys(W.photos),
    game = Object.values(C.treeGameRead(read('fish-game.json')).photos).flat(),
    byPid = new Map(game.map(p => [C.treePid(p.f), p]));
  assert.ok(marks.length > 0 && W.looked >= marks.length);
  marks.forEach(f => {
    assert.ok(String(W.photos[f]).length > 0, `${f}: what the judge saw`);
    const p = byPid.get(C.treePid(f));
    if (p) assert.ok(String(p.jt).slice(7).includes('w'), `${f}: ${p.jt} in fish-game.json`);
  });
  // The first photos (fish-photos.json, Home before fish-game.json) are fish-game.json's records: they carry it too.
  Object.values(read('fish-photos.json').photos)
    .flat()
    .forEach(p => {
      const g = byPid.get(C.treePid(p.f));
      if (g) assert.strictEqual(p.jt, g.jt, p.f);
    });
  execFileSync('python3', ['tools/judging_fish.py', 'watermark', '--check'], {cwd: ROOT, encoding: 'utf8'});
});
