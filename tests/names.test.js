require('./slot.js').testGuard();
// Look-alike account names (REE-35, the integrator's call): two names that look the same (a Cyrillic letter, a decomposed
// accent, a zero-width space) can no longer be two accounts, and a name is never cut inside an emoji. core.js nameCut,
// nameClean, nameHidden, nameSkeleton and nameAlikePairs; the sync script on them (Code.gs clean_, acct_, nameIssue_,
// doGet_, doPost_, users_ userArchive); the app's save refused (sync.js on the stub, tests/syncpage.js); the admin's
// warning line (admin.js alikeLine). Against the in-memory sheet (tests/gas.js): nothing leaves this process (rule D1).
// Every name here is made up (rule D2). Every character outside ASCII is written as an escape: a look-alike or an
// invisible character written as it is would look like the plain name in the test too.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const C = require('../core.js');
const {loadCodeGs, madeBefore} = require('./gas.js');
const {page} = require('./syncpage.js');

const TOK = 'ghp_write000000000000000000';
const DJSON = fs.readFileSync(path.join(__dirname, '..', 'data.json'), 'utf8'),
  CJSON = fs.readFileSync(path.join(__dirname, '..', 'curation.json'), 'utf8');
const fetch = url =>
  /\/main\/data\.json$/.test(url)
    ? {getResponseCode: () => 200, getContentText: () => DJSON}
    : /\/main\/curation\.json$/.test(url)
      ? {getResponseCode: () => 200, getContentText: () => CJSON}
      : null;
const prog = n => ({'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: n, ko: 0}})});
const qa = (id, i) => ({
  id,
  t: new Date(Date.UTC(2026, 10, 3, 6, 0, i)).toISOString(),
  g: 'Acropora',
  a: 'Acropora',
  ok: 1,
  m: 'quiz',
  ph: 'acropora-wide-' + (i % 5),
  e: 0.8,
  th: 1
});
let qn = 0;
const save = (s, name, pin = '1234') => s.post({name, pin, data: prog(1), summary: {}, answers: [qa('q' + ++qn, 1)]});
const names = s => s.sheets.RAs.rows.slice(1).map(r => r[0]);

// The look-alikes the tests use, each with the plain name it looks like.
const CYR_A = '\u{410}nna', // Cyrillic capital A, then Latin nna: Anna
  CYR_a = 'Ann\u{430}', // Cyrillic small a at the end: Anna
  GREEK_O = 'T\u{3BF}m', // Greek omicron: Tom
  ZWSP = 'An\u{200B}na', // zero-width space
  ZWJ = 'Ann\u{200D}a', // zero-width joiner
  ZWNJ = 'An\u{200C}na', // zero-width non-joiner
  RLO = '\u{202E}anna', // right-to-left override: shows annA... reversed, still "anna" to the eye in many fonts
  LRM = 'Anna\u{200E}', // left-to-right mark
  BOM = '\u{FEFF}Anna', // zero-width no-break space
  SHY = 'An\u{AD}na', // soft hyphen
  FILLER = 'Anna\u{3164}', // Hangul filler (draws nothing)
  ZOE = 'Zo\u{E9}', // e acute precomposed (NFC)
  ZOE_D = 'Zoe\u{301}', // e, then the combining acute (NFD)
  SCIENTIST = '\u{1F469}\u{200D}\u{1F52C}', // woman, joiner, microscope: one emoji
  COOK = '\u{1F468}\u{1F3FD}\u{200D}\u{1F373}', // man, a skin tone, joiner, frying pan: one emoji
  SCOTLAND = '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}'; // black flag and its tags: one emoji

test('nameSkeleton: a Cyrillic or Greek look-alike letter, a decomposed accent, an invisible character, width and spaces look alike', () => {
  const {nameSkeleton: k} = C;
  [CYR_A, CYR_a, 'ANNA', 'anna', ZWSP, ZWJ, ZWNJ, 'anna\u{202E}', LRM, BOM, SHY, FILLER, '\u{FF21}nna', 'Anna\u{FE0F}'].forEach(n =>
    assert.strictEqual(k(n), k('Anna'), JSON.stringify(n))
  );
  assert.strictEqual(k(RLO), 'anna');
  assert.strictEqual(k(GREEK_O), k('Tom'));
  assert.strictEqual(k(ZOE_D), k(ZOE));
  assert.strictEqual(k('Ana  B.'), k('Ana B.'));
  assert.strictEqual(k('Ana\u{A0}B.'), k('Ana B.'));
  // Upper-case look-alikes of each script, case aside: Cyrillic Ve is B, Cyrillic En is H, Greek Kappa is K, Greek Iota I.
  assert.strictEqual(k('\u{412}ob'), k('Bob'));
  assert.strictEqual(k('\u{41D}ans'), k('Hans'));
  assert.strictEqual(k('\u{39A}im'), k('Kim'));
  assert.strictEqual(k('\u{399}an'), k('Ian'));
  // Names that look different stay apart: an accent, another letter, a dot, another script's own letters, an emoji.
  [
    ['Jose', ZOE],
    ['Jos\u{E9}', 'Jose'],
    ['Anna', 'Anne'],
    ['Ana B.', 'Ana B'],
    ['\u{416}enya', 'Zhenya'],
    ['Mia ' + SCIENTIST, 'Mia \u{1F469}']
  ].forEach(([a, b]) => assert.notStrictEqual(k(a), k(b), JSON.stringify([a, b])));
  // The mapping is the confusables data's: pairs of one letter each, every source Greek or Cyrillic, every target ASCII.
  const src = fs.readFileSync(path.join(__dirname, '..', 'core', 'apology.js'), 'utf8'),
    pairs = /s =\s*'([^']+)';/.exec(src)[1];
  assert.strictEqual(pairs.length % 2, 0);
  for (let i = 0; i < pairs.length; i += 2) {
    assert.ok(/[\u{370}-\u{4FF}]/u.test(pairs[i]), pairs[i]);
    assert.ok(/[A-Za-z]/.test(pairs[i + 1]), pairs[i + 1]);
  }
});

