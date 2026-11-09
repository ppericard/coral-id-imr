'use strict';
// Health › Photos everyone misses counts players, not answers (Pierre, 2026-11-05): admin.js photoAnswers, missedBy,
// manyMiss and everyoneMisses (between `// everyone: begin` / `end`), the one rule Health, To do's Health line, the
// session summary's "hard for everyone" (healthBad) and the demo data (admin-demo.js) share. Made-up rows:
// [id, time, genus shown, answered, right, mode, photos].
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  block = require('./block');
const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const src = read('admin.js');
const {photoAnswers, missedBy, manyMiss, everyoneMisses} = new Function(
  block(src, '// everyone: begin', '// everyone: end', {file: 'admin.js'}) + '\nreturn {photoAnswers, missedBy, manyMiss, everyoneMisses};'
)();
let t = 0;
const row = (id, ok, ph = 'f1') => [id, t++, 'Favia', ok ? 'Favia' : 'Favites', ok ? 1 : 0, 'quiz', ph];
const of = (R, f = 'f1') => photoAnswers(R)[f];

// The thresholds (3 players, 2 of them and a majority under 50%, 5 answers, under 40% right overall) are checked at their
// edges by the tests below; this one the 40%.
test('under 40% right overall: 3 in 8 is listed, 2 in 5 (40%) is not', () => {
  const o = of([row('a', 0), row('a', 0), row('a', 0), row('b', 0), row('b', 0), row('c', 1), row('c', 1), row('c', 1)]);
  assert.deepStrictEqual(missedBy(o), {pl: 3, miss: 2});
  assert.strictEqual(everyoneMisses(o), true, '3 right in 8');
  assert.strictEqual(everyoneMisses(of([row('a', 0), row('a', 0), row('b', 0), row('c', 1), row('c', 1)])), false, '2 right in 5');
});

test('photoAnswers: each answer once for every photo it showed, per player', () => {
  const P = photoAnswers([row('a', 0, 'f1 f2'), row('a', 1, 'f1'), row('b', 0, 'f2 f2')], f => f !== 'f3');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(P)), {
    f1: {n: 2, ok: 1, by: {a: [2, 1]}},
    f2: {n: 2, ok: 0, by: {a: [1, 0], b: [1, 0]}}
  });
  assert.strictEqual(photoAnswers([row('a', 0, 'f3')], f => f !== 'f3').f3, undefined, 'a photo the admin does not know');
});

test('one player missing the same photo many times is not everyone', () => {
  const o = of(Array.from({length: 8}, () => row('solo', 0)));
  assert.strictEqual(o.n, 8);
  assert.deepStrictEqual(missedBy(o), {pl: 1, miss: 1});
  assert.strictEqual(manyMiss(o), false);
  assert.strictEqual(everyoneMisses(o), false);
  // ... nor with two players who got it right once each: three players, but only one misses it.
  const o2 = of([...Array.from({length: 8}, () => row('solo', 0)), row('b', 1), row('c', 1)]);
  assert.deepStrictEqual(missedBy(o2), {pl: 3, miss: 1});
  assert.strictEqual(everyoneMisses(o2), false, '8 of 10 answers wrong, yet one player');
});

test('a new photo answered by one or two players only is not listed', () => {
  assert.strictEqual(everyoneMisses(of([row('a', 0)])), false);
  assert.strictEqual(everyoneMisses(of([row('a', 0), row('b', 0)])), false, 'two players: under PL_MIN');
});

test('three players mostly missing it: listed', () => {
  const o = of([row('a', 0), row('a', 0), row('b', 0), row('c', 1), row('c', 0)]);
  assert.deepStrictEqual(missedBy(o), {pl: 3, miss: 2}, 'c at 50% does not miss it (under 50% does)');
  assert.strictEqual(manyMiss(o), true);
  assert.strictEqual(everyoneMisses(o), true, '1 right in 5');
});

test('three players with one answer each is too little evidence (integrator, on the real log, 2026-11-05)', () => {
  // 2 misses in 3 answers happen by chance at the game's ~80% target: 9 of the 12 photos the player rule alone listed.
  const o = of([row('a', 0), row('b', 0), row('c', 1)]);
  assert.deepStrictEqual(missedBy(o), {pl: 3, miss: 2});
  assert.strictEqual(manyMiss(o), true);
  assert.strictEqual(everyoneMisses(o), false, '3 players, 3 answers');
  // Four answers still not enough; at five (and every player wrong) it is listed, like the 0/6 photos of the real log.
  assert.strictEqual(everyoneMisses(of([row('a', 0), row('a', 0), row('b', 0), row('c', 0)])), false, '4 answers');
  assert.strictEqual(
    everyoneMisses(of([row('a', 0), row('a', 0), row('b', 0), row('b', 0), row('c', 0), row('c', 0)])),
    true,
    '0/6, 3 players'
  );
});

