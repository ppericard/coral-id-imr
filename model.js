// IMR Coral ID: the learning model, split out of app.js (2026-11-02, code review L1: one file per part, one piece at a
// time). Which genus comes next (weighted, the progressive opening OPEN, the easiest first), which photos (photoSet,
// PICKD, online calibration CAL), how hard they are (photoDiff, the sheet's PSTAT), the player's ability per genus (Elo,
// ELO, abilityStep), their progress (pgWeight, knownP; core.js PROG), the mastery exam (EXAM), and the wrong choices (TRAP, distractors,
// pooledConf). docs/LEARNING.md explains every rule. A classic script like app.js, loaded right after progress.js
// (index.html, in order); app.js waits for every script (window.BOOT) before its first page. Required like app.js.
// A quiz question shows the views of ONE colony: colony and closer views, the corallites as a hint (or one view alone).
// Continuous difficulty (Pierre, 2026-10-31; Elo as in Pelánek 2016 / Duolingo Birdbrain, no time criteria): every
// question draws from ALL the game photos of the genus, weighted by how close each photo's difficulty (photoDiff) is to
// the target for this player on this genus and this question's format (aimed so the question is right with the chance
// PICKD.P whatever its format: the difficulty controller, below). On top:
// photos never seen get a bonus (bigger when the player is doing well; IMR and Pierre's photos first), photos the player
// has already been shown weigh less the better they are remembered (photo memory, PMEM: x e^offset), the colony of the
// last 2 questions on the genus is held back, and at least 3 colonies stay in rotation (VARIETY) whatever the level, so
// a struggling player still sees new photos.
// Every photo of a question comes from one observation (same colony); views that colony lacks are simply not shown.
const PICKD = {P: 0.8, SIGMA: 0.7, VARIETY: 3, FLOOR: 0.05, SINGLE: 0.5};
// One difficulty controller (independent review of 2026-11-02, item 4, after Papousek, Pelanek & Stanislav 2014, who
// set the question's format so that the predicted success hits one target; 2026-11-03). Two steps, one target:
// 1. The format of a question on genus n comes from its ability on one schedule (FORMAT, below): how many of the 3 wrong
//    choices are look-alike traps (Pierre, 2026-11-01: they come in one by one and soon, as look-alikes are how genera
//    are learned), then more and more questions showing one view alone, so each view is learned on its own (rule 14);
//    typed questions (model.js TYPED, typedP) are the third lever, set by their own rule.
// 2. The photo then makes up the rest: aimed aimOff(k) below the ability (and PICKD.SINGLE lower for one view alone), so
//    that with the format's guess rate (1 in k plausible choices, plausibleK; none for a typed answer) the question is
//    right with the chance PICKD.P = 0.8 (about 80% right: the game's target since 2026-10-31). A 4-choice question is
//    aimed 1.01 below (TARGET_OFF 1.0 before, for every question), 3 plausible choices 0.81, 2 (easy choices, an Again,
//    a duel) 0.41, a typed one 1.39: before, a question with 2 plausible choices was right about 87% of the time on its
//    photo and a typed one 73%, so the target moved with the format. docs/LEARNING.md "One difficulty controller".
const aimOff = (k = 4) => {
  const x = (PICKD.P - 1 / k) / (1 - 1 / k);
  return Math.log(x / (1 - x));
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
// CAL.U: how unsure the difficulty of a photo nobody has answered is (variance, in difficulty units; its set only says
// Easy -1, Medium 0, Hard +1): the targeting is that much wider for it, narrowing as answers come (U / (1 + answers /
// CAL.N)), so a new photo is not kept away by a set placed by hand. Pierre, 2026-11-02: "relax the arbitrary thresholds
// so new photos come in, and their answers inform the dynamic algorithm".
const CAL = {B: 2, N: 2, RATE: 0.2, U: 1};
const nAnswers = p => {
  const o = PSTAT[p.f];
  return o ? (o[3] ?? o[1]) : 0;
};
const calBonus = p => 1 + CAL.B / (1 + nAnswers(p) / CAL.N);
const calSd = p => Math.sqrt(PICKD.SIGMA ** 2 + CAL.U / (1 + nAnswers(p) / CAL.N));
// skip: a photo file left out when the colony has others to show (the photo of the genus card just shown, K9).
// shift: added to the ability for this question (a comeback question after a break: ln R, comebackShift, below).
// k: the question's plausible choices (plausibleK; 2 for an Again or a duel, Infinity typed), so the photo is aimed for
// PICKD.P in that format (aimOff).
function photoSet(n, skip, shift = 0, k = 4) {
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
    [...gamePics(n, v, 'hard'), ...(two && v === 'macro' ? gamePics(n, 'medium', 'hard') : [])]
      .filter(ok(v))
      .filter(gameOk)
      .filter(p => p.f !== skip);
  // Only on a genus the player already holds (met, not shaky): a genus still being learned keeps whole colonies.
  // No calibration question in a comeback (shift): one unusual photo alone is not a restart.
  const calQ = !shift && level(n)[0] !== 'new' && !shaky(n) && Math.random() < CAL.RATE,
    single = calQ || Math.random() < singleP(n, shift),
    s = P[n] || {},
    seen = s.ps || {},
    ro = s.ro || [],
    tgt = ability(n) + shift - aimOff(k) - (single ? PICKD.SINGLE : 0);
  const h = [...recent(n).slice(-5)],
    hot = h.length ? h.filter(x => x === '1').length / h.length : 0.5;
  // off: extra difficulty when the colony only has one view, so the question will show it alone (SINGLE).
  const w = (p, off = 0) => {
    const x = (photoDiff(n, p) + off - tgt) / calSd(p),
      k = seen[p.f];
    let r = Math.exp((-x * x) / 2) * calBonus(p);
    // Spread the repeats (photo memory, Pierre 2026-11-03): a photo already shown weighs e^offset of its memory bucket
    // (core.js MEM, the sheet's estimate PMEM): the odds memory adds to a right answer on it, divided out. With the
    // offsets of 2026-11-03, about x 0.64 shown never right, x 0.33 right once, x 0.18 right twice or more (it was x 0.6
    // from right twice only). Soft: a genus whose photos are all known still shows them, the least remembered first.
    // It matters most in a genus with few photos, where repeats come soonest.
    if (!k) r *= (1 + 1.5 * hot) * (isCore(p) ? 1.3 : 1);
    else r *= Math.exp(PMEM[memBucket(k)]);
    return r;
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
  // All the photos of a question come from ONE observation (Pierre, 2026-11-01: zoom levels of different colonies shown
  // together read as one coral and teach a wrong picture). Beginners (several views) favour colonies photographed at
  // several zooms (cov squared); a colony with a single view becomes a single-view question, never topped up from another one.
  const score = k => {
    const o = obs[k],
      vs = (single ? need : shownV).filter(v => o[v]);
    if (!vs.length) return 0;
    const nv = need.filter(v => o[v]).length,
      off = !single && nv === 1 ? PICKD.SINGLE : 0,
      cov = nv / need.length;
    const m = vs.reduce((t, v) => t + Math.max(...o[v].map(p => w(p, off))), 0) / vs.length;
    return m * (calQ ? 1 : single ? cov : cov * cov) * (ro.includes(k) ? 0.15 : 1);
  };
  const sc = Object.fromEntries(keys.map(k => [k, score(k)])),
    top = Math.max(0, ...Object.values(sc));
  keys
    .filter(k => sc[k] > 0)
    .sort((a, b) => sc[b] - sc[a])
    .slice(0, PICKD.VARIETY)
    .forEach(k => {
      if (!ro.includes(k)) sc[k] = Math.max(sc[k], 0.5 * top);
    });
  keys.forEach(k => {
    if (sc[k] > 0) sc[k] = Math.max(sc[k], PICKD.FLOOR * top);
  });
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
    [...gamePics(n, v, 'hard'), ...(two && v === 'macro' ? gamePics(n, 'medium', 'hard') : [])]
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
// 2026-11-03): a question may open a genus (its card) when the path allows one (quiz.js planPhoto: at least INTRO.EVERY
// answers since the last card, no opening hold, not in the floor of a visit or a comeback), and then does with the
// chance openChance: the free share of OPEN.K places for genera met and still shaky (below), 1 - shaky / K. A slope,
// not a switch (Pierre, 2026-11-02: one genus more or less shaky never flips the pace), and a work-in-progress limit:
// with K shaky genera none opens until one holds. The genus opened is drawn among those not met yet (openPick): the
// easiest (genusDiff) first, softly (OPEN.T), and the most common near Dauin (Pierre, 2026-11-03: "easy and common
// first": core.js commonFactor of each genus's data.json cm, tools/commonness.py, relative to the median of the genera
// not met yet). It replaced a share of the genus draw given to the genera not met yet (OPEN.READY 35% with no shaky genus
// down to OPEN.TRICKLE 3% at K, K 10), a second throttle on top of INTRO.EVERY. K 8: simulated, a
// beginner meets genera at the pace they did, the RAs and an expert faster, learning as much (docs/LEARNING.md).
const OPEN = {K: 8, P: 0.6, T: 3, CONF: 2, DATA: 300};
// How much the easy-first order is trusted: the players' answers behind the photo ratings (weighed, sheet v17) over
// OPEN.DATA, up to 1. Without them the genus difficulty is only the photo sets and declared look-alikes, which put
// Acropora and Galaxea among the hardest and Alveopora first (Pierre expects the first two easy): the order then stays
// random until the answers can say (2026-11-02).
const easyTrust = () => Math.min(1, Object.values(PSTAT).reduce((t, o) => t + (o[1] || 0), 0) / OPEN.DATA);
// Difficulty of a genus from the data, never set by hand: the mean difficulty of its game photos (photoDiff: Pierre's
// Easy/Medium/Hard sets at first, the players' answers as they come, sheet v17) plus how much it gets confused (its two
// highest pooled confusion scores over CONF.TRAP, x OPEN.CONF). Cleared when the data or the photo stats change.
let GDIFF = {};
const genusDiff = n => {
  if (n in GDIFF) return GDIFF[n];
  const ps = [...new Set(VIEWS.flatMap(([v]) => gamePics(n, v, 'hard')))],
    pd = ps.length ? ps.reduce((t, p) => t + photoDiff(n, p), 0) / ps.length : 0,
    cs = slateGenera()
      .filter(x => x !== n)
      .map(x => pooledConf(n, x))
      .sort((a, b) => b - a)
      .slice(0, 2),
    cf = cs.length ? cs.reduce((a, x) => a + x, 0) / cs.length : 0;
  return (GDIFF[n] = Math.round((pd + OPEN.CONF * Math.max(0, cf - CONF.TRAP)) * 100) / 100);
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
  return ((s.ok || 0) + (s.ko || 0) > 0 || !!s.h) && !s.mx && 0.25 + 0.75 * sig(ability(n) - genusDiff(n)) < OPEN.P;
};
// The chance that a question the path allows to open a genus opens one: the free share of OPEN.K places for shaky genera.
// Only the genera open now take a place (introduced): a genus closed again by "One at a time" (introBack) keeps its
// answers and its ability but is never asked until its card reopens it, so counted it would hold the opening at 0 for
// good (Codex P1 on #408).
const openChance = list => Math.max(0, 1 - list.filter(n => introduced(n) && shaky(n)).length / OPEN.K);
// The genus to open among those not met yet (fresh): the easiest first, softly (OPEN.T, as far as the data are trusted:
// easyTrust), and the most common near Dauin (commonFactor). A ★ genus waits while a genus its card compares it to is in
// the list and not met (Pierre, 2026-11-03, #402; core.js starWaits: a reference not in the list never holds it back,
// and a reference never waits itself); should every genus left wait (not possible with today's data), they all open.
// met: the genera already met (introStart passes the cards drawn before it in the same batch as met too).
function openPick(fresh, list = fresh, met = introduced) {
  const ok = fresh.filter(n => !starWaits(DATA, n, list, met));
  if (ok.length) fresh = ok;
  const gd = fresh.map(genusDiff),
    lo = Math.min(...gd),
    tr = easyTrust(),
    cf = commonFactor(fresh.map(n => (GX(n) || {}).cm));
  return wpick(
    fresh.map((n, k) => [n, Math.exp(-OPEN.T * tr * (gd[k] - lo)) * cf[k]]),
    x => x[1]
  )[0];
}
// First meeting with a genus (Pierre, 2026-11-02, after the beginner RA review): a player starting from zero first meets
// INTRO.START genera on cards (name, cover photo, ID tips) and is asked about those; new genera then come one at a time,
// each on its card, and never as the answer of the question right after its card ("too easy"): a genus met on a single
// card can be asked from INTRO.GAP answers on, and a new card waits INTRO.EVERY answers after the last one (and while
// introHold, below). Which genus
// opens and when stays the progressive path's (weighted, OPEN): a draw that falls on a genus not met yet shows its card
// and asks about a genus already met. Kept on the device (imr-intro: genus -> [answers when shown, 1 if one of the
// first cards]); a genus already asked (another device, progress from before the cards) counts as met. Bonus genera
// (once on, app.js Q.bon) open the same way, on their own card. docs/LEARNING.md.
// OFFER: after a few dozen answers, a player whose overall level (Elo, P[LEVEL].th) is already high knows their corals
// (an RA after the lecture): a card offers to open all the genera at once (introOffer). Synced with the progress (the
// sheet keeps every imr-coral* key; sync.js introMerge).
const INTRO = {
  KEY: 'imr-coral-intro',
  START: 4,
  GAP: 2,
  EVERY: 2,
  HOLD: 1.5,
  SLACK: 0.1,
  OFFER: {KEY: 'imr-coral-intro-offer', AT: 50, UNTIL: 150, MET: 10, TH: 0.5}
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
// The bonus genera are not opened with them: they open one at a time once on (opt-in, app.js BONUS).
const introLeft = () => slateGenera().filter(n => !introduced(n));
// via: where the player opened them ('card' the first cards, 'progress' My progress, 'offer' the offer card), kept
// with the offer (which is then never made) for the admin's player journey.
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
// The offer to open all genera (Pierre, 2026-11-02: 10 answers on 4 genera are too few to decide; after about 50
// questions and some 10 genera met, a card says the player seems to know their corals and offers to open them all).
// Due once, between OFFER.AT and OFFER.UNTIL answers, with OFFER.MET slate genera met and a level of OFFER.TH or more:
// simulated at 50 answers, a beginner -0.9, an RA who knows 60% of the genera -0.2, 80% +0.8, an expert +1.2
// (docs/LEARNING.md). A card, not an automatic opening: "Not now" keeps one at a time; My progress still offers it.
const introOffer = () => {
  const a = answersSoFar(),
    O = INTRO.OFFER;
  return (
    a >= O.AT &&
    a <= O.UNTIL &&
    !store.get(O.KEY, null) &&
    introLeft().length > 0 &&
    slateGenera().filter(introduced).length >= O.MET &&
    ((P[LEVEL] || {}).th || 0) >= O.TH
  );
};
// Another device's cards (synced): a genus met there is met here too, and ready (its card was seen); the offer, once
// answered on one device, is not made again on another. Progress reset: the cards start over with it.
function introMerge(m, o) {
  try {
    m = JSON.parse(m || 'null');
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
const introReset = () => {
  INTROS = {};
  HOLDS = 0; // the opening hold starts over with the progress (holdStep, below; called after this file has run)
  store.set('imr-hold', 0);
  CB = {r: 0, t: 0, ok: 0, f: 0}; // and the comeback (below)
  store.set(COMEBACK.KEY, CB);
  store.set(INTRO.KEY, {});
  store.set(INTRO.OFFER.KEY, null);
};
// Opening held while the player does clearly worse than expected (Pierre, 2026-11-02, after an RA at 86% right met 9
// genera in 21 answers and dropped to 5 right in 10: "when many genera have just opened and the answers suddenly get
// worse, space the new ones; an expert keeps opening regularly"). A running sum of how far the answers fall below the
// success the game expected (each answer's e), never below 0: a CUSUM (Page 1954, the standard detector of a lasting
// drop), so a run of misses adds up however long it lasts, a spell of answers above expectation is not banked against
// a later drop, and right answers pay the debt back by what they beat the expectation by (an easy one, e 0.9, by 0.1).
// No new card while it is INTRO.HOLD or more. Kept on the device (imr-hold), so it carries from one visit to the next
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
const HOLDK = 'imr-hold';
let HOLDS = Number(store.get(HOLDK, 0)) || 0;
const introHold = () => HOLDS >= INTRO.HOLD;
// slack: the allowance an answer (INTRO.SLACK for the hold; the comeback's CUSUM passes the rust a question repairs).
const holdNext = (h, e, good, slack = INTRO.SLACK) =>
  Math.max(0, Math.round((h + (Number(e) || 0) - (good ? 1 : 0) - slack) * 1000) / 1000);
function holdStep(e, good) {
  HOLDS = holdNext(HOLDS, e, good);
  store.set(HOLDK, HOLDS);
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
  const reset = store.get('imr-coral-reset', '') || '',
    had = new Set(Array.isArray(ids) ? ids.map(String) : []);
  const x = (log || []).reduce(
    (t, a) => (a && !had.has(String(a.id)) && !HOLD_WARM.test(a.m || '') && String(a.t || '') > reset ? holdNext(t, a.e, a.ok) : t),
    Math.max(0, h)
  );
  if (x !== HOLDS) {
    HOLDS = x;
    store.set(HOLDK, HOLDS);
  }
}
const introSince = () => answersSoFar() - Math.max(-Infinity, ...Object.values(introMap()).map(e => e[0]));
// Comeback after a break (Pierre, 2026-11-02; replaces the fixed gentle restart, 10 easy questions at each visit). Time
// is used here and only here (AGENTS.md rule 12): to plan the questions after a break. Progress (s.pg), mastery (s.mx)
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
// Kept on the device (imr-comeback: r rust, t time accounted, ok right answers in it, f answers count until which no
// genus opens); the times per genus (s.at, last answer; s.dd, s.dl: days answered right, last one) are in the synced
// progress (core.js mergeProgress), the player's last answer in P[LEVEL].at.
const FSRS = {F: 19 / 81, C: -0.5, S0: 0.4, S1: 15.7, G: 2.5};
const SESSION = {GAP: 30 * 60000};
const COMEBACK = {KEY: 'imr-comeback', FLOOR: 10};
const DAY = 864e5;
let CB = (o => (o && typeof o === 'object' ? {r: +o.r || 0, t: +o.t || 0, ok: +o.ok || 0, f: +o.f || 0} : {r: 0, t: 0, ok: 0, f: 0}))(
  store.get(COMEBACK.KEY, null)
);
const cbSave = () => store.set(COMEBACK.KEY, CB);
const recallOf = (days, S) => (1 + (FSRS.F * Math.max(0, days)) / S) ** FSRS.C;
// The local calendar day of a time (days answered right, s.dd).
const dayNo = (t = Date.now()) => Math.floor((t - new Date(t).getTimezoneOffset() * 60000) / DAY);
function stability(n) {
  const s = P[n] || {},
    x = s.mx ? 1 : sig(ability(n) - genusDiff(n));
  return FSRS.S0 * (FSRS.S1 / FSRS.S0) ** x * FSRS.G ** Math.max(0, (s.dd || 1) - 1);
}
// The player's last answer (P[LEVEL].at, synced); progress saved before it existed: the last answer of the log kept on
// the device, if any.
const lastAt = () => {
  const a = (P[LEVEL] || {}).at;
  if (a) return a;
  let L = [];
  try {
    L = (typeof SYNC !== 'undefined' && SYNC && SYNC.log) || (typeof LOG0 !== 'undefined' && store.get(LOG0, [])) || [];
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
function nextTarget(list) {
  let n,
    k = 0;
  do {
    n = weighted(list);
  } while (n === last && list.length > 1 && ++k < 10);
  last = n;
  lastQs = [...lastQs, n].slice(-4);
  return n;
}
// Player ability per genus (s.th), on the same scale as photo difficulty (0 = average photo). Elo update after each
// answer, as in the sync sheet (Code.gs stats_): P(right) = g + (1 - g) * sigmoid(ability - difficulty), g = 1/choices;
// ability moves by K * (result - P(right)), K shrinking as answers build up (Pelánek 2016) but never below 0.25 so a
// genus that starts going wrong eases off quickly. Starts at 0 (target = the featured photos); no time criteria.
const ELO = {th0: 0, kmax: 0.8, kmin: 0.25, n: 15, lo: -1.5, hi: 3, vr: 0.1, vg: 2};
// Learners change (Pierre, 2026-11-02, three players: a complete beginner, an IMR RA after one lecture, an expert): a
// step that only shrinks with the answers suits a stable skill, and a simulated beginner or RA stayed rated as a beginner
// (easy photos, no traps) at 80-87% right. As Glicko-2's volatility (Glickman 2012): s.vr follows the recent surprise
// (result - expected, moving average, rate ELO.vr); while answers keep beating (or missing) the expectation, the step
// grows by up to ELO.vg x |s.vr|, within kmax, so the rating catches up; it settles back once the player is predictable.
// docs/LEARNING.md.
const RECENT = 10;
const recent = n => {
  const s = P[n] || {};
  return s.h ? s.h.slice(-RECENT) : '';
};
// Progress saved with the old Easy/Medium/Hard steps (s.lv) starts from the matching ability. A genus never answered
// starts from the player's global level (core.js playerStart: their abilities on the genera already answered), so a
// strong player gets traps, single views and harder photos on a new genus from its first question.
const ability = n => {
  const s = P[n] || {};
  return typeof s.th === 'number' ? s.th : s.lv ? ELO.th0 + Math.min(2, s.lv) : playerStart(P, n);
};
function abilityStep(n, s, good, d, k) {
  const th = ability(n),
    g = 1 / k,
    e = g + (1 - g) * sig(th - d),
    m = (s.ok || 0) + (s.ko || 0);
  s.vr = Math.round(((1 - ELO.vr) * (s.vr || 0) + ELO.vr * ((good ? 1 : 0) - e)) * 1000) / 1000;
  const K = Math.min(ELO.kmax, Math.max(ELO.kmin, ELO.kmax / (1 + m / ELO.n)) * (1 + ELO.vg * Math.abs(s.vr)));
  s.th = Math.round(Math.min(ELO.hi, Math.max(ELO.lo, th + K * ((good ? 1 : 0) - e))) * 100) / 100;
  delete s.lv;
  delete s.run;
}
// For My progress: where the genus's photo difficulty stands, and how many of its game photos the player has seen.
const photoBand = n => {
  const t = ability(n) - aimOff(4);
  return t < -0.5 ? 'easy' : t < 0.5 ? 'medium' : 'hard';
};
const seenOf = n => {
  const all = new Set(VIEWS.flatMap(([v]) => gamePics(n, v, 'hard').map(p => p.f))),
    ps = (P[n] || {}).ps || {};
  return `${[...all].filter(f => ps[f]).length} of ${all.size} seen`;
};
// Game set (Easy/Medium/Hard) of a photo of genus n, the prior of its difficulty; lecture or unlisted photos = Easy.
function photoLvl(n, p) {
  const sl = GX(n).sl || {};
  for (const v of Object.keys(sl)) for (let i = 2; i >= 0; i--) if ((sl[v][LEVELS[i][0]] || []).some(x => x.f === p.f)) return i;
  return 0;
}
// Photo difficulty (Elo): every RA's answers, rated by the sync sheet (?stats=1, tools/sync/Code.gs stats_). 0 = average
// photo, +1 = clearly harder. Few answers: pulled towards the photo's game set (Easy -1, Medium 0, Hard +1).
let PSTAT = (store.get('imr-photo-stats', {}) || {}).photos || {};
// Pairs of genera offered together and mixed up, every RA pooled (?stats=1 conf, sheet v10): see confOf.
let PCONF = (store.get('imr-photo-stats', {}) || {}).conf || {};
// Photo memory (Pierre, 2026-11-03; core.js MEM, sheet v26 ?stats=1 mem): how much easier a photo is for a player who
// has already been shown it (s.ps: [shown, right]), in logits off its difficulty, by bucket: new 0, shown never right,
// right once, right twice or more, estimated by the sheet from every trusted answer; the prior (the old fixed rule)
// with an older sheet or offline. famOf: the offset of the photos of a question, as the player knows them now.
let PMEM = memOf((store.get('imr-photo-stats', {}) || {}).mem);
// Progress saved before the photo memory, recalculated once and silently (Pierre, 2026-11-03: no pop-up, the bars move
// down 1-3 points; core.js memRecalc): every genus record not marked yet (s.pm), at load and after each pull of the
// synced progress (sync.js mergeSaved), and in quiz.js answer before a record's first answer. Saved and synced when it
// changed anything.
function memRecalcAll() {
  let ch = false;
  Object.keys(P).forEach(n => {
    if (n !== LEVEL && memRecalc(P[n], PMEM)) ch = true;
  });
  if (ch) save();
  return ch;
}
const famOf = (n, ph) => {
  const ps = (P[n] || {}).ps || {},
    hs = ph.map(p => ps[p.f]);
  return memFam(hs, PMEM);
};
const sig = x => 1 / (1 + Math.exp(-x));
function photoDiff(n, p) {
  const prior = photoLvl(n, p) - 1,
    o = PSTAT[p.f];
  return o ? (o[1] * o[0] + 5 * prior) / (o[1] + 5) : prior;
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
// what it proves too (pgMissW below: in full on a photo at the player's level, less on a harder one). Photo
// difficulty is left out of a right answer's weight: simulated as a third factor (0.5 on an easy photo to 1 on a hard
// one), it only slowed everyone (an expert mastered 5 genera in 1000 questions instead of 16), which A already sets, and the
// traps already come as the genus's photos get harder (both follow the Elo ability).
// A typed answer (k infinite, TYPED) counts in full: every genus, its look-alikes included, was a possible answer.
function pgWeight(t, chs, k) {
  const look = !isFinite(k) || chs.some(n => n !== t && GX(n) && (pooledConf(t, n) >= CONF.TRAP || confusable(t, n)));
  return Math.min(1, Math.max(0, (1 - 1 / k) / (1 - 1 / 4))) * (look ? 1 : PROG.LOOK);
}
// What a miss proves (Pierre, 2026-11-02: "a miss on a very hard photo doesn't necessarily mean the genus is badly
// known"; a miss must not cost more than it proves): the Elo chance the player had to get it right (ability th against
// the photo's difficulty d, k choices, as abilityStep), over the chance the game aims for (PICKD.P, 0.8, whatever the
// format: the difficulty controller). A photo at the player's level or easier: the miss counts in full; a
// harder one: less (1 unit harder: 0.78; 2 units: 0.56). No new constant: the Elo and the photo targeting set it.
// The right answers keep their weight (pgWeight): simulated, a photo factor on them only slowed everyone.
// R: the recall expected after a break, for a comeback question (comebackOf, below; 1 otherwise): the chance the player
// had is then the recall-adjusted one, so a miss the rust explains costs less progress (Pierre, 2026-11-02).
function pgMissW(th, d, k, R = 1) {
  const e = (x, r = 1) => 1 / k + (1 - 1 / k) * r * sig(x);
  return Math.min(1, e(th - d, R) / PICKD.P);
}
// What a right answer on a photo the player knows proves (Pierre, 2026-11-03): only what memory does not explain. The
// mirror of pgMissW (a ratio of chances, like it): the chance the player had on the same photos new over the chance
// they had with their memory of them (fam, famOf), at most 1: the share of such right answers that would have come
// without the memory. A new photo (fam 0) keeps its full weight: simulated, a photo-difficulty factor on every right
// answer only slowed everyone (pgWeight, above), so only the part memory explains is taken off. 4 choices, a photo at
// the game's target (ability 1 above it): x 0.93 shown never right, x 0.87 right once, x 0.84 right twice or more with
// the offsets of 2026-11-03. Tried first, the room for surprise left ((1 - chance with memory) / (1 - chance new): x 0.71
// / 0.41 / 0.23): simulated, it took a third to a half of the genera learned by question 600 and put the progress
// further below the truth than memory had put it above (docs/LEARNING.md "Photo memory").
function pgMemW(th, d, fam, k, R = 1) {
  const e = x => 1 / k + (1 - 1 / k) * R * sig(x);
  return fam >= 0 ? 1 : Math.min(1, e(th - d) / e(th - d - fam));
}
const knownP = n => pgOf(P[n]);
function pgObs(n, s, good, w) {
  s.pg = pgStep(knownP(n), good, w);
  delete s.L; // BKT's knowledge, before s.pg
}
// Silent mastery exam (Pierre, 2026-11-01: "an ultimate test to go from 95% to 100%"). Its count (2/5) is shown nowhere:
// the genus's % creeping up from 95%, then falling back on a miss, keeps the mystery (Pierre). Once a genus is at 95% (s.pg at PROG.M),
// EXAM.n questions on it are slipped into the photo quiz, unannounced (a test on one genus alone would give the answer
// away), at least EXAM.gap other answers apart (recognition, not short-term memory; counted in answers, never time).
// Each is as hard as the game gets: one photo alone, never answered right before (else the least seen), the hardest
// of its view, the views taking turns (colony, close-up, corallites), 3 look-alike traps (examSet, quizPhoto). Every one
// right: the genus is mastered (s.mx), Learned, 100%. Any miss on the genus, in the exam or not, and any time the genus
// is given as the answer for another one, ends it (s.ex dropped); it starts again from 0 when s.pg is back at PROG.M.
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
const examOn = n => {
  const s = P[n] || {};
  return !s.mx && knownP(n) >= PROG.M;
};
const examReady = n => examOn(n) && (!(P[n] || {}).ex || answersSoFar() - P[n].ex.at >= EXAM.gap);
// A learned genus stays learned through one miss (from PROG.M or above, a miss leaves s.pg at PROG.M × (1 − PROG.A) at
// least) and is lost on a second one before right answers bring it back up: with the moving average a single miss
// already takes 15% off, so losing it at once took learned genera away from a simulated expert at every slip (rule of
// code review #327: kept only while the genus stays known).
const mxKept = n => knownP(n) >= PROG.M * (1 - PROG.A) - 1e-6;
function missing(n) {
  const s = P[n] || {},
    m = [];
  if (s.mx) return m;
  if (knownP(n) < PROG.M)
    m.push(`more right answers, most of all against its look-alikes (about ${Math.round(100 * genScore(n))}% of the way so far)`);
  else
    m.push(
      `the mastery exam: ${EXAM.n} hard questions on it, slipped unannounced into the photo quiz, all right, at least ${TYPED.exam} of them typed from memory`
    );
  return m;
}
// Progress of a genus, 0 to 1 (core.js scoreOf): s.pg fills 95% on its way to PROG.M, each exam question passed adds
// 1%, the passed exam makes it 100%.
const genScore = n => scoreOf(P[n]);
// Mastery levels (Pierre, 2026-11-03: "0/39 learned" for weeks was discouraging; named steps on the way, a diver's ladder
// every RA knows, one icon each): the step of a genus on the learning scale, from its % (genScore), the same colours on
// My progress. 0 not seen; 1 Snorkeler under 50%; 2 Open Water from 50%; 3 Advanced from 80%; 4 Divemaster from 95%
// (the mastery exam's entry); 5 Instructor, the exam passed (s.mx, "learned" in the code). The thresholds only name
// points on the % (Khan Academy's Familiar 50 / Proficient 80 / Mastered 100); the game itself never reads them.
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
const LV_AT = [0.5, 0.8, 0.95]; // Open Water, Advanced, Divemaster
const lvStep = n => {
  const k = level(n)[0];
  if (k === 'new') return 0;
  if (k === 'ok') return 5;
  const g = genScore(n) + 1e-9; // genScore gives 0.95 exactly at the exam's entry
  return 1 + LV_AT.filter(x => g >= x).length;
};
// The icon of a level (24 px grid, 1.75 stroke, currentColor: the app's icon set), with its name for screen readers.
const lvIcon = (k, cls = 'lvi') =>
  MASTERY[k][1]
    ? `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${MASTERY[k][0]}">${MASTERY[k][1]}</svg>`
    : '';
const progPct = (L = slateGenera()) => Math.round((100 * L.reduce((t, n) => t + genScore(n), 0)) / L.length);
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
const trapsFor = t => {
  const x = formatAt(ability(t))[0];
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
function pooledConf(t, n) {
  const prior = isLook(t, n)
    ? CONF.LOOK
    : GX(n).fam === GX(t).fam
      ? CONF.FAM
      : imrFormsOf(n).some(f => imrFormsOf(t).includes(f))
        ? CONF.FORM
        : CONF.BASE;
  return confScore(PCONF[t < n ? t + '|' + n : n + '|' + t], prior);
}
function confOf(t, n) {
  return confScore(pairConf(P, t, n), pooledConf(t, n));
}
// Traps = the genera most confused with the target (a little shuffle among close scores, so every likely pair gets tried).
const confusable = (t, n) => confOf(t, n) >= CONF.TRAP;
function distractors(t, list, traps = trapsFor(t), known = introduced) {
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
// Once the whole file is in (save, LEVEL and PMEM above): the progress saved before the photo memory, recalculated.
memRecalcAll();
