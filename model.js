// IMR Reef ID: the learning model (docs/LEARNING.md explains every rule). Which unit comes next (weighted, the
// progressive opening OPEN), which photos (photoSet, PICKD, online calibration CAL), how hard they are (photoDiff, the
// sheet's PSTAT and genus offsets PGD), the ability per unit (core.js ELO, ability; Elo after Pelánek 2016, no decay
// between sessions; answers scored by core.js scoreAnswer), progress (core.js DOM, barOf, examOpen; PROG for a record
// not rebuilt yet), the mastery exam (EXAM) and the wrong choices (TRAP, distractors, pooledConf). A classic script
// loaded right after progress.js (index.html order); app.js waits for every script (window.BOOT) before its first page.
// The draw: every question draws from all the unit's game photos, weighted by how close each photo's difficulty
// (photoDiff) is to the player's target for this unit and format (the difficulty controller, below). Photos never seen
// get a bonus (bigger when the player is doing well; never for who took the photo, rule P1), photos already shown weigh
// less the better they are remembered (PMEM), the colony of the last 2 questions is held back, a colony shown or
// planned in the session's last RECENT questions waits while the unit has another (SEENQ), and at least VARIETY
// colonies stay in rotation. All photos of a question come from one observation.
// PICKD.P is core.js TARGET_P (0.8), the game's reference; PICKD.AIM is core.js AIM (aimP, below).
const PICKD = {P: TARGET_P, AIM, SIGMA: 0.7, VARIETY: 3, FLOOR: 0.05, SINGLE: DOM.SINGLE};
// Until a unit reaches Open Water (LV_AT[0]), its photos under ease RARE.E (or its RARE.FEW easiest when it has fewer)
// make at most RARE.SHARE of the photos drawn, whatever their number (rareCap): no wall, they still come, rarely. The
// factor applies to the choice of the observation (by the hard share of its weight) and of its photo. Photos with no
// judged ease (every coral photo) are never capped. docs/LEARNING.md "Rarely under ease 4 before Open Water".
const RARE = {E: 4, FEW: 3, SHARE: 0.1};
// The cap holds only on units of the subject's own rank (core.js unitRankOf: the fish families, the sea slugs' genera):
// a fish genus's player already knows its family, and capping it held back its hard photos' ratings.
const rareOn = n => (rankOf(n) || unitRankOf(SUBJ)) === unitRankOf(SUBJ);
// The factor the hard photos' weights take so they make at most `share` of the draw (1 when they already do, or when
// nothing else can be drawn). sc: each observation's weight; hardOf(k): the share of observation k's photo weight that
// is hard (0 to 1). Exact for a question showing one photo (the fish); for several views, the share of the photos drawn.
function rareCap(keys, sc, hardOf, share = RARE.SHARE) {
  let mh = 0,
    me = 0;
  keys.forEach(k => ((mh += sc[k] * hardOf(k)), (me += sc[k] * (1 - hardOf(k)))));
  return me > 0 && mh > (share / (1 - share)) * me ? ((share / (1 - share)) * me) / mh : 1;
}
// One difficulty controller (docs/LEARNING.md "One difficulty controller"; after Papousek, Pelanek & Stanislav 2014),
// two steps to one target:
// 1. The format of a question on unit n follows its ability (FORMAT, below): how many of the 3 wrong choices are
//    look-alike traps, then more and more single-view questions, so each view is learned on its own (rule L3). Typed
//    questions (TYPED, typedP) are a third lever with their own rule.
// 2. The photo makes up the rest: aimed aimOff(k) below the ability (PICKD.SINGLE lower for one view alone), so that with
//    the format's guess rate (1 in k plausible choices, plausibleK; none typed) the question is right with the chance
//    aimed for, whatever its format.
// The chance aimed for follows the global level (PICKD.AIM, core.js aimOf; docs/LEARNING.md "Beginners and experts"):
// 85% up to a level of 0.5, 75% from 1.5, linear between, flat outside. The miss weight (core.js pgMissW) and the
// sheet's replay take the same aim.
const aimP = () => aimOf((P[LEVEL] || {}).th || 0);
// df: the format's offset (core.js fmtOff, the subject's pfmt; docs/LEARNING.md "Per-format offsets"): a format the
// players find easier than its guess rate allows (df > 0) gets a photo that much harder; 0 without sheet offsets.
const aimOff = (k = 4, df = 0) => {
  const x = (aimP() - 1 / k) / (1 - 1 / k);
  return Math.log(x / (1 - x)) - df;
};
// The schedule of the format (step 1): points [ability, look-alike traps, share of single-view questions], linear
// between, flat outside. No trap on a unit's first question, one from 0.18 (the first right answer), all three from 0.54
// (about 5 right answers), rounded at random between (trapsFor); single views from none at 0.54 to 85% from 1.8.
const FORMAT = [
  [0, 0, 0],
  [0.54, 3, 0],
  [1.8, 3, 0.85]
];
const formatAt = th => {
  const F = FORMAT;
  if (th <= F[0][0]) return F[0].slice(1);
  for (let i = 1; i < F.length; i++)
    if (th <= F[i][0]) {
      const [x0, ...a] = F[i - 1],
        [x1, ...b] = F[i],
        f = (th - x0) / (x1 - x0);
      return a.map((y, k) => y + (b[k] - y) * f);
    }
  return F[F.length - 1].slice(1);
};
// The chance of a single-view question (colony, closer or corallites alone; FORMAT): beginners see every view of the
// colony. A single view counts as harder (SINGLE), so easier photos are picked for it; the others show after the answer.
const singleP = (n, shift = 0) => formatAt(ability(n) + shift)[1];
// Online calibration (docs/LEARNING.md "Photo exposure"): a photo with few answers from all the players (the sheet's
// count) is drawn more often, x (1 + CAL.B / (1 + answers / CAL.N)): x3 with none, x2 after 2, x1.5 after 6; it
// multiplies the targeting, never replaces it. CAL.RATE of the questions are calibration questions: the observation is
// chosen on the targeting and that bonus alone, among those the player has never seen, a single view showing alone;
// only on a unit the player holds (met, not shaky) and never in a comeback. CAL.U: the prior's variance for a photo
// nobody has answered (difficulty units), so the targeting is wider for it, narrowing as U / (1 + answers / CAL.N).
const CAL = {B: 2, N: 2, RATE: 0.3, U: 1};
const nAnswers = p => {
  const o = PSTAT[p.f];
  return o ? (o[3] ?? o[1]) : 0;
};
const calBonus = p => 1 + CAL.B / (1 + nAnswers(p) / CAL.N);
// The prior's variance: the subject's (SUBJECTS calib u, core.js calibOf), else CAL.U (the corals). Fish photos carry a
// judged ease, so a narrower targeting lets it lead while answers are few (docs/LEARNING.md "The fish draw in big pools").
const calU = () => calibOf(SUBJ).u ?? CAL.U;
// u: calU(), passed in by a caller that reads it once for many photos (photoSet).
const calSd = (p, u = calU()) => Math.sqrt(PICKD.SIGMA ** 2 + u / (1 + nAnswers(p) / CAL.N));
// The calibration set (calibration-set.json, written by tools/calibset.js, read by app.js into CALSET: {subject id:
// {unit: [photo files]}}; docs/LEARNING.md "The calibration set"): a fixed set of game photos, each weighing CSET.B
// times as much while the sheet's plain count of its answers is under CSET.N, so each gathers the answers that measure
// its difficulty, for a placement test built on them later. photoSet applies it only on a unit the player holds and to
// a photo within one width of the question's target: it never pulls a photo that does not suit the player. A normal
// question in every way: the factor multiplies the photo's weight and nothing else (its targeting, memory, format and
// scoring are any photo's). A subject without a set, or a file that could not come, draws as before (factor 1).
const CSET = {B: 2, N: 20};
let CALSET = {},
  SETF = null;
// The current subject's members, one Set, made again when the subject or the file changes.
const setFiles = () => {
  if (!SETF || SETF.s !== SUBJ.id || SETF.c !== CALSET)
    SETF = {s: SUBJ.id, c: CALSET, f: new Set(Object.values((CALSET && CALSET[SUBJ.id]) || {}).flat())};
  return SETF.f;
};
const setBonus = p => (setFiles().has(p.f) && nAnswers(p) < CSET.N ? CSET.B : 1);
// The draw's floor for a unit of nObs observations (photoSet): PICKD.FLOOR of the best one's weight each, shared over the
// subject's pool when the unit has more (SUBJECTS calib pool; unbounded for the corals), so in a big pool the floor's
// mass does not drown the prior's lean.
const drawFloor = nObs => PICKD.FLOOR * Math.min(1, calibOf(SUBJ).pool / Math.max(1, nObs));
// The memory of each colony (observation) of a question's draw: the record [shown, right] of its most remembered
// photo (core.js memBucket, then the most shown), whatever its view; none when no photo of it was ever shown.
const colonyMem = (obs, ps) =>
  Object.fromEntries(
    Object.entries(obs).map(([k, o]) => [
      k,
      Object.values(o)
        .flat()
        .map(p => ps[p.f])
        .filter(h => h && h[0])
        .reduce((a, h) => (!a || memBucket(h) > memBucket(a) || (memBucket(h) === memBucket(a) && h[0] > a[0]) ? h : a), undefined)
    ])
  );
