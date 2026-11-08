// core.js: curation merge (admin Publish), progress merge (two devices), photo Elo (same as Code.gs stats_).
const test = require('node:test'),
  assert = require('node:assert');
const {
  merge3,
  mergeOld,
  mergeProgress,
  replayedOf,
  eloOf,
  genusOffsetsOf,
  GENUS_K,
  trustOf,
  confusionOf,
  confScore,
  CONF,
  pairConf,
  mergeUsers,
  playerStart,
  commonFactor,
  accountOf,
  levelSeed,
  LEVEL,
  START,
  MEM,
  memBucket,
  memFam,
  memOf,
  photoMemOf,
  memRecalc,
  PHOTO_BASE,
  photoLocal,
  photoFallback,
  photoOnline,
  photoFileOf,
  photoAway,
  photoIndex,
  photoCropOf,
  scoreOf
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

test('hierarchical photo Elo: a photo nobody answered starts at its genus offset, served as the total (sheet v31)', () => {
  const R = (t, ok, f, g = 'Acropora', who = 'Ana') => [who, t, g, ok ? g : 'Porites', ok ? 1 : 0, 'quiz', f];
  // A trusted player (clearly above chance) misses the Acropora photos more than the game expected: the genus offset rises.
  const rows = [];
  for (let i = 0; i < 40; i++) rows.push(R(i, i % 2, `acropora-${i % 4}`), R(100 + i, 1, `porites-${i % 4}`, 'Porites'));
  // A new photo, answered once by a player who does not rate the photos (fewer than 10 answers): it moves nothing, so its
  // served difficulty is where it starts, its genus offset.
  rows.push(R(200, 1, 'acropora-new', 'Acropora', 'Zed'));
  const gd = genusOffsetsOf(rows),
    E = eloOf(rows);
  assert.ok(GENUS_K > 0 && gd.Acropora[0] > gd.Porites[0], JSON.stringify(gd));
  assert.strictEqual(E['acropora-new'][0], gd.Acropora[0]);
  assert.strictEqual(E['acropora-new'][1], 0);
  // The weighed answers behind an offset: every trusted answer on the genus, weighed as for its photos (n / (n + 10)).
  assert.ok(gd.Acropora[1] > 0 && gd.Acropora[1] < 40, JSON.stringify(gd));
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
            // v31: the genus shown is the photos' genus (one colony a question), whose offset they share.
            g: ph[0].split('-')[0].replace(/^./, c => c.toUpperCase()),
            a: i % 3 ? 'Acropora' : 'Porites',
            ok: i % 3 ? 1 : 0,
            m: ['quiz-duel', 'quiz', 'quiz|k2', 'quiz|k3', 'quiz'][i % 5],
            // Every 5th: a plain "quiz" with 2 choices ("Again: A or B?" logged before 2026-11-02), rated 1 in 2 (v20).
            ch: i % 5 === 4 ? 'Acropora Porites' : 'Acropora Porites Favites Montipora',
            ph: ph.join(' ')
          }
        ]
      });
    }
  const T = {token: 'ghp_write000000000000000000'},
    rows = s.post({readAnswers: 1, ...T}).rows,
    st = s.get({stats: '1'});
  assert.deepStrictEqual(eloOf(rows), st.photos);
  // v31: the genus offsets of the hierarchical photo Elo, the same in the sheet and the admin's replay.
  assert.deepStrictEqual(genusOffsetsOf(rows), st.gd);
  assert.deepStrictEqual(Object.keys(st.gd).sort(), ['Acropora', 'Favia', 'Porites']);
  assert.ok(
    Object.values(st.gd).some(o => o[0] !== 0),
    'the answers moved the genus offsets'
  );
  // v26: the photo memory offsets and the answers behind them, the same in the sheet and the admin's replay.
  assert.deepStrictEqual(photoMemOf(rows), {mem: st.mem, memn: st.memn});
  assert.notDeepStrictEqual(st.mem, MEM.PRIOR, 'the answers moved the offsets');
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
  // v20: a plain "quiz" with 2 genera in its choices ("Again: A or B?" before 2026-11-02) is a 2-choice question too.
  const E2 = ch => eloOf([...past, ['Ana', 1, 'Acropora', 'Acropora', 1, 'quiz', 'acropora-1', null, null, null, ch]])['acropora-1'][0];
  assert.strictEqual(E2('Acropora Porites'), E('quiz|k2', 1));
  assert.strictEqual(E2('Acropora Porites Favites Montipora'), E('quiz', 1));
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
  // Weighed counts: three answers at n = 12, 13, 14 weigh 12/22 + 13/23 + 14/24 (photoDiff's confidence, damping).
  assert.strictEqual(eloOf(again)['z-1'][1], 1.7);
});

test("v17: a beginner's answers move the photos more as their level settles; a remembered photo moves less", () => {
  const R = (i, ok, f) => ['Lea', i, 'Acropora', ok ? 'Acropora' : 'Porites', ok, 'quiz', f];
  // Pierre's case: a beginner at chance for 20 answers, then right most of the time. Trusted over the whole history.
  const early = Array.from({length: 20}, (_, i) => R(i, i % 4 === 0 ? 1 : 0, 'e-' + i)),
    later = Array.from({length: 40}, (_, i) => R(20 + i, i % 5 ? 1 : 0, 'l-' + i)),
    L = [...early, ...later];
  assert.strictEqual(trustOf(L).Lea, true);
  // A photo's own part (sheet v31: the served difficulty less its genus offset, which every Acropora photo shares).
  const own = (rows, f) => eloOf(rows)[f][0] - genusOffsetsOf(rows).Acropora[0],
    e1 = own(L, 'e-1'),
    l5 = own(L, 'l-5');
  // Same outcome (a miss), early (answer 2) and late (answer 25): the late one moves its photo more.
  assert.strictEqual(early[1][4], 0);
  assert.strictEqual(later[5][4], 0);
  assert.ok(Math.abs(e1) < Math.abs(l5) / 2, `early ${e1} vs late ${l5}`);
  // A right answer on a photo already right twice (remembered) moves it less than one on a new photo.
  const base = [...L, R(100, 1, 'k-1'), R(101, 1, 'k-1')],
    dKnown = own([...base, R(102, 1, 'k-1')], 'k-1') - own(base, 'k-1'),
    dNew = own([...base, R(102, 1, 'n-1')], 'n-1');
  assert.ok(Math.abs(dKnown) < Math.abs(dNew), `known ${dKnown} vs new ${dNew}`);
});

test('mergeUsers: two accounts of one person add up; the busier account model wins per genus', () => {
  const A = {
    'reefid-sync-coral-progress': JSON.stringify({
      Acropora: {ok: 8, ko: 2, th: 1.2, L: 0.8, h: '1101', cor: 1, conf: {Montipora: 1}, ps: {p1: [3, 2]}},
      Porites: {ok: 1, ko: 0, th: 0.1}
    }),
    'reefid-sync-coral-quiz': JSON.stringify({bu: 2})
  };
  const B = {
    'reefid-sync-coral-progress': JSON.stringify({
      Acropora: {ok: 1, ko: 1, th: 0.2, L: 0.3, h: '10', du: 1, conf: {Montipora: 2}, off: {Montipora: 3}, ps: {p1: [1, 1], p2: [1, 0]}}
    }),
    'reefid-sync-coral-quiz': JSON.stringify({bu: 1, view: 'any'}),
    'reefid-sync-theme': '"dark"'
  };
  const M = mergeUsers(A, B),
    P = JSON.parse(M['reefid-sync-coral-progress']);
  assert.strictEqual(P.Acropora.ok, 9);
  assert.strictEqual(P.Acropora.ko, 3);
  assert.strictEqual(P.Acropora.th, 1.2, 'A answered Acropora more: its ability is kept');
  assert.strictEqual(P.Acropora.cor, 1);
  assert.strictEqual(P.Acropora.du, 1);
  assert.deepStrictEqual(P.Acropora.conf, {Montipora: 3});
  assert.deepStrictEqual(P.Acropora.off, {Montipora: 3});
  assert.deepStrictEqual(P.Acropora.ps, {p1: [4, 3], p2: [1, 0]});
  assert.deepStrictEqual(P.Porites, {ok: 1, ko: 0, th: 0.1, streak: 0});
  assert.deepStrictEqual(JSON.parse(M['reefid-sync-coral-quiz']), {bu: 2, view: 'any'});
  assert.strictEqual(M['reefid-sync-theme'], '"dark"');
});
test('mergeUsers: bonus genera on for either account stay on (Q.bon)', () => {
  const q = (a, b) =>
    JSON.parse(
      mergeUsers({'reefid-sync-coral-quiz': JSON.stringify(a)}, {'reefid-sync-coral-quiz': JSON.stringify(b)})['reefid-sync-coral-quiz']
    );
  assert.strictEqual(q({bon: true}, {bon: false}).bon, true);
  assert.strictEqual(q({bon: false}, {}).bon, false, 'a "Not now" is kept: the offer is not made again');
  assert.strictEqual(q({}, {}).bon, undefined, 'no choice yet: the offer stays due');
});

