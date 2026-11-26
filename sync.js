// IMR Reef ID: the link with the sync sheet (tools/sync/Code.gs): progress under a name and 4-digit code, photo
// statistics, reports, anonymous answers, events, sign-in. Shares app.js's top-level names and its sync state (SYNC_URL,
// LOCAL, SYNC, syncTrouble); loaded right after it and required (retried by the loader, else start-up offers Try again).
// Storage read once (REE-263; docs/reviews/2026-11-24-per-answer-cost.md, fix 5): the keys an answer's work reads many
// times (sheetV, model.js startV and imrSaid, once for every unit; the answer logs LOG0 and ANONQ, about 600 KB each at
// their cap, read whole several times an answer by quiz.js) are parsed once and kept, with what is read from them, as
// long as the key's stored text stays the same. The first read of a key in a task asks the storage for the text (core.js
// keyGet, as app.js store.get does) and compares it with the text kept; the task's later reads trust that comparison
// (app.js freshSeen: one check per task), unless this tab wrote the key since (app.js storeWrote: every write of this
// tab, store.set, store.drop, store.raw, keptPush), so a kept value is never older than the storage.
// Another tab's write is seen by the next task's first read. As store.get: d when the storage throws, holds nothing or
// holds no JSON (d is never kept). A kept value is shared, not a copy: keptGet only for readers that never change it;
// keptBy keeps a value read from it (f: a function of the stored value alone, one per name).
// KEPT_CHECK.on (the smokes: tests/facheck.js): every kept value is checked against a fresh store.get, the reads that
// trust the task's comparison included, and a difference throws.
// Without app.js's task marks (the unit tests that run this file alone), every read compares, as before.
const KEPT = new Map(),
  KEPT_CHECK = {on: typeof window !== 'undefined' && window.KEPT_CHECK_ON === true},
  KEPT_FRESH = typeof freshNow === 'function';
function keptEntry(k) {
  if (KEPT_FRESH && freshSeen(k)) return KEPT.get(k) || null;
  let raw;
  try {
    raw = keyGet(localStorage, k);
  } catch (e) {
    return null; // a blocked storage: no mark, the next read asks again
  }
  if (KEPT_FRESH) FRESH.set(k, freshNow());
  if (raw === null) return (KEPT.delete(k), null);
  let e = KEPT.get(k);
  if (!e || e.raw !== raw) {
    e = {raw, ok: true, v: undefined, by: new Map()};
    try {
      e.v = JSON.parse(raw);
    } catch (x) {
      e.ok = false;
    }
    KEPT.set(k, e);
  }
  return e;
}
const keptSame = (a, b) => Object.is(a, b) || JSON.stringify(a) === JSON.stringify(b);
// Thrown, and again in a task of its own, so a reader that catches its errors (quiz.js tipsLoad) cannot hide it.
const keptFail = (k, what) => {
  const e = new Error(`kept storage read: ${k} ${what} differs from a fresh store.get`);
  setTimeout(() => {
    throw e;
  });
  throw e;
};
// store.get(k, d), shared.
function keptGet(k, d) {
  const e = keptEntry(k),
    v = e && e.ok ? e.v : d;
  if (KEPT_CHECK.on && !keptSame(v, store.get(k, d))) keptFail(k, 'value');
  return v;
}
// f(store.get(k, d)), kept under name while k's text is the same.
function keptBy(k, d, name, f) {
  const e = keptEntry(k);
  let v;
  if (!e || !e.ok) v = f(d);
  else {
    if (!e.by.has(name)) e.by.set(name, f(e.v));
    v = e.by.get(name);
  }
  if (KEPT_CHECK.on && !keptSame(v, f(store.get(k, d)))) keptFail(k, name);
  return v;
}
// store.set(k, [...store.get(k, []), x].slice(-cap)): the text written is kept with its value, so the next read parses
// nothing. A stored value that is no list goes the old way (store.get's value spread, a throw included).
function keptPush(k, x, cap) {
  const L = keptGet(k, []);
  if (!Array.isArray(L)) return store.set(k, [...store.get(k, []), x].slice(-cap));
  const ref = KEPT_CHECK.on ? JSON.stringify([...store.get(k, []), x].slice(-cap)) : null,
    v = [...L, x].slice(-cap);
  let raw;
  try {
    raw = JSON.stringify(v);
    if (KEPT_FRESH) storeWrote(k);
    localStorage.setItem(k, raw);
  } catch (e) {
    return;
  }
  if (KEPT_CHECK.on && raw !== ref) keptFail(k, 'push');
  KEPT.set(k, {raw, ok: true, v, by: new Map()});
  if (KEPT_FRESH) FRESH.set(k, freshNow()); // the text just written is the stored text
}
// Photo difficulty (the pooled Elo; without it every prior is 0), kept offline with the sheet's version (v): refreshed
// every 10 minutes while visible (the sheet caches it as long) and on return to a tab left longer.
let statsAt = 0;
setInterval(() => {
  if (document.visibilityState === 'visible') loadStats();
}, 600000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - statsAt > 600000) loadStats();
});
// It also tells the sheet (Code.gs behind_) the app's version, this device's anonymous id (devId, as its events) and the
// minutes this page has been open (up): a device left on a replaced version is logged as 'old' with its id, so the admin
// can find whose it is. Never from a local copy (LOCAL: a test, a developer; rule D1): without a device id the sheet
// logs nothing.
function loadStats() {
  if (!SYNC_URL || !DATA) return;
  statsAt = Date.now();
  const me = LOCAL ? '' : `&dev=${devId()}&up=${Math.round(performance.now() / 60000)}`;
  fetch(`${SYNC_URL}?stats=1&av=${appVer()}${me}`)
    .then(r => r.json())
    .then(j => {
      sheetSeen(j);
      if (j && j.ok && j.photos) {
        const st = {
          t: Date.now(),
          v: j.v,
          photos: j.photos,
          conf: j.conf || {},
          ...(j.mem ? {mem: j.mem} : {}),
          ...(j.gd ? {gd: j.gd} : {}),
          ...(j.fmt ? {fmt: j.fmt} : {})
        };
        // The photo ratings, the confusions and the genus offsets of the photo Elo (model.js photoDiff), joined
        // to each other subject's own (model.js statsJoin)
        statsJoin(st);
        PMEM = memOf(j.mem); // photo memory offsets
        if (typeof rankPhotos === 'function') rankPhotos(); // the fish lists' first photos follow the new ratings (app.js)
        PFMT = fmtsOf(j); // per-format offsets (sheet v77, core.js fmtOffsetsOf)
        store.set('reefid-photo-stats', st);
      }
      loadOwnStats();
    })
    .catch(() => {});
}
// The subject on screen's own pooled statistics (core.js SUBJECTS stats: the sea slugs; Code.gs statsServed_), so its
// draw, traps and data look-alikes follow its players' answers: from a script that serves them (S.stats, rule D4), a
// reply that names that subject (s) only; kept here and joined to the corals' (model.js OWN_STATS, statsJoin).
const ownStatsAt = {};
function loadOwnStats(S = SUBJ) {
  if (!SYNC_URL || !S || !S.stats || sheetV() < S.stats) return;
  ownStatsAt[S.id] = Date.now();
  fetch(`${SYNC_URL}?stats=1&s=${encodeURIComponent(S.id)}&av=${appVer()}`)
    .then(r => r.json())
    .then(j => {
      if (!j || !j.ok || !j.photos || j.s !== S.id || !(Number(j.v) >= S.stats)) return;
      store.set(OWN_STATS + S.id, {t: Date.now(), v: j.v, s: j.s, photos: j.photos, conf: j.conf || {}, ...(j.gd ? {gd: j.gd} : {})});
      statsJoin();
      if (typeof rankPhotos === 'function') rankPhotos();
    })
    .catch(() => {});
}
// A switch to a subject with its own statistics brings them, unless asked in the last 10 minutes (a visit, keep, never).
if (typeof SUBJ_HOOKS !== 'undefined')
  SUBJ_HOOKS.push(keep => {
    if (!keep && Date.now() - (ownStatsAt[SUBJ.id] || 0) > 600000) loadOwnStats();
  });
// The genera of the global progress (app.js scaleUnits: the corals' one 45-genus scale, the slate then the bonus
// genera, rule L6): the sheet's "By genus" columns and the leaderboard % follow them (Code.gs board_ ranks over the
// tab's header); Learned, seen, total and review stay the slate's, as My progress counts them. Only from SCALE_SHEET,
// the script that widens the tab's grid before writing a longer header (rule D4: an older one fails the save of a
// summary wider than the tab); before it, the slate's, as before.
const SCALE_SHEET = 221;
const scaleSent = () => (sheetV() >= SCALE_SHEET ? scaleUnits() : slateGenera());
// The first leaderboard's subject (core.js SUBJECTS board: corals), whatever the subject on screen; the others' units
// in boards.
function syncSummary() {
  const B = SUBJECTS.find(x => x.board);
  if (B && B !== SUBJ) return inSubject(B.id, syncSummary);
  const n = slateGenera(),
    all = scaleSent(),
    genera = Object.fromEntries(all.map(x => [x, level(x)[0]]));
  return {
    learned: n.filter(x => genera[x] === 'ok').length,
    seen: n.filter(x => genera[x] !== 'new').length,
    total: n.length,
    review: n.filter(x => genera[x] === 'weak'),
    genera,
    pct: progPct(all), // the public leaderboard: progress as the header shows it
    board: boardOn() ? 1 : 0,
    boards: boardUnits()
  };
}
// The units each other leaderboard counts (SUBJECTS board after the first; Code.gs boardUnitsSave_): {id: its slate as
// My progress counts it}, none for a subject not loaded here. A subject with a global score (the fish) sends its tree
// (Code.gs board_, core.js treeScore); from TREE_SHEET only when not kept there already (treeKept, treesSeen).
const boardUnits = () =>
  Object.fromEntries(
    SUBJECTS.filter((S, i, a) => S.board && S !== a.find(x => x.board))
      .map(S => {
        const U = typeof UNITS === 'object' ? UNITS[S.id] : null,
          // its own units, whichever tree subject is on screen (app.js treeWith: the sea slugs' in force would give theirs)
          own = f => (typeof treeWith === 'function' ? treeWith(S.id, f) : f()),
          T = U && S.score && U.tree ? own(() => U.tree()) : null;
        if (T && treeOn() && treeKept(S.id, T)) return [S.id, null];
        return [S.id, T || (U ? own(() => U.slate()) : [])];
      })
      .filter(([, u]) => u && (Array.isArray(u) ? u.length : (u.f || []).length))
  );
// The leaderboard trees on the sheet (TREE_SHEET; Code.gs boardUnitsSave_ bt): {id: {h: this device's tree's checksum
// when a save carried it, t: the sheet's checksum of the tree it held in that save's reply}}, on this device whatever the
// account (one tree per subject for the whole sheet).
const TREE_SHEET = 143;
const treeOn = () => sheetV() >= TREE_SHEET;
// The fish species level (docs/reviews/2026-11-14-species-step1.md): its units open, and count in the global score and
// its leaderboard tree (app.js UNITS fish tree), only once the sheet keeps the tree in chunks (treeOn) and replays the
// species units as the game scores them (SPECIES_SHEET: core.js treeReplayGen); before, they stay closed (rule D4). The
// one predicate every species rule reads.
const SPECIES_SHEET = 161;
const speciesOn = () => treeOn() && sheetV() >= SPECIES_SHEET;
// The scientific genera of circles 2 and 3 (core.js treeGenSets; docs/FISH_PATH.md): they open, and count among the
// genera a question offers, only once the sheet replays them as the game scores them and its board tree holds them
// (GENERA_SHEET: core.js treeReplayGen, treeBoardTree, treeVarTable); before, circle 1's alone (rule D4). The one
// predicate (app.js sciNow).
const GENERA_SHEET = 176;
const generaOn = () => sheetV() >= GENERA_SHEET;
// The species by their scientific names, the fish's and the sea slugs' (docs/reviews/2026-11-18-species-step2-plan.md
// §2.2): they may open, and count in the global score, only once the sheet replays them as the game scores them, a
// smaller fault included (SCI_SHEET: core.js treeReplayGen, treeSpUnits 'sci', PART; its leaderboard tree with them,
// treeBoardTree); before, they stay closed (rule D4). The one predicate the app's species rules will read (its app PR).
const SCI_SHEET = 198;
const sciOn = () => sheetV() >= SCI_SHEET;
const TREES = 'reefid-board-trees';
const treeSums = new WeakMap();
const treeSum = T => {
  if (!treeSums.has(T)) treeSums.set(T, dataSum({t: JSON.stringify({f: T.f, s: T.s})}));
  return treeSums.get(T);
};
const treeKept = (id, T) => {
  const k = (store.get(TREES, {}) || {})[id];
  return !!k && k.h === treeSum(T);
};
// A save's reply (j.bt from TREE_SHEET), sent: {id: the checksum of each tree that save carried}. A tree carried is
// kept as sent, whether the sheet took it or refused it (a refused one is in its Deploy log; it would only be refused
// again); a subject whose tree the sheet now holds differs from the one it held when this device last sent (another
// app sent its own) is sent again with the next save. A reply without bt changes nothing: what was carried goes again.
function treesSeen(j, sent) {
  if (!j || !(Number(j.v) >= TREE_SHEET) || !j.bt || typeof j.bt !== 'object') return;
  const K = {...(store.get(TREES, {}) || {})};
  Object.keys(j.bt).forEach(id => {
    const t = String(j.bt[id]);
    if (sent[id]) K[id] = {h: sent[id], t};
    else if (K[id] && K[id].t !== t) delete K[id];
  });
  store.set(TREES, K);
}
// A load, its data read with the new key names (core.js keysIn). rv: the rules version last replayed here (an older one
// brings the full replay); pt: the oldest queued answer's time (pendingFrom); info: for a failed save's report
// (sheetCall); have: the revision of the saved copy held here (sdOf), a reply same: 1 then gets this device's own
// instead; light: the hold's ids from pt only (Code.gs hold_).
const syncGet = (a = SYNC, info = {}) => {
  const sd = sdOf(a);
  return sheetCall(
    `${SYNC_URL}?name=${encodeURIComponent(a.name)}&pin=${encodeURIComponent(a.pin)}&av=${appVer()}&rv=${rvAsk()}${rvsParam()}${ptParam(a.log)}&light=1${sd ? '&have=' + a.srv : ''}`,
    undefined,
    info,
    'load'
  ).then(j => {
    if (j && j.data) j.data = keysIn(j.data);
    if (j && j.ok && j.found && j.same && !j.data) j.data = sd ? {...sd} : null;
    return j;
  });
};
// Lighter saves on slow lines (docs/ARCHITECTURE.md "Lighter saves on slow lines"): the saved copy held at the revision
// merged against (SYNC.sd {rev, d}, as a load serves it; sdSeen, sdSaved) lets a save send only the delta (core.js
// dataDelta, dataSum; else 'delta': all again), gzipped (zipOk), with no load first (skipPull; else 'stale' + the load).
const sdOf = me =>
  me && me.sd && typeof me.srv === 'number' && me.sd.rev === me.srv && me.sd.d && typeof me.sd.d === 'object' ? me.sd.d : null;
