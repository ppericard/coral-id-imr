// IMR Coral ID: the learning model, split out of app.js (2026-11-02, code review L1: one file per part, one piece at a
// time). Which genus comes next (weighted, the progressive opening OPEN, the easiest first), which photos (photoSet,
// PICKD, online calibration CAL), how hard they are (photoDiff, the sheet's PSTAT), the player's ability per genus (Elo,
// ELO, abilityStep), their progress (pgWeight, knownP; core.js PROG), the mastery exam (EXAM), and the wrong choices (TRAP, distractors,
// pooledConf). docs/LEARNING.md explains every rule. A classic script like app.js, loaded right after progress.js
// (index.html, in order); app.js waits for every script (window.BOOT) before its first page. Required like app.js.
// A quiz question shows the views of ONE colony: colony and closer views, the corallites as a hint (or one view alone).
// Continuous difficulty (Pierre, 2026-10-31; Elo as in Pelánek 2016 / Duolingo Birdbrain, no time criteria): every
// question draws from ALL the game photos of the genus, weighted by how close each photo's difficulty (photoDiff) is to
// the target for this player on this genus (ability(n) - TARGET_OFF, about 80% right in a 4-choice question). On top:
// photos never seen get a bonus (bigger when the player is doing well; IMR and Pierre's photos first), photos already
// answered right twice weigh less (they may be memorised), the colony of the last 2 questions on the genus is held back,
// and at least 3 colonies stay in rotation (VARIETY) whatever the level, so a struggling player still sees new photos.
// Every photo of a question comes from one observation (same colony); views that colony lacks are simply not shown.
const PICKD = {TARGET_OFF: 1.0, SIGMA: 0.7, VARIETY: 3, FLOOR: 0.05, SINGLE: 0.5};
// One zoom level per question (Pierre, 2026-10-31): beginners get every view of the colony (lots of information); as
// the player's level on the genus rises, more and more questions show a single view (colony, closer or corallites
// alone), up to 85% of them, so each view is learned on its own and each photo's difficulty is measured on its own.
// A single view counts as harder (SINGLE), so easier photos are picked for it. The other views show after the answer.
const singleP = n => Math.min(0.85, Math.max(0, (ability(n) - 0.5) / 1.5));
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
function photoSet(n, skip) {
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
  const gameOk = p => !g.x || p.own || !p.gid;
  const pics = v =>
    [...gamePics(n, v, 'hard'), ...(two && v === 'macro' ? gamePics(n, 'medium', 'hard') : [])]
      .filter(ok(v))
      .filter(gameOk)
      .filter(p => p.f !== skip);
  // Only on a genus the player already holds (met, not shaky): a genus still being learned keeps whole colonies.
  const calQ = level(n)[0] !== 'new' && !shaky(n) && Math.random() < CAL.RATE,
    single = calQ || Math.random() < singleP(n),
    s = P[n] || {},
    seen = s.ps || {},
    ro = s.ro || [],
    tgt = ability(n) - PICKD.TARGET_OFF - (single ? PICKD.SINGLE : 0);
  const h = [...recent(n).slice(-5)],
    hot = h.length ? h.filter(x => x === '1').length / h.length : 0.5;
  // off: extra difficulty when the colony only has one view, so the question will show it alone (SINGLE).
  const w = (p, off = 0) => {
    const x = (photoDiff(n, p) + off - tgt) / calSd(p),
      k = seen[p.f];
    let r = Math.exp((-x * x) / 2) * calBonus(p);
    if (!k) r *= (1 + 1.5 * hot) * (isCore(p) ? 1.3 : 1);
    else if (k[1] >= 2) r *= 0.6;
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
    gameOk = p => (!g.x || p.own || !p.gid) && !p.multi;
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
// Weight by status and by how far the genus still is from its exam (1 - progress s.pg): review 3-5, learning 1-4,
// learned 0.25 (unseen 10, so every genus comes up early). A genus asked in the last 4 questions is mostly held back so the work spreads across genera.
let lastQs = [];
const weight = n => {
  const lv = level(n)[0],
    u = 1 - knownP(n),
    w0 = lv === 'new' ? 10 : lv === 'ok' ? 0.25 : lv === 'weak' ? 3 + 2 * u : 1 + 3 * u,
    // Bonus genera (off the IMR list) weigh at most as a genus being learned, even new or to review (Pierre, 2026-11-01:
    // a burst of bonus questions after unlocking some).
    w1 = isBonus(n) ? Math.min(w0, BONUS_W) : w0,
    // The mastery exam: a genus ready for its next exam question comes up as one to review; between two of them, it waits.
    w = examOn(n) ? (examReady(n) ? Math.max(w1, 3) : w1 * 0.05) : w1;
  return lastQs.includes(n) ? w * 0.1 : w;
};
// ...and all of them together at most BONUS_SHARE of the draw: their weights are scaled down when they would be more.
const BONUS_W = 4,
  BONUS_SHARE = 0.15;
// Progressive path (Pierre, 2026-11-02: "rather than spamming a beginner with 40 genera, start with the easiest ones,
// opening new ones as they go, with nothing set by hand"). New genera are opened by the player's own results: the
// genera not met yet share OPEN.READY of the draw with no genus met still shaky (below), down in a straight line to
// OPEN.TRICKLE at OPEN.K shaky or more (a share, so the pace holds as the genera met add up; a slope, not a switch,
// so a genus more or less shaky never flips the pace: Pierre, 2026-11-02).
// Among them, the easiest (genusDiff) come first, softly (OPEN.T): a beginner meets a few easy genera at a time, an
// expert keeps opening new ones because none stays shaky. docs/LEARNING.md.
// K 5 (was 3; Pierre, 2026-11-02: genera should open a little more easily, ~25 of 39 met by an RA after 600 questions
// was too few): simulated, an RA meets 33-39 after 600 questions, a beginner still 9-14 after 100 (docs/LEARNING.md).
// K 6 with the first-meeting cards (INTRO): the choices are now genera met, so a wrong answer no longer opens a genus
// never asked (it used to, for about a third of the genera met); simulated, an RA asked 28-35 genera after 600
// questions, a beginner 12-15 after 100 (K 5: 24; K 8: a beginner 17-18 after 100).
// K 10 with the slope: over 6 seeds, genera met after 100 questions, a beginner 13.2 +- 1.5 (the switch: 13.0 +- 2.9), a
// lecture-level RA 17.3 +- 3.2 and 29 by question 300 (the switch: 24), an expert 24.8 +- 3.1; K 12 opened 16-19 to a
// beginner at 72% right (docs/LEARNING.md).
const OPEN = {K: 10, P: 0.6, READY: 0.35, TRICKLE: 0.03, T: 3, CONF: 2, DATA: 300};
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
    cs = Object.keys(DATA.gen)
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
  return level(n)[0] !== 'new' && !s.mx && 0.25 + 0.75 * sig(ability(n) - genusDiff(n)) < OPEN.P;
};
// First meeting with a genus (Pierre, 2026-11-02, after the beginner RA review): a player starting from zero first meets
// INTRO.START genera on cards (name, cover photo, ID tips) and is asked about those; new genera then come one at a time,
// each on its card, and never as the answer of the question right after its card ("too easy"): a genus met on a single
// card can be asked from INTRO.GAP answers on, and a new card waits INTRO.EVERY answers after the last one (and while
// introHold, below). Which genus
// opens and when stays the progressive path's (weighted, OPEN): a draw that falls on a genus not met yet shows its card
// and asks about a genus already met. Kept on the device (imr-intro: genus -> [answers when shown, 1 if one of the
// first cards]); a genus already asked (another device, progress from before the cards) or a bonus genus (its own unlock
// card) counts as met. docs/LEARNING.md.
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
const introduced = n => isBonus(n) || asked(n) || n in introMap();
const introReady = n => {
  if (isBonus(n) || asked(n)) return true;
  const e = introMap()[n];
  return !!e && (!!e[1] || answersSoFar() >= e[0] + INTRO.GAP);
};
// "I've had the IMR lecture" (Pierre, 2026-11-02): an RA has seen every genus in the lecture and has little time, so
// one card at a time would hold them back. On the first cards and in My progress, one tap opens every slate genus at
// once, without cards: the draw then asks first the genera never asked (weight 10), choices from the whole slate.
const introLeft = () => Object.keys(DATA.gen).filter(n => !introduced(n));
// via: where the player opened them ('card' the first cards, 'progress' My progress, 'offer' the offer card), kept
// with the offer (which is then never made) for the admin's player journey.
const introAll = via => {
  introAdd(introLeft(), true, 'a');
  store.set(INTRO.OFFER.KEY, {at: answersSoFar(), open: 1, via, t: Date.now()});
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
    Object.keys(DATA.gen).filter(introduced).length >= O.MET &&
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
    Object.entries(m).forEach(([n, e]) => {
      if (Array.isArray(e) && !L[n]) ch = L[n] = [e[0] || 0, 1, e[2] || 0, e[3] || (e[1] ? 's' : 'c')];
    });
    if (ch) store.set(INTRO.KEY, L);
  }
  // The latest decision wins (its time t): declined on one device, then Open all on another, must not go back to the
  // decline at the next sync (Codex review #352). Without times (older), the one already here stays.
  const here = store.get(INTRO.OFFER.KEY, null);
  if (o && typeof o === 'object' && (!here || (o.t || 0) > (here.t || 0))) store.set(INTRO.OFFER.KEY, o);
}
const introReset = () => {
  INTROS = {};
  HOLDS = 0; // the opening hold starts over with the progress (holdStep, below; called after this file has run)
  store.set('imr-hold', 0);
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
// the sync sheet from all their answers (holdSync, below); cleared with the progress (reset, sign-out). The gentle
// restart's questions do not count (quiz.js WARM). A sliding window of the last 10 answers was tried first: it forgot
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
const holdNext = (h, e, good) => Math.max(0, Math.round((h + (Number(e) || 0) - (good ? 1 : 0) - INTRO.SLACK) * 1000) / 1000);
function holdStep(e, good) {
  HOLDS = holdNext(HOLDS, e, good);
  store.set(HOLDK, HOLDS);
}
// Synced (sheet v23, Pierre 2026-11-02: the hold follows a signed-in player from one device to another, and is rebuilt
// from the answers given before it existed). Each load of the saved progress (sync.js mergeSaved) brings h, the same sum
// over every answer the sheet has logged for the player since their last reset (Code.gs hold_, gentle-restart answers
// left out: logged with |w). The answers of this device the sheet has not confirmed yet (log) are added on top, and
// that is the hold: the same sum over the same answers on every device, so right answers on one device pay back a hold
// started on another (on a single device it equals the device's own sum). An older sheet sends no h: the hold stays
// this device's. Not signed in: this device's only.
const HOLD_WARM = /\|w(\||$)/; // the mode of a gentle-restart answer (quiz.js answer)
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
function weighted(list) {
  const w = list.map(weight);
  // Not met yet: the genera with no card shown and never asked (a genus met on its card weighs as a new one, 10).
  const fresh = list.map((n, i) => [n, i]).filter(([n]) => !introduced(n));
  if (fresh.length) {
    // A slope rather than a switch (Pierre, 2026-11-02): READY with no shaky genus met, down to TRICKLE at K or more.
    const share = OPEN.TRICKLE + (OPEN.READY - OPEN.TRICKLE) * Math.max(0, 1 - list.filter(shaky).length / OPEN.K),
      rest = w.reduce((a, x, i) => a + (introduced(list[i]) ? x : 0), 0),
      tot = rest ? (share * rest) / (1 - share) : 1,
      gd = fresh.map(([n]) => genusDiff(n)),
      lo = Math.min(...gd),
      tr = easyTrust(),
      e = gd.map(x => Math.exp(-OPEN.T * tr * (x - lo))),
      se = e.reduce((a, x) => a + x, 0);
    fresh.forEach(([n, i], k) => (w[i] = ((tot * e[k]) / se) * (isBonus(n) ? Math.min(1, BONUS_W / 10) : 1)));
  }
  // Bonus share from the weights as they now stand (Codex review #340: the totals taken before the progressive path's
  // rescaling let a bonus genus take ~45% of the draws).
  const b = list.reduce((s, n, i) => s + (isBonus(n) ? w[i] : 0), 0),
    o = w.reduce((a, x) => a + x, 0) - b;
  if (b && o && b / (b + o) > BONUS_SHARE) {
    const f = (BONUS_SHARE * o) / ((1 - BONUS_SHARE) * b);
    list.forEach((n, i) => isBonus(n) && (w[i] *= f));
  }
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
const misses = h => [...h].filter(x => x === '0').length;
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
  const t = ability(n) - PICKD.TARGET_OFF;
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
function pgWeight(t, chs, k) {
  const look = chs.some(n => n !== t && GX(n) && (pooledConf(t, n) >= CONF.TRAP || confusable(t, n)));
  return Math.min(1, Math.max(0, (1 - 1 / k) / (1 - 1 / 4))) * (look ? 1 : PROG.LOOK);
}
// What a miss proves (Pierre, 2026-11-02: "a miss on a very hard photo doesn't necessarily mean the genus is badly
// known"; a miss must not cost more than it proves): the Elo chance the player had to get it right (ability th against
// the photo's difficulty d, k choices, as abilityStep), over the chance the game aims for (a photo PICKD.TARGET_OFF
// below the ability, about 80% with 4 choices). A photo at the player's level or easier: the miss counts in full; a
// harder one: less (1 unit harder: 0.78; 2 units: 0.56). No new constant: the Elo and the photo targeting set it.
// The right answers keep their weight (pgWeight): simulated, a photo factor on them only slowed everyone.
function pgMissW(th, d, k) {
  const e = x => 1 / k + (1 - 1 / k) * sig(x);
  return Math.min(1, e(th - d) / e(PICKD.TARGET_OFF));
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
  else m.push(`the mastery exam: ${EXAM.n} hard questions on it, slipped unannounced into the photo quiz, all right`);
  return m;
}
// Progress of a genus, 0 to 1 (core.js scoreOf): s.pg fills 95% on its way to PROG.M, each exam question passed adds
// 1%, the passed exam makes it 100%.
const genScore = n => scoreOf(P[n]);
// Step of a genus on the learning scale: 0 not seen, 1-4 quarters of genScore, 5 learned (My progress colours).
const lvStep = n => {
  const k = level(n)[0];
  return k === 'new' ? 0 : k === 'ok' ? 5 : 1 + Math.min(3, Math.floor(4 * genScore(n)));
};
const progPct = (L = Object.keys(DATA.gen)) => Math.round((100 * L.reduce((t, n) => t + genScore(n), 0)) / L.length);
function level(n) {
  const s = P[n];
  if (!s || (s.ok + s.ko === 0 && !s.h)) return ['new', 'Not seen'];
  if (misses(recent(n).slice(-5)) >= 2) return ['weak', 'Review'];
  if (s.mx) return ['ok', 'Learned'];
  return ['mid', 'Learning'];
}
// What a player is shown (My progress, the genus sheet): "Review" (red, with "!") only once the genus has REVIEW_MIN
// answers, before that it is still being learned (beginner RA review, Pierre 2026-11-02: after a first session seven
// red "Review" tiles read as a list of failures). The game itself still gives such a genus more questions (level).
const REVIEW_MIN = 5;
const shownLevel = n => {
  const l = level(n),
    s = P[n] || {};
  return l[0] === 'weak' && (s.ok || 0) + (s.ko || 0) < REVIEW_MIN ? ['mid', 'Learning'] : l;
};

// Wrong choices get harder as the player gets better at the target genus (Pierre, 2026-11-01: "at the very start it must
// be simple", then traps appear little by little). TRAP gives how many of the 3 wrong choices are look-alikes of the
// target (IMR lecture or Coral Finder pairs, `look` both ways), from the genus's Elo ability: none on a genus's very first
// question (ability 0), then they come in fast because look-alikes are how genera are learned (Pierre, 2026-11-01): one
// from 0.18 (after the first right answer), two from 0.36, all three from 0.54 (about 5 right answers), rounded at random
// in between. A mistake drops the ability by about 0.5, so the choices ease off again. The other
// wrong choices are easy ones while traps are few: genera sharing no IMR growth form with the target (imrFormsOf),
// other IMR lecture groups first; once two traps are in, the last one is any genus (family first), as before.
const TRAP = {start: 0, step: 0.18};
const trapsFor = t => {
  const x = Math.min(3, Math.max(0, (ability(t) - TRAP.start) / TRAP.step));
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
// Elo and the progress count a guess as 1 in (target + the plausible wrong choices) while traps are few (0 or 1): easy choices from
// other growth forms are not plausible, so such a question is scored as a 2- or 3-choice one (a right answer there proves
// less). From 2 traps on, every choice counts, as before.
const plausibleK = (t, choices) => {
  const tf = imrFormsOf(t);
  return Math.max(2, choices.filter(n => n === t || confusable(t, n) || imrFormsOf(n).some(f => tf.includes(f))).length);
};
