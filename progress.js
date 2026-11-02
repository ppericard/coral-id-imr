// IMR Coral ID: My progress, the progress pill, the leaderboard and achievements, split out of app.js (2026-11-02, code
// review L1: one file per part, one piece at a time). A classic script like app.js and sync.js: it shares their
// top-level names and is loaded right after sync.js (index.html, in order); app.js waits for every script
// (window.BOOT) before its first page. Required like app.js: the loader tries it 3 times, the service worker keeps it.
// Progress board, one screen: a wall of the 39 cover photos in slate order (name band in the level colour, grey photo =
// not seen, red border = review) beside a side column with the overall ring, what to review first and the mix-ups. Signing in
// and backup/reset live in the header and ⚙ (Pierre, 2026-11-01: the board comes first, nothing unrelated around it).
// The player's badge on My progress (Pierre, 2026-11-01: "a badge, as in video games, that shows the player's
// achievements"): name, place and Elo on the leaderboard (filled once it loads; the Elo from this device until then),
// achievements earned with the last three. Each half links to its page.
function badge() {
  const A = store.get(ACHK, {}) || {},
    got = ACH.filter(a => A[a.id]).sort((x, y) => A[y.id] - A[x.id]),
    name = SYNC && SYNC.name ? SYNC.name : '',
    G = P[LEVEL];
  return `<div class="pbadge"><span class="pbav" aria-hidden="true">${name ? esc(name.trim()[0].toUpperCase()) : '🪸'}</span>
    <div class="pbtxt"><b>${name ? esc(name) : 'Not signed in'}</b>
    <a id="pbrank" href="#board">🏆 ${name ? '' : 'Leaderboard · '}${eloLine(G)}</a>
    <a href="#ach">🏅 <b>${got.length}</b>/${ACH.length} ${got
      .filter((a, i) => got.findIndex(b => b.icon === a.icon) === i) // the latest of each kind: three different icons
      .slice(0, 3)
      .map(a => `<span title="${esc(a.title)}">${a.icon}</span>`)
      .join('')}</a></div></div>`;
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
  const list = Object.keys(DATA.gen)
    .filter(n => Q.stars || DATA.gen[n].n)
    .sort((a, b) => slateIdx(a) - slateIdx(b));
  // Bonus genera (off the slate) get tiles after the slate genera: unlocked ones like any genus, locked ones as "?"
  // tiles showing the slate progress that unlocks them (Pierre, 2026-11-01). They stay out of the ring and the counts.
  const BO = bonusOpen(),
    locked = BONUS.slice(BO.length).map((n, i) => BONUS_AT(BO.length + i));
  const lv = Object.fromEntries([...list, ...BO].map(n => [n, shownLevel(n)]));
  const count = k => list.filter(n => lv[n][0] === k).length;
  const weak = list.filter(n => lv[n][0] === 'weak').sort((a, b) => weight(b) - weight(a));
  // Learning level on a 6-step scale (one colour ramp, light to dark): 0 = not seen, 1-4 = quarters of the genus's
  // progress (genScore), 5 = learned. "Review" is a separate marker, so it never hides the level.
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
  const STEPS = [
    [0, 'Not seen'],
    [1, '< 25%'],
    [2, '25-50%'],
    [3, '50-75%'],
    [4, '75%+'],
    [5, 'Learned']
  ];
  // Photo wall: the cover in full colour (grey = not seen) with a name band coloured by the genus's step on the scale,
  // holding the mini ring + % like the Slate and Groups tiles; review = red border and "!".
  const tile = n => {
    const g = GX(n),
      p = cover(g),
      [cl] = lv[n];
    return `<a class="pw ${cl} s${st[n]}${g.x ? ' bonus' : ''}" href="#g-${esc(n)}" title="${g.x ? 'Bonus genus, not on the IMR list. ' : ''}${tip(n)}">${p ? `<img ${thumb(p, '(max-width:599.98px) 100px, 165px')} alt="" loading="lazy">` : ''}${g.x ? '<b class="pbtag">Bonus</b>' : ''}<span class="pwb"><i>${esc(shyName(n))}${g.n || g.x ? '' : ' ★'}</i>${pct(n)}</span></a>`;
  };
  // Locked bonus genera: ONE tile that says what they are and when the next one comes (six "?" tiles read as a puzzle;
  // designer re-review 2026-11-01, N6).
  const lockT = cls =>
    locked.length
      ? `<span class="${cls} plock" title="Bonus genera off the IMR list, common at Dauin: the next one unlocks at ${locked[0]}% progress"><b aria-hidden="true">+${locked.length}</b><small>bonus genera · next at ${locked[0]}%</small></span>`
      : '';
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
    return `${esc(n)}: ${lv[n][1]}${st[n] > 0 && st[n] < 5 ? ` (${Math.round(100 * genScore(n))}% of the way)` : ''}${s.ok + s.ko ? ` (${s.ok}/${s.ok + s.ko} right). Photos: ${photoBand(n)}, ${seenOf(n)}` : ''}${m.length ? '. Still needed: ' + esc(m.join('; ')) : ''}`;
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
    photos: () =>
      `<div class="pgrid pwall"${isPhone() ? ' data-minw="72"' : ''}>${[...list, ...BO].map(tile).join('')}${lockT('pw')}</div>`,
    // Laid out like the physical IMR slate: 1-20 down the left column, 21-34 down the right, starred genera under them.
    slate: () => {
      const num = list.filter(n => DATA.gen[n].n),
        L = num.filter(n => DATA.gen[n].n <= 20),
        R = num.filter(n => DATA.gen[n].n > 20),
        S = list.filter(n => !DATA.gen[n].n);
      const ps = n =>
        `<a class="ps ${lv[n][0]} s${st[n]}" href="#g-${esc(n)}" title="${tip(n)}"${fill(n)}><b>${DATA.gen[n].n ? DATA.gen[n].n + '.' : '★'}</b><i>${esc(n)}</i>${pct(n)}</a>`;
      // Bonus genera: one strip across both columns under the slate, so the board still fits one screen.
      const rows = Math.max(L.length, R.length + (S.length ? S.length + 1 : 0));
      const bx =
        BO.map(
          n =>
            `<a class="ps ${lv[n][0]} s${st[n]} bonus" href="#g-${esc(n)}" title="Bonus genus, not on the IMR list. ${tip(n)}"><b>+</b><i>${esc(n)}</i>${pct(n)}</a>`
        ).join('') + lockT('ps');
      return `<div class="pslate" style="--rows:${rows}">${L.map(ps).join('')}${R.map(ps).join('')}${S.length ? '<span class="psgap"></span>' : ''}${S.map(ps).join('')}<div class="psbonus" style="grid-row:${rows + 1}" title="Bonus genera, not on the IMR list">${bx}</div></div>`;
    },
    groups: () => `<div class="pgroups">${groups
      .map(k => {
        const gr = DATA.imrg.find(x => x.n === k),
          L = list.filter(n => gi(n) === k);
        return `<div class="pgr" style="--g:${gr ? groupHue(gr.n) : 200}"><span class="gn" title="${gr ? esc(gr.t) : 'Not covered in the lecture'}">${gr ? gr.n : '★'}</span><span class="pgt">${gr ? esc(gr.t) : 'Not covered in the lecture'}</span>
        <span class="pseg">${L.map(n => `<a class="${lv[n][0]} s${st[n]}" href="#g-${esc(n)}" title="${tip(n)}"${fill(n)}><i>${esc(n)}</i>${pct(n)}</a>`).join('')}</span><small>${L.filter(n => lv[n][0] === 'ok').length}/${L.length}</small></div>`;
      })
      .join('')}
      <div class="pgr pgbonus"><span class="gn" title="Bonus genera, not on the IMR list">+</span><span class="pgt">Bonus: not on the IMR list</span>
        <span class="pseg">${BO.map(n => `<a class="${lv[n][0]} s${st[n]}" href="#g-${esc(n)}" title="${tip(n)}"><i>${esc(n)}</i>${pct(n)}</a>`).join('')}${lockT('pgl')}</span><small>${BO.filter(n => lv[n][0] === 'ok').length}/${BONUS.length}</small></div></div>`
  };
  let pv = store.get('imr-coral-pview', 'photos');
  if (!VIEWS[pv]) pv = 'photos';
  $v.innerHTML = `<p class="lede"><b>To learn a genus</b>, get it right on harder and harder photos: that fills it up to 95%. Then comes its <b>mastery exam</b>: ${EXAM.n} questions on it, as hard as the game gets (one photo alone, never seen before, look-alikes among the choices), slipped unannounced into the photo quiz, several questions apart. All ${EXAM.n} right and the genus is learned (100%); a single miss, or giving it as the answer for another genus, and the exam starts again later. A mistake sets a genus back, for the genus you missed and for the one you answered.</p>
  <p class="lede"><b>Bonus genera</b>: corals that are not on the IMR list but are common at Dauin and easily taken for a genus of the list (fire coral <i>Millepora</i> first). The first joins the photo quiz and the duels at ${BONUS_AT(0)}% progress, then one more every 5%. They don't count in your progress; their ID tips come from the Coral Finder. On this page they come after the list: a <b>?</b> tile is a bonus genus still locked, with the progress that unlocks it.</p>
  <p class="lede"><b>Colours</b>: white with a dashed border = not seen; then from pale to dark, one step per quarter of the way; the darkest, with a tick = learned. The mini ring on a tile shows exactly how far it has got. A red border and a red ! = to review (2 or more mistakes in its last 5 answers). <b>Photos</b>, <b>Slate</b> and <b>Groups</b> show the same progress in three layouts. Tap a genus to open its sheet: it shows what the genus still needs.</p>
  <p class="lede"><b>In detail</b>: each genus has its own photo difficulty, recomputed after every answer: it starts with the best photos, right answers bring harder ones, a mistake eases them off, and new photos keep coming in at every level. 95% means your answers make it 95% sure you know the genus (a probability updated after each answer: right answers on harder photos count more, a lucky guess on an easy photo counts little); learned means its mastery exam is passed too.</p>
  <div class="pgame pboard"><div class="pgwrap"></div>
  <aside class="gside">
    <div class="seg" role="group" aria-label="View">${[
      ['photos', 'Photos'],
      ['slate', 'Slate'],
      ['groups', 'Groups']
    ]
      .map(([k, t]) => `<button type="button" data-pv="${k}" aria-pressed="${pv === k}">${t}</button>`)
      .join('')}</div>
    <div class="pring" style="background:conic-gradient(${ring})"><span><b>${progPct(list)}%</b><small>${count('ok') ? `${count('ok')}/${list.length} learned` : `${list.length - count('new')}/${list.length} met`}</small></span></div>
    ${badge()}
    <div class="plvl" role="list" aria-label="Learning level">${STEPS.map(([k, t]) => `<span role="listitem" class="s${k}" title="${t}: ${nst(k)} genera"><b>${nst(k)}</b><small>${t}</small></span>`).join('')}<span role="listitem" class="pl-rev weak${count('weak') ? '' : ' zero'}" title="To review: ${count('weak')} genera"><b>${count('weak')}</b><small>Review</small></span></div>
    <p class="plvlnote"><span class="pbar"></span> = how close each genus is to Learned</p>
    ${
      introLeft().length
        ? `<div class="popen"><p class="note">${introLeft().length} genera not opened yet: they come one at a time as you play.</p><button type="button" class="chip" id="openall">I've had the IMR lecture: open all genera</button></div>`
        : ''
    }
    ${
      weak.length
        ? `<div><h3 class="label">Review first</h3><p class="chips">${weak
            .slice(0, 4)
            .map(n => `<a class="chip" href="#g-${esc(n)}"><i>${esc(n)}</i></a>`)
            .join('')}</p></div>`
        : ''
    }
    ${conf.length ? `<div><h3 class="label">Often mixed up</h3><p class="chips">${conf.map(([n, o, k]) => `<a class="chip" href="#cmp-${esc(n)}|${esc(o)}" title="Compare side by side"><i>${esc(n)}</i> ↔ <i>${esc(o)}</i> <small>· ${k}×</small></a>`).join('')}</p></div>` : ''}
  </aside></div>`;
  bindQuizNav('quiz-board');
  const oa = document.getElementById('openall');
  if (oa)
    oa.onclick = () => {
      introAll();
      NEXTQ = null;
      quizBoard();
    };
  bindSync();
  // The player's place on the leaderboard (Pierre, 2026-11-01: rank and Elo here, the full board on its own page).
  const rank = B => {
    const a = document.getElementById('pbrank'),
      i = B && B.rows ? boardMe(B.rows) : -1;
    if (a && i >= 0) a.innerHTML = `🏆 <b>#${i + 1}</b> · ${B.rows[i][2] == null ? eloLine(P[LEVEL]) : `Elo ${eloScore(B.rows[i][2])}`}`;
  };
  rank(boardCached());
  loadBoard().then(rank);
  // Phones: the Photos/Slate/Groups switch sits above the board and stays pinned while the page scrolls (Pierre, 2026-10-31).
  if (matchMedia(MQ.phone).matches) {
    const sg = $v.querySelector('.pboard .gside .seg');
    sg.classList.add('pvpin');
    $v.querySelector('.pboard').before(sg);
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
        store.set('imr-coral-pview', pv);
        show();
      })
  );
  show();
}

