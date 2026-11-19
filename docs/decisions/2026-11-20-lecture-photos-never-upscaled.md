# IMR lecture photos are never drawn larger than their own pixels

Date: 2026-11-20. PR: #1286. Rules or docs touched: `docs/spec/photos.md`, `docs/ROADMAP.md`, `quiz.js`,
`learn.js`, `proto/samediff.js`, `app.css`, `tests/pages.smoke.js`.

## Context

The design re-review (m5) found small IMR lecture photos filling boxes bigger than themselves, which blurs them. Pierre
decided on 2026-11-18 (inventory C12, "C12 A+D", ANSWERS "Lecture photos"): (A) a lecture photo is never shown larger
than its own pixels, (D) the 86 Corals of the World screenshots are replaced by the original images (a second PR).

## Decision

- **A lecture photo is drawn at most at its own pixels, in CSS pixels** (the full file `img/<f>.webp`; a retina screen
  may still scale it, as for any image). Integrator's call, easy to correct: the definition (CSS pixels, not device
  pixels), and that it is lecture photos only.
- **How**: measured first (all 34 genus sheets and the enlarged view, 390 and 1280 px): the sheet tiles, the strips and
  the lightbox already never exceed it, and the quiz stage on desktop already uses `object-fit: scale-down`. What could
  exceed it was the tolerance LOWRES (1.15x) that the phone and tablet quiz stage and the Look-alikes view grant before
  showing a small photo whole, and the side-by-side quiz stage on a phone, which always filled its box. A lecture photo
  now carries `data-imr` on its figure (`quiz.js` `upMax`): no tolerance, and the side-by-side stage shows it whole.
  Every other photo keeps its behaviour.
- **Checked** by `tests/pages.smoke.js` part `noupscale`: lecture photos on four genus sheets, their enlarged view and
  the quiz stage (one photo, two side by side) at 390 and 1280 px, none drawn past its own file.
- The Corals of the World originals (D) are the next PR.
