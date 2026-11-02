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
    ok = o => new Response(JSON.stringify({v: 19, ...o}), {status: 200, headers: {'Content-Type': 'application/json'}});
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
      look = n => (gen[n].look || []).filter(x => pics[x]);
    const rows = [],
      users = {};
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
          start = NOW - (d0 - ((d0 - d1) * i) / Math.max(1, n - 1)) * DAY - Math.floor(rnd() * 3600e3);
          j = 0;
        }
        left--;
        const t = Math.min(NOW - 60e3, start + j++ * (20e3 + Math.floor(rnd() * 20e3))),
          g = pick(G),
          duel = rnd() < 0.2,
          traps = look(g),
          others = G.filter(x => x !== g);
        const ch = [g];
        while (ch.length < (duel ? 2 : 4)) {
          const x = traps.length && rnd() < 0.6 ? pick(traps) : pick(others);
          if (!ch.includes(x)) ch.push(x);
        }
        const st = (P[g] = P[g] || {ok: 0, ko: 0, h: '', th: 0, L: 0.2});
        const right = rnd() < skill + Math.min(0.25, (st.ok + st.ko) * 0.02),
          ans = right ? g : pick(ch.slice(1)),
          p = pick(pics[g]),
          same = pics[g].filter(x => x.o && x.o === p.o && x.f !== p.f),
          ph = [p, ...same.slice(0, Math.floor(rnd() * 3))].map(x => x.f).join(' ');
        st[right ? 'ok' : 'ko']++;
        st.h = (st.h + (right ? 1 : 0)).slice(-10);
        st.th = Math.round((st.th + (right ? 0.15 : -0.1)) * 100) / 100;
        st.L = Math.min(1, st.L + (right ? 0.08 : 0));
        const id = 'demo' + (k++).toString(36);
        rows.push([
          name,
          t,
          g,
          ans,
          right ? 1 : 0,
          duel ? 'quiz-duel' : 'quiz',
          ph,
          id,
          0.6,
          st.th,
          0,
          ch.sort(() => rnd() - 0.5).join(' ')
        ]);
      }
      const learned = Object.values(P).filter(s => s.L >= 0.6).length;
      users[name.toLowerCase()] = {
        name,
        updated: NOW - d1 * DAY,
        learned,
        seen: Object.keys(P).length,
        total: list.length,
        review: Object.keys(P)
          .filter(g => P[g].ko > P[g].ok)
          .slice(0, 4)
          .join(', '),
        rev: 3,
        data: {'imr-coral-progress': JSON.stringify(P), 'imr-coral-settings': '{}'}
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
        null,
        null,
        null,
        ''
      ]);
    }
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
    const events = [];
    for (let i = 0; i < 24; i++) {
      const r = ['ok', 'ok', 'hard', 'easy', 'ok', 'hard'][i % 6];
      events.push([
        'demoev' + i,
        NOW - i * 7 * 3600e3,
        'demodev' + (i % 5),
        'pulse',
        r,
        '',
        'quiz',
        JSON.stringify({r, m: 'quiz', n: 10 + i, rr: r === 'hard' ? 40 : r === 'easy' ? 100 : 80, lv: -1.2 + (i % 5) * 0.5, met: 6 + i}),
        '159',
        'Chrome 140 mobile'
      ]);
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
    events.sort((a, b) => b[1] - a[1]);
    S = {rows, users, reports, events, removed: [], list};
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
    out.rows = S.rows.map(r => [aid(r[0]), r[1], r[2], r[3], r[4], r[5], r[6], r[8], r[9], r[10], r[11], /^~anon /.test(r[0]) ? 1 : 0]);
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
    return {ok: true, photos: eloOf(A), ras, conf: confusionOf(A).pair};
  }
  function userList() {
    const by = {};
    Object.values(S.users).forEach(u => {
      by[lc(u.name)] = {
        name: u.name,
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
      if (p.users || p.userData || p.userDelete || p.userMerge || p.anonDelete) return ok(users(p));
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
