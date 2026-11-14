// Find the X (ROADMAP "Game modes"; Pierre, 2026-11-03, Q321 D1, 2026-11-09): one name, four photos, fish only, slipped
// into the photo quiz like the duels (quiz.js FIND, planFind, planPhoto), logged with its own mode |f and scored as a
// 4-choice quiz answer. quiz.js planFind runs in a vm with model.js distractors (its own code) and the game around them
// stubbed; the scoring through quiz.js answer's own question (scoreIn) and core.js scoreAnswer, replayed from the log.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js');
const C = require('../core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const quiz = read('quiz.js'),
  model = read('model.js'),
  app = read('app.js');

// Ten families A..J of one subject, each with photos (the tile ones carry xc), a unit G of another rank (a genus), the
// declared look-alikes A <-> B, C (the confusion prior: model.js pooledConf's LOOK for them, BASE otherwise).
const UNITS = 'ABCDEFGHIJ'.split('');
const LOOK = {A: ['B', 'C'], B: ['A'], C: ['A']};
const photosOf = (n, tiles = 2) => [
  ...Array.from({length: tiles}, (_, i) => ({f: `${n}t${i}`, xc: [0, 0, 1, 1], e: 4})),
  {f: `${n}p0`, e: 4},
  {f: `${n}p1`, e: 3}
];
// planFind with its world: met (introReady), the units with tiles, the random stream (counted: rnd.n).
function planner({met = UNITS, tiled = UNITS, seed = 7, P = 0.05, rank = {}} = {}) {
  let s = seed;
  const rnd = () => (rnd.n++, (s = (s * 16807) % 2147483647) / 2147483647);
  rnd.n = 0;
  const M = Object.create(Math);
  M.random = rnd;
  const GEN = Object.fromEntries(
    [...UNITS, 'G'].map(n => [n, {name: n, look: LOOK[n] || [], fam: n, views: {wide: photosOf(n, tiled.includes(n) ? 2 : 0)}}])
  );
  const conf = (t, n) => ((LOOK[t] || []).includes(n) || (LOOK[n] || []).includes(t) ? C.CONF.LOOK : C.CONF.BASE),
    shots = [];
  const ctx = {
    Math: M,
    SUBJ: {id: 'fish'},
    CONF: C.CONF,
    FIND: {P},
    GX: n => GEN[n],
    UNITS: {fish: {tiles: n => GEN[n].views.wide.filter(p => p.xc)}},
    rankOf: n => rank[n] || '',
    rankUnits: () => [],
    introReady: n => met.includes(n),
    imrFormsOf: () => [],
    confOf: conf,
    pooledConf: conf,
    confusable: (t, n) => conf(t, n) >= C.CONF.TRAP,
    confTerm: () => 0,
    uname: n => n,
    // app.js shuffle's contract: a new order of the same items, from the random stream
    shuffle: a => {
      const b = a.slice();
      for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
      }
      return b;
    },
    // model.js photoSet's contract here: one photo of unit n that keep allows (its draw is tests/rareease's), recorded.
    photoSet: (n, skip, shift, k, f, keep) => {
      shots.push({n, k, f, keep: !!keep});
      const L = GEN[n].views.wide.filter(p => !keep || keep(p));
      return {shown: L.length ? [{...L[0], view: 'wide'}] : [], hint: null, reveal: []};
    }
  };
  vm.createContext(ctx);
  vm.runInContext(
    [
      cut(model, 'function distractors(t, list, traps = trapsFor(t), known = introduced) {', '\n}\n', {through: 1, file: 'model.js'}),
      cut(quiz, 'function planFind(cur, t, list, ease = 0, sel = null) {', '\n}\n', {through: 1, file: 'quiz.js'}),
      'this.planFind = planFind;'
    ].join('\n'),
    ctx
  );
  return {plan: (t, list = [...UNITS, 'G'], sel = null) => ctx.planFind('quiz', t, list, 0, sel), rnd, shots, GEN};
}

