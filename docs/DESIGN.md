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
- Right/wrong never by colour alone: tick/cross, and in colour-blind mode filled vs dashed.

## Components

| Need | Use | Notes |
| --- | --- | --- |
| Main action of a screen | `.next` | Filled accent pill. One per screen. |
| Secondary action | `.next.sec` | Outlined accent pill, same size. |
| Tertiary action, inline | `.linkish` | Underlined accent text. |
| Icon action in the header | `.theme` | Round, 36 px (44 px hit area on phones). |
| Exclusive choice (2-4 options) | `.seg` (and the ⚙ switches, styled the same) | Grey track, the chosen option is a white pill. Theme is Light / Dark here too. |
| Filter or toggle in a list | `.chip` | `aria-pressed` for state. |
| Section tabs | `.modes` | Slim underlined text tabs. |
| Disclosure | `<details>` with a muted `▸` summary | Inside My progress, the signed-out sign-in fold is shown as a `.next.sec` button. |

## Icons

One SVG set (24 px grid, 1.75 stroke, `currentColor`): see `LAB_ICONS` in `proto/lab.js` for the Tools hub and the inline SVGs in `index.html`. No Unicode pictographs as icons (✺ ⌘ ◐…); plain symbols in text (✓ ✗ ★ ←) are fine.
