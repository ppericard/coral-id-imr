/* ---------- Analyses (Pierre, 2026-11-04): multifactor analyses of the answer log, every 1000 answers ---------- */
// "I love this kind of multifactor report… every 1000 new answers… a new section in the admin with several sub-pages,
// with visualisations, reports, graphs, tables." The report is computed once, by a GitHub Action (tools/analyses.js,
// analysis.js), and stored in the sync sheet (v35, analysesGet); this page only draws it, so it opens at once on a
// phone. "Recompute here" (desktop, secondary) runs the same module in a Web Worker on this page's own answer log; its
// result stays in this tab. Loaded after admin.js, whose helpers it uses ($v, esc, store, TOKEN, SYNC_URL, loadStats,
// loadUsers, allPhotos, zoom, img, kpis). Views: GROUPS in admin.js; docs/ARCHITECTURE.md "Analyses"; the methods in
// docs/LEARNING.md "Multifactor analyses"; the chart helpers in docs/DESIGN.md "Admin charts".
const AN_V = 35; // sync script version with analysesGet (AGENTS.md 7a: before it, the page just has no stored report)
let ANREP = null, // {st: 'ok' | 'none' | 'old' | 'err', rep, answers, stored}
  ANLOC = null, // a report recomputed in this tab: {rep} once done, {prog} while running
  ANWORK = null;
const AN = Object.assign({m: 'all', src: 'sheet'}, store.get('reefid-admin-an', {}));
const anSave = () => store.set('reefid-admin-an', {m: AN.m});
// Views: [address, analysis key in the report, title]
const AN_VIEWS = [
  ['~an', null, 'Overview'],
  ['~an-rt', 'rt', 'Answer time'],
  ['~an-zoom', 'zoom', 'Enlarging photos'],
  ['~an-photo', 'photo', 'What makes a photo hard'],
  ['~an-fmt', 'fmt', 'Question formats'],
  ['~an-conf', 'conf', 'Genera mixed up'],
  ['~an-learn', 'learn', 'Learning with practice'],
  ['~an-back', 'back', 'After a break'],
  ['~an-sess', 'sess', 'Sessions']
];
const anKey = h => (AN_VIEWS.find(v => v[0] === h) || [])[1];
const anTitle = k => (AN_VIEWS.find(v => v[1] === k) || [])[2] || k;

