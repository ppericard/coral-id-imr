// Pierre's photo rules, checked on the real data.json + curation.json (core.js applyCuration / applySlots, the same
// code the app runs). These are Pierre's standing rules (docs/rules/photos.md): if one fails, a data or code change broke a rule.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync} = require('child_process');
const SIZES = ['', '-m', '-s', '-t']; // tools/photos.py SUFFIXES
const {applyCuration, applySlots, gameOf} = require('../core.js');
const read = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));
const RAW = read('data.json'),
  CUR = read('curation.json'),
  PICKS = read('picks.json'),
  AUTOQ = read('quality.json').q || {};
const VIEWS = ['wide', 'medium', 'macro'],
  GAME = ['game']; // one game list per view since 2026-11-03 (the Easy / Medium / Hard sets went)
function build(cur = CUR) {
  const d = structuredClone(RAW);
  applyCuration(d, cur);
  applySlots(d, cur, {picks: PICKS, autoq: AUTOQ});
  const x = d.x ? {gen: d.x.gen, course: {}, cand: d.cand} : null;
  if (x) {
    applyCuration(x, cur);
    applySlots(x, cur, {picks: PICKS, autoq: AUTOQ});
  }
  return d;
}
const D = build();
const genera = d => [...Object.entries(d.gen), ...Object.entries((d.x || {}).gen || {})];
const each = (d, fn) =>
  genera(d).forEach(([n, g]) =>
    VIEWS.forEach(v => {
      const s = (g.sl || {})[v];
      if (s) fn(n, g, v, s);
    })
  );

test('game photos: never a several-corals photo or a sheet-only photo (rule P3, use)', () => {
  const use = CUR.use || {};
  each(D, (n, g, v, s) =>
    GAME.forEach(k =>
      s[k].forEach(p => {
        assert.ok(!p.multi, `${n} ${v} ${k}: several corals ${p.f}`);
        assert.notStrictEqual(use[p.f], 'ref', `${n} ${v} ${k}: sheet-only ${p.f}`);
      })
    )
  );
});

test('an excluded photo appears nowhere (views, sheet, games, Coral ID Key)', () => {
  const X = CUR.exclude || {};
  each(D, (n, g, v, s) => {
    [...(g.views[v] || []), ...s.feat, ...s.more, ...s.idkey, ...GAME.flatMap(k => s[k])].forEach(p =>
      assert.ok(!X[p.f], `${n} ${v}: excluded ${p.f}`)
    );
  });
});

// The fish game photos (admin plan PR 7; core.js fishPhotos, the same code the app runs, on the real fish-game.json,
// fish-photos.json and curation.json): a photo Pierre rejected, excluded or sent to another species (Not this) never
// plays for the species he took it from, curated or stopgap; a curated photo only while it is in play (core.js fishOn).
test('fish: rejected, excluded and Not this photos are never in the game; curated ones only while in play', () => {
  const {fishGen, fishPhotos, fishPid, fishIn, fishGone} = require('../core.js'),
    F = CUR.fish || {},
    PH = read('fish-photos.json'),
    X = fishGen(
      read('fish.json'),
      fishPhotos(PH.photos, require('../core.js').fishGameRead(read('fish-game.json')).photos, CUR, read('fish.json')),
      PH.sheet
    ),
    gone = fishGone(CUR), // once, not once per photo: it walks the whole curation (37 s over the ~9,600 photos)
    no = new Map();
  ['seen', 'exclude', 'out'].forEach(k => Object.keys(F[k] || {}).forEach(f => no.set(fishPid(f), f)));
  Object.keys(CUR.exclude || {}).forEach(f => no.set(fishPid(f), f));
  Object.values(X.gen).forEach(g =>
    g.views.wide.forEach(p => {
      // A curated photo (fish-game.json): Pierre's add, or one in play by itself (auto, Q180 and Q199), while he has not
      // decided against it (core.js fishIn).
      if (/-cand-/.test(p.f) && !p.from) return assert.ok(fishIn(F, p, gone) && !(CUR.exclude || {})[p.f], `${g.id} ${p.f}: not in play`);
      assert.ok(!no.has(fishPid(p.f)), `${g.id} ${p.f}: Pierre decided against ${no.get(fishPid(p.f))}`);
    })
  );
});

