require('./slot.js').testGuard();
// The short feedback sheet (Pierre, 2026-11-18, rule C3; docs/reviews/2026-11-18-feedback-sheet-study.md): its one decisive
// line (quiz.js pairLine, pairText, fbLine), the sheet's shape (fbBody: verdict, species line and one line outside the More
// panel, the rest inside it, More and Next on one row) and the montage without its two notes. Run from quiz.js itself.
// node --test tests/fbsheet.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const block = require('./block.js');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const quiz = read('quiz.js'),
  app = read('app.js');

// Two fish families with IMR's lines for each other, three families with our own lines (apart) for pairs IMR does not
// declare, a coral genus with tips, a starred coral genus with none, and a fish species (no tips). Each lk / ap text names
// and describes the OTHER unit, as fish.json writes them.
const GEN = {
  'f:Butterflyfishes': {
    name: 'Butterflyfishes',
    qt: ['Disc-shaped body, small mouth', 'Often a dark band through the eye'],
    tl: 'ID tips (IMR)',
    lk: [['f:Angelfishes', 'Angelfish: spine on the gill cover, iridescent blue']]
  },
  'f:Angelfishes': {
    name: 'Angelfishes',
    qt: ['Spine on the gill cover'],
    tl: 'ID tips (IMR)',
    lk: [['f:Butterflyfishes', 'Butterflyfish: no opercular spine, no iridescent blue']],
    lksrc: {'f:Butterflyfishes': {t: 'a made-up source'}}
  },
  'f:Surgeonfishes': {
    name: 'Surgeonfishes',
    qt: ['Scalpel spine at the tail base'],
    tl: 'ID tips (IMR)',
    lk: [],
    ap: {'f:Rabbitfishes': 'Rabbitfish: no spine on the tail base'},
    apsrc: {'f:Rabbitfishes': 'FishBase, family Acanthuridae'}
  },
  'f:Rabbitfishes': {name: 'Rabbitfishes', qt: ['Venomous spines'], tl: 'ID marks (a made-up guide)', lk: []},
  'f:Damselfishes': {name: 'Damselfishes', qt: ['Small to medium size'], tl: 'ID tips (IMR)', lk: []},
  Porites: {
    qt: ['Small corallites, shared walls', 'Smooth lumps'],
    look: ['Montipora'],
    lsrc: {Montipora: 'Coral Finder p. 1'},
    tr: ['s1']
  },
  Montipora: {qt: ['Tiny corallites'], look: ['Porites']},
  Merulina: {sum: 'A summary, not a tip', look: ['Porites']},
  's:s091': {name: 'Ternate chromis', rank: 'species', qt: null, lk: []}
};
// a fish record has its IMR sub-entries and phases (core.js fishGen), none here
Object.values(GEN)
  .filter(g => g.name)
  .forEach(g => Object.assign(g, {sub: [], phase: []}));
const ctx = {
  GX: n => GEN[n],
  uname: n => `<u>${n}</u>`,
  glossAll: L => L.map(x => `~${x}`),
  tipsLabel: g => g.tl || 'ID tips (IMR)',
  esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
};
vm.createContext(ctx);
vm.runInContext(
  block(quiz, 'function pairLine(', "// The feedback sheet's own tally", {file: 'quiz.js'}) + '\nthis.M = {pairLine, pairText, fbLine};',
  ctx
);
const {pairLine, pairText, fbLine} = ctx.M;
const plain = o => JSON.parse(JSON.stringify(o));
// The text of a line of the sheet's markup (tests only): what follows each tag's closing bracket, the words kept, the spaces joined.
const text = h =>
  h
    .split('<')
    .map((s, i) => (i ? s.slice(s.indexOf('>') + 1) : s))
    .join('')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');

test('a pair line is the one a record gives for its look-alike: IMR first (lk), then ours (ap), each with its source', () => {
  assert.deepStrictEqual(plain(pairLine('f:Butterflyfishes', 'f:Angelfishes')), {
    t: 'Angelfish: spine on the gill cover, iridescent blue',
    s: 'IMR'
  });
  // an edited line names the source the editor gave, after IMR (Q359 a, e)
  assert.strictEqual(pairLine('f:Angelfishes', 'f:Butterflyfishes').s, 'IMR; a made-up source');
  // a pair IMR does not declare: our own line and the family's sources (rule C2), never IMR's name
  assert.deepStrictEqual(plain(pairLine('f:Surgeonfishes', 'f:Rabbitfishes')), {
    t: 'Rabbitfish: no spine on the tail base',
    s: 'FishBase, family Acanthuridae'
  });
  assert.strictEqual(pairLine('f:Rabbitfishes', 'f:Surgeonfishes'), null);
  assert.strictEqual(
    pairLine('Porites', 'Montipora'),
    null,
    'a coral pair has no line yet: its source label (lsrc) is a citation, not a line'
  );
  assert.strictEqual(pairLine('nobody', 'f:Angelfishes'), null);
  // an empty text is no line (the editor's pair with no words: core.js contentApply)
  GEN['f:Rabbitfishes'].lk = [['f:Surgeonfishes', '']];
  assert.strictEqual(pairLine('f:Rabbitfishes', 'f:Surgeonfishes'), null);
  GEN['f:Rabbitfishes'].lk = [];
});

