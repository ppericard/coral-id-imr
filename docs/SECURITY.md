# Security and abuse (bots, floods)

What is exposed, what could go wrong if bots or a malicious person find the site, and what protects it. Written
2026-11-01 when Pierre asked "what happens if an army of bots discovers my site?". Keep it current when an endpoint
or a protection changes.

## What is exposed

| Part | Who can reach it | Worst case | Protection |
|---|---|---|---|
| The site (GitHub Pages: HTML, JS, CSS, photos, `data.json`, `curation.json`) | Anyone | Nothing: static files, read-only; GitHub absorbs the traffic. | — |
| Admin (`admin.html`) | Anyone can open the page, only a GitHub token with write access to the repo can change anything | Someone with Pierre's token rewrites `curation.json`. | Fine-grained token, this repo only, 90-day expiry, stored encrypted in Pierre's browser (password). Every Publish is a commit: reversible. |
| Sync script (Google Apps Script web app, `SYNC_URL`) | Anyone (it must accept RAs without Google accounts) | Fake answers skew the photo ratings and confusion scores; fake accounts and reports clutter admin Players and To do; the Sheet grows until Google limits bite (10 million cells per spreadsheet, script run quotas) and sync slows or stops for real players. | See below. |
| Leaderboard (`GET ?board=1`, v14) | Anyone | Shows each signed-in player's chosen name, progress % and Elo unless they opted out (⚙ Leaderboard: Off, a `reefid-sync` setting so it holds on every device; privacy.html says so). The progress % is computed by the script from the saved progress (v16), like the Elo from the answers; a tampered app could still save inflated progress, as it could fake answers. | Cached 5 minutes; nothing else about a player is returned. Per-player numbers (the anonymous answer log, each id's ability) are admin-only from v14 (POST with the token), so a public leaderboard row can't be matched to an anonymous id and its answer history. |
| Names, reports, user management | Only with the admin GitHub token (checked by the script with GitHub) | — | `isAdmin_`. |
| Self-update of the script | Whoever can push to `main` | Arbitrary script code. | Same trust as the site itself: only Pierre and his agents push to `main`. |

No personal data beyond a chosen name is collected (no e-mail, no password; the 4-digit code is stored hashed), so a
leak of the Sheet would expose little.

## Protections in the sync script (v12)

- **Strict input**: every field is filtered (genus names, modes, photo ids, choices by pattern and length); text that
  could be read as a spreadsheet formula is neutralised (`safe_`).
- **Code per name**: a name's progress can only be written with its code; 5 wrong codes lock the name for 10 minutes.
- **Caps per 6 hours** (`over_`): 100 answers per anonymous request; 600 per anonymous id and 6000 for all anonymous
  players (counted by answer, not by request: since 2026-11-08 a device not signed in sends each answer about 3 s after
  it, `sync.js` `anonSoon`, instead of 10 at a time); 3000 answers per name; 40 new accounts; 300 report requests; 200 events per device and 3000 in all (v19 error reports and one-tap answers, `events_`, 50 per request). Over a cap the script writes nothing and
  answers `busy` (the app keeps its answers and sends them later). The first refusal of each window is written to the
  Sheet's **Alerts** tab.
- **Duplicates**: an answer id already in the Answers tab is never logged twice; the same for an event id in the Events tab (v19), and in the Pages tab (v30).
- **Pages opened** (v30, `pages` events, Pierre 2026-11-03): the summary of the pages a player opened is kept only in
  the shapes `core.js` `pagesClean` allows (page names by pattern, genus names, counts and seconds clamped, an origin
  from a fixed list; at most 30 pages and 30 genera; no free text, no photo or URL), in its own **Pages** tab. It is
  filed under the admin's anonymous id of the player (`aid_`, the id `readAnswers` and the player list use), never a
  name: a device not signed in sends its anonymous answer id (`eanon`); a signed-in player's request carries the name
  and code (`ename`, `epin`, never `name`/`pin`, so no other handler takes it for a progress write), which the script
  checks against the RAs tab and does not keep. A wrong code, an unknown or a locked name store no id; the reply is the
  same either way (`{ok, ev}`), so the events cannot be used to guess a code, and a wrong code there counts no failure
  (it never locks the player's account). Read by admins only (`readEvents` with `pages: 1` and the token). They follow the answers when an account claims a device's anonymous answers, and through admin renames and merges; a delete removes them (v55, Pierre Q88: per-player behaviour, no photo use).

A real class of RAs stays far below every cap. A determined attacker can still add up to ~6000 anonymous answers
and 40 accounts per 6 hours, but since v17 (2026-11-02, Pierre) the statistics count **only players whose
answers are clearly above chance** (10 answers or more, one-sided z ≥ 1.645 against each question's guess rate:
`TRUST`, `trusted_` in `Code.gs`, `trustOf` in `core.js`), and a player's answers **weigh more as their level settles** (n / (n + 10) since v18, n / (n + 30) in v17). v17
also left out every device that never signed in; v18 (Pierre, same day) counts them under the same rule, since the
rule, not the name, is what tells a real player from a bot: random clicking, bots answering at chance and test runs
never count, signed in or not. A bot that reads the right answers from the app's data could still pull photos towards "easy" (repeats on a photo
it got right twice weigh less, as remembered).