test('a photo Pierre hid in a genus is not shown for that genus', () => {
  Object.entries(CUR.genera || {}).forEach(([n, k]) => {
    const g = D.gen[n] || ((D.x || {}).gen || {})[n];
    if (!g || !k.hide) return;
    const H = new Set(k.hide);
    VIEWS.forEach(v => {
      const s = (g.sl || {})[v];
      [...(g.views[v] || []), ...(s ? [...s.feat, ...s.more, ...GAME.flatMap(x => s[x])] : [])].forEach(p =>
        assert.ok(!H.has(p.f), `${n} ${v}: hidden ${p.f}`)
      );
    });
  });
});

test('"not this genus": the photo leaves the genus it was taken from', () => {
  Object.entries(CUR.genera || {}).forEach(([n, k]) => {
    const g = D.gen[n];
    if (!g || !k.out) return;
    VIEWS.forEach(v => (g.views[v] || []).forEach(p => assert.ok(!(p.f in k.out), `${n} ${v}: ${p.f} was sent away`)));
  });
});

test("featured = Pierre's pins first, in his order; at most 3", () => {
  Object.entries(CUR.genera || {}).forEach(([n, k]) => {
    const g = D.gen[n];
    if (!g || !k.feat) return;
    Object.entries(k.feat).forEach(([v, pins]) => {
      const s = (g.sl || {})[v];
      if (!s) return;
      assert.ok(s.feat.length <= 3);
      const shown = s.feat.map(p => p.f),
        kept = pins.filter(f => shown.includes(f)).slice(0, 3);
      assert.deepStrictEqual(shown.slice(0, kept.length), kept, `${n} ${v}`);
    });
  });
});

test("sheet order: IMR and Pierre's own photos come before other observers (rule P1), Poor last", () => {
  const q = f => (CUR.quality || {})[f] || (AUTOQ[f] === 1 && !/^imrl?-/.test(f) ? 1 : 2);
  each(D, (n, g, v, s) => {
    const L = s.more.filter(p => q(p.f) !== 1);
    const firstOther = L.findIndex(p => !(p.imr || p.own)),
      lastCore = L.map(p => !!(p.imr || p.own)).lastIndexOf(true);
    assert.ok(firstOther < 0 || lastCore < firstOther, `${n} ${v}: ${L.map(p => p.f).join(' ')}`);
  });
});

// The Coral ID Key cards need variety (Pierre, 2026-11-08: the book's crops left, field photos fill the variety): after
// the featured photos, up to CAP.inat (5) photos from other iNaturalist observers, a different observation each.
test("Coral ID Key: the featured photos, then up to 5 other observers' photos", () => {
  const {CAP} = require('../core.js');
  assert.strictEqual(CAP.inat, 5);
  const P = [...Array(9)].map((_, i) => ({f: 'p' + i, o: 'https://www.inaturalist.org/observations/' + i, a: 'X'}));
  const d = {gen: {G: {views: {wide: P.map(p => ({...p}))}}}, course: {}};
  applySlots(d, {}, {});
  const s = d.gen.G.sl.wide;
  assert.strictEqual(s.feat.length, 3);
  assert.deepStrictEqual(
    s.idkey.map(p => p.f),
    ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']
  );
});

// The Coral ID Key cards need variety (Pierre, 2026-11-08: the book's crops left, field photos fill the variety): after
// the featured photos, up to CAP.inat (5) photos from other iNaturalist observers, a different observation each.
test("Coral ID Key: the featured photos, then up to 5 other observers' photos", () => {
  const {CAP} = require('../core.js');
  assert.strictEqual(CAP.inat, 5);
  const P = [...Array(9)].map((_, i) => ({f: 'p' + i, o: 'https://www.inaturalist.org/observations/' + i, a: 'X'}));
  const d = {gen: {G: {views: {wide: P.map(p => ({...p}))}}}, course: {}};
  applySlots(d, {}, {});
  const s = d.gen.G.sl.wide;
  assert.strictEqual(s.feat.length, 3);
  assert.deepStrictEqual(
    s.idkey.map(p => p.f),
    ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']
  );
});

