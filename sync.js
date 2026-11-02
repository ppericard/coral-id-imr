// IMR Coral ID: the link with the sync sheet (tools/sync/Code.gs), split out of app.js (2026-11-02, code review L1:
// one file per part, one piece at a time). Signed-in progress (sync), photo statistics (loadStats), players' reports,
// answers of players not signed in (anonymous), the app's own error reports and one-tap answers (events), signing in.
// A classic script like app.js: it shares app.js's top-level names and is loaded right after it (index.html, in
// order); app.js waits for every script (window.BOOT) before its first page, so nothing here is needed earlier.
// RA sync: progress goes to Pierre's Google Sheet (Apps Script web app, tools/sync/Code.gs) under a name
// and a 4-digit code; the same name and code bring it back on another device. Off while SYNC_URL is empty.
// Photo difficulty from the sheet (Elo over every RA's answers), kept for offline use. An older sheet script without
// stats simply answers with an error, and the game-set priors are used.
// Refreshed every 10 minutes while the page is open (the sheet caches it for 10 minutes too), and on coming back to a
// tab left open longer than that.
let statsAt = 0;
setInterval(() => {
  if (document.visibilityState === 'visible') loadStats();
}, 600000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - statsAt > 600000) loadStats();
});
function loadStats() {
  if (!SYNC_URL || !DATA) return;
  statsAt = Date.now();
  fetch(SYNC_URL + '?stats=1')
    .then(r => r.json())
    .then(j => {
      if (j && j.ok && j.photos) {
        PSTAT = j.photos;
        GDIFF = {}; // genus difficulties follow the new photo stats and confusions
        PCONF = j.conf || {};
        store.set('imr-photo-stats', {t: Date.now(), photos: j.photos, conf: PCONF});
      }
    })
    .catch(() => {});
}
const SYNC_URL = 'https://script.google.com/macros/s/AKfycbyt6l9sBeWP4KacPx1SUbsk9-15uJikxRafrpwF6b2oAE8GgrnPOtuJg7IqfFG5ymrR/exec';
// A copy run on this computer (tests, tools/perf.js, a developer) never sends anonymous answers or reports to the real
// sheet (Pierre, 2026-11-02: 17 "players" in the admin were tools/perf.js runs: once the service worker was in, its
// requests passed by the test's network mocks and reached the sheet).
const LOCAL = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
let SYNC = store.get('imr-coral-sync', null),
  syncTimer = null;
function syncSummary() {
  const n = Object.keys(DATA.gen),
    genera = Object.fromEntries(n.map(x => [x, level(x)[0]]));
  return {
    learned: n.filter(x => genera[x] === 'ok').length,
    seen: n.filter(x => genera[x] !== 'new').length,
    total: n.length,
    review: n.filter(x => genera[x] === 'weak'),
    genera,
    pct: progPct(n), // the public leaderboard (sheet v14): progress as the header shows it
    board: boardOn() ? 1 : 0
  };
}
const syncGet = (a = SYNC) => fetch(`${SYNC_URL}?name=${encodeURIComponent(a.name)}&pin=${encodeURIComponent(a.pin)}`).then(r => r.json());
// Two devices on one account: three-way merge against SYNC.base, the progress as last sent or received.
// Answers taken on this device since then are added on top of the saved record, so neither side's answers
// are lost. A reset (imr-coral-reset, a time) wins over older progress.
const copy = o => JSON.parse(JSON.stringify(o));
function mergeSaved(j) {
  if (typeof j.rev === 'number') SYNC.srv = j.rev; // the sheet's revision this merge is based on (sent back as at, v6)
  const d = j.data || {};
  // The leaderboard choice made on another device, if more recent than this one's (else this one's goes with the next send).
  try {
    const rb = JSON.parse(d[BOARD] || 'null');
    if (rb !== null && boardT(rb) > boardT(store.get(BOARD, null))) {
      store.set(BOARD, rb);
      showBoardSet();
    }
  } catch (e) {}
  achMerge(d[ACHK]); // achievements earned on another device join this one's
  let R = {};
  try {
    R = JSON.parse(d['imr-coral-progress'] || '{}') || {};
  } catch (e) {}
  const rr = JSON.parse(d['imr-coral-reset'] || '""'),
    lr = store.get('imr-coral-reset', '');
  // A send whose reply was lost but which did reach the sheet: the saved record is exactly what was sent.
  if (SYNC.pending && d['imr-coral-progress'] === SYNC.pending) SYNC.base = R;
  delete SYNC.pending;
  if (lr > rr) return;
  if (rr > lr) {
    P = R;
    SYNC.base = copy(R);
    store.set('imr-coral-sync', SYNC);
    store.set('imr-coral-reset', rr);
    store.set('imr-coral-progress', P);
    showProg();
    return;
  }
  // In place: other code holds P by name only, but keep the same object anyway.
  const M = mergeProgress(SYNC.base || {}, P, R);
  Object.keys(P).forEach(g => delete P[g]);
  Object.assign(P, M);
  // The saved record is now part of P: it becomes the baseline, so a failed send can't count it twice.
  SYNC.base = copy(R);
  store.set('imr-coral-sync', SYNC);
  store.set('imr-coral-progress', P);
  showProg();
}
// Pull, merge, then send. Every change bumps SYNC.rev; a send clears SYNC.dirty only if nothing changed
// meanwhile. Unsent progress is retried on start-up and when back online.
// One sync at a time: a request made while one runs is queued and runs once it ends.
let syncing = null,
  syncAgain = false;
