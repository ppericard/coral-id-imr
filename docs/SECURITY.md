# Security and abuse (bots, floods)

What is exposed, what could go wrong if bots or a malicious person find the site, and what protects it. Written
2026-11-01 when Pierre asked "what happens if an army of bots discovers my site?". Keep it current when an endpoint
or a protection changes.

## What is exposed

| Part | Who can reach it | Worst case | Protection |
|---|---|---|---|
| The site (GitHub Pages: HTML, JS, CSS, photos, `data.json`, `curation.json`) | Anyone | Nothing: static files, read-only; GitHub absorbs the traffic. | — |
| Admin (`admin.html`) | Anyone can open the page, only a GitHub token with write access to the repo can change anything | Someone with Pierre's token rewrites `curation.json`. | Fine-grained token, this repo only, 90-day expiry, stored encrypted in Pierre's browser (password). Every Publish is a commit: reversible. |
| Sync script (Google Apps Script web app, `SYNC_URL`) | Anyone (it must accept RAs without Google accounts) | Fake answers skew the photo ratings and confusion scores; fake accounts and reports clutter admin Players and To do; the Sheet grows until Google limits bite (20 million cells per spreadsheet, script run quotas) and sync slows or stops for real players. | See below. |
| Leaderboard (`GET ?board=1`, v14) | Anyone | Shows each signed-in player's chosen name, progress % and Elo unless they opted out (⚙ Leaderboard: Off, a `reefid-sync` setting so it holds on every device; privacy.html says so). The progress % is computed by the script from the saved progress (v16), like the Elo from the answers; a tampered app could still save inflated progress, as it could fake answers. | Cached 5 minutes; nothing else about a player is returned. **Staff and cohort boards** (vNEXT): the same rows split by who is where, every scope public like the general board (Pierre, 2026-11-17: "ça serait rigolo que les étudiants voient le leaderboard du staff et inversement"): `staff` lists the trainers (so the board says who holds the trainer role), `cohorts` each cohort's display name and its members' rows; an opted-out, hidden or archived player is on none, and a cohort's membership is never listed apart from its board (a member with no answer yet or opted out does not show). The player's own cohort comes in their load and save replies only (code checked). Per-player numbers (the anonymous answer log, each id's ability) are admin-only from v14 (POST with the token), so a public leaderboard row can't be matched to an anonymous id and its answer history. |
| Names, reports, user management, roles | Only with the admin GitHub token (checked by the script with GitHub) | — | `gate_` → `can_()` (roles step 1, below); the token reached through `caller_` → `isAdmin_` only. |
| Self-update of the script | Whoever can push to `main` | Arbitrary script code. | Same trust as the site itself: only Pierre, his agents and the Candidate photos workflow's bot push to `main` (its credentials: below). |
| The weekly backup to pCloud (sheet v139, [BACKUP.md](BACKUP.md)) | The script only; the credential is the Script Property `PCLOUD_UPLOAD_CODE` (the code of a pCloud upload link, v144, the one Pierre uses) or `PCLOUD_TOKEN` (a pCloud OAuth token; used when both are set) | Code pushed to `main` runs as the script, so it can read that credential (as it can `ANON_SALT`). The upload link's code only adds files to the link's folder: it cannot read, list or delete anything, so a leaked code lets someone fill that folder (up to the link's limits, or Pierre's pCloud space), not read the backups. The token reaches everything the pCloud app was allowed to reach. A backup file leaked from pCloud exposes the sheet: names, code hashes, answers. | Either is sent only to `api.pcloud.com` or `eapi.pcloud.com` (any other `PCLOUD_HOST` is refused before any request) and never logged or returned (`backup_` scrubs both, as typed and URL-encoded, from any error text; only pCloud's numeric result is logged; `tests/backup.test.js`). The token goes only in the `Authorization` header (never a URL, which fetch errors can echo); the code goes in the `uploadtolink` URL, the only form pCloud documents, with no `Authorization` header. Revoke: delete the upload link in pCloud (code), or the app (token). |

No personal data beyond a chosen name is collected (no e-mail, no password; the 4-digit code is stored hashed), so a
leak of the Sheet would expose little.

## The Candidate photos workflow's push to `main`

`.github/workflows/approved-photos.yml` downloads and decodes files from the internet (photos and JSON from iNaturalist
and FishBase, decoded by Pillow installed from PyPI) and pushes its results to `main`, which the sync script updates
itself from. Since the security check of 2026-11-13 and its follow-ups:
- the workflow's token is read-only by default. The jobs that download and decode (`photos`, `fish`) and the `r2` job
  read only; each of the first two hands its result to a push job as an artifact: the staged diff of its own files
  (binary, renames off) and the commit of `main` it applies to;
- only the two push jobs (`photos-push`, `fish-push`) get `contents: write`. They run no repository code and nothing
  downloaded (a checkout of `main`, the artifact, their own shell), and treat the artifact as hostile: the base must be a
  commit of `main` (else `git pull --rebase` would carry foreign commits onto it); before anything is written, every
  path the diff changes must be one of their job's files (`git apply --numstat`: `data.json`, `cand.json`,
  `excluded.json`, `fish-game.json`, `fish-photos.json`, `img/<name>`, and since the licence refresh of 2026-11-15
  `fish-cand.json` and `tools/fish_refs.json`, the sources of the fish photos in play that `tools/licences.py` updates;
  `fish-cand.json`, `tools/fish_refill.json`) and its only extended
  headers a regular file created or deleted (`git apply --summary`: a rename, a copy, a mode change, a symlink are
  refused); once applied, the staged files are checked again (paths, mode 100644 or deleted, nothing else changed).
  Then they commit under the bot's name and the same message as before, rebase on today's `main` and push
  (`tests/photospush.test.js` runs their shell on crafted patches);
