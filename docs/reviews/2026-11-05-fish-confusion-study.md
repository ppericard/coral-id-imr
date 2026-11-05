# Fish confusion at several levels: a study

Written 2026-11-05, evening Manila, for Pierre to read on the morning of 2026-11-06. Read-only study: no branch, no PR,
no code changed. Code read on `origin/main` at `566e5719` (main moved to `2c6d6efe` while writing; nothing read here
changed). Companion of the [progress and set-size study](reviews/2026-11-05-progress-setsize-study.md) (Q101-Q113),
whose "proven against the field" design it extends to the fish ranks; it refines that study's question **j** (Q110,
fish fields per rank) and its point 3 (the pair counter).

**Pierre's ask (2026-11-05).** How to apply per-player and global discrimination / confusion at several fish levels
(families or IMR entries, scientific genera, species), and whether to keep nested matrices (families; genera within an
entry; species within a genus or entry) to keep them small, or one global all-against-all species matrix. He would love
a global and an individual all-vs-all matrix if feasible. Also: the "personalised algorithm" (blend global and
individual confusion to adapt to each player: traps, duels, photo choice), as a later track.

Numbers below come from `fish.json` (circle 1), the app's constants (`core.js` `CONF`) and three small scripts in the
scratchpad: `fishconf/size.py` (storage growth), `fishconf/field.py` and `fishconf/product.py` (fields and coverage),
`fishconf/bench.js` (computing cost). No fish answer is logged yet, so every fish confusion below is a **prior**, not a
measurement. Marks: **[repo]** read in the repository; **[memory]** from my own knowledge, not re-checked today.

---

## 0. The short version

1. **The sizes.** 27 entries (351 pairs), 94 scientific genera (4,371 pairs, 378 within an entry), 340 species
   (57,630 pairs all-vs-all; 5,081 within an entry, 1,205 within a genus). Corals: 40 genera, 780 pairs, already
   saturated (777 met in the pooled data).
2. **A global all-vs-all matrix is feasible as data**, if only the pairs met are stored (sparse) and the rest are
   computed from a prior chain (species pair ← species→entry ← entry pair ← declared priors). Pierre can have both
   matrices, the global and each player's, as admin views computed from the Answers log. The phones never need them
   whole.
3. **But a flat confusion-weighted coverage over the global matrix measures the wrong thing at the species rank.**
   The other 300-odd species of other families each weigh little, but together they make **83% of a species' field
   mass** (median 0.84, range 0.63-1.00). Knowing the families would then "cover" most of every species before a single
   species question. The fine discrimination, inside the entry, would weigh only 17%.
4. **Recommendation (H, "one global matrix, read hierarchically").** Store one sparse matrix per rank, all-vs-all, with
   nothing aggregated at write time (as agreed in FISH_PATH "Look-alikes at any rank"). Read coverage as a product,
   **cov = cov_in × cov_out**, the form of a hierarchical choice model (P(species right) ≈ P(family right) ×
   P(species right | family)):
   - cov_in: the species' own block, i.e. the species of its entry plus its look-alikes in other entries;
   - cov_out: every other species, inheriting the player's discrimination of the two entries, discounted for pairs
     more confusable than their families (λ, section 4.2).
   For corals (one rank) cov_out = 1, and the rule is exactly the set-size study's.
5. **The pair level comes from the records the app already keeps** (`P[t].off`, `P[t].conf`, both directions,
   `pairConf`), shrunk toward the pooled score. The closed form is D = max(0, (n − m / q₀) / (n + W_D)):
   - n: offers of the pair; m: mix-ups; q₀: the pooled score; W_D about 2;
   - a mix-up costs 1/q₀ clean offers: 3 on a known look-alike, 33 on a pair nobody confuses.
   There is no new counter and no change to the record format: the replay already rebuilds `off` and `conf` from the
   log.
6. **Evidence flows both ways between levels** (table, section 4.4):
   - a family mix-up lowers every ordinary species pair across those two families;
   - a species mix-up across families counts on the family pair only in proportion to (1 − λ), so a known look-alike
     pair barely touches its families;
   - a mix-up inside an entry never touches the entry, as FISH_PATH already says.
7. **Storage stays bounded** with one policy (B): species precision kept for within-entry pairs, look-alike pairs and
   every mix-up; other cross-entry offers folded into species→entry counts.
   - Per player, all 340 species open: 24 / 79 / 158 / 210 KB at 1k / 5k / 20k / 50k answers, against 26 / 101 / 296 /
     557 KB with every pair kept. Photo statistics (`ps`) for the same player reach about 240 KB anyway.
   - Pooled, what every phone downloads: about 50-160 KB compact (only within-entry pairs and the cross pairs well
     above their prior), against 1.4 MB for the full matrix.
8. **The sheet is the real constraint, and it is not the matrix choice.** The Answers tab is read whole at each stats
   recompute, and the stats cache (100 KB per value [memory]) will overflow once fish photo ratings and pairs join. The
   code already says "too big for the cache: computed each time". Answers also run into the 10-million-cell limit
   (ROADMAP security row) at about 700k rows. Recommendation: build the pooled pairs incrementally into a tab and serve a
   per-subject snapshot, together with admin PR 11 (log fish answers).
