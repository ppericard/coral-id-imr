// IMR Reef ID: My progress, the progress pill, the leaderboard and achievements. A classic script like app.js and
// sync.js: it shares their top-level names and loads right after sync.js (index.html order); app.js waits for every
// script (window.BOOT) before its first page. Required like app.js: the loader tries it 3 times, the service worker keeps it.
// The progress board fits one screen: the slate's covers in slate order beside a side column (overall ring, what to
// review first, mix-ups). Signing in, backup and reset live in the header and ⚙, never around the board.
// A subject with a global score (core.js SUBJECTS score) shows its parts under the name, from the ring's own computation
// (model.js headScore, core.js treeScore): families, species by common name, species by scientific name.
const scoreBars = H =>
  H
    ? `<div class="pbars" role="list" aria-label="Your progress in parts">${[
        ['Families', H.entries],
        ['Common names', H.common],
        ['Scientific names', H.S]
      ]
        .map(([t, x]) => {
          const v = Math.round(100 * x);
          return `<span role="listitem" title="${t}: ${v}%"><small>${t}</small><span class="bar"><span style="width:${v}%"></span></span><b>${v}%</b></span>`;
        })
        .join('')}</div>`
    : '';
// The player's card at the top of My progress: the overall ring and %, the name, rank and Elo (the rank once the
// leaderboard loads), units learned or met, achievements with the last three. The Elo is always this device's own level
// (P[LEVEL], eloLine), never the board's copy, so it does not jump when the board arrives (docs/LEARNING.md "One player
// level shown"; the card itself: docs/decisions/2026-11-18-decisions-from-comments-3.md).
function badge(ring, pct, sub) {
  const A = store.get(ACHK, {}) || {},
    got = ACH_L()
      .filter(a => A[a.id])
      .sort((x, y) => A[y.id] - A[x.id]),
    name = SYNC && SYNC.name ? SYNC.name : '',
    G = P[LEVEL];
  return `<div class="pbadge"><div class="pring" style="background:conic-gradient(${ring})"><span><b>${pct}%</b></span></div>
    <div class="pbtxt"><b>${name ? esc(name) : 'Not signed in'}</b>
    <em class="pbunl">${unlockText(slateGenera(), true)}</em>
    <span>${sub ? `<span>${sub}</span>` : ''}${boardLive(SUBJ) ? `<a id="pbrank" href="${esc(hr('board'))}"${eloLine(G) ? '' : ' hidden'}>🏆 ${eloLine(G)}</a>` : ''}${
      SUBJ.ach
        ? `<a href="${esc(hr('ach'))}"${achNew() ? ' class="hasnew"' : ''}>🏅 <b>${got.length}</b>/${ACH_L().length} ${got
            .filter((a, i) => got.findIndex(b => b.icon === a.icon) === i) // the latest of each kind: three different icons
            .slice(0, 3)
            .map(a => `<span title="${esc(a.title)}">${a.icon}</span>`)
            .join('')}</a>`
        : ''
    }</span>${scoreBars(headScore())}</div></div>`;
}
// A name of 13+ letters (Duncanopsammia) gets a soft hyphen near its middle, between a vowel and a consonant: a phone
// tile breaks it there with a hyphen instead of anywhere, at the normal size.
const shyName = n => {
  if (n.length < 13) return n;
  const V = /[aeiouy]/i;
  for (let d = 0; d < n.length / 2 - 3; d++)
    for (const i of [Math.round(n.length / 2) + d, Math.round(n.length / 2) - d])
      if (V.test(n[i - 1]) && !V.test(n[i])) return n.slice(0, i) + '\u00ad' + n.slice(i);
  return n;
};
// Your tricky pairs (the name study's (f), Q124; docs/decisions/2026-11-19-tricky-pairs.md): the pairs of units the
// player mixes up most, from their own answers only (core.js pairConf: [offered together, mixed up], both directions).
// A pair counts once mixed up TRICKY.MIN times; ranked by its own mix-up rate shrunk toward 0 by CONF.W offers (core.js
// confScore with no prior), so a pair the player now tells apart sinks as offers come with no new mix-up; ties: more
// mix-ups first. TRICKY.N at most. Read only: the draw, the model and the score never see it. units: the units the board
// draws; known: a unit of the subject (GX); hide: a unit not to name (a mystery tile). Pure on its inputs
// (tests/tricky.test.js). [[a, b, mixed up, offered]], a before b by name.
const TRICKY = {MIN: 2, N: 3};
const trickyPairs = (P, units, known, hide = () => false) => {
  const seen = new Set(),
    L = [];
  for (const n of units)
    for (const o of Object.keys((P[n] || {}).conf || {})) {
      const [a, b] = n < o ? [n, o] : [o, n],
        k = a + '|' + b;
      if (a === b || seen.has(k) || !known(o) || hide(a) || hide(b)) continue;
      seen.add(k);
      const [off, mix] = pairConf(P, a, b);
      if (mix >= TRICKY.MIN) L.push([a, b, mix, off, confScore([off, mix], 0)]);
    }
  return L.sort((x, y) => y[4] - x[4] || y[2] - x[2])
    .slice(0, TRICKY.N)
    .map(x => x.slice(0, 4));
};
// The section in the side column: a chip per pair, a link to the pair's comparison when the subject has one (link(a, b),
// else ''), a plain chip otherwise; nothing when there is no pair. name: the unit's name in the subject's words (uname).
const trickyHTML = (L, name, link) =>
  L.length
    ? `<div class="ptricky"><h3 class="label">Your tricky pairs</h3><p class="chips">${L.map(([a, b, mix, off]) => {
        const href = link(a, b),
          t = `Mixed up ${mix} times in ${off} questions that offered both${href ? '. Compare them side by side' : ''}`,
          // one inline box inside the flex chip, so the spaces around ↔ and before the count stay
          inner = `<span>${name(a)} ↔ ${name(b)} <small>· ${mix} of ${off}</small></span>`;
        return href ? `<a class="chip" href="${href}" title="${t}">${inner}</a>` : `<span class="chip" title="${t}">${inner}</span>`;
      }).join('')}</p></div>`
    : '';
