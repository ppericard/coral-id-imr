/* ---------- Analyses (Pierre, 2026-11-04): multifactor analyses of the answer log, every 1000 answers ---------- */
// "I love this kind of multifactor report… every 1000 new answers… a new section in the admin with several sub-pages,
// with visualisations, reports, graphs, tables." The report is computed once, by a GitHub Action (tools/analyses.js,
// analysis.js), and stored in the sync sheet (v34, analysesGet); this page only draws it, so it opens at once on a
// phone. "Recompute here" (desktop, secondary) runs the same module in a Web Worker on this page's own answer log; its
// result stays in this tab. Loaded after admin.js, whose helpers it uses ($v, esc, store, TOKEN, SYNC_URL, loadStats,
// loadUsers, allPhotos, zoom, img, kpis). Views: GROUPS in admin.js; docs/ARCHITECTURE.md "Analyses"; the methods in
// docs/LEARNING.md "Multifactor analyses"; the chart helpers in docs/DESIGN.md "Admin charts".
const AN_V = 34; // sync script version with analysesGet (AGENTS.md 7a: before it, the page just has no stored report)
let ANREP = null, // {st: 'ok' | 'none' | 'old' | 'err', rep, answers, stored}
  ANLOC = null, // a report recomputed in this tab: {rep} once done, {prog} while running
  ANWORK = null;
const AN = Object.assign({m: 'all', src: 'sheet'}, store.get('imr-admin-an', {}));
const anSave = () => store.set('imr-admin-an', {m: AN.m});
// Views: [address, analysis key in the report, title]
const AN_VIEWS = [
  ['~an', null, 'Overview'],
  ['~an-rt', 'rt', 'Response time'],
  ['~an-zoom', 'zoom', 'Zoom'],
  ['~an-photo', 'photo', 'Photo factors'],
  ['~an-fmt', 'fmt', 'Formats'],
  ['~an-conf', 'conf', 'Confusions'],
  ['~an-learn', 'learn', 'Learning curves'],
  ['~an-back', 'back', 'Comeback'],
  ['~an-sess', 'sess', 'Sessions']
];
const anKey = h => (AN_VIEWS.find(v => v[0] === h) || [])[1];
const anTitle = k => (AN_VIEWS.find(v => v[1] === k) || [])[2] || k;