9. **Progress per rank and non-linear.** The bar is `0.95 × min(1, pg/M) × (0.4 + 0.6·√cov)` per unit, with the field
   per rank.
   - The species of an entry fill cov_in as they open in commonness order, the most confusable pairs first (traps).
   - With priors only (flat inside an entry), Butterflyfish caps at 0.57 / 0.78 / 0.96 with 3 / 10 / 20 of its 23
     species met. Real confusions concentrate on few pairs, which makes it more concave.
   - The global fish score (25% entries + 75% species credit) takes the bars as they are.
10. **The opening path and the exams use the same matrix:**
    - the exam opens only when the block's look-alikes are cleared;
    - its traps are the block's 3 most confusable units;
    - a unit whose exam waits on an unopened look-alike pulls that partner to the front of the opening queue;
    - the family exam Pierre imagined (about 20 hard questions in scientific names) becomes "cover the entry's most
      confusable uncleared pairs".
11. **Subject-agnostic.** The engine needs only what units already carry: `rank`, `parent` (fish genera have it), and
    the prior fields `look`, `fam`, `forms`. Corals have no parent, so the block is the whole slate and nothing else
    changes for them.
12. **Personalised algorithm: later track.** `confOf` already blends the pooled and the player's own record (traps,
    duels, `confGap`).
    - The next fish step uses the same blend at each rank, per-photo traps and photo choice. It needs fish answers
      logged with their species.
    - Models that predict a player's mix-ups on pairs they never met ("players like you") need 30+ players with
      thousands of answers, and a replay check that they beat the pooled score.

---

## 1. What exists today

| | Corals | Fish (built) | Fish (designed, not built) |
|---|---|---|---|
| Units | 40 slate genera (+ bonus) | 27 circle-1 entries; 94 scientific genera (opt-in "sci", `app.js` `fishGenera`, `rank: 'genus'`, `parent` = entry) | 340 circle-1 species; common names (1-3 per species: circle 1 has 184 / 136 / 20) |
| Choices | any genus | within the rank of the unit asked (`model.js` `distractors`, `rankOf`) | species of other entries first, then same entry, then same genus or sub-entry, then own mix-ups (FISH_PATH) |
| Per-player pair record | `P[t].off[u]` (offered beside t), `P[t].conf[u]` (u answered on t); `pairConf` sums both directions | the same, per unit id (`t01`, `g:Chromis`) | the same at species ids (`s091`) |
| Pooled pair record | `stats_` `conf["A|B"] = [offered, mixed]` from the Answers log's choices (trusted players) | none: fish answers not logged (`SUBJECTS` `log: false`) | three views from the log: family↔family, species→family, species↔species (FISH_PATH "Look-alikes at any rank", agreed 2026-11-04) |
| Prior of a pair | `pooledConf`: declared look-alike 0.3, same family 0.12, shared growth form 0.08, else 0.03, worth `CONF.W` = 8 offers | the same fields: `look` (IMR look-alikes; for genera, **every sibling genus**), `fam`, `forms` = the identification-key group | "a species' confusion rate shrunk toward its family's" (FISH_PATH) |
| Personal blend | `confOf = confScore(own, pooled)`: traps (`confusable`), duels / Again, `confGap` in the Elo | the same | per-photo cross-family traps (FISH_PATH) |

Two facts matter below:

- **`off` counts every offer**, right or wrong (the record of `replayProgress`, `core.js` l. 2398), since 2026-11-01.
  `pairConf` treats older mix-ups as offered once each. The replay rebuilds both from the log's Choices column, so
  anything computed from them at read time needs no new record and no record migration.
- **No fish confusion exists yet.** Every fish ω below is a prior from the tree. The pooled data takes over a pair after
  about `CONF.W` = 8 pooled offers: for the 5,081 within-entry species pairs, roughly 15k species answers in all.

## 2. The sizes

| Rank | Units (circle 1) | All-vs-all pairs | Within the parent | Within a smaller group |
|---|---|---|---|---|
| Entry (family) | 27 | 351 | (no parent) | |
| Scientific genus | 94 (33 with one species) | 4,371 | 378 within an entry | |
| Species | 340 | 57,630 | 5,081 within an entry (Wrasse 2,145, Damselfish 1,485) | 1,205 within a genus (Pomacentrus, Chaetodon, Halichoeres 153 each) |
| Species, circle 3 added (441) | | 97,020 | | |
| Corals, genera | 40 | 780 | | |

No genus spans two entries, so the tree is clean: entry → genus → species. The IMR sub-entries (Chromis, Dascyllus,
Pomacentrus, Anemonefish; Bannerfish; Surgeonfish, Unicornfish) are an IMR grouping inside an entry and can serve as a
sibling prior (rule 2: an existing grouping, nothing invented).

## 3. Three options

### 3.1 N: nested matrices only

One matrix per parent: entries 27 × 27; genera within each entry; species within each entry (or within each genus),
plus a hand-kept list of cross-parent look-alike pairs. This is the set-size study's question **j**.

