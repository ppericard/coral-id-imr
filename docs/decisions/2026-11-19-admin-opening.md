# Admin opening on a phone: curation.json read raw and kept by sha, suggest.json no longer holds a Players page back

Date: 2026-11-19. PR: #1271. Rules or docs touched: A2 (unchanged); docs/spec/admin.md "What the first page waits for";
docs/spec/storage.md "Caches"; ROADMAP "Admin opening on a phone, what is left" and the declined row of 2026-11-04.

## Context

Pierre, 2026-11-19: «la page admin sur mon téléphone met de plus en plus de temps à s'ouvrir […] notamment la première
fois que je me connecte depuis un moment». The admin opens on Players › Activity. Measured in Chromium at a phone profile
(390 px, CPU x4, 1.6 Mbps, 150 ms, gzip like GitHub Pages), cold, the admin in its token mode with the GitHub API and the
sheet served by the harness from the demo's replies (the answer log is made up: the demo's, times 12, 38,712 answers), the
first Activity content came at 19.3 s: about 3.9 MB before the page (scripts 0.56 MB gzipped; `curation.json` by the
contents API then the blob as base64 in JSON, 0.89 MB gzipped on GitHub and 3.6 MB to decode; `suggest.json` 0.4 MB gzipped,
3.5 MB parsed and laid over the candidates; the answer log 1 MB gzipped, 6 MB of JSON; `data.json` and the small files),
`start()` waiting for the slowest of 13 files (8 to 11 s), and the fish auto-sort reading 1.1 MB (10 MB of JSON) at idle.
It is bandwidth first: the page draws when the last byte of the log is in.

## Decision

Integrator's call (an implementation detail of the admin, easy to correct; Pierre's report is low priority and a fix of
something plainly broken), after the measure:
- `curation.json` is read as the blob's raw bytes (0.54 MB gzipped, nothing to decode), checked against the blob's sha,
  and kept in Cache Storage under that sha (the latest only). Public data: not the copy of players' data declined on
  2026-11-04 (ROADMAP "Declined for now").
- `suggest.json` is not waited for by a Players page. This reverses the ROADMAP's "Measured and declined (2026-11-04)":
  that measure was warm, where the log came at 3.5-4 s and the files were in at 1.2 s, so about 0 s was gained. Cold on a
  slow line the files are still coming when the log does and the file is 2-3 s of 19. The cost it named stays: the
  header's Inbox count leaves out the suggestions until they are laid, a few seconds after Activity. Every other page
  waits for them as before.
- Not done, and why: the answer log (the largest wait left) needs the declined copy of players' data, or a leaner reply
  from the sheet (a script change, rule D4); the fish auto-sort at idle and the Analyses scripts are in the ROADMAP row.

## Consequences

Medians of three runs, base and new interleaved, in seconds to the first Activity content: cold 19.3 and 19.6 before,
16.2 and 16.1 after (-17%); with 3,226 answers 15.2 before, 12.1 after; a second visit with `curation.json` in Cache Storage
(the harness has the HTTP cache off, so not a true warm visit) 19.7 before, 14.0 after; main-thread long tasks 3.7 s before,
2.6 s after. The raw read alone moved the cold time little (the log and the scripts set it); the deferral is the cold gain,
the cache by sha the repeat gain. `ghFile` returns the same text and sha; a reply that is not the blob, a refused media
type and a failing cache all fall back to the base64 read. The demo opens as before (`?demo&late` opens it late, for
`tests/admin.smoke.js` `loadPart`). The figures come from a harness, not the real sheet: re-read them on the phone.
