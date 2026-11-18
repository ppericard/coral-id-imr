// The live mode (Pierre, 2026-11-17, Q393; docs/reviews/2026-11-18-live-mode-design.md): a trainer and a group of students
// answer the same photo questions at the same time. The trainer's page (#live/host) builds each question with the game's
// own engine (model.js photoSet, distractors: the look-alike traps) on the set it picked and sends it; the students'
// pages (#live, #live?code=123456) show it and send their answer; the sync script relays and scores (Code.gs lv_).
// Three parts: the pure helpers (tested: tests/liveclass.test.js), the channel (LIVE_CH: the one module that talks to the
// script, polled; a WebSocket service could take its place without touching the screens) and the screens.
// Signed-in students' answers count in their progress (Q393 c): logged like any game answer (quiz.js logAnswer), mode
// 'live', scored by the game's scorer (core.js scoreAnswer through scoreIn, as quiz.js answer does), on the units they have
// unlocked only (rule L4: no game opens a unit). A nickname keeps nothing (Q393 e): its answers wait in this page's memory
// and are logged only if the player signs in on the end screen.

// pure: begin
// The sync script version that serves the live mode (rule D4): main's VERSION + 1 when written (tools/sheet_version.py
// --assign sets it at merge). A reply of an older script turns the mode off with a line, nothing sent again.
const LIVEGAME_SHEET = 172;
// Polling: a student every 2 s, the trainer every 1.5 s, neither once the game ended. Defaults and choices of the
// trainer's setup. TRAPS: the look-alike traps among the 3 wrong choices (model.js distractors). WAIT: one call's limit.
const LIVE = {POLL: 2000, HOST: 1500, WAIT: 15000, NQ: [5, 10, 15, 20], LIM: [10, 20, 30], N0: 10, LIM0: 20, TRAPS: 2};
// A session code as typed (spaces and dashes dropped): its 6 digits, or ''.
const liveCode = x => {
  const c = String(x == null ? '' : x).replace(/[\s-]/g, '');
  return /^\d{6}$/.test(c) ? c : '';
};
// Each choice's share of the answers, in whole percents.
const liveShares = (d, tot) => d.map(x => (tot > 0 ? Math.round((100 * x) / tot) : 0));
// The questions the class missed most (the trainer's summary at the end): those not every answer got right, the fewest
// right first, each {qi, t: the right answer, pct: its share of the answers, wrong: the wrong choice picked most, f}.
const liveMissed = hist =>
  (hist || [])
    .map(h => {
      const tot = h.d.reduce((t, x) => t + x, 0),
        w = h.d.reduce((b, x, i) => (i !== h.k && x > (b < 0 ? 0 : h.d[b]) ? i : b), -1);
      return {qi: h.qi, t: h.t, pct: tot ? Math.round((100 * h.d[h.k]) / tot) : 0, wrong: w >= 0 ? h.ch[w] : '', f: h.f, tot};
    })
    .filter(m => m.tot > 0 && m.pct < 100)
    .sort((a, b) => a.pct - b.pct || a.qi - b.qi)
    .map(({tot, ...m}) => m);
// "1st", "2nd", "3rd", "4th"…
const liveNth = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
// pure: end

// A reply of a script that serves the live mode (rule D4).
const liveFrom = j => !!j && Number(j.v) >= LIVEGAME_SHEET;
// The channel: one call at a time from this page (a student's poll and answer never cross), each a POST to the sync
// script through sheetFetch (a local copy or a test never reaches the real sheet: rule D1). Every reply is checked for the
// script's version (sheetSeen, LIVEGAME_SHEET).
const LIVE_CH = (() => {
  let q = Promise.resolve();
  const one = body =>
    Promise.race([
      sheetFetch(SYNC_URL, {method: 'POST', body: JSON.stringify(body)}).then(r => r.json()),
      new Promise((ok, no) => setTimeout(() => no(new Error('no answer')), LIVE.WAIT))
    ]).then(j => {
      if (typeof sheetSeen === 'function') sheetSeen(j);
      if (!liveFrom(j)) return {ok: false, error: 'old'};
      return j;
    });
  const call = body => (q = q.catch(() => {}).then(() => one(body).catch(() => ({ok: false, error: 'net'}))));
  return {
    start: o => call({lv: 'start', ...o}),
    host: o => call({lv: 'host', ...o}),
    join: o => call({lv: 'join', ...o}),
    poll: o => call({lv: 'poll', ...o}),
    answer: o => call({lv: 'answer', ...o})
  };
})();

