/* ---------- Analyses (Pierre, 2026-11-04): multifactor analyses of the answer log, every 1000 answers ---------- */
// "I love this kind of multifactor report… every 1000 new answers… a new section in the admin with several sub-pages,
// with visualisations, reports, graphs, tables." The report is computed once, by a GitHub Action (tools/analyses.js,
// analysis.js), and stored in the sync sheet (v35, analysesGet); this page only draws it, so it opens at once on a
// phone. "Recompute here" (secondary, on any device: Pierre, 2026-11-05, "my phone is powerful") runs the same module in
// a Web Worker on this page's own answer log, in this tab; its result stays in this tab. Loaded after admin.js, whose helpers it uses ($v, esc, store, TOKEN, SYNC_URL, loadStats,
// loadUsers, allPhotos, zoom, img, kpis). Views: GROUPS in admin.js; docs/ARCHITECTURE.md "Analyses"; the methods in
// docs/LEARNING.md "Multifactor analyses"; the chart helpers in docs/DESIGN.md "Admin charts".
const AN_V = 35; // sync script version with analysesGet (rule D4: before it, the page just has no stored report)
let ANREP = null, // {st: 'ok' | 'none' | 'old' | 'err', rep, answers, stored}
  ANLOC = null, // a report recomputed in this tab: {rep} once done, {prog} while running
  ANWORK = null;
const AN = Object.assign({m: 'all', src: 'sheet'}, store.get('reefid-admin-an', {}));
const anSave = () => store.set('reefid-admin-an', {m: AN.m});
// Views: [address, analysis key in the report, title]
const AN_VIEWS = [
  ['analyses/overview', null, 'Overview'],
  ['analyses/speed/answer-time', 'rt', 'Answer time'],
  ['analyses/speed/enlarging', 'zoom', 'Enlarging photos'],
  ['analyses/difficulty/photos', 'photo', 'What makes a photo hard'],
  ['analyses/difficulty/formats', 'fmt', 'Question formats'],
  ['analyses/difficulty/mix-ups', 'conf', 'Genera mixed up'],
  ['analyses/learning/practice', 'learn', 'Learning with practice'],
  ['analyses/learning/after-a-break', 'back', 'After a break'],
  ['analyses/learning/sessions', 'sess', 'Sessions'],
  ['analyses/learning/profiles', 'who', 'Player profiles']
];
const anKey = h => (AN_VIEWS.find(v => v[0] === h) || [])[1];
const anTitle = k => (AN_VIEWS.find(v => v[1] === k) || [])[2] || k;

function anLoad() {
  if (!TOKEN) return Promise.resolve((ANREP = {st: 'err', err: 'Needs the GitHub token'}));
  return fetch(SYNC_URL, {method: 'POST', body: JSON.stringify({analysesGet: 1, token: TOKEN})})
    .then(r => r.json())
    .then(j => {
      // A script before v35 answers 'input' to an unknown POST: no stored report, nothing else changes (rule D4).
      if (!j || (!j.ok && j.error === 'input') || (j.v && j.v < AN_V)) return (ANREP = {st: 'old', v: j && j.v});
      if (!j.ok) return (ANREP = {st: 'err', err: j.error === 'token' ? 'Token refused' : 'Not available'});
      let rep = null;
      try {
        rep = j.report ? JSON.parse(j.report) : null;
      } catch (e) {
        rep = null;
      }
      // a report stored before 2026-11-05 also kept all its answers as one more point ("All 1933"): round milestones only
      if (rep && rep.M.some(M => M % ANALYSIS.STEP === 0)) rep.M = rep.M.filter(M => M % ANALYSIS.STEP === 0);
      return (ANREP = {st: rep ? 'ok' : 'none', rep, answers: j.answers, stored: j.stored});
    })
    .catch(() => (ANREP = {st: 'err', err: 'Offline'}));
}
// A report with no point at all (Recompute here on an empty log: no milestone before 1000, no live point at 0) is no
// report: the page says "No report yet" (Codex review #591).
const anRep = () => {
  const rep = AN.src === 'local' && ANLOC && ANLOC.rep ? ANLOC.rep : ANREP && ANREP.rep;
  return rep && rep.M && rep.M.length ? rep : null;
};
// The milestones: round thousands only (Pierre, 2026-11-05: 1000, 2000, 3000, …; never shifted by the count of the first
// report), without Recompute here's look at all the answers. The milestone shown: 'all' = the newest; 'now' = all the answers, a point only Recompute here adds
// (analysis.js report live), never stored; else a milestone of the report.
const anRound = rep => rep.M.filter(M => M % ANALYSIS.STEP === 0);
const anM = rep => {
  const L = anRound(rep);
  if (AN.m === 'now' && rep.live) return rep.live;
  if (L.includes(Number(AN.m))) return Number(AN.m);
  return L.length ? L[L.length - 1] : rep.live || rep.M[rep.M.length - 1];
};
// A milestone's value in the switch and the links (data-anm).
const anMv = (rep, M) => (M === rep.live ? 'now' : M === anRound(rep).slice(-1)[0] ? 'all' : String(M));

/* ---------- Formatting ---------- */
const anNum = (v, d = 2) => (v == null || !isFinite(v) ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d));
const anInt = v => (v == null || !isFinite(v) ? '–' : Math.round(v).toLocaleString('en-US'));
/* ---------- The plain reading (analysis.js plainOf; Pierre, 2026-11-04: "a non-statistician must understand it at a
// glance"): each effect says what is compared, which way it goes and how much, as a chance of a right answer (or
// seconds, or a chance to stop) for a typical player and photo, with its likely range; one colour per reading. ---------- */
const AN_TONE = {
  good: ['▲', 'Helps'],
  bad: ['▼', 'Hurts'],
  info: ['●', 'Clear'],
  none: ['–', 'No clear effect'],
  thin: ['…', 'Not enough data yet']
};
// The outcome each chart is drawn on, in words.
const AN_OUT = {
  right: 'Chance of a right answer',
  time: 'Seconds to answer',
  stop: 'Chance to end the session after the answer',
  mix: 'Chance to pick a given wrong genus when it is offered',
  pts: 'Right answers against the app’s expectation',
  beyond: 'Chance of recognising it, beyond guessing',
  guess: 'Success of a pure guess'
};
const anSpec = (key, e) => (ANALYSIS.PLAIN[key] || {})[e.k] || {o: 'right'};
// The format row of a Formats effect (its own expected chance and guess rate are the typical values).
const anRowOf = (a, key, e) => (key === 'fmt' ? (a.table || []).find(r => e.k.replace(/^(g|d|oe)_/, '') === r.k) : null);
const anPlain = (key, e, a) => ANALYSIS.plainOf(key, e, a, {row: anRowOf(a, key, e)});
const anPc = v =>
  v == null || !isFinite(v) ? '–' : v > 0 && v < 0.095 ? (Math.round(v * 1000) / 10).toFixed(1) + '%' : Math.round(v * 100) + '%';
const anSec = v => (v == null || !isFinite(v) ? '–' : (v < 10 ? v.toFixed(1) : Math.round(v)) + ' s');
const anPts = v => (v == null || !isFinite(v) ? '–' : Math.round(v * 100) === 0 ? '0 pts' : anNum(v * 100, 0) + ' pts');
const anTf = P => (P.scale === 's' ? anSec : P.scale === 'pts' ? anPts : anPc);
// The verdict pill: helps / hurts / clear (neither good nor bad: time, the app's own calibration) / no clear effect /
// not enough data yet, after the multiple-testing correction (analysis.js correct). Its tooltip, a bare label (rule A2;
// the method is in the help): the family and the adjusted p, never on the page itself (rule A2), and the answers that
// would settle it. Tags: primary (the question its analysis exists to answer), and exploratory when it reads clear.
const anP = v => (v == null ? '–' : v < 0.001 ? '< 0.001' : v < 0.01 ? v.toFixed(3) : v.toFixed(2));
function anPill(P, e) {
  const t = AN_TONE[P.tone] || AN_TONE.thin,
    label = e.v === 'none' || e.v === 'nolog' ? P.verdict : t[1],
    tip = [
      e.fam ? `${e.fam === 1 ? 'Primary, Holm' : 'Exploratory, BH 5%'}: adjusted p ${anP(e.pa)} (p ${anP(e.p)})` : '',
      e.v === 'thin' && e.need ? `About ${anInt(e.need)} answers would settle it` : ''
    ].filter(Boolean),
    tag =
      e.fam === 1
        ? ' <span class="adm-src">primary</span>'
        : e.fam === 2 && e.v === 'clear'
          ? ' <span class="adm-src">exploratory</span>'
          : '';
  return `<span class="adm-an-v t-${P.tone}"${tip.length ? ` title="${esc(tip.join(' · '))}"` : ''}>${t[0]} ${esc(label)}</span>${tag}`;
}
// What it does, in words, with its likely range and what it suggests when it is clear.
const anSays = P =>
  `${esc(P.text)}${P.tone !== 'thin' && P.tone !== 'none' && P.range ? `<small class="adm-an-ci">Likely ${esc(P.range)}</small>` : ''}${P.advice ? `<small class="adm-an-adv">→ ${esc(P.advice)}</small>` : ''}`;

/* ---------- Charts: inline SVG at the real pixel width, tokens only (admin.css .adm-an-*) ---------- */
const anW = () => Math.max(280, Math.min(($v.clientWidth || 600) - 26, 1220));
const svg = (w, h, title, body) =>
  `<svg class="adm-an-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${body}</svg>`;
const fit = (s, px) => (s.length * 6.4 > px ? s.slice(0, Math.max(3, Math.floor(px / 6.4) - 1)) + '…' : s);
function ticks(a, b, n = 4) {
  const span = b - a || 1,
    step0 = span / n,
    mag = 10 ** Math.floor(Math.log10(step0)),
    step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0) || step0,
    out = [];
  for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(Math.round(v / step) * step);
  return out;
}
// Forest plot: one row per effect, its 95% interval and estimate; a dashed line at the null value; an outlined diamond
// at a reference (the value the app uses). rows: [{label, est, lo, hi, ref, title}]; tf: value -> axis text.
function forest(rows, o = {}) {
  rows = rows.filter(r => isFinite(r.est));
  if (!rows.length) return '';
  const w = o.w || anW(),
    lw = Math.min(190, Math.round(w * 0.4)),
    x0 = lw + 10,
    x1 = w - 12,
    rh = 24,
    h = rows.length * rh + 30,
    vals = rows.flatMap(r => [r.est, r.lo, r.hi, r.ref]).filter(v => v != null && isFinite(v)),
    nul = o.nul == null ? 0 : o.nul;
  let a = Math.min(nul, ...vals),
    b = Math.max(nul, ...vals);
  const pad = (b - a) * 0.06 || 0.1;
  ((a -= pad), (b += pad));
  const X = v => x0 + ((Math.max(a, Math.min(b, v)) - a) / (b - a)) * (x1 - x0),
    tf = o.tf || (v => anNum(v, 1));
  let s = `<line class="an-zero" x1="${X(nul)}" x2="${X(nul)}" y1="4" y2="${h - 24}"/>`;
  // o.fwd: the axis's values as read (log time -> its % change), so the ticks fall on round numbers of what is read
  (o.fwd ? ticks(o.fwd(a), o.fwd(b)).map(d => [Math.log(1 + d), d]) : ticks(a, b).map(t => [t, t])).forEach(
    ([t, d]) =>
      (s += `<line class="an-grid" x1="${X(t)}" x2="${X(t)}" y1="${h - 24}" y2="${h - 20}"/><text class="an-tick" x="${X(t)}" y="${h - 6}" text-anchor="middle">${esc(o.fwd ? o.df(d) : tf(t))}</text>`)
  );
  rows.forEach((r, i) => {
    const y = i * rh + 14;
    s += `<g><title>${esc(r.title || `${r.label}: ${tf(r.est)}`)}</title><rect class="an-hit" x="0" y="${y - rh / 2}" width="${w}" height="${rh}"/><text class="an-lab" x="${lw}" y="${y + 4}" text-anchor="end">${esc(fit(r.label, lw))}</text>`;
    if (isFinite(r.lo) && isFinite(r.hi)) s += `<line class="an-ci" x1="${X(r.lo)}" x2="${X(r.hi)}" y1="${y}" y2="${y}"/>`;
    if (r.ref != null) s += `<path class="an-ref" d="M${X(r.ref)} ${y - 6}l6 6-6 6-6-6z"/>`;
    s += `<circle class="an-dot${r.dim ? ' dim' : ''}${r.tone ? ' t-' + r.tone : ''}" cx="${X(r.est)}" cy="${y}" r="5"/></g>`;
  });
  return svg(w, h, o.title || 'Estimates with their likely range', s);
}
// Dot and range, one row per effect, its name above its line (whole on a phone): the dot = the estimate, the line = its
// likely range (95%), the dashed line = the typical value it is compared with, a diamond = a row's own reference.
// rows: [{label, est, lo, hi, ref, tone, title}]; o: {tf, nul, lab (the dashed line's name), title, a, b (axis ends)}.
function dotRange(rows, o = {}) {
  rows = rows.filter(r => r.est != null && isFinite(r.est));
  if (!rows.length) return '';
  const w = o.w || anW(),
    x0 = 10,
    x1 = w - 14,
    top = 6,
    per = Math.max(12, Math.floor((x1 - x0) / 6.6)),
    wrap = t => {
      const L = [''];
      String(t)
        .split(' ')
        .forEach(wd =>
          L[L.length - 1].length + wd.length + 1 > per && L[L.length - 1]
            ? L.push(wd)
            : (L[L.length - 1] += (L[L.length - 1] ? ' ' : '') + wd)
        );
      return L;
    },
    labs = rows.map(r => wrap(r.label)),
    hs = labs.map(L => 26 + 14 * L.length),
    y0s = hs.map((v, i) => top + hs.slice(0, i).reduce((x, z) => x + z, 0)),
    h = top + hs.reduce((x, z) => x + z, 0) + 30,
    vals = rows
      .flatMap(r => [r.est, r.lo, r.hi, r.ref])
      .concat(o.nul == null ? [] : [o.nul])
      .filter(v => v != null && isFinite(v));
  let a = o.a ?? Math.min(...vals),
    b = o.b ?? Math.max(...vals);
  const pad = (b - a) * 0.08 || 0.05;
  ((a = o.a ?? a - pad), (b = o.b ?? b + pad));
  if (o.clamp) ((a = Math.max(o.clamp[0], a)), (b = Math.min(o.clamp[1], b)));
  const X = v => x0 + ((Math.max(a, Math.min(b, v)) - a) / (b - a || 1)) * (x1 - x0),
    tf = o.tf || (v => anNum(v, 1)),
    yb = h - 26;
  let s = '';
  ticks(a, b).forEach(
    t =>
      (s += `<line class="an-grid" x1="${X(t)}" x2="${X(t)}" y1="${top}" y2="${yb}"/><text class="an-tick" x="${X(t)}" y="${yb + 16}" text-anchor="middle">${esc(tf(t))}</text>`)
  );
  if (o.nul != null)
    s += `<line class="an-zero" x1="${X(o.nul)}" x2="${X(o.nul)}" y1="${top}" y2="${yb}"/><text class="an-tick an-nul" x="${Math.min(X(o.nul) + 4, x1 - 60)}" y="${h - 1}">${esc(o.lab || 'typical')}: ${esc(tf(o.nul))}</text>`;
  rows.forEach((r, i) => {
    const L = labs[i],
      y = y0s[i] + 14 * L.length;
    s += `<g><title>${esc(r.title || r.label)}</title><rect class="an-hit" x="0" y="${y0s[i]}" width="${w}" height="${hs[i]}"/><text class="an-lab" x="${x0}" y="${y0s[i] + 12}">${L.map((t, j) => `<tspan x="${x0}" dy="${j ? 14 : 0}">${esc(t)}</tspan>`).join('')}</text>`;
    if (isFinite(r.lo) && isFinite(r.hi))
      s += `<line class="an-ci${r.tone ? ' t-' + r.tone : ''}" x1="${X(r.lo)}" x2="${X(r.hi)}" y1="${y + 14}" y2="${y + 14}"/>`;
    if (r.ref != null) s += `<path class="an-ref" d="M${X(r.ref)} ${y + 8}l6 6-6 6-6-6z"/>`;
    s += `<circle class="an-dot${r.tone ? ' t-' + r.tone : ''}" cx="${X(r.est)}" cy="${y + 14}" r="5"/></g>`;
  });
  return svg(w, h, o.title || 'Effects and their likely range', s);
}
// Lines on a 0-1 (or given) y scale: series [{label, pts: [[x, y]], dash, step, dots}], one axis only.
function lines(series, o = {}) {
  const w = o.w || anW(),
    h = o.h || 200,
    l = 44,
    r = 12,
    t = 10,
    bt = 34,
    xs = series.flatMap(S => S.pts.map(p => p[0])),
    xa = o.xmin ?? Math.min(...xs),
    xb = o.xmax ?? Math.max(...xs),
    ya = o.ymin ?? 0,
    yb = o.ymax ?? 1,
    tx = o.xlog ? v => Math.log(1 + v) : v => v,
    X = v => l + ((tx(v) - tx(xa)) / (tx(xb) - tx(xa) || 1)) * (w - l - r),
    Y = v => t + (1 - (v - ya) / (yb - ya || 1)) * (h - t - bt);
  let s = '';
  ticks(ya, yb, 4).forEach(
    v =>
      (s += `<line class="an-grid" x1="${l}" x2="${w - r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="an-tick" x="${l - 6}" y="${Y(v) + 4}" text-anchor="end">${esc((o.yf || (v => Math.round(v * 100) + '%'))(v))}</text>`)
  );
  (o.xticks || ticks(xa, xb, 5)).forEach(
    v => (s += `<text class="an-tick" x="${X(v)}" y="${h - bt + 16}" text-anchor="middle">${esc((o.xf || anInt)(v))}</text>`)
  );
  if (o.xlab) s += `<text class="an-tick" x="${(l + w - r) / 2}" y="${h - 4}" text-anchor="middle">${esc(o.xlab)}</text>`;
  series.forEach((S, k) => {
    if (!S.pts.length) return;
    if (S.band)
      s += `<path class="an-band" d="M${S.band.map(([x, lo]) => `${X(x)} ${Y(lo)}`).join('L')}L${S.band
        .map(([x, , hi]) => `${X(x)} ${Y(hi)}`)
        .reverse()
        .join('L')}Z"/>`;
    const P = S.step
      ? S.pts.flatMap(([x, y], i) =>
          i
            ? [
                [x, S.pts[i - 1][1]],
                [x, y]
              ]
            : [[x, y]]
        )
      : S.pts;
    s += `<path class="an-line${k ? ' alt' : ''}${S.dash ? ' dash' : ''}" d="M${P.map(([x, y]) => `${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join('L')}"/>`;
    if (S.dots)
      S.pts.forEach(
        ([x, y, n]) =>
          (s += `<circle class="an-dot${k ? ' alt' : ''}" cx="${X(x)}" cy="${Y(y)}" r="4"><title>${esc(`${S.label}: ${(o.yf || (v => Math.round(v * 100) + '%'))(y)}${n ? ` (${n})` : ''}`)}</title></circle>`)
      );
  });
  const leg =
    series.length > 1
      ? `<p class="adm-an-leg">${series.map((S, k) => `<span class="k${k}${S.dash ? ' dash' : ''}">${esc(S.label)}</span>`).join('')}</p>`
      : '';
  return svg(w, h, o.title || series.map(S => S.label).join(', '), s) + leg;
}
// Shares of a whole as one stacked bar (variance components), the parts in a table under it.
function sharesBar(parts, o = {}) {
  const w = o.w || anW(),
    h = 22;
  let x = 0,
    s = '';
  parts.forEach((p, i) => {
    const pw = Math.max(0, p.share * w - (i < parts.length - 1 ? 2 : 0));
    s += `<rect class="an-share s${i}" x="${x}" y="0" width="${pw}" height="${h}" rx="4"><title>${esc(`${p.k}: ${Math.round(p.share * 100)}%`)}</title></rect>`;
    x += p.share * w;
  });
  return svg(w, h, o.title || 'Shares', s);
}

