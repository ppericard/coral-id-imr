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
    // The script version the demo answers as: the current one (v28: the admin shows the full replay, admin.js replayOn),
    // or an older one with ?demo&v=27 (tests/admin.smoke.js: the admin then does what it did before; AGENTS.md 7a).
    V = Number((/[?&]v=(\d+)/.exec(location.search) || [])[1]) || 28,
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
  const build = () => (BUILD = BUILD || make());
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
      // quiz, duels and typed answers), a device not signed in that stopped 12 minutes ago.
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
          ch.sort(() => rnd() - 0.5).join(' '),
          // Seconds to answer and a photo enlarged (sheet v23), from the answer's number (the random draws stay the same).
          Math.round((3 + ((k * 37) % 120) / 10 + (right ? 0 : 5)) * 10) / 10,
          k % 7 ? 0 : 1
        ]);
      }
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
              fb: {'imr-hi': [20, at(20)]},
              h: [
                ['imr', 0, at(0), 'tour'],
                ['know', 20, at(20), 'fallback']
              ]
            }
          : name === 'Ben Demo'
            ? {c: 'new', t: at(0), at: 0, via: 'card', n: 20, s: -4.6, fb: {'new-lo': [20, at(20)]}, h: [['new', 0, at(0), 'card']]}
            : {c: 'imr', t: at(0), at: 0, via: 'tour', n: 20, s: 0.4, fb: {}, h: [['imr', 0, at(0), 'tour']]};
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
          'imr-coral-progress': JSON.stringify(P),
          'imr-coral-settings': '{}',
          'imr-coral-intro': JSON.stringify(intro),
          ...(offer ? {'imr-coral-intro-offer': JSON.stringify(offer)} : {}),
          'imr-coral-start': JSON.stringify(st0)
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
        '#quiz'
      ),
      rp(1, 'Carla Demo', 'multi', g2, '', '', 'Demo report: two colonies in this photo.', 'quiz', pics[g2][0].f, '#quiz'),
      rp(2, '', 'photo', g3, '', '', 'Demo report: blurry (sent without signing in).', 'photo', pics[g3][0].f, '#' + g3),
      rp(3, 'Dio Demo', 'info', g2, '', '', 'Demo feedback: a typo on this sheet.', 'sheet', '', '#' + g2),
      rp(4, 'Ana Demo', 'idea', '', '', '', 'Demo feedback: a timer in the quiz?', 'feedback', '', '#home')
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
        'quiz',
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
        'quiz-duel',
        '',
        '158',
        'Safari 18 mobile'
      ],
      ['demoevc', NOW - 5 * 3600e3, 'demodev3', 'photo', pics[g1][0].f, '', 'quiz', '', '159', 'Samsung 27 mobile'],
      ['demoevd', NOW - 9 * 3600e3, 'demodev4', 'sync', 'save failed: Failed to fetch', '', 'quiz', '', '159', 'Chrome 140 mobile']
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
        'quiz',
        JSON.stringify({p0: 'home', t0, qo, q1, nx: 'quiz', bps, kb, sw, sv, th, w, st: sw}),
        '170',
        ua
      ])
    );
    events.sort((a, b) => b[1] - a[1]);
    S = {rows, users, reports, events, removed: [], list};
    // Saved progress as the app saves it now: the full replay of each player's answers (core.js replayProgress, with the
    // memory offsets and confusions this demo's stats serve, as the admin replays them), plus the exams the demo passed
    // and each genus's ability. Two stale copies, as real players who have not opened the app since a recalculation:
    // Dio's is from the former model (BKT: L and the last results, no pg) with a genus learned then, which today's rules
    // take back (core.js memRecalc, replayedOf); Ben's was saved 20 answers ago. The others match the replay (no ↻ mark).
    const st = stats(),
      A = answers().rows,
      cut = Object.fromEntries(Object.values(users).map(u => [aid(u.name), Infinity]));
    const benRows = A.filter(r => r[0] === aid('Ben Demo')).sort((a, b) => a[1] - b[1]);
    cut[aid('Ben Demo')] = benRows[benRows.length - 21][1];
    const rep = replayProgress(
      A.filter(r => !(r[1] > cut[r[0]])),
      {gen, mem: st.mem, conf: st.conf}
    );
    Object.values(users).forEach(u => {
      const old = JSON.parse(u.data['imr-coral-progress']),
        R = (rep[aid(u.name)] || {P: {}}).P,
        P = {};
      Object.entries(R).forEach(([g, r]) => {
        if (g === LEVEL) return; // the replay's global level: the demo's copies keep none
        // A mark the game would have taken away at a later miss (core.js mxKeeps; the replay's lm) is not in the copy the
        // app saved.
        const o = {...(old[g] || {})};
        if (o.mx && r.lm > o.mx) delete o.mx;
        P[g] =
          u.name === 'Dio Demo'
            ? {ok: r.ok, ko: r.ko, h: r.h, th: o.th || 0, L: Math.round(Math.min(0.97, 0.2 + 0.12 * r.ok) * 100) / 100}
            : {ok: r.ok, ko: r.ko, h: r.h, th: o.th || 0, pg: r.pg, ps: r.ps, off: r.off, conf: r.conf, pm: 1, ...(o.mx ? {mx: o.mx} : {})};
      });
      // Dio's best genus was learned under the former model (an exam passed before 2026-11-02: mx 1, no time).
      if (u.name === 'Dio Demo') {
        const best = Object.keys(P).sort((a, b) => P[b].ok - P[a].ok)[0];
        if (best) P[best].mx = 1;
      }
      u.data['imr-coral-progress'] = JSON.stringify(P);
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
    const out = {ok: true, rows: [], players: {}, me: aid(ME)};
    // Index 11: answered without signing in (sheet v17), so trustOf leaves it out of the photo ratings as the sheet does.
    // 12, 13 (sheet v23): seconds to answer and enlarged, null when not logged.
    out.rows = S.rows.map(r => [
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
      /^~anon /.test(r[0]) ? 1 : 0,
      r[12] ?? null,
      r[13] ?? null
    ]);
    Object.values(S.users).forEach(u => {
      const P = JSON.parse(u.data['imr-coral-progress'] || '{}'),
        th = {};
      Object.keys(P).forEach(g => (th[g] = P[g].th));
      out.players[aid(u.name)] = [u.learned, u.seen, u.total, th];
    });
    return out;
  }
  function stats() {
    const A = answers().rows,
      ras = {};
    A.forEach(r => {
      const x = (ras[r[0]] = ras[r[0]] || [0, 0, 0]);
      x[1]++;
      x[2] += r[4];
    });
    Object.keys(ras).forEach(k => {
      const [, n, right] = ras[k],
        p = (right + 1) / (n + 2);
      ras[k] = [Math.round(Math.log(p / (1 - p)) * 100) / 100, n];
    });
    return {ok: true, photos: eloOf(A), ras, conf: confusionOf(A).pair, ...photoMemOf(A)};
  }
  function userList() {
    const by = {};
    Object.values(S.users).forEach(u => {
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
        size: JSON.stringify(u.data).length
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
    return {ok: true, users: Object.values(by), removed: S.removed.slice().reverse()};
  }
  function users(p) {
    // Sheet v20: rename (the record moves, hidden from the leaderboard).
    if (p.userRename) {
      const m = p.userRename,
        u = S.users[lc(m.from || '')],
        into = String(m.into || '').trim();
      if (!u || !into) return {ok: false, error: 'user'};
      if (S.users[lc(into)]) return {ok: false, error: 'exists'};
      const from = u.name;
      delete S.users[lc(from)];
      S.users[lc(into)] = {...u, name: into, board: -1};
      let answers = 0;
      S.rows.forEach(r => lc(r[0]) === lc(from) && ((r[0] = into), answers++));
      S.reports.forEach(r => lc(r[2] || '') === lc(from) && (r[2] = into));
      return {ok: true, answers, reports: 0};
    }
    // Sheet v20: hidden from the leaderboard by an admin (-1) or shown (1).
    if (p.userBoard) {
      const u = S.users[lc(p.userBoard)];
      if (!u) return {ok: false, error: 'user'};
      u.board = p.hide ? -1 : 1;
      return {ok: true, board: u.board};
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
      const k = lc(u.name),
        mine = S.rows.filter(r => lc(r[0]) === k);
      if (p.answers) S.rows = S.rows.filter(r => lc(r[0]) !== k);
      else mine.forEach(r => (r[0] = '~deleted ' + aid(u.name)));
      delete S.users[k];
      S.removed.push({name: u.name, into: '', time: Date.now()});
      return {ok: true, answers: mine.length};
    }
    if (p.userMerge) {
      const m = p.userMerge,
        a = S.users[lc(m.from)],
        b = S.users[lc(m.into)];
      if (!a || !b || a === b || !m.data || typeof m.data !== 'object') return {ok: false, error: 'user'};
      if (typeof m.at === 'number' && m.at !== b.rev) return {ok: false, error: 'stale', rev: b.rev};
      b.data = m.data;
      b.rev++;
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
  window.fetch = async (u, opts = {}) => {
    const url = String(u && u.url ? u.url : u);
    if (url.startsWith('https://api.github.com/user')) return ok({login: 'demo'});
    if (url.startsWith('https://api.github.com/repos/'))
      return github(url.replace(/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/?]+/, ''), opts);
    if (url.startsWith('https://script.google.com/')) {
      await build();
      await new Promise(r => setTimeout(r, 150)); // a little of the real wait, so "Loading…" states show
      if ((opts.method || 'GET') !== 'POST') {
        const q = new URL(url).searchParams;
        return ok(q.get('stats') ? stats() : q.get('answers') ? answers() : {ok: false, error: 'input'});
      }
      const p = JSON.parse(opts.body || '{}');
      if (p.readReports) return ok({ok: true, rows: S.reports.map(r => r.slice())});
      if (p.readEvents) return ok({ok: true, rows: S.events.map(r => r.slice())});
      if (p.readAnswers) return ok(answers());
      if (p.readStats) return ok(stats());
      if (p.users || p.userData || p.userDelete || p.userMerge || p.anonDelete || p.userBoard || p.userRename) return ok(users(p));
      return ok({ok: false, error: 'demo'});
    }
    if (/^https?:/.test(url) && !url.startsWith(location.origin)) return Promise.reject(new TypeError('Blocked in demo mode'));
    return real(u, opts);
  };
  // A banner on every page: this is not the real admin.
  const bar = document.createElement('p');
  bar.className = 'adm-demo';
  bar.setAttribute('role', 'status');
  bar.innerHTML = '<b>Demo</b> · made-up players, answers and reports; nothing is sent or kept. <a href="admin.html">Leave the demo</a>';
  document.body.prepend(bar);
})();
