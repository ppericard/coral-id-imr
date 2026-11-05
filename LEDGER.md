# Integrator ledger (night 2026-11-05 → 06) — branch only, never merged

If the container restarts: re-launch every track below that is not "merged"/"done", from its branch if it has one.
Open PRs: `gh api "repos/ppericard/coral-id-imr/pulls?state=open"`. Pierre's decisions: docs/STATUS.md and docs/reviews/.

| Track | Branch / PR | State | Restart brief |
|---|---|---|---|
| Progress v5 "coverage against the field" (PRIORITY, ready 07:00 Manila) | draft PR needs-pierre (branch tbd) | building | docs/reviews/2026-11-05-progress-setsize-study.md + Pierre's answers Q101-Q110 (STATUS): pair discrimination levels from existing pairConf records shrunk to global, confusion-weighted coverage, bar 0.95·min(1,pg/M)·(0.4+0.6√c), similarity-weighted typed set, bonus out, two-tone bar (switch), exam unchanged + personalised-exam proposal, rules-version replay, apology card (name from sheet, never repo), per-player table, sims 30+30 seeds, never merge without Pierre |
| learnsim field learner + real-log check | branch learnsim-field | sims running (scratchpad/fieldrun) | finish fieldeval, results in LEARNING.md, PR |
| Analyses views + player profiles (Q70-Q77) | PR #592 (+ next) | building | docs/reviews/2026-11-05-multifactor-viz-study.md |
| Deleted accounts policy + self-delete (Q84-Q91) | branch tbd | building | docs/reviews/2026-11-05-deleted-accounts-audit.md + Pierre's answers |
| Feedback cards #579 / #581 | PRs #579 #581 | green, wait Pierre's look at cards | rebase, next Code.gs VERSION |
| Fish B bug sweep | per-bug PRs | building | docs/reviews/2026-11-05-fish-release-plan.md item B |
| Fish C copy + release card | PR #598 draft needs-pierre | green, wait Pierre | merge with the flip |
| Fish E admin Candidates 5a → 5b | PRs #599, #602 (needs-pierre) | green, wait Pierre's look | plan item E + ROADMAP admin table |
| Fish multi-level confusion study | none (scratchpad) | running | study brief: nested vs global matrices, per player + global |
| Slot lock for heavy runs | branch tbd | building (urgent) | Pierre: automatic lock for full unit tests and heavy tools |
| URL refonte | branches tbd | building, merge after fish flip + 48 h | docs/reviews/2026-11-05-url-scheme-study.md |
| net.smoke step 9 investigation | branch tbd | building | ROADMAP row |
| Coverage 360 px overflow fix | branch tbd | building | admin Coverage table.cov-t 26 px too wide at 360 |
| Photos step 3 (history rewrite) | none | READY, needs Pierre's explicit go | scratchpad/step3/plan.md (regenerate if lost: HANDOVER step 3) |
| App icon | none | proposals ready (D2, B1-B4), wait Pierre's pick | scratchpad/icons/v2 |
| Name-similarity confusion study | none (scratchpad/name-confusion-study.md) | running | Pierre 18:33: do players confuse genera because names look alike (Pectinia/Pavona)? literature + real-log test + app options |
| Fish PR 7 curated photos in game | draft PR, stacked on #602 | building | fishOn rule, fetch_approved fish branch, curated list, no real R2 upload from session |
| Typed answers: retry on close misspelling (a player's idea, Pierre 'good idea') | draft PR needs-pierre | building | grading unchanged, one retry, highlight differing letters, log raw typed text if no breaking sheet change |
| Merged tonight | #578 #580 #582-#597 #601 #572 #605 #606 #608 #613 | done | — |