// A sync still loads first on the page's first sync (repsPulled), with answers logged from a refused save (lg) or
// anonymous ones (anon), with no account generation (acct), or after a send whose reply never came (base[1]: only a load
// tells whether it was saved).
const skipPull = me => repsPulled && !!sdOf(me) && !!me.acct && !me.lg && !me.anon && !SUBJECTS.some(S => me[S.base[1]]);
// The saved copy a load's reply holds (the copy, or this device's own when same).
function sdSeen(me, j) {
  if (!j || !j.ok) return;
  if (j.found && j.data && typeof j.rev === 'number') me.sd = {rev: j.rev, d: {...j.data}};
  else delete me.sd;
}
// The copy a light save left on the sheet (its checksum in the reply, sum): this device's data X, with the keys of a
// subject this app did not send kept from the copy it saved over (core.js keepSubjectKeys, as Code.gs keeps them).
// Another checksum (or none): the copy is not known here, and the next sync loads it.
function sdSaved(me, X, sumX, base, j) {
  const K = keepSubjectKeys(base || {}, X),
    d = j && typeof j.sum === 'string' && typeof j.rev === 'number' ? (j.sum === sumX ? X : dataSum(K) === j.sum ? K : null) : null;
  if (d) me.sd = {rev: j.rev, d};
  else delete me.sd;
}
// The body in gzip, as base64 (CompressionStream: Chrome 80, Safari 16.4, Firefox 113), null when it cannot be made here;
// not after the sheet said it could not read one, until its script changes (nz: the version it said it).
const zipOk = me => typeof CompressionStream === 'function' && typeof Response === 'function' && !(Number(me.nz) >= sheetV());
async function gzip64(t) {
  try {
    const b = new Uint8Array(await new Response(new Response(t).body.pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
    let s = '';
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  } catch (e) {
    return null;
  }
}
// A light save's body: gzipped when that makes it shorter, else as it is, wrapped either way (Code.gs doPost_).
async function lightBody(me, o) {
  const t = JSON.stringify(o),
    z = t.length > 1024 && zipOk(me) ? await gzip64(t) : null;
  return z && z.length + 8 < t.length ? JSON.stringify({z}) : JSON.stringify({lt: o});
}
// The full replay (docs/ARCHITECTURE.md "Full replay"): a request with an older rules version (rv, core.js RVS) gets
// the player's log replayed by this app's engine on the sheet (Code.gs replay_), replay: {rv, n, rec, ids}, adopted once
// per version (replayAdopt: this device's uncounted answers on top; core.js replayedOf keeps what the log cannot give,
// then rvNotice's cards). The version applied (RVK) travels with the progress.
const RVK = 'reefid-sync-coral-rv';
// The other subjects the sheet replays (SUBJECTS replayed: fish, sea slugs), each with its own version applied (rvKey,
// travelling as RVK does; asked as rv_<subject>), adopted as the corals' (replayAdoptS) from the script that replays it
// (SUBJECTS replayed sheet, rule D4; before, the plain merge).
const rpSubjects = () => SUBJECTS.filter(S => !S.replay && S.replayed);
const rvKey = S => (!S || S.replay ? RVK : subjKey(S.id, 'rv'));
const rpOn = (S, v) => !!S && (!!S.replay || (!!S.replayed && Number(v) >= (Number(S.replayed.sheet) || 0)));
const rvApplied = S => Number(store.get(rvKey(S), 0)) || 0;
// The rules version a request says: the one applied here, or 0 while the sheet's log may hold answers this device's
// merge baseline lacks (SYNC.lg: set by a refused save the sheet logged, or by fateUnknown: no reply, a timeout, a
// script failure; another device may have saved over that copy since): the plain merge would count them twice, so every
// request asks for the replay until a save carries them (syncOnce).
const lgFor = () => !!(SYNC && SYNC.lg);
function fateUnknown(me) {
  if (SYNC !== me) return;
  me.lg = 1;
  store.set('reefid-account', me);
}
const rvAsk = S => (lgFor(S) ? 0 : rvApplied(S));
// Another subject's units for its replay (core.js replayProgress gen; app.js UNITS gen), null before they are in; read
// with its own tree in force (treeWith): the fish and the sea slugs share the tree engine.
const rpUnits = S => {
  const U = typeof UNITS === 'object' ? UNITS[S.id] : null;
  if (!U || !U.gen) return null;
  return typeof treeWith === 'function' ? treeWith(S.id, () => U.gen()) : U.gen();
};
// Its variant table (core.js treeVarTable, rvVars), for the answers replayed here on top, as the sheet reads it: a queued
// right answer on a unit's last variant group keeps its learned mark. Null before it is in; read as rpUnits.
const rpVars = S => {
  const U = typeof UNITS === 'object' ? UNITS[S.id] : null;
  if (!U || !U.vars) return null;
  return typeof treeWith === 'function' ? treeWith(S.id, () => U.vars(S)) : U.vars(S);
};
// The other subjects' versions a request says, each only once a reply said the script replays it (sheetV), so an older
// script is never asked for a replay the app would not adopt, and once its units are in (the replay waits for them).
const rvsAsk = () =>
  Object.fromEntries(
    rpSubjects()
      .filter(S => rpOn(S, sheetV()) && rpUnits(S))
      .map(S => [S.id, rvAsk(S)])
  );
// The structure stamps (core.js structStamp; docs/reviews/2026-11-14-sheet-overlay-design.md): a subject whose circles
// and pairs the content editor may change (SUBJECTS structure) keeps the stamp it was last replayed with (stKey, '' for
// the base's, travelling as rv does) and says it (sts); another stamp on the sheet brings a replay, its st adopted with
// it (replayAdoptS). From STRUCT_SHEET only (rule D4); before, the units hold the text slots alone (app.js treeBuild).
const stKey = S => subjKey(S.id, 'st');
const stApplied = S => String(store.get(stKey(S), '') || '');
// Each subject from its own script version (core.js structSheet: the fish's STRUCT_SHEET, the corals' PAIRS_SHEET).
const stOn = (S, v) => !!S && !!S.structure && rpOn(S, v) && Number(v) >= structSheet(S);
// Read with its own tree in force (app.js treeWith), whichever tree subject is on screen: a tree subject's st reads the
// globals of the tree in force.
const stNow = S =>
  typeof UNITS === 'object' && UNITS[S.id] && UNITS[S.id].st
    ? String((typeof treeWith === 'function' ? treeWith(S.id, () => UNITS[S.id].st()) : UNITS[S.id].st()) || '')
    : '';
// {sts: {subject: stamp applied}, stn: {subject: stamp of the units here, when another: the curation read again}}, for
// the subjects asked and the corals once DATA is in (Code.gs stMain_). The stamp applied is stored ('' when none) so every
// save says it: else another device's stamp would sit beside this progress (keepSubjectKeys) and fool mergeSubject stOff.
const stsAsk = rv => {
  const L = [...SUBJECTS.filter(S => S.replay && typeof DATA !== 'undefined' && DATA), ...rpSubjects().filter(S => S.id in rv)].filter(S =>
    stOn(S, sheetV())
  );
  L.forEach(S => store.get(stKey(S), null) === null && store.set(stKey(S), ''));
  const stn = Object.fromEntries(L.filter(S => stNow(S) !== stApplied(S)).map(S => [S.id, stNow(S)]));
  return L.length ? {sts: Object.fromEntries(L.map(S => [S.id, stApplied(S)])), ...(Object.keys(stn).length ? {stn} : {})} : {};
};
const rvsParam = () => {
  const rv = rvsAsk(),
    st = stsAsk(rv);
  return [
    ...Object.entries(rv).map(([k, v]) => `&rv_${encodeURIComponent(k)}=${v}`),
    ...Object.entries(st.sts || {}).map(([k, v]) => `&st_${encodeURIComponent(k)}=${encodeURIComponent(v)}`),
    ...Object.entries(st.stn || {}).map(([k, v]) => `&sn_${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
  ].join('');
};
// A subject's replay in a reply: the corals' replay, another's in replays (Code.gs replays_).
const rpOf = (j, S) => (!j ? null : S.replay ? j.replay : (j.replays || {})[S.id]);
// The reset of each other subject replayed, as a request carried it (the replay's cutoff, replayAdoptS).
const rpCuts = () => Object.fromEntries(rpSubjects().map(S => [S.id, store.get(subjKey(S.id, 'reset'), '') || '']));
// The time (ms) of the oldest answer of a queue, null when it holds none. Sent with the requests that can bring a replay
// (pt): the sheet then lists in replay.ids every answer it replayed from that time on, so replayAdopt never counts again
// an answer the sheet already has, however many a lost reply left queued here (up to 2,000).
function pendingFrom(q) {
  let t = Infinity;
  (q || []).forEach(a => {
    const x = Date.parse((a && a.t) || '');
    if (x < t) t = x;
  });
  return isFinite(t) ? t : null;
}
const ptParam = q => (pendingFrom(q) === null ? '' : `&pt=${pendingFrom(q)}`);
// cut: the reset time the request was sent with ('' for none). A reset made here meanwhile: the replay is not adopted
// (nor its version marked); the next reply brings it from the new reset. A load needs none (mergeSaved returns first).
// Each subject's own opening hold in a reply (holds, {subject: {h, ids}}: Code.gs holdsInto_, each over that subject's
// answers since its own reset), from HOLDS_SHEET (rule D4: the script carries holds from v210; the gate is the version of
// this app's own change, set at merge). Before it, or in a reply without holds, the replay subject's alone (hold,
// holdIds), the other subjects keeping this device's. A subject the reply leaves out keeps this device's.
const HOLDS_SHEET = 211;
const holdsOn = v => Number(v) >= HOLDS_SHEET;
const holdOf = (j, S) => {
  const H = j && holdsOn(j.v) && j.holds && typeof j.holds === 'object' ? j.holds : null,
    x = H ? H[S.id] : j && S.replay ? {h: j.hold, ids: j.holdIds} : null;
  return x && typeof x === 'object' && typeof x.h === 'number' ? x : null;
};
// The sheet's opening hold of subject S (model.js holdSync), taken as that subject (inSubject), with this device's queued
// answers of that subject only (subjEntries). Nothing for a subject the reply has no hold of (holdOf). cut: the reset
// of that subject as the request carried it (a save's, as replayAdoptS reads it): a reset made here meanwhile keeps
// the device's hold (it started over), the next reply bringing the one since that reset. A load needs none
// (mergeSubject returns before it when this device's reset is newer).
function holdAdopt(S, j, log, cut) {
  const x = holdOf(j, S);
  if (!x) return;
  if (S !== SUBJ) return inSubject(S.id, () => holdAdopt(S, j, log, cut));
  if (cut !== undefined && cut !== (store.get(sKey('reset'), '') || '')) return;
  if (typeof holdSync === 'function') holdSync(x.h, subjEntries(log, S.id), x.ids);
}
// The corals' replay (SUBJECTS replay), adopted as that subject whatever is on screen; the others' by replaysAdopt.
function replayAdopt(rp, pending, v, cut, pre) {
  return replayAdoptS(
    SUBJECTS.find(x => x.replay),
    rp,
    pending,
    v,
    cut,
    pre
  );
}
// Every other subject's replay a reply carries (rpOf), each as itself; cuts: their resets as the request carried them
// (rpCuts). True when one was adopted.
function replaysAdopt(j, pending, cuts) {
  return rpSubjects().reduce((a, S) => replayAdoptS(S, rpOf(j, S), pending, j && j.v, cuts ? cuts[S.id] : undefined) || a, false);
}
// The headline % of a progress record of the subject on screen (model.js headPct: its global score, else the mean of
// its units' bars), for the recalculation card.
const headOf = X => {
  const U = typeof UNITS === 'object' ? UNITS[SUBJ.id] : null,
    T = SUBJ.score && U && U.tree ? U.tree() : null,
    L = typeof scaleUnits === 'function' ? scaleUnits() : [];
  return T ? treeScore(X, T, SUBJ.score).pct : pctOf(X, L);
};
function replayAdoptS(S, rp, pending, v, cut, pre) {
  sheetSeen({v});
  if (S && S !== SUBJ) return inSubject(S.id, () => replayAdoptS(S, rp, pending, v, cut));
  if (!S) return false;
  pending = subjEntries(pending, SUBJ.id); // this device's queued answers of that subject on top, never another's
  if (!rpOn(S, v)) return false;
  if (!rp || typeof rp.rv !== 'number' || !rp.rec || typeof rp.rec !== 'object') return false;
  // The structure stamp it was made under ('' for the base's structure, also when the reply has none), null for a subject
  // with no structure or a script before STRUCT_SHEET.
  const stamp = stOn(S, v) ? String(rp.st || '') : null;
  // A newer version, the same one under another structure (stsAsk), or the same one asked again for answers logged from
  // a refused save (rvAsk).
  if (rp.rv < rvApplied(S) || (rp.rv === rvApplied(S) && !lgFor(S) && (stamp === null || stamp === stApplied(S)))) return false;
  // Never a version newer than this app's own rules (core.js rvOf): an app that does not know it cannot hold what it
  // brings, and marked applied it would never take it once updated.
  if (rp.rv > rvOf(S.id)) return false;
  if (typeof mxRecalc !== 'function') return false; // the quiz tier (model.js) not in yet: the next reply brings it again
  if (cut !== undefined && cut !== (store.get(sKey('reset'), '') || '')) return false;
  // The units the replay reads (core.js replayProgress gen): the corals' from data.json, another subject's from its own
  // data (UNITS gen: fish.json's, loaded with the subject); not in yet: the next reply brings it again.
  const gen = S.replay ? {...((DATA && DATA.x && DATA.x.gen) || {}), ...((DATA && DATA.gen) || {})} : rpUnits(S);
  if (!gen) return false;
  // Signed in with anonymous answers not moved to the account yet (signIn; the first save's reply clears SYNC.anon before
  // it adopts): a replay of the account's log alone would leave them out.
  if (SYNC && SYNC.anon) return false;
  // A replay made with another first-launch history than this device's (a history merged here and not saved yet): not
  // adopted, nor its rules version marked applied; the save that follows carries the merged history, and its reply
  // brings the replay made with it (the sheet sends the fingerprint it used, core.js startFp).
  if ((rp.fp || '') !== startFp(store.get(startKey(SUBJ.id), null))) {
    if (SYNC) ((SYNC.dirty = true), store.set('reefid-account', SYNC));
    return false;
  }
  try {
    // Its own rules versions (core.js rvsOf): the cards due are this subject's (progress.js rvNoticeAdd, its sid).
    const from = rvApplied(S),
      played = answersSoFar() > 0 || Object.values(P).some(s => s && typeof s === 'object' && (s.ok || 0) + (s.ko || 0) > 0),
      had = new Set((rp.ids || []).map(String)),
      reset = store.get(sKey('reset'), '') || '',
      me = '~me',
      rows = (pending || []).filter(a => a && a.g && !had.has(String(a.id)) && String(a.t || '') > reset).map(a => logRow(a, me)),
      // The variant table this device's answers replayed on top read, under a rules version that reads it (rpVars).
      vt = rows.length && rvVars(S.id, rp.rv) ? rpVars(S) : null,
      last = Number((rp.rec[LEVEL] || {}).at) || 0,
      // The sheet's photo numbers are the corals' (Code.gs stats_): another subject's replay reads none, nor does this
      // device's on top of it (its answers carry their scoring record).
      st = S.replay ? {mem: PMEM, conf: PCONF, fmt: PFMT, gd: typeof PGD === 'object' ? PGD : {}} : {},
      // This device's answers on top, under the rules of the script that sent the replay, as the live game.
      R = rows.length
        ? replayProgress(rows, {
            gen,
            mem: st.mem,
            conf: st.conf,
            // The per-format offsets (core.js fmtsOf), as the live game.
            fmt: st.fmt,
            start: {[me]: {P: rp.rec, n: 0, used: 0, rep: 0}},
            // The genus offsets for an answer logged without them (an older app's).
            gd: st.gd,
            // The first-launch answer (core.js startPriorAt), as the live game.
            starts: {[me]: store.get(startKey(SUBJ.id), null)},
            // The variant groups left (vl) recomputed with this device's answers, as the sheet's replay (rules D8, D9).
            vars: vt || undefined
          })[me].P
        : rp.rec,
      before = copy(P),
      // The record adopted: core.js replayAdopted (replayedOf: the log is the only reference, rule D9), every unit of this
      // device's progress replaced, the one the sheet's leaderboard ranks a player by until their app adopts it (Code.gs
      // board_, rule D8).
      M = replayAdopted(R, P, rp.rv);
    // Answers of this device's queue older than the replay's last one (an offline device, another one logging since)
    // would count on top of the replay out of time order. Not adopted, nor the version marked applied: the save that
    // follows logs them, and its reply brings the replay of the whole log in time order.
    if (rows.some(r => r[1] < last)) return false;
    // Answers on top under a rules version that reads the variant table, and the table not in (app.js UNITS vars: null
    // until the whole game pool is in): not adopted, nor the version marked applied, so a partial table never clears a
    // group the sheet left; the next reply brings it again.
    if (rows.length && rvVars(S.id, rp.rv) && !vt) return false;
    clockTick(); // the answers counted so far on the answer clock, before the log's count replaces the level's (rule D9)
    // A mark the replay took away: the former model's (a record learned with neither s.pg nor the domain-score bar,
    // core.js afterBkt), or a rule of the new version.
    mxRecalc(
      () => {
        Object.keys(P).forEach(g => delete P[g]);
        Object.assign(P, M);
        faDrop(P); // refilled in place: its false-alarm counters made again at the next read (core.js faOf)
      },
      n => (afterBkt(before[n]) ? 'rules' : 'bkt')
    );
    if (typeof stateBump === 'function') stateBump('rec'); // P refilled in place: an input of the views (app.js)
    clockTick(); // and right after: the log's count the clock's baseline before another answer is counted
    store.set(rvKey(S), rp.rv);
    if (stamp !== null) store.set(stKey(S), stamp); // the structure it was replayed under ('' for the base's)
    // The merge baseline (mergeSaved) becomes the shared history: the sheet's replay itself (core.js replayBase), never
    // mixed with this device's answers the sheet has not counted yet, which stay this device's own (P minus the base) and
    // go on top at the next merge. Left at the saved copy, replayed answers would count twice; built from this device's
    // copy, an unsent answer would be lost.
    if (SYNC) {
      SYNC[S.base[0]] = replayBase(rp.rec, M, rp.rv, SYNC[S.base[0]]);
      // The replay counts every logged answer of this subject; the flag (lg) goes with the save that carries them (syncOnce).
      store.set('reefid-account', SYNC);
    }
    save();
    // The progress % before and after, for a card shown only to the players whose % moved (core.js RVS msg.only). pre:
    // the % this device showed before the sync that brought the replay (mergeSaved), as the pull may already have merged
    // a copy another device saved after its own adoption.
    if (played && typeof rvNoticeAdd === 'function')
      rvNoticeAdd(from, rp.rv, [typeof pre === 'number' ? pre : headOf(before), headOf(P)], S.replay ? undefined : S.id);
    if (!SUBJ_VISIT && hashNow() === 'progress') route(); // not while visiting: the page shows another subject
    return true;
  } catch (e) {
    ev('err', {msg: 'replay not adopted: ' + String((e && e.message) || e).slice(0, 120)});
    return false;
  }
}
// The answer clock (model.js tally: the answers counted on this device, never going down, which the checkpoints count
// on) brought up to the level's answer count before a merge or a replay's adoption changes that count: a count that goes
// up then down in one sync (another device's answers merged, then the log's count adopted), or a clock not started yet
// (it starts at the count), loses no answer; and right after, so the new count is its baseline before the next answer.
// Not before model.js is in (the quiz tier): the clock then starts at the count it finds.
const clockTick = () => typeof tally === 'function' && tally();
// At the end of each subject's merge, the other devices' marks in (the progress's exams, the cards, the surprise cards):
// the clock moved up to the latest of them if it is behind (model.js clockSync).
const clockSeen = () => typeof clockSync === 'function' && clockSync();
// Two devices on one account: three-way merge against SYNC.base, the progress as last sent or received.
// Answers taken on this device since then are added on top of the saved record, so neither side's answers
// are lost. A reset (reefid-sync-coral-reset, a time) wins over older progress.
const copy = o => JSON.parse(JSON.stringify(o));
// Once everything is merged, a first-launch question card left waiting gets the answer given on another device and the
// quiz goes on (model.js startResume), never inside the merge, where the quiz would draw on the progress and cards from
// before it.
function mergeSaved(j) {
  try {
    return mergeSavedIn(j);
  } finally {
    if (typeof startResume === 'function') setTimeout(startResume, 0);
  }
}
function mergeSavedIn(j) {
  // The saved copy is the one this device saved or loaded last: the sheet's revision counts every write, any app's.
  const mine = typeof j.rev === 'number' && j.rev === SYNC.srv;
  if (typeof j.rev === 'number') SYNC.srv = j.rev; // the sheet's revision this merge is based on (sent back as at)
  const d = j.data || {};
  // The leaderboard choice made on another device, if more recent than this one's (else this one's goes with the next send).
  try {
    const rb = JSON.parse(d[BOARD] || 'null');
    if (rb !== null && boardT(rb) > boardT(store.get(BOARD, null))) {
      store.set(BOARD, rb);
      showBoardSet();
    }
  } catch (e) {}
  // Each subject's custom quiz selection made on another device, if more recent than this one's (model.js CUSTOM.KEY,
  // quiz.js viewCustom: {g, t}); a subject the saved copy lacks one for is left alone.
  SUBJECTS.forEach(S => {
    const k = subjKey(S.id, 'custom');
    try {
      const rc = JSON.parse(d[k] || 'null'),
        lc = store.get(k, null);
      if (rc && Array.isArray(rc.g) && (rc.t || 0) > ((lc && lc.t) || 0)) store.set(k, rc);
    } catch (e) {}
  });
  achMerge(d[ACHK]); // achievements earned on another device join this one's
  toldMerge(d[TOLD.KEY]); // the notices told on another device: never told again here (noticesGo decides after the merge)
  // Each subject's first-launch question answered on another device (model.js startMerge; the latest answer wins).
  SUBJECTS.forEach(S => S.start && startMerge(d[startKey(S.id)], S.id));
  // Each subject's progress as if on screen (inSubject). One the saved copy lacks is left alone (the corals always run):
  // absent is not empty (an older app's copy lacks a newer subject; a reset is an empty record with its time).
  SUBJECTS.forEach((S, i) => {
    const pk = subjKey(S.id, 'progress');
    if (i && !(pk in d)) return;
    inSubject(S.id, () => mergeSubject(j, d, S, mine));
  });
  showBon(); // ⚙'s opt-in switches, from the subject on screen's settings
}
// One subject's part of mergeSaved, run as the current subject: SYNC[S.base[0]] is its progress as last sent or received,
// SYNC[S.base[1]] what a send on its way held (core.js SUBJECTS base: SYNC.base and SYNC.pending for the corals).
// mine: the saved copy is the one this device saved or loaded last (mergeSaved).
function mergeSubject(j, d, S, mine) {
  const [BK, PK] = S.base;
  // The % shown before this sync, for the recalculation card (replayAdopt).
  const pre = typeof slateGenera === 'function' ? headOf(P) : undefined;
  // A subject whose progress the sheet replays under this app's rules (the corals; fish from its script, rpOn): its
  // rules version applied (rvKey) and its replay (rpOf) take part in the merge below; any other, the plain merge.
  const RO = rpOn(S, j.v),
    RK = rvKey(S),
    rpS = rpOf(j, S);
  // A saved copy replayed under another structure than this device's (stKey; STRUCT_SHEET): neither is the other's
  // older or newer version of one history, so it is never merged into this one (its units' records were made under
  // other circles and pairs: a family in no circle would get its records back), and the replay of the whole log is asked
  // for again (the rules version back to 0, as for a copy under older rules), whose adoption sets the stamp in force.
  const stOff = (() => {
    if (!RO || !stOn(S, j.v)) return false;
    try {
      return String(JSON.parse(d[stKey(S)] || '""') || '') !== stApplied(S);
    } catch (e) {
      return true;
    }
  })();
  const introIn = () => introMerge(d[INTRO.KEY], d[INTRO.OFFER.KEY]); // first-meeting cards seen on another device
  // The surprise cards (winks) shown on another device: once per player, whatever a reset (quiz.js winkMerge).
  if (typeof winkMerge === 'function') winkMerge(d[sKey('wink')]);
  let R = {};
  try {
    R = JSON.parse(d[sKey('progress')] || '{}') || {};
  } catch (e) {}
  // The old unit ids a device on an older app may still save (core.js SUBJECTS renamed: the fish entries became families),
  // and this device's merge baseline from before the switch, both under the new ids, so nothing counts twice.
  R = renameUnits(S, R);
  if (SYNC[BK]) SYNC[BK] = renameUnits(S, SYNC[BK]);
  const rr = JSON.parse(d[sKey('reset')] || '""'),
    lr = store.get(sKey('reset'), '');
  // A send whose reply was lost but which did reach the sheet: the saved record is exactly what was sent.
  // (Said the same: the sheet may spell a copy rebuilt from a light save's delta in another key order, core.js sameText.)
  if (SYNC[PK] && sameText(d[sKey('progress')], SYNC[PK])) SYNC[BK] = R;
  delete SYNC[PK];
  // A reset made here the sheet lacks: this progress stays, and a replayed subject asks for the replay since the reset
  // (rules version 0): other devices may have answered after it from a copy without it, and those answers count.
  if (lr > rr) return void (RO && store.set(RK, 0));
  // The Bonus genera choice (fish: the scientific genera) made on another device, if more recent than this one's (or made there
  // only); after the reset check, so a choice saved before this device's newer reset does not come back.
  try {
    const rq = JSON.parse(d[sKey('quiz')] || '{}') || {};
    S.optin.forEach(k => {
      if (typeof rq[k] === 'boolean' && (Q[k] === undefined || (rq[k + 'T'] || 0) > (Q[k + 'T'] || 0))) {
        Q[k] = rq[k];
        Q[k + 'T'] = rq[k + 'T'] || 0;
        // With the choice, its "Not now" count and when (UNITS opens: the offer comes back at most once), and the rules it
        // was made under (V: the back card, quiz.js bonusBackDue) and by (H: by hand before Advanced, app.js bonusSet), and
        // whether it was the What I learn card's Off (O: the set's own units stop too, app.js autoOf).
        ['N', 'A', 'V', 'H', 'O'].forEach(x => (rq[k + x] === undefined ? delete Q[k + x] : (Q[k + x] = rq[k + x])));
        saveQ();
      } else if (rr > lr && typeof rq[k] !== 'boolean' && Q[k] !== undefined) {
        // A progress reset made on another device: the offer comes again here too.
        ['', 'T', 'N', 'A', 'V', 'H', 'O'].forEach(x => delete Q[k + x]);
        saveQ();
      }
    });
  } catch (e) {}
  // The opening hold from every answer the sheet has (model.js holdSync), with this device's unconfirmed ones added: this
  // subject's own (holdOf), never another's.
  const holdIn = () => holdAdopt(S, j, SYNC.log);
  if (rr > lr) {
    introReset(Date.parse(rr)); // made on another device: its time (model.js startRestart keeps a window counted since)
    introIn();
    P = R;
    if (typeof stateBump === 'function') stateBump('rec'); // another object: an input of the views (app.js)
    SYNC[BK] = copy(R);
    store.set('reefid-account', SYNC);
    store.set(sKey('reset'), rr);
    holdIn(); // after the reset time is in: only the answers since then count
    // The sheet's replay since the reset is asked for again (the rules version back to 0) when this copy may lack
    // answers: answers played here after that reset and not in the sheet yet (the save that follows logs them), or a
    // copy under older rules than this device applied (saved by an older app, or before its device's replay came back).
    if (RO && (subjEntries(SYNC.log, S.id).some(a => String(a.t || '') > rr) || (Number(d[RK]) || 0) < rvApplied(S) || stOff))
      store.set(RK, 0);
    store.set(sKey('progress'), P);
    if (typeof memRecalcAll === 'function') memRecalcAll(); // a record pulled from before the photo memory (model.js)
    if (typeof domRecalcAll === 'function') domRecalcAll(); // a non-replayed subject's units pulled under the moving average (model.js)
    notesSeen(j);
    if (RO) replayAdoptS(S, rpS, SYNC.log, j.v, undefined, pre); // the sheet's full replay, when newer than the one applied here
    clockSeen();
    prog();
    return;
  }
  introIn();
  holdIn();
  // A copy unchanged since this device's last save or load (mine) is already in P: nothing to merge, whatever its rules
  // version (else it would ask for the replay at every sync). A copy under older rules (RVK) is not merged, which would
  // undo the replay adopted here: the version applied goes back to the copy's and the next request brings the replay.
  const rvSaved = RO ? Number(d[RK]) || 0 : Infinity;
  // Answers this device had logged from a refused save (SYNC.lg): another device may have saved them already, in its
  // replay of the log, and the merge would add them again as this device's own. The replay of the log, which the load
  // asked for (rvAsk), counts every one once: adopted, it replaces the merge; without it, the merge as usual.
  notesSeen(j);
  const recovered = !!(RO && lgFor(S) && rpS && replayAdoptS(S, rpS, SYNC.log, j.v, undefined, pre));
  // That replay not adoptable yet (units not in, no replay in the reply, an older queued answer): no merge, which would
  // count those answers again until the next replay; version 0 until the replay comes.
  const waitRp = RO && lgFor(S) && !recovered;
  if (waitRp) store.set(RK, 0);
  if (!mine && !recovered && !waitRp) {
    if (rvSaved >= rvApplied(S) && !stOff) {
      // In place: other code holds P by name only, but keep the same object anyway.
      const M = mergeProgress(SYNC[BK] || {}, P, R);
      // A copy under newer rules: a learned mark its replay took away stays here until this device adopts that replay,
      // whose mxRecalc tells it with its card (progress.js mxLostNotice); the merge would take it silently.
      if (RO && rvSaved > rvApplied(S))
        Object.keys(M).forEach(g => g !== LEVEL && P[g] && P[g].mx && M[g] && !M[g].mx && (M[g].mx = P[g].mx));
      clockTick(); // before the merge moves the level's count (another device's adoption may have lowered it)
      Object.keys(P).forEach(g => delete P[g]);
      Object.assign(P, M);
      faDrop(P); // refilled in place: its false-alarm counters made again at the next read (core.js faOf)
      if (typeof stateBump === 'function') stateBump('rec'); // P refilled in place: an input of the views (app.js)
      clockTick(); // and right after: the merged count the clock's baseline
      // The saved record is now part of P: it becomes the baseline, so a failed send can't count it twice.
      SYNC[BK] = copy(R);
    } else store.set(RK, stOff ? 0 : rvSaved);
  }
  store.set('reefid-account', SYNC);
  store.set(sKey('progress'), P);
  if (typeof memRecalcAll === 'function') memRecalcAll(); // a record pulled from before the photo memory (model.js)
  if (typeof domRecalcAll === 'function') domRecalcAll(); // a non-replayed subject's units pulled under the moving average (model.js)
  notesSeen(j);
  if (RO) replayAdoptS(S, rpS, SYNC.log, j.v, undefined, pre); // the sheet's full replay, when newer than the one applied here
  clockSeen();
  prog();
}
// A save that fails (docs/ARCHITECTURE.md "A save that fails"): a passing failure is retried SAVE.RETRY seconds apart
// while in view (a try cut by the background not counted); "Not saved" only after SAVE.RED_N counted failures over
// SAVE.RED_MS; each request gets SAVE.TIMEOUT. The run (SYNC.fail) travels with the account; Events: save failed / recovered.
const SAVE = {RETRY: [5, 10, 20, 40, 60, 120, 300], RED_N: 3, RED_MS: 60000, TIMEOUT: 90000};
let saveTimer = 0,
  hiddenAt = 0;
const saveHid = () => (hiddenAt = Date.now());
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && saveHid());
window.addEventListener('pagehide', saveHid);
document.addEventListener('freeze', saveHid);
// One request of a sync, answered within SAVE.TIMEOUT or failed; info gets its step, HTTP status and seconds.
function sheetCall(url, o, info, step) {
  const ac = typeof AbortController === 'function' ? new AbortController() : null,
    t0 = Date.now();
  let tm = 0;
  Object.assign(info, {step, t0, http: 0, ms: 0});
  if (!info.start) info.start = t0;
  return Promise.race([
    sheetFetch(url, ac ? {...(o || {}), signal: ac.signal} : o).then(r => {
      info.http = (r && r.status) || 0;
      return r.json();
    }),
    new Promise((ok, no) => {
      tm = setTimeout(() => {
        if (ac) ac.abort();
        no(new Error(`no answer in ${SAVE.TIMEOUT / 1000} s`));
      }, SAVE.TIMEOUT);
    })
  ]).finally(() => {
    clearTimeout(tm);
    info.ms = Date.now() - t0;
  });
}
const saveDetail = (info, f, now) =>
  `${info.step || '?'} · ${info.http ? 'http ' + info.http : 'no reply'} · ${((info.ms || 0) / 1000).toFixed(1)} s · try ${f.n + f.hid} · ${Math.round((now - f.at) / 1000)} s · ${f.hid} hidden`;
// A failed try of me's save (why: the error). Cut by the background: not counted. Red once the run is long enough.
function saveFailed(me, info, why) {
  const now = Date.now(),
    f = me.fail || (me.fail = {n: 0, hid: 0, at: now});
  if (document.visibilityState === 'hidden' || hiddenAt >= (info.start || now)) f.hid++;
  else f.n++;
  f.why = String(why || 'no reply').slice(0, 120);
  f.d = saveDetail(info, f, now);
  if (f.n >= SAVE.RED_N && now - f.at >= SAVE.RED_MS) {
    me.err = 'net';
    if (navigator.onLine !== false) ev('sync', {msg: 'save failed: ' + f.why, src: f.d});
  }
  store.set('reefid-account', me);
  saveRetry(f);
}
// A save that came through: the run of failures ends (reported when one of its failures counted).
function saveOk(me) {
  const f = me.fail;
  clearTimeout(saveTimer);
  delete me.fail;
  if (f && f.n && navigator.onLine !== false)
    ev('sync', {msg: 'save recovered: ' + f.why, src: `${f.d} · saved after ${Math.round((Date.now() - f.at) / 1000)} s`});
}
// The next try, while the app is in view and online (coming back to the app and back online run a sync anyway).
function saveRetry(f) {
  clearTimeout(saveTimer);
  if (document.visibilityState === 'hidden' || navigator.onLine === false) return;
  const s = SAVE.RETRY[Math.min(f.n + f.hid, SAVE.RETRY.length) - 1];
  saveTimer = setTimeout(() => SYNC && SYNC.fail && syncPush(), s * 1000);
}
// Pull, merge, then send. Every change bumps SYNC.rev; a send clears SYNC.dirty only if nothing changed
// meanwhile. Unsent progress is retried on start-up and when back online.
// One sync at a time: a request made while one runs is queued and runs once it ends.
let syncing = null,
  syncAgain = false;
function syncPush() {
  if (!SYNC_URL || !SYNC || !DATA) return Promise.resolve(null);
  // A save planned after a longer wait (syncSoon, a slow line) goes with this one.
  if (saveDue > Date.now() && saveWait() > SAVE_WAIT.MS) clearTimeout(syncTimer);
  saveDue = 0;
  if (syncing) {
    syncAgain = true;
    return syncing;
  }
  syncing = syncOnce().finally(() => {
    syncing = null;
    noticesGo(); // the visit's first sync is over: the one-time notices, on the merged state
    if (syncAgain) {
      syncAgain = false;
      syncPush();
    }
  });
  return syncing;
}
// An archived record (Code.gs userArchive): the name is not found although this device saved there (srv), or found
// under another account generation (_acct) than the one it saved under. Pushing would re-create it with this progress:
// the device says so and offers to sign out (bindSync). A device with no generation yet adopts the first it meets.
const acctChanged = (j, me) => {
  const a = j && j.ok && j.found && typeof j.acct === 'string' ? j.acct : '';
  if (!a) return false;
  if (me.acct && me.acct !== a) return true;
  if (!me.acct) {
    me.acct = a;
    store.set('reefid-account', me);
  }
  return false;
};
const archivedOf = (j, me) => !!(j && j.ok && ((!j.found && typeof me.srv === 'number' && me.srv > 0) || acctChanged(j, me)));
// at = the sheet revision merged against: another device's write in between gets 'stale' (the answers logged all the
// same) and the pull-merge-send runs again, at most twice. pulled: the load a 'stale' reply carried. Without a load
// (skipPull), the copy held here is merged as the load would bring it (mergeSaved: mine).
function syncOnce(tries = 0, pulled = null) {
  const me = SYNC,
    info = {}; // what this try's requests did (sheetCall), for a failed save's report
  let rev, sent, log, cut, cuts, rvs, X, sumX, base, trees;
  const mine = !pulled && skipPull(me) ? {ok: true, found: true, rev: me.srv, data: {...sdOf(me)}, acct: me.acct, v: sheetV()} : null;
  // If the device is disconnected or switched to another account meanwhile, drop this sync.
  // A name the admin removed or merged answers 'gone' (with the name it joined): recorded below, no send.
  return (pulled || mine ? Promise.resolve(pulled || mine) : syncGet(me, info))
    .then(j => {
      if (SYNC !== me) return null;
      if (!j.ok) return j;
      if (archivedOf(j, me)) return {ok: false, error: 'archived'}; // nothing pushed: the record is not re-created
      groupsSeen(j, me.name); // the beta groups first: they never depend on the merge
      if (!mine) markSeen(j, me.name); // the admin's mark, from a real load reply only
      if (j.found) mergeSaved(j);
      sdSeen(me, j);
      if (!mine) repsSeen(j); // the player's reports, after the merge: their thanks on another device came with it
      rev = me.rev;
      // Each subject's progress as sent: its baseline once the sheet confirms (SUBJECTS base).
      const pd0 = progData();
      sent = Object.fromEntries(SUBJECTS.map(S => [S.id, JSON.parse(pd0[subjKey(S.id, 'progress')] || '{}') || {}]));
      cut = store.get('reefid-sync-coral-reset', '') || ''; // the reset this save's data carries, the replay's cutoff (corals: replayAdopt)
      cuts = rpCuts(); // and the other subjects' replayed (replaysAdopt)
      rvs = rvsAsk();
      log = me.log || [];
      SUBJECTS.forEach(S => (me[S.base[1]] = pd0[subjKey(S.id, 'progress')] || ''));
      store.set('reefid-account', me);
      const pd = (progData()['reefid-sync-coral-progress'] || '').length;
      if (pd > 40000) console.warn(`Progress is ${pd} characters (sheet script v6 stores any size; v5 stops at 50,000).`);
      // A light save: what changed since the copy held at at (dz), else the whole data, the old names left to the sheet.
      X = progData();
      base = !(Number(me.nd) >= sheetV()) ? sdOf(me) : null; // nd: a delta refused, whole data until the script changes
      sumX = dataSum(X);
      const what = base ? {dz: dataDelta(base, X), sum: sumX} : {data: X},
        o = {
          name: me.name,
          pin: me.pin,
          ...what,
          summary: syncSummary(),
          answers: log.map(a => logOut(a, sheetV())), // a Find the X's photo tapped only from PA_SHEET (core.js logOut)
          av: appVer(), // the app's version
          rv: rvAsk(), // the rules version applied here (an older one gets the full replay back)
          ...(Object.keys(rvs).length ? {rvs} : {}), // the other subjects' (Code.gs replays_)
          ...stsAsk(rvs), // and their structure stamps (STRUCT_SHEET)
          ...(pendingFrom(log) === null ? {} : {pt: pendingFrom(log)}), // the replay's ids cover every answer sent (pendingFrom)
          // First send after signing in: the answers this device sent anonymously move to this name.
          ...(me.anon ? {anon: me.anon} : {}),
          ...(typeof me.srv === 'number' ? {at: me.srv} : {}),
          // The account generation this device saved under: checked under the sheet's lock, so a record archived between
          // this load and this save is never overwritten.
          ...(me.acct ? {acct: me.acct} : {}),
          ...(log.length ? {dev: devId()} : {}), // the device of its answers
          light: 1
        };
      // The leaderboard trees this save carries, by their checksums (treesSeen, from the reply).
      trees = Object.fromEntries(
        Object.entries(o.summary.boards || {})
          .filter(([, u]) => u && !Array.isArray(u))
          .map(([id, T]) => [id, treeSum(T)])
      );
      return lightBody(me, o).then(body =>
        sheetCall(SYNC_URL, {method: 'POST', body}, info, 'save').catch(x => {
          fateUnknown(me);
          throw x;
        })
      );
    })
    .then(j => {
      if (!j || SYNC !== me) return j;
      if (j.v) sheetSeen(j); // the script that answered
      // The script failed somewhere in the save (Code.gs fail_: an exception), maybe after logging or writing it.
      if (j.error === 'server') fateUnknown(me);
      // A light save the sheet could not read (zip: sent again unpacked) or whose delta did not rebuild the copy it holds
      // (delta: the copy loaded again, the data sent whole): nothing was logged or written, the same sync goes again.
      if ((j.error === 'zip' || j.error === 'delta') && tries < 3) {
        if (j.error === 'zip') me.nz = sheetV();
        // Never a loop of refused deltas: the copy loaded again, the whole data sent until the script version changes.
        else ((me.nd = sheetV()), delete me.sd);
        SUBJECTS.forEach(S => delete me[S.base[1]]);
        store.set('reefid-account', me);
        return syncOnce(tries + 1).then(r => {
          throw {retried: r};
        });
      }
      // The account's generation from the save's reply: the device that created the account knows it at once, so a record
      // archived and taken again before its next load is still told apart.
      if (j.ok && typeof j.acct === 'string' && j.acct && !me.acct) {
        me.acct = j.acct;
        store.set('reefid-account', me);
      }
      // Answers the sheet confirmed are dropped from the queue even when the progress write itself was refused.
      if (j.log && log.length) {
        const done = new Set(log.map(x => x.id));
        me.log = (me.log || []).filter(x => !done.has(x.id));
        // Logged, but the progress carrying them not saved: the merge baseline lacks answers the log has (rvAsk).
        if (!j.ok) me.lg = 1;
        store.set('reefid-account', me);
      }
      // The retry is a whole sync of its own: its result skips the steps below (they would apply this round's sent copy).
      if (j.error === 'stale' && tries < 2) {
        SUBJECTS.forEach(S => delete me[S.base[1]]);
        // A light save's stale reply holds the load (Code.gs load_): merged as the load's reply, no load of its own.
        const ld = typeof j.found === 'boolean' ? {...j, ok: true} : null;
        if (ld) (delete ld.error, delete ld.log, ld.data && (ld.data = keysIn(ld.data)));
        return syncOnce(tries + 1, ld).then(r => {
          throw {retried: r};
        });
      }
      return j;
    })
    .then(j => {
      if (j && j.ok && SYNC === me) {
        me.last = new Date().toISOString();
        SUBJECTS.forEach(S => {
          me[S.base[0]] = sent[S.id];
          delete me[S.base[1]];
        });
        if (typeof j.rev === 'number') me.srv = j.rev;
        sdSaved(me, X, sumX, base, j);
        saveMs = Date.now() - (info.start || Date.now()); // how long this sync took, for the wait before the next (syncSoon)
        delete me.err;
        if (!j.log && log.length) me.err = 'net';
        if (me.anon) delete me.anon;
        if (j.log) {
          const done = new Set(log.map(x => x.id));
          me.log = (me.log || []).filter(x => !done.has(x.id));
        }
        groupsSeen(j, me.name); // the beta groups, as the load's reply
        treesSeen(j, trees); // the leaderboard trees the sheet now holds (TREE_SHEET)
        saveOk(me); // a run of failed tries ends here
        // Each subject's hold on the sheet over every answer now logged, in time order, plus any answer given while this
        // send was on its way; none for a subject reset here since the send (its reset as sent: cut, cuts).
        SUBJECTS.forEach(S => holdAdopt(S, j, me.log, S.replay ? cut : (cuts || {})[S.id]));
        if (me.rev === rev) delete me.dirty;
        // The full replay over every answer now logged, plus any answer given while this send was on its way.
        notesSeen(j);
        // A save sent with answers logged from a refused one (lg: it asked from version 0) gets the replay of the whole log,
        // those answers in it: adopted as the recovery its load could not adopt (an answer queued here older than the
        // log's last one), before the flag goes.
        const adopted = replayAdopt(j.replay, me.log, j.v, cut) | replaysAdopt(j, me.log, cuts);
        delete me.lg; // the saved copy now holds the answers it lacked
        delete me.lgOk; // an older app's per-subject flag (lgFor reads lg)
        // A replay adopted from a save's reply left the saved copy at the older version, which other devices would take for
        // an older app's and replay again in turn (mergeSaved): saved again at once (bounded by tries; dirty if it fails).
        if (adopted) me.dirty = true;
        store.set('reefid-account', me);
        if (adopted && tries < 3) return syncOnce(tries + 1);
      } else if (j && SYNC === me) {
        // A refused code, a removed account, the wrong-code wait, a new account under a reserved name: red at once, no
        // retry mends them. Anything else the sheet answered (busy, stale again, lock or server, a failed write) is a
        // passing failure, tried again.
        if (j.error === 'pin' || j.error === 'wait' || j.error === 'gone' || j.error === 'archived' || j.error === 'reserved') {
          me.err = j.error;
          if (j.error === 'gone') me.into = j.into || '';
          delete me.fail;
          clearTimeout(saveTimer);
          store.set('reefid-account', me);
        } else saveFailed(me, info, 'sheet said ' + String(j.error || 'nothing'));
      }
      return j;
    })
    .catch(x => {
      if (x && 'retried' in x) return x.retried;
      // The line, a request cut by the background, a reply that is not the sheet's JSON, no answer in time.
      if (SYNC === me) saveFailed(me, info, (x && x.message) || x);
      return null;
    })
    .finally(() => {
      if (SYNC === me) bindSync();
    });
}
// A change to send: the save goes SAVE_WAIT.MS after the last change; on a slow line (the last sync over SAVE_WAIT.SLOW)
// twice that sync's time, at most SAVE_WAIT.MAX, from the first change unsent, so answers go a few at a time beside the
// photos. Leaving the app sends it at once (visibilitychange).
const SAVE_WAIT = {MS: 3000, SLOW: 8000, MAX: 20000};
let saveMs = 0,
  saveDue = 0;
const saveWait = () => (saveMs > SAVE_WAIT.SLOW ? Math.min(SAVE_WAIT.MAX, 2 * saveMs) : SAVE_WAIT.MS);
const syncSoon = () => {
  if (!SYNC_URL || !SYNC) return;
  SYNC.dirty = true;
  SYNC.rev = (SYNC.rev || 0) + 1;
  store.set('reefid-account', SYNC);
  const w = saveWait(),
    now = Date.now();
  if (w > SAVE_WAIT.MS && saveDue > now) return; // a save is already planned, within the wait of the first change
  clearTimeout(syncTimer);
  saveDue = now + w;
  syncTimer = setTimeout(syncPush, w);
};
// One-time notices after the first sync (docs/ARCHITECTURE.md "One-time notices after the first sync"; decision:
// docs/decisions/2026-11-18-decisions-from-app-comments.md): for a signed-in player the one-time cards and the
// achievements check wait (noticeLater) for the visit's first sync (noticesGo) or NOTICE.WAIT, then decide on the merged
// state, the notices told on any device included (TOLD). Not signed in: no wait.
const NOTICE = {WAIT: 20000};
let noticeOk = false,
  noticeT = 0;
const noticeQ = new Map();
const noticesReady = () => noticeOk || !SYNC || !SYNC_URL;
// fn later, once (the last one under its key k, in the order the keys came), when the notices are not ready yet: true.
function noticeLater(k, fn) {
  if (noticesReady()) return false;
  noticeQ.set(k, fn);
  if (!noticeT) noticeT = setTimeout(noticesGo, NOTICE.WAIT);
  return true;
}
function noticesGo() {
  if (noticeOk) return;
  noticeOk = true;
  clearTimeout(noticeT);
  const L = [...noticeQ.values()];
  noticeQ.clear();
  L.forEach(fn => {
    try {
      fn();
    } catch (e) {
      ev('err', {msg: 'notice: ' + String((e && e.message) || e).slice(0, 120)});
    }
  });
}
// The notices told (core.js TOLD: a list of tokens), this device's and, merged at each sync, every other device's of the
// account. toldAdd marks some told here and sends them with the next save. Signed in only: not signed in, the cards'
// own device marks decide.
const toldAll = () => (SYNC ? toldUnion(store.get(TOLD.KEY, []), []) : []);
const toldHas = t => toldAll().includes(t);
function toldAdd(...L) {
  if (!SYNC) return false;
  const was = toldAll(),
    now = toldUnion(was, L);
  if (now.length === was.length) return false;
  store.set(TOLD.KEY, now);
  if (SYNC) syncSoon();
  return true;
}
// Those told on another device (the saved copy's, at a sync).
function toldMerge(json) {
  try {
    const r = JSON.parse(json || 'null');
    if (Array.isArray(r)) store.set(TOLD.KEY, toldUnion(toldAll(), r));
  } catch (e) {}
}
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
      if (archivedOf(j, me)) j = {ok: false, error: 'archived'};
      if (!j.ok) {
        if (j.error === 'pin' || j.error === 'wait' || j.error === 'gone' || j.error === 'archived') {
          me.err = j.error;
          if (j.error === 'gone') me.into = j.into || '';
          store.set('reefid-account', me);
        }
        return j;
      }
      // Every subject the sheet replays (the corals, fish: rvKey), each version applied before the merge.
      const rvNow = () => [SUBJECTS.find(x => x.replay), ...rpSubjects()].filter(Boolean).map(rvApplied),
        rv0 = rvNow();
      groupsSeen(j, me.name); // the beta groups first, as syncOnce
      markSeen(j, me.name);
      if (j.found) mergeSaved(j);
      sdSeen(me, j); // the copy merged, for the lighter saves
      repsSeen(j); // the player's reports, as syncOnce
      if (rvNow().some((v, i) => v < rv0[i])) syncSoon(); // a saved copy under older rules (mergeSaved): the save brings the replay again
      delete me.err;
      me.last = new Date().toISOString();
      store.set('reefid-account', me);
      if (JSON.stringify(P) !== before && hashNow() === 'progress') route();
      return j;
    })
    .catch(() => null)
    .finally(() => {
      syncing = null;
      noticesGo(); // as syncPush
      if (syncAgain) {
        syncAgain = false;
        syncPush();
      }
      if (SYNC === me) bindSync();
    });
  return syncing;
}
window.addEventListener('online', syncPull);
// Back in view: a pull (30 s apart), or at once the save a failed try left waiting (saveRetry waits for this). Leaving
// the app: a save still waiting for its timer (syncSoon) goes now, while the page may still use the network (a try that
// the background cuts is tried again here, uncounted: saveFailed).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && (Date.now() - pulledAt > 30000 || (SYNC && SYNC.fail))) syncPull();
  else if (document.visibilityState === 'hidden' && SYNC && SYNC.dirty && !syncing) {
    clearTimeout(syncTimer);
    saveDue = 0;
    syncPush();
  }
});
// Players' reports (docs/ARCHITECTURE.md "Players' reports"): "⚑ Report a problem" in games, the lightbox, sheets and
// help opens a dialog; the report waits in 'reefid-reports' until the sheet's reply says rep: true (Reports tab). The
// reasons depend on where it comes from (k); {things} and {one} take the subject's words (SUBJECTS several, one).
const REP_WHY = {
  game: [
    ['wrong', 'Wrong answer'],
    ['multi', 'Several {things}'],
    ['photo', 'Bad photo'],
    ['other', 'Other']
  ],
  photo: [
    ['wrong', 'Wrong {one}'],
    ['multi', 'Several {things}'],
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
  const L = store.get('reefid-reports', []);
  // An image waits in memory for its report only (never in the queue, which is localStorage): one whose report left the
  // queue (the account deleted, the report sent) goes with it.
  Object.keys(repImgPend).forEach(id => L.some(x => x.id === id) || delete repImgPend[id]);
  if (!SYNC_URL || LOCAL || !L.length || navigator.onLine === false) return;
  const {batch, reports} = repBatch(L, repImgPend),
    first = batch;
  fetch(SYNC_URL, {
    method: 'POST',
    body: JSON.stringify({rname: first[0].rn || '', rpin: first[0].rp || '', ...(first[0].ra ? {racct: first[0].ra} : {}), reports})
  })
    .then(r => r.json())
    .then(j => {
      if (!j || !j.rep) return;
      const sent = new Set(first.map(x => x.id)),
        left = store.get('reefid-reports', []).filter(x => !sent.has(x.id));
      store.set('reefid-reports', left);
      sent.forEach(id => delete repImgPend[id]);
      // The script kept the image (1) or refused it (0: too large, not a JPEG, over its cap); the report itself is logged.
      if (j.img && Object.values(j.img).includes(0)) ev('sync', {msg: 'report image refused'});
      if (left.length) sendReports();
    })
    .catch(() => {});
}
// A screenshot or photo sent with a report (Pierre, 2026-11-21, Q446): the player picks one in the report dialog, the app
// reduces it on the device (about 800 px on the long side, JPEG, quality 0.6: a canvas re-encode, which drops the EXIF and
// the GPS) and the script keeps it in its "Report images" tab (Code.gs REPIMG). From REPIMG_SHEET only (rule D4); before,
// the dialog has no such input.
const REPIMG_SHEET = 212;
const repImgOn = () => sheetV() >= REPIMG_SHEET;
// The sizes tried in turn until the JPEG is small enough (REPIMG.MAX bytes decoded, under the script's 200,000), and the
// longest side of each; a photo of any size ends at about 60-120 kB at the first.
const REPIMG = {
  STEPS: [
    [800, 0.6],
    [640, 0.5],
    [480, 0.4]
  ],
  MAX: 180000
};
const repImgSize = (w, h, max) => {
  const s = Math.min(1, max / Math.max(w, h, 1));
  return [Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))];
};
// Report id → {t, d}: the reduced image (base64) waiting for its report to be sent. In memory only: if the report is
// queued while offline or the page closes first, the report goes without it.
const repImgPend = {};
// The requests' reports: one sender at a time, at most 50 (the script's cap), a report with an image alone in its request
// (it weighs as much as many reports). A report keeps the account generation it was written under (ra): a record archived
// since, its name taken again, never gets it under the new account.
function repBatch(L, pend) {
  const k = x => JSON.stringify([x.rn || '', x.rp || '', x.ra || '']),
    first = L.filter(x => k(x) === k(L[0])).slice(0, 50),
    j = first.findIndex(x => pend[x.id]),
    batch = j < 0 ? first : first.slice(0, Math.max(j, 1));
  return {batch, reports: batch.map(({rn, rp, ra, ...x}) => (pend[x.id] ? {...x, img: pend[x.id]} : x))};
}
// The picked file as a JPEG {d: base64, bytes, url} or null (not an image the browser reads, or too large at every
// size). createImageBitmap applies the photo's own rotation; the canvas is painted white first (a transparent PNG).
async function repImgReduce(file) {
  let src, w, h;
  try {
    src = await createImageBitmap(file);
    [w, h] = [src.width, src.height];
  } catch (e) {
    try {
      src = await new Promise((ok, no) => {
        const u = URL.createObjectURL(file),
          i = new Image();
        i.onload = () => (URL.revokeObjectURL(u), ok(i));
        i.onerror = () => (URL.revokeObjectURL(u), no());
        i.src = u;
      });
      [w, h] = [src.naturalWidth, src.naturalHeight];
    } catch (e2) {
      return null;
    }
  }
  if (!w || !h) return null;
  for (const [max, q] of REPIMG.STEPS) {
    const [cw, ch] = repImgSize(w, h, max),
      cv = document.createElement('canvas');
    cv.width = cw;
    cv.height = ch;
    const g = cv.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, cw, ch);
    g.drawImage(src, 0, 0, cw, ch);
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', q));
    if (!blob || blob.size > REPIMG.MAX) continue;
    const url = await new Promise(r => {
      const fr = new FileReader();
      fr.onload = () => r(String(fr.result));
      fr.onerror = () => r('');
      fr.readAsDataURL(blob);
    });
    const m = /^data:image\/jpeg;base64,(.+)$/.exec(url);
    if (m) return {d: m[1], bytes: blob.size, url};
  }
  return null;
}
window.addEventListener('online', sendReports);
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
  // The names offered for the right answer: the units' names as players read them (a fish entry's IMR name, never its
  // teaching id), each once.
  const names = [...new Set([...slateGenera(), ...bonusList()].map(unameT))].sort(),
    kind = c.k || 'game',
    where = location.hash.slice(1) || 'home', // the address (Reports, Where), its subject's prefix included
    words = t => t.replace('{things}', SUBJ.several).replace('{one}', SUBJ.one);
  d.innerHTML = `<form method="dialog">
    <h3>${kind === 'page' ? 'Send feedback' : 'Report a problem'}</h3>
    <div class="repwhy" role="radiogroup" aria-label="Problem">${REP_WHY[kind].map(([k, t], i) => `<label><input type="radio" name="why" value="${k}"${i ? '' : ' checked'}><span>${esc(words(t))}</span></label>`).join('')}</div>
    <label class="repf" data-for="wrong">Right ${esc(SUBJ.one)}, if you know<input name="fix" list="repgen" autocomplete="off" maxlength="60" placeholder="e.g. ${esc(names.find(n => n !== unameT(c.g)) || '')}"></label>
    <datalist id="repgen">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    <label class="repf"><span>Note <small>(optional)</small></span><textarea name="note" rows="2" maxlength="1000"></textarea></label>
    ${
      repImgOn()
        ? `<div class="repf repimg"><label><span>Screenshot or photo <small>(optional)</small></span><input type="file" name="img" accept="image/*"></label>
      <div class="repimgbox" hidden><img alt="Your picture, reduced" width="72" height="72"><button type="button" class="linkish" data-rm>Remove</button></div>
      <small class="repimgst" role="status"></small></div>`
        : ''
    }
    ${SYNC ? '' : `<label class="repf">Your name<input name="who" maxlength="40" autocomplete="name" value="${esc(store.get('reefid-report-name', ''))}"></label>`}
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
  // The picture: reduced as soon as it is picked (a busy flag holds the Send button back for the moment it takes), kept
  // in `pic` until Send puts it in repImgPend (in memory only, never in the queue).
  let pic = null,
    busy = 0;
  const fi = f.img,
    st = d.querySelector('.repimgst'),
    box = d.querySelector('.repimgbox'),
    go = d.querySelector('[type="submit"]'),
    say = t => st && (st.textContent = t),
    clear = () => {
      pic = null;
      if (fi) fi.value = '';
      if (box) box.hidden = true;
    };
  if (fi) {
    fi.onchange = async () => {
      const file = fi.files && fi.files[0],
        n = ++busy;
      pic = null;
      box.hidden = true;
      say('');
      if (!file) return;
      go.disabled = true;
      say('Reducing the picture…');
      const r = await repImgReduce(file).catch(() => null);
      if (n !== busy) return; // another picture was picked meanwhile
      go.disabled = false;
      if (!r) {
        clear();
        say('That picture could not be used (not an image, or too large). The report goes without it.');
        return;
      }
      pic = r;
      box.querySelector('img').src = r.url;
      box.hidden = false;
      say(
        navigator.onLine === false
          ? 'No connection: the report will be sent without the picture.'
          : `Picture ready (${Math.max(1, Math.round(r.bytes / 1000))} kB).`
      );
    };
    d.querySelector('[data-rm]').onclick = () => {
      busy++;
      clear();
      say('');
    };
  }
  d.querySelector('[value="cancel"]').onclick = () => d.close();
  d.addEventListener('close', () => d.remove());
  d.addEventListener('keydown', e => e.stopPropagation()); // Escape closes this dialog only, not the photo under it
  f.onsubmit = e => {
    e.preventDefault();
    if (f.who) store.set('reefid-report-name', f.who.value.trim());
    const why = f.why.value;
    const who = SYNC ? {rn: SYNC.name, rp: SYNC.pin, ...(SYNC.acct ? {ra: SYNC.acct} : {})} : {rn: f.who.value.trim()},
      r = {
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
      };
    store.set('reefid-reports', [...store.get('reefid-reports', []), {...who, ...r}].slice(-200));
    // Offline, the report is queued as it is, without the picture (it would not survive the queue: localStorage).
    const lost = pic && (navigator.onLine === false || !SYNC_URL);
    if (pic && !lost) repImgPend[r.id] = {t: 'image/jpeg', d: pic.d};
    d.close();
    sendReports();
    // The Contributions achievement counts it as it is sent (progress.js). progress.js comes with tier 2 (index.html): a
    // report sent from Home or About before it waits for it (app.js need).
    (typeof achReport === 'function' ? Promise.resolve() : need(2)).then(() => typeof achReport === 'function' && achReport(r));
    // The button stays live: a tap opens a fresh dialog (empty fields) and its send makes a new report id, so a second
    // report on the same page or answer goes through as its own.
    btn.textContent =
      (kind === 'page' ? 'Thank you' : '⚑ Reported, thank you') + (lost ? ' (no connection: sent without the picture)' : '');
  };
  d.showModal();
  d.querySelector('input[name="why"]').focus();
}
// Answers played before signing in (LOG0) and the one-time sign-in card (NUDGE, once used): outside the reefid-sync-* keys, so they
// never travel in the progress data sent to the sheet.
const LOG0 = 'reefid-log0',
  NUDGE = 'reefid-nudge',
  ANONB = 'reefid-anon-base',
  ANONID = 'reefid-anon-id',
  ANONQ = 'reefid-anonq';
// Anonymous answers: a player who never signs in still rates the photos. Sent under a random device id ("~anon <id>")
// ANON_SEND.MS after each answer (the admin's live Activity sees them), at most 100 a request; signing in moves them to
// the name (anon in the first send; the sheet skips ids it has) and makes a new id.
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
// Catch-up, for answers played without a name that never reached the sheet. Once per ANON_RESEND.ID,
// every answer this device played without an account (LOG0: up to 2000, kept until sign-in) is queued again for the
// sheet, which skips the ones it already has (by answer id) and adds the rest under this device's anonymous id. Bump the
// id to run it again on every device.
const ANON_RESEND = {KEY: 'reefid-anon-resent', ID: '2026-11-03'};
function anonResend() {
  if (SYNC || !SYNC_URL || LOCAL || store.get(ANON_RESEND.KEY, '') === ANON_RESEND.ID) return;
  const q = store.get(ANONQ, []),
    have = new Set(q.map(a => a && a.id));
  store.set(ANONQ, [...store.get(LOG0, []).filter(a => a && a.id && !have.has(a.id)), ...q].slice(-2000));
  store.set(ANON_RESEND.KEY, ANON_RESEND.ID);
}
// One timer, restarted at each answer (answers a second apart go in one request), as syncSoon. The queue (ANONQ) and the
// sheet's caps (Code.gs anon_: 100 a request, 600 per device and 6000 for every device not signed in, every 6 hours):
// a refused or failed send keeps its answers here for the next answer, the next visit, the app hidden or closed, or back
// online.
const ANON_SEND = {MS: 3000};
const anonSoon = () => {
  clearTimeout(anonTimer);
  anonTimer = setTimeout(sendAnon, ANON_SEND.MS);
};
function sendAnon() {
  const q = keptGet(ANONQ, []); // read only (keptGet): sliced, its answers copied by logOut
  if (SYNC || !SYNC_URL || LOCAL || anonBusy || !q.length) return;
  const batch = q.slice(0, 100),
    cut = store.get('reefid-sync-coral-reset', '') || '', // the replay's cutoff, as sent (replayAdopt)
    sk = startKey(replaySubject()), // the replayed subject's first-launch answer (the replay's)
    // The other subjects the sheet replays (fish, sea slugs: Code.gs anon_ replays_), as a signed-in save asks them
    // (rvsAsk): their rules versions, each one's reset (the cutoff, replaysAdopt) and first-launch answer, by subject.
    rvs = rvsAsk(),
    cuts = rpCuts(),
    sreset = Object.fromEntries(
      Object.keys(rvs)
        .filter(id => cuts[id])
        .map(id => [id, cuts[id]])
    ),
    sstart = Object.fromEntries(
      Object.keys(rvs)
        .map(id => [id, store.get(startKey(id), null)])
        .filter(([, v]) => v)
    ),
    who = anonId(); // the anonymous player the send is for
  anonBusy = true;
  fetch(SYNC_URL, {
    method: 'POST',
    keepalive: true,
    // pt: the oldest answer of the whole queue (pendingFrom), as answers left in it after a lost reply may be logged already.
    // reset: this device's progress reset (app.js), the replay's cutoff, as a signed-in player's saved data gives it.
    // start: the first-launch answer (model.js startSet), whose prior the replay applies, likewise.
    body: JSON.stringify({
      anon: who,
      anonAnswers: batch.map(a => logOut(a, sheetV())), // a Find the X's photo tapped only from PA_SHEET (core.js logOut)
      av: appVer(),
      rv: rvApplied(),
      ...(Object.keys(rvs).length ? {rvs} : {}), // the other subjects' (Code.gs replays_)
      ...stsAsk(rvs), // the structure stamps (Code.gs stMain_, replays_)
      ...(pendingFrom(q) === null ? {} : {pt: pendingFrom(q)}),
      ...(cut ? {reset: cut} : {}),
      ...(store.get(sk, null) ? {start: store.get(sk, null)} : {}),
      ...(Object.keys(sreset).length ? {sreset} : {}),
      ...(Object.keys(sstart).length ? {sstart} : {}),
      dev: devId() // the device of its answers
    })
  })
    .then(r => r.json())
    .then(j => {
      sheetSeen(j);
      // A refused send is reported like a failed save, then retried at the next answer, the next visit or when the app
      // is left.
      if (!j || !j.log) return ev('sync', {msg: 'anonymous send refused: ' + String((j && j.error) || 'no reply')});
      // Signed in (or signed out, a new anonymous id) while the send was on its way: the queue and the progress are no
      // longer this anonymous player's, so neither is touched, as the signed-in replies check SYNC.
      if (SYNC || store.get(ANONID, '') !== who) return;
      const done = new Set(batch.map(x => x.id)),
        left = store.get(ANONQ, []).filter(x => !done.has(x.id));
      store.set(ANONQ, left);
      // A device that never signed in gets its full replay too, its answers still queued on top.
      replayAdopt(j.replay, left, j.v, cut);
      // And the other subjects' (Pierre, 2026-11-08, #776: every player's progress recalculated from their answers).
      replaysAdopt(j, left, cuts);
      // More than one batch waiting (played offline): the next one follows; a refused batch ('busy') is not retried here.
      if (left.length) setTimeout(sendAnon, 1000);
    })
    .catch(e => navigator.onLine !== false && ev('sync', {msg: 'anonymous send failed: ' + String((e && e.message) || e)}))
    .finally(() => {
      anonBusy = false;
    });
}
// Events (Code.gs events_): what the app reports by itself (errors, photos failing, failed saves, one-tap answers),
// under a random device id (EVID) also carried by its answers (dev; privacy.html "Technical reports"). Queued (EVQ, 50),
// sent in batches, never from a local copy; at most EV_MAX a visit, the same message once.
const EVID = 'reefid-dev-id',
  EVQ = 'reefid-evq',
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
// Every save and anonymous send carries devId (dev: the answers' Device column), one per request: its queue is its own.
// The app's version as the sheet and the admin's Errors page see it: the deploy's build number, then app.js's content
// hash (tools/stamp_versions.py: "<build>-<hash>", higher is newer); a copy never deployed has no build, only its ?v.
const appVer = () => {
  const v = ((document.querySelector('link[href*="app.js?v="]') || {}).href || '').replace(/^.*\?v=/, ''),
    b = document.querySelector('meta[name="build"]');
  return b ? `${b.content}-${v}` : v;
};
const uaShort = () => {
  // Edge, Opera and Samsung Internet also carry "Chrome/": their own token first.
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
  // The one-tap answers and the pages summaries (one a visit, or one each time the app is left) are never deduplicated.
  if (k !== 'pulse' && k !== 'pages' && (evSeen.has(key) || evSeen.size >= EV_MAX)) return;
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
// The next request's events: the queue's, for the player active now (core.js pagesBatch: a pages summary only under
// the player it was queued for; one queued for another, as after a sign-out, is dropped from the queue, never sent under
// someone else). Returns the batch (at most 50) and who it belongs to.
function evBatch() {
  const q = store.get(EVQ, []),
    B = q.some(x => x && x.k === 'pages') ? pagesBatch(q, pvOwner()) : {send: q, drop: []};
  if (B.drop.length)
    store.set(
      EVQ,
      store.get(EVQ, []).filter(x => !B.drop.includes(x && x.id))
    );
  const batch = B.send.slice(0, 50);
  return {batch, who: pagesWho(batch)};
}
function sendEvents() {
  if (!SYNC_URL || LOCAL || evBusy || !store.get(EVQ, []).length || navigator.onLine === false) return;
  const {batch, who} = evBatch();
  if (!batch.length) return;
  evBusy = true;
  fetch(SYNC_URL, {method: 'POST', keepalive: true, body: JSON.stringify({dev: devId(), events: batch, ...who})})
    .then(r => r.json())
    .then(j => {
      sheetSeen(j);
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
// App errors (script errors, promise rejections), only from the app's own script files: injected scripts (iOS Firefox's
// __firefox__, a wallet's window.ethereum) report against the page or no file, cross-origin ones as "Script error."; "ResizeObserver loop…" is harmless.
// Photo and stylesheet load errors are handled where they retry.
const ownError = (msg, file) =>
  String(file || '').startsWith(location.origin) && /\.js(\?|$)/.test(String(file)) && !/ResizeObserver loop/.test(msg);
window.addEventListener('error', e => {
  if (!e.message || e.target !== window || !ownError(e.message, e.filename)) return;
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
// Pages opened in a visit (docs/ARCHITECTURE.md "Pages opened"): core.js PAGES's tally and the answers so far (na), one
// 'pages' event each time the app is left (same visit id vi on return), under the player's answer id, never the name
// (the sheet turns ANONID or the name and code into it, Code.gs evWho_).
const SHEETV = 'reefid-sheet-v',
  PVLINK = 'reefid-pv-link',
  PV = pagesNew(),
  PVI = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
let pvLast = null,
  pvPre = null;
// The script version of a reply (every reply carries v), remembered for the next visits.
// The beta groups the sheet says this player is in (groups, [] for none; none in the reply changes nothing, rule D4),
// kept under the account's name (GROUPS_KEY). A change shows at once (showSubj; a subject lost reloads on the corals);
// live: false when the app reloads anyway (signIn). Also the cohort (COHORT_KEY) and, from GROUPS_SHEET, every group's id
// (gids), whose boards come first (progress.js myCohort, myGroups).
const COHORT_KEY = 'reefid-cohort';
function groupsSeen(j, name, live = true) {
  if (j && name && typeof j.cohort === 'string') store.set(COHORT_KEY, {n: name, c: j.cohort});
  if (!j || !Array.isArray(j.groups) || !name) return;
  const before = subjGroups().join(),
    g = j.groups.filter(x => typeof x === 'string' && SUBJECTS.some(S => subjGroup(S) && S.id === x)),
    ids = Array.isArray(j.gids) ? j.gids.filter(x => typeof x === 'string') : null;
  store.set(GROUPS_KEY, {n: name, g, ...(ids ? {ids} : {})});
  if (!live || subjGroups().join() === before) return;
  if (!subjOpen(SUBJ)) return location.reload();
  showSubj();
  // Home draws its subject row in viewHome (showSubj only updates existing buttons): redraw Home too.
  if (!SUBJ_VISIT && ['lab', ''].includes(hashNow())) route();
}
// The admin's mark on the account line (🌱 after the name, outside its text, in ⚙: bindSync): a load reply (Code.gs load_
// admin: 1) says whether this account is the admin's, kept under the account's name (MARK_KEY).
const MARK_KEY = 'reefid-amark';
// A load that finds no account under the name (a new account, or one deleted or archived and taken again) takes it away
// too.
function markSeen(j, name) {
  if (!j || !j.ok || !name) return;
  if (j.found === false) return store.set(MARK_KEY, null);
  if (j.found !== true) return;
  store.set(MARK_KEY, {n: String(name).trim().toLowerCase(), on: j.admin === 1});
}
const markMine = () => {
  const m = store.get(MARK_KEY, null);
  return !!(SYNC && SYNC.name && m && m.on && m.n === SYNC.name.trim().toLowerCase());
};
// The ids of this player's own reports (reps in a load reply), for "Your feedback helped" (progress.js achReps,
// achHelped); a reply without them: the app still thanks the reports it kept itself. Every load reply calls it, after
// merging the saved copy: a signed-in player is thanked only from then on (repsPulled), so a thanks already given on
// another device, which comes with that copy, is never given again here.
let repsPulled = false;
function repsSeen(j) {
  repsPulled = true;
  if (j && Array.isArray(j.reps) && typeof achReps === 'function') return achReps(j.reps);
  if (typeof achHelped === 'function') achHelped();
}
// Lines the sheet serves for the cards (notes, from its Notes tab, keys card.*; Code.gs notes_): Pierre's text that must
// never be written in the repo, e.g. a card's PS that may name a player (core.js RV_SORRY ps; progress.js rvNotice).
// Kept on the device; without notes the card has no PS.
const NOTES_KEY = 'reefid-sheet-notes';
function sheetSeen(j) {
  if (j && Number(j.v) > 0 && Number(j.v) !== Number(store.get(SHEETV, 0))) store.set(SHEETV, Number(j.v));
  if (typeof structSeen === 'function') structSeen(); // app.js: the units made again under the structure (STRUCT_SHEET)
  notesSeen(j);
}
// Kept before a replay is adopted (mergeSavedIn, the save reply): the card it brings shows its PS at once.
function notesSeen(j) {
  if (j && j.notes && typeof j.notes === 'object' && !Array.isArray(j.notes)) store.set(NOTES_KEY, j.notes);
}
// The script version last seen: what the app may rely on (rule D4), so a visit offline does what the last one did. Never
// below the gate floor (core.js SHEET_FLOOR, a version already confirmed live), also before any reply: a new device or an
// offline first launch plays today's rules, never those of a script long replaced.
// The full replay checks each reply's own v (replayAdopt).
const sheetV = () => keptBy(SHEETV, 0, 'sheetV', v => Math.max(Number(v) || 0, SHEET_FLOOR)); // read once (keptBy)
// The genus of a page key, or of a link's address ('#…', core.js routeIn).
const pvGenus = h => {
  const g = String(h || '').startsWith('#') ? routeIn(h).key || '' : String(h || ''),
    n = g.slice(2);
  return g.startsWith('g-') && DATA && GX(n) ? n : null;
};
// A link to a genus sheet remembers the page it was clicked on: the quiz feedback opens the sheet in a new tab on a
// computer (quiz.js sheetTab), a new visit that has no page before it.
document.addEventListener(
  'click',
  e => {
    const a = e.target && e.target.closest ? e.target.closest(`a[href^="${hr('g-x').slice(0, -1)}"]`) : null;
    if (a) store.set(PVLINK, {g: pvGenus(a.getAttribute('href')), from: pageFrom(hashNow()), t: Date.now()});
  },
  true
);
// A page drawn (app.js route; a redraw of the same page is not a new opening).
// A page is the hash and the subject on screen (SUBJECTS pv): a subject switched on the same hash (the header's switch) closes the page
// of one and opens the page of the other.
function pagesRoute(h) {
  if (h === pvLast && SUBJ.pv === pvPre) return;
  const prev = pvLast,
    genus = pvGenus(h);
  pvLast = h;
  pvPre = SUBJ.pv;
  let from = prev === null ? 'other' : pageFrom(prev);
  if (genus) {
    const L = store.get(PVLINK, null);
    if (L && L.g === genus && Date.now() - L.t < 30000) from = L.from;
    try {
      store.drop(PVLINK);
    } catch (e) {}
  }
  const s = genus && P[genus];
  pagesOpen(PV, h, Date.now(), {
    genus,
    from,
    asked: s && (s.ok || 0) + (s.ko || 0) > 0,
    hidden: document.visibilityState === 'hidden',
    pre: SUBJ.pv // a fish page is named fish.<page> (core.js pageName)
  });
}
// The screen it was sent from, rounded (core.js VIEWPORT, viewportOf): only once the sheet script keeps it (rule D4).
const VIEWPORT_SHEET = 177;
const viewportOn = () => sheetV() >= VIEWPORT_SHEET;
const pagesScreen = () => {
  const vp = viewportOn() ? viewportOf(window.innerWidth, window.innerHeight, window.devicePixelRatio) : null;
  return vp ? {vp} : {};
};
// The feedback sheet's tally (core.js PAGES.FB; quiz.js fbShown, fbMoreBind, fbEnd): one count into the visit's summary, which
// the app already sends when it is left (pagesSend; docs/decisions/2026-11-18-feedback-sheet.md). No gate (rule D4): a
// sheet script from before it drops the field, as it drops any field it does not know (core.js pagesClean).
const fbTally = (kind, n) => pagesFb(PV, kind, n);
function pagesSend() {
  if (typeof fbEnd === 'function') fbEnd(false); // the sheet still on screen: its seconds so far go in this summary
  const S = pagesTake(PV, Date.now());
  if (!S) return;
  ev('pages', {vi: PVI, ...(typeof answersSoFar === 'function' ? {na: answersSoFar()} : {}), ...pagesScreen(), ...S, o: pvOwner()});
}
// The player active now, as a summary's owner (core.js pagesOwner): no anonymous id is made for a signed-in player.
const pvOwner = () => (SYNC && SYNC.name && SYNC.pin ? pagesOwner(SYNC) : pagesOwner(null, anonId()));
// Who the pages summaries of a batch belong to: the name and code when signed in (checked by the sheet, never kept),
// else this device's anonymous answer id. Nothing for a batch without one. A batch holds only the summaries of the
// player active now (evBatch).
// With the account generation: a record archived since, its name taken again, never gets them.
const pagesWho = batch =>
  !batch.some(x => x && x.k === 'pages')
    ? {}
    : SYNC && SYNC.name && SYNC.pin
      ? {ename: SYNC.name, epin: SYNC.pin, ...(SYNC.acct ? {eacct: SYNC.acct} : {})}
      : {eanon: anonId()};
// Load times (app.js loadMark): sent once a visit.
function loadSend() {
  if (loadSent || !('t0' in LOADM)) return;
  loadSent = true;
  const nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {},
    bytes = (performance.getEntriesByType ? performance.getEntriesByType('resource') : []).reduce(
      (t, e) => t + (e.transferSize || 0),
      nav.transferSize || 0
    );
  ev('load', {
    ...LOADM,
    bps: Math.round(linkMeasure() / 1000),
    kb: Math.round(bytes / 1024),
    sw: SW0 ? 1 : 0,
    sv: saver() ? 1 : 0,
    th: isDark() ? 'dark' : 'light',
    w: innerWidth,
    // Installed on the home screen (opened as an app) or played in a browser tab (Pierre: a tab has to find the link again).
    st: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true ? 1 : 0
  });
}
window.addEventListener('online', sendEvents);
window.addEventListener('online', sendAnon);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    loadSend();
    pagesSend();
    sendAnon();
    sendEvents();
  } else pagesResume(PV, Date.now());
});
// A page closed or reloaded where the browser gives no hidden event first: its summary goes as when the app is hidden
// (after a hidden event, pagesTake has nothing left, so nothing is queued twice).
window.addEventListener('pagehide', () => {
  pagesSend();
  sendEvents();
});
// Signing in: a new name keeps and sends what this device holds. A known account ("Is it you?", bindSync) takes the
// sheet's settings, adds up both progresses, then reloads; either way the answers played before join the log (LOG0).
function signIn(name, pin, j) {
  SYNC = {name, pin, dirty: true, log: store.get(LOG0, []), ...(store.get(ANONID, '') ? {anon: store.get(ANONID, '')} : {})};
  groupsSeen(j, name, false); // the account's beta groups, before the reload below opens the app with them
  markSeen(j, name);
  store.set('reefid-board-new', j.found ? 0 : 1); // an account made here never meets the leaderboard as news (progress.js boardShow)
  // The pages summaries queued while signed out become the account's, as the answers do (core.js pagesOwn).
  if (SYNC.anon) store.set(EVQ, pagesOwn(store.get(EVQ, []), pagesOwner(null, SYNC.anon), pagesOwner(SYNC)));
  try {
    [LOG0, ANONQ, ANONID].forEach(k => store.drop(k));
  } catch (e) {}
  if (!j.found) {
    try {
      store.drop(ANONB);
    } catch (e) {}
    store.set('reefid-account', SYNC);
    // no reload: the units are made again for the account's reserve at the next page change (app.js resSeen)
    if (typeof resSeen === 'function') resSeen();
    return;
  }
  // Each subject on its own. The corals (SUBJECTS anonBase) add only the delta from ANONB, the progress before the first
  // anonymous answer (an old sign-out's leftovers are in it); another subject adds all that is here (sign-out clears it).
  // anon: the corals' answers played here signed out (subjEntries: a fish answer in LOG0 is not one).
  const AB = SUBJECTS.find(x => x.anonBase),
    anon = !!AB && subjEntries(SYNC.log, AB.id).length > 0,
    M = {};
  let mine = false;
  SUBJECTS.forEach((S, i) => {
    const pk = subjKey(S.id, 'progress'),
      here = renameUnits(S, store.get(pk, {}) || {});
    let R = {};
    try {
      R = renameUnits(S, JSON.parse(j.data[pk] || '{}') || {}); // old unit ids under the new ones (core.js SUBJECTS renamed)
    } catch (e) {}
    // The account's copy is this subject's merge baseline, played here or not: without one, the next sync would add the
    // account's progress again.
    SYNC[S.base[0]] = R;
    // A subject never played on this device (not the first, the corals) takes the account's as it is (loadData below).
    if (i && !Object.keys(here).length) return;
    if (!S.anonBase && Object.keys(here).length) mine = true;
    M[pk] = S.anonBase ? (anon ? mergeProgress(store.get(ANONB, {}) || {}, here, R) : R) : mergeProgress({}, here, R);
  });
  try {
    store.drop(ANONB);
  } catch (e) {}
  // The account's settings replace this device's, except the achievements: earned here before signing in, they join the
  // account's.
  const ach = store.get(ACHK, null),
    // Each subject's first-launch record made here before signing in joins the account's (core.js startUnion): the
    // account's earlier answers and this device's newer one both stay in the history.
    st = SUBJECTS.map(S => [startKey(S.id), store.get(startKey(S.id), null)]),
    // Each subject's surprise cards met here before signing in join the account's (core.js winkUnion): once per player.
    wk = SUBJECTS.map(S => [subjKey(S.id, 'wink'), store.get(subjKey(S.id, 'wink'), null)]);
  // The rules version applied (RVK) is the account's, 0 when its data has none: this device's (an anonymous replay adopted
  // here) would tell the sheet that the account's log was replayed, and its replay would never come.
  try {
    // and its structure stamps likewise (stKey)
    [RVK, ...rpSubjects().map(rvKey), ...SUBJECTS.filter(S => S.structure).map(stKey)].forEach(k => store.drop(k));
  } catch (e) {}
  loadData(Object.fromEntries(Object.entries(j.data || {}).filter(([k]) => !(k in M))));
  // Answers played here without an account (the log, or sent anonymously: SYNC.anon) join the account's log with the
  // first save: no rules version applied, so that save gets the replay of the whole log (none adopted before: SYNC.anon).
  if (anon || SYNC.anon)
    try {
      store.drop(RVK);
    } catch (e) {}
  // Another subject replayed (fish): its answers played here signed out join the account's log with the first save, so
  // the replay of the whole of it is asked for then (every answer of that subject in it once).
  rpSubjects().forEach(S => {
    if (subjEntries(SYNC.log, S.id).length || SYNC.anon)
      try {
        store.drop(rvKey(S));
      } catch (e) {}
  });
  if (ach) achMerge(JSON.stringify(ach));
  st.forEach(([k, r]) => r && store.set(k, startUnion(store.get(k, null), r)));
  wk.forEach(([k, r]) => r && store.set(k, winkUnion(store.get(k, null), r)));
  Object.entries(M).forEach(([k, v]) => store.set(k, v));
  if (!anon && !mine) delete SYNC.dirty;
  store.set('reefid-account', SYNC);
  try {
    sessionStorage.setItem('reefid-loaded', SHEET_NAME);
  } catch (e) {}
  location.reload();
}
// One sign-in card, once, after NUDGE_AT answers without an account (every subject's: answersAll), so progress reaches
// the sheet early; spaced from the other prompts (quiz.js promptOk), never in the admin's browser, "Later" for good.
const NUDGE_AT = 20;
// Answers played on this device in every subject: each subject's global level record (core.js LEVEL, ok + ko), the one
// on screen from memory. Signed out, that is what was played here without an account (signing out clears them).
const answersAll = () =>
  SUBJECTS.reduce((n, S) => {
    const L = ((S.id === SUBJ.id ? P : store.get(subjKey(S.id, 'progress'), {})) || {})[LEVEL] || {};
    return n + (Number(L.ok) || 0) + (Number(L.ko) || 0);
  }, 0);
const nudgeDue = () =>
  !SYNC && SYNC_URL && !HAS_ADMIN_TOKEN && !document.querySelector('#tour, .unlock') && !store.get(NUDGE, 0) && answersAll() >= NUDGE_AT;
// once = the one-time card (marks it used); play = once signed in, its button opens the photo quiz (skipped tour); the
// header's Sign in passes neither. The card holds the account box (bindSync), which redraws itself as the player signs
// in; the focus goes back to the question's Next.
function signinNudge(once = true, play = !once) {
  if (once) store.set(NUDGE, 1);
  const d = cardShow({
    kind: 'account',
    cls: 'signnudge',
    label: 'Sign in',
    body: '<section class="sync tsync"></section>',
    secondary: {text: 'Later', on: () => play && SYNC && go('quiz')}, // from a skipped tour: once signed in, the photo quiz
    esc: 'esc',
    enter: 'enter',
    tap: 'tap',
    focus: '.ulbtns button', // its button, not the name field: no keyboard popping up on a phone
    onClose: () => {
      bindSync();
      const nb = document.getElementById('next');
      if (nb) nb.focus({preventScroll: true});
    }
  });
  const box = d.querySelector('.tsync'),
    btn = d.querySelector('.ulbtns button');
  const label = () => {
    btn.textContent = SYNC ? (play ? 'Start playing' : 'Done') : once || play ? 'Later' : 'Close';
    btn.classList.toggle('sec', !SYNC);
    d.relabel();
  };
  bindSync(box);
  label();
  new MutationObserver(label).observe(box, {childList: true});
}
// Signing out (or deleting one's account, all) clears this device's progress: what is left here is always the anonymous
// play of whoever signs in next (signIn). Needs the quiz tier (need(2): INTRO, ACHK). all: the account's queued reports
// and the name typed for reports go too.
function signOutClear(all) {
  const me = SYNC;
  SYNC = null;
  // The reports queued under an account the sheet removed or archived (not merged:
  // the sheet credits those to the name it joined) are never sent under its name; after a self-deletion, every one.
  const lcn = x =>
    String(x || '')
      .trim()
      .toLowerCase();
  if (me && (all || (me.err === 'gone' && !me.into) || me.err === 'archived'))
    store.set(
      'reefid-reports',
      store.get('reefid-reports', []).filter(x => !(x && lcn(x.rn) === lcn(me.name)))
    );
  if (all)
    try {
      store.drop('reefid-report-name');
    } catch (e) {}
  // The pages summaries still queued are the account's: dropped, never sent under the next player.
  store.set(
    EVQ,
    store.get(EVQ, []).filter(x => !(x && x.k === 'pages'))
  );
  // Achievements and the leaderboard choice belong to the account too: never left to the next player of a shared device.
  // The first-meeting cards too: the next player meets their own genera.
  [
    'reefid-account',
    GROUPS_KEY, // the beta groups and the player's groups are this account's (app.js subjOpen, progress.js myGroups)
    COHORT_KEY, // and its cohort (groupsSeen)
    MARK_KEY, // the admin's mark is this account's (markSeen): never left to the next account of the name
    // Every subject's progress, settings, cards, opening hold and comeback (model.js COMEBACK.KEY: the visit floor and
    // the comeback belong to this player).
    ...SUBJECTS.flatMap(S => [
      // the first-launch question's answer is the player's too (model.js startSet)
      // and the surprise cards it has met (quiz.js WINKK)
      // rv: the rules version its progress was replayed with (replayAdoptS; the corals' is RVK); st, its structure stamp
      // and the custom quiz's selection (quiz.js viewCustom)
      ...['progress', 'quiz', 'reset', 'intro', 'intro-offer', 'rv', 'st', 'start', 'wink', 'custom'].map(k => subjKey(S.id, k)),
      // and the custom quiz's reminder of the Quiz, its count and its showing (quiz.js LEFTN; rule D7)
      // and its basics module's record (Coral basics, Fish basics: app.js basicsKey), else the next beginner gets no offer
      // and the question left unanswered, kept for the player's return (quiz.js PEND), else the next player gets it
      ...['hold', 'comeback', 'custom-left', 'basics', 'pending'].map(k => subjDev(S.id, k)),
      // and the "every unit met" card's marks, one per reason (quiz.js ALLMET, app.js fishNextOf; rule D7)
      ...['c3', 'beyond', 'all'].map(k => subjDev(S.id, 'allmet-' + k)),
      // and the juveniles and phases cards' marks, one per kind (quiz.js PHASEC; rule D7)
      ...['juvenile', 'phase'].map(k => subjDev(S.id, 'phase-' + k)),
      // and the mimicry cards' marks, one record of the pairs shown (quiz.js MIMC; rule D7)
      subjDev(S.id, 'mim')
    ]),
    ACHK,
    'reefid-ach-new',
    'reefid-ach-old', // progress.js ACHOLD: this player's achievements waiting for a subject's data to be recounted
    'reefid-mx-lost', // model.js MXL.KEY: learned marks taken away and their card, this player's
    RVK, // the rules version this player's progress was replayed with (replayAdopt)
    'reefid-rv-msg', // progress.js RVN.KEY: the announcement cards of the rules versions, this player's
    TOLD.KEY, // core.js: the one-time notices this player was told, on any of their devices
    BOARD,
    LOG0,
    NUDGE,
    ANONB,
    ANONID,
    ANONQ
  ]
    // And their names before the rename (core.js withOldNames): one left by a migration that could not write it.
    .flatMap(k => withOldNames([k]))
    .forEach(k => {
      try {
        store.drop(k);
      } catch (e) {}
    });
}
// The account box: the top of ⚙ (#sync), or the sign-in card (tour, nudge, header button) while one is open.
function bindSync(box = document.querySelector('.tsync') || document.getElementById('sync')) {
  prog();
  if (!box) return;
  box.classList.remove('on', 'warn');
  const msg = t => (box.querySelector('[role=status]').textContent = t);
  if (SYNC) {
    // Signed in and saved: one quiet line, actions in view. Trouble (unsent answers, refused code): a box that stands out.
    const bad = syncTrouble(),
      when = SYNC.last ? new Date(SYNC.last).toLocaleString([], {dateStyle: 'short', timeStyle: 'short'}) : '';
    box.classList.add(bad ? 'warn' : 'on');
    box.innerHTML = bad
      ? `<p><b>${bad}</b></p><p class="note">${SYNC.err === 'archived' ? '' : SYNC.err === 'gone' ? (SYNC.into ? `Your trainer merged this name into <b>${esc(SYNC.into)}</b> (the same person). Your answers now count there: sign out, then sign in as ${esc(SYNC.into)} with that name's code.` : 'Your trainer removed this account. Sign out, then sign in again to start a new one.') : SYNC.err === 'pin' ? 'The code was refused for this name. Sign out and sign in again with the right code.' : SYNC.err === 'wait' ? 'Someone typed wrong codes for this name several times, so saving waits 10 minutes. Your answers are kept on this device.' : SYNC.err === 'reserved' ? 'Sign out, then sign in with another name.' : 'Your answers are kept on this device and sent as soon as possible.'}${when ? `${SYNC.err === 'archived' ? '' : ' '}Last saved ${when}.` : ''}</p>
        <button class="chip go" type="button" id="snow">Try again</button> <button class="reset" type="button" id="soff">Sign out</button> <span class="note" role="status"></span>`
      : SYNC.dirty || (SYNC.log || []).length // answers not confirmed yet, no error so far: say so, quietly
        ? `<p class="sline"><span class="sdot wait"></span><span>Saving for ${ORG.short} as <b>${esc(SYNC.name)}</b>${markMine() ? ' ' + markHtml() : ''}…</span>
        <button class="linkish" type="button" id="snow">Send now</button><button class="linkish" type="button" id="soff">Sign out</button></p><span class="note" role="status"></span>`
        : `<p class="sline"><span class="sdot"></span><span>Saved for ${ORG.short} as <b>${esc(SYNC.name)}</b>${markMine() ? ' ' + markHtml() : ''}${when ? ` · ${when}` : ''}</span>
        <button class="linkish" type="button" id="snow">Send now</button><button class="linkish" type="button" id="soff">Sign out</button></p><span class="note" role="status"></span>`;
    box.querySelector('#snow').onclick = () => {
      msg('Sending…');
      syncPush().then(j => {
        if (!(j && j.ok))
          msg(
            j && j.error === 'pin'
              ? 'Wrong code for this name.'
              : 'Could not connect. Check your connection: your progress stays on this phone meanwhile.'
          );
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
      // The keys below come from the quiz tier (INTRO, ACHK): on a slow first visit ⚙ is usable before it is in, so the
      // sign-out waits for it rather than failing half-way, signed out in memory but not on the device.
      off.disabled = true;
      (typeof need === 'function' ? need(2) : Promise.resolve()).then(signOff);
    };
    const signOff = () => {
      signOutClear();
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
  // Two players of one first name: the name is the account key, so the form asks from the start for the first name and
  // the surname's initial, and a name taken with another code says so in plain words. A nickname or alias is just as
  // welcome (the point is no two players with one name), said in the label itself.
  const tail = name => (/\s/.test(name) ? 'add more of your surname' : `add your surname's initial (${name} B.)`);
  const form = (name = '', pin = '', hint = '') => {
    box.innerHTML = `<h3>Sign in to save your progress</h3><p>Training at ${ORG.short}? Sign in with your name and a 4-digit code: your progress is saved for your trainer and comes back on any device. Learning on your own? Sign in too, to keep your progress on all your devices.</p>
    <form class="sform"><label>Your name or nickname <input name="n" required maxlength="40" autocomplete="name" placeholder="First name + initial"></label>
    <label>4-digit code <input name="p" required inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off"></label>
    <button class="${box.classList.contains('tsync') ? 'next' : 'chip go'}" type="submit">Sign in</button> <span class="note" role="status"></span></form>
    <p class="note">Your first name and your surname's initial (e.g. Anna B.), or a nickname or alias: any name no one else has, that you will remember. New name: pick any code and remember it. Same name and code later: your saved progress comes back.</p>`;
    const f = box.querySelector('form');
    f.n.value = name;
    f.p.value = pin;
    if (hint) {
      msg(hint);
      f.n.focus({preventScroll: true});
      f.n.setSelectionRange(name.length, name.length);
    }
    f.onsubmit = e => {
      e.preventDefault();
      // REE-35: the sheet is asked about the name as typed first (cut at a whole character, core.js nameCut), so an
      // existing account opens under its own spelling. A new name is NFC (core.js nameClean): when that differs from the
      // typed one and no account was found, the sheet is asked about it too (an account made in NFC opens), and a new
      // account takes it.
      const typed = nameCut(f.n.value.trim()),
        fresh = nameClean(typed),
        pin = f.p.value.trim();
      msg('Connecting…');
      syncGet({name: typed, pin})
        .then(j => (j && j.ok && !j.found && fresh !== typed ? syncGet({name: fresh, pin}).then(k => [k, fresh]) : [j, typed]))
        .then(([j, asked]) => {
          const name = j.ok && !j.found ? fresh : asked;
          if (!j.ok)
            return msg(
              j.error === 'gone'
                ? j.into
                  ? `This name was merged into ${j.into}: sign in as ${j.into}.`
                  : 'This name and code were removed: pick another code to start again.'
                : j.error === 'pin'
                  ? `Someone already uses the name ${name}. If it isn't you, ${tail(name)}. If it is you, check your code.`
                  : j.error === 'wait'
                    ? 'Too many wrong codes for this name: try again in 10 minutes.'
                    : 'Check the name and the 4-digit code.'
            );
          if (j.found) return isYou(name, pin, j);
          // A new account under a reserved name (core.js reservedName) is never made: said here, before the first save
          // would send it (the sheet refuses it too). An existing account that has one signs in.
          if (reservedName(name)) {
            msg('This name is reserved, please choose another.');
            return f.n.focus({preventScroll: true});
          }
          // Nor under a name with an invisible character, or one that looks like a taken name (REE-35): the sheet says
          // it (taken: Code.gs nameIssue_, from the sheet script v224), the form checks the invisible characters itself
          // (core.js nameHidden) whatever the sheet's version. An existing account that has such a name signs in.
          if (j.taken === 'invisible' || nameHidden(name)) {
            msg('This name holds an invisible character (a zero-width space or a text-direction mark): please type it again.');
            return f.n.focus({preventScroll: true});
          }
          if (j.taken === 'lookalike') {
            msg(`A name that looks the same is already taken. If it is yours, type it as you did the first time; if not, ${tail(name)}.`);
            return f.n.focus({preventScroll: true});
          }
          enter(name, pin, j);
        })
        .catch(e =>
          msg(
            e && e.local
              ? 'This is a local copy of the app: signing in is off here, so nothing reaches the sheet.'
              : 'Could not connect. Check your connection: your progress stays on this phone meanwhile.'
          )
        );
    };
  };
  // The achievements' record (progress.js) must be in before an account is merged (a sign-in from the tour on a slow
  // first visit can come before it).
  const enter = (name, pin, j) =>
    (typeof need === 'function' ? need(2) : Promise.resolve()).then(() => {
      signIn(name, pin, j);
      if (!j.found) syncPush().then(() => bindSync());
    });
  // An existing account (found): "Is it you?" first, on every device (two players of one first name with the same simple
  // code would otherwise share one account, the second one's answers merged into the first one's).
  // What it shows comes from the reply (core.js accountOf). No: nothing merged, saved or sent; back to the form with the
  // name to change. Only a brand-new account (found false) signs in at once.
  const isYou = (name, pin, j) => {
    const a = accountOf(j.data, j.updated),
      day = t => {
        const d = new Date(t),
          now = new Date(),
          ago = Math.round((new Date(now).setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 864e5);
        return ago === 0
          ? 'today'
          : ago === 1
            ? 'yesterday'
            : d.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                ...(d.getFullYear() !== now.getFullYear() ? {year: 'numeric'} : {})
              });
      },
      what = [
        a.n
          ? `${a.n.toLocaleString('en-GB')} answer${a.n > 1 ? 's' : ''}`
          : a.genera
            ? `progress on ${a.genera} ${a.genera > 1 ? 'genera' : 'genus'}`
            : '',
        a.at ? `last ${a.saved ? 'saved' : 'played'} ${day(a.at)}` : ''
      ].filter(Boolean),
      mine = store.get(LOG0, []).filter(a => !winkEntry(a)).length; // a surprise card's answer is none (core.js winkEntry)
    box.innerHTML = `<h3>Is it you?</h3><p>An account named <b>${esc(name)}</b> already exists${what.length ? ': ' + what.join(', ') : ''}.</p>
    ${mine ? `<p class="note">If it is, ${mine > 1 ? `the ${mine} answers played on this device join it` : 'the answer played on this device joins it'}.</p>` : ''}
    <form class="sform sconfirm"><button class="${box.classList.contains('tsync') ? 'next' : 'chip go'}" type="submit">Yes, it's me</button><button class="next sec" type="button">No, it's someone else</button></form>`;
    const f = box.querySelector('form');
    f.onsubmit = e => {
      e.preventDefault();
      f.querySelectorAll('button').forEach(b => (b.disabled = true));
      enter(name, pin, j);
    };
    f.querySelector('button[type=button]').onclick = () => form(name, pin, `Then pick a name of your own: ${tail(name)}.`);
    f.querySelector('button').focus({preventScroll: true});
  };
  form();
}
// Ask the browser not to evict saved progress when storage runs low.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
document.getElementById('sync').hidden = !SYNC_URL;

// Deleting one's own account (docs/ARCHITECTURE.md "Pages and routing"; decision:
// docs/decisions/2026-11-18-decisions-from-app-comments.md): #about/delete-account, linked from About › Privacy and the
// privacy notice, never a menu. Signed in: the code, a second confirmation, Code.gs selfDelete_ deletes everything,
// then signOutClear(true). Signed out: how to delete an account.
function viewDeleteAccount(h) {
  const box = body => `<h2 class="vh">Delete my account</h2><div class="about delacct">${body}</div>`,
    what = `<section><h3>What is deleted</h3><p>Deleting your account permanently deletes your data:</p><ul>
      <li>your name and your saved progress and settings;</li>
      <li>every answer you gave in the games;</li>
      <li>your problem reports and feedback;</li>
      <li>the summaries of the pages you opened.</li></ul>
      <p>Your name also leaves the app's technical logs and the statistics reports. This device is then signed out and cleared. This cannot be undone.</p>
      <p>Three things stay: your name and your scrambled code, in a list of removed accounts, so that another device still signed in is told the account was deleted; the audit log's notes about your account, under an anonymous id; and the backup copies made before the deletion. <a href="privacy.html">The privacy notice</a> says more.</p>
      <p class="note">To keep your answers anonymously for the photo ratings instead, ask Pierre Pericard (<a href="privacy.html">privacy notice</a>).</p></section>`;
  if (h === 'delete-account|done') {
    $v.innerHTML = box(
      `<section><h3>Account deleted</h3><p>Your account and all its data were permanently deleted, and this device was signed out and cleared.</p><p><a class="next" href="${hr('home')}">Home</a></p></section>`
    );
    return;
  }
  if (!SYNC) {
    $v.innerHTML = box(
      `<section><h3>Not signed in</h3><p>To delete an account, sign in on this device with its name and code, then come back to this page.</p><p>Without an account, nothing saved carries your name: your progress stays in this browser, and your answers were sent under a random id.</p><p><button class="chip go" type="button" id="dsin">Sign in</button></p></section>` +
        what
    );
    $v.querySelector('#dsin').onclick = () => signinNudge(false, false);
    return;
  }
  if (SYNC.err === 'gone' || SYNC.err === 'archived') {
    $v.innerHTML = box(`<section><h3>${esc(syncTrouble())}</h3><p>Sign out in ⚙ to clear this device.</p></section>`);
    return;
  }
  const me = SYNC;
  $v.innerHTML = box(
    what +
      `<section><h3>Delete the account “${esc(me.name)}”</h3><form class="delform" novalidate><label>Your 4-digit code <input name="code" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" required></label><p><button class="reset danger" type="submit">Delete my account…</button></p></form><p class="note" role="status"></p></section>`
  );
  const sec = $v.querySelector('.delform').parentNode,
    msg = t => (sec.querySelector('[role=status]').textContent = t);
  const step1 = () => {
    const f = sec.querySelector('.delform');
    f.onsubmit = e => {
      e.preventDefault();
      const code = f.code.value.trim();
      if (!/^\d{4}$/.test(code)) return msg('Type the 4 digits of your code.');
      // The code this device signed in with: a wrong one never reaches the sheet (it would count towards its wait).
      if (code !== String(me.pin)) return msg('That is not this account’s code.');
      msg('');
      f.innerHTML = `<p><b>Delete “${esc(me.name)}” and all its data now?</b> This cannot be undone.</p><p><button class="reset danger" type="button" id="dyes">Yes, delete everything</button> <button class="chip" type="button" id="dno">Cancel</button></p>`;
      f.querySelector('#dno').onclick = () => viewDeleteAccount('delete-account');
      f.querySelector('#dyes').onclick = () => {
        f.querySelectorAll('button').forEach(b => (b.disabled = true));
        msg('Deleting…');
        sheetFetch(SYNC_URL, {
          method: 'POST',
          body: JSON.stringify({selfDelete: 1, dname: me.name, dpin: me.pin, ...(me.acct ? {dacct: me.acct} : {}), av: appVer()})
        })
          .then(r => r.json())
          .then(j => {
            sheetSeen(j);
            if (!(j && j.ok && j.deleted)) throw j || {};
            return (typeof need === 'function' ? need(2) : Promise.resolve()).then(() => {
              signOutClear(true);
              location.replace(hr('delete-account|done'));
              location.reload();
            });
          })
          .catch(j => {
            const e = j && j.error;
            viewDeleteAccount('delete-account');
            $v.querySelector('.delacct [role=status]').textContent =
              e === 'archived'
                ? 'This account is archived.'
                : e === 'gone'
                  ? j.into
                    ? `Your trainer merged this name into ${j.into} (the same person): nothing was deleted. Sign out, sign in as ${j.into}, then delete that account.`
                    : 'This account was already removed.'
                  : e === 'pin'
                    ? 'The code was refused for this name.'
                    : e === 'wait'
                      ? 'Too many wrong codes for this name: try again in 10 minutes.'
                      : e === 'busy'
                        ? 'Too many tries for now: try again later, or ask Pierre Pericard.'
                        : 'Could not delete the account now: check your connection and try again. Nothing was deleted.';
          });
      };
    };
  };
  step1();
}
// The functions the views read (speciesOn, generaOn, sciOn, keptBy) are here now: a view made before this file came
// (app.js stateView) is made again.
if (typeof stateBump === 'function') stateBump();
