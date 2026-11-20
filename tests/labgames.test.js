require('./slot.js').testGuard();
// The Lab tools that ask about one unit on the subject on screen, Type the genus, Blur reveal and the Look-alike web
// (proto/type.js, proto/reveal.js, proto/web.js; Q437, Pierre, 2026-11-19): the draw (proto/lab.js labDraw) run in Node on
// stubs, and what the three files must and must not read (rule S1: one shared engine, no subject named in it; rule L4: the
// units are the unlocked ones; rule U13: nothing scored, logged or saved). The pages are played by tests/labgames.check.js
// in the pages, fish and sea slug smokes.
const test = require('node:test');
const block = require('./block.js');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const LAB = read('proto/lab.js'),
  FILES = {'proto/type.js': read('proto/type.js'), 'proto/reveal.js': read('proto/reveal.js'), 'proto/web.js': read('proto/web.js')},
  APP = read('app.js');
const strip = t =>
  t
    .split('\n')
    .map(l => l.replace(/(^|\s)\/\/.*$/, ''))
    .join('\n');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(block(LAB, 'function labDraw(', '// The view buttons', {file: 'proto/lab.js'}) + '\nthis.draw = labDraw;', ctx);
const draw = ctx.draw;
// A photo source on stubs: unit → its photos by view; photo(n, want) as lab.js labShots gives it (null: none).
const LIB = {A: {wide: 'a1', macro: 'a2'}, B: {macro: 'b1'}, C: {}, D: {wide: 'd1'}};
const photo = (n, want) => {
  const L = LIB[n] || {},
    v = want && want.view;
  const f = v ? L[v] : Object.values(L)[0];
  return f ? {f} : null;
};
// a fixed random sequence
const seq = a => {
  let i = 0;
  return () => a[i++ % a.length];
};

test('a unit with a photo is drawn, in the view asked for when it has one, else in another', () => {
  for (let k = 0; k < 200; k++) {
    const d = draw(['A', 'B', 'D'], photo, 'macro');
    assert.ok(d && ['A', 'B', 'D'].includes(d.t));
    // A and B have a macro photo; D has none, so its photo is the wide one: never a null photo
    assert.ok(d.p && d.p.f, 'a photo');
    if (d.t === 'D') assert.strictEqual(d.p.f, 'd1');
    else assert.strictEqual(d.p.f, d.t === 'A' ? 'a2' : 'b1');
  }
});

test('units with no photo are passed over, each tried once; none at all is null, never a loop', () => {
  assert.strictEqual(draw(['C', 'Z'], photo, 'any'), null);
  assert.strictEqual(draw([], photo, 'any'), null);
  for (let k = 0; k < 100; k++) assert.strictEqual(draw(['C', 'Z', 'D', 'C'], photo, 'any').t, 'D');
  // a long list of photo-less units with the one that has a photo at the end: capped, so it may miss it, but ends
  const long = [...Array(300).fill('C'), 'D'].map((n, i) => (n === 'C' ? 'C' + i : n));
  const t0 = Date.now();
  draw(long, photo, 'any');
  assert.ok(Date.now() - t0 < 500);
});

test('every unit comes up, the order is the random one, and a unit listed twice is one', () => {
  const seen = new Set();
  for (let k = 0; k < 600; k++) seen.add(draw(['A', 'B', 'D', 'A'], photo, 'any').t);
  assert.deepStrictEqual([...seen].sort(), ['A', 'B', 'D']);
  // the shuffle follows the random numbers it is given
  assert.strictEqual(draw(['A', 'B', 'D'], photo, 'any', seq([0, 0])).t, 'B');
});

