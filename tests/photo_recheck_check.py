"""Cases of tests/photo_recheck.test.js, offline: a made-up repository of game photos and made-up iNaturalist replies
(tools/photo_recheck.py), never the network (inat.get is replaced by a stub that fails the case if asked outside the
network case). Prints one JSON object. Usage: photo_recheck_check.py CASE (reasons | predicates | network | readonly)."""
import hashlib
import json
import os
import re
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import fetch_fish as ff  # noqa: E402
import fetch_local as fl  # noqa: E402
import fetch_seaslugs as fs  # noqa: E402
import fish_refs as fr  # noqa: E402
import inat  # noqa: E402
import photo_recheck as pr  # noqa: E402

PH = "https://inaturalist-open-data.s3.amazonaws.com/photos/%s/square.jpg"


def taxon(i, name, rank, anc=(1, 2)):
    return {"id": i, "name": name, "rank": rank, "ancestor_ids": [*anc, i], "min_species_taxon_id": i}


def obs(i, tx, grade="research", user="u1", **more):
    o = {"id": i, "quality_grade": grade, "captive": False, "user": {"login": user}, "taxon": tx, "location": "9.19,123.26",
         "place_ids": [6873], "annotations": [], "photos": [{"id": i * 10, "url": PH % (i * 10), "license_code": "cc-by"}],
         "identifications": [], "community_taxon_id": None, "identifications_most_agree": False}
    o.update(more)
    return o


def ident(user, tx, current=True):
    return {"current": current, "user": {"login": user}, "taxon": {k: tx[k] for k in ("id", "name", "rank", "ancestor_ids")}}


def rec(f, o, **more):
    return {"f": f, "o": f"https://www.inaturalist.org/observations/{o}", "t": more.pop("t", ""), "loc": "ph", **more}


def obs_of(r):
    return int(r["o"].rsplit("/", 1)[-1]) if str(r.get("o", "")).rsplit("/", 1)[-1].isdigit() else None


