// IMR Reef ID: the quiz screens, split out of app.js (2026-11-02, code review L1: one file per part, one piece at a
// time). A question on screen (question, the session trail, the hint), the stage fitted to the screen (fitStage,
// fitTiles, fitLow), the answer and its feedback (answer), the one-tap question (pulse), the bonus genera offer,
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
  Pick an answer (or press 1-${cur.startsWith('quiz-duel') ? 2 : 4}). Stuck? When a question has no corallite photo in view, <b>Show the corallites</b> adds one. After answering you get the IMR ID tips and why the other ${cur.startsWith('quiz-duel') ? 'genus is' : 'choices are'} wrong; <b>Next</b> (or Enter) goes on.${cur.startsWith('quiz-duel') ? '' : ' The other choices start easy and its look-alikes come in as you get a genus right.'} Every answer counts in <a href="#progress">My progress</a>. New genera come one at a time, each on its card; <b>Open all genera</b> (My progress) opens them all at once, and if the questions then get much harder for you, a card offers once to go back to one at a time. Once you have met every genus of the slate, you can add <b>bonus genera</b>: corals off the IMR list that are common at Dauin (⚙ Settings, Bonus genera).</p>
  ${cur === CUSTOM_H ? `<p class="lede"><b>Custom quiz</b>: only the genera you picked are asked (the Custom quiz tab changes them), and the wrong choices come from them too, from other genera only when you picked fewer than 4. A genus you have not met yet comes with its card. The rest works as in the Quiz, and every answer counts the same, except the mastery exam: its questions only come in the Quiz, so a genus that reaches 95% here takes its exam there.</p>` : ''}
  <p class="lede"><b>Photos</b>: each genus starts with its best photos, preferably a colony photographed at several zoom levels (never views of different colonies mixed), and new ones keep coming in; the more you get a genus right, the harder its photos get and the more often a single view is shown alone (colony, close-up or corallites), and a mistake eases them off. A genus fills up to 95% with your right answers, each point a little harder to earn than the last, and a right answer counts most when the genus's look-alikes are among the choices; a mistake takes it back down; it is learned (100%) once you pass its mastery exam, ${EXAM.n} hard questions slipped unannounced into the Quiz: see ? on <a href="#progress">My progress</a>.</p>${
    cur.startsWith('quiz-duel')
      ? ''
      : `
  <p class="lede"><b>Typed questions</b>: once you know a genus well (from ${Math.round(100 * TYPED.from)}%), some of its questions ask you to type its name instead of picking it, more and more as it gets closer to learned: that is how you will name corals on a dive or in ReefCloud. Small typos and old names are accepted; <b>I don't know</b> shows the answer (it counts as a miss). A typed right answer counts in full, as much as a pick against its look-alikes: there is nothing to guess from.</p>`
  }`;
let EXAMQ = null; // the genus whose exam question is on screen (set by question, read by answer)
// Typed questions (model.js TYPED; Pierre, 2026-11-03): the player types the genus instead of picking one of the
// choices. The matching is core.js's (typeMatchIn: spelling tolerance, old names); the form, its messages and the
// phone keyboard's behaviour are the Lab prototype's, shared with it (proto/type.js): no suggestions while typing,
// autocorrect and capitals off, "I don't know" (a miss), a word that is no genus asks to check the spelling.
// TYPEDQ: the typed question on screen and what was typed ({t: genus asked, m: the match or null, text}), read by answer.
let TYPEDQ = null,
  TYPEN = null;
// Every name a player may type: every genus the app knows (the slate's and the extra ones) and their old names.
const typeNames = () => {
  if (!TYPEN || TYPEN.d !== DATA)
    TYPEN = {d: DATA, L: typeNamesOf([...Object.keys(DATA.gen), ...Object.keys((DATA.x || {}).gen || {})], GX)};
  return TYPEN.L;
};
const typeMatch = text => typeMatchIn(typeNames(), text);
const typeForm = () => `<form class="tyform" autocomplete="off">
    <label for="tyin">Genus</label>
    <input id="tyin" name="genus" type="text" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="done" placeholder="Type the genus">
    <div class="tybtns"><button type="submit" class="next">Check</button><button type="button" class="next sec" data-idk>I don't know</button></div>
    <p class="tymsg" aria-live="polite"></p></form>`;
// Binds a typed form: done(m, text) once answered, m the genus read ({g, old, exact}) or null for "I don't know". A
// word that is no genus (even with the tolerance), or as close to two, is no answer: the player is asked to check it.
// After the answer the field is locked; after "I don't know" it is emptied (a word rejected earlier is no answer).
function typeBind(form, done) {
  const inp = form.querySelector('input'),
    msg = form.querySelector('.tymsg');
  let over = false;
  const end = (m, text) => {
    over = true;
    msg.textContent = '';
    if (!m) inp.value = '';
    inp.disabled = true;
    form.querySelectorAll('button').forEach(b => (b.disabled = true));
    inp.blur(); // the phone's keyboard closes, so the feedback is in view
    done(m, text);
  };
  form.onsubmit = e => {
    e.preventDefault();
    if (over) return;
    const text = inp.value.trim();
    if (!text) return inp.focus();
    const m = typeMatch(text);
    if (!m) msg.textContent = `“${text}” is not a genus in the game: check the spelling.`;
    else if (m.near) msg.textContent = `Close to ${m.near.join(' and ')}: which one? Check the spelling.`;
    else return end(m, text);
    inp.focus();
  };
  form.querySelector('[data-idk]').onclick = () => !over && end(null, '');
  // A hardware keyboard types at once; on a phone the keyboard opens only on a tap (no focus without one).
  if (!matchMedia('(pointer: coarse)').matches) inp.focus({preventScroll: true});
}
// How a typed answer was read, said after it: an old name, or a spelling the tolerance accepted ('' when exact).
const typeRead = (m, text) =>
  !m || m.exact
    ? ''
    : m.old
      ? `You wrote the old name, ${esc(m.old)}, read as <i>${esc(m.g)}</i>.`
      : `You wrote “${esc(text)}”, read as <i>${esc(m.g)}</i>.`;
// Time to answer and photo enlarged (Pierre, 2026-11-02: a right answer that needed a long look or an enlarged photo says
// the photo was harder; logged with each answer to be analysed later, nothing uses them yet; sheet v23 Seconds and
// Enlarged): the clock starts when the question's first photo is in (its load event, or at once if it already was),
// starts again when a card or the offer over the question closes (quiz.js introShow, introOfferShow: reading a card is
// not looking at the photo), and stops while the app is hidden; zm is 1 once a photo of the question is enlarged.
const QCLOCK = {n: 0, t0: null, off: 0, hid: null, zm: 0};
const qclockStart = () => {
  const t = performance.now();
  Object.assign(QCLOCK, {t0: t, off: 0, hid: document.hidden ? t : null});
};
const qclockGo = () => QCLOCK.t0 === null && qclockStart();
const qclockAgain = () => QCLOCK.t0 !== null && qclockStart();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) QCLOCK.hid = performance.now();
  else if (QCLOCK.hid !== null) ((QCLOCK.off += performance.now() - QCLOCK.hid), (QCLOCK.hid = null));
});
const qclockRead = () =>
  QCLOCK.t0 === null ? null : Math.round(Math.max(0, Math.min(600, (performance.now() - QCLOCK.t0 - QCLOCK.off) / 1000)) * 10) / 10;
function question(cur, target, choices, prompt, set, kq) {
  EXAMQ = set.exam ? target : null;
  TYPEDQ = set.typed ? {t: target, m: null, text: ''} : null;
  const ph = set.shown,
    lab = VIEW_LABEL;
  let answered = false,
    hintShown = false;
  // data-f names the photo whatever its file: an iNaturalist photo not downloaded yet (r: 1, a candidate just added) keeps
  // iNaturalist's file names (app.js img()), which resized() leaves alone (the failed-photo report, tests).
  const fig = (p, k, n = ph.length) =>
    `<figure class="qph"${p.ar ? ` data-r="${p.ar}"` : ''} style="--qbg:url('${img(p, 's')}')"><button type="button" class="zoom" data-q="${k}" aria-label="Enlarge photo"><img src="${qsrc(p, n)}" data-lo="${img(p, 's')}"${p.f ? ` data-f="${esc(p.f)}"` : ''} alt="Coral to identify${p.view ? ', ' + lab[p.view].toLowerCase() + ' view' : ''}">${ZOOMI}</button>${p.view ? `<figcaption>${lab[p.view]}</figcaption>` : ''}</figure>`;
  // One screen, no scrolling: the photos fill the stage (sized to the window), choices and feedback sit beside them.
  $v.innerHTML = `${gameHelp(cur)}<div class="q bleed">
    <div class="qstage">${ph.map((p, k) => fig(p, k)).join('')}</div>
    <aside class="qside">
      <div class="qtop"><p class="prompt">${prompt}</p>${trail()}${quizNav(cur)}</div>
      ${set.typed ? `<div class="tyq">${typeForm()}</div>` : `<div class="ans"${kq ? ` data-k="${kq}"` : ''}>${choices.map((c, i) => `<button type="button" data-c="${esc(c)}"><kbd>${i + 1}</kbd>${esc(c)}</button>`).join('')}</div>`}
      ${set.hint ? '<button type="button" class="linkish" id="hintb">Show the corallites (hint)</button>' : ''}
      <div id="after"></div>
    </aside></div>`;
  bindQuizNav(cur);
  fitStage();
  const qn = (QCLOCK.n = (QCLOCK.n || 0) + 1),
    ims = [...$v.querySelectorAll('.qstage .qph img')];
  Object.assign(QCLOCK, {t0: null, off: 0, hid: null, zm: 0});
  // The first of the question's photos to be in starts it, whichever (Codex review #370: one cached or quicker than the
  // first in the page would otherwise be looked at off the clock).
  if (ims.some(im => im.complete && im.naturalWidth)) qclockGo();
  else ims.forEach(im => im.addEventListener('load', () => QCLOCK.n === qn && qclockGo(), {once: true}));
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
    if (!answered) QCLOCK.zm = 1;
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
  const go = c => {
    const cor = hintShown || ph.some(p => p.view === 'macro' || p.view === 'close'),
      tm = {rt: qclockRead(), zm: QCLOCK.zm};
    showHint();
    reveal();
    answered = true;
    answer(cur, c, target, set.hint ? [...ph, set.hint] : ph, cor, hintShown || !set.hint ? null : set.hint, tm);
    const tr = $v.querySelector('.trail');
    if (tr) tr.outerHTML = trail();
  };
  $v.querySelectorAll('[data-c]').forEach(b => (b.onclick = () => go(b.dataset.c)));
  // A typed question: the genus read is the answer ('' for "I don't know"), what was typed goes with it (TYPEDQ).
  const tf = $v.querySelector('.tyform');
  if (tf)
    typeBind(tf, (m, text) => {
      Object.assign(TYPEDQ || {}, {m, text});
      go(m ? m.g : '');
    });
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
function answer(cur, c, target, ph, cor, unseen, tm = {}) {
  // A break while the question was on screen (model.js rustNow): the next question knows it, before this answer's time;
  // a comeback question takes its genus's recall as it is now (Codex review #374).
  if (rustNow() && SHOWNQ && SHOWNQ.warm) SHOWNQ.cb = Math.round(recallAt(target) * 1000) / 1000;
  // First answer played while signed out: remember the progress as it was (ANONB), so signing in later adds only what
  // was played since, not progress an older sign-out left on the device.
  if (!SYNC && SYNC_URL && !store.get(LOG0, []).length) store.set(ANONB, P);
  // A typed question (TYPEDQ, set by question): c is the genus read from what was typed, '' for "I don't know" (a miss
  // for the genus shown only). No choices were offered, so no pair counts as offered; a genus typed by mistake counts
  // against it as a wrong pick does (Pierre's rule), and the mix-up is counted.
  const tq = TYPEDQ && TYPEDQ.t === target ? TYPEDQ : null;
  TYPEDQ = null;
  const good = c === target,
    s = st(target),
    chs = tq ? [] : [...$v.querySelectorAll('[data-c]')].map(b => b.dataset.c);
  const first = !((s.ok || 0) + (s.ko || 0)); // the genus's first answer (model.js startStep)
  // Progress (pgObs) weighed by what the answer proves: the plausible choices k and the look-alikes among the choices.
  // A typed answer: no guess rate (TYPED.k, Infinity: the expected success has no 1/k floor).
  const nc = $v.querySelectorAll('[data-c]').length || 4,
    k = tq ? TYPED.k : Math.min(nc, Number(($v.querySelector('.ans') || {dataset: {}}).dataset.k) || nc);
  // Known mix-ups (model.js confTerm): the question was that much harder for this player, on their record before this
  // answer (scored before it updates anything, offers included).
  const cf = confTerm(target, chs, k);
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
    if (c) {
      s.conf = s.conf || {};
      s.conf[c] = (s.conf[c] || 0) + 1;
    }
  }
  const th0 = ability(target),
    nw = ph.filter(p => !(s.ps || {})[p.f]).length;
  const solo = ph.length === 1 ? PICKD.SINGLE : 0; // one view alone is harder than the same photo with the others
  const ps = (s.ps = s.ps || {}),
    d0 = solo + ph.reduce((t, p) => t + photoDiff(target, p), 0) / Math.max(1, ph.length);
  // A comeback question after a break (model.js comebackOf): the recall planned for its genus (R, 1 otherwise) adjusts
  // the chance the player had, so a miss the rust explains weighs less (pgMissW), and the expectation logged and fed to
  // the opening hold is the one the question really had.
  const warm = !!(photoQuiz(cur) && SHOWNQ && SHOWNQ.warm),
    rT = warm && typeof SHOWNQ.cb === 'number' ? SHOWNQ.cb : 1,
    rC = warm && !good && GX(c) ? recallAt(c) : 1;
  // Photo memory (model.js famOf, core.js MEM, sheet v26; Pierre, 2026-11-03): the photos seen when answering (a corallites
  // hint left closed was not), as the player knew them before this answer, make the question that much easier (fam,
  // logits, 0 when all are new). One expectation for everything this answer moves: the ability (a right answer on a known
  // photo raises it less, a miss lowers it more), the global level, the logged e (the sheet's opening hold replays it),
  // the opening hold and the comeback. Progress: a right answer counts only for what memory does not explain (pgMemW, 1
  // on new photos); a miss weighs the chance the player really had (pgMissW), so on a known photo it counts in full.
  // A record from before the photo memory is recalculated first, once (core.js memRecalc; a new record is only marked).
  mxRecalc(() => {
    memRecalc(s, PMEM);
    if (!good && GX(c)) memRecalc(st(c), PMEM);
  });
  const seenPh = ph.filter(p => p !== unseen),
    fam = famOf(target, seenPh),
    dm = d0 + fam + cf;
  pgObs(target, s, good, good ? pgWeight(target, chs, k) * pgMemW(th0, d0, fam, k, rT) : pgMissW(th0, dm, k, rT, aimP()));
  abilityStep(target, s, good, dm, k);
  // Global level (core.js playerStart): the same Elo step over every answer, kept as the pseudo-genus LEVEL.
  // Made at the first answer from the player's history (levelSeed), whose counts already include this answer.
  if (P[LEVEL]) P[LEVEL][good ? 'ok' : 'ko']++;
  else P[LEVEL] = levelSeed(P);
  abilityStep(LEVEL, P[LEVEL], good, dm, k);
  // Recent results over every game, newest last: an opening only after a right answer (model.js openRight).
  P[LEVEL].h = ((P[LEVEL].h || '') + (good ? 1 : 0)).slice(-10);
  // The corallites hint is revealed after the answer when it was not opened: seen, but not recognised.
  ph.forEach(p => {
    const x = (ps[p.f] = ps[p.f] || [0, 0]);
    x[0]++;
    if (good && (cor || p.view !== 'macro')) x[1]++;
  });
  if (ph[0]) s.ro = [...(s.ro || []).filter(o => o !== (ph[0].o || ph[0].f)), ph[0].o || ph[0].f].slice(-2);
  s.h = ((s.h || '') + (good ? 1 : 0)).slice(-10); // recent results, newest last
  // Pierre's rule: a wrong answer also shows the genus given is not mastered, so it counts as a miss for it too. Without
  // the photo memory: the player's memory of a photo is of its own genus, the one shown; it says nothing of genus c.
  // In the progress, its recent results and its runs; not in its Elo ability (2026-11-03, docs/LEARNING.md "The genus
  // wrongly given in the Elo"): as in the Elo learner models of adaptive practice (Pelánek et al. 2017: a learner's
  // knowledge of an item is not updated when it is a distractor), the ability moves on the questions about the genus
  // itself. The step it had (a full miss on an average photo, its uncertainty never shrinking) made the app
  // under-rate strong players: on the real answers, a strong RA's genera averaged 0.11 against 0.73 fitted, and the
  // next answer is predicted better without it (log-loss 0.481 -> 0.465). The mix-up itself counts on the pair
  // (s.conf: traps, duels, Again).
  if (!good && GX(c)) {
    const w = st(c);
    pgObs(c, w, false, pgMissW(ability(c), d0, k, rC, aimP())); // as for the genus shown: the photo's difficulty against its level
    w.h = ((w.h || '') + '0').slice(-10);
    w.streak = 0;
  }
  if (good && cor) s.cor = 1; // milestone: right with the corallites photo in view
  if (good && (cur.startsWith('quiz-duel') || (photoQuiz(cur) && AUTOD))) s.du = 1; // won a look-alike duel, in the Duel tab or slipped into the quiz (the duel achievement)
  // Mastery exam (EXAM): count an exam question passed; any miss on the genus ends its exam, and so does giving the
  // genus as the answer for another one.
  // Never from the custom quiz, which serves no exam question (Pierre, 2026-11-03: exams only in the photo quiz).
  const exq = EXAMQ === target && cur !== CUSTOM_H;
  EXAMQ = null;
  // It needs TYPED.exam typed right answers among its EXAM.n (model.js examTyped asks them; an exam begun before the
  // typed questions may take one more, its count held at EXAM.n so its % never passes 100).
  if (!good) delete s.ex;
  else if (exq) {
    const ex = s.ex || {k: 0, v: [], ts: Date.now()}; // ts: its start, which places it among the logged answers (core.js replayedOf)
    ex.k = Math.min(EXAM.n, ex.k + 1);
    ex.t = (ex.t || 0) + (tq ? 1 : 0);
    ex.v = [...new Set([...ex.v, ph[0].view])];
    ex.at = answersSoFar();
    if (ex.k >= EXAM.n && ex.t >= TYPED.exam) {
      s.mx = Date.now(); // learned, and when (the admin's player journey; was 1 before 2026-11-02, still truthy)
      delete s.ex;
      setTimeout(
        () =>
          typeof achPop === 'function' &&
          achPop({
            tier: 3,
            icon: '🎓',
            title: `${target}: Instructor`,
            desc: `Mastery exam passed (${EXAM.n} hard questions right, ${TYPED.exam} or more typed from memory): you could teach it`
          }),
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
    // |d: a look-alike duel slipped into the photo quiz (CONTRAST), before |kN (the sheet reads |kN at the end).
    // |c: a comeback question after a break (model.js comebackOf), before |kN too; counted in the opening hold like any
    // answer, with its own expectation e. (|w, 2026-11-02 until the comeback: the gentle restart, left out of the hold by
    // the app and the sheet's hold_; old rows only.)
    // |s: the custom quiz (quizCustom), right after quiz, so the sheet stores and rates it as any photo-quiz answer
    // (guess_ reads |kN at the end and |t anywhere; its mode split keeps quiz) and the admin tells it apart.
    m:
      modeBase(cur) +
      (photoQuiz(cur) && AUTOD ? '|d' : '') +
      (warm ? '|c' : '') +
      (k < (photoQuiz(cur) ? 4 : nc) ? '|k' + k : '') +
      // |t: a typed question (TYPED), never with |kN; the sheet rates it with no guess rate (Code.gs guess_ v27). Its
      // answer a is the genus read ('' for "I don't know"), never the raw text; it offered no choices (ch empty).
      (tq ? '|t' : '') +
      (exq ? '|x' : ''),
    // A corallites hint left closed is not logged: it was not seen when answering (Codex review #339; the sheet rates and
    // counts as recognised only the photos the player saw).
    ph: ph
      .filter(p => p !== unseen)
      .map(p => p.f)
      .join(' '),
    ch: chs.join(' '),
    e: Math.round(100 * (1 / k + (1 - 1 / k) * rT * sig(th0 - dm))) / 100,
    th: th0,
    nw,
    // Seconds to answer and a photo enlarged before answering (QCLOCK, in question): logged only (sheet v23).
    ...(typeof tm.rt === 'number' ? {rt: tm.rt} : {}),
    zm: tm.zm ? 1 : 0
  };
  // The opening hold's record (model.js holdStep), every answer with the expectation it really had: the comeback's
  // questions too (Pierre, 2026-11-02: the hold gets the full information; e allows for the plausible choices k, as for
  // any question, and for the rust, so a miss the rust explains adds less).
  holdStep(ans.e, good);
  startStep(dm, k, good, first); // the first-launch question's fallback window (model.js)
  if (warm) comebackStep(rT, th0, dm, k, good);
  answeredAt(s, good);
  if (SYNC) SYNC.log = [...(SYNC.log || []), ans].slice(-2000);
  else if (SYNC_URL) {
    store.set(LOG0, [...store.get(LOG0, []), ans].slice(-2000));
    // Not signed in: the answer also goes to the sheet anonymously (Pierre, 2026-11-01), see sendAnon.
    store.set(ANONQ, [...store.get(ANONQ, []), ans].slice(-2000));
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
      V = Object.fromEntries(Object.entries(G.views).map(([v, L]) => [v, L.filter(p => gamePhotoOk(c, p))]));
    const tp = order.find(p => (V[p.view] || []).length);
    if (tp) {
      const [, cp] = photoPair([tp], V[tp.view], tp),
        st0 = $v.querySelector('.qstage'),
        lab = VIEW_LABEL[tp.view] || '';
      const fig = (p, n, cls, note) =>
        `<figure class="qph ${cls}"${p.ar ? ` data-r="${p.ar}"` : ''} style="--qbg:url('${img(p, 's')}')"><button type="button" class="zoom" data-vs="${cls}" aria-label="Enlarge ${esc(n)}"><img src="${qsrc(p, 2)}" alt="${esc(n)}, ${lab.toLowerCase()} view">${ZOOMI}</button><figcaption><span aria-hidden="true">${cls === 'qok' ? '✓' : '✗'}</span> <i>${esc(n)}</i></figcaption><small>${note}</small>${photoSrc(p)}</figure>`;
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
    // Every mix-up of the photo quiz (and of the custom quiz), a contrast question's too (CONTRAST: one queue, one gap).
    if (photoQuiz(cur)) again = rematchAdd([target, c], answersSoFar() - 1);
  }
  // A right answer gets a short celebration on the choice itself and on "✓ Yes" (app.css .cheer: a pulse and the tick
  // popping, ~400 ms, none with prefers-reduced-motion; "fewer, better pop-ups", Pierre 2026-11-02: the reward is on the
  // action, not in a pop-up). It never holds the player: Next is there and focused at once.
  $v.querySelectorAll('[data-c]').forEach(b => {
    b.disabled = true;
    if (b.dataset.c === target) b.classList.add('ok', ...(good ? ['cheer'] : []));
    else if (b.dataset.c === c) b.classList.add('ko');
  });
  // A typed answer: the field takes the right / wrong look of a choice, a quiet one after "I don't know".
  const tyIn = tq && $v.querySelector('#tyin');
  if (tyIn) tyIn.classList.add(good ? 'ok' : c ? 'ko' : 'idk');
  const idk = !!tq && !c,
    read = tq ? typeRead(tq.m, tq.text) : '';
  const g = GX(target);
  const vs =
    !good && GX(c)
      ? // The answer's own tips, said as such (an RA tester, 2026-11-02: "Why not X:" read as the reasons the photo is not X).
        `<p class="vs">Your answer, <i>${esc(c)}</i>, would show: ${gloss(tipsText(GX(c)))} <a class="linkish" href="#cmp-${esc(target)}|${esc(c)}">Compare them</a></p>${again && againTold() ? '<p class="vs again">This pair comes back as a duel in a moment.</p>' : ''}`
      : '';
  document.getElementById('after').innerHTML = `<div class="fb">
    <h3 class="${good ? 'ok cheer' : idk ? 'idk' : 'ko'}"><span class="v">${good ? '\u2713 Yes' : idk ? 'No worries' : '\u2717 No'},</span> it's <a href="#g-${esc(target)}"${sheetTab()}><i>${esc(target)}</i></a>${isBenthic(target) ? ' (fire coral, IMR benthic slate)' : g.x ? ' (bonus, not on the IMR list)' : g.n ? '' : ' (★ not surveyed)'}</h3>${read ? `<p class="vs tyread">${read}</p>` : ''}
    <div class="tipbox fbtips">${g.qt ? `<p class="label">${tipsLabel(g)}</p>` : ''}${tipsList(g, 'imrfb')}${g.mn ? `<p class="mn"><b>Mnemonic:</b> ${esc(g.mn)}</p>` : ''}</div>${vs}
    <details class="more"><summary>Coral Finder</summary>${(g.imr || []).length ? `<p class="vs">${esc(g.sum)}</p>` : ''}<ul>${g.crit.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="credit">${ph.map(credit).join('<br>')}</p></details>${repBtn({g: target, a: c, ph: ph.map(p => p.f), m: modeBase(cur)})}</div>
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
  // The out-of-game prompts take turns (promptOk), never with a card or an achievement toast, nor with the mastery toast
  // due in a moment.
  if (!(exq && s.mx) && promptOk()) {
    if (nudgeDue()) (promptMark(), signinNudge());
    else if (pulseDue()) pulseArm(nb);
  }
}
// Out-of-game prompts ("fewer, better pop-ups", Pierre 2026-11-02, after a new-player walkthrough counted an
// interruption every ~2 answers): the sign-in card (from NUDGE_AT answers, sync.js), the one-tap question (from
// PULSE.FIRST) and the offer to open all genera (from INTRO.OFFER.AT, model.js) are at least PROMPT.GAP answers apart and
// never shown with a card, the tour or an achievement toast on screen or waiting: one that falls too close waits until
// the gap is met. Counted in answers, never time. One value for all three: the answers count when the last one showed
// (this device; a count that went back, a progress reset, starts the spacing over).
const PROMPT = {KEY: 'reefid-prompt-at', GAP: 10};
// The tour, a card or an achievement toast on screen or waiting (cards wait under the tour, toasts under a card).
const overlayBusy = () => !!document.querySelector('#tour, .unlock, .achpop') || (typeof achBusy !== 'undefined' && achBusy);
const promptOk = () => {
  if (overlayBusy()) return false;
  const a = answersSoFar(),
    at = store.get(PROMPT.KEY, null);
  return typeof at !== 'number' || a < at || a - at >= PROMPT.GAP;
};
const promptMark = () => store.set(PROMPT.KEY, answersSoFar());
// One-time hint that a photo enlarges (Pierre, 2026-11-03: in the answers logged, every player but one enlarged a quiz
// photo for 0-2% of their answers, so most did not know they could; "make it clear, without nagging every time"). Over the
// first photo of a photo-quiz question, from the player's ZHINT.AT-th answer on (their 2nd question at the earliest), a
// bubble pointing at the enlarge mark (app.js ZOOMI): "Tap a photo to see it bigger" ("Click" with a mouse). Once per
// device (app.js ZHINT_KEY, set when it shows), and never once a photo has been enlarged there. Never with the tour, a
// card or an achievement toast on screen or waiting (overlayBusy, as promptOk; not its spacing: it asks nothing and goes
// by itself): it waits, looking again every ZHINT.DELAY, until they have gone while the question is still unanswered,
// else tries the next question (CI, PR #410: a duel won as the first question popped "first duel won", whose toast was
// still up when the 2nd question showed, and the hint, tried once, was skipped there). It goes at the first tap, click or
// key, or after ZHINT.MS; it lets every tap through. Nothing else changes: the question, its clock and its answer are
// untouched.
const ZHINT = {AT: 1, DELAY: 600, MS: 6000};
function zoomHint() {
  if (store.get(ZHINT_KEY, null) || answersSoFar() < ZHINT.AT) return;
  const f = $v.querySelector('.q .qstage .qph');
  if (!f) return;
  const show = () => {
    if (!f.isConnected || f.closest('.q.done') || store.get(ZHINT_KEY, null)) return;
    if (!lb.hidden || overlayBusy()) return void setTimeout(show, ZHINT.DELAY);
    store.set(ZHINT_KEY, 'seen');
    const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
    f.insertAdjacentHTML('beforeend', `<span class="zhint" role="status">${mouse ? 'Click' : 'Tap'} a photo to see it bigger</span>`);
    const h = f.querySelector('.zhint'),
      stop = new AbortController();
    const off = () => {
      if (stop.signal.aborted) return;
      stop.abort();
      h.classList.add('out');
      setTimeout(() => h.remove(), 300);
    };
    addEventListener('pointerdown', off, {capture: true, signal: stop.signal});
    addEventListener('keydown', off, {capture: true, signal: stop.signal});
    setTimeout(off, ZHINT.MS);
  };
  setTimeout(show, ZHINT.DELAY);
}
// One-tap question (Pierre, 2026-11-02: people answer a tap, not "any comments?"): now and then, between an answer and
// the next question, one question answered in one tap (or "Not now"). First after PULSE.FIRST answers in all (35 since
// 2026-11-02, was 15: the sign-in card comes at 20 and prompts are PROMPT.GAP apart), then every PULSE.EVERY answers
// (40 since 2026-11-03, was 60: a target that depends on the level needs a few answers per level band from each player;
// Pierre: "all the more important to ask from time to time"), PULSE.AFTERX times that after a "Not now", never before
// PULSE.SESSION answers of this visit; counted in answers, never time. A count that went back (a progress reset) starts
// the spacing over, as in promptOk.
// The question varies (Pierre, 2026-11-03: "ask slightly different questions about roughly the same concept"): the bank
// core.js PULSEQ (too easy or too hard, the flow channels, harder photos, fun, frustration, boredom), asked in rounds
// (pulsePick: never the same wording twice in a row; the first one ever is the plain "These questions are").
// The answer goes to the sheet as an event (ev 'pulse') with the item (src: the sheet's Where column), its code (r) and
// what the game knew then: the mode, answers this visit, right % of the last 10, overall level, genera met. Nothing in
// the game changes with it (yet): it tells Pierre whether the difficulty feels right at each level (docs/LEARNING.md
// "What the players say about the difficulty").
const PULSE = {FIRST: 35, EVERY: 40, AFTERX: 2, SESSION: 8, WAIT: 600},
  PULSEK = 'reefid-pulse';
