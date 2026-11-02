// IMR Coral ID: the quiz screens, split out of app.js (2026-11-02, code review L1: one file per part, one piece at a
// time). A question on screen (question, the session trail, the hint), the stage fitted to the screen (fitStage,
// fitTiles, fitLow), the answer and its feedback (answer), the one-tap question (pulse), the bonus genus unlock card,
// the next question planned and preloaded while the feedback is read (planNext, NEXTQ), the photo quiz (quizPhoto) and
// the look-alike duels (quizDuel). The rules that choose genus, photos and wrong choices are in model.js. A classic
// script like app.js, loaded right after model.js (index.html, in order); app.js waits for every script (window.BOOT)
// before its first page. Required like app.js.
function quizNav() {
  return '';
}
// Session trail (Pierre, 2026-11-01, instead of a "3/3 right" text): the last 10 answers of this visit as 10 small cells next
// to the question, grey until answered, then a full green cell for right and a low red bar for wrong (shape and colour, so
// it reads without colour too). Fixed width: filling it never moves anything. Not saved: My progress holds the real record.
function trail() {
  const h = session.h,
    ok = h.filter(Boolean).length;
  return `<span class="trail" role="img" aria-label="${h.length ? `Last ${h.length} answers: ${ok} right, ${h.length - ok} wrong` : 'Your last 10 answers will show here'}" title="Your last 10 answers">${Array.from(
    {length: 10},
    (_, i) => {
      const v = h[i];
      return `<i${v === undefined ? '' : v ? ' class="r"' : ' class="w"'}></i>`;
    }
  ).join('')}</span>`;
}
function bindQuizNav() {
  bindGo();
}
// The game rules (behind the ? button).
const gameHelp =
  cur => `<p class="lede">${cur.startsWith('quiz-duel') ? 'Two genera that are often confused (look-alikes listed by the IMR lecture or the Coral Finder, and your own mix-ups): say which one is in the photos.' : 'Name the genus in the photos: all the photos of a question show the same coral, at one or several zoom levels.'}
  Pick an answer (or press 1-${cur.startsWith('quiz-duel') ? 2 : 4}). Stuck? When a question has no corallite photo in view, <b>Show the corallites</b> adds one. After answering you get the IMR ID tips and why the other ${cur.startsWith('quiz-duel') ? 'genus is' : 'choices are'} wrong; <b>Next</b> (or Enter) goes on.${cur.startsWith('quiz-duel') ? '' : ' The other choices start easy and its look-alikes come in as you get a genus right.'} Every answer counts in <a href="#progress">My progress</a>. From ${BONUS_AT(0)}% progress, <b>bonus genera</b> join in: corals off the IMR list that are common at Dauin and easily confused with it (fire coral <i>Millepora</i> first).</p>
  <p class="lede"><b>Photos</b>: each genus starts with its best photos, preferably a colony photographed at several zoom levels (never views of different colonies mixed), and new ones keep coming in; the more you get a genus right, the harder its photos get and the more often a single view is shown alone (colony, close-up or corallites), and a mistake eases them off. A genus fills up to 95% with your right answers, each point a little harder to earn than the last, and a right answer counts most when the genus's look-alikes are among the choices; a mistake takes it back down; it is learned (100%) once you pass its mastery exam, ${EXAM.n} hard questions slipped unannounced into the photo quiz: see ? on <a href="#progress">My progress</a>.</p>`;