- every checkout has `persist-credentials: false`: no token is written to `.git/config`, and the git reads after it
  (the blobs fetched on demand, `git pull --rebase`) go without one, the repository being public;
- the write token is given only to the push jobs' `Commit` steps, in their own environment, and handed to `git push`
  alone as an HTTP header for that one process (`GIT_CONFIG_*`), its base64 form masked in the log;
- Python packages are installed by hash (`pip install --require-hashes -r tools/requirements.txt`, here and in Checks):
  a Pillow file swapped on PyPI or on the way is refused.

So code that takes over a download or decode step (a decoder exploit, a compromised package) runs in a job with a
read-only token and no write credential anywhere; the most it can do is hand over a diff of its own job's files, which
the push job commits as it would the real result (that is the trust the workflow needs: it writes those files).
**Not covered**: the `photos` job still holds the R2 keys for its upload of the new photos (`tools/r2_sync.sh
r2-upload`, before the commit marks them downloaded): such code could write to the photo bucket (never to `main`).
Like any job, a read-only one also holds the runner's own token for artifacts and the Actions cache: such code could
save a cache entry under `main` that a later run restores (the Smokes' Playwright Chromium cache, when `main` has none
of that key yet); those runs hold read-only tokens too.

## Protections in the sync script (v12)

- **Strict input**: every field is filtered (genus names, modes, photo ids, choices by pattern and length); text that
  could be read as a spreadsheet formula is neutralised (`safe_`).
- **Code per name**: a name's progress can only be written with its code; 5 wrong codes lock the name for 10 minutes.
- **Caps per 6 hours** (`over_`): 100 answers per anonymous request; 600 per anonymous id and 6000 for all anonymous
  players (counted by answer, not by request: since 2026-11-08 a device not signed in sends each answer about 3 s after
  it, `sync.js` `anonSoon`, instead of 10 at a time); 3000 answers per name; 40 new accounts; 300 report requests; 200 events per device and 3000 in all (v19 error reports and one-tap answers, `events_`, 50 per request). Over a cap the script writes nothing and
  answers `busy` (the app keeps its answers and sends them later). The first refusal of each window is written to the
  Sheet's **Alerts** tab, which the admin shows in To do › Alerts (below).
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
  pool from GitHub when it is not cached. Stats made under the lock while a pool was not cached are kept apart as
  unchecked (`chk: 0`): the public stats and `readStats` never serve them, they read the pools and make them again. The pools are cached 6 hours in parts (the fish pool, about 390 KB, is over
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
The admin's account (v125, the 🌱 after its name) is kept by its code hash in the script's properties (`ADMIN_ACCT`), set
only by a read with the admin's token from the admin page signed in to that account (its code checked), never from what a
player sends; a delete, a merge (its from) and an archive clear it, and no player can type the seedling or a look-alike
in a new name (`core.js` `reservedName`).
The weekly backups to pCloud (sheet v139, [BACKUP.md](BACKUP.md)) are copies of the whole sheet as it was: an account
deleted, merged or archived stays in the backups made before, until they are deleted (through the upload link, the
script cannot delete: Pierre prunes them by hand; with a token, the 12 newest are kept), then pCloud's trash. No feature reads them; they are opened only to restore (privacy.html says so).
The pooled stats' snapshots (sheet v134, the `Stats` tab; v137, one per subject: `Stats Fish` too; ARCHITECTURE.md
"Progress sync"): each fold keeps, by admin
id and never by name, each player's trust counts, ability, photo memory and the last day's answers (unit, answer, mode,
photos, choices, expectation), never served. A delete, a merge or an archive (`rosterChanged_`), a change to who is left
out of the statistics and `anonDelete` blank every subject's at once and drop the replies served (`statsDirty_`), and the next run of
the trigger builds it again from the Answers tab as it is then (a run writes under the script lock, which a delete
holds, and writes nothing when one came since it began); meanwhile `?stats=1` makes the stats from the whole log
as before. The reply it serves holds what `?stats=1` always sent (photo ratings, confusions, offsets), no player.
Its row 4 (sheet v145) holds what the admin's `readStats` adds, each player's ability by admin id, never a name, and
is read only with the admin token; the same deletes blank it with the fold, and the archived players are left out
when it is read.
The Roles tab (sheet v156, below): a delete, a self-delete, a merge (its from) and an archive drop the account's
grants (`rolesDrop_`), never move them to Into or to the archive name, so whoever takes the name later holds nothing (a
grant also holds only for the code hash it was made for). Each dropped grant writes an Audit row, by anonymous id. The
Audit tab keeps its rows: they hold anonymous ids only, never a name, and nothing reads them in normal operation.

