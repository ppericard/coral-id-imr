#!/usr/bin/env python3
"""Re-checks every game photo's iNaturalist observation against the rule it came in under (Linear REE-195). READ ONLY.

A candidate filter looks at an observation once, when it fetches it; nothing looked again once the photo was in play, so an
identification withdrawn later, a deleted observation or a changed species stayed in the game (the RA session review,
docs/reviews/2026-11-21-ra-session-review.md section 4: 9 fish photos had drifted). This tool asks iNaturalist again, for
every game photo that has an observation, and reports the photos that no longer pass. It changes nothing: no data file,
never curation.json (rule A1), never the sheet. Removing a photo stays Pierre's (his admin exclusion).

Which photos: every photo with an iNaturalist observation that is in play, in every subject (the IMR lecture photos, the
FishBase photos and the photos with no observation are counted as not checked):
  - corals: data.json gen and x.gen views, and the candidates curation.json genera.add puts in play; not excluded, hidden,
    sent to another genus (out), several corals (multi) or a skeleton (skel);
  - fish: fish-game.json, not excluded (curation.json fish.exclude, exclude);
  - sea slugs: seaslug-game.json, not excluded (curation.json seaslug.exclude, exclude).

How each photo is judged. The fetchers' own predicates are called, never restated (a test patches one and sees the verdict
change); what a fetcher leaves to its search query (the taxon, casual, captive) is asked beside them:
  - corals: tools/fetch_local.py accepted (the Philippines tiers: ph_ok, Research Grade, a genus-level community ID or the
    trusted identifier's; abroad: Research Grade only) for the genus of the unit, and in_genus;
  - fish candidates (fish-<species>-cand-<photo>): tools/fetch_fish.py usable_obs on the observation as fetch_fish.trim reads
    it, and the observation's taxon is the species' photo taxon (the search's taxon_id);
  - fish reference photos (fi<photo>, from the iNaturalist taxon pages): tools/fish_refs.py passes, with the species'
    photo taxon as `want`;
  - sea slugs: a species (s<taxon>): tools/fetch_seaslugs.py usable (usable_obs, and no egg annotation); a genus-level photo
    (g:<genus>): usable_gl (agreed at the genus); a species with no name (x:<key>): usable_gl and the label field still
    there (labelled). A genus-level observation since refined to a species of its genus is still a genus-level photo: its
    rank is not asked again and its identifications are counted at the genus (fetch_seaslugs.agreement, on the genus's
    taxon, a few requests by taxon id), as the genus search counted them.
  The predicates are given the game photo alone among its observation's photos: a sibling's licence does not stand for it.

The reasons (primary first, in this order):
  deleted      iNaturalist no longer returns the observation (asked again once before it is called deleted);
  photo_gone   the observation is there but no longer holds the game photo;
  casual       its quality grade is casual;
  other_taxon  its taxon is now another species (or genus) than the photo's unit, or off the unit's genus;
  id_lost      its identification is no longer enough: coarser than the rank asked, Needs ID without the agreement the route
               asks, or not Research Grade;
  captive      marked captive;
  dead         annotated Dead (fish and sea slugs);
  egg          annotated Egg (sea slugs);
  rule         the fetcher's predicate fails on something else (licence, place, a photo no longer usable); the row says which
               predicate.

Network: iNaturalist API v2, 200 observations a request, only the fields the predicates read, through tools/inat.py (rule C7:
about one request a second, the project's User-Agent, paced retries); the queries hold observation ids only, no name, no
project data. About 140 requests for the whole game (some 27,000 observations): five minutes or so. --cache FILE keeps the
replies (a rerun asks only what is missing; a cached null is "gone").

    python3 tools/photo_recheck.py [--root DIR] [--out DIR] [--only coral,fish,seaslug] [--cache FILE] [--label TEXT]

Writes DIR/report.md, report.json and failing.tsv. Exits 0 whether or not photos fail (a finding is not an error); 1 when
the run itself cannot be trusted (iNaturalist unreachable, an implausible share of observations missing).
Tests: node --test tests/photo_recheck.test.js (offline fixtures).
"""
import argparse
import datetime
import json
import re
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import fetch_fish as ff  # noqa: E402  the fish candidates' rule (usable_obs, trim)
import fetch_local as fl  # noqa: E402  the coral candidates' rule (accepted, in_genus)
import fetch_seaslugs as fs  # noqa: E402  the sea slugs' rules (usable, usable_gl, labelled)
import fish_refs as fr  # noqa: E402  the fish reference photos' rule (passes)
import inat  # noqa: E402  the one paced, retried iNaturalist client (rule C7)
from taxonomy import inat_taxon  # noqa: E402  the iNaturalist taxon of each coral genus

