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
function loadStats() {
  if (!SYNC_URL || !DATA) return;
  statsAt = Date.now();
  fetch(SYNC_URL + '?stats=1&av=' + appVer())
    .then(r => r.json())
    .then(j => {
      sheetSeen(j);
      if (j && j.ok && j.photos) {
        PSTAT = j.photos;
        GDIFF = {}; // genus difficulties follow the new photo stats and confusions
        PCONF = j.conf || {};
        PMEM = memOf(j.mem); // photo memory offsets (sheet v26); the prior from an older sheet
        PGD = gdOf(j); // genus offsets of the photo Elo (sheet v31, model.js photoDiff); none from an older sheet
        store.set('reefid-photo-stats', {
          t: Date.now(),
          v: j.v,
          photos: j.photos,
          conf: PCONF,
          ...(j.mem ? {mem: j.mem} : {}),
          ...(j.gd ? {gd: j.gd} : {})
        });
      }
    })
    .catch(() => {});
}
// The slate genera (Millepora included since 2026-11-02): the sheet's "By genus" columns and the leaderboard % follow them.
// The leaderboard's subject (core.js SUBJECTS board: corals), whatever the subject on screen.
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
    board: boardOn() ? 1 : 0
  };
}
// The saved data comes with the key names of the app that saved it (core.js keysIn: an app from before the rename to
// IMR Reef ID, 2026-11-03, saves the old ones): read with the new names only.
// rv: the rules version this device's progress was last replayed with (replayAdopt): the sheet (v28) answers with the
// full replay of the player's log when it is older than its own. pt: the time of the oldest answer still queued here
// (pendingFrom), so the replay's ids cover every queued answer the sheet already logged.
const syncGet = (a = SYNC) =>
  sheetFetch(
    `${SYNC_URL}?name=${encodeURIComponent(a.name)}&pin=${encodeURIComponent(a.pin)}&av=${appVer()}&rv=${rvAsk()}${ptParam(a.log)}`
  )
    .then(r => r.json())
    .then(j => {
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
// pgOf) stay as the fallback for a device that never reaches the sheet. The app never gets ahead of the sheet script
// (AGENTS.md 7a): v, the script version of the reply; a reply from a script before core.js RV_SHEET (28) is never
// adopted, whatever it carries, so the app does exactly what it did before (an older script sends no replay, and the
// rv field the requests carry is ignored there).
const RVK = 'reefid-sync-coral-rv';
const rvApplied = () => Number(store.get(RVK, 0)) || 0;
// The rules version a request says: the one applied here, or 0 while this device holds answers the sheet logged from a
// refused save (SYNC.lg, syncOnce): its merge baseline lacks them, so a saved copy another device built from the log
// (a replay) may already count them, and only the replay of the log tells (mergeSaved; Codex review #399).
const rvAsk = () => (SYNC && SYNC.lg ? 0 : rvApplied());
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
// The sheet's opening hold (v23, model.js holdSync) counts the logged answers, the corals': taken as that subject
// whatever the subject on screen (inSubject), so it never lands in another subject's hold.
function holdAdopt(h, log, ids) {
  const LS = SUBJECTS.find(x => x.log);
  if (LS && LS !== SUBJ) return inSubject(LS.id, () => holdAdopt(h, log, ids));
  if (typeof holdSync === 'function') holdSync(h, log, ids);
}
// The replay is the progress of the subject whose answers the sheet logs (core.js SUBJECTS log: the corals): adopted as
// that subject whatever the subject on screen (inSubject; the fish progress is never replayed, its answers are not logged).
function replayAdopt(rp, pending, v, cut, pre) {
  sheetSeen({v});
  const LS = SUBJECTS.find(x => x.log);
  if (LS && LS !== SUBJ) return inSubject(LS.id, () => replayAdopt(rp, pending, v, cut));
  if (!(Number(v) >= RV_SHEET)) return false;
  if (!rp || typeof rp.rv !== 'number' || !rp.rec || typeof rp.rec !== 'object') return false;
  // A newer version, or the same one asked again for answers logged from a refused save (rvAsk).
  if (rp.rv < rvApplied() || (rp.rv === rvApplied() && !(SYNC && SYNC.lg))) return false;
  if (typeof mxRecalc !== 'function') return false; // the quiz tier (model.js) not in yet: the next reply brings it again
  if (cut !== undefined && cut !== (store.get('reefid-sync-coral-reset', '') || '')) return false;
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
    const from = rvApplied(),
      played = answersSoFar() > 0 || Object.values(P).some(s => s && typeof s === 'object' && (s.ok || 0) + (s.ko || 0) > 0),
      had = new Set((rp.ids || []).map(String)),
      reset = store.get('reefid-sync-coral-reset', '') || '',
      me = '~me',
      rows = (pending || []).filter(a => a && a.g && !had.has(String(a.id)) && String(a.t || '') > reset).map(a => logRow(a, me)),
      last = Number((rp.rec[LEVEL] || {}).at) || 0,
      gen = {...((DATA && DATA.x && DATA.x.gen) || {}), ...((DATA && DATA.gen) || {})},
      // This device's answers on top, under the rules of the script that sent the replay: the answer time only from
      // core.js RT_SHEET, as the live game (model.js rtOn; AGENTS.md 7a, Codex review #444).
      R = rows.length
        ? replayProgress(rows, {
            gen,
            mem: PMEM,
            conf: PCONF,
            start: {[me]: {P: rp.rec, n: 0, used: 0, rep: 0}},
            time: Number(v) >= RT_SHEET,
            // The first-launch answer (core.js startPriorAt), from the script that replays it (START_SHEET), as the live game.
            starts: Number(v) >= START_SHEET ? {[me]: store.get(startKey(SUBJ.id), null)} : {}
          })[me].P
        : rp.rec,
      before = copy(P),
      M = replayedOf({P: R}, P, rp.rv);
    // Answers of this device's queue older than the replay's last one (an offline device, another one logging since):
    // on top of the replay they would count after newer answers, out of time order (Codex review #399: 20 right answers
    // played offline before 10 misses logged elsewhere gave pg 0.96 and ten right answers last, for 0.19 and ten
    // misses in time order). Not adopted, nor the version marked applied: the save that follows logs them, and its
    // reply brings the replay of the whole log in time order.
    if (rows.some(r => r[1] < last)) return false;
    // A mark the replay took away: the former model's (a record learned without s.pg), or a rule of the new version.
    mxRecalc(
      () => {
        Object.keys(P).forEach(g => delete P[g]);
        Object.assign(P, M);
      },
      n => (typeof (before[n] || {}).pg === 'number' ? 'rules' : 'bkt')
    );
    store.set(RVK, rp.rv);
    // The merge baseline (mergeSaved) becomes the shared history: the sheet's replay itself, never mixed with this
    // device's answers the sheet has not counted yet, which stay this device's own (P minus the base) and go on top at
    // the next merge (core.js replayBase). Left at the saved copy, another device saving its own adoption of the same log
    // made this one count the replayed answers twice (Codex review #399: 2 became 4); built from this device's copy, an
    // unsent answer went into the base and was lost at the next merge (Codex review #399: 3 became 2).
    if (SYNC) {
      SYNC.base = replayBase(rp.rec, M, rp.rv, SYNC.base);
      delete SYNC.lg; // the replay counts every logged answer
      store.set('reefid-account', SYNC);
    }
    save();
    // The progress % before and after, for a card shown only to the players whose % moved (core.js RVS msg.only). pre:
    // the % this device showed before the sync that brought the replay (mergeSaved), as the pull may already have merged
    // a copy another device saved after its own adoption (Codex review #399: 83% to 33%, compared as 33 to 33).
    const L = typeof slateGenera === 'function' ? slateGenera() : [];
    if (played && typeof rvNoticeAdd === 'function')
      rvNoticeAdd(from, rp.rv, [typeof pre === 'number' ? pre : pctOf(before, L), pctOf(P, L)]);
    if (!SUBJ_VISIT && /^#(progress|quiz-board)$/.test(location.hash)) route(); // not while visiting: the page shows another subject
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
  const pre = typeof slateGenera === 'function' ? pctOf(P, slateGenera()) : undefined;
  const introIn = () => introMerge(d[INTRO.KEY], d[INTRO.OFFER.KEY]); // first-meeting cards seen on another device
  let R = {};
  try {
    R = JSON.parse(d[sKey('progress')] || '{}') || {};
  } catch (e) {}
  const rr = JSON.parse(d[sKey('reset')] || '""'),
    lr = store.get(sKey('reset'), '');
  // A send whose reply was lost but which did reach the sheet: the saved record is exactly what was sent.
  if (SYNC[PK] && d[sKey('progress')] === SYNC[PK]) SYNC[BK] = R;
  delete SYNC[PK];
  // A reset made here that the sheet's copy does not have yet: this device's progress stays (the sheet's hold too counts
  // from its older reset), and, for a subject the sheet replays (its answers logged, SUBJECTS log), the replay since the
  // reset is asked for with the save that brings it (the rules version back to 0): other devices, an older app among
  // them, may have answered after the reset time from a copy without it, and those answers count (they are in the log
  // after the reset).
  if (lr > rr) return void (S.log && store.set(RVK, 0));
  // The Bonus genera choice (fish: circles 2 and 3) made on another device, if more recent than this one's (or made there
  // only; Codex review #371); after the reset check, so a choice saved before this device's newer reset does not come back.
  try {
    const rq = JSON.parse(d[sKey('quiz')] || '{}') || {};
    S.optin.forEach(k => {
      if (typeof rq[k] === 'boolean' && (Q[k] === undefined || (rq[k + 'T'] || 0) > (Q[k + 'T'] || 0))) {
        Q[k] = rq[k];
        Q[k + 'T'] = rq[k + 'T'] || 0;
        saveQ();
      } else if (rr > lr && typeof rq[k] !== 'boolean' && Q[k] !== undefined) {
        // A progress reset made on another device: the offer comes again here too.
        delete Q[k];
        delete Q[k + 'T'];
        saveQ();
      }
    });
  } catch (e) {}
  // The opening hold from every answer the sheet has (v23, model.js holdSync), with this device's unconfirmed ones added:
  // the hold of the subject whose answers the sheet logs, never another's (Codex review #442: the corals' hold landed in
  // the fish one).
  const holdIn = () => S.log && holdAdopt(j.hold, SYNC.log, j.holdIds);
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
    if (S.log && ((SYNC.log || []).some(a => a && String(a.t || '') > rr) || (Number(d[RVK]) || 0) < rvApplied())) store.set(RVK, 0);
    store.set(sKey('progress'), P);
    if (typeof memRecalcAll === 'function') memRecalcAll(); // a record pulled from before the photo memory (model.js)
    if (S.log) replayAdopt(j.replay, SYNC.log, j.v, undefined, pre); // the sheet's full replay, when newer than the one applied here (v28)
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
  // Only a subject the sheet replays (SUBJECTS log: the corals) has a rules version; the others merge as before the replay.
  const rvSaved = S.log ? Number(d[RVK]) || 0 : Infinity;
  // Answers this device had logged from a refused save (SYNC.lg): another device may have saved them already, in its
  // replay of the log, and the merge would add them again as this device's own (Codex review #399: 3 answers, a baseline
  // of 2, a saved replay of the 3: 3 + 3 - 2 = 4, kept for good). The replay of the log, which the load asked for
  // (rvAsk), counts every one once: adopted, it replaces the merge; without it, the merge as usual.
  const recovered = !!(S.log && SYNC.lg && j.replay && replayAdopt(j.replay, SYNC.log, j.v, undefined, pre));
  if (!mine && !recovered) {
    if (rvSaved >= rvApplied()) {
      // In place: other code holds P by name only, but keep the same object anyway.
      const M = mergeProgress(SYNC[BK] || {}, P, R);
      // A copy under newer rules than this device applied (another device adopted their replay): a learned mark that
      // replay took away is not taken here by the merge, which would tell nothing (the mark gone before mxRecalc sees it;
      // Codex review #399). It stays until this device adopts the same replay (replayAdopt, in this very sync when the
      // reply carries it, else at the next), which decides it with this device's own card (the cards are per device).
      if (S.log && rvSaved > rvApplied())
        Object.keys(M).forEach(g => g !== LEVEL && P[g] && P[g].mx && M[g] && !M[g].mx && (M[g].mx = P[g].mx));
      Object.keys(P).forEach(g => delete P[g]);
      Object.assign(P, M);
      // The saved record is now part of P: it becomes the baseline, so a failed send can't count it twice.
      SYNC[BK] = copy(R);
    } else store.set(RVK, rvSaved);
  }
  store.set('reefid-account', SYNC);
  store.set(sKey('progress'), P);
  if (typeof memRecalcAll === 'function') memRecalcAll(); // a record pulled from before the photo memory (model.js)
  if (S.log) replayAdopt(j.replay, SYNC.log, j.v, undefined, pre); // the sheet's full replay, when newer than the one applied here (v28)
  prog();
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
  let rev, sent, log, cut;
  // If the device is disconnected or switched to another account meanwhile, drop this sync.
  // Script v11: a name the admin removed or merged answers 'gone' (with the name it joined): recorded below, no send.
  return syncGet(me)
    .then(j => {
      if (SYNC !== me) return null;
      if (!j.ok) return j;
      if (j.found) mergeSaved(j);
      rev = me.rev;
      // Each subject's progress as sent: its baseline once the sheet confirms (SUBJECTS base).
      const pd0 = progData();
      sent = Object.fromEntries(SUBJECTS.map(S => [S.id, JSON.parse(pd0[subjKey(S.id, 'progress')] || '{}') || {}]));
      cut = store.get('reefid-sync-coral-reset', '') || ''; // the reset this save's data carries, the replay's cutoff (corals: replayAdopt)
      log = me.log || [];
      SUBJECTS.forEach(S => (me[S.base[1]] = pd0[subjKey(S.id, 'progress')] || ''));
      store.set('reefid-account', me);
      const pd = (progData()['reefid-sync-coral-progress'] || '').length;
      if (pd > 40000) console.warn(`Progress is ${pd} characters (sheet script v6 stores any size; v5 stops at 50,000).`);
      return sheetFetch(SYNC_URL, {
        method: 'POST',
        body: JSON.stringify({
          name: me.name,
          pin: me.pin,
          data: withLegacy(progData()), // + the old names, for a device still on an app from before the rename (core.js)
          summary: syncSummary(),
          answers: log,
          av: appVer(), // the app's version (sheet v25: a request without it comes from an app before 2026-11-03)
          rv: rvAsk(), // the rules version applied here (sheet v28: an older one gets the full replay back)
          ...(pendingFrom(log) === null ? {} : {pt: pendingFrom(log)}), // the replay's ids cover every answer sent (pendingFrom)
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
        // Logged, but the progress carrying them not saved: the merge baseline lacks answers the log has (rvAsk).
        if (!j.ok) me.lg = 1;
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
        if (typeof j.rev === 'number') me.srv = j.rev;
        delete me.err;
        if (!j.log && log.length) me.err = 'net';
        if (me.anon) delete me.anon;
        if (j.log) {
          const done = new Set(log.map(x => x.id));
          me.log = (me.log || []).filter(x => !done.has(x.id));
        }
        // The sheet's hold over every answer now logged, in time order (v23; Codex review #370), plus any answer given
        // while this send was on its way.
        holdAdopt(j.hold, me.log, j.holdIds);
        if (me.rev === rev) delete me.dirty;
        // The full replay over every answer now logged (v28), plus any answer given while this send was on its way.
        const adopted = replayAdopt(j.replay, me.log, j.v, cut);
        // A replay adopted from a save's reply leaves the saved copy at the rules version that save carried, the older one:
        // another device would take it for an older app's copy and ask for the replay again, then leave its own copy the
        // same way, each in turn (mergeSaved; Codex review #399). So the device saves again at once, with the adopted
        // version: that reply brings no replay (tries bounds it all the same; dirty: a failed one waits for the next sync).
        if (adopted) me.dirty = true;
        store.set('reefid-account', me);
        if (adopted && tries < 3) return syncOnce(tries + 1);
      } else if (j && SYNC === me) {
        me.err = j.error === 'pin' || j.error === 'wait' || j.error === 'gone' ? j.error : 'net';
        if (me.err === 'net' && j.error !== 'stale' && j.error !== 'busy')
          ev('sync', {msg: 'save refused: ' + String(j.error || 'no reply')});
        if (j.error === 'gone') me.into = j.into || '';
        store.set('reefid-account', me);
      }
      return j;
    })
    .catch(x => {
      if (x && 'retried' in x) return x.retried;
      if (SYNC === me) {
        if (navigator.onLine !== false) ev('sync', {msg: 'save failed: ' + String((x && x.message) || x).slice(0, 120)});
        me.err = 'net';
        store.set('reefid-account', me);
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
  store.set('reefid-account', SYNC);
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
          store.set('reefid-account', me);
        }
        return j;
      }
      const rv0 = rvApplied();
      if (j.found) mergeSaved(j);
      if (rvApplied() < rv0) syncSoon(); // a saved copy under older rules (mergeSaved): the save brings the replay again
      delete me.err;
      me.last = new Date().toISOString();
      store.set('reefid-account', me);
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
// carries the photos shown, the expected genus and the answer given. It waits in localStorage 'reefid-reports' and goes to
// the sheet's "Reports" tab (Code.gs v7: POST {reports, rname, rpin}; the sync name and code when signed in, else the name
// typed in the dialog). An older script answers without rep: true, so reports stay queued until Pierre redeploys.
// Nothing changes on the site: Pierre reads reports, with who sent them, in the admin Triage.
// Also everywhere else it makes sense (Pierre, 2026-11-01): any enlarged photo (lightbox), the bottom of a genus sheet,
// and "Send feedback" at the bottom of the ? help of every page (app.js helpEnd) and on About (home.js; no page footer
// since 2026-11-03). The reasons offered depend on where the report comes from (k).
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
  const L = store.get('reefid-reports', []);
  if (!SYNC_URL || LOCAL || !L.length || navigator.onLine === false) return;
  const k = x => JSON.stringify([x.rn || '', x.rp || '']),
    first = L.filter(x => k(x) === k(L[0])).slice(0, 50);
  const reports = first.map(({rn, rp, ...x}) => x);
  fetch(SYNC_URL, {method: 'POST', body: JSON.stringify({rname: first[0].rn || '', rpin: first[0].rp || '', reports})})
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
  const names = [...slateGenera(), ...bonusList()].sort(),
    kind = c.k || 'game',
    where = hashNow() || 'home';
  d.innerHTML = `<form method="dialog">
    <h3>${kind === 'page' ? 'Send feedback' : 'Report a problem'}</h3>
    <div class="repwhy" role="radiogroup" aria-label="Problem">${REP_WHY[kind].map(([k, t], i) => `<label><input type="radio" name="why" value="${k}"${i ? '' : ' checked'}><span>${t}</span></label>`).join('')}</div>
    <label class="repf" data-for="wrong">Right genus, if you know<input name="fix" list="repgen" autocomplete="off" maxlength="60" placeholder="e.g. ${esc(names.find(n => n !== c.g) || '')}"></label>
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
    const who = SYNC ? {rn: SYNC.name, rp: SYNC.pin} : {rn: f.who.value.trim()};
    store.set(
      'reefid-reports',
      [
        ...store.get('reefid-reports', []),
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
// Answers played before signing in (LOG0) and the one-time sign-in card (NUDGE, once used): outside the reefid-sync-* keys, so they
// never travel in the progress data sent to the sheet.
const LOG0 = 'reefid-log0',
  NUDGE = 'reefid-nudge',
  ANONB = 'reefid-anon-base',
  ANONID = 'reefid-anon-id',
  ANONQ = 'reefid-anonq';
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
const anonSoon = () => {
  clearTimeout(anonTimer);
  anonTimer = setTimeout(sendAnon, store.get(ANONQ, []).length >= 10 ? 0 : 20000);
};
function sendAnon() {
  const q = store.get(ANONQ, []);
  if (SYNC || !SYNC_URL || LOCAL || anonBusy || !q.length) return;
  const batch = q.slice(0, 100),
    cut = store.get('reefid-sync-coral-reset', '') || '', // the replay's cutoff, as sent (replayAdopt)
    sk = startKey((SUBJECTS.find(x => x.log) || SUBJECTS[0]).id), // the logged subject's first-launch answer (the replay's)
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
      ...(store.get(sk, null) ? {start: store.get(sk, null)} : {})
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
      if (left.length) setTimeout(sendAnon, 1000);
    })
    .catch(e => navigator.onLine !== false && ev('sync', {msg: 'anonymous send failed: ' + String((e && e.message) || e)}))
    .finally(() => {
      anonBusy = false;
    });
}
// Events (Pierre, 2026-11-02: most RAs will not report problems, so the app reports what it can by itself; sheet v19
// events_): app errors, photos that still fail after their retries, saves that fail while online, and the answers to the
// occasional one-tap question (pulse). Anonymous: a random device id of its own (EVID, never a name or the answers' id),
// the app version and a short browser name; only the pages summaries (pagesSend, sheet v30) are tied to the player's
// answers, under the admin's id of the player. Queued here (EVQ, at most 50) and sent in small batches; never from a local
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
// player (Code.gs evWho_), keeping neither. Queued only once the sheet has said v >= PAGES.SHEET (AGENTS.md 7a), and,
// like every event, never sent from a local copy (LOCAL).
const SHEETV = 'reefid-sheet-v',
  PVLINK = 'reefid-pv-link',
  PV = pagesNew(),
  PVI = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
let pvLast = null,
  pvPre = null;
// The script version of a reply (every reply carries v), remembered for the next visits.
function sheetSeen(j) {
  if (j && Number(j.v) > 0 && Number(j.v) !== Number(store.get(SHEETV, 0))) store.set(SHEETV, Number(j.v));
}
// The script version last seen (0 before any reply): what the app may rely on (AGENTS.md 7a), so a visit offline does
// what the last one did. Also read by the answer time (model.js rtOn, core.js RT_SHEET); the full replay checks each
// reply's own v (replayAdopt).
const sheetV = () => Number(store.get(SHEETV, 0)) || 0;
const pvGenus = h => {
  const g = String(h || '').replace(/^#/, '');
  let n = g.slice(2);
  try {
    n = decodeURIComponent(n);
  } catch (e) {}
  return g.startsWith('g-') && DATA && GX(n) ? n : null;
};
// A link to a genus sheet remembers the page it was clicked on: the quiz feedback opens the sheet in a new tab on a
// computer (quiz.js sheetTab), a new visit that has no page before it.
document.addEventListener(
  'click',
  e => {
    const a = e.target && e.target.closest ? e.target.closest('a[href^="#g-"]') : null;
    if (a) store.set(PVLINK, {g: pvGenus(a.getAttribute('href')), from: pageFrom(hashNow()), t: Date.now()});
  },
  true
);
// A page drawn (app.js route; a redraw of the same page is not a new opening).
// A page is the hash and the subject on screen (SUBJECTS pv): a subject switched on the same hash (the header chip) closes the page
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
const pagesWho = batch =>
  !batch.some(x => x && x.k === 'pages') ? {} : SYNC && SYNC.name && SYNC.pin ? {ename: SYNC.name, epin: SYNC.pin} : {eanon: anonId()};
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
  // Each subject on its own (core.js SUBJECTS). A subject whose answers are logged (the corals): only what was played
  // while signed out counts, the delta from ANONB (the progress before the first anonymous answer) added to the sheet's;
  // progress left by a sign-out made before sign-out cleared the device (2026-11-01) is in ANONB, so it is neither
  // counted twice nor credited to another account. A subject not logged (fish, which came after sign-out cleared the
  // device): everything on this device was played signed out, so it all adds up.
  const anon = SYNC.log.length > 0,
    M = {};
  let mine = false;
  SUBJECTS.forEach((S, i) => {
    const pk = subjKey(S.id, 'progress'),
      here = store.get(pk, {}) || {};
    let R = {};
    try {
      R = JSON.parse(j.data[pk] || '{}') || {};
    } catch (e) {}
    // The account's copy is this subject's merge baseline, played here or not (Codex review #442: a subject never played
    // on this device took the account's progress through loadData with no baseline, and the next sync added it again).
    SYNC[S.base[0]] = R;
    // A subject never played on this device (not the first, the corals) takes the account's as it is (loadData below).
    if (i && !Object.keys(here).length) return;
    if (!S.log && Object.keys(here).length) mine = true;
    M[pk] = S.log ? (anon ? mergeProgress(store.get(ANONB, {}) || {}, here, R) : R) : mergeProgress({}, here, R);
  });
  try {
    localStorage.removeItem(ANONB);
  } catch (e) {}
  // The account's settings replace this device's, except the achievements: earned here before signing in, they join the
  // account's (code review #324).
  const ach = store.get(ACHK, null),
    // Each subject's first-launch record made here before signing in joins the account's (core.js startUnion, Codex
    // review #428): the account's earlier answers and this device's newer one both stay in the history.
    st = SUBJECTS.map(S => [startKey(S.id), store.get(startKey(S.id), null)]);
  // The rules version applied (RVK) is the account's, 0 when its data has none: this device's (an anonymous replay adopted
  // here) would tell the sheet that the account's log was replayed, and its replay would never come (Codex review #399).
  try {
    localStorage.removeItem(RVK);
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
  if (ach) achMerge(JSON.stringify(ach));
  st.forEach(([k, r]) => r && store.set(k, startUnion(store.get(k, null), r)));
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
      SYNC = null;
      // The pages summaries still queued are the account's: dropped, never sent under the next player (Codex review #423).
      store.set(
        EVQ,
        store.get(EVQ, []).filter(x => !(x && x.k === 'pages'))
      );
      // Achievements and the leaderboard choice belong to the account too: never left to the next player of a shared device.
      // The first-meeting cards too (Codex review #350): the next player meets their own genera.
      [
        'reefid-account',
        // Every subject's progress, settings, cards, opening hold and comeback (model.js COMEBACK.KEY: the visit floor and
        // the comeback belong to this player, Codex review #374).
        ...SUBJECTS.flatMap(S => [
          // the first-launch question's answer is the player's too (model.js startSet)
          ...['progress', 'quiz', 'reset', 'intro', 'intro-offer', 'start'].map(k => subjKey(S.id, k)),
          ...['hold', 'comeback'].map(k => subjDev(S.id, k))
        ]),
        BASICS_KEY, // and their Coral basics (app.js; Codex review #428: done there hid the next beginner's offers)
        ACHK,
        'reefid-ach-new',
        CUSTOM.KEY, // model.js: the custom quiz's selection is the player's too
        'reefid-mx-lost', // model.js MXL.KEY: learned marks taken away and their card, this player's
        RVK, // the rules version this player's progress was replayed with (replayAdopt)
        'reefid-rv-msg', // progress.js RVN.KEY: the announcement cards of the rules versions, this player's
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
      mine = store.get(LOG0, []).length;
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
