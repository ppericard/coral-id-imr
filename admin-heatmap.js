// Analyses › Difficulty › Heatmap (#analyses/difficulty/heatmap; Pierre, 2026-11-14, Q123 m: "m (confusion heatmaps) for
// the corals first", docs/reviews/2026-11-05-fish-confusion-study.md question m): every unit against every unit, read live
// from the answer log as Pairs is (admin.js statsConf: the same confusionOf and noChoiceMixups, memoised once per log).
// Rows: the unit shown (the photo's); columns: the unit answered. A cell: the times the column was answered when it was
// offered beside the row (core.js confusionOf dir, [offered, answered]), and its rate shrunk toward the pair's start as
// Pairs' Score is (confScore toward pairPrior: declared look-alike, same family, other; the study's §4.2, the same
// confScore and CONF.W at every level). The units in blocks of their family (their record's fam, the prior's own field,
// the study's "entry and genus blocks"; never by growth form, rule C4), the biggest block first, each block ordered so the
// pairs mixed up most sit side by side (heatOrder). Typed mix-ups (no choices, so no rate) apart, as Pairs keeps them
// (#876). A cell opens the pair on the site's compare page when the subject has one. Only the subjects whose admin pages
// name it (core.js SUBJECTS admin pages): the corals first.
//
// The pure part (heatMatrix, heatOrder, heatBin, HEAT) runs in Node too: tests/heatmap.test.js.
(function (root) {
  const K = typeof module !== 'undefined' && module.exports ? require('./core.js') : root;
  // The colour of a cell by its shrunk rate: under BINS[0] the lightest, from BINS[3] (a declared look-alike's start) the
  // darkest; BINS[2] is the quiz's trap (CONF.TRAP). Typed mix-ups by their count: 1, 2, 3-4, 5 or more.
  const HEAT = {BINS: [0.05, 0.1, K.CONF.TRAP, K.CONF.LOOK], TYPED: [1, 2, 3, 5]};
  const heatBin = (x, B = HEAT.BINS) => B.filter(b => x >= b).length;
  // The units of each block (an array of names) in an order where the pairs mixed up most sit side by side: from the unit
  // with the most mix-ups inside the block, each next one the unit whose pair with the last placed scores highest (ties:
  // by name), so a run of look-alikes reads as one dark patch along the diagonal. sc(a, b): the pair's score.
  function heatOrder(L, sc, mixed) {
    const left = [...L].sort(),
      tot = a => left.reduce((t, b) => t + (b === a ? 0 : mixed(a, b)), 0),
      out = [];
    if (!left.length) return out;
    let at = left.reduce((m, a) => (tot(a) > tot(m) ? a : m), left[0]);
    while (left.length) {
      out.push(at);
      left.splice(left.indexOf(at), 1);
      const last = at;
      at = left.reduce((m, a) => (m == null || sc(last, a) > sc(last, m) ? a : m), null);
    }
    return out;
  }
  // The matrix: C, confusionOf's {pair, dir}; typed, noChoiceMixups' typed {"shown|answered": n}; rec(n), a unit's record
  // ({fam}); prior(a, b), the pair's start [name, rate] (admin.js pairPrior). Returns {units in display order, groups
  // [[family, first, last index]], cell {"shown|answered": {off, mix, sc, pt, pv, look, dl}}, typed (as given), mix (the
  // mix-ups from choices), nt (the typed ones)}. A cell's dl: the pair (both ways) is a look-alike from the data (core.js
  // dataLook on the pair's own score), the same reading as Pairs'.
  function heatMatrix(C, typed, rec, prior) {
    C = C || {};
    typed = typed || {};
    const pair = C.pair || {},
      dir = C.dir || {},
      key = (a, b) => (a < b ? a + '|' + b : b + '|' + a),
      U = new Set();
    [...Object.keys(dir), ...Object.keys(typed)].forEach(k => k.split('|').forEach(u => u && U.add(u)));
    const pv = (a, b) => prior(a, b)[1],
      psc = (a, b) => K.confScore(pair[key(a, b)], pv(a, b)),
      pmix = (a, b) => (pair[key(a, b)] || [0, 0])[1];
    // the blocks: one per family, the biggest first (then by name); units with no family in one block, last
    const F = {};
    [...U].forEach(u => {
      const f = (rec(u) || {}).fam || '';
      (F[f] = F[f] || []).push(u);
    });
    const fams = Object.keys(F).sort((a, b) => !a - !b || F[b].length - F[a].length || (a < b ? -1 : a > b ? 1 : 0)),
      units = [],
      groups = [];
    fams.forEach(f => {
      const L = heatOrder(F[f], psc, pmix);
      groups.push([f, units.length, units.length + L.length - 1]);
      units.push(...L);
    });
    const cell = {};
    let mix = 0;
    Object.entries(dir).forEach(([k, c]) => {
      const [a, b] = k.split('|');
      if (!a || !b || !c || !c[0]) return;
      const [pt, p] = prior(a, b),
        pc = pair[key(a, b)];
      cell[k] = {
        off: c[0],
        mix: c[1],
        sc: K.confScore(c, p),
        pt,
        pv: p,
        look: pt === 'Look-alike',
        dl: pt !== 'Look-alike' && K.dataLook(pc, K.confScore(pc, p))
      };
      mix += c[1];
    });
    const nt = Object.values(typed).reduce((t, n) => t + n, 0);
    return {units, groups, cell, typed, mix, nt};
  }
  const API = {HEAT, heatBin, heatOrder, heatMatrix};
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else Object.assign(root, API);
})(this);

