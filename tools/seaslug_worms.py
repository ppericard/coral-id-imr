#!/usr/bin/env python3
"""Builds tools/seaslug_worms.json: the sea slugs' reference taxonomy from WoRMS (World Register of Marine Species,
https://www.marinespecies.org/rest/), which tools/seaslug_game.py writes into seaslug.json `ref` (AphiaID -> {name, rank,
parent}), the tree the admin's Photos › Tree › WoRMS view draws (admin.js fuWormsOf), as tools/build_fish.py fills
fish.json `ref` for the fish (Pierre, 2026-11-13, Q340: views Key | WoRMS; 2026-11-17: "on garde WoRMS").

Inputs, in the repository: tools/seaslugs.json (every species' accepted AphiaID, worms.aphiaAcc, and its genus's name)
and tools/seaslug_groups.json (each family's AphiaID and its taxonomic group, the Learn page's headings).

Network (WoRMS only, public scientific names and AphiaIDs, nothing of the project's): through tools/inat.py's client, one
request a second to www.marinespecies.org (rule C7's pace, paced retries, the project's User-Agent), every reply cached
in tools/.cache/seaslug_worms.json (git-ignored), so a rerun is offline:
  - AphiaClassificationByAphiaID/<id> for every species of tools/seaslugs.json and every family of the groups file;
  - AphiaRecordsByName/<genus>?like=false&marine_only=false, then the accepted record's classification, only for a
    genus of tools/seaslugs.json no species' classification holds under that name (a genus the game names and WoRMS
    files its species elsewhere, or a synonym).

Output (one node a line): nodes {AphiaID: {name, rank, parent}}, every node of those classifications from the class
down (Gastropoda, as tools/build_fish.py keeps the fish's from their class), parent null at the root; genera
{genus name: AphiaID of the WoRMS genus of that name, accepted, or of the accepted genus it is a synonym of}. A species,
a genus or a group's family missing from nodes, a node whose parent is not in it, or a parent of a rank not above its
child's fails the build, naming it.

--report prints where the game's grouping and WoRMS disagree today (rule C5: listed, never settled here): a group's
family that WoRMS does not place under the group's taxon, a species WoRMS files under another genus or family than the
game's, a game genus that is not an accepted WoRMS name.

Usage: python3 tools/seaslug_worms.py [--refresh] [--dry]   fetch what the cache lacks (--refresh: ask again), write
       python3 tools/seaslug_worms.py --check                offline: the committed file is well formed and covers
                                                              tools/seaslugs.json; when the cache is here, the file is
                                                              also what the cache gives (CI has no cache: shape only)
       python3 tools/seaslug_worms.py --report               offline, from the committed file: the disagreements
Tests: node --test tests/seaslug-worms.test.js.
"""
import argparse
import datetime
import json
import sys
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import inat  # noqa: E402  the paced, retried client (rule C7)

LIST = ROOT / "tools" / "seaslugs.json"
GROUPS = ROOT / "tools" / "seaslug_groups.json"
OUT = ROOT / "tools" / "seaslug_worms.json"
CACHE = ROOT / "tools" / ".cache" / "seaslug_worms.json"
WORMS = "https://www.marinespecies.org/rest/"
HOST = "www.marinespecies.org"
# WoRMS's ranks from the class down, in order: a parent's rank comes before its child's.
RANKS = ("Class", "Subclass", "Infraclass", "Subterclass", "Superorder", "Order", "Suborder", "Infraorder", "Parvorder",
         "Superfamily", "Epifamily", "Family", "Subfamily", "Tribe", "Subtribe", "Genus", "Subgenus", "Species",
         "Subspecies")
DOC = ("The sea slugs' reference taxonomy from WoRMS (AphiaClassificationByAphiaID; tools/seaslug_worms.py, never "
       "hand-edited): nodes {AphiaID: {name, rank, parent}} from the class down, genera {genus name: WoRMS genus AphiaID}. "
       "tools/seaslug_game.py writes the game's part into seaslug.json ref (the admin's Photos › Tree › WoRMS view).")
CITE = "WoRMS Editorial Board, World Register of Marine Species, https://www.marinespecies.org (REST web services)"


