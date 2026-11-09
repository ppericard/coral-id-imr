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

## 3. Three models that remove the whole class

The class has one root: **a step at sign-out that must be atomic across tabs, over storage that cannot be.** A model
ends the class only if it removes that step or makes the storage atomic.

- **A. One writer.** Only one admin tab per browser may edit, holding a `navigator.locks` lock as long as it is open. The
  other tabs are read-only, with a "Take over" button. Sign-out is then one tab sealing its own memory.
  - *Benefits:* the simplest sign-out, with no cross-tab merging left at all.
  - *Risks:* Pierre sees it. Two-tab editing, which exists today (code re-review M4), goes away, and a second tab opens
    read-only. Taking over must hand the draft across cleanly.
- **B. One transactional store.** The draft and the seals move from `localStorage` to IndexedDB. Every click's write
  (including the two-tab merge), every seal and every unseal is one read-write transaction on that store. The browser runs
  these one after another across tabs and applies each all or nothing, from one shared copy.
  - *Benefits:* nothing changes for Pierre. Clicks are still kept at once, two tabs still merge, and Sign out still seals.
    It also fixes the older two-tab merge's stale reads.
  - *Risks:* a rewrite of the draft layer, because every write becomes asynchronous: `putDraft`, `takeOther`, Undo, the
    auto-sorts, and the site's `?draft` preview, which must read IndexedDB. Existing drafts need a one-time migration.
    About a week, with a real-size test of each case.
- **C. The draft always stored sealed.** The draft is always stored encrypted under its token, in a key of that token.
  There is never a plain draft, and Sign out only forgets the token, so no step happens at sign-out and there is nothing to
  race.
  - *Benefits:* the least code. Most of this branch carries over: the gzip, the base stored as a diff, the token mark and
    the AES-GCM key. Two tokens never share a draft.
  - *Risks:* Pierre sees it. The site's `?draft` preview stops working, because it would need the token. Each save
    encrypts a gzipped curation, about 0.1 s, so saves are batched when the page is idle, and a crash in that moment can
    lose the last click. Existing plain drafts need a one-time migration.

## 4. Recommendation: B

B is the only model that changes nothing Pierre sees, and it removes the whole class by construction. Every read and
write of the draft and the seals becomes one atomic transaction on one shared store. "Read the draft, take the plain copy
off, write the seal" can then no longer be split by another tab's click, seal or unseal. Every case Codex found was such a
split, and so was the stale copy behind the last ones.

A and C remove the class too, but each takes something away that Pierre uses: two editing tabs, or the `?draft` preview.

Restart from B on this branch:
1. First a storage module for the draft: async get, put and merge in one transaction, with tests. Nothing else changes.
2. Then the seal on top of it, as one transaction.

Still open here, and not to be fixed on the current design:
- Codex thread 4509429142, whose fix Codex never reviewed again.
- The seal list kept as one `localStorage` key.