ROOT = HERE.parent
SUBJECTS = ("coral", "fish", "seaslug")
REASONS = ("deleted", "photo_gone", "casual", "other_taxon", "id_lost", "captive", "dead", "egg", "rule")
GENUS_OR_BELOW = {"genus", "subgenus", "section", "complex", "species", "hybrid", "subspecies", "variety", "form",
                  "infrahybrid"}  # iNaturalist's ranks at the genus or finer
BATCH = inat.OBS_PAGE  # observations a request (iNaturalist's most)
MISSING_MAX = 0.05  # more of the observations missing than this share, and than MISSING_FLOOR: the run cannot be trusted
MISSING_FLOOR = 25  # (iNaturalist down, not drift)
LIST_MAX = 400  # rows per reason in report.md (report.json and failing.tsv hold every one)


def union(*parts):
    """iNaturalist `fields` strings merged, each field once."""
    return ",".join(dict.fromkeys(f for p in parts for f in p.split(",") if f))


# What the predicates read, from the modules' own field lists plus what they take from the observation.
FIELDS = {
    "coral": union("id,quality_grade,captive,user.login,photos.id,taxon.id,taxon.name,taxon.rank,taxon.ancestor_ids,community_taxon_id,"
                   "identifications_most_agree,identifications.current,identifications.user.login,identifications.taxon.id,"
                   "identifications.taxon.name,identifications.taxon.rank,identifications.taxon.ancestor_ids"),
    "fish": union(ff.FIELDS, fr.FIELDS, "captive,taxon.ancestor_ids"),
    "seaslug": union(ff.FIELDS, fs.ID_FIELDS, "captive,taxon.ancestor_ids"),
}

OBS = re.compile(r"inaturalist\.org/observations/(\d+)")


def obs_id(o):
    """The iNaturalist observation id of a record's `o` (a URL, a number or its digits), None for FishBase or none."""
    if isinstance(o, int):
        return o
    s = str(o or "")
    if s.isdigit():
        return int(s)
    m = OBS.search(s)
    return int(m.group(1)) if m else None


def photo_id(f):
    """The iNaturalist photo id a game photo's name ends with (a crop letter dropped)."""
    m = re.search(r"(\d+)[cd]?$", str(f))
    return m.group(1) if m else None


def load(path, default):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


# ---------------------------------------------------------------- what is in play


class Excluded:
    """The photos curation.json excludes for good (exclude: {f: reason} or a list), by name and by photo id."""

    def __init__(self, *parts):
        self.names, self.ids = set(), set()
        for x in parts:
            for f in (x or {}):
                self.names.add(f)
                if photo_id(f):
                    self.ids.add(photo_id(f))

    def __contains__(self, f):
        return f in self.names or photo_id(f) in self.ids


def record(subj, p, **more):
    return {"subj": subj, "f": p["f"], "obs": obs_id(p.get("o")), "t": p.get("t") or "", "own": bool(p.get("own")),
            "loc": p.get("loc") or "", "sp": p.get("sp") or "", "gl": bool(p.get("gl")), "src": p.get("from") or "", **more}


