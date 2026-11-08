# Sheet and data rules: the sync sheet, players' data, progress rules

Pierre's standing rules on the sync sheet (`tools/sync/Code.gs`), players' data and changes to the progress engine.
Specs: [ARCHITECTURE.md](../ARCHITECTURE.md) "Progress sync", [SECURITY.md](../SECURITY.md) (security model and abuse
handling), [LEARNING.md](../LEARNING.md) "Full replay". Who may read or write the sheet: AGENTS.md "Working mode", "Data
access". The index of every rule is in [AGENTS.md](../../AGENTS.md#the-rules).

### D1

**Your tests never reach the real sheet.** The app sends nothing to the sheet from a local copy or a browser driven by a
program (`app.js` `LOCAL`: localhost, 127.x, `file:`, `navigator.webdriver`), signed in or not: signing in, saving and
loading an account go through `app.js` `sheetFetch`, which a local copy answers only from a test's `window.SHEET_STUB`
(`tests/pages.smoke.js`). Never work around it (a made-up host name, a patched `LOCAL`, a stubbed
`navigator.webdriver`): network mocks (`route`) miss the requests a page sends while it unloads. To test the sending
code, run it against stubs (`tests/sync.test.js`, a wrapped `fetch` as in `tests/net.smoke.js` check 11) and map the
sync script's hosts to this computer (`--host-resolver-rules=MAP script.google.com 127.0.0.1, MAP
script.googleusercontent.com 127.0.0.1`) so nothing that escapes can reach Google. If test data did reach the sheet,
tell Pierre at once: which rows, and how to remove them.
*Why:* an agent's test that served the app under a made-up host name put 100 made-up answers and 6 events in the sheet.
*Source:* Pierre, 2026-11-03.

### D2

**Player names: real in chat, anonymous in the repo.** When talking with Pierre (chat, reports, analyses he reads
there, tables included), always name players by their real names, spelled as the sheet spells them (tab RAs, column A),
never as a voice transcription of Pierre's messages renders them. Everything public or committed (code, comments, docs, tests, commits,
PR texts, GitHub comments, published pages) uses anonymous labels (P1, P2…) or made-up names, never a real player's or
staff member's name.
Names are never a reason to keep something off GitHub: a note, a study, a status or a ledger that belongs in the repo
goes there with each real name replaced by a stable pseudonym. The pseudonym is the player's anonymous id as the
admin's Players page shows it beside the name, so Pierre and the integrator can always map it back from the admin;
when that id is not at hand, use P1, P2… and keep the mapping outside the repo (STATUS records where), never in a
committed file. Raw data holding names (sheet exports) stays out of the repo and is deleted when no longer needed.
*Why:* he knows the players, and real names help him understand and find problems; work kept only on one machine is
lost when the container goes. *Source:* Pierre, standing rule, restated 2026-11-04; pseudonyms 2026-11-05; tables and the sheet's spelling, 2026-11-08.

### D3

**Changing `tools/sync/Code.gs`: one changes file in the PR, `VERSION` assigned by the integrator at merge; the script
updates itself.** A PR never edits `const VERSION` nor the header's history line (line 1): it adds one file,
`tools/sync/changes/<branch>.md` (its branch name, `/` as `-`), holding its history entry as the header reads (what the
script now does and why, Pierre and the date; no version number). Where its comments or docs name the new version it
writes `vNEXT`; a new gate on the script's version (rule D4) takes `main`'s `VERSION` + 1. Right before the merge the
integrator brings the branch up to date with `main` and runs `python3 tools/sheet_version.py --assign`: `VERSION` + 1,
the entry folded into the header line and ARCHITECTURE.md's version history, every gate the PR adds or changes and
every bare `vNEXT` set to it, the file removed; that head is checked and reviewed like any other, then merged (docs/INTEGRATOR.md).
`python3 tools/check_versions.py` checks both states; `main` never holds a changes file. From v11 the script updates
itself from `main` within about 15 minutes of the merge (`autoUpdate`; Pierre's setup of 2026-11-01: HANDOVER.md
"Code.gs"); check the live `v` about 15 minutes after merging, and the sheet's "Deploy log" tab says what happened.
- Never remove `autoUpdate` (the updater refuses such a version, so the script would stay behind) and keep
  `tools/sync/appsscript.json` in step (a new Google service = a new scope there = Pierre must accept it once: tell him).
- The app keeps working with an older script, so a change stays backward compatible (rule D4).
- `Code.gs` embeds `core.js` between `// BEGIN core.js` and `// END core.js` (reached as `CORE_`; the sheet replays each
  player's progress with it): after any change to `core.js`, run `python3 tools/sync_core.py --fix` and add the changes
  file (CI runs `--check`), so the live script always runs the app's engine.
- If you change the Elo in `stats_`, change its copy `eloOf()` in `core.js` too (with the photo memory estimate `MEM`
  and the per-unit offsets of the hierarchical photo Elo, `GENUS_K`, `genusOffsetsOf`), and likewise the pair counts
  `conf` in `stats_` and `confusionOf()` (`tests/core.test.js` checks both agree).