class Net:
    """GET JSON with a cache ({url: reply}); None for WoRMS's 204 (nothing matches). Offline: a URL not cached fails."""

    def __init__(self, offline=False, refresh=False, client=None):
        self.offline, self.refresh, self.new, self.asked = offline, refresh, 0, set()
        self.c = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
        self.client = client or inat.Client(pace={**inat.PACE, HOST: 1.0})  # about one request a second (rule C7)

    def get(self, url):
        if url in self.c and not (self.refresh and url not in self.asked):
            return self.c[url]
        if self.offline:
            raise SystemExit(f"seaslug_worms: offline, not cached: {url}")
        v = self.client.get(url, missing=True)
        self.c[url], self.new = v, self.new + 1
        self.asked.add(url)
        if self.new % 40 == 0:
            self.save()
        return v

    def save(self):
        if not self.new:
            return
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        tmp = CACHE.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.c, sort_keys=True, separators=(",", ":")), encoding="utf-8")
        tmp.replace(CACHE)


def chain(reply):
    """[(AphiaID, name, rank)] of a classification reply, from its class down to the taxon ([] for none)."""
    out, node = [], reply
    while node:
        out.append((node["AphiaID"], node["scientificname"], node["rank"]))
        node = node.get("child")
    cls = [i for i, x in enumerate(out) if x[2] == "Class"]
    return out[cls[-1]:] if cls else []


def add(nodes, ch):
    parent = None
    for aid, name, rank in ch:
        nodes.setdefault(str(aid), {"name": name, "rank": rank, "parent": parent})
        parent = aid


def build(L, G, net):
    """(tools/seaslug_worms.json, the genera WoRMS has no genus of that name for) from the list L and the groups G."""
    nodes, cls = {}, lambda aid: chain(net.get(f"{WORMS}AphiaClassificationByAphiaID/{aid}"))
    for s in L["species"]:
        aid = (s.get("worms") or {}).get("aphiaAcc")
        if aid:
            add(nodes, cls(aid))
    for aid in (G.get("aphia") or {}).values():
        add(nodes, cls(aid))
    genera, none = {}, []
    for g in sorted({s["genus"] for s in L["species"]}):
        hit = [int(a) for a, n in nodes.items() if n["rank"] == "Genus" and n["name"] == g]
        if len(hit) == 1:
            genera[g] = hit[0]
            continue
        recs = [r for r in net.get(f"{WORMS}AphiaRecordsByName/{urllib.parse.quote(g)}?like=false&marine_only=false") or []
                if r.get("phylum") == "Mollusca" and r.get("rank") == "Genus"]
        acc = sorted({r.get("valid_AphiaID") or r["AphiaID"] for r in recs})
        if len(acc) != 1:
            none.append(g)
            continue
        add(nodes, cls(acc[0]))
        genera[g] = acc[0]
    order = sorted(nodes, key=int)
    return {"_doc": DOC, "cite": CITE, "read": None, "genera": genera, "nodes": {k: nodes[k] for k in order}}, none


def problems(W, L=None, G=None):
    """What is wrong with the file W (its shape), and what of the list L and the groups G it does not cover."""
    N, out = W.get("nodes") or {}, []
    for k, n in N.items():
        p = n.get("parent")
        if n.get("rank") not in RANKS:
            out.append(f"{k} {n.get('name')}: rank {n.get('rank')!r} not known")
        if p is None:
            if n.get("rank") != "Class":
                out.append(f"{k} {n.get('name')}: a root that is not a class")
            continue
        if str(p) not in N:
            out.append(f"{k} {n.get('name')}: parent {p} not in nodes")
        elif N[str(p)].get("rank") in RANKS and n.get("rank") in RANKS and \
                RANKS.index(N[str(p)]["rank"]) >= RANKS.index(n["rank"]):
            out.append(f"{k} {n['name']}: its parent {N[str(p)]['name']} is a {N[str(p)]['rank']}, not above a {n['rank']}")
    seen = {}
    for k in N:  # a cycle never reaches a root
        path, x = [], k
        while x is not None and x not in seen and str(x) in N and x not in path:
            path.append(x)
            x = N[str(x)]["parent"]
            x = None if x is None else str(x)
        if x is not None and x in path:
            out.append(f"{k}: a cycle")
        for y in path:
            seen[y] = True
    for s in (L or {}).get("species") or []:
        aid = (s.get("worms") or {}).get("aphiaAcc")
        if aid and str(aid) not in N:
            out.append(f"species {s['name']}: AphiaID {aid} not in nodes (run python3 tools/seaslug_worms.py)")
    for g in sorted({s["genus"] for s in (L or {}).get("species") or []}):
        if str((W.get("genera") or {}).get(g)) not in N:
            out.append(f"genus {g}: no WoRMS genus in genera")
    for f, aid in ((G or {}).get("aphia") or {}).items():
        if str(aid) not in N:
            out.append(f"family {f}: AphiaID {aid} not in nodes")
    return out


def up(N, k):
    """k and its ancestors, k first."""
    out, x = [], k
    while x is not None and str(x) in N:
        out.append(str(x))
        x = N[str(x)]["parent"]
    return out