test('mergeUsers: the progress (pg) comes from the busier account, recomputed if it was saved before pg', () => {
  const {pgOf} = require('../core.js');
  const A = {'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: 40, ko: 1, h: '1111111111', L: 0.99}})},
    B = {'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: 1, ko: 0, h: '1', pg: 0.1}})};
  const P = JSON.parse(mergeUsers(A, B)['reefid-sync-coral-progress']);
  assert.strictEqual(P.Acropora.pg, pgOf({h: '1111111111', L: 0.99}));
  assert.ok(P.Acropora.pg > 0.6, "not the less-played account's 0.1");
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
  // Its recent results over every game (h, newest last; model.js openRight: an opening only after a right answer): the
  // device that played keeps its own, as for a genus, and the sheet's replay keeps the saved ones (core.js replayedOf).
  const h = mergeProgress({[LEVEL]: {ok: 2, ko: 0, h: '11'}}, {[LEVEL]: {ok: 2, ko: 1, h: '110'}}, {[LEVEL]: {ok: 2, ko: 0, h: '11'}});
  assert.strictEqual(h[LEVEL].h, '110');
  assert.strictEqual(replayedOf({P: {[LEVEL]: {ok: 4, ko: 1, th: 1}}}, {[LEVEL]: {ok: 2, ko: 1, h: '110'}})[LEVEL].h, '110');
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
    bonus: 3,
    basics: true,
    fb: 10
  };
  assert.strictEqual(newAch(all, {}).length, ACH.length, 'every achievement is reachable');
});

// The fish achievements (Pierre, 2026-11-04: about 14 general ones; rule L8): ids of their own in the shared record, so a
// fish achievement never counts in the corals' list and back; every one reachable on the fish snapshot; none reachable on
// an empty one (nothing for time or for opening the app).
test('fish achievements: ids apart from the corals, each reachable, none for nothing', () => {
  const {ACH, FISH_ACH, ACH_CONTRIB, ACH_LEARN, achFind, newAch, achRevoke, SUBJECTS} = require('../core.js');
  assert.strictEqual(FISH_ACH.length, 24, String(FISH_ACH.length)); // the 33 of 2026-11-08 less the 9 that wait for the species level
  const ids = [...ACH, ...FISH_ACH].map(a => a.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'one id per achievement across subjects');
  assert.ok(FISH_ACH.every(a => a.kind === 'learn' && [1, 2, 3].includes(a.tier) && a.icon && a.title && a.desc));
  assert.ok(
    ACH_LEARN.every(id => achFind(id)),
    'every learned-based id exists'
  );
  assert.deepStrictEqual(
    SUBJECTS.map(S => S.achs()),
    [ACH, FISH_ACH]
  );
  assert.ok(ACH_CONTRIB.length && ACH_CONTRIB.every(a => a.kind === 'contrib'));
  const none = {
    total: 40,
    met: 0,
    q: [0, 0, 0],
    learned: 0,
    pct: 0,
    streak: 0,
    elo: 0,
    core: {total: 20, met: 0, adv: 0, learned: 0},
    circ: [
      {total: 20, adv: 0},
      {total: 4, adv: 0},
      {total: 35, adv: 0}
    ],
    sets: {},
    setsAdv: {},
    fb: 0
  };
  assert.deepStrictEqual(newAch(none, {}, FISH_ACH), [], 'nothing on an empty snapshot');
  const all = {
    total: 40,
    met: 40,
    q: [40, 40, 40],
    learned: 40,
    pct: 100,
    streak: 0,
    elo: 1500,
    core: {total: 20, met: 20, adv: 20, learned: 20},
    circ: [
      {total: 20, adv: 20},
      {total: 4, adv: 4},
      {total: 35, adv: 35}
    ],
    sets: {sci: 130},
    setsAdv: {sci: 130},
    fb: 0
  };
  assert.strictEqual(newAch(all, {}, FISH_ACH).length, FISH_ACH.length, 'every fish achievement is reachable');
  assert.ok(!newAch(all, {}).some(id => FISH_ACH.some(a => a.id === id)), "a fish snapshot never earns from the corals' list by default");
  // A learned mark taken away takes back the fish learned-based ones only from the fish list.
  const A = {flearn1: 5, fmet5: 5, learn1: 5};
  assert.deepStrictEqual(achRevoke(A, none, 9, FISH_ACH), ['flearn1']);
  assert.ok(A.learn1 && A.fmet5 && !A.flearn1);
});

// The fish set around the global score (Pierre, 2026-11-08, Q259-Q263): each new condition at its threshold and not one
// below; fpct25 retired; the % ones read the snapshot's pct (the global score, progress.js achSnap).
test('fish achievements around the global score: the 10-point ladder, fpct25 retired, the new conditions', () => {
  const {FISH_ACH, ACH_LEARN, achFind, newAch} = require('../core.js');
  const snap = (o = {}) => ({
    total: 67,
    met: 0,
    q: [0, 0, 0],
    learned: 0,
    pct: 0,
    core: {total: 28, met: 0, adv: 0, learned: 0},
    circ: [
      {total: 28, adv: 0},
      {total: 4, adv: 0},
      {total: 35, adv: 0}
    ],
    sets: {},
    setsAdv: {},
    fb: 0,
    ...o
  });
  const got = o => newAch(snap(o), {}, FISH_ACH);
  assert.strictEqual(achFind('fpct25'), null, 'fpct25 retired (Q259)');
  assert.deepStrictEqual(
    FISH_ACH.filter(a => a.id.startsWith('fpct')).map(a => a.id),
    ['fpct10', 'fpct20', 'fpct30', 'fpct40', 'fpct50', 'fpct60']
  );
  [10, 20, 30, 40, 50, 60].forEach(p => {
    assert.ok(got({pct: p}).includes('fpct' + p), p + '%');
    assert.ok(!got({pct: p - 1}).includes('fpct' + p), 'not at ' + (p - 1) + '%');
  });
  assert.deepStrictEqual(got({pct: 59}), ['fpct10', 'fpct20', 'fpct30', 'fpct40', 'fpct50'], 'the ladder only');
  // fpct70 and fpct100 wait for the species level (today's score tops out at 67%: families and every genus).
  assert.ok(!achFind('fpct70') && !achFind('fpct100'));
  // Families: flearn30 (and it is taken back with a learned mark, ACH_LEARN).
  assert.ok(got({learned: 30}).includes('flearn30') && !got({learned: 29}).includes('flearn30'));
  assert.ok(ACH_LEARN.includes('flearn30'));
  // Scientific genera at Advanced: fgen20, fgen60; Open Water alone earns neither.
  assert.deepStrictEqual(got({setsAdv: {sci: 20}}), ['fgen20']);
  assert.deepStrictEqual(got({setsAdv: {sci: 19}, sets: {sci: 100}}), ['fsci5']);
  assert.deepStrictEqual(got({setsAdv: {sci: 60}}), ['fgen20', 'fgen60']);
  // Circles: every circle-1 family at Advanced; every circle-2 one; 20 of circle 3.
  const c = (a, b, d) => [
    {total: 28, adv: a},
    {total: 4, adv: b},
    {total: 35, adv: d}
  ];
  assert.deepStrictEqual(got({core: {total: 28, met: 28, adv: 28, learned: 0}}), ['fmetcore', 'fcoreadv']);
  assert.ok(!got({core: {total: 28, met: 28, adv: 27, learned: 0}}).includes('fcoreadv'));
  assert.deepStrictEqual(got({circ: c(0, 4, 0)}), ['fc2']);
  assert.deepStrictEqual(got({circ: c(0, 3, 0)}), []);
  assert.deepStrictEqual(got({circ: c(0, 0, 20)}), ['fc3adv']);
  assert.deepStrictEqual(got({circ: c(0, 0, 19)}), []);
  // A subject without circles (no circ) or a slate with no circle 2 (total 0) never earns them.
  assert.deepStrictEqual(got({circ: undefined}), []);
  assert.deepStrictEqual(
    got({
      circ: [
        {total: 28, adv: 28},
        {total: 0, adv: 0}
      ]
    }),
    []
  );
  // Names: short, each its own (Pierre, 2026-11-08: "des noms sympas, rigolos, pour varier").
  const T = FISH_ACH.map(a => a.title);
  assert.strictEqual(new Set(T).size, T.length);
  assert.ok(
    T.every(t => t.length <= 20),
    T.join(', ')
  );
});

// The full recount (progress.js achMigrate, achPending): what the snapshot meets stays with its earliest date, the rest goes.
test('achRecount: met ones keep the earliest date, others and retired ids are left out', () => {
  const {FISH_ACH, achRecount} = require('../core.js');
  const B = {_v: 3, fmet5: 50},
    old = {fmet5: 40, fpct25: 10, fpct50: 10, fq50a: 30},
    snap = {total: 67, met: 10, q: [6, 0, 0], learned: 0, pct: 45, core: {total: 28, met: 10, adv: 0, learned: 0}, sets: {}, setsAdv: {}};
  assert.deepStrictEqual(achRecount(B, old, FISH_ACH, snap, 100).sort(), ['fmet5', 'fpct10', 'fpct20', 'fpct30', 'fpct40', 'fq50a']);
  assert.deepStrictEqual(B, {_v: 3, fmet5: 40, fq50a: 30, fpct10: 100, fpct20: 100, fpct30: 100, fpct40: 100});
  assert.deepStrictEqual(achRecount({}, null, FISH_ACH, {...snap, met: 0, q: [0, 0, 0], pct: 0}, 1), []);
});

test('Contributions (Q65): a family apart, three tiers; one per photo, Other only with a note; two devices joined', () => {
  const {ACH, newAch, contribAdd, contribKey, mergeAch, CONTRIB_MAX} = require('../core.js');
  const C = ACH.filter(a => a.kind === 'contrib');
  assert.deepStrictEqual(
    C.map(a => [a.id, a.tier]),
    [
      ['fb1', 1],
      ['fb5', 2],
      ['fb10', 3]
    ]
  );
  assert.ok(ACH.every(a => a.kind === 'learn' || a.kind === 'contrib'));
  assert.strictEqual(new Set(C.map(a => a.icon)).size, 1, 'one family: one icon');
  // Never earned by learning alone: a snapshot with everything learned and no report holds none of them.
  const learned = {
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
    bonus: 3,
    basics: true
  };
  assert.ok(!newAch(learned, {}).some(id => C.some(a => a.id === id)));
  assert.deepStrictEqual(newAch({...learned, fb: 1}, Object.fromEntries(ACH.filter(a => a.kind === 'learn').map(a => [a.id, 1]))), ['fb1']);
  assert.deepStrictEqual(
    newAch({...learned, fb: 5}, {fb1: 1}).filter(id => id.startsWith('fb')),
    ['fb5']
  );
  // Counting.
  const A = {};
  assert.strictEqual(contribAdd(A, {id: 'a1', why: 'wrong', ph: 'x1.webp x2.webp'}), true, 'a game report');
  assert.strictEqual(contribAdd(A, {id: 'a2', why: 'photo', ph: 'x2.webp'}), false, 'the same photo, enlarged: counted once');
  assert.strictEqual(contribAdd(A, {id: 'a3', why: 'other', ph: 'y.webp', note: '  '}), false, 'Other without a note');
  assert.strictEqual(contribAdd(A, {id: 'a4', why: 'other', ph: 'y.webp', note: 'blurry'}), true, 'Other with a note');
  assert.strictEqual(contribAdd(A, {id: 'a5', why: 'bug', ph: ''}), true, 'feedback on no photo');
  assert.strictEqual(contribAdd(A, {id: 'a5', why: 'bug', ph: ''}), false, 'the same report again');
  assert.strictEqual(contribAdd(A, {id: 'a6', why: 'idea'}), true);
  assert.deepStrictEqual(A._fb, ['x1.webp x2.webp', 'y.webp', 'r:a5', 'r:a6']);
  assert.strictEqual(contribKey(null), '');
  assert.strictEqual(contribAdd(null, {id: 'z', why: 'bug'}), false);
  // Two devices of one player: both lists, each entry once; kept within CONTRIB_MAX.
  const M = mergeAch({_v: 2, _fb: ['r:a5', 'y.webp']}, {_v: 2, _fb: ['y.webp', 'z.webp'], fb1: 5}, 2);
  assert.deepStrictEqual([M._fb, M.fb1], [['r:a5', 'y.webp', 'z.webp'], 5]);
  // One photo reported on each device before they synced (a quiz question here, its enlarged photo there): once (Codex
  // review #579); a report on no photo by its id.
  assert.deepStrictEqual(mergeAch({_fb: ['x.webp y.webp', 'r:a1']}, {_fb: ['x.webp', 'z.webp', 'r:a1', 'r:a2']}, undefined)._fb, [
    'x.webp y.webp',
    'r:a1',
    'z.webp',
    'r:a2'
  ]);
  const big = mergeAch(
    {_fb: Array.from({length: 40}, (_, i) => 'r:a' + i)},
    {_fb: Array.from({length: 40}, (_, i) => 'r:b' + i)},
    undefined
  );
  assert.strictEqual(big._fb.length, CONTRIB_MAX);
  // An older record (another _v) brings its feats, the list included.
  assert.deepStrictEqual(mergeAch({_v: 2}, {_v: 1, _fb: ['r:q'], fb1: 3}, 2), {_v: 2, _fb: ['r:q']});
});

test('Your feedback helped (Q66): the reports sent, those the admin marked done thanked once, across devices', () => {
  const {repsAdd, helpedDue, helpedMark, mergeAch, LIST_MAX, HELPED_GAP} = require('../core.js');
  const T = 1e12,
    take = (A, seen, t = T) => {
      const ids = helpedDue(A, seen, t);
      helpedMark(A, ids, t);
      return ids;
    };
  const A = {};
  assert.strictEqual(repsAdd(A, ['a1', 'a2', 'a1', 'BAD id', 3]), true);
  assert.deepStrictEqual(A._rep, ['a1', 'a2', '3']);
  assert.strictEqual(repsAdd(A, ['a2']), false, 'nothing new');
  // Done in curation.json seen ('rep:<id>'); other seen keys never match.
  const seen = {'rep:a2': 1, 'rep:zz': 1, a1: 1};
  assert.deepStrictEqual(helpedDue(A, seen, T), ['a2'], 'the first report handled: at once');
  assert.deepStrictEqual(helpedDue(A, seen, T), ['a2'], 'helpedDue changes nothing');
  assert.deepStrictEqual(take(A, seen), ['a2']);
  assert.strictEqual(A._thxAt, T);
  assert.deepStrictEqual(take(A, seen, T + HELPED_GAP * 2), [], 'once');
  // Handled in a PR (reports-handled.json) counts as Pierre's Done; other seen keys and bad ids never.
  const {handledSeen} = require('../core.js');
  assert.deepStrictEqual(handledSeen({'rep:a1': 1, 'cand:x': 1, 'rep:zz': 0}, {b2: {pr: 577, at: '2026-11-05'}, 'BAD id': {}}), {
    'rep:a1': 1,
    'rep:b2': 1
  });
  assert.deepStrictEqual(handledSeen(null, null), {});
  assert.deepStrictEqual(helpedDue({_rep: ['b2']}, handledSeen({}, {b2: {pr: 577}}), T), ['b2']);
  // Anti-spam (Pierre, 2026-11-05): within 7 days of the last thanks, nothing; then everything handled since, in one.
  const more = {...seen, 'rep:a1': 1, 'rep:3': 1};
  assert.deepStrictEqual(helpedDue(A, more, T + HELPED_GAP - 1), [], 'within the 7 days');
  assert.deepStrictEqual(take(A, more, T + HELPED_GAP), ['a1', '3'], 'grouped, once the 7 days are over');
  assert.deepStrictEqual(helpedDue({}, seen, T), []);
  assert.deepStrictEqual(helpedDue(A, null, T), []);
  // Thanked on one device: never again on another once their records meet; the latest thanks time of the two.
  const B = {_rep: ['a2', 'b1'], _thxAt: 5},
    M = mergeAch(B, {_rep: A._rep, _thx: A._thx, _thxAt: A._thxAt}, undefined);
  assert.strictEqual(M._thxAt, T + HELPED_GAP);
  assert.deepStrictEqual(helpedDue(M, {'rep:a2': 1, 'rep:b1': 1}, T + 3 * HELPED_GAP), ['b1']);
  // 50 reports sent signed in and thanked, one more sent signed out on the device, then the sheet lists the 50 again:
  // none thanked twice (Codex review #581: the lists' caps evicted a thanked id, which the sheet brought back).
  const R = {},
    S50 = Array.from({length: 50}, (_, i) => 's' + i),
    done = Object.fromEntries([...S50, 'a1'].map(x => ['rep:' + x, 1]));
  repsAdd(R, S50);
  assert.strictEqual(take(R, done).length, 50);
  repsAdd(R, ['a1']);
  assert.deepStrictEqual(take(R, done, T + HELPED_GAP), ['a1']);
  repsAdd(R, S50);
  assert.deepStrictEqual(helpedDue(mergeAch({...R}, {_rep: S50}, undefined), done, T + 9 * HELPED_GAP), []);
  const big = {};
  repsAdd(
    big,
    Array.from({length: 150}, (_, i) => 'r' + i)
  );
  assert.deepStrictEqual([big._rep.length, big._rep[0]], [LIST_MAX._rep, 'r50'], 'the latest kept');
  assert.ok(LIST_MAX._thx > LIST_MAX._rep, 'more thanked kept than sent');
});

test('achRevoke and mergeAch: learned-based achievements taken back stay so through merges, until earned again', () => {
  const {ACH_LEARN, achRevoke, mergeAch} = require('../core.js');
  assert.deepStrictEqual(ACH_LEARN, [
    'learn1',
    'learn5',
    'learn10',
    'learn20',
    'learnall',
    'group',
    'flearn1',
    'flearn10',
    'flearn30',
    'flearncore'
  ]);
  const snap = (learned, group = false) => ({
    total: 40,
    met: 40,
    q: [30, 20, 10],
    learned,
    pct: 60,
    streak: 12,
    duel: true,
    cor: true,
    hard: true,
    elo: 1250,
    group,
    bonus: 0
  });
  // Two genera learned (learn1, group with them), one taken away: learn1 stays met, group goes; the others were never held.
  const A = {_v: 2, met10: 10, learn1: 20, group: 30, pct50: 40, _best: 12, _run: 3};
  assert.deepStrictEqual(achRevoke(A, snap(1), 100), ['group']);
  assert.deepStrictEqual(A, {
    _v: 2,
    met10: 10,
    learn1: 20,
    pct50: 40,
    _best: 12,
    _run: 3,
    _gone: {learn5: 100, learn10: 100, learn20: 100, learnall: 100, group: 100}
  });
  // None learned left: learn1 goes too; nothing outside ACH_LEARN is ever taken back, whatever the snapshot.
  assert.deepStrictEqual(achRevoke(A, {...snap(0), met: 0, pct: 0, elo: 0}, 200), ['learn1']);
  assert.deepStrictEqual([A.met10, A.pct50, A._gone.learn1, A._gone.group], [10, 40, 200, 200]);
  assert.deepStrictEqual(achRevoke(null, snap(0), 1), []);
  // The sheet's copy, earned before the removal: never brought back; its other achievements and feats still join.
  const sheet = {_v: 2, met10: 5, learn1: 20, group: 30, run10: 50, _best: 15, _run: 9};
  const M = mergeAch({...A, _gone: {...A._gone}}, sheet, 2);
  assert.deepStrictEqual([M.learn1, M.group, M.met10, M.run10, M._best, M._run], [undefined, undefined, 5, 50, 15, 3]);
  // Earned again since (a newer time): kept here, and taken from another device's record too, with its own date.
  const again = mergeAch({...M, learn1: 300}, sheet, 2);
  assert.strictEqual(again.learn1, 300);
  const there = mergeAch({...M, _gone: {...M._gone}}, {_v: 2, learn1: 250, _gone: {learn1: 200}}, 2);
  assert.strictEqual(there.learn1, 250);
  // A removal made on another device joins this one's and takes its old copy away; the latest removal date wins.
  const here = mergeAch({_v: 2, learn1: 20, met10: 10, _gone: {group: 500}}, {_v: 2, _gone: {learn1: 200, group: 100}}, 2);
  assert.deepStrictEqual(here, {_v: 2, met10: 10, _gone: {group: 500, learn1: 200}});
  // As before: an older version brings feats only; nothing to merge leaves the record alone.
  assert.deepStrictEqual(mergeAch({met10: 1}, {_v: 1, met20: 2, _cor: 1}, 2), {met10: 1, _cor: 1});
  assert.deepStrictEqual(mergeAch({met10: 1}, null, 2), {met10: 1});
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

test('progress (PROG): a moving average weighed by what each answer proves; old records recomputed from their recent results', () => {
  const {PROG, pgStep, pgOf, scoreOf, pctOf} = require('../core.js');
  // Each point is harder to earn than the last; a right answer weighing a third (2 plausible choices, no look-alike) a third as much.
  let g = 0,
    last = 1,
    n = 0;
  while (g < PROG.M) {
    const x = pgStep(g, true, 1);
    assert.ok(x - g < last, 'each step smaller');
    last = x - g;
    g = x;
    n++;
  }
  assert.ok(n >= 8 && n <= 12, `${n} right answers in a row against look-alikes to the exam's entry`);
  let e = 0,
    m = 0;
  while (e < PROG.M && m < 200) {
    e = pgStep(e, true, 1 / 3);
    m++;
  }
  assert.ok(m >= 3 * n - 3, `${m} easy right answers in a row, against ${n}`);
  // A miss on a photo at the player's level counts in full: from 90% on the bar it falls visibly; on a much harder photo
  // (model.js pgMissW, 0.56 two units above the level) about half as much.
  const p90 = (0.9 * PROG.M) / 0.95,
    full = scoreOf({pg: p90}) - scoreOf({pg: pgStep(p90, false, 1)}),
    hard = scoreOf({pg: p90}) - scoreOf({pg: pgStep(p90, false, 0.56)});
  assert.ok(full > 0.1 && hard < 0.6 * full, `${full} ${hard}`);
  // The bar: 95% at the exam's entry, the exam questions passed on top, 100% once learned.
  assert.strictEqual(scoreOf({pg: PROG.M}), 0.95);
  assert.strictEqual(scoreOf({pg: PROG.M, ex: {k: 2}}), 0.97);
  // An exam with its 5 right answers but not passed yet (begun before typed questions, waiting for its typed ones):
  // never 100% before s.mx (Codex review #393).
  assert.strictEqual(scoreOf({pg: PROG.M, ex: {k: 5, t: 1}}), 0.99);
  assert.strictEqual(scoreOf({pg: 0.5, mx: 1}), 1);
  // Saved before s.pg: BKT's L is ignored, the last results replay from 0 (a right answer 2/3), never to the exam's entry;
  // a learned genus stays learned, at the entry.
  assert.strictEqual(pgOf({h: '1111111111', L: 0.99}), pgOf({h: '1111111111'}));
  assert.ok(pgOf({h: '1111111111'}) > 0.6 && pgOf({h: '1111111111'}) < PROG.M);
  assert.ok(pgOf({h: '1111111110'}) < pgOf({h: '1111111111'}) * (1 - PROG.A) + 1e-9);
  assert.strictEqual(pgOf({h: '11', mx: 1}), PROG.M);
  assert.strictEqual(pgOf({pg: 0.3, h: '1111111111'}), 0.3);
  assert.strictEqual(pctOf({A: {pg: PROG.M}, B: {mx: 1}}, ['A', 'B', 'C', 'D']), 49);
});

test('mergeProgress: the progress (pg) follows the device that played', () => {
  const B = {Acropora: {ok: 10, ko: 1, h: '1', pg: 0.5}};
  const m = mergeProgress(B, {Acropora: {ok: 11, ko: 1, h: '11', pg: 0.6}}, {Acropora: {ok: 10, ko: 2, h: '10', pg: 0.4}});
  assert.strictEqual(m.Acropora.pg, 0.6);
  const old = mergeProgress(B, {Acropora: {ok: 11, ko: 1, h: '11', L: 0.6}}, {Acropora: {ok: 10, ko: 1, h: '1', pg: 0.5}});
  assert.strictEqual(old.Acropora.pg, undefined, 'played here by an app from before s.pg: recomputed from its results');
});

test('mergeProgress: the comeback times (last answer, days answered right) keep the latest of both devices', () => {
  const B = {Acropora: {ok: 10, ko: 1, h: '1', at: 100, dd: 2, dl: 20000}};
  const m = mergeProgress(
    B,
    {Acropora: {ok: 11, ko: 1, h: '11', at: 300, dd: 3, dl: 20002}},
    {Acropora: {ok: 10, ko: 2, h: '10', at: 200, dd: 2, dl: 20000}}
  );
  assert.deepStrictEqual([m.Acropora.at, m.Acropora.dd, m.Acropora.dl], [300, 3, 20002]);
  const r = mergeProgress(
    B,
    {Acropora: {ok: 10, ko: 1, h: '1', at: 100, dd: 2, dl: 20000}},
    {Acropora: {ok: 12, ko: 1, h: '111', at: 400, dd: 4, dl: 20005}}
  );
  assert.deepStrictEqual([r.Acropora.at, r.Acropora.dd, r.Acropora.dl], [400, 4, 20005]);
  assert.strictEqual(mergeProgress({}, {Acropora: {ok: 1, ko: 0, h: '1'}}, {}).Acropora.at, undefined);
});

test('levelMargin: the 95% margin of a level, on the replay of the level, shrinks with answers and stays wide after easy runs', () => {
  const {levelMargin} = require('../core.js');
  let t = 0;
  const row = (id, ok, mode = 'quiz') => [
    id,
    ++t,
    'Acropora',
    ok ? 'Acropora' : 'Porites',
    ok,
    mode,
    'p' + (t % 40),
    null,
    0,
    0,
    'Acropora Porites Montipora Pocillopora'
  ];
  const few = [...Array(35)].map(() => row('a', 1)),
    many = [...Array(245)].map((_, i) => row('b', i % 5 ? 1 : 0)),
    m = levelMargin([...few, ...many]);
  assert.ok(m.a > 1.5 * m.b, `${m.a} vs ${m.b}`);
  assert.ok(m.b > 0.1 && m.b < 0.6, String(m.b));
  // A 2-choice answer tells less than a 4-choice one.
  const two = levelMargin([...Array(50)].map((_, i) => row('d', i % 5 ? 1 : 0, 'quiz|k2'))).d,
    four = levelMargin([...Array(50)].map((_, i) => row('e', i % 5 ? 1 : 0))).e;
  assert.ok(two > four, `${two} vs ${four}`);
});

test('commonFactor: common first, relative to the median of the genera not met yet, neutral when cm is missing', () => {
  // Median of 3, 8, 15 = 8: the median genus weighs 1, a commoner one more, a rarer one less, damped by the square root.
  const f = commonFactor([3, 8, 15, undefined]);
  assert.strictEqual(f[1], 1);
  assert.ok(Math.abs(f[2] - Math.sqrt(16 / 9)) < 1e-12);
  assert.ok(Math.abs(f[0] - Math.sqrt(4 / 9)) < 1e-12);
  assert.ok(f[2] > f[1] && f[1] > f[0]);
  assert.strictEqual(f[3], 1, 'no cm: counts as the median');
  // Relative: the same genus weighs less when the genera left to open are all commoner.
  assert.ok(commonFactor([8, 60, 40])[0] < 1);
  assert.deepStrictEqual(commonFactor([undefined, null]), [1, 1]);
  assert.deepStrictEqual(commonFactor([]), []);
  assert.strictEqual(commonFactor([0, 0, 2, 4])[1], Math.sqrt(1 / 2), 'even count: the mean of the two middle values');
});

test('playSplit: the photo quiz apart from the Duel tab, last 50 quiz answers, other games in neither', () => {
  const {playSplit} = require('../core.js');
  let t = 0;
  const r = (id, ok, mode) => [id, ++t, 'A', ok ? 'A' : 'B', ok, mode];
  const rows = [
    ...[...Array(45)].map((_, i) => r('j', i % 9 ? 1 : 0, i % 3 ? 'quiz' : 'quiz|k2')),
    ...[...Array(31)].map(() => r('j', 1, 'quiz-duel|Halomitra|Danafungia')),
    r('j', 1, 'quiz|d|k2'),
    r('j', 0, 'reveal')
  ];
  const s = playSplit(rows).j;
  assert.deepStrictEqual(s.q, [46, 41]);
  assert.deepStrictEqual(s.d, [31, 31]);
  assert.deepStrictEqual(s.q50, [46, 41]);
  assert.deepStrictEqual(playSplit([...Array(60)].map((_, i) => r('k', i < 10 ? 0 : 1, 'quiz'))).k.q50, [50, 50]);
});

test('accountOf: an existing account at sign-in, from the progress the sheet returns; missing fields count as nothing', () => {
  const at = Date.parse('2026-11-02T09:30:00Z'),
    data = R => ({'reefid-sync-coral-progress': JSON.stringify(R)});
  assert.deepStrictEqual(
    accountOf(data({[LEVEL]: {ok: 200, ko: 45, th: 0.4, at}, Acropora: {ok: 30, ko: 5, at: at - 1}}), '2026-11-02T10:00:00Z'),
    {
      n: 245,
      genera: 1,
      at,
      saved: false
    }
  );
  // Progress saved before LEVEL: no answer count, the genera answered and their latest answer.
  assert.deepStrictEqual(accountOf(data({Acropora: {ok: 2, ko: 1, at: at - 5}, Porites: {ok: 1, ko: 0, at}, Favites: {ok: 0, ko: 0}})), {
    n: 0,
    genera: 2,
    at,
    saved: false
  });
  // No answer time anywhere: the sheet's last save, said as such.
  assert.deepStrictEqual(accountOf(data({Acropora: {ok: 1, ko: 0}}), '2026-11-02T10:00:00.000Z'), {
    n: 0,
    genera: 1,
    at: Date.parse('2026-11-02T10:00:00.000Z'),
    saved: true
  });
  const none = {n: 0, genera: 0, at: 0, saved: false};
  assert.deepStrictEqual(accountOf({}), none);
  assert.deepStrictEqual(accountOf(undefined, undefined), none);
  assert.deepStrictEqual(accountOf({'reefid-sync-coral-progress': 'not json'}, 'not a date'), none);
  assert.deepStrictEqual(accountOf({'reefid-sync-coral-progress': '[1,2]'}), none);
  assert.deepStrictEqual(accountOf(data({[LEVEL]: {ok: 'x', ko: -3, at: 'y'}, Acropora: null})), none);
});

// A synthetic answer log with a known photo memory (players and photos of known level, every photo seen many times).
function memLog(truth, n = 3000, seed = 7) {
  let a = seed;
  const rnd = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    sig = x => 1 / (1 + Math.exp(-x)),
    diff = {},
    H = {},
    rows = [];
  for (let g = 0; g < 20; g++) for (let i = 0; i < 12; i++) diff[`g${g}-${i}`] = (rnd() - 0.5) * 2;
  for (let p = 0; p < 12; p++) {
    const th = rnd() * 2 - 0.5;
    for (let q = 0; q < n / 12; q++) {
      const g = Math.floor(rnd() * 20),
        f = `g${g}-${Math.floor(rnd() * 12)}`,
        h = H[p + '|' + f] || [0, 0],
        ok = rnd() < 0.25 + 0.75 * sig(th - diff[f] - 0.5 - truth[memBucket(h)]) ? 1 : 0;
      H[p + '|' + f] = [h[0] + 1, h[1] + ok];
      rows.push(['p' + p, rows.length, 'G' + g, ok ? 'G' + g : 'X', ok, 'quiz', f]);
    }
  }
  return rows;
}

test('photo memory: buckets of the player history with a photo, the mean offset of a question, a served estimate or the prior', () => {
  assert.deepStrictEqual(
    [undefined, [0, 0], [1, 0], [3, 0], [1, 1], [4, 1], [2, 2], [9, 5]].map(memBucket),
    [0, 0, 1, 1, 2, 2, 3, 3],
    'new, shown never right, right once, right twice or more'
  );
  // The prior is the old fixed rule (a new photo 0.5 harder, right twice 1 easier) as offsets from a new photo.
  assert.deepStrictEqual(MEM.PRIOR, [0, -0.5, -0.5, -1.5]);
  const mem = [0, -0.4, -1.2, -2];
  assert.strictEqual(memFam([], mem), 0);
  assert.strictEqual(memFam([undefined, [1, 1]], mem), -0.6, 'a colony and a close-up: the mean of their offsets');
  assert.strictEqual(
    memFam(
      [
        [2, 2],
        [2, 2]
      ],
      mem
    ),
    -2
  );
  assert.deepStrictEqual(memOf(mem), mem);
  assert.notStrictEqual(memOf(mem), mem, 'a copy');
  assert.deepStrictEqual(memOf(undefined), MEM.PRIOR, 'an older sheet: the prior');
  assert.deepStrictEqual(memOf([0, 'x', 1, 2]), MEM.PRIOR);
  assert.deepStrictEqual(memOf([0, 1]), MEM.PRIOR);
});

test('photo memory: estimated from the trusted answers, shrunk to the prior while they are few', () => {
  assert.deepStrictEqual(photoMemOf([]), {mem: MEM.PRIOR, memn: [0, 0, 0, 0]}, 'no answers: the prior');
  // A real memory (right once 1.5 easier than new, twice 2): the estimate goes most of the way from the prior.
  const real = photoMemOf(memLog([0, -0.4, -1.5, -2])).mem;
  assert.ok(real[2] < -1.1 && real[2] > -1.9, `right once ${real[2]}`);
  assert.ok(real[3] < -1.6 && real[3] > -2.4, `right twice ${real[3]}`);
  assert.ok(real[3] < real[2] && real[2] < real[1], `ordered ${real}`);
  // No memory at all: right once falls back near 0, far from the prior's -0.5 and from the memory case.
  const none = photoMemOf(memLog([0, 0, 0, 0])).mem;
  assert.ok(Math.abs(none[2]) < 0.3, `right once without memory ${none[2]}`);
  assert.ok(none[3] > -0.8, `right twice without memory ${none[3]}`);
  // Few answers in a bucket: close to the prior (a few hundred answers, right twice almost never reached).
  const few = photoMemOf(memLog([0, -0.4, -1.5, -2], 300)),
    n3 = few.memn[3];
  assert.ok(n3 < 10, `answers right twice ${n3}`);
  assert.ok(Math.abs(few.mem[3] - MEM.PRIOR[3]) < 0.3, `right twice with ${n3} answers: ${few.mem[3]}`);
  // Players at chance (not trusted) move nothing: their answers are left out of the estimate, as of the photos.
  const bot = Array.from({length: 60}, (_, i) => ['Bot', i, 'G0', 'X', i % 4 === 0 ? 1 : 0, 'quiz', 'g0-' + (i % 3)]);
  assert.deepStrictEqual(photoMemOf(bot), {mem: MEM.PRIOR, memn: [0, 0, 0, 0]});
});

test('memRecalc: progress saved before the photo memory is corrected once, never raised, learned genera left alone, BKT-era learned dropped', () => {
  const mem = [0, -0.44, -1.1, -1.7],
    rec = () => ({ok: 20, ko: 4, h: '1111011111', pg: 0.7, ps: {a: [4, 3], b: [3, 0], c: [1, 1], d: [1, 0]}});
  const s = rec();
  assert.strictEqual(memRecalc(s, mem), true);
  // Right answers: a 3 in 4 shows (3/4 of one on its first show, the rest repeats right twice or more, x 0.838), c 1 in 1
  // (its first show); b, never right, and d, missed once, weigh nothing either way.
  const e = x => 0.25 + 0.75 / (1 + Math.exp(-x)),
    f = (0.75 + 2.25 * (e(1) / e(2.7)) + 1) / 4;
  assert.strictEqual(s.pg, Math.round(((f * 0.7) / (f * 0.7 + 0.3)) * 1e4) / 1e4);
  assert.ok(s.pg < 0.7 && s.pg > 0.66, `${s.pg}`);
  assert.strictEqual(s.pm, 1);
  // Once: a second call (another load, a pull of the same record) changes nothing.
  const once = s.pg;
  assert.strictEqual(memRecalc(s, mem), false);
  assert.strictEqual(s.pg, once);
  // Photos all new (no repeat): marked, unchanged. A learned genus: marked, unchanged. Old BKT record: marked only.
  const fresh = {ok: 3, ko: 0, pg: 0.5, ps: {a: [1, 1], b: [1, 1]}},
    learned = {...rec(), mx: 1},
    old = {ok: 3, ko: 1, h: '1101', L: 0.4};
  [fresh, learned, old].forEach(x => assert.strictEqual(memRecalc(x, mem), true));
  assert.deepStrictEqual([fresh.pg, learned.pg, old.pg], [0.5, 0.7, undefined]);
  assert.ok(fresh.pm && learned.pm && old.pm);
  assert.strictEqual(memRecalc(null, mem), false);
  // Learned under BKT (no s.pg beside s.mx): the mark and any exam in course go, at every call, even on a record already
  // marked (a copy pulled from another device); the bar falls back to the record's own (pgOf from s.h).
  const bkt = {ok: 13, ko: 1, h: '1111111110', L: 0.9997, mx: 1, ex: {k: 2, v: [], at: 0}},
    pulled = {ok: 11, ko: 0, h: '1111111111', L: 0.9996, mx: 1, pm: 1};
  assert.strictEqual(memRecalc(bkt, mem), true);
  assert.deepStrictEqual([bkt.mx, bkt.ex, bkt.pm], [undefined, undefined, 1]);
  assert.ok(scoreOf(bkt) < 0.95, `${scoreOf(bkt)}`);
  assert.strictEqual(memRecalc(pulled, mem), true);
  assert.strictEqual(pulled.mx, undefined);
  assert.strictEqual(memRecalc(pulled, mem), false, 'nothing left to change');
  // Learned since (s.pg kept beside s.mx): left alone.
  const now = {ok: 30, ko: 2, pg: 0.82, mx: 1762150000000, pm: 1};
  assert.strictEqual(memRecalc(now, mem), false);
  assert.strictEqual(now.mx, 1762150000000);
});

test('mergeProgress and mergeUsers: the photo memory mark travels with the progress it marks', () => {
  const mem = [0, -0.44, -1.1, -1.7],
    base = {A: {ok: 20, ko: 4, h: '1111011111', pg: 0.7, ps: {a: [4, 3], b: [3, 0]}}},
    here = JSON.parse(JSON.stringify(base));
  memRecalc(here.A, mem);
  // Recalculated on this device, nothing else played: this device's record wins, mark and corrected pg together.
  const m1 = mergeProgress(base, here, JSON.parse(JSON.stringify(base)));
  assert.deepStrictEqual([m1.A.pg, m1.A.pm], [here.A.pg, 1]);
  // Recalculated on another device (the sheet's copy): taken with its mark, so this device does not correct it again.
  const m2 = mergeProgress(base, JSON.parse(JSON.stringify(base)), here);
  assert.deepStrictEqual([m2.A.pg, m2.A.pm], [here.A.pg, 1]);
  assert.strictEqual(memRecalc(m2.A, mem), false);
  // Recalculated here only, while another device played on (Codex review #387): its model wins, a passed exam
  // included, and the recalculation is left to memRecalc, which applies to it after the merge.
  const far = {A: {...JSON.parse(JSON.stringify(base.A)), ok: 30, h: '1111111111', pg: 0.95, mx: 1}},
    m3 = mergeProgress(base, here, far);
  assert.deepStrictEqual([m3.A.ok, m3.A.pg, m3.A.mx, m3.A.pm], [30, 0.95, 1, undefined]);
  // Two accounts merged in the admin: the mark comes from the account the progress comes from.
  const U = (P, extra = {}) => ({'reefid-sync-coral-progress': JSON.stringify(P), ...extra});
  const big = {A: {ok: 40, ko: 4, pg: 0.8}},
    small = {A: {ok: 2, ko: 0, pg: 0.3, pm: 1}},
    mu = JSON.parse(mergeUsers(U(small), U(big))['reefid-sync-coral-progress']);
  assert.strictEqual(mu.A.pg, 0.8);
  assert.strictEqual(mu.A.pm, undefined, 'the busier account was not recalculated yet');
});

test('photos from R2: the R2 address made local again, an element pointed at the site (Photos out of the repo, step 2)', () => {
  assert.match(PHOTO_BASE, /^https:\/\/[^/]+\/$/, 'an https base ending with /, the img/ path after it');
  const R = PHOTO_BASE + 'img/acropora-wide-1';
  assert.strictEqual(photoLocal(R + '-s.webp?c=0_0_1_1.2'), 'img/acropora-wide-1-s.webp?c=0_0_1_1.2');
  assert.strictEqual(photoLocal(`${R}-s.webp 480w, ${R}-m.webp 960w`), 'img/acropora-wide-1-s.webp 480w, img/acropora-wide-1-m.webp 960w');
  const inat = 'https://inaturalist-open-data.s3.amazonaws.com/photos/1/medium.jpg';
  assert.strictEqual(photoLocal(inat), inat, 'an iNaturalist photo is left alone');
  const mk = a => ({a, getAttribute: k => (k in a ? a[k] : null), setAttribute: (k, v) => (a[k] = v)}); // an element's attributes
  // No record (no look, or a photo with no online original): the same files on the site.
  const i = mk({src: R + '-m.webp', srcset: `${R}-s.webp 480w, ${R}-m.webp 960w`, 'data-lo': R + '-s.webp', alt: 'x'});
  assert.strictEqual(photoFallback(i), true);
  assert.deepStrictEqual(i.a, {
    src: 'img/acropora-wide-1-m.webp',
    srcset: 'img/acropora-wide-1-s.webp 480w, img/acropora-wide-1-m.webp 960w',
    'data-lo': 'img/acropora-wide-1-s.webp',
    alt: 'x'
  });
  const f = mk({style: `--qbg:url('${R}-s.webp')`});
  assert.strictEqual(photoFallback(f), true);
  assert.strictEqual(f.a.style, "--qbg:url('img/acropora-wide-1-s.webp')");
  assert.strictEqual(photoFallback(mk({src: inat})), false, 'nothing to do on a photo not from R2');
  assert.strictEqual(photoFallback(null), false);
});

// Photos out of the repo, step 1 of Pierre's rule of 2026-11-05: when R2 fails, a photo with an online original
// (iNaturalist, Pierre's own iNaturalist photos, FishBase) falls back to that original at a light size, never to img/;
// a photo with none (IMR lecture photos, Coral Finder book scans, drawings) to the site's img/.
test('photo fallback: the online original at a light size for an iNaturalist / FishBase photo, img/ for an IMR one', () => {
  const D = {
    gen: {
      Acropora: {
        views: {
          wide: [
            {f: 'acropora-wide-1', src: 'https://inaturalist-open-data.s3.amazonaws.com/photos/1/original.jpg'},
            {f: 'acropora-wide-2', src: 'https://inaturalist-open-data.s3.amazonaws.com/photos/2/original.png', cr: [0.1, 0.2, 0.9, 1]}
          ]
        }
      }
    },
    course: {Acropora: [{f: 'imr-p15_i4', imr: true, slide: 20}]},
    fish: [{f: 'fbHachl_m0', src: 'https://www.fishbase.se/images/species/Hachl_m0.jpg'}]
  };
  const idx = photoIndex(D),
    look = f => idx.f.get(f),
    iN = (id, sz, ext = 'jpg') => `https://inaturalist-open-data.s3.amazonaws.com/photos/${id}/${sz}.${ext}`;
  // iNaturalist: small (240 px) for the 240 px file, medium (500 px) for 480, large (1024 px) for 960 and 1600: never
  // the original (up to 2048 px, often several MB).
  assert.strictEqual(photoOnline(iN(1, 'original'), 't'), iN(1, 'small'));
  assert.strictEqual(photoOnline(iN(1, 'original'), 's'), iN(1, 'medium'));
  assert.strictEqual(photoOnline(iN(1, 'original'), 'm'), iN(1, 'large'));
  assert.strictEqual(photoOnline(iN(1, 'original'), ''), iN(1, 'large'));
  // FishBase serves one file per photo: as it is.
  assert.strictEqual(photoOnline(D.fish[0].src, 's'), D.fish[0].src);
  // The file an R2 or site address names.
  assert.deepStrictEqual(photoFileOf(PHOTO_BASE + 'img/acropora-wide-2-m.webp?c=0.1_0.2_0.9_1'), {f: 'acropora-wide-2', size: 'm'});
  assert.deepStrictEqual(photoFileOf('img/imr-p15_i4.webp'), {f: 'imr-p15_i4', size: ''});
  assert.deepStrictEqual(photoFileOf('http://127.0.0.1:8000/img/acropora-wide-1-t.webp#r1'), {f: 'acropora-wide-1', size: 't'});
  assert.strictEqual(photoFileOf(iN(1, 'medium')), null);
  // The chain picks the online original for an iNaturalist photo and a FishBase one, img/ for an IMR one.
  assert.strictEqual(photoAway(PHOTO_BASE + 'img/acropora-wide-1-s.webp', look), iN(1, 'medium'));
  assert.strictEqual(photoAway(PHOTO_BASE + 'img/acropora-wide-2-m.webp?c=0.1_0.2_0.9_1', look), iN(2, 'large', 'png'));
  assert.strictEqual(photoAway(PHOTO_BASE + 'img/fbHachl_m0-s.webp', look), D.fish[0].src);
  assert.strictEqual(photoAway(PHOTO_BASE + 'img/imr-p15_i4-m.webp', look), 'img/imr-p15_i4-m.webp');
  assert.strictEqual(photoAway('img/acropora-wide-1.webp', look), iN(1, 'large'), 'a site address of an online photo too');
  assert.strictEqual(photoAway(iN(1, 'medium'), look), iN(1, 'medium'), 'an online address is left alone');
  // An element: src, srcset, its 480 px fallback (data-lo) and a backdrop all move; keepLo (under the service worker,
  // which keeps photos offline under R2's address) leaves data-lo on R2.
  const mk = a => ({a, getAttribute: k => (k in a ? a[k] : null), setAttribute: (k, v) => (a[k] = v)});
  const R = PHOTO_BASE + 'img/acropora-wide-1';
  const el = mk({src: R + '-m.webp', srcset: `${R}-s.webp 480w, ${R}-m.webp 960w, ${R}.webp 1600w`, 'data-lo': R + '-s.webp'});
  assert.strictEqual(photoFallback(el, look), true);
  assert.deepStrictEqual(el.a, {
    src: iN(1, 'large'),
    srcset: `${iN(1, 'medium')} 480w, ${iN(1, 'large')} 960w, ${iN(1, 'large')} 1600w`,
    'data-lo': iN(1, 'medium')
  });
  const kept = mk({src: R + '-m.webp', 'data-lo': R + '-s.webp'});
  photoFallback(kept, look, true);
  assert.deepStrictEqual(kept.a, {src: iN(1, 'large'), 'data-lo': R + '-s.webp'});
  const imr = mk({src: PHOTO_BASE + 'img/imr-p15_i4-m.webp', 'data-lo': PHOTO_BASE + 'img/imr-p15_i4-s.webp'});
  photoFallback(imr, look);
  assert.deepStrictEqual(imr.a, {src: 'img/imr-p15_i4-m.webp', 'data-lo': 'img/imr-p15_i4-s.webp'});
  const fig = mk({style: `--qbg:url('${R}-s.webp')`});
  photoFallback(fig, look);
  assert.strictEqual(fig.a.style, `--qbg:url('${iN(1, 'medium')}')`);
  // The crop baked into the site's file (data.json cr, tools/fetch_approved.py) drawn on the original: object-view-box
  // inset(top right bottom left), as the admin's crop preview; none for an uncropped photo or a site address.
  assert.strictEqual(photoCropOf(iN(2, 'large', 'png'), idx), 'inset(20% 10% 0% 10%)');
  assert.strictEqual(photoCropOf(iN(2, 'medium', 'png') + '#r1', idx), 'inset(20% 10% 0% 10%)');
  assert.strictEqual(photoCropOf(iN(1, 'large'), idx), '');
  assert.strictEqual(photoCropOf('img/acropora-wide-2-m.webp', idx), '');
  // A photo still remote (r: 1: a candidate just added, never downloaded) is shown whole already: no crop drawn.
  const rem = photoIndex({p: [{f: 'x', r: 1, src: iN(3, 'original'), cr: [0, 0, 0.5, 0.5]}]});
  assert.strictEqual(photoCropOf(iN(3, 'large'), rem), '');
});

test('typed answers: spelling tolerance, old names, a word that is no genus, two genera as close', () => {
  const {TYPE, typeDist, typeNorm, typeNamesOf, typeMatchIn} = require('../core.js'),
    D = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'data.json'), 'utf8')),
    G = {...D.gen, ...((D.x || {}).gen || {})},
    names = typeNamesOf(Object.keys(G), n => G[n]),
    M = t => typeMatchIn(names, t);
  assert.strictEqual(typeNorm('  Acropora sp. '), 'acropora');
  assert.strictEqual(typeNorm('Pavóna'), 'pavona');
  assert.strictEqual(typeDist('acorpora', 'acropora'), 1, 'two neighbouring letters swapped: one edit');
  assert.strictEqual(typeDist('porites', 'porites'), 0);
  assert.deepStrictEqual([TYPE.tol(6), TYPE.tol(7)], [1, 2]);
  assert.deepStrictEqual(M('Acropora'), {g: 'Acropora', old: '', exact: true});
  assert.deepStrictEqual(M('acorpora'), {g: 'Acropora', old: '', exact: false});
  assert.deepStrictEqual(M('Pocilopora'), {g: 'Pocillopora', old: '', exact: false});
  // Old names ("formerly X" in the genus's own lines), but not one that is itself a game genus.
  assert.deepStrictEqual(M('Favia'), {g: 'Dipsastraea', old: 'Favia', exact: true});
  assert.deepStrictEqual(M('Montastraea'), {g: 'Astrea', old: 'Montastraea', exact: true});
  assert.strictEqual(M('Turbinaria').g, 'Turbinaria');
  // Millepora and the bonus genera are names too.
  assert.strictEqual(M('millepora').g, 'Millepora');
  // No genus: nothing within the tolerance, or too short to say.
  assert.strictEqual(M('xyzcoral'), null);
  assert.strictEqual(M('Ac'), null);
  assert.strictEqual(M(''), null);
  // Two genera as close: the player is asked which one.
  const near = typeMatchIn(
    [
      {k: 'abcdef', g: 'Abcdef', old: ''},
      {k: 'abcdeg', g: 'Abcdeg', old: ''}
    ],
    'abcdex'
  );
  assert.deepStrictEqual(near, {near: ['Abcdef', 'Abcdeg']});
});

