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

test('prep.js: readAnswers form, left-out ids, halves, offsets, practice counts and the fish taxa from the photos', () => {
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
  assert.deepStrictEqual(
    [1, 2, 3, 4].map(i => by('P' + i)[0].half),
    ['A', 'B', 'B', 'A']
  );
  const first = by('P1')[0];
  assert.ok(Math.abs(first.off - (-0.5 + 0.1 - 0.2 + 0.5)) < 1e-9, 'memory + mix-ups - format + one photo alone');
  const second = by('P1')[1];
  assert.strictEqual(second.mem, 0, 'a photo never shown: memory 0');
  const fourth = by('P1')[3]; // p0 shown once before (right? i=0 was a miss), so bucket 1
  assert.strictEqual(fourth.mem, -0.5);
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

test('checks.js: the paired test over players and its declared floor; the Kalman split moves the uncertain part most', () => {
  const rows = [],
    la = [],
    lb = [];
  for (let p = 1; p <= 8; p++)
    for (let i = 0; i < 25; i++) {
      rows.push({p: 'P' + p});
      la.push(0.5);
      lb.push(0.5 - 0.01 * p);
    }
  let t = K.pairedTest(rows, () => true, la, lb);
  assert.strictEqual(t.players, 8);
  assert.strictEqual(t.p, 2 / 256);
  assert.strictEqual(t.verdict, "arm 2 better than today's engine");
  t = K.pairedTest(rows.slice(0, 125), () => true, la, lb);
  assert.strictEqual(t.verdict, 'the measure cannot tell');
  assert.match(t.why, /fewer than 6 players/);
  // the split: one right answer on a new photo of a well-known genus
  const r = {
    p: 'P1',
    u: 'G1',
    rk: 'genus',
    F: null,
    G: 'G1',
    S: null,
    ph: ['ph1'],
    ez: [0],
    g: 0.25,
    y: 1,
    mem: 0,
    cf: 0,
    df: 0,
    solo: 0,
    tr: true
  };
  const warm = Array.from({length: 30}, (_, i) => ({...r, ph: ['old'], y: i % 3 ? 1 : 0}));
  const before = K.sharedArm(warm, {gen: 0.3, photo: 0.46}, {}).m,
    after = K.sharedArm([...warm, r], {gen: 0.3, photo: 0.46}, {}).m,
    dGen = after['G:G1'] - before['G:G1'];
  assert.ok(
    after['I:ph1'] < 0 && dGen < 0 && -after['I:ph1'] > -dGen,
    `photo ${after['I:ph1']}, genus ${dGen}: a right answer, the new photo moves most`
  );
});

test('checks.js: the shared arm trusts a player as the live arm does, on the answers before each prediction only', () => {
  const C = require(path.join(ROOT, 'core.js'));
  // P2 is trusted on the whole log but not on its first answers (a slow start); P1 always
  const rows = [];
  for (let i = 0; i < 60; i++) {
    const p = i % 2 ? 'P2' : 'P1',
      j = Math.floor(i / 2);
    rows.push({
      p,
      u: 'G' + (i % 3),
      rk: 'genus',
      F: null,
      G: 'G' + (i % 3),
      S: null,
      ph: ['ph' + (i % 5)],
      ez: [0],
      g: 0.25,
      y: p === 'P1' ? (i % 7 ? 1 : 0) : j < 12 ? (j % 3 ? 0 : 1) : 1,
      mem: 0,
      cf: 0,
      df: 0,
      solo: 0.5
    });
  }
  const sd = {gen: 0.3, photo: 0.46},
    eloRow = r => [r.p, 0, r.u, r.u, r.y, 'quiz', r.ph.join(' '), null, null, null, 'a b c d', 0];
  // the reference: for each answer, the arm run afresh on the answers before it, each trusted as core.js trustOf says on
  // those answers alone (what eloOf(before) does for the live arm)
  const want = rows.map((r, i) => {
    const before = rows.slice(0, i),
      T = C.trustOf(before.map(eloRow));
    return K.sharedArm([...before.map(x => ({...x, tr: !!T[x.p]})), r], sd, {}, {trust: 'given'}).d[i];
  });
  const whole = C.trustOf(rows.map(eloRow));
  assert.ok(whole.P2 && !C.trustOf(rows.slice(0, 20).map(eloRow)).P2, 'the planted log: P2 trusted late');
  const got = K.sharedArm(
    rows.map(r => ({...r, tr: !!whole[r.p]})),
    sd,
    {}
  ).d;
  got.forEach((x, i) => assert.ok(Math.abs(x - want[i]) < 1e-12, `answer ${i}: ${x} against ${want[i]}`));
});

test('checks.js: Q136 centring, its declared rule on planted logs (not centred, centred, too few units)', () => {
  const plant = (slopeOnGd, units = 12) => {
    const rows = [],
      delta = [],
      gd = {};
    for (let u = 0; u < units; u++) gd['U' + u] = (u - units / 2) / 4;
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
});

test('checks.js: the whole run on a small made-up log; a deadline already past cuts it', () => {
  const ch = ['Acropora', 'Porites', 'Favia', 'Montipora'],
    rows = [];
  for (let i = 0; i < 240; i++)
    rows.push(ra('w' + (i % 6), i, ch[i % 4], ['c' + (i % 4) + '-' + (i % 7)], (i * 7) % 10 < 7, ch, {d: 0.2 * (i % 4), f: 0, o: 0}));
  const X = Pr.prepare(rows, 'coral', {coralTax: () => ({})});
  const fit = {fit: {sd: {player: [0.5], pu: [0.2], gen: [0.3], photo: [0.4]}, fixed: {c: [0.8]}, effects: {gen: {Acropora: 0.1}}}};
  const out = K.run(X, {full: fit, A: fit, B: fit}, null, null);
  assert.ok(!out.cut);
  assert.deepStrictEqual(out.done, ['live', 'shared', 'q136 variants', 'centring']);
  assert.ok(out.exploratory.all.players === 6 && typeof out.exploratory.all.verdict === 'string');
  assert.ok(out.calibration[1]['rank genus'].n > 0);
  assert.ok(K.run(X, {full: fit, A: fit, B: fit}, null, 1).cut);
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

test('checks.js: an answer without photos, or any non-finite loss, never enters a test; compression for every arm run', () => {
  const ch = ['Acropora', 'Porites', 'Favia', 'Montipora'],
    rows = [];
  for (let i = 0; i < 240; i++)
    rows.push(
      ra('w' + (i % 6), i, ch[i % 4], i % 40 === 5 ? [] : ['c' + (i % 4) + '-' + (i % 7)], (i * 7) % 10 < 7, ch, {
        d: 0.2 * (i % 4),
        f: 0,
        o: 0
      })
    );
  const X = Pr.prepare(rows, 'coral', {coralTax: () => ({})});
  const fit = {fit: {sd: {player: [0.5], pu: [0.2], gen: [0.3], photo: [0.4]}, fixed: {c: [0.8]}, effects: {gen: {Acropora: 0.1}}}};
  const out = K.run(X, {full: fit, A: fit, B: fit}, null, null);
  assert.ok(
    out.exploratory.all.perPlayer.every(x => Number.isFinite(x.d)),
    JSON.stringify(out.exploratory.all.perPlayer)
  );
  assert.ok(out.exploratory.all.p > 0);
  assert.deepStrictEqual(Object.keys(out.compression).sort(), ['1', '2', '4b', '4c']);
  const t = K.pairedTest([{p: 'P1'}, {p: 'P1'}], () => true, [0.5, 0.5], [NaN, 0.4], {...K.RULES, minAnswers: 1, minPlayers: 1});
  assert.strictEqual(t.answers, 1);
  // the clock: never past 40 minutes from now, whatever deadline is given (rule L11)
  const now = Date.now() / 1000;
  assert.ok(K.capDeadline(now + 3 * 3600) <= now + 40 * 60 + 1);
  assert.ok(K.capDeadline(null) <= now + 40 * 60 + 1);
  assert.strictEqual(K.capDeadline(now + 60), now + 60);
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
    'fewer than 3 earlier trusted answers',
    'fewer than 6 players',
    '20 or more primary answers',
    'α 0.05',
    '6th answer',
    '3 or more',
    'fewer than 8 units',
    '10,000'
  ])
    assert.ok(README.includes(s), 'README: ' + s);
  assert.strictEqual(K.RULES.pnMax, 3);
  assert.strictEqual(K.RULES.minPlayers, 6);
  assert.strictEqual(K.RULES.minAnswers, 20);
  assert.strictEqual(K.RULES.alpha, 0.05);
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
