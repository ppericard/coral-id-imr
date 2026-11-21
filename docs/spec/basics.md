# The Lab and the basics modules

The Tools section (the Lab of prototypes, `proto/`) and the basics modules that graduated from it into Learn, Coral
basics, Fish basics and Sea slug basics. Why each part was decided: [docs/decisions/](../decisions/README.md). The pages and addresses
around them: [front-end.md](front-end.md); the look of the Lab drawings: [DESIGN.md](../DESIGN.md) "Lab drawings"; the
fish module's place on the fish path: [FISH_PATH.md](../FISH_PATH.md) "Fish basics".

## The Lab (`proto/lab.js`)

`proto/lab.js` holds the hub (`#tools`, `#tools/<id>`), `LAB.files` (the tools, in their order, each in its own
`proto/<id>.js` registering itself with `LAB.add()`), `LAB_V` (the Lab files' cache version, stamped at deploy) and
`GRADUATED`, the tools promoted into a section: `idkey` (Identify), `pairs` (Practice), `basics`, `fishbasics` and
`seaslugbasics` (Learn). A graduated tool's page key keeps its id and gets its address in its section (`core.js`
`routeOut`); the Tools page lists it under "Now in the main sections", except `fishbasics` and `seaslugbasics`, which have
no address of their own (`hub: false`). The section each remaining prototype is meant for is in ROADMAP, the module
registry row.

The tools: `basics` (Coral basics), `fishbasics` (Fish basics), `seaslugbasics` (Sea slug basics), `anatomy` (Corallite anatomy), `map` (mind map), `web`
(look-alike web), `zoom`, `size`, `elim`, `matrix`, `spot`, `reveal` (Blur reveal), `type` (Type the genus), `gallery`,
`pairs` (Memory), `samediff` (Same or different?), `oddone` (Odd one out), `matrixgame` (Matrix), `idkey` (the Coral
ID Key) and `fishkey` ([the Fish ID Key](fish.md#the-fish-id-key-lab)). `cards` is not a tool but the live gallery of the
app's cards and pop-ups (`#tools/cards/<kind>`: apology, update, feature, genus, tip, bonus, account, ach, toast), each
opened through `app.js` `cardShow` with sample copy and nothing recorded (the sign-in card, the achievement toast and the
note are the real ones). A prototype marked `admin: true` (the cards gallery) is listed in the hub in the admin's browser
only (`IS_ADMIN`); its link works for anyone. One with `on()` false (`fishkey` while its subject is closed to the player)
is neither listed nor opened. The Tools section is hidden on phones but for the header's hammer icon. Its files are tier
5 of the load order (`proto/lab.js` with the prototypes; a failed one is tried again, `labLoad`).

`samediff`, `oddone` and `matrixgame` (decisions: [Same or different?](../decisions/2026-11-19-same-or-different-lab.md),
[Odd one out](../decisions/2026-11-19-odd-one-out-lab.md), [Matrix](../decisions/2026-11-19-matrix-lab.md)) follow the
subject on screen: untimed, counted nowhere, units from `unlocked()`, photos from `photoSet` in one view. `sdPlan` draws a
declared pair; `ooPlan` a unit and its intruder, a declared look-alike when one is unlocked: three observations and one,
framed alike; `mxPlan` four units, from a declared pair outward, and a fifth name. Same or different? uses the quiz's stage
(`.q.sdq`), the others Find the X's (`.qfind`, `.fxt`); all `fitStage`, `fbLine`, `repBtn` and `proto/lab.js` `labShots`,
`labTips`, `labSheet`, and none calls the quiz's recorders (`tests/oddone.test.js`, `tests/matrixgame.test.js`).

Matrix: a right pair names its tile and ticks its name, a wrong one is kept nowhere and the retry is free; its names are
`data-n`, not `data-c` (`qAnswers` opens every `[data-c]`).

`downtree` ([Down the tree](../decisions/2026-11-21-down-the-tree-lab.md), `proto/downtree.js`): one photo named step by
step, the unit's lineage read from the records' `parent` and `rank` (`dtLineage`), asked only while each step's unit is
unlocked (`dtSteps`, rule L4), the names of a step of one rank (`dtChoices`); each step is a point on the screen only
(the end sheet says "N of M steps right"), nothing is recorded. Offered (`on()`) to a subject whose tree has species
units (`TREEU.ssl`), so not to the corals.

`type`, `reveal` and `web` follow the subject on screen too ([decision](../decisions/2026-11-20-lab-tools-every-subject.md)),
each in the subject's own words (`SUBJ.one`, `SUBJ.what`, `SUBJ.many`: Type the genus is "Type the family" for the fish),
through getters on the tool (`title`, `blurb`, `lede`), and none of them calls the quiz's recorders
(`tests/labgames.test.js`). The two games draw `unlocked()` units, one unit and one photo through `lab.js` `labDraw` and
`labShots` (a typed question's aim for Type, a four-choice question's for Blur reveal), with `labViewChips` for a subject
with several views (`SUBJECTS` `views`; none for a one-view subject) and `labEmpty` for the nothing-to-ask note. Type calls
the quiz's own `typeForm`, `typeBind` (the rank asked, the unit's word, the photo's species), `typeUnit`, `typeRead` and
`typeStep`, so a fish family's shared or part names, the retype and the old names read as in the quiz; Blur reveal's three
wrong choices are `distractors` (the unit's rank, no two of one label, look-alikes first) and its verdict the quiz's
`fbLine`. The web is a reference page, not a game: its nodes are the units of the subject's slate that are in a pair of
`UNITS[SUBJ.id].pairs()` (the corals' 39 genera and Millepora, 15 fish families, 12 sea slug genera at the time of
writing; never the bonus genera), its colourings are the subject's own (`UNITS` `webBy`: by family and by IMR group for the
corals, by the key's group for the fish, by family for the sea slugs), and a tapped node links its look-alikes to the
side-by-side Compare page where the subject has it (`SUBJECTS` `pages` `cmp`), else to their sheets. Rule U2 is asked of
the two games (`tests/labgames.check.js`, run by the pages, fish and sea slug smokes at 390 and 1280 px), not of the web.
On phones Blur reveal answered shrinks its photo to a strip (`.rvdone`) so the verdict and Next stay on the screen.

The tools that read the corallite traits stay the corals': `spot` (Spot the feature), `zoom` (the Zoom ladder, which also
needs several views), `elim`, `anatomy` and the reference tools on `DATA.traits` (`idkey`, `matrix`, `gallery`, `size`,
`map`). They use `labPlay` and `labNames`, which force the corals and say why in `lab.js`.

A static mock-up for one of Pierre's decisions may also sit in `proto/` as a standalone `.html` page: not a Lab tool (not
in `LAB.files`, not cached by the service worker, nothing links to it), borrowing the app's `app.css` (a relative link
from `proto/`) for the tokens and fonts.
`fish-sheets.html` shows the fish sheets' genus as a block or a page (Q2 of
[the fish sheets study](../reviews/2026-11-05-fish-sheets-study.md)); it is removed once he has chosen and the real
sheet is built.