test('the spelling step: exact, close to the right name, close to another, nothing (typeVerdict), the letters to bold (typeDiff)', () => {
  // A player's idea, Pierre 2026-11-05: a close typo of the right genus is retyped once (quiz.js typeBind); a close typo
  // of another genus stays a wrong answer; the grading never changes.
  const {typeNamesOf, typeMatchIn, typeVerdict, typeDiff, typeNormAll} = require('../core.js'),
    D = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'data.json'), 'utf8')),
    G = {...D.gen, ...((D.x || {}).gen || {})},
    names = typeNamesOf(Object.keys(G), n => G[n]),
    V = (t, g) => typeVerdict(typeMatchIn(names, t), g);
  // Exact: the name, capitals, accents and a trailing "sp." aside; an old name typed right is exact too.
  assert.deepStrictEqual(
    [V('Pectinia', 'Pectinia'), V('  pectinia sp.', 'Pectinia'), V('Favia', 'Dipsastraea')],
    ['exact', 'exact', 'exact']
  );
  // Close to the right name: a letter wrong, left out, doubled, two swapped; an old name misspelt.
  assert.deepStrictEqual(
    ['Pectinea', 'Pactinia', 'Acropra', 'Acroppora', 'acorpora', 'Pocilopora'].map((t, i) =>
      V(t, ['Pectinia', 'Pectinia', 'Acropora', 'Acropora', 'Acropora', 'Pocillopora'][i])
    ),
    ['close', 'close', 'close', 'close', 'close', 'close']
  );
  assert.strictEqual(V('Favai', 'Dipsastraea'), 'close');
  // Close to (or exactly) another genus: wrong, never "close".
  assert.deepStrictEqual([V('Pavonna', 'Pectinia'), V('Anacropra', 'Acropora'), V('Echinopora', 'Pectinia')], ['other', 'other', 'other']);
  // Nothing within the tolerance, or two names as close: no answer.
  assert.strictEqual(V('xyzcoral', 'Pectinia'), 'none');
  assert.strictEqual(typeVerdict({near: ['Abcdef', 'Abcdeg']}, 'Abcdef'), 'none');
  assert.strictEqual(typeVerdict(null, 'Abcdef'), 'none');
  // The letters of the right spelling that the try got wrong: a wrong letter, one left out, a swap (both), one doubled
  // (the letter where it went in); spaces never; nothing when exact.
  assert.deepStrictEqual(typeDiff('Pactinia', 'Pectinia'), [1]);
  assert.deepStrictEqual(typeDiff('Pectinea', 'Pectinia'), [6]);
  assert.deepStrictEqual(typeDiff('Acropra', 'Acropora'), [5]);
  assert.deepStrictEqual(typeDiff('Acorpora', 'Acropora'), [2, 3]);
  assert.deepStrictEqual(typeDiff('Acroppora', 'Acropora'), [4]);
  assert.deepStrictEqual(typeDiff('acropora', 'Acropora'), []);
  assert.deepStrictEqual(typeDiff('', 'Pavona'), [0, 1, 2, 3, 4, 5], 'the retype skipped against an empty try: every letter');
  // Fish names: whole names, read with typeNormAll, the space never marked.
  assert.deepStrictEqual(typeDiff('Morish Idol', 'Moorish Idol', typeNormAll), [1], 'an o left out: one of the two o');
  assert.deepStrictEqual(typeDiff('Moorish Idoll', 'Moorish Idol', typeNormAll), [11]);
});

