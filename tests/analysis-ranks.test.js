require('./slot.js').testGuard();
// The rank asked in the Analyses' models (the fish parity review, #1056; the integrator, 2026-11-17: a rank effect in the
// models, not one report per rank): a fish question asks a family, a scientific genus or a species unit. On a synthetic
// fish log with a rank effect planted (analysis.js synth rk), the models give it back; on the corals (one rank) nothing
// changes.
const test = require('node:test'),
  assert = require('node:assert');
const A = require('../analysis.js');
const {near, synthMeta} = require('./analysisfix.js');

// 16 units of each rank (f:, g:, s: ids, as the fish units are), 8 photos each with judged features (photoMetaFish's
// shape: ease, phase, view, whole), each unit's look-alikes two of its own rank, opened in turn (family, genus, species).
function fishRanked(o = {}) {
  const photos = {},
    look = {},
    fph = {},
    ids = [];
  for (let k = 0; k < 16; k++) ids.push('f:Fam' + k, 'g:Gen' + k, 's:s0' + String(k).padStart(2, '0'));
  ids.forEach((id, i) => {
    photos[id] = [];
    for (let j = 0; j < 8; j++) {
      const f = `ph${i}-${j}`;
      photos[id].push({f, v: 'wide'});
      fph[f] = [1 + ((i + j) % 5), j % 4 === 0 ? 'juvenile' : '', j % 3 === 0 ? 'o' : 'p', j % 5 === 0 ? '0' : '1'];
    }
  });
  ids.forEach(id => (look[id] = ids.filter(x => x !== id && x[0] === id[0]).slice(0, 2)));
  const rows = A.synth({
    players: Array.from({length: 10}, (_, i) => ['q' + i, (i - 4.5) / 5, 450, 0.1]),
    photos,
    look,
    start: 0,
    end: 200 * 864e5,
    seed: 5,
    subject: 'fish',
    rk: o.rk
  });
  return {rows, meta: {ph: {}, fph, rk: 'family'}};
}

test('the rank asked: read from the unit id, else the logged Rank column, else the subject’s own', () => {
  assert.strictEqual(A.rankOfUnit('f:Damselfishes', '', 'family'), 'family');
  assert.strictEqual(A.rankOfUnit('g:Chromis', 'family', 'family'), 'genus', 'the id first');
  assert.strictEqual(A.rankOfUnit('s:s091', '', 'family'), 'species');
  assert.strictEqual(A.rankOfUnit('Damselfish', 'genus', 'family'), 'genus', 'an id without a prefix: the Rank column');
  assert.strictEqual(A.rankOfUnit('Damselfish', '', 'family'), 'family', 'nothing logged: the subject’s rank');
  // the subjects whose ranks the models tell apart: one with a sheet per rank (core.js SUBJECTS sheets), at the rank of
  // its game units; the corals none
  const C = require('../core.js');
  assert.strictEqual(A.rankRef(C.subjectOf('fish')), 'family');
  assert.strictEqual(A.rankRef(C.subjectOf('coral')), '');
  assert.strictEqual(A.rankRef(C.subjectOf('seaslug')), 'genus', 'the sea slugs, once they have an Analyses report');
  assert.strictEqual(require('../tools/analyses.js').metaOf('fish').rk, 'family');
  assert.ok(!('rk' in require('../tools/analyses.js').metaOf('coral')));
});

