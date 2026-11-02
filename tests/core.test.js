// core.js: curation merge (admin Publish), progress merge (two devices), photo Elo (same as Code.gs stats_).
const test = require('node:test'),
  assert = require('node:assert');
const {
  merge3,
  mergeOld,
  mergeProgress,
  eloOf,
  trustOf,
  confusionOf,
  confScore,
  CONF,
  pairConf,
  mergeUsers,
  playerStart,
  levelSeed,
  LEVEL,
  START
} = require('../core.js');
const {loadCodeGs} = require('./gas.js');

test('merge3: my changes win, changes published elsewhere are kept', () => {
  const base = {genera: {A: {cover: 'a1', feat: {wide: ['x', 'y']}}}, quality: {f1: 2}};
  const mine = {genera: {A: {cover: 'a2', feat: {wide: ['x', 'y']}}}, quality: {f1: 2, f2: 3}};
  const theirs = {genera: {A: {cover: 'a1', feat: {wide: ['z']}}, B: {ok: true}}, quality: {f1: 1}};
  const conf = [];
  assert.deepStrictEqual(merge3(base, mine, theirs, conf), {
    genera: {A: {cover: 'a2', feat: {wide: ['z']}}, B: {ok: true}},
    quality: {f1: 1, f2: 3}
  });
  assert.deepStrictEqual(conf, []);
});

test('merge3: same key changed on both sides: mine wins and the path is reported', () => {
  const conf = [];
  const out = merge3({quality: {f: 2}}, {quality: {f: 3}}, {quality: {f: 1}}, conf);
  assert.strictEqual(out.quality.f, 3);
  assert.deepStrictEqual(conf, [['quality', 'f']]);
});

test('merge3: a key I removed goes, unless the other side changed it', () => {
  assert.deepStrictEqual(merge3({exclude: {f: 'x'}}, {}, {exclude: {f: 'x'}}), {});
  assert.deepStrictEqual(merge3({exclude: {f: 'x'}}, {}, {exclude: {f: 'y'}}), {}); // conflict: mine (removed) wins
});

test('merge3 never returns objects shared with its inputs', () => {
  const theirs = {quality: {f: 1}},
    out = merge3({}, {}, theirs);
  out.quality.f = 3;
  assert.strictEqual(theirs.quality.f, 1);
});

test('mergeOld only adds', () => {
  assert.deepStrictEqual(mergeOld({genera: {A: {cover: 'm'}}}, {genera: {A: {ok: true}, B: {}}}), {
    genera: {A: {ok: true, cover: 'm'}, B: {}}
  });
});

test('mergeProgress keeps the volatility (vr) of the device that played (Codex review #340)', () => {
  const B = {A: {ok: 1, ko: 0, h: '1', th: 0, vr: 0}},
    P = {A: {ok: 2, ko: 0, h: '11', th: 0.3, vr: 0.12}},
    R = {A: {ok: 1, ko: 0, h: '1', th: 0, vr: 0}};
  assert.strictEqual(mergeProgress(B, P, R).A.vr, 0.12);
});

test('mergeProgress: answers from both devices add up, nothing counted twice', () => {
  const B = {Acropora: {ok: 10, ko: 2, ps: {p1: [5, 4]}, conf: {Porites: 1}}};
  const P = {Acropora: {ok: 13, ko: 2, ps: {p1: [6, 5], p2: [1, 1]}, conf: {Porites: 1}, th: 0.4, h: '111'}};
  const R = {Acropora: {ok: 15, ko: 3, ps: {p1: [8, 6]}, conf: {Porites: 2}, th: 0.1, h: '110'}, Porites: {ok: 1, ko: 0}};
  const M = mergeProgress(B, P, R);
  assert.strictEqual(M.Acropora.ok, 18);
  assert.strictEqual(M.Acropora.ko, 3);
  assert.deepStrictEqual(M.Acropora.ps, {p1: [9, 7], p2: [1, 1]});
  assert.deepStrictEqual(M.Acropora.conf, {Porites: 2});
  assert.strictEqual(M.Acropora.th, 0.4, 'this device answered since B: its model wins');
  assert.deepStrictEqual(M.Porites, {ok: 1, ko: 0, streak: 0});
});