// Saved per tab, so a reload goes back to the game (sessionStorage; nothing kept once the tab closes).
const LIVE_KEY = {ME: 'reefid-live-me', HOST: 'reefid-live-host'};
const liveGet = k => {
  try {
    return JSON.parse(sessionStorage.getItem(k) || 'null');
  } catch (e) {
    return null;
  }
};
const liveSet = (k, v) => {
  try {
    v ? sessionStorage.setItem(k, JSON.stringify(v)) : sessionStorage.removeItem(k);
  } catch (e) {}
};
// The page key on screen is a live page (else the timers stop).
const liveOn = h => {
  const k = hashNow();
  return h === 'host' ? k === 'live-host' : k === 'live' || k.startsWith('live|');
};
const LIVE_ERR = {
  old: 'Live games are not available yet. Try again in a few minutes.',
  net: 'No connection. Trying again…',
  gone: 'This game has ended or the code is wrong.',
  full: 'This game is full.',
  busy: 'Too many players right now. Try again in a minute.',
  lock: 'Busy. Trying again…',
  input: 'Something did not fit. Check the code and your name.',
  role: 'Hosting a live game needs the trainer role. Ask the app’s admin to give it to your account.',
  pin: 'Your account’s code was refused. Sign out and in again.',
  wait: 'Too many wrong codes: wait 10 minutes.',
  user: 'Your account was not found.',
  archived: 'Your account was archived.'
};
const liveErr = e => LIVE_ERR[e] || 'Something went wrong. Try again.';
const LETTERS = ['A', 'B', 'C', 'D'];
// A choice's name as the game sets it (app.js unameIn: a genus in italics) when this device knows the unit, else as sent.
const liveName = (id, label) => (GX(id) ? unameIn(id, esc(label)) : esc(label));
const livePhotos = (ph, cls = '') =>
  `<div class="lvstage ${cls}" data-n="${ph.length}">${ph
    .map(
      p =>
        `<figure class="lvph"><img src="${esc(p.u)}" alt="Photo to identify${p.v ? ', ' + esc(p.v) + ' view' : ''}" decoding="async"></figure>`
    )
    .join('')}</div>`;
// Once the answer is out (both pages' reveal): each photo's credit (app.js photoSrc) and the enlarged view with its full
// credit and its Report button (app.js zoom; rules P5, U14), from the photo's record on this device (photoLook, in the
// game's subject, its data loaded first). Never before the reveal: no credit or enlarged view gives the answer away.
function liveCredits(sid, ph, t) {
  const S = subjectOf(sid),
    root = $v.querySelector('.lvrev');
  if (!S || !UNITS[S.id] || !root) return;
  Promise.resolve(UNITS[S.id].load(S))
    .then(() => {
      if (!root.isConnected) return;
      const R = inSubject(S.id, () => ph.map(x => photoLook(x.f) || null)),
        L = R.filter(Boolean).map(p => ({...p, genus: t}));
      root.querySelectorAll('.lvph').forEach((fig, k) => {
        const p = R[k],
          im = fig.querySelector('img');
        if (!p || !im || fig.querySelector('.zoom')) return;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'zoom';
        b.setAttribute('aria-label', 'Enlarge photo');
        fig.insertBefore(b, im);
        b.appendChild(im);
        b.insertAdjacentHTML('beforeend', ZOOMI);
        fig.insertAdjacentHTML('beforeend', photoSrc(p));
        const i = L.findIndex(x => x.f === p.f);
        b.onclick = () => zoom(L, Math.max(0, i));
      });
    })
    .catch(() => {});
}
const liveTop = (top, me) =>
  `<ol class="lvtop">${top
    .map(
      (r, i) =>
        `<li${me && r[0] === me ? ' class="me"' : ''}><span class="lvrk">${i + 1}</span><b>${esc(r[0])}</b><span class="lvpts">${r[1]}</span></li>`
    )
    .join('')}</ol>`;
// Each choice with its share (the reveal, both pages): the right one ticked, the student's own marked.
const liveShareList = (ch, rev, mine = -1) => {
  const pc = liveShares(rev.d, rev.tot);
  return `<ul class="lvshares">${ch
    .map(
      (c, i) =>
        `<li class="${i === rev.k ? 'ok' : ''}${i === mine && i !== rev.k ? ' ko' : ''}"><span class="lvl">${i === rev.k ? '✓' : i === mine ? '✗' : LETTERS[i]}</span><span class="lvsn">${liveName(c[0], c[1])}</span><span class="lvsb"><i style="width:${pc[i]}%"></i></span><b>${pc[i]}%</b></li>`
    )
    .join('')}</ul>`;
};

// ---- A student's page ----
// LV: the student's game: {code, pid, pk, name, s: subject id, at: the question's state {qi, t0, rt, c, st}, mine: this
// page's answers {qi: {id: the choice's id, rt, at}} (for the answer time), logged: the question numbers already logged
// or kept, hx: how many revealed questions the script has said (lvView_ hn), pend: the accepted answers not logged yet
// (a nickname's until a sign-in, a signed-in player's until liveFlush logs them), right}. All but at kept per tab (LIVE_KEY.ME), so a reload (a sign-in reloads the page) loses nothing.
let LV = null,
  LVT = 0;
const liveSave = () =>
  LV &&
  liveSet(LIVE_KEY.ME, {code: LV.code, pid: LV.pid, pk: LV.pk, name: LV.name, logged: LV.logged, hx: LV.hx, pend: LV.pend, mine: LV.mine});
