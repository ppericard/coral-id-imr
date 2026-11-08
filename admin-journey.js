// Player journey (Pierre, 2026-11-02, the first RAs playing: "more on each player: their progress, the genera that were
// easy and less easy for them, when they unlocked each genus, an analysis of a person's path"). Built from the answer
// log the Players page already loads (ANS.rows, sheet readAnswers: [anonymous id, time, genus shown, answered, right,
// mode, photos, expected, ability, new photos, choices, anonymous]), joined to the name by the player's anonymous id
// (USERS, sheet v13); and the genus sheets they opened (sheet v30 'pages', admin.js loadPages, under the same id). Opened
// from a row of Players (#players/list/journey/<name>). Loaded after admin.js,
// whose helpers it uses (esc, pct, kpis, sbar, sgn, loadUsers, loadStats, HEALTH, DATA). The explanations are in the
// page help (HELP.journey, rule A2).
const JOURNEY = {
  WIN: 20, // answers in the rolling "right" curve
  MIN: 3, // answers on a genus before it can be called easy or hard for the player
  TOP: 5, // genera in the easiest / hardest lists
  DAYS: 60 // at most this many days in the per-day chart (the last ones)
};
let JSORT = 'met';
// First-meeting cards and Open all genera, from the player's saved progress (sheet userData, admin token): the app keeps
// them as reefid-sync-coral-intro {genus: [answers so far, 1 for the first cards or Open all, time shown, kind]} and
// reefid-sync-coral-intro-offer {at, open, via, t, n} (model.js INTRO; times and via from 2026-11-02), with the back card's choice
// (bk keep / one, after answer bat, bn genera closed, time bt; from 2026-11-03), and the first-launch question
// reefid-sync-coral-start {c, t, at, via, n, s, fb, h} (core.js CHOICE, model.js startSet; 2026-11-03). name -> null while loading.
// The learned genera come from the full replay (admin.js progOf), which takes the mastery exams from the same copy.
function journeyCards(name, T = ASUBJ) {
  const S = savedFor(name, T);
  return !S ? null : S.err ? {err: S.err} : {map: S.intro, offer: S.offer, start: S.start};
}
const JVIA = {card: 'on the first cards', progress: 'from My progress', offer: 'from the offer card'};
// How the first-launch answer was given (model.js startSet via), and the fallback cards (core.js CHOICE).
// admin: Pierre's change on Players (core.js startAdminSet, sheet v98).
const JSTART = {
    tour: 'in the welcome tour',
    card: 'on the card before the quiz',
    fallback: 'from the fallback card',
    inferred: 'inferred',
    admin: 'changed by you on Players'
  },
  JFB = {lo: 'harder than predicted by', hi: 'easier than predicted by'};
// "I know corals well" etc.; inferred (an existing player with CHOICE.ASK answers or more, never asked): said so.
// An answer's words (core.js startText): the corals' question, whose record (reefid-sync-coral-start) the journey reads.
const jSaid = c => (startText(ASUBJ.id, c) || [c])[0];
// jorder: begin
// The Cards list in time order (Pierre, 2026-11-05: Nov 4 rows came before Nov 2 ones): items [time or null, html],
// the timed ones oldest first, the untimed ones after them in their own order.
const jOrder = items =>
  items
    .map((x, i) => [x, i])
    .sort(([a, i], [b, j]) => (a[0] == null) - (b[0] == null) || (a[0] != null && b[0] != null && a[0] - b[0]) || i - j)
    .map(([x]) => x[1])
    .join('');
// jorder: end
const jStart = (S, before) => {
  if (!S || !startOpt(S.c)) return [[null, '<li><b>Start</b> not answered yet</li>']];
  // The history's events (core.js startEvents): the answers given, and the eases taken with Coral basics.
  const ev = startEvents(S),
    h = ev.filter(x => x[3] !== 'ease');
  // The same answer given again is a real event (core.js startEvents keeps it): "Answered again", not "Changed to";
  // "inferred" is said once (Pierre, 2026-11-05).
  return [
    ...h.map(([c, a, t, via], i) => [
      t || null,
      `<li><b>${!i ? 'Start' : c === h[i - 1][0] ? 'Answered again' : 'Changed to'}</b> ${esc(jSaid(c))} · ${via === 'inferred' ? `<b>inferred</b> from the level, ${before(t, a)} answers` : `after answer ${before(t, a)} · ${JSTART[via] || esc(via || '')}`}${t ? ' · ' + jTime(t) : ''}</li>`
    ]),
    ...ev
      .filter(x => x[3] === 'ease')
      .map(([c, a, t, , of]) => [
        t || null,
        `<li><b>Eased</b> to the start of ${esc(jSaid(c))} (said “${esc(jSaid(of))}”), after answer ${before(t, a)} · Coral basics taken on the fallback card${t ? ' · ' + jTime(t) : ''}</li>`
      ]),
    ...Object.entries(S.fb || {}).map(([k, [a, t]]) => {
      const [c, d] = k.split('-');
      return [
        t || null,
        `<li><b>Fallback card</b> ${JFB[d] || esc(k)} “${esc(jSaid(c))}”, after answer ${before(t, a)}${t ? ' · ' + jTime(t) : ''}</li>`
      ];
    })
  ];
};
// joffslate: begin
// The word beside a unit outside the slate: its rank when the slate's units are of another rank (a fish scientific genus
// beside the families: "genus"), else "bonus" (a coral bonus genus). The rank from the unit's id (f:, g:, s:), as
// core.js rankKey (Pierre, 2026-11-08: the fish genera are not bonus).
const JRANK = {f: 'family', g: 'genus', s: 'species'};
const jRankOf = n => (/^([a-z]+):/.exec(String(n || '')) || [])[1] || '';
const jOffSlate = (n, slate) => {
  const r = jRankOf(n),
    first = slate && slate.values().next().value;
  return r !== jRankOf(first) && JRANK[r] ? JRANK[r] : 'bonus';
};
// joffslate: end
const jDate = t => dateText(t, 'dm'), // one formatter per format (admin.js dateText; Pierre, 2026-11-03: admin pages load slower)
  jTime = t => dateText(t, 'dmhm'),
  jPts = x => (x == null ? '–' : `${x > 0 ? '+' : ''}${Math.round(100 * x)} pts`);
// A unit on a journey or in a session: a genus of the site's data in italics with its page; another subject's unit by
// its name (its entries read once, admin.js fishAdmin, as a report names one), plain.
const jName = g => (FISHA && FISHA.gen[g] ? FISHA.gen[g].name : g),
  jUnit = g => (DATA.gen[g] ? `<a class="adm-gen" href="${esc(genusHref(g))}"><i>${esc(g)}</i></a>` : `<i>${esc(jName(g))}</i>`),
  // The subject's word for its units, capitalised (Genera, Families).
  jMany = (S = ASUBJ) => S.many[0].toUpperCase() + S.many.slice(1),
  jOne = (S = ASUBJ) => S.one[0].toUpperCase() + S.one.slice(1);

