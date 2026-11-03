// Player journey (Pierre, 2026-11-02, the first RAs playing: "more on each player: their progress, the genera that were
// easy and less easy for them, when they unlocked each genus, an analysis of a person's path"). Built from the answer
// log the Players page already loads (ANS.rows, sheet readAnswers: [anonymous id, time, genus shown, answered, right,
// mode, photos, expected, ability, new photos, choices, anonymous]), joined to the name by the player's anonymous id
// (USERS, sheet v13). Nothing new on the sheet. Opened from a row of Players (#~journey/<name>). Loaded after admin.js,
// whose helpers it uses (esc, pct, kpis, sbar, sgn, loadUsers, loadStats, HEALTH, DATA). The explanations are in the
// page help (HELP.journey, rule 23).
const JOURNEY = {
  WIN: 20, // answers in the rolling "right" curve
  MIN: 3, // answers on a genus before it can be called easy or hard for the player
  TOP: 5, // genera in the easiest / hardest lists
  DAYS: 60 // at most this many days in the per-day chart (the last ones)
};
let JSORT = 'met';
// First-meeting cards and Open all genera, from the player's saved progress (sheet userData, admin token): the app keeps
// them as imr-coral-intro {genus: [answers so far, 1 for the first cards or Open all, time shown]} and
// imr-coral-intro-offer {at, open, via, t} (model.js INTRO; times and via from 2026-11-02). name -> null while loading.
const JDATA = {};
function journeyCards(name) {
  // Kept, a failed read too (shown with its error), until Players' ↻ or the journey's clears it: a read is never
  // started again by itself (Codex review #352: an error re-read at once looped).
  if (name in JDATA) return JDATA[name];
  JDATA[name] = null;
  userPost({userData: name})
    .then(j => {
      const d = (j && j.ok && j.data) || {},
        P = k => {
          try {
            return JSON.parse(d[k] || 'null');
          } catch (e) {
            return null;
          }
        };
      // Learned genera (mx: mastery exam passed; its time from 2026-11-02, 1 before).
      const prog = P('imr-coral-progress') || {},
        learned = Object.fromEntries(
          Object.entries(prog)
            .filter(([, s]) => s && s.mx)
            .map(([g, s]) => [g, s.mx])
        );
      JDATA[name] =
        j && j.ok ? {map: P('imr-coral-intro') || {}, offer: P('imr-coral-intro-offer'), learned} : {err: (j && j.error) || 'unreachable'};
    })
    .catch(() => (JDATA[name] = {err: 'unreachable'}))
    .then(() => cur === '~journey/' + name && render());
  return null;
}
const JVIA = {card: 'on the first cards', progress: 'from My progress', offer: 'from the offer card'};
const jDate = t => dateText(t, 'dm'), // one formatter per format (admin.js dateText; Pierre, 2026-11-03: admin pages load slower)
  jTime = t => dateText(t, 'dmhm'),
  jPts = x => (x == null ? '–' : `${x > 0 ? '+' : ''}${Math.round(100 * x)} pts`);

// Everything the page shows, from one player's answers in time order.
function journeyOf(R) {
  // The slate as the app counts it (core.js slateOf, as app.js slateGenera): the IMR coral slate and BENTHIC (Millepora).
  const slate = new Set(slateOf(DATA)),
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
  // Sessions: answers less than HEALTH.GAP minutes apart (as the Health page counts them).
  const S = [];
  R.forEach((r, i) => {
    if (!i || r[1] - R[i - 1][1] > HEALTH.GAP * 60e3) S.push([]);
    S[S.length - 1].push(r);
  });
  Object.values(G).forEach(s => (s.score = s.en ? s.res / s.en : null));
  return {G, acc, exp, met, marks, mix, perDay, S, slate};
}

