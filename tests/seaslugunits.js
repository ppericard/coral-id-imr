'use strict';
// The sea slug units for a rated-world run (tests/levelview.test.js, tests/faof.test.js): app.js treeGenera on
// seaslug.json, as tests/stateview.test.js builds them, in the shape of the rated world's units (tools/ratedworld.js
// unitsOf, which plays only the fish and the corals): the genera on the slate, their species by their scientific names.
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js'),
  block = require('./block.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f));

function seaslugU() {
  const SEA = C.subjectOf('seaslug'),
    SF = json('seaslug.json'),
    SG = C.treeGameRead(json('seaslug-game.json')),
    CUR = json('curation.json'),
    c = vm.createContext({
      DOM: {EX: C.DOM.EX},
      LV_AT: [0.5, 0.8, C.DOM.EX],
      INTRO: {START: 4},
      easyCover: C.easyCover,
      treeScoreTree: C.treeScoreTree,
      treeSpUnits: C.treeSpUnits,
      treeGenSets: C.treeGenSets,
      rankWeights: C.rankWeights,
      unitRankOf: C.unitRankOf,
      typeNormAll: C.typeNormAll,
      SUBJ: SEA,
      UNITS: {seaslug: {norm: C.typeNormAll}},
      sciOn: () => true,
      Math: Object.create(Math)
    });
  const treeGenera = vm.runInContext(
      '(' + block(src('app.js'), 'function treeGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) + ')',
      c
    ),
    X = treeGenera(
      Object.assign(C.treeGen(SF, C.treePhotos(undefined, SG.photos, CUR.seaslug), undefined, C.unitRankOf(SEA)), {kinds: SEA.names}),
      SF
    ),
    slate = [...X.c1, ...X.c2, ...X.c3].filter(n => ((X.gen[n].views || {}).wide || []).length);
  return {
    subject: 'seaslug',
    X,
    DATA: {gen: {}},
    slate,
    extra: [],
    sp: [],
    ssp: (X.ssl || []).filter(n => slate.includes(X.gen[n].parent)),
    setK: 'ssp',
    rec: n => X.gen[n],
    views: n => ({wide: (X.gen[n].views || {}).wide || []}),
    covers: X.picks || {},
    core: X.c1,
    c3: X.c3,
    tree: null,
    kind: n => X.gen[n].rank || 'genus',
    imrFormsOf: n => X.gen[n].forms || ['a']
  };
}

module.exports = seaslugU;
