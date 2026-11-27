'use strict';
// Two tiny, wholly synthetic courses for the fictional-edition probe (tools/studies/ree284/fictional.js; REE-284 "Local
// test of content portability"). Nothing here comes from IMR, a player or the sheet: invented organisation words, invented
// genus names, invented text, no photo of the repository (the probe draws each photo in the browser) and no source but
// this file. The genus names are made up to look like no coral genus; the probe fails if one of them is a key of the
// repository's own data.json.
//
//   const {edition} = require('./course.js');
//   const E = edition('a');   // {id, org, genera, files: {'data.json': {...}, ...}, photos: [{f, label, hue}], legacy}
//
// Edition 'a' and edition 'b' differ in every word, so a page of one that shows the other's words, or the IMR edition's,
// is told apart from its own.

// The organisation words, one per key of core.js ORG (core/keys.js), all invented.
const ORGS = {
  a: {
    short: 'FFS',
    name: 'Fictional Field School',
    app: 'FFS Tide Trainer',
    appShort: 'Tide Trainer',
    course: 'FFS course',
    lecture: 'FFS talk',
    lectureRef: 'FFS Talk 1',
    fishPres: 'FFS fish talk',
    list: 'FFS list',
    slate: 'FFS slate',
    benthic: 'FFS benthic slate',
    trainer: 'FFS mentor'
  },
  b: {
    short: 'ZTA',
    name: 'Zed Test Academy',
    app: 'ZTA Shore Guide',
    appShort: 'Shore Guide',
    course: 'ZTA course',
    lecture: 'ZTA session',
    lectureRef: 'ZTA Session 2',
    fishPres: 'ZTA fish session',
    list: 'ZTA list',
    slate: 'ZTA slate',
    benthic: 'ZTA benthic slate',
    trainer: 'ZTA guide'
  }
};

// Four invented genera per edition, in two invented families, each the look-alike of one other.
const GENERA = {
  a: [
    ['Mockora', 'Mockoridae', 'lumpy mounds with tiny square pits', 20],
    ['Fictopora', 'Mockoridae', 'flat plates with ringed pits', 80],
    ['Synthastrea', 'Synthidae', 'round domes with star-shaped cups', 140],
    ['Placeholdia', 'Synthidae', 'thin fingers with smooth tips', 200]
  ],
  b: [
    ['Testudella', 'Testudellidae', 'shell-like cups in neat rows', 260],
    ['Nullipora', 'Testudellidae', 'smooth crusts with no visible cups', 300],
    ['Stubastrea', 'Stubidae', 'short stubs with sunken cups', 330],
    ['Dummyphyllia', 'Stubidae', 'leafy sheets with ridged edges', 40]
  ]
};
const VIEWS = ['wide', 'medium', 'macro'],
  PER_VIEW = 3,
  CREDIT = 'Synthetic test image, made by the probe';

function edition(id) {
  const org = ORGS[id],
    G = GENERA[id];
  if (!org) throw new Error(`no fictional edition ${id}`);
  const photos = [],
    gen = {};
  G.forEach(([name, fam, look, hue], i) => {
    const mate = G[i ^ 1][0],
      views = {};
    VIEWS.forEach((v, vi) => {
      views[v] = [];
      for (let k = 1; k <= PER_VIEW; k++) {
        const f = `${id}-${name.toLowerCase()}-${v}-${k}`;
        photos.push({f, label: `${name} ${v} ${k}`, hue: (hue + vi * 12 + k * 4) % 360});
        // A photo record as data.json holds one (docs/DATA.md): no src (no online original), no own (not the
        // instance's own photo), an observation address on the reserved .invalid domain (never fetched: a link only).
        views[v].push({f, a: CREDIT, lic: 'cc0', o: `https://example.invalid/${id}/obs/${name.toLowerCase()}-${k}`, t: name, ar: 1.333});
      }
    });
    gen[name] = {
      fam,
      crit: [`${name}: ${look}.`, `Made up for the ${org.course}; describes no real organism.`],
      look: [mate],
      pages: [],
      tr: [],
      views,
      sum: `${name} shows ${look}.`,
      cover: `${id}-${name.toLowerCase()}-medium-1`,
      lsrc: {[mate]: `${org.lectureRef}: ${mate} looks like ${name}`},
      qt: [look[0].toUpperCase() + look.slice(1)],
      cm: 10 - i,
      plain: `A made-up organism of the ${org.course}: ${look}.`
    };
  });
  const files = {
    // data.json without the instance's layer (no imrg, no n, ig, imr, mn, sl: docs/spec/data.md "The instance's layer"),
    // no Coral Finder key or traits, no lecture photos (course, cmp), no candidates, no extra genera.
    'data.json': {
      gen,
      key: [],
      imrg: [],
      traits: [],
      course: {},
      terms: [['Pit', 'A small hollow on the surface of a made-up organism.', `${org.lectureRef}`, 'A tiny dent.']],
      tips: [`Look at the surface first (${org.lecture}).`],
      cand: {},
      cmp: [],
      x: {gen: {}, leaf: {}, groups: []},
      spell: {}
    },
    // The curation, empty: no exclusion, no feature, no cover chosen (the app's players' copy and the admin's file).
    'curation.json': {v: 1, genera: {}},
    'curation-play.json': {v: 1, genera: {}},
    'forms.json': {forms: [], cf: {}, gunsure: [], gf: {}, form: {}},
    'quality.json': {q: {}, v: 1},
    'picks.json': {v: 1, feat: {}},
    'calibration-set.json': {v: 1, coral: []}
  };
  return {id, org, genera: G.map(g => g[0]), files, photos, legacy: legacy(id, G.map(g => g[0]))};
}

// A synthetic export in the legacy format: a device and an account saved before the rename to the app's present
// storage names (core.js LEGACY_KEYS: imr-coral-* travelled, the other imr-* stayed). The progress names one unit of the
// edition and one unit it does not hold ("Retiredia", invented), as an export from another edition or an older course
// would. No real player: the name and code are placeholders the probe's sheet stub answers.
function legacy(id, names) {
  const at = Date.parse('2026-10-20T09:30:00Z'),
    prog = {[names[0]]: {ok: 4, ko: 1, th: 0.25, at}, Retiredia: {ok: 7, ko: 2, th: 0.3, at}};
  return {
    device: {
      'imr-coral-progress': JSON.stringify({[names[1]]: {ok: 3, ko: 0, th: 0.2, at}}), // rename-app: keep
      'imr-coral-theme': 'dark', // rename-app: keep
      'imr-coral-sync': JSON.stringify({name: 'Probe Player', pin: '0000', dirty: true, log: []}), // rename-app: keep
      'imr-tour': '"done"' // rename-app: keep
    },
    account: {'imr-coral-progress': JSON.stringify(prog), 'imr-coral-quiz': '{"bon":false}'}, // rename-app: keep
    name: 'Probe Player',
    pin: '0000',
    expect: {device: names[1], account: names[0], foreign: 'Retiredia'}
  };
}

module.exports = {edition, ORGS, GENERA, VIEWS};
