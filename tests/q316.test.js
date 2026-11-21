require('./slot.js').testGuard();
// Q316's offline-fit tool (tools/studies/q316/): the loader (prep.js), the side checks (checks.js) and, with numpy and
// scipy (tools/requirements.txt, installed by checks.yml; skipped without them), the estimator (fit.py, through
// tests/q316fit_check.py). Made-up answers and names only (rule D2). Q316_PYTHON: another python3 (one with scipy).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {spawnSync} = require('child_process');

const ROOT = path.join(__dirname, '..'),
  DIR = path.join(ROOT, 'tools', 'studies', 'q316'),
  PY = process.env.Q316_PYTHON || 'python3';
const Pr = require(path.join(DIR, 'prep.js')),
  K = require(path.join(DIR, 'checks.js'));
const README = fs.readFileSync(path.join(DIR, 'README.md'), 'utf8');
const sci = spawnSync(PY, ['-c', 'import numpy, scipy'], {encoding: 'utf8'}).status === 0;

const T0 = Date.parse('2026-11-10T09:00:00+08:00');
// A readAnswers row (Code.gs answerOut_): made-up player, unit, photos, right, choices, scoring record.
const ra = (w, i, u, ph, ok, ch, sc = null, extra = {}) => [
  w,
  T0 + i * 60000,
  u,
  ok ? u : ch.find(x => x !== u) || '',
  ok ? 1 : 0,
  'quiz',
  ph.join(' '),
  0.7,
  1,
  0,
  ch.join(' '),
  0,
  5,
  0,
  480,
  '',
  null,
  extra.s || 'coral',
  extra.rk || 'genus',
  '',
  '',
  extra.sp || '',
  sc
];
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'q316-'));

test('prep.js: the Answers tab with its header; names become P1, P2... by answers, never written but to --map', () => {
  const head = [...Pr.HEAD, 'Rejected tries', 'Device', 'Photo answered', 'Content version'];
  const row = (w, i, ok, sc = '') => [
    w,
    '2026-11-15 10:0' + (i % 10),
    'Acropora',
    ok ? 'Acropora' : 'Porites',
    ok,
    'quiz',
    'acro-1',
    'x',
    0.7,
    1,
    0,
    'Acropora Porites Favia Montipora',
    4,
    0,
    480,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    sc
  ];
  const V = [
    head,
    ...Array.from({length: 6}, (_, i) => row('Alice Madeup', i, 1)),
    ...Array.from({length: 3}, (_, i) => row('Bob Madeup', i, i % 2)),
    row('Carol Madeup', 0, 1)
  ];
  const L = Pr.load({values: V}, ['carol madeup']);
  assert.strictEqual(L.form, 'tab');
  assert.strictEqual(L.rows.length, 9, 'the excluded player is out');
  assert.strictEqual(L.rows[0][1], Date.parse('2026-11-15T10:00:00+08:00'), 'Manila time');
  const X = Pr.prepare(L.rows, 'coral', {coralTax: () => ({Acropora: 'Acroporidae'})});
  assert.deepStrictEqual(X.map, {P1: 'Alice Madeup', P2: 'Bob Madeup'});
  assert.ok(!JSON.stringify(X.rows).includes('Madeup'), 'no name in the rows');
  assert.strictEqual(X.rows[0].F, 'Acroporidae');
  // a header that is not the tab's stops the run
  assert.throws(
    () =>
      Pr.load({
        values: [
          ['Name', 'When'],
          ['x', 'y']
        ]
      }),
    /column 2 is "When", expected "Time"/
  );
  // the CLI: no name on its output, the export outside the repository only
  const d = tmp(),
    log = path.join(d, 'log.json');
  fs.writeFileSync(log, JSON.stringify({values: V}));
  let r = spawnSync('node', [path.join(DIR, 'prep.js'), log, 'coral', path.join(d, 'ex.json'), '--map', path.join(d, 'map.json')], {
    encoding: 'utf8'
  });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(!/Madeup/.test(r.stdout + r.stderr), 'a name printed');
  assert.ok(!fs.readFileSync(path.join(d, 'ex.json'), 'utf8').includes('Madeup'));
  assert.ok(fs.readFileSync(path.join(d, 'map.json'), 'utf8').includes('Alice Madeup'));
  r = spawnSync('node', [path.join(DIR, 'prep.js'), log, 'coral', path.join(ROOT, 'q316-export.json')], {encoding: 'utf8'});
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /outside the repository/);
  assert.ok(!fs.existsSync(path.join(ROOT, 'q316-export.json')));
  fs.rmSync(d, {recursive: true});
});

