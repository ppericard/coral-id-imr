// The rated world (rule L11; docs/LEARNING.md "Validating a learning change", "The two worlds"): a fully rated, synthetic
// world beside the app world, where every unit and photo has a continuous Elo difficulty and every player an ability
// offset, drawn from the distributions below (RATED, the one place they are stated), and the app's own engine runs on
// it in Node: core.js (scoreAnswer, the bar's domStep, the Elo, treeScore) and model.js loaded whole in a vm (the aim,
// the start's lean, photoSet with its Gaussian photo choice and RARE, typed questions, drawW, shaky, OPEN.K, openPace,
// openRight, openPick, the exam), the fish units built as the app builds them (core.js fishGen and fishPhotos, app.js
// fishGenera). Only the planner around them is written here, as quiz.js planPhoto does it: the first cards, a card when
// the path allows one (INTRO.EVERY, openPace, openRight, openChance), the target drawn among the units met (nextTarget),
// a unit opened on a card asked as soon as it is ready; no Again, duel or comeback (they are not in the rated world).
// The fish for now; the corals come next (ROADMAP "Validation tools for the two-world check", step 5).
//
//   node tools/learnsim.js --world rated --subject fish [--seeds 10] [--questions 3000] [--profiles ...]
//                          [--dist normal|tail|t3] [--app truth|own] [--beyond yes|no] [--out rated.json]
//
// The world of a seed (the same seed, the same world, so two versions of the app compare on it):
// - each family's difficulty mu ~ N(0, FAM^2), + LOOK when it has declared look-alikes; each scientific genus's mu ~ its
//   family's + N(0, SUB^2), + SIB when it has sibling genera;
// - each photo's own part eps (one per photo file): normal N(0, EPS^2); tail, the same with TAIL.SHARE of the photos
//   TAIL.ADD harder; t3, a t with 3 degrees of freedom scaled to the same sd. A question on unit n with photo f has the
//   true difficulty mu(n) + eps(f). Its judged ease (what the app reads as p.e) e = round(EASE.MID - (eps + N(0,
//   EASE.NOISE^2)) / EASE.STEP), 1 to 5;
// - the player's ability offset pi ~ N(0, PI^2).
// The app is told the truth (--app truth: photoDiff gives each photo's true difficulty and genusDiff each unit's mu, as
// if every photo and unit were rated) or keeps its own estimate (--app own: the judged-ease prior alone, no photo
// statistics, as the fish today).
//
// The learner (tools/learnprof.js profiles): know(n), its chance to name an average photo (difficulty 0) of unit n, from
// its profile; on a question it recognises the unit with p = sig(logit(know) + pi - d - SINGLE), d the true difficulty
// of the photo (fish show one photo alone), and otherwise guesses among the choices (typed: "I don't know" half the
// time, else another unit met of the same rank). It learns by the number of answers: every answer on a unit (and its
// card) adds rate x (1 - know), right or wrong. The judge's D*(n): its mean chance of naming each of the unit's game
// photos alone, with no choices.
//
// Each run writes what learnsim's runs hold for tools/learncmp.js: rows at the checkpoints (dStar, knowSlate, met,
// right, prog, f {gs, ds}, kinds, score, plateau), owAt, advAt, kinds, c3, expo, preOW, knows; the file says world 'rated'.
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const ROOT = path.join(__dirname, '..');
const C = require('../core.js');
const LP = require('./learnprof.js');
const cut = require('../tests/block.js');

// The distributions (docs/LEARNING.md "The two worlds").
const RATED = {
  FAM: 0.37,
  LOOK: 0.5,
  SUB: 0.3,
  SIB: 0.3,
  EPS: 0.46,
  TAIL: {SHARE: 0.15, ADD: 1.5},
  EASE: {MID: 3, STEP: 0.5, NOISE: 0.35},
  PI: 0.5,
  SINGLE: 0.5
};

// Seeded generators: mulberry32 and Box-Muller.
const gen = a => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const normal = r => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
const sig = x => 1 / (1 + Math.exp(-x)),
  logit = q => Math.log(Math.min(0.995, Math.max(0.005, q)) / (1 - Math.min(0.995, Math.max(0.005, q))));

