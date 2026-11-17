require('./slot.js').testGuard();
// What makes a photo hard on the fish side (fish admin at parity; ROADMAP "Analyses for the fish": "the fish photos' own
// features (judged ease, phase, framing)"): analysis.js photoMetaFish reads the judged features of the photos the game
// plays (fish-game.json), and Photo factors fits them with the corals' model (LLTM: player, unit and photo random
// effects), each effect reported as a difficulty. tools/analyses.js and the admin's Recompute here read them for the
// subject whose analyses say photos 'judged' (core.js SUBJECTS).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const A = require('../analysis.js'),
  C = require('../core.js');
const ROOT = path.join(__dirname, '..');

test('photoMetaFish: ease, phase, view and whole from the game records; a photo with no ease left out', () => {
  const M = A.photoMetaFish({
    photos: {
      t01: [
        {f: 'a', e: 5, jt: 'p1g0sl1r'},
        {f: 'b', e: 2, jt: 'o0g0sm1j', ph: 'juvenile'},
        {f: 'c', e: '3', jt: 'h1d0sms', ph: 'male'},
        // a reference photo: its tags, no ph; its juvenile flag is its phase (Codex review #943)
        {f: 'r', e: 4, jt: 'p1g0sm1jr'},
        {f: 'd', jt: 'p1g0sl1'},
        {f: 'e', e: 9},
        null
      ]
    }
  });
  assert.deepStrictEqual(M, {
    a: [5, '', 'p', '1'],
    b: [2, 'juvenile', 'o', '0'],
    c: [3, 'male', 'h', '1'],
    r: [4, 'juvenile', 'p', '1']
  });
  assert.deepStrictEqual(A.photoMetaFish(null), {});
  // the real file: every photo the game plays with an ease
  const G = C.fishGameRead(JSON.parse(fs.readFileSync(path.join(ROOT, 'fish-game.json'), 'utf8'))),
    R = A.photoMetaFish(G),
    n = Object.values(G.photos)
      .flat()
      .filter(p => p && p.e).length;
  assert.ok(Object.keys(R).length > 1000 && Object.keys(R).length <= n);
  // every juvenile the game knows reads as one, with or without its ph
  const juv = Object.values(G.photos)
    .flat()
    .filter(
      p =>
        p &&
        p.e &&
        !p.ph &&
        String(p.jt || '')
          .slice(7)
          .includes('j')
    );
  assert.ok(juv.length && juv.every(p => R[p.f][1] === 'juvenile'), String(juv.length));
});

// Made-up fish answers with a known effect of the judged ease (0.6 logit per point toward a right answer) and of a
// juvenile (0.5 harder): the fit finds them, reported as difficulty (+ = harder), with the fish tables and words.
function fishLog(seed = 7) {
  let s = seed;
  const R = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648,
    nrm = () => Math.sqrt(-2 * Math.log(R() + 1e-12)) * Math.cos(2 * Math.PI * R()),
    sig = x => 1 / (1 + Math.exp(-x)),
    photos = [],
    fph = {};
  for (let u = 0; u < 20; u++)
    for (let k = 0; k < 10; k++) {
      const f = `fi${u}_${k}`,
        e = 1 + ((u + k) % 5),
        juv = k % 4 === 0;
      fph[f] = [e, juv ? 'juvenile' : k % 7 === 3 ? 'male' : '', ['p', 'o', 'h'][k % 3], k % 5 === 4 ? '0' : '1'];
      photos.push({f, u: 'f:U' + u, b: 0.6 * (e - 3) - (juv ? 0.5 : 0) + 0.3 * nrm()});
    }
  const rows = [];
  let t = Date.UTC(2026, 10, 1);
  for (let p = 0; p < 12; p++) {
    const th = 0.3 * nrm();
    for (let i = 0; i < 250; i++) {
      const ph = photos[Math.floor(R() * photos.length)],
        y = R() < 0.25 + 0.75 * sig(0.4 + th + ph.b) ? 1 : 0;
      t += 60e3 * (1 + R() * 3);
      rows.push(['p' + p, t, ph.u, y ? ph.u : 'f:X', y, 'quiz', ph.f, 0.7, '', '', 'a b c d', 0, 4]);
    }
  }
  return {rows, fph};
}

