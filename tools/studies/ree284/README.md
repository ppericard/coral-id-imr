# REE-284: the fictional-edition probe

A reproducible local test of content portability (REE-284, "Local test of content portability"; item 5 of the A27/F27
reconciliation: a fictional second edition on localhost before any real one). Findings and the seams to fix:
[docs/reviews/2026-11-27-fictional-edition.md](../../../docs/reviews/2026-11-27-fictional-edition.md).

```
node tools/studies/ree284/fictional.js                  # exit 0: as KNOWN says; 1: a check failed or a dependency changed
node tools/studies/ree284/fictional.js --json out.json  # every finding as JSON
node tools/studies/ree284/fictional.js --keep           # keep the built editions and the screenshots (path printed)
```

- **Inputs: none private.** `course.js` holds two wholly synthetic courses (invented organisation words, genera, text,
  a legacy-format export with a placeholder player); the photos are drawn in the browser at run time. The repository is
  read for its published code files (as they are) and, to tell IMR words apart, the genus names of `data.json`. No player
  data, no sheet, no network: Playwright aborts every request not for 127.0.0.1 and Chromium runs with no proxy and
  resolves no other host (rule D1).
- **No app file changes.** Each edition is built in a temporary folder: the published code files copied, `core.js` `ORG`
  replaced and the static pages rewritten by `tools/rename_app.py` (the fork procedure in `core/keys.js`), the edition's
  own content files and photos beside them. The admin's files are left out.
- **Machine:** takes a Playwright slot (`tests/slot.js`, rule W24); the run itself takes about 40 s.
- **A ratchet.** `KNOWN` in `fictional.js` lists what the first run found. A new dependency fails the run, and so does a
  listed one that is gone: the PR that removes one takes it out of `KNOWN` and the report.
