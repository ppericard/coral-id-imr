# Sealing the admin draft at sign-out: design note (2026-11-09)

Branch `claude/admin-signout-seal`, split out of #798 (Q334). Six Codex rounds each found a new race; this note asks
why, and what would end the whole class.

## 1. The real need

The admin keeps every unpublished click as a draft in the browser (`localStorage`), so a reload or a closed tab loses
nothing. The second admin review (2026-11-01) noted that on a **shared device** (one computer and one browser used by two
admins, or by an admin and someone else), Sign out left that draft behind. The next admin, with another token, inherits it
and can publish it. A read-only visit and the site's `?draft` preview can read it too.

So the protection is narrow. It covers one browser profile on one computer, against the next person who opens the admin
or the site there. It does not cover someone with access to the disk. Pierre's own clicks must never be lost (rule A1: no
wipe). Today Pierre is the only admin; the shared-device case is a precaution for a second admin.

## 2. Why the current design keeps producing races

- **One draft, many writers.** The draft lives in one `localStorage` key that every open admin tab writes on every click.
  The tabs merge each other's writes by revision (`takeTab`). Those writes are synchronous and take no lock.
- **Sealing adds more shared state.** It brings a second shared structure, the seal list, and three steps: remove the plain
  draft, write a seal, and restore and drop a seal. Each must happen as one step relative to every other tab's clicks,
  seals and unseals.
- **`localStorage` cannot do this.** It has no transactions. Each tab reads its own copy, and other tabs hear of a write
  only later, through an event.
- **The lock covers only part of it.** The `navigator.locks` lock added in round six orders the seal sections, but not the
  clicks, which still write outside it. Each fix closed one window between a write and a removal; the next review found
  the next one.

## 3. Models that remove the whole class

- **A. One writer.** Only one admin tab per browser may edit, holding a `navigator.locks` lock as long as it is open. The
  other tabs are read-only, with a "Take over" button. Sign-out is then one tab sealing its own memory, with no
  cross-tab merging.
  *Cost:* it drops the two-tab editing that exists today (code re-review M4), adds a read-only state and a hand-over to
  the interface, and needs a decision from Pierre.
- **B. One transactional store.** The draft and the seals move to IndexedDB. Every click's write, every seal and every
  unseal is one read-write transaction; the browser runs these one after another across tabs and applies each all or
  nothing.
  *Cost:* a rewrite of the draft layer (`putDraft`, `takeOther`, Undo, the auto-sorts), because every write becomes
  asynchronous. It also needs a migration from `localStorage` and a change to the site's `?draft` preview. About a week.
- **C. No sealing at sign-out.**
  - **C1, the draft always stored sealed.** The draft is always stored encrypted under its token, in a key of that token
    (`reefid-curation-draft:<mark>`). There is never a plain draft, and Sign out only forgets the token. Two tokens never
    share a draft, and no step happens at sign-out, so there is nothing to race.
    *Cost:* each save encrypts a gzipped curation (about 0.1 s; done when the page is idle, not on every click). The
    `?draft` preview of the site stops working, because it would need the token. Existing plain drafts need a one-time
    migration.
  - **C2, Sign out asks.** With an unpublished draft, Sign out says so and offers Publish, or signing out with the draft
    left in this browser, as today. Discarding is not offered, because rule A1 forbids a wipe.
    *Cost:* nothing technical, but the shared-device leak stays when the admin chooses to leave the draft.

## 4. Recommendation

Ask Pierre first whether a shared device is real, now or with a second admin soon.

- **If not:** take **C2**, a small PR with no crypto and no races. Keep this branch parked.
- **If yes:** take **C1**. It removes the sign-out step itself, which is where every race came from, and it costs less
  than B. Most of this branch carries over: the gzip, the base stored as a diff, the token mark and the AES-GCM key. The
  broadcast, `lockOther`, one-seal-per-token and the seal lock go away.
- **A** is not recommended: it takes away a feature to fix a precaution.

Still open on this branch, and not to be fixed here:
- Codex thread 4509429142: its fix (re-reading the stored draft before a clean clear) is in the branch, but Codex never
  reviewed it again.
- The seal list is still one `localStorage` key, read and written whole.
