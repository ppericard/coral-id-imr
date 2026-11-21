require('./slot.js').testGuard();
// The tree engine's names (docs/ARCHITECTURE.md "Subjects"): the code every tree subject runs through (the fish, the sea
// slugs) is named tree*, never fish*; fish* names are kept for what only the fish have (the IMR fish presentation,
// FishBase, the winks, the fish rules versions and achievements). The table below is the rename's: a retired name may
// not come back in the code, so a branch cut before the rename fails here until it uses the new names. And the engine
// tells the flat subject from the tree ones by a capability (SUBJECTS flat), never by comparing a pool file's name.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');

const ROOT = path.join(__dirname, '..');
// The core.js tree engine: retired everywhere (the admin, the sheet script, the tools and the tests included).
const CORE = {
  fishVarTable: 'treeVarTable',
  fishLookSrc: 'treeLookSrc',
  fishGlOf: 'treeGlOf',
  fishGenUnits: 'treeGenUnits',
  fishGenSets: 'treeGenSets',
  fishGen: 'treeGen',
  fishReplayGen: 'treeReplayGen',
  fishSpUnits: 'treeSpUnits',
  fishBoardTree: 'treeBoardTree',
  fishStructure: 'treeStructure',
  fishOn: 'treePhotoOn',
  FISH_COUNT: 'TREE_COUNT',
  fishCount: 'treeCount',
  fishOther: 'treeOther',
  fishGone: 'treeGone',
  fishIn: 'treePhotoIn',
  fishPid: 'treePid',
  FISH_OBS: 'TREE_OBS',
  FISH_ORIG: 'TREE_ORIG',
  fishGameRow: 'treeGameRow',
  fishGameRead: 'treeGameRead',
  fishPhotos: 'treePhotos',
  fishObs: 'treeObs',
  fishNames: 'treeNames',
  fishTypeNames: 'treeTypeNames',
  fishNameIndex: 'treeNameIndex',
  fishTree: 'treeSheets',
  fishScoreTree: 'treeScoreTree'
};
// The player app's tree state and builders (app.js, learn.js): retired everywhere too; the admin's files cite them in
// comments only.
const APP = {
  FISH: 'TREEU',
  FISHP: 'TREEP',
  FISHH: 'TREEH',
  FISHRAW: 'TREERAW',
  FISHF: 'TREEF',
  FISHST: 'TREEST',
  FISHON: 'TREEON',
  fishBuild: 'treeBuild',
  fishCurate: 'treeCurate',
  fishGenera: 'treeGenera',
  fishTaxon: 'treeTaxon',
  fishSeen: 'treeSeen',
  fishSpPick: 'treeSpPick',
  fishGate: 'treeGate',
  fishSpPhotos: 'treeSpPhotos',
  fishRoot: 'treeRoot',
  fishGenusLooks: 'treeGenusLooks',
  fishGenusLooksOn: 'treeGenusLooksOn',
  fishGo: 'treeGo',
  fishFamily: 'treeFamily',
  fishGenus: 'treeGenus',
  fishNote: 'treeNote',
  fishBind: 'treeBind',
  fishShown: 'treeShown',
  fishBar: 'treeBar',
  fishPic: 'treePic',
  fishTiles: 'treeTiles',
  fishGenusRow: 'treeGenusRow',
  fishGenusLookCard: 'treeGenusLookCard'
};
// The tree sheets' helpers of learn.js: retired in the player app's own scripts. The admin keeps functions of its own
// under some of the old names (admin.js fishTile, fishFamOf; autosort.js fishMine, fishSpecies), so the admin's files and
// the tests are not read for these, nor core.js, whose comments cite them until its next change (rule D3).
const LEARN = {
  fishMine: 'treeMine',
  fishFamOf: 'treeFamOf',
  fishTile: 'treeTile',
  fishSpecies: 'treeSpecies',
  fishMarks: 'treeMarks',
  viewFishSheet: 'viewTreeSheet'
};
const learnScope = f => /^(?:proto\/)?[\w-]+\.js$/.test(f) && !/^(?:admin|autosort\.js$|core\.js$)/.test(f);
// Every JS file of the repo and the sheet script, as paths from the root.
const files = (() => {
  const out = [],
    skip = new Set(['.git', 'node_modules', 'worktrees', '.cache']);
  const walk = d => {
    for (const e of fs.readdirSync(path.join(ROOT, d), {withFileTypes: true})) {
      if (skip.has(e.name)) continue;
      const p = d ? d + '/' + e.name : e.name;
      if (e.isDirectory()) walk(p);
      else if (/\.(js|gs)$/.test(e.name)) out.push(p);
    }
  };
  walk('');
  return out;
})();

