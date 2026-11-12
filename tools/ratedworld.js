// The rated world (rule L11; docs/LEARNING.md "Validating a learning change", "The two worlds"): a fully rated, synthetic
// world beside the app world, where every unit and photo has a continuous Elo difficulty and every player an ability
// offset, drawn from the distributions below (RATED, the one place they are stated), and the app's own engine runs on
// it in Node: core.js (scoreAnswer, the bar's domStep, the Elo, treeScore) and model.js loaded whole in a vm (the aim,
// the start's lean, photoSet with its Gaussian photo choice and RARE, typed questions, drawW, shaky, OPEN.K, openPace,
// openRight, openPick, the exam), the fish units built as the app builds them (core.js fishGen and fishPhotos, app.js
// fishGenera). Only the planner around them is written here, as quiz.js planPhoto does it: the first cards, a card when
// the path allows one (INTRO.EVERY, openPace, openRight, openChance), the target drawn among the units met (nextTarget),
// a unit opened on a card asked as soon as it is ready; no Again, duel or comeback (they are not in the rated world).
// Both subjects: the fish units built as the app builds them (above), the corals' too (coralUnits); --learner count or item.
//
//   node tools/learnsim.js --world rated [--subject fish] [--seeds 10] [--questions 3000] [--profiles ...]
//                          [--learner count|item] [--dist normal|tail|t3] [--app truth|own|sheet] [--beyond yes|no] [--out rated.json]
//                          [--times rho25|rho0|views|fast] [--every 25] [--gap -0.22]
// --app sheet (2026-11-09, Q315 level 2): the sheet's photo Elo simulated on a population's own answers (runPop, below).
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
// right, prog, f {gs, ds}, kinds, score, plateau, level: the global level P['~level'].th), owAt, advAt, kinds, c3, expo,
// preOW, knows, and lv, the global level every LV_EVERY answers; the file says world 'rated'.
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
  SINGLE: 0.5,
  // The corals' genus spread: the SD of the sheet's genus offsets gd, 0.286 as #637 measured them with the photos rated
  // against the genus ability (0.370 with today's rating against the level: the sensitivity variant, --coralsd 0.37).
  CORAL_GD: 0.286
};
// The global level's trace (lv): one value every LV_EVERY answers.
const LV_EVERY = 25;

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
    gm = C.fishGameRead(J('fish-game.json')),
    CUR = J('curation.json'),
    src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'),
    ctx = vm.createContext({...C, Math, Map, Set, Object, Array, JSON, String, Number}),
    fishGenera = vm.runInContext('(' + cut(src, 'function fishGenera(', '\n}\n', {through: 1, file: 'app.js'}) + ')', ctx);
  return (XCACHE = fishGenera(C.fishGen(F, C.fishPhotos(ph.photos, gm.photos, CUR, F), ph.sheet), F));
}

// The coral units as the app builds them (app.js build: core.js applyCuration and applySlots, app.js applyForms; the
// extra genera, Millepora and the bonus genera, the same way), and imrFormsOf on them.
let DCACHE = null;
function coralUnits() {
  if (DCACHE) return DCACHE;
  const J = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')),
    d = J('data.json'),
    CUR = J('curation.json'),
    fj = J('forms.json'),
    autoq = J('quality.json').q || {},
    picks = J('picks.json'),
    // app.js forms(): gunsure a list in the file, a lookup in the app
    FORMS = {gf: fj.gf || {}, form: fj.form || {}, cf: fj.cf || {}, forms: fj.forms || [], gunsure: Object.fromEntries((fj.gunsure || []).map(f => [f, 1]))},
    GX = n => d.gen[n] || ((d.x || {}).gen || {})[n],
    src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'),
    ctx = vm.createContext({...C, FORMS, CFMAP: FORMS.cf, DATA: d, GX});
  vm.runInContext(
    cut(src, 'function applyForms(', '\n}\n', {through: 1, file: 'app.js'}) +
      '\n' +
      cut(src, 'const imrFormsOf = ', '\n};\n', {through: 1, file: 'app.js'}) +
      '\nglobalThis.__f = {applyForms, imrFormsOf};',
    ctx
  );
  C.applyCuration(d, CUR);
  ctx.__f.applyForms(d, CUR);
  C.applySlots(d, CUR, {picks, autoq});
  if (d.x) {
    const x = {gen: d.x.gen, course: {}, cand: d.cand};
    C.applyCuration(x, CUR);
    ctx.__f.applyForms(x, CUR);
    C.applySlots(x, CUR, {picks, autoq});
  }
  return (DCACHE = {d, GX, imrFormsOf: ctx.__f.imrFormsOf});
}
// A subject's units in one shape: slate (the slate in order), extra (the units of its opt-in set: the fish scientific
// genera, the coral bonus genera), rec(n) (the unit's record), views (the game photos per view), core (circle 1, or the
// slate), c3 (the circle opened by choice), tree (the global score's, or null), kind(n), DATA.
const VIEWN = ['wide', 'medium', 'macro'];
function unitsOf(subject) {
  if (subject === 'fish') {
    const X = fishUnits();
    return {
      subject,
      X,
      DATA: {gen: {}},
      slate: [...X.c1, ...X.c2, ...X.c3],
      extra: X.sci,
      setK: 'sci',
      rec: n => X.gen[n],
      views: n => ({wide: X.gen[n].views.wide || []}),
      core: X.c1,
      c3: X.c3,
      tree: X.tree,
      kind: n => (X.gen[n].rank === 'genus' ? 'genus' : 'family'),
      imrFormsOf: n => X.gen[n].forms || ['a']
    };
  }
  const {d, GX, imrFormsOf} = coralUnits(),
    slate = C.slateOf(d),
    extra = C.BONUS.filter(n => GX(n));
  return {
    subject,
    DATA: d,
    slate,
    extra,
    setK: 'bon',
    rec: GX,
    views: n => Object.fromEntries(VIEWN.map(v => [v, ((GX(n).sl || {})[v] ? GX(n).sl[v].game : GX(n).views[v]) || []])),
    core: slate,
    c3: [],
    tree: null,
    kind: n => (extra.includes(n) ? 'bonus' : 'genus'),
    imrFormsOf
  };
}