- Size: tiny. About 5,800 pairs in all; per player at most about 10k directional keys.
- It ignores what crosses parents unless declared. FISH_PATH says fish look-alikes are "mostly at the species level,
  including across two families" (dwarf angelfish against dark damselfish), and that real data will propose them. A
  nested store cannot see a pair nobody listed.
- A family mix-up made after the species are open never reaches the species bars.
- A within-genus species matrix also misses the within-entry pairs across genera (Halichoeres against Thalassoma,
  Chromis against Pomacentrus).
- No global view for Pierre.

### 3.2 G: one global matrix, flat coverage

One species × species matrix for everything (57,630 pairs), coverage = the confusion-weighted mean over the 339 others,
as the set-size study does over the 40 coral genera.

- Size, every pair kept: per player 26 / 101 / 296 / 557 KB at 1k / 5k / 20k / 50k answers (all 340 open); pooled
  1.4 MB once 30 players × 5k answers have touched almost every pair. Too big for the phones and the sheet's cache.
- The arithmetic misleads. With the corals' constants shifted one rank down (same genus 0.12, same entry 0.08; across
  entries, the entry pair's prior: 0.3 look-alike entries, 0.08 same key group, 0.03 otherwise), the mass of a
  species' field splits:

  | Part of the field | Mean | Median | Min | Max |
  |---|---|---|---|---|
  | same genus | 0.06 | 0.04 | 0.00 | 0.15 |
  | same entry, other genus | 0.12 | 0.06 | 0.00 | 0.34 |
  | other entries | **0.83** | **0.84** | 0.63 | 1.00 |

  A player who tells the 27 families apart would hold a coverage of 0.65-0.97 on every species (quantiles 10-90%) and
  a cap of 0.89-0.99 from `h`. The species bar would then measure the families. This is the set-size study's "sheer
  number" turned upside down: at the species rank the many unrelated species swamp the few that matter.

### 3.3 H: one global matrix, read hierarchically (recommended)

- **Data**: one sparse matrix per rank, all-vs-all. Store a pair only once it is met; give every other cell a value
  from a prior chain (4.2). Pierre's global and individual matrices exist as views.
- **Reading**: cov = cov_in × cov_out (4.5).
  - The block (cov_in) is the unit's entry plus its cross-entry look-alikes. That is the nested field of option N, with
    the cross-entry look-alikes found by the data rather than by a list.
  - cov_out inherits the parent rank's discrimination.
- **Storage**: policy B (4.1), about half of G at 20k answers, and bounded.

### 3.4 Comparison

| | N nested | G global flat | **H global, hierarchical** |
|---|---|---|---|
| Per player, 20k answers (KB) | ~100 | 296 | 158 |
| Per player, 50k answers (KB) | ~120 | 557 | 210 (bounded by the structure, about 260 at most) |
| Pooled, downloaded by phones | ~50 KB | 1.4 MB | ~50-160 KB (compact) |
| Cross-family species look-alikes | only if listed | yes | yes, from the data (λ) or listed |
| A family mix-up reaches species | no | yes, but drowned in mass | yes, through inheritance |
| What the species bar measures | inside the entry only | mostly the families | the families (×), then inside the entry and its look-alikes |
| Global all-vs-all view | no | yes | yes |
| Corals | n/a | n/a | identical to the set-size design |

## 4. The recommended design (H)

### 4.1 Data structures: one record, three views

**Per player** (in the synced progress, per subject, as today):

- `P[s].off[u]`, `P[s].conf[u]`: as today, at the unit's own rank. Kept at species precision for:
  - pairs inside the same entry;
  - pairs whose pooled score marks them as look-alikes (declared, or from data: `dataLook`, at least `CONF.N`
    offers and pooled ≥ `CONF.TRAP`);
  - **every mix-up**, whatever the pair (mix-ups are rare and the most informative).
- `P[s].offE[B]`: offers of a species of entry B beside species s, for the ordinary cross-entry pairs (policy B). At
  most 340 × 26 keys; in practice fewer.
- Typed answers have no choices, so no offers. A typed right answer on t counts as an offer of every unit of t's
  block that is unlocked, in a separate map (`offT`). This keeps today's Elo terms (`confGap`, `confTerm`)
  bit-identical. Bounded by the block: at most 65 keys for a Wrasse species, 39 for a coral genus.

Simulated growth (one player, all 340 species open, 3 choices offered, 15% misses; `size.py`):

| Answers | A: every pair (keys / KB) | B: folded (keys / KB) |
|---|---|---|
| 1,000 | 2,850 / 26 | 2,657 / 24 |
| 5,000 | 11,235 / 101 | 8,773 / 79 |
| 20,000 | 32,944 / 296 | 17,543 / 158 |
| 50,000 | 61,942 / 557 | 23,345 / 210 |