def disagreements(W, L, G, circles=None):
    """Where the game's grouping and WoRMS disagree today (lines of text): a group's family that WoRMS places under none of
    the taxa its title names, a species of the game (circles; all when None) WoRMS files under another genus or family
    than the game's, a game genus WoRMS accepts under another name."""
    N, out = W["nodes"], []
    names = {}
    for k, n in N.items():
        names.setdefault(n["name"], []).append(k)
    for g in G["groups"]:
        want = [t.strip() for t in g["title"].split("·")]
        for f in g["families"]:
            A = {N[x]["name"] for x in up(N, G["aphia"][f])}
            miss = [t for t in want if t not in A]
            if miss:
                line = [N[x]["name"] + " (" + N[x]["rank"].lower() + ")" for x in up(N, G["aphia"][f])][1:]
                out.append(f"family {f}, group “{g['title']}”: WoRMS places it under {' › '.join(reversed(line))}, "
                           f"not under {', '.join(miss)}")
    for s in L["species"]:
        if circles is not None and s.get("circle") not in circles:
            continue
        aid = (s.get("worms") or {}).get("aphiaAcc")
        if not aid:
            continue
        A = {N[x]["rank"]: N[x]["name"] for x in up(N, aid)}
        if A.get("Genus") != s["genus"]:
            out.append(f"species {s['name']} (game genus {s['genus']}): WoRMS accepts it as {N[str(aid)]['name']}, genus "
                       f"{A.get('Genus')}")
        if A.get("Family") != s["family"]:
            out.append(f"species {s['name']} (game family {s['family']}): WoRMS family {A.get('Family')}")
    for g, aid in sorted((W.get("genera") or {}).items()):
        if circles is not None and not any(s["genus"] == g and s.get("circle") in circles for s in L["species"]):
            continue
        if N[str(aid)]["name"] != g:
            out.append(f"genus {g}: WoRMS accepts it as {N[str(aid)]['name']} ({aid})")
    return out


def dump(W):
    j = lambda x: json.dumps(x, ensure_ascii=False, separators=(",", ":"))
    head = ",\n".join(f"{j(k)}:{j(W[k])}" for k in ("_doc", "cite", "read", "genera"))
    return "{" + head + ',\n"nodes":{\n' + ",\n".join(f"{j(k)}:{j(n)}" for k, n in W["nodes"].items()) + "}}\n"


def load(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--report", action="store_true")
    ap.add_argument("--refresh", action="store_true")
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()
    L, G = load(LIST), load(GROUPS)
    if a.check or a.report:
        if not OUT.exists():
            sys.exit("seaslug_worms: tools/seaslug_worms.json missing (run python3 tools/seaslug_worms.py)")
        W = load(OUT)
        if a.report:
            import seaslug_game
            for line in disagreements(W, L, G, set(seaslug_game.CIRCLES)):
                print(line)
            return
        bad = problems(W, L, G)
        if not bad and CACHE.exists():
            try:
                fresh, none = build(L, G, Net(offline=True))
            except SystemExit as e:
                bad.append(f"the cache lacks a reply ({e}): run python3 tools/seaslug_worms.py")
            else:
                if dump({**fresh, "read": W.get("read")}) != OUT.read_text(encoding="utf-8"):
                    bad.append("tools/seaslug_worms.json is not what the cache gives: run python3 tools/seaslug_worms.py")
        if bad:
            print("seaslug_worms:\n  " + "\n  ".join(bad[:30]), file=sys.stderr)
            sys.exit(1)
        W = load(OUT)
        print(f"seaslug_worms: ok, {len(W['nodes'])} nodes, {len(W['genera'])} genera"
              + ("" if CACHE.exists() else " (no cache: shape and coverage only)"))
        return
    net = Net(refresh=a.refresh)
    try:
        W, none = build(L, G, net)
    finally:
        net.save()
    old = load(OUT) if OUT.exists() else {}
    same = old and {k: old.get(k) for k in ("genera", "nodes")} == {k: W[k] for k in ("genera", "nodes")}
    W["read"] = old.get("read") if same else datetime.date.today().isoformat()
    bad = problems(W, L, G) + [f"genus {g}: no single WoRMS genus of that name in Mollusca" for g in none]
    if bad:
        sys.exit("seaslug_worms:\n  " + "\n  ".join(bad))
    print(f"seaslug_worms: {len(W['nodes'])} nodes, {len(W['genera'])} genera; {net.new} new WoRMS requests")
    if not a.dry:
        OUT.write_text(dump(W), encoding="utf-8")
        print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
