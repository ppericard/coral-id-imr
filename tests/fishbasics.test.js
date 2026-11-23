require('./slot.js').testGuard();
// Fish basics (docs/FISH_PATH.md "Fish basics"; proto/fishbasics.js): the fish twin of Coral basics, on
// the same engine (proto/basics.js). Checked here without a browser: the module's content run in Node on stubs (every step,
// view, drawing, word and check), its wiring (the subject's record and feat, the Learn card's trail, the words of the
// offers, the Lab list and the service worker's), and the rules it must keep: no slide photo, no person's name (rule D2),
// no subject named in the engine (rule S1). The page itself is looked at in pages.smoke.js (basics).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// proto/fishbasics.js in a vm: BASICS.add receives the module's content C; the page's helpers are stubs.
function load() {
  const added = [],
    esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const GXS = {
    'f:A': {name: 'Alpha', group: 1},
    'f:B': {name: 'Beta', group: 1},
    'f:C': {name: 'Gamma', group: 3}
  };
  const ctx = {
    BASICS: {add: m => added.push(m)},
    esc,
    shuffle: a => [...a].reverse(),
    pick: a => a[0],
    basicsKey: () => 'reefid-fish-basics',
    TREEU: {
      groups: [
        {n: 1, title: 'Disk-shaped/Colorful'},
        {n: 2, title: 'Empty group'},
        {n: 3, title: 'Small Ovals'}
      ],
      key: {short: 'Allen et al. 2015', cite: 'Allen, G. (2015). Reef Fish Identification'}
    },
    slateGenera: () => Object.keys(GXS),
    scaleUnits: () => Object.keys(GXS),
    GX: n => GXS[n],
    cover: g => ({f: 'p-' + g.name, ar: 1.5, a: 'A. Diver', o: 'https://www.inaturalist.org/observations/1', t: 'x'}),
    groupHue: n => n * 10,
    unameT: n => GXS[n].name,
    thumb: () => 'src="x"',
    ZOOMI: '<i></i>',
    zoom: () => {}
  };
  // The engine's shared pieces first (proto/basics.js BASICS_KIT), as the page loads them before the module.
  vm.createContext(ctx);
  vm.runInContext(kitSrc(), ctx);
  vm.runInContext(read('proto/fishbasics.js'), ctx);
  assert.strictEqual(added.length, 1, 'one module registered');
  return added[0];
}
// proto/basics.js's BASICS_KIT, alone: it reads only the page's helpers the stubs give (tests/seaslugbasics.test.js too).
function kitSrc() {
  const s = read('proto/basics.js'),
    a = s.indexOf('const BASICS_KIT'),
    b = s.indexOf('// end of BASICS_KIT');
  assert.ok(a > 0 && b > a, 'the kit is in proto/basics.js');
  return s.slice(a, b) + '\nthis.BASICS_KIT = BASICS_KIT;';
}

