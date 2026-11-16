require('./slot.js').testGuard();
// The licence refresh (tools/licences.py): the licence and the credit of every iNaturalist photo listed, read again from
// iNaturalist (an author can change them, in either direction: Pierre moved all his photos to CC BY on 2026-11-15) and
// brought up to date in place, no field added; a photo whose new licence the rules refuse leaves play and is reported
// (fish: tools/fetch_fish.py lic_ok; corals: tools/fetch_local.py LICS, share-alike kept in play for Pierre, rule P1).
// Offline: a made-up fixture, iNaturalist answered by a stub (never the real API). Needs python3.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const py = code =>
  JSON.parse(
    execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools')\nimport licences as L\n${code}`], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 << 20
    })
  );

const OBS = 'https://www.inaturalist.org/observations/';
const SRC = i => `https://inaturalist-open-data.s3.amazonaws.com/photos/${i}/original.jpg`;
const BY = (n, l) => `(c) ${n}, some rights reserved (${l})`;
// A candidate (fish-cand.json, cand.json shape) of photo i on observation o.
const cand = (f, i, o, a, lic, extra = {}) => ({
  f,
  a,
  lic,
  o: OBS + o,
  t: 'Fishus fishii',
  own: false,
  loc: 'ph',
  src: SRC(i),
  r: 1,
  ...extra
});
// A fish game record (fish-game.json shape, written whole: the tool reads either form).
const game = (f, i, o, a, lic, extra = {}) => ({
  f,
  o: OBS + o,
  src: SRC(i),
  a,
  lic,
  t: 'Fishus fishii',
  sp: 's001',
  loc: 'ph',
  e: 4,
  jt: 'p1g0sl14',
  ar: 1.5,
  ...extra
});

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'licences-'));
  const w = (f, d) => {
    fs.mkdirSync(path.dirname(path.join(dir, f)), {recursive: true});
    fs.writeFileSync(path.join(dir, f), JSON.stringify(d));
  };
  const pierre = BY('Pierre Pericard', 'CC BY-NC');
  w('fish-cand.json', {
    v: 1,
    cand: {
      s001: [
        cand('fish-s001-cand-11', 11, 101, pierre, 'cc-by-nc', {own: true}), // more open: CC BY
        cand('fish-s001-cand-12', 12, 102, BY('Ann', 'CC BY'), 'cc-by'), // stricter, still accepted: CC BY-NC
        cand('fish-s001-cand-13', 13, 103, BY('Bob', 'CC BY-NC'), 'cc-by-nc'), // ND: leaves
        cand('fish-s001-cand-14', 14, 104, BY('Cy', 'CC BY'), 'cc-by'), // share-alike: leaves (fish)
        cand('fish-s001-cand-15', 15, 105, BY('Di', 'CC BY'), 'cc-by'), // all rights reserved: leaves
        cand('fish-s001-cand-16', 16, 106, BY('Pierre Pericard', 'CC BY'), 'cc-by', {own: true}), // his own, no licence: stays
        cand('fish-s001-cand-17', 17, 107, BY('Ed', 'CC BY'), 'cc-by'), // observation gone: untouched
        cand('fish-s001-cand-fb-Abc_u0', 0, 0, '(c) FishBase', 'cc-by-nc', {
          o: 'https://www.fishbase.se/x',
          src: 'https://www.fishbase.se/images/species/Abc_u0.jpg'
        })
      ]
    }
  });
  w('tools/fish_refs.json', {
    _doc: ['made up'],
    photos: {
      s001: [
        {
          f: 'fi18',
          o: OBS + 108,
          src: SRC(18),
          r: 1,
          a: 'no rights reserved, no rights reserved (CC0)',
          lic: 'cc0',
          t: 'Fishus fishii',
          sp: 's001',
          loc: 'world',
          rep: 'inaturalist',
          from: 'taxon',
          for: ['s001']
        },
        {
          f: 'fi13',
          o: OBS + 103,
          src: SRC(13),
          r: 1,
          a: BY('Bob', 'CC BY-NC'),
          lic: 'cc-by-nc',
          t: 'Fishus fishii',
          sp: 's001',
          loc: 'world',
          rep: 'inaturalist',
          from: 'taxon',
          for: ['s001']
        }
      ]
    },
    away: {}
  });
  w('fish-game.json', {
    v: 1,
    built: '2026-11-01',
    about: 'made up',
    photos: {
      t01: [
        game('fish-s001-cand-11', 11, 101, pierre, 'cc-by-nc', {own: true}),
        game('fish-s001-cand-12', 12, 102, BY('Ann', 'CC BY'), 'cc-by', {auto: 'cand'}),
        game('fish-s001-cand-13', 13, 103, BY('Bob', 'CC BY-NC'), 'cc-by-nc', {auto: 'cand'}),
        game('fi18', 18, 108, 'no rights reserved, no rights reserved (CC0)', 'cc0', {auto: 'ref', rep: 'inaturalist', from: 'taxon'})
      ]
    }
  });
  w('fish-photos.json', {
    v: 2,
    built: '2026-11-01',
    about: 'made up',
    photos: {t01: [game('fish-s001-cand-11', 11, 101, pierre, 'cc-by-nc', {own: true})]},
    sheet: {s002: [{...game('fi19', 19, 109, BY('Fay', 'CC BY'), 'cc-by'), sp: 's002', r: 1}]}
  });
  w('data.json', {
    gen: {
      acropora: {
        views: {
          wide: [
            {
              f: 'acropora-wide-21',
              a: BY('Gus', 'CC BY'),
              lic: 'cc-by',
              o: OBS + 201,
              t: 'Acropora',
              own: false,
              src: SRC(21),
              loc: 'dauin'
            }, // share-alike: stays, reported
            {
              f: 'acropora-wide-22',
              a: BY('Hal', 'CC BY'),
              lic: 'cc-by',
              o: OBS + 202,
              t: 'Acropora',
              own: false,
              src: SRC(22),
              loc: 'dauin'
            }, // ND: leaves
            {f: 'imrl-p1_i1', a: 'IMR lecture', imr: 1, t: 'Acropora'}
          ]
        }
      }
    }
  });
  w('cand.json', {cand: {acropora: [cand('acropora-cand-23', 23, 203, BY('Ivy', 'CC BY'), 'cc-by')]}}); // all rights reserved: leaves
  w('excluded.json', {
    photos: {
      'acropora-wide-24': {
        in: 'gen',
        g: 'acropora',
        k: 'views',
        v: 'wide',
        i: 0,
        p: {f: 'acropora-wide-24', a: BY('Jo', 'CC BY'), lic: 'cc-by', o: OBS + 204, t: 'Acropora', own: false, src: SRC(24), loc: 'dauin'}
      },
      'acropora-wide-25': {
        in: 'gen',
        g: 'acropora',
        k: 'views',
        v: 'wide',
        i: 1,
        p: {f: 'acropora-wide-25', a: BY('Lu', 'CC BY'), lic: 'cc-by', o: OBS + 205, t: 'Acropora', own: false, src: SRC(25), loc: 'dauin'}
      }
    }
  });
  w('curation.json', {});
  w('fish.json', {families: [{id: 'f1', species: ['s001', 's002']}]});
  return dir;
}