function quizBoard() {
  const list = slateGenera(),
    // A unit's page: its genus sheet, or the subject's list when it has no sheets (fish); a pair's comparison, when the
    // subject has that page ('' otherwise).
    href = n => esc(hr(SUBJ.pages.includes('sheet') ? `g-${n}` : 'genera')),
    hrefPair = (a, b) => (SUBJ.pages.includes('cmp') ? esc(hr(`cmp-${a}|${b}`)) : '');
  // The units of the opt-in sets in play (bonusList), kept out of the ring and the counts, split by rank (boardParts):
  // the ones at the slate's own rank (the coral bonus genera) follow it in its grid (BO); every other set has its own
  // section below (SECT).
  const BA = bonusList(),
    {grid: BO, sections: SECT} = boardParts(BA);
  const shown = boardTiles(list, BA, SECT),
    lv = Object.fromEntries(shown.map(n => [n, shownLevel(n)]));
  const count = k => list.filter(n => lv[n][0] === k).length;
  const weak = list.filter(n => lv[n][0] === 'weak').sort((a, b) => weight(b) - weight(a));
  // Mastery level on a 6-step scale (one colour ramp, light to dark; model.js MASTERY: Not seen, Snorkeler, Open Water,
  // Advanced, Divemaster, Instructor). "Review" is a separate marker, so it never hides the level.
  const st = Object.fromEntries(shown.map(n => [n, lvStep(n)])),
    nst = k => list.filter(n => st[n] === k).length;
  let deg = 0;
  const ring = [5, 4, 3, 2, 1, 0]
    .map(k => {
      const d = (360 * nst(k)) / list.length,
        c = `${k ? `var(--lv${k})` : 'var(--line)'} ${deg}deg ${deg + d}deg`;
      deg += d;
      return c;
    })
    .join(',');
  // Step 0 counts the genera not asked yet, met on a card or not ("Not seen" would also count the ones met on a card).
  const STEPS = MASTERY.map(([t], k) => [k, k ? t : 'Not asked yet']);
  // A unit never met, for a player who sees mystery tiles (mysteryOf, above): in every view, the same "?" in place of its
  // name, no cover, no link to its page, no tooltip naming it (the slate keeps the tile's number, as on the IMR slate).
  const myst = mysteryOf(),
    mystA = (cls, inner, n) => `<a class="${cls} s0 myst" title="${mystT(n)}" aria-label="${mystT(n)}">${inner}</a>`;
  // Photo wall: the cover in full colour (grey = not seen) with a name band coloured by the genus's step on the scale,
  // holding the mini ring + % like the Slate and Groups tiles; review = an amber dot (app.css).
  const tile = (n, tagged = true) => {
    if (myst(n)) return mystA('pw', '<span class="pwq" aria-hidden="true">?</span>', n);
    const g = GX(n),
      p = cover(g),
      [cl] = lv[n];
    const b = isBonus(n);
    return `<a class="pw ${cl} s${st[n]}${b ? ' bonus' : ''}" href="${href(n)}" title="${b ? (g.name ? setOf(n).tag + '. ' : 'Bonus genus, not on the IMR list. ') : isBenthic(n) ? 'Fire coral, on the IMR benthic slate. ' : ''}${tip(n)}">${p ? `<img ${thumb(p, '(max-width:599.98px) 100px, 165px')} alt="" loading="lazy">` : ''}${b && tagged ? `<b class="pbtag">${g.name ? esc(setOf(n).tag) : 'Bonus'}</b>` : ''}<span class="pwb">${g.name ? `<b>${uname(n)}</b>` : `<i>${esc(shyName(n))}${g.n || g.x ? '' : ' ★'}</i>`}${pct(n)}</span></a>`;
  };
  // Your tricky pairs (trickyPairs, above): from the units the board draws, never naming a mystery tile; the chip opens
  // the side-by-side comparison (with "Drill this pair") where the subject has it.
  const tricky = trickyPairs(P, shown, GX, myst);
  // The tile's tooltip: name, level, % and the right answers, photos seen, what is still needed.
  const tip = n => {
    const s = P[n] || {ok: 0, ko: 0},
      m = lv[n][0] === 'mid' || lv[n][0] === 'weak' ? missing(n) : [];
    return `${esc(unameT(n))}: ${st[n] ? MASTERY[st[n]][0] : introduced(n) ? 'Met, not asked yet' : 'Not seen'}${lv[n][0] === 'weak' ? ', to review' : ''}${st[n] > 0 && st[n] < 5 ? ` (${Math.round(100 * genScore(n))}%)` : ''}${s.ok + s.ko ? ` (${s.ok}/${s.ok + s.ko} right). Photos: ${photoBand(n)}, ${seenOf(n)}` : ''}${m.length ? '. Still needed: ' + esc(m.join('; ')) : ''}`;
  };
  // Learning level: the tile's colour is its step on the scale, and a thin line along its bottom shows the exact progress.
  const fill = () => '';
  // The same progress as a mini ring + number (ring alone on narrow tiles, nothing on the narrowest).
  const pct = n =>
    st[n] > 0 && st[n] < 5
      ? `<small class="pct" style="--p:${Math.round(100 * genScore(n))}%">${Math.round(100 * genScore(n))}%</small>`
      : '';
  // The sets that are not at the slate's rank, each its own section under the view: the photo wall's tiles, smaller, with
  // no tag (the heading names the set); every view shows them the same way.
  const sects = () =>
    SECT.map(
      ({S, L}) =>
        `<h3 class="label psech">${esc(S.name)}</h3><div class="pgrid pwall psect" data-set="${esc(S.k)}">${L.map(n => tile(n, false)).join('')}</div>`
    ).join('');
  const gi = n => shownGroup(n) || 99,
    groups = [...new Set(list.map(gi))].sort((a, b) => a - b);
  const VIEWS = {
    photos: () => `<div class="pgrid pwall"${isPhone() ? ' data-minw="72"' : ''}>${[...list, ...BO].map(n => tile(n)).join('')}</div>`,
    // Laid out like the physical IMR slate: 1-20 down the left column, 21-34 down the right, starred genera under them,
    // then Millepora (the benthic slate, no number: "F" for fire coral).
    slate: () => {
      const num = list.filter(n => GX(n).n),
        L = num.filter(n => GX(n).n <= 20),
        R = num.filter(n => GX(n).n > 20),
        S = list.filter(n => !GX(n).n);
      const ps = n =>
        myst(n)
          ? mystA('ps', `<b>${GX(n).n ? GX(n).n + '.' : isBenthic(n) ? 'F' : '★'}</b><i>?</i>`, n)
          : `<a class="ps ${lv[n][0]} s${st[n]}" href="${esc(hr('g-' + n))}" title="${isBenthic(n) ? 'Fire coral, on the IMR benthic slate. ' : ''}${tip(n)}"${fill(n)}><b>${GX(n).n ? GX(n).n + '.' : isBenthic(n) ? 'F' : '★'}</b><i${n.length >= 13 ? ' class="lg"' : ''}>${esc(n)}</i>${pct(n)}</a>`;
      // Bonus genera: one strip across both columns under the slate, so the board still fits one screen.
      const rows = Math.max(L.length, R.length + (S.length ? S.length + 1 : 0));
      const bx = BO.map(n =>
        myst(n)
          ? mystA('ps bonus', '<b>+</b><i>?</i>', n)
          : `<a class="ps ${lv[n][0]} s${st[n]} bonus" href="${esc(hr('g-' + n))}" title="Bonus genus, not on the IMR list. ${tip(n)}"><b>+</b><i${n.length >= 13 ? ' class="lg"' : ''}>${esc(n)}</i>${pct(n)}</a>`
      ).join('');
      // The left column padded to the row count, so 21 always starts the right column, even when the right one (with
      // Millepora) is the longer.
      return `<div class="pslate" style="--rows:${rows}">${L.map(ps).join('')}${'<span class="psgap"></span>'.repeat(Math.max(0, rows - L.length))}${R.map(ps).join('')}${S.length ? '<span class="psgap"></span>' : ''}${S.map(ps).join('')}${bx ? `<div class="psbonus" style="grid-row:${rows + 1}" title="Bonus genera, not on the IMR list">${bx}</div>` : ''}</div>`;
    },
    groups: () => `<div class="pgroups">${groups
      .map(k => {
        const gr = DATA.imrg.find(x => x.n === k),
          L = list.filter(n => gi(n) === k),
          // No lecture group: Millepora (the benthic slate, F as on the Slate view); a starred genus left ungrouped, ★.
          [mk, t] = gr
            ? [gr.n, esc(gr.t)]
            : L.every(isBenthic)
              ? ['F', 'IMR benthic slate, not a hard coral']
              : ['★', 'Not covered in the lecture'];
        return `<div class="pgr" style="--g:${gr ? groupHue(gr.n) : 200}"><span class="gn" title="${t}">${mk}</span><span class="pgt">${t}</span>
        <span class="pseg">${L.map(n => (myst(n) ? mystA('', '<i>?</i>', n) : `<a class="${lv[n][0]} s${st[n]}" href="${esc(hr('g-' + n))}" title="${tip(n)}"${fill(n)}><i>${esc(n)}</i>${pct(n)}</a>`)).join('')}</span><small>${L.filter(n => lv[n][0] === 'ok').length}/${L.length}</small></div>`;
      })
      .join('')}
      ${
        BO.length
          ? `<div class="pgr pgbonus"><span class="gn" title="Bonus genera, not on the IMR list">+</span><span class="pgt">Bonus: not on the IMR list</span>
        <span class="pseg">${BO.map(n => (myst(n) ? mystA('', '<i>?</i>', n) : `<a class="${lv[n][0]} s${st[n]}" href="${esc(hr('g-' + n))}" title="${tip(n)}"><i>${esc(n)}</i>${pct(n)}</a>`)).join('')}</span><small>${BO.filter(n => lv[n][0] === 'ok').length}/${BO.length}</small></div>`
          : ''
      }</div>`
  };
  // The subject's first view by default (the corals: Slate, compact and in the IMR slate's order the RAs know); the view
  // switch is at the bottom of the side column.
  const PV = SUBJ.progress;
  let pv = store.get('reefid-sync-pview', PV[0]);
  if (!PV.includes(pv) || !VIEWS[pv]) pv = PV[0];
  $v.innerHTML = `${
    UNITS[SUBJ.id].progHelp
      ? UNITS[SUBJ.id].progHelp()
      : `<p class="lede"><b>To learn a genus</b>, keep getting it right: its % is the share of all its photos, easy to hard, you would name alone and typed, as far as your answers on it have shown. Hard photos and typed answers prove the most; a right pick among 2 easy choices proves little. It fills up to 95%. From ${Math.round(100 * DOM.EX)}%, once it has been asked beside each of its look-alikes, comes its <b>mastery exam</b>: ${EXAM.n} questions on it, as hard as the game gets (one photo alone, never seen before, look-alikes among the choices), slipped unannounced into the Quiz, several questions apart. At least ${TYPED.exam} of them ask you to type the genus from memory, with no choices to pick from. All ${EXAM.n} right and you are its Instructor (100%); a single miss, or giving it as the answer for another genus, and the exam starts again later. A mistake sets a genus back, for the genus you missed and for the one you answered.</p>
  <p class="lede"><b>Typed questions</b>: from ${Math.round(100 * TYPED.from)}% on a genus, some of its questions ask you to type its name instead of picking it, more and more as it nears learned (about ${Math.round(100 * TYPED.at[TYPED.at.length - 1][1])}% of them at the exam). Old names are accepted, and a small typo still counts as right, but you retype the name once to learn its spelling; <b>I don't know</b> shows the answer and counts as a miss for that genus only; typing another genus counts against both, as a wrong pick does. A typed right answer counts in full, as much as a pick against its look-alikes: there is nothing to guess from.</p>
  <p class="lede"><b>Fire coral</b> (<i>Millepora</i>, <b>F</b> on the Slate view) is not a hard coral and not on the IMR coral list, but it is on the IMR benthic slate and very common at Dauin: it counts like the other genera. <b>Bonus genera</b>: corals that are not on the IMR list but are common at Dauin. Once you have met every genus of the slate, a card offers to add them (or ⚙ Settings, Bonus genera, any time); they then come one at a time, like the others. They don't count in your progress; their ID tips come from the Coral Finder book. On this page they come after the slate.</p>
  <p class="lede"><b>Levels</b>, the diver's ladder: <b>Snorkeler</b> under 50%, <b>Open Water</b> from 50%, <b>Advanced</b> from 80%, <b>Divemaster</b> from ${Math.round(100 * DOM.EX)}% once asked beside its look-alikes (its mastery exam is on), <b>Instructor</b> once the exam is passed: you could teach it. The colours follow them, from pale to dark; white with a dashed border = not seen (for a player new to corals, a <b>?</b> in place of a genus not met yet: it shows once it opens); the darkest, with a tick = Instructor. The mini ring on a tile shows exactly how far it has got. A red border and a red ! = to review (2 or more mistakes in its last 5 answers). <b>Photos</b>, <b>Slate</b> and <b>Groups</b> show the same progress in three layouts. Tap a genus to open its sheet: it shows what the genus still needs.</p>`
  }
  <p class="lede"><b>In detail</b>: each ${SUBJ.one} has its own photo difficulty, recomputed after every answer: it starts with the best photos, right answers bring harder ones, a mistake eases them off, and new photos keep coming in at every level. The % is how many of the ${SUBJ.one}'s photos you would name right, one photo alone with no choices, judged only from your own answers on that ${SUBJ.one}: a right answer on a hard photo, or typed, raises it most; one among 2 easy choices, a little; a mistake lowers it, less when the photo was harder than your level. Your older answers fade as you improve, so a ${SUBJ.one} learned late catches up. A ${SUBJ.one} you have not answered stays at 0, however well you do on the others. ${Math.round(100 * DOM.EX)}% (Divemaster), once it has been asked beside each of its look-alikes, opens its mastery exam; Instructor means the exam is passed too.</p>
  <p class="lede"><b>Your tricky pairs</b>: the pairs of ${SUBJ.many} you mix up most, from your own answers alone, once you have mixed a pair up ${TRICKY.MIN} times ("3 of 5": mixed up 3 times in 5 questions that offered both). A pair you now tell apart sinks below the others. ${SUBJ.pages.includes('cmp') ? 'Tap one to see the two side by side. ' : ''}Ask yourself what tells the two apart for you.</p>
  <div class="pgame pboard">${badge(ring, headPct(list), lvSummary(list))}<div class="pgwrap"></div>
  <aside class="gside">
    <div class="plvl" role="list" aria-label="Learning level">${STEPS.map(([k, t]) => `<span role="listitem" class="s${k}" title="${t}: ${nst(k)} ${SUBJ.many}">${lvIcon(k)}<b>${nst(k)}</b><small>${t}</small></span>`).join('')}<span role="listitem" class="pl-rev weak${count('weak') ? '' : ' zero'}" title="To review: ${count('weak')} ${SUBJ.many}"><b>${count('weak')}</b><small>Review</small></span></div>
    <p class="plvlnote"><span class="pbar"></span> = how close each ${SUBJ.one} is to Instructor</p>
    ${
      introLeft().length
        ? `<div class="popen"><p><b>Had ${SUBJ.lecture}?</b> ${introLeft().length} ${SUBJ.many} are not open yet: they come one at a time as you play.</p><button type="button" class="next" id="openall">Open all ${SUBJ.many}</button></div>`
        : ''
    }
    ${opensOff()
      .map(
        S =>
          `<div class="popen"><p>${S.body}</p><button type="button" class="next" data-opens="${esc(S.k)}">${esc(S.row(S.units().filter(n => !introduced(n)).length))}</button></div>`
      )
      .join('')}
    ${SETS()
      .filter(S => S.row && !Q[S.k])
      .map(
        S => `<div class="popen"><p>${S.body}</p><button type="button" class="next" data-seton="${esc(S.k)}">${esc(S.row)}</button></div>`
      )
      .join('')}
    ${
      weak.length
        ? `<div><h3 class="label">Review first</h3><p class="chips">${weak
            .slice(0, 4)
            .map(n => `<a class="chip" href="${href(n)}">${uname(n)}</a>`)
            .join('')}</p></div>`
        : ''
    }
    ${trickyHTML(tricky, uname, hrefPair)}
    <div class="seg pvseg" role="group" aria-label="View">${[
      ['slate', 'Slate'],
      ['photos', 'Photos'],
      ['groups', 'Groups']
    ]
      .filter(([k]) => PV.length > 1 && PV.includes(k))
      .map(([k, t]) => `<button type="button" data-pv="${k}" aria-pressed="${pv === k}">${t}</button>`)
      .join('')}</div>
  </aside></div>`;
  bindQuizNav('quiz-board');
  const oa = document.getElementById('openall');
  if (oa)
    oa.onclick = () => {
      introAll('progress');
      NEXTQ = null;
      save();
      quizBoard();
      // The box goes and little else changes on this page: say it worked.
      appToast(`All ${slateCore().length} ${SUBJ.many} are open: the quiz now asks any of them.`, 6000);
    };
  // A part of the slate opened by choice (app.js UNITS opens), still off: opens it as "Open them" on its card does; the
  // units then open one at a time as the player plays.
  document.querySelectorAll('[data-opens]').forEach(
    b =>
      (b.onclick = () => {
        bonusSet(true, b.dataset.opens);
        NEXTQ = null;
        quizBoard();
        appToast('They open one at a time as you play.', 6000);
      })
  );
  // An opt-in set that is off (app.js UNITS sets) turns on here as with ⚙ On; its units then come by the set's own rule
  // (units). Both buttons: docs/decisions/2026-11-18-decisions-from-comments-3.md.
  document.querySelectorAll('[data-seton]').forEach(
    b =>
      (b.onclick = () => {
        const S = SETS().find(x => x.k === b.dataset.seton);
        bonusSet(true, b.dataset.seton, true);
        NEXTQ = null;
        quizBoard();
        if (S && S.onToast) appToast(S.onToast(), 6000);
      })
  );
  bindSync();
  // The player's rank, on the first board of the Leaderboard page that lists them (boardScopes: their groups', then the
  // general one). The board brings the rank only: the Elo stays the device's own, so nothing jumps when the reply comes.
  const rank = B => {
    const a = document.getElementById('pbrank'),
      L = B && B.rows ? boardScopes(B).top.find(x => boardMe(x.rows) >= 0) : null,
      i = L ? boardMe(L.rows) : -1;
    if (!a || i < 0) return;
    const elo = eloLine(P[LEVEL]);
    a.innerHTML = `🏆 <b>#${i + 1}</b>${elo ? ' · ' + elo : ''}`;
    a.hidden = false;
  };
  if (boardLive(SUBJ)) {
    const S = SUBJ;
    rank(boardCached(S));
    loadBoard(S).then(B => S === SUBJ && rank(B)); // the subject's own board (another chosen meanwhile: nothing)
  }
  const wrap = $v.querySelector('.pboard .pgwrap');
  const show = () => {
    wrap.innerHTML = VIEWS[pv]() + sects();
    $v.querySelectorAll('[data-pv]').forEach(b => b.setAttribute('aria-pressed', b.dataset.pv === pv));
    requestAnimationFrame(() => {
      const g = wrap.firstChild;
      if (g.classList.contains('pgrid'))
        fitTiles(g, 6); // the sections under it keep their own size (app.css .psect)
      else
        g.style[pv === 'slate' ? 'minHeight' : 'height'] =
          Math.max(320, innerHeight - g.getBoundingClientRect().top - window.scrollY - 16 - tabH()) + 'px';
    });
  };
  $v.querySelectorAll('[data-pv]').forEach(
    b =>
      (b.onclick = () => {
        pv = b.dataset.pv;
        store.set('reefid-sync-pview', pv);
        show();
      })
  );
  show();
}