## One engine, one content per subject

`proto/basics.js` draws any basics module from its content object C (`id`, `name`, `steps`, `words`, `route(term)`,
`official(term)`, `key()`, `drawOpt(option, check)`, `hub`, `blurb`, `lede`); Coral basics' is `CORAL` there. It exposes
`BASICS.add(C)`, which `proto/fishbasics.js` and `proto/seaslugbasics.js` call (the three files in `LAB.files` and in
`sw.js`, in that order). The engine never names a subject (rule S1): the page key is `basics` for all
(`#learn/basics`, `#fish/learn/basics`, `#seaslug/learn/basics`), and `proto/lab.js` `labTool` opens the module of the
subject on screen, `UNITS` `basics` `mod` (`basics`, `fishbasics`, `seaslugbasics`). Styles: `.bx-*` and `.bxd` in
`proto/lab.css`, plus `.bx-picks`, `.bx-vfig`, `.bx-gfam` and `.bxf` for the drawn modules, `.bx-few`, `.br` and `.tp` for
the sea slugs'.

**The kit** (`proto/basics.js` `BASICS_KIT`, before the engine in the same file): the pieces the subjects' own modules
share, read at render time: `drawCheck` (a check whose options are drawings, in a new order each time), `unitFigs` (a few
units' covers, the Learn tiles' photo `app.js` `cover`, each enlarging with its credit), `groupView` and `groupCheck` (a
groups step's view, one group and its units' covers, and its check, a unit's cover to place among three groups, blind
until answered), each module giving its own words (a group's name, the question, the answer's line).