test('Fish basics: the module, its steps and the offers share one set of ids', () => {
  const M = load();
  assert.strictEqual(M.id, 'fishbasics');
  assert.strictEqual(M.name, 'Fish basics');
  assert.strictEqual(M.hub, false, 'no line on the Tools page');
  assert.strictEqual(M.key(), 'reefid-fish-basics');
  const ids = M.steps.map(s => s.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'one id per step');
  // Body shape first, then the groups; the dorsal fin is a screen of Fins, never a step.
  assert.deepStrictEqual([...ids.slice(0, 2)], ['shape', 'groups']);
  assert.ok(!ids.includes('dorsal'), 'the dorsal fin is the second screen of Fins');
  assert.ok(M.steps.find(s => s.id === 'fins').views.some(v => v.id === 'dorsal'));
  // The Learn card's trail (learn.js BASICS_TRAIL_F) and the words of the offers (app.js UNITS basics) name the same steps.
  const learn = read('learn.js'),
    trail = learn.slice(learn.indexOf('const BASICS_TRAIL_F = ['), learn.indexOf('const BASICS_AT_F'));
  assert.deepStrictEqual(
    [...trail.matchAll(/^\s{2}\[\s*'(\w+)',/gm)].map(m => m[1]),
    [...ids],
    "the card's trail follows the steps, in order"
  );
  assert.match(read('app.js'), /trail: \(\) => \(\{stops: BASICS_TRAIL_F, at: BASICS_AT_F, turn: 2\}\)/);
  const at = learn.slice(learn.indexOf('const BASICS_AT_F = ['), learn.indexOf('function basicsArt'));
  assert.strictEqual([...at.matchAll(/\[\d+, \d+\]/g)].length, ids.length, 'a place on the card for every step');
});

test('Fish basics: every view draws, every check works, every word leads to a step', () => {
  const M = load();
  M.steps.forEach(s => {
    assert.ok(s.t && s.say, `${s.id}: a title and a plain sentence`);
    assert.ok(s.src, `${s.id}: its source (rule C2)`);
    const V = s.views;
    assert.ok(Array.isArray(V) && V.length, `${s.id}: views`);
    assert.strictEqual(new Set(V.map(v => v.id)).size, V.length, `${s.id}: one id per view`);
    V.forEach(v => {
      const f = v.fig();
      assert.match(f, /<svg[\s\S]*<\/svg>|bx-gfam/, `${s.id}/${v.id}: a figure`);
      assert.ok(!/undefined|NaN|\[object/.test(f + (v.icon || '')), `${s.id}/${v.id}: no stray value in its drawing`);
      assert.ok(v.icon, `${s.id}/${v.id}: an icon`);
      assert.ok(v.name && (v.say || s.id === 'groups'), `${s.id}/${v.id}: a name and a sentence`);
    });
    // Each drawing carries a text alternative.
    V.filter(v => v.fig().startsWith('<svg')).forEach(v =>
      assert.match(v.fig(), /role="img" aria-label="[^"]+"/, `${s.id}/${v.id}: aria-label`)
    );
    const ck = s.check;
    assert.ok(ck, `${s.id}: a check`);
    if (ck.type === 'draw') {
      assert.strictEqual(ck.opts.length, 3, `${s.id}: three drawings`);
      assert.ok(ck.a >= 0 && ck.a < 3, `${s.id}: the right one is among them`);
      ck.opts.forEach(o => assert.match(M.drawOpt(o, ck), /<svg/, `${s.id}: option ${o} draws`));
      assert.ok(ck.why, `${s.id}: why`);
    } else if (ck.type === 'choice') {
      assert.ok(ck.a >= 0 && ck.a < ck.opts.length && ck.why);
    } else assert.strictEqual(typeof ck.own, 'function', `${s.id}: a check of its own`);
  });
  const stepOf = Object.fromEntries(M.steps.map(s => [s.id, s]));
  const seen = new Set();
  M.words.forEach(([t, r, plain]) => {
    assert.ok(t && plain, `${t}: a plain line`);
    assert.ok(!seen.has(t.toLowerCase()), `${t}: listed once`);
    seen.add(t.toLowerCase());
    const [sid, vid] = r.split('|');
    assert.ok(stepOf[sid], `${t}: step ${sid}`);
    if (vid)
      assert.ok(
        stepOf[sid].views.some(v => v.id === vid),
        `${t}: view ${sid}|${vid}`
      );
    assert.strictEqual(M.route(t), 'basics|' + r);
  });
  assert.strictEqual(M.route('Nothing'), '');
  // The IMR presentation's own lines are named as its (rule C1: the IMR wording kept).
  const o = M.official('Heart-shaped tail');
  assert.ok(o && /^IMR fish presentation/.test(o[2]) && o[1] === 'Heart shaped caudal fins');
  assert.strictEqual(M.official('Pointed tail'), null, 'no IMR line invented for a word the slides do not define');
});

test('Fish basics: the groups are the key’s, from the data, never numbered in the code', () => {
  const M = load(),
    g = M.steps.find(s => s.id === 'groups'),
    V = g.views;
  assert.deepStrictEqual(
    [...V.map(v => v.name)],
    ['1. Disk-shaped/Colorful', '3. Small Ovals'],
    'only the groups that hold families, in the key’s order, with the key’s titles (rule S3)'
  );
  assert.match(g.say, /Allen et al\. 2015/);
  assert.match(g.src, /Allen, G\. \(2015\)/, 'credited to the book');
  const fig = V[0].fig();
  assert.match(fig, /Alpha/);
  assert.match(fig, /Beta/);
  assert.ok(!/Gamma/.test(fig), "another group's family stays out");
  assert.strictEqual(V[0].short, '', 'a group is its number in the picker');
  assert.ok(!g.all, 'seen on opening: a long list of groups');
  // The photo check: a family photo, three groups to choose from, the answer blind until given.
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
  assert.match(box.html, /Which identification group is this fish in\?/);
  assert.strictEqual((box.html.match(/data-j="/g) || []).length, 2, 'the groups there are (two here), never padded');
});

test('Fish basics: its own record and feat, the corals’ left alone', () => {
  const S = C.subjectOf('fish'),
    K = C.subjectOf('coral');
  assert.ok(S.pages.includes('basics'));
  assert.strictEqual(S.pages[0], 'basics', 'the first Learn tab');
  assert.deepStrictEqual({...K.basics}, {feat: '_basics'}, 'the corals keep theirs');
  assert.deepStrictEqual({...S.basics}, {feat: '_fbasics'});
  assert.notStrictEqual(S.basics.feat, K.basics.feat);
  // The record on the device: subjDev 'basics', the corals' key as it always was.
  assert.strictEqual(C.subjDev('coral', 'basics'), 'reefid-basics', 'the corals keep their record');
  assert.strictEqual(C.subjDev('fish', 'basics'), 'reefid-fish-basics');
  // app.js basicsDone reads the subject's own record and feat; progress.js achBasics sets the subject's feat.
  const app = read('app.js'),
    prog = read('progress.js');
  assert.match(app, /const basicsKey = \(S = SUBJ\) => subjDev\(S\.id, 'basics'\);/);
  assert.match(app, /\[\(S\.basics \|\| \{\}\)\.feat \|\| '_basics'\]/);
  assert.match(prog, /function achBasics\(feat = \(SUBJ\.basics \|\| \{\}\)\.feat \|\| '_basics'\)/);
  // Each subject's feat grants its own achievement: the corals' "basics", the fish's "fbasics" (the sea slugs' has none).
  assert.ok(C.ACH.some(a => a.id === 'basics'));
  assert.ok(C.FISH_ACH.some(a => a.id === 'fbasics'));
  assert.ok(!C.ACH.some(a => a.id === 'fbasics') && !C.FISH_ACH.some(a => a.id === 'basics'));
});

// progress.js achSnap reads the feat of the subject on screen (SUBJECTS basics.feat), so Fish basics done earns fbasics and
// never the corals' achievement, and the corals' feat never earns the fish's.
test('Fish basics: achSnap reads the subject’s own feat, so fbasics comes with Fish basics only', () => {
  const cut = require('./block.js'),
    snapOf = (id, feats) => {
      const ctx = {
        ...C,
        SUBJ: C.subjectOf(id),
        P: {},
        LEVEL: '~level',
        ELO_MIN: 200,
        GX: () => ({}),
        slateGenera: () => [],
        scaleUnits: () => [],
        lvStep: () => 0,
        shownGroup: () => '',
        bonusList: () => [],
        introduced: () => false,
        eloScore: () => 0,
        headPct: () => 0,
        UNITS: {coral: {}, fish: {core: () => [], circles: () => [], sets: []}},
        store: {get: (k, d) => d, set: () => {}}
      };
      vm.createContext(ctx);
      vm.runInContext(cut(read('progress.js'), 'const achList = ', '\n// Full recount') + '\nthis.achSnap = achSnap;', ctx);
      return JSON.parse(JSON.stringify(ctx.achSnap(feats)));
    };
  const fishDone = snapOf('fish', {_fbasics: 1}),
    fishCoral = snapOf('fish', {_basics: 1}),
    coralDone = snapOf('coral', {_basics: 1}),
    coralFish = snapOf('coral', {_fbasics: 1});
  assert.deepStrictEqual(C.newAch(fishDone, {}, C.FISH_ACH), ['fbasics'], 'Fish basics done earns fbasics');
  assert.deepStrictEqual(C.newAch(fishCoral, {}, C.FISH_ACH), [], 'the corals’ feat earns the fish nothing');
  assert.ok(C.newAch(coralDone, {}, C.ACH).includes('basics'), 'Coral basics done still earns basics');
  assert.ok(!C.newAch(coralFish, {}, C.ACH).includes('basics'), 'the fish feat earns the corals nothing');
});

test('Fish basics: the Lab list, the service worker and the page key', () => {
  const lab = read('proto/lab.js'),
    sw = read('sw.js');
  assert.match(lab, /files: \[[^\]]*'basics',\s*'fishbasics'/);
  assert.match(sw, /'basics',\s*'fishbasics'/);
  assert.match(lab, /fishbasics: 'learn'/, 'graduated: it is the basics page of the fish');
  assert.match(lab, /const id = id0 === 'basics' \? basicsWords\(\)\.mod \|\| id0 : id0;/, 'labTool opens the subject’s module');
  assert.ok(fs.existsSync(path.join(ROOT, 'proto/fishbasics.js')));
  // The page key is the corals': #fish/learn/basics, #fish/learn/basics/tails/heart, /words.
  assert.strictEqual(C.routeOut('basics', C.subjectOf('fish')), 'fish/learn/basics');
  assert.strictEqual(C.routeOut('basics|tails|heart', C.subjectOf('fish')), 'fish/learn/basics/tails/heart');
  const r = C.routeIn('fish/learn/basics/words');
  assert.strictEqual(r.key, 'basics|words');
  assert.strictEqual(r.S.id, 'fish');
});

test('Fish basics: no deck photo, no person, no subject named by the engine', () => {
  const src = read('proto/fishbasics.js');
  assert.ok(
    !/imrl-|\.webp|<img src=|slide photo/i.test(src.replace(/\/\/.*$/gm, '')),
    'no slide photo: drawings and the app’s own photos only'
  );
  // The decks may name staff or students: never in the repo (rule D2).
  assert.ok(!/\b(Dr\.?|Prof\.?)\s+[A-Z]/.test(src), 'no person');
  // Rule S1: the module is subject content, but the engine files stay neutral (tests/subject-neutral.test.js holds all).
  assert.ok(!/'fish'|"fish"/.test(src), 'no subject id literal');
});
