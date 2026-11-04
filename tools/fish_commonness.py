#!/usr/bin/env python3
"""The commonness index of the fish species: how often each species of a teaching entry is met around Dauin, used to
order an entry's species (common first) in fish.json (Pierre, 2026-11-04: "common beats easy" to start; real answers
adjust difficulty later). Method, weights and sources: docs/FISH_PATH.md "Species order: the commonness index".

Three signals per species, each scaled to 0-1 within its teaching entry (only the order inside an entry matters):
- field (weight 3): standardised field counts near Dauin, the sources of tools/fish_commonness.json `field` (CCEF
  Siquijor 2025 presence per MPA; Dauin stereo-video counts 2019-20, Ferrandis 2021). A source with `absent: 0`
  (it recorded every species it met) gives 0 to a species of an entry it covers but did not record; a partial list
  (`absent: null`) only scores the species it lists, and only in an entry where it lists 2 or more. A presence
  source scores k / (the entry's best k); a count source scores on the log scale below. Field = their mean.
- IMR 24 (weight 2): the PDF cheatsheet's 24 most sighted (fish.json `cs`): 1.0 for rank 1 down to 0.904 for rank 24.
- iNaturalist (weight 1): distinct observers (Research Grade + Needs ID, wild) within 40 km of Dauin, 250 km, and in
  the Philippines (tools/fish_commonness_inat.json), shrunk from the outside in with M pseudo-observers at each step:
  share_ph = (o_ph + M / n) / (N_ph + M) (the entry's mean as the prior), share_250 = (o_250 + M share_ph) / (N_250 + M),
  share_40 = (o_40 + M share_250) / (N_40 + M), N = the ring's total over the entry's n species. Scored on the log
  scale: 1 + log10(share / the entry's top share) / DECADES, floored at 0 (equal to the top: 1; 10x fewer: 0.5).
Index = weighted mean of the signals present (an entry no field source covers uses IMR and iNat only). Order inside an
entry: index, then the iNaturalist share, then fish.json `r`. fish.json species `cmi` = the index, 3 decimals.

Usage: python3 tools/fish_commonness.py [ENTRY...]   offline: per species of each teaching entry (all when none named:
                                                       t01 or a name), the raw value of every source and the index
       python3 tools/fish_commonness.py --fetch [--refresh]   asks iNaturalist (about 1 request a second; replies cached in
                                                       tools/.cache/fish_commonness.json, git-ignored) and rewrites
                                                       tools/fish_commonness_inat.json; then python3 tools/build_fish.py --commonness
Requests: per entry and ring ONE /v1/observations/species_counts with every species of the entry; distinct observers
(/v1/observations/observers, per_page=1) only for a species with 2+ observations in that ring (0 or 1 observation
gives 0 or 1 observer). Applied to fish.json by tools/build_fish.py (`apply()`: the full build, --near, --commonness).
"""
import argparse
import json
import math
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INPUTS = ROOT / "tools" / "fish_commonness.json"
INAT_FILE = ROOT / "tools" / "fish_commonness_inat.json"
CACHE = ROOT / "tools" / ".cache" / "fish_commonness.json"
API = "https://api.inaturalist.org/v1/"
UA = {"User-Agent": "coral-id-imr/1.0 (fish commonness)", "Accept": "application/json"}
RINGS = {"d40": "lat=9.19&lng=123.26&radius=40", "r250": "lat=9.19&lng=123.26&radius=250", "ph": "place_id=6873"}
FILTERS = "quality_grade=research,needs_id&captive=false"


def key(name):
    """Genus + epithet with its Latin ending dropped (vroliki / vrolikii, bilineata / bilineatus)."""
    g, _, e = name.strip().partition(" ")
    e = e.split(" ")[0].lower()
    for suf in ("ii", "i", "us", "um", "a", "is", "e"):
        if e.endswith(suf) and len(e) > len(suf) + 3:
            e = e[: -len(suf)]
            break
    return g.lower() + " " + e


class Names:
    """A field source's names -> fish.json species: the PDF name and the WoRMS accepted name first; a WoRMS synonym
    only when no species has it as one of those (WoRMS lists Chaetodon lunulatus as a synonym of C. lunula)."""

    def __init__(self, fish):
        self.ref = fish.get("ref", {})
        self.primary = {}
        for s in fish["species"]:
            for k in self.prim(s):
                self.primary.setdefault(k, s["id"])

    @staticmethod
    def prim(s):
        return {key(n) for n in (s["name"], s.get("now")) if n}

    def find(self, s, table):
        """table: {key: value} -> the value for species s, or None."""
        for k in self.prim(s):
            if k in table:
                return table[k]
        syn = {key(n) for n in self.ref.get(str(s.get("ref")), {}).get("syn", []) if " " in n}
        for k in syn - self.prim(s):
            if k in table and self.primary.get(k, s["id"]) == s["id"]:
                return table[k]
        return None