Per subject:

- the record on the device, `basicsKey()` = `subjDev(S.id, 'basics')`: `reefid-basics`, `reefid-fish-basics`,
  `reefid-seaslug-basics`, holding
  `last` (the step to resume at), `done` (the checks passed), `walls` or `views` (the views seen), `seen` (the steps
  seen) and `fin` (when it was done). Browser only, never synced, cleared at sign-out with the progress (`sync.js`
  `signOutClear`): on a shared device the next player does not inherit it;
- `SUBJECTS` `basics: {feat}`: the done feat, `_basics`, `_fbasics` or `_sbasics`, in the synced achievements record (`progress.js`
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
page ("0 · Coral basics") or of the fish families page and the sea slug genera page (`viewList`, `listBasics`, "0 · Fish basics",
"0 · Sea slug basics"): in the photo's place, the steps as a trail of soft discs with line drawings (`BASICS_TRAIL` for
the corals; `BASICS_TRAIL_F` and its places `BASICS_AT_F` for the fish; `BASICS_TRAIL_S` and `BASICS_AT_S` for the sea
slugs), one colour per step (`--bt1`…`--bt7`). A step seen is tinted with a ✓, the next one has a
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

**The words.** The words, their step (or Corallite anatomy card) and their plain line are one table in the first tier,
`app.js` `BASICS_WORDS` (`basicsRoute`, `basicsListed`; the module's Words list and `window.BASICS` read it), so the
glossary popup links the same way before and after the Tools tier is in: the popup of every underlined term (`app.js`
`showGloss`, `basicsHref`) ends with a link to its step ("Coral basics: on a photo"), to Corallite anatomy, or to the
Words list (none for a word Coral basics does not have).

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

## Sea slug basics (`proto/seaslugbasics.js`)

The sea slugs' twin of Fish basics, on the same engine (`#seaslug/learn/basics`;
[decision](../decisions/2026-11-20-seaslug-basics.md)): the few body parts that tell the sea slug groups apart on a photo.

**The four steps**, each a step of views:

- `dorid`: a dorid part by part: the parts named, the rhinophores (in their sheaths), the gill circlet, Phyllidia's gills
  along the sides, the mantle and its skirt, the oral tentacles;
- `cerata`: an aeolid's parts, its cerata, the cnidosac at their tips;
- `others`: a sea hare's parapodia, a sacoglossan's, Chelidonura's headshield, a side-gilled slug's gill (drawn facing
  right: the side seen is its right side, where its gill is);
- `groups`: the groups of the Learn page (`seaslug.json` `taxa`, WoRMS; `TREEU.taxa`) that hold genera of the slate, in
  their order, each by its name (no number), its icon one of the drawings, up to six of its genera's covers (the slate's
  order) and a sourced line matched on its name (`GROUP`), the classification cited under it.

**Figures.** Every view is a drawing of ours (theme tokens only, the part taught in `--hl`, a text alternative) and, under
it, the covers of up to three genera of the game that show the part (`gen`, by their names; a genus the game does not
hold drops out), each enlarging with its credit (`BASICS_KIT.unitFigs`, `.bx-few`).

**Checks**: `draw` (a dorid with one part highlighted; a whole aeolid, dorid or sea hare; the other sea slugs) and the
groups' photo check (`BASICS_KIT.groupCheck`).

**Sources** (`REF`): the Sea Slug Forum's fact sheets (Rudman, Australian Museum) and Wikipedia's "Nudibranch" at a fixed
revision, each line naming those it rests on; `official` gives a source's own line, verbatim, for a few words. The
sources' old group names (Notaspidea, Anaspidea) are said as theirs; the groups' names are WoRMS's (rule C5). The genera
named are the game's; no species is in a cue line, the only species on screen being in the source lines, the titles of
the fact sheets read, each a species of the game (rule C6).

**Tests**: `tests/seaslugbasics.test.js` (content, sources, line lengths, the genera, wiring, Basics open) and
`tests/seaslug.smoke.js` part 7 (390 and 1280 px: the card, the Home line, every view's drawing within 45% of a phone's
height, and on a phone the picker, figure and sentence with its source, and the answered check, each within the room
between the header and the tab bar; the groups from `taxa`, the checks, done, the corals' and the fish's records
untouched, the Tools page's line).