// The session's window of photos (docs/LEARNING.md "No photo twice in a few questions"): the photo memory (s.ps) and the
// colonies held back (s.ro) are written at an answer, but the quiz plans up to AHEAD questions ahead (quiz.js planNext), so
// a question planned behind another on the unit would draw the same colony. The draw also reads the photos of the last
// RECENT questions shown (seenAdd: quiz.js question, live.js liveBuild) and of those planned (the NEXTQ queue), by file
// and by observation. In memory only, nothing synced; RECENT is the game's own "recent" (10), wider than AHEAD.
let SEENQ = [];
// The photos of question q (its arguments: [cur, unit, choices, prompt, set]): those shown, hinted or revealed, or a Find
// the X's four tiles.
const qPhotos = q => {
  const set = (q && q[4]) || {};
  return set.find ? set.find.map(x => x.p) : [...(set.shown || []), ...(set.hint ? [set.hint] : []), ...(set.reveal || [])];
};
// A question shown, once however often its page is drawn again.
const seenAdd = q => {
  const set = q && q[4];
  if (set && !(SEENQ.length && SEENQ[SEENQ.length - 1].s === set)) SEENQ = [...SEENQ, {s: set, L: qPhotos(q)}].slice(-RECENT);
};
// How many questions ago each photo file and observation of the window came (0: the latest, the last planned if any).
function seenAges() {
  const plan = [];
  if (typeof NEXTQ !== 'undefined') for (let x = NEXTQ; x; x = x.next) plan.push(qPhotos(x.args));
  const W = [...SEENQ.map(e => e.L), ...plan].slice(-RECENT),
    a = {};
  W.forEach((L, i) => L.filter(Boolean).forEach(p => [p.f, p.o].forEach(k => k && (a[k] = W.length - 1 - i))));
  return a;
}
// Of L (observations or photos; photosOf(x): its photos), those outside the window, else those shown longest ago in it.
function leastRecent(L, photosOf, ages = seenAges()) {
  const age = x => Math.min(...photosOf(x).flatMap(p => [p.f, p.o].map(k => (k && k in ages ? ages[k] : Infinity))));
  const ag = L.map(age),
    out = L.filter((x, i) => ag[i] === Infinity);
  if (out.length || !L.length) return out;
  const m = Math.max(...ag);
  return L.filter((x, i) => ag[i] === m);
}
// skip: a photo file left out when the colony has others to show (the photo of the genus card just shown).
// shift: added to the ability for this question (a comeback question after a break: ln R, comebackShift, below).
// k: the question's plausible choices (plausibleK; 2 for an Again or a duel, Infinity typed), so the photo is aimed for
// PICKD.P in that format (aimOff); f: its format (core.js fmtOf: 'k4', 'again', 'duel', 'typed'…), whose offset the aim
// takes (fmtOff, the subject's pfmt). keep: the photos it may show, when not all of them (Find the X: the tiles).
function photoSet(n, skip, shift = 0, k = 4, f = '', keep = null) {
  const g = GX(n),
    two = g.levels === 2,
    need = two ? ['wide', 'macro'] : ['wide', 'medium', 'macro'];
  const shownV = two ? ['wide', 'macro'] : ['wide', 'medium'];
  // The Colony slot never gets a photo whose growth form is "x" (too close to see it): that is a close-up. Except for a
  // genus with a single IMR growth form: the form is no question there, so the photo still works as a colony.
  const oneForm = imrFormsOf(n).length === 1,
    ok = v => p => v !== 'wide' || p.form !== 'x' || oneForm;
  // Bonus genera: Research Grade only. A two-level genus's close-ups may still sit in "medium" (extra genera from
  // tools/build_extra.py, e.g. Sandalolitha): they count as its close-up level, so its corallites milestone is reachable.
  const gameOk = p => gamePhotoOk(n, p);
  // all: every photo the unit may show, before keep (the variants' count of observations at full weight, below).
  const pics = (v, all = false) =>
    [...gamePics(n, v), ...(two && v === 'macro' ? gamePics(n, 'medium') : [])]
      .filter(ok(v))
      .filter(gameOk)
      .filter(p => p.f !== skip && (all || !keep || keep(p)));
  // Only on a genus the player already holds (met, not shaky): a genus still being learned keeps whole colonies.
  // No calibration question in a comeback (shift): one unusual photo alone is not a restart.
  // The calibration set's factor (setBonus, in w below) holds to the same condition, and to a photo within one width of
  // the target, so it never pulls a photo onto a genus still being learned or away from the player's level
  // (docs/LEARNING.md "The calibration set").
  const held = level(n)[0] !== 'new' && !shaky(n),
    calQ = !shift && held && Math.random() < CAL.RATE,
    single = calQ || Math.random() < singleP(n, shift),
    s = P[n] || {},
    ro = s.ro || [],
    // The subject's calibration, read once for the whole draw (calibOf builds a new object; w reads it per photo).
    cal = calibOf(SUBJ),
    calu = cal.u ?? CAL.U,
    // The start's lean (SUBJECTS calib early): the target sits `early` logits lower on a unit with few answers, so the
    // easy photos come first, fading as PDIFF.W / (PDIFF.W + answers on it); 0 for the corals.
    lean = cal.early * (PDIFF.W / (PDIFF.W + (s.ok || 0) + (s.ko || 0))),
    tgt = ability(n) + shift - aimOff(k, fmtOff(pfmt(), f)) - (single ? PICKD.SINGLE : 0) - lean,
    pm = pmem();
  // Photo variants on the unit's own mastery (docs/LEARNING.md "Juveniles and colour phases on their unit's mastery"):
  // each juvenile, sex or colour phase photo weighs its kind's ramp on this unit's bar (varOf: core.js varKindOf, VAR_AT,
  // varRamp), every other photo 1. Weights only: the prior and the scoring are untouched. Nothing is held back on a unit
  // with fewer than PICKD.VARIETY observations at full weight among all its photos (keep aside).
  const V = varOf(
    n,
    need.flatMap(v => pics(v, true))
  );
  const h = [...recent(n).slice(-5)],
    hot = h.length ? h.filter(x => x === '1').length / h.length : 0.5;
  // Before Open Water, the hard photos' factor (RARE, rareCap below; 1 otherwise).
  let hardF = 1,
    hard = () => false;
  // off: extra difficulty when the colony only has one view, so the question will show it alone (SINGLE).
  const w = (p, off = 0) => {
    const x = (photoDiff(n, p) + off - tgt) / calSd(p, calu),
      k = mem[p.o || p.f];
    let r = Math.exp((-x * x) / 2) * calBonus(p) * (held && Math.abs(x) <= 1 ? setBonus(p) : 1);
    // Photo memory (docs/LEARNING.md "Photo memory"): a photo already shown weighs e^offset of its memory bucket (core.js
    // MEM, the subject's pmem), dividing out the odds memory adds to a right answer on it: soft, the least remembered
    // come first. A reference-level photo never seen (core.js refLevel: judged ease 4 or 5 with the reference look,
    // whatever its source) weighs the subject's calibration ref times more (SUBJECTS calib: 3 for fish, 1 for the
    // corals), whoever took it: no photo weighs more for its source (rule P1).
    if (!k) r *= (1 + 1.5 * hot) * (refLevel(p) ? cal.ref : 1);
    else r *= Math.exp(pm[memBucket(k)]);
    if (V.on) r *= V.f(p);
    return hardF < 1 && hard(p) ? r * hardF : r;
  };
  const obs = {};
  need.forEach(v =>
    pics(v).forEach(p => {
      const k = p.o || p.f;
      (obs[k] = obs[k] || {})[v] = (obs[k][v] || []).concat([p]);
    })
  );
  const keys = Object.keys(obs);
  if (!keys.length && skip) return photoSet(n); // the card's photo was its only one
  // The variety and the floor below lift an observation only by its best photo's variant factor (V above), so neither
  // brings a held-back photo back.
  const vObs = V.on ? Object.fromEntries(keys.map(k => [k, Math.min(1, Math.max(...Object.values(obs[k]).flat().map(V.f)))])) : null;
  const phMul = k => (V.on ? vObs[k] : 1);
  // A colony counts as seen whatever view of it was shown: every photo of an observation takes the memory of its most
  // remembered photo (colonyMem), so an unseen close-up of a known colony loses the never-seen bonus. The expectation and
  // the progress still read each photo's own record (famOf, pgMemW).
  const mem = colonyMem(obs, s.ps || {});
  // Each observation's photos, every view, listed once (ph below reads them several times).
  const phs = Object.fromEntries(keys.map(k => [k, Object.values(obs[k]).flat()]));
  // All the photos of a question come from ONE observation: views of different colonies shown together would read as
  // one coral. Colonies with more views are favoured by cov, the share of the views they have (fish: one view, no
  // effect). A colony with a single view gives a single-view question, never topped up from another.
  const score = k => {
    const o = obs[k],
      vs = (single ? need : shownV).filter(v => o[v]);
    if (!vs.length) return 0;
    const nv = need.filter(v => o[v]).length,
      off = !single && nv === 1 ? PICKD.SINGLE : 0,
      cov = nv / need.length;
    const m = vs.reduce((t, v) => t + Math.max(...o[v].map(p => w(p, off))), 0) / vs.length;
    return m * (calQ ? 1 : cov) * (ro.includes(k) ? 0.15 : 1);
  };
  const sc = Object.fromEntries(keys.map(k => [k, score(k)]));
  // Rarely under ease 4 before Open Water (RARE): each observation's hard part, the share of its photos' weight under
  // the bar (its photo is drawn on those weights); the cap itself comes last, below.
  const ph = k => phs[k],
    es = keys
      .flatMap(ph)
      .map(p => p.e || 0)
      .filter(Boolean)
      .sort((a, b) => b - a),
    rare = es.length > 0 && rareOn(n) && genScore(n) + 1e-9 < LV_AT[0],
    hs = {};
  if (rare) {
    const bar = Math.min(RARE.E, es[Math.min(RARE.FEW, es.length) - 1]),
      sum = L => L.reduce((t, p) => t + w(p), 0);
    hard = p => p.e > 0 && p.e < bar;
    keys.forEach(k => {
      const t = sum(ph(k));
      hs[k] = t ? sum(ph(k).filter(hard)) / t : 0;
    });
  }
  // A calibration question draws among the colonies this player has never seen, while the unit has one the draw can
  // show, still on the targeting and the calibration bonus. Before Open Water with every easy colony seen, the seen easy
  // ones stay (only the seen hard ones go), so the exploration never passes the cap.
  if (calQ && keys.some(k => sc[k] > 0 && !mem[k])) {
    const keep = rare && !keys.some(k => sc[k] > 0 && !mem[k] && hs[k] < 1);
    keys.forEach(k => mem[k] && !(keep && hs[k] < 1) && (sc[k] = 0));
  }
  // A colony in the session's window (SEENQ) waits while another can be drawn, before the variety, the floor and the cap,
  // which then work on the others. It never leaves only colonies the draw holds back (before Open Water the hard ones,
  // RARE; the variants not released yet, V): with every colony at full weight in the window, the one of them shown
  // longest ago stays, as the exploration keeps the seen easy ones above.
  const live = keys.filter(k => sc[k] > 0),
    fresh = new Set(leastRecent(live, k => phs[k])),
    whole = k => !(rare && hs[k] >= 1) && phMul(k) >= 1;
  if (live.some(whole) && ![...fresh].some(whole)) leastRecent(live.filter(whole), k => phs[k]).forEach(k => fresh.add(k));
  live.forEach(k => fresh.has(k) || (sc[k] = 0));
  const top = Math.max(0, ...Object.values(sc));
  keys
    .filter(k => sc[k] > 0)
    .sort((a, b) => sc[b] - sc[a])
    .slice(0, PICKD.VARIETY)
    .forEach(k => {
      if (!ro.includes(k)) sc[k] = Math.max(sc[k], 0.5 * top * phMul(k));
    });
  const floor = drawFloor(keys.length);
  keys.forEach(k => {
    if (sc[k] > 0) sc[k] = Math.max(sc[k], floor * top * phMul(k));
  });
  // Rarely under ease 4 before Open Water (RARE): last, so neither the variety nor the floor lifts the hard ones back.
  if (rare) {
    hardF = rareCap(keys, sc, k => hs[k]);
    if (hardF < 1) keys.forEach(k => (sc[k] *= 1 - hs[k] + hardF * hs[k]));
  }
  const o = top ? obs[wpick(keys, k => sc[k])] : keys.length ? obs[pick(keys)] : {};
  const one = v => {
    const L = o[v] || [];
    return L.length ? {...wpick(L, w), view: v} : null;
  };
  const lab = v => (two && v === 'macro' ? 'close' : v);
  const has = need.filter(v => (o[v] || []).length);
  if (single || has.length === 1) {
    // A calibration question shows the view whose photo the players have answered least.
    const v = !has.length ? null : calQ ? wpick(has, x => Math.max(...o[x].map(p => w(p) * calBonus(p) ** 2))) : pick(has);
    if (v) {
      const p = one(v);
      return {shown: [{...p, view: lab(v)}], hint: null, reveal: has.filter(x => x !== v).map(x => ({...pick(o[x]), view: lab(x)}))};
    }
    return {shown: [], hint: null};
  }
  // Two-level genera (e.g. Plerogyra, mushroom corals) show colony + close-up, with no hint.
  if (two) {
    const m = one('macro');
    return {shown: [one('wide'), m && {...m, view: 'close'}].filter(Boolean), hint: null};
  }
  // A colony with only closer + corallites shows the closer view, the corallites as the hint.
  return {shown: [one('wide'), one('medium')].filter(Boolean), hint: one('macro')};
}
// Whether photoSet(n) shows a photo, told without drawing one (app.js pool asks it of every unit several times a
// question, and a draw costs a millisecond or more on a big fish family): photoSet shows one exactly when some photo of
// n passes its filters (form, gamePhotoOk, a name) in a view it needs. The filters are copied from photoSet;
// tests/photoany.test.js compares the two.
function photoAny(n) {
  const g = GX(n),
    two = g.levels === 2,
    need = two ? ['wide', 'macro'] : ['wide', 'medium', 'macro'],
    oneForm = imrFormsOf(n).length === 1;
  return need.some(v =>
    [...gamePics(n, v), ...(two && v === 'macro' ? gamePics(n, 'medium') : [])].some(
      p => (v !== 'wide' || p.form !== 'x' || oneForm) && gamePhotoOk(n, p) && p.f !== undefined
    )
  );
}
// The photo variants of unit n (core.js varKindOf, VAR_AT): a unit's home, the record at its subject's unit rank
// it hangs from (itself for a family; a fish genus's or species' family), holds its juvenile classes (juv) and its
// thresholds' overrides (varAt); a unit's own varAt wins over its home's for a kind, the default table VAR_AT last.
const varHome = n => {
  const g = GX(n) || {};
  return (typeof rankOf === 'function' ? rankOf(n) : '') === '' ? n : g.parent || g.family || n;
};
const varAtOf = (n, v) => ((GX(n) || {}).varAt || {})[v] || ((GX(varHome(n)) || {}).varAt || {})[v] || VAR_AT[v] || [0, 0];
const varKind = (n, p) => varKindOf(p, (GX(varHome(n)) || {}).juv);
// The mimicry class (docs/LEARNING.md "The mimicry class"): a photo of a species a source says resembles another (its
// home's mim, app.js mimLay: its juvenile photos, or every photo) comes into its unit's draw on its unit's bar from Open
// Water once a unit of the species it resembles is met (MIM_AT.met), and at Advanced while none is (MIM_AT.alone), so it
// never waits on a unit the player may not open. The draw only: its kind and its group for "Learned" stay its phase's
// (core.js varKindOf, varUnit), as the sheet's replay reads them. A pair inside the unit asked (two blennies of one
// family, asked as the family) holds nothing back: the photo asks the same name as its model. The model's units met are
// counted without the unit asked and its home, so a genus waits on the model's genus, not on the family they share.
const MIM_AT = {met: [0.5, 0.8], alone: [0.8, 0.8]};
// mimIn: the entry of photo p among a unit's entries L, null for none.
const mimIn = (L, p) => (L && p && L.find(m => m.sp === p.sp && (m.st !== 'juvenile' || phaseOf(p) === 'juvenile'))) || null;
const mimOf = (n, p) => mimIn((GX(varHome(n)) || {}).mim, p);
const mimAt = (m, n) => (m.m.some(id => id !== n && id !== varHome(n) && GX(id) && introduced(id)) ? MIM_AT.met : MIM_AT.alone);
// The variant factors of unit n over its photos L (photoSet's, examSet's): kind(p), its kind; f(p), its weight now, its
// kind's ramp on the unit's bar (genScore), a photo of the mimicry class its own ramp (mimOf, mimAt), 1 for a photo with
// no variant; on, whether anything is held back: false when nothing is, or when fewer than PICKD.VARIETY observations of L
// are at full weight (the fallback: nothing held back, f then 1 everywhere).
function varOf(n, L) {
  const juv = (GX(varHome(n)) || {}).juv,
    F = {},
    ML = (GX(varHome(n)) || {}).mim,
    MF = new Map(),
    kind = p => varKindOf(p, juv),
    f0 = p => {
      const m = ML ? mimIn(ML, p) : null;
      if (m && !m.m.includes(n)) {
        if (!MF.has(m)) MF.set(m, varRamp(genScore(n), mimAt(m, n)));
        return MF.get(m);
      }
      const v = kind(p);
      if (!v) return 1;
      if (!(v in F)) F[v] = varRamp(genScore(n), varAtOf(n, v));
      return F[v];
    };
  const on = L.some(p => f0(p) < 1) && new Set(L.filter(p => f0(p) >= 1).map(p => p.o || p.f)).size >= PICKD.VARIETY;
  return {on, kind, f: on ? f0 : () => 1};
}
// The mimicry class drilled (docs/LEARNING.md "The mimicry class"). mimUnit: on a question about unit t, the unit at t's
// rank of the species a photo p of the class resembles (its entry's m), the trap that photo sets; null for a photo of no
// class, or when the pair sits inside t (two blennies asked as their family).
const mimUnit = (t, p) => {
  const m = p ? mimOf(t, p) : null,
    u = m ? m.m.find(x => GX(x) && rankOf(x) === rankOf(t)) : null;
  return u && u !== t ? u : null;
};
// Whether unit n's draw gives some photo keep accepts a weight now (varOf: the variants' and the class's ramps), so a
// drill kept to such photos never shows one its unit still holds back (photoSet draws at random when all weigh 0).
const drawHas = (n, keep) => {
  const L = ['wide', 'medium', 'macro'].flatMap(v => gamePics(n, v)).filter(p => gamePhotoOk(n, p)),
    V = varOf(n, L);
  return L.some(p => keep(p) && V.f(p) > 0);
};
// The photos a pair's drill shows on its unit n (photoSet keep): on the resembling side's units (app.js mimLay u) the
// photos of the class, on the side resembled (m) its species at the stage that is resembled; never, as on the card, a
// photo taken outside the region of a species whose look varies by region (ra, rb: loc world); null for another unit.
const mimSide = (m, n) =>
  m.u.includes(n)
    ? p => mimIn([m], p) === m && !(m.ra && p.loc === 'world')
    : m.m.includes(n)
      ? p => p.sp === m.pair.b && ((m.pair.st || {}).b !== 'juvenile' || phaseOf(p) === 'juvenile') && !(m.rb && p.loc === 'world')
      : null;
// The keep of pair id's drill on unit n of the two units asked (an Again or a duel), when that side's draw holds such a
// photo now; null otherwise (any photo of n, as for every pair).
const mimKeep = (id, pair, n) => {
  const m = id ? pair.flatMap(x => (GX(varHome(x)) || {}).mim || []).find(e => e.pair.id === id) : null,
    k = m ? mimSide(m, n) : null;
  return k && drawHas(n, k) ? k : null;
};
// The class's duels among the units of list, at the subject's own rank as every duel: [a, b] for each entry of a family a
// whose species resembled is of another family b of list, its pair's id in mim, once ok(m) holds and both sides' draws
// hold their photos now (drawHas), so its two sides take turns as in any duel.
function mimPairs(list, ok = () => true) {
  const out = [];
  for (const a of list.filter(x => !rankOf(x)))
    for (const m of (GX(a) || {}).mim || []) {
      const b = m.fb;
      if (b !== a && list.includes(b) && ok(m) && drawHas(a, mimSide(m, a)) && drawHas(b, mimSide(m, b)))
        out.push(Object.assign([a, b], {mim: m.pair.id}));
    }
  return out;
}
// The mastery exam's photos of unit n by view (examSet): its game photos alone, never a photo of several, this player's
// reserved photos of the view (core.js reserveSplit, heldOf: g.held) among them: the exam draws from those first, and
// the variant groups (varUnitOf) read the unit's photos whole, as the sheet's replay does (core.js treeVarTable, made
// without any reserve).
function examPics(n) {
  const g = GX(n),
    two = g.levels === 2,
    need = two ? ['wide', 'macro'] : ['wide', 'medium', 'macro'],
    oneForm = imrFormsOf(n).length === 1,
    gameOk = p => gamePhotoOk(n, p) && !p.multi,
    of = v => [...gamePics(n, v), ...heldOf(g, v)];
  const pics = v =>
    [...of(v), ...(two && v === 'macro' ? of('medium') : [])].filter(p => v !== 'wide' || p.form !== 'x' || oneForm).filter(gameOk);
  return {two, need, pics};
}
// "Learned" asks each variant group (docs/LEARNING.md "Juveniles and colour phases on their unit's mastery"): the groups
// of unit n (core.js VAR_GROUPS: juveniles, sexes and colour phases) with a photo released by its mastery (varOf) and
// none answered right yet (s.ps). While one is left, the exam's next question draws its photo (examSet) and the exam is
// not passed (examPassed); [] for a unit with no variant (the corals). Through core.js varUnit and varLeftOf, as the
// sheet's replay (rules D8, D9: core.js treeVarTable, replayedOf), so the app and the sheet decide alike.
function varUnitOf(n) {
  if (!GX(n)) return null;
  const {need, pics} = examPics(n);
  return varUnit(need.flatMap(pics), (GX(varHome(n)) || {}).juv, v => varAtOf(n, v));
}
// A group the answer log left (s.vl: core.js replayProgress vars, kept by replayedOf) stays left, though s.ps, merged
// with this device's saved copy, holds a right answer the log lacks (rule D9), until a right answer
// on it here (varRight): the same groups as the sheet's replay.
function varLeft(n) {
  if (!GX(n)) return [];
  const U = varUnitOf(n),
    x = genScore(n),
    s = P[n] || {},
    left = varLeftOf(U, x, s.ps),
    log = Array.isArray(s.vl) ? s.vl : [];
  return log.length ? varLeftOf(U, x, {}).filter(g => left.includes(g) || log.includes(g)) : left;
}
// A right answer on unit n's photos L (quiz.js answer) clears their variant groups from those the log left (s.vl).
function varRight(n, L) {
  const s = P[n];
  if (!s || !Array.isArray(s.vl)) return;
  const got = new Set((L || []).map(p => varGroup(varKind(n, p))));
  s.vl = s.vl.filter(g => !got.has(g));
  if (!s.vl.length) delete s.vl;
}
// The exam passed (quiz.js answer, the rated world): EXAM.n right, TYPED.exam of them typed, and no variant group left.
const examPassed = (n, ex) => ex.k >= EXAM.n && (ex.t || 0) >= TYPED.exam && !varLeft(n).length;
// This player's reserve (core.js reserveOf, reserveSplit; docs/LEARNING.md "The reserve in the game"): a unit's held
// lists (g.held, by view), never in its views, so no game, card, sheet or list shows them. Only the mastery exam asks
// them (examSet), unannounced and counted like any answer, logged |h (quiz.js answer). shownAll: the photos this player
// was ever shown, on any unit of the subject (each unit's s.ps: {file: [shown, right]}).
const shownAll = () =>
  new Set(
    Object.values(P).flatMap(s => (s && s.ps && typeof s.ps === 'object' ? Object.keys(s.ps).filter(f => (s.ps[f] || [0])[0] > 0) : []))
  );