test('prep.js: readAnswers form, left-out ids, offsets, practice counts and the fish taxa from the photos', () => {
  const ch = ['Acropora', 'Porites', 'Favia', 'Montipora'];
  const rows = [];
  // four players: 30, 20, 12, 5 answers; P1's first answer has a scoring record
  [
    ['a1', 30],
    ['a2', 20],
    ['a3', 12],
    ['a4', 5]
  ].forEach(([w, n]) => {
    for (let i = 0; i < n; i++)
      rows.push(
        ra(
          w,
          rows.length,
          i % 2 ? 'Acropora' : 'Porites',
          ['p' + (i % 3)],
          i % 5 !== 0,
          ch,
          w === 'a1' && i === 0 ? {d: 0.4, f: -0.5, c: 0.1, o: 0.2} : null
        )
      );
  });
  rows.push(ra('gone', rows.length, 'Acropora', ['p0'], 1, ch));
  const L = Pr.load({ok: true, rows, excluded: ['gone']});
  assert.strictEqual(L.rows.length, 67);
  const X = Pr.prepare(L.rows, 'coral', {coralTax: () => ({})});
  const by = p => X.rows.filter(r => r.p === p);
  const first = by('P1')[0];
  assert.ok(Math.abs(first.off - (-0.5 + 0.1 - 0.2 + 0.5)) < 1e-9, 'memory + mix-ups - format + one photo alone');
  const second = by('P1')[1];
  assert.strictEqual(second.mem, 0, 'a photo never shown: memory 0');
  const fourth = by('P1')[3]; // p0 shown before only on the other unit (Porites, i=0): no memory on this one
  assert.strictEqual(fourth.mem, 0);
  const seventh = by('P1')[6]; // p0 on Porites again (i=0 was a miss there), so bucket 1
  assert.strictEqual(seventh.mem, -0.5);
  assert.deepStrictEqual([fourth.np, fourth.nu], [3, 1]);
  assert.ok(by('P1')[0].tr && !by('P4')[0].tr, 'trust: core.js trustOf');
  assert.strictEqual(X.rows.filter(r => r.use).length, X.rows.filter(r => r.tr).length);
  // fish: the photos' species give the family, genus and species; the judged ease its 3 - e
  const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'fish-game.json'), 'utf8'));
  const pics = Object.values(G.photos)
    .flat()
    .filter(p => p && p.sp && typeof p.e === 'number')
    .slice(0, 3);
  const FT = Pr.fishTax(),
    tax = FT.of(pics[0].sp);
  assert.ok(tax.F.startsWith('f:') && tax.G && tax.S === pics[0].sp, JSON.stringify(tax));
  const fr = pics.map((p, i) => ra('f1', i, tax.F, [p.f], 1, [tax.F, 'f:Other'], null, {s: 'fish', rk: 'family'}));
  const FX = Pr.prepare(fr, 'fish');
  assert.strictEqual(FX.rows[0].S, pics[0].sp);
  assert.strictEqual(FX.rows[0].ez[0], 3 - pics[0].e);
  assert.strictEqual(FX.rows[0].ezK, 0.5);
});

