require('./slot.js').testGuard();
// Content versions and duplicate-safe answers (ROADMAP; Pierre, 2026-11-18: "Bonne idée. A implémenter rapidement parce
// que le contenu évolue vite"). Each logged answer carries the content version its subject's units were built from on the
// device (core.js contentVersion, app.js contentVer: the data files' versions, the subject's part of the curation, the
// structure stamp), kept in the Answers tab's last column, Content version, sent only from CV_SHEET (core.js logOut, rule
// D4); and its id is its attempt id (core.js answerId; live.js liveAid), which the sheet logs once whatever the retries.
// Every sheet check runs on the in-memory sheet (tests/gas.js, rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');
const block = require('./block.js');
const {loadCodeGs} = require('./gas.js');

const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const CORAL = C.subjectOf('coral'),
  FISH = C.subjectOf('fish'),
  SEA = C.subjectOf('seaslug');
// The sheet's checks on an id (Code.gs logAnswers_ ID, the 20 characters it keeps) and on a content version (CV).
const ID = /^[a-z0-9]{1,20}$/,
  CVRE = /^c[a-z0-9]{1,15}$/;

// ---- The attempt id ----

test('core.js answerId: 16 characters of a-z and 0-9, a letter first, the time then 8 random ones; under the sheet’s 20', () => {
  const now = Date.parse('2026-11-18T02:00:00Z'),
    id = C.answerId(now, [0, 1, 35, 36, 71, 255, 100, 200]);
  assert.strictEqual(id, now.toString(36) + 'abz' + 'az' + 'v' + 's' + 'k');
  assert.strictEqual(id.length, 16);
  assert.match(id, /^[a-z][a-z0-9]{15}$/);
  // The device's crypto: never twice in many answers of the same millisecond, always the sheet's form.
  const L = Array.from({length: 20000}, () => C.answerId(now));
  assert.strictEqual(new Set(L).size, L.length);
  assert.ok(L.every(x => ID.test(x) && x.length === 16 && x.startsWith(now.toString(36))));
  // The clock as it is now: a letter first (the sheet never reads it as a number).
  assert.match(C.answerId(), /^[a-z][a-z0-9]{15}$/);
});

test('core.js answerId: without crypto (never a browser the app runs in) it still makes the same form', () => {
  const ctx = {Math, Date, JSON, Uint8Array, Array, Number, String, Object, Set, Map};
  vm.createContext(ctx);
  vm.runInContext(read('core.js'), ctx);
  const id = vm.runInContext('answerId()', ctx);
  assert.match(id, /^[a-z][a-z0-9]{15}$/);
});

// live.js's pure helpers, with core.js's answerId for the fallback.
function liveModule() {
  const ctx = {console, Math, Date, JSON, answerId: C.answerId};
  vm.createContext(ctx);
  vm.runInContext(/\/\/ pure: begin[\s\S]*?\/\/ pure: end/.exec(read('live.js'))[0] + '\nthis.X = {liveAid};', ctx);
  return ctx.X;
}

test('live.js liveAid: one id per player and question, however often it is logged; a random one without them', () => {
  const {liveAid} = liveModule();
  assert.strictEqual(liveAid('0a1b2c3d4e', 0), 'l0a1b2c3d4eq0');
  assert.strictEqual(liveAid('0a1b2c3d4e', 19), 'l0a1b2c3d4eqj');
  assert.strictEqual(liveAid('0a1b2c3d4e', 19), liveAid('0a1b2c3d4e', 19));
  assert.notStrictEqual(liveAid('0a1b2c3d4e', 1), liveAid('0a1b2c3d4f', 1));
  // The separator: a pid of another length never makes another player's id.
  assert.notStrictEqual(liveAid('0a1b2c3d4e1', 1), liveAid('0a1b2c3d4e', 11));
  // At most 20 characters, the sheet's form, for the longest pid the script accepts and the largest question number.
  assert.ok(ID.test(liveAid('a'.repeat(16), 1295)) && liveAid('a'.repeat(16), 1295).length <= 20);
  // An answer kept from before (no pid), or anything else: a random attempt id.
  for (const [p, q] of [
    [undefined, 3],
    ['0a1b2c3d4e', undefined],
    ['0A1B2C3D4E', 1],
    ['short', 1],
    ['0a1b2c3d4e', -1],
    ['0a1b2c3d4e', 1.5],
    ['0a1b2c3d4e', 1296]
  ]) {
    const id = liveAid(p, q);
    assert.match(id, /^[a-z][a-z0-9]{15}$/, `${p} ${q}`);
    assert.notStrictEqual(id, liveAid(p, q));
  }
});

