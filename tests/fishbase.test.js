// FishBase as a fish photo source (Pierre, 2026-11-05: "the reference platform for fish ... if their licence is
// compatible, integrate it, fully"), and the reference-photo tag (rep). tools/fetch_fishbase.py, tools/fish_photos.py
// sheet_fishbase, tools/fetch_fish.py tag_rep, tools/fish_judge.py cap, tools/judging_fish.py entry. The same game photo
// rules as the iNaturalist photos (live fish, CC0 / CC BY / CC BY-NC only, the Indo-West Pacific, abroad only for a
// species confirmed in the Philippines), and never a game photo without Pierre's curation. Offline: fixtures and the
// repository's own files only. Needs python3.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync} = require('child_process');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const py = code =>
  JSON.parse(
    execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools')\nimport fetch_fishbase as FB\n${code}`], {
      cwd: ROOT,
      encoding: 'utf8'
    })
  );
// A tools/fishbase_src.json photo row: an underwater photo at Madang (Papua New Guinea), CC BY-NC as FishBase states it.
const ROW = `
def row(n='Fishu_u0.jpg', **k):
    r = {'n': n, 't': 'Fishus fishii', 'kind': 'underwater photo', 'a': 'Randall, J.E.', 'cp': 'non-commercial use', 'cc': '598', 'll': [-5.23, 145.78]}
    r.update(k)
    return {x: v for x, v in r.items() if v is not None}
PH = {'ph': True}
`;

test('licence: only what FishBase states as CC BY-NC 4.0; never "permission required" nor all rights reserved', () => {
  const out = py(`${ROW}
print(json.dumps([FB.lic_of(row(cp=c)) for c in ('non-commercial use', 'free use', 'n on-commercial use', 'permission required', '', None)]
                 + [FB.lic_of(row(cp='', pd=True)), FB.lic_of(row(cp='permission required', pd=True))]))`);
  // "free use" and the public-domain flag: the photo page shows CC BY-NC 4.0, the stricter of the two is taken.
  assert.deepStrictEqual(out, ['cc-by-nc', 'cc-by-nc', 'cc-by-nc', null, null, null, 'cc-by-nc', null]);
});

test('rules: live fish underwater only, the Indo-West Pacific, abroad only for a species confirmed in the Philippines', () => {
  const out = py(`${ROW}
kinds = {k: FB.usable(row(kind=k), PH) for k in ('underwater photo', 'photo', "Randall's tank photos", 'aquarium photo', 'public aquarium', 'b/w drawing')}
places = {k: FB.usable(row(**v), PH) for k, v in {
    'Madang': {}, 'Sydney (south of 30 S)': {'ll': [-33.87, 151.2], 'cc': '036'}, 'Red Sea': {'ll': [27.9, 34.3], 'cc': '682'},
    'Philippines, no coordinates': {'ll': None, 'cc': '608'}, 'Indonesia, no coordinates': {'ll': None, 'cc': '360'},
    'Maldives, no coordinates': {'ll': None, 'cc': '462'}, 'Australia, no coordinates': {'ll': None, 'cc': '036'},
    'nowhere': {'ll': None, 'cc': ''}}.items()}
print(json.dumps([kinds, places, FB.usable(row(), {'ph': False}), FB.usable(row(ll=None, cc='608'), {'ph': False}),
                  FB.tier(row(ll=[9.25, 123.3], cc='608')), FB.tier(row(ll=None, cc='608')), FB.tier(row())]))`);
  assert.deepStrictEqual(out[0], {
    'underwater photo': true,
    photo: false,
    "Randall's tank photos": false,
    'aquarium photo': false,
    'public aquarium': false,
    'b/w drawing': false
  });
  assert.deepStrictEqual(out[1], {
    Madang: true,
    'Sydney (south of 30 S)': false,
    'Red Sea': false,
    'Philippines, no coordinates': true,
    'Indonesia, no coordinates': true,
    'Maldives, no coordinates': false,
    'Australia, no coordinates': false,
    nowhere: false
  });
  assert.deepStrictEqual(out.slice(2), [false, true, 'dauin', 'ph', 'world']);
});

