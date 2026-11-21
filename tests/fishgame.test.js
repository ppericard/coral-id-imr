require('./slot.js').testGuard();
// The curated fish game photos: tools/fish_game.py, run by the Candidate photos workflow, downloads the photos Pierre
// put in play (curation.json fish, core.js treePhotoOn) into the R2 upload folder and writes fish-game.json; core.js
// treePhotos plays them. Offline: a made-up fixture, the originals served by a stub (never iNaturalist, FishBase or
// R2). The download needs python3 with Pillow (tools/requirements.txt, installed by checks.yml).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync} = require('child_process');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
// maxBuffer: fish-game.json is above the 1 MB default (ENOBUFS).
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
// The pass's judgment for the photos Pierre has no value for (data/suggest.json fish).
const SUG = {
  fish: {'fish-s001-cand-105': {jt: 'o1g1sm1', e: 3, k: 'best'}, 'fish-s003-cand-fb-Fiwra_u0': {jt: 'p1g0sl1r', e: 5, ph: 'male'}}
};

function world() {
  const dir = mkTmp('fishgame-');
  const w = (f, o) => fs.writeFileSync(path.join(dir, f), JSON.stringify(o));
  w('fish.json', FISH);
  w('data/fish-cand.json', CAND);
  w('curation.json', CUR);
  w('data/suggest.json', SUG);
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
    // Entry order: the entry's species order, then the easiest (never Pierre's own by priority).
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
    // Tags and ease: Pierre's (fish.tags, fish.ease), else the pass's; the phase as the admin's treePhase.
    assert.deepStrictEqual([by['fish-s001-cand-102'].e, by['fish-s001-cand-102'].jt, by['fish-s001-cand-102'].own], [5, 'p1g0sl1', true]);
    assert.deepStrictEqual([by['fish-s002-cand-201'].e, by['fish-s002-cand-201'].ph], [2, 'juvenile']);
    assert.deepStrictEqual(
      [by['fish-s001-cand-105'].sp, by['fish-s001-cand-105'].e, by['fish-s001-cand-105'].jt],
      ['s003', 3, 'o1g1sm1'],
      'a Not this photo in play for its new species, under that entry'
    );
    // Named after its new species (the WoRMS name), never the identification Pierre corrected; the
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
    // Pierre turns the cropped one a quarter right (fish.rot): it comes again, cut then turned (the
    // left half, 2:3, becomes 3:2), its crop kept, iv 1; back upright it comes once more, ro gone, iv 2.
    const at = (k, f) => JSON.parse(fs.readFileSync(path.join(dir, 'fish-game.json'), 'utf8')).photos[k].find(x => x.f === f);
    cur.fish.rot = {'fish-s001-cand-101': 90};
    fs.writeFileSync(path.join(dir, 'curation.json'), JSON.stringify(cur));
    const up4 = path.join(dir, 'up4'),
      r4 = run(dir, up4),
      p4 = at('t01', 'fish-s001-cand-101');
    assert.deepStrictEqual([r4.done, r4.n], [1, 4]);
    assert.deepStrictEqual([p4.cr, p4.ro, p4.ar, p4.iv], [[0, 0, 0.5, 1], 90, 1.5, 1]);
    assert.strictEqual(
      py(`from PIL import Image; print(Image.open(${JSON.stringify(path.join(up4, 'fish-s001-cand-101.webp'))}).size)`).trim(),
      '(300, 200)'
    );
    delete cur.fish.rot;
    fs.writeFileSync(path.join(dir, 'curation.json'), JSON.stringify(cur));
    const r5 = run(dir, path.join(dir, 'up5')),
      p5 = at('t01', 'fish-s001-cand-101');
    assert.deepStrictEqual([r5.done, p5.ro, p5.ar, p5.iv], [1, undefined, 0.67, 2]);
    fs.rmSync(dir, {recursive: true, force: true});
  }
);

test('fish_game.py fish_on and pid agree with core.js treePhotoOn and treePid', () => {
  const F = CUR.fish,
    cases = [...Object.keys(F.add), 'fish-s003-cand-301'].flatMap(f => ['s001', 's002', 's003'].map(s => [f, s]));
  const got = JSON.parse(
    py(`import fish_game as G
F = json.loads(${JSON.stringify(JSON.stringify(F))})
print(json.dumps([G.fish_on(F, f, s) for f, s in ${JSON.stringify(cases)}] + [G.pid(f) for f in ['fi123', 'fish-s001-cand-123', 'fish-s001-cand-123c', 'fish-s003-cand-fb-Fiwra_u0', 'fbFiwra_u0', 'some-photo']]))`)
  );
  assert.deepStrictEqual(got, [
    ...cases.map(([f, s]) => C.treePhotoOn(F, f, s)),
    ...['fi123', 'fish-s001-cand-123', 'fish-s001-cand-123c', 'fish-s003-cand-fb-Fiwra_u0', 'fbFiwra_u0', 'some-photo'].map(C.treePid)
  ]);
  // A FishBase reference or sheet photo (fb<stem>, tools/fish_refs.py) and its candidate are one photo.
  assert.deepStrictEqual(got.slice(-6), ['i123', 'i123', 'i123', 'bFiwra_u0', 'bFiwra_u0', 'some-photo']);
  // So Pierre's rejection of the candidate keeps its reference copy out of the game (core.js treePhotos).
  const ref = {
      f: 'fbFiwra_u0',
      sp: 's003',
      src: 'https://www.fishbase.se/images/species/Fiwra_u0.jpg',
      via: 'fishbase',
      from: 'fishbase',
      auto: 'ref',
      e: 5
    },
    cur = {...CUR, fish: {...CUR.fish, seen: {...CUR.fish.seen, 'fish-s003-cand-fb-Fiwra_u0': 1}}};
  assert.ok(
    C.treePhotos({}, {t01: [ref]}, CUR).t01.some(p => p.f === ref.f),
    'in play while the candidate is not rejected'
  );
  assert.ok(!C.treePhotos({}, {t01: [ref]}, cur).t01.some(p => p.f === ref.f), 'out once Pierre rejected the candidate');
  assert.ok(!C.treePhotos({t01: [ref]}, {}, cur).t01.some(p => p.f === ref.f), 'and out of the first photos alike');
});

