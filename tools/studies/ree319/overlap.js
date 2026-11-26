// REE-319: how many of a player's reserved observations (core.js reserveOf, the app's own allocation, not a copy) have a
// photo left in practice that may show the same specimen, per subject, over seeded player ids, from the committed data
// files only. Read-only: no request leaves the machine, nothing in the repository is written.
//
//   node tools/studies/ree319/overlap.js [--seeds 100] [--out /path/outside/the/repo.json]
//
// A reserved observation is the reserve's key, species (a coral genus) + ' ' + core.js treeObs(p). Its photos are every
// photo of any unit with that key; practice is every photo of any unit whose key is not reserved (what reserveSplit
// leaves in the views, the game lists and the cards). Each reserved key is checked against practice for these signals:
//   file     the same photo identity (core.js treePid) under another key
//   pic      the same source picture: the iNaturalist photo id (src or treePid i<id>), else the same src address
//   dup      a pair listed in data/dups.json (tools/find_dups.py's near-duplicates, judged by image, corals only)
//   obs      the same iNaturalist observation id under another key (another species of the same observation)
//   slide    a coral lecture file from the same deck and page (imr-p12_*, imrl-p41_*) in the same genus: two crops or
//            views of one slide, possibly one colony (a proxy, inferred)
//   sess100  the same observer (the attribution's name), the same species (genus for corals) and an iNaturalist
//            observation id within 100 of the reserved one: one upload session, possibly one specimen (a proxy)
//   sess10k  the same with a window of 10,000 ids (a looser session proxy)
//   observer the same observer and species at any time (nominates a review pair, never certifies one)
//   page     the same generic source page and species: a FishBase page as o, a Corals of the World factsheet (pg)
// Tiers for "clean" (no practice partner at that tier or below): T0 file+obs (the current key's own guarantee), T1 +pic+dup
// (the same picture), T2 +slide+sess100 (specimen proxies), T3 +sess10k+page (loose), T4 +observer (strictest).
// Observer names are only compared, never printed or written (the output holds counts and file names).
const fs = require('fs'),
  path = require('path');
const {ROOT, C, json, subjects} = require('./units.js');

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const SEEDS = +arg('--seeds', 100),
  OUT = arg('--out', null);
if (OUT && path.resolve(OUT).startsWith(path.resolve(ROOT) + path.sep)) throw new Error('--out must be outside the repository');

const SIGNALS = ['file', 'pic', 'dup', 'obs', 'slide', 'sess100', 'sess10k', 'observer', 'page'];
const TIERS = [
  ['T0', ['file', 'obs']],
  ['T1', ['file', 'obs', 'pic', 'dup']],
  ['T2', ['file', 'obs', 'pic', 'dup', 'slide', 'sess100']],
  ['T3', ['file', 'obs', 'pic', 'dup', 'slide', 'sess100', 'sess10k', 'page']],
  ['T4', SIGNALS]
];

const INAT = 'https://www.inaturalist.org/observations/';
const dupOf = new Map();
(json('data/dups.json').dup || []).forEach((d, i) => [d.keep, ...(d.f || [])].forEach(f => dupOf.set(C.treePid(f), 'd' + i)));

