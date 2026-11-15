"""The presence rule, defined once (Pierre, 2026-11-04, rule C8: "the same scientific rigour for everyone, me
included"). Read by tools/build_fish.py (fish.json present), tools/fetch_fish.py (through fish.json), tools/fetch_local.py
(the coral search abroad) and tools/coral_presence.py (presence.json, the admin's "out of rule" flag).

Confirmed near Dauin (`near_dauin`), any of:
  - "observers": Research Grade iNaturalist observations within 40 km of Dauin by at least NEAR_OBSERVERS (2) distinct
    observers;
  - "imr": the species is in the IMR reference list (fish: the EventMeasure PDF "Common Filipino Fishes").
Confirmed in the Philippines (`ph_confirmed`), any of:
  - "observers": Research Grade observations in the Philippines (iNaturalist place 6873) by at least PH_OBSERVERS (3)
    distinct observers;
  - "checklist": at least one Research Grade observation in the Philippines (anyone's) and an independent checklist that
    lists the species for the Philippines (fish: FishBase Table 1 "present"; corals: Corals of the World, an ecoregion of
    the Philippines; tools/presence_checklists.json). A checklist alone never brings in a species nobody observed;
  - "near": confirmed near Dauin (so the IMR list too).
Pierre (iNaturalist user ppericard) is one observer like anyone else: his Research Grade observations count, his Needs ID
ones do not confirm anything (his species-level photos stay usable as that species: rule S2). Not used: the number of
identifiers and the date.
"""
import json
from pathlib import Path

import inat  # the batched observer counts (rule C7)
from taxonomy import aliases  # the species rows of tools/taxonomy.json: former names, moves, spellings

NEAR_OBSERVERS = 2
PH_OBSERVERS = 3
CHECKLISTS = Path(__file__).resolve().parent / "presence_checklists.json"
# The instance's centre (tools/instance.json centre; Pierre, 2026-11-13, Q339): "near" is within radiusKm of it. Today
# Dauin, 40 km; the query is the same string as before (the reply caches are keyed by URL).
CENTRE = json.loads((Path(__file__).resolve().parent / "instance.json").read_text(encoding="utf-8"))["centre"]
NEAR_AREA = f"lat={CENTRE['lat']}&lng={CENTRE['lon']}&radius={CENTRE['radiusKm']}"


def near_dauin(observers_dauin, imr=False):
    """Reasons a species is confirmed near Dauin (empty: not confirmed)."""
    return [k for k, ok in (("observers", observers_dauin >= NEAR_OBSERVERS), ("imr", bool(imr))) if ok]


def ph_confirmed(rg_ph, observers_ph, listed, near):
    """Reasons a species is confirmed in the Philippines (empty: not confirmed). rg_ph: its Research Grade observations
    there; observers_ph: their distinct observers (None when not asked: only asked when rg_ph >= PH_OBSERVERS);
    listed: a checklist lists it for the Philippines; near: confirmed near Dauin (truthy)."""
    why = []
    if (observers_ph or 0) >= PH_OBSERVERS:
        why.append("observers")
    if rg_ph >= 1 and listed:
        why.append("checklist")
    if near:
        why.append("near")
    return why


_C = {}


def _norm(n):
    """A name for matching: an epithet ending in -ii and its -i spelling are one (valenciennesii / valenciennesi:
    iNaturalist and WoRMS write some names differently)."""
    w = (n or "").split()
    if len(w) >= 2 and w[1].endswith("ii"):
        w[1] = w[1][:-1]
    return " ".join(w[:2])


def checklist(kind):
    """The set of names (as written, and their WoRMS accepted names) a checklist lists for the Philippines:
    kind "fish" = FishBase Table 1, "coral" = Corals of the World. Each name is matched through tools/taxonomy.json
    (ROADMAP "Taxonomy reference", Pierre 2026-11-05, Q49; its section for `kind`, a core.js SUBJECTS id): a name with a
    species row there brings the name WoRMS accepts now and iNaturalist's spelling of it, so a checklist written with
    former names meets iNaturalist's current ones without a hand mapping; a subject the file does not hold yet (the
    fish) is matched as written."""
    if kind not in _C:
        d = json.loads(CHECKLISTS.read_text(encoding="utf-8"))
        if kind == "fish":
            names = list(d["fishbase"]["names"])
        else:
            names = [n for k, acc in d["cotw"]["names"].items() for n in [k, *acc]]
        _C[kind] = {_norm(a) for n in names for a in aliases(n, kind)}
    return _C[kind]