test('a rank effect planted in a synthetic fish log is given back by the models that carry the rank', () => {
  // genus questions 0.8 logit harder and 0.3 log seconds slower than family questions, species ones 1.4 and 0.5
  const RK = {genus: [0.8, 0.3], species: [1.4, 0.5]},
    {rows, meta} = fishRanked({rk: RK}),
    r = A.runAll(rows, meta, {B: 0}),
    e = (a, k) => r.A[a].effects.find(x => x.k === k);
  Object.entries(r.A).forEach(([k, a]) => assert.ok(!a.err, `${k}: ${a.err}`));
  // Response time (Gaussian on log seconds): close to the planted shift
  near(e('rt', 'rk_genus').est, RK.genus[1], 0.15, 'time: genus questions');
  near(e('rt', 'rk_species').est, RK.species[1], 0.15, 'time: species questions');
  // What makes a photo hard (+ = harder) and Learning curves (log-odds of a right answer): the planted value inside the
  // 95% interval (16 units a rank, each with its own difficulty: the rank's mean is known to about ±0.4), in the planted
  // order
  const inside = (x, v, what) => assert.ok(x.lo <= v && v <= x.hi, `${what}: ${v} outside [${x.lo.toFixed(2)}, ${x.hi.toFixed(2)}]`);
  inside(e('photo', 'rk_genus'), RK.genus[0], 'photo: genus questions');
  inside(e('photo', 'rk_species'), RK.species[0], 'photo: species questions');
  inside(e('learn', 'rk_genus'), -RK.genus[0], 'learning: genus questions');
  inside(e('learn', 'rk_species'), -RK.species[0], 'learning: species questions');
  assert.ok(e('photo', 'rk_species').est > e('photo', 'rk_genus').est && e('photo', 'rk_genus').est > 0);
  assert.ok(e('learn', 'rk_species').est < e('learn', 'rk_genus').est && e('learn', 'rk_genus').est < 0);
  // harder questions, more mix-ups: species pairs clearly above family pairs
  assert.ok(e('conf', 'rk_species').est > 0 && e('conf', 'rk_species').lo > 0, 'mix-ups: species pairs');
  // the app's expected chance knows the rank (synth): each rank's right − expected near 0
  ['family', 'genus', 'species'].forEach(rk => near(e('fmt', 'oe_rk_' + rk).est, 0, 0.05, `formats: ${rk} questions`));
  assert.deepStrictEqual(
    r.A.fmt.ranks.map(x => x.k),
    ['family', 'genus', 'species']
  );
  // the answers to 80% by rank: more for a harder rank
  assert.ok(e('learn', 'n_rk_genus').est >= e('learn', 'n_all').est, 'n to 80%: genus questions take longer');
  assert.strictEqual(e('learn', 'n_all').rk, 'family');
  // the rank effects are exploratory (none is primary: PRIMARY unchanged), each named in words the admin keeps
  ['rt', 'photo', 'conf', 'learn'].forEach(k =>
    ['genus', 'species'].forEach(rk => {
      const x = e(k, 'rk_' + rk);
      assert.strictEqual(x.fam, 2, `${k} rk_${rk}: exploratory`);
      assert.strictEqual([x.rk, x.rk0].join(), rk + ',family');
      assert.strictEqual(A.plainOf(k, x, r.A[k]).name, `A ${rk} question instead of a family question`);
    })
  );
  assert.match(A.plainOf('learn', e('learn', 'n_rk_species'), r.A.learn).name, /^Species questions: answers on a unit/);
  // the views that list units say each unit's rank, its own value with its rank's effect: the slowest units are species
  // units, the units with most answers to 80% are not family ones
  assert.strictEqual(r.A.rt.rk0, 'family');
  assert.ok(r.A.rt.genus.every(g => g.rk === A.rankOfUnit(g.k, '', '')));
  const top = L => L.slice(0, 8).map(g => g.rk);
  assert.ok(top(r.A.rt.genus).filter(x => x === 'species').length >= 6, `slowest: ${top(r.A.rt.genus)}`);
  assert.ok(
    r.A.learn.genus.slice(-8).every(g => g.rk !== 'family'),
    'most answers to 80%'
  );
  // the mix-ups: the pairs of each rank, within it (a question's choices stay within its rank)
  assert.ok(r.A.conf.pairs.every(p => p.k.split('|').every(g => A.rankOfUnit(g, '', '') === p.rk)));
  assert.deepStrictEqual([...new Set(r.A.conf.pairs.map(p => p.rk))], ['family', 'genus', 'species']);
  // What makes a photo hard: its answers by the rank asked beside the photo features' tables
  const t = r.A.photo.tabs.find(x => x.k === 'rank');
  assert.deepStrictEqual(
    t.rows.map(x => x.label),
    ['Family questions', 'Genus questions', 'Species questions']
  );
});

test('the corals (one rank): the same models, the same results', () => {
  const {photos, meta, look} = synthMeta(),
    pl = Array.from({length: 8}, (_, i) => ['P' + i, ((i % 5) - 2) * 0.4, 350, 0.05 + 0.03 * (i % 6)]),
    rows = A.synth({players: pl, photos, look, start: 0, end: 200 * 864e5, seed: 2}),
    plain = A.runAll(rows, meta, {B: 0}),
    // the same answers with the rank told apart: each logs the corals' rank, the reference: no rank column in any model
    ranked = A.runAll(
      rows.map(r => {
        const x = r.slice();
        x[18] = 'genus';
        return x;
      }),
      {...meta, rk: 'genus'},
      {B: 0}
    );
  // the units' rank tags aside (rk, rk0), and the computing times
  const strip = o => JSON.parse(JSON.stringify(o), (k, v) => (k === 'rk' || k === 'rk0' || k === 'ms' ? undefined : v));
  assert.deepStrictEqual(strip(ranked), strip(plain));
  // and the corals' own report carries no rank at all
  const s = JSON.stringify(plain);
  assert.ok(!/"rk_|"rk0?"|"ranks"/.test(s), 'no rank in the corals’ report');
  assert.ok(!plain.A.photo.tabs, "the corals' photo tables as before");
});

// Codex review #1058: a unit's seconds carry its rank's effect, so they are read from the reference rank's typical time,
// not the median of every rank's answers. 480 answers, family questions at exactly 5 s, genus questions at exactly 10 s:
// every family reads 5 s and every genus 10 s (the pooled median, 7.5 s, read 7.5 s and 15 s).
test('Answer time by unit: each unit from the reference rank’s typical time (family 5 s, genus 10 s)', () => {
  const fs = require('fs'),
    path = require('path'),
    vm = require('vm'),
    block = require('./block.js'),
    F = ['f:A', 'f:B', 'f:C', 'f:D'],
    G = ['g:A', 'g:B', 'g:C', 'g:D'],
    rows = [];
  for (let i = 0; i < 480; i++) {
    const L = i % 2 ? G : F,
      g = L[(i >> 1) % 4];
    rows.push(['p' + (i % 4), i * 60e3, g, g, i % 3 ? 1 : 0, 'quiz', '', 0.6, 0, 0, L.join(' '), 0, i % 2 ? 10 : 5, 0]);
  }
  const r = A.rt(A.prep(rows, {rk: 'family'}), 0, 1),
    src = fs.readFileSync(path.join(__dirname, '..', 'admin-analyses.js'), 'utf8'),
    anSu = vm.runInNewContext(block(src, 'const anTyp = ', '\nconst ANV', {file: 'admin-analyses.js'}) + ';anSu');
  near(r.effects.find(e => e.k === 'rk_genus').est, Math.log(2), 0.01, 'the genus coefficient');
  assert.strictEqual(r.s0, 5);
  r.genus.forEach(g => near(anSu(r, g.u), g.rk === 'genus' ? 10 : 5, 0.05, `${g.k}'s seconds`));
  // a report without ranks: the typical answer's time, as before
  assert.strictEqual(anSu({typ: {s: 7.5}}, 0), 7.5);
});
