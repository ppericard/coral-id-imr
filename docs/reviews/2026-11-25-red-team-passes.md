# Red Team passes: two model families per mission, or less? (decision note, 2026-11-25)

**Status: decision note, docs only (REE-287).** Nothing was changed in Linear, in the missions' briefs or in the code.
Pierre's question (2026-11-25, 06:50 Manila, as relayed by the integrator): for each of the five Red Team missions
(REE-288 to REE-292), he proposes two passes, one by Claude Fable launched by the integrator and one by OpenAI's Astra
launched by him. Is that overkill, and how do others do it?

This note is about method only. It does not restate the missions' theses or any business finding: the repository is
public and the charter keeps strategy out of it. **It was written by a Claude model** (Opus 5.5), the family of one of the
two proposed passes; read its judgement on cross-family review with that in mind. Every source was looked up on
2026-11-25 (Manila) with public query terms only (rules C2, C7); the list at the end says which were read in full, by
their abstract, or only through a search summary. What is measured, what a vendor says and what is my judgement are
labelled (rule W11).

## 1. The answer

**Not overkill where one model family has a stake in the question or the decision is stop-or-continue; more than
needed where a mission rests mostly on this repository's own data, which a check by the other family can re-derive.**
What would waste the second pass is not the count but the way it is run: two passes that read each other, or are merged
by a debate between the models, buy little over one. Run blind, recorded side by side and reconciled by tests, a
second family is the cheapest independent reviewer available here. It also costs the integrator nothing extra: Fable
runs five full passes in every design (section 5). What the second family costs is Pierre's Astra runs, the syntheses
and his reading. The evidence, in short:

- Errors are correlated **even across providers**: in a study of over 350 models, "models agree 60% of the time when
  both models err", and the more accurate models are the more correlated ([Kim et al. 2025][kim]). So Fable and Astra
  agreeing is weaker evidence than two human teams agreeing.
- Yet panels of **different families** judge better and with less self-bias than one large model ([Verga et al.
  2024][poll]), and diversity of models drives the gains in multi-model reasoning ([Chen et al. 2024][reconcile]). A
  model rates its own text higher, in step with how well it recognises it ([Panickssery et al. 2024][selfpref]).
- A model asked to re-check its own answer without new information "struggle[s] to self-correct" ([Huang et al.
  2024][selfcorrect]), and debate between models does not reliably beat sampling one model several times
  ([Smit et al. 2024][mad]). Resampling one model reduces its noise, not its family's blind spots (section 3).
- Human practice challenges a single dominant view with one challenger (devil's advocacy) and sets two full teams on
  competing hypotheses only for critical questions, because that is costly ([CIA 2009][cia]). Two passes on one brief are
  two replications, not Team A / Team B; that technique is borrowed here only for how disagreements are shown.

## 2. How organisations run challenge reviews

- **Independent, sponsored, acted on.** The UK Ministry of Defence defines red teaming as "the independent application"
  of critical thinking techniques "to assist the end user make a better-informed decision" ([MOD 2021][mod], 1.9). The
  sponsor sets "the 'exam question'" and must "accept and act on the red team's findings" (7.4). A red team should
  "ideally, be formed to tackle a particular project or plan rather than simply being a standing team" (7.5), mixing
  subject experts with outsiders. The handbook's warning: a challenge paid "lip service" can "instil more confidence in
  the plan because it has apparently been tested, when in reality it has not" (6.10).
- **One team or two.** The CIA primer separates devil's advocacy, "to challenge a single dominant mindset", from Team A /
  Team B, which "requires a significant commitment of analytic time and resources" and suits "a critical decision that
  has far-reaching implications" ([CIA 2009][cia], pp. 17-21). Its debate phase puts the two cases before "an independent
  'jury of peers'", and it notes that "senior officials can learn more by weighing well-argued conflicting views than
  from reading an assessment that masks substantive differences".
- **Independence is not slant.** The members of the 1976 Team B on Soviet objectives "were deliberately selected" among
  analysts "known to take a more somber view" than the consensus ([Team B report, 1976][teamb-cia]). The Senate
  intelligence committee found outside review legitimate and some criticisms valid, but that this team reflected "only
  one segment of the spectrum of opinion" ([Senate 1978][teamb-senate]; the PDF is a scan, wording from its indexed
  text). A pass briefed to dismantle the project is in that position by design; the charter's "do not invent defects"
  guards against it, and a second family is a second check on it.