test('checks.js: Q136 centring, its declared rule on planted logs (not centred, centred, too few units)', () => {
  const plant = (slopeOnGd, units = 12, flat = false) => {
    const rows = [],
      delta = [],
      gd = {};
    for (let u = 0; u < units; u++) gd['U' + u] = flat ? 0 : (u - units / 2) / 4;
    let s = 1;
    const noise = () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5) * 0.2;
    // 8 players, each meeting the units in its own order (a rotation), 8 answers on each
    for (let p = 0; p < 8; p++)
      for (let j = 0; j < units; j++)
        for (let k = 0; k < 8; k++) {
          const u = 'U' + ((j + 3 * p) % units);
          rows.push({p: 'P' + p, u, nu: k});
          delta.push(slopeOnGd * gd[u] + noise());
        }
    return K.centring(rows, delta, gd, {});
  };
  assert.match(plant(-0.5).verdict, /^not centred/);
  assert.match(plant(0).verdict, /^centring not rejected/);
  assert.strictEqual(plant(-0.5, 6).verdict, 'the measure cannot tell');
  // live offsets all equal (no trusted player yet): Spearman undefined, no p-value, the measure cannot tell
  const flat = plant(0, 12, true);
  assert.strictEqual(flat.verdict, 'the measure cannot tell');
  assert.ok(!('p' in flat.C2));
});

test('checks.js: the whole run on a small made-up log; a deadline already past cuts it', () => {
  const ch = ['Acropora', 'Porites', 'Favia', 'Montipora'],
    rows = [];
  for (let i = 0; i < 240; i++)
    rows.push(ra('w' + (i % 6), i, ch[i % 4], ['c' + (i % 4) + '-' + (i % 7)], (i * 7) % 10 < 7, ch, {d: 0.2 * (i % 4), f: 0, o: 0}));
  const X = Pr.prepare(rows, 'coral', {coralTax: () => ({})});
  const fit = {fit: {sd: {player: [0.5], pu: [0.2], gen: [0.3], photo: [0.4]}, fixed: {c: [0.8]}, effects: {gen: {Acropora: 0.1}}}};
  const out = K.run(X, {full: fit}, null, null);
  assert.ok(!out.cut);
  assert.deepStrictEqual(out.done, ['live units', 'centring']);
  assert.ok(out.centring.primary && typeof out.centring.verdict === 'string');
  assert.ok(!('primary' in out) && !('exploratory' in out), 'check 2B is not in this tool (the README follow-up)');
  assert.ok(K.run(X, {full: fit}, null, 1).cut);
  // the clock: never past 40 minutes from now, whatever deadline is given (rule L11)
  const now = Date.now() / 1000;
  assert.ok(K.capDeadline(now + 3 * 3600) <= now + 40 * 60 + 1);
  assert.ok(K.capDeadline(null) <= now + 40 * 60 + 1);
  assert.strictEqual(K.capDeadline(now + 60), now + 60);
});

test("checks.js: the person replay scores as the game does: a smaller fault's weight (z), a species' starting unit (from)", () => {
  const C = require(path.join(ROOT, 'core.js')),
    F = JSON.parse(fs.readFileSync(path.join(ROOT, 'fish.json'), 'utf8')),
    gen = C.treeReplayGen(F),
    sp = Object.keys(gen).find(u => u.startsWith('s:') && gen[u].from),
    fam = gen[sp].from;
  const base = {p: 'P1', k: 4, g: 0.25, sec: 5, e: null, th: null, mem: 0, cf: 0, R: 1, df: 0, Sl: 1, ph: ['x']},
    rows = [
      {...base, u: fam, c: fam, y: 1, chs: [fam, 'f:a', 'f:b', 'f:c'], d0: -1, z: null},
      {...base, u: fam, c: fam, y: 1, chs: [fam, 'f:a', 'f:b', 'f:c'], d0: -1, z: null},
      {...base, u: sp, c: 's:other', y: 0, chs: [sp, 's:other'], k: 2, g: 0.5, d0: 0.5, z: 'cn'},
      {...base, u: sp, c: sp, y: 1, chs: [sp, 's:other'], k: 2, g: 0.5, d0: 0.5, z: null}
    ];
  // the reference: core.js scoreAnswer with what the sheet's replay passes (replayProgress: from, cfrom, z)
  const P = {},
    want = rows.map(r => {
      const q = {t: r.u, c: r.c, ok: !!r.y, k: r.k, chs: r.chs, ph: r.ph, cv: !r.y && r.c !== r.u, p: 0, sec: r.sec, timed: true, rt: true};
      Object.assign(q, {d0: r.d0, fam: 0, cf: 0, R: 1, df: 0, S: 1, look: false, dom: true});
      if (gen[r.u] && gen[r.u].from) q.from = gen[r.u].from;
      if (!r.y && gen[r.c] && gen[r.c].from) q.cfrom = gen[r.c].from;
      if (r.z) q.z = r.z;
      return C.scoreAnswer(P, q).th0;
    });
  assert.deepStrictEqual(K.persons(rows, gen).th, want);
  assert.notDeepStrictEqual(K.persons(rows, {}).th, want, 'without the starting units the species starts elsewhere');
  assert.notDeepStrictEqual(
    K.persons(
      rows.map(r => ({...r, z: null})),
      gen
    ).th,
    want,
    'without z the smaller fault weighs as a full miss'
  );
  // prep.js keeps the kind of fault from the scoring record
  const X = Pr.prepare([ra('w', 0, 'Acropora', ['p'], 0, ['Acropora', 'Porites'], {d: 0.1, z: 'g'})], 'coral', {coralTax: () => ({})});
  assert.strictEqual(X.rows[0].z, 'g');
});