## Left out of the statistics, and photos of another unit (v115)

Pierre, 2026-11-08 (ROADMAP "Security follow-ups"):
- **Leave out**: in admin Players (a player's bar under their row, or a device in Not signed in), **Leave out** puts the
  id in the sheet's **Stats excluded** tab (`statsExclude`, admin token). Its answers then rate no photo, confusion,
  photo memory or format offset (`stats_`), and the Analyses report leaves them out (`readAnswers` serves the ids as
  `excluded`, `tools/analyses.js` drops their rows; the change makes the report stale, so it is refitted). The player's
  own progress, level and leaderboard place stay as they are, and their answers stay in the log. **Count again** undoes
  it. A delete, merge or archive moves or drops the row (rule D7): answers kept as "~deleted <id>" stay left out. A
  device left out that signs in stays out: its row follows its answers to the name's admin id, so the whole account is
  then left out (the integrator, 2026-11-09; the admin can count it again), and the Alerts tab says so by both admin ids
  ("left out of the statistics: device <id> signed in as <id>, left out too"). The move is made only once the
  account is saved: a sign-in refused as stale, or not saved, moves nothing, and the app sends the device id again with
  its retry. This is
  for a player or device that is clearly not playing for real but still passes the trust rule, which is a bot that reads
  the right answers.
- **Photos of another unit**: an answer whose photos are game photos of another unit or subject, and none of its own
  (`photoCheck_` against every subject's game photos, `pools_`: a coral photo whose file starts with the genus counts as
  that genus's, for an older app or a photo moved since; a photo in no pool is unsure), is **logged as every answer and
  never refused**: an old app, a renamed unit or a photo moved since must not lose a real answer. A fish answer at the
  genus or species level (`g:Chromis`, `s:Chromis ternatensis`) is checked against its family's photos (the fish pool's
  units), an old fish entry id (`t01`) as the family it became. It rates no photo and no photo memory, and gives no photo
  its genus offset (`stats_`; `readStats` `skip` counts them; nor does a left-out answer). On write, the first send of
  each 6-hour window with such answers adds one line to the **Alerts** tab under the sender's admin id ("photos not of
  the unit shown: <id> (n of m answers)"), never a name. **Nothing is fetched under the script lock**: on write, and in
  a replay (whose photo stats are computed under the lock), only the pools already cached are used. The public stats
  (`?stats=1`, asked by every app), `readStats` and the admin's player list hold no lock, and they read every subject's
  pool from GitHub when it is not cached. The pools are cached 6 hours in parts (the fish pool, about 390 KB, is over
  the script cache's 100 KB a value).
- **Ids named like JavaScript's built-ins**: a unit, answer, mode, photo or choice holding a word that `Object.prototype`
  has (`constructor`, `__proto__`, `toString`…) is refused when logged, like any malformed value (`word_`). Such a row
  logged before is left out of what the script computes from the log (`answerRows_`: the photo stats, the replays, the
  hold; the photo exposure too), and the photo stats' maps have no prototype, so it can neither break them nor poison
  them. `readAnswers` still serves such a row as it is.
- Not covered: a coral photo the admin moved to another genus whose file is not named after its genus (`imrl-…`, an
  IMR lecture photo): an answer given before the move, under its old genus, is taken as another unit's and stops rating
  (it is kept; rare, and only loses ratings).

## Removed accounts (v55)

Pierre, 2026-11-05 (rule D7): deleting, merging or archiving an account cleans up every trace tied to it.
The Removed tab keeps only the name, the code hash, Into and the time: a device still signed in with that name and code
gets `gone` (its answers go to Into after a merge, nowhere after a delete) and its reports are logged under Into or under
no name, never under the removed name (`logReports_`), so they can never be credited to someone who takes the name
later with another code. The answers a deleted account leaves (`~deleted <id>`, "keep answers anonymously") are no
player anywhere: `readAnswers` flags them 2 and the admin and the analyses keep them out of every per-player view.

## If it happens

1. Look at the **Alerts** tab and admin **Players** (Activity, Users): a burst of `~anon` ids or new names.
2. A player or device that is not junk enough to delete but should not rate the photos: Players, **Leave out**
   (above). Answers with photos of another unit are already kept out of the photo ratings; the Alerts tab names their
   sender's admin id.
3. Delete the junk: admin Players > Users > Delete… > Delete everything for fake names (sheet v55: answers, reports,
   page summaries and log mentions go; only the Removed line stays); for answers without a name, tick
   their ids under Players > Not signed in, then "Delete the answers of the selected ids" (sheet v17 `anonDelete`, admin
   token, never a named player's answers). Photo ratings and confusions are recomputed from the
   Answers tab every time, so they recover on their own.
4. Tighten a cap in `over_` calls (`tools/sync/Code.gs` with its changes file, the integrator assigning `VERSION` at merge: it deploys itself) or, in an emergency, stop
   anonymous answers by having `anon_` return `busy`.

## Not done yet (ROADMAP)

- Archive old answers to a second tab or Sheet before the 10-million-cell limit.
- Show the Alerts tab in the admin (To do).