test('order and record: the main picture first, then the nearest; credited, linked, tagged rep, via fishbase', () => {
  const out = py(`${ROW}
rows = [row('Fishu_u0.jpg'), row('Fishu_u1.jpg', ll=None, cc='608'), row('Fishu_m0.jpg', main=True, st='male'), row('Fishu_j0.jpg', cp='permission required')]
s = {'id': 's9', 'name': 'Fishus fishii'}
L = FB.ordered(rows, PH)
print(json.dumps([[r['n'] for r in L], FB.record(s, 123, L[0]), FB.record(s, 123, L[1]), FB.author('Randall, J.E.'), FB.author('JJPhoto')]))`);
  assert.deepStrictEqual(out[0], ['Fishu_m0.jpg', 'Fishu_u1.jpg', 'Fishu_u0.jpg']);
  assert.deepStrictEqual(out[1], {
    f: 'fish-s9-cand-fb-Fishu_m0',
    a: '(c) J.E. Randall, via FishBase, some rights reserved (CC BY-NC 4.0)',
    lic: 'cc-by-nc',
    o: 'https://www.fishbase.se/photos/PicturesSummary.php?ID=123&what=species&pic=Fishu_m0.jpg',
    t: 'Fishus fishii',
    own: false,
    loc: 'world',
    src: 'https://www.fishbase.se/images/species/Fishu_m0.jpg',
    r: 1,
    via: 'fishbase',
    rep: 'fishbase',
    st: 'male'
  });
  assert.strictEqual(out[2].rep, undefined, 'only the main picture is a reference photo');
  assert.strictEqual(out[2].loc, 'ph');
  assert.deepStrictEqual(out.slice(3), ['J.E. Randall', 'JJPhoto']);
});

test('fetch_fishbase.py on fixtures: fills the room the cap leaves, never twice, --plan writes nothing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fishbase-'));
  const fish = {
    species: [
      {id: 's1', name: 'Fishus fishii', inat: 501, circle: 1, present: {ph: true, near: true}},
      {id: 's2', name: 'Fishus plenus', inat: 502, circle: 1, present: {ph: true, near: true}},
      {id: 's3', name: 'Fishus nowhere', inat: 503, out: 'not confirmed in the Philippines', present: {ph: false}}
    ],
    teach: [{id: 't1', name: 'Fishes', circle: 1, species: ['s1', 's2', 's3']}]
  };
  const row = (n, k = {}) => ({
    n,
    t: 'Fishus',
    kind: 'underwater photo',
    a: 'Randall, J.E.',
    cp: 'non-commercial use',
    cc: '598',
    ll: [-5.2, 145.8],
    ...k
  });
  const src = {
    species: {
      s1: {
        code: 1,
        photos: [row('Fiu_u0.jpg'), row('Fiu_m0.jpg', {main: true}), row('Fiu_u1.jpg'), row('Fiu_t0.jpg', {kind: 'aquarium photo'})]
      },
      s2: {code: 2, photos: [row('Fpl_u0.jpg')]},
      s3: {code: 3, photos: [row('Fno_u0.jpg')]}
    }
  };
  // s1 has one iNaturalist candidate and one Pierre rejected (it frees room); s2 is full (cap 2).
  const cand = {
    v: 1,
    cand: {
      s1: [
        {f: 'fish-s1-cand-11', o: 'https://www.inaturalist.org/observations/1'},
        {f: 'fish-s1-cand-22', o: 'https://www.inaturalist.org/observations/2'}
      ],
      s2: [
        {f: 'fish-s2-cand-33', o: 'https://www.inaturalist.org/observations/3'},
        {f: 'fish-s2-cand-44', o: 'https://www.inaturalist.org/observations/4'}
      ]
    }
  };
  const w = (f, d) => fs.writeFileSync(path.join(dir, f), JSON.stringify(d));
  w('fish.json', fish);
  w('src.json', src);
  w('fish-cand.json', cand);
  w('cur.json', {fish: {seen: {'fish-s1-cand-22': 1}}});
  const args = [
    '--fish',
    'fish.json',
    '--src',
    'src.json',
    '--cand',
    'fish-cand.json',
    '--cur',
    'cur.json',
    '--suggest',
    'none.json',
    '--photos',
    'none.json'
  ].map((x, i) => (i % 2 ? path.join(dir, x) : x));
  const run = (...a) => execFileSync('python3', ['tools/fetch_fishbase.py', ...args, '--cap', '2', ...a], {cwd: ROOT, encoding: 'utf8'});
  const plan = JSON.parse(run('--plan'));
  assert.deepStrictEqual(Object.keys(plan.species), ['s1']);
  assert.deepStrictEqual(plan.species.s1, {
    name: 'Fishus fishii',
    entry: 't1',
    cap: 2,
    phases: {},
    have: 1,
    held: {},
    room: 1,
    rooms: {},
    add: 1,
    rep: 1,
    loc: {world: 1},
    phase_add: {}
  });
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(dir, 'fish-cand.json'), 'utf8')), cand, '--plan writes nothing');
  run();
  const out = JSON.parse(fs.readFileSync(path.join(dir, 'fish-cand.json'), 'utf8')).cand;
  assert.deepStrictEqual(
    out.s1.map(p => p.f),
    ['fish-s1-cand-11', 'fish-s1-cand-22', 'fish-s1-cand-fb-Fiu_m0'],
    'the main picture takes the room'
  );
  assert.deepStrictEqual(out.s2, cand.cand.s2, 'a full species gets nothing');
  assert.ok(!out.s3, 'a species out of the game gets nothing');
  run('--cap', '3');
  const again = JSON.parse(fs.readFileSync(path.join(dir, 'fish-cand.json'), 'utf8')).cand;
  assert.deepStrictEqual(
    again.s1.map(p => p.f).slice(3),
    ['fish-s1-cand-fb-Fiu_u0'],
    'more room: the next one, never the main picture twice nor an aquarium photo'
  );
  fs.rmSync(dir, {recursive: true, force: true});
});