// The fish units as the app builds them (app.js fishBuild without the curation's covers, which change no game photo).
let XCACHE = null;
function fishUnits() {
  if (XCACHE) return XCACHE;
  const J = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')),
    F = J('fish.json'),
    ph = J('fish-photos.json'),
    gm = J('fish-game.json'),
    CUR = J('curation.json'),
    src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'),
    ctx = vm.createContext({...C, Math, Map, Set, Object, Array, JSON, String, Number}),
    fishGenera = vm.runInContext('(' + cut(src, 'function fishGenera(', '\n}\n', {through: 1, file: 'app.js'}) + ')', ctx);
  return (XCACHE = fishGenera(C.fishGen(F, C.fishPhotos(ph.photos, gm.photos, CUR, F), ph.sheet), F));
}

// The world of one seed (above): mu per unit, eps and the judged ease per photo file, the player's pi.
function world(X, seed, photos = 'normal') {
  const r = gen((seed * 2654435761) ^ 0x51ed270b),
    mu = {},
    eps = {},
    ease = {},
    fams = [...X.c1, ...X.c2, ...X.c3];
  fams.forEach(n => (mu[n] = RATED.FAM * normal(r) + ((X.gen[n].look || []).length ? RATED.LOOK : 0)));
  X.sci.forEach(n => (mu[n] = (mu[X.gen[n].parent] || 0) + RATED.SUB * normal(r) + ((X.gen[n].look || []).length ? RATED.SIB : 0)));
  const files = [...new Set([...fams, ...X.sci].flatMap(n => (X.gen[n].views.wide || []).map(p => p.f)))].sort();
  files.forEach(f => {
    let e = RATED.EPS * normal(r);
    if (photos === 'tail' && r() < RATED.TAIL.SHARE) e += RATED.TAIL.ADD;
    if (photos === 't3') {
      const z = normal(r),
        c = normal(r) ** 2 + normal(r) ** 2 + normal(r) ** 2;
      e = (RATED.EPS * z) / Math.sqrt(c / 3) / Math.sqrt(3); // t3 has variance 3: scaled to EPS
    }
    eps[f] = e;
    ease[f] = Math.max(1, Math.min(5, Math.round(RATED.EASE.MID - (e + RATED.EASE.NOISE * normal(r)) / RATED.EASE.STEP)));
  });
  return {mu, eps, ease, pi: RATED.PI * normal(gen((seed * 2246822519) ^ 0x3c6ef372))};
}