def load():
    return (json.loads(INPUTS.read_text(encoding="utf-8")),
            json.loads(INAT_FILE.read_text(encoding="utf-8")) if INAT_FILE.exists() else {"species": {}})


def rel(v, top, decades):
    """Log scale relative to the entry's top: equal -> 1, 10x fewer -> 1 - 1/decades, 10^decades fewer or none -> 0."""
    return 0.0 if v <= 0 or top <= 0 else max(0.0, 1.0 + math.log10(v / top) / decades)


def entry_index(t, S, inputs, inat, names):
    """[(species id, index, raw)] of one teaching entry, in its new order (index, iNat share, r)."""
    P = inputs["params"]
    W, M, D = P["weights"], P["M"], P["decades"]
    sp = [S[i] for i in t["species"]]
    n = len(sp)
    obs = [inat["species"].get(s["id"]) for s in sp]
    o = {r: [(x[1 + k] if x else 0) for x in obs] for k, r in enumerate(RINGS)}
    share = [1.0 / n] * n
    for r in ("ph", "r250", "d40"):  # the entry's mean -> Philippines -> 250 km -> 40 km
        N = sum(o[r])
        share = [(o[r][k] + M * share[k]) / (N + M) for k in range(n)]
    tot = sum(share)
    share = [x / tot for x in share]
    top = max(share)
    field = [[] for _ in sp]
    raw = [{"inat": [o[r][k] for r in RINGS] if obs[k] else None} for k in range(n)]
    for fid, f in inputs["field"].items():
        if not f.get("use", True):
            continue
        table = {key(nm): v for nm, v in f["values"].items()}
        got = [names.find(s, table) for s in sp]
        listed = [v for v in got if v is not None]
        if f["absent"] == 0:
            if not listed:
                continue
        elif len(listed) < 2:
            continue
        best = max(listed)
        for k, v in enumerate(got):
            if v is not None:
                raw[k][fid] = v
            if v is None and f["absent"] != 0:
                continue
            v = v or 0
            field[k].append(v / best if f["kind"] == "presence" and best else rel(v, best, D) if f["kind"] == "count" else 0.0)
    out = []
    for k, s in enumerate(sp):
        sig = {"inat": rel(share[k], top, D), "imr": (1.0 - (s["cs"] - 1) / 24 * 0.1) if s.get("cs") else 0.0}
        if field[k]:
            sig["field"] = sum(field[k]) / len(field[k])
        idx = sum(W[a] * v for a, v in sig.items()) / sum(W[a] for a in sig)
        raw[k]["share40"] = round(share[k], 5)
        out.append((s["id"], idx, share[k], s["r"], {"signals": {a: round(v, 3) for a, v in sig.items()}, **raw[k]}))
    out.sort(key=lambda x: (-round(x[1], 6), -x[2], x[3]))
    return [(i, idx, raw) for i, idx, _, _, raw in out]


def compute(fish, inputs=None, inat=None):
    """{teaching id: [(species id, index, raw)]} for every teaching node, in the new order."""
    if inputs is None:
        inputs, inat = load()
    S = {s["id"]: s for s in fish["species"]}
    names = Names(fish)
    return {t["id"]: entry_index(t, S, inputs, inat, names) for t in fish["teach"] if t.get("species")}


def insert_after(o, after, k, v):
    items = [(a, b) for a, b in o.items() if a != k]
    at = next((i + 1 for i, (a, _) in enumerate(items) if a == after), len(items))
    items.insert(at, (k, v))
    o.clear()
    o.update(items)


def apply(fish, inputs=None, inat=None):
    """Writes species `cmi` (the index, 3 decimals) and orders every teaching node's species (and its sub-entries') by
    the index, in place. Returns the species of the teaching nodes that have no iNaturalist counts yet (run --fetch)."""
    if inputs is None:
        inputs, inat = load()
    S = {s["id"]: s for s in fish["species"]}
    res = compute(fish, inputs, inat)
    for s in fish["species"]:
        s.pop("cmi", None)
    missing = []
    for t in fish["teach"]:
        if t["id"] not in res:
            continue
        order = [i for i, _, _ in res[t["id"]]]
        t["species"] = order
        for u in t.get("sub", []):
            mine = set(u.get("species", []))
            u["species"] = [i for i in order if i in mine]
        for i, idx, _ in res[t["id"]]:
            insert_after(S[i], "r", "cmi", round(idx, 3))
            if i not in inat["species"]:
                missing.append(f"{i} {S[i]['name']}")
    return missing


