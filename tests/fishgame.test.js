// The curated fish game photos (admin plan PR 7): tools/fish_game.py, run by the Candidate photos workflow, downloads the
// photos Pierre put in play (curation.json fish, core.js fishOn) into the R2 upload folder and writes fish-game.json;
// core.js fishPhotos puts them in the game in place of the stopgap list, entry by entry. Offline: a made-up fixture,
// the originals served by a stub (never iNaturalist, FishBase or R2). The download needs python3 with Pillow
// (tools/requirements.txt, installed by checks.yml).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync} = require('child_process');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
// maxBuffer: fish-game.json passed the 1 MB default once the curated photos grew (ENOBUFS, 2026-11-06).
const py = code =>
  execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools')\n${code}`], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 << 20
  });
const pil = (() => {
  try {
    py('import PIL');
    return true;
  } catch {
    return false;
  }
})();

// A made-up world: two entries, three species; candidates from iNaturalist and FishBase.
const INAT = id => `https://inaturalist-open-data.s3.amazonaws.com/photos/${id}/original.jpg`;
const cand = (sp, id, k = {}) => ({
  f: `fish-${sp}-cand-${id}`,
  a: '(c) Someone, some rights reserved (CC BY)',
  lic: 'cc-by',
  o: `https://www.inaturalist.org/observations/9${id}`,
  t: 'Fishus ' + sp,
  loc: 'ph',
  src: INAT(id),
  r: 1,
  ...k
});
const FISH = {
  teach: [
    {id: 't01', name: 'Damselfish', level: 1, circle: 1, species: ['s001', 's002']},
    {id: 't02', name: 'Wrasse', level: 1, circle: 1, species: ['s003']}
  ],
  species: [
    {id: 's001', name: 'Fishus damselii'},
    {id: 's002', name: 'Fishus juvenilis'},
    {id: 's003', name: 'Fishus wrassii', now: 'Thalassoma wrassii'}
  ]
};
const CAND = {
  v: 1,
  cand: {
    s001: [
      cand('s001', 101),
      cand('s001', 102, {own: true, a: '(c) Pierre Pericard, some rights reserved (CC BY-NC)', lic: 'cc-by-nc'}),
      cand('s001', 103), // rejected
      cand('s001', 104), // excluded
      cand('s001', 105), // Not this -> s003, added there
      cand('s001', 106), // Not this, no game species
      cand('s001', 107, {src: 'https://example.org/photo.jpg'}) // not an allowed host
    ],
    s002: [cand('s002', 201, {st: 'juvenile'})],
    s003: [
      {
        f: 'fish-s003-cand-fb-Fiwra_u0',
        a: '(c) J.E. Randall, via FishBase, some rights reserved (CC BY-NC 4.0)',
        lic: 'cc-by-nc',
        o: 'https://www.fishbase.de/photos/PicturesSummary.php?ID=1&what=species&pic=Fiwra_u0.jpg',
        t: 'Fishus wrassii',
        loc: 'world',
        src: 'https://www.fishbase.de/images/species/Fiwra_u0.jpg',
        r: 1,
        via: 'fishbase',
        rep: 'fishbase'
      },
      cand('s003', 301) // waiting: not added
    ]
  }
};
const CUR = {
  exclude: {},
  fish: {
    add: {
      'fish-s001-cand-101': 's001',
      'fish-s001-cand-102': 's001',
      'fish-s001-cand-103': 's001',
      'fish-s001-cand-104': 's001',
      'fish-s001-cand-105': 's003',
      'fish-s001-cand-106': 's001',
      'fish-s001-cand-107': 's001',
      'fish-s002-cand-201': 's002',
      'fish-s003-cand-fb-Fiwra_u0': 's003'
    },
    seen: {'fish-s001-cand-103': 1},
    exclude: {'fish-s001-cand-104': 'blurred'},
    out: {'fish-s001-cand-105': 's003', 'fish-s001-cand-106': 'x'},
    tags: {'fish-s001-cand-101': 'p1g0sm1', 'fish-s001-cand-102': 'p1g0sl1', 'fish-s002-cand-201': 'p1g0sm1j'},
    ease: {'fish-s001-cand-101': 4, 'fish-s001-cand-102': 5, 'fish-s002-cand-201': 2},
    crop: {'fish-s001-cand-101': [0, 0, 0.5, 1], 'fish-s003-cand-fb-Fiwra_u0': [0, 0, 1, 1]}
  }
};
// The pass's judgment for the photos Pierre has no value for (suggest.json fish).
const SUG = {
  fish: {'fish-s001-cand-105': {jt: 'o1g1sm1', e: 3, k: 'best'}, 'fish-s003-cand-fb-Fiwra_u0': {jt: 'p1g0sl1r', e: 5, ph: 'male'}}
};