test('fish-cand.json: every FishBase candidate passes the rules on tools/fishbase_src.json, tagged rep when main', () => {
  const cand = read('fish-cand.json').cand,
    src = read('tools/fishbase_src.json').species,
    F = read('fish.json'),
    SP = new Map(F.species.map(s => [s.id, s])),
    fb = Object.entries(cand).flatMap(([sid, L]) => L.filter(p => p.via === 'fishbase').map(p => [sid, p]));
  assert.ok(fb.length >= 100, `FishBase candidates: ${fb.length}`);
  const rows = Object.fromEntries(fb.map(([sid, p]) => [p.f, (src[sid].photos || []).find(r => p.src.endsWith('/' + r.n))]));
  const verdict = py(
    `print(json.dumps({f: FB.usable(r, p) for f, r, p in json.loads(sys.argv[1])}))`.replace(
      'sys.argv[1]',
      JSON.stringify(JSON.stringify(fb.map(([sid, p]) => [p.f, rows[p.f], SP.get(sid).present || {}])))
    )
  );
  fb.forEach(([sid, p]) => {
    const r = rows[p.f];
    assert.ok(r, `${p.f}: in tools/fishbase_src.json`);
    assert.ok(verdict[p.f], `${p.f}: passes the game photo rules`);
    assert.ok(SP.get(sid).circle && !SP.get(sid).out, `${sid}: a game species`);
    assert.strictEqual(p.lic, 'cc-by-nc');
    assert.strictEqual(r.kind, 'underwater photo');
    assert.match(p.a, /^\(c\) .+, via FishBase, some rights reserved \(CC BY-NC 4\.0\)$/);
    assert.match(p.o, /^https:\/\/www\.fishbase\.se\/photos\/PicturesSummary\.php\?ID=\d+&what=species&pic=[\w-]+\.jpg$/);
    assert.match(p.src, /^https:\/\/www\.fishbase\.se\/images\/species\/[\w-]+\.jpg$/);
    assert.strictEqual(p.rep, r.main ? 'fishbase' : undefined, `${p.f}: rep only for FishBase's main picture`);
    assert.strictEqual(p.f, `fish-${sid}-cand-fb-${r.n.replace(/\.jpg$/, '')}`);
  });
  // Halichoeres chlorocephalus had no candidate: J. E. Randall's underwater photos (Madang, Milne Bay, Alotau), the
  // holotype first (FishBase's main picture).
  assert.deepStrictEqual(
    cand.s238.map(p => p.src.split('/').pop()),
    ['Hachl_m0.jpg', 'Hachl_f0.jpg', 'Hachl_m1.jpg', 'Hachl_u0.jpg']
  );
  // Never more photos than the highest cap (tools/fetch_fish.py MAX_CAP, Q36): one FishBase photo is one observation.
  Object.entries(cand).forEach(([sid, L]) => assert.ok(L.filter(p => p.via).length <= 60, sid));
});