Keys stop growing once the structure is covered; counts are small integers. For scale: a coral player's whole progress
after 500 answers is about 27 KB (`off` 7 KB, `ps` 9.5 KB; replay of a synthetic log), and the species-level `ps`
(about 340 × 35 photos × 20 bytes) will reach about 240 KB. A compact encoding (unit index in base 36 instead of the
id, about 45% smaller; or gzip with the browser's `CompressionStream` [memory]) is worth having for `ps` and `off`
together. It is not specific to the matrix.

**Pooled** (the sheet, from the Answers log; nothing aggregated at write time):

- entry↔entry `[offered, mixed]`, as the corals' `conf`;
- species→entry, directional: a photo of species s in an entry question with entry B offered or answered;
- species↔species, from species questions of either name format;
- genus↔genus, from genus questions, plus species answers whose genus differs (rolled up, 4.4).

The sheet needs the photo's species. FISH_PATH: "fish photos carry their species (`sp`)". Either the answer logs it
(question i) or the sheet maps photo ids through `fish-photos.json` fetched from GitHub, as `gen_` does for `data.json`.

**What the phones download**: entry pairs (351) and genus pairs (≤ 4,371, few met); the within-entry species pairs met
(≤ 5,081); and only the cross-entry species pairs whose pooled rate is clearly above their inherited prior (a data
look-alike in the making). Every other cell is its prior, recomputed on the phone from the tree.

| Players × answers each | Species pairs offered | Full matrix, keyed JSON | Shipped, keyed | Shipped, compact |
|---|---|---|---|---|
| 10 × 2k | 24,831 | 596 KB | 117 KB | 44 KB |
| 30 × 5k | 56,077 | 1,346 KB | 131 KB | 49 KB |
| 30 × 20k | 57,630 (all) | 1,383 KB | 227 KB | 85 KB |
| 60 × 20k | 57,630 | 1,383 KB | 431 KB | 162 KB |

The "shipped" column uses a crude filter (cross pairs with 2 mix-ups or more) on uniform simulated mix-ups, so it is an
upper bound. Real mix-ups concentrate on few pairs, and a filter on "pooled rate ≥ 1.5 × prior with ≥ `CONF.N` offers"
keeps it near the within-entry count.

### 4.2 The prior chain and the look-alike excess λ

Each level's pooled score is shrunk toward the level above, with the same `confScore` and `CONF.W` as today:

1. **Entry pair** q_E(A,B) = confScore(entry data, prior from `look` / key group / base). This is today's fish level 1.
2. **Species → entry** q_SE(s,B) = confScore(photos of s answered B, offered B; prior q_E(A,B)). It shows which
   species of A get taken for B (FISH_PATH view 2): juveniles, colour phases, mimics.
3. **Species pair**, different entries: q(s,u) = confScore(pair data, prior q₀(s,u)), with q₀ built from q_SE(s,B) and
   q_SE(u,A) (their mean), or 0.3 when Pierre declares the pair.
4. **Species pair**, same entry: prior 0.12 for the same genus or IMR sub-entry, 0.08 otherwise (`CONF.FAM`,
   `CONF.FORM` reused one rank down); then the data.
5. **Genus pair**: siblings as today (`look`), across entries q_E(A,B); then the data.

**λ, the look-alike excess** of a cross-parent pair: λ(s,u) = max(0, 1 − q_E(A,B) / q(s,u)), the share of the pair's
confusion that its families do not explain.

- An ordinary damselfish against an ordinary butterflyfish: λ ≈ 0.
- A dwarf angelfish against a dark damselfish at 0.3, between entries at 0.03: λ = 0.9.

λ decides two things: how much of the family discrimination the pair inherits, and how much of its mix-ups the family
pair takes.

### 4.3 The per-player discrimination level D

From the player's own pair record (n offered, m mixed, both directions; `pairConf`) and the pooled q₀ of 4.2:

- the player's rate shrunk toward the pool: q̂ = (m + W_D·q₀) / (n + W_D);
- **D = clamp(1 − q̂ / q₀, 0, 1) = max(0, (n − m / q₀) / (n + W_D))**.

| Record | D (W_D = 2) | D (W_D = 1) |
|---|---|---|
| never offered | 0 | 0 |
| 2 offers, no mix-up | 0.50 | 0.67 |
| 6 offers, no mix-up | 0.75 | 0.86 |
| 18 offers, no mix-up | 0.90 | 0.95 |
| 10 offers, 1 mix-up, q₀ 0.3 (look-alike) | 0.56 | 0.61 |
| 10 offers, 1 mix-up, q₀ 0.12 (congeners) | 0.14 | 0.15 |
| 10 offers, 1 mix-up, q₀ 0.03 (unrelated) | 0 | 0 |

- No new counter, no reset rule. It replaces the set-size study's `cl` (right answers with the pair offered, reset by
  a mix-up). The two behave alike: `cl` cleared a pair at R = 2 right answers; here 2 clean offers give 0.5-0.67, and
  the concave `h` does the rest.
- A mix-up is judged against how confusable the pair is: forgivable on a known look-alike, damning on a pair nobody
  confuses.
- `off` also counts offers where the player missed toward a third choice. Small inflation; a miss already costs
  progress.