test('FIND: a small share, half the duels; the format logs its own mode', () => {
  const P = Number((/const FIND = \{P: ([\d.]+)\};/.exec(quiz) || [])[1]),
    D = Number((/const CONTRAST = \{P: ([\d.]+),/.exec(quiz) || [])[1]);
  assert.strictEqual(P, 0.05);
  assert.strictEqual(P, D / 2);
});

test('the draw share: about FIND.P of the questions that could be one', () => {
  const W = planner({seed: 99}),
    N = 20000;
  let n = 0;
  for (let i = 0; i < N; i++) if (W.plan('A')) n++;
  const p = n / N,
    se = Math.sqrt((0.05 * 0.95) / N);
  assert.ok(Math.abs(p - 0.05) < 4 * se, `share ${p}`);
});

test('never on a unit not met, never with a unit not met, never without 3 other met units with a tile', () => {
  // t not met: no question, and no random number drawn (the draw goes on as before).
  let W = planner({met: 'BCDEF'.split(''), P: 1});
  assert.strictEqual(W.plan('A'), null);
  assert.strictEqual(W.rnd.n, 0, 'nothing drawn for a unit not met');
  // Only 2 other met units with a tile: none.
  W = planner({met: ['A', 'B', 'C', 'D'], tiled: ['A', 'B', 'C', 'E'], P: 1});
  assert.strictEqual(W.plan('A'), null);
  assert.strictEqual(W.rnd.n, 0);
  // A unit with no tile: none.
  W = planner({tiled: 'BCDEF'.split(''), P: 1});
  assert.strictEqual(W.plan('A'), null);
  assert.strictEqual(W.rnd.n, 0);
  // Met: A, B, D, E, F; unmet C (a look-alike of A) never among the photos, whatever the draw.
  W = planner({met: ['A', 'B', 'D', 'E', 'F'], P: 1});
  for (let i = 0; i < 200; i++) {
    const q = W.plan('A');
    assert.ok(q, 'a Find the X');
    assert.ok(
      q[2].every(n => ['A', 'B', 'D', 'E', 'F'].includes(n)),
      `only met units: ${q[2]}`
    );
  }
  // Another rank (a genus) is never asked and never among the photos.
  W = planner({rank: {G: 'genus'}, met: [...UNITS, 'G'], tiled: [...UNITS, 'G'], P: 1});
  assert.strictEqual(W.plan('G'), null);
  for (let i = 0; i < 50; i++) assert.ok(!W.plan('D')[2].includes('G'));
});

test('a subject with no tiles (the corals) draws exactly as before: no random number, no question', () => {
  const W = planner({tiled: [], P: 1});
  for (const n of UNITS) assert.strictEqual(W.plan(n), null);
  assert.strictEqual(W.rnd.n, 0);
  // app.js: the corals' UNITS give no tiles; the fish's, the game photos with a tile (xc) only.
  const units = cut(app, 'const UNITS = {', '\n};\n', {file: 'app.js'});
  assert.match(units, /\n {4}tiles: \(\) => \[\],/);
  assert.match(units, /\n {4}tiles: n => \(\(GX\(n\) \|\| \{views: \{\}\}\)\.views\.wide \|\| \[\]\)\.filter\(p => p && p\.xc\),/);
});

test('the question: one name, four photos of four units, the look-alikes first, every photo a tile', () => {
  const W = planner({P: 1, seed: 3});
  for (let i = 0; i < 100; i++) {
    W.shots.length = 0;
    const q = W.plan('A'),
      [cur, t, ch, prompt, set] = q;
    assert.deepStrictEqual([cur, t, prompt, q.findx], ['quiz', 'A', 'Find the A', 1]);
    assert.strictEqual(new Set(ch).size, 4);
    assert.ok(ch.includes('A'));
    // A's declared look-alikes, B and C, are always among the three others.
    assert.ok(ch.includes('B') && ch.includes('C'), `look-alikes first: ${ch}`);
    // The four photos in the order of the choices, each of its own unit, each a tile; the question's photo is A's.
    assert.deepStrictEqual(JSON.stringify(set.find.map(x => x.n)), JSON.stringify(ch));
    assert.ok(set.find.every(x => x.p.f.startsWith(x.n) && x.p.xc));
    assert.deepStrictEqual(JSON.stringify(set.shown.map(p => p.f)), JSON.stringify([set.find.find(x => x.n === 'A').p.f]));
    assert.strictEqual(set.reveal.length, 0);
    // Drawn as a 4-choice question in its own format, among the tiles only.
    assert.ok(W.shots.length === 4 && W.shots.every(s => s.k === 4 && s.f === 'find' && s.keep));
  }
  // A unit with no declared look-alike: the most confusable, then any met unit with a tile.
  const q = planner({P: 1}).plan('E');
  assert.strictEqual(new Set(q[2]).size, 4);
  // The custom quiz marks it (planPhoto's other questions there do too).
  assert.strictEqual(planner({P: 1}).plan('A', UNITS, UNITS).custom, 1);
});

test('planPhoto: like a duel (no card, no comeback, no mix-up queued, the contrast gap), it takes the contrast slot', () => {
  const pp = cut(quiz, "function planPhoto(cur = 'quiz', at = answersSoFar()) {", '\n}\n', {file: 'quiz.js'});
  assert.ok(
    pp.includes('const findQ = !cards.length && !warm && !rematch.length && gap && planFind(cur, t, list, ease, sel);'),
    'planPhoto asks planFind under the duel conditions'
  );
  assert.match(pp, /if \(findQ\) \{\s*twoAt = at;\s*return findQ;/);
  // After the duel (a duel drawn first keeps its share), before the exam.
  assert.ok(pp.indexOf('planFind(') > pp.indexOf('duelPick(list') && pp.indexOf('planFind(') < pp.indexOf('examReady(t)'));
  // A Find the X stops the questions planned ahead, as a duel does.
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(cut(quiz, 'const plain = q => ', ';\n', {through: 1, file: 'quiz.js'}) + 'this.plain = plain;', ctx);
  const q = Object.assign(['quiz', 'A', ['A', 'B', 'C', 'D'], 'Find the A', {shown: [{f: 'a'}]}], {findx: 1});
  assert.strictEqual(ctx.plain(q), false);
  assert.strictEqual(ctx.plain(Object.assign(q.slice(), {})), true);
  // Its flag is no name an array already has (a question is an array: q.find would be Array.prototype.find, so every
  // question would have read as one).
  assert.ok(!('findx' in []));
  assert.match(quiz, /\n  FINDX = !!q\.findx;\n/);
});

test('logged with its own mode: quiz|f (custom quiz quiz|s|f), never |kN, |d or |t', () => {
  const mq = cut(quiz, '  const mq =\n', ';\n', {through: 1, file: 'quiz.js'}) + 'mq;';
  const mode = o =>
    vm.runInContext(
      mq,
      vm.createContext({
        modeBase: cur => (cur === 'quiz-custom|play' ? 'quiz|s' : cur),
        photoQuiz: cur => cur === 'quiz' || cur === 'quiz-custom|play',
        AUTOD: false,
        FINDX: false,
        warm: false,
        k: 4,
        nc: 4,
        tq: null,
        exq: false,
        ...o
      })
    );
  assert.strictEqual(mode({cur: 'quiz', FINDX: true}), 'quiz|f');
  assert.strictEqual(mode({cur: 'quiz-custom|play', FINDX: true}), 'quiz|s|f');
  assert.strictEqual(mode({cur: 'quiz'}), 'quiz', 'any other question as before');
  // The Duel tab never reads it.
  assert.strictEqual(mode({cur: 'quiz-duel', FINDX: true, k: 2, nc: 2}), 'quiz-duel');
  // The sheet stores the mode as it comes (Code.gs logAnswers_: letters, digits, : | -), so no column change.
  const gs = read('tools/sync/Code.gs');
  assert.ok(gs.includes('M = /^[A-Za-z0-9:|-]*$/'));
  // Its readers: 4 choices (guess 1 in 4), no typed, duel or exam flag.
  assert.strictEqual(C.kOf('quiz|f', 'A B C D'), 4);
  assert.strictEqual(C.guessOf('quiz|f', 'A B C D'), 0.25);
  assert.strictEqual(C.kOf('quiz|s|f', 'A B C D'), 4);
  assert.ok(!/\|[dtx](\||$)/.test('quiz|f') && !/\|k\d/.test('quiz|f'));
});

test('scored as a quiz answer with 4 choices; the replay of the log gives the state the game had', () => {
  const QSRC = cut(quiz, '  const q = scoreIn({', '\n  });\n', {through: true, file: 'quiz.js'});
  const GEN = Object.fromEntries(UNITS.slice(0, 6).map(n => [n, {look: LOOK[n] || [], fam: n}]));
  let s = 11;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647,
    P = {},
    log = [],
    st = n => P[n] || (P[n] = {ok: 0, ko: 0, streak: 0});
  const G = Object.keys(GEN);
  for (let i = 0; i < 80; i++) {
    const target = G[Math.floor(r() * G.length)],
      find = i % 3 === 0,
      others = G.filter(x => x !== target),
      chs = [target, ...others.slice(0, 3)],
      good = r() < 0.7,
      c = good ? target : chs[1 + Math.floor(r() * 3)],
      ph = [{f: target.toLowerCase() + (i % 4), view: 'wide'}],
      mode = 'quiz' + (find ? '|f' : '');
    const env = {
      scoreIn: C.scoreIn,
      target,
      c,
      good,
      k: 4,
      chs,
      seenPh: ph,
      unseen: null,
      ph,
      solo: 0.5,
      warm: false,
      SHOWNQ: null,
      tm: {rt: 3 + (i % 5)},
      GX: x => GEN[x],
      photoDiff: () => (i % 7) / 10 - 0.3,
      famOf: (t, L) =>
        C.memFam(
          L.map(p => (st(t).ps || {})[p.f]),
          [0, -0.4, -1, -1.6]
        ),
      confTerm: () => 0,
      pgLook: (t, L) => L.some(x => GEN[t].look.includes(x)),
      recallAt: () => 1,
      startP: () => 0,
      rtOn: () => true,
      mq: mode,
      fmtOf: C.fmtOf,
      fmtOff: C.fmtOff,
      pfmt: () => ({}), // model.js pfmt: no offsets for the fish
      domRules: () => true,
      genusDiff: () => 0
    };
    vm.createContext(env);
    st(target);
    const q = vm.runInContext(QSRC + '\nq;', env);
    assert.strictEqual(q.k, 4);
    const res = C.scoreAnswer(P, q);
    log.push({
      id: 'a' + i,
      t: new Date(Date.UTC(2026, 10, 14) + i * 60e3).toISOString(),
      g: target,
      a: c,
      ok: good ? 1 : 0,
      m: mode,
      ph: ph.map(p => p.f).join(' '),
      ch: chs.join(' '),
      e: Math.round(100 * res.e) / 100,
      th: res.th0,
      nw: 0,
      rt: env.tm.rt,
      sc: C.scoreLog(q, res)
    });
  }
  const rows = log.map(a => C.logRow(a, 'me')),
    R = C.replayProgress(rows, {gen: GEN}).me.P;
  for (const g of Object.keys(P)) for (const f of Object.keys(P[g])) assert.deepStrictEqual(R[g][f], P[g][f], `${g}.${f}`);
  // The same log with every |f taken out replays to the very same state: the mode changes no score.
  const plain = C.replayProgress(
    log.map(a => C.logRow({...a, m: 'quiz'}, 'me')),
    {gen: GEN}
  ).me.P;
  assert.deepStrictEqual(plain, R);
  assert.ok(
    log.some(a => a.m === 'quiz|f' && !a.ok && GEN[a.a]),
    'a wrong photo tapped: its unit given'
  );
});

test('the tiles: the fish data holds families with tiles enough for the format to come up', () => {
  const gm = C.fishGameRead(JSON.parse(read('fish-game.json'))),
    byFam = {};
  const F = JSON.parse(read('fish.json')),
    famOf = new Map();
  (F.families || []).forEach(f => f.species.forEach(id => famOf.set(id, f.id)));
  Object.values(gm.photos).forEach(L =>
    L.forEach(p => {
      if (p.xc && famOf.get(p.sp)) byFam[famOf.get(p.sp)] = (byFam[famOf.get(p.sp)] || 0) + 1;
    })
  );
  assert.ok(Object.keys(byFam).length >= 4, `families with a tile: ${Object.keys(byFam).length}`);
  // Every tile's square: four numbers (fractions of the original; past its edge where the photo's blurred copy fills it).
  Object.values(gm.photos).forEach(L => L.filter(p => p.xc).forEach(p => assert.ok(p.xc.length === 4 && p.xc.every(Number.isFinite), p.f)));
});

test("the tile's address: its square and its rewrite count, so a corrected tile is a new file for the caches", () => {
  const ctx = {AWAY: false, photoUrl: u => 'R2/' + u, img: (p, s) => `img:${p.f}:${s}`};
  vm.createContext(ctx);
  vm.runInContext(cut(app, 'const tileSrc = p =>', ';\n', {through: 1, file: 'app.js'}) + 'this.tileSrc = tileSrc;', ctx);
  const p = {f: 'fa', xc: [0.1, 0.2, 0.9, 1.1]};
  assert.strictEqual(ctx.tileSrc(p), 'R2/img/fa-x.webp?x=0.1_0.2_0.9_1.1');
  assert.strictEqual(ctx.tileSrc({...p, iv: 2}), 'R2/img/fa-x.webp?x=0.1_0.2_0.9_1.1.2');
  assert.notStrictEqual(ctx.tileSrc({...p, iv: 3}), ctx.tileSrc({...p, iv: 2}), 'a rotation corrected (iv bumped, xc the same)');
  // No tile, a candidate not downloaded yet, or R2 failed: the 480 px photo.
  assert.strictEqual(ctx.tileSrc({f: 'fb'}), 'img:fb:s');
  assert.strictEqual(ctx.tileSrc({...p, r: 1}), 'img:fa:s');
  ctx.AWAY = true;
  assert.strictEqual(ctx.tileSrc(p), 'img:fa:s');
  // That photo shown whole in its square, never centre-cropped (app.css).
  assert.match(read('app.css'), /\.fxt img:not\(\[src\*='-x\.webp'\]\) \{\n {2}object-fit: contain;/);
});