// The two highest levels reached, with their counts, for the card ("3 Divemaster · 12 Open Water"), so early progress
// shows before anything is learned. From Open Water up; '' before any unit reaches Open Water.
function lvSummary(list = slateGenera(), icons = true) {
  const st = list.map(lvStep);
  return [5, 4, 3, 2]
    .map(k => [k, st.filter(x => x === k).length])
    .filter(([, c]) => c)
    .slice(0, 2)
    .map(([k, c]) => `${icons ? lvIcon(k) : ''}${c} ${MASTERY[k][0]}`)
    .join(' · ');
}
// The units unlocked (Pierre, 2026-11-05, "30/40 genera unlocked"; tests/unlockcount.test.js cuts from this line): the
// units opened on the path (a card, an answer, Open all: model.js introduced) out of every unit the progress counts
// (slateGenera); introLeft is the rest. A unit counts from its card, a couple of answers before the draw asks it (model.js
// INTRO.GAP). [unlocked, all].
const unlockN = (list = slateGenera()) => [list.filter(introduced).length, list.length];
const unlockText = (list = slateGenera(), html = false) => {
  const [k, n] = unlockN(list);
  return `${html ? `<b>${k}</b>` : k}/${n} ${SUBJ.many} unlocked`;
};
// "Mystery" tiles (Pierre, 2026-11-04; tests/mystery.test.js cuts from this line; docs/FISH_PATH.md): a unit never met
// (never answered, not in model.js introMap) shows on My progress as a "?" with no name, photo, link or tooltip naming it.
// Who sees them is the subject's (app.js UNITS mystery, from the first-launch answer, model.js startOf c; null before
// any). Display only: the draw, the opening and the progress are untouched. A unit met once stays shown, even closed
// again by "One at a time" (model.js closed).
const mysteryOn = () => {
  const f = UNITS[SUBJ.id].mystery,
    o = typeof startOf === 'function' ? startOf() : null;
  return typeof f === 'function' && !!f(o ? o.c : null);
};
const mysteryOf =
  (on = mysteryOn()) =>
  n =>
    on && !asked(n) && !(n in introMap());