test('typed share: none below its start, a straight line between the points, flat after the last', () => {
  const {typedShare} = require('../core.js'),
    T = {
      from: 0.5,
      at: [
        [0.5, 0],
        [0.8, 0.3],
        [0.95, 0.5]
      ]
    },
    S = x => Math.round(typedShare(x, T) * 1000) / 1000;
  assert.deepStrictEqual([S(0), S(0.3), S(0.49), S(0.5), S(0.65), S(0.8), S(0.875), S(0.95), S(1)], [0, 0, 0, 0, 0.15, 0.3, 0.4, 0.5, 0.5]);
  assert.strictEqual(typedShare(0.7, {from: 0.75, at: [[0.5, 0.2]]}), 0, 'under from: never typed');
  assert.strictEqual(typedShare(NaN, T), 0);
});

test('a typed answer (quiz|t) has no guess rate, in core.js and in the sheet (v27)', () => {
  const {guessOf} = require('../core.js');
  assert.strictEqual(guessOf('quiz|t', ''), 0);
  assert.strictEqual(guessOf('quiz|t|x', ''), 0);
  assert.strictEqual(guessOf('quiz|k2', ''), 0.5);
  assert.strictEqual(guessOf('quiz', ''), 0.25);
  // A right typed answer was less likely than a right pick of 1 in 4 (no guess): it says more, the photo moves more.
  const past = Array.from({length: 12}, (_, i) => ['Ana', 0, 'Porites', 'Porites', 1, 'quiz', 'porites-' + i]),
    E = m => eloOf([...past, ['Ana', 1, 'Acropora', 'Acropora', 1, m, 'acropora-1']])['acropora-1'][0];
  assert.ok(E('quiz|t') < E('quiz'));
  // The sheet rates it the same way.
  const s = loadCodeGs();
  let n = 0;
  for (let i = 0; i < 30; i++)
    s.post({
      name: 'Ana',
      pin: '1234',
      data: {},
      summary: {},
      answers: [
        {
          id: 't' + n++,
          t: new Date(Date.UTC(2026, 10, 3, 0, 0, n)).toISOString(),
          g: 'Acropora',
          a: i % 4 ? 'Acropora' : i % 8 ? 'Porites' : '',
          ok: i % 4 ? 1 : 0,
          m: ['quiz|t', 'quiz', 'quiz|t|x', 'quiz|k3'][i % 4],
          ch: i % 2 ? 'Acropora Porites Favites Montipora' : '',
          ph: ['acropora-1', 'acropora-2', 'porites-1'][i % 3]
        }
      ]
    });
  const rows = s.post({readAnswers: 1, token: 'ghp_write000000000000000000'}).rows;
  assert.deepStrictEqual(eloOf(rows), s.get({stats: '1'}).photos);
});

