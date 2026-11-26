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
//      tipsLoad), i times the subject's Identify tool (the Coral ID Key) was opened here (app.js route, quiz.js tipRoute; a
//      choice saved in the key folds in as one, tipsLoad), k the run of typed questions answered "I don't know" here
//      since the last typed answer that was not one (quiz.js tipAfter through tipNote: a text typed, even a wrong or a
//      refused one, ends the run; the progress record counts typed questions, never how they were answered; the log's
//      trailing run folds in, tipsLoad), h times the corallites hint was opened before an answer (quiz.js question: the
//      button's own tap, never the reveal after an answer), w misses on a question that offered the hint and left it
//      closed (quiz.js answer() through tipAfter and tipNote), y answers picked with a number key (quiz.js question: the
//      key handler), p answers picked with a mouse click on a device with a mouse and a keyboard (quiz.js go: a pointer
//      click, never a tap on a touch screen, a key or a script). The log cannot say who opened the hint (an opened one is
//      one photo among the answer's own) nor how an answer was picked, so h, w, y and p count from the device on. The
//      others are seeded once, when the state is first made, from the answers the device still holds (LOG0 / SYNC.log:
//      their count, their zm flags and the run they end with, tipIdkRun), so a player who has played here before is not
//      counted from zero; a signed-in device holds only its unsent answers, so it starts low.
//   s  per tip, the value of u.q at each showing: {zoom: [212, 318]}
//   v  the visit: {t: time of its last answer, n: answers in it, tip: 1 once a tip showed in it}. A gap of TIPR.GAP (30
//      minutes, as model.js SESSION.GAP) starts a new one; a reload does not.
// A tip in TIPS: id; ctx, the games whose break at Next may show it, or for an out: true tip the pages outside the games
// (home, progress: quiz.js tipOut) where it shows at a calm moment (the hash before any "|"); target(u, b), who it is
// for, on the counters (and, for the one whose audience is the player's own record, on b); from, the u.q from which it
// can first show; now(b), its preferred moment at a break (b: {ctx, miss, zm, mix: the pairs of units the player mixed up
// TIPR.MIX times or more, counted by quiz.js only while a tip needs it, bx: 1 for a player the basics tip is for,
// quiz.js tipBasics, ix: 1 for a subject that declares the Identify tip's words, quiz.js idWords, hm: the answer was a miss
// on a question that offered the hint and left it closed, hx: 1 for a subject that declares the hint's words, quiz.js
// hintWords, kb: 1 on a device with a keyboard and a mouse, not a touch screen, quiz.js tipAfter}); wait, how many more
// questions it waits for that moment before any break will do; max showings ever and every,
// the questions between two; card (kick, title(o) and body(o), o: {mouse, subj: the SUBJECTS record on screen, basics: the
// subject's basics words, app.js UNITS basics, key: its Identify tip's words, app.js UNITS idtip, hint: its hint's words, app.js UNITS hint}), the text of its card;
// act, its "Show me" action (quiz.js TIP_ACT), or none.
(function (root) {
  // Global rules: at most one tip a visit, never in its first FLOOR answers of a game (plus, in quiz.js: one card a break,
  // within the prompt spacing, never over another card, the tour or a toast).
  // MIX: how many times a pair must have been mixed up (both ways added, as the My mix-ups view weighs it) to count.
  // IDK: how many typed questions in a row answered "I don't know" make the typed-answers tip's audience.
  // HINT: how many misses on questions that offered the hint, with the hint never opened, make the hint tip's audience.
  // CLICK: how many answers picked with a mouse click, with no number key ever pressed, make the keys tip's audience.
  const TIPR = {KEY: 'reefid-tips', GAP: 30 * 60000, FLOOR: 10, MIX: 3, IDK: 3, HINT: 10, CLICK: 30};
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
    },
    {
      // The subject's basics module (d: Coral basics, Fish basics), the one the first-launch answer "new" offers first (the
      // tour's last button, quiz.js startBasicsOffer, Home's line), for the player that offer is for (b.bx: quiz.js tipBasics,
      // read from the subject's own first-launch record and its basics record, not a counter: the module's page already
      // records the step it opens) who still has not opened it. The "lower" fallback card offers it to those who said they
      // had the course or know the subject, never to "new": the two audiences are apart, so one player never gets both.
      // Shown in the Quiz only, from 30 questions; best right after a miss (the first genera felt hard), else at any break
      // from 20 questions later; twice at most, the second 150 questions after the first; after the other four tips when
      // several are due. Show me opens the module. Its words are the subject's (o.basics: app.js UNITS basics).
      id: 'basics',
      ctx: ['quiz'],
      target: (u, b) => !!(b && b.bx),
      from: 30,
      now: b => !!b.miss,
      wait: 20,
      max: 2,
      every: 150,
      card: {
        kick: 'Did you know?',
        title: o => `${(o && o.basics && o.basics.ask) || 'New here?'} Try ${(o && o.basics && o.basics.name) || 'the basics'}`,
        body: o =>
          `${(o && o.basics && o.basics.lo) || 'The basics shows the words the ID tips use, on real photos. About 5 minutes.'} It is in Learn, any time.`
      },
      act: 'basics'
    },
    {
      // The subject's Identify tool (e: the Coral ID Key), for a player with 200 questions or more here who never opened
      // it (i counts the draws of its page, app.js route; a saved choice in the key folds in as one, quiz.js tipsLoad).
      // The only tip outside the games: on Home or My progress (out: true), where nothing is being answered, so the
      // visit's first-answers floor does not apply (quiz.js tipOut, a calm moment after the page is drawn); at any such
      // visit from 200 questions; twice at most, the second 150 questions after the first. b.ix: 1 only for a subject
      // whose UNITS declare the tip's words (idtip: the subject has a working Identify tool, as the corals' key), so a
      // subject with none (the Fish ID Key is coming soon) gets no tip. Show me opens the tool.
      id: 'identify',
      ctx: ['home', 'progress'],
      out: true,
      target: (u, b) => u.i < 1 && !!(b && b.ix),
      from: 200,
      now: () => true,
      wait: 0,
      max: 2,
      every: 150,
      card: {
        kick: 'Did you know?',
        // The words of the subject (o.key: app.js UNITS idtip: name, ask, lo).
        title: o => `${(o && o.key && o.key.ask) || 'Not sure what it is?'} Try the ${(o && o.key && o.key.name) || 'ID key'}`,
        body: o =>
          `${(o && o.key && o.key.lo) || 'Tap the clues you see and it shortlists the candidates.'} It is under Identify, any time.`
      },
      act: 'identify'
    },
    {
      // Typed answers (f): a close spelling is accepted. For a player whose last TIPR.IDK (3) typed questions here were all
      // answered "I don't know" (u.k, the run since a text was last typed: a wrong or refused text, even a close one, ends
      // it; the progress record cannot say, so a counter). The Quiz and the Custom quiz (the games with typed questions, any
      // subject that has them: the words are the subject's `one`); at any break while the run holds (the first is the Next
      // right after the third "I don't know": no better moment, and a typed text ends the run); twice at most, the second
      // 150 questions after the first; last of the six when several are due. It has nothing to open (no act: Got it only).
      id: 'typed',
      ctx: ['quiz', 'quiz-custom'],
      target: u => u.k >= TIPR.IDK,
      from: 0,
      now: () => true,
      wait: 0,
      max: 2,
      every: 150,
      card: {
        kick: 'Did you know?',
        title: () => 'Not sure how to spell it? Type it anyway',
        body: o =>
          `A close spelling counts as right: you just retype the ${(o && o.subj && o.subj.one) || 'name'} once to learn its spelling. “I don't know” counts as a miss.`
      }
    },
    {
      // The hint (g): the link under a question's photos that adds a close-up (the corals' corallites). For a player who
      // missed TIPR.HINT (10) questions that offered it and never opened it (w, h: counted on the device, quiz.js), in a
      // subject whose UNITS declare the hint's words (b.hx; the other subjects' questions have no hint, so none gets the
      // tip). The Quiz and the Custom quiz; only at the Next right after another such miss (b.hm: the link was in view
      // and left closed; wait Infinity: no other break will do, the card names a link the question just answered had);
      // twice at most, the second 150 questions after the first; last of the seven when several are due. Nothing to open
      // (no act: Got it only): the link is on the next question that has one. The words are the subject's (o.hint: UNITS
      // hint: name, lo).
      id: 'hint',
      ctx: ['quiz', 'quiz-custom'],
      target: (u, b) => u.h < 1 && u.w >= TIPR.HINT && !!(b && b.hx),
      from: 0,
      now: b => !!b.hm,
      wait: Infinity,
      max: 2,
      every: 150,
      card: {
        kick: 'Did you know?',
        title: o => `Stuck? Show the ${(o && o.hint && o.hint.name) || 'close-up'}`,
        body: o =>
          `${o && o.mouse ? 'Click' : 'Tap'} “Show the ${(o && o.hint && o.hint.name) || 'close-up'} (hint)” under the photos before you answer: it adds ${(o && o.hint && o.hint.lo) || 'a closer view, the detail that often tells look-alikes apart'}.`
      }
    },
    {
      // The keyboard keys (h): a number on each answer picks it, Enter goes to the next question (the small marks on the
      // answers and on Next). For a player who picked TIPR.CLICK (30) answers with a mouse click and never pressed a number
      // key (p, y: counted on the device, quiz.js), on a device with a keyboard and a mouse (b.kb: no tip on a touch
      // screen, where the marks are hidden). Every subject's questions have the keys, so no subject gate (one engine). The
      // Quiz and the Custom quiz, at any break; twice at most, the second 150 questions after the first; last of the eight
      // when several are due. Nothing to open (no act: Got it only).
      id: 'keys',
      ctx: ['quiz', 'quiz-custom'],
      target: (u, b) => u.y < 1 && u.p >= TIPR.CLICK && !!(b && b.kb),
      from: 0,
      now: () => true,
      wait: 0,
      max: 2,
      every: 150,
      card: {
        kick: 'Did you know?',
        title: () => 'Answer faster with the keyboard',
        body: () => 'Press the number shown on an answer to pick it, then Enter for the next question: no need to click.'
      }
    }
  ];
  const num = x => (typeof x === 'number' && isFinite(x) && x >= 0 ? Math.floor(x) : 0);
  // A state read back from storage, made whole (anything missing or malformed starts empty). seed: the answers the device
  // holds, used only when there is no state yet.
  function tipsInit(raw, seed) {
    const o = raw && typeof raw === 'object' ? raw : null,
      L = !o && Array.isArray(seed) ? seed.filter(a => a && typeof a === 'object') : [];
    const u = o && o.u && typeof o.u === 'object' ? o.u : {q: L.length, z: L.filter(a => a.zm).length, k: tipIdkRun(L)},
      s = o && o.s && typeof o.s === 'object' ? o.s : {},
      v = o && o.v && typeof o.v === 'object' ? o.v : {};
    return {
      u: Object.fromEntries(
        Object.entries({q: 0, z: 0, c: 0, d: 0, m: 0, i: 0, k: 0, h: 0, w: 0, y: 0, p: 0, ...u}).map(([k, x]) => [k, num(x)])
      ),
      s: Object.fromEntries(Object.entries(s).map(([k, L]) => [k, Array.isArray(L) ? L.map(num) : []])),
      v: {t: num(v.t), n: num(v.n), tip: v.tip ? 1 : 0}
    };
  }
  // An answer at time t: one more question, and the visit it belongs to. ty: how it was typed, 'idk' for a typed question
  // answered "I don't know" (one more in the run u.k), 'typed' for any other typed answer (the run ends); '' for a question
  // not typed (the run is as it was). hm: the answer was a miss on a question that offered the hint and left it closed (one
  // more in u.w). by: how the answer was picked, 'key' (a number key: one more in u.y), 'click' (a mouse click on a device
  // with a mouse and a keyboard: one more in u.p), '' (a typed or touched answer, a script: neither).
  function tipNote(st, t, ty = '', hm = false, by = '') {
    const v = st.v.t && t - st.v.t < TIPR.GAP && t >= st.v.t ? {t, n: st.v.n + 1, tip: st.v.tip} : {t, n: 1, tip: 0};
    return {
      ...st,
      u: {
        ...st.u,
        q: st.u.q + 1,
        k: ty === 'idk' ? st.u.k + 1 : ty ? 0 : st.u.k,
        w: st.u.w + (hm ? 1 : 0),
        y: st.u.y + (by === 'key' ? 1 : 0),
        p: st.u.p + (by === 'click' ? 1 : 0)
      },
      v
    };
  }
  // How a logged answer was typed (see tipNote): '' when it was not a typed question (core.js TYPED_RE, the mode's |t), 'idk'
  // when no text was kept (ty '') and none was refused before it (rj), else 'typed'.
  const tipTyped = a =>
    a && /\|t(\||$)/.test(String(a.m || '')) ? (!a.ty && !(Array.isArray(a.rj) && a.rj.length) ? 'idk' : 'typed') : '';
  // The run of typed "I don't know" the answers end with, the typed questions only (a log is oldest first).
  function tipIdkRun(log) {
    let n = 0;
    for (let i = (Array.isArray(log) ? log.length : 0) - 1; i >= 0; i--) {
      const ty = tipTyped(log[i]);
      if (ty === 'typed') break;
      if (ty) n++;
    }
    return n;
  }
  // One more use of a feature (k: a counter of u).
  const tipUse = (st, k) => ({...st, u: {...st.u, [k]: (st.u[k] || 0) + 1}});
  // The tip due at this break, or null. b: {ctx: the game (hash before "|"), miss: the answer was wrong, zm: a photo of
  // the question was enlarged before answering, mix: the pairs mixed up TIPR.MIX times or more, 0 when not counted, bx:
  // the basics tip's audience, 0 when not counted}.
  // now: the time, given only for a page outside the games (Home, My progress), which has no answer of its own to date the
  // visit: the visit counted is the last one (st.v), still open when its last answer is less than TIPR.GAP before now,
  // else over, so a new one with no tip yet and no answers. A tip with out: true is not held by the floor (nothing is
  // being answered there).
  const tipOpen = (st, now) => !now || (st.v.t > 0 && now >= st.v.t && now - st.v.t < TIPR.GAP);
  function tipDue(st, b, L = TIPS, now = 0) {
    const v = tipOpen(st, now) ? st.v : {t: 0, n: 0, tip: 0};
    if (v.tip) return null;
    return (
      L.find(t => {
        const sh = st.s[t.id] || [],
          from = sh.length ? sh[sh.length - 1] + t.every : t.from;
        return (
          (t.out || v.n >= TIPR.FLOOR) &&
          t.ctx.includes(b.ctx) &&
          sh.length < t.max &&
          t.target(st.u, b) &&
          st.u.q >= from &&
          (t.now(b) || st.u.q >= from + t.wait)
        );
      }) || null
    );
  }
  // A tip shown: when (in questions), and none again this visit. On a page (now given) the visit is stamped with the time,
  // so the answers that follow, within TIPR.GAP, belong to the same visit and bring no second tip.
  const tipShown = (st, id, now = 0) => ({
    ...st,
    s: {...st.s, [id]: [...(st.s[id] || []), st.u.q]},
    v: now ? {t: now, n: tipOpen(st, now) ? st.v.n : 0, tip: 1} : {...st.v, tip: 1}
  });
  const API = {TIPR, TIPS, tipsInit, tipNote, tipUse, tipDue, tipShown, tipIdkRun};
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else Object.assign(root, API);
})(this);
