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
