require('./slot.js').testGuard();
// The organisation's words come from core.js ORG (rule W21; docs/decisions/2026-11-25-org-course-words.md): the
// organisation's name and short form, and its course's words (ORG.course, ORG.lecture, ORG.list...). This guard counts
// the word "IMR" written in the code itself, outside comments, in what the players' browsers, the admin's and the sync
// script run: the app's and the admin's files (*.js at the root, proto/*.js), the core's parts (core/*.js, which core.js
// joins) and the sync script's own code (tools/sync/Code.gs outside its copy of core.js). Out of its reach: tests/ (they
// may name what they check) and tools/ (the developers' scripts, never served). The static pages are written from ORG by
// tools/rename_app.py (tests/renameorg.test.js).
// What is left is listed, so the count only shrinks: LEFT, the lines still to move to ORG, each file's count and the
// change that moves them; KEEP, the lines that stay, each with its reason. A file with more lines than listed fails (a
// new "IMR": write it from ORG), and so does one with fewer (it moved: lower its count or drop it).
// Not counted, by construction: an identifier that holds the letters (cqByIMR, famIMR: code names, not wording; renaming
// them is a code rename), and the lower-case internal names, which are not wording either: the data's and the code's
// keys and fields (imr, imrName, the content slot imr, the origin key 'imr'), the photo cache imr-photos-v1 and the salt
// of the anonymous player ids imr-coral-id (kept by tools/rename_app.py on purpose: renaming them would empty the
// players' photo caches and change every id), and the IMR lecture photos' ids (imr-p12_i8, data).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');

const ROOT = path.join(__dirname, '..'),
  GS = 'tools/sync/Code.gs',
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  FILES = [
    ...fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && f !== 'core.js'),
    ...fs.readdirSync(path.join(ROOT, 'proto')).map(f => 'proto/' + f),
    ...fs.readdirSync(path.join(ROOT, 'core')).map(f => 'core/' + f)
  ].filter(f => f.endsWith('.js'));
// The sync script's own code: Code.gs without the copy of core.js tools/sync_core.py writes in it (core/*.js are
// counted as themselves).
const ownGs = gs => {
  const i = gs.indexOf("// The app's core.js (progress engine, replayProgress), embedded by tools/sync_core.py"),
    e = gs.indexOf('// END core.js\n');
  assert.ok(i > 0 && e > i, `${GS}: the markers of its core.js copy are not where tools/sync_core.py writes them`);
  return gs.slice(0, i) + gs.slice(gs.indexOf('\n', e + 1) + 1);
};
// ORG itself (core/keys.js) is where the words are written: its literal is not counted.
const ORG_LIT = /const ORG = \{[^}]*\}/,
  src = f => (f === GS ? ownGs(read(GS)) : f === 'core/keys.js' ? read(f).replace(ORG_LIT, m => m.replace(/[^\n]/g, '')) : read(f));

// A line without its comment. A comment is cut only when that is certain: a line that starts one (//, /*, or the * of
// a block comment), or a // after the code, reached with every quote of the line closed (the line read on its own:
// one that opens or closes a template literal spanning lines is kept whole). Anything else counts as code.
function code(line) {
  if (/^\s*(\/\/|\/\*|\*)/.test(line)) return '';
  let q = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '\\') i++;
      else if (c === q) q = '';
    } else if (c === "'" || c === '"' || c === '`') q = c;
    else if (c === '/' && line[i + 1] === '/' && /\s/.test(line[i - 1] || ' ')) return line.slice(0, i);
  }
  return line;
}
// The word IMR, not inside an identifier.
const WORD = /(?<![\w$])IMR(?![\w$])/;
// The lines of a file the guard counts: [line number, text].
const hits = text =>
  text
    .split('\n')
    .map((l, i) => [i + 1, l])
    .filter(([, l]) => WORD.test(code(l)));

const PR2 = "REE-34 PR 2, the players' pages: their texts from ORG, the data's source prefixes (lsrc) derived from it",
  ENGINE =
    "analysis.js's labels ('IMR lecture' as a photo source, in the model's terms and tables): the engine runs in a Web Worker and in the Action's Node run (tools/analyses.js), neither of which loads core.js, and the labels are kept in the stored report; to move them the worker and the Action must be handed ORG (the integrator places it)",
  LAB = "the Lab's course citations, '(IMR Lecture 6)' and the like: content, not in REE-34's PR plan yet (the integrator places them)";
