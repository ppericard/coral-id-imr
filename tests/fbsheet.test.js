require('./slot.js').testGuard();
// The short feedback sheet (rule C3; docs/reviews/2026-11-18-feedback-sheet-study.md): its one decisive line (quiz.js
// pairLine, pairText, fbLine), the sheet's shape (fbBody: verdict, species line and one line outside the More panel, the
// rest inside it, More and Next on one row) and the montage without its two notes. Run from quiz.js itself.
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
// a fish record has its IMR sub-entries and phases (core.js treeGen), none here
Object.values(GEN)
  .filter(g => g.name)
  .forEach(g => Object.assign(g, {sub: [], phase: []}));
const ctx = {
  GX: n => GEN[n],
  uname: n => `<u>${n}</u>`,
  glossAll: L => L.map(x => `~${x}`),
  tipsLabel: g => g.tl || 'ID tips (IMR)',
  esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  // a player not at IMR (the main common name first: app.js cnFirst, below), the links of the sources (mimSrc)
  imrSaid: () => false,
  safeUrl: u => u,
  ORG: require('../core.js').ORG
};
// The card's short source form (quiz.js mimSrc), which the mimicry pair's marks use on the sheet too, and the name a
// player sees first (app.js cnList, cnFirst).
const MIMSRC =
  block(quiz, 'const mimSrc = L =>', "\n    .join('; ');", {through: 1, file: 'quiz.js'}) +
  '\n' +
  block(app, 'const cnList = s =>', '\n// The name a multiple-choice', {file: 'app.js'});
vm.createContext(ctx);
vm.runInContext(
  MIMSRC +
    '\n' +
    block(quiz, 'function pairLine(', "// The feedback sheet's own tally", {file: 'quiz.js'}) +
    '\nthis.M = {pairLine, pairText, fbLine, mimMarks};',
  ctx
);
const {pairLine, pairText, fbLine, mimMarks} = ctx.M;
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
  // an edited line names the source the editor gave, after IMR
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
  // IMR's own name is not said on the line (Pierre, 2026-11-21 05:53); the editor's source stays
  assert.match(h, / · Angelfish: spine on the gill cover, iridescent blue <small class="esrc">\(a made-up source\)<\/small><\/p>$/);
  assert.ok(!/IMR/.test(h), 'no IMR label on the line');
  // IMR alone (no editor's source): no source at all, so no "(IMR)" line of its own; pairLine still reports IMR as the
  // source (the Compare page and the More panel say it, rule C2)
  const lks = GEN['f:Angelfishes'].lksrc;
  delete GEN['f:Angelfishes'].lksrc;
  const alone = fbLine('f:Butterflyfishes', 'f:Angelfishes', false, []);
  assert.ok(alone.endsWith('iridescent blue</p>') && !/esrc|IMR/.test(alone), 'IMR alone says nothing: ' + alone);
  assert.strictEqual(pairLine('f:Butterflyfishes', 'f:Angelfishes').s, 'IMR');
  GEN['f:Angelfishes'].lksrc = lks;
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
  assert.strictEqual(text(h), 'f:Damselfishes: ~Small to medium size');
  assert.ok(!h.includes('Often a dark band'), 'the first tip only');
  // corals: the first tip, whatever the pair's source label (lsrc) or trait tags (tr) say
  assert.strictEqual(text(fbLine('Porites', 'Montipora', false, [])), 'Porites: ~Small corallites, shared walls');
  // the tips' source from their label, and the editor's after it
  GEN['f:Rabbitfishes'].qsrc = {t: 'an editor source'};
  assert.strictEqual(
    text(fbLine('f:Rabbitfishes', 'f:Damselfishes', false, [])),
    'f:Rabbitfishes: ~Venomous spines (a made-up guide; an editor source)'
  );
  delete GEN['f:Rabbitfishes'].qsrc;
  // "I don't know" and a typed unit (no choices): the same
  assert.strictEqual(text(fbLine('Porites', '', false, [])), 'Porites: ~Small corallites, shared walls');
});