// Bars (counts by hour of the day): one bar a value, a label under every 3rd.
function bars(vals, o = {}) {
  const w = o.w || anW(),
    h = o.h || 140,
    l = 28,
    r = 8,
    t = 8,
    bt = 30,
    mx = Math.max(1, ...vals),
    bw = (w - l - r) / vals.length,
    Y = v => t + (1 - v / mx) * (h - t - bt);
  let s = '';
  ticks(0, mx, 3)
    .filter(v => Number.isInteger(v))
    .forEach(
      v =>
        (s += `<line class="an-grid" x1="${l}" x2="${w - r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="an-tick" x="${l - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`)
    );
  vals.forEach((v, i) => {
    const x = l + i * bw;
    if (v)
      s += `<rect class="an-bar" x="${x + 1}" y="${Y(v)}" width="${Math.max(1, bw - 2)}" height="${Y(0) - Y(v)}"><title>${esc((o.lf || String)(i))}: ${v}</title></rect>`;
    if (i % (o.every || 3) === 0)
      s += `<text class="an-tick" x="${x + bw / 2}" y="${h - bt + 14}" text-anchor="middle">${esc((o.lf || String)(i))}</text>`;
  });
  if (o.xlab) s += `<text class="an-tick" x="${(l + w - r) / 2}" y="${h - 2}" text-anchor="middle">${esc(o.xlab)}</text>`;
  return svg(w, h, o.title || 'Counts', s);
}

// Heatmap (the multifactor visualisation study of 2026-11-05): a grid of cells, each with a strength class (tokens only,
// admin.css .an-h*), a hover title, and its value written in it when the cell is wide enough (o.tmin px). Row labels on
// the left; column labels above, upright when they would not fit across, or numbered (o.num), or none when the cells are
// too narrow (the columns then follow the rows' order); o.mark(i, j): an extra class for a cell (an outline); o.blocks:
// [[first, last]] outlined on the diagonal; o.top and o.tree(x0, cell, height): room above the column labels and the
// dendrogram drawn in it; o.ax: [rows' name, columns' name], written in the corner. o: {n, nc, rl, rcls, cl, cell(i, j)
// -> null | {c, t, title, inv}, w, lw, cs (largest cell), title}; o.lt and o.ltree(top, cell, width): room left of the row
// labels and the dendrogram drawn in it; o.rc(i): a row's extra class (a greyed row), o.href(i): its label's link.
function heat(o) {
  const n = o.n,
    nc = o.nc ?? n,
    w = o.w || anW(),
    L0 = o.lt || 0,
    lw = o.lw ?? Math.min(150, Math.round(w * 0.32)),
    cs = Math.max(6, Math.min(o.cs || 28, Math.floor((w - L0 - lw - 4) / nc))),
    up = o.cl && !o.num && cs >= 12,
    ch = up ? Math.min(112, 10 + 6.4 * Math.max(...o.cl.map(s => String(s).length))) : o.cl && o.num ? 18 : o.ax ? 16 : 0,
    tt = o.top || 0,
    top = tt + ch,
    h = top + n * cs + 2,
    X = j => L0 + lw + j * cs,
    Y = i => top + i * cs;
  let s = (o.tree ? o.tree(X(0), cs, tt) : '') + (o.ltree ? o.ltree(top, cs, L0) : '');
  if (o.ax)
    s += `<text class="an-tick" x="${L0 + lw - 6}" y="${top - 4}" text-anchor="end">${esc(o.ax[0])} ↓</text>${up || o.num ? '' : `<text class="an-tick" x="${L0 + lw}" y="${top - 4}">${esc(o.ax[1])} →</text>`}`;
  for (let i = 0; i < n; i++) {
    const t = `<text class="an-lab${o.rcls ? ' ' + o.rcls : ''}${o.rc ? ' ' + o.rc(i) : ''}" x="${L0 + lw - 6}" y="${Y(i) + cs / 2 + 4}" text-anchor="end"><title>${esc(o.rl[i])}</title>${esc(fit(String(o.rl[i]), lw - 10))}</text>`,
      href = o.href && o.href(i);
    s += href ? `<a href="${esc(href)}">${t}</a>` : t;
  }
  if (o.cl && (up || o.num))
    for (let j = 0; j < nc; j++) {
      const x = X(j) + cs / 2;
      s += up
        ? `<text class="an-tick an-hcol${o.rcls ? ' ' + o.rcls : ''}" x="${x + 4}" y="${top - 4}" transform="rotate(-90 ${x + 4} ${top - 4})">${esc(o.cl[j])}</text>`
        : `<text class="an-tick" x="${x}" y="${top - 5}" text-anchor="middle">${esc(o.cl[j])}</text>`;
    }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < nc; j++) {
      const c = o.cell(i, j);
      if (!c) continue;
      const mk = o.mark ? o.mark(i, j) : '';
      s += `<g><title>${esc(c.title || '')}</title><rect class="an-h ${c.c}${mk ? ' ' + mk : ''}" x="${X(j) + 0.5}" y="${Y(i) + 0.5}" width="${cs - 1}" height="${cs - 1}" rx="2"/>${
        c.t && cs >= (o.tmin || 34)
          ? `<text class="an-ht${c.inv ? ' inv' : ''}" x="${X(j) + cs / 2}" y="${Y(i) + cs / 2 + 4}" text-anchor="middle">${esc(c.t)}</text>`
          : ''
      }</g>`;
    }
  (o.blocks || []).forEach(
    ([a, b]) =>
      (s += `<rect class="an-blk" x="${X(a) - 1}" y="${Y(a) - 1}" width="${(b - a + 1) * cs + 2}" height="${(b - a + 1) * cs + 2}" rx="3"/>`)
  );
  return svg(L0 + lw + nc * cs + 2, h, o.title || 'Heatmap', s);
}
// A dendrogram as one path: merges [a, b, height] (leaves 0..n-1 in display order, the k-th merge = n + k); leaf(i): the
// leaf's position along the leaves, hp(height): the position along the height axis. side 'top': leaves along x, the tree
// above them; 'left': leaves along y, the tree to their left. Merges at cap or above are not drawn (the mix-up map: genera
// joined with nothing in common, distance 1).
function dendroPath(m, n, leaf, hp, side, cap = Infinity) {
  const P = [];
  for (let i = 0; i < n; i++) P[i] = [leaf(i), hp(0)];
  let d = '';
  m.forEach(([a, b, h], k) => {
    const A = P[a],
      B = P[b],
      H = hp(h);
    P[n + k] = [(A[0] + B[0]) / 2, H];
    if (h < cap) d += side === 'top' ? `M${A[0]} ${A[1]}V${H}H${B[0]}V${B[1]}` : `M${A[1]} ${A[0]}H${H}V${B[0]}H${B[1]}`;
  });
  return `<path class="an-tree" d="${d}"/>`;
}

// A biplot (Gabriel 1971): points (players) and arrows (behaviours) on the first two axes of a PCA, one square scale, the
// arrows scaled to the points' spread (their direction and relative length are what is read). Labels beside their point,
// skipped where they would overlap another (each point keeps its hover title, and the table beside the chart has every
// number). o: {pts: [{x, y, label, lab, title}], arrows: [{x, y, label}], var: [share 1, share 2], w, title}.
function biplot(o) {
  const S = Math.min(o.w || anW(), 560),
    m = 40,
    P = o.pts,
    am = Math.max(1e-9, ...o.arrows.map(a => Math.hypot(a.x, a.y))),
    pm = Math.max(1e-9, ...P.map(p => Math.hypot(p.x, p.y))),
    k = (0.9 * pm) / am,
    R =
      Math.max(1e-9, ...P.flatMap(p => [Math.abs(p.x), Math.abs(p.y)]), ...o.arrows.flatMap(a => [Math.abs(a.x * k), Math.abs(a.y * k)])) *
      1.08,
    X = v => m + ((v + R) / (2 * R)) * (S - 2 * m),
    Y = v => S - m - ((v + R) / (2 * R)) * (S - 2 * m),
    boxes = [],
    free = (x, y, w) => {
      const b = [x - 2, y - 12, x + w + 2, y + 3];
      if (b[0] < 0 || b[2] > S || b[1] < 0 || b[3] > S || boxes.some(c => b[0] < c[2] && b[2] > c[0] && b[1] < c[3] && b[3] > c[1]))
        return false;
      boxes.push(b);
      return true;
    };
  let s = `<line class="an-zero" x1="${X(-R)}" x2="${X(R)}" y1="${Y(0)}" y2="${Y(0)}"/><line class="an-zero" x1="${X(0)}" x2="${X(0)}" y1="${Y(-R)}" y2="${Y(R)}"/>`;
  // the axes' names and every dot hold their place first, so no label is written over them
  const a1 = `Axis 1 · ${pc(o.var[0])}`,
    a2 = `Axis 2 · ${pc(o.var[1])}`;
  boxes.push([S - 4 - a1.length * 6.4, Y(0) - 18, S, Y(0) - 3], [X(0) + 4, 0, X(0) + 8 + a2.length * 6.4, 15]);
  P.forEach(p => boxes.push([X(p.x) - 6, Y(p.y) - 6, X(p.x) + 6, Y(p.y) + 6]));
  s += `<text class="an-tick" x="${S - 4}" y="${Y(0) - 6}" text-anchor="end">${a1}</text><text class="an-tick" x="${X(0) + 6}" y="12">${a2}</text>`;
  o.arrows.forEach(a => {
    const x = X(a.x * k),
      y = Y(a.y * k);
    s += `<g><title>${esc(a.title || a.label)}</title><line class="an-arrow" x1="${X(0)}" y1="${Y(0)}" x2="${x}" y2="${y}"/><circle class="an-arrowh" cx="${x}" cy="${y}" r="2.5"/></g>`;
  });
  P.forEach(p => (s += `<circle class="an-dot" cx="${X(p.x)}" cy="${Y(p.y)}" r="5"><title>${esc(p.title || p.label)}</title></circle>`));
  // labels: the arrows' first, at their tips, then the points' (right of the dot, else left)
  o.arrows.forEach(a => {
    const x = X(a.x * k),
      y = Y(a.y * k),
      t = String(a.label),
      w = t.length * 6.4,
      lx = a.x >= 0 ? x + 4 : x - 4 - w;
    if (free(lx, y + 4, w)) s += `<text class="an-tick an-alab" x="${lx}" y="${y + 4}">${esc(t)}</text>`;
  });
  P.filter(p => p.lab).forEach(p => {
    const x = X(p.x),
      y = Y(p.y),
      t = fit(String(p.label), 120),
      w = t.length * 6.4;
    // right of the dot, else left, above, below
    const at = [
      [x + 8, y + 4, 'start'],
      [x - 8 - w, y + 4, 'end'],
      [x - w / 2, y - 9, 'middle'],
      [x - w / 2, y + 18, 'middle']
    ].find(([lx, ly]) => free(lx, ly, w));
    if (at)
      s += `<text class="an-lab" x="${at[2] === 'end' ? x - 8 : at[2] === 'middle' ? x : at[0]}" y="${at[1]}"${at[2] === 'start' ? '' : ` text-anchor="${at[2]}"`}>${esc(t)}</text>`;
  });
  return svg(S, S, o.title || 'Map', s);
}