test('the app: every answer logged gets its attempt id from answerId (live: liveAid) and its content version from cvField', () => {
  const quiz = read('quiz.js'),
    live = read('live.js');
  // No answer id made the old way anywhere an answer is logged.
  assert.doesNotMatch(quiz, /id: Date\.now\(\)\.toString\(36\)/);
  assert.doesNotMatch(live, /id: Date\.now\(\)\.toString\(36\)/);
  assert.strictEqual((quiz.match(/^\s+id: answerId\(\),$/gm) || []).length, 2, 'quiz.js answer and winkAnswer');
  assert.ok(live.includes('id: liveAid(o.pid, o.qi),'));
  assert.ok(live.includes('{qi: x.qi, pid: LV.pid, s: j.s,'), 'the waiting answer keeps its player id');
  assert.strictEqual((quiz.match(/^\s+\.\.\.cvField\(\)$/gm) || []).length, 2, 'quiz.js answer and winkAnswer');
  assert.strictEqual((live.match(/^\s+\.\.\.cvField\(\)$/gm) || []).length, 1);
  // Both of sync.js's sends go through logOut (core.js: cv left out below CV_SHEET).
  const sync = read('sync.js');
  assert.ok(sync.includes('answers: log.map(a => logOut(a, sheetV())),'));
  assert.ok(sync.includes('anonAnswers: batch.map(a => logOut(a, sheetV())),'));
});

test('core.js logOut: cv only from CV_SHEET, pa only from PA_SHEET, each on its own; the queued entry untouched', () => {
  const a = {id: 'a1', m: 'quiz|f', pa: 'fi2', cv: 'cabc'},
    keys = v => Object.keys(C.logOut(a, v)).sort();
  assert.ok(C.PA_SHEET < C.CV_SHEET);
  assert.deepStrictEqual(keys(undefined), ['id', 'm']);
  assert.deepStrictEqual(keys(C.PA_SHEET - 1), ['id', 'm']);
  assert.deepStrictEqual(keys(C.PA_SHEET), ['id', 'm', 'pa']);
  assert.deepStrictEqual(keys(C.CV_SHEET - 1), ['id', 'm', 'pa']);
  assert.strictEqual(C.logOut(a, C.CV_SHEET), a);
  assert.deepStrictEqual(a, {id: 'a1', m: 'quiz|f', pa: 'fi2', cv: 'cabc'});
  // The gate is main's script version + 1 when written (rule D4; tools/sheet_version.py --assign moves it at merge).
  const v = Number(/const VERSION = (\d+);/.exec(read('tools/sync/Code.gs'))[1]);
  assert.ok(C.CV_SHEET > 173 && C.CV_SHEET <= v + 1, `CV_SHEET ${C.CV_SHEET}, VERSION ${v}`);
});

// ---- The content version ----

const CUR = () => ({
  v: 1,
  genera: {Acropora: {cover: 'acropora-1'}},
  quality: {'acropora-1': 3},
  exclude: {'acropora-2': 'excluded'},
  content: {nodes: {}},
  fish: {add: {fi1: 's001'}, seen: {fi2: 1}, content: {nodes: {}}},
  seaslug: {add: {ss1: 's9'}}
});
const FILES = ['a1b2c3d4e5', 'f0f0f0f0f0', '0123456789', 'h1x2'];
const cv = (S, cur = CUR(), files = FILES, st = '') => C.contentVersion(S, cur, files, st);