// The photos that enter play by themselves (a candidate judged sure; a reference photo judged sure on the same rubric,
// whatever its reference level; treated exactly like the photos he adds, hosted on R2): the same download, listed with
// auto, out once he rejects, excludes or moves the photo; never the same photo or (a reference photo) observation twice.
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
  w('data/fish-cand.json', c);
  w('curation.json', cur);
  w('data/suggest.json', AUTO_SUG);
  fs.mkdirSync(path.join(dir, 'tools'));
  // 308: a cover judged 4, no point more for being one, reference level by its look and ease, as 309: judged 4 with the
  // look and no rep, in like a candidate and reference level the same: the route weighs nothing; 310, 314, 315: on
  // candidate 301's observation (in once judged against it, so 310, not judged
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
        // 316 then 317, one new observation: 316 judged dup of 317 stays out whatever the order.
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
    // Pierre's 5 adds of the fixture, the sure best and alt of the candidates, the reference photos judged sure (below the
    // reference level too); never the unsure, other kinds of fish (P3), dup, a photo he rejected, out of the water, a
    // reference photo on an observation in play unless judged no duplicate of its photos.
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
      ['ref', 4, 'p1g0sl1r', 'inaturalist', 'cover', false]
    );
    // In with its judged ease and tags, as a candidate judged the same; reference level like fi308, whatever its route
    // (the look and the ease read, never the rep), and a hard one never.
    assert.deepStrictEqual([by.fi309.auto, by.fi309.e, by.fi309.jt, C.refLevel(by.fi309)], ['ref', 4, 'p1g0sl1', true]);
    assert.deepStrictEqual([C.refLevel(by.fi308), C.refLevel(by.fi313)], [true, false]);
    assert.deepStrictEqual([by.fi313.auto, by.fi313.e, by.fi313.jt], ['ref', 2, 'h1d0mm1']);
    assert.ok(!by['fish-s001-cand-101'].auto, "Pierre's own adds carry no auto");
    // In the game (core.js treePhotos): in play until Pierre rejects, excludes or moves the photo, by photo id.
    const cur = JSON.parse(fs.readFileSync(path.join(dir, 'curation.json'), 'utf8')),
      shown = c => (C.treePhotos({}, G.photos, c, FISH).t02 || []).map(p => p.f);
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
      curs.map(c => recs.map(p => C.treePhotoIn(c.fish, p, C.treeGone(c))))
    );
    // Pierre rejects one: the next run takes it out of the list.
    fs.writeFileSync(path.join(dir, 'curation.json'), JSON.stringify(no('seen', 'fish-s003-cand-302')));
    const r3 = run(dir, path.join(dir, 'up3'));
    assert.deepStrictEqual([r3.done, r3.n], [0, 11]);
    fs.rmSync(dir, {recursive: true, force: true});
  }
);

// Pierre's word stands over a photo in play by itself: an automatic add of the auto-sort he undid
// (log code '-a...', autosort.js treeUndo) keeps the photo out, and his explicit full-photo crop [0, 0, 1, 1] beats the
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
  assert.ok(!C.treePhotoIn(cur.fish, rec, C.treeGone(cur)), 'core.js agrees');
  assert.ok(C.treePhotoIn(cur.fish, {...rec, f: 'fish-s003-cand-301'}, C.treeGone(cur)));
  fs.rmSync(dir, {recursive: true, force: true});
});

// core.js treePhotos: the photos in play (fish-game.json) alone; fish-photos.json's first photos (the same records) only
// while the game list is not in. No remote iNaturalist photo joins an entry short of very easy curated photos.
const ph = (f, k = {}) => ({f, o: 'https://www.inaturalist.org/observations/' + f, src: INAT(f.replace(/\D/g, '') || 1), ...k});
test('treePhotos: the photos in play alone, however few very easy; the first photos only until fish-game.json is in', () => {
  const easy = n => Array.from({length: n}, (_, i) => ph(`fish-s001-cand-${500 + i}`, {sp: 's001', e: 4}));
  const game = {
      t01: [...easy(5), ph('fish-s001-cand-599', {sp: 's001', e: 2})],
      t02: easy(1).map(p => ({...p, f: p.f.replace('s001', 's003'), sp: 's003'}))
    },
    first = {t01: [game.t01[0]], t02: [game.t02[0]], t03: [ph('fish-s009-cand-3', {sp: 's009', e: 4})]},
    cur = {
      fish: {
        add: Object.fromEntries([...Object.values(game), ...Object.values(first)].flat().map(p => [p.f, p.sp]))
      }
    },
    out = C.treePhotos(first, game, cur);
  assert.deepStrictEqual(
    out.t01.map(p => p.f),
    game.t01.map(p => p.f)
  );
  assert.deepStrictEqual(
    out.t02.map(p => p.f),
    game.t02.map(p => p.f),
    'one very easy photo: nothing joins it'
  );
  assert.ok(!('t03' in out), 'the first photos are not read once the game list is in');
  assert.ok(!('FISHPH' in C), 'no minimum to fill from elsewhere');
  // fish-game.json not in yet (Home before it, or it cannot come): the first photos.
  assert.deepStrictEqual(Object.fromEntries(Object.entries(C.treePhotos(first, {}, cur)).map(([t, L]) => [t, L.map(p => p.f)])), {
    t01: ['fish-s001-cand-500'],
    t02: ['fish-s003-cand-500'],
    t03: ['fish-s009-cand-3']
  });
  // No curation loaded yet: the lists as they are.
  assert.strictEqual(C.treePhotos(first, game, null).t01.length, 6);
  assert.strictEqual(C.treePhotos(undefined, undefined, null).t01, undefined);
});

