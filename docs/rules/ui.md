# UI and layout rules

Pierre's standing rules on the interface. Design tokens and components: [DESIGN.md](../DESIGN.md) (follow it for any UI
change). The admin's own rules are in [admin.md](admin.md). The index of every rule is in
[AGENTS.md](../../AGENTS.md#the-rules).

### U1

**Declutter: only essentials on a page.** No page titles or intro paragraphs; explanations go behind the shared "?"
help button (`pageHelp()` moves any top-level `h2`, `.lede`, `.tips`, `.gloss`, `h3.label` there automatically). One
shared mechanism for everything; no per-page exceptions; code homogeneous.
*Source:* Pierre, by 2026-11-01.

### U2

**Every game/exercise fits ONE screen in every state** (including feedback after a wrong answer); controls and answers
in a side column on wide screens; games may bleed up to 1680 px (`.bleed`).
*Source:* Pierre, by 2026-11-01.

### U3

**Fixed page width 1280 px; the header never changes size; one palette and the DESIGN.md tokens only.** Light theme
default (⚙ Theme). One colour palette site-wide, chosen in ⚙ Colours: Lagoon, Ocean, Seagrass, Twilight, **Depth
(default, Pierre's pick)**; ⚙ Colour-blind On/Off swaps green/red for blue/orange (right/wrong, review). Any new colour
comes from the palette tokens (`:root[data-palette]`, `[data-cvd]` in `app.css`), in light and dark. Strong colour
belongs to the learning-level scale; IMR group colours are muted tints with dark text (number + title carry the group),
so one hue never means two things on a screen (design review, 2026-11-01). Genus names are true italics: the
self-hosted fonts (`fonts/`, `@font-face` at the top of `app.css`) include Source Sans 3 italic (variable 400-700) and
Barlow Condensed italic 600/700; never rely on faux italics. Readable text is at least 12 px. **Tokens and components
are in [DESIGN.md](../DESIGN.md)**: font sizes only from the `--fs-*` scale, radii `--r-xs/--r-sm/--r/--pill`, shadows
`--shadow/--shadow-hover`, buttons `.next` / `.next.sec` / `.linkish` / `.theme`, one segmented look for every exclusive
choice, one SVG icon set. Photo sizes S/M/L (default M), remembered per page (`SIZE_PAGES`, `pageKey()`).
*Source:* Pierre, by 2026-11-01; design review, 2026-11-01.

### U4

**Responsive: one code base, mobile-first CSS, exactly 3 size classes**: phone < 600 px, tablet 600-1023 px (also a
half-screen desktop window), desktop ≥ 1024 px. Same values in CSS and `app.js` `MQ` (`isPhone()`, `isStacked()`).
Touch vs mouse by `hover`/`pointer` media, never width. No other breakpoints. Test at 360, 412, 768, 960, 1280, 1440,
1920 px wide.
*Source:* Pierre, by 2026-11-01 (responsive report, 2026-10-31).

### U5

**No third-party scripts** (the origin `ppericard.github.io` is shared and the admin token lives on it). A new external
image or API host must be added to the CSP meta in `index.html`/`admin.html` (ARCHITECTURE.md "Security model").
*Source:* Pierre, by 2026-11-01.

### U6

**No range sliders** (`<input type="range">` controls, such as the Zoom ladder's). Swipeable photo strips are not
sliders: the phone quiz's swipe, with the next photo peeking in, is wanted. Visual and dynamic beats text. New features
must not degrade the look.
*Source:* Pierre, by 2026-11-01; what a slider is, 2026-11-05.

### U7

**Settings removed on purpose stay removed**: the "Photos from Dauin / Philippines / All" filter (#230; the IMR/own-first
rule P1 already does that job), the Reef theme, the quiz level selector.
*Source:* Pierre, by 2026-11-01.

### U8

**Never hardcode the number of units** (corals: "39", "40") in user-facing text: it changes (Millepora joined on
2026-11-02; bonus genera): use `slateGenera().length` (the current subject's slate, `UNITS[id].slate()`). Corals: docs
may say 39 for the IMR coral slate, 40 with Millepora. A one-time announcement of the change itself (`RECALC`) may name
the number.
*Source:* Pierre, 2026-11-02; subject-neutral wording, 2026-11-06.

### U9

**Sign-in never on My progress**: signed out = a "Sign in" button in the header on every page; signed in = account line
and Sign out at the top of ⚙. The welcome tour bubble never covers what it points at. An existing account is entered
only after "Is it you?" (its answers and last play), on every device; simple codes stay allowed.
*Why:* players type only their first name, so names collide. *Source:* Pierre, 2026-11-03.

### U10

**A personalised card greets the player by their first name only**: the first word of the sign-in name, its first
letter capitalised ("Ana Lopez" → "Ana", "Ana B." → "Ana", a single word as it is), from the one shared helper
`core.js` `firstName()`; nothing usable (signed out, empty, no letter first) → a plain "Hi!". Never the full name, never
a real name written in the repo (tests use a made-up one).
*Source:* Pierre, 2026-11-04.

### U11

**Questions to the player interrupt at a natural break.** A feedback question (the one-tap question, `quiz.js`
`pulseAsk`) is a card shown at Next, before the next question, never a block inside the answer's feedback that Next
skips; its buttons ignore taps for their first moments and Enter never answers it, so the reflex tap on Next cannot
answer or dismiss it. How often it comes stays as it was (ARCHITECTURE.md "One-tap questions"). The "Did you know?"
tips (`tips.js`) take the same break: one card a break (`quiz.js` `breakArm`, first come first served, the one-tap
question armed first), a tip waiting for a later break when the question is due.
*Why:* a player in the flow of tapping Next does not see a question inside the feedback. *Source:* Pierre, 2026-11-03; tips, 2026-11-04.

### U12

**Home = two big doors only** ("Learn & practise", "Identify a coral"), plus one credit line under them, all in one
screen; Learn & practise is the primary door, Identify the secondary one (DESIGN.md "Footer and credits", "Home
hierarchy"). **One relaxation**: one more row, the Corals | Fish subject switch at the top of Home (with its twin, the
subject chip in the header), shown only to the admin until fish opens to players (rule S1); still one screen (DESIGN.md
"Subject switch"). Phones: bottom tab bar, no Tools/Lab tab (hammer icon in header).
*Source:* Pierre, 2026-11-03; the relaxation, 2026-11-04.

### U13

**Lab/Tools prototypes graduate into the main app only with Pierre's explicit approval.** Propose; never promote
yourself.
*Source:* Pierre, by 2026-11-01.

### U14

**Players can report a problem from every game** once the answer is out (wrong answer + the right unit, several
corals, bad photo, other, note), and, discreetly, from everywhere it makes sense: any enlarged photo, the bottom of a
unit's sheet, "Send feedback" at the end of the ? help of every page and on About and credits (DESIGN.md "Footer and
credits"). New pages get feedback through the ? help automatically; use `repBtn()` for anything more specific. Pierre
sees who sent each report in admin To do (views All and Reports), because he trusts some players more than others.
Reports never change anything by themselves.
*Source:* Pierre, 2026-11-01; subject-neutral wording, 2026-11-06.
