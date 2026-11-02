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
  // Drawn at the page's width, so its text stays 11 px on a phone as on a desktop.
  const W = Math.max(300, Math.min(1100, ($v.clientWidth || 900) - 48)),
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
  const dots = (opt.dots || [])
    .map(([i, v, t]) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.2" class="m"><title>${esc(t)}</title></circle>`)
    .join('');
  const xt = [0, Math.floor((n - 1) / 2), n - 1]
    .map((i, k) => `<text x="${x(i)}" y="${H - 6}" text-anchor="${['start', 'middle', 'end'][k]}">${i + 1}</text>`)
    .join('');
  return `<svg class="adm-jl" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.label || '')}">${grid}${days}${series
    .map(s => `<path d="${path(s.v)}" class="${s.cls}"/>`)
    .join('')}${dots}${xt}</svg>`;
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
    <h4>Genera met <span class="adm-jkey">${J.marks.length}/${total}</span></h4>
    ${journeyChart([{v: J.met, cls: 'met'}], total, {
      ticks: [
        [Math.round(total / 2), Math.round(total / 2)],
        [total, total]
      ],
      days: dayStarts,
      dots: J.marks.map(([i, g, t]) => [i, J.met[i], `${g}: answer ${i + 1}, ${jTime(t)}`]),
      label: 'Genera met over time'
    })}
    <p class="adm-axis"><span>answer 1 · ${jDate(R[0][1])}</span><span>vertical lines: a new day</span><span>answer ${R.length} · ${jDate(R[R.length - 1][1])}</span></p></section>`;

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
  const dots = h => `<span class="adm-jdots">${[...h].map(c => `<i class="${c === '1' ? 'ok' : 'ko'}"></i>`).join('')}</span>`,
    sortBtn = (k, t) => `<button type="button" data-jsort="${k}" aria-pressed="${JSORT === k}">${t}</button>`;
  const table = `<section class="adm-scard adm-jwide"><div class="adm-shead"><h3>Genera <small>${rows.length}</small></h3><span class="adm-qseg adm-sseg" role="group">${sortBtn('met', 'Order met')}${sortBtn('easy', 'Easiest')}${sortBtn('hard', 'Hardest')}${sortBtn('n', 'Most asked')}</span></div>
    <div class="adm-tscroll"><table class="adm-tbl adm-jtbl"><thead><tr><th>Genus</th><th>Met</th><th>Answers</th><th>Right</th><th title="Right answers against the chance the game expected">vs expected</th><th>Last 10</th><th>Answered instead</th></tr></thead><tbody>${rows
      .map(([g, s]) => {
        const inst = Object.entries(s.inst)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([x, n]) => `<i>${esc(x)}</i> ${n}×`)
          .join(', ');
        return `<tr><td><a class="adm-gen" href="#${esc(g)}"><i>${esc(g)}</i></a>${J.slate.has(g) ? '' : ' <small>bonus</small>'}</td><td class="n" title="${esc(jTime(s.t0))}">#${s.first + 1} · ${jDate(s.t0)}</td><td class="n">${s.n}</td><td>${pct(s.ok, s.n)} ${sbar(s.ok, s.n, s.ok / s.n < 0.5 ? 'bad' : '')}</td><td class="n${s.score != null && s.score < -0.1 ? ' warnc' : ''}">${jPts(s.score)}</td><td>${dots(s.h)}</td><td>${inst}</td></tr>`;
      })
      .join('')}</tbody></table></div></section>`;

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
    `<div class="adm-sgrid adm-journey">${prog}${eh}${table}${daysSec}</div>`;
  $v.querySelectorAll('[data-jsort]').forEach(
    b =>
      (b.onclick = () => {
        JSORT = b.dataset.jsort;
        render();
      })
  );
}