// Admin Photo stats › Overview: quantiles linear between neighbours, the spread of a list (median, middle half, range, mean).
test('quantile and distOf: median and spread', () => {
  const {quantile, distOf} = require('../core.js');
  assert.strictEqual(quantile([], 0.5), null);
  assert.strictEqual(quantile([7], 0.25), 7);
  assert.strictEqual(quantile([1, 2, 3, 4], 0.5), 2.5);
  assert.strictEqual(quantile([1, 2, 3, 4], 0.25), 1.75);
  assert.strictEqual(quantile([1, 2, 3, 4], 0.75), 3.25);
  assert.strictEqual(quantile([1, 2, 3, 4, 5], 0.5), 3);
  assert.strictEqual(quantile([1, 2, 3], 0), 1);
  assert.strictEqual(quantile([1, 2, 3], 1), 3);
  // Unsorted input with a duplicate and a value that is not a number: sorted, the non-number left out, input untouched.
  const L = [10, 0, 4, 4, NaN, 'x', 2];
  assert.deepStrictEqual(distOf(L), {n: 5, sum: 20, mean: 4, min: 0, p25: 2, med: 4, p75: 4, max: 10});
  assert.strictEqual(L[0], 10);
  assert.deepStrictEqual(distOf([]), {n: 0, sum: 0, mean: null, min: null, p25: null, med: null, p75: null, max: null});
  // Against a brute-force definition on random lists: the median splits the list in two halves of equal size.
  for (let k = 1; k < 40; k++) {
    const a = Array.from({length: k}, (_, i) => (i * 7919) % 23),
      s = a.slice().sort((x, y) => x - y),
      d = distOf(a),
      m = k % 2 ? s[(k - 1) / 2] : (s[k / 2 - 1] + s[k / 2]) / 2;
    assert.strictEqual(d.med, m);
    assert.ok(d.p25 <= d.med && d.med <= d.p75 && d.min <= d.p25 && d.p75 <= d.max);
  }
});