test('every slate genus has game photos in at least one view', () => {
  Object.entries(D.gen).forEach(([n, g]) =>
    assert.ok(
      VIEWS.some(v => g.sl[v] && GAME.some(k => g.sl[v][k].length)),
      n
    )
  );
});

test('several-corals photos (kept apart in "more") never reach games or the sheet', () => {
  genera(D).forEach(([n, g]) =>
    VIEWS.forEach(v => {
      const M = new Set(((g.more || {})[v] || []).map(p => p.f)),
        s = (g.sl || {})[v];
      if (!s || !M.size) return;
      [...s.feat, ...s.more, ...GAME.flatMap(k => s[k])].forEach(p =>
        assert.ok(!M.has(p.f), `${n} ${v}: ${p.f} is a several-corals photo`)
      );
    })
  );
});

test("games take every kept field photo, other observers' too, with no cap (Pierre, 2026-11-02)", () => {
  const use = CUR.use || {};
  each(D, (n, g, v, s) => {
    const game = new Set(GAME.flatMap(k => s[k]).map(p => p.f));
    (g.views[v] || [])
      .filter(p => !p.multi && use[p.f] !== 'ref')
      .forEach(p => assert.ok(game.has(p.f), `${n} ${v}: ${p.f} kept but not in the games`));
  });
  // A view with many photos from other observers keeps them all (synthetic: 12 good ones).
  const d = structuredClone(RAW),
    [n] = Object.entries(d.gen).find(([, g]) => (g.views.wide || []).length);
  d.gen[n].views.wide = Array.from({length: 12}, (_, i) => ({f: `t-${i}`, o: `obs-${i}`}));
  d.course[n] = [];
  applySlots(d, {}, {});
  assert.strictEqual(new Set(GAME.flatMap(k => d.gen[n].sl.wide[k]).map(p => p.f)).size, 12);
});

test('one game list per view: each photo once, the featured game photos first, Poor photos last', () => {
  const q = f => (CUR.quality || {})[f] || (AUTOQ[f] === 1 && !/^imrl?-/.test(f) ? 1 : 2);
  each(D, (n, g, v, s) => {
    const F = s.game.map(p => p.f);
    assert.strictEqual(new Set(F).size, F.length, `${n} ${v}: a photo twice`);
    // The featured photos of the quality order lead (the game list keeps no licence: core.js byQ0, Codex review #742);
    // the featured shown may hold, at the same quality and source, an open photo in place of an NC one (Q270).
    const lead = s.feat.filter(p => s.game.includes(p)),
      sig = p => [q(p.f), !!p.imr, !!p.own].join(),
      byF = new Map(s.game.map(p => [p.f, p]));
    assert.deepStrictEqual(
      F.slice(0, lead.length)
        .map(f => sig(byF.get(f)))
        .sort(),
      lead.map(sig).sort(),
      `${n} ${v}: featured first`
    );
    const rest = F.slice(lead.length).map(q),
      firstPoor = rest.indexOf(1);
    assert.ok(firstPoor < 0 || rest.slice(firstPoor).every(x => x === 1), `${n} ${v}: Poor photos last`);
  });
});

test('excluding or hiding a game photo removes it at once (synthetic curation)', () => {
  const [n, g] = Object.entries(D.gen).find(([, g]) => g.sl.wide && g.sl.wide.game.length),
    f = g.sl.wide.game[0].f;
  const gone = (d, why) =>
    VIEWS.forEach(v => {
      const s = d.gen[n].sl[v];
      if (s) [...s.feat, ...s.more, ...GAME.flatMap(k => s[k])].forEach(p => assert.notStrictEqual(p.f, f, `${why}: ${n} ${v}`));
    });
  gone(build({...CUR, exclude: {...(CUR.exclude || {}), [f]: 'test'}}), 'excluded');
  const G = {...(CUR.genera || {})};
  G[n] = {...(G[n] || {}), hide: [...((G[n] || {}).hide || []), f]};
  gone(build({...CUR, genera: G}), 'hidden');
});