// A Wright map (Wright & Stone 1979): one vertical scale, players on the left (dots and names), items on the right
// (names with a leader line to their place), each side's labels pushed apart to stay readable (at least 14 px), a
// dashed line at the typical player. Higher = more able (a player) or harder (an item). Vertical, so it reads on a phone.
// o: {L: [{v, label, title}], R: [{v, label, star, title}], w, lab: [left side's name, right side's name], title}.
function wright(o) {
  const w = o.w || anW(),
    L = o.L.filter(x => isFinite(x.v)),
    R = o.R.filter(x => isFinite(x.v)),
    n = Math.max(L.length, R.length),
    top = 28,
    H = Math.max(300, n * 15 + 20),
    h = top + H + 24,
    vs = [...L, ...R].map(x => x.v),
    a = Math.min(...vs),
    b = Math.max(...vs),
    pad = (b - a) * 0.04 || 0.5,
    Y = v => top + (1 - (v - a + pad) / (b - a + 2 * pad)) * H,
    ax = Math.round(w * 0.42),
    spread = (P, gap) => {
      // push labels apart downwards, then back up from the bottom, so none leave the chart
      const S = P.map((x, i) => ({i, y: Y(x.v)})).sort((p, q) => p.y - q.y);
      S.forEach((p, k) => k && (p.y = Math.max(p.y, S[k - 1].y + gap)));
      for (let k = S.length - 1; k >= 0; k--) p0(S, k, top + H, gap);
      const out = [];
      S.forEach(p => (out[p.i] = p.y));
      return out;
    },
    p0 = (S, k, lim, gap) => (S[k].y = Math.min(S[k].y, k === S.length - 1 ? lim : S[k + 1].y - gap));
  const yl = spread(L, 14),
    yr = spread(R, 14),
    med = q0(L.map(x => x.v));
  let s = `<line class="an-grid" x1="${ax}" x2="${ax}" y1="${top}" y2="${top + H}"/>`;
  s += `<text class="an-tick" x="${ax - 8}" y="14" text-anchor="end">${esc(o.lab[0])}</text><text class="an-tick" x="${ax + 8}" y="14">${esc(o.lab[1])}</text>`;
  if (isFinite(med)) s += `<line class="an-zero" x1="10" x2="${w - 10}" y1="${Y(med)}" y2="${Y(med)}"/>`;
  L.forEach((x, i) => {
    const y = Y(x.v);
    s += `<g><title>${esc(x.title || x.label)}</title><circle class="an-dot" cx="${ax - 10}" cy="${y}" r="4.5"/><path class="an-lead" d="M${ax - 16} ${y}L${ax - 26} ${yl[i]}"/><text class="an-lab" x="${ax - 30}" y="${yl[i] + 4}" text-anchor="end">${esc(fit(String(x.label), ax - 40))}</text></g>`;
  });
  R.forEach((x, i) => {
    const y = Y(x.v);
    s += `<g><title>${esc(x.title || x.label)}</title><path class="an-lead" d="M${ax} ${y}H${ax + 8}L${ax + 20} ${yr[i]}"/><text class="an-lab an-it" x="${ax + 24}" y="${yr[i] + 4}">${esc(fit(String(x.label) + (x.star ? ' ★' : ''), w - ax - 30))}</text></g>`;
  });
  return svg(w, h, o.title || 'One scale', s);
}
const q0 = L => {
  const S = L.filter(v => isFinite(v)).sort((x, y) => x - y);
  return S.length ? (S.length % 2 ? S[(S.length - 1) / 2] : (S[S.length / 2 - 1] + S[S.length / 2]) / 2) : NaN;
};

/* ---------- Page pieces ---------- */
// Filters, sorting and folded cards (Pierre, 2026-11-04: "I can't scroll through everything"): remembered per page, in
// this browser only (a viewer's convenience, AGENTS.md: browser storage never for shared state).
const ANF = (() => {
  const v = store.get('reefid-admin-anf', {});
  return v && typeof v === 'object' ? v : {};
})();
const anPref = () =>
  (ANF[cur || 'analyses/overview'] = Object.assign({f: 'all', s: 'neg', open: {}, more: {}}, ANF[cur || 'analyses/overview'] || {}));
const anPrefSave = () => store.set('reefid-admin-anf', ANF);
const AN_FILTERS = [
  ['all', 'All'],
  ['clear', 'Clear'],
  ['good', '▲ Helps'],
  ['bad', '▼ Hurts'],
  ['thin', '… Not enough data']
];
const anKeep = (P, e, f = anPref().f) => f === 'all' || (f === 'clear' ? P.v === 'clear' : f === 'thin' ? P.tone === 'thin' : P.tone === f);
let AN_CARDS = []; // the cards drawn on this page, for the jump list: [slug, title]
const anSlug = t =>
  String(t)
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
// A card that folds on a tap of its title (open by default unless open === false), its state kept per page.
function anCard(t, body, cls = '', open) {
  const sl = anSlug(t),
    p = anPref(),
    o = sl in p.open ? !!p.open[sl] : open !== false;
  AN_CARDS.push([sl, t]);
  return `<section class="adm-scard adm-an-card${cls ? ' ' + cls : ''}${o ? '' : ' folded'}" id="anc-${sl}"><h3><button type="button" class="adm-an-fold" data-anfold="${sl}" aria-expanded="${o}">${t}</button></h3><div class="adm-an-body">${body}</div></section>`;
}
const anSeg = (lab, L, on, attr) =>
  `<span class="adm-qseg adm-sseg" role="group" aria-label="${lab}">${L.map(([v, l]) => `<button type="button" data-${attr}="${v}" aria-pressed="${on === v}">${l}</button>`).join('')}</span>`;
// The bar of controls: show (all, clear, helps, hurts, not enough data), and the jump list.
const anControls = () => `<div class="adm-an-ctl">${anSeg('Show', AN_FILTERS, anPref().f, 'anf')}</div>`;
// Sorting (Pierre, 2026-11-05: "the order looks random"): every list of results (a chart, a table in words) has the same
// control above it, one choice per page: by the signed change (the most negative or the most positive first, a result
// with no clear effect or too early to tell among the others by its estimate), by topic (the Overview: a sub-heading per
// analysis, by the signed change inside it, the analyses in the menu's order) or by name. Default: most negative first.
const AN_SORTS = [
  ['neg', 'Most negative first'],
  ['pos', 'Most positive first'],
  ['topic', 'By topic'],
  ['name', 'By name']
];
const anSort = multi => {
  const s = anPref().s;
  return AN_SORTS.some(x => x[0] === s) && (multi || s !== 'topic') ? s : 'neg';
};
const anSortCtl = multi =>
  `<div class="adm-an-sort">${anSeg(
    'Sort',
    AN_SORTS.filter(x => multi || x[0] !== 'topic'),
    anSort(multi),
    'ans'
  )}</div>`;
// What a result is sorted on: [kind, value]. Kind 0, a change, on one scale for every outcome (points of a chance, or
// the share of time gained or lost: −0.12 = 12 points less likely or 12% faster); 1, a spread, by its size; 2, a number
// of answers; 3, nothing estimated yet (last, by name).
const anKeyOf = x => {
  const P = x.P,
    fin = v => v != null && isFinite(v);
  if (!fin(P.val)) return [3, 0];
  if (x.e.sd) return [1, P.val];
  if (!fin(P.base)) return [2, P.val];
  return [0, P.scale === 's' ? P.val / (P.base || 1) - 1 : P.val - P.base];
};
// Only the clear results by default (Pierre, 2026-11-05): the others (no clear effect, too early to tell) wait behind one
// toggle per list, which shows them in the same chart or table, in the same order; its state kept per page and list.
// Read from the verdict alone (P.v), so it follows whatever decides the verdicts. Show "Not enough data" opens them all.
function anFold(L, id) {
  const p = anPref(),
    open = p.f === 'thin' || !!p.more[id],
    n = L.filter(x => x.P.v !== 'clear').length;
  return {L: open ? L : L.filter(x => x.P.v === 'clear'), n, open, id, all: p.f === 'thin'};
}
// The list's toggle, under it; with no clear result, one line that says so, and the toggle.
function anFolded(F, body) {
  const btn =
    F.n && !F.all
      ? `<button type="button" class="linkish adm-an-more" data-anmore="${esc(F.id)}" aria-expanded="${F.open}">${
          F.open
            ? `Hide the ${F.n} with no clear verdict`
            : F.n === 1
              ? 'Show the effect with no clear verdict'
              : `Show the ${F.n} effects with no clear verdict`
        }</button>`
      : '';
  return F.L.length
    ? body + (btn ? `<p class="adm-an-morel">${btn}</p>` : '')
    : `<p class="note adm-an-morel">No clear effect yet.${btn ? ' ' + btn : ''}</p>`;
}
const anTopicAt = k => AN_VIEWS.findIndex(v => v[1] === k);
// L: [{P, e, k (the analysis, on the Overview)}], in the order the page asks; multi: results of several analyses.
function anOrder(L, multi) {
  const s = anSort(multi),
    sg = s === 'pos' ? -1 : 1,
    name = (a, b) => String(a.x.P.name || '').localeCompare(String(b.x.P.name || '')) || (multi ? anTopicAt(a.x.k) - anTopicAt(b.x.k) : 0),
    signed = (a, b) => a.c[0] - b.c[0] || (a.c[0] === 3 ? 0 : sg * (a.c[1] - b.c[1])) || name(a, b),
    K = L.map(x => ({x, c: anKeyOf(x)}));
  K.sort(s === 'name' ? name : s === 'topic' ? (a, b) => anTopicAt(a.x.k) - anTopicAt(b.x.k) || signed(a, b) : signed);
  return K.map(o => o.x);
}
const anJump = () =>
  AN_CARDS.length > 2
    ? `<nav class="adm-an-jump" aria-label="Jump to">${AN_CARDS.map(([sl, t]) => `<button type="button" class="adm-chip" data-anjump="${sl}">${t}</button>`).join('')}</nav>`
    : '';