// The tooltip of a masked tile names its own unit's rank: the rank its record carries (fish scientific genus, species),
// else the subject's unit word.
const mystT = n => `A ${(GX(n) || {}).rank || SUBJ.one} you have not met yet`;
// Where the units of the opt-in sets show on My progress (docs/FISH_PATH.md: the two name trees are independent, and a
// level turned off keeps its progress). BA: the units in play (bonusList). The ones at the slate's own rank (rankOf '')
// follow it in its grid; every other set has its own section {S, L, on}: its units in play, met or not, while the set is
// on (Q[S.k]); its units met, from the whole set, while it is off or has no switch; no section when none. Pure on its
// inputs (tests call it). The badge counts the slate (unlockN), so the grid and its count agree.
const boardParts = (BA, sets = SETS(), on = S => !!Q[S.k], rk = rankOf, seen = n => asked(n) || n in introMap(), own = setOf) => ({
  grid: BA.filter(n => !rk(n)),
  sections: sets
    .map(S => ({
      S,
      on: on(S),
      L: on(S) ? BA.filter(n => rk(n) && own(n) === S) : (S.all ? S.all() : S.units()).filter(n => rk(n) && own(n) === S && seen(n))
    }))
    .filter(x => x.L.length)
});
// Every unit the board draws, once: the slate, the units in play and the sections' units (a section keeps the units met while
// its set is off, and those are not in play). quizBoard builds each tile's level and step from this list, so every tile
// drawn has one.
const boardTiles = (list, BA, SECT) => [...list, ...BA, ...SECT.flatMap(x => x.L)].filter((n, i, all) => all.indexOf(n) === i);
// Header progress pill: always in view; the page itself is #progress.
function showProg() {
  if (!DATA) return;
  const n = slateGenera();
  const pt = `${headPct(n)}%`;
  document.getElementById('progn').textContent = pt;
  const p2 = document.getElementById('progn2');
  if (p2) p2.textContent = pt;
  // Not signed in: the pill's tooltip says so, so RAs find where to save their progress.
  const pill = document.getElementById('prog'),
    out = !!SYNC_URL && !SYNC;
  pill.querySelector('.pl').textContent = 'Progress';
  pill.style.setProperty('--pp', headPct(n));
  // Status only: the pill shows progress and nothing else; saving trouble is the "Not saved" button's to say.
  pill.title = `${
    SYNC
      ? `Signed in as ${SYNC.name}: your progress per ${SUBJ.one}`
      : out
        ? 'Your progress (not saved online yet: Sign in, top right)'
        : `Your progress per ${SUBJ.one}`
  }. ${pt}, ${unlockText(n)}.`; // the count in words: the header has no room for it (one line at 1024 px, rule U3)
  // A filled "Sign in" button in the header on every page while signed out; once signed in it goes and the account is a
  // quiet line at the top of ⚙. Trouble saving brings it back as "Not saved", which opens ⚙ where the problem is explained.
  const sb = document.getElementById('signb'),
    bad = syncTrouble();
  sb.hidden = !SYNC_URL || (!!SYNC && !bad);
  sb.textContent = bad ? 'Not saved' : 'Sign in';
  sb.classList.toggle('warn', !!bad);
  sb.title = bad || `Sign in to save your progress for your ${ORG.short} trainer`;
}
// Progress files and the sheet: every key that travels (core.js KEYS.SYNC: quiz progress, settings, achievements...), as JSON.
// A key whose move to its new name is pending (core.js migrateKeys) counts under its new name (core.js travelData).
const progData = () => {
  try {
    return travelData(localStorage);
  } catch (e) {
    return {};
  }
};
// A file or a saved account may carry the names from before the rename to IMR Reef ID (core.js keysIn).
const loadData = d => Object.entries(keysIn(d)).forEach(([k, v]) => k.startsWith(KEYS.SYNC) && localStorage.setItem(k, v));
// A progress file says which app wrote it: 'reefid', or the app's old id, still read.
const PROG_APP = ['reefid', 'imr-coral-id']; // rename-app: keep
function bindProgFile() {
  const msg = t => (document.getElementById('pmsg').textContent = t);
  document.getElementById('pexp').onclick = () => {
    const out = {app: PROG_APP[0], saved: new Date().toISOString(), data: progData()};
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], {type: 'application/json'}));
    a.download = `reefid-progress-${out.saved.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    msg('Saved. Keep the file somewhere safe (Drive, email to yourself).');
  };
  const pick = document.getElementById('pimp');
  document.getElementById('pload').onclick = () => pick.click();
  // After loading a file the page reloads: ⚙ opens on the backup fold to confirm it (not after a sign-in, which also reloads).
  try {
    const done = sessionStorage.getItem('reefid-loaded');
    if (done) {
      sessionStorage.removeItem('reefid-loaded');
      msg('Progress loaded from ' + done + '.');
      if (done !== SHEET_NAME) {
        document.querySelector('#settings .saveprog').open = true;
        setOpen(true);
      }
    }
  } catch (e) {}
  pick.onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    f.text()
      .then(t => {
        const j = JSON.parse(t);
        if (!PROG_APP.includes(j.app) || !j.data) throw 0;
        loadData(j.data);
        // Reload so every setting held in memory (quiz options, list order, Lab state) picks up the file.
        try {
          sessionStorage.setItem('reefid-loaded', f.name);
        } catch (e) {}
        location.reload();
      })
      .catch(() => msg(`This file is not an ${ORG.app} progress file.`));
  };
}

// Public leaderboard, one per subject: every signed-in player by progress %, then Elo (so players at 100% keep
// competing). The Elo is the app's own level, P[LEVEL].th, read by the sheet from each saved progress (Code.gs board_);
// the player's own row shows this device's level, which may be a few answers ahead. 🏆 in the header opens it. Players
// appear by default; ⚙ Leaderboard Off takes them off (the sheet's Board column, sent with the next sync). The sheet
// serves it (GET ?board=1), cached 5 minutes there and 1 minute here.
const BOARD = 'reefid-sync-board'; // a reefid-sync key: it travels with the progress, so the choice holds on every device
// {v: 1 | 0, t: when chosen}: the latest choice wins when two devices meet (mergeSaved); a bare 0/1 is an older form.
const boardOn = () => {
  const b = store.get(BOARD, null);
  return b === null ? true : typeof b === 'object' ? b.v !== 0 : b !== 0;
};
const boardT = b => (b && typeof b === 'object' ? b.t || 0 : 0);
// Elo score shown to players: the ability (0 = able to name an average photo, same scale as photo difficulty) as a
// familiar number around 1000; +1 ability = +200.
const eloScore = a => (typeof a === 'number' ? Math.round(1000 + 200 * a) : '–');
// The Elo shows only from ELO_MIN answers (fewer do not settle it: docs/LEARNING.md); before, the badge says how many
// answers are left. Same threshold as the sheet's leaderboard (Code.gs ELO_MIN).
const ELO_MIN = 200;
const eloLine = G => {
  const n = G ? (G.ok || 0) + (G.ko || 0) : 0;
  return n >= ELO_MIN && typeof G.th === 'number' ? `Elo ${eloScore(G.th)}` : '';
};
// The sync script answers in 1-3 s (a Google Apps Script starting up), whatever its own cache: so the last board is kept
// on this device (BOARD_C, a device key that never travels) and shown at once, then replaced when the fresh one arrives.
// It is also fetched a few seconds after start-up, so the first visit to the page is usually instant
// (docs/decisions/2026-11-18-decisions-from-comments-3.md).
// One leaderboard per subject, never a merged ranking (core.js SUBJECTS board): the page shows the subject on screen's
// (boardSubj), the first subject's for one without a leaderboard. The first one's is GET ?board=1; another's adds
// &s=<id>. A subject whose board needs a later script (SUBJECTS boardSheet) waits for it, since an older script answers
// with the first one's (rule D4). Each subject's board is cached apart (subjDev).
const BOARD_C = 'board-cache';
const board0 = () => SUBJECTS.find(x => x.board);
// The script version that serves subject S's board: its own when it names one (core.js SUBJECTS boardSheet: the sea slugs',
// SEASLUGRP_SHEET), else any.
const boardV = S => Number(S && S.boardSheet) || 0;
// A board reply to show: the first subject's from any script, another's only from its version (boardV; tests/gates.test.js).
const boardOk = (j, first, S) => !!j && j.ok === true && Array.isArray(j.rows) && (first || Number(j.v) >= boardV(S));
// A subject's board is live once the sheet serves it (rule D4): the first one's always, another's from its version
// (boardV; sync.js sheetV, the version of the last reply). Until then the subject has none: the page shows the first
// subject's board, no rank on My progress, no announcement.
const boardLive = S => !!S && !!S.board && (S === board0() || (typeof sheetV === 'function' && sheetV() >= boardV(S)));
const boardSubj = () => (boardLive(SUBJ) ? SUBJ : board0());
const boardAt = {},
  boardP = {};
const ago = t => {
  const m = Math.round((Date.now() - (t || 0)) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
};
const boardCached = (S = boardSubj()) => {
  const c = store.get(subjDev(S.id, BOARD_C), null);
  return c && Array.isArray(c.rows) ? c : null;
};
const loadBoard = (S = boardSubj()) => {
  const k = S.id,
    first = S === board0();
  if (!boardP[k] || Date.now() - (boardAt[k] || 0) > 60000) {
    boardAt[k] = Date.now();
    boardP[k] = fetch(SYNC_URL + '?board=1' + (first ? '' : '&s=' + encodeURIComponent(k)))
      .then(r => r.json())
      .then(j => (boardOk(j, first, S) ? j : {err: j && (j.v < 14 || !first) ? 'old' : 'na'}))
      .catch(() => ({err: 'offline'}))
      .then(j => {
        if (!j.err)
          store.set(subjDev(S.id, BOARD_C), {rows: j.rows, staff: j.staff, cohorts: j.cohorts, groups: j.groups, t: Date.now(), v: j.v});
        else boardAt[k] = 0; // a failure is not kept for a minute: the next visit tries again
        return j;
      });
  }
  return boardP[k];
};
const boardMe = rows => (SYNC && SYNC.name ? rows.findIndex(r => String(r[0]).toLowerCase() === SYNC.name.trim().toLowerCase()) : -1);
// Staff and cohort boards (docs/ARCHITECTURE.md): a reply from SCOPES_SHEET splits the one ranking (Code.gs board_):
// rows, the general board without the staff; staff, the trainers'; cohorts, [{n, rows}], each cohort's members but the
// staff. The page shows the player's own cohort first, then the staff, then the general board; the other cohorts behind a
// discreet "Other cohorts" fold (docs/decisions/2026-11-18-decisions-from-comments-3.md). An older reply: one board.
const SCOPES_SHEET = 171;
// The player's cohort: its display name, '' for none, null when this account was never told (sync.js groupsSeen).
const myCohort = () => {
  const o = store.get(COHORT_KEY, null);
  return SYNC && o && typeof o.c === 'string' && String(o.n).toLowerCase() === SYNC.name.trim().toLowerCase() ? o.c : null;
};
// Player groups, any number per player (docs/ARCHITECTURE.md): a reply from GROUPS_SHEET carries groups, [{id, n, rows}]
// every group with a board, newest first (Code.gs board_), and rows, the general board without the members of an apart
// group. The page shows the player's own groups' boards first, each under its name, then All players; every other group's
// behind a closed "Other groups" (an empty one left out).
const GROUPS_SHEET = 179;
// The ids of the player's groups, null when this account was never told (sync.js groupsSeen).
const myGroups = () => {
  const o = store.get(GROUPS_KEY, null);
  return SYNC && o && Array.isArray(o.ids) && String(o.n).toLowerCase() === SYNC.name.trim().toLowerCase() ? o.ids : null;
};
// The boards of a reply, in the page's order: {top: [{k, t, rows}], others: [{k, t, rows}], more: the fold's title}; one
// untitled board before SCOPES_SHEET, or when there is no other board to show.
function boardScopes(B) {
  const one = {top: [{k: 'all', t: '', rows: B.rows}], others: []};
  if (Number(B.v) >= GROUPS_SHEET && Array.isArray(B.groups)) {
    const G = B.groups.filter(g => g && typeof g.n === 'string' && Array.isArray(g.rows)),
      m = myGroups(),
      // Never told (a reply before the account's first load): the boards that list the player.
      mine = g => (m ? m.includes(g.id) : boardMe(g.rows) >= 0),
      own = G.filter(mine),
      others = G.filter(g => !mine(g) && g.rows.length);
    return !own.length && !others.length
      ? one
      : {
          top: [...own.map(g => ({k: 'group', t: g.n, rows: g.rows})), {k: 'all', t: 'All players', rows: B.rows}],
          others: others.map(g => ({k: 'other', t: g.n, rows: g.rows})),
          more: 'Other groups'
        };
  }
  if (!(Number(B.v) >= SCOPES_SHEET) || !Array.isArray(B.staff)) return one;
  const C = (Array.isArray(B.cohorts) ? B.cohorts : []).filter(c => c && typeof c.n === 'string' && Array.isArray(c.rows)),
    m = myCohort(),
    // Never told (a reply before the account's first load): the cohort whose board lists the player.
    own = m ? C.find(c => c.n === m) : m === null ? C.find(c => boardMe(c.rows) >= 0) : null,
    top = [
      ...(own ? [{k: 'cohort', t: own.n, rows: own.rows}] : []),
      ...(B.staff.length ? [{k: 'staff', t: 'Staff', rows: B.staff}] : []),
      {k: 'all', t: 'All players', rows: B.rows}
    ];
  return top.length < 2 && !C.length ? one : {top, others: C.filter(c => c !== own).map(c => ({k: 'other', t: c.n, rows: c.rows}))};
}
function viewBoard() {
  // The title sits inside .board: pageHelp drops top-level titles where the header names the page, and here it doesn't.
  $v.innerHTML = `<p class="lede">Everyone who signed in, ranked by progress, then by Elo: your level from all your answers, which keeps rising as you name harder photos right, so it still counts at 100%. The Elo shows from ${ELO_MIN} answers: before that it moves too much to mean anything. Your groups' leaderboards come first; this general one shows everyone, whatever their groups. To leave the leaderboards, ⚙ Settings, Leaderboard: Off.</p>
  <div class="board">${boardTabs('board')}<div id="board"><p class="note">Loading…</p></div></div>`;
  const S = boardSubj(),
    C = boardCached(S);
  if (C) paintBoard({...C, old: true}, S);
  loadBoard(S).then(B => {
    const box = document.getElementById('board');
    if (!box || hashNow() !== 'board' || boardSubj() !== S) return; // left, or another subject chosen meanwhile
    if (!B || B.err) {
      // Offline or failing: the last board stays, marked as such.
      if (C) return paintBoard({...C, old: true, off: true}, S);
      box.innerHTML = `<p class="note">${B && B.err === 'offline' ? 'The leaderboard needs a connection.' : 'The leaderboard is not available yet.'}</p>`;
      return;
    }
    paintBoard(B, S);
  });
}
function paintBoard(B, S = boardSubj()) {
  const box = document.getElementById('board');
  if (!box || hashNow() !== 'board') return;
  const sc = boardScopes(B),
    me = [...sc.top, ...sc.others].some(x => boardMe(x.rows) >= 0) ? 0 : -1,
    // The player's own row: this device's level (eloLine), as My progress shows it; the sheet's copy only when this
    // device has none to show, or when the subject on screen is not the board's (P is another subject's progress).
    // Other rows: the level the sheet read from their saved progress.
    mine = me >= 0 && S === SUBJ ? eloLine(P[LEVEL]) : '';
  // One board's list, the player's row marked; a titled board (staff and cohorts) under its heading.
  const list = rows => {
    const at = boardMe(rows),
      eloOf = (r, i) => (i === at && mine ? mine : r[2] == null ? '' : `Elo ${eloScore(r[2])}`);
    return rows.length
      ? `<ol class="blist">${rows
          .map(
            (r, i) =>
              `<li${i === at ? ' class="me" aria-current="true"' : ''}><span class="brank">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><span class="bwho"><b class="bname">${esc(r[0])}</b>${markRow(r) ? markHtml() : ''}</span><span class="belo" title="${eloOf(r, i) ? 'Elo: level from all answers' : `Elo shows from ${ELO_MIN} answers`}">${eloOf(r, i)}</span><span class="bpct">${r[1] == null ? '–' : r[1] + '%'}</span></li>`
          )
          .join('')}</ol>`
      : '<p class="note">Nobody yet: be the first.</p>';
  };
  const part = x =>
    x.t ? `<section class="bscope" data-scope="${x.k}"><h3 class="bhead">${esc(x.t)}</h3>${list(x.rows)}</section>` : list(x.rows);
  // Signed out: "Sign in" opens the sign-in card, as the header's button does (rule U9).
  const note = !SYNC
    ? '<p class="note"><button class="linkish" type="button" id="bsign">Sign in</button> to appear on the leaderboard.</p>'
    : !boardOn()
      ? '<p class="note">You are not on the leaderboard (⚙ Settings, Leaderboard: Off).</p>'
      : me < 0
        ? '<p class="note">You will appear here after your next answers are saved.</p>'
        : '';
  const when = B.off ? `<p class="note">Offline: the leaderboard as seen ${ago(B.t)}.</p>` : '';
  box.innerHTML =
    when +
    note +
    sc.top.map(part).join('') +
    (sc.others.length
      ? `<details class="bmore"><summary>${sc.more || 'Other cohorts'}</summary>${sc.others.map(part).join('')}</details>`
      : '');
  const bs = box.querySelector('#bsign');
  if (bs) bs.onclick = e => document.getElementById('signb').onclick(e);
  const m = box.querySelector('.me');
  if (m && m.scrollIntoView && m.getBoundingClientRect().bottom > innerHeight) m.scrollIntoView({block: 'center'});
}
// Achievements (core.js ACH): checked after every answer on a snapshot of the progress (achSnap); each new one pops up
// (achPop, one after the other). Kept in reefid-sync-ach ({id: time}, plus _run / _best for the run of right answers and
// _cor / _hard for one-off feats), a reefid-sync key, so it travels with the progress. The first check on a device with
// progress but no record yet grants what is already met in one recap.
const ACHK = 'reefid-sync-ach';
// Two records of one player (another device, or this device before signing in): every achievement kept with its
// earliest date, the best run kept; the current run stays this device's; an achievement taken back (A._gone, achRecheck)
// never comes back from a copy earned before (core.js mergeAch).
// Version of the record (ACH_V): a record older than the last full recount brings its feats (best run, corallites, hard
// photo) but not its achievements, counted on older rules (core.js mergeAch), so a device not updated yet never brings
// back one the recount took away. Raising it recounts every subject, silently (achMigrate; docs/FISH_PATH.md for the
// fish achievements on the global score).
const ACH_V = 3;
function achMerge(json) {
  try {
    const ra = JSON.parse(json || 'null');
    if (!ra || typeof ra !== 'object') return;
    store.set(ACHK, mergeAch(store.get(ACHK, {}) || {}, ra, ACH_V));
  } catch (e) {}
}
// A learned mark taken away by a recalculation (model.js mxRecalc, MXL): the achievements resting on genera learned
// (core.js ACH_LEARN: Instructor, Coral master, Group complete) that the progress no longer meets are taken back, dated
// in the record's _gone so no merge brings them back (core.js achRevoke, mergeAch); earned again, they come back as
// usual. Only here: everywhere else achievements are only added. The removals are kept and synced even when this record
// held none of them (dropped by achMigrate, or earned on another device), or the next merge would bring back the sheet's
// copy. The ids taken back go to the card (mxLostNotice) and leave the "new" dots; one sync, so the sheet's copy follows.
function achRecheck() {
  const M = store.get(MXL.KEY, null);
  if (!M || !M.ach) return [];
  // Silent while model.js MXL.QUIET: the learned-based achievements are kept, as for a mark lost in play, and a pending
  // recheck is dropped.
  if (MXL.QUIET) {
    delete M.ach;
    store.set(MXL.KEY, M);
    return [];
  }
  // Signed in: on the merged progress, after the visit's first sync (sync.js noticeLater), never on an old copy; as the
  // subject it was asked for (a pull merges each subject as if on screen: sync.js mergeSaved).
  if (!noticesReady()) {
    const id = SUBJ.id;
    noticeLater('achRecheck:' + id, () => inSubject(id, achRecheck));
    return [];
  }
  const A = store.get(ACHK, null),
    was = JSON.stringify(A),
    out = A ? achRevoke(A, achSnap(A), Date.now(), ACH_L()) : [];
  if (A && JSON.stringify(A) !== was) {
    store.set(ACHK, A);
    if (SYNC) syncSoon();
  }
  if (out.length) {
    store.set(
      ACHNEW,
      achUnseen().filter(id => !out.includes(id))
    );
    achDot();
  }
  delete M.ach;
  M.gone = Object.keys(M.due || {}).length ? [...new Set([...(M.gone || []), ...out])] : []; // the card names them if it is due
  store.set(MXL.KEY, M);
  return out;
}
const achList = () => slateGenera();
// The subject's core units (UNITS core: the IMR course's fish families), its circles (UNITS circles: the fish families of
// circles 1, 2 and 3) and its opt-in sets (UNITS sets: the scientific genera), for the achievements that read them
// (core.js FISH_ACH): met, at Advanced or above and learned in the core; at Advanced or above in each circle; units at
// Open Water or above (sets) and at Advanced or above (setsAdv) in each set. pct: the subject's global score when it has
// one (core.js SUBJECTS score, treeScore over UNITS tree), from the device's progress whatever the sheet's version, else
// the headline %.
function achSnap(A = store.get(ACHK, {}) || {}) {
  const L = achList(),
    st = L.map(lvStep),
    G = P[LEVEL],
    U = UNITS[SUBJ.id],
    C = U.core ? U.core() : [],
    T = SUBJ.score && U.tree ? U.tree() : null,
    at = (list, k) => list.filter(n => lvStep(n) >= k).length;
  const groups = {},
    byUp = {},
    byTax = {},
    gx = n => (typeof GX === 'function' && GX(n)) || {},
    tgOf = n => gx(n).tg || (gx(n).parent && gx(gx(n).parent).tg) || 0;
  L.forEach(n => (groups[shownGroup(n) || 0] = groups[shownGroup(n) || 0] || []).push(n));
  L.forEach(n => gx(n).parent && (byUp[gx(n).parent] = byUp[gx(n).parent] || []).push(n));
  L.forEach(n => tgOf(n) && (byTax[tgOf(n)] = byTax[tgOf(n)] || []).push(n));
  return {
    total: L.length,
    met: st.filter(x => x >= 1).length,
    q: [2, 3, 4].map(k => st.filter(x => x >= k).length),
    learned: st.filter(x => x >= 5).length,
    pct: T ? treeScore(P, T, SUBJ.score).pct : headPct(L),
    streak: A._best || 0,
    duel: L.some(n => (P[n] || {}).du),
    cor: !!A._cor,
    hard: !!A._hard,
    // The Elo moves a lot over the first answers (it starts fast on purpose): its achievements wait for ELO_MIN answers.
    elo: G && typeof G.th === 'number' && (G.ok || 0) + (G.ko || 0) >= ELO_MIN ? eloScore(G.th) : 0,
    group: Object.entries(groups).some(([k, g]) => k !== '0' && g.length > 1 && g.every(n => lvStep(n) >= 5)),
    bonus: bonusList().filter(introduced).length,
    core: {total: C.length, met: at(C, 1), adv: at(C, 3), learned: at(C, 5)},
    circ: (U.circles ? U.circles() : []).map(c => ({total: c.length, adv: at(c, 3)})),
    // Its units grouped by the unit above them (GX parent: a sea slug genus's family), those with every unit at Advanced
    // or above (core.js SEASLUG_ACH); 0 for a subject whose units have none (the corals, the fish families).
    fam: Object.values(byUp).filter(g => g.every(n => lvStep(n) >= 3)).length,
    // Each taxonomic group of the subject's tree (GX tg of a unit's parent, or its own: the sea slugs' taxa), in its
    // number's order: {n, total, met, adv}; [] for a subject without.
    tax: Object.keys(byTax)
      .map(Number)
      .sort((a, b) => a - b)
      .map(n => ({n, total: byTax[n].length, met: at(byTax[n], 1), adv: at(byTax[n], 3)})),
    sets: Object.fromEntries((U.sets || []).map(S => [S.k, at(S.all ? S.all() : S.units(), 2)])),
    setsAdv: Object.fromEntries((U.sets || []).map(S => [S.k, at(S.all ? S.all() : S.units(), 3)])),
    basics: !!A._basics,
    fb: Array.isArray(A._fb) ? A._fb.length : 0
  };
}
// Full recount, once per device and record version (progress and achievements recalculated for everyone: docs/LEARNING.md,
// docs/decisions/2026-11-18-decisions-from-comments-3.md): every achievement of every subject is tested again on that subject's progress with the current rules
// (core.js achRecount); those still met keep their date, the others go, as do ids no list holds. Feats (runs,
// corallites, hard photo, removals) stay. Silent; then one sync, so the sheet's copy follows. Each subject with
// achievements (SUBJECTS ach) checks its own list (achs) on its own progress (inSubject); the Contributions once, with
// the first. A subject whose data is not loaded yet (app.js fishLoad) cannot be tested: its achievements wait on this
// device (ACHOLD, {subject: {id: time}}, never synced) and are recounted when its data comes (achPending). Its records
// under the former moving average are rebuilt first (model.js domRecalcAll), so nothing is granted from obsolete bars.
const ACHS = () => SUBJECTS.find(x => x.ach).id,
  ACHOLD = 'reefid-ach-old',
  // The shared data first (app.js DATA: the levels read it through GX; a direct Fish link can bring the fish files before
  // data.json), then the subject's own (its slate).
  achReady = () =>
    !!(typeof DATA === 'object' && DATA && DATA.gen) &&
    achList().length > 0 &&
    (typeof domRecalcAll !== 'function' || (domRecalcAll(), true)),
  achOwn = S => S.achs().filter(a => a.kind !== 'contrib');
function achMigrate() {
  const A = store.get(ACHK, null);
  if (A && A._v === ACH_V) return;
  const B = {_v: ACH_V},
    t = Date.now(),
    held = {};
  if (A) Object.keys(A).forEach(k => k[0] === '_' && k !== '_v' && A[k] && (B[k] = A[k])); // the feats (_run, _best, _cor, _hard, _gone, _basics, _fb)
  SUBJECTS.filter(S => S.ach).forEach((S, i) =>
    inSubject(S.id, () => {
      const list = [...achOwn(S), ...(i ? [] : ACH_CONTRIB)];
      if (achReady()) return achRecount(B, A, list, achSnap(B), t);
      held[S.id] = Object.fromEntries(list.filter(a => A && A[a.id]).map(a => [a.id, A[a.id]]));
    })
  );
  store.set(ACHK, B);
  store.set(ACHOLD, Object.keys(held).length ? held : null);
  if (SYNC && A) syncSoon();
}
// The recount of a subject that waited for its data (achMigrate): once it is in (app.js fishLoad: every subject waiting;
// achCheck: the one it checks, never a visit to another at each answer), its achievements are tested on its progress,
// each met one keeping the earliest of its dates (core.js achRecount), the others dropped. Silent, as the recount.
function achPending(only) {
  const H = store.get(ACHOLD, null);
  if (!H || typeof H !== 'object' || (only && !H[only])) return;
  const left = {};
  let done = false;
  Object.entries(H).forEach(([id, old]) => {
    const S = SUBJECTS.find(x => x.id === id && x.ach);
    if (!S) return;
    if (only && id !== only) return void (left[id] = old);
    inSubject(id, () => {
      if (!achReady()) return void (left[id] = old);
      const A = store.get(ACHK, {}) || {};
      achRecount(A, old, achOwn(S), achSnap(A), Date.now());
      store.set(ACHK, A);
      done = true;
    });
  });
  store.set(ACHOLD, Object.keys(left).length ? left : null);
  if (done && SYNC) syncSoon();
}
// Signed in, the check waits for the visit's first sync (sync.js noticeLater), then runs once on the merged progress and
// achievements (as silent as the quietest call that waited): an old copy of the account never pops up, nor takes back, what
// the other devices already settled.
let achWait = false;
function achCheck(silent) {
  if (!noticesReady()) {
    achWait = achWait || !!silent;
    const id = SUBJ.id;
    noticeLater('ach:' + id, () => {
      const s = achWait;
      achWait = false;
      inSubject(id, () => achCheck(s));
    });
    return;
  }
  if (!SUBJ.ach) return inSubject(ACHS(), () => achCheck(silent));
  achPending(SUBJ.id); // a recount waiting for this subject's data first: what it keeps is not new
  const had = store.get(ACHK, null),
    A = had || {},
    ids = newAch(achSnap(A), A, achTests());
  if (!ids.length) {
    if (!had) store.set(ACHK, A);
    return achDot();
  }
  // Only the first achievement of each family, the top tier and every Contributions tier pop up (docs/ARCHITECTURE.md):
  // a new kind stays a surprise, an intermediate step lands quietly on the achievements page with a "new" dot on 🏅 / 🏆.
  // Several at once make one toast.
  const fams = new Set(
      achTests()
        .filter(a => A[a.id])
        .map(achFam)
    ),
    t = Date.now(),
    loud = [],
    quiet = [];
  ids.forEach(id => {
    const a = achFind(id);
    (a.tier === 3 || a.kind === 'contrib' || !fams.has(achFam(a)) ? loud : quiet).push(id);
    fams.add(achFam(a));
    A[id] = t;
  });
  store.set(ACHK, A);
  if (quiet.length && had && !silent) store.set(ACHNEW, [...achUnseen(), ...quiet]);
  achDot();
  // The Contributions' 5th and 10th (tier 2 and 3) come as a card, which stays until closed (a toast may go unread); the
  // first stays a toast, like the learning achievements.
  const card = id => !silent && had && (achFind(id) || {}).kind === 'contrib' && achFind(id).tier >= 2;
  (silent || !had ? ids : loud).filter(card).forEach(id => achCard(achFind(id)));
  achRecap((silent || !had ? ids : loud).filter(id => !card(id)));
}
// One card at a time (docs/DESIGN.md "Cards"): fn runs once no card or tour is open.
function cardFree(fn) {
  if (!document.querySelector('.unlock, #tour')) return fn();
  const mo = new MutationObserver(() => {
    if (document.querySelector('.unlock, #tour')) return;
    mo.disconnect();
    fn();
  });
  mo.observe(document.body, {childList: true});
}
// Its button takes no tap for its first moments and Enter does not press it, so a reflex tap cannot close it unread (as the
// one-tap question, rule U11).
function cardCalm(d) {
  const b = d.querySelector('[data-b="1"]');
  if (!b) return;
  b.disabled = true;
  setTimeout(() => (b.disabled = false), CARD_WAIT);
}
const CARD_WAIT = 600;
// An achievement as a card (the Contributions' 5th and 10th: achCheck): its emoji in the medallion, its tier by the title.
// Leaving the page closes it unseen; it comes back on the next one.
function achCard(a) {
  if (!a) return;
  cardFree(() =>
    cardShow({
      kind: 'ach',
      emoji: a.icon,
      cls: 'achcard',
      kick: 'Achievement unlocked',
      title: `${esc(a.title)} ${TIER[a.tier] || ''}`,
      body: `<p>${esc(a.desc)}</p>`,
      primary: {text: 'OK'},
      esc: 1,
      focus: false,
      bind: cardCalm,
      onClose: how => how === 'route' && setTimeout(() => achCard(a), 300)
    })
  );
}
// The learning achievements of the subject on screen (core.js SUBJECTS achs, kind 'learn'; a subject without any: the
// first one's): the count on the badge and on #ach, so one subject's achievements never count in another's. The
// Contributions (kind 'contrib') are one family for every subject (core.js ACH_CONTRIB), never in that count, listed in
// their own section. achTests: what a check tests, the subject's learning ones and the Contributions.
const achSubj = () => (SUBJ.ach ? SUBJ : subjectOf(ACHS())),
  ACH_L = () =>
    achSubj()
      .achs()
      .filter(a => a.kind !== 'contrib'),
  ACH_C = () => ACH_CONTRIB,
  achTests = () => [...ACH_L(), ...ACH_C()];
// Families: the icons of one kind of milestone (genus progress, learned, Elo).
const ACH_FAM = {'🌿': '🌱', '🪸': '🌱', '🐠': '🌱', '🐌': '🌱', '👑': '🎓', '🌟': '⭐'},
  achFam = a => ACH_FAM[a.icon] || a.icon;
// Achievements earned quietly and not seen yet: a dot on 🏆 in the header, on the Achievements tab and on 🏅 in the
// player's card. Kept on this device only (its own key, outside the synced record: a sign-in or another device's sync
// never brings or drops them); sign-out clears it with the progress. Each subject's page shows and clears only its own
// (achShown: its list and the Contributions).
const ACHNEW = 'reefid-ach-new',
  achUnseen = () => store.get(ACHNEW, []) || [],
  achShown = () => {
    const ids = new Set(achTests().map(a => a.id));
    return achUnseen().filter(id => ids.has(id));
  },
  achNew = () => achShown().length;
function achDot() {
  const bg = document.getElementById('boardgo'),
    tab = document.querySelector(`.btabs a[href="${hr('ach')}"]`); // the Achievements tab of the leaderboard page (boardTabs)
  if (bg) bg.classList.toggle('hasnew', achNew() > 0);
  if (tab) tab.classList.toggle('hasnew', achNew() > 0);
}
// After each answer (quiz.js answer; cur, the game it was given in): the run of right answers and the one-off feats,
// then the check. The run (On a roll, Unstoppable: _run, _best) and Sharp eye (_hard) count only in the normal photo
// quiz, all its formats included (docs/ARCHITECTURE.md): the custom quiz and the Duel tab make them easier, so an answer
// there neither extends nor breaks the run. The other feats (corallites, duels) count everywhere.
const achRunIn = cur => cur === 'quiz';
function achAfter(good, ph, cur) {
  if (!SUBJ.ach) return; // an answer on a subject without achievements earns nothing
  if (!store.get(ACHK, null)) achCheck(true); // no record yet on this device: what is already met comes as one recap
  // The feats (runs, corallites, hard photos) belong to the subject whose achievements read them (SUBJECTS achFeats: the
  // corals): another subject's answers neither extend nor break the run, as the custom quiz's (fish: none of them yet).
  if (!SUBJ.achFeats) return achCheck();
  const A = store.get(ACHK, {}) || {},
    solo = ph.length === 1,
    run = achRunIn(cur);
  if (run) {
    A._run = good ? (A._run || 0) + 1 : 0;
    A._best = Math.max(A._best || 0, A._run);
  }
  if (good && solo && ph[0].view === 'macro') A._cor = 1;
  // Hard by the players' own record: a photo shown alone that at most half of 5+ answers got right.
  const o = run && solo && PSTAT[ph[0].f];
  if (good && o && o[1] >= 5 && o[2] / o[1] <= 0.5) A._hard = 1;
  store.set(ACHK, A);
  achCheck();
}
// A subject's basics module done (Coral basics, Fish basics: proto/basics.js seenStep): a one-off feat of the record, synced
// with it, so the Home line and the first-launch offers know on every device (app.js basicsDone). Each subject has its own
// (SUBJECTS basics.feat). The corals' feat also grants the achievement "Coral basics"; the fish's has none yet.
function achBasics(feat = (SUBJ.basics || {}).feat || '_basics') {
  if (!store.get(ACHK, null)) achCheck(true);
  const A = store.get(ACHK, {}) || {};
  if (A[feat]) return;
  A[feat] = 1;
  store.set(ACHK, A);
  achCheck();
  if (SYNC) syncSoon();
}
// A report sent (sync.js reportDialog): counted for the Contributions (core.js contribAdd: one per photo, Other only
// with a note), whatever the subject on screen, signed in or not; the tier it reaches pops up at once (achCheck), and the
// record goes to the sheet with the next sync like the other feats.
// Its id is kept too, counted or not (core.js repsAdd), for "Your feedback helped" (achHelped).
function achReport(r) {
  // An account the admin deleted (the sheet answered 'gone': sync.js) counts nothing.
  if (SYNC && SYNC.err === 'gone') return;
  if (!store.get(ACHK, null)) achCheck(true);
  const A = store.get(ACHK, {}) || {};
  repsAdd(A, [r.id]);
  const counted = contribAdd(A, r);
  store.set(ACHK, A);
  if (counted) achCheck();
  if (SYNC) syncSoon();
}
// "Your feedback helped" (docs/ARCHITECTURE.md "Players' reports"): a report marked handled (the admin's ✓ Done in
// curation.json seen 'rep:<id>', or a PR's in reports-handled.json: core.js handledSeen) is told to its sender at their
// next visit, checked at start-up (signed in: once the load reply is merged, sync.js repsSeen) and when a new
// curation.json arrives. A card that stays until closed, at a calm moment only (never over a question: at the break at
// Next, helpedArm; never over another card, the tour, a toast or the report dialog). The first report handled, then
// every one since the last thanks in one card, at most once per 7 days (core.js helpedDue, helpedMark); marked thanked
// when closed. Says only that it was handled. Any subject, signed in or not; never for a deleted account.
// reports-handled.json is read only by a device that sent reports, at most every 30 minutes (HANDLED).
let helpedUp = false,
  helpedMo = null,
  helpedT = 0;
const HANDLED = {file: null, at: 0, busy: false, MS: 30 * 60000};
function handledLoad() {
  if (HANDLED.busy || Date.now() - HANDLED.at < HANDLED.MS) return;
  HANDLED.busy = true;
  fetch('reports-handled.json', {cache: 'no-cache'})
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null)
    .then(j => {
      HANDLED.busy = false;
      HANDLED.at = Date.now();
      if (j && typeof j === 'object') HANDLED.file = j;
      achHelped();
    });
}
const helpedIds = () => {
  if (SYNC && (!repsPulled || SYNC.err === 'gone')) return []; // signed in: after the load reply; a deleted account: never
  const A = store.get(ACHK, null);
  return A ? helpedDue(A, handledSeen((typeof CUR === 'object' && CUR && CUR.seen) || null, HANDLED.file), Date.now()) : [];
};
// Never over an enlarged photo either (#lightbox): its close (hidden set again) wakes the wait below.
const helpedCalm = () =>
  !document.querySelector('#tour, .unlock, #repdlg, .achpop, #lightbox:not([hidden])') &&
  !achBusy &&
  !(document.getElementById('view') || document.body).querySelector('.q');
function achHelped() {
  const A = store.get(ACHK, null);
  if (A && Array.isArray(A._rep) && A._rep.length) handledLoad(); // its reply calls achHelped again
  if (helpedUp || !helpedIds().length) return;
  if (helpedCalm()) return void helpedShow();
  if (helpedMo) return;
  helpedMo = new MutationObserver(() => {
    clearTimeout(helpedT);
    helpedT = setTimeout(() => {
      if (!helpedMo || (!helpedCalm() && helpedIds().length && !helpedUp)) return;
      helpedMo.disconnect();
      helpedMo = null;
      achHelped();
    }, 300);
  });
  helpedMo.observe(document.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['hidden']});
}
// After an answer in a game (quiz.js answer): the break at Next, when a thanks is due and no other card took it.
function helpedArm(nb) {
  if (helpedUp || !helpedIds().length || document.querySelector('#tour, .unlock, .achpop') || achBusy) return false;
  return breakArm(nb, () => helpedShow(true));
}
function helpedShow(brk) {
  const ids = helpedIds();
  if (!ids.length || helpedUp) return false;
  helpedUp = true;
  cardShow({
    kind: 'feedback',
    emoji: '🙌',
    cls: 'helped',
    kick: 'Thank you',
    title: 'Your feedback helped',
    body: `<p>${ids.length === 1 ? 'A report you sent was looked at and handled.' : `${ids.length} reports you sent were looked at and handled.`}</p>`,
    primary: {text: 'OK'},
    esc: 1,
    focus: false,
    bind: cardCalm,
    onClose: how => {
      helpedUp = false;
      if (how === 'route') return void setTimeout(achHelped, 300); // left unseen: back on the next page
      // Closed by the safety net (cardShow: never drawn): not read, so not thanked; due again at the next visit (no retry
      // now: a card that cannot be drawn would loop).
      if (how === 'empty') return void (brk && route());
      const A = store.get(ACHK, {}) || {};
      helpedMark(A, ids, Date.now());
      store.set(ACHK, A);
      if (SYNC) syncSoon();
      if (brk) route(); // at the break: on to the next question
    }
  });
  return true;
}
// The ids of the player's own reports, from the sheet's load reply (sync.js repsSeen): those sent signed in on any
// device. Then the check above.
function achReps(ids) {
  if (!store.get(ACHK, null)) achCheck(true);
  const A = store.get(ACHK, {}) || {};
  if (repsAdd(A, ids)) store.set(ACHK, A);
  achHelped();
}
const TIER = ['', '🥉', '🥈', '🥇'];
let achQ = [],
  achBusy = false;
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function achPop(a) {
  if (!a) return;
  achQ.push(a);
  if (!achBusy) achNext();
}
// One overlay at a time (a tap on a toast over a card would leave the question): while a card (.unlock, the sign-in
// card included) or the tour is open, the toast waits and shows once they have closed; a card that opens over a toast
// sends it back to the front of the queue, to show whole afterwards.
const achBlocked = () => document.querySelector('.unlock, #tour');
function achHold(a) {
  achQ.unshift(a);
  const mo = new MutationObserver(() => {
    if (achBlocked()) return;
    mo.disconnect();
    achNext();
  });
  mo.observe(document.body, {childList: true});
}
function achNext() {
  const a = achQ.shift();
  if (!a) return (achBusy = false);
  achBusy = true;
  if (achBlocked()) return achHold(a);
  const el = document.createElement('div');
  el.className = 'achpop t' + a.tier + (calm() ? ' calm' : '');
  el.setAttribute('role', 'status');
  // The cards' look (app.js cardShow, docs/DESIGN.md "Cards"), as a toast: the achievement's own emoji in a small medallion
  // with its tier at the edge, on the pale tint of the kind's hue.
  el.innerHTML = `<a href="${esc(hr('ach'))}" class="achin" data-k="ach"><span class="achic" aria-hidden="true"><span>${a.icon || CARD_KINDS.ach}</span><span class="tier">${TIER[a.tier] || ''}</span></span><span><small>Achievement unlocked</small><b>${esc(a.title)}</b><span>${esc(a.desc)}</span></span></a>${calm() ? '' : `<span class="confetti" aria-hidden="true">${Array.from({length: 14}, (_, i) => `<i style="--i:${i}"></i>`).join('')}</span>`}`;
  document.body.append(el);
  let tm = 0;
  const mo = new MutationObserver(() => {
    if (!el.isConnected || !achBlocked()) return;
    mo.disconnect();
    clearTimeout(tm);
    el.remove();
    achHold(a);
  });
  mo.observe(document.body, {childList: true});
  const done = () => {
    if (!el.isConnected) return; // once only: a click and the timer must not both move the queue on
    mo.disconnect();
    clearTimeout(tm);
    el.remove();
    achNext();
  };
  el.querySelector('a').onclick = done;
  tm = setTimeout(done, 4200);
}
function achRecap(ids) {
  if (!ids.length) return;
  if (ids.length === 1) return achPop(achFind(ids[0]));
  achPop({
    tier: 2,
    icon: '🏅',
    title: `${ids.length} achievements`,
    desc: ids
      .map(id => (achFind(id) || {}).icon)
      .slice(0, 8)
      .join(' ')
  });
}
// #leaderboard/achievements: every achievement, earned ones first with their date, the others greyed with what earns them.
// The 🏆 page has two tabs, as on Steam: Leaderboard (#leaderboard) and Achievements (#leaderboard/achievements).
const boardTabs = cur =>
  `<nav class="btabs" aria-label="Leaderboard and achievements">${[
    ['board', '🏆 Leaderboard'],
    ['ach', `🏅 Achievements`]
  ]
    // Achievements not seen yet: the dot on 🏆 leads to the Leaderboard tab, so the Achievements tab carries it too, to
    // say where the new ones are.
    .map(
      ([h, t]) =>
        `<a href="${esc(hr(h))}"${h === cur ? ' aria-current="page"' : ''}${h === 'ach' && cur !== 'ach' && achNew() ? ' class="hasnew"' : ''}>${t}</a>`
    )
    .join('')}</nav>`;
// How many signed-in players hold each achievement (GET ?achs=1: {n, counts}), 5 minutes in memory.
let achsAt = 0,
  achsP = null;
const loadAchs = () => {
  if (!achsP || Date.now() - achsAt > 300000) {
    achsAt = Date.now();
    // Kept on this device like the leaderboard (BOARD_C): drawn at once, refreshed when the fresh counts arrive.
    achsP = fetch(SYNC_URL + '?achs=1')
      .then(r => r.json())
      .then(j => (j && j.ok && j.counts ? j : null))
      .catch(() => null)
      .then(j => {
        if (j) store.set('reefid-achs-cache', {n: j.n, counts: j.counts});
        else achsAt = 0;
        return j;
      });
  }
  return achsP;
};
// Earned first, newest first; then the others, the most often earned first (the next within reach); each with the share
// of players holding it, as on Steam.
function viewAch() {
  const A = store.get(ACHK, {}) || {},
    fresh = new Set(achShown());
  // Seen now: the quiet ones shown here lose their dot, and keep a "New" tag on this visit.
  if (fresh.size) {
    store.set(
      ACHNEW,
      achUnseen().filter(id => !fresh.has(id))
    );
    achDot();
  }
  const draw = S => {
    const pc = a => (S && S.n ? (100 * (S.counts[a.id] || 0)) / S.n : null),
      got = ACH_L()
        .filter(a => A[a.id])
        .sort((x, y) => A[y.id] - A[x.id]),
      left = ACH_L()
        .filter(a => !A[a.id])
        .sort((x, y) => (pc(y) || 0) - (pc(x) || 0)),
      fb = Array.isArray(A._fb) ? A._fb.length : 0,
      thx = Array.isArray(A._thx) ? A._thx.length : 0;
    const share = a => {
      const p = pc(a);
      return p == null ? '' : `<span class="achp">${p < 1 && p > 0 ? '<1' : Math.round(p)}% of players</span>`;
    };
    const card = (a, on) =>
      `<li class="achc${on ? ' on' : ''}${fresh.has(a.id) ? ' new' : ''} t${a.tier}"><span class="achic" aria-hidden="true">${a.icon}</span><span><b>${esc(a.title)} ${on ? TIER[a.tier] : ''}</b><small>${esc(a.desc)}${on ? ` · ${new Date(A[a.id]).toLocaleDateString([], {day: 'numeric', month: 'short'})}` : ''}</small>${share(a)}</span></li>`;
    // The Contributions apart, below the learning ones, in their order (1st, 5th, 10th report), with the count so far.
    // The ? text: the subject's own (UNITS achHelp), else the corals' words below.
    $v.innerHTML = `${UNITS[achSubj().id].achHelp ? UNITS[achSubj().id].achHelp() : `<p class="lede">Achievements mark milestones of your learning: genera met, genera at each level (Open Water, Advanced, Divemaster, Instructor), your overall progress, runs of right answers, look-alike duels, corallites, hard photos and your Elo (from ${ELO_MIN} answers). Runs and hard photos are earned in the Quiz only (not in the Custom quiz or the Look-alike duels). Never time spent. Contributions, apart, thank you for the reports and feedback you send (⚑ Report a problem, Send feedback): one per photo, and an "Other" report with a note; they never count in your progress. The share of players counts everyone who signed in.</p>`}
  <div class="board">${boardTabs('ach')}<h2 class="btitle">${got.length}/${ACH_L().length} earned</h2>
  <ul class="achl">${got.map(a => card(a, true)).join('')}${left.map(a => card(a, false)).join('')}</ul>
  <h2 class="btitle bsec">Contributions <small>${fb ? `${fb} report${fb > 1 ? 's' : ''} sent` : 'reports and feedback you send'}${thx ? ` · ${thx} handled` : ''}</small></h2>
  <ul class="achl">${ACH_C()
    .map(a => card(a, !!A[a.id]))
    .join('')}</ul></div>`;
  };
  draw(store.get('reefid-achs-cache', null));
  loadAchs().then(S => {
    if (S && hashNow() === 'ach') draw(S);
  });
}
// Told once, when the leaderboard arrives, to players already signed in: their name now shows there.
function boardNotice() {
  // Players signed in before the leaderboard: one sync writes their progress % (the sheet has none for them yet), once
  // the sheet serves the leaderboard (an older script ignores the %).
  if (SYNC && !store.get('reefid-board-sent14', 0))
    loadBoard(board0()).then(B => {
      if (B && !B.err && SYNC && !store.get('reefid-board-sent14', 0)) {
        store.set('reefid-board-sent14', 1);
        syncSoon();
      }
    });
  // Said only on a subject with a live leaderboard; elsewhere it waits for a later load. A switch of subject while it
  // shows takes it away and it is due again (app.js setSubject, toastsOff). Told on another device of the account
  // (core.js TOLD 'board'): checked after the visit's first sync (sync.js noticeLater).
  if (!SYNC || store.get('reefid-board-told', 0) || !boardLive(SUBJ) || noticeLater('board', boardNotice) || toldHas('board')) return;
  store.set('reefid-board-told', 1);
  const ms = 15000,
    t = appToast(
      '🏆 New: a <a href="' + esc(hr('board')) + '">leaderboard</a>. Your name shows there; to leave it, ⚙ Settings, Leaderboard: Off.',
      ms
    ),
    // Told for the account once closed or gone by itself; not when a switch of subject takes it away (toastsOff: due again).
    told = () => !t.dataset.off && toldAdd('board');
  t.dataset.again = 'reefid-board-told';
  t.querySelector('a').onclick = () => (told(), t.remove());
  t.querySelector('button').addEventListener('click', told);
  setTimeout(told, ms);
}
// The announcement card of the notes in RECALC.L: the past progress recalculations and a new game mode (a new
// recalculation is not announced: docs/rules/sheet.md). Once per device, to a player who already has answers, at the
// first moment no tour or card is open; marked seen only by its button or Escape, so a card closed by leaving the page
// comes back on the next one. A player who missed several notes sees them all on one card, latest first; KEY holds the
// id of the last note seen. Each note's kind (app.js CARD_KINDS: 'update', 'feature') gives the card its medallion: for
// an update, the player's progress ring as it is now.
const RECALC = {
  KEY: 'reefid-recalc',
  L: [
    {
      id: 'progress-moving-average-2026-11',
      kind: 'update',
      t: "We've improved how progress is measured",
      p: 'Based on feedback from the first players, your progress now reflects more closely how well you can tell each genus apart from the others. Your % may be lower than before, and it will grow a little more slowly. None of your answers is lost.'
    },
    {
      id: 'millepora-counts-2026-11',
      kind: 'update',
      t: '<i>Millepora</i> now counts in your progress',
      p: '<i>Millepora</i> (fire coral) is on the IMR benthic slate and very common at Dauin and in ReefCloud photos, so it now counts in your progress, which is now over 40 genera: your % may be a little lower.'
    },
    // A new game mode announced the same way (its text is Pierre's validated wording). k, b: the card's kicker and button
    // when this note is the latest due.
    {
      id: 'typed-questions-2026-11',
      kind: 'feature',
      k: 'New',
      b: 'Bring it on',
      t: 'Think you know your genera? Think again.',
      p: "New in the quiz: typed questions. No choices, no hints, just the photo and an empty box: type the genus from memory. They show up once you're doing well on a genus, and mastery exams now include them. Picking among four is good; naming it cold is what makes an expert."
    }
  ]
};
// Whether start-up has settled its one-time cards (recalcNotice, mxLostNotice, rvNotice, sorryNotice, subjHello, the
// achievements' toasts): tests wait for window.CARDS_SAID rather than for a fixed time, as for window.RECALC_SAID. True
// once the app is ready (app.js SETUP 2 sets APP_READY after calling them), the notices that waited for the visit's first
// sync have run on the merged state (sync.js noticesReady), subjHello is not waiting for its calm moment (helloT), and
// no card waits to try again (noticeAgain) unless a card or the tour it waits behind is on screen: every card due is
// then on screen, decided against, or behind one that is. Read live, so a page change that closes a card unseen (it
// comes back 300 ms later) reads false until it is back.
const NOTICE_AGAIN = new Set();
function noticeAgain(fn, ms) {
  const t = setTimeout(() => (NOTICE_AGAIN.delete(t), fn()), ms);
  NOTICE_AGAIN.add(t);
  return t;
}
const noticeStop = t => (clearTimeout(t), NOTICE_AGAIN.delete(t));
Object.defineProperty(window, 'CARDS_SAID', {
  configurable: true,
  get: () => !!window.APP_READY && noticesReady() && !helloT && (!NOTICE_AGAIN.size || !!document.querySelector('#tour, .unlock'))
});
function recalcNotice() {
  if (noticeLater('recalc', recalcNotice)) return; // signed in: after the visit's first sync (sync.js noticeLater)
  // The recalculations announced (RECALC) are one subject's (core.js SUBJECTS recalcNote: the corals): shown in it.
  const RS = SUBJECTS.find(x => x.recalcNote);
  if (!RS) return void (window.RECALC_SAID = 'none');
  if (RS !== SUBJ) return inSubject(RS.id, recalcNotice);
  // Whether this load has decided ("none" or "shown"; tests wait for it rather than for a fixed time).
  const said = d => (window.RECALC_SAID = d);
  // The last note seen: here (KEY) or on another device of the account (core.js TOLD 'recalc:<id>'), the later one.
  const L = RECALC.L,
    last = L[L.length - 1].id,
    at = id => L.findIndex(x => x.id === id),
    seen = Math.max(at(store.get(RECALC.KEY, '')), ...L.filter(x => toldHas('recalc:' + x.id)).map(x => at(x.id))),
    due = L.slice(seen + 1).reverse();
  if (!due.length) return void said('none');
  // Answers: the global count, or the units' own for progress saved before it existed.
  const played = answersSoFar() > 0 || Object.values(P).some(s => s && typeof s === 'object' && ((s.ok || 0) + (s.ko || 0) > 0 || s.h));
  if (!played) return void (store.set(RECALC.KEY, last), said('none'));
  // Something else on screen (the tour, a card): try again a little later, until the screen is clear.
  if (document.querySelector('.recalc')) return void said('shown'); // already on screen
  if (document.querySelector('#tour, .unlock')) return void noticeAgain(recalcNotice, 2000);
  said('shown');
  const k = due[0].kind || 'update';
  cardShow({
    kind: k,
    cls: 'recalc',
    visual: k === 'update' ? cardRing(headPct()) : '',
    kick: due[0].k || 'Update',
    title: due[0].t,
    body: due.map((x, i) => `${i ? `<h3>${x.t}</h3>` : ''}<p>${x.p}</p>`).join(''),
    primary: {text: due[0].b || 'Got it', on: () => (store.set(RECALC.KEY, last), toldAdd('recalc:' + last))},
    esc: 1,
    enter: 1,
    // Leaving the page (route) closes it unseen; it comes back once the new page is drawn (a player opening straight at
    // a game would otherwise lose it to the first route).
    onClose: how => how === 'route' && noticeAgain(recalcNotice, 300)
  });
}
// A learned mark taken away by a recalculation (model.js mxRecalc, MXL): silent while MXL.QUIET (docs/rules/sheet.md).
// When told: once on this device by an announcement card, like recalcNotice (rule D6), at start-up once the progress is
// in and right after a pull or an answer that drops a mark (mxLost), on whatever page is open, waiting for another card
// or the tour to go (tried every 2 s). Names the genera and the achievements taken back with them (achRecheck). Seen
// only by OK, Enter or Escape; leaving the page closes it unseen and it comes back on the next one.
const andList = L => (L.length < 2 ? L.join('') : L.slice(0, -1).join(', ') + ' and ' + L[L.length - 1]);
// why: the reason per genus (model.js mxRecalc): 'bkt' an exam passed under the former model, 'rules' a recalculation of
// the whole log under newer rules (the sheet's full replay, sync.js replayAdopt).
function mxLostText(L, nAch, why = {}) {
  const one = L.length === 1,
    it = x => andList(x.map(n => `<i>${esc(n)}</i>`)),
    B = L.filter(n => (why[n] || 'bkt') === 'bkt'),
    N = L.filter(n => (why[n] || 'bkt') !== 'bkt'),
    back = x =>
      x.length === 1
        ? 'This genus is back on its progress bar, and its exam'
        : 'These genera are back on their progress bars, and their exams';
  return [
    B.length
      ? `You passed the mastery exam on ${it(B)} under the beta's first rules, which brought the exam too early. ${back(B)} will come again.`
      : '',
    N.length
      ? `Your progress was recalculated from all your answers with the app's current rules, and the mastery exam you passed on ${it(N)} no longer stands. ${back(N)} will come again.`
      : '',
    nAch ? `Until then, the ${nAch > 1 ? 'badges' : 'badge'} earned with ${one ? 'it' : 'them'} ${nAch > 1 ? 'are' : 'is'} taken back.` : ''
  ]
    .filter(Boolean)
    .join(' ');
}
let mxLostT = 0;
// A mark told on another device of the account (core.js TOLD 'mx:<unit>@<its s.mx>'), or back on the unit by the time the
// card would show (a sync merged a copy that has it), is not told: it goes to told here, silently.
const mxTok = (n, mx) => `mx:${n}@${mx}`;
function mxLostNotice() {
  noticeStop(mxLostT);
  let M = store.get(MXL.KEY, {}) || {};
  // Silent while model.js MXL.QUIET: a card still due goes to told unseen.
  if (MXL.QUIET) {
    if (Object.keys(M.due || {}).length) store.set(MXL.KEY, {...M, told: {...(M.told || {}), ...M.due}, due: {}, gone: []});
    return;
  }
  if (noticeLater('mxlost', mxLostNotice)) return; // signed in: after the visit's first sync (sync.js noticeLater)
  const done = Object.keys(M.due || {}).filter(n => toldHas(mxTok(n, M.due[n])) || (P[n] && P[n].mx));
  if (done.length) {
    const left = {...M.due},
      told = {...(M.told || {})};
    done.forEach(n => ((told[n] = left[n]), delete left[n]));
    M = {...M, due: left, told, ...(Object.keys(left).length ? {} : {gone: []})};
    store.set(MXL.KEY, M);
  }
  const due = M.due || {},
    L = Object.keys(due).sort();
  if (!L.length || document.querySelector('.mxlost')) return;
  if (document.querySelector('#tour, .unlock')) return void (mxLostT = noticeAgain(mxLostNotice, 2000));
  cardShow({
    kind: 'update',
    cls: 'mxlost',
    kick: 'Early beta',
    title: `${L.length > 1 ? 'Mastery exams' : 'Mastery exam'} to take again`,
    body: `<p>${mxLostText(L, (M.gone || []).length, M.why || {})}</p>`,
    primary: {
      text: 'OK',
      on: () => {
        // Seen: those marks go to told; a drop that came while the card was open shows next.
        const N = store.get(MXL.KEY, {}) || {},
          told = N.told || {},
          left = {...(N.due || {})};
        L.forEach(n => {
          told[n] = due[n];
          if (left[n] === due[n]) delete left[n];
        });
        store.set(MXL.KEY, {...N, due: left, told, gone: []});
        toldAdd(...L.map(n => mxTok(n, due[n])));
        mxLostNotice();
      }
    },
    esc: 1,
    enter: 1,
    onClose: how => how === 'route' && (mxLostT = noticeAgain(mxLostNotice, 300))
  });
}
// The announcement card of a rules version (core.js RVS msg; rule D6: shown on whatever page the player lands on, never
// held). When this device adopts the sheet's full replay of a newer version (sync.js replayAdopt), every version it
// skipped that has a msg is due once (RVN.KEY, device only: due, the versions to show; told, those shown; pct, the
// progress % before and after, per version: a msg with only 'changed' is due only when they differ by msg.min points or
// more, core.js RV_CARD). One card per version, oldest first; like recalcNotice it waits only for another card or the
// tour (tried every 2 s), and a page change closes it unseen to show it again. At start-up and right after an adoption.
const RVN = {KEY: 'reefid-rv-msg'};
const rvTold = v => toldHas('rv:' + v); // its card seen on another device of the account (core.js TOLD)
// A rules version's card id: the first replayed subject's version number, another subject's (core.js SUBJECTS replayed,
// its own rules versions) '<subject>:<version>', so two subjects' versions of one number never meet.
const rvId = (sid, v) => (!sid || sid === replaySubject() ? v : sid + ':' + v);
// Every rules version that may have a card, each with its id (k).
const rvAll = () => [
  ...RVS.map(r => ({...r, k: r.v})),
  ...replayedSubjects().flatMap(id => rvsOf(id).map(r => ({...r, k: rvId(id, r.v)})))
];
// The corals' versions first, by number, then the other subjects', by subject then number.
const rvOrder = (a, b) =>
  typeof a === 'number' && typeof b === 'number'
    ? a - b
    : typeof a === 'number'
      ? -1
      : typeof b === 'number'
        ? 1
        : String(a).localeCompare(String(b), undefined, {numeric: true});
