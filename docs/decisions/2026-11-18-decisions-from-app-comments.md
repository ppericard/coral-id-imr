# Decisions from the app's code comments: kept here when the comments were cleaned

Date: 2026-11-18. PR: #1124, the comment clean-up of `model.js`, `app.js`, `quiz.js` and `sync.js`. Rules or docs touched: none
(rule W19: history stays in git and the PRs, decisions in `docs/decisions/`).

## Context

The comments of the four app scripts carried Pierre's dated words as a changelog. The clean-up keeps in the code what it
does and why; a dated decision whose words were in no doc moves here, one line each, so it survives. Decisions already
documented (docs/LEARNING.md, docs/ARCHITECTURE.md, the rules, ROADMAP, the reviews) are not repeated.

## Decision

Each line: the date, Pierre's words as written (French where he spoke French), what it decided, where in the code.

- 2026-11-08 (Q227): "il faut garder cette information de un jour il a cliqué sur je suis à IMR". A player who ever
  answered "I'm at IMR" to a subject's first-launch question keeps that fact, whatever the answer in force now (the
  record's history, merged as a union across devices). `model.js` `imrSaid`.
- 2026-11-02, after an RA at 86% right met 9 genera in 21 answers and dropped to 5 right in 10: "when many genera have
  just opened and the answers suddenly get worse, space the new ones; an expert keeps opening regularly". The opening
  hold: no new card while the answers fall clearly below the expected success (a CUSUM). `model.js` `introHold`,
  `holdNext`; docs/LEARNING.md "First meeting with a genus".
- 2026-11-01: "an ultimate test to go from 95% to 100%". The silent mastery exam: questions slipped into the quiz
  unannounced, its count shown nowhere, all right to reach Learned. `model.js` `EXAM`, `examSet`.
- 2026-11-01: "at the very start it must be simple", then look-alike traps come in little by little, since look-alikes
  are how genera are learned. The number of traps among the wrong choices follows the genus's ability. `model.js`
  `FORMAT`, `trapsFor`, `distractors`.
- 2026-11-08, after a device holding an old copy of an account showed again the cards and toasts already seen on
  another: "as long as the page is not synchronised, there is no point showing things for the umpteenth time". For a
  signed-in player the one-time cards and the achievements check wait for the visit's first sync, then are decided on
  the merged state. `sync.js` `NOTICE`, `noticeLater`, `noticesGo`.
- 2026-11-05: "a player can delete their own account and all their data themselves, from a discreet page". The page
  #about/delete-account, linked from About › Privacy and the privacy notice, never from a menu; the sheet deletes
  everything but a tombstone. `sync.js` `viewDeleteAccount`; docs/ARCHITECTURE.md "Pages and routing".
- 2026-11-05 and 2026-11-06, on the typed answers' spelling step (a player's idea; Pierre: "Good idea!"): a name typed
  close but not exact is still right, and the player retypes it once. Its first plain line read like "a mean teacher
  saying no", so the nudge is a warm one ("✏️ So close! … just fix the spelling and try once more"). `quiz.js`
  `typeBind`.
- 2026-11-14 (Q124), on the name confusion study (docs/reviews/2026-11-05-name-confusion-study.md): "Je suis tes
  recommandations pour tout". After a mix-up of two similar names, the feedback shows both with the differing letters in
  bold. `quiz.js` `namesAlike`, `namesDiff`, `namesLine`.
- 2026-11-08 (Q290), of the Thresher sharks' surprise card: "we can use my cover for the card". A wink unit's ★ Cover,
  when it is in play, is the surprise card's photo before the photos chosen for it. `quiz.js` `winkPhoto`.
- 2026-11-01: "preload the photos". The next questions are chosen ahead and their photos fetched while the feedback is
  read, so Next shows one at once on a slow line. `quiz.js` `planNext`, `NEXTQ`, `AHEAD`.
- 2026-11-02, an RA tester's words, taken up: "so that we aren't taken out of the game". A genus sheet opened from a game
  opens in a new tab on a computer; the same tab on a phone or tablet. `quiz.js` `sheetTab`.
- 2026-11-12, of the custom quiz's reminder "N new genera are waiting in the Quiz" while the opening hold is on: "peut-être
  pas quand même". The reminder waits for the hold to end; still shown once ever. `quiz.js` `leftDue`.
- 2026-11-01: "sources en petit et cliquable sur chaque photo". Every game photo carries a small clickable source label
  once the answer is out (iNaturalist observation, FishBase page, or the page crediting an IMR lecture photo). `app.js`
  `photoSrc`.
- 2026-11-08, of the header's subject chip and its menu: "it makes me click twice on desktop to change mode". With two
  subjects the header shows a one-click switch; the chip and its menu only from three subjects. `app.js` `subjCtl`.
- 2026-11-02, an RA tester's words, taken up: "click and drag rather than scrolling". At actual size in the photo
  viewer, a mouse drags the photo around. `app.js` `zoom`.
- 2026-11-04, of a name a reference spells another way: "show both, the IMR one first". `app.js` `altName` (data.json
  `spell`).
- 2026-11-04, of the fish subject in beta: "some things clearly aren't ready". A subject that opens to a group is shown
  to the admin and to the players of its group only; anyone else opens on the corals. `app.js` `subjOpen`, `subjAt`.
- 2026-11-06: "you're invited to test the fish beta". The card a player of the fish beta group gets once, at a calm
  moment on Home. `app.js` `UNITS` fish `hello`.
- 2026-11-07, of the card offering the fish families beyond the IMR course: "don't ask again for a while". After a "Not
  now" the card comes back at most once, OPEN_AGAIN answers later. `app.js` `openOfferDue`; `core.js` `openState`.
- 2026-11-08: "on the home page on desktop we have the Corals | Fish switch twice". On Home the header's subject control
  steps aside (kept invisible, so the header keeps its size), Home's own row being the switch there. `app.js` `route`.
- 2026-11-02, on asking players for feedback: people answer a tap, not "any comments?". The one-tap question between an
  answer and the next question. `quiz.js` `PULSE`, `pulseAsk`; docs/LEARNING.md "What the players say about the
  difficulty".

## Consequences

The code comments point here in a few words where they once quoted these decisions.