test("the rules the README declares are the code's (fit.py ACCEPT, the clock; checks.js RULES)", () => {
  const fit = fs.readFileSync(path.join(DIR, 'fit.py'), 'utf8');
  assert.match(fit, /ACCEPT = \{'reps': 20, 'bias': 0\.1, 'cover': 15, 'level': 0\.90\}/);
  assert.match(fit, /BUDGET_MIN = 40\b/);
  for (const s of [
    '20 replicates',
    'within ±0.1',
    '15 of the 20',
    '90% interval',
    '40 minutes',
    '6th answer',
    '3 or more',
    'fewer than 8 units',
    '10,000'
  ])
    assert.ok(README.includes(s), 'README: ' + s);
  assert.ok(README.includes('p < 0.05'), 'README: 2C alpha');
  assert.strictEqual(K.RULES.centring.alpha, 0.05);
  assert.deepStrictEqual(
    [K.RULES.centring.after, K.RULES.centring.minPlayers, K.RULES.centring.minUnits, K.RULES.centring.perms],
    [5, 3, 8, 10000]
  );
});

test(
  'fit.py: the sparse Laplace objective equals the dense one; it recovers a planted SD; the acceptance rule; the clock',
  {skip: !sci && 'no numpy/scipy'},
  () => {
    const r = spawnSync(PY, [path.join(__dirname, 'q316fit_check.py')], {
      cwd: ROOT,
      encoding: 'utf8',
      env: {...process.env, OMP_NUM_THREADS: '1'}
    });
    assert.strictEqual(r.status, 0, r.stderr);
    const o = JSON.parse(r.stdout.trim().split('\n').pop());
    assert.ok(o.laplace < 1e-4, 'sparse against dense: ' + o.laplace);
    const [est, [lo, hi]] = o.gen;
    assert.ok(est > 0.7 && est < 1.5 && lo < 1 && hi > 1, JSON.stringify(o.gen));
    const CT = 'the measure cannot tell';
    assert.deepStrictEqual(o.rule, {pass: 'pass', bias: 'fail', cover: 'fail', short: CT, reps40: CT, reps10: CT});
    assert.deepStrictEqual(o.shared, [true, false, false], 'the shared-SD fallback only where both levels exist and one fails');
    assert.ok(o.deadline && o.finite);
    assert.deepStrictEqual(o.cap, {fit: true, short: true, run: [40, 10, 40]}, 'never past 40 minutes (rule L11)');
  }
);

test('fit.py: refuses to write its output inside the repository', {skip: !sci && 'no numpy/scipy'}, () => {
  const r = spawnSync(PY, [path.join(DIR, 'fit.py'), 'fit', 'x.json', path.join(ROOT, 'q316-fit.json')], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {...process.env, CI: '1'}
  });
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /outside the repository/);
});

// ---- 2B (replay2b.js): the engine's own functions, the scorer, the shared chain's update, the primary's coverage.
const B2 = require(path.join(DIR, 'replay2b.js'));