def coral_records(root, cur):
    """Corals in play: data.json gen and x.gen views, and the candidates curation.json genera.add names."""
    data = load(root / "data.json", {})
    gens = cur.get("genera") or {}
    ex = Excluded(cur.get("exclude"))
    add = {f for c in gens.values() for f in (c.get("add") or {})}
    out = {}

    def take(p, node, part):
        f = p.get("f")
        if not isinstance(f, str) or f in out or f in ex or p.get("multi") or p.get("skel"):
            return
        c = gens.get(node) or {}
        if f in (c.get("hide") or []) or f in (c.get("out") or {}):
            return
        out[f] = record("coral", p, node=node, part=part)

    for part, G in (("gen", data.get("gen") or {}), ("x.gen", (data.get("x") or {}).get("gen") or {})):
        for g, x in G.items():
            for L in (x.get("views") or {}).values():
                for p in L:
                    take(p, g, part)
    for g, L in (data.get("cand") or {}).items():
        for p in L:
            if p.get("f") in add:
                take(p, g, "cand")
    return list(out.values())


def tree_records(root, cur, subj, game_file, part):
    """Fish or sea slugs in play: the game file's photos, minus what curation.json excludes."""
    ex = Excluded(cur.get("exclude"), (cur.get(part) or {}).get("exclude"))
    seen, out = set(), []
    for node, L in (load(root / game_file, {}).get("photos") or {}).items():
        for p in L:
            if isinstance(p.get("f"), str) and p["f"] not in seen and p["f"] not in ex:
                seen.add(p["f"])
                out.append(record(subj, p, node=node))
    return out


def inventory(root, only=SUBJECTS):
    """Every photo in play of the subjects asked: [{subj, f, obs (or None), t, own, loc, sp, gl, src, node}]."""
    cur = load(root / "curation.json", {})
    out = []
    if "coral" in only:
        out += coral_records(root, cur)
    if "fish" in only:
        out += tree_records(root, cur, "fish", "fish-game.json", "fish")
    if "seaslug" in only:
        out += tree_records(root, cur, "seaslug", "seaslug-game.json", "seaslug")
    return out


# ---------------------------------------------------------------- asking iNaturalist


def ask(ids, fields):
    """{id: observation} of the ids iNaturalist returns (v2, the fields asked), one request."""
    j = inat.get(inat.V2 + "observations?id=" + ",".join(map(str, ids)) + f"&per_page={BATCH}&fields={fields}")
    return {o["id"]: o for o in (j or {}).get("results") or []}


def fetch(subj, ids, cache, save=lambda: None, log=lambda m: None):
    """{observation id: its record, or None when gone} for ids. cache[subj] holds what an earlier run asked (None: gone);
    a missing id is asked once more before it is called gone."""
    mem = cache.setdefault(subj, {})
    todo = sorted({i for i in ids if str(i) not in mem})
    log(f"{subj}: {len(ids)} observations, {len(todo)} to ask")
    miss = []
    for n, ch in enumerate(inat.chunks(todo, BATCH)):
        got = ask(ch, FIELDS[subj])
        for i in ch:
            if i in got:
                mem[str(i)] = got[i]
            else:
                miss.append(i)
        if n % 10 == 9:
            save()
            log(f"  {subj}: {(n + 1) * BATCH} asked")
    for ch in inat.chunks(miss, BATCH):  # asked once more: a batch that lost one is not a deleted observation
        got = ask(ch, FIELDS[subj])
        for i in ch:
            mem[str(i)] = got.get(i)
    save()
    return {i: mem.get(str(i)) for i in ids}


# ---------------------------------------------------------------- the judgement


def rank_of(o):
    return ((o or {}).get("taxon") or {}).get("rank")


def common(o):
    """What every route reads first: gone, casual (every search leaves casual out), captive (every search asks
    captive=false)."""
    if o is None:
        return ["deleted"]
    return [r for r, bad in (("casual", o.get("quality_grade") == "casual"), ("captive", bool(o.get("captive")))) if bad]