- **Cleared** (for the exam's entry) = D ≥ ½. W_D is to sweep in 1-3.

### 4.4 How evidence at one level informs another

| Event | Player's record | Pooled | Effect on bars |
|---|---|---|---|
| Entry question, photo of *Chaetodon kleinii* (Butterflyfish) answered Angelfish | entry pair (Butterflyfish, Angelfish) +1 mix-up, as today; the photo's species kept with the mix-up (`P[t02].cs`, a few keys) | entry pair +1; species→entry (*C. kleinii* → Angelfish) +1 | D_E falls, so every ordinary species pair across the two entries loses inherited discrimination: each Butterflyfish species' cov_out dips by the Angelfish share of its outer field (a few %). The entry bar takes the miss, as today. |
| Species question, *C. kleinii* answered *C. trifascialis* (same genus) | species pair mix-up | species pair | Both species' cov_in drops (congener weight). Never touches the entry or the genus (FISH_PATH: a wrong pick inside the entry never counts against it). For a scientific-name question, a right genus typed is partial credit, as designed. |
| Species question, *Centropyge vrolikii* (Angelfish) answered *Acanthurus pyroferus* (Surgeonfish) | species pair mix-up, species precision | species pair; feeds both species→entry views | The pair is in both blocks (λ high), so cov_in drops. It rolls up to the entry pair only × (1 − λ) ≈ 0.1. |
| Species question, a cross-entry mix-up of an ordinary pair | species mix-up (kept); offers folded in `offE` | species pair | cov_out of both falls through D(s, B), and rolls up to the entry pair × (1 − λ) ≈ 1: it is a family mistake. |
| Scientific-name question, *Halichoeres* species answered a *Thalassoma* species | species mix-up | species pair, rolled up into genus pair (Halichoeres, Thalassoma) × (1 − λ_G) | Species cov_in; the genus pair's D too, for a player of the genus rank. |
| Genus question, *Chromis* answered *Pomacentrus* | genus pair | genus pair | Species pairs across those genera may inherit the genus D (optional third level: inherit from the nearest ancestor pair the player has records for). |
| Right answers anywhere | offers at the unit's rank (species precision or `offE`) | offers | D rises on every pair offered; cross-entry species offers also count as evidence for the entry pair × (1 − λ). |

The rule in one line: **evidence goes up weighted by (1 − λ), and discrimination comes down weighted by (1 − λ)**. A
pair's own record always wins: D̃(s,u) = max(D_own(s,u), (1 − λ(s,u)) · D_parent(A,B)).

Rule 13 as FISH_PATH words it ("a wrong pick in another entry counts against both entries and both species") is about
progress, not about the matrix. Question f asks whether a look-alike species mix-up should cost the entries only
(1 − λ) of a miss.

### 4.5 Coverage per rank and the bar

For unit t of a rank whose subject has a parent rank (fish genera and species: the parent is the IMR entry):

- **Block** B(t) = units of the same entry ∪ cross-entry units u with λ(t,u) ≥ ½ and pooled ≥ `CONF.TRAP` (declared
  or from data).
- **cov_in(t)** = Σ_{u∈B} ω_tu · D_tu / Σ_{u∈B} ω_tu, with ω the pooled score (prior chain, then data).
- **cov_out(t)** = Σ_{u∉B} ω_tu · max(D_tu, D_E(entry t, entry u)) / Σ_{u∉B} ω_tu. Computed per other entry, not per
  species: the ordinary pairs to entry B sum to D_E or D(t, B) times their precomputed mass. 26 terms per unit plus its
  own cross records.
- **cov(t) = cov_in(t) × cov_out(t)**.
- **The bar**: `0.95 × min(1, pg / M) × h(cov)`, h(c) = 0.4 + 0.6·√c. Exam questions add 1% each, and a passed exam
  gives 100%, as today.
- The **entries** have no parent: B = the 27 entries, cov_out = 1. Their D includes the species-level evidence rolled
  up (4.4). Same as corals.
- **Circles 2 and 3** never count (as now), so they are outside every field, like the coral bonus genera.

Coverage measures breadth. The specific look-alikes are enforced by the exam's entry rule (4.8), because one uncleared
look-alike among 300 ordinary species weighs about 3% of cov_out.

**Common and scientific names share the species matrix.** The pair is visual: a photo of s taken for u is the same
mistake whichever name is asked. Each name unit keeps its own `pg`, so its bar is pg_name × h(cov_species). Typing
common names never advances the scientific bar, because pg_sci stays at 0 (Pierre's "not gameable", FISH_PATH open
question 3). Name confusions proper (two Latin epithets alike) can be told apart later by the logged display mode.

**Computing cost** (`bench.js`): every species' coverage for one player takes 108 ms pair by pair, and **5 ms**
aggregated per entry (identical result), on this machine. A phone is perhaps 3-5× slower [memory]. Recompute the
units an answer touched, or everything at load. The sheet's mirror for the leaderboard: about 30 players × 5 ms ×
3 (Apps Script) ≈ 0.5 s, cached.

### 4.6 Non-linear progress: fast first, slower later

Three mechanisms, none a step or a cap:

- **The moving average** (`pg`): each point harder than the last (unchanged).
- **The concave h**: the first units met get a large share early.
- **Traps first**: the distractors favour the highest-ω pairs, so coverage climbs fastest on the mass that matters,
  and the long tail of weak pairs comes last.

**Within-entry coverage** of the species met as an entry's species open in commonness order, with the cross part at 1
(entries known), all pairs among the met told apart, priors only (flat inside an entry, so a near-linear lower bound
on the speed; real data make it more concave). Each cell is cov_in → h cap:

| Entry | Species | 3 met | 5 met | 10 met | 20 met | 40 met |
|---|---|---|---|---|---|---|
| Damselfish | 55 | 0.04 → 0.52 | 0.07 → 0.56 | 0.17 → 0.65 | 0.35 → 0.75 | 0.72 → 0.91 |
| Wrasse | 66 | 0.03 → 0.50 | 0.06 → 0.55 | 0.13 → 0.62 | 0.29 → 0.72 | 0.59 → 0.86 |
| Butterflyfish | 23 | 0.08 → 0.57 | 0.18 → 0.65 | 0.41 → 0.78 | 0.87 → 0.96 | |
| Surgeonfish & Unicornfish | 22 | 0.11 → 0.60 | 0.20 → 0.67 | 0.44 → 0.80 | 0.90 → 0.97 | |
| Cardinalfish | 24 | 0.08 → 0.57 | 0.17 → 0.65 | 0.38 → 0.77 | 0.83 → 0.95 | |
| Snapper | 17 | 0.11 → 0.60 | 0.24 → 0.69 | 0.56 → 0.85 | | |
| Groupers | 14 | 0.15 → 0.63 | 0.34 → 0.75 | 0.71 → 0.91 | | |
| Angelfish | 9 | 0.26 → 0.71 | 0.48 → 0.82 | | | |

- **Small entries finish fast; Damselfish and Wrasse are the long tail.** That matches the field: telling 55
  damselfish apart is the hard part of fish ID.
- **The global fish score** (25% entries + 75% species credit, `tools/fishscore.js`) takes these bars as inputs.
  - Its fast start is unchanged: the entries' 25% within about 1,000 answers.
  - Species bars run lower early, then catch up.
  - The anchors (80 / 85 / 100%) still hold at full mastery, since cov reaches 1 when every pair is cleared.
  - `fishscore.js` should be rerun with a coverage term before anything ships.
- Within-entry priors could later be refined by photo or trait similarity. That is a data source, not a category
  (rule 2), and Pierre's call; it is not needed once answers exist.

### 4.7 The opening path

- **Order unchanged**: an entry's species at Advanced, one at a time, commonness first (Pierre's rule).
- **Partner pull** (new, players feel it): when a unit reaches pg ≥ M and its exam waits on a look-alike not yet
  opened, that partner comes next in the opening queue, within the usual `OPEN` share. Without it, a species whose
  look-alike sits deep in its entry's commonness order would wait for its exam a very long time.
