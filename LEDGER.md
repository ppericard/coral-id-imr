# Integrator ledger (night 2026-11-05 → 06) — branch only, never merged

If the container restarts: re-launch every track below that is not "merged"/"done", from its branch if it has one.
Open PRs: `gh api "repos/ppericard/coral-id-imr/pulls?state=open"`. Pierre's decisions: docs/STATUS.md and docs/reviews/.

| Track | Branch / PR | State | Restart brief |
|---|---|---|---|
| Progress v5 "coverage against the field" | PR #611 draft needs-pierre at a5b99c49 (last green); agent a4fb07fae2ce3ef9f idle, WIP local branch wip/progcov-hier-diag 752e0aff + scratchpad/progcov/bin | PAUSED 06:00 Manila: Pierre rejects the over metric (bar should be difficulty-indexed: easy → medium → hard photos) and the unfitted learner model; Custom-quiz block is intended | wait for research agent ac6abc040fc981db2 (docs/reviews/2026-11-06-progress-metric-research.md, PR claude/progress-metric-research), then redefine target with Pierre, resume a4fb07fae2ce3ef9f |
| learnsim field learner + real-log check | branch learnsim-field | ON HOLD: container restart ~16:56 UTC killed item_path (80/120 runs) and the watchdog; batch held until Pierre and research redefine the progress metric (the over metric is rejected); restart with run.sh | finish fieldeval, results in LEARNING.md, PR |
| Analyses views + player profiles (Q70-Q77) | #592 merged; #604 profiles (rebasing); PR3 branch claude/mfviz-wright | in progress | docs/reviews/2026-11-05-multifactor-viz-study.md |
| Deleted accounts policy + self-delete (Q84-Q91) | branch tbd | building | docs/reviews/2026-11-05-deleted-accounts-audit.md + Pierre's answers |
| Feedback cards #579 / #581 | PRs #579 #581 | green, wait Pierre's look at cards | rebase, next Code.gs VERSION |
| Fish B bug sweep | per-bug PRs | building | docs/reviews/2026-11-05-fish-release-plan.md item B |
| Fish C copy + release card | PR #598 draft needs-pierre | green, wait Pierre | merge with the flip |
| Fish E admin Candidates 5a → 5b | PRs #599, #602 (needs-pierre) | green, wait Pierre's look | plan item E + ROADMAP admin table |
| Fish multi-level confusion study | none (scratchpad) | running | study brief: nested vs global matrices, per player + global |
| Slot lock for heavy runs | #608 merged | done | Pierre: automatic lock for full unit tests and heavy tools |
| URL refonte | PRs #610 (admin), #612 (app, stacked) | green; MERGE ONLY after fish flip + 48 h; then study PR 4 (sheet ONCE_.routes, draft in scratchpad/once_routes*.js) a day after #612 is live | docs/reviews/2026-11-05-url-scheme-study.md |
| net.smoke step 9 investigation | branch tbd | building | ROADMAP row |
| Coverage 360 px overflow fix | #609 merged | done | admin Coverage table.cov-t 26 px too wide at 360 |
| Photos step 3 (history rewrite) | none | READY, needs Pierre's explicit go | scratchpad/step3/plan.md (regenerate if lost: HANDOVER step 3) |
| App icon | none | proposals ready (D2, B1-B4), wait Pierre's pick | scratchpad/icons/v2 |
| Name-similarity confusion study | none (scratchpad/name-confusion-study.md) | running | Pierre 18:33: do players confuse genera because names look alike (Pectinia/Pavona)? literature + real-log test + app options |
| Fish PR 7 curated photos in game | draft PR, stacked on #602 | building | fishOn rule, fetch_approved fish branch, curated list, no real R2 upload from session |
| Typed answers: retry on close misspelling (a player's idea, Pierre 'good idea') | draft PR needs-pierre | building | grading unchanged, one retry, highlight differing letters, log raw typed text if no breaking sheet change |
| Merged tonight | #578 #580 #582-#597 #601 #572 #605 #606 #608 #609 #613 #592 | done | — |
| Icon round 3 (B1 content, B2 style, optical centring) | scratchpad/icons/v3, agent ae3f5f053be74a91e | running | Pierre picks, then PR |
| Typed retry #616 warmer copy + single "Yes, but not quite" line | branch typed-retry, agent ad64a27da4ac8a782 | running | Pierre's OK on 2 Answers columns still needed |
| #579 v56, #581 v57 (cards approved by Pierre) + #603 wording (data deleted / "This account is archived.") v58 | agent a62cfed56b26e9870 | running | integrator merges in order; show #603 screenshots |

## 2026-11-06 morning (07:40 Manila), Pierre diving until ~12:30
Answers recorded in chat: Q92 group-only, Q93 beta stays, Q94 invitation card, Q96 no boost for Pierre's photos, Q97 log fish from day 1, Q99 choose subject + two-mode tour, Q100 flip is Pierre's, Q114/Q115/Q121(when he's free)/Q122→C1/Q126 C1/Q127-Q131 (bar = random-item domain score, own answers only, pairs = exam entry, new judge, #611 held), Q132-Q143 all yes incl. Q143 exam over 2 visits, 0-95 bar + exam to 100, Q144 merge URL refonte now; Q123 i yes, f sim, k = open confusion groups as consecutive series (one taxon at a time); Q125 answers (families = book entries); fish IMR course priority.
Agents (ids): progress judge a4fb07fae2ce3ef9f; #581/#603 a62cfed56b26e9870; fish photo order aacbe9a43eea22ba4; fish logging ac198cda1865f5a3a; onboarding a41f6cc3ef514ec3e; #598 invitation aee98445f92a471d1; data split fix ae0623065dd1a23e0 (branch claude/datajson-split-fix); fish sheets a2114182517c5bb2d; confusion-group opening a4f3f28532f42aef2; engine Q132/133/137 a0f3c62388b66f335; one level Q134 a132ad9a45066a2d9; formats Q136/138 a08b8f7448fbb5dc9; admin PR3+6 a0bba8f8ddb2d0032; URL refonte rebase a0d865df9434878dc; swiper fit + top-bar switch af6f88a8aab04854b.
Merged today: #621 STATUS, #579, #618, #623 icon C1. Open needing merge when green: rule W6 #626, research #622 (Pierre marked ready), reviews #625/#627 (docs).

## 2026-11-06 ~12:00 Manila
Merged this morning: #621 #579 #618 #623 #626 #627 #581 #622 #628 #640 #603 #642 #644 #616 #630 #632 #643 #639 #610 #645 #612 #634. Main: sheet v66 (deploy log v65 live 11:49), rules v7.
Waiting for Pierre (needs-pierre): #599/#602 swiper fit (fishE2 shots), #633 mini switch, #635 fish photo order (P1 wording, tie-break), #636 units page (tab name "Families" vs IMR entries), #629 onboarding choice, #631 fish sheets mockup A/B + Amphiprion/Diploprion, #637 Q145, #638 Q146 (+Q147 slope), #641 confusion groups a-j, #598 invitation card (still a draft: Pierre must click Ready), #614 PR7, #624 judge (baseline), #625 coherence review (draft). #611 held.
Running: progress part 2 (a4fb07fae2ce3ef9f, posterior grid bar on scoreAnswer) + judge's remaining worlds (~6 h, light chunks).
Machine: 3 container restarts today (01:00, 07:05, 08:54 Manila), never memory; watchdog every 60 s.