// Diverging bars: one effect a row, its name above it (its topic on a grey line of its own under the name, on the
// Overview), the bar from no change to the change it makes, the likely range as a thin line, coloured by verdict (helps,
// hurts, clear but neither, no clear effect, not enough data: hollow); a sub-heading where the group changes (by topic).
// rows: [{label, sub, grp, d, lo, hi, tone, title}]; o: {tf (a change as text), title}.
function divBars(rows, o = {}) {
  rows = rows.filter(r => r.d != null && isFinite(r.d));
  if (!rows.length) return '<p class="note">Nothing to show with this filter.</p>';
  // the value of each bar in a column of its own on the right, clear of the bars and their ranges
  const w = o.w || anW(),
    x0 = 10,
    x1 = w - 66,
    per = Math.max(12, Math.floor((w - 24) / 6.6)),
    // words into lines, never past the right edge on a phone
    wrap = t => {
      const L = [''];
      String(t || '')
        .split(' ')
        .filter(Boolean)
        .forEach(wd =>
          L[L.length - 1] && L[L.length - 1].length + wd.length + 1 > per
            ? L.push(wd)
            : (L[L.length - 1] += (L[L.length - 1] ? ' ' : '') + wd)
        );
      return L[0] ? L : [];
    },
    labs = rows.map(r => wrap(r.label)),
    subs = rows.map(r => wrap(r.sub)),
    heads = rows.map((r, i) => (r.grp && (!i || rows[i - 1].grp !== r.grp) ? wrap(r.grp) : [])),
    hd = rows.map((r, i) => (heads[i].length ? 16 * heads[i].length + (i ? 12 : 4) : 0)),
    hs = rows.map((r, i) => 22 + 14 * labs[i].length + 14 * subs[i].length),
    y0s = [];
  let y = 4;
  rows.forEach((r, i) => {
    y += hd[i];
    y0s.push(y);
    y += hs[i];
  });
  const h = y + 26,
    m =
      Math.max(
        ...rows
          .flatMap(r => [r.d, r.lo, r.hi])
          .filter(v => v != null && isFinite(v))
          .map(Math.abs),
        1e-9
      ) * 1.08,
    X = v => x0 + ((Math.max(-m, Math.min(m, v)) + m) / (2 * m)) * (x1 - x0),
    tf = o.tf || (v => anNum(v, 2)),
    yb = h - 22,
    lines = (L, x, y, cls) =>
      `<text class="${cls}" x="${x}" y="${y}">${L.map((t, j) => `<tspan x="${x}" dy="${j ? 14 : 0}">${esc(t)}</tspan>`).join('')}</text>`;
  let s = '';
  ticks(-m, m, 4).forEach(
    t =>
      (s += `<line class="an-grid" x1="${X(t)}" x2="${X(t)}" y1="4" y2="${yb}"/><text class="an-tick" x="${X(t)}" y="${yb + 15}" text-anchor="middle">${esc(t ? tf(t) : 'no change')}</text>`)
  );
  s += `<line class="an-zero" x1="${X(0)}" x2="${X(0)}" y1="4" y2="${yb}"/>`;
  rows.forEach((r, i) => {
    const nl = labs[i].length,
      ns = subs[i].length,
      y = y0s[i] + 14 * (nl + ns) + 6,
      a = X(Math.min(0, r.d)),
      b = X(Math.max(0, r.d));
    if (heads[i].length)
      s += `<g class="an-grp"><line class="an-grp-l" x1="0" x2="${w}" y1="${y0s[i] - hd[i] + 2}" y2="${y0s[i] - hd[i] + 2}"/>${lines(heads[i], 0, y0s[i] - hd[i] + 16, 'an-grp-t')}</g>`;
    s += `<g data-d="${r.d}"><title>${esc(r.title || r.label)}</title><rect class="an-hit" x="0" y="${y0s[i]}" width="${w}" height="${hs[i]}"/>${lines(labs[i], x0, y0s[i] + 12, 'an-lab an-name')}`;
    if (ns) s += lines(subs[i], x0, y0s[i] + 12 + 14 * nl, 'an-sub');
    s += `<rect class="an-dbar t-${r.tone || 'none'}" x="${a}" y="${y - 5}" width="${Math.max(1.5, b - a)}" height="10" rx="2"/>`;
    if (isFinite(r.lo) && isFinite(r.hi)) s += `<line class="an-ci" x1="${X(r.lo)}" x2="${X(r.hi)}" y1="${y}" y2="${y}"/>`;
    s += `<text class="an-val t-${r.tone || 'none'}" x="${w - 6}" y="${y + 4}" text-anchor="end">${esc(tf(r.d))}</text></g>`;
  });
  return svg(w, h, o.title || 'Effects', s);
}
// A change on an outcome's own scale, as text: points of a chance, or seconds.
const anDf = o => (o === 'time' ? v => (v > 0 ? '+' : v < 0 ? '−' : '') + anSec(Math.abs(v)) : v => anPts(v));
// The bars of a set of effects on one outcome: the change from the typical value, sorted as the page asks; multi (the
// Overview): each with its topic, the analysis it comes from, on a line of its own (or as sub-headings, by topic).
function anBarsOf(L, o, multi) {
  const grp = multi && anSort(multi) === 'topic',
    rows = anOrder(L, multi).map(x => ({
      label: x.P.name,
      sub: multi && !grp ? anTitle(x.k) : '',
      grp: grp ? anTitle(x.k) : '',
      d: x.P.val - (x.P.base || 0),
      lo: x.P.lo == null ? null : x.P.lo - (x.P.base || 0),
      hi: x.P.hi == null ? null : x.P.hi - (x.P.base || 0),
      tone: x.P.tone,
      title: `${x.P.name}${multi ? ` (${anTitle(x.k)})` : ''}: ${x.P.text}`
    }));
  return divBars(rows, {tf: anDf(o), title: AN_OUT[o]});
}
// A sparkline of one result's value at every milestone (the last dot = now).
function anSpark(rep, key, k) {
  const P = rep.M.map(M => {
    const A = rep.R[M].A[key],
      e = ((A && A.effects) || []).find(x => x.k === k);
    return e && e.est != null && isFinite(e.est) && !e.sd ? anPlain(key, e, A).val : null;
  }).filter(v => v != null && isFinite(v));
  if (P.length < 2) return '';
  const w = 60,
    h = 18,
    a = Math.min(...P),
    b = Math.max(...P),
    X = i => 2 + (i / (P.length - 1)) * (w - 4),
    Y = v => h - 3 - ((v - a) / (b - a || 1)) * (h - 6);
  return `<svg class="adm-an-spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="M${P.map((v, i) => `${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('L')}"/><circle cx="${X(P.length - 1)}" cy="${Y(P[P.length - 1])}" r="2"/></svg>`;
}
const anTable = (head, rows, cls = '') =>
  `<div class="adm-tscroll${cls === 'tall' ? ' tall' : ''}"><table class="adm-tbl${cls && cls !== 'tall' ? ' ' + cls : ''}"><thead><tr>${head.map(h => (h[0] === '#' ? `<th class="n">${h.slice(1)}</th>` : `<th>${h}</th>`)).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
// The per-player lines of a stored report made before an account was removed (sheet v55: the next run refits it, AV 5
// leaves those answers out): hidden once this browser knows who is still a player, the ids on Players and the devices
// that never signed in (readAnswers anonymous 1). Pierre, 2026-11-05: a removed account is in no per-player result.
let anAnsP = null; // the answer log asked for by the Analyses pages (once)
// The answer log for anLive, read once at a time. The guard is cleared before the redraw (Codex review #600): a log
// dropped while it was read (a delete or merge: sheetAgain('ans')) is then read again by that redraw.
function anAnsLoad() {
  if (!TOKEN || ANS || anAnsP) return;
  anAnsP = loadStats().then(
    () => {
      anAnsP = null;
      if (anPage(cur) && ANREP) render();
    },
    () => (anAnsP = null)
  );
}
function anLive(L, key = 'k') {
  const U = USERS && USERS.users,
    R = ANS && ANS.rows;
  if (!Array.isArray(L) || !U || !R) return L || [];
  const ok = new Set(U.map(u => u.id).filter(Boolean));
  R.forEach(r => r[11] === 1 && ok.add(r[0]));
  return L.filter(x => ok.has(String(x[key]).split('#')[0]));
}
// Player labels: the name from Players when this browser has it (the report keeps anonymous ids), else P1, P2… by order.
function anWho(id, i) {
  const u = ((USERS && USERS.users) || []).find(x => x.id === String(id).split('#')[0]);
  return u ? cut(u.name) : `<span class="adm-cut" title="${esc(id)}">P${i + 1}</span>`;
}
// The effects of one analysis: one bar chart per outcome (the change from the typical value, coloured by verdict, sorted
// and filtered as the page asks), the spreads as the range a typical player, genus or photo falls in, then the same in
// words, folded (Pierre, 2026-11-04: "very visual; text available but secondary").
function anEffects(a, key) {
  const E = (a.effects || []).map(e => ({e, P: anPlain(key, e, a), S: anSpec(key, e)})),
    keep = E.filter(x => anKeep(x.P, x.e)),
    main = keep.filter(x => !x.e.sd),
    sds = keep.filter(x => x.e.sd);
  const outs = [
    ...new Set(
      main.filter(x => x.P.val != null && x.P.base != null && x.e.v !== 'none' && ANALYSIS.outOf(x.S) !== 'n').map(x => ANALYSIS.outOf(x.S))
    )
  ];
  const plots = outs
    .map(o => {
      const L = main.filter(x => ANALYSIS.outOf(x.S) === o && x.P.val != null && x.P.base != null && !(x.e.hi - x.e.lo > 20));
      if (!L.length) return '';
      const F = anFold(L, 'o-' + o);
      return `<h4 class="adm-an-out">${esc(AN_OUT[o])}: change from typical</h4>${anFolded(F, anBarsOf(F.L, o))}`;
    })
    .join('');
  const FS = anFold(sds, 'spread'),
    FW = anFold(main.concat(sds), 'words');
  const spread = sds.length
    ? anFolded(
        FS,
        dotRange(
          anOrder(FS.L).map(x => ({label: x.P.name, est: x.P.base, lo: x.P.lo, hi: x.P.hi, tone: x.P.tone, title: x.P.text})),
          {
            tf: anTf(sds[0].P),
            nul: sds[0].P.base,
            lab: 'typical',
            title: 'How much they differ',
            ...(sds[0].P.scale === 'p' ? {clamp: [0, 1]} : {})
          }
        )
      )
    : '';
  const row = x =>
    `<tr data-ek="${esc(key + ':' + x.e.k)}"><td class="an-c">${esc(x.P.name)}</td><td class="adm-an-says">${anSays(x.P)}</td><td class="an-v">${anPill(x.P, x.e)}</td></tr>`;
  return (
    anCard('What changes the result', plots ? anSortCtl() + plots : '<p class="note">Nothing to show with this filter.</p>', 'wide') +
    (spread ? anCard('How much they differ', anSortCtl() + spread, 'wide') : '') +
    anCard(
      'In words',
      anSortCtl() + anFolded(FW, anTable(['Compared', 'What it does', 'Verdict'], anOrder(FW.L).map(row), 'adm-an-eff')),
      'wide',
      false
    )
  );
}
// How each estimate moved from milestone to milestone, read on its own scale (small multiples).
function anConv(rep, key) {
  const Ms = rep.M.filter(M => rep.R[M].A[key]);
  if (Ms.length < 2) return '';
  const lastA = rep.R[Ms[Ms.length - 1]].A[key],
    last = (lastA.effects || []).filter(e => e.est != null && !e.sd && e.unit !== 'n' && !(e.hi - e.lo > 20));
  const W = anW(),
    // the grid's columns follow the size classes (admin.css .adm-an-convs: 1 on phones, 2 on tablets, 3 on desktops)
    cols = matchMedia('(min-width: 1024px)').matches ? 3 : matchMedia('(min-width: 600px)').matches ? 2 : 1,
    w = Math.floor((W - (cols - 1) * 12) / cols) - 4;
  const cells = last.map(e => {
    const P = Ms.map(M => {
      const A = rep.R[M].A[key],
        x = ((A && A.effects) || []).find(y => y.k === e.k);
      return [M, x && x.est != null && isFinite(x.est) ? anPlain(key, x, A) : null];
    }).filter(([, x]) => x && x.val != null && isFinite(x.val));
    if (P.length < 2) return '';
    const name = P[P.length - 1][1].name,
      tf = anTf(P[0][1]),
      vs = P.flatMap(([, x]) => [x.lo, x.hi, x.val, x.base]).filter(v => v != null && isFinite(v)),
      ya = Math.min(...vs),
      yb = Math.max(...vs);
    return `<div class="adm-an-conv"><b title="${esc(name)}">${esc(name)}</b>${lines(
      [
        {
          label: name,
          pts: P.map(([M, x]) => [M, x.val]),
          band: P.map(([M, x]) => [M, x.lo != null && isFinite(x.lo) ? x.lo : x.val, x.hi != null && isFinite(x.hi) ? x.hi : x.val]),
          dots: true
        }
      ],
      {
        w,
        h: 130,
        ymin: ya,
        ymax: yb === ya ? ya + 0.01 : yb,
        yf: tf,
        xf: v => (v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'k' : v),
        xticks: [P[0][0], P[P.length - 1][0]],
        title: `${name} by milestone`
      }
    )}</div>`;
  });
  return anCard('As the answers came in', `<div class="adm-an-convs">${cells.join('')}</div>`, 'wide', false);
}
// Photo thumbnails that open the photo (Photo factors, Response time).
function anThumbs(L, val) {
  const by = new Map(allPhotos().map(p => [p.f, p]));
  return `<div class="adm-an-thumbs">${L.map(x => {
    const p = by.get(x.f);
    return `<figure>${p ? `<button type="button" class="adm-ph" data-zf="${esc(x.f)}" data-g="${esc(p.genus)}" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy"></button>` : `<span class="adm-ph"><code>${esc(x.f)}</code></span>`}<figcaption>${p ? `<i>${esc(p.genus)}</i> ` : ''}${val(x)}</figcaption></figure>`;
  }).join('')}</div>`;
}

/* ---------- Structure (the multifactor visualisation study of 2026-11-05; Pierre's Q70-Q77) ---------- */
const anWide = () => matchMedia('(min-width: 600px)').matches;
// A correlation's strength class (diverging: the accent above 0, --bad below, three strengths past 0.2, 0.4, 0.6, 0.8).
const anRc = r => {
  const a = Math.abs(r),
    k = a < 0.2 ? 0 : a < 0.4 ? 1 : a < 0.6 ? 2 : a < 0.8 ? 3 : 4;
  return {c: k ? (r > 0 ? 'an-hp' : 'an-hn') + k : 'an-h0', inv: k >= 3};
};
// A correlation without a signed number (the admin reads no raw signed number: Pierre, 2026-11-05, #601): its size and
// its direction in words (anRw, "0.82, opposite ways"), or behind ▲ (the same way) / ▼ (opposite ways) in a cell (anRs).
const anR = r => (r == null || !isFinite(r) ? '–' : Math.abs(r).toFixed(2));
const anRw = r => (r == null || !isFinite(r) ? '–' : `${anR(r)}, ${r < 0 ? 'opposite ways' : 'the same way'}`);
const anRs = r => (r == null || !isFinite(r) ? '–' : (r < 0 ? '▼' : '▲') + anR(r));
// Effects hard to tell apart (study §2.2, §2.3; analysis.js entOf), a folded card in each analysis: the pairs whose
// estimates are correlated past ±0.6 in words (read their sum, not each alone), the conditions that come together in the
// answers past ±0.7 and the variance inflation factors past 5, then two small lower-triangle heatmaps (the estimates, the
// conditions), numbered columns, the names as row labels, and a table of every pair and every VIF.
function anEnt(a, key) {
  const E = a.ent;
  if (!E || !E.k || E.k.length < 2) return '';
  const nm = k => {
      const e = (a.effects || []).find(x => x.k === k);
      return e ? anPlain(key, e, a).name : k;
    },
    N = E.k.map(nm),
    P = E.k.flatMap((_, i) => E.k.slice(0, i).map((__, j) => ({i, j, r: E.r[i][j], x: E.x ? E.x[i][j] : null}))).filter(p => p.r != null),
    by = f => (p, q) => Math.abs(f(q)) - Math.abs(f(p)),
    hard = P.filter(p => Math.abs(p.r) >= 0.6).sort(by(p => p.r)),
    tog = P.filter(p => p.x != null && Math.abs(p.x) >= 0.7).sort(by(p => p.x)),
    vif = (E.vif || []).map((v, i) => [i, v]).filter(([, v]) => v >= 5);
  const li = L => `<ul class="adm-an-says-l">${L.join('')}</ul>`,
    words =
      (hard.length
        ? li(
            hard.map(
              // the stable combination follows the sign (Codex review #592): estimates that trade off (r < 0) are sure in their
              // sum, estimates that move together (r > 0) in their difference
              p =>
                `<li><b>${esc(N[p.i])}</b> and <b>${esc(N[p.j])}</b>: hard to tell apart (correlation ${anRw(p.r)}); ${
                  p.r < 0
                    ? 'one may be too high and the other too low: read their sum'
                    : 'both may be too high or both too low: read their difference'
                }.</li>`
            )
          )
        : '<p class="note">No two results are hard to tell apart (every correlation of their estimates within ±0.6).</p>') +
      (tog.length || vif.length
        ? li([
            ...tog.map(
              p => `<li><b>${esc(N[p.i])}</b> and <b>${esc(N[p.j])}</b> often come together in the answers (correlation ${anRw(p.x)}).</li>`
            ),
            ...vif.map(([i, v]) => `<li><b>${esc(N[i])}</b>: mostly predictable from the other conditions (VIF ${v.toFixed(1)}).</li>`)
          ])
        : '');
  const full = E.r.every((row, i) => row.length === i && row.every(v => v != null)),
    two = matchMedia('(min-width: 1024px)').matches && E.x,
    w = two ? Math.floor((anW() - 12) / 2) : anW(),
    map = (M, t) =>
      heat({
        n: N.length,
        nc: N.length - 1, // the last effect has no pair to its left: its column would stay empty
        rl: N.map((s, i) => `${i + 1} ${s}`),
        cl: N.map((_, i) => String(i + 1)),
        num: true,
        w,
        cs: 46,
        tmin: 40,
        // the names get what the cells leave (cells of 30 px at least on a phone, 46 px at most)
        lw: Math.max(110, Math.min(240, w - 30 * (N.length - 1) - 6, Math.round(w * 0.5))),
        cell: (i, j) =>
          j < i && M[i][j] != null ? {...anRc(M[i][j]), t: anRs(M[i][j]), title: `${N[i]} · ${N[j]}: correlation ${anRw(M[i][j])}`} : null,
        title: t
      }),
    charts = full
      ? `<div class="adm-an-pair"><div><h4 class="adm-an-out">Estimates</h4>${map(E.r, 'Correlation of the estimates')}</div>${
          E.x
            ? `<div><h4 class="adm-an-out">Conditions in the answers</h4>${map(E.x, 'Correlation of the conditions in the answers')}</div>`
            : ''
        }</div>`
      : '';
  const rows = P.slice()
    .sort(by(p => p.r))
    .map(
      p =>
        `<tr><td class="an-w">${esc(N[p.i])} · ${esc(N[p.j])}</td><td class="n">${anRs(p.r)}</td>${E.x ? `<td class="n">${anRs(p.x)}</td>` : ''}</tr>`
    );
  const tab =
    anTable(
      ['Results compared (▲ the same way, ▼ opposite ways)', '#Estimates', ...(E.x ? ['#Conditions'] : [])],
      rows,
      rows.length > 12 ? 'tall' : ''
    ) +
    (E.vif
      ? anTable(
          ['Result', '#VIF'],
          E.vif.map((v, i) => `<tr><td class="an-w">${esc(N[i])}</td><td class="n">${v.toFixed(1)}</td></tr>`)
        )
      : '');
  return anCard('Effects hard to tell apart', words + charts + tab, 'wide', false);
}
// The mix-up map (study §2.11; analysis.js mixMap; Pierre's Q74): from tablet width up, the whole matrix (rows the genus
// shown, columns the genus answered, both in the dendrogram's order, the tree on top), each cell coloured by its rate
// against a typical pair, the genus sheets' look-alikes outlined, each family a dashed block on the diagonal; on a
// phone, the dendrogram as a list of genera (the tree on their left), each family a band that opens, on a tap, its own
// block and its mix-ups. In words: the families, those no genus sheet names as look-alikes, and the mix-ups across
// families. A table of the exact numbers beside it.
function anMixMap(a) {
  const m = a.map;
  if (!m || !m.g || m.g.length < 3) return '';
  const n = m.g.length,
    G = m.g,
    C = new Map(m.cells.map(c => [c[0] * n + c[1], c])),
    famOf = new Map(m.fam.flatMap((L, f) => L.map(i => [i, f]))),
    gen = (typeof DATA !== 'undefined' && DATA && DATA.gen) || {},
    look = (x, y) => ((gen[x] || {}).look || []).includes(y) || ((gen[y] || {}).look || []).includes(x),
    hmax = Math.max(1e-9, ...m.m.map(x => x[2])),
    q = sr => (sr <= m.base ? 0 : sr <= 1.5 * m.base ? 1 : sr <= 2.5 * m.base ? 2 : sr <= 4 * m.base ? 3 : 4),
    tim = sr => `×${(sr / m.base).toFixed(1)}`,
    tip = c => `${G[c[0]]} shown, ${G[c[1]]} answered: ${c[3]} of ${c[2]} offers (${pc(c[3] / c[2])}); about ${tim(c[4])} a typical pair`,
    cellOf = (i, j) => {
      const c = C.get(i * n + j);
      return c ? {c: 'an-hq' + q(c[4]), inv: q(c[4]) >= 3, t: pc(c[4]), title: tip(c)} : i === j ? {c: 'an-hd', title: G[i]} : null;
    },
    fams = m.fam.map(L => L.map(i => G[i])),
    plain = m.fam.filter(L => !L.some(i => L.some(j => j !== i && look(G[i], G[j])))),
    it = L => L.map(g => `<i>${esc(g)}</i>`).join(' · ');
  const words = `<ul class="adm-an-says-l">${[
    fams.length
      ? `<li>Families of mix-ups: ${fams.map(it).join('; ')}.</li>`
      : '<li>No family stands out yet: no pair is clearly mixed up more than a typical pair.</li>',
    plain.length ? `<li>Not look-alikes on any genus sheet: ${plain.map(L => it(L.map(i => G[i]))).join('; ')}.</li>` : '',
    m.across.length
      ? `<li>Mixed up across families (look at their photos): ${m.across
          .map(([i, j]) => {
            const c = C.get(i * n + j);
            return `<i>${esc(G[i])}</i> → <i>${esc(G[j])}</i> (${c[3]} of ${c[2]})`;
          })
          .join('; ')}.</li>`
      : '',
    m.left ? `<li>${m.left} genera never mixed up: not on the map.</li>` : ''
  ].join('')}</ul>`;
  const rowsOf = L =>
    L.filter(c => c[3]).map(
      c =>
        `<tr><td><i>${esc(G[c[0]])}</i></td><td><i>${esc(G[c[1]])}</i></td><td class="n">${c[2]}</td><td class="n">${c[3]}</td><td class="n">${pc(c[3] / c[2])}</td><td class="n">${pc(c[4])}</td><td class="n">${tim(c[4])}</td></tr>`
    );
  const table = L =>
    anTable(['Shown', 'Answered', '#Offered', '#Mixed up', '#Rate', '#Rate, shrunk', '#Against a typical pair'], rowsOf(L), 'tall');
  const leg = `<p class="adm-an-leg adm-an-hleg"><span><i class="an-h an-hq0"></i>Typical or less</span><span><i class="an-h an-hq1"></i>×1.5</span><span><i class="an-h an-hq2"></i>×2.5</span><span><i class="an-h an-hq3"></i>×4</span><span><i class="an-h an-hq4"></i>More</span><span><i class="an-h an-look"></i>Look-alikes</span><span><i class="an-blk"></i>Family</span></p>`;
  if (anWide()) {
    const chart = heat({
      n,
      rl: G,
      cl: G,
      rcls: 'an-it',
      lw: 118,
      cs: 22,
      top: 70,
      ax: ['Shown', 'Answered'],
      tree: (x0, cs, H) =>
        dendroPath(
          m.m,
          n,
          i => x0 + i * cs + cs / 2,
          h => H - 2 - (h / hmax) * (H - 10),
          'top',
          0.999
        ),
      cell: cellOf,
      mark: (i, j) => (i !== j && look(G[i], G[j]) ? 'an-look' : ''),
      blocks: m.fam.map(L => [L[0], L[L.length - 1]]),
      title: 'Mix-ups between genera: the genus shown (rows) and the genus answered (columns), families as blocks'
    });
    return anCard('Mix-up map', words + chart + leg + table(m.cells), 'wide');
  }
  // Phone: the tree as a list, a band per family (tap: its block and its mix-ups below)
  const sel = Math.min(Math.max(0, anPref().mfam || 0), Math.max(0, m.fam.length - 1)),
    w = anW(),
    rh = 22,
    tw = 64,
    h = n * rh + 6,
    Y = i => 3 + i * rh + rh / 2;
  let s = '';
  m.fam.forEach((L, f) => {
    s += `<g class="an-famg${f === sel ? ' on' : ''}" data-anfam="${f}" role="button" tabindex="0" aria-pressed="${f === sel}"><title>${esc(L.map(i => G[i]).join(' · '))}</title><rect class="an-famb" x="0" y="${Y(L[0]) - rh / 2}" width="${w}" height="${L.length * rh}" rx="4"/></g>`;
  });
  s += dendroPath(m.m, n, Y, hh => tw - 2 - (hh / hmax) * (tw - 8), 'left', 0.999);
  G.forEach((g, i) => (s += `<text class="an-lab an-it an-nohit" x="${tw + 6}" y="${Y(i) + 4}">${esc(fit(g, w - tw - 12))}</text>`));
  const tree = svg(w, h, 'Genera ordered by their mix-ups, families as bands', s);
  let block = '';
  if (m.fam.length) {
    const L = m.fam[sel];
    block =
      `<h4 class="adm-an-out">${it(L.map(i => G[i]))}</h4>` +
      heat({
        n: L.length,
        rl: L.map(i => G[i]),
        cl: L.map(i => G[i]),
        rcls: 'an-it',
        num: false,
        lw: 110,
        cs: 56,
        tmin: 40,
        ax: ['Shown', 'Answered'],
        cell: (i, j) => cellOf(L[i], L[j]),
        mark: (i, j) => (i !== j && look(G[L[i]], G[L[j]]) ? 'an-look' : ''),
        title: 'Mix-ups within the family'
      }) +
      table(m.cells.filter(c => L.includes(c[0]) && L.includes(c[1])));
  }
  return anCard('Mix-up map', words + tree + leg + block, 'wide');
}

// Player profiles (Pierre, 2026-11-05, Q70-Q74; analysis.js profiles): a descriptive map of how each player plays on
// their last 300 answers, never named types. A heatmap of players × behaviours (the number in each cell: how far from the
// players' average, in standard deviations; above in the accent, below in ink), rows ordered by Ward's tree (on their
// left), columns by how the behaviours go together, rows under 100 answers greyed below the others; the groups and how
// they hold when a player is left out or the players drawn again (the stability line); the closest pairs and the most
// different player in words; a biplot beside it on a desktop, in a card of its own below (folded on a phone, its 8 points
// furthest from the centre labelled); a table of every number. Names come from Players (the report keeps anonymous ids).
const AN_PROF = {
  pace: ['Time', v => (v == null ? '–' : `${anNum((Math.exp(v) - 1) * 100, 0)}% time`)],
  zoom: ['Zoom', v => (v == null ? '–' : anPts(v))],
  acc: ['Right+', v => (v == null ? '–' : anPts(v))],
  stop: ['Stops', v => (v == null ? '–' : anPts(v))],
  len: ['Session', v => (v == null ? '–' : `${anInt(v)} answers`)],
  wk: ['Weekly', v => (v == null ? '–' : `${v.toFixed(1)} a week`)],
  eve: ['Evening', v => (v == null ? '–' : pc(v))]
};
const sum0 = L => L.reduce((t, x) => t + x, 0);
const anWhoText = (id, i) => {
  const u = ((typeof USERS !== 'undefined' && USERS && USERS.users) || []).find(x => x.id === String(id).split('#')[0]);
  return u ? u.name : `P${i + 1}`;
};
const anWhoHref = id => {
  const u = ((typeof USERS !== 'undefined' && USERS && USERS.users) || []).find(x => x.id === String(id).split('#')[0]);
  return u ? '#players/list/journey/' + encodeURIComponent(u.name) : null;
};
// Why groups are not stable, from each check apart (Codex review #604): runs with one player left out that changed them,
// and groups the bootstrap finds again under 0.75 on average.
const anWhy = st => {
  const L = st.kept < st.runs ? ' These groups change when one player is left out.' : '',
    B = st.boot.some(j => j != null && j < st.at) ? ' Some groups change when the players are drawn again.' : '';
  return L + B;
};
const anZc = z => {
  const a = Math.abs(z),
    k = a < 0.5 ? 0 : a < 1 ? 1 : a < 1.5 ? 2 : a < 2 ? 3 : 4;
  return {c: k ? (z > 0 ? 'an-hp' : 'an-hb') + k : 'an-h0', inv: k >= 3};
};
function anProfiles(a) {
  const F = a.feats || [],
    W = a.who || [],
    nm = W.map((w, i) => anWhoText(w.k, i)),
    short = f => (AN_PROF[f.k] || [f.label])[0],
    val = (f, v) => (AN_PROF[f.k] ? AN_PROF[f.k][1](v) : String(v)),
    cols = a.cols || F.map((_, f) => f),
    main = W.filter(w => !w.low).length,
    desk = matchMedia('(min-width: 1024px)').matches,
    w = desk ? Math.floor((anW() - 12) / 2) : anW(),
    // beyond 3 SD the number says only that (a greyed row with few answers can sit far out)
    // no signed number (#601): ▲ above the players' average, ▼ below; beyond 3 SD only that
    zt = z => (z == null ? '–' : (z >= 0 ? '▲' : '▼') + (Math.abs(z) > 3 ? '>3' : Math.abs(z).toFixed(1))),
    side = (v, k) =>
      v == null || !isFinite(v) ? '–' : `${Math.abs(v).toFixed(2)} ${k ? (v >= 0 ? 'up' : 'down') : v >= 0 ? 'right' : 'left'}`;
  const hmap = heat({
    n: W.length,
    nc: cols.length,
    rl: nm,
    cl: cols.map(f => short(F[f])),
    w,
    cs: 40,
    tmin: 28,
    lt: a.m ? 34 : 0,
    lw: Math.min(130, Math.max(80, w - 34 - cols.length * 30 - 6)),
    ltree: a.m
      ? (top, cs, L0) =>
          dendroPath(
            a.m,
            main,
            i => top + i * cs + cs / 2,
            h => L0 - 2 - (h / Math.max(1e-9, ...a.m.map(x => x[2]))) * (L0 - 6),
            'left'
          )
      : null,
    rc: i => (W[i].low ? 'an-dim' : ''),
    href: i => anWhoHref(W[i].k),
    cell: (i, j) => {
      const f = cols[j],
        z = W[i].z[f],
        v = W[i].v[f];
      if (v == null) return {c: 'an-h0', title: `${nm[i]}: ${F[f].label}: no value (too few answers)`};
      // a greyed row (too few answers for a profile) keeps its numbers, without colour
      return {
        ...(W[i].low ? {c: 'an-h0 an-dim'} : anZc(z)),
        t: zt(z),
        title: `${nm[i]}: ${F[f].label}: ${val(F[f], v)} (${zt(z)} SD from the players' average; ${W[i].n} answers)`
      };
    },
    title: 'Players and how they play: each behaviour against the players’ average'
  });
  const leg = `<p class="adm-an-leg adm-an-hleg"><span><i class="an-h an-hp3"></i>Above the players’ average</span><span><i class="an-h an-hb3"></i>Below</span><span>▲ / ▼ and the number: standard deviations above or below it</span>${W.some(x => x.low) ? `<span class="an-dim">Greyed: under ${anInt(a.at)} answers</span>` : ''}</p>`;
  const bip = () => {
    if (!a.pca) return '';
    const far = new Set(
      a.pca.pts
        .map((p, i) => [i, Math.hypot(p[0], p[1])])
        .sort((x, y) => y[1] - x[1])
        .slice(0, anWide() ? 99 : 8)
        .map(x => x[0])
    );
    return biplot({
      w,
      var: a.pca.var,
      pts: a.pca.pts.map((p, i) => ({x: p[0], y: p[1], label: nm[i], lab: far.has(i), title: `${nm[i]} (${W[i].n} answers)`})),
      arrows: a.pca.load.map((l, f) => ({
        x: l[0],
        y: l[1],
        label: short(F[f]),
        title: `${F[f].label}: ${side(l[0], 0)}, ${side(l[1], 1)}`
      })),
      title: 'Map of players: players as points, behaviours as arrows'
    });
  };
  // the stability line and the words
  const st = a.stab,
    rng = L => {
      const V = L.filter(v => v != null);
      return V.length ? (Math.min(...V) === Math.max(...V) ? anR(V[0]) : `${anR(Math.min(...V))}–${anR(Math.max(...V))}`) : '–';
    },
    gl = (a.groups || []).map(L => L.map(i => esc(nm[i])).join(' · ')),
    // stable as analysis.js says (every leave-one-out run keeps every group, each bootstrap mean at 0.75 or more)
    stable = st && st.stable,
    words = a.groups
      ? `<ul class="adm-an-says-l">${[
          `<li>Groups of players (not types; ${a.k}, where the silhouette is best, ${a.sil < 0 ? 'below 0' : anR(a.sil)}): ${gl.map((g, i) => `<b>${i + 1}</b> ${g}`).join('; ')}.</li>`,
          st.stable == null
            ? `<li>Too few players to check whether these groups hold: with one left out, too few remain to group.</li>`
            : `<li>${stable ? 'Stable' : 'Not stable'}: the same groups in ${st.kept} of ${st.runs} runs with one player left out (Jaccard ${rng(st.loo)}); players drawn again ${st.draws} times: ${rng(st.boot)}.${anWhy(st)}</li>`,
          ...(a.close || []).map(
            ([i, j, , fs]) =>
              `<li>Close: <b>${esc(nm[i])}</b> and <b>${esc(nm[j])}</b>${fs.length ? ` (both ${fs.map(f => `${W[i].z[f] > 0 ? 'above' : 'below'} average in ${esc(F[f].label.toLowerCase())}`).join(', ')})` : ''}.</li>`
          ),
          a.far
            ? `<li>Most different from everyone: <b>${esc(nm[a.far[0]])}</b> (${esc(F[a.far[1]].label.toLowerCase())}, ${W[a.far[0]].z[a.far[1]] > 0 ? 'above' : 'below'} average).</li>`
            : ''
        ].join('')}</ul>`
      : '';
  const table = anTable(
    ['Player', '#Answers', ...cols.map(f => '#' + F[f].label)],
    W.map(
      (x, i) =>
        `<tr${x.low ? ' class="an-dim"' : ''}><td>${esc(nm[i])}</td><td class="n">${anInt(x.n)}</td>${cols.map(f => `<td class="n">${val(F[f], x.v[f])}<small class="adm-an-ci">${zt(x.z[f])} SD</small></td>`).join('')}</tr>`
    )
  );
  const ptab = a.pca
    ? anTable(
        ['Behaviour', '#Axis 1', '#Axis 2'],
        a.pca.load.map(
          (l, f) => `<tr><td>${esc(F[f].label)}</td><td class="n">${side(l[0], 0)}</td><td class="n">${side(l[1], 1)}</td></tr>`
        )
      ) +
      anTable(
        ['Player', '#Axis 1', '#Axis 2'],
        a.pca.pts.map((p, i) => `<tr><td>${esc(nm[i])}</td><td class="n">${side(p[0], 0)}</td><td class="n">${side(p[1], 1)}</td></tr>`)
      )
    : '';
  return [
    anCard(
      'Player profiles',
      (desk && a.pca ? `<div class="adm-an-pair"><div>${hmap}${leg}</div><div>${bip()}</div></div>` : hmap + leg) + words + table,
      'wide'
    ),
    a.pca ? anCard('Map of players', (desk ? '' : bip()) + ptab, 'wide', desk || anWide() ? undefined : false) : ''
  ];
}