function syncPush() {
  if (!SYNC_URL || !SYNC || !DATA) return Promise.resolve(null);
  if (syncing) {
    syncAgain = true;
    return syncing;
  }
  syncing = syncOnce().finally(() => {
    syncing = null;
    if (syncAgain) {
      syncAgain = false;
      syncPush();
    }
  });
  return syncing;
}
// at = the sheet revision merged against (script v6): if another device wrote in between, the sheet answers 'stale'
// (answers logged all the same) and the whole pull-merge-send runs again, at most twice (code review M1).
function syncOnce(tries = 0) {
  const me = SYNC;
  let rev, sent, log;
  // If the device is disconnected or switched to another account meanwhile, drop this sync.
  // Script v11: a name the admin removed or merged answers 'gone' (with the name it joined): recorded below, no send.
  return syncGet(me)
    .then(j => {
      if (SYNC !== me) return null;
      if (!j.ok) return j;
      if (j.found) mergeSaved(j);
      rev = me.rev;
      sent = copy(P);
      log = me.log || [];
      me.pending = progData()['imr-coral-progress'] || '';
      store.set('imr-coral-sync', me);
      const pd = (progData()['imr-coral-progress'] || '').length;
      if (pd > 40000) console.warn(`Progress is ${pd} characters (sheet script v6 stores any size; v5 stops at 50,000).`);
      return fetch(SYNC_URL, {
        method: 'POST',
        body: JSON.stringify({
          name: me.name,
          pin: me.pin,
          data: progData(),
          summary: syncSummary(),
          answers: log,
          // First send after signing in: the answers this device sent anonymously move to this name (script v12).
          ...(me.anon ? {anon: me.anon} : {}),
          ...(typeof me.srv === 'number' ? {at: me.srv} : {})
        })
      }).then(r => r.json());
    })
    .then(j => {
      if (!j || SYNC !== me) return j;
      // Answers the sheet confirmed are dropped from the queue even when the progress write itself was refused.
      if (j.log && log.length) {
        const done = new Set(log.map(x => x.id));
        me.log = (me.log || []).filter(x => !done.has(x.id));
        store.set('imr-coral-sync', me);
      }
      // The retry is a whole sync of its own: its result skips the steps below (they would apply this round's sent copy).
      if (j.error === 'stale' && tries < 2) {
        delete me.pending;
        return syncOnce(tries + 1).then(r => {
          throw {retried: r};
        });
      }
      return j;
    })
    .then(j => {
      if (j && j.ok && SYNC === me) {
        me.last = new Date().toISOString();
        me.base = sent;
        if (typeof j.rev === 'number') me.srv = j.rev;
        delete me.pending;
        delete me.err;
        if (!j.log && log.length) me.err = 'net';
        if (me.anon) delete me.anon;
        if (j.log) {
          const done = new Set(log.map(x => x.id));
          me.log = (me.log || []).filter(x => !done.has(x.id));
        }
        if (me.rev === rev) delete me.dirty;
        store.set('imr-coral-sync', me);
      } else if (j && SYNC === me) {
        me.err = j.error === 'pin' || j.error === 'wait' || j.error === 'gone' ? j.error : 'net';
        if (me.err === 'net' && j.error !== 'stale' && j.error !== 'busy')
          ev('sync', {msg: 'save refused: ' + String(j.error || 'no reply')});
        if (j.error === 'gone') me.into = j.into || '';
        store.set('imr-coral-sync', me);
      }
      return j;
    })
    .catch(x => {
      if (x && 'retried' in x) return x.retried;
      if (SYNC === me) {
        if (navigator.onLine !== false) ev('sync', {msg: 'save failed: ' + String((x && x.message) || x).slice(0, 120)});
        me.err = 'net';
        store.set('imr-coral-sync', me);
      }
      return null;
    })
    .finally(() => {
      if (SYNC === me) bindSync();
    });
}
const syncSoon = () => {
  if (!SYNC_URL || !SYNC) return;
  SYNC.dirty = true;
  SYNC.rev = (SYNC.rev || 0) + 1;
  store.set('imr-coral-sync', SYNC);
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncPush, 3000);
};
// Bring in what other devices saved: on start-up, when the app comes back to the screen (a phone PWA resumed,
// a desktop tab switched to) and when back online. Unsent changes here: a full sync (pull, merge, send).
// Otherwise only a pull and merge, nothing written to the sheet. My progress redraws if the merge changed it.
let pulledAt = 0;
function syncPull() {
  if (!SYNC_URL || !SYNC || !DATA) return Promise.resolve(null);
  if (SYNC.dirty || (SYNC.log || []).length) return syncPush();
  if (syncing) return syncing;
  const me = SYNC,
    before = JSON.stringify(P);
  pulledAt = Date.now();
  syncing = syncGet(me)
    .then(j => {
      if (SYNC !== me) return null;
      if (!j.ok) {
        if (j.error === 'pin' || j.error === 'wait' || j.error === 'gone') {
          me.err = j.error;
          if (j.error === 'gone') me.into = j.into || '';
          store.set('imr-coral-sync', me);
        }
        return j;
      }
      if (j.found) mergeSaved(j);
      delete me.err;
      me.last = new Date().toISOString();
      store.set('imr-coral-sync', me);
      if (JSON.stringify(P) !== before && /^#(progress|quiz-board)$/.test(location.hash)) route();
      return j;
    })
    .catch(() => null)
    .finally(() => {
      syncing = null;
      if (syncAgain) {
        syncAgain = false;
        syncPush();
      }
      if (SYNC === me) bindSync();
    });
  return syncing;
}
window.addEventListener('online', syncPull);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - pulledAt > 30000) syncPull();
});
// Players' reports (Pierre, 2026-11-01): in a game, once the answer is out, "⚑ Report a problem" opens a small dialog:
// wrong answer (with a field for the right genus), several corals, bad photo, other, plus an optional note. A report
// carries the photos shown, the expected genus and the answer given. It waits in localStorage 'imr-reports' and goes to
// the sheet's "Reports" tab (Code.gs v7: POST {reports, rname, rpin}; the sync name and code when signed in, else the name
// typed in the dialog). An older script answers without rep: true, so reports stay queued until Pierre redeploys.
// Nothing changes on the site: Pierre reads reports, with who sent them, in the admin Triage.
// Also everywhere else it makes sense (Pierre, 2026-11-01): any enlarged photo (lightbox), the bottom of a genus sheet,
// and "Send feedback" in the footer of every page. The reasons offered depend on where the report comes from (k).
const REP_WHY = {
  game: [
    ['wrong', 'Wrong answer'],
    ['multi', 'Several corals'],
    ['photo', 'Bad photo'],
    ['other', 'Other']
  ],
  photo: [
    ['wrong', 'Wrong genus'],
    ['multi', 'Several corals'],
    ['photo', 'Bad photo'],
    ['other', 'Other']
  ],
  sheet: [
    ['info', 'Wrong information'],
    ['photo', 'Bad photo'],
    ['other', 'Other']
  ],
  page: [
    ['info', 'Wrong information'],
    ['bug', 'Bug'],
    ['idea', 'Suggestion'],
    ['other', 'Other']
  ]
};
// Context of each Report button drawn: {k: kind, g: genus concerned, a: answer given, ph: photo files, m: game or kind}.
const REPC = [];
const repBtn = (c, label = '⚑ Report a problem') =>
  `<button type="button" class="linkish rep" data-rep="${REPC.push(c) - 1}">${label}</button>`;
