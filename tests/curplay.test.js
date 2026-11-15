// The players' copy of the curation (Pierre, 2026-11-09: "a smaller curation file for players, built at deploy"):
// tools/curplay.py writes curation-play.json from curation.json, without the admin's working state, and the app reads it
// (app.js curFetch). Checked here: the copy drops only what it says; the app builds the same games from it as from the
// whole file (the coral genera under applyCuration, applyForms and applySlots, the fish units under app.js fishBuild,
// the fish photos taken out of play, the reports thanked); and no script the app or the Lab loads reads a field it drops.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  {execFileSync} = require('child_process'),
  block = require('./block.js');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
// tools/curplay.py slim() on a curation object.
const slim = cur =>
  JSON.parse(
    execFileSync(
      'python3',
      ['-c', 'import sys, json; sys.path.insert(0, "tools"); import curplay; print(json.dumps(curplay.slim(json.load(sys.stdin))))'],
      {
        cwd: ROOT,
        input: JSON.stringify(cur),
        maxBuffer: 1 << 28
      }
    ).toString()
  );
const FULL = read('curation.json'),
  PLAY = slim(FULL);

test('curation-play.json: curation.json without auto, fish tags and ease, and fish auto but its undone adds', () => {
  const {auto, fish, ...rest} = FULL,
    {fish: pf, ...prest} = PLAY;
  assert.deepStrictEqual(prest, rest);
  const {tags, ease, auto: fa, ...frest} = fish || {},
    {auto: pa, ...pfrest} = pf || {};
  assert.deepStrictEqual(pfrest, frest);
  // The fish auto-sort log keeps only its undone adds ('-a…', core.js fishGone), day by day.
  const undone = Object.fromEntries(
    Object.entries(fa || {})
      .map(([d, L]) => [d, Object.fromEntries(Object.entries(L || {}).filter(([, c]) => /^-a/.test(String(c))))])
      .filter(([, L]) => Object.keys(L).length)
  );
  assert.deepStrictEqual(pa || {}, undone);
  // A third of the file or less (2026-11-09: 1.33 million characters, 0.50 million in the copy).
  assert.ok(JSON.stringify(PLAY).length < 0.5 * JSON.stringify(FULL).length, `${JSON.stringify(PLAY).length} characters`);
  // An undone add (none in the real log today) is kept; a decision is not.
  const t = slim({v: 1, fish: {auto: {'2026-11-09': {a: '-a1x', b: 'ate', c: 'r'}, '2026-11-08': {d: 'ate'}}, tags: {a: 'x'}}});
  assert.deepStrictEqual(t, {v: 1, fish: {auto: {'2026-11-09': {a: '-a1x'}}}});
});