// The world of one seed (above): mu per unit, eps and the judged ease per photo file, the player's pi.
function world(U, seed, photos = 'normal', {coralSd = RATED.CORAL_GD} = {}) {
  if (!U.slate) U = unitsOfX(U);
  const r = gen((seed * 2654435761) ^ 0x51ed270b),
    mu = {},
    eps = {},
    ease = {};
  if (U.subject === 'fish') {
    U.slate.forEach(n => (mu[n] = RATED.FAM * normal(r) + ((U.rec(n).look || []).length ? RATED.LOOK : 0)));
    U.extra.forEach(n => (mu[n] = (mu[U.rec(n).parent] || 0) + RATED.SUB * normal(r) + ((U.rec(n).look || []).length ? RATED.SIB : 0)));
  } else [...U.slate, ...U.extra].forEach(n => (mu[n] = coralSd * normal(r)));
  const files = [...new Set([...U.slate, ...U.extra].flatMap(n => Object.values(U.views(n)).flatMap(L => L.map(p => p.f))))].sort();
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
  return {mu, eps, ease, pi: piOf(seed)};
}
// The player's offset of a seed's world, on a stream of its own (so a test reads it for many seeds without their worlds).
const piOf = seed => RATED.PI * normal(gen((seed * 2246822519) ^ 0x3c6ef372));
// The fish units given as built by fishUnits (the tests' X), in the shape of unitsOf.
const unitsOfX = X => (X === fishUnits() ? unitsOf('fish') : X);

