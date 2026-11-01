# Coral ID UI re-review

> **Copied into the repo for the handover (2026-11-01).** Original: a private Claude doc on claude.ai (not reachable from another account). Screenshots were not kept.
>
> **Status since:** N1 done (desktop views side by side or stacked from each photo's shape, `data.json` `ar`); N2-N6 done (designer re-review first PR: feedback colours, colour-blind "correct", full tips on cards, pair page rebuilt, quieter Memory, one bonus tile). Minor: p1 (bleed overhang) and p4 ("Show all" button) kept as approved in the first review; p3 Branching lead photo pinned by Pierre (admin > Growth form 📌, #283); p5, p7, p8 done; p6 Goniastrea cover changed by Pierre to an IMR colony photo. Checked and fixed on 2026-11-01: p2 (Next pinned to the bottom of the side column), p9 (Progress pill dot removed), p10 (every font size on the scale; the 28 px logotype is the one documented exception), m11 (no hex literal left in app.css outside the token blocks). m5 partly: thumbnails are no longer blown up (srcset widths), but a few small IMR lecture photos still fill boxes bigger than themselves; how to show them is a choice left to Pierre (ROADMAP backlog item 5).

Nov 1, 2026 · Pierre Pericard

## Verdict

Yes, the app is clearly better than at the first review: 11 of the 23 earlier findings are fully fixed, 7 partly, 3 still open, and none got worse. The design system is now real: true italics, a clean type scale (12 to 28 px on every page measured), named palettes, one segmented control, one SVG icon set, muted group tints and a readable phone progress wall.

What a fresh eye sees now is no longer the system layer but **a few screens that lag behind it**. The most visible is the desktop and tablet quiz, where about half of the photo stage is still blurred filler. Next come the pair comparison page, which looks like an older generation of the app, and the right/wrong colours applied to the correct genus name in feedback. Nothing is blocking; five findings are worth a PR each.

## Previous findings: status

Checked against the live app (main @4f6df67, after PRs #254, #256, #262). Codes are those of the [first review](https://claude.ai/artifact/UnYEDsWB79RsKyNYW7oPNW).

| # | Earlier finding | Status | What I see now |
| --- | --- | --- | --- |
| M1 | Faux italics on genus names | Fixed | True italics load and render everywhere. |
| M2 | Three colour systems share hues | Fixed | Group tints are muted with dark text; strong colour is left to the learning scale. |
| M3 | No type scale, text under 12 px | Partly | Pages use 12/14/16/20/24/28 px. Left: Memory size labels "3×4" at 11.7 px, 13.3 px on Genera, 28 and 38.4 px are off the documented scale. |
| M4 | Heterogeneous controls | Partly | ⚙ panel is exemplary now. Memory still mixes a segmented control, pill toggles and an action pill; Genera keeps a native select between two segmented controls. |
| M5 | Quiz stage letterboxed | Partly | Phone, one row: fixed, the photo fills the stage. Two-row stage on tablet and desktop: still about half blur (see N1). |
| M6 | Two left edges on wide desktop | Fixed | Games start on the header's left edge. New side effect: they overhang the header on the right by 56 px (see minor table). |
| M7 | Coral Finder start without a prompt | Fixed | "What growth form do you see?", outlined "Show all 66 genera (39 on the slate)". |
| M8 | Colour-blind "correct" looks selected | Open | Correct is now a solid navy fill with white text: it reads even more like the pressed nav pill (see N3). |
| M9 | Phone progress names truncated | Fixed | 4 columns, names readable, legend on one row with Review below. |
| m1 | Group 11 badge contrast | Fixed | Dark text on tints. |
| m2 | Group titles on 3 lines when groups share a row | Open | Groups 2 and 3 still wrap to 3 lines on desktop and tablet. |
| m3 | ID tips not boxed in feedback | Partly | Boxed in quiz and duel feedback; still a plain list on the pair page (see N2). |
| m4 | Score stuck at 0/0 | Fixed | "0/1 right" appears with the feedback. |
| m5 | Low-res photos upscaled | Open | E.g. the Pocillopora lecture photo on Look-alikes is visibly pixelated at 500 px. |
| m6 | Unicode pictograph icons | Fixed | One SVG set on Tools. |
| m7 | Phone tab bar without icons | Fixed | Icon + label, tinted active pill. |
| m8 | Header mixes sign-in and progress | Fixed | "Progress" + mini ring + %. A small unexplained dot sits at its right end. |
| m9 | Small Back, underlined credit lines | Partly | Back is a proper pill. Credits under sheet photos still repeat "IMR lecture IMR Lecture 6, slide 70". |
| m10 | ⚙ panel without close | Fixed | Title, ×, named palettes, Light/Dark segmented. |
| m11 | Hard-coded colours, radii, shadows | Partly | Font sizes are on tokens; 194 hex literals remain in app.css (many are palette definitions, not checked one by one). |
| m12 | Heading order, redundant alt | Not re-checked |  |
| m13 | Look-alikes rail labels | Partly | Names wrap on two lines; one tile (Astreopora / Cyphastrea) still prints its label over the photo. |
| m14 | Admin header | Not re-checked | Out of scope (public app only). |

## New findings, ranked

Six findings formed before reading the first review, most important first. Each fits in one PR and respects the standing rules (declutter, help behind ?, games on one screen).

### N1. Desktop and tablet quiz: half of the stage is blur

The quiz and duel show two views stacked in two wide stages. Coral photos are mostly 4:3, square or portrait, so each one sits in the middle of a 2.6:1 band with blurred filler on both sides. At 1440×900 the photos use about 50% of the stage area; on tablet the wrong-answer portrait photo uses about 30%. This is the screen RAs see most, and the photo is the content.

*(Screenshot not kept: Quiz at 1440 px: each photo fills about half of its band)*

**Recommendation:** on desktop, put the two views side by side (two columns, each taking the photo's shape within the available height) instead of stacked; on tablet, size each stage to its photo as phones already do (DESIGN.md "stage takes the photo's shape"). Keep blur only for an extreme ratio. Same rule for the wrong-answer comparison.

### N2. The pair page looks like an older app

The comparison page (from "Compare them" or a sheet's look-alikes) breaks several rules the rest of the app now follows:

- the header loses its ? button, so the nav pills jump sideways (rule: the header never changes);
- the ID tips are a plain list, not the highlighted box used everywhere else;
- the two columns stop at 1040 px, leaving the right quarter of a 1280 px page empty;
- the genus names are large underlined links, the loudest element on the page.

The Look-alikes page right next to it (big side-by-side photos, boxed tips, pair rail) is one of the best screens in the app, so the contrast shows.

*(Screenshot not kept: Pair page at 1440 px: no ? button, plain tips, empty right quarter)*

**Recommendation:** rebuild it on the Look-alikes layout: same header, two equal columns across the full page, boxed ID tips, names as plain italic titles with a small "Sheet ›" link.

### N3. Feedback paints the correct genus in the "wrong" colour

After a wrong answer the heading reads "No, it's *Porites*" with the correct genus in red (orange in colour-blind mode), underlined. The colour that means "wrong" lands on the right answer, the very word to remember. In colour-blind mode the correct button is a solid navy fill with white text, identical in look to the active "Practice" pill in the header, so "correct" reads as "selected" (earlier M8, not solved).

*(Screenshot not kept: Colour-blind mode: correct answer looks pressed, correct name in orange)*

**Recommendation:** keep "No," in the error colour and set the genus name in ink, bold italic, with the green tick. In colour-blind mode give "correct" a pale blue fill with a thick solid border and the ✓ badge, mirroring the dashed orange "wrong", never a solid accent-like fill.

### N4. Genera cards cut the ID tips mid-word

On Photos view, card tips are clamped to four lines with an ellipsis: "Corallites 2-…" (Turbinaria), "Spines between large…" (Echinopora), "Thicker plates, less…" (Duncanopsammia). These tips are the app's most important content (IMR cues first), and the cut hides exactly the discriminating part. Separately, when two small groups share a row their titles still wrap to three lines (m2).

*(Screenshot not kept: Genera at 1440 px: truncated tips and 3-line group titles)*

**Recommendation:** let cards grow to the full tip (the grid already aligns rows), or show the 2 first tips in full rather than a character-clamped run. For shared rows, put the group title on one line above the block and let it truncate with a tooltip.

### N5. Memory: loud card backs, mixed controls, text on the page

Twenty high-contrast diagonal-striped backs are the strongest visual on the screen before the game starts. The side column mixes three control looks (segmented Easy/Medium/Hard, filled/outlined pills for Random/Look-alike, another pill for New game, an action), keeps an instruction sentence on the page (rule: explanations behind ?), and overhangs the header on the right.

*(Screenshot not kept: Memory at 1440 px)*

**Recommendation:** a quiet back (surface-2 with a small logo mark or a faint coral texture), Random/Look-alike set as a second segmented control, New game as `.next.sec`, the instruction moved to ?.

### N6. Progress: the six locked bonus tiles read as a puzzle

The wall ends with six dashed "?" tiles labelled 10%, 15%… 35%. Nothing says these are bonus genera unlocked by progress, and they take the same visual weight as real genera; on tablet they add a row below the fold. The "Often mixed up" chips also run words together ("Porites/Goniopora×1").

**Recommendation:** one compact locked tile ("6 bonus genera · next at 10%") instead of six, or a smaller row under the wall with a lock icon. Chips as "Porites ↔ Goniopora · 1".

## Minor polish

| # | Where | Finding | Suggestion |
| --- | --- | --- | --- |
| p1 | Games (desktop ≥ 1340 px) | Quiz, duel and Memory side columns end 56 px right of the header's right edge (1416 vs 1360 px). | Cap `.bleed` so its right edge matches the header, or let the header follow on game pages. |
| p2 | Feedback panel | "Next" sits under a card whose height varies, so it moves on every question. | Pin Next to the bottom of the side column. |
| p3 | Coral Finder start | The first Branching photo is mostly sandy bottom; the category's cue is hard to see. | Ask Pierre for a clearer lead photo (curation, not code). |
| p4 | Coral Finder start | "Show all 66 genera" is still the largest control in the top bar on desktop. | Smaller `.linkish` at the end of the grid, next to "← IMR growth forms". |
| p5 | Genus sheet | Photo credits read "IMR lecture IMR Lecture 6, slide 70". | "IMR lecture · slide 70". |
| p6 | Genus sheet | Goniastrea's cover is a corallite close-up (rule: cover never macro). | Curation check for Pierre. |
| p7 | Look-alikes rail | One tile (Astreopora / Cyphastrea) prints its label over the photo. | Same label strip as the others. |
| p8 | Phone Genera | Search, Photos/ID tips and a full-width "Filter" bar take 190 px before the first card; "Filter" looks like a text field. | Filter as a small chip beside the segmented control. |
| p9 | Header | The small dot at the end of the Progress pill has no visible meaning. | Remove it or give it a tooltip (sync status?). |
| p10 | Type | Memory size labels at 11.7 px; 13.3, 28 and 38.4 px outside the documented scale. | Map to `--fs-xs`, `--fs-s`, `--fs-xl`, `--fs-2xl`. |

## Keep

- **Home**: two doors, strong images, the real ReefCloud frame on Identify. Still the most finished screen.
- **Quiz feedback on the photos**: big ✓/✕ labels, "The photo shown" against "Your answer, same view", boxed ID tips with the mnemonic.
- **Phone quiz**: the photo now fills the stage; answers in a 2×2 grid; feedback as a bottom sheet with a full-width Next.
- **Look-alikes page**: equal photos side by side, tips under each, pair rail on the right.
- **My progress**: greyscale for unseen genera, colour once seen, one learning-level ramp; reads at a glance on every size.
- **ID tips view and genus sheet**: the 4 lecture questions as compact tiles, tips in the highlighted box, three views in columns.
- **⚙ panel and Tools hub**: the clearest proof the design system now works.

**Method.** Live site, main @4f6df67 (1 Nov 2026), Playwright/Chromium at 412×915 touch, 768×1024 touch and 1440×900, light and dark, plus colour-blind mode; about 70 screenshots, computed font sizes and right edges measured on 8 pages; no console errors. Own findings first, then compared with the first review and docs/DESIGN.md. No code changed.