// Every photo of every unit, with its key and its identity signals.
function photosOf(X) {
  const out = new Map(); // file -> record (one per file and key)
  const add = (id, p, exam) => {
    if (!p || !p.f) return;
    const key = String(p.sp || id) + ' ' + C.treeObs(p),
      k2 = p.f + '\u0000' + key;
    if (out.has(k2)) {
      if (exam) out.get(k2).exam = true;
      return;
    }
    const o = p.o ? String(p.o) : '',
      inat = o.startsWith(INAT) || /^\d+$/.test(o) ? C.treeObs(p) : null,
      pid = C.treePid(p.f),
      m = /\/photos\/(\d+)\//.exec(String(p.src || '')),
      pic = m ? 'i' + m[1] : /^i\d+$/.test(pid) ? pid : p.src ? String(p.src) : null,
      sl = /^(imrl?)-p(\d+)_/.exec(p.f),
      who = /^\(c\)\s*([^,(]+)/i.exec(String(p.a || ''));
    out.set(k2, {
      f: p.f,
      key,
      grp: String(p.sp || id),
      exam: !!exam,
      idType: !o ? 'none' : inat ? 'inat' : 'page',
      pid,
      pic,
      dup: dupOf.get(pid) || null,
      inat: inat && /^\d+$/.test(inat) ? +inat : null,
      slide: sl ? id + ' ' + sl[1] + ' ' + sl[2] : null,
      who: who ? who[1].trim().toLowerCase() : null,
      page: !o ? (p.pg ? String(p.pg) : null) : inat ? (p.pg ? String(p.pg) : null) : o
    });
  };
  Object.entries(X.gen).forEach(([id, g]) => {
    if (!g) return;
    const exam = !g.wink && !g.noex;
    Object.values(g.views || {})
      .flat()
      .forEach(p => add(id, p, exam));
    Object.values(g.sl || {}).forEach(s =>
      Object.values(s || {}).forEach(L => (Array.isArray(L) ? L : []).forEach(p => add(id, p, exam)))
    );
    add(id, g.coverP, false);
  });
  return [...out.values()];
}

function index(P) {
  const by = {};
  const put = (sig, k, r) => {
    if (k === null || k === undefined) return;
    const M = by[sig] || (by[sig] = new Map());
    (M.get(k) || M.set(k, []).get(k)).push(r);
  };
  P.forEach(r => {
    put('file', r.pid, r);
    put('pic', r.pic, r);
    put('dup', r.dup, r);
    put('obs', r.inat, r);
    put('slide', r.slide, r);
    if (r.who) put('observer', r.who + '\u0000' + r.grp, r);
    if (r.page) put('page', r.page + '\u0000' + r.grp, r);
  });
  return by;
}

// The practice partners of one reserved photo r under signal sig (R: the reserved keys).
function partners(by, r, sig, R) {
  const look = (s, k) => ((by[s] && by[s].get(k)) || []).filter(q => q.key !== r.key && !R.has(q.key));
  switch (sig) {
    case 'file':
      return look('file', r.pid);
    case 'pic':
      return r.pic ? look('pic', r.pic) : [];
    case 'dup':
      return r.dup ? look('dup', r.dup) : [];
    case 'obs':
      return r.inat !== null ? look('obs', r.inat) : [];
    case 'slide':
      return r.slide ? look('slide', r.slide) : [];
    case 'observer':
      return r.who ? look('observer', r.who + '\u0000' + r.grp) : [];
    case 'sess100':
    case 'sess10k': {
      if (!r.who || r.inat === null) return [];
      const w = sig === 'sess100' ? 100 : 10000;
      return look('observer', r.who + '\u0000' + r.grp).filter(q => q.inat !== null && Math.abs(q.inat - r.inat) <= w);
    }
    case 'page':
      return r.page ? look('page', r.page + '\u0000' + r.grp) : [];
  }
  return [];
}

const stat = L => {
  const s = [...L].sort((a, b) => a - b),
    m = L.reduce((a, b) => a + b, 0) / (L.length || 1);
  return {mean: +m.toFixed(2), min: s[0] || 0, max: s[s.length - 1] || 0};
};

function study(name, X) {
  const P = photosOf(X),
    by = index(P),
    ofKey = new Map();
  P.forEach(r => (ofKey.get(r.key) || ofKey.set(r.key, []).get(r.key)).push(r));
  const examKeys = new Set(P.filter(r => r.exam).map(r => r.key)),
    keyType = k => {
      const T = new Set(ofKey.get(k).map(r => r.idType));
      return T.has('inat') ? 'inat' : T.has('page') ? 'page' : 'none';
    };
  const pool = {photos: new Set(P.map(r => r.f)).size, examKeys: examKeys.size, byType: {inat: 0, page: 0, none: 0}};
  examKeys.forEach(k => pool.byType[keyType(k)]++);
  const per = {held: [], type: {inat: [], page: [], none: []}, sig: {}, clean: {}},
    ever = {held: new Set(), sig: {}, pairs: {}, gap: new Map()};
  SIGNALS.forEach(s => ((per.sig[s] = []), (ever.sig[s] = new Set()), (ever.pairs[s] = new Set())));
  TIERS.forEach(([t]) => (per.clean[t] = []));
  for (let n = 0; n < SEEDS; n++) {
    const R = C.reserveOf(X, 'ree319-audit-' + n),
      flag = {},
      tc = {inat: 0, page: 0, none: 0};
    SIGNALS.forEach(s => (flag[s] = new Set()));
    R.forEach(k => {
      ever.held.add(k);
      tc[keyType(k)]++;
      (ofKey.get(k) || []).forEach(r =>
        SIGNALS.forEach(s => {
          const Q = partners(by, r, s, R);
          if (Q.length) {
            flag[s].add(k);
            ever.sig[s].add(k);
            Q.forEach(q => ever.pairs[s].add(r.f + ' | ' + q.f));
            if (s === 'sess100')
              Q.forEach(q => {
                const d = Math.abs(q.inat - r.inat);
                ever.gap.set(r.f + ' | ' + q.f, d);
              });
          }
        })
      );
    });
    per.held.push(R.size);
    Object.keys(tc).forEach(t => per.type[t].push(tc[t]));
    SIGNALS.forEach(s => per.sig[s].push(flag[s].size));
    TIERS.forEach(([t, S]) => per.clean[t].push([...R].filter(k => !S.some(s => flag[s].has(k))).length));
  }
  return {
    subject: name,
    pool,
    seeds: SEEDS,
    heldPerSeed: stat(per.held),
    heldByIdType: Object.fromEntries(Object.entries(per.type).map(([t, L]) => [t, stat(L)])),
    flaggedPerSeed: Object.fromEntries(SIGNALS.map(s => [s, stat(per.sig[s])])),
    cleanPerSeed: Object.fromEntries(TIERS.map(([t]) => [t, stat(per.clean[t])])),
    everHeld: ever.held.size,
    everHeldByIdType: [...ever.held].reduce((a, k) => ((a[keyType(k)] = (a[keyType(k)] || 0) + 1), a), {}),
    everFlagged: Object.fromEntries(SIGNALS.map(s => [s, ever.sig[s].size])),
    // the keys ever flagged by each signal, by the reserved key's id type (none: the filename fallback)
    everFlaggedByIdType: Object.fromEntries(
      SIGNALS.map(s => [s, [...ever.sig[s]].reduce((a, k) => ((a[keyType(k)] = (a[keyType(k)] || 0) + 1), a), {})])
    ),
    // the sess100 pairs by their gap in observation ids (1, 2-10, 11-100)
    sess100Gaps: [...ever.gap.values()].reduce(
      (a, d) => (a[d <= 1 ? '1' : d <= 10 ? '2-10' : '11-100']++, a),
      {1: 0, '2-10': 0, '11-100': 0}
    ),
    pairs: Object.fromEntries(SIGNALS.map(s => [s, [...ever.pairs[s]].sort()]))
  };
}

function main() {
  const S = subjects(),
    res = Object.entries(S).map(([name, {X}]) => study(name, X));
  res.forEach(r => {
    console.log(`\n== ${r.subject}: ${r.pool.photos} photos, ${r.pool.examKeys} observation keys in exam units`, JSON.stringify(r.pool.byType));
    console.log(`held per seed ${JSON.stringify(r.heldPerSeed)}; by id type ${JSON.stringify(r.heldByIdType)}`);
    console.log(`held at least once over ${r.seeds} seeds: ${r.everHeld} ${JSON.stringify(r.everHeldByIdType)}`);
    console.log('signal     flagged/seed (mean min-max)   keys ever flagged   distinct pairs');
    SIGNALS.forEach(s => {
      const f = r.flaggedPerSeed[s];
      console.log(`${s.padEnd(10)} ${String(f.mean).padStart(7)} ${f.min}-${f.max}`.padEnd(40) + `${String(r.everFlagged[s]).padStart(6)}   ${r.pairs[s].length}`);
    });
    TIERS.forEach(([t]) => console.log(`clean ${t}: ${JSON.stringify(r.cleanPerSeed[t])}`));
    console.log('ever flagged by id type', JSON.stringify(r.everFlaggedByIdType));
    console.log('sess100 pairs by id gap', JSON.stringify(r.sess100Gaps));
  });
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
}

if (require.main === module) main();
module.exports = {photosOf, index, partners, study, SIGNALS, TIERS};