function world() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fishgame-'));
  const w = (f, o) => fs.writeFileSync(path.join(dir, f), JSON.stringify(o));
  w('fish.json', FISH);
  w('fish-cand.json', CAND);
  w('curation.json', CUR);
  w('suggest.json', SUG);
  return dir;
}
// The stub of the hosts: a 400 x 300 image for any photo; FishBase answers 500 twice first (it does at times).
const STUB = `
import io, urllib.error, fish_game as G
from PIL import Image
calls = []
def get(url):
    calls.append(url)
    if 'fishbase' in url and calls.count(url) < 3:
        raise urllib.error.HTTPError(url, 500, 'Internal Server Error', {}, None)
    b = io.BytesIO(); Image.new('RGB', (400, 300), (20, 90, 160)).save(b, 'JPEG'); return b.getvalue()
`;
// The tool prints its retries and failures; the result is the last line.
const run = (dir, out, limit) =>
  JSON.parse(
    py(`${STUB}
done, failed, n, wait = G.run(${JSON.stringify(out)}, root=${JSON.stringify(dir)}, get=get, pause=0, workers=2${limit === undefined ? '' : ', limit=' + limit})
print(json.dumps({'done': done, 'failed': failed, 'n': n, 'wait': wait, 'calls': calls}))`)
      .trim()
      .split('\n')
      .pop()
  );

