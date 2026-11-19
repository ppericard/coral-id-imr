# Fish genera with IMR cues: our sourced ID marks under them, as the families

Date: 2026-11-19. PR: #1231. Rules or docs touched: tools/build_fish.py, tools/fish_genus_marks.json, points.json,
docs/spec/fish-sheets.md, tests/genusmarks.test.js.

## Context

The fish families IMR describes showed IMR's cues verbatim, then our own sourced ID marks under them. The genera did
not: the build refused marks for a genus with IMR cues, so that the IMR cues "stay apart" (rule C1). Eight genera have
IMR cues: Dascyllus, Pomacentrus, Chromis, Heniochus, Zebrasoma, Ctenochaetus, Acanthurus and Naso.

## Decision

Pierre, 2026-11-19 15:40 Manila, on the rule that kept them apart: «Mouais bof». Integrator's call (easy to correct):
the genera follow the families' pattern. A genus with IMR cues may take 1 to 3 marks, on the same terms as the other
genera: FAO species guide and FishBase, seen on a photo, never a count, faithful to its cues. A source that differs
from IMR goes to `points.json` (rule C5). Its IMR cues stay its tips and present it: no presentation and no reason in
`none` for it. A genus with no feature seen on a photo in the sources gets no entry, and no mark is guessed (rule C2).

## Consequences

- Five genera show marks on their pages under the IMR box: Dascyllus, Heniochus, Zebrasoma, Acanthurus and Naso.
- Chromis, Pomacentrus and Ctenochaetus have none. Their FAO keys use the cheek's serration, the scales and the teeth
  only, and Ctenochaetus's FishBase pages share no visible feature.
- One point opened, `fish-naso-one-plate`: the FAO key gives three game Naso species a single tail-base plate, where
  IMR says two scalpels.
- The quiz and the cards are unchanged: an IMR genus's tips are still its IMR cues.
- Specified in [spec/fish-sheets.md](../spec/fish-sheets.md) "Genus presentation and ID marks".