// The Wright map (study §2.7, §5 item 3; analysis.js wrightOf): players and genera on the Learning model's one scale,
// a genus level with a player = about 50% recognised beyond guessing; the ★ look-alikes marked; in words, the genera
// beyond every player today and those every player recognises at 80% or more; a table of the exact places.
function anWright(a) {
  const W = a.wright;
  if (!W || !W.th || !W.g || W.th.length < 2) return '';
  const ids = W.th.map(x => x[0]),
    nm = id => anWhoText(id, ids.indexOf(id)),
    star = g => typeof starRefs === 'function' && typeof DATA !== 'undefined' && DATA && starRefs(DATA, g).length > 0,
    hi = Math.max(...W.th.map(x => x[1])),
    lo = Math.min(...W.th.map(x => x[1])),
    beyond = W.g.filter(x => x[1] > hi).sort((p, q) => q[1] - p[1]),
    easy = W.g.filter(x => x[1] < lo - W.m).sort((p, q) => p[1] - q[1]),
    it = L => L.map(x => `<i>${esc(x[0])}</i>`).join(' · '),
    // no signed number (#601): a player's place as the chance of recognising a typical genus beyond guessing, a genus's
    // difficulty as the chance the typical player recognises it beyond guessing, each with its likely range
    sg = v => 1 / (1 + Math.exp(-v)),
    mid = W.mid != null ? W.mid : q0(W.th.map(x => x[1])),
    pr = (v, se) => `${pc(sg(v))} <small class="adm-an-ci">(${pc(sg(v - 1.96 * se))}–${pc(sg(v + 1.96 * se))})</small>`,
    pt = x => `a typical genus recognised ${pc(sg(x[1]))} of the time beyond guessing`,
    gt = x => `recognised by the typical player ${pc(sg(mid - x[1]))} of the time beyond guessing`;
  const chart = wright({
    L: W.th.map(x => ({v: x[1], label: nm(x[0]), title: `${nm(x[0])}: ${pt(x)} (${anInt(x[2])} answers)`})),
    R: W.g.map(x => ({v: x[1], label: x[0], star: star(x[0]), title: `${x[0]}: ${gt(x)} (${anInt(x[2])} answers)`})),
    lab: ['Players ↑ more able', 'Genera ↑ harder'],
    title: 'Players and genera on one scale: a genus level with a player is recognised about half the time beyond guessing'
  });
  const words = `<ul class="adm-an-says-l"><li>${beyond.length ? `Beyond every player today (under 50% beyond guessing for each): ${it(beyond)}.` : 'No genus is beyond every player today.'}</li><li>${easy.length ? `Recognised at 80% or more beyond guessing by every player: ${it(easy)}.` : 'No genus is recognised at 80% or more by every player yet.'}</li></ul>`;
  const tab =
    anTable(
      ['Player', '#A typical genus recognised', '#Answers'],
      W.th
        .slice()
        .sort((p, q) => q[1] - p[1])
        .map(x => `<tr><td>${esc(nm(x[0]))}</td><td class="n">${pr(x[1], x[3])}</td><td class="n">${anInt(x[2])}</td></tr>`)
    ) +
    anTable(
      ['Genus', '#Recognised by the typical player', '#Answers'],
      W.g
        .slice()
        .sort((p, q) => q[1] - p[1])
        .map(
          x =>
            `<tr><td><i>${esc(x[0])}</i>${star(x[0]) ? ' ★' : ''}</td><td class="n">${pr(mid - x[1], x[3])}</td><td class="n">${anInt(x[2])}</td></tr>`
        ),
      'tall'
    );
  return anCard('Players and genera on one scale', words + chart + tab, 'wide');
}
// A second skill? (study §2.4, §5 item 5; Pierre's Q77; analysis.js resOf): the genus × player residuals after the
// Learning model as a biplot (genera as points, players as arrows), the first axis's share of the spread against the
// same share in logs simulated from the model, in words; descriptive, no verdict; a table of the places.
function anSkill(a) {
  const S = a.res;
  if (!S || !S.g) return '';
  const ids = S.p.map(x => x[0]),
    nm = id => anWhoText(id, ids.indexOf(id)),
    side = (v, k) =>
      v == null || !isFinite(v) ? '–' : `${Math.abs(v).toFixed(2)} ${k ? (v >= 0 ? 'up' : 'down') : v >= 0 ? 'right' : 'left'}`,
    big = S.var[0] > S.null[1],
    ends = (sg, k) =>
      S.g
        .filter(x => Math.sign(x[1]) === sg)
        .sort((p, q) => sg * (q[1] - p[1]))
        .slice(0, k)
        .map(x => `<i>${esc(x[0])}</i>`)
        .join(' · '),
    far = new Set(
      S.g
        .map((x, i) => [i, Math.hypot(x[1], x[2])])
        .sort((p, q) => q[1] - p[1])
        .slice(0, anWide() ? 99 : 8)
        .map(x => x[0])
    ),
    words = `<ul class="adm-an-says-l"><li>${
      big
        ? `A second skill may be there: the first axis carries ${pc(S.var[0])} of what the model leaves unexplained, more than in 95% of ${S.sims} logs simulated from the model (up to ${pc(S.null[1])}). At one end: ${ends(1, 5)}; at the other: ${ends(-1, 5)}.`
        : `One skill explains it so far: the first axis carries ${pc(S.var[0])} of what the model leaves unexplained, as in logs simulated from the model (${pc(S.null[0])}, up to ${pc(S.null[1])} in 95% of ${S.sims}).`
    }</li></ul>`;
  const chart = biplot({
    var: S.var,
    pts: S.g.map((x, i) => ({x: x[1], y: x[2], label: x[0], lab: far.has(i), title: `${x[0]}: ${side(x[1], 0)}, ${side(x[2], 1)}`})),
    arrows: S.p.map(x => ({x: x[1], y: x[2], label: nm(x[0]), title: `${nm(x[0])}: ${side(x[1], 0)}, ${side(x[2], 1)}`})),
    title: 'What the model leaves unexplained: genera as points, players as arrows'
  });
  const tab =
    anTable(
      ['Genus', '#Axis 1', '#Axis 2'],
      S.g
        .slice()
        .sort((p, q) => q[1] - p[1])
        .map(x => `<tr><td><i>${esc(x[0])}</i></td><td class="n">${side(x[1], 0)}</td><td class="n">${side(x[2], 1)}</td></tr>`),
      'tall'
    ) +
    anTable(
      ['Player', '#Axis 1', '#Axis 2'],
      S.p.map(x => `<tr><td>${esc(nm(x[0]))}</td><td class="n">${side(x[1], 0)}</td><td class="n">${side(x[2], 1)}</td></tr>`)
    );
  return anCard('A second skill?', words + chart + tab, 'wide', anWide() ? undefined : false);
}

