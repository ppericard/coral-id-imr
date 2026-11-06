// IMR Reef ID: photo curation back-office (admin.html, not linked from the app).
// First, the storage keys from before the rename (2026-11-03) move to their new names (core.js migrateKeys): the admin's
// token, draft and Undo history included. Before anything reads them.
migrateStorage();
migrateIdKey(); // the renamed Coral ID Key (2026-11-04): its keys moved once (core.js)
migrateRoutes(); // the URL refonte (2026-11-05): page names and addresses in this device's data moved once (core.js)
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
// other in Candidates. The other genera of data.json "x" are Key-only (Identify > Coral ID Key and their sheet): their
// cap is what the sheet and the Coral ID Key can show of a view, CAP.sheet (6) colonies, and they get no Corallites
// candidates ("nobody uses the [Coral ID Key] on a corallite close-up"; the macro photos already there stay). Set once
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
      const v = DEMO ? localStorage.getItem(SK(k)) : keyGet(localStorage, k); // the key's old name too while a migration waits (core.js keyGet)
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
// Colour-blind mode as set in the app's ⚙ (app.js, reefid-sync-cvd; the theme comes the same way, admin.html): the admin
// follows it, for right / wrong and the difficulty bands (recBadge: dark blue … dark orange; Pierre, 2026-11-05).
try {
  if (localStorage.getItem('reefid-sync-cvd') === '1') document.documentElement.dataset.cvd = '1';
} catch (e) {}
// Candidates not downloaded yet (r: 1) show straight from iNaturalist; tools/fetch_approved.py downloads the ones added.
// A recropped photo keeps its file name: its URL carries the crop (cr) and rewrite count (iv) so no cache serves the old file.
const ver = p => (p.cr || p.iv ? `?c=${(p.cr || []).join('_')}${p.iv ? '.' + p.iv : ''}` : '');
// The site's photos from Cloudflare R2 (core.js PHOTO_BASE) while R2 answers; once an R2 photo failed in this tab, it and
// the next ones come from their online original at a light size, or from the site's img/ for a photo with none (as
// app.js photoFail, core.js photoAway; Pierre, 2026-11-05: the photos with an online original leave img/).
// With PHOTO_BASE '' (R2 switched off), AWAY from the start: the photos with an online original live on R2 only.
let R2 = !!PHOTO_BASE,
  AWAY = !PHOTO_BASE,
  PIDX = null;
const photoIdx = () => (PIDX = PIDX && PIDX.of === DATA ? PIDX : {of: DATA, ...photoIndex(DATA)});
const photoLook = f => photoIdx().f.get(f);
const img = (p, s) =>
  p.r && p.src
    ? p.src.replace('/original.', s ? '/medium.' : '/large.')
    : AWAY && p.src
      ? photoOnline(p.src, s ? 's' : '')
      : `${R2 ? PHOTO_BASE : ''}img/${p.f}${s ? '-s' : ''}.webp${ver(p)}`;