test('data.json keeps only the candidates curation.json uses; the ones waiting are in cand.json (players never load them)', () => {
  const add = new Set(Object.values(CUR.genera || {}).flatMap(g => Object.keys(g.add || {})));
  const named = JSON.stringify(CUR.genera || {});
  const inData = Object.values(RAW.cand || {}).flat();
  const stray = inData.filter(p => !add.has(p.f) && !named.includes(`"${p.f}"`));
  assert.deepStrictEqual(
    stray.map(p => p.f),
    [],
    'run python3 tools/datajson.py --split'
  );
  const waiting = Object.values(read('cand.json').cand || {}).flat();
  assert.ok(waiting.length > 0, 'cand.json holds the candidates waiting');
  const both = new Set(inData.map(p => p.f));
  assert.deepStrictEqual(
    waiting.filter(p => both.has(p.f)).map(p => p.f),
    [],
    'a candidate is in one file only'
  );
});

test('game photos of the genera off the IMR list (Millepora, bonus genera) are hosted like the others: downloaded, four files', () => {
  const games = gameOf(RAW).filter(n => RAW.x.gen[n]); // core.js BENTHIC + BONUS (rule L6)
  assert.ok(games.includes('Millepora') && games.length > 1);
  const remote = [],
    missing = [],
    back = [];
  games.forEach(n =>
    ['views', 'more'].forEach(k =>
      Object.values(RAW.x.gen[n][k] || {})
        .flat()
        .forEach(p => {
          if (p.r) remote.push(p.f);
          // A photo with an online original lives on R2 (tools/r2_sync.sh checks the bucket has its four files); one
          // with none (an IMR lecture photo) in img/, git being its only backup.
          else if (!p.src && SIZES.some(s => !fs.existsSync(path.join(__dirname, '..', 'img', p.f + s + '.webp')))) missing.push(p.f);
          else if (p.src && SIZES.some(s => fs.existsSync(path.join(__dirname, '..', 'img', p.f + s + '.webp')))) back.push(p.f);
        })
    )
  );
  assert.deepStrictEqual(remote, [], 'still shown from iNaturalist (python3 tools/fetch_approved.py --games)');
  assert.deepStrictEqual(missing, [], 'a file missing in img/');
  assert.deepStrictEqual(back, [], 'a photo with an online original in img/ (it lives on R2 only)');
});

// A page or tool that names a photo file by a local path (img/<f>.webp, not built by the app's loc()/photoUrl()) names
// one that is in img/: the photos with an online original live on R2 only (Codex review #576: tools/og/og.html still
// pointed at six of them, so the link preview would have been made with holes).
test('every img/ photo file named in the pages and tools is in img/ (the others live on R2 only)', () => {
  const ROOT = path.join(__dirname, '..'),
    files = execFileSync('git', ['ls-files', '*.html', '*.css', '*.js', '*.py', '*.sh'], {cwd: ROOT, encoding: 'utf8'})
      .split('\n')
      .filter(f => f && !f.startsWith('tests/') && !f.startsWith('docs/')),
    gone = [];
  files.forEach(f => {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of s.matchAll(/(r2\.dev\/)?\bimg\/([a-z][\w-]*?(?:-[tsm])?\.webp)\b/g))
      if (!m[1] && !fs.existsSync(path.join(ROOT, 'img', m[2]))) gone.push(`${f}: img/${m[2]}`);
  });
  assert.deepStrictEqual(gone, [], 'name the R2 address (core.js PHOTO_BASE) or build it with loc()/photoUrl()');
});