test('core.js contentVersion: a letter first and 12 characters at most, the same for the same content, per subject', () => {
  for (const S of [CORAL, FISH, SEA]) {
    assert.match(cv(S), CVRE, S.id);
    assert.ok(cv(S).length <= 12);
    assert.strictEqual(cv(S), cv(S), 'deterministic');
  }
  // Each subject its own (the same files and curation, another part of it).
  assert.strictEqual(new Set([cv(CORAL), cv(FISH), cv(SEA)]).size, 3);
  // Nothing at all yet: still a version, the sheet's form.
  assert.match(C.contentVersion(CORAL, null, [], ''), CVRE);
  assert.match(C.contentVersion(FISH, undefined, [null, undefined, ''], undefined), CVRE);
});

test('core.js contentVersion: it changes whenever a data file, the subject’s curation or the structure in force does', () => {
  for (const S of [CORAL, FISH, SEA]) {
    const base = cv(S),
      k = S.admin.cur;
    // A data file changed (its deploy hash), one more or one fewer, or the same files in another order.
    assert.notStrictEqual(cv(S, CUR(), ['a1b2c3d4e6', ...FILES.slice(1)]), base, S.id);
    assert.notStrictEqual(cv(S, CUR(), FILES.slice(0, 3)), base, S.id);
    assert.notStrictEqual(cv(S, CUR(), [...FILES].reverse()), base, S.id);
    // A file not in yet ('-': the game photos of a tree subject still on their way) is another content.
    assert.notStrictEqual(cv(S, CUR(), [...FILES.slice(0, 3), null]), base, S.id);
    // The structure stamp in force (structStamp: '' on the base's circles and pairs).
    assert.notStrictEqual(cv(S, CUR(), FILES, '1x2y3z'), base, S.id);
    // Its own curation: a photo left out, a cover, a content edit.
    const c1 = CUR();
    if (k) c1[k].add.new1 = 's002';
    else c1.quality['acropora-1'] = 2;
    assert.notStrictEqual(cv(S, c1), base, S.id);
    // The exclusions every subject reads (CUR_SHARED: fishGone, fishPhotos read the root's exclude).
    const c2 = CUR();
    c2.exclude['fi9'] = 'excluded';
    assert.notStrictEqual(cv(S, c2), base, S.id);
  }
});

test('core.js contentVersion: another subject’s curation leaves a subject’s version as it is', () => {
  // A fish Publish: the corals' and the sea slugs' versions stay.
  const f = CUR();
  f.fish.add.fi5 = 's003';
  f.fish.seen.fi6 = 1;
  assert.strictEqual(cv(CORAL, f), cv(CORAL));
  assert.strictEqual(cv(SEA, f), cv(SEA));
  assert.notStrictEqual(cv(FISH, f), cv(FISH));
  // The corals' own choices (quality, covers, crops: the root): the tree subjects' versions stay.
  const c = CUR();
  c.quality['acropora-9'] = 1;
  c.genera.Porites = {cover: 'porites-1'};
  c.crop = {'porites-1': [0, 0, 1, 1]};
  assert.strictEqual(cv(FISH, c), cv(FISH));
  assert.strictEqual(cv(SEA, c), cv(SEA));
  assert.notStrictEqual(cv(CORAL, c), cv(CORAL));
  // The curation's parts as curPart takes them.
  assert.deepStrictEqual(Object.keys(C.curPart(FISH, CUR())).sort(), ['exclude', 'fish']);
  assert.deepStrictEqual(Object.keys(C.curPart(SEA, CUR())).sort(), ['exclude', 'seaslug']);
  assert.deepStrictEqual(Object.keys(C.curPart(CORAL, CUR())).sort(), ['content', 'exclude', 'genera', 'quality', 'v']);
  assert.strictEqual(C.curPart(CORAL, null), null);
  assert.deepStrictEqual(C.CUR_SHARED, ['exclude']);
});