test('nameHidden: zero-width, bidi controls and other invisible characters; an emoji joiner and a flag are no invisible mark', () => {
  const {nameHidden: h} = C;
  [
    ZWSP,
    ZWJ,
    ZWNJ,
    RLO,
    LRM,
    BOM,
    SHY,
    FILLER,
    'A\u{2066}nna\u{2069}', // an isolate
    'Ann\u{2060}a', // word joiner
    'Ann\u{34F}a', // combining grapheme joiner
    'Ann\u{2800}a', // Braille blank
    'Ann\na',
    'Anna\u{202D}' // left-to-right override
  ].forEach(n => assert.strictEqual(h(n), true, JSON.stringify(n)));
  [
    'Anna',
    'Ana B.',
    ZOE,
    ZOE_D,
    CYR_A,
    '\u{416}enya',
    "O'Neil",
    'Jean-Luc',
    'Mia ' + SCIENTIST,
    'Kai ' + COOK,
    'Ivy ' + SCOTLAND,
    'Ben \u{2764}\u{FE0F}',
    '',
    null
  ].forEach(n => assert.strictEqual(h(n), false, JSON.stringify(n)));
  // A joiner between letters, or after an emoji but before a letter, stays invisible.
  assert.strictEqual(h('\u{1F469}\u{200D}Anna'), true);
  // A variation selector alone, or after a letter it changes nothing in, is invisible; a name of marks only shows
  // nothing. After a symbol, a punctuation mark, a digit or an ideograph it selects a presentation: allowed.
  [
    '\u{FE0F}',
    '\u{FE0F}\u{FE0F}',
    'Anna\u{FE0F}',
    'Ann\u{FE00}a',
    'Ann\u{E0101}a',
    '\u{E0101}',
    '\u{301}',
    '\u{301}\u{302}',
    'Anna\u{FFF0}'
  ].forEach(n => assert.strictEqual(h(n), true, JSON.stringify(n)));
  [
    'Kai 1\u{FE0F}\u{20E3}',
    'Mia \u{263A}\u{FE0F}',
    'Ben \u{203C}\u{FE0F}',
    'Lin \u{845B}\u{E0100}',
    'Zoe\u{301}',
    'Ivy \u{2764}\u{FE0F}\u{200D}\u{1F525}'
  ].forEach(n => assert.strictEqual(h(n), false, JSON.stringify(n)));
});

