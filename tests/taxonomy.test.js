require('./slot.js').testGuard();
// tools/taxonomy.json, the build-time reference of names (Pierre, 2026-11-05, Q49: built from the taxonomy study's
// section 5, small form; "it must not weigh on the app": the app never loads it), refreshed by tools/taxonomy.py; the
// Corals of the World mapping of Plesiastrea versipora to P. peroni (Q50); the watch list (Q51). Needs python3, like
// the other checks; never asks the network (a stubbed WoRMS and iNaturalist for the build).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync, spawnSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const py = code =>
  JSON.parse(execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools')\n${code}`], {cwd: ROOT, encoding: 'utf8'}));
const T = read('tools/taxonomy.json');

test('taxonomy.json: the layout, and every data.json genus with its role and app wording (taxonomy.py --check)', () => {
  const r = spawnSync('python3', ['tools/taxonomy.py', '--check'], {cwd: ROOT, encoding: 'utf8'});
  assert.strictEqual(r.status, 0, r.stderr);
});

test('taxonomy.json: the shape of each record, small, and never loaded by the app', () => {
  assert.strictEqual(T.v, 1);
  const C = T.coral;
  assert.ok(C.refreshed.worms && C.refreshed.inat && C.refreshed.checklist, 'refreshed dates');
  const D = read('data.json');
  const all = [...Object.keys(D.gen), ...Object.keys(D.x.gen)];
  assert.deepStrictEqual(Object.keys(C.gen).sort(), all.sort());
  for (const [n, g] of Object.entries(C.gen)) {
    assert.ok(['slate', 'benthic', 'bonus', 'key'].includes(g.role), n);
    assert.ok(Number.isInteger(g.worms.id) && Array.isArray(g.worms.spp) && g.worms.st, `${n}: worms`);
    assert.ok(Number.isInteger(g.inat.id), `${n}: inat id`);
    assert.notStrictEqual(g.inat.act, false, `${n}: an inactive iNaturalist taxon`);
  }
  // Rule C1: the app wording is a verbatim copy, never a correction.
  for (const [n, g] of Object.entries(C.gen)) {
    const src = D.gen[n] || D.x.gen[n];
    assert.strictEqual(g.app.fam, src.fam, n);
    (g.app.imr || []).forEach(s => assert.ok((src.imr || []).includes(s), `${n}: ${s}`));
  }
  assert.ok(Object.keys(C.old).length >= 18, 'former genus names');
  for (const [k, r] of Object.entries(C.spp)) {
    assert.ok(r.now && Array.isArray(r.src) && r.src.length, k);
    if (r.iname) assert.notStrictEqual(r.iname, r.now, k);
  }
  // Small: about 50 KB of corals and 120 KB of fish (one record per fish.json species), build time only.
  const kb = fs.statSync(path.join(ROOT, 'tools/taxonomy.json')).size / 1024;
  assert.ok(kb < 220, `taxonomy.json is ${Math.round(kb)} KB`);
  // Build time only (Pierre, 2026-11-05): no app or admin file reads it, and the service worker does not keep it.
  const app = fs.readdirSync(ROOT).filter(f => /\.(js|html)$/.test(f));
  app.forEach(f => assert.ok(!fs.readFileSync(path.join(ROOT, f), 'utf8').includes('taxonomy.json'), `${f} reads taxonomy.json`));
});

// Step (d) (ROADMAP "Taxonomy reference"): the fish section, from fish.json, every species in the game or out.
test('taxonomy.json fish: every fish.json genus and species with its WoRMS and iNaturalist records; reports, never renames', () => {
  const F = T.fish,
    J = read('fish.json');
  assert.ok(F.refreshed.worms && F.refreshed.inat && F.refreshed.checklist, 'refreshed dates');
  assert.deepStrictEqual(Object.keys(F.gen).sort(), J.genera.map(g => g.name).sort());
  assert.deepStrictEqual(Object.keys(F.species).sort(), J.species.map(s => s.name).sort());
  for (const s of J.species) {
    const o = F.species[s.name];
    assert.strictEqual(o.app.id, s.id, s.name);
    assert.ok(Number.isInteger(o.worms.id) && o.worms.st, `${s.name}: worms`);
    assert.ok(Number.isInteger(o.inat.id), `${s.name}: inat`);
  }
  // A former combination, a lump, a spelling WoRMS has no record of: reported as flags, the name kept (rules C1, C5).
  assert.deepStrictEqual(F.species['Chromis agilis'].flags, ['WoRMS: unaccepted -> Pycnochromis agilis (genus)']);
  assert.match(F.species['Siganus margaritiferus'].flags.join('; '), /-> Siganus fuscescens \(species\)/);
  assert.ok(
    J.species.some(s => s.name === 'Chromis agilis'),
    'the game keeps its name'
  );
  // Rows only for names met, each resolving to a fish species' WoRMS name.
  const acc = new Set(Object.entries(F.species).map(([n, o]) => o.worms.now || n));
  for (const [k, r] of Object.entries(F.spp)) {
    assert.ok(acc.has(r.now) && r.src.length, k);
    if (r.iname) assert.notStrictEqual(r.iname, r.now, k);
  }
  // fish.json's own former combination is a row (src app), so photos named so are flagged too.
  assert.strictEqual(F.spp['Chromis agilis'].now, 'Pycnochromis agilis');
  assert.ok(F.spp['Chromis agilis'].src.includes('app'));
  assert.strictEqual(F.old.Concholabrus.worms.now, 'Cheilinus');
});

test('watch list (Q51): the four items, each with what the sources say now', () => {
  const W = T.coral.watch;
  assert.deepStrictEqual(
    W.map(w => w.id),
    ['favites', 'fungia-fungites', 'tubipora', 'cyphastrea-agassizi']
  );
  W.forEach(w => {
    assert.ok(w.what && T.refs[w.ref], `${w.id}: what and ref`);
    w.names.forEach(n => assert.ok(n in w.seen.worms && n in w.seen.inat, `${w.id}: ${n} not seen`));
    w.genera.forEach(g => assert.ok(T.coral.gen[g] && w.seen.spp[g], `${w.id}: genus ${g}`));
  });
});

test("Q50: Corals of the World's Plesiastrea versipora (Philippine lists) counts as P. peroni", () => {
  const C = read('tools/presence_checklists.json').cotw;
  assert.deepStrictEqual(C.names['Plesiastrea versipora'], ['Plesiastrea peroni']);
  assert.match(C.decided['Plesiastrea versipora'], /Juszkiewicz et al\. 2022/);
  const R = py(`from presence import listed
print(json.dumps([listed("coral", ["Plesiastrea peroni"]), listed("coral", ["Xus ignotus"])]))`);
  assert.deepStrictEqual(R, [true, false]);
  const row = T.coral.spp['Plesiastrea versipora'];
  assert.deepStrictEqual([row.now, row.by], ['Plesiastrea peroni', 'checklist']);
});

// A small made-up world answered by a stub, so the build runs without the network or the cache.
const STUB = `
import taxonomy as X
W = "https://www.marinespecies.org/rest/"
I = "https://api.inaturalist.org/v1/"
REC = {
  "Astrea": dict(AphiaID=1, scientificname="Astrea", valid_name="Astrea", status="accepted", rank="Genus", family="Merulinidae", phylum="Cnidaria", modified="2022-11-25T00:00:00Z"),
  "Pachyseris": dict(AphiaID=2, scientificname="Pachyseris", valid_name="Pachyseris", status="accepted", rank="Genus", family=FAM, phylum="Cnidaria", modified="2023-06-24"),
  "Phymastrea": dict(AphiaID=3, scientificname="Phymastrea", valid_name="Favites", status="junior subjective synonym", rank="Genus", family="Merulinidae", phylum="Cnidaria", modified="2022-11-25"),
  "Montastrea curta": dict(AphiaID=10, scientificname="Montastrea curta", valid_name="Astrea curta", valid_AphiaID=11, status="superseded combination", rank="Species", phylum="Cnidaria"),
  "Astrea curta": dict(AphiaID=11, scientificname="Astrea curta", valid_name="Astrea curta", status="accepted", rank="Species", phylum="Cnidaria"),
  "Plesiastrea versipora": dict(AphiaID=12, scientificname="Plesiastrea versipora", valid_name="Plesiastrea versipora", status="accepted", rank="Species", phylum="Cnidaria"),
  "Favites irregularis": dict(AphiaID=13, scientificname="Favites irregularis", valid_name="Favites irregularis", status="accepted", rank="Species", phylum="Cnidaria"),
}
KIDS = {1: [REC["Astrea curta"], dict(AphiaID=14, scientificname="Astrea solidior", valid_name="Pachyseris solidior", valid_AphiaID=15, status="superseded combination", rank="Species", phylum="Cnidaria")],
        2: [], 3: [dict(AphiaID=16, scientificname="Phymastrea curta", valid_name="Astrea curta", valid_AphiaID=11, status="superseded combination", rank="Species", phylum="Cnidaria")]}
G = [dict(id=503518, name="Astrea", is_active=True, ancestor_ids=[47534, 47532]), dict(id=520308, name="Pachyseris", is_active=True, ancestor_ids=[47534, 47532]),
     dict(id=900, name="Phymastrea", is_active=False, ancestor_ids=[47534, 47532], current_synonymous_taxon_ids=[901]), dict(id=901, name="Favites", is_active=True, ancestor_ids=[47534, 47532])]
S = [dict(id=600, name="Astrea curta", is_active=True, ancestor_ids=[47534, 47532, 503518]),
     dict(id=601, name="Phymastrea curta", is_active=False, ancestor_ids=[47534, 47532, 900], current_synonymous_taxon_ids=[600])]
calls = []
def get(u):
    calls.append(u)
    if u.startswith(W + "AphiaRecordsByNames"):
        names = [X.urllib.parse.unquote(p.split("=", 1)[1]) for p in u.split("?", 1)[1].split("&") if p.startswith("scientificnames")]
        return [[REC[n]] if n in REC else [] for n in names]
    if u.startswith(W + "AphiaSynonymsByAphiaID"):
        return [REC["Phymastrea"]] if "/1?" in u else None
    if u.startswith(W + "AphiaChildrenByAphiaID"):
        return KIDS[int(u.split("/")[-1].split("?")[0])]
    if u.startswith(I + "taxa?taxon_id=47532&rank=genus"):
        return {"results": G}
    if u.startswith(I + "taxa?taxon_id=47532&rank=species"):
        return {"results": S}
    if u.startswith(I + "taxa?q="):
        return {"results": []}
    if u.startswith(I + "taxa/"):
        fam = {503518: "Merulinidae", 520308: FAM}
        return {"results": [dict(id=int(i), ancestors=[dict(rank="family", name=fam[int(i)])]) for i in u.split("/")[-1].split(",")]}
    raise AssertionError(u)
INP = {"genera": {"Astrea": {"role": "slate", "app": {"fam": "Merulinidae", "imr": ["Septa alternate in size; formerly Montastrea / Phymastrea."]}},
                  "Pachyseris": {"role": "slate", "app": {"fam": "Agariciidae"}}},
       "photos": ["Astrea curta", "Astrea curtus"],
       "checklist": {"names": {"Montastrea curta": ["Astrea curta"], "Plesiastrea versipora": ["Plesiastrea peroni"]},
                     "decided": {"Plesiastrea versipora": "a decision"}, "date": "2026-11-04"}}
SUB = X.SUBJECTS["coral"]
def run(prev, dates):
    sec, rep = X.build(SUB, INP, get, prev, lambda: dates)
    ch = X.log_changes(sec, prev, max(d for d in sec["refreshed"].values() if d))
    return sec, rep, ch
PREV = {"old": {"Phymastrea": {}}, "watch": [{"id": "w", "names": ["Favites irregularis"], "genera": ["Astrea"]}]}
`;

test('taxonomy.py: a rerun on the same replies writes the same file and logs nothing new', () => {
  const R = py(`FAM = "Pachyseridae"
${STUB}
D = {"worms": "2026-11-05", "inat": "2026-11-05"}
a, rep, ch1 = run(PREV, D)
fa = X.render({"v": 1, "doc": "d", "refs": {}, "coral": a})
b, _, ch2 = run(json.loads(json.dumps(a)), D)
fb = X.render({"v": 1, "doc": "d", "refs": {}, "coral": b})
print(json.dumps({"same": fa == fb, "ch1": ch1, "ch2": ch2, "log": len(b["log"]), "gen": a["gen"], "old": a["old"], "spp": a["spp"],
                  "seen": a["watch"][0]["seen"], "rep": rep, "inat": [c for c in calls if c.startswith(I)][:4]}))`);
  assert.ok(R.same, 'the rerun wrote another file');
  assert.strictEqual(R.ch1.length, 1, 'the first build logs one line');
  assert.match(R.ch1[0], /^first build: 2 genera, 1 former genus names, 4 species rows, 1 watched items$/);
  assert.deepStrictEqual(R.ch2, []);
  assert.strictEqual(R.log, 1);
  // Rule C1: the app's family stays, the difference is a flag.
  assert.deepStrictEqual(R.gen.Pachyseris.app, {fam: 'Agariciidae'});
  assert.deepStrictEqual(R.gen.Pachyseris.flags, ['family: the app says Agariciidae, WoRMS Pachyseridae']);
  assert.deepStrictEqual(R.gen.Astrea.worms.spp, ['curta']);
  assert.deepStrictEqual(R.gen.Astrea.inat, {id: 503518, fam: 'Merulinidae'});
  assert.deepStrictEqual(R.old.Phymastrea, {
    worms: {id: 3, st: 'junior subjective synonym', now: 'Favites', mod: '2022-11-25'},
    inat: {id: 900, act: false, now: ['Favites']},
    into: {Astrea: 1}
  });
  // Moves across app genera, the checklist's renames and its decisions (not WoRMS's) become species rows.
  // A WoRMS move into an app genus is a row only when iNaturalist knows its old name (Astrea solidior: no).
  assert.deepStrictEqual(Object.keys(R.spp), ['Astrea curtus', 'Montastrea curta', 'Phymastrea curta', 'Plesiastrea versipora']);
  // A photo name in iNaturalist's spelling of a species WoRMS spells otherwise gets a row, not a warning.
  assert.deepStrictEqual(R.spp['Astrea curtus'], {now: 'Astrea curta', id: null, src: ['photo']});
  assert.deepStrictEqual(R.rep.photos, []);
  assert.deepStrictEqual(R.spp['Phymastrea curta'], {now: 'Astrea curta', id: 11, src: ['worms']});
  assert.deepStrictEqual(R.spp['Montastrea curta'], {now: 'Astrea curta', id: 11, src: ['cotw']});
  assert.deepStrictEqual(R.spp['Plesiastrea versipora'], {
    now: 'Plesiastrea peroni',
    id: null,
    src: ['cotw'],
    by: 'checklist',
    inat: false
  });
  assert.deepStrictEqual(R.rep.cotw, [], 'a decided mapping is not reported as a disagreement');
  assert.deepStrictEqual(R.seen.worms, {'Favites irregularis': 'accepted'});
  assert.deepStrictEqual(R.seen.inat, {'Favites irregularis': null});
  // iNaturalist in bulk (rule C7): the genera and species of the root in one call each.
  assert.ok(R.inat[0].includes('rank=genus') && R.inat[1].includes('rank=species'), R.inat.join('\n'));
});

test('taxonomy.py: a change at a source is logged, dated with the data', () => {
  const R = py(`FAM = "Agariciidae"
${STUB}
a, _, _ = run(PREV, {"worms": "2026-11-05", "inat": "2026-11-05"})
REC["Pachyseris"]["family"] = FAM = "Pachyseridae"
b, _, ch = run(json.loads(json.dumps(a)), {"worms": "2026-12-01", "inat": "2026-11-05"})
print(json.dumps({"ch": ch, "log": b["log"][-1]}))`);
  assert.deepStrictEqual(R.ch, [
    'gen Pachyseris flags: +family: the app says Agariciidae, WoRMS Pachyseridae',
    'gen Pachyseris inat.fam: Agariciidae -> Pachyseridae',
    'gen Pachyseris worms.fam: Agariciidae -> Pachyseridae'
  ]);
  assert.deepStrictEqual(R.log, {date: '2026-12-01', what: 'gen Pachyseris worms.fam: Agariciidae -> Pachyseridae'});
});

// Codex review #570: the dates of the data are read after the build fetched it, so a first run or a --refresh is
// dated with its own fetch, and an offline rerun keeps those dates.
test('taxonomy.py: the refreshed dates and the log are those of the fetch the build made', () => {
  const R = py(`FAM = "Pachyseridae"
${STUB}
D = {}
plain = get
def get(u):
    D["worms" if u.startswith(W) else "inat"] = "2026-12-01"
    return plain(u)
sec, _ = X.build(SUB, INP, get, PREV, lambda: dict(D))
ch = X.log_changes(sec, PREV, max(d for d in sec["refreshed"].values() if d))
print(json.dumps({"refreshed": sec["refreshed"], "log": sec["log"][0]["date"]}))`);
  assert.deepStrictEqual(R.refreshed, {worms: '2026-12-01', inat: '2026-12-01', checklist: '2026-11-04'});
  assert.strictEqual(R.log, '2026-12-01');
});

// Codex review #570: a candidate Pierre approved is served (curation.json genera[n].add, core.js applyCuration), so
// its species name is a photo name too.
// Every candidate, approved (data.json) or waiting (cand.json): the admin flags a candidate's name too (names.json).
test('taxonomy.py: the photo names include every candidate, approved or waiting', () => {
  const R = py(`import taxonomy as X
d = json.load(open("data.json")); w = json.load(open("cand.json"))
def names(c): return {" ".join(p["t"].split()[:2]) for ps in (c.get("cand") or {}).values() for p in ps
                      if len((p.get("t") or "").split()) >= 2 and p["t"].split()[1][:1].islower()}
a, b = names(d), names(w)
got = set(X.coral_inputs()["photos"])
print(json.dumps({"n": [len(a), len(b)], "missing": sorted((a | b) - got)}))`);
  assert.ok(R.n[0] > 0 && R.n[1] > 0, 'no candidate with a species name');
  assert.deepStrictEqual(R.missing, []);
});

test('taxonomy.py --offline never asks the network: a reply missing from the cache stops it, naming the URL', () => {
  const r = spawnSync(
    'python3',
    [
      '-c',
      `import sys; sys.path.insert(0, 'tools')\nimport taxonomy as X\nX.Net(offline=True, path='/nonexistent/cache.json').get('https://api.inaturalist.org/v1/taxa/1')`
    ],
    {cwd: ROOT, encoding: 'utf8'}
  );
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /--offline: not cached: https:\/\/api\.inaturalist\.org\/v1\/taxa\/1/);
});