test('core.js contentVersion: on the real curation, each subject’s version moves only with its own part', () => {
  const cur = JSON.parse(read('curation.json')),
    v = S => cv(S, cur);
  for (const S of [CORAL, FISH, SEA]) assert.match(v(S), CVRE);
  const fish0 = v(FISH),
    coral0 = v(CORAL);
  cur.fish.seen = {...cur.fish.seen, zz9: 1};
  assert.notStrictEqual(v(FISH), fish0);
  assert.strictEqual(v(CORAL), coral0);
  // The only root key the tree subjects read is the exclusions (core.js CUR_SHARED): fishGone and fishPhotos read
  // cur.exclude, and no other key of the root (the tree engine reads its own part, cur.fish, through treeCur).
  const src = read('core.js'),
    tree = block(src, 'const fishGone = (cur, F = (cur && cur.fish) || {}) =>', '// mine: Pierre');
  assert.deepStrictEqual([...new Set(tree.match(/\bcur && cur\.(\w+)/g))].sort(), ['cur && cur.exclude', 'cur && cur.fish']);
});

// ---- app.js: the files' versions and the content version of the units in force ----

function appVer(extra = {}) {
  const ctx = {JSON, Math, Promise, Error, String, WeakMap, hash53: C.hash53, contentVersion: C.contentVersion, ...extra};
  vm.createContext(ctx);
  const src = read('app.js');
  vm.runInContext(block(src, 'const FILEV = new WeakMap(),', '// Unstable connection (Pierre, 2026-11-01)', {file: 'app.js'}), ctx);
  vm.runInContext(block(src, 'let DATACV = null;', '\n}\n', {file: 'app.js', through: true}), ctx);
  vm.runInContext('this.X = {okJson, fileVer, fileAs, contentVer, set: (d, t) => { DATACV = d; TREE_OF = t; }}', ctx);
  return ctx.X;
}
const resp = (url, j) => ({ok: true, url, json: () => Promise.resolve(j)});

test('app.js fileVer: a file read with ?v= has that version; one without, a hash of its content made once; fileAs carries it', async () => {
  const X = appVer({UNITS: {}, TREE_OF: {}});
  const d = await X.okJson(resp('https://x.example/coral/data.json?v=0123abcdef', {gen: {}}));
  assert.strictEqual(X.fileVer(d), '0123abcdef');
  // A copy never deployed: its frozen number.
  assert.strictEqual(X.fileVer(await X.okJson(resp('/fish.json?v=6', {a: 1}))), '6');
  // No ?v= (the sea slugs' files): a hash of its content, the same for the same content, another for another.
  const s1 = await X.okJson(resp('/seaslug.json', {g: [1, 2]})),
    s2 = await X.okJson(resp('/seaslug.json', {g: [1, 2]})),
    s3 = await X.okJson(resp('/seaslug.json', {g: [1, 3]}));
  assert.match(X.fileVer(s1), /^h[0-9a-z]+$/);
  assert.strictEqual(X.fileVer(s1), X.fileVer(s2));
  assert.notStrictEqual(X.fileVer(s1), X.fileVer(s3));
  // Made once per copy read: a change to it afterwards does not move it (the units were made from it as read).
  const h = X.fileVer(s1);
  s1.g.push(9);
  assert.strictEqual(X.fileVer(s1), h);
  // What is made from a file keeps its version (forms.json read into FORMS, fish-game.json through fishGameRead).
  assert.strictEqual(X.fileVer(X.fileAs(d, {made: 1})), '0123abcdef');
  assert.strictEqual(X.fileVer(null), '-');
  assert.strictEqual(X.fileVer(undefined), '-');
  // A failure is still one.
  await assert.rejects(X.okJson({ok: false, status: 404}), /HTTP 404/);
});