// The model.js bindings the planner reads.
const MODEL = ['PDIFF', 'holdEase', 'answersSoFar', 'introReady', 'introSince', 'INTRO', 'introHold', 'holdStep', 'openPace', 'openRight', 'introduced', 'mayOpen', 'openChance', 'openPick', 'introAdd', 'openRecent', 'asked', 'nextTarget', 'examReady', 'examTyped', 'typedP', 'distractors', 'trapsFor', 'plausibleK', 'examSet', 'photoSet', 'PICKD', 'famOf', 'confTerm', 'pgLook', 'startP', 'genusDiff', 'EXAM', 'TYPED', 'mxKept', 'genScore', 'LV_AT', 'progPct', 'startSet', 'imrSaid', 'introMap'];
// model.js in a vm on the world's units, with the app's globals it reads (app.js) written here.
function engine(U, W, {app = 'truth', seed = 1, beyond = ''} = {}) {
  if (!U.slate) U = unitsOfX(U);
  const subject = U.subject,
    all = [...U.slate, ...U.extra],
    // Every unit's record with its game photos per view, each with the world's judged ease (p.e) where the subject has
    // one (the fish; no coral photo is judged).
    G = {};
  all.forEach(n => {
    const v = U.views(n);
    G[n] = {...U.rec(n), views: Object.fromEntries(Object.entries(v).map(([k, L]) => [k, subject === 'fish' ? L.map(p => ({...p, e: W.ease[p.f]})) : L]))};
  });
  const mem = new Map(),
    store = {get: (k, d) => (mem.has(k) ? JSON.parse(mem.get(k)) : d), set: (k, v) => mem.set(k, JSON.stringify(v))},
    SUBJ = C.subjectOf(subject),
    slate = U.slate,
    ctx = {...C, console, Math: Object.create(Math), store, SUBJ, DATA: U.DATA, P: {}, Q: {}, PMEM: [0, -0.45, -1.1, -1.7], PFMT: {}, last: null};
  ctx.Math.random = gen((seed * 2246822519) ^ 0x85ebca6b);
  const tree = U.tree,
    headScore = () => (tree ? C.treeScore(ctx.P, tree, SUBJ.score) : null),
    fishC3 = () => ((headScore().by[1] || {}).entries || 0) >= 0.55, // app.js FISH_C3.entries
    imr = () => ctx.imrSaid(),
    // The opt-in set's units in play (app.js UNITS sets): the fish scientific genera, from their family's Advanced
    // (Open Water for an IMR genus of an IMR player, without the offer: sciOpen); the coral bonus genera once on.
    setUnits = () => {
      if (subject !== 'fish') return {auto: [], units: U.extra};
      const at = (n, x) => ctx.introduced(n) || ctx.genScore(G[n].parent) >= x,
        auto = imr() ? U.extra.filter(n => G[n].imrg && at(n, ctx.LV_AT[0])) : [],
        units = U.extra.filter(n => !(imr() && G[n].imrg) && at(n, ctx.LV_AT[1]));
      return {auto, units};
    },
    gate = n => {
      const c = (G[n] || {}).circle || 1;
      if (c < 2) return true;
      return c < 3 ? U.core.every(x => ctx.asked(x) && ctx.introduced(x)) : fishC3();
    },
    has = n => VIEWN.some(v => (G[n].views[v] || []).length);
  Object.assign(ctx, {
    sDev: name => `reefid-${subject}-${name}`,
    sKey: name => C.subjKey(subject, name),
    syncSoon: () => {},
    GX: n => G[n],
    VIEWS: VIEWN.map(v => [v]),
    gamePics: (n, v) => (G[n] && G[n].views[v]) || [],
    gamePhotoOk: (n, p) => !G[n].x || p.own || !p.gid, // app.js gamePhotoOk
    imrFormsOf: n => U.imrFormsOf(n),
    isCore: p => !!(SUBJ.tiers && (p.imr || p.own)),
    rankOf: n => (G[n] || {}).rank || '',
    rankUnits: rk => U.extra.filter(n => (G[n].rank || '') === rk),
    slateGenera: () => slate,
    UNITS: {[subject]: tree ? {core: () => U.core, slate: () => slate, tree: () => tree, gate, opens: []} : {slate: () => slate, opens: []}},
    bonusList: () => [...new Set([...(ctx.Q[U.setK] ? setUnits().units : []), ...setUnits().auto])],
    // app.js setLater (Q208 A): a fish scientific genus waits while a family in play is still to open (model.js openPick),
    // unless it is an auto unit (an IMR player's IMR genus) or the set was turned on by hand early (Q.sciH, Q240).
    setLater: n => subject === 'fish' && U.extra.includes(n) && !ctx.Q[U.setK + 'H'] && !setUnits().auto.includes(n),
    pool: () => [...slate, ...ctx.bonusList()].filter(has), // app.js pool: units with a photo to show
    openShut: n => U.c3.includes(n) && beyond !== 'yes' && !U.c3.some(u => u in ctx.introMap()),
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
      const L = [...new Set(VIEWN.flatMap(v => G[n].views[v] || []))].filter(p => p.e),
        pr = L.length ? L.reduce((t, p) => t + (M.PDIFF.MID - p.e) * ez, 0) / L.length : 0;
      pgd[n] = [(W.mu[n] || 0) - pr];
    });
    // PGD is model.js's own (let): set in the vm's scope, and genusDiff's cache emptied.
    ctx.__pgd = pgd;
    vm.runInContext('PGD = __pgd; GDIFF = {};', ctx);
  }
  return {ctx, M, G, U};
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