// The rename to IMR Reef ID (2026-11-03): the old storage keys move to their new names at start-up (migrateKeys), the
// sheet's and progress files' old names are read as new (keysIn), and the sheet gets old-name copies (withLegacy).
// rename-app: keep-begin
const {KEYS, LEGACY_KEYS, keyRename, keyLegacy, migrateKeys, keysIn, withLegacy, ORG} = require('../core.js');
// A Storage (localStorage, sessionStorage) in memory, with the same methods and order of keys.
const fakeStorage = (init = {}, full = () => false) => {
  const m = new Map(Object.entries(init));
  return {
    get length() {
      return m.size;
    },
    key: i => [...m.keys()][i] ?? null,
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem(k, v) {
      if (full(k)) throw new Error('QuotaExceededError');
      m.set(k, String(v));
    },
    removeItem: k => m.delete(k),
    dump: () => Object.fromEntries(m)
  };
};

test('rename: the key table (travelling keys keep travelling, device keys stay on the device)', () => {
  assert.strictEqual(keyRename('imr-coral-progress'), 'reefid-sync-coral-progress');
  assert.strictEqual(keyRename('imr-coral-quiz'), 'reefid-sync-coral-quiz');
  assert.strictEqual(keyRename('imr-coral-intro'), 'reefid-sync-coral-intro');
  assert.strictEqual(keyRename('imr-coral-intro-offer'), 'reefid-sync-coral-intro-offer');
  assert.strictEqual(keyRename('imr-coral-reset'), 'reefid-sync-coral-reset');
  assert.strictEqual(keyRename('imr-coral-ach'), 'reefid-sync-ach');
  assert.strictEqual(keyRename('imr-coral-theme'), 'reefid-sync-theme');
  assert.strictEqual(keyRename('imr-coral-sync'), 'reefid-account', 'the sign-in record never travels');
  assert.strictEqual(keyRename('imr-coral-loaded'), 'reefid-loaded');
  assert.strictEqual(keyRename('imr-admin-vault'), 'reefid-admin-vault');
  assert.strictEqual(keyRename('imr-tour'), 'reefid-tour');
  ['reefid-tour', 'reefid-sync-coral-progress', 'demo:imr-admin-vault', 'test-sheet-log', 'imr'].forEach(k =>
    assert.strictEqual(keyRename(k), null, k)
  );
  // Every old travelling key still travels, every other one stays on the device; and back for the sheet copies.
  LEGACY_KEYS.forEach(([o, n]) => {
    const k = o.endsWith('-') ? o + 'x' : o,
      nk = keyRename(k);
    assert.strictEqual(nk.startsWith(KEYS.SYNC), k.startsWith('imr-coral-') && !['imr-coral-sync', 'imr-coral-loaded'].includes(k), k);
    assert.ok(nk.startsWith(KEYS.APP), k);
    assert.strictEqual(keyLegacy(nk), nk.startsWith(KEYS.SYNC) ? k : null, k);
  });
  // The app's name is ORG.app everywhere it is written outside the code: the page title and the installed app's name.
  const fs = require('fs'),
    path = require('path'),
    html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8'),
    man = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.webmanifest'), 'utf8'));
  assert.strictEqual(/<title>([^<]*)<\/title>/.exec(html)[1], ORG.app);
  assert.deepStrictEqual([man.name, man.short_name], [ORG.app, ORG.appShort]);
  assert.ok(!/imr/i.test(KEYS.APP + KEYS.SYNC), 'the keys do not name the organisation');
});