/* ---------- Views ---------- */
// The Overview (Pierre, 2026-11-04: "very visual"): every result as a bar, one chart per outcome (a right answer, the time
// to answer, ending a session, mixing up genera, the app's own estimate), sorted as the page asks, coloured by verdict, the
// topic on a grey line under each name; the words, with a sparkline of each result over the milestones, and the
// milestones, folded.
const AN_GROUPS = [
  ['right', 'What helps or hurts a right answer'],
  ['time', 'What changes the time to answer'],
  ['stop', 'What ends a session'],
  ['mix', 'What makes genera mixed up'],
  ['beyond', 'Where a format is easier or harder than the app expects (beyond guessing)'],
  ['pts', 'Where the app’s own expectation is off'],
  ['guess', 'Success of a pure guess against the app’s value']
];
function anOverview(rep, R) {
  const all = Object.entries(R.A).flatMap(([k, a]) => (a.effects || []).map(e => ({k, e, P: anPlain(k, e, a), S: anSpec(k, e)}))),
    keep = all.filter(x => anKeep(x.P, x.e)),
    link = k => `<a href="#${esc(AN_VIEWS.find(v => v[1] === k)[0])}">${esc(anTitle(k))}</a>`;
  const clear = all.filter(x => x.P.v === 'clear'),
    tally = t => all.filter(x => x.P.tone === t).length;
  const charts = AN_GROUPS.map(([o, t]) => {
    const L = keep.filter(x => !x.e.sd && ANALYSIS.outOf(x.S) === o && x.P.val != null && x.P.base != null && !(x.e.hi - x.e.lo > 20));
    if (!L.length) return '';
    const F = anFold(L, o);
    return anCard(t, anSortCtl(true) + anFolded(F, anBarsOf(F.L, o, true)), 'wide');
  }).join('');
  // the words in the same order; the topic on a grey line under what is compared, or a sub-heading per topic
  const grp = anSort(true) === 'topic',
    FW = anFold(keep, 'words'),
    rows = anOrder(FW.L, true).flatMap((x, i, L) => [
      ...(grp && (!i || L[i - 1].k !== x.k) ? [`<tr class="an-grp"><th colspan="4" scope="colgroup">${link(x.k)}</th></tr>`] : []),
      `<tr><td class="an-c">${esc(x.P.name)}${grp ? '' : `<small class="adm-an-topic">${link(x.k)}</small>`}</td><td class="adm-an-says">${anSays(x.P)}</td><td class="an-sp">${anSpark(rep, x.k, x.e.k)}</td><td class="an-v">${anPill(x.P, x.e)}</td></tr>`
    ]);
  // Milestones as history (the stats study of 2026-11-05, §5.3): each is one more look at the same growing log, so no
  // count of results "new since the previous milestone" and no chart of clear results over time.
  const nClear = R2 => Object.values(R2.A).flatMap(a => (a.effects || []).filter(e => e.v === 'clear')).length;
  const ms = rep.M.map((M, i) => {
    const r = rep.R[M];
    return `<tr${M === R.M ? ' class="me"' : ''}><td><a href="#analyses/overview" data-anm="${anMv(rep, M)}">${anInt(M)}</a></td><td>${r.at ? dateText(r.at, 'dm') : '–'}</td><td class="n">${r.players}</td><td class="n">${nClear(r)}</td></tr>`;
  });
  return (
    kpis([
      ['Answers', anInt(R.M)],
      ['▲ Helps', tally('good')],
      ['▼ Hurts', tally('bad')],
      ['Clear results', `${clear.length} / ${all.filter(x => x.e.v !== 'nolog').length}`]
    ]) +
    `<div class="adm-sgrid adm-an-grid">${charts || anCard('Results', '<p class="note">Nothing to show with this filter.</p>', 'wide')}${anCard(
      'Every result in words',
      anSortCtl(true) + anFolded(FW, anTable(['Compared', 'What it does', 'Over time', 'Verdict'], rows, 'adm-an-eff adm-an-all')),
      'wide',
      false
    )}${anCard('Milestones', anTable(['Answers', 'Last answer', '#Players', '#Clear'], ms), 'wide', false)}</div>`
  );
}
function anView(key, rep, R) {
  const a = R.A[key];
  if (!a) return '<p class="note">Not in this report.</p>';
  if (a.err) return `<p class="note">Failed: ${esc(a.err)}</p>`;
  const head = kpis([
    ['Answers used', anInt(a.n)],
    ['Players', a.players ?? '–'],
    ...(a.thin ? [['Answers needed', `≥ ${anInt(a.min)}`]] : []),
    ...(key === 'zoom' && a.enlarged != null ? [['Photos enlarged', anInt(a.enlarged)]] : []),
    ...(key === 'photo' && a.photos ? [['Photos', anInt(a.photos)]] : []),
    ...(key === 'conf' && a.mixed != null ? [['Mixed up', anInt(a.mixed)]] : []),
    ...(key === 'back' && a.far != null ? [['After a break', anInt(a.far)]] : []),
    ...(key === 'sess' && a.sessions ? [['Sessions', anInt(a.sessions)]] : [])
  ]);
  if (key === 'who')
    return (
      kpis([
        ['Answers used', anInt(sum0((a.who || []).map(w => w.n)))],
        ['Players', (a.who || []).filter(w => !w.low).length],
        ['Answers per profile', `last ${anInt(a.win)}`]
      ]) +
      (a.thin
        ? `<p class="note">Not enough data yet: ${anInt(a.n)} of the ${anInt(a.min)} players with ${anInt(a.at)} answers or more a profile map needs.</p>`
        : `<div class="adm-sgrid adm-an-grid">${anProfiles(a).join('')}</div>`)
    );
  if (a.thin)
    return (
      head +
      `<p class="note">Not enough data yet: ${anInt(a.n)} of the ${anInt(a.min)} answers this analysis needs.</p>` +
      (key === 'sess' && a.desc ? `<div class="adm-sgrid adm-an-grid">${anSessDesc(a.desc).join('')}</div>` : '')
    );
  const lean = a.lean ? '<p class="note">Only the main results are kept for this milestone.</p>' : '';
  const parts = [anEffects(a, key)];
  if (!a.lean) parts.push(...(ANV[key] ? ANV[key](a, R) : []), anEnt(a, key));
  parts.push(anConv(rep, key));
  return head + lean + `<div class="adm-sgrid adm-an-grid">${parts.join('')}</div>`;
}
const pc = v => (v == null || !isFinite(v) ? '–' : Math.round(v * 100) + '%');
// The cards of each analysis beyond its effects.
const AN_PART = {
  player: 'Players',
  genus: 'Genera',
  photo: 'Photos',
  residual: 'From one answer to the next (same player, genus, photo)'
};
const anTyp = a => Object.assign({p: 0.75, g: 0.25, s: 6}, (a && a.typ) || {});
const anS = (a, u) => anTyp(a).s * Math.exp(u);
const ANV = {
  rt: a => [
    anCard(
      'What makes answer times differ',
      sharesBar(
        a.shares.map(p => ({...p, k: AN_PART[p.k] || p.k})),
        {title: 'Share of the differences in answer time'}
      ) +
        anTable(
          ['Differences between', '#Share'],
          a.shares.map(
            (p, i) => `<tr><td><span class="adm-an-key s${i}"></span>${esc(AN_PART[p.k] || p.k)}</td><td class="n">${pc(p.share)}</td></tr>`
          )
        ) +
        `<p class="note">Typical answer: ${anSec(anTyp(a).s)}</p>`
    ),
    anCard(
      'Seconds to answer, by genus',
      forest(
        a.genus.map(g => ({
          label: g.k,
          est: anS(a, g.u),
          lo: anS(a, g.lo),
          hi: anS(a, g.hi),
          title: `${g.k}: about ${anSec(anS(a, g.u))} (${g.n} answers)`
        })),
        {nul: anTyp(a).s, tf: anSec, title: 'Seconds to answer a typical photo of each genus'}
      ),
      'wide'
    ),
    anCard(
      'Seconds to answer, by player',
      anTable(
        ['Player', '#Answers', '#Typical time', '#Likely between'],
        anLive(a.player).map(
          (p, i) =>
            `<tr><td>${anWho(p.k, i)}</td><td class="n">${anInt(p.n)}</td><td class="n">${anSec(anS(a, p.u))}</td><td class="n">${anSec(anS(a, p.lo))} – ${anSec(anS(a, p.hi))}</td></tr>`
        )
      )
    ),
    a.photos && a.photos.length
      ? anCard(
          'Slowest and fastest photos',
          anThumbs(a.photos, x => `${anSec(anS(a, x.u))} · ${anInt(x.n)} answers`),
          'wide'
        )
      : ''
  ],
  zoom: a => [
    anCard(
      'Players',
      anTable(
        [
          'Player',
          '#Answers',
          '#Photos enlarged',
          '#Right, enlarged',
          '#Right, not enlarged',
          '#Against expected, enlarged',
          '#Against expected, not'
        ],
        anLive(a.player).map(
          (p, i) =>
            `<tr><td>${anWho(p.k, i)}</td><td class="n">${p.n}</td><td class="n">${pc(p.z / p.n)}</td><td class="n">${p.z ? pc(p.yz / p.z) : '–'}</td><td class="n">${pc(p.y0 / Math.max(1, p.n - p.z))}</td><td class="n">${p.z ? anPts((p.yz - p.ez) / p.z) : '–'}</td><td class="n">${anPts((p.y0 - p.e0) / Math.max(1, p.n - p.z))}</td></tr>`
        )
      ),
      'wide'
    ),
    anCard(
      'How often each view is enlarged',
      anTable(
        ['View shown', '#Answers', '#Enlarged'],
        a.views.map(
          v =>
            `<tr><td>${esc({wide: 'Colony', medium: 'Close-up', macro: 'Corallites', multi: 'Several views'}[v.k] || v.k)}</td><td class="n">${v.n}</td><td class="n">${pc(v.z / v.n)}</td></tr>`
        )
      )
    )
  ],
  photo: a => {
    const T = anTyp(a),
      right = d => anPc(ANALYSIS.shiftP(T.p, T.g, -d)),
      tab = (t, L) =>
        anCard(
          t,
          anTable(
            [t, '#Answers', '#Photos', '#Right'],
            L.map(
              r =>
                `<tr><td>${esc(r.label)}</td><td class="n">${anInt(r.n)}</td><td class="n">${r.ph}</td><td class="n">${pc(r.y / r.n)}</td></tr>`
            )
          )
        );
    return [
      tab('View', a.views),
      tab('Source', a.sources),
      tab('Quality', a.quality),
      anCard(
        'Harder than their view, quality and source say',
        anThumbs(a.harder, x => `${right(x.d)} right · ${anInt(x.n)} answers`),
        'wide'
      ),
      anCard(
        'Easier than their view, quality and source say',
        anThumbs(a.easier, x => `${right(x.d)} right · ${anInt(x.n)} answers`),
        'wide'
      )
    ];
  },
  fmt: a => [
    anCard(
      'Success of a pure guess: measured (dot) against the app’s value (diamond)',
      dotRange(
        a.table
          .filter(r => r.fit)
          .map(r => {
            const e = (a.effects || []).find(x => x.k === 'g_' + r.k) || {},
              P = e.k ? anPlain('fmt', e, a) : {tone: 'thin', text: ''};
            return {label: ANALYSIS.FMT_PLAIN[r.k] || r.label, est: e.est, lo: e.lo, hi: e.hi, ref: r.g0, tone: P.tone, title: P.text};
          }),
        {tf: anPc, clamp: [0, 1], title: 'Success of a pure guess, by question format'}
      ),
      'wide'
    ),
    anCard(
      'Question formats',
      anTable(
        ['Format', '#Answers', '#Right', '#App expected', '#App’s guess rate', '#Measured guess rate', '#Right − expected'],
        a.table.map(
          r =>
            `<tr><td>${esc(ANALYSIS.FMT_PLAIN[r.k] || r.label)}</td><td class="n">${anInt(r.n)}</td><td class="n">${r.n ? pc(r.right) : '–'}</td><td class="n">${r.n ? pc(r.E) : '–'}</td><td class="n">${r.n ? pc(r.g0) : '–'}</td><td class="n">${r.fit ? pc(r.fit.c) : '–'}</td><td class="n">${r.n ? anPts(r.right - r.E) : '–'}</td></tr>`
        )
      ),
      'wide'
    )
  ],
  conf: a => [
    anMixMap(a),
    anCard(
      'Pairs most mixed up',
      anTable(
        [
          'Pair',
          '#Offered together',
          '#Mixed up',
          '#Rate',
          '#Colony',
          '#Close-up',
          '#Corallites',
          '#Several views',
          '#Against a typical pair'
        ],
        a.pairs.map(p => {
          // times as often as a typical pair at the typical mix-up rate, from the pair's odds ratio (Codex review #495)
          const fr = u => ANALYSIS.freqRatio(anTyp(a).p, u),
            v = k => (p.v[k] ? `${pc(p.v[k][1] / p.v[k][0])} <small class="adm-an-ci">${p.v[k][0]}</small>` : '–');
          return `<tr><td>${p.k
            .split('|')
            .map(g => `<i>${esc(g)}</i>`)
            .join(
              ' · '
            )}</td><td class="n">${p.off}</td><td class="n">${p.mix}</td><td class="n">${pc(p.mix / p.off)}</td><td class="n">${v('wide')}</td><td class="n">${v('medium')}</td><td class="n">${v('macro')}</td><td class="n">${v('multi')}</td><td class="n" title="How many times as often as a typical pair, at the typical mix-up rate">×${fr(p.u).toFixed(1)} <small class="adm-an-ci">×${fr(p.lo).toFixed(1)} – ×${fr(p.hi).toFixed(1)}</small></td></tr>`;
        })
      ),
      'wide'
    ),
    anCard(
      'Each player against everyone’s rates',
      forest(
        anLive(a.player).map((p, i) => ({
          label: (anWho(p.k, i).match(/>([^<]*)</) || [])[1] || `P${i + 1}`,
          est: p.oe,
          lo: p.lo,
          hi: p.hi,
          title: `${p.mix} mixed up where everyone’s rates expect ${p.exp.toFixed(1)}`
        })),
        {nul: 1, tf: v => '×' + v.toFixed(1), title: 'Mix-ups: how many times as many as everyone’s rates expect, by player'}
      ) +
        anTable(
          ['Player', '#Chances', '#Mixed up', '#Expected from everyone', '#Times as many'],
          anLive(a.player).map(
            (p, i) =>
              `<tr><td>${anWho(p.k, i)}</td><td class="n">${p.n}</td><td class="n">${p.mix}</td><td class="n">${p.exp.toFixed(1)}</td><td class="n">×${p.oe.toFixed(1)}<small class="adm-an-ci">×${p.lo.toFixed(1)} – ×${p.hi.toFixed(1)}</small></td></tr>`
          )
        ),
      'wide'
    )
  ],
  learn: a => [
    anWright(a),
    anSkill(a),
    anCard(
      'Right answers with practice on the genus',
      lines(
        [
          {label: 'Players', pts: a.curve.map(b => [b.lo, b.right, b.n]), dots: true},
          {label: 'Fitted curve', pts: a.curve.map(b => [b.lo, b.fit]), dash: true}
        ],
        {xlog: true, xlab: 'Answers already given on the genus', xticks: a.curve.map(b => b.lo), title: 'Right answers with practice'}
      ) +
        anTable(
          ['Answers already given', '#Answers', '#Right', '#Fitted'],
          a.curve.map(
            b =>
              `<tr><td>${b.lo === b.hi ? b.lo : b.hi > 1e8 ? b.lo + '+' : `${b.lo}–${b.hi}`}</td><td class="n">${anInt(b.n)}</td><td class="n">${pc(b.right)}</td><td class="n">${pc(b.fit)}</td></tr>`
          )
        ),
      'wide'
    ),
    anCard(
      'Answers needed to reach 80% beyond guessing, by genus',
      forest(
        a.genus.map(g => ({
          label: g.k,
          est: Math.log(1 + Math.min(g.est, 999)),
          lo: Math.log(1 + Math.min(g.lo, 999)),
          hi: Math.log(1 + Math.min(g.hi, 999)),
          title: `${g.k}: about ${anInt(g.est)} answers (likely ${anInt(g.lo)} to ${g.hi >= 999 ? '999+' : anInt(g.hi)})`
        })),
        {nul: 0, tf: v => anInt(Math.exp(v) - 1), title: 'Answers needed to reach 80% beyond guessing, by genus'}
      ) +
        anTable(
          ['Genus', '#Answers', '#Players', '#Right', '#Answers to 80% beyond guessing', '#Likely between'],
          a.genus.map(
            g =>
              `<tr><td><i>${esc(g.k)}</i></td><td class="n">${g.n}</td><td class="n">${g.players}</td><td class="n">${pc(g.right)}</td><td class="n">${g.est >= 999 ? '999+' : anInt(g.est)}</td><td class="n">${anInt(g.lo)} – ${g.hi >= 999 ? '999+' : anInt(g.hi)}</td></tr>`
          ),
          'tall'
        ),
      'wide'
    )
  ],
  back: a => [
    anCard(
      'Right after a break, by its length',
      lines(
        [
          {label: 'Players', pts: a.bands.map((b, i) => [i, b.right, b.n]).filter((p, i) => a.bands[i].n), dots: true},
          {label: 'App expected', pts: a.bands.map((b, i) => [i, b.E]).filter((p, i) => a.bands[i].n), dash: true}
        ],
        {
          xticks: a.bands.map((b, i) => i),
          xf: i => (a.bands[i] ? a.bands[i].label.replace(' – ', '–') : ''),
          xmin: 0,
          xmax: a.bands.length - 1,
          title: 'Right answers after a break'
        }
      ) +
        anTable(
          ['Time since the last answer on the genus', '#Answers', '#Right', '#App expected now', '#App expected before the break'],
          a.bands.map(
            b =>
              `<tr><td>${esc(b.label)}</td><td class="n">${anInt(b.n)}</td><td class="n">${b.n ? pc(b.right) : '–'}</td><td class="n">${b.n ? pc(b.E) : '–'}</td><td class="n">${b.n ? pc(b.prevE) : '–'}</td></tr>`
          )
        ),
      'wide'
    )
  ],
  sess: a => [
    anCard(
      'Sessions still going after n answers',
      lines([{label: 'Sessions still going', pts: a.km.map(k => [k.n, k.s]), step: true}], {
        xlab: 'Answers in the session',
        title: 'Sessions still going after n answers'
      }) +
        anTable(
          ['After', '#Still going'],
          a.at
            .map(x => `<tr><td>${x.k} answers</td><td class="n">${pc(x.s)}</td></tr>`)
            .concat(`<tr><td>Half the sessions end by</td><td class="n">${a.median ? a.median + ' answers' : '–'}</td></tr>`)
        ),
      'wide'
    ),
    ...(a.desc ? anSessDesc(a.desc) : [])
  ]
};
// A y range around the values (10 points of margin, within 0-100%), so a flat line still shows its changes.
const anYr = V => {
  const L = V.filter(v => v != null && isFinite(v));
  return L.length
    ? {ymin: Math.max(0, Math.floor((Math.min(...L) - 0.1) * 10) / 10), ymax: Math.min(1, Math.ceil((Math.max(...L) + 0.1) * 10) / 10)}
    : {};
};
// Sessions in figures (analysis.js sessDesc; the study of 2026-11-04): counts and means, in words.
const anOf = (k, n) => (n ? `${k} of ${n} (${pc(k / n)})` : '–');
function anSessDesc(d) {
  d = {...d, table: anLive(d.table, 'p')};
  const ids = [...new Set(d.table.map(s => s.p))].sort(),
    who = id => anWho(id, ids.indexOf(id)),
    modes = md =>
      Object.entries(md)
        .filter(([, v]) => v)
        .map(([k, v]) => `${{quiz: 'quiz', duel: 'duel', typed: 'typed', custom: 'custom'}[k]} ${v}`)
        .join(' · '),
    dots = t => [...String(t)].map(c => (c === '1' ? '<b class="adm-an-v t-good">●</b>' : '<b class="adm-an-v t-bad">○</b>')).join(''),
    E = d.ends;
  const posLab = b => (b.hi == null ? `${b.lo}+` : `${b.lo}–${b.hi}`),
    fifth = ['First fifth', 'Second fifth', 'Middle fifth', 'Fourth fifth', 'Last fifth'],
    endLab = ['Last 3 answers', '4th to 10th from the end', '11th to 20th from the end'];
  const binRow = (lab, b) =>
    `<tr><td>${lab}</td><td class="n">${anInt(b.n)}</td><td class="n">${pc(b.right)}</td><td class="n">${pc(b.E)}</td><td class="n">${anPts(b.oe)}${b.lo != null ? `<small class="adm-an-ci">${anPts(b.lo)} to ${anPts(b.hi)}</small>` : ''}</td></tr>`;
  return [
    anCard(
      'Sessions in figures',
      anTable(
        ['', '#'],
        [
          `<tr><td>Sessions</td><td class="n">${anInt(d.sessions)}</td></tr>`,
          `<tr><td>Players</td><td class="n">${anInt(d.players)}</td></tr>`,
          `<tr><td>Typical session</td><td class="n">${anInt(d.len.answers)} answers, ${anInt(d.len.min)} min</td></tr>`
        ]
      )
    ),
    anCard(
      'When sessions start (Manila time)',
      bars(d.hours, {
        lf: i => String(i).padStart(2, '0') + 'h',
        xlab: 'Hour the session starts',
        title: 'Sessions by starting hour, Manila time'
      }),
      'wide'
    ),
    anCard(
      'Right answers along a session',
      lines(
        [
          {label: 'Players', pts: d.fifths.map((b, i) => [i, b.right, b.n]).filter((p, i) => d.fifths[i].n), dots: true},
          {label: 'App expected', pts: d.fifths.map((b, i) => [i, b.E]).filter((p, i) => d.fifths[i].E != null), dash: true}
        ],
        {
          xticks: [0, 1, 2, 3, 4],
          xf: i => ['Start', '', 'Middle', '', 'End'][i] ?? '',
          xmin: 0,
          xmax: 4,
          ...anYr(d.fifths.flatMap(b => [b.right, b.E])),
          title: 'Right answers along a session (sessions of 20 answers or more)'
        }
      ) +
        anTable(
          ['Part of the session', '#Answers', '#Right', '#App expected', '#Right − expected'],
          d.fifths.map((b, i) => binRow(fifth[i], b)).concat(d.fromEnd.map((b, i) => binRow(endLab[i], b)))
        ) +
        anTable(
          ['Answer number in the session', '#Quiz answers', '#Typical time'],
          d.secs.map(b => `<tr><td>${posLab(b)}</td><td class="n">${anInt(b.n)}</td><td class="n">${anSec(b.s)}</td></tr>`)
        ),
      'wide'
    ),
    anCard(
      'How sessions end',
      anTable(
        ['Sessions that ended', '#'],
        [
          `<tr><td class="an-w">On a wrong answer</td><td class="n">${anOf(E.miss, E.sessions)}</td></tr>`,
          `<tr><td class="an-w">Wrong answers overall, for comparison</td><td class="n">${pc(E.missRate)}</td></tr>`,
          `<tr><td class="an-w">On 2 or more misses in a row</td><td class="n">${anOf(E.miss2, E.sessions)}</td></tr>`,
          `<tr><td class="an-w">On a genus met for the first time</td><td class="n">${anOf(E.lastNew, E.sessions)}</td></tr>`,
          `<tr><td class="an-w">First meetings overall, for comparison</td><td class="n">${pc(E.newRate)}</td></tr>`,
          `<tr><td class="an-w">Last answer’s game</td><td class="n">${esc(modes(E.lastMode)) || '–'}</td></tr>`
        ]
      )
    ),
    anCard(
      'After a break: the end of a session against the start of the next',
      anTable(
        ['Break', '#Pairs', '#Right, last 10 before', '#Right, first 10 after', '#App expected before', '#App expected after'],
        d.gaps.map(
          g =>
            `<tr><td>${esc(g.label)}</td><td class="n">${g.n}</td><td class="n">${pc(g.before)}</td><td class="n">${pc(g.after)}</td><td class="n">${pc(g.Eb)}</td><td class="n">${pc(g.Ea)}</td></tr>`
        )
      )
    ),
    anCard(
      'Players coming back',
      anTable(
        ['After their', '#Players', '#Came back'],
        d.returns.map(
          r =>
            `<tr><td>${['', '1st', '2nd', '3rd'][r.k]} session</td><td class="n">${r.at}</td><td class="n">${anOf(r.back, r.at)}</td></tr>`
        )
      ) + '<p class="note">A session that ended less than a day ago is not counted yet, either way.</p>'
    ),
    anCard(
      'First session against later ones',
      anTable(
        ['Session', '#Sessions', '#Typical answers', '#Typical minutes', '#Right', '#Right − expected', '#New genera'],
        d.first.map(
          (g, i) =>
            `<tr><td>${['First', 'Second', 'Third and later'][i]}</td><td class="n">${g.sessions}</td><td class="n">${g.answers == null ? '–' : anInt(g.answers)}</td><td class="n">${g.min == null ? '–' : anInt(g.min)}</td><td class="n">${pc(g.right)}</td><td class="n">${anPts(g.oe)}</td><td class="n">${g.newg == null ? '–' : anInt(g.newg)}</td></tr>`
        )
      ),
      'wide'
    ),
    anCard(
      'Every session',
      anTable(
        [
          'Player',
          'Start',
          '#Minutes',
          '#Answers',
          'Games',
          '#Right',
          '#Right − expected',
          '#New genera',
          'Last 3',
          '#Hours since the previous'
        ],
        d.table.map(
          s =>
            `<tr${s.open ? ' class="me" title="Still going"' : ''}><td>${who(s.p)} <small class="note">#${s.k}</small></td><td>${dateText(s.t0, 'dmhm')}</td><td class="n">${s.min}</td><td class="n">${s.n}</td><td>${esc(modes(s.md))}</td><td class="n">${pc(s.right)}</td><td class="n">${anPts(s.oe)}</td><td class="n">${s.newg}</td><td>${dots(s.tail)}</td><td class="n">${s.gap == null ? '–' : s.gap}</td></tr>`
        ),
        'tall'
      ),
      'wide',
      false
    )
  ];
}