// The judge's photo population of unit n: every game photo the game may ask (app.js gamePhotoOk, as photoSet reads it:
// an extra genus's only Pierre's own or Research Grade; Codex review #789).
const judgePhotos = (ctx, G, n) => [...new Set(VIEWN.flatMap(v => G[n].views[v] || []))].filter(p => ctx.gamePhotoOk(n, p));
// The units a typed answer on t may name instead: the others met, of t's rank (quiz.js typeMatch: a coral bonus genus and
// a slate genus alike; Codex review #789), not of its reporting kind.
const typedOthers = (G, list, t, met) => list.filter(n => n !== t && met(n) && (G[n].rank || '') === (G[t].rank || ''));
// One run: profile (learnprof name) x seed, N answers, checkpoints cps; learner 'count' (by the number of answers) or
// 'item' (the gain depends on the answer, as learnsim's item learner: a miss teaches MISS times more, the unit wrongly
// given PICKED, a card as one right answer).
const ITEM = {MISS: 1.5, PICKED: 0.5};
function runOne(U, {profile, seed, N, cps, photos = 'normal', app = 'truth', beyond = '', learner = 'count', subject, coralSd, keep = false}) {
  if (subject) U = unitsOf(subject);
  if (!U.slate) U = unitsOfX(U);
  const W = world(U, seed, photos, coralSd ? {coralSd} : {}),
    pl = playerOf(U, W, {profile, seed, N, cps, app, beyond, learner, keep});
  for (let i = 0; i < N; i++) pl.step(i);
  return pl.result();
}
// One player in world W (runOne's, or one of a population's: runPop): step(i) plays answer i + 1 and returns it ({t, c,
// ok, k, typed, chs, ph: the files shown}); result() the run as runOne returns it. rseed seeds the app's and the learner's
// generators (the world's seed by default), pi the player's ability offset (the world's by default); ctx the app's vm
// (runPop serves it the sheet's statistics).
function playerOf(U, W, {profile, seed, N, cps, app = 'truth', beyond = '', learner = 'count', keep = false, rseed = seed, pi = W.pi}) {
  const {ctx, M, G} = engine(U, W, {app, seed: rseed, beyond}),
    prof = LP.profOf(profile, U.subject),
    r = gen((rseed * 2654435761) ^ 0x9e3779b9),
    slate = U.slate,
    knows = LP.knownUnits(prof, {
      SL: slate,
      group: n => C.lectureGroup(U.DATA, n),
      numbered: n => ((U.DATA.gen || {})[n] || {}).n > 0,
      core: U.core,
      tree: U.tree ? U.tree.f : []
    }),
    know = {};
  slate.forEach(n => (know[n] = knows.has(n) ? prof.hi : prof.lo));
  U.extra.forEach(n => (know[n] = LP.genKnown(prof, knows, G[n].parent, G[n].imrg) ? prof.hi : prof.lo));
  const teach = (n, x = 1) => n in know && (know[n] += Math.min(1, prof.rate * x) * (1 - know[n])),
    trueD = (n, p) => (W.mu[n] || 0) + (W.eps[p.f] || 0),
    pRec = (n, d, single = true) => sig(logit(know[n]) + pi - d - (single ? RATED.SINGLE : 0)),
    dStar = n => {
      const L = judgePhotos(ctx, G, n);
      return L.length ? L.reduce((t, p) => t + pRec(n, trueD(n, p)), 0) / L.length : null;
    },
    UA = [...slate, ...U.extra],
    kindOf = U.kind,
    KINDS = [...new Set(UA.map(kindOf))],
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
    plat = {best: 0, since: 0, max: 0},
    lv = [];
  let rights = 0,
    blk = {n: 0, ok: 0};
  // quiz.js introStart: the first cards, INTRO.START units of the slate (not a set's), easiest and most common first.
  const introStart = list => {
    const sl = list.filter(n => !U.extra.includes(n)),
      want = M.INTRO.START - sl.filter(M.introduced).length,
      L = [],
      met = n => M.introduced(n) || L.includes(n);
    for (let fresh = sl.filter(n => !M.introduced(n) && M.mayOpen(n)); L.length < want && fresh.length; fresh = fresh.filter(n => n !== L[L.length - 1]))
      L.push(M.openPick(fresh, fresh, met));
    return L;
  };
  const P = () => ctx.P,
    shown = () => (U.tree ? C.treeScore(ctx.P, U.tree, ctx.SUBJ.score).pct : M.progPct(slate));
  const step = i => {
    const at = M.answersSoFar(),
      list = ctx.pool();
    // The opt-in set's offer (app.js UNITS sets): the fish scientific names once a family is at Advanced, accepted or
    // declined (names common); the coral bonus genera once every slate genus is met, accepted (as learnsim).
    if (ctx.Q[U.setK] === undefined && (U.subject === 'fish' ? slate.some(n => M.genScore(n) >= M.LV_AT[1]) : slate.every(n => M.asked(n) && M.introduced(n))))
      ctx.Q[U.setK] = prof.names !== 'common';
    // The first cards, else a card when the path allows one (quiz.js planPhoto).
    let cards = introStart(list);
    const start = cards.length > 0,
      met = list.filter(M.introReady);
    if (!start && met.length && M.introSince() >= M.INTRO.EVERY && !M.introHold() && M.openPace(at, []) && M.openRight(at)) {
      const fresh = list.filter(n => !M.introduced(n) && M.mayOpen(n));
      if (fresh.length && ctx.Math.random() < M.openChance(list)) cards = [M.openPick(fresh, list)];
    }
    if (cards.length) M.introAdd(cards, start);
    cards.forEach(n => teach(n));
    const due = start ? [] : M.openRecent(at).filter(n => !M.asked(n) && M.introReady(n) && list.includes(n)),
      t = M.nextTarget(start ? cards : due.length ? due : met.length ? met : list);
    if (c3.met === null && U.c3.some(M.introduced)) c3.met = i + 1;
    // The question: an exam question when its unit is ready for one, else the photo quiz's; typed or among choices.
    const {exam, typed, chs, k, set} = question(M, ctx, G, t, {list, cards, start}),
      same = typedOthers(G, list, t, M.introduced),
      ph = set.shown || [];
    if (!ph.length) throw new Error(`no photo for ${t} at answer ${i + 1} (exam ${exam}, typed ${typed}, k ${k}): ${JSON.stringify(set).slice(0, 200)}`);
    const d = mean(ph.map(p => trueD(t, p))),
      rec = r() < pRec(t, d, ph.length === 1),
      // The learner's true logit on this question (ability - difficulty, recognition), before it learns from it: the
      // knowledge-gap term of the simulated seconds (runPop, --gap).
      gap = logit(know[t]) + pi - d - (ph.length === 1 ? RATED.SINGLE : 0);
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
    // The learner learns: by the number of answers, or by the answer (ITEM).
    if (learner === 'item') {
      teach(t, ok ? 1 : ITEM.MISS);
      if (!ok && G[c]) teach(c, ITEM.PICKED);
    } else teach(t);
    rights += ok;
    blk.n++;
    blk.ok += ok;
    UA.forEach(n => {
      if (!M.introduced(n) || (n in owAt && n in advAt)) return;
      const b = M.genScore(n) + 1e-9;
      if (!(n in owAt) && b >= M.LV_AT[0]) owAt[n] = i + 1;
      if (!(n in advAt) && b >= M.LV_AT[1]) advAt[n] = i + 1;
    });
    const sp = shown();
    if (sp > plat.best) ((plat.best = sp), (plat.since = 0));
    else plat.max = Math.max(plat.max, ++plat.since);
    // The global level (P['~level'].th) every LV_EVERY answers (2026-11-12, Q338: a rule keyed on the level).
    if ((i + 1) % LV_EVERY === 0) lv.push(Math.round((((P()['~level'] || {}).th || 0) * 1e3)) / 1e3);
    if (cps.includes(i + 1)) {
      const metU = slate.filter(M.introduced),
        ds = Object.fromEntries(metU.map(n => [n, dStar(n)])),
        h = U.tree ? C.treeScore(ctx.P, U.tree, ctx.SUBJ.score) : null,
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
          KINDS.map(kd => {
            const L = UA.filter(n => kindOf(n) === kd),
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
        score: h ? {...comp(h), by: Object.fromEntries(Object.entries(h.by || {}).map(([cc, o]) => [cc, comp(o)]))} : {pct: shown()},
        plateau: plat.max,
        level: r4((P()['~level'] || {}).th || 0)
      });
      blk = {n: 0, ok: 0};
    }
    return {t, c, ok, k, typed, chs, ph: ph.map(p => p.f), gap};
  };
  const result = () => ({
    profile,
    seed,
    pi,
    rows,
    owAt,
    advAt,
    kinds: Object.fromEntries(UA.map(n => [n, kindOf(n)])),
    c3,
    expo,
    preOW,
    knows: [...knows],
    right: rights / Math.max(1, N),
    lv,
    ...(keep ? {P: ctx.P} : {}) // the app's records, for the tests
  });
  return {step, result, ctx, M, G, trueD};
}