// What iNaturalist answers, by observation: [login, [[photo id, licence code, attribution]]]. 107 is gone.
const WORLD = {
  101: ['ppericard', [[11, 'cc-by', BY('Pierre Pericard', 'CC BY')]]],
  102: ['ann', [[12, 'cc-by-nc', BY('Ann', 'CC BY-NC')]]],
  103: ['bob', [[13, 'cc-by-nd', BY('Bob', 'CC BY-ND')]]],
  104: ['cy', [[14, 'cc-by-sa', BY('Cy', 'CC BY-SA')]]],
  105: ['di', [[15, null, '(c) Di, all rights reserved']]],
  106: ['ppericard', [[16, null, '(c) Pierre Pericard, all rights reserved']]],
  108: ['kim', [[18, 'cc0', 'no rights reserved']]],
  109: ['fay', [[19, 'cc-by', BY('Fay', 'CC BY') + ', uploaded by Fay']]],
  201: ['gus', [[21, 'cc-by-sa', BY('Gus', 'CC BY-SA')]]],
  202: ['hal', [[22, 'cc-by-nc-nd', BY('Hal', 'CC BY-NC-ND')]]],
  203: ['ivy', [[23, null, '(c) Ivy, all rights reserved']]],
  204: ['jo', [[24, 'cc-by-nd', BY('Jo', 'CC BY-ND')]]],
  205: ['lu', [[25, 'cc-by-sa', BY('Lu', 'CC BY-SA')]]]
};
const STUB = `
import re
WORLD = json.loads(${JSON.stringify(JSON.stringify(WORLD))})
ASKED = []
def get(url, missing=False, timeout=None):
    assert url.startswith('https://api.inaturalist.org/v2/observations?id='), url
    ids = re.search(r'id=([0-9,]+)', url).group(1).split(',')
    ASKED.append(ids)
    if FAIL:
        raise OSError('the network is down')
    return {'total_results': len(ids), 'results': [{'id': int(i), 'user': {'login': WORLD[i][0]},
            'photos': [{'id': p, 'license_code': c, 'attribution': a} for p, c, a in WORLD[i][1]]} for i in ids if i in WORLD]}
`;
const run = (dir, {fail = false, write = true, summary = null, own = true} = {}) =>
  py(`FAIL = ${fail ? 'True' : 'False'}
${STUB}
LOG = []
try:
    r = L.run(root=${JSON.stringify(dir)}, get=get, write=${write ? 'True' : 'False'}, summary=${summary ? JSON.stringify(summary) : 'None'},
              log=LOG.append, own=${own ? 'True' : 'False'})
    out = {k: (dict(v) if hasattr(v, 'items') else v) for k, v in r.items()}
except OSError as e:
    out = {'error': str(e)}
out['asked'] = ASKED
out['log'] = LOG
print(json.dumps(out))`);
const read = (dir, f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const files = dir =>
  Object.fromEntries(
    ['fish-cand.json', 'tools/fish_refs.json', 'fish-game.json', 'fish-photos.json', 'data.json', 'cand.json', 'excluded.json'].map(f => [
      f,
      fs.readFileSync(path.join(dir, f), 'utf8')
    ])
  );
const ofs = L => (L || []).map(p => p.f);

test('a photo made more open, or stricter but still accepted: its credit and licence follow, everywhere it is listed', () => {
  const dir = fixture(),
    r = run(dir);
  const fc = read(dir, 'fish-cand.json').cand.s001,
    by = Object.fromEntries(fc.map(p => [p.f, p]));
  assert.strictEqual(by['fish-s001-cand-11'].lic, 'cc-by');
  assert.strictEqual(by['fish-s001-cand-11'].a, '(c) Pierre Pericard, some rights reserved (CC BY)');
  assert.strictEqual(by['fish-s001-cand-12'].lic, 'cc-by-nc');
  assert.strictEqual(by['fish-s001-cand-12'].a, '(c) Ann, some rights reserved (CC BY-NC)');
  // The game record follows its source (tools/fish_game.py record copies a and lic: the next run agrees), short form kept.
  const g = Object.fromEntries(read(dir, 'fish-game.json').photos.t01.map(p => [p.f, p]));
  for (const f of ['fish-s001-cand-11', 'fish-s001-cand-12']) {
    assert.strictEqual(g[f].lic, by[f].lic);
    assert.strictEqual(g[f].a, by[f].a);
  }
  assert.strictEqual(g['fish-s001-cand-11'].o, '101', 'fish-game.json stays in its short form');
  // fish-photos.json: its first photos again from fish-game.json, its sheet-only photo's credit cut after the licence.
  const fp = read(dir, 'fish-photos.json');
  assert.strictEqual(fp.photos.t01.find(p => p.f === 'fish-s001-cand-11').lic, 'cc-by');
  assert.strictEqual(fp.sheet.s002[0].a, BY('Fay', 'CC BY'), 'wording alone never rewrites a credit');
  assert.deepStrictEqual(r.opener, {'fish-cand.json': 1, 'fish-game.json': 1});
  // Stricter: CC BY to CC BY-NC (12), his own CC BY to no licence (16, which stays: lic own), a coral photo to share-alike
  // (21, which stays in play) and an excluded one to share-alike (25, which stays excluded, restorable for Pierre).
  assert.deepStrictEqual(r.stricter, {'fish-cand.json': 2, 'fish-game.json': 1, 'data.json': 1, 'excluded.json': 1});
  assert.deepStrictEqual(r.nc[0]['fish-game.json'], 1);
  assert.deepStrictEqual(r.nc[1]['fish-game.json'], 0);
  assert.deepStrictEqual(r.nc[1]['fish-photos.json'], 0);
});

test("the weekly run (--others) leaves Pierre's own photos out: not asked, not changed; the others still follow", () => {
  const dir = fixture(),
    r = run(dir, {own: false});
  const by = Object.fromEntries(read(dir, 'fish-cand.json').cand.s001.map(p => [p.f, p]));
  assert.strictEqual(by['fish-s001-cand-11'].lic, 'cc-by-nc', 'his own photo is left as it is');
  assert.strictEqual(by['fish-s001-cand-12'].lic, 'cc-by-nc', "another author's change still follows");
  assert.ok(!r.asked.flat().includes('101'), 'his observation is not asked');
});

test('a fish photo whose licence the rules refuse leaves every fish list and is reported; his own without a licence stays', () => {
  const dir = fixture(),
    r = run(dir);
  const fc = ofs(read(dir, 'fish-cand.json').cand.s001);
  for (const f of ['fish-s001-cand-13', 'fish-s001-cand-14', 'fish-s001-cand-15']) assert.ok(!fc.includes(f), f);
  assert.ok(!ofs(read(dir, 'tools/fish_refs.json').photos.s001).includes('fi13'), 'its reference photo too');
  assert.ok(!ofs(read(dir, 'fish-game.json').photos.t01).includes('fish-s001-cand-13'), 'out of play');
  const own = read(dir, 'fish-cand.json').cand.s001.find(p => p.f === 'fish-s001-cand-16');
  assert.strictEqual(own.lic, 'own', "Pierre's own without a licence (tools/fetch_fish.py lic_ok)");
  assert.deepStrictEqual(
    r.left.map(x => x.slice(0, 2)).sort(),
    [
      ['data.json', 'acropora-wide-22'],
      ['cand.json', 'acropora-cand-23'],
      ['excluded.json', 'acropora-wide-24'],
      ['fish-cand.json', 'fish-s001-cand-13'],
      ['fish-cand.json', 'fish-s001-cand-14'],
      ['fish-cand.json', 'fish-s001-cand-15'],
      ['fish-game.json', 'fish-s001-cand-13'],
      ['tools/fish_refs.json', 'fi13']
    ].sort()
  );
});

test('corals: share-alike stays in play for Pierre (reported), "no derivatives" or all rights reserved leaves; excluded photos too, which Restore would bring back', () => {
  const dir = fixture(),
    r = run(dir);
  const wide = read(dir, 'data.json').gen.acropora.views.wide;
  assert.deepStrictEqual(ofs(wide), ['acropora-wide-21', 'imrl-p1_i1'], 'the IMR lecture photo untouched');
  assert.strictEqual(wide[0].lic, 'cc-by-sa');
  assert.deepStrictEqual(r.sa, [['data.json', 'acropora-wide-21', 'cc-by-sa']]);
  assert.deepStrictEqual(read(dir, 'cand.json').cand, {}, 'a genus left with no candidate is not listed');
  // excluded.json: tools/excluded.py restore_unexcluded checks no licence, so a refused one leaves it (Codex review #936);
  // a share-alike one stays for his Restore, its licence brought up to date (rule P1: his to keep).
  const ex = read(dir, 'excluded.json').photos;
  assert.deepStrictEqual(Object.keys(ex), ['acropora-wide-25']);
  assert.strictEqual(ex['acropora-wide-25'].p.lic, 'cc-by-sa');
  assert.ok(r.left.some(x => x[0] === 'excluded.json' && x[1] === 'acropora-wide-24'));
  assert.ok(!r.sa.some(x => x[0] === 'excluded.json'), 'out of play: not reported as share-alike');
});

test('no answer is not a licence: a photo iNaturalist no longer returns stays as it is, reported; FishBase is never asked', () => {
  const dir = fixture(),
    r = run(dir);
  const p = read(dir, 'fish-cand.json').cand.s001.find(x => x.f === 'fish-s001-cand-17');
  assert.strictEqual(p.lic, 'cc-by');
  assert.deepStrictEqual(r.missing, [['fish-cand.json', 'fish-s001-cand-17', 'observation gone']]);
  assert.ok(ofs(read(dir, 'fish-cand.json').cand.s001).includes('fish-s001-cand-fb-Abc_u0'));
  assert.ok(!r.asked.flat().includes('0'));
  assert.strictEqual(r.asked.length, 1, 'one batch');
});

test('a request that fails writes nothing; --dry writes nothing; a second run changes nothing', () => {
  const dir = fixture(),
    before = files(dir);
  assert.match(run(dir, {fail: true}).error, /network/);
  assert.deepStrictEqual(files(dir), before);
  run(dir, {write: false});
  assert.deepStrictEqual(files(dir), before);
  run(dir);
  const once = files(dir);
  assert.notDeepStrictEqual(once, before);
  const r = run(dir);
  assert.deepStrictEqual(files(dir), once);
  assert.deepStrictEqual(r.changed, {});
  assert.deepStrictEqual(r.left, []);
});

test('batches of 200 observations a request', () => {
  const r = py(`
calls = []
def get(url, missing=False, timeout=None):
    calls.append(url.split('id=')[1].split('&')[0].count(',') + 1)
    return {'results': []}
L.fetch([str(i) for i in range(1, 451)], get)
print(json.dumps(calls))`);
  assert.deepStrictEqual(r, [200, 200, 50]);
});

test("a record's observation and photo: every address form the files hold, http included; none for IMR or FishBase", () => {
  const r = py(`print(json.dumps([L.ids(p) for p in [
    {'f': 'pocillopora-wide-2237523', 'a': 'x', 'o': 'http://www.inaturalist.org/observations/1841398',
     'src': 'http://static.inaturalist.org/photos/2237523/original.jpg'},
    {'f': 'fish-s084-cand-527402743', 'a': 'x', 'o': '293039135', 'src': 'jpg'},
    {'f': 'fi296664069', 'a': 'x', 'o': 'https://www.inaturalist.org/observations/170993320', 'src': 'jpeg'},
    {'f': 'acropora-wide-12c', 'a': 'x', 'o': 'https://www.inaturalist.org/observations/9', 'src': ''},
    {'f': 'imrl-p1_i1', 'a': 'IMR', 'imr': 1},
    {'f': 'fbAbc_u0', 'a': 'x', 'o': 'https://www.fishbase.se/photos/x', 'src': 'https://www.fishbase.se/images/species/Abc_u0.jpg'}]]))`);
  assert.deepStrictEqual(r, [['1841398', '2237523'], ['293039135', '527402743'], ['170993320', '296664069'], ['9', '12'], null, null]);
});

test("every fish game record left carries its source's credit and licence (tools/fish_game.py record: the next run agrees)", () => {
  const dir = fixture();
  run(dir);
  const src = {};
  for (const L of Object.values(read(dir, 'fish-cand.json').cand)) for (const p of L) src[p.f] = p;
  for (const L of Object.values(read(dir, 'tools/fish_refs.json').photos)) for (const p of L) src[p.f] ||= p;
  const game = Object.values(read(dir, 'fish-game.json').photos).flat();
  assert.strictEqual(game.length, 3);
  for (const p of game) assert.deepStrictEqual([p.a, p.lic], [src[p.f].a, src[p.f].lic], p.f);
});

test('the workflow report: the summary lists what left play, each one also a warning on the run', () => {
  const dir = fixture(),
    sum = path.join(dir, 'summary.md'),
    r = run(dir, {summary: sum});
  const md = fs.readFileSync(sum, 'utf8');
  assert.match(md, /^### Licence refresh: /);
  assert.match(md, /Left play \(licence the rules refuse\): 8/);
  assert.match(md, /fish-game\.json: fish-s001-cand-13 \(cc-by-nc -> cc-by-nd\)/);
  assert.match(md, /Pierre's photos credited CC BY-NC: .*fish-game\.json 1 -> 0/);
  const warn = r.log.filter(l => l.startsWith('::warning '));
  assert.strictEqual(warn.length, 8);
  assert.match(warn.join('\n'), /cand\.json: acropora-cand-23 is now all rights reserved \(was cc-by\)/);
});

// The sea slugs' candidates (seaslug-cand.json, tools/fetch_seaslugs.py: keyed by iNaturalist taxon id) follow the fish's
// rule (CC0, CC BY, CC BY-NC; Pierre's own without a licence): a candidate whose licence turns refused leaves the file,
// share-alike included (unlike a coral photo in play), and is reported; a species left with none is not listed.
test('sea slugs: seaslug-cand.json follows the fish licence rule; a refused candidate leaves the file and is reported', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'licences-slug-'));
  const slug = (k, i, o, a, lic, extra = {}) => cand(`seaslug-${k}-cand-${i}`, i, o, a, lic, {t: 'Slugus slugii', ...extra});
  fs.writeFileSync(
    path.join(dir, 'seaslug-cand.json'),
    JSON.stringify({
      v: 1,
      cand: {
        900: [
          slug(900, 31, 301, BY('Mo', 'CC BY-NC'), 'cc-by-nc'), // more open: CC BY
          slug(900, 32, 302, BY('Ned', 'CC BY'), 'cc-by'), // share-alike: leaves
          slug(900, 33, 303, BY('Pierre Pericard', 'CC BY'), 'cc-by', {own: true}) // his own, no licence: stays
        ],
        901: [slug(901, 34, 304, BY('Oz', 'CC BY'), 'cc-by')] // no derivatives: leaves, and the species with it
      }
    })
  );
  const get = `
WORLD = {'301': ('mo', 31, 'cc-by', '(c) Mo, some rights reserved (CC BY)'), '302': ('ned', 32, 'cc-by-sa', '(c) Ned, some rights reserved (CC BY-SA)'),
         '303': ('ppericard', 33, None, '(c) Pierre Pericard, all rights reserved'), '304': ('oz', 34, 'cc-by-nd', '(c) Oz, some rights reserved (CC BY-ND)')}
def get(url, missing=False, timeout=None):
    import re
    ids = re.search(r'id=([0-9,]+)', url).group(1).split(',')
    return {'results': [{'id': int(i), 'user': {'login': WORLD[i][0]}, 'photos': [{'id': WORLD[i][1], 'license_code': WORLD[i][2], 'attribution': WORLD[i][3]}]} for i in ids if i in WORLD]}`;
  const sum = path.join(dir, 'summary.md');
  const r = py(`${get}
LOG = []
r = L.run(root=${JSON.stringify(dir)}, get=get, summary=${JSON.stringify(sum)}, log=LOG.append)
print(json.dumps({'left': r['left'], 'opener': dict(r['opener']), 'stricter': dict(r['stricter']), 'asked': r['asked'], 'log': LOG}))`);
  const C = read(dir, 'seaslug-cand.json');
  assert.deepStrictEqual(Object.keys(C.cand), ['900'], 'a species left with no candidate is not listed');
  const by = Object.fromEntries(C.cand['900'].map(p => [p.f, p]));
  assert.deepStrictEqual(Object.keys(by), ['seaslug-900-cand-31', 'seaslug-900-cand-33']);
  assert.deepStrictEqual([by['seaslug-900-cand-31'].lic, by['seaslug-900-cand-31'].a], ['cc-by', BY('Mo', 'CC BY')]);
  assert.strictEqual(by['seaslug-900-cand-33'].lic, 'own', "Pierre's own without a licence stays, as for the fish");
  assert.strictEqual(r.asked, 4);
  assert.deepStrictEqual(r.opener, {'seaslug-cand.json': 1});
  assert.deepStrictEqual(r.stricter, {'seaslug-cand.json': 1});
  assert.deepStrictEqual(r.left.sort(), [
    ['seaslug-cand.json', 'seaslug-900-cand-32', 'cc-by', 'cc-by-sa'],
    ['seaslug-cand.json', 'seaslug-901-cand-34', 'cc-by', 'cc-by-nd']
  ]);
  assert.match(fs.readFileSync(sum, 'utf8'), /Left play \(licence the rules refuse\): 2/);
  assert.strictEqual(r.log.filter(l => l.startsWith('::warning ') && l.includes('seaslug-cand.json: seaslug-')).length, 2);
  // One species per line, as tools/fetch_seaslugs.py writes it (tools/datajson.py dump).
  assert.match(fs.readFileSync(path.join(dir, 'seaslug-cand.json'), 'utf8'), /^"900":\[/m);
  fs.rmSync(dir, {recursive: true, force: true});
});