test('both halves of a pair, the unit shown first, their sources once each', () => {
  const p = pairText('f:Butterflyfishes', 'f:Angelfishes');
  assert.strictEqual(p.t, 'Butterflyfish: no opercular spine, no iridescent blue · Angelfish: spine on the gill cover, iridescent blue');
  assert.strictEqual(p.s, 'IMR; a made-up source');
  // the other way round: the other half first
  assert.ok(pairText('f:Angelfishes', 'f:Butterflyfishes').t.startsWith('Angelfish: spine'));
  // one half only (ours, one side)
  assert.strictEqual(pairText('f:Rabbitfishes', 'f:Surgeonfishes').t, 'Rabbitfish: no spine on the tail base');
  assert.strictEqual(pairText('f:Damselfishes', 'f:Butterflyfishes'), null);
});

test('a miss: the pair line, both halves, its source small after it', () => {
  const h = fbLine('f:Butterflyfishes', 'f:Angelfishes', false, ['f:Butterflyfishes', 'f:Angelfishes']);
  assert.match(h, /^<p class="vs fbline">Butterflyfish: no opercular spine/);
  assert.match(h, / · Angelfish: spine on the gill cover, iridescent blue <small class="esrc">\(IMR; a made-up source\)<\/small><\/p>$/);
  // a pair of ours (apart): the family's sources, not IMR
  assert.match(
    fbLine('f:Surgeonfishes', 'f:Rabbitfishes', false, []),
    /Rabbitfish: no spine on the tail base <small class="esrc">\(FishBase, family Acanthuridae\)</
  );
  // the text is escaped
  GEN['f:Surgeonfishes'].ap['f:Rabbitfishes'] = '<b>x</b>';
  assert.match(fbLine('f:Surgeonfishes', 'f:Rabbitfishes', false, []), /&lt;b&gt;x&lt;\/b&gt;/);
  GEN['f:Surgeonfishes'].ap['f:Rabbitfishes'] = 'Rabbitfish: no spine on the tail base';
});

test('a miss with no pair line: the unit shown, its first tip with its source; never a line made from trait tags', () => {
  const h = fbLine('f:Damselfishes', 'f:Butterflyfishes', false, []);
  assert.strictEqual(text(h), 'f:Damselfishes: ~Small to medium size (IMR)');
  assert.ok(!h.includes('Often a dark band'), 'the first tip only');
  // corals: the first tip, whatever the pair's source label (lsrc) or trait tags (tr) say
  assert.strictEqual(text(fbLine('Porites', 'Montipora', false, [])), 'Porites: ~Small corallites, shared walls (IMR)');
  // the tips' source from their label, and the editor's after it
  GEN['f:Rabbitfishes'].qsrc = {t: 'an editor source'};
  assert.strictEqual(
    text(fbLine('f:Rabbitfishes', 'f:Damselfishes', false, [])),
    'f:Rabbitfishes: ~Venomous spines (a made-up guide; an editor source)'
  );
  delete GEN['f:Rabbitfishes'].qsrc;
  // "I don't know" and a typed unit (no choices): the same
  assert.strictEqual(text(fbLine('Porites', '', false, [])), 'Porites: ~Small corallites, shared walls (IMR)');
});

test('a right answer: the line telling it from a look-alike among the choices, else the first tip', () => {
  const among = fbLine('f:Butterflyfishes', 'f:Butterflyfishes', true, ['f:Damselfishes', 'f:Angelfishes', 'f:Butterflyfishes']);
  assert.match(text(among), /^Butterflyfish: no opercular spine, no iridescent blue · Angelfish: spine/);
  // no look-alike among the choices (or none with a line): the first tip
  assert.strictEqual(
    text(fbLine('f:Butterflyfishes', 'f:Butterflyfishes', true, ['f:Damselfishes', 'f:Rabbitfishes', 'f:Butterflyfishes'])),
    'f:Butterflyfishes: ~Disc-shaped body, small mouth (IMR)'
  );
  // a typed answer has no choices
  assert.strictEqual(
    text(fbLine('f:Butterflyfishes', 'f:Butterflyfishes', true, [])),
    'f:Butterflyfishes: ~Disc-shaped body, small mouth (IMR)'
  );
  // a choice that is no unit is skipped, not read
  assert.doesNotThrow(() => fbLine('f:Butterflyfishes', 'f:Butterflyfishes', true, ['nobody', 'f:Butterflyfishes']));
});