function anLoad() {
  if (!TOKEN) return Promise.resolve((ANREP = {st: 'err', err: 'Needs the GitHub token'}));
  return fetch(SYNC_URL, {method: 'POST', body: JSON.stringify({analysesGet: 1, token: TOKEN})})
    .then(r => r.json())
    .then(j => {
      // A script before v34 answers 'input' to an unknown POST: no stored report, nothing else changes (AGENTS.md 7a).
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
// One effect's value in its unit: log time as a % change in time, a rate as %, a difference of rates in points.
function anFmt(e, v) {
  if (v == null || !isFinite(v)) return '–';
  if (e.sd) return v.toFixed(2);
  if (e.unit === 'log') return anNum((Math.exp(v) - 1) * 100, 0) + '%';
  if (e.unit === 'p') return /^g_/.test(e.k) ? Math.round(v * 100) + '%' : anNum(v * 100, 1) + ' pts';
  if (e.unit === 'n') return v >= 999 ? '999+' : anInt(v);
  return anNum(v);
}
// The smallest effect that matters, in the effect's unit (a rate's in points).
const anSes = (e, v) =>
  e.unit === 'log'
    ? `${Math.round((Math.exp(v) - 1) * 100)}%`
    : e.unit === 'p'
      ? `${Math.round(v * 100)} pts`
      : e.unit === 'n'
        ? anInt(v)
        : v.toFixed(2);
const anCI = e => (e.lo == null ? '' : `[${anFmt(e, e.lo)}, ${anFmt(e, e.hi)}]`);
const VERD = {
  clear: ['✓', 'Clear'],
  margin: ['≈', 'Within the margin'],
  thin: ['…', 'Not enough data yet'],
  none: ['–', 'No such answers yet'],
  nolog: ['∅', 'Not in the answer log']
};
// The verdict line (Pierre, 2026-11-04): what the data can and cannot say yet.
function anVerdict(e) {
  if (e.v === 'clear') return `Clear: ${anFmt(e, e.est)} ${anCI(e)}`;
  if (e.v === 'margin') return `Within the margin of error: no effect beyond ±${anSes(e, e.sesoi)} ${anCI(e)}`;
  if (e.v === 'thin')
    return `Not enough data yet — CI includes ${e.nul != null ? anFmt(e, e.nul) : '0'} (n = ${anInt(e.n)}${e.need ? `, needs ≈ ${anInt(e.need)} answers${e.hw != null ? ` for a ±${anSes(e, e.hw)} CI` : ''}` : ''})`;
  return VERD[e.v] ? VERD[e.v][1] : '';
}
const anPill = (e, fresh) =>
  `<span class="adm-an-v v-${e.v}" title="${esc(anVerdict(e))}">${VERD[e.v] ? VERD[e.v][0] + ' ' + VERD[e.v][1] : ''}</span>${fresh ? ' <span class="adm-src new" title="Clear since the previous milestone">new</span>' : ''}`;
const anNeed = e => (e.v === 'thin' && e.need ? `≈ ${anInt(e.need)}` : '');

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
  ticks(a, b).forEach(
    t =>
      (s += `<line class="an-grid" x1="${X(t)}" x2="${X(t)}" y1="${h - 24}" y2="${h - 20}"/><text class="an-tick" x="${X(t)}" y="${h - 6}" text-anchor="middle">${esc(tf(t))}</text>`)
  );
  rows.forEach((r, i) => {
    const y = i * rh + 14;
    s += `<g><title>${esc(r.title || `${r.label}: ${tf(r.est)}`)}</title><rect class="an-hit" x="0" y="${y - rh / 2}" width="${w}" height="${rh}"/><text class="an-lab" x="${lw}" y="${y + 4}" text-anchor="end">${esc(fit(r.label, lw))}</text>`;
    if (isFinite(r.lo) && isFinite(r.hi)) s += `<line class="an-ci" x1="${X(r.lo)}" x2="${X(r.hi)}" y1="${y}" y2="${y}"/>`;
    if (r.ref != null) s += `<path class="an-ref" d="M${X(r.ref)} ${y - 6}l6 6-6 6-6-6z"/>`;
    s += `<circle class="an-dot${r.dim ? ' dim' : ''}" cx="${X(r.est)}" cy="${y}" r="5"/></g>`;
  });
  return svg(w, h, o.title || 'Estimates with 95% intervals', s);
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

/* ---------- Page pieces ---------- */
const anCard = (t, body, cls = '') => `<section class="adm-scard${cls ? ' ' + cls : ''}"><h3>${t}</h3>${body}</section>`;
const anTable = (head, rows, cls = '') =>
  `<div class="adm-tscroll${cls === 'tall' ? ' tall' : ''}"><table class="adm-tbl${cls && cls !== 'tall' ? ' ' + cls : ''}"><thead><tr>${head.map(h => (h[0] === '#' ? `<th class="n">${h.slice(1)}</th>` : `<th>${h}</th>`)).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
// Player labels: the name from Players when this browser has it (the report keeps anonymous ids), else P1, P2… by order.
function anWho(id, i) {
  const u = ((USERS && USERS.users) || []).find(x => x.id === String(id).split('#')[0]);
  return u ? cut(u.name) : `<span class="adm-cut" title="${esc(id)}">P${i + 1}</span>`;
}
// The effects of one analysis: the verdict table (exact numbers) beside its forest plots, one per unit.
function anEffects(a, key, fresh) {
  const E = a.effects || [],
    rows = E.map(
      e =>
        `<tr data-ek="${esc(key + ':' + e.k)}"><td>${esc(e.label)}</td><td class="n">${anFmt(e, e.est)}</td><td class="n">${anCI(e)}</td><td>${anPill(e, fresh.has(key + ':' + e.k))}</td><td class="n" title="Answers that would resolve it">${anNeed(e)}</td></tr>`
    );
  const units = [
    ...new Set(E.filter(e => e.est != null && e.unit !== 'n').map(e => (e.sd ? 'sd' : e.unit + (/^g_/.test(e.k) ? 'g' : ''))))
  ];
  const plot = units
    .map(u => {
      // an estimate the fit could not hold (an interval wider than 20) stays in the table only, so the axis stays readable
      const L = E.filter(e => e.est != null && !(e.hi - e.lo > 20) && (e.sd ? 'sd' : e.unit + (/^g_/.test(e.k) ? 'g' : '')) === u);
      if (!L.length) return '';
      const tf = v => anFmt(L[0], v);
      return forest(
        L.map(e => ({label: e.label, est: e.est, lo: e.lo, hi: e.hi, ref: e.ref, title: `${e.label}: ${anVerdict(e)}`})),
        {tf, nul: u === 'pg' ? null : 0, title: `${anTitle(key)}: ${u === 'sd' ? 'spread between levels' : 'effects'}`}
      );
    })
    .join('');
  return anCard('Effects', plot + anTable(['Effect', '#Estimate', '#95% CI', 'Verdict', '#Needs'], rows, 'adm-an-eff'), 'wide');
}
// How each estimate moved from milestone to milestone (est and its interval), small multiples.
function anConv(rep, key) {
  const Ms = rep.M.filter(M => rep.R[M].A[key]);
  if (Ms.length < 2) return '';
  const last = rep.R[Ms[Ms.length - 1]].A[key].effects.filter(e => e.est != null && e.unit !== 'n' && !(e.hi - e.lo > 20));
  const W = anW(),
    cols = W >= 900 ? 3 : W >= 560 ? 2 : 1,
    w = Math.floor((W - (cols - 1) * 12) / cols) - 4;
  const cells = last.map(e => {
    const P = Ms.map(M => [M, (rep.R[M].A[key].effects || []).find(x => x.k === e.k)]).filter(
      ([, x]) => x && x.est != null && isFinite(x.est)
    );
    if (P.length < 2) return '';
    const vs = P.flatMap(([, x]) => [x.lo, x.hi, x.est]).filter(isFinite),
      ya = Math.min(e.sd ? 0 : Math.min(0, ...vs), ...vs),
      yb = Math.max(e.sd ? 0 : Math.max(0, ...vs), ...vs);
    return `<div class="adm-an-conv"><b title="${esc(e.label)}">${esc(e.label)}</b>${lines(
      [
        {
          label: e.label,
          pts: P.map(([M, x]) => [M, x.est]),
          band: P.map(([M, x]) => [M, isFinite(x.lo) ? x.lo : x.est, isFinite(x.hi) ? x.hi : x.est]),
          dots: true
        }
      ],
      {
        w,
        h: 130,
        ymin: ya,
        ymax: yb === ya ? ya + 1 : yb,
        yf: v => anFmt(e, v),
        xf: v => (v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'k' : v),
        xticks: [P[0][0], P[P.length - 1][0]],
        title: `${e.label} by milestone`
      }
    )}</div>`;
  });
  return anCard('By milestone', `<div class="adm-an-convs">${cells.join('')}</div>`, 'wide');
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
    rows = [],
    all = Object.entries(R.A).flatMap(([k, a]) => (a.effects || []).map(e => [k, e]));
  all.forEach(([k, e]) =>
    rows.push(
      `<tr><td><a href="#${esc(AN_VIEWS.find(v => v[1] === k)[0])}">${esc(anTitle(k))}</a></td><td>${esc(e.label)}</td><td class="n">${anFmt(e, e.est)} <small class="adm-an-ci">${anCI(e)}</small></td><td>${anPill(e, fresh.has(k + ':' + e.k))}</td><td class="n">${anNeed(e)}</td></tr>`
    )
  );
  const clear = all.filter(([, e]) => e.v === 'clear').length;
  const ms = rep.M.map((M, i) => {
    const r = rep.R[M],
      c = Object.values(r.A).flatMap(a => (a.effects || []).filter(e => e.v === 'clear')).length,
      nw = i ? ANALYSIS.newly(r, rep.R[rep.M[i - 1]]).size : 0;
    return `<tr${M === R.M ? ' class="me"' : ''}><td><a href="#~an" data-anm="${i === rep.M.length - 1 ? 'all' : M}">${anInt(M)}</a></td><td>${r.at ? dateText(r.at, 'dm') : '–'}</td><td class="n">${r.players}</td><td class="n">${c}</td><td class="n">${nw ? `+${nw}` : ''}</td></tr>`;
  });
  return (
    kpis([
      ['Answers', anInt(R.M)],
      ['Players', R.players],
      ['Milestones', rep.M.length],
      ['Clear effects', `${clear} / ${all.filter(([, e]) => e.v !== 'nolog').length}`]
    ]) +
    `<div class="adm-sgrid adm-an-grid">${anCard('Verdicts', anTable(['Analysis', 'Effect', '#Estimate [95% CI]', 'Verdict', '#Needs'], rows, 'adm-an-eff'), 'wide')}${anCard(
      'Milestones',
      lines(
        [
          {
            label: 'Clear effects',
            pts: rep.M.map(M => [M, Object.values(rep.R[M].A).flatMap(a => (a.effects || []).filter(e => e.v === 'clear')).length]),
            dots: true
          }
        ],
        {
          h: 150,
          ymin: 0,
          ymax: Math.max(
            4,
            ...rep.M.map(M => Object.values(rep.R[M].A).flatMap(a => (a.effects || []).filter(e => e.v === 'clear')).length)
          ),
          yf: v => String(v),
          title: 'Clear effects by milestone'
        }
      ) + anTable(['Milestone', 'Last answer', '#Players', '#Clear', '#New'], ms),
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
    ...(a.thin ? [['Needs', `≥ ${anInt(a.min)}`]] : []),
    ...(key === 'zoom' && a.enlarged != null ? [['Enlarged', anInt(a.enlarged)]] : []),
    ...(key === 'photo' && a.photos ? [['Photos', anInt(a.photos)]] : []),
    ...(key === 'conf' && a.mixed != null ? [['Mixed up', anInt(a.mixed)]] : []),
    ...(key === 'back' && a.far != null ? [['After a break', anInt(a.far)]] : []),
    ...(key === 'sess' && a.sessions ? [['Sessions', anInt(a.sessions)]] : [])
  ]);
  if (a.thin) return head + `<p class="note">Not enough data yet: ${anInt(a.n)} of the ${anInt(a.min)} answers this analysis needs.</p>`;
  const lean = a.lean ? '<p class="note">Only the effects are kept for this milestone.</p>' : '';
  const parts = [anEffects(a, key, fresh)];
  if (!a.lean) parts.push(...(ANV[key] ? ANV[key](a, R) : []));
  parts.push(anConv(rep, key));
  return head + lean + `<div class="adm-sgrid adm-an-grid">${parts.join('')}</div>`;
}
const pc = v => (v == null || !isFinite(v) ? '–' : Math.round(v * 100) + '%');
// The cards of each analysis beyond its effects.
const ANV = {
  rt: a => [
    anCard(
      'Where the time varies',
      sharesBar(a.shares, {title: 'Share of the variance of log time'}) +
        anTable(
          ['Part', '#SD (log)', '#Share'],
          a.shares.map(
            (p, i) =>
              `<tr><td><span class="adm-an-key s${i}"></span>${esc(p.k)}</td><td class="n">${Math.sqrt(p.v).toFixed(2)}</td><td class="n">${pc(p.share)}</td></tr>`
          )
        ) +
        `<p class="note">Typical answer: ${a.base.toFixed(1)} s</p>`
    ),
    anCard(
      'Genera (time, shrunk)',
      forest(
        a.genus.map(g => ({
          label: g.k,
          est: g.u,
          lo: g.lo,
          hi: g.hi,
          title: `${g.k}: ${anNum((Math.exp(g.u) - 1) * 100, 0)}% (${g.n} answers)`
        })),
        {tf: v => anNum((Math.exp(v) - 1) * 100, 0) + '%', title: 'Time by genus, against the average'}
      ),
      'wide'
    ),
    anCard(
      'Players (time, shrunk)',
      anTable(
        ['Player', '#Answers', '#Time', '#95% CI'],
        a.player.map(
          (p, i) =>
            `<tr><td>${anWho(p.k, i)}</td><td class="n">${anInt(p.n)}</td><td class="n">${anNum((Math.exp(p.u) - 1) * 100, 0)}%</td><td class="n">[${anNum((Math.exp(p.lo) - 1) * 100, 0)}%, ${anNum((Math.exp(p.hi) - 1) * 100, 0)}%]</td></tr>`
        )
      )
    ),
    a.photos && a.photos.length
      ? anCard(
          'Slowest and fastest photos',
          anThumbs(a.photos, x => `${anNum((Math.exp(x.u) - 1) * 100, 0)}% · ${anInt(x.n)}`),
          'wide'
        )
      : ''
  ],
  zoom: a => [
    anCard(
      'Players',
      anTable(
        ['Player', '#Answers', '#Enlarged', '#Right enl.', '#Right not', '#O−E enl.', '#O−E not'],
        a.player.map(
          (p, i) =>
            `<tr><td>${anWho(p.k, i)}</td><td class="n">${p.n}</td><td class="n">${pc(p.z / p.n)}</td><td class="n">${p.z ? pc(p.yz / p.z) : '–'}</td><td class="n">${pc(p.y0 / Math.max(1, p.n - p.z))}</td><td class="n">${p.z ? anNum(((p.yz - p.ez) / p.z) * 100, 1) : '–'}</td><td class="n">${anNum(((p.y0 - p.e0) / Math.max(1, p.n - p.z)) * 100, 1)}</td></tr>`
        )
      ),
      'wide'
    ),
    anCard(
      'By view shown',
      anTable(
        ['View', '#Answers', '#Enlarged'],
        a.views.map(
          v =>
            `<tr><td>${esc({wide: 'Colony', medium: 'Close-up', macro: 'Corallites', multi: 'Several'}[v.k] || v.k)}</td><td class="n">${v.n}</td><td class="n">${pc(v.z / v.n)}</td></tr>`
        )
      )
    )
  ],
  photo: a => {
    const tab = (t, L) =>
      anCard(
        t,
        anTable(
          [t.split(' ')[1] ? 'Group' : t, '#Answers', '#Photos', '#Right'],
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
        'Harder than their features say',
        anThumbs(a.harder, x => `${anNum(x.d)} · ${anInt(x.n)}`),
        'wide'
      ),
      anCard(
        'Easier than their features say',
        anThumbs(a.easier, x => `${anNum(x.d)} · ${anInt(x.n)}`),
        'wide'
      )
    ];
  },
  fmt: a => [
    anCard(
      'Guess rate: real (●) against the app’s (◇)',
      forest(
        a.table
          .filter(r => r.fit)
          .map(r => {
            const e = (a.effects || []).find(x => x.k === 'g_' + r.k) || {};
            return {
              label: r.label,
              est: e.est,
              lo: e.lo,
              hi: e.hi,
              ref: r.g0,
              title: `${r.label}: ${anVerdict(e)}; the app uses ${pc(r.g0)}`
            };
          }),
        {tf: v => Math.round(v * 100) + '%', title: 'Guess rate by format'}
      ),
      'wide'
    ),
    anCard(
      'Formats',
      anTable(
        ['Format', '#Answers', '#Right', '#Expected', '#App guess', '#Real guess', '#Difficulty'],
        a.table.map(
          r =>
            `<tr><td>${esc(r.label)}</td><td class="n">${anInt(r.n)}</td><td class="n">${r.n ? pc(r.right) : '–'}</td><td class="n">${r.n ? pc(r.E) : '–'}</td><td class="n">${r.n ? pc(r.g0) : '–'}</td><td class="n">${r.fit ? pc(r.fit.c) : '–'}</td><td class="n">${r.fit ? anNum(-r.fit.d) : '–'}</td></tr>`
        )
      ),
      'wide'
    )
  ],
  conf: a => [
    anCard(
      'Pairs most mixed up',
      anTable(
        ['Pair', '#Offered', '#Mixed', '#Rate', '#Colony', '#Close-up', '#Corallites', '#Several', '#Pair effect'],
        a.pairs.map(p => {
          const v = k => (p.v[k] ? `${pc(p.v[k][1] / p.v[k][0])} <small class="adm-an-ci">${p.v[k][0]}</small>` : '–');
          return `<tr><td>${p.k
            .split('|')
            .map(g => `<i>${esc(g)}</i>`)
            .join(
              ' · '
            )}</td><td class="n">${p.off}</td><td class="n">${p.mix}</td><td class="n">${pc(p.mix / p.off)}</td><td class="n">${v('wide')}</td><td class="n">${v('medium')}</td><td class="n">${v('macro')}</td><td class="n">${v('multi')}</td><td class="n">${anNum(p.u)} <small class="adm-an-ci">[${anNum(p.lo)}, ${anNum(p.hi)}]</small></td></tr>`;
        })
      ),
      'wide'
    ),
    anCard(
      'Each player against the pooled rates',
      forest(
        a.player.map((p, i) => ({
          label: (anWho(p.k, i).match(/>([^<]*)</) || [])[1] || `P${i + 1}`,
          est: p.oe,
          lo: p.lo,
          hi: p.hi,
          title: `${p.mix} mixed up, ${p.exp.toFixed(1)} expected`
        })),
        {nul: 1, tf: v => '×' + v.toFixed(2), title: 'Mix-ups observed / expected, by player'}
      ) +
        anTable(
          ['Player', '#Chances', '#Mixed', '#Expected', '#×'],
          a.player.map(
            (p, i) =>
              `<tr><td>${anWho(p.k, i)}</td><td class="n">${p.n}</td><td class="n">${p.mix}</td><td class="n">${p.exp.toFixed(1)}</td><td class="n">×${p.oe.toFixed(2)}</td></tr>`
          )
        ),
      'wide'
    )
  ],
  learn: a => [
    anCard(
      'Right answers by exposure',
      lines(
        [
          {label: 'Observed', pts: a.curve.map(b => [b.lo, b.right, b.n]), dots: true},
          {label: 'Model', pts: a.curve.map(b => [b.lo, b.fit]), dash: true}
        ],
        {xlog: true, xlab: 'Answers on the genus before', xticks: a.curve.map(b => b.lo), title: 'Right answers by exposure'}
      ) +
        anTable(
          ['Answers before', '#Answers', '#Right', '#Model'],
          a.curve.map(
            b =>
              `<tr><td>${b.lo === b.hi ? b.lo : b.hi > 1e8 ? b.lo + '+' : `${b.lo}–${b.hi}`}</td><td class="n">${anInt(b.n)}</td><td class="n">${pc(b.right)}</td><td class="n">${pc(b.fit)}</td></tr>`
          )
        ),
      'wide'
    ),
    anCard(
      'Answers to reach 80%, by genus',
      forest(
        a.genus.map(g => ({
          label: g.k,
          est: Math.log(1 + Math.min(g.est, 999)),
          lo: Math.log(1 + Math.min(g.lo, 999)),
          hi: Math.log(1 + Math.min(g.hi, 999)),
          title: `${g.k}: ${anInt(g.est)} answers [${anInt(g.lo)}, ${g.hi >= 999 ? '999+' : anInt(g.hi)}]`
        })),
        {nul: 0, tf: v => anInt(Math.exp(v) - 1), title: 'Answers to reach 80% by genus (log scale)'}
      ) +
        anTable(
          ['Genus', '#Answers', '#Players', '#Right', '#To 80%', '#95% CI'],
          a.genus.map(
            g =>
              `<tr><td><i>${esc(g.k)}</i></td><td class="n">${g.n}</td><td class="n">${g.players}</td><td class="n">${pc(g.right)}</td><td class="n">${g.est >= 999 ? '999+' : anInt(g.est)}</td><td class="n">[${anInt(g.lo)}, ${g.hi >= 999 ? '999+' : anInt(g.hi)}]</td></tr>`
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
          {label: 'Observed', pts: a.bands.map((b, i) => [i, b.right, b.n]).filter((p, i) => a.bands[i].n), dots: true},
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
          ['Since the last answer on the genus', '#Answers', '#Right', '#App expected', '#Expected before'],
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
      lines([{label: 'Sessions going', pts: a.km.map(k => [k.n, k.s]), step: true}], {
        xlab: 'Answers in the session',
        title: 'Sessions still going (Kaplan-Meier)'
      }) +
        anTable(
          ['After', '#Still going'],
          a.at
            .map(x => `<tr><td>${x.k} answers</td><td class="n">${pc(x.s)}</td></tr>`)
            .concat(`<tr><td>Median length</td><td class="n">${a.median ? a.median + ' answers' : '–'}</td></tr>`)
        ),
      'wide'
    )
  ]
};

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

// Help ("?"), per view: the method notes stay off the page (AGENTS.md rule 23).
const AN_HELP_COMMON = `<p><b>Where it comes from.</b> A GitHub Action (tools/analyses.js) reads the answer log from the sync sheet with the admin token every hour and, once 1000 new answers have come in (or the code changed), refits every analysis on the first 1000, 2000, … answers in time order (the milestones) and on all of them, then stores the report in the sheet (Analyses tab, private). This page only draws it. <b>Recompute here</b> (desktop) runs the same code in this tab on the answers this page reads; its result stays in this tab. The switch picks a milestone; the badge says how many answers came since the last milestone and when the next one is.</p>
  <p><b>Verdicts.</b> Each estimate has a 95% interval: the model's own (Wald) and, from 6 players, a cluster bootstrap over players (players drawn with replacement, every answer of a player drawn twice counted twice), whichever is wider. <b>Clear</b>: the interval excludes 0 (or the app's value). <b>Within the margin</b>: it includes it but is narrower than the smallest effect that would matter (±0.1 log time ≈ 10%, ±0.25 logit, ±5 points), so no effect that size. <b>Not enough data yet</b>: it includes it and is wider; <b>Needs</b> = the answers for an interval as narrow as the current estimate (or that smallest effect), from the interval shrinking as 1/√n (rough: more players matter as much as more answers). <b>new</b> = clear since the previous milestone. <b>By milestone</b>: each estimate and its interval at every milestone (convergence).</p>`;
Object.assign(HELP, {
  an: `<p>Every analysis of the answer log in one table: the effect, its estimate and 95% interval, the verdict and the answers it would need. Milestones: one per 1000 answers; the line counts the clear effects at each.</p>${AN_HELP_COMMON}`,
  'an-rt': `<p><b>Response time.</b> Log seconds to answer (from the photos in view to the answer, 0-600 s; answers with an expectation logged) as a linear mixed model with crossed random effects: player, genus and photo (a question's photos share it equally), and fixed effects: right answer, typed, a photo enlarged, 2 choices, the app's expected difficulty (−logit of Expected beyond guessing) and the log position in the session. Fitted by alternating updates of the effects with EM variance components (REML-like shrinkage: a genus with few answers is pulled to the average). Effects read as % time (+20% = 1.2 × slower). Where the time varies: the share of each part in the variance of log time. Genera, players and photos: their shrunk effects with 95% conditional intervals.</p>${AN_HELP_COMMON}`,
  'an-zoom': `<p><b>Zoom.</b> Does enlarging a photo go with a right answer, beyond the app's expectation? Logistic model with each question's guess rate, the app's expectation as offset and a player random effect; the effect of enlarging is measured against each player's own habit (enlarged − their rate), apart from how much they enlarge (between players). Players: their answers, how often they enlarge, right % and right − expected with and without enlarging. By view: how often each view shown gets enlarged. Since 2026-11-03 20:24 the enlarge mark is visible: compare milestones after it.</p>${AN_HELP_COMMON}`,
  'an-photo': `<p><b>Photo factors</b> (explanatory IRT, LLTM with a photo random effect). Right / wrong with each question's guess rate; random effects player (ability), genus, photo (a question's photos share it); fixed effects the photos' features, averaged over the photos shown: view (close-up, corallites against colony), quality (fair, poor against good; Pierre's rating else the automatic one), sharpness (log, per SD; metrics.json), source (Pierre's, other iNaturalist against IMR lecture), one view alone, typed. Read as difficulty: + = harder. Harder / easier than their features say: the photos whose own effect is furthest from what their features predict (click to enlarge).</p>${AN_HELP_COMMON}`,
  'an-fmt': `<p><b>Formats.</b> For each question format (4 choices, 4 shown with 3 or 2 plausible, Again, duel in the quiz, Duel tab, exam, typed): P(right) = c + (1 − c) sig(x + d), x the app's own log-odds for the answer (its Expected without its guess floor), fitted per format: c the real guess rate (◇ = the fixed value the app uses: 1/k, ½ for a duel, 0 typed), d the extra difficulty the app's expectation misses (+ = harder than the app thinks). Right − expected: the plain gap. The guess rate is pinned by the weakest answers: its interval stays wide until there are many.</p>${AN_HELP_COMMON}`,
  'an-conf': `<p><b>Confusions.</b> Each wrong choice offered is a chance to be picked (typed answers left out). Logistic model: random effects the pair of genera and the player, fixed effects the view shown (close-up, corallites, several views against colony) and the number of wrong choices. SD player = how much players differ from the pooled rates (each player against the pooled: mix-ups observed / expected, ×1 = like everyone). Pairs: offered together, mixed up, the rate by view shown (answers under it) and the pair's own effect.</p>${AN_HELP_COMMON}`,
  'an-learn': `<p><b>Learning curves.</b> Right / wrong with the guess rate, random effects player and genus, fixed effects the log of answers already given on the genus (the slope), right after a miss on it, an Again asked after that miss (its extra effect), typed, exam and comeback questions. Answers to reach 80% (recognised beyond guessing, the app's target) for an average player, overall and by genus. The first-meeting card and the side-by-side comparison leave no row in the answer log: they cannot be measured yet (ROADMAP).</p>${AN_HELP_COMMON}`,
  'an-back': `<p><b>Comeback.</b> Answers after a right answer on the same genus: the forgetting slope, logit per log(1 + days since), with the expectation of that previous answer as offset and a player random effect; and the comeback questions (|c): right − the app's expected (its FSRS curve, model.js comebackOf). By band: how many, right %, the app's expectation now and before the break.</p>${AN_HELP_COMMON}`,
  'an-sess': `<p><b>Sessions</b> (answers less than 30 minutes apart). Sessions still going after n answers (Kaplan-Meier; a session whose last answer is under 30 minutes before the log's end is still open, censored). What ends a session: a discrete-time survival model (logistic, player random effect) on each answer, stop after it or not: the answer wrong, 2+ misses in a row, the question's expected difficulty, a slow answer against the player's usual, the position.</p>${AN_HELP_COMMON}`
});
// Opened straight on an Analyses address: admin.js drew a placeholder before this file was in.
if (typeof DATA !== 'undefined' && DATA && /^~an(-|$)/.test(cur)) render();
