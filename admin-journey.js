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
const jDate = t => new Date(t).toLocaleDateString([], {day: 'numeric', month: 'short'}),
  jTime = t => new Date(t).toLocaleString([], {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}),
  jPts = x => (x == null ? '–' : `${x > 0 ? '+' : ''}${Math.round(100 * x)} pts`);

// Everything the page shows, from one player's answers in time order.
function journeyOf(R) {
  const slate = new Set(Object.keys(DATA.gen).filter(n => !DATA.gen[n].x)), // the IMR slate (x = genera off the slate)
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

function renderJourney(name) {
  status();
  const back = `<a class="adm-fchip plain" href="#~users">← Players</a>`;
  if (!USERS || !ANS) {
    $v.innerHTML = `<div class="adm-shead">${back}<h2>${esc(name)}</h2></div><p class="note">Loading…</p>`;
    Promise.all([USERS ? null : loadUsers(), ANS ? null : loadStats()]).then(() => {
      if (cur === '~journey/' + name) render();
    });
    return;
  }
  const u = (USERS.users || []).find(x => x.name === name);
  if (!u || !u.id) {
    $v.innerHTML = `<div class="adm-shead">${back}<h2>${esc(name)}</h2></div><p class="note">${u ? 'No anonymous id for this player yet (sheet script v13).' : 'No player by this name.'}</p>`;
    return;
  }
  const R = (ANS.rows || []).filter(r => r[0] === u.id).sort((a, b) => a[1] - b[1]);
  const head = `<div class="adm-shead">${back}<h2>${esc(name)}</h2>${u.id === MEID ? '<small class="note">you</small>' : ''}</div>`;
  if (!R.length) {
    $v.innerHTML = head + '<p class="note">No answers yet.</p>';
    return;
  }
  const J = journeyOf(R),
    total = J.slate.size,
    lv = RAS[u.id] ? RAS[u.id][0] : null,
    ok = R.reduce((n, r) => n + r[4], 0),
    last50 = R.slice(-50),
    sLen = J.S.map(s => s.length).sort((a, b) => a - b),
    medS = sLen[Math.floor(sLen.length / 2)],
    dayKeys = Object.keys(J.perDay)
      .map(Number)
      .sort((a, b) => a - b);

  // 0. The cards: when each genus was shown, and whether (and how) all were opened at once.
  const C = journeyCards(name),
    offer = C && C.offer,
    openAt = offer && offer.open ? offer.at : null,
    // A card shown after the player's a-th answer: its time, else that answer's (cards saved before times were kept).
    cardT = e => e[2] || (R[Math.min(R.length, Math.max(1, e[0])) - 1] || R[0])[1],
    kindOf = e => (!e ? '' : !e[1] ? 'card' : openAt != null && e[0] === openAt ? 'all' : 'start'),
    CM = (C && C.map) || {},
    byKind = k => Object.keys(CM).filter(g => kindOf(CM[g]) === k && J.slate.has(g));
  const first = byKind('start').sort((a, b) => CM[a][0] - CM[b][0]),
    singles = byKind('card'),
    alls = byKind('all');
  const cardsLine = !C
    ? '<p class="note">Cards: loading…</p>'
    : C.err
      ? `<p class="note">Cards: the player's saved progress could not be read (${esc(C.err)}).</p>`
      : `<ul class="adm-jcards">${
          first.length
            ? `<li><b>First cards</b> ${first.map(g => `<i>${esc(g)}</i>`).join(', ')} · ${jTime(cardT(CM[first[0]]))}</li>`
            : '<li><b>First cards</b> none saved (progress from before the cards, or played on another device not synced yet)</li>'
        }<li><b>Cards one at a time</b> ${singles.length}</li>${
          openAt != null
            ? `<li><b>Opened all genera</b> after answer ${openAt} · ${jTime(offer.t || cardT([openAt]))}${offer.via ? ' · ' + (JVIA[offer.via] || esc(offer.via)) : ''} · ${alls.length} genera at once</li>`
            : offer
              ? `<li><b>Offer to open all</b> declined after answer ${offer.at}${offer.t ? ' · ' + jTime(offer.t) : ''}</li>`
              : '<li><b>Open all genera</b> not used</li>'
        }</ul>`;

  // Learned genera and when: the time kept with the mastery (from 2026-11-02), else the last exam answer on the genus
  // (logged "|x" from 2026-11-02); else learned, time unknown.
  const LRN = (C && C.learned) || {},
    lrnAt = {};
  Object.entries(LRN).forEach(([g, mx]) => {
    let i = -1;
    if (mx > 1e12) i = R.findIndex(r => r[1] >= mx - 5000);
    if (i < 0)
      R.forEach((r, k) => {
        if (r[2] === g && r[4] && /\|x$/.test(String(r[5]))) i = k;
      });
    lrnAt[g] = i >= 0 ? i : null;
  });
  const lrnPts = Object.entries(lrnAt)
      .filter(([g, i]) => i != null && J.slate.has(g))
      .sort((a, b) => a[1] - b[1]),
    lrnUnknown = Object.keys(LRN).filter(g => lrnAt[g] == null && J.slate.has(g)).length,
    lrnSeries = R.map((_, i) => lrnPts.filter(([, k]) => k <= i).length + lrnUnknown);

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
    <h4>Genera met and learned <span class="adm-jkey"><i class="acc"></i>met ${J.marks.length}/${total} <i class="lrn"></i>★ learned ${Object.keys(LRN).filter(g => J.slate.has(g)).length}${lrnUnknown ? ` (${lrnUnknown} before times were kept)` : ''}</span></h4>
    ${journeyChart([{v: J.met, cls: 'met'}, ...(C && !C.err ? [{v: lrnSeries, cls: 'lrn'}] : [])], total, {
      ticks: [
        [Math.round(total / 2), Math.round(total / 2)],
        [total, total]
      ],
      days: dayStarts,
      dots: J.marks.map(([i, g, t]) => [i, J.met[i], `${g}: answer ${i + 1}, ${jTime(t)}`]),
      marks: openAt != null ? [[Math.min(R.length - 1, openAt), 'Opened all']] : [],
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
    const later = J.G[g].first + 1 - e[0];
    return `<span title="${esc(jTime(cardT(e)))} · asked ${later === 1 ? 'at the next question' : `${later} questions later`}">#${e[0]} · ${jDate(cardT(e))}</span>`;
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
          !/\|x$/.test(r[5]) &&
          String(r[10] || '')
            .split(' ')
            .filter(Boolean).length !== 2
      ],
      [
        'Again: A or B? (after a mix-up)',
        r =>
          /^quiz(\||$)/.test(r[5]) &&
          String(r[10] || '')
            .split(' ')
            .filter(Boolean).length === 2
      ],
      ['Mastery exam', r => /\|x$/.test(r[5])],
      ['Look-alike duels', r => /^quiz-duel/.test(r[5])],
      ['Other', r => !/^quiz/.test(r[5])]
    ].map(([t, f]) => {
      const L = R.filter(f);
      return [t, L.length, L.reduce((n, r) => n + r[4], 0)];
    }),
    games = `<section class="adm-scard"><h3>Games</h3><table class="adm-tbl">${GM.filter(([t, n]) => n || t === 'Look-alike duels')
      .map(
        ([t, n, r]) => `<tr><td>${t}</td><td class="n">${pct(r, n)}</td><td>${n ? sbar(r, n) : ''}</td><td class="n">${n || '0'}</td></tr>`
      )
      .join('')}</table></section>`;

  // 4. Days played: answers per day, right share in the title.
  const D = dayKeys.slice(-JOURNEY.DAYS),
    mx = Math.max(1, ...D.map(k => J.perDay[k].n));
  const daysSec = `<section class="adm-scard"><h3>Days played <small>${dayKeys.length}</small></h3>
    <div class="adm-cols adm-hcols">${D.map(k => `<div title="${jDate(k)}: ${J.perDay[k].n} answers, ${pct(J.perDay[k].ok, J.perDay[k].n)} right"><i style="height:${((100 * J.perDay[k].n) / mx).toFixed(1)}%"></i></div>`).join('')}</div>
    <p class="adm-axis"><span>${jDate(D[0])}</span><span>max ${mx}</span><span>${jDate(D[D.length - 1])}</span></p>
    <p class="note">${J.S.length} session${J.S.length === 1 ? '' : 's'} · median ${medS} answers · first ${jTime(R[0][1])} · last ${jTime(R[R.length - 1][1])}</p></section>`;

  $v.innerHTML =
    head +
    kpis([
      ['Answers', R.length],
      ['Right', pct(ok, R.length)],
      [
        'Last 50',
        pct(
          last50.reduce((n, r) => n + r[4], 0),
          last50.length
        )
      ],
      ['Level', lv == null ? '–' : sgn(lv)],
      ['Genera met', `${J.marks.length}/${total}`],
      ['Learned', `${u.learned}/${u.total || total}`],
      ['Days', dayKeys.length],
      ['Sessions', J.S.length]
    ]) +
    `<div class="adm-sgrid adm-journey">${prog}${eh}${table}${games}${daysSec}</div>`;
  $v.querySelectorAll('[data-jsort]').forEach(
    b =>
      (b.onclick = () => {
        JSORT = b.dataset.jsort;
        render();
      })
  );
}