/* ---------- The page ---------- */
function renderAnalyses() {
  status();
  if (!ANREP) {
    $v.innerHTML = '<p class="note">Loading…</p>';
    anLoad().then(() => anPage(cur) && render());
    return;
  }
  if (TOKEN && !USERS) loadUsers().then(() => anPage(cur) && ANREP && render());
  // The answer log too: anLive tells the devices never signed in from the removed accounts with it (Codex review #600).
  anAnsLoad();
  const rep = anRep(),
    key = anKey(cur);
  const local = AN.src === 'local' && ANLOC && ANLOC.rep;
  const recompute = `<button type="button" class="linkish adm-an-re" data-anre>${ANLOC && ANLOC.prog ? esc(ANLOC.prog) : 'Recompute here'}</button>${
    ANLOC && ANLOC.rep
      ? `<button type="button" class="linkish adm-an-re" data-ansrc="${local ? 'sheet' : 'local'}">${local ? 'Stored report' : 'This tab’s'}</button>`
      : ''
  }`;
  if (!rep) {
    const why = ANREP.st === 'err' ? esc(ANREP.err) : 'No report yet';
    $v.innerHTML = `<section class="adm-an"><div class="adm-shead"><span class="note">${why}</span>${recompute}</div></section>`;
    return anBind();
  }
  const M = anM(rep),
    R = rep.R[M],
    now = local ? rep.answers : ANREP.answers || rep.answers,
    lastM = anRound(rep).slice(-1)[0] || 0,
    since = now - lastM,
    nextM = lastM + ANALYSIS.STEP;
  // the newest round milestones (the newest selected by default), and Recompute here's look at all the answers
  const seg = `<span class="adm-qseg adm-sseg" role="group" aria-label="Milestone">${anRound(rep)
    .slice(-5)
    .concat(rep.live ? [rep.live] : [])
    .map(m => {
      const v = anMv(rep, m);
      return `<button type="button" data-anm="${v}" aria-pressed="${M === m}">${v === 'now' ? `now (${anInt(m)} answers), this tab only` : m / 1000 + 'k'}</button>`;
    })
    .join('')}</span>`;
  // the answers since the newest milestone; the next one is due within the hour once the log reaches it (the Action's run)
  const badge = `<span class="adm-src adm-an-badge" title="${esc(`${anInt(now)} answers in the log; a milestone every ${anInt(ANALYSIS.STEP)}: ${anInt(ANALYSIS.STEP)}, ${anInt(2 * ANALYSIS.STEP)}, ${anInt(3 * ANALYSIS.STEP)}…`)}">${
    lastM ? `${anInt(since)} since ${anInt(lastM)} · ` : ''
  }${now >= nextM ? `${anInt(nextM)} due within the hour` : `next at ${anInt(nextM)}`}</span>`;
  const made = `<span class="note adm-an-made" title="${esc(local ? 'Recomputed in this tab' : 'Stored report')}">${local ? 'This tab' : dateText(rep.made, 'dmhm')}</span>`;
  AN_CARDS = [];
  const body = key ? anView(key, rep, R) : anOverview(rep, R);
  $v.innerHTML = `<section class="adm-an"><div class="adm-shead">${seg}${badge}${made}${recompute}</div>${anControls()}${anJump()}${body}</section>`;
  anBind();
}
function anBind() {
  $v.querySelectorAll('[data-anm]').forEach(
    b =>
      (b.onclick = e => {
        e.preventDefault();
        AN.m = b.dataset.anm;
        anSave();
        if (b.tagName === 'A' && cur !== 'analyses/overview') location.hash = '#analyses/overview';
        render();
      })
  );
  $v.querySelectorAll('[data-zf]').forEach(b => (b.onclick = () => zoom(b.dataset.g, b.dataset.zf)));
  // show / sort / the results with no clear verdict: redraw the page (the card whose control was tapped stays where it was
  // on screen); a folded card: fold or open it at once (no redraw), remembered per page
  $v.querySelectorAll('[data-anf],[data-ans],[data-anmore]').forEach(
    b =>
      (b.onclick = () => {
        const p = anPref(),
          card = b.closest('.adm-an-card'),
          top = card && card.getBoundingClientRect().top;
        if (b.dataset.anf) p.f = b.dataset.anf;
        else if (b.dataset.anmore) p.more[b.dataset.anmore] = !p.more[b.dataset.anmore];
        else p.s = b.dataset.ans;
        anPrefSave();
        render();
        const again = card && document.getElementById(card.id);
        if (again) scrollBy(0, again.getBoundingClientRect().top - top);
      })
  );
  // the mix-up map on a phone: a family's band opens its block (Enter or Space too), remembered per page
  $v.querySelectorAll('[data-anfam]').forEach(g => {
    const go = () => {
      const card = g.closest('.adm-an-card'),
        top = card && card.getBoundingClientRect().top;
      anPref().mfam = Number(g.dataset.anfam);
      anPrefSave();
      render();
      const again = card && document.getElementById(card.id);
      if (again) scrollBy(0, again.getBoundingClientRect().top - top);
    };
    g.addEventListener('click', go);
    g.addEventListener('keydown', e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), go()));
  });
  $v.querySelectorAll('[data-anfold]').forEach(
    b =>
      (b.onclick = () => {
        const sec = b.closest('.adm-an-card'),
          open = sec.classList.toggle('folded') === false;
        b.setAttribute('aria-expanded', String(open));
        anPref().open[b.dataset.anfold] = open;
        anPrefSave();
      })
  );
  $v.querySelectorAll('[data-anjump]').forEach(
    b =>
      (b.onclick = () => {
        const sec = document.getElementById('anc-' + b.dataset.anjump);
        if (!sec) return;
        if (sec.classList.contains('folded')) sec.querySelector('[data-anfold]').click();
        sec.scrollIntoView({behavior: 'smooth', block: 'start'});
      })
  );
  $v.querySelectorAll('[data-ansrc]').forEach(
    b =>
      (b.onclick = () => {
        AN.src = b.dataset.ansrc;
        render();
      })
  );
  const re = $v.querySelector('[data-anre]');
  if (re) re.onclick = () => anRecompute();
}
// Recompute here (secondary, on any device, phones included: Pierre, 2026-11-05): the same module in a Web Worker on this
// page's answer log, so the page stays responsive while it runs and the button shows its progress; the stored report's
// milestones are reused when their answers are the same. Kept in this tab only, never sent anywhere.
function anRecompute() {
  if (ANWORK) return;
  ANLOC = {prog: 'Reading the answers…'};
  render();
  const go = () => {
    const rows = (ANS && ANS.rows) || [];
    const meta = {ph: ANALYSIS.photoMeta(DATA, DRAFT, {q: AUTOQ}, {m: METRICS})};
    const src = (document.querySelector('script[src^="analysis.js"]') || {}).getAttribute?.('src') || 'analysis.js';
    try {
      ANWORK = new Worker(src);
    } catch (e) {
      ANLOC = {prog: 'No worker'};
      return render();
    }
    ANWORK.onmessage = e => {
      const d = e.data || {};
      if (d.prog) {
        ANLOC = {prog: `${anInt(d.prog[0])}: ${anTitle(d.prog[1])}…`};
        const b = $v.querySelector('[data-anre]');
        if (b) b.textContent = ANLOC.prog;
        return;
      }
      ANWORK.terminate();
      ANWORK = null;
      ANLOC = d.res ? {rep: d.res} : {prog: 'Failed'};
      if (d.res) AN.src = 'local';
      if (anPage(cur)) render();
    };
    // 199 draws with normal intervals from their spread (analysis.js boot): the newest milestone and the look at all the
    // answers (live) in a few minutes here, where the Action's 999 percentile draws would take about 5 times as long;
    // earlier milestones not reused from the stored report keep the model's own interval only
    ANWORK.postMessage({id: 1, rows, meta, B: 199, Bh: 0, bse: 1, seed: 1, prev: ANREP && ANREP.rep, live: 1});
  };
  (ANS && ANS.rows && ANS.rows.length ? Promise.resolve() : loadStats()).then(go);
}
// The charts are drawn at the page's width: draw again when it changes.
let anRz = null;
addEventListener('resize', () => {
  clearTimeout(anRz);
  anRz = setTimeout(() => anPage(cur) && render(), 200);
});

