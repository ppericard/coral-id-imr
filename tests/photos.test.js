// Pierre's photo rules, checked on the real data.json + curation.json (core.js applyCuration / applySlots, the same
// code the app runs). These are standing rules from AGENTS.md: if one fails, a data or code change broke a rule.
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

test('game photos: never a Coral Finder book photo, a several-corals photo or a sheet-only photo (rules 10, use)', () => {
  const use = CUR.use || {};
  each(D, (n, g, v, s) =>
    GAME.forEach(k =>
      s[k].forEach(p => {
        assert.ok(!p.cf, `${n} ${v} ${k}: book photo ${p.f}`);
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

test("sheet order: IMR and Pierre's own photos come before other observers (rule 7), Poor last", () => {
  const q = f => (CUR.quality || {})[f] || (AUTOQ[f] === 1 && !/^imrl?-/.test(f) ? 1 : 2);
  each(D, (n, g, v, s) => {
    const L = s.more.filter(p => !p.cf && q(p.f) !== 1);
    const firstOther = L.findIndex(p => !(p.imr || p.own)),
      lastCore = L.map(p => !!(p.imr || p.own)).lastIndexOf(true);
    assert.ok(firstOther < 0 || lastCore < firstOther, `${n} ${v}: ${L.map(p => p.f).join(' ')}`);
  });
});

test('a book photo is on a sheet only once pinned or approved (never as a game photo)', () => {
  genera(D).forEach(([n, g]) => (g.book || []).forEach(p => assert.ok(p.view, `${n}: book photo ${p.f} without an approved view`)));
});

test('Coral Finder book switch off: no book photo anywhere', () => {
  const d = build({...CUR, book: false});
  genera(d).forEach(([n, g]) => {
    assert.ok(!g.book || !g.book.length, n);
    VIEWS.forEach(v => {
      const s = (g.sl || {})[v];
      if (s) [...s.feat, ...s.more, ...s.idkey].forEach(p => assert.ok(!p.cf, `${n} ${v}: ${p.f}`));
    });
  });
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
    const lead = s.feat.filter(p => s.game.includes(p)).map(p => p.f);
    assert.deepStrictEqual(F.slice(0, lead.length), lead, `${n} ${v}: featured first`);
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
  const games = gameOf(RAW).filter(n => RAW.x.gen[n]); // core.js BENTHIC + BONUS (AGENTS.md 14a)
  assert.ok(games.includes('Millepora') && games.length > 1);
  const remote = [],
    missing = [];
  games.forEach(n =>
    ['views', 'more'].forEach(k =>
      Object.values(RAW.x.gen[n][k] || {})
        .flat()
        .forEach(p => {
          if (p.r) remote.push(p.f);
          // A photo with an online original lives on R2 (tools/r2_sync.sh checks the bucket has its four files); one
          // with none (an IMR lecture photo) in img/, git being its only backup.
          else if (!p.src && SIZES.some(s => !fs.existsSync(path.join(__dirname, '..', 'img', p.f + s + '.webp')))) missing.push(p.f);
        })
    )
  );
  assert.deepStrictEqual(remote, [], 'still shown from iNaturalist (python3 tools/fetch_approved.py --games)');
  assert.deepStrictEqual(missing, [], 'a file missing in img/');
});

// tools/photos.py --check (CI) on made-up folders: the four sizes of every photo in img/; a downloaded photo with no
// online original (IMR lecture photo, Coral Finder book scan) never missing from img/, git being its only backup; a
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
recs = {'imr-1': [{'f': 'imr-1', 'imr': 1}], 'acropora-cand-1': [{'f': 'acropora-cand-1', 'src': 'https://x/photos/1/original.jpg'}],
        'acropora-cand-2': [{'f': 'acropora-cand-2', 'src': 'https://x/photos/2/original.jpg', 'r': 1}]}
def run(names):
    d = tempfile.mkdtemp()
    for n in names: open(os.path.join(d, n + '.webp'), 'w').close()
    return photos.check(d, recs)
four = lambda f: [f + s for s in photos.SUFFIXES]
print(json.dumps({'ok': run(four('imr-1')), 'size': run(four('imr-1')[:3]), 'gone': run([]),
  'online': sorted(photos.online(recs)), 'gitonly': sorted(photos.gitonly(recs)), 'url': photos.url('a', '-s'),
  'every': photos.every(tempfile.mkdtemp(), recs)}))`);
  assert.deepStrictEqual(out.ok, [], 'IMR photo in img/, the online one on R2 only: all well');
  assert.match(out.size.join(' '), /1 photo file\(s\) missing.*imr-1-t/, 'a size missing');
  assert.match(out.gone.join(' '), /4 file\(s\) of photos with no online original missing from img\//, 'an IMR photo gone');
  assert.deepStrictEqual(out.online, ['acropora-cand-1'], 'downloaded with an online original: on R2 only (a remote one, r: 1, is not)');
  assert.deepStrictEqual(out.gitonly, ['imr-1']);
  assert.deepStrictEqual(out.every, ['acropora-cand-1'], 'the photo tools measure the R2 photos too');
  assert.strictEqual(out.url, require('../core.js').PHOTO_BASE + 'img/a-s.webp', 'the bucket address read from core.js');
});
