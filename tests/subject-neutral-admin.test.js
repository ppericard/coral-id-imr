require('./slot.js').testGuard();
// Rule S1 for the admin and the Learn pages: the ratchet (docs/reviews/2026-11-19-admin-one-engine.md §3 and §5 step 1).
// tests/subject-neutral.test.js keeps a subject's name and its tests out of the engine; this file counts what the study
// found in the admin and the Learn pages, where each subject still has its own code (the same page written twice, or one
// page that forks on the subject by a proxy: `ASUBJ.rank === 'family'`, `S.sheets ?`, `FISHS`, `DATA.gen`...). Each
// per-subject test and each duplicate that exists today is listed below by name, with the study's row that removes it:
//   1. PROXIES, counted per file: how many times each proxy is read in each file of SCOPE. A count above the list is a new
//      per-subject test; a count below it means a step removed one: lower the number. A file not listed holds none, so a
//      new admin-*.js starts at zero.
//   2. NAMES: the top-level functions and constants that are one subject's own (a name with a subject word in it or a
//      known prefix family, every name of admin-fish.js, and the other half of each duplicate listed by hand). A new one
//      fails, and so does a listed one that is gone.
//   3. LINES: the few one-off tests no pattern sees, each checked to still exist.
// The list only shrinks: each later step of the study (§5) removes its duplicates and lowers these numbers in the same PR;
// nothing here is ever raised. A fork that is really needed is declared where S1 says (a SUBJECTS field, a UNITS member:
// FLAGS in tests/subject-neutral.test.js), not counted here.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');

const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  STUDY = read('docs/reviews/2026-11-19-admin-one-engine.md'),
  ROADMAP = read('docs/ROADMAP.md'),
  ONE_ENGINE = 'One engine for every subject, what is left';

// The files the study covers: the admin (every admin*.js), the Learn pages, home, My progress, the basics modules and the
// ID Key. autosort.js is the admin's auto-sort, analysis.js its analyses.
const SCOPE = [
  ...fs
    .readdirSync(ROOT)
    .filter(f => /^admin.*\.js$/.test(f) || ['analysis.js', 'autosort.js', 'learn.js', 'home.js', 'progress.js'].includes(f)),
  'proto/basics.js',
  'proto/fishbasics.js',
  'proto/seaslugbasics.js',
  'proto/idkey.js'
].sort();

// 1. The proxies. `dups`: the study's rows (§3) that remove it. `only`, when given,
// replaces the files it is counted in (DATA.imrg is also read by quiz.js, outside SCOPE: Dup-17).
const PROXIES = [
  {
    name: 'ASUBJ.rank',
    re: /\b(?:ASUBJ|S)\.rank\b/g,
    dups: ['Dup-1', 'Dup-4', 'Dup-6', 'Dup-7'],
    what: "the subject's top rank read to pick a page: 'family' is the tree subjects' page, else the corals'"
  },
  {
    name: "rank: 'family' view option",
    re: /\brank: 'family'(?:\}|,$)/g,
    dups: ['Dup-4'],
    what: 'a review view that exists for the tree subjects only'
  },
  {
    name: '.sheets',
    re: /\.sheets\b/g,
    dups: ['Dup-2', 'Dup-5', 'Dup-10', 'Dup-11', 'Dup-21'],
    what: 'the subject has a sheet of its own (a tree subject): a branch to its registry, or a legitimate read of the setting'
  },
  {
    name: '.admin.cur',
    re: /\.admin\.cur\b/g,
    dups: ['Dup-3', 'Dup-9'],
    what: "the curation key of the subject's part, '' for the corals: a branch between the corals' top level and a tree subject's part"
  },
  {
    name: '.replay',
    re: /\.replay\b/g,
    dups: ['Dup-11', 'Dup-12'],
    what: 'the one subject whose answers are replayed from the sheet: SUBJECTS.find(S => S.replay) and its tests'
  },
  {
    name: '.hash test',
    re: /!\s*\w+\.hash\b|\.hash\s*\?/g,
    dups: ['Dup-1'],
    what: "the default subject found by its empty address, or an address prefix added only when there is one (the corals' ADM0)"
  },
  {
    name: 'FISHS',
    re: /\bFISHS\b/g,
    dups: ['Dup-1', 'Dup-2'],
    what: 'the tree subject in force, read as a fish-only state'
  },
  {
    name: 'DATA.gen',
    re: /\bDATA\.gen\b/g,
    dups: ['Dup-2', 'Dup-13', 'Dup-14', 'Dup-15', 'Dup-16'],
    what: "the corals' data.json genera read by a shared page"
  },
  {
    name: 'DATA.imrg',
    re: /\bDATA\.imrg\b/g,
    dups: ['Dup-17'],
    only: [...SCOPE, 'quiz.js'],
    what: "the corals' IMR groups read by a shared page"
  }
];
// The counts today: proxy -> file -> occurrences on non-comment lines.
const COUNTS = {
  'ASUBJ.rank': {'admin-journey.js': 1, 'admin.js': 15, 'analysis.js': 1},
  "rank: 'family' view option": {'admin.js': 2},
  '.sheets': {
    'admin-analyses.js': 1,
    'admin-content.js': 1,
    'admin-demo.js': 5,
    'admin-heatmap.js': 3,
    'admin-journey.js': 2,
    'admin-visits.js': 4,
    'admin.js': 30,
    'analysis.js': 2
  },
  '.admin.cur': {'admin-content.js': 8, 'admin-covers.js': 2, 'admin-demo.js': 1, 'admin-light.js': 2, 'admin.js': 24},
  '.replay': {'admin-demo.js': 2, 'admin-journey.js': 1, 'admin-visits.js': 2, 'admin.js': 13},
  '.hash test': {'admin.js': 3},
  FISHS: {'admin-covers.js': 3, 'admin-fish.js': 6, 'admin-taxa.js': 1, 'admin.js': 22},
  'DATA.gen': {
    'admin-coraltree.js': 1,
    'admin-journey.js': 1,
    'admin-nodephotos.js': 2,
    'admin.js': 45,
    'home.js': 2,
    'learn.js': 14,
    'progress.js': 1,
    'proto/basics.js': 3,
    'proto/idkey.js': 2
  },
  'DATA.imrg': {'learn.js': 4, 'progress.js': 1, 'proto/idkey.js': 1, 'quiz.js': 1}
};