test(
  'fish_game.py on a fixture: only the photos in play, four files each, the crop applied, FishBase retried',
  {skip: !pil && 'Pillow missing'},
  () => {
    const dir = world(),
      out = path.join(dir, 'up'),
      r = run(dir, out);
    // In play: 101, 102 (s001), 201 (s002), 105 (moved to s003 by Not this, added there), the FishBase photo (s003).
    // Never: 103 rejected, 104 excluded, 106 Not this to no game species, 301 waiting; 107 refused (not an allowed host).
    assert.deepStrictEqual(r.failed, ['fish-s001-cand-107']);
    assert.strictEqual(r.done, 5);
    assert.strictEqual(r.n, 5);
    assert.strictEqual(r.calls.filter(u => /fishbase/.test(u)).length, 3, 'FishBase asked again after its 500s');
    assert.ok(!r.calls.some(u => /example\.org/.test(u)), 'never a request to another host');
    const files = fs.readdirSync(out).sort();
    assert.strictEqual(files.length, 20);
    ['', '-m', '-s', '-t'].forEach(s => assert.ok(files.includes(`fish-s001-cand-101${s}.webp`), s));
    const G = JSON.parse(fs.readFileSync(path.join(dir, 'fish-game.json'), 'utf8'));
    assert.deepStrictEqual(Object.keys(G.photos), ['t01', 't02']);
    // Entry order: the entry's species order, then the easiest (never Pierre's own by priority, Q148).
    assert.deepStrictEqual(
      G.photos.t01.map(p => p.f),
      ['fish-s001-cand-102', 'fish-s001-cand-101', 'fish-s002-cand-201']
    );
    const by = Object.fromEntries(
      Object.values(G.photos)
        .flat()
        .map(p => [p.f, p])
    );
    // Downloaded: no r (the app reads it from R2), the original kept for the fallback, the credit and the observation.
    Object.values(by).forEach(p => {
      assert.ok(!p.r && p.src && p.a && p.lic && p.o && p.sp, p.f);
      assert.ok(p.ar > 0, p.f);
    });
    // Pierre's crop: the left half of a 4:3 photo is 2:3; the whole-photo crop [0, 0, 1, 1] is no crop.
    assert.deepStrictEqual([by['fish-s001-cand-101'].ar, by['fish-s001-cand-101'].cr], [0.67, [0, 0, 0.5, 1]]);
    assert.deepStrictEqual([by['fish-s003-cand-fb-Fiwra_u0'].ar, by['fish-s003-cand-fb-Fiwra_u0'].cr], [1.33, undefined]);
    // Tags and ease: Pierre's (fish.tags, fish.ease), else the pass's; the phase as the admin's fishPhase.
    assert.deepStrictEqual([by['fish-s001-cand-102'].e, by['fish-s001-cand-102'].jt, by['fish-s001-cand-102'].own], [5, 'p1g0sl1', true]);
    assert.deepStrictEqual([by['fish-s002-cand-201'].e, by['fish-s002-cand-201'].ph], [2, 'juvenile']);
    assert.deepStrictEqual(
      [by['fish-s001-cand-105'].sp, by['fish-s001-cand-105'].e, by['fish-s001-cand-105'].jt],
      ['s003', 3, 'o1g1sm1'],
      'a Not this photo in play for its new species, under that entry'
    );
    // Named after its new species (the WoRMS name), never the identification Pierre corrected (Codex review #614); the
    // others keep their source's name.
    assert.strictEqual(by['fish-s001-cand-105'].t, 'Thalassoma wrassii');
    assert.strictEqual(by['fish-s001-cand-101'].t, 'Fishus s001');
    const fb = by['fish-s003-cand-fb-Fiwra_u0'];
    assert.deepStrictEqual([fb.via, fb.rep, fb.e, fb.ph, fb.lic], ['fishbase', 'fishbase', 5, 'male', 'cc-by-nc']);
    // Again with nothing new: nothing downloaded, the same bytes (no commit).
    const before = fs.readFileSync(path.join(dir, 'fish-game.json'), 'utf8'),
      out2 = path.join(dir, 'up2'),
      r2 = run(dir, out2);
    assert.deepStrictEqual([r2.done, r2.n], [0, 5]);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'fish-game.json'), 'utf8'), before);
    // Pierre recrops one, takes another out of play: the recropped one comes again (iv 1), the other leaves the list.
    const cur = structuredClone(CUR);
    cur.fish.crop['fish-s001-cand-102'] = [0.1, 0.1, 0.9, 0.9];
    cur.fish.seen['fish-s002-cand-201'] = 1;
    fs.writeFileSync(path.join(dir, 'curation.json'), JSON.stringify(cur));
    const r3 = run(dir, path.join(dir, 'up3'));
    assert.deepStrictEqual([r3.done, r3.n], [1, 4]);
    const G3 = JSON.parse(fs.readFileSync(path.join(dir, 'fish-game.json'), 'utf8')),
      p = G3.photos.t01.find(x => x.f === 'fish-s001-cand-102');
    assert.deepStrictEqual([p.cr, p.iv], [[0.1, 0.1, 0.9, 0.9], 1]);
    assert.ok(!G3.photos.t01.some(x => x.f === 'fish-s002-cand-201'));
    fs.rmSync(dir, {recursive: true, force: true});
  }
);