test('treePhotos: Pierre’s curation applies at once, to the photos in play and to the first photos', () => {
  const game = {
      t01: [
        ph('fish-s001-cand-11', {sp: 's001', e: 4}),
        ph('fish-s001-cand-12', {sp: 's001', e: 4}),
        ph('fish-s001-cand-13', {sp: 's001', e: 4}),
        ph('fish-s001-cand-14', {sp: 's001', e: 4, auto: 'cand'}), // in by itself, then rejected
        ph('fish-s001-cand-15', {sp: 's001', e: 4, auto: 'cand'}), // in by itself, excluded for good (top level)
        ph('fish-s001-cand-16', {sp: 's001', e: 4, auto: 'ref'}) // in by itself, nothing decided: kept
      ]
    },
    cur = {
      exclude: {'fish-s009-cand-15': 'x'},
      fish: {
        add: {'fish-s001-cand-11': 's001', 'fish-s001-cand-12': 's001', 'fish-s001-cand-13': 's001'},
        seen: {'fish-s001-cand-13': 1, 'fish-s001-cand-14': 1}
      }
    },
    want = ['fish-s001-cand-11', 'fish-s001-cand-12', 'fish-s001-cand-16'];
  // 13 and 14 rejected after the last run, 15 excluded everywhere: out at once.
  assert.deepStrictEqual(
    C.treePhotos({}, game, cur).t01.map(p => p.f),
    want
  );
  assert.deepStrictEqual(
    C.treePhotos(game, {}, cur).t01.map(p => p.f),
    want,
    'the first photos alike'
  );
  // A curated photo moved by Not this to another species leaves its old species at once.
  const moved = C.treePhotos({}, game, {fish: {...cur.fish, seen: {}, out: {'fish-s001-cand-12': 's005'}}});
  assert.deepStrictEqual(
    moved.t01.map(p => p.f),
    ['fish-s001-cand-11', 'fish-s001-cand-13', 'fish-s001-cand-14', 'fish-s001-cand-15', 'fish-s001-cand-16']
  );
});