// tools/photos.py --check (CI) on made-up folders: the four sizes of every photo in img/; a downloaded photo with no
// online original (IMR lecture photo, page art) never missing from img/, git being its only backup; a
// downloaded photo with an online original may be on R2 only (Photos out of the repo, Pierre's rule of 2026-11-05).
test('tools/photos.py check: the four sizes in img/, the photos with no online original kept there, the others on R2', () => {
  const py = code =>
    JSON.parse(
      execFileSync('python3', ['-c', `import sys, json, os, tempfile; sys.path.insert(0, 'tools')\nimport photos\n${code}`], {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8'
      })
    );
  const out = py(`
recs = {'imr-p1_i1': [{'f': 'imr-p1_i1', 'imr': 1}], 'acropora-cand-1': [{'f': 'acropora-cand-1', 'src': 'https://x/photos/1/original.jpg'}],
        'acropora-cand-2': [{'f': 'acropora-cand-2', 'src': 'https://x/photos/2/original.jpg', 'r': 1}]}
def run(names):
    d = tempfile.mkdtemp()
    for n in names: open(os.path.join(d, n + '.webp'), 'w').close()
    return photos.check(d, recs)
four = lambda f: [f + s for s in photos.SUFFIXES]
print(json.dumps({'ok': run(four('imr-p1_i1')), 'size': run(four('imr-p1_i1')[:3]), 'gone': run([]), 'back': run(four('imr-p1_i1') + ['acropora-cand-1-s']),
  'online': sorted(photos.online(recs)), 'gitonly': sorted(photos.gitonly(recs)), 'url': photos.url('a', '-s'),
  'every': photos.every(tempfile.mkdtemp(), recs)}))`);
  assert.deepStrictEqual(out.ok, [], 'IMR photo in img/, the online one on R2 only: all well');
  assert.match(out.size.join(' '), /1 photo file\(s\) missing.*imr-p1_i1-t/, 'a size missing');
  assert.match(out.gone.join(' '), /4 file\(s\) of photos with no online original missing from img\//, 'an IMR photo gone');
  assert.match(out.back.join(' '), /1 photo\(s\) with an online original in img\/.*acropora-cand-1/, 'an online photo back in img/');
  assert.deepStrictEqual(out.online, ['acropora-cand-1'], 'downloaded with an online original: on R2 only (a remote one, r: 1, is not)');
  assert.deepStrictEqual(out.gitonly, ['imr-p1_i1']);
  assert.deepStrictEqual(out.every, ['acropora-cand-1'], 'the photo tools measure the R2 photos too');
  assert.strictEqual(out.url, require('../core.js').PHOTO_BASE + 'img/a-s.webp', 'the bucket address read from core.js');
});

// Growth forms (rule C4): learn.js photoPair puts a photo next to one of the same growth form (the quiz's mix-up
// montage, the Look-alikes montages); a game photo with no form matches nothing (a player's report, 2026-11-04: 222 game
// photos added after the first form pass had none). Pierre's form (curation.json gf) or a guess (forms.json gf) is enough.
// A report, never a failure (the integrator, 2026-11-05): a candidate Pierre approves without a form comes in with his
// Publish, straight to main, and must not turn unrelated PRs red. The list shows in the test output (a warning line per
// photo) and with node tools/game_forms.js; the integrator fills it with a growth-form pass (judging/BRIEF.md).
test('game photos with no growth form are reported (a warning, never a failure)', t => {
  const {gamePhotos, formless} = require('../tools/game_forms.js');
  const games = gamePhotos(D, RAW);
  assert.ok(Object.keys(games).length > 1000, 'the game photos are found');
  const left = formless(games, CUR, read('forms.json'));
  if (!left.length) return;
  const msg = `WARNING: ${left.length} game photo(s) with no growth form: look at each one, write its guess by the growth-form pass of judging/BRIEF.md, then node tools/game_forms.js --apply FILE`;
  console.warn(msg);
  t.diagnostic(msg);
  left.forEach(p => (console.warn(`  ${p.genus} ${p.view} ${p.f}`), t.diagnostic(`${p.genus} ${p.view} ${p.f}`)));
});