test('rename: migrateKeys moves an old key, keeps a new one, leaves the rest', () => {
  // Old only: moved.
  const a = fakeStorage({'imr-coral-progress': '{"Porites":{"ok":3}}', 'imr-coral-sync': '{"name":"Ana"}', 'imr-tour': '"done"'});
  assert.deepStrictEqual(migrateKeys(a).sort(), ['imr-coral-progress', 'imr-coral-sync', 'imr-tour']);
  assert.deepStrictEqual(a.dump(), {
    'reefid-sync-coral-progress': '{"Porites":{"ok":3}}',
    'reefid-account': '{"name":"Ana"}',
    'reefid-tour': '"done"'
  });
  // Both: the new one is kept, the old one goes.
  const b = fakeStorage({'imr-coral-progress': 'old', 'reefid-sync-coral-progress': 'new'});
  migrateKeys(b);
  assert.deepStrictEqual(b.dump(), {'reefid-sync-coral-progress': 'new'});
  // None: nothing moves, other keys (a test's, the admin demo's) are left alone.
  const c = fakeStorage({'reefid-sync-coral-progress': 'p', 'test-own': '1', 'demo:imr-admin-vault': 'x'});
  assert.deepStrictEqual(migrateKeys(c), []);
  assert.deepStrictEqual(c.dump(), {'reefid-sync-coral-progress': 'p', 'test-own': '1', 'demo:imr-admin-vault': 'x'});
  // Again: nothing more to do.
  assert.deepStrictEqual(migrateKeys(a), []);
  // A key that cannot be written (storage full) stays under its old name, to be moved at the next start.
  const d = fakeStorage({'imr-coral-progress': 'big', 'imr-coral-theme': '"dark"'}, k => k === 'reefid-sync-coral-progress');
  assert.deepStrictEqual(migrateKeys(d), ['imr-coral-theme']);
  assert.deepStrictEqual(d.dump(), {'imr-coral-progress': 'big', 'reefid-sync-theme': '"dark"'});
});

