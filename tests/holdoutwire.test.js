require('./slot.js').testGuard();
// The held-out set in the game (ROADMAP "A held-out photo set"; Pierre, 2026-11-04 and 2026-11-16, Q385; the set #1023):
// core.js fishHeld, fishObs, fishPhotos held, fishGen and fishGenUnits held; model.js examSet, genusDiff; the |h log
// token on the exam's answers; the sheet's replay deciding alike (rules D8, D9). Exam only, no practice probe (Pierre,
// 2026-11-18: "Je pensais qu'on gardait des photos pour la fin").
// docs/LEARNING.md "The held-out photos in the game".
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');
const cut = require('./block.js');
const {engine} = require('./rareease.js');

const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(read(f));

test('fishObs: the observation as fish-holdout.json names it (tools/holdout.py obs_of)', () => {
  assert.strictEqual(C.fishObs({f: 'x', o: 'https://www.inaturalist.org/observations/123'}), '123');
  assert.strictEqual(C.fishObs({f: 'x', o: '123'}), '123', 'the short form, as the file has it');
  const fb = 'https://www.fishbase.se/photos/PicturesSummary.php?ID=1&what=species&pic=A_u0.jpg';
  assert.strictEqual(C.fishObs({f: 'x', o: fb}), fb, 'a FishBase page whole');
  assert.strictEqual(C.fishObs({f: 'fish-s001-cand-9'}), 'fish-s001-cand-9', 'no observation: the file');
});

test('fishHeld: the file’s observations by species, less those of a photo Pierre picked (★ cover or featured)', () => {
  const H = {held: {s1: ['10', '11', '12'], s2: ['20']}},
    game = {
      t: [
        {f: 'fish-s1-cand-100', sp: 's1', o: 'https://www.inaturalist.org/observations/10'},
        {f: 'fish-s1-cand-110', sp: 's1', o: '11'},
        {f: 'fish-s1-cand-120', sp: 's1', o: '12'},
        {f: 'fish-s2-cand-200', sp: 's2', o: '20'}
      ]
    };
  assert.deepStrictEqual([...C.fishHeld(H, game, null)].sort(), ['s1 10', 's1 11', 's1 12', 's2 20']);
  // His cover by another name of the same photo (fishPid: its reference copy) and a featured photo count as practice.
  const cur = {fish: {genera: {'f:A': {cover: 'fi100'}, 'f:B': {feat: {s1: ['fish-s1-cand-120']}}, 'f:C': null}}};
  assert.deepStrictEqual([...C.fishHeld(H, game, cur)].sort(), ['s1 11', 's2 20']);
  assert.strictEqual(C.fishHeld({}, game, cur).size, 0, 'no file: nothing held out');
  assert.strictEqual(C.fishHeld(null, game, cur).size, 0);
  // Keyed by species: the same observation id under another species is not held out.
  assert.ok(!C.fishHeld(H, game, null).has('s2 10'));
});

test('fishPhotos and fishGen: held-out photos marked ho, in the unit’s held list, never in its views or its cover', () => {
  const p = (f, sp, o, e = 3) => ({f, sp, o, src: 'x', e}),
    game = {t: [p('a', 's1', '1', 5), p('b', 's1', '2'), p('c', 's2', '3', 5), p('d', 's2', '4')]},
    F = {
      families: [{id: 'f:A', name: 'A', species: ['s1', 's2'], genera: ['g:A'], circle: 1}],
      genera: [{id: 'g:A', name: 'Ag', family: 'f:A', species: ['s1', 's2']}],
      species: [
        {id: 's1', circle: 1},
        {id: 's2', circle: 1}
      ]
    },
    held = new Set(['s1 1', 's2 3']),
    L = C.fishPhotos({}, game, null, held);
  assert.deepStrictEqual(
    L.t.map(x => [x.f, !!x.ho]),
    [
      ['a', true],
      ['b', false],
      ['c', true],
      ['d', false]
    ]
  );
  assert.ok(!game.t[0].ho, 'a copy: the file’s record untouched');
  assert.deepStrictEqual(
    C.fishPhotos({}, game, null).t.map(x => !!x.ho),
    [false, false, false, false],
    'without the set (the sheet, the admin, the tools) every photo as before'
  );
  const X = C.fishGen(F, L, {}),
    E = X.gen['f:A'];
  assert.deepStrictEqual(E.views.wide.map(x => x.f).sort(), ['b', 'd']);
  assert.deepStrictEqual(E.held.map(x => x.f).sort(), ['a', 'c']);
  assert.ok(['b', 'd'].includes(E.cover), 'the card’s photo is a practice one, though the held-out ones are easier');
  // A subject played at the genus (fishGenUnits): its genus units too.
  const G = C.fishGen(F, L, {}, 'genus').gen['g:A'];
  assert.deepStrictEqual(G.views.wide.map(x => x.f).sort(), ['b', 'd']);
  assert.deepStrictEqual(G.held.map(x => x.f).sort(), ['a', 'c']);
  // No held key without a held-out photo (the sheet's units are as before).
  assert.ok(!('held' in C.fishGen(F, C.fishPhotos({}, game, null), {}).gen['f:A']));
});