// The model.js bindings the planner reads.
const MODEL = ['PDIFF', 'holdEase', 'answersSoFar', 'introReady', 'introSince', 'INTRO', 'introHold', 'holdStep', 'openPace', 'openRight', 'introduced', 'mayOpen', 'openChance', 'openPick', 'introAdd', 'openRecent', 'asked', 'nextTarget', 'examReady', 'examTyped', 'typedP', 'distractors', 'trapsFor', 'plausibleK', 'examSet', 'photoSet', 'PICKD', 'famOf', 'confTerm', 'pgLook', 'startP', 'genusDiff', 'EXAM', 'TYPED', 'mxKept', 'genScore', 'LV_AT', 'progPct', 'startSet', 'imrSaid', 'introMap'];
// model.js in a vm on the world's units, with the app's globals it reads (app.js) written here.
function engine(X, W, {app = 'truth', seed = 1, beyond = ''} = {}) {
  // Every unit's photos with the world's judged ease (p.e), the files unchanged.
  const G = {};
  [...X.c1, ...X.c2, ...X.c3, ...X.sci].forEach(n => {
    const g = X.gen[n];
    G[n] = {...g, views: {wide: (g.views.wide || []).map(p => ({...p, e: W.ease[p.f]}))}};
  });
  const mem = new Map(),
    store = {get: (k, d) => (mem.has(k) ? JSON.parse(mem.get(k)) : d), set: (k, v) => mem.set(k, JSON.stringify(v))},
    SUBJ = C.subjectOf('fish'),
    slate = [...X.c1, ...X.c2, ...X.c3],
    ctx = {...C, console, Math: Object.create(Math), store, SUBJ, DATA: {gen: {}}, P: {}, Q: {}, PMEM: [0, -0.45, -1.1, -1.7], PFMT: {}, last: null};
  ctx.Math.random = gen((seed * 2246822519) ^ 0x85ebca6b);
  const tree = X.tree,
    headScore = () => C.treeScore(ctx.P, tree, SUBJ.score),
    fishC3 = () => ((headScore().by[1] || {}).entries || 0) >= 0.55, // app.js FISH_C3.entries
    imr = () => ctx.imrSaid(),
    sci = () => {
      const at = (n, x) => ctx.introduced(n) || ctx.genScore(G[n].parent) >= x,
        auto = imr() ? X.sci.filter(n => G[n].imrg && at(n, ctx.LV_AT[0])) : [],
        units = X.sci.filter(n => !(imr() && G[n].imrg) && at(n, ctx.LV_AT[1]));
      return {auto, units};
    };
  Object.assign(ctx, {
    sDev: name => 'reefid-fish-' + name,
    sKey: name => C.subjKey('fish', name),
    syncSoon: () => {},
    GX: n => G[n],
    VIEWS: [['wide'], ['medium'], ['macro']],
    gamePics: (n, v) => (G[n] && G[n].views[v]) || [],
    gamePhotoOk: () => true,
    imrFormsOf: n => (G[n] || {}).forms || ['a'],
    isCore: () => false,
    rankOf: n => (G[n] || {}).rank || '',
    rankUnits: rk => X.sci.filter(n => (G[n].rank || '') === rk),
    slateGenera: () => slate,
    UNITS: {fish: {core: () => X.c1, slate: () => slate, tree: () => tree, gate: n => fishGate(n), opens: []}},
    bonusList: () => [...new Set([...(ctx.Q.sci ? sci().units : []), ...sci().auto])],
    pool: () => [...slate, ...ctx.bonusList()].filter(n => G[n].views.wide.length), // app.js pool: units with a photo to show
    openShut: n => (G[n] || {}).circle === 3 && beyond !== 'yes' && !X.c3.some(u => u in ctx.introMap()),
    headScore,
    sheetV: () => 1000,
    shuffle: a => {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(ctx.Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    pick: a => a[Math.floor(ctx.Math.random() * a.length)]
  });
  const fishGate = n => {
    const c = (G[n] || {}).circle || 1;
    if (c < 2) return true;
    return c < 3 ? X.c1.every(x => ctx.asked(x) && ctx.introduced(x)) : fishC3();
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'model.js'), 'utf8'), ctx, {filename: 'model.js'});
  // model.js's own bindings (its const and let live in the vm's global scope, not on ctx).
  const M = vm.runInContext('({' + MODEL.join(', ') + '})', ctx);
  Object.assign(ctx, {introduced: M.introduced, asked: M.asked, introMap: M.introMap, imrSaid: M.imrSaid, genScore: M.genScore, LV_AT: M.LV_AT});
  // Told the truth: every photo's and unit's difficulty as the world has it. photoDiff (a function declaration, so on
  // the vm's global object) gives the photo's; the unit offset PGD is set so that genusDiff (the offset plus the mean
  // judged-ease prior of its photos) gives the unit's mu.
  if (app === 'truth') {
    ctx.photoDiff = (n, p) => (W.mu[n] || 0) + (W.eps[p.f] || 0);
    const ez = C.calibOf(SUBJ).ease || 0,
      pgd = {};
    Object.keys(G).forEach(n => {
      const L = G[n].views.wide.filter(p => p.e),
        pr = L.length ? L.reduce((t, p) => t + (M.PDIFF.MID - p.e) * ez, 0) / L.length : 0;
      pgd[n] = [(W.mu[n] || 0) - pr];
    });
    // PGD is model.js's own (let): set in the vm's scope, and genusDiff's cache emptied.
    ctx.__pgd = pgd;
    vm.runInContext('PGD = __pgd; GDIFF = {};', ctx);
  }
  return {ctx, M, G, sci};
}

