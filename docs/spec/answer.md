# One logged answer: the contract

What one answer is, from the device that builds it to the sheet that logs and replays it and back to the device that
adopts the replay: its fields, its id, the acknowledgement, the adoption and the version signals involved. This is
today's behaviour written as one contract (REE-284; [architecture audit](../reviews/2026-11-27-architecture-audit.md)
section 3.4); the details of each part stay in [sync.md](sync.md). `tests/answercontract.test.js` checks it end to end
on synthetic answers and the in-memory sheet (`tests/gas.js`, rule D1), reads the field table below, and pins as `GAP …`
each place where today's code breaks it (last section).

## The path

1. **Built** on the device: `quiz.js` `recordAnswer` for every game's answer (`quiz.js` `answer`, and `live.js` `liveLog`
   with its own id and time), `winkAnswer` for a surprise card's. The scorer (`core.js` `scoreAnswer`) runs first; its
   expectation, ability and scoring record go into the entry.
2. **Queued**: `quiz.js` `logAnswer`: the account's queue `SYNC.log` when signed in, else `LOG0` (kept until sign-in) and
   `ANONQ` (to send); each keeps the last 2,000.
3. **Sent**: `sync.js` `syncOnce` (a save: the whole queue, `answers`) or `sendAnon` (`anonAnswers`, 100 a request), each
   answer through `core.js` `logOut` (below), with `av`, `rv` (and `rvs`, `sts`), `pt` and `dev`.
4. **Logged**: `Code.gs` `doPost_` → `freshAnswers_` → `logAnswers_` (a save after the code check; `anon_` for an
   anonymous send): one Answers row per new id, under the account's name or `~anon <device id>`.
5. **Replayed**: `Code.gs` `replay_` (`rowOf_`) → `core.js` `replayProgress`, in time order, over the player's rows of one
   subject since their reset; on the device, `core.js` `logRow` for its own queued answers on top.
6. **Adopted**: `sync.js` `replayAdoptS` → `core.js` `replayAdopted` (rule D9).

## The fields

