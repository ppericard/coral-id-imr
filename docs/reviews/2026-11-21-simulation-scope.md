# What simulations can decide, and where they reach their limits (discussion, 2026-11-21)

A record of a discussion with Pierre, so it is not had again from scratch. **Not a rule**: rule L11 is unchanged until
he decides how, as part of his review of the working method. Status: open (ROADMAP "Where simulations decide").

## What started it

PR #1357 (the response-time step 1, Q449-Q451, option A) passed its real-log checks (next-answer prediction no worse,
11 of 12 coral players better; others' time on a photo predicting a player's misses, 12 of 12 coral players) but
breached a rated-world guardrail: the strong RA's shown score at 1,000 answers about 1-1.4 points lower, recovered by
3,000, cause unknown, for a term that moves a question by about 0.03 logits. Under rule L11 the breach went to Pierre,
and the integrator first recommended holding the merge for a diagnosis.

## Pierre's words (verbatim, French)

- 13:23: «Faut vraiment arrêter avec ces simulations jusqu'à 1000 réponses, enfin non, 10 000 réponses, non là en
  l'occurrence c'est 1000 réponses, sur des choses qui, donc sur le temps de réponse typiquement, qui sont des
  implémentations qui sont tout à fait logiques et qui font du sens. Et en fait, des fois j'ai l'impression qu'on ne
  regarde plus que la simulation pour déterminer si ça a fait du sens ou pas. Est-ce que la simulation en elle-même, en
  fait, elle est réellement représentative de ce qui se passe réellement dans un cas d'apprentissage avec des joueurs
  réels? C'est ça le problème.»
- 13:25: «Pour la règle L11, je sais pas en fait, je sais pas dans quelle mesure il faut la changer ou comment il faut
  la changer. Mais ce qui est sûr, c'est que c'est parfois, j'ai l'impression qu'on met la simulation avant la simple
  logique, ou juste le fait que, bah oui, on développe une nouvelle, on ajoute une nouvelle variable, on développe une
  nouvelle feature, et en fait, quoi que dise la simulation, c'est comme ça. Donc et puis à nouveau, la simulation, ça
  reste une simulation, c'est-à-dire que avant qu'il y ait des vrais joueurs réels qui jouent et qu'on voit les
  résultats sur les vrais joueurs réels, mais la simulation, elle a des limites, voire des très grosses limites. Donc je
  sais pas, il faut pas non plus l'inverser complètement et le transformer plus qu'en garde-fou, comme tu semblais le
  dire. C'est-à-dire que ça a ses utilités, les simulations ont ses utilités, mais il faut déterminer dans quel contexte
  et pour quel type d'application la simulation a ses utilités, et pour quel contexte et pour quel type de travail,
  finalement, elle montre ses limites.»
- 13:27: «Bon, mais du coup, il faut quand même noter quelque part cette réflexion, parce que sinon, elle va disparaître
  quand ta session va disparaître. Donc, ok pour merger la PR, mais il faut, à un moment donné, il faut quand même noter
  ce qu'on vient de dire et la discussion qu'on vient d'avoir, parce que sinon, on va juste re-avoir la même discussion
  dans 2 heures ou dans 2 jours.»

## The integrator's reading (a proposal, not decided)

**The simulated learner is our own model** (`tools/learnsim.js` profiles and the rated world are assumptions, not fitted
to real players; #1344 says so for the fish profiles). So a simulation answers "does the engine do what our model of
learning predicts", which is partly circular. It cannot judge a signal it does not model: in #1357's rated world every
player had the same time noise, so the weighting the PR builds could not be tested there at all.

Where a simulation is useful:
- **The mechanics of the rules**: what follows from the rules alone, with nothing assumed about people (how many
  answers before a level opens, no unit that never opens, no score that runs away).
- **Bugs and extreme cases**: a player always wrong, always fast, back after a month.
- **Two implementations of one rule** giving the same result (equivalence).
- **Rough starting values** before any data exists, labelled as hypotheses.

Where it reaches its limits:
- **How real people learn, hesitate, forget or stay motivated**: the simulated learner is our own assumption.
- **A signal the simulator does not model**: it can say nothing about it.
- **Small differences** (a point or two on a score) inside the model's own uncertainty.

What decides then: the logic of the feature, the real answer log when it holds data, and use by real players when the
change can be reverted (#1357: one constant, `C = 0`, turns the term off).

Pierre's caution (13:25): not to turn this around either, into "a simulation is only a guardrail": simulations have
their uses; the open question is which context and which kind of work each one serves.

## What was done

- #1357 merged on his OK (13:27), the breach accepted; to be followed on the real answers.
- Rule L11 unchanged; this note and the ROADMAP row "Where simulations decide" carry the question to his review of the
  working method.