// 2. The names. [file, the study's row, the names]. admin-fish.js is one subject's file: every top-level name in it is
// listed. In the other files a name is listed when it carries a subject word (SUBJECTS ids) or starts with a known family
// (fu, frev, ct, fam: the fish units, the fish review, the corals' tree, the fish family sheet), plus, by hand, the other
// half of a duplicate whose name says nothing (renderMont, viewGenus...). autosort.js is the tree subjects' auto-sort, all
// of it named fish before the rename (ROADMAP "Architecture review, steps 3 and 4"): it has no twin, so only its number of
// such names is held (NAME_COUNTS), not each name; likewise the basics modules, already one engine whose content
// each subject registers into (Dup-18).
const WHOLE = ['admin-fish.js'],
  FAMILY = /^(?:fu|frev|ct|fam|FU|FREV|FMONT|FSCOPE|FDIFF|CTREES|FTREE)(?=[A-Z_]|$)/,
  NAMES = [
    ['admin-coraltree.js', 'Dup-1', 'ctLeaves ctKeyOf ctWormsOf ctFilters CTREES ctTrees ctTree ctOn ctRow'],
    [
      'admin-fish.js',
      'Dup-3',
      'FQ fishNotThisSel fishCrop FKEEP fishJudged fishRot fishSrc fishSrcTag fishName candSpecies fishInPlay fishZoom fishEdit fishAutoBlock bindFishAuto'
    ],
    ['admin-fish.js', 'Dup-9', 'FTAGS_OPEN fRow fVals fishRows bindFishRows'],
    ['admin-nodephotos.js', 'Dup-1', 'coralLive'],
    ['admin-taxa.js', 'Dup-10', 'taxaFish'],
    [
      'admin.js',
      'Dup-1',
      'FUNSURE FUT fuJ FU_IMR FU_WALL fuRankOf fuImr fuP fuHref fuData fuFam fuName FUD fuDataM fuFamM fuJt fuWink fuTreeOf fuGenusRef fuWormsOf fuNodePhotos FU_CIRC fuCircle fuRow fuFilters famHref'
    ],
    ['admin.js', 'Dup-2', 'FISHS FISHA fishPtx fishFamOf fishState fishAdmin UNITA unitAdmin FISHC fishLoad fishToast fishOut fishUnitRec'],
    ['admin.js', 'Dup-3', 'fishAutoRun fishAutoUndo'],
    ['admin.js', 'Dup-6', 'FMONT_T renderFishMont renderMont'],
    ['admin.js', 'Dup-7', 'FISHCOV renderFishCov fishTodoLines bindFishTodo FSCOPE renderCov'],
    ['admin.js', 'Dup-8', 'fishTile fuTile bindFishTiles repPhotoSubj coralRepTile fishRepTile'],
    ['admin.js', 'Precedent', 'pstatsCoral pstatsFish'],
    ['analysis.js', 'Dup-21', 'photoMetaFish'],
    ['learn.js', 'Dup-13', 'viewGenera packGroups viewFishList'],
    [
      'learn.js',
      'Dup-14',
      'viewGenus FTREE FTREE_OF NOFISH noFish famUnit fishMine fishIsWink famSci famIMR famGroup famSpecies fishFamOf viewFishSheet fishTile famSizes fishMarks treeFamily treeGenus fishSpecies'
    ],
    ['learn.js', 'Dup-15', 'classics viewLookalikes viewCompare treeGenusLooks']
  ],
  NAME_COUNTS = {'autosort.js': 71, 'proto/basics.js': 1, 'proto/fishbasics.js': 3, 'proto/seaslugbasics.js': 0};