test('a right answer: the line telling it from a look-alike among the choices, else the first tip', () => {
  const among = fbLine('f:Butterflyfishes', 'f:Butterflyfishes', true, ['f:Damselfishes', 'f:Angelfishes', 'f:Butterflyfishes']);
  assert.match(text(among), /^Butterflyfish: no opercular spine, no iridescent blue · Angelfish: spine/);
  // no look-alike among the choices (or none with a line): the first tip
  assert.strictEqual(
    text(fbLine('f:Butterflyfishes', 'f:Butterflyfishes', true, ['f:Damselfishes', 'f:Rabbitfishes', 'f:Butterflyfishes'])),
    'f:Butterflyfishes: ~Disc-shaped body, small mouth'
  );
  // a typed answer has no choices
  assert.strictEqual(text(fbLine('f:Butterflyfishes', 'f:Butterflyfishes', true, [])), 'f:Butterflyfishes: ~Disc-shaped body, small mouth');
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
function bodyCtx() {
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
    // the answer's Compare link follows the subject's pages (quiz.js fbBody)
    SUBJ: {id: 's', pages: ['cmp']},
    UNITS: {s: {inGame: () => true}},
    credit: () => 'credit',
    taxonLine: t => (t ? '<p class="fbsp">This photo: a species</p>' : ''),
    againLeft: () => true,
    uname: n => `<u>${n}</u>`,
    ORG: require('../core.js').ORG
  };
  vm.createContext(C);
  vm.runInContext(
    MIMSRC +
      '\n' +
      block(quiz, 'function pairLine(', "// The feedback sheet's own tally", {file: 'quiz.js'}) +
      block(quiz, 'function fbBody(', '\n}\n', {through: 1, file: 'quiz.js'}) +
      '\nthis.fbBody = fbBody;',
    C
  );
  return C;
}
test('fbBody: the verdict, the species line and one line outside More; the rest inside; More and Next on one row', () => {
  const C = bodyCtx();
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
  assert.ok(!/tipbox|Your answer|Similar names|again|credit/.test(top), 'no tips, mix-up lines or credits on the short sheet');
  assert.strictEqual(top.split('<p class="vs').length - 1, 1, 'one decisive line');
  // the report button (rule U14) is on the sheet under the decisive line, never behind More, after a miss and after a right answer
  assert.match(
    top,
    /<p class="vs fbline">[^]*<\/p><p class="fbrep"><button class="rep">⚑<\/button><\/p>\s*$/,
    'the report button, in view'
  );
  assert.ok(!/class="rep"/.test(more), 'and not behind More');
  // inside More: the ID tips, why the answer given is another unit, the duel line, the credits, the report button
  const panel = more.slice(0, more.indexOf('</div>\n  </div>'));
  assert.match(panel, /tipbox fbtips/);
  assert.match(panel, /Similar names/);
  assert.match(panel, /Your answer, <u>f:Angelfishes<\/u>, would show/);
  // Compare them follows the subject's pages and its units, never the shape of the record (Q437)
  assert.match(panel, /<a class="linkish" href="#cmp-f:Butterflyfishes\|f:Angelfishes">Compare them<\/a>/);
  C.SUBJ.pages = ['quiz'];
  assert.ok(!/Compare them/.test(C.fbBody('f:Butterflyfishes', 'f:Angelfishes', false, false, true, [{}], '', null, {sci: 'X'}, [], '')));
  C.SUBJ.pages = ['cmp'];
  C.UNITS.s.inGame = n => n !== 'f:Angelfishes';
  assert.ok(!/Compare them/.test(C.fbBody('f:Butterflyfishes', 'f:Angelfishes', false, false, true, [{}], '', null, {sci: 'X'}, [], '')));
  C.UNITS.s.inGame = () => true;
  assert.match(panel, /This pair comes back as a duel/);
  assert.match(panel, /<p class="credit">credit<\/p>/);
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
  // no report button given (a game that has none): no empty line
  assert.ok(!/fbrep/.test(ok), 'no report line without a button');
  const okRep = C.fbBody(
    'f:Butterflyfishes',
    'f:Butterflyfishes',
    true,
    false,
    false,
    [],
    '',
    null,
    null,
    [],
    '<button class="rep">⚑</button>'
  );
  assert.match(okRep.split('<div class="fbmore"')[0], /<p class="fbrep"><button class="rep">⚑<\/button><\/p>/, 'a right answer has it too');
});

test('the quiz montage keeps its ✓ / ✗ name chips and drops its two notes', () => {
  const code = block(quiz, 'const fig = (p, n, cls) =>', 'st0.classList.add', {file: 'quiz.js'});
  assert.ok(!/<small>/.test(code), 'no note under the names');
  assert.ok(!/The photo shown|Your answer, same view/.test(quiz), 'the notes are gone');
  assert.ok(!/\.qph small/.test(read('app.css')), 'and their style');
});

// A mimicry pair's entry (app.js mimLay) between two families of GEN that have IMR's line for each other: species s1 of
// the butterflyfishes (a, the side that resembles; a common name) and s2 of the angelfishes (b; no common name), with
// made-up marks and sources (fish.json lookalikes writes each mark's sources as {t, u}).
const ENTRY = (marks = MARKS) => ({
  sp: 's1',
  st: 'juvenile',
  u: ['s:s1', 'f:Butterflyfishes'],
  m: ['s:s2', 'f:Angelfishes'],
  na: {sci: 'Aus unus', cn: [['Bluespot butterflyfish', 'Blue-spot butterflyfish'], ['Spotty']]},
  nb: {sci: 'Bus duo', cn: []},
  pair: {id: 'X1', b: 's2', marks}
});
const MARKS = [
  {side: 'b', t: 'A spine at the cheek', src: [{t: 'Australian Museum, Bus duo', u: 'https://example.org/b'}]},
  {
    side: 'a',
    t: 'A scalpel on the tail base',
    src: [{t: 'IMR fish presentation, Surgeonfish'}, {t: 'FishBase, Aus unus', u: 'https://example.org/a'}]
  },
  {
    side: 'a',
    t: 'A dark blotch above the anal fin',
    src: [{t: 'Randall 2005, A review of resemblance, p. 317', u: 'https://example.org/r'}]
  }
];

test('a mix-up of a mimicry pair: the pair’s marks make the line, one per side, the photo’s species first, sourced', () => {
  const ch = ['f:Butterflyfishes', 'f:Angelfishes'],
    h = fbLine('f:Butterflyfishes', 'f:Angelfishes', false, ch, ENTRY());
  assert.strictEqual(
    text(h),
    'Bluespot butterflyfish: A scalpel on the tail base · Bus duo: A spine at the cheek (IMR fish presentation; FishBase; Australian Museum)'
  );
  assert.match(h, /^<p class="vs fbline">Bluespot butterflyfish: A scalpel/, 'one decisive line, in its place');
  assert.match(h, /<i>Bus duo<\/i>/, 'a species with no common name: its scientific name');
  assert.match(
    h,
    /<small class="esrc">\(IMR fish presentation; <a href="https:\/\/example.org\/a" target="_blank" rel="noopener">FishBase<\/a>;/
  );
  assert.ok(!/opercular|blotch/.test(h), 'neither the families’ line nor a second mark of a side');
  // The photo of the species resembled, taken for the class's unit: its side first
  assert.match(text(fbLine('f:Angelfishes', 'f:Butterflyfishes', false, ch, ENTRY())), /^Bus duo: A spine at the cheek · Bluespot/);
  // Marks on one side only: that side's first mark; none at all: the families' line as for any miss
  const one = ENTRY(MARKS.filter(k => k.side === 'a'));
  assert.strictEqual(
    text(fbLine('f:Angelfishes', 'f:Butterflyfishes', false, ch, one)),
    'Bluespot butterflyfish: A scalpel on the tail base (IMR fish presentation; FishBase)'
  );
  assert.strictEqual(
    fbLine('f:Butterflyfishes', 'f:Angelfishes', false, ch, ENTRY([])),
    fbLine('f:Butterflyfishes', 'f:Angelfishes', false, ch),
    'no marks: the pair line'
  );
  // A right answer, or an ordinary miss (no entry), keeps its line
  assert.strictEqual(
    fbLine('f:Butterflyfishes', 'f:Butterflyfishes', true, ch, ENTRY()),
    fbLine('f:Butterflyfishes', 'f:Butterflyfishes', true, ch)
  );
  assert.match(fbLine('f:Butterflyfishes', 'f:Angelfishes', false, ch, null), /^<p class="vs fbline">Butterflyfish: no opercular spine/);
  // The marks are escaped
  assert.match(
    fbLine('f:Butterflyfishes', 'f:Angelfishes', false, ch, ENTRY([{side: 'a', t: '<b>x</b>', src: []}])),
    /: &lt;b&gt;x&lt;\/b&gt;<\/p>$/
  );
});

test('mimMarks: the marks the line leaves go behind More, as the pair’s card lists them', () => {
  const M = mimMarks(ENTRY(), 'f:Butterflyfishes');
  assert.strictEqual(
    M.rest,
    '<ul class="mimmarks"><li><b>Bluespot butterflyfish</b>: A dark blotch above the anal fin <small>(<a href="https://example.org/r" target="_blank" rel="noopener">Randall 2005, p. 317</a>)</small></li></ul>'
  );
  assert.strictEqual(mimMarks(ENTRY(MARKS.slice(0, 2)), 'f:Butterflyfishes').rest, '', 'every mark on the line: nothing more');
  assert.strictEqual(mimMarks(ENTRY([]), 'f:Butterflyfishes'), null);
});

test('a side the pair names by its juveniles says so after its name, from the pair’s stages, both ways and in More', () => {
  const juv = (a, b) => ({...ENTRY(), pair: {...ENTRY().pair, st: {a, b}}});
  // the reverse mix-up (a photo of the species resembled): the juvenile side's mark is labelled, the other side's not
  assert.strictEqual(
    text(fbLine('f:Angelfishes', 'f:Butterflyfishes', false, [], juv('juvenile', 'all'))),
    'Bus duo: A spine at the cheek · Bluespot butterflyfish (juvenile): A scalpel on the tail base (Australian Museum; IMR fish presentation; FishBase)'
  );
  // the photo of the class too, and the marks behind More
  const M = mimMarks(juv('juvenile', 'all'), 'f:Butterflyfishes');
  assert.match(text(M.line), /^Bluespot butterflyfish \(juvenile\): A scalpel/);
  assert.match(M.rest, /<b>Bluespot butterflyfish \(juvenile\)<\/b>: A dark blotch/);
  // both sides' juveniles (M4, M7), one side's only on b, or none named: from st, never from a mark's words
  assert.match(
    text(mimMarks(juv('juvenile', 'juvenile'), 'f:Butterflyfishes').line),
    /\(juvenile\): A scalpel.*Bus duo \(juvenile\): A spine/
  );
  assert.match(
    text(mimMarks(juv('all', 'juvenile'), 'f:Butterflyfishes').line),
    /^Bluespot butterflyfish: A scalpel.*Bus duo \(juvenile\)/
  );
  assert.ok(!/juvenile/.test(mimMarks(juv('all', 'all'), 'f:Butterflyfishes').line));
  const young = ENTRY([{side: 'a', t: 'Its young: black', src: []}]);
  assert.ok(!/\(juvenile\)/.test(mimMarks(young, 'f:Butterflyfishes').line), 'a mark that speaks of the young is not read');
});

test('fbBody: a mimicry mix-up keeps one line; its other marks and the families’ line open the More panel', () => {
  const C = bodyCtx(),
    args = ['f:Butterflyfishes', 'f:Angelfishes', false, false, false, [{}], '', null, null, ['f:Angelfishes'], ''],
    html = C.fbBody(...args, ENTRY()),
    [top, more] = html.split('<div class="fbmore" id="fbmore" hidden>');
  assert.strictEqual(top.split('<p class="vs').length - 1, 1, 'one decisive line');
  assert.match(top, /<p class="vs fbline">Bluespot butterflyfish: A scalpel on the tail base · <i>Bus duo<\/i>: A spine/);
  assert.match(more, /^<ul class="mimmarks"><li><b>Bluespot butterflyfish<\/b>: A dark blotch/, 'the other marks first in More');
  assert.match(
    more,
    /<\/ul><p class="vs">Butterflyfish: no opercular spine, no iridescent blue · Angelfish: spine on the gill cover, iridescent blue <small class="esrc">\(IMR; a made-up source\)<\/small><\/p>/,
    'the families’ own line, which the marks replace on the sheet'
  );
  // An ordinary miss and a right answer: no marks anywhere
  assert.ok(!/mimmarks|scalpel/.test(C.fbBody(...args)));
  assert.ok(!/mimmarks|scalpel/.test(C.fbBody('f:Butterflyfishes', 'f:Butterflyfishes', true, ...args.slice(3), ENTRY())));
});

test('fbBody: the sheet’s visible part has no "(IMR)" line; IMR stays named behind More (rule C2)', () => {
  const C = bodyCtx();
  for (const [t, c, good] of [
    ['f:Butterflyfishes', 'f:Angelfishes', false],
    ['f:Damselfishes', 'f:Butterflyfishes', false],
    ['f:Butterflyfishes', 'f:Butterflyfishes', true]
  ]) {
    const [top, more] = C.fbBody(t, c, good, false, false, [{}], '', null, null, ['f:Angelfishes', 'f:Damselfishes', t], '').split(
      '<div class="fbmore" id="fbmore" hidden>'
    );
    assert.ok(!/\(IMR\)/.test(top), `${t} / ${c}: no (IMR) on the visible lines: ${top}`);
    assert.match(more, /<p class="label">ID tips \(IMR\)<\/p>/, `${t} / ${c}: the tips behind More still say IMR`);
  }
});