test('app.js contentVer: the corals’ from build, a tree subject’s from its own build, made once per build; none before', async () => {
  const UNITS = {coral: {}, fish: {get: {}}, seaslug: {get: {}}};
  let calls = 0;
  const X = appVer({UNITS, TREE_OF: {}, contentVersion: (...a) => (calls++, C.contentVersion(...a))});
  assert.strictEqual(X.contentVer(CORAL), '', 'no units made yet');
  assert.strictEqual(X.contentVer(FISH), '');
  assert.strictEqual(X.contentVer(undefined), '');
  const raw = await X.okJson(resp('/data.json?v=aaaaaaaaaa', {gen: {}})),
    fj = await X.okJson(resp('/fish.json?v=bbbbbbbbbb', {families: []})),
    gm = await X.okJson(resp('/fish-game.json?v=cccccccccc', {photos: {}})),
    cur = CUR(),
    D = {S: CORAL, cur, st: '', files: [raw, {gf: {}}, {q: {}}, {}], v: ''},
    T = {fish: {cvIn: {S: FISH, cur, st: 'st1', files: [fj, {photos: {}}, {}, {photos: {}}], v: ''}}};
  X.set(D, T);
  const c = X.contentVer(CORAL),
    f = X.contentVer(FISH);
  assert.match(c, CVRE);
  assert.match(f, CVRE);
  assert.notStrictEqual(c, f);
  assert.strictEqual(X.contentVer(SEA), '', 'the sea slugs’ units not made yet');
  // Its first answer makes it; the next ones read it.
  X.contentVer(CORAL);
  X.contentVer(FISH);
  assert.strictEqual(calls, 2);
  // The fish's game photos came: a new build, another version.
  X.set(D, {fish: {cvIn: {...T.fish.cvIn, files: [fj, {photos: {}}, {}, gm], v: ''}}});
  assert.notStrictEqual(X.contentVer(FISH), f);
  assert.strictEqual(X.contentVer(CORAL), c);
  // As the core makes it from the same inputs.
  assert.strictEqual(c, C.contentVersion(CORAL, cur, ['aaaaaaaaaa', X.fileVer({gf: {}}), X.fileVer({q: {}}), X.fileVer({})], ''));
  // A failure never stops the answer: no version.
  const Y = appVer({
    UNITS,
    TREE_OF: {},
    contentVersion: () => {
      throw new Error('x');
    }
  });
  Y.set({S: CORAL, cur, st: '', files: [], v: ''}, {});
  assert.strictEqual(Y.contentVer(CORAL), '');
});

test('app.js: build and fishBuild keep what their units were made from; okJson tags every versioned file it reads', () => {
  const src = read('app.js');
  assert.ok(src.includes("DATACV = {S, cur: CUR, st: DATAST, files: [RAW, FORMS, QUALF, PICKS], v: ''};"));
  assert.ok(src.includes("treeOf(S.id).cvIn = {S, cur: CUR, st: FISHST, files: [FISHRAW.f, FISHRAW.ph, FISHRAW.ho, FISHRAW.gm], v: ''};"));
  assert.ok(src.includes('QUALF = q;'));
  assert.ok(src.includes('gm: gm && gm.photos ? fileAs(gm, fishGameRead(gm)) : {photos: {}}'));
  // Every data file reaches okJson (json, getR(...).then(okJson)): its version is kept there.
  assert.ok(/getR\('data\.json\?v=\d+'\)[\s\S]{0,200}\.then\(okJson\)/.test(src));
  assert.ok(/getR\('forms\.json\?v=\d+'\)\s*\.then\(okJson\)/.test(src));
  assert.ok(/const json = u =>\s*getR\(u\)\s*\.then\(okJson\)/.test(src));
});

// ---- The sheet: the Content version column and the duplicate-safe log ----

const ans = (id, extra = {}) => ({
  id,
  t: `2026-11-18T01:${String(10 + (id.length % 40)).padStart(2, '0')}:00Z`,
  g: 'Acropora',
  a: 'Acropora',
  ok: 1,
  m: 'quiz',
  ph: 'acropora-1',
  ch: 'Acropora Montipora Porites Pocillopora',
  e: 0.5,
  ...extra
});
const save = (s, name, L, extra = {}) => s.post({name, pin: '1234', data: {}, summary: {}, answers: L, ...extra});
const tab = s => s.sheets.Answers.rows;
const cvs = s => {
  const R = tab(s),
    c = R[0].indexOf('Content version');
  return R.slice(1).map(r => [r[7], r[c] ?? '']);
};