// The next exam question of genus n: one photo alone, in a view the exam has not shown yet when it can, the hardest of
// the first pool that has one: this player's reserved observations never shown to them, then any observation never shown
// to them, else the least seen of those never answered right, else the least seen; while a variant group of the unit is
// left (varLeft), among that group's released photos (the first group left). Null when the genus has no game photo.
function examSet(n) {
  const s = P[n] || {},
    ps = s.ps || {},
    done = (s.ex || {}).v || [],
    {two, need, pics: all} = examPics(n);
  const lab = v => (two && v === 'macro' ? 'close' : v);
  const left = varLeft(n),
    V = left.length ? varOf(n, need.flatMap(all)) : null,
    inG = p => varGroup(V.kind(p)) === left[0] && V.f(p) > 0,
    pics = V && need.some(v => all(v).some(inG)) ? v => all(v).filter(inG) : all;
  const vs = need.filter(v => pics(v).length),
    todo = vs.filter(v => !done.includes(lab(v)));
  if (!vs.length) return null;
  const v = pick(todo.length ? todo : vs),
    // Never a photo, or a sibling of one, in the session's window (SEENQ) while another is left: a question planned
    // before this one is not in the photo memory yet.
    L = leastRecent(pics(v), p => [p]),
    // The pool: this player's reserved observations never shown to them (the honest exam); else any observation never
    // shown to them (a photo answered wrong has been seen, and its answer shown); else the least seen of those never
    // answered right; else the least seen. The hardest of the pool is asked. Never shown: on no unit (shownAll: a fish's
    // family and its genus share photos), and by observation, whatever photo or view of it was shown (rules L3, P4): a
    // sibling photo of a fish or a colony already met waits.
    seen = shownAll(),
    obs = p => p.o || p.f,
    seenObs = new Set(
      need
        .flatMap(all)
        .filter(p => seen.has(p.f) || (ps[p.f] || [0])[0])
        .map(obs)
    ),
    never = p => !seen.has(p.f) && !(ps[p.f] || [0])[0] && !seenObs.has(obs(p)),
    held = L.filter(p => p.ho && never(p)),
    fresh = L.filter(never),
    unright = L.filter(p => !(ps[p.f] || [0, 0])[1]),
    least = M =>
      M.slice()
        .sort((a, b) => (ps[a.f] || [0])[0] - (ps[b.f] || [0])[0])
        .slice(0, 3),
    pool = held.length ? held : fresh.length ? fresh : least(unright.length ? unright : L);
  const p = pool.reduce((a, b) => (photoDiff(n, b) > photoDiff(n, a) ? b : a));
  return {shown: [{...p, view: lab(v)}], hint: null, reveal: [], exam: true};
}
// Weighted random pick (weights from f).
function wpick(L, f) {
  const ws = L.map(x => Math.max(0, f(x))),
    t = ws.reduce((a, b) => a + b, 0);
  if (!t) return pick(L);
  let r = Math.random() * t;
  for (let i = 0; i < L.length; i++) {
    r -= ws[i];
    if (r <= 0) return L[i];
  }
  return L[L.length - 1];
}
// Which genus to ask next (docs/LEARNING.md "One draw weight"): a genus weighs what the model does not yet know the
// player holds, drawW = 1 - x c, with x = sig(ability - genusDiff), the chance to recognise an average photo of it, and
// c = m / (m + ELO.n), how sure the Elo is after m answers. Never asked: 1; badly known or barely measured: near 1;
// known and measured: near 1 - x. A genus ready for its next exam question weighs 1 and waits (x 0.05) between two;
// one asked in the last 4 questions is mostly held back (x 0.1), so the work spreads.
let lastQs = [];
const drawW = n => {
  const s = P[n] || {},
    m = (s.ok || 0) + (s.ko || 0);
  return 1 - (sig(ability(n) - genusDiff(n)) * m) / (m + ELO.n);
};
const weight = n => {
  const w1 = drawW(n),
    w = examOn(n) ? (examReady(n) ? 1 : w1 * 0.05) : w1;
  return lastQs.includes(n) ? w * 0.1 : w;
};
// Progressive path (Pierre's rule: docs/LEARNING.md "Which genus comes next: the progressive path", "One opening rule").
// A question may open a genus (its card) when the path allows one (quiz.js planPhoto: no opening hold, not in the floor
// of a visit or a comeback, the pace openPace, the right-answer rule openRight), then does with the chance openChance =
// 1 - shaky / OPEN.K: a slope, and a work-in-progress limit (none opens while K genera met are shaky). The genus opened
// is drawn among those not met yet (openPick): the easiest (genusDiff) first, softly (OPEN.T), and the most common near
// Dauin (core.js commonFactor of data.json cm, relative to the median of the genera not met yet).
// STUCK, STUCK_FROM (docs/LEARNING.md "A unit stuck shaky"): once the player has STUCK_FROM answers (answersSoFar), a
// unit still shaky after STUCK of its own answers stops taking a place among the K. Every subject.
const OPEN = {K: 8, P: 0.6, T: 3, DATA: 300, MAX: 3, WIN: 15, STUCK: 10, STUCK_FROM: 200};
// How much the easy-first order is trusted: the players' weighed answers behind the photo ratings over OPEN.DATA, up to
// 1; without them every genus offset is 0 and the order stays random. A judged photo (p.e, the fish: judging/FISH.md)
// counts PDIFF.W answers, its prior's weight in photoDiff, so judged entries open easiest first from the first card.
const easyTrust = () =>
  Math.min(
    1,
    (Object.values(PSTAT).reduce((t, o) => t + (o[1] || 0), 0) +
      PDIFF.W * slateGenera().reduce((t, n) => t + VIEWS.reduce((u, [v]) => u + gamePics(n, v).filter(p => p.e).length, 0), 0)) /
      OPEN.DATA
  );
// Difficulty of a genus (docs/LEARNING.md "One genus difficulty"): the sheet's genus offset (PGD, ?stats=1 gd: the
// hierarchical photo Elo's estimate of the part of a photo's difficulty its genus shares), the one estimate everywhere
// (drawW, shaky, stability, openPick); adding or curating out a photo never moves it. A unit with judged photos (p.e,
// the fish) adds the mean of their judged-ease priors (photoDiff's), so it opens easiest first. 0 offline before the
// sheet's first reply. Cleared when the photo stats change.
let GDIFF = {};
const genusDiff = n => {
  if (n in GDIFF) return GDIFF[n];
  // its reserved photos too (g.held: core.js heldOf), so a player's reserve does not move it
  const je = [...new Set([...VIEWS.flatMap(([v]) => gamePics(n, v)), ...heldOf(GX(n))])].filter(p => p.e),
    ease = je.length ? je.reduce((t, p) => t + (PDIFF.MID - p.e) * calibOf(SUBJ).ease, 0) / je.length : 0;
  return (GDIFF[n] = Math.round((((PGD[n] || [0])[0] || 0) + ease) * 100) / 100);
};
// Shaky: met, not mastered, and the expected success on an average photo of the genus (4 choices, at its genusDiff)
// still under OPEN.P. The genus ability allows for how hard the questions were and starts from the global level
// (playerStart), so the signal holds at any level from the first answer. Alternatives tried: docs/LEARNING.md.
const shaky = n => {
  const s = P[n] || {};
  // The bar moves with the success aimed for (aimP): OPEN.P at PICKD.P, 0.05 higher for a beginner aimed at 85%, 0.05
  // lower for a strong player at 75%, so a beginner opens a new genus only once those met are a little more solid.
  return ((s.ok || 0) + (s.ko || 0) > 0 || !!s.h) && !s.mx && 0.25 + 0.75 * sig(ability(n) - genusDiff(n)) < OPEN.P + aimP() - PICKD.P;
};
// The chance that a question the path allows to open a genus opens one: the free share of OPEN.K places for shaky
// genera. Only genera open now take a place (introduced): one closed again by "One at a time" (introBack) is never asked
// until its card reopens it, so it would hold the opening at 0 for good. Nor, once the player has OPEN.STUCK_FROM
// answers, does a genus still shaky after OPEN.STUCK of its own: it stays shaky but stops holding the others back.
const openChance = list => {
  const late = answersSoFar() >= OPEN.STUCK_FROM,
    stuck = n => late && ((P[n] || {}).ok || 0) + ((P[n] || {}).ko || 0) >= OPEN.STUCK;
  return Math.max(0, 1 - list.filter(n => introduced(n) && shaky(n) && !stuck(n)).length / OPEN.K);
};
// The rank share (docs/LEARNING.md "The rank share"): a unit that hangs from another (its record's parent: a fish
// scientific genus or species from its family) may open and be asked, but the units hanging from one level together
// take a share of the questions set by how much of that level the player masters.
// - Inputs: each unit's parent (GX(n).parent; none on the slate), the parent's level (rankOf: '' for the slate), and
//   the parents' bars (genScore) against their threshold (GX(p).shareAt, a bar from 0 to 1, else LV_AT[SHARE.AT]:
//   Advanced), so a level or one unit can set its own in its data.
// - Output, per level L: m(L), the share of L's units in play (pool: met, or may open now) at their threshold, and
//   cap(L) = m(L)^SHARE.POW: at most that share of the draw goes to the units hanging from L (shareW, in weighted), and
//   one more of them opens only while their share is under it (shareRoom, quiz.js planPhoto).
// Never capped: a unit with no parent (the slate, the coral bonus genera), a unit the subject frees (app.js shareFree),
// a unit whose parent is no unit of the game (the sea slugs' genera hang from nothing).
const SHARE = {AT: 1, POW: 2};
// The level n hangs from (its parent's rank), null for none; inPool: the units of the game (a parent outside: none).
const shareLv = (n, inPool) => {
  const p = (GX(n) || {}).parent;
  return p && (!inPool || inPool.has(p)) ? (typeof rankOf === 'function' ? rankOf(p) : '') : null;
};
let SHARES = null;
const sharesNow = () => {
  const tick = SUBJ.id + '|' + answersSoFar() + '|' + (typeof Q === 'object' ? JSON.stringify(Q) : '');
  if (SHARES && SHARES.tick === tick) return SHARES;
  const L = typeof pool === 'function' ? pool() : slateGenera(),
    inPool = new Set(L),
    free = new Set(typeof shareFree === 'function' ? shareFree() : []),
    lv = new Map(L.map(n => [n, free.has(n) ? null : shareLv(n, inPool)])),
    cap = {},
    w = {};
  new Set([...lv.values()].filter(x => x !== null)).forEach(k => {
    const up = L.filter(u => (typeof rankOf === 'function' ? rankOf(u) : '') === k && (introduced(u) || mayOpen(u))),
      at = u => (typeof (GX(u) || {}).shareAt === 'number' ? GX(u).shareAt : LV_AT[SHARE.AT]),
      m = up.length ? up.filter(u => genScore(u) >= at(u)).length / up.length : 0;
    cap[k] = Math.pow(m, SHARE.POW);
  });
  // The draw's weights of the units met (drawW), by level hung from ('' key for those hanging from none: '~').
  L.filter(introReady).forEach(n => {
    const k = lv.get(n) === null ? '~' : lv.get(n);
    w[k] = (w[k] || 0) + drawW(n);
  });
  return (SHARES = {tick, inPool, free, lv, cap, w});
};
const shareLvNow = (S, n) => (S.lv.has(n) ? S.lv.get(n) : S.free.has(n) ? null : shareLv(n, S.inPool));
// The weights ws of the units list (weighted), those hanging from a level scaled down so that together they take at most
// its cap of the total (the others keep theirs). None scaled when the list holds only them.
const shareW = (list, ws) => {
  if (list.every(n => shareLv(n) === null)) return ws;
  const S = sharesNow(),
    k = list.map(n => shareLvNow(S, n)),
    out = ws.slice();
  Object.entries(S.cap).forEach(([lv, c]) => {
    if (c >= 1) return;
    let g = 0,
      o = 0;
    out.forEach((x, i) => (k[i] === lv ? (g += x) : (o += x)));
    if (g > 0 && o > 0 && g / (g + o) > c) {
      const f = (c * o) / ((1 - c) * g);
      out.forEach((x, i) => k[i] === lv && (out[i] = x * f));
    }
  });
  return out;
};
// Whether unit n may open now as far as the rank share goes: always for a unit hanging from none; else while the units met
// that hang from its level take less of the draw (drawW) than its cap.
const shareRoom = n => {
  if (shareLv(n) === null) return true;
  const S = sharesNow(),
    lv = shareLvNow(S, n);
  if (lv === null) return true;
  const c = S.cap[lv] || 0,
    g = S.w[lv] || 0,
    t = Object.values(S.w).reduce((a, x) => a + x, 0);
  return c >= 1 || (c > 0 && (t > 0 ? g / t : 0) < c);
};
// The opening's pace (docs/LEARNING.md "One opening rule", "Opening pace"): the genera opened on a card
// (the first cards, or one of their own) in the last OPEN.WIN answers, as at `at` (the answers count at which the
// question will show).
const openRecent = (at = answersSoFar()) =>
  Object.entries(introMap())
    .filter(([n, e]) => /^[sc]$/.test(e[3] || (e[1] ? 's' : 'c')) && !closed(n) && at - (Number(e[0]) || 0) < OPEN.WIN)
    .map(([n]) => n);
// No new genus while one opened in the last OPEN.WIN answers has not been asked yet (its card read, its question still
// to come), nor once OPEN.MAX of them have opened: about 3 new genera per 15 answers at most, whatever openChance says.
// Both read the same window, so a genus whose question is slow to come holds the next card OPEN.WIN answers at most.
// soon: the genera of the questions already on screen or planned before this one (quiz.js planNext), asked by then.
const openPace = (at = answersSoFar(), soon = []) => {
  const L = openRecent(at);
  return L.length < OPEN.MAX && L.every(n => askedOpen(n) || soon.includes(n));
};
// The genera opened on a card in the last OPEN.WIN answers whose question is still to come once they are ready (quiz.js
// planPhoto, tools/ratedworld.js): the question asks one of them first, so the opening's pace is openPace's ceiling, not
// the luck of the draw. list: the units in play; soon as openPace's.
const openDue = (at, list, soon = []) =>
  openRecent(at).filter(n => !askedOpen(n) && !soon.includes(n) && introReady(n) && list.includes(n));
