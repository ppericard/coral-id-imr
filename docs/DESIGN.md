# Design system (short)

The visual rules every page follows. They came out of the expert UI review of 2026-11-01 (approved by Pierre). Use these tokens and components; do not add one-off sizes, colours or control styles. Tokens live in `:root` at the top of `app.css`.

## Type

- Two families: **Barlow Condensed** (`--display`, headings, big labels) and **Source Sans 3** (`--body`). Both are loaded with their real italics (genus names are always italic): never rely on browser-faked italics or bold.
- Sizes come only from the scale: `--fs-2xs` 11 px (only a glyph inside a small badge), `--fs-xs` 12 px (floor for any readable text), `--fs-s` 14, `--fs-m` 16 (body), `--fs-l` 20, `--fs-xl` 24, `--fs-2xl` 36. SVG schematics may use px inside their viewBox.

## Shape

- Radius: `--r-xs` 4 px (keys, small marks), `--r-sm` 6 px (tiles, small cards), `--r` 10 px (cards, panels, photos), `--pill` (buttons, chips, segmented controls).
- Elevation: `--shadow` (resting card), `--shadow-hover` (hover, popovers, pinned buttons). Rings (`inset 0 0 0 Npx`) mark selection, not elevation.

## Colour

- Surfaces and text: `--bg`, `--surface`, `--surface-2`, `--ink`, `--muted`, `--line`; brand: `--accent` / `--accent-ink`; states: `--good`, `--bad`, `--warn` (+ `-bg`). Each palette (`:root[data-palette]`) and the dark theme redefine them; the colour-blind mode (`[data-cvd]`) redefines `--good` / `--bad`.
- **One meaning per hue on a screen.** Strong colour belongs to the learning-level scale (`--lv1`…`--lv5`, white or ink labels at ≥ 4.5:1). IMR lecture groups use muted tints of their hue with dark text (the number and title carry the group). Coral Finder boxes keep their pale tile colours.
- Right/wrong never by colour alone: tick/cross, and in colour-blind mode a pale fill with a thick solid border (right) vs dashed (wrong); never a solid dark fill, which reads as a pressed button.
- In feedback only "✓ Yes," / "✗ No," takes the right/wrong colour; the genus name to remember stays in ink.

## Components

| Need | Use | Notes |
| --- | --- | --- |
| Main action of a screen | `.next` | Filled accent pill. One per screen. |
| Secondary action | `.next.sec` | Outlined accent pill, same size. |
| Tertiary action, inline | `.linkish` | Underlined accent text. |
| Icon action in the header | `.theme` | Round, 36 px (44 px hit area on phones). |
| Exclusive choice (2-4 options) | `.seg` (and the ⚙ switches, Memory's level and genera set, styled the same) | Grey track, the chosen option is a white pill. Theme is Light / Dark here too. |
| Filter or toggle in a list | `.chip` | `aria-pressed` for state. |
| Section tabs | `.modes` | Slim underlined text tabs. |
| Disclosure | `<details>` with a muted `▸` summary | e.g. "Backup or reset progress" at the bottom of ⚙. |

## Icons

One SVG set (24 px grid, 1.75 stroke, `currentColor`): see `LAB_ICONS` in `proto/lab.js` for the Tools hub and the inline SVGs in `index.html`. No Unicode pictographs as icons (✺ ⌘ ◐…); plain symbols in text (✓ ✗ ★ ←) are fine.

## Screens

- Phone tab bar: icon above label (same SVG set), the active tab gets the accent colour and a tinted pill behind its icon.
- Header progress pill: "Progress" + a mini ring (`--pp`) + %.
- Signing in: while signed out, a filled "Sign in" pill (`.next.signb`) sits in the header on every page and opens the sign-in card; once signed in it disappears and the account is one quiet line at the top of ⚙ (Send now, Sign out), with "Backup or reset progress" folded at the bottom of ⚙. If saving fails, the header pill comes back as an outlined red "Not saved" that opens ⚙. Never put the account on a content page.
- My progress: the board (Photos / Slate / Groups) comes first on phones and tablets, then the ring, level counts, Review first and Often mixed up. No "Practise now" button (the nav already has Practice).
- Quiz on phone/tablet: the stage takes all the height the question and answers leave (Pierre prefers the biggest photo to a tight 4:3 box), sized before the photos load: **nothing may move while a photo loads**. A photo close to that shape fills it (cover); a very different shape is shown whole on its blurred background. Full frame in the lightbox.
- Games wider than the page (`.bleed`, ≥ 1340 px) start on the header's left edge and only grow to the right.
- ID tips are the key content: never clamp or truncate them on a card; they are boxed (`.tipbox`) wherever they appear (sheet, quiz feedback, pair page).
- The header keeps the ? slot on every page (a page without help hides the button but keeps its place).
- Memory card backs are quiet (pale accent tint + faint logo mark), never a loud pattern.
- Game session trail (quiz and duels, next to the question): 10 small cells for the last 10 answers of this visit, grey until answered, then a full `--good` cell for right and a low `--bad` bar for wrong (shape + colour, readable without colour). Fixed width, never moves the layout. No score text in games (Pierre, 2026-11-01).
