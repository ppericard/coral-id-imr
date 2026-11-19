# The Lab and the basics modules

The Tools section (the Lab of prototypes, `proto/`) and the two basics modules that graduated from it into Learn, Coral
basics and Fish basics. This is the specification of what the code does now; why each part was decided is in the PRs
and [docs/decisions/](../decisions/README.md). The pages and addresses around them are in [front-end.md](front-end.md);
the look of the Lab drawings is in [DESIGN.md](../DESIGN.md) "Lab drawings"; the fish module's place on the fish path
is in [FISH_PATH.md](../FISH_PATH.md) "Fish basics".

## The Lab (`proto/lab.js`)

`proto/lab.js` holds the hub (`#tools`, `#tools/<id>`), `LAB.files` (the tools, in their order, each in its own
`proto/<id>.js` registering itself with `LAB.add()`), `LAB_V` (the Lab files' cache version, stamped at deploy) and
`GRADUATED`, the tools promoted into a section: `idkey` (Identify), `pairs` (Practice), `basics` and `fishbasics`
(Learn). A graduated tool's page key keeps its id and gets its address in its section (`core.js` `routeOut`); the Tools
page lists it under "Now in the main sections", except `fishbasics`, which has no address of its own (`hub: false`). The
section each remaining prototype is meant for is in ROADMAP, the module registry row.

The tools: `basics` (Coral basics), `fishbasics` (Fish basics), `anatomy` (Corallite anatomy), `map` (mind map), `web`
(look-alike web), `zoom`, `size`, `elim`, `matrix`, `spot`, `reveal` (Blur reveal), `type` (Type the genus), `gallery`,
`pairs` (Memory), `samediff` (Same or different?, on the subject on screen, [quiz.md](quiz.md#same-or-different-lab-prototype))
and `idkey` (the Coral ID Key). `cards` is not a tool but the live gallery of the app's cards and pop-ups
(`#tools/cards/<kind>`: apology, update, feature, genus, tip, bonus, account, ach, toast), each opened through `app.js`
`cardShow` with sample copy and nothing recorded (the sign-in card, the achievement toast and the note are the real
ones). A prototype marked `admin: true` (the cards gallery) is listed in the hub in the admin's browser only
(`IS_ADMIN`); its link works for anyone. The Tools section is hidden on phones but for the header's hammer icon. Its
files are tier 5 of the load order (`proto/lab.js` with the prototypes; a failed one is tried again, `labLoad`).

A static mock-up for one of Pierre's decisions may also sit in `proto/` as a standalone `.html` page: not a Lab tool (not
in `LAB.files`, not cached by the service worker, nothing links to it), borrowing the app's `app.css` (a relative link
from `proto/`) for the tokens and fonts.
`fish-sheets.html` shows the fish sheets' genus as a block or a page (Q2 of
[the fish sheets study](../reviews/2026-11-05-fish-sheets-study.md)); it is removed once he has chosen and the real
sheet is built.

## One engine, two contents

`proto/basics.js` draws any basics module from its content object C (`id`, `name`, `steps`, `words`, `route(term)`,
`official(term)`, `key()`, `drawOpt(option, check)`, `hub`, `blurb`, `lede`); Coral basics' is `CORAL` there. It exposes
`BASICS.add(C)`, which `proto/fishbasics.js` calls (both files in `LAB.files` and in `sw.js`, in that order). The engine
never names a subject (rule S1): the page key is `basics` for both (`#learn/basics`, `#fish/learn/basics`), and
`proto/lab.js` `labTool` opens the module of the subject on screen, `UNITS` `basics` `mod` (`basics`, `fishbasics`).
Styles: `.bx-*` and `.bxd` in `proto/lab.css`, plus `.bx-picks`, `.bx-vfig`, `.bx-gfam` and `.bxf` for the fish.

Per subject:

- the record on the device, `basicsKey()` = `subjDev(S.id, 'basics')`: `reefid-basics`, `reefid-fish-basics`, holding
  `last` (the step to resume at), `done` (the checks passed), `walls` or `views` (the views seen), `seen` (the steps
  seen) and `fin` (when it was done). Browser only, never synced, cleared at sign-out with the progress (`sync.js`
  `signOutClear`): on a shared device the next player does not inherit it;
- `SUBJECTS` `basics: {feat}`: the done feat, `_basics` or `_fbasics`, in the synced achievements record (`progress.js`
  `achBasics(feat)`), so `app.js` `basicsDone()` (the local `fin` or the synced feat) is true on every device of the
  player; it and `basicsDue()` read the subject on screen's own record and feat, so finishing one never hides the
  other's offers. For the corals the feat also earns the achievement "Coral basics" ([achievements.md](achievements.md));