- **Authentic dissent beats role-play.** In experiments an authentic minority view stimulated better thinking than any
  form of assigned devil's advocate ([Nemeth et al. 2001][nemeth]). A model told to attack is playing a role; what it
  brings is its evidence, not its stance (my inference).
- **Cheap forms.** A premortem asks a team to imagine the project has failed and list why, in one session ([Klein
  2007][premortem]; its "30%" figure comes from a 1989 study I did not read). A decision-maker's checklist on the
  recommending team's process ([Kahneman et al. 2011][checklist]) is the other cheap form: it audits how the
  recommendation was made, not the recommendation.
- **Resolving disagreements.** In an "adversarial collaboration" the two sides agree in advance on the tests that would
  settle their dispute and run them with an arbiter ([Mellers et al. 2001][advcollab]). That is the charter's
  "discriminating tests".
- **How many reviewers.** Two reviewers is a convergent practice of industrial code review ([Rigby and Bird
  2013][rigby]; I read only a summary of that table). In usability testing, independent finders discover a share
  1 − (1 − p)^n of the problems, each finding a share p ([Nielsen and Landauer 1993][nielsen]); that formula
  underestimates the reviewers needed, because some problems are much harder to find than others ([Schmettow
  2012][schmettow]). Software inspections use the **overlap** between independent inspectors to estimate what all of
  them missed (capture-recapture); the estimates depend strongly on the number of inspectors ([Briand et al.
  2000][briand]), and they run low when inspectors tend to miss the same things, since the method assumes independent
  finders (my note). Investment committees: I found no study of a designated dissenter.
- **Cadence.** The MOD handbook places challenge "throughout the life cycle of a project" (1.8); the charter already
  makes re-runs trigger-driven. Nothing found argues for a fixed count of passes per review.

## 3. Several model families: what is measured

