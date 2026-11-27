# A page killed with no hide event: how much is lost, and recovery around one atomic primitive (2026-11-25)

Status: design note, docs only (Linear REE-239, Study › Decision input). No app code, sheet script, curation or data
file was changed. The sync sheet was read once, read-only, through the Google Sheets connector, as counts only: no
player name, admin id or device id appears here (rules D1, D2). Nothing is asked of Pierre (AGENTS.md Rule 0, and this
is the integrator's input).

Labels (rule W11): **[measured]** counted from the sheet as described in section 1; **[read]** read in the code, a
spec or the cited page; **[inference]** reasoned from what was read, not stated by it; **[guess]** a judgement.

## Answer first

- **What the logs can show is narrow.** They show a visit that sent no pages summary at all, and only for a visit that
  queued its `load` event before any hide. They cannot show a visit that sent a summary, came back to view and was then
  killed: the summary of its later activity is lost unseen (section 1.3).
- **Within that, no phone lost a visit: 0 of 13** phone visits whose `load` was queued before any hide had no summary
  (4 phones in the slice, 2026-11-20 to 11-25, the busiest phone 6 of the 13), 95% upper bound about 23% (Wilson,
  n = 13) [measured]. The other 24 phone visits queued `load` at their first hide, so they always have a summary and say
  nothing. On computers, 7 of 16 such visits had none, all on 2 computers, 5 on one [measured]. The 2 misses after
  #1471 are both their computer's last visit in the slice and may still have been open [measured]. Why the computers
  miss is unknown: a tab left open while the computer sleeps, or two tabs overlapping [guess].
- **The browsers' own account says the loss on phones should be small**: a page normally gets `visibilitychange` to
  hidden before it is frozen, discarded or killed, and only a page that dies in view gets no event [read]. Chrome's
  [Page Lifecycle API guide](https://developer.chrome.com/docs/web-platform/page-lifecycle-api): "The transition to
  hidden is also often the last state change that's reliably observable by developers"; the moves to discarded fire no
  event; on mobile "the `beforeunload`, `pagehide`, and `unload` events are not fired in those cases".
- **A design that answers #1471's findings exists** (section 2): an exclusive Web Lock per visit, held by its page and
  released by the browser when the page goes, is the one atomic primitive. One IndexedDB record per visit holds the
  copy. Each summary gets a fixed event id, so a resend after a crash is a duplicate the sheet already skips.
- **Recommendation: do not build it now; park REE-239.** The data neither shows a loss on phones nor rules one out
  (n = 13), and what is lost is the pages summary only (pages opened, seconds, feedback counts), never answers or
  progress. The grounds are the lifecycle guide and that small stake. If the integrator wants a number before
  deciding, the next step is the count of section 1.4, which needs a sheet version.

## 1. The measurement

### 1.1 What the logs hold [read]

- The `load` event (`app.js` `loadMark`, `sync.js` `loadSend`) is queued once a visit, at the first quiz photo, 180 s
  after the first page, or when the app is hidden, whichever comes first. It goes to the Events tab with the device id
  (column Device), but **without the visit id `vi`**.
- The pages summary (`sync.js` `pagesSend`) is queued on each hide or `pagehide`, with the same `vi` each time
  (`core.js` `pagesTake` starts a fresh tally after each), to the Pages tab with the device id and the `vi` in Detail.
- On a hide, `loadSend` and `pagesSend` run in the same handler, so a `load` queued at a hide always has a Pages row
  queued within milliseconds.
- Every event's id (column Id) starts with the client's `Date.now()` in base 36 (`sync.js` `ev`), so the queue time is
  exact to the millisecond even where the Time column shows a date only.

### 1.2 Method [measured]

- Slice: Events rows 960 to 1100 (69 `load` rows, 2026-11-20 06:42 to 11-24 23:29 UTC) and Pages rows 1100 to 1336
  (237 rows), read as columns Device, Kind, Browser and Id only.
- A `load` with a Pages row from the same device within 50 ms is counted as queued at a hide and set apart: it is
  matched by construction.
- Each other `load` is matched when a Pages row from the same device is queued between 50 ms before it and the
  device's next `load`.
- The copied columns and the script stayed in the scratchpad and were deleted afterwards; device ids were replaced by
  letters before the count.

### 1.3 Result, and what it cannot see [measured]

| Devices | Visits (`load`) | Queued at a hide (set apart) | Queued before any hide | Of those, no summary found |
| --- | --- | --- | --- | --- |
| Phones (Safari 26-27, Chrome 138-158 mobile), 4 devices | 37 | 24 | 13 | 0 (95% CI 0-23%) |
| Computers (Chrome, Edge), 5 devices | 32 | 16 | 16 | 7 (5 on one computer, 2 on another) |
| Of all, after #1471 (`pagehide` live, 2026-11-23 10:30 UTC) | 14 | 7 | 7 | 2, both a device's last visit in the slice |

- **Later segments are not seen at all.** A visit that sent a summary at a hide, came back and was killed in view loses
  everything since its return, yet it passes the join: its one `load` already has a Pages row. Adding `vi` to `load`
  does not change that; only the count of section 1.4 does.
- **Short visits are not seen.** A visit killed before its first quiz photo and before `loadSend`'s 180 s timer leaves
  no `load` row.
- **Other causes of a missing row** make the count an upper bound for what it covers: the event queue's cap of 50
  (`sync.js` `ev`), a `busy` or `input` reply, a summary dropped at sign-out (`core.js` `pagesBatch`), an admin delete
  (`Code.gs` `pagesDrop_`), a device still offline, two tabs overlapping on one computer. Before #1471, a page closed
  without a hidden event also lost its summary.
- The slice is five days and nine devices. Nothing in it says whose devices they are.

### 1.4 What logging would tell

A count of the visits, and of the segments, that end without a summary: each page keeps a mark `{vi, seg}` for its open
segment in its own storage key, set when a segment starts and cleared when `pagesSend` queues it. At the next start, a
mark left by a visit whose Web Lock (section 2.2) is free is a lost segment, counted in that page's next summary as one
field (say `lost: 1`). That needs `core.js` `pagesClean` to keep the field, and `pagesClean` runs in the sheet script
too (`Code.gs` embeds `core.js` as `CORE_`), so it is a sheet version, a changes file and a gate in the app (rules D3,
D4) [read]. No count of lost segments is possible with the current events [read]. It is about a third of the design
below, which is why the recommendation is to park rather than measure first [guess].

## 2. The design around one atomic primitive

### 2.1 Why localStorage failed [read]

The HTML Standard says of `localStorage`: the spec "does not define the interaction with other agent clusters in a
multiprocess user agent, and authors are encouraged to assume that there is no locking mechanism", with the example of
two windows reading, incrementing and writing back one key ([HTML, Web storage, 12.1](https://html.spec.whatwg.org/multipage/webstorage.html)).
#1471's ten Codex findings (its decision record groups them in six classes) came from that: a take was a read followed
by a delete that another tab could interleave, and an owner's liveness was guessed from a timestamp.

### 2.2 The primitive: a Web Lock per visit [read]

Each page takes an exclusive lock named after its visit, `reefid-pv-<vi>`, and holds it while it lives. While a lock is
held, "requests for the same lock from this execution context, or from other tabs/workers, will be queued", and with
`ifAvailable` "the lock request will fail if the lock cannot be granted immediately without waiting"
([MDN Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)). The browser releases a page's
locks when "the unloading document cleanup steps run" or "an agent terminates"
([Web Locks API, 2.6](https://w3c.github.io/web-locks/)). So one lock gives both things #1471 lacked:

- **Mutual exclusion**: at most one context at a time acts on a visit's copy.
- **Liveness without a timer**: a recoverer granted the lock knows its owner has gone. A frozen page keeps its lock,
  since freezing is neither of the spec's two release steps [inference: the spec is silent on frozen pages].

Web Locks are Baseline widely available since March 2022 (same MDN page); every browser in the slice (Safari 26-27,
Chrome 138-158, Edge 157-158) is newer [measured, read]. A page without `navigator.locks` keeps today's behaviour.

**The store is IndexedDB, one record per visit**, not one shared map: a read/write transaction "can start when there are
no transactions which: were created before tx; and have overlapping scopes with tx; and are not finished", and "the
implementation must atomically write any changes to the database" ([Indexed Database API 3.0](https://w3c.github.io/IndexedDB/)).
A write is whole or absent, and two windows never rewrite each other's record.

**A cost to check before building** [read, not settled]: web.dev's [back/forward cache guide](https://web.dev/articles/bfcache)
lists "Pages with an open IndexedDB connection" among pages some browsers do not cache, and advises closing such
connections and shared resources "during the `pagehide` or `freeze` event" and reopening them on `pageshow` or
`resume`. It does not say whether a held Web Lock blocks the cache. So the page releases its lock and closes its
connection on `pagehide` (step 4), and a build must check in Chrome and Safari that the app stays cacheable.

### 2.3 How it works

1. **Start.** The page asks for its lock. Until it is granted (asynchronous), it writes no record; activity in that gap
   stays in memory and goes into the first record. A page killed before the grant loses that gap only.
2. **The owner keeps a copy.** Store `pv`, key `vi`: `{gen, o, t, summary}`, written in one read/write transaction at
   each page opening, each feedback count and every 15 s while visible, and only while the page holds its lock. `gen`
   counts the summaries this visit has queued; `summary` is the tally read without taking it, the feedback sheet's
   running seconds included without closing it (#1471's feedback finding).
3. **A fixed id per summary.** The `pages` event of generation `gen` has the id `<vi><gen>` (alphanumeric, at most 20
   characters, as `Code.gs` `events_` requires), not a random one. On each hide the owner queues it, increments `gen`,
   then rewrites or deletes its record.
4. **Leaving and coming back.** On `pagehide` the owner queues its summary as today, deletes its record, closes its
   connection and releases its lock. Its tally is then empty, so a page restored from the back/forward cache
   (`pageshow`, `persisted`) has nothing to reconcile: it asks for its lock again and starts generation `gen + 1`.
   Activity before that grant is held in memory as in step 1.
5. **A later page recovers.** At start and on each return to view, a page lists the `pv` keys other than its own and
   asks each one's lock with `ifAvailable`. Granted: the owner has gone. Holding that lock, it reads the record (no
   delete), queues the summary with the id `<vi><gen>` under the record's owner `o` (unless that id is already in its
   queue), and deletes the record only once a sheet reply has taken that id out of the queue (`sync.js` `sendEvents`).
   It then releases the lock. A recoverer that dies at any point leaves the record, and the next one queues the same
   id again.
6. **Sign-in.** `pagesOwn` moves the queue's anonymous summaries to the account; the same step rewrites, in one
   transaction, the `o` of every `pv` record that names the device's anonymous id, the dead pages' included (#1471's
   owner finding). Without that, `pagesBatch` would drop them once recovered.
7. **Old copies leave.** A record from more than seven days ago whose lock is free is deleted, never sent: the sheet
   checks ids only in its last 2,000 Pages rows, and the tab grew about 1,300 rows in three weeks [measured].

### 2.4 #1471's findings, one by one

| Finding on #1471 | What answers it here |
| --- | --- |
| Feedback seconds missing from the copy | Step 2: the copy reads the running seconds without closing the sheet |
| An evicted copy read as recovered | No eviction: one record per visit, removed only after the sheet's reply (step 5) or the age limit (step 7) |
| The recovery marker tied to the visit, not the summary | No marker: the record and the event id carry `gen` (step 3) |
| A new opening, or new feedback, counted into a claimed tally | A live owner's record is never taken (step 2 writes only under its lock); after `pagehide` the tally is empty (step 4) |
| The owner not moved at sign-in | Step 6 |
| A resend beyond the sheet's 2,000-row id window | Fixed id (step 3), age limit (step 7) |
| Two windows' read-modify-write of one shared map | One IndexedDB record per visit |
| A check-then-take race with a resuming page | The resuming page cannot write until it holds the lock the recoverer holds |
| A failed write renewing the lease | No lease. A failed write leaves an older copy with the same id, taken only once the owner is gone: the last seconds lost, no double |

### 2.5 What is still lost, or could count twice

- **Lost**: the activity since the copy's last write (up to 15 s); the gap before a lock grant (steps 1 and 4); a
  committed transaction that Firefox may lose on an OS crash before the flush
  ([MDN IDBTransaction](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction)); and, as today for every
  event, an event lost to `ev`'s read-modify-write of `localStorage` (`reefid-evq`) when two tabs queue at once
  [read]. Moving the event queue itself to IndexedDB is a separate change.
- **Counted twice**: only if the same id reaches the sheet after 2,000 newer Pages rows. The age limit keeps a resend
  inside that window at the current rate [inference]. It does not cover a recovered summary whose sheet reply is lost
  and which is retried from `reefid-evq` after more than 2,000 newer Pages rows: that one can count twice. The same risk
  exists today for every queued event (`sync.js` `sendEvents` retries with no age check), and the integrator tracks it
  separately.

### 2.6 The spec change it would make

`docs/spec/sync.md`, "Events and pages", the paragraph "The summary.": replace "A page killed with no event at all (the
app or the phone stopped, a crash) still loses its summary so far." with the lock per visit, the copy in IndexedDB, the
fixed id `<vi><gen>`, recovery under the lock with the delete after the sheet's reply, the `pagehide` release, the
sign-in step, the seven-day limit, and what is still lost (2.5; a page without Web Locks or IndexedDB keeps today's
behaviour). Not edited here: PR #1554 holds that file.

## 3. The PR plan, if built

One PR, one agent. Effort: #1471 took 1.7 h of agent time for the cut-down version after 10 Codex rounds; comparable
feature PRs of size M, #1284, #1399, #1407, #1411, #1423: median 2.4 h (range 84 min-3.3 h). This one is larger
(two interleaved contexts in the tests), so that median (#1284, #1399) is a floor [guess]:

| File | Change |
| --- | --- |
| `sync.js` | The lock per visit, the copy, recovery at start and on return, the `pagehide` release, the fixed id in `pagesSend`, the sign-in step |
| `core.js` (pages part) | A pure `pagesPeek` (the tally without taking it), tested alone |
| `tests/pages.test.js`, a new `tests/pages-recover.test.js` | A fake IndexedDB and lock manager in the VM harness; two contexts interleaved at each step (grant, write, take, send, resume), each of the table's cases failing first |
| `tests/pages.smoke.js` | `visit` part: kill a page (close the context with no event), open another, one summary in the sheet stub; the app still restored from the back/forward cache |
| `docs/spec/sync.md` | Section 2.6 |
| `docs/decisions/` | A record replacing the "left for its own issue" part of `2026-11-23-pages-kept-copy.md` |

No `Code.gs` change: the same event and fields, an id the script already accepts (rule D4). Lanes (rule W27):
`sync.js` is free today; `core.js` is held by #1568 and `docs/spec/sync.md` by #1554, so the PR starts once both have
merged, or keeps `pagesPeek` in `sync.js` and the spec change for a follow-up.

**Worth it?** Not now. Reopen REE-239 if players or Pierre report pages time that looks short, or if the count of 1.4
is built for another reason and shows phone segments lost.