// quiz.js planPhoto's photo-quiz question on unit t (cards: the cards shown with it, start: the first ones): the exam's
// when the unit is ready for one; the traps the level asks for (trapsFor, with the opening hold's ease), the choices
// (distractors, never a unit opened on its own card now), typed with the unit's typed share; k the plausible choices
// while the traps are fewer than 2, else every choice (Codex review #787); the photo aimed lower by the hold's ease and
// the player's own mix-ups (confTerm), in its format (k2, k3, k4, typed), never the card's own cover.
function question(M, ctx, G, t, {list, cards = [], start = false}) {
  const ex = M.examReady(t) && M.examSet(t),
    ease = M.holdEase(),
    traps = ex ? 3 : M.trapsFor(t, ease),
    ch = ctx.shuffle([t, ...M.distractors(t, start ? list : list.filter(n => !cards.includes(n)), traps, n => cards.includes(n) || M.introduced(n))]),
    typed = ex ? M.examTyped(t) : M.typedP(t) > 0 && ctx.Math.random() < M.typedP(t),
    k = typed ? M.TYPED.k : traps < 2 ? M.plausibleK(t, ch) : ch.length,
    cf = typed ? 0 : M.confTerm(t, ch, k),
    fq = typed ? 'typed' : ch.length === 2 ? 'again' : k < 4 ? (k >= 3 ? 'k3' : 'k2') : 'k4',
    cov = cards.includes(t) ? G[t].cover : null,
    set = ex || M.photoSet(t, typeof cov === 'string' ? cov : (cov || {}).f || null, ease - cf, k, fq);
  return {exam: !!ex, typed, chs: typed ? [] : ch, k, fq, traps, ease, cf, set};
}
// quiz.js answer: the unit's last two observations shown (s.ro), which photoSet holds back (Codex review #787).
const noteRecent = (s, ph) => {
  if (ph[0]) s.ro = [...(s.ro || []).filter(o => o !== (ph[0].o || ph[0].f)), ph[0].o || ph[0].f].slice(-2);
};