test('mergeProgress: offers per pair add up across devices like the mix-ups', () => {
  const B = {Favites: {ok: 1, ko: 1, off: {Dipsastraea: 2}}};
  const P = {Favites: {ok: 2, ko: 1, off: {Dipsastraea: 3, Goniastrea: 1}, h: '01'}};
  const R = {Favites: {ok: 1, ko: 2, off: {Dipsastraea: 4}, h: '00'}};
  assert.deepStrictEqual(mergeProgress(B, P, R).Favites.off, {Dipsastraea: 5, Goniastrea: 1});
});

test('pairConf: both directions; old mix-ups without offers count as offered', () => {
  const P = {Favites: {conf: {Dipsastraea: 2}, off: {Dipsastraea: 6}}, Dipsastraea: {conf: {Favites: 1}, off: {Favites: 4}}};
  assert.deepStrictEqual(pairConf(P, 'Favites', 'Dipsastraea'), [10, 3]);
  assert.deepStrictEqual(pairConf(P, 'Dipsastraea', 'Favites'), [10, 3]);
  assert.deepStrictEqual(pairConf({A: {conf: {B: 2}}}, 'A', 'B'), [2, 2]);
  assert.deepStrictEqual(pairConf({}, 'A', 'B'), [0, 0]);
  // The player's weight is offers / (offers + CONF.W): with no answers the pooled score stands, with many their own rate leads.
  assert.strictEqual(confScore(pairConf({}, 'A', 'B'), 0.3), 0.3);
  assert.ok(confScore([40, 0], 0.3) < CONF.TRAP, 'a pair told apart 40 times stops being a trap');
  assert.ok(confScore([3, 3], CONF.BASE) >= CONF.TRAP, 'three mix-ups in three offers make any pair a trap');
});

test('mergeProgress: untouched locally, the pulled record wins', () => {
  const B = {A: {ok: 1, ko: 0, th: 0}},
    P = {A: {ok: 1, ko: 0, th: 0}},
    R = {A: {ok: 4, ko: 1, th: 0.7}};
  assert.deepStrictEqual(mergeProgress(B, P, R), {A: {ok: 4, ko: 1, th: 0.7, streak: 0}});
});

test('eloOf gives the same photo ratings as Code.gs stats_', () => {
  const s = loadCodeGs();
  const photos = ['acropora-1', 'acropora-2', 'porites-1', 'porites-2', 'favia-1'];
  let n = 0;
  for (const who of ['Ana', 'Ben'])
    for (let i = 0; i < 40; i++) {
      const ph = [photos[i % 5], photos[(i * 3 + 1) % 5]].slice(0, 1 + (i % 2));
      s.post({
        name: who,
        pin: '1234',
        data: {},
        summary: {},
        answers: [
          {
            id: 'a' + n++,
            t: new Date(Date.UTC(2026, 10, 1, 0, 0, n)).toISOString(),
            g: 'Acropora',
            a: i % 3 ? 'Acropora' : 'Porites',
            ok: i % 3 ? 1 : 0,
            m: ['quiz-duel', 'quiz', 'quiz|k2', 'quiz|k3'][i % 4],
            ph: ph.join(' ')
          }
        ]
      });
    }
  const T = {token: 'ghp_write000000000000000000'},
    rows = s.post({readAnswers: 1, ...T}).rows,
    sheet = s.get({stats: '1'}).photos;
  assert.deepStrictEqual(eloOf(rows), sheet);
});

