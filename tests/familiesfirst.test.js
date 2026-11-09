'use strict';
// Families met first (Pierre, 2026-11-09, Q208 A; docs/FISH_PATH.md "Levels", docs/LEARNING.md "Fish: scientific
// genera"): once the "Scientific names" offer is accepted, no new scientific-genus card opens while a family in play is
// still not met (model.js openPick, laterWaits; app.js setLater). Exempt: an IMR player's IMR genera (the set's auto
// units, Q219), the set turned on by hand before it was due (Q.sciH, Q240) and Open all. Nothing changes when no family
// is left to open. model.js runs whole in the rated world's vm (tools/ratedworld.js engine), the app's globals around it.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const RW = require('../tools/ratedworld.js');
const X = RW.fishUnits(),
  FAM = 'f:Damselfishes',
  GEN = X.sci.filter(n => X.gen[n].parent === FAM && !X.gen[n].imrg).slice(0, 3),
  IMRG = 'g:Chromis',
  // a strong player (first-launch answer know), the offer accepted, seeded draws
  eng = (choice = 'know', seed = 5) => {
    const e = RW.engine(X, RW.world(X, 1), {seed});
    e.M.startSet(choice, 'tour');
    e.ctx.Q.sci = true;
    return e;
  },
  picks = (e, fresh, k = 200) => Array.from({length: k}, () => e.M.openPick(fresh.slice(), fresh));

test('a strong player with the offer accepted: no genus card while a family is not met', () => {
  const e = eng(),
    fresh = ['f:Spadefishes', 'f:MoorishIdol', ...GEN];
  const P = picks(e, fresh);
  assert.ok(
    P.every(n => !X.gen[n].rank),
    'families only: ' + [...new Set(P)]
  );
  assert.ok(new Set(P).size === 2, 'both families drawn');
  assert.ok(GEN.length === 3 && GEN.every(n => e.ctx.setLater(n)), 'the genera wait');
});

test('once no family is left to open, the genera open as before: the same draws, seed for seed', () => {
  const a = eng('know', 9),
    b = eng('know', 9);
  delete b.ctx.setLater; // the engine without the rule (as on main)
  for (const fresh of [GEN, ['f:Spadefishes', 'f:MoorishIdol']]) assert.deepStrictEqual(picks(a, fresh, 50), picks(b, fresh, 50));
});

test('exempt: an IMR player’s IMR genera (auto), the set turned on by hand early (Q240), Open all', () => {
  // An IMR player: the IMR genus of a family at Open Water comes without the offer (Q219) and is never held back; the
  // other genera of the family wait like everyone's.
  const imr = eng('imr');
  imr.ctx.genScore = n => (n === FAM ? 0.6 : 0);
  assert.ok(!imr.ctx.setLater(IMRG) && imr.ctx.setLater(GEN[0]));
  // The Soapfishes (not met, no IMR tag): held back, the IMR genus would yield to them; it is drawn (the IMR-tagged first).
  const pi = picks(imr, ['f:Soapfishes', IMRG, GEN[0]], 100);
  assert.ok(
    pi.every(n => n === IMRG),
    [...new Set(pi)].join(' ')
  );
  // Turned on by hand before any family was at Advanced (Q.sciH): nothing waits.
  const hand = eng();
  hand.ctx.Q.sciH = true;
  assert.ok(
    picks(hand, ['f:Spadefishes', ...GEN], 300).some(n => GEN.includes(n)),
    'by hand: genera drawn'
  );
  // Open all (kind 'a'): nothing waits; closed again by "One at a time" (kind 'b'), the rule is back.
  const all = eng();
  all.M.introAdd(['f:Angelfishes'], true, 'a');
  assert.ok(
    picks(all, ['f:Spadefishes', ...GEN], 300).some(n => GEN.includes(n)),
    'Open all: genera drawn'
  );
  all.M.introMap()['f:Angelfishes'][3] = 'b';
  assert.ok(
    picks(all, ['f:Spadefishes', ...GEN]).every(n => !GEN.includes(n)),
    'back to one at a time'
  );
});

test('app.js setLater: a unit of a set with after, not its auto units, not when on by hand', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'),
    S = {k: 'sci', after: 1, auto: () => ['g:Chromis'], units: () => []},
    B = {k: 'bon', units: () => ['Isopora']},
    c = {Q: {}, setOf: n => (n.startsWith('g:') ? S : n === 'Isopora' ? B : null)};
  vm.createContext(c);
  vm.runInContext(block(app, 'const setLater = ', '\n};\n', {through: 1, file: 'app.js'}) + '\nthis.setLater = setLater;', c);
  assert.deepStrictEqual(
    ['g:Abudefduf', 'g:Chromis', 'Isopora', 'f:Damselfishes'].map(c.setLater),
    [true, false, false, false],
    'a genus waits; the IMR genus (auto), a coral bonus genus (no after) and a family never'
  );
  c.Q.sciH = true;
  assert.strictEqual(c.setLater('g:Abudefduf'), false, 'on by hand early (Q240)');
  // The fish set declares it.
  assert.ok(/after: 1,/.test(block(app, "k: 'sci',", 'page: false', {file: 'app.js'})));
});

test('a whole run: an expert who accepted the offer meets every circle-1 family before any genus', () => {
  const cps = Array.from({length: 20}, (_, i) => 10 * (i + 1)),
    r = RW.runOne(X, {profile: 'expert', seed: 101, N: 200, cps});
  const early = r.rows.filter(x => x.kinds.genus.met > 0 && x.kinds.family.met < X.c1.length);
  assert.deepStrictEqual(
    early.map(x => [x.q, x.kinds.family.met, x.kinds.genus.met]),
    [],
    'genera met while a circle-1 family was not'
  );
});
