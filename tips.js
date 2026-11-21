// "Did you know?" tips: a reminder that a feature exists, for the players who never or hardly ever used it; once a
// player has used it several times, how often is their preference. The registry (TIPS) and the pure rules that pick a
// tip at a break; quiz.js
// counts the uses (tipNote, tipZoomed), arms the break at Next (breakArm) and shows the card (tipShow, cardShow kind
// 'tip'). No DOM here: loaded with the quiz (index.html tier 2) and tested in Node (tests/tips.test.js). Rules and the
// state: docs/ARCHITECTURE.md "Did you know? tips"; the card: docs/DESIGN.md "Cards".
//
// State, on this device only (localStorage reefid-tips, outside the reefid-sync-* progress keys, kept on sign-out like
// reefid-zoomhint): what a tip targets is how this person uses this device, and a tip shown twice on two devices is no harm.
//   u  usage counters: q game questions answered here (photo quiz, custom quiz, duels), z quiz photos enlarged here (on
//      a question or its mix-up montage; a tip's own "Show me" is not counted), c times the Custom quiz was opened here
//      (its picking page or its quiz, quiz.js quizCustom; the log cannot tell its answers from the Quiz's), d times the Duel
//      tab was opened here (quiz.js quizDuel; a Duel tab answer in the device's log folds in as one, tipsLoad), m times the
//      Custom quiz's My mix-ups view was drawn here (quiz.js viewCustom; a saved choice of that view folds in as one,
//      tipsLoad). Seeded once, when the state is first made,
//      from the answers the device still holds (LOG0 / SYNC.log: their count and their zm flags), so a player who has
//      played here before is not counted from zero; a signed-in device holds only its unsent answers, so it starts low.
//   s  per tip, the value of u.q at each showing: {zoom: [212, 318]}
//   v  the visit: {t: time of its last answer, n: answers in it, tip: 1 once a tip showed in it}. A gap of TIPR.GAP (30
//      minutes, as model.js SESSION.GAP) starts a new one; a reload does not.
// A tip in TIPS: id; ctx, the games whose break at Next may show it (the hash before any "|"); target(u, b), who it is
// for, on the counters (and, for the one whose audience is the player's own record, on b); from, the u.q from which it
// can first show; now(b), its preferred moment at a break (b: {ctx, miss, zm, mix: the pairs of units the player mixed up
// TIPR.MIX times or more, counted by quiz.js only while a tip needs it}); wait, how many more questions it waits for that moment before any break will do; max showings ever and every,
// the questions between two; card (kick, title(o) and body(o), o: {mouse, subj: the SUBJECTS record on screen}), the text of its card; act, its "Show me" action
// (quiz.js TIP_ACT), or none.
(function (root) {
  // Global rules: at most one tip a visit, never in its first FLOOR answers (plus, in quiz.js: one card a break, within
  // the prompt spacing, never over another card, the tour or a toast).
  // MIX: how many times a pair must have been mixed up (both ways added, as the My mix-ups view weighs it) to count.
  const TIPR = {KEY: 'reefid-tips', GAP: 30 * 60000, FLOOR: 10, MIX: 3};
  const TIPS = [
    {
      // Photo enlargement (in the early logged answers one player enlarged a quiz photo on ~20-25% of questions, the
      // others 12%, 2%, 2% and 0% of 131). For a player with 20 questions or more here and at most 2
      // photos enlarged ever; best right after a miss on a photo they did not enlarge (when a closer look would have
      // helped), else at any break from 20 questions later (40 for the first). Twice at most, the second 100 questions
      // after the first, and never once they have enlarged 3 photos.
      id: 'zoom',
      ctx: ['quiz', 'quiz-custom', 'quiz-duel'],
      target: u => u.z <= 2,
      from: 20,
      now: b => !!b.miss && !b.zm,
      wait: 20,
      max: 2,
      every: 100,
      card: {
        kick: 'Did you know?',
        title: o => `${o && o.mouse ? 'Click' : 'Tap'} a photo to see it bigger`,
        // What to look at closely is the subject's (o.subj: the core.js SUBJECTS record on screen, its zoom field).
        body: o => `It opens full screen: zoom in on ${(o && o.subj && o.subj.zoom) || 'the details'}.`
      },
      act: 'zoom'
    },
    {
      // Custom quiz (a): the Quiz that asks only the genera the player picks. For a player with 100 questions or more
      // here who never opened it (c counts its opens; a saved selection counts as one, quiz.js tipsLoad). Shown in the
      // Quiz only, at any break from 100 questions (no better moment); twice at most, the second 150 questions after
      // the first. Show me opens the Custom quiz's picking page.
      id: 'custom',
      ctx: ['quiz'],
      target: u => u.c < 1,
      from: 100,
      now: () => true,
      wait: 0,
      max: 2,
      every: 150,
      card: {
        kick: 'Did you know?',
        // The words of the subject (o.subj: its many field), as the Custom quiz page says them.
        title: o => `Quiz yourself on just the ${(o && o.subj && o.subj.many) || 'genera'} you pick`,
        body: o =>
          `The Custom quiz asks only the ${(o && o.subj && o.subj.many) || 'genera'} you choose. Quick picks choose for you: your weakest, or those you missed lately.`
      },
      act: 'custom'
    },
    {
      // Look-alike duels (b): the Duel tab, two look-alikes side by side, the player's own mix-ups first. For a player
      // with 150 questions or more here who never opened it (d counts its opens; a duel of the Duel tab in the device's
      // log folds in as one, quiz.js tipsLoad). Mix-ups are on record by then (every player of the answer log with that
      // many answers had missed some; the pairs missed 3 times or more ran 1 to 18). Shown in the Quiz only; best right
      // after a miss (a mix-up just made), else at any break from 20 questions later; twice at most, the second 150
      // questions after the first, after the zoom and Custom quiz tips when several are due. Show me opens the Duel tab.
      id: 'duels',
      ctx: ['quiz'],
      target: u => u.d < 1,
      from: 150,
      now: b => !!b.miss,
      wait: 20,
      max: 2,
      every: 150,
      card: {
        kick: 'Did you know?',
        // The words of the subject (o.subj: its many field), as the Duel tab says them (app.js: Look-alike duels).
        title: o => `Practise the ${(o && o.subj && o.subj.many) || 'genera'} you mix up`,
        body: o =>
          `Look-alike duels show photos of one of two look-alike ${(o && o.subj && o.subj.many) || 'genera'} and ask which one it is. The ones you still mix up come up most.`
      },
      act: 'duels'
    },
    {
      // My mix-ups (c): the Custom quiz's view that groups the genera the player confuses with each other, the most
      // confused first. For a player with 100 questions or more here, with several pairs (2 or more) mixed up TIPR.MIX
      // times or more (b.mix, from the player's own record), who never saw that view (m counts its draws; a saved
      // choice of it folds in as one, quiz.js tipsLoad). Shown in the Quiz and the Custom quiz; best right after a miss
      // (a mix-up just made), else at any break from 20 questions later; twice at most, the second 150 questions after
      // the first, after the zoom, Custom quiz and duels tips when several are due. Show me opens the Custom quiz's
      // picking page on that view. (My progress's "Your tricky pairs" shows itself, with no page to open: no tip.)
      id: 'mixups',
      ctx: ['quiz', 'quiz-custom'],
      target: (u, b) => u.m < 1 && ((b && b.mix) || 0) >= 2,
      from: 100,
      now: b => !!b.miss,
      wait: 20,
      max: 2,
      every: 150,
      card: {
        kick: 'Did you know?',
        // The words of the subject (o.subj: its many field), as the Custom quiz page says them (quiz.js viewCustom).
        title: () => 'Quiz yourself on your mix-ups',
        body: o =>
          `The Custom quiz's My mix-ups view groups the ${(o && o.subj && o.subj.many) || 'genera'} you confuse with each other, the most confused first. ${o && o.mouse ? 'Click' : 'Tap'} All on a group, then Start.`
      },
      act: 'mixups'
    }
  ];
  const num = x => (typeof x === 'number' && isFinite(x) && x >= 0 ? Math.floor(x) : 0);
  // A state read back from storage, made whole (anything missing or malformed starts empty). seed: the answers the device
  // holds, used only when there is no state yet.
  function tipsInit(raw, seed) {
    const o = raw && typeof raw === 'object' ? raw : null,
      L = !o && Array.isArray(seed) ? seed.filter(a => a && typeof a === 'object') : [];
    const u = o && o.u && typeof o.u === 'object' ? o.u : {q: L.length, z: L.filter(a => a.zm).length},
      s = o && o.s && typeof o.s === 'object' ? o.s : {},
      v = o && o.v && typeof o.v === 'object' ? o.v : {};
    return {
      u: Object.fromEntries(Object.entries({q: 0, z: 0, c: 0, d: 0, m: 0, ...u}).map(([k, x]) => [k, num(x)])),
      s: Object.fromEntries(Object.entries(s).map(([k, L]) => [k, Array.isArray(L) ? L.map(num) : []])),
      v: {t: num(v.t), n: num(v.n), tip: v.tip ? 1 : 0}
    };
  }
  // An answer at time t: one more question, and the visit it belongs to.
  function tipNote(st, t) {
    const v = st.v.t && t - st.v.t < TIPR.GAP && t >= st.v.t ? {t, n: st.v.n + 1, tip: st.v.tip} : {t, n: 1, tip: 0};
    return {...st, u: {...st.u, q: st.u.q + 1}, v};
  }
  // One more use of a feature (k: a counter of u).
  const tipUse = (st, k) => ({...st, u: {...st.u, [k]: (st.u[k] || 0) + 1}});
  // The tip due at this break, or null. b: {ctx: the game (hash before "|"), miss: the answer was wrong, zm: a photo of
  // the question was enlarged before answering, mix: the pairs mixed up TIPR.MIX times or more, 0 when not counted}.
  function tipDue(st, b, L = TIPS) {
    if (st.v.tip || st.v.n < TIPR.FLOOR) return null;
    return (
      L.find(t => {
        const sh = st.s[t.id] || [],
          from = sh.length ? sh[sh.length - 1] + t.every : t.from;
        return t.ctx.includes(b.ctx) && sh.length < t.max && t.target(st.u, b) && st.u.q >= from && (t.now(b) || st.u.q >= from + t.wait);
      }) || null
    );
  }
  // A tip shown: when (in questions), and none again this visit.
  const tipShown = (st, id) => ({...st, s: {...st.s, [id]: [...(st.s[id] || []), st.u.q]}, v: {...st.v, tip: 1}});
  const API = {TIPR, TIPS, tipsInit, tipNote, tipUse, tipDue, tipShown};
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else Object.assign(root, API);
})(this);
