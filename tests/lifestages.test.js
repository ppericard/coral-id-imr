require('./slot.js').testGuard();
// Life stages matched (proto/lifestages.js): the drawing, run in Node on stubs as tests/oddone.test.js runs Odd one out's. It asks
// only about the phases the cited list documents (fish-phases.json), one pair of stages per round, the right photo among three
// of the stage to find, the two wrong ones of other species (the same family first), four different observations. The page is
// untimed and changes no progress: its code, and the shared helpers it uses (proto/lab.js labShots, labSheet), never call the
// quiz's recorders. Rule S1: no subject is named in it.
const test = require('node:test');
const block = require('./block.js');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const SRC = read('proto/lifestages.js'),
  LAB = read('proto/lab.js'),
  SHARED = block(LAB, 'const labObs', 'function viewLab(', {file: 'proto/lab.js'});
const ctx = {};
vm.createContext(ctx);
vm.runInContext(
  block(SRC, 'const LS_PAIRS', 'LAB.add(', {file: 'proto/lifestages.js'}) +
    '\nthis.pairs = LS_PAIRS; this.sourced = lsSourced; this.index = lsIndex; this.plan = lsPlan; this.photos = lsPhotos;',
  ctx
);
const copy = x => JSON.parse(JSON.stringify(x));
const {sourced, index, plan, photos} = ctx;
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;

// The list: A documents the three stages (juvenile and the adults' sexes), B the sexes only, C the initial and terminal phases only,
// D the juvenile only (no adult stage), E the sexes.
const PH = {A: {juv: 1, sex: 1}, B: {sex: 1}, C: {ip_tp: 1}, D: {juv: 1}, E: {sex: 1}};
const ph = (sp, phase, k, n = 'u1') => ({p: {f: `${sp}-${phase}-${k}`, o: `o-${sp}-${phase}-${k}`, sp, ph: phase}, n});

test('a phase is documented by its own verdict: the juvenile by juv, the female and the male by the sexes or the initial and terminal phases', () => {
  assert.strictEqual(sourced(PH.A, 'juvenile'), true);
  assert.strictEqual(sourced(PH.A, 'female'), true);
  assert.strictEqual(sourced(PH.B, 'juvenile'), false);
  assert.strictEqual(sourced(PH.B, 'male'), true);
  assert.strictEqual(sourced(PH.C, 'female'), true);
  assert.strictEqual(sourced(PH.D, 'male'), false);
  assert.strictEqual(sourced(undefined, 'male'), false);
  assert.strictEqual(sourced(PH.A, 'intermediate'), false, 'a stage the game does not ask');
  assert.strictEqual(sourced(PH.A, ''), false);
});

test('the index keeps a species the list documents with a photo in two documented stages, and only those photos', () => {
  const items = [
    ph('A', 'juvenile', 1),
    ph('A', 'female', 1),
    ph('A', 'male', 1),
    ph('A', 'intermediate', 1), // not asked
    ph('B', 'juvenile', 1), // B's juvenile is not documented
    ph('B', 'male', 1), // one documented stage only
    ph('D', 'juvenile', 1),
    ph('D', 'male', 1), // D has no adult verdict
    ph('Z', 'male', 1), // not in the list
    ph('Z', 'female', 1),
    {p: {f: 'x', sp: 'C'}, n: 'u1'}, // no stage tag
    ph('C', 'female', 1),
    ph('C', 'male', 1)
  ];
  const ix = index(items, PH);
  assert.deepStrictEqual([...ix.keys()].sort(), ['A', 'C']);
  assert.deepStrictEqual(Object.keys(ix.get('A').ph).sort(), ['female', 'juvenile', 'male']);
  assert.deepStrictEqual(Object.keys(ix.get('C').ph).sort(), ['female', 'male']);
  assert.strictEqual(ix.get('A').n, 'u1');
});

// A world: four families' worth of species with female and male photos, one with a juvenile too.
const world = () => {
  const items = [];
  ['A', 'B', 'C', 'E'].forEach((sp, i) => {
    const n = i < 2 ? 'u1' : 'u2';
    ['female', 'male', 'juvenile'].forEach(p => items.push(ph(sp, p, 1, n), ph(sp, p, 2, n)));
  });
  return index(items, PH);
};