test('confusionOf counts the same pairs as Code.gs stats_ conf, and keeps the direction', () => {
  const s = loadCodeGs(),
    G = ['Acropora', 'Montipora', 'Porites', 'Favites'];
  let n = 0;
  for (let i = 0; i < 30; i++) {
    const g = G[i % 4],
      ch = [g, G[(i + 1) % 4], G[(i + 2) % 4]],
      a = i % 3 ? g : ch[1 + (i % 2)];
    s.post({
      name: 'Ana',
      pin: '1234',
      data: {},
      summary: {},
      answers: [
        {
          id: 'c' + n++,
          t: new Date(Date.UTC(2026, 10, 1, 0, 0, n)).toISOString(),
          g,
          a,
          ok: a === g ? 1 : 0,
          m: 'quiz',
          ph: 'x-1',
          ch: i === 0 ? '' : ch.join(' ')
        }
      ]
    });
  }
  const rows = s.post({readAnswers: 1, token: 'ghp_write000000000000000000'}).rows,
    C = confusionOf(rows);
  assert.deepStrictEqual(C.pair, s.get({stats: '1'}).conf);
  assert.strictEqual(rows[0][10], '');
  assert.ok(Object.keys(C.old).length === 0 || Object.values(C.old).every(v => v > 0));
  const [off, mix] = C.pair['Acropora|Montipora'],
    d1 = C.dir['Acropora|Montipora'] || [0, 0],
    d2 = C.dir['Montipora|Acropora'] || [0, 0];
  assert.deepStrictEqual([d1[0] + d2[0], d1[1] + d2[1]], [off, mix]);
});

test('confScore starts at the prior and follows the answers', () => {
  assert.strictEqual(confScore(undefined, CONF.LOOK), CONF.LOOK);
  assert.ok(confScore([40, 0], CONF.LOOK) < CONF.TRAP, 'a declared look-alike nobody mixes up fades');
  assert.ok(confScore([20, 10], CONF.BASE) > CONF.TRAP, 'an undeclared pair often mixed up becomes a trap');
});

test("mergeTabs: two admin tabs keep each other's clicks and settle without bouncing", () => {
  const {mergeTabs, canon} = require('../core.js');
  const shared = {v: 1, genera: {A: {cover: 'a1'}}};
  const tabA = {v: 1, genera: {A: {cover: 'a1', hide: ['x']}}}; // A hid a photo
  const tabB = {v: 1, genera: {A: {cover: 'a2'}, B: {ok: true}}}; // B changed a cover and validated B, then wrote
  const a = mergeTabs(shared, tabA, tabB);
  assert.deepStrictEqual(a.draft, {v: 1, genera: {A: {cover: 'a2', hide: ['x']}, B: {ok: true}}});
  assert.ok(a.changed && a.share); // A writes the union back
  const b = mergeTabs(tabB, tabB, a.draft); // B takes it: nothing new of its own
  assert.strictEqual(canon(b.draft), canon(a.draft));
  assert.ok(!b.share); // so B does not write again
  const reordered = JSON.parse(JSON.stringify({genera: a.draft.genera, v: 1}));
  assert.ok(!mergeTabs(a.draft, a.draft, reordered).share); // key order alone never triggers a write
});

test('takeTab: both tabs click before hearing of each other, then one takes back a click', () => {
  const {takeTab, canon} = require('../core.js');
  const d0 = {v: 1, genera: {A: {cover: 'a1'}}},
    saved = d0;
  const revA = {'a.1': d0},
    revB = {'a.1': d0}; // both started from A's first write
  const a2 = {v: 1, genera: {A: {cover: 'a2'}}},
    b1 = {v: 1, genera: {A: {cover: 'a1'}, B: {ok: true}}};
  revA['a.2'] = a2;
  revB['b.1'] = b1; // each writes its own click, seen = a.1
  // A hears of B's write: base is a.1, so A's cover survives and B's validation comes in.
  const m = takeTab(revA, a2, saved, {...b1, _tab: {rev: 'b.1', seen: 'a.1'}});
  assert.deepStrictEqual(m.draft, {v: 1, genera: {A: {cover: 'a2'}, B: {ok: true}}});
  assert.ok(m.share);
  revA['a.3'] = m.draft;
  // B hears of A's union (seen = b.1, B's own write): it takes it whole.
  const n = takeTab(revB, b1, saved, {...m.draft, _tab: {rev: 'a.3', seen: 'b.1'}});
  assert.strictEqual(canon(n.draft), canon(m.draft));
  assert.ok(!n.share);
  assert.strictEqual(takeTab(revB, n.draft, saved, {...m.draft, _tab: {rev: 'a.3', seen: 'b.1'}}), null); // already in
  // B takes back A's cover (seen = a.3): A follows instead of keeping its own value.
  const b2 = {v: 1, genera: {A: {cover: 'a1'}, B: {ok: true}}};
  const o = takeTab(revA, m.draft, saved, {...b2, _tab: {rev: 'b.2', seen: 'a.3'}});
  assert.deepStrictEqual(o.draft, b2);
  assert.ok(!('_tab' in o.draft));
});