// Header progress pill: genera learned, always in view; the page itself is #progress.
const $prog = document.getElementById('prog');
function showProg() {
  if (!DATA) return;
  const n = Object.keys(DATA.gen);
  const pt = `${progPct(n)}%`,
    lt = `${n.filter(x => level(x)[0] === 'ok').length}/${n.length} genera learned`;
  document.getElementById('progn').textContent = pt;
  $prog.title = `Your progress: ${pt} (${lt})`;
  const p2 = document.getElementById('progn2');
  if (p2) p2.textContent = pt;
  // Not signed in: the pill's tooltip says so, so RAs find where to save their progress.
  const pill = document.getElementById('prog'),
    out = !!SYNC_URL && !SYNC;
  pill.querySelector('.pl').textContent = 'Progress';
  pill.style.setProperty('--pp', progPct(n));
  // Status only (design review 2026-11-01): the pill shows progress and nothing else. Its dot (saving trouble) is gone: the
  // "Not saved" pill beside it already says so in words (design re-review p9).
  pill.title = SYNC
    ? `Signed in as ${SYNC.name}: your progress per genus`
    : out
      ? 'Your progress (not saved online yet: Sign in, top right)'
      : 'Your progress per genus';
  // Signing in (Pierre, 2026-11-01): a filled "Sign in" button in the header on every page while signed out; once signed in
  // it disappears and the account (name, Send now, Sign out) is a quiet line at the top of ⚙. Trouble saving brings it
  // back as "Not saved", which opens ⚙ where the problem is explained.
  const sb = document.getElementById('signb'),
    bad = syncTrouble();
  sb.hidden = !SYNC_URL || (!!SYNC && !bad);
  sb.textContent = bad ? 'Not saved' : 'Sign in';
  sb.classList.toggle('warn', !!bad);
  sb.title = bad || 'Sign in to save your progress for your IMR trainer';
}
// Progress files: every imr-coral-* key in localStorage (quiz progress, settings, Lab scores), as JSON.
const progData = () => {
  const d = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('imr-coral') && k !== 'imr-coral-sync') d[k] = localStorage.getItem(k);
    }
  } catch (e) {}
  return d;
};
const loadData = d =>
  Object.entries(d || {}).forEach(([k, v]) => k.startsWith('imr-coral') && k !== 'imr-coral-sync' && localStorage.setItem(k, v));