function anLoad() {
  if (!TOKEN) return Promise.resolve((ANREP = {st: 'err', err: 'Needs the GitHub token'}));
  return fetch(SYNC_URL, {method: 'POST', body: JSON.stringify({analysesGet: 1, token: TOKEN})})
    .then(r => r.json())
    .then(j => {
      // A script before v35 answers 'input' to an unknown POST: no stored report, nothing else changes (AGENTS.md 7a).
      if (!j || (!j.ok && j.error === 'input') || (j.v && j.v < AN_V)) return (ANREP = {st: 'old', v: j && j.v});
      if (!j.ok) return (ANREP = {st: 'err', err: j.error === 'token' ? 'Token refused' : 'Not available'});
      let rep = null;
      try {
        rep = j.report ? JSON.parse(j.report) : null;
      } catch (e) {
        rep = null;
      }
      return (ANREP = {st: rep ? 'ok' : 'none', rep, answers: j.answers, stored: j.stored});
    })
    .catch(() => (ANREP = {st: 'err', err: 'Offline'}));
}
const anRep = () => (AN.src === 'local' && ANLOC && ANLOC.rep ? ANLOC.rep : ANREP && ANREP.rep);
// The milestone shown: 'all' = the latest (all the answers of the report), else a milestone of the report.
const anM = rep => (AN.m !== 'all' && rep.R[AN.m] ? Number(AN.m) : rep.M[rep.M.length - 1]);

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
// not enough data yet; "new" when it became clear at this milestone.
function anPill(P, e, fresh) {
  const t = AN_TONE[P.tone] || AN_TONE.thin,
    label = e.v === 'none' || e.v === 'nolog' ? P.verdict : t[1],
    need = e.v === 'thin' && e.need ? ` title="About ${anInt(e.need)} answers would settle it"` : '';
  return `<span class="adm-an-v t-${P.tone}"${need}>${t[0]} ${esc(label)}</span>${fresh ? ' <span class="adm-src new" title="Clear since the previous milestone">new</span>' : ''}`;
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

/* ---------- Page pieces ---------- */
const anCard = (t, body, cls = '') => `<section class="adm-scard${cls ? ' ' + cls : ''}"><h3>${t}</h3>${body}</section>`;
const anTable = (head, rows, cls = '') =>
  `<div class="adm-tscroll${cls === 'tall' ? ' tall' : ''}"><table class="adm-tbl${cls && cls !== 'tall' ? ' ' + cls : ''}"><thead><tr>${head.map(h => (h[0] === '#' ? `<th class="n">${h.slice(1)}</th>` : `<th>${h}</th>`)).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
// Player labels: the name from Players when this browser has it (the report keeps anonymous ids), else P1, P2… by order.
function anWho(id, i) {
  const u = ((USERS && USERS.users) || []).find(x => x.id === String(id).split('#')[0]);
  return u ? cut(u.name) : `<span class="adm-cut" title="${esc(id)}">P${i + 1}</span>`;
}
// The effects of one analysis: one dot-and-range chart per outcome (on the scale it is read on, labelled in words), then
// the table: what is compared, what it does (direction, size, likely range, what it suggests), the verdict. The spreads
// (how much players, genera, photos differ) get their own table, in words.
function anEffects(a, key, fresh) {
  const E = (a.effects || []).map(e => [e, anPlain(key, e, a), anSpec(key, e)]),
    main = E.filter(([e]) => !e.sd),
    sds = E.filter(([e]) => e.sd);
  const outs = [...new Set(main.filter(([e, P, S]) => P.val != null && e.v !== 'none' && S.o !== 'n').map(([, , S]) => S.o))];
  const plots = outs
    .map(o => {
      // a range the fit could not hold (wider than 20 on its own scale) stays in the table only
      const L = main.filter(([e, P, S]) => S.o === o && P.val != null && !(e.hi - e.lo > 20));
      if (!L.length) return '';
      const P0 = L[0][1],
        same = L.every(([, P]) => P.base === P0.base),
        pscale = P0.scale === 'p';
      return `<h4 class="adm-an-out">${esc(AN_OUT[o])}</h4>${dotRange(
        L.map(([e, P]) => ({
          label: P.name,
          est: P.val,
          lo: P.lo,
          hi: P.scale === 's' && P.hi > P.base * 10 ? P.base * 10 : P.hi,
          ref: same ? null : P.base,
          tone: P.tone,
          title: `${P.name}: ${P.text}`
        })),
        {
          tf: anTf(P0),
          nul: same ? P0.base : null,
          lab: o === 'pts' ? 'as the app expects' : o === 'guess' ? 'app' : 'typical',
          title: `${anTitle(key)}: ${AN_OUT[o]}`,
          ...(pscale ? {clamp: [0, 1]} : {})
        }
      )}`;
    })
    .join('');
  const row = ([e, P]) =>
    `<tr data-ek="${esc(key + ':' + e.k)}"><td class="an-c">${esc(P.name)}</td><td class="adm-an-says">${anSays(P)}</td><td class="an-v">${anPill(P, e, fresh.has(key + ':' + e.k))}</td></tr>`;
  const head = ['Compared', 'What it does', 'Verdict'];
  return (
    anCard('What changes the result', plots + anTable(head, main.map(row), 'adm-an-eff'), 'wide') +
    (sds.length ? anCard('How much they differ', anTable(['Between', 'In words', 'Verdict'], sds.map(row), 'adm-an-eff'), 'wide') : '')
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
  return anCard('As the answers came in', `<div class="adm-an-convs">${cells.join('')}</div>`, 'wide');
}
// Photo thumbnails that open the photo (Photo factors, Response time).
function anThumbs(L, val) {
  const by = new Map(allPhotos().map(p => [p.f, p]));
  return `<div class="adm-an-thumbs">${L.map(x => {
    const p = by.get(x.f);
    return `<figure>${p ? `<button type="button" class="adm-ph" data-zf="${esc(x.f)}" data-g="${esc(p.genus)}" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy"></button>` : `<span class="adm-ph"><code>${esc(x.f)}</code></span>`}<figcaption>${p ? `<i>${esc(p.genus)}</i> ` : ''}${val(x)}</figcaption></figure>`;
  }).join('')}</div>`;
}

/* ---------- Views ---------- */
function anOverview(rep, R, prevR) {
  const fresh = ANALYSIS.newly(R, prevR),
    all = Object.entries(R.A).flatMap(([k, a]) => (a.effects || []).map(e => [k, e, anPlain(k, e, a)])),
    link = k => `<a href="#${esc(AN_VIEWS.find(v => v[1] === k)[0])}">${esc(anTitle(k))}</a>`;
  const order = {bad: 0, good: 1, info: 2},
    clear = all.filter(([, , P]) => P.v === 'clear'),
    // the clear results that change something (the spreads stay on their own pages), what hurts first
    says_ = clear.filter(([, e]) => !e.sd).sort((x, y) => (order[x[2].tone] ?? 3) - (order[y[2].tone] ?? 3));
  const says = says_.length
    ? `<ul class="adm-an-says-l">${says_
        .map(
          ([k, e, P]) =>
            `<li><span class="adm-an-v t-${P.tone}">${AN_TONE[P.tone][0]}</span> <b>${esc(P.name)}</b> <small class="note">${link(k)}</small><br>${esc(P.text)}${P.advice ? `<small class="adm-an-adv">→ ${esc(P.advice)}</small>` : ''}${fresh.has(k + ':' + e.k) ? ' <span class="adm-src new">new</span>' : ''}</li>`
        )
        .join('')}</ul>`
    : '<p class="note">Nothing is clear yet: more answers are needed.</p>';
  const rows = all.map(
    ([k, e, P]) =>
      `<tr><td class="an-t">${link(k)}</td><td class="an-c">${esc(P.name)}</td><td class="adm-an-says">${anSays(P)}</td><td class="an-v">${anPill(P, e, fresh.has(k + ':' + e.k))}</td></tr>`
  );
  const nClear = R2 => Object.values(R2.A).flatMap(a => (a.effects || []).filter(e => e.v === 'clear')).length;
  const ms = rep.M.map((M, i) => {
    const r = rep.R[M],
      nw = i ? ANALYSIS.newly(r, rep.R[rep.M[i - 1]]).size : 0;
    return `<tr${M === R.M ? ' class="me"' : ''}><td><a href="#~an" data-anm="${i === rep.M.length - 1 ? 'all' : M}">${anInt(M)}</a></td><td>${r.at ? dateText(r.at, 'dm') : '–'}</td><td class="n">${r.players}</td><td class="n">${nClear(r)}</td><td class="n">${nw ? `+${nw}` : ''}</td></tr>`;
  });
  return (
    kpis([
      ['Answers', anInt(R.M)],
      ['Players', R.players],
      ['Milestones', rep.M.length],
      ['Clear results', `${clear.length} / ${all.filter(([, e]) => e.v !== 'nolog').length}`]
    ]) +
    `<div class="adm-sgrid adm-an-grid">${anCard('What the data says clearly', says, 'wide')}${anCard(
      'Every result',
      anTable(['Topic', 'Compared', 'What it does', 'Verdict'], rows, 'adm-an-eff adm-an-all'),
      'wide'
    )}${anCard(
      'Milestones',
      lines([{label: 'Clear results', pts: rep.M.map(M => [M, nClear(rep.R[M])]), dots: true}], {
        h: 150,
        ymin: 0,
        ymax: Math.max(4, ...rep.M.map(M => nClear(rep.R[M]))),
        yf: v => String(v),
        xlab: 'Answers in the log',
        title: 'Clear results by milestone'
      }) + anTable(['Answers', 'Last answer', '#Players', '#Clear', '#New'], ms),
      'wide'
    )}</div>`
  );
}
function anView(key, rep, R, prevR) {
  const a = R.A[key];
  if (!a) return '<p class="note">Not in this report.</p>';
  if (a.err) return `<p class="note">Failed: ${esc(a.err)}</p>`;
  const fresh = ANALYSIS.newly(R, prevR);
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
  if (a.thin)
    return (
      head +
      `<p class="note">Not enough data yet: ${anInt(a.n)} of the ${anInt(a.min)} answers this analysis needs.</p>` +
      (key === 'sess' && a.desc ? `<div class="adm-sgrid adm-an-grid">${anSessDesc(a.desc).join('')}</div>` : '')
    );
  const lean = a.lean ? '<p class="note">Only the main results are kept for this milestone.</p>' : '';
  const parts = [anEffects(a, key, fresh)];
  if (!a.lean) parts.push(...(ANV[key] ? ANV[key](a, R) : []));
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
        a.player.map(
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
        a.player.map(
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
        a.player.map((p, i) => ({
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
          a.player.map(
            (p, i) =>
              `<tr><td>${anWho(p.k, i)}</td><td class="n">${p.n}</td><td class="n">${p.mix}</td><td class="n">${p.exp.toFixed(1)}</td><td class="n">×${p.oe.toFixed(1)}<small class="adm-an-ci">×${p.lo.toFixed(1)} – ×${p.hi.toFixed(1)}</small></td></tr>`
          )
        ),
      'wide'
    )
  ],
  learn: a => [
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
      'wide'
    )
  ];
}

/* ---------- The page ---------- */
function renderAnalyses() {
  status();
  if (!ANREP) {
    $v.innerHTML = '<p class="note">Loading…</p>';
    anLoad().then(() => /^~an(-|$)/.test(cur) && render());
    return;
  }
  if (TOKEN && !USERS) loadUsers().then(() => /^~an(-|$)/.test(cur) && ANREP && render());
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
    i = rep.M.indexOf(M),
    prevR = i > 0 ? rep.R[rep.M[i - 1]] : null,
    now = local ? rep.answers : ANREP.answers || rep.answers,
    lastM = Math.floor(now / ANALYSIS.STEP) * ANALYSIS.STEP,
    since = now - lastM;
  const seg = `<span class="adm-qseg adm-sseg" role="group" aria-label="Milestone">${rep.M.slice(-5)
    .map((m, j, L) => {
      const v = j === L.length - 1 ? 'all' : String(m);
      return `<button type="button" data-anm="${v}" aria-pressed="${v === 'all' ? M === rep.M[rep.M.length - 1] : M === m}">${v === 'all' ? `All ${anInt(m)}` : m >= 1000 ? m / 1000 + 'k' : m}</button>`;
    })
    .join('')}</span>`;
  const badge = `<span class="adm-src adm-an-badge" title="${esc(`${anInt(now)} answers in the log; a milestone every ${anInt(ANALYSIS.STEP)}`)}">${anInt(since)} since ${anInt(lastM)} · next at ${anInt(lastM + ANALYSIS.STEP)}</span>`;
  const made = `<span class="note adm-an-made" title="${esc(local ? 'Recomputed in this tab' : 'Stored report')}">${local ? 'This tab' : dateText(rep.made, 'dmhm')}</span>`;
  $v.innerHTML = `<section class="adm-an"><div class="adm-shead">${seg}${badge}${made}${recompute}</div>${key ? anView(key, rep, R, prevR) : anOverview(rep, R, prevR)}</section>`;
  anBind();
}
function anBind() {
  $v.querySelectorAll('[data-anm]').forEach(
    b =>
      (b.onclick = e => {
        e.preventDefault();
        AN.m = b.dataset.anm;
        anSave();
        if (b.tagName === 'A' && cur !== '~an') location.hash = '#~an';
        render();
      })
  );
  $v.querySelectorAll('[data-zf]').forEach(b => (b.onclick = () => zoom(b.dataset.g, b.dataset.zf)));
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
// Recompute here (desktop, secondary): the same module in a Web Worker on this page's answer log; the stored report's
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
      if (/^~an(-|$)/.test(cur)) render();
    };
    ANWORK.postMessage({id: 1, rows, meta, B: 20, seed: 1, prev: ANREP && ANREP.rep});
  };
  (ANS && ANS.rows && ANS.rows.length ? Promise.resolve() : loadStats()).then(go);
}
// The charts are drawn at the page's width: draw again when it changes.
let anRz = null;
addEventListener('resize', () => {
  clearTimeout(anRz);
  anRz = setTimeout(() => /^~an(-|$)/.test(cur) && render(), 200);
});

// Help ("?"), per view: the definitions and the methods stay off the page (AGENTS.md rule 23).
const AN_HELP_COMMON = `<p><b>How to read a result.</b> Each line compares two situations (<i>Compared</i>) and says which way the result goes and by how much, for a typical player on a typical photo: "More likely wrong: about 62% right instead of 75%" means a typical player who gets 75% right would get about 62% right in that situation. <b>Likely</b>: the range the true value lies in, with 95% confidence (a 95% interval). <b>Verdicts</b>: ▲ <b>Helps</b> (more right answers, fewer mix-ups, fewer stops), ▼ <b>Hurts</b> (the opposite), ● <b>Clear</b> (a clear result that is neither good nor bad: answer time, or how far the app's own estimate is off), – <b>No clear effect</b> (the range is narrow and close to no change: if there is an effect, it is small), … <b>Not enough data yet</b> (the range is too wide to say; hover for the answers it would need). <b>→</b> what a clear result suggests for the app. <b>new</b>: clear since the previous milestone. <b>How much they differ</b>: how far apart players (or genera, photos, pairs) are, as the range a typical one falls in (two in three fall inside it).</p>
  <p><b>Where it comes from.</b> A GitHub Action (tools/analyses.js) reads the answer log from the sync sheet every hour and, once 1000 new answers have come in (or the code changed), redoes every analysis on the first 1000, 2000, … answers in time order (the milestones) and on all of them, then stores the report in the sheet (private). This page only draws it. <b>Recompute here</b> (desktop) runs the same code in this tab; its result stays in this tab. The switch picks a milestone; the badge says how many answers came since the last one. <b>As the answers came in</b>: each result and its likely range at every milestone.</p>
  <p><b>Method, for the curious.</b> Mixed models fitted on every answer (players, genera and photos as random effects, so a genus with few answers is pulled towards the average); right / wrong as a logistic model above each question's guess rate; time on a log scale. Each effect is turned into the change it makes for a typical player and photo (the share of right answers, the median time, the share of stops in the data). 95% ranges: the wider of the model's own and a bootstrap over players (from 6 players). "No clear effect" = the range fits inside the smallest change that would matter (10% of time; 0.25 on the log-odds scale, about 5 points of right answers near 75%; 5 points).</p>`;
Object.assign(HELP, {
  an: `<p><b>Overview.</b> What the data says clearly, in one list, then every result of every analysis, and the milestones (one per 1000 answers) with how many results were clear at each.</p>${AN_HELP_COMMON}`,
  'an-rt': `<p><b>Answer time.</b> Seconds from the moment the photos are in view to the answer (0-600 s). Each line says how much faster or slower answers are in one situation than a typical answer, the others held equal: right against wrong answers, typed against picked, a photo enlarged, 2 choices against 4, a question the app rates harder, later in a session. <b>What makes answer times differ</b>: how much of the differences in time come from who answers (players), from the genus, from the photo, and from one time to the next. By genus and by player: the typical time, after pulling those with few answers towards the average.</p>${AN_HELP_COMMON}`,
  'an-zoom': `<p><b>Enlarging photos.</b> Is an answer more often right when the player enlarged a photo first, compared with the same player not enlarging, beyond what the app expected? And are players who enlarge often better or worse? Players: how often each enlarges, right when enlarging or not, and right answers against the app's expectation. Since 2026-11-03 20:24 the enlarge button is visible: compare milestones after it.</p>${AN_HELP_COMMON}`,
  'an-photo': `<p><b>What makes a photo hard.</b> The chance of a right answer for each feature of the photos shown (view, quality, sharpness, source, one view alone), against the reference in brackets, the player's level, the genus and the photo itself held equal. Quality: Pierre's rating, else the automatic one. <b>Harder / easier than their view, quality and source say</b>: the photos whose own difficulty is furthest from what their features predict (click to enlarge): maybe a wrong label, a misleading colony, or a great photo.</p>${AN_HELP_COMMON}`,
  'an-fmt': `<p><b>Question formats.</b> For each format (4 choices; 4 choices with one or two easy to rule out; Again after a miss; duels; the exam; typed answers): the success of a pure guess as measured, against the value the app uses (¼ with 4 choices, ½ with 2, 0 typed); whether players find it easier or harder than the app expects; and the plain gap, right answers minus what the app expected, in points. A guess rate is measured on the weakest answers, so its range stays wide until there are many.</p>${AN_HELP_COMMON}`,
  'an-conf': `<p><b>Genera mixed up.</b> Each wrong genus offered as a choice is a chance to be picked (typed answers left out). The chance to pick it, by the view shown (against a colony photo), the pair of genera and the player held equal. <b>Pairs most mixed up</b>: offered together, mixed up, the rate by view shown (answers under it), and how many times as often as a typical pair (at the typical mix-up rate: the model's odds ratio turned into a ratio of chances). <b>Each player against everyone's rates</b>: the player's mix-ups divided by what everyone's rates for the same pairs, views and choices predict (×1 = like everyone).</p>${AN_HELP_COMMON}`,
  'an-learn': `<p><b>Learning with practice.</b> How the chance of a right answer grows with the answers already given on a genus, and the effect of the next question after a miss, of "Again" after that miss, of typed answers, exam and comeback questions, the player and the genus held equal. <b>Answers needed to reach 80% right</b> (beyond guessing, the app's target), for a typical player, by genus. The first-meeting card and the side-by-side comparison leave no row in the answer log: they cannot be measured yet (ROADMAP).</p>${AN_HELP_COMMON}`,
  'an-back': `<p><b>After a break.</b> Answers on a genus the player last answered right: how the chance of a right answer falls with the time since (a week against a day), against what the app expected then; and the comeback questions after a break: right answers against the app's expected chance (its forgetting curve, model.js comebackOf). By length of the break: answers, right, the app's expectation now and before the break.</p>${AN_HELP_COMMON}`,
  'an-sess': `<p><b>Sessions</b> (a player's answers less than 30 minutes apart). <b>Sessions still going after n answers</b>: a session still open at the end of the log counts only as far as it went. <b>What changes the result</b>: the chance to end the session right after an answer, depending on that answer (wrong, the second miss in a row or more, a question the app rates harder, a slow answer for that player) and on how far into the session it comes.</p>${AN_HELP_COMMON}`
});
// Opened straight on an Analyses address: admin.js drew a placeholder before this file was in.
if (typeof DATA !== 'undefined' && DATA && /^~an(-|$)/.test(cur)) render();