- `SUBJECTS` `pages` 'basics': the first Learn tab ("Basics" on phones), which `subjPage` never lands on;
- `UNITS` `basics: {mod, name, ask, kick, offer, lo, all, card, trail}`: the words of the Home line (`home.js`), the
  offer card and the "lower" card (`quiz.js` `startBasicsOffer`, `startFbShow`), the tour's last button (`tour.js`), the
  tab (`subjWords`) and the Learn card (below).

**Done** = every step seen (a step with views once each view is; the checks stay optional). Nothing is forced: the
stepper jumps anywhere and Next never waits for a check.

**The Learn card** (`learn.js` `basicsCard`, `basicsArt`) is step 0 of the Learn path, the first block of the Genera
page ("0 · Coral basics") or of the fish families page (`viewFishList`, "0 · Fish basics"): in the photo's place, the
steps as a trail of soft discs with line drawings (`BASICS_TRAIL` for the corals; `BASICS_TRAIL_F` and its places
`BASICS_AT_F` for the fish), one colour per step (`--bt1`…`--bt7`). A step seen is tinted with a ✓, the next one has a
deeper tint, a ring and "Next: …" ("Start: …" while none is seen), a step not reached is desaturated on a dotted path;
all are seen once `basicsDone()`. A narrow card (a container query) names only the next stop. The card's line reads
"7 short steps · about 5 min", then "n of 7 steps seen", then "✓ Done". The coral card always opens step 1
(`#learn/basics/colony`); in the slate order it is the first card; it hides while a search or family filter is on.

## Coral basics (`proto/basics.js`)

A guided path for players who never had the coral lecture. Routes: `#learn/basics` resumes at the last step (the Basics
tab, the Home line and the quiz's offers lead there); `#learn/basics/<step>` (`colony`, `polyp`, `corallite`, `septa`,
`teeth`, `walls`, `forms`); `#learn/basics/walls/<view>` (`separate`, `shared`, `valleys`, `nowall`);
`#learn/basics/<term>` (a glossary term such as `Coenosteum` opens its step and view); `#learn/basics/words`. Every older
`#tools/basics…` link lands on the same page (`viewLab`). With `|edit`, a tap logs photo coordinates and the tap targets
show.

**A step**: one photo, Pierre's (CC BY) or an IMR lecture photo (`PH`, coordinates in pixels of the 960 px file, crops
`[x, y, w, h]`), under an SVG layer (rings that dim the rest only lightly, `.bx-dim` 0.22 with a 2.5 px ring, and leader
lines) with HTML labels of a constant text size, or a drawing of ours (theme tokens, the taught part in `--hl`); one
plain sentence; the official line from `data.json` `terms` (IMR Lecture 6, Corals of the World) with its source; an
optional check (`choice`, `draw`, `tap` with hit points, `pick` a photo, `photo` or `form` classification; the growth
form definitions from `forms.json` `forms`). Once answered, every check shows the app's report button (`repBtn`, mode
`basics-<step>`, with the answer and the photos shown; rule U14) and its photos open the enlarged view (blind before the
answer); its photos also carry the games' clickable source pill (`photoSrc`, rule P5; hidden on phones). Every photo is
bounded by the screen's height (`--h` × `--ar` in `proto/lab.css`, rule U2).

**The enlarged view.** Every teaching photo is itself the enlarge button (`.bx-zoom`, the app's `ZOOMI` mark, no
"Enlarge" link): the enlarged view shows the whole photo with the step's labels over it and a Labels on/off switch
(`app.js` `zoom(list, i, {over})`: a layer `.lb-over` kept on the photo's box by a `ResizeObserver`, its SVG sized to
fill it, at fit and at actual size; `ANN` keeps each photo's marks).

**The steps.**

- **Polyp**: one large open polyp, *Tubastraea* (IMR lecture photo `imrl-p19_g64`, `POLYP`), mouth and ring of tentacles
  labelled, nothing dimmed; the day-extended *Goniopora* only as an aside.
- **Septa** (step 4, `septa`) teaches septa and costae together on an IMR lecture photo of *Diploastrea* (`PH.septa`,
  `imrl-p57_g172`: low cones, each with a small cup whose rim is sharp, short beaded septa inside it and the same blades
  running on as ridges down the cone outside it). Costae are immediately outside the wall, the septa carried on past
  the rim, never the skeleton between the cups. A dashed rim (`['rim', …]`), hollow rings (`hollow`) on the mouth, on a
  septum inside the rim (`--hl`, class `sep`) and on the same blade just past it (`--hl2`, the palette accent, class
  `cos`; `basicsTeach` checks it lies between 1.05 and 1.25 rim radii); the drawing in the same two colours with its key
  (`cupTop('both')`, `sepKey`); Costae is a term of its own (`more`, with the IMR Lecture 6 slide 13 line).
- **Walls** (step 6, `walls`) shows IMR's four wall structures one after the other, the fourth (indistinguishable
  walls) on *Pavona*: numbered tabs with ✓ for the types seen, a sentence per type; the main button reads "Next wall
  type: …" until the four are seen (`reefid-basics` `walls`), then "Next: Growth forms"; its check stays folded until
  then. The arrangements in its check follow the IMR lecture lines of each genus.