function bindProgFile() {
  const msg = t => (document.getElementById('pmsg').textContent = t);
  document.getElementById('pexp').onclick = () => {
    const out = {app: 'imr-coral-id', saved: new Date().toISOString(), data: progData()};
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], {type: 'application/json'}));
    a.download = `imr-coral-progress-${out.saved.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    msg('Saved. Keep the file somewhere safe (Drive, email to yourself).');
  };
  const pick = document.getElementById('pimp');
  document.getElementById('pload').onclick = () => pick.click();
  // After loading a file the page reloads: ⚙ opens on the backup fold to confirm it (not after a sign-in, which also reloads).
  try {
    const done = sessionStorage.getItem('imr-coral-loaded');
    if (done) {
      sessionStorage.removeItem('imr-coral-loaded');
      msg('Progress loaded from ' + done + '.');
      if (done !== 'the IMR sheet') {
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
        if (j.app !== 'imr-coral-id' || !j.data) throw 0;
        loadData(j.data);
        // Reload so every setting held in memory (quiz options, list order, Lab state) picks up the file.
        try {
          sessionStorage.setItem('imr-coral-loaded', f.name);
        } catch (e) {}
        location.reload();
      })
      .catch(() => msg('This file is not an IMR Coral ID progress file.'));
  };
}

// Public leaderboard (Pierre, 2026-11-01): every signed-in player by progress %, then Elo (their ability from every
// answer, so players at 100% keep competing). 🏆 in the header opens it from any page; My progress shows the player's
// rank and Elo with a link here. Signed-in players appear by default; ⚙ Leaderboard Off takes them off (sent with the next
// sync, the sheet's Board column). The sheet serves it (GET ?board=1, v14, cached 5 minutes there, 1 minute here).
const BOARD = 'imr-coral-board'; // an imr-coral key: it travels with the progress, so the choice holds on every device
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
  return n >= ELO_MIN && typeof G.th === 'number'
    ? `Elo ${eloScore(G.th)}`
    : `<small>Your rating shows after ${ELO_MIN - n} more answers</small>`;
};
// The sync script answers in 1-3 s (a Google Apps Script starting up), whatever its own cache: so the last board is kept
// on this device (BOARD_C, not an imr-coral key: it never travels with the progress) and shown at once, then replaced
// when the fresh one arrives (Pierre, 2026-11-01: "the leaderboard takes long to load"). It is also fetched a few seconds
// after start-up, so the first visit to the page is usually instant too.
const BOARD_C = 'imr-board-cache';
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
  const me = boardMe(B.rows);
  const note = !SYNC
    ? '<p class="note">Sign in (⚙ Settings) to appear on the leaderboard.</p>'
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
              `<li${i === me ? ' class="me" aria-current="true"' : ''}><span class="brank">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><b class="bname">${esc(r[0])}</b><span class="belo" title="${r[2] == null ? `Elo shows from ${ELO_MIN} answers` : 'Elo: level from all answers'}">${r[2] == null ? '' : `Elo ${eloScore(r[2])}`}</span><span class="bpct">${r[1] == null ? '–' : r[1] + '%'}</span></li>`
          )
          .join('')}</ol>`
      : '<p class="note">Nobody yet: be the first.</p>');
  const m = box.querySelector('.me');
  if (m && m.scrollIntoView && m.getBoundingClientRect().bottom > innerHeight) m.scrollIntoView({block: 'center'});
}
// Achievements (core.js ACH, Pierre 2026-11-01): checked after every answer on a snapshot of the progress (achSnap);
// each new one pops up (achPop, one after the other). Kept in imr-coral-ach ({id: time}, plus _run / _best for the run
// of right answers and _cor / _hard for one-off feats), an imr-coral key, so it travels with the progress. The first
// check on a device with progress but no record yet (the feature arriving) grants what is already met in one recap.
const ACHK = 'imr-coral-ach';
// Two records of one player (another device, or this device before signing in): every achievement kept with its
// earliest date, the best run kept; the current run stays this device's.
// Version of the record (ACH_V): a record from before the full recount (2026-11-01, mastery exam) brings its feats
// (best run, corallites, hard photo) but not its achievements, which were counted on the old rules.
const ACH_V = 2;
function achMerge(json) {
  try {
    const ra = JSON.parse(json || 'null');
    if (!ra || typeof ra !== 'object') return;
    const A = store.get(ACHK, {}) || {},
      old = ra._v !== ACH_V;
    Object.keys(ra).forEach(k => {
      if (k === '_run' || k === '_v' || (old && k[0] !== '_')) return;
      A[k] = k === '_best' ? Math.max(A[k] || 0, ra[k] || 0) : A[k] ? Math.min(A[k], ra[k]) : ra[k];
    });
    store.set(ACHK, A);
  } catch (e) {}
}
const achList = () => Object.keys(DATA.gen).filter(n => Q.stars || DATA.gen[n].n);
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
    bonus: bonusOpen().length
  };
}
// Full recount, once per device (Pierre, 2026-11-01: "redo the calculation cleanly for everyone, achievements too,
// locking again those unlocked when they should not have been"): every achievement is tested again on the current
// progress with the current rules; those still met keep their date, the others go. Feats (runs, corallites, hard photo)
// stay. Then one sync, so the sheet's copy (leaderboard %, achievement shares) follows.
function achMigrate() {
  const A = store.get(ACHK, null);
  if (A && A._v === ACH_V) return;
  const B = {_v: ACH_V};
  if (A) ['_run', '_best', '_cor', '_hard'].forEach(k => A[k] && (B[k] = A[k]));
  const snap = achSnap(B),
    t = Date.now();
  ACH.filter(a => a.test(snap)).forEach(a => (B[a.id] = (A && A[a.id]) || t));
  store.set(ACHK, B);
  if (SYNC && A) syncSoon();
}
function achCheck(silent) {
  const had = store.get(ACHK, null),
    A = had || {},
    ids = newAch(achSnap(A), A);
  if (!ids.length) {
    if (!had) store.set(ACHK, A);
    return;
  }
  const t = Date.now();
  ids.forEach(id => (A[id] = t));
  store.set(ACHK, A);
  if (silent || !had) achRecap(ids);
  else ids.forEach(id => achPop(ACH.find(a => a.id === id)));
}
// After each answer: the run of right answers and the one-off feats, then the check.
function achAfter(good, ph) {
  if (!store.get(ACHK, null)) achCheck(true); // no record yet on this device: what is already met comes as one recap
  const A = store.get(ACHK, {}) || {},
    solo = ph.length === 1;
  A._run = good ? (A._run || 0) + 1 : 0;
  A._best = Math.max(A._best || 0, A._run);
  if (good && solo && ph[0].view === 'macro') A._cor = 1;
  // Hard by the players' own record: a photo shown alone that at most half of 5+ answers got right.
  const o = solo && PSTAT[ph[0].f];
  if (good && o && o[1] >= 5 && o[2] / o[1] <= 0.5) A._hard = 1;
  store.set(ACHK, A);
  achCheck();
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
function achNext() {
  const a = achQ.shift();
  if (!a) return (achBusy = false);
  achBusy = true;
  const el = document.createElement('div');
  el.className = 'achpop t' + a.tier + (calm() ? ' calm' : '');
  el.setAttribute('role', 'status');
  el.innerHTML = `<a href="#ach" class="achin"><span class="achic" aria-hidden="true">${a.icon}</span><span><small>Achievement unlocked ${TIER[a.tier]}</small><b>${esc(a.title)}</b><span>${esc(a.desc)}</span></span></a>${calm() ? '' : `<span class="confetti" aria-hidden="true">${Array.from({length: 14}, (_, i) => `<i style="--i:${i}"></i>`).join('')}</span>`}`;
  document.body.append(el);
  let tm = 0;
  const done = () => {
    if (!el.isConnected) return; // once only: a click and the timer must not both move the queue on
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
// #ach: every achievement, earned ones first with their date, the others greyed with what earns them.
// The 🏆 page has two tabs, as on Steam (Pierre, 2026-11-01): Leaderboard (#board) and Achievements (#ach).
const boardTabs = cur =>
  `<nav class="btabs" aria-label="Leaderboard and achievements">${[
    ['board', '🏆 Leaderboard'],
    ['ach', `🏅 Achievements`]
  ]
    .map(([h, t]) => `<a href="#${h}"${h === cur ? ' aria-current="page"' : ''}>${t}</a>`)
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
        if (j) store.set('imr-achs-cache', {n: j.n, counts: j.counts});
        else achsAt = 0;
        return j;
      });
  }
  return achsP;
};
// Earned first, newest first; then the others, the most often earned first (the next within reach); each with the share
// of players holding it, as on Steam.
function viewAch() {
  const A = store.get(ACHK, {}) || {};
  const draw = S => {
    const pc = a => (S && S.n ? (100 * (S.counts[a.id] || 0)) / S.n : null),
      got = ACH.filter(a => A[a.id]).sort((x, y) => A[y.id] - A[x.id]),
      left = ACH.filter(a => !A[a.id]).sort((x, y) => (pc(y) || 0) - (pc(x) || 0));
    const share = a => {
      const p = pc(a);
      return p == null ? '' : `<span class="achp">${p < 1 && p > 0 ? '<1' : Math.round(p)}% of players</span>`;
    };
    const card = (a, on) =>
      `<li class="achc${on ? ' on' : ''} t${a.tier}"><span class="achic" aria-hidden="true">${a.icon}</span><span><b>${esc(a.title)} ${on ? TIER[a.tier] : ''}</b><small>${esc(a.desc)}${on ? ` · ${new Date(A[a.id]).toLocaleDateString([], {day: 'numeric', month: 'short'})}` : ''}</small>${share(a)}</span></li>`;
    $v.innerHTML = `<p class="lede">Achievements mark milestones of your learning: genera met, a quarter, half, three quarters of the way to learned, learned, your overall progress, runs of right answers, look-alike duels, corallites, hard photos and your Elo (from ${ELO_MIN} answers). Never time spent. The share of players counts everyone who signed in.</p>
  <div class="board">${boardTabs('ach')}<h2 class="btitle">${got.length}/${ACH.length} earned</h2>
  <ul class="achl">${got.map(a => card(a, true)).join('')}${left.map(a => card(a, false)).join('')}</ul></div>`;
  };
  draw(store.get('imr-achs-cache', null));
  loadAchs().then(S => {
    if (S && hashNow() === 'ach') draw(S);
  });
}
// Told once, when the leaderboard arrives, to players already signed in: their name now shows there.
function boardNotice() {
  // Players signed in before the leaderboard: one sync writes their progress % (the sheet has none for them yet). Only
  // once the sheet serves the leaderboard (v14): an older script ignores the %, which left everyone at 0% (2026-11-01).
  if (SYNC && !store.get('imr-board-sent14', 0))
    loadBoard().then(B => {
      if (B && !B.err && SYNC && !store.get('imr-board-sent14', 0)) {
        store.set('imr-board-sent14', 1);
        syncSoon();
      }
    });
  if (!SYNC || store.get('imr-board-told', 0)) return;
  store.set('imr-board-told', 1);
  const t = document.createElement('div');
  t.className = 'apptoast';
  t.setAttribute('role', 'status');
  t.innerHTML = `<span>🏆 New: a <a href="#board">leaderboard</a>. Your name shows there; to leave it, ⚙ Settings, Leaderboard: Off.</span><button type="button" aria-label="Close">✕</button>`;
  t.querySelector('button').onclick = () => t.remove();
  t.querySelector('a').onclick = () => t.remove();
  document.body.append(t);
  setTimeout(() => t.remove(), 15000);
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