// Genus of a photo file, for photos opened without one (lecture comparison images have none).
const genusOfPhoto = f => {
  for (const [n, g] of Object.entries(DATA.gen)) {
    if (VIEWS.some(([v]) => [...(g.views[v] || []), ...((g.more || {})[v] || [])].some(p => p.f === f))) return n;
  }
  return '';
};
// Each report keeps who sent it (rn, rp: the sync account or the name typed, at the time of sending), so a report
// retried after another player signs in is never credited to them. One batch per sender, at most 50 (the script's cap).
function sendReports() {
  const L = store.get('imr-reports', []);
  if (!SYNC_URL || LOCAL || !L.length || navigator.onLine === false) return;
  const k = x => JSON.stringify([x.rn || '', x.rp || '']),
    first = L.filter(x => k(x) === k(L[0])).slice(0, 50);
  const reports = first.map(({rn, rp, ...x}) => x);
  fetch(SYNC_URL, {method: 'POST', body: JSON.stringify({rname: first[0].rn || '', rpin: first[0].rp || '', reports})})
    .then(r => r.json())
    .then(j => {
      if (!j || !j.rep) return;
      const sent = new Set(first.map(x => x.id)),
        left = store.get('imr-reports', []).filter(x => !sent.has(x.id));
      store.set('imr-reports', left);
      if (left.length) sendReports();
    })
    .catch(() => {});
}
window.addEventListener('online', sendReports);
{
  const ft = document.querySelector('footer p');
  if (ft) ft.insertAdjacentHTML('beforeend', ` ${repBtn({k: 'page'}, 'Send feedback')}`);
}
setTimeout(sendReports, 4000);
document.addEventListener(
  'click',
  e => {
    const b = e.target.closest && e.target.closest('[data-rep]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    const c = REPC[+b.dataset.rep];
    if (c) reportDialog(c, b);
  },
  true
);
function reportDialog(c, btn) {
  let d = document.getElementById('repdlg');
  if (d) d.remove();
  d = document.createElement('dialog');
  d.id = 'repdlg';
  d.className = 'repdlg';
  const names = [...Object.keys(DATA.gen), ...bonusOpen()].sort(),
    kind = c.k || 'game',
    where = hashNow() || 'home';
  d.innerHTML = `<form method="dialog">
    <h3>${kind === 'page' ? 'Send feedback' : 'Report a problem'}</h3>
    <div class="repwhy" role="radiogroup" aria-label="Problem">${REP_WHY[kind].map(([k, t], i) => `<label><input type="radio" name="why" value="${k}"${i ? '' : ' checked'}><span>${t}</span></label>`).join('')}</div>
    <label class="repf" data-for="wrong">Right genus, if you know<input name="fix" list="repgen" autocomplete="off" maxlength="60" placeholder="e.g. ${esc(names.find(n => n !== c.g) || '')}"></label>
    <datalist id="repgen">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    <label class="repf"><span>Note <small>(optional)</small></span><textarea name="note" rows="2" maxlength="1000"></textarea></label>
    ${SYNC ? '' : `<label class="repf">Your name<input name="who" maxlength="40" autocomplete="name" value="${esc(store.get('imr-report-name', ''))}"></label>`}
    <div class="repbtns"><button type="button" class="next sec" value="cancel">Cancel</button><button type="submit" class="next" value="send">Send</button></div>
  </form>`;
  document.body.appendChild(d);
  const f = d.querySelector('form'),
    fix = d.querySelector('[data-for="wrong"]');
  const upd = () => {
    fix.hidden = f.why.value !== 'wrong';
  };
  f.querySelectorAll('[name="why"]').forEach(r => (r.onchange = upd));
  upd();
  d.querySelector('[value="cancel"]').onclick = () => d.close();
  d.addEventListener('close', () => d.remove());
  d.addEventListener('keydown', e => e.stopPropagation()); // Escape closes this dialog only, not the photo under it
  f.onsubmit = e => {
    e.preventDefault();
    if (f.who) store.set('imr-report-name', f.who.value.trim());
    const why = f.why.value;
    const who = SYNC ? {rn: SYNC.name, rp: SYNC.pin} : {rn: f.who.value.trim()};
    store.set(
      'imr-reports',
      [
        ...store.get('imr-reports', []),
        {
          ...who,
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          t: new Date().toISOString(),
          why,
          g: c.g || '',
          a: c.a || '',
          ph: (c.ph || []).join(' '),
          m: c.m || kind,
          w: where,
          fix: why === 'wrong' ? f.fix.value.trim() : '',
          note: f.note.value.trim()
        }
      ].slice(-200)
    );
    d.close();
    sendReports();
    btn.textContent = kind === 'page' ? 'Thank you' : '⚑ Reported, thank you';
    btn.disabled = true;
  };
  d.showModal();
  d.querySelector('input[name="why"]').focus();
}
// What is wrong with the sync, in words, or '' when everything is saved.
function syncTrouble() {
  if (!SYNC_URL || !SYNC) return '';
  if (SYNC.err === 'pin') return 'Not saved: code refused';
  if (SYNC.err === 'gone')
    return SYNC.into ? `Not saved: this account was merged into ${SYNC.into}` : 'Not saved: this account was removed';
  // Too many wrong codes for this name (anyone can cause it): say so rather than "could not reach the sheet" (code re-review L3).
  if (SYNC.err === 'wait') return 'Not saved yet: too many wrong codes for this name, try again in 10 minutes';
  const n = (SYNC.log || []).length;
  if (SYNC.err) return n ? `Not saved yet: ${n} answer${n > 1 ? 's' : ''} waiting` : 'Not saved yet: could not reach the sheet';
  return '';
}
// Answers played before signing in (LOG0) and the one-time sign-in card (NUDGE): outside the imr-coral-* keys, so they
// never travel in the progress data sent to the sheet.
const LOG0 = 'imr-log0',
  NUDGE = 'imr-nudge',
  ANONB = 'imr-anon-base',
  ANONID = 'imr-anon-id',
  ANONQ = 'imr-anonq';
// Anonymous answers (Pierre, 2026-11-01): a player who never signs in still helps rate the photos and the confusions.
// Their answers go to the sheet under a random id made on this device ("~anon <id>": no name, no code), in small
// batches (sheet script v12; an older script answers 'input' and they simply wait here). Signing in later moves them to
// the player's name (anon in the first send; the sheet skips answers it already has, by id), and a new id is made.
const anonId = () => {
  let id = store.get(ANONID, '');
  if (!/^[a-z0-9]{10}$/.test(id)) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(10)), b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
    store.set(ANONID, id);
  }
  return id;
};
let anonTimer = 0,
  anonBusy = false;