function viewLive(h) {
  clearTimeout(LVT);
  if (h === 'live-host') return liveHost();
  const code = h.startsWith('live|') ? h.slice(5) : '',
    me = liveGet(LIVE_KEY.ME);
  if (me && (!code || me.code === code)) {
    LV = {...me, at: null, logged: me.logged || [], hx: me.hx || 0, pend: me.pend || [], mine: me.mine || {}, right: 0, key: ''};
    return livePoll();
  }
  liveJoin(code);
}
// The join screen (Q393 e): the code and a name; signed in, the first name and why it counts; not signed in, the nudge.
function liveJoin(code, msg = '') {
  LV = null;
  const name = SYNC ? firstName(SYNC.name) : '';
  $v.innerHTML = `<div class="live lvjoin">
    <form class="lvform" id="lvjf" autocomplete="off">
      <label>Game code<input id="lvcode" inputmode="numeric" maxlength="7" placeholder="123456" value="${esc(code)}" required></label>
      <label>Your name<input id="lvnick" maxlength="20" value="${esc(name)}" required></label>
      <button class="next" type="submit">Join</button>
      <p class="note lvmsg" id="lvmsg" role="status">${esc(msg)}</p>
    </form>
    <div class="lvsign">${
      SYNC
        ? `<p>✓ Signed in: your right answers count in your progress.</p>`
        : `<p><b>Not signed in:</b> this game keeps nothing. Sign in to keep your right answers in your progress.</p><button class="next sec" type="button" id="lvsign">Sign in</button>`
    }</div>
    <p class="note lvhosting"><a class="linkish" href="${esc(hr('live-host'))}">Host a game</a> (trainers)</p>
  </div>`;
  const f = document.getElementById('lvjf'),
    m = document.getElementById('lvmsg'),
    sb = document.getElementById('lvsign');
  if (sb) sb.onclick = () => liveSignin(() => liveJoin(liveCode(f.lvcode.value) || code));
  if (!code) f.lvcode.focus({preventScroll: true});
  f.onsubmit = e => {
    e.preventDefault();
    const c = liveCode(f.lvcode.value),
      nick = f.lvnick.value.trim();
    if (!c) return void (m.textContent = 'The code is 6 digits.');
    if (!nick) return void (m.textContent = 'Type a name.');
    f.querySelector('button').disabled = true;
    m.textContent = 'Joining…';
    LIVE_CH.join({code: c, nick}).then(j => {
      f.querySelector('button').disabled = false;
      if (!j.ok) return void (m.textContent = liveErr(j.error));
      LV = {code: c, pid: j.pid, pk: j.pk, name: j.name, logged: [], hx: 0, pend: [], mine: {}, at: null, right: 0, key: ''};
      liveSave();
      livePoll();
    });
  };
}
// The sign-in card (sync.js signinNudge); then = once signed in (watched while the page stays).
function liveSignin(then) {
  signinNudge(false, false);
  const h = hashNow(),
    t = setInterval(() => {
      if (hashNow() !== h) return clearInterval(t);
      if (SYNC) (clearInterval(t), then());
    }, 500);
}
function livePoll() {
  if (!LV || !liveOn()) return;
  LIVE_CH.poll({code: LV.code, pid: LV.pid, pk: LV.pk, hx: LV.hx}).then(j => {
    if (!LV || !liveOn()) return;
    if (!j.ok && ['gone', 'input', 'old'].includes(j.error)) {
      liveSet(LIVE_KEY.ME, null);
      return liveJoin('', liveErr(j.error));
    }
    if (j.ok) liveShow(j);
    if (!(j.ok && j.ph === 'end')) LVT = setTimeout(livePoll, LIVE.POLL); // an ended game asks nothing more
  });
}
// The student's screen for a poll's reply: drawn again only when the phase or the question changes; the countdown and
// counts in place otherwise.
function liveShow(j) {
  liveCatch(j);
  const key = j.ph + ':' + j.qi;
  if (key !== LV.key) liveDraw(j, key);
  else liveRecon(j);
  if (j.ph === 'q') liveClock(j.left, 'lvbar', j.lim * 1000);
}
function liveDraw(j, key) {
  LV.key = key;
  LV.s = j.s;
  const head = `<div class="lvhead"><b>${esc(LV.name)}</b><span>${j.me.s} pts</span></div>`;
  if (j.ph === 'lobby')
    $v.innerHTML = `<div class="live lvwait">${head}<p class="lvbig">You’re in!</p><p class="note">Waiting for the trainer to start…</p></div>`;
  else if (j.ph === 'q') {
    LV.at = {qi: j.qi, t0: 0, c: j.mine, q: j.q, st: j.mine >= 0 ? 'ok' : ''};
    $v.innerHTML = `<div class="live lvq">${head}<p class="lvqn">Question ${j.qi + 1} of ${j.n}</p>
      <div class="lvbar" aria-hidden="true"><i id="lvbar"></i></div>${livePhotos(j.q.ph)}
      <div class="lvch" role="group" aria-label="Your answer">${j.q.ch
        .map(
          (c, i) =>
            `<button type="button" data-i="${i}"${j.mine >= 0 ? ' disabled' : ''} class="${j.mine === i ? 'on' : ''}"><span class="lvl">${LETTERS[i]}</span>${liveName(c[0], c[1])}</button>`
        )
        .join(
          ''
        )}</div><p class="note lvmsg" id="lvmsg" role="status">${j.mine >= 0 ? 'Answer locked in. Wait for the reveal…' : ''}</p></div>`;
    const img = $v.querySelector('.lvph img'),
      go = () => LV && LV.at && !LV.at.t0 && (LV.at.t0 = Date.now());
    img && !img.complete ? img.addEventListener('load', go, {once: true}) : go();
    $v.querySelectorAll('.lvch [data-i]').forEach(b => (b.onclick = () => liveAnswer(j.qi, Number(b.dataset.i))));
  } else if (j.ph === 'rev') {
    const r = j.rev,
      ok = r.mine === r.k,
      t = j.q.ch[r.k][0];
    // A problem with this question reported from here (rule U14), as the quiz's report: the right answer, the one picked
    // (the accepted one), the photos.
    const rep =
      typeof repBtn === 'function' ? repBtn({g: t, a: r.mine >= 0 ? j.q.ch[r.mine][0] : '', ph: j.q.ph.map(p => p.f), m: 'live'}) : '';
    $v.innerHTML = `<div class="live lvrev">${head}<p class="lvverdict ${r.mine < 0 ? '' : ok ? 'ok' : 'ko'}">${
      r.mine < 0 ? 'Time’s up' : ok ? `✓ Right! <span>+${r.pts}</span>` : '✗ Not this time'
    }</p>${livePhotos(j.q.ph, 'lvrevph')}<p class="lvans">It was ${liveName(t, j.q.ch[r.k][1])}</p>${liveShareList(j.q.ch, r, r.mine)}
      <p class="lvrank">${liveNth(j.rank)} of ${j.of} · ${j.me.s} pts</p><p class="note lvrep">${rep}</p></div>`;
    liveCredits(j.s, j.q.ph, t);
  } else if (j.ph === 'end') {
    LV.right = j.me.r;
    // Signed in by now with answers still waiting (a sign-in reloads the page: the waiting answers were kept per tab):
    // logged now.
    const flush = SYNC && LV.pend.length,
      pend = LV.pend.filter(a => a.ok).length;
    $v.innerHTML = `<div class="live lvend">${head}<p class="lvbig">${liveNth(j.rank)} of ${j.of}</p>
      <p class="lvrank">${j.me.s} pts · ${j.me.r} right of ${j.n}</p>${liveTop(j.top, LV.name)}
      <div class="lvsign" id="lvkeep">${
        SYNC
          ? `<p>✓ Your answers count in your progress.</p>`
          : pend
            ? `<p><b>Sign in to keep your ${pend} right answer${pend === 1 ? '' : 's'} in your progress.</b> Without it, this game keeps nothing.</p><button class="next" type="button" id="lvsign">Sign in</button>`
            : `<p>Sign in next time to keep your right answers in your progress.</p>`
      }</div>
      <p><a class="next sec" href="${esc(hr('live'))}" id="lvagain">Join another game</a></p></div>`;
    const sb = document.getElementById('lvsign');
    if (sb) sb.onclick = () => liveSignin(() => liveKeep());
    if (flush) liveKeep();
    // Another game: the join form at once (the address may already be #live, which no hashchange would redraw).
    document.getElementById('lvagain').onclick = e => {
      liveSet(LIVE_KEY.ME, null);
      clearTimeout(LVT);
      if (hashNow() === 'live') (e.preventDefault(), liveJoin(''));
    };
  }
}
const liveKept = n => {
  const k = document.getElementById('lvkeep');
  if (k) k.innerHTML = `<p>✓ ${n ? `${n} answer${n === 1 ? '' : 's'} added to your progress.` : 'Signed in.'}</p>`;
};
// The countdown bar el (and its number el + 'n'), from the time left the script said (ms) of tot, down to 0.
let LVC = 0;
function liveClock(left, el, tot) {
  cancelAnimationFrame(LVC);
  const end = Date.now() + left;
  const step = () => {
    const b = document.getElementById(el);
    if (!b) return;
    const l = Math.max(0, end - Date.now());
    b.style.width = Math.min(100, (100 * l) / Math.max(1, tot)) + '%';
    b.parentNode.classList.toggle('low', l < 5000);
    const n = document.getElementById(el + 'n');
    if (n) n.textContent = Math.ceil(l / 1000);
    if (l > 0) LVC = requestAnimationFrame(step);
  };
  step();
}
function liveAnswer(qi, i) {
  if (!LV || !LV.at || LV.at.qi !== qi || LV.at.c >= 0) return;
  LV.at.c = i;
  LV.at.rt = LV.at.t0 ? Math.round((Date.now() - LV.at.t0) / 100) / 10 : undefined;
  LV.at.t = new Date().toISOString();
  LV.mine = {...LV.mine, [qi]: {id: LV.at.q.ch[i][0], rt: LV.at.rt, at: LV.at.t}};
  liveSave();
  liveSend(LV.at);
}
// The choices of the question on screen: i marked, all off (a choice sent or accepted) or all on again (i = -1).
function liveMark(i, msg) {
  $v.querySelectorAll('.lvch [data-i]').forEach(b => {
    b.disabled = i >= 0;
    b.classList.toggle('on', Number(b.dataset.i) === i);
  });
  const m = document.getElementById('lvmsg');
  if (m) m.textContent = msg;
}
// The answer of the question at (at.c) sent; at.st: 'out' while on its way, 'ok' accepted, 'no' refused for good (too
// late), 'retry' not taken (no connection, the script busy): the next poll that finds the question open and no answer
// accepted, sends it again (liveRecon; Codex review #1049).
function liveSend(at) {
  at.st = 'out';
  liveMark(at.c, 'Sending…');
  LIVE_CH.answer({code: LV.code, pid: LV.pid, pk: LV.pk, qi: at.qi, c: at.c}).then(j => {
    if (!LV || LV.at !== at) return;
    if (j.ok) return void ((at.st = 'ok'), (at.c = j.mine >= 0 ? j.mine : at.c), liveMark(at.c, 'Answer locked in. Wait for the reveal…'));
    at.st = ['net', 'lock', 'server', 'busy'].includes(j.error) ? 'retry' : 'no';
    const m = document.getElementById('lvmsg');
    if (m) m.textContent = j.error === 'phase' ? 'Too late for this one.' : liveErr(j.error);
  });
}
// A poll on the question on screen, while no answer is on its way: the answer the script holds is the one shown (its reply
// may have been lost), and one it never got is sent again while the question is open.
function liveRecon(j) {
  const at = LV.at;
  if (!at || j.ph !== 'q' || j.qi !== at.qi || at.st === 'out') return;
  if (j.mine >= 0 && (at.st !== 'ok' || at.c !== j.mine)) {
    at.st = 'ok';
    at.c = j.mine;
    liveMark(at.c, 'Answer locked in. Wait for the reveal…');
  } else if (j.mine < 0 && at.st === 'retry' && j.left > 0) liveSend(at);
}
// The student's answers the script accepted, once their right answer is out (lvView_ past: every question revealed since
// the last reply, its reveal seen here or not): each kept in LV.pend (per tab, saved with hx in one step), then logged
// at once when signed in (liveFlush), else kept for a sign-in at the end (Q393 e). Only the choice the script accepted,
// never one it refused (too late); once per question. The answer time is this page's own when it is for that same choice.
function liveCatch(j) {
  if (!LV) return;
  if (typeof j.hn === 'number') {
    (j.past || [])
      .filter(x => !LV.logged.includes(x.qi))
      .forEach(x => {
        LV.logged = [...LV.logged, x.qi];
        const m = LV.mine[x.qi] && LV.mine[x.qi].id === x.c ? LV.mine[x.qi] : {};
        LV.pend = [...LV.pend, {qi: x.qi, s: j.s, t: x.t, c: x.c, ok: x.c === x.t, ph: x.f, chs: x.ch, rt: m.rt, at: m.at}];
      });
    LV.hx = Math.max(LV.hx || 0, j.hn);
    liveSave();
  }
  // Signed in: what waits is logged now, and what could not be (its subject's data did not come) at the next poll.
  if (SYNC && LV.pend.length) liveFlush();
}
// The waiting answers logged, one drain at a time (a poll and the end screen never log one twice): each leaves LV.pend
// only once logged, or left out on purpose (a unit not unlocked: rule L4); one that failed (no connection for its
// subject's data) stays for the next try (Codex review #1049). Resolves how many were logged.
let LVF = null;
function liveFlush() {
  if (LVF) return LVF;
  if (!SYNC || !LV || !LV.pend.length) return Promise.resolve(0);
  const me = LV;
  LVF = me.pend
    .slice()
    .reduce(
      (p, o) =>
        p.then(n =>
          liveRecord(o).then(r => {
            if (r !== 'fail') liveDone(me, o.qi);
            return n + (r === 'ok' ? 1 : 0);
          })
        ),
      Promise.resolve(0)
    )
    .finally(() => (LVF = null));
  return LVF;
}
// Answer qi of game me out of the queue: of me, of the LV the page holds now for the same game (viewLive makes it again
// from the tab's copy, a drain may be on its way meanwhile) and of the tab's copy, so it is never logged twice.
function liveDone(me, qi) {
  const same = x => x && x.code === me.code && x.pid === me.pid,
    out = L => (L || []).filter(x => x.qi !== qi);
  me.pend = out(me.pend);
  if (same(LV)) return void ((LV.pend = out(LV.pend)), liveSave());
  const k = liveGet(LIVE_KEY.ME);
  if (same(k)) liveSet(LIVE_KEY.ME, {...k, pend: out(k.pend)});
}
// The end screen's drain: tried again while something still waits (no connection), then says how many were kept.
function liveKeep(n0 = 0) {
  liveFlush().then(n => {
    if (SYNC && LV && LV.pend.length && liveOn()) return void (LVT = setTimeout(() => liveKeep(n0 + n), LIVE.POLL));
    liveKept(n0 + n);
  });
}
// One live answer into the signed-in player's progress and answer log, as quiz.js answer scores and logs a photo-quiz
// question (the same scorer: core.js scoreAnswer through scoreIn; the log's fields), in the question's subject (inSubject),
// mode 'live'. Only on a unit the player has unlocked (rule L4: no game opens a unit) in a subject they may open. Resolves
// 'ok' once logged, 'skip' when left out on purpose (that rule, a subject the player may not open), 'fail' when it could
// not be done now (signed out, the subject's data did not come: liveFlush tries again). An error while scoring counts as
// a 'skip', never tried again: part of it may already be in the progress.
function liveRecord(o) {
  const S = subjectOf(o.s);
  if (!SYNC) return Promise.resolve('fail');
  if (!S || !subjOpen(S) || !UNITS[S.id]) return Promise.resolve('skip');
  return Promise.resolve()
    .then(() => UNITS[S.id].load(S))
    .then(
      () => 'in',
      () => 'fail'
    )
    .then(r => (r === 'fail' ? r : liveLog(S, o)));
}
function liveLog(S, o) {
  let r = 'skip';
  try {
    r = inSubject(S.id, () => {
      const t = o.t,
        c = o.c;
      if (!GX(t) || !introReady(t)) return 'skip';
      const good = c === t,
        s = st(t),
        first = !((s.ok || 0) + (s.ko || 0)),
        ph = o.ph.map(f => photoLook(f) || {f}),
        chs = o.chs,
        k = chs.length,
        mq = 'live';
      mxRecalc(() => {
        memRecalc(s, pmem());
        if (!good && GX(c)) memRecalc(st(c), pmem());
      });
      const nw = ph.filter(p => !(s.ps || {})[p.f]).length;
      const q = scoreIn({
        t,
        c,
        ok: good,
        k,
        chs,
        cv: !!GX(c),
        ph: ph.map(p => p.f),
        d0: (ph.length === 1 ? PICKD.SINGLE : 0) + ph.reduce((x, p) => x + photoDiff(t, p), 0) / Math.max(1, ph.length),
        fam: famOf(t, ph),
        cf: confTerm(t, chs, k),
        look: () => pgLook(t, chs),
        R: 1,
        Rc: 1,
        p: startP(),
        sec: o.rt,
        timed: rtOn(),
        df: fmtOff(pfmt(), fmtOf(mq, chs.length)),
        dt: fmtOff(pfmt(), 'typed'),
        dom: domRules(),
        mu: genusDiff(t),
        ...(!good && GX(c) ? {muc: genusDiff(c)} : {}),
        ...(GX(t).from ? {from: GX(t).from} : {}),
        ...(!good && GX(c) && GX(c).from ? {cfrom: GX(c).from} : {})
      });
      const res = scoreAnswer(P, q),
        sp = speciesShown(ph);
      if (!good) [t, ...(GX(c) ? [c] : [])].forEach(n => P[n] && P[n].mx && !mxKept(n) && delete P[n].mx);
      // A miss restarts the mastery exam of the unit shown and of the one named (rule L9), as quiz.js answer does.
      if (!good) delete s.ex;
      if (!good && GX(c) && P[c]) delete P[c].ex;
      const ans = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        t: o.at || new Date().toISOString(),
        g: t,
        a: c,
        ok: good ? 1 : 0,
        m: mq,
        ph: ph.map(p => p.f).join(' '),
        ch: chs.join(' '),
        e: Math.round(100 * res.e) / 100,
        th: res.th0,
        sc: scoreLog(q, res),
        nw,
        ...(typeof o.rt === 'number' ? {rt: o.rt} : {}),
        zm: 0,
        tz: -new Date().getTimezoneOffset(),
        s: SUBJ.id,
        rk: rankOf(t) || unitRankOf(SUBJ),
        ...(unitName(t) ? {tn: unitName(t)} : {}),
        ...(unitName(c) ? {ta: unitName(c)} : {}),
        ...(sp ? {sp} : {})
      };
      holdStep(ans.e, good);
      startStep(res.dm, k, good, first);
      answeredAt(s, good);
      logAnswer(ans);
      save();
      return 'ok';
    });
  } catch (e) {}
  if (r === 'ok' && typeof syncSoon === 'function') syncSoon();
  return r;
}

