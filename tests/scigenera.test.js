// The fish scientific genera (app.js fishGenera, sciOpen, UNITS fish sets sci; docs/FISH_PATH.md "Levels"): offered to
// everyone once a family is at Advanced, a family's genera from its Advanced (Pierre, 2026-11-08, back from Q205's Open
// Water); for a player at IMR, the genera the IMR course names alone come without the offer from their family's Open
// Water (Q219), Naso only of the surgeonfishes (Q220); a photo of another genus keeps its family as the answer (Q221).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f));
const F = json('fish.json'),
  PH = json('fish-photos.json'),
  APP = src('app.js');

// fishGenera and sciOpen as app.js has them, on the real fish.json; LV_AT as model.js has it.
const ctx = {DOM: {EX: 0.9}, easyCover: C.easyCover}; // core.js, as the app has it (the card photo, Q270)
vm.createContext(ctx);
vm.runInContext(
  [
    block(src('model.js'), 'const LV_AT = ', '\n', {through: 1, file: 'model.js'}),
    block(APP, 'function fishGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}),
    block(APP, 'function sciOpen(L, score, met, imr, hand) {', '\n}\n', {through: 1, file: 'app.js'}),
    'this.fishGenera = fishGenera; this.sciOpen = sciOpen; this.LV_AT = LV_AT;'
  ].join('\n'),
  ctx
);
const X = ctx.fishGenera(C.fishGen(F, PH.photos), F);
ctx.GX = n => X.gen[n];
const fam = n => X.gen[n].parent,
  // scores: family -> score; met: the genera already met
  plain = x => JSON.parse(JSON.stringify(x)), // out of the vm's realm, for deepStrictEqual
  open = (scores, imr, met = []) =>
    plain(
      ctx.sciOpen(
        X.sci,
        n => scores[n] || 0,
        n => met.includes(n),
        imr
      )
    );

test('the IMR genera: those an IMR sub-entry names alone, Naso alone of the surgeonfishes (Q220)', () => {
  const imrg = plain(X.sci.filter(n => X.gen[n].imrg).sort());
  assert.deepStrictEqual(imrg, ['g:Amphiprion', 'g:Chromis', 'g:Dascyllus', 'g:Heniochus', 'g:Naso', 'g:Pomacentrus']);
  ['g:Acanthurus', 'g:Ctenochaetus', 'g:Zebrasoma'].forEach(n => assert.ok(X.gen[n].imrName && !X.gen[n].imrg, n));
  // the first-meeting card: its IMR cues and slide (Anemonefish has no cues: its species, with its slide)
  assert.strictEqual(X.gen['g:Chromis'].tl, 'ID tips (IMR, Chromis, slide 8)');
  assert.strictEqual(X.gen['g:Heniochus'].tl, 'ID tips (IMR, Bannerfish, slides 13, 23)');
  assert.ok(!X.gen['g:Amphiprion'].qt && X.gen['g:Amphiprion'].tl === 'Its species here (IMR, Anemonefish, slide 22)');
  assert.strictEqual(X.gen['g:Abudefduf'].tl, 'Its species here');
});

test('everyone: a family’s genera from its Advanced, not its Open Water (Pierre, 2026-11-08)', () => {
  assert.deepStrictEqual(open({'f:Damselfishes': 0.6}, false), {auto: [], units: []});
  const o = open({'f:Damselfishes': 0.8}, false);
  assert.ok(o.units.length > 4 && o.units.every(n => fam(n) === 'f:Damselfishes') && o.units.includes('g:Chromis'));
  assert.deepStrictEqual(o.auto, []);
  // a genus already met stays in, whatever its family's score now
  assert.deepStrictEqual(open({'f:Damselfishes': 0.3}, false, ['g:Abudefduf']).units, ['g:Abudefduf']);
  // the set wired to it: units and the offer at Advanced
  const set = block(APP, "k: 'sci',", 'page: false', {file: 'app.js'});
  assert.ok(/sciOpen\(/.test(set) && /due: [^\n]*>= LV_AT\[1\]/.test(set) && !/LV_AT\[0\]/.test(set), 'the offer at Advanced');
});

test('an IMR player: the IMR genera from their family’s Open Water, without the offer (Q219), Naso only (Q220)', () => {
  assert.deepStrictEqual(open({'f:Damselfishes': 0.4, 'f:Surgeonfishes': 0.45}, true), {auto: [], units: []});
  const o = open({'f:Damselfishes': 0.5, 'f:Surgeonfishes': 0.6, 'f:Butterflyfishes': 0.7}, true);
  assert.deepStrictEqual(o.auto.sort(), ['g:Amphiprion', 'g:Chromis', 'g:Dascyllus', 'g:Heniochus', 'g:Naso', 'g:Pomacentrus']);
  assert.deepStrictEqual(o.units, [], 'the other genera wait for Advanced and the offer');
  // at Advanced, the rest of the family's genera are offered (decision 1); the IMR genera are never in the offer
  const a = open({'f:Damselfishes': 0.85, 'f:Surgeonfishes': 0.85}, true);
  assert.ok(a.units.includes('g:Abudefduf') && a.units.includes('g:Acanthurus') && !a.units.some(n => X.gen[n].imrg));
  assert.ok(a.auto.includes('g:Naso') && !a.auto.includes('g:Acanthurus'));
});

test('bonusList: a set’s auto units play whatever the set’s state, each once', () => {
  const run = (Q, sets) => {
    const c = {Q, SETS: () => sets};
    vm.createContext(c);
    vm.runInContext(block(APP, 'const bonusList = ', '\n', {through: 1, file: 'app.js'}) + '\nthis.r = bonusList();', c);
    return plain(c.r);
  };
  const S = {k: 'sci', units: () => ['g:A', 'g:B'], auto: () => ['g:B', 'g:N']};
  assert.deepStrictEqual(run({}, [S]), ['g:B', 'g:N']);
  assert.deepStrictEqual(run({sci: false}, [S]), ['g:B', 'g:N']);
  assert.deepStrictEqual(run({sci: true}, [S]), ['g:A', 'g:B', 'g:N']);
  assert.deepStrictEqual(run({bon: true}, [{k: 'bon', units: () => ['X']}]), ['X']);
});

test('a photo of another genus keeps its family as the answer (Q221): every genus photo is in its family’s photos', () => {
  ['g:Abudefduf', 'g:Chaetodon', 'g:Acanthurus', 'g:Naso'].forEach(n => {
    const fw = new Set(X.gen[fam(n)].views.wide.map(p => p.f));
    assert.ok(X.gen[n].views.wide.length && X.gen[n].views.wide.every(p => fw.has(p.f)), n);
    assert.strictEqual(X.gen[n].rank, 'genus');
    assert.ok(!X.gen[fam(n)].rank, 'the family question stays among families');
  });
  assert.strictEqual(fam('g:Naso'), 'f:Surgeonfishes');
});

test('the back card: once, to a player who turned the set on under its earlier rules (Pierre, 2026-11-08)', () => {
  const due = Q => {
    const c = {Q, SETS: () => [{k: 'sci', rv: 1, back: {}}, {k: 'bon'}]};
    vm.createContext(c);
    vm.runInContext(block(src('quiz.js'), 'const bonusBackDue = ', '\n', {through: 1, file: 'quiz.js'}) + '\nthis.r = bonusBackDue();', c);
    return c.r ? c.r.k : null;
  };
  assert.strictEqual(due({sci: true, sciT: 1}), 'sci', 'on before the change: asked');
  assert.strictEqual(due({sci: true, sciV: 1}), null, 'a choice made under the new rules (either answer): never again');
  assert.strictEqual(due({sci: false}), null, 'turned off by the player: not asked');
  assert.strictEqual(due({}), null, 'never turned on: not asked');
  assert.strictEqual(due({bon: true}), null, 'a set with no back card');
  // either answer records the rules it was made under, and the merge carries it with the choice
  assert.ok(block(APP, 'function bonusSet(', '\n}\n', {file: 'app.js'}).includes("(Q[k + 'V'] = S.rv)"));
  assert.ok(src('sync.js').includes("['N', 'A', 'V', 'H'].forEach("), 'synced with the choice');
});

test('imrSaid: anyone who ever answered "I\u2019m at IMR" (Pierre, 2026-11-08, Q227), the history or the fallback trail', () => {
  const said = rec => {
    const c = {
      SUBJ: {id: 'fish'},
      startKey: C.startKey,
      startEventsOf: C.startEventsOf,
      store: {get: k => (k === 'reefid-sync-fish-start' ? rec : null)}
    };
    vm.createContext(c);
    vm.runInContext(block(src('model.js'), 'const imrSaid = ', '\n};\n', {through: 1, file: 'model.js'}) + '\nthis.r = imrSaid();', c);
    return c.r;
  };
  const ev = (...h) => C.startNorm({h});
  assert.strictEqual(said(null), false, 'never asked');
  assert.strictEqual(said(ev(['imr', 0, 1, 'card'])), true, 'at IMR');
  assert.strictEqual(said({c: 'imr', t: 1, at: 0, via: 'card'}), true, 'a record from before the history');
  assert.strictEqual(said(ev(['new', 0, 1, 'card'])), false);
  assert.strictEqual(said(ev(['imr', 0, 1, 'card'], ['know', 60, 2, 'fallback'])), true, 'moved up by the fallback card: still');
  assert.strictEqual(said(ev(['imr', 0, 1, 'card'], ['new', 5, 2, 'tour'])), true, 'changed since: once is enough');
  assert.strictEqual(said(ev(['know', 0, 1, 'card'], ['imr', 9, 2, 'tour'], ['know', 60, 3, 'fallback'])), true);
  assert.strictEqual(said(ev(['know', 0, 1, 'card'], ['know', 60, 2, 'fallback'])), false);
  assert.strictEqual(said(ev(['imr', 0, 1, 'inferred'])), false, 'inferred: never clicked');
  // the fallback trail alone (fb '<answer>-<dir>': a card shown on an imr answer) recovers it
  const hi = ['imr', 'hi'].join('-'); // the fallback card shown on an imr answer, its direction 'hi'
  assert.strictEqual(said({...ev(['know', 60, 2, 'fallback']), fb: {[hi]: [60, 2]}}), true, 'fb on an imr answer');
  assert.strictEqual(said({...ev(['know', 0, 1, 'card']), fb: {'know-lo': [40, 2]}}), false);
  // kept across devices: the union of two records holds the imr answer whichever came last
  assert.strictEqual(said(C.startUnion(ev(['imr', 0, 1, 'card']), ev(['know', 0, 5, 'card']))), true, 'merged');
});

test('the fish make no level-change proposal (Pierre, 2026-11-08); the corals keep theirs', () => {
  const units = block(APP, 'const UNITS = {', '\n};\n', {file: 'app.js'});
  assert.strictEqual((units.match(/startFb: false/g) || []).length, 1);
  assert.ok(units.indexOf('startFb: false') > units.indexOf('  fish: {'), 'on the fish');
});

test('Q240: turned on by hand before Advanced, a family’s genera from its Open Water (Pierre, 2026-11-08)', () => {
  const hand = (scores, imr) =>
    plain(
      ctx.sciOpen(
        X.sci,
        n => scores[n] || 0,
        () => false,
        imr,
        true
      )
    );
  assert.ok(hand({'f:Damselfishes': 0.6}, false).units.includes('g:Abudefduf'), 'on by hand: from Open Water');
  assert.deepStrictEqual(hand({'f:Damselfishes': 0.4}, false).units, [], 'not under Open Water');
  assert.deepStrictEqual(open({'f:Damselfishes': 0.6}, false).units, [], 'by the offer: still Advanced');
  // the flag: on by hand while no family is at Advanced (S.due false), synced with the choice; the offer never sets it
  const set = (on, hand, due) => {
    const c = {
      Q: {},
      SETS: () => [{k: 'sci', rv: 1, due: () => due}],
      saveQ: () => {},
      showBon: () => {},
      RAW: null,
      Date
    };
    vm.createContext(c);
    vm.runInContext(block(APP, 'function bonusSet(', '\n}\n', {through: 1, file: 'app.js'}) + `\nbonusSet(${on}, 'sci', ${hand});`, c);
    return c.Q.sciH;
  };
  assert.strictEqual(set(true, true, false), true, '⚙ or My progress before Advanced');
  assert.strictEqual(set(true, true, true), false, 'by hand once a family is at Advanced: the offer’s rule');
  assert.strictEqual(set(true, undefined, false), false, 'the offer card or the back card');
  assert.strictEqual(set(false, true, false), false, 'off');
  assert.ok(src('sync.js').includes("['N', 'A', 'V', 'H'].forEach("), 'synced with the choice');
});

test('Q238: the IMR families first for anyone who ever answered imr (openPick reads imrSaid)', () => {
  const pick = block(src('model.js'), 'function openPick(', '\n}\n', {file: 'model.js'});
  assert.ok(pick.includes('if (imrSaid()) {') && !pick.includes("c === 'imr'"));
});
