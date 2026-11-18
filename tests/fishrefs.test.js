require('./slot.js').testGuard();
// The units' reference photos from iNaturalist's taxon page (tools/fish_refs.py; judging/FISH.md "Reference photos").
// Every photo of the taxon page, the cover and each taxon photo, for every species, not only those whose observation is
// among the 200 most faved in the box; never a licence with "no derivatives" (ND), nor all rights reserved: only the
// licences the rules accept (CC0, CC BY, CC BY-NC). Until Q230 (out-of-zone photos, ROADMAP) is settled, a photo whose
// observation lies outside the Indo-West Pacific is listed (`away`), never taken. Offline: a stand-in for the network.
// Needs python3.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const py = code =>
  JSON.parse(
    execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools')\nimport fish_refs as FR\n${code}`], {
      cwd: ROOT,
      encoding: 'utf8'
    })
  );

// A stand-in for fetch_fish.Net: canned iNaturalist v2 replies, by a piece of the URL; every URL asked is kept.
const NET = `
class Net:
    def __init__(self, replies):
        self.c, self.refresh, self.offline, self.asked, self.R, self.urls = {}, False, False, set(), replies, []
    def fetch(self, url, keep):
        self.urls.append(url)
        for k, d in self.R:
            if k in url:
                return keep(d)
        return keep({"total_results": 0, "results": []})
HOST = "https://inaturalist-open-data.s3.amazonaws.com/photos/"
def ph(i, lic, host=HOST):
    return {"id": i, "url": f"{host}{i}/square.jpg", "lic": lic, "a": f"(c) Someone, some rights reserved ({lic.upper()})", "w": 3, "h": 2}
def obs(i, pids, loc="9.2,123.3", q="research", taxon=123):
    return {"id": i, "quality_grade": q, "location": loc, "place_ids": [6873], "captive": False, "user": {"login": "someone"},
            "taxon": {"id": taxon, "name": "Fishus fishii", "rank": "species", "min_species_taxon_id": taxon},
            "photos": [{"id": p} for p in pids], "annotations": []}
`;

test('taxon page: every licensed photo whose observation passes the rules, found outside the faved 200; never ND or SA', () => {
  const out = py(`${NET}
# The taxon page: the cover (its observation is not among the faved 200 in the box), five photos the licence rule sets
# aside, two of one observation in the Philippines and one in the Red Sea (found by their id window), one among the
# faved 200 anywhere.
T = {123: {"name": "Fishus fishii", "rank": "species", "photos": [
    ph(200000, "cc-by-nc"), ph(210000, "cc-by-nd"), ph(220000, "cc-by-nc-nd"), ph(230000, "cc-by-sa"), ph(240000, "cc-by-nc-sa"),
    ph(250000, "", "https://static.inaturalist.org/photos/"), ph(260000, "cc-by"), ph(270000, "cc0"), ph(280000, "cc-by"), ph(290000, "cc-by-nc")]}}
held = {"results": [obs(50000, [100000]), obs(160000, [300000])]}  # the faved 200 in the box: two other photos
win = {"results": [obs(100000, [200000]), obs(115000, [210000]), obs(120000, [220000]), obs(130000, [260000, 290000]),
                   obs(135000, [270000], loc="27.9,34.3")]}  # the Red Sea
fame = {"results": [obs(170000, [280000], loc="-8.5,115.5")]}  # Bali: in the box, but not among the box's faved 200
net = Net([("swlat=", held), ("order_by=votes", fame), ("id_above=", win)])
A = FR.anchors([FR.held(net, 123)])
away, audit = [], []
got = FR.pick(net, T, 123, {123}, None, A, away, audit)
print(json.dumps({"got": [[p["id"], o["id"], src] for p, o, src in got], "away": [[p["id"], FR.region(o)] for p, o, src in away],
                  "seen": sorted(p["id"] for p, o, src, v in audit),
                  "usable": [FR.usable(ph(1, l)) for l in ("cc0", "cc-by", "cc-by-nc", "cc-by-nd", "cc-by-nc-nd", "cc-by-sa", "cc-by-nc-sa", "pd", "")]}))`);
  // The cover and the Philippine photo are taken, in the taxon page's order, each with the observation that holds it.
  assert.deepStrictEqual(out.got, [
    [200000, 100000, 'cover'],
    [260000, 130000, 'taxon'],
    [280000, 170000, 'taxon'],
    // a second photo of one observation: listed too, the game takes it once judged no duplicate (tools/fish_game.py)
    [290000, 130000, 'taxon']
  ]);
  // The Red Sea photo passes every rule but the region (Q230 not settled): listed, not taken.
  assert.deepStrictEqual(out.away, [[270000, 'Red Sea']]);
  // ND, share-alike, all rights reserved and public domain marks are never looked up.
  assert.deepStrictEqual(out.seen, [200000, 260000, 270000, 280000, 290000]);
  assert.deepStrictEqual(out.usable, [true, true, true, false, false, false, false, false, false]);
});

