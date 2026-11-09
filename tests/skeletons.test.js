// No coral skeleton photo anywhere (rule P6, Pierre, 2026-11-09: "coral skeletons must be excluded, because you cannot
// see the features properly"). judging/skeletons.json lists the photos judged by eye; tools/apply_skeletons.py marks
// them skel: 1 in data.json / cand.json; core.js applyCuration drops them from every list, so the games, the wrong-answer
// comparisons, the genus sheets, the Coral ID Key, Memory and Coral basics never meet one. Checked on the real files and
// on a made-up genus where a skeleton photo is pinned, made the cover, added and sent to the comparisons.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const {applyCuration, applySlots} = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')),
  SKEL = new Set(Object.keys(read('judging/skeletons.json').photos));

// Every photo record of a data file, wherever it is (as tools/apply_skeletons.py records()).
function records(d) {
  const out = [],
    gens = [...Object.values(d.gen || {}), ...Object.values((d.x || {}).gen || {})];
  gens.forEach(g => ['views', 'more'].forEach(s => Object.values(g[s] || {}).forEach(L => out.push(...L))));
  ['course', 'cand'].forEach(k => Object.values(d[k] || {}).forEach(L => out.push(...L)));
  out.push(...(d.cmp || []));
  return out;
}
// Every photo a page can show once the curation and the photos per context are applied (app.js build).
function shown(d) {
  const out = [];
  Object.values(d.gen).forEach(g => {
    ['views', 'more'].forEach(s => Object.values(g[s] || {}).forEach(L => out.push(...L)));
    Object.values(g.sl || {}).forEach(s => ['feat', 'more', 'game', 'idkey'].forEach(k => out.push(...(s[k] || []))));
  });
  ['course', 'cand'].forEach(k => Object.values(d[k] || {}).forEach(L => out.push(...L)));
  out.push(...(d.cmp || []));
  return out;
}

test('the list names known photos, each once, with its genus and why', () => {
  const J = read('judging/skeletons.json');
  assert.ok(J.note && Object.keys(J.photos).length > 0);
  const all = new Set([...records(read('data.json')), ...records(read('cand.json'))].map(p => p.f));
  Object.entries(J.photos).forEach(([f, x]) => {
    assert.ok(all.has(f), `${f}: in no data file (remove it from the list once it left the data)`);
    assert.ok(x.g && x.note, `${f}: genus and note`);
  });
});

test('data.json and cand.json carry skel exactly on the listed photos (python3 tools/apply_skeletons.py)', () => {
  [...records(read('data.json')), ...records(read('cand.json'))].forEach(p =>
    assert.strictEqual(!!p.skel, SKEL.has(p.f), `${p.f}: skel ${p.skel ? 'set' : 'missing'}`)
  );
});

test('no skeleton photo is in any list the app builds from the real files', () => {
  const d = read('data.json'),
    c = read('curation.json'),
    opts = {picks: read('picks.json'), autoq: read('quality.json').q || {}};
  applyCuration(d, c);
  applySlots(d, c, opts);
  const x = {gen: d.x.gen, course: {}, cand: d.cand};
  applyCuration(x, c);
  applySlots(x, c, opts);
  const bad = [...shown(d), ...shown(x)].filter(p => p.skel || SKEL.has(p.f)).map(p => p.f);
  assert.deepStrictEqual([...new Set(bad)], []);
  // Covers and the growth-form tiles name photos by id: none is a skeleton.
  Object.entries({...d.gen, ...x.gen}).forEach(([n, g]) => assert.ok(!SKEL.has(g.cover), `${n}: cover ${g.cover}`));
});

test('a skeleton photo pinned, made the cover, added or sent to the comparisons is dropped; the others stay', () => {
  const P = (f, extra) => ({f, o: 'https://www.inaturalist.org/observations/' + f, a: 'X', ...extra});
  const d = {
    gen: {
      G: {views: {wide: [P('g-wide-0'), P('g-wide-1', {skel: 1}), P('g-wide-2')]}, more: {wide: [P('g-more-0', {skel: 1, multi: true})]}}
    },
    course: {
      G: [
        {f: 'imrl-p1_i1', imr: true, v: 'wide', skel: 1},
        {f: 'imrl-p1_i2', imr: true, v: 'wide'}
      ]
    },
    cand: {G: [P('g-cand-0', {skel: 1}), P('g-cand-1')]},
    cmp: [{f: 'imrl-p2_i1', g: ['G', 'H'], skel: 1}]
  };
  const c = {
    single: {'g-more-0': 1},
    genera: {
      G: {
        cover: 'g-wide-1',
        feat: {wide: ['g-wide-1', 'g-wide-2']},
        add: {'g-cand-0': 'wide', 'g-cand-1': 'wide'},
        out: {'g-wide-1': 'cmp'}
      }
    }
  };
  applyCuration(d, c);
  applySlots(d, c, {});
  const s = d.gen.G.sl.wide,
    all = [...shown(d), ...s.feat, ...s.more, ...s.game, ...s.idkey];
  assert.deepStrictEqual(
    all.filter(p => p.skel).map(p => p.f),
    []
  );
  assert.deepStrictEqual([...new Set(s.game.map(p => p.f))].sort(), ['g-cand-1', 'g-wide-0', 'g-wide-2', 'imrl-p1_i2']);
  assert.strictEqual(s.feat[0].f, 'g-wide-2');
  assert.notStrictEqual(d.gen.G.cover, 'g-wide-1');
  assert.deepStrictEqual(d.cmp || [], []);
});

test('no page names a skeleton photo by id (Coral basics, the anatomy and Home art pick photos by hand)', () => {
  [
    'app.js',
    'learn.js',
    'quiz.js',
    'home.js',
    'home-art.js',
    ...fs
      .readdirSync(path.join(ROOT, 'proto'))
      .filter(f => f.endsWith('.js'))
      .map(f => 'proto/' + f)
  ].forEach(f => {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    SKEL.forEach(id => assert.ok(!s.includes(`'${id}'`) && !s.includes(`"${id}"`), `${f} names ${id}`));
  });
});

test('the admin and the candidate refill skip skeleton photos as the app does', () => {
  const adm = fs.readFileSync(path.join(ROOT, 'admin.js'), 'utf8'),
    py = fs.readFileSync(path.join(ROOT, 'tools', 'fetch_local.py'), 'utf8');
  assert.match(adm, /excl\(L\[i\]\.f\) \|\| L\[i\]\.skel/, 'admin.js own(): skeleton photos out');
  assert.match(adm, /!excl\(p\.f\) && !p\.skel/, 'admin.js rawCands(): skeleton candidates out');
  assert.match(py, /p\.get\('skel'\)[^\n]*continue/, 'fetch_local.py colonies(): skeleton photos not counted');
  assert.match(py, /waiting = lambda p:[^\n]*not p\.get\('skel'\)/, 'fetch_local.py: skeleton candidates not waiting');
});