test('Code.gs: Content version is the last Answers column, after Photo answered; every column before it stays where it was', () => {
  const s = loadCodeGs();
  save(s, 'Ana', [ans('a1', {cv: 'c1abc2def3gh'})]);
  const H = tab(s)[0],
    LOG = vm.runInContext('LOG', s.ctx);
  assert.deepStrictEqual([...H], [...LOG]);
  assert.strictEqual(H.length, 27);
  assert.strictEqual(H.at(-1), 'Content version');
  assert.strictEqual(H[25], 'Photo answered');
  assert.strictEqual(H[7], 'Id');
  assert.deepStrictEqual(cvs(s), [['a1', 'c1abc2def3gh']]);
});

test("Code.gs: a save's and an anonymous send's content versions are kept; anything else is blank, never a formula", () => {
  const s = loadCodeGs();
  const ok = C.contentVersion(CORAL, CUR(), FILES, '');
  assert.strictEqual(save(s, 'Ana', [ans('a1', {cv: ok}), ans('a2')]).ok, true);
  assert.ok(s.post({anon: 'abcdefghij', anonAnswers: [ans('a3', {cv: 'cz9'})], av: '1-x'}).log);
  const bad = [
    '=HYPERLINK("x")',
    '123456',
    '5e12',
    'C1ABC',
    'c',
    'c' + 'a'.repeat(16),
    'h1abc',
    'c1-2',
    ' c12',
    'c__proto__',
    42,
    {v: 1},
    ['c1']
  ];
  bad.forEach((v, i) => save(s, 'Ana', [ans('b' + i, {cv: v})]));
  assert.deepStrictEqual(cvs(s).slice(0, 3), [
    ['a1', ok],
    ['a2', ''],
    ['a3', 'cz9']
  ]);
  assert.deepStrictEqual(
    cvs(s)
      .slice(3)
      .map(r => r[1]),
    bad.map(() => ''),
    'blank'
  );
  assert.ok(
    !tab(s)
      .flat()
      .some(v => v && typeof v === 'object' && v.formula),
    'no formula anywhere'
  );
});

test('Code.gs: a tab made before the column gets its header at the next answer; its older rows read blank and unchanged', () => {
  const s = loadCodeGs();
  save(s, 'Ana', [ans('a1'), ans('a2')]);
  const A = tab(s);
  A.forEach(r => (r.length = 26));
  const before = A.slice(1).map(r => [...r]),
    rows0 = s.post({readAnswers: 1, token: 'ghp_write000000000000000000'}).rows;
  save(s, 'Ana', [ans('a3', {cv: 'cabc'})]);
  assert.strictEqual(A[0][26], 'Content version');
  assert.deepStrictEqual(
    A.slice(1, 3).map(r => r.slice(0, 26)),
    before
  );
  assert.deepStrictEqual(cvs(s), [
    ['a1', ''],
    ['a2', ''],
    ['a3', 'cabc']
  ]);
  // The readers read the older rows as before (the column is served to none of them).
  const rows1 = s.post({readAnswers: 1, token: 'ghp_write000000000000000000'}).rows;
  assert.deepStrictEqual(rows1.slice(0, 2), rows0);
  assert.strictEqual(rows1[2].length, rows0[0].length);
});

