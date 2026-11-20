# A photo the auto-sort put in has a route out, and the admin's pages read its proposals as the game does

Date: 2026-11-20. PR: #1313. Rules or docs touched: A1 (unchanged: its wording of 2026-11-20 05:39 already says a newer,
better proposal replaces one he let through); spec/fish-photos.md "The fish auto-sort"; spec/admin.md `autosort`;
ROADMAP "Fish photo judging, next". Carries out the two follow-ups cut from #1259
([2026-11-19-auto-proposals-newer-judgement.md](2026-11-19-auto-proposals-newer-judgement.md)).

## Context

#1259 made the build read what the auto-sort proposed anew, and gave the photos it set aside a route back into Pierre's
draft. It cut two things at Codex's third round (rule W27): a newer sure rejection of a photo the auto-sort had put in
(the game kept it in play, its copy as it was), and the admin's own pages, which still showed the draft's copies of a
photo's tags, ease, phase and crop where the game played the newer judgement.

## Decision

- Pierre, 2026-11-19 20:57 Manila: «si tu penses que ma curation entre guillemets n'est pas bonne, … il faut que tu fasses
  une proposition qui intègre directement le jeu. Quitte à ce que je corrige a posteriori.» (20:59: only what he did by hand,
  one by one, is his curation), rule A1 as validated on 2026-11-20 05:39 («je valide»). The route back it mirrors: Q438,
  2026-11-19 20:34, «OK pour ta recommandation».
- **The route out** goes into his draft, as every proposal of the auto-sort does, undoable one by one, and his Publish
  sends it. A photo the run put in (log `a`, `b`) leaves play on a judgement made since that is a sure rejection, under the
  conditions #1259 had written before the cut: the code lists the tags (still the run's copy), no `@t`, never a photo he
  answered Keep mine. Integrator's call: the code becomes the plain reject `r`, no new letter (a new one changes what
  `fishParse`, `read_cur`, `curplay.py` and `core.js` read, a format other code follows); an Undo then leaves the photo a
  waiting candidate, as for any auto reject.
- **The pages read the proposals anew** through a view of the draft where the fields the build reads anew are left out
  (`autosort.js` `sortView`), for the readers that show or order (the tile, the family, coverage, pairs and review pages,
  the Candidates rows); never for a writer, the agreement, the Light proposals or Publish (rule A1). Integrator's call, no
  effect on players.
- **Not built: the corals' half.** The coral game reads `curation-play.json` directly, with no build step to mirror, and
  `tests/curplay.test.js` holds the two files to the same games; where the reading lives and what coral players then see is
  a choice put to Pierre. On main's files about a dozen coral photos differ.

## Consequences

- On main's files of 2026-11-20 (05:22 UTC), the route out takes 51 photos at the next admin load, all judged since other
  species one could take for the subject (`k`), none unsure, kept or his; they leave play at his Publish, and the slots
  they free are filled by the next load. The pages read 5,785 tags, 5,788 eases, 130 phases and 5 crops anew; every field
  the build changes is among them.
- Specified in spec/fish-photos.md "The route out" and "Proposals and his own decisions"; tests/fishcuration.test.js,
  tests/readcur.test.js (the pages held to `read_cur`), tests/admin.smoke.js.