class Context:
    """What the judgement reads besides the observation: the fish species' photo taxa, the sea slugs' egg annotations and
    informal species' labels, the corals' taxa."""

    def __init__(self, root):
        F = load(root / "fish.json", {})
        self.fish = {s["id"]: s for s in F.get("species") or []}
        self.src = load(HERE / "seaslugs.json", {})
        self.pairs = [tuple(p) for p in ((self.src.get("photoTarget") or {}).get("exclude") or {}).get("annotations") or []]
        inf = load(HERE / "seaslug_informal.json", {})
        self.informal = {s["key"]: s for s in inf.get("species") or []}
        self.coral_tids = {}
        self.gids = {}  # sea-slug genus name -> its iNaturalist taxon id (genus_taxa)

    def genus_taxa(self, recs, out):
        """The iNaturalist taxa of the sea-slug genera the genus-level photos belong to (fetch_seaslugs.genus_ids, a few
        requests by taxon id), so the agreement of a genus-level photo can be read at its genus."""
        names = {self.genus_of(r) for r in recs if r["subj"] == "seaslug" and not re.fullmatch(r"s\d+", r["sp"])} - {""}
        if names:
            self.gids = fs.genus_ids(ff.Net(Path(out) / "genus-taxa.json"), self.src, names)

    def genus_of(self, r):
        """The genus a sea-slug genus-level photo is for: its unit's (g:<genus>) or its informal species' genus."""
        key = r["sp"].split(":", 1)[1] if ":" in r["sp"] else ""
        return self.informal[key]["genus"] if key in self.informal else key

    def fish_taxa(self, *ids):
        """The photo taxa (fetch_fish.photo_taxon) of fish species ids: what a species' searches ask for."""
        return {ff.photo_taxon(self.fish[i]) for i in ids if i in self.fish and ff.photo_taxon(self.fish[i])}

    def coral_taxa(self, r):
        """The iNaturalist taxa of the coral genera a photo may belong to: its unit's and its own taxon's genus."""
        names = [r.get("node") or "", (r["t"] or "").split(" ")[0]]
        out = []
        for g in names:
            if g not in self.coral_tids:
                self.coral_tids[g] = inat_taxon(g, "coral") if g else None
            if self.coral_tids[g] and self.coral_tids[g] not in out:
                out.append(self.coral_tids[g])
        return out


def order(reasons):
    return [x for x in REASONS if x in reasons]


def check_coral(r, o, X):
    why = common(o)
    if o is None:
        return why, ""
    tids = X.coral_taxa(r)
    if not tids:
        return None, "no iNaturalist taxon for the genus in tools/taxonomy.json"
    tx = o.get("taxon") or {}
    loc = r["loc"] or "ph"  # no place said: the Philippines tiers' rule, the lenient one
    if photo_id(r["f"]) not in {str(p.get("id")) for p in o.get("photos") or []}:
        why.append("photo_gone")
    if tx.get("rank") not in GENUS_OR_BELOW:
        why.append("id_lost")
    elif not any(fl.in_genus(tx, t) for t in tids):
        why.append("other_taxon")
    elif "casual" not in why and not any(fl.accepted(o, t, loc) for t in tids):
        why.append("id_lost")
    return order(why), "fetch_local.accepted"


def off_species(tr, want):
    """The observation names a species (or below) that is none of `want` (the taxa a species' searches ask for): the
    taxon_id of fetch_fish.queries, which usable_obs leaves to the search."""
    line = set(tr.get("tx") or ([tr["tid"]] if tr.get("tid") else []))
    return bool(want) and bool(line) and tr.get("rk") in ff.SPECIES_RANKS and not set(want) & line


