require('./slot.js').testGuard();
// Sea slug basics (proto/seaslugbasics.js; Q437, Pierre 2026-11-19: every game mode open to every subject): the sea
// slugs' basics module on the shared engine (proto/basics.js, its BASICS_KIT). Checked here without a browser: the
// module's content run in Node on stubs (every step, view, drawing, word and check), its sources (rule C2: every line
// names one it rests on, each a page read for it), its lines short (rule C3), the genera it names the game's (rule C6),
// its wiring (the subject's record and feat, the Learn card's trail, the words of the offers, the Lab list and the service
// worker's) and the subject's Basics page open. The page itself is looked at in seaslug.smoke.js.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SEA = JSON.parse(read('seaslug.json'));

// The lengths a line may take (rule C3: short and simple for anyone): a view's or a step's sentence, a word's plain line.
const SAY_MAX = 200,
  WORD_MAX = 80;

// The game's genera and species by name (seaslug.json), and a few as the page holds them: GX by unit id.
const GEN = new Map(SEA.genera.map(g => [g.name, g]));
const SPECIES = new Set(SEA.species.map(s => s.name));

function load({units = null} = {}) {
  const added = [],
    esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // A small tree: two families in two groups, three genera; a fourth group with nothing in the game.
  const GXS = units || {
    'g:Chromodoris': {name: 'Chromodoris', parent: 'f:Chromodorididae'},
    'g:Hexabranchus': {name: 'Hexabranchus', parent: 'f:Hexabranchidae'},
    'g:Pteraeolidia': {name: 'Pteraeolidia', parent: 'f:Facelinidae'},
    'f:Chromodorididae': {name: 'Chromodorididae', tg: 1},
    'f:Hexabranchidae': {name: 'Hexabranchidae', tg: 1},
    'f:Facelinidae': {name: 'Facelinidae', tg: 2}
  };
  const ctx = {
    BASICS: {add: m => added.push(m)},
    esc,
    shuffle: a => [...a].reverse(),
    pick: a => a[0],
    basicsKey: () => 'reefid-seaslug-basics',
    TREEU: {
      taxa: {
        cite: 'WoRMS Editorial Board, World Register of Marine Species',
        short: 'WoRMS',
        groups: [
          {n: 1, title: 'Nudibranchia · Doridina'},
          {n: 2, title: 'Nudibranchia · Cladobranchia'},
          {n: 3, title: 'Sacoglossa'}
        ]
      }
    },
    slateGenera: () => Object.keys(GXS).filter(n => n.startsWith('g:')),
    GX: n => GXS[n],
    cover: g =>
      g && g.name !== 'Hexabranchus' ? {f: 'p-' + g.name, ar: 1.5, a: 'A. Diver', o: 'https://www.inaturalist.org/observations/1'} : null,
    unameT: n => GXS[n].name,
    thumb: () => 'src="x"',
    ZOOMI: '<i></i>',
    zoom: () => {}
  };
  vm.createContext(ctx);
  const s = read('proto/basics.js');
  vm.runInContext(s.slice(s.indexOf('const BASICS_KIT'), s.indexOf('// end of BASICS_KIT')) + '\nthis.BASICS_KIT = BASICS_KIT;', ctx);
  vm.runInContext(read('proto/seaslugbasics.js'), ctx);
  assert.strictEqual(added.length, 1, 'one module registered');
  return added[0];
}