test('nameCut: at most 40 code units, cut at a whole character, never inside an emoji; a name within the limit is kept', () => {
  const {nameCut, nameClean, NAME_MAX} = C,
    // A half of a surrogate pair alone: Array.from keeps a whole pair as one string of 2.
    lone = s => Array.from(s).some(c => c.length === 1 && c.charCodeAt(0) >= 0xd800 && c.charCodeAt(0) <= 0xdfff);
  assert.strictEqual(NAME_MAX, 40);
  const B39 = 'B'.repeat(39),
    SMILE = '\u{1F600}';
  // What the old cut (slice(0, 40)) left: a lone half of the emoji.
  assert.ok(lone((B39 + SMILE).slice(0, 40)));
  assert.strictEqual(nameCut(B39 + SMILE), B39);
  // A joined emoji (5 code units) at the cut goes whole, never its first half.
  const B37 = 'B'.repeat(37);
  assert.strictEqual(nameCut(B37 + SCIENTIST), B37);
  // A letter and its accent (decomposed) at the cut go together.
  assert.strictEqual(nameCut(B39 + 'e\u{301}'), B39);
  // Within the limit: as it is, whatever it holds.
  ['Anna', B39 + 'x', ZOE_D, '', 'B'.repeat(30) + SCIENTIST].forEach(n => assert.strictEqual(nameCut(n), n));
  assert.strictEqual(nameCut('x'.repeat(45)), 'x'.repeat(40));
  // An engine without grapheme segmentation (Apps Script may lack Intl.Segmenter): cut at a code point.
  const Seg = Intl.Segmenter;
  delete Intl.Segmenter;
  try {
    assert.strictEqual(nameCut(B39 + SMILE), B39);
    assert.ok(!lone(nameCut('B'.repeat(36) + SCIENTIST)));
    assert.strictEqual(nameCut('x'.repeat(45)), 'x'.repeat(40));
  } finally {
    Intl.Segmenter = Seg;
  }
  // One grapheme longer than the limit: code points then, never nothing.
  assert.strictEqual(nameCut('a' + '\u{301}'.repeat(60)), 'a' + '\u{301}'.repeat(39));
  // nameClean: trimmed, NFC, then cut.
  assert.strictEqual(nameClean('  ' + ZOE_D + ' '), ZOE);
  assert.strictEqual(nameClean(null), '');
});

test('nameAlikePairs: the groups of names that look alike, one account in two cases counted once', () => {
  const {nameAlikePairs: P} = C;
  assert.deepStrictEqual(P(['Anna', 'Bob', CYR_A, 'Tom', ZWSP, 'B\u{200B}ob', 'Kim']), [
    ['Anna', CYR_A, ZWSP].sort(),
    ['B\u{200B}ob', 'Bob'].sort()
  ]);
  assert.deepStrictEqual(P(['Anna', 'ANNA', 'Anne']), []);
  assert.deepStrictEqual(P([]), []);
  assert.deepStrictEqual(P(null), []);
});

test('the sheet: a new name that looks like a taken one, or holds an invisible character, is refused; nothing written', () => {
  const s = loadCodeGs({fetch});
  assert.strictEqual(save(s, 'Anna').ok, true);
  assert.strictEqual(save(s, 'Tom').ok, true);
  const rows0 = s.sheets.Answers.rows.length;
  [
    [CYR_A, 'lookalike'],
    [CYR_a, 'lookalike'],
    [GREEK_O, 'lookalike'],
    ['ANN\u{410}', 'lookalike'],
    ['\u{FF21}nna', 'lookalike'], // full-width A
    [ZWSP, 'invisible'],
    [ZWJ, 'invisible'],
    [ZWNJ, 'invisible'],
    [RLO, 'invisible'],
    [LRM, 'invisible'],
    ['Xi\u{200B}ao', 'invisible'], // invisible, though like no taken name
    ['\u{FE0F}', 'invisible'], // a variation selector alone: no visible name at all
    ['Tom\u{FE0F}', 'invisible']
  ].forEach(([name, why]) => {
    const g = s.get({name, pin: '1234'});
    assert.deepStrictEqual([g.ok, g.found, g.taken], [true, false, why], JSON.stringify(name) + ' load');
    const r = save(s, name);
    assert.deepStrictEqual([r.ok, r.error, r.why, r.log], [false, 'reserved', why, undefined], JSON.stringify(name) + ' save');
  });
  assert.deepStrictEqual(names(s), ['Anna', 'Tom']);
  assert.strictEqual(s.sheets.Answers.rows.length, rows0, 'no answer logged');
  // A name that only looks different signs up as before; a free name's load says nothing more.
  const free = s.get({name: 'Anne', pin: '1234'});
  assert.deepStrictEqual([free.ok, free.found, 'taken' in free], [true, false, false]);
  ['Anne', 'Ana B.', 'Mia ' + SCIENTIST, '\u{416}enya'].forEach(n => assert.strictEqual(save(s, n).ok, true, n));
  // The taken name itself, in any case, is the account (its code checked), never refused as a look-alike.
  assert.strictEqual(s.get({name: 'ANNA', pin: '1234'}).found, true);
  assert.strictEqual(s.get({name: 'anna', pin: '9999'}).error, 'pin');
});

