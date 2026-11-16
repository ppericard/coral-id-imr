require('./slot.js').testGuard();
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

// A content map's entries cut to v and src (the content editor's edits: what the app applies and shows, core.js contentApply).
const slimC = c =>
  c && {
    ...c,
    ...(c.nodes
      ? {
          nodes: Object.fromEntries(
            Object.entries(c.nodes).map(([i, m]) => [
              i,
              Object.fromEntries(
                Object.entries(m).map(([s, e]) => [s, Object.fromEntries(Object.entries(e).filter(([k]) => k === 'v' || k === 'src'))])
              )
            ])
          )
        }
      : {}),
    ...(c.pairs
      ? {
          pairs: Object.fromEntries(
            Object.entries(c.pairs).map(([p, e]) => [p, Object.fromEntries(Object.entries(e).filter(([k]) => k === 'v' || k === 'src'))])
          )
        }
      : {})
  };
test('curation-play.json: curation.json without auto, fish tags and ease, and fish auto but its undone adds', () => {
  const {auto, fish, content, ...rest} = FULL,
    {fish: pf, content: pc, ...prest} = PLAY;
  assert.deepStrictEqual(prest, rest);
  assert.deepStrictEqual(pc, slimC(content));
  const {tags, ease, auto: fa, content: fc, ...frest} = fish || {},
    {auto: pa, content: pfc, ...pfrest} = pf || {};
  assert.deepStrictEqual(pfrest, frest);
  assert.deepStrictEqual(pfc, slimC(fc));
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
  // The content editor's edits (made up) keep v and src only, never was, t or by, in both parts, nodes and pairs.
  const E = {v: ['a'], was: ['b'], src: {t: 'S'}, t: 1, by: 'p1'},
    K = {v: ['a'], src: {t: 'S'}};
  assert.deepStrictEqual(
    slim({
      v: 1,
      content: {nodes: {Acropora: {imr: E}}, pairs: {'A|B': {v: null, was: 1, t: 2}}},
      fish: {content: {nodes: {'f:X': {cues: E, note: {v: null, was: 'x', t: 3}}, 'f:Y': {}}}}
    }),
    {
      v: 1,
      content: {nodes: {Acropora: {imr: K}}, pairs: {'A|B': {v: null}}},
      fish: {content: {nodes: {'f:X': {cues: K, note: {v: null}}, 'f:Y': {}}}}
    }
  );
  // His confirmation of a juvenile cover (coverJ beside the cover: autosort.js fishCoverJ, 2026-11-15) reaches the players.
  const G = {'f:A': {cover: 'fi1', coverJ: 'fi1'}};
  assert.deepStrictEqual(slim({fish: {genera: G, tags: {fi1: 'p1g0sl1j'}}}).fish.genera, G);
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
      refLevel: C.refLevel,
      contentApply: C.contentApply,
      treeCur: C.treeCur,
      SUBJECTS: C.SUBJECTS
    };
  vm.createContext(ctx);
  vm.runInContext(
    "let FISH = null, FISHRAW = null, CUR = null, FISHF = null, TREE_AT = 'fish';\n" +
      // a scientific genus's species line names each species by the player's first name (cnFirst; imrNow: not at IMR)
      block(src, 'const cnList = s =>', '\n};\n', {through: 1, file: 'app.js'}) +
      'const imrNow = () => false;\n' +
      block(src, 'const VIEWS = [', '];\n', {through: 1, file: 'app.js'}) +
      block(src, 'const allPhotos = g =>', '// applyCuration(d, c) and applySlots', {file: 'app.js'}) +
      block(src, 'function fishGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) +
      block(src, 'const fishBuild = () => {', 'const treeLoad = id =>', {file: 'app.js'}) +
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
  // With the content editor's edits (made up: none on main today), one of them stale (was differs from the base), the
  // same units from the copy without was, t and by: the app reads v and src only (core.js contentApply).
  const fam = raw.f.families.find(f => (f.cues || []).length && (f.look || []).length),
    lk = fam.look[0][0],
    ph = raw.f.families.find(f => f.id !== fam.id && (f.phase || []).length);
  U.fish.content = {
    nodes: {
      [fam.id]: {
        cues: {v: ['An edited tip'], was: ['Not the base any more'], src: {t: 'A made-up source'}, t: 1, by: 'p1'},
        note: {v: 'A note', was: null, t: 2},
        ['look/' + lk]: {v: 'Edited words', was: fam.look[0][1], src: {t: 'A look source'}, t: 3}
      },
      [ph.id]: {phase: {v: ['An edited phase line'], was: ph.phase, src: {t: 'A phase source'}, t: 4}}
    }
  };
  const E1 = ctx.run(raw, U);
  assert.deepStrictEqual(E1.gen[fam.id].qt, ['An edited tip']);
  // The sources reach the units: the tips' (tipsList), the look-alike line's (quiz.js fbBody; Codex review #957).
  assert.strictEqual(
    JSON.stringify([E1.gen[fam.id].qsrc, E1.gen[fam.id].lksrc]),
    JSON.stringify([{t: 'A made-up source'}, {[lk]: {t: 'A look source'}}])
  );
  // and the phase lines' (quiz.js fbBody's More)
  assert.strictEqual(
    JSON.stringify([E1.gen[ph.id].phase, E1.gen[ph.id].psrc]),
    JSON.stringify([['An edited phase line'], {t: 'A phase source'}])
  );
  assert.ok(
    Object.values(ctx.run(raw, FULL).gen).every(g => !g.lksrc && !g.qsrc && !g.psrc),
    'none while nothing is edited'
  );
  assert.deepStrictEqual(JSON.stringify(ctx.run(raw, slim(U))), JSON.stringify(E1));
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