// An opening only after a right answer (docs/LEARNING.md "An opening only after a right answer": a new genus must not
// feel like a reward for a miss): the path opens a genus only when the last graded answer was right, or there was none;
// the opening is deferred, not lost. Every graded answer counts, whatever the game: the global record's recent results
// (P[LEVEL].h, newest last, written by quiz.js answer). at: the answers count at which the question will show; planned
// ahead (at > answersSoFar()) it may hold a card: a miss drops every question planned (quiz.js dropPlans), and
// quizPhoto checks again when it shows one.
function openRight(at = answersSoFar()) {
  return at > answersSoFar() || !((P[LEVEL] || {}).h || '').endsWith('0');
}
// Whether the player ever answered "I'm at IMR" to the subject's first-launch question, whatever the answer in force now
// (docs/decisions/2026-11-18-decisions-from-app-comments.md): an imr answer in the record's history (the card, the tour,
// the fallback card; h: core.js startEvents, startUnion, merged as a union across devices), or a fallback card shown on
// an imr answer (fb, keyed by the imr answer then its direction). An inferred answer (startInfer) and the ease events
// are no answer.
const imrSaid = () => {
  const o = store.get(startKey(SUBJ.id), null);
  return (
    startEventsOf(o).some(x => x[0] === 'imr' && x[3] !== 'ease' && x[3] !== 'inferred') ||
    Object.keys((o && typeof o.fb === 'object' && o.fb) || {}).some(k => k.split('-')[0] === 'imr')
  );
};
// Families met first: while a unit of the slate in play is still to open (in fresh: those not met that may open now),
// the units of a set that opens after the slate (app.js setLater: the fish scientific genera once accepted) wait. After
// Open all (openedAll: a unit opened by it and not closed again) nothing waits.
const openedAll = () => Object.values(introMap()).some(e => (e || [])[3] === 'a');
const laterWaits = fresh => {
  if (typeof setLater !== 'function') return [];
  const sl = new Set(slateGenera());
  return fresh.some(n => sl.has(n)) && !openedAll() ? fresh.filter(n => !sl.has(n) && setLater(n)) : [];
};
// Confusion groups (docs/LEARNING.md "Confusion groups"): look-alike units open close together. The units of one rank in
// play (pool(), app.js rankOf) are grouped, the same for every player, recomputed with the pooled stats:
// 1. declared pairs (a teacher's look-alikes, `look`; declaredOf) merge first, the most confused first (groupConf), ties
//    alphabetical, while the group stays at GROUP.MAX units or fewer; the data never split them;
// 2. then average linkage on the pooled score: the two groups whose pairs have the highest mean merge, while that mean is
//    CONF.TRAP or more and the group stays at GROUP.MAX or fewer (ties alphabetical).
// A unit in no group is a lone unit; a declared pair the cap kept apart pulls nothing. MAX 3: the size of the
// interleaving studies.
const GROUP = {MAX: 3};
// A unit's declared look-alikes: `decl` where its record lists them apart from `look` (app.js treeGenera: a fish scientific
// genus's `look` holds every sibling genus by construction, its `decl` the genera of its IMR sub-entry), else `look`.
const declaredOf = n => (GX(n) || {}).decl || (GX(n) || {}).look || [];
const declared = (t, n) => declaredOf(t).includes(n) || declaredOf(n).includes(t);
// The pair's pooled score for grouping: pooledConf's, on the declared test (the same score for the corals and the fish
// families, whose `look` is what a teacher declared; for the fish genera, siblings start at the family prior).
const groupConf = (t, n) => confScore(PCONF[t < n ? t + '|' + n : n + '|' + t], confPrior(t, n, declared(t, n)));
// The groups of the units L (one rank): {unit: its group, members in alphabetical order}; a lone unit has none.
function groupsOfRank(L) {
  L = [...L].sort();
  const cl = new Map(L.map(n => [n, [n]])),
    sc = {},
    s = (a, b) => sc[a < b ? a + '|' + b : b + '|' + a],
    merge = (A, B) => {
      const C = [...A, ...B].sort();
      C.forEach(n => cl.set(n, C));
    },
    edges = [];
  L.forEach((a, i) =>
    L.slice(i + 1).forEach(b => {
      const v = (sc[a + '|' + b] = groupConf(a, b));
      if (declared(a, b) || v >= CONF.TRAP) edges.push([a, b, v]);
    })
  );
  // 1. Declared pairs, the most confused first.
  edges
    .filter(([a, b]) => declared(a, b))
    .sort((x, y) => y[2] - x[2] || (x[0] + '|' + x[1] < y[0] + '|' + y[1] ? -1 : 1))
    .forEach(([a, b]) => {
      const A = cl.get(a),
        B = cl.get(b);
      if (A !== B && A.length + B.length <= GROUP.MAX) merge(A, B);
    });
  // 2. Average linkage: a mean of CONF.TRAP or more needs one pair at CONF.TRAP or more, so only groups an edge joins.
  for (;;) {
    let best = null;
    edges.forEach(([a, b]) => {
      const A = cl.get(a),
        B = cl.get(b);
      if (A === B || A.length + B.length > GROUP.MAX) return;
      const m = A.reduce((t, x) => t + B.reduce((u, y) => u + s(x, y), 0), 0) / (A.length * B.length),
        k = [A[0], B[0]].sort().join('|');
      if (m >= CONF.TRAP && (!best || m > best[0] || (m === best[0] && k < best[1]))) best = [m, k, A, B];
    });
    if (!best) break;
    merge(best[2], best[3]);
  }
  const out = {};
  cl.forEach((C, n) => C.length > 1 && (out[n] = C));
  return out;
}
// The groups of the units in play, every rank (of), rebuilt only when their inputs change (the clustering takes tens of
// milliseconds): the units in play (pool()) or the pooled stats (a new PCONF object). The units in play are read again
// only when something that moves them may have changed (the subject, the answers count, the settings Q).
let GROUPS = null;
const groupsNow = () => {
  const tick = SUBJ.id + '|' + answersSoFar() + '|' + (typeof Q === 'object' ? JSON.stringify(Q) : '');
  if (GROUPS && GROUPS.tick === tick && GROUPS.pc === PCONF) return GROUPS;
  const L = typeof pool === 'function' ? pool() : slateGenera(),
    key = L.join('|');
  if (GROUPS && GROUPS.key === key && GROUPS.pc === PCONF) return Object.assign(GROUPS, {tick});
  const by = {};
  L.forEach(n => (by[rankOf(n)] = by[rankOf(n)] || []).push(n));
  GROUPS = {tick, key, pc: PCONF, of: Object.assign({}, ...Object.values(by).map(groupsOfRank))};
  return GROUPS;
};
const groupMap = () => groupsNow().of;
// The other members of n's group (none for a lone unit).
const groupMates = n => (groupMap()[n] || []).filter(m => m !== n);
// The group partners of n still to meet that can open (mayOpen: a unit behind a gate holds nobody back).
const matesLeft = n => groupMates(n).filter(m => !introduced(m) && mayOpen(m));
// The genus to open among those not met yet (fresh), after the filters above (the starter core, "I'm at IMR"):
// 1. a group partner of a unit met: once a group has a member open, its others are the next openings, one at a time;
// 2. otherwise a new group or lone unit, drawn with the weight below on the group's means (genusDiff, cm), then its
//    member by the same weight. The first cards (introStart, first: true) are drawn unit by unit, no partner first.
// The weight: the easiest first, softly (OPEN.T, as far as easyTrust allows), and the most common near Dauin
// (commonFactor). A ★ genus waits while a genus its card compares it to is in the list and not met (core.js starWaits),
// partners included; should every genus left wait, they all open.
// met: the genera already met (introStart passes the cards drawn before it in the same batch as met too).
const easyWeights = (gd, cm) => {
  const lo = Math.min(...gd),
    tr = easyTrust(),
    cf = commonFactor(cm);
  return gd.map((d, k) => Math.exp(-OPEN.T * tr * (d - lo)) * cf[k]);
};
const easyDraw = L => {
  const w = easyWeights(
    L.map(genusDiff),
    L.map(n => (GX(n) || {}).cm)
  );
  return wpick(
    L.map((n, k) => [n, w[k]]),
    x => x[1]
  )[0];
};
// A group's mean commonness, over the members that have one (none: commonFactor's neutral 1).
const meanCm = u => {
  const v = u.map(n => (GX(n) || {}).cm).filter(x => typeof x === 'number' && x >= 0);
  return v.length ? v.reduce((a, x) => a + x, 0) / v.length : undefined;
};
function openPick(fresh, list = fresh, met = introduced, {first: firstCards = false} = {}) {
  const wait = laterWaits(fresh);
  if (wait.length) fresh = fresh.filter(n => !wait.includes(n));
  // The starter core first: units whose record says
  // `first` (fish.json start: the Butterflyfishes, Angelfishes, Damselfishes, Surgeonfishes) open before any other,
  // as long as one is left; then the rule below. Data, not code: the corals have none.
  const first = fresh.filter(n => (GX(n) || {}).first);
  if (first.length) fresh = first;
  // "I'm at IMR", ever answered (imrSaid): the units the IMR course teaches (their IMR tag imrName: fish.json imr on
  // families and genera) open before the others. Data, not code: the corals have none.
  if (imrSaid()) {
    const tagged = fresh.filter(n => (GX(n) || {}).imrName);
    if (tagged.length) fresh = tagged;
  }
  const free = n => !starWaits(DATA, n, list, met),
    ok = fresh.filter(free);
  if (ok.length) fresh = ok;
  if (firstCards) return easyDraw(fresh);
  // 1. Group partners of a unit met.
  const G = groupMap(),
    mates = fresh.filter(n => groupMates(n).some(met));
  if (ok.length && mates.length) return easyDraw(mates);
  // 2. A new group or lone unit: each group as its members in fresh (a lone unit alone).
  const units = [],
    seen = new Set();
  fresh.forEach(n => {
    if (seen.has(n)) return;
    const u = (G[n] || [n]).filter(m => fresh.includes(m));
    u.forEach(m => seen.add(m));
    units.push(u);
  });
  const w = easyWeights(
      units.map(u => u.reduce((t, n) => t + genusDiff(n), 0) / u.length),
      units.map(meanCm)
    ),
    u = wpick(
      units.map((x, i) => [x, w[i]]),
      x => x[1]
    )[0];
  return u.length > 1 ? easyDraw(u) : u[0];
}
// First meeting with a genus (Pierre's rule: docs/LEARNING.md "First meeting with a genus"): a player starting from zero
// first meets INTRO.START genera on cards (name, cover photo, ID tips) and is asked about those; new genera then come one
// at a time, each on its card, never as the answer of the question right after it: a genus met on a single card can be
// asked from INTRO.GAP answers on, and a new card waits while one is still to be asked (openPace) and while introHold
// (below). Which genus opens and when is the progressive path's (weighted, OPEN). Kept per subject
// (reefid-sync-<subject>-intro: genus -> [answers when shown, 1 if ready at once, time, kind]); a genus already asked
// counts as met. Bonus genera (app.js Q.bon) open the same way, on their own card.
// OFFER: the record of Open all (introAll) and of the back card (introBack). Both synced with the progress (sync.js
// introMerge).
const INTRO = {
  get KEY() {
    return sKey('intro'); // reefid-sync-<subject>-intro (app.js SUBJ)
  },
  START: 4,
  GAP: 2,
  HOLD: 1.5,
  SLACK: 0.1,
  OFFER: {
    get KEY() {
      return sKey('intro-offer');
    }
  }
};
let INTROS = null;
const introMap = () => {
  if (INTROS) return INTROS;
  const m = store.get(INTRO.KEY, {});
  return (INTROS = m && typeof m === 'object' && !Array.isArray(m) ? m : {});
};
// kind (readiness and answer count alone cannot tell them apart once synced): 's' one of the first
// cards, 'c' a card of its own (or a duel's), 'a' opened with Open all genera.
const introAdd = (L, start, kind = start ? 's' : 'c') => {
  const m = introMap(),
    a = answersSoFar();
  // [answers so far, 1 when ready at once (first cards, Open all, a duel's), time shown, kind] (time and kind: the admin's
  // player journey).
  L.forEach(n => (m[n] = [a, start ? 1 : 0, Date.now(), kind]));
  store.set(INTRO.KEY, m);
  syncSoon(); // sent at once, not with the next answer: a card left without answering is met on the other devices too
};
const asked = n => !!((P[n] || {}).ok || (P[n] || {}).ko);
// Asked since the path opened it: an answer at or after the time of its entry (the card, the first cards, Open all: e[2]),
// read from the unit's last answer (s.at, answeredAt; the replay keeps the later of the two). The readers that wait for
// the card's own question (openPace, openDue, introReady, the circles' and the bonus offer's "every unit asked", the
// all-met card) read this, not asked: a live game's answers before the card (introLive; rule L4) and those before a card
// that reopens a unit closed by One at a time count as evidence, never as the card's question. An entry with no time,
// or a record with no s.at (both older): any answer, as asked.
const askedOpen = n => {
  if (!asked(n)) return false;
  const e = introMap()[n],
    at = (P[n] || {}).at;
  return !e || !(Number(e[2]) > 0) || typeof at !== 'number' || at >= e[2];
};
// Closed again by "One at a time" (introBack, below), or answered in another mode before the path opened it (introLive,
// below): kind 'b' wins over the answers already given until a card (or Open all) opens the genus again and replaces
// the mark; the unit keeps its answers.
const closed = n => (introMap()[n] || [])[3] === 'b';
// A live game's answer on a unit the path has not opened (live.js liveLog; rule L4: another mode's answers count as
// evidence on a locked unit, never opening it): the unit gets the closed mark 'b' with no time (0), so its answers
// count and it waits for its card. With no time, the mark never replaces an entry another device holds and any timed
// opening replaces it (introMerge); One at a time's own marks carry their time. Nothing for a unit already met (a card,
// an answer, Open all) or closed.
const introLive = n => {
  if (introduced(n) || closed(n)) return;
  const m = introMap();
  m[n] = [answersSoFar(), 0, 0, 'b'];
  store.set(INTRO.KEY, m);
};
const introduced = n => !closed(n) && (asked(n) || n in introMap());
const introReady = n => {
  if (closed(n)) return false;
  if (askedOpen(n)) return true;
  const e = introMap()[n];
  return !!e && (!!e[1] || answersSoFar() >= e[0] + INTRO.GAP);
};
// "I've had the IMR lecture": an RA has seen every genus in the lecture, so one card at a time would hold them back. On
// the first cards and in My progress, one tap opens at once, without cards, every unit the lecture teaches (app.js
// UNITS core: the fish circle 1; the corals' whole slate). The bonus genera (opt-in, app.js BONUS) and the later fish
// circles (app.js treeGate) still open one at a time.
const unitsNow = () => (typeof UNITS === 'object' && UNITS[SUBJ.id]) || {};
const slateCore = () => (unitsNow().core || slateGenera)();
const introLeft = () => slateCore().filter(n => !introduced(n));
// Whether a unit may open now (app.js UNITS gate: the fish circles 2 and 3 wait for their thresholds) and, for a part of
// the slate opened by choice, once the player said yes (app.js UNITS opens, openShut: fish circle 3); always for a
// subject with neither. The opening's candidates only (quiz.js introStart, planPhoto): a unit already open stays open.
const mayOpen = n => !(typeof openShut === 'function' && openShut(n)) && (!unitsNow().gate || unitsNow().gate(n));
// One progression path for every game (docs/LEARNING.md "One progression path for every game"): the genera this player
// has unlocked, met on the path (a card, an answer, Open all) and ready (introReady), among those in play. The photo
// quiz opens genera one at a time (its cards, the ★ rule: core.js starWaits); every other game draws from these only and
// opens none, so the ★ rule holds there by construction.
const unlocked = (list = pool()) => list.filter(introReady);
// via: where the player opened them ('card' the first cards, 'progress' My progress; 'offer' in an older record, the
// offer card), kept for the admin's player journey.
// n: how many opened at once; h: the drop since then (holdStep, below); a choice already made on the back card (bk, bat,
// bn, bt) is kept, so the card is never made again.
const introAll = via => {
  const L = introLeft(),
    o = store.get(INTRO.OFFER.KEY, null) || {};
  introAdd(L, true, 'a');
  store.set(INTRO.OFFER.KEY, {
    at: answersSoFar(),
    open: 1,
    via,
    t: Date.now(),
    n: L.length,
    h: 0,
    ...(o.bk ? {bk: o.bk, bat: o.bat, bn: o.bn, bt: o.bt} : {})
  });
};
// Back to one at a time (docs/LEARNING.md "First meeting with a genus"): after Open all, the record keeps h, the opening
// hold's own CUSUM (holdNext, same expectation e and allowance INTRO.SLACK) over the answers given since. The card is due
// once h reaches 2 x INTRO.HOLD (about three answers' worth of misses beyond the expected success): undoing a choice
// needs more evidence than pausing new cards. Offered once: "Keep them all" or "One at a time" is kept with the record
// (bk), synced (introMerge: the latest decision wins).
const backOpen = () => Object.keys(introMap()).filter(n => introMap()[n][3] === 'a');
const backDue = () => {
  const o = store.get(INTRO.OFFER.KEY, null);
  return !!(o && o.open && !o.bk && (Number(o.h) || 0) >= 2 * INTRO.HOLD && backOpen().length);
};
// "One at a time" closes every genus opened by Open all (kind 'a'), answered or not: the mark 'b'
// takes it out of the draw (introduced, introReady false) until the progressive path opens it again on its card, one at
// a time, with the progress it had (answers, ability and log are kept). Genera opened before (first cards, own cards)
// stay open. keep: "Keep them all", nothing changes. Either way, kept with the record for the admin's player journey.
const introBack = keep => {
  const o = store.get(INTRO.OFFER.KEY, null) || {},
    L = keep ? [] : backOpen(),
    m = introMap(),
    a = answersSoFar(),
    now = Date.now();
  L.forEach(n => (m[n] = [a, 0, now, 'b']));
  if (L.length) store.set(INTRO.KEY, m);
  store.set(INTRO.OFFER.KEY, {...o, bk: keep ? 'keep' : 'one', bat: a, bn: L.length, bt: now});
  syncSoon();
  return L;
};
// Another device's cards (synced): a genus met there is met here too, and ready (its card was seen); Open all and the
// back card's choice, made on one device, hold on another. Progress reset: the cards start over with it.
function introMerge(m, o) {
  try {
    m = renameUnits(SUBJ, JSON.parse(m || 'null')); // the old unit ids another device may still save (core.js SUBJECTS renamed)
    o = JSON.parse(o || 'null');
  } catch (e) {
    return;
  }
  if (m && typeof m === 'object' && !Array.isArray(m)) {
    const L = introMap();
    let ch = false;
    // A genus closed by "One at a time" ('b') on one device is closed here too, and one opened again since by its card
    // on one device is open here too: between a mark and an opening, the later one (its time) wins. A card ('c') later
    // than an Open all ('a') can only be a reopening after a 'b' mark, so it is kept too: a delayed 'b' older than that
    // reopening must not close the genus again (a@100, then c@300, then b@200). A live game's mark (introLive: 'b' with
    // no time) is older than any timed entry: it never replaces one, and any timed opening replaces it.
    const later = (h, e) => (e[3] === 'b' || h[3] === 'b' || (h[3] === 'a' && e[3] === 'c')) && (e[2] || 0) > (h[2] || 0);
    let open = false; // a genus closed or reopened here: the questions planned ahead may be about it (or offer it)
    Object.entries(m).forEach(([n, e]) => {
      if (!Array.isArray(e)) return;
      const h = L[n];
      if (h && later(h, e) && (e[3] === 'b') !== (h[3] === 'b')) open = true;
      if (!h || later(h, e)) ch = L[n] = [e[0] || 0, e[3] === 'b' ? 0 : 1, e[2] || 0, e[3] || (e[1] ? 's' : 'c')];
    });
    if (ch) store.set(INTRO.KEY, L);
    // The planned questions (quiz.js takePlan) only check the answer count and the pool, so they are dropped and drawn
    // again with the genera as they now are.
    if (open && typeof dropPlans === 'function') dropPlans();
  }
  // The latest decision wins (its time t): declined on one device, then Open all on another, must not go back to the
  // decline at the next sync. Without times, the one already here stays.
  // The back card's choice (bt) is a decision too.
  const here = store.get(INTRO.OFFER.KEY, null),
    tt = x => Math.max(x.t || 0, x.bt || 0);
  if (o && typeof o === 'object' && (!here || tt(o) > tt(here))) store.set(INTRO.OFFER.KEY, o);
}
// at: a progress reset made on another device (its time, sync.js mergeSubject); none: made here.
const introReset = at => {
  INTROS = {};
  HOLDS = 0; // the opening hold starts over with the progress (holdStep, below; called after this file has run)
  store.set(HOLDK(), 0);
  CB = {r: 0, t: 0, ok: 0, f: 0}; // and the comeback (below)
  store.set(COMEBACK.KEY, CB);
  store.set(INTRO.KEY, {});
  store.set(INTRO.OFFER.KEY, null);
  // The first-launch question's answer is kept; its fallback window starts over with the answers (each subject's own: a
  // fish reset leaves the corals' window, which counts coral answers).
  if (startOn()) startRestart(at);
};
// The first-launch question (core.js CHOICE; docs/LEARNING.md "The first-launch question"), one per subject (SUBJECTS
// start). The answer is kept in reefid-sync-<subject>-start (startK; synced): {c the choice, t its time, at the answers
// count then, via (tour, card, fallback, inferred), ease the silent band below taken with Coral basics on the "lower"
// card ([c, answers, time], startEase), n and s the fallback window (answers counted since the choice, up to the last of
// CHOICE.AT, and the sum of their surprise, right - e), fb the fallback cards shown ({'<choice>-lo' / '-hi': [answers,
// time]}), h the choices made [c, at, t, via], for the admin's player journey}. Only its variables (startV) reach the
// model: the level a genus never answered starts from (ability, core.js playerStart).
const startS = () => SUBJ || SUBJECTS[0]; // the subject on screen
const startK = () => startKey(startS().id); // its record (core.js startKey)
const startOf = () => {
  const o = store.get(startK(), null);
  return o && typeof o === 'object' && startOpt(o.c) ? o : null;
};
// A subject without a question of its own (no SUBJECTS start) plays as the default player.
const startOn = () => !!startS().start;
// The variables in force: the answer given, or the band below it once the gentle "lower" card's Coral basics was taken
// (startEase: ease [c, answers, time], kept apart from the answer, which is never relabelled).
const startEff = o => (o && Array.isArray(o.ease) && startOpt(o.ease[0]) ? o.ease[0] : o && o.c);
const startV = () => startVars(startOn() ? startEff(startOf()) : null);
// The gentle "lower" card's Coral basics (quiz.js startFbShow): the start variables move silently one band down from
// those in force (know -> IMR course values, IMR course -> new: the prior); the answer stays.
function startEase() {
  const o = startOf(),
    d = o && startNext(startEff(o), 'lo')[0];
  if (!d) return;
  // An ease event in the history (core.js startEvents): from now until the next answer given, bound to this answer's
  // choice event (its time).
  store.set(
    startK(),
    startNorm({...o, h: startEventsOf({...o, h: [...startEvents(o), [d, answersSoFar(), Date.now(), 'ease', o.c, o.t]]})})
  );
  if (typeof dropPlans === 'function') dropPlans();
  if (typeof syncSoon === 'function') syncSoon();
}
function startSet(c, via) {
  if (!startOpt(c)) return;
  const o = startOf(),
    a = answersSoFar(),
    t = Date.now();
  // A choice event appended to the history (core.js startEvents; an earlier ease does not carry over: startNorm).
  store.set(
    startK(),
    startNorm({c, t, at: a, via, w: [], fb: (o && o.fb) || {}, h: startEventsOf({h: [...startEvents(o), [c, a, t, via]]})})
  );
  // The questions chosen ahead were planned with the old starting level.
  if (typeof dropPlans === 'function') dropPlans();
  if (typeof syncSoon === 'function') syncSoon();
}
// A progress reset: the answer stays (it is about the player, not the progress), its window counts from 0 again, from a
// new epoch wt, so a window saved before the reset never wins a merge over the new one. A reset made
// here starts a new epoch now; one made on another device (at: its time) takes that time as the epoch, and leaves a
// window already counted since it (merged from that device by startMerge) as it is: never a newer epoch than the
// reset's, which would win back on the device that made it and empty the window it has counted since.
function startRestart(at) {
  const o = startOf();
  if (!o) return;
  const e = typeof at === 'number' && isFinite(at) ? at : Math.max(Date.now(), startWt(o) + 1);
  if (startWt(o) >= e) return; // the window already counts from that reset, or from an answer given after it
  store.set(startK(), {...o, at: 0, w: [], v: null, hd: 0, wt: e});
}
// startWt, the window's epoch: core.js.
// The fallback window (quiz.js answer): each answer after the choice, up to the last of CHOICE.AT, as [its difficulty (dm, as the
// ability step takes it), the guess rate 1 / k, right, the genus's first answer]; hd once the opening hold has been on
// at one of them. At each checkpoint (CHOICE.AT: 40 and 60 answers) the verdict (core.js startCheck), on the global level and
// the slate genera met then, is kept as v until its card shows (startDue).
function startStep(d, k, good, first) {
  const o = startOf();
  if (!o || !startOn() || typeof d !== 'number' || !isFinite(d)) return; // an answer of the subject on screen (startK)
  const w = Array.isArray(o.w) ? o.w : [];
  if (w.length >= Math.max(...CHOICE.AT)) return;
  const W = [...w, [Math.round(d * 100) / 100, k > 0 && isFinite(k) ? Math.round(1000 / k) / 1000 : 0, good ? 1 : 0, first ? 1 : 0]],
    hd = o.hd || (introHold() ? 1 : 0),
    v = startCheck(W, o.c, (P[LEVEL] || {}).th, slateGenera().filter(introduced).length, hd);
  store.set(startK(), {...o, w: W, hd, ...(v ? {v} : {})});
}
// The fallback card due: 'lo' (clearly harder than the choice predicts) or 'hi' (clearly easier), once per inconsistency:
// once per answer and direction (fb '<choice>-lo'), so a player who moved from "I know corals well" to "I had the IMR
// coral course" and still struggles is told once more, never twice about the same answer; and only when it has
// something to offer: a lower choice or Coral basics not done yet ('lo'), a higher choice ('hi').
// Never for a subject whose units say startFb false (app.js UNITS: the fish, until their level is better calibrated;
// docs/FISH_PATH.md).
const startDue = () => {
  if (!startOn() || (typeof UNITS === 'object' && (UNITS[startS().id] || {}).startFb === false)) return null;
  const o = startOf(),
    d = o && o.v;
  // An inferred answer (an existing player, never asked) is not checked: the player said nothing to correct. After an
  // answer changed on a fallback card, never the other way back (simulated, a lecture-level RA moved up at 60 answers was
  // then told to go back down on the harder genera opened next: a contradiction, not a correction).
  if (!d || o.via === 'inferred' || (o.fb || {})[o.c + '-' + d] || startBack(o, d)) return null;
  // 'lo' is the basics offer (quiz.js startFbShow): none once it is done, nor for a subject without one (app.js basicsDue);
  // 'hi' offers the higher answers.
  return d === 'lo' ? (basicsDue() ? d : null) : startNext(o.c, d).length ? d : null;
};
// The opposite of the last move made on a fallback card ('lo' after moving up, 'hi' after moving down, the silent
// move down of Coral basics on the "lower" card included).
const startBack = (o, d) => {
  if (d === 'hi' && Array.isArray(o.ease)) return true;
  const h = startEvents(o).filter(x => x[3] !== 'ease'), // the answers given (core.js startEvents)
    i = c => CHOICE.opts.findIndex(x => x[0] === c),
    a = h[h.length - 2],
    b = h[h.length - 1];
  if (!a || !b || b[3] !== 'fallback') return false;
  return d === (i(b[0]) > i(a[0]) ? 'lo' : 'hi');
};
// Marked when shown, so it never comes again even if left unanswered.
const startShown = d => {
  const o = startOf();
  if (o) store.set(startK(), {...o, v: null, fb: {...(o.fb || {}), [o.c + '-' + d]: [answersSoFar(), Date.now()]}});
};
// Another device's record (sync.js mergeSaved): the union of the two histories (core.js startUnion: the latest answer,
// the ease in force on it, every earlier answer and ease kept with its time, so the replay keeps each one's prior; the
// window of the record that holds the current answer, on the same answer the later reset epoch then the longer window;
// the fallback cards shown on either). The questions planned ahead are dropped when the variables in force change.
// id: the subject whose record it is (each has its own, core.js startKey), the one on screen by default.
function startMerge(json, id = startS().id) {
  let r = null;
  try {
    r = JSON.parse(json || 'null');
  } catch (e) {}
  if (!r || typeof r !== 'object' || !startOpt(r.c)) return;
  const k = startKey(id),
    h = store.get(k, null),
    o = h && typeof h === 'object' && startOpt(h.c) ? h : null,
    m = startUnion(o, r),
    before = o && startEff(o);
  if (!m) return;
  store.set(k, m);
  if (id === startS().id && (!o || before !== startEff(m)) && typeof dropPlans === 'function') dropPlans();
}
// The question waiting on its card (quiz.js startAskShow) answered on another device: the quiz goes on. Called by
// sync.js mergeSaved once every record is merged (never from startMerge, which runs before the progress and cards are).
function startResume() {
  if (startOf()) document.querySelectorAll('.unlock.startq:not(.basicsq)').forEach(d => d.ulDone && d.ulDone());
}
// Opening held while the player does clearly worse than expected (docs/LEARNING.md "First meeting with a genus", "Held
// while the player falls behind"; Pierre's words: docs/decisions/2026-11-18-decisions-from-app-comments.md). A CUSUM
// (Page 1954) of how far the answers fall below the success the game expected (each answer's e), less INTRO.SLACK an
// answer, never below 0: a run of misses adds up however long it lasts, and right answers pay the debt back by what they
// beat the expectation by. No new card while it is INTRO.HOLD or more. SLACK keeps a player the game slightly overrates
// from being held for good. Kept on the device (reefid-hold) across visits and, for a signed-in player, rebuilt by the
// sheet from all their answers (holdSync, below); cleared with the progress. Comeback questions count with the
// expectation they really had (logged |c); old gentle-restart answers (logged |w) are left out.
const HOLDK = () => sDev('hold'); // reefid-hold for corals (core.js subjDev)
let HOLDS = Number(store.get(HOLDK(), 0)) || 0;
const introHold = () => HOLDS >= INTRO.HOLD;
// Easier questions while the hold is on (docs/LEARNING.md "Decision log"): the ability the photos and the format (traps,
// single views) aim at is lowered by how far the sum h has gone past INTRO.HOLD, in logits: 0 at the threshold (no
// cliff), 1 for each answer's worth of misses beyond it. h is already in success units, the scale the Elo steps the
// ability on. Never on an exam question.
const holdEase = () => Math.min(0, INTRO.HOLD - HOLDS);
// slack: the allowance an answer (INTRO.SLACK for the hold; the comeback's CUSUM passes the rust a question repairs
// plus INTRO.SLACK).
const holdNext = (h, e, good, slack = INTRO.SLACK) =>
  Math.max(0, Math.round((h + (Number(e) || 0) - (good ? 1 : 0) - slack) * 1000) / 1000);
