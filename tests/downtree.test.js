require('./slot.js').testGuard();
// Down the tree (proto/downtree.js): the drawing, run in Node on stubs as tests/matrixgame.test.js runs Matrix's. Rule L4: a step
// is asked only on a unit the player has unlocked, so the walk stops at the finest rank met; the names of a step are of one
// rank, no two of one label, its siblings first. The page is untimed and changes no progress: its code, and the shared helpers
// it uses (proto/lab.js labShots, labSheet), never call the quiz's recorders. Rule S1: no subject is named in it.
const test = require('node:test');
const block = require('./block.js');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const SRC = read('proto/downtree.js'),
  LAB = read('proto/lab.js'),
  SHARED = block(LAB, 'const labObs', 'function viewLab(', {file: 'proto/lab.js'});
const ctx = {};
vm.createContext(ctx);
vm.runInContext(
  block(SRC, 'function dtLineage', 'LAB.add(', {file: 'proto/downtree.js'}) +
    '\nthis.lineage = dtLineage; this.steps = dtSteps; this.choices = dtChoices;',
  ctx
);
// (arrays made in the vm's realm: copied into this one for deepStrictEqual)
const copy =
  f =>
  (...a) => {
    const r = f(...a);
    return Array.isArray(r) ? Array.from(r) : r;
  };
const lineage = copy(ctx.lineage),
  steps = copy(ctx.steps),
  choices = copy(ctx.choices);
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const ok = () => true;

// A made-up tree: families F1, F2 (no parent); genera G1, G2 under F1, G3 under F2; species S1, S2 under G1, S3 under G2.
const UP = {G1: 'F1', G2: 'F1', G3: 'F2', S1: 'G1', S2: 'G1', S3: 'G2'};
const up = o => UP[o] || '';
const has = o => /^[FGS]\d$/.test(o);

test('the lineage runs from the broadest unit down to the unit', () => {
  assert.deepStrictEqual(lineage('S1', up, has), ['F1', 'G1', 'S1']);
  assert.deepStrictEqual(lineage('G3', up, has), ['F2', 'G3']);
  assert.deepStrictEqual(lineage('F1', up, has), ['F1']);
  assert.deepStrictEqual(lineage('', up, has), []);
});

test('a parent that is no unit of the game starts the walk under it (a sea slug genus under its family)', () => {
  const slug = o => ({SG: 'SF', SS: 'SG'})[o] || '';
  assert.deepStrictEqual(
    lineage('SS', slug, o => o !== 'SF'),
    ['SG', 'SS']
  );
  // a loop in the data never loops
  assert.deepStrictEqual(
    lineage(
      'A',
      o => ({A: 'B', B: 'A'})[o],
      () => true
    ).length,
    2
  );
});

test('the steps are the units from the top while each is unlocked (rule L4), never one past a unit not unlocked', () => {
  const chain = ['F1', 'G1', 'S1'];
  assert.deepStrictEqual(steps(chain, ok), chain);
  assert.deepStrictEqual(
    steps(chain, o => o !== 'S1'),
    ['F1', 'G1']
  );
  assert.deepStrictEqual(
    steps(chain, o => o === 'F1'),
    ['F1']
  );
  // the species unlocked but not its genus: the walk stops above them both
  assert.deepStrictEqual(
    steps(chain, o => o !== 'G1'),
    ['F1']
  );
  assert.deepStrictEqual(
    steps(chain, () => false),
    []
  );
  assert.deepStrictEqual(steps([], ok), []);
});

test('a step offers its unit and 2 or 3 others of its rank, never two of one label, the siblings first', () => {
  const rnd = seeded(9),
    peers = ['S1', 'S2', 'S3', 'S4', 'S5'],
    more = ['S6', 'S7'];
  for (let k = 0; k < 300; k++) {
    const c = choices('S1', peers, ['S4'], ok, ok, more, rnd);
    assert.strictEqual(c.length, 4);
    assert.ok(c.includes('S1'));
    assert.strictEqual(new Set(c).size, 4);
    // a declared look-alike among the siblings is always there, the others come from the siblings before any more
    assert.ok(c.includes('S4'), `the look-alike is missing from ${c}`);
    assert.ok(
      c.every(o => peers.includes(o)),
      `a name of another parent came before the siblings were used: ${c}`
    );
  }
  // the place of the right name is random
  const at = new Set();
  for (let k = 0; k < 200; k++) at.add(choices('S1', peers, [], ok, ok, more, rnd).indexOf('S1'));
  assert.strictEqual(at.size, 4, 'the right name is always in the same place');
});

test('unlocked names come before the others, and the others fill up when too few are unlocked (any unit may be a wrong name)', () => {
  const rnd = seeded(4),
    peers = ['S1', 'S2', 'S3', 'S4'],
    open = o => o === 'S1' || o === 'S3';
  for (let k = 0; k < 100; k++) {
    const c = choices('S1', peers, [], open, ok, ['S9'], rnd);
    assert.ok(c.includes('S3'), 'the one unlocked sibling is always offered');
    assert.strictEqual(c.length, 4);
  }
  // only the unit alone: the more fill it up, three names at least
  const c = choices('S1', ['S1'], [], open, ok, ['S8', 'S9'], rnd);
  assert.deepStrictEqual([...c].sort(), ['S1', 'S8', 'S9']);
});