- The sheet's `VERSION` is not stamped by the deploy (rule W15): `--assign` sets it at merge, never a PR.

*Why:* no more copy and paste by Pierre; two open PRs never collide on the number. *Source:* Pierre, 2026-11-01;
subject-neutral wording, 2026-11-06; assigned at merge, 2026-11-08 (Q305).

### D4

**The app never gets ahead of the sheet script.** After a merge the app is live within minutes, the script only at its
next self-update (up to 15 minutes later). So any app feature that needs a sheet script version N (a new call, a new
reply field, a new rule the app relies on) turns on only when the script reports `v` >= N in its replies (load, stats),
and does exactly what it did before otherwise, silently: no error, no half-working screen, no lost answer. A change the
old script handles as it is (it stores the new value as it comes, and every number derived from it is recomputed from
the answer log, as typed answers `|t` with v27) needs no gate: say so in the PR. The PR states which script version the
app waits for. After merging a `Code.gs` change, read the sheet's "Deploy log" tab (read-only) until the new version is
deployed, and tell Pierre. This holds in the alpha phase too (rule W3).
*Source:* Pierre, 2026-11-03.

### D5

**Every change to a progress rule appends a rules version.** A change to anything that moves a player's progress (what
an answer weighs, the moving average, the ability step, the photo memory, what the replay keeps from the device:
`core.js` `replayProgress`, `replayedOf` and what they call) adds an entry at the end of `core.js` `RVS` (`v` the next
number, `at`, `why`, `msg`). The sync sheet then replays every player's log with the new rules at their next sign-in,
load or save, and each device adopts it once (`Code.gs` `replay_`, `sync.js` `replayAdopt`; LEARNING.md "Full
replay"). Run `python3 tools/sync_core.py --fix` and add the sheet changes file (rule D3).
- **Every rules version takes the standard recalculation card, `msg: RV_CARD`** (don't ask Pierre per version): an
  announcement card in plain words (`core.js`), shown once at app open on every device that skipped the version, never
  held (rule D6; `only: 'changed'`, `min: 5`), **only to the players whose progress % the replay moved by 5 points or
  more, either way** (everyone, if it moves everyone that much), `{from}` and `{to}` in its text giving the two %. Ask
  Pierre only if a version needs a different text. A device that skips several versions with the same card sees it
  once (`core.js` `rvMsgs`).

*Why:* progress is recalculated from the whole answer log, automatically, never by a human click, now and whenever the
progress engine changes. *Source:* Pierre, 2026-11-03; the changes file, 2026-11-08 (Q305).

### D6

**Announce a recalculation of everyone's progress with a real pop-up.** When a change recalculates every player's
progress, returning players see one pop-up at their next visit, in plain words, without the algorithm's details
(`RECALC` in `progress.js`: give it a new `ID` and text). Discreet notes are for new features, not for this. One
exception so far: the photo memory recalculation of 2026-11-03 is silent (the bars only move down 1-3 points;
`core.js` `memRecalc`).
- **A learned mark taken away by a recalculation is never silent** (players know they test an early beta): run the
  recalculation through `model.js` `mxRecalc`, which tells the players concerned once with a card and takes back the
  learned-based achievements they no longer meet (LEARNING.md "Learned under the former model").
- **Announcement cards are never held**: a card that announces a rule change, a learned mark taken away or a big new app
  version shows as soon as the player opens or reconnects to the app (once the first page is drawn and the progress is
  in, and right after a pull that brings the change), on whatever page they land on, once per account, marked seen by its
  button; no visit floor (`noOpen`) and no prompt spacing (`promptOk`). It only waits for another card or the tour
  already on screen, then follows it (`progress.js` `recalcNotice`, `mxLostNotice`, `rvNotice`), and, signed in, for
  the visit's first sync, so a card seen on another device of the account is not shown again (`sync.js`
  `noticeLater`, `core.js` `TOLD`; Pierre, 2026-11-08). The other prompts
  (sign-in nudge, one-tap question, open-all and bonus genera offers) keep `promptOk`.

*Source:* Pierre, 2026-11-02; learned marks and cards never held, 2026-11-03; after the first sync, once per account,
2026-11-08.

### D7

**A deleted account leaves nothing in normal operation.** Deleting, merging or archiving an account cleans up every
trace tied to it (sheet tabs, reports, page summaries, log mentions, caches, analyses, the device's queues); what is kept
is either the Removed tombstone (so its devices get 'gone') or an archive that no normal feature, view or count reads,
except anonymised answers in the pooled photo statistics. A new store of player data names its delete, merge and archive
behaviour in the same PR (`Code.gs` `deleteAccount_`; ARCHITECTURE.md "Progress sync", SECURITY.md "Removed accounts").
*Why:* keeping data as an archive is fine, but archived means not used in normal operation; a test account's report,
kept after its delete, was shown in the Inbox as a live player's. *Source:* Pierre, 2026-11-05 (the deleted-accounts
audit, Q84-Q91).