## Roles and the Audit tab (sheet v156, roles step 1)

Pierre, 2026-11-13 (Q342-Q349, ROADMAP "Roles, instances and cohorts"): scoped roles, enforced by the sync script, never
by the page; 2026-11-15 (Q364): rights are separate, the platform admin may grant himself a role, and the grant is
logged; (Q365) the pilot's name and 4-digit code are enough for now.
- **Grants**: the Roles tab, one row a grant (Account, Role, Scope, Since, Code hash). Roles and what they give:
  `admin` at `platform` (the code, the base database, creating instances; it may grant any role at any scope), `owner`
  at an instance (its players, its settings, granting its roles), `editor` at an instance (its content), `trainer` at
  an instance (its cohorts, from roles step 2). The player role is every account's and is not stored. This sheet serves
  one instance, `instance:imr` (`Code.gs` `INSTANCE_`; Q343, one shared sheet for now).
- **One check**: every privileged endpoint calls `gate_(token, right, action)`, which asks `can_(caller, right,
  scope)`. Today's endpoints need the `players` right on `instance:imr`; the roles list and `roleGrant` / `roleRevoke`
  need `grant` at the grant's scope.
- **The admin token is the platform admin, with every right.** A token that can push to the repository can change this
  script, so no right is withheld from it. Q364's separation holds for the grants an account holds: an account holding
  only `admin` is refused an instance's players and content until it holds that instance's role.
