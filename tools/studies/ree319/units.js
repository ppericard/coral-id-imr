// REE-319: the units of each subject as the app builds them, from the committed data files only (read-only; nothing
// is fetched or sent). The tree subjects (fish, sea slugs) as tests/reserve.test.js builds them (core.js treeGen,
// treePhotos under the subject's curation, app.js treeGenera); Pierre's ★ covers and featured photos (curation.json
// <subject> genera, by treePid) handed to reserveOf as covers, as the rated world's fish build does (app.js treeCurate
// is not run: an approximation, see the README). The corals as tools/ratedworld.js coralUnits builds them (app.js build:
// applyCuration, applyForms, applySlots), whose d is what app.js reserveOn(d) splits.
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const ROOT = path.join(__dirname, '..', '..', '..');
const C = require(path.join(ROOT, 'core.js'));
const cut = require(path.join(ROOT, 'tests', 'block.js'));
const RW = require(path.join(ROOT, 'tools', 'ratedworld.js'));

const json = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
let GENERA = null;
const treeGenera = () => {
  if (GENERA) return GENERA;
  const ctx = vm.createContext({...C, Math, Map, Set, Object, Array, JSON, String, Number});
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  return (GENERA = vm.runInContext('(' + cut(src, 'function treeGenera(', '\n}\n', {through: 1, file: 'app.js'}) + ')', ctx));
};

function treeUnits(id, files) {
  const S = C.subjectOf(id),
    F = json(files.f),
    ph = files.ph ? json(files.ph) : {photos: {}},
    gm = C.treeGameRead(json(files.gm)),
    cur = C.treeCur(S, json('curation.json')),
    X = treeGenera()(C.treeGen(F, C.treePhotos(ph.photos, gm.photos, cur), ph.sheet, C.unitRankOf(S)), F),
    pick = new Set(
      Object.values((cur && cur.fish && cur.fish.genera) || {})
        .flatMap(k => (k && typeof k === 'object' ? [k.cover, ...Object.values(k.feat || {}).flat()] : []))
        .filter(Boolean)
        .map(C.treePid)
    ),
    seen = new Set();
  X.covers = {};
  Object.values(X.gen).forEach(g =>
    Object.values(g.views || {})
      .flat()
      .forEach(p => {
        if (p && p.f && pick.has(C.treePid(p.f)) && !seen.has(p.f)) (seen.add(p.f), (X.covers['pick' + seen.size] = {f: p.f}));
      })
  );
  return X;
}

// subject: {X, kind} ; kind 'tree' or 'coral'
function subjects() {
  return {
    fish: {X: treeUnits('fish', {f: 'fish.json', ph: 'fish-photos.json', gm: 'fish-game.json'}), kind: 'tree'},
    seaslug: {X: treeUnits('seaslug', {f: 'seaslug.json', gm: 'seaslug-game.json'}), kind: 'tree'},
    coral: {X: RW.coralUnits().d, kind: 'coral'}
  };
}

module.exports = {ROOT, C, json, subjects};