def own_photo(tr, f):
    """tr with the game photo f as its one photo, and whether the observation still has that photo: the predicates ask
    whether the observation has a usable photo, and a sibling's licence must not stand for the game photo's own."""
    pid = photo_id(f)
    mine = [p for p in tr.get("ph") or [] if str(p[0]) == pid]
    return {**tr, "ph": mine}, bool(mine)


def diag_species(tr, why):
    """Why usable_obs refused an observation: the checks it makes, in its order; 'rule' when none shows (its licence, place
    and photo checks)."""
    if [*ff.DEAD] in tr.get("an", []):
        why.append("dead")
    if tr.get("rk") not in ff.SPECIES_RANKS or (tr.get("u") != ff.PIERRE and tr.get("g") != "research"):
        why.append("id_lost")
    return why or ["rule"]


def check_fish(r, o, X):
    why = common(o)
    if o is None:
        return why, ""
    sid = (re.match(r"fish-(s\d+)-cand-", r["f"]) or [None, None])[1]
    want = X.fish_taxa(*{sid, r["sp"]} - {None})
    if re.match(r"fi\d", r["f"]):  # a reference photo: the unit's taxon page photo (fish_refs)
        rec = fr.keep_obs({"results": [o]}).get(photo_id(r["f"]))
        if rec is None:
            return order(why + ["photo_gone"]), "fish_refs.passes"
        if fr.passes(rec, want or {rec["sp"]}):
            return order(why), "fish_refs.passes"
        if rec and want and rec["rank"] in fr.SPECIES_RANKS and rec["sp"] not in want:
            why.append("other_taxon")
        if rec and rec["dead"]:
            why.append("dead")
        if rec and (rec["rank"] not in fr.SPECIES_RANKS or rec["q"] != "research"):
            why.append("id_lost")
        return order(why or ["rule"]), "fish_refs.passes"
    tr, there = own_photo(ff.trim(o), r["f"])
    ok = there and bool(ff.usable_obs(tr, set(), ()))
    if not there:
        why.append("photo_gone")
    if off_species(tr, want):
        why.append("other_taxon")
    if there and not ok:
        why = diag_species(tr, why)
    return order(why), "fetch_fish.usable_obs"


def check_seaslug(r, o, X):
    why = common(o)
    if o is None:
        return why, ""
    tr, there = own_photo(fs.trim_id(o), r["f"])
    if not there:
        why.append("photo_gone")
    if re.fullmatch(r"s\d+", r["sp"]):  # a species: the fish's rule and no egg annotation
        ok = there and bool(fs.usable(tr, X.pairs))
        if off_species(tr, {int(r["sp"][1:])}):
            why.append("other_taxon")
        if there and not ok:
            why = diag_species(tr, why)
            if fs.is_egg(tr, X.pairs):
                why = [x for x in why if x != "rule"] + ["egg"]
        return order(why), "fetch_seaslugs.usable"
    # a genus-level photo (g:<genus>), or a species with no name (x:<key>, with its genus): usable_gl
    genus = X.genus_of(r)
    inf = X.informal.get(r["sp"].split(":", 1)[1]) if ":" in r["sp"] else None
    name = tr.get("t") or ""
    inside = bool(genus) and (name == genus or name.startswith(genus + " "))
    if tr.get("rk") not in GENUS_OR_BELOW:
        why.append("id_lost")  # coarser than the genus
    elif not inside:
        why.append("other_taxon")
    # The genus search asks rank=genus and counts the identifications at the genus. An observation refined since to a
    # species of its genus is still a genus-level photo: its rank is not asked again, and its identifications are counted
    # at the genus again (fetch_seaslugs.agreement, on the genus as the observation's taxon), not at the species.
    gl = {**tr, "rk": "genus"}
    gid = X.gids.get(genus)
    line = (o.get("taxon") or {}).get("ancestor_ids") or []
    if inside and gid and gid in line:
        gl["ag"], gl["dg"] = fs.agreement({**o, "taxon": {"id": gid, "ancestor_ids": line[:line.index(gid)]}})
    ok = there and inside and bool(fs.usable_gl(gl, X.pairs)) and (not inf or fs.labelled(tr, inf["field"]))
    if not ok and inside and there:
        if [*ff.DEAD] in tr.get("an", []):
            why.append("dead")
        elif fs.is_egg(tr, X.pairs):
            why.append("egg")
        elif not fs.agreed(gl) or (inf and not fs.labelled(tr, inf["field"])):  # a species with no name rests on its label
            why.append("id_lost")
        elif not why:
            why.append("rule")
    return order(why), "fetch_seaslugs.usable_gl"