- **Callers today: the token only** (`caller_`). `can_` already answers for an account (its name and its code hash), but
  no endpoint takes an account's name and code as its caller yet, so who may do what is unchanged. Letting a granted
  account act with its name and code is a later step (the editors' relay, the trainer view).
- **The staff** (vNEXT; Pierre, 2026-11-17, "techniquement le staff aurait les droits de 'trainer' dans l'app"): the
  accounts holding `trainer` at `instance:imr`, under the code hash the grant was given to (`staffSet_`), have a
  leaderboard of their own and leave the general board and the cohorts' (`board_`). The admin page's Players › Staff
  Add / Remove sends `roleGrant` / `roleRevoke` for that role (the token, audited as any grant); the trainer role gives
  no other right yet (its `cohorts` right waits for roles step 2). The cohorts are, for now, the admin's own groups in
  the Groups tab (`userGroup` with `cohort`, the `players` right, audited as `userGroup`).
- **Pierre's grants**: platform admin, and owner and content editor of `instance:imr`. Given once, as self-grants by
  the token, to the admin's account (`ADMIN_ACCT`) the first time the admin page reads the answer log signed in to it
  (`rolesSeed_`). A property marks it done, so a revoke or a delete is never silently granted again. It is marked done
  only once every grant has its Audit row (v159): a try that fails part way (a Sheets error) writes a Deploy log line,
  and the admin page's next read finishes it.
- **The Audit tab**: Time, Admin id, Action, Scope, Result, Target id. One row per change (the players' management, the
  Analyses report's put, each grant and revoke, a self-grant marked `(self)`), and per refusal at most 20 every 6 hours
  (`over_`: anyone can send one; refusals take no script lock). Reads are not written: the admin page reads every
  minute. Every id is an anonymous id: `aid_` for an account, `gh:` and 8 characters for a token (a salted hash, never
  the token; blank for a refusal, whose caller is nobody known), never a name; the target of a request is written as
  its id, never the name it carries.
  A grant is never without its row (v159, `grantPut_`): a row that cannot be written fails the grant (the request
  answers an error), and the next try of a grant held with no `ok` row since its last revoke (`grantAudited_`) writes
  that `ok` row instead of `held`. A row that cannot be written is a line in the Deploy log (`roleLog_`, the same line
  at most once an hour), never silent.
- **No editor or trainer ever gets a GitHub token that can push** (Q342): their later steps go through this script.

## The Alerts tab in the admin (v152)

Pierre, 2026-11-01 (ROADMAP "Security follow-ups"): admin **To do › Alerts** (`#inbox/todo/alerts`, the same page on
every subject's side) shows the tab's lines of the last 30 days, newest first, counted by kind, read-only. The script
serves them with `readAlerts` (the `players` right through `gate_` since roles step 1, so the admin token only today,
as `readEvents`; its last 3000 lines). The tab holds only what the
script writes there itself, never what a player sends:
- `limit reached: <key> (<limit> per 6 h)` (`over_`), the key being `a:<id>` (a device not signed in: its random
  anonymous id, no name), `anon`, `n:<name>` (a signed-in player's answers), `newacct`, `reports`,
  `ev:<device id>`, `events`, `old`, `selfdel`, `sd:<admin id>` or `auditdeny` (the Audit tab's refusals, roles step 1);
- `photos not of the unit shown: <admin id> (n of m answers)` (`photoCheck_`);
- `left out of the statistics: device <admin id> signed in as <admin id>, left out too`.

The one name is the per-name cap's `n:<name>` (lowercased). `readAlerts` serves it as the name's admin id (`aid_`, the
id admin Players shows beside the name), so the page shows no name, fewer than the Events tab, whose old-app notes name
the player in brackets; the tab itself keeps the name, as before. A delete or a merge rewrites that mention in the tab
(`redact_`: `~deleted <id>`, or the name it joined); an archive moves it to the archive's name.

**Rule D7** (the integrator, 2026-11-16): a line that names an account or a device (`n:<name>`, `sd:<admin id>`, the
photos line, the left-out line by the account the device signed in as) is served only while its admin id is a current
writer's: a live account (an RAs row, not archived) or a device not signed in that still has answers (`~anon <id>` in
the Answers tab). So the page shows and counts nothing of a deleted (`~deleted <id>`), merged-away or archived account,
nor of a device once it signed in (its answers are the account's) or was deleted; the tab keeps every line. The lines
that name nobody stay (`a:` and `ev:` device ids, the global caps). **Not covered** (ROADMAP "Alerts lines of a name
taken again"): an admin id is the name's, so a new account under a deleted or archived account's name shows that old
account's id lines again; closing it means rewriting those ids in the tab, a write-path change for its own PR.

## If it happens

1. Look at admin **To do › Alerts** (the sheet's **Alerts** tab) and admin **Players** (Activity, Users): a burst of
   `a:` or `newacct` lines, of `~anon` ids or new names.
2. A player or device that is not junk enough to delete but should not rate the photos: Players, **Leave out**
   (above). Answers with photos of another unit are already kept out of the photo ratings; the Alerts tab names their
   sender's admin id.
3. Delete the junk: admin Players > Users > Delete… > Delete everything for fake names (sheet v55: answers, reports,
   page summaries and log mentions go; only the Removed line stays); for answers without a name, tick
   their ids under Players > Not signed in, then "Delete the answers of the selected ids" (sheet v17 `anonDelete`, admin
   token, never a named player's answers). Photo ratings and confusions are recomputed from the
   Answers tab (the pooled stats' snapshot is rebuilt within a run or two of the trigger), so they recover on their own.
4. Tighten a cap in `over_` calls (`tools/sync/Code.gs` with its changes file, the integrator assigning `VERSION` at merge: it deploys itself) or, in an emergency, stop
   anonymous answers by having `anon_` return `busy`.

## Not done yet (ROADMAP)

- Archive old answers to a second tab or Sheet before the 10-million-cell limit.

(Showing the Alerts tab in the admin is done: To do › Alerts, above.)
