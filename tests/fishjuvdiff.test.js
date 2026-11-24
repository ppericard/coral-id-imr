require('./slot.js').testGuard();
// The juvenile card shows the young beside an adult, only for species whose young are sourced as different
// (docs/decisions/2026-11-20-juvenile-card-shows-young-beside-adult.md; Pierre, 2026-11-20, on a goatfish's card: «la
// carte disait explicitement qu'il fallait vraiment se méfier parce que les juvéniles pouvaient être très différents des
// adultes. C'était l'un des pires exemples pour ça»; «Comment faire pour que ça n'arrive plus?»). tools/fish_juv_differs.json,
// built into fish.json species jd {d, sub, src, ssrc} by tools/build_fish.py (juv_differs), read by quiz.js juvCard
// alone: one rule for every young photo, a juvenile or a sub-adult (the phase intermediate, no phase flag), the card
// where jd.d is true (jd.sub is information only: Pierre, 2026-11-20 19:23, «soit on décide de mettre la carte seulement
// sur des juvéniles, soit on décide de le mettre aussi sur des formes qui ont des sous-adultes»), and only with an adult
// of its species to show beside it. The records are the ones
// tools/fish_game.py builds from the judging today (tests/fishjuvdiff_rec.py), not fish-game.json.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {spawnSync} = require('child_process'),
  block = require('./block.js');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f));
const F = json('fish.json'),
  J = json('tools/fish_juv_differs.json'),
  BY = Object.fromEntries(F.species.map(s => [s.name, s])),
  SPS = Object.fromEntries(F.species.map(s => [s.id, s]));
const QUIZ = src('quiz.js');
// quiz.js juvCard and phaseWord, on core.js phaseOf, phaseKind and phasePair.
const gate = new Function(
  'phaseOf',
  'phaseKind',
  'phasePair',
  'PHASEC',
  block(QUIZ, 'function juvCard(', '\n}\n', {through: 1, file: 'quiz.js'}) +
    block(QUIZ, 'const phaseWord = ', ';\n', {through: 1, file: 'quiz.js'}) +
    '\nreturn {juvCard, phaseWord};'
)(C.phaseOf, C.phaseKind, C.phasePair, {WORD: {juvenile: 'Juvenile', male: 'Male', female: 'Female', intermediate: 'Intermediate'}});