CHECK = {"coral": check_coral, "fish": check_fish, "seaslug": check_seaslug}


def row(r, o, why, via):
    t = (o or {}).get("taxon") or {}
    return {"subj": r["subj"], "f": r["f"], "obs": r["obs"], "url": f"https://www.inaturalist.org/observations/{r['obs']}",
            "reasons": why, "primary": why[0], "was": r["t"], "now": t.get("name") or "", "now_rank": t.get("rank") or "",
            "grade": (o or {}).get("quality_grade") or "", "observer": ((o or {}).get("user") or {}).get("login") or "",
            "own": r["own"] or ((o or {}).get("user") or {}).get("login") == "ppericard", "loc": r["loc"],
            "unit": r.get("node") or "", "sp": r["sp"], "predicate": via}


def judge(recs, replies, X):
    """(failing rows, unchecked rows) of the records: replies[subj][obs id] is the observation or None (gone)."""
    fail, skip = [], []
    for r in recs:
        o = replies[r["subj"]].get(r["obs"])
        why, via = CHECK[r["subj"]](r, o, X)
        if why is None:
            skip.append({"subj": r["subj"], "f": r["f"], "obs": r["obs"], "why": via})
        elif why:
            fail.append(row(r, o, why, via))
    return fail, skip


# ---------------------------------------------------------------- the report


def summary(recs, fail, skip, asked):
    S = {}
    for s in SUBJECTS:
        mine = [r for r in recs if r["subj"] == s]
        bad = [x for x in fail if x["subj"] == s]
        S[s] = {"in_play": len(mine), "with_observation": sum(1 for r in mine if r["obs"]), "observations": asked.get(s, 0),
                "failing": len(bad), "unchecked": sum(1 for x in skip if x["subj"] == s),
                "by_reason": dict(Counter(x["primary"] for x in bad))}
    return S


def markdown(label, S, fail, skip):
    L = [f"# Game photos re-checked against iNaturalist ({label})", "",
         "Every game photo with an observation, asked again and judged by its fetcher's own predicate "
         "(tools/photo_recheck.py, rules P1 to P6). Read only: nothing is changed; removing a photo is Pierre's, in the admin.", "",
         "| | In play | With an observation (asked) | No observation (not asked) | Failing | Not judged |",
         "|---|---|---|---|---|---|"]
    for s, v in S.items():
        L.append(f"| {s} | {v['in_play']} | {v['with_observation']} | {v['in_play'] - v['with_observation']} | "
                 f"{v['failing']} | {v['unchecked']} |")
    L += ["", "| Reason | " + " | ".join(S) + " |", "|---|" + "---|" * len(S)]
    for why in REASONS:
        if any(why in v["by_reason"] for v in S.values()):
            L.append(f"| {why} | " + " | ".join(str(v["by_reason"].get(why, 0)) for v in S.values()) + " |")
    if not fail:
        L += ["", "No photo fails."]
    for why in REASONS:
        rows = [x for x in fail if x["primary"] == why]
        if not rows:
            continue
        L += ["", f"## {why} ({len(rows)})", "", "| Photo | Subject | Was | Now | Grade | Observer | Observation |", "|---|---|---|---|---|---|---|"]
        for x in rows[:LIST_MAX]:
            tag = " (Pierre's own)" if x["own"] else ""
            now = (x["now"] + (f" ({x['now_rank']})" if x["now_rank"] else "")) or "-"
            L.append(f"| `{x['f']}`{tag} | {x['subj']} | {x['was']} | {now} | {x['grade'] or '-'} | {x['observer'] or '-'} | "
                     f"[{x['obs']}]({x['url']}) |")
        if len(rows) > LIST_MAX:
            L.append(f"\n{len(rows) - LIST_MAX} more in report.json and failing.tsv.")
    if skip:
        L += ["", f"{len(skip)} photos could not be judged: " + ", ".join(sorted({x['why'] for x in skip})) + "."]
    return "\n".join(L) + "\n"


