"""The checks of tests/inat.test.js (tools/inat.py and the batched requests of the tools), each printing JSON.

    python3 tests/inat_check.py <case>

Every case runs offline: a stubbed opener, or the made-up iNaturalist of tests/inatstub.py. The batched cases run a tool
twice on one world, each request asked alone (the batching switched off) and batched, and print both results and
both request counts: the test asks for the same result in fewer requests.
"""
import contextlib
import io
import json
import os
import sys
import tempfile
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
sys.path.insert(0, str(ROOT / "tests"))
import inat  # noqa: E402
import inatstub  # noqa: E402


class Clock:
    """A fake clock: sleep moves it on."""

    def __init__(self):
        self.t, self.slept = 100.0, []

    def now(self):
        return self.t

    def sleep(self, s):
        self.slept.append(round(s, 3))
        self.t += s


def reply(x):
    if isinstance(x, BaseException):
        raise x
    return inatstub.Reply(x if isinstance(x, bytes) else json.dumps(x).encode())


def client(seq, **k):
    """A Client whose opener answers from seq in turn (an exception is raised), on a fake clock."""
    c, it, sent = Clock(), iter(seq), []

    def opener(req, timeout):
        sent.append((req.full_url, req.get_header("User-agent")))
        return reply(next(it))

    return inat.Client(opener=opener, sleep=c.sleep, clock=c.now, log=lambda m: None, **k), c, sent


def http(code, ra=None):
    return urllib.error.HTTPError("u", code, "x", {"Retry-After": ra} if ra else {}, None)


def case_pace():
    """Two requests to iNaturalist, two to WoRMS, back to back; then one more to iNaturalist 5 s later."""
    cl, c, sent = client([{"n": i} for i in range(5)])
    for u in ("https://api.inaturalist.org/v1/a", "https://api.inaturalist.org/v1/b", "https://www.marinespecies.org/rest/a",
              "https://www.marinespecies.org/rest/b"):
        cl.get(u)
    back = list(c.slept)
    c.t += 5
    cl.get("https://api.inaturalist.org/v1/c")
    return {"slept": back, "later": c.slept[len(back):], "calls": dict(cl.calls), "ua": sorted({u for _, u in sent})}


def case_retry():
    out = {}
    for name, seq, kw in [
        ("r429", [http(429), http(429, "7"), {"a": 1}], {}),
        ("r503", [http(503), {"b": 2}], {}),
        ("reset", [ConnectionResetError("reset"), {"c": 3}], {}),
        ("oserror", [OSError("HTTP Error 429: Too Many Requests"), {"c": 4}], {}),
        ("cut", [b'{"results": [', {"d": 4}], {}),
        ("long", [http(429, "9999"), {"e": 5}], {}),
        ("r404", [http(404)], {}),
        ("r400", [http(400)], {}),
        ("missing", [http(404)], {"missing": True}),
        ("empty", [b""], {"missing": True}),
        ("gaveup", [http(429)] * 6, {}),
    ]:
        cl, c, sent = client(seq)
        try:
            out[name] = {"ok": cl.get("https://api.inaturalist.org/v1/x", **kw), "calls": len(sent),
                         "waits": [s for s in c.slept if s >= 2]}
        except urllib.error.HTTPError as e:
            out[name] = {"raised": e.code, "calls": len(sent), "waits": [s for s in c.slept if s >= 2]}
    return out


def fish_world(n_species=14, seed=3):
    """A made-up fish world: one genus, n_species species (every fourth with an observed subspecies)."""
    taxa = [(2, "Chordata", "phylum", None), (500, "Fakus", "genus", 2)]
    for i in range(n_species):
        taxa.append((1000 + i, f"Fakus sp{i}", "species", 500))
        if i % 4 == 1:
            taxa.append((5000 + i, f"Fakus sp{i} ssp", "subspecies", 1000 + i))
    size = lambda r, t: r.choice([0, 1, 2, 4, 7, 15, 30]) if t["id"] != 1003 else 900  # noqa: E731  one with many
    return inatstub.World(seed, taxa, n=size)


def case_counts():
    """leaf_counts against each taxon's own total; observer_counts against each taxon's own observers request."""
    w = fish_world().install()
    get = lambda u: w.answer(u)  # noqa: E731
    taxa = [1000 + i for i in range(14)]
    q = "quality_grade=research&place_id=6873&captive=false"
    alone = {t: get(f"{inat.V1}observations?taxon_id={t}&{q}&per_page=0")["total_results"] for t in taxa}
    w.calls.clear()
    leaf = inat.leaf_counts(get, taxa, q)
    leaf_calls = sum(w.calls.values())
    est = inat.leaf_counts(get, taxa, q, estimate=True)
    users = {t: get(f"{inat.V1}observations/observers?taxon_id={t}&{q}&per_page=1")["total_results"] for t in taxa}
    w.calls.clear()
    solo = lambda t: get(f"{inat.V1}observations/observers?taxon_id={t}&{q}&per_page=1")["total_results"]  # noqa: E731
    batched = inat.observer_counts(get, {t: alone[t] for t in taxa}, q, solo)
    obs_calls = dict(w.calls)
    # An estimate far too low for a batch of one page: it holds more than it said, every taxon is asked on its own.
    w.calls.clear()
    low = inat.observer_counts(get, {t: 1 for t in taxa}, q, solo, pages=1)
    return {"alone": {str(k): v for k, v in alone.items()}, "leaf": {str(k): v for k, v in leaf.items()}, "leaf_calls": leaf_calls,
            "est": {str(k): v for k, v in est.items()}, "users": {str(k): v for k, v in users.items()},
            "batched": {str(k): v for k, v in batched.items()}, "obs_calls": obs_calls,
            "low": {str(k): v for k, v in low.items()}, "low_calls": dict(w.calls)}