test('the observation of a taxon photo: a narrow id window first, then a wider one; never a photo of another species', () => {
  const out = py(`${NET}
A = [(100000, 50000), (300000, 160000), (500000, 260000)]
print(json.dumps({"est": [FR.est(A, 200000), FR.est(A, 400000), FR.est([], 1)]}))`);
  // The estimate: the median observation id of the nearest known (photo id, observation id) pairs.
  assert.deepStrictEqual(out.est, [160000, 160000, null]);
  const two = py(`${NET}
far = {"results": [obs(40000, [200000])]}  # a photo added long after its observation was made: outside the narrow window
net = Net([("id_above=130000&", {"results": []}), ("id_above=0&", far)])
o = FR.obs_of(net, 123, 200000, [(100000, 160000)])
other = Net([("id_above=", {"results": [obs(160000, [200000], taxon=999)]})])
T = {123: {"photos": [ph(200000, "cc-by")]}}
print(json.dumps({"o": o["id"], "urls": len(net.urls), "other": FR.pick(other, T, 123, {123}, None, [(100000, 160000)])}))`);
  assert.deepStrictEqual(two, {o: 40000, urls: 2, other: []});
  // A window of more than 200 observations is read on from the last one read.
  const paged = py(`${NET}
page1 = {"total_results": 250, "results": [obs(130000 + i, [1000 + i]) for i in range(200)]}
page2 = {"total_results": 50, "results": [obs(130200 + i, [2000 + i]) for i in range(49)] + [obs(130250, [200000])]}
net = Net([("id_above=130199&", page2), ("id_above=130000&", page1)])
o = FR.obs_of(net, 123, 200000, [(100000, 160000)])
print(json.dumps({"o": o["id"], "urls": len(net.urls)}))`);
  assert.deepStrictEqual(paged, {o: 130250, urls: 2});
});

test('the regions of the photos left out pending Q230', () => {
  const out = py(`
pts = [(27.9, 34.3), (24.5, 52.0), (-4.6, 55.5), (4.2, 73.5), (20.8, -156.5), (-17.5, -149.8), (-18.1, 178.4),
       (34.6, 139.0), (-33.8, 151.3), (0.8, -90.3), (25.0, -80.0)]
print(json.dumps([FR.region({"loc": f"{a},{b}"}) for a, b in pts]))`);
  assert.deepStrictEqual(out, [
    'Red Sea',
    'Arabian Sea and the Gulfs',
    'Western Indian Ocean',
    'Maldives, Sri Lanka, Chagos',
    'Hawaii',
    'French Polynesia',
    'Fiji, Samoa, Tonga',
    'North of 30 N (Japan, Korea, China)',
    'South of 30 S',
    'Eastern Pacific',
    'Atlantic, Mediterranean, elsewhere'
  ]);
});