One row per key of an entry. Built by: who makes the value. The sheet keeps: what `Code.gs` `logAnswers_` writes (a value
that fails its check is written blank, never refused). Replay: whether `core.js` `logRow` and `Code.gs` `rowOf_` read it.
Two columns come from the send, not the entry: Name (the account's, or `~anon <id>`) and Device (`dev`, `dev_`). A key
the script does not know is not stored; a key the app does not send is blank.

| Key | Answers column | Built by | The sheet keeps | Replay |
| --- | --- | --- | --- | --- |
| `id` | Id | `core.js` `answerId` (16 characters), a live answer's `live.js` `liveAid` | a-z and 0-9 only (`core.js` `logIdOk`), its first 20 characters; the dedup key | yes |
| `t` | Time | the moment of the answer (a live answer's own `at`) | a date | yes |
| `g` | Genus shown | `recordAnswer` `target` | a unit id, 40 characters (an old fish entry renamed: `renameLogEntry`) | yes |
| `a` | Answered | `recordAnswer` `c` (empty for "I don't know") | as Genus shown | yes |
| `ok` | Right | the answer | 1 or 0 | yes |
| `m` | Mode | `recordAnswer` `mq` (the game and its suffixes, [sync.md](sync.md#the-answers-tab)) | 80 characters | yes |
| `ph` | Photos | the photos seen (a hint left closed out) | file stems, 400 characters | yes |
| `ch` | Choices | the units offered | 200 characters | yes |
| `e` | Expected | `scoreAnswer` `e`, to 0.01 | a number | yes |
| `th` | Ability | `scoreAnswer` `th0` | a number | yes |
| `sc` | Scoring | `core.js` `scoreLog` | `scoreRec`, its known keys only, as JSON | yes |
| `nw` | New photos | the photos new to the unit's record | a number | yes |
| `rt` | Seconds | `QCLOCK` | 0 to 600, to 0.1 | yes |
| `zm` | Enlarged | `QCLOCK` | 1 or 0 | no |
| `tz` | UTC offset | the device's clock | whole minutes, at most 840 either way | no |
| `ty` | Typed | a typed question's text | 40 characters, control characters out | no |
| `tr` | Retyped right | a typed question's spelling step | 1 or 0 | no |
| `rj` | Rejected tries | the texts a typed answer refused | at most 10, as JSON | no |
| `s` | Subject | `SUBJ.id` (the replay of a subject takes its rows only) | a word; none is `coral` | no |
| `rk` | Rank | `app.js` `rankOf`, else `core.js` `unitRankOf` | a word; none is the subject's rank | no |
| `tn` | Taxon shown | `app.js` `unitName` when a unit's id is not its name | 80 characters | no |
| `ta` | Taxon answered | as Taxon shown | 80 characters | no |
| `sp` | Species shown | `app.js` `speciesShown` | 300 characters | no |
| `pa` | Photo answered | a Find the X's photo tapped | as Photos | no |
| `cv` | Content version | `quiz.js` `cvField` (`app.js` `contentVer`, `core.js` `contentVersion`) | `c` and up to 15 a-z or 0-9 | no |
| `cx` | Context | `quiz.js` `cxField` (`core.js` `ctxOf`): the app build, the subject's rules version, the record format | each field that checks (`core.js` `ctxRec`), then the script's `VERSION` as `v`, as JSON; written for every answer, one sent without `cx` included | no |
| `of` | Offered | `core.js` `offerOf` (`recordAnswer`, `winkAnswer`): every stimulus shown, with its role | `core.js` `offerRec`, as JSON: at most 12 items, a unit or a photo 80 characters, the cell 2,000; blank when one item fails | no |

A surprise card's entry (`winkAnswer`) has no `e`, `th`, `sc`, `nw` or typed fields; no reader counts it (`core.js`
`winkRow`, `winkEntry`). `tests/anslog.js` imitates the rows `logAnswers_` writes.

### Context

What produced the answer (REE-311 point 8; Pierre, 2026-11-27 ~08:43 Manila, «oui»: a sheet column change approved).
One JSON object, its keys in this order, each present only when it holds a value that checks:

| Key | What | Made by | The sheet keeps |
| --- | --- | --- | --- |
| `b` | the app build that recorded the answer | `sync.js` `appVer` ("<build>-<hash>": the deploy's build number, then `app.js`'s content hash; none on a copy never deployed) | 1 to 40 of A-Z, a-z, 0-9, `.`, `_`, `-` |
| `r` | the rules version of the answer's subject the device scored it under | `core.js` `rvOf` (`RVS`, `FISH_RVS`, `SEASLUG_RVS`; rule D5) | a whole number, 0 to 99,999 |
| `f` | the record format of the entry (below) | `core.js` `ANS_FMT` | a whole number, 0 to 99,999 |
| `v` | the script version that logged it | `Code.gs` `VERSION`, added by `context_`, never taken from the app | always |

For example `{"b":"1234-ab12cd3","r":16,"f":1,"v":238}`. The build is the one that recorded the answer, not the one
that sent it (`av`, per request): an answer queued offline and sent after an update keeps its own. A live answer is
recorded when it is logged (`live.js` `liveFlush`), so its build is the one that logged it. Rows logged before the
column stay blank and are never filled in; from the script that added it every row has at least `v`, so a blank Context
means "logged before it" and `{"v":N}` alone an app that sent no Context.

### Offered

Every stimulus the question showed, with its role, one rule for every format (REE-26 point 11(b); Pierre, 2026-11-27
~08:43 Manila, «ok»: a sheet column change approved). One JSON list, in the order shown, each item `[role, unit, what]`
(`core.js` `offerOf`):

| Role | Item | What it is |
| --- | --- | --- |
| `t` | `[t, unit, photo]` | a photo of the unit asked, its file stem (a corallites hint seen included, one left closed not, as Photos) |
| `d` | `[d, unit, photo]` | a photo of another unit shown beside it as a choice: a Find the X's decoy tile |
| `a` | `[a, unit, form]` | the name asked: a Find the X's prompt |
| `c` | `[c, unit, form]` | a name offered as a choice, the right one included |
| `r` | `[r, class, names]` | a typed answer's option set, as a rule: every name the game knows for a unit of that class (its rank, then its kind of name when it has one: `genus`, `family`, `species:sci`) in the answer's content (`cv`; `quiz.js` `typeMatch`) |

The form a name showed in: `c` a common name, `s` a scientific one, then the other kind when the line under it showed
one too (`cs`, `sc`; `quiz.js` `nameForm`, by the buttons' own rule, `choiceSub`). A photo without a file id (an
iNaturalist candidate not downloaded yet) is there with an empty stem. Per format:

- **4 choices** (the photo quiz, the custom quiz, an exam, a comeback), **duel**, **Again**: `t` for each photo seen,
  then `c` for each name button (2 for a duel or an Again).
- **Find the X**: `a` (its label alone), then the four tiles in order, `t` for the unit asked's, `d` for the others.
- **Live**: `t` for each photo, then `c` for each choice, its label alone (`live.js` `liveName`).
- **Surprise card** (wink): `t` for its photo, then `c` for each of its four labels, its own text (`fish.json` wink).
- **Typed**: `t` for each photo seen, then one `r`.

For example, a Find the X: `[["a","f:Damselfishes","c"],["d","f:Wrasses","fi171204539"],["t","f:Damselfishes","fi40233250"],…]`.
The caps are sized for the long readable ids REE-311 point 9 plans (`subject:rank:Key`, at most 33 characters measured on
1,359 ids): a Find the X on such ids with 32-character photos takes about 330 characters. Logged only: no score, replay,
statistic or reader takes it, and the readers read the tab only up to Content version (`Code.gs` `READ_W`).

### Record formats

The record format `f` of the Context names the entry's keys and what each means (the table above). It is raised by one,
with its line here, whenever a key is added or removed or changes meaning, so a reader can tell a blank that means "not
recorded then" from one that means "none".

- **1** (2026-11-27, script vNEXT): the keys of the table above, `cx` and `of` the newest. The first format stamped: the
  rows before it carry none, their era read from the fields present.

## The id and its deduplication

- Made once per answer on the device and kept with it until the sheet confirms it; sent as it is at every try.
- The sheet logs an id once: `freshAnswers_` reads the Id column once per send (under the script lock) and `newIds_`
  skips an id the tab has or one met earlier in the same send, compared on its first 20 characters. The flood caps count
  only the new ones, so a resend uses up nothing.
- The tab is unique by id, whatever the name: an anonymous send of an id a save already logged adds nothing. A sign-in
  moves the device's `~anon` rows to the name (`relabel_`), ids unchanged.
- The replay counts an id once (REE-351), whatever the tab holds (a hand edit, a restore): every replay reads a
  player's rows through `Code.gs` `onceById_` (the first row of an id in the tab's order), so its record, `ids` and row
  count `n` count it once, and `core.js` `replayProgress` skips a row whose id (`LOG_RID`, from `logRow` and `rowOf_`)
  that player's rows already met (rules version 16, fish 8, sea slugs 5: every device takes that replay once, rule
  D5). A row without one (the admin's `readAnswers` rows, a study's) counts as it comes. The
  device leaves out of the answers it replays on top those the replay names (`replay.ids`: the last 500, and every one
  from `pt`, the time of the oldest it queues).

## The acknowledgement

- A reply with `log: true` means that every answer of that send whose id the sheet takes (`core.js` `logIdOk`: a-z and
  0-9 only, as every id the app makes) is now in the tab, logged by it or before it. The device then drops from its
  queue those ids it sent in that request (`sync.js` `logAcked`), never an answer queued while the send was on its way.
- An entry whose id the sheet refuses (another id, or none) is never logged, so it stays queued (REE-351): sent again
  with the next sends, at most 3 in all (`REFUSED`), then dropped with an Events line (`sync` "answers whose id the
  sheet refuses, dropped after 3 sends: N"), never silently.
- Said by a save once its answers are written, even when the progress write then fails or is refused as stale (`save`
  or `stale` with `log`); by an anonymous send once logged. A capped send (`busy`), a refused code, a lock timeout or a failure before
  logging says no `log`: the queue keeps everything for the next try.
- No reply at all (a lost reply, a timeout, `server`): the fate is unknown. The queue keeps everything and the device
  asks for the replay of its whole log (`rv` 0, `SYNC.lg`) until a save carries those answers.

## Adopting the replay (rule D9)

- A load or a save that says a rules version below the sheet's for that subject (`rv`, `rvs`; a structure stamp `sts`
  that differs counts too) gets `replay: {rv, n, rec, ids, fp, st}`. A request with no rules version gets none.
- The device adopts it once per rules version: its own queued answers not in `ids` are replayed on top under the same
  rules; then each unit's record is the log's (`core.js` `replayedOf`: the scorer's fields and the counts), with what
  the log cannot give kept from the device (`dd`, `dl`, `ro`, `cor`, an exam passed while the bar holds). A bar may go
  down. The version is then marked applied and the merge baseline becomes the replay (`replayBase`).
- Not adopted, and not marked: rules newer than the app knows (`rvOf`), a reset made since the request, a first-launch
  history that differs (`fp`), a queued answer older than the replay's last one (the next save logs it first), units not
  loaded yet. The next reply brings it again.
- So an answer the device scored, logged with its scoring record, replays to the state the device had: the test drives
  three answers through every stage and finds every field of the device's records unchanged by the adoption, but `u`
  (the scorer's count of the answers that moved a unit's bar, which the replay keeps for itself and nothing on the
  device reads). The adoption adds its marks `pm` and `rv`.

## How each sheet version trims an answer

- **The app trims to the version the sheet says** (rule D4): `logOut` leaves out a field the sheet's version does not
  store yet, in the copy sent only; the queue keeps it. Today: `pa` from `PA_SHEET` (141), `cv` from `CV_SHEET` (178),
  `cx` from `CX_SHEET` (vNEXT), `of` from `OF_SHEET` (vNEXT).
  The version read is the last `v` a reply said (the photo statistics, a load's, a save's or an anonymous send's reply),
  never below `SHEET_FLOOR` (`sync.js` `sheetV`), so a field gated at or below the floor is never trimmed and its gate is
  removed (`tests/gates.test.js`). A field trimmed is gone for that answer: the acknowledgement drops the entry that held
  it.
- **Never trimmed for want of a version** (REE-351): a save reads the version from the load before it (`syncOnce`), so
  a device that has seen no reply yet still sends what its sheet stores; an anonymous send, which no load precedes,
  holds a batch holding a field the floor trims until a reply has said a version (`sendAnon`, `sheetKnown`), and the
  photo statistics' reply (`loadStats`) then sends it.
- **The sheet keeps what it knows**: `logAnswers_` reads only the keys of the table above and checks each; an unknown
  key, or an unknown key of the scoring record, is dropped without a gate. So a new field needs a gate only when the app
  must know it was kept.
- **Older rows**: a column added later reads blank in the rows logged before it; every reader takes the columns by
  position and accepts a blank; a new column only ever goes at the end (`LOG`).

## The version signals

Four different signals meet in one answer, none of them a version of the answer itself:

1. **The sheet script's `VERSION`**, the `v` of every reply (rule D3): what the app reads as `sheetV`.
2. **The gates** `*_SHEET` (rule D4), with the floor `SHEET_FLOOR`: which fields the copy sent may carry.
3. **The rules versions** per subject (`core.js` `RVS`, `FISH_RVS`, `SEASLUG_RVS`; rule D5): the `rv` a request says and
   a replay carries, which decides whether a replay is sent and adopted.
4. **The content version** `cv` of each answer: the content its units were built from on the device. Logged only: the
   replay reads today's content from `main`, never the one `cv` names.

Beside them, `av` (the app's build, `sync.js` `appVer`) tells the sheet an app is old or behind (`oldApp_`, `behind_`);
the intake and the replay never read it. These feed REE-311 (a version per component). From script vNEXT each answer
also carries its own: the Context (above) records the build that made it, the rules version its device scored it under,
its record format and the script that logged it.

## Where the code breaks it

Each is pinned by a test named `GAP …` in `tests/answercontract.test.js` that passes on today's code:

- **The queue cap drops answers never sent.** Past 2,000 queued answers (a long time offline), `logAnswer` drops the
  oldest: "kept until the sheet confirms it" does not hold. Whether to change it waits for Pierre (the offline
  guarantee, REE-284's arbitration point).
- **The fixture writes what the sheet never does.** `tests/anslog.js` writes "I don't know" in Answered, which
  `logAnswers_` writes blank.