test("replay2b.js: one eloReplay serves what core.js eloOf and genusOffsetsOf serve; photoDiff is model.js's own", () => {
  const C = require(path.join(ROOT, 'core.js')),
    ch = ['Acropora', 'Porites', 'Favia', 'Montipora'],
    rows = [];
  for (let i = 0; i < 120; i++)
    rows.push(ra('w' + (i % 4), i, ch[i % 4], ['c' + (i % 4) + '-' + (i % 5)], (i * 7) % 10 < 7, ch, {d: 0.1, f: 0, o: 0}));
  const E = B2.engine().eloReplay(rows),
    s = B2.served(E);
  assert.deepStrictEqual(s.photos, C.eloOf(rows));
  assert.deepStrictEqual(s.gd, C.genusOffsetsOf(rows));
  const PD = B2.photoDiffOf(C.SUBJECTS[0]);
  Object.assign(PD, {PGD: s.gd, PSTAT: s.photos, PTM: s.ptm});
  const o = s.photos['c0-0'],
    W = 5;
  const want = (o[1] * o[0] + W * s.gd.Acropora[0]) / (o[1] + W) + C.ptimeOff(s.ptm['c0-0'], W);
  assert.ok(Math.abs(PD.photoDiff('Acropora', {f: 'c0-0'}) - want) < 1e-9, PD.photoDiff('Acropora', {f: 'c0-0'}) + ' ' + want);
});

test("replay2b.js: the expectation is core.js scoreAnswer's, on the ability the app logged", () => {
  const C = require(path.join(ROOT, 'core.js'));
  const q = {t: 'Acropora', c: 'Acropora', ok: true, k: 4, chs: ['Acropora', 'Porites', 'Favia', 'Montipora'], ph: ['x']};
  Object.assign(q, {d0: 0.4, fam: -0.5, cf: 0.1, R: 0.9, S: 1.2, th: 0.7, p: 0, dom: true, look: false});
  const e = C.scoreAnswer({}, q).e;
  const r = {g: 0.25, R: 0.9, Sl: 1.2, th: 0.7, mem: -0.5, cf: 0.1};
  assert.ok(Math.abs(B2.expected(r, 0.4) - e) < 1e-12);
});

test('replay2b.js: the shared chain: no photo moves nothing; an untrusted answer moves the level only; the surprise split by the variances', () => {
  const C = require(path.join(ROOT, 'core.js'));
  const V = {fam: 0.1, gen: 0.4, sp: 0.2, photo: 0.9},
    st = B2.chainState('fish', V),
    r = {p: 'P1', u: 'f:A', rk: 'family', F: 'f:A', G: 'g:B', S: 's1', ph: ['x'], mu: [0.3], g: 0.25, y: 1},
    x = (o = {}) => ({r: {...r, ...o}, w: ['P1'], trusted: true, mem: C.MEM.PRIOR.slice(), delta: null});
  B2.chainStep(st, x({ph: [], mu: []}));
  assert.deepStrictEqual([Object.keys(st.R).length, Object.keys(st.m).length], [0, 0], 'an answer without photos moves nothing');
  B2.chainStep(st, {...x(), trusted: false});
  assert.strictEqual(Object.keys(st.m).length, 0, 'untrusted: no part moves');
  assert.strictEqual(st.R.P1[1], 1, 'but the level steps');
  // trusted, n = 1 answer before (weight 1/11): each part moves by its variance; the photo starts at its prior mean
  const before = B2.chainD(st, r);
  B2.chainStep(st, x());
  const mv = k => (k === 'I|x' ? st.m[k] - 0.3 : st.m[k]);
  assert.ok(B2.chainD(st, r) < before, 'a right answer: the question easier');
  const ratio = mv('I|x') / mv('G|g:B');
  assert.ok(Math.abs(ratio - 0.9 / 0.4) < 1e-9, 'moves in the ratio of the variances: ' + ratio);
  assert.ok(st.v['I|x'] < 0.9 && st.v['G|g:B'] < 0.4, 'each variance shrinks');
  // the v31-equivalent: today's steps over the gradient at the game's target
  assert.ok(Math.abs(B2.V31.photo / B2.V31.unit - 2) < 1e-12);
  assert.ok(B2.aStar > 0.9 && B2.aStar < 0.93);
});

