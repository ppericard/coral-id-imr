# R2 is given up for a visit after three photos fail in a row, not after one

Date: 2026-11-21. PR: #0. Rules or docs touched: docs/spec/photos.md "Served from Cloudflare R2" (Fallback).

## Context

With no service worker in control (a first visit, a browser without one), one R2 photo that still failed after its
800 ms retry set `AWAY` for the rest of the visit (`app.js` `r2Out`), from a shown photo or a quiz preload. Every later
photo then came from its online original (FishBase for most fish: slower, sometimes missing). `AWAY` exists for R2 really
out of reach (down, or a network that blocks it): each photo would otherwise wait for its own failure and retry. One
missing file or one passing error is not that, and gave R2 up all the same (REE-200, found with REE-199).

## Decision

Integrator's call, easy to correct: a photo that fails on R2 after its retry falls back on its own; R2 is given up for
the visit only once **3 different photos** failed so **in a row**, with no photo loaded from R2 in between (`app.js`
`R2_OUT`, `r2Failed`, `r2Loaded`). A photo counts once: its sizes, its Find the X tile, and its preload then its
element are one failure. A file that failed so is not asked from R2 once more on that page (`R2MISS`). Chosen over a
probe of a known-good file: no file is sure to be on R2, and a probe adds a request and a wait where the count needs
neither.

## Consequences

R2 out of reach now costs up to three photos' failures (each with its retry) before the next photos go straight to
their online original or the site; a missing file or a passing error leaves the rest of the visit on R2. A photo
loaded from the browser's cache counts as an R2 load, so R2 failing mid-visit can take a few more failures to be given
up; each photo still falls back on its own meanwhile. Under a service worker nothing changes. The admin (`admin.js`)
keeps its own one-failure rule. Specified in [docs/spec/photos.md](../spec/photos.md) "Served from Cloudflare R2";
tested by `tests/r2out.test.js` and `tests/net.smoke.js` check 12 a2.