// Points the boxes once put in the wrong region: New Zealand, the Cook Islands, Kiritimati and the Marshall Islands read
// "Fiji, Samoa, central Pacific", a northern Maldives atoll "Arabian Sea", India's east coast "Maldives, Sri Lanka".
test('the regions: New Zealand, the Cook, Line and Marshall Islands, the Maldives each in their own', () => {
  const out = py(`
pts = [(-35.5, 174.7), (-29.3, -177.9), (-44.0, -176.5), (-21.2, -159.8), (-9.0, -158.0), (1.9, -157.4), (5.9, -162.1),
       (7.1, 171.2), (1.4, 173.0), (5.4, 72.9), (6.6, 73.1), (7.0, 80.0), (12.9, 80.3), (15.4, 73.8), (9.9, 76.2),
       (-17.8, 180.0), (-17.8, -179.9), (-18.1, 178.4), (-13.8, -171.8), (-21.1, -175.2), (-8.5, 179.2),
       (-31.5, 159.1), (-40.0, -150.0), (10.0, -140.0)]
print(json.dumps([FR.region({"loc": f"{a},{b}"}) for a, b in pts]))`);
  assert.deepStrictEqual(out, [
    'New Zealand and Kermadec Islands', // Auckland
    'New Zealand and Kermadec Islands', // Raoul Island, Kermadec
    'New Zealand and Kermadec Islands', // Chatham Islands, east of the dateline
    'Cook Islands', // Rarotonga
    'Cook Islands', // Penrhyn
    'Line and Phoenix Islands', // Kiritimati
    'Line and Phoenix Islands', // Palmyra
    'Marshall and Gilbert Islands', // Majuro
    'Marshall and Gilbert Islands', // Tarawa
    'Maldives, Sri Lanka, Chagos', // Raa Atoll (an away photo of Pseudanthias squamipinnis)
    'Maldives, Sri Lanka, Chagos', // Haa Dhaalu, the north of the Maldives
    'Maldives, Sri Lanka, Chagos', // Sri Lanka
    'Bay of Bengal', // Chennai
    'Arabian Sea and the Gulfs', // Goa: still the Arabian Sea
    'Arabian Sea and the Gulfs', // Kochi, Kerala: still the Arabian Sea
    'Fiji, Samoa, Tonga', // Fiji on the dateline (180 reads -180)
    'Fiji, Samoa, Tonga', // Fiji just east of it
    'Fiji, Samoa, Tonga', // Suva
    'Fiji, Samoa, Tonga', // Apia, Samoa
    'Fiji, Samoa, Tonga', // Nuku'alofa, Tonga
    'Fiji, Samoa, Tonga', // Funafuti, Tuvalu
    'South of 30 S', // Lord Howe Island
    'South of 30 S', // the open South Pacific
    'Central Pacific, elsewhere' // the open central Pacific
  ]);
  // --relabel: the stored list's regions again from its coordinates, the rest untouched.
  const doc = py(`
doc = {"away": {"s1": [{"f": "fi1", "reg": "Fiji, Samoa, central Pacific", "ll": [-35.5, 174.7]},
                       {"f": "fi2", "reg": "Red Sea", "ll": [27.9, 34.3]}]}}
print(json.dumps({"n": FR.relabel(doc), "doc": doc}))`);
  assert.deepStrictEqual(doc, {
    n: 1,
    doc: {
      away: {
        s1: [
          {f: 'fi1', reg: 'New Zealand and Kermadec Islands', ll: [-35.5, 174.7]},
          {f: 'fi2', reg: 'Red Sea', ll: [27.9, 34.3]}
        ]
      }
    }
  });
});

test('tools/fish_refs.json: no ND licence in play or listed; a photo left out pending Q230 is never a reference photo', () => {
  const R = read('tools/fish_refs.json'),
    taken = new Set(Object.values(R.photos).flatMap(L => L.map(p => p.f)));
  Object.values(R.photos).forEach(L => L.forEach(p => assert.ok(!/nd|sa/.test(p.lic), `${p.f}: licence ${p.lic}`)));
  assert.ok(R.away, 'the photos left out pending Q230 are listed');
  Object.entries(R.away).forEach(([sid, L]) =>
    L.forEach(p => {
      assert.ok(['cc0', 'cc-by', 'cc-by-nc'].includes(p.lic), `${sid} ${p.f}: licence ${p.lic}`);
      assert.ok(p.reg && !taken.has(p.f), `${sid} ${p.f}: out of the zone, not taken`);
    })
  );
});

// The genera the game has (the scientific genera of circles 2 and 3 are units too; core.js
// fishGenSets): every genus of a family in play with species of a circle, whatever its circle, never a surprise card's
// (wink) family's, read under the content editor's circles in force.
const FISH = `
F = {"families": [{"id": "f:A", "circle": 1, "genera": ["g:Alpha"]}, {"id": "f:B", "circle": 3, "genera": ["g:Beta", "g:Gamma"]},
                  {"id": "f:W", "circle": 1, "wink": {"right": "!"}, "genera": ["g:Wi"]}, {"id": "f:Z", "circle": 2, "genera": ["g:Zeta"]}],
     "genera": [{"id": "g:Alpha", "name": "Alpha", "family": "f:A", "species": ["s1"]},
                {"id": "g:Beta", "name": "Beta", "family": "f:B", "species": ["s2", "s3"]},
                {"id": "g:Gamma", "name": "Gamma", "family": "f:B", "species": ["s4"]},
                {"id": "g:Wi", "name": "Wi", "family": "f:W", "species": ["s5"]},
                {"id": "g:Zeta", "name": "Zeta", "family": "f:Z", "species": ["s6"]}],
     "species": [{"id": "s1", "name": "Alpha one", "inat": 101, "circle": 1, "family": "f:A"},
                 {"id": "s2", "name": "Beta two", "inat": 102, "circle": 3, "family": "f:B"},
                 {"id": "s3", "name": "Beta three", "inat": 103, "family": "f:B"},
                 {"id": "s4", "name": "Gamma four", "inat": 104, "family": "f:B"},
                 {"id": "s5", "name": "Wi five", "inat": 105, "circle": 1, "family": "f:W"},
                 {"id": "s6", "name": "Zeta six", "inat": 106, "circle": 2, "family": "f:Z"}],
     "teach": [{"id": "t1", "level": 1, "fam": "Alphidae", "species": ["s1"]}, {"id": "t2", "level": 1, "fam": "Betidae", "species": ["s2", "s3", "s4"]},
               {"id": "t3", "level": 1, "species": ["s5"]}, {"id": "t4", "level": 1, "species": ["s6"]}]}
from fish_inforce import in_force
L = in_force(F, {"fish": {"content": {"nodes": {"f:Z": {"circle": {"v": None}}}}}})  # the editor takes f:Z out of the game
`;