// ---- The trainer's page ----
// LH: the game hosted from this tab: {code, tk, s, t, n, lim, list: the units of the set, plan: the units asked, in order,
// sent: the question number last sent, key, last: the last reply}. Kept per tab (LIVE_KEY.HOST) for a reload.
let LH = null,
  LHT = 0;
// The subjects a trainer can host: those open to every player (a subject in beta for a group is left for later).
const liveSubjects = () => SUBJECTS.filter(S => !subjGroup(S) && UNITS[S.id]);
// The sets of the subject on screen: every unit in play, then the IMR lecture's groups when it has them (quiz.js cqGroups,
// the custom quiz's own groups: never growth forms, rule C4).
// A group's title (HTML, its text escaped) as plain text: parsed as an inert document (nothing in it runs or loads), its
// text only; escaped again wherever it is shown.
const liveText = h => (new DOMParser().parseFromString(String(h || ''), 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim();
function liveSets() {
  const play = pool(),
    out = [{k: 'all', t: `All ${SUBJ.many}`, L: play}];
  try {
    const G = cqGroups('imr', play).G.filter(g => g.L.length >= 2);
    if (G.length > 1) G.forEach(g => out.push({k: 'g' + g.k, t: liveText(g.t), L: g.L}));
  } catch (e) {}
  return out;
}
// One question on unit t: its photos as the photo quiz draws them, the three wrong choices with LIVE.TRAPS look-alike traps
// from every unit in play (model.js distractors, every unit taken as known: the class meets them together), shuffled.
function liveBuild(t) {
  const wrong = distractors(t, pool(), LIVE.TRAPS, () => true);
  if (wrong.length < 3) return null;
  const ch = shuffle([t, ...wrong.slice(0, 3)]),
    set = photoSet(t, null, 0, 4, 'k4'),
    ph = ((set && set.shown) || []).slice(0, 2).map(p => ({f: p.f, u: img(p, 'm'), v: p.view || ''}));
  if (!ph.length) return null;
  return {ph, ch: ch.map(n => [n, unameT(n)]), k: ch.indexOf(t)};
}
function liveHost() {
  LH = liveGet(LIVE_KEY.HOST);
  if (LH && LH.code) {
    // The saved game resumed with its subject's data loaded first (hostData; again at each question if it failed).
    const me = LH;
    LH.key = '';
    return void hostData().then(() => LH === me && hostPoll());
  }
  hostSetup();
}
function hostSetup(msg = '') {
  LH = null;
  if (!SYNC) {
    $v.innerHTML = `<div class="live lvhost lvsetup"><p class="lvbig">Host a live game</p><p>Hosting needs a trainer account: sign in first.</p>
      <button class="next" type="button" id="lvsign">Sign in</button></div>`;
    document.getElementById('lvsign').onclick = () => liveSignin(() => hostSetup());
    return;
  }
  const subs = liveSubjects();
  // The subject on screen may be one a trainer cannot host (in beta for a group): the first one they can, first.
  if (!subs.includes(SUBJ)) {
    if (subs.length) return void setSubject(subs[0].id);
    $v.innerHTML = `<div class="live lvhost lvsetup"><p class="lvbig">Host a live game</p><p>No subject can be hosted yet.</p></div>`;
    return;
  }
  const sets = liveSets(),
    seg = (id, L, cur, f = x => x) =>
      `<div class="seg" id="${id}" role="group">${L.map(x => `<button type="button" data-v="${x}" aria-pressed="${x === cur}">${f(x)}</button>`).join('')}</div>`;
  $v.innerHTML = `<div class="live lvhost lvsetup">
    <p class="lvbig">Host a live game</p>
    ${subs.length > 1 ? `<div class="lvrow"><span>Subject</span><div class="seg" id="lvsubj" role="group">${subs.map(S => `<button type="button" data-v="${S.id}" aria-pressed="${S === SUBJ}">${esc(S.name)}</button>`).join('')}</div></div>` : ''}
    <label class="lvrow"><span>Set</span><select id="lvset">${sets.map(x => `<option value="${esc(x.k)}">${esc(x.t)} (${x.L.length})</option>`).join('')}</select></label>
    <div class="lvrow"><span>Questions</span>${seg('lvn', LIVE.NQ, LIVE.N0)}</div>
    <div class="lvrow"><span>Time per question</span>${seg('lvlim', LIVE.LIM, LIVE.LIM0, x => x + ' s')}</div>
    <button class="next" type="button" id="lvgo">Start</button>
    <p class="note lvmsg" id="lvmsg" role="status">${esc(msg)}</p></div>`;
  $v.querySelectorAll('.seg').forEach(g =>
    g.querySelectorAll('button').forEach(
      b =>
        (b.onclick = () => {
          if (g.id === 'lvsubj') return void (subjectOf(b.dataset.v) !== SUBJ && setSubject(b.dataset.v));
          g.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
        })
    )
  );
  const val = id => Number($v.querySelector(`#${id} [aria-pressed="true"]`).dataset.v);
  document.getElementById('lvgo').onclick = e => {
    const set = sets.find(x => x.k === document.getElementById('lvset').value) || sets[0],
      n = val('lvn'),
      lim = val('lvlim'),
      m = document.getElementById('lvmsg');
    if (!set.L.length) return void (m.textContent = 'This set has no units in play.');
    e.target.disabled = true;
    m.textContent = 'Starting…';
    LIVE_CH.start({lname: SYNC.name, lpin: SYNC.pin, s: SUBJ.id, t: set.t, n, lim}).then(j => {
      if (!j.ok) return void ((e.target.disabled = false), (m.textContent = liveErr(j.error)));
      // The units asked: the set shuffled, again when it runs out, never the same unit twice in a row.
      const plan = [];
      while (plan.length < n) shuffle(set.L.slice()).forEach(u => plan.length < n && plan[plan.length - 1] !== u && plan.push(u));
      LH = {code: j.code, tk: j.tk, s: SUBJ.id, t: set.t, n, lim, plan, sent: -1, key: ''};
      liveSet(LIVE_KEY.HOST, LH);
      hostPoll();
    });
  };
}
function hostCall(act, q) {
  return LIVE_CH.host({code: LH.code, tk: LH.tk, ...(act ? {act} : {}), ...(q ? {q} : {})});
}
function hostPoll() {
  if (!LH || !liveOn('host')) return;
  clearTimeout(LHT);
  hostCall().then(hostReply);
}
function hostReply(j) {
  if (!LH || !liveOn('host')) return;
  clearTimeout(LHT);
  if (!j.ok && ['gone', 'old'].includes(j.error)) {
    liveSet(LIVE_KEY.HOST, null);
    return hostSetup(liveErr(j.error));
  }
  if (j.ok) {
    LH.last = j;
    hostShow(j);
    // The reveal comes by itself when the time is up or every student has answered.
    if (j.ph === 'q' && j.qi === LH.sent && (j.left <= 0 || (j.names.length > 0 && j.cnt >= j.names.length))) return hostAct('rev');
  }
  if (j.ok && j.ph === 'end') return;
  LHT = setTimeout(hostPoll, LIVE.HOST);
}
// The game's subject's data (UNITS load), before a question is built in it: the header's subject may be another one since
// (switched, then the page reloaded: only the subject on screen is loaded at start-up; Codex review #1049). Resolves
// whether it came; a failed load is tried again at the next question.
const hostData = () => {
  const S = LH && subjectOf(LH.s);
  return S && UNITS[S.id]
    ? Promise.resolve()
        .then(() => UNITS[S.id].load(S))
        .then(
          () => true,
          () => false
        )
    : Promise.resolve(false);
};
function hostAct(act) {
  if (!LH) return;
  clearTimeout(LHT);
  $v.querySelectorAll('.lvact').forEach(b => (b.disabled = true));
  if (act !== 'q') return hostSend(act, null);
  const me = LH;
  hostData().then(() => {
    if (LH !== me || !liveOn('host')) return;
    const qi = LH.last ? LH.last.qi + 1 : 0;
    let q = null;
    // Built in the game's subject, its data loaded (hostData), as the player's own subject switch does.
    for (let i = 0; i < 5 && !q; i++) q = inSubject(LH.s, () => liveBuild(i ? pick(LH.plan) : LH.plan[qi]));
    if (!q) return void (hostShow(LH.last, 'No photo or choices for this question: try again.'), (LHT = setTimeout(hostPoll, LIVE.HOST)));
    LH.sent = qi;
    liveSet(LIVE_KEY.HOST, LH);
    hostSend(act, q);
  });
}
function hostSend(act, q) {
  hostCall(act, q).then(j => {
    if (!LH) return;
    if (j.ok || ['gone', 'old'].includes(j.error)) return hostReply(j);
    if (j.error === 'phase') return hostPoll();
    // Not applied (no connection, a question refused): the screen drawn again with its buttons and the reason, and the
    // polling goes on; a poll that finds the action applied after all moves on by itself.
    if (LH.last && liveOn('host')) hostShow(LH.last, liveErr(j.error));
    clearTimeout(LHT);
    LHT = setTimeout(hostPoll, LIVE.HOST);
  });
}
// The trainer's screen, projector-friendly: drawn again only when the phase or the question changes.
function hostShow(j, msg = '') {
  const key = j.ph + ':' + j.qi,
    last = j.qi + 1 >= j.n;
  if (key !== LH.key || msg) hostDraw(j, key, last, msg);
  else {
    const c = document.getElementById('lhcnt'),
      nm = document.getElementById('lhnames');
    if (c) c.textContent = `${j.cnt} / ${j.names.length} answered`;
    if (nm) nm.innerHTML = hostNames(j.names);
    const go = document.getElementById('lhgo');
    if (go && j.ph === 'lobby') go.disabled = !j.names.length;
  }
  if (j.ph === 'q') liveClock(j.left, 'lhbar', j.lim * 1000);
}
function hostDraw(j, key, last, msg) {
  LH.key = key;
  const top = `<div class="lvhead"><b>${esc(j.t)}</b><span>Code <b class="lvcode">${esc(LH.code.slice(0, 3) + ' ' + LH.code.slice(3))}</b></span></div>`,
    note = msg ? `<p class="note lvmsg" role="status">${esc(msg)}</p>` : '';
  if (j.ph === 'lobby') {
    const addr = (location.origin + location.pathname).replace(/^https?:\/\//, '') + hr('live');
    $v.innerHTML = `<div class="live lvhost lvlobby">
      <p class="lvjoinat">Join at <b>${esc(addr)}</b></p>
      <p class="lvbigcode" aria-label="Game code">${esc(LH.code.slice(0, 3))}<span> </span>${esc(LH.code.slice(3))}</p>
      <p class="lvsub">${esc(j.t)} · ${j.n} questions · ${j.lim} s each</p>
      <div class="lvnames" id="lhnames">${hostNames(j.names)}</div>
      <p><button class="next lvact" type="button" id="lhgo"${j.names.length ? '' : ' disabled'}>Start the game</button> <button class="linkish lvact" type="button" id="lhend">End</button></p>${note}</div>`;
    document.getElementById('lhgo').onclick = () => hostAct('q');
  } else if (j.ph === 'q') {
    $v.innerHTML = `<div class="live lvhost lvq">${top}
      <div class="lvqbar"><span class="lvqn">Question ${j.qi + 1} of ${j.n}</span><span class="lvtime" id="lhbarn">${Math.ceil(j.left / 1000)}</span><span id="lhcnt">${j.cnt} / ${j.names.length} answered</span></div>
      <div class="lvbar" aria-hidden="true"><i id="lhbar"></i></div>
      ${livePhotos(j.q.ph, 'big')}
      <ol class="lvchoices">${j.q.ch.map((c, i) => `<li><span class="lvl">${LETTERS[i]}</span>${liveName(c[0], c[1])}</li>`).join('')}</ol>
      <p><button class="next sec lvact" type="button" id="lhrev">Reveal now</button></p>${note}</div>`;
    document.getElementById('lhrev').onclick = () => hostAct('rev');
  } else if (j.ph === 'rev') {
    $v.innerHTML = `<div class="live lvhost lvrev">${top}
      <div class="lvrevgrid">${livePhotos(j.q.ph)}<div><p class="lvqn">Question ${j.qi + 1} of ${j.n} · ${j.rev.tot} of ${j.names.length} answered</p>
      <p class="lvans">${liveName(j.q.ch[j.rev.k][0], j.q.ch[j.rev.k][1])}</p>${liveShareList(j.q.ch, j.rev)}</div></div>
      <div class="lvtopw"><p class="lvk">Top ${Math.min(5, j.rev.top.length)}</p>${liveTop(j.rev.top)}</div>
      <p><button class="next lvact" type="button" id="lhnext">${last ? 'Show the podium' : 'Next question'}</button>${last ? '' : ' <button class="linkish lvact" type="button" id="lhend">End</button>'}</p>${note}</div>`;
    document.getElementById('lhnext').onclick = () => hostAct(last ? 'end' : 'q');
    liveCredits(j.s, j.q.ph, j.q.ch[j.rev.k][0]);
  } else if (j.ph === 'end') {
    const P3 = j.stand.slice(0, 3),
      miss = liveMissed(j.hist).slice(0, 5);
    $v.innerHTML = `<div class="live lvhost lvend">${top}
      <div class="lvpod">${[1, 0, 2]
        .filter(i => P3[i])
        .map(i => `<div class="p${i + 1}"><b>${esc(P3[i][0])}</b><span>${P3[i][1]} pts</span><i>${i + 1}</i></div>`)
        .join('')}</div>
      ${j.stand.length > 3 ? `<details class="lvall"><summary>Everyone (${j.stand.length})</summary>${liveTop(j.stand)}</details>` : ''}
      <div class="lvmiss"><p class="lvk">Most missed</p>${
        miss.length
          ? `<ul>${miss.map(m => `<li><img src="${esc(m.f)}" alt="" loading="lazy"><span><b>${esc(m.t)}</b> ${m.pct}% right${m.wrong ? ` · most said ${esc(m.wrong)}` : ''}</span></li>`).join('')}</ul>`
          : '<p class="note">Every question was answered right.</p>'
      }</div>
      <p><button class="next" type="button" id="lhnew">New game</button></p></div>`;
    liveSet(LIVE_KEY.HOST, null);
    document.getElementById('lhnew').onclick = () => hostSetup();
  }
  const e = document.getElementById('lhend');
  if (e) e.onclick = () => hostAct('end');
}
const hostNames = L => (L.length ? L.map(n => `<span class="chip">${esc(n)}</span>`).join('') : '<p class="note">Waiting for players…</p>');