function holdStep(e, good) {
  HOLDS = holdNext(HOLDS, e, good);
  store.set(HOLDK(), HOLDS);
  // The same sum since Open all, from 0, until the back card is answered (backDue, above). Each device counts its own
  // answers (the record goes with the progress; a newer decision replaces it).
  const o = store.get(INTRO.OFFER.KEY, null);
  if (o && o.open && !o.bk) store.set(INTRO.OFFER.KEY, {...o, h: holdNext(Number(o.h) || 0, e, good)});
}
// Synced: each load of the saved progress (sync.js mergeSaved) brings h, the same sum over every answer the sheet has
// logged for the player since their last reset (Code.gs hold_, |w answers left out); the answers of this device the
// sheet has not confirmed yet (log) are added on top. So the hold is the same on every device. Without h from the sheet,
// or not signed in: this device's own.
const HOLD_WARM = /\|w(\||$)/; // the mode of an old gentle-restart answer (old rows only)
// ids: the answers the sheet counted lately (a send whose reply was lost stays in the log though the sheet has it; it is
// not added twice).
function holdSync(h, log, ids) {
  if (typeof h !== 'number' || !isFinite(h)) return;
  const reset = store.get(sKey('reset'), '') || '',
    had = new Set(Array.isArray(ids) ? ids.map(String) : []);
  const x = (log || []).reduce(
    (t, a) => (a && !had.has(String(a.id)) && !HOLD_WARM.test(a.m || '') && String(a.t || '') > reset ? holdNext(t, a.e, a.ok) : t),
    Math.max(0, h)
  );
  if (x !== HOLDS) {
    HOLDS = x;
    store.set(HOLDK(), HOLDS);
  }
}
// Comeback after a break (Pierre's rule: docs/LEARNING.md "Comeback after a break"). Time is used here and only here
// (rule L1): progress (s.pg), mastery (s.mx) and the ability (s.th) never decay with time.
// - Recall t days after a genus's last answer (s.at), FSRS's curve: R = (1 + F t / S)^C, S the stability in days.
// - Stability: from FSRS's S0 to S1, log-linear in x = sig(ability - genusDiff) (1 once learned), times G for each
//   further day the genus was answered right (s.dd: spaced days count, not answers in one sitting).
// - Rust: the right answers the break is expected to have cost, summed over the genera answered (rustOf). A comeback
//   starts at a new visit whose gap left rust.
// - Its questions (quiz.js planPhoto): genera answered right, the surest half until one is right, then the most rusted
//   half; the usual choices (trapsFor), photos aimed at ability + ln R; no card, duel or exam; logged |c.
// - It ends by the answers: a CUSUM like the hold's (holdNext), allowance the rust a question repairs plus INTRO.SLACK.
// - SESSION.GAP: a new visit starts after 30 minutes without an answer (the web-analytics session timeout), never at a
//   page load. From a new visit, and during a comeback, the first COMEBACK.FLOOR answers open no genus. Neither applies
//   with fewer than 2 genera answered right.
// Kept on the device (reefid-comeback: r rust, t time accounted, ok right answers in it, f answers count until which no
// genus opens); the times per genus (s.at; s.dd, s.dl: days answered right, the last one) are in the synced progress,
// the player's last answer in P[LEVEL].at.
const FSRS = {F: 19 / 81, C: -0.5, S0: 0.4, S1: 15.7, G: 2.5};
const SESSION = {GAP: 30 * 60000};
const COMEBACK = {
  get KEY() {
    return sDev('comeback'); // reefid-comeback for corals
  },
  FLOOR: 10
};
const DAY = 864e5;
const cbLoad = () =>
  (o => (o && typeof o === 'object' ? {r: +o.r || 0, t: +o.t || 0, ok: +o.ok || 0, f: +o.f || 0} : {r: 0, t: 0, ok: 0, f: 0}))(
    store.get(COMEBACK.KEY, null)
  );