// One run: profile (learnprof name) x seed, N answers, checkpoints cps.
function runOne(X, {profile, seed, N, cps, photos = 'normal', app = 'truth', beyond = '', keep = false}) {
  const W = world(X, seed, photos),
    {ctx, M, G} = engine(X, W, {app, seed, beyond}),
    prof = LP.profOf(profile, 'fish'),
    r = gen((seed * 2654435761) ^ 0x9e3779b9),
    slate = ctx.slateGenera(),
    knows = LP.knownUnits(prof, {SL: slate, group: () => 0, numbered: () => false, core: X.c1, tree: X.tree.f}),
    know = {};
  slate.forEach(n => (know[n] = knows.has(n) ? prof.hi : prof.lo));
  X.sci.forEach(n => (know[n] = LP.genKnown(prof, knows, G[n].parent, G[n].imrg) ? prof.hi : prof.lo));
  const teach = n => (know[n] += prof.rate * (1 - know[n])),
    trueD = (n, p) => (W.mu[n] || 0) + (W.eps[p.f] || 0),
    pRec = (n, d) => sig(logit(know[n]) + W.pi - d - RATED.SINGLE),
    dStar = n => {
      const L = G[n].views.wide || []; // every game photo of the unit
      return L.length ? L.reduce((t, p) => t + pRec(n, trueD(n, p)), 0) / L.length : null;
    },
    U = [...slate, ...X.sci],
    kindOf = n => (G[n].rank === 'genus' ? 'genus' : 'family'),
    mean = A => (A.length ? A.reduce((a, x) => a + x, 0) / A.length : null);
  // The first-launch answer (--choice auto, learnsim AUTO): the IMR RAs "imr", the strong RA and the expert "know".
  const choice = {beginner: 'new', casualDiver: 'new', lectureRA: 'imr', strongRA: 'know', expert: 'know'}[profile] || 'new';
  M.startSet(choice, 'tour');
  const rows = [],
    expo = [],
    preOW = [],
    owAt = {},
    advAt = {},
    c3 = {offer: null, met: null},
    plat = {best: 0, since: 0, max: 0};
  let rights = 0,
    blk = {n: 0, ok: 0},
    lastCard = -Infinity;
  // quiz.js introStart: the first cards, INTRO.START units of the slate (not a set's), easiest and most common first.
  const introStart = list => {
    const sl = list.filter(n => !X.sci.includes(n)),
      want = M.INTRO.START - sl.filter(M.introduced).length,
      L = [],
      met = n => M.introduced(n) || L.includes(n);
    for (let fresh = sl.filter(n => !M.introduced(n) && M.mayOpen(n)); L.length < want && fresh.length; fresh = fresh.filter(n => n !== L[L.length - 1]))
      L.push(M.openPick(fresh, fresh, met));
    return L;
  };
  const P = () => ctx.P,
    shown = () => C.treeScore(ctx.P, X.tree, ctx.SUBJ.score).pct;
  for (let i = 0; i < N; i++) {
    const at = M.answersSoFar(),
      list = ctx.pool();
    // The scientific names' offer (app.js UNITS fish sets: a family at Advanced): accepted, or declined (names common).
    if (ctx.Q.sci === undefined && slate.some(n => M.genScore(n) >= M.LV_AT[1])) ctx.Q.sci = prof.names !== 'common';
    // The first cards, else a card when the path allows one (quiz.js planPhoto).
    let cards = introStart(list);
    const start = cards.length > 0,
      met = list.filter(M.introReady);
    if (!start && met.length && M.introSince() >= M.INTRO.EVERY && !M.introHold() && M.openPace(at, []) && M.openRight(at)) {
      const fresh = list.filter(n => !M.introduced(n) && M.mayOpen(n));
      if (fresh.length && ctx.Math.random() < M.openChance(list)) cards = [M.openPick(fresh, list)];
    }
    if (cards.length) M.introAdd(cards, start);
    if (cards.length) lastCard = i;
    cards.forEach(teach);
    const due = start ? [] : M.openRecent(at).filter(n => !M.asked(n) && M.introReady(n) && list.includes(n)),
      t = M.nextTarget(start ? cards : due.length ? due : met.length ? met : list);
    if (c3.met === null && X.c3.some(M.introduced)) c3.met = i + 1;
    // The question: an exam question when its unit is ready for one, else the photo quiz's; typed or among choices.
    const {exam, typed, chs, k, set} = question(M, ctx, G, t, {list, cards, start}),
      same = list.filter(n => n !== t && M.introduced(n) && kindOf(n) === kindOf(t)),
      ph = set.shown || [];
    if (!ph.length) throw new Error(`no photo for ${t} at answer ${i + 1} (exam ${exam}, typed ${typed}, k ${k}): ${JSON.stringify(set).slice(0, 200)}`);
    const d = mean(ph.map(p => trueD(t, p))),
      rec = r() < pRec(t, d);
    let c = t;
    if (!rec) {
      if (typed) c = r() < 0.5 ? '' : (same.length ? same[Math.floor(r() * same.length)] : '') || '';
      else c = chs[Math.floor(r() * chs.length)];
    }
    const ok = c === t;
    expo.push([t, ph[0].o || ph[0].f, ...ph.map(p => p.f)]);
    preOW.push([M.genScore(t) + 1e-9 < M.LV_AT[0] ? 1 : 0, Math.min(...ph.map(p => p.e || 0))]);
    const q = C.scoreIn({
      t,
      c,
      ok,
      k,
      chs,
      cv: !!G[c],
      ph: ph.map(p => p.f),
      d0: (ph.length === 1 ? M.PICKD.SINGLE : 0) + mean(ph.map(p => ctx.photoDiff(t, p))),
      fam: M.famOf(t, ph),
      cf: M.confTerm(t, chs, k),
      look: () => M.pgLook(t, chs),
      R: 1,
      Rc: 1,
      p: M.startP(),
      timed: false,
      df: 0,
      dt: 0,
      dom: true,
      mu: M.genusDiff(t),
      ...(!ok && G[c] ? {muc: M.genusDiff(c)} : {})
    });
    const res = C.scoreAnswer(P(), q);
    if (typeof res.e === 'number') M.holdStep(res.e, ok); // the opening hold (quiz.js answer)
    // The exam (quiz.js answer): a miss ends it; EXAM.n right with TYPED.exam typed passes it.
    const s = P()[t];
    noteRecent(s, ph);
    if (!ok) delete s.ex;
    else if (exam) {
      const ex = s.ex || {k: 0, v: [], ts: 0};
      ex.k = Math.min(M.EXAM.n, ex.k + 1);
      ex.t = (ex.t || 0) + (typed ? 1 : 0);
      ex.v = [...new Set([...(ex.v || []), ph[0].view].filter(Boolean))]; // the views the exam showed (examSet)
      ex.at = M.answersSoFar();
      if (ex.k >= M.EXAM.n && ex.t >= M.TYPED.exam) ((s.mx = 1), delete s.ex);
      else s.ex = ex;
    }
    if (!ok && G[c] && P()[c]) delete P()[c].ex;
    if (!ok) [t, ...(G[c] ? [c] : [])].forEach(n => P()[n] && P()[n].mx && !M.mxKept(n) && delete P()[n].mx);
    teach(t);
    rights += ok;
    blk.n++;
    blk.ok += ok;
    U.forEach(n => {
      if (!M.introduced(n) || (n in owAt && n in advAt)) return;
      const b = M.genScore(n) + 1e-9;
      if (!(n in owAt) && b >= M.LV_AT[0]) owAt[n] = i + 1;
      if (!(n in advAt) && b >= M.LV_AT[1]) advAt[n] = i + 1;
    });
    const sp = shown();
    if (sp > plat.best) ((plat.best = sp), (plat.since = 0));
    else plat.max = Math.max(plat.max, ++plat.since);
    if (cps.includes(i + 1)) {
      const metU = slate.filter(M.introduced),
        ds = Object.fromEntries(metU.map(n => [n, dStar(n)])),
        h = C.treeScore(ctx.P, X.tree, ctx.SUBJ.score),
        r4 = x => Math.round(x * 1e4) / 1e4,
        comp = o => ({entries: r4(o.entries), genera: r4(o.genera), common: r4(o.common), scientific: r4(o.scientific), S: r4(o.S), credit: r4(o.credit), raw: r4(o.raw), pct: o.pct});
      rows.push({
        q: i + 1,
        dStar: mean(slate.map(dStar)),
        knowSlate: mean(slate.map(n => know[n])),
        met: metU.length,
        right: (100 * blk.ok) / blk.n,
        prog: M.progPct(slate),
        f: {gs: Object.fromEntries(metU.map(n => [n, r4(M.genScore(n))])), ds: Object.fromEntries(metU.map(n => [n, r4(ds[n])]))},
        kinds: Object.fromEntries(
          ['family', 'genus'].map(kd => {
            const L = U.filter(n => kindOf(n) === kd),
              Lm = L.filter(M.introduced),
              dm = Lm.map(dStar);
            return [
              kd,
              {
                n: L.length,
                met: Lm.length,
                ow: L.filter(n => M.genScore(n) + 1e-9 >= M.LV_AT[0]).length,
                adv: L.filter(n => M.genScore(n) + 1e-9 >= M.LV_AT[1]).length,
                dStar: mean(dm),
                over: mean(Lm.map((n, j) => M.genScore(n) - dm[j]))
              }
            ];
          })
        ),
        score: {...comp(h), by: Object.fromEntries(Object.entries(h.by || {}).map(([cc, o]) => [cc, comp(o)]))},
        plateau: plat.max
      });
      blk = {n: 0, ok: 0};
    }
  }
  return {
    profile,
    seed,
    pi: W.pi,
    rows,
    owAt,
    advAt,
    kinds: Object.fromEntries(U.map(n => [n, kindOf(n)])),
    c3,
    expo,
    preOW,
    knows: [...knows],
    right: rights / Math.max(1, N),
    ...(keep ? {P: ctx.P} : {}), // the app's records, for the tests
    lastCard
  };
}

