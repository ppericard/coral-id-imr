# "Did you know?" tip (g): the corallites hint, for the player who never opens it after many misses

Date: 2026-11-25. PR: #1587. Rules or docs touched: S1, W19; docs/spec/cards.md "Did you know tips"; docs/DESIGN.md "Cards"; REE-13.

## Context

The owner decided on 2026-11-04 (paraphrase, as recorded in REE-13) that "Did you know?" pop-ups serve players who never used a feature, enabled one at a time, each target checked on the answer log first. Tips `zoom`, `custom` (a), `duels` (b), `mixups` (c), `basics` (d), `identify` (e) and `typed` (f) were built. Candidate (g), in the list he agreed: "Show the corallites hint: never used after many misses on questions that offered it".

What the log can say: before the hint-logging fix (#1529, 2026-11-24 09:44 Manila) every hinted answer carried the hint photo in `ph` and none in `sc.h`, so an opened hint and a hint left closed could not be told apart, nor a hinted question from one whose own photo set has a close or macro view. Since the fix, a hint offered and left closed is named in `sc.h`; an opened one is still one photo among the answer's own.

## Decision

Tip `hint` is one `tips.js` registry entry plus two device counters (`quiz.js`):

- `u.h`, the hint's openings: the player's own tap on the link under the photos (`question()`, `tipOpened('h')`). The reveal that `go()` makes after an answer is not one (it calls `showHint` itself, with the question not yet marked answered, so the count sits on the button's own click and not inside `showHint`).
- `u.w`, the misses on a question that offered the hint and left it closed: `answer()` already receives the hint left closed (`unseen`), and passes `miss && unseen` through `tipAfter` to `tipNote`. A hinted miss with the hint opened is not counted (then `u.h` is 1 and the tip is out anyway).

The tip is for a player with **10 or more** such misses (`TIPR.HINT`) and `u.h` 0, in a subject that declares the hint's words. It shows in the Quiz and the Custom quiz, **only at the Next right after another such miss** (the link was in view and left closed; `wait: Infinity`: no other break will do, because the card names a link the question just answered had), twice at most, the second 150 questions after the first, last of the seven tips when several are due. The card: "Did you know?", "Stuck? Show the corallites", "Tap “Show the corallites (hint)” under the photos before you answer: it adds a close-up of the corallites, the detail that often tells look-alikes apart." ("Click" with a mouse), **Got it** only: there is nothing to open (the feedback has just shown the corallites, the link is on the next question that has one).

**One engine (S1).** The words are declared by the subject, in `app.js` `UNITS.coral.hint` (`name`, `lo`), the way `idtip` is. A subject that declares none has no tip (`b.hx` 0): the counters are per device and not per subject, so this is the gate. Only the corals have a hint today: `model.js` `photoSet` gives one only to a colony with a wide, a medium and a macro view, and the fish and the sea slugs have one view (`SUBJECTS` `views`), so their questions never offer it. The day another subject has a second view, declaring its words serves it with the same entry. The link's own text reads the same declaration, so the card quotes the link exactly.

Integrator's calls, each easy to correct: building (g) with no measured audience (below), N = 10, counting only misses with the hint left closed, the moment (only after such a miss), the games, the caps, the wording and Got it alone.

## The target, and why it was built with no measured audience

The 2026-11-24 note on REE-13 held (g) until the answer log had coral rows since #1529 so the target could be counted, and until `quiz.js` was free. The integrator's check of 2026-11-25 (about 15:05 Manila) found the lane free and 31 coral rows since the fix, all from one player: 2 with `sc.h` named (hint offered and left closed), at most 4 with a second photo and no `sc.h` (hint possibly opened, not separable from two-photo sets). That is too thin to judge the target. **The integrator's call (easy to correct): build (g) now on the same footing as tip (f)**, which went ahead with no measured audience, "for the players Pierre trains next" ([record](2026-11-22-tip-f-typed-answers.md)). N = 10 is a choice, not a fit: the data cannot say how many hinted misses make "many".

## Consequences

- The tip reaches nobody the data shows today; nothing is lost if it never shows. The Answers tab can be re-read for hinted misses with `sc.h` named once more players have synced since #1529.
- Both counters start at 0 on the device: the log cannot say who opened the hint, so a player who used it before the counters existed may get the card after 10 more misses; **Got it** ends it, and the first tap on the link ends the audience for good.
- A signed-in device keeps its counters as for the other tips (per device, kept on sign-out); a tip shown on two devices does no harm.
- A Duel tab question can offer the hint too, and a miss there counts like any other; the card itself shows only in the Quiz and the Custom quiz (the Duel tab keeps its own cards, as for tips (b) to (f)).
- Specified in [cards.md](../spec/cards.md#did-you-know-tips).
