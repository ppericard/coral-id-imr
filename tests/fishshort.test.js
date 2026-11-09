// fish-game.json's short form (Pierre, 2026-11-09: "observation id + extension instead of full URLs"): tools/fish_short.py
// writes a record's iNaturalist observation as its id and its original as its extension when the photo is the record's
// own; core.js fishGameRead (the app, the admin, the sheet's photo pools, the tools) and tools/fish_short.py full_doc
// give the records back whole, the same records as the file held before, key order included.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync} = require('child_process');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  text = fs.readFileSync(path.join(ROOT, 'fish-game.json'), 'utf8'),
  G = JSON.parse(text);
const py = code =>
  execFileSync('python3', ['-c', 'import sys, json; sys.path.insert(0, "tools"); import fish_short as S\n' + code], {
    cwd: ROOT,
    maxBuffer: 1 << 28
  }).toString();

test('the app reads the records as the tools do: every record whole, the same as the Python reading', () => {
  const js = C.fishGameRead(G),
    pyFull = JSON.parse(py('print(json.dumps(S.full_doc(json.load(open("fish-game.json")))))'));
  assert.strictEqual(JSON.stringify(js), JSON.stringify(pyFull));
  const L = Object.values(js.photos).flat();
  assert.ok(L.length > 10000, `${L.length} records`);
  // Every record has its addresses whole again; most were short in the file.
  assert.ok(
    L.every(p => /^https:\/\//.test(p.o) && /^https:\/\//.test(p.src)),
    'a record left short'
  );
  const raw = Object.values(G.photos).flat();
  assert.ok(raw.filter(p => /^\d+$/.test(p.o)).length > 0.9 * raw.length, 'the file is in the short form');
});

test('short then whole gives the record back; a whole record (the file before) is read as it is', () => {
  // The file is written in the short form: writing its whole records again gives the same text.
  assert.strictEqual(py('import fish_game as G\nsys.stdout.write(G.dumps(S.full_doc(json.load(open("fish-game.json")))))'), text);
  const whole = C.fishGameRead(G);
  assert.strictEqual(JSON.stringify(C.fishGameRead(whole)), JSON.stringify(whole), 'reading a whole file again changes nothing');
  Object.values(whole.photos)
    .flat()
    .slice(0, 500)
    .forEach(p => assert.strictEqual(C.fishGameRow(p), p, p.f));
  // FishBase and a photo filed under another id keep their addresses whole; an iNaturalist one is short.
  const recs = [
    {
      f: 'fish-s001-cand-123',
      o: 'https://www.inaturalist.org/observations/9',
      src: 'https://inaturalist-open-data.s3.amazonaws.com/photos/123/original.jpeg',
      a: 'x'
    },
    {
      f: 'fish-s001-cand-123',
      o: 'https://www.inaturalist.org/observations/9',
      src: 'https://inaturalist-open-data.s3.amazonaws.com/photos/124/original.jpg'
    },
    {f: 'fish-s001-cand-fb-Abc_u0', o: 'https://www.fishbase.se/photos/x', src: 'https://www.fishbase.se/images/species/Abc_u0.jpg'},
    {
      f: 'fi77',
      o: 'https://www.inaturalist.org/observations/5',
      src: 'https://inaturalist-open-data.s3.amazonaws.com/photos/77/original.png'
    }
  ];
  const short = JSON.parse(py(`recs = json.loads(${JSON.stringify(JSON.stringify(recs))})\nprint(json.dumps([S.short(p) for p in recs]))`));
  assert.deepStrictEqual(
    short.map(p => [p.o, p.src]),
    [
      ['9', 'jpeg'],
      ['9', 'https://inaturalist-open-data.s3.amazonaws.com/photos/124/original.jpg'],
      ['https://www.fishbase.se/photos/x', 'https://www.fishbase.se/images/species/Abc_u0.jpg'],
      ['5', 'png']
    ]
  );
  short.forEach((p, i) => assert.strictEqual(JSON.stringify(C.fishGameRow(p)), JSON.stringify(recs[i])));
});

test("the sheet's photo pools are the same from the short file, even before its script reads it whole", () => {
  // core.js unitPool groups a unit's photos by observation (String(p.o || p.f)): an observation's id groups them as its
  // address did, so a sheet script from before this change (no fishGameRead) gives the same pools from the new file.
  const group = L => {
    const O = {};
    L.forEach(p => (O[String(p.o || p.f)] = O[String(p.o || p.f)] || []).push(p.f));
    return Object.values(O)
      .map(x => x.join(','))
      .sort();
  };
  const whole = C.fishGameRead(G);
  Object.keys(G.photos).forEach(t => assert.deepStrictEqual(group(G.photos[t]), group(whole.photos[t]), t));
  const S = C.subjectOf('fish'),
    files = ['fish.json', 'fish-photos.json', 'fish-game.json', 'curation.json'].map(f =>
      JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'))
    ),
    before = [...files];
  before[2] = whole;
  assert.deepStrictEqual(C.unitPool(S, files), C.unitPool(S, before));
});