def world():
    """(files of the repository, {subject: {observation id: reply or None}}, expected {photo: [reasons]})."""
    import taxonomy
    acro, pav = taxonomy.inat_taxon("Acropora", "coral"), taxonomy.inat_taxon("Pavona", "coral")
    A, A1 = taxon(acro, "Acropora", "genus", (48460, 47534)), taxon(acro + 1, "Acropora florida", "species", (48460, 47534, acro))
    P = taxon(pav, "Pavona", "genus", (48460, 47534))
    # corals
    cviews = [rec("acropora-wide-1", 101, t="Acropora florida"), rec("acropora-wide-2", 102, t="Acropora"),
              rec("acropora-wide-3", 103, t="Acropora"), rec("acropora-wide-4", 104, t="Acropora"),
              rec("acropora-wide-5", 105, t="Acropora"), rec("acropora-wide-6", 106, t="Acropora"),
              rec("acropora-wide-7", 107, t="Acropora", loc="world"), rec("acropora-wide-8", 108, t="Acropora", skel=1),
              rec("acropora-wide-9", 109, t="Acropora"), rec("acropora-wide-10", 110, t="Acropora"),
              {"f": "lecture-1", "t": "Acropora"}]  # a lecture photo: no observation
    C = {
        101: obs(101, A1),  # Research Grade, species of the genus: passes
        102: obs(102, A, "needs_id", community_taxon_id=acro, identifications_most_agree=True),  # genus-level community ID
        103: obs(103, A, "needs_id", user="obs", identifications=[ident("obs", A)]),  # only the observer: ID lost
        104: obs(104, P),  # Research Grade, now another genus
        105: None,  # gone
        106: obs(106, A, "casual"),
        107: obs(107, A, "needs_id", community_taxon_id=acro, identifications_most_agree=True),  # abroad: Research Grade only
        108: obs(108, P),  # a skeleton: not in play, never asked
        109: obs(109, taxon(48460, "Scleractinia", "order", (1,)), "needs_id"),  # coarser than the genus
        110: obs(110, A1, photos=[{"id": 9999}]),  # the observation no longer holds the photo
    }
    del C[108]
    # fish
    S1, S2, G1 = taxon(1001, "Fishus unus", "species"), taxon(1002, "Fishus duo", "species"), taxon(1000, "Fishus", "genus")
    fish = [rec("fish-s001-cand-1", 201, t="Fishus unus", sp="s001"),  # passes
            rec("fish-s001-cand-2", 202, t="Fishus unus", sp="s001", own=True),  # Pierre's own, Needs ID: passes
            rec("fish-s001-cand-3", 203, t="Fishus unus", sp="s001"),  # Needs ID, not his: ID lost
            rec("fish-s001-cand-4", 204, t="Fishus unus", sp="s001"),  # Research Grade, now another species
            rec("fish-s001-cand-5", 205, t="Fishus unus", sp="s001"),  # gone
            rec("fish-s001-cand-6", 206, t="Fishus unus", sp="s001", own=True),  # his, casual
            rec("fish-s001-cand-7", 207, t="Fishus unus", sp="s001"),  # annotated Dead
            rec("fish-s001-cand-8", 208, t="Fishus unus", sp="s001"),  # now only the genus
            rec("fish-s001-cand-9", 209, t="Fishus unus", sp="s001"),  # excluded by curation: never asked
            rec("fish-s001-cand-10", 210, t="Fishus unus", sp="s001"),  # captive
            rec("fish-s001-cand-11", 211, t="Fishus unus", sp="s001"),  # all rights reserved now: the rule's other checks
            rec("fi3010", 301, t="Fishus unus", sp="s001", **{"from": "taxon"}),  # a reference photo: passes
            rec("fi3020", 302, t="Fishus unus", sp="s001", **{"from": "taxon"}),  # a reference photo, Needs ID now
            rec("fi3030", 303, t="Fishus unus", sp="s001", **{"from": "cover"}),  # a reference photo, another species
            rec("fish-s001-cand-12", 212, t="Fishus unus", sp="s001"),  # its licence closed, a sibling's still open
            rec("fish-s001-cand-13", 213, t="Fishus unus", sp="s001"),  # taken off its observation, a sibling stays
            rec("fi3040", 304, t="Fishus unus", sp="s001", **{"from": "taxon"}),  # a reference photo taken off its observation
            {"f": "fbAcnig_u0", "o": "https://www.fishbase.se/photos/PicturesSummary.php?ID=1", "t": "Fishus unus", "sp": "s001"}]
    F = {
        201: obs(201, S1), 202: obs(202, S1, "needs_id", user="ppericard"), 203: obs(203, S1, "needs_id"), 204: obs(204, S2),
        205: None, 206: obs(206, S1, "casual", user="ppericard"), 207: obs(207, S1, annotations=[
            {"controlled_attribute_id": 17, "controlled_value_id": 19, "vote_score": 1}]), 208: obs(208, G1, "needs_id"),
        210: obs(210, S1, captive=True),
        211: obs(211, S1, photos=[{"id": 11, "url": PH % 11, "license_code": None}]),
        212: obs(212, S1, photos=[{"id": 12, "url": PH % 12, "license_code": None}, {"id": 9999, "url": PH % 9999, "license_code": "cc-by"}]),
        213: obs(213, S1, photos=[{"id": 9999, "url": PH % 9999, "license_code": "cc-by"}]),
        301: obs(301, S1), 302: obs(302, S1, "needs_id"), 303: obs(303, S2), 304: obs(304, S1, photos=[{"id": 1, "url": PH % 1}]),
    }
    # sea slugs (the tools' own seaslugs.json / seaslug_informal.json are read)
    inf = json.loads((ROOT / "tools" / "seaslug_informal.json").read_text())["species"][0]
    N1, N2 = taxon(5001, "Nudi unus", "species"), taxon(5002, "Nudi duo", "species")
    NG = taxon(5000, "Nudi", "genus")
    NGS = taxon(5003, "Nudi tres", "species", (1, 2, 5000))
    GO = taxon(9000, inf["genus"], "genus")
    egg = json.loads((ROOT / "tools" / "seaslugs.json").read_text())["photoTarget"]["exclude"]["annotations"][0]
    slug = [rec("seaslug-5001-cand-1", 401, t="Nudi unus", sp="s5001"),  # passes
            rec("seaslug-5001-cand-2", 402, t="Nudi unus", sp="s5001"),  # now another species
            rec("seaslug-5001-cand-3", 403, t="Nudi unus", sp="s5001"),  # now an egg mass
            rec("seaslug-Nudi-cand-4", 404, t="Nudi", sp="g:Nudi", gl=1),  # genus-level, agreed: passes
            rec("seaslug-Nudi-cand-5", 405, t="Nudi", sp="g:Nudi", gl=1),  # refined to a species of the genus: passes
            rec("seaslug-Nudi-cand-6", 406, t="Nudi", sp="g:Nudi", gl=1),  # one identifier only: ID lost
            rec("seaslug-Nudi-cand-7", 407, t="Nudi", sp="g:Nudi", gl=1),  # now another genus's species
            rec("seaslug-" + inf["key"] + "-cand-8", 408, t=inf["genus"], sp="x:" + inf["key"]),  # label still there: passes
            rec("seaslug-" + inf["key"] + "-cand-9", 409, t=inf["genus"], sp="x:" + inf["key"]),  # label withdrawn
            rec("seaslug-Nudi-cand-10", 410, t="Nudi", sp="g:Nudi", gl=1),  # refined to a species, Needs ID: the genus still agreed
            rec("seaslug-5001-cand-11", 411, t="Nudi unus", sp="s5001")]  # taken off its observation, a sibling stays
    ag = lambda t: [ident("a", t), ident("b", t)]  # noqa: E731
    N = {
        401: obs(401, N1), 402: obs(402, N2),
        403: obs(403, N1, annotations=[{"controlled_attribute_id": egg[0], "controlled_value_id": egg[1], "vote_score": 1}]),
        404: obs(404, NG, "needs_id", identifications=ag(NG)),
        405: obs(405, NGS, "research", identifications=ag(NGS)),
        406: obs(406, NG, "needs_id", identifications=[ident("a", NG)]),
        407: obs(407, taxon(7001, "Other thing", "species", (1, 2, 7000))),
        408: obs(408, GO, "needs_id", identifications=ag(GO), ofvs=[{"field_id": inf["field"]["id"], "name": inf["field"]["name"], "value": "Yes"}]),
        409: obs(409, GO, "needs_id", identifications=ag(GO), ofvs=[]),
        410: obs(410, NGS, "needs_id", identifications=[ident("a", NG), ident("b", NG), ident("c", NGS)]),
        411: obs(411, N1, photos=[{"id": 9999, "url": PH % 9999, "license_code": "cc-by"}]),
    }
    for subject, records in (("coral", cviews), ("fish", fish), ("seaslug", slug)):  # each default photo is the record's own
        for r in records:
            o = {"coral": C, "fish": F, "seaslug": N}[subject].get(obs_of(r))
            if o and len(o["photos"]) == 1 and o["photos"][0]["id"] == o["id"] * 10 and not re.match(r"fi\d", r["f"]):
                o["photos"][0].update(id=int(re.search(r"(\d+)$", r["f"]).group(1)), url=PH % re.search(r"(\d+)$", r["f"]).group(1))
    files = {
        "data.json": {"gen": {"Acropora": {"views": {"wide": cviews}}}, "x": {"gen": {}}, "cand": {}},
        "curation.json": {"fish": {"exclude": {"fish-s001-cand-9": "excluded"}}, "seaslug": {}},
        "fish.json": {"species": [{"id": "s001", "inat": 1001}, {"id": "s002", "inat": 1002}]},
        "fish-game.json": {"photos": {"t01": fish}},
        "seaslug-game.json": {"photos": {"f:Nudi": slug}},
    }
    replies = {"coral": C, "fish": F, "seaslug": N}
    want = {
        "acropora-wide-3": ["id_lost"], "acropora-wide-4": ["other_taxon"], "acropora-wide-5": ["deleted"],
        "acropora-wide-6": ["casual"], "acropora-wide-7": ["id_lost"], "acropora-wide-9": ["id_lost"],
        "fish-s001-cand-3": ["id_lost"], "fish-s001-cand-4": ["other_taxon"], "fish-s001-cand-5": ["deleted"],
        "fish-s001-cand-6": ["casual"], "fish-s001-cand-7": ["dead"], "fish-s001-cand-8": ["id_lost"],
        "fish-s001-cand-10": ["captive"], "fish-s001-cand-11": ["rule"], "fish-s001-cand-12": ["rule"],
        "fish-s001-cand-13": ["photo_gone"], "fi3020": ["id_lost"], "fi3030": ["other_taxon"], "fi3040": ["photo_gone"],
        "acropora-wide-10": ["photo_gone"], "seaslug-5001-cand-11": ["photo_gone"],
        "seaslug-5001-cand-2": ["other_taxon"], "seaslug-5001-cand-3": ["egg"],
        "seaslug-Nudi-cand-6": ["id_lost"], "seaslug-Nudi-cand-7": ["other_taxon"],
        "seaslug-" + inf["key"] + "-cand-9": ["id_lost"],
    }
    return files, replies, want