// 3. The one-off tests no pattern sees: [file, the line's text, the study's row].
const LINES = [
  ['home.js', '!!(GX(slateGenera()[0]) || {}).name', 'Dup-16'],
  ['home.js', 'window.viewFishKey = function', 'Dup-19']
];

// The checks, pure, so the planted cases below prove that each one bites.
const skip = line => /^\s*(\/\/|\/?\*)/.test(line); // a comment line may name anything
function count(src, re) {
  let n = 0;
  for (const line of src.split('\n')) if (!skip(line)) n += (line.match(re) || []).length;
  return n;
}
function counts(proxies, files, src) {
  const out = {};
  for (const {name, re, only} of proxies)
    for (const f of only || files) {
      const n = count(src(f), re);
      if (n) (out[name] = out[name] || {})[f] = n;
    }
  return out;
}
function ratchet(listed, actual) {
  const bad = [];
  for (const k of new Set([...Object.keys(listed), ...Object.keys(actual)])) {
    const l = listed[k] || {},
      a = actual[k] || {};
    for (const f of new Set([...Object.keys(l), ...Object.keys(a)])) {
      const had = l[f] || 0,
        has = a[f] || 0;
      if (has > had)
        bad.push(
          `${f}: "${k}" ${has}, listed ${had}: a new per-subject test or duplicate (rule S1): make it read the subject's declared parameter, or the registry, instead`
        );
      if (has < had) bad.push(`${f}: "${k}" is down to ${has}, listed ${had}: lower its count in COUNTS (the list only shrinks)`);
    }
  }
  return bad;
}
// The top-level names of a file: column 0, plus column 2 in a file whose code sits in a wrapper opened at its top. A
// const/let/var with several bindings (`const a = 1,\n  b = 2;`) gives every binding: the lines one step in from its
// keyword that start `name =` right after a line ending in a comma, until a line ends it with `;` at that depth or less.
// A destructuring, and a binding with no initial value, give none.
function declared(src) {
  const wrapped = /^\((?:async )?(?:function\b|\(\))/m.test(src.split('\n').slice(0, 40).join('\n')),
    re = new RegExp(`^(${wrapped ? ' {0,2}' : ''})(?:async )?(?:function\\*? |(const|let|var) )([A-Za-z_$][\\w$]*)`),
    out = [];
  let open = -1, // the indent of the declaration still open, or -1
    comma = false; // the line before ended in a comma
  for (const l of src.split('\n')) {
    const m = re.exec(l),
      ind = l.length - l.trimStart().length;
    if (m) {
      out.push(m[3]);
      open = m[2] ? m[1].length : -1;
    } else if (open >= 0 && comma && ind === open + 2) {
      const b = /^\s*([A-Za-z_$][\w$]*)\s*=(?![=>])/.exec(l);
      if (b) out.push(b[1]);
    }
    if (open >= 0 && ind <= open + 2 && /;\s*(\/\/.*)?$/.test(l)) open = -1;
    if (l.trim() && !/^\s*\/\//.test(l)) comma = /,\s*(\/\/.*)?$/.test(l);
  }
  return out;
}
const own = (f, n, words) => WHOLE.includes(f) || words.test(n) || FAMILY.test(n);
function names(listed, files, src, words, countOnly = NAME_COUNTS) {
  const bad = [],
    byFile = {};
  for (const [f, , ns] of listed) ((byFile[f] = byFile[f] || new Set()), ns.split(' ').forEach(n => byFile[f].add(n)));
  for (const f of new Set([...files, ...Object.keys(byFile)])) {
    if (!files.includes(f)) {
      bad.push(`${f} is listed in NAMES but is not in SCOPE`);
      continue;
    }
    const all = new Set(declared(src(f))),
      l = byFile[f] || new Set();
    if (countOnly[f] !== undefined) {
      const n = [...all].filter(x => own(f, x, words)).length;
      if (n > countOnly[f]) bad.push(`${f}: ${n} per-subject names, listed ${countOnly[f]}: a new one (rule S1)`);
      if (n < countOnly[f]) bad.push(`${f}: down to ${n} per-subject names, listed ${countOnly[f]}: lower NAME_COUNTS`);
      continue;
    }
    for (const n of all)
      if (own(f, n, words) && !l.has(n))
        bad.push(`${f}: "${n}" is a new per-subject name (a duplicate?): rule S1, add no subject's own copy of a page`);
    for (const n of l) if (!all.has(n)) bad.push(`${f}: "${n}" is gone: drop it from NAMES (the list only shrinks)`);
  }
  return bad;
}
function lines(listed, src) {
  return listed.filter(([f, text]) => !src(f).includes(text)).map(([f, text]) => `${f}: the line "${text}" is gone: drop it from LINES`);
}
function rows(entries, study) {
  return [...new Set(entries)].filter(d => !new RegExp(`${d}\\b`).test(study)).map(d => `the study no longer holds "${d}"`);
}

const {SUBJECTS} = require('../core.js'),
  WORDS = new RegExp(SUBJECTS.map(S => S.id).join('|'), 'i');

test('rule S1 ratchet: no new per-subject test in the admin and the Learn pages, and every one gone is dropped', () => {
  assert.ok(SCOPE.includes('admin.js') && SCOPE.includes('learn.js') && SCOPE.length > 15, SCOPE.join());
  assert.deepStrictEqual(ratchet(COUNTS, counts(PROXIES, SCOPE, read)), []);
});

test('rule S1 ratchet: no new subject-named duplicate, and every one gone is dropped', () => {
  assert.deepStrictEqual(names(NAMES, SCOPE, read, WORDS), []);
  assert.deepStrictEqual(lines(LINES, read), []);
});

test('rule S1 ratchet: every entry names a row of the study and a ROADMAP row', () => {
  assert.ok(ROADMAP.includes(ONE_ENGINE), 'the ROADMAP row of the one-engine work');
  assert.deepStrictEqual(rows([...PROXIES.flatMap(p => p.dups), ...NAMES.map(n => n[1]), ...LINES.map(l => l[2])], STUDY), []);
  for (const p of PROXIES) assert.ok(p.what && p.dups.length && COUNTS[p.name], `${p.name}: what it is, its rows, its counts`);
  assert.deepStrictEqual(
    Object.keys(COUNTS).filter(k => !PROXIES.some(p => p.name === k)),
    []
  );
});

test('rule S1 ratchet: the checks catch what they are for (planted cases)', () => {
  // a proxy read in a file that holds none, one more than listed, one fewer, a comment that names it
  const P = [{name: 'p', re: /\bFISHS\b/g}],
    src = t => t;
  assert.deepStrictEqual(
    counts(P, ['a.js'], () => 'x(FISHS);\nFISHS && y;'),
    {p: {'a.js': 2}}
  );
  assert.deepStrictEqual(
    counts(P, ['a.js'], () => '// FISHS\n  * FISHS'),
    {}
  );
  assert.match(ratchet({p: {'a.js': 2}}, {p: {'a.js': 3}}).join(), /a\.js: "p" 3, listed 2: a new per-subject test/);
  assert.match(ratchet({p: {'a.js': 2}}, {p: {'a.js': 1}}).join(), /down to 1, listed 2: lower its count/);
  assert.match(ratchet({p: {}}, {p: {'new.js': 1}}).join(), /new\.js: "p" 1, listed 0/, 'a file that is not listed holds none');
  assert.match(ratchet({}, {q: {'a.js': 1}}).join(), /"q" 1, listed 0/, 'a proxy that is not listed holds none');
  assert.match(ratchet({p: {'a.js': 1}}, {}).join(), /"p" is down to 0, listed 1/, 'the last one gone');
  assert.deepStrictEqual(ratchet({p: {'a.js': 2}}, {p: {'a.js': 2}}), []);
  // the real proxies bite on the lines they are for
  const hit = line => PROXIES.filter(p => count(line, p.re)).map(p => p.name);
  assert.deepStrictEqual(hit("if (ASUBJ.rank === 'family') go();"), ['ASUBJ.rank']);
  assert.deepStrictEqual(hit("['ease', 'Ease', {rank: 'family'}],"), ["rank: 'family' view option"]);
  assert.deepStrictEqual(hit('const d = S.sheets ? FISHA : DATA;'), ['.sheets']);
  assert.deepStrictEqual(hit('const k = S.admin.cur ? 1 : 2;'), ['.admin.cur']);
  assert.deepStrictEqual(hit('const R = SUBJECTS.find(x => !x.replay);'), ['.replay']);
  assert.deepStrictEqual(hit('const A = SUBJECTS.find(s => !s.hash);'), ['.hash test']);
  assert.deepStrictEqual(hit("const c = (S.hash ? '-' : '');"), ['.hash test']);
  assert.deepStrictEqual(hit('const g = DATA.gen[n], r = DATA.imrg;'), ['DATA.gen', 'DATA.imrg']);
  assert.deepStrictEqual(hit("location.hash = '#x'; href = '#' + ASUBJ.hash + p;"), [], 'plain address use is not a test');
  // names: a new one, a gone one, a name with a family prefix, a name that says nothing in admin-fish.js, a count-only file
  const wrap = ['(function (root) {', '  function fuNew() {}', '  const plain = 1;', '})(this);'].join('\n'),
    flat = ['function fishNew() {}', '  function fishLocal() {}', 'const plain = 1;'].join('\n');
  assert.deepStrictEqual(declared(wrap), ['fuNew', 'plain']);
  assert.deepStrictEqual(declared(flat), ['fishNew', 'plain'], 'a local of a function is not a top-level name');
  // every binding of a multi-binding declaration, in both layouts; no property of an object, no local of a body
  const multi = [
    'let FISHA = null, // the tree subject',
    '  FISHB = 2,',
    '  plain = () => {',
    '    fishInBody = 1;',
    '  },',
    '  fishLast = {',
    '    fishProp = 1,',
    '    fishShort,',
    '  };',
    'const one = () => {',
    '  fishBody = 1;',
    '};',
    'const o = {',
    '  fishKey = 1,',
    '  other,',
    '};',
    'const fishAfter = 1;'
  ].join('\n');
  assert.deepStrictEqual(declared(multi), ['FISHA', 'FISHB', 'plain', 'fishLast', 'one', 'o', 'fishAfter']);
  const NM = (listed, text, f = 'a.js', countOnly = {}) => names(listed, [f], () => text, WORDS, countOnly);
  assert.match(NM([], flat).join(), /"fishNew" is a new per-subject name/);
  assert.match(NM([], wrap).join(), /"fuNew" is a new per-subject name/);
  assert.deepStrictEqual(NM([['a.js', 'Dup-1', 'fishNew']], flat), []);
  assert.match(NM([['a.js', 'Dup-1', 'fishNew fishOld']], flat).join(), /"fishOld" is gone/);
  assert.match(NM([['a.js', 'Dup-1', 'plain']], 'const x = 1;').join(), /"plain" is gone/, 'a hand-listed name is checked to exist');
  assert.deepStrictEqual(NM([['a.js', 'Dup-1', 'plain']], 'const plain = 1;'), [], 'and may say nothing about a subject');
  assert.match(NM([], 'const plain = 1;', 'admin-fish.js').join(), /"plain" is a new per-subject name/, 'every name of admin-fish.js');
  assert.match(NM([['b.js', 'Dup-1', 'x']], 'const x = 1;').join(), /b\.js is listed in NAMES but is not in SCOPE/);
  assert.match(NM([], 'function fishA() {}\nfunction fishB() {}', 'a.js', {'a.js': 1}).join(), /2 per-subject names, listed 1/);
  assert.match(NM([], 'function fishA() {}', 'a.js', {'a.js': 2}).join(), /down to 1 per-subject names, listed 2/);
  assert.deepStrictEqual(NM([], 'function fishA() {}', 'a.js', {'a.js': 1}), []);
  // the one-off lines and the study's rows
  assert.match(lines([['a.js', 'gone()', 'Dup-16']], () => 'x').join(), /the line "gone\(\)" is gone/);
  assert.deepStrictEqual(
    lines([['a.js', 'here()', 'Dup-16']], () => 'x here() y'),
    []
  );
  assert.match(rows(['Dup-99'], STUDY).join(), /no longer holds "Dup-99"/);
  assert.deepStrictEqual(rows(['Dup-1', 'Dup-10', 'Precedent'], STUDY), []);
  assert.match(rows(['Dup-1'], 'only Dup-10 here').join(), /"Dup-1"/, 'Dup-1 is not Dup-10');
});