def tsv(fail):
    cols = ("subj", "f", "obs", "primary", "reasons", "was", "now", "now_rank", "grade", "observer", "own", "loc", "unit", "predicate")
    out = ["\t".join(cols)]
    for x in fail:
        out.append("\t".join(",".join(x[c]) if c == "reasons" else str(x[c]) for c in cols))
    return "\n".join(out) + "\n"


def run(root, out, only, cache_path, label, log=lambda m: print(m, file=sys.stderr, flush=True)):
    root = Path(root)
    recs = inventory(root, only)
    X = Context(root)
    cache = load(cache_path, {}) if cache_path else {}
    kept = cache.setdefault("fields", {})
    for s in only:
        if kept.get(s) != FIELDS[s]:  # another field list: the cached replies lack what is read now
            cache[s], kept[s] = {}, FIELDS[s]

    def save():
        if cache_path:
            Path(cache_path).write_text(json.dumps(cache, separators=(",", ":")), encoding="utf-8")

    replies, asked = {}, {}
    for s in only:
        ids = sorted({r["obs"] for r in recs if r["subj"] == s and r["obs"]})
        asked[s] = len(ids)
        replies[s] = fetch(s, ids, cache, save, log)
        gone = sum(1 for v in replies[s].values() if v is None)
        if ids and gone > max(MISSING_FLOOR, MISSING_MAX * len(ids)):
            raise RuntimeError(f"{s}: iNaturalist returned nothing for {gone} of {len(ids)} observations: not drift, a failed run")
    with_obs = [r for r in recs if r["obs"]]
    if "seaslug" in only:
        X.genus_taxa(with_obs, out)
    fail, skip = judge(with_obs, replies, X)
    S = summary(recs, fail, skip, asked)
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "report.md").write_text(markdown(label, S, fail, skip), encoding="utf-8")
    (out / "report.json").write_text(json.dumps({"label": label, "summary": S, "failing": fail, "unchecked": skip}, indent=1) + "\n",
                                     encoding="utf-8")
    (out / "failing.tsv").write_text(tsv(fail), encoding="utf-8")
    return S, fail


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--root", default=str(ROOT), help="the repository whose game files are read (default: this one)")
    ap.add_argument("--out", default="photo-recheck", help="the folder the report is written to")
    ap.add_argument("--only", default=",".join(SUBJECTS), help="subjects, comma separated")
    ap.add_argument("--cache", help="a JSON file keeping the replies, so a rerun asks only what is missing")
    ap.add_argument("--label", default=datetime.date.today().isoformat())
    a = ap.parse_args(argv)
    only = tuple(s for s in a.only.split(",") if s)
    bad = [s for s in only if s not in SUBJECTS]
    if bad:
        sys.exit(f"unknown subject: {', '.join(bad)}")
    try:
        S, fail = run(a.root, a.out, only, a.cache, a.label)
    except (RuntimeError, OSError, ValueError) as e:
        print(f"photo_recheck failed: {e}", file=sys.stderr)
        return 1
    for s, v in S.items():
        if s in only:
            print(f"{s}: {v['failing']} failing of {v['with_observation']} with an observation ({v['in_play']} in play); {v['by_reason']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