test('rename: what travels includes a record whose move is pending, the new name winning (travelData; Codex review #439)', () => {
  const {travelData} = require('../core.js');
  // The progress could not be moved (storage full): a save or a backup still carries it, under its new name.
  const d = fakeStorage(
    {'imr-coral-progress': 'P', 'reefid-sync-theme': '"dark"', 'imr-coral-sync': '{"name":"Ana"}', 'reefid-tour': '"done"'},
    k => k === 'reefid-sync-coral-progress'
  );
  migrateKeys(d);
  assert.deepStrictEqual(travelData(d), {'reefid-sync-coral-progress': 'P', 'reefid-sync-theme': '"dark"'});
  // Both names: the new one wins; device keys (the sign-in record, the tour) never travel.
  assert.deepStrictEqual(travelData(fakeStorage({'imr-coral-quiz': 'old', 'reefid-sync-coral-quiz': 'new', 'reefid-account': '{}'})), {
    'reefid-sync-coral-quiz': 'new'
  });
});

test('rename: sign-out removes a key under its old name too (withOldNames; Codex review #439)', () => {
  const {withOldNames} = require('../core.js');
  const L = withOldNames(['reefid-account', 'reefid-sync-coral-progress', 'reefid-hold', 'reefid-sync-fish-progress']);
  ['reefid-account', 'imr-coral-sync', 'reefid-sync-coral-progress', 'imr-coral-progress', 'reefid-hold', 'imr-hold'].forEach(k =>
    assert.ok(L.includes(k), k)
  );
  // A sign-in record left under its old name by a migration that could not write it is gone after sign-out.
  const d = fakeStorage({'imr-coral-sync': '{"name":"Ana"}', 'imr-coral-progress': 'P'}, k => k.startsWith('reefid-'));
  migrateKeys(d);
  withOldNames(['reefid-account', 'reefid-sync-coral-progress']).forEach(k => d.removeItem(k));
  assert.deepStrictEqual(d.dump(), {});
});

test('rename: a key the migration could not write is still read under its old name (keyGet; Codex review #439)', () => {
  const {keyGet, keyBefore} = require('../core.js');
  // Storage full: the progress stays under its old name; the app reads it there, so the player's progress is not empty.
  const d = fakeStorage({'imr-coral-progress': '{"Porites":{"ok":3}}'}, k => k === 'reefid-sync-coral-progress');
  migrateKeys(d);
  assert.strictEqual(d.getItem('reefid-sync-coral-progress'), null);
  assert.strictEqual(keyGet(d, 'reefid-sync-coral-progress'), '{"Porites":{"ok":3}}');
  // The new name wins once it exists (written later, or moved at the next start); a key with no old name reads as before.
  const e = fakeStorage({'imr-coral-progress': 'old', 'reefid-sync-coral-progress': 'new', 'imr-tour': '"done"'});
  assert.strictEqual(keyGet(e, 'reefid-sync-coral-progress'), 'new');
  assert.strictEqual(keyGet(e, 'reefid-tour'), '"done"');
  assert.strictEqual(keyGet(e, 'reefid-sync-coral-quiz'), null);
  assert.strictEqual(keyGet(e, 'demo:reefid-admin-vault'), null);
  // keyBefore is keyRename's reverse on every key of the table.
  LEGACY_KEYS.forEach(([o, n]) => {
    const k = o.endsWith('-') ? o + 'x' : o;
    assert.strictEqual(keyBefore(keyRename(k)), k, k);
  });
});

test('rename: data from the sheet or a file is read with the new names; the sheet gets old-name copies', () => {
  // An app from before the rename saved it.
  assert.deepStrictEqual(keysIn({'imr-coral-progress': 'p', 'imr-coral-ach': 'a', 'imr-coral-intro': 'i'}), {
    'reefid-sync-coral-progress': 'p',
    'reefid-sync-ach': 'a',
    'reefid-sync-coral-intro': 'i'
  });
  // Both names: the new one wins.
  assert.deepStrictEqual(keysIn({'imr-coral-progress': 'old', 'reefid-sync-coral-progress': 'new'}), {'reefid-sync-coral-progress': 'new'});
  assert.deepStrictEqual(keysIn(null), {});
  // Sent: the new names, and the old ones for an app from before the rename on another device of the player.
  const sent = withLegacy({'reefid-sync-coral-progress': 'p', 'reefid-sync-ach': 'a'});
  assert.deepStrictEqual(sent, {
    'reefid-sync-coral-progress': 'p',
    'reefid-sync-ach': 'a',
    'imr-coral-progress': 'p',
    'imr-coral-ach': 'a'
  });
  // Read back by the renamed app: the same as what it sent.
  assert.deepStrictEqual(keysIn(sent), {'reefid-sync-coral-progress': 'p', 'reefid-sync-ach': 'a'});
  // The account merge (admin) reads either.
  const m = mergeUsers(keysIn({'imr-coral-progress': JSON.stringify({Porites: {ok: 2, ko: 0}})}), {
    'reefid-sync-coral-progress': JSON.stringify({Porites: {ok: 1, ko: 1}})
  });
  assert.strictEqual(JSON.parse(m['reefid-sync-coral-progress']).Porites.ok, 3);
});
// rename-app: keep-end

// Codex review #428 (P2): the admin's account merge takes the union of the two first-launch histories, so the replay
// after the merge applies each account's answers' priors (know@100 merged into imr@300: know's at 200).
test('mergeUsers merges the first-launch histories (Codex review #428)', () => {
  const C = require('../core.js');
  const K = C.startKey('coral'),
    A = {[K]: JSON.stringify({c: 'know', t: 100, at: 0, via: 'tour', w: [], fb: {}, h: [['know', 0, 100, 'tour']]})},
    B = {[K]: JSON.stringify({c: 'imr', t: 300, at: 0, via: 'tour', w: [], fb: {}, h: [['imr', 0, 300, 'tour']]})};
  for (const m of [C.mergeUsers(A, B), C.mergeUsers(B, A)]) {
    const o = JSON.parse(m[K]);
    assert.strictEqual(o.c, 'imr');
    assert.strictEqual(C.startPriorAt(o, 200), C.startVars('know').p);
    assert.strictEqual(C.startPriorAt(o, 300), C.startVars('imr').p);
  }
});