test('a quiz question with easy wrong choices (quiz|k2) is rated with a 1/2 guess', () => {
  // Ana has a record that counts (v17: signed in, clearly above chance) before the answer under test.
  const past = Array.from({length: 12}, (_, i) => ['Ana', 0, 'Porites', 'Porites', 1, 'quiz', 'porites-' + i]),
    E = (m, ok) => eloOf([...past, ['Ana', 1, 'Acropora', 'Acropora', ok, m, 'acropora-1']])['acropora-1'][0];
  // Right on a 2-plausible-choice question proves less than on a 4-choice one: the photo looks less easy.
  assert.ok(E('quiz|k2', 1) > E('quiz', 1));
  assert.strictEqual(E('quiz|k2', 1), E('quiz-duel', 1));
});

test('photo ratings and confusions count only players clearly above chance, signed in or not (v18)', () => {
  const R = (who, i, ok, f, an, m = 'quiz', ch = 'Acropora Porites Favites Montipora') => [
    who,
    i,
    'Acropora',
    ok ? 'Acropora' : 'Porites',
    ok,
    m,
    f,
    null,
    null,
    null,
    ch,
    an ? 1 : 0
  ];
  const good = Array.from({length: 12}, (_, i) => R('Ana', i, 1, 'p-' + i));
  // A device that never signed in counts under the same rule (v18): a real player yes, random clicks no.
  const anon = Array.from({length: 12}, (_, i) => R('Zed', 100 + i, i % 4 ? 1 : 0, 'x-1', 1)),
    anonBot = Array.from({length: 12}, (_, i) => R('Zbot', 300 + i, 0, 'x-2', 1));
  assert.deepStrictEqual(trustOf([...good, ...anon, ...anonBot]), {Ana: true, Zed: true, Zbot: false});
  assert.ok(eloOf([...good, ...anon])['x-1'][1] > 0, 'a real anonymous player rates the photos');
  assert.strictEqual(eloOf([...good, ...anon])['x-1'][3], 12, 'plain count of the answers that rated it, beside the weighed one');
  assert.strictEqual(eloOf([...good, ...anonBot])['x-2'][1], 0, 'an anonymous player at chance does not');
  assert.ok(Object.keys(confusionOf(anon).pair).length > 0, 'and counts in the confusions');
  assert.deepStrictEqual(confusionOf(anonBot).pair, {}, 'not at chance');
  // A signed-in player at chance (random clicks) moves nothing either; too few answers neither.
  const rand = Array.from({length: 40}, (_, i) => R('Bot', 200 + i, i % 4 === 0 ? 1 : 0, 'y-' + (i % 5)));
  assert.strictEqual(trustOf(rand).Bot, false);
  assert.strictEqual(trustOf(good.slice(0, 9)).Ana, false, 'fewer than TRUST.N answers');
  // Repeats count (Duolingo HLR, PFA): every answer of a trusted player is counted.
  const again = [...good, R('Ana', 50, 0, 'z-1'), R('Ana', 51, 0, 'z-1'), R('Ana', 52, 0, 'z-1')];
  // Weighed counts: three answers at n = 12, 13, 14 weigh 12/42 + 13/43 + 14/44 (photoDiff's confidence, damping).
  assert.strictEqual(eloOf(again)['z-1'][1], 0.9);
});