test('fish_game.py fish_on and pid agree with core.js fishOn and fishPid', () => {
  const F = CUR.fish,
    cases = [...Object.keys(F.add), 'fish-s003-cand-301'].flatMap(f => ['s001', 's002', 's003'].map(s => [f, s]));
  const got = JSON.parse(
    py(`import fish_game as G
F = json.loads(${JSON.stringify(JSON.stringify(F))})
print(json.dumps([G.fish_on(F, f, s) for f, s in ${JSON.stringify(cases)}] + [G.pid(f) for f in ['fi123', 'fish-s001-cand-123', 'fish-s001-cand-123c', 'fish-s003-cand-fb-Fiwra_u0', 'fbFiwra_u0', 'some-photo']]))`)
  );
  assert.deepStrictEqual(got, [
    ...cases.map(([f, s]) => C.fishOn(F, f, s)),
    ...['fi123', 'fish-s001-cand-123', 'fish-s001-cand-123c', 'fish-s003-cand-fb-Fiwra_u0', 'fbFiwra_u0', 'some-photo'].map(C.fishPid)
  ]);
  // A FishBase reference or sheet photo (fb<stem>, tools/fish_refs.py) and its candidate are one photo (Codex review #660).
  assert.deepStrictEqual(got.slice(-6), ['i123', 'i123', 'i123', 'bFiwra_u0', 'bFiwra_u0', 'some-photo']);
  // So Pierre's rejection of the candidate keeps its reference copy out of the game (core.js fishPhotos).
  const ref = {
      f: 'fbFiwra_u0',
      sp: 's003',
      src: 'https://www.fishbase.se/images/species/Fiwra_u0.jpg',
      via: 'fishbase',
      from: 'fishbase',
      e: 5
    },
    cur = {...CUR, fish: {...CUR.fish, seen: {...CUR.fish.seen, 'fish-s003-cand-fb-Fiwra_u0': 1}}};
  assert.ok(
    C.fishPhotos({t01: [ref]}, {}, CUR).t01.some(p => p.f === ref.f),
    'in play while the candidate is not rejected'
  );
  assert.ok(!C.fishPhotos({t01: [ref]}, {}, cur).t01.some(p => p.f === ref.f), 'out once Pierre rejected the candidate');
});