test('a round: a species with two documented stages, the stage shown before the stage to find, two other species showing it', () => {
  const ix = world(),
    rnd = seeded(5),
    seen = new Set();
  for (let k = 0; k < 400; k++) {
    const p = plan(ix, rnd);
    assert.ok(['juvenile|female', 'juvenile|male', 'female|male'].includes(`${p.ref}|${p.tgt}`), `${p.ref} to ${p.tgt}`);
    const have = ph => !!ix.get(p.sp).ph[ph];
    assert.ok(have(p.ref) && have(p.tgt));
    assert.strictEqual(new Set([p.sp, ...p.others]).size, 3, 'three different species');
    p.others.forEach(o => assert.ok(ix.get(o).ph[p.tgt], `${o} shows no ${p.tgt}`));
    assert.ok(p.at >= 0 && p.at < 3);
    seen.add(`${p.ref}|${p.tgt}|${p.at}`);
  }
  assert.ok(seen.size >= 6, `the same pair or place every time: ${seen.size}`);
});

test('the other species are those of its unit first (look-alikes, one family), then any other', () => {
  const ix = world(),
    rnd = seeded(8);
  for (let k = 0; k < 300; k++) {
    const p = plan(ix, rnd),
      mine = ix.get(p.sp).n,
      same = [...ix].filter(([o, x]) => o !== p.sp && x.n === mine && x.ph[p.tgt]).length;
    const inUnit = p.others.filter(o => ix.get(o).n === mine).length;
    assert.strictEqual(inUnit, Math.min(2, same), `${p.sp}: ${p.others} (${same} in its unit)`);
  }
});

test('nothing to ask without two other species showing the stage to find (a new player), or with no species at all', () => {
  assert.strictEqual(plan(new Map()), null);
  const two = index([...['A', 'B'].flatMap(sp => [ph(sp, 'female', 1), ph(sp, 'male', 1)])], PH);
  assert.strictEqual(plan(two), null, 'two species: one wrong choice only');
  // three species, but the third has no male: a male to find has one wrong choice only
  const three = index(
    [...['A', 'B'].flatMap(sp => [ph(sp, 'female', 1), ph(sp, 'male', 1)]), ph('E', 'juvenile', 1), ph('E', 'female', 1)],
    PH
  );
  const p = plan(three, seeded(1));
  assert.ok(p === null || p.tgt === 'female', 'a male asked with one other male only');
});

// A photo source on stubs: photo(sp, ph, not) as the page's, from the index.
const source = ix => (sp, phase, not) => ((ix.get(sp) || {ph: {}}).ph[phase] || []).find(p => !not.includes(p.o)) || null;
const key = p => p.o;

test('the four photos: the stage shown, then the three to choose from with the right one at its place, four observations', () => {
  const ix = world(),
    rnd = seeded(3);
  for (let k = 0; k < 200; k++) {
    const p = plan(ix, rnd),
      ph4 = copy(photos(p, ix, source(ix), key));
    assert.strictEqual(ph4.length, 4);
    assert.strictEqual(ph4[0].sp, p.sp);
    assert.strictEqual(ph4[0].ph, p.ref);
    assert.strictEqual(ph4[1 + p.at].sp, p.sp, 'the right photo is not at its place');
    assert.strictEqual(ph4[1 + p.at].ph, p.tgt);
    ph4.slice(1).forEach(x => assert.strictEqual(x.ph, p.tgt));
    assert.strictEqual(new Set(ph4.map(x => x.o)).size, 4, 'an observation twice (rule P4)');
    assert.strictEqual(new Set(ph4.slice(1).map(x => x.sp)).size, 3, 'a species twice among the choices');
  }
});

test('a species with no photo to match: no round (the caller draws another plan)', () => {
  const ix = world(),
    p = plan(ix, seeded(2));
  assert.strictEqual(
    photos(p, ix, (sp, phase) => (sp === p.sp && phase === p.tgt ? null : {o: sp + phase, f: sp, sp, ph: phase}), key),
    null
  );
  assert.strictEqual(
    photos(p, ix, () => null, key),
    null
  );
});