test("v17: a beginner's answers move the photos more as their level settles; a remembered photo moves less", () => {
  const R = (i, ok, f) => ['Lea', i, 'Acropora', ok ? 'Acropora' : 'Porites', ok, 'quiz', f];
  // Pierre's case: a beginner at chance for 20 answers, then right most of the time. Trusted over the whole history.
  const early = Array.from({length: 20}, (_, i) => R(i, i % 4 === 0 ? 1 : 0, 'e-' + i)),
    later = Array.from({length: 40}, (_, i) => R(20 + i, i % 5 ? 1 : 0, 'l-' + i)),
    L = [...early, ...later];
  assert.strictEqual(trustOf(L).Lea, true);
  const E = eloOf(L);
  // Same outcome (a miss), early (answer 2) and late (answer 25): the late one moves its photo more.
  assert.strictEqual(early[1][4], 0);
  assert.strictEqual(later[5][4], 0);
  assert.ok(Math.abs(E['e-1'][0]) < Math.abs(E['l-5'][0]) / 2, `early ${E['e-1'][0]} vs late ${E['l-5'][0]}`);
  // A right answer on a photo already right twice (remembered) moves it less than one on a new photo.
  const base = [...L, R(100, 1, 'k-1'), R(101, 1, 'k-1')],
    dKnown = eloOf([...base, R(102, 1, 'k-1')])['k-1'][0] - eloOf(base)['k-1'][0],
    dNew = eloOf([...base, R(102, 1, 'n-1')])['n-1'][0];
  assert.ok(Math.abs(dKnown) < Math.abs(dNew), `known ${dKnown} vs new ${dNew}`);
});

test('mergeUsers: two accounts of one person add up; the busier account model wins per genus', () => {
  const A = {
    'imr-coral-progress': JSON.stringify({
      Acropora: {ok: 8, ko: 2, th: 1.2, L: 0.8, h: '1101', cor: 1, conf: {Montipora: 1}, ps: {p1: [3, 2]}},
      Porites: {ok: 1, ko: 0, th: 0.1}
    }),
    'imr-coral-quiz': JSON.stringify({bu: 2})
  };
  const B = {
    'imr-coral-progress': JSON.stringify({
      Acropora: {ok: 1, ko: 1, th: 0.2, L: 0.3, h: '10', du: 1, conf: {Montipora: 2}, off: {Montipora: 3}, ps: {p1: [1, 1], p2: [1, 0]}}
    }),
    'imr-coral-quiz': JSON.stringify({bu: 1, view: 'any'}),
    'imr-coral-theme': '"dark"'
  };
  const M = mergeUsers(A, B),
    P = JSON.parse(M['imr-coral-progress']);
  assert.strictEqual(P.Acropora.ok, 9);
  assert.strictEqual(P.Acropora.ko, 3);
  assert.strictEqual(P.Acropora.th, 1.2, 'A answered Acropora more: its ability is kept');
  assert.strictEqual(P.Acropora.cor, 1);
  assert.strictEqual(P.Acropora.du, 1);
  assert.deepStrictEqual(P.Acropora.conf, {Montipora: 3});
  assert.deepStrictEqual(P.Acropora.off, {Montipora: 3});
  assert.deepStrictEqual(P.Acropora.ps, {p1: [4, 3], p2: [1, 0]});
  assert.deepStrictEqual(P.Porites, {ok: 1, ko: 0, th: 0.1, streak: 0});
  assert.deepStrictEqual(JSON.parse(M['imr-coral-quiz']), {bu: 2, view: 'any'});
  assert.strictEqual(M['imr-coral-theme'], '"dark"');
});

test('playerStart: a new genus starts from the global level, shrunk while answers are few, clamped', () => {
  assert.strictEqual(playerStart({}, 'Acropora'), 0);
  // Global Elo (LEVEL) wins over the genera; 30 answers at 1.6 → 0.8 * 1.6 * 30/40.
  assert.strictEqual(playerStart({[LEVEL]: {ok: 30, ko: 0, th: 1.6}, Porites: {ok: 1, ko: 0, th: 0.1}}, 'Acropora'), 0.96);
  // A strong player is never started at the hardest; a struggling one a little easier, not lower than LO.
  assert.strictEqual(playerStart({[LEVEL]: {ok: 500, ko: 0, th: 3}}, 'Acropora'), START.HI);
  assert.strictEqual(playerStart({[LEVEL]: {ok: 10, ko: 90, th: -1.5}}, 'Acropora'), START.LO);
  // Progress from before the global level: mean ability of the genera answered (weighted by answers), the genus itself skipped.
  const old = {Porites: {ok: 8, ko: 2, th: 1}, Favites: {ok: 5, ko: 5, th: 0}, Acropora: {ok: 9, ko: 1, th: 2}};
  assert.strictEqual(playerStart(old, 'Acropora'), Math.round(0.8 * 0.5 * (20 / 30) * 100) / 100);
  // The pseudo-genus merges across devices like a genus (answers add up, the latest ability).
  const m = mergeProgress({[LEVEL]: {ok: 2, ko: 0, th: 0.3}}, {[LEVEL]: {ok: 5, ko: 0, th: 0.9}}, {[LEVEL]: {ok: 4, ko: 1, th: 0.5}});
  assert.deepStrictEqual([m[LEVEL].ok, m[LEVEL].ko, m[LEVEL].th], [7, 1, 0.9]);
});