test('no tip, no line: a starred coral genus with only a summary, a fish species', () => {
  assert.strictEqual(fbLine('Merulina', 'Porites', false, []), '');
  assert.strictEqual(fbLine('s:s091', 's:s091', true, []), '');
  assert.strictEqual(fbLine('s:s091', '', false, []), '');
});

test('the line is read from the record, never from a subject (rule S1)', () => {
  const code = block(quiz, 'function pairLine(', "// The feedback sheet's own tally", {file: 'quiz.js'}).replace(/\/\/.*$/gm, '');
  assert.ok(!/['"`](fish|coral|seaslug)['"`]|SUBJ\b|SUBJECTS/.test(code), 'no subject named in the line chooser');
});

// The sheet itself, built as the app builds it (fbBody), from the real app.js and quiz.js helpers it uses.
test('fbBody: the verdict, the species line and one line outside More; the rest inside; More and Next on one row', () => {
  const C = {
    ...ctx,
    GX: n => GEN[n],
    hr: x => '#' + x,
    sheetTab: () => '',
    isBenthic: () => false,
    isBonus: () => false,
    setOf: () => ({}),
    vernFirst: () => '',
    altName: s => s,
    unameT: n => n,
    namesLine: () => '<p class="vs ndiff">Similar names</p>',
    gloss: x => x,
    tipsText: g => (g.qt || []).join(' · '),
    tipsList: g => `<ul class="crit idtips imrfb">${(g.qt || []).map(x => `<li>${x}</li>`).join('')}</ul>`,
    esrcTag: () => '',
    critRef: () => 'Coral Finder p. 1',
    credit: () => 'credit',
    taxonLine: t => (t ? '<p class="fbsp">This photo: a species</p>' : ''),
    againLeft: () => true,
    uname: n => `<u>${n}</u>`
  };
  vm.createContext(C);
  vm.runInContext(
    block(quiz, 'function pairLine(', "// The feedback sheet's own tally", {file: 'quiz.js'}) +
      block(quiz, 'function fbBody(', '\n}\n', {through: 1, file: 'quiz.js'}) +
      '\nthis.fbBody = fbBody;',
    C
  );
  const html = C.fbBody(
    'f:Butterflyfishes',
    'f:Angelfishes',
    false,
    false,
    true,
    [{}],
    '',
    null,
    {sci: 'X'},
    ['f:Angelfishes'],
    '<button class="rep">⚑</button>'
  );
  const [top, more] = html.split('<div class="fbmore" id="fbmore" hidden>');
  assert.ok(more, 'the More panel is there, hidden');
  // outside More: the verdict, the species line, the one line; nothing else
  assert.match(top, /<h3 class="ko">/);
  assert.match(top, /<\/h3><p class="fbsp">This photo: a species<\/p><p class="vs fbline">Butterflyfish: no opercular spine/);
  assert.ok(!/tipbox|Your answer|Similar names|again|rep"|credit/.test(top), 'no tips, mix-up lines, report or credits on the short sheet');
  assert.strictEqual(top.split('<p class="vs').length - 1, 1, 'one decisive line');
  // inside More: the ID tips, why the answer given is another unit, the duel line, the credits, the report button
  const panel = more.slice(0, more.indexOf('</div>\n  </div>'));
  assert.match(panel, /tipbox fbtips/);
  assert.match(panel, /Similar names/);
  assert.match(panel, /Your answer, <u>f:Angelfishes<\/u>, would show/);
  assert.match(panel, /This pair comes back as a duel/);
  assert.match(panel, /<p class="credit">credit<\/p>/);
  assert.match(panel, /<button class="rep">/);
  assert.ok(!/Tell them apart/.test(html), 'the pair line is not said twice');
  // More and Next on one row, More a button naming the panel it opens
  assert.match(
    html,
    /<div class="fbrow"><button class="next sec" type="button" id="fbmbtn" aria-controls="fbmore" aria-expanded="false">More<\/button><button class="next" type="button" id="next">Next <kbd>↵<\/kbd><\/button><\/div>$/
  );
  // a right answer carries no "Your answer would show" and no duel line
  const ok = C.fbBody(
    'f:Butterflyfishes',
    'f:Butterflyfishes',
    true,
    false,
    false,
    [],
    '',
    null,
    null,
    ['f:Angelfishes', 'f:Butterflyfishes'],
    ''
  );
  assert.ok(!/Your answer|duel/.test(ok));
  assert.match(ok, /<h3 class="ok cheer">/);
});

test('the quiz montage keeps its ✓ / ✗ name chips and drops its two notes', () => {
  const code = block(quiz, 'const fig = (p, n, cls) =>', 'st0.classList.add', {file: 'quiz.js'});
  assert.ok(!/<small>/.test(code), 'no note under the names');
  assert.ok(!/The photo shown|Your answer, same view/.test(quiz), 'the notes are gone');
  assert.ok(!/\.qph small/.test(read('app.css')), 'and their style');
});
