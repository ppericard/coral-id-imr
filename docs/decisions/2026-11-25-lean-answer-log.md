# Admin opening on a phone: the answer log comes column by column, the same rows in about half the bytes

Date: 2026-11-25. PR: #1579. Rules or docs touched: D4 (a new gate, `LEAN_SHEET`); docs/spec/sync.md "The lean answer
log"; docs/spec/admin.md "What the first page waits for"; docs/spec/tools.md (`tools/ansize.js`).

## Context

Pierre, 2026-11-19: «la page admin sur mon téléphone met de plus en plus de temps à s'ouvrir». After the admin's own
files were taken off the opening's path ([2026-11-19](2026-11-19-admin-opening.md), [2026-11-20](2026-11-20-admin-lazy-loads.md)),
the answer log is the largest wait: the sheet's `readAnswers` sends every answer as a row of 24 values. Measured first
(`tools/ansize.js`, made-up logs through the script on the tests' stub, Node on a desktop): at today's size, about 7,700
answers, the reply is 1.93 MB (0.40 MB gzipped), 250 bytes an answer; at three times that, 5.77 MB (1.20 MB). What takes
the bytes: the scoring record (16% raw, its key names and numbers), the choices (15%) and the photos (12%), each a text
of names and ids repeated across the log, then the times (13 digits each), the units shown and answered, the anonymous
ids; JSON's quotes and commas around each of the 185,000 values. Parsing it takes 7 ms in Node: the wait is bytes.

## Decision

Integrator's call (the format of a reply between the script and the admin, which nothing stores: easy to correct, rule D4
for the gate), on REE-39's next action ("design the leaner row format in `Code.gs`, gated by script version"):
- The admin asks for the log lean and the script sends it column by column, each column in the shortest of a few
  spellings chosen from its values alone (`core.js` `rowsPack`; docs/spec/sync.md "The lean answer log"). No field is
  dropped: the admin gets back exactly the rows the plain reply holds (`rowsUnpack`), proved on made-up logs at 7,700
  and 23,100 answers and on a fixture of every kind of value (`tests/ansrows.test.js`), so no page and no reader changes.
- Gate: the request always carries `lean`; a script before `LEAN_SHEET` ignores it and sends rows, which the admin reads
  as before; a reply is read as lean only from `LEAN_SHEET`. The plain reply stays for every request without `lean`
  (`tools/analyses.js`, the tools that read a saved reply).
- Not done: a reply holding only the rows since the last visit (it needs the declined device copy of players' data,
  Pierre's call); the light read `readLive` (50 rows a minute) stays as it is.

## Consequences

At 7,700 answers the reply is 0.81 MB (42%), 0.22 MB gzipped (55%); at 23,100, 2.36 MB (41%), 0.61 MB gzipped (50%). On a
slow phone line (1.6 Mbps) that is about 0.9 s less today and 3 s at three times the log if Apps Script gzips the reply,
5.6 s and 17 s if it does not (not measured: the harness cannot show the wire). The admin's read takes about 16 ms more
in Node (23 ms in place of 7, the rows rebuilt), the script's about 45 ms more (packing 50 ms, writing 6 ms less); its
real time is the Timings tab's `admin answers`, to read after the deploy, and `node tools/ansize.js --in answers.json`
measures a saved reply. The made-up scoring values are uniformly random, so the real log probably packs a little
better. REE-39's completion evidence stays a measured shorter wait on Pierre's phone.
