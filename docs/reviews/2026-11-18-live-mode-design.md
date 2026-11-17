# Live mode, version 1: design note (2026-11-18)

A trainer and a group of students answer the same photo questions at the same time: the trainer's screen is projected,
each student plays on a phone. Our own design and words (no other product's name, look or sounds).

## Decisions (Pierre, 2026-11-17 evening, Manila; Q393)

- (a) The channel is the sync script, polled ("ça pourrait suffire dans un premier temps"): no new service; about 8
  students and 2-3 s of latency are fine for a first version. The exchange is one small client module (`live.js`
  `LIVE_CH`), so a WebSocket service can later replace it without touching the screens.
- (b) Points: a right answer plus a speed bonus ("ok").
- (c) Live answers count in the progress of signed-in students ("oui"): logged like normal answers, with their own mode
  (`live`), so the log says they were live.
- (d) A session is started by someone with the trainer role ("Quelqu'un avec le rôle de trainer"), checked by the
  script, never by the page.
- (e) Students may join with a nickname without an account, and are encouraged to sign in ("Oui mais il faut les inciter
  à se logguer"); a nickname session keeps nothing after the session.

## The exchange

Every call is one `POST` to the sync script (`sheetFetch`, so a local copy or a test never reaches the real sheet: rule
D1), a JSON body with `lv` naming the step. No step carries `name`/`pin` (the trainer's account goes in `lname`/`lpin`):
a script older than this one answers them `input`
and never takes one for a progress save. The app takes a reply as the live mode's only when the script reports
`v >= LIVEGAME_SHEET` (rule D4; `vNEXT`, main's `VERSION` + 1); an older script's reply turns the page into one line,
"Live games are not available yet", and nothing else is sent.

| Step | Who | Sends | Gets |
| --- | --- | --- | --- |
| `start` | trainer | `lname`, `lpin`, subject, set's label, number of questions, seconds per question | `code` (6 digits), `tk` (the trainer's key) |
| `host` | trainer | `code`, `tk`, an action or none: `q` (the next question), `rev` (reveal), `end` | the trainer's view: phase, roster, how many answered, the reveal, the standings, the per-question summary |
| `join` | student | `code`, a nickname | `pid`, `pk` (the student's key), the name kept |
| `poll` | student | `code`, `pid`, `pk` | the student's view: phase, the question (photos and the four choices, never which is right), seconds left, own answer; at the reveal the right choice, each choice's share, own points, rank and the top 5; at the end the podium and own place |
| `answer` | student | `code`, `pid`, `pk`, question number, choice | `ok` (nothing about right or wrong before the reveal) |

The trainer's device builds each question with the app's own engine (`quiz.js`/`model.js`: `photoSet` for the photos,
`distractors` for the wrong choices, with look-alike traps) on the set it picked (an IMR lecture group, or every unit in
play), and sends it when it opens: the photos (their file stems and the address to show), the four choices (ids and
labels) and which one is right. The script keeps the right one to itself until the reveal, and scores.

**Scoring** (Code.gs `lvPoints_`): a right answer is 100 points plus a speed bonus of up to 100, in proportion to the time
left; a wrong answer or none, 0. The time runs from the moment the script first served the question to that student
(their first poll in that question), not from the trainer's click, so a phone that polls a second later is not
penalised for it. An answer is taken until the time is up plus 3 s of grace (the network), and until the reveal.

**State machine** (`lvAct_`): `lobby` → `q` (question i opens) → `rev` (reveal) → `q` (the next) … → `end`; `end` from
any phase. A question opens only from the lobby or a reveal and while questions are left; a reveal only from a question.
The trainer's page reveals by itself when the time is up or every student has answered.

**Where it lives**: the script cache (`CacheService`), never a sheet tab. One value for the session (`lv:<code>`, written
by the trainer's calls only), one for the roster (`lv:<code>:r`, written by joins only, under the script lock for a
moment), and one per student (`lv:<code>:p:<pid>`, written by that student's calls only, which the page sends one at a
time). So two writers never race on one value, and only a join takes the lock. The cache keeps a value at most 6 hours
(Apps Script's limit, under Pierre's 24 h); each write keeps it 2 hours more, and a session older than 6 hours counts as
ended. A cache can drop a value early under memory pressure (rare for values this small): the session then ends with a
message, and nothing is lost but the game's points.

## Polling and its cost

- Student: every 2 s (lobby, question, reveal), plus the answer itself; nothing once the game ended. Trainer: every
  1.5 s, plus its actions (a question, a reveal, the end); nothing once ended.
- A typical game: 8 students, 10 questions of 20 s, about 20 s of reveal each, 2 minutes of lobby: about 10 minutes, so
  8 × 0.5 × 600 ≈ 2,400 student calls and 400 trainer calls, **about 2,800 calls a game, 4.7 a second**.
- Each call reads 2-3 cache values (the trainer's: the session, the roster and the students' values in one `getAll`),
  writes at most one, and reads no sheet tab: tens of milliseconds of script time. Apps Script's quotas for a web app run
  as Pierre: 30 executions at once, 6 minutes each; no daily cap on web app calls or on the cache's reads (its limits
  are 100 KB a value and 6 hours). At 4.7 calls a second and about 0.1-0.3 s each, about 1-2 run at once: far under 30.
  The players' saves and loads go on as before; the live calls never wait for the script lock (a join waits at most 5 s
  for it, once per student).
- The existing traffic: a class's saves and anonymous sends (about one a player every few answers) and the admin's
  minute reads. The live calls add no sheet read or write, so the Answers tab's reads and the Timings tab are unchanged.
- Latency: a web app call takes about 0.6-1.5 s (Google's redirect included), so a student sees the next question within
  the poll interval plus one call: about 2-3.5 s, as Pierre allowed.

## Security of the trainer check

- `start` carries the trainer's account name and code (`lname`, `lpin`): the script checks the code against the RAs tab
  (a wrong code counts towards the 10-minute lock of `failed_`, as a load's does; an archived account is refused), then
  asks `can_({name, h}, 'live', 'instance:imr')`: the right `live` is the `trainer` role's (Code.gs `ROLES.DEF`). Nothing
  in the page decides it; the page only shows "Host" and says what the script answered. Pierre (admin and owner today)
  hosts once he grants himself the trainer role (Q364: the platform admin may), as the roles say.
- Each start is one Audit row (the account's anonymous id, `live start`, the scope, `ok`), each refusal one too, capped
  as every refusal is (`auditdeny`, 20 every 6 hours).
- The trainer's later calls carry the session's random key `tk` (18 characters), never the code again; the students'
  calls their own random key `pk`. Codes are 6 random digits; a guessed code lets someone join a game (a nickname in the
  lobby), nothing else: no answer is logged through the live channel. Joins are capped (40 a session, 400 every 6 hours
  over every session: `over_('lvjoin')`).
- What a student is sent never holds the right answer before the reveal, nor another student's key or answers; the
  reveal's top 5 holds nicknames and points only.
- Everything the trainer sends is filtered (`lvQ_`): photo stems and addresses by pattern (the site's `img/`, the photo
  bucket or iNaturalist over https, no quote or space), labels as plain text (`text_`), ids by the answer log's own
  pattern. A nickname is plain text, 1 to 20 characters.

## Data kept

- In the cache, for at most 6 hours: the session (subject, set label, the questions shown, the shares), the nicknames,
  each student's answers and points. Never a sheet tab, never an account name (a signed-in student joins under the
  first name they type or the one the app fills in).
- In the sheet: one Audit row per start (ids only). The answers of **signed-in** students are logged by their own device
  as any game answer, through the usual sync (the account's queue), with mode `live`, scored by the same scorer
  (`core.js` `scoreAnswer`, as `quiz.js` `answer` does) so the full replay counts them the same. Only for units the
  student has unlocked (rule L4: no game opens a unit; a live answer on another unit counts in nothing).
- A student not signed in keeps nothing: their answers wait in the page's tab (its session storage, so the reload of a
  sign-in loses none; Codex review #1049); if they sign in on the end screen ("Sign in to keep your 7 right answers in
  your progress") they are scored and logged then, else they are gone with the tab.
- Rule D7: nothing to clean when an account goes: the cache holds no account, the logged answers are the account's like
  any other.

## The learning check (rule L11)

Level 1: a new answer source, no change to the engine: the same scorer, the same replay, a new mode name the sheet
already accepts. Checked with unit tests and smokes only (Pierre, 2026-11-17: long simulations must never happen); no
learnsim run.

## Out of version 1

- A QR code on the lobby screen (needs an encoder of our own: no third-party script, rule U5); the code and the short
  address are shown big instead.
- Sea slugs (a subject open to a group only) and the opt-in sets (circles, families, a look-alike set, "my class's
  weakest").
- A trainer's view of each student by name after the game, cohorts (roles step 2), a session kept beyond the cache.
- A WebSocket channel (the module is ready for it), sounds, music, animations beyond the countdown.
- Typed answers, two-photo duels and Find the X in live questions.
- Answers on units a student has not unlocked (rule L4 keeps them out; Pierre may want them counted).
