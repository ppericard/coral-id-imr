// Demo mode of the admin page (Pierre, 2026-11-01: "agents who develop the app must be able to see and test the admin
// section"): admin.html?demo opens every page without a token, on made-up players, answers and reports. Nothing leaves
// the browser: this file answers, in memory, the calls admin.js makes to the sync sheet script (script.google.com) and
// to the GitHub API, the way tools/sync/Code.gs and GitHub answer them. The photos, genera and curation are the real
// public files (data.json, curation.json...); Publish "succeeds" in memory only. admin.js keeps the demo's browser
// storage apart (keys prefixed "demo:"), so a demo never touches a real admin draft. tests/admin.smoke.js drives it.
// Without ?demo this file does nothing. Keep the reply shapes in step with Code.gs (answers_, stats_, users_, reports_).
(() => {
  if (!/[?&]demo\b/.test(location.search)) return;
  window.ADMIN_DEMO = true;
  const real = window.fetch.bind(window),
    DAY = 864e5,
    NOW = Date.now();
  // Seeded random numbers: the same demo every time (screenshots and tests can compare).
  let seed = 20261101;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648,
    pick = L => L[Math.floor(rnd() * L.length)],
    // The script version the demo answers as: the current one (v81, with ?demo&v=81: each player's photo exposure, ex; v58: Archive, the archived list; v55: a delete cleans up everything of the account, the
    // answers it keeps flagged 2; v48: the beta groups, userGroup and each player's groups; v42: the player list carries each player's replay, rp; v35: the Analyses report; v31: ?stats=1 adds the genus offsets gd; v30: the pages
    // opened, admin.js loadPages; v28: the admin shows the full replay, admin.js replayOn), or an older one with
    // ?demo&v=27 or v=28 (tests/admin.smoke.js: the admin then does what it did before; rule D4).
    V = Number((/[?&]v=(\d+)/.exec(location.search) || [])[1]) || 58,
    ok = o => new Response(JSON.stringify({v: V, ...o}), {status: 200, headers: {'Content-Type': 'application/json'}});
  // Made-up players: [name, skill 0-1, answers, days ago of the first and last answer]. Two names of one person
  // ("Mara Demo" / "mara demo2") to try Merge; one test account with few answers to try Delete.
  const PLAYERS = [
    ['Ana Demo', 0.75, 420, 20, 0],
    ['Ben Demo', 0.45, 260, 14, 1],
    ['Carla Demo', 0.6, 180, 9, 0],
    ['Dio Demo', 0.3, 90, 6, 3],
    ['Mara Demo', 0.55, 150, 12, 2],
    ['mara demo2', 0.55, 40, 2, 0],
    ['Test Demo', 0.5, 8, 1, 1]
  ];
  const ME = 'Ana Demo'; // "you" on the Stats pages (the caller's own id, ?answers=1 me)
  let S = null; // {names: [{name, pin hash...}], rows: [[name, t, shown, answered, ok, mode, photos, id, e, th, nw, choices]], reports, removed, data}
  // One dataset for every request: concurrent first calls (answers and stats together) wait for the same build.
  let BUILD = null;
  const build = () => (BUILD = BUILD || make().then(x => (V >= 35 && setTimeout(() => anaReport(true), 0), x)));
  // Moves the last n of one player's rows into one session ending at `end`, about 37 s apart, in their order; the last
  // `typed` plain quiz answers among them become typed ones (quiz|t: no choices offered).
  function live(L, n, end, typed) {
    L.sort((a, b) => a[1] - b[1])
      .slice(-n)
      .forEach((r, i, M) => (r[1] = end - (M.length - 1 - i) * 37e3));
    if (typed)
      L.slice(-n)
        .filter(r => r[5] === 'quiz')
        .slice(-typed)
        .forEach(r => ((r[5] = 'quiz|t'), (r[11] = '')));
  }
  async function make() {
    const D = await real('data.json', {cache: 'no-cache'}).then(r => r.json());
    const gen = {...D.gen, ...((D.x && D.x.gen) || {})},
      list = Object.keys(D.gen),
      pics = {};
    list.forEach(n => {
      const v = gen[n].views || {};
      const L = Object.keys(v).flatMap(k => (v[k] || []).filter(p => p && p.f && !p.multi).map(p => ({...p, view: k})));
      if (L.length) pics[n] = L;
    });
    const G = Object.keys(pics),
      look = n => (gen[n].look || []).filter(x => pics[x]),
      // Some genera easier than others for everyone (the journey page's easiest / hardest), fixed per genus.
      ease = Object.fromEntries(G.map(g => [g, (rnd() - 0.5) * 0.4]));
    const rows = [],
      users = {},
      // The made-up sessions end 2 hours ago at the latest; then a few recent ones, relative to now, for Players' Last
      // column and Activity's Recent sessions (Pierre, 2026-11-03): Carla playing now (her last answer 1 minute ago,
      // quiz, duels and typed answers), a device not signed in that stopped 12 minutes ago, mara demo2 2 hours ago.
      END = NOW - 2 * 3600e3;
    let k = 0;
    PLAYERS.forEach(([name, skill, n, d0, d1]) => {
      const P = {};
      // Answers come in sessions of 5-40, about 30 s apart (the Health page reads sessions from the gaps).
      let left = 0,
        start = 0,
        j = 0;
      for (let i = 0; i < n; i++) {
        if (!left) {
          left = 5 + Math.floor(rnd() * 36);
          start = END - (d0 - ((d0 - d1) * i) / Math.max(1, n - 1)) * DAY - Math.floor(rnd() * 3600e3);
          j = 0;
        }
        left--;
        const t = Math.min(END, start + j++ * (20e3 + Math.floor(rnd() * 20e3))),
          // Genera open progressively, as in the app: 4 at first, one more every ~8 answers.
          g = pick(G.slice(0, Math.min(G.length, 4 + Math.floor(i / 8)))),
          duel = rnd() < 0.2,
          traps = look(g),
          others = G.filter(x => x !== g);
        const ch = [g];
        while (ch.length < (duel ? 2 : 4)) {
          const x = traps.length && rnd() < 0.6 ? pick(traps) : pick(others);
          if (!ch.includes(x)) ch.push(x);
        }
        const st = (P[g] = P[g] || {ok: 0, ko: 0, h: '', th: 0, pg: 0.2});
        const pe = Math.max(0.3, Math.min(0.95, skill + Math.min(0.25, (st.ok + st.ko) * 0.02))),
          right = rnd() < Math.max(0.05, Math.min(0.98, pe + ease[g])),
          ans = right ? g : pick(ch.slice(1)),
          p = pick(pics[g]),
          same = pics[g].filter(x => x.o && x.o === p.o && x.f !== p.f),
          ph = [p, ...same.slice(0, Math.floor(rnd() * 3))].map(x => x.f).join(' ');
        st[right ? 'ok' : 'ko']++;
        st.h = (st.h + (right ? 1 : 0)).slice(-10);
        st.th = Math.round((st.th + (right ? 0.15 : -0.1)) * 100) / 100;
        st.pg = Math.min(1, st.pg + (right ? 0.08 : 0));
        // Learned here: this answer passed the exam (logged quiz|x, the journey's star).
        const passed = right && st.pg >= 0.6 && !st.mx;
        if (passed) st.mx = t;
        const id = 'demo' + (k++).toString(36);
        rows.push([
          name,
          t,
          g,
          ans,
          right ? 1 : 0,
          duel ? 'quiz-duel' : passed ? 'quiz|x' : 'quiz',
          ph,
          id,
          Math.round(100 * pe) / 100,
          st.th,
          0,
          ANALYSIS.shuffle(ch, rnd).join(' '), // never sort(() => rnd() - 0.5): see analysis.js shuffle
          // Seconds to answer and a photo enlarged (sheet v23), from the answer's number (the random draws stay the same).
          Math.round((3 + ((k * 37) % 120) / 10 + (right ? 0 : 5)) * 10) / 10,
          k % 7 ? 0 : 1
        ]);
      }
      // A signed-in player besides Carla among Activity's Recent sessions: mara demo2's last 10 answers end 2 hours ago (the
      // devices not signed in answer every few hours, so a last session left a day back fell out of the 10 newest).
      if (name === 'mara demo2')
        live(
          rows.filter(r => r[0] === name),
          10,
          END,
          0
        );
      // Carla is playing now: her last 24 answers moved to the last 15 minutes, two of them typed (quiz|t, no choices).
      if (name === 'Carla Demo') {
        live(
          rows.filter(r => r[0] === name),
          24,
          NOW - 60e3,
          2
        );
        // ... her last 8 photo-quiz answers in the custom quiz (quiz|s…, the genera she picked; app quiz.js quizCustom).
        rows
          .filter(r => r[0] === name && r[5] === 'quiz')
          .sort((x, y) => x[1] - y[1])
          .slice(-8)
          .forEach(r => (r[5] = r[5].replace(/^quiz/, 'quiz|s')));
      }
      // First-meeting cards (app model.js INTRO): the first 4 genera together, the others one at a time 2 answers before
      // their first question; Carla opened all from the offer card at answer 40, Ben declined it at answer 50.
      const mine = rows.filter(r => r[0] === name).sort((x, y) => x[1] - y[1]), // in time order, as the journey reads them
        intro = {},
        // Shown just after the a-th answer (as in the app: the card's time is after that answer's), before the first one for 0.
        at = a => (mine[Math.max(0, a - 1)] || mine[0] || [0, NOW])[1] + (a ? 1 : -1),
        openAt = name === 'Carla Demo' ? 40 : null;
      mine.forEach((r, i) => {
        if (intro[r[2]] || (gen[r[2]] || {}).x) return;
        const a = openAt != null && i >= openAt ? openAt : Object.keys(intro).length < 4 ? 0 : Math.max(0, i - 2);
        intro[r[2]] = [a, a === 0 || a === openAt ? 1 : 0, at(a), a === openAt ? 'a' : a === 0 ? 's' : 'c'];
      });
      const offer =
        openAt != null
          ? // and answered the back card (model.js backDue) with Keep them all 30 answers later.
            {at: openAt, open: 1, via: 'offer', t: at(openAt), bk: 'keep', bat: openAt + 30, bn: 0, bt: at(openAt + 30)}
          : name === 'Ben Demo'
            ? {at: 50, open: 0, t: at(50)}
            : null;
      // The first-launch question (app core.js CHOICE, model.js startSet): Carla said she had the IMR course in the tour
      // and moved up to "I know corals well" on the fallback card after her 20th answer; Ben is new to corals and got the
      // Coral basics card; the others answered in the tour.
      const st0 =
        name === 'Carla Demo'
          ? {
              c: 'know',
              t: at(20),
              at: 20,
              via: 'fallback',
              n: 0,
              s: 0,
              fb: {'reefid-hi': [20, at(20)]},
              h: [
                ['imr', 0, at(0), 'tour'],
                ['know', 20, at(20), 'fallback']
              ]
            }
          : name === 'Ben Demo'
            ? {c: 'new', t: at(0), at: 0, via: 'card', n: 20, s: -4.6, fb: {'new-lo': [20, at(20)]}, h: [['new', 0, at(0), 'card']]}
            : {c: 'imr', t: at(0), at: 0, via: 'tour', n: 20, s: 0.4, fb: {}, h: [['imr', 0, at(0), 'tour']]};
      // Achievements (app progress.js ACHK: {id: time}), dated at the answer that earned them, as the app records them:
      // 10 and 20 genera met, 10 right in a row, a first look-alike duel won, a first mastery exam passed; Carla also
      // reached 25% progress in the session she is playing now (Activity's session summary shows it).
      const ach = {_v: 2},
        seenG = new Set();
      let run = 0;
      mine.forEach(r => {
        if (!seenG.has(r[2])) {
          seenG.add(r[2]);
          if (seenG.size === 10) ach.met10 = r[1];
          if (seenG.size === 20) ach.met20 = r[1];
        }
        run = r[4] ? run + 1 : 0;
        if (run === 10 && !ach.run10) ach.run10 = r[1];
        if (r[4] && /^quiz-duel/.test(r[5]) && !ach.duel) ach.duel = r[1];
        if (r[4] && /\|x$/.test(r[5]) && !ach.learn1) ach.learn1 = r[1];
      });
      if (name === 'Carla Demo') ach.pct25 = mine[mine.length - 12][1];
      const learned = Object.values(P).filter(s => s.pg >= 0.6).length;
      users[name.toLowerCase()] = {
        name,
        // Test Demo is hidden from the leaderboard (Players greys its name), as a renamed test account would be.
        ...(name === 'Test Demo' ? {board: -1} : {}),
        updated: NOW - d1 * DAY,
        learned,
        seen: Object.keys(P).length,
        total: list.length,
        review: Object.keys(P)
          .filter(g => P[g].ko > P[g].ok)
          .slice(0, 4)
          .join(', '),
        rev: 3,
        data: {
          'reefid-sync-coral-progress': JSON.stringify(P),
          'reefid-sync-settings': '{}',
          'reefid-sync-coral-intro': JSON.stringify(intro),
          ...(offer ? {'reefid-sync-coral-intro-offer': JSON.stringify(offer)} : {}),
          'reefid-sync-coral-start': JSON.stringify(st0),
          'reefid-sync-ach': JSON.stringify(ach)
        }
      };
    });
    // A few answers of players who never signed in (v12 "~anon <id>").
    for (let i = 0; i < 60; i++) {
      const g = pick(G),
        p = pick(pics[g]),
        right = rnd() < 0.5;
      rows.push([
        '~anon demo' + (i % 3),
        NOW - rnd() * 5 * DAY,
        g,
        right ? g : pick(G),
        right ? 1 : 0,
        'quiz',
        p.f,
        'demoa' + i,
        0.7, // expected and ability as the app logs them, so the full replay reads them too
        0.5,
        null,
        ''
      ]);
    }
    // A device not signed in that stopped 12 minutes ago: its last 8 answers.
    live(
      rows.filter(r => r[0] === '~anon demo0'),
      8,
      NOW - 12 * 60e3,
      0
    );
    // Reports: [id, time, reporter, verified, why, expected, answered, suggested, note, mode, photos, where], newest first.
    const rp = (i, who, why, g, a, fix, note, m, f, w) => [
      'demorep' + i,
      NOW - (i + 1) * 5 * 3600e3,
      who,
      who ? 1 : 0,
      why,
      g,
      a,
      fix,
      note,
      m,
      f,
      w
    ];
    const g1 = G[0],
      g2 = G[Math.min(5, G.length - 1)],
      g3 = G[Math.min(11, G.length - 1)];
    const reports = [
      rp(
        0,
        'Ben Demo',
        'wrong',
        g1,
        look(g1)[0] || g2,
        look(g1)[0] || g2,
        'Demo report: I think this is the other genus.',
        'quiz',
        pics[g1][0].f,
        'practice/quiz'
      ),
      rp(1, 'Carla Demo', 'multi', g2, '', '', 'Demo report: two colonies in this photo.', 'quiz', pics[g2][0].f, 'practice/quiz'),
      rp(2, '', 'photo', g3, '', '', 'Demo report: blurry (sent without signing in).', 'photo', pics[g3][0].f, 'learn/genus/' + g3),
      rp(3, 'Dio Demo', 'info', g2, '', '', 'Demo feedback: a typo on this sheet.', 'sheet', '', 'learn/genus/' + g2),
      rp(4, 'Ana Demo', 'idea', '', '', '', 'Demo feedback: a timer in the quiz?', 'page', '', 'home'),
      // A report from the fish beta: a teaching id and a remote iNaturalist photo (fish-photos.json).
      rp(
        5,
        'Eli Demo',
        'wrong',
        'f:Damselfishes',
        'f:MoorishIdol',
        '',
        'Demo fish report: not a damselfish.',
        'quiz',
        'fi464458713',
        'fish/practice/quiz'
      ),
      // Send feedback from a game: the question's unit and photos come with it (app.js helpEnd, quiz.js qNow).
      rp(
        7,
        'Ben Demo',
        'bug',
        g3,
        '',
        '',
        'Demo feedback: this photo took long to load.',
        'page',
        (pics[g3][1] || pics[g3][0]).f,
        'practice/quiz'
      ),
      // A fish species sheet: the script keeps no s: id (Code.gs logReports_), its page names the species.
      rp(
        8,
        'Eli Demo',
        'info',
        '',
        '',
        '',
        'Demo fish feedback: a typo on this species.',
        'sheet',
        '',
        'fish/learn/species/Chromis%20ternatensis'
      ),
      // The fish ID marks' "Report or correct a line" (learn.js fishMarks): a sheet's report, not a game's.
      rp(
        9,
        'Eli Demo',
        'info',
        'f:Damselfishes',
        '',
        '',
        'Demo fish feedback: one mark reads oddly.',
        'marks',
        '',
        'fish/learn/family/Damselfishes'
      ),
      // A fish game report on a curated candidate photo in play (Not this offered).
      rp(
        10,
        'Eli Demo',
        'photo',
        'f:Damselfishes',
        '',
        '',
        'Demo fish report: blurry.',
        'quiz',
        'fish-s084-cand-527402743',
        'fish/practice/quiz'
      ),
      // A fish game report "Several fish species" on a photo in play (Pierre, 2026-11-09: a wrasse beside a goatfish): the
      // photo carries every tool of its family's page, its count tag among them.
      rp(
        11,
        'Eli Demo',
        'multi',
        'f:Wrasses',
        '',
        '',
        'Demo fish report: a goatfish beside the wrasse.',
        'quiz',
        'fish-s245-cand-660037998',
        'fish/practice/quiz'
      ),
      // Sheet v55: an account deleted with its answers kept: its reports stay without the name, never verified.
      Object.assign(
        rp(
          6,
          '~deleted Zq3xR8kA',
          'photo',
          g1,
          '',
          '',
          'Demo report from a removed account: too dark.',
          'photo',
          pics[g1][0].f,
          'learn/genus/' + g1
        ),
        {3: 0}
      )
    ];
    // Events (sheet v19): [id, time, device, kind, message, where, page, detail, app, browser], newest first.
    // One-tap prompts (core.js PULSEQ): the item in Where, the code in Message; Detail keeps r only for easy / ok / hard,
    // as the sheet does. Each prompt logs its showing, then an answer, "Not now" (skip), moving on (none) or nothing (the
    // app closed); the first prompt is an answer from before the bank (no item id, no showing logged).
    const events = [];
    for (let i = 0; i < 48; i++) {
      const it = PULSEQ[i % PULSEQ.length],
        out = i % 8,
        r = out === 5 ? PULSE_SKIP : out === 6 ? PULSE_NONE : out === 7 ? '' : it.a[[1, 1, 2, 0, 1][out]][0],
        m = i % 4 === 3 ? 'quiz-duel' : 'quiz',
        old = i === 0,
        row = (k, code) => [
          'demoev' + i + k,
          NOW - i * 4 * 3600e3 + (k === 'b' ? 30e3 : 0),
          'demodev' + (i % 5),
          'pulse',
          code,
          old ? '' : it.id,
          m,
          JSON.stringify({
            r: ['easy', 'ok', 'hard'].includes(code) ? code : '',
            m,
            n: 10 + i,
            rr: code === 'hard' || code === 'yes' ? 40 : code === 'easy' ? 100 : 80,
            lv: -1.2 + (i % 5) * 0.5,
            met: 6 + i
          }),
          '159',
          'Chrome 140 mobile'
        ];
      if (!old) events.push(row('a', PULSE_SHOWN));
      if (r) events.push(row('b', r));
    }
    events.push(
      [
        'demoeva',
        NOW - 3600e3,
        'demodev1',
        'err',
        "TypeError: Cannot read properties of undefined (reading 'views')",
        'app.js:1234:5',
        'practice/quiz',
        '',
        '159',
        'Chrome 140 mobile'
      ],
      [
        'demoevb',
        NOW - 2 * 3600e3,
        'demodev2',
        'err',
        "TypeError: Cannot read properties of undefined (reading 'views')",
        'app.js:1234:5',
        'practice/duels',
        '',
        '158',
        'Safari 18 mobile'
      ],
      ['demoevc', NOW - 5 * 3600e3, 'demodev3', 'photo', pics[g1][0].f, '', 'practice/quiz', '', '159', 'Samsung 27 mobile'],
      [
        'demoevd',
        NOW - 9 * 3600e3,
        'demodev4',
        'sync',
        'save failed: Failed to fetch',
        'load · no reply · 0.4 s · try 5 · 76 s · 0 hidden',
        'practice/quiz',
        '',
        '159',
        'Chrome 140 mobile'
      ],
      // A save that failed once and came through on its retry (app from 2026-11-05), and a device left on a replaced
      // version (sheet v50 'old', with its device id and version).
      [
        'demoeve',
        NOW - 7 * 3600e3,
        'demodev4',
        'sync',
        'save recovered: Load failed',
        'save · no reply · 12.3 s · try 1 · 0 s · 0 hidden · saved after 5 s',
        'practice/quiz',
        '',
        '159',
        'Safari 18 mobile'
      ],
      [
        'demoevf',
        NOW - 6 * 3600e3,
        'demodev5',
        'old',
        'app behind: build 150, newest 159 for 3 h, page open 45 min',
        '',
        '',
        '',
        '150-ab12cd34ef',
        ''
      ]
    );
    // Load times (sheet v21): made-up visits, a slow phone line and a fast desktop one.
    [
      [86, 21.4, 30.2, 40.5, 512, 0, 1, 'light', 390, 'cache-mnl9725-MNL', 'Chrome 140 mobile'],
      [2400, 1.8, 4.1, 4.9, 2300, 0, 0, 'dark', 1440, 'cache-sin1820-SIN', 'Firefox 144'],
      [640, 0.6, 2.2, 2.6, 40, 1, 0, 'light', 412, 'cache-mnl9731-MNL', 'Samsung 27 mobile']
    ].forEach(([bps, t0, qo, q1, kb, sw, sv, th, w, pop, ua], i) =>
      events.push([
        'demoevl' + i,
        NOW - (i + 1) * 4 * 3600e3,
        'demodev' + i,
        'load',
        pop,
        '',
        'practice/quiz',
        JSON.stringify({p0: 'home', t0, qo, q1, nx: 'practice.quiz', bps, kb, sw, sv, th, w, st: sw}),
        '170',
        ua
      ])
    );
    events.sort((a, b) => b[1] - a[1]);
    // The Analyses group (Pierre, 2026-11-04) needs a few thousand answers with times, enlargements, formats and breaks:
    // seven more made-up players from analysis.js demoLog (its known effects, on the real photos), their last answer
    // three days ago.
    const [cur, qual, met] = await Promise.all(
      ['curation.json', 'quality.json', 'metrics.json'].map(f => real(f, {cache: 'no-cache'}).then(r => r.json()))
    );
    ANA_META = {ph: ANALYSIS.photoMeta(D, cur, qual, met)};
    const more = ANALYSIS.demoLog(D, NOW - 3 * DAY, {cur, qual, met});
    more.forEach((r, i) => rows.push([...r.slice(0, 7), 'demoz' + i, ...r.slice(7, 11), r[12], r[13]]));
    // Photos everyone misses in the session Carla is playing now (Activity's session summary labels them "hard for
    // everyone", Health lists them; admin.js everyoneMisses, the one rule: 3 players or more answered it, most of them
    // miss it, under 40% right over 5 answers or more). Each question she missed there is also missed by enough earlier
    // answers of the devices not signed in, several distinct players, for its photos to pass that rule, counted on every
    // answer now in the log (taken from those devices' own answers, so the answer count and the sessions stay the same;
    // every photo of the question, so whichever the summary shows carries the label; never the last 8 answers of
    // ~anon demo0, the recent session Activity's checks read).
    {
      const live0 = new Set(
          rows
            .filter(r => r[0] === '~anon demo0')
            .sort((a, b) => a[1] - b[1])
            .slice(-8)
        ),
        pool = {};
      rows.filter(r => /^~anon demo\d$/.test(r[0]) && !live0.has(r)).forEach(r => (pool[r[0]] = pool[r[0]] || []).push(r));
      const tally = f => photoAnswers(rows.filter(r => r[6].split(' ').includes(f)))[f] || {n: 0, ok: 0, by: {}},
        // Answers of the signed-in players (the photo ratings' raters): a question whose photo has PH_MIN of them is
        // planted first, so Health's tile shows its difficulty in words (tests/admin.smoke.js "difficulty in words").
        signed = new Set(PLAYERS.map(p => p[0])),
        rated = F => Math.max(...F.map(f => rows.filter(r => signed.has(r[0]) && r[6].split(' ').includes(f)).length)),
        // the answers already on its photos: the more players answered them, the more donor answers the rule needs
        cost = F => Math.max(...F.map(f => tally(f).n));
      rows
        .filter(r => r[0] === 'Carla Demo')
        .sort((a, b) => a[1] - b[1])
        .slice(-24)
        .filter(r => !r[4])
        .map(miss => ({miss, F: miss[6].split(' ').filter(Boolean)}))
        .map(q => ({...q, ok: rated(q.F) >= HEALTH.PH_MIN, c: cost(q.F)}))
        .sort((a, b) => b.ok - a.ok || a.c - b.c || a.miss[1] - b.miss[1])
        .forEach(({miss, F}) => {
          // One donor answer at a time, from the device that helps most on a photo still short of the rule: one that
          // never answered it (a new player who misses it), then one that does not miss it yet, then any. A question
          // the few donors cannot bring under the rule gives its donor answers back, so they go to the next one.
          const taken = [];
          for (let guard = 0; guard < 12; guard++) {
            const f = F.find(x => !everyoneMisses(tally(x)));
            if (!f) return;
            const by = tally(f).by,
              rank = d => (!by[d] ? 0 : by[d][1] / by[d][0] >= HEALTH.PL_LOW ? 1 : 2),
              d = Object.keys(pool)
                .filter(x => pool[x].length)
                .sort((a, b) => rank(a) - rank(b) || pool[b].length - pool[a].length)[0];
            if (!d) break;
            const r = pool[d].shift();
            taken.push([d, r, r.slice()]);
            r[2] = miss[2];
            r[3] = miss[3] && miss[3] !== miss[2] ? miss[3] : G.find(x => x !== miss[2]);
            r[4] = 0;
            r[6] = miss[6];
          }
          if (F.every(x => everyoneMisses(tally(x)))) return;
          taken.reverse().forEach(([d, r, was]) => {
            was.forEach((v, i) => (r[i] = v));
            pool[d].unshift(r);
          });
        });
    }
    ANALYSIS.DEMO_PLAYERS.forEach(([name]) => {
      const mine = more.filter(r => r[0] === name);
      users[name.toLowerCase()] = {
        name,
        updated: mine.length ? mine[mine.length - 1][1] : NOW - 3 * DAY,
        learned: 0,
        seen: new Set(mine.map(r => r[2])).size,
        total: list.length,
        review: '',
        rev: 1,
        data: {'reefid-sync-coral-progress': '{}', 'reefid-sync-settings': '{}'}
      };
    });
    // Pages opened (sheet v30 'pages', its own Pages tab): a few visits of each player, under their anonymous id (aid,
    // as Code.gs evWho_ stores it), with the answers so far, the pages and the genus sheets opened. Its own random numbers,
    // so the rest of the demo stays the same. Ana reads the sheets (one before it was asked, from Learn), Carla from the
    // quiz feedback, Ben once, Dio never; a device not signed in opened one; one summary has no id (a wrong code); Ana
    // also played the fish quiz once.
    let ps = 7;
    const prnd = () => (ps = (ps * 1103515245 + 12345) % 2147483648) / 2147483648,
      pages = [],
      pageRow = (i, t, who, d) => [
        'demopg' + i,
        t,
        'demodev' + (i % 5),
        'pages',
        who,
        '',
        'quiz',
        JSON.stringify(d),
        '190',
        'Chrome 140 mobile'
      ],
      READS = {'Ana Demo': [3, 'learn'], 'Carla Demo': [2, 'quiz'], 'Ben Demo': [1, 'quiz'], 'Dio Demo': [0, 'quiz']};
    let pi = 0;
    PLAYERS.forEach(([name, , n, d0]) => {
      const [k, from] = READS[name] || [0, 'other'];
      for (let v = 0; v < 4; v++) {
        const na = Math.round((n * v) / 4),
          g = {};
        if (k && v < 3)
          G.slice(v * k, v * k + k).forEach(
            (x, j) => (g[x] = [1 + (j % 2), 8 + Math.round(prnd() * 60), j ? from : 'learn', v || j ? 1 : 0])
          );
        const nG = Object.keys(g).length;
        pages.push(
          pageRow(pi++, NOW - (d0 - v * (d0 / 4)) * DAY, aid(name), {
            r: {
              home: [1, 4 + Math.round(prnd() * 10)],
              'practice.quiz': [1 + nG, 300 + Math.round(prnd() * 900)],
              ...(nG ? {'learn.genus': [nG, 60]} : {}),
              // Ana's last visit went on with Fish on screen (core.js pageName: fish.<page>).
              ...(name === 'Ana Demo' && v === 3 ? {'fish.practice.quiz': [2, 420], 'fish.learn.genera': [1, 35]} : {})
            },
            g,
            vi: 'demovi' + pi,
            na
          })
        );
      }
    });
    pages.push(
      pageRow(pi++, NOW - 3 * 3600e3, aid('~anon demo0'), {
        r: {'practice.quiz': [2, 200], 'learn.genus': [1, 25]},
        g: {[G[0]]: [1, 25, 'quiz', 1]},
        vi: 'demovianon',
        na: 8
      }),
      pageRow(pi++, NOW - 4 * 3600e3, '', {r: {home: [1, 3], 'learn.genera': [1, 40]}, g: {}, vi: 'demovinoid', na: 120})
    );
    // Players › Visits (Pierre, 2026-11-08, Q301-Q304): visits without a game and visitors who never answered, over the
    // last 5 weeks, each on a device of its own with its browser and a load row (Events) giving its window width, whether
    // it is installed and its first page. Its own random numbers, so the rest of the demo stays the same. Ben and Carla
    // (signed in) come back to read the sheets and their progress; two devices not signed in that answered open the Key
    // and the Look-alikes, never a genus sheet (their journeys' sheets stay as above); 12 devices never answered: staff
    // on computers reading the Key and the sheets, an iPad (a computer's browser 820 px wide: a tablet), an Android tablet
    // (a phone's browser 800 px wide), the curious on phones; two of them on the Fish side.
    {
      let vs = 23;
      const vr = () => (vs = (vs * 1103515245 + 12345) % 2147483648) / 2147483648,
        vint = (a, b) => a + Math.floor(vr() * (b - a + 1)),
        vpick = L => L[Math.floor(vr() * L.length)],
        gp = () => G[Math.min(G.length - 1, Math.floor(Math.pow(vr(), 1.8) * Math.min(G.length, 24)))],
        // [who, profile, browser, window width, installed, visits]
        WHO = [
          [aid('Ben Demo'), 'ra', 'Chrome 140 mobile', 412, 0, 6, 260],
          [aid('Carla Demo'), 'ra', 'Safari 18 mobile', 393, 1, 5, 180],
          [aid('~anon demo1'), 'anon', 'Samsung 27 mobile', 384, 0, 3, 20],
          [aid('~anon demo2'), 'anon', 'Chrome 140 mobile', 360, 1, 2, 12],
          ...[...Array(12)].map((_, i) => [
            aid('~anon demonever' + i),
            i < 4 ? 'staff' : i < 6 ? 'second' : 'curious',
            [
              'Chrome 140',
              'Edge 141',
              'Safari 18',
              'Chrome 140 mobile',
              'Firefox 144',
              'Chrome 140 mobile',
              'Safari 18 mobile',
              'Chrome 140 mobile',
              'Samsung 27 mobile',
              'Chrome 140 mobile',
              'Safari 18 mobile',
              'Chrome 140 mobile'
            ][i],
            [1440, 1680, 820, 800, 1920, 412, 390, 412, 360, 412, 430, 393][i],
            i === 6 ? 1 : 0,
            i < 4 ? vint(4, 8) : i < 6 ? 2 : vint(1, 2),
            0
          ])
        ],
        add = (P, k, n, sec) => {
          const o = (P[k] = P[k] || [0, 0]);
          o[0] += n;
          o[1] += sec;
        };
      let vk = 0;
      WHO.forEach(([who, prof, ua, w, st, nv, na], di) => {
        const dev = 'demovd' + String(di).padStart(2, '0');
        for (let v = 0; v < nv; v++) {
          // At its hour of the day, within the 24 hours before NOW - day days - 2 h: never on the edge of the 7 or 30
          // days whatever the time the demo opens (days 6 and 29 left out), so the page's numbers stay the same.
          const day = vpick([...Array(35).keys()].filter(d => d !== 6 && d !== 29)),
            h = prof === 'staff' ? vint(8, 16) : vpick([7, 12, 13, 18, 19, 20, 21, 22]),
            end = NOW - day * DAY - 2 * 3600e3,
            t0 = new Date(end);
          t0.setHours(h, vint(0, 59), 0, 0);
          let t = t0.getTime() > end ? t0.getTime() - DAY : t0.getTime();
          const P = {},
            g = {};
          let p0 = 'home';
          const sheet = from => {
            const x = gp(),
              sec = vint(30, 200);
            g[x] = g[x] || [0, 0, from, 1];
            g[x][0]++;
            g[x][1] += sec;
            add(P, 'learn.genus', 1, sec);
          };
          if (prof === 'ra') {
            add(P, 'home', 1, vint(5, 30));
            for (let i = vint(1, 3); i--;) sheet(vpick(['learn', 'learn', 'progress']));
            if (vr() < 0.5) add(P, 'learn.look-alikes', 1, vint(60, 300));
            add(P, 'progress', 1, vint(30, 200));
          } else if (prof === 'anon') {
            p0 = v % 2 ? 'identify.key' : 'home';
            if (p0 === 'home') add(P, 'home', 1, vint(5, 20));
            add(P, 'identify.key', 1, vint(120, 500));
            if (vr() < 0.6) add(P, 'learn.look-alikes', 1, vint(60, 240));
          } else if (prof === 'staff') {
            p0 = vr() < 0.6 ? 'identify.key' : 'home';
            if (p0 === 'home') add(P, 'home', 1, vint(5, 25));
            add(P, 'identify.key', vint(1, 2), vint(180, 1100));
            for (let i = vint(0, 3); i--;) sheet(vpick(['learn', 'other', 'other']));
            if (vr() < 0.3) add(P, 'learn.compare', 1, vint(40, 200));
            if (vr() < 0.3) add(P, 'tools.anatomy', 1, vint(60, 300));
          } else if (prof === 'second') {
            p0 = 'fish.home';
            add(P, 'fish.home', 1, vint(10, 40));
            add(P, 'fish.learn.genera', 1, vint(40, 160));
            add(P, 'fish.learn.genus', vint(1, 3), vint(60, 300));
            if (vr() < 0.5) add(P, 'fish.identify.key', 1, vint(30, 120));
          } else {
            add(P, 'home', 1, vint(10, 70));
            if (vr() < 0.7) add(P, 'learn.genera', 1, vint(30, 160));
            if (vr() < 0.4) add(P, 'learn.basics', 1, vint(90, 420));
            if (vr() < 0.5) sheet('learn');
            if (vr() < 0.3) add(P, 'about', 1, vint(15, 90));
          }
          // A long visit was sent in two parts (the app left and opened again): one visit id, two rows.
          const vi = 'demovv' + vk++,
            keys = Object.keys(P),
            parts = keys.length > 2 && vr() < 0.4 ? [keys.slice(0, 2), keys.slice(2)] : [keys];
          const first = parts[0].reduce((a, k) => a + P[k][1], 0);
          events.push([
            'demoevv' + vi,
            t + Math.min(first, 170) * 1000,
            dev,
            'load',
            'cache-mnl9725-MNL',
            '',
            '',
            JSON.stringify({p0, t0: 1.2, nx: keys.find(k => k !== p0) || '', bps: 2000, kb: 900, sw: 1, sv: 0, th: 'light', w, st}),
            '190',
            ua
          ]);
          parts.forEach((K, j) => {
            t += K.reduce((a, k) => a + P[k][1], 0) * 1000 + (j ? 20 * 60e3 : 0);
            pages.push([
              'demopv' + vi + j,
              t,
              dev,
              'pages',
              who,
              '',
              K[0],
              JSON.stringify({
                r: Object.fromEntries(K.map(k => [k, P[k]])),
                g: j || !Object.keys(g).length ? {} : g,
                vi,
                na
              }),
              '190',
              ua
            ]);
          });
        }
      });
      events.sort((a, b) => b[1] - a[1]);
    }
    pages.sort((a, b) => b[1] - a[1]);
    // Another subject's answers (sheet v60 logs every subject's, column Subject): a few players on the second subject's
    // first circle, with its own random numbers so the rest of the demo stays the same. Kept apart (frows): the sheet's
    // own numbers (levels, the replay, the player list's counts) are the replayed subject's only; readAnswers serves both.
    // Ben played it last (his Journey opens on it from Players), Ana a little, Mara once.
    const frows = [],
      FS = SUBJECTS.find(x => !x.replay);
    let fana = [];
    if (V >= 60 && FS) {
      const [fj, fp] = await Promise.all(['fish.json', 'fish-photos.json'].map(f => real(f, {cache: 'no-cache'}).then(r => r.json())));
      let fs = 11;
      const frnd = () => (fs = (fs * 1103515245 + 12345) % 2147483648) / 2147483648,
        // The game's units as the app builds them (core.js fishGen: the book's families), those with photos.
        FG = fishGen(fj, fp.photos).gen,
        E = Object.keys(FG).filter(id => FG[id].circle === 1 && !FG[id].wink && FG[id].views.wide.length),
        fpick = a => a[Math.floor(frnd() * a.length)];
      [
        ['Ben Demo', 0.55, 48, 1.2, NOW - 40 * 60e3],
        ['Ana Demo', 0.8, 30, 4, NOW - 3 * DAY],
        ['Mara Demo', 0.4, 9, 6, NOW - 6 * DAY]
      ].forEach(([name, skill, n, days, end]) =>
        [...Array(n)].forEach((_, i) => {
          // The first half in three sessions over the days before, the second half one session ending at end, 30 s apart.
          const h = Math.ceil(n / 2),
            b = Math.ceil(h / 3),
            t = i < h ? end - days * DAY + (Math.floor(i / b) * days * DAY) / 3 + (i % b) * 30e3 : end - (n - 1 - i) * 30e3,
            g = fpick(E.slice(0, Math.min(E.length, 4 + Math.floor(i / 6)))),
            ch = [g];
          while (ch.length < 4) {
            const x = fpick(E);
            if (!ch.includes(x)) ch.push(x);
          }
          const right = frnd() < skill + Math.min(0.2, i * 0.01),
            ans = right ? g : fpick(ch.slice(1));
          frows.push([
            name,
            Math.round(t),
            g,
            ans,
            right ? 1 : 0,
            'quiz',
            fpick(FG[g].views.wide).f,
            'demof' + frows.length,
            0.6,
            0,
            0,
            ch.join(' '),
            4 + Math.round(frnd() * 80) / 10,
            0,
            null,
            null,
            null,
            null,
            FS.id
          ]);
        })
      );
      // The fish side's Analyses report (one report per subject, sheet v113): the seven made-up analysis players
      // (analysis.js DEMO_PLAYERS) on the fish units with the most photos, about 1,200 answers (a first milestone, as
      // the Action stores one from 1000 fish answers), from analysis.js synth with its known effects. Only the report is
      // made from them (anaReport): the answer log keeps the few fish answers above, so the fish pages stay as they were.
      const FU = Object.keys(FG)
          .filter(id => FG[id].views.wide.length >= 3)
          .slice(0, 24),
        k = 1200 / ANALYSIS.DEMO_PLAYERS.reduce((t, x) => t + x[2], 0);
      fana = ANALYSIS.synth({
        players: ANALYSIS.DEMO_PLAYERS.map(x => [x[0], x[1], Math.ceil(x[2] * k), x[3]]),
        photos: Object.fromEntries(FU.map(id => [id, FG[id].views.wide.slice(0, 8).map(x => ({f: x.f, v: 'wide'}))])),
        look: Object.fromEntries(FU.map(id => [id, FG[id].look || []])),
        start: NOW - 30 * DAY,
        end: NOW - 3 * DAY,
        seed: 5,
        subject: FS.id
      });
    }
    S = {rows, frows, fana, after: [], users, reports, events, pages, removed: [], list, gen, slate: slateOf(D), pools: {}, excluded: []};
    // v81 (Code.gs pools_): each subject's game photos per unit, from the real public files its SUBJECTS pool names.
    if (V >= 81)
      await Promise.all(
        SUBJECTS.filter(X => X.pool).map(X =>
          Promise.all(X.pool.files.map(f => real(f, {cache: 'no-cache'}).then(r => (r.ok ? r.json() : null))))
            .then(F => (S.pools[X.id] = unitPool(X, F)))
            .catch(() => {})
        )
      );

    // Saved progress as the app saves it now: the full replay of each player's answers (core.js replayProgress, with the
    // memory offsets and confusions this demo's stats serve, as the admin replays them), plus the exams the demo passed
    // and each genus's ability. Two stale copies, as real players who have not opened the app since a recalculation:
    // Dio's is from the former model (BKT: L and the last results, no pg) with a genus learned then, which today's rules
    // take back (core.js memRecalc, replayedOf); Ben's was saved 20 answers ago, or more until its progress % reads
    // otherwise than the replay's (Players' ↻ saved mark; 20 answers can round to the same %). The others match the
    // replay (no ↻ mark).
    const st = stats(),
      A = answers().rows,
      // The domain-score bar from the script version that replays it (core.js DOM_SHEET), as the real admin.
      opt = {gen, mem: st.mem, conf: st.conf, fmt: st.fmt || {}, gd: st.gd, dom: V >= DOM_SHEET};
    // Each player's first-launch answer, as the admin's replay takes it (admin.js progOf starts; PR #808: without it one of
    // Ana's genera read stale by a rounding).
    const starts = Object.fromEntries(
        Object.values(users)
          .map(u => [aid(u.name), JSON.parse(u.data['reefid-sync-coral-start'] || 'null')])
          .filter(x => x[1])
      ),
      rep = replayProgress(A, {...opt, starts});
    const savedOf = (u, R) => {
      const old = JSON.parse(u.data['reefid-sync-coral-progress']),
        P = {};
      Object.entries(R).forEach(([g, r]) => {
        if (g === LEVEL) return; // the replay's global level: the demo's copies keep none
        // A mark the game would have taken away at a later miss (core.js keepsMark; the replay's lm) is not in the copy the
        // app saved.
        const o = {...(old[g] || {})};
        if (o.mx && r.lm > o.mx) delete o.mx;
        P[g] =
          u.name === 'Dio Demo'
            ? {ok: r.ok, ko: r.ko, h: r.h, th: o.th || 0, L: Math.round(Math.min(0.97, 0.2 + 0.12 * r.ok) * 100) / 100}
            : {
                ok: r.ok,
                ko: r.ko,
                h: r.h,
                th: o.th || 0,
                ...(domOn(r) ? {dp: r.dp, ds: r.ds} : {pg: r.pg}),
                ps: r.ps,
                off: r.off,
                conf: r.conf,
                pm: 1,
                ...(o.mx ? {mx: o.mx} : {})
              };
      });
      // Dio's best genus was learned under the former model (an exam passed before 2026-11-02: mx 1, no time).
      if (u.name === 'Dio Demo') {
        const best = Object.keys(P).sort((a, b) => P[b].ok - P[a].ok)[0];
        if (best) P[best].mx = 1;
      }
      return P;
    };
    Object.values(users).forEach(u => {
      const id = aid(u.name);
      let P = savedOf(u, (rep[id] || {P: {}}).P);
      if (u.name === 'Ben Demo') {
        // as Players reads it (userList rp): the full replay against the saved copy
        const mine = A.filter(r => r[0] === id).sort((a, b) => a[1] - b[1]),
          start = JSON.parse(u.data['reefid-sync-coral-start'] || 'null'),
          full = replayProgress(mine, {...opt, starts: start ? {[id]: start} : {}})[id];
        for (let back = 20; back < mine.length; back += 10) {
          const cut = mine[mine.length - 1 - back][1];
          P = savedOf(
            u,
            replayProgress(
              mine.filter(r => r[1] <= cut),
              opt
            )[id].P
          );
          if (pctOf(replayedOf(full, P), S.slate) !== pctOf(P, S.slate)) break;
        }
      }
      u.data['reefid-sync-coral-progress'] = JSON.stringify(P);
      u.learned = list.filter(g => P[g] && P[g].mx).length;
    });
    return S;
  }
  // Anonymous id of a name, as Code.gs aid_ (8 characters, no name in it); here a plain hash, there is no secret to keep.
  const aid = name => {
    let h = 2166136261;
    for (const c of String(name).trim().toLowerCase()) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    return 'd' + h.toString(36).padStart(7, '0').slice(0, 7);
  };
  const lc = s =>
    String(s || '')
      .trim()
      .toLowerCase();
  function answers() {
    const out = {ok: true, rows: [], players: {}, me: aid(ME)},
      arch = new Set(
        Object.values(S.users)
          .filter(u => u.board === -2)
          .map(u => lc(u.name))
      ); // v58: archives, flag 2
    // Index 11: answered without signing in (sheet v17), so trustOf leaves it out of the photo ratings as the sheet does.
    // 12, 13 (sheet v23): seconds to answer and enlarged, null when not logged.
    out.rows = [...S.rows, ...S.after].map(r => [
      aid(r[0]),
      r[1],
      r[2],
      r[3],
      r[4],
      r[5],
      r[6],
      r[8],
      r[9],
      r[10],
      r[11],
      /^~anon /.test(r[0]) ? 1 : /^~deleted /.test(r[0]) || arch.has(lc(r[0])) ? 2 : 0, // v55/v58: a deleted account's or an archive's
      r[12] ?? null,
      r[13] ?? null
    ]);
    // v60: the other subject's answers, the subject at index 17 (core.js LOG_SUBJ). The answers given while the page is
    // open (DEMO_ANSWER, S.after) are the tab's last rows: moved after them.
    const after = out.rows.splice(S.rows.length);
    S.frows.forEach(r =>
      out.rows.push([aid(r[0]), r[1], r[2], r[3], r[4], r[5], r[6], r[8], r[9], r[10], r[11], 0, r[12], r[13], null, null, null, r[18]])
    );
    out.rows.push(...after);
    Object.values(S.users).forEach(u => {
      if (arch.has(lc(u.name))) return; // v58: an archive is no player
      const P = JSON.parse(u.data['reefid-sync-coral-progress'] || '{}'),
        th = {};
      Object.keys(P).forEach(g => (th[g] = P[g].th));
      out.players[aid(u.name)] = [u.learned, u.seen, u.total, th];
    });
    if (V >= EXCL_SHEET) out.excluded = S.excluded.slice(); // Code.gs sxSet_: the ids left out of the statistics
    return out;
  }
  // The admin's light read (Code.gs live_, from admin.js LIVE_SHEET; Pierre, 2026-11-08): the log's last 50 rows as
  // answers() serves them, each player's last answer time (an archive's and a deleted account's left out), the rows.
  function liveReply() {
    const R = answers().rows,
      last = {};
    R.forEach(r => r[11] !== 2 && r[1] > (last[r[0]] || 0) && (last[r[0]] = r[1]));
    return {ok: true, rows: R.slice(-50), last, n: R.length, k: Math.min(R.length, 50)};
  }
  // A demo player answers now (tests/admin.smoke.js: Activity's light read brings it): a copy of their last answer, at
  // this time, as the tab's last row.
  window.DEMO_ANSWER = (name = 'Carla Demo') => {
    const L = [...S.rows, ...S.after].filter(r => r[0] === name).sort((a, b) => a[1] - b[1]),
      r = L[L.length - 1].slice();
    r[1] = Date.now();
    r[7] = 'live' + S.after.length;
    S.after.push(r);
  };
  function stats() {
    // The Analyses group's made-up players (demoLog) stay out of the photo ratings and confusions: the other pages'
    // numbers (the full replay on Players, the journeys) stay those of the original demo. They have a level like anyone.
    const more = new Set(ANALYSIS.DEMO_PLAYERS.map(p => aid(p[0]))),
      all = answers().rows,
      A = all.filter(r => !more.has(r[0])),
      ras = {};
    all.forEach(r => {
      const x = (ras[r[0]] = ras[r[0]] || [0, 0, 0]);
      x[1]++;
      x[2] += r[4];
    });
    Object.keys(ras).forEach(k => {
      const [, n, right] = ras[k],
        p = (right + 1) / (n + 2);
      ras[k] = [Math.round(Math.log(p / (1 - p)) * 100) / 100, n];
    });
    // v68: the per-format offsets (core.js fmtOffsetsOf), from a demo script of that version (?v=68).
    return {
      ok: true,
      photos: eloOf(A),
      ras,
      conf: confusionOf(A).pair,
      ...photoMemOf(A),
      gd: genusOffsetsOf(A),
      ...(V >= FMT_SHEET ? {fmt: fmtOffsetsOf(A)} : {})
    };
  }
  function userList() {
    const by = {},
      // v58 (Code.gs users_ archived): the archives apart, read-only
      archived = Object.values(S.users)
        .filter(u => u.board === -2)
        .map(u => ({
          name: u.name,
          id: aid(u.name),
          time: u.updated,
          answers: S.rows.filter(r => lc(r[0]) === lc(u.name)).length,
          reports: S.reports.filter(r => lc(r[2] || '') === lc(u.name)).length
        }));
    Object.values(S.users).forEach(u => {
      if (u.board === -2) return;
      by[lc(u.name)] = {
        name: u.name,
        board: u.board ?? 1,
        id: aid(u.name),
        updated: u.updated,
        learned: u.learned,
        seen: u.seen,
        total: u.total,
        review: u.review,
        answers: 0,
        right: 0,
        first: 0,
        last: 0,
        days: 0,
        modes: {},
        recent: [0, 0],
        mix: [],
        reports: 0,
        size: JSON.stringify(u.data).length,
        ...(V >= 48 ? {groups: (u.groups || []).slice()} : {})
      };
    });
    const days = {},
      mix = {},
      last = {};
    S.rows.forEach(r => {
      const u = by[lc(r[0])];
      if (!u) return;
      const k = lc(u.name),
        t = r[1],
        good = r[4],
        mode = String(r[5]).split('|')[0] || '?';
      u.answers++;
      u.right += good;
      if (!u.first || t < u.first) u.first = t;
      if (t > u.last) u.last = t;
      (days[k] = days[k] || {})[new Date(t + 8 * 36e5).toISOString().slice(0, 10)] = 1;
      const md = (u.modes[mode] = u.modes[mode] || [0, 0]);
      md[0]++;
      md[1] += good;
      (last[k] = last[k] || []).push([t, good]);
      if (!good && r[3] && r[3] !== r[2]) {
        const x = (mix[k] = mix[k] || {}),
          key = r[2] + '|' + r[3];
        x[key] = (x[key] || 0) + 1;
      }
    });
    Object.keys(by).forEach(k => {
      const u = by[k],
        L = (last[k] || []).sort((a, b) => a[0] - b[0]).slice(-50);
      u.days = Object.keys(days[k] || {}).length;
      u.recent = [L.length, L.reduce((t, x) => t + x[1], 0)];
      u.mix = Object.keys(mix[k] || {})
        .map(x => x.split('|').concat([mix[k][x]]))
        .sort((a, b) => b[2] - a[2])
        .slice(0, 5);
    });
    S.reports.forEach(r => {
      const u = by[lc(r[2])];
      if (u) u.reports++;
    });
    // v42 (Code.gs replayedAll_): each player's full replay, [progress %, learned, the saved copy's %] over the slate.
    if (V >= 42) {
      const st = stats(),
        A = answers().rows;
      Object.keys(by).forEach(k => {
        const su = S.users[k],
          id = aid(su.name),
          json = x => JSON.parse(su.data[x] || 'null'),
          P = json('reefid-sync-coral-progress') || {},
          start = json('reefid-sync-coral-start'),
          rep = replayProgress(
            A.filter(r => r[0] === id),
            {gen: S.gen, mem: st.mem, conf: st.conf, fmt: st.fmt || {}, gd: st.gd, dom: V >= DOM_SHEET, starts: start ? {[id]: start} : {}}
          )[id],
          G = replayedOf(rep, P);
        by[k].rp = [pctOf(G, S.slate), learnedOf(G, S.slate), pctOf(P, S.slate)];
      });
    }
    // v81 (Code.gs exposure_): each player's photo exposure per subject, ex {subject id: [seen, of, hit, asked, units]}.
    if (V >= 81)
      SUBJECTS.forEach(X => {
        if (!S.pools[X.id]) return;
        const E = exposureOf(
          subjRows(S.rows, X.id).map(r => [lc(r[0]), r[1], r[2], r[3], r[4], r[5], r[6]]),
          S.pools[X.id]
        );
        Object.keys(E).forEach(k => by[k] && ((by[k].ex = by[k].ex || {})[X.id] = E[k]));
      });
    return {
      ok: true,
      users: Object.values(by),
      removed: S.removed.slice().reverse(),
      ...(V >= 58 ? {archived} : {}),
      ...(V >= EXCL_SHEET ? {excluded: S.excluded.slice()} : {})
    };
  }
  function users(p) {
    // Sheet v48: a beta subject's group (Code.gs groupSet_): players in or out, existing players only, each once.
    if (p.userGroup && V >= 48) {
      const g = String(p.group || ''),
        L = Array.isArray(p.userGroup) ? p.userGroup : [p.userGroup];
      if (!SUBJECTS.some(x => subjGroup(x) && x.id === g)) return {ok: false, error: 'group'};
      if (!Array.isArray(p.userGroup) && !S.users[lc(L[0])]) return {ok: false, error: 'user'};
      let n = 0;
      L.forEach(x => {
        const u = S.users[lc(x)];
        if (!u || (u.groups || []).includes(g) === !!p.on) return;
        u.groups = p.on ? [...(u.groups || []), g] : u.groups.filter(y => y !== g);
        n++;
      });
      return {ok: true, group: g, n, members: Object.values(S.users).filter(u => (u.groups || []).includes(g)).length};
    }
    // Sheet v58 (was rename, v20): archive (the record moves apart, Board -2, out of every beta group).
    if (p.userArchive && V >= 58) {
      const m = p.userArchive,
        u = S.users[lc(m.from || '')],
        into = String(m.into || '').trim();
      if (!u || !into) return {ok: false, error: 'user'};
      if (S.users[lc(into)]) return {ok: false, error: 'exists'};
      const from = u.name;
      delete S.users[lc(from)];
      if ((u.board ?? 1) === -2) return {ok: false, error: 'archived'};
      S.users[lc(into)] = {...u, name: into, board: -2, groups: []};
      let answers = 0;
      S.rows.forEach(r => lc(r[0]) === lc(from) && ((r[0] = into), answers++));
      S.reports.forEach(r => lc(r[2] || '') === lc(from) && (r[2] = into));
      return {ok: true, answers, reports: 0};
    }
    // Sheet v115 (Code.gs statsExclude, sxPut_): an id left out of the statistics, or counted again.
    if (p.statsExclude && V >= EXCL_SHEET) {
      const id = String(p.statsExclude);
      if (!/^[A-Za-z0-9+/]{8}$/.test(id)) return {ok: false, error: 'input'};
      S.excluded = p.on ? [...new Set([...S.excluded, id])] : S.excluded.filter(x => x !== id);
      return {ok: true, excluded: S.excluded.slice()};
    }
    // Sheet v20: hidden from the leaderboard by an admin (-1) or shown (1).
    if (p.userBoard) {
      const u = S.users[lc(p.userBoard)];
      if (!u) return {ok: false, error: 'user'};
      u.board = p.hide ? -1 : 1;
      return {ok: true, board: u.board};
    }
    // Sheet v99: Change the starting answer (Code.gs users_ userStart, the same core.js startAdminSet), with ?demo&v=99.
    if (p.userStart) {
      const u = S.users[lc(p.userStart)];
      if (!u) return {ok: false, error: 'user'};
      const out = startAdminSet(u.data, String(p.s || ''), String(p.c || ''), Date.now());
      if (!out) return {ok: false, error: 'none'};
      u.data = out.data;
      u.rev++;
      return {ok: true, rev: u.rev, start: out.start};
    }
    if (p.userData) {
      const u = S.users[lc(p.userData)];
      return u ? {ok: true, rev: u.rev, data: JSON.parse(JSON.stringify(u.data))} : {ok: false, error: 'user'};
    }
    if (Array.isArray(p.anonDelete)) {
      const ids = new Set(p.anonDelete.map(String)),
        n = S.rows.length;
      S.rows = S.rows.filter(r => !(/^~(anon|deleted) /.test(r[0]) && ids.has(aid(r[0]))));
      return {ok: true, answers: n - S.rows.length};
    }
    if (p.userDelete) {
      const u = S.users[lc(p.userDelete)];
      if (!u) return {ok: false, error: 'user'};
      // Sheet v55 (Code.gs deleteAccount_): everything goes, or the answers and reports stay as "~deleted <id>", never
      // verified; the page summaries go either way.
      const k = lc(u.name),
        del = '~deleted ' + aid(u.name),
        mine = S.rows.filter(r => lc(r[0]) === k),
        reps = S.reports.filter(r => lc(r[2] || '') === k);
      if (p.answers) S.rows = S.rows.filter(r => lc(r[0]) !== k);
      else mine.forEach(r => (r[0] = del));
      if (p.answers) S.reports = S.reports.filter(r => lc(r[2] || '') !== k);
      else reps.forEach(r => ((r[2] = del), (r[3] = 0)));
      delete S.users[k];
      S.removed.push({name: u.name, into: '', time: Date.now()});
      return {ok: true, answers: mine.length, reports: reps.length};
    }
    if (p.userMerge) {
      const m = p.userMerge,
        a = S.users[lc(m.from)],
        b = S.users[lc(m.into)];
      if (!a || !b || a === b || !m.data || typeof m.data !== 'object') return {ok: false, error: 'user'};
      if (typeof m.at === 'number' && m.at !== b.rev) return {ok: false, error: 'stale', rev: b.rev};
      b.data = m.data;
      b.rev++;
      if (a.groups) b.groups = [...new Set([...(b.groups || []), ...a.groups])]; // v48: the merged name's beta groups join
      b.updated = Date.now();
      let answers = 0,
        reports = 0;
      S.rows.forEach(r => lc(r[0]) === lc(a.name) && ((r[0] = b.name), answers++));
      S.reports.forEach(r => lc(r[2]) === lc(a.name) && ((r[2] = b.name), reports++));
      delete S.users[lc(a.name)];
      S.removed.push({name: a.name, into: b.name, time: Date.now()});
      return {ok: true, rev: b.rev, answers, reports};
    }
    return userList();
  }
  // The published curation.json, as the GitHub contents API gives it; Publish replaces it here, in memory only.
  let CUR = null,
    SHA = 1;
  const b64 = s => btoa(unescape(encodeURIComponent(s)));
  async function github(path, opts) {
    if (path === '' || path === '/') return ok({full_name: 'demo', permissions: {push: true}});
    if (/^\/contents\/curation\.json/.test(path)) {
      if (CUR === null) CUR = await real('curation.json', {cache: 'no-cache'}).then(r => (r.ok ? r.text() : '{}'));
      if ((opts.method || 'GET') === 'PUT') {
        const b = JSON.parse(opts.body);
        CUR = decodeURIComponent(escape(atob(b.content)));
        SHA++;
        console.info('[demo] Publish kept in memory only:', b.message);
      }
      return ok({sha: 'demo' + SHA, content: b64(CUR), ...((opts.method || 'GET') === 'PUT' ? {content: {sha: 'demo' + SHA}} : {})});
    }
    return new Response(JSON.stringify({message: 'Not Found (demo)'}), {status: 404});
  }
  // The demo's Analyses report, as the GitHub Action would store it (tools/analyses.js): computed once, in a Web Worker,
  // on the demo's answers (no bootstrap, so it is quick), from the moment the demo is built.
  let ANA_META = null;
  const ANA = {};
  // subject: the one asked (v113, ANALYSIS.AN_SUBJ_SHEET: one report per subject); an older script knows the corals' only
  // and answers with it whatever the subject asked (?demo&v=112).
  const anaReport = (head, subject) => {
    const per = V >= ANALYSIS.AN_SUBJ_SHEET,
      sj = per && subject && SUBJECTS.some(x => x.id === subject) ? subject : replaySubject(),
      own = sj === replaySubject();
    ANA[sj] =
      ANA[sj] ||
      new Promise(done => {
        const w = new Worker(document.querySelector('script[src^="analysis.js"]').getAttribute('src'));
        w.onmessage = e => {
          if (e.data && e.data.prog) return;
          w.terminate();
          done(e.data && e.data.res ? JSON.stringify({...e.data.res, ...(V >= 105 ? {subject: sj} : {})}) : null);
        };
        // one subject's answers, as the Action reads them (tools/analyses.js: core.js subjRows): the corals' with their
        // photo features; the fish report's made-up answers (S.fana), no photo features (core.js SUBJECTS analyses)
        const rows = own ? subjRows(answers().rows) : S.fana.map(r => [aid(r[0]), ...r.slice(1)]);
        w.postMessage({id: 1, rows, meta: own ? ANA_META : {ph: {}}, B: 0, seed: 1});
      });
    return ANA[sj].then(text => {
      // v105 (Code.gs analyses_): each subject's answers counted apart (counts) and answers the corals'; before it,
      // answers was every row of every subject, the fish ones included (?demo&v=104: the admin counts from the log).
      // The fish report's made-up answers count as fish answers too.
      const rows = answers().rows,
        c0 = subjCounts(rows),
        counts = {...c0, ...(S.fana.length ? {[S.fana[0][17]]: (c0[S.fana[0][17]] || 0) + S.fana.length} : {})},
        head0 = V >= 105 ? {ok: true, subject: sj, answers: counts[sj], counts} : {ok: true, answers: rows.length},
        r = text && JSON.parse(text);
      const stored = r
        ? {answers: r.answers, made: r.made, av: r.AV, size: text.length, at: r.made, ...(V >= 105 ? {subject: sj} : {})}
        : null;
      return head || !text ? {...head0, stored} : {...head0, stored, report: text};
    });
  };
  const demoFetch = async (u, opts) => {
    const url = String(u && u.url ? u.url : u);
    if (url.startsWith('https://api.github.com/user')) return ok({login: 'demo'});
    if (url.startsWith('https://api.github.com/repos/'))
      return github(url.replace(/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/?]+/, ''), opts);
    if (url.startsWith('https://script.google.com/')) {
      await build();
      await new Promise(r => setTimeout(r, 150)); // a little of the real wait, so "Loading…" states show
      // ?demo&slow=stats: the photo ratings answer a second after the rest (tests/admin.smoke.js: the answer log is not
      // published before them).
      if (/[?&]slow=stats\b/.test(location.search) && /readStats|[?&]stats=/.test(String(opts.body || '') + url))
        await new Promise(r => setTimeout(r, 1000));
      if ((opts.method || 'GET') !== 'POST') {
        const q = new URL(url).searchParams;
        return ok(q.get('stats') ? stats() : q.get('answers') ? answers() : {ok: false, error: 'input'});
      }
      const p = JSON.parse(opts.body || '{}');
      if (p.readReports) return ok({ok: true, rows: S.reports.map(r => r.slice())});
      // pages: 1 (v30) reads the Pages tab; an older script ignores it and sends the other events.
      if (p.readEvents) return ok({ok: true, rows: (p.pages && V >= 30 ? S.pages : S.events).map(r => r.slice())});
      if (p.readAnswers) return ok(answers());
      if (p.readStats) return ok(stats());
      // The light read (admin.js LIVE_SHEET): an older script takes it for a progress write without a name ('input').
      if (p.readLive) return ok(V >= LIVE_SHEET ? liveReply() : {ok: false, error: 'input'});
      // v35: the stored Analyses report. A script before v35 answers 'input' (?demo&v=30: the admin shows no report).
      if (p.analysesGet) return ok(V < 35 ? {ok: false, error: 'input'} : await anaReport(p.head, p.subject));
      if (
        p.users ||
        p.userData ||
        p.userDelete ||
        p.userMerge ||
        p.anonDelete ||
        p.userBoard ||
        (p.userArchive && V >= 58) ||
        (p.userStart && V >= 99) ||
        (p.statsExclude && V >= EXCL_SHEET) ||
        (p.userGroup && V >= 48)
      )
        return ok(users(p));
      return ok({ok: false, error: 'demo'});
    }
    if (/^https?:/.test(url) && !url.startsWith(location.origin)) return Promise.reject(new TypeError('Blocked in demo mode'));
    return real(u, opts);
  };
  // Calls in flight through the demo (its sync script and GitHub answers, and the site's own files): tests/admin.smoke.js
  // waits for none before reading a page, the way the app's tests wait for APP_READY, instead of a fixed time.
  window.DEMO_PENDING = 0;
  // The sync script calls, in order: {k: what was asked, t0: sent, t1: answered} (performance.now()). tests/admin.smoke.js
  // checks that a read on its way is not asked again and that the reads leave without waiting for the data files.
  window.DEMO_CALLS = [];
  const kindOf = (url, opts) => {
    if ((opts.method || 'GET') !== 'POST') return new URL(url).searchParams.get('stats') ? 'stats' : 'get';
    const p = JSON.parse(opts.body || '{}');
    return p.readAnswers
      ? 'answers'
      : p.readStats
        ? 'stats'
        : p.readEvents
          ? p.pages
            ? 'pages'
            : 'events'
          : p.readReports
            ? 'reports'
            : Object.keys(p)
                .filter(k => k !== 'token')
                .join(',');
  };
  window.fetch = async (u, opts = {}) => {
    window.DEMO_PENDING++;
    const url = String(u && u.url ? u.url : u),
      c = url.startsWith('https://script.google.com/') ? {k: kindOf(url, opts), t0: performance.now()} : null;
    if (c) window.DEMO_CALLS.push(c);
    try {
      return await demoFetch(u, opts);
    } finally {
      window.DEMO_PENDING--;
      if (c) c.t1 = performance.now();
    }
  };
  // A banner on every page: this is not the real admin.
  const bar = document.createElement('p');
  bar.className = 'adm-demo';
  bar.setAttribute('role', 'status');
  bar.innerHTML = '<b>Demo</b> · made-up players, answers and reports; nothing is sent or kept. <a href="admin.html">Leave the demo</a>';
  document.body.prepend(bar);
})();