// Help ("?"), per view: the definitions and the methods stay off the page (rule A2).
const AN_HELP_COMMON = `<p><b>How to read the charts.</b> Each bar is one result: how much it changes the outcome named above the chart (the chance of a right answer, the time to answer, the chance to end the session, the chance to mix up genera) from its typical value, for a typical player and photo; its value is on the right. Coloured by verdict (green helps, red hurts, blue clear but neither good nor bad, grey no clear effect, dashed outline not enough data yet); the thin line is its likely range. Only the clear results show at first: the button under a chart or table shows the others there (no clear effect, too early to tell), in the same order. <b>Show</b> keeps only the clear results, what helps, what hurts or what still lacks data (all of these). <b>Sort</b>, above every chart and table: <b>Most negative first</b> or <b>Most positive first</b> (by the signed change: a chance in points, a time as the share of time gained or lost; spreads after the changes, by size), <b>By topic</b> (Overview: a sub-heading per analysis, the analyses in the menu's order, by the signed change inside each) or <b>By name</b>; on the Overview each result's topic (the analysis it comes from) is the grey line under its name. A tap on a card's title folds it; the chips under them jump to a card. These choices are kept per page, in this browser only. The words, the tables and the results over time are folded by default: tap to open.</p>
  <p><b>How to read a result.</b> Each line compares two situations (<i>Compared</i>) and says which way the result goes and by how much, for a typical player on a typical photo: "More likely wrong: about 62% right instead of 75%" means a typical player who gets 75% right would get about 62% right in that situation. <b>Likely</b>: the range the true value lies in, with 95% confidence (a 95% interval). <b>Verdicts</b>: ▲ <b>Helps</b> (more right answers, fewer mix-ups, fewer stops), ▼ <b>Hurts</b> (the opposite), ● <b>Clear</b> (a clear result that is neither good nor bad: answer time, or how far the app's own estimate is off), – <b>No clear effect</b> (the range is narrow and close to no change: if there is an effect, it is small), … <b>Not enough data yet</b> (the range is too wide to say; hover for the answers it would need). <b>→</b> what a clear result suggests for the app. <b>How much they differ</b>: how far apart players (or genera, photos, pairs) are, as the range a typical one falls in (two in three fall inside it).</p>
  <p><b>Many results at once.</b> With some 40 results per milestone, a few would look clear by chance alone, so the verdicts are corrected for it. Each analysis names the one or two questions it exists to answer, chosen before any result was seen (tagged <b>primary</b>, ${Object.values(ANALYSIS.PRIMARY).flat().length} in all): they are judged together, so that the chance of even one of them reading clear by chance stays under 5% (Holm's method). Every other result is <b>exploratory</b>: judged together, so that among those reading clear, about 1 in 20 at most is chance (Benjamini-Hochberg, false discovery rate 5%); an exploratory result that reads clear is tagged: a lead to check on later answers before acting on it. The likely range shown is still the plain 95% one, so a range that leaves out "no change" can still read "Not enough data yet" once corrected. Hover a verdict for its adjusted p (and the unadjusted one). <b>Milestones</b> are further looks at the same growing log, not new studies: a result that turns clear at one milestone is not a new finding; read the latest.</p>
  <p><b>Where it comes from.</b> A GitHub Action (tools/analyses.js) reads the answer log from the sync sheet every hour and, once the log reaches the next round thousand (or the code changed), redoes every analysis on the first 1000, 2000, 3000, … answers in time order (the milestones: round thousands only), then stores the report in the sheet (private). This page only draws it. The switch picks a milestone, the newest by default; the badge says how many answers came since it and when the next one comes. <b>Recompute here</b> runs the same code in this tab, on any device (phone included; its progress shows on the button), and its result stays in this tab; it adds a look at all the answers so far, <b>now (N answers), this tab only</b>, never stored. <b>As the answers came in</b>: each result and its likely range at every milestone.</p>
  <p><b>Effects hard to tell apart</b> (folded, under each analysis's charts). Two results whose estimates are strongly correlated (r beyond ±0.6) cannot be told apart well by the data: when they are negatively correlated, one could be a bit higher and the other a bit lower with almost as good a fit, so each alone is fragile and their sum is sure; positively correlated, both could be higher (or lower) together, so their difference is sure. It is a property of the estimates (from the model's own covariance), not a link between the two in the world. <b>Conditions in the answers</b>: how often two situations come together in the answers (beyond ±0.7, worth knowing); <b>VIF</b>: how much of a condition the other conditions of the model predict (1 = none; beyond 5, entangled). Columns are numbered as the rows; in a cell, ▲ means the two go the same way, ▼ opposite ways.</p>
  <p><b>Method, for the curious.</b> Mixed models fitted on every answer (players, genera and photos as random effects, so a genus with few answers is pulled towards the average); right / wrong as a logistic model above each question's guess rate; time on a log scale. Each effect is turned into the change it makes for a typical player and photo (the share of right answers, the median time, the share of stops in the data). 95% ranges: the wider of the model's own and a bootstrap over players (from 6 players; 999 draws for the latest milestone of the stored report, 199 for earlier ones; Recompute here: 199 draws, read from their spread). "No clear effect" = the range fits inside the smallest change that would matter (10% of time; 0.25 on the log-odds scale, about 5 points of right answers near 75%; 5 points).</p>`;
Object.assign(HELP, {
  an: `<p><b>Overview.</b> What the data says clearly, in one list, then every result of every analysis, and the milestones (one per 1000 answers), kept as history: each is another look at the same growing log, not a new finding.</p>${AN_HELP_COMMON}`,
  'an-rt': `<p><b>Answer time.</b> Seconds from the moment the photos are in view to the answer (0-600 s). Each line says how much faster or slower answers are in one situation than a typical answer, the others held equal: right against wrong answers, typed against picked, a photo enlarged, 2 choices against 4, a question the app rates harder, later in a session. <b>What makes answer times differ</b>: how much of the differences in time come from who answers (players), from the genus, from the photo, and from one time to the next. By genus and by player: the typical time, after pulling those with few answers towards the average.</p>${AN_HELP_COMMON}`,
  'an-zoom': `<p><b>Enlarging photos.</b> Is an answer more often right when the player enlarged a photo first, compared with the same player not enlarging, beyond what the app expected? And are players who enlarge often better or worse? Players: how often each enlarges, right when enlarging or not, and right answers against the app's expectation. Since 2026-11-03 20:24 the enlarge button is visible: compare milestones after it.</p>${AN_HELP_COMMON}`,
  'an-photo': `<p><b>What makes a photo hard.</b> The chance of a right answer for each feature of the photos shown (view, quality, sharpness, source, one view alone), against the reference in brackets, the player's level, the genus and the photo itself held equal. Quality: Pierre's rating, else the automatic one. <b>Harder / easier than their view, quality and source say</b>: the photos whose own difficulty is furthest from what their features predict (click to enlarge): maybe a wrong label, a misleading colony, or a great photo.</p>${AN_HELP_COMMON}`,
  'an-fmt': `<p><b>Question formats.</b> For each format (4 choices; 4 choices with one or two easy to rule out; Again after a miss; duels; the exam; typed answers): the success of a pure guess as measured, against the value the app uses (¼ with 4 choices, ½ with 2, 0 typed); whether players find it easier or harder than the app expects, beyond guessing (the format's own guess rate set aside); and the plain gap, right answers minus what the app expected, in points. A guess rate is measured on the weakest answers, so its range stays wide until there are many.</p>${AN_HELP_COMMON}`,
  'an-conf': `<p><b>Genera mixed up.</b> Each wrong genus offered as a choice is a chance to be picked (typed answers left out). The chance to pick it, by the view shown (against a colony photo), the pair of genera and the player held equal. <b>Pairs most mixed up</b>: offered together, mixed up, the rate by view shown (answers under it), and how many times as often as a typical pair (at the typical mix-up rate: the model's odds ratio turned into a ratio of chances). <b>Each player against everyone's rates</b>: the player's mix-ups divided by what everyone's rates for the same pairs, views and choices predict (×1 = like everyone).</p><p><b>Mix-up map.</b> Which genera form families of mix-ups. Two genera are close when their pair is clearly mixed up more often than a typical pair, per offer (the lower end of its likely range, so chance alone makes no family); genera are grouped by average distance and a family is a group whose pairs are, on average, at least a fifth as close as the closest pair. Rows: the genus shown; columns: the genus answered instead, both in the tree's order, so families sit as blocks on the diagonal (dashed). Colour: the rate per offer, pulled towards the pair's own rate when offers are few, against a typical pair's (blank: never offered together). Outlined: look-alikes named on a genus sheet; a family with no outline is one the sheets do not name. <b>Mixed up across families</b>: the cells most mixed up between two families, worth a look at their photos. On a phone the tree is a list: tap a family's band for its block and its numbers. Only genera mixed up at least once are on the map.</p>${AN_HELP_COMMON}`,
  'an-learn': `<p><b>Learning with practice.</b> How the chance of a right answer grows with the answers already given on a genus, and the effect of the next question after a miss, of "Again" after that miss, of typed answers, exam and comeback questions, the player and the genus held equal. <b>Answers needed to reach 80% right</b> (beyond guessing, the app's target), for a typical player, by genus. The first-meeting card and the side-by-side comparison leave no row in the answer log: they cannot be measured yet (ROADMAP).</p>${AN_HELP_COMMON}`,
  'an-back': `<p><b>After a break.</b> Answers on a genus the player last answered right: how the chance of a right answer falls with the time since (a week against a day), against what the app expected then; and the comeback questions after a break: right answers against the app's expected chance (its forgetting curve, model.js comebackOf). By length of the break: answers, right, the app's expectation now and before the break.</p>${AN_HELP_COMMON}`,
  'an-sess': `<p><b>Sessions</b> (a player's answers less than 30 minutes apart). <b>Sessions still going after n answers</b>: a session still open at the end of the log counts only as far as it went. <b>What changes the result</b>: the chance to end the session right after an answer, depending on that answer (wrong, the second miss in a row or more, a question the app rates harder, a slow answer for that player) and on how far into the session it comes.</p>${AN_HELP_COMMON}`,
  'an-who': `<p><b>Player profiles</b> (Pierre, 2026-11-05): how each player plays, as a picture of these players, not types (named types only from about 30 players, when groups can be checked). Each profile uses the player's last 300 answers (all of them when fewer); under 100 answers the row is greyed and left out of the tree, the map and the groups. Each behaviour is net of what the app decided (it picks the genus, the photo, the format and the difficulty from the level): <b>Time</b>, the player's own effect on answer time once right or wrong, format, difficulty, genus and photo are held equal; <b>Zoom</b>, photos enlarged against what everyone's rates for the views shown predict; <b>Right+</b>, right answers against the app's expected chance; <b>Stops</b>, the extra chance to end a session after 2 or more misses in a row, against after other answers; <b>Session</b>, the typical answers a session; <b>Weekly</b>, sessions a week; <b>Evening</b>, the share of answers from 17:00 to midnight, Manila time. The learning slope joins once the Learning model fits one per player. <b>The heatmap</b>: each cell is how far the player is from the players' average, in standard deviations (above in colour, below in ink); rows ordered by Ward's tree (left), columns by how the behaviours go together; tap a name for the player's journey. <b>Groups</b>: the tree cut where the groups are most distinct (the silhouette); <b>stable</b> when each group is found again with a Jaccard of 0.75 or more in every run with one player left out, and on average when the players are drawn again with replacement (the bootstrap, Hennig 2007); stable is not the same as real. <b>Map of players</b>: a PCA of the behaviours: players as points, behaviours as arrows; players close together play alike; an arrow points to the players high in that behaviour; the % is the share of the spread each axis shows (with few players it overstates the structure). Shown only in the admin; names come from Players, the stored report has anonymous ids.</p>`
});
// Opened straight on an Analyses address: admin.js drew a placeholder before this file was in.
if (typeof DATA !== 'undefined' && DATA && anPage(cur)) render();