test('the three tools run on the subject on screen: its units, its names, its pairs; nothing coral-only is read', () => {
  for (const [f, src] of Object.entries(FILES)) {
    const code = strip(src);
    for (const bad of [
      'labPlay',
      'labNames',
      'labNone',
      'labChoices',
      'CORALS',
      'DATA\\.gen',
      'lookAlikes',
      'viewPhoto',
      'thumbSrc',
      'tipsText'
    ])
      assert.ok(!new RegExp(`\\b${bad}\\b`).test(code), `${f} reads ${bad} (the corals' data or helpers)`);
    // rule S1: no test of which subject is on screen
    assert.ok(!/SUBJ\.id\s*[=!]==|SUBJECTS\[\d\]|inSubject\(/.test(code), `${f} tests or switches the subject`);
    for (const rec of [
      'question',
      'answer',
      'recordAnswer',
      'logAnswer',
      'seenAdd',
      'duelPick',
      'dataLooks',
      'introAdd',
      'qclockArm',
      'syncSoon',
      'store.set'
    ])
      assert.ok(!new RegExp(`\\b${rec.replace('.', '\\.')}\\(`).test(code), `${f} calls ${rec}: it is untimed and changes no progress`);
  }
  for (const f of ['proto/type.js', 'proto/reveal.js']) {
    const code = strip(FILES[f]);
    assert.match(code, /\bunlocked\(\)/, `${f}: the units the player has unlocked (rule L4)`);
    assert.match(code, /labShots\(/, `${f}: the draw's own photo choice, through the shared source`);
    assert.match(code, /labDraw\(/, `${f}: one unit and one photo, through the shared draw`);
  }
  const web = strip(FILES['proto/web.js']);
  assert.match(web, /UNITS\[SUBJ\.id\]\s*\.pairs\(\)/, "the subject's declared pairs");
  assert.match(web, /UNITS\[SUBJ\.id\]\.webBy\(\)/, "the subject's own colourings");
  assert.match(strip(FILES['proto/type.js']), /typeUnit\(m, t, typeSp\)/, "the quiz's own reading of a typed answer");
  assert.match(strip(FILES['proto/type.js']), /kindRank\(t\)/, 'the class of the unit asked (its rank and kind of name, as the quiz)');
  assert.match(strip(FILES['proto/reveal.js']), /distractors\(t, pool\(\)/, "the quiz's own wrong choices");
});

test('the titles and blurbs say the subject on screen by its own words (SUBJ.one, SUBJ.what, SUBJ.many)', () => {
  // the getter and the lines after it (a template with ${...} in it has braces: a fixed window, not a [^}] span)
  const after = (f, g) => {
    const i = FILES[f].indexOf(g);
    assert.ok(i >= 0, `${f}: ${g}`);
    return FILES[f].slice(i, i + 260);
  };
  assert.match(after('proto/type.js', 'get title()'), /Type the \$\{SUBJ\.one\}/);
  assert.match(after('proto/type.js', 'get blurb()'), /SUBJ\.what[\s\S]*SUBJ\.one/);
  assert.match(after('proto/reveal.js', 'get blurb()'), /SUBJ\.what[\s\S]*SUBJ\.one/);
  assert.match(after('proto/web.js', 'get blurb()'), /SUBJ\.one/);
  assert.match(after('proto/web.js', 'get lede()'), /SUBJ\.many/);
});

test('every subject declares how the web colours its units (app.js UNITS webBy), once', () => {
  const ids = require('../core.js').SUBJECTS.map(s => s.id);
  assert.ok(ids.length >= 3, ids.join());
  const n = (APP.match(/^ {4}webBy: \(\) =>/gm) || []).length;
  assert.strictEqual(n, ids.length, `${n} webBy declarations for ${ids.length} subjects`);
});

test('the coral-only tools still read the corals through their own helpers, with the reason on them', () => {
  // The tools that need the corallite traits keep labPlay, which says why (lab.js)
  assert.match(
    LAB,
    /Spot the feature, the\s*\/\/ Zoom ladder, Elimination, Anatomy\), which\s*\n?\s*\/\/ stay the corals' for that reason|stay the corals' for that reason/
  );
  for (const f of ['spot', 'zoom', 'elim', 'anatomy']) assert.match(read(`proto/${f}.js`), /labPlay\(\)/, `${f} keeps the corals' units`);
});
