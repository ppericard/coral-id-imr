// IMR Reef ID: hash-routed single page. Data comes from data.json (written by tools/datajson.py, one genus per line).
// First of all, the storage keys from before the rename to IMR Reef ID move to their new names (core.js migrateKeys):
// nothing below may read a key before this line. The theme script of index.html reads both names itself.
migrateStorage();
migrateRoutes(); // old page names and addresses in this device's data move once (core.js)
let DATA;
const $v = document.getElementById('view');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
// Links built from data (photo sources): only https, anything else becomes '#'.
// An old http:// link (one iNat observation in data.json) is upgraded to https, not dropped.
const safeUrl = u => {
  const s = String(u || '').replace(/^http:\/\//i, 'https://');
  return /^https:\/\//i.test(s) ? s : '#';
};
// Page keyboard handlers (quiz, look-alikes): each new question or pair aborts the previous handler instead of
// stacking one more on document.
let keysAC = null;
const viewKeys = () => {
  if (keysAC) keysAC.abort();
  keysAC = new AbortController();
  return keysAC.signal;
};
// A side file that failed to load: the app goes on without it, but says so in the console (and to Pierre).
const softFail = (what, d) => e => {
  console.warn(`${what} not loaded:`, (e && e.message) || e);
  if (typeof IS_ADMIN !== 'undefined' && IS_ADMIN)
    setTimeout(() => {
      const t = document.createElement('p');
      t.className = 'note';
      t.style.cssText =
        'position:fixed;left:8px;bottom:8px;z-index:99;background:var(--bg,#fff);padding:4px 8px;border:1px solid currentColor;border-radius:6px';
      t.textContent = `Admin: ${what} not loaded`;
      document.body.append(t);
      setTimeout(() => t.remove(), 8000);
    }, 500);
  return d;
};
// Window size classes, the same values as the media queries in app.css (one source of truth, see its header):
// phone < 600 px · tablet 600-1023 px (tablets, and a desktop window snapped to half a screen) · desktop >= 1024 px.
const MQ = {phone: '(max-width:599.98px)', stack: '(max-width:1023.98px)', touch: '(hover:none), (pointer:coarse)'};
const isPhone = () => matchMedia(MQ.phone).matches;
const isStacked = () => matchMedia(MQ.stack).matches; // phone + tablet: games and side panels go to one column
// Addresses (docs/ARCHITECTURE.md "Pages and routing"): #<section>/<page>/<thing>?<filters> in the words on screen, the
// subject's prefix first for a subject other than the corals (#fish/practice/quiz). The code names a page by its page key
// ('genera', 'g-Acropora', 'quiz-duel|A|B'…); core.js routeIn and routeOut translate, here only (hashNow, hr).
// The address on screen read (core.js routeIn: split before decoding, so a malformed %-escape does not throw).
// The subject's Identify tool (UNITS identify), '' for a subject with no key built: its Home has the one door, it has no
// Identify tab, and an Identify address opens its Home (subjPage). routeIn needs a name for the address, so a subject
// with no key reads as the corals' key there; subjPage sends it Home.
const keyOf = S => UNITS[S.id].identify || '';
const routeNow = () => routeIn(location.hash, S => keyOf(S) || 'idkey');
// The page key of the address on screen; an old or unknown address gives the page route() sends it to (its section's
// page, else Home: no old address is translated, rule W3).
const hashNow = () => {
  const r = routeNow();
  return r.key != null ? r.key : r.fall;
};
// The link of page key k ('#' and its address; Home '#', hrFull its clean URL) for subject S, or for the first subject
// that has the page (a genus sheet from the Tools with Fish chosen: the corals'). A sheet is S's only when its id names
// one of S's sheets (core.js sheetIdOf: f:Damselfishes), its link built from that id's one spelling (t01 renamed).
const subjHas = (S, k) => {
  const t = sectionOf(k),
    m = k.startsWith('g-') ? 'sheet' : modeOf(k);
  if (m === 'sheet') return S.pages.includes(m) && sheetIdOf(S, k.slice(2)) != null;
  // A comparison is S's only when both its units are S's (a coral pair with Fish chosen is the corals': like a sheet).
  if (k.startsWith('cmp-'))
    return (
      S.pages.includes(m) &&
      k
        .slice(4)
        .split('|')
        .every(n => sheetIdOf(S, n) != null)
    );
  return t === 'identify' ? keyOf(S) === m : (t !== 'learn' && t !== 'practice') || S.pages.includes(m);
};
const hr = (k, S = SUBJ) => {
  const T = subjHas(S, k) ? S : SUBJECTS.find(x => subjHas(x, k)) || S;
  return '#' + (routeOut(k.startsWith('g-') ? 'g-' + (sheetIdOf(T, k.slice(2)) || k.slice(2)) : k, T) || '');
};
// The full URL of page key k: Home is the page's clean URL, with no '#'.
const hrFull = (k, S = SUBJ) => (routeOut(k, S) ? hr(k, S) : location.pathname + location.search);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
// Admin-only controls (Lab keep/trim, the Key's start switch, ⚑ flag) show only where the admin page holds its token
// (reefid-admin-vault), the test flag.js uses; ⚙ View: User (reefid-admin-view) hides them, the token kept.
const HAS_ADMIN_TOKEN = (() => {
  try {
    return !!localStorage.getItem('reefid-admin-vault');
  } catch (e) {
    return false;
  }
})();
const IS_ADMIN =
  HAS_ADMIN_TOKEN &&
  (() => {
    try {
      return localStorage.getItem('reefid-admin-view') !== 'user';
    } catch (e) {
      return true;
    }
  })();
// The engine's state version (docs/ARCHITECTURE.md "The state version and its views"): one counter, STATE_V, bumped by
// every write of an input of the views and only by those (stateBump). The inputs: the records P, the quiz settings Q, the
// intro map and its offer, the first-launch records, the sheet's version, the photo statistics, the data in force (DATA,
// the tree TREEU, the curation) and the subject. Their writers bump it: store.set of an input's key (STATE_KEYS), the
// scorer's caller and its writes to the record (quiz.js recordAnswer, model.js answeredAt, varRight), every
// recalculation (model.js mxRecalc), sync.js's refills of P, a subject switch or visit (subjectLoad, inSubject), a data
// or tree build (build, treeBuild, treePull, rankPhotos), the statistics joined (model.js statsJoin), a record made (st),
// a reset, and the files whose functions the views read, as they load (model.js, sync.js). The other keys an answer
// writes (its queue, the comeback, the pending question, the achievements) are no input and bump nothing. The writers
// outside this block call it guarded (typeof), as in model.js, quiz.js and sync.js: the unit tests run parts of these
// files without it.
// The data version, DATA_V, counts the writes of the inputs that do not move with the player's own play: every bump but
// those of the player's records and settings (stateBump('rec'): the records P, the quiz settings Q, the intro map and
// its offer, the first-launch record, a record made, a reset, sync.js's refills of P). The data views (dataView) read
// only the other inputs: the data and the tree in force, the subject, the sheet's version, the photo statistics, the
// files loaded. A bump with no argument moves both versions, so a writer not sorted makes the data views again too.
let STATE_V = 0;
let DATA_V = 0;
const stateBump = rec => void (STATE_V++, rec === 'rec' || DATA_V++);
// sync.js SHEETV; model.js OWN_STATS + a subject's id (tests/stateview.test.js checks both names). REC_KEYS: those of the
// player's records and settings (stateBump('rec')).
const REC_KEYS = new Set(SUBJECTS.flatMap(S => ['progress', 'quiz', 'intro', 'intro-offer', 'start'].map(k => subjKey(S.id, k)))),
  STATE_KEYS = new Set([...REC_KEYS, 'reefid-sheet-v', 'reefid-photo-stats', ...SUBJECTS.map(S => 'reefid-photo-stats-' + S.id)]);
// Storage freshness, one check per task (docs/spec/storage.md "Keys read many times an answer"). A stored text read
// many times (sync.js keptEntry, stateNow below) is compared with the text kept at its first read in a task, then
// trusted until the task's microtasks run (freshEnd, queued then) or this tab writes the key (storeWrote). Within a task
// only this tab changes what the storage reads: another tab's write reaches this page between its tasks (Chromium
// applies it to the page's copy from a message, a task of its own; Firefox reads through a snapshot kept until the
// task's end), so the next task's first read compares and sees it (were it readable mid-task, it would be seen one task
// late, as if written after the task). No storage event is listened to: it is not sent for every change (the browser's
// own tools), and the comparison needs none. Every write of this tab calls storeWrote(k):
// store.set, store.drop, store.raw (the writes that do not go through JSON: sync.js's removals at sign-in and sign-out,
// progress.js loadData, the settings kept as plain text), and sync.js keptPush. Without queueMicrotask (the unit tests
// that run parts of these files) every read compares.
let FRESH_T = 0, // the number of the task in progress, among those that compared a stored text
  freshQ = false; // its end is queued
const FRESH = new Map(); // a key -> the task its stored text was last compared in (sync.js keptEntry)
const freshEnd = () => ((freshQ = false), FRESH_T++);
// The task's number for a comparison made now, its end queued; -1 when no task can be marked (always compare).
function freshNow() {
  if (typeof queueMicrotask !== 'function') return -1;
  if (!freshQ) ((freshQ = true), queueMicrotask(freshEnd));
  return FRESH_T;
}
// k's stored text was compared in this task, and this tab has not written it since.
const freshSeen = k => FRESH.get(k) === FRESH_T;
// A write of k by this tab, whatever wrote it: its text is compared again at the next read, and the text of the key k
// is an old name of (core.js keyRename: keyGet reads the old name while the new one is absent); an input of the views
// bumps the state version (STATE_KEYS).
function storeWrote(k) {
  for (const n of [k, typeof keyRename === 'function' && keyRename(k)])
    if (n) {
      FRESH.delete(n);
      if (STATE_LIVE.includes(n)) STATE_AT = -1;
    }
  if (STATE_KEYS.has(k)) stateBump(REC_KEYS.has(k) ? 'rec' : undefined);
}
// Two inputs are read from storage at every use, kept parsed while their text stays the same (sync.js keptBy): the
// sheet's version (sheetV) and a subject's first-launch record (model.js imrSaid, startV). Their stored text is compared
// at the first read of a view in a task (stateNow), as keptEntry compares it, so a write that went round store.set
// (another tab of the app, a test) bumps the version too. With VIEW_CHECK on, a read that trusts the task's comparison
// compares again, and a difference (a write of this tab without storeWrote) throws.
const STATE_LIVE = ['reefid-sheet-v', ...SUBJECTS.map(S => startKey(S.id))],
  STATE_RAW = STATE_LIVE.map(() => null);
let STATE_AT = -1; // the task of stateNow's last comparison
const stateRaw = k => {
  try {
    return keyGet(localStorage, k);
  } catch (e) {
    return null;
  }
};
function stateNow() {
  if (STATE_AT === FRESH_T) {
    if (VIEW_CHECK.on && STATE_LIVE.some((k, i) => stateRaw(k) !== STATE_RAW[i]))
      viewFail('stateNow: a stored text changed in this task without storeWrote');
    return STATE_V;
  }
  // A first-launch record is the player's own (stateBump('rec')); the sheet's version (the first key) is data.
  let ch = '';
  STATE_LIVE.forEach((k, i) => {
    const raw = stateRaw(k);
    if (raw !== STATE_RAW[i]) ((STATE_RAW[i] = raw), (ch = i && ch !== 'all' ? 'rec' : 'all'));
  });
  if (ch) stateBump(ch === 'rec' ? 'rec' : undefined);
  STATE_AT = freshNow();
  return STATE_V;
}
// A view (the units in play: bonusList, pool, sciUp, shareFree): f's value, computed at its first read in a version and
// read again as it is until the next. f is a function of the inputs alone (no clock, no random number, no planner's
// memory), so the value kept is the one f would give now; a list keeps its order, so every draw that reads it draws the
// same. A value is shared, not a copy: its readers never change it. The version is taken before f runs, so a write
// during f leaves the value to be computed again at the next read.
// VIEW_CHECK.on (the smokes and tools/learnsim.js --facheck: tests/facheck.js): every read of a kept value computes f
// again and compares, order included; a difference (an input written with no bump, a reader that changed the shared
// value) throws, and again in a task of its own, so a reader that catches its errors cannot hide it. Lists, Sets and
// Maps are compared item by item in order, plain objects key by key in order (the tree's score), down to their leaves.
const VIEW_CHECK = {on: typeof window !== 'undefined' && window.VIEW_CHECK_ON === true};
const viewItems = v => (v instanceof Set || v instanceof Map ? [...v] : v);
const viewSame = (a, b) => {
  if (Object.is(a, b)) return true;
  if (a instanceof Set !== b instanceof Set || a instanceof Map !== b instanceof Map) return false;
  const x = viewItems(a),
    y = viewItems(b);
  if (Array.isArray(x) || Array.isArray(y))
    return Array.isArray(x) && Array.isArray(y) && x.length === y.length && x.every((n, i) => viewSame(n, y[i]));
  if (!x || !y || typeof x !== 'object' || typeof y !== 'object') return false;
  const kx = Object.keys(x),
    ky = Object.keys(y);
  return kx.length === ky.length && kx.every((k, i) => k === ky[i] && viewSame(x[k], y[k]));
};
// A difference VIEW_CHECK found: thrown, and again in a task of its own.
const viewFail = m => {
  const e = new Error(m);
  setTimeout(() => {
    throw e;
  });
  throw e;
};
const viewDiff = (kind, name) =>
  viewFail(`${kind} view ${name}: the value kept differs from a computation now (an input written without stateBump?)`);
// f's value kept while now() (the version) stays the same.
// point: its readers check each value they read instead (the units met, model.js introduced: a record written by hand
// for another key, a smoke's P[LEVEL], changes no value read), so VIEW_CHECK does not compare the whole value.
function verView(kind, name, f, now, point = false) {
  let at = -1,
    v;
  return () => {
    const t = now();
    if (at !== t) {
      v = f();
      at = t;
      return v;
    }
    if (VIEW_CHECK.on && !point && !viewSame(v, f())) viewDiff(kind, name);
    return v;
  };
}
function stateView(name, f, point = false) {
  return verView('state', name, f, stateNow, point);
}
// The data version now: the stored texts compared first (stateNow), as for a state view.
const dataNow = () => (stateNow(), DATA_V);
// A view of one argument k (a rank class, a unit), f(k) kept per k and per version: the values of a version are dropped
// at the next (now: stateNow or dataNow). The same rules and the same check as stateView, value by value. k is a string,
// a number or an object (a Map's key: the same value or the same object, the same entry).
// view.fn(): the view for a loop with nothing written during it (as model.js introducedFn): the version is read once,
// then a value kept in it is a lookup; any other read (a value not kept yet, VIEW_CHECK on, a newer version read since)
// goes through the view. The reads stay anonymous closures, as every view's (the answer cost counts named calls).
const withFn = (read, fn) => ((read.fn = fn), read);
function keyView(kind, name, f, now) {
  let at = -1,
    read = null;
  const M = new Map();
  const fn = () => {
    const t = now();
    if (at !== t) ((at = t), M.clear());
    return k => (at === t && !VIEW_CHECK.on && M.has(k) ? M.get(k) : read(k));
  };
  return (read = withFn(k => {
    const t = now();
    if (at !== t) ((at = t), M.clear());
    if (!M.has(k)) {
      const v = f(k);
      if (at === t) M.set(k, v);
      return v;
    }
    const v = M.get(k);
    if (VIEW_CHECK.on && !viewSame(v, f(k))) viewDiff(kind, name);
    return v;
  }, fn));
}
const stateViewBy = (name, f) => keyView('state', name, f, stateNow);
// A view of the data version (the rank classes, the units of a class with a photo, the look-alike index): computed once
// per data version, so the player's answers, which move the state version only, do not make it again. f reads the data
// inputs alone (DATA_V's), never the records or the settings; VIEW_CHECK checks it as a state view.
const dataView = (name, f) => verView('data', name, f, dataNow);
const dataViewBy = (name, f) => keyView('data', name, f, dataNow);
// Every write of the storage by this tab calls storeWrote (above): set here; drop for a removal and raw for a text
// written as it is, where a write went round store.set.
const store = {
  get(k, d) {
    try {
      const v = keyGet(localStorage, k); // the key's old name too while a migration waits (core.js keyGet)
      return v === null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
    storeWrote(k); // an input of the views bumps the version
  },
  // localStorage.removeItem(k), which throws as it does (a caller's try decides what follows).
  drop(k) {
    storeWrote(k);
    localStorage.removeItem(k);
  },
  // localStorage.setItem(k, text), the same.
  raw(k, text) {
    storeWrote(k);
    localStorage.setItem(k, text);
  }
};
const VIEWS = [
  ['wide', 'Colony'],
  ['medium', 'Close-up'],
  ['macro', 'Corallites']
];
// A candidate just added in the admin (r: 1) shows from iNaturalist until tools/fetch_approved.py has downloaded it.
const inat = (p, sz) => p.src.replace('/original.', `/${sz}.`);
// A recropped photo keeps its file name, so its URL carries the crop (cr) and rewrite count (iv): without it the
// service worker (photos cache-first) and the browser kept the old file for some sizes (-s 480 px vs 1600 px).
const ver = p => (p.cr || p.iv ? `?c=${(p.cr || []).join('_')}${p.iv ? '.' + p.iv : ''}` : '');
// The site's photos come from Cloudflare R2 (core.js PHOTO_BASE). Once one failed on a page no service worker controls
// (photoFail), AWAY for the visit: a photo with an online original is read from it (core.js photoAway), the others from
// the site's img/; under a worker each failing photo falls back on its own (sw.js photo). PHOTO_BASE '': AWAY at once.
let R2 = !!PHOTO_BASE,
  AWAY = !PHOTO_BASE;
const swOn = () => !!(navigator.serviceWorker && navigator.serviceWorker.controller);
// A file of img/ (a photo with no online original, page art), where this page reads it.
const photoUrl = path => (R2 ? PHOTO_BASE : '') + path;
// One of the site's photo files, on R2 or on the site (not an iNaturalist photo).
const ownPhoto = u => photoLocal(u || '').startsWith('img/');
// Every photo record by name and by online original (core.js photoIndex), for the fallback: built when first needed,
// again once the data was rebuilt (a new curation) or the fish data came.
let PIDX = null,
  PIDX_OF = [];
const photoIdx = () => {
  if (!PIDX || PIDX_OF[0] !== DATA || PIDX_OF[1] !== TREEU) ((PIDX = photoIndex(DATA, TREEU)), (PIDX_OF = [DATA, TREEU]));
  return PIDX;
};
const photoLook = f => photoIdx().f.get(f);
// Four files per photo (tools/photos.py): 240 ('t'), 480 ('s'), 960 ('m') and 1600 px (none) on the long side.
// iNaturalist serves 240 (small), 500 (medium) and 1024 px (large).
// A bare {f} (the Lab's photos, Coral basics') finds its record by name: its online original (R2 switched off: AWAY from the
// start), and its version (ver: a photo whose files were remade, as the IMR lecture photos replaced by their originals, is a
// new address for the caches, whoever asks for it).
const bareF = p => !!p.f && Object.keys(p).length === 1;
const loc = (p, s) => {
  const o = (AWAY && !p.src) || (bareF(p) && DATA) ? photoLook(p.f) || p : p;
  return AWAY && o.src ? photoOnline(o.src, s) : photoUrl(`img/${p.f}${s ? '-' + s : ''}.webp${ver(o)}`);
};
const img = (p, size) => (p.r && p.src ? inat(p, size === 's' ? 'medium' : 'large') : loc(p, size));
// A fish photo's tile (Find the X; tools/fish_game.py): {f}-x.webp, a 360 px square around the fish, its square (xc) and
// rewrite count (iv) in the address so a new tile is a new file for the caches; without one, or once R2 failed, the 480 px file.
const tileSrc = p => (p.xc && !p.r && !AWAY ? photoUrl(`img/${p.f}-x.webp?x=${p.xc.join('_')}${p.iv ? '.' + p.iv : ''}`) : img(p, 's'));
// The tile photos of a tree subject's unit n (UNITS tiles: Find the X, quiz.js planFind), declared once for the fish and the
// sea slugs: its game photos that have the square tile cut around the animal (xc, tools/fish_game.py tile_write, which
// tools/seaslug_game.py shares), so a unit plays it only once photos with an animal's box are in play.
const unitTiles = n => ((GX(n) || {views: {}}).views.wide || []).filter(p => p && p.xc);
// Photo quality (docs/ARCHITECTURE.md "Overview"): the smallest file covering the box at up to 2x density (fit); Saver
// the 480 px file whatever the box, Full the 1600 px one; Auto is Saver on the browser's data saver or slow connection,
// or a slow line measured (linkBps). The enlarged view loads the 1600 px file (Saver: on a click).
let PQ = store.get('reefid-photo-q', 'auto');
// The line as the app measures it (the browsers' estimate misses a ~86 kbit/s field link): network bytes over receiving
// time (Resource Timing, overlaps once, caches nothing) from LINK.MIN bytes, kept (LINK.KEY) for a launch from cache.
// LINK.SLOW 500 kbit/s: a question's 960 px pair (~170 KB) then takes over ~3 s; to recalibrate on the logged links.
const LINK = {SLOW: 5e5, MIN: 40000, KEY: 'reefid-link'};
let linkBps = store.get(LINK.KEY, 0),
  linkAt = 0;
const linkMeasure = () => {
  if (Date.now() - linkAt < 2000 || !window.performance || !performance.getEntriesByType) return linkBps;
  linkAt = Date.now();
  const E = performance
    .getEntriesByType('resource')
    .filter(e => e.transferSize > 0 && e.responseEnd > e.responseStart)
    .sort((a, b) => a.responseStart - b.responseStart);
  let bytes = 0,
    time = 0,
    end = 0;
  E.forEach(e => {
    bytes += e.transferSize;
    if (e.responseEnd > end) time += e.responseEnd - Math.max(e.responseStart, end);
    end = Math.max(end, e.responseEnd);
  });
  if (bytes >= LINK.MIN && time > 0) store.set(LINK.KEY, (linkBps = Math.round((bytes * 8000) / time)));
  return linkBps;
};
// Load times (event 'load', one a visit: the loading order and LINK.SLOW set from real lines), seconds from navigation:
// p0 / t0 the first page and when, qo the quiz opened, q1 its first photo, nx the first other page; pop: the CDN server
// of data.json (x-served-by); the rest at sending (sync.js loadSend). Sent at q1, when hidden, or 3 min after the first
// page. Here, not in sync.js: data.json can arrive before sync.js has run.
const LOADM = {},
  // Served by the offline copy at start-up (read now: the service worker registered later takes the page over).
  SW0 = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
let loadSent = false; // sync.js loadSend
function loadMark(k, v) {
  if (loadSent || k in LOADM) return;
  LOADM[k] = v !== undefined ? v : Math.round(performance.now() / 100) / 10;
  if (k === 't0') setTimeout(loadSend, 180000);
  if (k === 'q1') loadSend();
}
const saver = () => {
  const c = navigator.connection;
  if (PQ !== 'auto') return PQ === 'saver';
  if (c && c.saveData) return true;
  // The app's own measure decides once it has one; the browser's estimate (2g/3g reaches ~1.5 Mbit/s) only before.
  const b = linkMeasure();
  return b > 0 ? b < LINK.SLOW : !!c && /2g|3g/.test(c.effectiveType || '');
};
const fit = px => {
  if (PQ === 'full') return '';
  if (!(px > 0)) return 'm';
  // Saver (chosen, or Auto on a slow line): the 480 px file whatever the box (at 1x a desktop quiz box would still take
  // the 960 px file, two per question).
  if (saver()) return 's';
  const need = px * Math.min(window.devicePixelRatio || 1, 2);
  // A file is never blown up past LOWRES (1.15x): a photo enlarged more is shown whole at its own size (fitStage, fitLow).
  return need <= 520 ? 's' : need <= 1100 ? 'm' : '';
};
// The last quiz photo box (CSS px, long side) for each number of photos on the stage: the next question's files are
// chosen (and preloaded) before its layout exists.
const QBOX = {};
const qsrc = (p, n = 1) => img(p, fit(QBOX[n] || Math.min(innerWidth, 900) / Math.sqrt(n)));
// A shown site photo moved to another size: same name, -s / -m / no suffix (iNaturalist photos keep theirs). Once R2 has
// failed on this page, the photo's online original at that size, or the site's file.
const resized = (u, size) => {
  const v = u.replace(/^((?:https:\/\/[^/]+\/)?img\/.+?)(-[tsm])?\.webp/, `$1${size ? '-' + size : ''}.webp`);
  return AWAY ? photoAway(v, photoLook) : R2 ? v : photoLocal(v);
};
const PXR = {s: 0, m: 1, '': 2}; // rank of each file size
const tierOf = u => (/-[ts]\.webp/.test(u) ? 's' : /-m\.webp/.test(u) ? 'm' : '');
// A photo shown bigger than its file was chosen for gets the bigger file (pages with data-fit call upsize after their
// layout); never after the 480 px fallback (data-low), nor under Saver (only the enlarged view, on a tap).
const upsizeImg = (i, px) => {
  if (saver()) return;
  const u = i.getAttribute('src') || '',
    want = fit(px);
  if (px && !i.dataset.low && ownPhoto(u) && PXR[want] > PXR[tierOf(u)]) i.src = resized(u, want);
};
const upsize = (root = $v) =>
  root.querySelectorAll('img[data-fit]').forEach(i => {
    const r = i.getBoundingClientRect();
    upsizeImg(i, Math.max(r.width, r.height));
  });
// A photo failing on R2: asked once more (core.js photoRetry; a service worker did so already), then its online original
// or the site's file (photoFallback); with no worker R2 is given up for the page once R2_OUT photos failed in a row
// (r2Failed). Before every other error listener.
const photoFail = e => {
  const i = e.target;
  if (!(i instanceof HTMLImageElement)) return;
  // A card's photo stays out of sight while it is asked again (the cards' own error listener, quiz.js, which this one
  // stops, does the same for the retries after it: never a broken-image icon on a card); its load shows it again.
  const hide = () => i.closest('.unlock') && i.classList.add('fail');
  // R2 once more first (core.js photoRetry: a passing error), then the online original or the site; a file that failed
  // so already (its quiz preload) is not asked again.
  if (!swOn() && !r2Missed(i.currentSrc || i.getAttribute('src')) && photoRetry(i, away)) return (hide(), e.stopImmediatePropagation());
  if (away(i)) (hide(), e.stopImmediatePropagation());
};
const away = i => {
  // Under a service worker the 480 px step and the backdrop stay on R2, where the worker keeps its offline copies.
  const sw = swOn(),
    u = i.currentSrc || i.getAttribute('src');
  if (!photoFallback(i, photoLook, sw)) return false;
  if (!sw) (photoFallback(i.closest('figure'), photoLook), r2Failed(u));
  cropWatch();
  return true;
};
// When R2 is given up (docs/decisions/2026-11-21-r2-given-up-after-three.md). On a page no service worker controls, a
// photo that still fails on R2 after its retry (an element, app.js away, or a quiz preload, quiz.js pump) falls back on
// its own; R2 is given up for the visit (r2Out) once R2_OUT different photos failed so in a row, no photo loaded from R2
// in between: R2 down, or a network that blocks it, costs a few failed requests, and one file missing or one passing
// error leaves the other photos on R2. A photo counts once (its sizes and its Find the X tile are one photo, its preload
// and its element one failure); R2MISS: the files that failed so, not asked from R2 once more.
const R2_OUT = 3;
const R2MISS = new Set(),
  R2RUN = new Set();
const r2File = u => photoLocal(String(u || '')).replace(/[?#].*$/, '');
const r2Missed = u => photoOnR2(u) && R2MISS.has(r2File(u));
const r2Failed = u => {
  const x = photoFileOf(u);
  if (!x || !photoOnR2(u)) return;
  R2MISS.add(r2File(u));
  R2RUN.add(x.f.replace(/-x$/, ''));
  if (R2 && R2RUN.size >= R2_OUT) r2Out();
};
const r2Loaded = u => photoOnR2(u) && R2RUN.clear();
// R2 given up: the next photos go to their online original or the site, and the crops are drawn from now on.
const r2Out = () => ((R2 = false), (AWAY = true), cropWatch());
document.addEventListener('error', photoFail, true);
document.addEventListener('load', e => e.target instanceof HTMLImageElement && r2Loaded(e.target.currentSrc), true);
// A cropped photo shown from its online original gets its crop drawn (core.js photoCropOf: the site's files have it baked
// in): every <img> added or given a new src is checked, from the first fallback on (nothing watches before).
let CROPW = null;
if (AWAY) setTimeout(cropWatch); // R2 switched off: crops drawn from the start, once this file has run (TREEU comes below)
const cropSet = i => {
  if (i.style.getPropertyValue('object-view-box') && !i.dataset.vb) return; // a crop drawn by its page (none in the app yet)
  const c = photoCropOf(i.getAttribute('src') || '', photoIdx());
  if (c) (i.style.setProperty('object-view-box', c), (i.dataset.vb = 1));
  else if (i.dataset.vb) (i.style.removeProperty('object-view-box'), delete i.dataset.vb);
};
// A turned photo shown from its online original: the site's files have Pierre's rotation baked in (ro, degrees
// clockwise after the crop: tools/photos.py turn), the original not. A canvas makes crop then turn (turnPlan), given as a
// blob: wherever the element uses the original (src, data-lo, an inline url()); nothing shown before, and one that cannot
// be made (no CORS, a failed download) ends as "photo missing", never upside down. From the first fallback on
// (docs/ARCHITECTURE.md "Served from Cloudflare R2").
const TURN_FAIL = 'data:image/gif;base64,'; // an image that never decodes: the page's usual "did not load"
const TURN_URL = /url\((['"]?)([^'")]+)\1\)/g;
const turnRec = u => {
  const p =
    typeof u === 'string' && u
      ? photoIdx().src.get(u.replace(/#.*$/, '').replace(/\/(?:small|medium|large)\.(\w+)$/, '/original.$1'))
      : null;
  return p && !p.r && [90, 180, 270].includes(+p.ro) ? p : null;
};
// The canvas for a W x H original, crop c [l, t, r, b] (fractions of the original, none = whole) and r degrees
// clockwise: the source rectangle (sx, sy, sw, sh) and the canvas size (w, h), the cut turned a quarter swapping them.
const turnPlan = (W, H, c, r) => {
  const k = Array.isArray(c) && c.length === 4 ? c : [0, 0, 1, 1],
    sw = (k[2] - k[0]) * W,
    sh = (k[3] - k[1]) * H,
    q = r % 180 ? 1 : 0;
  return {sx: k[0] * W, sy: k[1] * H, sw, sh, w: Math.max(1, Math.round(q ? sh : sw)), h: Math.max(1, Math.round(q ? sw : sh)), r};
};
// One picture per address for the visit ('' when it cannot be made: asked again by the next element).
const TURNED = new Map();
const turnJob = (u, p) => {
  if (!TURNED.has(u))
    TURNED.set(
      u,
      new Promise(ok => {
        const im = new Image(),
          no = () => (TURNED.delete(u), ok(''));
        im.crossOrigin = 'anonymous';
        im.onerror = no;
        im.onload = () => {
          try {
            const k = turnPlan(im.naturalWidth, im.naturalHeight, p.cr, +p.ro),
              cv = document.createElement('canvas');
            cv.width = k.w;
            cv.height = k.h;
            const x = cv.getContext('2d');
            x.translate(k.w / 2, k.h / 2);
            x.rotate((k.r * Math.PI) / 180);
            x.drawImage(im, k.sx, k.sy, k.sw, k.sh, -k.sw / 2, -k.sh / 2, k.sw, k.sh);
            cv.toBlob(b => (b ? ok(URL.createObjectURL(b)) : no()), 'image/jpeg', 0.9);
          } catch (e) {
            no(); // a canvas the host's missing CORS header tainted
          }
        };
        im.src = u;
      })
    );
  return TURNED.get(u);
};
// The element's uses of a turned photo's original, swapped for its picture (job: turnJob; the tests give their own).
function turnSet(el, job = turnJob) {
  if (!el || !el.getAttribute) return null;
  const src = el.getAttribute('src') || '',
    lo = el.getAttribute('data-lo') || '',
    st = el.getAttribute('style') || '',
    U = new Map(),
    want = u => {
      const p = turnRec(u),
        k = p && u.replace(/#.*$/, '');
      if (p && !U.has(k)) U.set(k, job(k, p));
      return k;
    },
    s = want(src),
    l = want(lo),
    ss = st.includes('url(') ? st.replace(TURN_URL, (m, q, u) => (want(u) ? 'none' : m)) : st;
  if (!U.size) return null;
  if (s) (el.removeAttribute('srcset'), el.removeAttribute('src'));
  if (l) el.removeAttribute('data-lo');
  if (ss !== st) el.setAttribute('style', ss);
  const urls = [...U.keys()];
  return Promise.all(urls.map(k => U.get(k))).then(B => {
    const b = k => B[urls.indexOf(k)];
    if (!el.isConnected && el.isConnected !== undefined) return;
    if (l && b(l) && !el.hasAttribute('data-lo')) el.setAttribute('data-lo', b(l));
    if (ss !== st && el.getAttribute('style') === ss)
      el.setAttribute(
        'style',
        st.replace(TURN_URL, (m, q, u) => (turnRec(u) ? (b(u.replace(/#.*$/, '')) ? `url('${b(u.replace(/#.*$/, ''))}')` : 'none') : m))
      );
    if (s && !el.hasAttribute('src')) {
      if (b(s)) el.setAttribute('src', b(s));
      // Given up at once (no retry of a picture that cannot be made, no 480 px step): a game photo or a card's ends as the
      // "photo missing" tile (the error listeners), any other photo is left out of sight (no broken-image icon).
      else {
        Object.assign(el.dataset, {retry: '2', low: '1'});
        if (el.closest && !el.closest('.qstage, .unlock')) el.style.visibility = 'hidden';
        el.setAttribute('src', TURN_FAIL);
      }
    }
  });
}
function cropWatch() {
  if (CROPW || typeof MutationObserver === 'undefined') return;
  // A turned photo first (it takes the original's src away: no crop drawn on it), then the crop. A style change only
  // goes through turnSet (cropSet writes the style: it would call itself again).
  const one = n => (turnSet(n), n instanceof HTMLImageElement && cropSet(n)),
    under = n => [n, ...n.querySelectorAll('img, [style*="url("], [data-lo]')].forEach(one);
  CROPW = new MutationObserver(R =>
    R.forEach(r =>
      r.type === 'attributes'
        ? r.attributeName === 'style'
          ? turnSet(r.target)
          : one(r.target)
        : r.addedNodes.forEach(n => n.nodeType === 1 && under(n))
    )
  );
  CROPW.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['src', 'srcset', 'data-lo', 'style']
  });
  under(document.documentElement);
}
// A photo that never loaded: a "photo missing" tile (a camera struck through, inline SVG in the theme's tokens: an empty
// frame reads as still loading) over a quiz photo or a card's band; gone if the photo comes after all.
const NOPHOTO =
  '<svg viewBox="0 0 64 48"><path class="np-t" d="M8 16a5 5 0 0 1 5-5h8l4-5h14l4 5h8a5 5 0 0 1 5 5v22a5 5 0 0 1-5 5H13a5 5 0 0 1-5-5z"/><circle cx="32" cy="27" r="9"/><path class="np-x" d="M10 4l44 42"/><path d="M10 4l44 42"/></svg>';
const noPhoto = i => {
  const box = i.closest('.qph, .ulphoto, .fxt');
  if (box && !box.querySelector('.nophoto'))
    box.insertAdjacentHTML('beforeend', `<span class="nophoto" aria-hidden="true">${NOPHOTO}</span>`);
};
const noPhotoGone = i => {
  const n = i.closest('.qph, .ulphoto, .fxt');
  if (n) n.querySelectorAll('.nophoto').forEach(x => x.remove());
};
// Unstable connection (Pierre, 2026-11-01): a failing photo is tried twice more (1 s, 4 s), a game photo then its 480 px
// placeholder (data-lo); then the question offers another (nothing counted), its frame the "photo missing" tile, and
// with none of its photos shown its answers close (a guess at a blank frame is no answer).
$v.addEventListener(
  'error',
  e => {
    const i = e.target;
    if (!(i instanceof HTMLImageElement) || !i.getAttribute('src')) return;
    const n = Number(i.dataset.retry || 0),
      u = i.getAttribute('src');
    if (n < 2) {
      i.dataset.retry = n + 1;
      setTimeout(
        () => {
          if (i.isConnected && i.getAttribute('src') === u) i.src = u.replace(/#.*$/, '') + '#r' + (n + 1);
        },
        1000 * (n + 1) ** 2
      );
    } else if (i.dataset.lo && !i.dataset.low) {
      i.dataset.low = 1;
      i.dataset.retry = 2;
      i.src = i.dataset.lo;
    } else if (i.closest('.qstage')) {
      // Every photo that gave up is a "photo missing" tile, the second of a question too; the note, the
      // report and the closing of the answers come once.
      i.classList.add('fail');
      noPhoto(i);
      if ($v.querySelector('.q.done, #qfail')) return;
      if (navigator.onLine !== false)
        // By the photo's name (data-f, quiz.js): an iNaturalist URL (a candidate just added, r: 1) is not one admin can look up.
        ev('photo', {
          f:
            i.dataset.f ||
            photoLocal(resized(u, ''))
              .replace(/^img\//, '')
              .replace(/\.webp.*$/, '')
        });
      const a = document.getElementById('after');
      if (a) {
        a.insertAdjacentHTML(
          'afterbegin',
          '<p class="note" id="qfail">A photo did not load (connection). <button type="button" class="linkish">Another question</button></p>'
        );
        a.querySelector('#qfail button').onclick = () => {
          NEXTQ = null;
          if (typeof pendDone === 'function') pendDone(); // the question whose photo failed is not kept
          route();
        };
      }
      // Another photo of the question may come later, one still trying or one added since (the hint): the answers open
      // again then (the load listener below). A Find the X's photos are its choices (quiz.js question): one missing is a
      // choice the player cannot see, so its answers close at once.
      const q = $v.querySelector('.q');
      if (q && (q.querySelector('.qstage.qfx') || ![...q.querySelectorAll('.qstage img')].some(x => x.complete && x.naturalWidth))) {
        q.classList.add('qnone');
        qAnswers(q, false);
        // A question that cannot be answered is not kept for the player's return (quiz.js pendDone): the next is drawn.
        if (typeof pendDone === 'function') pendDone();
      }
      if (typeof fitStage === 'function') fitStage();
    }
  },
  true
);
const qAnswers = (q, on) => q.querySelectorAll('[data-c], [data-w], .tyform input, .tyform button').forEach(b => (b.disabled = !on));
$v.addEventListener(
  'load',
  e => {
    if (e.target instanceof HTMLImageElement && e.target.naturalWidth && e.target.classList.contains('fail'))
      (e.target.classList.remove('fail'), noPhotoGone(e.target));
    const q =
      e.target instanceof HTMLImageElement &&
      e.target.naturalWidth &&
      e.target.closest('.q.qnone:not(.done) .qstage') &&
      e.target.closest('.q');
    // A Find the X opens again only once none of its four photos is missing.
    if (!q || q.querySelector('.qstage.qfx img.fail')) return;
    q.classList.remove('qnone');
    qAnswers(q, true);
  },
  true
);
// Each file's width as a 4:3 object-fit: cover box sees it: the sizes are the LONG side, so a portrait or panoramic photo
// has fewer useful pixels (declared as the long side, the 480 px file got blown up 1.3-1.9x in a 400-470 px box).
const coverW = (p, long) => {
  const a = p.ar || 4 / 3;
  return Math.round(Math.min(long * Math.min(1, a), (long * Math.min(1, 1 / a) * 4) / 3));
};
// Thumbnails: the 240 or 480 px file, the browser picking from the drawn width (sizes, CSS px) and the density. A remote
// photo's name rides on its <img> (data-f): its URL is not one flag.js can name it by.
const thumb = (p, sizes) => {
  if (p.r && p.src) return `src="${img(p, 's')}"${p.f ? ` data-f="${esc(p.f)}"` : ''}`;
  if (saver()) return `src="${loc(p, 't')}"`; // Saver: a thumbnail is at most ~240 px (Home's band on a desktop)
  const w = long => Math.round(long * Math.min(1, p.ar || 4 / 3));
  return `src="${loc(p, 's')}" srcset="${loc(p, 't')} ${w(240)}w, ${loc(p, 's')} ${w(480)}w" sizes="${sizes}"`;
};
const srcset = p =>
  p.r && p.src
    ? `${inat(p, 'medium')} ${coverW(p, 500)}w, ${inat(p, 'large')} ${coverW(p, 1024)}w`
    : `${loc(p, 's')} ${coverW(p, 480)}w, ${loc(p, 'm')} ${coverW(p, 960)}w${saver() ? '' : `, ${loc(p)} ${coverW(p, 1600)}w`}`;
// Small source label on a game photo (decision: docs/decisions/2026-11-18-decisions-from-app-comments.md), every game's,
// shown once the answer is out (an iNat link or a slide number would give the unit away): the observation, the page
// crediting a traced IMR lecture photo (pg: tools/apply_imr_sources.py), else a plain label. Hidden on phones: the
// enlarged view's caption has it.
const author = p =>
  (p.a || '')
    .replace(/^\(c\)\s*/i, '')
    .replace(/,\s*(some|all) rights.*$/i, '')
    .trim();
const photoSrc = p =>
  !p
    ? ''
    : p.imr && p.pg
      ? `<a class="psrc" href="${esc(safeUrl(p.pg))}" target="_blank" rel="noopener" title="IMR Lecture 6${p.slide ? ', slide ' + esc(p.slide) : ''}. ${esc(author(p))}: open the page that credits it"><span class="pa">IMR lecture · </span>${esc(author(p))} ↗</a>`
      : p.imr
        ? `<span class="psrc" title="IMR Lecture 6${p.slide ? ', slide ' + esc(p.slide) : ''}">IMR lecture</span>`
        : /^https?:\/\/(www\.)?inaturalist\.org\//.test(p.o || '')
          ? `<a class="psrc" href="${esc(safeUrl(p.o))}" target="_blank" rel="noopener" title="${esc(author(p) || 'iNaturalist')}: open the iNaturalist observation"><span class="pa">${esc(author(p))} · </span>iNat ↗</a>`
          : // A FishBase photo Pierre put in play: its author and FishBase's photo page.
            p.via === 'fishbase' && p.o
            ? `<a class="psrc" href="${esc(safeUrl(p.o))}" target="_blank" rel="noopener" title="${esc(author(p))}: open the FishBase photo page"><span class="pa">${esc(author(p).replace(/,\s*via FishBase$/i, ''))} · </span>FishBase ↗</a>`
            : '';
// One colour per IMR lecture group, used everywhere a group appears (style="--g:…", CSS hsl(var(--g) …)).
const groupHue = n => (n * 137) % 360;
// An IMR lecture photo's credit: the lecture and slide, then, once traced (pg), its photographer and the page that credits
// it (Corals of the World's terms ask for that citation).
const lectCredit = p =>
  `IMR Lecture 6, slide ${esc(p.slide)}${p.pg && p.a ? ` · <a href="${esc(safeUrl(p.pg))}" target="_blank" rel="noopener">${esc(p.a)}</a>` : ''}`;
const credit = p =>
  p.imr
    ? lectCredit(p)
    : `<i>${esc(p.t)}</i>${p.own && !p.nd ? ' <span class="own">Dauin</span>' : ''} · <a href="${esc(safeUrl(p.o))}" target="_blank" rel="noopener">${esc(p.a)}</a>`;
// Before the answer the enlarged quiz photo credits its author by name only: no taxon and no link,
// which would give the genus away (rule P5); the full credit comes with the answer. A traced IMR lecture photo: the
// lecture, then its photographer and site (its page's address names the species: no link).
const blindCredit = p => {
  const n = author(p);
  return p.imr ? ' · IMR lecture' + (p.pg && n ? ` · © ${esc(n)}` : '') : n ? ` · © ${esc(n)}` : '';
};
const allPhotos = g => VIEWS.flatMap(([v]) => (g.views[v] || []).map(p => ({...p, view: v})));
// Card photo: the one picked in curation.json (coverP, may be a lecture photo), else data.json's pick (tools/covers.txt),
// else the first featured Closer photo (core.js applySlots: by quality, a lecture photo included), else the first closer
// view; never chosen for who took it (rule P1).
const cover = g =>
  g.coverP ||
  allPhotos(g).find(p => p.f === g.cover) ||
  (((g.sl || {}).medium || {}).feat || [])[0] ||
  (g.views.medium || [])[0] ||
  allPhotos(g)[0];
// A juvenile photo (its phase ph, or the j flag of its tags: judging/FISH.md) is never a cover (docs/ARCHITECTURE.md
// "Fish content"), but Pierre's ★ cover he confirmed on one (coverJ, autosort.js treeCoverJ): coverOk(k, p), photo p may
// be node k's cover (k: its curation record). adultFirst(L): L's first adult photo, else its first.
const JUV_PH = 'juvenile';
const juvP = p => !!p && (p.ph === JUV_PH || /j/.test(String(p.jt || '').slice(7)));
const coverOk = (k, p) =>
  !!p && (!juvP(p) || !!(k && k.cover && k.coverJ && treePid(k.coverJ) === treePid(k.cover) && treePid(p.f) === treePid(k.cover)));
const adultFirst = L => (L || []).find(p => !juvP(p)) || (L || [])[0] || null;
// A watermarked photo (flag w: judging/FISH.md "Watermark") is a default cover only when the node has no other adult one;
// Pierre's ★ cover on one stays his (rule A1, autosort.js treeCoverW; Home skips it: home.js homeOk).
// coverFirst(L): the first of L that is neither a juvenile nor watermarked, else adultFirst(L).
const wmP = p => !!p && /w/.test(String(p.jt || '').slice(7));
const coverFirst = L => (L || []).find(p => !juvP(p) && !wmP(p)) || adultFirst(L);
// A leaf's presence around the instance's centre (docs/ARCHITECTURE.md "The instance's centre"): [distinct Research
// Grade observers, observations] in its radius (present nearU, nearN, or the old dauinU, dauin), [0, 0] with none.
const nearSeen = r => {
  const p = (r && r.present) || {};
  return [p.nearU ?? p.dauinU ?? 0, p.nearN ?? p.dauin ?? 0];
};
// The default cover of a node with leaves (docs/ARCHITECTURE.md "The default cover of a node with leaves"): the leaf
// most seen (seen, nearSeen; ties: observations, the easy order) among those with an adult reference photo (refLevel),
// else an adult one, never watermarked while another exists; then his ★ cover of that leaf, else its easiest. L: the
// photos in play (p.sp: the leaf), d: easyRank's difficulty, pick(leaf): his cover or null. autosort.js treeCoverOf is
// the admin's copy (tests/fishcovers.test.js).
function seenCover(L, seen, d, pick = () => null) {
  const R = easyRank(L, d),
    A0 = R.filter(p => !juvP(p)),
    A1 = A0.filter(p => !wmP(p)),
    A = A1.length ? A1 : A0,
    Ref = A.filter(refLevel);
  let best = null;
  (Ref.length ? Ref : A).forEach(p => {
    const s = seen(p.sp) || [0, 0];
    if (!best || s[0] > best.s[0] || (s[0] === best.s[0] && s[1] > best.s[1])) best = {p, s};
  });
  if (!best) return R.find(p => !wmP(p)) || R[0] || null;
  // his pick there: an adult, or a juvenile he confirmed as that leaf's cover (cj: treeCurate's covers); without a
  // watermark while the node has an adult photo without one
  const k = pick(best.p.sp),
    c = k && R.find(p => p.f === k.f);
  return (c && (!juvP(c) || k.cj) && (!wmP(c) || !A1.length) && c) || best.p;
}
// A fish species' presence (TREEU.sps: fish.json species by id) and his ★ cover of it (TREEU.covers: app.js treeCurate).
const treeSeen = sid => nearSeen(((TREEU && TREEU.sps) || {})[sid]);
const treeSpPick = sid => ((TREEU && TREEU.covers) || {})[sid] || null;
// applyCuration(d, c) and applySlots(d, c, {picks, autoq}) live in core.js (tested in tests/photos.test.js).
let CUR_NEW = null,
  curAt = Date.now(); // curation read again later (curRefresh)
let RAW,
  CUR,
  FORMS = {gf: {}, form: {}, cf: {}, gunsure: {}},
  AUTOQ = {},
  PICKS = {};
// Genera not on the IMR slate but in the Coral Finder book and present at Dauin (data.json "x", tools/build_extra.py):
// Identify > Coral ID Key only, on by default, switch in ⚙ on that page. Same photo pipeline,
// kept out of DATA.gen so games, quizzes, progress and the Genera pages never see them.
let XON = store.get('reefid-idkey-x', true);
// data.json with the content editor's edits laid over it (core.js contentApply; docs/ARCHITECTURE.md "The content
// editor's edits"): the text slots always, his pairs once the sheet replays under them (structOn, rule D4). DATAST: the
// units' structure stamp ('' without), DATAON: whether they were made under it.
let DATAST = '',
  DATAON = false;
function build() {
  GDIFF = {};
  NEXTQ = null; // a question planned on the old curation could show a photo it now excludes or moves
  // the flat subject (SUBJECTS flat: the corals), whose content slots apply to data.json
  const S = SUBJECTS.find(x => x.flat),
    on = structOn(S),
    d = structuredClone(contentApply(S, RAW, CUR, {structure: on}));
  DATAON = on;
  DATAST = on ? structStamp(S, RAW, CUR) : '';
  // An edited ID tip's source, shown under the tips wherever they are (tipsList qsrc; rule C2).
  [d.gen, (d.x || {}).gen].forEach(G => Object.values(G || {}).forEach(tipsEdited));
  applyCuration(d, CUR);
  applyForms(d, CUR);
  applySlots(d, CUR, {picks: PICKS, autoq: AUTOQ});
  reserveOn(d); // this player's reserve out of the units' views and game lists (the key-only genera, d.x, have no exam)
  if (d.x) {
    const x = {gen: d.x.gen, course: {}, cand: d.cand};
    applyCuration(x, CUR);
    applyForms(x, CUR);
    applySlots(x, CUR, {picks: PICKS, autoq: AUTOQ});
  }
  // What the corals' units were made from, for the content version of their answers (contentVer), kept out of sight on
  // the data made (not enumerable: nothing that reads or copies DATA meets it).
  Object.defineProperty(d, 'cvIn', {value: {S, cur: CUR, st: DATAST, files: [RAW, FORMS, AUTOQ, PICKS], v: ''}, configurable: true});
  DATA = d;
  if (typeof stateBump === 'function') stateBump(); // the data in force: an input of the views
  treeBuildAll(); // the fish (and every tree subject's) photos under the same curation
}
// The content version of subject S's answers (core.js contentVersion) from what its units were made from (cvIn: DATA's,
// a tree's TREEU), once per build at its first answer (a hash: never at start-up); '' before, or on failure.
function contentVer(S) {
  try {
    const U = !S || !UNITS[S.id] ? null : !UNITS[S.id].get ? DATA : S.id === TREE_AT ? TREEU : (TREE_OF[S.id] || {}).TREEU,
      I = U && U.cvIn;
    return I ? I.v || (I.v = contentVersion(I.S, I.cur, I.files.map(fileVer), I.st)) : '';
  } catch (e) {
    return '';
  }
}
// The scientific genera of the fish (docs/ARCHITECTURE.md "Fish scientific genera"; docs/FISH_PATH.md "Levels"): one
// unit per fish.json genus holding species of a family in play (core.js treeGenSets; the PDF name's first word, rule C2),
// 'g:' + genus in TREEU.gen beside the families (its record below; opening: sciOpen); TREEU.sci: every genus, in the
// families' order. A subject played at the genus from the start (X.unit 'genus': the sea slugs) has its circles' units
// completed the same way (core.js treeGenUnits), with no opt-in set (TREEU.sci empty). X.kinds: the kinds of name the
// subject's species are asked by (core.js SUBJECTS names; both where unset: the tools and tests), each kind its species
// units (X.spl, X.ssl).
function treeGenera(X, F) {
  const names = X.kinds || ['cn', 'sci'],
    gens = new Map((F.genera || []).map(g => [g.id, g])),
    atGenus = X.unit === 'genus',
    sci = [];
  // A family IMR gives no cue for (circles 2-3, the Soapfishes): its ID marks (fish.json marks, our own words from the
  // sources it lists, msrc: tools/fish_sheets.json) show where the IMR cues show (the feedback, the first-meeting card,
  // the families page, the cards), under a label naming those sources, never as IMR's (docs/ARCHITECTURE.md "Subjects").
  (F.families || []).forEach(f => {
    const E = X.gen[f.id],
      // the sources the content editor gave with his look-alike lines (core.js contentApply esrc 'look/<id>'; rule C2), by
      // the other family's id: said with the line in the quiz feedback (quiz.js fbBody)
      lks = Object.entries(f.esrc || {}).filter(([k]) => k.startsWith('look/')),
      by = [
        ...new Set(
          (f.msrc || [])
            .map(s =>
              String(s.t || '')
                .split(',')[0]
                .trim()
            )
            .filter(Boolean)
        )
      ].join(', ');
    if (E && lks.length) E.lksrc = Object.fromEntries(lks.map(([k, s]) => [k.slice(5), s]));
    // Its undeclared pairs' lines (fish.json apart: our own words from the family's sources, rule C2): said by the quiz
    // feedback when the two are mixed up (quiz.js pairHalves), each with the family's sources and the editor's source for
    // it. Never a look-alike (look, decl and the draw do not read them): the feedback is all they change.
    if (E && f.apart) {
      const own = (f.msrc || []).map(x => x.t).join('; ');
      E.ap = Object.fromEntries(Object.entries(f.apart).filter(([, t]) => t));
      E.apsrc = Object.fromEntries(
        Object.keys(E.ap).map(o => [o, [own, ((f.esrc || {})['apart/' + o] || {}).t].filter(Boolean).join('; ')])
      );
    }
    // the same for its phase lines, shown under More in the quiz feedback (quiz.js fbBody)
    if (E && f.esrc && f.esrc.phase) E.psrc = f.esrc.phase;
    if (!E || E.qt || !(f.marks || []).length) return;
    E.qt = f.marks;
    // the source the content editor gave with an edit of them (core.js contentApply esrc), shown with them (tipsList)
    if (f.esrc && f.esrc.marks) E.qsrc = f.esrc.marks;
    E.tl = 'ID marks' + (by ? ` (${by})` : ''); // shown as HTML, as every tl (tipsLabel): plain words, tests/fishsheets.test.js
  });
  // each family in play with its genera in the game: those holding species, or, played from the start, the units treeGen
  // made (core.js treeGenSets, which the sheet's replay and variant table read too)
  treeGenSets(F, X).forEach(({f, E, by}) => {
    const ids = [...by.keys()];
    by.forEach((L, id) => {
      const G = gens.get(id),
        g = G.name,
        set = new Set(L.map(s => s.id)),
        cues = G.cues && G.cues.length ? G.cues : null,
        // Its own ID marks when IMR gives no cues (fish.json marks, tools/fish_genus_marks.json),
        // under a label naming the marks' own sources (mby.marks: not the presentation's), never as IMR's (rule C1);
        // their source per line is on the sheet (genMarks).
        marks = !cues && G.marks && G.marks.length ? G.marks : null,
        mby = [
          ...new Set(
            ((G.mby || {}).marks || [])
              .flat()
              .map(i => (G.msrc || [])[i] || {})
              .map(s =>
                String(s.t || '')
                  .split(',')[0]
                  .trim()
              )
              .filter(Boolean)
          )
        ].join(', '),
        sl = G.imr && G.sl && G.sl.length ? `, slide${G.sl.length > 1 ? 's' : ''} ${G.sl.join(', ')}` : '',
        // its species' photos and its genus-level photos (gl, sp its id: core.js treeGlOf; the sea slugs)
        wide = E.views.wide.filter(p => set.has(p.sp) || (!!p.gl && p.sp === id));
      X.gen[id] = {
        id,
        name: g,
        rank: 'genus',
        one: 'genus',
        parent: f.id,
        fam: E.name + (E.fam ? ' · ' + E.fam : ''), // the card's and the feedback's family line names its family
        wfam: [],
        imrName: G.imr || '', // the IMR tag
        cname: G.common || '', // its common name (fish.json common), under its name on its first-meeting card (unitCname)
        // that IMR sub-entry names this genus alone (Chromis; not Surgeonfish, which names three)
        imrg: G.imr && (F.genera || []).filter(o => o.imr === G.imr && o.family === G.family).length === 1 ? 1 : 0,
        fish: 1,
        circle: atGenus ? X.gen[id].circle : E.circle, // its family's (circles 2 and 3 open after circle 1: treeGate)
        group: E.group,
        ig: E.ig,
        forms: E.forms,
        // Its sibling genera, and the genera a specialist source names as its look-alikes (the tree's genus look: the sea
        // slugs', tools/seaslug_game.py genus_looks), across families too.
        look: [...new Set([...ids.filter(o => o !== id), ...(G.look || []).filter(o => X.gen[o])])],
        // Its declared look-alikes for the confusion groups (model.js declaredOf): the genera IMR teaches under the same
        // sub-entry (the Surgeonfish: Acanthurus, Ctenochaetus, Zebrasoma), not every sibling; and those a specialist
        // source names (they stay look-alikes whatever the players answer).
        decl: [...(G.imr ? ids.filter(o => o !== id && gens.get(o).imr === G.imr) : []), ...(G.look || []).filter(o => X.gen[o])],
        lk: [],
        // each look-alike's sources in a line (the tree's genus lsrc: [{t, u}] by the other genus's id)
        lsrc: Object.fromEntries(Object.entries(G.lsrc || {}).map(([o, L]) => [o, L.map(x => x.t).join('; ')])),
        // The genera only iNaturalist's identifications show as its look-alikes (the tree's genus dlook): data
        // look-alikes the players' answers can drop (model.js dataSeed).
        ...(G.dlook ? {dl: G.dlook.filter(o => X.gen[o])} : {}),
        // Its declared look-alikes' tell-apart lines (the tree's genus apart and apsrc: the sea slugs', tools/seaslug_cues.py
        // apart_of), by the other genus's id, each naming and describing that genus, with its sources in a line: said by
        // the quiz feedback after a mix-up of the two (quiz.js pairLine), never a look-alike themselves.
        ...(G.apart
          ? {
              ap: Object.fromEntries(Object.entries(G.apart).filter(([o, t]) => t && X.gen[o])),
              apsrc: Object.fromEntries(Object.entries(G.apsrc || {}).map(([o, L]) => [o, L.map(x => x.t).join('; ')]))
            }
          : {}),
        qt: cues || marks,
        // an edit's source (core.js contentApply esrc): of its cues, else of the marks shown in their place (the sea slugs')
        ...(cues && G.esrc && G.esrc.cues ? {qsrc: G.esrc.cues} : marks && G.esrc && G.esrc.marks ? {qsrc: G.esrc.marks} : {}),
        tl: cues
          ? 'ID tips (IMR, ' + (G.imr || g) + sl + ')'
          : marks
            ? 'ID marks' + (mby ? ` (${mby})` : '') // plain words, shown as HTML as every tl (tipsLabel)
            : 'Its species here' + (sl ? ' (IMR, ' + G.imr + sl + ')' : ''),
        // Its presentation (fish.json plain), the card's plain sentence (app.js plainLine), as a coral genus's.
        ...(G.plain ? {plain: G.plain} : {}),
        // Its species in a line: the 3 most met around Dauin (commonness order), the genus abbreviated, each with the
        // player's first common name (cnFirst: read when shown, the IMR answer may come after this build), then the
        // count. (typeof: the tools and tests that run treeGenera alone, tools/ratedworld.js, fall back on s.common.)
        get sum() {
          const imr = typeof imrNow === 'function' && imrNow(),
            first = s => (typeof cnFirst === 'function' ? cnFirst(s, imr) : '');
          return (
            (L.length > 3 ? 'Most met here: ' : '') +
            L.slice(0, 3)
              .map(s => {
                const c = first(s) || s.common;
                return s.name.replace(/^\S+/, g[0] + '.') + (c ? ' (' + c + ')' : '');
              })
              .join(', ') +
            (L.length > 3 ? `; ${L.length} species in the game.` : '')
          );
        },
        species: L.map(s => s.id),
        phase: [],
        sub: [],
        // how common near Dauin, or over the subject's area where its tree gives one (core.js treeGen)
        cm: Math.round(Math.sqrt(L.reduce((a, s) => a + ((s.present || {})[F.area ? 'area' : 'dauin'] || 0), 0))),
        levels: 1,
        views: {wide},
        // the PDF genus shown and its species' WoRMS-accepted genera (Mirolabrichthys) accepted when typed; never its IMR
        // name (Anemonefish): a common name never advances a scientific name (docs/FISH_PATH.md), it is the family's
        names: [g, ...new Set(L.map(s => (s.now || '').split(/\s+/)[0]).filter(x => x && x !== g))]
      };
      // The card's photo as treeGen picks a family's: the first of its easyRank order (the family's, kept by the filter),
      // whoever took it.
      if (wide.length) X.gen[id].cover = easyCover(wide).f;
      if (!atGenus) sci.push(id);
    });
  });
  X.sci = sci;
  // The species' names by id (fish.json species, the PDF name), for the species shown that each answer logs (UNITS species).
  X.spn = Object.fromEntries((F.species || []).map(s => [s.id, s.name]));
  // Their records by id, for the photo's species said under the verdict (UNITS taxon, treeTaxon).
  X.sps = Object.fromEntries((F.species || []).map(s => [s.id, s]));
  // The fish species level, step 1 (docs/ARCHITECTURE.md "Fish species, step 1: by common name"): one unit per species
  // with a listed common name (core.js treeSpUnits: s:s091), its scientific name in small type under each choice. In its
  // record: from, a never-answered species starting at its family's ability (core.js abilityOf); decl, the species its record's
  // look names (core.js spDecl: none for the fish; the other pairs come from the players' mix-ups); noex (no exam yet: its bar tops at 95%); name, the player's first common name
  // (cnFirst, read when shown); also, every listed name (model.js choiceKeys). X.spl: every species unit, families' order.
  const imr = () => typeof imrNow === 'function' && imrNow(),
    first = s => (typeof cnFirst === 'function' ? cnFirst(s, imr()) : ((s.cn || [])[0] || [])[0]) || s.common || s.name;
  X.spl = (names.includes('cn') ? treeSpUnits(F, X) : []).map(u => {
    const E = X.gen[u.family],
      s = u.s,
      wide = E.views.wide.filter(p => p.sp === s.id);
    X.gen[u.id] = {
      id: u.id,
      get name() {
        return first(s);
      },
      sci: s.name,
      sp: s.id,
      kind: 'cn',
      rank: 'species',
      one: 'species',
      parent: u.family,
      from: u.from,
      fam: u.fam,
      wfam: [],
      fish: 1,
      circle: E.circle,
      group: E.group,
      ig: E.ig,
      forms: E.forms,
      look: u.look,
      decl: u.decl,
      lk: [],
      lsrc: {},
      also: (s.cn || []).flat(),
      qt: null,
      tl: 'Its names',
      // Its card's and its feedback's line: its scientific name (the WoRMS name beside it, rule S2), then its other listed
      // names (read when shown: the first one is the player's).
      get sum() {
        const f = first(s),
          o = (s.cn || []).map(n => n[0]).filter(x => x !== f);
        return `${s.name}${s.now && s.now !== s.name ? ` (now ${s.now} in WoRMS)` : ''}.${o.length ? ` Also called ${o.join(', ')}.` : ''}`;
      },
      species: [s.id],
      phase: [],
      sub: [],
      cm: Math.round(Math.sqrt((s.present || {}).dauin || 0)),
      levels: 1,
      noex: 1,
      views: {wide},
      names: []
    };
    if (wide.length) X.gen[u.id].cover = easyCover(wide).f;
    return u.id;
  });
  // The species by their scientific names (docs/reviews/2026-11-18-species-step2-plan.md §2.1; Q397, Q398): one unit per
  // species under a genus unit (core.js treeSpUnits 'sci': sci:s091, sci:xgoniobranchussp5), for a subject that asks its
  // species by their scientific names (SUBJECTS names). In its record: name, its scientific name (the PDF's for the fish,
  // WoRMS's for the sea slugs); kind 'sci', which keeps its choices and typed answers among its own kind (kindOf);
  // parent and from, its genus (the scientific tree, never its common-name unit: two independent trees); its genus's
  // photos of that species, never a genus-level one (gl); noex (no exam: the species exams come later, Q395); cn, the
  // player's first common name (read when shown), information only, under the scientific name while the display schedule
  // says so (sciShow) and in the feedback; names, the names typed for it: its own and the WoRMS name (rule S2); src, a
  // species with no name yet's source. X.ssl: every one, in the families' order.
  const cnTop = s => (typeof cnFirst === 'function' ? cnFirst(s, imr()) : ((s.cn || [])[0] || [])[0]) || '';
  X.ssl = (names.includes('sci') ? treeSpUnits(F, X, 'sci') : []).map(u => {
    const G = X.gen[u.genus],
      s = u.s,
      wide = G.views.wide.filter(p => p.sp === s.id && !p.gl);
    X.gen[u.id] = {
      id: u.id,
      name: s.name,
      sp: s.id,
      kind: 'sci',
      rank: 'species',
      one: 'species',
      parent: u.genus,
      from: u.from,
      fam: u.fam,
      wfam: [],
      fish: 1,
      circle: G.circle,
      group: G.group,
      ig: G.ig,
      forms: G.forms,
      look: u.look,
      decl: u.decl,
      lk: [],
      lsrc: {},
      also: [],
      get cn() {
        return names.includes('cn') ? cnTop(s) : '';
      },
      qt: null,
      tl: 'Its names',
      // Its card's and its feedback's line: the WoRMS name when another (rule S2), then its common names (the fish), or
      // its first English name (the sea slugs: information, never a choice).
      get sum() {
        const c = names.includes('cn') ? (s.cn || []).map(n => n[0]) : [],
          v = !c.length && typeof vernFirst === 'function' ? vernFirst(s.id) : '';
        return [
          s.now && s.now !== s.name ? `Now ${s.now} in WoRMS.` : '',
          c.length ? `Common name${c.length > 1 ? 's' : ''}: ${c.join(', ')}.` : v ? `English name: ${v}.` : ''
        ]
          .filter(Boolean)
          .join(' ');
      },
      species: [s.id],
      phase: [],
      sub: [],
      cm: Math.round(Math.sqrt((s.present || {})[F.area ? 'area' : 'dauin'] || 0)),
      levels: 1,
      noex: 1,
      views: {wide},
      names: [...new Set([s.name, s.now].filter(Boolean))],
      ...(s.inf && s.src ? {src: s.src} : {})
    };
    if (wide.length) X.gen[u.id].cover = easyCover(wide).f;
    return u.id;
  });
  // core.js: the tree of the fish global score, without the species units, with those by common name (UNITS fish tree:
  // spOn) and with those by scientific name too (sciSpOn)
  X.tree = treeScoreTree(X, F);
  X.treeSp = treeScoreTree(X, F, true);
  X.treeSci = treeScoreTree(X, F, true, true);
  return X;
}
// The next units of a parent's list O (in its order) a level brings into play: those not met with a photo, the first one,
// or, while the level holds fewer than INTRO.START units met (m: how many of every unit of it, metCount), up to
// INTRO.START of them, so it can open close units together (model.js openFresh, openGroup: a level opens in a group).
function lvlNext(O, m, met) {
  const k = m < INTRO.START ? INTRO.START : 1,
    out = [];
  for (const n of O) if (out.length < k && !met(n) && photoAny(n)) out.push(n);
  return out;
}
// How many units of a level's list L are met (lvlNext's m): counted at the first parent that asks, then kept for the
// other parents of one spPlay or sciPlay call, since nothing the call reads is written during it. Counting it for every
// parent made each call's work grow with the units times the parents.
const metCount = (L, met) => {
  let m = -1;
  return () => (m < 0 ? (m = L.filter(met).length) : m);
};
// The units of a level's list L by their parent (spPlay, sciPlay): [parent, its units in L's order], the parents in the
// order of their first unit. A view of the data version per list (the tree's TREEU.spl, TREEU.ssl; computed where a part
// of this file runs alone): each call went through the whole list. Its readers never change a list.
const kidsCalc = L => {
  const by = new Map();
  L.forEach(n => {
    const p = GX(n).parent;
    if (!by.has(p)) by.set(p, []);
    by.get(p).push(n);
  });
  return [...by];
};
const kidsOf = typeof dataViewBy === 'function' ? dataViewBy('kidsOf', kidsCalc) : kidsCalc;
// sciPlay's lists: each parent's units of L (kidsOf) in its species order (its record's species), a view of the data
// version per list as kidsOf.
const sciKidsCalc = L =>
  kidsOf(L).map(([p, U]) => {
    const ord = (GX(p) || {}).species || [];
    return [p, [...U].sort((a, b) => ord.indexOf(GX(a).sp) - ord.indexOf(GX(b).sp))];
  });
const sciKids = typeof dataViewBy === 'function' ? dataViewBy('sciKids', sciKidsCalc) : sciKidsCalc;
// The species units in play (the sp set): from L (TREEU.spl), for each family at Advanced (score, LV_AT[1]), its species
// met and the next in its commonness order (fish.json cmi; lvlNext: the next ones while the level opens its group); how
// often is the rank share's (model.js SHARE, shareRoom). on: the species level is on (spOn); off, none.
function spPlay(L, score, met, on) {
  if (!on) return [];
  const m = metCount(L, met);
  return kidsOf(L).flatMap(([p, U]) => [...U.filter(met), ...(score(p) >= LV_AT[1] ? lvlNext(U, m(), met) : [])]);
}
// The species by their scientific names in play (the ssp set; docs/reviews/2026-11-18-species-step2-plan.md §2.3): from L
// (TREEU.ssl), for each parent (their genus) in play now (up: the slate and the other sets' units in play) and at its
// threshold (its shareAt, else Advanced: LV_AT[1], C0), its species met and the next one in the parent's order (its
// species list: the family's commonness order for a fish genus, the circles' popularity for a sea slug genus; lvlNext:
// the next ones while the level opens its group). A parent
// out of play (its set turned off) brings none, its species met included: the level stops being asked, their bars kept
// (Q402 A). How often is the rank share's (model.js SHARE, shareRoom), from the parent's level. on: the level is on
// (sciSpOn, rule D4); off, none.
function sciPlay(L, score, met, up, on) {
  if (!on) return [];
  const m = metCount(L, met);
  return sciKids(L).flatMap(([p, O]) => {
    if (!up.has(p)) return [];
    const at = typeof GX(p).shareAt === 'number' ? GX(p).shareAt : LV_AT[1];
    return [...O.filter(met), ...(score(p) >= at ? lvlNext(O, m(), met) : [])];
  });
}
// A unit's kind of name (its record's kind: cn a species asked by its common name, sci by its scientific name; '' for a
// unit with none), and the class its questions stay in (kindRank): its rank inside the subject (rankOf) and its kind.
// A question's choices, its typed names, its groups and its mimicry traps stay in one class, so a scientific question
// never shows a common-name label, nor the reverse; the rank logged and the share's levels read rankOf alone.
// kindRank is read for many units a question: a view of the data version per unit (dataViewBy; computed where a part of
// this file runs alone, as in the unit tests), kindRankCalc computes it.
const kindOf = n => (GX(n) || {}).kind || '';
const kindRankCalc = n => rankOf(n) + (kindOf(n) ? ':' + kindOf(n) : '');
const kindRank = typeof dataViewBy === 'function' ? dataViewBy('kindRank', kindRankCalc) : kindRankCalc;
// The scientific genera in play (the sci set), from L (TREEU.sci), a genus met staying in: units, offered to everyone,
// from its family's Advanced (LV_AT[1]; Open Water with hand: turned on by hand before, Q.sciH); auto, for an IMR player
// (imr), the IMR genera (imrg) from Open Water without the offer, never in units.
function sciOpen(L, score, met, imr, hand) {
  const at = (n, x) => met(n) || score(GX(n).parent) >= x,
    auto = imr ? L.filter(n => GX(n).imrg && at(n, LV_AT[0])) : [];
  return {auto, units: L.filter(n => !(imr && GX(n).imrg) && at(n, hand ? LV_AT[0] : LV_AT[1]))};
}
// The curated common names of a fish species (docs/ARCHITECTURE.md "Curated common names"): cn, 1 to 3 names, the main
// first (iNaturalist's default, else FishBase's), each [the name shown, its other spellings]; cni, the IMR name's place
// in cn; cnr, regional names, typed only. Any listed name credits the species' one unit.
const cnList = s => ((s && s.cn) || []).map(n => n[0]);
// The name a player sees first for species s: the IMR name for a player at IMR (imr: model.js imrSaid, read
// by the caller), the main name for everyone else; '' for a species with none. Every page that names a species shows it.
const cnFirst = (s, imr) => {
  const L = cnList(s),
    i = imr && s && Number.isInteger(s.cni) && L[s.cni] ? s.cni : 0;
  return L[i] || '';
};
// The name a multiple-choice question on species s shows: the player's first name (cnFirst), always the same one.
const cnShow = (s, imr) => cnFirst(s, imr);
// The names a player may type for the species L, for core.js typeMatchIn: [{k, g: the species id, old, alt}], each
// listed and regional name with its recorded spellings, nothing else (a name two species list: typeMatchIn shared).
// vn (the name index's kind words: razorfish, toby): {known} names no species owns, never read as a slip.
function cnTypeNames(L, vn) {
  const out = [];
  (L || []).forEach(s =>
    [...((s && s.cn) || []), ...((s && s.cnr) || [])].forEach(n =>
      n.forEach((x, i) => {
        const k = typeNormAll(x);
        if (k && !out.some(o => o.k === k && o.g === s.id)) out.push({k, g: s.id, old: i ? x : '', alt: i ? 1 : 0});
      })
    )
  );
  (vn || []).forEach(([x]) => {
    const k = typeNormAll(x);
    if (k.length >= 3 && !out.some(o => o.k === k)) out.push({k, g: '', old: x, alt: 1, known: 1, w: 1});
  });
  return out;
}
// Two species may share a common name (tools/fish_common.json shared). cnAlso(s, R), the sheet's "Also used for …": the
// other species of R listing a name of s, any spelling (typeNormAll): [[the name as s shows it, [the others]]], [] when
// none. A question never shows two of one label (model.js choiceApart).
function cnAlso(s, R) {
  const keys = n => n.map(typeNormAll).filter(Boolean),
    mine = n => new Set(keys(n));
  return ((s && s.cn) || [])
    .map(n => {
      const K = mine(n);
      return [n[0], (R || []).filter(o => o && o.id !== s.id && (o.cn || []).some(m => keys(m).some(k => K.has(k))))];
    })
    .filter(([, L]) => L.length);
}
// A unit's rank inside its subject: '' at its game units' rank (core.js unitRankOf), else its own ('genus' for a fish
// scientific genus); a record with none reads as its subject's. A question's choices and typed answers stay in it.
const rankOf = n => {
  const r = (GX(n) || {}).rank || SUBJ.rank;
  return r === unitRankOf(SUBJ) ? '' : r;
};
// A unit's name when its id is not its name (a fish entry t01: Damselfish; a scientific genus g:Chromis: Chromis), '' for
// a coral genus (its id is its name) or no unit (an "I don't know"): what an answer logs beside the unit (quiz.js answer).
const unitName = n => {
  const g = n ? GX(n) : null;
  return g && g.name && g.name !== n ? String(g.name) : '';
};
// The species of the photos a question showed (UNITS species), each once, joined by ', ': '' when the subject's photos
// name none (the corals' genus photos). Logged with each answer (the sheet's Species shown).
const speciesShown = L => [...new Set((L || []).map(p => UNITS[SUBJ.id].species(p)).filter(Boolean))].join(', ');
// The photo's own taxon, said in one short line under the verdict after every answer (players meet the species names
// before the species level asks them). UNITS taxon(p, n): the taxon photo p is identified to, finer than the unit n
// asked, {id, sci, common ('' if none), now (the WoRMS name when another, rule S2), rank}, or null when not sure.
// photoTaxon: the one taxon of the photos L (one observation, rule P4), null when one gives none or two differ.
const photoTaxon = (L, n) => {
  const T = (L || []).map(p => UNITS[SUBJ.id].taxon(p, n));
  return T.length && T.every(t => t && t.sci === T[0].sci) && T[0].id !== n ? T[0] : null;
};
// The line: "This photo: Zigzag wrasse · Halichoeres scapularis", the scientific name in italics (a family's upright), the
// WoRMS name after it as the species sheet says it ("now X in WoRMS"); '' without a taxon.
const taxonLine = t => {
  if (!t || !t.sci) return '';
  const it = x => (t.rank === 'family' ? esc(x) : `<i>${esc(x)}</i>`),
    // a species with no name yet (t.src: its source): its genus in italics, "sp. 5" upright, the source small
    sci = t.src
      ? `<i>${esc(t.sci.split(' ')[0])}</i> ${esc(t.sci.split(' ').slice(1).join(' '))} <small>(${esc(t.src)})</small>`
      : it(t.sci);
  return `<p class="fbsp">This photo: ${t.common ? `${esc(t.common)} · ` : ''}${sci}${t.now ? ` <small>(now ${it(t.now)} in WoRMS)</small>` : ''}</p>`;
};
// A tree subject's English names, information only, never a choice (UNITS vern: the sea slugs'): record id's
// [{n, src, nick: 1 for a nickname, web [{t, u}]}], the first shown first; [] without. vernFirst: the first, capitalised.
const vernOf = id => (id && UNITS[SUBJ.id] && UNITS[SUBJ.id].vern ? UNITS[SUBJ.id].vern(id) || [] : []);
const vernFirst = id => {
  const n = (vernOf(id)[0] || {}).n || '';
  return n.charAt(0).toUpperCase() + n.slice(1);
};
let VERNIX = null;
// The records of the tree in force by id (fish.json-shaped: families, genera, species), read once per tree.
const treeRec = id => {
  const F = TREERAW && TREERAW.f;
  if (!F) return null;
  if (!VERNIX || VERNIX.f !== F)
    VERNIX = {f: F, by: new Map([...(F.families || []), ...(F.genera || []), ...(F.species || [])].map(r => [r.id, r]))};
  return VERNIX.by.get(id) || null;
};
// A tree record's English names (the sea slugs' UNITS vern): its en, as tools/seaslug_names.py merged them.
const treeVern = id => ((treeRec(id) || {}).en || []).filter(x => x && x.n);
// The sources of English name x of record id, each linked (rule C2): iNaturalist, WoRMS, Wikipedia by the record's own
// ids (its ensrc), a guide's or a page's by its own address.
function vernSrcs(id, x) {
  const S = (treeRec(id) || {}).ensrc || {},
    a = (u, t, title) =>
      `<a href="${esc(safeUrl(u))}" target="_blank" rel="noopener"${title ? ` title="${esc(title)}"` : ''}>${esc(t)}</a>`,
    L = [];
  (x.src || []).forEach(k => {
    if (k === 'inat' && S.inat) L.push(a('https://www.inaturalist.org/taxa/' + encodeURIComponent(S.inat), 'iNaturalist'));
    else if (k === 'worms' && S.worms)
      L.push(a('https://www.marinespecies.org/aphia.php?p=taxdetails&id=' + encodeURIComponent(S.worms), 'WoRMS'));
    else if (k === 'wiki' && S.wiki)
      L.push(a('https://en.wikipedia.org/wiki/' + encodeURIComponent(S.wiki.replace(/ /g, '_')), 'Wikipedia'));
  });
  // A source with no page (Pierre's own word, rule C2) is its title, not a link.
  (x.web || []).forEach(w => L.push(w.u ? a(w.u, String(w.t || '').split(/,| \(/)[0], w.t) : esc(w.t || '')));
  return L.join(', ');
}
// A fish photo's taxon: the species it is in play for (sp), from R (TREEU.sps): its PDF name, the WoRMS name beside it
// (rule S2) and the player's first common name (cnFirst); a photo without one says nothing.
const treeTaxon = (R, p, imr) => {
  const s = p && p.sp && R && R[p.sp];
  return s && s.name
    ? {
        id: p.sp,
        sci: s.name,
        common: cnFirst(s, imr),
        now: s.now && s.now !== s.name ? s.now : '',
        rank: 'species',
        ...(s.inf && s.src ? {src: s.src} : {})
      }
    : null;
};
// The player answered "I'm at IMR" to the fish (model.js imrSaid: whatever the answer now), for cnFirst; false
// where model.js is not loaded.
const imrNow = () => typeof imrSaid === 'function' && !!imrSaid();
// The fish species level on (sync.js speciesOn, rule D4); false where sync.js is not loaded.
const spOn = () => typeof speciesOn === 'function' && !!speciesOn();
// The species by their scientific names on (sync.js sciOn, rule D4: the sheet replays them, the fish's and the sea
// slugs' in one script version, SCI_SHEET); false where sync.js is not loaded. sciSpAll: every such unit of the subject
// in force (TREEU.ssl) while on, none while off: the set's all (setOf, rankUnits, the board, the achievements), its typed
// names.
const sciSpOn = () => typeof sciOn === 'function' && !!sciOn();
const sciSpAll = () => (TREEU && sciSpOn() ? TREEU.ssl || [] : []);
// The names a player may type for the species by their scientific names L (unit ids), for core.js typeMatchIn: its own
// name, and the WoRMS name when another (rule S2: alt), read as its unit; never a common name nor its genus alone (a
// smaller fault, sciPart).
const sciTypeNames = L =>
  (L || []).flatMap(n =>
    ((GX(n) || {}).names || []).map((x, i) => ({k: typeNormAll(x), g: n, old: i ? x : '', alt: i ? 1 : 0})).filter(o => o.k)
  );
// How a question on species n by its scientific name shows its choices (docs/reviews/2026-11-18-species-step2-plan.md
// §2.4, the name-display schedule, steps 2 and 3, on its own bar): 'sc', each scientific name with its common name
// underneath, below Open Water; from Open Water to Advanced, 'so' (scientific only) by a chance rising from 0 to 1; 'so'
// from Advanced, and always for a species shown with no common name (a sea slug, a species without one, a subject asking
// none). Starting values, easy to change. Step 4, typed, is the usual typed share (model.js TYPED).
const SCISHOW = {from: 0, to: 1};
const sciShow = n => {
  if (!(GX(n) || {}).cn) return 'so';
  const b = genScore(n),
    a = LV_AT[SCISHOW.from],
    z = LV_AT[SCISHOW.to];
  return b < a ? 'sc' : b >= z ? 'so' : Math.random() < (b - a) / (z - a) ? 'so' : 'sc';
};
// A smaller fault (Q394 A, Pierre, 2026-11-17: "A"; core.js PART): what text, typed for species t's scientific name and
// read as no scientific name, is: 'cn', one of the species' own common names (any listed spelling: cn, cnr); 'g', its
// genus alone (its name or its WoRMS genus), or its genus with a second word no species of the game has; '' anything
// else (another species' common name, another genus: the usual nudge). Never a gain: the answer is a miss, weighed down.
const sciPart = (text, t) => {
  const g = GX(t) || {},
    s = TREEU && TREEU.sps ? TREEU.sps[g.sp] : null,
    G = GX(g.parent) || {},
    nm = UNITS[SUBJ.id].norm || typeNormAll,
    k = nm(text);
  if (!k || !s) return '';
  if ([...(s.cn || []), ...(s.cnr || [])].some(L => L.some(x => nm(x) === k))) return 'cn';
  const gn = [G.name, ...(G.names || [])].filter(Boolean).map(nm),
    w = String(text).trim().split(/\s+/);
  if (gn.includes(k)) return 'g';
  const ep = new Set(
    Object.values((TREEU && TREEU.sps) || {}).map(o =>
      nm(
        String(o.name || '')
          .split(/\s+/)
          .slice(1)
          .join(' ')
      )
    )
  );
  return w.length > 1 && gn.includes(nm(w[0])) && !ep.has(nm(w.slice(1).join(' '))) ? 'g' : '';
};
// What a text typed for a species' scientific name, read as no scientific name and no smaller fault (sciPart), is, for
// the nudge (quiz.js typeBind say, typeKindMsg): 'common', a common or English name of a species of the game (cn, cnr,
// en); 'genus' or 'family', a unit's name of that rank; '' else (the spelling message).
const sciSay = text => {
  const nm = UNITS[SUBJ.id].norm || typeNormAll,
    k = nm(text),
    S = Object.values((TREEU && TREEU.sps) || {});
  if (!k) return '';
  if (S.some(s => [...(s.cn || []), ...(s.cnr || [])].some(L => L.some(x => nm(x) === k)) || (s.en || []).some(e => e && nm(e.n) === k)))
    return 'common';
  // a genus first (a fish family also lists the IMR names inside it, Chromis among them), then a family
  const G = Object.values((TREEU && TREEU.gen) || {}),
    is = g => [g.name, ...(g.names || [])].some(x => x && nm(x) === k),
    u = G.find(g => g.rank === 'genus' && is(g)) || G.find(g => (!g.rank || g.rank === 'family') && is(g));
  return u ? u.rank || 'family' : '';
};
// The top n species of circle 1 by their scientific names (UNITS fish top: Dauin's top 20, fdauin20, Q261: circle 1
// only for now), the most seen near Dauin first (present.dauinU, the observers near Dauin, as the score's weights; ties
// by the commonness order, cmi), from L (sciSpAll: none while the level is off).
const sciTop = (L, n) =>
  L.map(u => [u, (TREEU && TREEU.sps && TREEU.sps[GX(u).sp]) || {}])
    .filter(([, s]) => s.circle === 1)
    .sort(([, a], [, b]) => ((b.present || {}).dauinU || 0) - ((a.present || {}).dauinU || 0) || (b.cmi || 0) - (a.cmi || 0))
    .slice(0, n)
    .map(([u]) => u);
// The stars among L (sciSpAll): the species whose record carries star (seaslug.json: the stars set, Q369 (c)).
const sciStars = L => L.filter(u => !!((TREEU && TREEU.sps && TREEU.sps[GX(u).sp]) || {}).star);
// The units in play a species by its scientific name may hang from (sciPlay up): the slate and the units the other
// sets have in play (the fish's scientific genera; a sea slug genus is on the slate). A view of the state version
// (sciUp, with bonusList below): sciUpCalc computes it.
const sciUpCalc = () =>
  new Set([...slateGenera(), ...SETS().flatMap(S => (S.k === SCI_SP.k ? [] : [...(Q[S.k] ? setUnits(S) : []), ...autoOf(S)]))]);
// The species by their scientific names, for every subject that asks them (SUBJECTS names 'sci'; UNITS sets: the
// fish's, the sea slugs'): no offer and no switch of its own (the fish's come with their scientific genera, Q404 A's
// names row; every sea slug player's); auto: sciPlay, once the level is on (sciSpOn, rule D4); all: every such unit
// (setOf, rankUnits, My progress's section, the achievements). They count in the fish % (core.js treeScore S).
const SCI_SP = {
  k: 'ssp',
  all: () => sciSpAll(),
  units: () => [],
  auto: () =>
    TREEU && sciSpOn() && typeof genScore === 'function' ? sciPlay(TREEU.ssl || [], genScore, introducedFn(), sciUp(), true) : [],
  due: () => false,
  page: false, // not on the families page
  kick: 'Scientific names',
  title: () => 'Species by their scientific names',
  body: 'For the genera you know well: a photo and four species, by their scientific names.',
  note: '',
  tag: 'Scientific name',
  name: 'Species, scientific names',
  // The first species met by its scientific name: its card marks the milestone (docs/FISH_PATH.md "Name-display
  // schedule", milestones, 2026-11-04), once per player (the units met, synced), never again; in the subject's words
  // (UNITS sciCard).
  card: n => ((TREEU.ssl || []).some(o => o !== n && introduced(o)) ? '' : UNITS[SUBJ.id].sciCard || '')
};
// The scientific genera in the game now (TREEU.sci, the sci set): every circle's once the sheet replays them (sync.js
// generaOn, rule D4), circle 1's alone before; every one where sync.js is not loaded (the
// tools that run the app's units alone). A view of the data version (dataView: the tree and the sheet's version are its
// inputs): sciNowCalc computes it.
const sciNowCalc = () =>
  TREEU ? (TREEU.sci || []).filter(n => (GX(n).circle || 1) < 2 || typeof generaOn !== 'function' || !!generaOn()) : [];
const sciNow = dataView('sciNow', sciNowCalc);
// A coral photo's taxon: its iNaturalist species (t), only within the genus asked n (a photo moved keeps its old name)
// and when sure: Research Grade (no gid) or Pierre's own (rule S2). The corals have no common names.
const coralTaxon = (p, n) => {
  const t = String((p && p.t) || '').trim(),
    w = t.split(/\s+/);
  return w.length === 2 && w[0] === n && (p.own || !p.gid) ? {id: t, sci: t, common: '', now: '', rank: 'species'} : null;
};
// Every unit of a rank in the subject's opt-in sets, opened or not: the wrong choices a question of that rank may name
// (as a quiz's wrong choices may name any genus), so a family with a single genus in play still gets 4 choices.
// The sets' units are grouped by class once per data version (a view: rankClassesCalc), each class in the sets' order,
// so a read is one lookup where each read went through every unit of the tree's sets; its readers never change a list.
const rankClassesCalc = () => {
  const M = new Map();
  new Set(SETS().flatMap(S => (S.all ? S.all() : S.units()))).forEach(n => {
    const rk = kindRank(n);
    M.has(rk) ? M.get(rk).push(n) : M.set(rk, [n]);
  });
  return M;
};
const rankClasses = dataView('rankClasses', rankClassesCalc);
const rankUnits = rk => rankClasses().get(rk) || [];
// A unit's record: a genus of the list or of the extra genera, or a fish entry (TREEU, by its teaching id: ids and genus
// names never meet). The engine reads every subject's units through it.
const GX = n => DATA.gen[n] || ((DATA.x || {}).gen || {})[n] || (TREEU ? TREEU.gen[n] : undefined);
// Fish (core.js treeGen over fish.json and the photos), fetched when first needed: fish-game.json (the photos in play)
// and fish-photos.json (the first photos, the sheet-only ones), kept under the curation (core.js treePhotos), so TREEU
// is made again with it (treeBuild). TREEF: fish.json with the editor's edits (contentApply; his circles and pairs from
// structOn, rule D4); TREEST, TREEON as DATAST, DATAON. Every tree subject (UNITS get: the fish, the sea slugs) has its
// own copy (TREE_OF); these globals are the one in force (TREE_AT, treeAt), the last tree subject's on the corals.
let TREEU = null,
  TREEP = null,
  TREEH = null,
  TREERAW = null,
  TREEF = null,
  TREEST = '',
  TREEON = false;
let TREE_AT = null;
const TREE_OF = {};
const treeBuild = () => {
  // the tree subject in force (TREE_AT): its content slots apply to it, and its part of the curation (core.js treeCur)
  const S = SUBJECTS.find(x => x.id === TREE_AT),
    {ph, gm} = TREERAW,
    on = structOn(S),
    C = treeCur(S, CUR),
    f = (TREEF = contentApply(S, TREERAW.f, CUR, {structure: on}));
  TREEON = on;
  TREEST = on ? structStamp(S, TREERAW.f, CUR) : '';
  // this player's reserve out of every unit's views, once the cards are chosen (reserveOn)
  // its units at its unit rank, with the kinds of name its species are asked by (SUBJECTS names: treeGenera kinds)
  const X = Object.assign(treeGen(f, treePhotos(ph.photos, gm.photos, C), ph.sheet, unitRankOf(S)), {kinds: S.names || []});
  TREEU = reserveOn(treeCurate(treeGenera(X, f), C, f));
  mimLay(TREEU, f);
  // What its units were made from, for the content version of their answers (contentVer), kept out of sight on them (not
  // enumerable). gm: a hash of {photos: {}} while the game photos have not come (dataPartial), another content.
  Object.defineProperty(TREEU, 'cvIn', {
    value: {S, cur: CUR, st: TREEST, files: [TREERAW.f, TREERAW.ph, TREERAW.gm], v: ''},
    configurable: true
  });
  rankPhotos(); // the photos in easyRank order on their difficulty (below)
  if (typeof stateBump === 'function') stateBump(); // the tree in force: an input of the views
  return TREEU;
};
// This player's reserve (core.js reserveOf, reserveSplit; docs/LEARNING.md "The reserve in the game"): a few
// observations per unit they never see in practice, which their mastery exam asks first, the same rule for every subject
// (the corals' build, every tree subject's treeBuild). resId: the player's stable id, the account's name (the same on all
// their devices), else this device's anonymous id as the sheet logs its answers (sync.js anonId: "~anon <id>"); '' where
// neither exists (no reserve). RESID: the id the units were last split for (resSeen).
const resId = () =>
  typeof SYNC !== 'undefined' && SYNC && SYNC.name && SYNC.pin
    ? reserveId(SYNC.name)
    : typeof anonId === 'function'
      ? reserveId('~anon ' + anonId())
      : '';
let RESID = null;
const reserveOn = X => reserveSplit(X, reserveOf(X, (RESID = resId())));
// Another player on this device without a reload (a new account named at sign-in: sync.js signIn): the units are made
// again for them at the next page change, as for a new curation (CUR_NEW).
function resSeen() {
  if (RESID !== null && RESID !== resId() && !CUR_NEW) CUR_NEW = CUR;
}
// The mimicry class (docs/LEARNING.md "The mimicry class"): each pair of the tree's file where a source says species a
// resembles species b (fish.json lookalikes, kind resembles; tools/fish_lookalikes.json) puts an entry on the family of
// a, its units' home (model.js varHome): sp, the species; st, the stage that resembles (juvenile: its juvenile photos
// only; all: every photo); u, the units of a (the side its drills ask on the class's photos, model.js mimSide); m, the units of b (its species unit s:<id>, core.js treeSpUnits; its genus; its family), any
// of which met opens the gate (model.js mimOf,
// mimAt); fb, the family of b, whose photos the card draws on; pair, the record its card reads (quiz.js mimShow); na and
// nb, the two species' names (sci, and cn, cni as cnFirst reads them); ra and rb, whether a
// species' look varies by region (species region), its photos from elsewhere then kept off the card. A subject whose
// file has no pairs gets none.
function mimLay(X, f) {
  const sp = new Map(((f || {}).species || []).map(s => [s.id, s])),
    name = s => ({sci: s.name, cn: s.cn || [], ...(Number.isInteger(s.cni) ? {cni: s.cni} : {})}),
    by = {};
  ((f || {}).lookalikes || [])
    .filter(r => r.kind === 'resembles')
    .forEach(r => {
      const a = sp.get(r.a),
        b = sp.get(r.b);
      if (!a || !b || !X.gen[a.family]) return;
      (by[a.family] = by[a.family] || []).push({
        sp: a.id,
        st: (r.st || {}).a || 'all',
        u: [spUnitId('cn', a.id), spUnitId('sci', a.id), a.genus, a.family].filter(Boolean),
        m: [spUnitId('cn', b.id), spUnitId('sci', b.id), b.genus, b.family].filter(Boolean),
        fb: b.family,
        pair: r,
        na: name(a),
        nb: name(b),
        ra: !!a.region,
        rb: !!b.region
      });
    });
  Object.entries(by).forEach(([id, L]) => (X.gen[id].mim = L));
}
// A tree subject's own state (the globals' names), made on first use; the globals from the state in force and back.
const treeOf = id =>
  TREE_OF[id] || (TREE_OF[id] = {id, TREEU: null, TREEP: null, TREEH: null, TREERAW: null, TREEF: null, TREEST: '', TREEON: false});
function treePull() {
  if (TREE_AT) ({TREEU, TREEP, TREEH, TREERAW, TREEF, TREEST, TREEON} = treeOf(TREE_AT));
  if (typeof stateBump === 'function') stateBump(); // the tree in force: an input of the views
}
function treePush() {
  if (TREE_AT) Object.assign(treeOf(TREE_AT), {TREEU, TREEP, TREEH, TREERAW, TREEF, TREEST, TREEON});
}
// Subject id's tree in force (subjectLoad, inSubject): nothing for a subject with none (the corals). Its units are made
// here when its data came while another was in force, or a curation came since (stale).
function treeAt(id) {
  if (!UNITS[id] || !UNITS[id].get || id === TREE_AT) return;
  treePush();
  TREE_AT = id;
  treePull();
  const T = treeOf(id);
  if (TREERAW && DATA && (!TREEU || T.stale)) {
    T.stale = false;
    treeBuild();
    treePush();
  }
}
// fn() with subject id's tree in force, then the one before: what reads a tree subject's units outside its own context
// (sync.js boardUnits: each leaderboard's tree, whatever the subject on screen).
function treeWith(id, fn) {
  const was = TREE_AT;
  treeAt(id);
  try {
    return fn();
  } finally {
    if (was) treeAt(was);
  }
}
// The units of every tree subject loaded made again (build: a new curation): the one in force at once, the others when
// they come back in force (treeAt).
function treeBuildAll() {
  Object.values(TREE_OF).forEach(T => {
    if (T.id === TREE_AT) {
      if (TREERAW) (treeBuild(), treePush());
    } else if (T.TREERAW) T.stale = true;
  });
}
// Whether the script replays subject S's progress under its structure (core.js structSheet: the corals' and the fish's
// own versions).
const structOn = S => typeof sheetV === 'function' && sheetV() >= structSheet(S);
// A reply from the script that replays under the structure, the units made before it without the structure the curation
// holds (sync.js sheetSeen): made again at the next page change, as a new curation is (CUR_NEW). The corals' (data.json:
// build) and the fish's (treeBuild) each against their own version.
function structSeen() {
  if (CUR_NEW) return;
  // the corals' against their version, the tree subject in force (TREE_AT) against its own
  const K = SUBJECTS.find(x => x.flat),
    F = SUBJECTS.find(x => x.id === TREE_AT);
  if ((RAW && DATAON !== structOn(K) && structFp(K, CUR)) || (F && TREERAW && TREEON !== structOn(F) && structFp(F, CUR))) CUR_NEW = CUR;
}
// Pierre's choices per fish unit (docs/ARCHITECTURE.md "Pierre's choices per family in the app"; curation.json fish
// genera {id: {cover, feat, ok}}) on the built units X: ★ Cover, the card's photo (coverP) while in play (by treePid),
// else seenCover's; featP {species id: [photo]} (up to autosort.js TREEFEAT, his order), the sheets' first photos;
// neither changes the games (ok, ✓ Validated, is the admin's own). A genus with no
// unit or a species gets its cover in X.covers {id: photo} while in play (learn.js genCover, treeSpPhotos).
// F: fish.json; cur: the subject's part of the curation (core.js treeCur).
function treeCurate(X, cur, F) {
  const G = (cur && cur.fish && cur.fish.genera) || {},
    sps = new Map(((F && F.species) || []).map(s => [s.id, [s.id]])),
    gens = new Map(((F && F.genera) || []).map(g => [g.id, g.species || []]));
  let pool = null; // every photo in play, once: the families' (treeGen: every species of a family)
  X.covers = {};
  Object.entries(G).forEach(([id, k]) => {
    const g = X.gen[id];
    if (!g && k && k.cover && (sps.has(id) || gens.has(id))) {
      const S = new Set(sps.get(id) || gens.get(id));
      pool = pool || Object.values(X.gen).flatMap(u => (u.rank ? [] : u.views.wide));
      const L = pool.filter(p => S.has(p.sp) || (!!p.gl && p.sp === id)),
        cv = L.find(p => p.f === k.cover) || L.find(p => treePid(p.f) === treePid(k.cover));
      // never a juvenile (juvP), unless he confirmed it (coverOk): then marked cj, which seenCover reads
      if (coverOk(k, cv)) X.covers[id] = juvP(cv) ? {...cv, cj: 1} : cv;
      return;
    }
    if (!g || !k) return;
    const L = g.views.wide,
      at = f => L.find(p => p.f === f) || L.find(p => treePid(p.f) === treePid(f)),
      cv = k.cover && at(k.cover),
      fe = Object.entries(k.feat || {})
        .map(([sid, F]) => [sid, [...new Set((F || []).map(at).filter(p => p && p.sp === sid))]])
        .filter(([, F]) => F.length);
    if (coverOk(k, cv)) {
      g.coverP = juvP(cv) ? {...cv, cj: 1} : cv;
      g.cover = cv.f;
    }
    if (fe.length) g.featP = Object.fromEntries(fe);
  });
  // Every unit's card photo without his pick (seenCover): its species with a reference photo most seen around the
  // instance's centre, then his ★ cover of that species (X.covers), else its easiest reference photo; never a juvenile,
  // nor a watermarked photo while the unit has another adult one (wmP).
  const spr = new Map(((F && F.species) || []).map(s => [s.id, s])),
    seen = sid => nearSeen(spr.get(sid));
  Object.values(X.gen).forEach(g => {
    const L = g.views.wide;
    if (!g.coverP && L.length) g.cover = seenCover(L, seen, undefined, sid => X.covers[sid]).f;
  });
  return X;
}
// In two steps: treeHome (fish.json, fish-photos.json: enough for Home), then treeLoad (fish-game.json too, the biggest,
// which the games wait for: tier 2); the units play on the first photos until it is in (fishCached: from the worker's
// cache, start-up waits for it). Per tree subject id (UNITS get: f, ph, gm), its state in its own copy (treeOf), in
// the globals only while in force: its files may come while another subject is on screen.
const treeSet = (id, k, v) => {
  treeOf(id)[k] = v;
  if (id === TREE_AT) treePull();
  return v;
};
const treeHome = id => {
  const T = treeOf(id),
    G = UNITS[id].get;
  return (
    T.TREEH ||
    treeSet(
      id,
      'TREEH',
      Promise.all([G.f(), G.ph ? G.ph() : {photos: {}}])
        .then(([f, ph]) => {
          // json() answers {} when a file cannot come: refused here, so nothing empty is kept and the next try fetches again
          // (a failed load would cache an empty quiz, with no retry and no way back to the corals). The whole list is not
          // required: without it every family plays on its first photos.
          if (!f || !Array.isArray(f.families) || !f.families.length || !ph || !ph.photos) throw new Error('fish data not loaded');
          if (!T.TREERAW) treeSet(id, 'TREERAW', {f, ph, gm: {photos: {}}});
          return T.TREERAW;
        })
        .catch(e => {
          treeSet(id, 'TREEH', null);
          throw e;
        })
    )
  );
};
// The subject's data still partial (the fish units on their first photos only, until fish-game.json is in): what reads
// the units' photos once for good waits (model.js domRecalcAll, the one-time rebuild of an old record's bar).
const dataPartial = () => !!(UNITS[SUBJ.id].partial && UNITS[SUBJ.id].partial());
// Whether this device's service worker already holds fish-game.json (a launch after the first, the same version): then
// start-up waits for it, so Home shows the curated photos.
const fishCached = () =>
  window.caches && caches.match
    ? caches.match('fish-game.json?v=1').then(
        r => !!r,
        () => false
      )
    : Promise.resolve(false);
const treeLoad = id => {
  const T = treeOf(id);
  return (
    T.TREEP ||
    treeSet(
      id,
      'TREEP',
      Promise.all([treeHome(id), UNITS[id].get.gm()])
        .then(([raw, gm]) => {
          // A subject with no first photos (the sea slugs) has nothing to play without its game file: refused, so the
          // next try fetches it again and start-up falls back on the corals, as fishHome refuses fish.json.
          if (!UNITS[id].get.ph && !(gm && gm.photos)) throw new Error('tree data not loaded');
          // fish-game.json's records whole (core.js treeGameRead: the file's short form, observation ids and extensions).
          // game: whether fish-game.json came (without it the units play on their first photos: UNITS fish vars waits).
          treeSet(id, 'TREERAW', {...raw, gm: gm && gm.photos ? treeGameRead(gm) : {photos: {}}, full: true, game: !!(gm && gm.photos)});
          // At start-up the first build() makes the units (built here too, a third of a second thrown away on a mid phone);
          // a subject not in force makes them when back in force (treeAt: stale), never from its first photos alone.
          if (id !== TREE_AT) T.stale = true;
          if (!DATA || id !== TREE_AT) return T.TREEU;
          T.stale = false;
          const F = treeBuild();
          treePush();
          if (typeof domRecalcAll === 'function') domRecalcAll(); // model.js: units pulled before the fish data came
          // progress.js: an achievement recount waiting for this data; never a reason for the fish data to fail
          try {
            if (typeof achPending === 'function') achPending();
          } catch (e) {}
          return F;
        })
        .catch(e => {
          treeSet(id, 'TREEP', null);
          throw e;
        })
    )
  );
};
// The fish units' photos in easyRank order on their difficulty as the game sees it (model.js photoDiff), so the card's
// and each list's first photo stay the easiest as ratings come: run when the fish data or the stats arrive (before
// model.js, treeGen's order stands). Pierre's cover (coverP) stays the card's photo.
function rankPhotos() {
  if (!TREEU || typeof photoDiff !== 'function') return;
  Object.entries(TREEU.gen).forEach(([n, g]) => {
    // The list the draw reads keeps no licence; the card photo breaks ties on it (core.js easyCover).
    g.views.wide = easyRank(g.views.wide, p => photoDiff(n, p), false);
    // The card photo: his pick, else the most seen species' first photo in the rated order that is not a juvenile
    // (seenCover; licences break ties).
    if (g.views.wide.length) g.cover = (g.coverP || seenCover(g.views.wide, treeSeen, p => photoDiff(n, p), treeSpPick)).f;
  });
  if (typeof stateBump === 'function') stateBump(); // the tree's photo lists: an input of the views
}
// Per-subject state of the other files (model.js: the first-meeting cards, the opening hold, the comeback; quiz.js: the
// questions planned ahead), reloaded on a switch: each file registers a function here. keep = true for a short visit
// to another subject (inSubject): what can be read again from the device, nothing that is in play.
const SUBJ_HOOKS = [];
function subjectLoad(S, keep) {
  SUBJ = S;
  treeAt(S.id); // its tree in force (TREEU: the fish's, the sea slugs'), none for the corals
  unitsRenamed(S);
  P = store.get(sKey('progress'), {}) || {};
  Q = qLoad();
  // the subject, its records and settings: inputs of the views (and again after the hooks' own state)
  if (typeof stateBump === 'function') stateBump();
  SUBJ_HOOKS.forEach(f => f(keep));
  if (typeof stateBump === 'function') stateBump();
}
// fn() run as if S were the current subject, then back (the sync's summary and merge, sign-in, sign-out). Synchronous.
// SUBJ_VISIT: how many visits are under way (nothing may redraw the page meanwhile: it shows the subject on screen).
let SUBJ_VISIT = 0;
function inSubject(id, fn) {
  const S = subjectOf(id),
    was = {S: SUBJ, P, Q, T: TREE_AT};
  if (S === SUBJ) return fn();
  SUBJ_VISIT++;
  subjectLoad(S, true);
  try {
    return fn();
  } finally {
    SUBJ_VISIT--;
    SUBJ = was.S;
    // the subject on screen back: an input of the views, as its records and settings below
    if (typeof stateBump === 'function') stateBump();
    if (was.T) treeAt(was.T); // the tree on screen back in force
    SUBJ_HOOKS.forEach(f => f(true));
    P = was.P;
    Q = was.Q;
    if (typeof stateBump === 'function') stateBump();
    prog(); // the pill shows the subject on screen again (a visit may have saved, which shows its own)
  }
}
// The subject switch (docs/DESIGN.md "Subject switch"): Home's row and the header's control (#subjc, not on Home), only
// with two subjects or more (subjMine). The subject's data first, then everything reloads for it; synced (SUBJECT_KEY).
// A subject the player may not have (subjAt) brings the corals.
function setSubject(id) {
  const S = subjAt(id);
  if (S === SUBJ) return Promise.resolve();
  return UNITS[S.id].load(S).then(() => {
    store.set(SUBJECT_KEY, S.id);
    if (typeof toastsOff === 'function') toastsOff(); // progress.js: a note about the subject left
    subjectLoad(S);
    showSubj();
    showBon();
    prog();
    if (typeof syncSoon === 'function') syncSoon();
    // A page the new subject does not have (Fish chosen on a coral genus sheet): its section's page for the subject, so the
    // route does not hand the player straight back (the hand-off in route is for links only).
    // The address says the subject (its prefix): rewritten for the new one in place.
    const sp = subjPage(hashNow());
    if (hrFull(sp) !== location.pathname + location.search + location.hash) history.replaceState(history.state, '', hrFull(sp));
    route();
  });
}
// The subjects this player can switch between (subjOpen): the switches show only when there are two or more.
const subjMine = () => SUBJECTS.filter(subjOpen);
// A subject's icon (core.js SUBJECTS icon: the one SVG set, 24 px grid) and its switch buttons ([data-subj], aria-pressed: the
// subject on screen), each with its icon, its name and, for a subject in beta, a small beta tag.
const subjIcon = (S, px = 18) =>
  `<svg class="sji" viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${S.icon}</svg>`;
const subjBtns = () =>
  subjMine()
    .map(
      S =>
        `<button type="button" data-subj="${S.id}" aria-pressed="${S === SUBJ}">${subjIcon(S)}<span>${esc(S.name)}</span>${S.beta ? '<small class="beta">beta</small>' : ''}</button>`
    )
    .join('');
// The header's subject control for n subjects (one click to change; decision:
// docs/decisions/2026-11-18-decisions-from-app-comments.md): two, a switch (one chip flipping, [data-flip], where it
// does not fit: app.css); three or more, the chip and its menu (a switch would not fit phones); fewer, nothing.
const subjCtl = n => (n === 2 ? 'switch' : n > 2 ? 'menu' : '');
// Everything that names the subject on screen: the switches ([data-subj] buttons: Home's row, the header's switch or its
// chip's menu), the header chip itself (the subject on screen, its icon and name; the name steps aside on phones while the
// Sign in pill shows, app.css), ⚙ rows of one subject only (setrow[data-for]), the section tabs' words.
const $subjc = document.getElementById('subjc');
function showSubj() {
  document.documentElement.dataset.subject = SUBJ.id;
  const ctl = subjCtl(subjMine().length),
    // A switch used from the keyboard keeps the focus once redrawn: the same subject's button, or the chip.
    a = document.activeElement,
    had = $subjc.contains(a) ? (a.dataset.flip ? 'flip' : a.dataset.subj || 'chip') : '',
    other = subjMine().find(S => S !== SUBJ);
  $subjc.hidden = !ctl;
  $subjc.innerHTML =
    ctl === 'switch'
      ? `<div class="subjsw" role="group" aria-label="Subject">${subjBtns()}</div><button type="button" class="subjb subjflip" data-flip="${other.id}" aria-label="Subject: ${esc(SUBJ.name)}. Switch to ${esc(other.name)}" title="Subject: ${esc(SUBJ.name)}. Switch to ${esc(other.name)}">${subjIcon(SUBJ)}</button>`
      : ctl === 'menu'
        ? `<button type="button" class="subjb" id="subjb" aria-haspopup="true" aria-expanded="false" aria-controls="subjmenu" aria-label="Subject: ${esc(SUBJ.name)}. Switch" title="Subject: ${esc(SUBJ.name)}">${subjIcon(SUBJ)}<span class="sjn">${esc(SUBJ.name)}</span><svg class="sjc" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div class="subjmenu" id="subjmenu" role="group" aria-label="Subject" hidden>${subjBtns()}</div>`
        : '';
  if (had) {
    const f =
      ctl !== 'switch'
        ? document.getElementById('subjb')
        : had === 'flip'
          ? $subjc.querySelector('[data-flip]')
          : $subjc.querySelector(`[data-subj="${had}"]`);
    if (f) f.focus();
  }
  document.querySelectorAll('[data-subj]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.subj === SUBJ.id)));
  document.querySelectorAll('[data-for]').forEach(r => (r.hidden = r.dataset.for !== SUBJ.id));
  // The header's links to the pages that follow the subject carry its prefix (index.html data-key: a page key), each the
  // subject's own page (subjPage: Identify's key is the Fish ID Key with Fish chosen, #fish/identify/key).
  document.querySelectorAll('a[data-key]').forEach(a => a.setAttribute('href', hr(subjPage(a.dataset.key))));
  // No Identify tab for a subject with no key built (UNITS identify): a player never meets a page that is not there yet.
  document.querySelectorAll('[data-tab=identify]').forEach(a => (a.hidden = !keyOf(SUBJ)));
}
// The header chip's menu (three subjects or more): opened and closed by the chip, closed by a choice, Escape or a tap
// elsewhere (as ⚙).
function subjMenu(open) {
  const m = document.getElementById('subjmenu'),
    b = document.getElementById('subjb');
  if (!m || !b || m.hidden === !open) return;
  m.hidden = !open;
  b.setAttribute('aria-expanded', String(open));
  if (open) (m.querySelector('[aria-pressed="true"]') || m.querySelector('button')).focus();
}
// Every subject switch on any page ([data-subj]: Home's row, the header's switch, the header chip's menu; [data-flip]: the
// header's switch on the narrowest phones).
document.addEventListener('click', e => {
  const b = e.target.closest('[data-subj], [data-flip]');
  if (b) {
    subjMenu(false);
    setSubject(b.dataset.subj || b.dataset.flip);
  } else if (e.target.closest('#subjb')) subjMenu(document.getElementById('subjmenu').hidden);
  else if (!e.target.closest('#subjmenu')) subjMenu(false);
});
document.addEventListener('keydown', e => {
  const m = document.getElementById('subjmenu');
  if (e.key !== 'Escape' || !m || m.hidden) return;
  subjMenu(false);
  document.getElementById('subjb').focus();
});
// A Learn or Practice page the subject lacks (SUBJECTS pages) opens its section's first page for it; Identify opens the
// subject's own tool (UNITS identify); the Tools are the corals' whatever the subject. A comparison of another subject's
// units is a page the subject lacks, as a sheet of another subject's unit is.
const subjPage = h => {
  const tab = sectionOf(h),
    m = h.startsWith('g-') ? 'sheet' : modeOf(h);
  if (tab === 'identify') return m === keyOf(SUBJ) ? h : keyOf(SUBJ);
  if (m === 'sheet' && subjHas(SUBJ, h)) return h;
  if (
    (tab !== 'learn' && tab !== 'practice') ||
    (m !== 'sheet' && SUBJ.pages.includes(m) && !(h.startsWith('cmp-') && !subjHas(SUBJ, h))) ||
    !(m === 'sheet' || MODES[tab].some(x => x[0] === m))
  )
    return h;
  // The first page of the section the subject has: never its basics module (a step 0 beside the pages, not a landing page).
  return MODES[tab].map(x => x[0]).find(k => k !== 'basics' && SUBJ.pages.includes(k)) || '';
};
// A tab's words for the subject ("Photo → genus" for corals, "Photo → family" for fish).
const subjWords = t =>
  t
    .replace(/\bCoral basics\b/g, basicsWords().name)
    .replace(/\bgenus\b/g, SUBJ.one)
    .replace(/\bGenera\b/g, SUBJ.many[0].toUpperCase() + SUBJ.many.slice(1))
    .replace(/\bgenera\b/g, SUBJ.many);
// A photo the games may teach from: an extra genus's (DATA.x: Millepora, the bonus genera) only if Pierre's own or
// Research Grade on iNaturalist (no gid), as the extra genera were chosen (tools/build_extra.py). One rule for every
// game (the quiz, the exam, the mix-up card, the Lab's typed game).
const gamePhotoOk = (n, p) => !GX(n).x || p.own || !p.gid;
// Game photos of genus n in view v: one list (core.js applySlots, the featured first), rated by the players' answers
// (model.js photoDiff; docs/LEARNING.md "Hierarchical photo Elo").
const gamePics = (n, v) => {
  const s = (GX(n).sl || {})[v];
  return s ? s.game : GX(n).views[v] || [];
};
// Growth form of each photo: p.form, one of the 7 IMR forms (x: not visible), p.polyps when extended; curation.json
// "gf" wins over forms.json's guess, form and polyps flag each on their own ("p" yes, "n" no). Unclassified: the old
// Coral Finder letter as p.cf. p.formUnsure: a guess to double-check (gunsure; imrFormsOf wants two such photos).
let CFMAP = {};
function applyForms(d, c) {
  const mine = (c && c.gf) || {},
    old = (c && c.form) || {},
    L = v => (v || '').replace(/[pn]/g, ''),
    P = v => ((v || '').includes('p') ? true : (v || '').includes('n') ? false : null);
  const set = p => {
    const m = mine[p.f],
      g = FORMS.gf[p.f],
      l = L(m) || L(g),
      po = P(m) ?? P(g);
    if (l) p.form = l;
    if (l && !L(m) && (FORMS.gunsure || {})[p.f]) p.formUnsure = true;
    if (po) p.polyps = true;
    if (!l && !po) {
      const o = old[p.f] || FORMS.form[p.f];
      if (o) p.cf = o;
    }
  };
  Object.values(d.gen).forEach(g => ['views', 'more'].forEach(k => Object.values(g[k] || {}).forEach(L => L.forEach(set))));
  Object.values(d.course || {}).forEach(L => L.forEach(set));
}
// Photos of genus n that can illustrate Coral Finder front-page box id (e.g. 'B'): those whose IMR form maps to it
// (forms.json "cf": Branching = Branching + Tabulate, ...; L = polyps extended), else the old letter. Colony views
// first, then closer views. Never a "form not visible" photo or a multi-coral photo.
const formPhotos = (n, id) => {
  const g = GX(n),
    ok = CFMAP[id] || '';
  return [...(g.views.wide || []), ...(g.views.medium || []), ...(DATA.course[n] || []).filter(p => p.v !== 'macro')].filter(
    p => !p.multi && (ok === 'p' ? p.polyps : p.form ? p.form !== 'x' && ok.includes(p.form) : p.cf === id)
  );
};

// Photos of genus n whose IMR growth form (p.form) is id, colony views first; never multi-coral photos.
const imrFormPhotos = (n, id) => {
  const g = GX(n);
  return [...(g.views.wide || []), ...(g.views.medium || []), ...(DATA.course[n] || []).filter(p => p.v !== 'macro')].filter(
    p => !p.multi && p.form === id
  );
};
// IMR growth forms a genus takes (IMR Lecture 6 forms, forms.json "forms"): those seen on its classified photos (one
// photo Pierre or the first guess is sure of, or two unsure ones), plus those the Coral Finder front page gives it
// (forms.json "cf" maps each front-page box to IMR forms; Meandering, which maps to every form, is left out).
// A unit with forms of its own (a fish entry: its IMR shape group, core.js treeGen) takes them as they are.
const imrFormsOf = n => {
  const g = GX(n),
    cnt = {},
    sure = {};
  if (g.forms) return g.forms;
  [...Object.values(g.views).flat(), ...(DATA.course[n] || [])].forEach(p => {
    if (!p.form || p.form === 'x' || p.multi) return;
    cnt[p.form] = (cnt[p.form] || 0) + 1;
    if (!p.formUnsure) sure[p.form] = 1;
  });
  const seen = Object.keys(cnt).filter(k => sure[k] || cnt[k] >= 2);
  // A box that maps to several forms (Branching = Branching or Tabulate) only counts for a genus with no classified photo.
  const cf = [...DATA.key, ...(DATA.gen[n] ? [] : (DATA.x || {}).groups || [])]
    .filter(k => k.id !== 'M' && k.leaves.some(l => l.g.includes(n) || ((DATA.x || {}).leaf[l.id] || []).includes(n)))
    .map(k => (CFMAP[k.id] || '').replace('p', ''))
    .filter(m => m.length === 1 || !seen.length)
    .flatMap(m => [...m]);
  return [...new Set([...seen, ...cf])];
};

/* ---------- shared bits ---------- */
// Genera in IMR slate order (data.json lists them that way, starred genera last).
const slateIdx = n => slateGenera().indexOf(n);
const bySlate = L => [...Object.keys(DATA.gen), ...Object.keys((DATA.x || {}).gen || {})].filter(n => L.includes(n));
// group=true marks the card with its IMR confusion group (strip and tag); 'stripe' draws the strip only.
function card(name, group) {
  const g = GX(name),
    p = cover(g),
    ig = (group === true || group === 'stripe') && g.ig ? DATA.imrg.find(x => x.n === g.ig) : null;
  const im = p
    ? `<img class="ph" src="${img(p, 's')}" srcset="${srcset(p)}" data-sz="card" sizes="${sizesFor('card')}" alt="" loading="lazy">`
    : `<span class="ph none">no photo</span>`;
  return `<a class="card${ig ? ' grp' : ''}" href="${esc(hr('g-' + name))}"${ig ? ` style="--g:${groupHue(ig.n)}"` : ''}>${im}${ig && group === true ? `<span class="ig" title="IMR confusion group ${ig.n}: ${esc(ig.t)}">Group ${ig.n}</span>` : ''}<span class="cap"><i>${esc(name)}</i><small>${g.x ? '<b class="ikxtag">Not on IMR list</b> · ' : g.n ? 'No. ' + g.n + ' · ' : g.ig || !starNote(name) ? '<b class="star">★ not surveyed</b> · ' : `<b class="star">${starNote(name)}</b> · `}${esc(altName(g.fam))}</small><p>${gloss(tipsText(g), undefined, true)}</p></span></a>`;
}
function bindCards(root = $v) {
  root.querySelectorAll('[data-g]').forEach(b => (b.onclick = () => go('g-' + b.dataset.g)));
}
function bindGo(root = $v) {
  root.querySelectorAll('[data-go]').forEach(b => (b.onclick = () => go(b.dataset.go)));
}

// Full-size viewer shared by every page. opts.blind() true = quiz before answering: hide the genus, the taxon and the
// source links; the author's name alone stays (blindCredit).
const lb = document.getElementById('lightbox');
let lbClose = null;
// Back closes the open viewer. A viewer's entry reached with no viewer open (Forward after closing a photo, or Back onto
// it from a link followed inside the viewer) is stepped over, like after a reload.
addEventListener('popstate', () => {
  if (lbClose) lbClose(true);
  else if ((history.state || {}).lb) history.back();
});
const VIEW_LABEL = {wide: 'Colony', medium: 'Close-up', macro: 'Corallites', close: 'Close-up'};
// The enlarge mark on photos that open this viewer (quiz, duels, genus sheet: almost no player enlarged a quiz photo, so
// most did not know they could). A magnifier with a plus in a
// corner, from the app's SVG set; decorative, the button around it carries the label "Enlarge photo".
const ZOOMI =
  '<span class="zic" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4M11 8.5v5M8.5 11h5"/></svg></span>';
// The one-time "Tap a photo to see it bigger" hint (quiz.js zoomHint): 'seen' once shown, 'zoomed' once a photo has been
// enlarged on this device; either way it is never due again. Per device, not part of the progress.
const ZHINT_KEY = 'reefid-zoomhint';
// opts.over(p): an optional layer drawn over the whole photo (HTML in % of the photo, e.g. the labels of a Coral basics
// step, proto/basics.js), with a Labels on/off switch; it follows the photo at fit and at actual size.
function zoom(list, i, opts = {}) {
  if (store.get(ZHINT_KEY, null) !== 'zoomed') store.set(ZHINT_KEY, 'zoomed');
  const blind = () => (opts.blind ? opts.blind() : false);
  let overOn = true,
    ro = null;
  const show = () => {
    const p = list[i],
      hide = blind(),
      vl = p.view ? (SUBJ.views.find(v => v[0] === p.view) || VIEWS.find(v => v[0] === p.view) || [0, VIEW_LABEL[p.view]])[1] : '',
      over = !hide && opts.over ? opts.over(p) : '';
    const cap = hide
      ? esc(vl || 'Photo') + blindCredit(p)
      : `${p.genus ? `<b>${uname(p.genus)}</b> · ` : ''}${vl ? esc(vl) + ' · ' : ''}${credit(p)}${p.src ? ` · <a href="${esc(safeUrl(p.src))}" target="_blank" rel="noopener">original</a>` : ''}`;
    // The 1600 px file, over the 480 px one shown at once (usually already loaded). Saver: 960 px, 1600 on a click.
    lb.innerHTML = `<div class="lb-in"><img src="${img(p, saver() ? 'm' : '')}"${p.f ? ` data-f="${esc(p.f)}"` : ''} style="background:center / contain no-repeat url('${img(p, 's')}')" alt="${hide ? `${SUBJ.what} to identify` : esc(p.t || '')}" title="Click for actual size">${over ? `<div class="lb-over"${overOn ? '' : ' hidden'}>${over}</div>` : ''}<p class="lb-cap">${cap}${!hide && p.f && DATA ? ` · ${repBtn({k: 'photo', g: p.genus || genusOfPhoto(p.f), ph: [p.f], m: 'photo'}, '⚑ Report')}` : ''}</p>
      <div class="lb-nav">${list.length > 1 ? `<button type="button" data-d="-1" aria-label="Previous photo">‹</button><span>${i + 1} / ${list.length}</span><button type="button" data-d="1" aria-label="Next photo">›</button>` : ''}${over ? `<button type="button" data-ov aria-pressed="${overOn}">Labels</button>` : ''}<button type="button" data-x aria-label="Close">Close</button></div></div>`;
    lb.classList.remove('full');
    const im = lb.querySelector('.lb-in img');
    im.draggable = false;
    // The layer sits exactly on the photo's box (the photo keeps its ratio, so its box is the picture).
    if (ro) ro.disconnect();
    const ov = lb.querySelector('.lb-over');
    if (ov) {
      const place = () =>
        Object.assign(ov.style, {
          left: im.offsetLeft + 'px',
          top: im.offsetTop + 'px',
          width: im.offsetWidth + 'px',
          height: im.offsetHeight + 'px'
        });
      place();
      im.addEventListener('load', place);
      if (typeof ResizeObserver === 'function') (ro = new ResizeObserver(place)).observe(im);
      lb.querySelector('[data-ov]').onclick = e => {
        e.stopPropagation();
        overOn = !overOn;
        ov.hidden = !overOn;
        e.currentTarget.setAttribute('aria-pressed', overOn);
      };
    }
    im.onclick = e => {
      e.stopPropagation();
      if (moved) return; // the end of a drag, not a click
      // Actual size centred on the point clicked, not on a corner to scroll from.
      const rx = e.offsetX / im.clientWidth,
        ry = e.offsetY / im.clientHeight;
      lb.classList.toggle('full');
      const u = im.getAttribute('src') || '';
      if (ownPhoto(u) && tierOf(u)) im.src = resized(u, '');
      if (lb.classList.contains('full')) {
        const at = () => {
          lb.scrollLeft = rx * im.clientWidth - lb.clientWidth / 2;
          lb.scrollTop = ry * im.clientHeight - lb.clientHeight / 2;
        };
        at();
        im.addEventListener('load', at, {once: true});
      }
    };
    lb.querySelectorAll('[data-d]').forEach(
      b =>
        (b.onclick = e => {
          e.stopPropagation();
          step(Number(b.dataset.d));
        })
    );
    lb.querySelector('[data-x]').onclick = () => close();
    lb.querySelector('[data-x]').focus({preventScroll: true});
  };
  const step = d => {
    i = (i + d + list.length) % list.length;
    show();
  };
  const back = document.activeElement;
  // Phones close an enlarged photo with Back (else Back changes the page under it): opening adds a history entry with the
  // same address, Back (popstate) closes it, and Close takes the entry back.
  const close = fromBack => {
    if (lbClose !== close) return;
    lbClose = null;
    if (ro) ro.disconnect();
    if (!fromBack && history.state && history.state.lb) history.back();
    lb.hidden = true;
    lb.innerHTML = '';
    lb.classList.remove('full');
    document.removeEventListener('keydown', key);
    if (back && back.focus) back.focus({preventScroll: true});
  };
  const key = e => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') step(e.key === 'ArrowRight' ? 1 : -1);
  };
  // At actual size, a mouse drags the photo around (hand cursor; an RA's request:
  // docs/decisions/2026-11-18-decisions-from-app-comments.md); a touch screen already pans it natively. A press that
  // moves under 5 px is still a click (back to fit).
  let drag = null,
    moved = false;
  lb.onpointerdown = e => {
    moved = false;
    if (e.pointerType !== 'mouse' || e.button || !lb.classList.contains('full')) return;
    drag = {x: e.clientX, y: e.clientY, l: lb.scrollLeft, t: lb.scrollTop};
  };
  lb.onpointerup = lb.onpointercancel = () => {
    drag = null;
    lb.classList.remove('dragging');
  };
  lb.onpointermove = e => {
    if (!drag) return;
    // Released outside the window (no pointerup reached us): the drag ends here. No pointer capture:
    // it would retarget the click that zooms back out to the viewer itself.
    if (!(e.buttons & 1)) return lb.onpointerup();
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    if (!moved && Math.hypot(dx, dy) < 5) return;
    moved = true;
    lb.classList.add('dragging');
    lb.scrollLeft = drag.l - dx;
    lb.scrollTop = drag.t - dy;
  };
  // Swipe left/right between photos (single finger only, so pinch-zoom still works).
  let x0 = null;
  lb.ontouchstart = e => {
    x0 = e.touches.length === 1 && !lb.classList.contains('full') ? e.touches[0].clientX : null;
  };
  lb.ontouchend = e => {
    if (x0 === null || list.length < 2) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    x0 = null;
  };
  if (lbClose) lbClose(true);
  else history.pushState({lb: 1, d: pageDepth}, '');
  lbClose = close;
  lb.hidden = false;
  lb.onclick = e => {
    if (e.target === lb && !moved) close();
  };
  document.addEventListener('keydown', key);
  show();
}

/* ---------- key helpers (Coral Finder book boxes, used by genus sheets and the Coral ID Key) + IMR groups ---------- */
const pg = l => (l.a === l.b ? 'p.' + l.a : 'p.' + l.a + '-' + l.b);
const leafLabel = l => l.t + (l.s ? ' · ' + l.s : '');

/* ---------- quiz ---------- */
// The subject on screen (SUBJ; synced, SUBJECT_KEY): everything below (P, Q, the slate, the cards…) is its; another's
// state is read inside inSubject(), setSubject() switches. A subject open to a group (SUBJECTS open 'group'; decision:
// docs/decisions/2026-11-18-decisions-from-app-comments.md) is the admin's and its group's (GROUPS_KEY, from sync.js
// groupsSeen, under the account's name); anyone else gets the corals (subjAt), their saved choice and progress kept.
const GROUPS_KEY = 'reefid-groups';
const subjGroups = () => {
  const o = store.get(GROUPS_KEY, null),
    a = store.get('reefid-account', null);
  return o && a && o.n === a.name && Array.isArray(o.g) ? o.g : [];
};
const subjOpen = S => !subjGroup(S) || IS_ADMIN || subjGroups().includes(S.id);
const subjAt = id => (subjOpen(subjectOf(id)) ? subjectOf(id) : SUBJECTS[0]);
let SUBJ = subjAt(store.get(SUBJECT_KEY, SUBJECTS[0].id));
const sKey = name => subjKey(SUBJ.id, name); // reefid-sync-<subject>-<name>: travels with the player
const sDev = name => subjDev(SUBJ.id, name); // reefid-<dev><name>: stays on this device
// A subject's stored units under their new ids (core.js renameUnits, SUBJECTS renamed: the fish entries t01... became
// the book's families): its progress and its
// first-meeting cards, moved at every load, since a device on an older app may save the old ids again for a while.
function unitsRenamed(S) {
  ['progress', 'intro'].forEach(k => {
    const key = subjKey(S.id, k),
      o = store.get(key, null),
      r = renameUnits(S, o);
    if (r !== o) store.set(key, r);
  });
}
SUBJECTS.forEach(unitsRenamed); // every subject's, played on screen or not
// Progress per genus (per unit of the subject) {ok, ko, streak, conf}, kept in this browser and synced once signed in.
let P = store.get(sKey('progress'), {}) || {};
const save = () => {
  store.set(sKey('progress'), P);
  prog();
  syncSoon();
};
// The header progress pill (showProg, progress.js): that file comes in tier 4 (index.html), after the quiz on a first
// visit, so the pill keeps its 0% until then.
const prog = () => typeof showProg === 'function' && showProg();
// A unit's record, made empty at its first use (a record made: an input of the views, stateBump).
const st = n => P[n] || ((P[n] = {ok: 0, ko: 0, streak: 0}), typeof stateBump === 'function' && stateBump('rec'), P[n]);
const qLoad = () => {
  const q = Object.assign({view: 'any', level: 'auto'}, store.get(sKey('quiz'), {}), {stars: true}); // starred genera are always asked
  if (q.lvv !== 3) {
    q.level = 'auto';
    q.course = false;
    q.lvv = 3;
  } // Auto only: no level selector, no Lecture set
  return q;
};
let Q = qLoad();
const saveQ = () => store.set(sKey('quiz'), Q);
let session = {ok: 0, n: 0, h: []},
  last = null,
  duelPair = null;
// Millepora (fire coral, a hydrozoan): not on the IMR coral list but on its benthic slate, so a slate genus like the
// others, its data in data.json "x" (Coral Finder tips, Research Grade photos). BENTHIC and BONUS: core.js (slateOf).
const isBenthic = n => !DATA.gen[n] && BENTHIC.includes(n) && !!GX(n);
// What each subject's units are, UNITS[id] (core.js SUBJECTS holds the rest of the taxon model; the tree subjects'
// entries start from TREE_UNITS, their shared members):
//   load(S)     its data before its pages open (the corals: data.json; a tree subject: treeLoad)
//   get         a tree subject's files ({f, ph, gm}), read through the fish engine (treeAt)
//   doorsFirst  Home's doors drawn before data.json, in the corals' words (beforeData)
//   pick        its line in the welcome tour's subject pick (tour.js)
//   tour        the tour's words where they differ for it (tour.js words)
//   slate()     the units the games teach and progress counts (corals: core.js slateOf, starred last; fish: every family)
//   scale()     the units the global progress % counts when they are more than the slate (corals: core.js gameOf, the
//               slate and the bonus genera, for every player, opted in or not: rule L6); the slate if absent
//   slateName   with a scale: the name of the slate's own % shown beside the global one (corals: "IMR slate")
//   core()      the part "Open all" opens (model.js introLeft); the slate if absent
//   gate(n)     whether slate unit n may open now (model.js mayOpen); always if absent
//   sets        opt-in sets, offered once by a card when due() (quiz.js bonusOfferShow), ⚙ rows: units(), words, tag
//   opens       slate parts opened on a yes (quiz.js openOfferShow, My progress any time once due), counted either way
//   done()      the card once every unit is met and none may open (quiz.js allMetDue): {k, kick, title, lines}
//   listBy      a keyless tree subject's grouping rank on its Learn list (the sea slugs: 'family'); absent, one block
//   named       true where the units have names of their own, read through GX(n).name (the tree subjects' entries, from
//               TREE_UNITS): Home's band draws the slate's units and its door says the subject's words (home.js)
//   group(k)    a unit group of the subject's teaching by its number, {n, t} (the corals: the IMR lecture's groups,
//               DATA.imrg), for the views that group the units (My progress' Groups, the quiz's progress groups)

// Bonus genera (core.js BONUS; docs/ARCHITECTURE.md "Bonus genera"): Coral Finder genera common at Dauin with a
// look-alike on the slate, or no hard coral; opt-in (Q.bon, ⚙ any time, off keeps their progress), then open like the
// others; they count in the global progress (UNITS scale, the one 45-genus scale for everyone: rule L6), never
// in the IMR slate score; tips labelled the Coral Finder's, photos Research Grade or Pierre's own, never multi-coral
// (tools/apply_bonus.py).

// Fish circles (docs/FISH_PATH.md): 1, the IMR course's families; 2, now and then on the SVS videos; 3, what divers look
// for around Dauin; all count, open or not. treeGate: circle 2 once every circle-1 family was asked, circle 3 at treeC3
// and a yes (UNITS fish opens). treeC3: the circle-3 threshold of the tree subject in force (TREE_AT, whose TREEU it
// reads; core.js SUBJECTS gate c3), circle 1's Entries component (treeScore by[1].entries), or without that score its
// plain mean; never for a subject that has none.
const treeC3 = () => {
  const G = (SUBJECTS.find(x => x.id === TREE_AT) || {}).gate,
    c3 = G && G.c3;
  if (!c3) return false;
  const h = headScore();
  return h ? ((h.by[1] || {}).entries || 0) >= c3.entries : progPct(TREEU.c1) >= 100 * c3.mean;
};
// Circle 2's condition (every circle-1 family asked since its card, and met): a view of the state version (the records,
// the intro map and the tree are its inputs), read for each circle-2 unit the opening checks.
const c1MetCalc = () => (TREEU ? TREEU.c1 : []).every(x => askedOpen(x) && introduced(x));
const c1Met = typeof stateView === 'function' ? stateView('c1Met', c1MetCalc) : c1MetCalc;
const treeGate = n => {
  const c = (GX(n) || {}).circle || 1;
  if (c < 2) return true;
  return c < 3 ? c1Met() : !!TREEU && treeC3();
};
// Every family in play met and none may open now (quiz.js allMetDue; UNITS fish done): the card's reason k, from o:
// c3, circle 3 not reached ("about Open Water on average", the Entries component shown nowhere); beyond, circle 3
// declined (My progress), only once its offer will not come back (c3back: null); all, else (photos, names, exams left).
// o: c3 circle-3 families not met, c3due treeC3, c3row offered in My progress, c3back the offer comes once more, wait
// families with no photo yet, sci names on, sciDue their offer due, sciLeft a genus not met. Pure (tests call it):
// {k, kick, title, lines}, or null (no card now).
const fishNextOf = o => {
  const pl = (n, one, many) => `${n} ${n > 1 ? many : one}`,
    L = [];
  let k = 'all';
  if (o.c3 && !o.c3due) {
    k = 'c3';
    L.push(
      `Next: ${pl(o.c3, 'family', 'families')} beyond the IMR course. They come once you know the course’s families well, about Open Water on average: keep practising them!`
    );
  } else if (o.c3 && o.c3row) {
    if (o.c3back) return null;
    k = 'beyond';
    L.push(
      o.c3 > 1
        ? `The ${o.c3} families beyond the IMR course wait for you: open them in My progress, any time.`
        : 'The family beyond the IMR course waits for you: open it in My progress, any time.'
    );
  } else {
    if (o.wait)
      L.push(`${pl(o.wait, 'more family joins', 'more families join')} the game as soon as ${o.wait > 1 ? 'their' : 'its'} photos are in.`);
    if (!o.sci)
      L.push(
        o.sciDue
          ? 'Next step: scientific genus names. Turn them on in What I learn, on My progress, any time.'
          : 'Next step: once a family is at Advanced, its scientific genus names are offered to you.'
      );
    else if (o.sciLeft) L.push('The scientific genus names of each family come as you reach Advanced on it.');
    if (!L.length) L.push('What’s left: take each family to Instructor, through its mastery exam.');
  }
  return {
    k,
    kick: 'Every family met',
    title: 'You’ve seen them all, for now',
    lines: ['Every fish family open to you is in your game: no new one comes for a while.', ...L]
  };
};
// The sea slugs' card when every genus in play is met and none may open now (quiz.js allMetDue; UNITS seaslug done):
// their circle 3 opens by itself at its gate, so the card says, before it, what comes next (Pierre, 2026-11-20: «Ya pas
// de carte avant de passer au cercle suivant pour les nudibranches?»). o: c3 circle-3 genera not met, c3due treeC3, wait
// genera with no photo yet. Pure (tests call it): {k, kick, title, lines}, k 'c3' before circle 3, else 'all'.
const slugNextOf = o => {
  const pl = (n, one, many) => `${n} ${n > 1 ? many : one}`,
    L = [];
  let k = 'all';
  if (o.c3 && !o.c3due) {
    k = 'c3';
    L.push(
      `Next: ${pl(o.c3, 'more genus', 'more genera')}. They come once you know the genera you have well, about Open Water on average: keep practising them!`
    );
  } else {
    if (o.wait)
      L.push(`${pl(o.wait, 'more genus joins', 'more genera join')} the game as soon as ${o.wait > 1 ? 'their' : 'its'} photos are in.`);
    if (!L.length) L.push('What’s left: take each genus to Instructor, through its mastery exam.');
  }
  return {
    k,
    kick: 'Every genus met',
    title: 'You’ve seen them all, for now',
    lines: ['Every sea slug genus open to you is in your game: no new one comes for a while.', ...L]
  };
};
// A tree subject's photo by its name, for the admin's "Bad photo" flag (flag.js; UNITS photo): {id, its key in the
// subject's curation (core.js treePid: one photo under its candidate and reference names), and what the flag records:
// file (its name), unit (the family showing it, else a scientific genus), sp (its species), view}; null when no unit shows it.
function treePhoto(f) {
  const id = treePid(f),
    G = Object.values(TREEU ? TREEU.gen : {}).sort((a, b) => !!a.rank - !!b.rank);
  for (const g of G)
    // its reserved photos too (shown by the mastery exam, model.js examSet: flagged like any other)
    for (const [v, L] of [...Object.entries(g.views || {}), ...Object.entries(g.held || {})]) {
      const p = (L || []).find(x => x && treePid(x.f) === id);
      if (p) return {id, file: p.f, unit: g.id, ...(p.sp ? {sp: p.sp} : {}), view: v};
    }
  return null;
}
// The names a genus question's typed text may hit that are no genus of the game (UNITS typeOther; core.js typeElse):
// every scientific genus name of the tree in force, and its common names (cn, cnr, IMR tags, en), so an English name is
// told so, never read as a genus. Nothing for another rank.
function treeTypeOther(rk) {
  const F = rk === 'genus' && (TREEF || (TREERAW && TREERAW.f));
  if (!F) return null;
  const first = x => String(x || '').split(/\s+/)[0],
    en = r => ((r && r.en) || []).map(x => x && x.n);
  return {
    sci: [...(F.genera || []).map(g => g.name), ...(F.species || []).flatMap(x => [first(x.name), first(x.now)])].filter(Boolean),
    common: [
      ...(F.genera || []).flatMap(g => [g.common, g.imr, ...en(g)]),
      ...(F.species || []).flatMap(x => [x.common, ...(x.cn || []).flat(), ...(x.cnr || []).flat(), ...en(x)]),
      ...(F.families || []).flatMap(en)
    ].filter(Boolean)
  };
}
// The sea slugs' card (UNITS seaslug hello): the invitation to the players of their beta group.
const SEA_HELLO = {
  group: {
    kick: 'Invitation',
    title: 'Test the sea slug beta',
    body: '<p>You’re invited to try sea slugs: nudibranchs and other sea slugs of the Philippines, by their scientific names, with the same game as the corals.</p><p>Switch subjects at the top of Home, any time: your other progress stays as it is.</p><p class="note">Beta: still being built, iNaturalist photos for now. Your feedback helps: send it from the ? on any page.</p>'
  },
  // all (the sea slugs open to every player, the beta label kept): the same invitation to each player, once, while they
  // keep their beta label (progress.js subjHello).
  all: {
    kick: 'Invitation',
    title: 'Test the sea slug beta',
    body: '<p>Try sea slugs, now in beta: nudibranchs and other sea slugs of the Philippines, by their scientific names, with the same game as the corals.</p><p>Switch subjects at the top of Home, any time: your other progress stays as it is.</p><p class="note">Beta: still being built, iNaturalist photos for now. Your feedback helps: send it from the ? on any page.</p>'
  }
};
// The tree subjects' shared units (the fish, the sea slugs: the subjects read through the fish engine, UNITS get),
// spread into each one's UNITS entry: what reads the tree in force (TREEU) the same way whatever the subject. Each entry
// adds only its words, its files and its own settings and differences (rule S1). Functions only, no shared state.
const TREE_UNITS = {
  load: S => treeLoad(S.id),
  // Its units have names of their own (GX(n).name): Home's band and words (home.js).
  named: true,
  // Its circles 1 to 3, all on the path and in the progress (a sea slug genus's circle is its best species').
  slate: () => (TREEU ? [...TREEU.c1, ...TREEU.c2, ...TREEU.c3] : []),
  // The "mystery" tiles on My progress (progress.js mysteryOn): for every player, whatever their first-launch answer.
  mystery: () => true,
  // Its units for the sheet's replay adopted here (sync.js replayAdoptS: core.js replayProgress gen, the look-alikes and
  // family lines the sheet reads from the subject's tree file, core.js treeReplayGen); null before its data is in.
  gen: () => (TREEU ? TREEU.gen : null),
  // The structure stamp of those units (core.js structStamp: '' while the circles and pairs in force are its tree
  // file's), sent with the requests so the sheet replays under the structure in force (sync.js stsAsk).
  st: () => (TREEU ? TREEST : ''),
  core: () => (TREEU ? TREEU.c1 : []),
  // Its circles, for the achievements that read them (progress.js achSnap circ; core.js FISH_ACH, SEASLUG_ACH).
  circles: () => (TREEU ? [TREEU.c1, TREEU.c2, TREEU.c3] : []),
  // Circle 2 once every circle-1 unit was asked, circle 3 at its gate (treeGate, treeC3).
  gate: treeGate,
  // How a Memory pair is made (proto/pairs.js MEMORY): two photos of one unit that show it differently (one view per unit:
  // a different species, else a juvenile and an adult, else another observation).
  memory: 'photos',
  // The species a photo shows (its sp, by the name treeGenera spn gives it), for the answer log (speciesShown).
  species: p => (TREEU && TREEU.spn && p && p.sp && TREEU.spn[p.sp]) || '',
  // A photo by its name, for the admin's "Bad photo" flag (flag.js; treePhoto).
  photo: f => treePhoto(f),
  norm: typeNormAll,
  // A genus question's typed text that names no genus of the game (treeTypeOther).
  typeOther: rk => treeTypeOther(rk),
  list: () => viewList(),
  // Its sheets (learn.js): a family, a genus or a species, by its id (core.js SUBJECTS sheets), and the page bar's
  // name line for each.
  sheet: id => viewTreeSheet(id),
  // The sections of each sheet, in their order on the page (learn.js sheetBody; each is the sheet's own builder of that
  // name): the names, my progress, the first photo with the ID tips, the look-alikes, the genus rows or species, the
  // juveniles, a species' sexes or colour phases (phases: only where the cited phase list gives them), the report line.
  sheetParts: {
    family: ['names', 'prog', 'hero', 'looks', 'genera', 'juveniles', 'report'],
    genus: ['names', 'prog', 'hero', 'genusMarks', 'note', 'roots', 'moved', 'species', 'looks', 'more', 'report'],
    species: [
      'names',
      'badges',
      'facts',
      'note',
      'genusMarks',
      'marks',
      'roots',
      'rank',
      'photos',
      'juvenile',
      'phases',
      'siblings',
      'looks',
      'more',
      'report'
    ]
  },
  bar: id => treeBar(id)
};
// What the tree subjects (fish, sea slugs) say in the Look-alikes deck and Compare (UNITS cmp, deck, inGame): their declared
// pairs are the ones a source names (UNITS pairs: each carries its source line, lsrc), a unit's tips are its own marks or
// cues under their own label (tipsLabel; a unit with none shows no tips: its summary there is its species, not a clue), and
// its line is the one its record gives (fam); no criteria box.
const treeDeck = () => UNITS[SUBJ.id].pairs(),
  treeInGame = n => !!(TREEU && TREEU.gen[n]),
  treeCmp = {clues: g => !!g.qt, tag: () => '', line: g => esc(g.fam || ''), more: () => ''};
// The units of L (a list) by their parent of rank rk (a genus's family: UNITS listBy), as [[parent or '', its units in L's
// order]] in the subject's tree order, the units with no such parent last. The Genera page (learn.js byRank) and the
// custom quiz (quiz.js cqByFamily) group the same way.
const unitsByParent = (L, rk) => {
  const up = n => {
      const p = GX(n).parent;
      return p && GX(p) && (rankOf(p) || unitRankOf(SUBJ)) === rk ? p : '';
    },
    at = Object.keys(TREEU.gen),
    by = new Map();
  L.forEach(n => by.set(up(n), [...(by.get(up(n)) || []), n]));
  return [...by].sort(([a], [b]) => (a ? at.indexOf(a) : Infinity) - (b ? at.indexOf(b) : Infinity));
};
let phasesFile = null; // the fish's documented colour phases, once (UNITS fish phases)
const UNITS = {
  coral: {
    // The custom quiz's groups (quiz.js viewCustom; the other two views are the same for every subject): by, the first
    // view's name; about, what it shows; src, where the look-alikes of the My mix-ups view's first look come from; groups,
    // the groups of the units in play, [{k, t: title (HTML), sub, mark (HTML), L}] (quiz.js cqByIMR, cqByKey, cqByFamily).
    cq: {
      by: 'IMR groups',
      about: 'the IMR lecture’s groups (the genera to tell apart)',
      src: 'the IMR lecture and the Coral Finder book',
      groups: play => cqByIMR(play)
    },
    // Its Identify tool (MODES identify): the Coral ID Key (proto/idkey.js).
    identify: 'idkey',
    // The words of the "Did you know?" tip for its Identify tool (tips.js identify, quiz.js tipOut): ask, the title's
    // question; name; lo, the body. Declared only by a subject whose Identify tool works: no words, no tip (the Fish ID Key
    // is coming soon).
    idtip: {
      ask: 'Stuck on a coral?',
      name: 'Coral ID Key',
      lo: 'Tap the growth form and the clues you can see: it ranks the genera that fit, then compares them side by side.'
    },
    // How a Memory pair is made (proto/pairs.js MEMORY): the unit's colony and its corallites, two views of it.
    memory: 'views',
    // Its basics module's words (SUBJECTS pages 'basics', basicsWords): mod, its Lab module (proto/basics.js); name; ask,
    // the Home line's question; kick, the offer card's kicker; offer, lo, all, the offer card's and the "lower" card's text
    // (quiz.js startBasicsOffer and the fallback card; lo is also the body of the "Did you know?" basics tip, tips.js,
    // with ask and name); card, the Learn card's line; trail, the card's picture (learn.js, read when the card is drawn).
    basics: {
      mod: 'basics',
      name: 'Coral basics',
      ask: 'New to corals?',
      kick: 'New to corals',
      offer:
        'Seven short steps on real photos, about 5 minutes: a polyp, a corallite, septa and walls, the words the ID tips use. Then the quiz.',
      lo: 'Coral basics shows, on real photos, the few words the ID tips use: corallites, septa, walls. About 5 minutes.',
      all: 'It shows, on real photos, the few words the ID tips use.',
      card: 'Polyp, corallite, septa, walls, growth forms: the words the ID tips use, on real photos.',
      trail: () => ({stops: BASICS_TRAIL, at: BASICS_AT, turn: 3})
    },
    load: () => Promise.resolve(),
    // Home's doors drawn before data.json, the band's photos once it is in (beforeData).
    doorsFirst: true,
    // Its line under its name where a new player picks the subject to start with (tour.js pick).
    pick: 'The coral genera of the IMR slate, as on ReefCloud photos.',
    slate: () => slateOf(DATA),
    // The one 45-genus scale of the global progress (rule L6; docs/decisions/2026-11-21-coral-one-scale.md): the slate
    // and the bonus genera, for every player, opted in or not; the slate's own % is the IMR slate score.
    scale: () => gameOf(DATA),
    slateName: 'IMR slate',
    // The IMR lecture's group k (data.json imrg: {n, t}), undefined for the genera outside the lecture's groups.
    group: k => DATA.imrg.find(x => x.n === k),
    // The structure stamp of its units (core.js structStamp: '' while the look-alike pairs in force are data.json's), sent
    // with the requests so the sheet replays under the pairs in force (sync.js stsAsk).
    st: () => DATAST,
    // Who sees the "mystery" tiles on My progress (progress.js mysteryOn): from the player's first-launch answer c (null
    // before any), only "I'm new to corals"; RAs who had the IMR course and players who know corals well see every genus.
    mystery: c => c === 'new',
    // The species a photo shows, for the answer log (app.js speciesShown): none, a coral question is about the genus.
    species: () => '',
    // The photo's species, said under the verdict (photoTaxon): coralTaxon.
    taxon: (p, n) => coralTaxon(p, n),
    // A photo by its name, for the admin's "Bad photo" flag (flag.js): {id, its key in the subject's curation (flag),
    // and what the flag records: its genus and view}, null when no genus shows it (the views, more, the lecture photos).
    photo: f => {
      for (const [n, g] of Object.entries(DATA.gen)) {
        for (const [v] of VIEWS) {
          if ([...(g.views[v] || []), ...((g.more || {})[v] || [])].some(p => p.f === f)) return {id: f, genus: n, view: v};
        }
        const c = (DATA.course[n] || []).find(p => p.f === f);
        if (c) return {id: f, genus: n, view: c.v};
      }
      return null;
    },
    // Every name a player may type (quiz.js typeNames) and how a typed text is read (core.js typeMatchIn).
    names: () => typeNamesOf([...Object.keys(DATA.gen), ...Object.keys((DATA.x || {}).gen || {})], GX),
    norm: typeNorm,
    // Look-alike pairs for the duels (quiz.js duelPick): the classic pairs (model.js pairs), and Millepora and the bonus
    // genera with the slate look-alike the Coral Finder names.
    pairs: () => [
      ...pairs(),
      ...[...BENTHIC, ...BONUS]
        .filter(b => GX(b))
        .flatMap(b =>
          GX(b)
            .look.filter(a => DATA.gen[a])
            .map(a => [a, b])
        )
    ],
    // The Look-alikes deck (learn.js classics): the pairs a source compares in so many words, the IMR lecture or the book's
    // text (model.js isClassic); the others stay on the genus sheets and in duels. inGame: a unit Compare may show.
    // cmp: what the deck and Compare say of a unit: clues (whether its tips are clues: a genus's summary is), tag (after
    // its name), line (under it), more (behind a fold, only where the unit has it: the Coral ID Key criteria), and src, the
    // sources the deck names in its ? text.
    deck: () => pairs().filter(([a, b]) => isClassic(a, b)),
    inGame: n => gameGenus(n),
    cmp: {
      src: 'the IMR lecture or the Coral Finder book',
      clues: () => true,
      tag: (n, g) => (isBenthic(n) ? ' <small>fire coral</small>' : g.x ? ' <small>bonus</small>' : g.n ? '' : ' ★'),
      line: g => `${esc(altName(g.fam))}${g.ig ? ' · IMR group ' + g.ig : ''}`,
      more: g =>
        (g.crit || []).length
          ? `<details class="more"><summary>Coral ID Key criteria</summary><ul class="crit">${g.crit.map(c => `<li>${esc(c)}</li>`).join('')}</ul><p class="note">${critRef(g)}</p></details>`
          : ''
    },
    // The colourings of Tools › Look-alike web (proto/web.js), each {chip, of: a unit's group key (0 for none), name(key),
    // color(key) optional}: by family, and by IMR lecture group (the app's own colour for a group, groupHue).
    webBy: () => [
      {chip: 'Colour by family', of: n => GX(n).fam, name: altName},
      {
        chip: 'Colour by IMR group',
        of: n => GX(n).ig || 0,
        name: k => (k ? k + '. ' + DATA.imrg[k - 1].t : '★ not in the lecture'),
        color: k => `hsl(${groupHue(k)} 55% 52%)`
      }
    ],
    winks: () => [],
    // The tile photos of unit n (Find the X, quiz.js planPhoto): none, so the corals never play it (coral photos do not
    // read as small thumbnails).
    tiles: () => [],
    // The Learn page (#learn/genera): the list (learn.js viewList, one page for every subject), and a genus's sheet
    // (#learn/genus/Acropora).
    list: () => viewList(),
    sheet: n => viewGenus(n),
    // The sections of its genus sheet, in their order (learn.js sheetBody): the summary line, the warning (a benthic, a
    // genus not on the IMR list, a ★ genus not surveyed), my progress, the cover with the ID tips and More details (the
    // Coral ID Key criteria, In the key), the photos by view, the look-alikes in the same view, the report line.
    sheetParts: {genus: ['sum', 'warn', 'prog', 'hero', 'views', 'looks', 'report']},
    sets: [
      {
        k: 'bon',
        units: () => BONUS.filter(n => GX(n)),
        due: () => slateGenera().every(n => askedOpen(n) && introduced(n)), // a genus closed (model.js introBack, introLive) waits for its card and its question
        kick: 'Every genus of the slate met',
        title: n => `${n} more genera?`,
        body: 'Not on the IMR coral list, but common at Dauin: you may meet them on dives and in ReefCloud photos.',
        note: '⚙ Settings, Bonus genera, any time. They count in your progress, not in your IMR slate score.',
        tag: 'Bonus genus',
        name: 'Bonus genera',
        card: 'Not on the IMR list, but common at Dauin.'
      }
    ]
  },
  fish: {
    ...TREE_UNITS,
    // The Fish ID Key, coming soon (home.js viewFishKey; ROADMAP "Fish ID Key for EventMeasure").
    identify: 'fishkey',
    // emkey: its species are those of the Fish ID Key for EventMeasure, in the Lab (proto/fishkey.js) until Pierre's OK
    // (rule U13): the IMR reference PDF's, from its own files (get).
    emkey: true,
    // Its basics module's words (as the corals': proto/fishbasics.js, learn.js BASICS_TRAIL_F). lo and all are for the
    // "lower" card, off for the fish with their other level-change cards (startFb, below).
    basics: {
      mod: 'fishbasics',
      name: 'Fish basics',
      ask: 'New to reef fish?',
      kick: 'New to reef fish',
      offer: 'Six short steps, about 5 minutes: body shape first, then the identification groups, fins, tails and markings. Then the quiz.',
      lo: 'Fish basics shows what to look at first: body shape, fins, tail and markings. About 5 minutes.',
      all: 'It shows what to look at first: body shape, fins, tail and markings.',
      card: 'Body shape, fins, tails, markings: what to look at first, on drawings and real photos.',
      trail: () => ({stops: BASICS_TRAIL_F, at: BASICS_AT_F, turn: 2})
    },
    // Home's words for a subject with no tool of its own yet (home.js viewHome, viewFishKey; the corals' are the page's
    // own): need, what Identify names; before, when the Learn door is for; when, title, desc, btn, soon: the Identify
    // door's; key, the key's page line; learn, practice: the Learn door's two lines where they are not the fish's.
    door: {
      need: 'a fish on a survey video, or one you photographed on a dive',
      before: 'EventMeasure or your next dive',
      when: 'In EventMeasure<span class="wide"> · or a photo from your dive</span>',
      title: 'Identify a fish',
      desc: 'The Fish ID Key is on its way: it will help you name the fish on the IMR survey videos, or in your own photos.',
      btn: 'Fish ID Key',
      soon: 'Coming soon',
      key: 'A key to name the fish on the IMR survey videos and in your own photos, as the Coral ID Key does for corals.'
    },
    // Home's Learn band in landscape tiles (home.js, home.css .hdtiles.land: most fish are horizontal, square tiles cut
    // them); the corals keep their square-ish close-ups.
    land: true,
    // Its files (a tree subject, read through the fish engine: treeHome, treeLoad): f its tree, ph its first photos
    // (Home before the biggest file), gm its game photos.
    get: {f: () => json('fish.json?v=6'), ph: () => json('fish-photos.json?v=6'), gm: () => json('fish-game.json?v=1')},
    // What start-up waits for: the files of Home (treeHome), and the curated photos too when this device holds them.
    home: S => treeHome(S.id).then(() => fishCached().then(c => c && treeLoad(S.id))),
    // Between the two: the units on their first photos only (dataPartial).
    partial: () => !!TREERAW && !TREERAW.full,
    pick: 'The reef fish families, as on the IMR survey videos.',
    // The welcome tour's words for its steps on this subject (tour.js words; the corals' are the steps' own): {t, d}, d a
    // text or a function of "Tap" / "Click". Fish have one game for now (SUBJECTS pages) and their key is coming soon.
    tour: {
      doors: {
        d: 'Learn & practise while you learn the families. Identify when you need to name a fish on a survey video, or one you photographed on a dive: its key is coming soon.'
      },
      games: {
        t: 'The fish quiz',
        d: 'Practice in the menu opens the quiz: name the family from photos. Its look-alikes come in as you get a family right.'
      },
      progress: {
        d: tap =>
          `Each family fills up as you get it right on harder photos, then a surprise exam in the quiz makes it learned. ${tap} to see every family in the game: a ? for each one you have not met yet.`
      }
    },
    // The cards that tell a player about the subject, one per way it opens (core.js SUBJECTS open; progress.js subjHello:
    // once per device, at a calm moment on Home). group: the invitation to test the fish beta, for the players of its
    // group only (docs/decisions/2026-11-18-decisions-from-app-comments.md). all: the same invitation to every player
    // while the subject keeps its beta label. No number (the families may change), no date.
    hello: {
      group: {
        kick: 'Invitation',
        title: 'Test the fish beta',
        body: '<p>You’re invited to try fish: learn the reef fish families with the same game as the corals.</p><p>Switch between Corals and Fish at the top of Home, any time: your coral progress stays as it is.</p><p class="note">Beta: still being built, iNaturalist photos for now. Your feedback helps: send it from the ? on any page.</p>'
      },
      // all (fish open to all, the beta label kept): the same card to each player, once, while fish keeps
      // its beta label (progress.js subjHello), as an invitation to try the beta.
      all: {
        kick: 'Invitation',
        title: 'Test the fish beta',
        body: '<p>Try fish, now in beta: learn the reef fish families with the same game as the corals.</p><p>Switch between Corals and Fish at the top of Home, any time: your coral progress stays as it is.</p><p class="note">Beta: still being built, iNaturalist photos for now. Your feedback helps: send it from the ? on any page.</p>'
      }
    },
    // About and credits (home.js viewAbout), shown only to a player the subject is open to (subjMine): what they learn
    // (Who made it), where its content comes from (Course content), its photos besides iNaturalist's (Photos) and the works
    // it cites (References).
    about: {
      who: 'reef fish families',
      photos: 'Fish photos also come from <a href="https://www.fishbase.se" target="_blank" rel="noopener">FishBase</a>, under CC BY-NC.',
      course:
        'The fish families follow the reef fish ID book (References); the cues, the look-alikes and IMR’s names come from the IMR fish presentation.',
      refs: '<li>Gerald Allen, Roger Steene, Paul Humann and Ned DeLoach, <i>Reef Fish Identification: Tropical Pacific</i> (2nd ed., 2015), New World Publications: its identification groups order the fish families.</li>'
    },
    // No level-change card (model.js startDue, the fallback cards at 40 and 60 answers) until the fish level is better
    // calibrated (docs/FISH_PATH.md). The answer's variables and the window are kept as they are.
    startFb: false,
    // The tree of its global score (core.js treeScoreTree, SUBJECTS fish score, treeScore).
    // With the species units once the species level is on (spOn; rule D4: the sheet keeps the tree in chunks and replays
    // them), and those by scientific name once their level is (sciSpOn: SCI_SHEET, core.js treeBoardTree with them), read
    // when used, so the tree follows the sheet's version as its replies come.
    tree: () => (TREEU ? (sciSpOn() ? TREEU.treeSci : spOn() ? TREEU.treeSp : TREEU.tree) : null),
    // Its variant table as the sheet's replay reads it (SUBJECTS replayed vars, on TREEF), for the answers replayed here
    // (sync.js rpVars). Null until fish-game.json is in: made on the first photos it would clear groups the sheet left.
    vars: S =>
      TREERAW && TREERAW.game && S && S.replayed && S.replayed.vars
        ? S.replayed.vars(TREEF || TREERAW.f, [TREERAW.f, TREERAW.ph, TREERAW.gm, CUR], S)
        : null,
    // Circle 3, the families beyond the IMR course: offered at the subject's circle-3 threshold (treeC3) instead of opening by itself; once on,
    // its families open one at a time like any other. They count in the % either way.
    opens: [
      {
        k: 'beyond',
        units: () => (TREEU ? TREEU.c3 : []),
        due: () => !!TREEU && treeC3(),
        kick: 'Beyond the IMR course',
        title: () => 'More fish families, beyond the IMR course?',
        body: 'The families divers look for around Dauin, muck diving above all: frogfishes, ghost pipefishes, seahorses, morays…',
        yes: 'Open them',
        note: 'Also in My progress, any time.',
        row: n => `Open the families beyond IMR (${n} ${n > 1 ? 'families' : 'family'})`
      }
    ],
    // Every family in play met and none may open now (quiz.js allMetDue): the card's reason and words
    // (fishNextOf), from circle 3's state (opens beyond), the families with no game photo yet and Scientific names (sets sci).
    done: () => {
      if (!TREEU) return null;
      const S = opensNow().find(x => x.k === 'beyond'),
        G = SETS().find(x => x.k === 'sci'),
        left = n => photoAny(n) && !introduced(n);
      return fishNextOf({
        c3: S ? S.units().filter(left).length : 0,
        c3due: !!S && S.due(),
        c3row: !!S && openOf(S, 1).row,
        // The offer's own rule (core.js openState ask): declined once, it comes back OPEN_AGAIN answers later.
        c3back: !!S && Q[S.k] === false && (Q[S.k + 'N'] || 1) < 2,
        wait: slateGenera().filter(n => !photoAny(n)).length,
        sci: !!G && Q[G.k] === true,
        sciDue: !!G && G.due(),
        sciLeft: !!G && G.all().some(left)
      });
    },
    // The photo's species, said under the verdict (photoTaxon): treeTaxon, by the player's first name.
    taxon: p => treeTaxon(TREEU && TREEU.sps, p, imrNow()),
    // The typed names: the units' (core.js treeTypeNames) and the name index (treeNameIndex, with Pierre's exceptions:
    // curation.json fish.names), each read as the family it lifts to; the species units' apart (cnTypeNames). The genera
    // are those in the game now (sciNow, rule D4); namesKey tells quiz.js typeNames when that set changes.
    names: () => {
      const G = TREEU ? TREEU.gen : {},
        sci = new Set(sciNow()),
        own = Object.fromEntries(Object.entries(G).filter(([n, g]) => g.rank !== 'species' && (g.rank !== 'genus' || sci.has(n)))),
        sp = (TREEU ? TREEU.spl || [] : []).map(n => TREEU.sps[G[n].sp]),
        // the file with the species' own lists of names laid over it (TREEF), and the tree in force's part of the curation
        F = TREEF || (TREERAW && TREERAW.f),
        part = treeCur(
          SUBJECTS.find(x => x.id === TREE_AT),
          CUR
        );
      return [
        ...treeTypeNames(own, SUBJ.typeDrop, F ? treeNameIndex(F, ((part || {}).fish || {}).names) : []),
        ...cnTypeNames(sp).map(o => ({...o, g: spUnitId('cn', o.g)})),
        ...sciTypeNames(sciSpAll())
      ];
    },
    namesKey: () => sciNow().length + ':' + sciSpAll().length,
    // The custom quiz's groups (as the corals' cq): the identification groups of the regional key.
    cq: {
      by: 'ID groups',
      about: 'the identification groups of the regional fish ID key (the families to tell apart)',
      src: 'the IMR fish presentation',
      groups: play => cqByKey(play)
    },
    // The look-alikes the IMR presentation names, each pair once.
    pairs: () =>
      Object.values(TREEU ? TREEU.gen : {})
        .filter(g => !g.rank) // the scientific genera's siblings are traps, not duels
        .flatMap(g => g.look.filter(o => TREEU.gen[o] && (g.id < o || !TREEU.gen[o].look.includes(g.id))).map(o => [g.id, o])),
    // The Look-alikes deck and Compare (treeDeck, treeInGame, treeCmp).
    deck: treeDeck,
    inGame: treeInGame,
    cmp: {...treeCmp, src: 'the IMR fish presentation'},
    // Tools › Look-alike web's colouring (as the corals'): by the key's identification group (SUBJECTS sheets, TREEU groups).
    webBy: () => [
      {
        chip: 'Colour by group',
        of: n => GX(n).group || 0,
        name: k => (k ? ((TREEU.groups || []).find(g => g.n === k) || {title: 'Group ' + k}).title : 'Not in a group yet')
      }
    ],
    // The winks (quiz.js winkShow): for every fish player, from circle 1 on (docs/ARCHITECTURE.md "Subjects").
    winks: () => (TREEU ? TREEU.winks.filter(n => TREEU.gen[n].views.wide.length) : []),
    // The tile photos of unit n (Find the X, quiz.js planPhoto; unitTiles): fish-game.json's xc.
    tiles: unitTiles,
    // The colour phases a cited source documents, per species (fish-phases.json, tools/fish_phases_site.py from
    // tools/fish_phases.json): {species: {id: {name, juv, sex, ip_tp}}}, fetched once, by the Lab's Life stages matched
    // (proto/lifestages.js), which a subject without this member does not offer. Unversioned and outside the service worker's
    // shell (as the sea slugs' files): a Lab game's data is not carried by every device's install.
    // Only a list that came is kept: a failed fetch (json gives {}) is dropped so reopening the game asks again.
    phases: () =>
      (phasesFile =
        phasesFile ||
        json('fish-phases.json').then(j => {
          if (j && j.species) return j;
          phasesFile = null;
          throw new Error('fish-phases.json');
        })),
    // The achievements page's ? text (progress.js viewAch).
    achHelp: () =>
      `<p class="lede">Achievements mark milestones of your fish learning: families met (those of the IMR course, then every family in the game), families at each level (Open Water, Advanced, Divemaster, Instructor), the IMR course’s families and those beyond it at Advanced, your fish % every 10 points, scientific genus names and species named by their common names and by their scientific names, and Fish basics done. Never time spent. They are the fish's own: your coral achievements are on the Corals side. Contributions, apart, thank you for the reports and feedback you send (⚑ Report a problem, Send feedback); they never count in your progress. The share of players counts everyone who signed in.</p>`,
    // My progress's ? text (progress.js quizBoard).
    progHelp: () =>
      `<p class="lede"><b>To learn a fish family</b>, keep getting it right: its % is the share of its photos you would name alone and typed, as far as your answers on it have shown, up to 95%. From ${Math.round(100 * DOM.EX)}%, once it has been asked beside each of its look-alikes, comes its <b>mastery exam</b>: ${EXAM.n} hard questions on it slipped unannounced into the quiz, at least ${TYPED.exam} of them typed; all right and you are its Instructor (100%). A mistake sets a family back, for the family you missed and for the one you answered. <b>Levels</b>: Snorkeler under 50%, Open Water from 50%, Advanced from 80%, Divemaster from ${Math.round(100 * DOM.EX)}% (its exam is on), Instructor once the exam is passed. <b>Your fish %</b> covers the whole path: the families (alone, up to 50%), then the species by their common and scientific names; a scientific genus you know counts as half the scientific name of each of its species. The species most met around Dauin count most, and the % rises fast at first, then slower and slower. The three bars under your name show the parts: Families, Common names, Scientific names. You start with the families of the IMR survey; more families open as you go. A <b>?</b> tile is a family you have not met yet: it shows once it opens. The surprise cards don't count. The fish have their own leaderboard and achievements.</p>`,
    // The quiz's ? text (quiz.js gameHelp).
    // cur: the game on screen (the Duel tab opens with its own paragraph, quiz.js duelLede).
    help: cur => `${
      String(cur || '').startsWith('quiz-duel')
        ? duelLede('the look-alikes the IMR fish presentation names')
        : `<p class="lede">Name the fish family in the photo: the families of the reef fish ID book, IMR’s name shown beside its own. Pick an answer (or press 1-4); after answering you get the verdict and one line that settles it (when you mix up two look-alikes, how to tell them apart; else the family's first IMR cue, or its first ID mark from another source, named). <b>More</b> opens the other IMR cues and the rest; <b>Next</b> (or Enter) goes on. The other choices start in other groups of the ID book and the look-alikes come in as you get a family right.</p>${customPlayLede(cur)}`
    }
  <p class="lede">A family fills up to 95% with your right answers; it is learned (100%) once you pass its mastery exam, ${EXAM.n} hard questions slipped unannounced into the quiz, at least ${TYPED.exam} of them typed. Typed answers accept the family’s name, IMR’s name, its scientific name and the names IMR uses inside it (Chromis, Bannerfish...). Every fish family counts in your progress. You start with the families of the IMR survey; more families open as you go. <b>Photos</b>: from iNaturalist and FishBase; the easiest, reference-quality photos come first, whoever took them.</p>`,
    sets: [
      // The scientific genera (treeGenera, sciOpen): offered once a family is at Advanced, each family's joining from its
      // Advanced; auto: an IMR player's IMR genera; all: every genus in the game now (sciNow), for setOf. They count in
      // the fish % (the genus credit, core.js treeScore).
      {
        k: 'sci',
        all: () => sciNow(),
        units: () =>
          TREEU && typeof genScore === 'function' ? sciOpen(sciNow(), genScore, introducedFn(), imrSaid(), !!Q.sciH).units : [],
        auto: () => (TREEU && typeof genScore === 'function' ? sciOpen(sciNow(), genScore, introducedFn(), imrSaid()).auto : []),
        // Families met first: no genus card while a family in play is still not met (setLater, model.js openPick); its
        // auto units, the set turned on by hand early and Open all are exempt.
        after: 1,
        due: () => typeof genScore === 'function' && slateGenera().some(n => genScore(n) >= LV_AT[1]),
        // rv: the rules a choice is made under (Q.sciV, synced): 1 since the offer is at Advanced; one turned on before
        // gets the back card once (quiz.js bonusBackShow), either answer recorded under rv 1.
        rv: 1,
        back: {
          title: 'Keep the scientific genus names?',
          body: 'Scientific genus names now come later, once a family is at Advanced. You can close them for now: your progress on them is kept.',
          imr: 'The genera of the IMR course stay in the game.',
          no: 'Close them for now',
          yes: 'Keep them'
        },
        page: false, // not on the families page
        kick: 'Scientific names',
        title: () => 'Scientific genus names?',
        // EventMeasure means something only to an IMR player: the others read what the names are. A
        // getter, read where the card and My progress show it (quiz.js bonusOfferShow, progress.js).
        get body() {
          return typeof imrSaid === 'function' && imrSaid()
            ? 'For the families you know well: a photo and four scientific genus names, as EventMeasure names them. A family’s genera come as you reach Advanced on it.'
            : 'For the families you know well: a photo and four scientific genus names, the Latin names scientists and survey teams use. A family’s genera come as you reach Advanced on it.';
        },
        note: 'What I learn, on My progress, any time. They count in your fish %.',
        tag: 'Scientific genus',
        name: 'Scientific names',
        // What it says once turned on (the What I learn card, progress.js: the offer at Advanced never locks the setting).
        onToast: () => `Scientific names on: a family’s genera come as you reach ${Q.sciH ? 'Open Water' : 'Advanced'} on it.`,
        card: ''
      },
      // The species by their common names (docs/FISH_PATH.md "Unlock rules", branch A): no offer; its switch is the What I
      // learn card's Common names row (learn, below), on unless turned off there; auto: spPlay, once the species level is
      // on (spOn, rule D4); all: every species unit (setOf, rankUnits). They count in the fish % (the common names,
      // core.js treeScore C).
      {
        k: 'sp',
        all: () => (TREEU ? TREEU.spl || [] : []),
        units: () => [],
        auto: () => (TREEU && typeof genScore === 'function' ? spPlay(TREEU.spl || [], genScore, introducedFn(), spOn()) : []),
        due: () => false,
        page: false, // not on the families page
        kick: 'Species',
        title: () => 'Species names',
        body: 'For the families you know well: a photo and four species, by their common names.',
        note: '',
        tag: 'Species',
        name: 'Species',
        // The first species met: its card marks the milestone (docs/FISH_PATH.md "Name-display schedule", milestones),
        // once per player (the units met, synced), never again.
        card: n =>
          (TREEU.spl || []).some(o => o !== n && introduced(o))
            ? ''
            : '<b>Your first species name.</b> A family you know well (Advanced) now brings its species, the most met around Dauin first, more of them as you master more families.'
      },
      // The species by their scientific names (SCI_SP, shared with the sea slugs): no row of their own, they come with the
      // scientific genera in play (sciUp), so the Scientific names row turns both.
      SCI_SP
    ],
    // The names step at the welcome (namesAsk, namesSet; Pierre, 2026-11-04, docs/FISH_PATH.md "Which names a player
    // learns"): right after the first-launch question, in the tour and on its card, common names, scientific names or
    // both. rows: what each answer does to the What I learn rows below (k: on or off); skip: the first-launch answers
    // that skip it ("I'm at IMR" has both already). Closing it leaves the rows as they play.
    namesStep: {
      q: 'Which names do you want to learn?',
      lede: 'Every fish starts with its family. You can change this any time: My progress, What I learn.',
      skip: ['imr'],
      opts: [
        {
          id: 'common',
          name: 'Common names',
          line: 'Each family’s species by their common names, as you reach Advanced on it. Scientific names are offered later.',
          rows: {sp: true, sci: false}
        },
        {
          id: 'sci',
          name: 'Scientific names',
          line: 'Each family’s genera, then their species, by their scientific names, as you reach Advanced on it. No common-name species.',
          rows: {sp: false, sci: true}
        },
        {
          id: 'both',
          name: 'Both',
          line: 'Common and scientific names, each as you reach Advanced on a family.',
          rows: {sp: true, sci: true}
        }
      ]
    },
    // The What I learn card's names rows (learnRows; Pierre, 2026-11-18, Q396, Q400 D, Q404 A): common names, scientific
    // names, each on or off, both off leaving the families; "I'm at IMR" has both (its IMR genera come by themselves).
    learn: [
      {
        name: 'Common names',
        when: () => spOn(),
        self: () => true,
        line: () => 'Species by their common names. A family’s come as you reach Advanced on it.',
        k: 'sp'
      },
      {
        name: 'Scientific names',
        self: () => imrNow(),
        line: () =>
          `${sciSpOn() ? 'Genera, then their species' : 'Genera'}, by their scientific names. A family’s genera come as you reach Advanced on it${imrNow() ? ', the IMR course’s from Open Water' : ''}.`,
        // An IMR player who has not turned the set on: the IMR genera alone come (sciOpen auto).
        part: () => 'The IMR course’s genera only, from Open Water. On: every family’s genera, as you reach Advanced on it.',
        k: 'sci'
      }
    ],
    // The milestone of the first species met by its scientific name (SCI_SP card; docs/FISH_PATH.md "Name-display
    // schedule", milestones: "You've unlocked scientific names: questions of this kind start coming", 2026-11-04).
    // Dauin's top 20 by their scientific names (progress.js achSnap top; core.js FISH_ACH fdauin20).
    top: () => sciTop(sciSpAll(), 20),
    sciCard:
      '<b>You’ve unlocked scientific names.</b> Questions of this kind start coming: a genus you know well (Advanced) now brings its species, by their scientific names, the most met around Dauin first.'
  },
  // The sea slugs (core.js SUBJECTS; docs/ARCHITECTURE.md "Subjects"): a tree subject on the fish engine, circles 1 to 3
  // (205 species of tools/seaslugs.json), its genera from the start (core.js SUBJECTS unitRank), its families structure
  // only, scientific names only, no IMR content.
  seaslug: {
    ...TREE_UNITS,
    // No `identify`: no key is built for the sea slugs, so Home has the one door and there is no Identify tab (keyOf).
    // Its basics module's words (as the fish's: proto/seaslugbasics.js, learn.js BASICS_TRAIL_S). offer is for the
    // first-launch answer "new" and lo, all for the "lower" card: the sea slugs have neither yet (no first-launch
    // question, startFb false), so only the Home line, the Learn card and the tab read it.
    basics: {
      mod: 'seaslugbasics',
      name: 'Sea slug basics',
      ask: 'New to sea slugs?',
      kick: 'New to sea slugs',
      offer:
        'Four short steps, about 5 minutes: a dorid part by part, the aeolids’ cerata, the other sea slugs, the groups. Then the quiz.',
      lo: 'Sea slug basics shows the parts the ID marks name: rhinophores, gills, cerata, flaps. About 5 minutes.',
      all: 'It shows the parts the ID marks name: rhinophores, gills, cerata, flaps.',
      card: 'Rhinophores, gills, cerata, flaps: the parts the ID marks name, on drawings and real photos.',
      trail: () => ({stops: BASICS_TRAIL_S, at: BASICS_AT_S, turn: 1})
    },
    door: {
      before: 'your next dive',
      // Home's Learn and Practice lines (home.js; the fish's are written there)
      learn: 'The genera by family, in their taxonomic groups',
      practice: 'Name the genus from photos'
    },
    land: true,
    // Its files (treeHome, treeLoad), small: no first photos, Home waits for both. Unversioned (beta, its group only): the
    // service worker revalidates them and never holds them in its shell for the players who cannot open it.
    get: {f: () => json('seaslug.json'), gm: () => json('seaslug-game.json')},
    pick: 'The sea slugs of the Philippines, nudibranchs first, by their scientific names.',
    tour: {
      doors: {
        t: 'Learn & practise',
        d: 'Learn the sea slug genera, by their scientific names, then train your eye on photos.'
      },
      games: {
        t: 'The sea slug quiz',
        d: 'Practice in the menu opens the quiz: name the genus from photos.'
      },
      progress: {
        d: tap =>
          `Each genus fills up as you get it right on harder photos, then a surprise exam in the quiz makes it learned. ${tap} to see every genus in the game: a ? for each one you have not met yet.`
      }
    },
    // The invitation to the players of its group (progress.js subjHello; the fish beta's card, in its words).
    hello: SEA_HELLO,
    about: {
      who: 'sea slug genera',
      photos: '',
      course:
        'The sea slugs, their circles and their stars come from iNaturalist’s Research Grade observations in the Philippines, Wikipedia pageviews and public dive pages; their names and classification from WoRMS.',
      refs: '<li>WoRMS Editorial Board, <a href="https://www.marinespecies.org" target="_blank" rel="noopener">World Register of Marine Species</a>: the sea slugs’ scientific names and classification.</li><li><a href="https://en.wikipedia.org" target="_blank" rel="noopener">Wikipedia</a>: some of the sea slugs’ English names, linked from the name.</li>',
      // The sources its data cites, listed under References (home.js aboutCites): in, the parts of seaslug.json that hold
      // them (the ID marks and look-alike lines of its families, genera and species, their names' sources, its guides).
      // The sources cited by a key (en src: inat, worms, wiki) are lines of the page already: iNaturalist and WoRMS in
      // home.js References, Wikipedia in refs above; tests/seaslug-about.test.js checks that each key has its line.
      cites: {
        lead: 'Cited on the sea slug sheets, for their ID marks, look-alike lines and names:',
        in: ['families', 'genera', 'species', 'ensrc']
      }
    },
    // No level-change card until the subject is calibrated (as the fish).
    startFb: false,
    // Its three circles (tools/seaslug_game.py CIRCLES) of genera (core.js SUBJECTS unitRank) open at the fish's
    // thresholds (TREE_UNITS gate), circle 3 by itself: no offer card (the fish's speaks of the IMR course).
    // Every genus in play met and none may open now (quiz.js allMetDue): the card that says what comes next (slugNextOf),
    // circle 3 above all.
    done: () => {
      if (!TREEU) return null;
      const left = n => photoAny(n) && !introduced(n);
      return slugNextOf({
        c3: (TREEU.c3 || []).filter(left).length,
        c3due: treeC3(),
        wait: slateGenera().filter(n => !photoAny(n)).length
      });
    },
    // The photo's species under the verdict, after the answer only: its scientific name, the WoRMS name beside it, and
    // its first English name as information (vernFirst; never a choice).
    taxon: p => {
      const t = treeTaxon(TREEU && TREEU.sps, p, false);
      return t ? {...t, common: vernFirst(t.id)} : t;
    },
    // Its English common names and nicknames, information only (tools/seaslug_names.py): on the
    // sheets, the Learn tiles and after an answer, never as a choice; typed on a genus question, a common name is told
    // so (treeTypeOther), never right, as a fish genus's common name never is (treeGenera names).
    vern: id => treeVern(id),
    // The genera's names (its species records apart: their scientific names are read as their own units, sciTypeNames,
    // once their level is on).
    names: () => [
      ...treeTypeNames(
        Object.fromEntries(Object.entries(TREEU ? TREEU.gen : {}).filter(([, g]) => g.rank !== 'species')),
        SUBJ.typeDrop,
        []
      ),
      ...sciTypeNames(sciSpAll())
    ],
    namesKey: () => String(sciSpAll().length),
    // The custom quiz's groups (as the corals' cq): the genera by their families.
    cq: {
      by: 'Families',
      about: 'the genera by their families (the genera of one family are the ones to tell apart)',
      src: 'a specialist source',
      groups: play => cqByFamily(play)
    },
    // The look-alike pairs a specialist source names (seaslug.json genus look: the Sea Slug Forum, Nudi Pixel, the papers;
    // decl), each pair once: the duels. A genus's other sibling genera stay its traps (app.js
    // treeGenera look); the pairs only iNaturalist shows are data look-alikes (model.js dataSeed, dataLooks).
    pairs: () =>
      Object.values(TREEU ? TREEU.gen : {})
        .filter(g => g.rank === 'genus')
        .flatMap(g =>
          (g.decl || []).filter(o => TREEU.gen[o] && (g.id < o || !(TREEU.gen[o].decl || []).includes(g.id))).map(o => [g.id, o])
        ),
    // The Look-alikes deck and Compare (treeDeck, treeInGame, treeCmp).
    deck: treeDeck,
    inGame: treeInGame,
    cmp: {...treeCmp, src: 'a specialist source (the Sea Slug Forum, Nudi Pixel, the papers)'},
    // Tools › Look-alike web's colouring: by family (a genus's parent).
    webBy: () => [{chip: 'Colour by family', of: n => GX(n).parent || 0, name: k => (k ? (GX(k) || {name: k}).name : 'No family')}],
    winks: () => [],
    // The tile photos of unit n (Find the X; unitTiles): seaslug-game.json's xc, cut by tools/seaslug_game.py where a photo
    // carries the animal's box (bb: judging/SEASLUG.md "The animal's box"), so a genus plays it once it has tiles.
    tiles: unitTiles,
    // Its sheets in its own words (learn.js sheetWord: no fish word on a sea-slug sheet): each sheet's ?
    // text, a species' rank in its family by its observers in the Philippines (seaslug.json present.area, the subject's
    // area), no species link but iNaturalist and WoRMS (FishBase is the fish's), and a sea slug as the "No photo yet"
    // drawing. Its ID marks are its own, sourced (tools/seaslug_cues.json): shown on the sheets and in the quiz feedback.
    words: {
      famLede: () =>
        'One family on one page, under its scientific name and its English names where a source gives one. <b>ID marks</b> are what to look at, in our words from the sources numbered after each line: the rhinophores, the gills or the cerata, the mantle and its edge, the body shape. <b>Genera</b> lists its genera, each with a few of its species. <b>Opened for me</b> shows the species of the genera you have met in the quiz; <b>All</b> shows every species. Tap a photo to enlarge it.',
      genLede: f =>
        `One genus of the ${esc(f.name)} on one page: its <b>ID marks</b>, in our words from the sources numbered after each line, then its species, one photo each, the most recorded in the Philippines first. <b>Opened for me</b> shows the species of the genera you have met in the quiz; <b>All</b> shows every species. <b>Don't confuse with</b> shows the look-alikes a source names or players mix up, each with its source. Tap a photo to enlarge it.`,
      spLede:
        'One species on one page: its scientific name, its English names where a source gives one, its family and genus, its photos (the easiest first; tap one to enlarge it) and the other species of its genus.',
      met: {v: s => (s.present || {}).area || 0, where: 'in the Philippines, by how many observers recorded it'},
      links: () => [],
      nophoto:
        '<svg viewBox="0 0 64 40" aria-hidden="true"><path class="np-t" d="M5 31c4-8 14-12 27-12s22 4 27 12c-7 3-16 4-27 4S12 34 5 31z"/><path d="M15 21l-3-9M20 20l1-9M45 20c0-4 2-7 6-8M45 20c3-3 6-4 9-3"/><circle class="eye" cx="13" cy="11" r="1.5"/><circle class="eye" cx="21" cy="10" r="1.5"/></svg>'
    },
    // The Genera page's line, and its genera grouped by family (learn.js viewList listBy; docs/ARCHITECTURE.md
    // "Subjects"). The fish group theirs by the key.
    lede: 'The sea slug genera, by their scientific names, in their families. Photos: iNaturalist.',
    // The achievements page's ? text (progress.js viewAch).
    achHelp: () =>
      `<p class="lede">Achievements mark milestones of your sea slug learning: genera met, genera at each level (Open Water, Advanced, Divemaster, Instructor), families with every genus at Advanced, the nudibranch genera and those of the other groups, the genera the quiz opens first at Advanced, your sea slug % every 10 points, and the species at Advanced by their scientific names, the stars among them. Never time spent. They are the sea slugs’ own: your coral and fish achievements are on their own sides. Contributions, apart, thank you for the reports and feedback you send (⚑ Report a problem, Send feedback); they never count in your progress. The share of players counts everyone who signed in.</p>`,
    listBy: 'family',
    progHelp: () =>
      `<p class="lede"><b>To learn a sea slug genus</b>, keep getting it right: its % is the share of its photos you would name alone and typed, as far as your answers on it have shown, up to 95%. From ${Math.round(100 * DOM.EX)}%, once it has been asked beside each of its look-alikes, comes its <b>mastery exam</b>: ${EXAM.n} hard questions on it slipped unannounced into the quiz, at least ${TYPED.exam} of them typed; all right and you are its Instructor (100%). A mistake sets a genus back, for the genus you missed and for the one you answered. <b>Levels</b>: Snorkeler under 50%, Open Water from 50%, Advanced from 80%, Divemaster from ${Math.round(100 * DOM.EX)}% (its exam is on), Instructor once the exam is passed. A <b>?</b> tile is a genus you have not met yet: it shows once it opens. The sea slugs have their own leaderboard and achievements.</p>`,
    help: cur => `${
      String(cur || '').startsWith('quiz-duel')
        ? duelLede('the look-alikes a specialist source names')
        : `<p class="lede">Name the sea slug genus in the photo, by its scientific name. Pick an answer (or press 1-4); <b>Next</b> (or Enter) goes on. The genera of the same family come in as you get a genus right.</p>${customPlayLede(cur)}`
    }
  <p class="lede">A genus fills up to 95% with your right answers; it is learned (100%) once you pass its mastery exam, ${EXAM.n} hard questions slipped unannounced into the quiz, at least ${TYPED.exam} of them typed. Typed answers accept the genus’s scientific name. <b>Photos</b>: from iNaturalist, the easiest first, whoever took them.</p>`,
    // No opt-in set: its genera are its units from the start (core.js SUBJECTS unitRank). Its species by their scientific
    // names (SCI_SP, the fish's own set), and their first one's card in its words: a sea slug player always had scientific
    // names, so the milestone is the first species, not the names.
    sets: [SCI_SP],
    // Its top species, for the achievements (progress.js achSnap top; core.js SEASLUG_ACH ssstars): its stars.
    top: () => sciStars(sciSpAll()),
    // The What I learn card's one names row: its species, by their scientific names (its genera are the base, always on).
    learn: [
      {
        name: 'Species',
        when: () => sciSpOn(),
        self: () => true,
        line: () => 'Species by their scientific names. A genus’s come as you reach Advanced on it.',
        k: 'ssp'
      }
    ],
    sciCard:
      '<b>Your first species.</b> A genus you know well (Advanced) now brings its species, by their scientific names, the most seen in the Philippines first.'
  }
};
treeAt(SUBJ.id); // the tree of the subject opened on (fish.json for the fish) in force before its files come
const SETS = () => UNITS[SUBJ.id].sets;
// The genera the games teach (the units of the subject): "the slate" in the code means this list.
const slateGenera = () => UNITS[SUBJ.id].slate();
// The units the subject's global progress % counts (UNITS scale: the corals' one 45-genus scale, the slate and the bonus
// genera, rule L6), the slate where the subject has no scale of its own.
const scaleUnits = () => (UNITS[SUBJ.id].scale || UNITS[SUBJ.id].slate)();
// The opt-in set a unit belongs to (the coral bonus genera, the fish scientific genera), or null.
// Each unit's set, the first that lists it, once per data version (a view: setMapCalc; the sets' lists are data).
const setMapCalc = () => {
  const M = new Map();
  SETS().forEach(S => (S.all || S.units)().forEach(n => M.has(n) || M.set(n, S)));
  return M;
};
const setMap = dataView('setMap', setMapCalc);
const setOf = n => setMap().get(n) || null;
const isBonus = n => !!setOf(n);
// Players who had bonus genera unlocked by the former progress thresholds (Q.bu, Millepora counted first) keep them
// on, so nothing disappears under them; Millepora alone (Q.bu 1) is now a slate genus, so not an opt-in.
if (Q.bon === undefined && Q.bu > 1) {
  Q.bon = true;
  saveQ();
}
// The units a set brings without asking (its auto: an IMR player's IMR genera, the species), none once its What I learn
// row is turned off (Q[k + 'O']: that level stops being asked, Q404 A; its units keep their bars, Q402 A). A "Not now" or
// "Close them for now" card (Q[k] false alone) keeps them, as before the card. Every reader of a set's auto goes through it.
// A set's auto and its units (S.auto, S.units: sciOpen, spPlay, sciPlay over the tree) are views of the state version per
// set (setAuto, setUnits; computed where a part of this file runs alone): the units in play (bonusList, sciUp, shareFree)
// each read them.
const setAuto = typeof stateViewBy === 'function' ? stateViewBy('setAuto', S => S.auto()) : S => S.auto();
const setUnits = typeof stateViewBy === 'function' ? stateViewBy('setUnits', S => S.units()) : S => S.units();
const autoOf = (S, q = Q) => (S.auto && !q[S.k + 'O'] ? setAuto(S) : []);
// The What I learn card (progress.js learnCard; docs/FISH_PATH.md "Which names a player learns"): the subject's names rows
// (UNITS learn: {k, name, line, part, when, self}), those whose level is on now (when: rule D4, the sheet replays it). A
// row is on while not turned off on the card (Q[k + 'O']) and either turned on (Q[k] true) or bringing its units by
// itself (self: the species, an IMR player's scientific genera), so a record no switch was tapped on reads as it plays.
// rowState: 'part' for a row whose self brings only some of its units (part: its line then, an IMR player's IMR genera
// alone) while the set itself is not on; its On turns the rest on.
const learnRows = () => (UNITS[SUBJ.id].learn || []).filter(r => !r.when || r.when());
const rowOn = (r, q = Q) => !q[r.k + 'O'] && (q[r.k] === true || !!(r.self && r.self()));
const rowState = (r, q = Q) => (!rowOn(r, q) ? 'off' : r.part && q[r.k] !== true ? 'part' : 'on');
// A row's switch: on, the set is on (Q[k] true) and its auto comes back; off, the set is off and its auto stops (Q[k + 'O']).
// Never by hand early (bonusSet's hand, Q.sciH): a level turned on here comes as its parent reaches the usual threshold,
// never sooner (Pierre, 2026-11-18, Q401 A). Synced with the choice (sync.js mergeSaved: the O suffix).
function learnSet(k, on) {
  if (on) delete Q[k + 'O'];
  else Q[k + 'O'] = true;
  bonusSet(!!on, k);
}
// The names step at the welcome (UNITS namesStep; Pierre, 2026-11-04): asked after the first-launch answer c, in the tour and on
// its card, unless that answer skips it or the player said "I'm at IMR" (imrNow: an answer given earlier here counts), every
// row it sets is on offer (learnRows: the species level, rule D4) and no row was chosen yet (Q404 A: the players who already
// play keep what they have).
const namesDecl = () => UNITS[SUBJ.id].namesStep || null;
const namesKeys = () => Object.keys(namesDecl().opts[0].rows);
// No row of the step set yet (a record no switch was tapped on).
const namesFresh = () => namesKeys().every(k => Q[k] === undefined && !Q[k + 'O']);
function namesAsk(c) {
  const N = namesDecl();
  if (!N || !c || N.skip.includes(c) || imrNow()) return false;
  const rows = learnRows();
  return namesKeys().every(k => rows.some(r => r.k === k)) && namesFresh();
}
// An answer of the step: each row it names on or off as the answer says (learnSet), only where the row is not so already,
// so "common names" on a record no switch was tapped on writes nothing and the scientific names stay offered at Advanced.
// Written once, when the answer is final (the card's click; the tour's close, which holds it meanwhile so that going back
// to change it, or the first-launch answer, leaves nothing to take back or to synchronize).
function namesSet(id) {
  const o = namesDecl().opts.find(x => x.id === id);
  if (o) learnRows().forEach(r => r.k in o.rows && rowOn(r) !== o.rows[r.k] && learnSet(r.k, o.rows[r.k]));
}
// The step's answers as big buttons, like the first-launch question's (startOptsHtml); cur: the one in force, marked.
const namesOptsHtml = cur =>
  `<div class="startopts" role="group" aria-label="${esc(namesDecl().q)}">${namesDecl()
    .opts.map(
      o =>
        `<button type="button" class="startopt" data-names="${o.id}" aria-pressed="${o.id === cur}"><b>${esc(o.name)}</b><small>${esc(o.line)}</small></button>`
    )
    .join('')}</div>`;
// The units of the opt-in sets the player has on, and those a set brings without asking (autoOf), each once. A view of
// the state version (stateView), computed once per version instead of by each of its readers: bonusCalc computes it.
const bonusCalc = () => [...new Set(SETS().flatMap(S => [...(Q[S.k] ? setUnits(S) : []), ...autoOf(S)]))];
const bonusList = stateView('bonusList', bonusCalc);
const sciUp = stateView('sciUp', sciUpCalc);
// A unit of a set that opens after the slate (its after: the fish scientific genera once the offer is accepted), so it
// waits while a slate unit in play is still to open (model.js openPick), unless its set brings it by itself (auto: an
// IMR player's IMR genera) or the player turned the set on by hand before it was due (Q[k + 'H']). Open all is
// model.js's (openedAll).
const setLater = n => {
  const S = setOf(n);
  return !!(S && S.after) && !Q[S.k + 'H'] && !autoOf(S).includes(n);
};
// The units the rank share leaves alone (model.js SHARE): those of a set that opens after the slate (its after) that
// come in the slate's phase: the ones it brings by itself (auto: an IMR player's IMR genera from their family's Open
// Water) and all of them once the player turned it on by hand before it was due (Q[k + 'H']). Read once per answer
// (model.js sharesNow). A view of the state version (stateView): shareFreeCalc computes it.
const shareFreeCalc = () => SETS().flatMap(S => (S.after ? [...(Q[S.k + 'H'] ? setUnits(S) : []), ...autoOf(S)] : []));
const shareFree = stateView('shareFree', shareFreeCalc);
// The parts of the slate opened by choice (UNITS opens). One is on once the player said yes, or, never asked, when one of
// its units already opened on a card (players whose circle 3 once opened by itself keep it): a closed mark ('b': a unit
// answered in a live game before the path opened it, model.js introLive) opens nothing (rule L4). A unit of a part that
// is off never opens (model.js mayOpen); one already open stays open.
// (core.js openState: on, row, ask; the card again once, OPEN_AGAIN answers after a first "Not now", then never). The
// answers are counted on the answer clock (model.js tally), so a count that goes down (rule D9) never delays that ask.
const opensNow = () => UNITS[SUBJ.id].opens || [];
const openOf = (S, full) => {
  const L = S.units(),
    m = introMap();
  return openState(Q, S.k, {
    met: L.some(n => n in m && !closed(n)),
    due: full && S.due(),
    left: full && L.some(n => !introduced(n)),
    at: full ? tally() : 0
  });
};
const openShut = n => opensNow().some(S => S.units().includes(n) && !openOf(S).on);
// What My progress offers to open (progress.js): the parts off, due, with a unit not open yet.
const opensOff = () => opensNow().filter(S => openOf(S, 1).row);
// The card, the first due (quiz.js openOfferShow): after a "Not now", at most once more, a while later
// (docs/decisions/2026-11-18-decisions-from-app-comments.md).
const openOfferDue = () => opensNow().find(S => openOf(S, 1).ask) || null;
// "Not now" on the card: off, counted, with the answer clock it was said at (model.js tally; synced with the choice, a
// mark the clock of another device moves up to: model.js clockMarks).
function openNo(k) {
  Q[k + 'N'] = (Q[k + 'N'] || 0) + 1;
  Q[k + 'A'] = tally();
  bonusSet(false, k);
}
// ⚙ Bonus genera On / Off, the What I learn card's rows (learnSet) and the offer card (quiz.js bonusOfferShow): saved in
// the quiz settings, synced with them. Off takes them out of the photo quiz and the duels; their progress is kept. Questions
// planned ahead with the old units are dropped by themselves (planKey names the units in play).
const showBon = () =>
  document
    .querySelectorAll('[data-optin] button')
    .forEach(b => b.setAttribute('aria-pressed', String((b.dataset.on === '1') === !!Q[b.closest('[data-optin]').dataset.optin])));
// Q[k + 'T']: when the choice was made, so the latest choice wins across devices (sync.js mergeSaved).
// Q[k + 'V']: the set's rules version (rv) the choice was made under (the back card, quiz.js bonusBackDue). hand: turned
// on or off by the player's own ⚙ switch, not a card; Q[k + 'H']: on by hand while not due yet (no family at Advanced:
// the fish genera then come by their family's Open Water, app.js sciOpen). Since the What I learn card (Q401 A) nothing
// sets it for the genera any more; a record that has it keeps it until the row is switched again.
function bonusSet(on, k = SETS()[0].k, hand) {
  const S = SETS().find(x => x.k === k);
  Q[k] = !!on;
  Q[k + 'T'] = Date.now();
  if (S && S.rv) ((Q[k + 'V'] = S.rv), (Q[k + 'H'] = !!(on && hand && !S.due())));
  saveQ();
  showBon();
  if (typeof syncSoon === 'function') syncSoon();
  if (RAW && hashNow() === 'progress') route();
}
document
  .querySelectorAll('[data-optin] button')
  .forEach(b => (b.onclick = () => bonusSet(b.dataset.on === '1', b.closest('[data-optin]').dataset.optin, true)));
showBon();
// The warning on Millepora's first-meeting card and genus sheet.
const BENTHIC_NOTE =
  "Not a hard coral and not on the IMR coral list, but it's on the IMR benthic slate and very common at Dauin, including in ReefCloud photos.";
// A genus of the games: the slate (coral and benthic) or a bonus genus.
const gameGenus = n => !!DATA.gen[n] || isBenthic(n) || isBonus(n);
// (Those with a game photo to show: model.js photoAny, the answer of photoSet(n).shown.length without a draw.) A view of
// the state version (stateView): poolCalc computes it. Whether a unit has a photo is a view of the data version per unit,
// read once for the loop (model.js photoAnyFn): nothing is written during it.
const poolCalc = () => [...slateGenera(), ...bonusList()].filter(typeof photoAnyFn === 'function' ? photoAnyFn() : photoAny);
const pool = stateView('pool', poolCalc);
// The plain sentence: one everyday-words line per genus (data.json `plain`, tools/apply_plain_sheets.py), clear for
// everyone, beginners included. Right under the photo of the genus sheet and of the first-meeting card, before the ID
// tips and lecture notes, in body text with no label (a muted labelled line above the photo gets skipped). It adds to the
// scientific text and replaces none of it.
const plainLine = g => (g.plain ? `<p class="plainw">${esc(g.plain)}</p>` : '');
// A unit's name as shown: a genus (its key is its name) in italics, a fish entry (its key is a stable id, fish.json) by
// its IMR name. unameT: the plain text (tooltips, aria labels).
const unameT = n => (GX(n) || {}).name || n;
// unameIn: unit n's name already written as h (escaped HTML: quiz.js namesLine marks letters in it), set as uname sets it.
// A unit whose label is a common name, upright: a fish family, a fish species asked by its common name (its scientific
// name beside it, sci); a coral genus and a fish scientific genus are in italics.
const uplain = n => {
  const g = GX(n) || {};
  return !!g.name && (!g.rank || !!g.sci);
};
const unameIn = (n, h) => (uplain(n) ? h : `<i>${h}</i>`);
const uname = n => unameIn(n, esc(unameT(n)));
// The common name of a unit whose own label is a scientific name (a coral genus, a fish scientific genus, a sea slug
// genus), for its first-meeting card, right under its name: its record's `cname` (fish.json common), else its first
// English name (vernFirst); '' for a unit labelled by its common name already, or one with none. Any subject (rule S1).
const unitCname = n => {
  const g = GX(n) || {},
    c = uplain(n) ? '' : g.cname || vernFirst(n);
  return c && c.toLowerCase() !== unameT(n).toLowerCase() ? c.charAt(0).toUpperCase() + c.slice(1) : '';
};
// ID tips heading: the lecture for slate genera (a slate genus the lecture skips carries its own `tl`, naming the
// Coral Finder pages: tools/apply_id_tips.py), the Coral Finder pages for bonus genera; a bonus genus's
// tips the content editor reworded with a source, plain (the source shows under them: tipsList).
const tipsLabel = g =>
  g.tl || (g.x ? (g.qsrc && g.qsrc.t ? 'ID tips' : `ID tips (Coral Finder p. ${g.pages.join(', ')})`) : 'ID tips (IMR)');
// A genus whose tips the content editor replaced, with a source of his own: it shows under them (qsrc), and the heading
// made for the genera the lecture skips (tl) stops naming the Coral Finder as their source.
const tipsEdited = g => g && g.esrc && g.esrc.qt && ((g.qsrc = g.esrc.qt), g.tl && (g.tl = 'ID tips'));
// What is wrong with the sync, in words, or '' when everything is saved.
function syncTrouble() {
  if (!SYNC_URL || !SYNC) return '';
  if (SYNC.err === 'pin') return 'Not saved: code refused';
  if (SYNC.err === 'archived') return 'This account is archived.'; // sync.js archivedOf; Pierre's wording, no explanation
  if (SYNC.err === 'gone')
    return SYNC.into ? `Not saved: this account was merged into ${SYNC.into}` : 'Not saved: this account was removed';
  // Too many wrong codes for this name (anyone can cause it): say so rather than "could not reach the sheet".
  if (SYNC.err === 'wait') return 'Not saved yet: too many wrong codes for this name, try again in 10 minutes';
  if (SYNC.err === 'reserved') return 'Not saved: this name is reserved, please choose another'; // core.js reservedName
  const n = (SYNC.log || []).filter(a => !winkEntry(a)).length; // a surprise card's answer is no answer to the player (core.js)
  if (SYNC.err)
    return n
      ? `Not saved yet: ${n} answer${n > 1 ? 's' : ''} waiting`
      : 'Not saved online yet: no connection (your progress stays on this phone)';
  return '';
}
// The sync sheet's address and this device's sign-in: state that many pages read, kept here with the pages; the code
// that talks to the sheet is in sync.js.
const SYNC_URL = 'https://script.google.com/macros/s/AKfycbyt6l9sBeWP4KacPx1SUbsk9-15uJikxRafrpwF6b2oAE8GgrnPOtuJg7IqfFG5ymrR/exec';
// How a message names it ("Progress loaded from your account."): players are never told about "the sheet".
const SHEET_NAME = 'your account';
// A copy run on this computer (tests, tools/perf.js, a developer) never sends anonymous answers or reports to the real
// sheet (rule D1; requests a service worker or an unloading page sends escape a test's network mocks). A browser driven
// by a program (Playwright, Selenium: navigator.webdriver) counts as one whatever its address. No player's browser sets
// it.
const LOCAL =
  /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(location.hostname) || location.protocol === 'file:' || navigator.webdriver === true;
// Signed-in traffic (signing in, saving, loading a saved account) goes through sheetFetch, so a local copy never reaches
// the sheet with a name either. A test answers it with window.SHEET_STUB(url, options), set before the app loads (pages.smoke.js);
// without one a local copy gets an error and stays signed out. Players never run a local copy.
const sheetFetch = (url, o) =>
  !LOCAL
    ? fetch(url, o)
    : typeof window.SHEET_STUB === 'function'
      ? window.SHEET_STUB(url, o)
      : Promise.reject(Object.assign(new Error('local copy: the sheet is off'), {local: true}));
let SYNC = store.get('reefid-account', null),
  syncTimer = null;

// A subject's basics module finished (every step seen) here or on another device (progress.js achBasics), each subject's
// own (subjDev 'basics', SUBJECTS basics.feat): read by the Home line and the first-launch offers.
// Its icon (a polyp on its cup; the Tools hub's too, proto/lab.js LAB_ICONS).
const BASICS_ICON =
  '<path d="M5 21h14M8.5 21v-5.5h7V21"/><path d="M12 15.5V8.3M10.5 15.5 6 9.3M13.5 15.5 18 9.3"/><circle cx="12" cy="6.5" r="1.7"/><circle cx="5" cy="7.8" r="1.7"/><circle cx="19" cy="7.8" r="1.7"/>';
const basicsKey = (S = SUBJ) => subjDev(S.id, 'basics');
const basicsDone = (S = SUBJ) =>
  !!((store.get(basicsKey(S), {}) || {}).fin || (store.get('reefid-sync-ach', {}) || {})[(S.basics || {}).feat || '_basics']);
// The basics module of the subject on screen (SUBJECTS pages 'basics') not done yet: what "I'm new" and the first-launch
// question's "lower" card offer, and the Home line. A subject without one offers none. Its words (UNITS basics: name, ask,
// offer, lo, card, trail) come from basicsWords.
const basicsDue = () => SUBJ.pages.includes('basics') && !basicsDone();
const basicsWords = () => UNITS[SUBJ.id].basics || {name: 'Basics'};
// The answers to the first-launch question (core.js CHOICE) as big buttons, one per row, with a line each, in the words
// of the subject on screen (SUBJECTS start): the tour, the card that asks it, and the fallback card (only: the choices it
// offers). cur: the current answer, marked.
const startOptsHtml = (cur, only) =>
  `<div class="startopts" role="group" aria-label="${esc(SUBJ.start.q)}">${(only || CHOICE.opts.map(o => o[0]))
    .map(c => [c, startText(SUBJ.id, c)])
    .filter(([, x]) => x)
    .map(
      ([c, [t, d]]) =>
        `<button type="button" class="startopt" data-start="${c}" aria-pressed="${c === cur}"><b>${esc(t)}</b><small>${esc(d)}</small></button>`
    )
    .join('')}</div>`;

/* ---------- routing ---------- */
// Opens the page of key h (or draws it again when it is on screen).
function go(h) {
  if (hashNow() === h && location.hash === hr(h)) route();
  else if (!routeOut(h, SUBJ)) {
    history.pushState({d: ++pageDepth}, '', hrFull(h));
    route();
  } else location.hash = hr(h);
}

// Photo size (small / medium / large), remembered per page in localStorage (key reefid-sync-size).
// Each page reads :root[data-size] in its own CSS; pages where it means nothing (games that fill the screen,
// home, progress) hide the S/M/L buttons, keeping their room so the header never changes size.
// Keyed by page name (core.js pageName: learn.genera, learn.genus, learn.compare…).
const SIZE_PAGES = ['learn.genera', 'learn.genus', 'learn.compare', 'identify.key', 'tools.gallery', 'tools.elim'];
const pageKey = () => pageName(hashNow());
function sizePrefs() {
  try {
    return JSON.parse(localStorage.getItem('reefid-sync-size')) || {};
  } catch (e) {
    return {};
  }
}
// Default M, except Genera (S: more genera per screen, groups easier to compare).
function photoSize() {
  return sizePrefs()[pageKey()] || (pageKey() === 'learn.genera' ? 's' : 'm');
}
const SIZES = {
  // Measured on 390 to 1920 px windows: S 170-194 px, M 356-415, L 356 on phones and 615-631 above.
  card: {s: '(max-width:599.98px) 46vw, 200px', m: '(max-width:599.98px) 92vw, 420px', l: '(max-width:599.98px) 92vw, 640px'},
  strip: {s: '(max-width:599.98px) 46vw, 260px', m: '(max-width:599.98px) 92vw, 420px', l: '(max-width:599.98px) 92vw, 640px'}
};
const sizesFor = kind => SIZES[kind][photoSize()];
function applySize() {
  const s = photoSize(),
    on = SIZE_PAGES.includes(pageKey());
  document.documentElement.dataset.size = s;
  const sz = document.getElementById('size');
  document.getElementById('sizerow').hidden = !on;
  document.getElementById('xrow').hidden = pageKey() !== 'identify.key';
  document.querySelectorAll('img[data-sz]').forEach(i => (i.sizes = sizesFor(i.dataset.sz)));
  document.querySelectorAll('#size button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.size === s)));
}
const phone = isPhone;
const cycle = b => b; // all choices are visible in the settings panel
const showX = () =>
  document.querySelectorAll('#xgen button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.x === '1') === XON)));
document.querySelectorAll('#xgen button').forEach(
  b =>
    (b.onclick = () => {
      XON = b.dataset.x === '1';
      store.set('reefid-idkey-x', XON);
      showX();
      if (RAW) route();
    })
);
showX();
// Photo quality (Auto / Saver / Full, see fit): the next photos follow it; a bigger choice also upgrades those shown.
const showPQ = () => document.querySelectorAll('#pq button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pq === PQ)));
document.querySelectorAll('#pq button').forEach(
  b =>
    (b.onclick = () => {
      PQ = b.dataset.pq;
      store.set('reefid-photo-q', PQ);
      NEXTQ = null;
      showPQ();
      if (typeof fitStage === 'function') fitStage();
      upsize();
    })
);
showPQ();
document.querySelectorAll('#size button').forEach(
  b =>
    (b.onclick = () => {
      b = cycle(b);
      const p = sizePrefs();
      p[pageKey()] = b.dataset.size;
      try {
        store.raw('reefid-sync-size', JSON.stringify(p));
      } catch (e) {}
      applySize();
    })
);
// Light / dark theme switch. Light by default (rule U3), whatever the system's theme; the reader's pick is kept.
// A Light | Dark segmented switch like the other settings (one control type per kind of choice).
function isDark() {
  return document.documentElement.dataset.theme === 'dark';
}
function showTheme() {
  const d = isDark();
  document.querySelectorAll('#theme button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.th === 'dark') === d)));
}
document.querySelectorAll('#theme button').forEach(
  b =>
    (b.onclick = () => {
      const t = b.dataset.th;
      document.documentElement.dataset.theme = t;
      try {
        store.raw('reefid-sync-theme', t);
      } catch (e) {}
      showTheme();
    })
);
showTheme();
// Colour theme: retints the accent, background and learning-level scale site-wide (CSS :root[data-palette]); Depth = default,
// Lagoon = the base colours in :root.
function showPal() {
  const p = document.documentElement.dataset.palette || 'depth';
  document.querySelectorAll('#palette button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pal === p)));
}
document.querySelectorAll('#palette button').forEach(
  b =>
    (b.onclick = () => {
      const p = b.dataset.pal;
      document.documentElement.dataset.palette = p;
      try {
        store.raw('reefid-sync-palette', p);
      } catch (e) {}
      showPal();
    })
);
showPal();
// Colour-blind mode: blue/orange instead of green/red for right/wrong and review (CSS :root[data-cvd]), on top of any theme.
const showCvd = () => {
  const on = document.documentElement.dataset.cvd === '1';
  document.querySelectorAll('#cvd button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.cvd === '1') === on)));
};
document.querySelectorAll('#cvd button').forEach(
  b =>
    (b.onclick = () => {
      const on = b.dataset.cvd === '1';
      if (on) document.documentElement.dataset.cvd = '1';
      else delete document.documentElement.dataset.cvd;
      try {
        store.raw('reefid-sync-cvd', on ? '1' : '0');
      } catch (e) {}
      showCvd();
    })
);
showCvd();

// Tools of the Learn, Practice and Identify sections (the learning path order): a tab bar in the sticky header, so they stay in view.
// Entries without a view in this file (anatomy, size, elim, pairs…) are tools that graduated from the Lab (proto/).
const MODES = {
  learn: [
    // Coral basics (proto/basics.js), graduated from the Lab: step 0 of the Learn path; Fish basics
    // (proto/fishbasics.js) is the same tab for the fish (subjWords: the subject's name for it, UNITS basics).
    ['basics', '<span class="wide">Coral basics</span><span class="narrow">Basics</span>', 'The words of the ID tips, one step at a time'],
    ['genera', 'Genera', 'Every genus, as photos or ID tips'],
    ['cmp', 'Look-alikes', 'Classic look-alikes, one pair per screen']
  ],
  practice: [
    // "Quiz", not "Photo → genus" (a general quiz: typed answers and duels slipped in); the
    // ids and routes stay (#practice/quiz, quiz|… in the answer log). Phones: "Duels", so the four tabs fit 360 px without
    // scrolling: Quiz, Custom quiz, Duels, Memory take 262 of 328 px there; "Look-alike duels" would leave 2 px.
    ['quiz', 'Quiz', 'Name the genus'],
    ['quiz-custom', 'Custom quiz', 'The quiz on the genera you pick'],
    ['quiz-duel', '<span class="wide">Look-alike duels</span><span class="narrow">Duels</span>', 'Two genera often confused'],
    ['pairs', 'Memory', 'Match photos of the same genus']
  ],
  // Identify shows the current subject's tool only: each subject names its own (app.js UNITS
  // identify); the other subject's tool is reached through the subject switch.
  identify: [
    ['idkey', 'Coral ID Key', 'Tap the clues you see, get a ranked shortlist'],
    ['fishkey', 'Fish ID Key', 'Coming soon']
  ]
};
const MODE_LABEL = {learn: 'Learn tools', identify: 'Ways to identify', practice: 'Practice modes'};
// Which tab of MODES a hash belongs to: key leaves and groups count as the key, genus sheets as Genera, pairs as Look-alikes.
function modeOf(h) {
  return h.startsWith('g-') ? 'genera' : h.startsWith('cmp') ? 'cmp' : h.split('|')[0];
}
function sectionOf(h) {
  if (!h || h === 'home') return 'home';
  if (h.startsWith('lab')) return 'lab';
  if (h === 'progress') return 'progress';
  if (h === 'board') return 'board';
  if (h === 'ach') return 'board';
  if (h === 'about' || h.startsWith('delete-account')) return 'about'; // no tab: reached from the Home credit line and the ? help
  if (h === 'live-host' || h === 'live' || h.startsWith('live|')) return 'live'; // no tab: reached by its address (live.js)
  const m = modeOf(h);
  return Object.keys(MODES).find(t => MODES[t].some(x => x[0] === m)) || 'learn';
}
const $modes = document.getElementById('modes');
// Genera in the order of the Genera page (lecture groups or slate), for previous / next on a sheet.
function generaOrder() {
  const names = Object.keys(DATA.gen),
    gi = n => shownGroup(n) || 99;
  return azOrder === 'lecture' ? names.sort((a, b) => gi(a) - gi(b) || slateIdx(a) - slateIdx(b)) : names;
}
// On a genus sheet or a pair, the header bar names the page instead of listing the section's tools.
function ctxBar(h) {
  const back = `<button type="button" class="up" data-back aria-label="Back">‹<span>Back</span></button>`;
  if (h === 'about') return `${back}<h2 class="ctx-t">About and credits</h2>`;
  if (h.startsWith('delete-account')) return `${back}<h2 class="ctx-t">Delete my account</h2>`;
  // A subject's own sheet bar (UNITS bar: the fish family, genus and species sheets), else the coral genus sheet's.
  const ub = h.startsWith('g-') && UNITS[SUBJ.id].bar ? UNITS[SUBJ.id].bar(h.slice(2)) : '';
  if (ub) return back + ub;
  if (h.startsWith('g-') && GX(h.slice(2))) {
    const n = h.slice(2),
      g = GX(n),
      L = g.x ? Object.keys(DATA.x.gen) : generaOrder(),
      i = L.indexOf(n);
    const prev = L[(i - 1 + L.length) % L.length],
      next = L[(i + 1) % L.length];
    return `${back}<h2 class="ctx-t"><i>${esc(n)}</i><small>${isBenthic(n) ? 'IMR benthic slate' : g.x ? 'Not on IMR list' : g.n ? 'No. ' + g.n : '<b class="star">★</b> not surveyed'} · ${esc(altName(g.fam))}</small></h2>
      <span class="pn"><a href="${esc(hr('g-' + prev))}" title="Previous: ${esc(prev)} (←)" aria-label="Previous genus: ${esc(prev)}">‹</a><a href="${esc(hr('g-' + next))}" title="Next: ${esc(next)} (→)" aria-label="Next genus: ${esc(next)}">›</a></span>`;
  }
  const [a, b] = h.startsWith('cmp-') ? h.slice(4).split('|') : [];
  if (a && GX(a) && GX(b) && UNITS[SUBJ.id].inGame(a) && UNITS[SUBJ.id].inGame(b))
    return `${back}<h2 class="ctx-t ctx-pair"><span>${uname(a)} or ${uname(b)}?</span></h2><a class="ctx-l" href="${esc(hr('cmp'))}">Look-alikes</a>`;
  return '';
}
function showModes(tab, h) {
  const ctx = ctxBar(h);
  $modes.classList.toggle('ctx', !!ctx);
  if (ctx) {
    $modes.hidden = false;
    $modes.setAttribute('aria-label', 'Page');
    $modes.innerHTML = ctx;
    $modes.querySelector('[data-back]').onclick = () =>
      pageDepth > 0
        ? history.back()
        : go(h.startsWith('g-') ? 'genera' : h === 'about' ? '' : h.startsWith('delete-account') ? 'about' : 'cmp');
    return;
  }
  // A section with a single tool needs no tab bar. Learn and Practice show the subject's pages only (SUBJECTS pages),
  // Identify the subject's own tool (UNITS identify).
  const M =
    MODES[tab] && (tab === 'learn' || tab === 'practice')
      ? MODES[tab].filter(x => SUBJ.pages.includes(x[0]))
      : tab === 'identify'
        ? MODES[tab].filter(x => x[0] === keyOf(SUBJ))
        : MODES[tab];
  const L = M && M.length > 1 ? M : null;
  $modes.hidden = !L;
  if (!L) {
    $modes.innerHTML = '';
    return;
  }
  const cur = modeOf(h);
  $modes.setAttribute('aria-label', MODE_LABEL[tab]);
  $modes.innerHTML = L.map(
    ([k, t, d]) =>
      `<a href="${esc(hr(k))}" title="${esc(subjWords(d))}"${k === cur ? ' aria-current="page"' : ''}><b>${subjWords(t)}</b></a>`
  ).join('');
  const on = $modes.querySelector('[aria-current]');
  if (on && $modes.scrollWidth > $modes.clientWidth) $modes.scrollLeft = on.offsetLeft - ($modes.clientWidth - on.offsetWidth) / 2;
}
let routeFrom = '',
  generaY = null,
  // How many pages of the app lie behind this one in the tab's history: Back on a sheet goes back only when there is
  // one (history.length also counts the enlarged photo's entry, which would leave a deep-linked sheet's Back doing
  // nothing). Kept in each history entry's state, so a reload or Back / Forward keeps it right.
  pageDepth = typeof (history.state || {}).d === 'number' ? history.state.d : 0;
if (!history.state || typeof history.state.d !== 'number') history.replaceState({...(history.state || {}), d: pageDepth}, '');
// A reload while a photo was enlarged keeps the viewer's history entry, with no viewer open: it is stepped over at once,
// so the next Back leaves the page rather than doing nothing visible.
else if (history.state.lb) history.back();
addEventListener('hashchange', () => {
  const s = history.state || {};
  if (typeof s.d === 'number') pageDepth = s.d;
  else history.replaceState({...s, d: ++pageDepth}, '');
});
// Cards (docs/DESIGN.md "Cards", the Medallion design; docs/ARCHITECTURE.md "Welcome tour"): every card over the page
// comes from cardShow, which owns the .unlock overlay (a labelled dialog, the focus kept inside and given back, closed by
// route() through ulClose), its keys and, on close, the question's clock (qclockAgain); one at a time stays the callers'.
// o: kind (CARD_KINDS), cls, kick, title (HTML; else the body's first h3, else label), body, photo (a genus band),
//   visual (medallion HTML), primary / secondary {text, attr, on (after the close), stay}, note, after, bind(d),
//   focus, esc / enter / tap (1 or 2: as that button, or a function), onClose(how: 1, 2, 'esc', 'enter', 'tap', 'route'
//   or d.close's). Returns the overlay: d.close(how), d.set(changes) redraws it.
const CARD_KINDS = {
  apology: '🙏',
  step: '🧗', // a big step the player chooses (fish circle 3, quiz.js openOfferShow): the warm --warn hue, "Not now" on top
  update: '🔄',
  feature: '✨',
  // each subject's own cards (core.js SUBJECTS card: its genus cards, its all-met card), one each
  genus: '🪸',
  fish: '🐟',
  'sea slug': '🐌',
  tip: '💡',
  bonus: '🎁',
  account: '💾',
  ach: '🏆',
  feedback: '💬'
};
let cardN = 0;
// Whether a card's panel is really on screen: drawn, of some height, inside the viewport and faded in (cardShow's safety
// net and the leaving-with-a-card event).
function cardSeen(d) {
  const c = d && d.querySelector('.ulcard');
  if (!c) return false;
  const r = c.getBoundingClientRect();
  return (
    r.height >= 40 &&
    r.bottom > 0 &&
    r.top < innerHeight &&
    r.right > 0 &&
    r.left < innerWidth &&
    Number(getComputedStyle(c).opacity) > 0.05
  );
}
function cardShow(o) {
  const d = document.createElement('div'),
    from = document.activeElement,
    id = 'ulh' + ++cardN;
  d.className = ('unlock ' + (o.cls || '')).trim();
  d.dataset.t = String(Date.now());
  // The event log's name for it. A card without a title of its own (the sign-in card draws its heading in its body)
  // is named by its label, so its row never reads as an empty card (account |  | ).
  const name = o.title || o.label;
  d.dataset.info = [o.kind || '', o.kick || '', name ? String(name).slice(0, 60) : ''].join(' | ');
  d.setAttribute('role', 'dialog');
  d.setAttribute('aria-modal', 'true');
  let shut = false;
  const close = how => {
    if (shut) return;
    shut = true;
    d.remove();
    document.removeEventListener('keydown', key, true);
    if (from && from !== document.body && from.isConnected && !document.querySelector('.unlock')) from.focus({preventScroll: true});
    if (typeof qclockAgain === 'function') qclockAgain();
    if (o.onClose) o.onClose(how);
  };
  const act = (w, how) => {
    if (typeof w === 'function') return w();
    const b = (w === 1 || w === 2) && o[w === 1 ? 'primary' : 'secondary'];
    if (!b) return close(how);
    if (!b.stay) close(w);
    if (b.on) b.on();
  };
  // The labels: the kicker and title, or a title the body draws itself (the sign-in box, redrawn as it changes).
  d.relabel = () => {
    const h = d.querySelector('.ulpanel h3');
    if (h && !h.id) h.id = id + 'h';
    const k = d.querySelector('.ulkick');
    if (h) (d.setAttribute('aria-labelledby', (k ? k.id + ' ' : '') + h.id), d.removeAttribute('aria-label'));
    else (d.setAttribute('aria-label', o.label || o.kick || ''), d.removeAttribute('aria-labelledby'));
  };
  const btn = (b, n) =>
    b ? `<button class="next${n === 2 ? ' sec' : ''}" type="button" data-b="${n}"${b.attr ? ' ' + b.attr : ''}>${b.text}</button>` : '';
  const draw = () => {
    const e = `<span class="e" aria-hidden="true">${o.emoji || CARD_KINDS[o.kind] || ''}</span>`, // o.emoji: its own (an achievement's)
      band = !!o.photo;
    d.innerHTML = `<div class="ulcard${band ? ' band' : ''}" data-k="${o.kind || ''}">${
      band ? '' : `<div class="ulmed${o.visual ? ' vis' : ''}" aria-hidden="true">${o.visual || e}</div>`
    }<div class="ulpanel">${band ? `<div class="ulphoto"><img src="${o.photo}" alt=""></div>` : ''}${
      o.kick ? `<p class="ulkick" id="${id}k">${band ? e : ''}${o.kick}</p>` : ''
    }${o.title ? `<h3 id="${id}h">${o.title}</h3>` : ''}${o.body || ''}${
      o.primary || o.secondary ? `<div class="ulbtns">${btn(o.primary, 1)}${btn(o.secondary, 2)}</div>` : ''
    }${o.note ? `<p class="note ulfoot">${o.note}</p>` : ''}${o.after || ''}</div></div>`;
    d.querySelectorAll('[data-b]').forEach(b => (b.onclick = () => act(Number(b.dataset.b))));
    d.relabel();
    if (o.bind) o.bind(d);
    if (o.focus !== false)
      setTimeout(() => {
        const f = d.querySelector(o.focus || '[data-b="1"]') || d.querySelector('[data-b]');
        if (f && !shut) f.focus({preventScroll: true});
      }, 50);
  };
  const tabbable = () =>
    [...d.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')].filter(
      x => !x.disabled && x.getClientRects().length
    );
  const key = e => {
    if (document.getElementById('tour')) return; // the card waits under the tour: the tour's keys
    const t = e.target,
      inside = t instanceof Element && d.contains(t);
    if (e.key === 'Tab') {
      // The focus stays in the card.
      const f = tabbable(),
        i = f.indexOf(document.activeElement);
      if (!f.length) return e.preventDefault();
      if (e.shiftKey ? i <= 0 : i < 0 || i === f.length - 1) {
        e.preventDefault();
        f[e.shiftKey ? f.length - 1 : 0].focus();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      return act(o.esc === undefined ? 'esc' : o.esc, 'esc');
    }
    if (inside && t.matches('input, textarea, select')) return; // typing in the card's form (sign-in)
    e.stopPropagation(); // never the quiz's answer keys behind the card
    if (/^\d$/.test(e.key)) e.preventDefault();
    if (e.key !== 'Enter' || (inside && t.closest('button, a[href], [tabindex]')) || o.enter === undefined) return; // Enter presses it
    e.preventDefault();
    act(o.enter, 'enter');
  };
  document.addEventListener('keydown', key, true);
  d.addEventListener('click', e => {
    if (e.target === d && o.tap !== undefined) act(o.tap, 'tap');
  });
  d.close = close;
  d.ulClose = () => close('route');
  d.set = c => (Object.assign(o, c), draw());
  draw();
  document.body.appendChild(d);
  // A safety net (a dimmed screen with no card on it would leave the game stuck): a card still invisible after a moment (no panel drawn, no height, off screen or never faded in) closes by itself, so the
  // player is never locked behind an empty backdrop, and the event log names it so the cause can be found.
  // The 2.5 s count starts at the first frame drawn after the card is in (two animation frames), never at its creation: a
  // card opened while the page is busy (a slow start-up: the first page comes after seconds of work) or hidden (a
  // background tab) has had no frame yet, so its fade-in has not started (opacity 0) and the net would close a card that
  // is only waiting to be drawn ("empty card closed: feedback | Thank you", 2026-11-19, fish/progress). A hidden page
  // draws no frame: the count starts when it is visible again.
  const check = () => {
    if (shut || !d.isConnected) return;
    // A hidden page runs no fade-in, and the tour hides cards on purpose until it closes: count again from the next frame.
    if (document.visibilityState !== 'visible' || document.documentElement.classList.contains('touring')) return arm();
    if (cardSeen(d)) return;
    if (typeof ev === 'function') ev('err', {msg: 'empty card closed: ' + d.dataset.info});
    close('empty');
  };
  const arm = () => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(check, 2500)));
  arm();
  return d;
}
// Leaving the app (or the tab) while a card is open (to tell a player stuck behind a card from one who just left): the
// event log notes which card it was and how long it had been up, once per card.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden' || typeof ev !== 'function') return;
  document.querySelectorAll('.unlock').forEach(d => {
    if (d.dataset.left) return;
    d.dataset.left = '1';
    const up = Math.round((Date.now() - Number(d.dataset.t || Date.now())) / 1000),
      seen = cardSeen(d);
    ev('err', {msg: `left with a card open (${seen ? 'drawn' : 'NOT drawn'}, ${up} s): ${d.dataset.info || ''}`});
  });
});
// A progress ring for a card's medallion: pct strong, was (a former value) faint behind it.
function cardRing(pct, was) {
  const C = 2 * Math.PI * 26,
    arc = (p, c) =>
      `<circle class="${c}" cx="32" cy="32" r="26" stroke-dasharray="${((C * Math.max(0, Math.min(100, p))) / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 32 32)"/>`;
  return `<svg class="ulring" viewBox="0 0 64 64"><circle class="tr" cx="32" cy="32" r="26"/>${was != null && was !== pct ? arc(was, 'gh') : ''}${pct > 0 ? arc(pct, 'ar') : ''}<text x="32" y="38.5" text-anchor="middle">${pct}%</text></svg>`;
}
// The first page opened from Home in a visit (docs/ARCHITECTURE.md "First page from Home"), so the tiers follow real
// use: one 'fromhome' event, to (core.js pageName), s since Home was drawn, w the loading bar seen, tr the tour ran this
// visit (pages its steps open do not count).
let HOME_AT = 0,
  homeLeft = false,
  toured = false;
function fromHome(h, nt) {
  if (document.getElementById('tour')) return void (toured = true);
  if (homeLeft || !HOME_AT || (routeFrom !== '' && routeFrom !== 'home') || !h || h === 'home') return;
  homeLeft = true;
  ev('fromhome', {
    to: pageName(h, SUBJ.pv),
    s: Math.round((performance.now() - HOME_AT) / 100) / 10,
    w: nt > HAVE ? 1 : 0,
    tr: toured ? 1 : 0
  });
}
function route() {
  // The seconds looked at the question on screen go with it, as it is kept for the player's return (quiz.js pendClock).
  if (typeof pendClock === 'function') pendClock();
  // A new version took over in the background (see UPDATED): the page reloads on the way to the next page.
  if (UPDATED) return location.reload();
  QOPEN = false; // a question left unanswered for another page (the quiz keeps it, pendTake: it comes back)
  if (typeof fbEnd === 'function') fbEnd(); // the answer's feedback leaves the screen: its seconds are counted (quiz.js)
  // A tab tapped while the app is still loading (a slow line): Home's doors, or the loading bar for
  // any other page (beforeData); the start-up's own route() opens the page tapped, from the hash.
  if (!DATA) return void beforeData();
  // Load times (loadMark): the quiz is opened when tapped, before its files arrive (so a wait behind "Loading…" counts in
  // the photo wait).
  if (hashNow() === 'quiz') loadMark('qo');
  // Photos of the page being left that are still loading are dropped, so a slow line gives its bandwidth to the new page
  // (tools/perf.js, slow 3G: Home's photos still downloading would delay the first quiz photo by seconds).
  $v.querySelectorAll('img').forEach(i => {
    if (i.complete) return;
    i.removeAttribute('srcset'); // with a srcset, removing src alone keeps the download
    i.removeAttribute('src');
  });
  // A page opened before its files arrived (first visit on a slow line, or a link straight to it) shows the loading bar
  // and asks for its tier now, ahead of the others (index.html), then opens.
  const nt = pageTier(hashNow());
  fromHome(hashNow(), nt);
  if (nt > HAVE) {
    const h0 = hashNow();
    resetHelp();
    document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove())); // as below
    $v.innerHTML = `<div class="boot"><p class="note">Loading…</p><progress id="bootp" max="${bootMax(nt)}" value="${window.bootTick ? bootTick.n() : 0}" aria-label="Loading"></progress></div>`;
    need(nt).then(() => hashNow() === h0 && route());
    return;
  }
  if (CUR_NEW) {
    CUR = CUR_NEW;
    CUR_NEW = null;
    build();
    if (typeof achHelped === 'function') achHelped(); // a report marked done since (progress.js)
  }
  applySize();
  const r = routeNow();
  // An old or unknown address: its section's page when its first segment is a section, else Home, the address replaced
  // (old links are not translated: rule W3).
  if (r.key == null) return void location.replace(hrFull(r.fall, subjOpen(r.S) ? r.S : SUBJ));
  const h = r.key;
  // A subject's address (#fish/…) on a page that follows the subject: that subject comes on screen (setSubject routes
  // again), or the corals' page when the player may not open it. An address without a prefix shows the subject chosen.
  if (!r.bare && r.S !== SUBJ && ROUTE_SUBJ.includes(r.sec)) {
    // Its data not loaded (fish.json or fish-photos.json failed): the page for the subject on screen, never a page stuck
    // on Loading (the start-up load falls back to the corals the same way).
    if (subjOpen(r.S)) return void setSubject(r.S.id).catch(() => location.replace(hrFull(subjPage(h), SUBJ)));
    return void location.replace(hrFull(subjPage(h), SUBJ));
  }
  // A page the subject does not have: its section's first page for the subject.
  const sp = subjPage(h);
  if (sp !== h) {
    // A genus sheet or a comparison of another subject (opened from Identify, the Coral ID Key, with Fish chosen), or a
    // link into another subject's Identify tool with its clues (#identify/key?form=…): that subject
    // comes on screen (setSubject routes again), never the subject's list or tool instead. A bare Identify address opens
    // the subject's own tool.
    const S =
      (/^(g|cmp)-./.test(h) && SUBJECTS.find(x => subjOpen(x) && subjHas(x, h))) ||
      (sectionOf(h) === 'identify' && h.includes('|') && SUBJECTS.find(x => subjOpen(x) && keyOf(x) === modeOf(h)));
    if (S && S !== SUBJ) return void setSubject(S.id).catch(() => location.replace(hrFull(sp)));
    return void location.replace(hrFull(sp));
  }
  // The address in its one spelling, the subject's prefix included (a link without one, with Fish chosen; a trailing
  // '/'): replaced in place, nothing to draw again.
  if (hrFull(h) !== location.pathname + location.search + location.hash) history.replaceState(history.state, '', hrFull(h));
  // Genera list → a genus sheet → back: the list opens where it was left, not at the top of a long list. The genus at the
  // top of the screen is kept when leaving it (not the scroll: the photos above it are not
  // loaded yet on the way back), and brought back to the same place only when coming back from a sheet.
  if (routeFrom === 'genera') {
    const a = [...$v.querySelectorAll(`a[href^="${hr('g-x').slice(0, -1)}"]`)].find(
      x => x.getBoundingClientRect().top > $hdr.getBoundingClientRect().bottom
    );
    generaY = a ? [a.getAttribute('href'), a.getBoundingClientRect().top] : null;
  }
  const fromSheet = routeFrom.startsWith('g-');
  // A card (.unlock: new genus, bonus genus, back to one at a time, sign-in) belongs to the page it opened on: leaving that
  // page (Back, a tab, a link) closes it and its keys (else phone Back from the quiz leaves the card over Home). A redraw
  // of the same page keeps it. First-meeting cards are met when shown: the rest come next time.
  const left = h !== routeFrom;
  if (left) document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
  // Load times (loadMark): the first page drawn, the quiz opened, the first other page, by page name (core.js pageName:
  // the sheet keeps names, never an address with '/').
  const pn = pageName(h, SUBJ.pv);
  if (!('p0' in LOADM)) {
    loadMark('p0', pn);
    loadMark('t0');
  } else if (left && pn !== LOADM.p0) loadMark('nx', pn);
  const from = routeFrom;
  routeFrom = h;
  // The way back to a duel from the comparison its relief card opened (quiz.js DUELBACK): any other page drops it.
  if (typeof duelBackKeep === 'function') duelBackKeep(h);
  const tab = sectionOf(h);
  resetHelp();
  $gpop.hidden = true;
  prog();
  const pg0 = document.getElementById('prog'); // the pill (progress.js showProg, tier 4)
  tab === 'progress' ? pg0.setAttribute('aria-current', 'page') : pg0.removeAttribute('aria-current');
  const bg = document.getElementById('boardgo');
  if (bg) tab === 'board' ? bg.setAttribute('aria-current', 'page') : bg.removeAttribute('aria-current');
  document
    .querySelectorAll('nav [data-tab]')
    .forEach(b => (b.dataset.tab === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  showModes(tab, h);
  // On Home (its own subject row) the header's control steps aside, keeping its room (app.css .subjc[data-home];
  // docs/DESIGN.md "Subject switch"); a switch with the focus hands it to the same subject's button in Home's row.
  const home = !h || h === 'home',
    fa = document.activeElement,
    fsj = home && fa && fa.closest && fa.closest('#view .hsubj, #subjc') ? fa.dataset.subj || SUBJ.id : '';
  if (home) subjMenu(false);
  $subjc.toggleAttribute('data-home', home);
  if (h.startsWith('g-')) UNITS[SUBJ.id].sheet(h.slice(2));
  else if (h === 'cmp' || h.startsWith('cmp|')) {
    const [, a, b] = h.split('|');
    viewLookalikes(a, b);
  } else if (h.startsWith('cmp-')) viewCompare(...h.slice(4).split('|'));
  else if (h === 'quiz') quizPhoto();
  // The custom quiz (quiz.js): its selection screen, and the quiz on the genera picked.
  else if (h === 'quiz-custom' || h === 'quiz-custom|play') quizCustom(h);
  else if (h === 'progress') quizBoard();
  else if (h === 'board') viewBoard();
  else if (h === 'ach') viewAch();
  // About and credits (home.js).
  else if (h === 'about' && window.viewAbout) viewAbout();
  // Deleting one's own account (sync.js viewDeleteAccount), linked from About › Privacy and privacy.html.
  else if (h === 'delete-account' || h === 'delete-account|done') viewDeleteAccount(h);
  // The live mode (live.js): a student's join page and the trainer's page.
  else if ((h === 'live' || h.startsWith('live|') || h === 'live-host') && window.viewLive) viewLive(h);
  // The Fish ID Key, coming soon (home.js): Identify in fish mode.
  else if (h === 'fishkey' && window.viewFishKey) viewFishKey();
  else if (h.startsWith('quiz-duel')) {
    const [, a, b] = h.split('|');
    quizDuel(a, b, left, from); // a page just opened starts a new duel run (quiz.js DUELRUN), unless back from its comparison
  } else if (h.startsWith('lab') && window.viewLab) viewLab(h);
  else if (window.labTool && labTool(h)) {
  } else if ((!h || h === 'home') && window.viewHome) {
    viewHome();
    if (!HOME_AT) HOME_AT = performance.now();
  } else UNITS[SUBJ.id].list();
  window.scrollTo(0, 0);
  if (fsj) {
    const b = $v.querySelector(`.hsubj [data-subj="${fsj}"]`);
    if (b) b.focus({preventScroll: true});
  }
  if (h === 'genera' && fromSheet && generaY) {
    const a = $v.querySelector(`a[href="${CSS.escape(generaY[0])}"]`);
    if (a) window.scrollTo(0, a.getBoundingClientRect().top - generaY[1]);
  }
  pageHelp();
  hdrMetrics();
  // The intro moved behind ? only now, so the quiz stage is resized to the space it really has (phones gained ~280 px).
  if (typeof fitStage === 'function') fitStage();
  if (typeof fitLk === 'function') fitLk();
  // Same for card games (Memory): their grid was sized before the intro left, so it is refitted to the room it now has.
  document.querySelectorAll('.pgrid.fit').forEach(g => fitTiles(g));
  // Big photos (sheet cover, lab tools) get the file for the box they got (the quiz and Look-alikes do it in their fit).
  upsize();
  // Pages opened in the visit (sync.js pagesRoute, event 'pages'): the page drawn, not a link that sent on to another.
  if ((hashNow() || 'home') === (h || 'home') && typeof pagesRoute === 'function') pagesRoute(h);
  // Home drawn: the moment a subject newly open to the player may be told (progress.js subjHello, once progress.js is in).
  if ((h || 'home') === 'home' && typeof subjHello === 'function') subjHello();
  // The same moment for the offer to install the app (installNudge, install.js).
  if ((h || 'home') === 'home' && typeof installNudge === 'function') installNudge();
  // The Identify tool opened counts for the "Did you know?" tip about it; Home and My progress may show that tip (quiz.js).
  if (typeof tipRoute === 'function') tipRoute(h);
  // The page of address h is drawn: the tests wait for this instead of a fixed time (tests/pages.smoke.js drawn()).
  window.ROUTED = h;
}
addEventListener('hashchange', route);
// Pages open straight on their content: the title is dropped where the header already names the page
// (section tab, page bar or Lab crumbs), and the intro text moves behind the ? button.
const $help = document.getElementById('help'),
  $helpbox = document.getElementById('helpbox');
// One rule for every render path: a top-level title is dropped and the intro moves behind ? (route() only resets it).
// Every ? help ends with About, Privacy and Send feedback (rule U14; no page footer), so the ? shows on every page.
// Send feedback with a game question on screen carries its unit and photos (quiz.js qNow), read when sent.
const fbCtx = () => {
  const q = () => (typeof qNow === 'function' && qNow()) || {};
  return {
    k: 'page',
    get g() {
      return q().g || '';
    },
    get ph() {
      return q().ph || [];
    }
  };
};
const helpEnd = () =>
  `<p class="note hend"><a href="${esc(hr('about'))}">About &amp; credits</a> · <a href="privacy.html">Privacy</a>${typeof repBtn === 'function' ? ' · ' + repBtn(fbCtx(), 'Send feedback') : ''}</p>`;
function pageHelp() {
  const root = $v.querySelector(':scope > .lab') || $v;
  const found = [...root.querySelectorAll(':scope > h2:not(.vh), :scope > .lede, :scope > .tips, :scope > h3.label, :scope > .gloss')];
  if (!found.length) return;
  const h2 = found.find(x => x.tagName === 'H2'),
    intro = found.filter(x => x !== h2);
  if (intro.length) {
    $helpbox.innerHTML =
      (h2 ? `<h3>${esc(h2.textContent)}</h3>` : '') +
      intro.map(x => x.outerHTML).join('') +
      // The tour needs the data (tour.js): not offered on Home's doors drawn before it (beforeData).
      (window.tour && DATA
        ? '<p class="note htour"><button type="button" class="linkish" data-tour>Replay the welcome tour</button></p>'
        : '') +
      helpEnd();
    $help.hidden = false;
  }
  found.forEach(x => x.remove());
  // Keep the page title for screen readers (heading order h1 > h2 > h3), visually hidden.
  if (h2) root.insertAdjacentHTML('afterbegin', `<h2 class="vh">${esc(h2.textContent)}</h2>`);
}
function resetHelp() {
  $helpbox.hidden = true;
  $helpbox.innerHTML = helpEnd(); // a page with explanations puts them above it (pageHelp)
  $help.hidden = false;
  $help.setAttribute('aria-expanded', 'false');
}
new MutationObserver(pageHelp).observe($v, {childList: true, subtree: true});
// Settings (photo source, photo size, theme) live in one small panel behind ⚙.
const $setb = document.getElementById('setb'),
  $set = document.getElementById('settings');
function setOpen(open) {
  $set.hidden = !open;
  $setb.setAttribute('aria-expanded', String(open));
}
$setb.onclick = e => {
  e.stopPropagation();
  setOpen($set.hidden);
};
// Opening ⚙ (by the button or "Not saved") refreshes the account line.
new MutationObserver(() => {
  if (!$set.hidden && SYNC_URL) bindSync(document.getElementById('sync'));
}).observe($set, {attributes: true, attributeFilter: ['hidden']});
// The account and the progress backup live in ⚙, not in the middle of My progress.
document.getElementById('signb').onclick = e => {
  e.stopPropagation();
  if (syncTrouble()) setOpen(true);
  else signinNudge(false, false);
};
{
  const rb = document.getElementById('reset');
  rb.onclick = () => {
    if (rb.dataset.armed) {
      // After the quiz tier: the first-meeting cards (model.js) start over with the progress.
      rb.disabled = true;
      need(2).then(() => {
        P = {};
        delete Q.bu;
        delete Q.ba;
        // the bonus genera (fish: the scientific genera, circle 3) are offered again once due, the What I learn rows back
        // to their defaults
        SUBJ.optin.forEach(k => ['', 'T', 'N', 'A', 'V', 'H', 'O'].forEach(x => delete Q[k + x]));
        if (typeof stateBump === 'function') stateBump('rec'); // the records and settings emptied: inputs of the views
        saveQ();
        store.set(sKey('reset'), new Date().toISOString());
        introReset();
        save();
        delete rb.dataset.armed;
        rb.disabled = false;
        rb.textContent = 'Reset progress';
        document.getElementById('pmsg').textContent = SUBJECTS.length > 1 ? `${SUBJ.name}: progress reset.` : 'Progress reset.';
        route();
      });
    } else {
      rb.dataset.armed = '1';
      rb.textContent = 'Confirm reset';
    }
  };
}
document.getElementById('setx').onclick = () => {
  $set.hidden = true;
  $setb.setAttribute('aria-expanded', 'false');
  $setb.focus();
};
document.addEventListener('click', e => {
  if (!$set.hidden && !e.target.closest('#settings, #setb')) {
    $set.hidden = true;
    $setb.setAttribute('aria-expanded', 'false');
  }
});
// "/" from any page: open Genera with the search box focused, to jump to a genus by typing.
let wantSearch = false;
document.addEventListener('keydown', e => {
  if (e.key !== '/' || e.altKey || e.ctrlKey || e.metaKey || !lb.hidden) return;
  if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
  e.preventDefault();
  const q = document.getElementById('q');
  if (q && hashNow() === 'genera') {
    q.focus();
    q.select();
    return;
  }
  wantSearch = true;
  go('genera');
});
// Desktop: ← / → go to the previous / next genus on a sheet (the arrows of the page bar), without reaching for the mouse.
document.addEventListener('keydown', e => {
  if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || !lb.hidden) return;
  if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
  const a = $modes.querySelectorAll('.pn a');
  if (a.length !== 2) return;
  e.preventDefault();
  a[e.key === 'ArrowLeft' ? 0 : 1].click();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$set.hidden) {
    $set.hidden = true;
    $setb.setAttribute('aria-expanded', 'false');
    $setb.focus();
  }
  // The ? help box closes with Escape too, like ⚙ and the enlarged photo.
  if (e.key === 'Escape' && !$helpbox.hidden && lb.hidden) {
    $helpbox.hidden = true;
    $help.setAttribute('aria-expanded', 'false');
    $help.focus();
    hdrMetrics();
  }
});
// Admin | User view switch: only in the browser holding the admin token; a switch reloads so every module follows.
const $viewrow = document.getElementById('viewrow');
// Link to the admin page (handy on a phone), in either view.
if (HAS_ADMIN_TOKEN) {
  $viewrow.hidden = false;
  document.getElementById('admrow').hidden = false;
  $viewrow.querySelectorAll('button').forEach(b => {
    b.setAttribute('aria-pressed', String((b.dataset.view === 'admin') === IS_ADMIN));
    b.onclick = () => {
      if ((b.dataset.view === 'admin') === IS_ADMIN) return;
      try {
        store.raw('reefid-admin-view', b.dataset.view);
      } catch (e) {}
      location.reload();
    };
  });
}
$help.onclick = () => {
  const open = $helpbox.hidden;
  $helpbox.hidden = !open;
  $help.setAttribute('aria-expanded', String(open));
  hdrMetrics();
};
// The brand link goes home without reloading the page (href="./" still works without JS).
document.querySelector('.brand .home').onclick = e => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
  e.preventDefault();
  if (location.hash) history.pushState({d: ++pageDepth}, '', location.pathname + location.search);
  route();
};
// Header metrics for CSS: --hdr-h (what stays pinned: sticky offset for the page bar, cover photo, side panels)
// and --hdr-hide (phones: the whole header scrolls away; only a page bar stays pinned).
const $hdr = document.querySelector('header');
function hdrMetrics() {
  const r = document.documentElement.style,
    h = $hdr.offsetHeight;
  const hide = phone() ? h : 0;
  r.setProperty('--hdr-h', h - hide + 'px');
  r.setProperty('--hdr-hide', hide + 'px');
}
if (window.ResizeObserver) new ResizeObserver(hdrMetrics).observe($hdr);
else addEventListener('resize', hdrMetrics);
// A missing side file (404) counts as a failure, not as an empty file: softFail says so. A file fetched with a ?v= (the
// deploy's hash of it, tools/stamp_versions.py; a frozen number on a copy never deployed) keeps it on what it read,
// under a symbol (FILEV: never in a JSON, a key list or a structured clone; a copy by spread keeps it, as treeGameRead's
// of fish-game.json): the version the answers' content version is made of (fileVer, contentVer).
const FILEV = Symbol('file version'),
  FILEH = new WeakMap();
const okJson = r =>
  r.ok
    ? r.json().then(j => {
        const m = /\?v=([0-9a-z]+)$/.exec(String(r.url || ''));
        if (m && j && typeof j === 'object') j[FILEV] = m[1];
        return j;
      })
    : Promise.reject(new Error(`HTTP ${r.status}`));
// The version of a data file as read (o: what okJson gave, or a copy of it by spread): its ?v=, else (a file fetched
// without one, the sea slugs'; or what the app made from one, FORMS, AUTOQ) a hash of its content, made once per object;
// '-' when there is none.
const fileVer = o => {
  if (!o || typeof o !== 'object') return '-';
  if (o[FILEV]) return o[FILEV];
  if (!FILEH.has(o)) FILEH.set(o, 'h' + hash53(JSON.stringify(o)));
  return FILEH.get(o);
};
// Unstable connection (Pierre, 2026-11-01): a start-up file that fails is fetched again, up to 3 tries (1 s, then 2 s
// apart); a 404 is final.
const getR = (u, o, n = 3) =>
  fetch(u, o).then(
    r => (r.ok || r.status === 404 || n <= 1 ? r : new Promise(ok => setTimeout(ok, 1000 * (4 - n))).then(() => getR(u, o, n - 1))),
    e => (n <= 1 ? Promise.reject(e) : new Promise(ok => setTimeout(ok, 1000 * (4 - n))).then(() => getR(u, o, n - 1)))
  );
// ?draft previews the unsaved curation from the admin page (same browser) instead of curation.json.
// Pierre's curation, also kept in localStorage (reefid-curation-last): if curation.json can't be read (offline, and not in the
// service worker cache), the app uses the last copy it saw instead of none, so excluded or moved photos never come back
// into the games.
const CUR_LAST = 'reefid-curation-last';
// The players' copy (curation-play.json, written by the deploy from curation.json: tools/curplay.py):
// what the app reads of it, without the admin's working state (auto-sort logs, fish judging tags and ease), a third of
// its size. A site without it (a local server where tools/curplay.py was not run) answers 404: curation.json then.
const curFetch = (o, get = getR) => get('curation-play.json', o).then(r => (r.status === 404 ? get('curation.json', o) : r));
// Start-up never waits for it when a copy is kept (fluid on poor connections: no round trip before the first screen, up
// to the service worker's timeout): the kept copy is used, and curRefresh reads the
// published one right after; a change applies at the next screen, as for a tab left open.
let CUR_KEPT = false;
const curPublished = () => {
  const kept = store.get(CUR_LAST, null);
  if (kept && kept.genera) {
    CUR_KEPT = true;
    return Promise.resolve(kept);
  }
  return curFetch({cache: 'no-cache'})
    .then(okJson)
    .then(c => {
      store.set(CUR_LAST, c);
      return c;
    })
    .catch(e => {
      const last = store.get(CUR_LAST, null);
      return last ? last : softFail("curation.json (Pierre's photo choices)", {})(e);
    });
};
// The admin's draft for ?draft: read from the admin's store in this browser (IndexedDB, admin-draft.js ddbPeek), that
// script loaded for this preview only; none when there is no draft or it was sealed at a sign out.
const draftPeek = () =>
  new Promise(ok => {
    const sc = document.createElement('script');
    sc.src = 'admin-draft.js?v=1';
    sc.onload = () => ddbPeek(window.indexedDB, 'reefid-admin-draft').then(ok, () => ok(null));
    sc.onerror = () => ok(null);
    document.head.append(sc);
  });
const curation = () =>
  /[?&]draft\b/.test(location.search) ? draftPeek().then(dr => (dr && dr.genera ? dr : curPublished())) : curPublished();
const forms = () =>
  getR('forms.json?v=7')
    .then(okJson)
    .catch(softFail('forms.json', {}))
    // gunsure is a list in the file, a {photo: 1} lookup here (read as an object, every unsure guess would count as sure)
    .then(j => ({
      gf: j.gf || {},
      form: j.form || {},
      cf: j.cf || {},
      forms: j.forms || [],
      gunsure: Object.fromEntries((Array.isArray(j.gunsure) ? j.gunsure : []).map(f => [f, 1]))
    }))
    .catch(() => ({gf: {}, form: {}, cf: {}, forms: [], gunsure: {}}));
const json = u =>
  getR(u)
    .then(okJson)
    .catch(softFail(u.replace(/\?.*/, ''), {}));
// The page's later scripts (home.js, tour.js...) must be in before the first route: a fast or cached data.json could
// otherwise arrive first and open the Learn page instead of Home.
// index.html runs the scripts through its loader (retries on an unstable line): window.BOOT says they have all run.
const domReady =
  window.BOOT || new Promise(r => (document.readyState === 'loading' ? addEventListener('DOMContentLoaded', r, {once: true}) : r()));
// The preview of an unsaved draft (?draft) may add candidates still waiting: those live in data/cand.json, out of data.json
// (tools/datajson.py; the players never need them), so the preview fetches them too.
const draftCand = () =>
  /[?&]draft\b/.test(location.search)
    ? fetch('data/cand.json', {cache: 'no-cache'})
        .then(okJson)
        .then(j => j.cand || {})
        .catch(() => ({}))
    : Promise.resolve({});
// Load order in tiers (docs/spec/loading.md "Load order in tiers"; files in index.html, loadTier), each set up once in
// (SETUP): 1 Home (data.json, curation, BOOT); 2 the quiz (with forms, quality, picks: the data rebuilt); 3 its next
// photos (planNext), then learn.js; 4 the sheet's reads; 5 the rest with proto/lab.css, then the service worker (earlier,
// its install would share the line). need(N) brings tiers 2..N; a page opened early asks for its own (route), a link at
// start-up too.
let HAVE = 1,
  started;
const STARTED = new Promise(r => (started = r)),
  TIERP = {},
  // The tier each page needs: Home and About 1; the quiz, the duels, My progress, the leaderboard and the achievements 2
  // (progress.js is small and the quiz needs it); the live mode 2 (live.js, with the quiz's engine); the Learn pages 3
  // (learn.js: the Genera page, the sheets, Look-alikes, a comparison); the Tools and the Coral ID Key (proto/) 5.
  pageTier = h =>
    !h || h === 'home' || h === 'about' || h.startsWith('delete-account')
      ? 1
      : /^(quiz|progress|board|ach|live)/.test(h)
        ? 2
        : /^(genera|g-|cmp)/.test(h)
          ? 3
          : 5,
  // Steps of the loading bar for a page of tier n: its scripts, and data.json.
  bootMax = n => [...document.querySelectorAll('link[data-tier]')].filter(l => +l.dataset.tier <= n).length + 1;
let J2 = null;
// calibration-set.json: the photos the draw shows a little more often until each is rated (model.js CALSET, setBonus).
const tier2json = () =>
  J2 || (J2 = Promise.all([forms(), json('quality.json?v=3'), json('picks.json?v=1'), json('calibration-set.json?v=1')]));
const SETUP = {
  2: ([f, q, k, cs]) => {
    FORMS = f;
    CFMAP = f.cf;
    AUTOQ = q.q || {};
    PICKS = k;
    CALSET = cs || {};
    build();
    loadStats();
    // progress.js comes with the quiz (answers given before it would lose their achievement bookkeeping): the achievement
    // record is migrated and counted here, before any answer.
    achMigrate();
    achPending(); // a recount that waited for a subject's data, once the shared data is built
    // Signed in, the one-time notices and the achievements check below wait for the visit's first sync and are decided
    // on the merged state (sync.js noticeLater, noticesGo); the notices this device saw before go to the account first.
    toldSeed();
    achRecheck(); // a learned mark taken away at load (model.js mxRecalc): its achievements first
    achCheck(); // before My progress opens, so its badge counts them
    recalcNotice(); // the one-time recalculation of every player's progress: said once, with a pop-up
    mxLostNotice(); // a learned mark taken away (model.js mxRecalc): said once, after the card above if both are due
    rvNotice(); // the cards of the rules versions skipped (core.js RVS msg, sync.js replayAdopt): after those above
    sorryNotice(); // an apology to the players of a broken opening (progress.js): once, after any recalculation note
    achHelped(); // a report of this player's marked done in the admin: told once
    subjHello(); // a subject newly open to the player (fish): once, at a calm moment on Home
    installNudge(); // install the app on the home screen: once, at a calm moment on Home
    tipRoute(hashNow()); // the Identify tool's "Did you know?" tip: Home or My progress, a page drawn before this tier
    prog();
    window.APP_READY = true; // Home, the quiz and My progress work (tests and tools/perf.js wait for this)
  },
  4: () => {
    syncPull();
    anonResend(); // once: every answer played without an account goes again (the sheet skips those it has)
    sendAnon();
    boardNotice();
    loadBoard();
    loadAchs();
  },
  5: () => {
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  }
};
// A later tier's stylesheets (index.html <link data-css=N>, no rel: nothing fetched) become stylesheets where they stand,
// so the cascade keeps its order; the tier waits until each has loaded or failed (the inline loader tries a failed one
// again, as it does Home's).
const tierCss = n =>
  Promise.all(
    [...document.querySelectorAll(`link[data-css="${n}"]:not([rel])`)].map(
      l =>
        new Promise(ok => {
          l.onload = l.onerror = ok;
          l.rel = 'stylesheet';
        })
    )
  );
function need(n) {
  if (n <= HAVE) return Promise.resolve();
  if (!TIERP[n])
    TIERP[n] = Promise.all([
      n > 2 ? need(n - 1) : STARTED,
      window.loadTier ? loadTier(n) : null,
      n === 2 ? tier2json() : null,
      // The subject's whole data (fish: fish-game.json, after Home's files): the quiz and the Learn pages wait for it.
      n === 2 ? UNITS[SUBJ.id].load(SUBJ).catch(() => null) : null,
      tierCss(n)
    ])
      .then(a => SETUP[n] && SETUP[n](a[2]))
      .then(() => (HAVE = Math.max(HAVE, n)));
  return TIERP[n];
}
// Home's doors before the data (docs/ARCHITECTURE.md "Load order in tiers"): drawn once the scripts ran (BOOT), the
// Learn band dark, then again with it (homeAgain), for a subject whose doors need no files of its own (UNITS
// doorsFirst); any other page shows the loading bar and asks for its tier. Tour, cards and notices wait for the data.
let EARLY = false,
  dataFailed = false;
const atHome = h => !h || h === 'home';
function beforeData() {
  if (dataFailed) return; // the start-up's "Could not load the data" stays on screen
  const h = hashNow();
  EARLY = atHome(h) && !!UNITS[SUBJ.id].doorsFirst && !!window.viewHome;
  if (EARLY) {
    resetHelp();
    viewHome();
    return;
  }
  const nt = pageTier(h);
  if (nt > 1) need(nt);
  // The start-up's own bar stays (with its "Slow connection" line); one is drawn again only over the early doors.
  if (!$v.querySelector('.boot'))
    $v.innerHTML = `<div class="boot"><p class="note">Loading…</p><progress id="bootp" max="${bootMax(nt)}" value="${window.bootTick ? bootTick.n() : 0}" aria-label="Loading"></progress></div>`;
  else if (nt > 1) {
    const bp = document.getElementById('bootp');
    if (bp) bp.max = Math.max(bp.max, bootMax(nt));
  }
}
// The data in with the early doors on screen: Home drawn again with its band, keeping where the player was (the scroll,
// the ? help open, the focus: the same control, by its place among the page's links and buttons; the two drawings differ
// only by the band's photos).
function homeAgain() {
  const y = scrollY,
    open = !$helpbox.hidden,
    a = document.activeElement,
    at = a && $v.contains(a) ? [...$v.querySelectorAll('a[href], button')].indexOf(a) : -1;
  EARLY = false;
  route();
  if (!atHome(hashNow())) return; // route() sent the address elsewhere
  if (y) window.scrollTo(0, y);
  if (open) {
    $helpbox.hidden = false;
    $help.setAttribute('aria-expanded', 'true');
    hdrMetrics();
  }
  const b = at >= 0 && $v.querySelectorAll('a[href], button')[at];
  if (b) b.focus({preventScroll: true});
}
domReady.then(() => DATA || beforeData());
{
  const n = pageTier(hashNow()),
    bp = document.getElementById('bootp');
  if (n > 1) {
    need(n);
    if (bp) bp.max = bootMax(n);
  }
}
Promise.all([
  getR('data.json?v=38')
    .then(r => (loadMark('pop', String(r.headers.get('x-served-by') || '').slice(0, 60)), r))
    .then(okJson)
    .then(d => (window.bootTick && bootTick(), d)),
  curation(),
  draftCand(),
  domReady,
  // The subject's own data (fish: fish.json): if it cannot come, the app opens on the first subject (corals).
  (UNITS[SUBJ.id].home || UNITS[SUBJ.id].load)(SUBJ).catch(() => subjectLoad(SUBJECTS[0]))
])
  .then(([d, c, dc]) => {
    Object.entries(dc).forEach(([g, L]) => {
      const C = (d.cand = d.cand || {}),
        have = new Set((C[g] || []).map(p => p.f));
      C[g] = [...(C[g] || []), ...L.filter(p => !have.has(p.f))];
    });
    RAW = d;
    CUR = c;
    build();
    // The quiz tier already in (a link straight to its page asks for it at start-up): its rebuild of a non-replayed
    // subject's old records, which waits for the data (model.js domRecalcAll).
    if (typeof domRecalcAll === 'function') domRecalcAll();
    showSubj();
    EARLY && atHome(hashNow()) ? homeAgain() : route();
    started();
    if (CUR_KEPT) curRefresh();
    if (window.tourFirst) tourFirst();
    // Then the other tiers in the background, one after the other: the quiz, the photos of its next questions (planned
    // now, so the quiz opens at once; a player already in the quiz or a duel gets theirs topped up), My progress (with
    // the leaderboard and the achievement shares, so their pages open at once), the rest.
    need(2)
      .then(() => {
        const h = hashNow();
        planNext(h.startsWith('quiz') ? h : 'quiz');
        return prefetched();
      })
      .then(() => need(4))
      .then(() => need(5));
  })
  .catch(() => {
    dataFailed = true;
    $v.innerHTML =
      '<p class="warn">Could not load the data. Check your connection. <button type="button" class="linkish" id="reload">Try again</button></p>';
    document.getElementById('reload').onclick = () => location.reload();
  });
// A tab left open for days follows the published curation: read again back in view or every 30 min, applied at the
// next screen (route), never mid-game. A curation adding a photo its data.json lacks (the Candidate photos Action still
// running after Publish) fetches data.json again, now or at a later refresh.
const rawFs = () => {
  const s = new Set(),
    add = L => (L || []).forEach(p => p && s.add(p.f));
  [...Object.values(RAW.gen || {}), ...Object.values((RAW.x || {}).gen || {})].forEach(g => {
    Object.values(g.views || {}).forEach(add);
    Object.values(g.more || {}).forEach(add);
  });
  [RAW.cand, RAW.course].forEach(o => Object.values(o || {}).forEach(add));
  return s;
};
// A Coral Finder book crop curation.json still adds (core.js cfCrop) is gone for good: never a reason to fetch again.
const addsMissing = c => {
  const have = rawFs();
  return Object.values((c && c.genera) || {}).some(g => Object.keys(g.add || {}).some(f => !have.has(f) && !cfCrop(f)));
};
function curRefresh() {
  if (!RAW || /[?&]draft\b/.test(location.search)) return;
  curAt = Date.now();
  curFetch({cache: 'no-cache'}, fetch)
    .then(r => (r.ok ? r.json() : null))
    .then(c => {
      if (c) store.set(CUR_LAST, c);
      if (c && JSON.stringify(c) !== JSON.stringify(CUR)) CUR_NEW = c;
      if (c && addsMissing(c))
        return fetch('data.json', {cache: 'no-cache'})
          .then(r => (r.ok ? r.json() : null))
          .then(d => {
            if (d && d.gen) {
              RAW = d;
              CUR_NEW = c; // rebuilt at the next page change, with the photo in
            }
          });
    })
    .catch(() => {});
}
// New versions (Pierre, 2026-11-02: players will not know to reload; docs/ARCHITECTURE.md "Overview"). Each
// deploy changes sw.js, checked at launch, back in view and every 30 min (swCheck); once a new one takes over, this page
// reloads at the next page change or back in view, never with a question waiting for its answer (UPDATED, QOPEN).
let UPDATED = false,
  QOPEN = false,
  swAt = Date.now();
// A page no service worker controls never sees a takeover: at the same moments, a newer deployed build number (<meta
// name="build">) counts as one (UPDATED). Newer, not different: a cache serving the older page must not loop it.
const newBuild = (mine, page) => {
  const m = /<meta name="build" content="(\d+)">/.exec(page || '');
  return !!m && /^\d+$/.test(mine || '') && +m[1] > +mine;
};
const buildCheck = () => {
  const b = document.querySelector('meta[name="build"]');
  if (!b || UPDATED) return;
  fetch(location.pathname, {cache: 'no-store'})
    .then(r => (r.ok ? r.text() : ''))
    .then(t => newBuild(b.content, t) && (UPDATED = true))
    .catch(() => {});
};
const swCheck = () => {
  swAt = Date.now();
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) buildCheck();
  if ('serviceWorker' in navigator)
    navigator.serviceWorker
      .getRegistration()
      .then(r => r && r.update())
      .catch(() => {});
};
// A new service worker asks every open page which version it runs (sw.js activate): this one answers, so it is left to
// reload by itself at the next page change (UPDATED); a page too old to answer is reloaded by the worker.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data && e.data.t === 'reefid-ver?' && e.ports && e.ports[0]) e.ports[0].postMessage({v: appVer()});
  });
  navigator.serviceWorker.startMessages();
}
if ('serviceWorker' in navigator) {
  // The first install also takes over: that one is no update; any takeover after it is (a tab first opened before any
  // version was installed, then left open, still gets the next ones).
  let had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (had) UPDATED = true;
    had = true;
  });
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (UPDATED && !QOPEN) return location.reload();
  if (Date.now() - curAt > 300000) curRefresh();
  if (Date.now() - swAt > 300000) swCheck();
});
setInterval(() => {
  if (document.visibilityState === 'visible') {
    curRefresh();
    swCheck();
  }
}, 1800000);
// The service worker is registered once every tier is in (SETUP[5]).