- **A partner in another entry not at Advanced** cannot open (FISH_PATH unlock rule). Its species→entry evidence in
  both directions stands in at the parent rank: photos of s with entry B offered and answered right; photos of u
  answered as their own entry, not A. FISH_PATH already plans these per-photo traps at family level.
- **The "Super Hyper Mega Danger Zone" offer** ("only if the results show it is still too easy") can read coverage: a
  high success rate on the open species together with a high cov_in means the player is ready for the whole entry
  list.

### 4.8 The exams

- **Entry to any exam** (corals, entries, genera, species): pg ≥ M, cov ≥ C_EX (0.9 proposed), and every look-alike
  of the block cleared (D ≥ ½).
  - "Look-alike" = pooled ≥ `CONF.TRAP`, or declared.
  - At the genus rank, `fishGenera` declares **every sibling genus** a look-alike (22 in Wrasse). For this rule, read
    the top 3 siblings by ω plus the data look-alikes, so a Wrasse genus is not held until all 22 are cleared. The
    traps themselves stay as built.
- **Traps**: the 3 units of the block with the highest ω, all open by the entry rule (set-size study, question e).
- **The family exam Pierre imagined** (FISH_PATH open question 5: about 20 questions on the hard fish of a family,
  answered in scientific names). "The hard fish" = the species carrying the entry's highest-ω pairs. Pick photos and
  traps greedily so the 20 questions cover the entry's top uncleared pairs, each pair at least once as photo plus trap.
  What passing it grants is still his design question.

### 4.9 Corals and subject-neutrality

- **The engine reads** `rank` (exists), `parent` (exists on fish genera; species will carry it), and the prior
  fields `look`, `fam`, `forms`.
  - Corals: no parent. The block is the slate, cov_out = 1, and the result is the set-size design exactly. The one
    difference is that D comes from `off` / `conf` instead of a new `cl`, so corals get the same improvement (question
    c).
  - Fish species: `fam` = genus or IMR sub-entry, `forms` = entry, and the cross-entry prior comes from the parents'
    pooled score.
- **No subject test in the engine** (`tests/subject-neutral.test.js`, rule S1). The block, λ and inheritance are
  generic functions of `parent`.
- **Rules version.** Coverage changes progress, so it is a rules version (RVS) for corals. For fish, the replay and
  RVS come once fish answers are logged; until then a fish progress is recomputed on the device from its own records,
  which already hold `off` / `conf`.

## 5. Size, sync and the sheet