test('fish-game.json: the layout tools/fish_game.py writes, only photos in play, downloaded (no r), in the R2 list', () => {
  const G = C.treeGameRead(read('fish-game.json')), // its records whole (the file's short form)
    text = fs.readFileSync(path.join(ROOT, 'fish-game.json'), 'utf8');
  assert.strictEqual(G.v, 1);
  // Written in the short form (tools/fish_short.py): no iNaturalist observation address in full.
  assert.ok(!text.includes('"o":"https://www.inaturalist.org/observations/'), 'run python3 tools/fish_game.py --rewrite');
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

// The offline plan of the command line (it unpacks every value inputs gives).
test('fish_game.py --plan: prints the photos in play and what to download, offline, writing nothing', () => {
  const out = execFileSync('python3', ['tools/fish_game.py', '--plan'], {cwd: ROOT, encoding: 'utf8'});
  assert.match(out, /^in play: \d+ photos over \d+ species \(Pierre's adds \d+, candidates judged sure \d+, reference photos \d+\)/);
});

// The tiles (the square photos of "Find the X" and Matrix; judging/FISH.md "The fish's
// box"): a photo in play whose tags pass the tile rule and that has the fish's box gets a 360 px square, {f}-x.webp, cut
// around the fish; kept when the fish fills 70% of it and the box is 320 px wide in the original.
test('fish_game.py tile_crop: the box plus 10% squared, inside the frame; a long fish keeps its square; res and cut refused', () => {
  const got = JSON.parse(
    py(`import fish_game as G
cases = [
  ([0.4, 0.4, 0.6, 0.6], 2000, 1500, None),        # in the middle: 400 x 300 px box, a 480 px square around it
  ([0.0, 0.3, 0.3, 0.6], 2000, 1500, None),        # at the left edge: moved back inside
  ([0.1, 0.0, 0.8, 1.0], 2000, 1500, None),        # 1500 px tall, the photo too: the margin gives way, no band
  ([0.05, 0.3, 0.95, 0.7], 2000, 1000, None),      # 1800 px long, the photo 1000 high: the square passes the edges
  ([0.4, 0.4, 0.55, 0.6], 2000, 1500, None),       # 300 px wide: res
  ([0.1, 0.1, 0.7, 0.9], 2000, 1500, [0, 0, 0.5, 1]),  # past Pierre's crop: cut
  ([0.05, 0.1, 0.45, 0.5], 2000, 1500, [0, 0, 0.5, 1]),  # inside his crop: framed by it
]
print(json.dumps([G.tile_crop(b, W, H, fr) for b, W, H, fr in cases]))`)
  );
  const side = ([l, t, r, b], W, H) => [Math.round((r - l) * W), Math.round((b - t) * H)];
  // 1: a 480 px square (400 + 2 x 40) centred on the box.
  assert.deepStrictEqual(got[0], [[0.38, 0.34, 0.62, 0.66], null]);
  // 2: 720 px square (600 x 1.2) from the photo's left edge, centred on the box vertically.
  assert.deepStrictEqual(got[1], [[0, 0.21, 0.36, 0.69], null]);
  assert.deepStrictEqual(side(got[1][0], 2000, 1500), [720, 720]);
  // 3: the margin gives way to the photo's height: a 1500 px square, inside it.
  assert.deepStrictEqual(side(got[2][0], 2000, 1500), [1500, 1500]);
  assert.ok(got[2][0][1] >= 0 && got[2][0][3] <= 1);
  // 4: 1800 px long in a 2000 x 1000 photo: its margin as far as the photo's width allows (2000, not 2160), its square
  // past the top and bottom edges, equally (the band the blurred copy fills).
  const [l4, t4, r4, b4] = got[3][0];
  assert.deepStrictEqual(side(got[3][0], 2000, 1000), [2000, 2000]);
  assert.deepStrictEqual([l4, r4, t4, b4], [0, 1, -0.5, 1.5]);
  assert.deepStrictEqual(
    [got[4], got[5]],
    [
      [null, 'res'],
      [null, 'cut']
    ]
  );
  // 7: framed by his crop (the left half, 1000 x 1500): the square stays inside it.
  const [l7, , r7] = got[6][0];
  assert.ok(l7 >= 0 && r7 <= 0.5, JSON.stringify(got[6]));
  // The tile rule on the tags: profile or slight oblique, whole, good light, colour loss 0-1, sharp, large or medium, one
  // fish, no j, c or a.
  const tags = [
    'p1g0sl1',
    'o1g1sm1r',
    'p1g0sl1p',
    'h1g0sl1',
    'p0g0sl1',
    'p1d0sl1',
    'p1n0sl1',
    'p1g2sl1',
    'p1g0ml1',
    'p1g0ss1',
    'p1g0sls',
    'p1g0sl1j',
    'p1g0sl1c',
    ''
  ];
  assert.deepStrictEqual(JSON.parse(py(`import fish_game as G\nprint(json.dumps([G.tile_tags(t) for t in ${JSON.stringify(tags)}]))`)), [
    true,
    true,
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false
  ]);
});

test(
  'fish_game.py: the tiles made with the download, alone for a photo already in play, refused, and in the R2 list',
  {skip: !pil && 'Pillow missing'},
  () => {
    const dir = world(),
      w = (f, o) => fs.writeFileSync(path.join(dir, f), JSON.stringify(o)),
      size = f => py(`from PIL import Image; print(Image.open(${JSON.stringify(f)}).size)`).trim();
    fs.mkdirSync(path.join(dir, 'tools'));
    // The stub's originals are 400 x 300. 102: 340 px long (the photo 300 high: its square passes the edges); 101: past
    // Pierre's crop (the left half); 201: a juvenile (no tile, whatever its box); 105 (the pass's box, data/suggest.json bb):
    // 160 px wide.
    const judge = boxes => w('tools/fish_judge.json', {photos: {}, boxes});
    judge({
      'fish-s001-cand-102': [0.05, 0.1, 0.9, 0.8],
      'fish-s001-cand-101': [0.1, 0.1, 0.7, 0.9],
      'fish-s002-cand-201': [0.05, 0.1, 0.9, 0.8]
    });
    w('data/suggest.json', {fish: {...SUG.fish, 'fish-s001-cand-105': {...SUG.fish['fish-s001-cand-105'], bb: [0.1, 0.1, 0.5, 0.5]}}});
    const out = path.join(dir, 'up'),
      r = run(dir, out),
      by = () =>
        Object.fromEntries(
          Object.values(JSON.parse(fs.readFileSync(path.join(dir, 'fish-game.json'), 'utf8')).photos)
            .flat()
            .map(p => [p.f, p])
        );
    assert.deepStrictEqual([r.done, r.n], [5, 5]);
    let B = by();
    assert.deepStrictEqual(B['fish-s001-cand-102'].bb, [0.05, 0.1, 0.9, 0.8]);
    assert.ok(B['fish-s001-cand-102'].xc && !B['fish-s001-cand-102'].xn);
    assert.strictEqual(size(path.join(out, 'fish-s001-cand-102-x.webp')), '(360, 360)');
    assert.deepStrictEqual([B['fish-s001-cand-101'].xn, B['fish-s001-cand-105'].xn], ['cut', 'res']);
    assert.ok(!('bb' in B['fish-s002-cand-201']), 'a juvenile: no tile');
    assert.deepStrictEqual(
      fs.readdirSync(out).filter(f => f.endsWith('-x.webp')),
      ['fish-s001-cand-102-x.webp']
    );
    // The R2 list knows the tile (tools/r2_sync.sh checks the bucket has it).
    assert.strictEqual(
      py(`import photos\nprint(sorted(photos.tiles(photos.records(${JSON.stringify(dir)}))))`).trim(),
      "['fish-s001-cand-102']"
    );
    // A box for a photo already in play (the FishBase one): its tile alone, the original fetched again (FishBase retried),
    // its four files left as they are.
    judge({'fish-s001-cand-102': [0.05, 0.1, 0.9, 0.8], 'fish-s003-cand-fb-Fiwra_u0': [0, 0.05, 0.85, 0.95]});
    const out2 = path.join(dir, 'up2'),
      r2 = run(dir, out2);
    assert.deepStrictEqual([r2.done, r2.n], [0, 5]);
    assert.deepStrictEqual(fs.readdirSync(out2), ['fish-s003-cand-fb-Fiwra_u0-x.webp']);
    assert.strictEqual(r2.calls.filter(u => /Fiwra/.test(u)).length, 3);
    B = by();
    assert.ok(B['fish-s003-cand-fb-Fiwra_u0'].xc);
    assert.ok(!('bb' in B['fish-s001-cand-101']), 'its box gone: no tile');
    // Nothing new: nothing fetched, the same bytes.
    const before = fs.readFileSync(path.join(dir, 'fish-game.json'), 'utf8'),
      r3 = run(dir, path.join(dir, 'up3'));
    assert.deepStrictEqual([r3.done, r3.calls.length], [0, 0]);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'fish-game.json'), 'utf8'), before);
    // A changed box waits for the next run when the run's room is taken (limit): its old tile is not named meanwhile.
    judge({'fish-s001-cand-102': [0.1, 0.1, 0.95, 0.8], 'fish-s003-cand-fb-Fiwra_u0': [0, 0.05, 0.85, 0.95]});
    const r4 = run(dir, path.join(dir, 'up4'), 0);
    assert.deepStrictEqual([r4.done, r4.wait, r4.calls.length], [0, 2, 0]); // 107 too (refused at each download)
    assert.ok(!('bb' in by()['fish-s001-cand-102']) && !by()['fish-s001-cand-102'].xc, 'the changed box waits');
    fs.rmSync(dir, {recursive: true, force: true});
  }
);

// The boxes of the box passes (tools/fish_judge.json boxes; judging/FISH.md "The fish's box"): each a box inside the photo,
// as tools/fish_game.py box_ok reads it; a candidate's (judging/fish/<species>.json bb) is checked by
// tools/judging_fish.py --check.
test('tools/fish_judge.json boxes: [left, top, right, bottom] inside the photo', () => {
  const boxes = read('tools/fish_judge.json').boxes || {};
  Object.entries(boxes).forEach(([f, b]) =>
    assert.ok(
      Array.isArray(b) && b.length === 4 && b[0] >= 0 && b[1] >= 0 && b[0] < b[2] && b[1] < b[3] && b[2] <= 1 && b[3] <= 1,
      `${f}: ${b}`
    )
  );
  const bad = JSON.parse(
    py(
      `import fish_game as G\nprint(json.dumps([f for f, b in json.load(open('tools/fish_judge.json')).get('boxes', {}).items() if not G.box_ok(b)]))`
    )
  );
  assert.deepStrictEqual(bad, []);
  // A code with a crop is read on the photo as cropped (judging/FISH.md "A proposed crop"): the crop keeps the whole fish.
  const crops = read('tools/fish_judge.json').crops || {},
    cut = JSON.parse(
      py(`import fish_game as G
crops, boxes = json.loads(${JSON.stringify(JSON.stringify([crops, boxes]))})
print(json.dumps([f for f, c in crops.items() if f in boxes and not G.box_in(boxes[f], c)]))`)
    );
  assert.deepStrictEqual(cut, []);
});

// Q430 (Pierre, 2026-11-19: "J'ai toujours dit de mettre en jeu les suggestions, surtout si elles peuvent être corrigées à
// postériori"): a photo with a fish one could confuse near its edge plays once a crop takes that fish out. The judge codes
// the photo as cropped (one fish) and gives the crop: sure, it enters with the crop; a code still k stays out, crop or not
// (rule P3). box_in: the fish's box whole inside the crop, give or take a hair of the grid.
test('a crop that takes out the fish one could confuse: in play cropped; a code still k stays out (fish_game.py cand_sure)', () => {
  const j = n => ({jt: `p1g0sm${n}`, e: 4, k: 'best', c: [0, 0, 0.6, 1]});
  const got = JSON.parse(
    py(`import fish_game as G
print(json.dumps([G.cand_sure(j) for j in ${JSON.stringify(['1', 's', 'o', 'k', 'x'].map(j))}] +
                 [G.box_in([0.1, 0.2, 0.6, 0.8], [0, 0, 0.6, 1]), G.box_in([0.1, 0.2, 0.605, 0.8], [0, 0, 0.6, 1]),
                  G.box_in([0.1, 0.2, 0.65, 0.8], [0, 0, 0.6, 1])]))`)
  );
  assert.deepStrictEqual(got, [true, true, true, false, false, true, true, false]);
});

// A doubt on the fish's box only withholds the photo's tile; the candidate stays sure (in play by itself, proposed by
// the auto-sort) when nothing else is doubted; any other doubt keeps it out.
test('unsure bb: the tile withheld, the candidate still in play by itself (fish_game.py cand_sure, autosort.js treeSure)', () => {
  const {treeSure} = require('../autosort.js'),
    j = u => ({jt: 'p1g0sm1', e: 4, k: 'best', bb: [0.1, 0.1, 0.9, 0.9], ...(u ? {u} : {})}),
    cases = [null, ['bb'], ['code'], ['bb', 'crop']];
  const got = JSON.parse(
    py(`import fish_game as G
cases = ${JSON.stringify(cases.map(j))}
print(json.dumps([[G.cand_sure(c), G.box_of('f', {}, {'f': c})] for c in cases]))`)
  );
  assert.deepStrictEqual(got, [
    [true, [0.1, 0.1, 0.9, 0.9]],
    [true, null],
    [false, [0.1, 0.1, 0.9, 0.9]],
    [false, null]
  ]);
  assert.deepStrictEqual(
    cases.map(u => !!treeSure(j(u))),
    [true, true, false, false]
  );
});

// The R2 lists print nothing for none (tools/r2_sync.sh would read an empty line as a file), and the
// script skips an empty name anyway.
test('the R2 lists: no line for no photo or tile; r2_sync.sh skips an empty name', () => {
  const dir = mkTmp('r2list-');
  fs.mkdirSync(path.join(dir, 'tools'));
  // tools/photos.py and every tools module it imports at its top (tools/fish_short.py), so it runs from the copy.
  const src = fs.readFileSync(path.join(ROOT, 'tools/photos.py'), 'utf8'),
    mods = [...src.matchAll(/^import ([\w, ]+)/gm)].flatMap(m => m[1].split(',').map(x => x.trim()));
  ['photos', ...mods]
    .filter(m => fs.existsSync(path.join(ROOT, 'tools', m + '.py')))
    .forEach(m => fs.copyFileSync(path.join(ROOT, 'tools', m + '.py'), path.join(dir, 'tools', m + '.py')));
  assert.ok(fs.existsSync(path.join(dir, 'tools/fish_short.py')), 'photos.py imports tools/fish_short.py');
  fs.writeFileSync(path.join(dir, 'fish-game.json'), JSON.stringify({photos: {t01: [{f: 'a', src: INAT(1)}]}}));
  const out = k => execFileSync('python3', [path.join(dir, 'tools/photos.py'), k], {cwd: dir, encoding: 'utf8'});
  assert.strictEqual(out('--r2-tiles'), '');
  assert.strictEqual(out('--r2-list'), 'a\n');
  fs.rmSync(dir, {recursive: true, force: true});
  const sh = fs.readFileSync(path.join(ROOT, 'tools/r2_sync.sh'), 'utf8');
  assert.strictEqual((sh.match(/while read -r f; do \[ -z "\$f" \] \|\| printf/g) || []).length, 2);
  // The loop as the script writes it, under its own shell options: an empty line adds nothing and fails nothing.
  const r = execFileSync(
    'bash',
    ['-c', `set -euo pipefail; { printf '\\n' | while read -r f; do [ -z "$f" ] || printf '%s\\n' "$f-x.webp"; done; } | sort`],
    {
      encoding: 'utf8'
    }
  );
  assert.strictEqual(r, '');
});

// The tiles of photos already in play are fetched as the downloads are: FishBase's one at a time.
test('fish_game.py: the tile-only pass asks FishBase one photo at a time', {skip: !pil && 'Pillow missing'}, () => {
  const dir = world(),
    w = (f, o) => fs.writeFileSync(path.join(dir, f), JSON.stringify(o)),
    c = structuredClone(CAND),
    cur = structuredClone(CUR),
    fb = id => ({...c.cand.s003[0], f: `fish-s003-cand-fb-Fi${id}_u0`, src: `https://www.fishbase.de/images/species/Fi${id}_u0.jpg`});
  ['aa', 'bb', 'cc'].forEach(id => {
    c.cand.s003.push(fb(id));
    cur.fish.add[`fish-s003-cand-fb-Fi${id}_u0`] = 's003';
    cur.fish.tags = {...cur.fish.tags, [`fish-s003-cand-fb-Fi${id}_u0`]: 'p1g0sl1'};
  });
  w('data/fish-cand.json', c);
  w('curation.json', cur);
  fs.mkdirSync(path.join(dir, 'tools'));
  w('tools/fish_judge.json', {photos: {}});
  const S = `
import io, threading, time, fish_game as G
from PIL import Image
lock, live, top = threading.Lock(), [0], [0]
def get(url):
    if 'fishbase' in url:
        with lock:
            live[0] += 1; top[0] = max(top[0], live[0])
        time.sleep(0.05)
        with lock:
            live[0] -= 1
    b = io.BytesIO(); Image.new('RGB', (400, 300), (20, 90, 160)).save(b, 'JPEG'); return b.getvalue()
`;
  py(`${S}\nG.run(${JSON.stringify(path.join(dir, 'up1'))}, root=${JSON.stringify(dir)}, get=get, pause=0, workers=4)`);
  const boxes = Object.fromEntries(['aa', 'bb', 'cc', 'wra'].map(id => [`fish-s003-cand-fb-Fi${id}_u0`, [0, 0.05, 0.85, 0.95]]));
  w('tools/fish_judge.json', {photos: {}, boxes});
  const r = JSON.parse(
    py(`${S}\nG.run(${JSON.stringify(path.join(dir, 'up2'))}, root=${JSON.stringify(dir)}, get=get, pause=0, workers=4)
print(json.dumps({'top': top[0], 'tiles': sorted(f for f in __import__('os').listdir(${JSON.stringify(path.join(dir, 'up2'))}))}))`)
      .trim()
      .split('\n')
      .pop()
  );
  assert.strictEqual(r.top, 1, 'never two FishBase requests at once');
  assert.strictEqual(r.tiles.length, 4);
  fs.rmSync(dir, {recursive: true, force: true});
});

// fish-photos.json, written by the same run (no remote photo, the sheet-only photos on R2): its first photos are
// fish-game.json's records (on R2 already), at most FIRST per entry, the adults and the easiest first; a sheet-only
// photo still remote is downloaded in the four sizes like a game photo and listed without r (its src, the original,
// kept for the fallback; its credit, licence and observation exactly as they were); a species with a photo in play
// loses its sheet-only photo; a rerun with nothing new writes the same bytes.
const read2 = (dir, f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

// The first photos in core.js easyRank's order: the reference-level photos (core.js refLevel) before the rest, whatever
// their source flag, then the easiest; Pierre's cover and one photo per family before them. The fixture: ten ease-3
// photos of a FishBase main picture's kind (rep) and two ease-5 photos with the reference look, no rep, which an order by
// the rep flag would leave out of the eight.
test('fish_game.py first_photos: the reference-level photos first, as core.js easyRank; covers and families kept', () => {
  const rec = (f, sp, e, jt, k = {}) => ({f, sp, e, jt, ...k}),
    L = [
      ...Array.from({length: 10}, (_, i) => rec(`fish-s1-cand-${100 + i}`, 's1', 3, 'p1g0sm1r', {rep: 'fishbase'})),
      rec('fish-s2-cand-201', 's2', 5, 'p1g0sl1'),
      rec('fish-s2-cand-202', 's2', 5, 'p1g0sl1'),
      rec('fish-s1-cand-300', 's1', 2, 'p1g0sm1'), // his cover: first, whatever its ease
      rec('fish-s3-cand-400', 's3', 1, 'o1g1bm1') // the only photo of another family: kept
    ],
    fish = {
      families: [
        {id: 'f:A', species: ['s1', 's2']},
        {id: 'f:B', species: ['s3']}
      ]
    },
    cur = {fish: {genera: {'f:A': {cover: 'fish-s1-cand-300'}}}};
  const first = (L, cur) =>
    JSON.parse(
      py(
        `import fish_game as G
print(json.dumps(G.first_photos({'t52': json.loads(sys.argv[1])}, json.loads(sys.argv[2]), json.loads(sys.argv[3]))['t52']))`
          .replace('sys.argv[1]', JSON.stringify(JSON.stringify(L)))
          .replace('sys.argv[2]', JSON.stringify(JSON.stringify(cur)))
          .replace('sys.argv[3]', JSON.stringify(JSON.stringify(fish)))
      )
    ).map(p => p.f);
  const got = first(L, cur);
  // His cover on a juvenile: after the adults, unless he confirmed it (coverJ: autosort.js treeCoverJ).
  const LJ = L.map(p => (p.f === 'fish-s1-cand-300' ? {...p, jt: 'p1g0sm1j'} : p));
  assert.notStrictEqual(first(LJ, cur)[0], 'fish-s1-cand-300', 'a juvenile cover not confirmed: not first');
  const curJ = {fish: {genera: {'f:A': {cover: 'fish-s1-cand-300', coverJ: 'fi300'}}}};
  assert.strictEqual(first(LJ, curJ)[0], 'fish-s1-cand-300', 'confirmed (under either name): first');
  assert.strictEqual(got.length, 8);
  assert.deepStrictEqual(got.slice(0, 2), ['fish-s1-cand-300', 'fish-s3-cand-400'], 'his cover, then the other family');
  assert.deepStrictEqual(got.slice(2, 4), ['fish-s2-cand-201', 'fish-s2-cand-202'], 'the reference-level photos next');
  assert.ok(
    L.filter(p => C.refLevel(p)).every(p => got.includes(p.f)),
    'every reference-level photo kept (core.js refLevel agrees)'
  );
  assert.ok(!C.refLevel(L[0]) && C.refLevel(L[10]));
});
// A watermarked photo (judged flag w) after its unit's adults without one (the default cover avoids them: app.js
// seenCover reads the first photos until fish-game.json is in). Its units: the photo's
// genus and its family (fish.json). Three cases: a unit with an adult without one, a unit whose adults all carry one
// (order unchanged), and his ★ cover on a watermarked photo (first all the same, rule A1, with an adult without one of its
// unit among the first photos).
test('fish_game.py first_photos: a watermarked photo after its unit adults without one; his watermarked cover first', () => {
  const rec = (f, sp, e, jt) => ({f, sp, e, jt}),
    L = [
      rec('fish-s1-cand-1', 's1', 5, 'p1g0sl1w'), // genus g:A1: reference level, the easiest, watermarked
      rec('fish-s1-cand-2', 's1', 3, 'p1g0sm1'), // g:A1: its one adult without a watermark
      rec('fish-s1-cand-3', 's1', 5, 'p1g0sl1j'), // g:A1: a juvenile without one, never a cover: no help
      rec('fish-s2-cand-4', 's2', 5, 'p1g0sl1w'), // g:A2, all watermarked, in family f:A, which has one without
      rec('fish-s3-cand-6', 's3', 4, 'p1g0sl1w'), // no genus in fish.json: its family f:B, which has one without
      rec('fish-s3-cand-7', 's3', 2, 'p1g0sm1'),
      rec('fish-s4-cand-8', 's4', 5, 'p1g0sl1w'), // family f:C (genus g:C1): every photo watermarked
      rec('fish-s4-cand-9', 's4', 4, 'p1g0sl1w')
    ],
    fish = {
      families: [
        {id: 'f:A', species: ['s1', 's2']},
        {id: 'f:B', species: ['s3']},
        {id: 'f:C', species: ['s4']}
      ],
      species: [{id: 's1', genus: 'g:A1'}, {id: 's2', genus: 'g:A2'}, {id: 's3'}, {id: 's4', genus: 'g:C1'}]
    };
  const first = cur =>
    JSON.parse(
      py(
        `import fish_game as G
print(json.dumps(G.first_photos({'t11': json.loads(sys.argv[1])}, json.loads(sys.argv[2]), json.loads(sys.argv[3]))['t11']))`
          .replace('sys.argv[1]', JSON.stringify(JSON.stringify(L)))
          .replace('sys.argv[2]', JSON.stringify(JSON.stringify(cur)))
          .replace('sys.argv[3]', JSON.stringify(JSON.stringify(fish)))
      )
    ).map(p => p.f);
  const got = first({}),
    at = f => got.indexOf(f);
  // 1. A unit with an adult without a watermark: its watermarked photos after it, whatever their level and ease.
  assert.ok(at('fish-s1-cand-2') < at('fish-s1-cand-1'), 'g:A1: the photo without a watermark first');
  assert.ok(at('fish-s1-cand-2') < at('fish-s2-cand-4'), "f:A: the family's photo without a watermark before g:A2's");
  assert.ok(at('fish-s3-cand-7') < at('fish-s3-cand-6'), 'f:B (no genus): the photo without a watermark first');
  // 2. A unit whose adults all carry one: easyRank's order (the reference level first), never pushed back.
  assert.strictEqual(got[0], 'fish-s4-cand-8', "f:C's photos all watermarked: its reference-level photo leads");
  assert.ok(at('fish-s4-cand-9') < at('fish-s1-cand-1'), "f:C's second before the watermarked photos pushed back");
  // the leads, one per family, then the rest: none of them watermarked but f:C's
  assert.deepStrictEqual(got.slice(0, 4), ['fish-s4-cand-8', 'fish-s1-cand-2', 'fish-s3-cand-7', 'fish-s4-cand-9']);
  assert.strictEqual(got[got.length - 1], 'fish-s1-cand-3', 'the juvenile last');
  // 3. His ★ cover on a watermarked photo: first all the same (his choice, rule A1); his unit's photo without one still
  // among the first photos, for the default card.
  const mine = first({fish: {genera: {'g:A1': {cover: 'fi1'}}}}); // under its other name (core.js treePid)
  assert.strictEqual(mine[0], 'fish-s1-cand-1', 'his watermarked cover first');
  assert.ok(mine.includes('fish-s1-cand-2'), 'with the photo of his unit without a watermark');
  assert.deepStrictEqual(new Set(mine), new Set(L.map(p => p.f)), 'every photo kept (fewer than FIRST)');
});
test(
  'fish_game.py on a fixture: fish-photos.json, the first photos from the game list, the sheet-only photo on R2',
  {skip: !pil && 'Pillow missing'},
  () => {
    const dir = world(),
      out = path.join(dir, 'up'),
      sheet = {
        f: 'fi999',
        o: 'https://www.inaturalist.org/observations/9999',
        src: INAT(999),
        r: 1,
        a: '(c) Someone Else, some rights reserved (CC BY-NC)',
        lic: 'cc-by-nc',
        t: 'Fishus lumpii',
        sp: 's009',
        loc: 'world',
        use: 'ref',
        from: 'cover',
        rep: 'inaturalist',
        note: 'Filed under Fishus lumpii on iNaturalist.'
      },
      gone = {...sheet, f: 'fbFiwra_u0', sp: 's003', src: 'https://www.fishbase.de/images/species/Fiwra_u0.jpg', from: 'fishbase'};
    fs.writeFileSync(
      path.join(dir, 'fish-photos.json'),
      JSON.stringify({
        v: 1,
        built: '2026-11-06',
        stopgap: 'x',
        photos: {t01: [{...sheet, f: 'fi998', use: undefined}]},
        sheet: {s009: [sheet], s003: [gone]}
      })
    );
    const r = run(dir, out),
      G = C.treeGameRead(read2(dir, 'fish-game.json')),
      P = read2(dir, 'fish-photos.json');
    assert.strictEqual(r.done, 6, 'the five game photos and the sheet-only one');
    ['', '-m', '-s', '-t'].forEach(s => assert.ok(fs.existsSync(path.join(out, `fi999${s}.webp`)), s));
    assert.strictEqual(P.v, 2);
    assert.ok(!('stopgap' in P));
    // The first photos: the game's records themselves, the juvenile last, never a photo the game does not hold.
    assert.deepStrictEqual(Object.fromEntries(Object.entries(P.photos).map(([t, L]) => [t, L.map(p => p.f)])), {
      t01: ['fish-s001-cand-102', 'fish-s001-cand-101', 'fish-s002-cand-201'],
      t02: ['fish-s003-cand-fb-Fiwra_u0', 'fish-s001-cand-105']
    });
    Object.entries(P.photos).forEach(([t, L]) =>
      L.forEach(p =>
        assert.deepStrictEqual(
          p,
          G.photos[t].find(x => x.f === p.f),
          p.f
        )
      )
    );
    // The sheet-only photo: on R2 now (no r), every other field as it was; s003 has photos in play, so its own goes.
    assert.deepStrictEqual(Object.keys(P.sheet), ['s009']);
    const {r: _r, ...was} = sheet,
      {ar, ...now} = P.sheet.s009[0];
    assert.deepStrictEqual(now, was);
    assert.ok(ar > 0 && _r === 1);
    assert.ok(!JSON.stringify(P).includes('"r":1'), 'nothing remote left in the file');
    // Again with nothing new: nothing downloaded, the same bytes.
    const before = fs.readFileSync(path.join(dir, 'fish-photos.json'), 'utf8'),
      r2 = run(dir, path.join(dir, 'up2'));
    assert.strictEqual(r2.done, 0);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'fish-photos.json'), 'utf8'), before);
    fs.rmSync(dir, {recursive: true, force: true});
  }
);

// A temporary tree as the repository has it: the tools' and the admin's data live in data/.
function mkTmp(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(d, 'data'));
  return d;
}