test('Code.gs: a retried send never logs an answer twice, a save’s, an anonymous send’s and a live answer’s alike', () => {
  const s = loadCodeGs();
  const L = [ans('mi4x0a1b2c3d4e5f', {cv: 'cabc'}), ans('mi4x0a1b2c3d4e60')];
  // The reply is lost: the device sends the same queue again, with one more answer.
  save(s, 'Ana', L);
  save(s, 'Ana', [...L, ans('mi4x0a1b2c3d4e61')]);
  assert.deepStrictEqual(
    tab(s)
      .slice(1)
      .map(r => r[7]),
    ['mi4x0a1b2c3d4e5f', 'mi4x0a1b2c3d4e60', 'mi4x0a1b2c3d4e61']
  );
  // Anonymous, then the same answers in the save after sign-in (LOG0): already there, not again.
  s.post({anon: 'abcdefghij', anonAnswers: [ans('an1'), ans('an2')], av: '1-x'});
  s.post({anon: 'abcdefghij', anonAnswers: [ans('an1'), ans('an2')], av: '1-x'});
  save(s, 'Bo', [ans('an1'), ans('an2'), ans('bo1')]);
  // A live answer logged again after a reload (live.js liveAid: the same id for the player and the question).
  save(s, 'Bo', [ans('l0a1b2c3d4eq3', {m: 'live'})]);
  save(s, 'Bo', [ans('l0a1b2c3d4eq3', {m: 'live'}), ans('l0a1b2c3d4eq4', {m: 'live'})]);
  const ids = tab(s)
    .slice(1)
    .map(r => r[7]);
  assert.strictEqual(new Set(ids).size, ids.length, 'every id once');
  assert.deepStrictEqual(ids.slice(3), ['an1', 'an2', 'bo1', 'l0a1b2c3d4eq3', 'l0a1b2c3d4eq4']);
});

test('Code.gs: the same answer twice in one send is logged once and counted once against the caps', () => {
  const s = loadCodeGs();
  save(s, 'Ana', [ans('d1'), ans('d1'), ans('d2'), ans('d1')]);
  assert.deepStrictEqual(
    tab(s)
      .slice(1)
      .map(r => r[7]),
    ['d1', 'd2']
  );
  const cap = k =>
    Object.entries(s.cache)
      .filter(([x]) => x.startsWith('cap:' + k + ':') && !x.endsWith(':alert'))
      .reduce((t, [, v]) => t + Number(v), 0);
  assert.strictEqual(cap('n:ana'), 2);
  s.post({anon: 'abcdefghij', anonAnswers: [ans('e1'), ans('e1')], av: '1-x'});
  assert.strictEqual(cap('a:abcdefghij'), 1);
  assert.deepStrictEqual(
    tab(s)
      .slice(1)
      .map(r => r[7]),
    ['d1', 'd2', 'e1']
  );
  // The merged name's path (gone: its answers go to the name it joined) reads the ids itself: once there too.
  const L = vm.runInContext('(n, A) => { logAnswers_(n, A, null, ""); return 1; }', s.ctx);
  L('Ana', [ans('f1'), ans('f1'), ans('d2')]);
  assert.deepStrictEqual(
    tab(s)
      .slice(1)
      .map(r => r[7]),
    ['d1', 'd2', 'e1', 'f1']
  );
});

test('Code.gs: an id longer than the 20 characters the tab keeps is compared as kept, so its resend is skipped', () => {
  const s = loadCodeGs(),
    long = 'abcdefghij0123456789xyz';
  save(s, 'Ana', [ans(long)]);
  save(s, 'Ana', [ans(long)]);
  assert.deepStrictEqual(
    tab(s)
      .slice(1)
      .map(r => r[7]),
    [long.slice(0, 20)]
  );
});

test('Code.gs: a send with no answer does not read the Id column', () => {
  const s = loadCodeGs();
  save(s, 'Ana', [ans('a1')]);
  const sh = s.sheets.Answers,
    get = sh.getRange.bind(sh);
  let idReads = 0;
  sh.getRange = (r, c, nr, nc) => {
    if (c === 8 && nc === 1) idReads++;
    return get(r, c, nr, nc);
  };
  save(s, 'Ana', []);
  save(s, 'Ana', undefined);
  assert.strictEqual(idReads, 0);
  save(s, 'Ana', [ans('a2')]);
  assert.strictEqual(idReads, 1, 'one read of the ids for a send that has answers');
});
