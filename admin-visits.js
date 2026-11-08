// Players › Visits (Pierre, 2026-11-08, Q301-Q304, on the mockup "layout A" of the study of activity outside the quiz):
// who opens the app and what for, games or not, signed in or not, from data already logged (no app change, no sheet
// bump): the pages-opened summaries of the sheet's Pages tab (sheet v30, admin.js loadPages, one or more rows a visit)
// and the once-a-visit `load` rows of its Events tab (admin.js loadEvents: the first page, the window width, installed
// or not), joined to the answer log (who ever answered) and the player list (names). One scrolling page under the
// filters Period, Visits (Q303: "Without a game" by default), Who and Device. Follows the Corals | Fish switch (rule A4):
// a subject's pages only, a fish page being logged as fish.<page> (core.js pageName, pageSubj). Loaded after admin.js,
// whose helpers it uses (esc, pct, sbar, kpis, dateText, clock, pname, store, sheetAgain, the loads); its words are in
// the page help (HELP.visits, rule A2).

// visits: begin (the pure part, tests/visits.test.js)
const VISITS = {
  PHONE: 600, // a window at least this wide on a phone's browser is a tablet's (DESIGN.md size classes)
  DESK: 1024, // a computer's browser (an iPad's Safari says it is a Mac) under this width: a tablet
  NEAR: 120, // seconds: a load row joins the visit whose first summary it precedes by at most the visit's first part + this
  SLACK: 1, // seconds a load row may follow the first summary (sync.js sends the load row first, in the same moment)
  MAX: 60, // periods at most in the charts over time (the last ones), as Activity
  TOP: 12, // visitors listed before "Show all"
  SHEETS: 8, // genus sheets listed
  OPEN: 8 // visits shown in an unfolded visitor
};
// A game = a Practice page (Q302: quiz, custom quiz, duels, Memory); the Lab (Tools) is not one.
const visitGame = p => /^practice\./.test(p);
const visitMed = L => {
  const S = L.filter(x => typeof x === 'number' && isFinite(x)).sort((a, b) => a - b);
  return S.length ? S[Math.floor(S.length / 2)] : 0;
};
// A device's class (Q304): a phone from its browser (sync.js uaShort: "… mobile"), a tablet estimated from the window
// widths of its load rows (their median): a phone's browser at least PHONE wide, or a computer's browser between PHONE
// and DESK (an iPad's Safari presents itself as a Mac). No width known (a device not in the Events read): its browser.
function devClass(ua, W) {
  const mob = / mobile$/.test(String(ua || '')),
    w = visitMed((W || []).filter(x => x > 0));
  if (mob) return w >= VISITS.PHONE ? 'tablet' : 'phone';
  return w >= VISITS.PHONE && w < VISITS.DESK ? 'tablet' : 'computer';
}
// The visits of one subject, newest first. rows: the Pages rows ({t, dev, id, vi, r, g, ua}: admin.js pagesRows), one or
// more a visit (one each time the app was left, each with its own counts). o: own(page name) → the page in the subject's
// words, null for another subject's page; answered: the ids with answers (any subject); named: Map id → name (signed in);
// loads: the load rows {t, dev, w, st, p0}; sheets: the genus sheets (g) are this subject's. A visit is
// {k, who, id, dev, t (its first summary), last, P {page: [times, seconds]}, G {genus: [times, seconds, {from: times}]} (how each summary reached it, Codex review #777), s (seconds),
// game, kind (in: signed in, anon: not signed in, both with answers; never: no answer), signed, name, cls (phone, tablet,
// computer), inst (1 installed, 0 a browser tab, null not known), p0 (the first page's name, null not known)}. A visit
// with none of the subject's pages is the other subject's.
function visitsOf(rows, o) {
  const own = o.own || (p => p),
    answered = o.answered || new Set(),
    named = o.named || new Map(),
    LD = Object.create(null),
    UA = Object.create(null),
    V = Object.create(null);
  (o.loads || []).forEach(x => (LD[x.dev] = LD[x.dev] || []).push(x));
  rows
    .slice()
    .sort((a, b) => a.t - b.t)
    .forEach(x => {
      if (x.ua) UA[x.dev] = x.ua; // the newest browser of the device
      const who = x.id || 'dev:' + x.dev,
        k = who + '|' + x.vi,
        v = (V[k] = V[k] || {
          k,
          who,
          id: x.id || '',
          dev: x.dev,
          t: x.t,
          last: x.t,
          s1: 0,
          P: Object.create(null),
          G: Object.create(null),
          s: 0
        });
      v.last = x.t;
      Object.entries(x.r || {}).forEach(([n, [c, s]]) => {
        if (v.t === x.t) v.s1 += s;
        const p = own(n);
        if (p == null) return;
        const a = (v.P[p] = v.P[p] || [0, 0]);
        a[0] += c;
        a[1] += s;
        v.s += s;
      });
      if (o.sheets)
        Object.entries(x.g || {}).forEach(([g, [c, s, from]]) => {
          const a = (v.G[g] = v.G[g] || [0, 0, Object.create(null)]);
          a[0] += c;
          a[1] += s;
          a[2][from] = (a[2][from] || 0) + c;
        });
    });
  const L = Object.values(V)
      .filter(v => Object.keys(v.P).length)
      .sort((a, b) => a.t - b.t),
    used = new Set(),
    cls = Object.create(null);
  L.forEach(v => {
    // Its load row: the device's, sent within the visit's first part (at the first quiz photo, when the app was first
    // left, or 3 min after the first page), so never after its first summary (sync.js: loadSend before pagesSend), the
    // latest before it, each load row joined once: the next visit's load row, sent after, is never this one's (Codex
    // review #777).
    const near = (LD[v.dev] || [])
      .filter(x => !used.has(x) && x.t >= v.t - (v.s1 + VISITS.NEAR) * 1000 && x.t <= v.t + VISITS.SLACK * 1000)
      .sort((a, b) => b.t - a.t)[0];
    if (near) used.add(near);
    const all = LD[v.dev] || [],
      st = all.filter(x => x.st).length;
    if (!(v.dev in cls))
      cls[v.dev] = devClass(
        UA[v.dev],
        all.map(x => x.w)
      );
    v.cls = cls[v.dev];
    v.inst = near ? (near.st ? 1 : 0) : all.length ? (st * 2 >= all.length ? 1 : 0) : null;
    v.p0 = near && near.p0 ? near.p0 : null;
    v.game = Object.keys(v.P).some(visitGame);
    v.signed = named.has(v.id);
    v.name = v.signed ? named.get(v.id) : '';
    v.kind = !answered.has(v.id) ? 'never' : v.signed ? 'in' : 'anon';
    delete v.s1;
  });
  return L.reverse();
}
// The visits a filter keeps. f: {per: '7' | '30' | 'all' (days), vis: 'nogame' | 'all', who: 'all' | 'in' | 'anon' |
// 'never', dev: 'all' | 'phone' | 'tablet' | 'computer'}. all: every visit of the period, who and device (games or not);
// rows: those the Visits filter keeps; since: the start of the period (the first visit for All).
function visitsPick(V, f, now) {
  const since = f.per === 'all' ? Math.min(now, ...V.map(v => v.t)) : now - Number(f.per) * 864e5,
    all = V.filter(v => v.t >= since && (f.who === 'all' || v.kind === f.who) && (f.dev === 'all' || v.cls === f.dev));
  return {since, all, rows: f.vis === 'all' ? all : all.filter(v => !v.game)};
}
// Visits per day or ISO week (from Monday), local time, from since to now, gaps filled, the last VISITS.MAX: {k, ng
// (without a game), g (with one), who (visitors, Set), whoNg (visitors of the visits without a game)}.
function visitPeriods(L, since, now, by) {
  const p2 = n => String(n).padStart(2, '0'),
    day = t => {
      const d = new Date(t);
      d.setHours(0, 0, 0, 0);
      if (by === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return d;
    },
    key = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`,
    B = new Map();
  for (let d = day(since); d.getTime() <= now; d.setDate(d.getDate() + (by === 'week' ? 7 : 1)))
    B.set(key(d), {k: key(d), ng: 0, g: 0, who: new Set(), whoNg: new Set()});
  L.forEach(v => {
    const b = B.get(key(day(v.t)));
    if (!b) return;
    v.game ? b.g++ : b.ng++;
    b.who.add(v.who);
    if (!v.game) b.whoNg.add(v.who);
  });
  return [...B.values()].slice(-VISITS.MAX);
}
// The numbers at the top: visits (and of how many, games included, when only those without a game are shown), visitors,
// those who never answered, the median visit (seconds), the share on a phone.
function visitKpis(P) {
  const who = new Map();
  P.rows.forEach(v => who.set(v.who, v));
  return {
    n: P.rows.length,
    of: P.all.length,
    visitors: who.size,
    never: [...who.values()].filter(v => v.kind === 'never').length,
    med: visitMed(P.rows.map(v => v.s)),
    phone: P.rows.filter(v => v.cls === 'phone').length
  };
}
// visits: end

/* ---------- The page ---------- */
const VF = Object.assign({per: '30', vis: 'nogame', who: 'all', dev: 'all', by: 'day'}, store.get('reefid-admin-visits', {}));
const VOPEN = new Set(); // the visitors unfolded
let vAll = false; // every visitor listed, not only the most recent
const VKIND = {in: 'Signed in', anon: 'Not signed in', never: 'Never answered'},
  VDEV = {phone: 'Phone', tablet: 'Tablet', computer: 'Computer'},
  VFROM = ['quiz', 'learn', 'progress', 'other'];
// A page of the subject on screen, in its words (S: SUBJECTS; core.js pageName names a page in the corals' words).
function vPage(p, S = ASUBJ) {
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1),
    L = {
      home: 'Home',
      'learn.genera': cap(S.many),
      'learn.genus': S.sheets ? 'Sheets' : cap(S.one) + ' sheets',
      'learn.look-alikes': 'Look-alikes',
      'learn.compare': 'Compare',
      'learn.basics': S.what + ' basics',
      'identify.key': S.what + ' ID Key',
      'practice.quiz': 'Quiz',
      'practice.custom': 'Custom quiz',
      'practice.duels': 'Duels',
      'practice.memory': 'Memory',
      progress: 'My progress',
      leaderboard: 'Leaderboard',
      'leaderboard.achievements': 'Achievements',
      tools: 'Tools',
      about: 'About',
      'about.delete-account': 'Delete my account',
      other: 'Other'
    };
  return L[p] || (p.startsWith('tools.') ? 'Tools › ' + p.slice(6) : p);
}
// The page groups of Pages opened, in the app's order; a page no group names goes to Other.
const VSECS = [
  ['Home', p => p === 'home'],
  ['Learn', p => p.startsWith('learn.')],
  ['Identify', p => p.startsWith('identify.')],
  ['Practice', visitGame],
  ['Progress', p => p === 'progress' || p === 'leaderboard' || p.startsWith('leaderboard.')],
  ['Other', () => true]
];
const VORDER = [
  'home',
  'learn.genera',
  'learn.genus',
  'learn.look-alikes',
  'learn.compare',
  'learn.basics',
  'identify.key',
  'practice.quiz',
  'practice.custom',
  'practice.duels',
  'practice.memory',
  'progress',
  'leaderboard',
  'leaderboard.achievements',
  'tools',
  'about'
];
const vMins = s => (s < 60 ? '<1 min' : s < 3600 ? Math.round(s / 60) + ' min' : (s / 3600).toFixed(1) + ' h'),
  vHours = s => (s < 3600 ? Math.round(s / 60) + ' min' : (s / 3600).toFixed(1) + ' h'),
  vDay = t => {
    const d = new Date(t),
      p2 = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  },
  vWhen = t => (t >= dayStart() ? 'today ' + dateText(t, 'hm') : clock(t)),
  vSeg = (k, L, label) =>
    `<span class="adm-qseg adm-sseg" role="group" aria-label="${label}">${L.map(
      ([v, w]) => `<button type="button" data-vf="${k}" data-v="${v}" aria-pressed="${VF[k] === v}">${w}</button>`
    ).join('')}</span>`;
// A page name of any subject, read on the subject on screen's side: its own words, another subject's named after it.
function vAny(n) {
  const [sid, p] = pageSubj(n),
    S = subjectOf(sid);
  return S === ASUBJ ? vPage(p) : `${vPage(p, S)} (${S.name})`;
}
// The rows the page reads: the Pages rows, the load rows, who answered and who signed in.
function vLoads() {
  return ((EVS && EVS.rows) || [])
    .filter(r => r[3] === 'load')
    .map(r => {
      let d = {};
      try {
        d = JSON.parse(r[7] || '{}');
      } catch (e) {}
      return {t: r[1], dev: r[2], w: Number(d.w) || 0, st: d.st ? 1 : 0, p0: typeof d.p0 === 'string' ? d.p0 : ''};
    });
}
// Computed once per read of the four and subject, not at each filter click.
let VMEMO = {};
function vData() {
  if (VMEMO.p === PGS && VMEMO.e === EVS && VMEMO.a === ANS && VMEMO.u === USERS && VMEMO.s === ASUBJ) return VMEMO.v;
  const named = new Map();
  ((USERS && USERS.users) || []).forEach(u => u.id && named.set(u.id, u.name));
  const answered = new Set(((ANS && (ANS.all || ANS.rows)) || []).map(r => r[0]));
  const v = visitsOf(PGS.rows || [], {
    own: n => {
      const [sid, p] = pageSubj(n);
      return sid === ASUBJ.id ? p : null;
    },
    answered,
    named,
    loads: vLoads(),
    // The genus sheets of a summary are data.json's genera (sync.js pvGenus): the replayed subject's.
    sheets: !!ASUBJ.replay
  });
  VMEMO = {p: PGS, e: EVS, a: ANS, u: USERS, s: ASUBJ, v};
  return v;
}
function renderVisits() {
  status();
  const here = cur,
    head = (since = '') =>
      `<div class="adm-shead"><button type="button" class="adm-fchip plain" data-vload title="Read the visits again">↻</button>${since ? `<small class="note">since ${since}</small>` : ''}</div>`;
  if (!PGS || !ANS || !USERS || !EVS) {
    $v.innerHTML = head() + '<p class="note">Loading…</p>';
    Promise.all([PGS ? null : loadPages(), ANS ? null : loadStats(), USERS ? null : loadUsers(), EVS ? null : loadEvents()]).then(
      () => cur === here && render()
    );
    return;
  }
  pagesFresh(here);
  if (PGS.err) {
    $v.innerHTML = head() + `<p class="note">${esc(PGS.err)}</p>`;
    bindVisits();
    return;
  }
  const now = Date.now(),
    V = vData(),
    P = visitsPick(V, VF, now),
    rows = P.rows,
    filt = `<div class="adm-vfilt">${[
      vSeg(
        'per',
        [
          ['7', '7 d'],
          ['30', '30 d'],
          ['all', 'All']
        ],
        'Period'
      ),
      vSeg(
        'vis',
        [
          ['nogame', 'Without a game'],
          ['all', 'All visits']
        ],
        'Visits'
      ),
      vSeg(
        'who',
        [
          ['all', 'Everyone'],
          ['in', 'Signed in'],
          ['anon', 'Not signed in'],
          ['never', 'Never answered']
        ],
        'Who'
      ),
      vSeg(
        'dev',
        [
          ['all', 'All'],
          ['phone', 'Phone'],
          ['tablet', 'Tablet'],
          ['computer', 'Computer']
        ],
        'Device'
      )
    ].join('')}</div>`,
    // A read that failed says so: without the Events read, no first page, installed app or tablet is known (Codex review #777).
    warn = [
      USERS.err && 'Players: ' + USERS.err,
      ANS.old && 'Answers: ' + (ANS.err || 'not available'),
      EVS.err && `Events: ${EVS.err} (first page, installed app and tablets not known)`
    ].filter(Boolean);
  if (!rows.length) {
    $v.innerHTML =
      head(V.length ? vDay(P.since) : '') +
      filt +
      warn.map(t => `<p class="note">${esc(t)}</p>`).join('') +
      '<p class="note">No visit.</p>';
    bindVisits();
    return;
  }
  const all = VF.vis === 'all',
    K = visitKpis(P);
  const top = kpis([
    [all ? 'Visits' : 'Visits without a game', `${K.n}${all ? '' : `<small>of ${K.of}</small>`}`],
    ['Visitors', K.visitors],
    ['Never answered', K.never],
    ['Median visit', vMins(K.med)],
    ['On a phone', pct(K.phone, K.n)]
  ]);

  // Visits over time: without a game in the accent; on All visits, with a game in its tint above it.
  const B = visitPeriods(P.all, P.since, now, VF.by === 'week' ? 'week' : 'day'),
    nv = b => b.ng + (all ? b.g : 0),
    nw = b => (all ? b.who : b.whoNg).size,
    maxV = Math.max(1, ...B.map(nv)),
    maxW = Math.max(1, ...B.map(nw)),
    cols = B.map(
      b =>
        `<div title="${b.k}: ${b.ng} without a game${all ? `, ${b.g} with one` : ''}">${
          all ? `<i class="adm-vgame" style="height:${(100 * b.g) / maxV}%"></i>` : ''
        }<i style="height:${(100 * b.ng) / maxV}%"></i></div>`
    ).join(''),
    wcols = B.map(b => `<div title="${b.k}: ${nw(b)} visitors"><i style="height:${(100 * nw(b)) / maxW}%"></i></div>`).join(''),
    H = Array(24).fill(0);
  rows.forEach(v => H[new Date(v.t).getHours()]++);
  const maxH = Math.max(1, ...H),
    hcols = H.map((n, h) => `<div title="${h}:00-${h + 1}:00: ${n} visits"><i style="height:${(100 * n) / maxH}%"></i></div>`).join(''),
    axis = B.length ? `<p class="adm-axis"><span>${B[0].k}</span><span>${B[B.length - 1].k}</span></p>` : '',
    nog = P.all.filter(v => !v.game).length,
    legend = all
      ? `<p class="adm-legend"><span><i class="adm-vnogame"></i>Without a game ${nog}</span><span><i class="adm-vgame"></i>With a game ${P.all.length - nog}</span></p>`
      : '';
  const time = `<section class="adm-scard adm-actv wide" data-visits="time"><div class="adm-shead"><h3>Visits over time</h3>${vSeg(
    'by',
    [
      ['day', 'Day'],
      ['week', 'Week']
    ],
    'Period'
  )}</div>${legend}
    <div class="adm-acols">
      <div class="adm-acol"><h4>Visits</h4><div class="adm-cols stack">${cols}</div>${axis}</div>
      <div class="adm-acol"><h4>Visitors</h4><div class="adm-cols">${wcols}</div>${axis}</div>
      <div class="adm-acol"><h4>Hour of day</h4><div class="adm-cols">${hcols}</div><p class="adm-axis"><span>0 h</span><span>12 h</span><span>23 h</span></p></div>
    </div></section>`;

  // Pages opened: per page the visits that opened it, their share, the visitors, the median time in a visit that opened
  // it and the total, in groups.
  const PG = Object.create(null);
  rows.forEach(v =>
    Object.entries(v.P).forEach(([k, [, s]]) => {
      const o = (PG[k] = PG[k] || {vis: 0, who: new Set(), s: [], tot: 0});
      o.vis++;
      o.who.add(v.who);
      o.s.push(s);
      o.tot += s;
    })
  );
  const ord = k => (VORDER.includes(k) ? VORDER.indexOf(k) : VORDER.length),
    left = new Set(Object.keys(PG)),
    pageRows = VSECS.map(([sec, f]) => {
      const R = [...left].filter(f).sort((a, b) => ord(a) - ord(b) || PG[b].vis - PG[a].vis || a.localeCompare(b));
      R.forEach(k => left.delete(k));
      if (!R.length) return '';
      return (
        (R.length > 1 || sec !== vPage(R[0]) ? `<tr class="adm-vsec"><td colspan="7">${sec}</td></tr>` : '') +
        R.map(
          k =>
            `<tr><td>${esc(vPage(k))}</td><td class="n">${PG[k].vis}</td><td>${sbar(PG[k].vis, rows.length)}</td><td class="n">${pct(PG[k].vis, rows.length)}</td><td class="n">${PG[k].who.size}</td><td class="n">${vMins(visitMed(PG[k].s))}</td><td class="n">${vHours(PG[k].tot)}</td></tr>`
        ).join('')
      );
    }).join('');
  const pages = `<section class="adm-scard adm-hsec wide" data-visits="pages"><h3>Pages opened</h3><div class="adm-tscroll"><table class="adm-tbl adm-vpages"><thead><tr><th>Page</th><th class="n">Visits</th><th></th><th class="n" title="Share of the visits">Share</th><th class="n">Visitors</th><th class="n" title="Median time on the page in a visit that opened it">Median</th><th class="n">Total</th></tr></thead><tbody>${pageRows}</tbody></table></div></section>`;

  // The subject's ID Key: its visits, visitors, median time, first page; by who.
  const KY = rows.filter(v => v.P['identify.key']),
    kSec = L => (L.length ? vMins(visitMed(L.map(v => v.P['identify.key'][1]))) : '–'),
    kKind = ['in', 'anon', 'never']
      .map(k => {
        const L = KY.filter(v => v.kind === k);
        return `<tr><td>${VKIND[k]}</td><td class="n">${L.length}</td><td class="n">${new Set(L.map(v => v.who)).size}</td><td class="n">${L.length ? kSec(L) : ''}</td></tr>`;
      })
      .join('');
  const key = `<section class="adm-scard" data-visits="key"><h3>${esc(vPage('identify.key'))}</h3><div class="adm-vkeyk">
      <div><b>${KY.length}</b><span>Visits</span></div><div><b>${new Set(KY.map(v => v.who)).size}</b><span>Visitors</span></div>
      <div><b>${kSec(KY)}</b><span>Median time</span></div><div><b>${rows.filter(v => v.p0 && pageSubj(v.p0)[0] === ASUBJ.id && pageSubj(v.p0)[1] === 'identify.key').length}</b><span>First page</span></div></div>
      <div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th>Who</th><th class="n">Visits</th><th class="n">Visitors</th><th class="n">Median</th></tr></thead><tbody>${kKind}</tbody></table></div>
      <p class="adm-vlater" title="Needs a sheet change (agreed for later)">Steps inside the Key: later</p></section>`;

  // Genus sheets (the replayed subject's): the most opened, by how many visitors, the time, how they were reached most.
  const GS = Object.create(null);
  rows.forEach(v =>
    Object.entries(v.G).forEach(([g, [n, s, F]]) => {
      const o = (GS[g] = GS[g] || {n: 0, who: new Set(), s: 0, from: {}});
      o.n += n;
      o.who.add(v.who);
      o.s += s;
      Object.entries(F).forEach(([f, c]) => (o.from[f] = (o.from[f] || 0) + c));
    })
  );
  const GL = Object.entries(GS).sort((a, b) => b[1].n - a[1].n || b[1].s - a[1].s || a[0].localeCompare(b[0])),
    maxG = GL.length ? GL[0][1].n : 1,
    gRows = GL.slice(0, VISITS.SHEETS)
      .map(
        ([g, o]) =>
          `<tr><td><i>${esc(g)}</i></td><td class="n">${o.n}</td><td>${sbar(o.n, maxG)}</td><td class="n">${o.who.size}</td><td class="n">${vHours(o.s)}</td><td>${esc(
            Object.entries(o.from).sort((a, b) => b[1] - a[1] || VFROM.indexOf(a[0]) - VFROM.indexOf(b[0]))[0][0]
          )}</td></tr>`
      )
      .join('');
  const sheets = ASUBJ.replay
    ? `<section class="adm-scard adm-hsec" data-visits="sheets"><h3>${esc(vPage('learn.genus'))} <small>${GL.length} ${esc(ASUBJ.many)}</small></h3><div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th>${esc(
        ASUBJ.one.charAt(0).toUpperCase() + ASUBJ.one.slice(1)
      )}</th><th class="n">Opened</th><th></th><th class="n">Visitors</th><th class="n">Time</th><th title="How the sheet was reached most often">From</th></tr></thead><tbody>${
        gRows || '<tr><td colspan="6" class="note">None.</td></tr>'
      }</tbody></table></div></section>`
    : '';

  // The first page of the visits (their load row), then the device.
  const FP = new Map();
  rows.forEach(v => {
    const k = v.p0 || '';
    FP.set(k, (FP.get(k) || 0) + 1);
  });
  const fRows = [...FP.entries()]
      .sort((a, b) => !a[0] - !b[0] || b[1] - a[1])
      .map(
        ([k, n]) =>
          `<tr><td>${esc(k ? vAny(k) : 'Not known')}</td><td>${sbar(n, rows.length)}</td><td class="n">${n}</td><td class="n">${pct(n, rows.length)}</td></tr>`
      )
      .join(''),
    dRows = ['phone', 'tablet', 'computer']
      .flatMap(c =>
        [
          [1, 'installed app'],
          [0, 'browser tab'],
          [null, 'not known']
        ].map(([i, t]) => {
          const L = rows.filter(v => v.cls === c && v.inst === i);
          return L.length
            ? `<tr><td>${VDEV[c]}, ${t}</td><td>${sbar(L.length, rows.length)}</td><td class="n">${L.length}</td><td class="n">${new Set(L.map(v => v.who)).size}</td></tr>`
            : '';
        })
      )
      .join('');
  const first = `<section class="adm-scard adm-hsec" data-visits="first"><h3>First page</h3><div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th>Page</th><th></th><th class="n">Visits</th><th class="n"></th></tr></thead><tbody>${fRows}</tbody></table></div>
    <h3 class="adm-vh3">Device</h3><div class="adm-tscroll"><table class="adm-tbl" data-visits="device"><thead><tr><th>How</th><th></th><th class="n">Visits</th><th class="n">Visitors</th></tr></thead><tbody>${dRows}</tbody></table></div></section>`;

  // Visitors: one row each, the newest visit first; a row unfolds their visits; the name opens their Journey.
  const VL = [];
  {
    const by = new Map();
    rows.forEach(v => (by.get(v.who) || by.set(v.who, []).get(v.who)).push(v));
    by.forEach((L, w) => {
      const PS = Object.create(null);
      L.forEach(v => Object.entries(v.P).forEach(([k, [, s]]) => k !== 'home' && (PS[k] = (PS[k] || 0) + s)));
      VL.push({
        w,
        v: L[0],
        L,
        last: L[0].t,
        s: L.reduce((a, v) => a + v.s, 0),
        days: new Set(L.map(v => vDay(v.t))).size,
        top: Object.entries(PS)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
      });
    });
    VL.sort((a, b) => b.last - a.last);
  }
  const whoLink = v =>
      v.signed
        ? `<a href="#players/list/journey/${encodeURIComponent(v.name)}">${pname(v.name)}</a>`
        : v.id
          ? `<a href="#players/list/anon/${encodeURIComponent(v.id)}" title="Not signed in"><code>${esc(v.id)}</code></a>`
          : `<code title="A wrong code: the device">${esc(v.dev)}</code>`,
    shown = vAll ? VL : VL.slice(0, VISITS.TOP),
    vRows = shown
      .map(o => {
        const open = VOPEN.has(o.w),
          det = open
            ? `<tr class="adm-udet adm-vdet"><td colspan="9"><table class="adm-vvis"><tbody>${o.L.slice(0, VISITS.OPEN)
                .map(
                  x =>
                    `<tr><td>${vWhen(x.t)}</td><td>${vMins(x.s)}</td><td>${Object.entries(x.P)
                      .sort((a, b) => b[1][1] - a[1][1])
                      .map(([p, [n, s]]) => `${esc(vPage(p))} <small>${p === 'learn.genus' ? n + ' · ' : ''}${vMins(s)}</small>`)
                      .join(' · ')}${
                      Object.keys(x.G).length
                        ? ` <span class="adm-vwho">(${Object.keys(x.G)
                            .map(g => '<i>' + esc(g) + '</i>')
                            .join(', ')})</span>`
                        : ''
                    }</td></tr>`
                )
                .join('')}${
                o.L.length > VISITS.OPEN
                  ? `<tr><td></td><td colspan="2" class="adm-vwho">and ${o.L.length - VISITS.OPEN} earlier visits</td></tr>`
                  : ''
              }</tbody></table></td></tr>`
            : '';
        return `<tr class="adm-urow${open ? ' open' : ''}" data-vopen="${esc(o.w)}" tabindex="0" aria-expanded="${open}"><td>${whoLink(o.v)}</td><td><span class="adm-vwho">${
          o.v.signed && o.v.kind === 'never' ? 'Signed in, never answered' : VKIND[o.v.kind]
        }</span></td><td>${vWhen(o.last)}</td><td class="n">${o.L.length}</td><td class="n">${o.days}</td><td class="n">${vHours(o.s)}</td><td>${o.top
          .map(([p, s]) => `${esc(vPage(p))} <small>${vMins(s)}</small>`)
          .join(' · ')}</td><td>${VDEV[o.v.cls]}${o.v.inst ? ' · app' : ''}</td><td>${open ? '▾' : '▸'}</td></tr>${det}`;
      })
      .join('');
  const list = `<section class="adm-scard adm-recent wide" data-visits="visitors"><h3>Visitors <small>${VL.length}</small></h3><div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th>Visitor</th><th>Who</th><th>Last visit</th><th class="n">Visits</th><th class="n">Days</th><th class="n">Time</th><th>Mostly</th><th>Device</th><th></th></tr></thead><tbody>${vRows}</tbody></table></div>${
    VL.length > VISITS.TOP
      ? `<p class="adm-vmore"><button type="button" class="linkish" data-vall>${vAll ? `Show the ${VISITS.TOP} most recent` : `Show all ${VL.length}`}</button></p>`
      : ''
  }</section>`;

  $v.innerHTML = `<div class="adm-vis">${head(vDay(P.since))}${filt}${warn.map(t => `<p class="note">${esc(t)}</p>`).join('')}${top}<div class="adm-sgrid">${time}${pages}${key}${sheets}${first}${list}</div></div>`;
  bindVisits();
}
function bindVisits() {
  $v.querySelectorAll('[data-vf]').forEach(
    b =>
      (b.onclick = () => {
        VF[b.dataset.vf] = b.dataset.v;
        store.set('reefid-admin-visits', VF);
        render();
      })
  );
  // A tap (or Enter / Space) on a visitor unfolds their visits, again folds them; their link opens the Journey.
  $v.querySelectorAll('[data-vopen]').forEach(tr => {
    const flip = () => {
      const k = tr.dataset.vopen;
      VOPEN.has(k) ? VOPEN.delete(k) : VOPEN.add(k);
      render();
      const back = [...$v.querySelectorAll('[data-vopen]')].find(x => x.dataset.vopen === k);
      if (back) back.focus({preventScroll: true});
    };
    tr.onclick = e => !e.target.closest('a, button') && flip();
    tr.onkeydown = e => {
      if (e.target === tr && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        flip();
      }
    };
  });
  const a = $v.querySelector('[data-vall]');
  if (a)
    a.onclick = () => {
      vAll = !vAll;
      render();
    };
  const rl = $v.querySelector('[data-vload]');
  if (rl)
    rl.onclick = () => {
      sheetAgain('pages', 'events', 'ans', 'users');
      render();
    };
}
HELP.visits = `<p>Who opens the app and what for, games or not, signed in or not, from what the app already sends: the summary of each visit (the pages opened, how many times and for how long each was on screen, sheet v30, the Pages tab) and its once-a-visit load row (the Events tab). <b>One visit</b> = the summaries with the same visit id (the app sends one each time it is left). Its time is that of its first summary; its length is the time its pages were on screen. The switch: the subject on screen's pages only (a page drawn with Fish on screen is logged as fish.&lt;page&gt;); a visit with none of them is the other subject's, and a visit in both counts on each side with its own pages.</p>
  <p><b>Period</b>: the last 7 or 30 days, or everything read (the last 10,000 summaries). <b>Visits</b>: <b>Without a game</b> (the default) or <b>All visits</b>. A game = a Practice page (the quiz, the custom quiz, duels, Memory); a visit to the Lab (Tools) counts as without a game. <b>Who</b>: <b>Signed in</b> (with answers), <b>Not signed in</b> (an anonymous device with answers), <b>Never answered</b> (no answer in any subject, signed in or not). <b>Device</b>: see below.</p>
  <p><b>The numbers</b>: the visits (and, without a game, of how many in all), the visitors, those who never answered, the median visit, the share of visits on a phone. <b>Visits over time</b>: per day or week (from Monday), the visits and the visitors; on All visits the visits with a game in the paler colour above those without; then the visits by hour of the day (this browser's time). <b>Pages opened</b>: per page, the visits that opened it and their share, the visitors, the median time on the page in a visit that opened it, the total time. <b>ID Key</b> (the Coral ID Key, the Fish ID Key): its visits, visitors, median time and the visits that started on it, by who; the steps inside the Key are not counted yet (a sheet change). <b>Genus sheets</b>: the ${VISITS.SHEETS} most opened, by how many visitors, the time on them, and how they were reached most often (quiz feedback, Learn, My progress, other). <b>First page</b> and <b>installed app</b> come from the visit's load row (same device, sent within the visit's first minutes): "Not known" when the Events read (its last 3000 rows) no longer has it. <b>Visitors</b>: one row each, newest first; a tap unfolds their last ${VISITS.OPEN} visits; the name or id opens their Journey.</p>
  <p><b>Device</b> (approximate): a <b>phone</b> is a browser that says it is a mobile one; a <b>tablet</b> is estimated from the window width of the device's load rows (their median): a mobile browser ${VISITS.PHONE} px wide or more, or a computer's browser from ${VISITS.PHONE} to ${VISITS.DESK - 1} px (an iPad's Safari presents itself as a Mac). Only devices with a load row in the Events read get a width (recent devices); the others are a phone or a computer by their browser. A phone held sideways or a narrow computer window can be misread.</p>
  <p>What is not seen: a first visit left within seconds, a page the phone closed without the app being left (its summary is lost), local copies and automated browsers. Anonymous ids only; a name only for those who signed in.</p>`;