// The lines still to move: [file, how many, the change that moves them].
const LEFT = [
  ['app.js', 41, PR2],
  ['learn.js', 39, PR2],
  ['quiz.js', 10, PR2],
  ['progress.js', 9, PR2],
  ['home.js', 3, PR2],
  ['idtips.js', 3, PR2],
  ['sync.js', 3, PR2],
  ['autosort.js', 2, PR2],
  ['gloss.js', 1, PR2],
  ['model.js', 1, PR2],
  ['tour.js', 1, PR2],
  ['admin-content.js', 2, PR2],
  ['analysis.js', 5, ENGINE],
  ['proto/anatomy.js', 17, LAB],
  ['proto/basics.js', 10, LAB],
  ['proto/idkey.js', 9, LAB],
  ['proto/fishbasics.js', 4, LAB],
  ['proto/fishkey.js', 4, LAB],
  ['proto/map.js', 3, LAB],
  ['proto/cards.js', 1, LAB],
  ['proto/spot.js', 1, LAB]
];
// The lines that stay: [file, a part of the line (unique in it), why]. Not counted in LEFT.
const KEEP = [
  [GS, "PARENT: 'IMR'", 'the name of the pCloud folder that holds the sheet backups (BACKUP): a place outside the repository'],
  [
    'core/rules.js',
    "why: 'The first-launch question (#428)",
    "a rules version's record (RVS why: one line for the docs, never shown to a player): what was decided then, kept as written"
  ],
  [
    'core/rules.js',
    "why: 'One 45-genus coral scale",
    'a rules version\'s record (RVS why), quoting Pierre\'s words ("score ardoise IMR"): kept as written'
  ]
];

function check(files, src, left, keep) {
  const bad = [];
  for (const f of files) {
    const H = hits(src(f)).filter(([, l]) => !keep.some(([kf, part]) => kf === f && l.includes(part))),
      want = (left.find(([lf]) => lf === f) || [f, 0])[1];
    if (H.length !== want)
      bad.push(
        `${f}: ${H.length} line(s) write "IMR" outside comments, ${want} listed in LEFT` +
          (H.length > want ? ' (write it from core.js ORG)' : ' (lower its count)') +
          '\n  ' +
          H.map(([n, l]) => `${n}: ${l.trim().slice(0, 160)}`).join('\n  ')
      );
  }
  for (const [f, part, why] of keep) {
    const n = hits(src(f)).filter(([, l]) => l.includes(part)).length;
    if (n !== 1) bad.push(`KEEP ${f} "${part}": ${n} counted line(s) hold it, not one (drop or narrow it)`);
    if (!why) bad.push(`KEEP ${f} "${part}": no reason`);
  }
  for (const [f, n, why] of left) {
    if (!files.includes(f)) bad.push(`LEFT ${f}: not a file the guard reads`);
    if (!(n > 0) || !why) bad.push(`LEFT ${f}: a count above 0 and the change that moves them`);
  }
  return bad;
}

test('ORG words: the code writes "IMR" only where listed (rule W21)', () => {
  const gs = ownGs(read(GS));
  assert.ok(gs.includes('function doGet(') && !gs.includes('const SUBJECTS = ['), `${GS}: its own code, without its copy of core.js`);
  assert.deepStrictEqual(check([GS, ...FILES], src, LEFT, KEEP), []);
});

test('ORG words: the guard catches what it is for (planted cases)', () => {
  const n = s => hits(s).length;
  // wording, in any kind of literal or a regular expression
  assert.strictEqual(n("const t = 'Not on the IMR list';"), 1);
  assert.strictEqual(n('const t = `the ${x} IMR course`;'), 1);
  assert.strictEqual(n("x = /^IMR Lecture/.test(s); // the lecture's lines"), 1);
  assert.strictEqual(n("n: 'IMR', // the short name"), 1, 'the code before a comment still counts');
  // comments, identifiers and the lower-case internal names are not counted
  assert.strictEqual(n('  // the IMR lecture group'), 0);
  assert.strictEqual(n('   * the IMR course'), 0);
  assert.strictEqual(n("const g = x.imr; // the IMR tag (IMR's name)"), 0);
  assert.strictEqual(n('groups: play => cqByIMR(play), famIMR(f)'), 0);
  assert.strictEqual(n("caches.open('imr-photos-v1'); salt = 'imr-coral-id'; id = 'imr-p12_i8'; k = 'imr';"), 0);
  // a doubtful // stays code: inside a string, or after a quote the line leaves open
  assert.strictEqual(n("const u = 'see // the IMR list';"), 1);
  assert.strictEqual(n("  it's // IMR trainer"), 1);
  // the lists: a file over or under its count, a stale KEEP line, a LEFT file the guard does not read
  const S = f => ({'a.js': "t = 'IMR list';\nu = 'IMR slate';\nfolder = 'IMR';"})[f];
  assert.deepStrictEqual(check(['a.js'], S, [['a.js', 2, PR2]], [['a.js', "folder = 'IMR'", 'a folder']]), []);
  assert.match(check(['a.js'], S, [['a.js', 1, PR2]], [['a.js', "folder = 'IMR'", 'a folder']]).join('\n'), /2 line\(s\).*1 listed/);
  assert.match(check(['a.js'], S, [['a.js', 3, PR2]], [['a.js', "folder = 'IMR'", 'a folder']]).join('\n'), /lower its count/);
  assert.match(check(['a.js'], S, [['a.js', 3, PR2]], [['a.js', 'gone', 'a folder']]).join('\n'), /KEEP a\.js "gone": 0/);
  assert.match(check(['a.js'], S, [['b.js', 3, 'a change']], []).join('\n'), /LEFT b\.js: not a file/);
});