// A word as code names it: not part of a longer name nor a file's name (judging/FISH.md).
const word = n =>
  new RegExp('(?<![\\w$])' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w$])(?!\\.(?:md|json|js|py|html|css|gs)\\b)');
// A rules version's text (why:) is history and keeps the names it was written with.
const lines = src => src.split('\n').filter(l => !/^\s*why:\s*['"`]/.test(l));
// A test or tool with a FISH of its own (the fish subject, a fixture) is not the app's global; the app's own files never
// have one.
const ownFish = (f, src) => /^(tests|tools)\//.test(f) && /(?:const|let|var)\s+FISH\s*=/.test(src);

test('the tree engine keeps its tree* names: no retired fish* name comes back', () => {
  const me = 'tests/treenames.test.js',
    bad = [];
  for (const f of files) {
    if (f === me) continue;
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8'),
      names = [
        ...Object.keys(CORE),
        ...Object.keys(APP).filter(n => n !== 'FISH' || !ownFish(f, src)),
        ...(learnScope(f) ? Object.keys(LEARN) : [])
      ],
      L = lines(src);
    for (const n of names) {
      const w = word(n),
        at = L.findIndex(l => w.test(l));
      if (at >= 0) bad.push(`${f}: ${n} (now ${CORE[n] || APP[n] || LEARN[n]})`);
    }
  }
  assert.deepStrictEqual(bad, [], 'a retired fish* name of the tree engine is back: use its tree* name');
});

test('the new names exist where the code declares them', () => {
  const core = fs.readFileSync(path.join(ROOT, 'core.js'), 'utf8'),
    app = ['app.js', 'learn.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  for (const n of Object.values(CORE)) assert.ok(word(n).test(core), `core.js declares ${n}`);
  for (const n of Object.values(APP)) assert.ok(word(n).test(app), `app.js or learn.js declares ${n}`);
  for (const n of Object.values(LEARN)) assert.ok(word(n).test(app), `learn.js declares ${n}`);
  // the scope of the learn.js table: the player app's scripts, never the admin's (whose own functions keep those names)
  assert.ok(['learn.js', 'app.js', 'quiz.js', 'reports.js', 'proto/fishbasics.js'].every(learnScope));
  assert.ok(!['admin.js', 'admin-fish.js', 'autosort.js', 'core.js', 'tests/fishunits.test.js'].some(learnScope));
  const C = require('../core.js');
  for (const n of ['treeGen', 'treePhotos', 'treeGameRead', 'treeReplayGen', 'treePid', 'treeSheets'])
    assert.strictEqual(typeof C[n], 'function', `core.js exports ${n}`);
});

test('the flat subject is a capability (SUBJECTS flat), never a pool file compared by name', () => {
  const C = require('../core.js');
  const flat = C.SUBJECTS.filter(S => S.flat).map(S => S.id);
  assert.deepStrictEqual(
    flat,
    C.SUBJECTS.filter(S => S.pool.files[0] === 'data.json').map(S => S.id),
    'flat is the data.json subject'
  );
  assert.strictEqual(flat.length, 1, 'one flat subject');
  const bad = files
    .filter(f => !f.startsWith('tests/') && !f.startsWith('tools/'))
    .filter(f => /files\[0\]\s*===?\s*['"]data\.json['"]/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
  assert.deepStrictEqual(bad, [], 'the engine asks SUBJECTS flat, never a pool file by its name');
});

// The admin's auto-sort of the tree subjects' candidates (autosort.js): retired everywhere but core.js and its copy in
// the sheet script (their comments cite them until core.js's next change, rule D3) and the files with a function of their
// own under the old name (AUTOSORT_OWN). The fish's winks keep theirs (fishWinkFold).
const AUTOSORT = {
  FISHCOV_TODO: 'TREECOV_TODO',
  FISHEASY: 'TREEEASY',
  FISHFEAT: 'TREEFEAT',
  FISHK: 'TREEK',
  FISHT: 'TREET',
  FISHW: 'TREEW',
  FISH_TAGS: 'TREE_TAGS',
  fishAdd: 'treeAdd',
  fishAgree: 'treeAgree',
  fishAt: 'treePhotoAt',
  fishCandTodo: 'treeCandTodo',
  fishCompare: 'treeCompare',
  fishCopy: 'treeCopy',
  fishCov: 'treeCov',
  fishCovTodo: 'treeCovTodo',
  fishCover: 'treeCover',
  fishCoverJ: 'treeCoverJ',
  fishCoverJOk: 'treeCoverJOk',
  fishCoverOf: 'treeCoverOf',
  fishCoverRule: 'treeCoverRule',
  fishCoverW: 'treeCoverW',
  fishCoverWOk: 'treeCoverWOk',
  fishCoverYes: 'treeCoverYes',
  fishDrop: 'treeDrop',
  fishEase: 'treeEase',
  fishExclude: 'treeExclude',
  fishFeat: 'treeFeat',
  fishGameIn: 'treeGameIn',
  fishIdx: 'treeIdx',
  fishJuv: 'treeJuv',
  fishLeafCover: 'treeLeafCover',
  fishLook: 'treeLook',
  fishMarked: 'treeMarked',
  fishMine: 'treeKeepOf',
  fishMontPick: 'treeMontPick',
  fishMontSet: 'treeMontSet',
  fishNear: 'treeNear',
  fishNeeds: 'treeNeeds',
  fishNotThis: 'treeNotThis',
  fishOk: 'treeOk',
  fishOrder: 'treeOrder',
  fishOwn: 'treeOwn',
  fishPairs: 'treePairs',
  fishParse: 'treeParse',
  fishPhase: 'treePhase',
  fishPick: 'treePick',
  fishPlay: 'treePlay',
  fishQueue: 'treeQueue',
  fishRec: 'treePhotoRec',
  fishReject: 'treeReject',
  fishRun: 'treeRun',
  fishSeenFrom: 'treeSeenFrom',
  fishSeenOf: 'treeSeenOf',
  fishSet: 'treePhotoSet',
  fishSigs: 'treeSigs',
  fishSpecies: 'treeSpeciesOf',
  fishStamp: 'treeStamp',
  fishState: 'treeStateOf',
  fishSure: 'treeSure',
  fishTag: 'treeTag',
  fishTagsAuto: 'treeTagsAuto',
  fishTagsMine: 'treeTagsMine',
  fishTarget: 'treeTarget',
  fishUndo: 'treeUndo',
  fishUnitPhases: 'treeUnitPhases',
  fishUnits: 'treeUnitsOf',
  fishUnsure: 'treeUnsure',
  fishWaiting: 'treeWaiting',
  fishWm: 'treeWm'
};
// The files that name another function under one of those names: learn.js's sheet helpers (until their own rename),
// admin.js's photo words (fishState) and the comment of the admin smoke that tells the two apart, tools/ratedworld.js's
// fish units, and the tests of each.
const AUTOSORT_OWN = {
  'learn.js': ['fishMine', 'fishSpecies'],
  'admin.js': ['fishState'],
  'tests/admin.smoke.js': ['fishState'],
  'tools/ratedworld.js': ['fishUnits'],
  'tests/ratedworld.test.js': ['fishUnits'],
  'tests/opengroup.test.js': ['fishUnits'],
  'tests/familiesfirst.test.js': ['fishUnits'],
  'tests/sheetparts.test.js': ['fishSpecies'],
  'tests/speciesmarks.test.js': ['fishSpecies'],
  'tests/genusmarks.test.js': ['fishSpecies'],
  'tests/fishjuv.test.js': ['fishSpecies'],
  'tests/roots.test.js': ['fishSpecies'],
  'tests/subject-neutral-admin.test.js': ['fishState', 'fishMine', 'fishSpecies']
};

test('the auto-sort keeps its tree* names: no retired fish* name of autosort.js comes back', () => {
  const bad = [];
  for (const f of files) {
    if (f === 'tests/treenames.test.js' || f === 'core.js' || f === 'tools/sync/Code.gs') continue;
    const L = lines(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    for (const n of Object.keys(AUTOSORT))
      if (!(AUTOSORT_OWN[f] || []).includes(n) && L.some(l => word(n).test(l))) bad.push(`${f}: ${n} (now ${AUTOSORT[n]})`);
  }
  assert.deepStrictEqual(bad, [], 'a retired fish* name of the auto-sort is back: use its tree* name');
  const as = fs.readFileSync(path.join(ROOT, 'autosort.js'), 'utf8');
  for (const n of Object.values(AUTOSORT)) assert.ok(word(n).test(as), `autosort.js declares ${n}`);
  assert.strictEqual(typeof require('../autosort.js').fishWinkFold, 'function', 'autosort.js keeps fishWinkFold');
});
