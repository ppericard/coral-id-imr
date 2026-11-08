// IMR Reef ID: the link with the sync sheet (tools/sync/Code.gs), split out of app.js (2026-11-02, code review L1:
// one file per part, one piece at a time). Signed-in progress (sync), photo statistics (loadStats), players' reports,
// answers of players not signed in (anonymous), the app's own error reports and one-tap answers (events), signing in.
// A classic script like app.js: it shares app.js's top-level names and is loaded right after it (index.html, in
// order); app.js waits for every script (window.BOOT) before its first page, so nothing here is needed earlier. Like
// app.js it is required: the loader tries it 3 times and the service worker keeps it; if it never arrives the start-up
// says the data could not be loaded, with Try again, as it did when this code was in app.js. The sync state the pages
// read (SYNC_URL, LOCAL, SYNC, syncTrouble) stays in app.js.
// RA sync: progress goes to Pierre's Google Sheet (Apps Script web app, tools/sync/Code.gs) under a name
// and a 4-digit code; the same name and code bring it back on another device. Off while SYNC_URL is empty.
// Photo difficulty from the sheet (Elo over every RA's answers), kept for offline use, with the sheet's version (v) so
// the genus offsets (gd, sheet v31) are read only from a sheet that has them. An older sheet script without stats
// simply answers with an error, and every photo's prior is 0.
// Refreshed every 10 minutes while the page is open (the sheet caches it for 10 minutes too), and on coming back to a
// tab left open longer than that.
let statsAt = 0;
setInterval(() => {
  if (document.visibilityState === 'visible') loadStats();
}, 600000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - statsAt > 600000) loadStats();
});
// It also tells the sheet (v50, Code.gs behind_) the app's version, this device's anonymous id (devId, as its events) and
// the minutes this page has been open (up): a device left on a replaced version is logged as 'old' with its id, so the
// admin can find whose it is (Pierre, 2026-11-05). An older script ignores both. Never from a local copy (LOCAL: a test,
// a developer; rule D1): without a device id the sheet logs nothing.
function loadStats() {
  if (!SYNC_URL || !DATA) return;
  statsAt = Date.now();
  const me = LOCAL ? '' : `&dev=${devId()}&up=${Math.round(performance.now() / 60000)}`;
  fetch(`${SYNC_URL}?stats=1&av=${appVer()}${me}`)
    .then(r => r.json())
    .then(j => {
      sheetSeen(j);
      if (j && j.ok && j.photos) {
        PSTAT = j.photos;
        GDIFF = {}; // genus difficulties follow the new photo stats and confusions
        PCONF = j.conf || {};
        PMEM = memOf(j.mem); // photo memory offsets (sheet v26); the prior from an older sheet
        PGD = gdOf(j); // genus offsets of the photo Elo (sheet v31, model.js photoDiff); none from an older sheet
        if (typeof rankPhotos === 'function') rankPhotos(); // the fish lists' first photos follow the new ratings (app.js)
        PFMT = fmtsOf(j); // per-format offsets (sheet v77, core.js fmtOffsetsOf); none from an older sheet
        store.set('reefid-photo-stats', {
          t: Date.now(),
          v: j.v,
          photos: j.photos,
          conf: PCONF,
          ...(j.mem ? {mem: j.mem} : {}),
          ...(j.gd ? {gd: j.gd} : {}),
          ...(j.fmt ? {fmt: j.fmt} : {})
        });
      }
    })
    .catch(() => {});
}
// The slate genera (Millepora included since 2026-11-02): the sheet's "By genus" columns and the leaderboard % follow them.
// The first leaderboard's subject (core.js SUBJECTS board: corals), whatever the subject on screen; the others' units
// in boards.
function syncSummary() {
  const B = SUBJECTS.find(x => x.board);
  if (B && B !== SUBJ) return inSubject(B.id, syncSummary);
  const n = slateGenera(),
    genera = Object.fromEntries(n.map(x => [x, level(x)[0]]));
  return {
    learned: n.filter(x => genera[x] === 'ok').length,
    seen: n.filter(x => genera[x] !== 'new').length,
    total: n.length,
    review: n.filter(x => genera[x] === 'weak'),
    genera,
    pct: progPct(n), // the public leaderboard (sheet v14): progress as the header shows it
    board: boardOn() ? 1 : 0,
    boards: boardUnits()
  };
}
// The units each other subject's leaderboard counts (SUBJECTS board after the first; sheet v95, Code.gs
// boardUnitsSave_): {id: its slate}, as My progress counts it (UNITS slate), the sheet then ranking that board on each
// player's saved progress of the subject over it. A subject whose content is not loaded on this device sends none.
// A subject with a global score (core.js SUBJECTS score: the fish) sends its tree instead (app.js UNITS tree), once the
// sheet ranks by it (core.js SCORE_SHEET, v101: board_ ranks by core.js treeScore, the % My progress shows; rule D4).
const boardUnits = () =>
  Object.fromEntries(
    SUBJECTS.filter((S, i, a) => S.board && S !== a.find(x => x.board))
      .map(S => {
        const U = typeof UNITS === 'object' ? UNITS[S.id] : null,
          T = U && S.score && U.tree && sheetV() >= SCORE_SHEET ? U.tree() : null;
        return [S.id, T || (U ? U.slate() : [])];
      })
      .filter(([, u]) => u && (Array.isArray(u) ? u.length : (u.f || []).length))
  );
// The saved data comes with the key names of the app that saved it (core.js keysIn: an app from before the rename to
// IMR Reef ID, 2026-11-03, saves the old ones): read with the new names only.
// rv: the rules version this device's progress was last replayed with (replayAdopt): the sheet (v28) answers with the
// full replay of the player's log when it is older than its own. pt: the time of the oldest answer still queued here
// (pendingFrom), so the replay's ids cover every queued answer the sheet already logged.
// info: what the request did, for a failed save's report (sheetCall).
const syncGet = (a = SYNC, info = {}) =>
  sheetCall(
    `${SYNC_URL}?name=${encodeURIComponent(a.name)}&pin=${encodeURIComponent(a.pin)}&av=${appVer()}&rv=${rvAsk()}${rvsParam()}${ptParam(a.log)}`,
    undefined,
    info,
    'load'
  ).then(j => {
    if (j && j.data) j.data = keysIn(j.data);
    return j;
  });
// The full replay of the answer log by the sheet (Pierre, 2026-11-03: progress recalculated from the whole log,
// automatically, never by a human click, now and whenever the progress engine changes; docs/LEARNING.md "Full replay").
// The sheet (Code.gs replay_, v28) replays the player's rows with this app's own engine (core.js replayProgress, embedded
// in the script) when the request says this device applied an older rules version (rv, core.js RVS), and the reply
// carries replay: {rv, n, rec, ids}. The app adopts it once per version: the progress becomes the replay (rec), with
// this device's answers the sheet has not counted yet (pending: the unsent log, minus the ids the sheet replayed, and
// minus the answers before a progress reset) replayed on top by the same engine, then core.js replayedOf keeps from
// this device's copy only what the log cannot give (the mastery exam, the days answered right, the last observations,
// the corallites milestone; a genus the log has fewer answers on keeps its record). Run through mxRecalc, so a learned
// mark taken away is told with its card; saved and synced. The rules version applied (RVK) travels with the progress
// data: a device that signs in to the account takes it with the account (its progress is the adopted one: no second
// adoption); a device already signed in keeps its own, so it adopts the replay itself once, with its own unsent answers
// on top (a pull alone would let those answers keep their older model). Then the announcement card of every version
// skipped that has one (RVS msg; progress.js rvNotice), at once. The device's own recalculations (core.js memRecalc,
// pgOf, for a record not rebuilt under the domain-score bar) stay as the fallback for a device that never reaches the sheet. The app never gets ahead of the sheet script
// (rule D4): v, the script version of the reply; a reply from a script before core.js RV_SHEET (28) is never
// adopted, whatever it carries, so the app does exactly what it did before (an older script sends no replay, and the
// rv field the requests carry is ignored there).
const RVK = 'reefid-sync-coral-rv';
// The other subjects whose progress the sheet replays (core.js SUBJECTS replayed: fish; Pierre, 2026-11-08, ROADMAP "Fish
// progress replayed from the answer log"): each with its own rules version applied (rvKey: reefid-sync-<subject>-rv,
// travelling with the progress data as RVK does), asked for with the requests (rvs, the load's rv_<subject>) and adopted
// as the corals' replay is (replayAdoptS), under its own rules versions (core.js rvsOf: fish FISH_RVS), but only from the
// script that replays it under this app's rules (core.js REPLAYS_SHEET; rule D4): before, that subject does exactly what it
// did (no rules version, the plain merge).
const rpSubjects = () => SUBJECTS.filter(S => !S.replay && S.replayed);
const rvKey = S => (!S || S.replay ? RVK : subjKey(S.id, 'rv'));
const rpOn = (S, v) => !!S && (!!S.replay || (!!S.replayed && Number(v) >= REPLAYS_SHEET));
const rvApplied = S => Number(store.get(rvKey(S), 0)) || 0;
// The rules version a request says: the one applied here, or 0 while this device holds answers the sheet logged from a
// refused save (SYNC.lg, syncOnce): its merge baseline lacks them, so a saved copy another device built from the log
// (a replay) may already count them, and only the replay of the log tells (mergeSaved; Codex review #399).
// Per subject the sheet replays: the flag holds for a subject until its own replay of the log is adopted (lgOk), so the
// corals' adoption does not clear it for the fish progress, whose baseline lacks the fish answers still.
const lgFor = S => !!(SYNC && SYNC.lg && !(SYNC.lgOk || []).includes((S || SUBJECTS[0]).id));
const rvAsk = S => (lgFor(S) ? 0 : rvApplied(S));
// Another subject's units for its replay (core.js replayProgress gen; app.js UNITS gen: fish.json's, loaded with the
// subject), null before they are in.
const rpUnits = S => (typeof UNITS === 'object' && UNITS[S.id] && UNITS[S.id].gen ? UNITS[S.id].gen() : null);
// The other subjects' versions a request says, each only once a reply said the script replays it (sheetV), so an older
// script is never asked for a replay the app would not adopt, and once its units are in (the replay waits for them).
const rvsAsk = () =>
  Object.fromEntries(
    rpSubjects()
      .filter(S => rpOn(S, sheetV()) && rpUnits(S))
      .map(S => [S.id, rvAsk(S)])
  );