// The sheet's photo Elo in the rated world (--app sheet; Q315 level 2, rule L11): a population of players, one per
// profile, plays the same world in turn (one answer each, round after round), their answers logged as the Answers tab
// holds them (readAnswers rows, with seconds), and every EVERY rounds the sheet's photo Elo (core.js eloOf,
// genusOffsetsOf, photoMemOf, as Code.gs stats_) is replayed on the log and served to every player's app (PSTAT, PGD, PMEM:
// model.js photoDiff, genusDiff, famOf), as ?stats=1 serves them. So the photo ratings the draw reads are learned from
// the players' own answers, and a change to the rating changes what every player meets.
// Response times (RT, the one place their distribution is stated; LEARNING.md "Response time: genus and photo": the
// player's medians 3.9 to 11.2 s, a photo sd 0.35 in log, a residual about 0.57, a right answer 0.67 times as long as a
// miss, RIGHT = log 0.67, as on the real log): an
// answer's log seconds = T0 + the mean over its photos of the photo's time intensity beta + (views only) VIEW per view
// beyond the first - the player's speed tau + RIGHT if right + TYPED if typed + NOISE x N(0, 1), drawn from a generator
// of its own per answer (the answers and the draws never depend on it unless the rating reads it). beta by case (TIMES):
// rho25, beta correlated 0.25 with the photo's true difficulty d = mu + eps; rho0, unrelated; views, unrelated, and
// each view beyond the first VIEW slower (a single view is harder but faster: time against difficulty); fast, the fast
// photos easy and the slow ones uninformative (u = FAST z(d) + sqrt(1 - FAST^2) N: beta = PHOTO u when u < 0, else PHOTO
// |N'|).
const RT = {T0: Math.log(6.5), PHOTO: 0.35, PLAYER: 0.44, NOISE: 0.57, RIGHT: -0.4, TYPED: Math.log(1.5), VIEW: 0.3, RHO: 0.25, FAST: 0.5};
const TIMES = ['rho25', 'rho0', 'views', 'fast'];
// Each photo file's time intensity beta in world W for a case, and its true difficulty (the world's mu + eps).
function timeWorld(U, W, seed, times, {gap = 0} = {}) {
  if (!TIMES.includes(times)) throw new Error(`--times one of ${TIMES.join(', ')}`);
  const unitOf = {};
  [...U.slate, ...U.extra].forEach(n => Object.values(U.views(n)).forEach(L => L.forEach(p => (unitOf[p.f] = unitOf[p.f] || n))));
  const files = Object.keys(W.eps).sort(),
    d = Object.fromEntries(files.map(f => [f, (W.mu[unitOf[f]] || 0) + W.eps[f]])),
    m = files.reduce((t, f) => t + d[f], 0) / files.length,
    sdd = Math.sqrt(files.reduce((t, f) => t + (d[f] - m) ** 2, 0) / files.length) || 1,
    r = gen((seed * 1597334677) ^ 0x2545f491),
    beta = {};
  files.forEach(f => {
    const z = (d[f] - m) / sdd,
      x = normal(r),
      x2 = normal(r);
    if (times === 'rho25') beta[f] = RT.PHOTO * (RT.RHO * z + Math.sqrt(1 - RT.RHO ** 2) * x);
    else if (times === 'fast') {
      const u = RT.FAST * z + Math.sqrt(1 - RT.FAST ** 2) * x;
      beta[f] = u < 0 ? RT.PHOTO * u : RT.PHOTO * Math.abs(x2);
    } else beta[f] = RT.PHOTO * x;
  });
  const bm = files.reduce((t, f) => t + beta[f], 0) / files.length,
    sb = Math.sqrt(files.reduce((t, f) => t + (beta[f] - bm) ** 2, 0) / files.length) || 1,
    rho = files.reduce((t, f) => t + (beta[f] - bm) * (d[f] - m), 0) / files.length / sb / sdd;
  return {times, beta, d, unitOf, rho, gap};
}
// The seconds of logged answer number i (from 0, in the log's order) of player j, its photos ph, right ok, typed, and the
// learner's true logit on it (gap: ability - difficulty), times TW.gap (0 unless --gap: Q324, the real log's -0.22 log per
// logit; the seconds of a run without it are unchanged, the noise drawn the same).
function secOf(TW, seed, j, i, {ph, ok, typed, gap = 0}) {
  const r = gen((seed * 2654435761) ^ (i * 2246822519) ^ (TIMES.indexOf(TW.times) * 40503 + 0x7f4a7c15)),
    tau = RT.PLAYER * normal(gen((seed * 3266489917) ^ (0x165667b1 + 7919 * (j + 1)))),
    lt = RT.T0 + ph.reduce((t, f) => t + (TW.beta[f] || 0), 0) / ph.length + (TW.times === 'views' ? RT.VIEW * (ph.length - 1) : 0) - tau + (ok ? RT.RIGHT : 0) + (typed ? RT.TYPED : 0) + (TW.gap || 0) * gap + RT.NOISE * normal(r);
  return Math.round(Math.min(600, Math.max(0.1, Math.exp(lt))) * 10) / 10;
}
// The photo ratings as ?stats=1 serves them (core.js eloOf, genusOffsetsOf, photoMemOf, as Code.gs stats_). A change to
// the sheet's rating (Q315's option (1), PR #808: a right answer's steps weighed by its seconds, core.js photoTimeW,
// with its k as an arm, --pk, and the k recovered on the log) changes this one function and its replay.
function sheetStats(log) {
  return {photos: C.eloOf(log), gd: C.genusOffsetsOf(log), mem: C.photoMemOf(log).mem};
}
// How far the served ratings are from the truth: over the photos answered, the root mean square of (rating - true d)
// once their mean difference is taken out (the Elo's zero is not the world's), plain (err) and weighed by the photo's
// answers (errW: what the draw meets), their correlation (corr); over the units answered, the same for the genus offsets
// against mu (gdErr).
function rateErr(st, TW, W) {
  const F = Object.keys(st.photos).filter(f => st.photos[f][3] > 0 && f in TW.d),
    cRMS = (xs, ys, ws) => {
      const tw = ws.reduce((a, x) => a + x, 0),
        md = xs.reduce((a, x, i) => a + ws[i] * (x - ys[i]), 0) / tw;
      return Math.sqrt(xs.reduce((a, x, i) => a + ws[i] * (x - ys[i] - md) ** 2, 0) / tw);
    },
    b = F.map(f => st.photos[f][0]),
    d = F.map(f => TW.d[f]),
    mb = b.reduce((a, x) => a + x, 0) / b.length,
    md = d.reduce((a, x) => a + x, 0) / d.length,
    cov = b.reduce((a, x, i) => a + (x - mb) * (d[i] - md), 0),
    vb = b.reduce((a, x) => a + (x - mb) ** 2, 0),
    vd = d.reduce((a, x) => a + (x - md) ** 2, 0),
    gs = Object.keys(st.gd).filter(n => n in W.mu && st.gd[n][1] > 0);
  return {
    photos: F.length,
    err: F.length ? cRMS(b, d, F.map(() => 1)) : null,
    errW: F.length ? cRMS(b, d, F.map(f => st.photos[f][3])) : null,
    corr: vb > 0 && vd > 0 ? cov / Math.sqrt(vb * vd) : null,
    gdErr: gs.length ? cRMS(gs.map(n => st.gd[n][0]), gs.map(n => W.mu[n]), gs.map(() => 1)) : null
  };
}
// One population (above): seed, N answers per player, cps the checkpoints (per player), profiles, times the case of its
// seconds, gap their knowledge-gap term (secOf), every the rounds between two refreshes of the ratings served. Returns
// {runs: one per player (runOne's), pop: {seed, times, gap, rho (beta against d), at: [{q, err, errW, corr, gdErr,
// photos}]}}; keep: also the log, the world W and its seconds TW (an app world's stats and truth from a population).
function runPop(U, {seed, N, cps, photos = 'normal', learner = 'count', subject, coralSd, profiles, times = 'rho25', every = 25, keep = false, beyond = '', gap = 0}) {
  if (subject) U = unitsOf(subject);
  if (!U.slate) U = unitsOfX(U);
  // The corals only (Codex review #844): the sheet rates the replayed subject's photos (Code.gs stats_), and a fish photo
  // is shared by a family's and a scientific genus's questions with two true difficulties, which one truth per file
  // (timeWorld) cannot hold: a fish run would judge its ratings against the wrong one.
  if (U.subject !== 'coral') throw new Error('--app sheet: the corals only (a fish photo is shared by a family and a genus)');
  const W = world(U, seed, photos, coralSd ? {coralSd} : {}),
    TW = timeWorld(U, W, seed, times, {gap}),
    pls = profiles.map((profile, j) =>
      playerOf(U, W, {profile, seed, N, cps, app: 'sheet', beyond, learner, rseed: seed * 1009 + j + 1, pi: RATED.PI * normal(gen((seed * 2246822519) ^ (0x3c6ef372 + 7919 * (j + 1))))})
    ),
    log = [],
    at = [];
  log.times = times;
  const serve = () => {
    const st = sheetStats(log);
    pls.forEach(pl => {
      pl.ctx.__st = st;
      vm.runInContext('PSTAT = __st.photos; PGD = __st.gd; PMEM = memOf(__st.mem); GDIFF = {};', pl.ctx);
    });
  };
  for (let i = 0; i < N; i++) {
    pls.forEach((pl, j) => {
      const a = pl.step(i),
        q = {ph: a.ph, ok: a.ok, typed: a.typed, gap: a.gap},
        mode = a.typed ? 'quiz|t' : `quiz|k${Math.max(2, Math.min(9, a.k))}`,
        row = [`p${j + 1}`, (i * pls.length + j) * 1000, a.t, a.c, a.ok ? 1 : 0, mode, a.ph.join(' '), null, null, null, a.chs.join(' '), 0, secOf(TW, seed, j, log.length, q), 0];
      row.j = j;
      row.q = q;
      log.push(row);
    });
    if ((i + 1) % every === 0) serve();
    if (cps.includes(i + 1)) at.push({q: i + 1, ...rateErr(sheetStats(log), TW, W)});
  }
  return {runs: pls.map(pl => pl.result()), pop: {seed, times, gap, rho: TW.rho, at, answers: log.length}, ...(keep ? {log, W, TW} : {})};
}