// Second PR (ROADMAP "Taxonomy reference", Pierre 2026-11-05, Q49): the tools read the file, the admin its extract.
const {nameFlag} = require('../presence.js');

test('names.json: the admin extract, in step with taxonomy.json; the admin reads it, never taxonomy.json', () => {
  const N = read('names.json'),
    C = T.coral;
  assert.strictEqual(N.v, 1);
  assert.strictEqual(N.coral.date, [C.refreshed.worms, C.refreshed.inat].sort().pop());
  assert.deepStrictEqual(Object.keys(N.coral.sp), Object.keys(C.spp), 'every species row');
  for (const [k, r] of Object.entries(C.spp)) assert.strictEqual(N.coral.sp[k].now, r.now, k);
  // A former genus that is no longer a genus of its own; Favia or Montastraea (accepted, they only lost species) are not.
  assert.strictEqual(N.coral.gen.Symphyllia, 'Lobophyllia');
  assert.strictEqual(N.coral.gen.Phymastrea, 'Favites');
  ['Favia', 'Montastraea', 'Coscinaraea', 'Micromussa'].forEach(g => assert.ok(!(g in N.coral.gen), g));
  // Each genus's WoRMS AphiaID and family (the admin's Photos › Tree WoRMS view, admin-coraltree.js ctWormsOf), WoRMS's own
  // family, not the app's word: Pachyseris and Plerogyra sit elsewhere in the IMR lecture, Diploastrea's family is spelt
  // Diploastraeidae.
  assert.deepStrictEqual(Object.keys(N.coral.worms).sort(), Object.keys(C.gen).sort(), 'every genus');
  for (const [g, r] of Object.entries(C.gen)) assert.deepStrictEqual(N.coral.worms[g], {id: r.worms.id, fam: r.worms.fam}, g);
  assert.strictEqual(N.coral.worms.Pachyseris.fam, 'Pachyseridae');
  assert.strictEqual(N.coral.worms.Plerogyra.fam, 'Plerogyridae');
  assert.strictEqual(N.coral.worms.Diploastrea.fam, 'Diploastraeidae');
  // The admin loads every subject's section (one fetch), the first subject's for the corals' Tree.
  const A = fs.readFileSync(path.join(ROOT, 'admin.js'), 'utf8');
  assert.match(A, /SUBJECTS\.map\(S => side\('names\.json', S\.id\)/);
  assert.match(A, /NAMES = NAMEJ\[ADM0\.id\]/);
  // The fish section: its rows and former genera, no WoRMS map (the fish Tree reads fish.json ref).
  assert.deepStrictEqual(Object.keys(N.fish.sp), Object.keys(T.fish.spp));
  assert.ok(!('worms' in N.fish));
  assert.strictEqual(N.fish.gen.Concholabrus, 'Cheilinus');
  const kb = fs.statSync(path.join(ROOT, 'names.json')).size / 1024;
  assert.ok(kb < 40, `names.json is ${Math.round(kb)} KB`);
});

test('nameFlag on the fish photos: a former combination or an iNaturalist spelling WoRMS writes otherwise', () => {
  const N = read('names.json').fish;
  const photos = [...Object.values(read('fish-cand.json').cand || {}).flat(), ...Object.values(read('fish-game.json').photos || {}).flat()];
  const flagged = photos.filter(p => nameFlag(p, N));
  assert.ok(flagged.length > 0, 'no fish photo flagged');
  flagged.forEach(p => assert.ok(N.sp[p.t.split(' ').slice(0, 2).join(' ')] || N.gen[p.t.split(' ')[0]], p.f));
  assert.deepStrictEqual(nameFlag({t: 'Chromis agilis'}, N), {kind: 'former', now: 'Pycnochromis agilis'});
  assert.deepStrictEqual(nameFlag({t: 'Concholabrus fasciatus'}, N), {kind: 'spelling', now: 'Cheilinus fasciatus'});
  assert.strictEqual(nameFlag({t: 'Pycnochromis retrofasciatus'}, N), null, "WoRMS's own name");
});

// Step (d) (ROADMAP "Taxonomy reference"): a subject whose unit is the species (the fish) gets its section from its own
// file's AphiaIDs and iNaturalist taxa, through build_species. A small made-up world answered by a stub, no network.
const SPSTUB = `
import taxonomy as X
W = "https://www.marinespecies.org/rest/"
I = "https://api.inaturalist.org/v1/"
def rec(aid, name, valid=None, vid=None, st="accepted", rank="Species", fam=None):
    return dict(AphiaID=aid, scientificname=name, valid_name=valid or name, valid_AphiaID=vid or aid, status=st, rank=rank,
                phylum="Chordata", family=fam, modified="2024-01-02T00:00:00Z")
BYNAME = {"Aus bus": rec(100, "Aus bus", "Cus bus", 101, "superseded combination"), "Cus bus": rec(101, "Cus bus"),
          "Aus eus": rec(300, "Aus eus"), "Aus gus": rec(400, "Aus gus"), "Zus zus": rec(500, "Zus zus"),
          "Hus eus": rec(301, "Hus eus", "Aus eus", 300, "superseded combination"),
          "Aus": rec(10, "Aus", rank="Genus", fam="Pomacentridae"), "Hus": rec(11, "Hus", "Aus", 10, "unaccepted", "Genus"),
          "Snail": dict(rec(12, "Aus eus"), phylum="Mollusca")}
BYID = {101: rec(101, "Cus bus"), 200: rec(200, "Aus diii"), 300: rec(300, "Aus eus"), 400: rec(400, "Aus gus")}
ANC = [dict(id=1, name="Animalia", rank="kingdom"), dict(id=2, name="Chordata", rank="phylum"), dict(id=40, name="Pomacentridae", rank="family")]
def tax(i, name, act=True, cur=(), genus=(50, "Aus")):
    return dict(id=i, name=name, rank="species", is_active=act, current_synonymous_taxon_ids=list(cur),
                ancestor_ids=[1, 2, 40, genus[0], i], ancestors=[*ANC, dict(id=genus[0], name=genus[1], rank="genus")])
T = {1000: tax(1000, "Cus bus", genus=(51, "Cus")), 2000: tax(2000, "Aus dii"), 3000: tax(3000, "Aus eus", False, [3001]),
     3001: tax(3001, "Fus eus", genus=(60, "Fus")), 4000: tax(4000, "Aus gus"),
     50: dict(id=50, name="Aus", rank="genus", is_active=True, ancestors=ANC)}
calls = []
def get(u):
    calls.append(u)
    if u.startswith(W + "AphiaRecordsByNames"):
        names = [X.urllib.parse.unquote(p.split("=", 1)[1]) for p in u.split("?", 1)[1].split("&") if p.startswith("scientificnames")]
        return [[BYNAME[n], BYNAME["Snail"]] if n == "Aus eus" else [BYNAME[n]] if n in BYNAME else [] for n in names]
    if u.startswith(W + "AphiaRecordsByAphiaIDs"):
        return [BYID[int(p.split("=")[1])] for p in u.split("?", 1)[1].split("&") if int(p.split("=")[1]) in BYID]
    if u.startswith(I + "taxa?q=Hus"):
        return {"results": [dict(id=70, name="Hus", rank="genus", is_active=False, ancestor_ids=[1, 2, 40, 70], current_synonymous_taxon_ids=[50])]}
    if u.startswith(I + "taxa?q="):
        return {"results": []}
    if u.startswith(I + "taxa/"):
        return {"results": [T[int(i)] for i in u.split("/")[-1].split(",") if int(i) in T]}
    raise AssertionError(u)
SP = lambda sid, ref, inat, game=True, now=None: {"app": {"id": sid, "ref": ref, "inat": inat, **({"now": now} if now else {})}, "game": game}
INP = {"genera": {"Aus": {"role": "circle 1", "app": {"fam": "Pomacentridae"}}},
       "species": {"Aus bus": SP("s1", 101, 1000, now="Cus bus"), "Aus dii": SP("s2", 200, 2000, now="Aus diii"),
                   "Aus eus": SP("s3", 300, 3000), "Aus gus": SP("s4", 999, 4000, False)},
       "photos": {"Aus bus": ["s1"], "Cus bus": ["s1"], "Gus hus": ["s1"], "Zus zus": ["s3"]},
       "checklist": {"names": {"Hus eus": [], "Zus zus": [], "Aus gus": []}, "decided": {}, "date": "2026-11-04"}}
SUB = X.SUBJECTS["fish"]
def run(prev, dates):
    sec, rep = X.build_species(SUB, INP, get, prev, lambda: dates)
    ch = X.log_changes(sec, prev, max(d for d in sec["refreshed"].values() if d))
    return sec, rep, ch
`;

test('taxonomy.py build_species: WoRMS and iNaturalist names of each species, the rows met, a stable rerun', () => {
  const R = py(`${SPSTUB}
D = {"worms": "2026-11-15", "inat": "2026-11-15"}
a, rep, ch1 = run({}, D)
fa = X.render({"v": 1, "doc": "d", "refs": {}, "fish": a})
b, _, ch2 = run(json.loads(json.dumps(a)), D)
fb = X.render({"v": 1, "doc": "d", "refs": {}, "fish": b})
print(json.dumps({"same": fa == fb, "valid": json.loads(fa)["fish"] == b, "ch1": ch1, "ch2": ch2, "sec": a, "rep": rep,
                  "cls": X.classes(a, rep["game"]), "names": X.names_extract({"v": 1, "doc": "d", "fish": a})["fish"],
                  "kinds": [X.kind(*p) for p in (("Aus bus", "Aus bus"), ("Chaetodon rafflesi", "Chaetodon rafflesii"),
                            ("Acanthurus nigricaudus", "Acanthurus nigricauda"), ("Chromis retrofasciata", "Pycnochromis retrofasciatus"),
                            ("Siganus margaritiferus", "Siganus fuscescens"), ("Ostorhinchus apogonides", "Ostorhinchus apogonoides"))],
                  "inat": [c for c in calls if c.startswith(I)]}))`);
  assert.ok(R.same && R.valid, 'the rerun wrote another file, or render is not valid JSON of the section');
  assert.deepStrictEqual(R.ch1, ['first build: 1 genera, 4 species, 1 former genus names, 4 species rows, 0 watched items']);
  assert.deepStrictEqual(R.ch2, []);
  assert.deepStrictEqual(R.kinds, [null, 'spelling', 'spelling', 'genus', 'species', 'spelling']);
  const S = R.sec.species;
  // A former combination: WoRMS's record of the name as written, the accepted name and AphiaID beside it.
  assert.deepStrictEqual(S['Aus bus'].worms, {id: 100, st: 'superseded combination', now: 'Cus bus', acc: 101});
  assert.deepStrictEqual(S['Aus bus'].inat, {id: 1000, name: 'Cus bus'});
  assert.deepStrictEqual(S['Aus bus'].flags, ['WoRMS: superseded combination -> Cus bus (genus)']);
  // A spelling WoRMS has no record of: the AphiaID the file gives, marked not exact; iNaturalist keeps the file's spelling.
  assert.deepStrictEqual(S['Aus dii'].worms, {id: 200, st: 'accepted', now: 'Aus diii', exact: false});
  assert.deepStrictEqual(S['Aus dii'].flags, [
    "WoRMS: no record of this spelling; the file's AphiaID 200 is Aus diii",
    'iNaturalist: Aus dii (spelling of WoRMS Aus diii)'
  ]);
  // The homonym of another phylum is ignored; an inactive iNaturalist taxon points to the one it became.
  assert.deepStrictEqual(S['Aus eus'].worms, {id: 300, st: 'accepted'});
  assert.deepStrictEqual(S['Aus eus'].inat, {id: 3000, act: false, now: ['Fus eus']});
  assert.ok(S['Aus eus'].flags.includes('iNaturalist: Fus eus (genus of WoRMS Aus eus)'), S['Aus eus'].flags.join('; '));
  // A species out of the game is in the section too; the file's AphiaID behind WoRMS is reported as stale.
  assert.deepStrictEqual(S['Aus gus'].app, {id: 's4'});
  assert.ok(S['Aus gus'].flags.includes('stale: the file has Aus gus (999), WoRMS now Aus gus (400)'));
  assert.deepStrictEqual(R.sec.gen.Aus, {
    role: 'circle 1',
    app: {fam: 'Pomacentridae'},
    worms: {id: 10, st: 'accepted', fam: 'Pomacentridae', mod: '2024-01-02'},
    inat: {id: 50, fam: 'Pomacentridae'}
  });
  // Rows: the names met that resolve to a species of the file; iNaturalist's name of it when it differs.
  assert.deepStrictEqual(R.sec.spp, {
    'Aus bus': {now: 'Cus bus', id: 101, src: ['app', 'photo']},
    'Aus dii': {now: 'Aus diii', id: 200, src: ['app'], iname: 'Aus dii'},
    'Gus hus': {now: 'Cus bus', id: null, src: ['photo']},
    'Hus eus': {now: 'Aus eus', id: 300, src: ['checklist'], iname: 'Fus eus'}
  });
  // Zus zus: a photo of Aus eus that WoRMS accepts as another species: reported, no row.
  assert.deepStrictEqual(R.rep.photos, ['Zus zus: WoRMS Zus zus, a photo of Aus eus']);
  assert.deepStrictEqual(R.sec.old, {
    Hus: {worms: {id: 11, st: 'unaccepted', now: 'Aus', mod: '2024-01-02'}, inat: {id: 70, act: false, now: ['Aus']}}
  });
  // The report's classes, the species in the game only.
  assert.deepStrictEqual(Object.keys(R.cls.worms).sort(), ['genus', 'unknown']);
  assert.deepStrictEqual(R.cls.inat, {
    spelling: ['Aus dii: iNaturalist Aus dii, WoRMS Aus diii'],
    inactive: ['Aus eus: iNaturalist Fus eus, WoRMS Aus eus']
  });
  // names.json: rows and former genera, no WoRMS map (this subject's Tree reads its own file).
  assert.deepStrictEqual(R.names.gen, {Hus: 'Aus'});
  assert.ok(!('worms' in R.names));
  assert.deepStrictEqual(R.names.sp['Gus hus'], {now: 'Cus bus'});
  // iNaturalist in batches (rule C7): the species' taxa in one call, the genera above them read from those records.
  assert.match(R.inat[0], /taxa\/1000,2000,3000,4000$/);
});

test('names_extract / render_names: a made-up file, and --check fails when names.json lags', () => {
  const R = py(`import taxonomy as X, tempfile, os
o = {"v": 1, "doc": "d", "refs": {}, "coral": {"refreshed": {"worms": "2026-11-05", "inat": "2026-12-01", "checklist": "2026-11-04"},
  "gen": {"Astrea": {"worms": {"id": 7, "st": "accepted", "fam": "Merulinidae"}}, "Nowhere": {"worms": {}}}, "spp": {"Montastrea curta": {"now": "Astrea curta", "id": 11, "src": ["worms"]},
                     "Favites valenciennesi": {"now": "Favites valenciennesii", "id": None, "src": ["photo"], "iname": "Favites valenciennesi"},
                     "Euphyllia yaeyamaensis": {"now": "Fimbriaphyllia yaeyamaensis", "id": 3, "src": ["worms"], "inat": False}},
  "old": {"Phymastrea": {"worms": {"id": 3, "st": "junior subjective synonym", "now": "Favites", "mod": "x"}},
          "Favia": {"worms": {"id": 4, "st": "accepted", "now": "Favia", "mod": "x"}},
          "Tubastrea": {"inat": {"id": 5, "act": False, "now": ["Tubastraea"]}},
          "Indophyllia": {"inat": {"id": 6, "act": False}}},
  "watch": [], "log": []}}
e = X.names_extract(o)
txt = X.render_names(e)
d = tempfile.mkdtemp()
tp, np_ = os.path.join(d, "t.json"), os.path.join(d, "n.json")
open(tp, "w").write(X.render(o))
open(np_, "w").write(txt)
ok = [x for x in X.check(X.Path(tp), X.Path(np_)) if "names" in x or "n.json" in x]
open(np_, "w").write(txt.replace("Favites", "Favia"))
late = [x for x in X.check(X.Path(tp), X.Path(np_)) if "n.json" in x]
print(json.dumps({"e": e, "same": json.loads(txt) == e, "ok": ok, "late": late}))`);
  assert.ok(R.same, 'render_names writes valid JSON of the extract');
  assert.deepStrictEqual(R.e.coral, {
    date: '2026-12-01',
    sp: {
      'Montastrea curta': {now: 'Astrea curta'},
      'Favites valenciennesi': {now: 'Favites valenciennesii', iname: 'Favites valenciennesi'},
      'Euphyllia yaeyamaensis': {now: 'Fimbriaphyllia yaeyamaensis', inat: false}
    },
    gen: {Phymastrea: 'Favites', Tubastrea: 'Tubastraea'},
    // a genus with no WoRMS record is left out (the Tree's WoRMS view reports it)
    worms: {Astrea: {id: 7, fam: 'Merulinidae'}}
  });
  assert.deepStrictEqual(R.ok, []);
  assert.strictEqual(R.late.length, 1, 'a names.json out of step fails the check');
});

test('nameFlag: former names, moved genera and iNaturalist spellings; flags only', () => {
  const nm = {
    sp: {
      'Favites valenciennesi': {now: 'Favites valenciennesii', iname: 'Favites valenciennesi'},
      'Montastrea valenciennesi': {now: 'Favites valenciennesii', iname: 'Favites valenciennesi'},
      'Favites bestae': {now: 'Favites melicerum'},
      'Euphyllia yaeyamaensis': {now: 'Fimbriaphyllia yaeyamaensis', inat: false}
    },
    gen: {Symphyllia: 'Lobophyllia'}
  };
  assert.deepStrictEqual(nameFlag({t: 'Favites valenciennesi'}, nm), {kind: 'spelling', now: 'Favites valenciennesii'});
  assert.deepStrictEqual(nameFlag({t: 'Montastrea valenciennesi'}, nm), {
    kind: 'former',
    now: 'Favites valenciennesii',
    iname: 'Favites valenciennesi'
  });
  assert.deepStrictEqual(nameFlag({t: 'Favites bestae'}, nm), {kind: 'former', now: 'Favites melicerum'});
  assert.deepStrictEqual(nameFlag({t: 'Euphyllia yaeyamaensis'}, nm), {kind: 'former', now: 'Fimbriaphyllia yaeyamaensis', inat: false});
  assert.deepStrictEqual(nameFlag({t: 'Symphyllia radians'}, nm), {kind: 'genus', now: 'Lobophyllia'});
  assert.deepStrictEqual(nameFlag({t: 'Symphyllia'}, nm), {kind: 'genus', now: 'Lobophyllia'}, 'genus only');
  assert.deepStrictEqual(nameFlag({t: 'Favites bestae bestae'}, nm), {kind: 'former', now: 'Favites melicerum'}, 'a subspecies');
  assert.strictEqual(nameFlag({t: 'Favites pentagona'}, nm), null, 'a current name');
  assert.strictEqual(nameFlag({t: 'Favites'}, nm), null);
  assert.strictEqual(nameFlag({t: ''}, nm), null);
  assert.strictEqual(nameFlag({t: 'Favites bestae', imr: 1}, nm), null, 'IMR lecture photo');
  assert.strictEqual(nameFlag({t: 'Favites bestae', cf: 1}, nm), null, 'Coral Finder photo');
  assert.strictEqual(nameFlag({t: 'Favites bestae'}, {}), null, 'names.json not loaded');
  // On the real files: the photo names iNaturalist spells otherwise are flagged, and only what the extract knows.
  const N = read('names.json').coral,
    D = read('data.json');
  const photos = [
    ...Object.values({...D.gen, ...D.x.gen}).flatMap(g => [...Object.values(g.views || {}), ...Object.values(g.more || {})].flat()),
    ...Object.values(D.cand || {}).flat(),
    ...Object.values(read('cand.json').cand || {}).flat()
  ];
  const flagged = photos.filter(p => nameFlag(p, N));
  assert.ok(
    flagged.some(p => /^Favites valenciennesi\b/.test(p.t)),
    'a Favites valenciennesi photo carries its WoRMS spelling'
  );
  flagged.forEach(p => assert.ok(N.sp[p.t.split(' ').slice(0, 2).join(' ')] || N.gen[p.t.split(' ')[0]], p.f));
});

test('inat_taxon / aliases: the readers the tools use; an inactive taxon or an unknown genus gives none', () => {
  const R = py(`import taxonomy as X, tempfile, os
d = tempfile.mkdtemp(); p = X.Path(os.path.join(d, "t.json"))
p.write_text(json.dumps({"coral": {"gen": {"A": {"inat": {"id": 7}}, "B": {"inat": {"id": 8, "act": False}}, "C": {}},
  "spp": {"A bus": {"now": "A ba", "iname": "A bus"}, "D cus": {"now": "A cus"}}}}))
print(json.dumps({"taxa": [X.inat_taxon(g, "coral", p) for g in "ABCZ"], "fish": X.inat_taxon("A", "fish", p),
  "al": [X.aliases(n, "coral", p) for n in ("A bus", "D cus", "E fus")], "fishal": X.aliases("A bus", "fish", p)}))`);
  assert.deepStrictEqual(R.taxa, [7, null, null, null]);
  assert.strictEqual(R.fish, null, 'a subject the file does not hold yet');
  assert.deepStrictEqual(R.al, [['A bus', 'A ba'], ['D cus', 'A cus'], ['E fus']]);
  assert.deepStrictEqual(R.fishal, ['A bus']);
});

test('presence.py: checklist names matched through the species rows of taxonomy.json', () => {
  // Every Corals of the World name with a species row is listed under the name WoRMS accepts now and iNaturalist's
  // spelling of it, without a hand mapping in presence_checklists.json.
  const R = py(`import presence, taxonomy as X
C = json.load(open("tools/presence_checklists.json"))["cotw"]["names"]
spp = X.section("coral")["spp"]
rows = [(k, r) for k, r in spp.items() if k in C]
bad = [k for k, r in rows if not all(presence.listed("coral", [n]) for n in (r["now"], r.get("iname")) if n)]
# A former name that is a species row: listed through the name WoRMS accepts now.
former = [k for k, r in spp.items() if presence.listed("coral", [r["now"]]) and not presence.listed("coral", [k])]
print(json.dumps({"rows": len(rows), "bad": bad, "former": former, "no": presence.listed("coral", ["Xus ignotus"])}))`);
  assert.ok(R.rows > 100, `${R.rows} checklist rows`);
  assert.deepStrictEqual(R.bad, []);
  assert.deepStrictEqual(R.former, []);
  assert.strictEqual(R.no, false);
});