test('the genera the game has: every circle, never a surprise card family, a family out of the game none', () => {
  const out = py(`${FISH}
print(json.dumps({"base": FR.game_genera(F), "live": FR.game_genera(L)}))`);
  // Beta (circle 3) with its species of a circle only (s3 has none), Gamma none (no species of a circle), Wi never (wink).
  assert.deepStrictEqual(out.base, {s1: 'Alpha', s2: 'Beta', s6: 'Zeta'});
  assert.deepStrictEqual(out.live, {s1: 'Alpha', s2: 'Beta'});
});

test('--genera: only the genera with no reference photo yet, of one of their species of a circle; nothing else asked', () => {
  const out = py(`${NET}${FISH}
def tx(i, photos):
    return {"id": i, "name": "Beta", "rank": "genus", "default_photo": photos[0],
            "taxon_photos": [{"photo": p} for p in photos[1:]]}
def tph(i):
    return {"id": i, "url": f"{HOST}{i}/square.jpg", "license_code": "cc-by", "attribution": "(c) Someone, some rights reserved (CC BY)",
            "original_dimensions": {"width": 3, "height": 2}}
# Beta's cover is a photo of s3 (no circle: not a unit's species), its next taxon photo one of s2 (circle 3).
held = {"results": [obs(5000, [700000], taxon=103), obs(5001, [710000], taxon=102)]}
net = Net([("taxa?q=Beta&rank=genus", {"results": [{"id": 900, "name": "Beta", "rank": "genus"}]}),
           ("taxa/", {"results": [tx(900, [tph(700000), tph(710000)])]}), ("swlat=", held)])
photos, away, st = FR.build(net, F, (), L, done={"Alpha"})
print(json.dumps({"photos": {k: [[p["f"], p["for"], p["sp"]] for p in v] for k, v in photos.items()}, "genus": st["genus"],
                  "asked": [u.split("?")[0].rsplit("/", 1)[-1] + "?" + u.split("?")[1][:22] for u in net.urls]}))`);
  assert.deepStrictEqual(out.photos, {s2: [['fi710000', ['g:Beta'], 's2']]});
  assert.deepStrictEqual(out.genus, [1, 1]);
  // Alpha already has its photo, Zeta's family is out of the game, Wi is a surprise card's: none asked; no family or
  // species taxon either.
  assert.ok(!out.asked.some(u => /q=(Alpha|Zeta|Wi)|rank=family/.test(u)), out.asked.join(' '));
  assert.ok(out.asked.includes('900?per_page=30'), out.asked.join(' '));
});

test('--genera: the new genus photos join the file, the rest untouched, where a full run puts them', () => {
  const out = py(`
old = {"s1": [{"f": "fi1", "for": ["fam:Alphidae"]}, {"f": "fi2", "for": ["s1"]}], "s2": [{"f": "fi3", "for": ["s2"]}]}
new = {"s1": [{"f": "fi9", "for": ["g:Alpha"]}], "s2": [{"f": "fi3", "for": ["g:Beta"]}], "s7": [{"f": "fi7", "for": ["g:Eta"]}]}
out = FR.add_genera(old, new)
print(json.dumps({"out": {k: [[p["f"], p["for"]] for p in v] for k, v in out.items()}, "old": old["s2"][0]["for"]}))`);
  assert.deepStrictEqual(out.out, {
    s1: [
      ['fi1', ['fam:Alphidae']],
      ['fi9', ['g:Alpha']],
      ['fi2', ['s1']]
    ],
    s2: [['fi3', ['g:Beta', 's2']]],
    s7: [['fi7', ['g:Eta']]]
  });
  assert.deepStrictEqual(out.old, ['s2'], 'the file read is not changed in place');
});