test('the sheet: another Unicode form of a taken name is a look-alike, never the account nor a new one; tombstones hold', () => {
  const s = loadCodeGs({fetch});
  // The app's form sends a new name in NFC (core.js nameClean): the account is made so, and opens only as it is spelt.
  assert.strictEqual(save(s, ZOE).ok, true);
  assert.deepStrictEqual(names(s), [ZOE]);
  assert.strictEqual(s.get({name: 'ZO\u{C9}', pin: '1234'}).found, true);
  [ZOE_D, 'ZOE\u{301}'].forEach(n => {
    const g = s.get({name: n, pin: '1234'});
    assert.deepStrictEqual([g.ok, g.found, g.taken], [true, false, 'lookalike'], JSON.stringify(n));
    const r = save(s, n);
    assert.deepStrictEqual([r.ok, r.error, r.why], [false, 'reserved', 'lookalike'], JSON.stringify(n));
  });
  assert.deepStrictEqual(names(s), [ZOE]);
  // Two accounts made before in the two forms of one name (madeBefore), the same code: each is its own; deleting one
  // leaves its tombstone, which its devices meet (gone), never the other account.
  const t = loadCodeGs({fetch});
  madeBefore(t, () => [ZOE_D, ZOE].forEach(n => assert.strictEqual(save(t, n).ok, true, JSON.stringify(n))));
  assert.deepStrictEqual(names(t), [ZOE_D, ZOE]);
  assert.strictEqual(t.post({selfDelete: 1, dname: ZOE_D, dpin: '1234'}).deleted, true);
  assert.deepStrictEqual(names(t), [ZOE]);
  assert.strictEqual(t.get({name: ZOE_D, pin: '1234'}).error, 'gone');
  [{}, {acct: 'x0x0x0x0x0x0'}].forEach(extra => {
    const r = t.post({name: ZOE_D, pin: '1234', data: prog(1), summary: {}, answers: [qa('q' + ++qn, 1)], ...extra});
    assert.deepStrictEqual([r.ok, r.error], [false, 'gone'], JSON.stringify(extra));
  });
  assert.deepStrictEqual(names(t), [ZOE]);
  assert.strictEqual(t.sheets.Answers.rows.slice(1).filter(r => r[0] === ZOE).length, 1, "the other account's answers only");
});