// The photos that enter play by themselves (Pierre, 2026-11-06, Q180 and Q199: a candidate judged sure; a reference photo
// judged sure on the same rubric, whatever its reference level, 2026-11-08, Q212; treated exactly like the photos he
// adds, hosted on R2): the same download, listed with auto, out once he rejects, excludes or moves the photo; never the
// same photo or (a reference photo) observation twice.
const AUTO_SUG = {
  fish: {
    ...SUG.fish,
    'fish-s003-cand-301': {jt: 'p1g0sm1', e: 4, k: 'best', c: [0, 0, 0.5, 1]},
    'fish-s003-cand-302': {jt: 'o1g0sm1', e: 3, k: 'alt'},
    'fish-s003-cand-303': {jt: 'p1g0sm1', e: 5, k: 'best', u: ['code'], n: 'unsure'},
    'fish-s003-cand-304': {jt: 'p1g0smm', e: 4, k: 'best'},
    'fish-s003-cand-305': {jt: 'p1g0sm1', e: 4, k: 'dup'},
    'fish-s003-cand-306': {jt: 'p1g0sm1', e: 4, k: 'best'},
    'fish-s003-cand-307': {jt: 'p1g0sma', e: 3, k: 'best'}
  }
};
const REF = (id, o, k = {}) => ({
  f: 'fi' + id,
  o: `https://www.inaturalist.org/observations/${o}`,
  src: INAT(id),
  r: 1,
  a: '(c) Someone, some rights reserved (CC BY)',
  lic: 'cc-by',
  t: 'Fishus wrassii',
  sp: 's003',
  loc: 'world',
  for: ['s003'],
  ...k
});
function autoWorld() {
  const dir = world(),
    w = (f, o) => fs.writeFileSync(path.join(dir, f), JSON.stringify(o)),
    c = structuredClone(CAND),
    cur = structuredClone(CUR);
  c.cand.s003.push(...[302, 303, 304, 305, 306, 307].map(id => cand('s003', id)));
  cur.fish.seen['fish-s003-cand-306'] = 1; // judged sure, but Pierre rejected it
  w('fish-cand.json', c);
  w('curation.json', cur);
  w('suggest.json', AUTO_SUG);
  fs.mkdirSync(path.join(dir, 'tools'));
  // 308: a cover judged 4, one point more for being one (reference level); 309: judged 4, no rep (below it, in like a
  // candidate: Q212); 310, 314, 315: on candidate 301's observation (Q218: in once judged against it, so 310, not judged
  // against it yet, out; 314, judged alt, in; 315, judged dup, out); 311: other kinds of fish too (P3: out); 312: out
  // of the water (out); 313: a hard one, head-on, dim and soft, judged 2 (in, as a candidate would be).
  w('tools/fish_refs.json', {
    photos: {
      s003: [
        REF(308, 9308, {rep: 'inaturalist', from: 'cover'}),
        REF(309, 9309, {from: 'taxon'}),
        REF(310, 9301, {rep: 'inaturalist', from: 'taxon'}),
        REF(311, 9311, {from: 'taxon'}),
        REF(312, 9312, {from: 'taxon'}),
        REF(313, 9313, {from: 'taxon'}),
        REF(314, 9301, {from: 'taxon'}),
        REF(315, 9301, {from: 'taxon'}),
        // 316 then 317, one new observation: 316 judged dup of 317 stays out whatever the order (Codex review #715).
        REF(316, 9316, {from: 'taxon'}),
        REF(317, 9316, {from: 'taxon'})
      ]
    }
  });
  w('tools/fish_judge.json', {
    photos: {
      t02: {
        fi308: 'p1g0sl14',
        fi309: 'p1g0sl14',
        fi310: 'p1g0sl15',
        fi311: 'p1g0slm4',
        fi312: 'p1g0sl1a3',
        fi313: 'h1d0mm12',
        fi314: 'p1g0sl14',
        fi315: 'p1g0sl14',
        fi316: 'p1g0sl14',
        fi317: 'p1g0sl14'
      }
    },
    crops: {},
    keep: {fi314: 'alt', fi315: 'dup', fi316: 'dup', fi317: 'best'}
  });
  return dir;
}
test(
  'fish_game.py: candidates and reference photos judged sure in play by themselves, on R2, until Pierre decides',
  {skip: !pil && 'Pillow missing'},
  () => {
    const dir = autoWorld(),
      // One download only: the reference photo first (the tier order), the rest wait for the next run.
      r1 = run(dir, path.join(dir, 'up1'), 1),
      G1 = JSON.parse(fs.readFileSync(path.join(dir, 'fish-game.json'), 'utf8'));
    assert.deepStrictEqual([r1.done, r1.wait], [1, 12]); // 107 among them: its host is refused at download
    assert.deepStrictEqual(
      Object.values(G1.photos)
        .flat()
        .map(p => p.f),
      ['fi308']
    );
    const r = run(dir, path.join(dir, 'up2')),
      G = JSON.parse(fs.readFileSync(path.join(dir, 'fish-game.json'), 'utf8')),
      by = Object.fromEntries(
        Object.values(G.photos)
          .flat()
          .map(p => [p.f, p])
      );
    assert.deepStrictEqual([r.done, r.wait, r.n], [11, 0, 12]);
    // Pierre's 5 as before, the sure best and alt of the candidates, the reference photos judged sure (below the reference
    // level too: Q212); never the unsure, other kinds of fish (P3), dup, a photo he rejected, out of the water, a reference
    // photo on an observation in play unless judged no duplicate of its photos (Q218).
    assert.deepStrictEqual(Object.keys(by).sort(), [
      'fi308',
      'fi309',
      'fi313',
      'fi314',
      'fi317',
      'fish-s001-cand-101',
      'fish-s001-cand-102',
      'fish-s001-cand-105',
      'fish-s002-cand-201',
      'fish-s003-cand-301',
      'fish-s003-cand-302',
      'fish-s003-cand-fb-Fiwra_u0'
    ]);
    assert.deepStrictEqual(
      [by['fish-s003-cand-301'].auto, by['fish-s003-cand-301'].e, by['fish-s003-cand-301'].jt],
      ['cand', 4, 'p1g0sm1']
    );
    // The pass's proposed crop applied, as the auto-sort writes it into Pierre's draft.
    assert.deepStrictEqual([by['fish-s003-cand-301'].cr, by['fish-s003-cand-301'].ar], [[0, 0, 0.5, 1], 0.67]);
    assert.deepStrictEqual(
      [by.fi308.auto, by.fi308.e, by.fi308.jt, by.fi308.rep, by.fi308.from, !!by.fi308.r],
      ['ref', 5, 'p1g0sl1r', 'inaturalist', 'cover', false]
    );
    // Below the reference level, in with its judged ease and tags, as a candidate judged the same.
    assert.deepStrictEqual([by.fi309.auto, by.fi309.e, by.fi309.jt, C.refLevel(by.fi309)], ['ref', 4, 'p1g0sl1', false]);
    assert.deepStrictEqual([by.fi313.auto, by.fi313.e, by.fi313.jt], ['ref', 2, 'h1d0mm1']);
    assert.ok(!by['fish-s001-cand-101'].auto, "Pierre's own adds carry no auto");
    // In the game (core.js fishPhotos): in play until Pierre rejects, excludes or moves the photo, by photo id.
    const cur = JSON.parse(fs.readFileSync(path.join(dir, 'curation.json'), 'utf8')),
      shown = c => (C.fishPhotos({}, G.photos, c, FISH).t02 || []).map(p => p.f);
    ['fish-s003-cand-301', 'fish-s003-cand-302', 'fi308'].forEach(f => assert.ok(shown(cur).includes(f), f));
    const no = (k, f) => ({...cur, fish: {...cur.fish, [k]: {...(cur.fish[k] || {}), [f]: k === 'out' ? 'x' : 1}}});
    assert.ok(!shown(no('seen', 'fish-s003-cand-301')).includes('fish-s003-cand-301'), 'rejected');
    assert.ok(!shown(no('exclude', 'fish-s003-cand-302')).includes('fish-s003-cand-302'), 'excluded');
    assert.ok(!shown(no('out', 'fish-s003-cand-308')).includes('fi308'), 'its candidate moved with Not this');
    assert.ok(!shown({...cur, exclude: {'fish-s003-cand-301': 'x'}}).includes('fish-s003-cand-301'), 'excluded for good');
    // fish_game.py's copy of the rule agrees.
    const recs = Object.values(G.photos).flat(),
      curs = [cur, no('seen', 'fish-s003-cand-301'), no('out', 'fish-s003-cand-308')],
      got = JSON.parse(
        py(`import fish_game as G
recs, curs = json.loads(${JSON.stringify(JSON.stringify([recs, curs]))})
print(json.dumps([[G.fish_in(c.get('fish') or {}, p, G.gone_ids(c)) for p in recs] for c in curs]))`)
      );
    assert.deepStrictEqual(
      got,
      curs.map(c => recs.map(p => C.fishIn(c.fish, p, C.fishGone(c))))
    );
    // Pierre rejects one: the next run takes it out of the list.
    fs.writeFileSync(path.join(dir, 'curation.json'), JSON.stringify(no('seen', 'fish-s003-cand-302')));
    const r3 = run(dir, path.join(dir, 'up3'));
    assert.deepStrictEqual([r3.done, r3.n], [0, 11]);
    fs.rmSync(dir, {recursive: true, force: true});
  }
);

