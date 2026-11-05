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
there), always name players by their real names. Everything public or committed (code, comments, docs, tests, commits,
PR texts, GitHub comments, published pages) uses anonymous labels (P1, P2…) or made-up names, never a real player's or
staff member's name.
*Why:* he knows the players, and real names help him understand and find problems. *Source:* Pierre, standing rule,
restated 2026-11-04.

### D3

**Changing `tools/sync/Code.gs`: bump `VERSION` (header comment and constant); the script updates itself.** From v11 it
updates itself from `main` within about 15 minutes of the merge (`autoUpdate`; Pierre's setup of 2026-11-01: HANDOVER.md
"Code.gs"); check the live `v` about 15 minutes after merging, and the sheet's "Deploy log" tab says what happened.
- Never remove `autoUpdate` (the updater refuses such a version, so the script would stay behind) and keep
  `tools/sync/appsscript.json` in step (a new Google service = a new scope there = Pierre must accept it once: tell him).
- The app keeps working with an older script, so a change stays backward compatible (rule D4).
- `Code.gs` embeds `core.js` between `// BEGIN core.js` and `// END core.js` (reached as `CORE_`; the sheet replays each
  player's progress with it): after any change to `core.js`, run `python3 tools/sync_core.py --fix` and bump `VERSION`
  (CI runs `--check`), so the live script always runs the app's engine.
- If you change the Elo in `stats_`, change its copy `eloOf()` in `core.js` too (with the photo memory estimate `MEM`
  and the genus offsets of the hierarchical photo Elo, `GENUS_K`, `genusOffsetsOf`), and likewise the pair counts
  `conf` in `stats_` and `confusionOf()` (`tests/core.test.js` checks both agree).
- The sheet's `VERSION` is not stamped by the deploy (rule W15): bump it by hand.

*Why:* no more copy and paste by Pierre. *Source:* Pierre, 2026-11-01.

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
replay"). Run `python3 tools/sync_core.py --fix` and bump `Code.gs` `VERSION` (rule D3).
- **Every rules version takes the standard recalculation card, `msg: RV_CARD`** (don't ask Pierre per version): an
  announcement card in plain words (`core.js`), shown once at app open on every device that skipped the version, never
  held (rule D6; `only: 'changed'`, `min: 5`), **only to the players whose progress % the replay moved by 5 points or
  more, either way** (everyone, if it moves everyone that much), `{from}` and `{to}` in its text giving the two %. Ask
  Pierre only if a version needs a different text. A device that skips several versions with the same card sees it
  once (`core.js` `rvMsgs`).

*Why:* progress is recalculated from the whole answer log, automatically, never by a human click, now and whenever the
progress engine changes. *Source:* Pierre, 2026-11-03.

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
  in, and right after a pull that brings the change), on whatever page they land on, once per device, marked seen by its
  button; no visit floor (`noOpen`) and no prompt spacing (`promptOk`). It only waits for another card or the tour
  already on screen, then follows it (`progress.js` `recalcNotice`, `mxLostNotice`, `rvNotice`). The other prompts
  (sign-in nudge, one-tap question, open-all and bonus genera offers) keep `promptOk`.

*Source:* Pierre, 2026-11-02; learned marks and cards never held, 2026-11-03.