# ---- iNaturalist (--fetch)
class Net:
    def __init__(self, refresh=False):
        self.refresh, self.asked, self.last = refresh, set(), 0.0
        self.c = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}

    def get(self, url):
        if url in self.c and not (self.refresh and url not in self.asked):
            return self.c[url]
        for k in range(6):
            time.sleep(max(0.0, 1.0 - (time.time() - self.last)))
            self.last = time.time()
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                    v = json.loads(r.read())
                break
            except Exception as e:  # noqa: BLE001  (429 throttling, network, timeout: retried after a pause)
                print(f"  retry {url[:100]} ({e})", file=sys.stderr)
                time.sleep(5 * (k + 1))
        else:
            raise RuntimeError(f"failed: {url}")
        self.c[url] = v
        self.asked.add(url)
        if len(self.asked) % 40 == 0:
            self.save()
        return v

    def save(self):
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        tmp = CACHE.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.c, sort_keys=True, separators=(",", ":")), encoding="utf-8")
        tmp.replace(CACHE)


def fetch(fish, net):
    """{species id: [inat id, observers 40 km, 250 km, Philippines]} for every species of a teaching node."""
    S = {s["id"]: s for s in fish["species"]}
    out = {}
    for t in fish["teach"]:
        sp = [S[i] for i in t.get("species", []) if S[i].get("inat")]
        if not sp:
            continue
        by = {s["inat"]: s["id"] for s in sp}
        ids = ",".join(str(x) for x in sorted(by))
        nobs = {s["id"]: {} for s in sp}
        for ring, where in RINGS.items():
            page = 1
            while True:
                res = NET.get(f"{API}observations/species_counts?taxon_id={ids}&{where}&{FILTERS}&per_page=500&page={page}")
                for r in res["results"]:
                    tx = r["taxon"]
                    anc = (tx.get("ancestor_ids") or []) + [tx["id"]]
                    sid = next((by[a] for a in reversed(anc) if a in by), None)
                    if sid:
                        nobs[sid][ring] = nobs[sid].get(ring, 0) + r["count"]
                if page * 500 >= res["total_results"]:
                    break
                page += 1
        for s in sp:
            row = [s["inat"]]
            for ring, where in RINGS.items():
                c = nobs[s["id"]].get(ring, 0)
                row.append(c if c < 2 else NET.get(f"{API}observations/observers?taxon_id={s['inat']}&{where}&{FILTERS}&per_page=1")["total_results"])
            out[s["id"]] = row
        print(f"  {t['id']} {t['name']}: {len(sp)} species", file=sys.stderr)
    return out


def write_inat(rows):
    doc = ("Distinct iNaturalist observers per species (Research Grade + Needs ID, captive=false), written by "
           "tools/fish_commonness.py --fetch: [iNaturalist taxon id, within 40 km of Dauin (9.19, 123.26), within 250 km, "
           "the Philippines (place 6873)]. Counts are facts from the iNaturalist API (api.inaturalist.org), no photo or text.")
    lines = ["{", f'"_doc":{json.dumps(doc)},', f'"fetched":"{time.strftime("%Y-%m-%d")}",',
             f'"rings":{json.dumps(RINGS)},', f'"filters":"{FILTERS}",', '"species":{']
    lines.append(",\n".join(f'"{i}":{json.dumps(rows[i], separators=(",", ":"))}' for i in sorted(rows)))
    lines += ["}", "}"]
    INAT_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")


NET = None


def main():
    global NET
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--fetch", action="store_true", help="ask iNaturalist and rewrite tools/fish_commonness_inat.json")
    ap.add_argument("--refresh", action="store_true", help="with --fetch: ask again instead of using the cache")
    ap.add_argument("entries", nargs="*", help="teaching ids or names to show (all when none)")
    a = ap.parse_args()
    fish = json.loads((ROOT / "fish.json").read_text(encoding="utf-8"))
    if a.fetch:
        NET = Net(a.refresh)
        try:
            rows = fetch(fish, NET)
        finally:
            NET.save()
        write_inat(rows)
        print(f"wrote {INAT_FILE.relative_to(ROOT)}: {len(rows)} species; now run python3 tools/build_fish.py --commonness")
        return
    S = {s["id"]: s for s in fish["species"]}
    want = {x.lower() for x in a.entries}
    for t in fish["teach"]:
        if want and t["id"].lower() not in want and t["name"].lower() not in want:
            continue
        print(f"{t['id']} {t['name']} ({len(t.get('species', []))} species)")
        for k, (i, idx, raw) in enumerate(compute({**fish, "teach": [t]}).get(t["id"], []), 1):
            s = S[i]
            src = " ".join(f"{f}={v}" for f, v in raw.items() if f not in ("signals", "inat", "share40"))
            print(f"  {k:2} {idx:.3f} {s['name']:<32} IMR {s.get('cs') or '-':>2}  iNat 40/250/PH {raw['inat']}  {src}")


if __name__ == "__main__":
    main()
