# Admin rules

Pierre's standing rules on his back-office (`admin.html`) and his curation (`curation.json`). The spec of every tab,
view and address: [ARCHITECTURE.md](../ARCHITECTURE.md) "Admin back-office", "Analyses", "Auto-sort". The index of
every rule is in [AGENTS.md](../../AGENTS.md#the-rules).

### A1

**Pierre's curation choices (`curation.json`) are never changed automatically**: no script, rebuild or import may
overwrite them. An agent **may propose** to change one (its reason may be wrong, or may have changed); Pierre decides. Only step-by-step Undo of his own actions; **no bulk reset/wipe button of any kind** (he refused it
twice). **Never write `curation.json` in a PR**: Pierre publishes it straight to `main` from the admin; rebase and keep
`main`'s copy. The admin's Publish never writes a whole copy: it re-reads the published file and merges the draft onto
it key by key (`merge3()`, #240, after a whole-copy publish from a stale tab lost curation on 2026-11-01); keep it that
way if you touch `save()` in `admin.js`.
- **The auto-sort** is the one thing that writes choices for him, and only through that same path: at each admin load it
  puts the candidate pass's sure judgments into his draft, for photos he has not decided, never replacing a value he
  gave, each one logged as auto (`curation.json` `auto`) and undoable one by one; his Publish sends them. Never make it
  write `curation.json` any other way.
- The fish auto-sort (`autosort.js` `fishRun`) takes the same path into `curation.json` `fish`; it never writes
  `fish.out`, Pierre's "Not this" (the iNaturalist experts got the species wrong: his click only, never an agent's), and
  never proposes again a photo he marked so.

*Why:* the curation is Pierre's work, and each choice he made has a reason. *Source:* Pierre, by 2026-11-01; auto-sort,
2026-11-03; fish, 2026-11-04; may propose, 2026-11-05.

### A2

**The admin is for Pierre only, and minimal**: no explanatory text on the page (tooltips = bare names; help behind the
admin "?"), one-click segmented controls (reuse the existing segmented style, no default browser buttons, no lone ✓
marks), header on one line. Everyday per-photo actions (× exclude, Reject, Remove) are one click with **no
confirmation**: Undo is the safety net (#265); confirmations only for bulk or site-wide actions (Publish, Validate N, CF
book switch). Same information = a filter; different information = a separate view (#242).
*Source:* Pierre, by 2026-11-01 (#242, #265).

### A3

**The admin's top level stays short: a few header groups, a few tabs each.** A new page goes where it belongs first: a
view of an existing tab (the views of a tab are in a segmented switch at its right; `GROUPS` in `admin.js`), or a new
tab of an existing group (the tabs of a group are in a row under the header). A new header group only with Pierre's OK,
when nothing fits (as Analyses was). At each addition check that the whole stays tidy, and propose a regrouping rather than piling up. No
tab holds a view of its own name, no group a tab of its own name. One role per admin page: Health keeps what needs
action, Activity who plays and how much, Analyses what we learn. Today's groups, tabs and views: ARCHITECTURE.md
"Admin back-office" and "Analyses".
*Why:* the menus had grown to 17 pages before the regrouping. *Source:* Pierre, 2026-11-01,
2026-11-03, 2026-11-04; rewritten 2026-11-05.

### A4

**One subject switch** (Corals | Fish) in the admin header covers every page; a subject's pages are named in `core.js`
`SUBJECTS` `admin`; a subject's pages sit under its prefix (`#fish/…`), the corals' have none. Addresses follow the
header: `#<group>/<tab>/<view>` in the words on screen (ARCHITECTURE.md "Admin back-office"); an old address is not
kept (rule W3, no alias).
*Source:* Pierre, 2026-11-04; addresses, 2026-11-05 (Q53-Q56, URL refonte).

### A5

**Every analysis says what it can conclude**: Clear / Within the margin / Not enough data yet, with the answers it would
need; the method notes are behind the admin "?" (ARCHITECTURE.md "Analyses").
*Source:* Pierre, 2026-11-04.