def listed(kind, names):
    """True when the checklist of `kind` lists any of `names` (the name used, its WoRMS accepted name, iNaturalist's
    name, synonyms) for the Philippines; each name is also matched through its species row in tools/taxonomy.json (a
    former name or another spelling of a listed species)."""
    s = checklist(kind)
    return any(_norm(a) in s for n in names if n for a in aliases(n, kind))


def species_presence(get, taxon_id, kind="coral", extra=""):
    """{species name: {"id", "rg", "chk", "by"}} for every species under an iNaturalist taxon (a genus) with a Research
    Grade observation in the Philippines; "by" = ph_confirmed's reasons (empty: not confirmed). Species with none there
    are absent (not confirmed). `get(url)` returns the parsed JSON (the caller paces and caches it: rule C7). `extra`:
    more query parameters (e.g. "&captive=false"). species_presence_many for one taxon."""
    return species_presence_many(get, [taxon_id], kind, extra).get(taxon_id, {})


def species_presence_many(get, taxa, kind="coral", extra=""):
    """{taxon: species_presence(taxon)} for several iNaturalist taxa (genera) at once (rule C7): two species_counts
    queries for all of them (BATCH taxa a request, 500 rows a page; each taxon gets the species rows below it, as its own
    query gives them: iNaturalist counts leaf taxa, and a taxon's leaves are the same in a query over more taxa), then
    the distinct observers near Dauin of the species the checklist does not settle, then in the Philippines of those
    still not settled, counted together for the species with few observations (tools/inat.py observer_counts: their
    observations read in one search), one observers query each for the others."""
    api = "https://api.inaturalist.org/v1/observations"
    taxa = list(dict.fromkeys(taxa))

    def rows(where):
        out = []
        for B in inat.chunks(taxa, inat.BATCH):
            page = 1
            while True:
                d = get(f"{api}/species_counts?taxon_id={','.join(map(str, B))}&{where}&quality_grade=research{extra}&per_page=500"
                        + (f"&page={page}" if page > 1 else ""))
                out += d.get("results") or []
                if page * 500 >= (d.get("total_results") or 0) or not d.get("results"):
                    break
                page += 1
        return out

    want = set(taxa)

    def under(x):
        """The taxa asked that a row is below (one taxon asked: every row is)."""
        if len(taxa) == 1:
            return {taxa[0]}
        return {a for a in [*(x["taxon"].get("ancestor_ids") or []), x["taxon"]["id"]] if a in want}

    ph = [x for x in rows("place_id=6873") if x["taxon"].get("rank") == "species"]
    if not ph:
        return {t: {} for t in taxa}
    dn = {x["taxon"]["id"]: x["count"] for x in rows(NEAR_AREA)}
    lst = {x["taxon"]["id"]: listed(kind, [x["taxon"]["name"]]) for x in ph}
    near_q = f"quality_grade=research&{NEAR_AREA}{extra}"
    ph_q = f"quality_grade=research&place_id=6873{extra}"
    solo = lambda q: lambda t: get(f"{api}/observers?taxon_id={t}&{q}&per_page=1").get("total_results", 0)  # noqa: E731
    od = inat.observer_counts(get, {x["taxon"]["id"]: dn[x["taxon"]["id"]] for x in ph
                                    if dn.get(x["taxon"]["id"], 0) >= NEAR_OBSERVERS and not lst[x["taxon"]["id"]]}, near_q, solo(near_q))
    op = inat.observer_counts(get, {x["taxon"]["id"]: x["count"] for x in ph if x["count"] >= PH_OBSERVERS and not lst[x["taxon"]["id"]]
                                    and not near_dauin(od.get(x["taxon"]["id"], 0))}, ph_q, solo(ph_q))
    out = {t: {} for t in taxa}
    for x in ph:
        t, n, name = x["taxon"]["id"], x["count"], x["taxon"]["name"]
        for g in under(x):
            out[g][name] = {"id": t, "rg": n, "chk": lst[t], "by": ph_confirmed(n, op.get(t), lst[t], near_dauin(od.get(t, 0)))}
    return out


def confirmed_species(get, taxon_id, kind="coral", extra=""):
    """{species taxon id: (name, reasons)}: the species under an iNaturalist taxon that the rule confirms in the
    Philippines (species_presence)."""
    return {v["id"]: (k, v["by"]) for k, v in species_presence(get, taxon_id, kind, extra).items() if v["by"]}