module.exports = {RATED, world, engine, runOne, fishUnits, question, noteRecent};

// The rated world's checkpoints: the guardrails' (LEARNING.md) up to the horizon, and the horizon.
const checkpoints = N => [...new Set([100, 300, 1000, 3000, 10000, 30000].filter(q => q <= N).concat([N]))].sort((a, b) => a - b);

// learnsim --world rated: every (profile, seed) run on workers threads, the printed summary and the --out file.
async function main(o) {
  const {Worker} = require('worker_threads'),
    t0 = Date.now(),
    cps = checkpoints(o.N),
    jobs = [];
  for (let s = o.seed0 + 1; s <= o.seed0 + o.seeds; s++) for (const profile of o.profiles) jobs.push({profile, seed: s, N: o.N, cps, photos: o.dist, app: o.app, beyond: o.beyond, learner: o.learner});
  const runs = [];
  await Promise.all(
    Array.from({length: Math.max(1, Math.min(o.workers, jobs.length))}, () => {
      const w = new Worker(__filename, {workerData: 1});
      return new Promise((ok, ko) => {
        const next = () => {
          const j = jobs.shift();
          if (!j) return w.terminate().then(ok);
          w.postMessage(j);
        };
        w.on('message', r => {
          runs.push(r);
          process.stderr.write(`\r${runs.length} runs, ${Math.round((Date.now() - t0) / 1000)} s`);
          next();
        });
        w.on('error', ko);
        next();
      });
    })
  );
  runs.sort((a, b) => o.profiles.indexOf(a.profile) - o.profiles.indexOf(b.profile) || a.seed - b.seed);
  const secs = (Date.now() - t0) / 1000,
    m = v => {
      v = v.filter(x => typeof x === 'number' && isFinite(x));
      return v.length ? v.reduce((a, x) => a + x, 0) / v.length : null;
    },
    f = (x, d) => (x === null ? '-' : x.toFixed(d));
  console.log(
    `\nRated world (fish; photos ${o.dist}, the app ${o.app === 'truth' ? 'told the truth' : 'on its own estimate'}): ${o.profiles.join(', ')}; ${o.seeds} seeds x ${o.N} answers; ${runs.length} runs in ${secs.toFixed(0)} s`
  );
  console.log('right%: since the previous checkpoint; D*: true knowledge of the families; E: bar - D*, families met; OW / Adv: families, genera at Open Water / Advanced');
  for (const p of o.profiles) {
    const R = runs.filter(r => r.profile === p);
    console.log(`\n${p} (pi ${R.map(r => r.pi.toFixed(2)).join(' ')})`);
    cps.forEach((q, i) => {
      const w = R.map(r => r.rows[i]).filter(Boolean),
        g = fn => m(w.map(fn));
      console.log(
        `  ${String(q).padStart(6)}  right ${f(g(x => x.right), 0)}  met ${f(g(x => x.met), 1)}  D* ${f(g(x => x.dStar), 3)}  E ${f(g(x => x.kinds.family.over), 3)}  OW ${f(g(x => x.kinds.family.ow), 1)} / ${f(g(x => x.kinds.genus.ow), 1)}  Adv ${f(g(x => x.kinds.family.adv), 1)} / ${f(g(x => x.kinds.genus.adv), 1)}  score ${f(g(x => x.score.pct), 1)} (entries ${f(g(x => x.score.entries), 3)}, credit ${f(g(x => x.score.credit), 3)})  plateau ${f(g(x => x.plateau), 0)}`
      );
    });
  }
  if (o.out) {
    fs.writeFileSync(
      o.out,
      JSON.stringify(
        {
          date: new Date().toISOString(),
          commit: o.commit,
          world: 'rated',
          subject: 'fish',
          seeds: o.seeds,
          seed0: o.seed0,
          questions: o.N,
          checkpoints: cps,
          profiles: Object.fromEntries(o.profiles.map(n => [n, LP.profOf(n, 'fish')])),
          rated: RATED,
          dist: o.dist,
          learnerKind: o.learner || 'count',
          app: o.app,
          beyond: o.beyond || null,
          seconds: secs,
          runs
        },
        null,
        1
      )
    );
    console.log(`\nWritten: ${o.out}`);
  }
}

module.exports.main = main;
module.exports.checkpoints = checkpoints;
// A worker thread of main: runs the jobs it is sent.
if (!require('worker_threads').isMainThread && require('worker_threads').workerData === 1) {
  const {parentPort} = require('worker_threads'),
    X = fishUnits();
  parentPort.on('message', j => parentPort.postMessage(runOne(X, j)));
}