test('the page is untimed and changes no progress: it never calls the quiz recorders, and names no subject', () => {
  const strip = t =>
    t
      .split('\n')
      .map(l => l.replace(/(^|\s)\/\/.*$/, ''))
      .join('\n');
  for (const [what, code] of [
    ['proto/lifestages.js', strip(SRC)],
    ['proto/lab.js labShots and labSheet', strip(SHARED)]
  ])
    for (const f of [
      'question',
      'answer',
      'recordAnswer',
      'logAnswer',
      'seenAdd',
      'duelPick',
      'dataLooks',
      'mimPairs',
      'introAdd',
      'qclockArm',
      'qclockGo',
      'sendReports',
      'syncSoon',
      'store.set'
    ])
      assert.ok(!new RegExp(`\\b${f.replace('.', '\\.')}\\(`).test(code), `${what} calls ${f}`);
  const code = strip(SRC);
  assert.match(code, /unlocked\(\)/, 'the units the player has unlocked (rule L4)');
  assert.match(code, /labShots\(/, "the draw's own photo choice, through the shared source");
  assert.match(code, /UNITS\[SUBJ\.id\]\.phases\(\)/, 'the list of documented phases of the subject on screen');
  assert.ok(
    !/['"](fish|coral|seaslug|corals)['"]|SUBJECTS\[|SUBJ\.id\s*[=!]==/.test(code),
    'proto/lifestages.js tests which subject it runs'
  );
  // Nothing named before the answer: the tiles carry no species, the stage shown is the question's own words.
  const tileFn = code.slice(code.indexOf('const tile ='), code.indexOf('root.innerHTML = `<div class="q bleed qfind lsq">'));
  assert.ok(!/label\(|short\(|sp\(|spOf|photoSrc/.test(tileFn), 'a tile names its species before the answer');
  // The photos are the choices, so they keep data-c (the quiz's own photo-failure handling, qAnswers); the reference is no button.
  assert.match(tileFn, /data-c="\$\{k - 1\}"/);
  assert.ok(!/fref[^`]*<button/.test(tileFn), 'the stage shown is a button');
});

test('Codex review #1388: each lightbox photo its own unit, a late list draws nothing, a failed list is asked again, the blur stays behind', () => {
  const strip = t =>
    t
      .split('\n')
      .map(l => l.replace(/(^|\s)\/\/.*$/, ''))
      .join('\n');
  const code = strip(SRC);
  // a wrong choice may be of another family: the enlarged photo and its report carry the unit of its own species
  assert.match(code, /genus: index\.get\(spOf\[i\]\)\.n/);
  assert.ok(!/genus: R\.n/.test(code), 'every photo takes the first one’s unit');
  // leaving the tool before the list arrives: nothing is drawn (a draw takes the page's keyboard controller)
  assert.match(code, /if \(!alive\) return;/);
  assert.match(code, /return \(\) => \(alive = false\);/);
  // a failed fetch is not kept (json gives {} on failure)
  const app = block(read('app.js'), 'phases: () =>', 'throw new Error', {file: 'app.js', through: true});
  assert.match(app, /phasesFile = null/);
  assert.match(app, /j && j\.species/);
  // the blurred copy behind each tile (::before) is behind the photos: the choices and the stage shown are positioned
  const css = read('proto/lab.css'),
    at = css.indexOf('Life stages matched (proto/lifestages.js)');
  assert.ok(at > 0);
  assert.match(css.slice(at), /\.q\.lsq \.fxt > button\[data-c\],\s*\.q\.lsq \.fxt\.fref img \{\s*position: relative;/);
  assert.match(css, /\.q\.ooq \.fxt::before,\s*\.q\.lsq \.fxt::before/);
});

test('registered: the Tools list, the service worker list and the hub icon; offered only to a subject with a list of phases', () => {
  const sw = read('sw.js'),
    app = read('app.js');
  assert.match(block(LAB, 'files: [', '],', {file: 'proto/lab.js'}), /'lifestages'/);
  assert.match(block(sw, '...[', '].map(f =>', {file: 'sw.js'}), /'lifestages'/);
  assert.match(block(LAB, 'const LAB_ICONS = {', '};', {file: 'proto/lab.js'}), /\blifestages:/);
  assert.match(SRC, /id: 'lifestages'/);
  assert.match(SRC, /on: \(\) =>[^\n]*\.phases === 'function'/);
  // the member is the fish's own (UNITS fish), once: the corals have none
  const units = block(app, 'const UNITS = {', '\n  seaslug: {', {file: 'app.js'});
  assert.strictEqual((units.match(/\bphases: \(\) =>/g) || []).length, 1);
  assert.ok(units.indexOf('phases: () =>') > units.indexOf('\n  fish: {'), 'phases is not in the corals');
  assert.match(LAB, /const LAB_V = \d+;/);
});