let CB = cbLoad();
const cbSave = () => store.set(COMEBACK.KEY, CB);
const recallOf = (days, S) => (1 + (FSRS.F * Math.max(0, days)) / S) ** FSRS.C;
// The local calendar day of a time (days answered right, s.dd).
const dayNo = (t = Date.now()) => Math.floor((t - new Date(t).getTimezoneOffset() * 60000) / DAY);
function stability(n) {
  const s = P[n] || {},
    x = s.mx ? 1 : sig(ability(n) - genusDiff(n));
  return FSRS.S0 * (FSRS.S1 / FSRS.S0) ** x * FSRS.G ** Math.max(0, (s.dd || 1) - 1);
}
// The player's last answer (P[LEVEL].at, synced); progress saved before it existed: the last answer of this subject in
// the log kept on the device, if any (core.js subjEntries: every subject's answers are logged).
const lastAt = () => {
  const a = (P[LEVEL] || {}).at;
  if (a) return a;
  let L = [];
  try {
    L = subjEntries(
      (typeof SYNC !== 'undefined' && SYNC && SYNC.log) || (typeof LOG0 !== 'undefined' && store.get(LOG0, [])) || [],
      SUBJ.id
    );
  } catch (e) {}
  return (L.length && Date.parse(L[L.length - 1].t)) || 0;
};
// Recall of genus n at time t (a genus with no time of its own: the player's last answer).
const recallAt = (n, t = Date.now(), last = lastAt()) => {
  const a = (P[n] || {}).at || last;
  return a && t > a ? recallOf((t - a) / DAY, stability(n)) : 1;
};
const rustOf = R => (1 - 1 / 4) * (1 - R) * sig(aimOff(4) - Math.log(R));
// The genera in play (the slate, and the bonus genera when the player has them on): those a comeback measures and asks.
const cbPlay = () => [...slateGenera(), ...bonusList()];
const cbGenera = () => cbPlay().filter(n => (P[n] || {}).ok > 0);
// Brings the comeback up to now (when a question is planned or answered): a new visit sets the floor, and the rust of
// its gap starts a comeback; a gap during a comeback adds to it.
// Returns true when a new visit starts here (a gap of SESSION.GAP or more since the last answer): questions planned or
// shown before it were planned on the old recall.
function rustNow(now = Date.now()) {
  const last = lastAt();
  if (!last || now <= last) return false;
  if (cbGenera().length < 2) {
    if (CB.r || CB.f) ((CB = {r: 0, t: now, ok: 0, f: 0}), cbSave());
    return false;
  }
  const on = CB.r > 0,
    from = on ? Math.max(last, CB.t) : last,
    floor = () => (CB.f = Math.max(CB.f, answersSoFar() + COMEBACK.FLOOR));
  const visit = now - last >= SESSION.GAP;
  if (visit) floor();
  if (now > from) {
    const A = cbPlay().filter(asked),
      add = A.reduce((t, n) => t + rustOf(recallAt(n, now, last)) - rustOf(recallAt(n, from, last)), 0);
    if (on) CB.r += add;
    else if (visit && add > 0) {
      CB.r = add;
      CB.ok = 0;
      floor();
    }
  }
  CB.t = now;
  cbSave();
  return visit;
}
// No genus opens (card, open-all or bonus genera offer) during the floor of a visit or a comeback.
const noOpen = () => CB.r > 0 || answersSoFar() < CB.f;
// The genera a comeback question is drawn from, or null when no comeback runs: genera answered right, the surest half
// until one is right in this comeback, then the most rusted half. Fewer than 2: no comeback.
function comebackOf(met) {
  if (!(CB.r > 0)) return null;
  const L = met.filter(n => (P[n] || {}).ok > 0);
  if (L.length < 2) {
    CB.r = 0;
    cbSave();
    return null;
  }
  const now = Date.now(),
    last = lastAt(),
    R = Object.fromEntries(L.map(n => [n, recallAt(n, now, last)])),
    h = Math.ceil(L.length / 2);
  L.sort((a, b) => R[b] - R[a]);
  return CB.ok ? L.slice(-h) : L.slice(0, h);
}
// A comeback answer: right or wrong against the recall-adjusted chance p (R the genus's recall, th its ability, d the
// photo's difficulty, k the plausible choices); l = the rust it repairs. The allowance an answer is l plus INTRO.SLACK
// (docs/LEARNING.md "The comeback's tolerance"), so a player slightly below expectation does not stay in it for good.
function comebackStep(R, th, d, k, good) {
  const x = (1 - 1 / k) * sig(th - d),
    p = 1 / k + x * R;
  if (good) CB.ok++;
  CB.r = holdNext(CB.r, p, good, x * (1 - R) + INTRO.SLACK);
  cbSave();
}
// The times an answer leaves in the progress: the genus's last answer and days answered right, the player's last answer.
function answeredAt(s, good, now = Date.now()) {
  s.at = now;
  if (good && s.dl !== dayNo(now)) {
    s.dd = (s.dd || 0) + 1;
    s.dl = dayNo(now);
  }
  if (P[LEVEL]) P[LEVEL].at = now;
}
function weighted(list) {
  const w = shareW(list, list.map(weight)); // the rank share (SHARE)
  const t = w.reduce((a, x) => a + x, 0);
  let r = Math.random() * t;
  for (let i = 0; i < list.length; i++) {
    r -= w[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}
// draw: the photo quiz's progressive path (weighted); the custom quiz draws among its selection with customDraw.
function nextTarget(list, draw = weighted) {
  let n,
    k = 0;
  do {
    n = draw(list);
  } while (n === last && list.length > 1 && ++k < 10);
  last = n;
  lastQs = [...lastQs, n].slice(-4);
  return n;
}
// Player ability per genus (s.th), on the photo difficulty's scale (0 = an average photo): an Elo step after each answer
// with a volatility (Glicko-2): core.js ELO, abilityOf, eloStep, shared with the sheet's replay. A genus never answered
// starts from the player's global level (core.js playerStart), so a strong player gets traps, single views and harder
// photos from its first question. No decay with time; the seconds taken weigh a right answer's step (core.js rtWeight;
// rule L1).
const RECENT = 10;
const recent = n => {
  const s = P[n] || {};
  return s.h ? s.h.slice(-RECENT) : '';
};
const misses = h => [...h].filter(x => x === '0').length;
// The ability: core.js ELO, abilityOf (a genus already answered: its own s.th plus the global level's move since its last
// own step, levelMove: the global + concept skill of Pelánek et al. 2017; docs/LEARNING.md "Global level and genus") and
// eloStep (the genus's step marks the level it was taken against, s.lt), shared with the sheet's replay: quiz.js answer
// steps both through core.js scoreAnswer. A genus never answered starts from the global level shrunk towards the
// first-launch answer's level (startV().p, core.js playerStart); the sheet replays that prior too, so an adopted replay
// never takes back what the game did live.
const startP = () => startV().p;
// A unit whose record names the unit it starts from (from: a fish species, its family; core.js treeSpUnits) starts from
// that unit's ability when never answered (core.js abilityOf).
const ability = n => abilityOf(P, n, startP(), (GX(n) || {}).from);
// For My progress: where the genus's photo difficulty stands, and how many of its game photos the player has seen.
const photoBand = n => {
  const t = ability(n) - aimOff(4);
  return t < -0.5 ? 'easy' : t < 0.5 ? 'medium' : 'hard';
};
const seenOf = n => {
  const all = new Set(VIEWS.flatMap(([v]) => gamePics(n, v).map(p => p.f))),
    ps = (P[n] || {}).ps || {};
  return `${[...all].filter(f => ps[f]).length} of ${all.size} seen`;
};
// Photo difficulty (Elo): every RA's answers, rated by the sync sheet (?stats=1, tools/sync/Code.gs stats_). 0 = average
// photo, +1 = clearly harder. Few answers: pulled towards its genus's offset (photoDiff).
let PSTAT = (store.get('reefid-photo-stats', {}) || {}).photos || {};
// Genus offsets of the hierarchical photo Elo (?stats=1 gd, core.js GENUS_K; docs/LEARNING.md "Hierarchical photo
// Elo"): {genus: [offset, weighed answers]}, the part of a photo's difficulty its genus shares, learned from every answer
// on the genus. Offline before any reply, every prior is 0.
const gdOf = j => (j && j.gd && typeof j.gd === 'object' ? j.gd : {});
let PGD = gdOf(store.get('reefid-photo-stats', {}));
// Pairs of genera offered together and mixed up, every RA pooled (?stats=1 conf): see confOf.
let PCONF = (store.get('reefid-photo-stats', {}) || {}).conf || {};
// Photo memory (core.js MEM, ?stats=1 mem; docs/LEARNING.md "Photo memory"): how much easier a photo is for a player
// already shown it (s.ps: [shown, right]), in logits off its difficulty, by bucket (new 0, shown never right, right once,
// right twice or more), fitted by the sheet on every trusted answer; the prior offline. famOf: the offset of the photos
// of a question, as the player knows them now.
let PMEM = memOf((store.get('reefid-photo-stats', {}) || {}).mem);
// The offsets of the subject in play (pmem): PMEM is fitted on the one subject the sheet rates (Code.gs stats_, SUBJECTS
// replay: the corals), so any other subject draws, scores and recalculates with the prior (core.js MEM.PRIOR, memOf of
// nothing): no coral offset touches another subject's answer.
const PMEM0 = memOf();
const pmem = () => (SUBJ.replay ? PMEM : PMEM0);
// Per-format offsets (core.js fmtOffsetsOf, ?stats=1 fmt; docs/LEARNING.md "Per-format offsets"): {format: [offset,
// answers]}, how much easier (in logits) the players found each question format than its guess rate 1/k allows, added
// to the expectation of the ability steps (quiz.js answer) and taken off the photo's aim (aimOff); {} before any reply.
let PFMT = fmtsOf(store.get('reefid-photo-stats', {}));
// The format offsets of the subject in play (pfmt), as pmem: a subject the sheet does not rate aims and scores with every
// format at 0 (the app's own expectation before any fit, core.js FMT), never with a coral offset.
const PFMT0 = Object.freeze({});
const pfmt = () => (SUBJ.replay ? PFMT : PFMT0);
// Progress saved before the photo memory, recalculated once and silently (core.js memRecalc): every genus record not
// marked yet (s.pm), at load, after each pull of the synced progress (sync.js mergeSaved), and in quiz.js answer before a
// record's first answer. Saved and synced when it changed anything.
function memRecalcAll() {
  let ch = false;
  mxRecalc(() =>
    Object.keys(P).forEach(n => {
      if (n !== LEVEL && memRecalc(P[n], pmem())) ch = true;
    })
  );
  if (ch) save();
  return ch;
}
// Each other subject's own pooled statistics (core.js SUBJECTS stats: the sea slugs; sync.js loadOwnStats), kept under
// its own key (OWN_STATS + its id) and joined to the corals' (PBASE, the reply loadStats keeps) in PSTAT, PGD and PCONF:
// their photos and units carry ids of their own (seaslug-…, g:Chromodoris), so each subject reads its own numbers in the
// same maps. The photo memory and the format offsets stay the corals' alone (pmem, pfmt), as the sheet's replay of
// another subject reads (Code.gs rplMake_).
const OWN_STATS = 'reefid-photo-stats-';
let PBASE = store.get('reefid-photo-stats', {}) || {};
function statsJoin(base = PBASE) {
  PBASE = base || {};
  const own = SUBJECTS.filter(S => !S.replay && S.stats)
      .map(S => store.get(OWN_STATS + S.id, null))
      .filter(o => o && typeof o === 'object'),
    join = (b, k) => Object.assign({}, b, ...own.map(o => (o[k] && typeof o[k] === 'object' ? o[k] : {})));
  PSTAT = join(PBASE.photos || {}, 'photos');
  PCONF = join(PBASE.conf || {}, 'conf');
  PGD = join(gdOf(PBASE), 'gd');
  GDIFF = {}; // genus difficulties follow the new photo stats and confusions
}
statsJoin();
// The domain-score bar for a subject the sheet does not replay (SUBJECTS replay false: fish; docs/LEARNING.md "The
// domain-score bar"): a unit record still under the former moving average (s.pg) is rebuilt on the device from its own
// counts (core.js domFromCounts: ok, ko and its last 10 results, each on a photo of the unit's average difficulty, one
// view, 4 choices), silently, once per record (s.dp), keeping a learned mark (core.js afterBkt). A replayed subject (the
// corals) waits for the sheet's replay instead (sync.js replayAdopt). Logged once per run that changed something
// (event 'recalc'); saved and synced then. Only a unit whose data is in (GX; app.js fishLoad), never before data.json is
// in (DATA): the rebuild is for good, never on a fallback difficulty; app.js start-up and fishLoad call it again once
// the data is built.
// "Learned" asks each variant group (core.js FISH_RVS): a learned mark whose unit has a variant group with no right
// answer in the log is taken away by the sheet's replay (core.js replayProgress vars, replayedOf; rules D8, D9), which
// every device adopts once (sync.js replayAdoptS, silently through mxRecalc: rule D6); never by a device on its own.
function domRecalcAll() {
  // Nor while the subject's data is still partial (app.js dataPartial: the fish units on their first photos only, before
  // fish-game.json): the rebuild reads the units' photo difficulties, and runs once the whole data is in (fishLoad).
  if (SUBJ.replay || !DATA || (typeof dataPartial === 'function' && dataPartial())) return false;
  const L = Object.keys(P).filter(
    n => n !== LEVEL && P[n] && typeof P[n].pg === 'number' && !domOn(P[n]) && (P[n].ok || 0) + (P[n].ko || 0) > 0 && !!GX(n)
  );
  L.forEach(n => {
    delete GDIFF[n]; // a difficulty cached before the data came
    const s = P[n],
      r = domFromCounts(s, genusDiff(n) + PICKD.SINGLE, 4, genusDiff(n));
    s.dp = r.dp;
    s.ds = r.ds;
    delete s.pg;
  });
  if (!L.length) return false;
  save();
  if (typeof ev === 'function') ev('recalc', {msg: `${SUBJ.id}: ${L.length} units rebuilt under the domain-score bar from their counts`});
  return true;
}
// Learned marks taken away by a recalculation (rule D6: silent for now). mxRecalc(fn) runs any recalculation of the
// progress (core.js memRecalc, the sheet's replay) and returns every genus whose s.mx it removed; a mark lost by misses
// in play (quiz.js mxKept) never goes through it. While MXL.QUIET, nothing is told and the learned-based achievements
// stay; a card or an achievement recheck still pending is dropped unseen (progress.js mxLostNotice, achRecheck). false
// brings the card and the recheck back (mxLost). Kept on this device only (MXL.KEY, outside the synced record): due
// {genus: s.mx}, the drops not told yet; told {genus: s.mx}, those told (also told to the account: sync.js toldAdd,
// core.js TOLD 'mx:<genus>@<s.mx>'); ach, achievements still to recheck; gone, the ids taken back, for the card.
// Cleared at sign-out (sync.js signOff).
const MXL = {KEY: 'reefid-mx-lost', QUIET: true};
const mxMarks = () =>
  Object.fromEntries(
    Object.keys(P)
      .filter(n => n !== LEVEL && P[n] && P[n].mx)
      .map(n => [n, P[n].mx])
  );
// why: the reason a mark goes, for the card's words (progress.js mxLostText): 'bkt' (default), an exam passed under the
// former model (a record without s.pg); 'rules', a recalculation under a newer rules version (the sheet's full replay,
// sync.js replayAdopt, core.js RVS); a function of the genus for a recalculation that can do both.
function mxRecalc(fn, why = 'bkt') {
  const m0 = mxMarks();
  fn();
  const lost = Object.keys(m0).filter(n => !(P[n] || {}).mx);
  // Silent for now (MXL.QUIET): no mxLost, so no card and no achievement taken back.
  if (lost.length && !MXL.QUIET)
    mxLost(Object.fromEntries(lost.map(n => [n, m0[n]])), Object.fromEntries(lost.map(n => [n, typeof why === 'function' ? why(n) : why])));
  return lost;
}
function mxLost(L, why = {}) {
  const M = store.get(MXL.KEY, {}) || {},
    due = M.due || {},
    told = M.told || {},
    W = M.why || {};
  Object.keys(L).forEach(n => {
    if (told[n] === L[n]) return;
    due[n] = L[n];
    W[n] = why[n] || 'bkt';
  });
  store.set(MXL.KEY, {...M, due, told, why: W, ach: 1});
  // The achievements and the card now if their code is in and set up (progress.js, app.js SETUP 2), else at its set-up.
  if (typeof achRecheck === 'function' && window.APP_READY) (achRecheck(), mxLostNotice());
}
const famOf = (n, ph) => {
  const ps = (P[n] || {}).ps || {},
    hs = ph.map(p => ps[p.f]);
  return memFam(hs, pmem());
};
const sig = x => 1 / (1 + Math.exp(-x));
// A photo's difficulty: the sheet's rating (its genus's offset + its own residual) blended with the genus's offset as
// prior, weighing PDIFF.W answers (partial pooling: the photo keeps n / (n + W) of its residual); a photo nobody has
// answered is its genus's offset (docs/LEARNING.md "Hierarchical photo Elo"). A judged photo (p.e, its ease 1-5: the
// fish, judging/FISH.md) adds its own prior: (PDIFF.MID - ease) x the subject's calibration ease (SUBJECTS calib,
// core.js calibOf), so the 5 steps span the spread real photos show; it fades likewise as answers come. No wall: every
// photo can be drawn from the first question (docs/LEARNING.md "Fish: the starter core and judged photos").
// A photo shared by units of different ranks (a fish family and its scientific genus) is rated under the last unit that
// rated it, which the sheet names (o[4], from v189): its offset is swapped for the offset of the unit asked, so the rating
// keeps only the photo's own residual. A coral photo has one genus (o[4] is n), unless it was rated last under a genus it
// has since left (moved or renamed): it then takes its current genus's offset.
const PDIFF = {W: 5, MID: 3};
const gdOff = n => (PGD[n] || [0])[0] || 0;
function photoDiff(n, p) {
  const prior = gdOff(n) + (p.e ? (PDIFF.MID - p.e) * calibOf(SUBJ).ease : 0),
    o = PSTAT[p.f];
  if (!o) return prior;
  const d = o[4] && o[4] !== n ? o[0] - gdOff(o[4]) + gdOff(n) : o[0];
  return (o[1] * d + PDIFF.W * prior) / (o[1] + PDIFF.W);
}
// Progress of a genus (s.pg, a moving average of its answers; core.js PROG, pgStep, pgOf; docs/LEARNING.md "Progress
// (moving average) and mastery"): each answer weighs what it proves, w from 0 to 1, by core.js pgRightW, pgMissW and
// pgMemW (shared with the sheet's replay): the plausible choices k ((1 − 1/k) / (1 − 1/4): 4 weigh 1, 2 weigh 0.67;
// typed, in full) and the look-alikes (in full when a genus it gets confused with is among the choices, PROG.LOOK
// otherwise). A miss weighs in full on a photo at the player's level, less on a harder one; a right answer on a known
// photo, only what memory does not explain. Photo difficulty is left out of a right answer's weight (docs/LEARNING.md).
// pgLook: a genus the player gets confused with among the choices (the look-alike test, core.js scoreAnswer's look), or
// also, the unit the photo of the mimicry class resembles (mimUnit).
const pgLook = (t, chs, also = null) =>
  chs.some(n => n !== t && GX(n) && (n === also || pooledConf(t, n) >= CONF.TRAP || confusable(t, n)));
function pgWeight(t, chs, k) {
  return pgRightW(k, pgLook(t, chs));
}
// Silent mastery exam (Pierre's words: docs/decisions/2026-11-18-decisions-from-app-comments.md): its count is shown
// nowhere. Once a genus reaches the exam's entry (core.js examOpen: the domain score at DOM.EX; a record not rebuilt yet,
// s.pg at PROG.M), EXAM.n questions on it are slipped into the photo quiz, unannounced, at least EXAM.gap other answers
// apart (recognition, not short-term memory). Each is as hard as the game gets: one photo alone, the hardest of its view,
// the views taking turns, 3 look-alike traps (examSet, quizPhoto). All right, with a right answer on each variant group
// (examPassed): the genus is mastered (s.mx), Learned, 100%. Any miss on the genus, or the genus given as the answer for
// another one, ends it (s.ex dropped); it starts again at the entry.
const EXAM = {n: 5, gap: 8};
// Typed questions (docs/LEARNING.md "Typed questions"): the player types the name instead of picking 1 of 4 (recall,
// not recognition). Asked with the chance typedP(n), from the unit's progress (genScore): none below TYPED.from, then
// linear between the points TYPED.at ([progress, share]), flat after the last (core.js typedShare). The mastery exam
// needs TYPED.exam typed right answers among its EXAM.n (examTyped). No guess rate (TYPED.k; logged |t, core.js
// guessOf), so a right one moves the ability and the photos more, a miss less.
const TYPED = {
  from: 0.5,
  at: [
    [0.5, 0],
    [0.8, 0.3],
    [0.95, 0.5]
  ],
  exam: 2,
  k: Infinity
};
const typedP = n => typedShare(genScore(n), TYPED);
// An exam question is typed while the typed answers it still needs fill the questions left (so all EXAM.n right always
// include TYPED.exam typed ones), else with the genus's usual typed share: the format of an exam question then says
// nothing a normal question at that level would not (an exam of typed questions only would give the exam away).
const examTyped = n => {
  const ex = (P[n] || {}).ex || {k: 0, t: 0};
  return TYPED.exam - (ex.t || 0) >= EXAM.n - (ex.k || 0) || Math.random() < typedP(n);
};
const answersSoFar = () => ((P[LEVEL] || {}).ok || 0) + ((P[LEVEL] || {}).ko || 0);
// The exam's entry: the bar at core.js examOpen and pair coverage (core.js looksLeft): the genus asked beside each
// of its declared look-alikes the player can be asked (the slate and the bonus genera turned on), either way, or mixed
// up with it. examLooks: those look-alikes, declared on either side as isLook reads them (Acropora lists Montipora,
// Montipora does not list Acropora: the pair is still one to compare); lookLeft: the ones not compared yet.
const examLooks = n => {
  const on = new Set([...slateGenera(), ...(typeof bonusList === 'function' ? bonusList() : [])]),
    own = (GX(n) || {}).look || [];
  return [...on].filter(x => x !== n && (own.includes(x) || ((GX(x) || {}).look || []).includes(n)));
};
const lookLeft = n => looksLeft(P, n, examLooks(n));
// And its confusion group met (docs/LEARNING.md "Confusion groups"): the exam opens once the unit's group partners that
// can open (matesLeft) are met; an exam already under way (s.ex) goes on. A unit whose record says noex has no mastery
// exam (a fish species: docs/reviews/2026-11-14-species-step1.md; its bar tops out at 95%).
const examOn = n => {
  const s = P[n] || {};
  return !s.mx && !(GX(n) || {}).noex && examOpen(s, P, n) && !lookLeft(n).length && (!!s.ex || !matesLeft(n).length);
};
const examReady = n => examOn(n) && (!(P[n] || {}).ex || answersSoFar() - P[n].ex.at >= EXAM.gap);
// A learned genus stays learned through one miss and is lost on a second one before right answers bring it back up
// (core.js keepsMark: the domain score at DOM.KEEP or above, about one miss below the exam's entry; a record not rebuilt
// yet, s.pg at PROG.M × (1 − PROG.A)), so a single slip does not take it away.
const mxKept = n => keepsMark(P[n], P, n); // core.js keepsMark, the replay's rule too (replayProgress lm)
function missing(n) {
  const s = P[n] || {},
    m = [];
  if (s.mx) return m;
  const left = lookLeft(n),
    mates = s.ex ? [] : matesLeft(n).filter(x => !left.includes(x)),
    names = L => (typeof andList === 'function' ? andList : X => X.join(', '))(L.map(unameT));
  if (!examOpen(s, P, n))
    m.push(
      `more right answers, most of all on hard photos and typed ones (so far you would name about ${Math.round(100 * genScore(n))}% of its photos)`
    );
  if (left.length) m.push(`being asked beside its look-alike${left.length > 1 ? 's' : ''} ${names(left)}`);
  if (mates.length) m.push(`meeting its look-alike${mates.length > 1 ? 's' : ''} ${names(mates)}`);
  if (examOpen(s, P, n) && !left.length && !mates.length)
    m.push(
      `the mastery exam: ${EXAM.n} hard questions on it, slipped unannounced into the Quiz, all right, at least ${TYPED.exam} of them typed from memory`
    );
  // Its variant groups not answered right yet (varLeft): the exam asks them.
  const VW = {juv: 'its juveniles', ph: 'its sexes or colour phases'},
    vl = varLeft(n);
  if (vl.length) m.push(`a right answer on ${vl.map(g => VW[g]).join(' and on ')}`);
  return m;
}
// Progress of a genus, 0 to 1 (core.js scoreOf): the domain score up to 95% (barOf), each exam question passed fills a
// fifth of what is left, the passed exam makes it 100%.
const genScore = n => scoreOf(P[n], P, n); // the false-alarm correction reads the whole record (core.js faOf)
// Mastery levels (named steps on the way, a diver's ladder every RA knows; docs/ARCHITECTURE.md): the step of a genus
// from its % (genScore), the same colours on My progress. 0 not seen; 1 Snorkeler under 50%; 2 Open Water from 50%;
// 3 Advanced from 80%; 4 Divemaster from the mastery exam's entry (examOn: core.js examOpen, DOM.EX, and pair coverage);
// 5 Instructor, the exam passed (s.mx, "learned" in the code). The thresholds only name points on the % (after Khan
// Academy's Familiar 50 / Proficient 80 / Mastered 100).
const MASTERY = [
  ['Not seen', ''],
  ['Snorkeler', '<rect x="2.5" y="8" width="13" height="7.5" rx="3.2"/><path d="M9 15.5v-2.2M19.5 3v11a4.5 4.5 0 0 1-4.5 4.5h-1.5"/>'],
  ['Open Water', '<rect x="8" y="7" width="8" height="14" rx="3.2"/><path d="M10.5 7V4.5h3V7M12 4.5V2.5M15 3h3"/>'],
  // Two tanks side by side (a twinset: more gas, deeper dives), so the step up from Open Water's one tank reads at a glance.
  [
    'Advanced',
    '<rect x="3" y="7" width="7.5" height="14" rx="3"/><rect x="13.5" y="7" width="7.5" height="14" rx="3"/><path d="M5.5 7V4.5h2.5V7M16 7V4.5h2.5V7M8 4.5h8"/>'
  ],
  ['Divemaster', '<path d="M5 21.5V2.5"/><rect x="5" y="3.5" width="15" height="10.5" rx="1.2"/><path d="M5 14 20 3.5"/>'],
  ['Instructor', '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v4.8c0 1.6 2.7 3.2 6 3.2s6-1.6 6-3.2V11M22 9v6"/>']
];
const LV_AT = [0.5, 0.8, DOM.EX]; // Open Water, Advanced, Divemaster (the exam's entry: examOpen)
const lvStep = n => {
  const k = level(n)[0];
  if (k === 'new') return 0;
  if (k === 'ok') return 5;
  const g = genScore(n) + 1e-9;
  return 1 + LV_AT.slice(0, 2).filter(x => g >= x).length + (examOn(n) ? 1 : 0);
};
// The icon of a level (24 px grid, 1.75 stroke, currentColor: the app's icon set), with its name for screen readers.
const lvIcon = (k, cls = 'lvi') =>
  MASTERY[k][1]
    ? `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${MASTERY[k][0]}">${MASTERY[k][1]}</svg>`
    : '';
const progPct = (L = slateGenera()) => Math.round((100 * L.reduce((t, n) => t + genScore(n), 0)) / L.length);
// The subject's global score and its components when it has one (core.js SUBJECTS score: the fish), from one computation
// (core.js treeScore over its tree, app.js UNITS tree); null otherwise.
// The sheet ranks the leaderboard by it (Code.gs board_), so the leaderboard and My progress show one scale.
const headScore = () => {
  const U = typeof UNITS === 'object' ? UNITS[SUBJ.id] : null,
    T = SUBJ.score && U && U.tree ? U.tree() : null;
  return T ? treeScore(P, T, SUBJ.score) : null;
};
// The headline % (the header pill, My progress's ring, the achievements, the update card): the subject's global score,
// else the mean of its units' bars (progPct).
const headPct = (L = slateGenera()) => {
  const h = headScore();
  return h ? h.pct : progPct(L);
};
function level(n) {
  const s = P[n];
  if (!s || (s.ok + s.ko === 0 && !s.h)) return ['new', 'Not seen'];
  // "Review": shaky, the same chance x the draw weighs (drawW), under OPEN.P on an average photo with 4 choices.
  if (shaky(n)) return ['weak', 'Review'];
  if (s.mx) return ['ok', 'Learned'];
  return ['mid', 'Learning'];
}
// What a player is shown (My progress, the genus sheet): "Review" (an amber dot) only once the genus has REVIEW_MIN
// answers; before that it is still being learned, so a first session's misses do not read as a list of failures. The
// game itself still gives such a genus more questions (level).
const REVIEW_MIN = 5;
const shownLevel = n => {
  const l = level(n),
    s = P[n] || {};
  return l[0] === 'weak' && (s.ok || 0) + (s.ko || 0) < REVIEW_MIN ? ['mid', 'Learning'] : l;
};

// Wrong choices get harder as the player gets better at the target genus (Pierre's words:
// docs/decisions/2026-11-18-decisions-from-app-comments.md): how many of the 3 are look-alike traps (`look` both ways,
// then the confusion scores) follows the genus's ability on FORMAT (above), rounded at random; a mistake drops the
// ability, so the choices ease off again. While traps are few, the others are easy: genera sharing no IMR growth form
// with the target (imrFormsOf), other IMR lecture groups first; with two traps in, the last is any genus (family first).
const trapsFor = (t, shift = 0) => {
  const x = formatAt(ability(t) + shift)[0];
  return Math.floor(x) + (Math.random() < x % 1 ? 1 : 0);
};
// Confusion score of genus n beside target t: how often players mix the two up when both are offered
// (every RA pooled, ?stats=1 conf), starting from a prior: the declared look-alikes (IMR lecture, Coral Finder) high, then
// the same family, then a shared growth form. With few answers the prior rules; with many, the real mix-ups do, so a pair
// nobody confuses fades and an undeclared pair players do confuse becomes a trap (core.js CONF, confScore).
const isLook = (t, n) => GX(t).look.includes(n) || GX(n).look.includes(t);
// Personal path: the pooled score is then the prior for this player's own answers on the pair
// (core.js pairConf: offered together, mixed up), worth CONF.W offers, so the player's weight is offers / (offers + 8).
// A pair this player keeps mixing up becomes a trap and a duel for them, one they now tell apart fades back to the pool.
// Performance only, never time.
// The pair's score over every player (pooled answers on top of the declared prior), before this player's own record.
// confPrior: the prior of a pair, look the declared test (isLook here; the confusion groups' own, declared, above).
// A data look-alike seeded by the subject's data (dataSeed, below) starts from the declared look-alikes' prior.
const confPrior = (t, n, look) =>
  look || dataSeed(t, n)
    ? CONF.LOOK
    : GX(n).fam === GX(t).fam
      ? CONF.FAM
      : imrFormsOf(n).some(f => imrFormsOf(t).includes(f))
        ? CONF.FORM
        : CONF.BASE;
function pooledConf(t, n) {
  return confScore(PCONF[t < n ? t + '|' + n : n + '|' + t], confPrior(t, n, isLook(t, n)));
}
function confOf(t, n) {
  return confScore(pairConf(P, t, n), pooledConf(t, n));
}
// Traps = the genera most confused with the target (a little shuffle among close scores, so every likely pair gets tried).
const confusable = (t, n) => confOf(t, n) >= CONF.TRAP;
// Known mix-ups (docs/LEARNING.md "Known mix-ups"): a question on t among choices that hold a
// genus this player mixes up with t more than everyone does is that much harder for them (core.js confGap, in logits:
// the player's own score of the pair against the pooled one; the most over the choices). The expected success, the Elo
// step, the progress and the photo's aim all take it. Only with 3 or more plausible choices (k): on 2-choice contrast
// questions it made the prediction worse.
const confTerm = (t, chs, k) =>
  k >= 3 ? Math.max(0, ...chs.filter(n => n !== t && GX(n)).map(n => confGap(pairConf(P, t, n), pooledConf(t, n)))) : 0;
// Look-alikes from the data (core.js dataLook; docs/LEARNING.md "Look-alikes from the data"): a pair no
// source declares, offered together CONF.N times or more and mixed up so often that its pooled score (pooledConf)
// reaches CONF.TRAP. Such pairs join the declared ones in the duels and the Again (quiz.js duelPick) and on the genus
// sheet's "Don't confuse with" (learn.js lookHub). A seeded pair (dataSeed: one iNaturalist's identifications show) is
// one from the start, on the declared prior (confPrior), and stays one while its pooled score does: unlike a declared
// pair, the players' answers can drop it.
const isDataLook = (a, b) => {
  if (a === b || !GX(a) || !GX(b) || isLook(a, b)) return false;
  if (dataSeed(a, b)) return pooledConf(a, b) >= CONF.TRAP;
  const c = PCONF[a < b ? a + '|' + b : b + '|' + a];
  return !!c && c[0] >= CONF.N && dataLook(c, pooledConf(a, b));
};
// The data look-alikes a subject's data seeds (app.js treeGenera dl: the sea slug genera only iNaturalist's
// identifications show as look-alikes, tools/seaslug_game.py genus_looks), either way round.
function dataSeed(a, b) {
  return ((GX(a) || {}).dl || []).includes(b) || ((GX(b) || {}).dl || []).includes(a);
}
// The pairs of the list L that are look-alikes from the data, each [A, B] in alphabetical order: the pooled pairs (a pair
// never offered together cannot qualify) and the seeded ones (dataSeed).
const dataLooks = (L = [...slateGenera(), ...bonusList()]) => {
  const K = new Set(Object.keys(PCONF));
  L.forEach(a => ((GX(a) || {}).dl || []).forEach(b => K.add(a < b ? a + '|' + b : b + '|' + a)));
  return [...K]
    .map(k => k.split('|'))
    .filter(([a, b]) => L.includes(a) && L.includes(b) && isDataLook(a, b))
    .map(p => p.sort());
};
// A choice's label as its button shows it (app.js unameT: the unit's name), compared as typed (letters only, core.js
// typeNormAll: Yellowtail / Yellow-tail wrasse read as one). Two units may carry the same name (two fish species may
// share a common name), but a question never shows two choices of one label (distractors).
const labelKey = x =>
  String(x)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z]/g, '');
