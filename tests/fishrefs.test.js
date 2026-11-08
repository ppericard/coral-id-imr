// The units' reference photos from iNaturalist's taxon page (tools/fish_refs.py; judging/FISH.md "Reference photos").
// Pierre, 2026-11-08 (Q229): every photo of the taxon page, the cover and each taxon photo, for every species, not only
// those whose observation is among the 200 most faved in the box; Q231: never a licence with "no derivatives" (ND), nor
// all rights reserved: only the licences the rules accept (CC0, CC BY, CC BY-NC). Q230 is open: a photo whose observation
// lies outside the Indo-West Pacific is listed (`away`), never taken. Offline: a stand-in for the network. Needs python3.
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
    // a second photo of one observation: listed too, the game takes it once judged no duplicate (Q218, tools/fish_game.py)
    [290000, 130000, 'taxon']
  ]);
  // The Red Sea photo passes every rule but the region (Q230 open): listed, not taken.
  assert.deepStrictEqual(out.away, [[270000, 'Red Sea']]);
  // ND, share-alike, all rights reserved and public domain marks are never looked up (Q231).
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
    'Fiji, Samoa, central Pacific',
    'North of 30 N (Japan, Korea, China)',
    'South of 30 S',
    'Eastern Pacific',
    'Atlantic, Mediterranean, elsewhere'
  ]);
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