| What a second family buys | Evidence | For this programme |
| --- | --- | --- |
| Less self-preference in judging | Self-preference tracks self-recognition ([Panickssery et al. 2024][selfpref]); judges favour models similar to themselves ([Goel et al. 2025][goel]) | The integrator is Claude: it should not adjudicate between a Claude report and an Astra report that it can tell apart |
| Better panels | Three small judges from disjoint families beat one large judge, "over seven times less expensive" ([Verga et al. 2024][poll], Cohere's research, arXiv) | Two families on the same question are a small panel |
| Better reasoning from diversity | ReConcile: "the diversity originating from different models is critical" ([Chen et al. 2024][reconcile]); diverse debaters beat a single stronger model on GSM-8K ([Hegazy 2024][hegazy], preprint) | Benchmarks with one right answer; a strategic review has none |
| Not a second independent team | Correlated errors across providers ([Kim et al. 2025][kim]); "model mistakes are becoming more similar with increasing capabilities" ([Goel et al. 2025][goel]) | Two families agreeing is "both found", not "confirmed" |

What a second family does **not** buy, or buys only with care:

- **Debate rounds.** Multi-agent debate does "not reliably outperform" self-consistency or ensembling unless tuned
  ([Smit et al. 2024][mad]). Without external feedback, models fail to correct their own reasoning and sometimes get
  worse ([Huang et al. 2024][selfcorrect]). Fable and Astra should not argue each other into agreement.
- **Citations.** Deep-research systems leave many statements unsupported; citation accuracy ranged from about 40% to 80%
  across the systems audited ([DeepTRACE, Venkit et al. 2025][deeptrace]). A check of the top claims' sources is worth
  doing whatever the design. A second model questioning the first can catch factual errors through inconsistencies, and
  the examiner can be the same model in another role ([Cohen et al. 2023][lmvslm]).
- **More tokens.** Anthropic reports that on its browsing benchmark "token usage by itself explains 80% of the variance",
  and that multi-agent systems use "about 15× more tokens than chats" and suit tasks whose value is high enough
  ([Anthropic, 2025-06-13][anthropic-ma]; a vendor claim). Part of what a second pass buys is more searching, which a
  longer single pass would also buy.
- **This repository's own measure.** On photo judging, two fresh Claude judges agreed with each other on 83-90% of the
  calls, the rubric rather than the model was the bottleneck, and Pierre's verdicts dictated against one judge's tags
  leaned towards that judge ([model and effort study][effort-study], #1211, #1218). A closed task and one family, but it
  shows what matters most here: the brief, and keeping each judge from seeing the other's answer.

**Second family, second pass of the same model, or a better brief?** No head-to-head comparison of the three on an
open-ended review was found. Separately:

- **A second family** brings less self-preference and different answers (the table above), but its errors still
  overlap the first family's, and Kim et al. name a shared provider among the main causes of that overlap.
- **A second pass of the same model** is not a copy: the two fresh Claude judges above disagreed on 10-17% of the
  calls, and resampling is a strong baseline ([Smit et al. 2024][mad]). It shares the family's blind spots, though, and
  asking the model to review its own answer adds nothing without new information ([Huang et al. 2024][selfcorrect]).
- **A better brief** was the largest effect in the only measure made here: the rubric, not the model, was the
  bottleneck (#1211). The MOD handbook's first principle is the same: "Set a clear objective" (7.13). The Red Team
  briefs are already detailed; what they lack for two passes is the blinding and the shared reporting table of section 6.

**Limits of this evidence.** The model studies use 2023-2025 models on tasks with right answers. None covers open-ended
strategic review, Fable or Astra. The answer in section 1 is a judgement built on them, not a measurement.

## 4. Cost and diminishing returns

- **The curve.** If each pass found a share p of the decision-relevant risks independently, two passes would find
  1 − (1 − p)^2: with p = 0.5, 75% instead of 50%, and a third pass 87.5%. Correlated misses make the second pass add less,
  and positively dependent sources carry the information of fewer independent ones ([Clemen and Winkler 1985][clemen]). The
  second pass is where most of the remaining gain is; a third rarely pays unless the first two barely overlap
  (illustration, not a measurement).
- **What a pass costs here.** No Red Team pass has run yet, and REE-244 and REE-121 hold no agent token figures (REE-121
  measures CI minutes; mission reports go to the private workspace, not to pull requests, so that CI cost does not apply).
  The nearest measured agent times are this repository's study PRs: median 24 min, range 14 min to 54 min, first commit to
  green checks, reading and research excluded (#1503, #1508, #1523, #1537, #1553). A mission is broader than any of
  them; estimate 1-3 h of agent time per full pass, against the longest of those five, 2.7 h (#1503, #1553). A check
  or a synthesis: about a third of that, 20-60 min (my estimate, scaled from #1503, #1553).
- **Tokens (estimate).** Anthropic lists Fable 5.2 at $8 / $40 per million input / output tokens and reports $4.82 per
  task for Fable 5.2 `high` on DeepResearch Bench II ([model and effort study][effort-study], quoting Anthropic's pages).
  A mission is several such tasks plus reading the repository and Linear: order of $20-60 at list price per Fable pass, an
  estimate. On Pierre's subscriptions it is quota, not cash. Astra's cost is unknown from here.
- **The scarce costs are Pierre's.** He launches every Astra run himself, files its report, and reads what comes back.
  Any design with a second family on every mission costs him five Astra runs; the designs differ in how long each run
  is and in how much there is to read. Two full passes per mission mean ten reports; only the synthesis keeps his
  reading at five tables.

## 5. Three designs

In every design: **one brief per mission** (the Linear issue), the passes named and dated in advance (the "Open
inquiry" label), each pass launched without access to the other's report, the model and version recorded, and the top
claims' sources checked.

The integrator's side is about the same in all three designs, if Fable does every full pass (estimates from section 4):

- five full Fable passes: 5-15 h of agent time and about $100-300 at list price (#1503, #1553);
- five syntheses or reconciliations: 2-5 h and about $35-100 (#1503, #1553).

The designs differ on Astra's side and in what Pierre reads.

| Design | What it buys | Astra's side and Pierre's (estimates) | Risk |
| --- | --- | --- | --- |
| **A. Two full passes on all five** (Pierre's proposal) | The widest coverage; per mission, the overlap between the two passes estimates what both missed; no family judges its own kind alone | Five full Astra passes; ten reports, five synthesis tables to read | Agreement read as proof; on the two missions that rest on the repository's data, the second pass recounts the same counts |
| **B. One full pass + a cross-family check** | The other family receives the report without its author's name and (1) re-derives the 5-8 top-ranked risks, (2) checks every source they cite, (3) argues the strongest counter-evidence, (4) names up to three risks it thinks are missing. Catches wrong facts, bad citations and overstated risks; some omissions | Five Astra checks, each about a third of a full pass; five reports plus five short check notes. Alternating which family does the full pass would spread both families' bias, at the cost of Astra full passes | The check sees the first report's framing (anchoring); whole blind spots survive |
| **C. A, staged** | Stage 1: two full blind passes on AI substitution (REE-288) and commercial viability (REE-290), where a family has a stake or the decision is stop-or-continue. Stage 2, decided on stage 1's measured overlap: technical and agent-led sustainability (REE-292) doubled by default; pedagogy (REE-289) and content (REE-291), whose evidence is mostly the repository's code and counts, as B, or doubled if stage 1 says doubling paid | Three full Astra passes and two checks by default; five full if stage 1 says so. Still five Astra runs: C saves Astra's length and Pierre's reading on two missions, not launches | The split is my judgement; on REE-292 neither family is independent, since Claude and Codex (OpenAI) both build this repository |

**The stop rule (C).** After stage 1, count the decision-relevant findings seen by both passes, by one only, and
contradicted. If the second family found risks the first missed and that would change a decision, double the rest
(design A). If it found little, run REE-289 and REE-291 as B. The same count, kept for every mission, tells later
re-runs whether a second family is still worth its runs.

The two market studies (REE-285, REE-286) and the two architecture studies (REE-283, REE-284) gather evidence rather
than attack it, and Red Teams 3 and 5 already challenge them: one pass each with design B's check is enough (my
judgement).

## 6. Recommendation and the synthesis

**Design C: Pierre's proposal, staged.** Two families on the two missions where the second matters most, then the
rest decided on this programme's own overlap count rather than on benchmarks; B as the default for later re-runs. The
saving against A is modest (two Astra checks instead of two full passes, and less to read); what C mainly buys is
evidence, after two missions, on whether the second family pays here.

**The synthesis, per mission:**

- **Who.** A fresh agent that wrote neither pass, given the two reports labelled A and B with their model names removed.
  The integrator assembles and files it but does not adjudicate, since it is Claude. The family that did not write the
  synthesis checks only that its pass is represented faithfully. Pierre decides (charter).
- **No debate.** The synthesis does not ask the models to convince each other ([Smit et al. 2024][mad]; [Huang et al.
  2024][selfcorrect]). It reconciles by evidence and names the test that would settle what evidence cannot.
- **What Pierre sees.** One table per mission, read in one sitting:

| Risk | Pass A | Pass B | Status | Best evidence each side | Cheapest test that would settle it | Decide now or later |
| --- | --- | --- | --- | --- | --- | --- |
| (one row per decision-relevant risk) | its claim and severity | its claim and severity | both found / A only / B only / contradicted | dated sources | the discriminating test | now or later, and why |

  "Both found" is not "confirmed" (correlated errors). Contradictions stay side by side with each side's best case, as
  in Team A / Team B, never averaged. Above the table, three lines: the overlap count (how many risks both found, how
  many one only), what neither pass could verify, and what changed since the last pass.
- **Across missions.** The charter's founder-facing synthesis then reads these tables, not the ten reports.

## Sources (read 2026-11-25 Manila; publication date in brackets)

Human practice:

- UK Ministry of Defence, DCDC, [*Red Teaming Handbook*, 3rd edition][mod] [June 2021], paragraphs 1.8, 1.9, 6.10, 7.4-7.6.
- CIA Center for the Study of Intelligence, [*A Tradecraft Primer: Structured Analytic Techniques*][cia] [March 2009], pp. 17-21 (read in full, like the MOD handbook's sections cited).
- [Intelligence report of Team "B"][teamb-cia], *Foreign Relations of the United States 1969-1976*, vol. XXXV, document 171 [December 1976].
- US Senate Select Committee on Intelligence, [*The National Intelligence Estimates A-B Team Episode*][teamb-senate] [February 1978] (a scan; read through its indexed text).
- Nemeth, Brown and Rogers, ["Devil's advocate versus authentic dissent"][nemeth], *European Journal of Social Psychology* [2001] (search summary of its abstract).
- Klein, ["Performing a project premortem"][premortem], *Harvard Business Review* [September 2007] (search summary; the page's title and date checked).
- Kahneman, Lovallo and Sibony, ["Before you make that big decision"][checklist], *Harvard Business Review* [June 2011] (search summary).
- Mellers, Hertwig and Kahneman, ["Do frequency representations eliminate conjunction effects?"][advcollab], *Psychological Science* [2001] (search summary).

Reviewers and discovery:

- Rigby and Bird, ["Convergent contemporary software peer review practices"][rigby], ESEC/FSE [2013] (search summary).
- Nielsen and Landauer, ["A mathematical model of the finding of usability problems"][nielsen], INTERCHI [1993] (search summary).
- Schmettow, ["Sample size in usability studies"][schmettow], *Communications of the ACM* 55(4) [April 2012] (search summary; the page refused the fetch).
- Briand, El Emam, Freimut and Laitenberger, ["A comprehensive evaluation of capture-recapture models for estimating software defect content"][briand], *IEEE Transactions on Software Engineering* [2000] (search summary).
- Clemen and Winkler, ["Limits for the precision and value of information from dependent sources"][clemen], *Operations Research* 33(2) [1985] (search summary).

Language models:

- Kim, Garg, Peng and Garg, ["Correlated errors in large language models"][kim], ICML [2025; arXiv June 2025] (abstract read).
- Goel et al., ["Great models think alike and this undermines AI oversight"][goel], ICML [2025; arXiv 2025-02-06] (abstract read).
- Panickssery, Bowman and Feng, ["LLM evaluators recognize and favor their own generations"][selfpref], NeurIPS [2024] (abstract read).
- Verga et al., ["Replacing judges with juries"][poll], arXiv [2024-04-29], Cohere's research (abstract read).
- Chen, Saha and Bansal, ["ReConcile"][reconcile], ACL [2024] (abstract read).
- Hegazy, ["Diversity of thought elicits stronger reasoning capabilities in multi-agent debate frameworks"][hegazy], arXiv preprint [October 2024] (search summary).
- Smit et al., ["Should we be going MAD?"][mad], ICML [2024] (abstract read).
- Huang et al., ["Large language models cannot self-correct reasoning yet"][selfcorrect], ICLR [2024] (abstract read).
- Cohen, Hamri, Geva and Globerson, ["LM vs LM: detecting factual errors via cross examination"][lmvslm], EMNLP [2023] (search summary).
- Venkit et al., ["DeepTRACE: auditing deep research AI systems"][deeptrace], arXiv [2025-09-02] (abstract read).
- Anthropic, ["How we built our multi-agent research system"][anthropic-ma] [2025-06-13] (vendor).
- This repository: [the model and effort study][effort-study] [2026-11-19] (#1211, #1218).

[mod]: https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/1027158/20210625-Red_Teaming_Handbook.pdf
[cia]: https://www.cia.gov/resources/csi/books-monographs/a-tradecraft-primer
[teamb-cia]: https://history.state.gov/historicaldocuments/frus1969-76v35/d171
[teamb-senate]: https://www.intelligence.senate.gov/sites/default/files/publications/95nie_ab.pdf
[nemeth]: https://doi.org/10.1002/ejsp.58
[premortem]: https://hbr.org/2007/09/performing-a-project-premortem
[checklist]: https://pubmed.ncbi.nlm.nih.gov/21714386/
[advcollab]: https://pubmed.ncbi.nlm.nih.gov/11476091
[rigby]: https://www.microsoft.com/en-us/research/publication/convergent-software-peer-review-practices/
[nielsen]: https://course.ccs.neu.edu/is4800/ssl/nielsen93.pdf
[schmettow]: https://doi.org/10.1145/2133806.2133824
[briand]: https://pure.ul.ie/en/publications/a-comprehensive-evaluation-of-capture-recapture-models-for-estima/
[clemen]: https://doi.org/10.1287/opre.33.2.427
[kim]: https://proceedings.mlr.press/v267/kim25e.html
[goel]: https://arxiv.org/abs/2502.04313
[selfpref]: https://arxiv.org/abs/2404.13076
[poll]: https://arxiv.org/abs/2404.18796
[reconcile]: https://aclanthology.org/2024.acl-long.381
[hegazy]: https://arxiv.org/abs/2410.12853
[mad]: https://proceedings.mlr.press/v235/smit24a.html
[selfcorrect]: https://arxiv.org/abs/2310.01798
[lmvslm]: https://aclanthology.org/2023.emnlp-main.778
[deeptrace]: https://arxiv.org/abs/2509.04499
[anthropic-ma]: https://www.anthropic.com/engineering/multi-agent-research-system
[effort-study]: 2026-11-19-model-effort-combinations.md