test('fetch_fishbase.py with phases (Q36): a phase room takes the photos FishBase labels with it first, and stays open otherwise', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fishbase-phase-'));
  const fish = {
    species: [
      {id: 's1', name: 'Fishus fishii', inat: 501, circle: 1, present: {ph: true, near: true}},
      {id: 's2', name: 'Fishus parvus', inat: 502, circle: 1, present: {ph: true, near: true}}
    ],
    teach: [{id: 't1', name: 'Fishes', circle: 1, phase: ['Juveniles look very different from adults'], species: ['s1', 's2']}]
  };
  const row = (n, k = {}) => ({
    n,
    t: 'Fishus',
    kind: 'underwater photo',
    a: 'Randall, J.E.',
    cp: 'non-commercial use',
    cc: '598',
    ll: [-5.2, 145.8],
    ...k
  });
  const src = {
    species: {
      s1: {
        code: 1,
        photos: [
          row('Fiu_m0.jpg', {main: true}),
          row('Fiu_j0.jpg', {st: 'juvenile'}),
          row('Fiu_j1.jpg', {st: 'juvenile'}),
          row('Fiu_u0.jpg')
        ]
      },
      s2: {code: 2, photos: [row('Fpa_m0.jpg', {main: true}), row('Fpa_u0.jpg')]}
    }
  };
  // Both have juveniles (the entry's IMR line): cap 40. s1 keeps 38 adult photos: its 2 places go to FishBase's
  // juveniles, not its main picture. s2 keeps 35 adults and has no juvenile on FishBase: the free room takes adults, the
  // juvenile room stays open.
  const cand = (sid, n) =>
    Array.from({length: n}, (_, i) => ({f: `fish-${sid}-cand-${100 + i}`, o: `https://www.inaturalist.org/observations/${sid}${i}`}));
  const w = (f, d) => fs.writeFileSync(path.join(dir, f), JSON.stringify(d));
  w('fish.json', fish);
  w('src.json', src);
  w('fish-cand.json', {v: 1, cand: {s1: cand('s1', 38), s2: cand('s2', 25)}});
  const argv = [
    '--fish',
    'fish.json',
    '--src',
    'src.json',
    '--cand',
    'fish-cand.json',
    '--cur',
    'none.json',
    '--suggest',
    'none.json',
    '--photos',
    'none.json'
  ].map((x, i) => (i % 2 ? path.join(dir, x) : x));
  const run = (...a) => execFileSync('python3', ['tools/fetch_fishbase.py', ...argv, ...a], {cwd: ROOT, encoding: 'utf8'});
  const plan = JSON.parse(run('--plan')).species;
  assert.deepStrictEqual([plan.s1.cap, plan.s1.room, plan.s1.rooms, plan.s1.phase_add], [40, 2, {juvenile: 2}, {juvenile: 2}]);
  assert.deepStrictEqual([plan.s2.cap, plan.s2.room, plan.s2.rooms, plan.s2.add], [40, 15, {juvenile: 10}, 2]);
  run();
  const out = JSON.parse(fs.readFileSync(path.join(dir, 'fish-cand.json'), 'utf8')).cand;
  assert.deepStrictEqual(
    out.s1.slice(38).map(p => [p.f, p.st]),
    [
      ['fish-s1-cand-fb-Fiu_j0', 'juvenile'],
      ['fish-s1-cand-fb-Fiu_j1', 'juvenile']
    ]
  );
  assert.deepStrictEqual(
    out.s2.slice(25).map(p => p.f),
    ['fish-s2-cand-fb-Fpa_m0', 'fish-s2-cand-fb-Fpa_u0']
  );
  fs.rmSync(dir, {recursive: true, force: true});
});

