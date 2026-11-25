// A made-up answer log, as the sync sheet's Answers tab holds it (Code.gs LOG, every column; rows as logAnswers_ writes
// them), for the tests and the measure of the admin's answer-log read (tools/ansize.js, tests/ansrows.test.js): a seeded
// draw, so the same n and seed give the same rows. Made-up players only (rule D2), never the real sheet (rule D1).
// What it holds, roughly as the real log does: about 70% corals, 27% fish, 3% sea slugs; signed-in players, devices not
// signed in (~anon), a deleted account's kept answers (~deleted) and an archive; sessions of 10 to 60 answers a few
// seconds apart, a few played offline and logged late; every question format (the mode); the oldest rows without the
// columns added since (blank), typed answers with their spelling step and rejected tries, the scoring record, the
// photo tapped in a Find the X, a few surprise cards (wink) and a row without a player.

const CORAL = [
  'Acropora',
  'Pocillopora',
  'Stylophora',
  'Anacropora',
  'Seriatopora',
  'Montipora',
  'Porites',
  'Goniopora',
  'Favites',
  'Dipsastraea',
  'Platygyra',
  'Leptoria',
  'Goniastrea',
  'Echinopora',
  'Cyphastrea',
  'Galaxea',
  'Turbinaria',
  'Pavona',
  'Leptoseris',
  'Pachyseris',
  'Fungia',
  'Herpolitha',
  'Ctenactis',
  'Lobophyllia',
  'Echinophyllia',
  'Oxypora',
  'Mycedium',
  'Pectinia',
  'Merulina',
  'Hydnophora',
  'Astreopora',
  'Isopora',
  'Psammocora',
  'Coscinaraea',
  'Diploastrea',
  'Euphyllia',
  'Plerogyra',
  'Physogyra',
  'Millepora',
  'Heliopora',
  'Tubipora',
  'Sinularia',
  'Sarcophyton',
  'Lobophytum',
  'Symphyllia'
];
const FISH = [
  ['f:Damselfishes', 'Damselfishes', 'family'],
  ['f:Wrasses', 'Wrasses', 'family'],
  ['f:Butterflyfishes', 'Butterflyfishes', 'family'],
  ['f:Angelfishes', 'Angelfishes', 'family'],
  ['f:Surgeonfishes', 'Surgeonfishes', 'family'],
  ['f:Parrotfishes', 'Parrotfishes', 'family'],
  ['f:Groupers', 'Groupers', 'family'],
  ['f:Snappers', 'Snappers', 'family'],
  ['f:Gobies', 'Gobies', 'family'],
  ['f:Blennies', 'Blennies', 'family'],
  ['f:Cardinalfishes', 'Cardinalfishes', 'family'],
  ['f:Goatfishes', 'Goatfishes', 'family'],
  ['f:Triggerfishes', 'Triggerfishes', 'family'],
  ['f:Pufferfishes', 'Pufferfishes', 'family'],
  ['f:Scorpionfishes', 'Scorpionfishes', 'family'],
  ['f:Frogfishes', 'Frogfishes', 'family'],
  ['f:Squirrelfishes', 'Squirrelfishes', 'family'],
  ['f:Rabbitfishes', 'Rabbitfishes', 'family'],
  ['f:Fusiliers', 'Fusiliers', 'family'],
  ['f:Sweetlips', 'Sweetlips', 'family'],
  ['g:Dascyllus', 'Dascyllus', 'genus'],
  ['g:Chromis', 'Chromis', 'genus'],
  ['g:Amphiprion', 'Amphiprion', 'genus'],
  ['g:Chaetodon', 'Chaetodon', 'genus'],
  ['g:Thalassoma', 'Thalassoma', 'genus']
];
const SPECIES = [
  'Chromis ternatensis',
  'Dascyllus trimaculatus',
  'Pomacentrus chrysurus',
  'Amphiprion clarkii',
  'Chaetodon kleinii',
  'Thalassoma lunare',
  'Labroides dimidiatus',
  'Zebrasoma scopas',
  'Acanthurus pyroferus',
  'Scarus niger',
  'Cephalopholis miniata',
  'Lutjanus decussatus',
  'Amblygobius phalaena',
  'Ecsenius bicolor',
  'Ostorhinchus aureus',
  'Parupeneus multifasciatus',
  'Balistapus undulatus',
  'Arothron nigropunctatus',
  'Pterois volitans',
  'Antennarius commerson',
  'Sargocentron caudimaculatum',
  'Siganus virgatus',
  'Caesio cuning',
  'Plectorhinchus vittatus',
  'Pygoplites diacanthus',
  'Centropyge vroliki',
  'Chaetodon vagabundus',
  'Halichoeres hortulanus'
];
const SLUG = [
  'Chromodoris',
  'Hypselodoris',
  'Goniobranchus',
  'Phyllidia',
  'Phyllidiella',
  'Nembrotha',
  'Flabellina',
  'Jorunna',
  'Glossodoris',
  'Doriprismatica'
];
const SLUG_SP = [
  'Chromodoris annae',
  'Hypselodoris bullockii',
  'Goniobranchus sp. 5',
  'Phyllidia varicosa',
  'Nembrotha kubaryana',
  'Jorunna funebris'
];
const VIEWS = ['wide', 'medium', 'macro'];
// Modes as quiz.js logs them, with how often (the formats of core.js fmtOf).
const MODES = [
  ['quiz', 50],
  ['quiz|k3', 10],
  ['quiz|k2', 4],
  ['quiz|t', 10],
  ['quiz|d', 6],
  ['quiz-duel', 5],
  ['quiz-duel|Acropora:Montipora', 2],
  ['quiz|f', 5],
  ['quiz|x', 3],
  ['quiz|w', 2],
  ['quiz|t|x', 1],
  ['live', 2]
];
const TYPOS = ['acropra', 'pocilopora', 'porities', 'montiproa', 'goniopra', 'fungai', 'damsel', 'wrase', 'butterfly fish', 'gobi', 'xx'];