module.exports = {RATED, ITEM, RT, TIMES, world, piOf, engine, runOne, runPop, playerOf, timeWorld, secOf, sheetStats, rateErr, fishUnits, coralUnits, unitsOf, question, noteRecent, judgePhotos, typedOthers};

// The rated world's checkpoints: the guardrails' (LEARNING.md) up to the horizon, and the horizon.
const checkpoints = N => [...new Set([100, 300, 1000, 3000, 10000, 30000].filter(q => q <= N).concat([N]))].sort((a, b) => a - b);

// learnsim --world rated: every (profile, seed) run on workers threads, the printed summary and the --out file.
async function main(o) {
  const {Worker} = require('worker_threads'),
    t0 = Date.now(),
    cps = checkpoints(o.N),
    jobs = [];
  const pop = o.app === 'sheet',
    POP = [];
  // --app sheet: one job per seed, the whole population (runPop); else one per (profile, seed).
  for (let s = o.seed0 + 1; s <= o.seed0 + o.seeds; s++)
    if (pop) jobs.push({pop: 1, subject: o.subject, seed: s, N: o.N, cps, photos: o.dist, beyond: o.beyond, learner: o.learner, coralSd: o.coralSd, profiles: o.profiles, times: o.times, every: o.every, gap: o.gap || 0});
    else for (const profile of o.profiles) jobs.push({subject: o.subject, profile, seed: s, N: o.N, cps, photos: o.dist, app: o.app, beyond: o.beyond, learner: o.learner, coralSd: o.coralSd});
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
          if (r.pop) (runs.push(...r.runs), POP.push(r.pop));
          else runs.push(r);
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
  POP.sort((a, b) => a.seed - b.seed);
  console.log(
    `\nRated world (${o.subject}; learner ${o.learner}; photos ${o.dist}, the app ${o.app === 'truth' ? 'told the truth' : o.app === 'sheet' ? `on the sheet's photo Elo of the population (times ${o.times}, gap ${o.gap || 0})` : 'on its own estimate'}): ${o.profiles.join(', ')}; ${o.seeds} seeds x ${o.N} answers; ${runs.length} runs in ${secs.toFixed(0)} s`
  );
  if (pop) {
    console.log('Photo ratings against the truth (per player answers: rating error, weighed by answers, correlation, genus offsets error), mean of seeds:');
    cps.forEach((q, i) => {
      const A = POP.map(p => p.at[i]).filter(Boolean),
        g = k => m(A.map(x => x[k]));
      console.log(`  ${String(q).padStart(6)}  err ${f(g('err'), 3)}  errW ${f(g('errW'), 3)}  corr ${f(g('corr'), 3)}  gdErr ${f(g('gdErr'), 3)}  photos ${f(g('photos'), 0)}`);
    });
    console.log(`  beta against the true difficulty: ${f(m(POP.map(p => p.rho)), 2)} (times ${o.times}, gap ${o.gap || 0})`);
  }
  const K = [...new Set(runs.flatMap(r => Object.values(r.kinds)))];
  console.log(`right%: since the previous checkpoint; D*: true knowledge of the slate; E: bar - D*, slate units met; OW / Adv: ${K.join(', ')} at Open Water / Advanced`);
  for (const p of o.profiles) {
    const R = runs.filter(r => r.profile === p);
    console.log(`\n${p} (pi ${R.map(r => r.pi.toFixed(2)).join(' ')})`);
    cps.forEach((q, i) => {
      const w = R.map(r => r.rows[i]).filter(Boolean),
        g = fn => m(w.map(fn));
      console.log(
        `  ${String(q).padStart(6)}  right ${f(g(x => x.right), 0)}  met ${f(g(x => x.met), 1)}  D* ${f(g(x => x.dStar), 3)}  E ${f(g(x => (x.kinds[K[0]] || {}).over), 3)}  OW ${K.map(k => f(g(x => (x.kinds[k] || {}).ow), 1)).join(' / ')}  Adv ${K.map(k => f(g(x => (x.kinds[k] || {}).adv), 1)).join(' / ')}  score ${f(g(x => x.score.pct), 1)}${g(x => x.score.entries) === null ? '' : ` (entries ${f(g(x => x.score.entries), 3)}, credit ${f(g(x => x.score.credit), 3)})`}  plateau ${f(g(x => x.plateau), 0)}`
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
          subject: o.subject,
          seeds: o.seeds,
          seed0: o.seed0,
          questions: o.N,
          checkpoints: cps,
          profiles: Object.fromEntries(o.profiles.map(n => [n, LP.profOf(n, o.subject)])),
          rated: RATED,
          dist: o.dist,
          learnerKind: o.learner || 'count',
          coralSd: o.subject === 'coral' ? o.coralSd || RATED.CORAL_GD : null,
          app: o.app,
          beyond: o.beyond || null,
          ...(pop ? {times: o.times, every: o.every, gap: o.gap || 0, rt: RT, pop: POP} : {}),
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
  const {parentPort} = require('worker_threads');
  parentPort.on('message', j => parentPort.postMessage(j.pop ? {pop: 1, ...runPop(null, j)} : runOne(null, j)));
}
