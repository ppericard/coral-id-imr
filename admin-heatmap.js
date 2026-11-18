// Analyses › Difficulty › Heatmap (#analyses/difficulty/heatmap; docs/reviews/2026-11-05-fish-confusion-study.md
// question m; docs/ARCHITECTURE.md "Analyses"): every unit against every unit, read live
// from the answer log as Pairs is (admin.js statsConf: the same confusionOf and noChoiceMixups, memoised once per log).
// Rows: the unit shown (the photo's); columns: the unit answered. A cell: the times the column was answered when it was
// offered beside the row (core.js confusionOf dir, [offered, answered]), and its rate shrunk toward the pair's start as
// Pairs' Score is (confScore toward pairPrior: declared look-alike, same family, other; the study's §4.2, the same
// confScore and CONF.W at every level). The units in blocks of their family (their record's fam, the prior's own field,
// the study's "entry and genus blocks"; never by growth form, rule C4), the biggest block first, each block ordered so the
// pairs mixed up most sit side by side (heatOrder). Typed mix-ups (no choices, so no rate) are listed apart, as on
// Pairs. A cell opens the pair on the site's compare page when the subject has one. Only the subjects whose admin pages
// name it (core.js SUBJECTS admin pages); the sea slugs' genera sit in their family's block, the families in their
// taxonomic group (supOf, the tree's taxa).
// A subject with units at several ranks (SUBJECTS sheets: the fish's families, genera, species) has one matrix per rank
// the log asked (heatRanks: a rank switch, a rank on it once one of its questions is logged; the choices of a question
// are of the rank asked, so no pair crosses two ranks: heatRank keeps a rank's pairs), its units in blocks of the rank
// above (a genus in its family's, a species in its genus's; the top rank in its group of the identification key in force,
// rule S3, where the subject has one); below the top rank, where the subject's tree sorts its families into taxonomic
// groups (seaslug.json taxa), a column of the groups beside the families' (heatMatrix supOf).
// Every view says what it can conclude (rule A5): under CONF.N offers a cell is hatched, and while most cells offered are
// (heatNeed), a line says not enough data yet, with about the answers it would take.
//
// One player's map: the same map from that player's answers only, a
// filter on the view (?player=<anonymous id>; rule A2: same information, a filter), picked over the map (heatPlayers) or
// opened from the Mix-ups card of their Journey; their part of the cells above, by the same rules (their answers count once
// they are above chance, core.js trustOf, as for everyone). A deleted, merged or archived account has no answers here
// (rule D7: admin.js rowsOf), so it shows nothing.
//
// The pure part (heatMatrix, heatOrder, heatBin, heatRanks, heatRank, heatNeed, heatPlayers, HEAT) runs in Node too:
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
  // even with no answer yet (its row and column empty: missing data shows); blockOf(u), the block a unit
  // sits in, its record's fam by default (another subject's lower ranks: the unit of the rank above); supOf(u), the group
  // a unit's block sits in, when the subject sorts its blocks into groups (the families in their taxonomic group: the
  // tree's taxa), the blocks of one group then in one run, the biggest group first, as the blocks. Returns {units in display
  // order, groups [[family, first, last index]], sups [[group, first, last index]] (none without supOf), cell
  // {"shown|answered": {off, mix, sc, pt, pv, look, dl}}, typed (as given), mix (the mix-ups from choices), nt (the typed
  // ones)}. A cell's dl: the pair (both ways) is a look-alike from the data (core.js dataLook on the pair's own score), the
  // same reading as Pairs'.
  function heatMatrix(C, typed, rec, prior, roster, blockOf, supOf) {
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
    // the blocks: one per family, the biggest first (then by name); units with no family in one block, last; with supOf,
    // first by their group (the biggest first, then by name; blocks in no group last)
    const F = {},
      cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
    [...U].forEach(u => {
      const f = blk(u) || '';
      (F[f] = F[f] || []).push(u);
    });
    const sup = f => (supOf && f && supOf(F[f][0])) || '',
      SN = {};
    Object.keys(F).forEach(f => (SN[sup(f)] = (SN[sup(f)] || 0) + F[f].length));
    const bySup = (a, b) => {
        const x = sup(a),
          y = sup(b);
        return x === y ? 0 : !x - !y || SN[y] - SN[x] || cmp(x, y);
      },
      fams = Object.keys(F).sort((a, b) => bySup(a, b) || !a - !b || F[b].length - F[a].length || cmp(a, b)),
      units = [],
      groups = [],
      sups = [];
    fams.forEach(f => {
      const L = heatOrder(F[f], psc, pmix),
        s = sup(f),
        last = sups[sups.length - 1];
      groups.push([f, units.length, units.length + L.length - 1]);
      if (supOf) {
        if (last && last[0] === s) last[2] += L.length;
        else sups.push([s, units.length, units.length + L.length - 1]);
      }
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
    return {units, groups, sups, cell, typed, mix, nt};
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
  // today's mix of formats, not a bound: a four-choice answer brings more offers than a duel). thin:
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
  // The players a map can be drawn for (one player's map): the ids of R, a subject's rows
  // with the answers a deleted, merged or archived account left already out (admin.js rowsOf, rule D7), each [id, label,
  // signed in]: the signed-in ones (users, the player list's {name, id}) by name, then the devices that never signed in by
  // their anonymous id, the latest to answer first, as Players lists them.
  function heatPlayers(R, users) {
    const last = new Map();
    (R || []).forEach(r => r[0] && last.set(r[0], Math.max(last.get(r[0]) || 0, r[1] || 0)));
    const named = (users || []).filter(u => u && u.id && u.name && last.has(u.id)),
      ids = new Set(named.map(u => u.id));
    return [
      ...named.map(u => [u.id, u.name, 1]).sort((a, b) => a[1].localeCompare(b[1])),
      ...[...last.keys()]
        .filter(id => !ids.has(id))
        .sort((a, b) => last.get(b) - last.get(a))
        .map(id => [id, id, 0])
    ];
  }
  const API = {HEAT, heatBin, heatOrder, heatMatrix, heatRanks, heatRank, heatNeed, heatPlayers};
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else Object.assign(root, API);
})(this);

// ---- The admin view (browser only: admin.js state and helpers) ----
const HEAT_PAGE = 'analyses/difficulty/heatmap';
function statsHeat() {
  const S = ASUBJ,
    // one player's map (?player=<their anonymous id>): their rows only; the players with answers here (heatPlayers), a
    // deleted, merged or archived account none (rowsOf, rule D7), so it shows nothing
    who = hashQuery().get('player') || '',
    PL = heatPlayers(rowsOf(S), USERS && USERS.users),
    me = who ? PL.find(p => p[0] === who) : null,
    pk = who ? ':' + who : '',
    R = who
      ? me
        ? ofAns('rows-pl:' + S.id + pk, () => rowsOf(S).filter(r => r[0] === who))
        : []
      : ofAns('rows-all:' + S.id, () => subjRows(ANS.all || ANS.rows || [], S.id)),
    many = !!S.sheets, // units at several ranks, named from the subject's data (unitAdmin: fishAdmin for the fish), as on Pairs
    FA = many ? unitRegOf(S) : null,
    typedOn = SF.hm === 'typed',
    // the ranks the log asked (heatRanks), the one on screen (SF.hr, kept per browser; the first by default) and its
    // place among the subject's ranks (0: its top rank, even when the log asked only a lower one)
    ranks = heatRanks(R, S.sheets),
    rk = ranks.find(r => r[0] === SF.hr) || ranks[0],
    ri = rk ? Object.keys(S.sheets).indexOf(rk[0]) : 0;
  if (many && !FA) unitAdmin(S).then(() => cur === HEAT_PAGE && unitRegOf(S) && render());
  const seg = (k, L, on, aria) =>
      `<span class="adm-qseg adm-sseg" role="group" aria-label="${aria}">${L.map(
        ([v, t]) => `<button type="button" data-sf="${k}" data-v="${esc(v)}" aria-pressed="${v === on}">${esc(t)}</button>`
      ).join('')}</span>`,
    // the player picker (Everyone, the signed-in players by name, the devices by their anonymous id) and, for one player,
    // their Journey (in this subject, as its own Corals | Fish keeps it)
    opt = L => L.map(([id, t]) => `<option value="${esc(id)}"${id === who ? ' selected' : ''}>${esc(t)}</option>`).join(''),
    anon = PL.filter(p => !p[2]),
    pick =
      PL.length || who
        ? `<select class="adm-fgsel" data-hmwho aria-label="Player"><option value="">Everyone</option>${
            // a player with no answers here (the other subject's only; a removed account: its id, nothing else)
            who && !me
              ? `<option value="${esc(who)}" selected disabled>${esc((((USERS && USERS.users) || []).find(u => u.id === who) || {}).name || who)}</option>`
              : ''
          }${opt(PL.filter(p => p[2]))}${anon.length ? `<optgroup label="Not signed in">${opt(anon)}</optgroup>` : ''}</select>${
            me
              ? `<a class="adm-fchip plain" data-own href="#${esc(S.hash + (me[2] ? 'players/list/journey/' + encodeURIComponent(me[1]) : 'players/list/anon/' + encodeURIComponent(who)))}">Journey</a>`
              : ''
          }`
        : '',
    head = `<div class="adm-shead">${pick}${
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
  // the view's switches (bindStats) and the player picker: a player's map is the view's address with ?player=, Everyone without
  const bind = () => {
    bindStats();
    const w = $v.querySelector('[data-hmwho]');
    if (w) w.onchange = () => (location.hash = '#' + S.hash + HEAT_PAGE + (w.value ? '?player=' + encodeURIComponent(w.value) : ''));
  };
  if (!R.length) {
    // nothing logged in this subject yet (a subject just opened to its group): what the map can conclude (rule A5)
    $v.innerHTML = head + `<p class="note">${who ? 'No answers from this player here.' : 'Not enough data yet: no answers yet.'}</p>`;
    bind();
    return;
  }
  // a unit's name: a coral genus as it is, another subject's unit by its name (its registry), else its id's prefix off
  const lab = n => (many ? (FA && FA.gen[n] ? FA.gen[n].name : String(n).replace(/^[a-z]:/, '')) : n),
    // trust and the pairs over the subject's whole log, as Pairs reads them; then the rank's part (heatRank)
    // (one player's: their part, by the same rules; each memo kept apart by pk)
    C0 = ofAns('conf:' + S.id + pk, () => confusionOf(R)),
    NC = ofAns('nochoice:' + S.id + pk, () => noChoiceMixups(R)),
    P = rk ? ofAns('heatrk:' + S.id + ':' + rk[0] + pk, () => heatRank(C0, NC.typed, rk[1])) : {C: C0, typed: NC.typed},
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
    // below its top rank, the families' blocks in their taxonomic group where its tree sorts them so (its taxa: a family's
    // tg, the Learn page's headings), the group of the nearest unit above that has one
    tx = many && ri && FA && FA.taxa ? FA.taxa.groups || [] : null,
    supOf = tx
      ? n => {
          for (let x = n, i = 0; x && i < 4; x = up(x), i++) {
            const t = FA.gen[x] && FA.gen[x].tg;
            if (t) return (tx.find(g => g.n === t) || {}).title || '';
          }
          return '';
        }
      : undefined,
    // the roster: the corals' slate (core.js slateOf: the games' and the progress's genera), the bonus genera once met;
    // another subject's slate at the rank on screen (the fish: every family in the game at their top rank; the sea slugs:
    // every genus at theirs, their units' rank, core.js unitRankOf), its other ranks as met
    roster = many ? (FA ? FA.slate.filter(u => (rk ? String(u).startsWith(rk[1]) : !ri)) : []) : slateOf(DATA),
    M = ofAns('heat:' + S.id + ':' + !!FA + ':' + (rk ? rk[0] : '') + pk, () =>
      heatMatrix(P.C, P.typed, rec, prior, roster, blockOf, supOf)
    ),
    U = M.units,
    cmpOn = (S.pages || []).includes('cmp'),
    href = (a, b) => (cmpOn ? `./#${routeOut(`cmp-${a < b ? a + '|' + b : b + '|' + a}`, S)}` : ''),
    withCh = Rr.filter(r => r[10]).length,
    // the offers an answer brings a cell, over the answers the cells count: the trusted players' only, as confusionOf
    // keeps them
    tr = ofAns('trust:' + S.id + pk, () => trustOf(R)),
    nd = heatNeed(M.cell, Rr.filter(r => r[10] && tr[r[0]]).length);
  const kp = kpis([
    ['Answers with choices', `${withCh}/${Rr.length}`],
    ['On the map', U.length],
    ['Mix-ups', M.mix],
    ['Typed mix-ups', M.nt],
    [`Cells with ${CONF.N}+ offers`, `${nd.n - nd.lo}/${nd.n}`]
  ]);
  if (!U.length) {
    $v.innerHTML = head + kp + `<p class="note">No answer with its choices yet.</p>`;
    bind();
    return;
  }
  const fams = M.groups.some(g => g[0]),
    // the families' groups in a column of their own, left of the families (supOf)
    sp = fams && M.sups.some(g => g[0]),
    gStart = new Set(M.groups.map(g => g[1])),
    gOf = i => M.groups.find(g => g[1] <= i && i <= g[2]),
    sOf = i => M.sups.find(g => g[1] <= i && i <= g[2]),
    // a block's name where its rows hold it (about 7 px a letter, 22 px a row at the least), else its title only
    bth = (cls, g) =>
      `<th class="${cls}" rowspan="${g[2] - g[1] + 1}" title="${esc(g[0])}">${
        g[0].length * 7 <= (g[2] - g[1] + 1) * 22 ? `<span>${esc(g[0])}</span>` : ''
      }</th>`,
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
        s = sp && sOf(i),
        fam = (s && s[1] === i ? bth('hm-fam hm-sup', s) : '') + (fams && g[1] === i ? bth('hm-fam', g) : '');
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
    // one player's answers count once they are above chance (trustOf), as everyone's: until then, no cell, and the line says why
    (me && !tr[who]
      ? `<p class="note">Not enough data yet: their answers count in the mix-ups once they are ${TRUST.N} or more and clearly above chance, as everyone's.</p>`
      : nd.thin && !typedOn
        ? `<p class="note">Not enough data yet: ${nd.lo} of the ${nd.n} cells offered are under ${CONF.N} offers; about ${nd.need} more ${me ? 'of their ' : ''}answers with choices${rk && ranks.length > 1 ? ' at this rank' : ''} to bring them there.</p>`
        : // answers, but no cell yet (a subject's first few answers): none with choices counts yet, the same rule as everyone's
          !nd.n && !typedOn
          ? `<p class="note">Not enough data yet: no answer with choices counts yet (a player's count once they are ${TRUST.N} or more and clearly above chance).</p>`
          : '') +
    `<div class="adm-sgrid"><section class="adm-scard wide"><h3>${typedOn ? 'Typed mix-ups' : 'Mix-ups'}</h3>${leg}<div class="adm-hm" tabindex="0" role="region" aria-label="Shown (rows) against answered (columns)"><table class="adm-hmt${fams ? '' : ' nofam'}${sp ? ' sup' : ''}"><thead><tr><th class="hm-corner" colspan="${1 + fams + sp}"><span>Shown ↓</span><span>${typedOn ? 'Typed' : 'Answered'} →</span></th>${colTh}</tr></thead><tbody>${body}</tbody></table></div></section></div>`;
  bind();
}