// Pierre's word stands over a photo in play by itself (Codex review #674): an automatic add of the auto-sort he undid
// (log code '-a...', autosort.js fishUndo) keeps the photo out, and his explicit full-photo crop [0, 0, 1, 1] beats the
// pass's proposed crop.
test("fish_game.py: an undone auto add stays out, and Pierre's full-photo crop beats the proposal", () => {
  const dir = autoWorld(),
    cur = JSON.parse(fs.readFileSync(path.join(dir, 'curation.json'), 'utf8'));
  cur.fish.auto = {'2026-11-06': {'fish-s003-cand-302': '-ae', 'fish-s003-cand-305': '-r'}};
  cur.fish.crop['fish-s003-cand-301'] = [0, 0, 1, 1];
  fs.writeFileSync(path.join(dir, 'curation.json'), JSON.stringify(cur));
  const got = JSON.parse(
    py(`import fish_game as G
fish, cur, cand, sug, refs, codes, crops, rkeep = G.inputs(${JSON.stringify(dir)})
todo, keep, _ = G.plan(fish, cur, cand, sug, {'photos': {}}, refs, codes, crops, rkeep=rkeep)
print(json.dumps({r['f']: c for r, c, _ in todo}))`)
  );
  assert.ok(!('fish-s003-cand-302' in got), 'an undone auto add stays out');
  assert.strictEqual(got['fish-s003-cand-301'], null, 'his full-photo crop, not the proposal');
  const rec = {f: 'fish-s003-cand-302', sp: 's003', auto: 'cand'};
  assert.ok(!C.fishIn(cur.fish, rec, C.fishGone(cur)), 'core.js agrees');
  assert.ok(C.fishIn(cur.fish, {...rec, f: 'fish-s003-cand-301'}, C.fishGone(cur)));
  fs.rmSync(dir, {recursive: true, force: true});
});

