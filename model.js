// IMR Reef ID: the learning model, split out of app.js (2026-11-02, code review L1: one file per part, one piece at a
// time). Which genus comes next (weighted, the progressive opening OPEN, the easiest first), which photos (photoSet,
// PICKD, online calibration CAL), how hard they are (photoDiff, the sheet's PSTAT and genus offsets PGD), the player's ability per genus (Elo,
// ELO, ability; each answer scored by core.js scoreAnswer), their progress (core.js DOM, barOf, examOpen; PROG for a record not rebuilt yet), the mastery exam (EXAM), and the wrong choices (TRAP, distractors,
// pooledConf). docs/LEARNING.md explains every rule. A classic script like app.js, loaded right after progress.js
// (index.html, in order); app.js waits for every script (window.BOOT) before its first page. Required like app.js.
// A quiz question shows the views of ONE colony: colony and closer views, the corallites as a hint (or one view alone).
// Continuous difficulty (Pierre, 2026-10-31; Elo as in Pelánek 2016 / Duolingo Birdbrain, no time between sessions;
// the seconds of a right answer weigh its step, core.js rtWeight): every
// question draws from ALL the game photos of the genus, weighted by how close each photo's difficulty (photoDiff) is to
// the target for this player on this genus and this question's format (aimed so the question is right with the chance
// PICKD.P whatever its format: the difficulty controller, below). On top:
// photos never seen get a bonus (bigger when the player is doing well; IMR and Pierre's photos first for the corals,
// SUBJECTS tiers; never for fish, Pierre 2026-11-06), photos the player
// has already been shown weigh less the better they are remembered (photo memory, PMEM: x e^offset), the colony of the
// last 2 questions on the genus is held back, and at least 3 colonies stay in rotation (VARIETY) whatever the level, so
// a struggling player still sees new photos.
// Every photo of a question comes from one observation (same colony); views that colony lacks are simply not shown.
// PICKD.P is core.js TARGET_P (0.8), the game's reference; PICKD.AIM is core.js AIM (aimP, below).
const PICKD = {P: TARGET_P, AIM, SIGMA: 0.7, VARIETY: 3, FLOOR: 0.05, SINGLE: DOM.SINGLE};
// Before Open Water a photo under ease 4 comes rarely (Pierre, 2026-11-06 14:17: "No wall: before Open Water a photo
// under ease 4 may come, but rarely"). The prior and the aim alone made it a share of the draws that followed the photo
// counts: a starter family holds about two thirds of its photos under ease 4, and its ability passes 1 after two or
// three right answers while its progress is still under Open Water, so about one photo in five shown there was under
// ease 4 (the fish smoke's bound broke on one seed in ten). So until a unit reaches Open Water (LV_AT[0]) its photos
// under RARE.E (or under its RARE.FEW easiest when it has fewer: the Soapfishes have 2) make at most RARE.SHARE of the
// photos drawn, whatever their number (rareCap): each takes one factor, in the choice of the observation (by the hard
// part of its weight, so an observation with one easy photo among many hard ones counts as mostly hard) and in the
// choice of its photo. No wall: they still come, the least answered first as before (calBonus). A photo with no judged
// ease (every coral photo) is never one of them, so the corals' draw is unchanged. docs/LEARNING.md "Rarely under ease
// 4 before Open Water".
const RARE = {E: 4, FEW: 3, SHARE: 0.1}; // SHARE: Pierre, 2026-11-08 (Q252)
// Only the units of the subject's own rank (Pierre, 2026-11-08, Q271: the fish families, "c'est là que le débutant a
// besoin de photos faciles"): a unit of another rank (a fish genus: app.js rankOf) starts under Open Water too, but its
// player already knows the family, and capping it held back the ratings of its hard photos (about 30% fewer answers
// under ease 4 over 10,000 simulated answers). Those units are drawn as before.
const rareOn = n => (rankOf(n) || SUBJ.rank) === SUBJ.rank;
// The factor the hard photos' weights take so they make at most `share` of the draw (1 when they already do, or when
// nothing else can be drawn). sc: each observation's weight; hardOf(k): the share of observation k's photo weight that
// is hard (0 to 1). Exact for a question showing one photo (the fish); for several views, the share of the photos drawn.
function rareCap(keys, sc, hardOf, share = RARE.SHARE) {
  let mh = 0,
    me = 0;
  keys.forEach(k => ((mh += sc[k] * hardOf(k)), (me += sc[k] * (1 - hardOf(k)))));
  return me > 0 && mh > (share / (1 - share)) * me ? ((share / (1 - share)) * me) / mh : 1;
}
// One difficulty controller (independent review of 2026-11-02, item 4, after Papousek, Pelanek & Stanislav 2014, who
// set the question's format so that the predicted success hits one target; 2026-11-03). Two steps, one target:
// 1. The format of a question on genus n comes from its ability on one schedule (FORMAT, below): how many of the 3 wrong
//    choices are look-alike traps (Pierre, 2026-11-01: they come in one by one and soon, as look-alikes are how genera
//    are learned), then more and more questions showing one view alone, so each view is learned on its own (rule L3);
//    typed questions (model.js TYPED, typedP) are the third lever, set by their own rule.
// 2. The photo then makes up the rest: aimed aimOff(k) below the ability (and PICKD.SINGLE lower for one view alone), so
//    that with the format's guess rate (1 in k plausible choices, plausibleK; none for a typed answer) the question is
//    right with the chance PICKD.P = 0.8 (about 80% right: the game's target since 2026-10-31). A 4-choice question is
//    aimed 1.01 below (TARGET_OFF 1.0 before, for every question), 3 plausible choices 0.81, 2 (easy choices, an Again,
//    a duel) 0.41, a typed one 1.39: before, a question with 2 plausible choices was right about 87% of the time on its
//    photo and a typed one 73%, so the target moved with the format. docs/LEARNING.md "One difficulty controller".
// The success aimed for follows the player's global level (Pierre, 2026-11-03: strong players must find the app
// challenging quickly, and beginners must not be overwhelmed): PICKD.AIM, points [global level, success], 85% up to a
// level of 0.5 (a beginner, a lecture-level RA: easy first, to hook them; Papoušek, Stanislav & Pelánek 2016 found
// easy questions better for staying at first, harder ones for learning and coming back), 75% from 1.5 (a strong RA,
// an expert), a straight line between, flat outside (no cliff). PICKD.P (0.8, the middle) stays the game's reference.
// docs/LEARNING.md "Beginners and experts".
// core.js aimOf: the miss weight (core.js pgMissW) and the sheet's full replay take the same aim.
const aimP = () => aimOf((P[LEVEL] || {}).th || 0);
// df: the format's offset (core.js fmtOff, the subject's pfmt; Pierre, 2026-11-06, Q138): a format the players find easier
// than its guess rate allows (df > 0, e.g. 2 plausible choices among 4) gets a photo that much harder, so the question is
// still aimed at aimP in its format; 0 with an older sheet (the aim as before).
const aimOff = (k = 4, df = 0) => {
  const x = (aimP() - 1 / k) / (1 - 1 / k);
  return Math.log(x / (1 - x)) - df;
};
// The schedule of the format (step 1): points [ability, look-alike traps, share of single-view questions], a straight
// line between them, flat outside. Traps: none on a genus's very first question (ability 0), one from 0.18 (after the
// first right answer), all three from 0.54 (about 5 right answers), rounded at random in between (trapsFor); then
// single views, from none at 0.54 to 85% of the questions from 1.8 (the rest keep every view: the colony seen whole).
// It joins TRAP {start 0, step 0.18} and singleP's (ability - 0.5) / 1.5 capped at 0.85 (single views from 0.5).
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
// One zoom level per question (Pierre, 2026-10-31): beginners get every view of the colony (lots of information); as
// the player's level on the genus rises, more and more questions show a single view (colony, closer or corallites
// alone), so each view is learned on its own and each photo's difficulty is measured on its own (FORMAT). A single
// view counts as harder (SINGLE), so easier photos are picked for it. The other views show after the answer.
const singleP = (n, shift = 0) => formatAt(ability(n) + shift)[1];
// Online calibration (Pierre, 2026-11-02: about half the 600 game photos had never been shown to anyone, so they could
// not be rated): as adaptive tests seed new items among the calibrated ones, a photo with few answers from all the
// players (the sheet's plain count, v18) is drawn more often: x (1 + CAL.B / (1 + answers / CAL.N)), i.e. x3 with none,
// x2 after 2, x1.5 after 6, fading as the rating firms up. It multiplies the difficulty targeting, never replaces it.
// That alone hardly moved anything (simulated: 2 players, 800 questions, the same ~330 photos shown): most photos never
// shown are single views of a colony, which the choice of colony below scores down (a third, or a ninth for several
// views). So CAL.RATE of the questions are calibration questions, as adaptive tests give a share of the slots to
// items being pretested: the colony is chosen on the difficulty targeting and the bonus alone, a single view then
// showing alone. Only on a genus the player already holds (met, not shaky, as the opening of genera reads it): one
// photo alone, perhaps unusual, would not help on a genus still being learned. docs/LEARNING.md.
// The exploration share (Pierre, 2026-11-06, Q188; docs/reviews/2026-11-06-photo-exposure-study.md): RATE 0.3 (0.2
// before), and a calibration question draws among the colonies (observations) the player has never seen (photoSet).
// Every subject. Simulated (docs/LEARNING.md "Photo exposure"): on any genus met with 5 answers or more instead of a
// genus held, the repeats fell less and a fish beginner met fewer units, so the genus held stays the condition.
// CAL.U: how unsure the difficulty of a photo nobody has answered is (variance, in difficulty units; until its answers
// come it only has its genus's offset, photoDiff): the targeting is that much wider for it, narrowing as answers come
// (U / (1 + answers / CAL.N)), so a new photo is not kept away by a prior. (Written for the Easy / Medium / Hard sets of
// before 2026-11-03; the residual around the genus offset is smaller, sd about 0.3-0.6, but U stays 1 until a learnsim
// check says otherwise: ROADMAP.) Pierre, 2026-11-02: "relax the arbitrary thresholds
// so new photos come in, and their answers inform the dynamic algorithm".
const CAL = {B: 2, N: 2, RATE: 0.3, U: 1};
const nAnswers = p => {
  const o = PSTAT[p.f];
  return o ? (o[3] ?? o[1]) : 0;
};
const calBonus = p => 1 + CAL.B / (1 + nAnswers(p) / CAL.N);
// The prior's uncertainty is the subject's when it sets one (SUBJECTS calib u, core.js calibOf), CAL.U otherwise (the
// corals): fish photos all carry a judged ease, so a narrower targeting lets that prior lead while their answers are few
// (Pierre, 2026-11-06 15:33, Q186).
const calU = () => calibOf(SUBJ).u ?? CAL.U;
// u: calU(), passed in by a caller that reads it once for many photos (photoSet).
const calSd = (p, u = calU()) => Math.sqrt(PICKD.SIGMA ** 2 + u / (1 + nAnswers(p) / CAL.N));
// The draw's floor for a unit of nObs observations (photoSet): PICKD.FLOOR of the best one's weight each, shared over the
// subject's pool when the unit has more (SUBJECTS calib pool; unbounded for the corals: PICKD.FLOOR, as before), so in
// a big pool the floor's mass does not drown the prior's lean (Pierre, 2026-11-06 15:33, Q186).
const drawFloor = nObs => PICKD.FLOOR * Math.min(1, calibOf(SUBJ).pool / Math.max(1, nObs));
// The memory of each colony (observation) of a question's draw (Q190): the record [shown, right] of its most remembered
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
// skip: a photo file left out when the colony has others to show (the photo of the genus card just shown, K9).
// shift: added to the ability for this question (a comeback question after a break: ln R, comebackShift, below).
// k: the question's plausible choices (plausibleK; 2 for an Again or a duel, Infinity typed), so the photo is aimed for
// PICKD.P in that format (aimOff); f: its format (core.js fmtOf: 'k4', 'again', 'duel', 'typed'…), whose offset the aim
// takes (fmtOff, the subject's pfmt).
function photoSet(n, skip, shift = 0, k = 4, f = '') {
  const g = GX(n),
    two = g.levels === 2,
    need = two ? ['wide', 'macro'] : ['wide', 'medium', 'macro'];
  const shownV = two ? ['wide', 'macro'] : ['wide', 'medium'];
  // The Colony slot never gets a photo whose growth form is "x" (too close to see it): that is a close-up. Except for a
  // genus with a single IMR growth form (Pierre): the form is no question there, so the photo still works as a colony.
  const oneForm = imrFormsOf(n).length === 1,
    ok = v => p => v !== 'wide' || p.form !== 'x' || oneForm;
  // Bonus genera: Research Grade only. A two-level genus's close-ups may still sit in "medium" (extra genera from
  // tools/build_extra.py, e.g. Sandalolitha): they count as its close-up level, so its corallites milestone is reachable.
  const gameOk = p => gamePhotoOk(n, p);
  const pics = v =>
    [...gamePics(n, v), ...(two && v === 'macro' ? gamePics(n, 'medium') : [])]
      .filter(ok(v))
      .filter(gameOk)
      .filter(p => p.f !== skip);
  // Only on a genus the player already holds (met, not shaky): a genus still being learned keeps whole colonies.
  // No calibration question in a comeback (shift): one unusual photo alone is not a restart.
  const calQ = !shift && level(n)[0] !== 'new' && !shaky(n) && Math.random() < CAL.RATE,
    single = calQ || Math.random() < singleP(n, shift),
    s = P[n] || {},
    ro = s.ro || [],
    // The subject's calibration, read once for the whole draw (performance pass, 2026-11-09: calibOf builds a new
    // object, and w below reads it at every photo weight; the same values, so the same draws).
    cal = calibOf(SUBJ),
    calu = cal.u ?? CAL.U,
    // The start's lean (SUBJECTS calib early, Pierre 2026-11-06 14:17-14:18: no wall, the easy photos strongly favoured
    // at the start by the difficulty engine itself): the target sits early logits lower on a unit with few answers,
    // fading as PDIFF.W / (PDIFF.W + answers on it); 0 for the corals (their target as before).
    lean = cal.early * (PDIFF.W / (PDIFF.W + (s.ok || 0) + (s.ko || 0))),
    tgt = ability(n) + shift - aimOff(k, fmtOff(pfmt(), f)) - (single ? PICKD.SINGLE : 0) - lean,
    pm = pmem();
  const h = [...recent(n).slice(-5)],
    hot = h.length ? h.filter(x => x === '1').length / h.length : 0.5;
  // Before Open Water, the hard photos' factor (RARE, rareCap below; 1 otherwise).
  let hardF = 1,
    hard = () => false;
  // off: extra difficulty when the colony only has one view, so the question will show it alone (SINGLE).
  const w = (p, off = 0) => {
    const x = (photoDiff(n, p) + off - tgt) / calSd(p, calu),
      k = mem[p.o || p.f];
    let r = Math.exp((-x * x) / 2) * calBonus(p);
    // Spread the repeats (photo memory, Pierre 2026-11-03): a photo already shown weighs e^offset of its memory bucket
    // (core.js MEM, the subject's offsets pmem): the odds memory adds to a right answer on it, divided out. With the
    // offsets of 2026-11-03, about x 0.64 shown never right, x 0.33 right once, x 0.18 right twice or more (it was x 0.6
    // from right twice only). Soft: a genus whose photos are all known still shows them, the least remembered first.
    // It matters most in a genus with few photos, where repeats come soonest.
    // A reference-level photo never seen (core.js refLevel: a reference source's own, or judged ease 5 with the
    // reference look; Pierre, 2026-11-06) weighs its subject's calibration ref times more (SUBJECTS calib: 3 for fish, 1
    // for the corals): it comes first among the photos drawn, with no exclusive rule, whoever took it.
    if (!k) r *= (1 + 1.5 * hot) * (isCore(p) ? 1.3 : 1) * (refLevel(p) ? cal.ref : 1);
    else r *= Math.exp(pm[memBucket(k)]);
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
  // A colony counts as seen whatever view of it was shown (Pierre, 2026-11-06, Q190): every photo of an observation
  // takes the memory of its most remembered photo (memBucket, then the most shown), so a close-up never shown of a
  // colony already met is no new photo, and it loses the never-seen bonus. For fish, an observation's other photos of
  // the same fish. The question's expectation and the progress still read each photo's own record (famOf, pgMemW).
  const mem = colonyMem(obs, s.ps || {});
  // Each observation's photos, every view, listed once (ph below reads them several times).
  const phs = Object.fromEntries(keys.map(k => [k, Object.values(obs[k]).flat()]));
  // All the photos of a question come from ONE observation (Pierre, 2026-11-01: zoom levels of different colonies shown
  // together read as one coral and teach a wrong picture). Colonies photographed at several zooms are favoured, by cov,
  // the share of the views they have, in a single-view question and in a beginner's multi-view one (Pierre, 2026-11-06,
  // Q189: cov squared until then, which turned a beginner's questions round the few colonies with every view; a colony
  // with two views of three now weighs 0.67 of a complete one, not 0.44). Fish: one view, cov the same for every
  // observation, so it changes nothing there. A colony with a single view becomes a single-view question, never topped
  // up from another one.
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
  // The exploration share (Pierre, 2026-11-06, Q188): a calibration question draws among the colonies this player has
  // never seen, while the unit has one the draw can show; still on the targeting and the calibration bonus, so at the
  // difficulty aimed for and the least answered first, never a random hard one. Before Open Water with every easy
  // colony seen, the seen easy ones stay (only the seen hard ones go): the exploration then reaches the unseen hard
  // ones within the cap, never past it (Codex review #729).
  if (calQ && keys.some(k => sc[k] > 0 && !mem[k])) {
    const keep = rare && !keys.some(k => sc[k] > 0 && !mem[k] && hs[k] < 1);
    keys.forEach(k => mem[k] && !(keep && hs[k] < 1) && (sc[k] = 0));
  }
  const top = Math.max(0, ...Object.values(sc));
  keys
    .filter(k => sc[k] > 0)
    .sort((a, b) => sc[b] - sc[a])
    .slice(0, PICKD.VARIETY)
    .forEach(k => {
      if (!ro.includes(k)) sc[k] = Math.max(sc[k], 0.5 * top);
    });
  const floor = drawFloor(keys.length);
  keys.forEach(k => {
    if (sc[k] > 0) sc[k] = Math.max(sc[k], floor * top);
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
// Whether photoSet(n) shows a photo (its shown list not empty), told without drawing one (performance pass, 2026-11-09:
// app.js pool asks it of every unit, several times a question, and a draw costs a millisecond or more on a big fish
// family). photoSet shows one exactly when some photo of n passes its filters (form, gamePhotoOk, a name) in a view it
// needs: each observation then holds such a view, and every branch of photoSet returns at least one photo of the one it
// picks; with none, nothing. Its filters are copied here; tests/photoany.test.js compares the two on varied units.
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
// The next exam question of genus n: one photo alone, in a view the exam has not shown yet when it can, never answered
// right before (else the least seen), the hardest of them. Null when the genus has no game photo.
function examSet(n) {
  const g = GX(n),
    two = g.levels === 2,
    need = two ? ['wide', 'macro'] : ['wide', 'medium', 'macro'],
    s = P[n] || {},
    ps = s.ps || {},
    done = (s.ex || {}).v || [];
  const oneForm = imrFormsOf(n).length === 1,
    gameOk = p => gamePhotoOk(n, p) && !p.multi;
  const lab = v => (two && v === 'macro' ? 'close' : v);
  const pics = v =>
    [...gamePics(n, v), ...(two && v === 'macro' ? gamePics(n, 'medium') : [])]
      .filter(p => v !== 'wide' || p.form !== 'x' || oneForm)
      .filter(gameOk);
  const vs = need.filter(v => pics(v).length),
    todo = vs.filter(v => !done.includes(lab(v)));
  if (!vs.length) return null;
  const v = pick(todo.length ? todo : vs),
    L = pics(v),
    // Never shown at all first (a photo answered wrong has been seen, and its answer shown); else the least seen of those
    // never answered right; else the least seen.
    fresh = L.filter(p => !(ps[p.f] || [0])[0]),
    unright = L.filter(p => !(ps[p.f] || [0, 0])[1]),
    least = M =>
      M.slice()
        .sort((a, b) => (ps[a.f] || [0])[0] - (ps[b.f] || [0])[0])
        .slice(0, 3),
    pool = fresh.length ? fresh : least(unright.length ? unright : L);
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
// Which genus to ask next (Pierre: spread the work, target what is not seen or not mastered yet, keep some chance).
// One quantity (independent review of 2026-11-02, item 8; Pierre, 2026-11-03: "one variable computed dynamically, as
// simple as possible"): a genus weighs what the model does not yet know the player holds, drawW = 1 - x c, with
// x = sig(ability - genusDiff), the player's chance to recognise an average photo of it (what shaky and the comeback
// read), and c = m / (m + ELO.n), how sure the Elo is of that ability after m answers (the share of its uncertainty
// function, K = kmax / (1 + m / n), already gone). Never asked: 1, the most (every genus comes up early, a card's
// genus soon after it); badly known or barely measured: near 1; known and measured: near 1 - x. It replaced the status
// weights (never asked 10, learned 0.25, "Review" 3 + 2u, learning 1 + 3u, u = 1 - progress) and the "2 misses in the
// last 5" rule behind "Review" (docs/LEARNING.md "One draw weight"). The mastery exam: a genus ready for its next exam
// question weighs 1, as one never asked; between two of them it waits (x 0.05). A genus asked in the last 4 questions
// is mostly held back (x 0.1) so the work spreads across genera.
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
// Progressive path (Pierre, 2026-11-02: "rather than spamming a beginner with 40 genera, start with the easiest ones,
// opening new ones as they go, with nothing set by hand"). One opening rule (independent review of 2026-11-02, item 6;
// 2026-11-03): a question may open a genus (its card) when the path allows one (quiz.js planPhoto: no opening hold, not in the
// floor of a visit or a comeback, the pace (openPace) and the right-answer rule (openRight)), and then does with the
// chance openChance: the free share of OPEN.K places for genera met and still shaky (below), 1 - shaky / K. A slope,
// not a switch (Pierre, 2026-11-02: one genus more or less shaky never flips the pace), and a work-in-progress limit:
// with K shaky genera none opens until one holds (from OPEN.STUCK_FROM answers, the genera stuck shaky aside: below).
// The genus opened is drawn among those not met yet (openPick): the easiest (genusDiff) first, softly (OPEN.T), and the
// most common near Dauin (Pierre, 2026-11-03: "easy and common first": core.js commonFactor of each genus's data.json
// cm, tools/commonness.py, relative to the median of the genera not met yet). It replaced a share of the genus draw given to the genera not met yet (OPEN.READY 35% with no shaky genus
// down to OPEN.TRICKLE 3% at K, K 10), a second throttle on top of INTRO.EVERY (2 answers between
// cards, which never bound once openPace came: removed, Pierre, 2026-11-14, Q350 j). K 8: simulated, a
// beginner meets genera at the pace they did, the RAs and an expert faster, learning as much (docs/LEARNING.md).
// STUCK, STUCK_FROM (Pierre, 2026-11-12, Q338: "option a, B10 après 200 réponses"; docs/LEARNING.md "A unit stuck
// shaky"): a unit still shaky after STUCK of its own answers (its ok + ko) stops taking a place among the K, once the
// player's answers so far (answersSoFar: the subject's global level record P[LEVEL] ok + ko, the count progress.js
// ELO_MIN reads before it shows the Elo) are STUCK_FROM or more; before that the rule is off and every shaky genus
// takes its place. The engine's, so it holds for every subject (the fish units too, on the fish record's count).
const OPEN = {K: 8, P: 0.6, T: 3, DATA: 300, MAX: 3, WIN: 15, STUCK: 10, STUCK_FROM: 200};
// How much the easy-first order is trusted: the players' answers behind the photo ratings (weighed, sheet v17) over
// OPEN.DATA, up to 1. Without them every genus offset is 0 (until 2026-11-06 the declared look-alikes, until 2026-11-03 the photo
// sets too, which put Acropora and Galaxea among the hardest and Alveopora first, where Pierre expects the first two
// easy): the order then stays random until the answers can say (2026-11-02). A judged photo (p.e, the fish: judging/FISH.md,
// 2026-11-04) counts PDIFF.W answers, the weight its prior has in photoDiff, so the fish entries open easiest first from
// the first card on (648 judged photos: trusted in full); the corals have none, so nothing changes for them.
const easyTrust = () =>
  Math.min(
    1,
    (Object.values(PSTAT).reduce((t, o) => t + (o[1] || 0), 0) +
      PDIFF.W * slateGenera().reduce((t, n) => t + VIEWS.reduce((u, [v]) => u + gamePics(n, v).filter(p => p.e).length, 0), 0)) /
      OPEN.DATA
  );
// Difficulty of a genus (Pierre, 2026-11-06, Q133; docs/reviews/2026-11-06-engine-coherence-review.md F3; docs/LEARNING.md
// "One genus difficulty"): the sheet's genus offset (PGD, sheet v31 ?stats=1 gd: the hierarchical photo Elo's estimate
// of the part of a photo's difficulty its genus shares, learned from every trusted answer on the genus), the one
// estimate everywhere (drawW, shaky, stability, openPick). Adding or curating out a photo never moves it: the mean of the
// game photos' ratings did (a new photo, rated at the offset, pulled the mean towards it), and the confusion term counted
// the misses a second time (the photo ratings already hold them). A unit with judged photos (p.e, the fish while their
// answers are not logged; Pierre, 2026-11-04) adds the mean of their judged-ease priors (photoDiff's), so the fish
// entries open easiest first. 0 with an older sheet (before v31) or offline before its first reply. Cleared when the
// photo stats change.
let GDIFF = {};
const genusDiff = n => {
  if (n in GDIFF) return GDIFF[n];
  const je = [...new Set(VIEWS.flatMap(([v]) => gamePics(n, v)))].filter(p => p.e),
    ease = je.length ? je.reduce((t, p) => t + (PDIFF.MID - p.e) * calibOf(SUBJ).ease, 0) / je.length : 0;
  return (GDIFF[n] = Math.round((((PGD[n] || [0])[0] || 0) + ease) * 100) / 100);
};
// Shaky: met, not mastered, and the player's expected success on an average photo of the genus (4 choices, at its
// genusDiff) still under OPEN.P. The genus ability allows for how hard the questions were (a miss on a hard one moves
// it little) and starts from the player's global level (playerStart), so the signal is what the player knows, at any
// level, from the first answer. Tried first (docs/LEARNING.md): recent misses (2 in the last 5: the game keeps everyone
// near 80% right, where that happens about one time in four at any level, and a simulated RA opened fewer genera than a
// complete beginner); BKT knowledge alone (climbs too slowly on a beginner's easy photos); a minimum of answers per new
// genus (it held an expert back, each new genus waiting to be drawn again).
const shaky = n => {
  const s = P[n] || {};
  // The bar moves with the success aimed for (aimP): OPEN.P at the game's reference (PICKD.P), 0.05 higher for a
  // beginner aimed at 85%, 0.05 lower for a strong player at 75%, so a beginner opens a new genus only once the genera
  // met are a little more solid (Pierre, 2026-11-03), and the strong ones hold nobody back.
  return ((s.ok || 0) + (s.ko || 0) > 0 || !!s.h) && !s.mx && 0.25 + 0.75 * sig(ability(n) - genusDiff(n)) < OPEN.P + aimP() - PICKD.P;
};
// The chance that a question the path allows to open a genus opens one: the free share of OPEN.K places for shaky genera.
// Only the genera open now take a place (introduced): a genus closed again by "One at a time" (introBack) keeps its
// answers and its ability but is never asked until its card reopens it, so counted it would hold the opening at 0 for
// good (Codex P1 on #408). Nor does a genus still shaky after OPEN.STUCK of its own answers, once the player has
// OPEN.STUCK_FROM answers (Pierre, 2026-11-12, Q338): on the real log, two players past 200 answers were held 63 and 117
// answers with no new genus by 8 or more genera that stayed shaky. It stays shaky (Review, the draw); it only stops
// holding the others back. Before OPEN.STUCK_FROM answers, as before.
const openChance = list => {
  const late = answersSoFar() >= OPEN.STUCK_FROM,
    stuck = n => late && ((P[n] || {}).ok || 0) + ((P[n] || {}).ko || 0) >= OPEN.STUCK;
  return Math.max(0, 1 - list.filter(n => introduced(n) && shaky(n) && !stuck(n)).length / OPEN.K);
};
// The opening's pace (2026-11-04, Pierre, after a strong player was opened 7 genera in 16 answers right after a comeback,
// and fell from 83% to 50% right: docs/LEARNING.md "Opening pace"): the genera opened on a card (the first cards, or one
// of their own) in the last OPEN.WIN answers, as at (the answers count at which the question will show).
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
  return L.length < OPEN.MAX && L.every(n => asked(n) || soon.includes(n));
};
// An opening only after a right answer (Pierre, 2026-11-03: "new genera open right after a wrong answer: unlocking
// a new genus feels like a reward given for a wrong answer"; docs/LEARNING.md "An opening only after a right answer").
// The path opens a genus only when the last graded answer was right, or there was none: after a miss, nothing opens
// until the player answers right again (a second miss keeps it closed). The opening is deferred, not lost: the next
// question after a right answer may open it as usual. Every graded answer counts, whatever the game (photo quiz, an
// "Again", a duel slipped in or in the Duel tab, the custom quiz, a typed "I don't know"): the global record's recent
// results (P[LEVEL].h, newest last, written by quiz.js answer, synced with the progress like a genus's h).
// at: the answers count at which the question will show. Planned ahead (at > answersSoFar(): the answer before it is
// still to come) it may hold a card: a miss drops every question planned (quiz.js answer, dropPlans), and quizPhoto
// checks again when it shows one.
function openRight(at = answersSoFar()) {
  return at > answersSoFar() || !((P[LEVEL] || {}).h || '').endsWith('0');
}
// The genus to open among those not met yet (fresh): the easiest first, softly (OPEN.T, as far as the data are trusted:
// easyTrust), and the most common near Dauin (commonFactor). A ★ genus waits while a genus its card compares it to is in
// the list and not met (Pierre, 2026-11-03, #402; core.js starWaits: a reference not in the list never holds it back,
// and a reference never waits itself); should every genus left wait (not possible with today's data), they all open.
// met: the genera already met (introStart passes the cards drawn before it in the same batch as met too).
// The player ever answered "I'm at IMR" to the subject's first-launch question (Pierre, 2026-11-08, Q227: "il faut garder
// cette information de un jour il a cliqué sur je suis à IMR"), whatever the answer in force now: an imr answer given
// (the card, the tour, the fallback card) in the record's history, kept whole and merged as a union across devices (h:
// core.js startEvents, startUnion; reefid-sync-<subject>-start, synced), or a fallback card shown on an imr answer (fb
// keyed by the imr answer then its direction, merged likewise), which recovers the players the fallback card moved from imr to know before it
// was turned off for the fish. An inferred answer (startInfer: never asked) and the ease events are no answer.
const imrSaid = () => {
  const o = store.get(startKey(SUBJ.id), null);
  return (
    startEventsOf(o).some(x => x[0] === 'imr' && x[3] !== 'ease' && x[3] !== 'inferred') ||
    Object.keys((o && typeof o.fb === 'object' && o.fb) || {}).some(k => k.split('-')[0] === 'imr')
  );
};
// Families met first (Pierre, 2026-11-09, Q208 A): while a unit of the slate in play is still to open (in fresh: those not
// met that may open now), the units of a set that opens after the slate (app.js setLater: the fish scientific genera once
// the offer is accepted) wait; Open all opened the slate by choice, so after it nothing waits (openedAll: a unit opened by
// it and not closed again by "One at a time"). Once every slate unit in play is met, they open as before.
const openedAll = () => Object.values(introMap()).some(e => (e || [])[3] === 'a');
const laterWaits = fresh => {
  if (typeof setLater !== 'function') return [];
  const sl = new Set(slateGenera());
  return fresh.some(n => sl.has(n)) && !openedAll() ? fresh.filter(n => !sl.has(n) && setLater(n)) : [];
};
// Confusion groups (Pierre, 2026-11-14, Q350: "oui à tout" to the study's a-j, f changed; docs/LEARNING.md "Confusion
// groups", docs/reviews/2026-11-06-confusion-group-opening-study.md): look-alike units open close together. The units of
// one rank in play (pool(), app.js rankOf) are grouped, the same for every player, recomputed with the pooled stats:
// 1. a declared pair (a teacher's look-alikes: the IMR lecture and the Coral Finder, Pierre's and IMR's fish groups,
//    `look`; declaredOf) always stays grouped (Pierre, f: "si elles sont déclarées par des enseignants, c'est qu'il y a un
//    intérêt à les voir ensemble, même s'ils sont faciles à distinguer"): declared pairs merge first, the most confused
//    first (groupConf), ties alphabetical, while the group stays at GROUP.MAX units or fewer; the data never split them;
// 2. then average linkage on the pooled score (groupConf): the two groups whose pairs have the highest mean score merge,
//    while that mean is CONF.TRAP or more and the group stays at GROUP.MAX or fewer (ties alphabetical).
// A unit in no group is a lone unit. A declared pair the cap kept apart pulls nothing (Pierre, 2026-11-14 16:48, Q355:
// "ok pour B": the declared coral pairs join the whole slate, so the pull chained every opening; docs/LEARNING.md
// "Confusion groups"). MAX 3 (Q350 b):
// the size of the interleaving studies; 2 kept 39% of the coral confusion inside a group, 4-5 gave the same groups.
const GROUP = {MAX: 3};
// A unit's declared look-alikes: `decl` where its record lists them apart from `look` (app.js fishGenera: a fish scientific
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
// The groups of the units in play, every rank (of). Built
// again only when their inputs change (Codex review #871: the clustering takes tens of milliseconds): the units in play
// (pool()) or the pooled stats (a new PCONF object). The units in play are read again only when something that moves
// them may have changed (the subject, the answers count: a fish genus enters at its family's Advanced; the settings Q:
// the bonus genera, the scientific names), so the many calls of one question (examOn for every unit) cost a key.
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
// The genus to open among those not met yet (fresh), after the filters above (the starter core, "I'm at IMR") (Pierre,
// 2026-11-14, Q350 c; Q355, "ok pour B"): 1. a group partner of a unit met: once a group has a member open, its other
// members are the next openings, one at a time (the shaky limit, the pace and the right-answer rule decide when, as for
// any card); 2. otherwise a new group or lone unit, drawn with the weight below on the group's means (mean genusDiff,
// mean cm), then the member that opens first by the same weight. The first cards (introStart, first: true) are drawn
// unit by unit as before the groups, with no group partner first (Q355: a beginner's first cards were a look-alike
// group, and the first unit at Open Water came about 45 answers later); the groups take over from the first card after
// them. A subject's starter core (fish.json start) keeps the group order among its first cards (B': drawn unit by unit,
// the fish rated world's lecture RA met its first unit at Open Water later and the expert fewer units at Open Water at
// 1,000, on two seed sets; the starter core is the first cards either way). The weight: the easiest first, softly (OPEN.T, as far as the data are trusted: easyTrust), and the most common
// near Dauin (commonFactor). A ★ genus waits while a genus its card compares it to is in the list and not met (Pierre,
// 2026-11-03, #402; core.js starWaits: a reference not in the list never holds it back, and a reference never waits
// itself), group partners included (they then give way to the draw); should every genus left wait (not possible with
// today's data), they all open.
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
  // The starter core first (Pierre, 2026-11-04: the fish beta opened on the wrong families): units whose record says
  // `first` (fish.json start: the Butterflyfishes, Angelfishes, Damselfishes, Surgeonfishes) open before any other,
  // as long as one is left; then the rule below. Data, not code: the corals have none.
  const first = fresh.filter(n => (GX(n) || {}).first);
  if (first.length) {
    fresh = first;
    firstCards = false; // the starter core: its first cards in the group order (B')
  }
  // "I'm at IMR" (the first-launch answer imr): the units the IMR course teaches, their IMR tag (imrName: fish.json imr on
  // families and genera), open before the others (Pierre, 2026-11-06 13:38). Data, not code: the corals have none.
  // Anyone who ever answered it (imrSaid; Pierre, 2026-11-08, Q238).
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
  // 2. A new group or lone unit: each group as its members in fresh (a lone unit alone, so with no group the draw is the
  // one of before, unit by unit).
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
// First meeting with a genus (Pierre, 2026-11-02, after the beginner RA review): a player starting from zero first meets
// INTRO.START genera on cards (name, cover photo, ID tips) and is asked about those; new genera then come one at a time,
// each on its card, and never as the answer of the question right after its card ("too easy"): a genus met on a single
// card can be asked from INTRO.GAP answers on, and a new card waits while one is still to be asked (openPace) and while
// introHold (below). INTRO.EVERY (a new card at least 2 answers after the last one) went on 2026-11-14 (Pierre, Q350 j:
// the opening's pace already waits for each recent card's question, which comes INTRO.GAP answers on at the soonest; the
// confusion-group study's 120 runs were identical without it). Which genus
// opens and when stays the progressive path's (weighted, OPEN): a draw that falls on a genus not met yet shows its card
// and asks about a genus already met. Kept on the device (reefid-sync-coral-intro: genus -> [answers when shown, 1 if one of the
// first cards]); a genus already asked (another device, progress from before the cards) counts as met. Bonus genera
// (once on, app.js Q.bon) open the same way, on their own card. docs/LEARNING.md.
// OFFER: the record of Open all (introAll) and of the back card (introBack), its name from the card that offered Open all
// until 2026-11-12 (Pierre, Q337: the card went, Open all stays on the first cards and in My progress). Synced with the
// progress (the sheet keeps every reefid-sync* key; sync.js introMerge).
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
// kind (Codex review #352: readiness and answer count alone can't tell them apart once synced): 's' one of the first
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
// Closed again by "One at a time" (introBack, below): kind 'b' wins over the answers already given until a card (or Open
// all) opens the genus again and replaces the mark.
const closed = n => (introMap()[n] || [])[3] === 'b';
const introduced = n => !closed(n) && (asked(n) || n in introMap());
const introReady = n => {
  if (closed(n)) return false;
  if (asked(n)) return true;
  const e = introMap()[n];
  return !!e && (!!e[1] || answersSoFar() >= e[0] + INTRO.GAP);
};
// "I've had the IMR lecture" (Pierre, 2026-11-02): an RA has seen every genus in the lecture and has little time, so
// one card at a time would hold them back. On the first cards and in My progress, one tap opens every slate genus at
// once, without cards: the draw then asks first the genera never asked (weight 10), choices from the whole slate.
// The bonus genera are not opened with them: they open one at a time once on (opt-in, app.js BONUS). Only the units the
// lecture teaches (app.js UNITS core: the fish circle 1, the IMR course's families; the corals, the whole slate): the
// later fish circles open one at a time after them (app.js fishGate).
const unitsNow = () => (typeof UNITS === 'object' && UNITS[SUBJ.id]) || {};
const slateCore = () => (unitsNow().core || slateGenera)();
const introLeft = () => slateCore().filter(n => !introduced(n));
// Whether a unit may open now (app.js UNITS gate: the fish circles 2 and 3 wait for their thresholds; Pierre, 2026-11-06,
// Q175), and, for a part of the slate opened by choice, once the player said yes (app.js UNITS opens, openShut: fish
// circle 3; Pierre, 2026-11-07); always for a subject with neither. The opening's candidates only (quiz.js introStart,
// planPhoto): a unit already open stays open.
const mayOpen = n => !(typeof openShut === 'function' && openShut(n)) && (!unitsNow().gate || unitsNow().gate(n));
// One progression path for every game (Pierre, 2026-11-04: "one path for the quiz, the duels, Memory and any future game
// or mode, no exceptions"): the genera this player has unlocked, met on the path (a card, an answer, Open all) and ready
// (introReady), among the genera in play. The photo quiz is the path: it opens genera one at a time (its cards, the ★ rule
// after their reference, core.js starWaits). Every other game draws from these only and opens none, so the ★ rule holds
// there by construction.
const unlocked = (list = pool()) => list.filter(introReady);
// via: where the player opened them ('card' the first cards, 'progress' My progress; 'offer' in a record from before
// 2026-11-12, the offer card), kept for the admin's player journey.
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
// Back to one at a time (Pierre, 2026-11-03, after a player at 90% right on 13 genera opened one at a time accepted Open
// all around answer 52 and fell to 62% right on the ~27 that came at once, the game expecting 70-88%: "if the player then
// says no, I keep all genera, fine; but offer at least once the option to go back if we detect it really became too
// hard"). The record of Open all keeps h, the opening hold's own CUSUM (holdNext, same expectation e and allowance
// INTRO.SLACK) over the answers given since, from 0. The card is due once h reaches 2 x INTRO.HOLD (3: about three
// answers' worth of misses beyond the expected success and the allowance): on that player's answers, replayed, h passed
// 3 at the 21st answer after Open all (3.53, peak 4.98) and stayed above 1.5 to the last (the 34th), while a blip of
// three misses in a row at the 7th (2.21) stays under it (docs/LEARNING.md). No new constant: the hold's own threshold,
// doubled because a card that undoes a choice needs more evidence than pausing new cards. Once: "Keep them all" or
// "One at a time" is kept with the record (bk), synced like it (introMerge: the latest decision wins).
const backOpen = () => Object.keys(introMap()).filter(n => introMap()[n][3] === 'a');
const backDue = () => {
  const o = store.get(INTRO.OFFER.KEY, null);
  return !!(o && o.open && !o.bk && (Number(o.h) || 0) >= 2 * INTRO.HOLD && backOpen().length);
};
// "One at a time" closes every genus opened by Open all (kind 'a'), answered or not (Pierre, 2026-11-03): the mark 'b'
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
    // reopening must not close the genus again (Codex review #398: a@100, then c@300, then b@200).
    const later = (h, e) => (e[3] === 'b' || h[3] === 'b' || (h[3] === 'a' && e[3] === 'c')) && (e[2] || 0) > (h[2] || 0);
    let open = false; // a genus closed or reopened here: the questions planned ahead may be about it (or offer it)
    Object.entries(m).forEach(([n, e]) => {
      if (!Array.isArray(e)) return;
      const h = L[n];
      if (h && later(h, e) && (e[3] === 'b') !== (h[3] === 'b')) open = true;
      if (!h || later(h, e)) ch = L[n] = [e[0] || 0, e[3] === 'b' ? 0 : 1, e[2] || 0, e[3] || (e[1] ? 's' : 'c')];
    });
    if (ch) store.set(INTRO.KEY, L);
    // Codex review #398: the planned questions (quiz.js takePlan) only check the answer count and the pool, so they are
    // dropped and drawn again with the genera as they now are.
    if (open && typeof dropPlans === 'function') dropPlans();
  }
  // The latest decision wins (its time t): declined on one device, then Open all on another, must not go back to the
  // decline at the next sync (Codex review #352). Without times (older), the one already here stays.
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
  // fish reset leaves the corals' window, which counts coral answers; Codex review #428).
  if (startOn()) startRestart(at);
};
// The first-launch question (Pierre, 2026-11-03; core.js CHOICE, docs/LEARNING.md "The first-launch question"), one per
// subject (SUBJECTS start: the fish welcome question, Pierre 2026-11-04): the player's answer in
// reefid-sync-<subject>-start (startK; synced with the progress, like every reefid-sync* key): {c the choice, t its time,
// at the answers count then, via (tour, card, fallback, inferred), ease the silent band below taken with Coral basics on
// the "lower" card ([c, answers, time], startEase), n and s the fallback window (answers counted since
// the choice, up to the last of CHOICE.AT, and the sum of their surprise, right - e), fb the fallback cards shown ({'<choice>-lo' / '-hi': [answers,
// time]), h the choices made, [c, at, t, via], for the admin's player journey}. Its variables (startV) are read where
// the model uses them: the level a genus never answered starts from (ability, core.js playerStart). Nothing else is coded
// per choice: the variable at (core.js CHOICE), the answer from which the open-all offer could come, is no longer read
// since that card went (Pierre, 2026-11-12, Q337).
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
// new epoch wt (Codex review #428: so a window saved before the reset never wins a merge over the new one). A reset made
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
// Never for a subject whose units say startFb false (app.js UNITS: the fish, Pierre 2026-11-08, until the level is
// better calibrated there).
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
// Opening held while the player does clearly worse than expected (Pierre, 2026-11-02, after an RA at 86% right met 9
// genera in 21 answers and dropped to 5 right in 10: "when many genera have just opened and the answers suddenly get
// worse, space the new ones; an expert keeps opening regularly"). A running sum of how far the answers fall below the
// success the game expected (each answer's e), never below 0: a CUSUM (Page 1954, the standard detector of a lasting
// drop), so a run of misses adds up however long it lasts, a spell of answers above expectation is not banked against
// a later drop, and right answers pay the debt back by what they beat the expectation by (an easy one, e 0.9, by 0.1).
// No new card while it is INTRO.HOLD or more. Kept on the device (reefid-hold), so it carries from one visit to the next
// (Pierre: a player who left on a run of misses must not come back to new genera), and for a signed-in player rebuilt by
// the sync sheet from all their answers (holdSync, below); cleared with the progress (reset, sign-out). The questions
// after a break count, with the expectation they really had (comeback, below; logged |c): from 2026-11-02 to the comeback,
// the gentle restart's were left out (logged |w, still left out here and by the sheet). A sliding window of the last 10 answers was tried first: it forgot
// the misses at the next visit, and a longer one hid a sudden drop behind earlier good answers (on that RA's answers, 20
// answers never reached the threshold). SLACK: only a shortfall of more than 0.1 an
// answer adds up (the CUSUM's allowance), so a player the game slightly overrates (0.85 expected, 0.8 right) is never
// held: without it the simulated expert, 85% right where the game expected a little more, was held for good. HOLD 1.5:
// on that RA's answers it holds at answers 11-12 (three misses in a row) and from answer 67 on, off and on (the window:
// 73); simulated (6 seeds, 200 questions, genera met, without -> with), a beginner 15 -> 13, a lecture-level RA
// 14 -> 13, a strong RA 22 -> 23, an expert 27 -> 28.
const HOLDK = () => sDev('hold'); // reefid-hold for corals (core.js subjDev)
let HOLDS = Number(store.get(HOLDK(), 0)) || 0;
const introHold = () => HOLDS >= INTRO.HOLD;
// Easier questions while the hold is on (2026-11-04, Pierre: a run that goes wrong must not only stop the cards, the
// questions must get easier too; docs/LEARNING.md "Easier questions when a run goes wrong"): the ability the photos and
// the format (traps, single views) aim at is lowered by how far the sum h has gone past INTRO.HOLD, in logits, so 0 at
// the threshold (no cliff) and 1 for each answer's worth of misses beyond it; the right answers that pay h back bring it
// back. No new constant: h is already in success units, the scale the Elo steps the ability on. Never on an exam
// question (as hard as the game gets).
const holdEase = () => Math.min(0, INTRO.HOLD - HOLDS);
// slack: the allowance an answer (INTRO.SLACK for the hold; the comeback's CUSUM passes the rust a question repairs).
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
// Synced (sheet v23, Pierre 2026-11-02: the hold follows a signed-in player from one device to another, and is rebuilt
// from the answers given before it existed). Each load of the saved progress (sync.js mergeSaved) brings h, the same sum
// over every answer the sheet has logged for the player since their last reset (Code.gs hold_, gentle-restart answers
// left out: logged with |w). The answers of this device the sheet has not confirmed yet (log) are added on top, and
// that is the hold: the same sum over the same answers on every device, so right answers on one device pay back a hold
// started on another (on a single device it equals the device's own sum). An older sheet sends no h: the hold stays
// this device's. Not signed in: this device's only.
const HOLD_WARM = /\|w(\||$)/; // the mode of a gentle-restart answer (before the comeback replaced it; old rows only)
// ids: the answers the sheet counted lately (Codex review #370: a send whose reply was lost stays in the log though the
// sheet has it; it is not added twice).
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
// Comeback after a break (Pierre, 2026-11-02; replaces the fixed gentle restart, 10 easy questions at each visit). Time
// is used here and only here (rule L1): to plan the questions after a break. Progress (s.pg), mastery (s.mx)
// and the Elo ability (s.th) never decay with time; only answers move them. docs/LEARNING.md, "Comeback after a break".
// - Recall of a genus t days after its last answer (s.at): the FSRS forgetting curve with its standard constants,
//   R = (1 + F t / S)^C, F 19/81, C -0.5, S the stability in days (R is 0.9 at t = S).
// - Stability: FSRS's first-rating stabilities, Again S0 0.4 to Easy S1 15.7 days, log-linear in how solid the genus is,
//   x = the chance to recognise an average photo of it (sig(ability - genusDiff), the signal `shaky` reads; 1 once
//   learned); FSRS's Hard 1.2 and Good 3.2 days sit at x 0.30 and 0.57. Times G = 2.5 (SM-2's default ease factor; FSRS
//   multiplies S by 2 to 3.5 at a review when due) for each further day the genus was answered right (s.dd): spaced days
//   count, a hundred right answers in one sitting count as one day. Ability is the app's estimate of how well the genus
//   is known from its first answer (an expert's genera start from their global level); progress needs many answers.
// - Rust: the right answers the break is expected to have cost, summed over the genera answered: each loses
//   (1 - 1/4) (1 - R) sig(aimOff(4) - ln R), on a usual 4-choice question with the photo a comeback shows (below). Only
//   the gap since the last answer counts, so play itself adds nothing. A comeback starts at a new visit (SESSION.GAP,
//   below) whose gap left rust: 30 minutes leave about 0.001 (one right answer ends it), a month several right answers.
// - Its questions (quiz.js planPhoto): genera answered right, the surest half (highest R) until one is answered right,
//   then the most rusted half; the player's usual choices (trapsFor: look-alikes for a strong player, so a right answer
//   proves something; Pierre, 2026-11-03, the first version's easy choices kept an expert 22 questions after a month),
//   photos targeted at the rusty ability, ability + ln R (rust multiplies the chance by R, which lowers its log-odds by
//   at least -ln R: a little easier, never more than the rust explains), no card, duel or exam. Logged |c and counted in
//   the opening hold with the chance they really had (the plausible choices k as for any question, and the rust: a
//   miss the rust explains adds less).
// - It ends by the answers: a CUSUM like the opening hold's (holdNext), rust <- max(0, rust + p - right - l), p the
//   recall-adjusted chance of the question, l the rust the question itself repairs (its genus is reviewed): doing better
//   than expected melts it fast, worse keeps it going; it ends at 0. A break during a comeback adds to it.
// - SESSION.GAP: a new visit starts after 30 minutes without an answer (Pierre, 2026-11-02: the standard session timeout
//   of web analytics, Google Analytics, also commonly used to cut learning logs into sessions), never at a page
//   load (a reload or an update is no new visit). From a new visit, and from the start of a comeback, the first
//   COMEBACK.FLOOR (10) answers open no genus: no card, no open-all or bonus genera offer (Pierre, 2026-11-02:
//   "reopening a new genus straight away would be a mistake"; his choice, not a cap). A comeback holds openings as long
//   as it runs. Neither applies with fewer than 2 genera answered right (nothing to come back to).
// Kept on the device (reefid-comeback: r rust, t time accounted, ok right answers in it, f answers count until which no
// genus opens); the times per genus (s.at, last answer; s.dd, s.dl: days answered right, last one) are in the synced
// progress (core.js mergeProgress), the player's last answer in P[LEVEL].at.
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
// shown before it were planned on the old recall (Codex review #374).
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
// photo's difficulty, k the plausible choices); l = the rust it repairs.
function comebackStep(R, th, d, k, good) {
  const x = (1 - 1 / k) * sig(th - d),
    p = 1 / k + x * R;
  if (good) CB.ok++;
  CB.r = holdNext(CB.r, p, good, x * (1 - R));
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
  const w = list.map(weight);
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
// Player ability per genus (s.th), on the same scale as photo difficulty (0 = average photo): an Elo step after each
// answer with a volatility (Glicko-2), core.js ELO, abilityOf, eloStep (moved there on 2026-11-03 so the full replay of
// the answer log steps the ability exactly as the app does; docs/LEARNING.md). Starts at 0 (target = the featured
// photos), or from the player's global level on a genus never answered (core.js playerStart: their abilities on the
// genera already answered), so a strong player gets traps, single views and harder photos on a new genus from its first
// question. No time between sessions; the seconds taken to answer weigh a right answer's step (core.js rtWeight, rtOn
// below; rule L1).
const RECENT = 10;
const recent = n => {
  const s = P[n] || {};
  return s.h ? s.h.slice(-RECENT) : '';
};
const misses = h => [...h].filter(x => x === '0').length;
// The ability: core.js ELO, abilityOf (a genus already answered: its own estimate s.th plus the global level's move since
// its last own step, levelMove; the global + concept skill of Pelánek et al. 2017, as a lazy update; 2026-11-03,
// docs/LEARNING.md "Global level and genus") and eloStep (the level's step without the kmin floor, kept to 4 decimals;
// the genus's step marks the level it was taken against, s.lt), shared with the sheet's full replay: quiz.js answer steps
// both through core.js scoreAnswer, the replay's own scorer. A genus never
// answered starts from the global level shrunk towards the first-launch answer's level (startV().p, core.js
// playerStart; each subject's own answer).
// The prior only once the sync script replays it (core.js START_SHEET; rule D4, Codex review #428): before, 0, the
// default player's, so an adopted replay never takes back what the game did live. A subject the sheet does not replay
// (SUBJECTS replay: fish) has no replay to wait for: its prior applies at once.
const startP = () => (!startS().replay || (typeof sheetV === 'function' && sheetV() >= START_SHEET) ? startV().p : 0);
const ability = n => abilityOf(P, n, startP());
// The answer time in the ability (core.js RTIME, rtWeight; Pierre, 2026-11-04): on only once the sync script replays it
// (its replies say v >= RT_SHEET, sync.js sheetV), so the sheet's replay never undoes it (rule D4); before, every
// step has weight 1, as before. The times are recorded either way (rtAdd), as the replay records them from the log.
const rtOn = () => typeof sheetV === 'function' && sheetV() >= RT_SHEET;
// The domain-score bar (core.js DOM, domStep; Pierre, 2026-11-06, Q135): a genus first answered now takes it only once the
// sync script replays it (its replies say v >= DOM_SHEET, sync.js sheetV), so the sheet's replay never undoes it (rule
// D4); before, every genus keeps the moving average s.pg, as before. A subject the sheet does not replay (SUBJECTS
// replay: fish) has no replay to wait for: a unit first answered takes it at once (one answered before keeps s.pg).
const domRules = () => !SUBJ.replay || (typeof sheetV === 'function' && sheetV() >= DOM_SHEET);
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
// Genus offsets of the hierarchical photo Elo (Pierre, 2026-11-03; sheet v31 ?stats=1 gd, core.js GENUS_K): {genus:
// [offset, weighed answers]}, the part of a photo's difficulty its genus shares, learned from every answer on the genus.
// Read only from a sheet that reports v >= PGD_SHEET (rule D4): with an older sheet, or offline before a v31
// reply, every prior is 0 (a constant prior predicts the answers better than the Easy / Medium / Hard sets did).
const PGD_SHEET = 31;
const gdOf = j => (j && j.v >= PGD_SHEET && j.gd && typeof j.gd === 'object' ? j.gd : {});
let PGD = gdOf(store.get('reefid-photo-stats', {}));
// Pairs of genera offered together and mixed up, every RA pooled (?stats=1 conf, sheet v10): see confOf.
let PCONF = (store.get('reefid-photo-stats', {}) || {}).conf || {};
// Photo memory (Pierre, 2026-11-03; core.js MEM, sheet v26 ?stats=1 mem): how much easier a photo is for a player who
// has already been shown it (s.ps: [shown, right]), in logits off its difficulty, by bucket: new 0, shown never right,
// right once, right twice or more, estimated by the sheet from every trusted answer; the prior (the old fixed rule)
// with an older sheet or offline. famOf: the offset of the photos of a question, as the player knows them now.
let PMEM = memOf((store.get('reefid-photo-stats', {}) || {}).mem);
// The offsets of the subject in play (pmem): PMEM is fitted on the answers of the one subject the sheet rates (Code.gs
// stats_ reads its replayed rows, SUBJECTS replay: the corals), so a subject it does not rate yet (fish: no per-subject
// ?stats=1, ROADMAP admin plan PR 11) draws, scores and recalculates with the prior (core.js MEM.PRIOR, memOf of nothing):
// no coral offset touches a fish answer (re-check of #664, F8; the integrator's call). The corals: PMEM, as before.
const PMEM0 = memOf();
const pmem = () => (SUBJ.replay ? PMEM : PMEM0);
// Per-format offsets (Pierre, 2026-11-06, Q138; core.js fmtOffsetsOf, sheet v77 ?stats=1 fmt): {format: [offset, answers]},
// how much easier (in logits) the players found each question format than its guess rate 1/k allows, added to the
// expectation of the ability steps (quiz.js answer) and taken off the photo's aim (aimOff); read only from a sheet that
// reports v >= FMT_SHEET (rule D4, core.js fmtsOf): {} before, every offset 0.
let PFMT = fmtsOf(store.get('reefid-photo-stats', {}));
// The format offsets of the subject in play (pfmt), as pmem for the photo memory: PFMT is fitted on the answers of the one
// subject the sheet rates (Code.gs stats_ reads its replayed rows, SUBJECTS replay: the corals), so a subject it does not
// rate yet (fish: no per-subject ?stats=1, ROADMAP admin plan PR 11) aims and scores with every format at 0, never with a
// coral offset (Pierre, 2026-11-09): the app's own expectation before any fit (the fit's prior mean, core.js FMT; what an
// older sheet gives), the prudent value, correcting nothing rather than by the corals' k2 +1.11 or typed -0.42 of that
// day. The corals: PFMT, the very object, as before.
const PFMT0 = Object.freeze({});
const pfmt = () => (SUBJ.replay ? PFMT : PFMT0);
// Progress saved before the photo memory, recalculated once and silently (Pierre, 2026-11-03: no pop-up, the bars move
// down 1-3 points; core.js memRecalc): every genus record not marked yet (s.pm), at load and after each pull of the
// synced progress (sync.js mergeSaved), and in quiz.js answer before a record's first answer. Saved and synced when it
// changed anything.
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
// The domain-score bar for a subject the sheet does not replay (SUBJECTS replay false: fish; Pierre, 2026-11-06, Q200): a
// unit record still under the former moving average (s.pg) is rebuilt on the device from its own counts (core.js
// domFromCounts: ok, ko and its last 10 results, each on a photo of the unit's average difficulty, genusDiff with one
// view alone, 4 choices), silently (no card: the apology is the corals' only, Pierre 16:30). A learned mark is kept
// (core.js afterBkt: the rebuilt record has s.ds). Once per record: a record with s.dp is never rebuilt again. A
// replayed subject (the corals) waits for the sheet's full replay instead (sync.js replayAdopt). Logged once per run
// that changed something (event 'recalc', the subject and the units rebuilt). Saved and synced when it changed anything.
// Only a unit whose data is in (GX: fish.json and the judged photos, lazy-loaded by app.js fishLoad; Codex review #688):
// a pull read on another subject (sync.js inSubject) finds FISH null and leaves the record as it is, rebuilt once the fish
// data comes (app.js fishLoad, the subject's switch), never on the fallback difficulty, since the rebuild is for good.
// Nothing before data.json is in (DATA, which GX reads first): a link straight to a quiz page brings this file before it
// (app.js need at start-up), so the call at the end of this file and fishLoad's find no data, and app.js start-up runs
// it once the data is built (2026-11-08: "reading 'gen'", and fishLoad failing brought the corals back).
function domRecalcAll() {
  // Nor while the subject's data is still partial (app.js dataPartial: the fish units on the stopgap's photos only, before
  // fish-game.json): the rebuild reads the units' photo difficulties, and runs once the whole data is in (fishLoad).
  if (SUBJ.replay || !domRules() || !DATA || (typeof dataPartial === 'function' && dataPartial())) return false;
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
// A learned mark taken away by a recalculation: silent for now (Pierre, 2026-11-09 ~15:40 Manila, Q332: every
// recalculation silent, the learned-mark card too), as a mark lost in play (quiz.js mxKept): no card, and the
// learned-based achievements kept, as in play (no achRecheck). Until then it was told once with a card (progress.js
// mxLostNotice, mxLost, kept for when that comes back) and those achievements were taken back (progress.js achRecheck).
// Generic: mxRecalc(fn) runs any recalculation of the progress (today core.js memRecalc, at load, after a pull and before
// an answer; later perhaps a full replay of the sheet's answer log) and reports every genus whose s.mx it removed. A mark
// lost by misses in play (quiz.js mxKept) never goes through it. Kept on this device only (MXL.KEY, outside the synced
// record: a drop made by a pull on another device is told there too): due {genus: its s.mx}, the drops not told yet;
// told {genus: s.mx}, those told, so the same mark is never told twice here (a copy pulled again that still has it),
// and each told to the account too (sync.js toldAdd, core.js TOLD 'mx:<genus>@<s.mx>': never told again on another of
// its devices; progress.js mxLostNotice);
// ach, achievements still to recheck (progress.js comes after model.js on a first load); gone, the ids taken back, for
// the card. Cleared at sign-out with the progress (sync.js signOff).
// QUIET (Pierre, 2026-11-09 ~15:40 Manila, Q332: every recalculation silent "for now"): mxRecalc tells nothing, and a
// card or an achievement recheck still pending from before is dropped unseen (progress.js mxLostNotice, achRecheck;
// Codex review of #840). false brings the card and the recheck back.
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
  // Silent for now (MXL.QUIET, Q332): no mxLost, so no card and no achievement taken back.
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
// A photo's difficulty: the sheet's rating (its genus's offset + its own residual, sheet v31) blended with the genus's
// offset as prior, weighing PDIFF.W answers (partial pooling: the photo keeps n / (n + W) of its own residual). A photo
// nobody has answered is its genus's offset; 0 with an older sheet. W 5: the real answer log scores 2 to 20 alike
// (docs/LEARNING.md "Hierarchical photo Elo").
// A judged photo (p.e, its ease 1-5: the fish photos, judged by an agent on judging/FISH.md's rubric while fish answers
// are not logged; Pierre, 2026-11-04) adds its own prior to its genus's: (PDIFF.MID - ease) x its subject's calibration
// ease (SUBJECTS calib, core.js calibOf), so ease 5 starts 1 below its unit, ease 1 one above. ease 0.5: one standard
// deviation of a photo's own difficulty around its genus (the hierarchical photo Elo study, docs/LEARNING.md), so the
// 5 steps span the spread real photos show. Like every
// prior it fades as answers come (PDIFF.W). A photo with no ease (every coral photo) is as before. docs/LEARNING.md
// "Fish photos judged". No wall (Pierre, 2026-11-06 14:17): every photo can be drawn from the first question; the prior
// and the aim make the easy ones far likelier at the start (until then an entry showed only its ease 4-5 photos before
// Open Water, easyFirst, 2026-11-04).
const PDIFF = {W: 5, MID: 3};
function photoDiff(n, p) {
  const prior = ((PGD[n] || [0])[0] || 0) + (p.e ? (PDIFF.MID - p.e) * calibOf(SUBJ).ease : 0),
    o = PSTAT[p.f];
  return o ? (o[1] * o[0] + PDIFF.W * prior) / (o[1] + PDIFF.W) : prior;
}
// Progress of a genus (2026-11-02, replaces Bayesian Knowledge Tracing): s.pg, a moving average of its answers, each
// weighed by what it proves (core.js PROG, pgStep, pgOf; docs/LEARNING.md "Progress (moving average) and mastery").
// Pierre: "a genus can't be confirmed as learned before it has been compared with the genera it gets confused with",
// and each next point should be harder to earn, with no hard cap. What a right answer proves, w from 0 to 1:
// - the plausible choices k (plausibleK: easy choices from other growth forms do not count): (1 − 1/k) / (1 − 1/4),
//   so 4 plausible choices weigh 1, 3 weigh 0.89, 2 weigh 0.67 (a 1 in 2 guess proves less);
// - its look-alikes: in full when a genus it gets confused with is among the choices (pooled over every player with the
//   declared look-alikes as prior, or the player's own mix-ups: the traps' rule), PROG.LOOK (0.5) when none is.
// So a right answer between 2 genera of different forms counts a third of one against 3 look-alikes. A miss weighs
// what it proves too (core.js pgMissW: in full on a photo at the player's level, less on a harder one), and a right
// answer on a photo the player knows only what memory does not explain (core.js pgMemW). Photo difficulty is left out of
// a right answer's weight: simulated as a third factor (0.5 on an easy photo to 1 on a hard one), it only slowed
// everyone (an expert mastered 5 genera in 1000 questions instead of 16), which A already sets, and the traps already
// come as the genus's photos get harder (both follow the Elo ability). The weights live in core.js (pgRightW, pgMissW,
// pgMemW, 2026-11-03) so the full replay of the answer log (core.js replayProgress) runs the same rules as the app.
// A typed answer (k infinite, TYPED) counts in full: every genus, its look-alikes included, was a possible answer
// (core.js pgRightW).
// pgLook: a genus the player gets confused with among the choices (the look-alike test, core.js scoreAnswer's look).
const pgLook = (t, chs) => chs.some(n => n !== t && GX(n) && (pooledConf(t, n) >= CONF.TRAP || confusable(t, n)));
function pgWeight(t, chs, k) {
  return pgRightW(k, pgLook(t, chs));
}
// Silent mastery exam (Pierre, 2026-11-01: "an ultimate test to go from 95% to 100%"). Its count (2/5) is shown nowhere:
// the genus's % creeping up, then falling back on a miss, keeps the mystery (Pierre). Once a genus reaches the exam's
// entry (core.js examOpen: the domain score at DOM.EX, a record not rebuilt yet s.pg at PROG.M),
// EXAM.n questions on it are slipped into the photo quiz, unannounced (a test on one genus alone would give the answer
// away), at least EXAM.gap other answers apart (recognition, not short-term memory; counted in answers, never time).
// Each is as hard as the game gets: one photo alone, never answered right before (else the least seen), the hardest
// of its view, the views taking turns (colony, close-up, corallites), 3 look-alike traps (examSet, quizPhoto). Every one
// right: the genus is mastered (s.mx), Learned, 100%. Any miss on the genus, in the exam or not, and any time the genus
// is given as the answer for another one, ends it (s.ex dropped); it starts again from 0 when the genus is back at the entry.
const EXAM = {n: 5, gap: 8};
// Typed questions (Pierre, 2026-11-03; docs/ROADMAP.md "Free-text answers"): the player types the genus instead of picking
// 1 of 4, recall rather than recognition, what an RA does in front of a colony. They come in progressively as the
// player's level on the genus rises, never as an on/off mode: a question on genus n is asked typed with the chance
// typedP(n), from its progress (genScore, the % shown): none below TYPED.from, then a straight line between the points
// TYPED.at ([progress, share]), flat after the last (core.js typedShare). Its mastery exam needs TYPED.exam typed right
// answers among its EXAM.n (examTyped). A typed answer has no guess rate (TYPED.k: the expected success has no 1/k
// floor; logged |t, which the sheet rates with no guess, Code.gs guess_ v27, core.js guessOf), so it counts as harder
// than picking 1 of 4: a right one moves the ability and the photos more, a miss less.
// Pierre's brief turned into numbers, simulated before release (docs/LEARNING.md "Typed questions"); to be adjusted on
// the players' own typed answers.
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
// The exam's entry: the bar at core.js examOpen and pair coverage (Q129, core.js looksLeft): the genus asked beside each
// of its declared look-alikes the player can be asked (the slate and the bonus genera turned on), either way, or mixed
// up with it. examLooks: those look-alikes, declared on either side as isLook reads them (Acropora lists Montipora,
// Montipora does not list Acropora: the pair is still one to compare); lookLeft: the ones not compared yet.
const examLooks = n => {
  const on = new Set([...slateGenera(), ...(typeof bonusList === 'function' ? bonusList() : [])]),
    own = (GX(n) || {}).look || [];
  return [...on].filter(x => x !== n && (own.includes(x) || ((GX(x) || {}).look || []).includes(n)));
};
const lookLeft = n => looksLeft(P, n, examLooks(n));
// And its confusion group met (Pierre, 2026-11-14, Q350 d): the exam opens once the unit's group partners that can open
// (matesLeft: in play, behind no gate) are met; an exam already under way (s.ex) goes on.
const examOn = n => {
  const s = P[n] || {};
  return !s.mx && examOpen(s, P, n) && !lookLeft(n).length && (!!s.ex || !matesLeft(n).length);
};
const examReady = n => examOn(n) && (!(P[n] || {}).ex || answersSoFar() - P[n].ex.at >= EXAM.gap);
// A learned genus stays learned through one miss and is lost on a second one before right answers bring it back up
// (core.js keepsMark: the domain score at DOM.KEEP or above, about one miss below the exam's entry; a record not rebuilt
// yet, s.pg at PROG.M × (1 − PROG.A)): losing it at once took learned genera away from a simulated expert at every slip
// (rule of code review #327: kept only while the genus stays known).
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
  return m;
}
// Progress of a genus, 0 to 1 (core.js scoreOf): the domain score up to 95% (barOf), each exam question passed fills a
// fifth of what is left, the passed exam makes it 100%.
const genScore = n => scoreOf(P[n], P, n); // the false-alarm correction reads the whole record (core.js faOf)
// Mastery levels (Pierre, 2026-11-03: "0/39 learned" for weeks was discouraging; named steps on the way, a diver's ladder
// every RA knows, one icon each): the step of a genus on the learning scale, from its % (genScore), the same colours on
// My progress. 0 not seen; 1 Snorkeler under 50%; 2 Open Water from 50%; 3 Advanced from 80%; 4 Divemaster from the
// mastery exam's entry (examOn: core.js examOpen, DOM.EX, 85%, 95% for a record not rebuilt yet, and pair coverage); 5
// Instructor, the exam passed (s.mx, "learned" in the code). The thresholds only name points on the % (Khan Academy's
// Familiar 50 / Proficient 80 / Mastered 100).
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
// From the sheet script that ranks the leaderboard by it (core.js SCORE_SHEET, sync.js sheetV; rule D4), so the
// leaderboard and My progress never show two scales; before, null (the families' mean, and the rules on it, as before).
const scoreOn = () => !!SUBJ.score && typeof sheetV === 'function' && sheetV() >= SCORE_SHEET;
const headScore = () => {
  const U = typeof UNITS === 'object' ? UNITS[SUBJ.id] : null,
    T = scoreOn() && U && U.tree ? U.tree() : null;
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
  // "Review" (since 2026-11-03, review item 8): shaky, the same chance x the draw weighs (drawW), under OPEN.P on an
  // average photo with 4 choices; it was "2 misses in the last 5", which the game's 80% target trips one time in four
  // at any level.
  if (shaky(n)) return ['weak', 'Review'];
  if (s.mx) return ['ok', 'Learned'];
  return ['mid', 'Learning'];
}
// What a player is shown (My progress, the genus sheet): "Review" (an amber dot) only once the genus has REVIEW_MIN
// answers, before that it is still being learned (beginner RA review, Pierre 2026-11-02: after a first session seven
// red "Review" tiles read as a list of failures). The game itself still gives such a genus more questions (level).
const REVIEW_MIN = 5;
const shownLevel = n => {
  const l = level(n),
    s = P[n] || {};
  return l[0] === 'weak' && (s.ok || 0) + (s.ko || 0) < REVIEW_MIN ? ['mid', 'Learning'] : l;
};

// Wrong choices get harder as the player gets better at the target genus (Pierre, 2026-11-01: "at the very start it must
// be simple", then traps appear little by little). How many of the 3 wrong choices are look-alikes of the target (IMR
// lecture or Coral Finder pairs, `look` both ways, then the confusion scores) comes from the genus's Elo ability on the
// format schedule (FORMAT, above): none on a genus's very first question (ability 0), one after the first right answer,
// all three after about 5, because look-alikes are how genera are learned (Pierre, 2026-11-01), rounded at random in
// between. A mistake drops the ability by about 0.5, so the choices ease off again. The other
// wrong choices are easy ones while traps are few: genera sharing no IMR growth form with the target (imrFormsOf),
// other IMR lecture groups first; once two traps are in, the last one is any genus (family first), as before.
const trapsFor = (t, shift = 0) => {
  const x = formatAt(ability(t) + shift)[0];
  return Math.floor(x) + (Math.random() < x % 1 ? 1 : 0);
};
// Confusion score of genus n beside target t (Pierre, 2026-11-01): how often players mix the two up when both are offered
// (every RA pooled, ?stats=1 conf), starting from a prior: the declared look-alikes (IMR lecture, Coral Finder) high, then
// the same family, then a shared growth form. With few answers the prior rules; with many, the real mix-ups do, so a pair
// nobody confuses fades and an undeclared pair players do confuse becomes a trap (core.js CONF, confScore).
const isLook = (t, n) => GX(t).look.includes(n) || GX(n).look.includes(t);
// Personal path (Pierre, 2026-11-01): the pooled score is then the prior for this player's own answers on the pair
// (core.js pairConf: offered together, mixed up), worth CONF.W offers, so the player's weight is offers / (offers + 8).
// A pair this player keeps mixing up becomes a trap and a duel for them, one they now tell apart fades back to the pool.
// Performance only, never time.
// The pair's score over every player (pooled answers on top of the declared prior), before this player's own record.
// confPrior: the prior of a pair, look the declared test (isLook here; the confusion groups' own, declared, above).
const confPrior = (t, n, look) =>
  look ? CONF.LOOK : GX(n).fam === GX(t).fam ? CONF.FAM : imrFormsOf(n).some(f => imrFormsOf(t).includes(f)) ? CONF.FORM : CONF.BASE;
function pooledConf(t, n) {
  return confScore(PCONF[t < n ? t + '|' + n : n + '|' + t], confPrior(t, n, isLook(t, n)));
}
function confOf(t, n) {
  return confScore(pairConf(P, t, n), pooledConf(t, n));
}
// Traps = the genera most confused with the target (a little shuffle among close scores, so every likely pair gets tried).
const confusable = (t, n) => confOf(t, n) >= CONF.TRAP;
// Known mix-ups (2026-11-04, Pierre; docs/LEARNING.md "Known mix-ups"): a question on t among choices that hold a genus
// this player mixes up with t more than everyone does is that much harder for them (core.js confGap, in logits: the
// player's own score of the pair against the pooled one; the most over the choices). The expected success, the Elo
// step, the progress and the photo's aim all take it, so the question is aimed easier and a miss there costs less: the
// signal the wrong pick's Elo step gave before #413, now on the pair, without stepping the genus wrongly given. Only on
// a question with 3 or more plausible choices (k): on the real answers a 2-choice contrast question of the pair (an
// Again, a duel, right after the side-by-side) or easy choices were right more often than expected, not less, and the
// term made the prediction worse there (log-loss +0.037 ± 0.009); with 3 or more it brought the expectation of those
// answers from 0.78 to 0.71, 0.67 right.
const confTerm = (t, chs, k) =>
  k >= 3 ? Math.max(0, ...chs.filter(n => n !== t && GX(n)).map(n => confGap(pairConf(P, t, n), pooledConf(t, n)))) : 0;
// Look-alikes from the data (2026-11-04, Pierre: "if the data says people constantly confuse two genera, they become
// look-alikes by force; that was the point of the confusion data": core.js dataLook): a pair no source declares, offered
// together CONF.N times or more and mixed up so often that its pooled score (pooledConf) reaches CONF.TRAP. Such pairs
// join the declared ones in the duels and the Again (quiz.js duelPick) and on the genus sheet's "Don't confuse with"
// (learn.js lookHub); the traps and the progress's look-alike weight already follow the same pooled score.
const isDataLook = (a, b) => {
  const c = PCONF[a < b ? a + '|' + b : b + '|' + a];
  return !!c && c[0] >= CONF.N && a !== b && !!GX(a) && !!GX(b) && !isLook(a, b) && dataLook(c, pooledConf(a, b));
};
// The pairs of the list L that are look-alikes from the data, each [A, B] in alphabetical order (the pooled pairs only:
// a pair never offered together cannot qualify).
const dataLooks = (L = [...slateGenera(), ...bonusList()]) =>
  Object.keys(PCONF)
    .map(k => k.split('|'))
    .filter(([a, b]) => L.includes(a) && L.includes(b) && isDataLook(a, b))
    .map(p => p.sort());
function distractors(t, list, traps = trapsFor(t), known = introduced) {
  // Choices of the target's rank only (app.js rankOf): a fish scientific genus among genera, an entry among entries.
  // A ranked unit (a fish genus) may name any unit of its rank (app.js rankUnits): the ones in play stay first among the
  // genera met, the others make up the three (Codex review #526: a family with one genus at Advanced had one choice).
  const rk = rankOf(t);
  list = list.filter(n => rankOf(n) === rk);
  if (rk) list = [...new Set([...list, ...rankUnits(rk)])];
  const ranked = list
    .filter(n => n !== t)
    .map(n => [n, confOf(t, n) * (0.8 + 0.4 * Math.random())])
    .sort((a, b) => b[1] - a[1])
    .map(x => x[0]);
  // A player who tells every look-alike apart (an expert) still gets the hardest choices the level asks for: the traps
  // left over come from the pairs other players confuse most, then the declared look-alikes, instead of easy genera
  // (Pierre, 2026-11-02: simulated, an expert's traps fell from 1.8 to 0.1 a question as their own record cleared them).
  // Traps only among the genera met (`known`): a look-alike never seen is no trap for a beginner, only a name to guess.
  const mine = ranked.filter(n => known(n) && confusable(t, n)),
    pooled = list
      .filter(n => n !== t && known(n) && !mine.includes(n) && pooledConf(t, n) >= CONF.TRAP)
      .sort((a, b) => pooledConf(t, b) - pooledConf(t, a)),
    look = [...mine, ...pooled],
    out = look.slice(0, traps),
    left = list.filter(n => n !== t && !look.includes(n));
  // Exactly `traps` traps when other genera met exist; genera never met only to make up the three.
  if (traps >= 2)
    return [...out, ...ranked.filter(n => known(n) && !look.includes(n)), ...look.slice(traps), ...ranked.filter(n => !known(n))].slice(
      0,
      3
    );
  const T = GX(t);
  const tf = imrFormsOf(t),
    apart = n => !imrFormsOf(n).some(f => tf.includes(f));
  const easy = left.filter(apart),
    far = easy.filter(n => GX(n).ig !== T.ig);
  // Easy choices spread over different growth forms too: three mushroom corals beside a massive target would give the
  // answer away as the odd one out.
  // Easy wrong choices come from genera the player has already met (`known`: on a card or asked) before any other, even
  // at the cost of the spread of forms: a beginner is not asked to choose between names never seen, and the first
  // questions stay among the genera of the first cards (Pierre, 2026-11-02).
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
      if (res.length >= 3 || res.includes(n) || (spread && imrFormsOf(n).some(f => used.has(f)))) return;
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
const plausibleK = (t, choices) => {
  const tf = imrFormsOf(t);
  return Math.max(2, choices.filter(n => n === t || confusable(t, n) || imrFormsOf(n).some(f => tf.includes(f))).length);
};
// Custom quiz (Pierre, 2026-11-03): the photo quiz limited to the genera the player picks (quiz.js quizCustom, planPhoto;
// docs/LEARNING.md "Custom quiz"). Everything else is the photo quiz's (photos, traps, typed questions, Again, duels,
// the comeback), but for the mastery exam, left to the photo quiz (rule L9: the selection may hold no look-alike); only
// the genus asked and the wrong choices change, and a question is scored with the look-alikes its choices really hold:
// - the selection in play (customOf): the genera saved (CUSTOM.KEY, synced like the other reefid-sync keys) that are in the
//   game now (pool: the slate, and the bonus genera when on), in the game's order; fewer than CUSTOM.MIN: no quiz;
// - the genus asked (customDraw): any selected genus, weighed as the photo quiz weighs the genera met (weight:
//   drawW, the exam's spacing, the last 4 held back); no opening path: the player chose them, so a
//   genus not met yet is asked at once, its first-meeting card shown with that question (quiz.js);
// - the wrong choices (customChoices): from the selection first, with the photo quiz's rules inside it (distractors:
//   traps by level among the pairs most confused, else easy genera of other growth forms, genera met first), so a
//   selected look-alike group drills itself; only a selection under 4 genera is topped up from the other genera in play,
//   with the traps the selection could not give.
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
  return [
    ...own,
    ...distractors(
      t,
      play.filter(n => !sel.includes(n)),
      Math.max(0, traps - got),
      known
    )
  ].slice(0, 3);
}
// The custom quiz's "My mix-ups" view (Pierre, 2026-11-03: "you usually know you make mistakes around these kinds of
// genera, so you go there"): the genera in play grouped by the player's own confusions, most confused first.
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
  // (Codex review #417: AD skipped while D could not join yet, then D joined through E: 37 instead of 45).
  C.forEach(c => (c.w = E.reduce((t, [a, b, w]) => t + (of.get(a) === c && of.get(b) === c ? w : 0), 0)));
  return C.sort((x, y) => y.w - x.w);
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