// Everything the page shows, from one player's answers in time order.
function journeyOf(R, L = slateOf(DATA)) {
  // The slate as the app counts it (core.js slateOf, as app.js slateGenera): the IMR coral slate and BENTHIC (Millepora).
  // A subject the admin does not replay: the units the player met (no total, no bonus mark).
  // L null (a subject whose units are not read yet): the units the player met (no total, no bonus mark).
  const slate = new Set(L || R.map(r => r[2])),
    G = {},
    acc = [],
    exp = [],
    met = [],
    marks = [],
    mix = {},
    perDay = {};
  let seen = 0;
  R.forEach((r, i) => {
    const [, t, g, a, ok, , , e] = r;
    const s = (G[g] = G[g] || {n: 0, ok: 0, first: i, t0: t, res: 0, en: 0, h: '', inst: {}, given: 0});
    s.n++;
    s.ok += ok;
    s.h = (s.h + ok).slice(-10);
    if (typeof e === 'number') {
      s.res += ok - e;
      s.en++;
    }
    if (s.n === 1 && slate.has(g)) {
      seen++;
      marks.push([i, g, t]);
    }
    met.push(seen);
    if (!ok && a && a !== g) {
      s.inst[a] = (s.inst[a] || 0) + 1;
      if (G[a]) G[a].given++;
      const k = g + '|' + a;
      mix[k] = (mix[k] || 0) + 1;
    }
    const L = R.slice(Math.max(0, i - JOURNEY.WIN + 1), i + 1),
      E = L.filter(x => typeof x[7] === 'number');
    // From the 5th answer: before, one answer moves the curve by 25 points or more.
    acc.push(i < 4 ? null : L.reduce((n, x) => n + x[4], 0) / L.length);
    exp.push(i < 4 || !E.length ? null : E.reduce((n, x) => n + x[7], 0) / E.length);
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    const dk = d.getTime(),
      o = (perDay[dk] = perDay[dk] || {n: 0, ok: 0});
    o.n++;
    o.ok += ok;
    const h = (o.h = o.h || {})[new Date(t).getHours()] || (o.h[new Date(t).getHours()] = {n: 0, ok: 0});
    h.n++;
    h.ok += ok;
  });
  // Sessions: answers less than HEALTH.GAP minutes apart (admin.js sessionsOf, as Stops and Recent sessions count them).
  const S = sessionsOf(R).map(s => s.L);
  Object.values(G).forEach(s => (s.score = s.en ? s.res / s.en : null));
  return {G, acc, exp, met, marks, mix, perDay, S, slate};
}