// The app's units as app.js fishBuild makes them on the real files: fishGen over fishPhotos with the set, fishGenera,
// nothing more.
let APP = null;
function appUnits() {
  if (APP) return APP;
  const Fs = ['fish.json', 'fish-photos.json', 'fish-game.json', 'curation.json'].map(json),
    S = C.subjectOf('fish'),
    ctx = {DOM: {EX: 0.9}, easyCover: C.easyCover, fishScoreTree: C.fishScoreTree, fishSpUnits: C.fishSpUnits, rankWeights: C.rankWeights};
  vm.createContext(ctx);
  vm.runInContext(
    cut(read('app.js'), 'function fishGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) + '\nthis.fishGenera = fishGenera;',
    ctx
  );
  const cur = C.treeCur(S, Fs[3]),
    gm = C.fishGameRead(Fs[2]).photos,
    H = json('fish-holdout.json'),
    held = C.fishHeld(H, gm, cur),
    build = h => ctx.fishGenera(C.fishGen(Fs[0], C.fishPhotos(Fs[1].photos, gm, cur, h), Fs[1].sheet, C.unitRankOf(S)), Fs[0]);
  return (APP = {X: build(held), X0: build(undefined), held, H, cur, gm});
}

test('the real set: no unit shows a held-out photo; each unit’s photos are its views and its held list, as before', () => {
  const {X, X0, held, H} = appUnits(),
    isHeld = p => held.has(p.sp + ' ' + C.fishObs(p));
  assert.ok(held.size > 1000 && held.size <= Object.values(H.held).flat().length, 'the set: ' + held.size);
  let nh = 0;
  Object.values(X.gen).forEach(g => {
    const wide = (g.views || {}).wide || [];
    assert.ok(!wide.some(p => p.ho || isHeld(p)), g.id + ': a held-out photo in its views');
    assert.ok(!g.cover || !(g.held || []).some(p => p.f === g.cover), g.id + ': its card photo held out');
    assert.ok(
      (g.held || []).every(p => p.ho && isHeld(p)),
      g.id
    );
    if ((g.held || []).length) nh++;
    // The same photos, withheld or not (the replay's variant table and the unit's difficulty read them whole).
    const before = new Set(((X0.gen[g.id] || {}).views || {}).wide.map(p => p.f)),
      now = new Set([...wide, ...(g.held || [])].map(p => p.f));
    assert.deepStrictEqual([...now].sort(), [...before].sort(), g.id);
  });
  assert.ok(nh > 500, 'families, genera and species with held-out photos: ' + nh);
  // The sheets' photos (X.sheet: the sheet-only photos) never come from the game list: none held out.
  assert.ok(!Object.values(X.sheet).flat().some(isHeld));
});

test('Pierre’s ★ covers and featured photos stay practice, whatever the file says', () => {
  const {X, cur, gm} = appUnits(),
    G = (cur.fish && cur.fish.genera) || {},
    picks = new Set(
      Object.values(G)
        .flatMap(k => (k ? [k.cover, ...Object.values(k.feat || {}).flat()] : []))
        .filter(Boolean)
        .map(C.fishPid)
    ),
    inPlay = Object.values(gm)
      .flat()
      .filter(p => picks.has(C.fishPid(p.f)));
  const held = new Set(
    Object.values(X.gen)
      .flatMap(g => g.held || [])
      .map(p => C.fishObs(p))
  );
  inPlay.forEach(p => assert.ok(!held.has(C.fishObs(p)), p.f + ' held out'));
  // and a pick in the file is taken out of the set
  const one = inPlay[0];
  if (one) {
    const H = {held: {[one.sp]: [C.fishObs(one)]}};
    assert.strictEqual(C.fishHeld(H, gm, cur).size, 0);
  }
});

// model.js on a fish-like unit (tests/rareease.js engine): 20 practice observations and 8 held out.
const unit = () => {
  const L = [],
    H = [];
  for (let i = 0; i < 20; i++) L.push({f: `p${i}`, o: `op${i}`, e: 1 + (i % 5)});
  for (let i = 0; i < 8; i++) H.push({f: `h${i}`, o: `oh${i}`, e: 1 + (i % 4), ho: 1});
  return {L, H};
};

test('examSet: a held-out photo never shown to this player first, the hardest; none left, today’s rule', () => {
  const {L, H} = unit(),
    E = engine('fish', L, {score: 0.9, held: H});
  for (let i = 0; i < 20; i++) {
    const p = E.examSet('u').shown[0];
    assert.ok(p.ho && /^h/.test(p.f), p.f);
  }
  // The hardest of them (photoDiff: the lowest ease).
  assert.strictEqual(E.examSet('u').shown[0].e, 1);
  // Shown on another unit (the family's exam, then the genus's): not "never shown" any more.
  const seen = Object.fromEntries(H.map(p => [p.f, [1, 1]])),
    F = engine('fish', L, {score: 0.9, held: H, others: {'f:X': {ps: seen}}}),
    q = F.examSet('u').shown[0];
  assert.ok(!q.ho, 'every held-out photo seen: today’s rule on the practice photos never shown, ' + q.f);
  // A unit with no held-out photo: today's rule, as before.
  const N = engine('fish', L, {score: 0.9});
  assert.ok(/^p/.test(N.examSet('u').shown[0].f));
});

test('photoSet never draws a held-out photo in practice (the views only)', () => {
  const {L, H} = unit(),
    E = engine('fish', L, {score: 0.9, held: H});
  for (let i = 0; i < 300; i++) assert.ok(!E.photoSet('u', null, 0, 4, 'k4').shown.some(p => p.ho));
});

test('quiz.js: no practice probe; a held-out photo (the exam’s) logged |h before |kN, |t and |x', () => {
  const quiz = read('quiz.js'),
    model = read('model.js');
  assert.match(quiz, /set = ex \|\| photoSet\(/);
  assert.ok(!/heldSet|HELD\b/.test(quiz + model), 'no silent probe (Pierre, 2026-11-18)');
  const mq = cut(quiz, '  const mq =\n', ';\n', {through: 1, file: 'quiz.js'}) + 'mq;',
    mode = o =>
      vm.runInContext(
        mq,
        vm.createContext({
          modeBase: cur => cur,
          photoQuiz: cur => cur === 'quiz',
          AUTOD: false,
          FINDX: false,
          warm: false,
          k: 4,
          nc: 4,
          tq: null,
          exq: false,
          cur: 'quiz',
          ph: [{f: 'h0', ho: 1}],
          ...o
        })
      );
  assert.strictEqual(mode({}), 'quiz|h');
  assert.strictEqual(mode({warm: true, k: 3}), 'quiz|c|h|k3');
  assert.strictEqual(mode({tq: {}, exq: true}), 'quiz|h|t|x');
  assert.strictEqual(mode({exq: true}), 'quiz|h|x');
  assert.strictEqual(mode({ph: [{f: 'p0'}]}), 'quiz', 'a practice photo: as before');
  // Read by the sheet (Code.gs guess_), the admin (core.js guessOf, fmtOf, kOf) as the same mode without it.
  const gs = read('tools/sync/Code.gs'),
    guess_ = vm.runInNewContext('(' + /const guess_ = (\([\s\S]*?\n\});/.exec(gs)[1].replace(/;$/, '') + ')');
  for (const [m, ch] of [
    ['quiz|h', 'A B C D'],
    ['quiz|c|h|k3', 'A B C D'],
    ['quiz|h|k2', 'A B'],
    ['quiz|h|t|x', ''],
    ['quiz|h|x', 'A B C D'],
    ['quiz|s|h', 'A B C D']
  ]) {
    const plain = m.replace('|h', '');
    assert.strictEqual(guess_(m, ch), guess_(plain, ch), m);
    assert.strictEqual(C.guessOf(m, ch), C.guessOf(plain, ch), m);
    assert.strictEqual(C.fmtOf(m, ch.split(' ').filter(Boolean).length), C.fmtOf(plain, ch.split(' ').filter(Boolean).length), m);
    assert.strictEqual(C.kOf(m, ch), C.kOf(plain, ch), m);
    assert.ok(/^[A-Za-z0-9:|-]*$/.test(m), 'stored as it comes (Code.gs logAnswers_)');
  }
});

test('the replay decides alike: a held-out answer (|h, |h|x) replays as the same answer without the token', () => {
  const t0 = Date.UTC(2026, 10, 18),
    gen = {'f:X': {look: ['f:Y'], fam: 'X'}, 'f:Y': {look: ['f:X'], fam: 'Y'}},
    row = (i, m, ok) =>
      C.logRow(
        {
          id: 'a' + i,
          t: new Date(t0 + i * 1000).toISOString(),
          g: 'f:X',
          a: ok ? 'f:X' : 'f:Y',
          ok,
          m,
          ph: 'h' + (i % 4),
          ch: 'f:X f:Y',
          e: 0.7,
          th: 0.5,
          sc: {d: 0.2, r: 1}
        },
        'p'
      ),
    modes = ['quiz', 'quiz|h', 'quiz|c|k3', 'quiz|h|x', 'quiz|h|t|x', 'quiz|x'],
    rows = h => modes.flatMap((m, j) => [0, 1, 2].map(k => row(j * 3 + k, h ? m : m.replace('|h', ''), (j + k) % 3 ? 1 : 0)));
  const a = C.replayProgress(rows(true), {gen}),
    b = C.replayProgress(rows(false), {gen});
  assert.deepStrictEqual(a, b);
  assert.ok(a.p.P['f:X'].ok > 0 && a.p.P['f:X'].ko > 0);
});

// Codex review #1057: learnsim's truth from hashes (--truth gen) seeds the held-out photos' difficulties too.
test('learnsim: the held-out photos get their own simulated difficulty', () => {
  const src = read('tools/learnsim.js'),
    seed = src.slice(src.indexOf('const GEN_D = {};'), src.indexOf('PSTAT = ps;'));
  assert.match(seed, /\.\.\.\(\(GX\(g\) \|\| \{\}\)\.held \|\| \[\]\)\]\.forEach\(p => \{/);
  assert.match(seed, /GEN_D\[p\.f\] = d;/);
});

test('the app loads the set for the fish only, with Home’s files, and builds its units with it', () => {
  const app = read('app.js'),
    sw = read('sw.js');
  assert.match(app, /ho: \(\) => json\('fish-holdout\.json\?v=1'\)/);
  assert.strictEqual((app.match(/json\('fish-holdout\.json/g) || []).length, 1, 'the fish’s files only (the sea slugs have none)');
  assert.match(app, /held = fishHeld\(ho, /);
  assert.match(app, /fishCurate\(fishGenera\(fishGen\(f, fishPhotos\(ph\.photos, gm\.photos, C, held\)/);
  assert.ok(sw.includes("'fish-holdout.json?v=1'"), 'offline with the shell');
  // model.js reads both lists for the unit's difficulty and the exam (the variant groups the sheet's replay reads).
  const model = read('model.js');
  assert.match(model, /\.\.\.\(\(GX\(n\) \|\| \{\}\)\.held \|\| \[\]\)\]\)\]\.filter\(p => p\.e\)/);
  assert.match(model, /\.\.\.\(v === 'wide' \? g\.held \|\| \[\] : \[\]\)/);
});