test('levelSeed: the global record starts from the history, so an existing expert keeps their head start', () => {
  const old = {Porites: {ok: 60, ko: 0, th: 2}, Favites: {ok: 40, ko: 0, th: 2}};
  const before = playerStart(old, 'Acropora');
  const P = {...old, [LEVEL]: levelSeed(old)};
  assert.deepStrictEqual(P[LEVEL], {ok: 100, ko: 0, th: 2});
  assert.strictEqual(playerStart(P, 'Acropora'), before);
  assert.deepStrictEqual(levelSeed({}), {ok: 0, ko: 0, th: 0});
});

test('achievements: unique ids, tiers 1-3; a snapshot unlocks only what it meets, never twice', () => {
  const {ACH, newAch} = require('../core.js');
  assert.strictEqual(new Set(ACH.map(a => a.id)).size, ACH.length);
  assert.ok(ACH.every(a => [1, 2, 3].includes(a.tier) && a.icon && a.title && a.desc));
  const zero = {
    total: 34,
    met: 0,
    q: [0, 0, 0],
    learned: 0,
    pct: 0,
    streak: 0,
    duel: false,
    cor: false,
    hard: false,
    elo: 1000,
    group: false,
    bonus: 0
  };
  assert.deepStrictEqual(newAch(zero, {}), []);
  const s = {...zero, met: 12, q: [5, 1, 0], pct: 6, streak: 10, duel: true, elo: 1120};
  const got = newAch(s, {});
  assert.deepStrictEqual(got, ['met10', 'q25a', 'pct5', 'run10', 'duel', 'elo1100']);
  assert.deepStrictEqual(newAch(s, Object.fromEntries(got.map(id => [id, 1]))), [], 'never twice');
  const all = {
    total: 34,
    met: 34,
    q: [34, 34, 34],
    learned: 34,
    pct: 100,
    streak: 30,
    duel: true,
    cor: true,
    hard: true,
    elo: 1500,
    group: true,
    bonus: 3
  };
  assert.strictEqual(newAch(all, {}).length, ACH.length, 'every achievement is reachable');
});

test('mergeProgress: the mastery exam (passed or in course) follows the device that played, as the knowledge itself', () => {
  const B = {Acropora: {ok: 10, ko: 1, L: 0.96, ex: {k: 2, v: ['wide'], at: 50}}};
  const mine = {Acropora: {ok: 11, ko: 1, L: 0.97, ex: {k: 3, v: ['wide', 'macro'], at: 60}}};
  const theirs = {Acropora: {ok: 10, ko: 1, L: 0.96, ex: {k: 2, v: ['wide'], at: 50}}, Porites: {ok: 5, ko: 0, mx: 1}};
  const m = mergeProgress(B, mine, theirs);
  assert.deepStrictEqual(m.Acropora.ex, mine.Acropora.ex);
  assert.strictEqual(m.Porites.mx, 1, 'mastered on the other device, not played here');
  const lostMx = mergeProgress({Porites: {ok: 5, ko: 0, mx: 1}}, {Porites: {ok: 5, ko: 2, L: 0.6}}, {Porites: {ok: 5, ko: 0, mx: 1}});
  assert.strictEqual(lostMx.Porites.mx, undefined, 'lost here after misses: not brought back');
  const lost = mergeProgress(B, {Acropora: {ok: 11, ko: 2, L: 0.9}}, theirs);
  assert.strictEqual(lost.Acropora.ex, undefined, 'a miss here ended the exam');
});