test('tools/fish_juv_differs.json: every value with its https sources and their quote, every species in fish.json', () => {
  const vals = Object.values(J.species);
  assert.strictEqual(vals.filter(x => x.differs === true).length, 82);
  assert.strictEqual(vals.filter(x => x.differs === false).length, 25);
  assert.strictEqual(vals.filter(x => x.sub === true).length, 8);
  assert.strictEqual(J.unknown.length + Object.keys(J.species).length, 381);
  for (const [name, x] of Object.entries(J.species)) {
    assert.ok(BY[name], `${name}: a species of fish.json`);
    for (const [k, s, q] of [
      ['differs', 'src', 'q'],
      ['sub', 'sub_src', 'sub_q']
    ]) {
      if (!(k in x)) continue;
      assert.strictEqual(typeof x[k], 'boolean', `${name}: ${k}`);
      assert.ok(x[s].length && x[s].every(r => r.t && /^https:\/\//.test(r.u)), `${name}: ${s}`);
      assert.ok(String(x[q]).trim().length > 8, `${name}: ${q}`);
    }
  }
  for (const name of J.unknown) assert.ok(BY[name] && !J.species[name], `unknown: ${name}`);
});

test('fish.json species jd: as the file gives it, its sources without the quotes', () => {
  const withJd = F.species.filter(s => s.jd);
  assert.strictEqual(withJd.length, Object.keys(J.species).length);
  for (const s of withJd) {
    const x = J.species[s.name];
    assert.strictEqual(s.jd.d, x.differs, s.name);
    assert.strictEqual(s.jd.sub, x.sub, s.name);
    if ('differs' in x) assert.deepStrictEqual(s.jd.src, x.src, s.name);
    if ('sub' in x) assert.deepStrictEqual(s.jd.ssrc, x.sub_src, s.name);
  }
});

test('the build stops on a value without a source, a value not true or false, a species not in fish.json', () => {
  const run = m => {
    const tmp = path.join(os.tmpdir(), `fishjuvdiff.${process.pid}.${Math.random().toString(36).slice(2)}.json`);
    fs.writeFileSync(tmp, JSON.stringify(m));
    try {
      const r = spawnSync('python3', [path.join(ROOT, 'tools/build_fish.py'), '--regroup', '--check', '--juvdiff', tmp], {
        cwd: ROOT,
        encoding: 'utf8'
      });
      return {status: r.status, out: r.stdout + r.stderr};
    } finally {
      fs.unlinkSync(tmp);
    }
  };
  assert.strictEqual(run(J).status, 0, 'the file as it is passes, and fish.json is as it gives it');
  const edit = f => {
    const m = JSON.parse(JSON.stringify(J));
    f(m);
    return run(m);
  };
  let r = edit(m => (m.species['Diagramma melanacrum'].src = []));
  assert.notStrictEqual(r.status, 0);
  assert.match(r.out, /Diagramma melanacrum: a value without a source and its quote/);
  r = edit(m => (m.species['Diagramma pictum'].sub_q = ''));
  assert.match(r.out, /Diagramma pictum: a value without a source and its quote/);
  r = edit(m => (m.species['Diagramma melanacrum'].src = [{t: 'x', u: 'http://example.org'}]));
  assert.match(r.out, /a source is \{t, u \(https\)\}/);
  r = edit(m => (m.species['Diagramma melanacrum'].differs = 'yes'));
  assert.match(r.out, /differs is true or false/);
  r = edit(m => (m.species['Nemo imaginarius'] = m.species['Diagramma melanacrum']));
  assert.match(r.out, /Nemo imaginarius: not a species of fish.json/);
});

test('no effect on the game: only the juvenile card reads jd, never the draw, the ease or the judging', () => {
  const READ = /\.jd\b|\[['"]jd['"]\]|\bjd\s*:|\.get\(['"]jd['"]\)/;
  const files = [
    ...fs.readdirSync(ROOT).filter(f => /\.js$/.test(f)),
    ...fs
      .readdirSync(path.join(ROOT, 'tools'))
      .filter(f => /\.(py|js)$/.test(f))
      .map(f => 'tools/' + f)
  ].filter(f => !['quiz.js', 'tools/build_fish.py'].includes(f));
  assert.ok(files.includes('model.js') && files.includes('core.js') && files.includes('tools/fish_game.py'));
  for (const f of files) assert.ok(!READ.test(src(f)), `${f} reads jd`);
});

// Every photo in play through the gate: the photos of its species in play are the pool its adult is taken from.
const r = spawnSync('python3', [path.join(__dirname, 'fishjuvdiff_rec.py')], {cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28});
const REC = r.status === 0 ? JSON.parse(r.stdout.trim().split('\n').pop()) : {};
const PH = Object.entries(REC).map(([f, [sp, jt, ph]]) => ({f, sp, jt, ph: ph || undefined}));
const POOL = {};
PH.forEach(p => (POOL[p.sp] = POOL[p.sp] || []).push(p));
const card = f => {
  const p = PH.find(x => x.f === f);
  assert.ok(p, `${f} in play`);
  return gate.juvCard(p, SPS, POOL[p.sp]);
};

test('the photos Pierre reported: the juvenile sweetlips brings the card, the goatfish does not', () => {
  assert.strictEqual(r.status, 0, r.stderr);
  // «Celui là c'est un juvénile qui aurait mérité la carte» (Diagramma melanacrum, sourced as different)
  const c = card('fish-s597-cand-254656964');
  assert.ok(c && c.k === 'juvenile', JSON.stringify(c));
  assert.strictEqual(c.q.sp, 's597');
  assert.ok(!['juvenile', 'intermediate'].includes(C.phaseOf(c.q)), 'beside an adult');
  // the goatfish: a juvenile by the observer's stage, a species with no source either way (unknown): no card
  assert.strictEqual(C.phaseOf(PH.find(x => x.f === 'fish-s331-cand-269009395')), 'juvenile');
  assert.ok(!SPS.s331.jd);
  assert.strictEqual(card('fish-s331-cand-269009395'), null);
});

test('the gate on every photo in play: a card only where its source says so, always beside an adult of its species', () => {
  let juvOn = 0,
    juvOff = 0,
    subOn = 0,
    subOff = 0,
    noAdult = 0;
  for (const p of PH) {
    const w = C.phaseOf(p),
      kind = C.phaseKind(p),
      d = (SPS[p.sp] || {}).jd || {},
      c = gate.juvCard(p, SPS, POOL[p.sp]);
    if (kind === 'phase') {
      assert.strictEqual(c.k, 'phase', p.f);
      continue;
    }
    if (w === 'juvenile' || w === 'intermediate') {
      const due = d.d === true;
      if (c) {
        assert.ok(due, `${p.f}: a card with no source`);
        assert.strictEqual(c.k, 'juvenile');
        assert.strictEqual(c.q.sp, p.sp, p.f);
        assert.ok(!['juvenile', 'intermediate'].includes(C.phaseOf(c.q)), `${p.f}: beside an adult`);
      } else if (due) noAdult++;
      if (w === 'juvenile') c ? juvOn++ : juvOff++;
      else c ? subOn++ : subOff++;
    } else assert.strictEqual(c, null, `${p.f}: an adult brings no card`);
  }
  // The counts the PR states (the judging of 2026-11-20, #1323 merged: the sweetlips stays a sub-adult, Pierre: «Non
  // c'était bien un sub-adulte», and the goatfish lost its j): every photo sourced as different has an adult of its
  // species in play.
  // REE-189's judging pass: 4 more juveniles in play with no card (3 eel-tailed catfish schools, the observer's stage,
  // and a pelagic young flying gurnard), as every juvenile of a species with no source saying it differs.
  // REE-52's phase re-judge, batch 2: 7 more Diagramma pictum judged sub-adult, each beside an adult of its species.
  // REE-207's judging pass: 21 more juveniles in play with no card (9 blackvent damsels and 1 blue damsel, the
  // observer's stage; 11 striped catfish photos, no stage recorded, read on the photo), on species with no source
  // saying the young differ.
  // The judging pass REE-197's fix unblocked, Remoras and Stargazers: 8 more juveniles in play with no card (Echeneis
  // naucrates, the observer's stage), on a species with no source saying the young differ.
  // The same pass, Convict blennies and Jawfishes: 43 more juveniles in play with a card (Pholidichthys leucotaenia
  // schools, 3 by the observer's stage and 40 read on the photo; FishBase: the juveniles differ), each beside an adult.
  // REE-243's pass on the faved candidates beyond the cap: 2 more Pholidichthys leucotaenia juveniles in play with a card
  // (a school and a young one swimming with others, read on the photo), each beside an adult.
  assert.deepStrictEqual({juvOn, juvOff, subOn, subOff, noAdult}, {juvOn: 1211, juvOff: 1981, subOn: 15, subOff: 0, noAdult: 0});
  // the 15 sub-adults in play (14 Diagramma pictum and the Diagramma melanacrum sweetlips; their young sourced as
  // different), under the same rule
  const c = card('fish-s596-cand-552119382');
  assert.ok(c && c.k === 'juvenile' && gate.phaseWord(c.p, c.k) === 'Sub-adult', JSON.stringify(c));
});

test('one rule for juveniles and sub-adults: the card where the young are sourced as different, sub never read', () => {
  const sps = {a: {jd: {d: true, sub: false}}, b: {jd: {sub: true}}, c: {jd: {d: false}}},
    adult = sp => ({f: sp + '-ad', sp, jt: 'p1g0sl1'}),
    L = ['a', 'b', 'c'].map(adult);
  const sub = sp => ({f: sp + '-sub', sp, jt: 'p1g0sl1', ph: 'intermediate'}),
    juv = sp => ({f: sp + '-juv', sp, jt: 'p1g0sl1j'});
  assert.strictEqual(gate.juvCard(sub('a'), sps, L).k, 'juvenile', 'a sub-adult, differs true (sub false not read)');
  assert.strictEqual(gate.juvCard(sub('b'), sps, L), null, 'a sub-adult, differs unknown (sub true not read)');
  assert.strictEqual(gate.juvCard(sub('c'), sps, L), null, 'a sub-adult, differs false');
  assert.strictEqual(gate.juvCard(juv('a'), sps, L).k, 'juvenile', 'differs true');
  assert.strictEqual(gate.juvCard(juv('b'), sps, L), null, 'differs unknown');
  assert.strictEqual(gate.juvCard(juv('c'), sps, L), null, 'differs false');
  assert.strictEqual(gate.juvCard(juv('a'), sps, []), null, 'no adult to show beside it');
  assert.strictEqual(gate.juvCard(juv('a'), {}, L), null, 'a subject without the flags');
  // a parrotfish's initial phase (the phase flag p of a dimorph entry) keeps the sex or colour phase card
  assert.strictEqual(gate.juvCard({f: 'x', sp: 'b', jt: 'p1g0sl1p', ph: 'intermediate'}, sps, L).k, 'phase');
  assert.strictEqual(gate.phaseWord(sub('b'), 'juvenile'), 'Sub-adult');
  assert.strictEqual(gate.phaseWord(juv('a'), 'juvenile'), 'Juvenile');
  assert.strictEqual(gate.phaseWord(adult('a'), 'juvenile'), 'Adult');
});

test('the juvenile card says nothing of its own: its title names the two photos, no phase lines', () => {
  const fn = block(QUIZ, 'function phaseShow(', '\n}\n', {through: 1, file: 'quiz.js'});
  const show = (c, g) => {
    let o = null;
    const stubs = {
      TREEU: {sps: {}},
      safeUrl: u => u,
      GX: () => g,
      phasePair: () => null,
      phasePool: () => [],
      gamePhotoOk: () => true,
      photoTaxon: () => null,
      taxonLine: () => '',
      phaseOf: C.phaseOf,
      phaseWord: gate.phaseWord,
      img: x => x.f,
      esc: x => String(x).replace(/</g, '&lt;'),
      credit: () => 'c',
      cardShow: x => ((o = x), {querySelectorAll: () => []}),
      setTimeout: () => {},
      TIP: {WAIT: 0}
    };
    new Function(...Object.keys(stubs), fn + '\nreturn phaseShow;')(...Object.values(stubs))(c, 'u');
    return o;
  };
  const g = {phase: ['Juveniles look very different from adults']},
    j = {f: 'j', jt: 'p1g0sl1j'},
    a = {f: 'a', jt: 'p1g0sl1'};
  let o = show({p: j, k: 'juvenile', q: a}, g);
  assert.strictEqual(o.title, 'Juvenile and adult');
  assert.ok(!/phlines|different|careful/i.test(o.body + o.title), o.body);
  assert.strictEqual((o.body.match(/<figure>/g) || []).length, 2);
  o = show({p: {f: 's', jt: 'p1g0sl1', ph: 'intermediate'}, k: 'juvenile', q: a}, g);
  assert.strictEqual(o.title, 'Sub-adult and adult');
  // the sex or colour phase card keeps its lines
  o = show({p: {f: 'm', jt: 'p1g0sl1p', ph: 'male'}, k: 'phase'}, g);
  assert.match(o.body, /<p class="phlines"><b>IMR<\/b>: Juveniles look very different from adults<\/p>/);
});