let EXAMQ = null; // the genus whose exam question is on screen (set by question, read by answer)
function question(cur, target, choices, prompt, set, kq) {
  EXAMQ = set.exam ? target : null;
  const ph = set.shown,
    lab = VIEW_LABEL;
  let answered = false,
    hintShown = false;
  const fig = (p, k, n = ph.length) =>
    `<figure class="qph"${p.ar ? ` data-r="${p.ar}"` : ''} style="--qbg:url('${img(p, 's')}')"><button type="button" class="zoom" data-q="${k}" aria-label="Enlarge photo"><img src="${qsrc(p, n)}" data-lo="${img(p, 's')}" alt="Coral to identify${p.view ? ', ' + lab[p.view].toLowerCase() + ' view' : ''}"></button>${p.view ? `<figcaption>${lab[p.view]}</figcaption>` : ''}</figure>`;
  // One screen, no scrolling: the photos fill the stage (sized to the window), choices and feedback sit beside them.
  $v.innerHTML = `${gameHelp(cur)}<div class="q bleed">
    <div class="qstage">${ph.map((p, k) => fig(p, k)).join('')}</div>
    <aside class="qside">
      <div class="qtop"><p class="prompt">${prompt}</p>${trail()}${quizNav(cur)}</div>
      <div class="ans"${kq ? ` data-k="${kq}"` : ''}>${choices.map((c, i) => `<button type="button" data-c="${esc(c)}"><kbd>${i + 1}</kbd>${esc(c)}</button>`).join('')}</div>
      ${set.hint ? '<button type="button" class="linkish" id="hintb">Show the corallites (hint)</button>' : ''}
      <div id="after"></div>
    </aside></div>`;
  bindQuizNav(cur);
  fitStage();
  const hb = document.getElementById('hintb');
  const showHint = () => {
    if (hintShown || !set.hint) return;
    hintShown = true;
    const st = $v.querySelector('.qstage');
    st.insertAdjacentHTML('beforeend', fig(set.hint, ph.length, ph.length + 1));
    if (hb) hb.remove();
    fitStage();
    // Phones show the photos as a swipe strip: bring the corallites in (RA review 2026-11-02: only a sliver showed at the
    // edge, as if nothing happened). Only the strip scrolls, never the page.
    const h = st.lastElementChild;
    if (h && st.scrollWidth > st.clientWidth + 4) st.scrollTo({left: h.offsetLeft - st.offsetLeft, behavior: 'smooth'});
  };
  if (hb) hb.onclick = showHint;
  // Keys: 1-4 answer, Enter goes to the next question.
  const keys = e => {
    if (!document.body.contains($v.querySelector('.q'))) return document.removeEventListener('keydown', keys);
    // Keys typed in the enlarged photo are the viewer's (its Escape reaches this handler before the viewer closes: removing
    // the handler there left 1-4 dead for the rest of the question, new-player walkthrough 2026-11-02).
    if (!lb.hidden || e.target.closest('input, textarea, select') || document.getElementById('tour')) return; // never an answer under the tour
    const b = !answered && $v.querySelectorAll('[data-c]')[Number(e.key) - 1];
    if (b) {
      e.preventDefault();
      b.click();
    }
  };
  document.addEventListener('keydown', keys, {signal: viewKeys()});
  $v.querySelector('.q').addEventListener('click', e => {
    const z = e.target.closest('[data-q]');
    if (!z) return;
    const list = hintShown ? [...ph, set.hint] : answered && set.reveal ? [...ph, ...set.reveal] : ph;
    zoom(
      list.map(p => ({...p, genus: target})),
      Number(z.dataset.q),
      {blind: () => !answered}
    );
  });
  // A single-view question shows the other views of the same colony once answered (seen, not part of the answer).
  const reveal = () => {
    const R = set.reveal || [],
      st = $v.querySelector('.qstage');
    if (!R.length || !st) return;
    st.insertAdjacentHTML('beforeend', R.map((p, k) => fig(p, ph.length + k, ph.length + R.length)).join(''));
    fitStage();
  };
  $v.querySelectorAll('[data-c]').forEach(
    b =>
      (b.onclick = () => {
        const cor = hintShown || ph.some(p => p.view === 'macro' || p.view === 'close');
        showHint();
        reveal();
        answered = true;
        answer(cur, b.dataset.c, target, set.hint ? [...ph, set.hint] : ph, cor, hintShown || !set.hint ? null : set.hint);
        const tr = $v.querySelector('.trail');
        if (tr) tr.outerHTML = trail();
      })
  );
}
// The quiz stage fills the window below the header, so photos, choices and feedback fit without scrolling.
// The photos then take the grid (columns x rows) that shows them largest at 4:3.
function fitStage() {
  const q = $v.querySelector('.q');
  if (!q) return;
  const tab = tabH();
  q.style.setProperty('--qh', Math.max(260, innerHeight - q.getBoundingClientRect().top - window.scrollY - 16 - tab) + 'px');
  const st = q.querySelector('.qstage');
  // Phones (one column): the photo takes all the height the question and answers leave, so no gap is left under it.
  // After an answer the feedback is a bottom sheet over the page: the photo shrinks to the space left above it, so it stays in view.
  if (isStacked()) {
    const side = q.querySelector('.qside'),
      aft = q.classList.contains('done') && document.getElementById('after');
    st.style.height =
      aft && getComputedStyle(aft).position === 'fixed'
        ? Math.max(120, aft.getBoundingClientRect().top - st.getBoundingClientRect().top - 8) + 'px'
        : Math.max(180, parseFloat(q.style.getPropertyValue('--qh')) - (side ? side.offsetHeight : 240) - 10) + 'px';
  } else st.style.height = '';
  const n = st.children.length,
    W = st.clientWidth,
    H = st.clientHeight;
  // Grid of the views: the column count that gives the photos the most room (phones and tablets assume 4:3 photos).
  // Desktop (designer re-review 2026-11-01, N1): each photo's shape is known before it loads (data.json `ar`,
  // tools/apply_ratios.py; 4:3 if missing), so the grid that shows the most photo area wins: portrait or square views go
  // side by side instead of in two wide half-blurred bands. The stage keeps its full height (Pierre dislikes a photo
  // above an empty half screen), and nothing moves while the photos load.
  const rs = [...st.children].map(f => +f.dataset.r || 4 / 3);
  let best = [n, 1, 0];
  for (let c = 1; c <= n; c++) {
    const r = Math.ceil(n / c),
      cw = (W - 8 * (c - 1)) / c,
      ch = (H - 8 * (r - 1)) / r;
    const score = isStacked() ? Math.min(cw, (ch * 4) / 3) : rs.reduce((a, x) => a + Math.min(cw, ch * x) ** 2 / x, 0);
    if (score > best[2] * 1.02) best = [c, r, score];
  }
  st.style.gridTemplateColumns = `repeat(${best[0]}, minmax(0, 1fr))`;
  st.style.gridTemplateRows = `repeat(${best[1]}, minmax(0, 1fr))`;
  // Phones and tablets: the stage takes all the height the question and answers leave (computed above, before any photo
  // loads, so nothing moves while they load). Each photo fills its box (object-fit: cover, class .cov on its figure) when that
  // crops at most ~23% of it; a photo of another shape is shown whole on its blurred background. A 4:3 cap tried after the
  // design review left a small photo over an empty bottom half (Pierre, 2026-11-01): the bigger photo wins.
  // The full frame is one tap away in the lightbox.
  if (isStacked() && !st.classList.contains('qvs') && best[1] === 1) {
    const colW = st.children[0].getBoundingClientRect().width,
      h = st.getBoundingClientRect().height;
    const boxR = colW / h;
    st.querySelectorAll('.qph').forEach(f => {
      const i = f.querySelector('img');
      if (!i) return;
      // A small photo (some IMR lecture originals are ~300 px wide) is never blown up to fill: shown whole at its own
      // size on the blurred background instead, sharp rather than soft (Pierre, 2026-11-01, design re-review m5).
      const set = () => {
        const r = i.naturalWidth / i.naturalHeight,
          up = Math.max(colW / i.naturalWidth, h / i.naturalHeight);
        f.classList.toggle('cov', !!r && Math.max(boxR / r, r / boxR) <= 1.3 && up <= LOWRES);
      };
      if (i.naturalWidth) set();
      else i.addEventListener('load', set, {once: true});
    });
  } else st.querySelectorAll('.qph.cov').forEach(f => f.classList.remove('cov'));
  // Each photo's file for the box it got: a box bigger than guessed (qsrc) loads the bigger file (upsizeImg).
  st.querySelectorAll('.qph img').forEach(i => {
    const r = i.closest('.qph').getBoundingClientRect(),
      px = Math.max(r.width, r.height);
    if (px && !st.classList.contains('qvs')) QBOX[n] = px;
    upsizeImg(i, px);
  });
}
addEventListener('resize', fitStage);
// The loading placeholder (the small file as the img's own background, app.css .qph img) goes once the photo is in: a
// photo smaller than its box showed on a blown-up copy of itself instead of the blurred background (walkthrough
// 2026-11-02). Load events do not bubble, hence the capture.
$v.addEventListener(
  'load',
  e => {
    if (!(e.target instanceof HTMLImageElement && e.target.closest('.qph'))) return;
    e.target.classList.add('in');
    if (hashNow() === 'quiz') loadMark('q1'); // the first quiz photo on screen (sync.js load times)
  },
  true
);
// Big photo stages (Look-alikes, quiz on phones and tablets): a photo that would be enlarged more than this to fill its
// box is shown whole at its own size on the blurred background instead (Pierre, 2026-11-01: sharp beats big for the few
// small IMR lecture photos). Genus sheet tiles keep filling their box.
const LOWRES = 1.15;
const fitLow = fig => {
  const i = fig.querySelector('img');
  if (!i) return;
  const chk = () => {
    const r = fig.getBoundingClientRect();
    fig.classList.toggle('lo', !!i.naturalWidth && Math.max(r.width / i.naturalWidth, r.height / i.naturalHeight) > LOWRES);
  };
  if (i.complete && i.naturalWidth) chk();
  else i.addEventListener('load', chk, {once: true});
};
// Games with a grid of cards (Memory): fill the free area. Try every column count; cards may be square up to
// 4:3 landscape (the photos' shape); keep the layout with the largest cards.
// Height of the phone bottom tab bar (0 on wider screens): every screen-fitting layout leaves room for it.
const tabH = () => {
  const t = document.querySelector('.sections');
  return t && getComputedStyle(t).position === 'fixed' ? Math.max(0, innerHeight - t.getBoundingClientRect().top) : 0;
};
function fitTiles(grid, gap, dims) {
  // Sizes a card grid to the space left on screen. With dims [a, b] the grid is a x b (either orientation)
  // and cards stretch to fill it, within sane aspect ratios; without, picks the best column count.
  if (gap === undefined) {
    gap = +grid.dataset.gap || 10;
    dims = grid.dataset.dims && grid.dataset.dims.split('x').map(Number);
  }
  grid.dataset.gap = gap;
  if (dims) grid.dataset.dims = dims.join('x');
  const n = grid.children.length,
    W = grid.parentNode.clientWidth;
  const H = Math.max(240, innerHeight - grid.getBoundingClientRect().top - window.scrollY - 16 - tabH());
  let opts = dims
    ? [
        [dims[1], dims[0]],
        [dims[0], dims[1]]
      ]
    : Array.from({length: n}, (_, i) => [i + 1, Math.ceil(n / (i + 1))]);
  // data-minw: tiles never narrower than this (their label must stay readable); the grid may then scroll.
  const minw = +grid.dataset.minw || 0;
  let best = null;
  if (minw && !dims) {
    // The most columns that keep tiles at least minw wide; tiles then take the full column width (the grid may scroll).
    const ok = opts.filter(([c]) => (W - gap * (c - 1)) / c >= minw);
    if (ok.length) {
      const c = Math.max(...ok.map(o => o[0])),
        cw = (W - gap * (c - 1)) / c,
        [, r] = ok.find(o => o[0] === c);
      const ch = (H - gap * (r - 1)) / r,
        w = cw,
        h = Math.max(Math.min(ch, cw), cw * 0.9);
      best = {c, w, h, score: 0};
      opts = [];
    }
  }
  for (const [c, r] of opts) {
    const cw = (W - gap * (c - 1)) / c,
      ch = (H - gap * (r - 1)) / r;
    let h = Math.min(ch, cw * (dims ? 1.25 : 1)),
      w = Math.min(cw, h * (dims ? 1.8 : 4 / 3));
    const score = dims ? Math.min(w, h) : w * h;
    if (!best || score > best.score) best = {c, w, h, score};
  }
  grid.style.gridTemplateColumns = `repeat(${best.c}, ${Math.floor(best.w)}px)`;
  grid.style.gridAutoRows = Math.floor(best.h) + 'px';
  grid.style.gap = gap + 'px';
  grid.style.justifyContent = 'center';
  grid.classList.add('fit');
}
addEventListener('resize', () => document.querySelectorAll('.pgrid.fit').forEach(g => fitTiles(g)));
function answer(cur, c, target, ph, cor, unseen) {
  // First answer played while signed out: remember the progress as it was (ANONB), so signing in later adds only what
  // was played since, not progress an older sign-out left on the device.
  if (!SYNC && SYNC_URL && !store.get(LOG0, []).length) store.set(ANONB, P);
  const good = c === target,
    s = st(target),
    chs = [...$v.querySelectorAll('[data-c]')].map(b => b.dataset.c);
  // Offers: every wrong choice shown beside the target, so the player's own mix-up rate per pair is known (confOf).
  chs.forEach(x => {
    if (x !== target) {
      s.off = s.off || {};
      s.off[x] = (s.off[x] || 0) + 1;
    }
  });
  // A wrong answer changes what comes next ("Again", traps, the exam): the questions chosen ahead are chosen again.
  if (!good) dropPlans();
  session.n++;
  session.h = [...session.h, good].slice(-10);
  if (good) {
    session.ok++;
    s.ok++;
    s.streak++;
  } else {
    s.ko++;
    s.streak = 0;
    s.conf = s.conf || {};
    s.conf[c] = (s.conf[c] || 0) + 1;
  }
  // Progress (pgObs) weighed by what the answer proves: the plausible choices k and the look-alikes among the choices.
  const nc = $v.querySelectorAll('[data-c]').length || 4,
    k = Math.min(nc, Number(($v.querySelector('.ans') || {dataset: {}}).dataset.k) || nc);
  const th0 = ability(target),
    nw = ph.filter(p => !(s.ps || {})[p.f]).length;
  const solo = ph.length === 1 ? PICKD.SINGLE : 0; // one view alone is harder than the same photo with the others
  const ps = (s.ps = s.ps || {}),
    d0 = solo + ph.reduce((t, p) => t + photoDiff(target, p), 0) / Math.max(1, ph.length);
  pgObs(target, s, good, pgWeight(target, chs, k));
  abilityStep(target, s, good, d0, k);
  // Global level (core.js playerStart): the same Elo step over every answer, kept as the pseudo-genus LEVEL.
  // Made at the first answer from the player's history (levelSeed), whose counts already include this answer.
  if (P[LEVEL]) P[LEVEL][good ? 'ok' : 'ko']++;
  else P[LEVEL] = levelSeed(P);
  abilityStep(LEVEL, P[LEVEL], good, d0, k);
  // The corallites hint is revealed after the answer when it was not opened: seen, but not recognised.
  ph.forEach(p => {
    const x = (ps[p.f] = ps[p.f] || [0, 0]);
    x[0]++;
    if (good && (cor || p.view !== 'macro')) x[1]++;
  });
  if (ph[0]) s.ro = [...(s.ro || []).filter(o => o !== (ph[0].o || ph[0].f)), ph[0].o || ph[0].f].slice(-2);
  s.h = ((s.h || '') + (good ? 1 : 0)).slice(-10); // recent results, newest last
  // Pierre's rule: a wrong answer also shows the genus given is not mastered, so it counts as a miss for it too.
  if (!good && GX(c)) {
    const w = st(c);
    pgObs(c, w, false, 1); // a miss counts in full (core.js PROG)
    w.h = ((w.h || '') + '0').slice(-10);
    w.streak = 0;
    abilityStep(c, w, false, 0, k);
  }
  if (good && cor) s.cor = 1; // milestone: right with the corallites photo in view
  if (good && (cur.startsWith('quiz-duel') || (cur === 'quiz' && AUTOD))) s.du = 1; // won a look-alike duel, in the Duel tab or slipped into the quiz (the duel achievement)
  // Mastery exam (EXAM): count an exam question passed; any miss on the genus ends its exam, and so does giving the
  // genus as the answer for another one.
  const exq = EXAMQ === target;
  EXAMQ = null;
  if (!good) delete s.ex;
  else if (exq) {
    const ex = s.ex || {k: 0, v: []};
    ex.k++;
    ex.v = [...new Set([...ex.v, ph[0].view])];
    ex.at = answersSoFar();
    if (ex.k >= EXAM.n) {
      s.mx = Date.now(); // learned, and when (the admin's player journey; was 1 before 2026-11-02, still truthy)
      delete s.ex;
      setTimeout(
        () =>
          typeof achPop === 'function' &&
          achPop({tier: 3, icon: '🎓', title: `${target} mastered`, desc: `${EXAM.n} hard questions right, slipped into the quiz`}),
        600
      );
    } else s.ex = ex;
  }
  if (!good && GX(c) && P[c]) delete P[c].ex;
  // Mastery is kept only while the genus stays known (code review #327): a second miss before it is back up loses it and
  // the exam comes back, for the genus shown and for the one answered (mxKept).
  [target, ...(!good && GX(c) ? [c] : [])].forEach(n => P[n] && P[n].mx && !mxKept(n) && delete P[n].mx);
  // Answer log for the RA sheet: kept until the sheet confirms it (capped), so an answer is never logged twice or lost offline.
  // Not signed in yet: the answers wait on this device (LOG0) and join the log when the player signs in (signIn), so the
  // sheet's Answers tab also gets what was played before the account existed (Pierre, 2026-11-01).
  const ans = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    t: new Date().toISOString(),
    g: target,
    a: c,
    ok: good ? 1 : 0,
    // |x: a question of the mastery exam (never with |k: an exam has every trap), for the admin's player journey.
    // A photo-quiz question with fewer than 4 choices ("Again: A or B?" after a mix-up) says so too: logged plain "quiz",
    // the sheet rated it as a 4-choice one (a 1 in 4 guess instead of 1 in 2; 59 of the first 552 answers, 2026-11-02).
    // |d: a look-alike duel slipped into the photo quiz (AUTO_DUEL), before |kN (the sheet reads |kN at the end).
    m: cur + (cur === 'quiz' && AUTOD ? '|d' : '') + (k < (cur === 'quiz' ? 4 : nc) ? '|k' + k : '') + (exq ? '|x' : ''),
    // A corallites hint left closed is not logged: it was not seen when answering (Codex review #339; the sheet rates and
    // counts as recognised only the photos the player saw).
    ph: ph
      .filter(p => p !== unseen)
      .map(p => p.f)
      .join(' '),
    ch: chs.join(' '),
    e: Math.round(100 * (1 / k + (1 - 1 / k) * sig(th0 - d0))) / 100,
    th: th0,
    nw
  };
  // The opening hold's record (model.js holdStep), except the gentle restart's easy questions (Pierre: they must not lift it).
  if (!(cur === 'quiz' && SHOWNQ && SHOWNQ.warm)) holdStep(ans.e, good);
  if (SYNC) SYNC.log = [...(SYNC.log || []), ans].slice(-2000);
  else if (SYNC_URL) {
    store.set(LOG0, [...store.get(LOG0, []), ans].slice(-2000));
    // Not signed in: the answer also goes to the sheet anonymously (Pierre, 2026-11-01), see sendAnon.
    store.set(ANONQ, [...store.get(ANONQ, []), ans].slice(-500));
    anonSoon();
  }
  save();
  // Achievements on the photos seen before answering: a corallites hint left closed is not one.
  // progress.js (tier 4, index.html) may come after the first answers of a first visit: its start-up check (achCheck)
  // then counts what they earned.
  if (typeof achAfter === 'function')
    achAfter(
      good,
      ph.filter(p => p !== unseen)
    );
  $v.querySelectorAll('.qstage .qph').forEach((f, k) => f.insertAdjacentHTML('beforeend', photoSrc(ph[k])));
  // A mix-up: the stage becomes a montage, the photo shown (corallites if they were shown) next to a photo of the
  // genus answered in the same view, so the difference is seen at the moment of the mistake. The pair then comes back
  // as a duel in the photo quiz a couple of questions later.
  let again = false;
  if (!good && GX(c)) {
    // Only photos the player saw during the question: a corallites hint left closed is not "the photo shown".
    const order = ph.filter(p => p !== unseen).sort((x, y) => (y.view === 'macro') - (x.view === 'macro')),
      G = GX(c),
      V = Object.fromEntries(Object.entries(G.views).map(([v, L]) => [v, L.filter(p => !G.x || p.own || !p.gid)]));
    const tp = order.find(p => (V[p.view] || []).length);
    if (tp) {
      const [, cp] = photoPair([tp], V[tp.view], tp),
        st0 = $v.querySelector('.qstage'),
        lab = VIEW_LABEL[tp.view] || '';
      const fig = (p, n, cls, note) =>
        `<figure class="qph ${cls}"${p.ar ? ` data-r="${p.ar}"` : ''} style="--qbg:url('${img(p, 's')}')"><button type="button" class="zoom" data-vs="${cls}" aria-label="Enlarge ${esc(n)}"><img src="${qsrc(p, 2)}" alt="${esc(n)}, ${lab.toLowerCase()} view"></button><figcaption><span aria-hidden="true">${cls === 'qok' ? '✓' : '✗'}</span> <i>${esc(n)}</i></figcaption><small>${note}</small>${photoSrc(p)}</figure>`;
      st0.classList.add('qvs');
      st0.innerHTML = fig(tp, target, 'qok', 'The photo shown') + fig(cp, c, 'qko', 'Your answer, same view');
      st0.querySelectorAll('[data-vs]').forEach(
        z =>
          (z.onclick = e => {
            e.stopPropagation();
            zoom(
              [
                {...tp, genus: target},
                {...cp, genus: c}
              ],
              z.dataset.vs === 'qok' ? 0 : 1
            );
          })
      );
      fitStage();
    }
    // Not after a duel slipped into the quiz (AUTO_DUEL): it was already that 2-choice question, and its pair comes back
    // through duelPick, mix-ups first (Codex review #352: two 2-choice questions two apart).
    if (cur === 'quiz' && !AUTOD) {
      rematch = {pair: [target, c], wait: 1};
      again = true;
    }
  }
  // A right answer gets a short celebration on the choice itself and on "✓ Yes" (app.css .cheer: a pulse and the tick
  // popping, ~400 ms, none with prefers-reduced-motion; "fewer, better pop-ups", Pierre 2026-11-02: the reward is on the
  // action, not in a pop-up). It never holds the player: Next is there and focused at once.
  $v.querySelectorAll('[data-c]').forEach(b => {
    b.disabled = true;
    if (b.dataset.c === target) b.classList.add('ok', ...(good ? ['cheer'] : []));
    else if (b.dataset.c === c) b.classList.add('ko');
  });
  // Bonus genera unlocked and not announced yet (Q.ba = how many were announced) are named once in the feedback.
  const g = GX(target),
    bo = bonusOpen(),
    nbo = bo.slice(Q.ba || 0);
  const vs =
    !good && GX(c)
      ? `<p class="vs">Why not <i>${esc(c)}</i>: ${esc(tipsText(GX(c)))} <a class="linkish" href="#cmp-${esc(target)}|${esc(c)}">Compare them</a></p>${again && againTold() ? '<p class="vs again">This pair comes back as a duel in a moment.</p>' : ''}`
      : '';
  document.getElementById('after').innerHTML = `<div class="fb">
    <h3 class="${good ? 'ok cheer' : 'ko'}"><span class="v">${good ? '\u2713 Yes' : '\u2717 No'},</span> it's <a href="#g-${esc(target)}"><i>${esc(target)}</i></a>${g.x ? ' (bonus, not on the IMR list)' : g.n ? '' : ' (★ not surveyed)'}</h3>
    <div class="tipbox fbtips">${g.qt ? `<p class="label">${tipsLabel(g)}</p>` : ''}${tipsList(g, 'imrfb')}${g.mn ? `<p class="mn"><b>Mnemonic:</b> ${esc(g.mn)}</p>` : ''}</div>${vs}
    <details class="more"><summary>Coral Finder</summary>${(g.imr || []).length ? `<p class="vs">${esc(g.sum)}</p>` : ''}<ul>${g.crit.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="credit">${ph.map(credit).join('<br>')}</p></details>${repBtn({g: target, a: c, ph: ph.map(p => p.f), m: cur})}</div>
    <button class="next" type="button" id="next">Next <kbd>↵</kbd></button>`;
  // Phones: the feedback opens as a bottom sheet so the answer and Next show without scrolling (app.css .q.done).
  const qq = $v.querySelector('.q');
  if (qq) qq.classList.add('done');
  if (isStacked()) {
    window.scrollTo(0, 0);
    fitStage();
    const mo = document.querySelector('#after details');
    if (mo) mo.ontoggle = fitStage;
  }
  // Tablet and desktop: the feedback always sits in the answer column, whatever the stage shows (3 views, one view,
  // a mix-up montage or a duel), so it is in the same place after every answer (Pierre, 2026-11-01). Phones: bottom sheet.
  bindGo(document.getElementById('after'));
  const nb = document.getElementById('next');
  nb.focus({preventScroll: true});
  nb.onclick = route;
  // Chosen now, photos fetched while the feedback is read (planNext). A fixed duel pair (#quiz-duel|A|B) is cheap anyway.
  setTimeout(() => hashNow() === cur && planNext(cur), 50);
  // One overlay at a time: a bonus card waits for the next answer while another card or the tour is open (it is counted
  // as announced only when shown). The out-of-game prompts take turns (promptOk), never with a card or an achievement
  // toast, nor with the mastery toast due in a moment.
  if (nbo.length && !document.querySelector('.unlock, #tour')) {
    Q.ba = bo.length;
    saveQ();
    unlockShow(nbo);
  } else if (!nbo.length && !(exq && s.mx) && promptOk()) {
    if (nudgeDue()) (promptMark(), signinNudge());
    else if (pulseDue()) (promptMark(), pulseAsk());
  }
}
// Out-of-game prompts ("fewer, better pop-ups", Pierre 2026-11-02, after a new-player walkthrough counted an
// interruption every ~2 answers): the sign-in card (from NUDGE_AT answers, sync.js), the one-tap question (from
// PULSE.FIRST) and the offer to open all genera (from INTRO.OFFER.AT, model.js) are at least PROMPT.GAP answers apart and
// never shown with a card, the tour or an achievement toast on screen or waiting: one that falls too close waits until
// the gap is met. Counted in answers, never time. One value for all three: the answers count when the last one showed
// (this device; a count that went back, a progress reset, starts the spacing over).
const PROMPT = {KEY: 'imr-prompt-at', GAP: 10};
const promptOk = () => {
  if (document.querySelector('#tour, .unlock, .achpop') || (typeof achBusy !== 'undefined' && achBusy)) return false;
  const a = answersSoFar(),
    at = store.get(PROMPT.KEY, null);
  return typeof at !== 'number' || a < at || a - at >= PROMPT.GAP;
};
const promptMark = () => store.set(PROMPT.KEY, answersSoFar());
// One-tap question (Pierre, 2026-11-02: people answer a tap, not "any comments?"): now and then, under the answer's
// feedback, "These questions are: Too easy · About right · Too hard" (or × for not now). First after PULSE.FIRST answers
// in all (35 since 2026-11-02, was 15: the sign-in card comes at 20 and prompts are PROMPT.GAP apart), then every
// PULSE.EVERY answers, never before PULSE.SESSION answers of this visit; counted in answers, never time.
// The answer goes to the sheet as an event (ev 'pulse') with what the game knew then: the mode, answers this visit, right
// % of the last 10, overall level, genera met. Nothing in the game changes with it (yet): it tells Pierre whether the
// adaptive difficulty feels right to the players.
const PULSE = {FIRST: 35, EVERY: 60, SESSION: 8},
  PULSEK = 'imr-pulse';