// core.js fishPhotos: curated photos where an entry has enough very easy ones, the stopgap's joining them otherwise.
const ph = (f, k = {}) => ({f, o: 'https://www.inaturalist.org/observations/' + f, src: INAT(f.replace(/\D/g, '') || 1), ...k});
test('fishPhotos: an entry with 5 very easy curated photos plays on them alone; fewer, the stopgap joins', () => {
  const easy = n => Array.from({length: n}, (_, i) => ph(`fish-s001-cand-${500 + i}`, {sp: 's001', e: 4}));
  const game = {
      t01: [...easy(5), ph('fish-s001-cand-599', {sp: 's001', e: 2})],
      t02: easy(4).map(p => ({...p, f: p.f.replace('s001', 's003'), sp: 's003'}))
    },
    stop = {t01: [ph('fi1', {e: 5})], t02: [ph('fi2', {e: 5})], t03: [ph('fi3', {e: 4})]},
    cur = {
      fish: {
        add: Object.fromEntries(
          Object.values(game)
            .flat()
            .map(p => [p.f, p.sp])
        )
      }
    },
    out = C.fishPhotos(stop, game, cur);
  assert.deepStrictEqual(
    out.t01.map(p => p.f),
    game.t01.map(p => p.f)
  );
  assert.deepStrictEqual(
    out.t02.map(p => p.f),
    [...game.t02.map(p => p.f), 'fi2']
  );
  assert.deepStrictEqual(
    out.t03.map(p => p.f),
    ['fi3'],
    'an entry with no curated photo keeps the stopgap'
  );
  assert.strictEqual(C.FISHPH.MIN, 5);
  // No curation loaded yet: the lists as they are.
  assert.strictEqual(C.fishPhotos(stop, game, null).t01.length, 6);
});

test('fishPhotos: an entry on its curated photos keeps the stopgap’s photos of a genus they do not cover (Codex review #614)', () => {
  const fish = {
      species: [
        {id: 's001', name: 'Chromis viridis'},
        {id: 's002', name: 'Dascyllus aruanus'},
        {id: 's003', name: 'Chromis ternatensis'}
      ]
    },
    game = {t01: Array.from({length: 5}, (_, i) => ph(`fish-s001-cand-${700 + i}`, {sp: 's001', e: 5}))},
    stop = {t01: [ph('fi31', {sp: 's003', e: 4}), ph('fi32', {sp: 's002', e: 4}), ph('fi33', {sp: 's002', e: 3}), ph('fi34', {e: 4})]},
    cur = {fish: {add: Object.fromEntries(game.t01.map(p => [p.f, p.sp])), seen: {'fish-s002-cand-33': 1}}};
  // Chromis is covered by the curated photos (s003's stopgap photo goes); Dascyllus is not (its photo stays, minus the one
  // Pierre rejected); a stopgap photo with no species goes.
  assert.deepStrictEqual(
    C.fishPhotos(stop, game, cur, fish).t01.map(p => p.f),
    [...game.t01.map(p => p.f), 'fi32']
  );
  // Without fish.json the curated photos alone, as before.
  assert.strictEqual(C.fishPhotos(stop, game, cur).t01.length, 5);
});