// sid: the subject replayed (the corals when none; fish from sync.js replayAdoptS), whose rules versions from..to these are.
function rvNoticeAdd(from, to, pct, sid) {
  const M = store.get(RVN.KEY, {}) || {},
    told = [
      ...new Set([
        ...(M.told || []),
        ...rvAll()
          .map(r => r.k)
          .filter(rvTold)
      ])
    ],
    due = (M.due || []).filter(v => !told.includes(v)),
    pc = M.pct || {},
    k = x => rvId(sid, x.v);
  // A version without a card (a recalculation is not told: docs/rules/sheet.md): this subject's cards still due here go
  // too, so a card queued before the upgrade never shows after it.
  const VS = sid ? rvsOf(sid) : RVS,
    V = VS.find(x => x.v === to);
  if (V && !V.msg) {
    const ids = VS.map(x => rvId(sid, x.v)),
      keep = v => !ids.includes(v);
    store.set(RVN.KEY, {
      due: due.filter(keep),
      told,
      pct: Object.fromEntries(Object.entries(pc).filter(([v]) => keep(isNaN(v) ? v : Number(v)))),
      ...((M.std || []).filter(keep).length ? {std: M.std.filter(keep)} : {})
    });
    return;
  }
  // An apology (core.js RV_SORRY down) only when the % went down by its min points or more; otherwise the jump's other
  // cards, the standard one included (rvMsgs skip).
  let L = rvMsgs(from, to, false, sid);
  const sorry = L.find(x => x.msg.down),
    std = [];
  if (sorry && !(pct && pct[0] - pct[1] >= (sorry.msg.min || 0))) {
    L = rvMsgs(from, to, true, sid);
    // No earlier version in the jump with the standard card (an upgrade from the version just before): the standard card
    // under the apology's version (M.std; rvNotice shows RV_CARD for it).
    if (!L.some(x => x.msg === RV_CARD)) (L.push({v: sorry.v, msg: RV_CARD}), std.push(k(sorry)));
  }
  L.forEach(x => {
    if (told.includes(k(x)) || due.includes(k(x))) return;
    if (x.msg.only === 'changed' && !(pct && pct[0] !== pct[1] && Math.abs(pct[1] - pct[0]) >= (x.msg.min || 0))) return;
    if (pct) pc[k(x)] = pct;
    due.push(k(x));
  });
  const st = [...new Set([...(M.std || []).filter(v => !std.length || v !== std[0]), ...std.filter(v => due.includes(v))])];
  store.set(RVN.KEY, {due: due.sort(rvOrder), told, pct: pc, ...(st.length ? {std: st} : {})});
  if (window.APP_READY) rvNotice();
}
let rvT = 0;
// A card's PS (core.js RV_SORRY ps): a line the sheet serves (sync.js NOTES_KEY, Code.gs notes_), small under the text,
// when it is set; never written in the repo.
const rvPs = m => {
  const t = m && m.ps ? String(((typeof NOTES_KEY === 'string' ? store.get(NOTES_KEY, {}) : {}) || {})[m.ps] || '').trim() : '';
  return t ? `<p class="cardps"><small>${esc(t)}</small></p>` : '';
};
function rvNotice() {
  noticeStop(rvT);
  if (noticeLater('rv', rvNotice)) return; // signed in: after the visit's first sync (sync.js noticeLater)
  let M = store.get(RVN.KEY, {}) || {};
  // Seen on another device since it was due here: told, silently.
  const elsewhere = (M.due || []).filter(rvTold);
  if (elsewhere.length) {
    M = {...M, due: M.due.filter(v => !elsewhere.includes(v)), told: [...new Set([...(M.told || []), ...elsewhere])]};
    store.set(RVN.KEY, M);
  }
  const r0 = rvAll()
      .filter(r => (M.due || []).includes(r.k) && r.msg && !(M.told || []).includes(r.k))
      .sort((a, b) => rvOrder(a.k, b.k))[0],
    // A version whose standard card replaced its apology (rvNoticeAdd std): the standard card.
    x = r0 && (M.std || []).includes(r0.k) ? {...r0, msg: RV_CARD} : r0;
  if (!x || document.querySelector('.rvmsg')) return;
  if (document.querySelector('#tour, .unlock')) return void (rvT = noticeAgain(rvNotice, 2000));
  // The progress ring in the medallion: the % after the recalculation, the one before faint behind it (app.js cardRing).
  const [pf, pt] = (M.pct || {})[x.k] || [];
  cardShow({
    kind: x.msg.kind || 'update',
    cls: 'rvmsg',
    kick: x.msg.kick || 'Update',
    title: x.msg.t,
    visual: pt != null ? cardRing(pt, pf) : '',
    // pct: the two % on a line of their own that never wraps (core.js RV_SORRY); ps: the sheet's line (rvPs).
    body: `<p>${x.msg.p.replace('{from}', pf).replace('{to}', pt)}</p>${
      x.msg.pct && pt != null ? `<p class="cardpct">${esc(x.msg.pct.replace('{from}', pf).replace('{to}', pt))}</p>` : ''
    }${rvPs(x.msg)}`,
    primary: {
      text: 'Got it',
      on: () => {
        const N = store.get(RVN.KEY, {}) || {};
        store.set(RVN.KEY, {...N, due: (N.due || []).filter(v => v !== x.k), told: [...new Set([...(N.told || []), x.k])]});
        toldAdd('rv:' + x.k);
        rvNotice(); // the next version's card, if any
      }
    },
    esc: 1,
    enter: 1,
    onClose: how => how === 'route' && (rvT = noticeAgain(rvNotice, 300))
  });
}
// An apology, once (docs/ARCHITECTURE.md; core.js SORRY, sorryOf, sorryFelt, sorryText): to a player who really felt the
// too-fast opening of the corals (too many new genera at once, no easier questions after misses), at app open, greeted by
// the first word of their sign-in name (else "Hi!"). Whether they felt it is read once, the first time this runs on the
// device (FIRST: the time and what sorryOf reads then), so playing on changes nothing. A card like recalcNotice's (kind
// apology): it waits while the tour or another card is up; its button, Enter or Escape close it for good on this device
// (reefid-sorry) and, signed in, on the account's others (core.js TOLD 'sorry'); leaving the page closes it unseen.
const SORRYK = {KEY: 'reefid-sorry', FIRST: 'reefid-sorry-first'};
function sorryNotice() {
  // The apology is about one subject's opening (core.js SUBJECTS sorry: the corals): it waits until the player is on it.
  if (!SUBJ.sorry) return;
  if (noticeLater('sorry', sorryNotice)) return; // signed in: after the visit's first sync (sync.js noticeLater)
  const now = Date.now();
  let F = store.get(SORRYK.FIRST, null);
  if (!F || typeof F !== 'object') {
    let log = [];
    try {
      log = subjEntries([...((SYNC && SYNC.log) || []), ...(store.get(LOG0, []) || [])], SUBJ.id); // its own answers only
    } catch (e) {}
    F = {t: now, ...sorryOf({log, cards: introMap(), total: answersSoFar(), h: HOLDS, first: now})};
    store.set(SORRYK.FIRST, F);
  }
  if (!sorryDue({felt: F, now, shown: store.get(SORRYK.KEY, 0) || toldHas('sorry')})) return; // or on another device (TOLD)
  if (document.querySelector('.sorry')) return; // already on screen
  if (document.querySelector('#tour, .unlock')) return void noticeAgain(sorryNotice, 2000);
  const x = sorryText(SYNC && SYNC.name, now, new Date(now).getTimezoneOffset());
  cardShow({
    kind: 'apology',
    cls: 'sorry',
    kick: 'Sorry',
    title: esc(x.t),
    body: `<p>${esc(x.p)}</p>`,
    primary: {text: 'Thanks', on: () => (store.set(SORRYK.KEY, Date.now()), toldAdd('sorry'))},
    esc: 1,
    enter: 1,
    onClose: how => how === 'route' && noticeAgain(sorryNotice, 300)
  });
}
// The card that tells a player about a subject (app.js UNITS hello; docs/ARCHITECTURE.md "Subjects"), once, at a calm
// moment: hello.group while the subject opens to a group (its players only, subjGroups), hello.all once it opens to
// everyone while in beta. Each is seen once under its own key (subjDev, core.js TOLD), never in the admin's browser,
// only to a player with HELLO.MIN answers on the subject on screen; one who has played it is marked seen at once. Calm:
// Home, HELLO.WAIT after it is drawn, nothing else on screen, quiz.js promptOk; else the next Home tries again.
const HELLO = {KEY: 'hello-', MIN: 10, WAIT: 1500};
// The way S opens ('group' or 'all'): the name of its card in UNITS hello and of the card's seen mark.
const helloMode = S => (subjGroup(S) ? 'group' : 'all');
// Its token once seen (core.js TOLD), for every device of the account.
const helloTok = S => `hello:${S.id}-${helloMode(S)}`;
// 'show', 'met' (mark it seen, say nothing), or '' (not now). Pure on its inputs: tests call it.
const helloDue = ({card, member, admin, seen, met, answers}) =>
  !card || !member || admin || seen ? '' : met ? 'met' : answers >= HELLO.MIN ? 'show' : '';