const pulseDue = (h = hashNow()) =>
  (h === 'quiz' || h.startsWith('quiz-duel')) &&
  !document.querySelector('#tour, .unlock') &&
  session.n >= PULSE.SESSION &&
  answersSoFar() >= PULSE.FIRST &&
  answersSoFar() - (store.get(PULSEK, {}).at ?? -1e9) >= PULSE.EVERY;
function pulseAsk() {
  const nb = document.getElementById('next');
  if (!nb) return;
  nb.insertAdjacentHTML(
    'beforebegin',
    `<div class="pulse" role="group" aria-label="How are the questions?"><span>These questions are</span><button type="button" data-pulse="easy">Too easy</button><button type="button" data-pulse="ok">About right</button><button type="button" data-pulse="hard">Too hard</button><button type="button" class="pulsex" data-pulse="" aria-label="Not now" title="Not now">×</button></div>`
  );
  const box = document.querySelector('#after .pulse');
  store.set(PULSEK, {at: answersSoFar()});
  // The row makes the phone's feedback sheet taller: the photos above it are sized again (Codex review #343).
  fitStage();
  box.querySelectorAll('[data-pulse]').forEach(
    b =>
      (b.onclick = e => {
        e.stopPropagation();
        const r = b.dataset.pulse;
        if (r) {
          const h = session.h;
          ev('pulse', {
            r,
            m: hashNow().split('|')[0],
            n: session.n,
            rr: h.length ? Math.round((100 * h.filter(Boolean).length) / h.length) : 0,
            lv: Math.round(((P[LEVEL] || {}).th || 0) * 100) / 100,
            met: Object.keys(DATA.gen).filter(g => P[g]).length
          });
          box.innerHTML = '<span>Thank you!</span>';
        } else box.remove();
        fitStage();
        document.getElementById('next')?.focus({preventScroll: true});
      })
  );
}
// Card photos: the cards sit outside the page view, out of reach of app.js's retries. Here too a photo that fails is
// tried again twice (after 1 s, then 4 s), and is kept out of sight meanwhile and if it never comes: never a broken-image
// icon on a card (new-player walkthrough 2026-11-02, a bonus card offline).
document.addEventListener(
  'error',
  e => {
    const i = e.target;
    if (!(i instanceof HTMLImageElement) || !i.closest('.unlock') || !i.getAttribute('src')) return;
    const n = Number(i.dataset.retry || 0),
      u = i.getAttribute('src');
    i.classList.add('fail');
    if (n < 2) {
      i.dataset.retry = n + 1;
      setTimeout(
        () => {
          if (i.isConnected && i.getAttribute('src') === u) i.src = u.replace(/#.*$/, '') + '#r' + (n + 1);
        },
        1000 * (n + 1) ** 2
      );
    }
  },
  true
);
document.addEventListener(
  'load',
  e => {
    if (e.target instanceof HTMLImageElement && e.target.closest('.unlock')) e.target.classList.remove('fail');
  },
  true
);
// Unlock card (Pierre, 2026-11-01): shown once per newly unlocked bonus genus, over the quiz feedback. A "?" tile turns
// over to the genus's cover photo, with its name and Coral Finder ID tips. Got it / Esc / Enter / a click outside closes
// it (Enter is caught first, so it doesn't also skip to the next question). No motion with prefers-reduced-motion.
function unlockShow(L) {
  const n = L[0],
    g = GX(n),
    p = cover(g),
    d = document.createElement('div');
  d.className = 'unlock';
  d.setAttribute('role', 'dialog');
  d.setAttribute('aria-modal', 'true');
  d.setAttribute('aria-label', 'Bonus genus unlocked');
  d.innerHTML = `<div class="ulcard"><div class="ulflip"><div class="ulback" aria-hidden="true"><b>?</b></div><div class="ulfront">${p ? `<img src="${img(p, 's')}" alt="">` : ''}</div></div>
    <p class="ulkick">Bonus genus unlocked</p><h3><i>${esc(n)}</i></h3>
    <p class="ulnote">Not on the IMR list, but common at Dauin. It now joins the photo quiz and the duels.</p>
    <div class="ultips"><p class="label">${tipsLabel(g)}</p>${tipsList(g)}</div>
    ${
      L.length > 1
        ? `<p class="ulnote">Also unlocked: ${L.slice(1)
            .map(x => `<i>${esc(x)}</i>`)
            .join(', ')}</p>`
        : ''
    }
    <div class="ulbtns"><a class="linkish" href="#g-${esc(n)}">Open its sheet</a><button class="next" type="button">Got it</button></div></div>`;
  document.body.appendChild(d);
  const close = () => {
    d.remove();
    document.removeEventListener('keydown', key, true);
    const nb = document.getElementById('next');
    if (nb) nb.focus({preventScroll: true});
  };
  // Enter on the focused sheet link follows it (its click closes the card); elsewhere Enter / Esc just close the card.
  const key = e => {
    if ((e.key !== 'Escape' && e.key !== 'Enter') || document.getElementById('tour')) return; // the tour's keys while the card waits under it
    e.stopPropagation();
    if (e.key === 'Enter' && e.target.closest && e.target.closest('.unlock a')) return;
    e.preventDefault();
    close();
  };
  document.addEventListener('keydown', key, true);
  d.ulClose = close; // leaving the page closes it (route)
  d.querySelector('button').onclick = close;
  d.querySelector('a').addEventListener('click', close);
  d.addEventListener('click', e => {
    if (e.target === d) close();
  });
  setTimeout(() => {
    const b = d.querySelector('button');
    if (b) b.focus({preventScroll: true});
  }, 50);
}
// A mix-up in the photo quiz comes back once as a duel of the two genera, one question later.
let rematch = null;
// GAP: answers between two duels slipped in; AGAIN: answers at least after an "Again" (spacing them from the Agains
// by GAP left a player who errs 1 time in 10 with 1 duel in 40 questions instead of 1 in 10).
const AUTO_DUEL = {P: 0.1, FROM: 20, GAP: 5, AGAIN: 2, SAME: 20};
let twoAt = -Infinity, // answers so far at the last duel slipped in
  againAt = -Infinity, // ... and at the last "Again"
  duelLog = [], // [answers so far, pair] of the duels slipped in lately
  AUTOD = false, // the question on screen is one of them (set by quizPhoto, read by answer)
  warmLeft = null; // gentle-restart questions left this visit (planPhoto; null: not decided yet)
// The gentle restart at a visit (planPhoto): N easy questions for a player with FROM answers or more (10, Pierre
// 2026-11-02: 5 was short; the second half also brings back the genera to review, still with easy choices).
const WARM = {N: 10, FROM: 10};
// "This pair comes back as a duel in a moment": said the first 3 times only (RA review 2026-11-02: it came on every
// wrong answer, about 20 times in 30 questions); the pair still comes back every time.
const againTold = () => {
  const n = store.get('imr-again-told', 0);
  if (n >= 3) return false;
  store.set('imr-again-told', n + 1);
  return true;
};
// The next questions are chosen ahead and their photos fetched meanwhile, so Next shows one at once even on a slow
// connection (Pierre, 2026-11-01: "preload the photos"). Up to AHEAD questions of the photo quiz (Pierre, 2026-11-02,
// field link: ~86 kbit/s, and a fluent RA answers in ~8 s, less than one question's photos take; 95% of the answers are
// in the photo quiz), one in the Duel tab. NEXTQ is the first of them, each holding the next (.next): setting it to null
// drops them all. Each is used only if nothing changed since it was chosen: the answers count it was planned for and the
// genera in play (settings, bonus genera), else chosen afresh.
// Planning ahead keeps the rules of the draw: a question with cards, an exam question, a duel slipped in or an "Again"
// ends the queue (nothing is chosen past it before it is played: cards are met when shown, an exam answer spaces the
// next), and a wrong answer drops the queue (its "Again" comes one question later, as before), putting back the
// planner's own state (the genus asked last, the duel and "Again" spacing) as it was before those questions were
// chosen. What changes: after a right answer, the questions already chosen stay, chosen up to AHEAD - 1 answers earlier
// (their weights lag those answers; a new card, exam question or duel comes up to that many questions later).
const AHEAD = 3;
let NEXTQ = null;
const planKey = (cur, i = 0) => `${cur}|${answersSoFar() + i}|${pool().join()}`;
const planState = () => ({last, lastQs, rematch: rematch && {...rematch}, twoAt, againAt, duelLog, warmLeft});
function dropPlans() {
  if (NEXTQ) ({last, lastQs, rematch, twoAt, againAt, duelLog, warmLeft} = NEXTQ.snap);
  NEXTQ = null;
}
const plain = q => !q.intro && !q.auto && !q[4].exam && q[2].length > 2;
// The photos of the planned questions, fetched in the order they will be needed, two files at a time: question after
// question (the cards of the genera met first, then the photos shown, small version then full size, then the hint and
// the other views shown after the answer). All at once they shared a slow line, and the first photo came later than
// with no preloading at all (tools/perf.js, slow 3G: Next -> photo 11 s before preloading, 20 s with everything in
// parallel). The question on screen (ONQ) keeps its turn until its own files are in; a question dropped (NEXTQ = null,
// dropPlans) fetches nothing more. prefetched() resolves once nothing is left to fetch (the start-up then moves on to
// the next tier, index.html).
let PF = [],
  ONQ = null,
  pfLive = 0,
  pfWait = [];
const pfUrls = q => {
  const set = q[4],
    later = [...(set.hint ? [set.hint] : []), ...(set.reveal || [])],
    n = (set.shown || []).length;
  return [
    ...new Set([
      ...(q.intro || [])
        .map(g => cover(GX(g)))
        .filter(Boolean)
        .map(p => img(p, 's')),
      ...(set.shown || []).flatMap(p => [img(p, 's'), qsrc(p, n)]),
      ...later.map(p => img(p, 's')),
      ...later.map(p => qsrc(p, n + later.length))
    ])
  ].filter(u => u.startsWith('img/')); // the site's own files (an iNaturalist photo waiting to be downloaded loads when shown)
};
const pump = () => {
  const kept = new Set([ONQ]);
  for (let x = NEXTQ; x; x = x.next) kept.add(x);
  PF = PF.filter(x => kept.has(x) && x.urls.length);
  // Images, so the question's own <img> shares the download still on its way (with fetch() the same file came twice on
  // the field link). They hold the page's load event while they load.
  for (const x of PF)
    while (pfLive < 2 && x.urls.length) {
      const i = new Image();
      pfLive++;
      i.onload = i.onerror = () => (pfLive--, pump());
      i.decoding = 'async';
      i.src = x.urls.shift();
      x.held.push(i);
    }
  if (!pfLive && !PF.length) pfWait.splice(0).forEach(ok => ok());
};
const prefetched = () => new Promise(ok => (pfWait.push(ok), pump()));
// Tops the queue up to AHEAD (questions after the one on screen if it is not answered yet). Not while the cards of
// the genera met are open: they are recorded as they show, and a plan made meanwhile would deal them again.
function planNext(cur) {
  if ((cur !== 'quiz' && cur !== 'quiz-duel') || document.querySelector('.unlock.intro')) return;
  const o = $v.querySelector('.q:not(.done)') ? 1 : 0;
  // A question on screen that changes what comes next (an exam question, a duel slipped in, an "Again", cards) is answered
  // before anything is planned past it: its answer moves the exam's spacing and the photos seen (Codex review #361).
  if (o && cur === 'quiz' && SHOWNQ && !plain(SHOWNQ)) return;
  const pk = pool().join(),
    key = i => `${cur}|${answersSoFar() + o + i}|${pk}`;
  if (NEXTQ && NEXTQ.k !== key(0)) dropPlans();
  let n = 0,
    end = null;
  for (let x = NEXTQ; x; x = x.next) (n++, (end = x));
  while (n < (cur === 'quiz' ? AHEAD : 1) && !(end && end.stop)) {
    const snap = planState(),
      args = cur === 'quiz' ? planPhoto() : planDuel(),
      x = {k: key(n++), args, snap, stop: !plain(args), urls: pfUrls(args), held: [], next: null};
    if (end) end.next = x;
    else NEXTQ = x;
    end = x;
    PF.push(x);
  }
  pump();
}
const topUp = () => setTimeout(() => planNext(hashNow()), 50);
const takePlan = cur => {
  const x = NEXTQ;
  if (!x || x.k !== planKey(cur)) return (dropPlans(), (ONQ = null));
  NEXTQ = x.next;
  ONQ = x;
  return x.args;
};
let SHOWNQ = null; // the photo-quiz question on screen (planNext)
function quizPhoto() {
  let q = takePlan('quiz') || planPhoto();
  // A planned card waits while the player falls behind (introHold, Codex review #362: a right answer that starts the
  // hold leaves the questions planned before it): the plans go and the question is chosen again.
  if (q.intro && !q.start && introHold()) {
    dropPlans();
    q = planPhoto();
  }
  SHOWNQ = q;
  // The duel spacing counts from when an "Again" or a slipped-in duel shows, not from when it was planned (Codex review
  // #361: a duel planned 2 questions ahead left the next one 2 answers early).
  if (q.again) againAt = answersSoFar();
  if (q.auto) {
    twoAt = answersSoFar();
    duelLog = [...duelLog.filter(([, k]) => k !== q.auto), [twoAt, q.auto]];
  }
  AUTOD = !!q.auto;
  question(...q);
  if (q.intro) introShow(q.intro, q.start);
  else if (promptOk() && introOffer()) (promptMark(), introOfferShow()); // never over another card: next question
  topUp(); // the questions after this one, chosen while it is played (planNext)
}
// The offer to open all genera (model.js introOffer), over the question, once: Open all genera, or Not now.
function introOfferShow() {
  const d = document.createElement('div'),
    a = answersSoFar(),
    pick = open => {
      store.set(INTRO.OFFER.KEY, {at: a, open: 0, t: Date.now()});
      if (open) {
        introAll('offer');
        NEXTQ = null;
      }
      save();
      close();
    };
  d.className = 'unlock intro';
  d.setAttribute('role', 'dialog');
  d.setAttribute('aria-modal', 'true');
  d.setAttribute('aria-label', 'Open all genera?');
  d.innerHTML = `<div class="ulcard"><p class="ulkick">${a} answers in</p><h3>You seem to know your corals already</h3>
    <p>Open all ${Object.keys(DATA.gen).length} genera at once, instead of one at a time? ${introLeft().length} are still to come.</p>
    <div class="ulbtns ulstack"><button class="next" type="button" data-open>Open all genera</button><button class="next sec" type="button">Not now</button></div>
    <p class="note">Also in My progress, any time.</p></div>`;
  document.body.appendChild(d);
  const close = () => {
    d.remove();
    document.removeEventListener('keydown', key, true);
    topUp();
  };
  const key = e => {
    if (e.key === 'Tab' || document.getElementById('tour')) return; // the tour's keys while the card waits under it
    e.stopPropagation(); // never the quiz's answer keys behind the card
    if (/^\d$/.test(e.key)) e.preventDefault();
    if (e.key !== 'Escape') return;
    e.preventDefault();
    pick(false);
  };
  document.addEventListener('keydown', key, true);
  d.ulClose = close; // leaving the page closes it unanswered (route): the offer can come back
  d.querySelector('[data-open]').onclick = () => pick(true);
  d.querySelector('.sec').onclick = () => pick(false);
  setTimeout(() => d.querySelector('[data-open]').focus({preventScroll: true}), 50);
}
// The cards of the genera met now (INTRO in model.js), one after the other over the question: the first INTRO.START
// together ("1 of 4", the first questions are about them), later ones alone (asked a few questions later). Recorded
// when shown, so a planned question never played leaves no genus met without its card.
function introShow(L, start, kind = start ? 's' : 'c') {
  document.querySelectorAll('.unlock.intro').forEach(x => (x.ulClose ? x.ulClose() : x.remove())); // with its keys
  const d = document.createElement('div');
  d.className = 'unlock intro';
  d.setAttribute('role', 'dialog');
  d.setAttribute('aria-modal', 'true');
  document.body.appendChild(d);
  let i = 0;
  const close = () => {
    d.remove();
    document.removeEventListener('keydown', key, true);
    topUp();
  };
  d.ulClose = close; // leaving the page closes it (route); the genera of the cards not shown yet come next time
  const next = () => (++i < L.length ? show() : close());
  const show = () => {
    const n = L[i],
      g = GX(n),
      p = cover(g),
      star = typeof starNote === 'function' ? starNote(n) : '',
      more = i < L.length - 1;
    // Met when its card is shown (Codex review #350): a sequence left half-way (reload) shows the rest next time.
    introAdd([n], start, kind);
    d.setAttribute('aria-label', `New genus: ${n}`);
    d.innerHTML = `<div class="ulcard">${p ? `<div class="ulphoto"><img src="${img(p, 's')}" alt=""></div>` : ''}
      <p class="ulkick">New genus${L.length > 1 ? ` · ${i + 1} of ${L.length}` : ''}</p><h3><i>${esc(n)}</i></h3>
      ${star ? `<p class="ulnote">${star}: on the slate so you learn to tell them apart.</p>` : ''}
      <div class="ultips"><p class="label">${tipsLabel(g)}</p>${tipsList(g)}</div>
      <p class="ulnote">${start ? (more ? `The first questions are about these ${L.length} genera.` : 'Now, which is which?') : 'It comes up in the questions a little later.'}</p>
      <div class="ulbtns"><span></span><button class="next" type="button">${more ? 'Next' : start ? 'Start' : 'Got it'}</button></div>
      ${start && introLeft().length ? `<div class="ulall"><p><b>Had the IMR coral lecture?</b> Skip the cards and play with all ${Object.keys(DATA.gen).length} genera.</p><button class="next sec" type="button" data-all>Open all genera</button></div>` : ''}</div>`;
    d.querySelector('.next').onclick = next;
    const all = d.querySelector('[data-all]');
    if (all)
      all.onclick = () => {
        introAll('card');
        NEXTQ = null;
        save();
        close();
      };
    setTimeout(() => {
      const b = d.querySelector('.next');
      if (b) b.focus({preventScroll: true});
    }, 50);
  };
  // The quiz's keys (1-4 answer) never reach the question behind the card (Codex review #350). Enter on a focused
  // button presses it; elsewhere Enter, and Escape, move on (the first cards are not skipped: each is met when shown).
  const key = e => {
    if (e.key === 'Tab' || document.getElementById('tour')) return; // the tour's keys while the card waits under it
    e.stopPropagation();
    if (e.key === 'Enter' && document.activeElement && d.contains(document.activeElement)) return;
    if (/^\d$/.test(e.key)) e.preventDefault();
    if (e.key !== 'Escape' && e.key !== 'Enter') return;
    e.preventDefault();
    start ? next() : close();
  };
  document.addEventListener('keydown', key, true);
  d.addEventListener('click', e => {
    if (e.target === d) start ? next() : close();
  });
  show();
}
// Cards due with the next question (INTRO): the first ones while fewer than INTRO.START slate genera are met (picked by
// the progressive path's draw, easiest first), else none: planPhoto may add one when its draw falls on a genus not met.
function introStart(list) {
  const slate = list.filter(n => !isBonus(n)),
    want = INTRO.START - slate.filter(introduced).length,
    L = [];
  for (let fresh = slate.filter(n => !introduced(n)); L.length < want && fresh.length; fresh = fresh.filter(n => n !== L[L.length - 1]))
    L.push(weighted(fresh));
  return L;
}
function planPhoto() {
  const list = pool();
  if (rematch && rematch.wait-- <= 0) {
    const pair = rematch.pair;
    rematch = null;
    if (pair.every(n => list.includes(n))) {
      againAt = answersSoFar();
      const t = pick(pair);
      // Planned ahead, it shows later than planned: quizPhoto sets againAt again when it shows (Codex review #361).
      // During the gentle restart an Again still follows a miss (it corrects it), counted with the restart: it leaves the
      // opening hold as it was (Codex review #364).
      return Object.assign(['quiz', t, shuffle(pair.slice()), `Again: <i>${esc(pair[0])}</i> or <i>${esc(pair[1])}</i>?`, photoSet(t)], {
        again: 1,
        ...(warmLeft > 0 ? {warm: 1} : {})
      });
    }
  }
  // The genus asked is one already met (INTRO): ready, or one of the cards shown with this question when they are the
  // first ones. A draw that falls on a genus not met yet (the progressive path opening one, at most one card every
  // INTRO.EVERY answers) shows its card instead, and the question is about another genus.
  let cards = introStart(list);
  // A gentle restart (Pierre, 2026-11-02, after an RA left on a run of misses): a player coming back with WARM.FROM
  // answers or more gets WARM.N questions on genera already answered right, with easy choices, before anything else of
  // the visit: no card, no duel, no exam. The first half leaves out the genera to review (a positive start), the second
  // half brings them back. Their answers leave the opening hold as it was (answer()).
  if (warmLeft === null) warmLeft = answersSoFar() >= WARM.FROM ? WARM.N : 0;
  const start = cards.length > 0,
    ready = n => cards.includes(n) || introReady(n),
    known = n => cards.includes(n) || introduced(n),
    met = list.filter(ready),
    // Genera answered right; the first half without those to review, unless fewer than 2 are left (Codex review #364:
    // a player with only genera to review got no restart at all). Fewer than 2 answered right: no restart.
    warmAll = warmLeft > 0 && !start ? met.filter(n => (P[n] || {}).ok > 0 && level(n)[0] !== 'new') : [],
    warmSure = warmAll.filter(n => level(n)[0] !== 'weak'),
    warmL = warmLeft > WARM.N / 2 && warmSure.length >= 2 ? warmSure : warmAll,
    warm = warmL.length >= 2,
    open = !start && !warm && introSince() >= INTRO.EVERY && !introHold();
  if (warm) warmLeft--;
  else if (warmLeft > 0 && !start) warmLeft = 0; // not enough genera answered right: no restart this visit
  // With the first cards, the question is about one of them (never a bonus genus unlocked earlier, say).
  let t = nextTarget(start ? cards : warm ? warmL : met.length ? (open ? list.filter(n => ready(n) || !introduced(n)) : met) : list);
  if (met.length && !known(t)) {
    cards = [t];
    t = nextTarget(met);
  }
  // Not when the path opens a genus (a card) this question: opening comes first (Pierre, 2026-11-02).
  // A look-alike duel slipped into the photo quiz (Pierre, 2026-11-02, "a little duel back in the quiz, automatically";
  // the Duel tab had 13 answers in all): AUTO_DUEL.P of the questions from AUTO_DUEL.FROM answers on, AUTO_DUEL.GAP
  // questions at least after the last one and AUTO_DUEL.AGAIN after an "Again", on a pair of genera both met and ready, never the same pair within
  // AUTO_DUEL.SAME answers; picked as the Duel tab picks (own mix-ups first). Logged "quiz|d|k2" (counted apart).
  const a = answersSoFar();
  // The count went back (progress reset): the spacing starts over.
  if (a < twoAt) twoAt = -Infinity;
  if (a < againAt) againAt = -Infinity;
  duelLog = duelLog.filter(([at]) => at <= a);
  // Never while an "Again" is due (it comes next): the duel would sit right before it.
  if (
    !cards.length &&
    !warm &&
    !rematch &&
    a >= AUTO_DUEL.FROM &&
    a - twoAt >= AUTO_DUEL.GAP &&
    a - againAt >= AUTO_DUEL.AGAIN &&
    Math.random() < AUTO_DUEL.P
  ) {
    const key = p => p.slice().sort().join('|'),
      recent = new Set(duelLog.filter(([at]) => a - at < AUTO_DUEL.SAME).map(([, k]) => k)),
      pair = duelPick(list, p => p.every(introReady) && !recent.has(key(p)));
    if (pair) {
      twoAt = a;
      duelLog = [...duelLog.filter(([at]) => a - at < AUTO_DUEL.SAME), [a, key(pair)]];
      const t = pick(pair);
      last = t; // the genus asked is the duel's, not the one drawn above for the card decision
      lastQs = [...lastQs.slice(0, -1), t];
      return Object.assign(
        ['quiz', t, shuffle(pair.slice()), `Look-alikes: <i>${esc(pair[0])}</i> or <i>${esc(pair[1])}</i>?`, photoSet(t)],
        {
          auto: key(pair) // the pair, so its spacing is set again when it shows (quizPhoto)
        }
      );
    }
  }
  const ex = !warm && examReady(t) && examSet(t),
    traps = ex ? 3 : warm ? 0 : trapsFor(t),
    ch = shuffle([t, ...distractors(t, list, traps, known)]),
    // The question asked with its genus's card never shows the card's own photo again (new-player walkthrough 2026-11-02).
    q = [
      'quiz',
      t,
      ch,
      'Which genus?',
      ex || photoSet(t, cards.includes(t) ? (cover(GX(t)) || {}).f : null),
      traps < 2 ? plausibleK(t, ch) : 0
    ];
  if (cards.length) Object.assign(q, {intro: cards, start});
  if (warm) q.warm = 1;
  return q;
}
function quizDuel(a, b) {
  const q = (!a && !b && takePlan('quiz-duel')) || planDuel(a, b);
  question(...q);
  // Both genera are named on the buttons: the cards of those not met yet come together, and either can be the answer.
  const L = q[2].filter(n => !introduced(n));
  if (L.length) introShow(L, true, 'c');
}
// A look-alike pair for a duel (the Duel tab, and the duels slipped into the photo quiz): among the pairs whose two
// genera are in the list and pass keep. Null when none.
function duelPick(list, keep = () => true) {
  // Unlocked bonus genera duel with the slate look-alike the Coral Finder names.
  const ps = [
    ...pairs(),
    ...bonusOpen().flatMap(b =>
      GX(b)
        .look.filter(a => DATA.gen[a])
        .map(a => [a, b])
    )
  ].filter(([x, y]) => list.includes(x) && list.includes(y) && keep([x, y]));
  if (!ps.length) return null;
  // Your mix-ups you still make come up most (personal confusion score, confOf), then pairs players often confuse and
  // the classic look-alikes (compared in the IMR lecture or the Coral Finder text).
  const w = ps.map(
      ([x, y]) => (weight(x) + weight(y)) * (mixedUp(x, y) && confusable(x, y) ? 3 : confusable(x, y) || isClassic(x, y) ? 2 : 1)
    ),
    t0 = w.reduce((p, q) => p + q, 0);
  let r = Math.random() * t0;
  for (let i = 0; i < ps.length; i++) {
    r -= w[i];
    if (r <= 0) return ps[i];
  }
  return ps[ps.length - 1];
}
function planDuel(a, b) {
  const list = pool();
  // A pair from a link (#quiz-duel|A|B) must name two genera with game photos; anything else gets a normal duel (code re-review L2).
  if (a && b && !(a !== b && GX(a) && GX(b) && photoSet(a).shown.length && photoSet(b).shown.length)) a = b = undefined;
  let pair = a && b ? [a, b] : null;
  if (!pair) pair = duelPick(list);
  const t = pick(pair);
  // A genus not met yet gets its card with this duel (quizDuel): not with the card's own photo.
  const set = photoSet(t, introduced(t) ? null : (cover(GX(t)) || {}).f);
  return [a ? `quiz-duel|${a}|${b}` : 'quiz-duel', t, pair, `<i>${esc(pair[0])}</i> or <i>${esc(pair[1])}</i>?`, set];
}