// A line chart over the answers (x = answer number): series [{v: [...], cls}], y from 0 to top.
function journeyChart(series, top, opt = {}) {
  // Drawn at the page's width (a little under it, so never scaled down), so its labels keep the 12 px minimum (--fs-xs)
  // on a phone as on a desktop (AGENTS.md rule 18; Codex review #351).
  const W = Math.max(300, Math.min(1100, ($v.clientWidth || 900) - 56)),
    H = 190,
    pl = 34,
    pr = 8,
    pt = 8,
    pb = 22,
    n = Math.max(2, series[0].v.length),
    x = i => pl + ((W - pl - pr) * i) / (n - 1),
    y = v => pt + (H - pt - pb) * (1 - v / top);
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
  const here = anonId ? '~anon/' + anonId : '~journey/' + name;
  status();
  const back = `<a class="adm-fchip plain" href="#~users">← Players</a><button type="button" class="adm-fchip plain" data-jload title="Reload">↻</button>`;
  if (!USERS || !ANS) {
    $v.innerHTML = `<div class="adm-shead">${back}<h2>${esc(anonId ? 'Not signed in · ' + anonId : name)}</h2></div><p class="note">Loading…</p>`;
    Promise.all([USERS ? null : loadUsers(), ANS ? null : loadStats()]).then(() => {
      if (cur === here) render();
    });
    return;
  }
  // A device that never signed in (Pierre, 2026-11-03): #~anon/<its anonymous id>, from Players > Not signed in. Its
  // answers are all there is: no saved progress, so no cards and no learned genera.
  const u = anonId ? {name: 'Not signed in · ' + anonId, id: anonId} : (USERS.users || []).find(x => x.name === name);
  if (!u || !u.id) {
    $v.innerHTML = `<div class="adm-shead">${back}<h2>${esc(anonId ? 'Not signed in · ' + anonId : name)}</h2></div><p class="note">${u ? 'No anonymous id for this player yet (sheet script v13).' : 'No player by this name.'}</p>`;
    bindJReload();
    return;
  }
  const R = (ANS.rows || []).filter(r => r[0] === u.id).sort((a, b) => a[1] - b[1]);
  const head = `<div class="adm-shead">${back}<h2>${esc(u.name)}</h2>${isMe(u.id) ? '<small class="note">you</small>' : ''}</div>`;
  if (!R.length) {
    $v.innerHTML = head + '<p class="note">No answers yet.</p>';
    bindJReload();
    return;
  }
  const J = journeyOf(R),
    total = J.slate.size,
    lv = RAS[u.id] ? RAS[u.id][0] : null,
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
  const C = anonId ? {anon: 1, map: {}, offer: null, learned: {}} : journeyCards(name),
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
          ? {s: 'start', c: 'card', a: 'all'}[e[3]] || 'card'
          : !e[1]
            ? 'card'
            : openAt != null && e[0] === openAt
              ? 'all'
              : 'start',
    CM = (C && C.map) || {},
    byKind = k => Object.keys(CM).filter(g => kindOf(CM[g]) === k && J.slate.has(g));
  const first = byKind('start').sort((a, b) => CM[a][0] - CM[b][0]),
    singles = byKind('card'),
    alls = byKind('all');
  const cardsLine = !C
    ? '<p class="note">Cards: loading…</p>'
    : C.anon
      ? '<p class="note">Cards: not saved (not signed in).</p>'
      : C.err
        ? `<p class="note">Cards: the player's saved progress could not be read (${esc(C.err)}); ↻ to try again.</p>`
        : `<ul class="adm-jcards">${
            first.length
              ? `<li><b>First cards</b> ${first.map(g => `<i>${esc(g)}</i>`).join(', ')} · ${jTime(cardT(CM[first[0]]))}</li>`
              : '<li><b>First cards</b> none saved (progress from before the cards, or played on another device not synced yet)</li>'
          }<li><b>Cards one at a time</b> ${singles.length}</li>${
            openAt != null
              ? `<li><b>Opened all genera</b> after answer ${openN} · ${jTime(offer.t || cardT([openAt]))}${offer.via ? ' · ' + (JVIA[offer.via] || esc(offer.via)) : ''} · ${alls.length} genera at once</li>`
              : offer
                ? `<li><b>Offer to open all</b> declined after answer ${offer.at}${offer.t ? ' · ' + jTime(offer.t) : ''}</li>`
                : '<li><b>Open all genera</b> not used</li>'
          }</ul>`;

  // Learned genera and when: the answer that passed the exam, i.e. the last right exam question (|x) on the genus
  // (Pierre, 2026-11-02: "you know which question validated the exam"). Once learned a genus gets no more exam
  // questions; if it is lost and learned again, the last one is still the one that counts. Learned before exam
  // questions were logged (2026-11-02): no such answer, the time is unknown.
  const LRN = (C && C.learned) || {},
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
    <h4>Genera met and learned <span class="adm-jkey"><i class="acc"></i>met ${J.marks.length}/${total} <i class="lrn"></i>★ learned ${Object.keys(LRN).filter(g => J.slate.has(g)).length}${lrnUnknown ? ` (${lrnUnknown} learned before times were kept: not on the curve)` : ''}</span></h4>
    ${journeyChart([{v: J.met, cls: 'met'}, ...(C && !C.err ? [{v: lrnSeries, cls: 'lrn'}] : [])], total, {
      ticks: [
        [Math.round(total / 2), Math.round(total / 2)],
        [total, total]
      ],
      days: dayStarts,
      dots: J.marks.map(([i, g, t]) => [i, J.met[i], `${g}: answer ${i + 1}, ${jTime(t)}`]),
      marks: openN != null ? [[Math.min(R.length - 1, openN), 'Opened all']] : [],
      stars: lrnPts.map(([g, i]) => [i, lrnSeries[i], `${g} learned: answer ${i + 1}, ${jTime(R[i][1])}`]),
      label: 'Genera met over time'
    })}
    <p class="adm-axis"><span>answer 1 · ${jDate(R[0][1])}</span><span>vertical lines: a new day</span><span>answer ${R.length} · ${jDate(R[R.length - 1][1])}</span></p>
    <h4>Cards</h4>${cardsLine}</section>`;

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
      ? `<table class="adm-tbl">${L.map(([g, s]) => `<tr><td><a class="adm-gen" href="#${esc(g)}"><i>${esc(g)}</i></a></td><td class="n">${pct(s.ok, s.n)}</td><td class="n">${jPts(s.score)}</td><td class="n">${s.n}</td></tr>`).join('')}</table>`
      : `<p class="note">Not enough answers yet (${JOURNEY.MIN} per genus).</p>`;
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
              return `<tr><td><i>${esc(a)}</i> → <i>${esc(b)}</i></td><td class="n">${n}×</td></tr>`;
            })
            .join('')}</table>`
        : '<p class="note">None</p>'
    }${
      u.review
        ? `<h3>To review</h3><p>${u.review
            .split(', ')
            .map(g => `<i>${esc(g)}</i>`)
            .join(', ')}</p>`
        : ''
    }${notMet.length ? `<h3>Not met yet <small>${notMet.length}</small></h3><p class="adm-jnot">${notMet.map(g => `<i>${esc(g)}</i>`).join(', ')}</p>` : ''}</section>`;

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
    if (!C || C.err) return '';
    if (!e) return '–';
    if (k === 'start') return `<span title="${esc(jTime(cardT(e)))}">first cards</span>`;
    if (k === 'all') return `<span title="${esc(jTime(cardT(e)))}">opened all</span>`;
    const n = before(e[2], e[0]),
      later = J.G[g].first + 1 - n;
    return `<span title="${esc(jTime(cardT(e)))} · asked ${later === 1 ? 'at the next question' : `${later} questions later`}">#${n} · ${jDate(cardT(e))}</span>`;
  };
  const dots = h => `<span class="adm-jdots">${[...h].map(c => `<i class="${c === '1' ? 'ok' : 'ko'}"></i>`).join('')}</span>`,
    sortBtn = (k, t) => `<button type="button" data-jsort="${k}" aria-pressed="${JSORT === k}">${t}</button>`;
  const table = `<section class="adm-scard adm-jwide"><div class="adm-shead"><h3>Genera <small>${rows.length}</small></h3><span class="adm-qseg adm-sseg" role="group">${sortBtn('met', 'Order met')}${sortBtn('easy', 'Easiest')}${sortBtn('hard', 'Hardest')}${sortBtn('n', 'Most asked')}</span></div>
    <div class="adm-tscroll"><table class="adm-tbl adm-jtbl"><thead><tr><th>Genus</th><th title="When its card showed: after which answer">Card</th><th title="Its first question">First asked</th><th>Answers</th><th>Right</th><th title="Right answers against the chance the game expected">vs expected</th><th>Last 10</th><th>Answered instead</th></tr></thead><tbody>${rows
      .map(([g, s]) => {
        const inst = Object.entries(s.inst)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([x, n]) => `<i>${esc(x)}</i> ${n}×`)
          .join(', ');
        return `<tr><td><a class="adm-gen" href="#${esc(g)}"><i>${esc(g)}</i></a>${g in LRN ? ` <span class="adm-jlearn" title="Learned (mastery exam passed)${lrnAt[g] != null ? ': ' + esc(jTime(R[lrnAt[g]][1])) : ''}">learned</span>` : ''}${J.slate.has(g) ? '' : ' <small>bonus</small>'}</td><td class="n">${cardCell(g, s)}</td><td class="n" title="${esc(jTime(s.t0))}">#${s.first + 1} · ${jDate(s.t0)}</td><td class="n">${s.n}</td><td>${pct(s.ok, s.n)} ${sbar(s.ok, s.n, s.ok / s.n < 0.5 ? 'bad' : '')}</td><td class="n${s.score != null && s.score < -0.1 ? ' warnc' : ''}">${jPts(s.score)}</td><td>${dots(s.h)}</td><td>${inst}</td></tr>`;
      })
      .join('')}</tbody></table></div></section>`;

  // 3b. Games (as on Players, Pierre 2026-11-02: "bring that page's numbers into the journey"), with the photo quiz
  // split: its own 4-choice questions, the "Again: A or B?" rematch after a mix-up (2 choices, logged as the photo
  // quiz), and the mastery exam questions (|x, from 2026-11-02); Look-alike duels are their own tab in Practice.
  const GM = [
      [
        'Photo quiz',
        r =>
          /^quiz(\||$)/.test(r[5]) &&
          !/\|[xd](\||$)/.test(r[5]) &&
          String(r[10] || '')
            .split(' ')
            .filter(Boolean).length !== 2
      ],
      [
        'Again: A or B? (after a mix-up)',
        r =>
          /^quiz(\||$)/.test(r[5]) &&
          !/\|d(\||$)/.test(r[5]) &&
          String(r[10] || '')
            .split(' ')
            .filter(Boolean).length === 2
      ],
      ['Look-alike duel in the quiz', r => /^quiz\|d(\||$)/.test(r[5])],
      ['Mastery exam', r => /\|x$/.test(r[5])],
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
    <p class="note">${J.S.length} session${J.S.length === 1 ? '' : 's'} · median ${medS} answers · first ${jTime(R[0][1])} · last ${jTime(R[R.length - 1][1])}</p></section>`;

  $v.innerHTML =
    head +
    kpis([
      ['Answers', R.length],
      ['Quiz right', pct(sp.q[1], sp.q[0])],
      ['Last 50', pct(sp.q50[1], sp.q50[0])],
      ...(sp.d[0] ? [['Duels', `${sp.d[0]} · ${pct(sp.d[1], sp.d[0])}`]] : []),
      ['Level', lv == null ? '–' : sgn(lv)],
      ['Genera met', `${J.marks.length}/${total}`],
      ...(anonId ? [] : [['Learned', `${u.learned}/${u.total || total}`]]), // not saved for a device that never signed in
      ['Days', dayKeys.length],
      ['Sessions', J.S.length],
      ...(RT.length ? [['Median time', RT[Math.floor(RT.length / 2)].toFixed(1) + ' s']] : []),
      ...(ZM.length ? [['Enlarged', pct(ZM.filter(Boolean).length, ZM.length)]] : [])
    ]) +
    `<div class="adm-sgrid adm-journey">${prog}${eh}${table}${games}${daysSec}</div>`;
  bindJReload();
  $v.querySelectorAll('[data-jsort]').forEach(
    b =>
      (b.onclick = () => {
        JSORT = b.dataset.jsort;
        render();
      })
  );
}

// ↻ on the journey: the answers, the players and this player's saved progress read again.
function bindJReload() {
  const b = $v.querySelector('[data-jload]');
  if (b)
    b.onclick = () => {
      Object.keys(JDATA).forEach(k => delete JDATA[k]);
      USERS = null;
      ANS = null;
      STATS = null;
      render();
    };
}