let helloT = 0;
function subjHello() {
  clearTimeout(helloT);
  helloT = 0; // no calm moment awaited (window.CARDS_SAID) unless set again below
  const home = () => (hashNow() || 'home') === 'home';
  if (!home() || noticeLater('hello', subjHello)) return; // signed in: after the visit's first sync (sync.js noticeLater)
  // The 'all' card is the beta invitation: only while the subject keeps its beta label (SUBJECTS beta).
  const card = S => (helloMode(S) === 'all' && !S.beta ? null : (UNITS[S.id].hello || {})[helloMode(S)]),
    member = S => (helloMode(S) === 'group' ? subjGroups().includes(S.id) : subjOpen(S));
  // The first subject with a card due for the player, never by its place: one whose card is settled (seen, or the subject
  // already met) gives way to the next.
  let S = null,
    H = null,
    key = '',
    tok = '';
  for (const X of SUBJECTS.filter(x => card(x) && member(x))) {
    const k = subjDev(X.id, HELLO.KEY + helloMode(X)),
      t = helloTok(X),
      P2 = store.get(subjKey(X.id, 'progress'), null),
      due = helloDue({
        card: card(X),
        member: member(X),
        admin: HAS_ADMIN_TOKEN,
        seen: !!store.get(k, null) || toldHas(t), // or on another device of the account (core.js TOLD)
        met: SUBJ === X || !!store.get(startKey(X.id), null) || !!(P2 && typeof P2 === 'object' && Object.keys(P2).length),
        answers: answersSoFar() // the subject on screen's, another subject than X (met otherwise)
      });
    if (due === 'met') store.set(k, 'met');
    if (due !== 'show') continue;
    [S, H, key, tok] = [X, card(X), k, t];
    break;
  }
  if (!S) return;
  helloT = setTimeout(() => {
    helloT = 0; // decided now: shown, or not now (window.CARDS_SAID)
    const busy = !lb.hidden || !$helpbox.hidden || !$set.hidden || document.querySelector('.apptoast, .hello');
    if (!home() || busy || store.get(key, null) || toldHas(tok) || !member(S) || !promptOk()) return;
    promptMark();
    const seen = () => (store.set(key, Date.now()), toldAdd(tok));
    cardShow({
      kind: S.card,
      cls: 'hello',
      kick: H.kick,
      title: H.title,
      body: H.body,
      primary: {text: `Try ${esc(S.name.toLowerCase())}`, on: () => (seen(), setSubject(S.id).then(() => (location.hash = hr('quiz'))))},
      secondary: {text: 'Later', on: seen},
      esc: 2
    });
  }, HELLO.WAIT);
}
// The notices this device marked seen before they travelled with the account (core.js TOLD), told to the account once at
// start-up, so its other devices stop showing them too; a save sends them when any is new. Once per device (SEEDK), and
// only to the account signed in then: a later account on a shared device never takes the marks a previous player left.
// Not signed in then: never (an anonymous device keeps them here).
const SEEDK = 'reefid-told-seeded';
function toldSeed() {
  if (store.get(SEEDK, 0)) return;
  store.set(SEEDK, 1);
  if (!SYNC) return;
  const L = [],
    r = RECALC.L.findIndex(x => x.id === store.get(RECALC.KEY, ''));
  if (r >= 0) L.push('recalc:' + RECALC.L[r].id);
  ((store.get(RVN.KEY, {}) || {}).told || []).forEach(v => L.push('rv:' + v));
  const told = (store.get(MXL.KEY, {}) || {}).told || {};
  Object.keys(told).forEach(n => L.push(mxTok(n, told[n])));
  if (store.get(SORRYK.KEY, 0)) L.push('sorry');
  SUBJECTS.forEach(S =>
    ['group', 'all'].forEach(m => {
      const v = store.get(subjDev(S.id, HELLO.KEY + m), null);
      if (v && v !== 'met') L.push(`hello:${S.id}-${m}`);
    })
  );
  if (store.get('reefid-board-told', 0)) L.push('board');
  if (L.length) toldAdd(...L);
}
// The notes on screen go when the subject changes (they speak of the subject that was on screen); one marked
// data-again (its "told" key) is due again later.
function toastsOff() {
  document.querySelectorAll('.apptoast').forEach(t => {
    if (t.dataset.again) (store.set(t.dataset.again, 0), (t.dataset.off = 1));
    t.remove();
  });
}
// A short note at the bottom of the screen (.apptoast, the cards' tint and shadow; html is the app's own text), closed by
// ✕ or after ms.
function appToast(html, ms) {
  const t = document.createElement('div');
  t.className = 'apptoast';
  t.setAttribute('role', 'status');
  t.innerHTML = `<span>${html}</span><button type="button" aria-label="Close">✕</button>`;
  t.querySelector('button').onclick = () => t.remove();
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
  return t;
}
// ⚙ Leaderboard On / Off: saved here, sent with the next sync.
const showBoardSet = () =>
  document
    .querySelectorAll('#boardset button')
    .forEach(b => b.setAttribute('aria-pressed', String((b.dataset.board === '1') === boardOn())));
document.querySelectorAll('#boardset button').forEach(
  b =>
    (b.onclick = () => {
      store.set(BOARD, {v: b.dataset.board === '1' ? 1 : 0, t: Date.now()});
      showBoardSet();
      Object.keys(boardP).forEach(k => delete boardP[k]); // every subject's board fetched again
      syncSoon();
    })
);
showBoardSet();
// The progress backup (⚙ Export / Import) is bound once the page is in.
bindProgFile();