- **Sync payload.** Each save sends every subject's whole progress (`sync.js` `syncOnce`, `progData()`). With species,
  a fish progress can reach 0.3-0.5 MB, mostly `ps` plus pairs. Until delta saves exist, the compact encoding (4.1)
  matters more than the matrix choice. `Progress data` stores any size in 45,000-character chunks [repo].
- **Pooled computation.** Today `stats_` reads the whole Answers tab (14 columns) and recomputes everything when its
  10-minute cache misses. The cache holds 100 KB per value [memory]. Today's stats JSON is 65 KB, 47 KB of it photo
  ratings for 993 photos. With fish photos (about 12k at species level) and fish pairs it will not fit, and the code's
  fallback is "computed each time": a full read and pass on every `?stats=1` request.
- **Growth.** About 1,500-3,000 answer rows today. 30 RAs × 10k answers (corals + fish) would be 300k rows × 14 =
  4.2M cells per read, likely tens of seconds [memory, to measure].
  - The spreadsheet's 10-million-cell limit (ROADMAP security row "archive old answers") arrives near 700k rows.
- **Recommendation (question j):**
  - a time-driven trigger every 10 minutes folds only the new rows (cursor in PropertiesService) into a **Pairs** tab
    (subject, rank, a, b, offered, mixed: at most a few tens of thousands of rows) and a **Stats snapshot** per
    subject, in 45,000-character chunks as Progress data;
  - `?stats=1&s=fish` serves the snapshot;
  - the replay keeps reading the player's own rows only.
  - It belongs with admin PR 11 (log fish answers), before fish answers flow, and it also takes the coral stats off
    the per-request path.

## 6. How to validate it

The set-size study's plan (its section 4.9), extended:

- `learnsim` **field learner** with a two-level world: per-entry and per-species discriminability, transfer from
  entry to ordinary species pairs, none to look-alike pairs. A fish profile (FISH_PATH "Checks before release").
- Primary measure: overclaim, the bar against true whole-field success (Luce over all 340).
- Sweep W_D ∈ {1, 2, 3}, the block threshold on λ, and C_EX.
- Guardrails: the entries' fast start, Damselfish / Wrasse not stalling.
- Once fish answers are logged: the real-log replay. Does a hierarchical ω predict fish mix-ups better than the flat
  prior (paired log-loss per player, sign-flip, as the stats-methods study)?

## 7. The personalised algorithm (later track)

What exists is already a personal blend at pair level: `confOf = confScore(own, pooled)`, worth `CONF.W` pooled
offers. It drives the traps (`confusable`), the Again and duels, the distractor ranking and `confGap` (the Elo's
"known mix-ups" term). The track, in stages:

1. **With the species level**: the same blend at every rank, plus the cross-rank views:
   - per-photo traps: a photo of s brings entry B as a trap when q_SE(s,B), pooled or the player's own, is high
     (FISH_PATH);
   - duels at species precision on the player's worst pairs (own excess over pooled, `confGap`);
   - **photo choice**: in family questions, prefer photos of the species this player has confused (own species→entry
     mix-ups, kept at species precision by policy B);
   - "Find the X" foils from the player's confusable species.
   Needs fish answers logged with their species. No new model.
2. **Predicting pairs never met**: a per-player term on top of the pooled logit, by groups of pairs (per entry pair)
   or low-rank (logit q_p(a,b) = logit q_pool(a,b) + u_p · v_ab), fitted offline in `tools/` from the Answers log; a
   few numbers per player shipped with the stats.
   - Needs 30+ players with thousands of answers each.
   - It must beat the pooled score on held-out mix-ups in the replay (`abilityeval.js`, paired log-loss per player).
   - A `learnsim` world with player-specific confusions.
3. **Choosing the next question to fill the field fastest** (machine teaching: Johns, Mac Aodha & Brostow 2015, cited
   in the set-size study; Singla et al. 2014 [memory]): the unit, photo and choices with the largest expected coverage
   gain. Needs the field learner to simulate before any player sees it.

Risks:
- Fitting noise: shrinkage handles it.
- A bubble of known confusions: keep the `OPEN` share and the field coverage, so unmet pairs still come.
- Pierre's "no coded tracks": everything stays a function of performance.

---

## 8. Questions for Pierre (each with a recommendation)

**a. One global matrix or nested ones?** Store one sparse all-vs-all matrix per rank (only pairs met, the rest from a
prior chain), and read it hierarchically?
*Recommendation*: yes (H). It gives the global and per-player all-vs-all views you want and sees cross-family look-alikes
from the data. Per player it stays about 80-210 KB, and the phones download about 50-160 KB.

**b. Coverage as a product (families × inside the entry) rather than a flat mean over all species?**
*Recommendation*: product. A flat mean would let the families make 83% of every species' coverage. For corals it changes
nothing (one rank).

**c. The pair level from the records we already keep**: D = max(0, (n − m/q₀)/(n + W_D)), W_D about 2, cleared at D ≥ ½,
the same for corals (replacing the set-size study's new `cl` counter and its reset)?
*Recommendation*: yes. No new counter, no record change, and the replay already has what it needs. A mix-up costs more
on a pair nobody confuses than on a known look-alike.

**d. Cross-family species look-alikes in the species' own block** (λ ≥ ½ and pooled ≥ the trap level, declared by you or
found in the data), and required cleared before the exam?
*Recommendation*: yes. It covers your dwarf angelfish / dark damselfish case without a fixed list. A pair you name
counts from day one.