const rvsParam = () =>
  Object.entries(rvsAsk())
    .map(([k, v]) => `&rv_${encodeURIComponent(k)}=${v}`)
    .join('');
// A subject's replay in a reply: the corals' replay, another's in replays (Code.gs replays_).
const rpOf = (j, S) => (!j ? null : S.replay ? j.replay : (j.replays || {})[S.id]);
// The reset of each other subject replayed, as a request carried it (the replay's cutoff, replayAdoptS).
const rpCuts = () => Object.fromEntries(rpSubjects().map(S => [S.id, store.get(subjKey(S.id, 'reset'), '') || '']));
// The time (ms) of the oldest answer of a queue, null when it holds none. Sent with the requests that can bring a replay
// (pt): the sheet (v28) then lists in replay.ids every answer it replayed from that time on, so replayAdopt never counts
// again an answer the sheet already has, however many a lost reply left queued here (up to 2,000; Codex review #399).
function pendingFrom(q) {
  let t = Infinity;
  (q || []).forEach(a => {
    const x = Date.parse((a && a.t) || '');
    if (x < t) t = x;
  });
  return isFinite(t) ? t : null;
}
const ptParam = q => (pendingFrom(q) === null ? '' : `&pt=${pendingFrom(q)}`);
// cut: the progress reset time the request was sent with ('' for none), the cutoff the sheet replayed from (a save's
// data, an anonymous send's reset). A reset made here while the request was on its way: the replay still holds the
// progress it discarded, so it is not adopted (nor its version marked applied); the next reply brings it again from
// the new reset (Codex review #399). A load's reply (mergeSaved) needs none: a reset newer than the sheet's returns
// before it.
// The sheet's opening hold (v23, model.js holdSync) counts the replayed subject's answers (core.js SUBJECTS replay: the
// corals'): taken as that subject whatever the subject on screen (inSubject), so it never lands in another subject's
// hold, with this device's unconfirmed answers of that subject only (subjEntries: a fish answer queued is not a coral one).
function holdAdopt(h, log, ids) {
  const LS = SUBJECTS.find(x => x.replay);
  if (LS && LS !== SUBJ) return inSubject(LS.id, () => holdAdopt(h, log, ids));
  if (typeof holdSync === 'function') holdSync(h, subjEntries(log, SUBJ.id), ids);
}
// The replay is the progress of the subject the sheet replays (core.js SUBJECTS replay: the corals): adopted as that
// subject whatever the subject on screen (inSubject). Another subject the sheet replays (SUBJECTS replayed: fish) is
// adopted the same way, as itself (replaysAdopt, replayAdoptS).
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
    T = typeof scoreOn === 'function' && scoreOn() && U && U.tree ? U.tree() : null,
    L = typeof slateGenera === 'function' ? slateGenera() : [];
  return T ? treeScore(X, T, SUBJ.score).pct : pctOf(X, L);
};
function replayAdoptS(S, rp, pending, v, cut, pre) {
  sheetSeen({v});
  if (S && S !== SUBJ) return inSubject(S.id, () => replayAdoptS(S, rp, pending, v, cut));
  if (!S) return false;
  pending = subjEntries(pending, SUBJ.id); // this device's queued answers of that subject on top, never another's
  if (!(Number(v) >= RV_SHEET) || !rpOn(S, v)) return false;
  if (!rp || typeof rp.rv !== 'number' || !rp.rec || typeof rp.rec !== 'object') return false;
  // A newer version, or the same one asked again for answers logged from a refused save (rvAsk).
  if (rp.rv < rvApplied(S) || (rp.rv === rvApplied(S) && !lgFor(S))) return false;
  if (typeof mxRecalc !== 'function') return false; // the quiz tier (model.js) not in yet: the next reply brings it again
  if (cut !== undefined && cut !== (store.get(sKey('reset'), '') || '')) return false;
  // The units the replay reads (core.js replayProgress gen): the corals' from data.json, another subject's from its own
  // data (UNITS gen: fish.json's, loaded with the subject); not in yet: the next reply brings it again.
  const gen = S.replay ? {...((DATA && DATA.x && DATA.x.gen) || {}), ...((DATA && DATA.gen) || {})} : rpUnits(S);
  if (!gen) return false;
  // Signed in with anonymous answers not moved to the account yet (signIn; the first save's reply clears SYNC.anon before
  // it adopts): a replay of the account's log alone would leave them out.
  if (SYNC && SYNC.anon) return false;
  // A replay made with another first-launch history than this device's (Codex review #428: a history merged here and not
  // saved yet): not adopted, nor its rules version marked applied; the save that follows carries the merged history, and
  // its reply brings the replay made with it (Code.gs v36 sends the fingerprint it used, core.js startFp).
  if (Number(v) >= START_SHEET && (rp.fp || '') !== startFp(store.get(startKey(SUBJ.id), null))) {
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
      last = Number((rp.rec[LEVEL] || {}).at) || 0,
      // The sheet's photo numbers are the corals' (Code.gs stats_): another subject's replay reads none, nor does this
      // device's on top of it (its answers carry their scoring record).
      st = S.replay ? {mem: PMEM, conf: PCONF, fmt: Number(v) >= FMT_SHEET ? PFMT : {}, gd: typeof PGD === 'object' ? PGD : {}} : {},
      // This device's answers on top, under the rules of the script that sent the replay: the answer time only from
      // core.js RT_SHEET, as the live game (model.js rtOn; rule D4, Codex review #444).
      R = rows.length
        ? replayProgress(rows, {
            gen,
            mem: st.mem,
            conf: st.conf,
            // The per-format offsets, from the script that serves them (core.js FMT_SHEET, fmtsOf), as the live game.
            fmt: st.fmt,
            start: {[me]: {P: rp.rec, n: 0, used: 0, rep: 0}},
            time: Number(v) >= RT_SHEET,
            // The domain-score bar only from the script that replays it (core.js DOM_SHEET), as the live game (model.js
            // domRules); the genus offsets for an answer logged without them (an older app's).
            dom: Number(v) >= DOM_SHEET,
            gd: st.gd,
            // The first-launch answer (core.js startPriorAt), from the script that replays it (START_SHEET), as the live game.
            starts: Number(v) >= START_SHEET ? {[me]: store.get(startKey(SUBJ.id), null)} : {}
          })[me].P
        : rp.rec,
      before = copy(P),
      // Today's bars as a floor at a subject's first replay (SUBJECTS replayed floor; Q310) are in the replay itself: the
      // sheet floors it against the account's saved copy (Code.gs replay_, core.js replayFloor), so every device adopts
      // the same record and keeps it as their shared baseline (replayBase; Codex review #779).
      M0 = replayedOf({P: R}, P, rp.rv);
    let M = M0;
    // A unit replayedOf keeps from this device (more answers here than in the log: answers from before fish logging)
    // beside the replayed records: their mix-ups and offers on it may read it lower than it was here, so its bar of
    // before is floored too, in this device's progress (core.js replayFloor; Codex review #779).
    const keptHere = Object.keys(M).filter(g => g !== LEVEL && M[g] && typeof M[g] === 'object' && !M[g].rv && P[g] && !P[g].rv);
    if (S.replayed && S.replayed.floor && keptHere.length) M = replayFloor(M, P, keptHere);
    // A floored replay's typed opportunities (core.js replayFloor may raise the level's, which a unit's false-alarm rate
    // reads): kept per rank when this device's larger answer count keeps its own level (replayedOf), here (the replay
    // with this device's answers on top, R) and in the shared baseline below (the sheet's replay alone, rp.rec: this
    // device's unsent answers stay its own; Codex review #779), so the adoption does not undo the floor.
    const fl = !!(S.replayed && S.replayed.floor),
      tykUp = (L, X) => {
        const tyk = fl && X && X[LEVEL] && X[LEVEL].tyk;
        if (!tyk || !L || typeof L !== 'object') return;
        const o = {...(L.tyk || {})};
        Object.keys(tyk).forEach(k => typeof tyk[k] === 'number' && tyk[k] > (o[k] || 0) && (o[k] = tyk[k]));
        L.tyk = o;
      };
    tykUp(M[LEVEL], R);
    // Answers of this device's queue older than the replay's last one (an offline device, another one logging since):
    // on top of the replay they would count after newer answers, out of time order (Codex review #399: 20 right answers
    // played offline before 10 misses logged elsewhere gave pg 0.96 and ten right answers last, for 0.19 and ten
    // misses in time order). Not adopted, nor the version marked applied: the save that follows logs them, and its
    // reply brings the replay of the whole log in time order.
    if (rows.some(r => r[1] < last)) return false;
    // A mark the replay took away: the former model's (a record learned with neither s.pg nor the domain-score bar,
    // core.js afterBkt), or a rule of the new version.
    mxRecalc(
      () => {
        Object.keys(P).forEach(g => delete P[g]);
        Object.assign(P, M);
      },
      n => (afterBkt(before[n]) ? 'rules' : 'bkt')
    );
    store.set(rvKey(S), rp.rv);
    // The merge baseline (mergeSaved) becomes the shared history: the sheet's replay itself, never mixed with this
    // device's answers the sheet has not counted yet, which stay this device's own (P minus the base) and go on top at
    // the next merge (core.js replayBase). Left at the saved copy, another device saving its own adoption of the same log
    // made this one count the replayed answers twice (Codex review #399: 2 became 4); built from this device's copy, an
    // unsent answer went into the base and was lost at the next merge (Codex review #399: 3 became 2).
    if (SYNC) {
      SYNC[S.base[0]] = replayBase(rp.rec, M, rp.rv, SYNC[S.base[0]]);
      tykUp((SYNC[S.base[0]] || {})[LEVEL], rp.rec);
      // The replay counts every logged answer of this subject; the flag goes once every subject replayed has its own.
      if (SYNC.lg) {
        SYNC.lgOk = [...new Set([...(SYNC.lgOk || []), S.id])];
        if ([SUBJECTS.find(x => x.replay), ...rpSubjects().filter(x => rpOn(x, v))].every(x => !x || SYNC.lgOk.includes(x.id)))
          (delete SYNC.lg, delete SYNC.lgOk);
      }
      store.set('reefid-account', SYNC);
    }
    save();
    // The progress % before and after, for a card shown only to the players whose % moved (core.js RVS msg.only). pre:
    // the % this device showed before the sync that brought the replay (mergeSaved), as the pull may already have merged
    // a copy another device saved after its own adoption (Codex review #399: 83% to 33%, compared as 33 to 33).
    if (played && typeof rvNoticeAdd === 'function')
      rvNoticeAdd(from, rp.rv, [typeof pre === 'number' ? pre : headOf(before), headOf(P)], S.replay ? undefined : S.id);
    if (!SUBJ_VISIT && hashNow() === 'progress') route(); // not while visiting: the page shows another subject
    return true;
  } catch (e) {
    ev('err', {msg: 'replay not adopted: ' + String((e && e.message) || e).slice(0, 120)});
    return false;
  }
}
// Two devices on one account: three-way merge against SYNC.base, the progress as last sent or received.
// Answers taken on this device since then are added on top of the saved record, so neither side's answers
// are lost. A reset (reefid-sync-coral-reset, a time) wins over older progress.
const copy = o => JSON.parse(JSON.stringify(o));
// Once everything is merged, a first-launch question card left waiting gets the answer given on another device and the
// quiz goes on (model.js startResume; Codex review #428: resumed inside the merge, the quiz drew on the progress and
// cards from before it).
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
  // The custom quiz's selection made on another device, if more recent than this one's (model.js CUSTOM.KEY, quiz.js
  // viewCustom: {g, t}).
  try {
    const rc = JSON.parse(d['reefid-sync-coral-custom'] || 'null'),
      lc = store.get('reefid-sync-coral-custom', null);
    if (rc && Array.isArray(rc.g) && (rc.t || 0) > ((lc && lc.t) || 0)) store.set('reefid-sync-coral-custom', rc);
  } catch (e) {}
  achMerge(d[ACHK]); // achievements earned on another device join this one's
  toldMerge(d[TOLD.KEY]); // the notices told on another device: never told again here (noticesGo decides after the merge)
  // Each subject's first-launch question answered on another device (model.js startMerge; the latest answer wins).
  SUBJECTS.forEach(S => S.start && startMerge(d[startKey(S.id)], S.id));
  // Each subject's progress on its own (core.js SUBJECTS), as if it were on screen (inSubject): its cards, reset, opt-in
  // sets and opening hold. A subject the saved copy does not hold is left alone (the first, the corals, always runs):
  // absent is not empty (Codex review #442: a copy saved by an app from before fish has no fish keys, and merged as an
  // empty record it erased this device's fish progress, which no answer log can rebuild); this device's goes with the
  // next save. A reset is a key with an empty record and a reset time, never an absent key.
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
  // rules version applied (rvKey) and its replay (rpOf) take part in the merge below; any other merges as before.
  const RO = rpOn(S, j.v),
    RK = rvKey(S),
    rpS = rpOf(j, S);
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
  if (SYNC[PK] && d[sKey('progress')] === SYNC[PK]) SYNC[BK] = R;
  delete SYNC[PK];
  // A reset made here that the sheet's copy does not have yet: this device's progress stays (the sheet's hold too counts
  // from its older reset), and, for a subject the sheet replays (SUBJECTS replay), the replay since the
  // reset is asked for with the save that brings it (the rules version back to 0): other devices, an older app among
  // them, may have answered after the reset time from a copy without it, and those answers count (they are in the log
  // after the reset).
  if (lr > rr) return void (RO && store.set(RK, 0));
  // The Bonus genera choice (fish: the scientific genera) made on another device, if more recent than this one's (or made there
  // only; Codex review #371); after the reset check, so a choice saved before this device's newer reset does not come back.
  try {
    const rq = JSON.parse(d[sKey('quiz')] || '{}') || {};
    S.optin.forEach(k => {
      if (typeof rq[k] === 'boolean' && (Q[k] === undefined || (rq[k + 'T'] || 0) > (Q[k + 'T'] || 0))) {
        Q[k] = rq[k];
        Q[k + 'T'] = rq[k + 'T'] || 0;
        // With the choice, its "Not now" count and when (UNITS opens: the offer comes back at most once), and the rules it
        // was made under (V: the back card, quiz.js bonusBackDue) and by (H: by hand before Advanced, app.js bonusSet).
        ['N', 'A', 'V', 'H'].forEach(x => (rq[k + x] === undefined ? delete Q[k + x] : (Q[k + x] = rq[k + x])));
        saveQ();
      } else if (rr > lr && typeof rq[k] !== 'boolean' && Q[k] !== undefined) {
        // A progress reset made on another device: the offer comes again here too.
        ['', 'T', 'N', 'A', 'V', 'H'].forEach(x => delete Q[k + x]);
        saveQ();
      }
    });
  } catch (e) {}
  // The opening hold from every answer the sheet has (v23, model.js holdSync), with this device's unconfirmed ones added:
  // the hold of the subject whose answers the sheet logs, never another's (Codex review #442: the corals' hold landed in
  // the fish one).
  const holdIn = () => S.replay && holdAdopt(j.hold, SYNC.log, j.holdIds);
  if (rr > lr) {
    introReset(Date.parse(rr)); // made on another device: its time (model.js startRestart keeps a window counted since)
    introIn();
    P = R;
    SYNC[BK] = copy(R);
    store.set('reefid-account', SYNC);
    store.set(sKey('reset'), rr);
    holdIn(); // after the reset time is in: only the answers since then count
    // The sheet's replay since the reset is asked for again (the rules version back to 0) when this copy may lack
    // answers: answers played here after that reset and not in the sheet yet (the save that follows logs them), or a
    // copy under older rules than this device applied (saved by an older app, or before its device's replay came back).
    if (RO && (subjEntries(SYNC.log, S.id).some(a => String(a.t || '') > rr) || (Number(d[RK]) || 0) < rvApplied(S))) store.set(RK, 0);
    store.set(sKey('progress'), P);
    if (typeof memRecalcAll === 'function') memRecalcAll(); // a record pulled from before the photo memory (model.js)
    if (typeof domRecalcAll === 'function') domRecalcAll(); // a non-replayed subject's units pulled under the moving average (model.js)
    notesSeen(j);
    if (RO) replayAdoptS(S, rpS, SYNC.log, j.v, undefined, pre); // the sheet's full replay, when newer than the one applied here (v28)
    prog();
    return;
  }
  introIn();
  holdIn();
  // A saved copy unchanged since this device last saved or loaded it (mine) is already part of P: nothing to merge,
  // whatever its rules version. A save carries the rules version applied when it was sent, so after a replay adopted
  // from that save's reply the copy is one version behind with nothing in it the replay lacks: taken for another
  // device's older copy (below), it asked for the replay again, saved the older version again, and so on at every sync
  // (Codex review #399: the saved version stayed 0, a full replay at every sync). And after a replay adopted since the
  // copy was loaded, the merge baseline is the replay (replayAdopt), ahead of a copy behind the log: merged, the copy
  // read as answers taken away. Any other save in between, an older app's included, changes the revision (Code.gs).
  // A saved copy under older rules than this device applied (its RVK, core.js RVS), saved by another device, is not
  // merged: it may predate the replay adopted here, and its older counts and model would undo it. But it may also hold
  // answers saved since by a device on an app from before the replay, which never adopts one (its data has no RVK;
  // Codex review #399: 2 answers adopted, then 1 saved by such a device, gave 2 again here, and this device's next save
  // overwrote it). Both are in the log, which the replay reads: this device's applied version goes back to the saved
  // copy's, so its next request (the save of this very sync, or one asked for now after a pull) gets the replay of the
  // whole log again, every answer of every device counted once, this device's unsent ones on top (replayAdopt). The
  // cost: one more replay.
  // Only a subject the sheet replays (the corals; fish from its script: RO) has a rules version; the others merge as before the replay.
  const rvSaved = RO ? Number(d[RK]) || 0 : Infinity;
  // Answers this device had logged from a refused save (SYNC.lg): another device may have saved them already, in its
  // replay of the log, and the merge would add them again as this device's own (Codex review #399: 3 answers, a baseline
  // of 2, a saved replay of the 3: 3 + 3 - 2 = 4, kept for good). The replay of the log, which the load asked for
  // (rvAsk), counts every one once: adopted, it replaces the merge; without it, the merge as usual.
  notesSeen(j);
  const recovered = !!(RO && lgFor(S) && rpS && replayAdoptS(S, rpS, SYNC.log, j.v, undefined, pre));
  // Another subject replayed (fish) whose replay could not be adopted here (its units not in yet, or the reply without
  // it): its merge would add the answers of the refused save again (Codex review #779: a baseline of 2, 3 here and a
  // saved replay of 3 gave 4), so it waits, this device's progress as it is, and its rules version goes back to 0, so
  // the replay of its whole log is asked for and adopted once it can be (replayAdoptS), whatever saves come before.
  const waitRp = !S.replay && RO && lgFor(S) && !recovered;
  if (waitRp) store.set(RK, 0);
  if (!mine && !recovered && !waitRp) {
    if (rvSaved >= rvApplied(S)) {
      // In place: other code holds P by name only, but keep the same object anyway.
      const M = mergeProgress(SYNC[BK] || {}, P, R);
      // A copy under newer rules than this device applied (another device adopted their replay): a learned mark that
      // replay took away is not taken here by the merge, which would tell nothing (the mark gone before mxRecalc sees it;
      // Codex review #399). It stays until this device adopts the same replay (replayAdopt, in this very sync when the
      // reply carries it, else at the next), which decides it with this device's own card (told once per account: core.js TOLD, progress.js mxLostNotice).
      if (RO && rvSaved > rvApplied(S))
        Object.keys(M).forEach(g => g !== LEVEL && P[g] && P[g].mx && M[g] && !M[g].mx && (M[g].mx = P[g].mx));
      Object.keys(P).forEach(g => delete P[g]);
      Object.assign(P, M);
      // The saved record is now part of P: it becomes the baseline, so a failed send can't count it twice.
      SYNC[BK] = copy(R);
    } else store.set(RK, rvSaved);
  }
  store.set('reefid-account', SYNC);
  store.set(sKey('progress'), P);
  if (typeof memRecalcAll === 'function') memRecalcAll(); // a record pulled from before the photo memory (model.js)
  if (typeof domRecalcAll === 'function') domRecalcAll(); // a non-replayed subject's units pulled under the moving average (model.js)
  notesSeen(j);
  if (RO) replayAdoptS(S, rpS, SYNC.log, j.v, undefined, pre); // the sheet's full replay, when newer than the one applied here (v28)
  prog();
}
// Saving when the line or the sheet fails (Pierre, 2026-11-05: the red "Not saved" came up "a bit too often": the
// Events tab held 26 "save failed: Failed to fetch" / "Load failed" in four days, 15 from one phone, each shown in red
// at once and tried again only at the next answer, the next visit or back online). A save that fails for a passing
// reason is tried again by itself, SAVE.RETRY seconds apart (longer each time), while the app is in view: the line, a
// request cut because the app went to the background (iOS and Android stop a hidden page's network), the sheet busy or
// failing (sheet v50 answers those as JSON, lock or server; before, Apps Script's error page came without CORS header and
// the browser called it a network failure). A try cut by the app going to the background never counts: it is tried
// again when the app comes back. The header says "Not saved" (syncTrouble) only once saving has failed SAVE.RED_N times
// in a row over SAVE.RED_MS at least, the app in view: a save that comes through on a retry never shows red, one that
// keeps failing does. The answers wait on this device meanwhile and the whole queue goes at the next try: nothing is
// dropped. A refused code, a removed account and the wrong-code wait are red at once (no retry mends them). Each request
// has SAVE.TIMEOUT to answer (it had no limit, and one that never ended held every later save behind it).
// The run of failures (SYNC.fail: n counted, hid cut by the background, at its first failure, why the last error, d what
// the last try did) travels with the account record, so a reload in the middle of it keeps counting. The Events tab
// (sheet v19 'sync') gets 'save failed: <error>' when the red shows, and 'save recovered: <error>' when a run with a
// counted failure ends with a save; Where says what the last failed try did: its step (load, the pull before the send;
// save, the send), the HTTP status when a reply came, its seconds, the tries, the seconds since the first failure, and
// the tries cut by the background.
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
// An archived record (Pierre, 2026-11-05, Q88; sheet v58 userArchive, v20 rename): the trainer moved this account's
// record apart under another name, so the sheet no longer finds the name (found false), although this device holds a
// revision it saved there (srv). Pushing would silently re-create the account under the old name with the archive's
// progress and achievements (the audit's G4): instead the device says the record was archived and offers to sign out
// (bindSync), which clears it; the player then signs in again, under the same name if they like, and starts empty.
// The same name taken again after an archive (sheet v58, Codex review #603): the sheet finds an account, but another
// generation of it (_acct in its saved data, made with the account) than the one this device saved under: archived too.
// A device that saw no generation yet adopts the first one it meets.
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
// at = the sheet revision merged against (script v6): if another device wrote in between, the sheet answers 'stale'
// (answers logged all the same) and the whole pull-merge-send runs again, at most twice (code review M1).
function syncOnce(tries = 0) {
  const me = SYNC,
    info = {}; // what this try's requests did (sheetCall), for a failed save's report
  let rev, sent, log, cut, cuts, rvs;
  // If the device is disconnected or switched to another account meanwhile, drop this sync.
  // Script v11: a name the admin removed or merged answers 'gone' (with the name it joined): recorded below, no send.
  return syncGet(me, info)
    .then(j => {
      if (SYNC !== me) return null;
      if (!j.ok) return j;
      if (archivedOf(j, me)) return {ok: false, error: 'archived'}; // nothing pushed: the record is not re-created
      groupsSeen(j, me.name); // the beta groups first (v48): they never depend on the merge
      if (j.found) mergeSaved(j);
      repsSeen(j); // the player's reports (v57), after the merge: their thanks on another device came with it
      rev = me.rev;
      // Each subject's progress as sent: its baseline once the sheet confirms (SUBJECTS base).
      const pd0 = progData();
      sent = Object.fromEntries(SUBJECTS.map(S => [S.id, JSON.parse(pd0[subjKey(S.id, 'progress')] || '{}') || {}]));
      cut = store.get('reefid-sync-coral-reset', '') || ''; // the reset this save's data carries, the replay's cutoff (corals: replayAdopt)
      cuts = rpCuts(); // and the other subjects' replayed (replaysAdopt)
      rvs = rvsAsk();
      // The answers the sheet can file (core.js logOk): a subject it does not replay waits for LOG_SHEET (rule D4), queued.
      log = (me.log || []).filter(a => logOk(a, sheetV()));
      SUBJECTS.forEach(S => (me[S.base[1]] = pd0[subjKey(S.id, 'progress')] || ''));
      store.set('reefid-account', me);
      const pd = (progData()['reefid-sync-coral-progress'] || '').length;
      if (pd > 40000) console.warn(`Progress is ${pd} characters (sheet script v6 stores any size; v5 stops at 50,000).`);
      return sheetCall(
        SYNC_URL,
        {
          method: 'POST',
          body: JSON.stringify({
            name: me.name,
            pin: me.pin,
            data: withLegacy(progData()), // + the old names, for a device still on an app from before the rename (core.js)
            summary: syncSummary(),
            answers: log,
            av: appVer(), // the app's version (sheet v25: a request without it comes from an app before 2026-11-03)
            rv: rvAsk(), // the rules version applied here (sheet v28: an older one gets the full replay back)
            ...(Object.keys(rvs).length ? {rvs} : {}), // the other subjects' (Code.gs replays_)
            ...(pendingFrom(log) === null ? {} : {pt: pendingFrom(log)}), // the replay's ids cover every answer sent (pendingFrom)
            // First send after signing in: the answers this device sent anonymously move to this name (script v12).
            ...(me.anon ? {anon: me.anon} : {}),
            ...(typeof me.srv === 'number' ? {at: me.srv} : {}),
            // The account generation this device saved under (sheet v58): checked under the sheet's lock, so a record
            // archived between this load and this save is never overwritten (Codex review #603).
            ...(me.acct ? {acct: me.acct} : {}),
            ...(log.length ? devField() : {}) // the device of its answers (sheet DEV_SHEET)
          })
        },
        info,
        'save'
      );
    })
    .then(j => {
      if (!j || SYNC !== me) return j;
      // The account's generation from the save's reply (sheet v58): the device that created the account knows it at once,
      // so a record archived and taken again before its next load is still told apart (Codex review #603).
      if (j.ok && typeof j.acct === 'string' && j.acct && !me.acct) {
        me.acct = j.acct;
        store.set('reefid-account', me);
      }
      // Answers the sheet confirmed are dropped from the queue even when the progress write itself was refused.
      if (j.log && log.length) {
        const done = new Set(log.map(x => x.id));
        me.log = (me.log || []).filter(x => !done.has(x.id));
        // Logged, but the progress carrying them not saved: the merge baseline lacks answers the log has (rvAsk).
        if (!j.ok) ((me.lg = 1), delete me.lgOk);
        store.set('reefid-account', me);
      }
      // The retry is a whole sync of its own: its result skips the steps below (they would apply this round's sent copy).
      if (j.error === 'stale' && tries < 2) {
        SUBJECTS.forEach(S => delete me[S.base[1]]);
        return syncOnce(tries + 1).then(r => {
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
        delete me.lg; // the saved copy now holds the answers it lacked
        delete me.lgOk;
        if (typeof j.rev === 'number') me.srv = j.rev;
        delete me.err;
        if (!j.log && log.length) me.err = 'net';
        if (me.anon) delete me.anon;
        if (j.log) {
          const done = new Set(log.map(x => x.id));
          me.log = (me.log || []).filter(x => !done.has(x.id));
        }
        groupsSeen(j, me.name); // the beta groups (v48), as the load's reply
        saveOk(me); // a run of failed tries ends here
        // The sheet's hold over every answer now logged, in time order (v23; Codex review #370), plus any answer given
        // while this send was on its way.
        holdAdopt(j.hold, me.log, j.holdIds);
        if (me.rev === rev) delete me.dirty;
        // The full replay over every answer now logged (v28), plus any answer given while this send was on its way.
        notesSeen(j);
        const adopted = replayAdopt(j.replay, me.log, j.v, cut) | replaysAdopt(j, me.log, cuts);
        // A replay adopted from a save's reply leaves the saved copy at the rules version that save carried, the older one:
        // another device would take it for an older app's copy and ask for the replay again, then leave its own copy the
        // same way, each in turn (mergeSaved; Codex review #399). So the device saves again at once, with the adopted
        // version: that reply brings no replay (tries bounds it all the same; dirty: a failed one waits for the next sync).
        if (adopted) me.dirty = true;
        store.set('reefid-account', me);
        if (adopted && tries < 3) return syncOnce(tries + 1);
      } else if (j && SYNC === me) {
        // A refused code, a removed account, the wrong-code wait: red at once, no retry mends them. Anything else the sheet
        // answered (busy, stale again, lock or server from v50, a failed write) is a passing failure, tried again.
        if (j.error === 'pin' || j.error === 'wait' || j.error === 'gone' || j.error === 'archived') {
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
const syncSoon = () => {
  if (!SYNC_URL || !SYNC) return;
  SYNC.dirty = true;
  SYNC.rev = (SYNC.rev || 0) + 1;
  store.set('reefid-account', SYNC);
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncPush, 3000);
};
// The one-time notices wait for the visit's first sync (Pierre, 2026-11-08: a device still holding an old copy of his
// account showed him again, two or three times over three devices, the cards and toasts he had seen on another: "as long
// as the page is not synchronised, there is no point showing things for the umpteenth time"). For a signed-in player,
// the cards that tell something once (progress.js recalcNotice, mxLostNotice, rvNotice, sorryNotice, subjHello,
// boardNotice) and the achievements check (achCheck, achRecheck: their toasts, given and taken back) wait (noticeLater)
// until the first sync of the visit is over (noticesGo: the pull and merge done, whatever the reply: an error, offline
// or a refused code shows them from this device's state at once), or NOTICE.WAIT at most (a line so slow the reply has
// not come). Then each is decided again on the merged state: the progress and achievements of every device, and the
// notices already told on any of them (TOLD, core.js toldUnion). Not signed in: no wait, as before.
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
// own device marks decide, as before.
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
  if (SYNC.dirty || (SYNC.log || []).some(a => logOk(a, sheetV()))) return syncPush();
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
      // Every subject the sheet replays (the corals, fish: rvKey), each version applied before the merge (Codex review #779).
      const rvNow = () => [SUBJECTS.find(x => x.replay), ...rpSubjects()].filter(Boolean).map(rvApplied),
        rv0 = rvNow();
      groupsSeen(j, me.name); // the beta groups first (v48), as syncOnce
      if (j.found) mergeSaved(j);
      repsSeen(j); // the player's reports (v57), as syncOnce
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
    syncPush();
  }
});
// Players' reports (Pierre, 2026-11-01): in a game, once the answer is out, "⚑ Report a problem" opens a small dialog:
// wrong answer (with a field for the right genus), several corals, bad photo, other, plus an optional note. A report
// carries the photos shown, the expected genus and the answer given. It waits in localStorage 'reefid-reports' and goes to
// the sheet's "Reports" tab (Code.gs v7: POST {reports, rname, rpin}; the sync name and code when signed in, else the name
// typed in the dialog). An older script answers without rep: true, so reports stay queued until Pierre redeploys.
// Nothing changes on the site: Pierre reads reports, with who sent them, in the admin Triage.
// Also everywhere else it makes sense (Pierre, 2026-11-01): any enlarged photo (lightbox), the bottom of a genus sheet,
// and "Send feedback" at the bottom of the ? help of every page (app.js helpEnd) and on About (home.js; no page footer
// since 2026-11-03). The reasons offered depend on where the report comes from (k); {things} and {one} take the current
// subject's words (SUBJECTS several and one: "Several corals", "Wrong genus"; "Several fish species", "Wrong family").
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
  if (!SYNC_URL || LOCAL || !L.length || navigator.onLine === false) return;
  // A report keeps the account generation it was written under (ra, sheet v58 acct): a record archived since, its name
  // taken again, never gets it under the new account (Codex review #603).
  const k = x => JSON.stringify([x.rn || '', x.rp || '', x.ra || '']),
    first = L.filter(x => k(x) === k(L[0])).slice(0, 50);
  const reports = first.map(({rn, rp, ra, ...x}) => x);
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
      if (left.length) sendReports();
    })
    .catch(() => {});
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
  // teaching id: the fish beta offered "t01"), each once.
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
    d.close();
    sendReports();
    // The Contributions (Pierre, 2026-11-05, Q65): counted as it is sent, its achievement popping up now (progress.js).
    // progress.js comes with tier 2 (index.html): a report sent from Home or About before it waits for it (app.js need;
    // Codex review #579).
    (typeof achReport === 'function' ? Promise.resolve() : need(2)).then(() => typeof achReport === 'function' && achReport(r));
    btn.textContent = kind === 'page' ? 'Thank you' : '⚑ Reported, thank you';
    btn.disabled = true;
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
// Anonymous answers (Pierre, 2026-11-01): a player who never signs in still helps rate the photos and the confusions.
// Their answers go to the sheet under a random id made on this device ("~anon <id>": no name, no code), about
// ANON_SEND.MS after each answer, as a signed-in player's go with their progress (syncSoon; Pierre, 2026-11-08: "Les
// deux", so the admin's live Activity sees them play; until then 10 at a time), at most 100 a request (sheet script
// v12; an older script answers 'input' and they simply wait here). Signing in later moves them to
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
// Catch-up (Pierre, 2026-11-03: RAs who played without a name were missing from the sheet). Once per ANON_RESEND.ID,
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
// sheet's caps (Code.gs anon_: 100 a request, 600 per device and 6000 for every device not signed in, every 6 hours)
// are as before: a refused or failed send keeps its answers here for the next answer, the next visit, the app hidden
// or closed, or back online.
const ANON_SEND = {MS: 3000};
const anonSoon = () => {
  clearTimeout(anonTimer);
  anonTimer = setTimeout(sendAnon, ANON_SEND.MS);
};
function sendAnon() {
  // The answers the sheet can file (core.js logOk: a subject it does not replay waits for LOG_SHEET, rule D4), queued.
  const q = store.get(ANONQ, []).filter(a => logOk(a, sheetV()));
  if (SYNC || !SYNC_URL || LOCAL || anonBusy || !q.length) return;
  const batch = q.slice(0, 100),
    cut = store.get('reefid-sync-coral-reset', '') || '', // the replay's cutoff, as sent (replayAdopt)
    sk = startKey(replaySubject()), // the replayed subject's first-launch answer (the replay's)
    who = anonId(); // the anonymous player the send is for
  anonBusy = true;
  fetch(SYNC_URL, {
    method: 'POST',
    keepalive: true,
    // pt: the oldest answer of the whole queue (pendingFrom), as answers left in it after a lost reply may be logged already.
    // reset: this device's progress reset (app.js), the replay's cutoff, as a signed-in player's saved data gives it (v28).
    // start: the first-launch answer (model.js startSet), whose prior the replay applies, as a signed-in player's saved data
    // gives it (v29); an older script ignores it.
    body: JSON.stringify({
      anon: who,
      anonAnswers: batch,
      av: appVer(),
      rv: rvApplied(),
      ...(pendingFrom(q) === null ? {} : {pt: pendingFrom(q)}),
      ...(cut ? {reset: cut} : {}),
      ...(store.get(sk, null) ? {start: store.get(sk, null)} : {}),
      ...devField() // the device of its answers (sheet DEV_SHEET)
    })
  })
    .then(r => r.json())
    .then(j => {
      sheetSeen(j);
      // A refused send is reported like a failed save (it used to fail silently; Pierre, 2026-11-03), then retried at the
      // next answer, the next visit or when the app is left.
      if (!j || !j.log) return ev('sync', {msg: 'anonymous send refused: ' + String((j && j.error) || 'no reply')});
      // Signed in (or signed out, a new anonymous id) while the send was on its way: the queue and the progress are no
      // longer this anonymous player's, so neither is touched, as the signed-in replies check SYNC (Codex review #399:
      // the reply came after signIn had stored an account's 20 answers, before its reload, and its replay made them 1).
      if (SYNC || store.get(ANONID, '') !== who) return;
      const done = new Set(batch.map(x => x.id)),
        left = store.get(ANONQ, []).filter(x => !done.has(x.id));
      store.set(ANONQ, left);
      // A device that never signed in gets its full replay too (sheet v28), its answers still queued on top.
      replayAdopt(j.replay, left, j.v, cut);
      // More than one batch waiting (played offline): the next one follows; a refused batch ('busy') is not retried here.
      if (left.some(a => logOk(a, sheetV()))) setTimeout(sendAnon, 1000);
    })
    .catch(e => navigator.onLine !== false && ev('sync', {msg: 'anonymous send failed: ' + String((e && e.message) || e)}))
    .finally(() => {
      anonBusy = false;
    });
}
// Events (Pierre, 2026-11-02: most RAs will not report problems, so the app reports what it can by itself; sheet v19
// events_): app errors, photos that still fail after their retries, saves that fail while online, and the answers to the
// occasional one-tap question (pulse). Anonymous: a random device id of its own (EVID, never a name or the answers' id),
// the app version and a short browser name; the pages summaries (pagesSend, sheet v30) are tied to the player's
// answers, under the admin's id of the player, and their rows carry this device id too, as (Q312) every answer this
// device sends does (devField, the Answers tab's Device), so the admin can join a device's events to a player
// (privacy.html "Technical reports" says so). Queued here (EVQ, at most 50) and sent in small batches; never from a local
// copy (LOCAL) nor without the sync URL. At most EV_MAX reports a visit, the same message once.
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
// The device on every answer (Pierre, 2026-11-08, Q312): a save and an anonymous send carry this device's id (dev, the
// Device of its events), which the sheet writes in each answer's Device column, signed in or not; only once the
// script's replies say v >= DEV_SHEET (rule D4: an older script would drop it), else nothing more is sent, as before.
// The answers a request sends are all this device's own (its queue), so one id per request.
const DEV_SHEET = 109;
const devOn = () => sheetV() >= DEV_SHEET;
const devField = () => (devOn() ? {dev: devId()} : {});
// The app's version as the sheet and the admin's Errors page see it: the deploy's build number, then app.js's content
// hash (tools/stamp_versions.py: "<build>-<hash>", higher is newer); a copy never deployed has no build, only its ?v.
const appVer = () => {
  const v = ((document.querySelector('link[href*="app.js?v="]') || {}).href || '').replace(/^.*\?v=/, ''),
    b = document.querySelector('meta[name="build"]');
  return b ? `${b.content}-${v}` : v;
};
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
// someone else; Codex review #423). Returns the batch (at most 50) and who it belongs to.
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
// App errors: script errors and promise rejections, with where they happened. Not the photo and stylesheet load errors
// (those are elements, handled where they retry).
// Only errors thrown by the app's own script files (Pierre, 2026-11-02: the Events tab filled with noise): scripts a
// browser or an extension injects into the page (iOS Firefox's __firefox__, crypto wallets' window.ethereum) are reported
// against the page itself or no file, and cross-origin ones as "Script error."; "ResizeObserver loop…" is a harmless
// browser warning.
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
// Pages opened in a visit (sheet v30 'pages'; Pierre, 2026-11-03: does anyone open the genus sheets, do beginners use
// them more, do sheet readers progress faster?). First-party, no outside service: the tally of core.js PAGES (pages and
// genus sheets opened, times, seconds in view, how a sheet was reached, whether its genus had been asked already) and the
// answers so far (na), queued as one event when the app is left (hidden) and started again if the player comes back
// (same visit id vi). Under the id of the player's answers, never the name: the request carries this device's anonymous
// answer id (ANONID) or, signed in, the name and code, which the sheet checks and turns into the admin's id of the
// player (Code.gs evWho_), keeping neither. Queued only once the sheet has said v >= PAGES.SHEET (rule D4), and,
// like every event, never sent from a local copy (LOCAL).
const SHEETV = 'reefid-sheet-v',
  PVLINK = 'reefid-pv-link',
  PV = pagesNew(),
  PVI = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
let pvLast = null,
  pvPre = null;
// The script version of a reply (every reply carries v), remembered for the next visits.
// The beta groups the sheet says this player is in (sheet v48: groups in a load or save reply, [] for none; an older
// script sends none and nothing changes, so a subject in beta stays the admin's only: rule D4). Kept under the
// account's name (app.js GROUPS_KEY, subjOpen). A change shows at once: the switches follow (showSubj, the page drawn
// again), and a subject on screen that this player may no longer have reloads the app on the corals (subjAt), their
// saved choice and its progress kept. live: false when the app reloads anyway (signIn).
function groupsSeen(j, name, live = true) {
  if (!j || !Array.isArray(j.groups) || !name) return;
  const before = subjGroups().join(),
    g = j.groups.filter(x => typeof x === 'string' && SUBJECTS.some(S => subjGroup(S) && S.id === x));
  store.set(GROUPS_KEY, {n: name, g});
  if (!live || subjGroups().join() === before) return;
  if (!subjOpen(SUBJ)) return location.reload();
  showSubj();
  // Home draws its subject row in viewHome (showSubj only updates existing buttons): redraw Home too (Codex review #540).
  if (!SUBJ_VISIT && ['lab', ''].includes(hashNow())) route();
}
// The ids of this player's own reports (sheet v57: reps in a load reply), for "Your feedback helped" (progress.js
// achReps, achHelped; Q66). Only from a script that has it (rule D4): an older one sends none, and the app still
// thanks the reports it kept itself.
// Every load reply calls it, after merging the saved copy: a signed-in player is thanked only from then on (repsPulled,
// progress.js achHelped), so a thanks already given on another device, which comes with that copy, is never given again
// here (Codex review #581).
const HELP_SHEET = 57;
let repsPulled = false;
function repsSeen(j) {
  repsPulled = true;
  if (j && Number(j.v) >= HELP_SHEET && Array.isArray(j.reps) && typeof achReps === 'function') return achReps(j.reps);
  if (typeof achHelped === 'function') achHelped();
}
// Lines the sheet serves for the cards (sheet v87: notes, from its Notes tab, keys card.*; Code.gs notes_): Pierre's text
// that must never be written in the repo, e.g. the PS of rules version 9's apology, which may name a player (core.js
// RV_SORRY ps; progress.js rvNotice). Kept on the device; an older script sends none and the card has no PS.
const NOTES_KEY = 'reefid-sheet-notes';
function sheetSeen(j) {
  if (j && Number(j.v) > 0 && Number(j.v) !== Number(store.get(SHEETV, 0))) store.set(SHEETV, Number(j.v));
  notesSeen(j);
}
// Kept before a replay is adopted (mergeSavedIn, the save reply): the card it brings shows its PS at once.
function notesSeen(j) {
  if (j && j.notes && typeof j.notes === 'object' && !Array.isArray(j.notes)) store.set(NOTES_KEY, j.notes);
}
// The script version last seen (0 before any reply): what the app may rely on (rule D4), so a visit offline does
// what the last one did. Also read by the answer time (model.js rtOn, core.js RT_SHEET); the full replay checks each
// reply's own v (replayAdopt).
const sheetV = () => Number(store.get(SHEETV, 0)) || 0;
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
// of one and opens the page of the other (Codex review #466).
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
      localStorage.removeItem(PVLINK);
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
function pagesSend() {
  const S = pagesTake(PV, Date.now());
  if (!S || !(Number(store.get(SHEETV, 0)) >= PAGES.SHEET)) return;
  ev('pages', {vi: PVI, ...(typeof answersSoFar === 'function' ? {na: answersSoFar()} : {}), ...S, o: pvOwner()});
}
// The player active now, as a summary's owner (core.js pagesOwner): no anonymous id is made for a signed-in player.
const pvOwner = () => (SYNC && SYNC.name && SYNC.pin ? pagesOwner(SYNC) : pagesOwner(null, anonId()));
// Who the pages summaries of a batch belong to: the name and code when signed in (checked by the sheet, never kept),
// else this device's anonymous answer id. Nothing for a batch without one. A batch holds only the summaries of the
// player active now (evBatch).
// With the account generation (sheet v58): a record archived since, its name taken again, never gets them (Codex review #603).
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
// Signing in. A new name keeps what this device holds and sends it. A known account (found), once the player has
// answered "Is it you?" (bindSync, 2026-11-03), is merged with what was played here before signing in: the sheet's settings and quiz state win, the progress of both adds up (mergeProgress
// with an empty base), then the page reloads and the start-up sync sends the merged progress. Either way the answers
// played before signing in join the log for the sheet's Answers tab. Before 2026-11-01 a known account replaced the
// device's progress, so a beta tester who played first and signed in later lost it.
function signIn(name, pin, j) {
  SYNC = {name, pin, dirty: true, log: store.get(LOG0, []), ...(store.get(ANONID, '') ? {anon: store.get(ANONID, '')} : {})};
  groupsSeen(j, name, false); // the account's beta groups (v48), before the reload below opens the app with them
  // The pages summaries queued while signed out become the account's, as the answers do (core.js pagesOwn).
  if (SYNC.anon) store.set(EVQ, pagesOwn(store.get(EVQ, []), pagesOwner(null, SYNC.anon), pagesOwner(SYNC)));
  try {
    [LOG0, ANONQ, ANONID].forEach(k => localStorage.removeItem(k));
  } catch (e) {}
  if (!j.found) {
    try {
      localStorage.removeItem(ANONB);
    } catch (e) {}
    return store.set('reefid-account', SYNC);
  }
  // Each subject on its own (core.js SUBJECTS). The subject the sheet replays (SUBJECTS replay: the corals): only what was
  // played while signed out counts, the delta from ANONB (the progress before its first anonymous answer) added to the
  // sheet's; progress left by a sign-out made before sign-out cleared the device (2026-11-01) is in ANONB, so it is
  // neither counted twice nor credited to another account. Another subject (fish, which came after sign-out cleared the
  // device): everything on this device was played signed out, so it all adds up.
  // anon: answers of the replayed subject played here signed out (its own: a fish answer in LOG0 is not one).
  const anon = subjEntries(SYNC.log).length > 0,
    M = {};
  let mine = false;
  SUBJECTS.forEach((S, i) => {
    const pk = subjKey(S.id, 'progress'),
      here = renameUnits(S, store.get(pk, {}) || {});
    let R = {};
    try {
      R = renameUnits(S, JSON.parse(j.data[pk] || '{}') || {}); // old unit ids under the new ones (core.js SUBJECTS renamed)
    } catch (e) {}
    // The account's copy is this subject's merge baseline, played here or not (Codex review #442: a subject never played
    // on this device took the account's progress through loadData with no baseline, and the next sync added it again).
    SYNC[S.base[0]] = R;
    // A subject never played on this device (not the first, the corals) takes the account's as it is (loadData below).
    if (i && !Object.keys(here).length) return;
    if (!S.replay && Object.keys(here).length) mine = true;
    M[pk] = S.replay ? (anon ? mergeProgress(store.get(ANONB, {}) || {}, here, R) : R) : mergeProgress({}, here, R);
  });
  try {
    localStorage.removeItem(ANONB);
  } catch (e) {}
  // The account's settings replace this device's, except the achievements: earned here before signing in, they join the
  // account's (code review #324).
  const ach = store.get(ACHK, null),
    // Each subject's first-launch record made here before signing in joins the account's (core.js startUnion, Codex
    // review #428): the account's earlier answers and this device's newer one both stay in the history.
    st = SUBJECTS.map(S => [startKey(S.id), store.get(startKey(S.id), null)]),
    // Each subject's surprise cards met here before signing in join the account's (core.js winkUnion, Codex review #652):
    // once per player, never shown again because the account's record lacked them.
    wk = SUBJECTS.map(S => [subjKey(S.id, 'wink'), store.get(subjKey(S.id, 'wink'), null)]);
  // The rules version applied (RVK) is the account's, 0 when its data has none: this device's (an anonymous replay adopted
  // here) would tell the sheet that the account's log was replayed, and its replay would never come (Codex review #399).
  try {
    [RVK, ...rpSubjects().map(rvKey)].forEach(k => localStorage.removeItem(k));
  } catch (e) {}
  loadData(Object.fromEntries(Object.entries(j.data || {}).filter(([k]) => !(k in M))));
  // Answers played here without an account (queued in the log, or already sent under the anonymous id, moved to the name
  // by the first save: SYNC.anon) join the account's: the account's rules version is not this merged progress's, whose
  // replay never had them (Codex review #399: 20 right answers played before the account's 10 misses kept pg 0.9 and ten
  // right answers last, for 0.19 and ten misses in time order). Left unapplied, so the first save, which brings them into
  // the account's log, gets the replay of the whole of it (replayAdopt adopts nothing before: SYNC.anon).
  if (anon || SYNC.anon)
    try {
      localStorage.removeItem(RVK);
    } catch (e) {}
  // Another subject replayed (fish): its answers played here signed out join the account's log with the first save, so
  // the replay of the whole of it is asked for then (every answer of that subject in it once).
  rpSubjects().forEach(S => {
    if (subjEntries(SYNC.log, S.id).length || SYNC.anon)
      try {
        localStorage.removeItem(rvKey(S));
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
// One sign-in card, once, after NUDGE_AT answers played without an account (Pierre, 2026-11-01: beta testers must sign in
// early so their progress reaches the sheet; 20 since 2026-11-02, was 10, "fewer, better pop-ups": nothing is lost by
// waiting, the answers played before signing in (LOG0) join the account at sign-in). Spaced from the other prompts
// (quiz.js promptOk). Never in Pierre's admin browser. "Later" closes it for good.
// The account is the app's, not a subject's (Pierre, 2026-11-04: "it's the app we want people to sign in to, not the
// game mode"): the answers count in every subject (answersAll), so a fish-only player meets it too (it counted LOG0,
// the answers queued for the sheet, which holds no fish answers).
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
// once = the one-time card (marks it used); play = once signed in, its button opens the photo quiz (skipped tour).
// The header's Sign in button opens it with neither: it closes with "Close" or "Done".
// The card (app.js cardShow) holds the account box (bindSync), which draws its own title and redraws itself as the player
// signs in; its one button reads Later / Close, then Done or Start playing once signed in. Escape, Enter outside the form
// and a tap outside close it; the focus goes back to the question's Next when there is one.
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
// Signing out clears this device's progress (it is in the sheet): the next player starts empty, and progress left here is
// always the anonymous play of whoever signs in next, which signIn merges into their account. Moved out of bindSync
// (2026-11-05) so that deleting one's own account (viewDeleteAccount) clears the device the same way. Call it once the
// quiz tier is in (need(2): INTRO, ACHK). all (a self-deletion): every report this account queued and the name typed
// for reports go too.
function signOutClear(all) {
  const me = SYNC;
  SYNC = null;
  // v58 (the deleted-accounts audit, G7): the reports queued under an account the sheet removed or archived (not merged:
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
      localStorage.removeItem('reefid-report-name');
    } catch (e) {}
  // The pages summaries still queued are the account's: dropped, never sent under the next player (Codex review #423).
  store.set(
    EVQ,
    store.get(EVQ, []).filter(x => !(x && x.k === 'pages'))
  );
  // Achievements and the leaderboard choice belong to the account too: never left to the next player of a shared device.
  // The first-meeting cards too (Codex review #350): the next player meets their own genera.
  [
    'reefid-account',
    GROUPS_KEY, // the beta groups are this account's (app.js subjOpen)
    // Every subject's progress, settings, cards, opening hold and comeback (model.js COMEBACK.KEY: the visit floor and
    // the comeback belong to this player, Codex review #374).
    ...SUBJECTS.flatMap(S => [
      // the first-launch question's answer is the player's too (model.js startSet)
      // and the surprise cards it has met (quiz.js WINKK; Codex review #652: the next player would inherit them)
      // rv: the rules version its progress was replayed with (replayAdoptS; the corals' is RVK)
      ...['progress', 'quiz', 'reset', 'intro', 'intro-offer', 'rv', 'start', 'wink'].map(k => subjKey(S.id, k)),
      ...['hold', 'comeback'].map(k => subjDev(S.id, k))
    ]),
    BASICS_KEY, // and their Coral basics (app.js; Codex review #428: done there hid the next beginner's offers)
    ACHK,
    'reefid-ach-new',
    'reefid-ach-old', // progress.js ACHOLD: this player's achievements waiting for a subject's data to be recounted
    CUSTOM.KEY, // model.js: the custom quiz's selection is the player's too
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
        localStorage.removeItem(k);
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
      ? `<p><b>${bad}</b></p><p class="note">${SYNC.err === 'archived' ? '' : SYNC.err === 'gone' ? (SYNC.into ? `Your trainer merged this name into <b>${esc(SYNC.into)}</b> (the same person). Your answers now count there: sign out, then sign in as ${esc(SYNC.into)} with that name's code.` : 'Your trainer removed this account. Sign out, then sign in again to start a new one.') : SYNC.err === 'pin' ? 'The code was refused for this name. Sign out and sign in again with the right code.' : SYNC.err === 'wait' ? 'Someone typed wrong codes for this name several times, so saving waits 10 minutes. Your answers are kept on this device.' : 'Your answers are kept on this device and sent as soon as possible.'}${when ? `${SYNC.err === 'archived' ? '' : ' '}Last saved ${when}.` : ''}</p>
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
      // sign-out waits for it rather than failing half-way, signed out in memory but not on the device (Codex review #361).
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
  // Two players of one first name (Pierre, 2026-11-03): the name is the account key, so the form asks from the start for
  // the first name and the surname's initial, and a name taken with another code says so in plain words. A nickname or
  // alias is just as welcome (Pierre, 2026-11-04: the point is no two players with one name), said in the label itself.
  const tail = name => (/\s/.test(name) ? 'add more of your surname' : `add your surname's initial (${name} B.)`);
  const form = (name = '', pin = '', hint = '') => {
    box.innerHTML = `<h3>Sign in to save your progress</h3><p>Training at IMR? Sign in with your name and a 4-digit code: your progress is saved for your trainer and comes back on any device. Learning on your own? Sign in too, to keep your progress on all your devices.</p>
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
      const name = f.n.value.trim(),
        pin = f.p.value.trim();
      msg('Connecting…');
      syncGet({name, pin})
        .then(j => {
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
  // The achievements' record (progress.js) must be in before an account is merged (Codex review #361: a sign-in from the
  // tour on a slow first visit came before it).
  const enter = (name, pin, j) =>
    (typeof need === 'function' ? need(2) : Promise.resolve()).then(() => {
      signIn(name, pin, j);
      if (!j.found) syncPush().then(() => bindSync());
    });
  // An existing account (found): "Is it you?" first, on every device (Pierre, 2026-11-03: two players of one first name
  // with the same simple code would otherwise share one account, the second one's answers merged into the first one's).
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

// Deleting one's own account (Pierre, 2026-11-05: "a player can delete their own account and all their data themselves,
// from a discreet page"): #about/delete-account, linked from About › Privacy and the privacy notice, never from a menu. Signed
// in: what is deleted in plain words, the account's code, then a second step that asks again; the sheet (v58 selfDelete,
// Code.gs selfDelete_) checks the code and deletes everything ("delete everything": answers, reports, progress, page
// summaries; the Removed tombstone only), then this device is signed out and cleared (signOutClear with all) and shows
// #about/delete-account/done. Signed out: how to delete an account. Before sheet v58 (rule D4): a note, no form.
const SELFDEL_SHEET = 58;
const selfDelOn = () => sheetV() >= SELFDEL_SHEET;
function viewDeleteAccount(h) {
  const box = body => `<h2 class="vh">Delete my account</h2><div class="about delacct">${body}</div>`,
    what = `<section><h3>What is deleted</h3><p>Deleting your account permanently deletes your data:</p><ul>
      <li>your name and your saved progress and settings;</li>
      <li>every answer you gave in the games;</li>
      <li>your problem reports and feedback;</li>
      <li>the summaries of the pages you opened.</li></ul>
      <p>Your name also leaves the app's technical logs and the statistics reports. Only your name and your scrambled code stay, in a list of removed accounts, so that another device still signed in is told the account was deleted. This device is then signed out and cleared. This cannot be undone.</p>
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
  if (!selfDelOn()) {
    $v.innerHTML = box(
      what +
        `<section><p>Deleting your account from here is not available yet: come back in a few minutes, or ask Pierre Pericard.</p></section>`
    );
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
