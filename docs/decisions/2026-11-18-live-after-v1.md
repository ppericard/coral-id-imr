# Live mode after version 1: a QR code of our own on the lobby screen

Date: 2026-11-18. PR: see the branch `claude/live-after-v1`. Docs touched: ROADMAP "Live mode, after version 1",
[the live design note](../reviews/2026-11-18-live-mode-design.md) "The lobby's QR code".

## Context

Version 1 of the live mode shows the join address and a big 6-digit code on the trainer's projected lobby. The design
note listed a QR code as left out because rule U5 forbids third-party scripts, so it needs an encoder of our own. The
rest of "Out of version 1" (sea slugs, more sets, a per-student view tied to cohorts, a WebSocket channel, typed
answers, duels, Find the X, answers on units not unlocked) each needs a product or cost decision from Pierre, or a
service he has not agreed to.

## Decision

Integrator's call (easy to correct; Pierre, 2026-11-14: push what is easy to correct afterwards), carrying out Pierre's
2026-11-17 list (Q393) of what comes after version 1:

- Build the one item that needs no decision: the QR code, with our own encoder in `live.js`'s pure section (about 200
  lines): byte mode, error correction M, versions 1 to 9, penalty-based mask choice, an inline SVG. Level M and a cap of
  version 9 are enough for the join address (about 60 characters) and leave room for a longer custom domain.
- The code encodes the full join address with the game code, so a scan lands on the join form with the code filled in
  (`#live?code=123456`, already supported). The address and the code stay big beside it, for a phone that cannot scan.
- The code is always dark on light, whatever the theme (scanners need it).
- The other items stay in ROADMAP, listed under "For Pierre" in the PR.

## Consequences

- New: `qrMake`, `qrSvg`, `qrEc`, `qrFormat`, `qrLayout` in `live.js`; `.lvjoin`, `.qr` in `app.css`. No new file, host or
  library; no change to `core.js`, `Code.gs` or any data.
- Tested by unit tests with an independent reader (syndromes, format strings, every version) and by the live smoke
  test; not by a real camera (no decoder on the build machine).
- Rules out: a QR library or a QR image service (rules U5, D2: the join address and code never leave the page).
- Where it is specified now: the live design note, "The lobby's QR code".