test('fishPhotos: Pierre’s curation applies at once, to the curated photos and to the stopgap’s', () => {
  const game = {
      t01: [
        ph('fish-s001-cand-11', {sp: 's001', e: 4}),
        ph('fish-s001-cand-12', {sp: 's001', e: 4}),
        ph('fish-s001-cand-13', {sp: 's001', e: 4})
      ]
    },
    stop = {
      t01: [
        ph('fi11', {o: game.t01[0].o}), // the same photo as a curated one: shown once, curated
        ph('fi20'), // rejected as a candidate
        ph('fi21'), // excluded as a candidate
        ph('fi22'), // moved by Not this
        ph('fi23'), // excluded for good (top level, coral or fish)
        ph('fi24', {o: game.t01[1].o}), // another photo of a curated observation
        ph('fi25') // nothing decided: kept
      ]
    },
    cur = {
      exclude: {'fish-s009-cand-23': 'x'},
      fish: {
        add: {'fish-s001-cand-11': 's001', 'fish-s001-cand-12': 's001', 'fish-s001-cand-13': 's001'},
        seen: {'fish-s001-cand-20': 1, 'fish-s001-cand-13': 1},
        exclude: {'fish-s001-cand-21': 'r'},
        out: {'fish-s001-cand-22': 's005'}
      }
    },
    out = C.fishPhotos(stop, game, cur);
  // 13 rejected after the last run: out at once; the stopgap only keeps what Pierre never decided against.
  assert.deepStrictEqual(
    out.t01.map(p => p.f),
    ['fish-s001-cand-11', 'fish-s001-cand-12', 'fi25']
  );
  // A curated photo moved by Not this to another species leaves its old species at once.
  const moved = C.fishPhotos({}, game, {fish: {...cur.fish, seen: {}, out: {'fish-s001-cand-12': 's005'}}});
  assert.deepStrictEqual(
    moved.t01.map(p => p.f),
    ['fish-s001-cand-11', 'fish-s001-cand-13']
  );
});

test('fish-game.json: the layout tools/fish_game.py writes, only photos in play, downloaded (no r), in the R2 list', () => {
  const G = read('fish-game.json'),
    text = fs.readFileSync(path.join(ROOT, 'fish-game.json'), 'utf8');
  assert.strictEqual(G.v, 1);
  assert.strictEqual(
    py(`import fish_game as G\nsys.stdout.write(G.dumps(json.load(open('fish-game.json'))))`),
    text,
    'run python3 tools/fish_game.py'
  );
  const r2 = new Set(py('import photos\nprint("\\n".join(sorted(photos.online())))').split('\n'));
  Object.values(G.photos)
    .flat()
    .forEach(p => {
      assert.ok(
        !p.r &&
          p.src &&
          /^https:\/\/(inaturalist-open-data\.s3\.amazonaws\.com|static\.inaturalist\.org|www\.fishbase\.(?:de|se))\//.test(p.src),
        p.f
      );
      assert.ok(r2.has(p.f), `${p.f}: not in the R2 list (tools/photos.py DATA)`);
    });
});

// The offline plan of the command line (Codex review #715: it unpacked one value fewer than inputs gives).
test('fish_game.py --plan: prints the photos in play and what to download, offline, writing nothing', () => {
  const out = execFileSync('python3', ['tools/fish_game.py', '--plan'], {cwd: ROOT, encoding: 'utf8'});
  assert.match(out, /^in play: \d+ photos over \d+ species \(Pierre's adds \d+, candidates judged sure \d+, reference photos \d+\)/);
});