// ---- The admin view (browser only: admin.js state and helpers) ----
const HEAT_PAGE = 'analyses/difficulty/heatmap';
function statsHeat() {
  const S = ASUBJ,
    R = ofAns('rows-all:' + S.id, () => subjRows(ANS.all || ANS.rows || [], S.id)),
    many = !!S.sheets, // units at several ranks, named from the subject's data (fishAdmin), as on Pairs
    typedOn = SF.hm === 'typed';
  if (many && !FISHA) fishAdmin().then(() => cur === HEAT_PAGE && FISHA && render());
  const head = `<div class="adm-shead"><span class="adm-qseg adm-sseg" role="group" aria-label="Mix-ups">${[
    ['pick', 'From choices'],
    ['typed', 'Typed']
  ]
    .map(([v, t]) => `<button type="button" data-sf="hm" data-v="${v}" aria-pressed="${(v === 'typed') === typedOn}">${t}</button>`)
    .join('')}</span></div>`;
  if (!R.length) {
    $v.innerHTML = head + '<p class="note">No answers yet.</p>';
    bindStats();
    return;
  }
  const C = ofAns('conf:' + S.id, () => confusionOf(R)),
    NC = ofAns('nochoice:' + S.id, () => noChoiceMixups(R)),
    gx = n => DATA.gen[n] || ((DATA.x || {}).gen || {})[n] || {look: []},
    rec = n => (many ? fishUnitRec(FISHA, n, S.sheets.genus) : gx(n)),
    prior = (a, b) => pairPrior(a, b, rec(a), rec(b)),
    M = ofAns('heat:' + S.id + ':' + !!FISHA, () => heatMatrix(C, NC.typed, rec, prior)),
    U = M.units,
    // a unit's name: a coral genus as it is, another subject's unit by its name (fishAdmin)
    lab = n => (many ? (FISHA && FISHA.gen[n] ? FISHA.gen[n].name : String(n).replace(/^[a-z]:/, '')) : n),
    cmpOn = (S.pages || []).includes('cmp'),
    href = (a, b) => (cmpOn ? `./#${routeOut(`cmp-${a < b ? a + '|' + b : b + '|' + a}`, S)}` : ''),
    withCh = R.filter(r => r[10]).length;
  const kp = kpis([
    ['Answers with choices', `${withCh}/${R.length}`],
    ['On the map', U.length],
    ['Mix-ups', M.mix],
    ['Typed mix-ups', M.nt]
  ]);
  if (!U.length) {
    $v.innerHTML =
      head +
      kp +
      `<p class="note">No answer with its choices yet: sheet script v10 logs them${ANS.v >= 10 ? '' : ` (now v${esc(ANS.v || '?')})`}.</p>`;
    bindStats();
    return;
  }
  const fams = M.groups.some(g => g[0]),
    gStart = new Set(M.groups.map(g => g[1])),
    gOf = i => M.groups.find(g => g[1] <= i && i <= g[2]),
    it = many ? '' : ' hm-it',
    pc = (a, b) => Math.round((100 * a) / b) + '%';
  // One cell: the count in it, its colour by the rate (or by the typed count), its outline for a look-alike, hatched while
  // its offers are under CONF.N (the score still mostly its start: not enough data yet, rule A5), the title in words.
  const td = (i, j) => {
    const a = U[i],
      b = U[j],
      k = a + '|' + b,
      edge = (gStart.has(i) && i ? ' hm-fr' : '') + (gStart.has(j) && j ? ' hm-fc' : '');
    if (i === j) return `<td class="hm-d${edge}"></td>`;
    let cls, n, t;
    if (typedOn) {
      n = M.typed[k] || 0;
      if (!n) return `<td class="${edge.trim()}"></td>`;
      cls = 'hm-q' + heatBin(n, HEAT.TYPED);
      t = `${lab(a)} shown, ${lab(b)} typed: ${n} time${n === 1 ? '' : 's'}`;
    } else {
      const c = M.cell[k];
      if (!c) return `<td class="${edge.trim()}"></td>`;
      n = c.mix;
      cls = 'hm-q' + heatBin(c.sc) + (c.look ? ' hm-lk' : c.dl ? ' hm-dl' : '') + (c.off < CONF.N ? ' hm-lo' : '');
      t = `${lab(a)} shown, ${lab(b)} answered: ${c.mix} of ${c.off} offers (${pc(c.mix, c.off)}); score ${pc(c.sc, 1)}, from ${c.pt} ${pc(c.pv, 1)}${
        c.dl ? '; look-alike from the data' : ''
      }${c.off < CONF.N ? `; not enough data yet (under ${CONF.N} offers)` : ''}`;
    }
    const h = href(a, b),
      txt = n ? n : '';
    return `<td class="${cls}${edge}">${h ? `<a href="${esc(h)}" target="_blank" rel="noopener" title="${esc(t)}">${txt}</a>` : `<span title="${esc(t)}">${txt}</span>`}</td>`;
  };
  const colTh = U.map(
      (b, j) =>
        `<th scope="col" class="hm-col${it}${gStart.has(j) && j ? ' hm-fc' : ''}" title="${esc(lab(b))}"><span>${esc(lab(b))}</span></th>`
    ).join(''),
    body = U.map((a, i) => {
      const g = gOf(i),
        fam =
          fams && g[1] === i
            ? `<th class="hm-fam" rowspan="${g[2] - g[1] + 1}" title="${esc(g[0])}">${
                // the family's name where its rows hold it (about 6.5 px a letter, 22 px a row at the least), else its title only
                g[0].length * 6.5 <= (g[2] - g[1] + 1) * 22 ? `<span>${esc(g[0])}</span>` : ''
              }</th>`
            : '';
      return `<tr>${fam}<th scope="row" class="hm-row${it}${gStart.has(i) && i ? ' hm-fr' : ''}" title="${esc(lab(a))}">${esc(lab(a))}</th>${U.map((_, j) => td(i, j)).join('')}</tr>`;
    }).join('');
  const sw = (c, t) => `<span><i class="hm-sw ${c}"></i>${t}</span>`,
    leg = typedOn
      ? `<p class="adm-an-leg adm-hm-leg">${sw('hm-q1', '1')}${sw('hm-q2', '2')}${sw('hm-q3', '3-4')}${sw('hm-q4', '5+')}</p>`
      : `<p class="adm-an-leg adm-hm-leg">${sw('hm-q0', `Under ${pc(HEAT.BINS[0], 1)}`)}${sw('hm-q1', pc(HEAT.BINS[1], 1))}${sw('hm-q2', `${pc(CONF.TRAP, 1)} trap`)}${sw('hm-q3', pc(CONF.LOOK, 1))}${sw('hm-q4', 'More')}${sw(
          'hm-q2 hm-lo',
          `Under ${CONF.N} offers`
        )}${sw('hm-lk', 'Look-alike')}${sw('hm-dl', 'From the data')}</p>`;
  $v.innerHTML =
    head +
    kp +
    `<div class="adm-sgrid"><section class="adm-scard wide"><h3>${typedOn ? 'Typed mix-ups' : 'Mix-ups'}</h3>${leg}<div class="adm-hm" tabindex="0" role="region" aria-label="Shown (rows) against answered (columns)"><table class="adm-hmt${fams ? '' : ' nofam'}"><thead><tr><th class="hm-corner" colspan="${fams ? 2 : 1}"><span>Shown ↓</span><span>${typedOn ? 'Typed' : 'Answered'} →</span></th>${colTh}</tr></thead><tbody>${body}</tbody></table></div></section></div>`;
  bindStats();
}