const anonSoon = () => {
  clearTimeout(anonTimer);
  anonTimer = setTimeout(sendAnon, store.get(ANONQ, []).length >= 10 ? 0 : 20000);
};
function sendAnon() {
  const q = store.get(ANONQ, []);
  if (SYNC || !SYNC_URL || LOCAL || anonBusy || !q.length) return;
  const batch = q.slice(0, 100);
  anonBusy = true;
  fetch(SYNC_URL, {method: 'POST', keepalive: true, body: JSON.stringify({anon: anonId(), anonAnswers: batch})})
    .then(r => r.json())
    .then(j => {
      if (!j || !j.log) return;
      const done = new Set(batch.map(x => x.id)),
        left = store.get(ANONQ, []).filter(x => !done.has(x.id));
      store.set(ANONQ, left);
      // More than one batch waiting (played offline): the next one follows; a refused batch ('busy') is not retried here.
      if (left.length) setTimeout(sendAnon, 1000);
    })
    .catch(() => {})
    .finally(() => {
      anonBusy = false;
    });
}
// Events (Pierre, 2026-11-02: most RAs will not report problems, so the app reports what it can by itself; sheet v19
// events_): app errors, photos that still fail after their retries, saves that fail while online, and the answers to the
// occasional one-tap question (pulse). Anonymous: a random device id of its own (EVID, never a name or the answers' id),
// the app version and a short browser name. Queued here (EVQ, at most 50) and sent in small batches; never from a local
// copy (LOCAL) nor without the sync URL. At most EV_MAX reports a visit, the same message once.
const EVID = 'imr-dev-id',
  EVQ = 'imr-evq',
  EV_MAX = 15;
