# Security and abuse (bots, floods)

What is exposed, what could go wrong if bots or a malicious person find the site, and what protects it. Written
2026-11-01 when Pierre asked "what happens if an army of bots discovers my site?". Keep it current when an endpoint
or a protection changes.

## What is exposed

| Part | Who can reach it | Worst case | Protection |
|---|---|---|---|
| The site (GitHub Pages: HTML, JS, CSS, photos, `data.json`, `curation.json`) | Anyone | Nothing: static files, read-only; GitHub absorbs the traffic. | — |
| Admin (`admin.html`) | Anyone can open the page, only a GitHub token with write access to the repo can change anything | Someone with Pierre's token rewrites `curation.json`. | Fine-grained token, this repo only, 90-day expiry, stored encrypted in Pierre's browser (password). Every Publish is a commit: reversible. |
| Sync script (Google Apps Script web app, `SYNC_URL`) | Anyone (it must accept RAs without Google accounts) | Fake answers skew the photo ratings and confusion scores; fake accounts and reports clutter Users and Triage; the Sheet grows until Google limits bite (10 million cells per spreadsheet, script run quotas) and sync slows or stops for real players. | See below. |
| Leaderboard (`GET ?board=1`, v14) | Anyone | Shows each signed-in player's chosen name, progress % and Elo unless they opted out (⚙ Leaderboard: Off, an `imr-coral` setting so it holds on every device; privacy.html says so). The progress % is computed by the script from the saved progress (v16), like the Elo from the answers; a tampered app could still save inflated progress, as it could fake answers. | Cached 5 minutes; nothing else about a player is returned. Per-player numbers (the anonymous answer log, each id's ability) are admin-only from v14 (POST with the token), so a public leaderboard row can't be matched to an anonymous id and its answer history. |
| Names, reports, user management | Only with the admin GitHub token (checked by the script with GitHub) | — | `isAdmin_`. |
| Self-update of the script | Whoever can push to `main` | Arbitrary script code. | Same trust as the site itself: only Pierre and his agents push to `main`. |

No personal data beyond a chosen name is collected (no e-mail, no password; the 4-digit code is stored hashed), so a
leak of the Sheet would expose little.

## Protections in the sync script (v12)

- **Strict input**: every field is filtered (genus names, modes, photo ids, choices by pattern and length); text that
  could be read as a spreadsheet formula is neutralised (`safe_`).
- **Code per name**: a name's progress can only be written with its code; 5 wrong codes lock the name for 10 minutes.
- **Caps per 6 hours** (`over_`): 100 answers per anonymous request; 600 per anonymous id and 6000 for all anonymous
  players; 3000 answers per name; 40 new accounts; 300 report requests. Over a cap the script writes nothing and
  answers `busy` (the app keeps its answers and sends them later). The first refusal of each window is written to the
  Sheet's **Alerts** tab.
- **Duplicates**: an answer id already in the Answers tab is never logged twice.

A real class of RAs stays far below every cap. A determined attacker can still add up to ~6000 anonymous answers
and 40 accounts per 6 hours, but since v17 (2026-11-02, Pierre) the statistics count **only signed-in players whose
answers are clearly above chance** (10 answers or more, one-sided z ≥ 1.645 against each question's guess rate:
`TRUST`, `trusted_` in `Code.gs`, `trustOf` in `core.js`), and **only a player's first answer on each photo**: anonymous
answers count once their device signs in; random clicking, bots answering at chance and test runs never count. A bot
that signs in and reads the right answers from the app's data could still pull photos towards "easy", one answer per
photo and account.

## If it happens

1. Look at the **Alerts** tab and admin **Players** (Activity, Users): a burst of `~anon` ids or new names.
2. Delete the junk: admin Players > Users > Delete (with its answers) for fake names; for answers without a name, tick
   their ids under Players > Not signed in, then "Delete the answers of the selected ids" (sheet v17 `anonDelete`, admin
   token, never a named player's answers). Photo ratings and confusions are recomputed from the
   Answers tab every time, so they recover on their own.
3. Tighten a cap in `over_` calls (`tools/sync/Code.gs`, bump `VERSION`: it deploys itself) or, in an emergency, stop
   anonymous answers by having `anon_` return `busy`.

## Not done yet (ROADMAP)

- An admin switch to exclude a signed-in player from the statistics (v17 already leaves out anonymous ids and players
  at chance).
- Check server-side that the photos of an answer belong to the genus shown (needs a compact photo list in the script).
- Archive old answers to a second tab or Sheet before the 10-million-cell limit.
- Show the Alerts tab in the admin (To do).