test('the sheet: a look-alike in one case only is refused in every case (Greek small beta and nu, capitals)', () => {
  const {nameKeys: K, nameAlikePairs: P} = C;
  const like = (a, b) => K(a).some(x => K(b).includes(x));
  // A Greek small beta is no b, but its capital is B: as an account is its name in any case, beta-ob is Bob's look-alike.
  [
    ['\u{3B2}ob', 'Bob'],
    ['\u{392}ob', 'Bob'],
    ['\u{3BD}ick', 'Nick'], // small nu: its capital is N
    ['\u{3BD}ick', 'vick'], // small nu looks like v
    ['\u{39D}ICK', 'nick'],
    ['\u{3BA}im', 'Kim'], // small kappa: its capital is K
    ['\u{432}ob', 'Bob'], // Cyrillic small ve: its capital is B
    ['\u{43D}ans', 'Hans'] // Cyrillic small en: its capital is H
  ].forEach(([a, b]) => assert.ok(like(a, b), JSON.stringify([a, b])));
  [
    ['Nick', 'vick'],
    ['Bob', 'Rob'],
    ['\u{3B2}eta', 'Zeta']
  ].forEach(([a, b]) => assert.ok(!like(a, b), JSON.stringify([a, b])));
  assert.deepStrictEqual(P(['Bob', '\u{3B2}ob', 'Nick', 'vick', '\u{3BD}ick']), [
    ['Bob', '\u{3B2}ob'].sort(),
    ['Nick', 'vick', '\u{3BD}ick'].sort()
  ]);
  // The sheet: with Bob and Nick taken, neither beta-ob nor nu-ick is made, so neither can sign in later as the capital.
  const s = loadCodeGs({fetch});
  ['Bob', 'Nick'].forEach(n => assert.strictEqual(save(s, n).ok, true, n));
  ['\u{3B2}ob', '\u{392}OB', '\u{3BD}ick', '\u{3BA}im B.'].forEach(n => {
    const r = save(s, n);
    assert.deepStrictEqual([r.ok, r.error], n === '\u{3BA}im B.' ? [true, undefined] : [false, 'reserved'], JSON.stringify(n));
  });
  assert.deepStrictEqual(names(s), ['Bob', 'Nick', '\u{3BA}im B.']);
  assert.strictEqual(s.get({name: '\u{3BD}ICK', pin: '1234'}).taken, 'lookalike');
});

test('the sheet: an account keeps the spelling it was made with, whatever case later requests use', () => {
  // A name made in one case passed the look-alike check as it was spelt; signed in later in another case (the same
  // account: find_), it would show under that case, which may look like another player's name in a mix of cases no
  // check of whole-name cases foresees (beta-nu-ob is no Bvob, its capitals Beta-Nu are B and N, beta-Nu-ob is). So a
  // save never changes how the account's name is spelt: the RAs row, the progress copy, the grid and the answers keep it.
  const s = loadCodeGs({fetch}),
    made = '\u{3B2}\u{3BD}ob',
    later = '\u{392}\u{3BD}ob';
  assert.strictEqual(save(s, 'Bvob').ok, true);
  assert.strictEqual(save(s, made).ok, true);
  assert.deepStrictEqual(names(s), ['Bvob', made]);
  assert.strictEqual(save(s, later).ok, true);
  assert.strictEqual(save(s, made.toUpperCase()).ok, true);
  assert.deepStrictEqual(names(s), ['Bvob', made]);
  assert.ok(
    s.sheets.Answers.rows
      .slice(1)
      .filter(r => r[0] !== 'Bvob')
      .every(r => r[0] === made)
  );
  assert.deepStrictEqual(s.sheets['Progress data'].rows.slice(1).map(r => r[0]), ['Bvob', made]);
  const u = s.post({users: 1, token: TOK});
  assert.deepStrictEqual(u.users.map(x => x.name).sort(), ['Bvob', made].sort());
  // A plain name too: made as anna, saved as ANNA, still anna.
  assert.strictEqual(save(s, 'anna').ok, true);
  assert.strictEqual(save(s, 'ANNA').ok, true);
  assert.ok(names(s).includes('anna') && !names(s).includes('ANNA'));
});

test('the sheet: an older app that signs up decomposed keeps every request on its account (self-delete, reports)', () => {
  const s = loadCodeGs({fetch});
  // The app before this change sends the name as typed, and keeps it as its account's name.
  assert.strictEqual(save(s, ZOE_D).ok, true);
  assert.deepStrictEqual(names(s), [ZOE_D]);
  assert.strictEqual(s.get({name: ZOE_D, pin: '1234'}).found, true);
  const rep = s.post({reports: [{id: 'r1', why: 'photo', t: '2026-11-01T00:00:00Z'}], rname: ZOE_D, rpin: '1234'});
  assert.strictEqual(rep.ok, true, JSON.stringify(rep));
  // Its report is the account's, verified (its code checked under the spelling the app holds).
  assert.deepStrictEqual(
    s.sheets.Reports.rows.slice(1).map(r => [r[1], r[2]]),
    [[ZOE_D, 1]]
  );
  assert.strictEqual(s.post({selfDelete: 1, dname: ZOE_D, dpin: '1234'}).deleted, true);
  assert.deepStrictEqual(names(s), []);
  // A look-alike of a taken name is still refused, whatever form it comes in.
  assert.strictEqual(save(s, ZOE).ok, true);
  const look = save(s, 'Z\u{43E}e\u{301}'); // a Cyrillic o, then e and its accent decomposed
  assert.deepStrictEqual([look.error, look.why], ['reserved', 'lookalike']);
  assert.deepStrictEqual(names(s), [ZOE]);
});