function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// n rows (plus the few surprise cards and the row without a player), seed: the draw. Returns the tab's rows, without its
// header (Code.gs LOG).
function synthLog(n, seed = 1) {
  const R = rng(seed),
    pick = L => L[Math.floor(R() * L.length)],
    weighed = L => {
      let x = R() * L.reduce((s, w) => s + w[1], 0);
      for (const w of L) if ((x -= w[1]) < 0) return w[0];
      return L[L.length - 1][0];
    },
    word = (k, A = 'abcdefghijklmnopqrstuvwxyz0123456789') => Array.from({length: k}, () => pick(A)).join(''),
    r3 = x => Math.round(x * 1000) / 1000;
  const names = Array.from({length: 36}, (_, i) => `Player ${String(i + 1).padStart(2, '0')}`),
    anons = Array.from({length: 70}, () => '~anon ' + word(10)),
    gone = Array.from({length: 3}, () => '~deleted ' + word(10)),
    devs = {};
  // The players by how much they play: a few play a lot.
  const who = () => {
    const x = R();
    return x < 0.72 ? names[Math.floor(Math.pow(R(), 2) * names.length)] : x < 0.97 ? pick(anons) : pick(gone);
  };
  const devOf = nm => (devs[nm] = devs[nm] || Array.from({length: 1 + Math.floor(R() * 2)}, () => word(10)));
  // Each unit's pool of photo stems, as data.json and fish-game.json name them.
  const pool = {};
  const photo = (sj, u) => {
    const L = (pool[u] =
      pool[u] ||
      Array.from({length: sj === 'coral' ? 30 : 20}, () =>
        sj === 'coral'
          ? `${u.toLowerCase()}-${pick(VIEWS)}-${100000000 + Math.floor(R() * 800000000)}`
          : 'fi' + (100000000 + Math.floor(R() * 300000000))
      ));
    return pick(L);
  };
  const rows = [],
    late = [];
  let t = Date.parse('2026-08-20T01:00:00Z');
  while (rows.length + late.length < n) {
    const nm = who(),
      dv = pick(devOf(nm)),
      off = R() < 0.04,
      len = 10 + Math.floor(R() * 50),
      tz = nm === names[3] ? 60 : 480;
    t += Math.floor(R() * 3 * 3600e3);
    let tt = t;
    for (let i = 0; i < len && rows.length + late.length < n; i++) {
      tt += 3000 + Math.floor(R() * 25000);
      const k = rows.length + late.length,
        age = k / n, // the oldest rows lack the columns added since
        sx = R(),
        sj = sx < 0.7 ? 'coral' : sx < 0.97 ? 'fish' : 'seaslug',
        mode = weighed(MODES),
        typed = /\|t/.test(mode),
        duel = /duel|\|d/.test(mode),
        find = /\|f/.test(mode);
      let units, shown, rank, tn, sp;
      if (sj === 'coral') units = CORAL.map(g => [g, '', 'genus']);
      else if (sj === 'fish') units = FISH;
      else units = SLUG.map(g => ['g:' + g, g, 'genus']);
      const U = pick(units);
      shown = U[0];
      rank = U[2];
      tn = U[1];
      const ok = R() < 0.66,
        A = ok ? U : R() < 0.08 && !find ? ["I don't know", '', ''] : pick(units),
        nch = duel || (!find && R() < 0.08) ? 2 : find || typed ? 0 : 4,
        ch = [shown];
      while (ch.length < nch) {
        const c = pick(units)[0];
        if (!ch.includes(c)) ch.push(c);
      }
      if (nch && !ok && A[0] !== "I don't know" && !ch.includes(A[0])) ch[1] = A[0];
      const ph = Array.from({length: find ? 4 : R() < 0.15 ? 2 : 1}, () => photo(sj, shown)).join(' ');
      sp = sj === 'fish' ? (R() < 0.1 ? `${pick(SPECIES)}, ${pick(SPECIES)}` : pick(SPECIES)) : sj === 'seaslug' ? pick(SLUG_SP) : '';
      const sc = {d: r3(R() * 3 - 1), m: r3(R() - 0.5), n: r3(R() - 0.5)};
      if (R() < 0.2) sc.f = r3(R() * 0.5);
      if (R() < 0.15) sc.c = r3(R() * 0.4);
      if (duel) sc.l = 1;
      if (R() < 0.3) sc.r = r3(0.5 + R() * 0.5);
      if (R() < 0.05) sc.h = 'corallites';
      if (typed) sc.t = r3(R() - 0.8);
      sc.o = R() < 0.4 ? r3(R() - 0.5) : 0;
      if (!sc.o) delete sc.o;
      if (typed && !ok && R() < 0.2) sc.z = pick(['cn', 'g']);
      sc.i = r3(R() * 0.4 - 0.2);
      const old = age < 0.15,
        mid = age < 0.35,
        row = [
          nm,
          new Date(tt),
          shown,
          A[0],
          ok ? 1 : 0,
          mode,
          ph,
          word(12),
          old && R() < 0.5 ? '' : Math.round(100 * R()) / 100,
          old && R() < 0.5 ? '' : r3(R() * 4.5 - 1.5),
          old && R() < 0.5 ? '' : R() < 0.3 ? 1 : 0,
          ch.join(' '),
          old ? '' : Math.round(10 + R() * 300) / 10,
          old ? '' : R() < 0.1 ? 1 : 0,
          old && R() < 0.7 ? '' : tz,
          typed ? (ok ? (R() < 0.3 ? pick(TYPOS) : (A[1] || A[0]).toLowerCase()) : R() < 0.15 ? '' : pick(TYPOS)) : '',
          typed && R() < 0.2 ? (R() < 0.6 ? 1 : 0) : '',
          mid && sj === 'coral' && R() < 0.5 ? '' : sj,
          mid && sj === 'coral' && R() < 0.5 ? '' : rank,
          tn,
          sj === 'coral' || A[0] === "I don't know" ? '' : A[1],
          sp,
          mid ? '' : JSON.stringify(sc),
          typed && R() < 0.25 ? JSON.stringify(Array.from({length: 1 + Math.floor(R() * 3)}, () => pick(TYPOS))) : '',
          mid ? '' : dv,
          find ? ph.split(' ')[Math.floor(R() * 4)] : '',
          mid ? '' : 'c' + word(12)
        ];
      (off ? late : rows).push(row);
    }
  }
  // Answers played offline arrive later, with the time they were given.
  rows.push(...late);
  // A few surprise cards (never served) and a row without a player (left out).
  for (let i = 0; i < 5; i++) {
    const w = rows[Math.floor(R() * rows.length)].slice();
    w[5] = 'wink';
    rows.splice(Math.floor(R() * rows.length), 0, w);
  }
  rows.splice(Math.floor(R() * rows.length), 0, ['', new Date(t), 'Acropora', 'Acropora', 1, 'quiz']);
  return rows;
}

// The made-up players' saved progress (Code.gs RAs, HEAD), for answers_'s players: learned, seen, total and each genus's
// ability in the Data column.
function synthPlayers(rows) {
  const names = [...new Set(rows.map(r => r[0]).filter(x => x && !/^~/.test(x)))];
  return names.map((nm, i) => {
    const P = {};
    CORAL.slice(0, 10 + (i % 30)).forEach((g, j) => (P[g] = {th: Math.round(((j * 37 + i * 11) % 300) - 150) / 100}));
    return [
      nm,
      new Date('2026-11-20T00:00:00Z'),
      i % 20,
      5 + (i % 30),
      100 + i * 37,
      '',
      'h' + i,
      JSON.stringify({'reefid-sync-coral-progress': JSON.stringify(P)}),
      10,
      1
    ];
  });
}

module.exports = {synthLog, synthPlayers};
