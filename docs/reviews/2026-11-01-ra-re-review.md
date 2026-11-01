# First-time RA re-review of the coral ID app

> **Copied into the repo for the handover (2026-11-01).** Original: a private Claude doc on claude.ai (not reachable from another account).
>
> **Status since:** 1-2 fixed (#267 tour cut to 5 steps, #284 bubble never covers its target); 3 fixed (#273, #285: easy wrong choices first, look-alikes from the first right answer); 4 fixed (#269 cards lead with a photo of the picked form); 5 fixed (#280 big Yes/No question cards); 6 fixed (one compact bonus tile; no "!" on "Review 0" since 2026-11-01); 7 open (photo-dependent; see ROADMAP); 8 fixed or declined: no long name cut on the progress wall, what a genus still needs is on its sheet (2026-11-01); the phone hammer icon stays unlabelled (Pierre: Tools is not put forward); the tour no longer has a photo-size step.

Nov 1, 2026 · Pierre Pericard

## Verdict

The app is clearly better than at the first RA review this morning. Most of what stopped a newcomer then is fixed: help on the genus sheet, tour wording, a one-line learned rule, consistent "Close-up" labels, a labelled score ("0/1 right"), named colour palettes, and "Show all 66 genera (39 on the slate)". As a new RA I was answering questions within two minutes, the wrong-answer screen taught me something every time, and nothing crashed (no console errors, about 3 s to load).

What still hurts a first visit is mostly the **welcome tour on phones** (one step points at nothing) and **how hard the very first questions are** for someone who knows zero genera. The rest is polish.

## How I tested

I played a new IMR Research Assistant with no coral knowledge, sent the link with "learn the slate before ReefCloud". Live site <https://ppericard.github.io/coral-id-imr/>, fresh browsers with no admin token, at 1440 px (desktop), 412 px (phone, touch) and 768 px (tablet). I ran the full welcome tour, browsed Learn, played about 30 quiz questions, a duel and Memory, ran the Coral Finder from a growth form to the candidate cards, and opened My progress, ⚙ and every ? box. I did not sign in, so no fake RA reached the Sheet. I formed my findings first and only then reread the previous review.

## Findings, ranked by how much they hurt a first visit

1. **Phone tour, step 8 "Sign in" points at nothing.** At 412 px the page scrolls so the sign-in box sits under the header: the spotlight is a thin cut-off strip at the very top, and the bubble at the bottom describes something I cannot see. On desktop the same step works well. The phone is the RAs' main device, and this is the step that gets them saved for their trainer.
2. **Tour text doesn't match the question it lands on.** Step 3 says "Two photos of the same coral: the colony, then a close-up", but on desktop the question it showed had one colony photo only. Step 5 ("Show the corallites") is skipped when that question has no hint button: the counter stays at 4/9 for one click, then jumps to 6/9. I noticed, and wondered what I had missed.
3. **The first questions are very hard for a complete beginner.** From question 1 the four choices are look-alikes (Anacropora / Alveopora / Astreopora / Goniopora; Pavona / Platygyra / Leptoria / Lobophyllia). On desktop my first two answers were both ★ "not surveyed" genera (Alveopora, then Cyphastrea). On phone, answering without knowing anything, I got 0 out of 6. The feedback is excellent, so I did learn, but the first five minutes felt like an exam I hadn't studied for. This is a design question for Pierre rather than a bug: the ★ genera are always in Practice on purpose. One option within the rules: for a genus's very first questions, pick the other choices from a different IMR growth form, then move to look-alikes once it has been answered right.
4. **Coral Finder cards can show a photo that contradicts the chosen growth form.** I picked "Massive or thick". In the default Mix view, the Hydnophora card showed a branching colony and Pachyseris a leafy one. A newcomer compares their massive coral with those photos and rules the genus out. When a form is picked, the cards could prefer a photo tagged with that growth form (the per-photo growth forms already exist).
5. **The Coral Finder's next-clue boxes don't look tappable.** "Separate walls? Yes 11 / No 9" sits in a dashed box that reads as a placeholder, so I only found out later that it was the next step. On desktop the results page also has two rows of switches (Auto / Cards / Mosaic / Contact sheet, and Mix / Colony / Close-up / Corallites) plus an "IMR growth form" heading with nothing under it in the side panel. For a first visit that's a lot of controls before the photos.
6. **My progress: six "?" tiles marked 10%, 15%... 35%.** Before reading the help they look like broken images. A small caption on the first one (for example "Bonus genus, unlocks at 10%") would explain them where they are. The red ! on "Review 0" is still there and still made me think I had done something wrong (also in the previous review).
7. **Some wrong-answer comparisons aren't like for like.** Alveopora (a live close-up with polyps) was compared with Anacropora as a white skeleton on black. "Same view" holds, but colour and context differ so much that I couldn't see the deciding feature. Minor, and it depends on the photo.
8. **Small leftovers.** The hammer icon in the phone header has no label (title "Tools" only, no text). On tablet, "Duncanopsammia" is cut on the progress wall. Tour step 9 says ⚙ sets photo size, but the Photo size row only shows on some pages, so it wasn't there when I opened ⚙ from Home or My progress.

## What works well

- **Home**: two doors, understood in seconds. The ReefCloud photo with its point box tells me what "Identify" is for.
- **Genus sheet**: ID tips in the highlighted box with a mnemonic, Colony / Close-up / Corallites rows, and the ? now explains the IMR group as "the lecture's confusion group". Still the best page.
- **Quiz feedback**: on phone, the right and wrong photos side by side, the ID tips and "Why not X" all fit one screen with Next always visible. "This pair comes back as a duel in a moment" makes the app feel like it's following me.
- **Duels and Memory**: quick and clear, and the duel feedback uses the IMR cues ("wall often looks bleached").
- **Phone Coral Finder**: pick a form, then answer one guided question at a time. This is the fastest path in the app.
- **My progress help** now opens with the one-sentence rule: harder photos, once with the corallites, once in a duel; a mistake counts for both genera.
- **Sign-in box**: clear, reassuring wording ("New name: pick any code and remember it").

## Compared with the previous RA review

| Previous finding | Now |
| --- | --- |
| Empty ? on genus sheets | Fixed: useful help, explains the IMR group |
| Tour text out of date (green, photo source) | Fixed: "darkest, with a tick"; photo source gone. New tour issues on phone (findings 1-2) |
| Learned rule not explainable in one line | Fixed: the help opens with the rule |
| Corallites hint not always offered | Still true by design: offered on 4 to 9 of 12 questions in my runs |
| 39 vs 66 genera | Mostly fixed: "Show all 66 genera (39 on the slate)" |
| Jargon in group titles and cards | Better: glossary popups on the ID tips; group titles still technical |
| Closer / Close-up, unlabelled score, colour names | Fixed |
| Red ! on Review 0, unlabelled hammer icon | Still open |
| Truncated names on phone progress wall | Fixed on phone, one name still cut on tablet |
| Tools / Look-alikes status unclear | Unchanged, but less of an issue: Look-alikes is a Learn tab with "Drill this pair" |

## Not checked

Signing in and sync (on purpose), dark mode, and actually taking a genus all the way to Learned.