test('reference photos: rep adds the flag r and one ease point, the caps applied after it; iNaturalist covers tagged', () => {
  const out = JSON.parse(
    execFileSync(
      'python3',
      [
        '-c',
        `import sys, json; sys.path.insert(0, 'tools')
from fish_judge import cap, REP_BONUS
from fetch_fish import tag_rep
from judging_fish import entry
L = [{'f': 'fish-s1-cand-7'}, {'f': 'fish-s1-cand-8', 'rep': 'inaturalist'}, {'f': 'fish-s1-cand-fb-X_m0', 'via': 'fishbase', 'rep': 'fishbase'}]
n = tag_rep(L, 7)
print(json.dumps([REP_BONUS, cap('p1g0sm13', False), cap('p1g0sm13', False, rep='fishbase'), cap('p1g0sm15', False, rep='inaturalist'),
                  cap('p1g0sm1j4', False, rep='fishbase'), cap('h1g0sm14', False, rep='fishbase'), cap('p1g0sm13', True, rep='fishbase'),
                  n, [p.get('rep') for p in L], entry('s001', {'code': 'p1g0sm13', 'keep': 'best'}, 'fishbase')]))`
      ],
      {cwd: ROOT, encoding: 'utf8'}
    )
  );
  assert.strictEqual(out[0], 1);
  assert.deepStrictEqual(out[1], [3, 'p1g0sm1']);
  assert.deepStrictEqual(out[2], [4, 'p1g0sm1r'], 'a medium reference photo joins the very easy ones');
  assert.deepStrictEqual(out[3], [5, 'p1g0sm1r'], 'never above 5');
  assert.deepStrictEqual(out[4], [2, 'p1g0sm1jr'], 'a juvenile stays capped at 2');
  assert.deepStrictEqual(out[5], [3, 'h1g0sm1r'], 'a head-on view stays capped at 3');
  assert.deepStrictEqual(out[6], [4, 'p1g0sm1pr'], 'with the phase flag');
  assert.strictEqual(out[7], 1);
  assert.deepStrictEqual(out[8], ['inaturalist', null, 'fishbase'], 'the cover tagged, a stale tag removed, FishBase keeps its own');
  assert.deepStrictEqual(out[9], {jt: 'p1g0sm1r', e: 4, k: 'best'});
  // autosort.js fishSure takes the flag (the fish auto-sort reads suggest.json "fish").
  const {fishSure} = require('../autosort.js');
  assert.deepStrictEqual(fishSure({jt: 'p1g0sm1r', e: 4, k: 'best'}), {keep: 'add', tags: 'p1g0sm1r', ease: 4, phase: null, crop: null});
});

test('suggest.json: every tagged judged candidate carries the flag r, and only those', () => {
  const cand = read('fish-cand.json').cand,
    S = read('suggest.json').fish || {},
    rep = new Set(Object.values(cand).flatMap(L => L.filter(p => p.rep).map(p => p.f)));
  Object.values(cand)
    .flat()
    .forEach(p => {
      if (!S[p.f] || !S[p.f].jt) return;
      assert.strictEqual(/r/.test(S[p.f].jt.slice(7)), rep.has(p.f), `${p.f}: run python3 tools/judging_fish.py rep`);
    });
});