// A line chart over the answers (x = answer number): series [{v: [...], cls}], y from 0 to top.
function journeyChart(series, top, opt = {}) {
  // Drawn at the page's width (a little under it, so never scaled down), so its labels keep the 12 px minimum (--fs-xs)
  // on a phone as on a desktop (rule U3; Codex review #351).
  // opt.w / opt.h: a smaller chart drawn at its own box's width (a session's summary, sessionSummary); opt.min below.
  const W = opt.w || Math.max(300, Math.min(1100, ($v.clientWidth || 900) - 56)),
    H = opt.h || 190,
    pl = 34,
    pr = 8,
    pt = 8,
    pb = 22,
    n = Math.max(2, series[0].v.length),
    x = i => pl + ((W - pl - pr) * i) / (n - 1),
    // opt.min: the bottom of the scale (0 by default), so a session's curve uses the chart's height (Pierre, 2026-11-05).
    lo = opt.min || 0,
    y = v => pt + (H - pt - pb) * (1 - (v - lo) / (top - lo));
  const path = v =>
    v
      .map((p, i) => (p == null ? null : `${x(i).toFixed(1)},${y(p).toFixed(1)}`))
      .reduce((s, p, i, A) => (p == null ? s : s + (i && A[i - 1] != null ? ' L' : ' M') + p), '');
  const grid = (opt.ticks || [])
    .map(
      ([v, t]) =>
        `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" class="g"/><text x="${pl - 5}" y="${y(v) + 4}" text-anchor="end">${t}</text>`
    )
    .join('');
  const days = (opt.days || [])
    .map(([i, t]) => `<line x1="${x(i)}" x2="${x(i)}" y1="${pt}" y2="${H - pb}" class="d"><title>${esc(t)}</title></line>`)
    .join('');
  const marks = (opt.marks || [])
    .map(
      ([i, t]) =>
        `<line x1="${x(i)}" x2="${x(i)}" y1="${pt}" y2="${H - pb}" class="o"><title>${esc(t)}</title></line><text x="${x(i) + 4}" y="${pt + 12}" class="o">${esc(t)}</text>`
    )
    .join('');
  const stars = (opt.stars || [])
    .map(
      ([i, v, t]) =>
        `<text x="${x(i).toFixed(1)}" y="${(y(v) + 5).toFixed(1)}" text-anchor="middle" class="s">★<title>${esc(t)}</title></text>`
    )
    .join('');
  const dots = (opt.dots || [])
    .map(([i, v, t]) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.2" class="m"><title>${esc(t)}</title></circle>`)
    .join('');
  const xt = [0, Math.floor((n - 1) / 2), n - 1]
    .map((i, k) => `<text x="${x(i)}" y="${H - 6}" text-anchor="${['start', 'middle', 'end'][k]}">${i + 1}</text>`)
    .join('');
  return `<svg class="adm-jl" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.label || '')}">${grid}${days}${series
    .map(s => `<path d="${path(s.v)}" class="${s.cls}"/>`)
    .join('')}${marks}${dots}${stars}${xt}</svg>`;
}

function renderJourney(name, anonId = '') {
  const here = anonId ? 'players/list/anon/' + anonId : 'players/list/journey/' + name;
  status();
  // One journey per subject (Pierre, 2026-11-06: "Journey is per mode, necessarily"), under the subject's prefix: the
  // page's own Corals | Fish shows the player's answers in each and opens the other (the header switch keeps the page
  // too). Every subject's progress is replayed here from its answers (admin.js progOf, unitsOf; Pierre, 2026-11-06:
  // "everything that helps me follow how players' progress goes"), with its saved copy's cards and mastery exams; the
  // Elo and the genus sheets opened are the replayed subject's (SUBJECTS replay) only, from the sheet.
  const M = unitsOf(ASUBJ),
    full = !!M,
    own = !!ASUBJ.replay;
  if (!M && !FISHA) fishAdmin().then(() => cur === here && FISHA && render());
  // A subject's rows of this player (u, found below); an archived record's are kept apart from rowsOf (sheet v58 flag 2;
  // Codex review #690).
  const jRows = S => (u.arch ? subjRows(ANS.all || ANS.rows || [], S.id) : rowsOf(S)).filter(r => r[0] === u.id),
    jn = S => jRows(S).length,
    jseg = () =>
      `<span class="adm-qseg adm-sseg adm-jsubj" role="group" aria-label="Subject">${SUBJECTS.map(
        S => `<a href="#${esc(S.hash + admAddr(here))}" data-own aria-pressed="${S === ASUBJ}">${esc(S.name)} <small>${jn(S)}</small></a>`
      ).join('')}</span>`;
  const back = `<a class="adm-fchip plain" href="#players/list">← Players</a><button type="button" class="adm-fchip plain" data-jload title="Reload">↻</button>`;
  if (!USERS || !ANS) {
    $v.innerHTML = `<div class="adm-shead">${back}<h2>${esc(anonId ? 'Not signed in · ' + anonId : name)}</h2></div><p class="note">Loading…</p>`;
    Promise.all([USERS ? null : loadUsers(), ANS ? null : loadStats()]).then(() => {
      if (cur === here) render();
    });
    // The pages opened leave with them, not after (the journey's Pages opened; drawn when the page is).
    if (pagesStale()) loadPages().catch(() => {});
    return;
  }
  // A device that never signed in (Pierre, 2026-11-03): #players/list/anon/<its anonymous id>, from Players > Not signed in. Its
  // answers are all there is: no saved progress, so no cards and no learned genera.
  // An archived record (sheet v58, the Archived fold on Players): read-only, its path as it was, marked archived.
  const u = anonId
    ? {name: 'Not signed in · ' + anonId, id: anonId}
    : (USERS.users || []).find(x => x.name === name) ||
      ((USERS.archived || []).find(x => x.name === name) && {...USERS.archived.find(x => x.name === name), arch: 1});
  if (!u || !u.id) {
    $v.innerHTML = `<div class="adm-shead">${back}<h2>${esc(anonId ? 'Not signed in · ' + anonId : name)}</h2></div><p class="note">${u ? 'No anonymous id for this player yet (sheet script v13).' : 'No player by this name.'}</p>`;
    bindJReload();
    return;
  }
  const R = jRows(ASUBJ).sort((a, b) => a[1] - b[1]);
  const head = `<div class="adm-shead">${back}<h2>${esc(u.name)}</h2>${isMe(u.id) ? '<small class="note">you</small>' : ''}${u.arch ? '<small class="note">archived</small>' : ''}${SUBJECTS.length > 1 ? jseg() : ''}</div>`;
  if (!R.length) {
    $v.innerHTML = head + '<p class="note">No answers yet.</p>';
    bindJReload();
    return;
  }
  const J = journeyOf(R, M && M.slate),
    total = J.slate.size,
    of = full ? `/${total}` : '', // met out of the slate, once the subject's units are read
    lv = own && RAS[u.id] ? RAS[u.id][0] : null,
    // The photo quiz apart from the Duel tab (core.js playSplit; Pierre, 2026-11-03).
    sp = playSplit(R)[R.length ? R[0][0] : ''] || {q: [0, 0], q50: [0, 0], d: [0, 0]},
    sLen = J.S.map(s => s.length).sort((a, b) => a - b),
    medS = sLen[Math.floor(sLen.length / 2)],
    // Seconds to answer and photo enlarged (sheet v23; null before): logged to be analysed later, shown here only.
    RT = R.map(r => r[12])
      .filter(x => typeof x === 'number')
      .sort((a, b) => a - b),
    ZM = R.map(r => r[13]).filter(x => x === 0 || x === 1),
    dayKeys = Object.keys(J.perDay)
      .map(Number)
      .sort((a, b) => a - b);

  // 0. The cards: when each genus was shown, and whether (and how) all were opened at once.
  const C = !full ? {none: 1, map: {}, offer: null} : anonId ? {anon: 1, map: {}, offer: null} : journeyCards(name, ASUBJ),
    // Progress replayed from the whole log (admin.js progOf, docs/LEARNING.md "Full replay"), with the saved copy's
    // mastery exams; beside it what the saved copy says when it differs. null while the saved copy is read.
    // Before sheet script v28 (admin.js replayOn): {off: 1}, the saved copy as it is, and no replayed value shown.
    PG = full ? progOf(anonId ? {id: anonId, anon: 1} : u, true, ASUBJ) : null,
    RP = full && replayOn(),
    offer = C && C.offer,
    openAt = offer && offer.open ? offer.at : null,
    // A card shown after the player's a-th answer: its time, else that answer's (cards saved before times were kept).
    cardT = e => e[2] || (R[Math.min(R.length, Math.max(1, e[0])) - 1] || R[0])[1],
    // Answers in the log before a time: where an event with a time sits in the history. The app's own count restarts at
    // a progress reset while the sheet keeps every answer (Codex review #352); the count only for events without a time.
    before = (tm, n) => (tm ? R.filter(r => r[1] < tm).length : n),
    openN = offer && offer.open ? before(offer.t, offer.at) : null,
    // The kind kept with the card (from 2026-11-02); before, guessed from readiness and the answer count.
    kindOf = e =>
      !e
        ? ''
        : e[3]
          ? {s: 'start', c: 'card', a: 'all', b: 'back'}[e[3]] || 'card'
          : !e[1]
            ? 'card'
            : openAt != null && e[0] === openAt
              ? 'all'
              : 'start',
    CM = (C && C.map) || {},
    byKind = k => Object.keys(CM).filter(g => kindOf(CM[g]) === k && J.slate.has(g));
  const first = byKind('start').sort((a, b) => CM[a][0] - CM[b][0]),
    singles = byKind('card'),
    alls = byKind('all'),
    backs = byKind('back');
  const cardsLine = !C
    ? '<p class="note">Cards: loading…</p>'
    : C.none
      ? ''
      : C.anon
        ? '<p class="note">Cards: not saved (not signed in).</p>'
        : C.err
          ? `<p class="note">Cards: the player's saved progress could not be read (${esc(C.err)}); ↻ to try again.</p>`
          : `<ul class="adm-jcards">${jOrder([
              ...jStart(C.start, before),
              first.length
                ? [
                    cardT(CM[first[0]]) || null,
                    `<li><b>First cards</b> ${first.map(g => `<i>${esc(g)}</i>`).join(', ')} · ${jTime(cardT(CM[first[0]]))}</li>`
                  ]
                : [
                    null,
                    '<li><b>First cards</b> none saved (progress from before the cards, or played on another device not synced yet)</li>'
                  ],
              [null, `<li><b>Cards one at a time</b> ${singles.length}</li>`],
              ...(openAt != null
                ? [
                    [
                      offer.t || cardT([openAt]) || null,
                      `<li><b>Opened all genera</b> after answer ${openN} · ${jTime(offer.t || cardT([openAt]))}${offer.via ? ' · ' + (JVIA[offer.via] || esc(offer.via)) : ''} · ${offer.n ?? alls.length + backs.length} genera at once</li>`
                    ],
                    ...(offer.bk === 'one'
                      ? [
                          [
                            offer.bt || null,
                            `<li><b>Back to one at a time</b> after answer ${before(offer.bt, offer.bat)} · ${jTime(offer.bt)} · ${offer.bn} genera closed, ${backs.length} still closed</li>`
                          ]
                        ]
                      : offer.bk === 'keep'
                        ? [
                            [
                              offer.bt || null,
                              `<li><b>Kept all genera</b> when asked after answer ${before(offer.bt, offer.bat)} · ${jTime(offer.bt)}</li>`
                            ]
                          ]
                        : [])
                  ]
                : offer
                  ? [
                      [
                        offer.t || null,
                        `<li><b>Offer to open all</b> declined after answer ${offer.at}${offer.t ? ' · ' + jTime(offer.t) : ''}</li>`
                      ]
                    ]
                  : [[null, '<li><b>Open all genera</b> not used</li>']])
            ])}</ul>`;

  // Learned genera and when: the answer that passed the exam, i.e. the last right exam question (|x) on the genus
  // (Pierre, 2026-11-02: "you know which question validated the exam"). Once learned a genus gets no more exam
  // questions; if it is lost and learned again, the last one is still the one that counts. Learned before exam
  // questions were logged (2026-11-02): no such answer, the time is unknown.
  const LRN = PG
      ? Object.fromEntries(
          Object.entries(PG.G)
            .filter(([, s]) => s.mx)
            .map(([g, s]) => [g, s.mx])
        )
      : {},
    lrnAt = {};
  Object.keys(LRN).forEach(g => {
    let i = -1;
    R.forEach((r, k) => {
      if (r[2] === g && r[4] && /\|x$/.test(String(r[5]))) i = k;
    });
    lrnAt[g] = i >= 0 ? i : null;
  });
  const lrnPts = Object.entries(lrnAt)
      .filter(([g, i]) => i != null && J.slate.has(g))
      .sort((a, b) => a[1] - b[1]),
    lrnUnknown = Object.keys(LRN).filter(g => lrnAt[g] == null && J.slate.has(g)).length,
    // Only the genera whose time is known: one learned before times were kept has no place on the time line (counting it
    // from the first answer drew a learned genus where there was none; Pierre, 2026-11-02, "what is this curve based on?").
    lrnSeries = R.map((_, i) => lrnPts.filter(([, k]) => k <= i).length);

  // 1. Progress: right answers on the last WIN against what was expected of them, and genera met.
  const dayStarts = [];
  R.forEach((r, i) => {
    if (i && new Date(r[1]).toDateString() !== new Date(R[i - 1][1]).toDateString()) dayStarts.push([i, jDate(r[1])]);
  });
  const prog = `<section class="adm-scard adm-jwide"><h3>Progress</h3>
    <h4>Right answers, last ${JOURNEY.WIN} <span class="adm-jkey"><i class="acc"></i>right <i class="exp"></i>expected</span></h4>
    ${journeyChart(
      [
        {v: J.exp.map(v => (v == null ? null : v * 100)), cls: 'exp'},
        {v: J.acc.map(v => (v == null ? null : v * 100)), cls: 'acc'}
      ],
      100,
      {
        ticks: [
          [25, '25%'],
          [50, '50%'],
          [75, '75%'],
          [100, '100%']
        ],
        days: dayStarts,
        label: 'Right answers over time'
      }
    )}
    <h4>${jMany()} met${full ? ' and learned' : ''} <span class="adm-jkey"><i class="acc"></i>met ${J.marks.length}${of}${full ? ` <i class="lrn"></i>★ learned ${Object.keys(LRN).filter(g => J.slate.has(g)).length}${lrnUnknown ? ` (${lrnUnknown} learned before times were kept: not on the curve)` : ''}` : ''}</span></h4>
    ${journeyChart([{v: J.met, cls: 'met'}, ...(PG && !PG.err ? [{v: lrnSeries, cls: 'lrn'}] : [])], total, {
      ticks: [
        [Math.round(total / 2), Math.round(total / 2)],
        [total, total]
      ],
      days: dayStarts,
      dots: J.marks.map(([i, g, t]) => [i, J.met[i], `${g}: answer ${i + 1}, ${jTime(t)}`]),
      marks: openN != null ? [[Math.min(R.length - 1, openN), 'Opened all']] : [],
      stars: lrnPts.map(([g, i]) => [i, lrnSeries[i], `${g} learned: answer ${i + 1}, ${jTime(R[i][1])}`]),
      label: `${jMany()} met over time`
    })}
    <p class="adm-axis"><span>answer 1 · ${jDate(R[0][1])}</span><span>vertical lines: a new day</span><span>answer ${R.length} · ${jDate(R[R.length - 1][1])}</span></p>
    ${cardsLine ? `<h4>Cards</h4>${cardsLine}` : ''}</section>`;

  // 2. Easy and hard for them: right answers against the chance the game expected (photo difficulty, their level).
  const scored = Object.entries(J.G).filter(([, s]) => s.n >= JOURNEY.MIN && s.score != null),
    easy = scored
      .slice()
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, JOURNEY.TOP),
    hard = scored
      .slice()
      .sort((a, b) => a[1].score - b[1].score)
      .filter(([, s]) => s.score < 0.05)
      .slice(0, JOURNEY.TOP);
  const gl = L =>
    L.length
      ? `<table class="adm-tbl">${L.map(([g, s]) => `<tr><td>${jUnit(g)}</td><td class="n">${pct(s.ok, s.n)}</td><td class="n">${jPts(s.score)}</td><td class="n">${s.n}</td></tr>`).join('')}</table>`
      : `<p class="note">Not enough answers yet (${JOURNEY.MIN} per ${esc(ASUBJ.one)}).</p>`;
  const mixes = Object.entries(J.mix)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const notMet = [...J.slate].filter(g => !J.G[g]);
  const eh = `<section class="adm-scard"><h3>Easiest for them</h3>${gl(easy)}</section>
    <section class="adm-scard"><h3>Hardest for them</h3>${gl(hard)}</section>
    <section class="adm-scard"><h3>Mix-ups</h3>${
      mixes.length
        ? `<table class="adm-tbl">${mixes
            .map(([k, n]) => {
              const [a, b] = k.split('|');
              return `<tr><td><i>${esc(jName(a))}</i> → <i>${esc(jName(b))}</i></td><td class="n">${n}×</td></tr>`;
            })
            .join('')}</table>`
        : '<p class="note">None</p>'
    }${
      own && u.review
        ? `<h3>To review</h3><p>${u.review
            .split(', ')
            .map(g => `<i>${esc(g)}</i>`)
            .join(', ')}</p>`
        : ''
    }${full && notMet.length ? `<h3>Not met yet <small>${notMet.length}</small></h3><p class="adm-jnot">${notMet.map(g => `<i>${esc(jName(g))}</i>`).join(', ')}</p>` : ''}</section>`;

  // 3. Every genus asked, in the order they were met (or easiest / hardest first).
  const rows = Object.entries(J.G).sort((a, b) =>
    JSORT === 'easy'
      ? (b[1].score ?? -9) - (a[1].score ?? -9)
      : JSORT === 'hard'
        ? (a[1].score ?? 9) - (b[1].score ?? 9)
        : JSORT === 'n'
          ? b[1].n - a[1].n
          : a[1].first - b[1].first
  );
  // The card of a genus: the first ones, Open all, or a card on its own (after answer a, asked k answers later).
  const cardCell = g => {
    const e = CM[g],
      k = kindOf(e);
    if (!C || C.err || C.none) return '';
    if (!e) return '–';
    if (k === 'start') return `<span title="${esc(jTime(cardT(e)))}">first cards</span>`;
    if (k === 'all') return `<span title="${esc(jTime(cardT(e)))}">opened all</span>`;
    if (k === 'back') return `<span title="Closed by One at a time: ${esc(jTime(cardT(e)))}">closed again</span>`;
    const n = before(e[2], e[0]),
      later = J.G[g].first + 1 - n;
    return `<span title="${esc(jTime(cardT(e)))} · asked ${later === 1 ? 'at the next question' : `${later} questions later`}">#${n} · ${jDate(cardT(e))}</span>`;
  };
  // A genus's bar (core.js scoreOf) replayed, and the saved copy's when it differs.
  const SP = (!anonId && (savedFor(name, ASUBJ) || {}).P) || null,
    genProg = g => {
      if (!PG) return '…';
      const v = Math.round(100 * scoreOf(PG.G[g], PG.G, g)),
        o = SP && !PG.err ? Math.round(100 * scoreOf(SP[g], SP, g)) : v;
      return `${withSaved(v + '%', o + '%')} ${sbar(v, 100)}`;
    };
  const dots = h => `<span class="adm-jdots">${[...h].map(c => `<i class="${c === '1' ? 'ok' : 'ko'}"></i>`).join('')}</span>`,
    sortBtn = (k, t) => `<button type="button" data-jsort="${k}" aria-pressed="${JSORT === k}">${t}</button>`;
  const table = `<section class="adm-scard adm-jwide"><div class="adm-shead"><h3>${jMany()} <small>${rows.length}</small></h3><span class="adm-qseg adm-sseg" role="group">${sortBtn('met', 'Order met')}${sortBtn('easy', 'Easiest')}${sortBtn('hard', 'Hardest')}${sortBtn('n', 'Most asked')}</span></div>
    <div class="adm-tscroll"><table class="adm-tbl adm-jtbl"><thead><tr><th>${jOne()}</th>${full ? '<th title="When its card showed: after which answer">Card</th>' : ''}<th title="Its first question">First asked</th><th>Answers</th><th>Right</th><th title="Right answers against the chance the game expected">vs expected</th>${RP ? `<th title="The genus's bar, replayed from every answer in the log with the current rules (↻ saved: what the copy in the sheet still says)">Progress</th>` : ''}<th>Last 10</th><th>Answered instead</th></tr></thead><tbody>${rows
      .map(([g, s]) => {
        const inst = Object.entries(s.inst)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([x, n]) => `<i>${esc(jName(x))}</i> ${n}×`)
          .join(', ');
        return `<tr><td>${jUnit(g)}${g in LRN ? ` <span class="adm-jlearn" title="Learned (mastery exam passed)${lrnAt[g] != null ? ': ' + esc(jTime(R[lrnAt[g]][1])) : ''}">learned</span>` : ''}${J.slate.has(g) ? '' : ` <small>${jOffSlate(g, J.slate)}</small>`}</td>${full ? `<td class="n">${cardCell(g, s)}</td>` : ''}<td class="n" title="${esc(jTime(s.t0))}">#${s.first + 1} · ${jDate(s.t0)}</td><td class="n">${s.n}</td><td>${pct(s.ok, s.n)} ${sbar(s.ok, s.n, s.ok / s.n < 0.5 ? 'bad' : '')}</td><td class="n${s.score != null && s.score < -0.1 ? ' warnc' : ''}">${jPts(s.score)}</td>${RP ? `<td class="n">${genProg(g)}</td>` : ''}<td>${dots(s.h)}</td><td>${inst}</td></tr>`;
      })
      .join('')}</tbody></table></div></section>`;

  // 3b. Games (as on Players, Pierre 2026-11-02: "bring that page's numbers into the journey"), with the photo quiz
  // split: its own 4-choice questions, the "Again: A or B?" rematch after a mix-up (2 choices, logged as the photo
  // quiz), and the mastery exam questions (|x, from 2026-11-02); Look-alike duels are their own tab in Practice.
  const GM = [
      [
        'Quiz',
        r =>
          /^quiz(\||$)/.test(r[5]) &&
          !/\|[xdt](\||$)/.test(r[5]) &&
          String(r[10] || '')
            .split(' ')
            .filter(Boolean).length !== 2
      ],
      [
        'Again: A or B? (after a mix-up)',
        r =>
          /^quiz(\||$)/.test(r[5]) &&
          !/\|[dt](\||$)/.test(r[5]) &&
          String(r[10] || '')
            .split(' ')
            .filter(Boolean).length === 2
      ],
      // A duel slipped into the custom quiz is logged quiz|s|d|k2 (quiz.js answer).
      ['Look-alike duel in the quiz', r => /^quiz\|(s\|)?d(\||$)/.test(r[5])],
      // Typed questions (quiz.js, model.js TYPED, logged |t; their exam questions too, also counted under Mastery exam).
      ['Typed (recall)', r => /^quiz\|(.*\|)?t(\||$)/.test(r[5])],
      ['Mastery exam', r => /\|x$/.test(r[5])],
      // The custom quiz (quiz|s…, 2026-11-03): photo-quiz answers on the genera the player picked, also in the rows above.
      ['Custom quiz (genera picked)', r => /^quiz\|s(\||$)/.test(r[5])],
      ['Look-alike duels (tab)', r => /^quiz-duel/.test(r[5])],
      ['Other', r => !/^quiz/.test(r[5])]
    ].map(([t, f]) => {
      const L = R.filter(f);
      return [t, L.length, L.reduce((n, r) => n + r[4], 0)];
    }),
    games = `<section class="adm-scard"><h3>Games</h3><table class="adm-tbl">${GM.filter(([t, n]) => n || /^Look-alike duels/.test(t))
      .map(
        ([t, n, r]) => `<tr><td>${t}</td><td class="n">${pct(r, n)}</td><td>${n ? sbar(r, n) : ''}</td><td class="n">${n || '0'}</td></tr>`
      )
      .join('')}</table></section>`;

  // 4. When they played (Pierre, 2026-11-03: by the hour, not only by the day): one row a day from the first day to
  // the last, days without an answer included, one cell an hour (this device's time zone); the shade is the answers that
  // hour against the busiest hour, in 5 steps of the app's level ramp (--lv1..--lv5); answers and right share on hover.
  const DAY = 864e5,
    d0 = Number(dayKeys[0]),
    dN = Number(dayKeys[dayKeys.length - 1]),
    allDays = [];
  for (let d = new Date(d0); d.getTime() <= dN; d.setDate(d.getDate() + 1)) allDays.push(d.getTime()); // DST-safe
  const D = allDays.slice(-JOURNEY.DAYS),
    hmx = Math.max(1, ...D.flatMap(k => Object.values((J.perDay[k] || {}).h || {}).map(h => h.n))),
    hh = h => String(h).padStart(2, '0') + ':00',
    cell = (k, h) => {
      const o = ((J.perDay[k] || {}).h || {})[h];
      if (!o) return `<i title="${jDate(k)}, ${hh(h)}: no answer"></i>`;
      return `<i class="on" style="background:var(--lv${Math.max(1, Math.ceil((5 * o.n) / hmx))})" title="${jDate(k)}, ${hh(h)}-${hh((h + 1) % 24)}: ${o.n} answer${o.n === 1 ? '' : 's'}, ${pct(o.ok, o.n)} right"></i>`;
    },
    rowOf = k => {
      const o = J.perDay[k];
      return `<div class="adm-hrow${o ? '' : ' off'}"><span>${jDate(k)}</span>${[...Array(24)].map((_, h) => cell(k, h)).join('')}<b>${o ? o.n : ''}</b></div>`;
    };
  const daysSec = `<section class="adm-scard wide"><h3>When they played <small>${dayKeys.length} day${dayKeys.length === 1 ? '' : 's'}${allDays.length > D.length ? ` · last ${D.length}` : ''}</small></h3>
    <div class="adm-hours" role="img" aria-label="Answers per hour, one row a day">
      <div class="adm-hrow adm-hhead"><span></span>${[...Array(24)].map((_, h) => `<em>${h % 6 ? '' : h}</em>`).join('')}<b>Σ</b></div>
      ${D.map(rowOf).join('')}
    </div>
    <p class="adm-axis"><span class="adm-hkey">fewer${[1, 2, 3, 4, 5].map(k => `<i style="background:var(--lv${k})"></i>`).join('')}more</span><span>busiest hour ${hmx} · local time</span></p>
    <p class="note">${J.S.length} session${J.S.length === 1 ? '' : 's'}${(c => (c ? ` (${c} with the custom quiz)` : ''))(J.S.filter(L => L.some(r => /^quiz\|s(\||$)/.test(r[5]))).length)} · median ${medS} answers · first ${jTime(R[0][1])} · last ${jTime(R[R.length - 1][1])}</p></section>`;

  // 5. Genus sheets opened (sheet v30 'pages', admin.js loadPages, sheetsOf; Pierre, 2026-11-03: do players read the
  // sheets, and when?): per genus the times opened and the time spent, whether the first opening came before or after
  // the genus was first asked to them (the app's own record when the sheet was opened), and from where; then the pages
  // they spent their visits on. Read from the sheet's Pages tab under this player's id, never their name.
  // an archived record's summaries come apart from the others (sheet v58 readEvents arch): read only here
  const PR = PGS && (u.arch ? PGS.arch : PGS.rows),
    SH = PR ? sheetsOf(PR.filter(x => x.id === u.id)) : null,
    secs = n =>
      n < 60
        ? `${n} s`
        : n < 3600
          ? `${Math.round(n / 60)} min`
          : `${Math.floor(n / 3600)} h ${String(Math.round((n % 3600) / 60)).padStart(2, '0')}`,
    FROM_T = {quiz: 'Quiz feedback', learn: 'Learn', progress: 'My progress', other: 'Other'},
    RT_ = Object.create(null);
  if (SH)
    PR.filter(x => x.id === u.id).forEach(x =>
      Object.entries(x.r).forEach(([k, [n, sc]]) => {
        const o = (RT_[k] = RT_[k] || [0, 0]);
        o[0] += n;
        o[1] += sc;
      })
    );
  // A page of another subject than the corals is logged as <subject>.<page> (core.js pageName): "quiz (Fish)".
  const pageLabel = k => {
    const [sj, pg] = pageSubj(k),
      S = subjectOf(sj);
    return esc(pg) + (S.pv ? ` (${esc(S.name)})` : '');
  };
  const pagesTop = Object.entries(RT_)
    .sort((a, b) => b[1][1] - a[1][1] || b[1][0] - a[1][0])
    .slice(0, 8);
  const sheetsSec = `<section class="adm-scard" data-jsheets><h3>Genus sheets opened${SH ? ` <small>${SH.G.length}</small>` : ''}</h3>${
    !PGS
      ? '<p class="note">Loading…</p>'
      : PGS.err
        ? `<p class="note">${esc(PGS.err)}</p>`
        : !SH.visits
          ? '<p class="note">No visit recorded yet.</p>'
          : `${
              SH.G.length
                ? `<div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th>Genus</th><th class="n">Times</th><th class="n">Time</th><th>First opened</th><th>From</th></tr></thead><tbody>${SH.G.map(
                    o =>
                      `<tr><td><a class="adm-gen" href="${esc(genusHref(o.g))}"><i>${esc(o.g)}</i></a></td><td class="n">${o.n}</td><td class="n">${secs(o.s)}</td><td title="Opened first ${esc(jTime(o.first))}">${o.asked ? 'after asked' : '<b>before asked</b>'}</td><td>${FROM_T[o.from] || 'Other'}</td></tr>`
                  ).join('')}</tbody></table></div>`
                : '<p class="note">None opened.</p>'
            }<p class="note">${SH.visits} visit${SH.visits === 1 ? '' : 's'} recorded · most time on ${pagesTop.map(([k, [n, sc]]) => `${pageLabel(k)} ${secs(sc)} (${n}×)`).join(', ')}</p>`
  }</section>`;

  $v.innerHTML =
    head +
    kpis([
      ['Answers', R.length],
      ['Quiz right', pct(sp.q[1], sp.q[0])],
      ['Last 50', pct(sp.q50[1], sp.q50[0])],
      ...(sp.d[0] ? [['Duels', `${sp.d[0]} · ${pct(sp.d[1], sp.d[0])}`]] : []),
      // The sheet's level chain (stats_ ras, the photo Elo's player term) ± its 95% margin (Pierre, 2026-11-05: the signed
      // level read as good or bad); the level in its title. Not the number players see since v63 (Q134: they see the app's
      // '~level'): it is the one level every device has, signed in or not, and the one the margin (levelMargin) is for.
      ...(own ? [['Elo', eloText(lv, ofAns('margin', () => levelMargin(ANS.rows || []))[u.id])]] : []),
      [`${jMany()} met`, `${J.marks.length}${of}`],
      // Replayed from the whole log (progOf); Learned needs the saved copy (the mastery exams): not for a device that never
      // signed in.
      ...(RP ? [['Progress', !PG ? '…' : withSaved(PG.pct + '%', PG.saved && PG.saved.pct + '%')]] : []),
      ...(anonId || !full
        ? []
        : [
            [
              'Learned',
              !RP
                ? `${u.learned}/${u.total || total}`
                : !PG
                  ? '…'
                  : PG.err
                    ? `${u.learned}/${u.total || total}`
                    : withSaved(`${PG.learned}/${PG.total}`, PG.saved && `${PG.saved.learned}/${PG.total}`)
            ]
          ]),
      ['Days', dayKeys.length],
      ['Sessions', J.S.length],
      ...(RT.length ? [['Median time', RT[Math.floor(RT.length / 2)].toFixed(1) + ' s']] : []),
      ...(ZM.length ? [['Enlarged', pct(ZM.filter(Boolean).length, ZM.length)]] : [])
    ]) +
    `<div class="adm-sgrid adm-journey">${prog}${eh}${table}${games}${own ? sheetsSec : ''}${recentSessions(R, {own: 1, user: anonId ? {id: anonId, anon: 1} : u})}${daysSec}</div>`;
  bindJReload();
  bindSess(); // the sessions unfold under their row (admin.js)
  pagesFresh(here); // read again once stale (admin.js)
  $v.querySelectorAll('[data-jsort]').forEach(
    b =>
      (b.onclick = () => {
        JSORT = b.dataset.jsort;
        render();
      })
  );
}

// ↻ on the journey: the answers, the players, the pages opened and this player's saved progress read again.
function bindJReload() {
  const b = $v.querySelector('[data-jload]');
  if (b)
    b.onclick = () => {
      savedClear();
      sheetAgain('users', 'ans', 'stats', 'pages');
      render();
    };
}

// sessfacts: begin
// One session of Players › Activity › Recent sessions, unfolded under its row (Pierre, 2026-11-05: "what the player made
// of the session": its success chart, start / end / length, answers and % right, genera met or opened, notable events,
// the most improved genera, the main difficulties met, achievements unlocked, a link to the Journey; a short summary,
// not raw numbers only). The explanations are in the page help (HELP.stats, rule A2).
const SESS = {
  WIN: 10, // answers in the session's rolling "right" curve (drawn from the 5th answer, as the Journey's)
  TOP: 3, // genera, pairs and photos in each list
  MISS: 2, // misses on a genus in the session before it is a difficulty
  GAIN: 0.02, // gain of a genus's bar (2 points) before it counts as improved
  RUN: 10, // right answers in a row worth telling (the "On a roll" achievement's run)
  END: 3, // misses in a row at the end worth telling
  EDGE: 5 * 6e4, // ms around the session's answers within which a card, an offer or an achievement belongs to it
  PAD: 5 // the chart's scale starts this many points under the session's lowest value, rounded down to 10 (Pierre, 2026-11-05)
};
// The facts of a session, pure (tests/session.test.js): L its answers (one player's rows, in time order), B the player's
// earlier answers (in time order); o: diff (photo file -> difficulty or null), prog ({genus: [bar before, bar after]}),
// saved (the player's saved copy: intro, offer, ach; null while it is read, absent for a device never signed in).
function sessionFacts(L, B, o = {}) {
  const t0 = L[0][1],
    t1 = L[L.length - 1][1],
    inS = t => typeof t === 'number' && t >= t0 - SESS.EDGE && t <= t1 + SESS.EDGE,
    asked = new Set(B.map(r => r[2])),
    E = L.filter(r => typeof r[7] === 'number'),
    met = [],
    M = {},
    MX = {},
    PH = {},
    acc = [],
    exp = [];
  let run = 0,
    best = 0,
    end = 0;
  L.forEach((r, i) => {
    if (!asked.has(r[2]) && !met.some(x => x[1] === r[2])) met.push([i, r[2]]);
    const m = (M[r[2]] = M[r[2]] || [0, 0]);
    m[1]++;
    run = r[4] ? run + 1 : 0;
    best = Math.max(best, run);
    end = r[4] ? 0 : end + 1;
    if (!r[4]) {
      m[0]++;
      if (r[3] && r[3] !== r[2]) MX[r[2] + '|' + r[3]] = (MX[r[2] + '|' + r[3]] || 0) + 1;
      // The hardest photo the question showed (its difficulty for everyone, the photo Elo), once per photo.
      const fs = String(r[6] || '')
        .split(' ')
        .filter(Boolean)
        .map(f => [f, o.diff ? o.diff(f) : null])
        .sort((a, b) => (b[1] ?? -99) - (a[1] ?? -99));
      if (fs.length && !PH[fs[0][0]]) PH[fs[0][0]] = {f: fs[0][0], d: fs[0][1], g: r[2], a: r[3], i};
    }
    const W = L.slice(Math.max(0, i - SESS.WIN + 1), i + 1),
      We = W.filter(x => typeof x[7] === 'number');
    acc.push(i < 4 ? null : W.reduce((n, x) => n + x[4], 0) / W.length);
    exp.push(i < 4 || !We.length ? null : We.reduce((n, x) => n + x[7], 0) / We.length);
  });
  const S = o.saved,
    count = re => {
      const X = L.filter(r => re.test(String(r[5])));
      return [X.length, X.filter(r => r[4]).length];
    };
  return {
    n: L.length,
    ok: L.filter(r => r[4]).length,
    exp: E.length ? E.reduce((n, r) => n + r[7], 0) / E.length : null,
    t0,
    t1,
    gap: B.length ? t0 - B[B.length - 1][1] : null,
    met,
    // Genera whose card showed in the session but not asked in it yet (the app shows a card before the first question).
    opened: !S
      ? S
      : Object.entries(S.intro || {})
          .filter(([g, e]) => Array.isArray(e) && inS(e[2]) && !asked.has(g) && !met.some(x => x[1] === g))
          .map(([g]) => g),
    missed: Object.entries(M)
      .filter(([, m]) => m[0] >= SESS.MISS)
      .sort((a, b) => b[1][0] - a[1][0] || a[1][1] - b[1][1])
      .slice(0, SESS.TOP)
      .map(([g, [k, n]]) => [g, k, n]),
    mix: Object.entries(MX)
      .filter(([, n]) => n >= SESS.MISS)
      .sort((a, b) => b[1] - a[1])
      .slice(0, SESS.TOP)
      .map(([k, n]) => [...k.split('|'), n]),
    photos: Object.values(PH)
      .sort((a, b) => (b.d ?? -99) - (a.d ?? -99) || a.i - b.i)
      .slice(0, SESS.TOP),
    improved: Object.entries(o.prog || {})
      .filter(([, [a, b]]) => b - a >= SESS.GAIN - 1e-9)
      .sort((x, y) => y[1][1] - y[1][0] - (x[1][1] - x[1][0]))
      .slice(0, SESS.TOP)
      .map(([g, [a, b]]) => [g, a, b]),
    best,
    end,
    exam: count(/\|x$/),
    typed: count(/^quiz\|(.*\|)?t(\||$)/),
    acc,
    expS: exp,
    ach: !S
      ? S
      : Object.entries(S.ach || {})
          .filter(([k, t]) => k[0] !== '_' && inS(t))
          .sort((a, b) => a[1] - b[1])
          .map(([k]) => k),
    offer: S && S.offer && (inS(S.offer.t) || inS(S.offer.bt)) ? S.offer : null,
    inS
  };
}
// sessfacts: end

// One player's answers in time order, filtered once per answer log read.
let SROWS = null;
const sessRows = id => {
  if (!SROWS || SROWS.ans !== ANS) SROWS = {ans: ANS, by: {}};
  const k = ASUBJ.id + '|' + id; // the subject on screen's (admin.js rowsOf)
  return (
    SROWS.by[k] ||
    (SROWS.by[k] = rowsOf()
      .filter(r => r[0] === id)
      .sort((a, b) => a[1] - b[1]))
  );
};
// The bars of the genera the session touched before and after it, and the progress %: the player's answers replayed
// with today's rules up to the session's first answer, then through it (core.js replayProgress, as admin.js progOf:
// the sheet's photo memory and confusions, the saved copy's reset and first-launch answer). The replay has no mastery
// exam: a genus learned now (PG, progOf's full replay) counts as learned from the time it was passed. Memoized.
const SPROG = new Map();
function sessProg(id, all, L, S, PG) {
  const key = ASUBJ.id + '|' + id + '|' + L[0][1],
    m = SPROG.get(key);
  if (m && m.ans === ANS && m.S === S && m.PG === PG && m.mem === SMEM && m.n === L.length) return m.v;
  const ok = S && !S.err,
    reset = ok && S.reset ? Date.parse(S.reset) : 0,
    M = unitsOf(ASUBJ),
    o = {
      gen: M.gen,
      ...statsFor(ASUBJ),
      since: reset ? {[id]: reset} : {},
      starts: ok && S.start ? {[id]: S.start} : {}
    },
    t0 = L[0][1],
    A = replayProgress(
      all.filter(r => r[1] < t0),
      o
    )[id] || {P: {}},
    B = replayProgress(L, {...o, start: {[id]: A}})[id] || {P: {}},
    marked = (P, t) => {
      const out = {...P};
      Object.entries((PG && PG.G) || {}).forEach(([g, s]) => {
        if (s && s.mx && s.mx <= t && out[g]) out[g] = {...out[g], mx: s.mx};
      });
      return out;
    },
    Pa = marked(A.P, t0 - 1),
    Pb = marked(B.P, L[L.length - 1][1] + SESS.EDGE),
    slate = M.slate,
    prog = {};
  new Set(L.flatMap(r => [r[2], r[3]])).forEach(
    g => g && g !== LEVEL && Pb[g] && (prog[g] = [scoreOf(Pa[g], Pa, g), scoreOf(Pb[g], Pb, g)])
  );
  const v = {prog, pct: [pctOf(Pa, slate), pctOf(Pb, slate)]};
  SPROG.set(key, {ans: ANS, S, PG, mem: SMEM, n: L.length, v});
  return v;
}
// The summary drawn under a session's row (admin.js recentSessions): id the player's anonymous id, L the session's
// answers, name the player's name when signed in (their saved copy: cards, offer, achievements, learned genera).
// o (a Journey's sessions): user, the player (an archived record too), all, their rows in time order.
function sessionSummary(id, L, name, o = {}) {
  // The subject on screen's answers, saved copy and replay (admin.js unitsOf, savedFor, progOf); before its units are read
  // (fishAdmin), its answers only.
  const full = !!unitsOf(ASUBJ),
    all = o.all || sessRows(id),
    B = all.filter(r => r[1] < L[0][1]),
    S = name && full ? savedFor(name, ASUBJ) : {P: {}},
    PG = full ? progOf(o.user || (name ? (USERS.users || []).find(x => x.name === name) : {id, anon: 1}), true, ASUBJ) : null,
    RP = full && replayOn(),
    sp = RP && S && PG ? sessProg(id, all, L, S, PG) : null,
    PS = photoStats() || {},
    F = sessionFacts(L, B, {
      diff: f => (PS[f] ? PS[f][0] : null),
      prog: sp && sp.prog,
      saved: !name || !full ? undefined : S && !S.err ? S : S && {}
    }),
    gi = g => `<i>${esc(jName(g))}</i>`,
    gl = jUnit,
    names = G =>
      G.map(gi)
        .join(', ')
        .replace(/, ([^,]*)$/, ' and $1'),
    wait = '<p class="note">…</p>',
    span = ms => {
      const mn = Math.round(ms / 6e4);
      return mn < 60 ? `${mn} min` : mn < 2880 ? `${Math.round(mn / 60)} h` : `${Math.round(mn / 1440)} days`;
    };
  // Learned in the session: a genus learned now (PG) whose last right exam question (|x) is one of the session's, as the
  // Journey's ★ (the answer that passed the exam).
  const lastX = {},
    inL = new Set(L);
  all.forEach(r => r[4] && /\|x$/.test(String(r[5])) && (lastX[r[2]] = r));
  const learned = !PG || (name && !S) ? null : Object.keys(PG.G || {}).filter(g => PG.G[g] && PG.G[g].mx && inL.has(lastX[g]));

  // The summary in words: what the session brought, then what was hard.
  const said = [
    `${F.n} answer${F.n === 1 ? '' : 's'} in ${sessLen(L)}, ${pct(F.ok, F.n)} right${F.exp != null ? ` where ${Math.round(100 * F.exp)}% was expected` : ''}.`
  ];
  if (F.met.length)
    said.push(F.met.length <= 3 ? `Met ${names(F.met.map(x => x[1]))} for the first time.` : `Met ${F.met.length} new ${esc(ASUBJ.many)}.`);
  if (F.offer && F.offer.open && F.inS(F.offer.t)) said.push('Opened all genera.');
  if (learned && learned.length) said.push(`Learned ${names(learned)}.`);
  if (F.improved.length)
    said.push(`Most progress on ${names(F.improved.slice(0, 2).map(x => x[0]))} (${jPts(F.improved[0][2] - F.improved[0][1])}).`);
  if (F.missed.length) {
    const [g, k, n] = F.missed[0],
      mx = F.mix.find(x => x[0] === g);
    said.push(`Most misses on ${gi(g)} (${k} of ${n})${mx ? `, taken for ${gi(mx[1])}` : ''}.`);
  } else if (F.mix.length) said.push(`Took ${gi(F.mix[0][0])} for ${gi(F.mix[0][1])} ${F.mix[0][2]} times.`);
  if (F.end >= SESS.END) said.push(`Ended on ${F.end} misses in a row.`);
  if (F.ach && F.ach.length)
    said.push(
      F.ach.length === 1 ? `Unlocked “${esc((achFind(F.ach[0]) || {}).title || F.ach[0])}”.` : `Unlocked ${F.ach.length} achievements.`
    );

  // The chart: right answers over the session's last SESS.WIN against the expected, a dot at each new genus's first
  // question, a ★ at a genus learned; a session too short for a curve shows its answers as dots.
  // The scale: from under the session's lowest point (SESS.PAD, rounded down to 10) to 100%, so its evolution shows
  // (Pierre, 2026-11-05: 0-100% squashed it). On desktop the chart takes the left of the panel, the lists the right.
  const vals = [...F.acc, ...F.expS].filter(v => v != null).map(v => v * 100),
    lo = vals.length ? Math.max(0, Math.min(90, Math.floor((Math.min(...vals) - SESS.PAD) / 10) * 10)) : 0,
    pw = Math.min(innerWidth - 84, ($v.clientWidth || 900) - 48),
    chart =
      F.n >= 5
        ? `<h4>Right answers, last ${SESS.WIN} <span class="adm-jkey"><i class="acc"></i>right <i class="exp"></i>expected${F.met.length ? ' <b class="adm-sdot">○</b>first question' : ''}</span></h4>${journeyChart(
            [
              {v: F.expS.map(v => (v == null ? null : v * 100)), cls: 'exp'},
              {v: F.acc.map(v => (v == null ? null : v * 100)), cls: 'acc'}
            ],
            100,
            {
              min: lo,
              ticks: [
                [lo, lo + '%'],
                ...(100 - lo >= 40 ? [[Math.round((lo + 100) / 20) * 10, Math.round((lo + 100) / 20) * 10 + '%']] : []),
                [100, '100%']
              ],
              dots: F.met.map(([i, g]) => [i, lo, `${g}: first question`]),
              stars: (learned || []).map(g => [L.indexOf(lastX[g]), 100, `${g} learned`]),
              label: 'Right answers in the session',
              w: Math.max(280, Math.min(900, innerWidth >= 1024 ? Math.round(pw * 0.42) : pw)),
              h: 140
            }
          )}`
        : `<p class="adm-jdots">${L.map(r => `<i class="${r[4] ? 'ok' : 'ko'}"></i>`).join('')}</p>`;

  // The lists, in the order of Pierre's list: new genera, events, most improved, difficulties (genera, mix-ups, photos),
  // achievements.
  const block = (t, body, cls) => (body ? `<div${cls ? ` class="${cls}"` : ''}><h4>${t}</h4>${body}</div>` : ''),
    newG =
      F.met.length || (F.opened && F.opened.length)
        ? `<p>${[...F.met.map(x => gi(x[1])), ...(F.opened || []).map(g => `${gi(g)} <small>card</small>`)].join(', ')}</p>`
        : '',
    impr = !RP
      ? ''
      : !sp
        ? wait
        : F.improved.length
          ? `<table class="adm-tbl">${F.improved.map(([g, a, b]) => `<tr><td>${gl(g)}</td><td class="n">${Math.round(100 * a)}% → ${Math.round(100 * b)}%</td><td class="n">${jPts(b - a)}</td></tr>`).join('')}</table>`
          : '',
    VT = {wide: 'Colony', medium: 'Close-up', macro: 'Corallites'},
    // A photo everyone misses (Health's rule, admin.js healthBad: answered by 3 players or more, most of whom miss it,
    // and under 40% right over 5 answers or more, or clearly harder than its genus's other photos) says so (Pierre,
    // 2026-11-05), beside its difficulty (admin.js recBadge).
    hardAll = ofAns('hardAll', () => new Set(healthBad(ANS.rows || []).map(o => o.p.f))),
    tile = x => {
      // A unit of the site's coral data only (another subject's photos are not in its registry).
      const p = DATA.gen[x.g] && photos(x.g).find(q => q.f === x.f);
      return p
        ? `<figure class="adm-htile"><button type="button" class="adm-ph" data-zf="${esc(p.f)}" data-g="${esc(x.g)}" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy"></button><figcaption>${gi(x.g)}${x.a && x.a !== x.g ? ` → ${gi(x.a)}` : ''} <span>${VT[viewOf(x.g, p)] || ''}</span>${
            x.d != null || hardAll.has(p.f)
              ? ` <span class="adm-hnum">${x.d != null ? `recognised by ${recBadge(x.d, {short: 1, raw: 'photo difficulty'})}` : ''}${x.d != null && hardAll.has(p.f) ? ' · ' : ''}${hardAll.has(p.f) ? '<span data-hardall>hard for everyone</span>' : ''}</span>`
              : ''
          }</figcaption></figure>`
        : '';
    },
    tiles = F.photos.map(tile).join(''),
    diff =
      F.missed.length || F.mix.length || tiles
        ? `${
            F.missed.length || F.mix.length
              ? `<table class="adm-tbl">${F.missed.map(([g, k, n]) => `<tr><td>${gl(g)}</td><td class="n">${k} of ${n} missed</td></tr>`).join('')}${F.mix.map(([a, b, n]) => `<tr><td>${gi(a)} → ${gi(b)}</td><td class="n">${n}×</td></tr>`).join('')}</table>`
              : ''
          }${tiles ? `<div class="adm-hphotos">${tiles}</div>` : ''}`
        : '',
    achs =
      F.ach === null
        ? wait
        : F.ach && F.ach.length
          ? `<ul class="adm-jcards">${F.ach
              .map(k => achFind(k))
              .filter(Boolean)
              .map(a => `<li title="${esc(a.desc)}">${a.icon} ${esc(a.title)}</li>`)
              .join('')}</ul>`
          : '',
    SS = sessionsOf(all),
    k = SS.findIndex(s => s.L[0] === L[0]) + 1,
    before = (tm, n) => (tm ? all.filter(r => r[1] < tm).length : n),
    ev = [
      [0, `<li><b>Session ${k}</b> of ${SS.length}${F.gap != null ? ` · ${span(F.gap)} after the last` : ''}</li>`],
      ...(F.offer
        ? [
            ...(F.inS(F.offer.t)
              ? [
                  [
                    F.offer.t,
                    `<li><b>${F.offer.open ? 'Opened all genera' : 'Offer to open all'}</b>${F.offer.open ? '' : ' declined'} after answer ${before(F.offer.t, F.offer.at)}</li>`
                  ]
                ]
              : []),
            ...(F.inS(F.offer.bt) && F.offer.bk
              ? [
                  [
                    F.offer.bt,
                    `<li><b>${F.offer.bk === 'one' ? 'Back to one at a time' : 'Kept all genera'}</b> after answer ${before(F.offer.bt, F.offer.bat)}</li>`
                  ]
                ]
              : [])
          ]
        : []),
      // The first-launch question and its fallback cards (the Journey's Cards list, jStart), when given in the session.
      ...(name && S && !S.err && S.start ? jStart(S.start, before).filter(([t]) => F.inS(t)) : []),
      ...(learned || []).map(g => [lastX[g][1], `<li><b>Learned</b> ${gi(g)} ★</li>`]),
      ...(F.exam[0] ? [[null, `<li><b>Mastery exam</b> ${F.exam[0]} question${F.exam[0] === 1 ? '' : 's'}, ${F.exam[1]} right</li>`]] : []),
      ...(F.typed[0] ? [[null, `<li><b>Typed</b> ${F.typed[0]}, ${F.typed[1]} right</li>`]] : []),
      ...(F.best >= SESS.RUN ? [[null, `<li><b>${F.best} right</b> in a row</li>`]] : []),
      ...(F.end >= SESS.END ? [[null, `<li><b>Ended</b> on ${F.end} misses in a row</li>`]] : [])
    ],
    link = name ? `#players/list/journey/${encodeURIComponent(name)}` : `#players/list/anon/${encodeURIComponent(id)}`;
  return `<div class="adm-sess" data-sess>
    <p class="adm-sesssum">${said.join(' ')}</p>
    ${kpis([
      ['Start → end', `${clock(F.t0)} → ${dateText(F.t1, 'hm')}`],
      ['Length', sessLen(L)],
      ['Answers', F.n],
      [
        'Right',
        `${pct(F.ok, F.n)}${F.exp != null ? ` <small class="adm-sexp" title="Expected">exp. ${Math.round(100 * F.exp)}%</small>` : ''}`
      ],
      ...(RP ? [['Progress', sp ? `${sp.pct[0]}% → ${sp.pct[1]}%` : '…']] : [])
    ])}
    <div class="adm-sessbody"><div class="adm-sesschart">${chart}</div>
    <div class="adm-sessgrid">${block(`New ${esc(ASUBJ.many)}`, newG)}${block('Events', `<ul class="adm-jcards">${jOrder(ev)}</ul>`)}${block(
      'Most improved',
      impr
    )}${block('Difficulties', diff, tiles ? 'adm-swide' : '')}${block('Achievements', achs)}</div>
    <p class="adm-sesslink"><a class="next" href="${link}">Journey →</a></p></div></div>`;
}