const evSeen = new Set();
let evTimer = 0,
  evBusy = false;
const devId = () => {
  let id = store.get(EVID, '');
  if (!/^[a-z0-9]{10}$/.test(id)) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(10)), b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
    store.set(EVID, id);
  }
  return id;
};
const appVer = () => ((document.querySelector('link[href*="app.js?v="]') || {}).href || '').replace(/^.*\?v=/, '');
const uaShort = () => {
  // Edge, Opera and Samsung Internet also carry "Chrome/": their own token first (Codex review #343).
  const u = navigator.userAgent,
    T = [
      ['Edge', /Edg(?:A|iOS)?\/(\d+)/],
      ['Opera', /OPR\/(\d+)/],
      ['Samsung', /SamsungBrowser\/(\d+)/],
      ['Firefox', /(?:Firefox|FxiOS)\/(\d+)/],
      ['Chrome iOS', /CriOS\/(\d+)/],
      ['Chrome', /Chrome\/(\d+)/],
      ['Safari', /Version\/(\d+).*Safari/]
    ],
    m = T.map(([b, re]) => [b, u.match(re)]).find(([, x]) => x);
  return `${m ? m[0] + ' ' + m[1][1] : 'other'}${/Mobi|Android/.test(u) ? ' mobile' : ''}`;
};
function ev(k, o = {}) {
  const key = k + '|' + (o.msg || o.f || o.r || '');
  if (k !== 'pulse' && (evSeen.has(key) || evSeen.size >= EV_MAX)) return;
  evSeen.add(key);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  store.set(
    EVQ,
    [
      ...store.get(EVQ, []),
      {id, t: new Date().toISOString(), k, pg: (location.hash || '#home').slice(1, 60), av: appVer(), ua: uaShort(), ...o}
    ].slice(-50)
  );
  clearTimeout(evTimer);
  evTimer = setTimeout(sendEvents, k === 'pulse' ? 2000 : 10000);
}
function sendEvents() {
  const q = store.get(EVQ, []);
  if (!SYNC_URL || LOCAL || evBusy || !q.length || navigator.onLine === false) return;
  const batch = q.slice(0, 50);
  evBusy = true;
  fetch(SYNC_URL, {method: 'POST', keepalive: true, body: JSON.stringify({dev: devId(), events: batch})})
    .then(r => r.json())
    .then(j => {
      // Sent, or refused for good (an older sheet answers 'input', a full window 'busy'): either way they leave the queue.
      if (!j || (!j.ev && j.error !== 'input' && j.error !== 'busy')) return;
      const done = new Set(batch.map(x => x.id));
      store.set(
        EVQ,
        store.get(EVQ, []).filter(x => !done.has(x.id))
      );
    })
    .catch(() => {})
    .finally(() => {
      evBusy = false;
    });
}
// App errors: script errors and promise rejections, with where they happened. Not the photo and stylesheet load errors
// (those are elements, handled where they retry).
window.addEventListener('error', e => {
  if (!e.message || e.target !== window) return;
  ev('err', {
    msg: String(e.message).slice(0, 300),
    src: `${String(e.filename || '')
      .replace(/^.*\//, '')
      .replace(/\?.*$/, '')}:${e.lineno || 0}:${e.colno || 0}`
  });
});
window.addEventListener('unhandledrejection', e => {
  const r = e.reason;
  // A failed fetch while offline is no error of the app.
  if (navigator.onLine === false || (r && r.name === 'TypeError' && /fetch|network|load failed/i.test(r.message || ''))) return;
  ev('err', {msg: ('Unhandled: ' + (r && (r.message || r)) || '').slice(0, 300), src: String((r && r.stack) || '').split('\n')[1] || ''});
});
window.addEventListener('online', sendEvents);
window.addEventListener('online', sendAnon);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    sendAnon();
    sendEvents();
  }
});
// Signing in. A new name keeps what this device holds and sends it. A known account (found) is merged with what was
// played here before signing in: the sheet's settings and quiz state win, the progress of both adds up (mergeProgress
// with an empty base), then the page reloads and the start-up sync sends the merged progress. Either way the answers
// played before signing in join the log for the sheet's Answers tab. Before 2026-11-01 a known account replaced the
// device's progress, so a beta tester who played first and signed in later lost it.
function signIn(name, pin, j) {
  SYNC = {name, pin, dirty: true, log: store.get(LOG0, []), ...(store.get(ANONID, '') ? {anon: store.get(ANONID, '')} : {})};
  try {
    [LOG0, ANONQ, ANONID].forEach(k => localStorage.removeItem(k));
  } catch (e) {}
  if (!j.found) {
    try {
      localStorage.removeItem(ANONB);
    } catch (e) {}
    return store.set('imr-coral-sync', SYNC);
  }
  let R = {};
  try {
    R = JSON.parse(j.data['imr-coral-progress'] || '{}') || {};
  } catch (e) {}
  SYNC.base = R;
  // Only what was played while signed out counts: the delta from ANONB (the progress before the first anonymous answer)
  // is added to the sheet's. Progress left by a sign-out made before sign-out cleared the device (2026-11-01) is in
  // ANONB, so it is neither counted twice nor credited to another account.
  const anon = SYNC.log.length > 0,
    M = anon ? mergeProgress(store.get(ANONB, {}) || {}, P, R) : R;
  try {
    localStorage.removeItem(ANONB);
  } catch (e) {}
  // The account's settings replace this device's, except the achievements: earned here before signing in, they join the
  // account's (code review #324).
  const mine = store.get(ACHK, null);
  loadData(Object.fromEntries(Object.entries(j.data || {}).filter(([k]) => k !== 'imr-coral-progress')));
  if (mine) achMerge(JSON.stringify(mine));
  store.set('imr-coral-progress', M);
  if (!anon) delete SYNC.dirty;
  store.set('imr-coral-sync', SYNC);
  try {
    sessionStorage.setItem('imr-coral-loaded', 'the IMR sheet');
  } catch (e) {}
  location.reload();
}
// One sign-in card, once, after 10 answers played without an account (Pierre, 2026-11-01: beta testers must sign in
// early so their progress reaches the sheet). Never in Pierre's admin browser. "Later" closes it for good.
const nudgeDue = () =>
  !SYNC &&
  SYNC_URL &&
  !HAS_ADMIN_TOKEN &&
  !document.querySelector('#tour, .unlock') &&
  !store.get(NUDGE, 0) &&
  store.get(LOG0, []).length >= 10;