BASE = Path(tempfile.mkdtemp(prefix="photo-recheck-"))  # the repository, the cache and the report of a case; removed at the end


def write_repo(files):
    d = BASE / "repo"
    d.mkdir()
    for name, body in files.items():
        (d / name).write_text(json.dumps(body), encoding="utf-8")
    return d


def write_cache(path, replies):
    cache = {"fields": dict(pr.FIELDS)}
    for s, m in replies.items():
        cache[s] = {str(i): o for i, o in m.items()}
    path.write_text(json.dumps(cache), encoding="utf-8")


def no_network(*a, **k):
    raise AssertionError("the network was asked")


def digest(d):
    h = hashlib.sha256()
    for p in sorted(Path(d).rglob("*")):
        if p.is_file():
            h.update(str(p.relative_to(d)).encode() + p.read_bytes())
    return h.hexdigest()


def fixture(extra=None):
    files, replies, want = world()
    repo = write_repo(files)
    cache = BASE / "cache.json"
    write_cache(cache, replies)
    return repo, cache, replies, want


def verdicts(S, fail):
    return {x["f"]: x["reasons"] for x in fail}


def main(case):
    inat.get = no_network
    informal = json.loads((ROOT / "tools" / "seaslug_informal.json").read_text())["species"][0]["genus"]
    if case != "network":  # the genera's taxa: the network case asks for them through the stub
        fs.genus_ids = lambda net, src, names: {g: i for g, i in {"Nudi": 5000, informal: 9000}.items() if g in names}
    if case == "reasons":
        repo, cache, replies, want = fixture()
        out = BASE / "out"
        S, fail = pr.run(repo, out, pr.SUBJECTS, cache, "test", log=lambda m: None)
        rep = json.loads((out / "report.json").read_text())
        return {"got": verdicts(S, fail), "want": want, "summary": S, "files": sorted(p.name for p in out.iterdir()),
                "md": (out / "report.md").read_text(), "tsv": (out / "failing.tsv").read_text(),
                "unchecked": rep["unchecked"], "primary": {x["f"]: x["primary"] for x in fail},
                "predicates": {x["f"]: x["predicate"] for x in fail if x["f"] in ("acropora-wide-3", "fish-s001-cand-3", "fi3020",
                                                                                    "seaslug-5001-cand-3", "seaslug-Nudi-cand-6")}}
    if case == "predicates":
        # The verdict follows the fetchers' own predicates: patch one and the rows change with it.
        repo, cache, replies, want = fixture()
        out = BASE / "out"
        res = {}
        keep = (fl.accepted, ff.usable_obs, fr.passes, fs.usable, fs.usable_gl)
        try:
            fl.accepted = lambda o, tid, loc: False
            ff.usable_obs = lambda o, used, excl: None
            fr.passes = lambda o, want: False
            fs.usable = lambda o, pairs, *a: None
            fs.usable_gl = lambda o, pairs, *a: None
            S, fail = pr.run(repo, out, pr.SUBJECTS, cache, "test", log=lambda m: None)
            res["strict"] = verdicts(S, fail)
            fl.accepted = lambda o, tid, loc: True
            ff.usable_obs = lambda o, used, excl: {"ok": 1}
            fr.passes = lambda o, want: True
            fs.usable = lambda o, pairs, *a: {"ok": 1}
            fs.usable_gl = lambda o, pairs, *a: {"ok": 1}
            S, fail = pr.run(repo, out, pr.SUBJECTS, cache, "test", log=lambda m: None)
            res["lenient"] = verdicts(S, fail)
        finally:
            fl.accepted, ff.usable_obs, fr.passes, fs.usable, fs.usable_gl = keep
        S, fail = pr.run(repo, out, pr.SUBJECTS, cache, "test", log=lambda m: None)
        res["real"] = verdicts(S, fail)
        return res
    if case == "network":
        files, replies, want = world()
        repo = write_repo(files)
        out = BASE / "out"
        urls, taxa, dropped = [], [], set()
        genus_of = {s["inat"]: s["genus"] for s in json.loads((ROOT / "tools" / "seaslugs.json").read_text())["species"]}

        def stub(url, missing=False, timeout=90):
            if "/taxa/" in url:  # the genera's taxa (fetch_seaslugs.genus_ids): a species and its genus, by taxon id
                taxa.append(url)
                got = [int(x) for x in url.split("/taxa/")[1].split("?")[0].split(",")]
                return {"results": [{"id": i, "ancestors": [{"id": 9000, "name": genus_of.get(i), "rank": "genus"}]} for i in got]}
            urls.append(url)
            ids = [int(x) for x in url.split("id=")[1].split("&")[0].split(",")]
            subj = next(s for s in pr.SUBJECTS if url.endswith(pr.FIELDS[s]))
            res = []
            for i in ids:
                if i == 101 and 101 not in dropped:  # a batch that loses one observation: asked once more
                    dropped.add(101)
                    continue
                if replies[subj].get(i):
                    res.append(replies[subj][i])
            return {"results": res}

        inat.get = stub
        S, fail = pr.run(repo, out, pr.SUBJECTS, None, "test", log=lambda m: None)
        gone = sorted(x["f"] for x in fail if x["primary"] == "deleted")
        # a run that gets nothing back is not a finding: it fails
        inat.get = lambda url, missing=False, timeout=90: {"results": []}
        pr.MISSING_FLOOR = 3
        failed = None
        try:
            pr.run(repo, out, ("fish",), None, "test", log=lambda m: None)
        except RuntimeError as e:
            failed = str(e)
        rc = pr.main(["--root", str(repo), "--out", str(out), "--only", "fish"])
        heads = [u.split("fields=")[0] for u in urls]
        return {"urls": len(urls), "ok": all(u.startswith(inat.V2 + "observations?id=") and "&per_page=200&fields=" in u for u in urls),
                "ids_max": max(len(h.split("id=")[1].split("&")[0].split(",")) for h in heads),
                "only_ids": all(h.count("=") == 2 for h in heads),  # id= and per_page=, no name, no project data
                "taxa": len(taxa), "taxa_ids_only": all(re.fullmatch(r"[\d,]+", u.split("/taxa/")[1].split("?")[0]) for u in taxa),
                "gone": gone, "recovered": "acropora-wide-1" not in [x["f"] for x in fail], "failed": failed, "rc": rc}
    if case == "readonly":
        repo, cache, replies, want = fixture()
        before = digest(repo)
        out = BASE / "out"
        pr.run(repo, out, pr.SUBJECTS, cache, "test", log=lambda m: None)
        return {"same": before == digest(repo), "out": sorted(p.name for p in out.iterdir())}
    raise SystemExit("unknown case " + case)


if __name__ == "__main__":
    os.environ.setdefault("PYTHONDONTWRITEBYTECODE", "1")
    try:
        print(json.dumps(main(sys.argv[1])))
    finally:
        shutil.rmtree(BASE, ignore_errors=True)
