# A page killed with no hide event: how much is lost, and recovery around one atomic primitive (2026-11-25)

Status: design note, docs only (Linear REE-239, Study › Decision input). No app code, sheet script, curation or data
file was changed. The sync sheet was read once, read-only, through the Google Sheets connector, as counts only: no
player name, admin id or device id appears here (rules D1, D2). Nothing is asked of Pierre (AGENTS.md Rule 0, and this
is the integrator's input).

Labels (rule W11): **[measured]** counted from the sheet as described in section 1; **[read]** read in the code, a
spec or the cited page; **[guess]** a judgement.

## Answer first

- **On the RAs' phones no summary was lost in the slice measured: 0 of 37 visits** (4 phones, 2026-11-20 to 11-25),
  95% upper bound about 9% (Wilson, n = 37) [measured]. The 7 visits with no summary found were all on 2 computers
  (7 of 32 computer visits), 5 of them on one computer [measured]; one is that computer's last visit in the slice and
  may still have been open [measured]. Why the computers miss is not known: a tab left open while the computer sleeps,
  or two tabs overlapping, which the join below cannot tell apart [guess].
- **This matches what browsers say**: on a phone, a page normally gets `visibilitychange` to hidden before it is
  frozen, discarded or killed; only a page that dies in view (a crash, the browser killed in the foreground) gets no
  event [read]. Chrome's [Page Lifecycle API guide](https://developer.chrome.com/docs/web-platform/page-lifecycle-api):
  "The transition to hidden is also often the last state change that's reliably observable by developers", the moves
  to discarded fire no event, and on mobile "the `beforeunload`, `pagehide`, and `unload` events are not fired in
  those cases".
- **A design that closes all ten findings of #1471 exists** (section 2): one IndexedDB record per visit, taken and
  deleted in one read/write transaction, with a Web Lock held for the page's lifetime as the sign that its owner is
  alive, and a summary event id fixed per summary so the sheet's own duplicate check settles the rare double.
- **Recommendation: do not build it now.** Close REE-239 as not worth it, or park it, with the trigger to reopen it
  being a measured loss on phones. If the integrator wants a sharper number first, the cheap step is the `vi` in the
  `load` event (section 1.4), which needs a sheet version.

## 1. The measurement

### 1.1 What the logs hold [read]

- The `load` event (`app.js` `loadMark`, `sync.js` `loadSend`) is queued once a visit, at the first quiz photo, 180 s
  after the first page, or when the app is hidden, whichever comes first. It is the only per-visit trace that does not wait for a hide
  event. It goes to the Events tab with the device id (column Device), but **without the visit id `vi`**.
- The pages summary (`sync.js` `pagesSend`) is queued only on hidden or `pagehide`, to the Pages tab, with the same
  device id and the `vi` in Detail. A page killed with no event leaves no Pages row at all.
- Every event's id (column Id) starts with the client's `Date.now()` in base 36 (`sync.js` `ev`), so the queue time is
  exact to the millisecond even where the Time column shows a date only.

So a visit killed with no event is a `load` row with no Pages row. Without `vi` on `load`, the two can only be joined
by device and time.

### 1.2 Method [measured]

- Slice: Events rows 960 to 1100 (69 `load` rows, 2026-11-20 06:42 to 11-24 23:29 UTC) and Pages rows 1100 to 1336
  (237 rows), read as columns Device, Kind and Id only (and Browser for the device type).
- For each `load` on a device: is there a Pages row from the same device queued between 2 s before it and the device's
  next `load`? (A summary is never queued before its visit's `load`: on hidden, `loadSend` runs before `pagesSend`.)
- The script and the copied columns stayed in the scratchpad and were deleted afterwards; device ids were replaced by
  letters before the count.

### 1.3 Result [measured]

| Devices | Visits (`load`) | No summary found | Share |
| --- | --- | --- | --- |
| Phones (Safari 26-27, Chrome 138-158 mobile), 4 devices | 37 | 0 | 0% (95% CI 0-9%) |
| Computers (Chrome, Edge), 5 devices | 32 | 7 (5 on one computer, 2 on another) | 22% |
| All, 9 devices | 69 | 7 | 10% |
| Of which after #1471 (`pagehide` live, 2026-11-23 10:30 UTC) | 14 | 2 | too few to say |

What this cannot see, so the true loss can be higher or lower:

- **Higher**: a visit killed before its first quiz photo and before `loadSend`'s 180 s timer leaves no `load` row either, so it is not
  counted. Those are short visits, worth little in a summary [guess].
- **Lower**: a missing Pages row also comes from the event queue's cap of 50 (`sync.js` `ev`), a `busy` or `input`
  reply, a summary dropped at sign-out (`core.js` `pagesBatch`), an admin delete (`Code.gs` `pagesDrop_`), or a device
  still offline. Two tabs overlapping on one device make a `load` look unmatched when its summary is queued after the
  other tab's `load`.
- The slice is five days and nine devices; before #1471 a page closed without a hidden event also lost its summary, so
  the 7 misses are an upper bound on the kill-only loss.

### 1.4 What cheap logging would tell

Carry the visit id in `load` (`vi: PVI`, one line in `sync.js` `loadSend`). The join becomes exact: a `vi` with a
`load` and no `pages` row is a lost summary, counted per browser. It is not free: `Code.gs` `events_` whitelists the
`load` detail fields, so the sheet must keep `vi` (a `Code.gs` change, a sheet version, a changes file and a gate in the
app, rules D3 and D4). A count that needs no sheet change does not exist in the current events [read]. Worth it only if
the integrator wants the number before closing; the phones' 0 of 37 already says the loss is small.

## 2. The design around one atomic primitive

### 2.1 Why localStorage failed [read]

The HTML Standard says of `localStorage`: the spec "does not define the interaction with other agent clusters in a
multiprocess user agent, and authors are encouraged to assume that there is no locking mechanism", with the example of
two windows reading, incrementing and writing back one key ([HTML, Web storage, 12.1](https://html.spec.whatwg.org/multipage/webstorage.html)).
Every one of #1471's ten Codex findings (its decision record lists six as classes) was a consequence: a take was a read
followed by a delete that another tab could interleave, and liveness was guessed from a timestamp.

### 2.2 The primitive [read]

**An IndexedDB read/write transaction.** The spec: a read/write transaction "can start when there are no transactions
which: were created before tx; and have overlapping scopes with tx; and are not finished", and "the implementation must
atomically write any changes to the database" ([Indexed Database API 3.0](https://w3c.github.io/IndexedDB/)). So a
`get` then `delete` of one record in one transaction is a take that no other tab can interleave. IndexedDB is Baseline
widely available since July 2015 ([MDN IDBTransaction](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction)).

**Liveness, not atomicity, comes from a Web Lock.** Each page takes an exclusive lock named after its visit
(`reefid-pv-<vi>`) at start and never releases it. The spec releases it only when "the unloading document cleanup steps
run" or "an agent terminates" ([Web Locks API, 2.6](https://w3c.github.io/web-locks/)). Another page asking for that
name with `ifAvailable` gets `null` while the owner lives, frozen included, and the lock once the owner has gone
([MDN Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API): "the lock request will fail if
the lock cannot be granted immediately"). No timer, no lease. Web Locks are Baseline widely available since March 2022
(same MDN page); every browser in the slice (Safari 26-27, Chrome 138-158, Edge 157-158) is newer [measured, read]. The
spec does not say whether a page in the back/forward cache keeps its locks [read]; section 2.3 does not rely on it.

### 2.3 How it works

1. **The owner keeps a copy.** Store `pv`, one record per visit, key `vi`: `{gen, o, t, summary}`, written in a
   read/write transaction at each page opening, each feedback count and every 15 s while visible. `gen` is the number
   of summaries this visit has queued so far; `summary` is `pagesTake`'s output read without taking (the feedback sheet's
   running seconds included, without closing it: #1471's first finding).
2. **Its summary has a fixed id.** The `pages` event queued for generation `gen` gets the id `<vi><gen>` (alphanumeric,
   at most 20 characters, as `Code.gs` `events_` requires), not a random one. On hidden or `pagehide`, the owner queues
   it, increments `gen` and deletes or rewrites its record.
3. **A later page recovers.** At start and on each return to view, a page lists the `pv` keys other than its own; for
   each, it asks the lock `reefid-pv-<key>` with `ifAvailable`. Granted means the owner has gone: inside the lock, one
   read/write transaction gets and deletes the record; if it got one, it queues the summary under its owner `o` with id
   `<vi><gen>`, as `pagesSend` would have (`pagesBatch` still keeps it from anyone else).
4. **A page coming back from the back/forward cache checks first.** On `pageshow` with `persisted`, before any route or
   feedback runs, it re-takes its lock and reads its record in one transaction: gone means it was recovered, so it
   drops its in-memory tally and starts generation `gen + 1` (#1471's resume-after-claim findings).
5. **Old copies leave.** A record from more than seven days ago whose lock is free is deleted, never sent (the sheet's id check
   covers its last 2,000 Pages rows; the tab grew about 1,300 rows in three weeks [measured]).

### 2.4 No double count, no loss of later activity

- **Owner alive**: the lock is held, nobody takes its record. **Owner gone**: it can queue nothing more, so the record
  is the only copy left. One transaction takes it once, whatever the number of tabs.
- **Owner killed between queuing on hide and deleting its record**: the record is recovered later with the same
  `<vi><gen>` id; `Code.gs` `events_` skips an id already in its last 2,000 rows, and the recoverer also skips an id
  still in its own queue. The age limit keeps the resend inside that window.
- **A write that fails** (quota): the record is older than the tally, but it shares the tally's id and can only be
  taken once the owner is gone, so the cost is the last seconds, never a double.
- **One record per visit** replaces #1471's shared map: two windows never write the same record.
- **Sign-in**: `pagesOwn` already moves the queue's summaries; the same call rewrites the record's `o` in its
  transaction (#1471's owner finding).
- **Left open**: the recovered summary enters the event queue through `ev`, whose read-modify-write of `localStorage`
  (`reefid-evq`) can still lose an event when two tabs write at once [read]. That is today's risk for every event,
  not new; moving the queue itself to IndexedDB is a separate change.
- **What browsers do not guarantee**: a page killed in view may have written its record up to 15 s before; Firefox may
  lose a committed transaction on an OS crash before the flush ([MDN IDBTransaction](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction)).
  Both lose a little, neither counts twice.

### 2.5 The spec change it would make

`docs/spec/sync.md`, "Events and pages", the paragraph "The summary.": replace "A page killed with no event at all (the
app or the phone stopped, a crash) still loses its summary so far." with the copy in IndexedDB (2.3), the lock per
visit, the fixed id `<vi><gen>`, the `pageshow` check, the 7-day limit, and what is still lost (the last seconds; a
page with no IndexedDB or Web Locks keeps today's behaviour). Not edited here: PR #1554 holds that file.

## 3. The PR plan, if built

One PR, one agent. Effort: #1471 took 1.7 h of agent time for the cut-down version after 10 Codex rounds; comparable
feature PRs of size M, #1284, #1399, #1407, #1411, #1423: median 2.4 h (range 84 min-3.3 h). This one is larger
(two interleaved contexts in the tests), so that median (#1284, #1399) is a floor [guess]:

| File | Change |
| --- | --- |
| `sync.js` | The copy, the lock per visit, recovery at start and on return, the `pageshow` check, the fixed id in `pagesSend` |
| `core.js` (pages part) | A pure `pagesPeek` (the tally without taking it), tested alone |
| `tests/pages.test.js`, a new `tests/pages-recover.test.js` | A fake IndexedDB and lock manager in the VM harness; two contexts interleaved at each step (take, write, resume), the cases of #1471's findings each failing first |
| `tests/pages.smoke.js` | `visit` part: kill a page (close the context with no event), open another, one summary in the sheet stub |
| `docs/spec/sync.md` | Section 2.5 |
| `docs/decisions/` | A record replacing the "left for its own issue" part of `2026-11-23-pages-kept-copy.md` |

No `Code.gs` change: the same event and fields, an id the script already accepts (rule D4). Lanes (rule W27):
`sync.js` is free today; `core.js` is held by #1568 and `docs/spec/sync.md` by #1554, so the PR starts once both have
merged, or keeps `pagesPeek` in `sync.js` and the spec change for a follow-up.

**Worth it?** Not now: 0 of 37 phone visits lost in five days, and the loss is the pages summary only (pages opened,
seconds, feedback counts), never answers or progress, which have their own save. Reopen it if the exact count of 1.4,
or a later read of the same join, shows phone visits losing their summary.