const choiceKey = n => labelKey((GX(n) || {}).name || n);
// The labels a choice must not carry on a question about unit t: its own, and every other name its record lists (also:
// a fish species' listed common names with their spellings, app.js treeGenera), since each of them names t too
// (typed, any of them is right). Outside IMR, "Longnose butterflyfish" is the main name of F. longirostris and
// a listed name of F. flavissimus: never a wrong choice on a photo of F. flavissimus.
const choiceKeys = t => new Set([choiceKey(t), ...((GX(t) || {}).also || []).map(labelKey)].filter(Boolean));
// Whether the choice o names unit t (its label is one of t's: choiceKeys), so it is never a wrong choice on a question
// about t, an "Again" included (quiz.js planPhoto).
const choiceNames = (o, t) => o !== t && choiceKeys(t).has(choiceKey(o));
// The units of L whose label no unit before them in L, nor any of taken, carries: the first of each label kept.
const choiceApart = (L, taken = []) => {
  const seen = new Set(taken.map(choiceKey));
  return L.filter(n => !seen.has(choiceKey(n)) && seen.add(choiceKey(n)));
};
function distractors(t, list, traps = trapsFor(t), known = introduced) {
  // Choices of the target's rank only (app.js rankOf): a fish scientific genus among genera, an entry among entries.
  // A ranked unit (a fish genus) may name any unit of its rank (app.js rankUnits): the ones in play stay first among the
  // genera met, the others make up the three (a family with one genus in play still gets three choices).
  // Never a choice of the target's label or of another name it lists (choiceKeys), nor two of one label (choiceApart):
  // of two units of one label, the one the rules below rank first is kept and the next one takes the other's place.
  const rk = rankOf(t),
    tk = choiceKeys(t);
  list = list.filter(n => rankOf(n) === rk);
  if (rk) list = [...new Set([...list, ...rankUnits(rk)])];
  list = list.filter(n => n === t || !tk.has(choiceKey(n)));
  const ranked = list
    .filter(n => n !== t)
    .map(n => [n, confOf(t, n) * (0.8 + 0.4 * Math.random())])
    .sort((a, b) => b[1] - a[1])
    .map(x => x[0]);
  // A player who tells every look-alike apart (an expert) still gets the hardest choices the level asks for: the traps
  // left over come from the pairs other players confuse most, then the declared look-alikes, instead of easy genera.
  // Traps only among the genera met (`known`): a look-alike never seen is no trap for a beginner, only a name to guess.
  const mine = ranked.filter(n => known(n) && confusable(t, n)),
    pooled = list
      .filter(n => n !== t && known(n) && !mine.includes(n) && pooledConf(t, n) >= CONF.TRAP)
      .sort((a, b) => pooledConf(t, b) - pooledConf(t, a)),
    look = choiceApart([...mine, ...pooled]),
    out = look.slice(0, traps),
    left = list.filter(n => n !== t && !look.includes(n));
  // Exactly `traps` traps when other genera met exist; genera never met only to make up the three.
  if (traps >= 2)
    return choiceApart([
      ...out,
      ...ranked.filter(n => known(n) && !look.includes(n)),
      ...look.slice(traps),
      ...ranked.filter(n => !known(n))
    ]).slice(0, 3);
  const T = GX(t);
  const tf = imrFormsOf(t),
    apart = n => !imrFormsOf(n).some(f => tf.includes(f));
  const easy = left.filter(apart),
    far = easy.filter(n => GX(n).ig !== T.ig);
  // Easy choices spread over different growth forms too: three mushroom corals beside a massive target would give the
  // answer away as the odd one out.
  // Easy wrong choices come from genera the player has already met (`known`: on a card or asked) before any other, even
  // at the cost of the spread of forms: a beginner is not asked to choose between names never seen, and the first
  // questions stay among the genera of the first cards.
  const rank = L => [
    ...shuffle(L.filter(n => far.includes(n))),
    ...shuffle(L.filter(n => easy.includes(n) && !far.includes(n))),
    ...shuffle(L.filter(n => !easy.includes(n)))
  ];
  const met = rank(left.filter(known)),
    other = rank(left.filter(n => !known(n))),
    used = new Set(out.flatMap(imrFormsOf)),
    res = [...out];
  const add = (L, spread) =>
    L.forEach(n => {
      if (res.length >= 3 || !choiceApart([n], res).length || (spread && imrFormsOf(n).some(f => used.has(f)))) return;
      res.push(n);
      imrFormsOf(n).forEach(f => used.add(f));
    });
  add(met, true);
  add(met, false);
  // Still short (a beginner who has met only a few genera): a look-alike met beats a name never seen.
  add(look.filter(known), false);
  add(other, true);
  add(other, false);
  return res.slice(0, 3);
}
// Elo, the progress and the photo's aim (aimOff) count a guess as 1 in (target + the plausible wrong choices) while traps
// are few (0 or 1): easy choices from other growth forms are not plausible, so such a question is scored as a 2- or
// 3-choice one (a right answer there proves less, and its photo is harder). From 2 traps on, every choice counts.
// also: the unit a photo of the mimicry class makes a trap (mimUnit), plausible on that photo whatever its scores.
const plausibleK = (t, choices, also = null) => {
  const tf = imrFormsOf(t);
  return Math.max(2, choices.filter(n => n === t || n === also || confusable(t, n) || imrFormsOf(n).some(f => tf.includes(f))).length);
};
// The choices ch of a question on t with u, the unit its photo of the mimicry class resembles (mimUnit), among them: in
// the place of the wrong choice that carries u's label, else of the weakest look-alike among them (the traps trapsFor
// gave, as distractors finds them), so the question keeps its number of traps, else of the one least confused with t;
// ch itself when u is there.
function mimTrap(t, ch, u) {
  const W = ch.filter(n => n !== t);
  if (!u || ch.includes(u) || !W.length) return ch;
  const look = W.filter(n => confusable(t, n) || pooledConf(t, n) >= CONF.TRAP),
    least = L => L.reduce((a, n) => (confOf(t, n) < confOf(t, a) ? n : a)),
    out = W.find(n => choiceKey(n) === choiceKey(u)) || least(look.length ? look : W);
  return ch.map(n => (n === out ? u : n));
}
// Custom quiz (docs/LEARNING.md "Custom quiz: the photo quiz on the genera the player picks"): the photo quiz limited to
// the genera the player picks (quiz.js quizCustom, planPhoto), with all its rules but the mastery exam (rule L9: the
// selection may hold no look-alike); only the genus asked and the wrong choices change:
// - the selection in play (customOf): the genera saved (CUSTOM.KEY, synced) that are in the game now (pool), in the
//   game's order; fewer than CUSTOM.MIN: no quiz;
// - the genus asked (customDraw): any selected genus, weighed as the photo quiz weighs those met (weight); no opening
//   path, so a genus not met yet is asked at once, its first-meeting card shown with that question (quiz.js);
// - the wrong choices (customChoices): from the selection first, with the photo quiz's rules (distractors), so a selected
//   look-alike group drills itself; a selection under 4 genera is topped up from the other genera in play.
const CUSTOM = {KEY: 'reefid-sync-coral-custom', MIN: 2};
const customOf = (saved, play) => {
  const S = new Set(Array.isArray(saved) ? saved : []),
    L = play.filter(n => S.has(n));
  return L.length >= CUSTOM.MIN ? L : null;
};
const customDraw = sel => wpick(sel, weight);
function customChoices(t, sel, play, traps, known) {
  const own = distractors(t, sel, traps, known);
  if (own.length >= 3) return own;
  const got = own.filter(n => known(n) && confusable(t, n)).length;
  // Never a label twice across the two (choiceApart).
  return choiceApart([
    ...own,
    ...distractors(
      t,
      play.filter(n => !sel.includes(n) && choiceApart([n], own).length),
      Math.max(0, traps - got),
      known
    )
  ]).slice(0, 3);
}
// The custom quiz's "My mix-ups" view: the genera in play grouped by the player's own confusions, most confused first.
// mixEdges: each pair of genera in play the player mixed up, weighed by how often, both ways (s.conf: the genus given
// instead of the one shown, typed answers included). lookEdges: the declared look-alikes (data.json look, IMR lecture
// and Coral Finder; isLook both ways), weighed by how much every player confuses them (pooledConf), for a player with no
// mix-up yet. mixClusters: greedy clusters, the heaviest pair first: two genera in no cluster start one, a genus joins
// the cluster of its partner when it is paired with at least half of its genera and it has fewer than CUSTOM.CLUSTER,
// two clusters never merge (a chain of look-alikes, A like B like C like D, would otherwise make one cluster of genera
// that do not look alike); each cluster weighs its pairs, heaviest first.
CUSTOM.CLUSTER = 6;
const mixEdges = play => {
  const E = [];
  play.forEach((a, i) =>
    play.slice(i + 1).forEach(b => {
      const w = (((P[a] || {}).conf || {})[b] || 0) + (((P[b] || {}).conf || {})[a] || 0);
      if (w > 0) E.push([a, b, w]);
    })
  );
  return E;
};
const lookEdges = play => {
  const E = [];
  play.forEach((a, i) => play.slice(i + 1).forEach(b => isLook(a, b) && E.push([a, b, pooledConf(a, b)])));
  return E;
};
function mixClusters(edges, cap = CUSTOM.CLUSTER) {
  const of = new Map(),
    C = [],
    E = edges.filter(e => e[2] > 0),
    pair = new Set(E.flatMap(([a, b]) => [a + '|' + b, b + '|' + a]));
  E.sort((x, y) => y[2] - x[2] || (x[0] + '|' + x[1]).localeCompare(y[0] + '|' + y[1])).forEach(([a, b, w]) => {
    const ca = of.get(a),
      cb = of.get(b);
    if (!ca && !cb) {
      const c = {g: [a, b], w};
      C.push(c);
      of.set(a, c).set(b, c);
    } else if (ca && cb) {
      if (ca === cb) ca.w += w;
    } else {
      const c = ca || cb,
        n = ca ? b : a;
      if (c.g.length < cap && 2 * c.g.filter(x => pair.has(n + '|' + x)).length >= c.g.length) {
        c.g.push(n);
        of.set(n, c);
        c.w += w;
      }
    }
  });
  // Each cluster's weight once its members are final: every edge inside it, also one met before its second genus joined
  // (e.g. AD skipped while D could not join yet, then D joined through E).
  C.forEach(c => (c.w = E.reduce((t, [a, b, w]) => t + (of.get(a) === c && of.get(b) === c ? w : 0), 0)));
  return C.sort((x, y) => y.w - x.w);
}
// ---------- Look-alike pairs, shared by the quiz and the Learn pages ----------
// The quiz (its duels, mix-up montage and cards) and My progress read these, so they come with the quiz's tier; the Learn
// pages (learn.js: Look-alikes, the genus sheets, the Genera page) read them too and come later (docs/spec/loading.md
// "Load order in tiers").
// Starred genera are on the slate as look-alikes of surveyed genera. Those the lecture doesn't group are shown
// in the lecture group most of their Coral Finder look-alikes belong to (ties: the first listed look-alike).
// Millepora and the bonus genera: no lecture group (0). Both in core.js (lectureGroup, starRefs), where the opening of
// genera reads the same references (weighted, above: a ★ genus opens after the genera its card names).
function shownGroup(n) {
  return lectureGroup(DATA, n);
}
const starNote = n => {
  const L = starRefs(DATA, n);
  return L.length ? `★ look-alike of ${L.map(b => `<i>${esc(b)}</i>`).join(', ')}` : '';
};
// The look-alike pairs of the slate (data.json gen look, either genus listing the other), each [A, B] in alphabetical
// order, once: the duels (app.js UNITS pairs) and the Look-alikes deck (learn.js classics).
function pairs() {
  const seen = new Set(),
    out = [];
  Object.keys(DATA.gen).forEach(a =>
    DATA.gen[a].look.forEach(b => {
      const k = [a, b].sort().join('|');
      if (DATA.gen[b] && !seen.has(k)) {
        seen.add(k);
        out.push(k.split('|'));
      }
    })
  );
  return out;
}
// The source that compares a and b (data.json lsrc), from whichever genus lists the other; '' when none.
const lsrcOf = (a, b) => (GX(a).lsrc || {})[b] || (GX(b).lsrc || {})[a] || '';
// Classic look-alikes: the pairs a source compares in so many words, the IMR lecture (lsrc "IMR Lecture 6...") or the
// Coral Finder text ("Coral Finder p. ..."): the Look-alikes deck (learn.js classics) and a duel's weight (quiz.js
// duelPick).
const isClassic = (a, b) => /^(IMR|Coral Finder p)/.test(lsrcOf(a, b));
// How many times this player gave one of a and b for the other, both ways (P conf).
const mixedUp = (a, b) => ((P[a] && P[a].conf && P[a].conf[b]) || 0) + ((P[b] && P[b].conf && P[b].conf[a]) || 0);
// The two photos of two genera that make the best side by side (the quiz's mix-up montage, quiz.js; the Look-alikes
// montages, learn.js montage): same growth form first, then nearest the front and, when the photos come from all zoom
// levels ("All"), the nearest zoom levels. The same form is looked for in every photo of the lists, not only the first
// 6, so a plate genus is shown beside a plate look-alike when one exists; "x" (form not visible) matches nothing.
// Without a same-form pair, the best pair among the first 6 of each list.
const ZOOM = {wide: 0, medium: 1, macro: 2};
function photoPair(LA, LB, fa, fb) {
  let best = null;
  const A = fa ? [fa] : LA,
    B = fb ? [fb] : LB;
  const gap = (x, y) => (x.view && y.view ? 4 * Math.abs(ZOOM[x.view] - ZOOM[y.view]) : 0);
  A.forEach((x, i) =>
    B.forEach((y, j) => {
      const same = !!x.form && x.form !== 'x' && x.form === y.form;
      if (!same && (i >= 6 || j >= 6)) return;
      const sc = (same ? 0 : 1e6) + i + j + gap(x, y);
      if (!best || sc < best[0]) best = [sc, x, y];
    })
  );
  return best ? [best[1], best[2]] : [];
}
// Once the whole file is in (save, LEVEL and PMEM above): the progress saved before the photo memory, recalculated.
memRecalcAll();
domRecalcAll(); // a non-replayed subject's units, under the domain-score bar
// A switch of subject (app.js subjectLoad): this file's state is the subject's (its cards, opening hold and comeback, kept
// on the device under its keys; the genera's difficulty and the last ones asked). A record from before the photo memory
// is recalculated, as at start-up, unless the visit is a short one (keep: sync.js reading another subject).
if (typeof SUBJ_HOOKS !== 'undefined')
  SUBJ_HOOKS.push(keep => {
    INTROS = null;
    HOLDS = Number(store.get(HOLDK(), 0)) || 0;
    CB = cbLoad();
    GDIFF = {};
    if (keep) return;
    lastQs = [];
    last = null;
    memRecalcAll();
    domRecalcAll();
  });