test('Sea slug basics: the module, its steps and the Learn card share one set of ids', () => {
  const M = load();
  assert.strictEqual(M.id, 'seaslugbasics');
  assert.strictEqual(M.name, 'Sea slug basics');
  assert.strictEqual(M.hub, false, 'no line of its own on the Tools page');
  assert.strictEqual(M.key(), 'reefid-seaslug-basics');
  const ids = M.steps.map(s => s.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'one id per step');
  assert.deepStrictEqual([...ids], ['dorid', 'cerata', 'others', 'groups']);
  const learn = read('learn.js'),
    trail = learn.slice(learn.indexOf('const BASICS_TRAIL_S = ['), learn.indexOf('const BASICS_AT_S'));
  assert.deepStrictEqual(
    [...trail.matchAll(/^\s{2}\[\s*'(\w+)',/gm)].map(m => m[1]),
    [...ids],
    "the card's trail follows the steps, in order"
  );
  const at = learn.slice(learn.indexOf('const BASICS_AT_S = ['), learn.indexOf('const BASICS_TRAIL_F'));
  assert.strictEqual([...at.matchAll(/\[\d+, \d+\]/g)].length, ids.length, 'a place on the card for every step');
  assert.match(read('app.js'), /mod: 'seaslugbasics',[\s\S]{0,900}trail: \(\) => \(\{stops: BASICS_TRAIL_S, at: BASICS_AT_S, turn: 1\}\)/);
});

test('Sea slug basics: every view draws, every line is short and sourced, every check works', () => {
  const M = load(),
    titles = Object.values(M.refs).map(r => `“${r.title}”`);
  // Every source a page read for the module, with its address (the decision record lists what each gave).
  Object.entries(M.refs).forEach(([k, r]) => {
    assert.ok(r.t && /^https:\/\/(www\.seaslugforum\.net\/find\/|en\.wikipedia\.org\/w\/index\.php\?title=\w+&oldid=\d+)/.test(r.u), k);
  });
  const named = src => titles.some(t => String(src).includes(t));
  M.steps.forEach(s => {
    assert.ok(s.t && s.say, `${s.id}: a title and a plain sentence`);
    assert.ok(s.say.length <= SAY_MAX, `${s.id}: its sentence is short (${s.say.length})`);
    assert.ok(s.src, `${s.id}: its source (rule C2)`);
    if (s.id !== 'groups') assert.ok(named(s.src), `${s.id}: its source is one of the module's`);
    const V = s.views;
    assert.ok(Array.isArray(V) && V.length, `${s.id}: views`);
    assert.strictEqual(new Set(V.map(v => v.id)).size, V.length, `${s.id}: one id per view`);
    V.forEach(v => {
      const f = v.fig();
      assert.match(f, /<svg[\s\S]*<\/svg>|bx-gfam/, `${s.id}/${v.id}: a figure`);
      assert.ok(!/undefined|NaN|\[object/.test(f + v.icon), `${s.id}/${v.id}: no stray value in its drawing`);
      assert.ok(v.icon && /<svg/.test(v.icon), `${s.id}/${v.id}: an icon`);
      assert.ok(v.name && v.say, `${s.id}/${v.id}: a name and a sentence`);
      assert.ok(v.say.length <= SAY_MAX, `${s.id}/${v.id}: its sentence is short (${v.say.length})`);
      assert.ok(v.src && named(v.src), `${s.id}/${v.id}: its source, one of the module's (rule C2)`);
      if (f.startsWith('<svg')) assert.match(f, /^<svg[^>]*role="img" aria-label="[^"]+"/, `${s.id}/${v.id}: its text alternative`);
      // The genera under a drawing are the game's (rule C6), each shown by its cover, a genus with none left out.
      (v.gen || []).forEach(g => assert.ok(GEN.has(g), `${s.id}/${v.id}: ${g} is a genus of the game`));
    });
    const ck = s.check;
    assert.ok(ck, `${s.id}: a check`);
    if (ck.type === 'draw') {
      assert.strictEqual(ck.opts.length, 3, `${s.id}: three drawings`);
      assert.ok(ck.a >= 0 && ck.a < 3 && ck.why, `${s.id}: the right one is among them, and why`);
      ck.opts.forEach(o => assert.match(M.drawOpt(o, ck), /^<svg[^>]*aria-label/, `${s.id}: option ${o} draws`));
      assert.ok(ck.why.length <= SAY_MAX);
    } else assert.strictEqual(typeof ck.own, 'function', `${s.id}: a check of its own`);
  });
  // A view's photos: the covers of its genera the game holds, Hexabranchus (no cover here) with its name only.
  const gills = M.steps[0].views.find(v => v.id === 'gills').fig();
  assert.match(gills, /bx-gfam bx-few/);
  assert.match(gills, /Hexabranchus/);
  assert.ok(!/Nembrotha/.test(gills), 'a genus the game does not hold (here) drops out');
  // The side-gilled slug is drawn facing right: the side seen is its right side, where its gill is.
  assert.match(M.steps[2].views.find(v => v.id === 'side').fig(), /scale\(-1 1\)/);
});

test('Sea slug basics: the words, their places and the sources’ own lines', () => {
  const M = load(),
    stepOf = Object.fromEntries(M.steps.filter(s => s.id !== 'groups').map(s => [s.id, s])),
    seen = new Set();
  M.words.forEach(([t, r, plain]) => {
    assert.ok(t && plain, `${t}: a plain line`);
    assert.ok(plain.length <= WORD_MAX, `${t}: its plain line is short (${plain.length})`);
    assert.ok(!seen.has(t.toLowerCase()), `${t}: listed once`);
    seen.add(t.toLowerCase());
    const [sid, vid] = r.split('|');
    assert.ok(stepOf[sid] || sid === 'groups', `${t}: step ${sid}`);
    if (vid)
      assert.ok(
        stepOf[sid].views.some(v => v.id === vid),
        `${t}: view ${sid}|${vid}`
      );
    assert.strictEqual(M.route(t), 'basics|' + r);
  });
  assert.strictEqual(M.route('Nothing'), '');
  // A source's own line is named as that source's, verbatim; none is made up for a word they do not define.
  const o = M.official('Cerata');
  assert.deepStrictEqual([...o], ['Cerata', 'All aeolids have these dorsal and lateral outgrowths of the body.', M.refs.ceras.t]);
  assert.strictEqual(M.official('Sheath'), null);
});

test('Sea slug basics: the groups are the Learn page’s, from the data, with a few genera each', () => {
  const M = load(),
    g = M.steps.find(s => s.id === 'groups'),
    V = g.views;
  assert.deepStrictEqual(
    [...V.map(v => v.name)],
    ['Nudibranchia · Doridina', 'Nudibranchia · Cladobranchia'],
    'only the groups that hold genera, in the classification’s order, with its names (WoRMS: seaslug.json taxa)'
  );
  assert.deepStrictEqual([...V.map(v => v.short)], ['Doridina', 'Cladobranchia']);
  assert.match(g.say, /WoRMS/);
  assert.match(g.src, /WoRMS Editorial Board/, 'credited to the classification');
  const fig = V[0].fig();
  assert.match(fig, /Chromodoris/);
  assert.match(fig, /Hexabranchus/);
  assert.ok(!/Pteraeolidia/.test(fig), "another group's genus stays out");
  V.forEach(v => assert.ok(v.src && v.say.length <= SAY_MAX, `${v.name}: its line, short and sourced`));
  assert.ok(!g.all, 'seen on opening');
  // The photo check: a genus's cover, the groups there are to choose from (two here, never padded), blind until answered.
  const box = {
    html: '',
    set innerHTML(h) {
      this.html = h;
    },
    get innerHTML() {
      return this.html;
    },
    querySelector: () => ({}),
    querySelectorAll: () => []
  };
  g.check.own(box, {src() {}, fb() {}, again: '', m: 'basics-groups', markDone() {}});
  assert.match(box.html, /Which group is this sea slug in\?/);
  assert.strictEqual((box.html.match(/data-j="/g) || []).length, 2);
  // At most six genera a group, in the slate's order.
  const many = {};
  for (let i = 0; i < 9; i++) many['g:G' + i] = {name: 'G' + i, parent: 'f:F'};
  many['f:F'] = {name: 'F', tg: 1};
  const big = load({units: many})
    .steps.find(s => s.id === 'groups')
    .views[0].fig();
  assert.strictEqual((big.match(/<figure>/g) || []).length, 6);
});

test('Sea slug basics: what it names is the game’s and read (rules C2, C6), no person, no subject in the code', () => {
  const src = read('proto/seaslugbasics.js'),
    code = src.replace(/^\s*\/\/.*$/gm, '');
  // Every genus named in a line is a genus of the game (present in the Philippines, rule C8).
  const M = load(),
    lines = [
      ...M.steps.flatMap(s => [s.say, ...(s.id === 'groups' ? [] : s.views.flatMap(v => [v.say, v.name]))]),
      ...M.words.map(w => w[2])
    ].join(' ');
  // The genera the lines name (a capitalised word that is no plain English word of theirs): each is the game's.
  const PLAIN = new Set([
    'Nudibranchs',
    'Nudibranchia',
    'Start',
    'Their',
    'Two',
    'Many',
    'Most',
    'Each',
    'Through',
    'Rows',
    'Rhinophores',
    'Sea',
    'Side',
    'Sacoglossans',
    'Flaps',
    'Feelers',
    'Outgrowths',
    'Gills',
    'Mantle',
    'Aeolids',
    'Dorids',
    'Cerata',
    'Cnidosac',
    'Headshield',
    'Parapodia',
    'Oral',
    'Sacoglossan',
    'Gill',
    'Dorid',
    'Aeolid',
    'Nudibranch',
    'Sheath',
    'Foot',
    'Some',
    'Phyllidia',
    'Not',
    'Which',
    'Sheath',
    'The',
    'On',
    'At',
    'In',
    'An',
    'Its',
    'And',
    'From',
    'Latin',
    'Forum',
    'Learn',
    'Tap',
    'Groups'
  ]);
  const named = [...new Set([...lines.matchAll(/\b([A-Z][a-z]{3,})\b/g)].map(m => m[1]))].filter(w => !PLAIN.has(w) || GEN.has(w));
  named.forEach(w => assert.ok(GEN.has(w), `${w}: a genus of the game (rule C6)`));
  assert.ok(['Hexabranchus', 'Phyllidia', 'Phyllodesmium', 'Thuridilla', 'Chelidonura'].every(g => named.includes(g) || lines.includes(g)));
  // No species named on screen; the fact sheets read about one species are about species of the game.
  SPECIES.forEach(sp => assert.ok(!lines.includes(sp), `${sp}: no species named on screen`));
  ['Hexabranchus sanguineus', 'Thuridilla lineolata', 'Chelidonura amoena', 'Pleurobranchus forskalii'].forEach(sp => {
    assert.ok(Object.values(M.refs).some(r => r.t.includes(sp)));
    assert.ok(SPECIES.has(sp), `${sp}: a species of the game (rule C6)`);
  });
  assert.ok(!/imrl-|\.webp|<img src=/i.test(code), 'drawings and the game’s own photos only');
  assert.ok(!/\b(Dr\.?|Prof\.?)\s+[A-Z]/.test(src), 'no person');
  assert.ok(!/'seaslug'|"seaslug"/.test(src), 'no subject id literal (rule S1)');
});

test('Sea slug basics: open for the sea slugs, its own record and feat, wired as the others', () => {
  const S = C.subjectOf('seaslug'),
    F = C.subjectOf('fish'),
    K = C.subjectOf('coral');
  assert.strictEqual(S.pages[0], 'basics', 'the first Learn tab');
  assert.ok(!('basics' in (S.closed || {})), 'no longer closed');
  assert.deepStrictEqual({...S.basics}, {feat: '_sbasics'});
  assert.strictEqual(new Set([S.basics.feat, F.basics.feat, K.basics.feat]).size, 3, 'a feat of its own');
  assert.strictEqual(C.subjDev('seaslug', 'basics'), 'reefid-seaslug-basics');
  assert.strictEqual(C.routeOut('basics', S), 'seaslug/learn/basics');
  assert.strictEqual(C.routeOut('basics|dorid|gills', S), 'seaslug/learn/basics/dorid/gills');
  const r = C.routeIn('seaslug/learn/basics/words');
  assert.strictEqual(r.key, 'basics|words');
  assert.strictEqual(r.S.id, 'seaslug');
  const lab = read('proto/lab.js'),
    sw = read('sw.js');
  assert.match(lab, /files: \[[^\]]*'basics',\s*'fishbasics',\s*'seaslugbasics'/);
  assert.match(sw, /'basics',\s*'fishbasics',\s*'seaslugbasics'/);
  assert.match(lab, /seaslugbasics: 'learn'/);
  // The sheet script's copy of SUBJECTS says the same (tools/sync_core.py).
  assert.match(read('tools/sync/Code.gs'), /basics: \{feat: '_sbasics'\}/);
});