test('names one label gives are never together; fewer than three names: no step', () => {
  const same = (a, b) => ![['S1', 'S2']].some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const rnd = seeded(2);
  for (let k = 0; k < 200; k++) {
    const c = choices('S1', ['S1', 'S2', 'S3', 'S4', 'S5'], [], ok, same, [], rnd);
    assert.ok(!(c.includes('S1') && c.includes('S2')), `${c}`);
  }
  assert.strictEqual(choices('S1', ['S1', 'S2'], [], ok, ok, [], rnd), null);
  assert.strictEqual(choices('S1', [], [], ok, ok, [], rnd), null);
  // the unit is never its own wrong name, and a name twice counts once
  assert.strictEqual(choices('S1', ['S1', 'S2', 'S2'], ['S1'], ok, ok, [], rnd), null);
});

test('the page is untimed and changes no progress: it never calls the quiz recorders, nor reads the data look-alikes', () => {
  const strip = t =>
    t
      .split('\n')
      .map(l => l.replace(/(^|\s)\/\/.*$/, ''))
      .join('\n');
  for (const [what, code] of [
    ['proto/downtree.js', strip(SRC)],
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
  assert.match(code, /unlocked\(/, 'the units the player has unlocked (rule L4)');
  assert.match(code, /labShots\(/, "the draw's own photo choice, through the shared source");
  assert.match(code, /choiceNames\(/, 'one label for two units is no choice');
  // The tree is read from the records (parent, rank), never from a subject's name (rule S1).
  assert.match(code, /\.parent/);
  assert.ok(
    !/['"](fish|coral|seaslug|corals)['"]|SUBJECTS\[|SUBJ\.id\s*[=!]==/.test(code),
    'proto/downtree.js tests which subject it runs'
  );
  // The photo's source and the enlarged view's names come only at the end of the walk (rule P5): the figure has no caption.
  const fig = code.slice(code.indexOf('const fig ='), code.indexOf('root.innerHTML = `<div class="q bleed dtq">'));
  assert.ok(!/figcaption|photoSrc|uname/.test(fig), 'the photo names its unit before the walk is over');
  assert.match(code, /blind: \(\) => !done/);
  // The step's names are not the quiz's answers (app.js qAnswers opens and closes every [data-c]).
  assert.match(code, /data-n=/);
  assert.ok(!/<button[^>]*data-c=/.test(code));
});

test('the units of the walk are the game’s own (Codex review #1387), the species the scientific ones, a lost photo closes the steps', () => {
  const code = SRC.split('\n')
    .map(l => l.replace(/(^|\s)\/\/.*$/, ''))
    .join('\n');
  // membership in the game's units, never "has a record": a sea slug genus's family is a record that is not a unit
  assert.match(code, /has = o => W\.set\.has\(o\)/);
  assert.ok(!/has = o => !!GX\(o\)/.test(code));
  assert.match(code, /par && W\.set\.has\(par\)/);
  // the candidates: a species only by its scientific unit (the common-name species hang from the family)
  assert.match(code, /o === spUnitId\('sci', GX\(o\)\.sp\)/);
  // a photo that cannot load closes the question (.qnone): neither a tap nor a key takes a step, the names are disabled
  assert.match(code, /if \(done \|\| q\.classList\.contains\('qnone'\)\) return;/);
  assert.match(code, /b\.disabled = q\.classList\.contains\('qnone'\)/);
  assert.match(code, /new MutationObserver\(gate\)/);
  // Codex review #1387, second round: offered only where the subject on screen is a tree subject (TREEU stays loaded after a switch
  // to the corals), the tries spent only on candidates that can give two steps, cycling through them
  assert.match(code, /typeof UNITS\[SUBJ\.id\]\.gen === 'function'/);
  assert.match(code, /viable = cand\.filter\(o => dtSteps\(dtLineage\(o, up, has\), isOpen\)\.length >= 2 \|\| below\.has\(o\)\)/);
  assert.match(code, /L\[i % L\.length\]/);
  const app = read('app.js'),
    gens = [...app.matchAll(/^ {2}gen: \(\) =>|^ {4}\.\.\.TREE_UNITS,/gm)].length;
  assert.strictEqual(gens, 3, 'gen is the tree subjects’ own member (TREE_UNITS: the fish, the sea slugs), not the corals’');
  // a sea slug tree on the pure part: the family is not a unit of the game, the walk is genus then species
  const slug = o => ({'g:A': 'fam:X', 'sci:a1': 'g:A'})[o] || '';
  assert.deepStrictEqual(
    lineage('sci:a1', slug, o => o !== 'fam:X'),
    ['g:A', 'sci:a1']
  );
  assert.deepStrictEqual(
    steps(
      lineage('sci:a1', slug, o => o !== 'fam:X'),
      () => true
    ),
    ['g:A', 'sci:a1']
  );
});

test('registered: the Tools list, the service worker list and the hub icon; offered only where a unit has finer ones under it', () => {
  const sw = read('sw.js');
  assert.match(block(LAB, 'files: [', '],', {file: 'proto/lab.js'}), /'downtree'/);
  assert.match(block(sw, '...[', '].map(f =>', {file: 'sw.js'}), /'downtree'/);
  assert.match(block(LAB, 'const LAB_ICONS = {', '};', {file: 'proto/lab.js'}), /\bdowntree:/);
  assert.match(SRC, /id: 'downtree'/);
  assert.match(SRC, /on: \(\) =>/);
  // never an edit of the stamped Lab version (rule W15)
  assert.match(LAB, /const LAB_V = \d+;/);
});