document.addEventListener(
  'error',
  e => {
    if (!(e.target instanceof HTMLImageElement)) return;
    // The published crop, baked into the site's files, drawn on the original (core.js photoCropOf; Codex review #569);
    // crSrc draws it on the next renders (AWAY). Under a service worker, as app.js away: only this photo moves, and the
    // tab keeps asking R2, where the worker keeps its offline copies (and has retried R2 already).
    const sw = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
    const away = i => {
      if (!photoFallback(i, photoLook)) return false;
      if (!sw) ((R2 = false), (AWAY = true));
      const c = photoCropOf(i.getAttribute('src') || '', photoIdx());
      if (c && !i.style.getPropertyValue('object-view-box')) i.style.setProperty('object-view-box', c);
      return true;
    };
    // R2 once more first (core.js photoRetry: a passing error), then the online original or the site.
    if ((!sw && photoRetry(e.target, away)) || away(e.target)) e.stopImmediatePropagation();
  },
  true
);
const clone = o => JSON.parse(JSON.stringify(o));
// The page's address without its filter (after '?', split off before decoding: hashQuery), decoded; a malformed
// %-escape no longer throws (code re-review L2). A name in it is the last segment, so a '/' in a player's name stays in it.
const hashNow = () => {
  const h = location.hash.slice(1).split('?')[0];
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
  PRES = {}, // presence.json sp: each photo species confirmed in the Philippines or not (tools/coral_presence.py)
  NAMES = {}, // names.json, the coral section: former names and iNaturalist spellings (tools/taxonomy.py; presence.js nameFlag)
  FISHA = null, // the fish entries and their photos, for the fish beta's reports (fishAdmin)
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
  FSIG = null,
  ASIG_OF = null;
// The fish answers the same way, in the fish part (autosort.js fishStamp; FSIG his keep per fish photo, as ASIG): a
// Remove, × or Not this on a photo the fish auto-sort put in play (Photos › Families) is timed (Codex review #655).
function autoWhen() {
  if (ASIG_OF !== snap) {
    const S = JSON.parse(snap);
    ASIG = autoSigs(S);
    FSIG = fishSigs((S || {}).fish);
    ASIG_OF = snap;
  }
  const t = Date.now() / 1000,
    A = autoStamp(DRAFT, ASIG, t),
    FA = DRAFT.fish && fishStamp(DRAFT.fish, FSIG, t);
  if (A) DRAFT.auto = A;
  if (FA) DRAFT.fish = {...DRAFT.fish, auto: FA};
  ASIG = autoSigs(DRAFT); // of the draft saveDraft is about to keep as snap
  FSIG = fishSigs(DRAFT.fish);
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
// Each flag goes to its subject's part of the curation (flag.js s, core.js SUBJECTS admin.cur; a flag without one came
// from the corals, the only subject flagged before), under its id there (fish: core.js fishPid), never to another's.
const flagsOf = (C, S = ASUBJ) => (S.admin.cur ? (C[S.admin.cur] || {}).flag : C.flag) || {};
function flagsSet(C, S, F) {
  if (!S.admin.cur) return (C.flag = F);
  C[S.admin.cur] = {...(C[S.admin.cur] || {}), flag: F};
}
function importFlags() {
  const L = store.get('reefid-photo-flags', []);
  if (!L || !L.length) return 0;
  let n = 0;
  L.forEach(x => {
    if (!x || !x.f) return;
    const S = subjectOf(x.s),
      F = flagsOf(DRAFT, S);
    if (F[x.f]) return;
    const {f, s, ...rest} = x;
    flagsSet(DRAFT, S, {...F, [f]: rest});
    n++;
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
// The points to handle (curation.json "points", To do › Points).
const ptChanged = () => !same(DRAFT.points || {}, SAVED.points || {});
// Lead photos of the growth-form tiles on the Coral ID Key start (curation.json "tile" {form letter: [f, ...]}, at most
// 3, in click order): set with 📌 in the Growth form view. A pinned photo leads its IMR form's tile and the Coral ID Key
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
    // Once R2 failed, a downloaded photo comes from its online original, uncropped (img(), AWAY): its crop is drawn.
    baked = !p.r && p.cr && !(AWAY && p.src);
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
// ghfile: begin
// A repository file's text and sha. The contents API sends a file's text only up to 1 MB: above that `content` is empty
// (encoding "none"), so the text comes from its blob (up to 100 MB). curation.json passed 1 MB on 2026-11-04 and the
// admin stopped loading ("Unexpected end of JSON input"). null when the file does not exist.
async function ghFile(path) {
  const f = await gh(`/contents/${path}?ref=${BRANCH}`).catch(e => {
    if (/Not Found/.test(e.message)) return null;
    throw e;
  });
  if (!f) return null;
  const b64 = f.content ? f.content : (await gh(`/git/blobs/${f.sha}`)).content;
  return {text: fromB64(b64), sha: f.sha};
}
// ghfile: end
async function checkToken() {
  const r = await gh('');
  if (!(r.permissions && r.permissions.push)) throw new Error('This token cannot write to the repository.');
}
async function loadSaved() {
  if (TOKEN) {
    const f = await ghFile(FILE);
    if (f) {
      SAVED = JSON.parse(f.text);
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
      early();
      await checkToken();
      if (!has) await lockToken($('pw').value, TOKEN);
      sess.set(TOKEN);
      start();
    } catch (x) {
      TOKEN = null;
      sheetAgain(...EARLY_ALL);
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
// added book photos apart from the views: Coral ID Key only, never the sheet, cover or games; app.js applySlots).
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
// (data.json p.loc: dauin, ph or world). The filter is kept across genera and visits. Each subject lists its origins
// in core.js SUBJECTS admin origins, [key, name, short name] (the short one on the genus bar's chips, the name in the
// tooltip, so the whole bar fits on one line); ORIGINS are the corals', every origin a photo can have.
const ORIGINS = (SUBJECTS.find(s => !s.hash) || SUBJECTS[0]).admin.origins;
const origin = p => (p.cf ? 'book' : p.imr ? 'imr' : p.own ? 'own' : {dauin: 'dauin', ph: 'ph'}[p.loc] || 'world');
let SHOW = new Set(
  store.get(
    'reefid-admin-origins',
    ORIGINS.map(o => o[0])
  )
);
const shown = p => SHOW.has(origin(p));
// View filter of the genus page (Pierre, 2026-11-04): All, or one view's section alone, so the close-ups and corallites
// are reached without scrolling past every colony photo. Kept across genera and visits; on a genus without the saved
// view (a 2-zoom genus has no Close-up row) the page shows All, and the choice stays for the next genus.
let GVIEW = store.get('reefid-admin-gview', 'all');
// ---- One filter bar (admin plan PR 3, docs/ROADMAP.md "Admin for every subject") ----
// Every photo page draws its filters with these parts, filled from the subject on screen (core.js SUBJECTS: views, the
// unit words one / many, admin origins and csrc), and wires them with bindBar: the genus page (origin chips with counts,
// the view filter), Photo review (origins, view, unit, its check boxes) and Candidates (the sources). Each filter keeps
// one state, shared by every page that shows it: SHOW (reefid-admin-origins), GVIEW, each page's own (QF, FF, CSRC).
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
const FB = {
  // The origin chips. With counts (cnt(o)): the genus bar's, short names, the full one in the tooltip, and All once one is
  // off; else a "Show" row of full names. skip: origins a page never shows (Growth form: CF book photos never go on its
  // tiles).
  origins({cnt, skip = []} = {}) {
    const O = ASUBJ.admin.origins.filter(([o]) => !skip.includes(o));
    return cnt
      ? `<span class="adm-shows" role="group" aria-label="Show photos from">${O.map(([o, t, s]) => `<button type="button" class="adm-fchip o-${o}" data-o="${o}" aria-pressed="${SHOW.has(o)}" title="${t}">${s} <b>${cnt(o)}</b></button>`).join('')}${O.some(([o]) => !SHOW.has(o)) ? '<button type="button" class="adm-link" data-o="all">All</button>' : ''}</span>`
      : `<div class="adm-filter"><span class="label">Show</span>${O.map(([o, t]) => `<button type="button" class="adm-fchip o-${o}" data-o="${o}" aria-pressed="${SHOW.has(o)}">${t}</button>`).join('')}</div>`;
  },
  // The view filter, items [[value, name]]: on the genus bar a segmented control (key gv), on Photo review filter chips
  // (key qv, fv) over every photo (viewItems).
  views: ({key, cur, items, seg}) =>
    seg
      ? `<span class="adm-qseg adm-lvseg adm-gview" role="group" aria-label="Show view">${items.map(([v, t]) => `<button type="button" data-${key}="${v}" aria-pressed="${cur === v}">${t}</button>`).join('')}</span>`
      : items
          .map(([v, t]) => `<button type="button" class="adm-fchip plain" data-${key}="${v}" aria-pressed="${cur === v}">${t}</button>`)
          .join(''),
  viewItems: () => [['all', 'All'], ...ASUBJ.views, ['cand', 'Candidates']],
  // One unit or all of them (Photo review).
  unit: ({id, cur, names}) =>
    `<select id="${id}" aria-label="${cap1(ASUBJ.one)}"><option value="">All ${ASUBJ.many}</option>${names.map(m => `<option${m === cur ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select>`,
  check: (id, on, text) => `<label class="adm-todo"><input type="checkbox" id="${id}"${on ? ' checked' : ''}> ${text}</label>`,
  // The Candidates swiper's sources (admin csrc, by their short names), then All; n(s) the candidates of each.
  srcs: () => [...(ASUBJ.admin.csrc || []).map(k => [k, ASUBJ.admin.origins.find(o => o[0] === k)[2]]), ['all', 'All']],
  sources: (cur, n) =>
    `<span class="adm-qseg adm-csrc" role="group" aria-label="Source">${FB.srcs()
      .map(([s, t]) => `<button type="button" data-src="${s}" aria-pressed="${s === cur}">${t} <b>${n(s)}</b></button>`)
      .join('')}</span>`
};
// The bar's clicks, then redraw(): the origin chips and the genus bar's views on every page; with f (the page's filter
// state, kept under the storage key k), its view chips (data-<view>), its unit select (id unit) and check boxes ({id: field});
// src: the Candidates sources.
function bindBar(scope, {redraw, f, k, view, unit, checks = {}, src}) {
  scope.querySelectorAll('[data-o]').forEach(
    b =>
      (b.onclick = () => {
        const o = b.dataset.o;
        if (o === 'all') SHOW = new Set(ORIGINS.map(x => x[0]));
        else SHOW.has(o) ? SHOW.delete(o) : SHOW.add(o);
        store.set('reefid-admin-origins', [...SHOW]);
        redraw();
      })
  );
  scope.querySelectorAll('[data-gv]').forEach(
    b =>
      (b.onclick = () => {
        GVIEW = b.dataset.gv;
        store.set('reefid-admin-gview', GVIEW);
        redraw();
      })
  );
  if (src)
    scope.querySelectorAll('[data-src]').forEach(
      b =>
        (b.onclick = () => {
          CSRC = b.dataset.src;
          store.set('reefid-admin-csrc2', CSRC);
          redraw();
        })
    );
  if (!f) return;
  const save = () => {
    store.set(k, f);
    redraw();
  };
  if (view)
    scope.querySelectorAll(`[data-${view}]`).forEach(
      b =>
        (b.onclick = () => {
          f.view = b.dataset[view];
          save();
        })
    );
  if (unit)
    $(unit).onchange = e => {
      f.genus = e.target.value;
      save();
    };
  Object.entries(checks).forEach(
    ([id, x]) =>
      ($(id).onchange = e => {
        f[x] = e.target.checked;
        save();
      })
  );
}
// A photo taken abroad of a species the presence rule does not confirm in the Philippines (presence.js outOfRule;
// Pierre, 2026-11-04): an "out of rule" tag next to its source, and a part of To do. Never removed automatically.
// Kept (Pierre, 2026-11-05: the rule stays strict, he sorts these photos himself): an exception he accepted with Keep in
// To do, curation.json seen {'rule:f': 1} like his other "decided" marks; the photo stays on the site and moves to To do's
// Kept subsection, where he can still exclude it or un-keep it. Its tag stays, in a neutral "kept" style.
const ruleKept = f => !!(DRAFT.seen || {})['rule:' + f];
const ruleTag = p =>
  !outOfRule(p, PRES)
    ? ''
    : ruleKept(p.f)
      ? `<span class="adm-src adm-rule kept" title="Kept out of the presence rule">out of rule · kept</span>`
      : `<span class="adm-src multi adm-rule" title="Out of the presence rule">out of rule</span>`;
// Photos out of the rule still needing a decision, from the curated photo lists (presence.js ruleQueue), for To do; and
// the ones he kept (To do's Kept subsection).
const outOfRuleList = () => ruleQueue(Object.keys(DATA.gen), photos, hidden, offSlot, PRES, ruleKept);
const ruleKeptList = () => ruleQueue(Object.keys(DATA.gen), photos, hidden, offSlot, PRES).filter(p => ruleKept(p.f));
// A share-alike photo (CC BY-SA, CC BY-NC-SA; presence.js shareAlike: its lic, else its attribution text). Pierre,
// 2026-11-05: no share-alike for corals any more (the candidate search no longer takes them), but the ones already on the
// site are never removed automatically: a "share-alike" tag next to its source on every page, and a part of To do with
// the same actions as Out of the presence rule; Keep = curation.json seen {'sa:f': 1}, its tag then neutral.
const saKept = f => !!(DRAFT.seen || {})['sa:' + f];
const saTag = p =>
  !shareAlike(p)
    ? ''
    : saKept(p.f)
      ? `<span class="adm-src adm-sa kept" title="Kept share-alike">share-alike · kept</span>`
      : `<span class="adm-src multi adm-sa" title="Share-alike">share-alike</span>`;
const saList = () => saQueue(Object.keys(DATA.gen), photos, hidden, saKept);
const saKeptList = () => saQueue(Object.keys(DATA.gen), photos, hidden).filter(p => saKept(p.f));
// A photo or candidate whose name is a former combination, a moved genus or iNaturalist's spelling of a name WoRMS writes
// otherwise (ROADMAP "Taxonomy reference", Pierre 2026-11-05, Q49; presence.js nameFlag, names.json): a neutral tag with
// the name WoRMS accepts now. Information only, no action: nothing is renamed (rule C1).
const NAME_KIND = {spelling: 'iNaturalist spelling', former: 'Former name', genus: 'Former genus'};
const nameTag = p => {
  const k = nameFlag(p, NAMES);
  if (!k) return '';
  const t = [NAME_KIND[k.kind], k.iname ? 'iNaturalist: ' + k.iname : '', k.inat === false ? 'not on iNaturalist' : '']
    .filter(Boolean)
    .join(' · ');
  return `<span class="adm-src adm-worms" title="${esc(t)}">WoRMS: <i>${esc(k.now)}</i></span>`;
};
// A photo the auto-sort added carries an "auto" tag next to its source (undo it in Candidates › Auto › Details).
const srcTag = p => {
  const o = origin(p),
    a = aApplied(p.f);
  return `<span class="adm-src o-${o}">${ORIGINS.find(x => x[0] === o)[1]}</span>${a && a.kind === 'a' ? '<span class="adm-src adm-autot" title="Auto-sort">auto</span>' : ''}${ruleTag(p)}${saTag(p)}${nameTag(p)}`;
};

/* ---------- Edits ---------- */
let QUIET = false; // several edits in a row (To do's Remove all): each its own Undo step, the page drawn once at the end
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
  if (!QUIET) render();
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
// What status() reads from the draft and the published file alone (what changed, the suggestions, the cells over the cap)
// is computed once per draft (MEMO, emptied by memoFresh when the draft changes) and published file (Pierre, 2026-11-04:
// every page drew it again, 0.1-0.3 s a time on a phone).
function status() {
  memoFresh();
  const m = MEMO['status|'] && MEMO['status|'].saved === SAVED ? MEMO['status|'] : (MEMO['status|'] = {saved: SAVED, ...status0()});
  statusDraw(m);
}
function status0() {
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
      auChanged() ? 'auto-sort' : '',
      fiChanged() ? 'fish curation' : '',
      ptChanged() ? 'points to handle' : ''
    ].filter(Boolean);
  return {parts, sug: sugCount(), over: overCap()};
}
function statusDraw({parts, sug, over}) {
  const bs = $('booksw');
  if (bs) {
    bs.setAttribute('aria-pressed', String(bookOn(DRAFT)));
    bs.textContent = `CF book: ${bookOn(DRAFT) ? 'on' : 'off'}`;
  }
  const tn = Object.keys(flagsOf(DRAFT, ADM0)).length + sug + repsOpen().length,
    xn = Object.keys(DRAFT.exclude || {}).length;
  OVER = over;
  const t = draftAt ? ` (saved ${dateText(draftAt, 'hm')})` : '';
  // Publish carries the status (no separate status text): "● Publish" with a draft, "Published" when clean.
  const sv = $('save');
  if (sv.textContent !== 'Publishing…') sv.textContent = !TOKEN ? 'Read-only' : parts.length ? '● Publish' : 'Published';
  sv.title = !TOKEN ? 'Read-only: changes are not kept' : parts.length ? `Draft${t}: ${parts.join(' + ')}` : 'Publish';
  $('undo').disabled = !HIST.length;
  $('redo').disabled = !FUT.length;
  $('save').disabled = !TOKEN || !parts.length;
  if (cur.startsWith(LIVE + '/') && DATA.gen[cur.slice(LIVE.length + 1)]) lastGenus = cur.slice(LIVE.length + 1);
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
// of 2026-11-01): Inbox (To do, Coverage), Photos (Genera, Candidates, Photo review, Look-alikes, Photo stats), Players
// (Activity, List), plus Analyses (below). No tab holds a view of its own name, and no group a tab of its own name
// (Pierre, 2026-11-04). The views of a tab are chosen with the segmented switch at the right of the tab row (#subnav,
// navs()). Each header group reopens the tab and view used last in it (reefid-admin-nav-group), each tab its view used
// last (reefid-admin-nav-tab). Phones: one menu with every tab.
// Addresses (URL refonte, Pierre, 2026-11-05, Q53-Q56): #<group>/<tab>/<view>, each segment the word on screen, computed
// from GROUPS; a tab with one view has no view segment (#players/activity); a thing the page is about follows as a
// further segment (#photos/genera/live/<Genus>, #players/list/journey/<name>, #inbox/todo/points/<id>), a filter after
// '?' (#inbox/coverage/games?look=all). A shorter address (a group, a tab) opens its first view; an old or unknown one
// opens its group's first view, else the landing page (rule W3: no table of old addresses).
// [group slug, group name, [[tab slug, tab name, [[view slug, view name], ...]], ...], options]; '' = the tab's one view.
// The subject on screen (admin plan PR 2; Pierre, 2026-11-04: one Corals | Fish switch for the whole admin, To do
// included, each side showing its own to-do count). Each subject's addresses carry its core.js SUBJECTS hash ('' for
// the corals: #fish/inbox/todo/reports is the fish side's Reports); its admin part (SUBJECTS admin) says cur, its
// part of curation.json ('' = the top level); pages, the admin pages it has (null = all; a page covers the addresses
// under it). A page a subject does not have yet says so; its tabs are left out of the header.
const ADM0 = SUBJECTS.find(s => !s.hash);
let ASUBJ = ADM0;
const subjOfHash = h => {
  const S = SUBJECTS.find(s => s.hash && h.startsWith(s.hash)) || ADM0;
  return [S, h.slice(S.hash.length)];
};
// p is the page x or an address under it (a player's journey is under players/list).
const under = (p, x) => p === x || p.startsWith(x + '/');
// The Players pages are every subject's (Pierre, 2026-11-06: "the Players section needs rethinking now that we have two
// game modes"; docs/reviews/2026-11-06-admin-players-two-subjects.md): Activity and a player's Journey follow the switch,
// each under its subject's prefix; the list of players is one page for both (SHARED): no prefix, the same table on either
// side (a group of columns per subject), the switch inert there, the subject on screen kept for the other pages.
const SHARED = ['players/list'];
const shared = p => SHARED.includes(p);
const hasPage = (S, p) =>
  p.startsWith('players/') ||
  (!TABS.some(t => t[4].rank && t[4].rank !== S.rank && under(p, t[0])) && (!S.admin.pages || S.admin.pages.some(x => under(p, x))));
// A subject's landing page: Players › Activity (every subject has it).
const homeOf = S => (hasPage(S, 'players/activity') ? 'players/activity' : 'players/list');
// A player's page (a journey, a device's): the switch keeps it, as the page's own subject toggle does (renderJourney).
const playerPage = p => p.startsWith('players/list/journey/') || p.startsWith('players/list/anon/');
// The per-subject memories (last tab, view and page): the corals' keys carry no subject.
const subjK = (k, S = ASUBJ) => (S.hash ? `${k}-${S.id}` : k);
// A subject's to-do count on the switch: the corals' To do items (reports, flags, suggestions); for a subject with its own
// part of curation.json, the Checks its auto-sort left for Pierre (autosort.js fishIdx, fishMine) and its photos flagged
// on the site (its flag).
const subjTodo = (S, tn) => {
  if (!S.admin.cur) return tn;
  const F = DRAFT[S.admin.cur] || {};
  return Object.entries(fishIdx(F)).filter(([f, x]) => x.d.check && !fishMine(F, f)).length + Object.keys(F.flag || {}).length;
};
// A subject's icon on the switch (core.js SUBJECTS icon, the app's set: app.js subjIcon), its name beside it on wider
// screens only (admin.css .adm-sjn; Pierre, 2026-11-06: a mini switch in the top bar, as the app's header).
const subjSvg = S =>
  `<svg class="sji" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${S.icon}</svg>`;
// A genus page: Photos › Genera › Live, the genus as the last segment (a coral page: no subject prefix).
const LIVE = 'photos/genera/live';
const genusHref = g => '#' + LIVE + '/' + encodeURIComponent(g);
const genusHash = () => '#' + ASUBJ.hash + LIVE + '/' + encodeURIComponent(lastGenus || Object.keys(DATA.gen)[0]);
const GROUPS = [
  [
    'inbox',
    'Inbox',
    [
      [
        'todo',
        'To do',
        [
          ['all', 'All'],
          ['reports', 'Reports'],
          ['errors', 'Errors'],
          ['health', 'Health'],
          // The points to handle (Pierre, 2026-11-05): trainer questions, names, sources, content (renderPoints).
          ['points', 'Points']
        ]
      ],
      [
        'coverage',
        'Coverage',
        [
          ['games', 'Games'],
          ['sheets-id-key', 'Sheets & ID Key']
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
          ['live', 'Live'],
          ['hidden', 'Hidden'],
          ['excluded', 'Excluded']
        ]
      ],
      // A subject's book families (admin plan PR 6 on the book's families, renderFishUnits): the tab of a subject whose unit
      // rank is the family (core.js SUBJECTS rank), never shown for the corals (hasPage).
      ['families', 'Families', [['', 'Families']], {rank: 'family'}],
      ['candidates', 'Candidates', [['', 'Candidates']]],
      [
        'review',
        'Photo review',
        [
          ['quality', 'Quality'],
          ['growth-form', 'Growth form'],
          ['by-difficulty', 'By difficulty']
        ]
      ],
      ['look-alikes', 'Look-alikes', [['', 'Look-alikes']]],
      [
        'stats',
        'Photo stats',
        [
          ['overview', 'Overview'],
          ['difficulty', 'Difficulty']
        ]
      ]
    ]
  ],
  [
    'players',
    'Players',
    [
      // Activity first, so Players opens on it when no tab of the group was used yet (Pierre, 2026-11-05).
      // Activity = who plays and how much (Pierre, 2026-11-04, one role per admin page): its analysis cards and the
      // Mix-ups view moved to Analyses (Learning › Answer log, Difficulty › Pairs).
      ['activity', 'Activity', [['', 'Recent sessions']]],
      ['list', 'List', [['', 'List']]]
    ],
    // fixed: a click on the group always opens its first tab, never the tab used last (Pierre, 2026-11-05: "Players
    // always opens Activity").
    {fixed: true}
  ],
  // Analyses (Pierre, 2026-11-04: "a new section with several sub-pages" for the multifactor analyses of the answer log,
  // every 1000 answers): the one group added after the nine tabs (docs/rules/admin.md A3); drawn by admin-analyses.js.
  // Analyses = what we learn (Pierre, 2026-11-04, one role per admin page): the views read live from the answer log
  // (admin.js renderStats, LIVE_STATS) sit here too: Pairs (formerly Players › Activity › Mix-ups), Answer log
  // (Activity's analysis cards) and Stops (Health's "where players stop" and genus sheets opened).
  [
    'analyses',
    'Analyses',
    [
      ['overview', 'Overview', [['', 'Overview']]],
      [
        'speed',
        'Speed',
        [
          ['answer-time', 'Answer time'],
          ['enlarging', 'Enlarging']
        ]
      ],
      [
        'difficulty',
        'Difficulty',
        [
          ['photos', 'Photos'],
          ['formats', 'Formats'],
          ['mix-ups', 'Mix-ups'],
          ['pairs', 'Pairs']
        ]
      ],
      [
        'learning',
        'Learning',
        [
          ['practice', 'Practice'],
          ['after-a-break', 'After a break'],
          ['sessions', 'Sessions'],
          ['profiles', 'Profiles'],
          ['answer-log', 'Answer log'],
          ['stops', 'Stops']
        ]
      ]
    ]
  ]
];
// Every tab as [address, name, [[view address, view name], ...], group slug, options]; every page's address. options.rank:
// the tab is only for a subject whose unit rank it names (core.js SUBJECTS rank).
const TABS = GROUPS.flatMap(([g, , L]) =>
  L.map(([t, n, V, o]) => [g + '/' + t, n, V.map(([v, w]) => [[g, t, v].filter(Boolean).join('/'), w]), g, o || {}])
);
const ADM_PAGES = TABS.flatMap(t => t[2].map(([h]) => h));
// The pages drawn by renderStats from the live answer log (the other Analyses views read the stored report).
const LIVE_STATS = [
  'players/activity',
  'photos/stats/difficulty',
  'photos/review/by-difficulty',
  'analyses/difficulty/pairs',
  'analyses/learning/answer-log',
  'analyses/learning/stops'
];
const anPage = p => p.startsWith('analyses/') && !LIVE_STATS.includes(p);
// The addresses that take a thing after their page: a genus, a player, a device, a point.
const FAMS = 'photos/families';
const ADM_PARAM = [LIVE + '/', FAMS + '/', 'players/list/journey/', 'players/list/anon/', 'inbox/todo/points/'];
// An address for the page cur names (cur is decoded): the thing after its page encoded again, so a '/' or '?' in a
// player's name stays in it (Codex review #610).
const admAddr = p => {
  const x = ADM_PARAM.find(x => p.startsWith(x) && p.length > x.length);
  return x ? x + encodeURIComponent(p.slice(x.length)) : p;
};
// The page an address shows: itself, the page it sits under (a genus under Live, a journey under List, a point under
// Points), its first view for a group or a tab, else its group's first view, else the subject's landing page.
function admRoute(p, S = ASUBJ) {
  if (ADM_PAGES.includes(p) || ADM_PARAM.some(x => p.startsWith(x) && p.length > x.length)) return p;
  // The subject's own tabs and views first (a fish #photos opens Families, a tab the corals do not have).
  const seg = p.split('/'),
    has = t => t[2].some(([h]) => hasPage(S, h)),
    T = TABS.find(t => t[0] === seg.slice(0, 2).join('/')) || TABS.find(t => t[3] === seg[0] && has(t)) || TABS.find(t => t[3] === seg[0]);
  return T ? (T[2].find(([h]) => hasPage(S, h)) || T[2][0])[0] : homeOf(S);
}
// The filter after '?' of the address on screen (URLSearchParams).
const hashQuery = () => new URLSearchParams(location.hash.split('?')[1] || '');
// Coverage › Games with Where to look open in full (the banner above its grid; renderCov).
const lookAll = () => cur === 'inbox/coverage/games' && hashQuery().get('look') === 'all';
// A point's own page (To do › Points; renderPoint). Not a view: it sits under Points.
const POINT_R = 'inbox/todo/points/',
  pointHash = id => '#' + POINT_R + encodeURIComponent(id);
let ptFlush = () => {}; // a point's page: writes the note being typed to the draft (renderPoint)
// The view on screen: the longest page address cur sits under.
const pageOf = () => ADM_PAGES.filter(x => under(cur, x)).sort((a, b) => b.length - a.length)[0] || LIVE;
// The address on screen into ASUBJ and cur (the address after the subject's prefix, without the filter). An address
// that shows another page (a group, a tab, an old or unknown address: admRoute) is replaced by that page's, in place.
// A shared page (SHARED) keeps the subject on screen, whatever prefix it was reached with, and its address drops the
// prefix (#fish/players/list becomes #players/list, the fish side kept); opened first (a reload, a bookmark), the subject
// on screen last (reefid-admin-nav-subj).
let subjRead = false;
function readHash() {
  let [S, p] = subjOfHash(hashNow());
  const q = admRoute(p, S),
    pre = S !== ADM0;
  if (shared(q) && !pre) S = subjRead ? ASUBJ : SUBJECTS.find(x => x.id === store.get('reefid-admin-nav-subj', '')) || ADM0;
  subjRead = true;
  ASUBJ = S;
  cur = q;
  if (cur !== p || (shared(cur) && pre)) history.replaceState(null, '', '#' + (shared(cur) ? '' : ASUBJ.hash) + admAddr(cur));
  store.set('reefid-admin-nav-subj', ASUBJ.id);
}
const tabOf = (h = pageOf()) => TABS.find(t => t[2].some(([x]) => x === h)) || TABS.find(t => t[0] === 'photos/genera');
const groupKey = () => tabOf()[3];
// Genus x view cells over their cap (capOf: CELL_MAX colonies for a game genus, CAP.sheet for a Key-only one; after
// "Add anyway"): a warning on the To do tab and on the page that shows the cell (Pierre, 2026-11-02: "at least a
// warning"): Game coverage for a game genus, Sheet & ID Key coverage for a Key-only one. n = both.
let OVER = {'inbox/coverage/games': 0, 'inbox/coverage/sheets-id-key': 0, n: 0};
const overCap = () => {
  const o = {'inbox/coverage/games': 0, 'inbox/coverage/sheets-id-key': 0};
  Object.keys(DATA.gen).forEach(
    n =>
      (o[isGame(n) ? 'inbox/coverage/games' : 'inbox/coverage/sheets-id-key'] += capViews(n).filter(
        ([v]) => covOf(n, v).obs > capOf(n)
      ).length)
  );
  return {...o, n: o['inbox/coverage/games'] + o['inbox/coverage/sheets-id-key']};
};
function navs(tn, xn) {
  const T = tabOf(),
    g = T[3],
    page = pageOf(),
    last = store.get(subjK('reefid-admin-nav-group'), {}) || {},
    seen = store.get(subjK('reefid-admin-nav-tab'), {}) || {};
  if (last[g] !== page) {
    last[g] = page;
    store.set(subjK('reefid-admin-nav-group'), last);
  }
  if (seen[T[0]] !== page) {
    seen[T[0]] = page;
    store.set(subjK('reefid-admin-nav-tab'), seen);
  }
  if (hasPage(ASUBJ, cur)) store.set(subjK('reefid-admin-nav-last'), cur);
  const hn = Object.values(DRAFT.genera || {}).reduce((s, k) => s + (k.hide || []).length, 0),
    href = h => (h === LIVE ? genusHash() : '#' + (shared(h) ? '' : ASUBJ.hash) + h),
    // The subject's pages only: a view it has, a tab with one, a group with one.
    vOk = ([h]) => hasPage(ASUBJ, h),
    tOk = t => t[2].some(vOk),
    has = (t, h) => t[2].some(([x]) => x === h),
    // A tab opens on its view used last; a header group on its tab used last.
    tabHash = t => (has(t, seen[t[0]]) && hasPage(ASUBJ, seen[t[0]]) ? seen[t[0]] : (t[2].find(vOk) || t[2][0])[0]),
    groupHash = G =>
      !(G[3] && G[3].fixed) && TABS.some(t => t[3] === G[0] && has(t, last[G[0]])) && hasPage(ASUBJ, last[G[0]])
        ? last[G[0]]
        : tabHash(TABS.find(t => t[3] === G[0] && tOk(t)) || TABS.find(t => t[3] === G[0])),
    over = `${OVER.n} genus × view cell${OVER.n === 1 ? '' : 's'} over the cap (${CELL_MAX} colonies, Coverage › Games; ${CAP.sheet} for a Key-only genus, Coverage › Sheets & ID Key)`,
    // Counts: on a view in its switch, on a tab in the tab row and the phone menu.
    vcnt = h =>
      (h === 'inbox/todo/all' || h === 'inbox/todo/reports') && tn
        ? ` ${tn}`
        : h === 'photos/genera/excluded' && xn
          ? ` ${xn}`
          : h === 'photos/genera/hidden' && hn
            ? ` ${hn}`
            : h === 'inbox/todo/points' && ptOpen()
              ? ` ${ptOpen()}`
              : OVER[h]
                ? ` ⚠ ${OVER[h]}`
                : '',
    tcnt = t => (t[0] === 'inbox/todo' && tn ? ` (${tn})` : t[0] === 'inbox/coverage' && OVER.n ? ' ⚠' : '');
  const sw = $('subj');
  if (sw && SUBJECTS.length > 1) {
    sw.innerHTML = SUBJECTS.map(S => {
      const n = subjTodo(S, tn);
      // The subject's page used last (a remembered value is checked against today's addresses).
      // A player's page stays that player's (their journey in the other subject).
      const back = store.get(subjK('reefid-admin-nav-last', S), ''),
        to = playerPage(cur)
          ? cur
          : typeof back === 'string' && back && admRoute(back, S) === back && hasPage(S, back) && !shared(back)
            ? back
            : homeOf(S);
      return `<a href="#${esc(S.hash + admAddr(to))}" data-subj="${esc(S.id)}" aria-pressed="${S === ASUBJ}" title="${esc(S.name)}${n ? `: ${n} to do` : ''}"${shared(cur) ? ' tabindex="-1" aria-disabled="true"' : ''}>${subjSvg(S)}<span class="adm-sjn">${esc(S.name)}</span>${n ? `<b class="adm-scnt">${n}</b>` : ''}</a>`;
    }).join('');
    // On a shared page (the list of players) the switch is inert: the page is the same on both sides; it still shows the
    // side the other pages are on.
    sw.classList.toggle('off', shared(cur));
    sw.hidden = false;
  }
  $('modes').hidden = false;
  document.querySelectorAll('#modes [data-mode]').forEach(a => {
    const G = GROUPS.find(x => x[0] === a.dataset.mode);
    a.hidden = !TABS.some(t => t[3] === G[0] && tOk(t));
    if (a.hidden) return;
    a.href = href(groupHash(G));
    a.textContent = G[1] + (G[0] === 'inbox' && tn ? ` (${tn})` : '') + (G[0] === 'inbox' && OVER.n ? ' ⚠' : '');
    if (G[0] === 'inbox') a.title = OVER.n ? over : '';
    a.setAttribute('aria-current', String(G[0] === g));
  });
  const sub = $('subnav');
  if (sub) {
    const V = T[2].filter(vOk).length > 1 ? T[2].filter(vOk) : [];
    sub.innerHTML =
      `<span class="adm-subtabs">${TABS.filter(t => t[3] === g && tOk(t))
        .map(
          t =>
            `<a class="adm-fchip plain" href="${esc(href(tabHash(t)))}" aria-pressed="${t === T}"${t[0] === 'inbox/coverage' && OVER.n ? ` title="${esc(over)}"` : ''}>${t[1]}${tcnt(t)}</a>`
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
        `<optgroup label="${t}">${TABS.filter(x => x[3] === k && tOk(x))
          .map(x => `<option value="${esc(href(x === T ? page : tabHash(x)))}"${x === T ? ' selected' : ''}>${x[1]}${tcnt(x)}</option>`)
          .join('')}</optgroup>`
    ).join('');
    ms.hidden = false;
  }
}
// Which kind of page this is (help text, the Stats-style views): not the header tab, see groupKey().
const modeKey = () =>
  cur.startsWith('players/list/journey/') || cur.startsWith('players/list/anon/')
    ? 'journey'
    : cur.startsWith(POINT_R)
      ? 'point'
      : anPage(cur)
        ? (k => (k ? 'an-' + k : 'an'))(typeof anKey === 'function' && anKey(cur)) // its help (admin-analyses.js)
        : LIVE_STATS.includes(cur)
          ? 'stats'
          : {
              'players/list': 'users',
              'photos/review/quality': 'quality',
              'photos/review/growth-form': 'form',
              'photos/genera/excluded': 'excluded',
              'photos/genera/hidden': 'hidden',
              'inbox/todo/all': 'todo',
              'inbox/todo/reports': 'triage',
              'inbox/todo/errors': 'events',
              'inbox/todo/health': 'health',
              'inbox/todo/points': 'points',
              'inbox/coverage/games': 'cov',
              'inbox/coverage/sheets-id-key': 'kcov',
              'photos/look-alikes': 'mont',
              'photos/candidates': 'cand'
            }[cur] || (under(cur, FAMS) ? 'units' : 'genus');
// ---- The fish units page (admin plan PR 6, on the book's families: docs/reviews/2026-11-06-fish-units-plan.md §6) ----
// Photos › Families (#fish/photos/families/<family id>): the book's families by key group at the left, English name first,
// the scientific names below, an IMR tag on the families and genera in the IMR course (Pierre, 2026-11-06 13:38: "a tag
// on the families and genera in the course"; the list's All | IMR filter, FU_IMR). A family's page: one block per genus
// (its IMR tag, its species count), inside it one section per species (common name first, scientific name below, its
// observations in play against its target), each with its photos in play (curation.json fish add, autosort.js fishOn):
// featured first (FISHFEAT, his order), then the game's order (the easiest, then the most reference-like: core.js easyRank),
// never by who took them (fishOrder; rule P1 for fish, #635). On each photo: where it comes from, auto when the auto-sort put it in play, its ease, phase and what
// makes it harder; Feature, ★ Cover, Remove (fishReject), Not this (fishNotThis: another species of the family or none;
// Pierre's click only) and × (fishExclude), one click and one Undo step each. The family's choices go to curation.json
// fish genera keyed by family id (fishPick), through the draft and Publish only (rule A1); ✓ Validated once fishNeeds has
// nothing to say. A wink family shows its surprise card first, as players meet it. Fish data load once (fishLoad).
const fuJ = f => ((SUG && SUG.fish) || {})[f] || null;
let FU_IMR = store.get('reefid-admin-fu-imr', 'all'); // the family list: 'all' or 'imr' (the IMR course's only)
// The rubric's tags in words (judging/FISH.md "Tags"): only what makes a photo harder, as the fish Candidates say it.
const FU_TAGS = [
  {o: 'oblique', h: 'head-on', t: 'tail view', d: 'from above'},
  {0: 'partial'},
  {d: 'dim light', n: 'night'},
  {1: 'slight colour loss', 2: 'strong colour loss', 3: 'monochrome'},
  {m: 'soft', b: 'blurred'},
  {s: 'small'},
  {s: 'several of its kind', m: 'other fish too', x: 'subject not obvious'}
];
const FU_FLAGS = {c: 'camouflage', a: 'out of water'};
const fuTags = jt =>
  !jt ? '' : [...FU_TAGS.map((m, i) => m[jt[i]]), ...[...jt.slice(7)].map(c => FU_FLAGS[c])].filter(Boolean).map(esc).join(' · ');
// A unit's IMR tag: "IMR", its IMR name in the tooltip; a family IMR teaches with another (the Soapfishes) says so.
const fuImr = u =>
  u.imr
    ? `<span class="adm-src adm-imrt" title="IMR course: ${esc(u.imr)}">IMR</span>`
    : u.imrWith
      ? `<span class="adm-src adm-imrt" title="IMR course: taught with the ${esc(u.imrWith)}">IMR</span>`
      : '';
// A fish photo with its crop for the previews (crSrc, through its suggested-crop path): Pierre's (curation.json fish crop,
// [0, 0, 1, 1] = uncropped on purpose), else the judging pass's (Codex review #655).
const fuP = p => (p ? {...p, j: {c: ((DRAFT.fish || {}).crop || {})[p.f] || (fuJ(p.f) || {}).c || null}} : p);
const fuHref = id => '#' + ASUBJ.hash + FAMS + '/' + encodeURIComponent(id);
// Everything the page needs from the draft, once per render: each species' photos in play, the photos sent elsewhere
// with Not this, and the species whose photos changed since the published file (the list's dots).
function fuData() {
  const F = DRAFT.fish || {},
    S0 = SAVED.fish || {},
    play = {},
    gone = [];
  Object.entries(F.add || {}).forEach(([f, sid]) => {
    if (fishOn(F, f, sid)) (play[sid] = play[sid] || []).push(FISHC.byF[f] || {f});
  });
  Object.entries(F.out || {}).forEach(([f, to]) => {
    const p = FISHC.byF[f];
    if (p && to !== p.sid) gone.push({...p, to});
  });
  const dirty = new Set();
  ['add', 'seen', 'exclude', 'out'].forEach(k =>
    [...new Set([...Object.keys(F[k] || {}), ...Object.keys(S0[k] || {})])].forEach(
      f => !same((F[k] || {})[f], (S0[k] || {})[f]) && FISHC.byF[f] && dirty.add(FISHC.byF[f].sid)
    )
  );
  return {F, play, gone, dirty};
}
// A family's game species (fish.json order: most common first) and its photos in play by species, in the page's order;
// its cover (his pick while in play, else the family's first photo in the game's order); what it still needs.
function fuFam(u, D) {
  const sp = FISHC.species,
    ok = s => sp[s] && !sp[s].out,
    rows = Object.fromEntries(u.species.filter(ok).map(sid => [sid, fishOrder(D.play[sid] || [], D.F, u.id, sid, fuJ)])),
    k = (D.F.genera || {})[u.id] || {},
    all = u.species.filter(ok).flatMap(s => [...rows[s].feat, ...rows[s].rest]),
    // his pick while in play, else the family's first photo in the game's order across all its species (core.js easyRank
    // as the game's card cover: reference-level first; Codex review #655)
    cover = fishCoverOf(all, D.F, u.id, fuJ);
  return {rows, k, all, cover, needs: fishNeeds(u, D.play, sp, D.F, fuJ), n: u.species.filter(ok).length};
}
const fuName = sid => (FISHC.species[sid] || {}).name || sid;
// st: {num} for a featured photo; cover: the cover shown, picked: his pick; XI: fishIdx of the draft's fish part.
function fuTile(sid, p, st, cover, picked, F, XI) {
  const o = origin(p),
    x = XI[p.f],
    ease = (F.ease || {})[p.f] || (fuJ(p.f) || {}).e,
    ph = fishPhase(p, fuJ(p.f), F),
    jt = (F.tags || {})[p.f] || (fuJ(p.f) || {}).jt || '',
    isCover = cover && cover.f === p.f;
  return `<figure class="adm-tile${st.num ? ' is-feat' : ''}${isCover ? ' is-cover' : ''}" data-f="${esc(p.f)}" data-sid="${esc(sid)}">
    <button type="button" class="adm-ph" data-fu="zoom" aria-label="Enlarge">${p.src ? `<img ${crSrc(fuP(p), 1)} alt="" loading="lazy" draggable="false">` : ''}</button><button type="button" class="adm-x" data-fu="exclude" title="Exclude" aria-label="Exclude for good">×</button>
    ${st.num ? `<span class="adm-num">${st.num}</span>` : ''}
    ${isCover ? '<span class="adm-covermark">Cover</span>' : ''}
    <figcaption><span class="adm-src o-${o}">${esc((ASUBJ.admin.origins.find(y => y[0] === o) || [, o])[2])}</span>${x && x.d.kind === 'a' && !x.d.check && !x.d.undone ? '<span class="adm-src adm-autot" title="Auto-sort">auto</span>' : ''}${ease ? `<span class="adm-src adm-fease" title="Ease 1-5 (5 very easy)">ease ${ease}</span>` : ''}${ph ? `<span class="adm-src view">${esc(ph)}</span>` : ''}${p.rep || jt.slice(7).includes('r') ? '<span class="adm-src view" title="Reference photo">reference</span>' : ''}<span class="adm-t">${fuTags(jt)}</span></figcaption>
    <div class="adm-acts"><button type="button" data-fu="feat" aria-pressed="${!!st.num}" title="Feature">Feature</button><button type="button" data-fu="cover" aria-pressed="${!!(isCover && picked)}" title="Cover">★ Cover</button><button type="button" data-fu="remove" title="Remove">Remove</button><button type="button" data-fu="not" title="Not this species">Not this</button></div></figure>`;
}
// The wink's surprise card as players meet it (quiz.js winkShow): its photo, "Which family?", its name among the three
// absurd choices (the right one marked), and both feedback lines.
const fuWink = (u, cover) =>
  `<section class="adm-row adm-wink"><h3>Wink <small>a surprise card, never counted</small></h3><div class="adm-winkc">${cover && cover.src ? `<img ${crSrc(fuP(cover), 1)} alt="">` : '<span class="none"></span>'}<div><p class="adm-winkq">Which ${esc(ASUBJ.one)}? <span class="adm-src">Surprise</span></p><div class="adm-winka">${[[u.id, u.name], ...(u.wink.choices || [])].map(([id, l]) => `<span class="${id === u.id ? 'ok' : ''}">${esc(l)}</span>`).join('')}</div>${u.wink.right ? `<p><b>✓</b> ${esc(u.wink.right)}</p>` : ''}${u.wink.wrong ? `<p><b>✗</b> ${esc(u.wink.wrong)}</p>` : ''}</div></div></section>`;
function renderFishUnits(id) {
  if (!FISHC) {
    status();
    $v.innerHTML = '<p class="note">Loading…</p>';
    fishLoad().then(() => under(cur, FAMS) && render());
    return;
  }
  const U = FISHC.units;
  status();
  if (!U.length) {
    $v.innerHTML = '<p class="note">No families in fish.json yet.</p>';
    return;
  }
  const u = U.find(x => x.id === id) || U[0];
  const D = fuData(),
    E = Object.fromEntries(U.map(x => [x.id, fuFam(x, D)])),
    e = E[u.id],
    F = D.F,
    S0 = SAVED.fish || {},
    XI = fishIdx(F),
    imrOn = FU_IMR === 'imr',
    L = U.filter(x => !imrOn || x.imr || x.imrWith || x.id === u.id);
  $('preview').href = './?draft';
  // The list: by key group (a small heading for each), English name first, the scientific names below.
  let lastG;
  const side = L.map(x => {
    const c = E[x.id].cover,
      dirty = !same((F.genera || {})[x.id], (S0.genera || {})[x.id]) || x.species.some(s => D.dirty.has(s)),
      nd = E[x.id].needs,
      gh =
        x.group !== lastG
          ? `<p class="adm-fgrp">${x.group == null ? 'No key group' : `${x.group} · ${esc(FISHC.groups[x.group] || '')}`}</p>`
          : '';
    lastG = x.group;
    return `${gh}<a href="${esc(fuHref(x.id))}" class="adm-g${x.id === u.id ? ' cur' : ''}"${x.id === u.id ? ' aria-current="true"' : ''}>${c && c.src ? `<img ${crSrc(fuP(c), 1)} alt="" loading="lazy">` : '<span class="none"></span>'}<span>${esc(x.name)} ${fuImr(x)}
      <small><i>${esc(x.sci.join(', '))}</i> · ${x.wink ? 'wink' : `circle ${x.circle}`} · ${E[x.id].n} sp.${nd.length ? ` · <b class="warnc" title="${esc(nd.join(' · '))}">${esc(nd[0])}</b>` : ''}</small></span><span class="dots">${E[x.id].k.ok ? (nd.length ? '<b class="dot warn" title="Validated, incomplete">!</b>' : '<b class="dot done" title="Validated">✓</b>') : ''}${dirty ? '<b class="dot" title="Draft not published yet">●</b>' : ''}</span></a>`;
  }).join('');
  const cnt = o => e.all.filter(p => origin(p) === o).length,
    cv = e.cover,
    sp = FISHC.species;
  // One block per genus, one section per species inside it.
  const body = u.genera
    .map(g => {
      const S = g.species.filter(s => e.rows[s]);
      if (!S.length) return '';
      return `<section class="adm-fgen" data-gen="${esc(g.id)}"><h3 class="adm-fgenh"><i>${esc(g.name)}</i> ${fuImr(g)} <small>${S.length} species</small></h3>${S.map(
        sid => {
          const {feat, rest} = e.rows[sid],
            s = sp[sid],
            n = feat.length + rest.length,
            obs = new Set([...feat, ...rest].map(p => p.o || p.f)).size,
            tg = fishTarget(s),
            out = [...feat, ...rest].filter(p => !shown(p)).length,
            nc = (FISHC.cand[sid] || []).length;
          return `<section class="adm-row" data-sid="${esc(sid)}"><h3>${esc(s.common || s.name)} <small><i>${esc(s.name)}</i> · <b class="${obs < tg ? 'warnc' : ''}" title="Observations in play / target">${obs}/${tg}</b> · ${n} photo${n === 1 ? '' : 's'}${out ? ` · <b>${out} filtered out</b>` : ''}</small></h3>
      <div class="adm-grid">${feat.map((p, i) => (shown(p) ? fuTile(sid, p, {num: i + 1}, cv, e.k.cover, F, XI) : '')).join('')}${rest
        .filter(shown)
        .map(p => fuTile(sid, p, {}, cv, e.k.cover, F, XI))
        .join(
          ''
        )}</div>${n ? '' : `<p class="note">No photo in play${nc ? ` · ${nc} candidate${nc === 1 ? '' : 's'}` : ''}.</p>`}</section>`;
        }
      ).join('')}</section>`;
    })
    .join('');
  // Photos of its species sent elsewhere with Not this (his click only), with Put back.
  const G = D.gone.filter(p => u.species.includes(p.sid)),
    outRow = G.length
      ? `<section class="adm-row adm-out"><h3>Not this species <small>${G.length} photo${G.length > 1 ? 's' : ''}</small></h3>
    <div class="adm-grid">${G.map(
      p => `<figure class="adm-tile is-hidden" data-f="${esc(p.f)}" data-sid="${esc(p.sid)}"><button type="button" class="adm-ph" data-fu="zoom" aria-label="Enlarge">${p.src ? `<img ${crSrc(fuP(p), 1)} alt="" loading="lazy">` : ''}</button>
      <figcaption><span class="adm-t"><i>${esc(fuName(p.sid))}</i> → ${p.to === 'x' ? 'no game species' : `<i>${esc(fuName(p.to))}</i>`}</span></figcaption>
      <div class="adm-acts"><button type="button" data-fu="back">Put back</button></div></figure>`
    ).join('')}</div></section>`
      : '';
  // The two family selects list the families the All | IMR filter shows (the phone has only the bar's; Codex review #655).
  const opts = L.map(
    x => `<option value="${esc(x.id)}"${x.id === u.id ? ' selected' : ''}>${esc(x.name)}${x.imr || x.imrWith ? ' · IMR' : ''}</option>`
  ).join('');
  // All | IMR in the sticky bar, at every width (the side list is hidden on phones).
  const imrSeg = `<span class="adm-qseg adm-lvseg adm-fimr" role="group" aria-label="Families shown">${[
    ['all', 'All'],
    ['imr', 'IMR']
  ]
    .map(([k, t]) => `<button type="button" data-fuimr="${k}" aria-pressed="${FU_IMR === k}">${t}</button>`)
    .join('')}</span>`;
  const filter = `<div class="adm-filter adm-sticky">${cv && cv.src ? `<button type="button" class="adm-sthumb" data-f="${esc(cv.f)}" data-sid="${esc(cv.sid)}" data-fu="zoom" title="Cover"><img ${crSrc(fuP(cv), 1)} alt="${esc(u.name)} cover"></button>` : ''}<b class="adm-sname">${esc(u.name)} ${fuImr(u)}<small><i>${esc(u.sci.join(', '))}</i></small></b><select class="adm-gsel2" aria-label="${cap1(ASUBJ.one)}">${opts}</select>${imrSeg}<button type="button" class="adm-okbtn" data-ok aria-pressed="${!!e.k.ok}" title="Validated">✓ Validated</button>${e.needs.length ? `<b class="warnc adm-needs">${e.needs.map(esc).join(' · ')}</b>` : ''}${FB.origins({cnt})}</div>`;
  $v.innerHTML = `<div class="adm">
    <nav class="adm-side" aria-label="${cap1(ASUBJ.many)}"><select id="gsel" aria-label="${cap1(ASUBJ.one)}">${opts}</select><div class="adm-list">${side}</div></nav>
    <section class="adm-main">${filter}${u.wink ? fuWink(u, cv) : ''}${body}${outRow}</section></div>`;
  bindBar($v, {redraw: render});
  const fx = fn => {
    DRAFT.fish = fn(DRAFT.fish || {});
    saveDraft();
    render();
  };
  [$('gsel'), $v.querySelector('.adm-gsel2')].forEach(el => el && (el.onchange = ev => (location.hash = fuHref(ev.target.value))));
  $v.querySelectorAll('[data-fuimr]').forEach(
    b =>
      (b.onclick = () => {
        FU_IMR = b.dataset.fuimr;
        store.set('reefid-admin-fu-imr', FU_IMR);
        render();
      })
  );
  const okb = $v.querySelector('[data-ok]');
  if (okb)
    okb.onclick = () => {
      if (!e.k.ok && e.needs.length) return toast('Not ready: ' + e.needs.join(' · '));
      fx(F => fishOk(F, u.id));
    };
  // Every photo of the family in the page's order, for the enlarged photo's ‹ ›.
  const Z = [...e.all, ...G].map(fuP);
  $v.querySelectorAll('[data-fu]').forEach(el => {
    const a = el.dataset.fu,
      tl = el.closest('[data-f]'),
      f = tl && tl.dataset.f,
      sid = tl && tl.dataset.sid;
    if (!f) return;
    el.onclick = ev => {
      ev.stopPropagation();
      if (a === 'zoom') {
        const i = Z.findIndex(p => p.f === f);
        return zoomSet(Z, Math.max(0, i), p => lbCap(fuName(p.sid), p, (sp[p.sid] || {}).common || ''));
      }
      if (a === 'feat') {
        const r = fishFeat(DRAFT.fish, u.id, sid, f);
        if (r.full) return toast(`Already ${FISHFEAT} featured: remove one first.`);
        return fx(() => r.F);
      }
      if (a === 'cover') return fx(F => fishCover(F, u.id, f));
      if (a === 'remove') {
        fx(F => fishReject(fishDrop(F, u.id, f), f));
        return toast('Removed from play. Undo (Ctrl+Z) brings it back.');
      }
      if (a === 'exclude') {
        fx(F => fishExclude(fishDrop(F, u.id, f), f));
        return toast('Excluded. Undo (Ctrl+Z) brings it back.');
      }
      if (a === 'back') return fx(F => fishNotThis(F, f, sid, sid));
      if (a === 'not') {
        // The species to send it to, drawn on demand (a family may have 60 species and hundreds of photos).
        const others = u.species.filter(x => x !== sid && sp[x] && !sp[x].out);
        el.outerHTML = `<select data-funot aria-label="Not this species"><option value="">Not this</option><option value="x">No game species</option>${others.length ? `<optgroup label="${esc(u.name)}">${others.map(x => `<option value="${esc(x)}">${esc(fuName(x))}</option>`).join('')}</optgroup>` : ''}</select>`;
        const sel = tl.querySelector('[data-funot]');
        sel.focus();
        sel.onchange = () => {
          if (!sel.value) return;
          const to = sel.value;
          fx(F => fishNotThis(fishDrop(F, u.id, f), f, to, sid));
          toast(
            to === 'x' ? 'Not this: no game species. Undo (Ctrl+Z) brings it back.' : `Not this: sent to ${fuName(to)} as its candidate.`
          );
        };
      }
    };
  });
  const c = $v.querySelector('.adm-g.cur');
  if (c) c.scrollIntoView({block: 'nearest'});
}
function render() {
  ptFlush(); // a note being typed on a point's page reaches the draft before the page is drawn again
  ptFlush = () => {};
  memoFresh();
  document.body.classList.toggle('adm-cmode', cur === 'photos/candidates');
  // A page the subject on screen does not have yet (admin plan: its fish version comes in a later PR).
  if (!hasPage(ASUBJ, cur)) {
    status();
    $v.innerHTML = `<p class="note">Not for ${esc(ASUBJ.name.toLowerCase())} yet.</p>`;
    return;
  }
  if (cur === 'photos/review/quality') return renderQuality();
  if (cur === 'photos/review/growth-form') return renderForm();
  if (cur === 'photos/genera/excluded') return renderExcluded();
  if (cur === 'photos/genera/hidden') return renderHidden();
  if (cur === 'inbox/todo/all' || cur === 'inbox/todo/reports') return renderTriage();
  if (cur === 'inbox/todo/errors') return renderEvents();
  if (cur === 'inbox/todo/health') return renderStats();
  if (cur === 'inbox/todo/points') return renderPoints();
  if (cur.startsWith(POINT_R)) return renderPoint(cur.slice(POINT_R.length));
  // Game coverage with the Where to look banner above it (folded, open in full with ?look=all: lookAll).
  if (cur === 'inbox/coverage/games') return renderCov();
  if (cur === 'inbox/coverage/sheets-id-key') return renderKcov();
  if (cur === 'players/list') return renderUsers(); // its own tab: managing players, not only stats (Pierre, 2026-11-01)
  if (cur.startsWith('players/list/journey/')) return renderJourney(cur.slice('players/list/journey/'.length)); // one player's path (admin-journey.js)
  if (anPage(cur)) return typeof renderAnalyses === 'function' ? renderAnalyses() : ($v.innerHTML = '<p class="note">Loading…</p>'); // the Analyses group (admin-analyses.js)
  // A device that never signed in, by anonymous id (its own route: a player's name may start with any character).
  if (cur.startsWith('players/list/anon/')) return renderJourney('', cur.slice('players/list/anon/'.length));
  if (cur === 'photos/review/by-difficulty') return renderDiff();
  if (cur === 'photos/stats/overview') return renderPstats();
  if (modeKey() === 'stats') return renderStats();
  if (cur === 'photos/look-alikes') return renderMont();
  if (cur === 'photos/candidates') return renderCand();
  if (under(cur, FAMS)) return renderFishUnits(cur.slice(FAMS.length + 1));
  const names = Object.keys(DATA.gen);
  // A genus page (Photos › Genera › Live): the genus is the address's last segment; none or an unknown one, the first.
  const gn = cur.slice(LIVE.length + 1);
  const ch = changed(),
    n = DATA.gen[gn] ? gn : names[0],
    g = DATA.gen[n],
    cv = coverOf(n),
    k = entry(n);
  SHOWN_COVER = cv && cv.f;
  status();
  $('preview').href = `./?draft#${routeOut('g-' + n)}`;
  const side = names
    .map(m => {
      const c = coverOf(m),
        e = DRAFT.genera[m] || {},
        dirty = ch.includes(m),
        h = (e.hide || []).length;
      return `<a href="${esc(genusHref(m))}" class="adm-g${m === n ? ' cur' : ''}"${m === n ? ' aria-current="true"' : ''}>${c ? `<img src="${img(c, 1)}" alt="" loading="lazy">` : '<span class="none"></span>'}<span><i>${esc(m)}</i>
      <small>${DATA.gen[m].n ? 'No. ' + DATA.gen[m].n : DATA.gen[m].x ? 'not IMR' : '★'}${c && c.view === 'macro' && lv(m) !== 2 ? ' · <b class="warnc" title="Cover is a close-up">macro cover</b>' : ''}${pending(m).length ? ` · ${pending(m).length} waiting` : ''}${missing(m).length ? ' · <b class="warnc" title="Missing photos">⚠ check</b>' : ''}</small></span><span class="dots">${e.ok ? (needs(m).length ? '<b class="dot warn" title="Validated, incomplete">!</b>' : '<b class="dot done" title="Validated">✓</b>') : ''}${dirty ? '<b class="dot" title="Draft not published yet">●</b>' : ''}</span></a>`;
    })
    .join('');
  const R = rows(n),
    gv = R.some(([v]) => v === GVIEW) ? GVIEW : 'all',
    one = gv !== 'all';
  const body = R.filter(([v]) => !one || v === gv)
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
  // One view shown: Candidates and Not this genus are not per view, so they hide too, with one line saying what is hidden.
  const hidRow = one
    ? (L =>
        L.length
          ? `<p class="note adm-gvnote">Hidden: ${L.join(' · ')} <button type="button" class="adm-link" data-gv="all">All views</button></p>`
          : '')(
        [
          [P.length, 'candidate', 'candidates'],
          [O.length, 'not this genus', 'not this genus']
        ]
          .filter(x => x[0])
          .map(([c, a, b]) => `${c} ${c === 1 ? a : b}`)
      )
    : '';
  const gvSeg = FB.views({key: 'gv', cur: gv, items: [['all', 'All'], ...R.map(([v]) => [v, label(n, v)])], seg: true});
  const filter = `<div class="adm-filter adm-sticky">${cv ? `<button type="button" class="adm-sthumb${cv.view === 'macro' && lv(n) !== 2 ? ' warnc' : ''}" data-f="${esc(cv.f)}" data-act="zoomcover" title="Cover"><img src="${img(cv, 1)}" alt="${esc(n)} cover"></button>` : ''}<b class="adm-sname"><i>${esc(n)}</i></b><select class="adm-gsel2" aria-label="Genus">${names.map(m => `<option${m === n ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select><a class="adm-sheet" href="./?draft#${routeOut('g-' + n)}" target="_blank" rel="noopener" title="Genus sheet" aria-label="Open the sheet">↗</a><span class="adm-qseg adm-lvseg" role="group" aria-label="Zooms" title="Zooms">${[3, 2].map(x => `<button type="button" data-lv="${x}" aria-pressed="${lv(n) === x}">${x} zooms</button>`).join('')}</span>${(nd => `<button type="button" class="adm-okbtn" data-ok aria-pressed="${!!k.ok}" title="Validated">✓ Validated</button>${nd.length ? `<b class="warnc adm-needs">${nd.map(esc).join(' · ')}</b>` : ''}${poorIn(n).length ? `<b class="adm-needs adm-warn">${poorIn(n).map(esc).join(' · ')}</b>` : ''}`)(needs(n))}${gvSeg}${FB.origins({cnt})}</div>`;
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
      ${filter}${hidRow}${body}${one ? '' : candRow + outRow}
    </section></div>`;
  bindBar($v, {redraw: render});
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
    location.hash = genusHref(e.target.value);
  };
  const g2 = $v.querySelector('.adm-gsel2');
  if (g2)
    g2.onchange = e => {
      location.hash = genusHref(e.target.value);
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
// is, the iNat taxon, its credit and its source, as in the games (app.js photoSrc / credit, rule P5). An iNat
// photo links to its observation (Pierre, 2026-11-03: he opened his own photo that everyone misses, to check on iNaturalist
// who identified it, and the caption had no link); IMR lecture and Coral Finder book photos have no public page: their
// credit line only.
const inatObs = p => /^https:\/\/(www\.)?inaturalist\.org\/observations\//.test(p.o || '');
const lbCap = (n, p, what) =>
  `${DATA.gen[n] ? `<a href="./?draft#${routeOut('g-' + n)}" target="_blank" rel="noopener" title="Genus sheet"><i>${esc(n)}</i></a>` : `<i>${esc(n || '')}</i>`}${what ? ` · ${esc(what)}` : ''} · ${
    p.cf
      ? `© R. Kelley / BYOGUIDES, Coral Finder 2022, p. ${esc(p.pg)}`
      : p.imr
        ? `IMR Lecture 6, slide ${esc(p.slide)}`
        : `${inatObs(p) && p.t ? `<i>${esc(p.t)}</i> · ` : ''}${esc(p.a || '')}`
  }${inatObs(p) ? ` · <a class="lb-src" href="${esc(p.o)}" target="_blank" rel="noopener" title="Open the iNaturalist observation">iNat observation ↗</a>` : ''} · <code>${esc(p.f)}</code>`;
function zoom(n, f) {
  const L = [...photos(n), ...pending(n).map(p => ({...p, base: 'cand'})), ...outOf(n).map(p => ({...p, base: 'out'}))];
  zoomSet(
    L,
    L.findIndex(p => p.f === f),
    p => lbCap(n, p, p.base === 'cand' ? 'Candidate' : p.base === 'out' ? 'Not this genus' : label(n, viewOf(n, p)))
  );
}
// The enlarged photo stepping through a list (‹ ›, the arrow keys): a genus's photos (zoom) or a point's (renderPoint),
// each with the caption cap(p, i) gives it.
function zoomSet(L, i0, cap) {
  const lb = $('lightbox');
  let i = Math.max(0, i0);
  const show = () => {
    const p = L[i];
    lb.innerHTML = `<div class="lb-in"><img ${crSrc(p)} alt=""><p class="lb-cap">${cap(p, i)}</p>
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
    <figcaption><a class="adm-gen" href="${esc(genusHref(p.genus))}" title="Open the genus"><i>${esc(p.genus)}</i></a><span class="adm-src view">${vl(p.view)}</span>${srcTag(p)}${p.hid ? '<span class="adm-src multi">hidden</span>' : ''}${p.multi ? '<span class="adm-src multi" title="Several corals in frame">several</span>' : ''}${qTag(p)}</figcaption>
    <div class="adm-acts">${qSeg(p)}</div></figure>`;
  const sec = ([q, t]) => {
    const L = all.filter(p => qOf(p.f) === q);
    return `<section class="adm-row adm-qrow"><h3><span class="adm-q q${q}">${t}</span> <small>${L.length} photo${L.length === 1 ? '' : 's'}${q === 3 ? ' · for covers and featured photos' : q === 1 ? ' · for a realistic mode' : ''}</small></h3>
      <div class="adm-grid adm-qgrid" data-qdrop="${q}">${L.map(card).join('')}</div></section>`;
  };
  $v.innerHTML = `<section class="adm-quality">
    <div class="adm-qhead"><h2>Photo quality</h2></div>
    ${FB.origins()}
    <div class="adm-filter"><span class="label">View</span>${FB.views({key: 'qv', cur: QF.view, items: FB.viewItems()})}
      ${FB.unit({id: 'qgen', cur: QF.genus, names})}
      ${FB.check('qtodo', QF.todo, 'Not checked yet')}</div>
    ${QUAL.map(sec).join('')}</section>`;
  bindBar($v, {redraw: renderQuality, f: QF, k: 'reefid-admin-qfilter', view: 'qv', unit: 'qgen', checks: {qtodo: 'todo'}});
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
    if (cur !== 'photos/review/quality' || !over || e.target.closest('input,select,textarea')) return;
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

// everyone: begin
// Thresholds of Health and Stops (statsHealth), here because their help texts quote them.
const HEALTH = {
  GAP: 30, // minutes between two answers that start a new session
  EARLY: 10, // a session of at most this many answers ended early
  PH_MIN: 5, // answers before a photo is judged (its answers in the log; its rated answers for the difficulty)
  PH_LOW: 0.4, // right share (every answer that showed it) under which a photo is one everyone misses
  PH_FAR: 1, // difficulty this far above its genus median (1 = clearly harder)
  PL_MIN: 3, // distinct players who answered a photo before it can be one everyone misses
  PL_MISS: 2, // ... of whom at least this many, and a majority, miss it
  PL_LOW: 0.5, // a player misses a photo when under this share of their answers on it are right
  G_MIN: 10, // answers on a genus before a player counts as stuck on it
  G_LOW: 0.5 // right rate over a player's last G_MIN answers on a genus under which they are stuck
};
// "Photos everyone misses" counts players, not answers (Pierre, 2026-11-05: one player who misses the same photo six
// times, or a new photo only one player answered, is not "everyone"). One rule for Health, To do's Health line, the
// session summary's "hard for everyone" (healthBad) and the demo data built for it (admin-demo.js).
// photoAnswers: the answer log per photo (rows [id, time, genus, answered, right, mode, photos...]; each answer counts once
// for every photo it showed; known(f) keeps the photos the admin knows): {f: {n, ok, by: {player id: [answers, right]}}}.
function photoAnswers(R, known) {
  const PH = Object.create(null);
  R.forEach(r =>
    new Set(
      String(r[6] || '')
        .split(' ')
        .filter(Boolean)
    ).forEach(f => {
      if (known && !known(f)) return;
      const o = (PH[f] = PH[f] || {n: 0, ok: 0, by: Object.create(null)}),
        b = (o.by[r[0]] = o.by[r[0]] || [0, 0]);
      o.n++;
      o.ok += r[4];
      b[0]++;
      b[1] += r[4];
    })
  );
  return PH;
}
// Players who answered a photo, and those who miss it (under PL_LOW of their answers on it right).
const missedBy = o => {
  const P = Object.values(o.by);
  return {pl: P.length, miss: P.filter(([n, ok]) => ok / n < HEALTH.PL_LOW).length};
};
// Missed by many players: PL_MIN players or more answered it, PL_MISS or more of them, and a majority, miss it.
const manyMiss = o => {
  const {pl, miss} = missedBy(o);
  return pl >= HEALTH.PL_MIN && miss >= HEALTH.PL_MISS && 2 * miss > pl;
};
// A photo everyone misses by its answers: missed by many players, PH_MIN answers or more (on the real log, 2026-11-05,
// photos answered once by each of 3 players, 2 wrong, came in: at the game's ~80% target that happens by chance), and
// under PH_LOW right over all of them.
const everyoneMisses = o => manyMiss(o) && o.n >= HEALTH.PH_MIN && o.ok / o.n < HEALTH.PH_LOW;
// everyone: end
// Sessions, one definition for Stops, a player's Journey and Activity's Recent sessions: one player's answers, oldest
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

// recognised: begin
// Difficulty in words, one helper and one colour scale for the whole admin (Pierre, 2026-11-05, Q19 and Q26: "+1.44"
// read as good; "+ reads as good"). A photo's difficulty d (photo Elo) reads as the share of starting players (level 0,
// Elo 1000) who really recognise it, without guessing: σ(0 − d) = 1 / (1 + e^d), the part of the model that does not
// depend on the question's format (core.js: p = 1/k + (1 − 1/k)·σ(θ − d); the guess floor 1/k is left out on purpose).
// d = 0 → 50%, +1.44 → 19%, −1 → 73%. A genus (any grouping) reads the same for a typical photo of it (its offset).
// Five bands on the whole % shown (so the colour never disagrees with the number): REC [floor, class, word], tokens
// --rec-<class> / --rec-<class>-ink in app.css (light, dark, colour-blind). The raw value stays in the title (a tap
// on a touch screen shows it: recTap). Players read as an Elo (1000 + 200 × level, the scale players see), ± its margin.
const recognised = d => 1 / (1 + Math.exp(d)),
  recOf = d => Math.round(100 * recognised(d)),
  recPct = d => recOf(d) + '%',
  REC = [
    [75, 'veasy', 'very easy'],
    [60, 'easy', 'easy'],
    [40, 'mid', 'middle'],
    [25, 'hard', 'hard'],
    [-Infinity, 'vhard', 'very hard']
  ],
  recBand = d => REC.find(b => recOf(d) >= b[0]),
  // A raw value as the title shows it: +1.44, −0.80, 0.00.
  rawNum = d => (d > 0.004 ? '+' : d < -0.004 ? '−' : '') + Math.abs(d).toFixed(2),
  recQ = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'),
  // The badge: "recognised by 19%" (o.short: "19%", where a column, a card or the words beside it say what it is: on a
  // narrow tile "recognised by" + the "19%" pill, so the pill never overflows), its band's colour,
  // the raw value in its title. o.of: what is recognised ("it", "a typical photo of the genus"); o.raw: the raw value's
  // name; o.more: more raw context for the title. No value: '–' (o.none).
  recBadge = (d, o = {}) => {
    if (d == null || !isFinite(d)) return o.none ?? '–';
    const [, k, w] = recBand(d),
      t = `Starting players who recognise ${o.of || 'it'} without guessing: ${recPct(d)} (${w}) · ${o.raw || 'difficulty'} ${rawNum(d)} (+ = harder)${o.more ? ' · ' + o.more : ''}`;
    return `<span class="adm-rec rec-${k}" data-d="${d.toFixed(2)}" title="${recQ(t)}">${o.short ? '' : 'recognised by '}${recPct(d)}</span>`;
  },
  // The scale under a chart's difficulty axis (d from a on the left to b on the right): one segment per band, in its
  // colour. recCut(f): the difficulty past which the whole % shown drops under the floor f.
  recCut = f => Math.log(100 / (f - 0.5) - 1),
  recScale = (a, b, cls = '') => {
    const cut = [-Infinity, ...REC.slice(0, -1).map(([f]) => recCut(f)), Infinity];
    return `<span class="adm-recscale${cls ? ' ' + cls : ''}">${REC.map(([, k, w], i) => {
      const l = Math.max(a, cut[i]),
        r = Math.min(b, cut[i + 1]);
      return r > l ? `<i class="rec-${k}" style="width:${((100 * (r - l)) / (b - a)).toFixed(2)}%" title="${w}"></i>` : '';
    }).join('')}</span>`;
  },
  // A player's level lv on the players' Elo scale (1000 + 200 × lv), with its 95% margin m (on the level scale) when known.
  eloNum = lv => Math.round(1000 + 200 * lv),
  eloMargin = m => (m != null && isFinite(m) ? Math.round((200 * m) / 10) * 10 : null),
  eloText = (lv, m, o = {}) => {
    if (lv == null || !isFinite(lv)) return '–';
    const e = eloMargin(m),
      t = `${o.what || 'Elo'} ${eloNum(lv)}${e != null ? ` ± ${e} (95% margin)` : ''} · level ${rawNum(lv)} (Elo = 1000 + 200 × level)`;
    return `<span class="adm-elo" title="${recQ(t)}">${eloNum(lv)}${e != null && !o.bare ? ` <small>±${e}</small>` : ''}</span>`;
  };
// recognised: end
// The method behind every difficulty reading, shown in the "?" of each page that has one.
const REC_HELP = `<p><b>Difficulty in words</b> (Pierre, 2026-11-05). A photo reads as <b>recognised by N%</b>: the share of starting players (level 0, Elo 1000) who recognise it without guessing, 1 / (1 + e<sup>d</sup>) for its difficulty d on the photo Elo scale (0 → 50%, +1 → 27%, −1 → 73%; + = harder). The lucky guess a question's choices allow (1 in 4 with four choices) is left out on purpose: it depends on the question, not the photo. A genus reads the same, for a typical photo of it (its difficulty offset). A higher % is an easier photo, and sorting follows it. Colours, one scale for the whole admin: ${REC.map(([f, k, w], i) => `<span class="adm-rec rec-${k}">${i ? (f === -Infinity ? 'under ' + REC[i - 1][0] : f + '-' + REC[i - 1][0]) : '≥' + f}%</span> ${w}`).join(', ')} (colour-blind mode: dark blue, light blue, grey, light orange, dark orange); the number always says it, the colour only helps. Hover a reading (tap it on a phone) for the raw value. A player reads as their <b>Elo</b>, the score players see: 1000 + 200 × their level (on the same scale as photo difficulty), ± its 95% margin; hover it for the level. "vs expected" (points above or below the chance the game expected) keeps its sign: + = better than expected.</p>`;
/* ---------- Help ("?" in the header): the explanations, kept off the pages ---------- */
const HELP = {
  // A getter: JOURNEY is in admin-journey.js, loaded after this file.
  get journey() {
    return `<p>One player's path, from their answers in the sheet (signed in), <b>in one subject</b>: the Corals | Fish at the top shows how many answers they gave in each and opens the other (the header switch keeps the player too); from the list of players it opens on the subject they played last. A subject whose progress the admin does not replay yet shows what its answers say: no progress, cards, learned units, Elo or sheets opened. <b>Quiz right</b> and <b>Last 50</b> count the Quiz only (the Custom quiz and the look-alike duels slipped into them included); <b>Duels</b> = answers in the Duel tab (2 choices, often on one chosen pair), apart so a burst of them does not read as the player's level. <b>Progress</b>: their right answers over the last ${JOURNEY.WIN} (solid) against the chance the game expected of them (dashed: from the photo's difficulty and their level on the genus at that moment); above the dashed line, they do better than the game thought. <b>Progress</b> and <b>Learned</b> (numbers and the Genera table's Progress column): replayed from every answer in the log with the current rules, as on Players; ↻ saved = what their saved copy still says. Below: the genera met, one dot per genus at its first question (hover a dot for the genus and the time); a vertical line marks a new day, a dashed orange one when they opened all the genera at once. The green curve counts the genera learned (mastery exam passed, still held), each at the answer that passed its mastery exam (★: its last right exam question); genera learned before exam questions were logged (2 Nov 2026) have no such answer and are not on it (the legend says how many). <b>Cards</b> (from their saved progress, read with this page's token): their answer to the first-launch question (new to corals, IMR coral course, know corals well; from 3 Nov 2026), after which answer and how (in the welcome tour, on the card before the quiz, from the fallback card, or <b>inferred</b> from their level for a player who already had 50 answers or more and was never asked), each change, and the fallback cards shown; the first cards and when, how many single cards, and whether they opened all the genera at once (after which answer, when, and from where: the first cards, My progress or the offer card) or declined the offer; times are kept from 2 Nov 2026 (before, the time of that answer). <b>Easiest / Hardest for them</b>: genera with ${JOURNEY.MIN} answers or more, ranked by <b>vs expected</b> (right answers minus the expected chance, in points): +20 pts = 20 more right answers in 100 than expected. Raw right rates mislead because the game hands harder photos to whoever does well. <b>Mix-ups</b>: genus shown → genus answered. <b>Genera</b>: every genus they were asked, in the order met; Card = when its card showed (first cards, opened all, or after which answer; hover for how many questions later it was asked), First asked = answer number and date of its first question, or sorted by ease or by answers; Last 10 = their last 10 answers on it, oldest first; Answered instead = their most frequent wrong answers. <b>When they played</b>: one row a day, from their first day to their last (days without an answer included), one cell an hour, in this device's time zone; the darker, the more answers that hour, relative to their busiest hour (hover for the answers and the right share); the total of the day on the right. A session = answers less than ${HEALTH.GAP} minutes apart. <b>Median time</b> and <b>Enlarged</b> (answers from sheet v23 on): median seconds from the photos in view to the answer, and the share of answers where they enlarged a photo first; logged to see later whether they tell a hard photo, not used by the game.</p><p><b>Genus sheets opened</b> (sheet v30): the sheets they opened, from the summary each visit sends under their anonymous id: times, time spent, whether the first opening came before or after the genus was first asked to them, and from where (the quiz feedback, a Learn page, My progress, other); then the pages they spent most time on.</p>`;
  },
  events: `<p>What the players' devices report by themselves, without a name (sheet v19, a random id per device): app errors (with where in the code and on which page), photos that still did not load after their retries, saves that failed while online, and the answers to the one-tap questions, with the player's level and their right rate when they answered. Grouped, the most devices first: a photo that fails on many devices may be missing or broken, on one device only it is most likely its connection. <b>Saves that failed</b> (app from 5 Nov 2026): a save that fails is tried again by itself (5 s, 10 s, 20 s… apart, while the app is in view); <b>save failed</b> = it still failed after 3 tries and a minute, so the player saw "Not saved"; <b>save recovered</b> = it failed, then came through on a retry (the player saw nothing). <b>Last try</b>: the step (load = the pull before the send, save = the send), the HTTP status if the sheet answered (none: no reply reached the app), its seconds, the tries, the seconds since the first failure, and the tries cut by the app going to the background. <b>Old app versions</b>: a request with no app version (an app from before 3 Nov 2026), or a device on a replaced version (sheet v50: its page stayed open 30 min on a version replaced an hour before, or it started one replaced a day before), with its device id (match it to a player in Pages) and its version. <b>One-tap questions</b>: a "Quick question" block before Next, after an answer in the photo quiz (custom quiz too) and duels, after 35 answers, then every 40 (80 after a "Not now"), never early in a session (only once the player's current session has 15 answers or more and has lasted 5 minutes or more, a session = answers less than ${HEALTH.GAP} minutes apart, as on Activity; one due sooner waits for that, so none opens a session), one of ${PULSEQ.length} questions in turn, never the same twice in a row: ${PULSEQ.map(x => `"${esc(x.q)}" (${x.a.map(a => esc(a[1])).join(' · ')})`).join(', ')}. The first table puts every answer on two scales: <b>Difficulty</b> (−1 too easy, 0 right, +1 too hard: the difficulty questions, "Frustrating?" towards hard, "Getting boring?" towards easy) and <b>Feel</b> (−1 bad, +1 good: fun, frustration, boredom), averaged by player level band (their overall level when they answered) and by mode; the small number is how many answers. Compare the bands: the target that depends on the level is right when every band sits near 0 on Difficulty. <b>Shown</b> and <b>Answered</b> (% of shown): each prompt logs its showing, so the response rate is known; prompts from before 3 Nov 2026 did not and are left out of it. The second table counts each question's answers by band and mode (% of that column's answers), then its <b>Not now</b> (×), <b>No answer</b> (shown − answered − Not now: Next or another page without a tap, or the app closed) and <b>Shown</b> with the % answered. <b>Did you know? tips</b>: a card at Next for a player who seems not to know a feature (so far: enlarging a photo, for players with at most 2 photos enlarged in 20 questions or more; twice at most; at most one a session, never in its first 10 answers), logged with the one-tap questions but counted apart: per tip, the devices it showed on, <b>Shown</b>, <b>Show me</b> (they tried it), <b>Got it</b> (or Escape) and <b>Left</b> (another page opened with it up); shown − the rest = the app closed with it up. Last 30 days. Nothing here changes the app by itself.</p>`,
  // "Start here" (Pierre, 2026-11-01, admin review rec. 1): the workflow for anyone new to the admin, one tab of the help.
  start: `<p><b>Four groups</b>. <b>Inbox</b>: <b>To do</b> (All, Reports, Errors, Health, Points: players' reports, your flags, the errors their devices send, the photos and genera that need a look, the points to settle) and <b>Coverage</b> (Games, Sheets & ID Key: where photos are missing, with Where to look above the Games grid). <b>Photos</b>: <b>Genera</b> (Live, Hidden, Excluded), <b>Candidates</b>, <b>Photo review</b> (Quality, Growth form, By difficulty), <b>Look-alikes</b>, <b>Photo stats</b> (Overview, Difficulty). <b>Players</b>: <b>Activity</b> (opened first) and <b>List</b> (who plays, merge or delete names); Activity (who plays and how much: recent sessions, activity over time). <b>Analyses</b>: what we learn from the answer log, refitted every 1000 answers: <b>Overview</b>, <b>Speed</b> (Answer time, Enlarging), <b>Difficulty</b> (Photos, Formats, Mix-ups), <b>Learning</b> (Practice, After a break, Sessions); and read live from the log: Difficulty › Pairs (the genera, photos and species mixed up), Learning › Answer log (learning curve, calibration, conditions, genera, mix-ups) and Learning › Stops (where players stop, genus sheets opened). The tabs of a group are in the row under the header, the views of a tab in the switch at its right; each group reopens the tab you used last (Players always Activity), each tab the view you used last. The address says where you are, in the same words: <code>#group/tab/view</code> (<code>#photos/review/quality</code>), a genus or a player after it.</p><p><b>Work in this order</b> (all under Photos, then To do)</p>
    <ol class="adm-steps"><li><b>Candidates</b>: add new photos to a view, or reject them. You never need to empty the queue: it favours the genera and views with the fewest photos, so stop whenever Where to look looks better.</li><li><b>Photo review</b>: check the quality and growth form guesses.</li><li><b>Genera</b>: per genus, cover and the first 3 photos of each view, then ✓ Validated.</li><li><b>Coverage › Games</b>: Where to look, above the grid, says which genus and view still lack photos; look for more there.</li><li><b>Publish</b>: sends your changes to the site.</li></ol>
    <p><b>What reaches the public site.</b> Nothing until Publish: every click is a draft kept in this browser only. Publish lists what it will send and asks first; it sends only what you changed (the rest follows the site) and is live within a minute or two. Covers, view order, hidden photos, quality, forms and the CF book switch (⋯ menu, site-wide) all change what the RAs see.</p>
    <p><b>What is permanent.</b> × on a photo excludes it for good once published: removed everywhere, imports skip it, its file goes (Excluded can restore the entry). Everything else can be undone: Undo (Ctrl+Z) before Publish (its steps survive a reload, until the tab is closed), a new click after it. Every Publish is kept in the site's history, so an old version can be recovered.</p>
    <p><b>Questions or a mistake:</b> ask Pierre Pericard.</p>`,
  todo: `<p>Everything that needs your eye, most urgent first: a red <b>Health</b> line when Health finds photos everyone misses or genera players are stuck on (nothing when all is well), the players' <b>reports</b>, the photos you <b>flagged</b> on the site, the <b>errors</b> the players' devices sent in the last 30 days (app errors, photos that did not load, failed saves), the photos <b>out of the presence rule</b> (taken abroad, of a species not confirmed in the Philippines: rule C8; <b>Remove</b>, <b>Keep</b> or <b>Remove all</b>, as in Reports), the <b>share-alike</b> photos (CC BY-SA, CC BY-NC-SA: no longer taken for corals; same actions), Featured photos rated Poor, and last the judging agent's <b>suggestions</b>. Each part works as in its own view: <b>Reports</b> (reports, flags, Poor featured photos and suggestions, the former Triage page), <b>Errors</b> (with the one-tap answers and load times), <b>Health</b>.</p>`,
  points: `<p>The points to settle: questions for an IMR trainer (<b>Trainer</b>), nomenclature points (<b>Names</b>), discrepancies between sources (<b>Sources</b>) and content questions for you (<b>Content</b>); <b>Fish</b> marks a fish point. Agents add them (<code>points.json</code>, most important first); you settle them. <b>Open</b> first, <b>Stand-by</b> below (set aside, still here), <b>Resolved</b> and <b>Dismissed</b> folded at the bottom. Age = since the point was added. Tap a point to open its page.</p>`,
  point: `<p>One point, made to show from a phone: the question, the photos to show (tap one to enlarge it, ‹ › to step through them), a field under each photo for the answer, and your notes. The photos are numbered, without their names, so the answer is the trainer's own; <b>Names</b> shows them (and the full caption in the enlarged photo). <b>Resolved</b>, <b>Stand-by</b> (it sinks below the open points and stays) or <b>Dismiss</b>, then <b>Reopen</b> if needed; one click, Undo (Ctrl+Z) steps back. <b>Context</b>: where the point comes from and its sources.</p><p>Your status, notes and answers are part of your curation: kept in this browser's draft, sent with <b>Publish</b> (curation.json <code>points</code>), which is public: no names of people in the notes.</p>`,
  hidden: `<p>Every photo taken off the site with <b>Remove</b>, all genera together (on a genus page they wait with the candidates). <b>Put back</b> returns one to its view; Undo steps back as everywhere.</p>`,
  kcov: `<p>What the genus sheets and the Coral ID Key can draw from, per genus and view (a sheet shows the first 6 photos of a view, the Coral ID Key the 3 featured plus a few iNat and book photos): the IMR genera and the book's other genera seen at Dauin (Not IMR). Every photo of the view counts (field, IMR lecture and approved Coral Finder book photos), except hidden and multi-coral ones. Big number = photos, small = distinct colonies with a photo that is not Poor; the colour follows those good colonies (as on Games). Forms = growth forms seen on Colony and Close-up photos; Species = distinct species named on the photos (hover for the list). Order: Thinnest, Thickest (to prune), A–Z; or click Colony, Close-up or Corallites to sort by that view (again to reverse). A dark outline marks a Key-only genus's Colony or Close-up cell at its cap (${CAP.sheet} colonies in the games' count, as many as a sheet and the Coral ID Key show), an orange one a cell over it. Click a row to open the genus.</p>`,
  cov: `<p><b>Where to look</b> (the banner above the grid): the genus and view cells most worth a candidate search now, most reasons first; hover one for its reasons, click it to open the genus; <b>All N</b> opens the full list (reasons, filters, sort; see its own help), <b>Fold</b> closes it.</p><p>Game photos per genus and view, for every genus a game can ask (the IMR slate, Millepora and the bonus genera): what the quiz and the other games can draw from. Field and IMR lecture photos (no Coral Finder book, no multi-coral, hidden or sheet-only photo; Poor photos count, the players' answers rate how hard they are; Colony leaves out photos where the form is not visible, except for a genus with a single growth form). Big number = photos, small = distinct colonies when fewer. The "excl." line under it counts the photos of that view left out of games and why: multi-coral (several corals in the photo), no form (form not visible), sheet only, CF (Coral Finder book), removed. The colour follows the colonies: dark red none, red 1-2 (thin: RAs may learn the photos instead of the genus), orange 3-4, light green 5-7, green 8 or more. The bar shows where the photos come from (IMR, Pierre, iNat Dauin, Philippines, elsewhere), the + count the candidates waiting. A dark outline marks a full cell (${CELL_MAX} colonies, the cap: its candidates wait outside the Candidates queue), an orange one a cell over the cap (prune it by adding a better photo there: the swiper then asks which colony to replace). Order: Thinnest (least covered first), Thickest (most photos first, to prune over-covered genera), Lecture; or click Colony, Close-up or Corallites to sort by that view (again to reverse). Click a row to open the genus.</p>`,
  users: `<p>Everyone who signed in to save their progress, by name (needs the sync sheet script v11 and this page's GitHub token: names are only shown to admins). <b>One list for every subject</b>: the same page on the Corals and the Fish side (the switch is greyed here; the other pages stay on the side it shows). Click a column title to sort by it, again to reverse; "you" marks the name synced in this browser; a greyed name (muted, italic) is hidden from the leaderboard. A long name or value ends in "…" so the table stays narrow: hover it for the whole text. <b>Last</b> = their last answer in any subject, to the minute: <b>now</b> (green) = less than ${RECENT.NOW} minutes ago, then "12 min ago", "3 h ago" (today), "yesterday 18:40" ("yest. 18:40" on a phone), then the date (hover for the date and time); times are 24 h; sorted by its exact time, most recent first by default (one tap on Last brings that back). How quickly answers reach the sheet: see Activity's help. <b>Devices</b> = the devices they opened the app on (from the pages-opened summaries, sheet v30); <b>Groups</b> = the beta groups they are in. Then <b>one group of columns per subject</b>: <b>Answers</b>, <b>Right</b> (every game), <b>Last</b> answer and <b>Sessions</b> in that subject (answers less than ${HEALTH.GAP} minutes apart; small: their median length); <b>Photos</b> and <b>Spread</b> (sheet v81; the photo exposure study of 2026-11-06): <b>Photos</b> = Seen %, the game photos they have been shown out of the game photos of the units they have met (it grows with the answers: a busy player looks good); <b>Spread</b> = Spread %, the one to act on: in time order, of their questions on a unit that still had colonies (one observation, all its views) they had never been shown, the share that showed one; 100% = no colony came back while an unseen one was left; low Spread = the draw turns round a few colonies; both computed by the sheet (hover a cell for its counts); <b>Progress</b> (the corals: replayed from every answer in the log with the current rules, what the app will show the player; <b>↻ saved 44%</b> beside one = what the copy saved in the sheet still says: the player has not opened the app since a recalculation, or their last answers are not saved yet). Everything else about a player is on their <b>Journey</b> (Journey → under the row; it opens on the subject they played last, its own Corals | Fish at the top): their Elo, quiz and duel right shares, days, sessions, units met and learned, games, mix-ups. Click a row for the Journey and the account tools; their reports count shows there too (To do › Reports lists them). <b>Not signed in</b>: answers of devices that never signed in, by anonymous id, per subject; they count in Activity. The answers an account deleted with its answers kept left behind are no player: they only rate photo difficulty and confusions (sheet v55), never listed here, in Activity, Health, a Journey or the Analyses' per-player results. Tick test runs or junk and <b>Delete the answers of the selected ids</b> (permanent, asks first; sheet v17). Photo difficulty and confusions count only players whose answers are clearly above chance (10 answers or more), signed in or not (sheet v18), each answer weighing more as the player's level settles, repeats against what they remember of the photo (sheet v17).</p><p><b>Merge into</b>: one person signed in under two names (a typo, a second phone). Their progress is combined (answers add up), their answers and reports move to the name kept, and the other name is deleted. <b>Delete…</b> shows two choices, no default (sheet v55): <b>Delete everything</b> (a test account, or a player who asked: their answers and reports go too) or <b>Delete, keep answers anonymously</b> (their answers stay without the name, only for photo difficulty; their reports stay too, read "from a removed account" in the Inbox, never thanked). Either way the account, its progress, page summaries, beta groups and its name in the logs go; only its line under <b>Removed</b> stays. Both are permanent and ask first. <b>Archive…</b> (sheet v58): a record kept apart under another name ("Pierre-test"), out of normal operation: no player row, leaderboard, achievement share or beta group; its answers only rate the photos; listed read-only under <b>Archived</b> (its Journey, Delete); its devices are told it is archived, and the name is free to start fresh. Players can also delete their own account in the app (About › Delete my account, sheet v58): everything goes, as <b>Delete everything</b>. A phone still signed in with a removed name is told to sign out; someone new can still pick that name with another code.</p><p><b>Beta group</b> (a subject that opens to a group of players, not to everyone; sheet v48): the players that subject opens to, besides you. <b>Beta</b> column, in that subject's group = In or not; <b>Add</b> / <b>Remove</b> in a player's row; <b>Add all</b> above the table puts every player listed in it (asks first). The app opens the subject for them at their next sync (signed-in players only); someone who signs up later is not in it until you add them. A merge keeps the membership; an archive or a delete removes it.</p>`,
  // A getter: SESS (the session summary's thresholds) is in admin-journey.js, loaded after this file.
  get stats() {
    return `<p><b>Recent sessions</b>: the last ${RECENT.N} sessions of every player, newest first (a session = one player's answers less than ${HEALTH.GAP} minutes apart, as on Analyses › Stops and a Journey): the name when they signed in (opens their Journey), else the anonymous id of their device (as on Players). Last = their last answer; <b>now</b> (green row) = less than ${RECENT.NOW} minutes ago. Length = first to last answer. Modes: quiz (look-alike duels slipped into it included), duel (the Duel tab), typed. "as of" = when the answers were read: <b>↻</b> reads them again (no automatic reload: each read fetches the whole answer log).</p>
    <p><b>How live is "now"?</b> It shows what the sheet has. A signed-in player's answer is sent about 3 seconds after it is given, so it is here within about 10 seconds (after ↻). A device not signed in sends its answers 10 at a time, or 20 seconds after it stops answering, or as soon as the app is left: while it plays, its last answers here can be up to 9 answers behind (a minute or three), still inside the ${RECENT.NOW} minutes of "now". Answers played offline arrive when the device is back online, with the time they were given. Times are the device's own clock.</p>
    <p><b>Tap a session</b> to unfold its summary under it; tap again to fold it. A sentence first, then start → end, length, answers, right (beside it, small, the share the game expected: the mean of each answer's logged chance) and the progress % before → after the session (the player's answers replayed with today's rules up to the session's first answer, then through it). The chart: right answers over the session's last ${SESS.WIN} (from its 5th answer) against the expected, its scale from ${SESS.PAD} points under the session's lowest point (rounded down to 10) to 100%, a dot under each genus met for the first time, ★ at a genus learned; a session under 5 answers shows its answers as dots. <b>New genera</b>: first asked in this session (<i>card</i>: its card showed, not asked yet). <b>Most improved</b>: the genera whose bar rose most (${Math.round(SESS.GAIN * 100)} points or more, at most ${SESS.TOP}). <b>Difficulties</b>: genera missed ${SESS.MISS} times or more, mix-ups (shown → answered), the photos of the questions missed, hardest first by their difficulty for everyone (the photo Elo), each with <b>recognised by N%</b>: the share of starting players (Elo 1000) who recognise it without guessing, 1 / (1 + e<sup>d</sup>) of its photo Elo d, whatever the question's format; <b>hard for everyone</b>: a photo everyone misses, as on Health (counted on players: ${HEALTH.PL_MIN}+ players answered it, most of them miss it, ${HEALTH.PH_MIN}+ answers). <b>Achievements</b>: earned within ${SESS.EDGE / 6e4} minutes of the session's answers (from the player's saved progress). <b>Events</b>: which session it is and the time since the last one, Open all, the first-launch question, genera learned (the right exam question that passed it), mastery exam questions, typed answers, ${SESS.RUN} right or more in a row, ending on ${SESS.END} misses or more in a row. <b>Journey →</b> opens the player's full journey.</p>`;
  },
  statslog: `<p>The whole class, from every quiz and duel answer synced to the sheet (each player, by name, is on the Players page). Calibration (sheet v5): each answer's expected chance of success from the player's level on the genus and the photos' difficulty, against the actual result; the games aim at about 80%. New photo = answers showing at least one photo the player had never seen. Genera, Elo = the median player's Elo on the genus (1000 + 200 × their level on it).</p>
    <p>Learning curve: right answers by rank of the answer (each player's 1st to 10th answer, 11th to 20th…), all players pooled. Genera: how often the genus shown was named; Given ✗ = times it was answered wrongly for another genus. Mix-ups open the comparison on the site.</p>`,
  statsconf: `<p>Which genera players mix up. <b>Pairs</b>: Offered = times the two were among the choices together, Mixed = times one was answered for the other (A→B: the first taken for the second). Score = the mix-up rate, starting from Look-alike (IMR lecture or Coral Finder book), Family or Other and following the answers as they come; from ${CONF.TRAP} the quiz uses the pair as a trap. Not declared = traps no lecture names. <b>Look-alike from the data</b>: a pair no source declares, offered together ${CONF.N} times or more with a score of ${CONF.TRAP} or more: the duels, the Again after a mix-up and the genus sheets treat it as a declared look-alike (the app adds a shared growth form to the start, so its count may differ by a pair at the edge). <b>Photos, Colonies, Species</b>: how often a wrong answer was given when they were shown, and what for. ≥1 / ≥3 / ≥10 hides rows with fewer answers. Before v10: mix-ups logged without their choices.</p>`,
  pstats: `<p>General numbers on every photo, from data.json and your draft (unpublished changes included) and the sheet's photo ratings. <b>In play</b> = the photos the games can draw now, as Coverage › Games counts them (field and IMR lecture photos of the game genera: the IMR slate, Millepora, the bonus genera; no Coral Finder book, several-corals, removed or sheet-only photo, no Colony photo whose form is not visible). <b>Colonies</b> = distinct iNaturalist observations (or lecture photos), as a question shows one colony. <b>Genera in play</b> = game genera with at least one photo in play (out of all of them when some have none).</p>
    <p><b>All photos</b>: every photo the admin knows, each in one row, so the rows add up to the total. <b>Not in games</b>: on the genus sheets and the Coral ID Key only, with the first reason that applies (the line under the table). <b>Comparison only</b>: photos (or candidates) you sent to Not this genus › Look-alike comparison: they left their genus and are shown only in the site's look-alike comparisons. <b>Removed</b>: taken off the site (Genera › Hidden), back with the candidates. <b>Candidates</b> = waiting for a decision: not added and not rejected (Coral Finder book pages included; hover the row for how many). <b>Rejected</b> = candidates you rejected (they stay candidates). <b>Excluded</b> = excluded for good (Genera › Excluded).</p>
    <p><b>Median [middle half]</b>: half the genera have fewer, half more; the brackets hold the middle half of the genera (25th to 75th percentile), a spread that a few very rich or very poor genera do not pull. <b>Per genus</b> counts every game genus (the IMR slate, Millepora, the bonus genera), a genus without any counting 0. The bars: how many genera have each band of photos in play, from 0 (hover a bar for its genera). <b>Views</b> counts only the genera that have the view (a 2-level genus has no Close-up view); <b>None</b> = genera without a single photo in that view, out of those that have it. <b>Sources</b>: the photos in play by where they come from (Coral Finder book photos are never in games, so they have no row); <b>Genera</b> = genera with at least one photo in play from that source. <b>Answers per photo</b>: answers that rated each photo in play (sheet v18, as Difficulty; everyone's answers, yours included); under the table, the median of every photo in play, then of those rated at least once. Nothing here changes anything.</p>`,
  statsph: `<p>Photo difficulty (Elo) from the answers of players clearly above chance, signed in or not (sheet v18), each weighed by the player's experience, read as <b>recognised by N%</b> (below). The coloured line under the distribution and the genera shows the bands along the axis, easier on the left. ≥1 / ≥3 / ≥10 keeps photos with at least that many answers (from sheet v18; before, weighed answers, so a photo answered once was hidden); few answers = rough. Genera: one lane per view (colony, close-up, corallites), a dot per photo (bigger and stronger with more answers), the lane's median as a bar, and from 5 photos a box (middle half of the photos) with whiskers; each genus reads for a typical photo of it, its genus offset (sheet v31; the median of its photos shown when the sheet has none), hardest first. Click a dot to see the photo.</p>
    <p>The quiz shows the colony, close-up and corallite photos together, so they share each answer: view differences only appear as different photos get mixed over many answers.</p>`,
  statsneeds: `<p>Where looking for more photos would help most, per genus and view, ranked by how many reasons add up. Reasons: <b>few colonies</b> (fewer than 3 distinct colonies in the game pool, as on Coverage); <b>few good colonies</b> (fewer than 3 colonies with a photo that is not Poor, so a struggling player has little easy variety); <b>too easy</b> (the players' Elo on the genus, its top quarter, is above what the hardest photo of the view can challenge, read as how many starting players recognise it: harder, realistic photos needed, Poor included); <b>repeats</b> (players see the same photos of the view 4 or more times each on average); <b>mix-ups</b> (the genus is often taken for another and its corallites view has fewer than 5 colonies); <b>few multi-zoom</b> (one row per genus, "Several zooms": fewer than 3 colonies photographed at 2 or more zoom levels; a game question only shows views of one colony, so these give the several-view questions beginners need). Levels need answers logged by sheet script v5; repeats and mix-ups work from any answers. Click a reason card to show only its rows (click again for all); the view switch and the genus box narrow the table; click a column header to sort (again to reverse). Click a row to open the genus.</p>`,
  diff: `<p>Every photo with answers, hardest (or easiest) first, with its quality to re-rate (the former Photo stats › Photo list). How hard each photo is for the RAs, learned from every quiz and duel answer in the sync sheet (Elo), read as <b>recognised by N%</b> (below); then the answers that rated it and the right %, weighed by each player's experience (sheet v17: a player's first answers count little). Few answers = rough; ≥1 / ≥3 / ≥10 keeps photos with at least that many answers (shared with Photos). The site uses it to weigh answers in "learned" (a right answer on a hard photo counts more). Re-rate a photo's quality here if it does not match how hard it plays.</p>`,
  genus: `<p>Every click is saved at once as a draft in this browser; <b>Publish</b> sends it to the site. <b>Undo</b> / <b>Redo</b> (Ctrl+Z, Ctrl+Shift+Z) step back one click at a time. An <b>out of rule</b> tag marks a photo taken abroad of a species the presence rule does not confirm in the Philippines (3+ Research Grade observers there, or 1+ and a checklist, or 2+ near Dauin; rule C8): yours to keep or remove, never removed automatically. A <b>share-alike</b> tag marks a photo under CC BY-SA or CC BY-NC-SA (no longer taken for corals): yours to keep or remove in To do, never removed automatically. A <b>WoRMS:</b> tag (outlined) gives the name WoRMS accepts now when the photo's name (iNaturalist's when it was fetched) is a former name, a former genus or iNaturalist's own spelling (its tooltip says which); information only, nothing is renamed (from the reference of names that tools/taxonomy.py refreshes from WoRMS and iNaturalist).</p>
    <p>The first 3 photos of each view are its featured photos (top of the genus sheet, Coral ID Key). Drag a photo into the first 3 places to put it there, out of them to drop it (the next best moves up); places you haven't set fill automatically. Drag to another view to move a photo, or from the candidates to add it. <b>Remove</b> takes a photo off the site (games included) and lists it with the candidates below, where you can add it back.</p>
    <p><b>Which no?</b> <b>Remove</b>: off the site, back with the candidates. <b>Reject</b> (Candidates): reviewed and not wanted, it stays a candidate. <b>Skip</b>: decide later. <b>Not this</b>: wrong genus, or only fit for a look-alike comparison. <b>×</b>: excluded for good (a person, a drawing, unusable).</p>
    <p>The letters on each photo are its growth form (see Growth form).</p>
    <p><b>Symbols.</b> Genus list: <b>✓</b> validated and complete; <b>!</b> validated but something is missing again; <b>●</b> draft not published; <b>⚠ check</b> a choice names a photo no longer in the data; <b>N waiting</b> candidates not reviewed yet; <b>macro cover</b> the cover is a close-up. Photos: <b>filled number 1-3</b> featured; <b>outlined number 4-6</b> also on the genus sheet; <b>dashed frame</b> a candidate, not on the site yet; <b>faded dashed frame</b> removed (back with the candidates); <b>added</b> a candidate you added; <b>Cover</b> the cover photo. Dashed tags or buttons are guesses, solid ones are your choices. <b>3 zooms / 2 zooms</b>: with 2, Close-up photos join Colony.</p>
    <p><b>All · Colony · Close-up · Corallites</b> (top bar) shows one view alone, kept from genus to genus; Candidates and Not this genus are hidden then (the line under the bar counts them, <b>All views</b> brings everything back).</p>`,
  form: `<p>The 7 IMR growth forms (Lecture 6, slides 3-10), one per photo, the main form visible: <b>Br</b> Branching, <b>En</b> Encrusting, <b>Ta</b> Tabulate, <b>Mu</b> Mushroom, <b>Ma</b> Massive, <b>Sm</b> Submassive, <b>Fo</b> Foliose/Plating; <b>∅</b> = form not visible (too close). <b>✿</b> = polyps or vesicles extended (not a form; it fills the Coral ID Key "Large daytime polyps" tile).</p>
    <p>The Coral ID Key growth-form tiles use them: Branching = Br + Ta, Thin plates and crusts = En + Fo, Massive or thick = Ma + Sm, Columns = Sm, Solitary = Mu, Meandering = any form of the genera it lists. Dashed = a first guess, solid = yours (always wins); a red ? = a guess to double-check.</p>
    <p><b>📌</b> makes a photo a lead photo of its form's tile on the site's Coral ID Key start (up to 3 per form, number = place; a 4th drops the oldest); the tile's other places stay automatic. Br leads Branching, En Thin plates and crusts, Ma Massive, Sm Columns, Mu Solitary.</p>
    <p>Click, drag a photo to another row, or hover it and press B E T U M S F, X for not visible, P for polyps. "To classify" rows group the photos without a guess by their old Coral Finder book letter. Coral Finder book photos are left out.</p>
    <p><b>Your forms</b> (the line at the top) measures the automatic detection against your own choices, over the photos the Show, View and genus filters leave: how many forms you set, how often your form is the dashed guess (among the photos that have both; ✿ apart), and how many unsure guesses (red ?) are still waiting. A click on the dashed form counts as agreeing, a click on another form as disagreeing; ✓ Validate N agrees for every photo it sets, so check photo by photo to measure the detection. It updates as you click; nothing extra is saved. Open it for the table guess → your form (diagonal = agreed); hover it for the same as a list. <b>Guesses first</b> puts, in each row, the photos still on a guess first (unsure ones first), then the ones you set.</p>`,
  quality: `<p>Quality 3 good, 2 fair, 1 poor. Dashed tags are an automatic guess (sharpness, contrast, colour cast, size). Click, drag to another level, or hover a photo and press 1, 2 or 3.</p>`,
  triage: `<p>Only what needs your eye. First, what players reported: after an answer in a game (wrong answer with the genus they suggest, several corals, bad photo, other), from an enlarged photo, from the bottom of a genus sheet, or with "Send feedback" (at the bottom of the ? help of any page, or on About; wrong information, bug, suggestion), with the page it came from and who sent it: a name with ? did not sign in to the sync, so anyone could have typed it. Each photo has the tools of its genus page; ✓ Done clears one report, and once you Publish, the player who sent it is thanked at their next visit (a "Your feedback helped" card: only that it was handled, nothing you wrote; several handled reports in one card, at most one a week; never for a deleted account; sheet v57 for reports sent signed in on another device). A report fixed by a PR is marked handled in reports-handled.json by the integrator: it leaves the list and shows folded under it, "Handled in a PR", with the PR's link; its player is thanked the same way. Reports come from the Reports tab of the sync sheet (script v8); every admin can read them: the sheet checks this page's GitHub token. ↻ reloads.</p><p>Then, on the site, the ⚑ on any photo (shown only in this browser) sends it here with where you saw it, on the side of its subject (Corals | Fish). Hide, Poor or Done clear one flag at a time; on a fish photo, Remove excludes it from the fish games for good (Undo brings it back) and Done clears the flag.</p><p>Then the photos out of the presence rule: taken abroad, of a species not confirmed in the Philippines (Research Grade there by 3+ observers, or 1+ and the Corals of the World checklist, or 2+ observers within 40 km of Dauin; presence.json). They carry an "out of rule" tag on every page; nothing is removed for you. <b>Remove</b> excludes one for good, as the × on any photo does (Pierre: a photo out of the rule must not be there): removed from every genus, game and candidate list, imports skip it (Undo works; Excluded restores it). <b>Keep</b> accepts it as an exception: it stays on the site and moves down to <b>Kept</b> (folded, with its count) at the bottom of the section, out of the count and of Remove all; there Remove still excludes it, and Keep again (pressed) un-keeps it, back to the list. On other pages its tag reads "out of rule · kept". <b>Remove all</b> asks first, then excludes each one still to handle (one Undo step each; the kept ones stay). All three go into your draft; Publish sends them.</p><p>Then the <b>share-alike</b> photos on the site (CC BY-SA, CC BY-NC-SA, from their recorded licence, else their credit line). Since 5 Nov 2026 the candidate search no longer takes share-alike photos for corals, as for fish (a share-alike licence would bind any later reuse to the same licence), and the share-alike candidates waiting left the queue; the ones already on the site are yours to decide, never removed for you. They carry a "share-alike" tag on every page. <b>Remove</b>, <b>Keep</b> (down to Kept; its tag then reads "share-alike · kept") and <b>Remove all</b> work exactly as for the photos out of the presence rule.</p><p>Then Featured photos rated Poor.</p><p>Last, the suggestions of the photo judging agent (suggest.json): wrong genus, view, several corals, near-duplicates, candidates to add. Accept does the usual action (Undo works), Dismiss hides the suggestion for good. Its growth forms and quality ratings show as dashed guesses on each photo, its Featured picks fill the views you haven't picked.</p>`,
  units: `<p>The book's families (Allen et al. 2015, the key in force), by key group: English name first, the scientific names below; <b>IMR</b> tags the families and genera in the IMR course (its IMR name in the tooltip); <b>All / IMR</b> shows every family or the IMR course's only. A family's page: one block per genus, one section per species, most common first, each with its observations in play against its target (8, 12 for the PDF's most sighted) and its photos in play: featured first (your order), then the game's order: the easiest, then the most reference-like, whoever took them (your own photos are not moved up). <b>Feature</b> (up to ${FISHFEAT} per species), <b>★ Cover</b> (the family's), <b>Remove</b> (set aside), <b>Not this</b> (another species of the family, or no game species: yours only) and <b>×</b> (excluded for good): one click each, Undo steps back. <b>✓ Validated</b> once nothing is missing: every species at its target, ${FISHEASY} easy photos (ease 4-5), every phase the IMR course names. Candidates are added in Candidates. Publish sends it all (curation.json fish).</p>`,
  mont: `<p>The classic look-alikes (pairs the IMR lecture or the Coral Finder text compare), one side-by-side pair each on the site's Look-alikes page. Pick the view, then click a photo on each side. Rows you haven't touched show the automatic pick (same view, same growth form, IMR then your photos first). <b>All</b> mixes the zoom levels, to pair two nearby zooms. <b>Auto / Manual</b> says whether the pair shows the automatic pick or yours (clicking a view or a photo makes it Manual; Auto drops your picks for that pair). <b>Shown / Hidden</b>: Hidden keeps a pair off the site until there are good examples.</p>`,
  cand: `<p>Every new candidate, one at a time, genera taking turns, the genus × view with the fewest game colonies far more often. The genera of the games (the IMR slate, Millepora, the bonus genera) come first: the other genera of the Coral Finder book (Key-only: in the Coral ID Key only) only once a source has no game candidate left, and only for Colony and Close-up (no corallite photos). Set quality and growth form, then add it to a view (keys 1 2 3), Reject (←), Skip (→) or Not this. Rejected photos stay candidates on their genus page. × excludes for good. Undo steps back.</p><p><b>Full cells</b>: a genus x view with ${CELL_MAX} colonies in the games is full (${CAP.sheet} for a Key-only genus, as many as its sheet and the Coral ID Key show). Its candidates wait outside the queue (the count under the sources; Show them brings them in) and come back when it drops below its cap. Adding a photo to a full view asks which colony it replaces: that colony's photos of the view stay on the genus sheet and leave the games (sheet only); or Add anyway.</p><p><b>Auto</b>: at each load, what the candidate pass is sure of is done for you in the draft (Publish sends it): the best photo of its observation in its view, Fair or Good, is added with its view, quality, growth form and crop (up to the cap); near-duplicates, several corals and Poor photos are rejected, unusable ones excluded. Photos it added carry an "auto" tag; Details lists every auto decision with Undo (the photo comes back here for good). About 1 in 20 sure photos comes up as a <b>Check</b> instead, blind: your answer is compared with the agent's (shown after). Removing an auto-added photo on its genus page counts as rejecting it. Agreement per field (keep, view, quality, growth form) over the last ${AUTO.win} checks and corrections, in the order you made them: a field under its threshold (keep ${Math.round(100 * AUTO.min.keep)}%, view ${Math.round(100 * AUTO.min.view)}%, quality ${Math.round(100 * AUTO.min.quality)}%, form ${Math.round(100 * AUTO.min.form)}%, after ${AUTO.n0}) is off until it recovers. Details shows the disagreements with the agent's note and the photo metrics. Once every ${AUTO.retest} photos, a <b>Retest</b>: a photo you rated, blind, to measure your own consistency (your first rating stays).</p>`,
  health: `<p>How the app is working for players, from the answers already logged (most players never send feedback). Anonymous ids only, counts, no names. Every account counts, yours too.</p>
    <p><b>Photos everyone misses.</b> Counted on players, not answers (one player missing the same photo again and again is not everyone): photos answered by ${HEALTH.PL_MIN} players or more, ${HEALTH.PL_MISS} or more of whom, and a majority, miss it (under ${Math.round(HEALTH.PL_LOW * 100)}% of their own answers on it right), and either shown in ${HEALTH.PH_MIN} answers or more with under ${Math.round(HEALTH.PH_LOW * 100)}% right or clearly harder than the other photos of their genus (<b>harder than its genus</b>: a difficulty at least ${HEALTH.PH_FAR} above the median of their genus's rated photos on the photo Elo scale, with ${HEALTH.PH_MIN}+ rated answers). They may be mislabelled, show another coral, or be bad photos: click to enlarge, the genus name opens its page. Right % and answers count every answer that showed the photo; then the players who miss it out of those who answered it; then how many starting players recognise it (hover it for the raw difficulty and its gap to the genus median).</p>
    <p><b>Genera that don't take off.</b> Per slate genus, from the answers where it was shown: players who met it, the median of their right rates on it, and Stuck = players with ${HEALTH.G_MIN}+ answers on it still under ${Math.round(HEALTH.G_LOW * 100)}% over their last ${HEALTH.G_MIN} (out of the players with ${HEALTH.G_MIN}+ answers). Most stuck first.</p>`,
  statsstop: `<p>Where players stop and the genus sheets they open, from the answers already logged and the visits' summaries. Anonymous ids only, counts, no names. Every account counts, yours too.</p>
    <p><b>Where players stop.</b> A session = one player's answers less than ${HEALTH.GAP} minutes apart; a session whose last answer is more recent is still going and not counted as ended. Answers per session and sessions per player. How sessions ended: the misses in a row on their last answers, for short sessions (${HEALTH.EARLY} answers or fewer) against longer ones: more short sessions ending on misses than long ones = players quitting in frustration. Last shown: the genus and game of the last question of the short sessions.</p>
    <p><b>Genus sheets opened</b> (sheet v30). From the summary each visit sends (the pages opened and for how long, under the player's anonymous id, never a name; Players and Journey join it to the answers): per experience band (answers so far when the visit was made), the players and the visits, and the share that opened at least one genus sheet. A player who changed band counts in each. Not known = a summary without the answers so far.</p>`,
  excluded: `<p>Excluded photos are removed from every genus, game and candidate list, and imports skip them. Restore puts one back.</p>`
};
// The pages that show a difficulty or Elo reading: their "?" ends with the method (REC_HELP).
const REC_PAGES = new Set(['journey', 'users', 'stats', 'statslog', 'statsph', 'diff', 'health', 'statsneeds', 'cov', 'cand']);
function toggleHelp() {
  let h = $('admhelp');
  if (h) {
    h.remove();
    return;
  }
  const m = lookAll()
    ? 'statsneeds'
    : {
        'players/list': 'users',
        'photos/stats/difficulty': 'statsph',
        'photos/stats/overview': 'pstats',
        'analyses/difficulty/pairs': 'statsconf',
        'analyses/learning/answer-log': 'statslog',
        'analyses/learning/stops': 'statsstop',
        'photos/review/by-difficulty': 'diff'
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
    h.innerHTML = `<button type="button" class="adm-link" aria-label="Close help">×</button><span class="adm-qseg adm-htabs" role="group"><button type="button" data-ht="page" aria-pressed="${tab === 'page'}">This page</button><button type="button" data-ht="start" aria-pressed="${tab === 'start'}">Start here</button></span>${tab === 'start' ? HELP.start : HELP[m] + (REC_PAGES.has(m) ? REC_HELP : '')}`;
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
// 📌 (Growth form view): only on photos the Coral ID Key tiles can show (colony or close-up view, one coral, not a
// book photo), so a pin always counts; the number is its place on the tile.
const pinOK = p => (p.view === 'wide' || p.view === 'medium') && !p.multi && !p.cf;
const pinBtn = f => {
  const c = fOf(f);
  if (!c || c === 'x') return '';
  const k = tileOf(c).indexOf(f);
  return `<button type="button" class="adm-pin" data-pin="${c}" aria-pressed="${k >= 0}" title="${k >= 0 ? `Tile photo ${k + 1} of ${fName(c)} on the Coral ID Key start: click to unpin` : `Make it a lead photo of the ${fName(c)} tile on the Coral ID Key start`}">📌${k >= 0 ? k + 1 : ''}</button>`;
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
  if (cur === 'photos/review/growth-form') t.classList.add('rated');
  bindF(t);
  agreeRefresh();
  status();
}
const agreeRefresh = () => {
  const d = cur === 'photos/review/growth-form' && $('fagree');
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
    <figcaption><a class="adm-gen" href="${esc(genusHref(p.genus))}" title="Open the genus"><i>${esc(p.genus)}</i></a><span class="adm-src view">${vl(p.view)}</span>${srcTag(p)}${p.hid ? '<span class="adm-src multi">hidden</span>' : ''}</figcaption>
    <div class="adm-acts">${fSeg(p)}${pinOK(p) ? `<span class="adm-pinw">${pinBtn(p.f)}</span>` : ''}</div></figure>`;
  // Still to classify: grouped by the old Coral Finder letter, as a hint.
  const rows = [
    ...[...FORM_ORDER].map(c => [c, fName(c), p => fOf(p.f) === c]),
    ['x', 'Form not visible', p => fOf(p.f) === 'x'],
    ...[...'BMSPFLC', ''].map(c => [
      '',
      `To classify${c ? ` · was Coral Finder book ${cfName(c)}` : ''}`,
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
  $v.innerHTML = `<section class="adm-quality">
    <div class="adm-qhead"><h2>Growth form</h2></div>
    <details class="adm-fagree" id="fagree"${FAG_OPEN ? ' open' : ''}></details>
    ${FB.origins({skip: ['book']})}
    <div class="adm-filter"><span class="label">View</span>${FB.views({key: 'fv', cur: FF.view, items: FB.viewItems()})}
      ${FB.unit({id: 'fgen', cur: FF.genus, names})}
      ${FB.check('ftodo', FF.todo, 'Not checked yet')}${FB.check('fpol', FF.pol, '✿ Polyps out')}${FB.check('fgfirst', FF.gfirst, 'Guesses first')}</div>
    ${rows.map(sec).join('')}</section>`;
  const fag = $('fagree');
  agreeFill(fag);
  fag.ontoggle = () => (FAG_OPEN = fag.open);
  bindBar($v, {
    redraw: renderForm,
    f: FF,
    k: 'reefid-admin-ffilter',
    view: 'fv',
    unit: 'fgen',
    checks: {ftodo: 'todo', fpol: 'pol', fgfirst: 'gfirst'}
  });
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
    if (cur !== 'photos/review/growth-form' || !over || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,select,textarea'))
      return;
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
      <figcaption>${DATA.gen[p.genus] ? `<a class="adm-gen" href="${esc(genusHref(p.genus))}"><i>${esc(p.genus)}</i></a>` : `<span class="adm-gen">${esc(p.genus)}</span>`}${!p.gone ? srcTag(p) : p.inat ? `<a class="adm-src" href="https://www.inaturalist.org/photos/${p.inat}" target="_blank" rel="noopener">iNat ↗</a>` : p.slide ? `<span class="adm-src">IMR lecture</span> <i>slide ${esc(String(p.slide))}</i>` : ''}</figcaption>
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
  if (force) sheetDrop('reports');
  return sheetRead('reports', fresh =>
    fetch(SYNC_URL, {method: 'POST', body: JSON.stringify({readReports: 1, token: TOKEN})})
      .then(r => r.json())
      .then(j => {
        if (!fresh()) return REPS;
        repsAt = Date.now();
        REPS =
          j && j.ok && j.rows
            ? {rows: j.rows}
            : {err: !j || !j.v || j.v < 8 ? 'Sheet script v8 not deployed' : j.error === 'token' ? 'Token refused' : 'Not available'};
        return handledLoad().then(() => REPS); // the reports handled in a PR, before anything counts them as to do
      })
      .catch(() => (fresh() ? (REPS = {err: 'Offline'}) : REPS))
  );
}
// Reports handled in a PR (reports-handled.json {"<id>": {pr, at}}, edited in PRs by the integrator; Pierre, 2026-11-05):
// out of the to-do list like a Done, shown folded under it as "handled in #N" with the PR's link. Read once a load.
let HANDLEDF = null;
const handledLoad = () =>
  HANDLEDF
    ? Promise.resolve(HANDLEDF)
    : fetch('reports-handled.json', {cache: 'no-cache'})
        .then(r => (r.ok ? r.json() : {}))
        .catch(() => ({}))
        .then(j => (HANDLEDF = j && typeof j === 'object' && !Array.isArray(j) ? j : {}));
const repPR = id => (HANDLEDF && HANDLEDF[id] && Number(HANDLEDF[id].pr)) || 0;
const repsOpen = () => (REPS && REPS.rows ? REPS.rows.filter(r => !(DRAFT.seen || {})['rep:' + r[0]] && !repPR(r[0])) : []);
const repsPR = () => (REPS && REPS.rows ? REPS.rows.filter(r => !(DRAFT.seen || {})['rep:' + r[0]] && repPR(r[0])) : []);
// Errors & feedback (sheet v19, Pierre 2026-11-02: most RAs will not report problems): what the players' devices report
// by themselves (app.js ev): app errors, photos that did not load, saves that failed, and the one-tap question's answers.
// Rows [id, time ms, device, kind, message, where, page, detail, app version, browser], newest first. Admin token only.
let EVS = null,
  evsAt = 0;
function loadEvents(force) {
  if (!force && EVS && Date.now() - evsAt < 300000) return Promise.resolve(EVS);
  if (!TOKEN) return Promise.resolve((EVS = {err: 'Needs the GitHub token'}));
  if (force) sheetDrop('events');
  return sheetRead('events', fresh =>
    fetch(SYNC_URL, {method: 'POST', body: JSON.stringify({readEvents: 1, token: TOKEN})})
      .then(r => r.json())
      .then(j => {
        if (!fresh()) return EVS;
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
      .catch(() => (fresh() ? (EVS = {err: 'Offline'}) : EVS))
  );
}
// Pages opened (sheet v30 'pages', app sync.js pagesSend, core.js PAGES): one summary a visit (or a part of one: the app
// sends what it has each time it is left, same visit id), read from the sheet's Pages tab (readEvents with pages: 1,
// the last 10,000), apart from the other events. Each as {t, dev, id: the admin's id of the player ('' unknown: a wrong
// code), vi: visit, na: answers so far, r: {page: [times, seconds]}, g: {genus: [times, seconds, from, asked]}}.
// Before sheet v30 (rule D4) nothing is shown but the version line.
let PGS = null,
  pgsAt = 0;
// Kept 5 minutes, an error 30 s (offline, a script not updated yet). pagesFresh(): the cached read, or a new one whose
// arrival redraws the page once if it is still the one that asked (Codex review #423: the first read was kept for good,
// an error too). A new read is a new object, a cached one the same: no redraw, so no render / read loop.
const pagesStale = () => !PGS || Date.now() - pgsAt >= (PGS.err ? 30000 : 300000);
function pagesFresh(here) {
  if (!pagesStale()) return;
  const was = PGS;
  loadPages().then(x => x !== was && cur === here && render());
}
function loadPages(force) {
  if (!force && !pagesStale()) return Promise.resolve(PGS);
  if (!TOKEN) {
    pgsAt = Date.now();
    return Promise.resolve((PGS = {err: 'Needs the GitHub token'}));
  }
  if (force) sheetDrop('pages');
  return sheetRead('pages', fresh =>
    fetch(SYNC_URL, {method: 'POST', body: JSON.stringify({readEvents: 1, pages: 1, token: TOKEN})})
      .then(r => r.json())
      .then(j => {
        if (!fresh()) return PGS;
        pgsAt = Date.now();
        return (PGS =
          j && j.ok && j.rows && Number(j.v) >= PAGES.SHEET
            ? {rows: pagesRows(j.rows), arch: pagesRows(j.arch || [])} // v58: an archive's apart (its Journey only)
            : {
                err:
                  !j || !(Number(j.v) >= PAGES.SHEET)
                    ? `Sheet script v${PAGES.SHEET} not running yet (it updates itself within 15 minutes)`
                    : j.error === 'token'
                      ? 'Token refused'
                      : 'Not available'
              });
      })
      .catch(() => {
        if (!fresh()) return PGS;
        pgsAt = Date.now();
        return (PGS = {err: 'Offline'});
      })
  );
}
const pagesRows = rows =>
  rows
    .filter(r => r[3] === 'pages')
    .map(r => {
      let d = {};
      try {
        d = pagesClean(JSON.parse(r[7] || '{}')); // cleaned again: no prototype keys, known shapes only
      } catch (e) {
        d = pagesClean({});
      }
      return {t: r[1], dev: r[2], id: r[4], vi: d.vi || r[0], na: typeof d.na === 'number' ? d.na : null, r: d.r, g: d.g};
    });
// The genus sheets one player opened, from their summaries: per genus the times opened, the seconds, how the first
// opening was reached and whether the genus had been asked to them before it; and their visits.
function sheetsOf(L) {
  const G = Object.create(null),
    V = new Set();
  L.slice()
    .sort((a, b) => a.t - b.t)
    .forEach(x => {
      V.add(x.vi);
      Object.entries(x.g).forEach(([g, [n, s, from, asked]]) => {
        const o = (G[g] = G[g] || {g, n: 0, s: 0, from, asked, first: x.t});
        o.n += n;
        o.s += s;
      });
    });
  return {G: Object.values(G).sort((a, b) => b.n - a.n || b.s - a.s || a.g.localeCompare(b.g)), visits: V.size};
}
// Experience bands for "who opens the sheets" (Pierre, 2026-11-03): answers so far when the visit was made.
const XP_BANDS = [
  ['Under 50 answers', 0, 49],
  ['50-300 answers', 50, 300],
  ['Over 300 answers', 301, Infinity]
];
// Analyses › Learning › Stops › Genus sheets: of the visits and the players of each band, the share that opened at least one genus sheet.
function healthSheets() {
  const head = '<h3>Genus sheets opened</h3>';
  if (!PGS) return `<section class="adm-scard adm-hsec full" data-health="sheets">${head}<p class="note">Loading…</p></section>`;
  if (PGS.err) return `<section class="adm-scard adm-hsec full" data-health="sheets">${head}<p class="note">${esc(PGS.err)}</p></section>`;
  // One visit = the summaries with the same visit id; a player = the admin's id, else the device.
  const VS = Object.create(null);
  PGS.rows.forEach(x => {
    const who = x.id || 'dev:' + x.dev,
      v = (VS[who + '|' + x.vi] = VS[who + '|' + x.vi] || {who, na: x.na, sheet: false, s: 0});
    if (x.na != null && (v.na == null || x.na < v.na)) v.na = x.na;
    const gs = Object.values(x.g);
    if (gs.some(([n]) => n > 0)) v.sheet = true;
    v.s += gs.reduce((t, a) => t + a[1], 0);
  });
  const visits = Object.values(VS),
    rowOf = (t, L) => {
      const P = Object.create(null);
      L.forEach(v => (P[v.who] = P[v.who] || v.sheet));
      const np = Object.keys(P).length,
        op = Object.values(P).filter(Boolean).length,
        ov = L.filter(v => v.sheet).length;
      return `<tr><td>${t}</td><td class="n">${np}</td><td class="n">${pct(op, np)}</td><td>${sbar(op, np || 1)}</td><td class="n">${L.length}</td><td class="n">${pct(ov, L.length)}</td></tr>`;
    },
    bandOf = v => XP_BANDS.find(([, a, b]) => v.na != null && v.na >= a && v.na <= b),
    rows = XP_BANDS.map(([t]) =>
      rowOf(
        t,
        visits.filter(v => (bandOf(v) || [])[0] === t)
      )
    ),
    unknown = visits.filter(v => !bandOf(v));
  return `<section class="adm-scard adm-hsec full" data-health="sheets">${head}${
    visits.length
      ? `<div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th>Experience</th><th class="n">Players</th><th class="n" title="Players who opened at least one genus sheet">Opened one</th><th></th><th class="n">Visits</th><th class="n" title="Visits with at least one genus sheet opened">With one</th></tr></thead><tbody>${rows.join('')}${unknown.length ? rowOf('Not known', unknown) : ''}${rowOf('<b>All</b>', visits)}</tbody></table></div>`
      : '<p class="note">None yet.</p>'
  }</section>`;
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
// A save that failed, then came through on a retry (sync.js saveOk, app from 2026-11-05): the player saw nothing.
const saveBack = r => r[3] === 'sync' && /^save recovered/.test(String(r[4] || ''));
// To do › All: what went wrong on the players' devices in the last EV_DAYS days (app errors, photos that did not load,
// failed saves), the most devices first; the one-tap answers and load times stay in Errors.
function evSummary() {
  if (!EVS) return '';
  if (EVS.err) return `<div class="adm-qhead adm-tdhead"><h2>Errors</h2><small class="adm-where">${esc(EVS.err)}</small></div>`;
  const since = Date.now() - EV_DAYS * 864e5,
    R = EVS.rows.filter(r => r[1] >= since && ['err', 'photo', 'sync'].includes(r[3]) && !saveBack(r)),
    G = evGroup(R, r => r[3] + '|' + r[4] + (r[3] === 'err' ? ' @ ' + r[5] : '')),
    K = {err: 'App error', photo: 'Photo not loaded', sync: 'Failed save'};
  if (!G.length) return '';
  return `<div class="adm-qhead adm-tdhead"><h2>Errors <small>${R.length}</small></h2><a class="adm-link" href="#inbox/todo/errors">All errors ›</a></div>
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
    ['beg', 'Beginner', 'Elo below 900'],
    ['mid', 'Middle', 'Elo 900 to 1100'],
    ['str', 'Strong', 'Elo above 1100'],
    ['unk', 'Unknown', 'Elo not logged']
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
// "Did you know?" tips (quiz.js tipShow; tips.js TIPS): per tip, the devices it showed on, its showings and how each one
// ended: Show me, Got it (or Escape), or the page left with it up; a tip left open when the app closed counts in none.
// The Duel tab's relief card (quiz.js reliefShow, item duelhold) is logged the same way, its choices Compare them,
// Mix in other genera and Keep drilling (or Escape), and back: the player came back to the duel from the comparison; a
// column each, shown when some row has one.
const TIPC = [
  ['show', 'Show me'],
  ['ok', 'Got it'],
  ['cmp', 'Compare'],
  ['mix', 'Mix in'],
  ['keep', 'Keep drilling'],
  ['back', 'Back to the duel']
];
function tipsView(L) {
  const T = {};
  L.forEach(r => {
    const t = (T[String(r[5]).slice(4)] = T[String(r[5]).slice(4)] || {
      dev: new Set(),
      shown: 0,
      none: 0,
      ...Object.fromEntries(TIPC.map(([k]) => [k, 0]))
    });
    t.dev.add(r[2]);
    if (r[4] in t && r[4] !== 'dev') t[r[4]]++;
  });
  const K = Object.keys(T),
    C = TIPC.filter(([k], i) => i < 2 || K.some(x => T[x][k]));
  return K.length
    ? `<div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th>Tip</th><th>Devices</th><th>Shown</th>${C.map(([, t]) => `<th>${t}</th>`).join('')}<th>Left</th></tr></thead><tbody>${K.map(
        k =>
          `<tr><td>${esc(k)}</td><td class="n">${T[k].dev.size}</td><td class="n">${T[k].shown}</td>${C.map(([c]) => `<td class="n">${T[k][c]}</td>`).join('')}<td class="n">${T[k].none}</td></tr>`
      ).join('')}</tbody></table></div>`
    : '<p class="note">None yet.</p>';
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
    loadEvents().then(() => cur === 'inbox/todo/errors' && renderEvents());
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
  // "Did you know?" tips (quiz.js tipShow) are logged with the one-tap questions, their item "tip:<id>" (the sheet keeps
  // only the event kinds it knows): counted apart, out of the one-tap rates.
  const isTip = r => /^tip:/.test(String(r[5] || '')),
    P = pulseRows(of('pulse').filter(r => !isTip(r))),
    pulse = pulseView(P),
    tipT = tipsView(of('pulse').filter(isTip));
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
      ? `<div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th>Save problem</th><th>Devices</th><th>Times</th><th>Last</th><th>Last try</th></tr></thead><tbody>${sy
          .map(
            g =>
              `<tr><td><code>${esc(g.k)}</code></td><td class="n">${g.dev.size}</td><td class="n">${g.n}</td><td>${when(g.last)}</td><td><small>${esc(g.r[5] || '')}</small></td></tr>`
          )
          .join('')}</tbody></table></div>`
      : '<p class="note">No failed save while online.</p>';
  // Requests from an app version before 2026-11-03 (sheet v25 'old'), and devices on a replaced version with their id and
  // version (sheet v50, Code.gs behind_): who, how often, last seen.
  const od = group(of('old'), r => r[4] + '|' + r[2]),
    oldT = od.length
      ? `<div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th>Request</th><th>Device</th><th>App</th><th>Times</th><th>Last</th></tr></thead><tbody>${od
          .map(
            g =>
              `<tr><td><code>${esc(g.r[4])}</code></td><td><code>${esc(g.r[2] || '')}</code></td><td>${esc(g.r[8] || '')}</td><td class="n">${g.n}</td><td>${when(g.last)}</td></tr>`
          )
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
      ['Failed saves', of('sync').filter(r => !saveBack(r)).length],
      ['Old app versions', of('old').length],
      ['Visits timed', of('load').length],
      ['Installed app', LD.filter(x => x.st).length + ' / ' + LD.length]
    ]) +
    `<div class="adm-sgrid adm-ev">
    <section class="adm-scard wide adm-pulse"><h3>One-tap questions · ${EV_DAYS} days</h3>${pulse}</section>
    <section class="adm-scard"><h3>Did you know? tips · ${EV_DAYS} days</h3>${tipT}</section>
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
  if (r) r.onclick = () => loadEvents(true).then(() => cur === 'inbox/todo/errors' && renderEvents());
  $v.querySelectorAll('[data-zf]').forEach(b => (b.onclick = () => zoom(b.dataset.g, b.dataset.zf)));
}
// Triage: only what needs Pierre's eye. 1) photos he flagged on the site, with where they were seen;
// 2) Featured photos rated Poor. Views without his own Featured pick are not a task (Pierre): the automatic pick is fine.
// The fish beta's reports (Codex review #442): a report from a fish question names a teaching id (t01) and remote
// iNaturalist photos (fi…), none in the coral photo registry. fish.json, fish-photos.json and fish-game.json (the curated
// photos on R2, admin plan PR 7) are read once, when To do first shows: {gen: teaching id -> record (core.js fishGen),
// ph: photo id -> {photo, entry id}}, every photo either list holds (a report may name a photo shown before a Publish).
let FISHP_ADM = null;
function fishAdmin() {
  return (FISHP_ADM =
    FISHP_ADM ||
    Promise.all(
      ['fish.json', 'fish-photos.json', 'fish-game.json'].map(u => fetch(u, {cache: 'no-cache'}).then(r => (r.ok ? r.json() : null)))
    )
      .then(([f, ph, gm]) => {
        if (!f || !ph || !ph.photos) return;
        const G = (gm && gm.photos) || {},
          all = {};
        new Set([...Object.keys(ph.photos), ...Object.keys(G)]).forEach(t => (all[t] = [...(G[t] || []), ...(ph.photos[t] || [])]));
        const F = fishGen(f, all),
          P = {};
        Object.values(F.gen).forEach(g => g.views.wide.forEach(x => (P[x.f] = {...x, entry: g.id})));
        FISHA = {gen: F.gen, ph: P};
        if (cur === 'inbox/todo/reports') render();
      })
      .catch(() => {}));
}
// A unit's name in a report: a fish entry by its IMR name (plain, no genus page), a genus in italics with its page link.
const repUnit = x =>
  FISHA && FISHA.gen[x]
    ? `${esc(FISHA.gen[x].name)} <small>(fish)</small>`
    : `<a class="adm-gen" href="${esc(genusHref(x))}"><i>${esc(x)}</i></a>`;
// To do › Out of the presence rule (Pierre, 2026-11-05: the rule stays strict, he sorts these photos himself; a photo that
// does not meet it "must not be there") and To do › Share-alike (Pierre, 2026-11-05: share-alike photos already on the
// site are never removed automatically; same actions). Remove = the × of every photo (ACT.exclude: excluded for good,
// from every genus, game and candidate list, and imports skip it; no confirmation, Undo works, Excluded restores it);
// Keep = an exception he accepts for good (curation.json seen '<key>:f'); Remove all asks first (rule A2: bulk), then
// excludes each photo, one Undo step each. Kept: a subsection at the bottom of the section, folded (its count shown), its
// photos out of the count and of Remove all; Keep is pressed there, a click un-keeps (back to the list to handle).
// One section per key; its attributes carry the key (data-rule, data-ruleall, data-rulekept, data-rulesec; data-sa…).
const DECIDE = {
  rule: {
    title: 'Out of the presence rule',
    label: 'Out of rule',
    list: () => outOfRuleList(),
    kept: () => ruleKeptList(),
    ask: n => `Remove ${n} photo${n === 1 ? '' : 's'} out of the presence rule?`
  },
  sa: {
    title: 'Share-alike',
    label: 'Share-alike',
    list: () => saList(),
    kept: () => saKeptList(),
    ask: n => `Remove ${n} share-alike photo${n === 1 ? '' : 's'}?`
  }
};
const decActs = (k, kept) =>
  `<span class="adm-qseg" role="group" aria-label="${DECIDE[k].label}"><button type="button" data-${k}="exclude" title="Remove">Remove</button><button type="button" data-${k}="keep" title="Keep" aria-pressed="${kept}">Keep</button></span>`;
const DECIDE_OPEN = {}; // a Kept subsection unfolded, kept across redraws
const decSec = (k, tile) => {
  const L = DECIDE[k].list(),
    K = DECIDE[k].kept(),
    grid = (M, kept) =>
      `<div class="adm-grid adm-qgrid adm-${k}q">${M.map(p => tile(p, decActs(k, kept) + '<a class="chip" href="' + esc(genusHref(p.genus)) + '">Open genus</a>', `<span class="adm-src view">${esc((VIEWS.find(x => x[0] === p.fv) || [, p.fv])[1])}</span>${srcTag(p)}`)).join('')}</div>`;
  if (!L.length && !K.length) return '';
  return `<div class="adm-qhead adm-tdhead" data-${k}sec><h2>${DECIDE[k].title} <small>${L.length}</small></h2>${L.length ? `<button type="button" class="adm-fchip plain" data-${k}all title="Remove all">Remove all</button>` : ''}</div>${L.length ? grid(L, false) : ''}${
    K.length
      ? `<details class="adm-rulekept" data-${k}kept${DECIDE_OPEN[k] ? ' open' : ''}><summary>Kept <small>${K.length}</small></summary>${grid(K, true)}</details>`
      : ''
  }`;
};
function bindDecide(k) {
  $v.querySelectorAll(`.adm-${k}q [data-${k}]`).forEach(
    b =>
      (b.onclick = () => {
        const t = b.closest('[data-f]'),
          f = t.dataset.f;
        if (b.dataset[k] === 'exclude') return ACT.exclude(t.dataset.g, f);
        const S = {...(DRAFT.seen || {})};
        if (S[k + ':' + f]) delete S[k + ':' + f];
        else S[k + ':' + f] = 1;
        DRAFT.seen = S;
        if (!Object.keys(S).length) delete DRAFT.seen;
        saveDraft();
        render();
      })
  );
  const kd = $v.querySelector(`[data-${k}kept]`);
  if (kd) kd.ontoggle = () => (DECIDE_OPEN[k] = kd.open);
  const all = $v.querySelector(`[data-${k}all]`);
  if (all)
    all.onclick = () => {
      const L = DECIDE[k].list();
      if (!L.length || !confirm(DECIDE[k].ask(L.length))) return;
      QUIET = true;
      try {
        L.forEach(p => ACT.exclude(p.genus, p.f));
      } finally {
        QUIET = false;
      }
      render();
      toast(`${L.length} excluded. Undo (Ctrl+Z) brings them back one at a time, or the Excluded view.`);
    };
}
function renderTriage() {
  status();
  // The photos flagged on the site for the subject on screen (flagsOf): a coral one with its genus, a photo of a subject
  // with its own part of the curation (fish) by its photo (fl.file) and unit, once its data is read (fishAdmin).
  const F = flagsOf(DRAFT),
    own = !ASUBJ.admin.cur,
    flagged = Object.keys(F).map(f => ({...((own && PHOTOS[f]) || {genus: F[f].genus || '?'}), f, fl: F[f]}));
  if (!own && flagged.length && !FISHA) fishAdmin();
  const when = t => {
    try {
      return dateText(t, 'dmhm');
    } catch (e) {
      return '';
    }
  };
  const tile = (p, acts, cap) => `<figure class="adm-tile" data-f="${esc(p.f)}" data-g="${esc(p.genus)}">
      <button type="button" class="adm-ph" data-act="zoomx" aria-label="Enlarge">${PHOTOS[p.f] ? `<img src="${img(p, 1)}" alt="" loading="lazy">` : '<span class="none">missing</span>'}</button>
      <figcaption><a class="adm-gen" href="${esc(genusHref(p.genus))}"><i>${esc(p.genus)}</i></a>${cap}</figcaption><div class="adm-acts">${acts}</div></figure>`;
  // A flagged photo still on a genus page gets every tool of that page (Pierre: often flagged for its zoom level), plus Done.
  const flagTile = p => {
    if (!own) return unitFlagTile(p);
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
      .replace('<figcaption>', `<figcaption><a class="adm-gen" href="${esc(genusHref(n))}"><i>${esc(n)}</i></a>${where}`);
  };
  // A flagged photo of a subject with its own part of the curation: the photo, its unit, where it was seen; Remove excludes
  // it for good from that subject's games (autosort.js fishExclude, the × of Photos › Families, by the photo's name:
  // core.js fishPhotos and fishOn honour it, its other copies by their photo id). Both clear the flag; Undo takes either back.
  const unitFlagTile = p => {
    const fp = FISHA && FISHA.ph[p.fl.file || p.f],
      where = `<small class="adm-where">${esc(p.fl.where || '')} · ${esc(when(p.fl.at))}</small>`,
      ph = fp
        ? `<a class="adm-ph" href="${esc(fp.o || '')}" target="_blank" rel="noopener"><img src="${img(fp, 1)}" alt="" loading="lazy"></a>`
        : '<span class="adm-ph none">missing</span>';
    return `<figure class="adm-tile" data-f="${esc(p.f)}">${ph}<figcaption>${p.fl.unit ? repUnit(p.fl.unit) : ''} <small>${esc((fp && fp.t) || '')}</small>${where}</figcaption><div class="adm-acts"><button type="button" data-act="tdrop">Remove</button><button type="button" data-act="tdone">Done</button></div></figure>`;
  };
  // A reported photo: every tool of its genus page, like a flagged one; Done is per report.
  const repTile = (f, g0) => {
    // A fish photo (fishAdmin): the photo, its fish entry and its iNaturalist observation.
    const fp = FISHA && FISHA.ph[f];
    if (fp)
      return `<figure class="adm-tile" data-f="${esc(f)}"><a class="adm-ph" href="${esc(fp.o)}" target="_blank" rel="noopener"><img src="${img(fp, 1)}" alt="" loading="lazy"></a><figcaption>${repUnit(fp.entry)} <small>${esc(fp.t || '')}</small></figcaption></figure>`;
    const n = (PHOTOS[f] || {}).genus || g0,
      q = DATA.gen[n] && [...photos(n), ...pending(n)].find(x => x.f === f);
    if (!q) return tile({...(PHOTOS[f] || {}), f, genus: n}, '', '');
    const cv = coverOf(n);
    SHOWN_COVER = cv && cv.f;
    return tile0(n, q, viewOf(n, q), {cls: hidden(n, q) ? 'is-hidden' : ''})
      .replace('<figure class="adm-tile', `<figure data-g="${esc(n)}" class="adm-tile`)
      .replace(GRIP, '')
      .replace('<figcaption>', `<figcaption><a class="adm-gen" href="${esc(genusHref(n))}"><i>${esc(n)}</i></a>`);
  };
  const reps = repsOpen();
  // A fish report: an old entry id (t01) or a family or genus id (f:, g:; units plan PR 4), or a fish photo (stopgap fi…,
  // FishBase reference fb…, curated candidate fish-…; Codex review #656).
  if (!FISHA && reps.some(r => /^(fi\d|fb|fish-)/.test(r[10] || '') || /^(t\d|f:|g:)/.test(r[5] || ''))) fishAdmin();
  const repCard = r => {
    const [id, t, who, ok, why, g, a, fix, note, m, ph, w] = r,
      play = !/^(photo|sheet|page)$/.test(m),
      // sheet v55: the reports of an account deleted with its answers kept are "~deleted <id>", never verified (Q85)
      gone = /^~deleted /.test(who || ''),
      // sheet v58: a report of an archived record (Players › Archived), its open items kept as such
      arch = ok === 2 || !!(USERS && (USERS.archived || []).some(x => x.name === who));
    return `<article class="adm-rep" data-rep="${esc(id)}"><div class="adm-rephead">${gone ? '<b class="adm-repwho unv">From a removed account</b>' : arch ? `<b class="adm-repwho unv" title="${esc(who)}">From an archived record</b>` : `<b class="adm-repwho${ok ? '' : ' unv'}" title="${ok ? 'Verified' : 'Not verified'}">${esc(who || 'Anonymous')}${ok ? '' : ' ?'}</b>`}
      <span class="adm-repwhy">${esc(why === 'wrong' && !play ? 'Wrong genus' : REP_WHY[why] || why)}</span>${g ? `<span>${repUnit(g)}${a && a !== g ? ` · answered ${repUnit(a)}` : ''}</span>` : ''}${fix ? `<span class="adm-repfix">→ <i>${esc(fix)}</i></span>` : ''}
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
  const all = cur === 'inbox/todo/all';
  if (all && !ANS) loadStats().then(() => cur === 'inbox/todo/all' && render());
  if (all && !EVS) loadEvents().then(() => cur === 'inbox/todo/all' && render());
  $v.innerHTML = `<section class="adm-quality">${all ? healthLine() : ''}
    <div class="adm-qhead"><h2>Reports and feedback <small>${REPS && REPS.rows ? reps.length : ''}</small></h2>${REPS && REPS.err ? `<small class="adm-where">${esc(REPS.err)}</small>` : ''}<button type="button" class="adm-fchip plain" data-rload title="Reload">↻</button></div>
    ${reps.length ? reps.map(repCard).join('') : REPS && REPS.rows ? '<p class="note">Nothing reported.</p>' : ''}
    ${
      repsPR().length
        ? `<details class="adm-repspr"><summary>Handled in a PR <small>${repsPR().length}</small></summary>${repsPR()
            .map(
              r =>
                `<p class="adm-repline"><b>${esc(r[2] || 'Anonymous')}</b> ${esc(REP_WHY[r[4]] || r[4])}${r[5] ? ` · ${repUnit(r[5])}` : ''}${r[8] ? ` · <span class="adm-where">${esc(r[8].slice(0, 80))}</span>` : ''} · <a href="https://github.com/${REPO}/pull/${repPR(r[0])}" target="_blank" rel="noopener">handled in #${repPR(r[0])}</a></p>`
            )
            .join('')}</details>`
        : ''
    }
    <div class="adm-qhead"><h2>Flagged on the site <small>${flagged.length}</small></h2></div>
    ${flagged.length ? `<div class="adm-grid adm-qgrid adm-flagged">${flagged.map(flagTile).join('')}</div>` : '<p class="note">Nothing flagged.</p>'}
    ${all ? evSummary() : ''}
    ${decSec('rule', tile)}
    ${decSec('sa', tile)}
    ${poor.length ? `<div class="adm-qhead"><h2>Featured but rated Poor <small>${poor.length}</small></h2></div><div class="adm-grid adm-qgrid">${poor.map(p => tile(p, '<a class="chip" href="' + esc(genusHref(p.genus)) + '">Open genus</a>', `<span class="adm-src view">${esc((VIEWS.find(x => x[0] === p.fv) || [, p.fv])[1])}</span>`)).join('')}</div>` : ''}
    ${sugHtml(tile)}
  </section>`;
  bindSug();
  bindDecide('rule');
  bindDecide('sa');
  const done = f => {
    const L = {...flagsOf(DRAFT)};
    delete L[f];
    flagsSet(DRAFT, ASUBJ, L);
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
        if (cur === 'inbox/todo/reports' || cur === 'inbox/todo/all') render();
      });
  if (!HANDLEDF) handledLoad().then(() => (cur === 'inbox/todo/reports' || cur === 'inbox/todo/all') && render());
  if (!REPS)
    loadReports().then(() => {
      if (cur === 'inbox/todo/reports' || cur === 'inbox/todo/all') render();
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
  $v.querySelectorAll('[data-act="tdrop"]').forEach(
    b =>
      (b.onclick = () => {
        const f = b.closest('[data-f]').dataset.f;
        DRAFT[ASUBJ.admin.cur] = fishExclude(DRAFT[ASUBJ.admin.cur], (flagsOf(DRAFT)[f] || {}).file || f);
        done(f);
        saveDraft();
        render();
        toast('Excluded. Undo (Ctrl+Z) brings it back.');
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
/* ---------- Points to handle: Inbox › To do › Points, and one page per point ---------- */
// Pierre, 2026-11-05: he settles most open points himself and never reads a text list, so the questions for an IMR
// trainer, nomenclature points, discrepancies between sources and content questions live here. The points are
// points.json (written by agents: id, kind, title, question, context, photos, sources, date; points.js checks its
// shape); his state per point is his curation, curation.json "points" {id: {s, n, a}} (draft, Undo, Publish; never written
// by a script): s 'wait' (stand-by: below the open ones, still shown), 'done' (resolved) or 'drop' (dismissed), both
// folded at the bottom with their counts; no s = open; n his notes; a the trainer's answer per photo (points.js photoKey).
// Each status keeps the file's order, its priority. A point opens on its own page (pointHash), made to show a trainer
// from a phone: the question big, the photos large and enlargeable, blind (numbered, credit only: no names until
// "Names", so the answer is the trainer's own), an answer field under each photo, notes, and Resolved / Stand-by /
// Dismiss (/ Reopen once handled), one click each, Undo the safety net (rule A2).
let PTS = null; // points.json: {kinds, points}, its points with a shape problem left out
const ptList = () => (PTS && PTS.points) || [],
  ptOpen = () => pointsOrder(ptList(), DRAFT.points).open.length,
  ptKind = p => ((PTS && PTS.kinds) || {})[p.kind] || p.kind,
  // A point of another subject than the corals carries that subject's name (one list for every subject).
  ptSubj = p =>
    p.subj === ADM0.id ? '' : `<span class="adm-src adm-ptk">${esc((SUBJECTS.find(s => s.id === p.subj) || {}).name || p.subj)}</span>`,
  // A photo slot: the app's photo (its credit, crop and fallbacks), else the copy points.json keeps, else nothing.
  ptPhoto = x => (x.f && PHOTOS[x.f]) || (x.src ? {...x, f: x.f || x.src, r: 1} : null);
let PT_NAMES = false; // this tab: the photos' names and origins shown on a point's page
// One change to a point's state in the draft: an empty state leaves curation.json.
function ptSet(id, ch) {
  const P = {...(DRAFT.points || {})},
    o = {...(P[id] || {}), ...ch};
  Object.keys(o).forEach(k => (o[k] === '' || o[k] === null || (typeof o[k] === 'object' && !Object.keys(o[k]).length)) && delete o[k]);
  if (Object.keys(o).length) P[id] = o;
  else delete P[id];
  DRAFT.points = P;
  if (!Object.keys(P).length) delete DRAFT.points;
  saveDraft();
}
function renderPoints() {
  status();
  if (!PTS) {
    $v.innerHTML = '<p class="note">No points.json.</p>';
    return;
  }
  const G = pointsOrder(ptList(), DRAFT.points),
    row = p =>
      `<a class="adm-pt" href="${esc(pointHash(p.id))}" data-pt="${esc(p.id)}"><span class="adm-pttitle">${esc(p.title)}</span><span class="adm-ptmeta">${ptSubj(p)}<span class="adm-src adm-ptk k-${esc(p.kind)}">${esc(ptKind(p))}</span><small>${esc(pointAge(p.at))}</small></span></a>`,
    rows = L => `<div class="adm-pts">${L.map(row).join('')}</div>`,
    fold = (k, t) =>
      G[k].length
        ? `<details class="adm-rulekept adm-ptfold" data-ptfold="${k}"${PT_OPEN[k] ? ' open' : ''}><summary>${t} <small>${G[k].length}</small></summary>${rows(G[k])}</details>`
        : '';
  $v.innerHTML = `<section class="adm-ptlist">
    <div class="adm-qhead adm-tdhead" data-ptsec="open"><h2>Open <small>${G.open.length}</small></h2></div>${G.open.length ? rows(G.open) : '<p class="note">Nothing open.</p>'}
    ${G.wait.length ? `<div class="adm-qhead adm-tdhead adm-ptwait" data-ptsec="wait"><h2>Stand-by <small>${G.wait.length}</small></h2></div>${rows(G.wait)}` : ''}
    ${fold('done', 'Resolved')}${fold('drop', 'Dismissed')}
  </section>`;
  $v.querySelectorAll('[data-ptfold]').forEach(d => (d.ontoggle = () => (PT_OPEN[d.dataset.ptfold] = d.open)));
}
const PT_OPEN = {}; // Resolved or Dismissed unfolded, kept across redraws
let ptTimer = null;
function renderPoint(id) {
  status();
  const p = ptList().find(x => x.id === id);
  if (!p) {
    $v.innerHTML = `<p class="note">No point ${esc(id)}. <a href="#inbox/todo/points">Points</a></p>`;
    return;
  }
  const st = (DRAFT.points || {})[id] || {},
    s = ptStatus(DRAFT.points, id),
    A = st.a || {},
    ph = p.photos || [],
    shown = ph.map(ptPhoto),
    // Resolved, Stand-by, Dismiss; Reopen once handled.
    acts = ['done', 'wait', 'drop', ...(s === 'open' ? [] : ['open'])].map(k => PT_STATUS.find(x => x[0] === k)),
    origin = q => ({dauin: 'Dauin', ph: 'Philippines', world: 'abroad'})[q.loc] || '',
    slot = (x, i) => {
      const q = shown[i],
        k = photoKey(x, i);
      return `<figure class="adm-ptph" data-pk="${esc(k)}">${
        q
          ? `<button type="button" class="adm-ph" data-ptz="${i}" aria-label="Enlarge photo ${i + 1}"><img ${crSrc(q)} alt="" loading="lazy"><b class="adm-ptn">${i + 1}</b></button>`
          : `<div class="adm-ph adm-ptnone"><b class="adm-ptn">${i + 1}</b><span>${esc(x.none || 'Photo missing')}</span></div>`
      }<figcaption>${PT_NAMES && q ? `<span class="adm-ptname"><i>${esc(q.t || x.t || '')}</i>${q.genus ? ` · <i>${esc(q.genus)}</i> in the app` : ''}${origin(q) ? ` · ${origin(q)}` : ''}</span>` : ''}${
        !x.none
          ? `<label class="adm-ptans"><span>${esc(p.ask || '')}</span><input type="text" data-pta="${esc(k)}" value="${esc(A[k] || '')}" autocomplete="off"></label>`
          : ''
      }</figcaption></figure>`;
    };
  $v.innerHTML = `<article class="adm-point" data-point="${esc(id)}">
    <div class="adm-ptbar"><a class="adm-link" href="#inbox/todo/points">‹ Points</a><span class="adm-src adm-ptk k-${esc(p.kind)}">${esc(ptKind(p))}</span>${ptSubj(p)}<small>${esc(pointAge(p.at))}</small>${
      ph.some(x => !x.none)
        ? `<button type="button" class="adm-fchip plain" data-ptnames aria-pressed="${PT_NAMES}" title="Names">Names</button>`
        : ''
    }</div>
    <h2 class="adm-ptq">${esc(p.q)}</h2>
    ${ph.length ? `<div class="adm-ptphotos">${ph.map(slot).join('')}</div>` : ''}
    <label class="adm-ptnotes"><span>Notes</span><textarea data-ptn rows="3">${esc(st.n || '')}</textarea></label>
    <span class="adm-qseg adm-lvseg adm-ptst" role="group" aria-label="Status">${acts
      .map(([k, , a]) => `<button type="button" data-pts="${k}" aria-pressed="${k === s}">${a}</button>`)
      .join('')}</span>
    ${(p.ctx || []).length || (p.src || []).length ? `<details class="adm-rulekept adm-ptctx"><summary>Context</summary>${(p.ctx || []).map(c => `<p>${esc(c)}</p>`).join('')}${(p.src || []).length ? `<p class="adm-where">${p.src.map(x => (x.u ? `<a href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.t)}</a>` : esc(x.t))).join(' · ')} · <code>${esc(p.id)}</code></p>` : ''}</details>` : ''}
  </article>`;
  // The enlarged photos: blind (number and credit only) until Names is on; then the admin's full caption.
  const L = shown.map((q, i) => q && {...q, n: i + 1}).filter(Boolean);
  $v.querySelectorAll('[data-ptz]').forEach(
    b =>
      (b.onclick = () =>
        zoomSet(
          L,
          L.findIndex(q => q.n === +b.dataset.ptz + 1),
          q => `${q.n} · ${PT_NAMES ? lbCap(q.genus, q) : esc(q.a || '')}`
        ))
  );
  const nb = $v.querySelector('[data-ptnames]');
  if (nb)
    nb.onclick = () => {
      PT_NAMES = !PT_NAMES;
      render();
    };
  $v.querySelectorAll('[data-pts]').forEach(
    b =>
      (b.onclick = () => {
        ptFlush();
        const k = b.dataset.pts;
        if (k === s) return;
        ptSet(id, {s: k === 'open' ? '' : k, t: k === 'open' ? '' : Date.now()});
        render();
        toast(`${PT_STATUS.find(x => x[0] === k)[1]}. Undo (Ctrl+Z) brings it back.`);
      })
  );
  // Notes and answers: read as typed, written to the draft (one Undo step) a moment after typing stops, at once when the
  // field is left, and before any redraw or status change (ptFlush), so nothing typed is lost.
  let pend = null;
  const grab = () => {
    const a = {...((DRAFT.points || {})[id] || {}).a};
    $v.querySelectorAll('[data-pta]').forEach(x => (a[x.dataset.pta] = x.value.trim()));
    Object.keys(a).forEach(k => !a[k] && delete a[k]);
    pend = {n: ($v.querySelector('[data-ptn]') || {value: ''}).value.trim(), a};
  };
  const write = () => {
    clearTimeout(ptTimer);
    ptTimer = null;
    if (!pend) return;
    const v = pend,
      o = (DRAFT.points || {})[id] || {};
    pend = null;
    if ((o.n || '') === v.n && same(sortKeys(o.a), sortKeys(v.a))) return;
    ptSet(id, v);
    status();
  };
  ptFlush = write;
  $v.querySelectorAll('[data-ptn],[data-pta]').forEach(x => {
    x.oninput = () => {
      grab();
      clearTimeout(ptTimer);
      ptTimer = setTimeout(write, 800);
    };
    x.onchange = () => {
      grab();
      write();
    };
  });
}
const sortKeys = o =>
  Object.keys(o || {})
    .sort()
    .reduce((m, k) => ((m[k] = o[k]), m), {});
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
  // The site's automatic pick (learn.js photoPair): same growth form first, searched in every photo ("x" matches
  // nothing), then nearest the front, then nearest zoom; with no same form, the best pair among the first 6.
  let best = null;
  (fa ? [fa] : LA).forEach((x, i) =>
    (fb ? [fb] : LB).forEach((y, j) => {
      const same = !!fOf(x.f) && fOf(x.f) !== 'x' && fOf(x.f) === fOf(y.f);
      if (!same && (i >= 6 || j >= 6)) return;
      const sc = (same ? 0 : 1e6) + i + j + gap(x, y);
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
// Sources of the swiper: the subject's (core.js SUBJECTS admin csrc, FB.srcs), then All.
let CSRC = store.get('reefid-admin-csrc2', 'dauin'),
  CSKIP = new Set(),
  CFULL = false, // this tab: also show the candidates waiting in full cells
  CASIDE = false, // this tab: also show the candidates the pre-sort set aside
  CREPL = null; // {n, f, w}: adding f to a full cell, choosing the colony it replaces
// Cap per genus x view: capOf (top of the file: CELL_MAX for a game genus, CAP.sheet for a Key-only one). A full
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
// Game genera first (Pierre, 2026-11-03, isGame): the candidates of a Key-only genus come after every candidate of a
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
// a photo of several corals or a Poor one (rules learnt from 85 photos he rejected, judging/BRIEF.md), without any
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
  auChanged = () => !same(DRAFT.auto || {}, SAVED.auto || {}) || !same(DRAFT.retest || {}, SAVED.retest || {}),
  fiChanged = () => !same(fishOut(DRAFT.fish), fishOut(SAVED.fish));
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
        if (!vs.includes(s.view)) return; // a Key-only genus takes no Corallites candidates (capViews)
      }
      plan.push({n, p, s, check: autoCheck(p.f)});
    });
  });
  if (!plan.length) return null;
  // Each cell fills up to its cap (capOf, colonies): source priority first (rule P1, oIdx: IMR, Pierre's own,
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
// The fish auto-sort (admin plan PR 4; autosort.js fishRun): the same path for the fish candidates (fish-cand.json,
// judged in suggest.json "fish" on the judging/FISH.md rubric), into DRAFT.fish, one Undo step, sent by Publish. Runs
// only when the pass has judged fish candidates, so the 2.6 MB candidate list is fetched only then. Never writes "out"
// (Pierre's Not this) and never touches a photo he decided. Its keep agreement (fishCompare, autoState) turns it off.
let FISHC = null; // {cand, species} once loaded
// The fish candidates and species, fetched once (fish-cand.json is 2.6 MB: only when the fish auto-sort has work, or an
// Undo needs a candidate's species).
async function fishLoad() {
  if (FISHC) return FISHC;
  const get = u =>
    fetch(u, {cache: 'no-cache'})
      .then(r => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  const [C, F] = await Promise.all([get('fish-cand.json'), get('fish.json')]);
  return (FISHC = {
    units: fishUnits(F),
    groups: Object.fromEntries(((F.key || {}).groups || []).map(g => [g.n, g.title])),
    cand: C.cand || {},
    species: Object.fromEntries((F.species || []).map(x => [x.id, x])),
    byF: Object.fromEntries(Object.entries(C.cand || {}).flatMap(([sid, L]) => L.map(p => [p.f, {...p, sid}])))
  });
}
async function fishAutoRun() {
  if (!TOKEN || !DRAFT || !Object.keys((SUG && SUG.fish) || {}).length) return null;
  await fishLoad();
  const keepOn = autoState(fishCompare(DRAFT.fish)).keep.on,
    {F, R} = fishRun(FISHC.cand, SUG.fish, FISHC.species, DRAFT.fish, localDay(), keepOn);
  if (F === DRAFT.fish) return R;
  DRAFT.fish = F;
  saveDraft();
  render();
  return R;
}
// One fish auto decision taken back (autosort.js fishUndo): never applied again, the photo is a candidate again. One Undo step.
async function fishAutoUndo(f) {
  const p = (await fishLoad()).byF[f];
  // A candidate no longer in fish-cand.json: its species is unknown, so the add cannot be checked; left to Pierre.
  if (!p) return toast('This photo is no longer a fish candidate: its auto decision cannot be undone here.');
  const F = fishUndo(DRAFT.fish, f, p.sid);
  if (F === DRAFT.fish) return;
  DRAFT.fish = F;
  saveDraft();
  render();
  toast('Fish auto decision undone: the photo waits for you as a candidate.');
}
const fishToast = R =>
  `Fish auto-sort: ${R.add} proposed in, ${R.reject} set aside${R.check ? `, ${R.check} to check` : ''}${R.full ? ` (${R.full} wait: their species is at its target)` : ''}. Publish sends them.`;
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
    E = Object.entries(A),
    // The fish auto-sort's decisions still standing (curation.json fish auto), each undoable here (fishAutoUndo).
    FA = Object.entries(fishIdx(DRAFT.fish)).filter(([, x]) => !x.d.check && !x.d.undone);
  if (!E.length && !FA.length && !Object.keys(DRAFT.retest || {}).length) return '';
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
    return `<div class="adm-auto"><p class="note"><b>Auto</b> ${nAdd} added · ${nOut} set aside · ${nChk} to check · agreement ${AUTO.fields.map(fld).join(' ')}${FA.length ? ` · fish ${FA.filter(([, x]) => x.d.kind === 'a').length} in, ${FA.filter(([, x]) => x.d.kind !== 'a').length} set aside` : ''} <button type="button" class="adm-link" data-adet aria-expanded="${ADET}">${ADET ? 'Hide' : 'Details'}</button></p></div>`;
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
      }
      ${
        FA.length
          ? `<h3 class="label">Fish auto decisions · ${FA.length}</h3><div class="adm-repl-grid">${[...FA]
              .reverse()
              .sort((a, b) => (a[1].day < b[1].day ? 1 : a[1].day > b[1].day ? -1 : 0))
              .slice(0, AALL ? undefined : 30)
              .map(([f, x]) => {
                const p = (FISHC && FISHC.byF[f]) || {f};
                return `<figure class="adm-repl-tile adm-atile" data-ff="${esc(f)}">${p.src ? `<img src="${img(p, 1)}" alt="" loading="lazy">` : ''}<figcaption>${esc(p.t || '')} · ${x.d.kind === 'a' ? 'in' : 'set aside'} · ${x.day}</figcaption><button type="button" class="adm-link" data-faundo>Undo</button></figure>`;
              })
              .join(
                ''
              )}</div>${FA.length > 30 && !AALL ? `<button type="button" class="adm-link" data-aall>All ${FA.length}</button>` : ''}`
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
  // "All N" under the coral and under the fish decisions (Codex review #479: the fish list showed its latest 30 only).
  scope.querySelectorAll('[data-aall]').forEach(
    al =>
      (al.onclick = () => {
        AALL = true;
        render();
      })
  );
  scope.querySelectorAll('[data-af]').forEach(el => {
    const f = el.dataset.af,
      u = el.querySelector('[data-aundo]'),
      z = el.querySelector('[data-azoom]');
    if (u) u.onclick = () => autoUndo(f);
    if (z) z.onclick = () => PHOTOS[f] && zoomOne(PHOTOS[f]);
  });
  scope.querySelectorAll('[data-ff] [data-faundo]').forEach(b => (b.onclick = () => fishAutoUndo(b.closest('[data-ff]').dataset.ff)));
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
      // [text for the tile's title, HTML for the note: the reading as a badge, its raw value in the badge's title].
      c.why.push([
        `recognised by ${recPct(c.d)} (difficulty ${rawNum(c.d)}), like another colony`,
        `recognised by ${recBadge(c.d, {short: 1, of: 'its photos', raw: 'mean photo difficulty'})}, like another colony`
      ]);
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
    <p class="note">${cols.length} colonies in the games (cap ${capOf(n)}) · replace which one?${sug ? ` Suggested: the first one${sug.why.length ? ` (${sug.why.map(x => (Array.isArray(x) ? x[1] : esc(x))).join(', ')})` : ''}, for the most variety; any other works too.` : ' Every colony is one to keep (sheet references, IMR, your photos, a growth form shown once): choose, or add anyway.'}</p>
    <figure class="adm-repl-new"><img ${crSrc(p)} alt=""><figcaption>New: ${esc(p.t || f)}</figcaption></figure>
    <div class="adm-repl-grid">${cols
      .map(
        c => `<button type="button" class="adm-repl-tile${c === sug ? ' sug' : ''}" data-repl="${esc(c.k)}" title="${esc(c.keep ? 'Kept: ' + c.keep : c.why.map(x => (Array.isArray(x) ? x[0] : x)).join(', ') || 'Nothing against it')}"><img src="${img(c.L[0], 1)}" alt="" loading="lazy">
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
    const s = FB.srcs()
      .map(([k]) => k)
      .find(k => candQueue(k).filter(shown).length);
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
    FB.sources(CSRC, s => (s === CSRC ? live.length : candQueue(s).filter(shown).length)) +
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
            ? `<span class="adm-chip adm-cjudge" title="Ask your agent for the candidate pass (judging/BRIEF.md)">${nJ} not judged yet</span>`
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
        <a class="adm-swg" href="${esc(genusHref(n))}" title="Genus page"><i>${esc(n)}</i>${p.from ? `<small>from ${esc(p.from)}</small>` : ''}</a>
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
  bindBar($v, {redraw: render, src: true});
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
      if (
        cur !== 'photos/candidates' ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.target.closest('input,textarea,select') ||
        !$('lightbox').hidden
      )
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
  const fish = fishOut(DRAFT.fish);
  // Pierre's state of the points to handle (To do › Points): by point id, each point's fields sorted.
  const points = {};
  Object.keys(DRAFT.points || {})
    .sort()
    .forEach(k => {
      const o = DRAFT.points[k] || {};
      if (Object.keys(o).length) points[k] = {...sorted(o), ...(o.a ? {a: sorted(o.a)} : {})};
    });
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
    ...(Object.keys(retest).length ? {retest} : {}),
    ...(Object.keys(fish).length ? {fish} : {}),
    ...(Object.keys(points).length ? {points} : {})
  };
};
// curation.json "fish" as published (autosort.js "Fish curation"): each map sorted by key, empty maps left out, the
// auto log one sorted map per day, as the coral keys.
function fishOut(F) {
  const out = {};
  Object.keys(F || {})
    .sort()
    .forEach(k => {
      const m = F[k];
      if (!m || typeof m !== 'object' || Array.isArray(m)) return;
      const o = {};
      Object.keys(m)
        .sort()
        .forEach(x => {
          const v = m[x];
          if (k === 'auto') {
            if (v && Object.keys(v).length)
              o[x] = Object.fromEntries(
                Object.keys(v)
                  .sort()
                  .map(f => [f, v[f]])
              );
          } else if (v != null) o[x] = v;
        });
      if (Object.keys(o).length) out[k] = o;
    });
  return out;
}
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
    [nDiff(DRAFT.retest, SAVED.retest), 'retest'],
    // Fish (curation.json "fish"): the photos in play, set aside or marked Not this, and the fish auto-sort's decisions.
    [nDiff((DRAFT.fish || {}).add, (SAVED.fish || {}).add), 'fish photo in play'],
    [
      nDiff((DRAFT.fish || {}).seen, (SAVED.fish || {}).seen) + nDiff((DRAFT.fish || {}).exclude, (SAVED.fish || {}).exclude),
      'fish photo set aside'
    ],
    [nDiff((DRAFT.fish || {}).out, (SAVED.fish || {}).out), 'fish photo not this species'],
    // A fish family's own choices (Photos › Families: cover, featured, Validated; curation.json fish genera).
    [nDiff((DRAFT.fish || {}).genera, (SAVED.fish || {}).genera), 'fish family'],
    [nDiff((DRAFT.fish || {}).flag, (SAVED.fish || {}).flag), 'fish triage flag'],
    [nDiff(...[DRAFT, SAVED].map(c => untimed(Object.assign({}, ...Object.values((c.fish || {}).auto || {}))))), 'fish auto-sort decision'],
    [nDiff(DRAFT.points, SAVED.points), 'point to handle']
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
    au = auChanged(),
    fi = fiChanged(),
    pt = ptChanged();
  if (!(ch.length || q || x || bk || fm || fl || sg || cd || mt || cr || sn || tl || au || fi || pt) || !TOKEN) return;
  if (!confirm(`Publish to the public site?\n\n${pubSummary()}`)) return;
  const b = $('save');
  b.disabled = true;
  b.textContent = 'Publishing…';
  const conf = [];
  // Never overwrite what was published from elsewhere since this page loaded: re-read it and merge first.
  const fresh = async () => {
    const f = await ghFile(FILE);
    if (f && f.sha !== SHA) {
      conf.push(...rebase(JSON.parse(f.text)));
      SHA = f.sha;
    }
  };
  try {
    await fresh();
    const msg = `Photo curation: ${[...ch.slice(0, 6), ...(q ? ['quality ratings'] : []), ...(fm ? ['growth forms'] : []), ...(x ? ['exclusions'] : []), ...(fl ? ['triage flags'] : []), ...(sg ? ['triage suggestions'] : []), ...(cd ? ['candidate reviews'] : []), ...(mt ? ['look-alike montages'] : []), ...(cr ? ['crops'] : []), ...(sn ? ['several corals'] : []), ...(tl ? ['growth-form tile photos'] : []), ...(au ? ['auto-sort'] : []), ...(fi ? ['fish curation'] : []), ...(pt ? ['points to handle'] : []), ...(bk ? [`Coral Finder book photos ${bookOn(DRAFT) ? 'on' : 'off'}`] : [])].join(', ')}${ch.length > 6 ? ` and ${ch.length - 6} more genera` : ''}`;
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
    let PJ;
    [DATA, AUTOQ, AUTOF, FU0, PICKS, SUG, , DUPS, CJ, METRICS, PRES, NAMES, PJ] = await Promise.all([
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
      side('metrics.json', 'm'),
      // The presence rule per photo species (tools/coral_presence.py; rule C8): the "out of rule" flag.
      side('presence.json', 'sp'),
      // Former names and iNaturalist spellings (the extract tools/taxonomy.py writes of its reference file): the name tag.
      side('names.json', ADM0.id),
      // The points to handle (To do › Points), written by agents; a point with a shape problem is left out.
      fetch('points.json?v=1', {cache: 'no-cache'})
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null)
    ]);
    if (PJ && Array.isArray(PJ.points))
      PTS = {
        kinds: PJ.kinds || {},
        points: PJ.points.filter(
          x =>
            !pointsProblems(
              {kinds: PJ.kinds, points: [x]},
              SUBJECTS.map(s => s.id)
            ).length
        )
      };
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
  fishAutoRun().then(R => {
    if (R && R.add + R.reject + R.check) setTimeout(() => toast(fishToast(R)), keep || ar ? 8000 : 0);
  });
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
  // The page opens on Players › Activity, the recent sessions, phone and desktop (Pierre, 2026-11-05: what he looks at
  // first; Players › List from 2026-11-04, the candidates or the first genus before).
  readHash();
  // An address says its subject, so Back, Forward and a typed or bookmarked coral address keep theirs (Codex review
  // #492). A link without a prefix clicked on a subject's page (a player's journey from Players) is given that
  // subject's prefix when the subject has the page, as it is clicked; the switch's own links carry their subject, and so
  // does a link that names its subject itself (data-own: a journey link on the list of players, a journey's own toggle),
  // and a shared page's link keeps no prefix (SHARED).
  document.addEventListener(
    'click',
    e => {
      const a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.closest('#subj') || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      let h = a.getAttribute('href').slice(1).split('?')[0];
      try {
        h = decodeURIComponent(h);
      } catch (e) {}
      const [S, page] = subjOfHash(h);
      if (S !== ADM0 || ASUBJ === ADM0 || !ASUBJ.admin.pages || shared(page) || a.hasAttribute('data-own') || !hasPage(ASUBJ, page)) return;
      e.preventDefault();
      location.hash = ASUBJ.hash + admAddr(page);
    },
    true
  );
  window.onhashchange = () => {
    if (UPDATED && !draftLost) return location.reload(); // a new version took over: loaded on the way to the next page
    readHash();
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
  // A note or answer typed on a point's page in the last 0.8 s reaches the draft when the page is left or hidden (a reload,
  // a closed tab, a phone sending the browser to the background: Codex review #571).
  addEventListener('pagehide', () => ptFlush());
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && ptFlush());
  window.onbeforeunload = e => {
    ptFlush();
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
// The landing page's sheet reads leave with the token (sheetEarly), after this script has run (a microtask: its let
// names exist then). A token refused drops them all, so nothing read with it is kept.
const EARLY_ALL = ['ans', 'stats', 'users', 'pages', 'events', 'reports'];
const early = () => queueMicrotask(() => TOKEN && sheetEarly((([S, p]) => admRoute(p, S))(subjOfHash(hashNow()))));
(async () => {
  if (DEMO) {
    TOKEN = 'demo';
    const pv = $('preview');
    if (pv) pv.hidden = true; // the site's ?draft preview reads the real draft, not the demo's
    early();
    return start();
  }
  if (/[?&]readonly\b/.test(location.search)) return start();
  const t = sess.get();
  if (t) {
    TOKEN = t;
    early();
    try {
      await checkToken();
      return start();
    } catch (x) {
      TOKEN = null;
      sheetAgain(...EARLY_ALL);
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
      if (cur === 'photos/review/by-difficulty') render();
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
    <figcaption><a class="adm-gen" href="${esc(genusHref(p.genus))}"><i>${esc(p.genus)}</i></a><span class="adm-src view">${vl(p.view)}</span>${qTag(p)}${recBadge(d, {short: 1, raw: 'photo difficulty'})}<span class="adm-src" title="Answers that rated it · right (weighed by experience)">${nAns(S[p.f])} · ${pct(r, n)} right</span></figcaption>
    <div class="adm-acts">${qSeg(p)}</div></figure>`;
  };
  $v.innerHTML = `<section class="adm-quality"><div class="adm-shead"><h2>Photos by difficulty</h2>${segBtns('min', [
    [1, '≥1'],
    [3, '≥3'],
    [10, '≥10']
  ])}<span class="note">answers</span>
    <span class="adm-qseg adm-sseg" role="group" aria-label="Order"><button type="button" data-do="hard" aria-pressed="${DIFF_ORDER === 'hard'}">Hardest</button><button type="button" data-do="easy" aria-pressed="${DIFF_ORDER === 'easy'}">Easiest</button></span></div>
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
  ['keyonly', 'Key-only genus'],
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
        ? 'keyonly'
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
      if (cur === 'photos/stats/overview') render();
    });
    return;
  }
  const {G, per, play, st, off} = poolStats(),
    R = G.map(n => per[n]),
    gk = distOf(R.map(r => r.k)),
    go = distOf(R.map(r => r.obs.size)),
    colonies = R.reduce((t, r) => t + r.obs.size, 0),
    withAny = R.filter(r => r.k).length,
    gen = n => `<a class="adm-gen" href="${esc(genusHref(n))}"><i>${esc(n)}</i></a>`;
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
// Coral Finder book photo, no multi-coral, hidden or "sheet only" photo. Poor photos count (Pierre: realistic like ReefCloud
// images; the players' answers rate how hard they are). The Colony slot never takes a photo whose growth form is not visible (photoSet in app.js). Diversity = distinct colonies
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
      // Key-only genus is not played: its Needs ID colonies count, as in tools/fetch_local.py colonies().
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
// Key-only genus (Pierre, 2026-11-03). A 2-level genus's macro view is its Close-up (label), so it stays.
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
      r => `<tr data-g="${esc(r.n)}"><th scope="row"><a href="${esc(genusHref(r.n))}"><i>${esc(r.n)}</i></a>${DATA.gen[r.n].n ? '' : DATA.gen[r.n].x ? ' <small class="kcov-x">not IMR</small>' : ' <small>★</small>'}</th>${r.cells.map((c, j) => cell(r, c, VIEWS[j][0])).join('')}
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
        if (!e.target.closest('a')) location.hash = genusHref(tr.dataset.g);
      })
  );
  lookBanner();
}
// Where to look (Pierre, 2026-11-03: a banner above the Games grid, no longer a page of its own): the few genus x view
// cells most worth a candidate search now, ranked as in the full list (needsOf: most reasons first, then fewest
// colonies); "All N" opens the full list in the banner (?look=all: reason cards, view and genus filters, sort).
// It needs the answer log: the grid shows at once, the banner once the log is loaded.
const LOOK_N = 5;
function lookBanner() {
  const el = $v.querySelector('#cov-look');
  if (!el) return;
  if (!ANS) {
    el.innerHTML = '<p class="note">Loading…</p>';
    loadStats().then(() => cur === 'inbox/coverage/games' && lookBanner());
    return;
  }
  if (lookAll()) {
    el.classList.add('open');
    return statsNeeds(el);
  }
  const VO = {wide: 0, medium: 1, macro: 2, zoom: 3},
    L = (NEEDS = needsOf()).slice().sort((a, b) => b.sc - a.sc || a.c.obs - b.c.obs || a.n.localeCompare(b.n) || VO[a.v] - VO[b.v]);
  el.innerHTML = L.length
    ? `<div class="cov-lookb"><a class="cov-lookt" href="#inbox/coverage/games?look=all" title="Where to look for photos: the full list">Where to look</a>${L.slice(
        0,
        LOOK_N
      )
        .map(
          o =>
            `<a class="cov-lk" href="${esc(genusHref(encodeURIComponent(o.n)))}" title="${esc(o.why.map(w => w[1] + (w[2] ? ` (${w[2]})` : '')).join(' · '))}"><i>${esc(o.n)}</i> ${esc(o.vt)} <small>${esc(o.why.map(w => NEED_T[w[0]]).join(', '))}</small></a>`
        )
        .join('')}<a class="adm-link" href="#inbox/coverage/games?look=all">All ${L.length} ›</a></div>`
    : '';
}

// Sheets & ID Key coverage (Pierre 2026-11-01): what the Coral ID Key can show per genus, the IMR genera and the book's
// extra genera present at Dauin. Pool = every photo of the view not hidden, not multi-coral, approved CF book photos
// included; colour = distinct colonies with a photo that is not Poor; Forms = growth forms seen (Colony + Closer);
// Species = distinct species named on the photos.
let KCOV = Object.assign({set: 'all', order: 'thin', col: '', dir: 'asc'}, store.get('reefid-admin-kcov', {}));
function renderKcov() {
  status();
  const isX = n => !!(DATA.x && DATA.x.gen[n]);
  const names = Object.keys(DATA.gen).filter(n => KCOV.set === 'all' || (KCOV.set === 'x') === isX(n));
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
  R.sort(by[KCOV.order] || by.thin);
  colSort(KCOV, R);
  const thin = R.reduce((s, r) => s + r.cells.filter(c => c && covLvl(c) < 2).length, 0);
  // A Key-only genus's Colony and Close-up cells under its cap (capOf, colonies counted as in Candidates): outlined
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
    `<span class="adm-qseg adm-lvseg" role="group">${L.map(([v, t]) => `<button type="button" data-fc="${k}" data-v="${v}" aria-pressed="${KCOV[k] === v && !(k === 'order' && KCOV.col)}">${t}</button>`).join('')}</span>`;
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
    <table class="cov-t kcov-t"><thead><tr><th></th>${colTh(KCOV)}<th class="kcov-fh">Forms</th><th class="kcov-sh">Species</th><th title="Candidates waiting in Candidates, by source (Coral Finder book photos not counted)">+</th></tr></thead>
    <tbody>${R.map(
      r => `<tr data-g="${esc(r.n)}"><th scope="row"><a href="${esc(genusHref(r.n))}"><i>${esc(r.n)}</i></a>${r.x ? ' <small class="kcov-x">not IMR</small>' : ''}</th>${r.cells.map((c, j) => cell(r, c, VIEWS[j][0])).join('')}
      <td class="kcov-f">${r.forms.map(f => `<span class="adm-why" title="${esc(fName(f))}">${FABBR[f]}</span>`).join(' ') || '<span title="No growth form set on these photos yet">–</span>'}</td>
      <td class="kcov-s" title="${esc(r.sp.join(', '))}">${r.sp.length || '–'}</td><td class="cov-cand" title="${r.cand} candidate${r.cand === 1 ? '' : 's'}${CAND_SRC.filter(
        ([k]) => r.cby[k]
      )
        .map(([k, , l]) => ` · ${l} ${r.cby[k]}`)
        .join('')}">${CAND_SRC.filter(([k]) => r.cby[k])
        .map(([k, s]) => `<span class="o-${k}">${s} ${r.cby[k]}</span>`)
        .join('')}</td></tr>`
    ).join('')}</tbody></table></section>`;
  bindCol(KCOV, () => store.set('reefid-admin-kcov', KCOV));
  $v.querySelectorAll('[data-fc]').forEach(
    b =>
      (b.onclick = () => {
        KCOV[b.dataset.fc] = b.dataset.v;
        if (b.dataset.fc === 'order') KCOV.col = '';
        store.set('reefid-admin-kcov', KCOV);
        render();
      })
  );
  $v.querySelectorAll('tbody tr').forEach(
    tr =>
      (tr.onclick = e => {
        if (!e.target.closest('a')) location.hash = genusHref(tr.dataset.g);
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
      <figcaption><a class="adm-gen" href="${esc(genusHref(encodeURIComponent(n)))}"><i>${esc(n)}</i></a>${p.gone ? `<code class="adm-t">${esc(p.f)}</code>` : `<span class="adm-src view">${esc(label(n, viewOf(n, p)))}</span>${srcTag(p)}`}</figcaption>
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
// The views of Activity, Photo stats, To do › Health and the live Analyses views (LIVE_STATS); their tab and view switch are in #subnav (navs()).
let ANS = null,
  RAS = {},
  GD = {}, // the genus offsets of the hierarchical photo Elo (?stats=1 gd, sheet v31): {genus: [offset, weighed answers]}
  SMEM = memOf(null),
  SCONF = {},
  SFMT = {},
  MEID = null,
  SF = Object.assign({min: 1, nk: '', nv: 'all', ns: 'sc', nd: 'desc'}, store.get('reefid-admin-stats', {}));
// Numbers replayed over the whole answer log (playSplit, levelMargin, confusionOf): once per log loaded, not at every
// render, sort or filter click (Pierre, 2026-11-03: admin pages load slower and slower, and the log keeps growing). ANS is
// replaced, never changed in place, whenever the log is loaded again.
let ANS_MEMO = {a: null, m: {}};
const ofAns = (k, fn) => {
  if (ANS_MEMO.a !== ANS) ANS_MEMO = {a: ANS, m: {}};
  return k in ANS_MEMO.m ? ANS_MEMO.m[k] : (ANS_MEMO.m[k] = fn());
};
// Reads of the sync sheet, one per kind on its way at a time (Pierre, 2026-11-04: admin pages load slowly; To do read the
// whole answer log three times at once, each render before the first reply starting another): sheetRead(k, go) gives the
// read k on its way, or starts it with go(fresh), whose reply is used only while fresh() (the read was not dropped since).
// sheetAgain(...kinds) is ↻ and the account actions: what they name is forgotten and read again, a read of it still on
// its way dropped (its late reply ignored). Kinds: ans (the answer log), stats (photo ratings, levels), users (the player
// list), pages (pages opened), events, reports.
const SHEET_READS = {},
  SHEET_GEN = {};
function sheetRead(k, go) {
  if (SHEET_READS[k]) return SHEET_READS[k];
  const g = (SHEET_GEN[k] = (SHEET_GEN[k] || 0) + 1),
    p = Promise.resolve()
      .then(() => go(() => SHEET_GEN[k] === g))
      .finally(() => {
        if (SHEET_READS[k] === p) delete SHEET_READS[k];
      });
  return (SHEET_READS[k] = p);
}
// sheetDrop(k): a read of k on its way is dropped (force: a new read starts, what is shown stays until it is in).
function sheetDrop(k) {
  delete SHEET_READS[k];
  SHEET_GEN[k] = (SHEET_GEN[k] || 0) + 1;
}
function sheetAgain(...kinds) {
  kinds.forEach(k => {
    sheetDrop(k);
    if (k === 'ans') ANS = null;
    else if (k === 'stats') STATS = null;
    else if (k === 'users') USERS = null;
    else if (k === 'pages') PGS = null;
    else if (k === 'events') EVS = null;
    else if (k === 'reports') REPS = null;
  });
}
// The reads the landing page needs leave as soon as the token is known, in parallel with the token check and start()'s
// data files, which they do not need (Pierre, 2026-11-04: they waited for both, about 1.5 s on a phone); the page then
// finds them on their way (sheetRead). Called once the script has run (its let names exist).
function sheetEarly(h) {
  const need =
    h === 'players/list'
      ? ['users', 'ans', 'pages']
      : /^players\/list\/(journey|anon)\//.test(h)
        ? ['users', 'ans', 'pages']
        : h === 'players/activity'
          ? ['users', 'ans']
          : h === 'analyses/learning/stops'
            ? ['ans', 'pages']
            : h === 'inbox/todo/all'
              ? ['ans', 'events', 'reports']
              : h === 'inbox/todo/reports'
                ? ['reports']
                : h === 'inbox/todo/errors'
                  ? ['events']
                  : LIVE_STATS.includes(h) || ['inbox/coverage/games', 'inbox/todo/health'].includes(h)
                    ? ['ans']
                    : h === 'photos/stats/overview'
                      ? ['ratings']
                      : [];
  const go = {
    ans: () => loadStats(),
    ratings: () => loadStats(true),
    users: loadUsers,
    pages: loadPages,
    events: loadEvents,
    reports: loadReports
  };
  need.forEach(k => Promise.resolve(go[k]()).catch(() => {}));
}
// ratingsOnly (Photo stats › Overview): the photo ratings alone (?stats=1), not the whole answer log.
function loadStats(ratingsOnly) {
  // Script v6 keeps the anonymous-id salt secret and returns the caller's own id (me) for its name and code; the
  // local digest below only matches script v5 and older.
  const sy = store.get('reefid-account', null) || {},
    me = sy.name;
  const digest = me
    ? crypto.subtle
        // The app's old id is the anonymous ids' salt (Code.gs SALT), kept through the rename: the ids must not change.
        .digest('SHA-256', new TextEncoder().encode(`imr-coral-id|anon|${me.trim().toLowerCase()}`)) // rename-app: keep
        .then(b => {
          MEID = btoa(String.fromCharCode(...new Uint8Array(b))).slice(0, 8);
        })
        .catch(() => {})
    : Promise.resolve();
  // av: never taken for an app from before 2026-11-03 (sheet v25 logs a photo stats read without it as 'old': each
  // read-only visit of this page did, 2026-11-05).
  const get = q =>
    fetch(SYNC_URL + q + '&av=admin')
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
  // The answer log and the photo ratings are two reads, each reused while on its way (sheetRead): a page drawn again
  // before they are in, or another page asking for them, starts no second read.
  const gs = STATS
    ? null
    : sheetRead('stats', fresh =>
        (TOKEN ? post({readStats: 1}).then(j => old(j, '?stats=1')) : get('?stats=1')).then(s => {
          if (!fresh() || !s) return;
          STATS = s.ok ? s.photos || {} : {};
          RAS = s.ok ? s.ras || {} : {};
          GD = (s.ok && s.gd) || {};
          // The photo memory offsets and pooled confusions the app plays with (its PMEM, PCONF), for the full replay.
          SMEM = memOf(s.ok && s.mem);
          SCONF = (s.ok && s.conf) || {};
          SFMT = s.ok ? fmtsOf(s) : {}; // the per-format offsets (sheet v68, core.js fmtOffsetsOf), as the app's PFMT
        })
      );
  const ga = ratingsOnly
    ? null
    : sheetRead('ans', fresh =>
        Promise.all([
          TOKEN
            ? post({readAnswers: 1, ...(me && sy.pin ? {aname: me, apin: sy.pin} : {})}).then(j => old(j, '?answers=1' + who))
            : {ok: false, error: 'token'},
          digest,
          // The answer log is published with the photo ratings, never before them (Codex review #488): the pages that
          // read it (Health, To do's Health line) take the ratings as read with it.
          gs
        ]).then(([a]) => {
          if (!fresh()) return;
          if (a && a.me) MEID = a.me;
          ANS = a && a.ok && a.rows ? a : {old: true, v: a && a.v, err: a && a.error, rows: [], players: {}};
          // Every page reads the replayed subject's answers (the corals'; core.js subjRows, sheet v60 logs every subject's):
          // a fish answer counts in no coral page, Health, journey or analysis. ANS.all keeps every subject's rows.
          ANS.all = ANS.rows;
          ANS.rows = subjRows(ANS.all);
          ANS.at = Date.now(); // when it was read (Recent sessions: "as of")
        })
      );
  return Promise.all([ga, gs, digest]).then(() => {});
}
// "you" beside the account this browser is signed in with (MEID): a mark only. Every account counts in every page
// (Pierre, 2026-11-04: his account is a real player's; the switches that left his own answers out, and the list of his
// other accounts, are gone, and no page leaves anyone's answers out, the leaderboard's "hidden" included).
const isMe = id => !!id && id === MEID;
// Answers that rated a photo (sheet v18's 4th field); the weighed count before v18. The filters use it: a photo answered
// once weighs under 1 (n / (n + 10)) and "≥1" hid it (Pierre, 2026-11-02: only ~100 photos of the ~300 answered).
const nAns = s => (s ? (s[3] ?? s[1]) : 0);
// The photo ratings: the sheet's ?stats=1, the ones the games use.
const photoStats = () => STATS;
const pct = (r, n) => (n ? Math.round((100 * r) / n) + '%' : '–');
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
// A difficulty or Elo reading (recBadge, eloText) on a touch screen, where no title shows: a tap shows its title (the raw
// value) in the toast, and goes no further (the row or tile it sits in does not open).
$v.addEventListener(
  'click',
  e => {
    const r = e.target.closest && e.target.closest('.adm-rec[title], .adm-elo[title]');
    if (!r || !matchMedia('(hover: none)').matches) return;
    e.stopPropagation();
    e.preventDefault();
    toast(r.title);
  },
  true
);
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
  // An unfolded session's panel is as wide as the visible part of the table's scroll box (.adm-sess, --sw), never past it.
  const rsc = $v.querySelector('.adm-recent .adm-tscroll');
  if (rsc) rsc.style.setProperty('--sw', rsc.clientWidth + 'px');
  // Recent sessions: a tap (or Enter / Space) on a session unfolds its summary, again folds it; its player's link opens
  // the Journey as before.
  $v.querySelectorAll('[data-sopen]').forEach(tr => {
    const flip = () => {
      const k = tr.dataset.sopen;
      SOPEN.has(k) ? SOPEN.delete(k) : SOPEN.add(k);
      render();
    };
    tr.onclick = e => !e.target.closest('a, button') && flip();
    tr.onkeydown = e => {
      if (e.target === tr && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        const k = tr.dataset.sopen;
        flip();
        const back = [...$v.querySelectorAll('[data-sopen]')].find(x => x.dataset.sopen === k);
        if (back) back.focus({preventScroll: true});
      }
    };
  });
  // ↻ on Activity: the answer log and the player list read again (who is playing now), the photo ratings kept. A manual
  // reload only, no timer: each read sends the whole answer log (docs/ARCHITECTURE.md "Recent sessions and who is playing now").
  const rl = $v.querySelector('[data-sload]');
  if (rl)
    rl.onclick = () => {
      sheetAgain('ans', 'users', 'pages'); // the pages opened too (Stops, Journey)
      // An unfolded session's player's saved copy too (achievements, cards, learned genera follow the new answers; Codex
      // review #557), as the Players and Journey ↻ do.
      savedClear();
      render();
    };
}
// Users, a header tab of its own (Pierre, 2026-11-01: "now that beta testers come, I need to see and manage them"; not under Stats, it manages players): every player who signed in,
// by name, with their numbers, from sheet script v11 (POST {users: 1, token}; names, so the admin token is checked like
// for reports). Merge = two names of one person: the progress is merged here (core.js mergeUsers: answers add up, the
// busier account's model per genus), then the sheet relabels the answers and reports and deletes the other name.
// Delete (sheet v55, Pierre 2026-11-05, Q85/Q89: two named choices, no default): "Delete everything" (a test account, or
// a player who asked: answers and reports too) or "Delete, keep answers anonymously" (answers and reports stay without
// the name: the answers only rate the photos, the reports read "from a removed account"); nothing else of the account
// stays in normal operation either way (Code.gs deleteAccount_).
// Both are permanent, so both ask first; a device still signed in with the old name is told and asked to sign out.
let USERS = null,
  usersAt = 0,
  uOpen = null,
  uDel = ''; // the player whose two delete choices show in their bar
function loadUsers(force) {
  if (!force && USERS && Date.now() - usersAt < 120000) return Promise.resolve(USERS);
  if (!TOKEN) {
    USERS = {err: 'Needs the GitHub token'};
    return Promise.resolve(USERS);
  }
  if (force) sheetDrop('users');
  return sheetRead('users', fresh =>
    fetch(SYNC_URL, {method: 'POST', body: JSON.stringify({users: 1, token: TOKEN})})
      .then(r => r.json())
      .then(j => {
        if (!fresh()) return USERS;
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
      .catch(() => (fresh() ? (USERS = {err: 'Offline'}) : USERS))
  );
}
// A player's saved data (userData) is read with the new key names whichever app saved it (core.js keysIn, rename to
// IMR Reef ID 2026-11-03); a merged record goes back with the old names too (withLegacy), as the app sends it.
const userPost = body =>
  fetch(SYNC_URL, {method: 'POST', body: JSON.stringify({...body, token: TOKEN})})
    .then(r => r.json())
    .then(j => {
      if (j && j.data) j.data = keysIn(j.data);
      return j;
    });
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
          reset: P('reefid-sync-coral-reset'),
          ach: P('reefid-sync-ach') // achievements {id: time} (progress.js ACHK): a session's summary (sessionSummary)
        };
      })
      .catch(() => gen === savedGen && (PSAVED[name] = {err: 'unreachable'}))
      .then(() => {
        savedRun--;
        savedPump();
        if (
          gen === savedGen &&
          (cur === 'players/list/journey/' + name ||
            (cur === 'players/list' && !savedRun && !savedQ.length) ||
            (cur === 'players/activity' && SOPEN.size))
        )
          render();
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
// Only from sheet script v28 (core.js RV_SHEET; rule D4: the admin never gets ahead of the script): before it the
// players' apps keep their own progress, so the admin shows what it did before: the sheet's Learned column, no Progress
// column, and the Journey's learned genera from the saved copy as it is ({off: 1, G: the saved progress}).
const replayOn = () => Math.max((ANS && ANS.v) || 0, (USERS && USERS.v) || 0) >= RV_SHEET;
// The domain-score bar (core.js DOM) in the admin's replays only from the script that replays it (core.js DOM_SHEET; rule
// D4), with the sheet's genus offsets (?stats=1 gd) for the rows logged without them; before, the moving average.
const domReplay = () => ({dom: Math.max((ANS && ANS.v) || 0, (USERS && USERS.v) || 0) >= DOM_SHEET, gd: GD});
const PROGM = new Map();
let ROWSBY = null;
// From sheet script v42 (RP_SHEET; Pierre, 2026-11-04: Players read every player's saved copy, one sheet call each, 4 at a
// time, about 15 s on a phone for 40 players) the player list carries that same replay, computed by the sheet (Code.gs
// replayedAll_: rp = [progress %, learned, the saved copy's %]), and Players reads no saved copy. The Journey (full) still
// replays here: it shows the replayed record genus by genus. A player without rp (the sheet could not read data.json or
// their copy) is replayed here as before.
const RP_SHEET = 42;
const rpOn = () => ((USERS && USERS.v) || 0) >= RP_SHEET;
function progOf(u, full) {
  if (!ANS || !DATA || !u || !u.id) return null;
  if (!full && !u.anon && rpOn() && Array.isArray(u.rp) && replayOn()) {
    const [pct, learned, spct] = u.rp;
    return {
      pct,
      learned,
      total: slateOf(DATA).length,
      saved: {pct: spct, learned: u.learned},
      stale: spct !== pct || u.learned !== learned
    };
  }
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
      fmt: SFMT,
      ...domReplay(),
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
// The list of players, one page for every subject (Pierre, 2026-11-06: "the players list must not depend on Corals or
// Fish: it is independent of the game mode, the same page that doesn't change between the two worlds"; "maybe fish
// columns and coral columns, but there may be too much: Journey has the details"): the player's own columns (UCOLS),
// then a group of columns per subject (SCOLS). Elo, the quiz's right shares, Duels, Days, Learned and the units seen are
// on the player's Journey (its numbers at the top, per subject); Reports on the row's bar.
const UCOLS = [
  ['name', 'Name', u => u.name.toLowerCase(), 1],
  // Last answer, any subject (Pierre, 2026-11-03: who played most recently, seen on a phone without scrolling sideways),
  // to the minute, sorted by its exact time; the default sort, most recent first.
  ['last', 'Last', u => u.at || 0, 0, `Last answer, any subject (now = less than ${RECENT.NOW} minutes ago)`],
  // The devices they used: the distinct devices of their pages-opened summaries (sheet v30 Pages, loadPages).
  ['dev', 'Devices', u => devsOf(u) ?? -1, 0, 'Devices they opened the app on (from the pages-opened summaries)'],
  ['groups', 'Groups', u => (u.groups || []).length, 0, 'The beta groups they are in']
];
// A subject's group: [key, title, sort value (u, S), ascending first, tip (S), cell (u, S), shown for S]. sxOf(u, S): the
// player's answers in S ({n, ok, at, s: sessions, len: their median length in minutes}), from the answer log.
const SCOLS = [
  ['n', 'Answers', (u, S) => sxOf(u, S).n, 0, S => `Answers in ${S.name}`, (u, S) => sxOf(u, S).n || '–', () => true],
  [
    'right',
    'Right',
    (u, S) => (x => (x.n ? x.ok / x.n : -1))(sxOf(u, S)),
    0,
    S => `Right answers in ${S.name}, every game`,
    (u, S) => (x => (x.n ? pct(x.ok, x.n) : '–'))(sxOf(u, S)),
    () => true
  ],
  [
    'at',
    'Last',
    (u, S) => sxOf(u, S).at,
    0,
    S => `Last answer in ${S.name}`,
    (u, S) => (x => (x.n ? ago(x.at) : '–'))(sxOf(u, S)),
    () => true
  ],
  [
    'sess',
    'Sessions',
    (u, S) => sxOf(u, S).s,
    0,
    () => `Sessions (answers less than ${HEALTH.GAP} minutes apart) · their median length`,
    (u, S) => (x => (x.s ? `${x.s} <small>· ${x.len < 1 ? '<1' : x.len} min</small>` : '–'))(sxOf(u, S)),
    () => true
  ],
  // The replayed subject's progress (SUBJECTS replay; the Progress column from sheet script v28, replayOn).
  [
    'prog',
    'Progress',
    u => (u.pg ? u.pg.pct : -1),
    0,
    () => 'Progress %, replayed from every answer in the log with the current rules (↻ saved: what the copy in the sheet still says)',
    u => (!u.pg ? '…' : withSaved(u.pg.pct + '%', u.pg.saved && u.pg.saved.pct + '%')),
    S => !!S.replay && replayOn()
  ],
  // Photo exposure (sheet v81; Pierre, 2026-11-06, Q191; docs/reviews/2026-11-06-photo-exposure-study.md §5), per subject
  // (Code.gs exposure_: ex {subject id: [seen, of, hit, asked, units]}). Photos = Seen %; Spread = Spread %, the one to
  // act on: whether the draw used the room it had.
  [
    'photos',
    'Photos',
    (u, S) => (x => (x && x[1] ? x[0] / x[1] : -1))(exOf(u, S)),
    0,
    () => 'Seen %: the game photos they have been shown, out of the game photos of the units they have met',
    (u, S) => EXPO_CELL.photos(u, S),
    () => expoOn()
  ],
  [
    'spread',
    'Spread',
    (u, S) => (x => (x && x[3] ? x[2] / x[3] : -1))(exOf(u, S)),
    0,
    () =>
      'Spread %, in time order: of their questions on a unit that still had colonies they had never been shown, the share that showed one (100% = no colony repeated while an unseen one was left)',
    (u, S) => EXPO_CELL.spread(u, S),
    () => expoOn()
  ]
];
// Each player's answers and sessions per subject, from the whole log (rowsOf): {player id: {subject id: {n, ok, at, s,
// len}}}.
const sxOf = (u, S) => {
  const X = ofAns('sx', () => {
    const o = Object.create(null),
      at = (id, T) => {
        const P = (o[id] = o[id] || {});
        return (P[T.id] = P[T.id] || {n: 0, ok: 0, at: 0, s: 0, len: 0, L: []});
      };
    SUBJECTS.forEach(T => {
      rowsOf(T).forEach(r => {
        const x = at(r[0], T);
        x.n++;
        x.ok += r[4];
        if (r[1] > x.at) x.at = r[1];
      });
      sessionsOf(rowsOf(T)).forEach(z => at(z.id, T).L.push((z.L[z.L.length - 1][1] - z.L[0][1]) / 6e4));
    });
    Object.values(o).forEach(P =>
      Object.values(P).forEach(x => {
        const L = x.L.sort((a, b) => a - b);
        x.s = L.length;
        x.len = L.length ? Math.round(L[Math.floor(L.length / 2)]) : 0;
      })
    );
    return o;
  });
  return (u && u.id && X[u.id] && X[u.id][S.id]) || {n: 0, ok: 0, at: 0, s: 0, len: 0};
};
// The devices a player used: distinct device ids of their pages-opened summaries; null while those are not read.
let DEVS = {of: null, by: null};
const devsOf = u => {
  if (!PGS) return null;
  if (PGS.err || !u.id) return 0;
  if (DEVS.of !== PGS) {
    const o = Object.create(null);
    (PGS.rows || []).forEach(x => x.id && x.dev && (o[x.id] = o[x.id] || new Set()).add(x.dev));
    DEVS = {of: PGS, by: o};
  }
  return DEVS.by[u.id] ? DEVS.by[u.id].size : 0;
};
// The subject a player answered last in (their Journey opens there; Pierre's list, 2026-11-06), else the first.
const lastSubj = u => SUBJECTS.reduce((b, S) => (sxOf(u, S).at > sxOf(u, b).at ? S : b), SUBJECTS[0]);
const journeyHref = u => '#' + lastSubj(u).hash + 'players/list/journey/' + encodeURIComponent(u.name);
// Sheet v81: each player's photo exposure per subject (ex); an older script sends none, and the two columns stay away.
const EXPO_SHEET = 81;
const expoOn = () => ((USERS && USERS.v) || 0) >= EXPO_SHEET;
const exOf = (u, S = ASUBJ) => (u && u.ex && u.ex[S.id]) || null;
// A cell: the share, its counts in the title; – when the player has no answer on a unit with game photos.
const exCell = (k, n, tip) => (n ? `<span title="${esc(tip)}">${pct(k, n)}</span>` : '–');
// The two cells, beside their column definitions above, so the pair moves as one (S: the subject, the switch's by default).
const EXPO_CELL = {
  photos: (u, S = ASUBJ) =>
    (x => (x ? exCell(x[0], x[1], `${x[0]} of the ${x[1]} game photos of the ${x[4]} ${x[4] === 1 ? S.one : S.many} met`) : '–'))(
      exOf(u, S)
    ),
  spread: (u, S = ASUBJ) => (x => (x ? exCell(x[2], x[3], `${x[2]} of ${x[3]} questions showed a colony new to them`) : '–'))(exOf(u, S))
};
// The beta group (sheet v48; Pierre, 2026-11-04: a subject in beta opens to a group he picks here, for now everyone, not
// by one site-wide switch): for each subject that opens to a group (core.js SUBJECTS open: 'group', subjGroup; none once
// it opens to all, even with its "beta" tag kept), whether each player is in its group (Code.gs groupSet_; the app opens
// the subject to them, app.js subjOpen): its Beta column in the subject's group, Add / Remove on the row's bar, Add all
// above the table.
const GROUP_SHEET = 48;
// Sheet v55: a delete cleans up everything of the account (Code.gs deleteAccount_); an older script would keep its reports.
const DEL_SHEET = 55;
const delOn = () => (USERS.v || 0) >= DEL_SHEET;
// Sheet v58: Archive (userArchive, Board -2) and the Archived fold (users_ archived).
const ARCH_SHEET = 58;
const archOn = () => (USERS.v || 0) >= ARCH_SHEET;
const groupOn = (S = ASUBJ) => subjGroup(S) && (USERS.v || 0) >= GROUP_SHEET;
const inGroup = (u, S = ASUBJ) => (u.groups || []).includes(S.id);
function renderUsers() {
  status();
  const head = `<div class="adm-shead"><h2>Players</h2><button type="button" class="adm-fchip plain" data-uload title="Reload">↻</button></div>`;
  // The pages opened (the Devices column) come after the table, drawn again once in (read again once stale; Codex
  // review #690).
  pagesFresh('players/list');
  if (!USERS || !ANS) {
    $v.innerHTML = head + '<p class="note">Loading…</p>';
    Promise.all([loadUsers(), ANS ? null : loadStats()]).then(() => {
      if (cur === 'players/list') render();
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
  // The columns: the player's, then each subject's group (its key prefixed by the subject's id), each shown when it applies
  // (the Progress column only from sheet script v28, replayOn; a Beta column only for a subject that opens to a group).
  const GRP = SUBJECTS.map(S => [
      S,
      SCOLS.filter(c => c[6](S)).map(([k, t, f, asc, tip, cl]) => ({
        k: S.id + ':' + k,
        t,
        f: u => f(u, S),
        asc,
        tip: tip(S),
        cl: u => cl(u, S)
      }))
    ]).filter(([, L]) => L.length),
    COLS = [
      ...UCOLS.map(([k, t, f, asc, tip]) => ({k, t, f, asc, tip, cl: u => cell(k, u)})),
      ...GRP.flatMap(([, L]) => L.map((c, i) => ({...c, g0: !i})))
    ],
    col = COLS.find(c => c.k === SF.us) || COLS.find(c => c.k === 'last'),
    sk = col.k,
    sd = SF.us === sk && SF.ud ? SF.ud : col.asc ? 'asc' : 'desc';
  // Each player's last answer in the log loaded (ms), any subject, fresher than the player list's (kept 2 minutes,
  // loadUsers).
  const LAST = ofAns('last', () => {
    const o = Object.create(null);
    (ANS.all || ANS.rows || []).forEach(r => r[1] > (o[r[0]] || 0) && (o[r[0]] = r[1]));
    return o;
  });
  const U = USERS.users
    .map(u => ({
      ...u,
      at: Math.max((u.id && LAST[u.id]) || 0, u.last || 0) || u.updated || 0,
      pg: replayOn() ? progOf(u) : null
    }))
    .sort((a, b) => {
      const x = col.f(a),
        y = col.f(b);
      return (x < y ? -1 : x > y ? 1 : 0) * (sd === 'asc' ? 1 : -1) || b.at - a.at;
    });
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
      <a class="next" href="${esc(journeyHref(u))}" data-own>Journey →</a>
      ${u.pg ? `<span class="adm-uprog">${esc(SUBJECTS.find(S => S.replay).name)}: Progress ${withSaved(u.pg.pct + '%', u.pg.saved && u.pg.saved.pct + '%')} · Learned ${withSaved(`${u.pg.learned}`, u.pg.saved && `${u.pg.saved.learned}`)}${u.pg.err ? ` <small title="Their saved copy could not be read (${esc(u.pg.err)}): no mastery exam counted; ↻ to try again">?</small>` : ''}</span>` : ''}
      <span>${u.board === -1 ? 'Hidden from the leaderboard' : u.board === 0 ? 'Off the leaderboard (their choice)' : 'On the leaderboard'} <button type="button" class="adm-fchip" data-uboard="${esc(u.name)}" data-hide="${u.board === -1 ? 0 : 1}">${u.board === -1 ? 'Show' : 'Hide'}</button></span>
      ${u.reports ? `<span>${u.reports} report${u.reports === 1 ? '' : 's'}</span>` : ''}
      ${SUBJECTS.filter(S => groupOn(S))
        .map(
          S =>
            `<span>${inGroup(u, S) ? 'In' : 'Not in'} the ${esc(S.name)} beta <button type="button" class="adm-fchip" data-ugroup="${esc(u.name)}" data-gid="${esc(S.id)}" data-on="${inGroup(u, S) ? 0 : 1}">${inGroup(u, S) ? 'Remove' : 'Add'}</button></span>`
        )
        .join('')}
      <label>Merge into <select data-umerge="${esc(u.name)}"><option value="">…</option>${opts(u.name)}</select></label>
      <button type="button" class="adm-fchip" data-uarch="${esc(u.name)}"${archOn() ? '' : ` disabled title="Needs the sheet script v${ARCH_SHEET}"`}>Archive…</button>
      ${
        uDel === u.name
          ? `<span class="adm-udel">Delete "${esc(u.name)}": <button type="button" class="adm-danger" data-udel-all="${esc(u.name)}"${delOn() ? '' : ' disabled'}>Delete everything</button> <button type="button" class="adm-danger" data-udel-keep="${esc(u.name)}"${delOn() ? '' : ' disabled'}>Delete, keep answers anonymously</button> <button type="button" class="adm-fchip" data-udel-no>Cancel</button>${delOn() ? '' : ` <small class="note">Needs the sheet script v${DEL_SHEET} (live: v${USERS.v || '?'}).</small>`}</span>`
          : `<button type="button" class="adm-danger" data-udel="${esc(u.name)}">Delete…</button>`
      }</div></td></tr>`;
  // Answers without a name: devices that never signed in (~anon), by anonymous id, every subject's. The answers a deleted
  // account left (sheet v55 anonymous 2) are never a player (Pierre, 2026-11-05, Q86): they only rate the photos.
  const named = new Set(U.map(u => u.id).filter(Boolean)),
    A = {};
  // Sheet v13 gives ids; an older one doesn't, and every answer would look anonymous. With v13 an empty list is fine.
  if ((USERS.v || 0) >= 13)
    (ANS.all || ANS.rows || []).forEach(r => {
      if (named.has(r[0]) || goneRow(r)) return;
      const a = (A[r[0]] = A[r[0]] || {n: 0, by: {}, last: 0, first: Infinity});
      a.n++;
      a.by[rowSubject(r)] = (a.by[rowSubject(r)] || 0) + 1;
      if (r[1] > a.last) a.last = r[1];
      if (r[1] < a.first) a.first = r[1];
    });
  const anon = Object.entries(A).sort((a, b) => b[1].last - a[1].last);
  const act = U.filter(u => u.at && Date.now() - u.at < 7 * 864e5).length;
  function cell(k, u) {
    return k === 'name'
      ? `${pname(u.name, u.board === -1)}${isMe(u.id) ? ' <small>you</small>' : ''}`
      : k === 'dev'
        ? (d => (d == null ? '…' : d || '–'))(devsOf(u))
        : k === 'groups'
          ? esc((u.groups || []).map(g => subjectOf(g).name).join(', ')) || '–'
          : ago(u.at);
  }
  // Each beta group's line above the table (groupOn): how many players are in it, and Add all for the others.
  const gLine = SUBJECTS.filter(S => subjGroup(S))
    .map(S => {
      if (!groupOn(S))
        return `<p class="note">The ${esc(S.name)} beta group needs the sheet script v${GROUP_SHEET} (live: v${USERS.v || '?'}).</p>`;
      const out = U.filter(u => !inGroup(u, S)).length;
      return `<p class="adm-ugroup"><span>${esc(S.name)} beta: <b>${U.length - out}</b> of ${U.length} players</span>${out ? ` <button type="button" class="adm-fchip" data-ugall="${esc(S.id)}">Add all ${out}</button>` : ''}</p>`;
    })
    .join('');
  $v.innerHTML =
    head +
    kpis([
      ['Players', U.length],
      ['Active 7 d', act],
      // Each subject's answers by the players listed.
      ...SUBJECTS.map(S => [`${S.name} answers`, U.reduce((t, u) => t + sxOf(u, S).n, 0)]),
      ['Not signed in', anon.length]
    ]) +
    (U.some(u => !u.id) ? `<p class="note">Level shows once the sheet script v13 is live (it adds each player's anonymous id).</p>` : '') +
    gLine +
    (!U.length
      ? '<p class="note">Nobody has signed in yet.</p>'
      : `
    <section class="adm-scard adm-ucard"><div class="adm-tscroll"><table class="adm-tbl adm-utbl"><thead><tr class="adm-ugrp"><th colspan="${UCOLS.length}"></th>${GRP.map(
      ([S, L]) => `<th colspan="${L.length}" class="adm-ug0">${esc(S.name)}</th>`
    ).join('')}<th></th></tr><tr>${COLS.map(
      ({k, t, tip, asc, g0}) =>
        `<th${tip ? ` title="${esc(tip)}"` : ''}${g0 ? ' class="adm-ug0"' : ''}><button type="button" class="adm-usort" data-usort="${esc(k)}" data-uasc="${asc ? 1 : 0}" aria-pressed="${k === sk}">${t}${k === sk ? (sd === 'asc' ? ' ▴' : ' ▾') : ''}</button></th>`
    ).join('')}<th></th></tr></thead><tbody>
      ${U.map(
        u =>
          `<tr class="adm-urow${uOpen === u.name ? ' open' : ''}${isMe(u.id) ? ' me' : ''}" data-uopen="${esc(u.name)}">${COLS.map(c => `<td${c.g0 ? ' class="adm-ug0"' : ''}>${c.cl(u)}</td>`).join('')}<td>${uOpen === u.name ? '▾' : '▸'}</td></tr>${uOpen === u.name ? detail(u) : ''}`
      ).join('')}</tbody></table></div></section>`) +
    (anon.length
      ? `<details class="adm-uremoved" open><summary>Not signed in (${anon.length})</summary><div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th><input type="checkbox" data-aall aria-label="Select all"></th><th>Id</th>${SUBJECTS.map(S => `<th title="Answers in ${esc(S.name)}">${esc(S.name)}</th>`).join('')}<th>First</th><th>Last</th></tr></thead><tbody>${anon
          .map(
            ([id, a]) =>
              `<tr><td><input type="checkbox" data-aid="${esc(id)}" aria-label="Select ${esc(id)}"></td><td><a href="#${esc(SUBJECTS.reduce((b, S) => ((a.by[S.id] || 0) > (a.by[b.id] || 0) ? S : b), SUBJECTS[0]).hash)}players/list/anon/${encodeURIComponent(id)}" data-own title="Journey"><code>${esc(id)}</code></a></td>${SUBJECTS.map(S => `<td>${a.by[S.id] || '–'}</td>`).join('')}<td>${days(a.first)}</td><td>${ago(a.last)}</td></tr>`
          )
          .join(
            ''
          )}</tbody></table></div><p><button type="button" class="adm-danger" data-adel disabled${(USERS.v || 0) < 17 ? ' data-old' : ''}>Delete the answers of the selected ids</button>${(USERS.v || 0) < 17 ? ` <small class="note">Needs the sheet script v17 (live: v${USERS.v || '?'}).</small>` : ''}</p></details>`
      : '') +
    // v58: the archived records, read-only (Pierre, 2026-11-05: archived means kept, never used in normal operation): the
    // archive's name, its last save, answers and reports, its Journey (marked archived); Delete stays (either mode).
    ((USERS.archived || []).length
      ? `<details class="adm-uremoved"${USERS.archived.some(a => a.name === uDel) ? ' open' : ''}><summary>Archived (${USERS.archived.length})</summary><table class="adm-tbl"><thead><tr><th>Name</th><th>Last saved</th><th>Answers</th><th>Reports</th><th></th></tr></thead><tbody>${USERS.archived
          .map(
            a =>
              `<tr><td><a href="#players/list/journey/${encodeURIComponent(a.name)}" title="Journey (archived)">${cut(a.name)}</a></td><td>${a.time ? date(a.time) : '–'}</td><td>${a.answers}</td><td>${a.reports || ''}</td><td>${
                uDel === a.name
                  ? `<span class="adm-udel"><button type="button" class="adm-danger" data-udel-all="${esc(a.name)}">Delete everything</button> <button type="button" class="adm-danger" data-udel-keep="${esc(a.name)}">Delete, keep answers anonymously</button> <button type="button" class="adm-fchip" data-udel-no>Cancel</button></span>`
                  : `<button type="button" class="adm-danger" data-udel="${esc(a.name)}">Delete…</button>`
              }</td></tr>`
          )
          .join('')}</tbody></table></details>`
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
          a0 = b.dataset.uasc === '1' ? 'asc' : 'desc';
        SF.ud = SF.us === k ? ((SF.ud || a0) === 'asc' ? 'desc' : 'asc') : a0;
        SF.us = k;
        store.set('reefid-admin-stats', SF);
        render();
      })
  );
  const rl = $v.querySelector('[data-uload]');
  if (rl)
    rl.onclick = () => {
      sheetAgain('users', 'ans', 'stats', 'pages'); // levels (ras) too; the pages opened (Devices)
      savedClear(); // the players' saved progress (Progress, Learned, the journeys' cards) too
      render();
    };
  $v.querySelectorAll('[data-uopen]').forEach(
    tr =>
      (tr.onclick = () => {
        uOpen = uOpen === tr.dataset.uopen ? null : tr.dataset.uopen;
        uDel = '';
        render();
      })
  );
  const done = (msg, j) => {
    if (j && j.ok) {
      toast(msg);
      // answers moved to another name or deleted: the levels and counts change; v55: a merge or delete also moves or
      // removes reports, page summaries and log mentions (Codex review #600)
      sheetAgain('users', 'ans', 'stats', 'reports', 'pages', 'events');
      savedClear(); // progress merged, renamed or deleted
      uOpen = null;
      render();
    } else toast(j && j.error === 'stale' ? 'The player just synced: try again.' : `Not done (${(j && j.error) || 'offline'}).`);
  };
  // Leaderboard (sheet v20, Pierre 2026-11-02: a test account must not show there): hidden by an admin, which the
  // player's own syncs never undo; Show puts them back. Only the leaderboard changes: answers, progress, stats stay.
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
  // The beta group (sheet v48, groupOn): one player in or out (one click, no confirmation: Remove undoes Add), or every
  // player not in it yet (Add all, confirmed: a bulk action). Only the group changes; the player's app follows at its next
  // load or save.
  // The group id is taken when the request leaves: the admin may switch subjects before it returns (Codex review #540).
  const group = (names, on, msg, gid = ASUBJ.id) =>
    userPost({userGroup: names, group: gid, on})
      .then(j => {
        if (!j || !j.ok) return toast(`Not done (${(j && j.error) || 'offline'}).`);
        const L = new Set((Array.isArray(names) ? names : [names]).map(x => x.toLowerCase()));
        USERS.users.forEach(u => {
          if (!L.has(u.name.toLowerCase())) return;
          const g = (u.groups || []).filter(x => x !== gid);
          u.groups = on ? [...g, gid] : g;
        });
        toast(msg);
        render();
      })
      .catch(() => toast('Not done (offline).'));
  $v.querySelectorAll('[data-ugroup]').forEach(
    b =>
      (b.onclick = () => {
        const name = b.dataset.ugroup,
          on = b.dataset.on === '1',
          S = subjectOf(b.dataset.gid);
        group(name, on, on ? `"${name}" added to the ${S.name} beta.` : `"${name}" removed from the ${S.name} beta.`, S.id);
      })
  );
  $v.querySelectorAll('[data-ugall]').forEach(
    ga =>
      (ga.onclick = () => {
        const S = subjectOf(ga.dataset.ugall),
          L = USERS.users.filter(u => !inGroup(u, S)).map(u => u.name);
        if (
          !L.length ||
          !confirm(
            `Add all ${L.length} players not in it yet to the ${S.name} beta?\n\n${S.name} opens in the app for them at their next sync. Players who sign up later are not in it.`
          )
        )
          return;
        group(L, true, `${L.length} players added to the ${S.name} beta.`, S.id);
      })
  );
  // Archive (sheet v58, was Rename v20; Pierre 2026-11-02 and 2026-11-05, Q84/Q88): keep a record apart under an archive
  // name ("Pierre-test"), out of normal operation (Board -2: no leaderboard, no achievement share, no beta group, no
  // player row; the Archived fold below). The old name is free again: its devices are told the record was archived and
  // offered to sign out (sync.js archivedOf), then its owner may sign in under it and start empty.
  $v.querySelectorAll('[data-uarch]').forEach(
    b =>
      (b.onclick = () => {
        const name = b.dataset.uarch,
          into = (prompt(`Archive "${name}" under which name?`, `${name}-test`) || '').trim();
        if (!into || into === name) return;
        if (
          !confirm(
            `Archive "${name}" as "${into}"?\n\nTheir answers, reports and progress are kept apart under "${into}", out of the leaderboard, the players, the beta groups and every count; their answers still rate the photos. Their devices are told the record was archived and asked to sign out.\n"${name}" is free again: its owner can sign in under it and start fresh.`
          )
        )
          return;
        userPost({userArchive: {from: name, into}})
          .then(j =>
            j && j.error === 'exists'
              ? toast(`"${into}" is already a player.`)
              : j && j.error === 'input'
                ? toast(`Not done: needs the sheet script v${ARCH_SHEET}.`)
                : done(`"${name}" archived as "${into}".`, j)
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
            return userPost({userMerge: {from, into, data: withLegacy(mergeUsers(a.data, b.data)), at: b.rev}}).then(j =>
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
  // Delete (sheet v55, Pierre 2026-11-05, Q89: two named choices, no default): Delete… shows them in the bar.
  $v.querySelectorAll('[data-udel]').forEach(
    b =>
      (b.onclick = () => {
        uDel = b.dataset.udel;
        render();
      })
  );
  $v.querySelectorAll('[data-udel-no]').forEach(
    b =>
      (b.onclick = () => {
        uDel = '';
        render();
      })
  );
  $v.querySelectorAll('[data-udel-all],[data-udel-keep]').forEach(
    b =>
      (b.onclick = () => {
        const all = 'udelAll' in b.dataset,
          name = all ? b.dataset.udelAll : b.dataset.udelKeep,
          u = [...(USERS.users || []), ...(USERS.archived || [])].find(x => x.name === name) || {answers: 0, reports: 0},
          n = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
        if (
          !confirm(
            all
              ? `Delete everything of "${name}"?\n\nTheir account, progress, ${n(u.answers, 'answer')}, ${n(u.reports || 0, 'report')} and page summaries are deleted. For a test account, or a player who asked. This cannot be undone.`
              : `Delete "${name}", keeping their answers anonymously?\n\nTheir account, progress and page summaries are deleted. Their ${n(u.answers, 'answer')} and ${n(u.reports || 0, 'report')} stay without the name: the answers only rate photo difficulty, the reports read "from a removed account". This cannot be undone.`
          )
        )
          return;
        uDel = '';
        userPost({userDelete: name, answers: all})
          .then(j => done(`"${name}" deleted${all ? '' : ', answers kept anonymously'}.`, j))
          .catch(() => done('', null));
      })
  );
}
function renderStats() {
  status();
  // Activity's Recent sessions name the signed-in players (USERS); the other views need the answer log only.
  const named = cur === 'players/activity' && !USERS;
  if (!ANS || named) {
    $v.innerHTML = '<p class="note">Loading…</p>';
    Promise.all([ANS ? null : loadStats(), named ? loadUsers() : null]).then(() => {
      if (LIVE_STATS.includes(cur) || cur === 'inbox/todo/health') render();
    });
    // Stops' pages opened leave with the answer log, not after it.
    if (cur === 'analyses/learning/stops' && pagesStale()) loadPages().catch(() => {});
    return;
  }
  return cur === 'photos/stats/difficulty'
    ? statsPhotos()
    : cur === 'analyses/difficulty/pairs'
      ? statsConf()
      : cur === 'inbox/todo/health' || cur === 'analyses/learning/stops'
        ? statsHealth()
        : statsPlayers();
}
// Every answer of every account (Pierre, 2026-11-04: no player filter), but those a deleted account left (sheet v55
// readAnswers anonymous 2): they rate the photos only, never count as a player (Pierre, 2026-11-05, Q86).
const goneRow = r => r[11] === 2;
const playerRows = () => (ANS.rows || []).filter(r => !goneRow(r));
// A subject's answer rows (ANS.all holds every subject's, ANS.rows the replayed one's), a deleted account's left out: the
// Players pages read the subject on screen's (Activity, a Journey, a session's summary; the list of players, each
// subject's in its own columns).
const rowsOf = (S = ASUBJ) => (ANS ? ofAns('rows:' + S.id, () => subjRows(ANS.all || ANS.rows || [], S.id).filter(r => !goneRow(r))) : []);
const statRows = () => playerRows();
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
// A session's length, from its first to its last answer (L: its rows in time order).
const sessLen = L => {
  const m = Math.round((L[L.length - 1][1] - L[0][1]) / 6e4);
  return m < 1 ? '<1 min' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
};
// The sessions unfolded on Recent sessions (Pierre, 2026-11-05: a tap unfolds a session's summary under it, a tap folds
// it), by player id and first answer time, so a session stays open when the page is drawn again (↻, a saved copy read).
const SOPEN = new Set();
function recentSessions(R) {
  const NM = Object.create(null);
  ((USERS && USERS.users) || []).forEach(u => u.id && (NM[u.id] = u));
  const S = sessionsOf(R)
    .sort((a, b) => b.L[b.L.length - 1][1] - a.L[a.L.length - 1][1])
    .slice(0, RECENT.N);
  const dur = s => sessLen(s.L),
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
        ? `<a href="#players/list/journey/${encodeURIComponent(NM[id].name)}">${pname(NM[id].name, NM[id].board === -1)}</a>`
        : `<a href="#players/list/anon/${encodeURIComponent(id)}" title="Not signed in"><code>${esc(id)}</code></a>`;
  const live = S.filter(s => isNow(s.L[s.L.length - 1][1])).length;
  return `<section class="adm-scard adm-recent" data-recent><h3>Recent sessions${
    live ? ` <span class="adm-ago now">${live} playing now</span>` : ''
  } <small class="note" title="When the answers were loaded (↻ reloads)">as of ${dateText(ANS.at || Date.now(), 'hm')}</small></h3>${
    S.length
      ? `<div class="adm-tscroll"><table class="adm-tbl"><thead><tr><th>Player</th><th>Last</th><th class="n">Answers</th><th class="n">Right</th><th title="From the first to the last answer">Length</th><th>Started</th><th>Modes</th><th></th></tr></thead><tbody>${S.map(
          s => {
            const k = s.id + '|' + s.L[0][1],
              open = SOPEN.has(k);
            // A tap on the row (not on the player's link) unfolds the session's summary under it (sessionSummary,
            // admin-journey.js), as a Players row unfolds its actions.
            return `<tr class="adm-urow${open ? ' open' : ''}${isNow(s.L[s.L.length - 1][1]) ? ' now' : ''}" data-sopen="${esc(k)}" tabindex="0" aria-expanded="${open}"><td>${who(s.id)}${isMe(s.id) ? ' <small>you</small>' : ''}</td><td>${ago(s.L[s.L.length - 1][1])}</td><td class="n">${s.L.length}</td><td class="n">${pct(
              s.L.filter(r => r[4]).length,
              s.L.length
            )}</td><td>${dur(s)}</td><td>${clock(s.L[0][1])}</td><td>${modes(s)}</td><td>${open ? '▾' : '▸'}</td></tr>${
              open ? `<tr class="adm-udet" data-sdet><td colspan="8">${sessionSummary(s.id, s.L, NM[s.id] && NM[s.id].name)}</td></tr>` : ''
            }`;
          }
        ).join('')}</tbody></table></div>`
      : '<p class="note">No sessions yet.</p>'
  }</section>`;
}
// Activity over time (Pierre, 2026-11-04: Players › Activity = "who plays and how much"): per day, ISO week (from
// Monday) or month, the answers, the players who answered (active) and the players whose first answer falls in it
// (new), oldest first, gaps filled, the last `max` periods. R: answer rows [id, time ms, ...]. Local time.
function activityOver(R, per, max = 60) {
  const p2 = n => String(n).padStart(2, '0'),
    key = t => {
      const d = new Date(t);
      if (per === 'month') return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`;
      if (per === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
    },
    next = k => {
      if (per === 'month') {
        const [y, m] = k.split('-').map(Number);
        return m === 12 ? `${y + 1}-01` : `${y}-${p2(m + 1)}`;
      }
      const [y, m, d] = k.split('-').map(Number),
        n = new Date(y, m - 1, d + (per === 'week' ? 7 : 1));
      return `${n.getFullYear()}-${p2(n.getMonth() + 1)}-${p2(n.getDate())}`;
    };
  if (!R.length) return [];
  const B = {},
    first = {};
  R.forEach(r => {
    if (!(r[0] in first) || r[1] < first[r[0]]) first[r[0]] = r[1];
    const b = (B[key(r[1])] = B[key(r[1])] || {n: 0, ids: new Set(), nw: 0});
    b.n++;
    b.ids.add(r[0]);
  });
  Object.values(first).forEach(t => (B[key(t)].nw += 1));
  const ks = Object.keys(B).sort(),
    out = [];
  for (let k = ks[0]; k <= ks[ks.length - 1]; k = next(k)) {
    const b = B[k] || {n: 0, ids: new Set(), nw: 0};
    out.push({k, answers: b.n, players: b.ids.size, newp: b.nw});
  }
  return out.slice(-max);
}
// Answers by hour of the day (local time), for "play hours".
const playHours = R => {
  const H = Array(24).fill(0);
  R.forEach(r => H[new Date(r[1]).getHours()]++);
  return H;
};
// The Activity card: the scale switch (day, week, month: SF.per), three column charts over the periods (answers, active
// players, new players), then the play hours (answers by hour of the day).
function activityCard(R) {
  const per = ['day', 'week', 'month'].includes(SF.per) ? SF.per : 'day',
    A = activityOver(R, per),
    H = playHours(R),
    col = (L, f, t) => {
      const mx = Math.max(1, ...L.map(f));
      return `<div class="adm-acol"><h4>${t}</h4><div class="adm-cols">${L.map(
        x => `<div title="${esc(x.k)}: ${f(x)}"><i style="height:${Math.round((100 * f(x)) / mx)}%"></i></div>`
      ).join('')}</div><p class="adm-axis"><span>${esc(L[0].k)}</span><span>${esc(L[L.length - 1].k)}</span></p></div>`;
    },
    hm = Math.max(1, ...H);
  return `<section class="adm-scard adm-actv"><div class="adm-shead"><h3>Activity over time</h3>${segBtns('per', [
    ['day', 'Day'],
    ['week', 'Week'],
    ['month', 'Month']
  ])}</div><div class="adm-acols">${col(A, x => x.answers, 'Answers')}${col(A, x => x.players, 'Active players')}${col(
    A,
    x => x.newp,
    'New players'
  )}</div><h4>Play hours</h4><div class="adm-cols adm-phours">${H.map(
    (n, h) => `<div title="${h}:00-${h + 1}:00: ${n} answers"><i style="height:${Math.round((100 * n) / hm)}%"></i></div>`
  ).join('')}</div><p class="adm-axis"><span>0 h</span><span>12 h</span><span>23 h</span></p></section>`;
}
// Players › Activity (players/activity: who plays and how much) and Analyses › Learning › Answer log (analyses/learning/answer-log: what the answers
// say, live; Pierre, 2026-11-04, one role per admin page): one reading of the answer log, each view its own cards.
function statsPlayers() {
  const log = cur === 'analyses/learning/answer-log',
    head = `<div class="adm-shead"><h2>${log ? 'Answer log' : 'Activity'}</h2><button type="button" class="adm-fchip plain" data-sload title="Reload the answers">↻</button></div>`;
  if (ANS.old) {
    $v.innerHTML =
      head +
      `<p class="warn">${ANS.err === 'token' ? "Needs this page's GitHub token: per-player answers are admin-only (sheet v14)." : `Sheet script v${esc(ANS.v || '?')}: needs v4 (v5 for calibration and variety).`} <a href="https://raw.githubusercontent.com/${REPO}/main/tools/sync/Code.gs" target="_blank" rel="noopener">Code.gs</a></p>`;
    bindStats();
    return;
  }
  // Activity: the subject on screen's answers (every subject has its Activity); the Answer log: the replayed subject's.
  // Another subject's units are named from its entries (fishAdmin, read once; Codex review #690).
  if (!log && !ASUBJ.replay && !FISHA) fishAdmin().then(() => cur === 'players/activity' && FISHA && render());
  const R = log ? statRows() : rowsOf(),
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
    (R.length && !log ? recentSessions(R) + activityCard(R) : '') +
    (!R.length
      ? '<p class="note">No answers yet.</p>'
      : !log
        ? ''
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
    <section class="adm-scard"><h3>Genera</h3><div class="adm-tscroll tall"><table class="adm-tbl"><thead><tr><th>Shown</th><th>Right</th><th></th><th>n</th><th title="Given wrongly">Given ✗</th><th title="Median player Elo on the genus (1000 + 200 × their level on it)">Elo</th></tr></thead><tbody>
      ${gl.map(g => `<tr><td><a class="adm-gen" href="${esc(genusHref(g.n))}"><i>${esc(g.n)}</i></a></td><td>${pct(g.ok, g.s)}</td><td>${sbar(g.ok, g.s, g.ok / g.s < 0.5 ? 'bad' : '')}</td><td class="n">${g.s}</td><td class="n">${g.w || ''}</td><td class="n">${GT[g.n] ? eloText(med(GT[g.n]), null, {what: 'Median player Elo on the genus'}) : ''}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="adm-scard"><h3>Mix-ups</h3>${
      ml.length
        ? `<table class="adm-tbl"><thead><tr><th>Shown</th><th>Answered</th><th></th><th>n</th></tr></thead><tbody>
      ${ml
        .map(([k, n]) => {
          const [a, b] = k.split('|');
          return `<tr><td><i>${esc(a)}</i></td><td><a class="adm-gen" href="./#${routeOut(`cmp-${a}|${b}`)}" target="_blank" rel="noopener"><i>${esc(b)}</i></a></td><td>${sbar(n, mm, 'bad')}</td><td class="n">${n}</td></tr>`;
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
  const R = ANS.rows || [];
  const TH = {};
  Object.values(ANS.players || {}).forEach(p => Object.entries(p[3] || {}).forEach(([g, t]) => (TH[g] = TH[g] || []).push(t)));
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
          why.push([
            'easy',
            `players Elo ${eloNum(top)} vs hardest photo recognised by ${recPct(hard)}`,
            `level ${rawNum(top)} vs difficulty ${rawNum(hard)}`,
            // The chip's HTML in the full list: the Elo and the reading as everywhere else (raw values in their titles).
            `players Elo ${eloText(top, null, {what: 'Players at the top quarter of the genus, Elo'})} vs hardest photo recognised by ${recBadge(hard, {short: 1, raw: 'photo difficulty'})}`
          ]);
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
// Where to look, in full: into el (the banner above Coverage › Games, open with ?look=all).
function statsNeeds(el) {
  const head = `<div class="adm-shead"><h2>Where to look for photos</h2><a class="adm-link" href="#inbox/coverage/games">Fold</a></div>`,
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
      o => `<tr data-g="${esc(o.n)}"><td><a class="adm-gen" href="${esc(genusHref(o.n))}"><i>${esc(o.n)}</i></a></td><td>${esc(o.vt)}</td><td class="n">${o.c.obs}</td>
      <td>${o.why.map(([k, t, raw, h]) => `<span class="adm-why w-${k}${SF.nk === k ? ' on' : ''}" title="${esc(T[k] + (raw ? ` · ${raw}` : ''))}">${h || esc(t)}</span>`).join(' ')}</td></tr>`
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
        if (!e.target.closest('a')) location.hash = genusHref(tr.dataset.g);
      })
  );
}
// Photos everyone misses (Health): missed by many players (manyMiss), and under PH_LOW right over all their answers
// (everyoneMisses) or a difficulty PH_FAR or more above the median of their genus's rated photos.
function healthBad(R) {
  const H = HEALTH,
    median = healthMedian;
  // 2. Photos everyone misses: answers from the log (each answer counts once for every photo it showed), difficulty
  // from the photo Elo against the median of the genus's rated photos.
  const PS = photoStats(),
    META = Object.create(null);
  allPhotos()
    .filter(p => p.view !== 'cand')
    .forEach(p => (META[p.f] = META[p.f] || p));
  const PH = photoAnswers(R, f => !!META[f]);
  const GMED = Object.create(null);
  Object.values(META).forEach(p => {
    if (nAns(PS[p.f]) >= 3) (GMED[p.genus] = GMED[p.genus] || []).push(PS[p.f][0]);
  });
  Object.keys(GMED).forEach(g => (GMED[g] = GMED[g].length >= 3 ? median(GMED[g]) : null));
  const BAD = Object.entries(PH)
    .filter(([, o]) => manyMiss(o))
    .map(([f, o]) => {
      const p = META[f],
        s = PS[f],
        m = GMED[p.genus],
        far = s && nAns(s) >= H.PH_MIN && m != null ? s[0] - m : null;
      return {
        p,
        n: o.n,
        ok: o.ok,
        ...missedBy(o),
        r: o.ok / o.n,
        all: everyoneMisses(o),
        far,
        d: s && nAns(s) >= H.PH_MIN ? s[0] : null,
        gm: m
      };
    })
    .filter(o => o.all || (o.far != null && o.far >= H.PH_FAR))
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
// Computed once per answer log, photo ratings and draft (MEMO, emptied when the draft changes): To do
// draws itself again as its reads come in, and each draw went over the whole log (Pierre, 2026-11-04: admin speed).
function healthLine() {
  if (!ANS || ANS.old) return '';
  const k = 'hline',
    m = MEMO[k];
  if (m && m.a === ANS && m.s === STATS) return m.v;
  return (MEMO[k] = {a: ANS, s: STATS, v: healthLine0()}).v;
}
function healthLine0() {
  // the player rows, as the Health page: a deleted account's answers are no player (sheet v55; Codex review #600)
  const R = playerRows(),
    BY = Object.create(null);
  R.forEach(r => (BY[r[0]] = BY[r[0]] || []).push(r));
  Object.values(BY).forEach(L => L.sort((a, b) => a[1] - b[1]));
  const bad = R.length ? healthBad(R).length : 0,
    stuck = R.length ? healthGenera(BY).filter(g => g.stuck).length : 0,
    L = [
      bad && `${bad} photo${bad === 1 ? '' : 's'} everyone misses`,
      stuck && `${stuck} ${stuck === 1 ? 'genus' : 'genera'} players are stuck on`
    ].filter(Boolean);
  return L.length ? `<p class="warn adm-hline" data-hline><a href="#inbox/todo/health"><b>Health</b></a>: ${L.join(' · ')}</p>` : '';
}
// Health (Pierre, 2026-11-02: "most RAs will not send feedback"): what the answers already logged say about how the
// app works for players, with no new data. One role per admin page (Pierre, 2026-11-04): Inbox › To do › Health
// (inbox/todo/health, is something wrong?) keeps what needs action: photos everyone misses (maybe mislabelled or bad: a link to
// the genus page) and genera that don't take off for players; Analyses › Learning › Stops (analyses/learning/stops, what we learn)
// has where players stop (sessions = answers less than GAP minutes apart; how long they last; what the short ones
// ended on) and the genus sheets they open. One reading of the answer log, each view its own sections. The answers and
// players per day went with Players › Activity (activityCard). Anonymous ids only, like the other stats pages; every
// account counts (Pierre, 2026-11-04).
function statsHealth() {
  const H = HEALTH,
    stops = cur === 'analyses/learning/stops',
    head = `<div class="adm-shead"><h2>${stops ? 'Stops' : 'Health'}</h2></div>`;
  if (ANS.old) {
    $v.innerHTML =
      head +
      `<p class="warn">${ANS.err === 'token' ? "Needs this page's GitHub token: per-player answers are admin-only (sheet v14)." : `Sheet script v${esc(ANS.v || '?')}: needs v4.`} <a href="https://raw.githubusercontent.com/${REPO}/main/tools/sync/Code.gs" target="_blank" rel="noopener">Code.gs</a></p>`;
    bindStats();
    return;
  }
  const R = playerRows();
  if (!R.length) {
    $v.innerHTML = head + '<p class="note">No answers yet.</p>';
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
              ([g, n]) => `<tr><td><a class="adm-gen" href="${esc(genusHref(g))}"><i>${esc(g)}</i></a></td><td class="n">${n}</td></tr>`
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
      <figcaption><a class="adm-gen" href="${esc(genusHref(o.p.genus))}" title="Open the genus"><i>${esc(o.p.genus)}</i></a> <span>${esc(label(o.p.genus, o.p.view))}</span>
      <span class="adm-hnum"><b${o.r < H.PH_LOW ? ' class="warnc"' : ''}>${pct(o.ok, o.n)}</b> right · ${plural(o.n, 'answer')} · <span title="Players who miss it / players">${o.miss}/${o.pl} players</span></span>${o.d != null ? `<span class="adm-hnum">recognised by ${recBadge(o.d, {short: 1, raw: 'photo difficulty', more: o.far != null ? `${rawNum(o.far)} against the median of its genus's photos (${rawNum(o.gm)}: recognised by ${recPct(o.gm)})` : ''})}${o.far != null && o.far >= H.PH_FAR ? ' · <span data-hgenus>harder than its genus</span>' : ''}</span>` : ''}</figcaption></figure>`;
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
        `<tr><td><a class="adm-gen" href="${esc(genusHref(g.n))}"><i>${esc(g.n)}</i></a></td><td class="n">${g.met || '–'}</td><td class="n">${g.m == null ? '–' : pct(g.m, 1)}</td><td>${g.m == null ? '' : sbar(g.m, 1, g.m < H.G_LOW ? 'bad' : '')}</td><td class="n">${g.long ? `<b${g.stuck ? ' class="warnc"' : ''}>${g.stuck}</b> / ${g.long}` : '–'}</td></tr>`
    )
  )}</div></section>`;

  $v.innerHTML = stops
    ? head +
      kpis([
        ['Players', nP],
        ['Sessions', S.length],
        ['Sessions / player', Math.round(median(perP) * 10) / 10],
        ['Answers / session', Math.round(median(S.map(s => s.L.length)) * 10) / 10]
      ]) +
      `<div class="adm-sgrid adm-health">${stopSec}${healthSheets()}</div>`
    : head + `<div class="adm-sgrid adm-health">${phSec}${gSec}</div>`;
  bindStats();
  // The pages summaries (sheet v30) come with their own read: the section fills in when they arrive, and is read again
  // once stale.
  if (stops) pagesFresh('analyses/learning/stops');
}
const VIEW_T = {wide: 'Colony', medium: 'Close-up', macro: 'Corallites', cand: 'Candidate'};
const ORIGIN_T = {imr: 'IMR', own: 'Own', dauin: 'iNat Dauin', ph: 'iNat Philippines', world: 'iNat world', book: 'CF book'};
// Confusions (Pierre, 2026-11-01): which genera, photos, colonies (iNat observations) and species players mix up, from
// the answer log. A pair's rate = mixed up / offered together (needs the choices, logged since sheet v10); its score starts
// from a prior (declared look-alike, same family, other: core.js CONF) and follows the answers; the quiz picks its traps
// by the same score (app.js confOf, which also gives a shared growth form a slightly higher start). Answers from before
// v10 only add to "Before v10" (mix-ups without the choices offered).
function statsConf() {
  const R = ANS.rows || [],
    C = ofAns('conf', () => confusionOf(R));
  const head = `<div class="adm-shead"><h2>Confusions</h2>${segBtns('min', [
    [1, '≥1'],
    [3, '≥3'],
    [10, '≥10']
  ])}<span class="note">offered / shown</span></div>`;
  if (!R.length) {
    $v.innerHTML = head + '<p class="note">No answers yet.</p>';
    bindStats();
    return;
  }
  const gx = n => DATA.gen[n] || ((DATA.x || {}).gen || {})[n] || {look: []};
  const look = (a, b) => (gx(a).look || []).includes(b) || (gx(b).look || []).includes(a);
  const prior = (a, b) =>
    look(a, b) ? ['Look-alike', CONF.LOOK] : gx(a).fam && gx(a).fam === gx(b).fam ? ['Family', CONF.FAM] : ['Other', CONF.BASE];
  const cmp = (a, b) =>
    `<a class="adm-gen" href="./#${routeOut(`cmp-${a}|${b}`)}" target="_blank" rel="noopener" title="Compare on the site"><i>${esc(a)}</i> · <i>${esc(b)}</i></a>`;
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
  ])}<span class="note">answers</span></div>`;
  if (!L.length) {
    $v.innerHTML = head + '<p class="note">No answers yet.</p>';
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
    q1 = qtl(ds, 0.25),
    q3 = qtl(ds, 0.75),
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
  // A row's reading m: the median of its photos; a genus (off: its offset, ?stats=1 gd, sheet v31) reads for a typical
  // photo of it, its difficulty offset (Pierre, 2026-11-05), the median when the sheet serves none. Hardest first.
  const rowsOf = (O, T, off) =>
    Object.entries(O)
      .map(([k, a]) => {
        const md = median(a.map(p => p.d)),
          o = off && off[k] && isFinite(off[k][0]) ? off[k][0] : null;
        return {
          k,
          t: T ? T[k] || k : k,
          a,
          md,
          o,
          m: o ?? md,
          n: a.reduce((t, p) => t + p.n, 0),
          ok: a.reduce((t, p) => t + p.ok, 0)
        };
      })
      .sort((a, b) => b.m - a.m);
  const V = rowsOf(
      group(p => p.view),
      VIEW_T
    ),
    S = rowsOf(group(origin), ORIGIN_T),
    GN = rowsOf(
      group(p => p.genus),
      null,
      GD
    ),
    // A genus's reading, its raw values in the title.
    genRec = (r, short) =>
      recBadge(r.m, {
        short,
        of: 'a typical photo of the genus',
        raw: r.o != null ? 'genus offset' : `median difficulty of its ${r.a.length} photo${r.a.length === 1 ? '' : 's'} here`,
        more: r.o != null ? `median of its ${r.a.length} photo${r.a.length === 1 ? '' : 's'} here ${rawNum(r.md)}` : ''
      });
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
      return `<button type="button" class="v-${p.view}" style="left:${X(p.d)};--s:${(7 + 5 * k).toFixed(1)}px;opacity:${(0.35 + 0.6 * k).toFixed(2)}" data-zf="${esc(p.f)}" data-g="${esc(p.genus)}" title="${esc(VIEW_T[p.view] || p.view)} · recognised by ${recPct(p.d)} (difficulty ${rawNum(p.d)}) · ${p.a} answer${p.a === 1 ? '' : 's'}, ${pct(p.ok, p.n)} right"></button>`;
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
      return `<span class="adm-strip" title="${esc(VIEW_T[v])}: median photo recognised by ${recPct(med)} (difficulty ${rawNum(med)}), ${P.length} photo${P.length === 1 ? '' : 's'}"><b style="left:${X(0)}"></b>${box}${P.map(dot).join('')}<i class="v-${v}" style="left:${X(med)}"></i></span>`;
    },
    strip = a => `<span class="adm-lanes">${lanes.map(v => lane(a, v)).join('')}</span>`;
  const table = (Rw, first) =>
    `<table class="adm-tbl"><thead><tr><th>${first}</th><th>Photos</th><th title="The median photo: starting players who recognise it without guessing">Recognised</th><th>Right</th></tr></thead><tbody>${Rw.map(r => `<tr><td>${esc(r.t)}</td><td class="n">${r.a.length}</td><td>${recBadge(r.m, {short: 1, of: 'the median photo', raw: 'median difficulty'})}</td><td>${pct(r.ok, r.n)}</td></tr>`).join('')}</tbody></table>`;
  const legend = `<p class="adm-legend">${Object.keys(VIEW_T)
    .filter(v => L.some(p => p.view === v))
    .map(v => `<span><i class="v-${v}"></i>${VIEW_T[v]}</span>`)
    .join('')}</p>`;
  $v.innerHTML =
    head +
    kpis([
      ['Photos rated', L.length],
      ['Median photo, recognised by', recBadge(med, {short: 1, of: 'the median photo', raw: 'median difficulty'})],
      [
        'Middle half, recognised by',
        `<span title="${esc(`Half the photos are between ${recPct(q3)} and ${recPct(q1)}: difficulty ${rawNum(q1)} to ${rawNum(q3)} (quartiles), spread (SD) ${sd.toFixed(2)}`)}">${recOf(q3)}–${recPct(q1)}</span>`
      ],
      ['Hardest genus', `<i>${esc(GN[0].k)}</i> ${genRec(GN[0], 1)}`]
    ]) +
    `
    <div class="adm-sgrid">
    <section class="adm-scard"><h3>Distribution</h3><div class="adm-cols stack">${H.map(
      h =>
        `<div title="${esc(`Recognised by ${recOf((h.b + 1) / 10)}–${recPct(h.b / 10)} · difficulty ${rawNum(h.b / 10)} to ${rawNum((h.b + 1) / 10)}`)}">${Object.keys(
          VIEW_T
        )
          .filter(v => h.v[v])
          .map(v => `<i class="v-${v}" style="height:${(100 * h.v[v]) / hm}%"></i>`)
          .join('')}</div>`
    ).join('')}</div>
${recScale(lo / 10, (hi + 1) / 10)}
      <p class="adm-axis"><span>${recPct(lo / 10)}</span><span>easier · recognised by · harder</span><span>${recPct((hi + 1) / 10)}</span></p>${legend}</section>
    <section class="adm-scard"><h3>Views</h3>${table(V, 'View')}</section>
    <section class="adm-scard"><h3>Sources</h3>${table(S, 'Source')}</section>
    <section class="adm-scard wide"><h3>Genera</h3>${legend}<div class="adm-gstrips">${GN.map(r => `<div><a class="adm-gen" href="${esc(genusHref(r.k))}"><i>${esc(r.k)}</i></a><span class="n">${genRec(r, 1)}</span>${strip(r.a)}</div>`).join('')}</div>
      ${recScale(x0, x1, 'strip')}<p class="adm-axis strip"><span>${recPct(x0)}</span><span>easier · recognised by · harder</span><span>${recPct(x1)}</span></p></section>
    </div>`;
  bindStats();
}
