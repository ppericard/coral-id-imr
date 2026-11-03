// IMR Reef ID: photo curation back-office (admin.html, not linked from the app).
// Edits curation.json: per genus, the cover photo, the featured photos of each view (in order),
// hidden photos and photos moved to another view. app.js applies it on top of data.json (applyCuration).
// Saving commits curation.json to the repo through the GitHub API with a fine-grained token. The token is
// kept in this browser only, encrypted with the admin password (the password alone protects nothing else:
// the page is public code, the token is what allows writing).
const REPO = 'ppericard/coral-id-imr',
  BRANCH = 'main',
  FILE = 'curation.json',
  API = `https://api.github.com/repos/${REPO}`;
const VIEWS = [
    ['wide', 'Colony'],
    ['medium', 'Close-up'],
    ['macro', 'Corallites']
  ],
  FEAT = 3,
  SHEET = 6;
// Cap per genus x view: a view with CELL_MAX colonies in the games is full (Candidates swiper, Game coverage; see
// cellFull). 10 at first (Pierre, 2026-11-01), then 20 the same day (Pierre: "the goal is to learn the genus, not the
// photos: the fewer photos, the more risk of learning the photos"; a player at 75% sees ~7 colonies of a genus before
// its 95%, and its mastery exam wants 5 photos never seen). A let only so the admin test can lower it.
let CELL_MAX = 20;
// Game genera first (Pierre, 2026-11-03: "quiz first"): the genera a game can ask (core.js gameOf: the IMR slate,
// Millepora, the bonus genera) are the rows of Game coverage and Where to look, and their candidates come before any
// other in Candidates. The other genera of data.json "x" are Finder-only (Identify > Coral Finder and their sheet): their
// cap is what the sheet and the Coral Finder can show of a view, CAP.sheet (6) colonies, and they get no Corallites
// candidates ("nobody uses the Coral Finder on a corallite close-up"; the macro photos already there stay). Set once
// the data is loaded (load()).
let GAME = new Set();
const isGame = n => GAME.has(n),
  capOf = n => (isGame(n) ? CELL_MAX : CAP.sheet);
const $v = document.getElementById('view'),
  $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
// Dates as toLocaleString([], …) writes them, with one formatter per format (Pierre, 2026-11-03: admin pages load slower
// and slower; toLocaleString builds a new one at every call, thousands of times on a Journey or in Triage). Times are
// always 24 h ("17:45", never "05:45 PM", whatever the browser's language; Pierre, 2026-11-03: narrower columns).
const DTF_O = {
    dm: {day: 'numeric', month: 'short'},
    dmhm: {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'},
    hm: {hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}
  },
  DTF = {};
const dateText = (t, k) => {
  const d = new Date(t);
  return isNaN(d) ? 'Invalid Date' : (DTF[k] = DTF[k] || new Intl.DateTimeFormat([], DTF_O[k])).format(d);
};
// Demo mode (admin.html?demo, admin-demo.js): made-up sync data, and its own browser storage ("demo:" keys), so a
// demo never reads or writes a real admin draft, token or Undo history.
const DEMO = !!window.ADMIN_DEMO,
  SK = k => (DEMO ? 'demo:' + k : k);
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(SK(k));
      return v === null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      v === null ? localStorage.removeItem(SK(k)) : localStorage.setItem(SK(k), JSON.stringify(v));
      return true;
    } catch (e) {
      return false;
    }
  }
};
// Candidates not downloaded yet (r: 1) show straight from iNaturalist; tools/fetch_approved.py downloads the ones added.
// A recropped photo keeps its file name: its URL carries the crop (cr) and rewrite count (iv) so no cache serves the old file.
const ver = p => (p.cr || p.iv ? `?c=${(p.cr || []).join('_')}${p.iv ? '.' + p.iv : ''}` : '');
// The site's photos from Cloudflare R2 (core.js PHOTO_BASE) while R2 answers; once an R2 photo failed in this tab, it and
// the next ones come from the site's img/ (as app.js photoFail; under the service worker, sw.js falls back by itself).
let R2 = !!PHOTO_BASE;
const img = (p, s) =>
  p.r && p.src
    ? p.src.replace('/original.', s ? '/medium.' : '/large.')
    : `${R2 ? PHOTO_BASE : ''}img/${p.f}${s ? '-s' : ''}.webp${ver(p)}`;
document.addEventListener(
  'error',
  e => {
    if (!(e.target instanceof HTMLImageElement)) return;
    const toSite = i => photoToSite(i) && ((R2 = false), true);
    // R2 once more first (core.js photoRetry: a passing error), then the site.
    if (photoRetry(e.target, toSite) || toSite(e.target)) e.stopImmediatePropagation();
  },
  true
);
const clone = o => JSON.parse(JSON.stringify(o));
// The page hash, decoded; a malformed %-escape no longer throws (code re-review L2).
const hashNow = () => {
  const h = location.hash.slice(1);
  try {
    return decodeURIComponent(h);
  } catch (e) {
    return h;
  }
};
const same = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);
// merge3 (three-way merge of a draft onto the latest published curation) and mergeOld live in core.js.
// Re-base the draft (and every Undo/Redo step) onto a newer published curation.
// Returns the paths where the draft replaced a choice published from elsewhere (see merge3).
function rebase(next) {
  const base = SAVED,
    f = d => merge3(base, d, next),
    conf = [];
  DRAFT = merge3(base, DRAFT, next, conf);
  DRAFT.genera = DRAFT.genera || {};
  HIST = HIST.map(x => JSON.stringify(f(JSON.parse(x))));
  FUT = FUT.map(x => JSON.stringify(f(JSON.parse(x))));
  SAVED = clone(next);
  SAVED.genera = SAVED.genera || {};
  snap = JSON.stringify(DRAFT);
  memoReset();
  if (TOKEN) {
    putDraft();
    store.set('reefid-curation-base', SAVED);
    keepHist();
  }
  return conf;
}
// "genera > Acropora > feat > wide" → "Acropora featured Colony"; top-level maps → "quality of acropora-…".
const confName = p => {
  const V = Object.fromEntries(VIEWS),
    W = {
      feat: 'featured',
      cover: 'cover',
      hide: 'hidden photos',
      move: 'view moves',
      add: 'added photos',
      out: 'not this genus',
      lv: 'zooms',
      ok: 'validation'
    };
  return p[0] === 'genera'
    ? [p[1], ...p.slice(2).map(x => V[x] || W[x] || x)].filter(Boolean).join(' ')
    : p.length > 1
      ? `${p[0]} of ${p[1]}`
      : p[0];
};
const confNote = c =>
  !c.length
    ? ''
    : ` Your choice replaced the one published from elsewhere for ${c.slice(0, 3).map(confName).join(', ')}${c.length > 3 ? ` and ${c.length - 3} more` : ''}.`;

let SHOWN_COVER = null,
  SUG = {},
  DUPS = [],
  FU0,
  PICKS = {},
  PHOTOS = {},
  KNOWN = new Set(),
  DATA,
  SAVED = {v: 1, genera: {}},
  SHA = null,
  DRAFT,
  TOKEN = null,
  cur = null,
  AUTOQ = {},
  AUTOF = {},
  lastGenus = null;
// Photo quality: 3 good, 2 fair, 1 poor (material for a realistic mode). First ratings come from quality.json
// (tools/photo_quality.py, rough on purpose); Pierre's corrections live in curation.json "quality" {f: level}.
const QUAL = [
  [3, 'Good'],
  [2, 'Fair'],
  [1, 'Poor']
];
// Automatic rating: never Poor for an IMR lecture photo (as autoQ in app.js); only Pierre's own rating can say Poor.
const autoQ = f => {
  const a = AUTOQ[f] || 2;
  return a === 1 && /^imrl?-/.test(f) ? 2 : a;
};
const qOf = f => (DRAFT.quality || {})[f] || autoQ(f),
  qSet = f => !!(DRAFT.quality || {})[f];
// Every click is saved at once as a draft in this browser (it survives a reload or closing the tab);
// Publish sends the draft to the public site.
let draftAt = null;
// No button ever clears several choices at once: Undo (or Ctrl+Z) steps back one click at a time, within this visit.
// Redo (or Ctrl+Shift+Z / Ctrl+Y) steps forward again; a new click clears the redo steps.
let HIST = [],
  FUT = [],
  snap = null;
// The Undo steps survive a reload of this tab (admin re-review, 2026-11-01): kept in sessionStorage (this tab only,
// gone when it closes; the last 60 steps), with the draft they lead to, so another tab's draft never picks them up.
const HKEY = SK('reefid-admin-undo');
const keepHist = () => {
  if (!TOKEN) return;
  try {
    sessionStorage.setItem(HKEY, JSON.stringify({snap, hist: HIST.slice(-60), fut: FUT.slice(-60)}));
  } catch (e) {}
};
// Read-only (no token): clicks stay in this tab only, nothing is kept as a draft (admin review, 2026-11-01).
function saveDraft() {
  memoReset();
  if (snap !== null) {
    autoWhen();
    HIST.push(snap);
  }
  if (HIST.length > 300) HIST.shift();
  FUT = [];
  snap = JSON.stringify(DRAFT);
  if (ASIG) ASIG_OF = snap;
  if (!TOKEN) return;
  draftLost = !putDraft();
  draftAt = new Date();
  keepHist();
}
let draftLost = false,
  UPDATED = false; // a new version took over in the background (see the init: reloads at the next calm moment)
// The first install also takes over: that one is no update; any takeover after it is (a tab first opened before any
// version was installed, then left open, still gets the next ones: Codex review #336). Listened to from the first line,
// as in app.js: added at the end of start(), after data.json, a version taking over while the admin loaded went unseen
// and the tab kept the old code (net smoke test, 2026-11-03).
if ('serviceWorker' in navigator) {
  let had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (had) UPDATED = true;
    had = true;
  });
  // The worker could not get a photo from R2 (sw.js r2Down): the next photos come from the site, as app.js does.
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data && e.data.t === 'reefid-r2-down') R2 = false;
  });
}
// The draft as this tab last wrote it to, or took it from, localStorage: the common base when another admin tab writes its own.
// Two admin tabs in one browser share the stored draft (code re-review 2026-11-01, M4). Every write is tagged with this
// tab's revision and the revision it had last seen (takeTab in core.js), and a draft another tab stored is merged in, against
// the draft that tab started from, before every write and on every storage event. Neither tab erases the other's clicks,
// even when both click before hearing of each other.
const TAB = Math.random().toString(36).slice(2, 8),
  REVS = {};
let REV = 0,
  SEEN = null;
function takeOther() {
  const v = store.get('reefid-curation-draft', null);
  if (!v || !v.genera) return null;
  const m = takeTab(REVS, DRAFT, SAVED, v);
  if (!m) return null;
  if (v._tab) SEEN = v._tab.rev;
  if (!m.changed) return null;
  DRAFT = m.draft;
  snap = JSON.stringify(DRAFT);
  memoReset();
  return m;
}
function putDraft() {
  if (takeOther()) setTimeout(() => toast('Clicks made in another admin tab are in.'), 0);
  const rev = `${TAB}.${++REV}`,
    keys = Object.keys(REVS);
  if (keys.length > 200) keys.slice(0, 50).forEach(k => delete REVS[k]);
  REVS[rev] = clone(DRAFT);
  const ok = store.set('reefid-curation-draft', Object.assign({}, DRAFT, {_tab: {rev, seen: SEEN}}));
  SEEN = rev;
  return ok;
}
function step(from, to, msg) {
  if (!from.length) return toast(msg[0]);
  to.push(snap);
  snap = from.pop();
  DRAFT = JSON.parse(snap);
  memoReset();
  if (TOKEN) {
    putDraft();
    draftAt = new Date();
    keepHist();
  }
  render();
  toast(msg[1]);
}
// When Pierre answers a Check or corrects an auto decision, the time goes into its log code (autosort.js autoStamp), so
// the agreement window follows the order he answered in (Codex review #400). Found by comparing his answers per photo
// with those of the draft before this click (snap; recomputed only when undo, redo or another tab changed it).
let ASIG = null,
  ASIG_OF = null;
function autoWhen() {
  if (ASIG_OF !== snap) {
    ASIG = autoSigs(JSON.parse(snap));
    ASIG_OF = snap;
  }
  const A = autoStamp(DRAFT, ASIG, Date.now() / 1000);
  if (A) DRAFT.auto = A;
  ASIG = autoSigs(DRAFT); // of the draft saveDraft is about to keep as snap
}
const untimed = L => Object.fromEntries(Object.entries(L).map(([f, c]) => [f, String(c).replace(/@[0-9a-z]+$/, '')]));
const undo = () => step(HIST, FUT, ['Nothing to undo.', 'Undone.']),
  redo = () => step(FUT, HIST, ['Nothing to redo.', 'Redone.']);
const qChanged = () => !same(DRAFT.quality || {}, SAVED.quality || {});
// "Bad photo" flags Pierre raised on the site (flag.js, localStorage 'reefid-photo-flags'): curation.json "flag"
// {f: {genus, view, where, at}}. Triage lists them; "Done" removes one (one at a time, never in bulk).
const flChanged = () => !same(DRAFT.flag || {}, SAVED.flag || {});
// Suggestions from the outside judging agent (suggest.json, tools/judging_import.py): Triage lists them one at a time.
// Accept runs the normal action (move, Not this genus, exclude, hide, add); "Several corals" keeps the photo off games
// (curation.json "use" {f: 'ref'}); Dismiss is remembered in curation.json "seen" {kind:f: 1} so it never comes back.
const seenOf = (o, cand) => Object.fromEntries(Object.entries(o.seen || {}).filter(([k]) => k.startsWith('cand:') === cand));
const sgChanged = () => !same(seenOf(DRAFT, false), seenOf(SAVED, false)) || !same(DRAFT.use || {}, SAVED.use || {});
// Candidates rejected in the Candidates view: curation.json "seen" {'cand:f': 1}. Only a "reviewed" mark: the photo stays a candidate.
const cdChanged = () => !same(seenOf(DRAFT, true), seenOf(SAVED, true));
function importFlags() {
  const L = store.get('reefid-photo-flags', []);
  if (!L || !L.length) return 0;
  DRAFT.flag = {...(DRAFT.flag || {})};
  let n = 0;
  L.forEach(x => {
    if (x && x.f && !DRAFT.flag[x.f]) {
      const {f, ...rest} = x;
      DRAFT.flag[f] = rest;
      n++;
    }
  });
  store.set('reefid-photo-flags', null);
  if (n) saveDraft();
  return n;
}
// Excluded photos (curation.json "exclude" {f: reason}): unusable for good (a person, a drawing, AI…). Unlike Hide,
// which is a per-genus editorial choice, exclusion removes the photo from every genus, game and candidate list,
// and import scripts skip it so it never comes back. The Excluded view lists them, to restore one.
const excl = f => (DRAFT.exclude || {})[f];
const xChanged = () => !same(DRAFT.exclude || {}, SAVED.exclude || {});
// Coral Finder book photos on the site (curation.json "book": false switches every one of them off at once).
const mtChanged = () => !same(DRAFT.mont || {}, SAVED.mont || {});
// Lead photos of the growth-form tiles on the Coral Finder start (curation.json "tile" {form letter: [f, ...]}, at most
// 3, in click order): set with 📌 in the Growth form view. A pinned photo leads its IMR form's tile and the Coral Finder
// tile that starts from that form (Br → Branching, En → Thin plates and crusts, Ma → Massive, Sm → Columns,
// Mu → Solitary); the tile's other places stay automatic. One click pins or unpins; a 4th pin drops the oldest.
const TILE_MAX = 3,
  tileOf = c => (DRAFT.tile || {})[c] || [],
  tlChanged = () => !same(DRAFT.tile || {}, SAVED.tile || {});
function togglePin(f, c) {
  const T = {...(DRAFT.tile || {})},
    L = (T[c] || []).filter(x => x !== f);
  if (L.length === (T[c] || []).length) {
    L.push(f);
    if (L.length > TILE_MAX) L.shift();
  }
  if (L.length) T[c] = L;
  else delete T[c];
  DRAFT.tile = T;
  saveDraft();
}
// Crops (curation.json "crop" {f: [left, top, right, bottom]} as fractions of the photo): set in the Candidates view;
// tools/fetch_approved.py applies them when it downloads the photo (and redoes it if the crop changes).
const crOf = f => (DRAFT.crop || {})[f],
  crChanged = () => !same(DRAFT.crop || {}, SAVED.crop || {});
const snChanged = () => !same(DRAFT.single || {}, SAVED.single || {});
// A photo's src and its draft crop as a preview (object-view-box). A downloaded photo's local file already has the
// published crop in it (data.json "cr", tools/fetch_approved.py): shown as is while the draft keeps that crop, and the
// original (iNat) with the draft crop as soon as the draft differs (Pierre, 2026-11-03: the crop just made showed "one
// time in two", when it was laid over a file cropped already).
// A candidate's suggested crop (suggest.json cand c, the judging pass; Pierre 2026-11-03: "le crop, tu aurais pu presque
// le faire de manière automatique"): shown on it until he adds it, then written to his crops when he adds it (ACT.addc),
// where he can change it as any crop. His own crop, or Full photo ([0, 0, 1, 1]), always wins.
const sugCrop = p => (p && p.j && p.j.c && !crOf(p.f) ? p.j.c : null);
const crSrc = (p, s) => {
  const c = crOf(p.f) || sugCrop(p),
    baked = !p.r && p.cr;
  if (baked && same(c, p.cr)) return `src="${img(p, s)}"`;
  const src = baked && p.src ? p.src.replace('/original.', s ? '/medium.' : '/large.') : img(p, s);
  return c
    ? `src="${src}" style="object-view-box:inset(${+(c[1] * 100).toFixed(1)}% ${+((1 - c[2]) * 100).toFixed(1)}% ${+((1 - c[3]) * 100).toFixed(1)}% ${+(c[0] * 100).toFixed(1)}%)"`
    : `src="${src}"`;
};
const bookOn = o => o.book !== false,
  bChanged = () => bookOn(DRAFT) !== bookOn(SAVED);
const qTag = p => {
  const q = qOf(p.f);
  return `<span class="adm-q q${q}${qSet(p.f) ? '' : ' auto'}" title="${qSet(p.f) ? 'Quality set by you' : 'Automatic first guess'}">${QUAL.find(x => x[0] === q)[1]}</span>`;
};
// blind (a Check in Candidates): only Pierre's own rating shows, never the automatic guess.
const qSeg = (p, blind) =>
  `<span class="adm-qseg" role="group" aria-label="Quality">${QUAL.map(([q, t]) => `<button type="button" data-q="${q}" aria-pressed="${(blind ? (DRAFT.quality || {})[p.f] : qOf(p.f)) === q}" class="q${q}">${t}</button>`).join('')}</span>`;
function setQ(f, q) {
  DRAFT.quality = DRAFT.quality || {};
  // Always recorded, even when it matches the automatic guess: a later re-run of photo_quality.py must never change it.
  DRAFT.quality[f] = q;
  saveDraft();
}
// Growth form of each photo: ONE of the 7 IMR Lecture 6 growth forms (forms.json "forms": B Branching, E Encrusting,
// T Tabulate, U Mushroom, M Massive, S Submassive, F Foliose/Plating), the main one visible (Pierre), or x = form not
// visible (too close); plus a polyps flag ("p" yes, "n" no) for polyps or vesicles extended by day, which is not a form
// (Coral Finder "Large daytime polyps"). First guesses come from forms.json "gf"; Pierre's choices live in curation.json
// "gf" {f: 'M' | 'Mp' | 'xn' | 'p'} and always win, form and flag each on their own. The old Coral Finder letters
// (forms.json "form") are only a hint for the photos still to classify.
// Guesses to double-check (forms.json gunsure): a "?" until you click.
let FUNSURE = new Set(),
  FDEF = [],
  LEGACY = {};
const FORM_ORDER = 'BETUMSF',
  FABBR = {B: 'Br', E: 'En', T: 'Ta', U: 'Mu', M: 'Ma', S: 'Sm', F: 'Fo', x: '∅'};
const fL = v => (v || '').replace(/[pn]/g, ''),
  fP = v => ((v || '').includes('p') ? true : (v || '').includes('n') ? false : null);
const mineF = f => (DRAFT.gf || {})[f] || '';
const fOf = f => fL(mineF(f)) || fL(AUTOF[f]),
  fSet = f => !!fL(mineF(f));
const pOf = f => {
    const m = fP(mineF(f));
    return m === null ? fP(AUTOF[f]) === true : m;
  },
  pSet = f => fP(mineF(f)) !== null;
const fChanged = () => !same(DRAFT.gf || {}, SAVED.gf || {});
const fName = id => (id === 'x' ? 'Form not visible' : (FDEF.find(k => k.id === id) || {}).name || id);
const cfName = id => (DATA.key.find(k => k.id === id) || {}).name || id;
function putF(f, letter, pol) {
  DRAFT.gf = DRAFT.gf || {};
  // Always recorded, even when it matches the first guess, so a new forms.json can never change it.
  const v = letter + (pol === true ? 'p' : pol === false ? 'n' : '');
  if (v) DRAFT.gf[f] = v;
  else delete DRAFT.gf[f];
  // A photo given another form leaves the tile it was pinned to (in the same undo step).
  // Compared with the form the photo has now (an automatic guess counts), so a polyps click never unpins it.
  if (DRAFT.tile) {
    const now = fOf(f),
      T = {};
    Object.entries(DRAFT.tile).forEach(([c, L]) => {
      const K = c === now ? L : L.filter(x => x !== f);
      if (K.length) T[c] = K;
    });
    DRAFT.tile = T;
  }
  saveDraft();
}
const setF = (f, c) => putF(f, c, fP(mineF(f)));
const setP = (f, on) => putF(f, fL(mineF(f)), on);
const fSeg = (p, blind) => {
  const v = blind ? fL(mineF(p.f)) : fOf(p.f),
    un = !blind && !fSet(p.f) && FUNSURE.has(p.f),
    po = blind ? fP(mineF(p.f)) === true : pOf(p.f);
  return `<span class="adm-qseg adm-fseg${fSet(p.f) || blind ? '' : ' auto'}${un ? ' unsure' : ''}" role="group" aria-label="Growth form" title="Growth form">${[...FORM_ORDER, 'x'].map(c => `<button type="button" data-fm="${c}" aria-pressed="${v === c}" title="${esc(fName(c))}">${FABBR[c]}</button>`).join('')}<button type="button" class="adm-pol${pSet(p.f) ? '' : ' auto'}" data-pol aria-pressed="${po}" title="Polyps or vesicles extended">✿</button></span>`;
};

/* ---------- Token vault: AES-GCM key derived from the password (PBKDF2) ---------- */
const b64 = u => btoa(String.fromCharCode(...new Uint8Array(u))),
  unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function vaultKey(pw, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256'}, base, {name: 'AES-GCM', length: 256}, false, [
    'encrypt',
    'decrypt'
  ]);
}
async function lockToken(pw, token) {
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, await vaultKey(pw, salt), new TextEncoder().encode(token));
  store.set('reefid-admin-vault', {salt: b64(salt), iv: b64(iv), ct: b64(ct)});
}
async function unlockToken(pw) {
  const v = store.get('reefid-admin-vault', null);
  const pt = await crypto.subtle.decrypt({name: 'AES-GCM', iv: unb64(v.iv)}, await vaultKey(pw, unb64(v.salt)), unb64(v.ct));
  return new TextDecoder().decode(pt);
}

/* ---------- GitHub ---------- */
// cache: 'no-store': GitHub API replies say max-age=60, and a cached read would carry an old sha right after a publish
// from another device.
const gh = (path, opts = {}) =>
  fetch(API + path, {
    cache: 'no-store',
    ...opts,
    headers: {Accept: 'application/vnd.github+json', Authorization: `Bearer ${TOKEN}`, ...(opts.headers || {})}
  }).then(async r => {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message || `GitHub error ${r.status}`);
    return j;
  });
const fromB64 = s => decodeURIComponent(escape(atob(s.replace(/\n/g, ''))));
const toB64 = s => btoa(unescape(encodeURIComponent(s)));
async function checkToken() {
  const r = await gh('');
  if (!(r.permissions && r.permissions.push)) throw new Error('This token cannot write to the repository.');
}
async function loadSaved() {
  if (TOKEN) {
    const f = await gh(`/contents/${FILE}?ref=${BRANCH}`).catch(e => {
      if (/Not Found/.test(e.message)) return null;
      throw e;
    });
    if (f) {
      SAVED = JSON.parse(fromB64(f.content));
      SHA = f.sha;
    }
  } else
    SAVED = await fetch(FILE, {cache: 'no-cache'})
      .then(r => (r.ok ? r.json() : SAVED))
      .catch(() => SAVED);
  SAVED.genera = SAVED.genera || {};
}

/* ---------- Lock screen ---------- */
function lockScreen(msg) {
  const has = !!store.get('reefid-admin-vault', null);
  $v.innerHTML = `<section class="adm-lock">
    <h2>${has ? 'Unlock' : 'Set up this device'}</h2>
    ${
      has
        ? `<p class="lede">Enter the admin password.</p>`
        : `<p class="lede">Choose an admin password and paste a GitHub token that can write to <b>${REPO}</b>. The token stays in this browser, encrypted with the password. Do this once per device.</p>
      <ol class="note adm-steps"><li>Open <a href="https://github.com/settings/personal-access-tokens/new?name=IMR%20Coral%20ID%20curation&description=Photo%20curation%20back-office&expires_in=90&contents=write" target="_blank" rel="noopener">New fine-grained token</a> (pre-filled).</li>
      <li>Repository access: <b>Only select repositories</b>, then <b>coral-id-imr</b>. Permission: <b>Contents: Read and write</b>.</li><li>Generate, copy it and paste it below.</li></ol>
      <p class="note">coral-id-imr not in the list? Fine-grained tokens only reach your own repositories or your organisations', so a collaborator uses a <a href="https://github.com/settings/tokens/new?scopes=repo&description=IMR%20Coral%20ID%20curation" target="_blank" rel="noopener">classic token</a> (scope <b>repo</b>, pre-filled) instead.</p>`
    }
    <form id="lockf" class="adm-form">
      <label>Password <input type="password" id="pw" autocomplete="current-password" required></label>
      ${
        has
          ? ''
          : `<label>Password again <input type="password" id="pw2" autocomplete="new-password" required></label>
        <label>GitHub token <input type="password" id="tok" autocomplete="off" spellcheck="false" placeholder="github_pat_…" required></label>`
      }
      <button class="adm-btn" type="submit">${has ? 'Unlock' : 'Save and unlock'}</button>
      ${msg ? `<p class="adm-err" role="alert">${esc(msg)}</p>` : ''}
    </form>
    ${has ? '<p class="note"><button type="button" class="adm-link" id="forget">Forget this device</button> (removes the stored token)</p>' : ''}
    <p class="note"><a href="?readonly">Just look (read-only)</a>: nothing can be published or kept.</p>
  </section>`;
  $('pw').focus();
  $('lockf').onsubmit = async e => {
    e.preventDefault();
    const b = e.submitter;
    b.disabled = true;
    b.textContent = 'Checking…';
    try {
      if (has) {
        try {
          TOKEN = await unlockToken($('pw').value);
        } catch (x) {
          throw new Error('Wrong password.');
        }
      } else {
        if ($('pw').value !== $('pw2').value) throw new Error('The two passwords differ.');
        TOKEN = $('tok').value.trim();
      }
      await checkToken();
      if (!has) await lockToken($('pw').value, TOKEN);
      sess.set(TOKEN);
      start();
    } catch (x) {
      TOKEN = null;
      lockScreen(x.message);
    }
  };
  if (has)
    $('forget').onclick = () => {
      if (confirm('Remove the stored token from this browser?')) {
        store.set('reefid-admin-vault', null);
        sess.set(null);
        lockScreen();
      }
    };
}

/* ---------- Photos of a genus, as the genus sheet orders them ---------- */
// own/photos/cands of one genus each walk every genus, and the Candidates queue and Coverage need them for every genus:
// computed once per draft state (cleared by every edit, undo/redo and merge), callers get a copy of the list.
// Kept from one page to the next while the draft stays the same (Pierre, 2026-11-03: admin pages load slower and slower;
// every page change recomputed every genus's photos for the header's over-the-cap count): render() clears it only when
// the draft differs from the one it was computed for (memoFresh). The data files do not change once loaded.
let MEMO = {},
  MEMO_OF = null;
const memoReset = () => {
  MEMO = {};
  MEMO_OF = null;
};
const memoFresh = () => {
  const s = JSON.stringify(DRAFT);
  if (s !== MEMO_OF) {
    MEMO = {};
    MEMO_OF = s;
  }
};
const memo = (k, fn) => n => {
  const key = k + '|' + n;
  if (!(key in MEMO)) MEMO[key] = fn(n);
  return MEMO[key].slice();
};
// "Several corals" photos (data.json more / course multi) Pierre marked as one coral (curation.json single {f: 1}) become normal photos.
const one = f => !!(DRAFT.single || {})[f];
// Photos data.json gives the genus (plus approved candidates), before any "Not this genus".
const own = memo('own', n => {
  const g = DATA.gen[n],
    two = g.levels === 2,
    L = [];
  VIEWS.forEach(([v]) => {
    (g.views[v] || []).forEach(p => L.push({...p, base: v}));
    ((g.more || {})[v] || []).forEach(p => L.push(one(p.f) ? {...p, base: v, wasMulti: true} : {...p, base: v, multi: true, extra: true}));
  });
  (DATA.course[n] || []).forEach(p =>
    L.push({...p, base: p.v === 'medium' && two ? 'macro' : p.v, ...(p.multi && one(p.f) ? {multi: false, wasMulti: true} : {})})
  );
  for (let i = L.length - 1; i >= 0; i--) if (excl(L[i].f)) L.splice(i, 1);
  // Candidates Pierre approved (curation add: {f: view}) join their view as normal photos (app.js applyCuration).
  const add = entry(n).add || {};
  cands(n)
    .filter(p => add[p.f])
    .forEach(p => L.push({...p, base: add[p.f], cand: true}));
  return L;
});
// "Not this genus" (curation out: {f: 'cmp' | other genus}): the photo leaves the genus; given to another genus,
// it joins that genus in the same view (tagged with where it came from); 'cmp' keeps it for the Look-alikes section.
const outs = n => entry(n).out || {};
// Photos (or candidates) sent from every genus to another one, by the genus they go to: one pass over every genus per
// draft state, instead of one for each genus asked (Pierre, 2026-11-03: admin pages load slower and slower). Same order
// as walking the genera for one genus.
const sentTo = (k, list) => {
  const key = 'to|' + k;
  if (!(key in MEMO)) {
    const T = Object.create(null);
    Object.keys(DATA.gen).forEach(m => {
      const o = outs(m);
      list(m).forEach(p => {
        const n = o[p.f];
        if (typeof n === 'string' && n !== m) (T[n] = T[n] || []).push({...p, from: m});
      });
    });
    MEMO[key] = T;
  }
  return MEMO[key];
};
const photos = memo('photos', n => [...own(n).filter(p => !outs(n)[p.f]), ...(sentTo('own', own)[n] || [])]);
const outOf = n => [...own(n).filter(p => outs(n)[p.f]), ...rawCands(n).filter(p => outs(n)[p.f] && !(entry(n).add || {})[p.f])];
// New candidate photos from data.json cand, not used by the site until approved here.
// Coral Finder book photos (data: gen[].book) are candidates too; once added they show on the site but never in games.
const rawCands = memo('raw', n => [...((DATA.cand || {})[n] || []), ...(DATA.gen[n].book || [])].filter(p => !excl(p.f)));
// A candidate sent to another genus ("Not this") becomes a candidate there, tagged with where it came from.
const cands = memo('cands', n => [...rawCands(n).filter(p => !outs(n)[p.f]), ...(sentTo('cand', rawCands)[n] || [])]);
// Same order as the Show source chips (ORIGINS), CF book last.
const oIdx = p => ORIGINS.findIndex(o => o[0] === origin(p));
const pending = n => {
  const add = entry(n).add || {};
  return cands(n)
    .filter(p => !add[p.f])
    .sort((a, b) => oIdx(a) - oIdx(b));
};
// Candidates section (Pierre: one "Remove" everywhere sends a photo back there): new candidates plus removed (hidden) photos.
const unused = n =>
  [
    ...pending(n),
    ...photos(n)
      .filter(p => hidden(n, p))
      .map(p => ({...p, wasHidden: true}))
  ].sort((a, b) => oIdx(a) - oIdx(b));
const entry = n => DRAFT.genera[n] || {};
// Zoom levels (curation lv, header switch): 2 levels = Closer photos join Colony (as applyCuration in app.js).
const lv = n => entry(n).lv || (DATA.gen[n].levels === 2 ? 2 : 3);
const viewOf = (n, p) => {
  const v = (entry(n).move || {})[p.f] || p.base;
  return v === 'medium' && lv(n) === 2 && DATA.gen[n].levels !== 2 ? 'wide' : v;
};
const hidden = (n, p) => (entry(n).hide || []).includes(p.f);
// Photos kept out of the featured / genus-sheet slots: extra photos and Coral Finder book photos (the site keeps
// added book photos apart from the views: Coral Finder only, never the sheet, cover or games; app.js applySlots).
const offSlot = p => !!(p.extra || p.cf);
// Same order as applySlots in app.js: IMR photos, then Pierre's, then other observers, each by quality,
// Poor photos and multi-coral photos last, then book photos.
function autoOrder(L) {
  const byQ = x => x.slice().sort((a, b) => qOf(b.f) - qOf(a.f));
  const main = L.filter(p => !offSlot(p)),
    out = [...byQ(main.filter(p => p.imr)), ...byQ(main.filter(p => !p.imr && p.own)), ...byQ(main.filter(p => !p.imr && !p.own))];
  const ok = out.filter(p => !p.multi);
  return [...ok.filter(p => qOf(p.f) > 1), ...ok.filter(p => qOf(p.f) === 1), ...out.filter(p => p.multi), ...byQ(L.filter(offSlot))];
}
// k photos from L in order, a different observation each time when possible (as take() in app.js).
const takeObs = (L, k) => {
  const out = [],
    seen = new Set();
  [true, false].forEach(fresh =>
    L.forEach(p => {
      if (out.length < k && !out.includes(p) && (!fresh || !seen.has(p.o || p.f))) {
        out.push(p);
        seen.add(p.o || p.f);
      }
    })
  );
  return out;
};
function rowOf(n, v) {
  const live = photos(n).filter(p => viewOf(n, p) === v && !hidden(n, p)),
    order = autoOrder(live);
  const pin = (entry(n).feat || {})[v];
  // No pick of yours: Claude's suggestion (picks.json) first, then the automatic order, as on the site.
  const sug = ((PICKS[n] || {})[v] || []).map(f => live.find(p => p.f === f && !p.multi && !offSlot(p))).filter(Boolean);
  // Featured = always the first FEAT photos (Pierre): his pinned ones in his order, the rest filled automatically,
  // never with a Poor photo while better ones exist, except IMR lecture photos (as on the site).
  // Coral Finder book photos (Pierre 2026-11-01): on the sheet when pinned, or to fill a gap after every field photo; never in games.
  const pinned = (pin || [])
    .map(f => live.find(p => p.f === f))
    .filter(Boolean)
    .slice(0, FEAT);
  const cand = [...sug, ...order.filter(p => !p.multi && !offSlot(p))].filter(p => !pinned.includes(p)),
    k = FEAT - pinned.length;
  const good = takeObs(
      cand.filter(p => p.imr || qOf(p.f) !== 1),
      k
    ),
    field = [
      ...good,
      ...takeObs(
        cand.filter(p => !good.includes(p)),
        k - good.length
      )
    ];
  const feat = [...pinned, ...field, ...order.filter(p => p.cf && !pinned.includes(p)).slice(0, k - field.length)];
  return {
    feat,
    pinned: pinned.map(p => p.f),
    auto: !pinned.length,
    rest: order.filter(p => !feat.includes(p)),
    hid: photos(n).filter(p => viewOf(n, p) === v && hidden(n, p))
  };
}
function coverOf(n) {
  const g = DATA.gen[n],
    all = photos(n).filter(p => !hidden(n, p)),
    k = entry(n);
  // Same fallbacks as cover() in app.js: your pick, the first IMR featured Closer photo, data.json's pick, the first closer field photo (featured first).
  const F = (k.feat || {}).medium || [],
    med = all.filter(x => viewOf(n, x) === 'medium' && !x.imr && !offSlot(x));
  const ri = rowOf(n, 'medium').feat.find(x => x.imr);
  const p =
    (k.cover && all.find(x => x.f === k.cover)) ||
    ri ||
    all.find(x => x.f === g.cover && !offSlot(x)) ||
    med.find(x => F.includes(x.f)) ||
    med[0] ||
    all.find(x => !x.imr && !offSlot(x));
  return p && {...p, view: viewOf(n, p), picked: !!k.cover};
}
// Status (Pierre): ✓ only when the genus has everything the site needs AND he validated it (curation ok: true).
// Needs: 3 featured photos per view, a cover that is not a close-up (3 levels), no broken choice.
// A non-IMR Poor photo among the featured is only a warning (Pierre: he may have no better example).
const poorIn = n =>
  rows(n)
    .filter(([v]) => rowOf(n, v).feat.some(p => !p.imr && qOf(p.f) === 1))
    .map(([v]) => `${label(n, v)}: Poor`);
function needs(n) {
  const out = [],
    c = coverOf(n);
  rows(n).forEach(([v]) => {
    const f = rowOf(n, v).feat;
    if (f.length < FEAT) out.push(`${label(n, v)} ${f.length}/${FEAT}`);
  });
  if (!c) out.push('No cover');
  else if (c.view === 'macro' && lv(n) !== 2) out.push('Macro cover');
  if (missing(n).length) out.push('⚠ check');
  return out;
}
const rows = n => VIEWS.filter(([v]) => !(lv(n) === 2 && v === 'medium' && !photos(n).some(p => viewOf(n, p) === 'medium')));
const label = (n, v) => (lv(n) === 2 && v === 'macro' ? 'Close-up' : VIEWS.find(x => x[0] === v)[1]);
// Photo origin: IMR lecture, Pierre's own iNaturalist photos, or other iNaturalist observers split by place
// (data.json p.loc: dauin, ph or world). The filter is kept across genera and visits.
// Short chip labels for the genus bar (full name in the tooltip), so the whole bar fits on one line.
const SHORT_O = {imr: 'IMR', own: 'Pierre', dauin: 'Dauin', ph: 'PH', world: 'World', book: 'CF'};
const ORIGINS = [
  ['imr', 'IMR lecture'],
  ['own', 'Pierre'],
  ['dauin', 'iNat Dauin'],
  ['ph', 'iNat Philippines'],
  ['world', 'iNat elsewhere'],
  ['book', 'CF book']
];
const origin = p => (p.cf ? 'book' : p.imr ? 'imr' : p.own ? 'own' : {dauin: 'dauin', ph: 'ph'}[p.loc] || 'world');
let SHOW = new Set(
  store.get(
    'reefid-admin-origins',
    ORIGINS.map(o => o[0])
  )
);
const shown = p => SHOW.has(origin(p));
// A photo the auto-sort added carries an "auto" tag next to its source (undo it in Candidates › Auto › Details).
const srcTag = p => {
  const o = origin(p),
    a = aApplied(p.f);
  return `<span class="adm-src o-${o}">${ORIGINS.find(x => x[0] === o)[1]}</span>${a && a.kind === 'a' ? '<span class="adm-src adm-autot" title="Auto-sort">auto</span>' : ''}`;
};

/* ---------- Edits ---------- */
function edit(n, fn) {
  memoReset();
  const k = clone(entry(n));
  fn(k);
  ['feat', 'move', 'add', 'out'].forEach(x => {
    if (k[x] && !Object.keys(k[x]).length) delete k[x];
  });
  if (k.hide && !k.hide.length) delete k.hide;
  if (Object.keys(k).length) DRAFT.genera[n] = k;
  else delete DRAFT.genera[n];
  saveDraft();
  render();
}
const ensureFeat = (k, n, v) => {
  k.feat = k.feat || {};
  if (!k.feat[v]) k.feat[v] = rowOf(n, v).feat.map(p => p.f);
  return k.feat[v];
};
const dropFeat = (k, f) =>
  Object.keys(k.feat || {}).forEach(v => {
    k.feat[v] = k.feat[v].filter(x => x !== f);
    if (!k.feat[v].length) delete k.feat[v];
  });
const ACT = {
  cover: (n, f) =>
    edit(n, k => {
      if (k.cover === f) delete k.cover;
      else k.cover = f;
    }),
  // On an automatic pick, a click on a photo already featured confirms the whole pick as yours (it never drops it).
  feat: (n, f, v) =>
    edit(n, k => {
      const auto = !(k.feat || {})[v],
        L = ensureFeat(k, n, v);
      if (auto && L.includes(f)) return;
      if (L.includes(f)) {
        L.splice(L.indexOf(f), 1);
        if (!L.length) {
          toast('A view needs at least one featured photo: back to the automatic pick.');
          delete k.feat[v];
        }
      } else if (L.length >= FEAT) toast(`Already ${FEAT} featured: remove one first.`);
      else L.push(f);
    }),
  addc: (n, f, v, to) =>
    edit(n, k => {
      if ((k.hide || []).includes(f)) {
        const p = photos(n).find(x => x.f === f);
        k.hide = k.hide.filter(x => x !== f);
        k.move = k.move || {};
        if (to === p.base) delete k.move[f];
        else k.move[f] = to;
        return;
      }
      k.add = k.add || {};
      k.add[f] = to;
      const sc = sugCrop(cands(n).find(x => x.f === f));
      if (sc) DRAFT.crop = {...(DRAFT.crop || {}), [f]: sc}; // saved with the add: one Undo step for both
    }),
  multi: (n, f) => {
    const S = {...(DRAFT.single || {})};
    if (S[f]) delete S[f];
    else S[f] = 1;
    DRAFT.single = S;
    if (!Object.keys(S).length) delete DRAFT.single;
    saveDraft();
    render();
  },
  exclude: (n, f) => {
    DRAFT.exclude = DRAFT.exclude || {};
    DRAFT.exclude[f] = 'excluded';
    edit(n, k => {
      dropFeat(k, f);
      if (k.cover === f) delete k.cover;
      if (k.add) delete k.add[f];
    });
    toast('Excluded. Undo (Ctrl+Z) or the Excluded view brings it back.');
  },
  out: (n, f, v, to) =>
    edit(n, k => {
      k.out = k.out || {};
      if (to === 'back') delete k.out[f];
      else {
        k.out[f] = to;
        dropFeat(k, f);
        if (k.cover === f) delete k.cover;
        if (k.move) delete k.move[f];
        if (k.add) delete k.add[f];
      }
    }),
  hide: (n, f) =>
    edit(n, k => {
      if (k.add && k.add[f]) {
        // Removing a photo the auto-sort added also marks it rejected (as ✕ Reject: it stays with the candidates below,
        // off the Candidates queue), so the removal counts against the auto's Keep (autosort.js pierreOf; Codex review
        // #400: without it a wrong auto add removed this way was no decision at all). One Undo step for both.
        const a = aApplied(f);
        if (a && a.kind === 'a') DRAFT.seen = {...(DRAFT.seen || {}), [CK(f)]: 1};
        delete k.add[f];
        dropFeat(k, f);
        if (k.cover === f) delete k.cover;
        return;
      }
      k.hide = k.hide || [];
      if (k.hide.includes(f)) k.hide = k.hide.filter(x => x !== f);
      else {
        k.hide.push(f);
        dropFeat(k, f);
        if (k.cover === f) delete k.cover;
      }
    }),
  move: (n, f, v, to) =>
    edit(n, k => {
      const p = photos(n).find(x => x.f === f);
      if (p.cand) {
        k.add[f] = to;
        dropFeat(k, f);
        return;
      }
      k.move = k.move || {};
      if (to === p.base) delete k.move[f];
      else k.move[f] = to;
      dropFeat(k, f);
    }),
  // Drag and drop: photo f dropped in view `to`, at featured position `at` (null: not featured).
  // Covers moving between views, approving a candidate, featuring, reordering and unfeaturing in one step.
  drop: (n, f, to, at) =>
    edit(n, k => {
      if ((k.hide || []).includes(f)) k.hide = k.hide.filter(x => x !== f); // a removed photo dragged back from the candidates
      const p = [...photos(n), ...pending(n)].find(x => x.f === f),
        was = viewOf(n, p) === to && !pending(n).includes(p);
      const r = rowOf(n, to),
        cur = r.feat.map(x => x.f),
        inFeat = was && cur.includes(f),
        L = cur.filter(x => x !== f);
      if (p.cand || pending(n).includes(p)) {
        k.add = k.add || {};
        k.add[f] = to;
      } else if (!was) {
        k.move = k.move || {};
        if (to === p.base) delete k.move[f];
        else k.move[f] = to;
      }
      dropFeat(k, f);
      // Dropped after the last of 3 featured photos: it takes the last place (it used to fall off the end).
      if (at !== null) {
        L.splice(Math.min(at, L.length, FEAT - 1), 0, f);
        k.feat = k.feat || {};
        k.feat[to] = L.slice(0, FEAT);
      }
      // Dragged out of the first places: the next photo moves up, and the set is pinned so it can't come straight back.
      else if (inFeat) {
        const nx =
          r.rest.find(x => x.f !== f && !x.multi && !offSlot(x) && (x.imr || qOf(x.f) !== 1)) ||
          r.rest.find(x => x.f !== f && !x.multi && !offSlot(x));
        if (nx) L.push(nx.f);
        k.feat = k.feat || {};
        if (L.length) k.feat[to] = L;
        else delete k.feat[to];
      }
    })
};

/* ---------- Rendering ---------- */
const notThis = n =>
  `<select data-act="out" aria-label="Not this genus"><option value="">Not this</option><option value="cmp">Look-alike comparison</option><optgroup label="Another genus">${Object.keys(
    DATA.gen
  )
    .filter(m => m !== n)
    .map(m => `<option>${esc(m)}</option>`)
    .join('')}</optgroup></select>`;
const changed = () =>
  [...new Set([...Object.keys(DRAFT.genera), ...Object.keys(SAVED.genera)])].filter(n => !same(DRAFT.genera[n], SAVED.genera[n]));
const tile0 = (...a) => tile(...a);
function tile(n, p, v, st) {
  // The cover shown in the header (his pick, else the automatic one) is marked on its photo either way.
  const k = entry(n),
    isCover = (k.cover || SHOWN_COVER) === p.f,
    two = lv(n) === 2;
  // View buttons: the current view is pressed; one click on another moves the photo there.
  const moves = VIEWS.filter(([w]) => w === v || !(two && w === 'medium'))
    .map(([w]) => `<button type="button" data-act="move" data-to="${w}" aria-pressed="${w === v}">${label(n, w)}</button>`)
    .join('');
  return `<figure class="adm-tile ${st.cls || ''}${isCover ? ' is-cover' : ''}" data-f="${esc(p.f)}" data-v="${v}"${st.cls === 'is-hidden' ? '' : ` data-drag${st.num ? ` data-pos="${st.num - 1}"` : ''}`}>
    <button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img ${crSrc(p, 1)} alt="" loading="lazy" draggable="false"></button>${st.cls === 'is-hidden' ? XBTN : GRIP + XBTN}
    ${st.num ? `<span class="adm-num${st.sheet ? ' sheet' : ''}"${st.sheet ? ' title="Genus sheet"' : ''}>${st.num}</span>` : ''}
    ${isCover ? '<span class="adm-covermark">Cover</span>' : ''}
    <figcaption>${p.from ? `<span class="adm-src new" title="From ${esc(p.from)}">from ${esc(p.from)}</span>` : ''}${p.cand ? '<span class="adm-src new" title="Candidate you added">added</span>' : ''}${srcTag(p)}${p.multi || p.wasMulti ? `<button type="button" class="adm-src multi${p.wasMulti ? ' off' : ''}" data-act="multi" title="Several corals" aria-pressed="${!p.wasMulti}">${p.wasMulti ? 'one coral' : 'several corals'}</button>` : ''}<span class="adm-t">${esc(p.imr ? 'slide ' + p.slide : p.t || '')}</span></figcaption>
    <div class="adm-acts">${qSeg(p)}${fSeg(p)}
      ${
        st.cls === 'is-hidden'
          ? `<button type="button" data-act="hide" class="on">Show again</button>`
          : `
      <span class="adm-qseg adm-vseg" role="group" aria-label="View">${moves}</span>
      <button type="button" data-act="cover" class="${isCover ? 'on' : ''}" title="Cover">★ Cover</button>
      <button type="button" data-act="hide" title="Remove">Remove</button>
      ${p.src ? `<button type="button" data-act="crop" class="${crOf(p.f) ? 'on' : ''}" aria-pressed="${!!crOf(p.f)}">Crop</button>` : ''}
      ${p.from ? '' : notThis(n)}`
      }${st.extra || ''}
    </div></figure>`;
}
// Small × on each photo: exclude it for good (a person, a drawing, AI…).
const XBTN = '<button type="button" class="adm-x" data-act="exclude" title="Exclude" aria-label="Exclude for good">×</button>';
function status() {
  const ch = changed(),
    q = qChanged(),
    x = xChanged(),
    parts = [
      ch.length ? `${ch.length} ${ch.length > 1 ? 'genera' : 'genus'}` : '',
      q ? 'quality ratings' : '',
      fChanged() ? 'growth forms' : '',
      x ? 'exclusions' : '',
      bChanged() ? 'book photos switch' : '',
      flChanged() ? 'triage flags' : '',
      sgChanged() ? 'triage suggestions' : '',
      cdChanged() ? 'candidate reviews' : '',
      mtChanged() ? 'look-alike montages' : '',
      crChanged() ? 'crops' : '',
      snChanged() ? 'several corals' : '',
      tlChanged() ? 'tile photos' : '',
      auChanged() ? 'auto-sort' : ''
    ].filter(Boolean);
  const bs = $('booksw');
  if (bs) {
    bs.setAttribute('aria-pressed', String(bookOn(DRAFT)));
    bs.textContent = `CF book: ${bookOn(DRAFT) ? 'on' : 'off'}`;
  }
  const tn = Object.keys(DRAFT.flag || {}).length + sugCount() + repsOpen().length,
    xn = Object.keys(DRAFT.exclude || {}).length;
  OVER = overCap();
  const t = draftAt ? ` (saved ${dateText(draftAt, 'hm')})` : '';
  // Publish carries the status (no separate status text): "● Publish" with a draft, "Published" when clean.
  const sv = $('save');
  if (sv.textContent !== 'Publishing…') sv.textContent = !TOKEN ? 'Read-only' : parts.length ? '● Publish' : 'Published';
  sv.title = !TOKEN ? 'Read-only: changes are not kept' : parts.length ? `Draft${t}: ${parts.join(' + ')}` : 'Publish';
  $('undo').disabled = !HIST.length;
  $('redo').disabled = !FUT.length;
  $('save').disabled = !TOKEN || !parts.length;
  if (cur[0] !== '~') lastGenus = cur;
  navs(tn, xn);
  fitModes();
}
// The header tabs must never be cut off: when they don't all fit on the line, the entry-point menu replaces them.
function fitModes() {
  const nav = $('modes');
  if (!nav || nav.hidden) return;
  document.body.classList.remove('adm-narrow');
  if (nav.scrollWidth > nav.clientWidth + 1) document.body.classList.add('adm-narrow');
}
addEventListener('resize', () => fitModes());
// Nine tabs in three header groups (Pierre, 2026-11-03, mockup "Admin tabs: 17 -> 9", after "regroup the admin menus"
// of 2026-11-01): To do (To do, Coverage), Photos (Genera, Candidates, Photo review, Look-alikes, Photo stats), Players
// (Players, Activity). Nothing was removed: every former page is a view of a tab, chosen with the segmented switch at
// the right of the tab row (#subnav, navs()). Each view keeps its old address, so bookmarks and links in the docs still
// land right; ALIAS maps the two addresses that are not a view of their own. Each header group reopens the tab and view
// used last in it (reefid-admin-sub), each tab its view used last (reefid-admin-view). Phones: one menu with every tab.
// [group key, group name, [[tab key, tab name, [[address, view name], ...]], ...]]; '' = a genus page.
const genusHash = () => '#' + encodeURIComponent(lastGenus || Object.keys(DATA.gen)[0]);
const GROUPS = [
  [
    'todo',
    'To do',
    [
      [
        'todo',
        'To do',
        [
          ['~todo', 'All'],
          ['~triage', 'Reports'],
          ['~events', 'Errors'],
          ['~health', 'Health']
        ]
      ],
      [
        'cov',
        'Coverage',
        [
          ['~cov', 'Games'],
          ['~fcov', 'Sheets & Finder']
        ]
      ]
    ]
  ],
  [
    'photos',
    'Photos',
    [
      [
        'genera',
        'Genera',
        [
          ['', 'Live'],
          ['~hidden', 'Hidden'],
          ['~excluded', 'Excluded']
        ]
      ],
      ['cand', 'Candidates', [['~cand', 'Candidates']]],
      [
        'review',
        'Photo review',
        [
          ['~quality', 'Quality'],
          ['~form', 'Growth form'],
          ['~diff', 'By difficulty']
        ]
      ],
      ['look', 'Look-alikes', [['~look', 'Look-alikes']]],
      [
        'pstats',
        'Photo stats',
        [
          ['~pstats', 'Overview'],
          ['~stats-photos', 'Difficulty']
        ]
      ]
    ]
  ],
  [
    'players',
    'Players',
    [
      ['players', 'Players', [['~users', 'Players']]],
      [
        'activity',
        'Activity',
        [
          ['~stats', 'Activity'],
          ['~stats-conf', 'Confusions']
        ]
      ]
    ]
  ]
];
// Every tab as [key, name, views, group key].
const TABS = GROUPS.flatMap(([g, , L]) => L.map(t => [...t, g]));
// Old addresses that are not a view of their own: Montages became Look-alikes; Where to look is the banner above the Games
// grid of Coverage, opened in full.
const ALIAS = {'~mont': '~look', '~stats-needs': '~cov'};
const pageOf = () => (cur.startsWith('~journey/') || cur.startsWith('~anon/') ? '~users' : ALIAS[cur] || (cur[0] === '~' ? cur : '')); // '' = a genus page; a player's journey sits under Players
const tabOf = (h = pageOf()) => TABS.find(t => t[2].some(([x]) => x === h)) || TABS.find(t => t[0] === 'genera');
const groupKey = () => tabOf()[3];
// Genus x view cells over their cap (capOf: CELL_MAX colonies for a game genus, CAP.sheet for a Finder-only one; after
// "Add anyway"): a warning on the To do tab and on the page that shows the cell (Pierre, 2026-11-02: "at least a
// warning"): Game coverage for a game genus, Sheet & Finder coverage for a Finder-only one. n = both.
let OVER = {'~cov': 0, '~fcov': 0, n: 0};
const overCap = () => {
  const o = {'~cov': 0, '~fcov': 0};
  Object.keys(DATA.gen).forEach(n => (o[isGame(n) ? '~cov' : '~fcov'] += capViews(n).filter(([v]) => covOf(n, v).obs > capOf(n)).length));
  return {...o, n: o['~cov'] + o['~fcov']};
};
function navs(tn, xn) {
  const T = tabOf(),
    g = T[3],
    page = pageOf(),
    last = store.get('reefid-admin-sub', {}) || {},
    seen = store.get('reefid-admin-view', {}) || {};
  if (last[g] !== page) {
    last[g] = page;
    store.set('reefid-admin-sub', last);
  }
  if (seen[T[0]] !== page) {
    seen[T[0]] = page;
    store.set('reefid-admin-view', seen);
  }
  const hn = Object.values(DRAFT.genera || {}).reduce((s, k) => s + (k.hide || []).length, 0),
    href = h => (h ? '#' + h : genusHash()),
    has = (t, h) => t[2].some(([x]) => x === h),
    // A tab opens on its view used last; a header group on its tab used last.
    tabHash = t => (has(t, seen[t[0]]) ? seen[t[0]] : t[2][0][0]),
    groupHash = G => (TABS.some(t => t[3] === G[0] && has(t, last[G[0]])) ? last[G[0]] : tabHash(TABS.find(t => t[3] === G[0]))),
    over = `${OVER.n} genus × view cell${OVER.n === 1 ? '' : 's'} over the cap (${CELL_MAX} colonies, Coverage › Games; ${CAP.sheet} for a Finder-only genus, Coverage › Sheets & Finder)`,
    // Counts: on a view in its switch, on a tab in the tab row and the phone menu.
    vcnt = h =>
      (h === '~todo' || h === '~triage') && tn
        ? ` ${tn}`
        : h === '~excluded' && xn
          ? ` ${xn}`
          : h === '~hidden' && hn
            ? ` ${hn}`
            : OVER[h]
              ? ` ⚠ ${OVER[h]}`
              : '',
    tcnt = t => (t[0] === 'todo' && tn ? ` (${tn})` : t[0] === 'cov' && OVER.n ? ' ⚠' : '');
  $('modes').hidden = false;
  document.querySelectorAll('#modes [data-mode]').forEach(a => {
    const G = GROUPS.find(x => x[0] === a.dataset.mode);
    a.href = href(groupHash(G));
    a.textContent = G[1] + (G[0] === 'todo' && tn ? ` (${tn})` : '') + (G[0] === 'todo' && OVER.n ? ' ⚠' : '');
    if (G[0] === 'todo') a.title = OVER.n ? over : '';
    a.setAttribute('aria-current', String(G[0] === g));
  });
  const sub = $('subnav');
  if (sub) {
    const V = T[2].length > 1 ? T[2] : [];
    sub.innerHTML =
      `<span class="adm-subtabs">${TABS.filter(t => t[3] === g)
        .map(
          t =>
            `<a class="adm-fchip plain" href="${esc(href(tabHash(t)))}" aria-pressed="${t === T}"${t[0] === 'cov' && OVER.n ? ` title="${esc(over)}"` : ''}>${t[1]}${tcnt(t)}</a>`
        )
        .join('')}</span>` +
      (V.length
        ? `<span class="adm-qseg adm-lvseg adm-views" role="group" aria-label="${esc(T[1])} view">${V.map(
            ([h, t]) => `<a href="${esc(href(h))}" data-view="${esc(h)}" aria-pressed="${h === page}">${t}${vcnt(h)}</a>`
          ).join('')}</span>`
        : '');
    sub.classList.toggle('has-views', !!V.length);
    sub.hidden = false;
  }
  const ms = $('modesel');
  if (ms) {
    ms.innerHTML = GROUPS.map(
      ([k, t]) =>
        `<optgroup label="${t}">${TABS.filter(x => x[3] === k)
          .map(x => `<option value="${esc(href(x === T ? page : tabHash(x)))}"${x === T ? ' selected' : ''}>${x[1]}${tcnt(x)}</option>`)
          .join('')}</optgroup>`
    ).join('');
    ms.hidden = false;
  }
}
// Which kind of page this is (help text, the Stats-style views): not the header tab, see groupKey().
const modeKey = () =>
  cur.startsWith('~journey/') || cur.startsWith('~anon/')
    ? 'journey'
    : cur.startsWith('~stats') || cur === '~diff'
      ? 'stats'
      : {
          '~users': 'users',
          '~quality': 'quality',
          '~form': 'form',
          '~excluded': 'excluded',
          '~hidden': 'hidden',
          '~todo': 'todo',
          '~triage': 'triage',
          '~events': 'events',
          '~health': 'health',
          '~cov': 'cov',
          '~fcov': 'fcov',
          '~look': 'mont',
          '~mont': 'mont',
          '~cand': 'cand'
        }[cur] || 'genus';
function render() {
  memoFresh();
  document.body.classList.toggle('adm-cmode', cur === '~cand');
  if (cur === '~quality') return renderQuality();
  if (cur === '~form') return renderForm();
  if (cur === '~excluded') return renderExcluded();
  if (cur === '~hidden') return renderHidden();
  if (cur === '~todo' || cur === '~triage') return renderTriage();
  if (cur === '~events') return renderEvents();
  if (cur === '~health') return renderStats();
  // Game coverage with the Where to look banner above it (folded on ~cov, open in full on ~stats-needs).
  if (cur === '~cov' || cur === '~stats-needs') return renderCov();
  if (cur === '~fcov') return renderFcov();
  if (cur === '~users') return renderUsers(); // its own tab: managing players, not only stats (Pierre, 2026-11-01)
  if (cur.startsWith('~journey/')) return renderJourney(cur.slice(9)); // one player's path (admin-journey.js)
  // A device that never signed in, by anonymous id (its own route: a player's name may start with any character).
  if (cur.startsWith('~anon/')) return renderJourney('', cur.slice(6));
  if (cur === '~diff') return renderDiff();
  if (cur === '~pstats') return renderPstats();
  if (modeKey() === 'stats') return renderStats();
  if (cur === '~look' || cur === '~mont') return renderMont(); // ~mont = old address, kept for bookmarks
  if (cur === '~cand') return renderCand();
  const names = Object.keys(DATA.gen);
  if (!DATA.gen[cur]) cur = names[0];
  const ch = changed(),
    n = cur,
    g = DATA.gen[n],
    cv = coverOf(n),
    k = entry(n);
  SHOWN_COVER = cv && cv.f;
  status();
  $('preview').href = `./?draft#g-${encodeURIComponent(n)}`;
  const side = names
    .map(m => {
      const c = coverOf(m),
        e = DRAFT.genera[m] || {},
        dirty = ch.includes(m),
        h = (e.hide || []).length;
      return `<a href="#${esc(m)}" class="adm-g${m === n ? ' cur' : ''}"${m === n ? ' aria-current="true"' : ''}>${c ? `<img src="${img(c, 1)}" alt="" loading="lazy">` : '<span class="none"></span>'}<span><i>${esc(m)}</i>
      <small>${DATA.gen[m].n ? 'No. ' + DATA.gen[m].n : DATA.gen[m].x ? 'not IMR' : '★'}${c && c.view === 'macro' && lv(m) !== 2 ? ' · <b class="warnc" title="Cover is a close-up">macro cover</b>' : ''}${pending(m).length ? ` · ${pending(m).length} waiting` : ''}${missing(m).length ? ' · <b class="warnc" title="Missing photos">⚠ check</b>' : ''}</small></span><span class="dots">${e.ok ? (needs(m).length ? '<b class="dot warn" title="Validated, incomplete">!</b>' : '<b class="dot done" title="Validated">✓</b>') : ''}${dirty ? '<b class="dot" title="Draft not published yet">●</b>' : ''}</span></a>`;
    })
    .join('');
  const body = rows(n)
    .map(([v]) => {
      const r = rowOf(n, v),
        out = [...r.feat, ...r.rest].filter(p => !shown(p)).length;
      return `<section class="adm-row"><h3>${label(n, v)} <small>${r.feat.length + r.rest.length} photo${r.feat.length + r.rest.length === 1 ? '' : 's'}${out ? ` · <b>${out} filtered out</b>` : ''}</small></h3>
      <div class="adm-grid" data-drop="${v}">${r.feat.map((p, i) => (shown(p) ? tile(n, p, v, {num: i + 1, auto: !r.pinned.includes(p.f), last: i === r.feat.length - 1, cls: 'is-feat'}) : '')).join('')}${(sh =>
        r.rest
          .filter(shown)
          .map(p => tile(n, p, v, sh.includes(p) ? {num: FEAT + 1 + sh.indexOf(p), sheet: true} : {}))
          .join(''))(r.rest.filter(p => !p.multi && !p.extra).slice(0, SHEET - r.feat.length))}</div>
      ${r.feat.length + r.rest.length ? '' : '<p class="note">No photo in this view.</p>'}</section>`;
    })
    .join('');
  const P = unused(n),
    Ps = P.filter(shown),
    two = lv(n) === 2;
  const candTile =
    p => `<figure class="adm-tile is-cand" data-f="${esc(p.f)}" data-drag><button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img ${crSrc(p, 1)} alt="" loading="lazy" draggable="false"></button>${GRIP}${XBTN}
    <figcaption>${srcTag(p)}${rejected(p.f) ? '<span class="adm-src rej" title="Rejected">rejected</span>' : ''}<span class="adm-t">${esc(p.t || '')}</span></figcaption>
    <div class="adm-acts">${qSeg(p)}${fSeg(p)}<span class="adm-qseg adm-vseg" role="group" aria-label="View">${VIEWS.filter(
      ([w]) => !(two && w === 'medium')
    )
      .map(([w]) => `<button type="button" data-act="addc" data-to="${w}" title="Add to ${label(n, w)}">${label(n, w)}</button>`)
      .join('')}</span>${p.from ? '' : notThis(n)}</div></figure>`;
  // Candidates: set apart from the views and folded by default (Pierre); open or closed is remembered.
  const candRow = P.length
    ? `<details class="adm-row adm-cands"${store.get('reefid-admin-cands', false) ? ' open' : ''}><summary><h3>Candidates <small>${P.length} photo${P.length > 1 ? 's' : ''} not on the site${P.length - Ps.length ? ` · <b>${P.length - Ps.length} filtered out</b>` : ''}</small></h3></summary>
    <div class="adm-grid">${Ps.map(candTile).join('')}</div></details>`
    : '';
  const O = outOf(n),
    outRow = O.length
      ? `<section class="adm-row adm-out"><h3>Not this genus <small>${O.length} photo${O.length > 1 ? 's' : ''} taken out of <i>${esc(n)}</i></small></h3>
    <div class="adm-grid">${O.map(
      p => `<figure class="adm-tile is-hidden" data-f="${esc(p.f)}"><button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy"></button>
      <figcaption>${srcTag(p)}<span class="adm-t">${outs(n)[p.f] === 'cmp' ? 'look-alike comparison' : '→ ' + esc(outs(n)[p.f])}</span></figcaption>
      <div class="adm-acts"><button type="button" data-act="out" data-to="back">Put back</button></div></figure>`
    ).join('')}</div></section>`
      : '';
  const cnt = o => [...photos(n), ...P].filter(p => origin(p) === o).length;
  const filter = `<div class="adm-filter adm-sticky">${cv ? `<button type="button" class="adm-sthumb${cv.view === 'macro' && lv(n) !== 2 ? ' warnc' : ''}" data-f="${esc(cv.f)}" data-act="zoomcover" title="Cover"><img src="${img(cv, 1)}" alt="${esc(n)} cover"></button>` : ''}<b class="adm-sname"><i>${esc(n)}</i></b><select class="adm-gsel2" aria-label="Genus">${names.map(m => `<option${m === n ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select><a class="adm-sheet" href="./?draft#g-${encodeURIComponent(n)}" target="_blank" rel="noopener" title="Genus sheet" aria-label="Open the sheet">↗</a><span class="adm-qseg adm-lvseg" role="group" aria-label="Zooms" title="Zooms">${[3, 2].map(x => `<button type="button" data-lv="${x}" aria-pressed="${lv(n) === x}">${x} zooms</button>`).join('')}</span>${(nd => `<button type="button" class="adm-okbtn" data-ok aria-pressed="${!!k.ok}" title="Validated">✓ Validated</button>${nd.length ? `<b class="warnc adm-needs">${nd.map(esc).join(' · ')}</b>` : ''}${poorIn(n).length ? `<b class="adm-needs adm-warn">${poorIn(n).map(esc).join(' · ')}</b>` : ''}`)(needs(n))}<span class="adm-shows" role="group" aria-label="Show photos from">${ORIGINS.map(([o, t]) => `<button type="button" class="adm-fchip o-${o}" data-o="${o}" aria-pressed="${SHOW.has(o)}" title="${t}">${SHORT_O[o]} <b>${cnt(o)}</b></button>`).join('')}${SHOW.size < ORIGINS.length ? '<button type="button" class="adm-link" data-o="all">All</button>' : ''}</span></div>`;
  $v.innerHTML = `<div class="adm">
    <nav class="adm-side" aria-label="Genera"><select id="gsel" aria-label="Genus">${names.map(m => `<option${m === n ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select><div class="adm-list">${side}</div></nav>
    <section class="adm-main">
      ${
        missing(n).length
          ? `<p class="warn"><b>${missing(n).length} choice${missing(n).length === 1 ? '' : 's'} name a photo that is no longer in the data</b>: ${missing(
              n
            )
              .map(f => `<code>${esc(f)}</code>`)
              .join(
                ', '
              )}. Kept but no longer applied. <button type="button" class="adm-link" data-forget>Forget them</button> (Undo brings them back), or ask Pierre.</p>`
          : ''
      }
      ${filter}${body}${candRow}${outRow}
    </section></div>`;
  $v.querySelectorAll('[data-o]').forEach(
    b =>
      (b.onclick = () => {
        const o = b.dataset.o;
        if (o === 'all') SHOW = new Set(ORIGINS.map(x => x[0]));
        else SHOW.has(o) ? SHOW.delete(o) : SHOW.add(o);
        store.set('reefid-admin-origins', [...SHOW]);
        render();
      })
  );
  const okb = $v.querySelector('[data-ok]');
  if (okb)
    okb.onclick = () => {
      const nd = needs(n);
      if (!k.ok && nd.length) {
        toast('Not ready: ' + nd.join(' · '));
        return;
      }
      edit(n, k => {
        if (k.ok) delete k.ok;
        else k.ok = true;
      });
    };
  // Forget choices naming photos no longer in the data: one click, one Undo step, only on this genus (never automatic).
  const fg = $v.querySelector('[data-forget]');
  if (fg)
    fg.onclick = () => {
      const gone = new Set(missing(n));
      edit(n, k => {
        if (gone.has(k.cover)) delete k.cover;
        if (k.feat)
          Object.keys(k.feat).forEach(v => {
            k.feat[v] = k.feat[v].filter(f => !gone.has(f));
            if (!k.feat[v].length) delete k.feat[v];
          });
        if (k.hide) {
          k.hide = k.hide.filter(f => !gone.has(f));
          if (!k.hide.length) delete k.hide;
        }
        ['move', 'add', 'out'].forEach(m => {
          if (k[m]) {
            gone.forEach(f => delete k[m][f]);
            if (!Object.keys(k[m]).length) delete k[m];
          }
        });
      });
    };
  $v.querySelectorAll('[data-lv]').forEach(
    b =>
      (b.onclick = () => {
        const x = Number(b.dataset.lv);
        edit(n, k => {
          if (x === (DATA.gen[n].levels === 2 ? 2 : 3)) delete k.lv;
          else k.lv = x;
        });
      })
  );
  $('gsel').onchange = e => {
    location.hash = e.target.value;
  };
  const g2 = $v.querySelector('.adm-gsel2');
  if (g2)
    g2.onchange = e => {
      location.hash = e.target.value;
    };
  const cd = $v.querySelector('.adm-cands');
  if (cd) cd.ontoggle = () => store.set('reefid-admin-cands', cd.open);
  bindTiles($v, () => n);
  const c = $v.querySelector('.adm-g.cur');
  if (c) c.scrollIntoView({block: 'nearest'});
  bindQ();
  bindF($v);
  bindDrag(n);
}
// Actions of the genus photo tiles (genus page, and flagged photos in Triage): g(tile) gives the tile's genus.
function bindTiles(scope, g) {
  scope.querySelectorAll('[data-act]').forEach(el => {
    const t = el.closest('[data-f]'),
      f = t && t.dataset.f,
      v = t && t.dataset.v,
      a = el.dataset.act,
      n = t && g(t);
    if (!t || !DATA.gen[n] || (!ACT[a] && !['exclude', 'out', 'addc', 'move', 'zoom', 'zoomcover', 'crop'].includes(a))) return;
    if (a === 'exclude')
      el.onclick = e => {
        e.stopPropagation();
        ACT.exclude(n, f);
      };
    else if (a === 'crop')
      el.onclick = () => {
        const p = [...photos(n), ...pending(n)].find(x => x.f === f);
        if (p) cropEditor(p);
      };
    else if (a === 'out') {
      if (el.tagName === 'SELECT') el.onchange = () => el.value && ACT.out(n, f, v, el.value);
      else el.onclick = () => ACT.out(n, f, v, 'back');
    } else if (a === 'addc') el.onclick = () => ACT.addc(n, f, null, el.dataset.to);
    else if (a === 'move') el.onclick = () => el.dataset.to !== v && ACT.move(n, f, v, el.dataset.to);
    else if (a === 'zoom' || a === 'zoomcover') el.onclick = () => zoom(n, f);
    else el.onclick = () => ACT[a](n, f, v);
  });
}
// Drag a photo onto a featured photo (left or right half: before or after it) to feature it at that place,
// onto any other photo or the empty part of a view to put it there unfeatured. Works across views and from the candidates.
function bindDrag(n) {
  const clear = () =>
    $v.querySelectorAll('.drop-before,.drop-after,.drop-row').forEach(e => e.classList.remove('drop-before', 'drop-after', 'drop-row'));
  // Where a drop at the pointer lands: target view and featured position (null: not featured).
  const target = (el, x) => {
    const grid = el && el.closest('[data-drop]');
    if (!grid) return null;
    const t = el.closest('.adm-tile[data-pos]'),
      r = t && t.getBoundingClientRect(),
      after = t && x > r.left + r.width / 2;
    const last = grid.querySelectorAll('.adm-tile[data-pos]').length;
    // Just after the last featured photo also features (while there is room).
    const firstRest = !t && el.closest('.adm-tile:not([data-pos])'),
      fr =
        firstRest &&
        firstRest === grid.querySelector('.adm-tile:not([data-pos])') &&
        last < FEAT &&
        x < firstRest.getBoundingClientRect().left + firstRest.getBoundingClientRect().width / 2;
    return {grid, tile: t || (fr ? firstRest : null), after, at: t ? Number(t.dataset.pos) + (after ? 1 : 0) : fr ? last : null};
  };
  pointerDrag(
    $v.querySelectorAll('.adm-tile[data-drag]'),
    (el, x) => {
      clear();
      const d = target(el, x);
      if (!d) return;
      if (d.at !== null) d.tile.classList.add(d.after ? 'drop-after' : 'drop-before');
      else d.grid.classList.add('drop-row');
    },
    (t, el, x) => {
      clear();
      const d = target(el, x);
      if (d) ACT.drop(n, t.dataset.f, d.grid.dataset.drop, d.at);
    },
    clear
  );
}
// Pointer-based drag and drop, so it works the same with a mouse, a pen or a finger in every browser.
// With a mouse the whole photo drags (a click without moving still enlarges it); on touch screens the ⠿ handle
// drags, so swiping the photos still scrolls the page. The page scrolls when dragging near the top or bottom.
const GRIP = '<span class="adm-grip" title="Drag" aria-hidden="true">⠿</span>';
function pointerDrag(tiles, hover, drop, cancel) {
  tiles.forEach(t => {
    const ph = t.querySelector('.adm-ph'),
      grip = t.querySelector('.adm-grip');
    ph.addEventListener(
      'click',
      e => {
        if (t.dataset.dragged) {
          delete t.dataset.dragged;
          e.stopImmediatePropagation();
          e.preventDefault();
        }
      },
      true
    );
    const start = e => {
      if (e.button || (e.currentTarget === ph && e.pointerType === 'touch')) return;
      const x0 = e.clientX,
        y0 = e.clientY;
      let ghost = null,
        last = e,
        raf = 0;
      const at = ev => document.elementFromPoint(ev.clientX, ev.clientY);
      const edge = () => {
        const dy = last.clientY < 70 ? -14 : last.clientY > innerHeight - 70 ? 14 : 0;
        if (dy) {
          scrollBy(0, dy);
          hover(at(last), last.clientX);
        }
        raf = ghost ? requestAnimationFrame(edge) : 0;
      };
      const move = ev => {
        last = ev;
        if (!ghost) {
          if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
          ghost = ph.querySelector('img').cloneNode();
          ghost.className = 'adm-ghost';
          document.body.append(ghost);
          t.classList.add('dragging');
          document.body.classList.add('adm-dragging');
          raf = requestAnimationFrame(edge);
        }
        ev.preventDefault();
        ghost.style.transform = `translate(${ev.clientX - 70}px, ${ev.clientY - 52}px)`;
        hover(at(ev), ev.clientX);
      };
      const end = ev => {
        removeEventListener('pointermove', move);
        removeEventListener('pointerup', end);
        removeEventListener('pointercancel', end);
        if (!ghost) return;
        cancelAnimationFrame(raf);
        ghost.remove();
        ghost = null;
        t.classList.remove('dragging');
        document.body.classList.remove('adm-dragging');
        t.dataset.dragged = 1;
        setTimeout(() => {
          delete t.dataset.dragged;
        }, 0);
        if (ev.type === 'pointerup') drop(t, at(ev), ev.clientX);
        else cancel();
      };
      addEventListener('pointermove', move, {passive: false});
      addEventListener('pointerup', end);
      addEventListener('pointercancel', end);
    };
    ph.onpointerdown = start;
    if (grip)
      grip.onpointerdown = e => {
        e.preventDefault();
        start(e);
      };
  });
}
// The enlarged photo's caption (zoom, zoomOne: every admin view): genus (opens its sheet, draft applied), what the photo
// is, the iNat taxon, its credit and its source, as in the games (app.js photoSrc / credit, AGENTS.md rule 11). An iNat
// photo links to its observation (Pierre, 2026-11-03: he opened his own photo that everyone misses, to check on iNaturalist
// who identified it, and the caption had no link); IMR lecture and Coral Finder book photos have no public page: their
// credit line only.
const inatObs = p => /^https:\/\/(www\.)?inaturalist\.org\/observations\//.test(p.o || '');
const lbCap = (n, p, what) =>
  `${DATA.gen[n] ? `<a href="./?draft#g-${encodeURIComponent(n)}" target="_blank" rel="noopener" title="Genus sheet"><i>${esc(n)}</i></a>` : `<i>${esc(n || '')}</i>`}${what ? ` · ${esc(what)}` : ''} · ${
    p.cf
      ? `© R. Kelley / BYOGUIDES, Coral Finder 2022, p. ${esc(p.pg)}`
      : p.imr
        ? `IMR Lecture 6, slide ${esc(p.slide)}`
        : `${inatObs(p) && p.t ? `<i>${esc(p.t)}</i> · ` : ''}${esc(p.a || '')}`
  }${inatObs(p) ? ` · <a class="lb-src" href="${esc(p.o)}" target="_blank" rel="noopener" title="Open the iNaturalist observation">iNat observation ↗</a>` : ''} · <code>${esc(p.f)}</code>`;
function zoom(n, f) {
  const lb = $('lightbox'),
    L = [...photos(n), ...pending(n).map(p => ({...p, base: 'cand'})), ...outOf(n).map(p => ({...p, base: 'out'}))],
    i0 = L.findIndex(p => p.f === f);
  let i = i0;
  const show = () => {
    const p = L[i];
    lb.innerHTML = `<div class="lb-in"><img ${crSrc(p)} alt=""><p class="lb-cap">${lbCap(n, p, p.base === 'cand' ? 'Candidate' : p.base === 'out' ? 'Not this genus' : label(n, viewOf(n, p)))}</p>
    <div class="lb-nav"><button type="button" data-d="-1" aria-label="Previous">‹</button><span>${i + 1} / ${L.length}</span><button type="button" data-d="1" aria-label="Next">›</button><button type="button" data-x>Close</button></div></div>`;
    lb.querySelectorAll('[data-d]').forEach(
      b =>
        (b.onclick = e => {
          e.stopPropagation();
          i = (i + Number(b.dataset.d) + L.length) % L.length;
          show();
        })
    );
    lb.querySelector('[data-x]').onclick = close;
    lb.classList.remove('full');
    lbFull(lb);
  };
  const key = e => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      i = (i + (e.key === 'ArrowRight' ? 1 : -1) + L.length) % L.length;
      show();
    }
  };
  const close = () => {
    lb.hidden = true;
    lb.classList.remove('full');
    lb.innerHTML = '';
    document.removeEventListener('keydown', key);
  };
  lb.hidden = false;
  lb.onclick = e => {
    if (e.target === lb) close();
  };
  document.addEventListener('keydown', key);
  show();
}
let toastT;
function toast(msg) {
  let t = document.querySelector('.adm-toast');
  if (!t) {
    t = document.createElement('p');
    t.className = 'adm-toast';
    t.setAttribute('role', 'status');
    document.body.append(t);
  }
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => {
    t.hidden = true;
  }, 3500);
}

/* ---------- Choices that point to a photo no longer in data.json ---------- */
// Nothing automatic ever edits curation.json. If a data rebuild renames or drops a photo, the choices that name it
// stop applying on the site: they are kept, and listed here so nothing is lost silently.
function missing(n) {
  const k = entry(n);
  const refs = [
    k.cover,
    ...Object.values(k.feat || {}).flat(),
    ...(k.hide || []),
    ...Object.keys(k.move || {}),
    ...Object.keys(k.add || {}),
    ...Object.keys(k.out || {})
  ].filter(Boolean);
  // An excluded photo is gone on purpose: a choice still naming it is not broken (admin review, 2026-11-01).
  return [...new Set(refs.filter(f => !KNOWN.has(f) && !(DRAFT.exclude || {})[f]))];
}

/* ---------- Quality ---------- */
function bindQ() {
  $v.querySelectorAll('.adm-qseg [data-q]').forEach(
    b =>
      (b.onclick = e => {
        e.stopPropagation();
        const t = b.closest('[data-f]');
        rateTile(t, Number(b.dataset.q));
      })
  );
}
// Rating updates the tile in place (it stays where it is until the next filter change), so rating many is fast.
function rateTile(t, q) {
  const f = t.dataset.f;
  setQ(f, q);
  t.querySelectorAll('.adm-qseg [data-q]').forEach(x => x.setAttribute('aria-pressed', String(Number(x.dataset.q) === q)));
  const tag = t.querySelector('.adm-q');
  if (tag) tag.outerHTML = qTag({f});
  t.dataset.q = q;
  t.classList.add('rated');
  status();
}
// Every photo of every genus (approved, hidden, given to another genus and candidates), with genus and view.
function allPhotos() {
  const L = [];
  Object.keys(DATA.gen).forEach(n => {
    photos(n).forEach(p => L.push({...p, genus: n, view: viewOf(n, p), hid: hidden(n, p)}));
    pending(n).forEach(p => L.push({...p, genus: n, view: 'cand'}));
  });
  return L;
}
const QF = Object.assign({view: 'all', genus: '', todo: false}, store.get('reefid-admin-qfilter', {}));
function renderQuality() {
  status();
  const names = Object.keys(DATA.gen),
    vl = v => (v === 'cand' ? 'Candidate' : VIEWS.find(x => x[0] === v)[1]);
  const all = allPhotos().filter(
    p => shown(p) && (QF.view === 'all' || p.view === QF.view) && (!QF.genus || p.genus === QF.genus) && (!QF.todo || !qSet(p.f))
  );
  const card =
    p => `<figure class="adm-tile adm-qt${p.hid ? ' is-hidden' : ''}" data-f="${esc(p.f)}" data-g="${esc(p.genus)}" data-q="${qOf(p.f)}" data-drag tabindex="0">
    <button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img ${crSrc(p, 1)} alt="" loading="lazy" draggable="false"></button>${GRIP}${XBTN}
    <figcaption><a class="adm-gen" href="#${esc(p.genus)}" title="Open the genus"><i>${esc(p.genus)}</i></a><span class="adm-src view">${vl(p.view)}</span>${srcTag(p)}${p.hid ? '<span class="adm-src multi">hidden</span>' : ''}${p.multi ? '<span class="adm-src multi" title="Several corals in frame">several</span>' : ''}${qTag(p)}</figcaption>
    <div class="adm-acts">${qSeg(p)}</div></figure>`;
  const sec = ([q, t]) => {
    const L = all.filter(p => qOf(p.f) === q);
    return `<section class="adm-row adm-qrow"><h3><span class="adm-q q${q}">${t}</span> <small>${L.length} photo${L.length === 1 ? '' : 's'}${q === 3 ? ' · for covers and featured photos' : q === 1 ? ' · for a realistic mode' : ''}</small></h3>
      <div class="adm-grid adm-qgrid" data-qdrop="${q}">${L.map(card).join('')}</div></section>`;
  };
  const opt = (v, t, cur) => `<button type="button" class="adm-fchip plain" data-qv="${v}" aria-pressed="${cur === v}">${t}</button>`;
  $v.innerHTML = `<section class="adm-quality">
    <div class="adm-qhead"><h2>Photo quality</h2></div>
    <div class="adm-filter"><span class="label">Show</span>${ORIGINS.map(([o, t]) => `<button type="button" class="adm-fchip o-${o}" data-o="${o}" aria-pressed="${SHOW.has(o)}">${t}</button>`).join('')}</div>
    <div class="adm-filter"><span class="label">View</span>${opt('all', 'All', QF.view)}${VIEWS.map(([v, t]) => opt(v, t, QF.view)).join('')}${opt('cand', 'Candidates', QF.view)}
      <select id="qgen" aria-label="Genus"><option value="">All genera</option>${names.map(m => `<option${m === QF.genus ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select>
      <label class="adm-todo"><input type="checkbox" id="qtodo"${QF.todo ? ' checked' : ''}> Not checked yet</label></div>
    ${QUAL.map(sec).join('')}</section>`;
  const saveQF = () => {
    store.set('reefid-admin-qfilter', QF);
    renderQuality();
  };
  $v.querySelectorAll('[data-o]').forEach(
    b =>
      (b.onclick = () => {
        const o = b.dataset.o;
        SHOW.has(o) ? SHOW.delete(o) : SHOW.add(o);
        store.set('reefid-admin-origins', [...SHOW]);
        renderQuality();
      })
  );
  $v.querySelectorAll('[data-qv]').forEach(
    b =>
      (b.onclick = () => {
        QF.view = b.dataset.qv;
        saveQF();
      })
  );
  $('qgen').onchange = e => {
    QF.genus = e.target.value;
    saveQF();
  };
  $('qtodo').onchange = e => {
    QF.todo = e.target.checked;
    saveQF();
  };
  $v.querySelectorAll('[data-act="zoom"]').forEach(
    b =>
      (b.onclick = () => {
        const t = b.closest('[data-f]');
        zoom(t.dataset.g, t.dataset.f);
      })
  );
  $v.querySelectorAll('[data-act="exclude"]').forEach(
    b =>
      (b.onclick = e => {
        e.stopPropagation();
        const t = b.closest('[data-f]');
        ACT.exclude(t.dataset.g, t.dataset.f);
      })
  );
  bindQ();
  // Hover (or focus) a photo and press 1, 2 or 3.
  let over = null;
  $v.querySelectorAll('.adm-qt').forEach(t => {
    t.onmouseenter = t.onfocus = () => {
      over = t;
    };
    t.onmouseleave = () => {
      if (over === t) over = null;
    };
  });
  document.onkeydown = e => {
    if (cur !== '~quality' || !over || e.target.closest('input,select,textarea')) return;
    const q = {'1': 1, '2': 2, '3': 3}[e.key];
    if (q) {
      e.preventDefault();
      rateTile(over, q);
    }
  };
  // Drag a photo onto another level.
  const clearQ = () => $v.querySelectorAll('.drop-row').forEach(x => x.classList.remove('drop-row'));
  pointerDrag(
    $v.querySelectorAll('.adm-qt'),
    el => {
      clearQ();
      const g = el && el.closest('[data-qdrop]');
      if (g) g.classList.add('drop-row');
    },
    (t, el) => {
      clearQ();
      const g = el && el.closest('[data-qdrop]');
      if (g) {
        rateTile(t, Number(g.dataset.qdrop));
        g.prepend(t);
      }
    },
    clearQ
  );
}

// Thresholds of the Health page (statsHealth), here because its help text quotes them.
const HEALTH = {
  GAP: 30, // minutes between two answers that start a new session
  EARLY: 10, // a session of at most this many answers ended early
  PH_MIN: 5, // answers before a photo is judged
  PH_LOW: 0.4, // right rate under which a photo is one everyone misses
  PH_FAR: 1, // difficulty this far above its genus median (1 = clearly harder)
  G_MIN: 10, // answers on a genus before a player counts as stuck on it
  G_LOW: 0.5, // right rate over a player's last G_MIN answers on a genus under which they are stuck
  DAYS: 30
};
// Sessions, one definition for Health, a player's Journey and Activity's Recent sessions: one player's answers, oldest
// first, cut where two answers are HEALTH.GAP minutes apart or more. [{id, L: rows in time order}], each player's in
// time order.
function sessionsOf(rows) {
  const BY = Object.create(null),
    S = [];
  rows.forEach(r => (BY[r[0]] = BY[r[0]] || []).push(r));
  Object.entries(BY).forEach(([id, L]) => {
    L.sort((a, b) => a[1] - b[1]);
    let s = null;
    L.forEach(r => {
      if (!s || r[1] - s.L[s.L.length - 1][1] >= HEALTH.GAP * 6e4) S.push((s = {id, L: []}));
      s.L.push(r);
    });
  });
  return S;
}
// Who played last and who is playing now (Pierre, 2026-11-03): Players' Last column and Activity's Recent sessions.
// "Now" = a last answer less than NOW minutes old in the log loaded: a signed-in player's answers reach the sheet a few
// seconds after each answer, a device not signed in sends them 10 at a time (sync.js sendAnon), so a few minutes.
const RECENT = {
  NOW: 5, // minutes: a last answer more recent than this = playing now
  N: 10 // sessions in Recent sessions
};

/* ---------- Help ("?" in the header): the explanations, kept off the pages ---------- */
const HELP = {
  // A getter: JOURNEY is in admin-journey.js, loaded after this file.
  get journey() {
    return `<p>One player's path, from their answers in the sheet (signed in). <b>Quiz right</b> and <b>Last 50</b> count the Quiz only (the Custom quiz and the look-alike duels slipped into them included); <b>Duels</b> = answers in the Duel tab (2 choices, often on one chosen pair), apart so a burst of them does not read as the player's level. <b>Progress</b>: their right answers over the last ${JOURNEY.WIN} (solid) against the chance the game expected of them (dashed: from the photo's difficulty and their level on the genus at that moment); above the dashed line, they do better than the game thought. <b>Progress</b> and <b>Learned</b> (numbers and the Genera table's Progress column): replayed from every answer in the log with the current rules, as on Players; ↻ saved = what their saved copy still says. Below: the genera met, one dot per genus at its first question (hover a dot for the genus and the time); a vertical line marks a new day, a dashed orange one when they opened all the genera at once. The green curve counts the genera learned (mastery exam passed, still held), each at the answer that passed its mastery exam (★: its last right exam question); genera learned before exam questions were logged (2 Nov 2026) have no such answer and are not on it (the legend says how many). <b>Cards</b> (from their saved progress, read with this page's token): their answer to the first-launch question (new to corals, IMR coral course, know corals well; from 3 Nov 2026), after which answer and how (in the welcome tour, on the card before the quiz, from the fallback card, or <b>inferred</b> from their level for a player who already had 50 answers or more and was never asked), each change, and the fallback cards shown; the first cards and when, how many single cards, and whether they opened all the genera at once (after which answer, when, and from where: the first cards, My progress or the offer card) or declined the offer; times are kept from 2 Nov 2026 (before, the time of that answer). <b>Easiest / Hardest for them</b>: genera with ${JOURNEY.MIN} answers or more, ranked by <b>vs expected</b> (right answers minus the expected chance, in points): +20 pts = 20 more right answers in 100 than expected. Raw right rates mislead because the game hands harder photos to whoever does well. <b>Mix-ups</b>: genus shown → genus answered. <b>Genera</b>: every genus they were asked, in the order met; Card = when its card showed (first cards, opened all, or after which answer; hover for how many questions later it was asked), First asked = answer number and date of its first question, or sorted by ease or by answers; Last 10 = their last 10 answers on it, oldest first; Answered instead = their most frequent wrong answers. <b>When they played</b>: one row a day, from their first day to their last (days without an answer included), one cell an hour, in this device's time zone; the darker, the more answers that hour, relative to their busiest hour (hover for the answers and the right share); the total of the day on the right. A session = answers less than ${HEALTH.GAP} minutes apart. <b>Median time</b> and <b>Enlarged</b> (answers from sheet v23 on): median seconds from the photos in view to the answer, and the share of answers where they enlarged a photo first; logged to see later whether they tell a hard photo, not used by the game.</p>`;
  },
  events: `<p>What the players' devices report by themselves, without a name (sheet v19, a random id per device): app errors (with where in the code and on which page), photos that still did not load after their retries, saves that failed while online, and the answers to the one-tap questions, with the player's level and their right rate when they answered. Grouped, the most devices first: a photo that fails on many devices may be missing or broken, on one device only it is most likely its connection. <b>One-tap questions</b>: a "Quick question" block before Next, after an answer in the photo quiz (custom quiz too) and duels, after 35 answers, then every 40 (80 after a "Not now"), one of ${PULSEQ.length} questions in turn, never the same twice in a row: ${PULSEQ.map(x => `"${esc(x.q)}" (${x.a.map(a => esc(a[1])).join(' · ')})`).join(', ')}. The first table puts every answer on two scales: <b>Difficulty</b> (−1 too easy, 0 right, +1 too hard: the difficulty questions, "Frustrating?" towards hard, "Getting boring?" towards easy) and <b>Feel</b> (−1 bad, +1 good: fun, frustration, boredom), averaged by player level band (their overall level when they answered) and by mode; the small number is how many answers. Compare the bands: the target that depends on the level is right when every band sits near 0 on Difficulty. <b>Shown</b> and <b>Answered</b> (% of shown): each prompt logs its showing, so the response rate is known; prompts from before 3 Nov 2026 did not and are left out of it. The second table counts each question's answers by band and mode (% of that column's answers), then its <b>Not now</b> (×), <b>No answer</b> (shown − answered − Not now: Next or another page without a tap, or the app closed) and <b>Shown</b> with the % answered. Last 30 days. Nothing here changes the app by itself.</p>`,
  // "Start here" (Pierre, 2026-11-01, admin review rec. 1): the workflow for anyone new to the admin, one tab of the help.
  start: `<p><b>Three groups, nine tabs</b>. <b>To do</b>: <b>To do</b> (All, Reports, Errors, Health: players' reports, your flags, the errors their devices send, how the app is working for them) and <b>Coverage</b> (Games, Sheets & Finder: where photos are missing, with Where to look above the Games grid). <b>Photos</b>: <b>Genera</b> (Live, Hidden, Excluded), <b>Candidates</b>, <b>Photo review</b> (Quality, Growth form, By difficulty), <b>Look-alikes</b>, <b>Photo stats</b> (Overview, Difficulty). <b>Players</b>: <b>Players</b> (who plays, merge or delete names) and <b>Activity</b> (Activity, Confusions). The tabs of a group are in the row under the header, the views of a tab in the switch at its right; each group reopens the tab you used last, each tab the view you used last.</p><p><b>Work in this order</b> (all under Photos, then To do)</p>
    <ol class="adm-steps"><li><b>Candidates</b>: add new photos to a view, or reject them. You never need to empty the queue: it favours the genera and views with the fewest photos, so stop whenever Where to look looks better.</li><li><b>Photo review</b>: check the quality and growth form guesses.</li><li><b>Genera</b>: per genus, cover and the first 3 photos of each view, then ✓ Validated.</li><li><b>Coverage › Games</b>: Where to look, above the grid, says which genus and view still lack photos; look for more there.</li><li><b>Publish</b>: sends your changes to the site.</li></ol>
    <p><b>What reaches the public site.</b> Nothing until Publish: every click is a draft kept in this browser only. Publish lists what it will send and asks first; it sends only what you changed (the rest follows the site) and is live within a minute or two. Covers, view order, hidden photos, quality, forms and the CF book switch (⋯ menu, site-wide) all change what the RAs see.</p>
    <p><b>What is permanent.</b> × on a photo excludes it for good once published: removed everywhere, imports skip it, its file goes (Excluded can restore the entry). Everything else can be undone: Undo (Ctrl+Z) before Publish (its steps survive a reload, until the tab is closed), a new click after it. Every Publish is kept in the site's history, so an old version can be recovered.</p>
    <p><b>Questions or a mistake:</b> ask Pierre Pericard.</p>`,
  todo: `<p>Everything that needs your eye, most urgent first: a red <b>Health</b> line when Health finds photos everyone misses or genera players are stuck on (nothing when all is well), the players' <b>reports</b>, the photos you <b>flagged</b> on the site, the <b>errors</b> the players' devices sent in the last 30 days (app errors, photos that did not load, failed saves), Featured photos rated Poor, and last the judging agent's <b>suggestions</b>. Each part works as in its own view: <b>Reports</b> (reports, flags, Poor featured photos and suggestions, the former Triage page), <b>Errors</b> (with the one-tap answers and load times), <b>Health</b>.</p>`,
  hidden: `<p>Every photo taken off the site with <b>Remove</b>, all genera together (on a genus page they wait with the candidates). <b>Put back</b> returns one to its view; Undo steps back as everywhere.</p>`,
  fcov: `<p>What the genus sheets and the Coral Finder can draw from, per genus and view (a sheet shows the first 6 photos of a view, the Coral Finder the 3 featured plus a few iNat and book photos): the IMR genera and the book's other genera seen at Dauin (Not IMR). Every photo of the view counts (field, IMR lecture and approved Coral Finder book photos), except hidden and multi-coral ones. Big number = photos, small = distinct colonies with a photo that is not Poor; the colour follows those good colonies (as on Games). Forms = growth forms seen on Colony and Close-up photos; Species = distinct species named on the photos (hover for the list). Order: Thinnest, Thickest (to prune), A–Z; or click Colony, Close-up or Corallites to sort by that view (again to reverse). A dark outline marks a Finder-only genus's Colony or Close-up cell at its cap (${CAP.sheet} colonies in the games' count, as many as a sheet and the Coral Finder show), an orange one a cell over it. Click a row to open the genus.</p>`,
  cov: `<p><b>Where to look</b> (the banner above the grid): the genus and view cells most worth a candidate search now, most reasons first; hover one for its reasons, click it to open the genus; <b>All N</b> opens the full list (reasons, filters, sort; see its own help), <b>Fold</b> closes it.</p><p>Game photos per genus and view, for every genus a game can ask (the IMR slate, Millepora and the bonus genera): what the quiz and the other games can draw from. Field and IMR lecture photos (no Coral Finder book, no multi-coral, hidden or sheet-only photo; Poor photos count, the games use them at the Hard level; Colony leaves out photos where the form is not visible, except for a genus with a single growth form). Big number = photos, small = distinct colonies when fewer. The "excl." line under it counts the photos of that view left out of games and why: multi-coral (several corals in the photo), no form (form not visible), sheet only, CF (Coral Finder book), removed. The colour follows the colonies: dark red none, red 1-2 (thin: RAs may learn the photos instead of the genus), orange 3-4, light green 5-7, green 8 or more. The bar shows where the photos come from (IMR, Pierre, iNat Dauin, Philippines, elsewhere), the + count the candidates waiting. A dark outline marks a full cell (${CELL_MAX} colonies, the cap: its candidates wait outside the Candidates queue), an orange one a cell over the cap (prune it by adding a better photo there: the swiper then asks which colony to replace). Order: Thinnest (least covered first), Thickest (most photos first, to prune over-covered genera), Lecture; or click Colony, Close-up or Corallites to sort by that view (again to reverse). Click a row to open the genus.</p>`,
  users: `<p>Everyone who signed in to save their progress, by name (needs the sync sheet script v11 and this page's GitHub token: names are only shown to admins). Click a column title to sort by it, again to reverse; "you" marks the name synced in this browser; a greyed name (muted, italic) is hidden from the leaderboard. A long name or value ends in "…" so the table stays narrow: hover it for the whole text. Level = overall level from every answer, on the same scale as photo difficulty (sheet v13 links names to it). Elo = the score players see (1000 + 200 × Level; shown to them from 200 answers), ± its 95% margin: a few answers, or a run of near-sure right ones, leave it wide, so a high Elo from few answers is not yet a higher level. <b>Last</b> = their last answer, to the minute: <b>now</b> (green) = less than ${RECENT.NOW} minutes ago, then "12 min ago", "3 h ago" (today), "yesterday 18:40" ("yest. 18:40" on a phone), then the date (hover for the date and time); times are 24 h; sorted by its exact time, most recent first by default (one tap on Last brings that back). How quickly answers reach the sheet: see Activity's help. Quiz = right in the Quiz (the Custom quiz and the look-alike duels slipped into them included); Last 50 = their last 50 quiz answers; Duels = answers in the Duel tab (2 choices, often on one chosen pair, so they say little about the level), with their right share. Days = days with answers. <b>Progress</b> and <b>Learned</b>: replayed from every answer in the log with the current rules (what the app will show the player), the mastery exams taken from their saved progress; <b>↻ saved 44%</b> beside one = what the copy saved in the sheet still says (the player has not opened the app since a recalculation, or their last answers are not saved yet). Seen = genera, from their last sync. Reports = problems they reported (To do › Reports). Click a row for their games, most frequent mix-ups (genus shown → genus answered) and genera to review. <b>Not signed in</b>: answers of devices that never signed in, and of accounts deleted with their answers kept, by anonymous id; they count in Activity. Tick test runs or junk and <b>Delete the answers of the selected ids</b> (permanent, asks first; sheet v17). Photo difficulty and confusions count only players whose answers are clearly above chance (10 answers or more), signed in or not (sheet v18), each answer weighing more as the player's level settles, repeats against what they remember of the photo (sheet v17).</p><p><b>Merge into</b>: one person signed in under two names (a typo, a second phone). Their progress is combined (answers add up), their answers and reports move to the name kept, and the other name is deleted. <b>Delete</b>: a test or abandoned account; you choose whether its answers go too (otherwise they stay, without the name, for photo difficulty). Both are permanent and ask first. A phone still signed in with a removed name is told to sign out; someone new can still pick that name with another code.</p>`,
  stats: `<p><b>Recent sessions</b>: the last ${RECENT.N} sessions of every player, newest first (a session = one player's answers less than ${HEALTH.GAP} minutes apart, as on Health and a Journey): the name when they signed in (opens their Journey), else the anonymous id of their device (as on Players). Last = their last answer; <b>now</b> (green row) = less than ${RECENT.NOW} minutes ago. Length = first to last answer. Modes: quiz (look-alike duels slipped into it included), duel (the Duel tab), typed. "as of" = when the answers were read: <b>↻</b> reads them again (no automatic reload: each read fetches the whole answer log).</p>
    <p><b>How live is "now"?</b> It shows what the sheet has. A signed-in player's answer is sent about 3 seconds after it is given, so it is here within about 10 seconds (after ↻). A device not signed in sends its answers 10 at a time, or 20 seconds after it stops answering, or as soon as the app is left: while it plays, its last answers here can be up to 9 answers behind (a minute or three), still inside the ${RECENT.NOW} minutes of "now". Answers played offline arrive when the device is back online, with the time they were given. Times are the device's own clock.</p>
    <p>The whole class, from every quiz and duel answer synced to the sheet (each player, by name, is on the Players page). All / Others / Me: everyone, everyone but the name synced in this browser, or only it. Calibration (sheet v5): each answer's expected chance of success from the player's level on the genus and the photos' difficulty, against the actual result; the games aim at about 80%. New photo = answers showing at least one photo the player had never seen. Genera, Level = median player ability on the genus (same scale as photo difficulty).</p>
    <p>Learning curve: right answers by rank of the answer (each player's 1st to 10th answer, 11th to 20th…), all players pooled. Genera: how often the genus shown was named; Given ✗ = times it was answered wrongly for another genus. Mix-ups open the comparison on the site.</p>`,
  statsconf: `<p>Which genera players mix up. <b>Pairs</b>: Offered = times the two were among the choices together, Mixed = times one was answered for the other (A→B: the first taken for the second). Score = the mix-up rate, starting from Look-alike (IMR lecture or Coral Finder), Family or Other and following the answers as they come; from ${CONF.TRAP} the quiz uses the pair as a trap. Not declared = traps no lecture names. <b>Look-alike from the data</b>: a pair no source declares, offered together ${CONF.N} times or more with a score of ${CONF.TRAP} or more: the duels, the Again after a mix-up and the genus sheets treat it as a declared look-alike (the app adds a shared growth form to the start, so its count may differ by a pair at the edge). <b>Photos, Colonies, Species</b>: how often a wrong answer was given when they were shown, and what for. ≥1 / ≥3 / ≥10 hides rows with fewer answers. Before v10: mix-ups logged without their choices.</p>`,
  pstats: `<p>General numbers on every photo, from data.json and your draft (unpublished changes included) and the sheet's photo ratings. <b>In play</b> = the photos the games can draw now, as Coverage › Games counts them (field and IMR lecture photos of the game genera: the IMR slate, Millepora, the bonus genera; no Coral Finder book, several-corals, removed or sheet-only photo, no Colony photo whose form is not visible). <b>Colonies</b> = distinct iNaturalist observations (or lecture photos), as a question shows one colony. <b>Genera in play</b> = game genera with at least one photo in play (out of all of them when some have none).</p>
    <p><b>All photos</b>: every photo the admin knows, each in one row, so the rows add up to the total. <b>Not in games</b>: on the genus sheets and the Coral Finder only, with the first reason that applies (the line under the table). <b>Comparison only</b>: photos (or candidates) you sent to Not this genus › Look-alike comparison: they left their genus and are shown only in the site's look-alike comparisons. <b>Removed</b>: taken off the site (Genera › Hidden), back with the candidates. <b>Candidates</b> = waiting for a decision: not added and not rejected (Coral Finder book pages included; hover the row for how many). <b>Rejected</b> = candidates you rejected (they stay candidates). <b>Excluded</b> = excluded for good (Genera › Excluded).</p>
    <p><b>Median [middle half]</b>: half the genera have fewer, half more; the brackets hold the middle half of the genera (25th to 75th percentile), a spread that a few very rich or very poor genera do not pull. <b>Per genus</b> counts every game genus (the IMR slate, Millepora, the bonus genera), a genus without any counting 0. The bars: how many genera have each band of photos in play, from 0 (hover a bar for its genera). <b>Views</b> counts only the genera that have the view (a 2-level genus has no Close-up view); <b>None</b> = genera without a single photo in that view, out of those that have it. <b>Sources</b>: the photos in play by where they come from (Coral Finder book photos are never in games, so they have no row); <b>Genera</b> = genera with at least one photo in play from that source. <b>Answers per photo</b>: answers that rated each photo in play (sheet v18, as Difficulty; everyone's answers, yours included); under the table, the median of every photo in play, then of those rated at least once. Nothing here changes anything.</p>`,
  statsph: `<p>Photo difficulty (Elo) from the answers of players clearly above chance, signed in or not (sheet v18), each weighed by the player's experience: 0 = average photo, +1 = clearly harder. ≥1 / ≥3 / ≥10 keeps photos with at least that many answers (from sheet v18; before, weighed answers, so a photo answered once was hidden); few answers = rough. Genera: one lane per view (colony, close-up, corallites), a dot per photo (bigger and stronger with more answers), the lane's median as a bar, and from 5 photos a box (middle half of the photos) with whiskers; genera sorted by median. Click a dot to see the photo.</p>
    <p>The quiz shows the colony, close-up and corallite photos together, so they share each answer: view differences only appear as different photos get mixed over many answers.</p>`,
  statsneeds: `<p>Where looking for more photos would help most, per genus and view, ranked by how many reasons add up. Reasons: <b>few colonies</b> (fewer than 3 distinct colonies in the game pool, as on Coverage); <b>few good colonies</b> (fewer than 3 colonies with a photo that is not Poor, so a struggling player has little easy variety); <b>too easy</b> (players' level on the genus is above what the hardest photo of the view can challenge: harder, realistic photos needed, Poor included); <b>repeats</b> (players see the same photos of the view 4 or more times each on average); <b>mix-ups</b> (the genus is often taken for another and its corallites view has fewer than 5 colonies); <b>few multi-zoom</b> (one row per genus, "Several zooms": fewer than 3 colonies photographed at 2 or more zoom levels; a game question only shows views of one colony, so these give the several-view questions beginners need). Levels need answers logged by sheet script v5; repeats and mix-ups work from any answers. Click a reason card to show only its rows (click again for all); the view switch and the genus box narrow the table; click a column header to sort (again to reverse). Click a row to open the genus.</p>`,
  diff: `<p>Every photo with answers, hardest (or easiest) first, with its quality to re-rate (the former Photo stats › Photo list). How hard each photo is for the RAs, learned from every quiz and duel answer in the sync sheet (Elo). 0 = an average photo, +1 = clearly harder, -1 = clearly easier; the count is right answers / answers, weighed by each player's experience (sheet v17: a player's first answers count little). Few answers = rough; ≥1 / ≥3 / ≥10 keeps photos with at least that many answers (shared with Photos). The site uses it to weigh answers in "learned" (a right answer on a hard photo counts more). Re-rate a photo's quality here if it does not match how hard it plays.</p>`,
  genus: `<p>Every click is saved at once as a draft in this browser; <b>Publish</b> sends it to the site. <b>Undo</b> / <b>Redo</b> (Ctrl+Z, Ctrl+Shift+Z) step back one click at a time.</p>
    <p>The first 3 photos of each view are its featured photos (top of the genus sheet, Coral Finder). Drag a photo into the first 3 places to put it there, out of them to drop it (the next best moves up); places you haven't set fill automatically. Drag to another view to move a photo, or from the candidates to add it. <b>Remove</b> takes a photo off the site (games included) and lists it with the candidates below, where you can add it back.</p>
    <p><b>Which no?</b> <b>Remove</b>: off the site, back with the candidates. <b>Reject</b> (Candidates): reviewed and not wanted, it stays a candidate. <b>Skip</b>: decide later. <b>Not this</b>: wrong genus, or only fit for a look-alike comparison. <b>×</b>: excluded for good (a person, a drawing, unusable).</p>
    <p>The letters on each photo are its growth form (see Growth form).</p>
    <p><b>Symbols.</b> Genus list: <b>✓</b> validated and complete; <b>!</b> validated but something is missing again; <b>●</b> draft not published; <b>⚠ check</b> a choice names a photo no longer in the data; <b>N waiting</b> candidates not reviewed yet; <b>macro cover</b> the cover is a close-up. Photos: <b>filled number 1-3</b> featured; <b>outlined number 4-6</b> also on the genus sheet; <b>dashed frame</b> a candidate, not on the site yet; <b>faded dashed frame</b> removed (back with the candidates); <b>added</b> a candidate you added; <b>Cover</b> the cover photo. Dashed tags or buttons are guesses, solid ones are your choices. <b>3 zooms / 2 zooms</b>: with 2, Close-up photos join Colony.</p>`,
  form: `<p>The 7 IMR growth forms (Lecture 6, slides 3-10), one per photo, the main form visible: <b>Br</b> Branching, <b>En</b> Encrusting, <b>Ta</b> Tabulate, <b>Mu</b> Mushroom, <b>Ma</b> Massive, <b>Sm</b> Submassive, <b>Fo</b> Foliose/Plating; <b>∅</b> = form not visible (too close). <b>✿</b> = polyps or vesicles extended (not a form; it fills the Coral Finder "Large daytime polyps" tile).</p>
    <p>The Coral Finder growth-form tiles use them: Branching = Br + Ta, Thin plates and crusts = En + Fo, Massive or thick = Ma + Sm, Columns = Sm, Solitary = Mu, Meandering = any form of the genera it lists. Dashed = a first guess, solid = yours (always wins); a red ? = a guess to double-check.</p>
    <p><b>📌</b> makes a photo a lead photo of its form's tile on the site's Coral Finder start (up to 3 per form, number = place; a 4th drops the oldest); the tile's other places stay automatic. Br leads Branching, En Thin plates and crusts, Ma Massive, Sm Columns, Mu Solitary.</p>
    <p>Click, drag a photo to another row, or hover it and press B E T U M S F, X for not visible, P for polyps. "To classify" rows group the photos without a guess by their old Coral Finder letter. Coral Finder book photos are left out.</p>
    <p><b>Your forms</b> (the line at the top) measures the automatic detection against your own choices, over the photos the Show, View and genus filters leave: how many forms you set, how often your form is the dashed guess (among the photos that have both; ✿ apart), and how many unsure guesses (red ?) are still waiting. A click on the dashed form counts as agreeing, a click on another form as disagreeing; ✓ Validate N agrees for every photo it sets, so check photo by photo to measure the detection. It updates as you click; nothing extra is saved. Open it for the table guess → your form (diagonal = agreed); hover it for the same as a list. <b>Guesses first</b> puts, in each row, the photos still on a guess first (unsure ones first), then the ones you set.</p>`,
  quality: `<p>Quality 3 good, 2 fair, 1 poor. Dashed tags are an automatic guess (sharpness, contrast, colour cast, size). Click, drag to another level, or hover a photo and press 1, 2 or 3.</p>`,
  triage: `<p>Only what needs your eye. First, what players reported: after an answer in a game (wrong answer with the genus they suggest, several corals, bad photo, other), from an enlarged photo, from the bottom of a genus sheet, or with "Send feedback" (at the bottom of the ? help of any page, or on About; wrong information, bug, suggestion), with the page it came from and who sent it: a name with ? did not sign in to the sync, so anyone could have typed it. Each photo has the tools of its genus page; ✓ Done clears one report. Reports come from the Reports tab of the sync sheet (script v8); every admin can read them: the sheet checks this page's GitHub token. ↻ reloads.</p><p>Then, on the site, the ⚑ on any photo (shown only in this browser) sends it here with where you saw it. Hide, Poor or Done clear one flag at a time.</p><p>Then Featured photos rated Poor.</p><p>Last, the suggestions of the photo judging agent (suggest.json): wrong genus, view, several corals, near-duplicates, candidates to add. Accept does the usual action (Undo works), Dismiss hides the suggestion for good. Its growth forms and quality ratings show as dashed guesses on each photo, its Featured picks fill the views you haven't picked.</p>`,
  mont: `<p>The classic look-alikes (pairs the IMR lecture or the Coral Finder text compare), one side-by-side pair each on the site's Look-alikes page. Pick the view, then click a photo on each side. Rows you haven't touched show the automatic pick (same view, same growth form, IMR then your photos first). <b>All</b> mixes the zoom levels, to pair two nearby zooms. <b>Auto / Manual</b> says whether the pair shows the automatic pick or yours (clicking a view or a photo makes it Manual; Auto drops your picks for that pair). <b>Shown / Hidden</b>: Hidden keeps a pair off the site until there are good examples.</p>`,
  cand: `<p>Every new candidate, one at a time, genera taking turns, the genus × view with the fewest game colonies far more often. The genera of the games (the IMR slate, Millepora, the bonus genera) come first: the other genera of the Coral Finder (Finder-only) only once a source has no game candidate left, and only for Colony and Close-up (no corallite photos). Set quality and growth form, then add it to a view (keys 1 2 3), Reject (←), Skip (→) or Not this. Rejected photos stay candidates on their genus page. × excludes for good. Undo steps back.</p><p><b>Full cells</b>: a genus x view with ${CELL_MAX} colonies in the games is full (${CAP.sheet} for a Finder-only genus, as many as its sheet and the Coral Finder show). Its candidates wait outside the queue (the count under the sources; Show them brings them in) and come back when it drops below its cap. Adding a photo to a full view asks which colony it replaces: that colony's photos of the view stay on the genus sheet and leave the games (sheet only); or Add anyway.</p><p><b>Auto</b>: at each load, what the candidate pass is sure of is done for you in the draft (Publish sends it): the best photo of its observation in its view, Fair or Good, is added with its view, quality, growth form and crop (up to the cap); near-duplicates, several corals and Poor photos are rejected, unusable ones excluded. Photos it added carry an "auto" tag; Details lists every auto decision with Undo (the photo comes back here for good). About 1 in 20 sure photos comes up as a <b>Check</b> instead, blind: your answer is compared with the agent's (shown after). Removing an auto-added photo on its genus page counts as rejecting it. Agreement per field (keep, view, quality, growth form) over the last ${AUTO.win} checks and corrections, in the order you made them: a field under its threshold (keep ${Math.round(100 * AUTO.min.keep)}%, view ${Math.round(100 * AUTO.min.view)}%, quality ${Math.round(100 * AUTO.min.quality)}%, form ${Math.round(100 * AUTO.min.form)}%, after ${AUTO.n0}) is off until it recovers. Details shows the disagreements with the agent's note and the photo metrics. Once every ${AUTO.retest} photos, a <b>Retest</b>: a photo you rated, blind, to measure your own consistency (your first rating stays).</p>`,
  health: `<p>How the app is working for players, from the answers already logged (most players never send feedback). Anonymous ids only, counts, no names. <b>Without me</b> drops your answers everywhere on the page: the account this browser is signed in with and those you marked "This is also me" (Players > a player > Manage).</p>
    <p><b>Where players stop.</b> A session = one player's answers less than ${HEALTH.GAP} minutes apart; a session whose last answer is more recent is still going and not counted as ended. Answers per session and sessions per player. How sessions ended: the misses in a row on their last answers, for short sessions (${HEALTH.EARLY} answers or fewer) against longer ones: more short sessions ending on misses than long ones = players quitting in frustration. Last shown: the genus and game of the last question of the short sessions.</p>
    <p><b>Photos everyone misses.</b> Photos shown in ${HEALTH.PH_MIN} answers or more with under ${Math.round(HEALTH.PH_LOW * 100)}% right, or a difficulty at least ${HEALTH.PH_FAR} above the median of their genus (+1 = clearly harder; photo Elo, with ${HEALTH.PH_MIN}+ rated answers). They may be mislabelled, show another coral, or be bad photos: click to enlarge, the genus name opens its page. Right % and answers count every answer that showed the photo; the number after them is the difficulty against the genus median.</p>
    <p><b>Genera that don't take off.</b> Per slate genus, from the answers where it was shown: players who met it, the median of their right rates on it, and Stuck = players with ${HEALTH.G_MIN}+ answers on it still under ${Math.round(HEALTH.G_LOW * 100)}% over their last ${HEALTH.G_MIN} (out of the players with ${HEALTH.G_MIN}+ answers). Most stuck first.</p>
    <p><b>Activity.</b> Answers and players with at least one answer per day (this browser's time zone), the last ${HEALTH.DAYS} days; hover a bar for its day and count.</p>`,
  excluded: `<p>Excluded photos are removed from every genus, game and candidate list, and imports skip them. Restore puts one back.</p>`
};
function toggleHelp() {
  let h = $('admhelp');
  if (h) {
    h.remove();
    return;
  }
  const m =
    {
      '~users': 'users',
      '~stats-photos': 'statsph',
      '~pstats': 'pstats',
      '~stats-conf': 'statsconf',
      '~stats-needs': 'statsneeds',
      '~diff': 'diff'
    }[cur] || modeKey();
  h = document.createElement('div');
  h.id = 'admhelp';
  h.className = 'adm-help';
  h.setAttribute('role', 'dialog');
  h.setAttribute('aria-label', 'Help');
  // Two tabs: this page's help, and "Start here" (shown first until this browser has opened it once).
  let tab = store.get('reefid-admin-started', false) ? 'page' : 'start';
  const draw = () => {
    if (tab === 'start') store.set('reefid-admin-started', true);
    h.innerHTML = `<button type="button" class="adm-link" aria-label="Close help">×</button><span class="adm-qseg adm-htabs" role="group"><button type="button" data-ht="page" aria-pressed="${tab === 'page'}">This page</button><button type="button" data-ht="start" aria-pressed="${tab === 'start'}">Start here</button></span>${HELP[tab === 'start' ? 'start' : m]}`;
    h.querySelector('.adm-link').onclick = () => h.remove();
    h.querySelectorAll('[data-ht]').forEach(
      b =>
        (b.onclick = () => {
          tab = b.dataset.ht;
          draw();
        })
    );
  };
  draw();
  $('tools').append(h);
}

/* ---------- Growth form ---------- */
// One row per IMR growth form, then "Form not visible" and the photos still to classify (by old Coral Finder letter). Click a letter on a photo (one form per photo; ∅ = form not visible), drag it to another row,
// or hover it and press the key (b e t u m s f, x or 0 for not visible, p for polyps). The tile stays put until a filter changes.
const FF = Object.assign({view: 'all', genus: '', todo: false, pol: false, gfirst: false}, store.get('reefid-admin-ffilter', {}));
// Agreement of the automatic growth form with Pierre's own (Pierre, 2026-11-03: he checks forms by hand to see whether the
// automatic detection is good, and to help improve it). Nothing new is recorded: his form (the draft's curation gf)
// against the dashed guess (forms.json gf, or the judging agent's candidate pass for a candidate), form letters only (✿
// apart), over the photos the Show, View and genus filters leave (FSCOPE, set by renderForm). A click that keeps the
// dashed form counts as agreement, one that picks another as disagreement. "Unsure" = guesses to double-check (gunsure)
// still on the guess.
let FSCOPE = [],
  FAG_OPEN = false;
function formAgree(L) {
  const M = {};
  let set = 0,
    both = 0,
    ok = 0,
    un = 0;
  L.forEach(p => {
    const m = fL(mineF(p.f)),
      g = fL(AUTOF[p.f]);
    if (m) {
      set++;
      if (g) {
        both++;
        if (g === m) ok++;
        M[g] = M[g] || {};
        M[g][m] = (M[g][m] || 0) + 1;
      }
    } else if (g && FUNSURE.has(p.f)) un++;
  });
  return {set, both, ok, un, M};
}
// The line, and a guess × yours table behind it (rows = the guess, columns = your form; the diagonal agrees).
function agreeHTML() {
  const A = formAgree(FSCOPE),
    F = [...FORM_ORDER, 'x'],
    G = F.filter(g => A.M[g]),
    Y = F.filter(m => G.some(g => A.M[g][m]));
  const pairs = G.flatMap(g => Y.filter(m => A.M[g][m]).map(m => [g, m, A.M[g][m]])).sort((a, b) => b[2] - a[2]);
  const tip = pairs.map(([g, m, n]) => `${FABBR[g]} → ${FABBR[m]} ${n}`).join(', ');
  const head = `<span class="adm-fag-line" title="${esc(tip ? 'Guess → yours: ' + tip : 'No photo with both yet')}">Your forms: <b>${A.set}</b> set · agreement with the automatic guess: <b>${pct(A.ok, A.both)}</b> (of ${A.both} where both exist) · unsure guesses: <b>${A.un}</b></span>`;
  const th = c => `<th title="${esc(fName(c))}">${FABBR[c]}</th>`;
  const tbl = G.length
    ? `<div class="adm-tscroll"><table class="adm-tbl adm-fag-t"><thead><tr><th>Guess ↓ · yours →</th>${Y.map(th).join('')}<th>Agree</th></tr></thead><tbody>${G.map(
        g => {
          const R = A.M[g],
            n = Object.values(R).reduce((a, b) => a + b, 0);
          return `<tr><th title="${esc(fName(g))}">${FABBR[g]}</th>${Y.map(m => `<td class="${!R[m] ? '' : m === g ? 'ok' : 'ko'}">${R[m] || ''}</td>`).join('')}<td class="n">${pct(R[g] || 0, n)} <small>of ${n}</small></td></tr>`;
        }
      ).join('')}</tbody></table></div>`
    : '<p class="note">No photo with both a guess and your form yet.</p>';
  return {head, tbl, A};
}
function agreeFill(d) {
  const {head, tbl, A} = agreeHTML();
  d.innerHTML = `<summary>${head}</summary>${tbl}`;
  Object.assign(d.dataset, {set: A.set, both: A.both, ok: A.ok, un: A.un});
}
// Guesses first: in each row the photos still on a guess, the unsure ones first; the photos you set last.
const fRank = f => (fSet(f) ? 2 : fL(AUTOF[f]) && FUNSURE.has(f) ? 0 : 1);
// 📌 (Growth form view): only on photos the Coral Finder tiles can show (colony or close-up view, one coral, not a
// book photo), so a pin always counts; the number is its place on the tile.
const pinOK = p => (p.view === 'wide' || p.view === 'medium') && !p.multi && !p.cf;
const pinBtn = f => {
  const c = fOf(f);
  if (!c || c === 'x') return '';
  const k = tileOf(c).indexOf(f);
  return `<button type="button" class="adm-pin" data-pin="${c}" aria-pressed="${k >= 0}" title="${k >= 0 ? `Tile photo ${k + 1} of ${fName(c)} on the Coral Finder start: click to unpin` : `Make it a lead photo of the ${fName(c)} tile on the Coral Finder start`}">📌${k >= 0 ? k + 1 : ''}</button>`;
};
// After a form or polyps click the pin follows the photo's current form (the form change already unpinned it if needed).
const pinRefresh = t => {
  const w = t.querySelector('.adm-pinw');
  if (w) w.innerHTML = pinBtn(t.dataset.f);
};
function formTile(t, v) {
  setF(t.dataset.f, v);
  const p = {f: t.dataset.f};
  t.querySelector('.adm-fseg').outerHTML = fSeg(p, !!t.closest('.adm-blind'));
  pinRefresh(t);
  if (cur === '~form') t.classList.add('rated');
  bindF(t);
  agreeRefresh();
  status();
}
const agreeRefresh = () => {
  const d = cur === '~form' && $('fagree');
  if (d) agreeFill(d);
};
// One form per photo (Pierre): a click picks that form and replaces the previous one; when in doubt, the main form.
const toggleF = (f, c) => c;
function polTile(t) {
  const blind = !!t.closest('.adm-blind');
  setP(t.dataset.f, !(blind ? fP(mineF(t.dataset.f)) === true : pOf(t.dataset.f)));
  t.querySelector('.adm-fseg').outerHTML = fSeg({f: t.dataset.f}, blind);
  pinRefresh(t);
  bindF(t);
  status();
}
function bindF(scope) {
  scope.querySelectorAll('.adm-fseg [data-fm]').forEach(
    b =>
      (b.onclick = e => {
        e.stopPropagation();
        const t = b.closest('[data-f]');
        formTile(t, toggleF(t.dataset.f, b.dataset.fm));
      })
  );
  scope.querySelectorAll('.adm-fseg [data-pol]').forEach(
    b =>
      (b.onclick = e => {
        e.stopPropagation();
        polTile(b.closest('[data-f]'));
      })
  );
}
function renderForm() {
  status();
  const names = Object.keys(DATA.gen),
    vl = v => (v === 'cand' ? 'Candidate' : VIEWS.find(x => x[0] === v)[1]);
  // Coral Finder book photos are left out: they never go on the growth-form tiles.
  FSCOPE = allPhotos().filter(p => !p.cf && shown(p) && (FF.view === 'all' || p.view === FF.view) && (!FF.genus || p.genus === FF.genus));
  const all = FSCOPE.filter(p => (!FF.todo || !fSet(p.f)) && (!FF.pol || pOf(p.f)));
  const card =
    p => `<figure class="adm-tile adm-qt${p.hid ? ' is-hidden' : ''}" data-f="${esc(p.f)}" data-g="${esc(p.genus)}" data-drag tabindex="0">
    <button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img ${crSrc(p, 1)} alt="" loading="lazy" draggable="false"></button>${GRIP}${XBTN}
    <figcaption><a class="adm-gen" href="#${esc(p.genus)}" title="Open the genus"><i>${esc(p.genus)}</i></a><span class="adm-src view">${vl(p.view)}</span>${srcTag(p)}${p.hid ? '<span class="adm-src multi">hidden</span>' : ''}</figcaption>
    <div class="adm-acts">${fSeg(p)}${pinOK(p) ? `<span class="adm-pinw">${pinBtn(p.f)}</span>` : ''}</div></figure>`;
  // Still to classify: grouped by the old Coral Finder letter, as a hint.
  const rows = [
    ...[...FORM_ORDER].map(c => [c, fName(c), p => fOf(p.f) === c]),
    ['x', 'Form not visible', p => fOf(p.f) === 'x'],
    ...[...'BMSPFLC', ''].map(c => [
      '',
      `To classify${c ? ` · was Coral Finder ${cfName(c)}` : ''}`,
      p => !fOf(p.f) && (LEGACY[p.f] || '') === c
    ])
  ];
  const sec = ([id, t, test]) => {
    const L = all.filter(test);
    if (FF.gfirst) L.sort((a, b) => fRank(a.f) - fRank(b.f));
    if (!L.length && id === '') return '';
    const todo = id ? L.filter(p => !fSet(p.f)).length : 0;
    return `<section class="adm-row adm-qrow"><h3>${id ? `<b class="adm-fl">${FABBR[id]}</b> ` : ''}${esc(t)} <small>${L.length} photo${L.length === 1 ? '' : 's'}${id === 'x' ? ' · never used on the growth-form tiles' : ''}</small>${todo ? ` <button type="button" class="adm-fok" data-fok="${id}" title="Validate">✓ Validate ${todo}</button>` : ''}</h3>
      <div class="adm-grid adm-qgrid" data-fdrop="${id}">${L.map(card).join('')}</div></section>`;
  };
  const opt = (v, t, cur) => `<button type="button" class="adm-fchip plain" data-fv="${v}" aria-pressed="${cur === v}">${t}</button>`;
  $v.innerHTML = `<section class="adm-quality">
    <div class="adm-qhead"><h2>Growth form</h2></div>
    <details class="adm-fagree" id="fagree"${FAG_OPEN ? ' open' : ''}></details>
    <div class="adm-filter"><span class="label">Show</span>${ORIGINS.filter(([o]) => o !== 'book')
      .map(([o, t]) => `<button type="button" class="adm-fchip o-${o}" data-o="${o}" aria-pressed="${SHOW.has(o)}">${t}</button>`)
      .join('')}</div>
    <div class="adm-filter"><span class="label">View</span>${opt('all', 'All', FF.view)}${VIEWS.map(([v, t]) => opt(v, t, FF.view)).join('')}${opt('cand', 'Candidates', FF.view)}
      <select id="fgen" aria-label="Genus"><option value="">All genera</option>${names.map(m => `<option${m === FF.genus ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select>
      <label class="adm-todo"><input type="checkbox" id="ftodo"${FF.todo ? ' checked' : ''}> Not checked yet</label><label class="adm-todo"><input type="checkbox" id="fpol"${FF.pol ? ' checked' : ''}> ✿ Polyps out</label><label class="adm-todo"><input type="checkbox" id="fgfirst"${FF.gfirst ? ' checked' : ''}> Guesses first</label></div>
    ${rows.map(sec).join('')}</section>`;
  const fag = $('fagree');
  agreeFill(fag);
  fag.ontoggle = () => (FAG_OPEN = fag.open);
  const saveFF = () => {
    store.set('reefid-admin-ffilter', FF);
    renderForm();
  };
  $v.querySelectorAll('[data-o]').forEach(
    b =>
      (b.onclick = () => {
        const o = b.dataset.o;
        SHOW.has(o) ? SHOW.delete(o) : SHOW.add(o);
        store.set('reefid-admin-origins', [...SHOW]);
        renderForm();
      })
  );
  $v.querySelectorAll('[data-fv]').forEach(
    b =>
      (b.onclick = () => {
        FF.view = b.dataset.fv;
        saveFF();
      })
  );
  $('fgen').onchange = e => {
    FF.genus = e.target.value;
    saveFF();
  };
  $('ftodo').onchange = e => {
    FF.todo = e.target.checked;
    saveFF();
  };
  $('fpol').onchange = e => {
    FF.pol = e.target.checked;
    saveFF();
  };
  $('fgfirst').onchange = e => {
    FF.gfirst = e.target.checked;
    saveFF();
  };
  $v.querySelectorAll('[data-act="zoom"]').forEach(
    b =>
      (b.onclick = () => {
        const t = b.closest('[data-f]');
        zoom(t.dataset.g, t.dataset.f);
      })
  );
  $v.querySelectorAll('[data-act="exclude"]').forEach(
    b =>
      (b.onclick = e => {
        e.stopPropagation();
        const t = b.closest('[data-f]');
        ACT.exclude(t.dataset.g, t.dataset.f);
      })
  );
  $v.querySelectorAll('.adm-pinw').forEach(
    w =>
      (w.onclick = e => {
        const b = e.target.closest('[data-pin]');
        if (!b) return;
        e.stopPropagation();
        togglePin(b.closest('[data-f]').dataset.f, b.dataset.pin);
        renderForm();
      })
  );
  // Validate a whole row: every first guess still shown in it (with the filters on) becomes Pierre's own choice, in one undo step.
  $v.querySelectorAll('[data-fok]').forEach(
    b =>
      (b.onclick = () => {
        const c = b.dataset.fok,
          todo = all.filter(p => fOf(p.f) === c && !fSet(p.f));
        if (!confirm(`Validate ${todo.length} growth form${todo.length === 1 ? '' : 's'} as ${FABBR[c] || c}?`)) return;
        DRAFT.gf = {...(DRAFT.gf || {})};
        todo.forEach(p => {
          const m = fP(mineF(p.f)),
            pol = m === null ? fP(AUTOF[p.f]) === true : m;
          DRAFT.gf[p.f] = c + (m === false ? 'n' : pol ? 'p' : '');
        });
        saveDraft();
        renderForm();
      })
  );
  bindF($v);
  let over = null;
  $v.querySelectorAll('.adm-qt').forEach(t => {
    t.onmouseenter = t.onfocus = () => {
      over = t;
    };
    t.onmouseleave = () => {
      if (over === t) over = null;
    };
  });
  document.onkeydown = e => {
    if (cur !== '~form' || !over || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,select,textarea')) return;
    const k = e.key.toUpperCase();
    if (k === 'P') {
      e.preventDefault();
      polTile(over);
      return;
    }
    const c = k === '0' ? 'x' : k === 'X' ? 'x' : FORM_ORDER.includes(k) ? k : null;
    if (c) {
      e.preventDefault();
      formTile(over, toggleF(over.dataset.f, c));
    }
  };
  // Drag a photo onto another row: it gets that form (not onto the To classify rows).
  const clearF = () => $v.querySelectorAll('.drop-row').forEach(x => x.classList.remove('drop-row'));
  pointerDrag(
    $v.querySelectorAll('.adm-qt'),
    el => {
      clearF();
      const g = el && el.closest('[data-fdrop]');
      if (g && g.dataset.fdrop) g.classList.add('drop-row');
    },
    (t, el) => {
      clearF();
      const g = el && el.closest('[data-fdrop]');
      if (g && g.dataset.fdrop) {
        formTile(t, g.dataset.fdrop);
        g.prepend(t);
      }
    },
    clearF
  );
}

/* ---------- Excluded ---------- */
function renderExcluded() {
  status();
  // A photo excluded and since removed from data.json: genus from its file name, thumbnail from iNaturalist when the name
  // ends in an iNat photo id (admin review, 2026-11-01). The extension is unknown: try .jpg, then .jpeg, then .png.
  const gone = f => {
    const m = f.match(/^([a-z]+)-/),
      id = (f.match(/-(\d{5,})$/) || [])[1],
      gn = m && Object.keys(DATA.gen).find(x => x.toLowerCase() === m[1]);
    // An IMR lecture photo (imrl-p<page>_…): genus and slide from another photo of the same lecture page (admin re-review).
    const pg = (f.match(/^(imrl-p\d+_)/) || [])[1],
      sib =
        pg &&
        Object.entries(DATA.course || {})
          .flatMap(([g, L]) => L.map(p => ({...p, genus: g})))
          .find(p => p.f.startsWith(pg));
    return {f, genus: gn || (sib ? sib.genus : pg ? 'IMR lecture' : '?'), gone: true, inat: id, slide: sib && sib.slide};
  };
  const X = DRAFT.exclude || {},
    list = Object.keys(X).map(f => (PHOTOS[f] ? {...PHOTOS[f], f} : gone(f)));
  const io = id => `https://inaturalist-open-data.s3.amazonaws.com/photos/${id}/small`;
  $v.innerHTML = `<section class="adm-quality"><div class="adm-qhead"><h2>Excluded photos</h2></div>
    ${
      list.length
        ? `<div class="adm-grid adm-qgrid">${list
            .map(
              p => `<figure class="adm-tile" data-f="${esc(p.f)}" data-g="${esc(p.genus)}">
      <button type="button" class="adm-ph" data-act="zoomx" aria-label="Enlarge">${!p.gone ? `<img src="${img(p, 1)}" alt="" loading="lazy">` : p.inat ? `<img src="${io(p.inat)}.jpg" alt="" loading="lazy" data-ext="0">` : '<span class="none">no preview</span>'}</button>
      <figcaption>${DATA.gen[p.genus] ? `<a class="adm-gen" href="#${esc(p.genus)}"><i>${esc(p.genus)}</i></a>` : `<span class="adm-gen">${esc(p.genus)}</span>`}${!p.gone ? srcTag(p) : p.inat ? `<a class="adm-src" href="https://www.inaturalist.org/photos/${p.inat}" target="_blank" rel="noopener">iNat ↗</a>` : p.slide ? `<span class="adm-src">IMR lecture</span> <i>slide ${esc(String(p.slide))}</i>` : ''}</figcaption>
      <div class="adm-acts"><button type="button" data-act="restore">Restore</button></div></figure>`
            )
            .join('')}</div>`
        : '<p class="note">No excluded photo.</p>'
    }</section>`;
  const set = (f, r) => {
    DRAFT.exclude = {...(DRAFT.exclude || {})};
    if (r) DRAFT.exclude[f] = r;
    else delete DRAFT.exclude[f];
    saveDraft();
    renderExcluded();
  };
  $v.querySelectorAll('img[data-ext]').forEach(
    im =>
      (im.onerror = () => {
        const i = Number(im.dataset.ext) + 1,
          E = ['jpg', 'jpeg', 'png'];
        if (i < E.length) {
          im.dataset.ext = i;
          im.src = im.src.replace(/\.\w+$/, '.' + E[i]);
        } else im.replaceWith(Object.assign(document.createElement('span'), {className: 'none', textContent: 'no preview'}));
      })
  );
  $v.querySelectorAll('[data-act="restore"]').forEach(b => (b.onclick = () => set(b.closest('[data-f]').dataset.f, null)));
  $v.querySelectorAll('[data-act="zoomx"]').forEach(
    b =>
      (b.onclick = () => {
        const t = b.closest('[data-f]'),
          p = PHOTOS[t.dataset.f];
        if (p) zoomOne(p);
      })
  );
}
// Players' reports (sheet script v7, app.js reportDialog): wrong answer (+ the genus they suggest), several corals, bad
// photo, other, with a note and WHO sent it (Pierre trusts some players more than others). Every admin can read them:
// the sheet checks this page's GitHub token with GitHub (write access to the repo). Done = curation.json "seen" {'rep:id': 1},
// one report at a time; nothing is ever changed from a report by itself.
let REPS = null,
  repsAt = 0;
const REP_WHY = {
  wrong: 'Wrong answer',
  multi: 'Several corals',
  photo: 'Bad photo',
  info: 'Wrong information',
  bug: 'Bug',
  idea: 'Suggestion',
  other: 'Other'
};
function loadReports(force) {
  if (!force && REPS && Date.now() - repsAt < 300000) return Promise.resolve(REPS);
  if (!TOKEN) {
    REPS = {err: 'Needs the GitHub token'};
    return Promise.resolve(REPS);
  }
  return fetch(SYNC_URL, {method: 'POST', body: JSON.stringify({readReports: 1, token: TOKEN})})
    .then(r => r.json())
    .then(j => {
      repsAt = Date.now();
      REPS =
        j && j.ok && j.rows
          ? {rows: j.rows}
          : {err: !j || !j.v || j.v < 8 ? 'Sheet script v8 not deployed' : j.error === 'token' ? 'Token refused' : 'Not available'};
      return REPS;
    })
    .catch(() => (REPS = {err: 'Offline'}));
}
const repsOpen = () => (REPS && REPS.rows ? REPS.rows.filter(r => !(DRAFT.seen || {})['rep:' + r[0]]) : []);
// Errors & feedback (sheet v19, Pierre 2026-11-02: most RAs will not report problems): what the players' devices report
// by themselves (app.js ev): app errors, photos that did not load, saves that failed, and the one-tap question's answers.
// Rows [id, time ms, device, kind, message, where, page, detail, app version, browser], newest first. Admin token only.
let EVS = null,
  evsAt = 0;
function loadEvents(force) {
  if (!force && EVS && Date.now() - evsAt < 300000) return Promise.resolve(EVS);
  if (!TOKEN) return Promise.resolve((EVS = {err: 'Needs the GitHub token'}));
  return fetch(SYNC_URL, {method: 'POST', body: JSON.stringify({readEvents: 1, token: TOKEN})})
    .then(r => r.json())
    .then(j => {
      evsAt = Date.now();
      return (EVS =
        j && j.ok && j.rows
          ? {rows: j.rows}
          : {
              err:
                !j || !j.v || j.v < 19
                  ? 'Sheet script v19 not running yet (it updates itself within 15 minutes)'
                  : j.error === 'token'
                    ? 'Token refused'
                    : 'Not available'
            });
    })
    .catch(() => (EVS = {err: 'Offline'}));
}
const EV_DAYS = 30;
// Events grouped by key(row), the most devices first.
const evGroup = (L, key) => {
  // Keys come from the players' devices (Codex review #343: "__proto__" broke the page): no prototype.
  const O = Object.create(null);
  L.forEach(r => {
    const k = key(r),
      g = (O[k] = O[k] || {k, n: 0, dev: new Set(), last: 0, pg: new Set(), av: new Set(), ua: new Set(), r});
    g.n++;
    g.dev.add(r[2]);
    g.last = Math.max(g.last, r[1]);
    if (r[6]) g.pg.add(r[6]);
    if (r[8]) g.av.add(r[8]);
    if (r[9]) g.ua.add(r[9]);
  });
  return Object.values(O).sort((a, b) => b.dev.size - a.dev.size || b.n - a.n || b.last - a.last);
};
// To do › All: what went wrong on the players' devices in the last EV_DAYS days (app errors, photos that did not load,
// failed saves), the most devices first; the one-tap answers and load times stay in Errors.
function evSummary() {
  if (!EVS) return '';
  if (EVS.err) return `<div class="adm-qhead adm-tdhead"><h2>Errors</h2><small class="adm-where">${esc(EVS.err)}</small></div>`;
  const since = Date.now() - EV_DAYS * 864e5,
    R = EVS.rows.filter(r => r[1] >= since && ['err', 'photo', 'sync'].includes(r[3])),
    G = evGroup(R, r => r[3] + '|' + r[4] + (r[3] === 'err' ? ' @ ' + r[5] : '')),
    K = {err: 'App error', photo: 'Photo not loaded', sync: 'Failed save'};
  if (!G.length) return '';
  return `<div class="adm-qhead adm-tdhead"><h2>Errors <small>${R.length}</small></h2><a class="adm-link" href="#~events">All errors ›</a></div>
    <div class="adm-tscroll"><table class="adm-tbl adm-tderr"><thead><tr><th>What</th><th>Devices</th><th>Times</th><th>Last</th></tr></thead><tbody>${G.slice(
      0,
      8
    )
      .map(
        g =>
          `<tr><td><small>${K[g.r[3]]}</small><br><code>${esc(g.r[4])}</code>${g.r[3] === 'err' && g.r[5] ? ` <small>${esc(g.r[5])}</small>` : ''}</td><td class="n">${g.dev.size}</td><td class="n">${g.n}</td><td>${days(g.last)}</td></tr>`
      )
      .join('')}</tbody></table></div>${G.length > 8 ? `<p class="note">+${G.length - 8} more in Errors</p>` : ''}`;
}
// The one-tap questions (quiz.js pulseAsk; core.js PULSEQ; sheet v19 'pulse' events): the item in Where (empty before
// 2026-11-03: PULSE0, the only one then; old), its answer's code in Message, what the game knew when it showed in Detail.
// Since 2026-11-03 a prompt also logs its showing and, unanswered, "Not now" or moving on (PULSE_META: no answer).
const PULSE_META = {[PULSE_SHOWN]: 1, [PULSE_SKIP]: 1, [PULSE_NONE]: 1};
function pulseRows(L) {
  return L.map(r => {
    let d = {};
    try {
      d = JSON.parse(r[7] || '{}');
    } catch (e) {}
    const q = String(r[5] || PULSE0),
      s = pulseScore(q, r[4]);
    return {...d, r: String(r[4]), q, old: !r[5], ans: !PULSE_META[r[4]], sd: s.d, sf: s.f, t: r[1], dev: r[2]};
  });
}
// Player level bands (the overall level when they answered) and modes, the columns of the one-tap tables.
const PULSE_BANDS = [
    ['beg', 'Beginner', 'Level below −0.5'],
    ['mid', 'Middle', 'Level −0.5 to +0.5'],
    ['str', 'Strong', 'Level above +0.5'],
    ['unk', 'Unknown', 'Level not logged']
  ],
  pulseBand = lv => (typeof lv !== 'number' ? 'unk' : lv < -0.5 ? 'beg' : lv < 0.5 ? 'mid' : 'str'),
  PULSE_MODES = {quiz: 'Quiz', 'quiz-duel': 'Duel', 'quiz-custom': 'Custom'};
// Response (shown, answered, "Not now", no answer = shown − answered − Not now, which also counts a prompt left open
// when the app closed; answered % of shown) over the prompts that log their showing: rows with an item id.
function pulseResp(L) {
  const R = L.filter(x => !x.old),
    shown = R.filter(x => x.r === PULSE_SHOWN).length,
    ans = R.filter(x => x.ans).length,
    skip = R.filter(x => x.r === PULSE_SKIP).length;
  return {shown, ans, skip, none: Math.max(0, shown - ans - skip), rate: shown ? Math.round((100 * ans) / shown) + '%' : ''};
}
// Two tables: the common scales (felt difficulty, −1 too easy to +1 too hard; feel, −1 bad to +1 good; core.js
// pulseScore) and the response by level band and by mode, then each item's answers and response by band and mode.
function pulseView(E) {
  if (!E.length) return '<p class="note">None yet.</p>';
  const P = E.filter(x => x.ans),
    cols = [
      ['', 'All', '', () => true],
      ...PULSE_BANDS.filter(([k]) => E.some(x => pulseBand(x.lv) === k)).map(([k, t, ti]) => [k, t, ti, x => pulseBand(x.lv) === k]),
      ...[...new Set(E.map(x => x.m || ''))].sort().map(m => [m, PULSE_MODES[m] || m || '?', 'Mode', x => (x.m || '') === m])
    ],
    mean = (L, k) => {
      const V = L.map(x => x[k]).filter(v => typeof v === 'number'),
        m = V.length ? Math.round((100 * V.reduce((t, v) => t + v, 0)) / V.length) / 100 : 0;
      return V.length ? `${m > 0 ? '+' : m < 0 ? '−' : ''}${Math.abs(m).toFixed(2)} <small>${V.length}</small>` : '';
    },
    rrOf = L => (L.length ? Math.round(L.reduce((t, x) => t + (x.rr || 0), 0) / L.length) + '%' : ''),
    scales = `<div class="adm-tscroll"><table class="adm-tbl adm-pscale"><thead><tr><th></th><th class="n">Answers</th><th class="n" title="−1 too easy · +1 too hard">Difficulty</th><th class="n" title="−1 bad · +1 good">Feel</th><th class="n" title="Right % of their last 10 answers, on average">Last 10 right</th><th class="n">Shown</th><th class="n" title="Answered, % of shown">Answered</th><th class="n">Devices</th></tr></thead><tbody>${cols
      .map(([, t, ti, f]) => {
        const L = P.filter(f),
          rs = pulseResp(E.filter(f));
        return `<tr><td${ti ? ` title="${esc(ti)}"` : ''}>${esc(t)}</td><td class="n">${L.length}</td><td class="n">${mean(L, 'sd')}</td><td class="n">${mean(L, 'sf')}</td><td class="n">${rrOf(L)}</td><td class="n">${rs.shown || ''}</td><td class="n">${rs.rate}</td><td class="n">${new Set(E.filter(f).map(x => x.dev)).size}</td></tr>`;
      })
      .join('')}</tbody></table></div>`,
    // The bank's items in order, then any item a newer app asked that this admin does not know (its codes as they came).
    items = [...PULSEQ, ...[...new Set(E.map(x => x.q))].filter(q => !pulseItem(q)).map(q => ({id: q, q, a: []}))],
    head = `<tr><th></th>${cols.map(([, t, ti]) => `<th class="n"${ti ? ` title="${esc(ti)}"` : ''}>${esc(t)}</th>`).join('')}</tr>`,
    // Under each item's answers (count, % of that column's answers): its "Not now", no answer, and shown with the
    // answered % (pulseResp), per column.
    meta = (L, t, cell) =>
      `<tr class="adm-pmeta"><td>${t}</td>${cols
        .map(([, , , f]) => {
          const rs = pulseResp(L.filter(f));
          return `<td class="n">${cell(rs)}</td>`;
        })
        .join('')}</tr>`,
    body = items
      .map(it => {
        const EL = E.filter(x => x.q === it.id),
          L = EL.filter(x => x.ans),
          rows = [
            ...it.a.map(([k, t]) => [k, t]),
            ...[...new Set(L.map(x => x.r))].filter(k => !it.a.some(a => a[0] === k)).map(k => [k, k])
          ];
        return `<tbody><tr class="adm-pq"><th colspan="${cols.length + 1}">${esc(it.q)} <small>${L.length}</small></th></tr>${rows
          .map(
            ([k, t]) =>
              `<tr><td>${esc(t)}</td>${cols
                .map(([, , , f]) => {
                  const C = L.filter(f),
                    n = C.filter(x => x.r === k).length;
                  return `<td class="n">${n ? `${n} <small>${Math.round((100 * n) / C.length)}%</small>` : ''}</td>`;
                })
                .join('')}</tr>`
          )
          .join('')}${meta(EL, 'Not now', rs => rs.skip || '')}${meta(EL, 'No answer', rs => rs.none || '')}${meta(EL, 'Shown', rs =>
          rs.shown ? `${rs.shown} <small>${rs.rate} answered</small>` : ''
        )}</tbody>`;
      })
      .join('');
  return `${scales}<div class="adm-tscroll"><table class="adm-tbl adm-pitems"><thead>${head}</thead>${body}</table></div>`;
}
function renderEvents() {
  status();
  if (!EVS) {
    $v.innerHTML = '<p class="note">Loading…</p>';
    loadEvents().then(() => cur === '~events' && renderEvents());
    return;
  }
  const head = `<div class="adm-shead"><h2>Errors & feedback</h2><button type="button" class="adm-link" data-evr>Refresh</button></div>`;
  if (EVS.err) {
    $v.innerHTML = head + `<p class="note">${esc(EVS.err)}</p>`;
    return bindEv();
  }
  const since = Date.now() - EV_DAYS * 864e5,
    R = EVS.rows.filter(r => r[1] >= since),
    of = k => R.filter(r => r[3] === k),
    when = t => days(t),
    group = evGroup,
    few = (S, n = 3) => esc([...S].slice(0, n).join(', ') + (S.size > n ? ` +${S.size - n}` : ''));
  const P = pulseRows(of('pulse')),
    pulse = pulseView(P);
  const errs = group(of('err'), r => r[4] + ' @ ' + r[5]),
    errT = errs.length
      ? `<div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th>Error</th><th>Devices</th><th>Times</th><th>Last</th><th>Pages</th><th>App</th><th>Browsers</th></tr></thead><tbody>${errs
          .map(
            g =>
              `<tr><td><code>${esc(g.r[4])}</code><br><small>${esc(g.r[5])}</small></td><td class="n">${g.dev.size}</td><td class="n">${g.n}</td><td>${when(g.last)}</td><td><small>${few(g.pg)}</small></td><td><small>${few(g.av)}</small></td><td><small>${few(g.ua)}</small></td></tr>`
          )
          .join('')}</tbody></table></div>`
      : '<p class="note">No app error reported.</p>';
  const phs = group(of('photo'), r => r[4]),
    phT = phs.length
      ? `<div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th>Photo</th><th>Devices</th><th>Times</th><th>Last</th><th>Browsers</th></tr></thead><tbody>${phs
          .map(g => {
            const p = Object.hasOwn(PHOTOS, g.k) ? PHOTOS[g.k] : null;
            return `<tr><td>${p ? `<button type="button" class="adm-link" data-zf="${esc(g.k)}" data-g="${esc(p.genus)}"><i>${esc(p.genus)}</i></button> ` : ''}<code>${esc(g.k)}</code></td><td class="n">${g.dev.size}</td><td class="n">${g.n}</td><td>${when(g.last)}</td><td><small>${few(g.ua)}</small></td></tr>`;
          })
          .join('')}</tbody></table></div>`
      : '<p class="note">No photo failed to load.</p>';
  const sy = group(of('sync'), r => r[4]),
    syT = sy.length
      ? `<div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th>Save problem</th><th>Devices</th><th>Times</th><th>Last</th></tr></thead><tbody>${sy
          .map(
            g =>
              `<tr><td><code>${esc(g.k)}</code></td><td class="n">${g.dev.size}</td><td class="n">${g.n}</td><td>${when(g.last)}</td></tr>`
          )
          .join('')}</tbody></table></div>`
      : '<p class="note">No failed save while online.</p>';
  // Requests from an app version before 2026-11-03 (sheet v25 'old'): who, how often, last seen.
  const od = group(of('old'), r => r[4]),
    oldT = od.length
      ? `<div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th>Request</th><th>Times</th><th>Last</th></tr></thead><tbody>${od
          .map(g => `<tr><td><code>${esc(g.k)}</code></td><td class="n">${g.n}</td><td>${when(g.last)}</td></tr>`)
          .join('')}</tbody></table></div>`
      : '<p class="note">None.</p>';
  // Load times (sheet v21 'load', one a visit): the newest 40, and the median of each column.
  const LD = of('load')
      .map(r => {
        let d = {};
        try {
          d = JSON.parse(r[7] || '{}');
        } catch (e) {}
        return {...d, t: r[1], pop: String(r[4] || '').replace(/^.*-/, ''), ua: r[9]};
      })
      .slice(0, 40),
    sec = x => (typeof x === 'number' ? x.toFixed(1) + ' s' : ''),
    qw = x => (typeof x.q1 === 'number' && typeof x.qo === 'number' ? Math.max(0, x.q1 - x.qo) : ''),
    med = L => {
      const V = L.filter(x => typeof x === 'number').sort((a, b) => a - b);
      return V.length ? V[Math.floor(V.length / 2)] : '';
    },
    ldT = LD.length
      ? `<div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th>When</th><th>Browser</th><th>Line</th><th>First page</th><th>Quiz photo</th><th>Downloaded</th><th>Cache</th><th>Saver</th><th>Installed</th><th>Theme</th><th>Server</th><th>Next</th></tr></thead><tbody><tr><td>Median</td><td></td><td class="n">${med(LD.map(x => x.bps))} kbit/s</td><td class="n">${sec(med(LD.map(x => x.t0)))}</td><td class="n">${sec(med(LD.map(qw)))}</td><td class="n">${med(LD.map(x => x.kb))} KB</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>${LD.map(
          x =>
            `<tr><td>${when(x.t)}</td><td><small>${esc(x.ua || '')}</small></td><td class="n">${x.bps ? esc(x.bps) + ' kbit/s' : ''}</td><td class="n">${sec(x.t0)} <small>${esc(x.p0 || '')}</small></td><td class="n">${sec(qw(x))}</td><td class="n">${esc(x.kb ?? '')} KB</td><td>${x.sw ? 'yes' : ''}</td><td>${x.sv ? 'yes' : ''}</td><td>${x.st ? 'yes' : ''}</td><td>${esc(x.th || '')}</td><td>${esc(x.pop)}</td><td><small>${esc(x.nx || '')}</small></td></tr>`
        ).join('')}</tbody></table></div>`
      : '<p class="note">None yet.</p>';
  $v.innerHTML =
    head +
    kpis([
      ['One-tap answers', P.filter(x => x.ans).length],
      ['App errors', of('err').length],
      ['Photos not loaded', of('photo').length],
      ['Failed saves', of('sync').length],
      ['Old app versions', of('old').length],
      ['Visits timed', of('load').length],
      ['Installed app', LD.filter(x => x.st).length + ' / ' + LD.length]
    ]) +
    `<div class="adm-sgrid adm-ev">
    <section class="adm-scard wide adm-pulse"><h3>One-tap questions · ${EV_DAYS} days</h3>${pulse}</section>
    <section class="adm-scard wide"><h3>App errors</h3>${errT}</section>
    <section class="adm-scard"><h3>Photos that did not load</h3>${phT}</section>
    <section class="adm-scard"><h3>Saves that failed</h3>${syT}</section>
    <section class="adm-scard"><h3>Old app versions</h3>${oldT}</section>
    <section class="adm-scard wide"><h3>Load times</h3>${ldT}</section>
    </div>`;
  bindEv();
}
function bindEv() {
  const r = $v.querySelector('[data-evr]');
  if (r) r.onclick = () => loadEvents(true).then(() => cur === '~events' && renderEvents());
  $v.querySelectorAll('[data-zf]').forEach(b => (b.onclick = () => zoom(b.dataset.g, b.dataset.zf)));
}
// Triage: only what needs Pierre's eye. 1) photos he flagged on the site, with where they were seen;
// 2) Featured photos rated Poor. Views without his own Featured pick are not a task (Pierre): the automatic pick is fine.
function renderTriage() {
  status();
  const F = DRAFT.flag || {},
    flagged = Object.keys(F).map(f => ({...(PHOTOS[f] || {genus: F[f].genus || '?'}), f, fl: F[f]}));
  const when = t => {
    try {
      return dateText(t, 'dmhm');
    } catch (e) {
      return '';
    }
  };
  const tile = (p, acts, cap) => `<figure class="adm-tile" data-f="${esc(p.f)}" data-g="${esc(p.genus)}">
      <button type="button" class="adm-ph" data-act="zoomx" aria-label="Enlarge">${PHOTOS[p.f] ? `<img src="${img(p, 1)}" alt="" loading="lazy">` : '<span class="none">missing</span>'}</button>
      <figcaption><a class="adm-gen" href="#${esc(p.genus)}"><i>${esc(p.genus)}</i></a>${cap}</figcaption><div class="adm-acts">${acts}</div></figure>`;
  // A flagged photo still on a genus page gets every tool of that page (Pierre: often flagged for its zoom level), plus Done.
  const flagTile = p => {
    const n = p.genus,
      q = DATA.gen[n] && [...photos(n), ...pending(n)].find(x => x.f === p.f),
      where = `<small class="adm-where">${esc(p.fl.where || '')} · ${esc(when(p.fl.at))}</small>`;
    if (!q)
      return tile(
        p,
        `<button type="button" data-act="tpoor">Poor</button><button type="button" data-act="tdone">Done</button>`,
        `<span class="adm-src view">${esc((VIEWS.find(x => x[0] === p.fl.view) || [, p.fl.view || ''])[1])}</span>${where}`
      );
    const cv = coverOf(n);
    SHOWN_COVER = cv && cv.f;
    return tile0(n, q, viewOf(n, q), {
      cls: hidden(n, q) ? 'is-hidden' : '',
      extra: `<button type="button" class="adm-tdone" data-tdone>✓ Done</button>`
    })
      .replace('<figure class="adm-tile', `<figure data-g="${esc(n)}" class="adm-tile`)
      .replace(GRIP, '')
      .replace('<figcaption>', `<figcaption><a class="adm-gen" href="#${esc(n)}"><i>${esc(n)}</i></a>${where}`);
  };
  // A reported photo: every tool of its genus page, like a flagged one; Done is per report.
  const repTile = (f, g0) => {
    const n = (PHOTOS[f] || {}).genus || g0,
      q = DATA.gen[n] && [...photos(n), ...pending(n)].find(x => x.f === f);
    if (!q) return tile({...(PHOTOS[f] || {}), f, genus: n}, '', '');
    const cv = coverOf(n);
    SHOWN_COVER = cv && cv.f;
    return tile0(n, q, viewOf(n, q), {cls: hidden(n, q) ? 'is-hidden' : ''})
      .replace('<figure class="adm-tile', `<figure data-g="${esc(n)}" class="adm-tile`)
      .replace(GRIP, '')
      .replace('<figcaption>', `<figcaption><a class="adm-gen" href="#${esc(n)}"><i>${esc(n)}</i></a>`);
  };
  const reps = repsOpen(),
    repCard = r => {
      const [id, t, who, ok, why, g, a, fix, note, m, ph, w] = r,
        play = !/^(photo|sheet|page)$/.test(m);
      return `<article class="adm-rep" data-rep="${esc(id)}"><div class="adm-rephead"><b class="adm-repwho${ok ? '' : ' unv'}" title="${ok ? 'Verified' : 'Not verified'}">${esc(who || 'Anonymous')}${ok ? '' : ' ?'}</b>
      <span class="adm-repwhy">${esc(why === 'wrong' && !play ? 'Wrong genus' : REP_WHY[why] || why)}</span>${g ? `<span><a class="adm-gen" href="#${esc(g)}"><i>${esc(g)}</i></a>${a && a !== g ? ` · answered <i>${esc(a)}</i>` : ''}</span>` : ''}${fix ? `<span class="adm-repfix">→ <i>${esc(fix)}</i></span>` : ''}
      <small class="adm-where">${esc(play ? 'game ' + m : m)}${w ? ` · <a href="index.html#${esc(w)}" target="_blank" rel="noopener">${esc(w)}</a>` : ''} · ${esc(when(t))}</small><button type="button" class="adm-tdone" data-rdone="${esc(id)}">✓ Done</button></div>
      ${note ? `<p class="adm-repnote">${esc(note)}</p>` : ''}${
        ph
          ? `<div class="adm-grid adm-qgrid adm-flagged">${ph
              .split(/\s+/)
              .filter(Boolean)
              .map(f => repTile(f, g))
              .join('')}</div>`
          : ''
      }</article>`;
    };
  const poor = [];
  Object.entries(DRAFT.genera).forEach(([n, k]) =>
    Object.entries(k.feat || {}).forEach(([v, L]) =>
      L.forEach(f => {
        if (PHOTOS[f] && !offSlot(PHOTOS[f]) && qOf(f) === 1) poor.push({...PHOTOS[f], f, genus: n, fv: v});
      })
    )
  );
  // All (To do, Pierre 2026-11-03): by urgency, Health's red line first (only when something is wrong), then the
  // reports and flags, the devices' errors, Featured photos rated Poor, the judging agent's suggestions last. Reports =
  // the same without Health and the errors (the old Triage page). Answers and errors load behind the page.
  const all = cur === '~todo';
  if (all && !ANS) loadStats().then(() => cur === '~todo' && render());
  if (all && !EVS) loadEvents().then(() => cur === '~todo' && render());
  $v.innerHTML = `<section class="adm-quality">${all ? healthLine() : ''}
    <div class="adm-qhead"><h2>Reports and feedback <small>${REPS && REPS.rows ? reps.length : ''}</small></h2>${REPS && REPS.err ? `<small class="adm-where">${esc(REPS.err)}</small>` : ''}<button type="button" class="adm-fchip plain" data-rload title="Reload">↻</button></div>
    ${reps.length ? reps.map(repCard).join('') : REPS && REPS.rows ? '<p class="note">Nothing reported.</p>' : ''}
    <div class="adm-qhead"><h2>Flagged on the site <small>${flagged.length}</small></h2></div>
    ${flagged.length ? `<div class="adm-grid adm-qgrid adm-flagged">${flagged.map(flagTile).join('')}</div>` : '<p class="note">Nothing flagged.</p>'}
    ${all ? evSummary() : ''}
    ${poor.length ? `<div class="adm-qhead"><h2>Featured but rated Poor <small>${poor.length}</small></h2></div><div class="adm-grid adm-qgrid">${poor.map(p => tile(p, '<a class="chip" href="#' + esc(p.genus) + '">Open genus</a>', `<span class="adm-src view">${esc((VIEWS.find(x => x[0] === p.fv) || [, p.fv])[1])}</span>`)).join('')}</div>` : ''}
    ${sugHtml(tile)}
  </section>`;
  bindSug();
  const done = f => {
    DRAFT.flag = {...(DRAFT.flag || {})};
    delete DRAFT.flag[f];
  };
  $v.querySelectorAll('[data-act="tdone"],[data-tdone]').forEach(
    b =>
      (b.onclick = () => {
        done(b.closest('[data-f]').dataset.f);
        saveDraft();
        render();
      })
  );
  const FL = $v.querySelectorAll('.adm-flagged');
  FL.forEach(x => {
    bindTiles(x, t => t.dataset.g);
    bindF(x);
  });
  if (FL.length) bindQ();
  $v.querySelectorAll('[data-rdone]').forEach(
    b =>
      (b.onclick = () => {
        DRAFT.seen = {...(DRAFT.seen || {}), ['rep:' + b.dataset.rdone]: 1};
        saveDraft();
        render();
      })
  );
  const rl = $v.querySelector('[data-rload]');
  if (rl)
    rl.onclick = () =>
      loadReports(true).then(() => {
        if (cur === '~triage' || cur === '~todo') render();
      });
  if (!REPS)
    loadReports().then(() => {
      if (cur === '~triage' || cur === '~todo') render();
    });
  $v.querySelectorAll('[data-act="tpoor"]').forEach(
    b =>
      (b.onclick = () => {
        const f = b.closest('[data-f]').dataset.f;
        DRAFT.quality = {...(DRAFT.quality || {}), [f]: 1};
        done(f);
        saveDraft();
        render();
      })
  );
  $v.querySelectorAll('[data-act="thide"]').forEach(
    b =>
      (b.onclick = () => {
        const t = b.closest('[data-f]'),
          n = t.dataset.g,
          f = t.dataset.f;
        if (!DATA.gen[n]) return;
        done(f);
        if (!(entry(n).hide || []).includes(f)) ACT.hide(n, f);
        else {
          saveDraft();
          render();
        }
      })
  );
  $v.querySelectorAll('[data-act="zoomx"]').forEach(
    b =>
      (b.onclick = () => {
        const p = PHOTOS[b.closest('[data-f]').dataset.f];
        if (p) zoomOne(p);
      })
  );
}
/* ---------- Look-alikes (was "Montages"): one photo pair per classic look-alike pair (curation.json "mont" {"A|B": {v, a, b}}) ---------- */
// Same pairs, order and automatic pick as the site (app.js classics / montage): pairs a source compares in so many words.
const MONT_V = {
  'Pocillopora|Stylophora': 'medium',
  'Acropora|Anacropora': 'medium',
  'Acropora|Cyphastrea': 'medium',
  'Acropora|Echinopora': 'medium',
  'Goniopora|Porites': 'medium',
  'Danafungia|Fungia': 'medium',
  'Fungia|Lithophyllon': 'medium',
  'Danafungia|Lithophyllon': 'medium'
};
function classicPairs() {
  const G = DATA.gen,
    src = (a, b) => (G[a].lsrc || {})[b] || (G[b].lsrc || {})[a] || '',
    idx = n => Object.keys(G).indexOf(n),
    seen = new Set(),
    out = [];
  Object.keys(G).forEach(a =>
    G[a].look.forEach(b => {
      const k = [a, b].sort().join('|');
      if (G[b] && !seen.has(k) && /^(IMR|Coral Finder p)/.test(src(a, b))) {
        seen.add(k);
        out.push({k, A: k.split('|')[0], B: k.split('|')[1], src: src(a, b)});
      }
    })
  );
  const tier = p => (/^IMR/.test(p.src) ? 0 : 1);
  return out.sort((x, y) => tier(x) - tier(y) || Math.min(idx(x.A), idx(x.B)) - Math.min(idx(y.A), idx(y.B)));
}
// "all" = photos of every zoom level (Pierre, 2026-11-01), so a pair can show two nearby zooms; the automatic pick then
// prefers the nearest levels. "hide" keeps the comparison off the site until good examples exist; "Auto" drops his
// view and photo picks (the hide stays). Both are per pair and go through Undo like every other click.
const MONT_VIEWS = [...VIEWS, ['all', 'All']],
  ZOOM = {wide: 0, medium: 1, macro: 2};
const montList = (n, v) => (v === 'all' ? VIEWS.flatMap(([w]) => montList(n, w)) : (r => [...r.feat, ...r.rest])(rowOf(n, v)));
function montPick(p) {
  const e = (DRAFT.mont || {})[p.k] || {},
    m = e,
    ok = v => v && montList(p.A, v).length && montList(p.B, v).length;
  const v = ok(m.v) ? m.v : [MONT_V[p.k] || 'macro', 'macro', 'medium', 'wide'].find(ok);
  if (!v) return {v: null, hide: !!e.hide};
  const LA = montList(p.A, v),
    LB = montList(p.B, v),
    mine = m.v === v,
    fa = mine && LA.find(x => x.f === m.a),
    fb = mine && LB.find(x => x.f === m.b);
  const gap = (x, y) => (v === 'all' ? 4 * Math.abs(ZOOM[viewOf(p.A, x)] - ZOOM[viewOf(p.B, y)]) : 0);
  let best = null;
  (fa ? [fa] : LA.slice(0, 6)).forEach((x, i) =>
    (fb ? [fb] : LB.slice(0, 6)).forEach((y, j) => {
      const sc = i + j + (fOf(x.f) && fOf(x.f) === fOf(y.f) ? 0 : 8) + gap(x, y);
      if (!best || sc < best[0]) best = [sc, x, y];
    })
  );
  return {v, a: best[1], b: best[2], set: !!m.v, hide: !!e.hide, LA, LB};
}
// Write one pair's entry (null fields dropped; an empty entry is removed, so the row is automatic again).
function setMont(k, e) {
  const out = {};
  Object.entries(e).forEach(([x, y]) => {
    if (y) out[x] = y;
  });
  const M = {...(DRAFT.mont || {})};
  if (Object.keys(out).length) M[k] = out;
  else delete M[k];
  DRAFT.mont = M;
  saveDraft();
}
function renderMont() {
  status();
  const L = classicPairs();
  const strip = (p, side, list, chosen) =>
    `<div class="adm-mstrip">${list.map(x => `<button type="button" class="adm-mth${x.f === chosen.f ? ' on' : ''}" data-k="${esc(p.k)}" data-side="${side}" data-f="${esc(x.f)}" title="${esc(x.t || '')}"><img src="${img(x, 1)}" alt="" loading="lazy">${srcTag(x)}</button>`).join('')}</div>`;
  $v.innerHTML = `<section class="adm-quality adm-mont">${L.map(p => {
    const m = montPick(p);
    return `<article class="adm-mrow${m.set ? ' set' : ''}${m.hide ? ' off' : ''}"><div class="adm-mhead"><b><i>${esc(p.A)}</i> / <i>${esc(p.B)}</i></b><small>${esc(p.src)}</small>
      <span class="adm-qseg adm-lvseg" role="group" aria-label="View">${MONT_VIEWS.map(([w, t]) => `<button type="button" data-k="${esc(p.k)}" data-mv="${w}" aria-pressed="${m.v === w}"${montList(p.A, w).length && montList(p.B, w).length ? '' : ' disabled'}>${t}</button>`).join('')}</span><span class="adm-qseg adm-lvseg" role="group" aria-label="Pick"><button type="button" data-k="${esc(p.k)}" data-mauto aria-pressed="${!m.set}" title="Automatic pick">Auto</button><button type="button" aria-pressed="${m.set}" disabled title="Manual">Manual</button></span>
      <span class="adm-qseg adm-lvseg adm-mvis" role="group" aria-label="On the site"><button type="button" data-k="${esc(p.k)}" data-mhide="0" aria-pressed="${!m.hide}" title="Shown on the site">Shown</button><button type="button" data-k="${esc(p.k)}" data-mhide="1" aria-pressed="${m.hide}" title="Hidden from the site">Hidden</button></span></div>
      ${
        m.v
          ? `<div class="adm-mbody"><div class="adm-mprev"><img src="${img(m.a)}" alt="${esc(p.A)}"><img src="${img(m.b)}" alt="${esc(p.B)}"></div>
        <div class="adm-msides"><div><i>${esc(p.A)}</i>${strip(p, 'a', m.LA, m.a)}</div><div><i>${esc(p.B)}</i>${strip(p, 'b', m.LB, m.b)}</div></div></div>`
          : '<p class="note">No view with photos of both.</p>'
      }</article>`;
  }).join('')}</section>`;
  const cur = k => ({...((DRAFT.mont || {})[k] || {})});
  const keep = fn => {
    const y = window.scrollY;
    fn();
    renderMont();
    window.scrollTo(0, y);
  };
  // Changing the view keeps the two photos on show when they belong to the new view (always so for All).
  $v.querySelectorAll('[data-mv]').forEach(
    b =>
      (b.onclick = () =>
        keep(() => {
          const k = b.dataset.k,
            w = b.dataset.mv,
            p = L.find(x => x.k === k),
            m = montPick(p);
          const has = (n, x) => (x && montList(n, w).some(y => y.f === x.f) ? x.f : null);
          setMont(k, {hide: cur(k).hide, v: w, a: has(p.A, m.a), b: has(p.B, m.b)});
        }))
  );
  $v.querySelectorAll('.adm-mth').forEach(
    b =>
      (b.onclick = () =>
        keep(() => {
          const k = b.dataset.k,
            p = L.find(x => x.k === k),
            m = montPick(p);
          setMont(k, {hide: m.hide, v: m.v, a: m.a && m.a.f, b: m.b && m.b.f, [b.dataset.side]: b.dataset.f});
        }))
  );
  $v.querySelectorAll('[data-mauto]').forEach(
    b =>
      (b.onclick = () => {
        if (cur(b.dataset.k).v) keep(() => setMont(b.dataset.k, {hide: cur(b.dataset.k).hide}));
      })
  );
  $v.querySelectorAll('[data-mhide]').forEach(
    b =>
      (b.onclick = () => {
        const e = cur(b.dataset.k),
          h = b.dataset.mhide === '1';
        if (!!e.hide !== h) keep(() => setMont(b.dataset.k, {...e, hide: h}));
      })
  );
}
/* ---------- Triage: the judging agent's suggestions (suggest.json) ---------- */
const seen = k => !!(DRAFT.seen || {})[k];
const vName = (n, v) => (DATA.gen[n] ? label(n, v) : v);
// Pending suggestions only: once accepted (the curation now says the same) or dismissed, an item disappears.
function sugItems() {
  const S = SUG || {},
    P = S.photo || {},
    out = {genus: [], view: [], multi: [], dup: [], add: []};
  const live = (n, f) => photos(n).find(p => p.f === f && !p.from);
  Object.entries(P).forEach(([f, s]) => {
    const n = s.from;
    if (!DATA.gen[n] || excl(f)) return;
    const p = live(n, f),
      un = s.unsure || [];
    if (s.genus === 'exclude') {
      if (!seen('genus:' + f) && (p || cands(n).some(x => x.f === f))) out.genus.push({...(PHOTOS[f] || {}), f, genus: n, s, un});
    } else if (s.genus && p && !outs(n)[f] && !seen('genus:' + f)) out.genus.push({...p, genus: n, s, un});
    if (s.view && p && !outs(n)[f] && !hidden(n, p) && viewOf(n, p) !== s.view && !seen('view:' + f))
      out.view.push({...p, genus: n, s, un});
    if (s.multi && p && !hidden(n, p) && !(DRAFT.use || {})[f] && !seen('multi:' + f)) out.multi.push({...p, genus: n, s, un});
  });
  // Near-duplicates: the judging agent's and tools/find_dups.py's (dups.json), candidates included.
  const any = (n, f) => live(n, f) || pending(n).find(p => p.f === f);
  [...(S.dup || []), ...DUPS].forEach(d => {
    const n = d.genus;
    if (!DATA.gen[n] || seen('dup:' + d.keep) || excl(d.keep) || !any(n, d.keep)) return;
    const left = d.f.filter(f => !excl(f) && any(n, f) && !(live(n, f) && hidden(n, live(n, f))));
    if (left.length) out.dup.push({...d, left});
  });
  Object.entries(S.add || {}).forEach(([n, A]) => {
    if (!DATA.gen[n]) return;
    const added = entry(n).add || {};
    Object.entries(A).forEach(([f, v]) => {
      const p = pending(n).find(x => x.f === f);
      if (p && !added[f] && !seen('add:' + f)) out.add.push({...p, genus: n, to: v});
    });
  });
  return out;
}
const sugCount = () => {
  if (!DATA || !DRAFT || (!Object.keys(SUG || {}).length && !DUPS.length)) return 0;
  const o = sugItems();
  return o.genus.length + o.view.length + o.multi.length + o.dup.length + o.add.length;
};
function sugHtml(tile) {
  if (!Object.keys(SUG || {}).length && !DUPS.length) return '';
  const o = sugItems(),
    dis = k => `<button type="button" data-sg="dismiss" data-k="${esc(k)}">Dismiss</button>`;
  const why = p =>
    `${p.un && p.un.length ? '<span class="adm-src multi" title="The judge is not sure">unsure</span>' : ''}${p.s && p.s.note ? `<small class="adm-where">${esc(p.s.note)}</small>` : ''}`;
  const sec = (title, L, body) => (L.length ? `<div class="adm-qhead"><h2>${title} <small>${L.length}</small></h2></div>${body}` : '');
  const grid = (L, fn) => `<div class="adm-grid adm-qgrid">${L.map(fn).join('')}</div>`;
  const gName = g => (g === 'cmp' ? 'Look-alike comparison' : g === 'exclude' ? 'Exclude for good' : g);
  return (
    sec(
      'Suggested: not this genus',
      o.genus,
      grid(o.genus, p =>
        tile(
          p,
          `<button type="button" data-sg="genus" data-to="${esc(p.s.genus)}">${p.s.genus === 'exclude' ? 'Exclude' : 'Accept'}</button>${dis('genus:' + p.f)}`,
          `<span class="adm-src new">→ ${esc(gName(p.s.genus))}</span>${why(p)}`
        )
      )
    ) +
    sec(
      'Suggested: move to another view',
      o.view,
      grid(o.view, p =>
        tile(
          p,
          `<button type="button" data-sg="view" data-to="${esc(p.s.view)}">Move to ${esc(vName(p.genus, p.s.view))}</button>${dis('view:' + p.f)}`,
          `<span class="adm-src view">${esc(vName(p.genus, viewOf(p.genus, p)))} → ${esc(vName(p.genus, p.s.view))}</span>${why(p)}`
        )
      )
    ) +
    sec(
      'Suggested: several corals (keep off games)',
      o.multi,
      grid(o.multi, p => tile(p, `<button type="button" data-sg="multi">Keep off games</button>${dis('multi:' + p.f)}`, why(p)))
    ) +
    sec(
      'Suggested: near-duplicates',
      o.dup,
      o.dup
        .map(
          d =>
            `<div class="adm-grid adm-qgrid adm-dup">${tile({...PHOTOS[d.keep], f: d.keep, genus: d.genus}, dis('dup:' + d.keep), `<span class="adm-src new">Keep</span>${d.note ? `<small class="adm-where">${esc(d.note)}</small>` : ''}`)}${d.left.map(f => tile({...PHOTOS[f], f, genus: d.genus}, `<button type="button" data-sg="genus" data-to="exclude">Exclude</button>`, '<span class="adm-src multi">Duplicate</span>')).join('')}</div>`
        )
        .join('')
    ) +
    sec(
      'Suggested: candidates to add',
      o.add,
      grid(o.add, p =>
        tile(
          p,
          `<button type="button" data-sg="add" data-to="${esc(p.to)}">Add to ${esc(vName(p.genus, p.to))}</button>${dis('add:' + p.f)}`,
          srcTag(p)
        )
      )
    )
  );
}
function bindSug() {
  const on = (a, fn) =>
    $v.querySelectorAll(`[data-sg="${a}"]`).forEach(
      b =>
        (b.onclick = () => {
          const t = b.closest('[data-f]'),
            n = t.dataset.g;
          if (DATA.gen[n]) fn(n, t.dataset.f, b.dataset.to);
        })
    );
  on('genus', (n, f, to) => (to === 'exclude' ? ACT.exclude(n, f) : ACT.out(n, f, null, to)));
  on('view', (n, f, to) => ACT.move(n, f, null, to));
  on('hide', (n, f) => ACT.hide(n, f));
  on('add', (n, f, to) => ACT.addc(n, f, null, to));
  on('multi', (n, f) => {
    DRAFT.use = {...(DRAFT.use || {}), [f]: 'ref'};
    saveDraft();
    render();
  });
  $v.querySelectorAll('[data-sg="dismiss"]').forEach(
    b =>
      (b.onclick = () => {
        DRAFT.seen = {...(DRAFT.seen || {}), [b.dataset.k]: 1};
        saveDraft();
        render();
      })
  );
}
// A click on the enlarged photo shows it at actual size, as in the games (app.js zoom; Pierre, 2026-11-02).
const lbFull = lb => {
  const im = lb.querySelector('.lb-in img');
  if (!im) return;
  im.title = 'Click for actual size';
  im.onclick = e => {
    e.stopPropagation();
    lb.classList.toggle('full');
  };
};
function zoomOne(p) {
  const lb = $('lightbox'),
    close = () => {
      lb.hidden = true;
      lb.classList.remove('full');
      lb.innerHTML = '';
      document.removeEventListener('keydown', key);
    },
    key = e => {
      if (e.key === 'Escape') close();
    };
  lb.innerHTML = `<div class="lb-in"><img ${crSrc(p)} alt=""><p class="lb-cap">${lbCap(p.genus, p)}</p><div class="lb-nav"><button type="button" data-x>Close</button></div></div>`;
  lb.querySelector('[data-x]').onclick = close;
  lbFull(lb);
  lb.hidden = false;
  lb.onclick = e => {
    if (e.target === lb) close();
  };
  document.addEventListener('keydown', key);
}

/* ---------- Candidates, one per screen (made for the phone) ---------- */
// Every new candidate of every genus, one at a time: set its quality and growth form, then add it to a view,
// reject it, send it to another genus ("Not this") or skip it. Reject is only a "reviewed" mark (curation.json
// "seen" {'cand:f': 1}): the photo stays a candidate on its genus page, nothing is deleted. Genera take turns,
// in a shuffled order kept in this browser; within a genus, Pierre's photos first, then Dauin, Philippines, CF book.
const CK = f => 'cand:' + f,
  rejected = f => !!(DRAFT.seen || {})[CK(f)];
const CSRCS = [
  ['own', 'Pierre'],
  ['dauin', 'Dauin'],
  ['ph', 'PH'],
  ['book', 'CF'],
  ['all', 'All']
];
let CSRC = store.get('reefid-admin-csrc2', 'dauin'),
  CSKIP = new Set(),
  CFULL = false, // this tab: also show the candidates waiting in full cells
  CASIDE = false, // this tab: also show the candidates the pre-sort set aside
  CREPL = null; // {n, f, w}: adding f to a full cell, choosing the colony it replaces
// Cap per genus x view: capOf (top of the file: CELL_MAX for a game genus, CAP.sheet for a Finder-only one). A full
// cell's candidates leave the swiper (counted, shown on demand) and come back when it drops below; adding one to a full cell asks which colony it replaces in the games (that
// colony's photos of the view become "sheet only", curation.json use 'ref': still on the genus sheet), or adds anyway.
// Colonies, not photos: a question shows the views of one colony. A candidate from a colony already in the cell adds none.
const cellView = (n, p) => {
  const v = p.vg || p.view;
  return v === 'medium' && lv(n) === 2 ? 'wide' : v;
};
// Only photos that can enter the games count against the cap: a Coral Finder book photo or a several-corals one never does.
const gameable = p => !p.cf && !p.multi;
const cellFull = (n, w, o) => {
  const c = covOf(n, w);
  return c.obs >= capOf(n) && !(o && c.L.some(q => q.o === o));
};
const srcOk = (p, s) => s === 'all' || origin(p) === s;
// Order (Pierre): random, but genus x view cells with few photos come up more often, so the gaps for the games fill
// first. Each candidate's weight is 1 / (1 + game colonies the genus already has in its view, covOf as on the Coverage page)^3 (cubed since
// 2026-11-01, Pierre: "weigh the genera that really lack photos more strongly"; first 50 of All: thin cells 0-2 colonies 12 -> 30,
// cells with 8+ 11 -> 2): its guessed view (vg, Claude's
// guess from the photo), else the genus's emptiest view; x3 when it completes a colony already in games at another zoom. Weighted random draw (key -ln(u) / w, u fixed per photo
// and per device), then no two of the same genus in a row when it can be avoided.
// Game genera first (Pierre, 2026-11-03, isGame): the candidates of a Finder-only genus come after every candidate of a
// game genus of the source, in their own weighted draw, and only in its Colony and Close-up views (capViews): one
// guessed to be a corallite photo (vg macro) is not proposed.
// Judged candidates (suggest.json "cand", Pierre 2026-11-01: keep real diversity, sort by hand after a pre-sort): the
// best photo of each view of an observation first, other angles later, near-duplicates, Poor photos, several corals and
// other genera last. Only the sure unusable ones, several corals, Poor photos, comparison images and near-duplicates are
// set aside (aside, below); every other candidate still comes up. Not judged yet = like a best Fair photo.
const JK = {best: 1, alt: 0.3, dup: 0.04},
  JQ = {3: 1.3, 2: 1, 1: 0.15};
const jw = p => {
  const j = p.j;
  if (!j) return 1;
  if (j.g) return 0.02;
  return (JK[j.k] || 1) * (JQ[j.q] || 1) * (j.m ? 0.3 : 1);
};
const JKT = {
  best: 'best photo of its observation in this view',
  alt: 'another angle of its observation',
  dup: 'near-duplicate of another photo of its observation'
};
// Set aside by the pre-sort (Pierre, 2026-11-03: "il ne faut pas que je me retrouve à devoir faire des tris sur des choses
// évidentes"): a candidate the judging agent found unusable (no coral, aquarium, museum specimen or label, drawing,
// hand over the frame…), a comparison image, a near-duplicate of another photo of its observation (candidate or live),
// a photo of several corals or a Poor one (rules learnt from 85 photos he rejected, judging/AGENTS.md), without any
// doubt (no `unsure`), no longer comes up; a count and a Show link keep them reachable. Same rule as
// tools/excluded.py set_aside: keep both identical.
const aside = p =>
  !!(p.j && (p.j.g === 'exclude' || p.j.g === 'cmp' || p.j.k === 'dup' || p.j.m || p.j.q === 1) && !(p.j.u && p.j.u.length));
const jLine = p => {
  const j = p.j;
  if (!j) return '';
  const what = j.g === 'exclude' ? 'unusable' : j.g === 'cmp' ? 'comparison image' : j.g ? `looks like <i>${esc(j.g)}</i>` : JKT[j.k] || '';
  return `<p class="adm-judge${j.g ? ' warn' : ''}" title="Suggestion of the judging agent (suggest.json)">Judged: ${what}${j.m ? ' · several corals' : ''}${j.u ? ` · unsure: ${esc(j.u.join(', '))}` : ''}${j.n ? ` · ${esc(j.n)}` : ''}${sugCrop(p) ? ' · crop suggested (Crop to change it)' : ''}${p.mf ? ` · metrics: ${esc(p.mf)}` : ''}</p>`;
};

/* ---------- Auto-sort (autosort.js; Pierre, 2026-11-03: "take the obvious off my hands") ---------- */
// What the candidate pass is sure of is decided without him: at each load of this page, autoRun() writes the sure
// judgments into the draft exactly as his clicks would (add with the view, quality, growth form and suggested crop; ✕
// Reject; × exclude), and logs each one in curation.json "auto" (autosort.js has the format). Publish sends them like any
// draft, merged key by key (merge3); Undo takes the whole run back in one step; Auto › Undo on one decision sends that
// photo back to Candidates for good. About 1 in 20 sure candidates is not applied but shown to him, blind, with a Check
// tag (autoCheck); his answer against the judgment, and any later correction of an auto decision, give the agreement
// per field (autoCompare, autoState); a field under its threshold stops being applied until it recovers. Once every
// AUTO.retest candidates he decides, a photo he rated before comes back blind (Retest): his consistency, the ceiling.
let METRICS = {},
  MREF = null, // sharpness of the candidates measured: sorted list, 5th and 95th percentiles (metFlag, evidence)
  ADET = false, // this tab: Auto details open
  AALL = false, // this tab: every auto decision listed (else the latest 30)
  CDONE = 0, // candidates decided in the swiper since the last Retest card (this tab)
  RTSKIP = new Set(),
  RTA = {}; // the Retest card's answers so far
const aIdx = () => MEMO.aidx || (MEMO.aidx = autoIdx(DRAFT)),
  aCmp = () => MEMO.acmp || (MEMO.acmp = autoCompare(DRAFT)),
  aState = () => MEMO.ast || (MEMO.ast = autoState(aCmp())),
  aOf = f => aIdx()[f],
  // Applied by the auto-sort and still standing (not a Check, not undone).
  aApplied = f => {
    const x = aOf(f);
    return x && !x.d.check && !x.d.undone ? x.d : null;
  },
  auChanged = () => !same(DRAFT.auto || {}, SAVED.auto || {}) || !same(DRAFT.retest || {}, SAVED.retest || {});
const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
function autoRun() {
  if (!DATA || !DRAFT || !Object.keys((SUG && SUG.cand) || {}).length) return null;
  const ST = aState(),
    idx = aIdx(),
    plan = [];
  Object.keys(DATA.gen).forEach(n => {
    const add = entry(n).add || {},
      vs = capViews(n).map(x => x[0]);
    cands(n).forEach(p => {
      // Not a book crop, not a photo Pierre sent here from another genus, judged, not stopped by the metrics, not decided.
      if (p.cf || p.from || !p.j || p.mf || add[p.f] || rejected(p.f) || idx[p.f]) return;
      const s = autoSure(p.j);
      if (!s) return;
      if (s.keep === 'add') {
        s.view = cellView(n, {vg: s.view});
        if (!vs.includes(s.view)) return; // a Finder-only genus takes no Corallites candidates (capViews)
      }
      plan.push({n, p, s, check: autoCheck(p.f)});
    });
  });
  if (!plan.length) return null;
  // Each cell fills up to its cap (capOf, colonies): source priority first (AGENTS.md rule 7, oIdx: IMR, Pierre's own,
  // then other observers; Codex review #400: another observer's Good photo took the last slot ahead of Pierre's Fair
  // one), then Good before Fair, then the sharper one (metrics.json, a tie-breaker only), then a fixed order. The adds
  // that do not fit wait in their full cell, as candidates.
  const sh = p => (METRICS[p.f] || [0])[0];
  plan.sort(
    (a, b) =>
      (b.s.keep === 'add') - (a.s.keep === 'add') ||
      oIdx(a.p) - oIdx(b.p) ||
      (b.s.quality || 0) - (a.s.quality || 0) ||
      sh(b.p) - sh(a.p) ||
      (a.p.f < b.p.f ? -1 : 1)
  );
  const room = {},
    fits = (n, v, p) => {
      if (!gameable(p)) return true;
      const k = n + '|' + v,
        o = p.o || p.f;
      if (!room[k]) room[k] = new Set(covOf(n, v).L.map(q => q.o || q.f));
      if (room[k].has(o)) return true;
      if (room[k].size >= capOf(n)) return false;
      room[k].add(o);
      return true;
    };
  const day = localDay(),
    L = {...((DRAFT.auto || {})[day] || {})},
    R = {add: 0, reject: 0, exclude: 0, check: 0, full: 0, off: 0},
    on = {quality: ST.quality.on, form: ST.form.on};
  plan.forEach(({n, p, s, check}) => {
    const f = p.f;
    if (check) {
      L[f] = autoCode(s, null, true);
      R.check++;
    } else if (!ST.keep.on || (s.keep === 'add' && !ST.view.on)) R.off++;
    else if (s.keep === 'add') {
      if (!fits(n, s.view, p)) return R.full++;
      const k = (DRAFT.genera[n] = {...entry(n)});
      k.add = {...(k.add || {}), [f]: s.view};
      // A rating, form or crop Pierre already gave this candidate stays his (logged "." : not an auto value).
      const set = {quality: on.quality && !qSet(f), form: on.form && !mineF(f)};
      if (set.quality) DRAFT.quality = {...(DRAFT.quality || {}), [f]: s.quality};
      if (set.form) DRAFT.gf = {...(DRAFT.gf || {}), [f]: s.form};
      const crop = !!(s.crop && !crOf(f));
      if (crop) DRAFT.crop = {...(DRAFT.crop || {}), [f]: s.crop};
      L[f] = autoCode(s, set, false, crop);
      R.add++;
    } else if (s.keep === 'exclude') {
      DRAFT.exclude = {...(DRAFT.exclude || {}), [f]: 'auto'};
      L[f] = 'x';
      R.exclude++;
    } else {
      DRAFT.seen = {...(DRAFT.seen || {}), [CK(f)]: 1};
      L[f] = 'r';
      R.reject++;
    }
  });
  if (!(R.add + R.reject + R.exclude + R.check)) return R;
  DRAFT.auto = {...(DRAFT.auto || {}), [day]: L};
  saveDraft();
  return R;
}
const autoToast = R =>
  `Auto-sort: ${R.add} added, ${R.reject + R.exclude} set aside${R.check ? `, ${R.check} to check in Candidates` : ''}${R.full ? ` (${R.full} wait in full cells)` : ''}. Publish sends them.`;
// One auto decision taken back (Auto › Undo): what it wrote leaves the draft (a value Pierre changed since stays his),
// the log keeps it marked undone so it is never applied again, and the photo is a candidate again. One Undo step.
function autoUndo(f) {
  const x = aOf(f);
  if (!x || x.d.check || x.d.undone) return;
  const d = x.d,
    drop = (k, key, v) => {
      if (!DRAFT[k] || (v !== undefined && !same(DRAFT[k][key], v))) return;
      DRAFT[k] = {...DRAFT[k]};
      delete DRAFT[k][key];
      if (!Object.keys(DRAFT[k]).length) delete DRAFT[k];
    };
  if (d.kind === 'a') {
    // Only the add it wrote: in the candidate's own genus (autoRun decides a candidate in its genus only), still in the
    // view it chose. An add Pierre made since stays his: in the genus he sent the photo to with Not this genus, or in
    // the view he moved it to (Codex review #400: Undo deleted his approval in the other genus).
    const n = (PHOTOS[f] || {}).genus,
      k = n && DRAFT.genera[n];
    if (k && (k.add || {})[f] === d.view) {
      const c = {...k, add: {...k.add}};
      delete c.add[f];
      if (!Object.keys(c.add).length) delete c.add;
      if (Object.keys(c).length) DRAFT.genera[n] = c;
      else delete DRAFT.genera[n];
    }
    if (d.q) drop('quality', f, d.q);
    if (d.fm) drop('gf', f, d.fm);
    const p = PHOTOS[f];
    if (d.crop && p && p.j && p.j.c) drop('crop', f, p.j.c);
  } else if (d.kind === 'x') drop('exclude', f, 'auto');
  else drop('seen', CK(f), 1);
  DRAFT.auto = {...DRAFT.auto, [x.day]: {...DRAFT.auto[x.day], [f]: '-' + x.code}};
  saveDraft();
  render();
  // An auto exclusion keeps its candidate entry (tools/excluded.py drop_excluded), so the photo comes back; one whose
  // entry left the candidate files anyway cannot, and the toast says so (Codex review #400).
  toast(
    PHOTOS[f]
      ? 'Auto decision undone: the photo is back in Candidates.'
      : 'Auto decision undone, but this photo is no longer in the candidate files: it cannot come back to Candidates (a later candidate search may fetch it again).'
  );
}
const FIELD = {keep: 'Keep', view: 'View', quality: 'Quality', form: 'Form'};
const valText = (field, v, n) =>
  v == null
    ? '–'
    : field === 'keep'
      ? v === 'add'
        ? 'add'
        : 'reject'
      : field === 'view'
        ? label(n, v)
        : field === 'quality'
          ? (QUAL.find(x => x[0] === v) || [, v])[1]
          : fName(v);
const pctR = r => (r == null ? '–' : Math.round(100 * r) + '%');
// The agent's decision in words: "add · Colony · Good · Branching", "reject", "exclude".
const autoText = (d, n) =>
  d.kind === 'a'
    ? ['add', label(n, d.view), d.q ? valText('quality', d.q) : '', d.fm ? fName(fL(d.fm)) : ''].filter(Boolean).join(' · ')
    : d.kind === 'x'
      ? 'exclude'
      : 'reject';
// The evidence next to a disagreement: the agent's note (while suggest.json still has it) and the metrics.
const evid = f => {
  const m = METRICS[f],
    j = (PHOTOS[f] || {}).j;
  return [
    j && j.n ? esc(j.n) : '',
    m ? `sharpness ${MREF && MREF.all.length ? rankPct(MREF.all, m[0]) + 'th pct' : m[0]} · ${m[2]} px · cast ${m[3]}%` : ''
  ]
    .filter(Boolean)
    .join(' · ');
};
// After Pierre answers a Check: the agent's answer, and where they differ.
function checkToast(f) {
  const x = aOf(f);
  if (!x || !x.d.check) return;
  memoReset();
  const n = (PHOTOS[f] || {}).genus,
    D = aCmp().filter(c => c.f === f),
    bad = D.filter(c => !c.ok).map(c => FIELD[c.field].toLowerCase());
  toast(`Check: the agent said ${autoText(x.d, n)}${D.length ? (bad.length ? ` (differs: ${bad.join(', ')})` : ' (same)') : ''}.`);
}
// Agreement line at the top of Candidates (every source), and its details (det).
function autoBlock(det) {
  const A = aIdx(),
    E = Object.entries(A);
  if (!E.length && !Object.keys(DRAFT.retest || {}).length) return '';
  const ST = aState(),
    RT = retestStats(DRAFT),
    applied = E.filter(([, x]) => !x.d.check && !x.d.undone),
    nAdd = applied.filter(([, x]) => x.d.kind === 'a').length,
    nOut = applied.length - nAdd,
    ci = curIdx(DRAFT),
    nChk = E.filter(([f, x]) => x.d.check && !excl(f) && !pierreOf(DRAFT, ci, f).keep).length;
  const fld = k =>
    `<span class="adm-af${ST[k].on ? '' : ' off'}" title="${FIELD[k]}: agreement with you over the last ${ST[k].n} checks and corrections; auto ${ST[k].on ? 'on' : 'off'} under ${pctR(ST[k].min)}">${FIELD[k]} ${pctR(ST[k].rate)}${ST[k].n ? `<small>n ${ST[k].n}</small>` : ''}${ST[k].on ? '' : ' · off'}</span>`;
  // The line goes above the card, the details (det) below it, so the card stays in view.
  if (!det)
    return `<div class="adm-auto"><p class="note"><b>Auto</b> ${nAdd} added · ${nOut} set aside · ${nChk} to check · agreement ${AUTO.fields.map(fld).join(' ')} <button type="button" class="adm-link" data-adet aria-expanded="${ADET}">${ADET ? 'Hide' : 'Details'}</button></p></div>`;
  let h = '';
  if (ADET) {
    const rows = AUTO.fields
      .map(k => {
        const r = RT[k];
        return `<tr><td>${FIELD[k]}</td><td class="n">${pctR(ST[k].rate)}</td><td class="n">${ST[k].n}</td><td class="n">${pctR(ST[k].min)}</td><td>${ST[k].on ? 'on' : '<b>off</b>'}</td><td class="n">${r && r.n ? `${pctR(r.rate)} <small>${r.n}</small>` : ''}</td></tr>`;
      })
      .join('');
    const tile = (f, cap, extra = '') => {
      const p = PHOTOS[f] || {f};
      return `<figure class="adm-repl-tile adm-atile" data-af="${esc(f)}"><button type="button" class="adm-aph" data-azoom aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy"></button><figcaption><i>${esc(p.genus || '')}</i> · ${cap}</figcaption>${extra}</figure>`;
    };
    const dis = aCmp()
      .filter(c => !c.ok)
      .reverse();
    // Newest first: the latest day first and, within a day, the latest run first (a day's log keeps the order the runs
    // wrote it, oldest first). Sorting by day alone listed the day's first 30 decisions, so a second load the same day
    // (a new judging pass) showed none of its own decisions until "All".
    const dec = [...applied].reverse().sort((a, b) => (a[1].day < b[1].day ? 1 : a[1].day > b[1].day ? -1 : 0));
    h += `<div class="adm-autodet">
      <div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th>Field</th><th title="Agent vs you">Agreement</th><th>n</th><th title="Auto off under">Min</th><th>Auto</th><th title="You vs you, blind retests">Retest</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${
        dis.length
          ? `<h3 class="label">Disagreements · ${dis.length}</h3><div class="adm-repl-grid">${dis
              .slice(0, 40)
              .map(c => {
                const n = (PHOTOS[c.f] || {}).genus;
                return tile(
                  c.f,
                  `${FIELD[c.field]} · you <b>${esc(valText(c.field, c.p, n))}</b> · agent <b>${esc(valText(c.field, c.a, n))}</b> · ${c.how === 'check' ? 'check' : 'correction'}`,
                  `<small class="adm-aev">${evid(c.f)}</small>`
                );
              })
              .join('')}</div>`
          : ''
      }
      ${
        dec.length
          ? `<h3 class="label">Auto decisions · ${dec.length}</h3><div class="adm-repl-grid">${(AALL ? dec : dec.slice(0, 30))
              .map(([f, x]) =>
                tile(
                  f,
                  `${esc(autoText(x.d, (PHOTOS[f] || {}).genus))} · ${x.day}`,
                  '<button type="button" class="adm-link" data-aundo>Undo</button>'
                )
              )
              .join(
                ''
              )}</div>${dec.length > 30 && !AALL ? `<button type="button" class="adm-link" data-aall>All ${dec.length}</button>` : ''}`
          : ''
      }</div>`;
  }
  return h;
}
function bindAuto(scope) {
  const t = scope.querySelector('[data-adet]');
  if (t)
    t.onclick = () => {
      ADET = !ADET;
      render();
    };
  const al = scope.querySelector('[data-aall]');
  if (al)
    al.onclick = () => {
      AALL = true;
      render();
    };
  scope.querySelectorAll('[data-af]').forEach(el => {
    const f = el.dataset.af,
      u = el.querySelector('[data-aundo]'),
      z = el.querySelector('[data-azoom]');
    if (u) u.onclick = () => autoUndo(f);
    if (z) z.onclick = () => PHOTOS[f] && zoomOne(PHOTOS[f]);
  });
}
// Blind retest (test-retest of Pierre's own ratings): a photo he rated himself (not by the auto-sort), never retested,
// in a fixed order per photo; quality, and growth form when he gave one. His second answer goes to curation.json
// "retest" only: his first rating stays as it is.
function retestNext() {
  if (CDONE < AUTO.retest) return null;
  const R = DRAFT.retest || {},
    Q = DRAFT.quality || {};
  const L = Object.keys(Q)
    .filter(f => PHOTOS[f] && !R[f] && !RTSKIP.has(f) && !excl(f) && !(aApplied(f) && aApplied(f).q === Q[f]))
    .sort((a, b) => fnv('retest|' + a) - fnv('retest|' + b));
  return L[0] || null;
}
function renderRetest(f, seg) {
  const p = PHOTOS[f],
    gfm = fL(mineF(f)),
    hasF = gfm && !(aApplied(f) && fL(aApplied(f).fm) === gfm);
  $v.innerHTML = `<section class="adm-sw adm-blind" data-f="${esc(f)}">${seg}
    <figure class="adm-swcard">
      <button type="button" class="adm-swph" data-zoom aria-label="Enlarge"><img src="${img(p)}" alt=""></button>
      <span class="adm-swg"><i>${esc(p.genus)}</i></span>
      <figcaption><span class="adm-src adm-chk">Retest</span><span class="adm-t">${esc(p.t || '')}</span></figcaption>
    </figure>
    <div class="adm-acts adm-swacts"><span class="adm-qseg" role="group" aria-label="Quality">${QUAL.map(([q, t]) => `<button type="button" data-rq="${q}" aria-pressed="${RTA.q === q}" class="q${q}">${t}</button>`).join('')}</span>${
      hasF
        ? `<span class="adm-qseg adm-fseg" role="group" aria-label="Growth form">${[...FORM_ORDER, 'x'].map(c => `<button type="button" data-rfm="${c}" aria-pressed="${RTA.fm === c}" title="${esc(fName(c))}">${FABBR[c]}</button>`).join('')}</span>`
        : ''
    }</div>
    <div class="adm-swbar"><button type="button" data-rtskip>Skip</button><button type="button" class="add" data-rtdone ${RTA.q ? '' : 'disabled'}>Done</button></div>
  </section>${autoBlock(true)}`;
  const S = $v.querySelector('.adm-sw');
  S.querySelector('[data-zoom]').onclick = () => zoomOne(p);
  S.querySelectorAll('[data-rq]').forEach(b => (b.onclick = () => ((RTA.q = Number(b.dataset.rq)), render())));
  S.querySelectorAll('[data-rfm]').forEach(b => (b.onclick = () => ((RTA.fm = b.dataset.rfm), render())));
  S.querySelector('[data-rtskip]').onclick = () => {
    RTSKIP.add(f);
    RTA = {};
    CDONE = 0;
    render();
  };
  S.querySelector('[data-rtdone]').onclick = () => {
    const was = DRAFT.quality[f],
      e = {q: [was, RTA.q]};
    if (hasF && RTA.fm) e.fm = [gfm, RTA.fm];
    DRAFT.retest = {...(DRAFT.retest || {}), [f]: e};
    RTA = {};
    CDONE = 0;
    saveDraft();
    render();
    toast(
      `Retest: first ${valText('quality', was)}${e.fm ? ` · ${fName(gfm)}` : ''}, now ${valText('quality', e.q[1])}${e.fm ? ` · ${fName(e.fm[1])}` : ''}.`
    );
  };
  bindAuto($v);
}
const cseed = () => {
  let s = store.get('reefid-admin-cseed', 0);
  if (!s) {
    s = 1 + Math.floor(Math.random() * 2147483645);
    store.set('reefid-admin-cseed', s);
  }
  return s;
};
const uOf = f => {
  let h = cseed() ^ 2166136261;
  for (let i = 0; i < f.length; i++) h = Math.imul(h ^ f.charCodeAt(i), 16777619);
  return ((h >>> 0) + 0.5) / 4294967296;
};
function candQueue(src) {
  const N = {},
    O = {},
    cnt = (n, w) => {
      const k = n + '|' + w;
      if (!(k in N)) {
        const c = covOf(n, w);
        N[k] = c.obs;
        O[k] = new Set(c.L.map(q => q.o).filter(Boolean));
      }
      return N[k];
    };
  // A Check is drawn like a candidate nobody judged (weight 1): the pass's verdict must not decide when it comes up.
  const weight = (n, p, chk) => {
    const vs = capViews(n).map(x => x[0]);
    let v = p.vg || p.view;
    if (v === 'medium' && lv(n) === 2) v = 'wide';
    // A candidate from a colony already in games at another zoom counts 3x (Pierre, 2026-11-01): game questions only
    // show views of one colony, so completing a colony adds a several-zoom question.
    const sib = p.o && vs.some(w => w !== v && (cnt(n, w), O[n + '|' + w].has(p.o))) ? 3 : 1;
    return ((chk ? 1 : jw(p)) * sib) / Math.pow(1 + (vs.includes(v) ? cnt(n, v) : Math.min(...vs.map(w => cnt(n, w)))), 3);
  };
  const L = [];
  Object.keys(DATA.gen).forEach(n => {
    const add = entry(n).add || {},
      game = isGame(n),
      vs = capViews(n).map(x => x[0]);
    cands(n).forEach(p => {
      if (!srcOk(p, src) || add[p.f] || rejected(p.f)) return;
      const v = cellView(n, p);
      if (v && VIEWS.some(x => x[0] === v) && !vs.includes(v)) return;
      const full =
          gameable(p) && VIEWS.some(x => x[0] === v) && (cnt(n, v), N[n + '|' + v] >= capOf(n) && !(p.o && O[n + '|' + v].has(p.o))),
        // The auto-sort (autoRun): a Check waiting for Pierre always comes up (full cell or set aside, it is his to
        // answer); an auto decision he undid, or a sure judgment the metrics contradict (p.mf), is never set aside.
        ax = aOf(p.f),
        chk = !!(ax && ax.d.check),
        und = !!(ax && ax.d.undone);
      L.push({p, n, game, chk, full: full && !chk, aside: aside(p) && !chk && !und && !p.mf, r: -Math.log(uOf(p.f)) / weight(n, p, chk)});
    });
  });
  L.sort((a, b) => b.game - a.game || a.r - b.r);
  const out = [];
  while (L.length) {
    const last = out.length && out[out.length - 1].n,
      i = L.slice(0, 6).findIndex(x => x.n !== last && x.game === L[0].game);
    out.push(L.splice(i < 0 ? 0 : i, 1)[0]);
  }
  return out;
}
let candKey = null;
// Which colony of a full cell to retire for a new one (Pierre, 2026-11-02: semi-automatic, for the most variety in the
// games: easy and hard photos, every growth form, several observers). Kept, never suggested: a colony with a photo among
// the first SHEET of the view (the sheet's references), IMR lecture and Pierre's own photos, the only colony of a growth
// form. Among the others, the most to retire first: Poor quality; then a difficulty the cell already has (rated
// colonies, the nearest other colony's difficulty within 0.5) and many answers (well known, little left to learn
// from it); then, on a tie, an observer with many colonies in the cell. Colonies with few answers are kept: their
// rating is still coming (online calibration). Returns the colonies, most to retire first, each with its reasons.
function retireOrder(n, w, cols) {
  const r = rowOf(n, w),
    top = new Set([...r.feat, ...r.rest.slice(0, Math.max(0, SHEET - r.feat.length))].map(p => p.f)),
    PS = STATS || {},
    ans = p => nAns(PS[p.f]),
    who = p =>
      p.imr
        ? 'IMR'
        : String(p.a || '')
            .replace(/^\(c\)\s*/i, '')
            .split(',')[0]
            .trim() || '?',
    form = c => {
      const F = c.L.map(p => fOf(p.f)).filter(x => x && x !== 'x' && x !== 'p');
      return F[0] || '';
    },
    forms = {},
    owners = {};
  cols.forEach(c => {
    c.form = form(c);
    if (c.form) forms[c.form] = (forms[c.form] || 0) + 1;
    c.who = who(c.L[0]);
    owners[c.who] = (owners[c.who] || 0) + 1;
    c.ans = c.L.reduce((t, p) => t + ans(p), 0);
    const R = c.L.filter(p => ans(p) >= 3);
    c.d = R.length ? R.reduce((t, p) => t + PS[p.f][0], 0) / R.length : null;
  });
  cols.forEach(c => {
    c.keep = c.L.some(p => top.has(p.f))
      ? 'on the sheet'
      : c.L.some(p => p.imr || p.own)
        ? c.L.some(p => p.imr)
          ? 'IMR'
          : 'your photo'
        : c.form && forms[c.form] === 1
          ? `only ${c.form} colony`
          : '';
    const nn = c.d === null ? null : Math.min(...cols.filter(o => o !== c && o.d !== null).map(o => Math.abs(o.d - c.d)), 9);
    c.why = [];
    c.score = 0;
    if (c.q === 1) {
      c.score += 10;
      c.why.push('Poor');
    }
    if (nn !== null && nn < 0.5) {
      c.score += 3 * (1 - nn / 0.5);
      c.why.push(`difficulty ${sgn(c.d)} like another colony`);
    }
    if (c.ans >= 10) {
      c.score += Math.min(2, c.ans / 30);
      c.why.push(`${Math.round(c.ans)} answers`);
    } else if (c.ans < 3) c.score -= 1; // still being rated
    if (owners[c.who] > 2) {
      c.score += 0.5 * Math.min(1, (owners[c.who] - 2) / 5);
      c.why.push(`${owners[c.who]} colonies by ${c.who}`);
    }
  });
  return cols.slice().sort((a, b) => !!a.keep - !!b.keep || b.score - a.score);
}
// Adding to a full cell: one tile per colony of the cell, the suggested one (retireOrder) first and marked, the kept
// ones last; a click moves that colony's photos of the view to "sheet only" and adds the candidate, in one Undo step.
// "Add anyway" goes over the cap.
let REPL_STATS = false;
function renderRepl() {
  // The suggestion reads the photo ratings: fetched once if this page has not loaded them yet (drawn again then).
  if (!STATS && !REPL_STATS) {
    REPL_STATS = true;
    loadStats()
      .catch(() => {})
      .then(() => CREPL && render());
  }
  const {n, f, w} = CREPL,
    p = cands(n).find(x => x.f === f) || photos(n).find(x => x.f === f);
  const done = () => {
    CREPL = null;
    CSKIP.delete(f);
  };
  if (!p) {
    done();
    return render();
  }
  const feat = new Set(rowOf(n, w).feat.map(x => x.f)),
    by = {};
  covOf(n, w).L.forEach(q => (by[q.o || q.f] = by[q.o || q.f] || []).push(q));
  const cols = retireOrder(
      n,
      w,
      Object.entries(by).map(([k, L]) => ({k, L, q: Math.min(...L.map(x => qOf(x.f))), ft: L.some(x => feat.has(x.f))}))
    ),
    sug = cols[0] && !cols[0].keep ? cols[0] : null;
  const QN = {1: 'Poor', 2: 'Fair', 3: 'Good'};
  $v.innerHTML = `<section class="adm-repl">
    <div class="adm-shead"><h2><i>${esc(n)}</i> · ${esc(label(n, w))} is full</h2></div>
    <p class="note">${cols.length} colonies in the games (cap ${capOf(n)}) · replace which one?${sug ? ` Suggested: the first one${sug.why.length ? ` (${esc(sug.why.join(', '))})` : ''}, for the most variety; any other works too.` : ' Every colony is one to keep (sheet references, IMR, your photos, a growth form shown once): choose, or add anyway.'}</p>
    <figure class="adm-repl-new"><img ${crSrc(p)} alt=""><figcaption>New: ${esc(p.t || f)}</figcaption></figure>
    <div class="adm-repl-grid">${cols
      .map(
        c => `<button type="button" class="adm-repl-tile${c === sug ? ' sug' : ''}" data-repl="${esc(c.k)}" title="${esc(c.keep ? 'Kept: ' + c.keep : c.why.join(', ') || 'Nothing against it')}"><img src="${img(c.L[0], 1)}" alt="" loading="lazy">
        <span>${c === sug ? '<b>Suggested</b> · ' : ''}${QN[c.q] || ''}${c.ft ? ' · featured' : ''}${c.L.length > 1 ? ` · ${c.L.length} photos` : ''}${c.keep ? ` · keep (${esc(c.keep)})` : ''}</span></button>`
      )
      .join('')}</div>
    <p class="adm-repl-acts"><button type="button" class="adm-btn" data-ranyway>Add anyway (${cols.length + 1})</button> <button type="button" class="adm-link" data-rcancel>Cancel</button></p>
  </section>`;
  $v.querySelectorAll('[data-repl]').forEach(
    b =>
      (b.onclick = () => {
        const L = (cols.find(c => c.k === b.dataset.repl) || {L: []}).L;
        DRAFT.use = {...(DRAFT.use || {})};
        L.forEach(q => (DRAFT.use[q.f] = 'ref'));
        done();
        ACT.addc(n, f, null, w); // one draft save, so one Undo step for both
        toast(`Added to ${n}, ${label(n, w)}; the colony it replaces is now on the sheet only.`);
        checkToast(f); // a Check answered here: the agent's answer
      })
  );
  $v.querySelector('[data-ranyway]').onclick = () => {
    done();
    ACT.addc(n, f, null, w);
    toast(`Added: ${n}, ${label(n, w)} (${cols.length + 1} colonies, over the cap).`);
    checkToast(f); // a Check answered here: the agent's answer
  };
  $v.querySelector('[data-rcancel]').onclick = () => {
    CREPL = null;
    render();
  };
}
function renderCand() {
  status();
  if (CREPL) return renderRepl();
  const shown = x => !CSKIP.has(x.p.f) && (CFULL || !x.full) && (CASIDE || !x.aside);
  // An empty source (Pierre, 2026-11-02: "Pierre 0" opened on "No candidate left") gives way to the first source, in
  // priority order, that still has candidates to go through. Only a source with no candidate at all: one whose
  // candidates are skipped or wait in full cells stays, so they can still be shown (Codex review #340).
  if (!candQueue(CSRC).length) {
    const s = CSRCS.map(([k]) => k).find(k => candQueue(k).filter(shown).length);
    if (s) CSRC = s;
  }
  const Q0 = candQueue(CSRC),
    nFull = Q0.filter(x => x.full).length,
    nAside = Q0.filter(x => x.aside).length,
    nJ = candQueue('all').filter(x => !x.p.cf && !x.p.j).length,
    Q = CFULL ? Q0 : Q0.filter(x => !x.full),
    live = Q0.filter(shown),
    c = live[0],
    nx = live[1];
  const seg =
    `<span class="adm-qseg adm-csrc" role="group" aria-label="Source">${CSRCS.map(([s, t]) => `<button type="button" data-src="${s}" aria-pressed="${s === CSRC}">${t} <b>${s === CSRC ? live.length : candQueue(s).filter(shown).length}</b></button>`).join('')}</span>` +
    // What the queue leaves out, as one row of small toggles (Pierre, 2026-11-03: three lines of notes took the room of
    // the photo on a phone); each chip's tooltip says what it is.
    (nFull || nAside || nJ
      ? `<p class="adm-cflags">${
          nFull
            ? `<button type="button" class="adm-chip adm-cfull" data-cfull aria-pressed="${CFULL}" title="${nFull} candidate${nFull === 1 ? '' : 's'} of cells already full (${[...new Set(Q0.filter(x => x.full).map(x => capOf(x.n)))].sort((a, b) => b - a).join(' or ')} colonies): ${CFULL ? 'tap to hide them' : 'tap to show them'}">${nFull} full</button>`
            : ''
        }${
          nAside
            ? `<button type="button" class="adm-chip adm-caside" data-caside aria-pressed="${CASIDE}" title="${nAside} set aside by the pre-sort (unusable, several corals, poor, comparison image or near-duplicate): ${CASIDE ? 'tap to hide them' : 'tap to show them'}">${nAside} set aside</button>`
            : ''
        }${
          // Reminder (Pierre: the judging agent runs on demand, "remind me to launch it").
          nJ
            ? `<span class="adm-chip adm-cjudge" title="Ask your agent for the candidate pass (judging/AGENTS.md)">${nJ} not judged yet</span>`
            : ''
        }</p>`
      : '') +
    autoBlock();
  const rt = retestNext();
  if (rt) return renderRetest(rt, seg);
  if (!c) {
    $v.innerHTML = `<section class="adm-sw adm-swempty">${seg}<p class="note">${Q.length ? `${Q.length} skipped.` : 'No candidate left.'}</p>${Q.length ? '<button type="button" class="adm-btn" data-again>Show the skipped ones</button>' : ''}</section>${autoBlock(true)}`;
  } else {
    const {p, n, chk} = c,
      views = capViews(n),
      // A Check is blind (Pierre's answer is compared with the judgment): no judgment line, no dashed guesses, no
      // suggested view or crop; a Check tag instead.
      pb = chk ? {...p, j: null} : p,
      sug = w => !chk && (p.vg || p.view) === w;
    const link = /^https?:/.test(p.o || '')
      ? `<a class="adm-swlink" href="${esc(p.o)}" target="_blank" rel="noopener" title="iNaturalist">iNat ↗</a>`
      : p.pg
        ? `<span class="adm-swlink">p. ${esc(p.pg)}</span>`
        : '';
    $v.innerHTML = `<section class="adm-sw${chk ? ' adm-blind' : ''}" data-f="${esc(p.f)}" data-g="${esc(n)}">${seg}
      <figure class="adm-swcard">
        <button type="button" class="adm-swph" data-zoom aria-label="Enlarge"><img ${crSrc(pb)} alt=""></button>
        <a class="adm-swg" href="#${encodeURIComponent(n)}" title="Genus page"><i>${esc(n)}</i>${p.from ? `<small>from ${esc(p.from)}</small>` : ''}</a>
        <button type="button" class="adm-swx" data-x title="Exclude" aria-label="Exclude for good">×</button>
        <figcaption>${chk ? '<span class="adm-src adm-chk" title="Check">Check</span>' : ''}${srcTag(p)}<span class="adm-t">${esc(p.t || '')}</span>${link}</figcaption>
      </figure>${chk ? '' : jLine(p)}
      <div class="adm-acts adm-swacts">${qSeg(p, chk)}${fSeg(p, chk)}<div class="adm-swrow">${p.from ? '' : notThis(n)}<button type="button" class="adm-swcrop${crOf(p.f) ? ' on' : ''}" data-crop aria-pressed="${!!crOf(p.f)}">Crop</button><button type="button" data-skip>Skip</button></div></div>
      <div class="adm-swbar"><button type="button" class="rej" data-rej>✕ Reject</button>${views.map(([w], i) => `<button type="button" class="add${sug(w) ? ' sug' : ''}" data-add="${w}" title="${sug(w) ? 'Suggested · ' : ''}Add (${i + 1})">+ ${label(n, w)}</button>`).join('')}</div>
    </section>${autoBlock(true)}`;
    if (nx) new Image().src = img(nx.p);
    const S = $v.querySelector('.adm-sw'),
      f = p.f,
      go = () => {
        CSKIP.delete(f);
        CDONE++;
      },
      // After his answer to a Check, the agent's (once the action has drawn the next card).
      told = () => chk && checkToast(f);
    S.querySelectorAll('[data-add]').forEach(
      b =>
        (b.onclick = () => {
          const w = b.dataset.add;
          if (gameable(p) && cellFull(n, w, p.o)) {
            CREPL = {n, f, w};
            return render();
          }
          go();
          ACT.addc(n, f, null, w);
          toast(`Added: ${n}, ${label(n, w)}.`);
          told();
        })
    );
    S.querySelector('[data-rej]').onclick = () => {
      go();
      DRAFT.seen = {...(DRAFT.seen || {}), [CK(f)]: 1};
      saveDraft();
      render();
      told();
    };
    S.querySelector('[data-skip]').onclick = () => {
      CSKIP.add(f);
      render();
    };
    S.querySelector('[data-x]').onclick = () => {
      go();
      ACT.exclude(n, f);
      told();
    };
    const sel = S.querySelector('select[data-act="out"]');
    if (sel)
      sel.onchange = () => {
        if (!sel.value) return;
        const to = sel.value;
        CDONE++;
        ACT.out(n, f, null, to);
        toast(to === 'cmp' ? 'Kept for the look-alike comparison.' : `Sent to ${to}.`);
        told();
      };
    S.querySelector('[data-zoom]').onclick = () => zoomOne({...pb, genus: n});
    // Blind on a Check too: the editor starts from Pierre's own crop or the full photo, not the agent's (Codex review #400).
    S.querySelector('[data-crop]').onclick = () => cropEditor(pb);
    bindQ();
    bindF(S);
  }
  $v.querySelectorAll('[data-src]').forEach(
    b =>
      (b.onclick = () => {
        CSRC = b.dataset.src;
        store.set('reefid-admin-csrc2', CSRC);
        render();
      })
  );
  const ca = $v.querySelector('[data-caside]');
  if (ca)
    ca.onclick = () => {
      CASIDE = !CASIDE;
      render();
    };
  bindAuto($v);
  const cf = $v.querySelector('[data-cfull]');
  if (cf)
    cf.onclick = () => {
      CFULL = !CFULL;
      render();
    };
  const ag = $v.querySelector('[data-again]');
  if (ag)
    ag.onclick = () => {
      CSKIP.clear();
      render();
    };
  if (!candKey) {
    candKey = e => {
      if (cur !== '~cand' || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,textarea,select') || !$('lightbox').hidden)
        return;
      const S = $v.querySelector('.adm-sw[data-f]');
      if (!S) return;
      const b =
        e.key === 'ArrowLeft'
          ? S.querySelector('[data-rej]')
          : e.key === 'ArrowRight'
            ? S.querySelector('[data-skip]')
            : /^[1-3]$/.test(e.key)
              ? S.querySelectorAll('[data-add]')[e.key - 1]
              : null;
      if (b) {
        e.preventDefault();
        b.click();
      }
    };
    addEventListener('keydown', candKey);
  }
}
// Crop editor (full screen): drag the frame or its corners; Save keeps it in the draft, Full photo removes it.
// The frame is in fractions of the ORIGINAL photo, so the editor always shows the original (iNat large), never the
// local file, which is already cropped once a crop has been applied (re-editing used to compound the two crops).
function cropEditor(p) {
  const lb = $('lightbox'),
    c0 = crOf(p.f) || sugCrop(p) || [0, 0, 1, 1];
  let c = c0.slice();
  lb.innerHTML = `<div class="adm-crop"><div class="adm-cropbox"><img src="${p.src ? p.src.replace('/original.', '/large.') : img(p)}" alt="" draggable="false"><div class="adm-cropfr"><i data-h="lt"></i><i data-h="rt"></i><i data-h="lb"></i><i data-h="rb"></i></div></div>
    <div class="adm-cropbar"><button type="button" data-c="cancel">Cancel</button><button type="button" data-c="full">Full photo</button><button type="button" class="ok" data-c="save">Save</button></div></div>`;
  lb.hidden = false;
  const box = lb.querySelector('.adm-cropbox'),
    im = box.querySelector('img'),
    fr = box.querySelector('.adm-cropfr'),
    MIN = 0.08;
  const draw = () => {
    Object.assign(fr.style, {
      left: c[0] * 100 + '%',
      top: c[1] * 100 + '%',
      width: (c[2] - c[0]) * 100 + '%',
      height: (c[3] - c[1]) * 100 + '%'
    });
  };
  // On a touch screen the photo keeps EDGE px from each side (Pierre, 2026-11-02: a crop dragged to the screen's edge
  // set off the phone's back / forward swipe, and the page changed).
  const EDGE = matchMedia('(pointer: coarse)').matches ? 40 : 12;
  const fit = () => {
    const W = innerWidth - 2 * EDGE,
      H = innerHeight - 110,
      r = im.naturalWidth / im.naturalHeight || 1.33,
      w = Math.min(W, H * r);
    box.style.width = w + 'px';
    box.style.height = w / r + 'px';
    draw();
  };
  im.complete ? fit() : (im.onload = fit);
  addEventListener('resize', fit);
  let drag = null;
  box.onpointerdown = e => {
    e.preventDefault();
    const h = e.target.dataset.h || (e.target === fr ? 'move' : null);
    if (!h) return;
    box.setPointerCapture(e.pointerId);
    const r = box.getBoundingClientRect();
    drag = {h, x: e.clientX, y: e.clientY, c: c.slice(), w: r.width, hh: r.height};
  };
  box.onpointermove = e => {
    if (!drag) return;
    const dx = (e.clientX - drag.x) / drag.w,
      dy = (e.clientY - drag.y) / drag.hh,
      o = drag.c,
      cl = (v, a, b) => Math.min(b, Math.max(a, v));
    if (drag.h === 'move') {
      const w = o[2] - o[0],
        h = o[3] - o[1],
        l = cl(o[0] + dx, 0, 1 - w),
        t = cl(o[1] + dy, 0, 1 - h);
      c = [l, t, l + w, t + h];
    } else {
      c = o.slice();
      if (drag.h[0] === 'l') c[0] = cl(o[0] + dx, 0, o[2] - MIN);
      else c[2] = cl(o[2] + dx, o[0] + MIN, 1);
      if (drag.h[1] === 't') c[1] = cl(o[1] + dy, 0, o[3] - MIN);
      else c[3] = cl(o[3] + dy, o[1] + MIN, 1);
    }
    draw();
  };
  box.onpointerup = box.onpointercancel = () => {
    drag = null;
  };
  const close = () => {
    lb.hidden = true;
    lb.innerHTML = '';
    removeEventListener('resize', fit);
  };
  lb.querySelectorAll('[data-c]').forEach(
    b =>
      (b.onclick = () => {
        const a = b.dataset.c;
        if (a === 'full') {
          c = [0, 0, 1, 1];
          draw();
          return;
        }
        if (a === 'save') {
          const v = c.map(x => Math.round(x * 1000) / 1000),
            full = v[0] <= 0 && v[1] <= 0 && v[2] >= 1 && v[3] >= 1;
          DRAFT.crop = {...(DRAFT.crop || {})};
          // Full photo over a suggested crop: kept as an explicit no-crop, so the suggestion does not come back (nor
          // get written with the add, ACT.addc). Read from suggest.json: a Check's card is blind (no j) but has one.
          if (full && !(((SUG && SUG.cand) || {})[p.f] || {}).c) delete DRAFT.crop[p.f];
          else if (full) DRAFT.crop[p.f] = [0, 0, 1, 1];
          else DRAFT.crop[p.f] = v;
          saveDraft();
        }
        close();
        render();
      })
  );
}

/* ---------- Save / download ---------- */
const output = () => {
  const genera = {};
  Object.keys(DATA.gen)
    .filter(n => DRAFT.genera[n])
    .forEach(n => {
      genera[n] = DRAFT.genera[n];
    });
  const quality = {};
  Object.keys(DRAFT.quality || {})
    .sort()
    .forEach(f => {
      quality[f] = DRAFT.quality[f];
    });
  const exclude = {};
  Object.keys(DRAFT.exclude || {})
    .sort()
    .forEach(f => {
      exclude[f] = DRAFT.exclude[f];
    });
  const form = {};
  Object.keys(DRAFT.form || {})
    .sort()
    .forEach(f => {
      form[f] = DRAFT.form[f];
    });
  const gf = {};
  Object.keys(DRAFT.gf || {})
    .sort()
    .forEach(f => {
      gf[f] = DRAFT.gf[f];
    });
  const flag = {};
  Object.keys(DRAFT.flag || {})
    .sort()
    .forEach(f => {
      flag[f] = DRAFT.flag[f];
    });
  const use = {};
  Object.keys(DRAFT.use || {})
    .sort()
    .forEach(f => {
      use[f] = DRAFT.use[f];
    });
  const seen = {};
  Object.keys(DRAFT.seen || {})
    .sort()
    .forEach(k => {
      seen[k] = DRAFT.seen[k];
    });
  const mont = {};
  Object.keys(DRAFT.mont || {})
    .sort()
    .forEach(k => {
      mont[k] = DRAFT.mont[k];
    });
  const crop = {};
  Object.keys(DRAFT.crop || {})
    .sort()
    .forEach(k => {
      crop[k] = DRAFT.crop[k];
    });
  const single = {};
  Object.keys(DRAFT.single || {})
    .sort()
    .forEach(k => {
      single[k] = DRAFT.single[k];
    });
  const tile = {};
  Object.keys(DRAFT.tile || {})
    .sort()
    .forEach(k => {
      if ((DRAFT.tile[k] || []).length) tile[k] = DRAFT.tile[k];
    });
  // The auto-sort's log, one map per day, and the blind retests (autosort.js).
  const sorted = o =>
    Object.keys(o || {})
      .sort()
      .reduce((a, k) => ((a[k] = o[k]), a), {});
  const auto = {};
  Object.keys(DRAFT.auto || {})
    .sort()
    .forEach(d => {
      if (Object.keys(DRAFT.auto[d] || {}).length) auto[d] = sorted(DRAFT.auto[d]);
    });
  const retest = sorted(DRAFT.retest);
  return {
    v: 1,
    ...(bookOn(DRAFT) ? {} : {book: false}),
    genera,
    ...(Object.keys(quality).length ? {quality} : {}),
    ...(Object.keys(gf).length ? {gf} : {}),
    ...(Object.keys(form).length ? {form} : {}),
    ...(Object.keys(exclude).length ? {exclude} : {}),
    ...(Object.keys(flag).length ? {flag} : {}),
    ...(Object.keys(use).length ? {use} : {}),
    ...(Object.keys(single).length ? {single} : {}),
    ...(Object.keys(seen).length ? {seen} : {}),
    ...(Object.keys(mont).length ? {mont} : {}),
    ...(Object.keys(crop).length ? {crop} : {}),
    ...(Object.keys(tile).length ? {tile} : {}),
    ...(Object.keys(auto).length ? {auto} : {}),
    ...(Object.keys(retest).length ? {retest} : {})
  };
};
// Who publishes, shown in the commit message (Pierre, 2026-11-01, admin review): the token's GitHub login, else the
// name synced in this browser. Looked up once per page; a failure only leaves the name out.
let AUTHOR;
const author = async () =>
  AUTHOR !== undefined
    ? AUTHOR
    : (AUTHOR =
        (await fetch('https://api.github.com/user', {headers: {Accept: 'application/vnd.github+json', Authorization: `Bearer ${TOKEN}`}})
          .then(r => (r.ok ? r.json() : {}))
          .then(j => j.login || '')
          .catch(() => '')) || ((store.get('reefid-account', null) || {}).name || '').trim());
// What Publish will send, asked before it goes (admin review, 2026-11-01): counts per kind of change, then the genera
// touched with what changed in each.
const nDiff = (a, b) =>
  [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])].filter(k => !same((a || {})[k], (b || {})[k])).length;
function pubSummary() {
  const W = {
    feat: 'featured',
    cover: 'cover',
    hide: 'hidden',
    move: 'view moves',
    add: 'added photos',
    out: 'not this genus',
    lv: 'zooms',
    ok: 'validated'
  };
  const L = [
    [nDiff(DRAFT.quality, SAVED.quality), 'quality rating'],
    [nDiff(DRAFT.gf, SAVED.gf), 'growth form'],
    [nDiff(DRAFT.exclude, SAVED.exclude), 'exclusion'],
    [nDiff(seenOf(DRAFT, true), seenOf(SAVED, true)), 'candidate review'],
    [nDiff(seenOf(DRAFT, false), seenOf(SAVED, false)) + nDiff(DRAFT.use, SAVED.use), 'triage suggestion'],
    [nDiff(DRAFT.flag, SAVED.flag), 'triage flag'],
    [nDiff(DRAFT.crop, SAVED.crop), 'crop'],
    [nDiff(DRAFT.single, SAVED.single), 'several-corals mark'],
    [nDiff(DRAFT.mont, SAVED.mont), 'look-alike pair'],
    [nDiff(DRAFT.tile, SAVED.tile), 'growth-form tile'],
    // Decisions, not the times of Pierre's answers (@t, autoWhen): his answer is counted under its own kind above.
    [nDiff(...[DRAFT, SAVED].map(c => untimed(Object.assign({}, ...Object.values(c.auto || {}))))), 'auto-sort decision'],
    [nDiff(DRAFT.retest, SAVED.retest), 'retest']
  ]
    .filter(([c]) => c)
    .map(([c, t]) => `${c} ${t}${c > 1 ? 's' : ''}`);
  if (bChanged()) L.push(`Coral Finder book photos ${bookOn(DRAFT) ? 'ON' : 'OFF'} on the whole site`);
  const G = changed().map(n => {
    const a = DRAFT.genera[n] || {},
      b = SAVED.genera[n] || {};
    return `${n}: ${[...new Set([...Object.keys(a), ...Object.keys(b)])]
      .filter(k => !same(a[k], b[k]))
      .map(k => W[k] || k)
      .join(', ')}`;
  });
  return [
    ...L,
    ...(G.length
      ? [
          `${G.length} ${G.length > 1 ? 'genera' : 'genus'}:`,
          ...G.slice(0, 12).map(x => '  ' + x),
          ...(G.length > 12 ? [`  and ${G.length - 12} more`] : [])
        ]
      : [])
  ].join('\n');
}
async function save() {
  const ch = changed(),
    q = qChanged(),
    x = xChanged(),
    bk = bChanged(),
    fm = fChanged(),
    fl = flChanged(),
    sg = sgChanged(),
    cd = cdChanged(),
    mt = mtChanged(),
    cr = crChanged(),
    sn = snChanged(),
    tl = tlChanged(),
    au = auChanged();
  if (!(ch.length || q || x || bk || fm || fl || sg || cd || mt || cr || sn || tl || au) || !TOKEN) return;
  if (!confirm(`Publish to the public site?\n\n${pubSummary()}`)) return;
  const b = $('save');
  b.disabled = true;
  b.textContent = 'Publishing…';
  const conf = [];
  // Never overwrite what was published from elsewhere since this page loaded: re-read it and merge first.
  const fresh = async () => {
    const f = await gh(`/contents/${FILE}?ref=${BRANCH}`).catch(e => {
      if (/Not Found/.test(e.message)) return null;
      throw e;
    });
    if (f && f.sha !== SHA) {
      conf.push(...rebase(JSON.parse(fromB64(f.content))));
      SHA = f.sha;
    }
  };
  try {
    await fresh();
    const msg = `Photo curation: ${[...ch.slice(0, 6), ...(q ? ['quality ratings'] : []), ...(fm ? ['growth forms'] : []), ...(x ? ['exclusions'] : []), ...(fl ? ['triage flags'] : []), ...(sg ? ['triage suggestions'] : []), ...(cd ? ['candidate reviews'] : []), ...(mt ? ['look-alike montages'] : []), ...(cr ? ['crops'] : []), ...(sn ? ['several corals'] : []), ...(tl ? ['growth-form tile photos'] : []), ...(au ? ['auto-sort'] : []), ...(bk ? [`Coral Finder book photos ${bookOn(DRAFT) ? 'on' : 'off'}`] : [])].join(', ')}${ch.length > 6 ? ` and ${ch.length - 6} more genera` : ''}`;
    const who = await author(),
      stale = x => /does not match|sha|409/i.test(x.message);
    // A publish from elsewhere between the read and the write: read again, merge, and try once more on our own.
    const put = () => {
      const out = output();
      return gh(`/contents/${FILE}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: msg + (who ? ` (by ${who})` : ''),
          content: toB64(JSON.stringify(out, null, 2) + '\n'),
          branch: BRANCH,
          ...(SHA ? {sha: SHA} : {})
        })
      }).then(r => [r, out]);
    };
    const [r, out] = await put().catch(async x => {
      if (!stale(x)) throw x;
      await fresh();
      return put();
    });
    SHA = r.content.sha;
    SAVED = clone(out);
    DRAFT = clone(out);
    saveDraft();
    store.set('reefid-curation-base', SAVED);
    toast('Published. The public site shows it within a minute or two.' + confNote(conf));
  } catch (x) {
    toast(
      /does not match|sha|409/i.test(x.message)
        ? 'The site was published from elsewhere at the same moment twice: reload the page, your draft is kept.'
        : 'Not published (your draft is kept): ' + x.message
    );
  }
  b.textContent = '';
  render();
}
function download() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(output(), null, 2) + '\n'], {type: 'application/json'}));
  a.download = FILE;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- Start ---------- */
async function start() {
  const hd = document.querySelector('header');
  if (hd && window.ResizeObserver)
    new ResizeObserver(() => document.documentElement.style.setProperty('--hdr-h', hd.offsetHeight + 'px')).observe(hd);
  const sb = $('subnav');
  if (sb && window.ResizeObserver)
    new ResizeObserver(() =>
      document.documentElement.style.setProperty('--sub-h', sb.offsetHeight ? sb.offsetHeight + 6 + 'px' : '0px')
    ).observe(sb);
  // The same words as the page before the script ran: "Loading…" then "Loading photos…" looked like two steps on any
  // page, Players included (Pierre, 2026-11-02).
  $v.innerHTML = '<p class="note">Loading…</p>';
  // Every file at once, each fetched once (Pierre, 2026-11-03: admin pages load slower and slower; dups.json and cand.json
  // waited for data.json, and forms.json was fetched four times).
  const files = {},
    side = (u, k) =>
      (files[u] =
        files[u] ||
        fetch(u, {cache: 'no-cache'})
          .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
          .catch(e => {
            console.warn(`${u} not loaded:`, e.message);
            return {};
          })).then(j => (j && j[k]) || {});
  let CJ;
  try {
    [DATA, AUTOQ, AUTOF, FU0, PICKS, SUG, , DUPS, CJ, METRICS] = await Promise.all([
      fetch('data.json', {cache: 'no-cache'}).then(r => r.json()),
      side('quality.json', 'q'),
      side('forms.json', 'gf'),
      side('forms.json', 'gunsure'),
      side('picks.json', 'feat'),
      fetch('suggest.json', {cache: 'no-cache'})
        .then(r => (r.ok ? r.json() : {}))
        .catch(() => ({})),
      loadSaved(),
      side('dups.json', 'dup').then(x => (Array.isArray(x) ? x : [])),
      // Candidates waiting live in cand.json (tools/datajson.py; data.json, which every player downloads, keeps only those
      // curation.json names): merged in here, as one list per genus.
      side('cand.json', 'cand'),
      // Objective metrics (tools/photo_metrics.py): tie-breakers and sanity flags for the auto-sort only.
      side('metrics.json', 'm')
    ]);
    DATA.cand = DATA.cand || {};
    Object.entries(CJ || {}).forEach(([g, L]) => {
      const have = new Set((DATA.cand[g] || []).map(p => p.f));
      DATA.cand[g] = [...(DATA.cand[g] || []), ...L.filter(p => !have.has(p.f))];
    });
  } catch (x) {
    $v.innerHTML = `<p class="warn">Could not load: ${esc(x.message)}</p>`;
    return;
  }
  FUNSURE = new Set(Array.isArray(FU0) ? FU0 : []);
  // The judging agent's candidate pass (suggest.json "cand", tools/judging_cand.py, run on demand): its view replaces the
  // older guess, its quality and growth form become the dashed first guesses, the rest orders the swiper (jw, candQueue).
  const SC = (SUG && SUG.cand) || {};
  Object.values(DATA.cand)
    .flat()
    .forEach(p => {
      const j = SC[p.f];
      if (!j) return;
      p.j = j;
      if (j.v) p.vg = j.v;
      // It looked at the photo: it replaces the measured rating and the older form guess (yours always win).
      if (j.q) AUTOQ[p.f] = j.q;
      if (j.fm) {
        AUTOF[p.f] = j.fm;
        (j.u || []).some(x => x === 'form' || x === 'polyps') ? FUNSURE.add(p.f) : FUNSURE.delete(p.f);
      }
    });
  // Sanity flags of the metrics on the sure judgments (metFlag): such a candidate is left to Pierre, with the reason.
  const SH = Object.values(DATA.cand)
    .flat()
    .filter(p => p.r && METRICS[p.f])
    .map(p => METRICS[p.f][0])
    .sort((a, b) => a - b);
  MREF = SH.length ? {all: SH, lo: SH[Math.floor(SH.length * 0.05)], hi: SH[Math.floor(SH.length * 0.95)]} : null;
  Object.values(DATA.cand)
    .flat()
    .forEach(p => {
      const mf = p.j && metFlag(autoSure(p.j), p.j, METRICS[p.f], MREF);
      if (mf) p.mf = mf;
    });
  // The Coral Finder's extra genera (data.json x: in the book, present at Dauin, not on the IMR list) are curated here
  // like the others, listed after them; curation.json keys them by name as usual.
  if (DATA.x) Object.assign(DATA.gen, DATA.x.gen);
  GAME = new Set(gameOf(DATA));
  [FDEF, LEGACY] = await Promise.all([side('forms.json', 'forms'), side('forms.json', 'form')]);
  if (!Array.isArray(FDEF)) FDEF = [];
  // Every photo of data.json by name, with its genus, for the Excluded view.
  PHOTOS = {};
  Object.entries(DATA.gen).forEach(([n, g]) =>
    [
      ...Object.values(g.views || {}),
      ...Object.values(g.more || {}),
      (DATA.course || {})[n] || [],
      (DATA.cand || {})[n] || [],
      g.book || []
    ]
      .flat()
      .forEach(p => {
        PHOTOS[p.f] = {...p, genus: n};
      })
  );
  // Every photo name in data.json (field, extra, lecture, candidates), to spot choices left pointing nowhere.
  KNOWN = new Set(
    [
      ...Object.values(DATA.gen).flatMap(g => [...Object.values(g.views || {}), ...Object.values(g.more || {}), g.book || []].flat()),
      ...Object.values(DATA.course || {}).flat(),
      ...Object.values(DATA.cand || {}).flat(),
      ...(DATA.cmp || [])
    ].map(p => p.f)
  );
  // Unsaved edits from an earlier visit are kept, on top of what is saved.
  // The draft only carries the changes made since its base: everything published since then (from another
  // device, or by the candidate refill) comes in underneath. Drafts from before this rule only add, never remove.
  const old = store.get('reefid-curation-draft', null),
    base = store.get('reefid-curation-base', null);
  if (old && old._tab) {
    SEEN = old._tab.rev;
    delete old._tab;
    REVS[SEEN] = clone(old);
  } // the draft another open tab started from
  DRAFT = old && old.genera ? (base ? merge3(base, old, SAVED) : mergeOld(old, SAVED)) : clone(SAVED);
  DRAFT.genera = DRAFT.genera || {};
  // Undo steps kept by this tab before a reload come back, re-based like the draft, only if they lead to that same draft.
  const kept = (() => {
    try {
      return JSON.parse(sessionStorage.getItem(HKEY) || 'null');
    } catch (e) {
      return null;
    }
  })();
  if (TOKEN && kept && old && kept.snap === JSON.stringify(old) && Array.isArray(kept.hist) && Array.isArray(kept.fut)) {
    const f = x => JSON.stringify(base ? merge3(base, JSON.parse(x), SAVED) : mergeOld(JSON.parse(x), SAVED));
    HIST = kept.hist.map(f);
    FUT = kept.fut.map(f);
  }
  snap = JSON.stringify(DRAFT);
  if (TOKEN) {
    putDraft();
    store.set('reefid-curation-base', SAVED);
    keepHist();
  }
  // Pierre's clicks in the old Coral Finder letters (curation.json "form") stay as they are, shown as the hint.
  Object.assign(LEGACY, SAVED.form || {}, DRAFT.form || {});
  const nf = importFlags();
  if (nf) setTimeout(() => toast(`${nf} new photo${nf > 1 ? 's' : ''} flagged on the site: see To do.`), 50);
  addEventListener('storage', e => {
    if (e.key === 'reefid-photo-flags' && e.newValue && importFlags()) render();
  });
  // Another admin tab in this browser clicked: merge its draft onto this one instead of overwriting it at the next click,
  // and take the base it published (code re-review 2026-11-01, M4). One Undo step brings back this tab's draft as it was.
  addEventListener('storage', e => {
    if (!TOKEN || !e.newValue) return;
    let v;
    try {
      v = JSON.parse(e.newValue);
    } catch (x) {
      return;
    }
    if (e.key === 'reefid-curation-base' && v) {
      SAVED = v;
      SAVED.genera = SAVED.genera || {};
      memoReset();
      render();
      return;
    }
    if (e.key !== 'reefid-curation-draft') return;
    const was = snap,
      m = takeOther();
    if (!m) return;
    if (was !== null) HIST.push(was);
    FUT = [];
    if (m.share) putDraft();
    keepHist();
    render();
    toast('Clicks made in another admin tab are in.');
  });
  const keep = changed().length;
  if (keep) toast(`Your draft from last time is back: ${keep} ${keep > 1 ? 'genera' : 'genus'} not published yet.`);
  // The auto-sort: what the candidate pass is sure of goes into the draft (autoRun), one Undo step for the whole run.
  // Only for an admin who can publish (read-only shows the published curation as it is).
  const ar = TOKEN && autoRun();
  if (ar && ar.add + ar.reject + ar.exclude + ar.check) setTimeout(() => toast(autoToast(ar)), keep ? 4000 : 0);
  $('tools').hidden = false;
  $('save').onclick = save;
  $('download').onclick = download;
  const mo = document.querySelector('.adm-more');
  if (mo) {
    mo.querySelector('.adm-menu').addEventListener('click', () => {
      mo.open = false;
    });
    document.addEventListener('click', e => {
      if (!mo.contains(e.target)) mo.open = false;
    });
  }
  const so = $('signout');
  if (so) {
    so.hidden = !TOKEN;
    so.onclick = signOut;
  }
  $('undo').onclick = undo;
  $('help').onclick = toggleHelp;
  // Site-wide switch: asks first (admin review, 2026-11-01).
  $('booksw').onclick = () => {
    if (!confirm(`Turn Coral Finder book photos ${bookOn(DRAFT) ? 'OFF' : 'ON'} on the whole site (after Publish)?`)) return;
    if (bookOn(DRAFT)) DRAFT.book = false;
    else delete DRAFT.book;
    saveDraft();
    render();
  };
  $('redo').onclick = redo;
  $('redo2').onclick = redo;
  $('help2').onclick = toggleHelp;
  $('modesel').onchange = e => {
    location.hash = e.target.value.replace(/^#/, '');
  };
  addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.target.closest('input,textarea')) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if ((k === 'z' && e.shiftKey) || k === 'y') {
      e.preventDefault();
      redo();
    }
  });
  // On a phone the page opens on the candidates, one per screen.
  cur = hashNow() || (matchMedia('(max-width: 599px)').matches ? '~cand' : Object.keys(DATA.gen)[0]);
  window.onhashchange = () => {
    if (UPDATED && !draftLost) return location.reload(); // a new version took over: loaded on the way to the next page
    cur = hashNow();
    const h = $('admhelp');
    if (h) h.remove();
    render();
    window.scrollTo({top: 0});
  };
  // New versions (Pierre, 2026-11-02, same as the app): sw.js is checked again when the page comes back into view (5 min
  // apart) and every 30 min; once a new version has taken over in the background, the page reloads itself when it next
  // comes into view or at the next page change. Every click is already in the draft, so nothing is lost (the undo
  // history starts again).
  if ('serviceWorker' in navigator) {
    let swAt = Date.now();
    const swCheck = () => {
      swAt = Date.now();
      navigator.serviceWorker
        .getRegistration()
        .then(r => r && r.update())
        .catch(() => {});
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (UPDATED && !draftLost) return location.reload();
      if (Date.now() - swAt > 300000) swCheck();
    });
    setInterval(() => document.visibilityState === 'visible' && swCheck(), 1800000);
  }
  // Every click is kept in this browser's draft, so leaving or reloading loses nothing: warn only if that save failed.
  window.onbeforeunload = e => {
    if (draftLost) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  // Every photo shows its file name in small, plain and selectable, so Pierre can quote it (hidden on phones, CSS).
  const fid = () =>
    $v.querySelectorAll('figure[data-f] figcaption, .adm-sw[data-f] .adm-swcard figcaption').forEach(c => {
      if (c.querySelector('.adm-fid')) return;
      const f = c.closest('[data-f]').dataset.f,
        s = document.createElement('small');
      s.className = 'adm-fid';
      s.textContent = f;
      c.appendChild(s);
    });
  new MutationObserver(fid).observe($v, {childList: true, subtree: true});
  render();
}
// Without a token the page opens read-only (download the JSON) only with ?readonly, so nobody wanders in by accident.
// Stay signed in on this browser after unlocking (survives reloads) until "Sign out".
// The unlocked token lives in sessionStorage only (Pierre, 2026-11-01, code review H1): it survives reloads in this tab and
// is gone when the browser closes, so the plain token never stays on disk. localStorage only holds the encrypted vault.
const SESSION = SK('reefid-admin-session');
const sess = {
  get() {
    try {
      return sessionStorage.getItem(SESSION);
    } catch (e) {
      return null;
    }
  },
  set(t) {
    try {
      t ? sessionStorage.setItem(SESSION, t) : sessionStorage.removeItem(SESSION);
    } catch (e) {}
  }
};
store.set(SESSION, null); // drop the plain copy older versions kept in localStorage
function signOut() {
  sess.set(null);
  try {
    sessionStorage.removeItem(HKEY);
  } catch (e) {}
  TOKEN = null;
  location.reload();
}
(async () => {
  if (DEMO) {
    TOKEN = 'demo';
    const pv = $('preview');
    if (pv) pv.hidden = true; // the site's ?draft preview reads the real draft, not the demo's
    return start();
  }
  if (/[?&]readonly\b/.test(location.search)) return start();
  const t = sess.get();
  if (t) {
    TOKEN = t;
    try {
      await checkToken();
      return start();
    } catch (x) {
      TOKEN = null;
      if (/credentials|cannot write|401/i.test(x.message)) sess.set(null);
      return lockScreen(x.message);
    }
  }
  lockScreen();
})();

// Photo size S/M/L: same control and same per-page store as the site (localStorage reefid-sync-size, key "admin").
(() => {
  const get = () => {
    try {
      return JSON.parse(localStorage.getItem('reefid-sync-size')) || {};
    } catch (e) {
      return {};
    }
  };
  const apply = () => {
    const s = get().admin || 'm';
    document.documentElement.dataset.size = s;
    document.querySelectorAll('#size button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.size === s)));
  };
  document.querySelectorAll('#size button').forEach(
    b =>
      (b.onclick = () => {
        const p = get();
        p.admin = b.dataset.size;
        try {
          localStorage.setItem('reefid-sync-size', JSON.stringify(p));
        } catch (e) {}
        apply();
      })
  );
  apply();
})();

// Photo difficulty from the sync sheet (?stats=1, tools/sync/Code.gs stats_): [difficulty, answers, right] per photo.
const SYNC_URL = 'https://script.google.com/macros/s/AKfycbyt6l9sBeWP4KacPx1SUbsk9-15uJikxRafrpwF6b2oAE8GgrnPOtuJg7IqfFG5ymrR/exec';
let STATS = null,
  DIFF_ORDER = store.get('reefid-admin-diff', 'hard');
function renderDiff() {
  status();
  if (!STATS || !ANS) {
    $v.innerHTML = '<p class="note">Loading…</p>';
    loadStats().then(() => {
      if (cur === '~diff') render();
    });
    return;
  }
  const vl = v => (v === 'cand' ? 'Candidate' : VIEWS.find(x => x[0] === v)[1]),
    S = photoStats();
  const L = allPhotos()
    .filter(p => S[p.f] && nAns(S[p.f]) >= SF.min)
    .sort((a, b) => (DIFF_ORDER === 'hard' ? -1 : 1) * (S[a.f][0] - S[b.f][0]));
  const card = p => {
    const [d, n, r] = S[p.f];
    return `<figure class="adm-tile adm-qt" data-f="${esc(p.f)}" data-g="${esc(p.genus)}" data-q="${qOf(p.f)}" tabindex="0">
    <button type="button" class="adm-ph" data-act="zoom" aria-label="Enlarge"><img ${crSrc(p, 1)} alt="" loading="lazy" draggable="false"></button>
    <figcaption><a class="adm-gen" href="#${esc(p.genus)}"><i>${esc(p.genus)}</i></a><span class="adm-src view">${vl(p.view)}</span>${qTag(p)}<span class="adm-src" title="Difficulty · answers that rated it, right (weighed by experience)">${d > 0 ? '+' : ''}${d.toFixed(1)} · ${nAns(S[p.f])} · ${pct(r, n)}</span></figcaption>
    <div class="adm-acts">${qSeg(p)}</div></figure>`;
  };
  $v.innerHTML = `<section class="adm-quality"><div class="adm-shead"><h2>Photos by difficulty</h2>${segBtns('min', [
    [1, '≥1'],
    [3, '≥3'],
    [10, '≥10']
  ])}<span class="note">answers</span>
    <span class="adm-qseg adm-sseg" role="group" aria-label="Order"><button type="button" data-do="hard" aria-pressed="${DIFF_ORDER === 'hard'}">Hardest</button><button type="button" data-do="easy" aria-pressed="${DIFF_ORDER === 'easy'}">Easiest</button></span>${eloSeg()}</div>
    ${L.length ? `<div class="adm-grid adm-qgrid">${L.map(card).join('')}</div>` : '<p class="note">No answers yet.</p>'}</section>`;
  $v.querySelectorAll('[data-do]').forEach(
    b =>
      (b.onclick = () => {
        DIFF_ORDER = b.dataset.do;
        store.set('reefid-admin-diff', DIFF_ORDER);
        render();
      })
  );
  $v.querySelectorAll('[data-act="zoom"]').forEach(
    b =>
      (b.onclick = () => {
        const t = b.closest('[data-f]');
        zoom(t.dataset.g, t.dataset.f);
      })
  );
  bindQ();
  bindStats();
}

/* ---------- Photo stats › Overview ---------- */
// General numbers on every photo (Pierre, 2026-11-03: "how many photos are in play right now, roughly how many per genus
// and per zoom level, with a median and a spread, not a box plot; if it says Photo stats, it must be stats"). Computed
// in the browser from what the admin already has: data.json and the draft curation (in play = gamePool, what the games
// can draw, as Coverage › Games), the candidates (cands, rejected marks, exclusions) and the sheet's photo ratings
// (?stats=1, as Difficulty) for the answers per photo. A spread is "median [p25–p75]" (core.js distOf): the middle half
// of the genera lies in the brackets. Per genus = over every game genus (the IMR slate, Millepora, the bonus genera),
// zeros included; per view, over the genera that have the view (a 2-level genus has no Close-up view).
// Why a photo of the site is not in the games (first reason that applies), as on Coverage (covOff) plus the genera the
// games never ask and the Research Grade rule of the extra genera.
const POOL_OFF = [
  ['finder', 'Finder-only genus'],
  ['cf', 'CF book'],
  ['multi', 'several corals'],
  ['ref', 'sheet only'],
  ['x', 'form not visible'],
  ['rg', 'not Research Grade'],
  ['other', 'other']
];
function poolStats() {
  const use = DRAFT.use || {},
    G = [...GAME],
    per = Object.create(null),
    play = [],
    inPlay = new Set();
  G.forEach(n => {
    const r = (per[n] = {n, k: 0, obs: new Set(), v: {}, s: {}, views: covViews(n).map(x => x[0])});
    r.views.forEach(v =>
      gamePool(n, v).forEach(p => {
        r.k++;
        r.obs.add(p.o || p.f);
        r.v[v] = (r.v[v] || 0) + 1;
        const o = origin(p);
        r.s[o] = (r.s[o] || 0) + 1;
        play.push({...p, genus: n, view: v});
        inPlay.add(n + '|' + p.f);
      })
    );
  });
  // Photos kept only for the look-alike comparison (Not this genus › Look-alike comparison, curation out 'cmp'): they leave
  // their genus (photos and cands skip them) for no other one, so they are counted here, once each, from the genus they
  // left (Codex review #430: they fell out of the inventory). A candidate sent there counts here too, rejected or not.
  const cmp = [...(sentTo('own', own).cmp || []), ...(sentTo('cand', rawCands).cmp || [])].length;
  const st = {
      play: play.length,
      off: 0,
      cmp,
      removed: 0,
      wait: 0,
      waitBook: 0,
      rej: 0,
      excl: Object.keys(DRAFT.exclude || {}).length
    },
    off = {};
  Object.keys(DATA.gen).forEach(n => {
    photos(n).forEach(p => {
      if (inPlay.has(n + '|' + p.f)) return;
      if (hidden(n, p)) return st.removed++;
      st.off++;
      const why = !isGame(n)
        ? 'finder'
        : p.cf
          ? 'cf'
          : p.multi
            ? 'multi'
            : use[p.f] === 'ref'
              ? 'ref'
              : viewOf(n, p) === 'wide' && fOf(p.f) === 'x'
                ? 'x'
                : DATA.gen[n].x && !p.own && p.gid
                  ? 'rg'
                  : 'other';
      off[why] = (off[why] || 0) + 1;
    });
    const add = entry(n).add || {};
    cands(n)
      .filter(p => !add[p.f])
      .forEach(p => (rejected(p.f) ? st.rej++ : (st.wait++, p.cf && st.waitBook++)));
  });
  return {G, per, play, st, off};
}
// A number as the page writes it: whole numbers plain, others to one decimal (a median of an even count may be x.5).
const numTxt = x => (x == null ? '–' : Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : x.toFixed(1));
// "median [p25–p75]" of a distOf result.
const iqrTxt = d => (d.n ? `${numTxt(d.med)} <span class="note">[${numTxt(d.p25)}–${numTxt(d.p75)}]</span>` : '–');
function renderPstats() {
  status();
  if (!STATS) {
    $v.innerHTML = '<p class="note">Loading…</p>';
    loadStats(true).then(() => {
      if (cur === '~pstats') render();
    });
    return;
  }
  const {G, per, play, st, off} = poolStats(),
    R = G.map(n => per[n]),
    gk = distOf(R.map(r => r.k)),
    go = distOf(R.map(r => r.obs.size)),
    colonies = R.reduce((t, r) => t + r.obs.size, 0),
    withAny = R.filter(r => r.k).length,
    gen = n => `<a class="adm-gen" href="#${esc(n)}"><i>${esc(n)}</i></a>`;
  // Every photo the admin knows, by state, each counted once (what each row means: the ? help).
  const total = st.play + st.off + st.cmp + st.removed + st.wait + st.rej + st.excl,
    S = [
      ['In play', st.play],
      ['Not in games', st.off],
      ['Comparison only', st.cmp],
      ['Removed', st.removed],
      ['Candidates', st.wait, st.waitBook ? `${st.waitBook} Coral Finder book photos` : ''],
      ['Rejected', st.rej],
      ['Excluded', st.excl]
    ],
    sm = Math.max(1, ...S.map(x => x[1]));
  const offLine = POOL_OFF.filter(([k]) => off[k])
    .map(([k, t]) => `${off[k]} ${t}`)
    .join(' · ');
  // Genera by photos in play: bars of a round width, about 10 of them.
  const top = gk.max || 0,
    bw = [1, 2, 5, 10, 20, 25, 50, 100, 200].find(w => top / w <= 12) || 500,
    H = Array.from({length: Math.floor(top / bw) + 1}, (_, i) => ({lo: i * bw, hi: i * bw + bw - 1, L: []}));
  R.forEach(r => H[Math.floor(r.k / bw)].L.push(r.n));
  const hm = Math.max(1, ...H.map(h => h.L.length)),
    byK = R.slice().sort((a, b) => a.k - b.k || a.obs.size - b.obs.size || a.n.localeCompare(b.n)),
    gtab = (t, L) =>
      `<table class="adm-tbl"><thead><tr><th>${t}</th><th class="n">Photos</th><th class="n">Colonies</th></tr></thead><tbody>${L.map(
        r => `<tr><td>${gen(r.n)}</td><td class="n">${r.k}</td><td class="n">${r.obs.size}</td></tr>`
      ).join('')}</tbody></table>`;
  // Per view and per source: total, share, per genus spread, genera without (views) or with (sources).
  const V = VIEWS.map(([v, t]) => {
      const has = R.filter(r => r.views.includes(v));
      return {
        t,
        k: play.filter(p => p.view === v).length,
        d: distOf(has.map(r => r.v[v] || 0)),
        none: has.filter(r => !r.v[v]).length,
        of: has.length
      };
    }),
    O = ORIGINS.filter(([o]) => o !== 'book').map(([o, t]) => ({
      t,
      k: play.filter(p => origin(p) === o).length,
      d: distOf(R.map(r => r.s[o] || 0)),
      with: R.filter(r => r.s[o]).length
    }));
  // Answers that rated each photo in play (sheet ?stats=1, as Difficulty), in bands.
  const A = play.map(p => nAns(STATS[p.f])),
    da = distOf(A),
    dr = distOf(A.filter(x => x > 0)),
    B = [
      ['None', 0, 0],
      ['1–2', 1, 2],
      ['3–9', 3, 9],
      ['10–29', 10, 29],
      ['30+', 30, Infinity]
    ].map(([t, a, b]) => [t, A.filter(x => x >= a && x <= b).length]),
    bm = Math.max(1, ...B.map(b => b[1]));
  $v.innerHTML =
    `<section class="adm-pov"><div class="adm-shead"><h2>Photo overview</h2></div>` +
    kpis([
      ['Photos in play', st.play],
      ['Colonies in play', colonies],
      ['Genera in play', withAny === G.length ? withAny : `${withAny} / ${G.length}`],
      ['Candidates', st.wait]
    ]) +
    `<div class="adm-sgrid">
    <section class="adm-scard" data-pov="pool"><h3>All photos</h3><table class="adm-tbl"><tbody>${S.map(
      ([t, k, d]) =>
        `<tr${d ? ` title="${esc(d)}"` : ''}><td>${t}</td><td class="n">${k}</td><td class="n">${pct(k, total)}</td><td>${sbar(k, sm)}</td></tr>`
    ).join('')}<tr><td><b>Total</b></td><td class="n"><b>${total}</b></td><td></td><td></td></tr></tbody></table>${
      offLine ? `<p class="note">Not in games: ${offLine}.</p>` : ''
    }</section>
    <section class="adm-scard" data-pov="genus"><h3>Per genus</h3><table class="adm-tbl"><thead><tr><th></th><th>Median [middle half]</th><th>Range</th><th class="n">Mean</th></tr></thead><tbody>
      <tr><td>Photos</td><td>${iqrTxt(gk)}</td><td>${numTxt(gk.min)}–${numTxt(gk.max)}</td><td class="n">${numTxt(gk.mean)}</td></tr>
      <tr><td>Colonies</td><td>${iqrTxt(go)}</td><td>${numTxt(go.min)}–${numTxt(go.max)}</td><td class="n">${numTxt(go.mean)}</td></tr></tbody></table>
      <div class="adm-cols adm-povh">${H.map(
        h =>
          `<div title="${h.lo === h.hi ? h.lo : `${h.lo}–${h.hi}`} photos: ${h.L.length} genus${h.L.length === 1 ? '' : 'es'}${h.L.length ? ' (' + esc(h.L.join(', ')) + ')' : ''}"><i style="height:${(100 * h.L.length) / hm}%"></i></div>`
      ).join('')}</div>
      <p class="adm-axis"><span>0</span><span>genera by photos in play, ${bw} per bar</span><span>${H.length * bw}</span></p></section>
    <section class="adm-scard" data-pov="ends"><h3>Fewest and most</h3>${gtab('Fewest', byK.slice(0, 5))}${gtab('Most', byK.slice(-5).reverse())}</section>
    <section class="adm-scard" data-pov="views"><h3>Views</h3><div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th>View</th><th class="n">Photos</th><th class="n">Share</th><th>Per genus</th><th class="n">None</th></tr></thead><tbody>${V.map(
      r =>
        `<tr><td>${r.t}</td><td class="n">${r.k}</td><td class="n">${pct(r.k, st.play)}</td><td>${iqrTxt(r.d)}</td><td class="n">${r.none} / ${r.of}</td></tr>`
    ).join('')}</tbody></table></div></section>
    <section class="adm-scard" data-pov="sources"><h3>Sources</h3><div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th>Source</th><th class="n">Photos</th><th class="n">Share</th><th>Per genus</th><th class="n">Genera</th></tr></thead><tbody>${O.map(
      r =>
        `<tr><td>${r.t}</td><td class="n">${r.k}</td><td class="n">${pct(r.k, st.play)}</td><td>${iqrTxt(r.d)}</td><td class="n">${r.with}</td></tr>`
    ).join('')}</tbody></table></div></section>
    <section class="adm-scard" data-pov="answers"><h3>Answers per photo</h3><table class="adm-tbl"><thead><tr><th>Answers</th><th class="n">Photos</th><th class="n">Share</th><th></th></tr></thead><tbody>${B.map(
      ([t, k]) => `<tr><td>${t}</td><td class="n">${k}</td><td class="n">${pct(k, A.length)}</td><td>${sbar(k, bm)}</td></tr>`
    ).join(
      ''
    )}</tbody></table><p class="note">Median ${iqrTxt(da)}, mean ${numTxt(da.mean)}${dr.n ? `; the ${dr.n} rated: median ${iqrTxt(dr)}` : ''}.</p></section>
    </div></section>`;
}

/* ---------- Photo coverage ---------- */
// Game photos of genus n in view v, as the games can draw them (applySlots in app.js): field and IMR lecture photos, but no
// Coral Finder book photo, no multi-coral, hidden or "sheet only" photo. Poor photos count (Pierre: games use
// them at the Hard level, realistic like ReefCloud images). The Colony slot never takes a photo whose growth form is not visible (photoSet in app.js). Diversity = distinct colonies
// (iNat observations), so 5 shots of one colony count once. Shared by the Coverage page and the Candidates queue.
const COV = [1, 3, 5, 8]; // colonies per genus x view from which a cell reaches level 1, 2, 3, 4
function gamePool(n, v) {
  const use = DRAFT.use || {};
  // A genus with a single IMR growth form (Pierre): the form is no question, so a "form not visible" photo still counts.
  const oneForm =
    v === 'wide' &&
    new Set(
      photos(n)
        .filter(p => !p.multi && !hidden(n, p))
        .map(p => fOf(p.f))
        .filter(x => x && x !== 'x' && x !== 'p')
    ).size === 1;
  return photos(n).filter(
    p =>
      viewOf(n, p) === v &&
      !hidden(n, p) &&
      !p.multi &&
      !p.extra &&
      !p.cf &&
      use[p.f] !== 'ref' &&
      !(v === 'wide' && fOf(p.f) === 'x' && !oneForm) &&
      // The games' Research Grade rule for the extra genera that are played (app.js gamePhotoOk; Codex review #390). A
      // Finder-only genus is not played: its Needs ID colonies count, as in tools/fetch_local.py colonies().
      (!DATA.gen[n].x || !isGame(n) || p.own || !p.gid)
  );
}
function covOf(n, v) {
  const L = gamePool(n, v);
  return {n: L.length, obs: new Set(L.map(p => p.o || p.f)).size, L};
}
// Photos of a genus x view left out of the game pool, by reason (Pierre: show what isn't counted and why).
// Short label in the cell, long one in the cell's tooltip.
const OFF = [
  ['multi', 'multi', 'with several corals'],
  ['x', 'no form', 'form not visible'],
  ['ref', 'sheet only', 'sheet only'],
  ['cf', 'CF', 'Coral Finder book'],
  ['hid', 'removed', 'removed']
];
function covOff(n, v, long) {
  const pool = new Set(gamePool(n, v).map(p => p.f)),
    use = DRAFT.use || {},
    out = {};
  photos(n)
    .filter(p => viewOf(n, p) === v && !pool.has(p.f))
    .forEach(p => {
      const why = hidden(n, p)
        ? 'hid'
        : p.cf
          ? 'cf'
          : p.multi
            ? 'multi'
            : use[p.f] === 'ref'
              ? 'ref'
              : v === 'wide' && fOf(p.f) === 'x'
                ? 'x'
                : null;
      if (why) out[why] = (out[why] || 0) + 1;
    });
  const L = OFF.filter(([k]) => out[k]);
  return long
    ? L.map(([k, , t]) => `${out[k]} ${t}`).join(', ')
    : L.length
      ? 'excl. ' + L.map(([k, t]) => `${out[k]} ${t}`).join(' · ')
      : '';
}
// 0 none, 1 thin (1-2 colonies), 2 short (3-4), 3 fair (5-7), 4 well covered (8+). Thin = level 0 or 1.
const covLvl = c => COV.filter(k => c.obs >= k).length;
// Views a genus has in games: 2-level genera have no Closer view.
const covViews = n => VIEWS.filter(([v]) => !(lv(n) === 2 && v === 'medium'));
// Views a genus takes candidates in, under its cap (capOf): every view of a game genus; Colony and Close-up only for a
// Finder-only genus (Pierre, 2026-11-03). A 2-level genus's macro view is its Close-up (label), so it stays.
const capViews = n => covViews(n).filter(([v]) => isGame(n) || v !== 'macro' || lv(n) === 2);
// Thinnest at every opening (Pierre 2026-11-01, again 2026-11-03: a saved Thickest kept coming back): the order and a
// column sort chosen on the page last until the page is reloaded, never saved.
let COV_ORDER = 'thin';
// Sort by one zoom column (Pierre 2026-11-01), both coverage views: click a view header (fewest colonies first),
// again to reverse; a genus without that view stays last; the order switch clears it. st = {col, dir}, saved by save().
const colSort = (st, R) => {
  const i = VIEWS.findIndex(v => v[0] === st.col);
  if (i < 0) return;
  const d = st.dir === 'desc' ? -1 : 1;
  R.sort((a, b) => {
    const x = a.cells[i],
      y = b.cells[i];
    if (!x || !y) return !x - !y || a.i - b.i;
    return d * (x.obs - y.obs || x.n - y.n) || a.i - b.i;
  });
};
const colTh = st =>
  VIEWS.map(
    ([k, t]) =>
      `<th><button type="button" class="cov-sort${st.col === k ? ' on' : ''}" data-cs="${k}">${t}${st.col === k ? (st.dir === 'desc' ? ' ▼' : ' ▲') : ''}</button></th>`
  ).join('');
const bindCol = (st, save) =>
  $v.querySelectorAll('[data-cs]').forEach(
    b =>
      (b.onclick = () => {
        const k = b.dataset.cs;
        st.dir = st.col === k && st.dir === 'asc' ? 'desc' : 'asc';
        st.col = k;
        save();
        render();
      })
  );
let COVS = {col: '', dir: 'asc'};
// The + column's sources, short label (cell) and long one (tooltip, legend); IMR and the book left out.
const CAND_SRC = [
  ['dauin', 'Dauin', 'iNat Dauin'],
  ['ph', 'PH', 'iNat Philippines'],
  ['own', 'Own', 'your photos'],
  ['world', 'Other', 'iNat elsewhere'],
  ['imr', 'IMR', 'IMR lecture']
];
function renderCov() {
  status();
  const R = [...GAME].map((n, i) => {
    const cells = VIEWS.map(([v]) => (covViews(n).some(x => x[0] === v) ? covOf(n, v) : null)),
      live = cells.filter(Boolean);
    return {
      n,
      i,
      cells,
      min: Math.min(...live.map(c => c.obs)),
      max: Math.max(...live.map(c => c.obs)),
      all: live.flatMap(c => c.L),
      // Candidates by source (Pierre, 2026-11-02: Dauin, Philippines and his own at least; the book never).
      cand: pending(n).filter(p => !p.cf).length,
      cby: pending(n)
        .filter(p => !p.cf)
        .reduce((o, p) => ((o[origin(p)] = (o[origin(p)] || 0) + 1), o), {})
    };
  });
  // Lecture order = the app's Genera list: IMR lecture group (★ genera in the group of their look-alikes, as shownGroup
  // in app.js), then slate order inside a group; genera outside the lecture groups last.
  const lg = n => {
    const g = DATA.gen[n];
    if (g.ig) return g.ig;
    const L = (g.look || []).map(b => DATA.gen[b] && DATA.gen[b].ig).filter(Boolean);
    if (!L.length) return 99;
    const c = {};
    L.forEach(k => (c[k] = (c[k] || 0) + 1));
    return L.reduce((b, k) => (c[k] > c[b] ? k : b), L[0]);
  };
  const by = {
    lecture: (a, b) => lg(a.n) - lg(b.n) || a.i - b.i,
    thin: (a, b) => a.min - b.min || a.all.length - b.all.length || a.i - b.i,
    thick: (a, b) => b.all.length - a.all.length || b.max - a.max || a.i - b.i
  };
  R.sort(by[COV_ORDER] || by.thin);
  colSort(COVS, R);
  const max = Math.max(1, ...R.map(r => r.all.length)),
    thin = R.reduce((s, r) => s + r.cells.filter(c => c && covLvl(c) < 2).length, 0),
    rich = R.reduce((s, r) => s + r.cells.filter(c => c && covLvl(c) === 4).length, 0);
  const cell = (r, c, v) =>
    c
      ? `<td class="cov-c cov-${covLvl(c)}${c.obs > CELL_MAX ? ' cov-over' : c.obs === CELL_MAX ? ' cov-full' : ''}" title="${c.obs > CELL_MAX ? `Over the cap of ${CELL_MAX} colonies · ` : c.obs === CELL_MAX ? `Full (${CELL_MAX} colonies) · ` : ''}${esc(label(r.n, v))}: ${c.n} photo${c.n === 1 ? '' : 's'} · ${c.obs} colon${c.obs === 1 ? 'y' : 'ies'}${(o => (o ? ` · not counted: ${esc(o)}` : ''))(covOff(r.n, v, true))}"><b>${c.n}</b>${c.obs < c.n ? `<small>${c.obs}</small>` : ''}${(o => (o ? `<span class="cov-off">${o}</span>` : ''))(covOff(r.n, v))}</td>`
      : '<td class="cov-c cov-na">–</td>';
  const bar = r =>
    ORIGINS.filter(o => o[0] !== 'book')
      .map(([o, t]) => {
        const k = r.all.filter(p => origin(p) === o).length;
        return k ? `<i class="o-${o}" style="width:${((100 * k) / max).toFixed(1)}%" title="${t}: ${k}"></i>` : '';
      })
      .join('');
  const seg = [
    ['thin', 'Thinnest', 'Least covered first'],
    ['thick', 'Thickest', 'Most photos first'],
    ['lecture', 'Lecture', 'Lecture order']
  ];
  $v.innerHTML = `<section class="adm-cov"><div class="cov-look" id="cov-look"></div>
    <div class="adm-filter cov-head"><span class="adm-qseg adm-lvseg" role="group" aria-label="Order">${seg.map(([k, t, h]) => `<button type="button" data-co="${k}" title="${h}" aria-pressed="${!COVS.col && COV_ORDER === k}">${t}</button>`).join('')}</span>
      <span class="cov-key" aria-label="Colonies"><span class="cov-c cov-0">0</span>${COV.map((k, i) => `<span class="cov-c cov-${i + 1}">${COV[i + 1] ? (COV[i + 1] - 1 > k ? `${k}–${COV[i + 1] - 1}` : k) : k + '+'}</span>`).join('')}</span>
      <b class="${thin ? 'warnc' : ''}" title="Cells with 0-2 colonies">${thin} thin</b><b title="Cells at the cap of ${CELL_MAX} colonies or over: their candidates wait outside the swiper">${R.reduce((s, r) => s + r.cells.filter(c => c && c.obs >= CELL_MAX).length, 0)} full</b>${(k => (k ? `<b class="warnc" title="Cells over the cap of ${CELL_MAX} colonies (added anyway): orange outline below; adding to a full cell suggests a colony to retire">⚠ ${k} over the cap</b>` : ''))(R.reduce((s, r) => s + r.cells.filter(c => c && c.obs > CELL_MAX).length, 0))}<b class="cov-rich" title="Cells with 8+ colonies">${rich} at 8+</b></div>
    <details class="cov-legend"><summary>Legend</summary><dl>
      <dt><b>9</b></dt><dd>photos of the genus in the games, for this view</dd>
      <dt><small>6</small></dt><dd>colonies they come from, when fewer than photos (several photos of one colony count once)</dd>
      <dt>colour</dt><dd>colonies: <span class="cov-c cov-0">0</span> none · <span class="cov-c cov-1">1–2</span> thin · <span class="cov-c cov-2">3–4</span> · <span class="cov-c cov-3">5–7</span> · <span class="cov-c cov-4">8+</span></dd>
      <dt>excl.</dt><dd>photos of this view left out of the games, and why: <b>multi</b> several corals in the photo · <b>no form</b> growth form not visible (Colony view) · <b>sheet</b> shown on the genus sheet only · <b>CF</b> Coral Finder book (poor quality, rights) · <b>removed</b> taken out by you</dd>
      <dt>–</dt><dd>no such view for this genus (2-level genera have no Close-up)</dd>
      <dt>+</dt><dd>candidates waiting in Candidates, by source: <b>Dauin</b> iNaturalist at Dauin · <b>PH</b> iNaturalist elsewhere in the Philippines · <b>Own</b> your photos · <b>Other</b> iNaturalist elsewhere (Coral Finder book photos never counted)</dd>
      <dt>thin · full · at 8+</dt><dd>cells with 0–2 colonies · at the cap of ${CELL_MAX} colonies · with 8 or more</dd>
      <dt>Sources</dt><dd>all photos of the genus by origin (hover a segment)</dd></dl></details>
    <table class="cov-t"><thead><tr><th></th>${colTh(COVS)}<th class="cov-srch">Sources</th><th title="Candidates waiting in Candidates, by source (Coral Finder book photos not counted)">+</th></tr></thead>
    <tbody>${R.map(
      r => `<tr data-g="${esc(r.n)}"><th scope="row"><a href="#${esc(r.n)}"><i>${esc(r.n)}</i></a>${DATA.gen[r.n].n ? '' : DATA.gen[r.n].x ? ' <small class="fcov-x">not IMR</small>' : ' <small>★</small>'}</th>${r.cells.map((c, j) => cell(r, c, VIEWS[j][0])).join('')}
      <td class="cov-src"><span class="cov-bar">${bar(r)}</span><small>${r.all.length}</small></td><td class="cov-cand" title="${r.cand} candidate${r.cand === 1 ? '' : 's'}${CAND_SRC.filter(
        ([k]) => r.cby[k]
      )
        .map(([k, , l]) => ` · ${l} ${r.cby[k]}`)
        .join('')}">${CAND_SRC.filter(([k]) => r.cby[k])
        .map(([k, s]) => `<span class="o-${k}">${s} ${r.cby[k]}</span>`)
        .join('')}</td></tr>`
    ).join('')}</tbody></table></section>`;
  $v.querySelectorAll('[data-co]').forEach(
    b =>
      (b.onclick = () => {
        COV_ORDER = b.dataset.co;
        COVS.col = '';
        render();
      })
  );
  bindCol(COVS, () => {});
  $v.querySelectorAll('.cov-t tbody tr').forEach(
    tr =>
      (tr.onclick = e => {
        if (!e.target.closest('a')) location.hash = encodeURIComponent(tr.dataset.g);
      })
  );
  lookBanner();
}
// Where to look (Pierre, 2026-11-03: a banner above the Games grid, no longer a page of its own): the few genus x view
// cells most worth a candidate search now, ranked as in the full list (needsOf: most reasons first, then fewest
// colonies); "All N" opens the full list in the banner (~stats-needs: reason cards, view and genus filters, sort).
// It needs the answer log: the grid shows at once, the banner once the log is loaded.
const LOOK_N = 5;
function lookBanner() {
  const el = $v.querySelector('#cov-look');
  if (!el) return;
  if (!ANS) {
    el.innerHTML = '<p class="note">Loading…</p>';
    loadStats().then(() => (cur === '~cov' || cur === '~stats-needs') && lookBanner());
    return;
  }
  if (cur === '~stats-needs') {
    el.classList.add('open');
    return statsNeeds(el);
  }
  const VO = {wide: 0, medium: 1, macro: 2, zoom: 3},
    L = (NEEDS = needsOf()).slice().sort((a, b) => b.sc - a.sc || a.c.obs - b.c.obs || a.n.localeCompare(b.n) || VO[a.v] - VO[b.v]);
  el.innerHTML = L.length
    ? `<div class="cov-lookb"><a class="cov-lookt" href="#~stats-needs" title="Where to look for photos: the full list">Where to look</a>${L.slice(
        0,
        LOOK_N
      )
        .map(
          o =>
            `<a class="cov-lk" href="#${esc(encodeURIComponent(o.n))}" title="${esc(o.why.map(w => w[1]).join(' · '))}"><i>${esc(o.n)}</i> ${esc(o.vt)} <small>${esc(o.why.map(w => NEED_T[w[0]]).join(', '))}</small></a>`
        )
        .join('')}<a class="adm-link" href="#~stats-needs">All ${L.length} ›</a></div>`
    : '';
}

// Finder coverage (Pierre 2026-11-01): what the Coral Finder can show per genus, the IMR genera and the book's
// extra genera present at Dauin. Pool = every photo of the view not hidden, not multi-coral, approved CF book photos
// included; colour = distinct colonies with a photo that is not Poor; Forms = growth forms seen (Colony + Closer);
// Species = distinct species named on the photos.
let FCOV = Object.assign({set: 'all', order: 'thin', col: '', dir: 'asc'}, store.get('reefid-admin-fcov', {}));
function renderFcov() {
  status();
  const isX = n => !!(DATA.x && DATA.x.gen[n]);
  const names = Object.keys(DATA.gen).filter(n => FCOV.set === 'all' || (FCOV.set === 'x') === isX(n));
  const R = names.map((n, i) => {
    const pool = photos(n).filter(p => !hidden(n, p) && !p.multi);
    const cells = covViews(n).length
      ? VIEWS.map(([v]) =>
          covViews(n).some(x => x[0] === v)
            ? (L => {
                const good = L.filter(p => qOf(p.f) >= 2);
                return {n: L.length, obs: new Set(good.map(p => p.o || p.f)).size, cf: L.filter(p => p.cf).length, L};
              })(pool.filter(p => viewOf(n, p) === v))
            : null
        )
      : [];
    const live = cells.filter(Boolean),
      forms = [
        ...new Set(
          pool
            .filter(p => viewOf(n, p) !== 'macro')
            .map(p => fOf(p.f))
            .filter(f => f && FORM_ORDER.includes(f))
        )
      ].sort((a, b) => FORM_ORDER.indexOf(a) - FORM_ORDER.indexOf(b));
    const sp = [
      ...new Set(
        pool
          .map(p => p.t)
          .filter(t => t && /\s/.test(t.trim()))
          .map(t => t.trim().split(/\s+/).slice(0, 2).join(' '))
      )
    ].sort();
    return {
      n,
      i,
      x: isX(n),
      cand: pending(n).filter(p => !p.cf).length,
      cby: pending(n)
        .filter(p => !p.cf)
        .reduce((o, p) => ((o[origin(p)] = (o[origin(p)] || 0) + 1), o), {}),
      cells,
      min: live.length ? Math.min(...live.map(c => c.obs)) : 0,
      tot: pool.length,
      forms,
      sp
    };
  });
  const by = {
    thin: (a, b) => a.min - b.min || a.tot - b.tot || a.i - b.i,
    thick: (a, b) => b.tot - a.tot || a.i - b.i,
    az: (a, b) => a.n.localeCompare(b.n)
  };
  R.sort(by[FCOV.order] || by.thin);
  colSort(FCOV, R);
  const thin = R.reduce((s, r) => s + r.cells.filter(c => c && covLvl(c) < 2).length, 0);
  // A Finder-only genus's Colony and Close-up cells under its cap (capOf, colonies counted as in Candidates): outlined
  // when full or over it, as on Game coverage.
  const capCell = (n, v) => {
    if (isGame(n) || !capViews(n).some(x => x[0] === v)) return ['', ''];
    const k = covOf(n, v).obs,
      cap = capOf(n);
    return k > cap
      ? [' cov-over', `Over the cap of ${cap} colonies (${k}) · `]
      : k === cap
        ? [' cov-full', `Full (${cap} colonies) · `]
        : ['', ''];
  };
  const cell = (r, c, v) =>
    c
      ? `<td class="cov-c cov-${covLvl(c)}${capCell(r.n, v)[0]}" title="${capCell(r.n, v)[1]}${esc(label(r.n, v))}: ${c.n} photo${c.n === 1 ? '' : 's'} · ${c.obs} good colon${c.obs === 1 ? 'y' : 'ies'}${c.cf ? ` · ${c.cf} CF book` : ''}"><b>${c.n}</b><small>${c.obs} good</small>${c.cf ? `<span class="cov-off">incl. ${c.cf} CF</span>` : ''}</td>`
      : '<td class="cov-c cov-na">–</td>';
  const seg = (k, L) =>
    `<span class="adm-qseg adm-lvseg" role="group">${L.map(([v, t]) => `<button type="button" data-fc="${k}" data-v="${v}" aria-pressed="${FCOV[k] === v && !(k === 'order' && FCOV.col)}">${t}</button>`).join('')}</span>`;
  $v.innerHTML = `<section class="adm-cov">
    <div class="adm-filter cov-head">${seg('set', [
      ['all', 'All'],
      ['imr', 'IMR list'],
      ['x', 'Not IMR']
    ])}${seg('order', [
      ['thin', 'Thinnest'],
      ['thick', 'Thickest'],
      ['az', 'A–Z']
    ])}
      <span class="cov-key" aria-label="Good colonies"><span class="cov-c cov-0">0</span>${COV.map((k, i) => `<span class="cov-c cov-${i + 1}">${COV[i + 1] ? (COV[i + 1] - 1 > k ? `${k}–${COV[i + 1] - 1}` : k) : k + '+'}</span>`).join('')}</span>
      <b class="${thin ? 'warnc' : ''}" title="Cells with 0-2 good colonies">${thin} thin</b></div>
    <table class="cov-t fcov-t"><thead><tr><th></th>${colTh(FCOV)}<th class="fcov-fh">Forms</th><th class="fcov-sh">Species</th><th title="Candidates waiting in Candidates, by source (Coral Finder book photos not counted)">+</th></tr></thead>
    <tbody>${R.map(
      r => `<tr data-g="${esc(r.n)}"><th scope="row"><a href="#${esc(r.n)}"><i>${esc(r.n)}</i></a>${r.x ? ' <small class="fcov-x">not IMR</small>' : ''}</th>${r.cells.map((c, j) => cell(r, c, VIEWS[j][0])).join('')}
      <td class="fcov-f">${r.forms.map(f => `<span class="adm-why" title="${esc(fName(f))}">${FABBR[f]}</span>`).join(' ') || '<span title="No growth form set on these photos yet">–</span>'}</td>
      <td class="fcov-s" title="${esc(r.sp.join(', '))}">${r.sp.length || '–'}</td><td class="cov-cand" title="${r.cand} candidate${r.cand === 1 ? '' : 's'}${CAND_SRC.filter(
        ([k]) => r.cby[k]
      )
        .map(([k, , l]) => ` · ${l} ${r.cby[k]}`)
        .join('')}">${CAND_SRC.filter(([k]) => r.cby[k])
        .map(([k, s]) => `<span class="o-${k}">${s} ${r.cby[k]}</span>`)
        .join('')}</td></tr>`
    ).join('')}</tbody></table></section>`;
  bindCol(FCOV, () => store.set('reefid-admin-fcov', FCOV));
  $v.querySelectorAll('[data-fc]').forEach(
    b =>
      (b.onclick = () => {
        FCOV[b.dataset.fc] = b.dataset.v;
        if (b.dataset.fc === 'order') FCOV.col = '';
        store.set('reefid-admin-fcov', FCOV);
        render();
      })
  );
  $v.querySelectorAll('tbody tr').forEach(
    tr =>
      (tr.onclick = e => {
        if (!e.target.closest('a')) location.hash = encodeURIComponent(tr.dataset.g);
      })
  );
}

/* ---------- Hidden: every photo removed from the site (Genera › Hidden) ---------- */
// Photos taken off the site with Remove (curation.json genera[n].hide), every genus at once (Pierre, 2026-11-03: a view of
// Genera next to Excluded). Put back returns one to its view, as on its genus page; Undo steps back as everywhere.
function renderHidden() {
  status();
  // A removed photo no longer in the data (the genus page marks it "⚠ check") is listed by name: Put back drops the entry.
  const L = Object.keys(DATA.gen).flatMap(n => (entry(n).hide || []).map(f => [n, photos(n).find(p => p.f === f) || {f, gone: true}]));
  $v.innerHTML = `<section class="adm-quality"><div class="adm-qhead"><h2>Removed from the site <small>${L.length}</small></h2></div>
    ${
      L.length
        ? `<div class="adm-grid adm-qgrid">${L.map(
            ([n, p]) => `<figure class="adm-tile is-hidden" data-f="${esc(p.f)}" data-g="${esc(n)}">
      ${p.gone ? '<span class="adm-ph"><span class="none">no longer in the data</span></span>' : `<button type="button" class="adm-ph" data-zf="${esc(p.f)}" data-g="${esc(n)}" aria-label="Enlarge"><img src="${img(p, 1)}" alt="" loading="lazy"></button>`}
      <figcaption><a class="adm-gen" href="#${esc(encodeURIComponent(n))}"><i>${esc(n)}</i></a>${p.gone ? `<code class="adm-t">${esc(p.f)}</code>` : `<span class="adm-src view">${esc(label(n, viewOf(n, p)))}</span>${srcTag(p)}`}</figcaption>
      <div class="adm-acts"><button type="button" data-unhide>Put back</button></div></figure>`
          ).join('')}</div>`
        : '<p class="note">No photo removed.</p>'
    }</section>`;
  $v.querySelectorAll('[data-zf]').forEach(b => (b.onclick = () => zoom(b.dataset.g, b.dataset.zf)));
  $v.querySelectorAll('[data-unhide]').forEach(
    b =>
      (b.onclick = () => {
        const t = b.closest('[data-f]');
        ACT.hide(t.dataset.g, t.dataset.f);
      })
  );
}

/* ---------- Stats: players (anonymous) and photo difficulty, from the sync sheet ---------- */
// ?answers=1 (sheet script v4): every answer, RA replaced by an anonymous id; ?stats=1: Elo difficulty per photo and
// level per RA (same scale: a player whose level equals a photo's difficulty gets it right about half the time beyond chance).
// The views of Activity, Photo stats and To do › Health; their tab and view switch are in #subnav (navs()).
let ANS = null,
  RAS = {},
  SMEM = memOf(null),
  SCONF = {},
  MEID = null,
  SF = Object.assign({who: 'all', min: 1, elo: 'all', nk: '', nv: 'all', ns: 'sc', nd: 'desc'}, store.get('reefid-admin-stats', {}));
// Numbers replayed over the whole answer log (playSplit, levelMargin, confusionOf): once per log loaded, not at every
// render, sort or filter click (Pierre, 2026-11-03: admin pages load slower and slower, and the log keeps growing). ANS is
// replaced, never changed in place, whenever the log is loaded again.
let ANS_MEMO = {a: null, m: {}};
const ofAns = (k, fn) => {
  if (ANS_MEMO.a !== ANS) ANS_MEMO = {a: ANS, m: {}};
  return k in ANS_MEMO.m ? ANS_MEMO.m[k] : (ANS_MEMO.m[k] = fn());
};
// ratingsOnly (Photo stats › Overview): the photo ratings alone (?stats=1), not the whole answer log.
function loadStats(ratingsOnly) {
  // Script v6 keeps the anonymous-id salt secret and returns the caller's own id (me) for its name and code; the
  // local digest below only matches script v5 and older.
  const sy = store.get('reefid-account', null) || {},
    me = sy.name;
  const digest = me
    ? crypto.subtle
        .digest('SHA-256', new TextEncoder().encode(`imr-coral-id|anon|${me.trim().toLowerCase()}`))
        .then(b => {
          MEID = btoa(String.fromCharCode(...new Uint8Array(b))).slice(0, 8);
        })
        .catch(() => {})
    : Promise.resolve();
  const get = q =>
    fetch(SYNC_URL + q)
      .then(r => r.json())
      .catch(() => ({}));
  // Sheet v14: per-player numbers (the answer log, players' levels) only with this page's GitHub token, by POST; the
  // caller's own name and code go as aname/apin (never name/pin, which an older script would take for a progress write).
  // A script before v14 answers 'input' to those POSTs: fall back to its public GETs.
  const post = b =>
    fetch(SYNC_URL, {method: 'POST', body: JSON.stringify({...b, token: TOKEN})})
      .then(r => r.json())
      .catch(() => ({}));
  const who = me && sy.pin ? `&name=${encodeURIComponent(me)}&pin=${encodeURIComponent(sy.pin)}` : '';
  const old = (j, q) => (j && j.error === 'input' ? get(q) : j);
  const ga = ratingsOnly
      ? null
      : TOKEN
        ? post({readAnswers: 1, ...(me && sy.pin ? {aname: me, apin: sy.pin} : {})}).then(j => old(j, '?answers=1' + who))
        : Promise.resolve({ok: false, error: 'token'}),
    gs = STATS ? null : TOKEN ? post({readStats: 1}).then(j => old(j, '?stats=1')) : get('?stats=1');
  return Promise.all([ga, gs, digest]).then(([a, s]) => {
    if (!ratingsOnly) {
      ELO_NOME = null;
      if (a && a.me) MEID = a.me;
      ANS = a && a.ok && a.rows ? a : {old: true, v: a && a.v, err: a && a.error, rows: [], players: {}};
      ANS.at = Date.now(); // when it was read (Recent sessions: "as of")
    }
    if (s) {
      STATS = s.ok ? s.photos || {} : {};
      RAS = s.ok ? s.ras || {} : {};
      // The photo memory offsets and pooled confusions the app plays with (its PMEM, PCONF), for the full replay.
      SMEM = memOf(s.ok && s.mem);
      SCONF = (s.ok && s.conf) || {};
    }
  });
}
// Your accounts (Pierre, 2026-11-03: his old account, renamed Pierre-test, and the new one): the one this browser is signed
// in with (MEID) and the others marked "This is also me" in Players > Manage (kept in this browser, ME_KEY). Every
// "Without me" / "Me" filter and the "you" marks use the whole set. No name is written in the code.
const ME_KEY = 'reefid-admin-me',
  myIds = () => new Set([MEID, ...(store.get(ME_KEY, []) || [])].filter(Boolean)),
  isMe = id => !!id && myIds().has(id);
// Photo Elo with or without this browser's own answers (Pierre, 2026-11-01: the author knows the photos, so his answers
// bias their difficulty). "All" is the sheet's ?stats=1, the ratings the games use. "Without me" replays the same Elo
// (eloOf, a copy of stats_ in tools/sync/Code.gs: keep the two in step) over the answer log minus your accounts' answers.
// Nothing is reset or stored: the log is kept, so any filter is a fresh replay.
// eloOf(rows) lives in core.js (tests/core.test.js checks it against Code.gs stats_).
let ELO_NOME = null;
// Answers that rated a photo (sheet v18's 4th field); the weighed count before v18. The filters use it: a photo answered
// once weighs under 1 (n / (n + 10)) and "≥1" hid it (Pierre, 2026-11-02: only ~100 photos of the ~300 answered).
const nAns = s => (s ? (s[3] ?? s[1]) : 0);
const photoStats = () =>
  SF.elo !== 'others' || !myIds().size || !ANS ? STATS : (ELO_NOME = ELO_NOME || eloOf(ANS.rows.filter(r => !isMe(r[0]))));
const eloSeg = () =>
  myIds().size
    ? segBtns('elo', [
        ['all', 'All'],
        ['others', 'Without me']
      ])
    : '';
// Empty view with "Without me" / "Others": say why (all the answers are this browser's) instead of "No answers yet".
const noneButMe = () => {
  const n = ANS.rows.length,
    mine = ANS.rows.filter(r => isMe(r[0])).length;
  return !n
    ? 'No answers yet.'
    : mine === n
      ? `All ${n} answers are yours: nothing to show without them yet. Switch to All.`
      : 'No answers from other players with enough answers yet.';
};
const pct = (r, n) => (n ? Math.round((100 * r) / n) + '%' : '–');
const sgn = d => (d > 0 ? '+' : '') + d.toFixed(2);
const days = t => {
  const d = Math.floor((Date.now() - t) / 864e5);
  return d < 1 ? 'today' : d < 2 ? 'yesterday' : d + ' d ago';
};
// When, to the minute (Pierre, 2026-11-03: who played most recently): "now" (less than RECENT.NOW minutes), "12 min ago",
// "3 h ago" (today), "yesterday 18:40" ("yest. 18:40" on phones, a narrower Last column; Pierre, 2026-11-03), then the
// date. Its title gives the full date and time. Midnight of this browser.
const PHONE = matchMedia('(max-width: 599.98px)'),
  yest = t => `${PHONE.matches ? 'yest.' : 'yesterday'} ${dateText(t, 'hm')}`;
const dayStart = (k = 0) => new Date().setHours(0, 0, 0, 0) - k * 864e5,
  isNow = t => !!t && Date.now() - t < RECENT.NOW * 6e4,
  agoText = t => {
    const m = Math.floor((Date.now() - t) / 6e4);
    return isNow(t)
      ? 'now'
      : m < 60
        ? `${m} min ago`
        : t >= dayStart()
          ? `${Math.floor(m / 60)} h ago`
          : t >= dayStart(1)
            ? yest(t)
            : dateText(t, 'dm');
  },
  // A name or other free text in a table cell: never wider than the column cap (.adm-cut, admin.css), the full text in
  // its title. A player hidden from the leaderboard is greyed (Pierre, 2026-11-03: the "hidden" tag widened Name).
  cut = s => `<span class="adm-cut" title="${esc(s)}">${esc(s)}</span>`,
  pname = (n, hid) =>
    `<b class="adm-cut${hid ? ' adm-uhid' : ''}" title="${esc(n)}${hid ? ' (hidden from the leaderboard)' : ''}">${esc(n)}</b>`,
  ago = t =>
    t ? `<span class="adm-ago${isNow(t) ? ' now' : ''}" data-t="${t}" title="${esc(dateText(t, 'dmhm'))}">${agoText(t)}</span>` : '–',
  // A clock time: "14:05" today, "yesterday 14:05" (phones "yest. 14:05"), else the date and time.
  clock = t => (t >= dayStart() ? dateText(t, 'hm') : t >= dayStart(1) ? yest(t) : dateText(t, 'dmhm'));
// Any table cell cut short by the column cap (admin.css .adm-tbl td) shows its full text on hover, in every table
// without per-table code: the title is set the first time the pointer goes over it.
$v.addEventListener('mouseover', e => {
  const td = e.target.closest && e.target.closest('.adm-tbl td');
  if (td && !td.title && td.scrollWidth > td.clientWidth + 1) td.title = td.innerText.trim();
});
const segBtns = (k, L) =>
  `<span class="adm-qseg adm-sseg" role="group">${L.map(([v, t]) => `<button type="button" data-sf="${k}" data-v="${v}" aria-pressed="${String(SF[k]) === String(v)}">${t}</button>`).join('')}</span>`;
const kpis = L => `<div class="adm-kpis">${L.map(([t, v]) => `<div><b>${v}</b><span>${t}</span></div>`).join('')}</div>`;
const sbar = (v, max, cls = '') =>
  `<span class="adm-bar${cls ? ' ' + cls : ''}"><i style="width:${max ? Math.max(0, Math.min(100, (100 * v) / max)) : 0}%"></i></span>`;
function bindStats() {
  $v.querySelectorAll('[data-sf]').forEach(
    b =>
      (b.onclick = () => {
        const k = b.dataset.sf;
        SF[k] = k === 'min' ? Number(b.dataset.v) : b.dataset.v;
        store.set('reefid-admin-stats', SF);
        render();
      })
  );
  $v.querySelectorAll('[data-zf]').forEach(b => (b.onclick = () => zoom(b.dataset.g, b.dataset.zf)));
  // ↻ on Activity: the answer log and the player list read again (who is playing now), the photo ratings kept. A manual
  // reload only, no timer: each read sends the whole answer log (docs/ARCHITECTURE.md "Recent sessions and who is playing now").
  const rl = $v.querySelector('[data-sload]');
  if (rl)
    rl.onclick = () => {
      ANS = null;
      USERS = null;
      render();
    };
}
// Users, a header tab of its own (Pierre, 2026-11-01: "now that beta testers come, I need to see and manage them"; not under Stats, it manages players): every player who signed in,
// by name, with their numbers, from sheet script v11 (POST {users: 1, token}; names, so the admin token is checked like
// for reports). Merge = two names of one person: the progress is merged here (core.js mergeUsers: answers add up, the
// busier account's model per genus), then the sheet relabels the answers and reports and deletes the other name.
// Delete = a test or abandoned account (its answers stay for photo difficulty, without the name, unless asked).
// Both are permanent, so both ask first; a device still signed in with the old name is told and asked to sign out.
let USERS = null,
  usersAt = 0,
  uOpen = null;
function loadUsers(force) {
  if (!force && USERS && Date.now() - usersAt < 120000) return Promise.resolve(USERS);
  if (!TOKEN) {
    USERS = {err: 'Needs the GitHub token'};
    return Promise.resolve(USERS);
  }
  return fetch(SYNC_URL, {method: 'POST', body: JSON.stringify({users: 1, token: TOKEN})})
    .then(r => r.json())
    .then(j => {
      usersAt = Date.now();
      USERS =
        j && j.ok && j.users
          ? j
          : {
              err:
                !j || !j.v || j.v < 11
                  ? `Sheet script v11 not deployed (live: v${esc((j && j.v) || '?')})`
                  : j.error === 'token'
                    ? 'Token refused'
                    : 'Not available'
            };
      return USERS;
    })
    .catch(() => (USERS = {err: 'Offline'}));
}
const userPost = body => fetch(SYNC_URL, {method: 'POST', body: JSON.stringify({...body, token: TOKEN})}).then(r => r.json());
// Players' saved progress (sheet userData, this page's token; Code.gs users_ gives only its summary columns): read once
// per data load, 4 at a time, for the full replay's mastery exams and the saved copy's numbers (progOf) and the
// journey's cards (admin-journey.js). name -> null while reading, then {P, intro, offer, reset} or {err}. Kept, a failed
// read too, until ↻ (savedClear): a read is never started again by itself (Codex review #352: an error re-read at once
// looped). The page is drawn again when the last read is in (Players) or when the player's own is (their Journey).
const PSAVED = {};
let savedQ = [],
  savedRun = 0,
  savedGen = 0;
function savedOf(name) {
  if (name in PSAVED) return PSAVED[name];
  PSAVED[name] = null;
  savedQ.push(name);
  savedPump();
  return null;
}
function savedPump() {
  while (savedRun < 4 && savedQ.length) {
    const name = savedQ.shift(),
      gen = savedGen;
    savedRun++;
    userPost({userData: name})
      .then(j => {
        if (gen !== savedGen) return;
        if (!(j && j.ok)) return (PSAVED[name] = {err: (j && j.error) || 'unreachable'});
        const d = j.data || {},
          P = k => {
            try {
              return JSON.parse(d[k] || 'null');
            } catch (e) {
              return null;
            }
          };
        PSAVED[name] = {
          P: P('reefid-sync-coral-progress') || {},
          intro: P('reefid-sync-coral-intro') || {},
          offer: P('reefid-sync-coral-intro-offer'),
          start: P('reefid-sync-coral-start'), // the first-launch question (admin-journey.js)
          reset: P('reefid-sync-coral-reset')
        };
      })
      .catch(() => gen === savedGen && (PSAVED[name] = {err: 'unreachable'}))
      .then(() => {
        savedRun--;
        savedPump();
        if (gen === savedGen && (cur === '~journey/' + name || (cur === '~users' && !savedRun && !savedQ.length))) render();
      });
  }
}
function savedClear() {
  savedGen++;
  savedQ = [];
  Object.keys(PSAVED).forEach(k => delete PSAVED[k]);
}
// Full replay (Pierre, 2026-11-03: "recalculate from all the results"; docs/LEARNING.md "Full replay"): one player's
// progress rebuilt from the answer log with today's rules (core.js replayProgress: the app's weights, photo memory from
// their own history, the sheet's memory offsets SMEM and pooled confusions SCONF), with what only their saved copy holds
// (core.js replayedOf: the mastery exam, dropped when passed under the former model). Beside it, the saved copy's own
// numbers: its % (core.js pctOf, the leaderboard's) and the sheet's Learned column; stale when they differ (a player who
// has not opened the app since a recalculation, or whose last answers are not saved yet). Signed-in players by name,
// devices that never signed in by anonymous id (no saved copy: nothing to compare). null while the saved copy is read.
// Computed once per data load (the answer log, the stats, the saved copy), memoized.
// Only from sheet script v28 (core.js RV_SHEET; AGENTS.md 7a: the admin never gets ahead of the script): before it the
// players' apps keep their own progress, so the admin shows what it did before: the sheet's Learned column, no Progress
// column, and the Journey's learned genera from the saved copy as it is ({off: 1, G: the saved progress}).
const replayOn = () => Math.max((ANS && ANS.v) || 0, (USERS && USERS.v) || 0) >= RV_SHEET;
const PROGM = new Map();
let ROWSBY = null;
function progOf(u) {
  if (!ANS || !DATA || !u || !u.id) return null;
  const S = u.anon ? {P: {}} : savedOf(u.name);
  if (!S) return null;
  if (!replayOn()) return {off: 1, G: S.err ? {} : S.P || {}, err: S.err};
  const m = PROGM.get(u.id);
  if (m && m.ans === ANS && m.S === S && m.mem === SMEM && m.learned === u.learned) return m.v;
  if (!ROWSBY || ROWSBY.ans !== ANS) {
    ROWSBY = {ans: ANS, by: {}};
    (ANS.rows || []).forEach(r => (ROWSBY.by[r[0]] = ROWSBY.by[r[0]] || []).push(r));
  }
  const reset = !S.err && S.reset ? Date.parse(S.reset) : 0,
    rep = replayProgress(ROWSBY.by[u.id] || [], {
      gen: DATA.gen,
      mem: SMEM,
      conf: SCONF,
      since: reset ? {[u.id]: reset} : {},
      starts: S.err ? {} : {[u.id]: S.start} // the first-launch answer (core.js startPriorAt)
    })[u.id],
    L = slateOf(DATA), // the slate as the app counts it (core.js slateOf): the progress % and Learned are over it
    G = replayedOf(rep, S.err ? {} : S.P),
    v = {G, pct: pctOf(G, L), learned: learnedOf(G, L), total: L.length, err: S.err};
  if (!u.anon && !S.err) {
    v.saved = {pct: pctOf(S.P, L), learned: u.learned};
    v.stale = v.saved.pct !== v.pct || v.saved.learned !== v.learned;
  }
  PROGM.set(u.id, {ans: ANS, S, mem: SMEM, learned: u.learned, v});
  return v;
}
// The replayed value, and discreetly what the saved copy says when it differs (↻ saved …: the copy in the sheet is stale).
const staleTip =
  'Replayed from every answer in the log with the current rules. The copy saved in the sheet says otherwise: the player has not opened the app since.';
const withSaved = (v, sv) => (sv == null || sv === v ? v : `${v} <small class="adm-saved" title="${staleTip}">↻ saved ${sv}</small>`);
// Players page (Pierre, 2026-11-01: "one page, sort the players by name or by score, and act on them there"): the Users
// list (names, from the token-guarded sheet call, v11) joined with the anonymous answer stats (?answers=1, ?stats=1) by
// each player's anonymous id (users_ id, sheet v13). One row per signed-in player, sortable by any column; a row opens
// their games, mix-ups, genera to review and Merge / Delete. Answers of devices that never signed in (and of deleted
// accounts) have no name: they are counted apart, below. Activity keeps the class-wide charts.
const UCOLS = [
  ['name', 'Name', u => u.name.toLowerCase(), 1],
  // One column for the level (Pierre, 2026-11-03: Level and Elo said the same thing): the Elo players see.
  [
    'elo',
    'Elo',
    u => u.lv ?? -99,
    0,
    'Overall level on the photo-difficulty scale, as the Elo players see (1000 + 200 × level, shown to them from 200 answers), ± its 95% margin'
  ],
  ['answers', 'Answers', u => u.answers, 0],
  [
    'right',
    'Quiz',
    u => (u.qz[0] ? u.qz[1] / u.qz[0] : -1),
    0,
    'Right in the Quiz and the Custom quiz (duels slipped into them included; not the Duels tab)'
  ],
  ['recent', 'Last 50', u => (u.q50[0] ? u.q50[1] / u.q50[0] : -1), 0, 'Right among their last 50 Quiz answers'],
  ['duels', 'Duels', u => u.du[0], 0, 'Answers in the Duel tab (2 choices), with their right share'],
  ['days', 'Days', u => u.days, 0, 'Days with answers'],
  [
    'prog',
    'Progress',
    u => (u.pg ? u.pg.pct : -1),
    0,
    'Progress %, replayed from every answer in the log with the current rules (↻ saved: what the copy in the sheet still says)'
  ],
  ['learned', 'Learned', u => (u.pg && !u.pg.err ? u.pg.learned : u.learned), 0, 'Genera learned (mastery exam passed)'],
  ['seen', 'Seen', u => u.seen, 0, 'Genera seen'],
  ['reports', 'Reports', u => u.reports || 0, 0, 'Reports sent']
];
// Last answer, second column (Pierre, 2026-11-03: who played most recently, seen on a phone without scrolling sideways),
// to the minute, sorted by its exact time; the default sort, most recent first.
UCOLS.splice(1, 0, ['last', 'Last', u => u.at || 0, 0, `Last answer (now = less than ${RECENT.NOW} minutes ago)`]);
function renderUsers() {
  status();
  const head = `<div class="adm-shead"><h2>Players</h2><button type="button" class="adm-fchip plain" data-uload title="Reload">↻</button></div>`;
  if (!USERS || !ANS) {
    $v.innerHTML = head + '<p class="note">Loading…</p>';
    Promise.all([loadUsers(), ANS ? null : loadStats()]).then(() => {
      if (cur === '~users') render();
    });
    return;
  }
  if (USERS.err) {
    $v.innerHTML =
      head +
      `<p class="warn">${USERS.err}${/v11/.test(USERS.err) ? ` · <a href="https://raw.githubusercontent.com/${REPO}/main/tools/sync/Code.gs" target="_blank" rel="noopener">Code.gs</a>` : ''}</p>`;
    bindUsers();
    return;
  }
  // The Progress column only from sheet script v28 (replayOn).
  const COLS = UCOLS.filter(c => c[0] !== 'prog' || replayOn()),
    col = COLS.find(c => c[0] === SF.us) || COLS.find(c => c[0] === 'last'),
    sk = col[0],
    sd = SF.us === sk && SF.ud ? SF.ud : col[3] ? 'asc' : 'desc';
  // Quiz and Duel tab apart (core.js playSplit), on each row before the sort reads them (Codex review #383); a player whose
  // answers did not load keeps the sheet's all-games counts.
  const SPLIT = ofAns('split', () => playSplit(ANS.rows || [])),
    psOf = u => SPLIT[u.id] || {q: [u.answers, u.right], q50: u.recent, d: [0, 0]},
    // Each player's last answer in the log loaded (ms), fresher than the player list's (kept 2 minutes, loadUsers).
    LAST = ofAns('last', () => {
      const o = Object.create(null);
      (ANS.rows || []).forEach(r => r[1] > (o[r[0]] || 0) && (o[r[0]] = r[1]));
      return o;
    });
  const U = USERS.users
      .map(u => {
        const p = psOf(u);
        return {
          ...u,
          lv: u.id && RAS[u.id] ? RAS[u.id][0] : null,
          qz: p.q,
          q50: p.q50,
          du: p.d,
          at: Math.max((u.id && LAST[u.id]) || 0, u.last || 0) || u.updated || 0,
          pg: replayOn() ? progOf(u) : null
        };
      })
      .sort((a, b) => {
        const x = col[2](a),
          y = col[2](b);
        return (x < y ? -1 : x > y ? 1 : 0) * (sd === 'asc' ? 1 : -1) || b.at - a.at;
      }),
    total = DATA ? Object.keys(DATA.gen).length : 0;
  const date = t => (t ? dateText(t, 'dm') : '–');
  const opts = n =>
    U.filter(u => u.name !== n)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(u => `<option>${esc(u.name)}</option>`)
      .join('');
  // A player's games, mix-ups, genera to review and days played are on their Journey page (Pierre, 2026-11-02: one place
  // for a player's path); the row only opens it and the account tools.
  // One compact bar under the row (Pierre, 2026-11-03: a big card for one Journey link and a tall Manage card wasted the
  // space): Journey first, the account's state with its toggle, then the account tools, Delete last on the right.
  const detail = u => `<tr class="adm-udet"><td colspan="${COLS.length + 1}"><div class="adm-ubar">
      <a class="next" href="#~journey/${encodeURIComponent(u.name)}">Journey →</a>
      ${u.pg ? `<span class="adm-uprog">Progress ${withSaved(u.pg.pct + '%', u.pg.saved && u.pg.saved.pct + '%')} · Learned ${withSaved(`${u.pg.learned}`, u.pg.saved && `${u.pg.saved.learned}`)}${u.pg.err ? ` <small title="Their saved copy could not be read (${esc(u.pg.err)}): no mastery exam counted; ↻ to try again">?</small>` : ''}</span>` : ''}
      <span>${u.board === -1 ? 'Hidden from the leaderboard' : u.board === 0 ? 'Off the leaderboard (their choice)' : 'On the leaderboard'} <button type="button" class="adm-fchip" data-uboard="${esc(u.name)}" data-hide="${u.board === -1 ? 0 : 1}">${u.board === -1 ? 'Show' : 'Hide'}</button></span>
      ${u.id && u.id !== MEID ? `<span>${isMe(u.id) ? 'Counted as you (left out by Without me / Others)' : 'Another player'} <button type="button" class="adm-fchip" data-ume="${esc(u.id)}">${isMe(u.id) ? 'Not me' : 'This is also me'}</button></span>` : ''}
      <label>Merge into <select data-umerge="${esc(u.name)}"><option value="">…</option>${opts(u.name)}</select></label>
      <button type="button" class="adm-fchip" data-uren="${esc(u.name)}">Rename…</button>
      <button type="button" class="adm-danger" data-udel="${esc(u.name)}">Delete</button></div></td></tr>`;
  // Answers without a name: devices that never signed in (~anon) and deleted accounts, by anonymous id.
  const LVM = ofAns('margin', () => levelMargin(ANS.rows || [])), // 95% margin of each player's level (core.js)
    named = new Set(U.map(u => u.id).filter(Boolean)),
    A = {};
  // Sheet v13 gives ids; an older one doesn't, and every answer would look anonymous. With v13 an empty list is fine.
  if ((USERS.v || 0) >= 13)
    (ANS.rows || []).forEach(r => {
      if (named.has(r[0])) return;
      const a = (A[r[0]] = A[r[0]] || {n: 0, ok: 0, last: 0, first: Infinity});
      a.n++;
      a.ok += r[4];
      if (r[1] > a.last) a.last = r[1];
      if (r[1] < a.first) a.first = r[1];
    });
  const anon = Object.entries(A).sort((a, b) => b[1].last - a[1].last);
  const act = U.filter(u => u.last && Date.now() - u.last < 7 * 864e5).length,
    ans = U.reduce((t, u) => t + u.answers, 0);
  const cell = (k, u) =>
    ({
      name: `${pname(u.name, u.board === -1)}${isMe(u.id) ? ' <small>you</small>' : ''}`,
      elo:
        u.lv == null
          ? '–'
          : `${Math.round(1000 + 200 * u.lv)}${u.id && isFinite(LVM[u.id]) ? ` <small>±${Math.round((200 * LVM[u.id]) / 10) * 10}</small>` : ''}`,
      answers: u.answers,
      right: pct(u.qz[1], u.qz[0]),
      recent: pct(u.q50[1], u.q50[0]),
      duels: u.du[0] ? `${u.du[0]} <small>${pct(u.du[1], u.du[0])}</small>` : '',
      days: u.days,
      prog: !u.pg ? '…' : withSaved(u.pg.pct + '%', u.pg.saved && u.pg.saved.pct + '%'),
      learned: !replayOn()
        ? `${u.learned}/${u.total || total}`
        : !u.pg
          ? '…'
          : u.pg.err
            ? `${u.learned}/${u.total || total}`
            : withSaved(`${u.pg.learned}/${u.pg.total}`, u.pg.saved && `${u.pg.saved.learned}/${u.pg.total}`),
      seen: u.seen,
      reports: u.reports || '',
      last: ago(u.at)
    })[k];
  $v.innerHTML =
    head +
    kpis([
      ['Players', U.length],
      ['Active 7 d', act],
      ['Answers', ans],
      ['Not signed in', anon.length]
    ]) +
    (U.some(u => !u.id) ? `<p class="note">Level shows once the sheet script v13 is live (it adds each player's anonymous id).</p>` : '') +
    (!U.length
      ? '<p class="note">Nobody has signed in yet.</p>'
      : `
    <section class="adm-scard adm-ucard"><div class="adm-tscroll"><table class="adm-tbl adm-utbl"><thead><tr>${COLS.map(
      ([k, t, , , tip]) =>
        `<th${tip ? ` title="${esc(tip)}"` : ''}><button type="button" class="adm-usort" data-usort="${k}" aria-pressed="${k === sk}">${t}${k === sk ? (sd === 'asc' ? ' ▴' : ' ▾') : ''}</button></th>`
    ).join('')}<th></th></tr></thead><tbody>
      ${U.map(
        u =>
          `<tr class="adm-urow${uOpen === u.name ? ' open' : ''}${isMe(u.id) ? ' me' : ''}" data-uopen="${esc(u.name)}">${COLS.map(([k]) => `<td>${cell(k, u)}</td>`).join('')}<td>${uOpen === u.name ? '▾' : '▸'}</td></tr>${uOpen === u.name ? detail(u) : ''}`
      ).join('')}</tbody></table></div></section>`) +
    (anon.length
      ? `<details class="adm-uremoved" open><summary>Not signed in (${anon.length})</summary><div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th><input type="checkbox" data-aall aria-label="Select all"></th><th>Id</th><th>Level</th><th>Answers</th><th>Right</th>${replayOn() ? '<th title="Replayed from their answers with the current rules">Progress</th>' : ''}<th>First</th><th>Last</th></tr></thead><tbody>${anon
          .map(
            ([id, a]) =>
              `<tr><td><input type="checkbox" data-aid="${esc(id)}" aria-label="Select ${esc(id)}"></td><td><a href="#~anon/${encodeURIComponent(id)}" title="Journey"><code>${esc(id)}</code></a></td><td>${RAS[id] ? sgn(RAS[id][0]) : '–'}</td><td>${a.n}</td><td>${pct(a.ok, a.n)}</td>${replayOn() ? `<td>${progOf({id, anon: 1}).pct}%</td>` : ''}<td>${days(a.first)}</td><td>${ago(a.last)}</td></tr>`
          )
          .join(
            ''
          )}</tbody></table></div><p><button type="button" class="adm-danger" data-adel disabled${(USERS.v || 0) < 17 ? ' data-old' : ''}>Delete the answers of the selected ids</button>${(USERS.v || 0) < 17 ? ` <small class="note">Needs the sheet script v17 (live: v${USERS.v || '?'}).</small>` : ''}</p></details>`
      : '') +
    (USERS.removed.length
      ? `<details class="adm-uremoved"><summary>Removed (${USERS.removed.length})</summary><table class="adm-tbl">${USERS.removed.map(r => `<tr><td>${cut(r.name)}</td><td>${r.into ? `merged into <b>${cut(r.into)}</b>` : 'deleted'}</td><td>${date(r.time)}</td></tr>`).join('')}</table></details>`
      : '');
  bindUsers();
}
function bindUsers() {
  $v.querySelectorAll('[data-usort]').forEach(
    b =>
      (b.onclick = () => {
        const k = b.dataset.usort,
          c = UCOLS.find(x => x[0] === k);
        SF.ud = SF.us === k ? ((SF.ud || (c[3] ? 'asc' : 'desc')) === 'asc' ? 'desc' : 'asc') : c[3] ? 'asc' : 'desc';
        SF.us = k;
        store.set('reefid-admin-stats', SF);
        render();
      })
  );
  const rl = $v.querySelector('[data-uload]');
  if (rl)
    rl.onclick = () => {
      USERS = null;
      ANS = null;
      STATS = null; // levels (ras) too, not only the counts
      savedClear(); // the players' saved progress (Progress, Learned, the journeys' cards) too
      render();
    };
  $v.querySelectorAll('[data-uopen]').forEach(
    tr =>
      (tr.onclick = () => {
        uOpen = uOpen === tr.dataset.uopen ? null : tr.dataset.uopen;
        render();
      })
  );
  const done = (msg, j) => {
    if (j && j.ok) {
      toast(msg);
      USERS = null;
      ANS = null; // answers moved to another name or deleted: the levels and counts change
      STATS = null;
      savedClear(); // progress merged, renamed or deleted
      uOpen = null;
      render();
    } else toast(j && j.error === 'stale' ? 'The player just synced: try again.' : `Not done (${(j && j.error) || 'offline'}).`);
  };
  // Leaderboard (sheet v20, Pierre 2026-11-02: a test account must not show there): hidden by an admin, which the
  // player's own syncs never undo; Show puts them back. Only the leaderboard changes: answers, progress, stats stay.
  // Your other accounts (myIds): kept in this browser; the filtered views are replayed (ELO_NOME) with the new set.
  $v.querySelectorAll('[data-ume]').forEach(
    b =>
      (b.onclick = () => {
        const id = b.dataset.ume,
          L = (store.get(ME_KEY, []) || []).filter(x => x !== id);
        if (!isMe(id)) L.push(id);
        store.set(ME_KEY, L);
        ELO_NOME = null;
        render();
      })
  );
  $v.querySelectorAll('[data-uboard]').forEach(
    b =>
      (b.onclick = () => {
        const name = b.dataset.uboard,
          hide = b.dataset.hide === '1';
        userPost({userBoard: name, hide})
          .then(j =>
            j && j.ok
              ? (((USERS.users.find(x => x.name === name) || {}).board = j.board),
                toast(hide ? `"${name}" hidden from the leaderboard.` : `"${name}" back on the leaderboard.`),
                render())
              : toast(`Not done (${(j && j.error) || 'offline'}${j && j.error === 'input' ? ': needs the sheet script v20' : ''}).`)
          )
          .catch(() => toast('Not done (offline).'));
      })
  );
  // Rename (sheet v20, Pierre 2026-11-02): keep a record apart under a new name ("Pierre-test"), off the leaderboard; the
  // old name is free again, so its owner can sign out on their devices and sign in under it to start over.
  $v.querySelectorAll('[data-uren]').forEach(
    b =>
      (b.onclick = () => {
        const name = b.dataset.uren,
          into = (prompt(`New name for "${name}"?`, `${name}-test`) || '').trim();
        if (!into || into === name) return;
        if (
          !confirm(
            `Rename "${name}" to "${into}"?\n\nTheir answers, reports and progress move to "${into}", hidden from the leaderboard; the app no longer opens it (an archive, here in the admin).\n"${name}" is free again: to start over under it, sign out on each device, then sign in as "${name}".`
          )
        )
          return;
        userPost({userRename: {from: name, into}})
          .then(j =>
            j && j.error === 'exists'
              ? toast(`"${into}" is already a player.`)
              : j && j.error === 'input'
                ? toast('Not done: needs the sheet script v20.')
                : done(`"${name}" renamed "${into}".`, j)
          )
          .catch(() => done('', null));
      })
  );
  $v.querySelectorAll('[data-umerge]').forEach(
    s =>
      (s.onchange = () => {
        const from = s.dataset.umerge,
          into = s.value;
        if (!into) return;
        if (
          !confirm(
            `Merge "${from}" into "${into}"?\n\nTheir progress is combined under "${into}", every answer and report of "${from}" is moved to "${into}", and "${from}" is deleted. This cannot be undone.`
          )
        ) {
          s.value = '';
          return;
        }
        toast('Merging…');
        Promise.all([userPost({userData: from}), userPost({userData: into})])
          .then(([a, b]) => {
            if (!(a && a.ok && b && b.ok)) return done('', a && !a.ok ? a : b);
            return userPost({userMerge: {from, into, data: mergeUsers(a.data, b.data), at: b.rev}}).then(j =>
              done(`"${from}" merged into "${into}".`, j)
            );
          })
          .catch(() => done('', null));
      })
  );
  // Answers without a name (test runs, junk): select ids, then delete all their answers (sheet v17 anonDelete).
  const aBoxes = [...$v.querySelectorAll('[data-aid]')],
    aBtn = $v.querySelector('[data-adel]'),
    aSync = () => aBtn && (aBtn.disabled = 'old' in aBtn.dataset || !aBoxes.some(x => x.checked));
  aBoxes.forEach(x => (x.onchange = aSync));
  const aAll = $v.querySelector('[data-aall]');
  if (aAll)
    aAll.onchange = () => {
      aBoxes.forEach(x => (x.checked = aAll.checked));
      aSync();
    };
  if (aBtn)
    aBtn.onclick = () => {
      const ids = aBoxes.filter(x => x.checked).map(x => x.dataset.aid);
      if (
        !ids.length ||
        !confirm(
          `Delete every answer of ${ids.length} anonymous id${ids.length > 1 ? 's' : ''}?\n\nFor test runs and junk. This cannot be undone.`
        )
      )
        return;
      userPost({anonDelete: ids})
        .then(j => done(j && j.ok ? `${j.answers} answer${j.answers === 1 ? '' : 's'} deleted.` : '', j))
        .catch(() => done('', null));
    };
  $v.querySelectorAll('[data-udel]').forEach(
    b =>
      (b.onclick = () => {
        const name = b.dataset.udel,
          u = (USERS.users || []).find(x => x.name === name) || {answers: 0};
        if (!confirm(`Delete "${name}"?\n\nTheir account and progress are deleted. This cannot be undone.`)) return;
        const drop =
          u.answers > 0 &&
          confirm(
            `Also delete their ${u.answers} answer${u.answers === 1 ? '' : 's'}?\n\nOK: delete them too (a test account).\nCancel: keep them without the name (they help rate photo difficulty).`
          );
        userPost({userDelete: name, answers: drop})
          .then(j => done(`"${name}" deleted.`, j))
          .catch(() => done('', null));
      })
  );
}
function renderStats() {
  status();
  // Activity's Recent sessions name the signed-in players (USERS); the other views need the answer log only.
  const named = cur === '~stats' && !USERS;
  if (!ANS || named) {
    $v.innerHTML = '<p class="note">Loading…</p>';
    Promise.all([ANS ? null : loadStats(), named ? loadUsers() : null]).then(() => {
      if (cur.startsWith('~stats') || cur === '~health') render();
    });
    return;
  }
  return cur === '~stats-photos' ? statsPhotos() : cur === '~stats-conf' ? statsConf() : cur === '~health' ? statsHealth() : statsPlayers();
}
// Rows kept by the player filter (all, others than your accounts, or only them: myIds).
const statRows = () => ANS.rows.filter(r => SF.who === 'all' || !myIds().size || (SF.who === 'me') === isMe(r[0]));
// Recent sessions (Pierre, 2026-11-03: who played last, is anyone playing now): the last RECENT.N sessions of every
// player (sessionsOf), newest first, by name when signed in (USERS ids), else by anonymous id as on Players. Playing
// now = its last answer less than RECENT.NOW minutes old. Modes: quiz (look-alike duels slipped into it included, as on
// Players), custom (the custom quiz, quiz|s…, its typed answers included: the genera picked by the player, 2026-11-03),
// duel (the Duel tab), typed (|t, logged by the typed answers once they are in the quiz).
const modeOf = m =>
  /^quiz-duel/.test(m)
    ? 'duel'
    : /^quiz\|s(\||$)/.test(m)
      ? 'custom'
      : String(m).split('|').includes('t')
        ? 'typed'
        : /^quiz(\||$)/.test(m)
          ? 'quiz'
          : 'other';
function recentSessions(R) {
  const NM = Object.create(null);
  ((USERS && USERS.users) || []).forEach(u => u.id && (NM[u.id] = u));
  const S = sessionsOf(R)
    .sort((a, b) => b.L[b.L.length - 1][1] - a.L[a.L.length - 1][1])
    .slice(0, RECENT.N);
  const dur = s => {
      const m = Math.round((s.L[s.L.length - 1][1] - s.L[0][1]) / 6e4);
      return m < 1 ? '<1 min' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
    },
    modes = s => {
      const c = {};
      s.L.forEach(r => (c[modeOf(r[5])] = (c[modeOf(r[5])] || 0) + 1));
      return ['quiz', 'custom', 'duel', 'typed', 'other']
        .filter(k => c[k])
        .map(k => (Object.keys(c).length > 1 ? `${k} <small>${c[k]}</small>` : k))
        .join(' · ');
    },
    who = id =>
      NM[id]
        ? `<a href="#~journey/${encodeURIComponent(NM[id].name)}">${pname(NM[id].name, NM[id].board === -1)}</a>`
        : `<a href="#~anon/${encodeURIComponent(id)}" title="Not signed in"><code>${esc(id)}</code></a>`;
  const live = S.filter(s => isNow(s.L[s.L.length - 1][1])).length;
  return `<section class="adm-scard adm-recent" data-recent><h3>Recent sessions${
    live ? ` <span class="adm-ago now">${live} playing now</span>` : ''
  } <small class="note" title="When the answers were loaded (↻ reloads)">as of ${dateText(ANS.at || Date.now(), 'hm')}</small></h3>${
    S.length
      ? `<div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th>Player</th><th>Last</th><th class="n">Answers</th><th class="n">Right</th><th title="From the first to the last answer">Length</th><th>Started</th><th>Modes</th></tr></thead><tbody>${S.map(
          s =>
            `<tr${isNow(s.L[s.L.length - 1][1]) ? ' class="now"' : ''}><td>${who(s.id)}${isMe(s.id) ? ' <small>you</small>' : ''}</td><td>${ago(s.L[s.L.length - 1][1])}</td><td class="n">${s.L.length}</td><td class="n">${pct(
              s.L.filter(r => r[4]).length,
              s.L.length
            )}</td><td>${dur(s)}</td><td>${clock(s.L[0][1])}</td><td>${modes(s)}</td></tr>`
        ).join('')}</tbody></table></div>`
      : '<p class="note">No sessions yet.</p>'
  }</section>`;
}
function statsPlayers() {
  const head = `<div class="adm-shead"><h2>Activity</h2>${
    myIds().size
      ? segBtns('who', [
          ['all', 'All'],
          ['others', 'Others'],
          ['me', 'Me']
        ])
      : ''
  }<button type="button" class="adm-fchip plain" data-sload title="Reload the answers">↻</button></div>`;
  if (ANS.old) {
    $v.innerHTML =
      head +
      `<p class="warn">${ANS.err === 'token' ? "Needs this page's GitHub token: per-player answers are admin-only (sheet v14)." : `Sheet script v${esc(ANS.v || '?')}: needs v4 (v5 for calibration and variety).`} <a href="https://raw.githubusercontent.com/${REPO}/main/tools/sync/Code.gs" target="_blank" rel="noopener">Code.gs</a></p>`;
    bindStats();
    return;
  }
  const R = statRows(),
    P = {};
  R.forEach(r => {
    const p = (P[r[0]] = P[r[0]] || {id: r[0], L: [], d: new Set()});
    p.L.push(r);
    p.d.add(new Date(r[1]).toDateString());
  });
  const ps = Object.values(P)
    .map(p => {
      p.L.sort((a, b) => a[1] - b[1]);
      const ok = p.L.filter(r => r[4]).length,
        last = p.L.slice(-20);
      return {
        ...p,
        n: p.L.length,
        ok,
        last: last.filter(r => r[4]).length / last.length,
        lv: (RAS[p.id] || [])[0],
        sum: ANS.players[p.id],
        at: p.L[p.L.length - 1][1],
        ph: new Set(p.L.flatMap(r => r[6].split(' ').filter(Boolean))).size
      };
    })
    .sort((a, b) => (b.lv ?? -9) - (a.lv ?? -9) || b.n - a.n);
  const ok = R.filter(r => r[4]).length,
    wk = ps.filter(p => Date.now() - p.at < 7 * 864e5).length;
  // Learning curve: accuracy of each player's k-th answer, pooled in blocks.
  const mx = Math.max(0, ...ps.map(p => p.n)),
    blk = mx > 400 ? 50 : mx > 150 ? 20 : 10,
    cv = [];
  ps.forEach(p =>
    p.L.forEach((r, k) => {
      const b = (cv[Math.floor(k / blk)] = cv[Math.floor(k / blk)] || [0, 0]);
      b[0] += r[4];
      b[1]++;
    })
  );
  // Genera shown, and how often each was given wrongly (Pierre's rule: that genus is not mastered either).
  const G = {};
  const gg = n => (G[n] = G[n] || {n, s: 0, ok: 0, w: 0});
  R.forEach(r => {
    const g = gg(r[2]);
    g.s++;
    g.ok += r[4];
    if (!r[4] && r[3]) gg(r[3]).w++;
  });
  // Ability per genus (continuous difficulty, sheet v5): the median over players, from their last sync.
  const med = a => {
    const b = a.slice().sort((x, y) => x - y);
    return b.length ? b[Math.floor(b.length / 2)] : null;
  };
  const GT = {};
  ps.forEach(p => Object.entries((p.sum || [])[3] || {}).forEach(([g, t]) => (GT[g] = GT[g] || []).push(t)));
  // Calibration: expected success of each answer (sheet v5) against the actual result, by band of expected success.
  const E = R.filter(r => r[7] != null),
    BANDS = [
      [0, 0.6],
      [0.6, 0.75],
      [0.75, 0.85],
      [0.85, 1.01]
    ];
  const cal = BANDS.map(([a, b]) => {
    const L = E.filter(r => r[7] >= a && r[7] < b);
    return [a, b, L.length, L.reduce((t, r) => t + r[7], 0), L.filter(r => r[4]).length];
  }).filter(c => c[2]);
  const eMean = E.length ? E.reduce((t, r) => t + r[7], 0) / E.length : 0,
    eOk = E.filter(r => r[4]).length,
    NW = E.filter(r => r[9] > 0).length;
  const gl = Object.values(G)
    .filter(g => g.s)
    .sort((a, b) => a.ok / a.s - b.ok / b.s || b.s - a.s);
  const M = {};
  R.filter(r => !r[4] && r[3]).forEach(r => {
    const k = r[2] + '|' + r[3];
    M[k] = (M[k] || 0) + 1;
  });
  const ml = Object.entries(M)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15),
    mm = ml.length ? ml[0][1] : 1;
  const cond = [
    ['Quiz', r => !r[5].startsWith('quiz-duel')],
    ['Duel', r => r[5].startsWith('quiz-duel')],
    ['Single view', r => r[6].split(' ').filter(Boolean).length === 1],
    ['All views', r => r[6].split(' ').filter(Boolean).length > 1],
    ['With corallites', r => /-macro-/.test(r[6])],
    ['Without corallites', r => !/-macro-/.test(r[6])]
  ]
    .map(([t, f]) => {
      const L = R.filter(f);
      return [t, L.length, L.filter(r => r[4]).length];
    })
    .filter(c => c[1]);
  const total = DATA ? Object.keys(DATA.gen).length : 0;
  $v.innerHTML =
    head +
    kpis([
      ['Players', ps.length],
      ['Answers', R.length],
      ['Right', pct(ok, R.length)],
      ['Active 7 d', wk]
    ]) +
    (R.length ? recentSessions(R) : '') +
    (!R.length
      ? `<p class="note">${SF.who === 'others' ? noneButMe() : 'No answers yet.'}</p>`
      : `
    <div class="adm-sgrid">
    <section class="adm-scard"><h3>Learning curve</h3><div class="adm-cols">${cv.map((b, k) => `<div title="Answers ${k * blk + 1}-${(k + 1) * blk}: ${b[0]}/${b[1]}"${b[1] < 10 ? ' class="few"' : ''}><i style="height:${Math.round((100 * b[0]) / b[1])}%"></i><small>${Math.round((100 * b[0]) / b[1])}</small></div>`).join('')}</div>
      <p class="adm-axis"><span>Answer 1</span><span>${blk} per bar</span><span>${cv.length * blk}</span></p></section>
    <section class="adm-scard"><h3>Calibration</h3>${
      E.length
        ? `${kpis([
            ['Expected', pct(eMean * E.length, E.length)],
            ['Actual', pct(eOk, E.length)],
            ['Target', '80%'],
            ['New photo', pct(NW, E.length)]
          ])}
      <table class="adm-tbl"><thead><tr><th>Expected</th><th>Actual</th><th></th><th>n</th></tr></thead><tbody>${cal.map(([a, b, n, se, ok]) => `<tr><td>${pct(se, n)}</td><td>${pct(ok, n)}</td><td>${sbar(ok, n, ok / n < se / n - 0.15 ? 'bad' : '')}</td><td class="n">${n}</td></tr>`).join('')}</tbody></table>`
        : `<p class="note">Needs answers logged by sheet script v5${ANS.v >= 5 ? '' : ` (now v${esc(ANS.v || '?')})`}.</p>`
    }</section>
    <section class="adm-scard"><h3>Conditions</h3><table class="adm-tbl">${cond.map(([t, n, r]) => `<tr><td>${t}</td><td>${pct(r, n)}</td><td>${sbar(r, n)}</td><td class="n">${n}</td></tr>`).join('')}</table></section>
    <section class="adm-scard"><h3>Genera</h3><div class="adm-tscroll tall"><table class="adm-tbl"><thead><tr><th>Shown</th><th>Right</th><th></th><th>n</th><th title="Given wrongly">Given ✗</th><th title="Median player ability on the genus">Level</th></tr></thead><tbody>
      ${gl.map(g => `<tr><td><a class="adm-gen" href="#${esc(g.n)}"><i>${esc(g.n)}</i></a></td><td>${pct(g.ok, g.s)}</td><td>${sbar(g.ok, g.s, g.ok / g.s < 0.5 ? 'bad' : '')}</td><td class="n">${g.s}</td><td class="n">${g.w || ''}</td><td class="n">${GT[g.n] ? sgn(med(GT[g.n])) : ''}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="adm-scard"><h3>Mix-ups</h3>${
      ml.length
        ? `<table class="adm-tbl"><thead><tr><th>Shown</th><th>Answered</th><th></th><th>n</th></tr></thead><tbody>
      ${ml
        .map(([k, n]) => {
          const [a, b] = k.split('|');
          return `<tr><td><i>${esc(a)}</i></td><td><a class="adm-gen" href="./#cmp-${encodeURIComponent(a)}|${encodeURIComponent(b)}" target="_blank" rel="noopener"><i>${esc(b)}</i></a></td><td>${sbar(n, mm, 'bad')}</td><td class="n">${n}</td></tr>`;
        })
        .join('')}</tbody></table>`
        : '<p class="note">None.</p>'
    }</section>
    </div>`);
  bindStats();
}
// Where to look for more photos (Pierre, 2026-10-31): per genus x view, the reasons the game pool falls short, from
// coverage (covOf), photo quality and difficulty (STATS Elo), players' levels per genus (sheet v5) and their answers.
function needsOf() {
  const OFF = 1.0,
    PS = photoStats();
  // "Without me" drops this browser's own answers and level everywhere on the page (repeats, mix-ups, too easy), not only from the photo Elo.
  const noMe = SF.elo === 'others' && myIds().size,
    R = (ANS.rows || []).filter(r => !noMe || !isMe(r[0]));
  const TH = {};
  Object.entries(ANS.players || {})
    .filter(([id]) => !noMe || !isMe(id))
    .map(([, p]) => p)
    .forEach(p => Object.entries(p[3] || {}).forEach(([g, t]) => (TH[g] = TH[g] || []).push(t)));
  const SEEN = {};
  R.forEach(r =>
    r[6]
      .split(' ')
      .filter(Boolean)
      .forEach(f => {
        const k = r[0] + '|' + f;
        SEEN[k] = (SEEN[k] || 0) + 1;
      })
  );
  const ids = [...new Set(R.map(r => r[0]))],
    MX = {};
  R.filter(r => !r[4] && r[3]).forEach(r => {
    const m = (MX[r[2]] = MX[r[2]] || {});
    m[r[3]] = (m[r[3]] || 0) + 1;
  });
  const q3 = a => {
    const b = a.slice().sort((x, y) => x - y);
    return b[Math.floor(0.75 * (b.length - 1))];
  };
  const out = [];
  [...GAME].forEach(n =>
    covViews(n).forEach(([v, vt]) => {
      const c = covOf(n, v),
        why = [];
      let sc = 0;
      if (c.obs < 3) {
        why.push(['few', `${c.obs} colon${c.obs === 1 ? 'y' : 'ies'}`]);
        sc += 4 - c.obs;
      }
      const good = new Set(c.L.filter(p => qOf(p.f) >= 2).map(p => p.o || p.f)).size;
      if (c.obs >= 3 && good < 3) {
        why.push(['good', `${good} good colon${good === 1 ? 'y' : 'ies'}`]);
        sc += 1;
      }
      if ((TH[n] || []).length) {
        const rated = c.L.filter(p => nAns(PS[p.f]) >= 3).map(p => PS[p.f][0]);
        const hard = rated.length ? Math.max(...rated) : c.L.some(p => qOf(p.f) === 1) ? 1 : 0,
          top = q3(TH[n]);
        if (top - OFF > hard + 0.3) {
          why.push(['easy', `players ${sgn(top)} vs hardest ${sgn(hard)}`]);
          sc += 1.5;
        }
      }
      const rep = ids
        .map(id => {
          const k = c.L.map(p => SEEN[id + '|' + p.f] || 0).filter(Boolean);
          return k.length ? k.reduce((a, b) => a + b, 0) / k.length : 0;
        })
        .filter(Boolean);
      const rp = rep.length ? rep.reduce((a, b) => a + b, 0) / rep.length : 0;
      if (rp >= 4) {
        why.push(['rep', `each photo ×${rp.toFixed(1)} per player`]);
        sc += 1;
      }
      const mx = Object.entries(MX[n] || {}).sort((a, b) => b[1] - a[1])[0];
      if (v === 'macro' && mx && mx[1] >= 3 && c.obs < 5) {
        why.push(['mix', `taken for ${mx[0]} ×${mx[1]}`]);
        sc += 1;
      }
      if (why.length) out.push({n, v, vt, c, why, sc});
    })
  );
  // Several zooms (Pierre, 2026-11-01): a game question only shows views of one colony, so a genus needs colonies
  // photographed at 2+ zoom levels; one row per genus with fewer than 3 of them.
  [...GAME].forEach(n => {
    const V = {};
    covViews(n).forEach(([v]) =>
      covOf(n, v).L.forEach(p => {
        const k = p.o || p.f;
        (V[k] = V[k] || new Set()).add(v);
      })
    );
    const m = Object.values(V).filter(s => s.size >= 2).length;
    if (m < 3)
      out.push({
        n,
        v: 'zoom',
        vt: 'Several zooms',
        c: {obs: m},
        why: [['zoom', `${m} colon${m === 1 ? 'y' : 'ies'} at 2+ zooms`]],
        sc: 3 - m
      });
  });
  return out;
}
// Where to look, in full: into el (the banner above Coverage › Games, open on ~stats-needs).
function statsNeeds(el) {
  const head = `<div class="adm-shead"><h2>Where to look for photos</h2>${eloSeg()}<a class="adm-link" href="#~cov">Fold</a></div>`,
    out = needsOf();
  NEEDS = out;
  NGEN = NGEN || '';
  const VO = {wide: 0, medium: 1, macro: 2, zoom: 3},
    vs = [...new Set(out.map(o => o.v))].sort((a, b) => VO[a] - VO[b]);
  if (SF.nv !== 'all' && !vs.includes(SF.nv)) SF.nv = 'all';
  el.innerHTML =
    head.replace(
      /<\/div>$/,
      `${segBtns('nv', [['all', 'All views'], ...vs.map(v => [v, out.find(o => o.v === v).vt])])}
    <input type="search" class="adm-nsearch" placeholder="Genus" value="${esc(NGEN)}" aria-label="Genus"></div>`
    ) +
    '<div id="adm-nbody"></div>' +
    (!Object.keys(ANS.players || {}).some(id => Object.keys((ANS.players[id] || [])[3] || {}).length)
      ? `<p class="note">"Too easy" needs answers logged by sheet script v5.</p>`
      : '');
  const inp = el.querySelector('.adm-nsearch');
  inp.oninput = () => {
    NGEN = inp.value;
    needsBody();
  };
  needsBody();
  bindStats();
}
// Gap table of statsNeeds, redrawn alone so the genus box keeps focus: reason cards filter (click again = all),
// view switch and genus box filter, column headers sort (click again = reverse).
let NEEDS = [],
  NGEN = '';
const NEED_T = {few: 'Few colonies', good: 'Few good colonies', zoom: 'Few multi-zoom', easy: 'Too easy', rep: 'Repeats', mix: 'Mix-ups'};
function needsBody() {
  const box = $v.querySelector('#adm-nbody');
  if (!box) return;
  const T = NEED_T,
    q = NGEN.trim().toLowerCase(),
    VO = {wide: 0, medium: 1, macro: 2, zoom: 3};
  const base = NEEDS.filter(o => (SF.nv === 'all' || o.v === SF.nv) && (!q || o.n.toLowerCase().includes(q)));
  const has = k => o => o.why.some(w => w[0] === k),
    L = SF.nk ? base.filter(has(SF.nk)) : base.slice();
  const K = {n: o => o.n, v: o => VO[o.v], c: o => o.c.obs, sc: o => o.sc},
    f = K[SF.ns] || K.sc,
    d = SF.nd === 'asc' ? 1 : -1;
  L.sort((a, b) => {
    const x = f(a),
      y = f(b);
    return (x < y ? -1 : x > y ? 1 : 0) * d || b.sc - a.sc || a.c.obs - b.c.obs || a.n.localeCompare(b.n) || VO[a.v] - VO[b.v];
  });
  const card = (k, t, n) =>
    `<button type="button" data-nk="${k}" aria-pressed="${SF.nk === k}"${n ? '' : ' class="zero"'}><b>${n}</b><span>${t}</span></button>`;
  const th = (k, t) =>
    `<th${k === 'c' ? ' class="n"' : ''}><button type="button" data-ns="${k}"${SF.ns === k ? ` class="on" aria-sort="${SF.nd === 'asc' ? 'ascending' : 'descending'}"` : ''}>${t}${SF.ns === k ? (SF.nd === 'asc' ? ' ▲' : ' ▼') : ''}</button></th>`;
  box.innerHTML = `<div class="adm-kpis adm-kpis-row adm-nkpis">${card('', 'All', base.length)}${Object.keys(T)
    .map(k => card(k, T[k], base.filter(has(k)).length))
    .join('')}</div>
    <div class="adm-tscroll"><table class="adm-tbl adm-needs"><thead><tr>${th('n', 'Genus')}${th('v', 'View')}${th('c', 'Colonies')}${th('sc', 'Why')}</tr></thead><tbody>
    ${L.map(
      o => `<tr data-g="${esc(o.n)}"><td><a class="adm-gen" href="#${esc(o.n)}"><i>${esc(o.n)}</i></a></td><td>${esc(o.vt)}</td><td class="n">${o.c.obs}</td>
      <td>${o.why.map(([k, t]) => `<span class="adm-why w-${k}${SF.nk === k ? ' on' : ''}" title="${T[k]}">${esc(t)}</span>`).join(' ')}</td></tr>`
    ).join('')}</tbody></table>${L.length ? '' : '<p class="note">None.</p>'}</div>`;
  const save = () => {
    store.set('reefid-admin-stats', SF);
    needsBody();
  };
  box.querySelectorAll('[data-nk]').forEach(
    b =>
      (b.onclick = () => {
        SF.nk = SF.nk === b.dataset.nk ? '' : b.dataset.nk;
        save();
      })
  );
  box.querySelectorAll('[data-ns]').forEach(
    b =>
      (b.onclick = () => {
        const k = b.dataset.ns;
        SF.nd = SF.ns === k ? (SF.nd === 'asc' ? 'desc' : 'asc') : k === 'sc' ? 'desc' : 'asc';
        SF.ns = k;
        save();
      })
  );
  box.querySelectorAll('.adm-needs tbody tr').forEach(
    tr =>
      (tr.onclick = e => {
        if (!e.target.closest('a')) location.hash = encodeURIComponent(tr.dataset.g);
      })
  );
}
// Photos everyone misses (Health): shown in PH_MIN answers or more with under PH_LOW right, or a difficulty PH_FAR or
// more above the median of their genus's rated photos.
function healthBad(R) {
  const H = HEALTH,
    median = healthMedian;
  // 2. Photos everyone misses: answers from the log (each answer counts once for every photo it showed), difficulty
  // from the photo Elo (with or without me) against the median of the genus's rated photos.
  const PS = photoStats(),
    META = Object.create(null);
  allPhotos()
    .filter(p => p.view !== 'cand')
    .forEach(p => (META[p.f] = META[p.f] || p));
  const PH = Object.create(null);
  R.forEach(r =>
    new Set(r[6].split(' ').filter(Boolean)).forEach(f => {
      if (!META[f]) return;
      const o = (PH[f] = PH[f] || {n: 0, ok: 0});
      o.n++;
      o.ok += r[4];
    })
  );
  const GMED = Object.create(null);
  Object.values(META).forEach(p => {
    if (nAns(PS[p.f]) >= 3) (GMED[p.genus] = GMED[p.genus] || []).push(PS[p.f][0]);
  });
  Object.keys(GMED).forEach(g => (GMED[g] = GMED[g].length >= 3 ? median(GMED[g]) : null));
  const BAD = Object.entries(PH)
    .filter(([, o]) => o.n >= H.PH_MIN)
    .map(([f, o]) => {
      const p = META[f],
        s = PS[f],
        m = GMED[p.genus],
        far = s && nAns(s) >= H.PH_MIN && m != null ? s[0] - m : null;
      return {p, ...o, r: o.ok / o.n, far};
    })
    .filter(o => o.r < H.PH_LOW || (o.far != null && o.far >= H.PH_FAR))
    .sort((a, b) => a.r - b.r || b.n - a.n);
  return BAD;
}
// Genera that don't take off (Health), most stuck players first. BY = R by player, oldest first.
function healthGenera(BY) {
  const H = HEALTH,
    median = healthMedian;
  // 3. Genera that don't take off: per game genus (isGame: the slate, Millepora, the bonus genera once on), each player's right rate on the photos of it (answers where it was
  // shown); stuck = G_MIN answers or more on it and still under G_LOW over the last G_MIN.
  const PG = Object.create(null);
  Object.values(BY).forEach(L =>
    L.forEach(r => {
      const k = r[0] + '|' + r[2];
      (PG[k] = PG[k] || []).push(r[4]);
    })
  );
  const GR = [...GAME]
    .map(n => {
      const P = Object.keys(BY)
        .map(id => PG[id + '|' + n])
        .filter(Boolean);
      const rate = P.map(a => a.reduce((t, x) => t + x, 0) / a.length),
        stuck = P.filter(a => a.length >= H.G_MIN && a.slice(-H.G_MIN).reduce((t, x) => t + x, 0) / H.G_MIN < H.G_LOW).length;
      return {n, met: P.length, m: median(rate), stuck, long: P.filter(a => a.length >= H.G_MIN).length};
    })
    .sort((a, b) => b.stuck - a.stuck || (a.m ?? 2) - (b.m ?? 2) || a.n.localeCompare(b.n));
  return GR;
}
const healthMedian = a => {
  const b = a.slice().sort((x, y) => x - y),
    k = b.length >> 1;
  return !b.length ? null : b.length % 2 ? b[k] : (b[k - 1] + b[k]) / 2;
};
// To do › All: one red line at the top when Health finds something wrong (Pierre, 2026-11-03): photos everyone misses,
// genera players are stuck on. Nothing when all is well, or until the answers are loaded.
function healthLine() {
  if (!ANS || ANS.old) return '';
  const noMe = SF.elo === 'others' && myIds().size,
    R = (ANS.rows || []).filter(r => !noMe || !isMe(r[0])),
    BY = Object.create(null);
  R.forEach(r => (BY[r[0]] = BY[r[0]] || []).push(r));
  Object.values(BY).forEach(L => L.sort((a, b) => a[1] - b[1]));
  const bad = R.length ? healthBad(R).length : 0,
    stuck = R.length ? healthGenera(BY).filter(g => g.stuck).length : 0,
    L = [
      bad && `${bad} photo${bad === 1 ? '' : 's'} everyone misses`,
      stuck && `${stuck} ${stuck === 1 ? 'genus' : 'genera'} players are stuck on`
    ].filter(Boolean);
  return L.length ? `<p class="warn adm-hline" data-hline><a href="#~health"><b>Health</b></a>: ${L.join(' · ')}</p>` : '';
}
// Health (Pierre, 2026-11-02: "most RAs will not send feedback"): what the answers already logged say about how the
// app works for players, with no new data. Where players stop (sessions = answers less than GAP minutes apart; how long
// they last; what the short ones ended on), photos everyone misses (maybe mislabelled or bad: a link to the genus page),
// genera that don't take off for players, and activity over the last DAYS days. Anonymous ids only, like the other
// stats pages; "Without me" drops this browser's own answers everywhere on the page, as on Where to look.
function statsHealth() {
  const H = HEALTH,
    head = `<div class="adm-shead"><h2>Health</h2>${eloSeg()}</div>`;
  if (ANS.old) {
    $v.innerHTML =
      head +
      `<p class="warn">${ANS.err === 'token' ? "Needs this page's GitHub token: per-player answers are admin-only (sheet v14)." : `Sheet script v${esc(ANS.v || '?')}: needs v4.`} <a href="https://raw.githubusercontent.com/${REPO}/main/tools/sync/Code.gs" target="_blank" rel="noopener">Code.gs</a></p>`;
    bindStats();
    return;
  }
  const noMe = SF.elo === 'others' && myIds().size,
    R = (ANS.rows || []).filter(r => !noMe || !isMe(r[0]));
  if (!R.length) {
    $v.innerHTML = head + `<p class="note">${noMe ? noneButMe() : 'No answers yet.'}</p>`;
    bindStats();
    return;
  }
  const now = Date.now(),
    ok = r => !!r[4],
    plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`,
    median = a => {
      const b = a.slice().sort((x, y) => x - y),
        k = b.length >> 1;
      return !b.length ? null : b.length % 2 ? b[k] : (b[k - 1] + b[k]) / 2;
    },
    tbl = (cols, rows) =>
      `<table class="adm-tbl"><thead><tr>${cols.map(c => `<th${/^n:/.test(c) ? ' class="n"' : ''}>${c.replace(/^n:/, '')}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`,
    // One row per bucket: label, count, share and a bar against the biggest bucket.
    dist = (L, tot, bad) => {
      const mx = Math.max(1, ...L.map(x => x[1]));
      return L.map(
        ([t, n], i) =>
          `<tr><td>${t}</td><td>${sbar(n, mx, bad && bad(i) ? 'bad' : '')}</td><td class="n">${n}</td><td class="n">${pct(n, tot)}</td></tr>`
      );
    },
    gameOf = m => (/^quiz-duel/.test(m) ? 'Duel' : /^quiz/.test(m) ? 'Quiz' : m || 'Other');

  // 1. Where players stop: one player's answers, oldest first, cut where two answers are GAP minutes apart or more.
  // BY: each player's answers, oldest first (sessionsOf sorts them; Genera that don't take off reads them too).
  const S = sessionsOf(R),
    BY = Object.create(null),
    nS = Object.create(null);
  S.forEach(s => {
    (BY[s.id] = BY[s.id] || []).push(...s.L);
    nS[s.id] = (nS[s.id] || 0) + 1;
  });
  // A session whose last answer is less than GAP minutes old may still be going: it has not ended yet.
  const ended = S.filter(s => now - s.L[s.L.length - 1][1] >= H.GAP * 6e4),
    going = S.length - ended.length,
    nP = Object.keys(BY).length,
    perP = Object.values(nS);
  const inB = (n, a, b) => n >= a && n <= b,
    LEN = [
      ['1-5', 1, 5],
      ['6-10', 6, 10],
      ['11-20', 11, 20],
      ['21-50', 21, 50],
      ['51+', 51, Infinity]
    ].map(([t, a, b]) => [t, ended.filter(s => inB(s.L.length, a, b)).length]),
    PER = [
      ['1', 1, 1],
      ['2', 2, 2],
      ['3-5', 3, 5],
      ['6-10', 6, 10],
      ['11+', 11, Infinity]
    ].map(([t, a, b]) => [t, perP.filter(n => inB(n, a, b)).length]);
  // How a session ended: the misses in a row on its last answers (a run of misses before quitting = frustration).
  const missRun = s => {
      let k = 0;
      for (let i = s.L.length - 1; i >= 0 && !ok(s.L[i]); i--) k++;
      return Math.min(3, k);
    },
    early = ended.filter(s => s.L.length <= H.EARLY),
    longer = ended.filter(s => s.L.length > H.EARLY),
    runs = L => [0, 1, 2, 3].map(k => L.filter(s => missRun(s) === k).length),
    RE = runs(early),
    RL = runs(longer),
    END_T = ['Right', '1 miss', '2 misses', '3+ misses'];
  const top = (L, key, k) => {
    const O = Object.create(null);
    L.forEach(s => {
      const x = key(s.L[s.L.length - 1]);
      O[x] = (O[x] || 0) + 1;
    });
    return Object.entries(O)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, k);
  };
  const stopSec = `<section class="adm-scard adm-hsec full" data-health="stop"><h3>Where players stop</h3><div class="adm-hgrid">
    <div><h4>Answers per session</h4>${ended.length ? tbl(['Answers', '', 'n:Sessions', 'n:'], dist(LEN, ended.length)) : '<p class="note">None ended yet.</p>'}${going ? `<p class="note">${plural(going, 'session')} still going</p>` : ''}</div>
    <div><h4>Sessions per player</h4>${tbl(['Sessions', '', 'n:Players', 'n:'], dist(PER, nP))}</div>
    <div><h4>How sessions ended</h4>${
      ended.length
        ? `<table class="adm-tbl"><thead><tr><th>Last answers</th><th class="n" title="Sessions of ${H.EARLY} answers or fewer">≤${H.EARLY}</th><th></th><th class="n" title="Longer sessions">&gt;${H.EARLY}</th></tr></thead><tbody>${END_T.map(
            (t, k) =>
              `<tr><td>${t}</td><td class="n">${pct(RE[k], early.length)}</td><td>${sbar(RE[k], early.length, k ? 'bad' : '')}</td><td class="n">${pct(RL[k], longer.length)}</td></tr>`
          ).join(
            ''
          )}<tr><td>Sessions</td><td class="n">${early.length}</td><td></td><td class="n">${longer.length}</td></tr></tbody></table>`
        : '<p class="note">None ended yet.</p>'
    }</div>
    <div><h4>Last shown, sessions ≤${H.EARLY}</h4>${
      early.length
        ? tbl(
            ['Genus', 'n:Sessions'],
            top(early, r => r[2], 5).map(
              ([g, n]) => `<tr><td><a class="adm-gen" href="#${esc(g)}"><i>${esc(g)}</i></a></td><td class="n">${n}</td></tr>`
            )
          ) +
          tbl(
            ['Game', 'n:Sessions'],
            top(early, r => gameOf(r[5]), 3).map(([m, n]) => `<tr><td>${esc(m)}</td><td class="n">${n}</td></tr>`)
          )
        : '<p class="note">None.</p>'
    }</div></div></section>`;

  const BAD = healthBad(R);
  const MAXPH = 24,
    phTile = o =>
      `<figure class="adm-htile"><button type="button" class="adm-ph" data-zf="${esc(o.p.f)}" data-g="${esc(o.p.genus)}" aria-label="Enlarge"><img src="${img(o.p, 1)}" alt="" loading="lazy"></button>
      <figcaption><a class="adm-gen" href="#${esc(o.p.genus)}" title="Open the genus"><i>${esc(o.p.genus)}</i></a> <span>${esc(label(o.p.genus, o.p.view))}</span>
      <span class="adm-hnum"><b${o.r < H.PH_LOW ? ' class="warnc"' : ''}>${pct(o.ok, o.n)}</b> right · ${plural(o.n, 'answer')}${o.far != null ? ` · <span title="Difficulty against the genus median"${o.far >= H.PH_FAR ? ' class="warnc"' : ''}>${sgn(o.far)}</span>` : ''}</span></figcaption></figure>`;
  const phSec = `<section class="adm-scard adm-hsec full" data-health="photos"><h3>Photos everyone misses <small>${BAD.length}</small></h3>${
    BAD.length
      ? `<div class="adm-hphotos">${BAD.slice(0, MAXPH).map(phTile).join('')}</div>${BAD.length > MAXPH ? `<p class="note">+${BAD.length - MAXPH} more</p>` : ''}`
      : '<p class="note">None.</p>'
  }</section>`;

  const GR = healthGenera(BY);
  const gSec = `<section class="adm-scard adm-hsec g" data-health="genera"><h3>Genera that don't take off</h3><div class="adm-tscroll tall">${tbl(
    [
      'Genus',
      'n:Players',
      'Median right',
      '',
      `n:<span title="Players with ${H.G_MIN}+ answers on it, under ${Math.round(H.G_LOW * 100)}% over their last ${H.G_MIN}">Stuck</span>`
    ],
    GR.map(
      g =>
        `<tr><td><a class="adm-gen" href="#${esc(g.n)}"><i>${esc(g.n)}</i></a></td><td class="n">${g.met || '–'}</td><td class="n">${g.m == null ? '–' : pct(g.m, 1)}</td><td>${g.m == null ? '' : sbar(g.m, 1, g.m < H.G_LOW ? 'bad' : '')}</td><td class="n">${g.long ? `<b${g.stuck ? ' class="warnc"' : ''}>${g.stuck}</b> / ${g.long}` : '–'}</td></tr>`
    )
  )}</div></section>`;

  // 4. Activity over time: answers and active players per local day, the last DAYS days (today last).
  const D = [];
  for (let i = H.DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    D.push({t: d.getTime(), n: 0, p: new Set()});
  }
  const end = new Date(D[D.length - 1].t);
  end.setDate(end.getDate() + 1);
  R.forEach(r => {
    if (r[1] < D[0].t || r[1] >= end.getTime()) return;
    let k = D.length - 1;
    while (k > 0 && r[1] < D[k].t) k--;
    D[k].n++;
    D[k].p.add(r[0]);
  });
  const day = t => dateText(t, 'dm'),
    cols = (v, w) => {
      const mx = Math.max(1, ...D.map(v));
      return `<div class="adm-cols adm-hcols">${D.map(d => `<div title="${day(d.t)}: ${plural(v(d), w)}"><i style="height:${((100 * v(d)) / mx).toFixed(1)}%"></i></div>`).join('')}</div>
      <p class="adm-axis"><span>${day(D[0].t)}</span><span>max ${mx}</span><span>today</span></p>`;
    },
    in30 = D.reduce((t, d) => t + d.n, 0);
  const tSec = `<section class="adm-scard adm-hsec t" data-health="time"><h3>Activity, last ${H.DAYS} days <small>${in30}</small></h3>
    <h4>Answers per day</h4>${cols(d => d.n, 'answer')}
    <h4>Players per day</h4>${cols(d => d.p.size, 'player')}</section>`;

  $v.innerHTML =
    head +
    kpis([
      ['Players', nP],
      ['Sessions', S.length],
      ['Sessions / player', Math.round(median(perP) * 10) / 10],
      ['Answers / session', Math.round(median(S.map(s => s.L.length)) * 10) / 10]
    ]) +
    `<div class="adm-sgrid adm-health">${stopSec}${phSec}${gSec}${tSec}</div>`;
  bindStats();
}
const VIEW_T = {wide: 'Colony', medium: 'Close-up', macro: 'Corallites', cand: 'Candidate'};
const ORIGIN_T = {imr: 'IMR', own: 'Own', dauin: 'iNat Dauin', ph: 'iNat Philippines', world: 'iNat world', book: 'CF book'};
// Confusions (Pierre, 2026-11-01): which genera, photos, colonies (iNat observations) and species players mix up, from
// the answer log. A pair's rate = mixed up / offered together (needs the choices, logged since sheet v10); its score starts
// from a prior (declared look-alike, same family, other: core.js CONF) and follows the answers; the quiz picks its traps
// by the same score (app.js confOf, which also gives a shared growth form a slightly higher start). Answers from before
// v10 only add to "Before v10" (mix-ups without the choices offered).
function statsConf() {
  const noMe = SF.elo === 'others' && myIds().size,
    R = (ANS.rows || []).filter(r => !noMe || !isMe(r[0])),
    C = ofAns('conf|' + (noMe ? [...myIds()].sort().join(' ') : ''), () => confusionOf(R));
  const head = `<div class="adm-shead"><h2>Confusions</h2>${segBtns('min', [
    [1, '≥1'],
    [3, '≥3'],
    [10, '≥10']
  ])}<span class="note">offered / shown</span>${eloSeg()}</div>`;
  if (!R.length) {
    $v.innerHTML = head + `<p class="note">${noMe ? noneButMe() : 'No answers yet.'}</p>`;
    bindStats();
    return;
  }
  const gx = n => DATA.gen[n] || ((DATA.x || {}).gen || {})[n] || {look: []};
  const look = (a, b) => (gx(a).look || []).includes(b) || (gx(b).look || []).includes(a);
  const prior = (a, b) =>
    look(a, b) ? ['Look-alike', CONF.LOOK] : gx(a).fam && gx(a).fam === gx(b).fam ? ['Family', CONF.FAM] : ['Other', CONF.BASE];
  const cmp = (a, b) =>
    `<a class="adm-gen" href="./#cmp-${encodeURIComponent(a)}|${encodeURIComponent(b)}" target="_blank" rel="noopener" title="Compare on the site"><i>${esc(a)}</i> · <i>${esc(b)}</i></a>`;
  const PR = Object.entries(C.pair)
    .filter(([, c]) => c[0] >= SF.min)
    .map(([k, c]) => {
      const [a, b] = k.split('|'),
        [pt, pv] = prior(a, b);
      return {
        a,
        b,
        off: c[0],
        mix: c[1],
        ab: (C.dir[a + '|' + b] || [0, 0])[1],
        ba: (C.dir[b + '|' + a] || [0, 0])[1],
        pt,
        sc: confScore(c, pv),
        // A look-alike from the data (core.js dataLook, 2026-11-04): the games treat it as a declared one.
        dl: pt !== 'Look-alike' && dataLook(c, confScore(c, pv))
      };
    })
    .sort((x, y) => y.sc - x.sc || y.mix - x.mix);
  const OLD = Object.entries(C.old)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 15);
  // Per photo, colony and species: answers where the photo was shown, the wrong ones, and what it was taken for most.
  // Millepora's and the bonus genera's photos (DATA.x.gen) are played too (Millepora a slate genus, the others once on).
  const META = {};
  allPhotos().forEach(p => (META[p.f] = p));
  Object.entries((DATA.x || {}).gen || {}).forEach(([n, g]) =>
    Object.entries(g.views || {}).forEach(([v, L]) =>
      (L || []).forEach(p => {
        META[p.f] = META[p.f] || {...p, genus: n, view: v};
      })
    )
  );
  // Each answer counts once per key: several views of one colony in a question are one answer for that colony.
  const grp = key => {
    const O = {};
    R.forEach(r => {
      const done = new Set();
      r[6]
        .split(' ')
        .filter(Boolean)
        .forEach(f => {
          const p = META[f],
            k = p && key(p);
          if (!k || done.has(k)) return;
          done.add(k);
          const o = (O[k] = O[k] || {k, g: p.genus, f, n: 0, w: 0, as: {}});
          o.n++;
          if (!r[4]) {
            o.w++;
            if (r[3]) o.as[r[3]] = (o.as[r[3]] || 0) + 1;
          }
        });
    });
    return Object.values(O)
      .filter(o => o.n >= SF.min && o.w)
      .sort((a, b) => b.w / b.n - a.w / a.n || b.w - a.w)
      .slice(0, 30);
  };
  const top = o => {
    const e = Object.entries(o.as).sort((a, b) => b[1] - a[1])[0];
    return e ? `<i>${esc(e[0])}</i> ×${e[1]}` : '';
  };
  const tbl = (L, first, cell) =>
    L.length
      ? `<div class="adm-tscroll tall"><table class="adm-tbl"><thead><tr><th>${first}</th><th>Wrong</th><th></th><th>n</th><th>Taken for</th></tr></thead><tbody>${L.map(o => `<tr><td>${cell(o)}</td><td>${pct(o.w, o.n)}</td><td>${sbar(o.w, o.n, 'bad')}</td><td class="n">${o.n}</td><td>${top(o)}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="note">None.</p>';
  const PH = grp(p => p.f),
    OB = grp(p => p.o),
    SP = grp(p => (p.t && p.t !== p.genus ? p.t : ''));
  const withCh = R.filter(r => r[10]).length,
    surprise = PR.filter(p => p.pt !== 'Look-alike' && p.sc >= CONF.TRAP).length;
  $v.innerHTML =
    head +
    kpis([
      ['Answers with choices', `${withCh}/${R.length}`],
      ['Pairs', PR.length],
      ['Traps (score ≥ ' + CONF.TRAP + ')', PR.filter(p => p.sc >= CONF.TRAP).length],
      ['Not declared', surprise],
      ['Look-alikes from the data', PR.filter(p => p.dl).length]
    ]) +
    `
    <div class="adm-sgrid">
    <section class="adm-scard wide"><h3>Pairs</h3>${
      PR.length
        ? `<div class="adm-tscroll tall"><table class="adm-tbl"><thead><tr><th>Pair</th><th>Starts as</th><th title="Offered together">Offered</th><th title="Mixed up">Mixed</th><th>Rate</th><th></th><th title="Starts at the prior, follows the answers. Traps from ${CONF.TRAP}">Score</th><th title="First taken for the second">A→B</th><th title="Second taken for the first">B→A</th></tr></thead><tbody>
      ${PR.slice(0, 60)
        .map(
          p =>
            `<tr><td>${cmp(p.a, p.b)}</td><td>${p.pt}${p.dl ? ' · <b title="Offered together ' + CONF.N + ' times or more, score ' + CONF.TRAP + ' or more: duels, Again and genus sheets treat it as a look-alike">look-alike from the data</b>' : ''}</td><td class="n">${p.off}</td><td class="n">${p.mix}</td><td>${pct(p.mix, p.off)}</td><td>${sbar(p.sc, 0.6, p.sc >= CONF.TRAP ? 'bad' : '')}</td><td class="n">${p.sc.toFixed(2)}</td><td class="n">${p.ab || ''}</td><td class="n">${p.ba || ''}</td></tr>`
        )
        .join('')}</tbody></table></div>`
        : `<p class="note">No answer with its choices yet: sheet script v10 logs them${ANS.v >= 10 ? '' : ` (now v${esc(ANS.v || '?')})`}.</p>`
    }</section>
    <section class="adm-scard"><h3>Photos</h3>${tbl(PH, 'Photo', o => `<button type="button" class="adm-link" data-zf="${esc(o.f)}" data-g="${esc(o.g)}"><i>${esc(o.g)}</i> ${esc(VIEW_T[META[o.f].view] || '')}</button>`)}</section>
    <section class="adm-scard"><h3>Colonies</h3>${tbl(OB, 'Observation', o => `<a href="${esc(o.k)}" target="_blank" rel="noopener"><i>${esc(o.g)}</i> ${esc(o.k.replace(/^.*\//, '#'))}</a>`)}</section>
    <section class="adm-scard"><h3>Species</h3>${tbl(SP, 'Species', o => `<i>${esc(o.k)}</i>`)}</section>
    ${
      OLD.length
        ? `<section class="adm-scard"><h3>Before v10</h3><table class="adm-tbl"><thead><tr><th>Shown</th><th>Answered</th><th>n</th></tr></thead><tbody>${OLD.map(
            ([k, n]) => {
              const [a, b] = k.split('|');
              return `<tr><td><i>${esc(a)}</i></td><td><i>${esc(b)}</i></td><td class="n">${n}</td></tr>`;
            }
          ).join('')}</tbody></table></section>`
        : ''
    }
    </div>`;
  bindStats();
}
function statsPhotos() {
  const PS = photoStats(),
    L = allPhotos()
      .filter(p => PS[p.f] && nAns(PS[p.f]) >= SF.min)
      .map(p => ({...p, d: PS[p.f][0], n: PS[p.f][1], ok: PS[p.f][2], a: nAns(PS[p.f])}));
  const head = `<div class="adm-shead"><h2>Photo difficulty</h2>${segBtns('min', [
    [1, '≥1'],
    [3, '≥3'],
    [10, '≥10']
  ])}<span class="note">answers</span>${eloSeg()}</div>`;
  if (!L.length) {
    $v.innerHTML = head + `<p class="note">${SF.elo === 'others' ? noneButMe() : 'No answers yet.'}</p>`;
    bindStats();
    return;
  }
  const ds = L.map(p => p.d).sort((a, b) => a - b),
    mean = a => a.reduce((t, x) => t + x, 0) / a.length,
    // Quantile q of a sorted list, linear between neighbours (the median at 0.5; core.js).
    qtl = quantile,
    median = a =>
      qtl(
        a.slice().sort((x, y) => x - y),
        0.5
      );
  const med = ds[Math.floor(ds.length / 2)],
    sd = Math.sqrt(mean(ds.map(x => (x - mean(ds)) ** 2)));
  // Histogram, 0.1 wide bins, stacked by view.
  const lo = Math.floor(ds[0] * 10),
    hi = Math.floor(ds[ds.length - 1] * 10),
    H = [];
  for (let b = lo; b <= hi; b++) H.push({b, v: {}});
  L.forEach(p => {
    const h = H[Math.floor(p.d * 10) - lo];
    h.v[p.view] = (h.v[p.view] || 0) + 1;
  });
  const hm = Math.max(...H.map(h => Object.values(h.v).reduce((t, x) => t + x, 0)));
  const group = key => {
    const O = {};
    L.forEach(p => (O[key(p)] = O[key(p)] || []).push(p));
    return O;
  };
  const rowsOf = (O, T) =>
    Object.entries(O)
      .map(([k, a]) => ({
        k,
        t: T ? T[k] || k : k,
        a,
        m: median(a.map(p => p.d)),
        n: a.reduce((t, p) => t + p.n, 0),
        ok: a.reduce((t, p) => t + p.ok, 0)
      }))
      .sort((a, b) => b.m - a.m);
  const V = rowsOf(
      group(p => p.view),
      VIEW_T
    ),
    S = rowsOf(group(origin), ORIGIN_T),
    GN = rowsOf(group(p => p.genus));
  // Dot strip scale: the spread of the photos shown, at least -1..+1.
  const x0 = Math.min(-1, Math.floor(ds[0] * 2) / 2),
    x1 = Math.max(1, Math.ceil(ds[ds.length - 1] * 2) / 2),
    X = d => ((100 * (d - x0)) / (x1 - x0)).toFixed(1) + '%';
  // One lane per view (Pierre, 2026-11-02: the three zoom levels must not mix as photos add up): a dot per photo, its
  // size and strength growing with its answers (a pale small dot = a rough rating); the lane's median as a tick; from
  // BOX_MIN photos, a box (quartiles) and whiskers (the farthest photos within 1.5 boxes), behind the dots. Fewer photos
  // get no box: quartiles of 2-4 values would look more precise than they are.
  const BOX_MIN = 5,
    lanes = Object.keys(VIEW_T).filter(v => L.some(p => p.view === v)),
    dot = p => {
      const k = Math.min(1, p.a / 10);
      return `<button type="button" class="v-${p.view}" style="left:${X(p.d)};--s:${(7 + 5 * k).toFixed(1)}px;opacity:${(0.35 + 0.6 * k).toFixed(2)}" data-zf="${esc(p.f)}" data-g="${esc(p.genus)}" title="${esc(VIEW_T[p.view] || p.view)} ${sgn(p.d)} · ${p.a} answer${p.a === 1 ? '' : 's'}, ${pct(p.ok, p.n)} right"></button>`;
    },
    lane = (a, v) => {
      const P = a.filter(p => p.view === v);
      if (!P.length) return `<span class="adm-strip"><b style="left:${X(0)}"></b></span>`;
      const d = P.map(p => p.d).sort((x, y) => x - y),
        med = qtl(d, 0.5);
      let box = '';
      if (d.length >= BOX_MIN) {
        const q1 = qtl(d, 0.25),
          q3 = qtl(d, 0.75),
          r = 1.5 * (q3 - q1),
          lo = d.find(x => x >= q1 - r),
          hi = d.filter(x => x <= q3 + r).pop();
        box = `<u style="left:${X(lo)};right:calc(100% - ${X(hi)})"></u><s class="v-${v}" style="left:${X(q1)};right:calc(100% - ${X(q3)})"></s>`;
      }
      return `<span class="adm-strip" title="${esc(VIEW_T[v])}: median ${sgn(med)}, ${P.length} photo${P.length === 1 ? '' : 's'}"><b style="left:${X(0)}"></b>${box}${P.map(dot).join('')}<i class="v-${v}" style="left:${X(med)}"></i></span>`;
    },
    strip = a => `<span class="adm-lanes">${lanes.map(v => lane(a, v)).join('')}</span>`;
  const table = (Rw, first) =>
    `<table class="adm-tbl"><thead><tr><th>${first}</th><th>Photos</th><th>Median</th><th>Right</th></tr></thead><tbody>${Rw.map(r => `<tr><td>${esc(r.t)}</td><td class="n">${r.a.length}</td><td>${sgn(r.m)}</td><td>${pct(r.ok, r.n)}</td></tr>`).join('')}</tbody></table>`;
  const legend = `<p class="adm-legend">${Object.keys(VIEW_T)
    .filter(v => L.some(p => p.view === v))
    .map(v => `<span><i class="v-${v}"></i>${VIEW_T[v]}</span>`)
    .join('')}</p>`;
  $v.innerHTML =
    head +
    kpis([
      ['Photos rated', L.length],
      ['Median', sgn(med)],
      ['Spread (SD)', sd.toFixed(2)],
      ['Hardest genus', `<i>${esc(GN[0].k)}</i>`]
    ]) +
    `
    <div class="adm-sgrid">
    <section class="adm-scard"><h3>Distribution</h3><div class="adm-cols stack">${H.map(
      h =>
        `<div title="${(h.b / 10).toFixed(1)} to ${((h.b + 1) / 10).toFixed(1)}">${Object.keys(VIEW_T)
          .filter(v => h.v[v])
          .map(v => `<i class="v-${v}" style="height:${(100 * h.v[v]) / hm}%"></i>`)
          .join('')}</div>`
    ).join('')}</div>
      <p class="adm-axis"><span>${sgn(lo / 10)}</span><span>easier · harder</span><span>${sgn((hi + 1) / 10)}</span></p>${legend}</section>
    <section class="adm-scard"><h3>Views</h3>${table(V, 'View')}</section>
    <section class="adm-scard"><h3>Sources</h3>${table(S, 'Source')}</section>
    <section class="adm-scard wide"><h3>Genera</h3>${legend}<div class="adm-gstrips">${GN.map(r => `<div><a class="adm-gen" href="#${esc(r.k)}"><i>${esc(r.k)}</i></a><span class="n">${sgn(r.m)}</span>${strip(r.a)}</div>`).join('')}</div>
      <p class="adm-axis strip"><span>${sgn(x0)}</span><span>easier · harder</span><span>${sgn(x1)}</span></p></section>
    </div>`;
  bindStats();
}