test('a majority of players, and the overall share under 40%, are both needed', () => {
  // 2 of 4 players miss it: not a majority.
  const half = of([row('a', 0), row('b', 0), row('c', 1), row('d', 1)]);
  assert.deepStrictEqual(missedBy(half), {pl: 4, miss: 2});
  assert.strictEqual(manyMiss(half), false);
  // 2 of 3 players miss it, but one who gets it right answered it often: 6 right in 8, over 40%.
  const busy = of([row('a', 0), row('b', 0), ...Array.from({length: 6}, () => row('c', 1))]);
  assert.strictEqual(manyMiss(busy), true);
  assert.strictEqual(everyoneMisses(busy), false);
});

test('healthBad, the session summary and the demo all use the one rule', () => {
  const bad = block(src, 'function healthBad(R, S = ASUBJ) {', '\n}\n', {through: 1, file: 'admin.js'});
  assert.match(bad, /photoAnswers\(R,/);
  assert.match(bad, /manyMiss\(o\)/);
  assert.match(bad, /everyoneMisses\(o\)/);
  assert.doesNotMatch(bad, /o\.n >= H\.PH_MIN/, 'the answer minimum lives in everyoneMisses');
  assert.match(read('admin-journey.js'), /hardAll = ofAns\('hardAll', \(\) => new Set\(healthBad\(/);
  const demo = read('admin-demo.js');
  assert.match(demo, /everyoneMisses\(tally\(/);
  assert.match(demo, /photoAnswers\(/);
});

// Fish admin at parity (Pierre, 2026-11-08: "j'ai besoin d'avoir les outils pour pouvoir continuer d'avancer"): Stops
// follows the Corals | Fish switch. The sheets a subject's players opened: the corals' genus sheets from the summary's
// genera, the fish's from its sheet page, a visit with no fish page not a fish visit. A page name is in the corals' words
// (core.js pageName), so a fish sheet of every rank is logged fish.learn.genus: the fixture holds what is really logged.
test("Stops' sheets opened, per subject: the corals' genera, the fish's sheet pages", () => {
  const C = require('../core.js'),
    {sheetVisit, sheetsTitle, stopWord} = new Function(
      block(src, '// sheetsbysubj: begin', '// sheetsbysubj: end', {file: 'admin.js'}) + '\nreturn {sheetVisit, sheetsTitle, stopWord};'
    )(),
    [coral, fish] = [C.subjectOf('coral'), C.subjectOf('fish')];
  assert.strictEqual(sheetsTitle(coral), 'Genus sheets opened');
  assert.strictEqual(sheetsTitle(fish), 'Family, genus and species sheets opened');
  assert.strictEqual(stopWord(coral), 'Genus');
  // the fish words of its Analyses pages (SUBJECTS analyses one, "family or genus") once they exist, else its one
  assert.strictEqual(
    stopWord(fish),
    ((fish.analyses && fish.analyses.one) || fish.one).replace(/^./, c => c.toUpperCase())
  );
  assert.match(stopWord(fish), /^Family/);
  const coralVisit = {
      r: {'learn.genus': [2, 40], 'practice.quiz': [1, 300]},
      g: {Acropora: [2, 30, 'quiz', 1], Porites: [1, 10, 'list', 0]}
    },
    fishVisit = {r: {'fish.learn.genus': [3, 70], 'fish.practice.quiz': [1, 200]}, g: {}},
    fishQuiz = {r: {'fish.practice.quiz': [1, 200]}, g: {}};
  assert.deepStrictEqual(sheetVisit(coralVisit, coral), [3, 40]);
  assert.deepStrictEqual(sheetVisit(fishVisit, coral), [0, 0], 'a fish visit is a visit for the corals, as before: no genus sheet');
  assert.strictEqual(sheetVisit(coralVisit, fish), null, 'no fish page: not a fish visit');
  assert.deepStrictEqual(sheetVisit(fishVisit, fish), [3, 70]);
  assert.deepStrictEqual(sheetVisit(fishQuiz, fish), [0, 0], 'a fish visit with no sheet opened');
  // what the app logs for a fish sheet of each rank (app.js: pageName(h, SUBJ.pv)): the one name sheetVisit reads
  Object.entries(fish.sheets).forEach(([w, pre]) =>
    assert.strictEqual(C.pageName('g-' + pre + 'Xus', fish.pv), fish.pv + 'learn.genus', `a fish ${w} sheet's page name`)
  );
  assert.strictEqual(C.pageName('g-Acropora', coral.pv), 'learn.genus');
});

// Health on the fish side (fish admin at parity): the fish photos everyone misses, counted on their answers (the sheet
// rates the corals' photos only), each with its family; the fish units players are stuck on: its slate (families only,
// as core.js fishGen's c1-c3 that fishAdmin reads) and the scientific genera met in the answers (g:Chromis). The corals'
// side reads its own photos and genera as before.
test('Health per subject: the fish photos and units, the corals untouched', () => {
  const C = require('../core.js'),
    [coral, fish] = [C.subjectOf('coral'), C.subjectOf('fish')],
    E = block(src, '// everyone: begin', '// everyone: end', {file: 'admin.js'}),
    H =
      block(src, '// S: the subject whose photos they are', '\nconst healthMedian', {file: 'admin.js'}) +
      block(src, 'const healthMedian = ', '\n};\n', {file: 'admin.js', through: true});
  const run = (env, ASUBJ) =>
    new Function(...Object.keys(env), 'ASUBJ', E + H + '\nreturn {healthBad, healthGenera};')(...Object.values(env), ASUBJ);
  const env = {
    FISHA: {
      ph: {fa: {f: 'fa', entry: 'f:Damselfishes', sp: 's1'}, fb: {f: 'fb', entry: 'f:Gobies'}},
      slate: ['f:Damselfishes', 'f:Gobies']
    },
    allPhotos: () => [{f: 'ca', genus: 'Favia', view: 'wide'}],
    photoStats: () => ({}),
    nAns: s => (s ? (s[3] ?? s[1]) : 0),
    GAME: new Set(['Favia', 'Favites']),
    DRAFT: {fish: {}}
  };
  let t = 0;
  const miss = (id, g, ph) => [id, t++, g, 'x', 0, 'quiz', ph];
  // three players miss the Damselfishes photo fa every time; a coral photo ca too
  const R = ['p1', 'p2', 'p3'].flatMap(id => [
    miss(id, 'f:Damselfishes', 'fa'),
    miss(id, 'f:Damselfishes', 'fa'),
    miss(id, 'Favia', 'ca'),
    miss(id, 'Favia', 'ca')
  ]);
  // two players answer on the genus Chromis, ten misses each: stuck
  ['p1', 'p2'].forEach(id => {
    for (let i = 0; i < 10; i++) R.push(miss(id, 'g:Chromis', 'fz'));
  });
  const F = run(env, fish),
    K = run(env, coral);
  assert.deepStrictEqual(
    F.healthBad(R).map(o => [o.p.f, o.p.genus, o.n, o.pl]),
    [['fa', 'f:Damselfishes', 6, 3]],
    'the fish photo with its family; the coral photo is no fish photo'
  );
  // a fish photo handled in the draft (× excluded, Not this, Removed) leaves the list before it is cut (Codex review #800)
  for (const k of ['exclude', 'out', 'seen']) {
    env.DRAFT.fish = {[k]: {fa: k === 'out' ? 's2' : 1}};
    assert.deepStrictEqual(F.healthBad(R), [], `a photo in fish ${k}: handled`);
  }
  env.DRAFT.fish = {};
  assert.deepStrictEqual(
    K.healthBad(R).map(o => o.p.f),
    ['ca'],
    "the corals' side: its own photos"
  );
  const BY = {};
  R.forEach(r => (BY[r[0]] = BY[r[0]] || []).push(r));
  assert.deepStrictEqual(
    F.healthGenera(BY).map(g => [g.n, g.met, g.stuck]),
    [
      ['g:Chromis', 2, 2],
      ['f:Damselfishes', 3, 0],
      ['f:Gobies', 0, 0]
    ],
    'every unit of the fish slate and the genus met in the answers, the most stuck first'
  );
  assert.ok(!env.FISHA.slate.includes('g:Chromis'), 'the slate is left as it is');
  assert.deepStrictEqual(
    K.healthGenera(BY)
      .map(g => g.n)
      .sort(),
    ['Favia', 'Favites']
  );
});