test('FishBase in a game: Pierre added it, or tools/fish_refs.py took it under the rules and it was judged reference level', () => {
  const PH = read('fish-photos.json'),
    F = read('fish.json'),
    CUR = read('curation.json'),
    added = new Set(Object.keys((CUR.fish || {}).add || {})),
    refs = new Set(Object.values(read('tools/fish_refs.json').photos).flatMap(L => L.filter(p => p.via === 'fishbase').map(p => p.f))),
    isFb = p => p.via === 'fishbase' || /fishbase\./.test(p.src || '');
  // Pierre, 2026-11-06 14:02: FishBase photos enter automatically when their licence allows (until then only through his
  // curation): every FishBase game photo is his addition or a reference photo of tools/fish_refs.json judged at the
  // reference level (tools/fish_judge.py ref_level, core.js refLevel).
  Object.values(PH.photos)
    .flat()
    .filter(isFb)
    .forEach(p => assert.ok(added.has(p.f) || (refs.has(p.f) && C.refLevel(p)), `${p.f}: a FishBase game photo outside the rules`));
  // The game as it plays (admin plan PR 7: the curated photos of fish-game.json, downloaded to R2, beside the stopgap):
  // a FishBase photo only while Pierre has it in play for that species (core.js fishOn), or a judged reference photo.
  const GM = read('fish-game.json').photos,
    X = C.fishGen(F, C.fishPhotos(PH.photos, GM, CUR, F), PH.sheet);
  Object.values(X.gen).forEach(g =>
    g.views.wide
      .filter(isFb)
      .forEach(p =>
        assert.ok(
          (added.has(p.f) && C.fishOn(CUR.fish, p.f, p.sp)) || (refs.has(p.f) && C.refLevel(p)),
          `${g.id} ${p.f}: a FishBase game photo outside the rules`
        )
      )
  );
  // The same with a FishBase photo in fish-game.json that Pierre never added, or took out of play since the last run.
  const fb = {
      f: 'fish-s091-cand-fb-Chter_u0',
      sp: 's091',
      src: 'https://www.fishbase.de/images/species/Chter_u0.jpg',
      via: 'fishbase',
      e: 5
    },
    cur = {...CUR, fish: {...CUR.fish, add: {...CUR.fish.add, [fb.f]: 's091'}, seen: {...CUR.fish.seen}}};
  assert.ok(
    C.fishPhotos({}, {t01: [fb]}, cur).t01.some(p => p.f === fb.f),
    'in play: in the game'
  );
  cur.fish.seen[fb.f] = 1;
  assert.ok(!C.fishPhotos({}, {t01: [fb]}, cur).t01.some(p => p.f === fb.f), 'rejected: out of the game at once');
  assert.ok(!C.fishPhotos({}, {t01: [fb]}, {...CUR, fish: {...CUR.fish, add: {}}}).t01.length, 'never added: never in the game');
  // Halichoeres chlorocephalus: J. E. Randall's FishBase photo of the holotype, alive underwater at Madang, as its
  // sheet-only photo (Pierre, 2026-11-05), never a game photo nor a cover.
  const h = (PH.sheet.s238 || [])[0];
  assert.ok(h, 's238 has its sheet photo');
  assert.deepStrictEqual(
    [h.f, h.src, h.lic, h.use, h.from, h.via, h.rep, h.sp],
    ['fbHachl_m0', 'https://www.fishbase.se/images/species/Hachl_m0.jpg', 'cc-by-nc', 'ref', 'fishbase', 'fishbase', 'fishbase', 's238']
  );
  assert.match(h.a, /J\.E\. Randall, via FishBase/);
  assert.match(h.o, /PicturesSummary\.php\?ID=58178&what=species&pic=Hachl_m0\.jpg$/);
  assert.match(h.note, /holotype/);
  assert.ok((X.sheet.s238 || []).some(p => p.f === 'fbHachl_m0'));
  Object.values(X.gen).forEach(g => assert.ok(!g.views.wide.some(p => p.f === 'fbHachl_m0') && g.cover !== 'fbHachl_m0', g.id));
});