// once = the one-time card (marks it used); play = once signed in, its button opens the photo quiz (skipped tour).
// The header's Sign in button opens it with neither: it closes with "Close" or "Done".
function signinNudge(once = true, play = !once) {
  if (once) store.set(NUDGE, 1);
  const d = document.createElement('div');
  d.className = 'unlock signnudge';
  d.setAttribute('role', 'dialog');
  d.setAttribute('aria-modal', 'true');
  d.setAttribute('aria-label', 'Sign in');
  d.innerHTML = `<div class="ulcard"><section class="sync tsync"></section><div class="ulbtns"><span></span><button class="next sec" type="button">Later</button></div></div>`;
  document.body.appendChild(d);
  const box = d.querySelector('.tsync'),
    btn = d.querySelector('.ulbtns button');
  const close = () => {
    d.remove();
    document.removeEventListener('keydown', key, true);
    bindSync();
    const nb = document.getElementById('next');
    if (nb) nb.focus({preventScroll: true});
  };
  const key = e => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    } else if (e.key === 'Enter' && !(e.target.closest && e.target.closest('form'))) {
      e.stopPropagation();
      e.preventDefault();
      close();
    }
  };
  document.addEventListener('keydown', key, true);
  // From a skipped tour, the card ends on the games: once signed in, its button starts the photo quiz.
  btn.onclick = () => {
    close();
    if (play && SYNC) go('quiz');
  };
  d.addEventListener('click', e => {
    if (e.target === d) close();
  });
  const label = () => {
    btn.textContent = SYNC ? (play ? 'Start playing' : 'Done') : once || play ? 'Later' : 'Close';
    btn.classList.toggle('sec', !SYNC);
  };
  label();
  bindSync(box);
  new MutationObserver(label).observe(box, {childList: true});
}
// The account box: the top of ⚙ (#sync), or the sign-in card (tour, nudge, header button) while one is open.
function bindSync(box = document.querySelector('.tsync') || document.getElementById('sync')) {
  showProg();
  if (!box) return;
  box.classList.remove('on', 'warn');
  const msg = t => (box.querySelector('[role=status]').textContent = t);
  if (SYNC) {
    // Signed in and saved: one quiet line, actions in view. Trouble (unsent answers, refused code): a box that stands out.
    const bad = syncTrouble(),
      when = SYNC.last ? new Date(SYNC.last).toLocaleString([], {dateStyle: 'short', timeStyle: 'short'}) : '';
    box.classList.add(bad ? 'warn' : 'on');
    box.innerHTML = bad
      ? `<p><b>${bad}</b></p><p class="note">${SYNC.err === 'gone' ? (SYNC.into ? `Your trainer merged this name into <b>${esc(SYNC.into)}</b> (the same person). Your answers now count there: sign out, then sign in as ${esc(SYNC.into)} with that name's code.` : 'Your trainer removed this account. Sign out, then sign in again to start a new one.') : SYNC.err === 'pin' ? 'The sheet refused the code for this name. Sign out and sign in again with the right code.' : SYNC.err === 'wait' ? 'Someone typed wrong codes for this name several times, so the sheet waits 10 minutes. Your answers are kept on this device.' : 'Your answers are kept on this device and sent as soon as the sheet can be reached.'}${when ? ` Last saved ${when}.` : ''}</p>
        <button class="chip go" type="button" id="snow">Try again</button> <button class="reset" type="button" id="soff">Sign out</button> <span class="note" role="status"></span>`
      : SYNC.dirty || (SYNC.log || []).length // answers not confirmed yet, no error so far: say so, quietly
        ? `<p class="sline"><span class="sdot wait"></span><span>Saving for IMR as <b>${esc(SYNC.name)}</b>…</span>
        <button class="linkish" type="button" id="snow">Send now</button><button class="linkish" type="button" id="soff">Sign out</button></p><span class="note" role="status"></span>`
        : `<p class="sline"><span class="sdot"></span><span>Saved for IMR as <b>${esc(SYNC.name)}</b>${when ? ` · ${when}` : ''}</span>
        <button class="linkish" type="button" id="snow">Send now</button><button class="linkish" type="button" id="soff">Sign out</button></p><span class="note" role="status"></span>`;
    box.querySelector('#snow').onclick = () => {
      msg('Sending…');
      syncPush().then(j => {
        if (!(j && j.ok))
          msg(j && j.error === 'pin' ? 'The sheet refused the code for this name.' : 'Could not reach the sheet. Check your connection.');
      });
    };
    // Signing out also clears this device's progress (it is in the sheet): the next player starts empty, and progress
    // left here is always the anonymous play of whoever signs in next, which signIn merges into their account.
    // Answers not saved yet: a second click confirms.
    const off = box.querySelector('#soff');
    off.onclick = () => {
      if ((SYNC.dirty || (SYNC.log || []).length) && !off.dataset.armed) {
        off.dataset.armed = '1';
        off.textContent = 'Sign out: unsaved answers are lost';
        return;
      }
      SYNC = null;
      // Achievements and the leaderboard choice belong to the account too: never left to the next player of a shared device.
      ['imr-coral-sync', 'imr-coral-progress', 'imr-coral-quiz', 'imr-coral-reset', ACHK, BOARD, LOG0, NUDGE, ANONB, ANONID, ANONQ].forEach(
        k => {
          try {
            localStorage.removeItem(k);
          } catch (e) {}
        }
      );
      location.reload();
    };
    return;
  }
  // ⚙ while signed out: one line; the form itself is in the sign-in card.
  if (box.id === 'sync') {
    box.innerHTML = `<p class="sline"><span>Not signed in: your progress stays on this device.</span><button class="linkish" type="button" id="sin">Sign in</button></p>`;
    box.querySelector('#sin').onclick = () => {
      setOpen(false);
      signinNudge(false, false);
    };
    return;
  }
  box.innerHTML = `<h3>Sign in to save your progress</h3><p>Training at IMR? Sign in with your name and a 4-digit code: your progress is saved for your trainer and comes back on any device.</p>
    <form class="sform"><label>Your name <input name="n" required maxlength="40" autocomplete="name"></label>
    <label>4-digit code <input name="p" required inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off"></label>
    <button class="${box.classList.contains('tsync') ? 'next' : 'chip go'}" type="submit">Sign in</button> <span class="note" role="status"></span></form>
    <p class="note">New name: pick any code and remember it. Same name and code later: your saved progress comes back.</p>`;
  box.querySelector('form').onsubmit = e => {
    e.preventDefault();
    const f = e.target,
      name = f.n.value.trim(),
      pin = f.p.value.trim();
    msg('Connecting…');
    fetch(`${SYNC_URL}?name=${encodeURIComponent(name)}&pin=${encodeURIComponent(pin)}`)
      .then(r => r.json())
      .then(j => {
        if (!j.ok)
          return msg(
            j.error === 'gone'
              ? j.into
                ? `This name was merged into ${j.into}: sign in as ${j.into}.`
                : 'This name and code were removed: pick another code to start again.'
              : j.error === 'pin'
                ? 'This name already exists with another code.'
                : j.error === 'wait'
                  ? 'Too many wrong codes for this name: try again in 10 minutes.'
                  : 'Check the name and the 4-digit code.'
          );
        signIn(name, pin, j);
        if (!j.found) syncPush().then(() => bindSync());
      })
      .catch(() => msg('Could not reach the sheet. Check your connection.'));
  };
}
// Ask the browser not to evict saved progress when storage runs low.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
document.getElementById('sync').hidden = !SYNC_URL;
