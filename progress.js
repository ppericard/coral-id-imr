// IMR Reef ID: My progress, the progress pill, the leaderboard and achievements, split out of app.js (2026-11-02, code
// review L1: one file per part, one piece at a time). A classic script like app.js and sync.js: it shares their
// top-level names and is loaded right after sync.js (index.html, in order); app.js waits for every script
// (window.BOOT) before its first page. Required like app.js: the loader tries it 3 times, the service worker keeps it.
// Progress board, one screen: a wall of the slate genera's cover photos in slate order (name band in the level colour, grey photo =
// not seen, amber dot = review) beside a side column with the overall ring, what to review first and the mix-ups. Signing in
// and backup/reset live in the header and ⚙ (Pierre, 2026-11-01: the board comes first, nothing unrelated around it).
// The player's card on My progress (Pierre, 2026-11-01: "a badge, as in video games"; 2026-11-02: one compact element
// with the ring, at the top of the page, not under the slate tiles): the overall ring with its %, then the name, place and
// Elo (the rank filled once the leaderboard loads; nothing before the Elo is due and while not on the board: it comes by
// itself, Pierre 2026-11-02), genera learned (or met) and achievements earned with the last three. The rank links to the
// leaderboard, the achievements to their page. One level everywhere (Pierre, 2026-11-06, Q134): the Elo is always this
// device's own level (P[LEVEL], eloLine), never the board's copy of it, so it does not change when the board arrives.
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
    <span>${sub ? `<span>${sub}</span>` : ''}${SUBJ.board ? `<a id="pbrank" href="${esc(hr('board'))}"${eloLine(G) ? '' : ' hidden'}>🏆 ${eloLine(G)}</a>` : ''}${
      SUBJ.ach
        ? `<a href="${esc(hr('ach'))}"${achNew() ? ' class="hasnew"' : ''}>🏅 <b>${got.length}</b>/${ACH_L().length} ${got
            .filter((a, i) => got.findIndex(b => b.icon === a.icon) === i) // the latest of each kind: three different icons
            .slice(0, 3)
            .map(a => `<span title="${esc(a.title)}">${a.icon}</span>`)
            .join('')}</a>`
        : ''
    }</span></div></div>`;
}
// A name of 13+ letters (Duncanopsammia) gets a soft hyphen near its middle, between a vowel and a consonant: a phone
// tile breaks it there with a hyphen instead of anywhere, at the normal size (RA review and Codex review #344).
const shyName = n => {
  if (n.length < 13) return n;
  const V = /[aeiouy]/i;
  for (let d = 0; d < n.length / 2 - 3; d++)
    for (const i of [Math.round(n.length / 2) + d, Math.round(n.length / 2) - d])
      if (V.test(n[i - 1]) && !V.test(n[i])) return n.slice(0, i) + '\u00ad' + n.slice(i);
  return n;
};
function quizBoard() {
  const list = slateGenera(),
    // A unit's page: its genus sheet, or the subject's list when it has no sheets (fish); a pair's comparison likewise.
    href = n => esc(hr(SUBJ.pages.includes('sheet') ? `g-${n}` : 'genera')),
    hrefPair = (a, b) => esc(hr(SUBJ.pages.includes('cmp') ? `cmp-${a}|${b}` : 'genera'));
  // Bonus genera (off the slate), once on (⚙ or the offer card): tiles after the slate genera (Pierre, 2026-11-01).
  // They stay out of the ring and the counts.
  const BO = bonusList();
  const lv = Object.fromEntries([...list, ...BO].map(n => [n, shownLevel(n)]));
  const count = k => list.filter(n => lv[n][0] === k).length;
  const weak = list.filter(n => lv[n][0] === 'weak').sort((a, b) => weight(b) - weight(a));
  // Mastery level on a 6-step scale (one colour ramp, light to dark; model.js MASTERY: Not seen, Snorkeler, Open Water,
  // Advanced, Divemaster, Instructor). "Review" is a separate marker, so it never hides the level.
  const st = Object.fromEntries([...list, ...BO].map(n => [n, lvStep(n)])),
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
  // Photo wall: the cover in full colour (grey = not seen) with a name band coloured by the genus's step on the scale,
  // holding the mini ring + % like the Slate and Groups tiles; review = an amber dot (app.css, 2026-11-03).
  const tile = n => {
    const g = GX(n),
      p = cover(g),
      [cl] = lv[n];
    const b = isBonus(n);
    return `<a class="pw ${cl} s${st[n]}${b ? ' bonus' : ''}" href="${href(n)}" title="${b ? (g.name ? setOf(n).tag + '. ' : 'Bonus genus, not on the IMR list. ') : isBenthic(n) ? 'Fire coral, on the IMR benthic slate. ' : ''}${tip(n)}">${p ? `<img ${thumb(p, '(max-width:599.98px) 100px, 165px')} alt="" loading="lazy">` : ''}${b ? `<b class="pbtag">${g.name ? esc(setOf(n).tag) : 'Bonus'}</b>` : ''}<span class="pwb">${g.name ? `<b>${g.rank ? `<i>${esc(g.name)}</i>` : esc(g.name)}</b>` : `<i>${esc(shyName(n))}${g.n || g.x ? '' : ' ★'}</i>`}${pct(n)}</span></a>`;
  };
  // Your mix-ups to review: each pair you mixed up, ranked by your own confusion score (confOf), so a pair you now tell
  // apart sinks and the ones you still confuse lead; the chip opens the side-by-side comparison (with "Drill this pair").
  const seenPair = new Set(),
    conf = list
      .flatMap(n =>
        Object.keys((P[n] || {}).conf || {})
          .filter(o => GX(o))
          .map(o => (n < o ? [n, o] : [o, n]))
      )
      .filter(([a, b]) => {
        const k = a + '|' + b;
        if (seenPair.has(k)) return false;
        seenPair.add(k);
        return true;
      })
      .map(([a, b]) => [a, b, pairConf(P, a, b)[1], confOf(a, b)])
      .sort((x, y) => y[3] - x[3])
      .slice(0, 3);
  // Three ways to show the same progress (Pierre wants to try each): photos, slate numbers, lecture groups.
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
  const gi = n => shownGroup(n) || 99,
    groups = [...new Set(list.map(gi))].sort((a, b) => a - b);
  const VIEWS = {
    photos: () => `<div class="pgrid pwall"${isPhone() ? ' data-minw="72"' : ''}>${[...list, ...BO].map(tile).join('')}</div>`,
    // Laid out like the physical IMR slate: 1-20 down the left column, 21-34 down the right, starred genera under them,
    // then Millepora (the benthic slate, no number: "F" for fire coral).
    slate: () => {
      const num = list.filter(n => GX(n).n),
        L = num.filter(n => GX(n).n <= 20),
        R = num.filter(n => GX(n).n > 20),
        S = list.filter(n => !GX(n).n);
      const ps = n =>
        `<a class="ps ${lv[n][0]} s${st[n]}" href="${esc(hr('g-' + n))}" title="${isBenthic(n) ? 'Fire coral, on the IMR benthic slate. ' : ''}${tip(n)}"${fill(n)}><b>${GX(n).n ? GX(n).n + '.' : isBenthic(n) ? 'F' : '★'}</b><i${n.length >= 13 ? ' class="lg"' : ''}>${esc(n)}</i>${pct(n)}</a>`;
      // Bonus genera: one strip across both columns under the slate, so the board still fits one screen.
      const rows = Math.max(L.length, R.length + (S.length ? S.length + 1 : 0));
      const bx = BO.map(
        n =>
          `<a class="ps ${lv[n][0]} s${st[n]} bonus" href="${esc(hr('g-' + n))}" title="Bonus genus, not on the IMR list. ${tip(n)}"><b>+</b><i${n.length >= 13 ? ' class="lg"' : ''}>${esc(n)}</i>${pct(n)}</a>`
      ).join('');
      // The left column padded to the row count, so 21 always starts the right column (Codex review #371: with
      // Millepora the right column outgrew the left and 21 slipped to the bottom of the left one).
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
        <span class="pseg">${L.map(n => `<a class="${lv[n][0]} s${st[n]}" href="${esc(hr('g-' + n))}" title="${tip(n)}"${fill(n)}><i>${esc(n)}</i>${pct(n)}</a>`).join('')}</span><small>${L.filter(n => lv[n][0] === 'ok').length}/${L.length}</small></div>`;
      })
      .join('')}
      ${
        BO.length
          ? `<div class="pgr pgbonus"><span class="gn" title="Bonus genera, not on the IMR list">+</span><span class="pgt">Bonus: not on the IMR list</span>
        <span class="pseg">${BO.map(n => `<a class="${lv[n][0]} s${st[n]}" href="${esc(hr('g-' + n))}" title="${tip(n)}"><i>${esc(n)}</i>${pct(n)}</a>`).join('')}</span><small>${BO.filter(n => lv[n][0] === 'ok').length}/${BO.length}</small></div>`
          : ''
      }</div>`
  };
  // Slate by default (Pierre, 2026-11-02: compact, and the order of the IMR slate the RAs know); the view switch is at the
  // bottom of the side column.
  const PV = SUBJ.progress;
  let pv = store.get('reefid-sync-pview', PV[0]);
  if (!PV.includes(pv) || !VIEWS[pv]) pv = PV[0];
  $v.innerHTML = `${
    UNITS[SUBJ.id].progHelp
      ? UNITS[SUBJ.id].progHelp()
      : `<p class="lede"><b>To learn a genus</b>, keep getting it right, above all when its look-alikes are among the choices: that fills it up to 95%, each point a little harder to earn than the last. Then comes its <b>mastery exam</b>: ${EXAM.n} questions on it, as hard as the game gets (one photo alone, never seen before, look-alikes among the choices), slipped unannounced into the Quiz, several questions apart. At least ${TYPED.exam} of them ask you to type the genus from memory, with no choices to pick from. All ${EXAM.n} right and you are its Instructor (100%); a single miss, or giving it as the answer for another genus, and the exam starts again later. A mistake sets a genus back, for the genus you missed and for the one you answered.</p>
  <p class="lede"><b>Typed questions</b>: from ${Math.round(100 * TYPED.from)}% on a genus, some of its questions ask you to type its name instead of picking it, more and more as it nears learned (about ${Math.round(100 * TYPED.at[TYPED.at.length - 1][1])}% of them at the exam). Old names are accepted, and a small typo still counts as right, but you retype the name once to learn its spelling; <b>I don't know</b> shows the answer and counts as a miss for that genus only; typing another genus counts against both, as a wrong pick does. A typed right answer counts in full, as much as a pick against its look-alikes: there is nothing to guess from.</p>
  <p class="lede"><b>Fire coral</b> (<i>Millepora</i>, <b>F</b> on the Slate view) is not a hard coral and not on the IMR coral list, but it is on the IMR benthic slate and very common at Dauin: it counts like the other genera. <b>Bonus genera</b>: corals that are not on the IMR list but are common at Dauin. Once you have met every genus of the slate, a card offers to add them (or ⚙ Settings, Bonus genera, any time); they then come one at a time, like the others. They don't count in your progress; their ID tips come from the Coral Finder book. On this page they come after the slate.</p>
  <p class="lede"><b>Levels</b>, the diver's ladder: <b>Snorkeler</b> under 50%, <b>Open Water</b> from 50%, <b>Advanced</b> from 80%, <b>Divemaster</b> from 95% (its mastery exam is on), <b>Instructor</b> once the exam is passed: you could teach it. The colours follow them, from pale to dark; white with a dashed border = not seen; the darkest, with a tick = Instructor. The mini ring on a tile shows exactly how far it has got. A red border and a red ! = to review (2 or more mistakes in its last 5 answers). <b>Photos</b>, <b>Slate</b> and <b>Groups</b> show the same progress in three layouts. Tap a genus to open its sheet: it shows what the genus still needs.</p>`
  }
  <p class="lede"><b>In detail</b>: each ${SUBJ.one} has its own photo difficulty, recomputed after every answer: it starts with the best photos, right answers bring harder ones, a mistake eases them off, and new photos keep coming in at every level. The % follows your recent answers on the ${SUBJ.one}: a right answer against its look-alikes, among 4 plausible choices, counts in full; one where the other choices look nothing like it counts a third as much; a mistake takes it back down, less when the photo was harder than your level. 95% (Divemaster) means it has held up against its look-alikes; Instructor means its mastery exam is passed too.</p>
  <div class="pgame pboard">${badge(ring, progPct(list), lvSummary(list))}<div class="pgwrap"></div>
  <aside class="gside">
    <div class="plvl" role="list" aria-label="Learning level">${STEPS.map(([k, t]) => `<span role="listitem" class="s${k}" title="${t}: ${nst(k)} ${SUBJ.many}">${lvIcon(k)}<b>${nst(k)}</b><small>${t}</small></span>`).join('')}<span role="listitem" class="pl-rev weak${count('weak') ? '' : ' zero'}" title="To review: ${count('weak')} ${SUBJ.many}"><b>${count('weak')}</b><small>Review</small></span></div>
    <p class="plvlnote"><span class="pbar"></span> = how close each ${SUBJ.one} is to Instructor</p>
    ${
      introLeft().length
        ? `<div class="popen"><p><b>Had ${SUBJ.lecture}?</b> ${introLeft().length} ${SUBJ.many} are not open yet: they come one at a time as you play.</p><button type="button" class="next" id="openall">Open all ${SUBJ.many}</button></div>`
        : ''
    }
    ${
      weak.length
        ? `<div><h3 class="label">Review first</h3><p class="chips">${weak
            .slice(0, 4)
            .map(n => `<a class="chip" href="${href(n)}">${uname(n)}</a>`)
            .join('')}</p></div>`
        : ''
    }
    ${conf.length ? `<div><h3 class="label">Often mixed up</h3><p class="chips">${conf.map(([n, o, k]) => `<a class="chip" href="${hrefPair(n, o)}" title="Compare side by side">${uname(n)} ↔ ${uname(o)} <small>· ${k}×</small></a>`).join('')}</p></div>` : ''}
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
      // The box goes and little else changes on this page: say it worked (new-player walkthrough 2026-11-02).
      appToast(`All ${slateGenera().length} ${SUBJ.many} are open: the quiz now asks any of them.`, 6000);
    };
  bindSync();
  // The player's place on the leaderboard (Pierre, 2026-11-01: rank and Elo here, the full board on its own page). The
  // board brings the rank only: the Elo stays the device's own (Q134), so nothing jumps when the reply comes.
  const rank = B => {
    const a = document.getElementById('pbrank'),
      i = B && B.rows ? boardMe(B.rows) : -1;
    if (!a || i < 0) return;
    const elo = eloLine(P[LEVEL]);
    a.innerHTML = `🏆 <b>#${i + 1}</b>${elo ? ' · ' + elo : ''}`;
    a.hidden = false;
  };
  if (SUBJ.board) {
    rank(boardCached());
    loadBoard().then(rank);
  }
  const wrap = $v.querySelector('.pboard .pgwrap');
  const show = () => {
    wrap.innerHTML = VIEWS[pv]();
    $v.querySelectorAll('[data-pv]').forEach(b => b.setAttribute('aria-pressed', b.dataset.pv === pv));
    requestAnimationFrame(() => {
      const g = wrap.firstChild;
      if (g.classList.contains('pgrid')) fitTiles(g, 6);
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

// The two highest levels reached, with their counts, for the card (Pierre, 2026-11-03: "0/39
// learned" for weeks was discouraging): "3 Divemaster · 12 Open Water". From Open Water up; '' before any genus reaches Open Water.
function lvSummary(list = slateGenera(), icons = true) {
  const st = list.map(lvStep);
  return [5, 4, 3, 2]
    .map(k => [k, st.filter(x => x === k).length])
    .filter(([, c]) => c)
    .slice(0, 2)
    .map(([k, c]) => `${icons ? lvIcon(k) : ''}${c} ${MASTERY[k][0]}`)
    .join(' · ');
}
// The units unlocked (Pierre, 2026-11-05: "30/40 genera unlocked"): the subject's units opened on the path (a card, an
// answer, Open all: model.js introduced), out of every unit the progress counts (slateGenera, whatever the subject puts in
// it); the units "not open yet" on this page (introLeft) are the rest. A unit counts from its card, a couple of answers
// before the draw asks it (model.js INTRO.GAP). [unlocked, all].
const unlockN = (list = slateGenera()) => [list.filter(introduced).length, list.length];
const unlockText = (list = slateGenera(), html = false) => {
  const [k, n] = unlockN(list);
  return `${html ? `<b>${k}</b>` : k}/${n} ${SUBJ.many} unlocked`;
};
// Header progress pill: always in view; the page itself is #progress.
function showProg() {
  if (!DATA) return;
  const n = slateGenera();
  const pt = `${progPct(n)}%`;
  document.getElementById('progn').textContent = pt;
  const p2 = document.getElementById('progn2');
  if (p2) p2.textContent = pt;
  // Not signed in: the pill's tooltip says so, so RAs find where to save their progress.
  const pill = document.getElementById('prog'),
    out = !!SYNC_URL && !SYNC;
  pill.querySelector('.pl').textContent = 'Progress';
  pill.style.setProperty('--pp', progPct(n));
  // Status only (design review 2026-11-01): the pill shows progress and nothing else. Its dot (saving trouble) is gone: the
  // "Not saved" pill beside it already says so in words (design re-review p9).
  pill.title = `${
    SYNC
      ? `Signed in as ${SYNC.name}: your progress per ${SUBJ.one}`
      : out
        ? 'Your progress (not saved online yet: Sign in, top right)'
        : `Your progress per ${SUBJ.one}`
  }. ${pt}, ${unlockText(n)}.`; // the count in words: the header has no room for it (one line at 1024 px, rule U3)
  // Signing in (Pierre, 2026-11-01): a filled "Sign in" button in the header on every page while signed out; once signed in
  // it disappears and the account (name, Send now, Sign out) is a quiet line at the top of ⚙. Trouble saving brings it
  // back as "Not saved", which opens ⚙ where the problem is explained.
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
// A progress file says which app wrote it: 'reefid', or before the rename (2026-11-03) the old id, still read.
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

// Public leaderboard (Pierre, 2026-11-01): every signed-in player by progress %, then Elo (their ability from every
// answer, so players at 100% keep competing). The Elo is the app's own level, P[LEVEL].th, the one My progress shows
// (Pierre, 2026-11-06, Q134): the sheet reads it from each player's saved progress (Code.gs board_, v63; older scripts
// sent their own chain, stats_ R), and the player's own row shows this device's level, which may be a few answers ahead. 🏆 in the header opens it from any page; My progress shows the player's
// rank and Elo with a link here. Signed-in players appear by default; ⚙ Leaderboard Off takes them off (sent with the next
// sync, the sheet's Board column). The sheet serves it (GET ?board=1, v14, cached 5 minutes there, 1 minute here).
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
// The Elo shows only from ELO_MIN answers (Pierre, 2026-11-01: "even 50 is not enough to settle the score"); before, the
// badge says how many answers are left. Same threshold as the sheet's leaderboard (Code.gs ELO_MIN).
const ELO_MIN = 200;
const eloLine = G => {
  const n = G ? (G.ok || 0) + (G.ko || 0) : 0;
  return n >= ELO_MIN && typeof G.th === 'number' ? `Elo ${eloScore(G.th)}` : '';
};
// The sync script answers in 1-3 s (a Google Apps Script starting up), whatever its own cache: so the last board is kept
// on this device (BOARD_C, not a reefid-sync key: it never travels with the progress) and shown at once, then replaced
// when the fresh one arrives (Pierre, 2026-11-01: "the leaderboard takes long to load"). It is also fetched a few seconds
// after start-up, so the first visit to the page is usually instant too.
const BOARD_C = 'reefid-board-cache';
let boardAt = 0,
  boardP = null;
const ago = t => {
  const m = Math.round((Date.now() - (t || 0)) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
};
const boardCached = () => {
  const c = store.get(BOARD_C, null);
  return c && Array.isArray(c.rows) ? c : null;
};
const loadBoard = () => {
  if (!boardP || Date.now() - boardAt > 60000) {
    boardAt = Date.now();
    boardP = fetch(SYNC_URL + '?board=1')
      .then(r => r.json())
      .then(j => (j && j.ok && Array.isArray(j.rows) ? j : {err: j && j.v < 14 ? 'old' : 'na'}))
      .catch(() => ({err: 'offline'}))
      .then(j => {
        if (!j.err) store.set(BOARD_C, {rows: j.rows, t: Date.now()});
        else boardAt = 0; // a failure is not kept for a minute: the next visit tries again
        return j;
      });
  }
  return boardP;
};
const boardMe = rows => (SYNC && SYNC.name ? rows.findIndex(r => String(r[0]).toLowerCase() === SYNC.name.trim().toLowerCase()) : -1);
function viewBoard() {
  // The title sits inside .board: pageHelp drops top-level titles where the header names the page, and here it doesn't.
  $v.innerHTML = `<p class="lede">Everyone who signed in, ranked by progress, then by Elo: your level from all your answers, which keeps rising as you name harder photos right, so it still counts at 100%. The Elo shows from ${ELO_MIN} answers: before that it moves too much to mean anything. To leave the leaderboard, ⚙ Settings, Leaderboard: Off.</p>
  <div class="board">${boardTabs('board')}<div id="board"><p class="note">Loading…</p></div></div>`;
  const C = boardCached();
  if (C) paintBoard({...C, old: true});
  loadBoard().then(B => {
    const box = document.getElementById('board');
    if (!box || hashNow() !== 'board') return;
    if (!B || B.err) {
      // Offline or failing: the last board stays, marked as such.
      if (C) return paintBoard({...C, old: true, off: true});
      box.innerHTML = `<p class="note">${B && B.err === 'offline' ? 'The leaderboard needs a connection.' : 'The leaderboard is not available yet.'}</p>`;
      return;
    }
    paintBoard(B);
  });
}
function paintBoard(B) {
  const box = document.getElementById('board');
  if (!box || hashNow() !== 'board') return;
  const me = boardMe(B.rows),
    // The player's own row: this device's level (eloLine), as My progress shows it; the sheet's copy only when this
    // device has none to show (Q134), or when the subject on screen is not the board's (SUBJ.board: P is another
    // subject's progress). Other rows: the level the sheet read from their saved progress.
    mine = me >= 0 && SUBJ.board ? eloLine(P[LEVEL]) : '',
    eloOf = (r, i) => (i === me && mine ? mine : r[2] == null ? '' : `Elo ${eloScore(r[2])}`);
  // Signed out: "Sign in" opens the sign-in card, as the header's button does (rule U9: sign-in is no longer in ⚙).
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
    (B.rows.length
      ? `<ol class="blist">${B.rows
          .map(
            (r, i) =>
              `<li${i === me ? ' class="me" aria-current="true"' : ''}><span class="brank">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><b class="bname">${esc(r[0])}</b><span class="belo" title="${eloOf(r, i) ? 'Elo: level from all answers' : `Elo shows from ${ELO_MIN} answers`}">${eloOf(r, i)}</span><span class="bpct">${r[1] == null ? '–' : r[1] + '%'}</span></li>`
          )
          .join('')}</ol>`
      : '<p class="note">Nobody yet: be the first.</p>');
  const bs = box.querySelector('#bsign');
  if (bs) bs.onclick = e => document.getElementById('signb').onclick(e);
  const m = box.querySelector('.me');
  if (m && m.scrollIntoView && m.getBoundingClientRect().bottom > innerHeight) m.scrollIntoView({block: 'center'});
}
// Achievements (core.js ACH, Pierre 2026-11-01): checked after every answer on a snapshot of the progress (achSnap);
// each new one pops up (achPop, one after the other). Kept in reefid-sync-ach ({id: time}, plus _run / _best for the run
// of right answers and _cor / _hard for one-off feats), a reefid-sync key, so it travels with the progress. The first
// check on a device with progress but no record yet (the feature arriving) grants what is already met in one recap.
const ACHK = 'reefid-sync-ach';
// Two records of one player (another device, or this device before signing in): every achievement kept with its
// earliest date, the best run kept; the current run stays this device's; an achievement taken back (A._gone, achRecheck)
// never comes back from a copy earned before (core.js mergeAch).
// Version of the record (ACH_V): a record from before the full recount (2026-11-01, mastery exam) brings its feats
// (best run, corallites, hard photo) but not its achievements, which were counted on the old rules.
const ACH_V = 2;
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
// usual. Only then: everywhere else achievements are only added. The removals are kept and synced even when this record
// held none of them (achMigrate dropped them at start-up, or they were earned on another device): without them the next
// merge would bring back the sheet's copy (Codex review #399). The ids taken back go to the card (mxLostNotice) and
// leave the "new" dots; one sync, so the sheet's copy (achievement shares) follows.
function achRecheck() {
  const M = store.get(MXL.KEY, null);
  if (!M || !M.ach) return [];
  const A = store.get(ACHK, null),
    was = JSON.stringify(A),
    out = A ? achRevoke(A, achSnap(A), Date.now()) : [];
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
function achSnap(A = store.get(ACHK, {}) || {}) {
  const L = achList(),
    st = L.map(lvStep),
    G = P[LEVEL];
  const groups = {};
  L.forEach(n => (groups[shownGroup(n) || 0] = groups[shownGroup(n) || 0] || []).push(n));
  return {
    total: L.length,
    met: st.filter(x => x >= 1).length,
    q: [2, 3, 4].map(k => st.filter(x => x >= k).length),
    learned: st.filter(x => x >= 5).length,
    pct: progPct(L),
    streak: A._best || 0,
    duel: L.some(n => (P[n] || {}).du),
    cor: !!A._cor,
    hard: !!A._hard,
    // The Elo moves a lot over the first answers (it starts fast on purpose): its achievements wait for ELO_MIN answers.
    elo: G && typeof G.th === 'number' && (G.ok || 0) + (G.ko || 0) >= ELO_MIN ? eloScore(G.th) : 0,
    group: Object.entries(groups).some(([k, g]) => k !== '0' && g.length > 1 && g.every(n => lvStep(n) >= 5)),
    bonus: bonusList().filter(introduced).length,
    basics: !!A._basics,
    fb: Array.isArray(A._fb) ? A._fb.length : 0
  };
}
// Full recount, once per device (Pierre, 2026-11-01: "redo the calculation cleanly for everyone, achievements too,
// locking again those unlocked when they should not have been"): every achievement is tested again on the current
// progress with the current rules; those still met keep their date, the others go. Feats (runs, corallites, hard photo)
// stay. Then one sync, so the sheet's copy (leaderboard %, achievement shares) follows.
// Achievements count one subject (core.js SUBJECTS ach: corals): checked on its progress whatever the subject on screen.
const ACHS = () => SUBJECTS.find(x => x.ach).id;
function achMigrate() {
  if (!SUBJ.ach) return inSubject(ACHS(), achMigrate);
  const A = store.get(ACHK, null);
  if (A && A._v === ACH_V) return;
  const B = {_v: ACH_V};
  if (A) Object.keys(A).forEach(k => k[0] === '_' && k !== '_v' && A[k] && (B[k] = A[k])); // the feats (_run, _best, _cor, _hard, _gone, _basics, _fb)
  const snap = achSnap(B),
    t = Date.now();
  ACH.filter(a => a.test(snap)).forEach(a => (B[a.id] = (A && A[a.id]) || t));
  store.set(ACHK, B);
  if (SYNC && A) syncSoon();
}
function achCheck(silent) {
  if (!SUBJ.ach) return inSubject(ACHS(), () => achCheck(silent));
  const had = store.get(ACHK, null),
    A = had || {},
    ids = newAch(achSnap(A), A);
  if (!ids.length) {
    if (!had) store.set(ACHK, A);
    return achDot();
  }
  // Only the first achievement of each family and the top tier pop up (Pierre, 2026-11-02, after a walkthrough counted
  // 7-9 toasts in 60 answers): a new kind stays a surprise, an intermediate step lands quietly on the achievements page
  // with a "new" dot on 🏅 / 🏆. Several at once make one toast. Every Contributions tier pops up (Pierre, 2026-11-05, Q65).
  const fams = new Set(ACH.filter(a => A[a.id]).map(achFam)),
    t = Date.now(),
    loud = [],
    quiet = [];
  ids.forEach(id => {
    const a = ACH.find(x => x.id === id);
    (a.tier === 3 || a.kind === 'contrib' || !fams.has(achFam(a)) ? loud : quiet).push(id);
    fams.add(achFam(a));
    A[id] = t;
  });
  store.set(ACHK, A);
  if (quiet.length && had && !silent) store.set(ACHNEW, [...achUnseen(), ...quiet]);
  achDot();
  // The Contributions' 5th and 10th (tier 2 and 3) come as a card, which stays until closed (Pierre, 2026-11-05: a toast
  // at the top may go unread); the first stays a toast, like the learning achievements.
  const card = id => !silent && had && (ACH.find(x => x.id === id) || {}).kind === 'contrib' && ACH.find(x => x.id === id).tier >= 2;
  (silent || !had ? ids : loud).filter(card).forEach(id => achCard(ACH.find(x => x.id === id)));
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
// The learning achievements (core.js ACH kind 'learn'): the count on the badge and on #ach; the Contributions (kind
// 'contrib', Pierre 2026-11-05, Q65) are a family apart, never in that count, listed in their own section.
const ACH_L = () => ACH.filter(a => a.kind !== 'contrib'),
  ACH_C = () => ACH.filter(a => a.kind === 'contrib');
// Families: the icons of one kind of milestone (genus progress, learned, Elo).
const ACH_FAM = {'🌿': '🌱', '🪸': '🌱', '👑': '🎓', '🌟': '⭐'},
  achFam = a => ACH_FAM[a.icon] || a.icon;
// Achievements earned quietly and not seen yet: a dot on 🏆 in the header, on the Achievements tab and on 🏅 in the
// player's card. Kept on this
// device only (its own key, outside the synced record: a sign-in or another device's sync never brings or drops them;
// Codex review #360); sign-out clears it with the progress.
const ACHNEW = 'reefid-ach-new',
  achUnseen = () => store.get(ACHNEW, []) || [],
  achNew = () => achUnseen().length;
function achDot() {
  const bg = document.getElementById('boardgo'),
    tab = document.querySelector(`.btabs a[href="${hr('ach')}"]`); // the Achievements tab of the leaderboard page (boardTabs)
  if (bg) bg.classList.toggle('hasnew', achNew() > 0);
  if (tab) tab.classList.toggle('hasnew', achNew() > 0);
}
// After each answer (quiz.js answer; cur, the game it was given in): the run of right answers and the one-off feats,
// then the check.
// The run (On a roll, Unstoppable: _run, _best) and Sharp eye (_hard) are earned only in the normal photo quiz (Pierre,
// 2026-11-05, Q82: "only in the normal Quiz"; in the custom quiz the player picks the genera and the choices come from
// them, and the Duel tab asks between 2 genera, so runs and "a photo most players miss" come easier; the Met achievements
// stay as they are, real discoveries). An answer in the custom quiz or the Duel tab neither extends nor breaks the run,
// so switching tabs never costs a run earned in the Quiz. The photo quiz counts with all its formats (Again, typed
// questions, the duels slipped into it, the comeback, the exam); the other feats (corallites, duels) count everywhere,
// as before. Nothing already earned is taken back.
const achRunIn = cur => cur === 'quiz';
function achAfter(good, ph, cur) {
  if (!SUBJ.ach) return; // an answer on another subject earns nothing (fish: no achievements yet)
  if (!store.get(ACHK, null)) achCheck(true); // no record yet on this device: what is already met comes as one recap
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
// Coral basics done (proto/basics.js seenStep): a one-off feat of the record, synced with it, so the Home line and the
// first-launch offers know on every device (app.js basicsDone).
function achBasics() {
  if (!store.get(ACHK, null)) achCheck(true);
  const A = store.get(ACHK, {}) || {};
  if (A._basics) return;
  A._basics = 1;
  store.set(ACHK, A);
  achCheck();
  if (SYNC) syncSoon();
}
// A report sent (sync.js reportDialog): counted for the Contributions (core.js contribAdd: one per photo, Other only
// with a note), whatever the subject on screen, signed in or not; the tier it reaches pops up at once (achCheck), and the
// record goes to the sheet with the next sync like the other feats.
// Its id is kept too, counted or not (core.js repsAdd), for "Your feedback helped" (achHelped).
function achReport(r) {
  // An account the admin deleted (the sheet answered 'gone': sync.js) counts nothing (Pierre, 2026-11-05).
  if (SYNC && SYNC.err === 'gone') return;
  if (!store.get(ACHK, null)) achCheck(true);
  const A = store.get(ACHK, {}) || {};
  repsAdd(A, [r.id]);
  const counted = contribAdd(A, r);
  store.set(ACHK, A);
  if (counted) achCheck();
  if (SYNC) syncSoon();
}
// "Your feedback helped" (Pierre, 2026-11-05, Q66): a report the admin marked done (To do › Reports ✓ Done, published in
// curation.json seen 'rep:<id>') is told to the player who sent it, at their next visit: checked at start-up (signed in:
// once the sheet's load reply is merged, sync.js repsSeen) and when a new curation.json arrives (app.js route). A warm
// card that stays until closed (Pierre: a toast at the top may go unread), at a calm moment: never over a question
// (a game on screen: at the break at Next, helpedArm from quiz.js answer), another card, the tour, a toast or the report
// dialog; it waits for them to go. At the first report handled, then every report handled since the last thanks in one,
// at most once per 7 days (core.js helpedDue, helpedMark: Pierre, never again and again). Marked thanked when the player
// closes it (left unseen by leaving the page, it comes back). Only that it was handled: nothing the admin wrote.
// Whatever the subject on screen, signed in or not (an anonymous device's reports by the ids it kept itself); never for
// an account the admin deleted (the sheet answered 'gone', sync.js).
// Handled means Pierre's Done or a PR's (reports-handled.json, the integrator's: core.js handledSeen), read only by a device
// that sent reports, again at most every 30 minutes (HANDLED).
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
// Never over an enlarged photo either (#lightbox, Codex review #581): its close (hidden set again) wakes the wait below.
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
      const A = store.get(ACHK, {}) || {};
      helpedMark(A, ids, Date.now());
      store.set(ACHK, A);
      if (SYNC) syncSoon();
      if (brk) route(); // at the break: on to the next question
    }
  });
  return true;
}
// The ids of the player's own reports, from the sheet's load reply (sync.js repsSeen, Code.gs v57): those sent signed in
// on any device, before this version too. Then the check above.
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
// One overlay at a time (new-player walkthrough 2026-11-02: a toast sat on a "New genus" card, and tapping it left the
// question): while a card (.unlock, the sign-in card included) or the tour is open, the toast waits and shows once they
// have closed; a card that opens over a toast sends it back to the front of the queue, to show whole afterwards.
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
  if (ids.length === 1) return achPop(ACH.find(a => a.id === ids[0]));
  achPop({
    tier: 2,
    icon: '🏅',
    title: `${ids.length} achievements`,
    desc: ids
      .map(id => (ACH.find(a => a.id === id) || {}).icon)
      .slice(0, 8)
      .join(' ')
  });
}
// #leaderboard/achievements: every achievement, earned ones first with their date, the others greyed with what earns them.
// The 🏆 page has two tabs, as on Steam (Pierre, 2026-11-01): Leaderboard (#leaderboard) and Achievements (#leaderboard/achievements).
const boardTabs = cur =>
  `<nav class="btabs" aria-label="Leaderboard and achievements">${[
    ['board', '🏆 Leaderboard'],
    ['ach', `🏅 Achievements`]
  ]
    // Achievements not seen yet: the dot on 🏆 leads to the Leaderboard tab, so the Achievements tab carries it too
    // (Pierre, 2026-11-02: on the leaderboard, nothing said where the new ones were).
    .map(
      ([h, t]) =>
        `<a href="${esc(hr(h))}"${h === cur ? ' aria-current="page"' : ''}${h === 'ach' && cur !== 'ach' && achNew() ? ' class="hasnew"' : ''}>${t}</a>`
    )
    .join('')}</nav>`;
// How many signed-in players hold each achievement (sheet v15, GET ?achs=1: {n, counts}), 5 minutes in memory.
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
    fresh = new Set(achUnseen());
  // Seen now: the quiet ones lose their dot, and keep a "New" tag on this visit.
  if (fresh.size) {
    store.set(ACHNEW, []);
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
    $v.innerHTML = `<p class="lede">Achievements mark milestones of your learning: genera met, genera at each level (Open Water, Advanced, Divemaster, Instructor), your overall progress, runs of right answers, look-alike duels, corallites, hard photos and your Elo (from ${ELO_MIN} answers). Runs and hard photos are earned in the Quiz only (not in the Custom quiz or the Look-alike duels). Never time spent. Contributions, apart, thank you for the reports and feedback you send (⚑ Report a problem, Send feedback): one per photo, and an "Other" report with a note; they never count in your progress. The share of players counts everyone who signed in.</p>
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
  // Players signed in before the leaderboard: one sync writes their progress % (the sheet has none for them yet). Only
  // once the sheet serves the leaderboard (v14): an older script ignores the %, which left everyone at 0% (2026-11-01).
  if (SYNC && !store.get('reefid-board-sent14', 0))
    loadBoard().then(B => {
      if (B && !B.err && SYNC && !store.get('reefid-board-sent14', 0)) {
        store.set('reefid-board-sent14', 1);
        syncSoon();
      }
    });
  // Said on a subject that has the leaderboard (SUBJECTS board) only: on another (Fish), it waits for a later load
  // (fish beta QA, 2026-11-06: it covered the bottom of fish Home right after Fish was chosen). A switch of subject
  // while it shows takes it away and it is due again (app.js setSubject, toastsOff).
  if (!SYNC || store.get('reefid-board-told', 0) || !SUBJ.board) return;
  store.set('reefid-board-told', 1);
  const t = appToast(
    '🏆 New: a <a href="' + esc(hr('board')) + '">leaderboard</a>. Your name shows there; to leave it, ⚙ Settings, Leaderboard: Off.',
    15000
  );
  t.dataset.again = 'reefid-board-told';
  t.querySelector('a').onclick = () => t.remove();
}
// Progress recalculated for everyone (Pierre, 2026-11-02: when we recalculate every player's progress, say so with a
// real pop-up, not a discreet note; no algorithm details). Once per device, to a player who already has answers (a new
// player has nothing recalculated), at the first moment no tour or card is open; marked seen only by its button or
// Escape, so a card closed by leaving the page comes back on the next one. A later recalculation adds a note at the end
// of RECALC.L (a new id, a title and a text), and so does a new game mode worth announcing (typed questions,
// 2026-11-03, with its own kicker and button): a player shown every note but the last sees the last; one who missed
// several sees them all on one card, latest first. KEY holds the id of the last note seen. Exception: the photo memory
// recalculation (2026-11-03, core.js memRecalc) is silent, Pierre's choice (the bars only move down 1-3 points).
// Each note has a kind (app.js CARD_KINDS: 'update' for a recalculation, 'feature' for a new game mode): the latest due
// gives the card its medallion, for a recalculation the player's progress ring as it is now.
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
    // A new game mode announced the same way (Pierre, 2026-11-03: a card for typed questions, a little tongue-in-cheek;
    // text validated by Pierre). k, b: the card's kicker and button when this note is the latest due.
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
function recalcNotice() {
  if (SUBJ !== SUBJECTS[0]) return inSubject(SUBJECTS[0].id, recalcNotice); // the recalculations announced were the corals'
  // Whether this load has decided ("none" or "shown"; tests wait for it rather than for a fixed time).
  const said = d => (window.RECALC_SAID = d);
  const L = RECALC.L,
    last = L[L.length - 1].id,
    seen = store.get(RECALC.KEY, ''),
    due = L.slice(L.findIndex(x => x.id === seen) + 1).reverse();
  if (!due.length) return void said('none');
  // Answers: the global count, or the genera's own for progress saved before it (Codex review #367).
  const played = answersSoFar() > 0 || Object.values(P).some(s => s && typeof s === 'object' && ((s.ok || 0) + (s.ko || 0) > 0 || s.h));
  if (!played) return void (store.set(RECALC.KEY, last), said('none'));
  // Something else on screen (the tour, a card): try again a little later, until the screen is clear.
  if (document.querySelector('.recalc')) return void said('shown'); // already on screen
  if (document.querySelector('#tour, .unlock')) return void setTimeout(recalcNotice, 2000);
  said('shown');
  const k = due[0].kind || 'update';
  cardShow({
    kind: k,
    cls: 'recalc',
    visual: k === 'update' ? cardRing(progPct()) : '',
    kick: due[0].k || 'Update',
    title: due[0].t,
    body: due.map((x, i) => `${i ? `<h3>${x.t}</h3>` : ''}<p>${x.p}</p>`).join(''),
    primary: {text: due[0].b || 'Got it', on: () => store.set(RECALC.KEY, last)},
    esc: 1,
    enter: 1,
    // Leaving the page (route) closes it unseen; it comes back once the new page is drawn (Codex review #367: a returning
    // player opening straight at #practice/quiz had it closed by the first route, before ever seeing it).
    onClose: how => how === 'route' && setTimeout(recalcNotice, 300)
  });
}
// A learned mark taken away by a recalculation (model.js mxRecalc, MXL; Pierre, 2026-11-03: players know they test an
// early beta): told once on this device by an announcement card, like recalcNotice (rule D6: never held, no
// visit floor or prompt spacing): at start-up once the progress is in (app.js SETUP 2) and right after a pull or an
// answer that drops a mark (mxLost), on whatever page is open. Another card or the tour on screen: it waits for it
// (tried again every 2 s). Names the genera, and the achievements taken back with them (achRecheck). Seen only by OK (or
// Enter / Escape): those marks go to told and are never told again here; leaving the page closes it unseen and it comes
// back once the new page is drawn.
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
function mxLostNotice() {
  clearTimeout(mxLostT);
  const M = store.get(MXL.KEY, {}) || {},
    due = M.due || {},
    L = Object.keys(due).sort();
  if (!L.length || document.querySelector('.mxlost')) return;
  if (document.querySelector('#tour, .unlock')) return void (mxLostT = setTimeout(mxLostNotice, 2000));
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
        mxLostNotice();
      }
    },
    esc: 1,
    enter: 1,
    onClose: how => how === 'route' && (mxLostT = setTimeout(mxLostNotice, 300))
  });
}
// The announcement card of a rules version (core.js RVS msg; Pierre, 2026-11-03: announcement cards show as soon as the
// player opens or reconnects to the app, on whatever page they land on, one after another if several, never held by
// the visit floor or the prompt spacing; rule D6). When this device adopts the sheet's full
// replay of a newer version (sync.js replayAdopt), every version it skipped that has a msg is due, once per version
// on this device (RVN.KEY, device only: due, the versions still to show; told, those shown; pct, the progress % before
// and after the adoption, per version, for a msg with only: 'changed', due only when the two differ by msg.min points or
// more, either way: core.js RV_CARD, 5). One card per version,
// oldest first, the next as soon as one is closed; like recalcNotice and mxLostNotice it only waits for another card
// or the tour on screen (tried again every 2 s), and a page change closes it unseen to show it again on the new page.
// At start-up (app.js SETUP 2, after the two cards above) and right after an adoption.
const RVN = {KEY: 'reefid-rv-msg'};
function rvNoticeAdd(from, to, pct) {
  const M = store.get(RVN.KEY, {}) || {},
    told = M.told || [],
    due = (M.due || []).filter(v => !told.includes(v)),
    pc = M.pct || {};
  rvMsgs(from, to).forEach(x => {
    if (told.includes(x.v) || due.includes(x.v)) return;
    if (x.msg.only === 'changed' && !(pct && pct[0] !== pct[1] && Math.abs(pct[1] - pct[0]) >= (x.msg.min || 0))) return;
    if (pct) pc[x.v] = pct;
    due.push(x.v);
  });
  store.set(RVN.KEY, {due: due.sort((a, b) => a - b), told, pct: pc});
  if (window.APP_READY) rvNotice();
}
let rvT = 0;
function rvNotice() {
  clearTimeout(rvT);
  const M = store.get(RVN.KEY, {}) || {},
    x = RVS.find(r => (M.due || []).includes(r.v) && r.msg && !(M.told || []).includes(r.v));
  if (!x || document.querySelector('.rvmsg')) return;
  if (document.querySelector('#tour, .unlock')) return void (rvT = setTimeout(rvNotice, 2000));
  // The progress ring in the medallion: the % after the recalculation, the one before faint behind it (app.js cardRing).
  const [pf, pt] = (M.pct || {})[x.v] || [];
  cardShow({
    kind: x.msg.kind || 'update',
    cls: 'rvmsg',
    kick: 'Update',
    title: x.msg.t,
    visual: pt != null ? cardRing(pt, pf) : '',
    body: `<p>${x.msg.p.replace('{from}', pf).replace('{to}', pt)}</p>`,
    primary: {
      text: 'Got it',
      on: () => {
        const N = store.get(RVN.KEY, {}) || {};
        store.set(RVN.KEY, {...N, due: (N.due || []).filter(v => v !== x.v), told: [...new Set([...(N.told || []), x.v])]});
        rvNotice(); // the next version's card, if any
      }
    },
    esc: 1,
    enter: 1,
    onClose: how => how === 'route' && (rvT = setTimeout(rvNotice, 300))
  });
}
// An apology, once (Pierre, 2026-11-04; core.js SORRY, sorryOf, sorryFelt, sorryText): to a player who really felt the
// opening of #408 run unchecked (too many new genera at once, no easier questions after misses), at app open, in plain
// words, greeted by the first word of their sign-in name (else "Hi!"). Whether they felt it is read once, the first time
// this version runs on the device (FIRST: the time, and what core.js sorryOf reads then: the answers in the window, the
// opening hold's sum, the cards opened in it), so playing on changes nothing. A card like recalcNotice's (app.js
// cardShow, kind apology: 🙏 on the warm --warn tint): one card at a time (it waits while the tour or another card is
// up), never held, its button, Enter or Escape close it for good on this device (reefid-sorry, like reefid-recalc, kept on the
// device); leaving the page closes it unseen and it comes back.
const SORRYK = {KEY: 'reefid-sorry', FIRST: 'reefid-sorry-first'};
function sorryNotice() {
  if (!SUBJ.replay) return; // the apology is about the corals' opening: it waits until the player is on them
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
  if (!sorryDue({felt: F, now, shown: store.get(SORRYK.KEY, 0)})) return;
  if (document.querySelector('.sorry')) return; // already on screen
  if (document.querySelector('#tour, .unlock')) return void setTimeout(sorryNotice, 2000);
  const x = sorryText(SYNC && SYNC.name, now, new Date(now).getTimezoneOffset());
  cardShow({
    kind: 'apology',
    cls: 'sorry',
    kick: 'Sorry',
    title: esc(x.t),
    body: `<p>${esc(x.p)}</p>`,
    primary: {text: 'Thanks', on: () => store.set(SORRYK.KEY, Date.now())},
    esc: 1,
    enter: 1,
    onClose: how => how === 'route' && setTimeout(sorryNotice, 300)
  });
}
// The cards that tell a player about a subject (app.js UNITS hello), one per way the subject opens (core.js SUBJECTS open,
// subjGroup): hello.group while it opens to a group, hello.all once it opens to everyone (fish since Q158: the same
// invitation to every player, while the subject keeps its beta label). Pierre, 2026-11-05: "a proper card the player
// closes, shown once, at a calm moment", not a toast, which may go unread; 2026-11-06: while fish stays open to a group
// he picks, the card is an invitation to test the fish beta, for the players of that group only.
// Each card is seen once per device, under its own key (subjDev: reefid-fish-hello-group), so a later card is not hidden
// by an earlier one. hello.group goes only to a player in the subject's group (subjGroups: never the admin's own access,
// IS_ADMIN, nor anyone while the subject is open to all); hello.all to anyone the subject is open to (subjOpen). Never in
// the admin's browser (as the tour), and only to a player settled in the subject on screen (the corals): at least
// HELLO.MIN answers (a new player meets the switch with the tour and the first questions). A player who has played the
// subject already (it is on screen, its welcome question is answered, or it has progress) is never told: marked seen at
// once. The calm moment: Home, HELLO.WAIT after it is drawn and still on it, nothing else on screen (the tour, a card, a
// toast, the help, ⚙, an enlarged photo) and the prompt spacing met (quiz.js promptOk, which it then pushes back as the
// other prompts do). Not calm: tried again at the next Home. Seen by either button or Escape; leaving the page closes it
// unseen and it comes back at the next calm Home. "Try fish" switches to the subject and opens its quiz (its welcome
// question first, quiz.js startGate).
const HELLO = {KEY: 'hello-', MIN: 10, WAIT: 1500};
// The way S opens ('group' or 'all'): the name of its card in UNITS hello and of the card's seen mark.
const helloMode = S => (subjGroup(S) ? 'group' : 'all');
// 'show', 'met' (mark it seen, say nothing), or '' (not now). Pure on its inputs: tests call it.
const helloDue = ({card, member, admin, seen, met, answers}) =>
  !card || !member || admin || seen ? '' : met ? 'met' : answers >= HELLO.MIN ? 'show' : '';
let helloT = 0;
function subjHello() {
  clearTimeout(helloT);
  const home = () => (hashNow() || 'home') === 'home';
  if (!home()) return;
  // The 'all' card is the beta invitation: only while the subject keeps its beta label (SUBJECTS beta).
  const card = S => (helloMode(S) === 'all' && !S.beta ? null : (UNITS[S.id].hello || {})[helloMode(S)]),
    member = S => (helloMode(S) === 'group' ? subjGroups().includes(S.id) : subjOpen(S));
  const S = SUBJECTS.find(x => card(x) && member(x)); // a subject with a card for the player, never by its place
  if (!S) return;
  const H = card(S),
    key = subjDev(S.id, HELLO.KEY + helloMode(S)),
    P2 = store.get(subjKey(S.id, 'progress'), null),
    due = helloDue({
      card: H,
      member: member(S),
      admin: HAS_ADMIN_TOKEN,
      seen: !!store.get(key, null),
      met: SUBJ === S || !!store.get(startKey(S.id), null) || !!(P2 && typeof P2 === 'object' && Object.keys(P2).length),
      answers: answersSoFar() // the subject on screen's, another subject than S (met otherwise)
    });
  if (due === 'met') return void store.set(key, 'met');
  if (due !== 'show') return;
  helloT = setTimeout(() => {
    const busy = !lb.hidden || !$helpbox.hidden || !$set.hidden || document.querySelector('.apptoast, .hello');
    if (!home() || busy || store.get(key, null) || !member(S) || !promptOk()) return;
    promptMark();
    const seen = () => store.set(key, Date.now());
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
// The notes on screen go when the subject changes (they speak of the subject that was on screen); one marked
// data-again (its "told" key) is due again later.
function toastsOff() {
  document.querySelectorAll('.apptoast').forEach(t => {
    if (t.dataset.again) store.set(t.dataset.again, 0);
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
      boardP = null;
      syncSoon();
    })
);
showBoardSet();
// The progress backup (⚙ Export / Import) is bound once the page is in.
bindProgFile();