test('fetch_fish.py --rep: --plan writes nothing, and a cover not known keeps the tag (Codex review #562)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fishrep-'));
  const fish = {
    species: [
      {id: 's1', name: 'Fishus fishii', inat: 501, circle: 1, present: {ph: true, near: true}},
      {id: 's2', name: 'Fishus alter', inat: 502, circle: 1, present: {ph: true, near: true}}
    ],
    teach: [{id: 't1', name: 'Fishes', circle: 1, species: ['s1', 's2']}]
  };
  const cand = {
    v: 1,
    cand: {
      s1: [{f: 'fish-s1-cand-7', o: 'https://www.inaturalist.org/observations/1', rep: 'inaturalist'}],
      s2: [{f: 'fish-s2-cand-9', o: 'https://www.inaturalist.org/observations/2', rep: 'inaturalist'}]
    }
  };
  fs.writeFileSync(path.join(dir, 'fish.json'), JSON.stringify(fish));
  const before = JSON.stringify(cand);
  fs.writeFileSync(path.join(dir, 'fish-cand.json'), before);
  // The cache knows the taxa reply of s1 only as "no taxa answered": s2's cover is unknown.
  const url = 'https://api.inaturalist.org/v2/taxa/501,502?fields=id,default_photo.id&per_page=30';
  fs.writeFileSync(path.join(dir, 'cache.json'), JSON.stringify({}));
  const run = (...a) =>
    execFileSync(
      'python3',
      [
        'tools/fetch_fish.py',
        '--fish',
        path.join(dir, 'fish.json'),
        '--cand',
        path.join(dir, 'fish-cand.json'),
        '--cur',
        path.join(dir, 'none.json'),
        '--suggest',
        path.join(dir, 'none.json'),
        '--cache',
        path.join(dir, 'cache.json'),
        '--rep',
        ...a
      ],
      {cwd: ROOT, encoding: 'utf8'}
    );
  run('--plan');
  assert.strictEqual(fs.readFileSync(path.join(dir, 'fish-cand.json'), 'utf8'), before, '--rep --plan writes nothing');
  // A reply that answers s1 only (its cover is another photo): s1 loses its stale tag, s2 (not answered) keeps its own.
  fs.writeFileSync(path.join(dir, 'cache.json'), JSON.stringify({[url]: {501: 8}}));
  run('--offline');
  const out = JSON.parse(fs.readFileSync(path.join(dir, 'fish-cand.json'), 'utf8')).cand;
  assert.strictEqual(out.s1[0].rep, undefined);
  assert.strictEqual(out.s2[0].rep, 'inaturalist');
  fs.rmSync(dir, {recursive: true, force: true});
});

test('fetch_fish.py Net.fetch: a failed request is retried after a pause, never a crash (rule C7; Codex review #562)', () => {
  const out = JSON.parse(
    execFileSync(
      'python3',
      [
        '-c',
        `import sys, json, io, tempfile, os; sys.path.insert(0, 'tools')
import fetch_fish as ff
calls, pauses = [], []
def urlopen(req, timeout=0):
    calls.append(req.full_url)
    if len(calls) == 1:
        raise OSError('HTTP Error 429: Too Many Requests')
    class R(io.BytesIO):
        def __enter__(self): return self
        def __exit__(self, *a): return False
    return R(json.dumps({'results': [{'id': 501, 'default_photo': {'id': 7}}]}).encode())
ff.urllib.request.urlopen = urlopen
ff.time.sleep = pauses.append
net = ff.Net(os.path.join(tempfile.mkdtemp(), 'c.json'))
print(json.dumps([ff.covers(net, [501]), len(calls), sum(1 for p in pauses if p >= 10)]))`
      ],
      {cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}
    )
  );
  assert.deepStrictEqual(out, [{501: 7}, 2, 1]);
});

// The host (2026-11-06): www.fishbase.de answers 500 (an HTML page) to a browser's image request for every photo tried,
// so the admin showed "Photo not loading" and Chrome players lost the FishBase sheet photo; the www.fishbase.se mirror
// answers 200 image/jpeg. The tool builds .se links, and no FishBase photo of the data files points at .de.
test('FishBase links use the www.fishbase.se mirror, never www.fishbase.de', () => {
  const [src, o] = py(
    `print(json.dumps([FB.record({'id': 's9', 'name': 'Fishus fishii'}, 123, {'n': 'Fishu_u0.jpg', 'cp': 'free use'})[k] for k in ('src', 'o')]))`
  );
  assert.strictEqual(src, 'https://www.fishbase.se/images/species/Fishu_u0.jpg');
  assert.strictEqual(o, 'https://www.fishbase.se/photos/PicturesSummary.php?ID=123&what=species&pic=Fishu_u0.jpg');
  let n = 0;
  const walk = (o, file) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(x => walk(x, file));
    if (typeof o.f === 'string' && o.via === 'fishbase') {
      n++;
      for (const k of ['src', 'o']) assert.ok(!/fishbase\.de\//.test(o[k] || ''), `${file} ${o.f} ${k}: ${o[k]}`);
      assert.ok(/^https:\/\/www\.fishbase\.se\/images\/species\//.test(o.src), `${file} ${o.f} src: ${o.src}`);
    }
    Object.values(o).forEach(x => walk(x, file));
  };
  for (const f of ['fish-cand.json', 'fish-photos.json', 'data.json', 'cand.json']) if (fs.existsSync(path.join(ROOT, f))) walk(read(f), f);
  assert.ok(n > 100, `FishBase photos found: ${n}`);
});