**e. Inheritance**: an ordinary cross-family species pair takes the player's family discrimination; a cross-family species
mix-up counts on the family pair in proportion to (1 − λ)?
*Recommendation*: yes. Knowing it is a butterflyfish tells it from every damselfish, except the look-alikes.

**f. Look-alike species mix-ups and the entries' progress**: FISH_PATH counts a wrong pick in another entry against both
entries in full. Weight it by (1 − λ), so a known species look-alike costs the families little?
*Recommendation*: yes, but simulate it first (fish profile). Until then keep the rule as designed.

**g. One species matrix for both name formats**, each name unit keeping its own progress (common names never advance the
scientific bar)?
*Recommendation*: yes. The mix-up is visual. Separate matrices would make players re-prove every pair in Latin, double
the storage, and add nothing the progress does not already hold.

**h. Per-player storage policy B**: species precision for pairs inside an entry, look-alike pairs and every mix-up;
other cross-family offers folded into species→family counts; typed right answers as offers within the block, in their
own map?
*Recommendation*: yes. Bounded by the structure (about 210 KB at 50k answers instead of 557 KB). It is a data format
other code will follow.

**i. The photo's species logged with each fish answer** (admin PR 11: a column at the end of Answers, or derived from the
photo id through `fish-photos.json`)?
*Recommendation*: log it. The family↔family, species→family and species↔species views all need it, and the sheet then
needs no photo map. A change to the sheet's layout, so yours to approve.

**j. Pooled stats built incrementally** (a Pairs tab and a per-subject Stats snapshot by a 10-minute trigger) with PR 11,
before fish answers flow?
*Recommendation*: yes. The stats cache will overflow with fish photos and pairs, and the full read grows with every
answer. Also plan the Answers archive before the 10-million-cell limit (ROADMAP row).

**k. Partner pull in the opening**: a unit at the exam's entry whose exam waits on an unopened look-alike pulls that
partner next (within the usual share); for a partner in a family not yet at Advanced, family-level evidence on those
photos stands in?
*Recommendation*: yes. Otherwise a species whose look-alike sits deep in commonness order waits very long for its exam.

**l. Exams**: traps = the block's 3 most confusable; at the genus rank the "look-alikes cleared" rule reads the top 3
siblings plus data look-alikes, not all 22 Wrasse siblings; the family exam (about 20 hard questions in scientific
names) chosen to cover the entry's most confusable uncleared pairs?
*Recommendation*: yes for the first two. The family exam as a design proposal for your open question 5.

**m. Admin views**: global and per-player all-vs-all heatmaps (species 340 × 340 in entry and genus blocks; families;
genera), admin only, computed from the log on demand?
*Recommendation*: yes, once fish answers are logged. A corals version (40 × 40) can come first, on today's data.

**n. Personalised algorithm**: stage 1 (the existing blend at every rank, per-photo traps, duels, photo choice) with the
species level; stages 2-3 (predicting unmet pairs, machine teaching) only after real data and a replay check?
*Recommendation*: yes, in that order. A ROADMAP row now, nothing built before fish answers are logged.

**o. Validation order**: the set-size study's field learner extended to two levels and a fish profile, a sweep of W_D,
the block threshold and the exam's coverage, then the real-log replay once fish answers exist?
*Recommendation*: yes. No setting above should ship on priors alone.

---

## 9. Notes and sources

- Repository: `core.js` `CONF`, `confScore`, `dataLook`, `confGap`, `pairConf`, `replayProgress` (offers and mix-ups
  rebuilt from the Choices column), `SUBJECTS`, `fishGen`; `model.js` `pooledConf`, `confOf`, `confTerm`,
  `distractors`, `examSet`; `app.js` `fishGenera`, `rankOf`; `sync.js` `syncOnce`; `tools/sync/Code.gs` `stats_`,
  `answerRows_`; `fish.json` (teach, species, sub-entries); docs/FISH_PATH.md ("Levels", "Look-alikes at any rank",
  "My progress (fish)", open question 5); docs/LEARNING.md ("Progress (moving average) and mastery", "Fish on the same
  model", "Fish: the global score, simulated"); docs/ARCHITECTURE.md (Progress data chunks); docs/ROADMAP.md (fish
  look-alikes at any rank; archive before the 10-million-cell limit).
- The set-size study for the science (set size, closed versus open sets, Kellman's false alarms, Luce choice) and the
  validation framework.
- [memory]: Apps Script CacheService 100 KB per value; read speeds of `getValues`; phone versus desktop JavaScript
  speed; browser `CompressionStream`; Singla et al. (2014, ICML) on teaching a crowd to classify.
- Scripts (scratchpad): `fishconf/size.py`, `fishconf/field.py`, `fishconf/product.py`, `fishconf/bench.js`. The
  storage simulation's choice mix (40% other entries, 35% same entry, 25% same genus) and its 15% misses are
  assumptions. They set the scale, not a forecast.
