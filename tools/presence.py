"""The presence rule, defined once (Pierre, 2026-11-04, AGENTS.md rule 6g: "the same scientific rigour for everyone, me
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
ones do not confirm anything (his species-level photos stay usable as that species: rule 6a). Not used: the number of
identifiers and the date.
"""
import json
from pathlib import Path

from taxonomy import aliases  # the species rows of tools/taxonomy.json: former names, moves, spellings

NEAR_OBSERVERS = 2
PH_OBSERVERS = 3
CHECKLISTS = Path(__file__).resolve().parent / "presence_checklists.json"


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
    are absent (not confirmed). Three batched queries, plus an observers query for each species not already settled
    by the checklist or near Dauin. `get(url)` returns the parsed JSON (the caller paces and caches it: AGENTS.md rule
    6f). `extra`: more query parameters (e.g. "&captive=false")."""
    api = "https://api.inaturalist.org/v1/observations"
    ph = get(f"{api}/species_counts?taxon_id={taxon_id}&place_id=6873&quality_grade=research{extra}&per_page=500")["results"]
    ph = [x for x in ph if x["taxon"].get("rank") == "species"]
    if not ph:
        return {}
    dauin = get(f"{api}/species_counts?taxon_id={taxon_id}&lat=9.19&lng=123.26&radius=40&quality_grade=research{extra}&per_page=500")["results"]
    dn = {x["taxon"]["id"]: x["count"] for x in dauin}
    out = {}
    for x in ph:
        t, n, name = x["taxon"]["id"], x["count"], x["taxon"]["name"]
        lst = listed(kind, [name])
        od = 0
        if dn.get(t, 0) >= NEAR_OBSERVERS and not lst:
            od = get(f"{api}/observers?taxon_id={t}&quality_grade=research&lat=9.19&lng=123.26&radius=40{extra}&per_page=1").get("total_results", 0)
        near = near_dauin(od)
        op = None
        if n >= PH_OBSERVERS and not lst and not near:
            op = get(f"{api}/observers?taxon_id={t}&quality_grade=research&place_id=6873{extra}&per_page=1").get("total_results", 0)
        out[name] = {"id": t, "rg": n, "chk": lst, "by": ph_confirmed(n, op, lst, near)}
    return out


def confirmed_species(get, taxon_id, kind="coral", extra=""):
    """{species taxon id: (name, reasons)}: the species under an iNaturalist taxon that the rule confirms in the
    Philippines (species_presence)."""
    return {v["id"]: (k, v["by"]) for k, v in species_presence(get, taxon_id, kind, extra).items() if v["by"]}