test('Photo factors on the fish features: the judged ease and a juvenile found, as difficulties, with the fish tables', () => {
  const {rows, fph} = fishLog(),
    r = A.runAll(rows, {ph: {}, fph}, {B: 0}),
    P = r.A.photo,
    by = Object.fromEntries(P.effects.map(e => [e.k, e]));
  assert.ok(!P.err && P.n === rows.length, P.err);
  assert.deepStrictEqual(
    P.effects.map(e => e.k),
    ['ease', 'juv', 'phase', 'oblique', 'face', 'partial', 'sd_photo', 'sd_genus']
  );
  assert.ok(Math.abs(by.ease.est + 0.6) < 0.25, `ease ${by.ease.est}: a point easier is fewer misses (- = easier)`);
  assert.ok(Math.abs(by.juv.est - 0.5) < 0.45, `juvenile ${by.juv.est}`);
  assert.strictEqual(by.ease.fam, 1, 'the judged ease is a primary effect');
  assert.strictEqual(P.of, 'ease, phase and framing');
  assert.deepStrictEqual(
    P.tabs.map(t => t.t),
    ['Ease', 'Phase', 'View', 'Whole or part']
  );
  assert.deepStrictEqual(
    P.tabs[0].rows.map(x => x.label),
    ['1 (very hard)', '2', '3', '4', '5 (very easy)']
  );
  assert.ok(!('views' in P) && !('quality' in P), 'no coral tables');
  // the other analyses read no fish feature as a coral view (ph stays the corals')
  assert.ok(!(r.A.zoom.views || []).some(v => /^[1-5]$/.test(String(v.k))));
});

test('a fish feature no photo shown had is left out; the corals keep every term', () => {
  const {rows, fph} = fishLog(3);
  Object.values(fph).forEach(x => (x[1] = '')); // no phase at all
  const P = A.runAll(rows, {ph: {}, fph}, {B: 0}).A.photo;
  assert.ok(!P.effects.some(e => e.k === 'juv' || e.k === 'phase'));
});

test('a judgment changed refits the fish milestones (the report fingerprint reads fph)', () => {
  const {rows, fph} = fishLog(5),
    meta = {ph: {}, fph},
    r0 = A.report(rows.slice(0, 1000), meta, null, {B: 0}),
    same = A.report(rows.slice(0, 1000), meta, r0, {B: 0}),
    fph2 = {...fph, [Object.keys(fph)[0]]: [1, '', 'p', '1']},
    moved = A.report(rows.slice(0, 1000), {ph: {}, fph: fph2}, r0, {B: 0});
  assert.strictEqual(same.R[1000], r0.R[1000]);
  assert.notStrictEqual(moved.R[1000], r0.R[1000]);
});

test('the fish and the sea slugs read their judged features: core.js SUBJECTS, tools/analyses.js and the admin page', () => {
  ['fish', 'seaslug'].forEach(id => {
    const S = C.subjectOf(id);
    assert.strictEqual(S.analyses.photos, 'judged', id);
    assert.ok(S.admin.pages.includes('analyses/difficulty/photos'), id);
  });
  const tool = fs.readFileSync(path.join(ROOT, 'tools/analyses.js'), 'utf8');
  // each from its own game file (SUBJECTS admin files gm), the tool and the admin's Recompute here alike
  assert.match(tool, /k === 'judged'\) return \{ph: \{\}, fph: A\.photoMetaFish\(C\.fishGameRead\(rd\(S\.admin\.files\.gm\)\)\)\}/);
  assert.match(fs.readFileSync(path.join(ROOT, 'admin-analyses.js'), 'utf8'), /fetch\(S\.admin\.files\.gm, /);
  assert.strictEqual(C.subjectOf('fish').admin.files.gm, 'fish-game.json');
  assert.strictEqual(A.AV, 14);
});