test('the coral games from the players copy: the same genera, views, covers and slots', () => {
  const D = read('data.json'),
    picks = read('picks.json'),
    autoq = read('quality.json').q || {};
  // app.js applyForms, on forms.json as the app reads it (app.js forms).
  const fj = read('forms.json'),
    ctx = {FORMS: {gf: fj.gf || {}, form: fj.form || {}, gunsure: Object.fromEntries((fj.gunsure || []).map(f => [f, 1]))}};
  vm.createContext(ctx);
  vm.runInContext(
    block(fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'), 'function applyForms(d, c) {', '\n}\n', {through: 1, file: 'app.js'}) +
      '\nthis.applyForms = applyForms;',
    ctx
  );
  const build = cur => {
    const d = structuredClone(D);
    C.applyCuration(d, cur);
    ctx.applyForms(d, cur);
    C.applySlots(d, cur, {picks, autoq});
    if (d.x) {
      const x = {gen: d.x.gen, course: {}, cand: d.cand};
      C.applyCuration(x, cur);
      ctx.applyForms(x, cur);
      C.applySlots(x, cur, {picks, autoq});
    }
    return d;
  };
  assert.deepStrictEqual(build(PLAY), build(FULL));
});

test('the fish units from the players copy: the same photos in play, covers and featured photos', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'),
    ctx = {
      fishGen: C.fishGen,
      fishPhotos: C.fishPhotos,
      easyRank: C.easyRank,
      easyCover: C.easyCover,
      fishPid: C.fishPid,
      fishScoreTree: C.fishScoreTree,
      refLevel: C.refLevel
    };
  vm.createContext(ctx);
  vm.runInContext(
    'let FISH = null, FISHRAW = null, CUR = null;\n' +
      block(src, 'const VIEWS = [', '];\n', {through: 1, file: 'app.js'}) +
      block(src, 'const allPhotos = g =>', '// applyCuration(d, c) and applySlots', {file: 'app.js'}) +
      block(src, 'function fishGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) +
      block(src, 'const fishBuild = () => {', 'const fishLoad = () =>', {file: 'app.js'}) +
      block(src, 'function rankPhotos() {', '\n}\n', {through: 1, file: 'app.js'}) +
      '\nthis.run = (raw, cur) => { FISHRAW = raw; CUR = cur; return fishBuild(); };',
    ctx
  );
  const raw = {f: read('fish.json'), ph: read('fish-photos.json'), gm: read('fish-game.json')};
  assert.deepStrictEqual(JSON.stringify(ctx.run(raw, PLAY)), JSON.stringify(ctx.run(raw, FULL)));
  assert.deepStrictEqual([...C.fishGone(PLAY)].sort(), [...C.fishGone(FULL)].sort());
  // With undone automatic adds in the log (made up: the real log has none today), the photos they take out stay out.
  const L = Object.values(raw.gm.photos)
      .flat()
      .filter(p => p.auto)
      .slice(0, 5),
    U = structuredClone(FULL);
  U.fish = {...U.fish, auto: {...(U.fish.auto || {}), '2026-11-09': Object.fromEntries(L.map(p => [p.f, '-a1x']))}};
  assert.ok(L.length, 'automatic photos in fish-game.json');
  assert.deepStrictEqual([...C.fishGone(slim(U))].sort(), [...C.fishGone(U)].sort());
  assert.deepStrictEqual(JSON.stringify(ctx.run(raw, slim(U))), JSON.stringify(ctx.run(raw, U)));
  // The reports thanked (progress.js handledSeen on curation seen).
  assert.deepStrictEqual(C.handledSeen(PLAY.seen, {}), C.handledSeen(FULL.seen, {}));
});

test('no script the app or the Lab loads reads a field the players copy drops', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'),
    files = [
      ...[...html.matchAll(/href="([\w./-]+\.js)\?v=\d+"/g)].map(m => m[1]),
      ...fs
        .readdirSync(path.join(ROOT, 'proto'))
        .filter(f => f.endsWith('.js'))
        .map(f => 'proto/' + f)
    ];
  assert.ok(files.includes('app.js') && files.includes('core.js') && files.includes('quiz.js'), files.join(' '));
  // What reads the curation's dropped fields: its tags, ease or auto, on the curation (CUR, cur, c) or its fish part
  // (F, .fish). The one reader allowed: core.js fishGone, of the undone adds the copy keeps.
  const BAD = [
    /\b(?:CUR|cur|c|F|fish)\s*(?:\)\s*)?(?:\.|\?\.)\s*(?:tags|ease)\b/,
    /\.fish\b[^;\n]*\.(?:tags|ease)\b/,
    /\b(?:CUR|cur|c)\s*(?:\.|\?\.)\s*auto\b/,
    /\.fish\b[^;\n]*\.auto\b/,
    /\b(?:F|fish)\s*(?:\.|\?\.)\s*auto\b/,
    /\[\s*['"](?:tags|ease)['"]\s*\]/
  ];
  const hits = [];
  for (const f of files)
    fs.readFileSync(path.join(ROOT, f), 'utf8')
      .split('\n')
      .forEach((l, i) => {
        if (/^\s*\/\//.test(l)) return;
        if (BAD.some(r => r.test(l))) hits.push(`${f}:${i + 1}: ${l.trim()}`);
      });
  assert.deepStrictEqual(
    hits.filter(
      h =>
        !/^core\.js:\d+: \.\.\.Object\.values\(F\.auto \|\| \{\}\)\.flatMap\(d => Object\.keys\(d \|\| \{\}\)\.filter\(f => \/\^-a\//.test(
          h
        )
    ),
    [],
    'a player script reads a field tools/curplay.py drops: keep it in curation-play.json, or read it another way'
  );
  assert.ok(hits.length === 1, 'core.js fishGone still reads fish auto: ' + hits.join(' | '));
});