test('the sheet: a name is cut at a whole character, never inside an emoji', () => {
  const s = loadCodeGs({fetch}),
    B39 = 'B'.repeat(39);
  assert.strictEqual(save(s, B39 + '\u{1F600}').ok, true);
  assert.deepStrictEqual(names(s), [B39]);
  // The same name sent again opens that account (the same cut).
  assert.strictEqual(s.get({name: B39 + '\u{1F600}', pin: '1234'}).found, true);
});

test('the admin: an archive name is NFC, never invisible nor like a taken name; existing look-alike pairs are listed, untouched', () => {
  const s = loadCodeGs({fetch});
  ['Anna', 'Bob', 'Kim'].forEach(n => assert.strictEqual(save(s, n).ok, true, n));
  madeBefore(s, () => [CYR_A, 'B\u{200B}ob'].forEach(n => assert.strictEqual(save(s, n).ok, true, n)));
  // Kim archived under a name with a Greek omicron, like no taken name: made. Then a name like that archive, or like a
  // player, is refused as existing; one with an invisible character as reserved.
  assert.strictEqual(s.post({userArchive: {from: 'Kim', into: 'T\u{3BF}m-old'}, token: TOK}).ok, true);
  [
    ['Tom-\u{3BF}ld', 'exists', 'lookalike'],
    ['B\u{3BF}b', 'exists', 'lookalike'],
    ['Anna\u{200B}-old', 'reserved', 'invisible'],
    ['\u{202E}Anna-old', 'reserved', 'invisible']
  ].forEach(([into, error, why]) => {
    const j = s.post({userArchive: {from: 'Anna', into}, token: TOK});
    assert.deepStrictEqual([j.ok, j.error, j.why], [false, error, why], JSON.stringify(into));
  });
  // Typed decomposed, the archive name is made NFC.
  assert.strictEqual(s.post({userArchive: {from: 'Bob', into: 'Bob-te\u{301}st'}, token: TOK}).ok, true);
  assert.ok(names(s).includes('Bob-t\u{E9}st'));
  // The players list: the look-alike pair made before is still two accounts, both listed; the admin's line names it.
  const u = s.post({users: 1, token: TOK});
  assert.strictEqual(u.ok, true);
  assert.deepStrictEqual(u.users.map(x => x.name).sort(), ['Anna', CYR_A, 'B\u{200B}ob'].sort());
  assert.deepStrictEqual(C.nameAlikePairs([...u.users, ...u.archived].map(x => x.name)), [['Anna', CYR_A].sort()]);
  const src = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8'),
    ctx = {nameAlikePairs: C.nameAlikePairs, esc: t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;')};
  vm.createContext(ctx);
  vm.runInContext(
    block(src, '// Accounts whose names look alike', 'function renderUsers()', {file: 'admin.js'}) + ';this.alikeLine = alikeLine;',
    ctx
  );
  const line = ctx.alikeLine(u);
  assert.match(line, /^<p class="warn adm-ualike">Names that look alike: /);
  assert.ok(line.includes('<b>Anna</b> and <b>\u{2039}U+0410\u{203A}nna</b>'), line);
  assert.strictEqual(ctx.alikeLine({users: [{name: 'Anna'}, {name: 'Anne'}], archived: []}), '');
  assert.strictEqual(ctx.alikeLine(null), '');
  assert.match(ctx.alikeLine({users: [{name: 'Bob'}, {name: 'B\u{200B}ob'}]}), /<b>B\u{2039}U\+200B\u{203A}ob<\/b>/u);
});

test('the app: an older app signed in under a look-alike name has its first save refused as reserved, red at once', async () => {
  const s = loadCodeGs({fetch});
  assert.strictEqual(save(s, 'Anna').ok, true);
  const A = page(s, {SYNC: {name: CYR_A, pin: '1234', log: [], base: {}, dirty: true}});
  A.play('c1');
  await A.syncPush();
  assert.strictEqual(A.ctx.SYNC.err, 'reserved');
  assert.deepStrictEqual(names(s), ['Anna']);
});