def fish_files(d, n_species=14):
    """A made-up fish.json for fetch_fish.py: one circle-1 entry with the species of fish_world, all confirmed."""
    sp = [{"id": f"s{i:03d}", "name": f"Fakus sp{i}", "inat": 1000 + i, "circle": 1,
           "present": {"ph": True, "near": i % 3 == 0}} for i in range(n_species)]
    fish = {"species": sp, "teach": [{"id": "t01", "name": "Fakes", "circle": 1, "species": [s["id"] for s in sp]}]}
    (d / "fish.json").write_text(json.dumps(fish))
    (d / "cand.json").write_text(json.dumps({"v": 1, "cand": {}}))
    return ["--fish", str(d / "fish.json"), "--cur", str(d / "none.json"), "--suggest", str(d / "none.json"),
            "--photos", str(d / "none.json"), "--fbsrc", str(d / "none.json"), "--cand", str(d / "cand.json")]


def case_fetch_fish():
    """fetch_fish.py's general searches, each species alone (BATCH_SOLO 0) and batched (prefetch), on one world."""
    import fetch_fish as ff
    out = {}
    for mode, solo in (("alone", 0), ("batched", ff.BATCH_SOLO)):
        w = fish_world().install()
        ff.BATCH_SOLO = solo
        d = Path(tempfile.mkdtemp())
        args = fish_files(d) + ["--cache", str(d / "c.json")]
        with contextlib.redirect_stdout(io.StringIO()):
            ff.main(args + ["--cap", "40"])
        cand = (d / "cand.json").read_text()
        # The same run again, offline: everything it asks is in the cache, batched or not.
        (d / "cand.json").write_text(json.dumps({"v": 1, "cand": {}}))
        with contextlib.redirect_stdout(io.StringIO()):
            ff.main(args + ["--cap", "40", "--offline"])
        out[mode] = {"cand": cand, "again": (d / "cand.json").read_text(), "calls": dict(w.calls), "n": sum(w.calls.values())}
    return out


def case_presence():
    """tools/presence.py species_presence_many over several genera against species_presence one genus at a time with
    every observers request alone."""
    import presence as P
    taxa = [(47534, "Cnidaria", "phylum", None)]
    for g in range(4):
        taxa.append((600 + g, f"Coralus{g}", "genus", 47534))
        for i in range(6):
            taxa.append((7000 + 10 * g + i, f"Coralus{g} sp{i}", "species", 600 + g))
    out = {}
    for mode in ("alone", "batched"):
        w = inatstub.World(5, taxa, n=lambda r, t: r.choice([0, 3, 4, 6, 9, 40])).install()
        get = lambda u: w.answer(u)  # noqa: E731
        if mode == "alone":
            inat.OBS_BATCH_PAGES, keep = 0, inat.OBS_BATCH_PAGES
            res = {g: P.species_presence(get, g, "coral", "&captive=false") for g in range(600, 604)}
            inat.OBS_BATCH_PAGES = keep
        else:
            res = P.species_presence_many(get, list(range(600, 604)), "coral", "&captive=false")
        out[mode] = {"res": {str(k): v for k, v in res.items()}, "n": sum(w.calls.values())}
    return out


def case_build_fish():
    """tools/build_fish.py presence(): each species' requests alone, and after presence_prefetch."""
    import build_fish as b
    out = {}
    for mode in ("alone", "batched"):
        w = fish_world(20, seed=9).install()
        b.CACHE = Path(tempfile.mkdtemp()) / "c.json"
        b.NET = b.Net()
        items = [(1000 + i, i % 5 == 0, [f"Fakus sp{i}"]) for i in range(20)]
        if mode == "batched":
            b.presence_prefetch(items)
        else:
            b.PRE.clear()
        out[mode] = {"res": [b.presence(*it) for it in items], "n": sum(w.calls.values())}
        # Offline, the cache answers the same (the batched replies are cached too).
        b.NET.save()
        b.NET = b.Net(offline=True)
        if mode == "batched":
            b.presence_prefetch(items)
        out[mode]["offline"] = [b.presence(*it) for it in items]
    return out


def case_commonness():
    """tools/fish_commonness.py fetch: one species_counts per taxon and every observers request alone, against batched."""
    import fish_commonness as fc
    fish = json.loads(json.dumps({"species": [{"id": f"s{i}", "name": f"Fakus sp{i}", "inat": 1000 + i} for i in range(14)],
                                  "teach": [{"id": "t1", "name": "A", "species": [f"s{i}" for i in range(7)]},
                                            {"id": "t2", "name": "B", "species": [f"s{i}" for i in range(7, 14)]}]}))
    out = {}
    for mode in ("alone", "batched"):
        w = fish_world().install()
        fc.CACHE = Path(tempfile.mkdtemp()) / "c.json"
        keep = inat.BATCH, inat.OBS_BATCH_PAGES
        if mode == "alone":
            inat.BATCH, inat.OBS_BATCH_PAGES = 1, 0
        with contextlib.redirect_stderr(io.StringIO()):
            out[mode] = {"rows": fc.fetch(fish, fc.Net()), "n": sum(w.calls.values())}
        inat.BATCH, inat.OBS_BATCH_PAGES = keep
    return out


if __name__ == "__main__":
    os.chdir(ROOT)
    print(json.dumps(globals()["case_" + sys.argv[1]](), sort_keys=True, default=str))