test("replay2b.js: the variances: the half fit's SD for a level that passed, the v31-equivalent for one that did not", () => {
  const H = {sd: {fam: [0.5], gen: [0.6], sp: [0.7], photo: [0.02]}, fixed: {r_genus: [0.3, 0.1, {}]}},
    full = {report: {fam: {verdict: 'pass'}, gen: {verdict: 'x'}, sp: {verdict: 'x'}, photo: {verdict: 'x'}, r_genus: {verdict: 'x'}}};
  const {v, src} = B2.variances('fish', H, full);
  assert.strictEqual(v.fam, 0.25);
  assert.strictEqual(v.gen, B2.V31.unit / 2, 'two fish levels failed: they share the unit variance');
  assert.strictEqual(v.photo, B2.V31.photo);
  assert.strictEqual(v.r_genus, 'online');
  assert.strictEqual(src.photo, 'v31-equivalent');
  full.report_shared = {gs: {verdict: 'pass'}};
  full.fit_shared = {sd: {gs: [0.45]}};
  assert.ok(Math.abs(B2.variances('fish', H, full).v.sp - 0.45 ** 2) < 1e-12, 'the shared SD when it passed');
  assert.ok(Math.abs(B2.variances('coral', {sd: {gen: [0.8], photo: [0.4]}}, {report: {gen: {verdict: 'pass'}}}).v.gen - 0.64) < 1e-12);
});

test("replay2b.js: the primary counts only the earlier answers of players trusted at that moment; the arms' predictions", () => {
  const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'fish-game.json'), 'utf8'));
  const pics = Object.values(G.photos)
    .flat()
    .filter(p => p && p.sp && typeof p.e === 'number')
    .slice(0, 6);
  const tax = Pr.fishTax().of(pics[0].sp),
    ch = [tax.F, 'f:Other'],
    sc = {d: 0.2, f: 0, o: 0},
    rows = [],
    add = (w, f, ok) => rows.push(ra(w, rows.length, tax.F, [f], ok, ch, sc, {s: 'fish', rk: 'family'}));
  for (let i = 0; i < 20; i++) add('t1', pics[1 + (i % 5)].f, 1); // a trusted player (20 right of 2 choices)
  for (let i = 0; i < 3; i++) add('u1', pics[0].f, 0); // an untrusted one, 3 answers on photo 0
  for (let i = 0; i < 4; i++) add('t1', pics[0].f, 1);
  const L = Pr.load({ok: true, rows});
  const X = Pr.prepare(L.rows, 'fish'),
    lab = new Map(Object.entries(X.map).map(([l, w]) => [w, l])),
    raw = L.rows.map(r => [lab.get(r[0]), ...r.slice(1)]);
  const fit = {sd: {fam: [0.4], gen: [0.3], sp: [0.3], photo: [0.4]}, fixed: {}},
    R = B2.replay(raw, X, {A: fit, B: fit}, null);
  assert.ok(R.prim[23], "the untrusted player's 3 answers do not count");
  assert.ok(R.prim[25] && !R.prim[26], '3 earlier trusted answers: no longer new');
  assert.ok(R.E.a1.every(x => x > 0 && x < 1) && R.E.a2.every(x => x > 0 && x < 1));
  assert.ok(R.E.log.every((x, i) => Math.abs(x - B2.expected(X.rows[i], 0.2)) < 1e-12), "the logged arm: the scoring record's d");
  const T = B2.tables(X, R, null, null);
  assert.strictEqual(T.primary.verdict, 'the measure cannot tell', 'two players: no test');
});

test("the rules the README declares for 2B are replay2b.js's", () => {
  const P = B2.RULES.primary;
  assert.deepStrictEqual([P.minPlayers, P.minAnswers, P.alpha, B2.RULES.minutes], [6, 20, 0.05, 40]);
  for (const s of [
    'fewer than 3 earlier answers by players trusted at that moment',
    '20 or more such answers',
    'fewer than 6 such players',
    'odd labels P1, P3',
    'v31-equivalent',
    'photo 0.8, unit `GENUS_K` 0.4',
    'units with 20 or more answers',
    'Its own 40-minute'
  ])
    assert.ok(README.replace(/\s+/g, ' ').includes(s), 'README: ' + s);
});