const pulseDue = (h = hashNow()) => {
  if (!(photoQuiz(h) || h.startsWith('quiz-duel')) || document.querySelector('#tour, .unlock') || session.n < PULSE.SESSION) return false;
  const a = answersSoFar(),
    st = store.get(PULSEK, {}),
    at = typeof st.at === 'number' ? st.at : -1e9;
  return a >= PULSE.FIRST && (a < at || a - at >= PULSE.EVERY * (st.x ? PULSE.AFTERX : 1));
};
// Response rate (Pierre, 2026-11-03: how often a prompt is shown against answered): each prompt logs its showing
// (PULSE_SHOWN), then its answer's code, or PULSE_SKIP for "Not now" (or Escape), or PULSE_NONE when the page is left
// with the card up (Back, a link). A prompt left open when the app closes logs nothing more: the admin counts it from its
// showing (shown − answered − Not now). Every event of one prompt carries what the game knew when it showed (pulseOpen),
// so its showing and its answer fall in the same level band and mode. At most 2 events a prompt, every 40 answers: far
// within the sheet's caps (200 a device, 3000 in all per 6 hours).
let pulseOpen = null;
const pulseEv = r => pulseOpen && ev('pulse', {r, src: pulseOpen.id, ...pulseOpen.at});
// After an answer whose prompt is due, Next asks it before the next question is drawn (Pierre, 2026-11-03, after a long
// run: "in a flow state, used to clicking Next, I don't see them": 3 of his first 4 prompts, shown inline in the
// feedback, ended with Next and no tap). Due is checked again at the tap (a card or a toast that came meanwhile: the
// prompt waits for a later answer, nothing is marked); the tap that opens it goes no further.
function pulseArm(nb) {
  nb.onclick = () => {
    nb.onclick = null;
    if (!pulseDue() || overlayBusy()) return route();
    promptMark();
    pulseAsk();
  };
}
// The prompt is a card (cardShow, kind 'feedback'; Pierre, 2026-11-03: feedback questions interrupt at Next, a natural
// break, instead of a block in the feedback that a reflex Next skipped): "Quick question", the question, its three
// answers on one row of equal widths (app.css .pulseb), a quiet "Not now" under them. Its buttons take no tap for the
// first PULSE.WAIT ms (shown faded: the second tap of a quick double tap on Next, or a reflex one, cannot answer it), and
// Enter does nothing (the focus is on the question, not a button: Next's Enter key, pressed again, never answers);
// Escape is "Not now". The next question is drawn when it closes (its clock starts with its photo, as always, so the
// card's time is not counted). "Not now" makes the next one wait PULSE.AFTERX times longer.
function pulseAsk() {
  const pk = pulsePick(store.get(PULSEK, {})),
    it = pulseItem(pk.q),
    h = session.h;
  store.set(PULSEK, {at: answersSoFar(), q: pk.q, left: pk.left});
  pulseOpen = {
    id: it.id,
    at: {
      m: hashNow().split('|')[0],
      n: session.n,
      rr: h.length ? Math.round((100 * h.filter(Boolean).length) / h.length) : 0,
      lv: Math.round(((P[LEVEL] || {}).th || 0) * 100) / 100,
      met: slateGenera().filter(g => P[g]).length
    }
  };
  pulseEv(PULSE_SHOWN);
  const d = cardShow({
    kind: 'feedback',
    cls: 'pulsecard',
    kick: 'Quick question',
    title: esc(it.q),
    body: `<div class="pulseb" data-pq="${it.id}">${it.a
      .map(([k, t]) => `<button type="button" data-pulse="${k}" disabled>${esc(t)}</button>`)
      .join('')}</div><button type="button" class="linkish pulsex" data-pulse="" disabled>Not now</button>`,
    focus: 'h3',
    enter: () => {},
    bind: d => {
      d.querySelector('h3').tabIndex = -1;
      d.querySelectorAll('[data-pulse]').forEach(
        b =>
          (b.onclick = () => {
            if (!b.dataset.pulse) return d.close('skip');
            pulseEv(b.dataset.pulse);
            pulseOpen = null;
            d.close('answer');
          })
      );
    },
    onClose: how => {
      if (pulseOpen) {
        pulseEv(how === 'route' ? PULSE_NONE : PULSE_SKIP);
        if (how !== 'route') store.set(PULSEK, {...store.get(PULSEK, {}), x: 1});
        pulseOpen = null;
      }
      if (how !== 'route') route();
    }
  });
  setTimeout(() => d.querySelectorAll('[data-pulse]').forEach(b => (b.disabled = false)), PULSE.WAIT);
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
// A genus sheet opened from inside a game (the answer's genus name): on a computer, in a new tab,
// so the game stays where it was (an RA tester, 2026-11-02: "so that we aren't taken out of the game"); on a phone or
// tablet the same tab (new tabs there are clumsy, and Back returns to the game).
// Desktop size class with a mouse: the shared AGENTS rule 19 classes (Codex review #368), no breakpoint of its own.
const sheetTab = () => (!isStacked() && !matchMedia(MQ.touch).matches ? ' target="_blank" rel="noopener"' : '');
// One contrast queue (independent review of 2026-11-02, item 7; docs/LEARNING.md "Contrast questions"): the "Again: A or
// B?" after a mix-up and the look-alike duels slipped into the photo quiz are the same question, a 2-choice contrast of a
// look-alike pair, under one rule. A mix-up in the photo quiz puts its pair in the queue (rematch: up to CONTRAST.Q pairs,
// the oldest first, a newer mix-up never pushing out an older one; 2026-11-04, Pierre, after a player's genuine
// two-way mix-up waited behind newer ones and never came back: before, one slot, the newest replacing it; a pair
// already waiting is not queued twice, and with the queue full a new mix-up waits for its next miss); with nothing
// queued, a question becomes a duel with the chance
// CONTRAST.P (Pierre, 2026-11-02: about 1 in 10), on a pair picked as the Duel tab picks (duelPick: own mix-ups first),
// both genera met and ready, never the pair of the previous contrast question. Two contrast questions are at least
// CONTRAST.GAP questions apart, and an Again comes CONTRAST.GAP questions after its mix-up (one question in between, as
// before). It replaced AUTO_DUEL {P, FROM 20, GAP 5, AGAIN 2, SAME 20}: no first 20 answers without duels (Pierre,
// 2026-11-02: duels help learning early too), AGAIN and GAP became the one gap, SAME the previous pair.
const CONTRAST = {P: 0.1, GAP: 2, Q: 3};
let rematch = [], // the pairs queued by mix-ups, oldest first: {pair, at: answers so far when the missed question showed}
  twoAt = -Infinity, // answers so far when the last contrast question (an Again or a duel) showed
  twoPair = '', // and its pair
  AUTOD = false; // the question on screen is a duel slipped in (set by quizPhoto, read by answer)
// "This pair comes back as a duel in a moment": said the first 3 times only (RA review 2026-11-02: it came on every
// wrong answer, about 20 times in 30 questions); the pair still comes back every time.
// Queues the pair of a mix-up (CONTRAST.Q at most, a pair already waiting not twice). True when it is in the queue.
const rematchAdd = (pair, at) => {
  if (!Array.isArray(rematch)) rematch = rematch ? [rematch] : [];
  const k = pair.slice().sort().join('|');
  if (rematch.some(r => r.pair.slice().sort().join('|') === k)) return true;
  if (rematch.length >= CONTRAST.Q) return false;
  rematch = [...rematch, {pair, at}];
  return true;
};
const againTold = () => {
  const n = store.get('reefid-again-told', 0);
  if (n >= 3) return false;
  store.set('reefid-again-told', n + 1);
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
// The genera in play, and the custom quiz's selection: a change of either drops the questions planned with the old ones.
const planPool = cur => pool().join() + (cur === CUSTOM_H ? '|' + (customSel() || []).join() : '');
const planKey = (cur, i = 0) => `${cur}|${answersSoFar() + i}|${planPool(cur)}`;
const planState = () => ({last, lastQs, rematch: (Array.isArray(rematch) ? rematch : []).map(r => ({...r})), twoAt, twoPair});
function dropPlans() {
  if (NEXTQ) ({last, lastQs, rematch, twoAt, twoPair} = NEXTQ.snap);
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
  ].filter(ownPhoto); // the site's own files, on R2 or the site (an iNaturalist photo waiting to be downloaded loads when shown)
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
      // Once R2 has failed, a URL queued before is asked from the site straight away (Codex review #392).
      const u = R2 ? x.urls.shift() : photoLocal(x.urls.shift());
      i.onload = () => (pfLive--, pump());
      // A preload is no element of the page (app.js photoFail): failed on R2, it is asked from R2 once more after
      // PHOTO_RETRY ms (core.js photoRetry), then its file is asked from the site, and so are the next photos.
      i.onerror = () => {
        pfLive--;
        if (photoLocal(u) !== u) {
          x.r2try = x.r2try || new Set();
          if (!x.r2try.has(u)) {
            x.r2try.add(u);
            return setTimeout(() => (x.urls.unshift(u), PF.includes(x) || PF.push(x), pump()), PHOTO_RETRY);
          }
          R2 = false;
          x.urls.unshift(photoLocal(u));
        }
        pump();
      };
      i.decoding = 'async';
      i.src = u;
      x.held.push(i);
    }
  if (!pfLive && !PF.length) pfWait.splice(0).forEach(ok => ok());
};
const prefetched = () => new Promise(ok => (pfWait.push(ok), pump()));
// Tops the queue up to AHEAD (questions after the one on screen if it is not answered yet). Not while the cards of
// the genera met are open: they are recorded as they show, and a plan made meanwhile would deal them again.
function planNext(cur) {
  if ((!photoQuiz(cur) && cur !== 'quiz-duel') || document.querySelector('.unlock.intro')) return;
  // The custom quiz needs its selection (a link to it without one opens the selection screen).
  if (cur === CUSTOM_H && !customSel()) return;
  const o = $v.querySelector('.q:not(.done)') ? 1 : 0;
  // A question on screen that changes what comes next (an exam question, a duel slipped in, an "Again", cards) is answered
  // before anything is planned past it: its answer moves the exam's spacing and the photos seen (Codex review #361).
  if (o && photoQuiz(cur) && SHOWNQ && !plain(SHOWNQ)) return;
  const pk = planPool(cur),
    key = i => `${cur}|${answersSoFar() + o + i}|${pk}`;
  if (NEXTQ && NEXTQ.k !== key(0)) dropPlans();
  let n = 0,
    end = null;
  for (let x = NEXTQ; x; x = x.next) (n++, (end = x));
  while (n < (photoQuiz(cur) ? AHEAD : 1) && !(end && end.stop)) {
    const snap = planState(),
      // planPhoto gets the answers count at which the question will show (its place in the queue): the contrast
      // questions' spacing is counted on it.
      args = photoQuiz(cur) ? planPhoto(cur, answersSoFar() + o + n) : planDuel(),
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
function quizPhoto(cur = 'quiz') {
  // The first-launch question first (model.js startOf): a player with no answer to it (tour skipped, or an existing
  // player) is asked on a card before the next quiz question; from CHOICE.ASK answers on it is inferred, silently.
  if (cur === 'quiz' && startGate()) return startAskShow(cur);
  let q = takePlan(cur) || planPhoto(cur);
  // A planned card waits while the player falls behind (introHold, Codex review #362: a right answer that starts the
  // hold leaves the questions planned before it), and during the floor of a visit or a comeback (noOpen); a question
  // planned before a break, or a comeback question planned before the rust melted, is chosen again too (rustNow: the app
  // may have stayed open across the break). The custom quiz's cards are the player's choice: they never wait.
  // A new break since they were planned: every planned question goes, comeback ones too (their recall is old).
  // A card of the path planned before a miss is chosen again too (model.js openRight: an opening only after a right
  // answer; a miss drops the questions planned already, this is the check when one shows).
  const brk = rustNow();
  if (brk || (q.intro && !q.custom && (noOpen() || (!q.start && (introHold() || !openRight())))) || !!q.warm !== cbIn(cur)) {
    dropPlans();
    q = planPhoto(cur);
  }
  SHOWNQ = q;
  AUTOD = !!q.auto;
  question(...q);
  // A custom-quiz card: the genus is asked with it (ready at once, a card of its own, no Open all offer on it).
  if (q.intro) q.custom ? introShow(q.intro, true, 'c', false) : introShow(q.intro, q.start);
  // The offers about which genera are in play (open all, back to one at a time, bonus genera) belong to the photo quiz.
  else if (cur !== 'quiz') {
  } else if (!noOpen() && promptOk() && startDue())
    (promptMark(), startFbShow(startDue())); // the first answers do not fit the first-launch answer (model.js startDue)
  else if (!noOpen() && promptOk() && introOffer())
    (promptMark(), introOfferShow()); // never over another card: next question
  else if (!noOpen() && promptOk() && backDue()) (promptMark(), backShow());
  else if (!noOpen() && promptOk() && bonusOfferDue()) (promptMark(), bonusOfferShow());
  zoomHint(); // once per device, never over a card or offer shown just above
  topUp(); // the questions after this one, chosen while it is played (planNext)
}
// The first-launch question's cards (Pierre, 2026-11-03; core.js CHOICE, model.js startSet): the question, the Coral
// basics offer and the fallback card, through app.js cardShow like every card.
// Asked on a card when the quiz opens (the tour asks it as its first step): no answer yet, fewer than CHOICE.ASK answers.
// From CHOICE.ASK answers on (an existing player, Pierre 2026-11-03), the choice is inferred from the global level
// (core.js startInfer) and recorded as "inferred", never asked.
const startGate = () => {
  if (startOf()) return false;
  if (answersSoFar() >= CHOICE.ASK) return (startSet(startInfer(P), 'inferred'), false);
  return true;
};
// Forced: the three answers and nothing else (Escape goes back to Home; the quiz asks again next time). Another device's
// answer arriving meanwhile (sync, model.js startMerge) closes it and the quiz goes on.
function startAskShow(cur) {
  if (document.querySelector('.unlock.startq')) return;
  $v.innerHTML = '';
  const d = cardShow({
    kind: 'feature',
    cls: 'startq',
    kick: 'Before you start',
    title: 'How well do you know corals?',
    label: 'How well do you know corals?',
    body: `<p>Your answer sets where the game starts; from there it follows your answers.</p>${startOptsHtml(null)}`,
    esc: () => go(''),
    bind: d =>
      d.querySelectorAll('[data-start]').forEach(
        b =>
          (b.onclick = () => {
            startSet(b.dataset.start, 'card');
            d.close('pick');
            startBasicsOffer(cur) || quizPhoto(cur);
          })
      )
  });
  d.ulDone = () => (d.close('sync'), quizPhoto(cur));
}
// "I'm new to corals" (CHOICE v.basics): Coral basics offered first, about 5 minutes, then the quiz. Only while the module
// is not done (app.js basicsDone). Returns whether it showed.
function startBasicsOffer(cur) {
  if (!startV().basics || basicsDone()) return false;
  cardShow({
    kind: 'tip',
    cls: 'startq basicsq',
    kick: 'New to corals',
    title: 'Start with Coral basics?',
    body: '<p>Seven short steps on real photos, about 5 minutes: a polyp, a corallite, septa and walls, the words the ID tips use. Then the quiz.</p>',
    primary: {text: 'Coral basics (5 min)', attr: 'data-basics', on: () => go('basics')},
    secondary: {text: 'Start the quiz', on: () => quizPhoto(cur)},
    esc: 2, // Escape: the quiz
    note: 'Learn › Coral basics, any time.'
  });
  return true;
}
// The fallback card (model.js startDue), once per direction, over a new question: 'lo' the first answers fall clearly
// below what the choice predicts (Coral basics, or a lower choice), 'hi' clearly above it (a higher choice). Picking a
// choice re-initialises its variables (startSet); the answers are kept.
function startFbShow(dir) {
  const o = startOf(),
    next = startNext(o.c, dir),
    said = `said “${esc(startOpt(o.c)[1])}”`,
    bas = dir === 'lo' && !basicsDone();
  startShown(dir);
  const d = cardShow({
    kind: 'tip',
    cls: 'startfb',
    kick: `${(o.w || []).length} answers in`,
    title: dir === 'lo' ? (next.length ? 'Harder than expected?' : 'Corals are new to you?') : 'You know more than you said',
    label: 'Your start',
    body:
      (dir === 'lo'
        ? next.length
          ? `<p>Your answers are below what the game expects from someone who ${said}. Start more gently? Your answers are kept.</p>`
          : '<p>Coral basics shows, on real photos, the words the ID tips use: about 5 minutes.</p>'
        : `<p>Your answers beat what the game expects from someone who ${said}. Move faster? Your answers are kept.</p>`) +
      (next.length ? startOptsHtml(null, next) : '') +
      (bas && next.length ? '<p class="ulnote"><a class="linkish" href="#basics">New to corals? Coral basics, 5 min ›</a></p>' : ''),
    primary: bas && !next.length ? {text: 'Coral basics (5 min)', attr: 'data-basics', on: () => go('basics')} : null,
    secondary: {text: next.length ? 'Keep my answer' : 'Keep playing', attr: 'data-keep'},
    onClose: () => topUp(),
    bind: d =>
      d.querySelectorAll('[data-start]').forEach(
        b =>
          (b.onclick = () => {
            startSet(b.dataset.start, 'fallback');
            d.close('pick');
          })
      )
  });
  d.dataset.dir = dir;
}
// The offer to open all genera (model.js introOffer), over the question, once: Open all genera, or Not now (Escape).
// Leaving the page closes it unanswered (route): the offer can come back.
function introOfferShow() {
  const a = answersSoFar(),
    pick = open => {
      store.set(INTRO.OFFER.KEY, {at: a, open: 0, t: Date.now()});
      if (open) {
        introAll('offer');
        NEXTQ = null;
      }
      save();
    };
  cardShow({
    kind: 'tip',
    cls: 'intro',
    kick: `${a} answers in`,
    title: 'You seem to know your corals already',
    body: `<p>Open all ${slateGenera().length} genera at once, instead of one at a time? ${introLeft().length} are still to come.</p>`,
    primary: {text: 'Open all genera', attr: 'data-open', on: () => pick(true)},
    secondary: {text: 'Not now', on: () => pick(false)},
    esc: 2,
    note: 'Also in My progress, any time.',
    onClose: topUp
  });
}
// Back to one at a time (model.js backDue, introBack), over the question, once: after Open all genera, when the answers
// since have fallen clearly below what the game expected. "One at a time" closes the genera opened at once; the question
// on screen is chosen again (it may be about one of them, or offer one as a choice). Escape: Keep them all. Leaving the
// page closes it unanswered (route): the card can come back.
function backShow() {
  const pick = keep => {
    const L = introBack(keep);
    save();
    if (L.length) {
      dropPlans();
      NEXTQ = null;
      quizPhoto();
    }
  };
  cardShow({
    kind: 'tip',
    cls: 'intro',
    kick: 'Lots of new genera at once',
    title: 'Keep them all, or go back to one at a time?',
    body: `<p>Since you opened all genera, the questions have been harder for you. With one at a time, the ${backOpen().length} genera opened at once go back in the queue and come back one by one, each on its card. Your answers are kept.</p>`,
    primary: {text: 'One at a time', attr: 'data-back', on: () => pick(false)},
    secondary: {text: 'Keep them all', attr: 'data-keep', on: () => pick(true)},
    esc: 2,
    note: 'My progress can open them all again, any time.',
    onClose: topUp
  });
}
// The bonus genera (app.js BONUS), offered once (Pierre, 2026-11-02): when every slate genus has been met (introduced:
// its card shown or asked) and the player has not chosen yet (Q.bon undefined). "Add them": they join the genera not
// met yet and open one at a time like the others; "Not now": never offered again, ⚙ Bonus genera turns them on any time.
// A prompt like the others (promptOk: never with a card, the tour or an achievement, PROMPT.GAP answers apart).
// Every slate genus asked at least once, not just met (Pierre, 2026-11-02: an RA who taps Open all genera would otherwise get the offer a
// question later, before having seen the IMR genera in the quiz; an RA tester: "after all IMR ones have been introduced/reviewed").
// A genus closed again by "One at a time" (model.js introBack) waits for its card first.
// The card shows their own photos as a row of round crops (each genus's cover, a plain disc when it has none or it fails).
const bonusOfferDue = () => Q.bon === undefined && BONUS.some(n => GX(n)) && slateGenera().every(n => asked(n) && introduced(n));
function bonusOfferShow() {
  const L = BONUS.filter(x => GX(x));
  cardShow({
    kind: 'bonus',
    cls: 'intro',
    kick: 'Every genus of the slate met',
    title: `${L.length} more genera?`,
    body: `<p>Not on the IMR coral list, but common at Dauin: you may meet them on dives and in ReefCloud photos.</p>${bonusThumbs(L)}
    <p class="ulnote">${L.map(x => `<i>${esc(x)}</i>`).join(', ')}</p>`,
    primary: {text: 'Add them', attr: 'data-bonus', on: () => bonusSet(true)},
    secondary: {text: 'Not now', on: () => bonusSet(false)},
    esc: 2,
    note: "⚙ Settings, Bonus genera, any time. They don't count in your progress.",
    onClose: topUp // leaving the page closes it unanswered (route): the offer comes back
  });
}
const bonusThumbs = L =>
  `<div class="ulthumbs">${L.map(n => {
    const p = cover(GX(n));
    return p ? `<img src="${img(p, 's')}" alt="">` : '<span></span>';
  }).join('')}</div>`;
// The cards of the genera met now (INTRO in model.js), one after the other over the question: the first INTRO.START
// together ("1 of 4", the first questions are about them), later ones alone (asked a few questions later). Recorded
// when shown, so a planned question never played leaves no genus met without its card.
function introShow(L, start, kind = start ? 's' : 'c', offerAll = start) {
  document.querySelectorAll('.unlock.intro').forEach(x => (x.ulClose ? x.ulClose() : x.remove())); // with its keys
  let i = 0,
    told = false; // "tap an underlined word" said (once, on the first card whose tips have one)
  const card = () => {
    const n = L[i],
      more = i < L.length - 1;
    // Met when its card is shown (Codex review #350): a sequence left half-way (reload) shows the rest next time.
    introAdd([n], start, kind);
    const c = introCard(n, {
      pos: L.length > 1 ? `${i + 1} of ${L.length}` : '',
      hint: start && !told,
      note: start
        ? more
          ? `The first questions are about these ${L.length} genera.`
          : 'Now, which is which?'
        : 'It comes up in the questions a little later.',
      btn: more ? 'Next' : start ? 'Start' : 'Got it',
      all: offerAll && introLeft().length > 0
    });
    if (c.hinted) told = true;
    c.primary = {...c.primary, stay: true, on: next};
    return c;
  };
  const next = () => (++i < L.length ? d.set(card()) : d.close(1));
  // Enter outside a button, Escape and a tap outside move on (the first cards are not skipped: each is met when shown).
  const on = () => (start ? next() : d.close('esc'));
  const d = cardShow({
    ...card(),
    esc: on,
    enter: on,
    tap: on,
    // Open all genera (model.js introAll) from the first cards.
    bind: d =>
      d.querySelector('[data-all]') &&
      (d.querySelector('[data-all]').onclick = () => {
        introAll('card');
        NEXTQ = null;
        save();
        d.close('all');
      }),
    onClose: topUp // leaving the page closes it (route); the genera of the cards not shown yet come next time
  });
}
// One genus's first-meeting card (introShow; the Lab's cards page shows one with nothing recorded): its photo as a band,
// the plain sentence, the ID tips. o: pos ("1 of 4"), note, btn, all (the Open all genera box), hint (the glossary hint,
// said when the tips hold a term: hinted).
function introCard(n, o = {}) {
  const g = GX(n),
    p = cover(g),
    star = typeof starNote === 'function' && DATA.gen[n] ? starNote(n) : '',
    tips = tipsList(g),
    hinted = !!o.hint && tips.includes('data-gt');
  return {
    kind: 'genus',
    cls: 'intro',
    photo: p ? img(p, 's') : '',
    kick: `${isBonus(n) ? 'Bonus genus' : 'New genus'}${o.pos ? ` · ${o.pos}` : ''}`,
    title: `<i>${esc(n)}</i>`,
    body: `${plainLine(g)}
      ${star ? `<p class="ulnote">${star}: on the slate so you learn to tell them apart.</p>` : ''}
      ${isBenthic(n) ? `<p class="warn">${BENTHIC_NOTE}</p>` : isBonus(n) ? '<p class="ulnote">Not on the IMR list, but common at Dauin.</p>' : ''}
      <div class="ultips"><p class="label">${tipsLabel(g)}</p>${tips}${hinted ? '<p class="gthint">Tap an underlined word to see what it means.</p>' : ''}</div>
      ${o.note ? `<p class="ulnote">${o.note}</p>` : ''}`,
    primary: {text: o.btn || 'Got it'},
    after: o.all
      ? `<div class="ulall"><p><b>Had the IMR coral lecture?</b> Skip the cards and play with all ${slateGenera().length} genera.</p><button class="next sec" type="button" data-all>Open all genera</button></div>`
      : '',
    hinted
  };
}
// Cards due with the next question (INTRO): the first ones while fewer than INTRO.START slate genera are met (picked by
// the progressive path's draw, easiest first), else none: planPhoto may add one when its draw falls on a genus not met.
// The cards drawn before count as met: a ★ genus may follow its reference's card, shown before it (model.js openPick).
function introStart(list) {
  const slate = list.filter(n => !isBonus(n)),
    want = INTRO.START - slate.filter(introduced).length,
    L = [],
    met = n => introduced(n) || L.includes(n);
  for (let fresh = slate.filter(n => !introduced(n)); L.length < want && fresh.length; fresh = fresh.filter(n => n !== L[L.length - 1]))
    L.push(openPick(fresh, fresh, met));
  return L;
}
// cur: 'quiz', or the custom quiz (CUSTOM_H): its genus asked and its choices come from the player's selection (model.js
// customOf, customDraw, customChoices), with no opening path; everything else is the photo quiz's.
// at: the answers count at which the question will show (planNext plans up to AHEAD questions ahead).
function planPhoto(cur = 'quiz', at = answersSoFar()) {
  const play = pool(),
    sel = cur === CUSTOM_H ? customSel() : null,
    list = sel || play;
  // The count went back (progress reset): the contrast spacing starts over.
  if (at < twoAt) twoAt = -Infinity;
  if (!Array.isArray(rematch)) rematch = rematch ? [rematch] : [];
  rematch = rematch.filter(r => r.at <= at);
  // Easier questions while the opening hold is on (model.js holdEase): the photos and the format aim lower.
  const ease = holdEase();
  // A contrast question (CONTRAST): the oldest pair a mix-up queued, CONTRAST.GAP questions after it and after the last one.
  const gap = at - twoAt >= CONTRAST.GAP;
  if (rematch.length && gap && at - rematch[0].at >= CONTRAST.GAP) {
    const pair = rematch[0].pair,
      // The custom quiz asks only its own genera; and never a genus not met yet (2026-11-04: a genus never met, offered
      // to make up the choices and picked, was asked by its Again with no card, a genus opened by the side door).
      ask = (sel ? pair.filter(n => sel.includes(n)) : pair).filter(n => introReady(n) || (sel && sel.includes(n)));
    rematch = rematch.slice(1);
    // Never on a genus closed again by "One at a time" (model.js introBack): it waits for its card.
    if (ask.length && pair.every(n => play.includes(n) && !closed(n))) {
      twoAt = at;
      twoPair = pair.slice().sort().join('|');
      const t = pick(ask);
      // During a comeback an Again still follows a miss (it corrects it), as a comeback question (Codex review #364).
      rustNow();
      const R = cbIn(cur) ? recallAt(t) : 1;
      return Object.assign(
        [
          cur,
          t,
          shuffle(pair.slice()),
          `Again: <i>${esc(pair[0])}</i> or <i>${esc(pair[1])}</i>?`,
          photoSet(t, null, Math.log(R) + ease, 2)
        ],
        {again: 1, ...(sel ? {custom: 1} : {}), ...(cbIn(cur) ? {warm: 1, cb: Math.round(R * 1000) / 1000} : {})}
      );
    }
  }
  // The genus asked is one already met (INTRO): ready, or one of the cards shown with this question when they are the
  // first ones. A draw that falls on a genus not met yet (the progressive path opening one, at most one card every
  // INTRO.EVERY answers) shows its card instead, and the question is about another genus.
  // After a break (model.js, "Comeback after a break"): the time since the last answer may start a new visit (no genus
  // opens in its first answers) or a comeback (questions on genera answered right, the surest first, then the most
  // rusted, the usual choices, photos at the rusty level: no card, no duel, no exam), which the answers end.
  // The custom quiz has no first cards and no opening path: its genus is drawn among the whole selection, and one not met
  // yet is asked with its card (ready at once, as the Duel tab does). During a comeback it asks the comeback's genera of
  // its selection (cbIn: at least 2 of them answered right; else it asks as usual and leaves the comeback to the quiz).
  rustNow();
  // The genera of the questions on screen or planned before this one: asked by the time this one shows (model.js openPace).
  const soon = [
    SHOWNQ,
    ...(function* () {
      for (let x = NEXTQ; x; x = x.next) yield x.args;
    })()
  ]
    .filter(Boolean)
    .map(q => q[1]);
  let cards = sel || noOpen() ? [] : introStart(list);
  const start = cards.length > 0,
    ready = n => cards.includes(n) || introReady(n),
    known = n => cards.includes(n) || introduced(n),
    met = list.filter(ready),
    warmL = start || !cbIn(cur) ? null : comebackOf(met),
    warm = !!warmL,
    // One opening rule (model.js OPEN, openChance): when the path allows a card, this question opens a genus with the
    // chance of the free places for shaky genera, the genus drawn easiest and most common first (openPick).
    fresh =
      !sel &&
      !start &&
      !warm &&
      met.length &&
      !noOpen() &&
      introSince() >= INTRO.EVERY &&
      !introHold() &&
      openPace(at, soon) &&
      openRight(at)
        ? list.filter(n => !introduced(n))
        : [];
  if (fresh.length && Math.random() < openChance(list)) cards = [openPick(fresh, list)];
  // With the first cards, the question is about one of them (never a bonus genus unlocked earlier, say); with a card of
  // its own, about a genus already met. The custom quiz: any genus of its selection, one not met with its card.
  // A genus opened on a card in the last OPEN.WIN answers and not asked yet is asked as soon as it is ready (model.js
  // openPace holds the next card until it is): its card's question comes right after its INTRO.GAP, and the opening's
  // pace is the ceiling's, not the luck of the draw among every genus met.
  const due = start || warm ? [] : openRecent(at).filter(n => !asked(n) && !soon.includes(n) && introReady(n) && list.includes(n));
  const t = sel
    ? nextTarget(warm ? warmL : sel, customDraw)
    : nextTarget(start ? cards : warm ? warmL : due.length ? due : met.length ? met : list);
  if (sel && !introduced(t)) cards = [t];
  // A look-alike duel slipped into the photo quiz (Pierre, 2026-11-02, "a little duel back in the quiz, automatically";
  // the Duel tab had 13 answers in all): the contrast queue's (CONTRAST, above) when no mix-up is queued. Not when the
  // path opens a genus (a card) this question: opening comes first (Pierre, 2026-11-02); not in a comeback. Logged
  // "quiz|d|k2" (counted apart).
  if (!cards.length && !warm && !rematch.length && gap && Math.random() < CONTRAST.P) {
    const key = p => p.slice().sort().join('|'),
      pair = duelPick(list, p => p.every(introReady) && key(p) !== twoPair);
    if (pair) {
      twoAt = at;
      twoPair = key(pair);
      const t = pick(pair);
      last = t; // the genus asked is the duel's, not the one drawn above for the card decision
      lastQs = [...lastQs.slice(0, -1), t];
      return Object.assign(
        [cur, t, shuffle(pair.slice()), `Look-alikes: <i>${esc(pair[0])}</i> or <i>${esc(pair[1])}</i>?`, photoSet(t, null, ease, 2)],
        {auto: twoPair, ...(sel ? {custom: 1} : {})}
      );
    }
  }
  // No mastery exam question in the custom quiz (rule 14e, Codex review #411): its choices come from the selection,
  // which may hold none of the genus's look-alikes, so passing there would not prove it; the exam comes in the photo quiz.
  const R = warm ? recallAt(t) : 1,
    ex = !sel && !warm && examReady(t) && examSet(t),
    // A comeback question keeps the player's usual choices (Pierre, 2026-11-03): look-alikes for a strong player, so a
    // right answer proves something and the rust melts in a few questions.
    traps = ex ? 3 : trapsFor(t, ease),
    // A genus met on a card of its own now is not among this question's choices either: its card says it comes up a
    // little later (beginner review 2026-11-03: its name was a choice on the question behind the card). The custom
    // quiz: from its selection first, topped up from the other genera in play under 4 (customChoices); its card's genus
    // is the one asked.
    ch = shuffle([
      t,
      ...(sel
        ? customChoices(t, sel, play, traps, known)
        : distractors(t, start ? list : list.filter(n => !cards.includes(n)), traps, known))
    ]),
    // Typed (model.js TYPED): with the genus's typed share, from its progress (never on a genus under TYPED.from: no
    // draw is spent there, so a beginner's questions are unchanged); an exam question as examTyped says. Never a
    // comeback question (the player's usual choices, Pierre 2026-11-03), an Again or a duel (2 choices by design).
    typed = !warm && (ex ? examTyped(t) : typedP(t) > 0 && Math.random() < typedP(t)),
    // The difficulty controller (model.js PICKD.P, aimOff): the photo is aimed for the game's target in this format, its
    // guess rate from the plausible choices (a typed answer has none).
    // Scored with the choices really shown: the photo quiz shows the traps its level asks for (from 2, every choice
    // counts); the custom quiz's selection may not hold them, so there the look-alikes among the choices decide
    // (Codex review #411: 4 unrelated genera picked were scored as a 4-choice question with traps).
    few = sel ? ch.filter(n => n !== t && confusable(t, n)).length < 2 : traps < 2,
    kq = typed ? TYPED.k : few ? plausibleK(t, ch) : ch.length,
    // Aimed lower by the hold's ease and by this player's own mix-ups among the choices (model.js confTerm; none typed).
    cf = typed ? 0 : confTerm(t, ch, kq),
    set = ex || photoSet(t, cards.includes(t) ? (cover(GX(t)) || {}).f : null, Math.log(R) + ease - cf, kq),
    // The question asked with its genus's card never shows the card's own photo again (new-player walkthrough 2026-11-02).
    q = [cur, t, ch, typed ? 'Which genus? Type it' : 'Which genus?', typed ? {...set, typed: 1} : set, few ? plausibleK(t, ch) : 0];
  if (cards.length) Object.assign(q, {intro: cards, start});
  if (typed) q.typed = 1;
  if (warm) Object.assign(q, {warm: 1, cb: Math.round(R * 1000) / 1000});
  if (sel) q.custom = 1;
  return q;
}
function quizDuel(a, b) {
  const q = (!a && !b && takePlan('quiz-duel')) || planDuel(a, b);
  question(...q);
  // Both genera are named on the buttons: the cards of those not met yet come together, and either can be the answer;
  // a ★ genus's card after the card of the genus it is compared to (core.js starRefs).
  const L = q[2].filter(n => !introduced(n)).sort((a, b) => starRefs(DATA, a).length - starRefs(DATA, b).length);
  if (L.length) introShow(L, true, 'c');
}
// A look-alike pair for a duel (the Duel tab, and the duels slipped into the photo quiz): among the pairs whose two
// genera are in the list and pass keep. Null when none.
function duelPick(list, keep = () => true) {
  // Millepora and the bonus genera duel with the slate look-alike the Coral Finder names (when they are in the list); the
  // look-alikes from the data (model.js dataLooks) duel like the declared ones.
  const ps = [
    ...pairs(),
    ...dataLooks(list),
    ...[...BENTHIC, ...BONUS]
      .filter(b => GX(b))
      .flatMap(b =>
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
  const set = photoSet(t, introduced(t) ? null : (cover(GX(t)) || {}).f, 0, 2);
  return [a ? `quiz-duel|${a}|${b}` : 'quiz-duel', t, pair, `<i>${esc(pair[0])}</i> or <i>${esc(pair[1])}</i>?`, set];
}
// Custom quiz (Pierre, 2026-11-03): the photo quiz on the genera the player picks. #quiz-custom is the selection screen,
// #quiz-custom|play (CUSTOM_H) the quiz itself, every format of the photo quiz in it (typed questions, Again, duels
// slipped in, traps, the photos' level, the comeback; not the mastery exam, left to the photo quiz); the draw is model.js's (CUSTOM, customOf, customDraw,
// customChoices; docs/LEARNING.md "Custom quiz"). The selection is saved at each change ({g: genera, t: when}, an
// reefid-sync key: it travels with the progress, the latest wins between devices, sync.js mergeSaved) and preselected
// next time. Its answers count as any photo-quiz answer, logged quiz|s… (answer).
const CUSTOM_H = 'quiz-custom|play';
const photoQuiz = cur => cur === 'quiz' || cur === CUSTOM_H;
const modeBase = cur => (cur === CUSTOM_H ? 'quiz|s' : cur);
const customSaved = () => {
  const o = store.get(CUSTOM.KEY, null);
  return o && Array.isArray(o.g) ? o.g : [];
};
const customSel = () => customOf(customSaved(), pool());
// A comeback runs in this game: always in the photo quiz while there is rust (CB.r); in the custom quiz only when at
// least 2 of its genera were answered right (model.js comebackOf), else it plays as usual and leaves the comeback alone.
const cbIn = cur => CB.r > 0 && (cur !== CUSTOM_H || (customSel() || []).filter(n => introReady(n) && (P[n] || {}).ok > 0).length >= 2);
function quizCustom(h) {
  if (h === CUSTOM_H) return customSel() ? quizPhoto(CUSTOM_H) : location.replace('#quiz-custom');
  viewCustom();
}
// The selection screen (Pierre, 2026-11-03). Every genus is in view, as a small photo with its name, tapped to pick it
// (aria-pressed), in one of three views (a switch, remembered on this device):
// - IMR groups, the default ("nobody picks genera alphabetically": the lecture's groups, its genera in the IMR order; ★
//   genera in the group of their look-alikes, Millepora and the bonus genera apart);
// - My mix-ups ("you know you make mistakes around these kinds of genera, so you go there"): clusters of the genera the
//   player confuses, from their own record, most confused first, each with its mix-up count (model.js mixEdges,
//   mixClusters); with no mix-up yet, the declared look-alike sets, the pairs players confuse most first (lookEdges), and
//   a line says so;
// - Progress: To review, Learning, Not seen yet, Learned (shownLevel, as My progress names them).
// Never grouped by growth form (not genus-specific; AGENTS.md rule 4), no A-Z view (the search finds a name; until
// 2026-11-03 A-Z was the default: a device that kept it opens on IMR groups once, the choice now under a new key).
// All / None per group. Quick picks that need no knowledge replace the selection: My weakest (genera answered, lowest
// progress first), Recently missed (a miss in their last 5 answers, latest first), Look-alikes of … (a genus and its
// look-alikes: declared or confused, model.js isLook, confusable). Clear all, the count and Start (at least CUSTOM.MIN
// genera) stay in view at the bottom.
const CQ = {VIEW: 'reefid-custom-view2', OLD: 'reefid-custom-view', WEAK: 6, MISS: 8, VIEWS: ['imr', 'mix', 'prog']};
const cqPicks = play => {
  const done = n => !!(P[n] || {}).mx;
  return {
    weak: play
      .filter(n => asked(n) && !done(n))
      .sort((a, b) => genScore(a) - genScore(b) || ability(a) - ability(b))
      .slice(0, CQ.WEAK),
    miss: play
      .filter(n => /0/.test(((P[n] || {}).h || '').slice(-5)))
      .sort((a, b) => ((P[b] || {}).at || 0) - ((P[a] || {}).at || 0))
      .slice(0, CQ.MISS)
  };
};
const cqLooks = (x, play) => [x, ...play.filter(n => n !== x && (isLook(x, n) || confusable(x, n)))];
// The groups of a view: [{k, t: title (HTML), sub, mark (HTML), L: genera}], and a note above them ('' for none).
function cqGroups(view, play) {
  const mk = (m, h) => `<span class="gn" style="--g:${h}" aria-hidden="true">${esc(String(m))}</span>`,
    names = L => L.map(n => `<i>${esc(n)}</i>`).join(' · ');
  if (view === 'mix') {
    const own = mixClusters(mixEdges(play)),
      C = own.length ? own : mixClusters(lookEdges(play)),
      ord = L => play.filter(n => L.includes(n));
    return {
      note: own.length
        ? ''
        : 'No mix-ups of yours yet: here are the look-alikes of the IMR lecture and the Coral Finder, those players confuse most first. Your own mix-ups take their place as you play.',
      G: C.map((c, i) => ({
        k: 'm' + i,
        t: names(ord(c.g)),
        sub: own.length ? `${c.w} mix-up${c.w === 1 ? '' : 's'}` : 'Look-alikes',
        mark: '',
        L: ord(c.g)
      }))
    };
  }
  if (view === 'prog') {
    const LV = [
      ['weak', 'To review'],
      ['mid', 'Learning'],
      ['new', 'Not seen yet'],
      ['ok', 'Learned']
    ];
    return {
      note: '',
      G: LV.map(([k, t]) => ({k, t: esc(t), sub: '', mark: '', L: play.filter(n => shownLevel(n)[0] === k)})).filter(g => g.L.length)
    };
  }
  const gk = n => (isBonus(n) ? '+' : isBenthic(n) ? 'F' : shownGroup(n) || '★'),
    ord = k => (typeof k === 'number' ? k : {'★': 100, F: 101, '+': 102}[k]);
  return {
    note: '',
    G: [...new Set(play.map(gk))]
      .sort((a, b) => ord(a) - ord(b))
      .map(k => {
        const gr = DATA.imrg.find(x => x.n === k),
          L = play.filter(n => gk(n) === k);
        return gr
          ? {k, t: esc(gr.t), sub: 'IMR lecture group ' + gr.n, mark: mk(gr.n, groupHue(gr.n)), L}
          : k === 'F'
            ? {k, t: 'Fire coral', sub: 'IMR benthic slate, not a hard coral', mark: mk('F', 200), L}
            : k === '+'
              ? {k, t: 'Bonus genera', sub: 'Not on the IMR list', mark: mk('+', 200), L}
              : {k, t: 'Not covered in the lecture', sub: '', mark: mk('★', 200), L};
      })
  };
}
function viewCustom() {
  const play = pool(),
    on = new Set(customSaved().filter(n => play.includes(n))),
    qp = cqPicks(play),
    lk = play.filter(n => cqLooks(n, play).length > 1);
  try {
    localStorage.removeItem(CQ.OLD); // the A-Z / IMR groups choice of before 2026-11-03: IMR groups once
  } catch (e) {}
  let view = store.get(CQ.VIEW, 'imr'),
    q = '';
  if (!CQ.VIEWS.includes(view)) view = 'imr';
  const tile = n => {
    const p = cover(GX(n));
    return `<button type="button" class="cqtile" data-g="${esc(n)}" aria-pressed="${on.has(n)}">${p ? `<img ${thumb(p, '(max-width:599.98px) 90px, 120px')} alt="" loading="lazy">` : '<span class="cqnoph"></span>'}<i>${esc(n)}</i>${isBonus(n) ? '<small>Bonus</small>' : ''}</button>`;
  };
  $v.innerHTML = `<h2>Custom quiz</h2>
  <p class="lede">The Quiz on the genera you pick. Tap the photos of the genera you want to work on, then <b>Start</b>. Three ways to see them: <b>IMR groups</b>, the IMR lecture's groups (the genera to tell apart); <b>My mix-ups</b>, the genera you confuse with each other, the most confused first (before you have any, the look-alikes of the IMR lecture and the Coral Finder); <b>Progress</b>, to review, learning, not seen yet, learned. <b>All</b> picks a whole group. <b>Quick picks</b> choose for you: your weakest genera, those you missed lately, or a genus and its look-alikes. Only the genera picked are asked, and the wrong choices come from them too, so look-alikes picked together are drilled together; with fewer than 4 picked, other genera make up the choices. Everything else is the photo quiz: typed questions, Again after a mix-up, look-alike duels, harder photos as you improve, and every answer counts in <a href="#progress">My progress</a>. A genus you have not met yet shows its card first. Mastery exams only come in the Quiz: a genus that reaches 95% here takes its exam there. Your choice is kept for next time; the Custom quiz tab brings you back here.</p>
  <div class="tools cqtools"><input type="search" id="cqq" placeholder="Search a genus" aria-label="Search a genus" autocomplete="off"><div class="seg" role="group" aria-label="View">${[
    ['imr', 'IMR groups'],
    ['mix', 'My mix-ups'],
    ['prog', 'Progress']
  ]
    .map(([k, t]) => `<button type="button" data-cv="${k}" aria-pressed="${view === k}">${t}</button>`)
    .join('')}</div></div>
  <div class="cqquick"><span class="label">Quick picks</span><button type="button" class="chip" data-qp="weak"${qp.weak.length < CUSTOM.MIN ? ' disabled title="Answer a few questions first"' : ''}>My weakest</button><button type="button" class="chip" data-qp="miss"${qp.miss.length < CUSTOM.MIN ? ' disabled title="Nothing missed lately"' : ''}>Recently missed</button><select class="chip" id="cqlk" aria-label="Look-alikes of a genus"><option value="">Look-alikes of…</option>${lk.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('')}</select></div>
  <div class="cq"></div>
  <div class="cqbar"><span class="cqn" aria-live="polite"></span><button type="button" class="linkish" data-clear>Clear all</button><button type="button" class="next" data-start>Start</button></div>`;
  const box = $v.querySelector('.cq'),
    n = $v.querySelector('.cqn'),
    st = $v.querySelector('[data-start]'),
    cl = $v.querySelector('[data-clear]');
  const show = () => {
    box.querySelectorAll('.cqtile').forEach(b => {
      b.setAttribute('aria-pressed', String(on.has(b.dataset.g)));
      b.hidden = !!q && !b.dataset.g.toLowerCase().includes(q);
    });
    box.querySelectorAll('.cqg').forEach(g => {
      const T = [...g.querySelectorAll('.cqtile:not([hidden])')];
      g.hidden = !T.length;
      const all = g.querySelector('.cqall');
      if (all) all.textContent = T.length && T.every(b => on.has(b.dataset.g)) ? 'None' : 'All';
    });
    const k = on.size;
    // The genera picked, named under the count: a quick pick or a long list shows what is in without scrolling.
    n.innerHTML = `<b>${k >= CUSTOM.MIN ? `${k} genera` : k ? 'Pick one more genus' : `Pick at least ${CUSTOM.MIN} genera`}</b>${
      k
        ? `<small>${play
            .filter(x => on.has(x))
            .map(x => `<i>${esc(x)}</i>`)
            .join(', ')}</small>`
        : ''
    }`;
    st.disabled = k < CUSTOM.MIN;
    cl.disabled = !k;
  };
  // Saved at each change, in the game's order (customOf keeps that order). only: a quick pick replaces the selection.
  const set = (L, v, only) => {
    if (only) on.clear();
    L.forEach(x => (v ? on.add(x) : on.delete(x)));
    store.set(CUSTOM.KEY, {g: play.filter(x => on.has(x)), t: Date.now()});
    show();
  };
  const draw = () => {
    const {note, G} = cqGroups(view, play);
    box.innerHTML =
      (note ? `<p class="note cqnote">${esc(note)}</p>` : '') +
      G.map(
        g =>
          `<section class="cqg" data-k="${esc(String(g.k))}"><div class="cqh">${g.mark}<span class="cqht">${g.t}${g.sub ? ` <small>${esc(g.sub)}</small>` : ''}</span><button type="button" class="linkish cqall" aria-label="All or none of this group">All</button></div><div class="cqtiles">${g.L.map(tile).join('')}</div></section>`
      ).join('');
    box.querySelectorAll('.cqtile').forEach(b => (b.onclick = () => set([b.dataset.g], !on.has(b.dataset.g))));
    // All of a group (the photos the search leaves in view), or none once they all are.
    box.querySelectorAll('.cqall').forEach(
      b =>
        (b.onclick = () => {
          const L = [...b.closest('.cqg').querySelectorAll('.cqtile:not([hidden])')].map(x => x.dataset.g);
          set(L, !L.every(x => on.has(x)));
        })
    );
    show();
  };
  $v.querySelectorAll('[data-cv]').forEach(
    b =>
      (b.onclick = () => {
        view = b.dataset.cv;
        store.set(CQ.VIEW, view);
        $v.querySelectorAll('[data-cv]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        draw();
      })
  );
  const qi = $v.querySelector('#cqq');
  qi.oninput = () => {
    q = qi.value.trim().toLowerCase();
    show();
  };
  $v.querySelectorAll('[data-qp]').forEach(b => (b.onclick = () => set(qp[b.dataset.qp], true, true)));
  const ls = $v.querySelector('#cqlk');
  ls.onchange = () => {
    if (ls.value) set(cqLooks(ls.value, play), true, true);
    ls.value = '';
  };
  cl.onclick = () => set([...on], false);
  st.onclick = () => {
    if (!customSel()) return;
    if (typeof syncSoon === 'function') syncSoon(); // the choice reaches the player's other devices
    go(CUSTOM_H);
  };
  draw();
}
