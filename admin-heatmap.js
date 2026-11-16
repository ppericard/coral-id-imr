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
// name it (core.js SUBJECTS admin pages): the corals first, then the fish (Pierre, 2026-11-14, Q123 m: "the fish, once
// their admin pages name the view").
// A subject with units at several ranks (SUBJECTS sheets: the fish's families, genera, species) has one matrix per rank
// the log asked (heatRanks: a rank switch, a rank on it once one of its questions is logged; the choices of a question
// are of the rank asked, so no pair crosses two ranks: heatRank keeps a rank's pairs), its units in blocks of the rank
// above (a genus in its family's, a species in its genus's; the top rank in its group of the identification key in force,
// rule S3, where the subject has one).
// Every view says what it can conclude (rule A5): under CONF.N offers a cell is hatched, and while most cells offered are
// (heatNeed), a line says not enough data yet, with about the answers it would take.
//
// The pure part (heatMatrix, heatOrder, heatBin, heatRanks, heatRank, heatNeed, HEAT) runs in Node too:
// tests/heatmap.test.js.
(function (root) {
  const K = typeof module !== 'undefined' && module.exports ? require('./core.js') : root;
  // The colour of a cell by its shrunk rate: under BINS[0] the lightest, from BINS[3] (a declared look-alike's start) the
  // darkest; BINS[2] is the quiz's trap bound (CONF.TRAP), which the quiz reads on the pair's two-way score, never on one
  // direction's cell as here. Typed mix-ups by their count: 1, 2, 3-4, 5 or more.
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
  // ({fam}); prior(a, b), the pair's start [name, rate] (admin.js pairPrior); roster, the subject's units, each on the map
  // even with no answer yet (its row and column empty: missing data shows; Codex review #889); blockOf(u), the block a unit
  // sits in, its record's fam by default (another subject's lower ranks: the unit of the rank above). Returns {units in display order, groups
  // [[family, first, last index]], cell {"shown|answered": {off, mix, sc, pt, pv, look, dl}}, typed (as given), mix (the
  // mix-ups from choices), nt (the typed ones)}. A cell's dl: the pair (both ways) is a look-alike from the data (core.js
  // dataLook on the pair's own score), the same reading as Pairs'.
  function heatMatrix(C, typed, rec, prior, roster, blockOf) {
    C = C || {};
    typed = typed || {};
    const pair = C.pair || {},
      dir = C.dir || {},
      key = (a, b) => (a < b ? a + '|' + b : b + '|' + a),
      U = new Set(roster || []),
      blk = blockOf || (u => (rec(u) || {}).fam);
    [...Object.keys(dir), ...Object.keys(typed)].forEach(k => k.split('|').forEach(u => u && U.add(u)));
    const pv = (a, b) => prior(a, b)[1],
      psc = (a, b) => K.confScore(pair[key(a, b)], pv(a, b)),
      pmix = (a, b) => (pair[key(a, b)] || [0, 0])[1];
    // the blocks: one per family, the biggest first (then by name); units with no family in one block, last
    const F = {};
    [...U].forEach(u => {
      const f = blk(u) || '';
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
  // The ranks a matrix is drawn at: of a subject with units at several ranks (sheets: {rank: its ids' prefix}, core.js
  // SUBJECTS sheets), the ranks one of R's questions asked (a row's unit shown, r[2], carries its rank's prefix), in the
  // subject's order, each [rank, prefix]; [] for a subject at one rank.
  const heatRanks = (R, sheets) =>
    Object.entries(sheets || {}).filter(([, p]) => p && (R || []).some(r => String(r[2] || '').startsWith(p)));
  // One rank's part of confusionOf's {pair, dir} and of the typed mix-ups: the keys whose two units carry its prefix.
  function heatRank(C, typed, pre) {
    const on = k => k.split('|').every(u => u.startsWith(pre)),
      cut = O => Object.fromEntries(Object.entries(O || {}).filter(([k]) => on(k)));
    return {C: {pair: cut((C || {}).pair), dir: cut((C || {}).dir)}, typed: cut(typed)};
  }
  // What the matrix can conclude (rule A5), from its cells (heatMatrix cell) and the answers with choices behind them
  // (withCh): n cells offered, lo of them under N offers (hatched: the colour still mostly the pair's start), the offers
  // they lack to reach N (short), and about the answers with choices that would bring them there (need: the offers they
  // lack over the offers an answer has brought a cell so far, every new offer landing on a short cell; an estimate at
  // today's mix of formats, not a bound: a four-choice answer brings more offers than a duel, Codex review #1012). thin:
  // most cells offered are under N, so the map as a whole is not enough data yet.
  function heatNeed(cell, withCh, N = K.CONF.N) {
    const L = Object.values(cell || {}),
      lo = L.filter(c => c.off < N),
      off = L.reduce((t, c) => t + c.off, 0),
      short = lo.reduce((t, c) => t + N - c.off, 0);
    return {
      n: L.length,
      lo: lo.length,
      short,
      need: short && off && withCh ? Math.ceil(short / (off / withCh)) : 0,
      thin: 2 * lo.length > L.length
    };
  }
  const API = {HEAT, heatBin, heatOrder, heatMatrix, heatRanks, heatRank, heatNeed};
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else Object.assign(root, API);
})(this);

// ---- The admin view (browser only: admin.js state and helpers) ----
const HEAT_PAGE = 'analyses/difficulty/heatmap';
function statsHeat() {
  const S = ASUBJ,
    R = ofAns('rows-all:' + S.id, () => subjRows(ANS.all || ANS.rows || [], S.id)),
    many = !!S.sheets, // units at several ranks, named from the subject's data (unitAdmin: fishAdmin for the fish), as on Pairs
    FA = many ? unitRegOf(S) : null,
    typedOn = SF.hm === 'typed',
    // the ranks the log asked (heatRanks), the one on screen (SF.hr, kept per browser; the first by default) and its
    // place among the subject's ranks (0: its top rank, even when the log asked only a lower one: Codex review #1012)
    ranks = heatRanks(R, S.sheets),
    rk = ranks.find(r => r[0] === SF.hr) || ranks[0],
    ri = rk ? Object.keys(S.sheets).indexOf(rk[0]) : 0;
  if (many && !FA) unitAdmin(S).then(() => cur === HEAT_PAGE && unitRegOf(S) && render());
  const seg = (k, L, on, aria) =>
      `<span class="adm-qseg adm-sseg" role="group" aria-label="${aria}">${L.map(
        ([v, t]) => `<button type="button" data-sf="${k}" data-v="${esc(v)}" aria-pressed="${v === on}">${esc(t)}</button>`
      ).join('')}</span>`,
    head = `<div class="adm-shead">${
      // the rank switch, by the subject's words for its ranks (Families, Genera, Species), once two ranks are logged
      ranks.length > 1
        ? seg(
            'hr',
            ranks.map(([k]) => [k, {family: 'Families', genus: 'Genera', species: 'Species'}[k] || k]),
            rk[0],
            'Rank'
          )
        : ''
    }${seg(
      'hm',
      [
        ['pick', 'From choices'],
        ['typed', 'Typed']
      ],
      typedOn ? 'typed' : 'pick',
      'Mix-ups'
    )}</div>`;
  if (!R.length) {
    $v.innerHTML = head + '<p class="note">No answers yet.</p>';
    bindStats();
    return;
  }
  // a unit's name: a coral genus as it is, another subject's unit by its name (its registry), else its id's prefix off
  const lab = n => (many ? (FA && FA.gen[n] ? FA.gen[n].name : String(n).replace(/^[a-z]:/, '')) : n),
    // trust and the pairs over the subject's whole log, as Pairs reads them; then the rank's part (heatRank)
    C0 = ofAns('conf:' + S.id, () => confusionOf(R)),
    NC = ofAns('nochoice:' + S.id, () => noChoiceMixups(R)),
    P = rk ? ofAns('heatrk:' + S.id + ':' + rk[0], () => heatRank(C0, NC.typed, rk[1])) : {C: C0, typed: NC.typed},
    Rr = rk ? R.filter(r => String(r[2] || '').startsWith(rk[1])) : R,
    gx = n => DATA.gen[n] || ((DATA.x || {}).gen || {})[n] || {look: []},
    rec = n => (many ? fishUnitRec(FA, n, S.sheets.genus) : gx(n)),
    prior = (a, b) => pairPrior(a, b, rec(a), rec(b)),
    // the blocks of another subject's units: below its top rank, the unit of the rank above (a species' genus, a genus's
    // family); at its top rank, its group in the identification key in force (rule S3), none where it has no key
    grp = n => {
      const g = FA && FA.gen[n],
        k = g && g.ig && (FA.groups || []).find(x => x.n === g.ig);
      return k ? `${k.n}. ${k.title}` : '';
    },
    up = n => FA && ((FA.spid[n] && FA.spg[FA.spid[n]]) || FA.fam[n]),
    blockOf = many ? (ri ? n => (up(n) ? lab(up(n)) : '') : grp) : undefined,
    // the roster: the corals' slate (core.js slateOf: the games' and the progress's genera), the bonus genera once met;
    // another subject's top rank its slate (every family in the game), its lower ranks as met
    roster = many ? (!ri && FA ? FA.slate : []) : slateOf(DATA),
    M = ofAns('heat:' + S.id + ':' + !!FA + ':' + (rk ? rk[0] : ''), () => heatMatrix(P.C, P.typed, rec, prior, roster, blockOf)),
    U = M.units,
    cmpOn = (S.pages || []).includes('cmp'),
    href = (a, b) => (cmpOn ? `./#${routeOut(`cmp-${a < b ? a + '|' + b : b + '|' + a}`, S)}` : ''),
    withCh = Rr.filter(r => r[10]).length,
    // the offers an answer brings a cell, over the answers the cells count: the trusted players' only, as confusionOf
    // keeps them (Codex review #1012)
    tr = ofAns('trust:' + S.id, () => trustOf(R)),
    nd = heatNeed(M.cell, Rr.filter(r => r[10] && tr[r[0]]).length);
  const kp = kpis([
    ['Answers with choices', `${withCh}/${Rr.length}`],
    ['On the map', U.length],
    ['Mix-ups', M.mix],
    ['Typed mix-ups', M.nt],
    [`Cells with ${CONF.N}+ offers`, `${nd.n - nd.lo}/${nd.n}`]
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
    // scientific names in italics: the corals' genera, another subject's units below its top rank (genera, species)
    it = many && !ri ? '' : ' hm-it',
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
                // the family's name where its rows hold it (about 7 px a letter, 22 px a row at the least), else its title only
                g[0].length * 7 <= (g[2] - g[1] + 1) * 22 ? `<span>${esc(g[0])}</span>` : ''
              }</th>`
            : '';
      return `<tr>${fam}<th scope="row" class="hm-row${it}${gStart.has(i) && i ? ' hm-fr' : ''}" title="${esc(lab(a))}">${esc(lab(a))}</th>${U.map((_, j) => td(i, j)).join('')}</tr>`;
    }).join('');
  const sw = (c, t) => `<span><i class="hm-sw ${c}"></i>${t}</span>`,
    leg = typedOn
      ? `<p class="adm-an-leg adm-hm-leg">${sw('hm-q1', '1')}${sw('hm-q2', '2')}${sw('hm-q3', '3-4')}${sw('hm-q4', '5+')}</p>`
      : `<p class="adm-an-leg adm-hm-leg">${
          // each strength by its interval (heatBin: from a bound, under the next); the third bound is the quiz's trap bound (on the two-way score)
          HEAT.BINS.map((x, k) => sw('hm-q' + k, k ? `${pc(HEAT.BINS[k - 1], 1)}-${pc(x, 1)}` : `Under ${pc(x, 1)}`)).join('') +
          sw('hm-q' + HEAT.BINS.length, `${pc(HEAT.BINS[HEAT.BINS.length - 1], 1)}+`)
        }${sw('hm-q2 hm-lo', `Under ${CONF.N} offers`)}${sw('hm-lk', 'Look-alike')}${sw('hm-dl', 'From the data')}</p>`;
  $v.innerHTML =
    head +
    kp +
    // what the map can conclude (rule A5): not enough data yet while most cells offered are under CONF.N offers, with the
    // answers with choices it would take, about (heatNeed)
    (nd.thin && !typedOn
      ? `<p class="note">Not enough data yet: ${nd.lo} of the ${nd.n} cells offered are under ${CONF.N} offers; about ${nd.need} more answers with choices${rk && ranks.length > 1 ? ' at this rank' : ''} to bring them there.</p>`
      : '') +
    `<div class="adm-sgrid"><section class="adm-scard wide"><h3>${typedOn ? 'Typed mix-ups' : 'Mix-ups'}</h3>${leg}<div class="adm-hm" tabindex="0" role="region" aria-label="Shown (rows) against answered (columns)"><table class="adm-hmt${fams ? '' : ' nofam'}"><thead><tr><th class="hm-corner" colspan="${fams ? 2 : 1}"><span>Shown ↓</span><span>${typedOn ? 'Typed' : 'Answered'} →</span></th>${colTh}</tr></thead><tbody>${body}</tbody></table></div></section></div>`;
  bindStats();
}