- **Growth forms** (step 7, `forms`) picks a form on drawn icons (`FORM_ICON`, ours, from the IMR definitions in
  `forms.json`) and shows 2-3 large example photos of it (`FORMS7`, picked by eye among the game photos of that form,
  of different genera, shown in the list's order, the first one largest, never reordered by who took them (rule P1);
  Tabulate has two, both *Acropora*; a photo no longer in `data.json` drops out), each enlarged with its genus and
  credit.

Every label was placed by looking at the photo (rule W11).

**The words.** The words, their step (or Corallite anatomy card) and their plain line are one table in the first tier,
`app.js` `BASICS_WORDS` (`basicsRoute`, `basicsListed`; the module's Words list and `window.BASICS` read it), so the
glossary popup links the same way before and after the Tools tier is in: the popup of every underlined term (ID tips
on genus sheets, first-meeting cards, quiz feedback, Genera cards; `app.js` `showGloss`, `basicsHref`) ends with a link
to its step ("Coral basics: on a photo"), to Corallite anatomy, or to the Words list (none for a word Coral basics does
not have).

**Tests**: `tests/pages.smoke.js` `basicsFit` (390×844 and 768×1024: the photos bounded by the screen, the source
pill) and `basicsTeach` (390 and 1280 px: the septa, costae and centre points against the rim, the costae term, the
enlarged views with their labels, the four wall types before the next step, the form icons with their 2-3 large
examples).

## Fish basics (`proto/fishbasics.js`)

The fish twin of Coral basics, on the same engine (`#fish/learn/basics`).

**A step of views**: an engine step type (`s.views`): drawn icons to pick a view, the view's figure, one sentence in
`.bx-wsay`; the step is seen once every view is, its button reading "Next: <view>" until then (`all: false` for a long
list, seen on opening); state `views` in the record, as the coral walls step.

**The six steps**:

- `shape`: seven silhouettes, named as the IMR presentation names its groups by shape (Disc-shaped, Ovals, Tapered,
  Heavy bodies, Slender, Bottom dwellers, Odd-shaped);
- `groups`: the key's groups that hold families in the game (from `TREEU.groups` and `GX(n).group`, never numbered in the
  code), each group's families as their covers (`cover`), enlarging with their credit; credited to the key's `cite`;
- `fins`: the six parts named on a generic reef fish, the dorsal fin (one or two) as the second view;
- `tails`: deeply forked, notched, square, rounded, pointed, heart-shaped;
- `marks`: bars, stripes, spots, saddle, eye band, false eye;
- `features`: one or two scalpels, a gill-cover spine, barbels, locking spines.

**Figures.** Every figure is a drawing of ours from a few SVG paths (the generic fish `G`, `SHAPE`, `TAIL`, `MARK`),
theme tokens only, the part taught in `--hl`, each with a text alternative; the pickers' icons are the same drawings,
small (`.bx-pi`, strokes kept at screen size).

**Checks**: `draw` (three drawings, in a new order each time: `drawCheck`, `drawOpt`), `choice`, and `own`, a step's own
check (the groups': a family's cover to place among three groups, blind until answered, with the answer's source and
report as the engine's).

**Words**: `WORDS` (term, step or step|view, plain line), with the IMR presentation's own lines verbatim in `OFFICIAL`,
and, for the few words its text does not define (stripe, spot, saddle, caudal peduncle), the fishIDER glossary's
(CSIRO, fishider.org/en/glossary) named as the source; each view's own `src` names what it rests on (the presentation,
fishIDER, Wikipedia "Fish fin"). No glossary popup links to it yet (the glossary's terms are the corals').

Photos are never fetched ahead: the covers are the families page's, at render.

**Tests**: `tests/fishbasics.test.js` (content, wiring, rules) and `tests/pages.smoke.js` `fishBasicsCheck` (390, 768
and 1280 px: the card, the Home line, every view drawn within 45% of the screen height, the groups from the key, done
and the corals' record untouched, the offer for "new").
