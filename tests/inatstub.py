"""A small offline iNaturalist for the tests (tests/inat.test.js): a made-up world of taxa and observations, answering
the API requests the tools send (v1 and v2 observations with their filters, order and paging, species_counts with
iNaturalist's leaf counting, observers, taxa by id) the way the real API does, and counting them.

    w = World(seed, taxa=[(id, name, rank, parent id)], n=...)   make observations for the leaf taxa
    w.install()        urllib.request.urlopen answers from the world, time.sleep returns at once (pauses recorded)
    w.calls            Counter of the requests answered, by endpoint ("v2/observations", "v1/observations/observers", ...)

Made up: names, users (u0, u1, ... and ppericard), coordinates (near Dauin, in the region, elsewhere in the Philippines,
in the Indo-West Pacific, elsewhere), licences, annotations, votes. Nothing here is real data.
"""
import io
import json
import math
import random
import time
import urllib.parse
import urllib.request
from collections import Counter, defaultdict

DAUIN = (9.19, 123.26)
LICS = ["cc0", "cc-by", "cc-by-nc", "cc-by-sa", "cc-by-nc-sa", "cc-by-nd", None]


def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (*a, *b))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


class Reply(io.BytesIO):
    status = 200

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def project(o, fields):
    """o reduced to the dotted fields asked (v2 `fields`: "taxon.id,photos.url"); id always."""
    tree = {}
    for f in fields.split(","):
        d = tree
        for k in f.split("."):
            d = d.setdefault(k, {})

    def pick(v, t):
        if not t:
            return v
        if isinstance(v, list):
            return [pick(x, t) for x in v]
        if isinstance(v, dict):
            return {k: pick(v[k], t[k]) for k in t if k in v}
        return v

    out = pick(o, tree)
    out.setdefault("id", o["id"])
    return out


class World:
    def __init__(self, seed, taxa, n=lambda r, t: r.choice([0, 0, 1, 2, 3, 5, 8, 12, 20, 40, 90, 260, 700]), users=400):
        r = random.Random(seed)
        self.taxa = {}
        for tid, name, rank, parent in taxa:
            anc = (self.taxa[parent]["ancestor_ids"] if parent in self.taxa else [1]) + [tid]
            self.taxa[tid] = {"id": tid, "name": name, "rank": rank, "ancestor_ids": anc, "is_active": True,
                              "default_photo": None, "taxon_photos": [], "preferred_common_name": name + " fish", "iconic_taxon_name": "Animalia",
                              "names": [{"name": name + " fish", "lexicon": "English", "position": 0}]}
        kids = defaultdict(list)
        for t in self.taxa.values():
            kids[t["ancestor_ids"][-2] if len(t["ancestor_ids"]) > 1 else None].append(t["id"])
        self.obs, oid, pid = [], r.randrange(10**6, 2 * 10**6), r.randrange(10**8, 2 * 10**8)
        for t in self.taxa.values():
            if t["rank"] not in ("species", "subspecies", "genus"):
                continue
            k = n(r, t)
            for _ in range(k):
                oid += r.randrange(1, 40000)
                where = r.random()
                if where < 0.25:
                    ll = (DAUIN[0] + r.uniform(-0.3, 0.3), DAUIN[1] + r.uniform(-0.3, 0.3))
                elif where < 0.45:
                    ll = (DAUIN[0] + r.uniform(-2, 2), DAUIN[1] + r.uniform(-2, 2))
                elif where < 0.6:
                    ll = (r.uniform(5, 19), r.uniform(117, 126))
                elif where < 0.85:
                    ll = (r.uniform(-25, 28), r.uniform(95, 165))
                else:
                    ll = (r.uniform(-30, 30), r.uniform(-170, 60))
                inph = (5 <= ll[0] <= 19 and 117 <= ll[1] <= 126) and r.random() < 0.97
                photos = []
                lic_obs = r.choice(LICS)
                for _ in range(r.choice([1, 1, 2, 3, 4, 6])):
                    pid += r.randrange(1, 900)
                    lic = lic_obs if r.random() < 0.85 else r.choice(LICS)
                    photos.append({"id": pid, "url": f"https://inaturalist-open-data.s3.amazonaws.com/photos/{pid}/square.jpg",
                                   "license_code": lic, "attribution": f"(c) u{pid % 97}, some rights reserved ({(lic or 'c').upper()})",
                                   "original_dimensions": {"width": 2000, "height": 1500}})
                user = "ppericard" if r.random() < 0.03 else f"u{int(r.paretovariate(1.2)) % users}"
                grade = r.choices(["research", "needs_id", "casual"], [70, 25, 5])[0]
                ann = []
                if r.random() < 0.2:
                    ann.append({"controlled_attribute_id": 1, "controlled_value_id": r.choice([2, 8]), "vote_score": r.choice([1, 0, -1])})
                if r.random() < 0.1:
                    ann.append({"controlled_attribute_id": 9, "controlled_value_id": r.choice([10, 11]), "vote_score": 1})
                if r.random() < 0.02:
                    ann.append({"controlled_attribute_id": 17, "controlled_value_id": 19, "vote_score": 1})
                tx = {"id": t["id"], "name": t["name"], "rank": t["rank"], "ancestor_ids": list(t["ancestor_ids"]),
                      "min_species_taxon_id": t["id"] if t["rank"] == "species" else t["ancestor_ids"][-2] if t["rank"] == "subspecies" else t["id"]}
                self.obs.append({
                    "id": oid, "quality_grade": grade, "location": f"{ll[0]:.5f},{ll[1]:.5f}", "ll": ll,
                    "place_ids": [6873] if inph else [], "taxon": tx, "user": {"id": hash(user) % 10**6, "login": user},
                    "photos": photos, "annotations": ann, "captive": r.random() < 0.02,
                    "cached_votes_total": r.choice([0, 0, 0, 1, 2, 3]), "faves_count": r.choice([0, 0, 1, 5]),
                    "community_taxon_id": t["id"] if r.random() < 0.6 else None, "identifications_most_agree": r.random() < 0.8,
                    "identifications": [{"current": True, "user": {"login": user}, "taxon": tx}],
                    "rand": r.random()})
        for t in self.taxa.values():  # covers from their own observations (for --rep and the taxa requests)
            mine = [o for o in self.obs if o["taxon"]["id"] == t["id"] and o["photos"]]
            if mine:
                o = r.choice(mine)
                t["default_photo"] = dict(o["photos"][0])
                t["taxon_photos"] = [{"photo": dict(p)} for o in mine[:3] for p in o["photos"][:1]]
        self.by_taxon = defaultdict(list)
        for o in self.obs:
            for a in o["taxon"]["ancestor_ids"]:
                self.by_taxon[a].append(o)
        self.by_id = {o["id"]: o for o in self.obs}
        self.calls, self.urls, self.slept = Counter(), [], []

    # ---------------------------------------------------------------- the API

    def match(self, P):
        g = lambda k: P.get(k, [None])[0]  # noqa: E731
        if g("taxon_id"):
            seen, pool = set(), []
            for t in g("taxon_id").split(","):
                for o in self.by_taxon.get(int(t), []):
                    if o["id"] not in seen:
                        seen.add(o["id"])
                        pool.append(o)
        elif g("id"):
            pool = [self.by_id[int(i)] for i in g("id").split(",") if int(i) in self.by_id]
        else:
            pool = list(self.obs)
        if g("id") and g("taxon_id"):
            want = {int(i) for i in g("id").split(",")}
            pool = [o for o in pool if o["id"] in want]
        out = []
        qg = set(g("quality_grade").split(",")) if g("quality_grade") else None
        lic = set(g("photo_license").split(",")) if g("photo_license") else None
        for o in pool:
            if qg and o["quality_grade"] not in qg:
                continue
            if g("verifiable") == "true" and o["quality_grade"] == "casual":
                continue
            if g("user_login") and o["user"]["login"] != g("user_login"):
                continue
            if g("captive") is not None and o["captive"] != (g("captive") == "true"):
                continue
            if g("photos") == "true" and not o["photos"]:
                continue
            if lic and not any(p["license_code"] in lic for p in o["photos"]):
                continue
            if g("radius") and km((float(g("lat")), float(g("lng"))), o["ll"]) > float(g("radius")):
                continue
            if g("place_id") and int(g("place_id")) not in o["place_ids"]:
                continue
            if g("not_in_place") and int(g("not_in_place")) in o["place_ids"]:
                continue
            if g("swlat") and not (float(g("swlat")) <= o["ll"][0] <= float(g("nelat")) and float(g("swlng")) <= o["ll"][1] <= float(g("nelng"))):
                continue
            if g("term_id") and not any(a["controlled_attribute_id"] == int(g("term_id")) and a["controlled_value_id"] == int(g("term_value_id"))
                                        for a in o["annotations"]):
                continue
            if g("id_above") and o["id"] <= int(g("id_above")):
                continue
            if g("id_below") and o["id"] >= int(g("id_below")):
                continue
            out.append(o)
        return out

    def public(self, o):
        return {k: v for k, v in o.items() if k not in ("ll", "rand")}

    def answer(self, url):
        u = urllib.parse.urlsplit(url)
        P = urllib.parse.parse_qs(u.query, keep_blank_values=True)
        g = lambda k, d=None: P.get(k, [d])[0]  # noqa: E731
        path = u.path.strip("/")
        per = int(g("per_page", 30))
        page = int(g("page", 1))
        if path.endswith("observations/species_counts"):
            self.calls["v1/observations/species_counts"] += 1
            obs = self.match(P)
            here = Counter(o["taxon"]["id"] for o in obs)
            inner = {a for o in obs for a in o["taxon"]["ancestor_ids"][:-1]}
            rows = sorted(({"count": c, "taxon": {k: self.taxa[t][k] for k in ("id", "name", "rank", "ancestor_ids")}}
                           for t, c in here.items() if t not in inner), key=lambda r: (-r["count"], r["taxon"]["id"]))
            return {"total_results": len(rows), "page": page, "per_page": per, "results": rows[(page - 1) * per:page * per]}
        if path.endswith("observations/observers"):
            self.calls["v1/observations/observers"] += 1
            by = Counter(o["user"]["login"] for o in self.match(P))
            rows = [{"user": {"login": k}, "observation_count": c} for k, c in sorted(by.items(), key=lambda x: (-x[1], x[0]))]
            return {"total_results": len(rows), "page": page, "per_page": per, "results": rows[:per]}
        if path.endswith("observations"):
            v = "v2" if path.startswith("v2") else "v1"
            self.calls[f"{v}/observations"] += 1
            obs = self.match(P)
            if g("order_by") == "votes":
                obs.sort(key=lambda o: (-o["cached_votes_total"], o["rand"]))
            else:
                obs.sort(key=lambda o: o["id"], reverse=g("order", "desc") != "asc")
            res = [self.public(o) for o in obs[(page - 1) * per:page * per]] if per else []
            if v == "v2" and g("fields"):
                res = [project(o, g("fields")) for o in res]
            return {"total_results": len(obs), "page": page, "per_page": per, "results": res}
        if "/taxa/" in "/" + path + "/" and path.split("/")[-1].replace(",", "").isdigit():
            v = path.split("/")[0]
            self.calls[f"{v}/taxa/ids"] += 1
            res = []
            for i in path.split("/")[-1].split(","):
                t = self.taxa.get(int(i))
                if t:
                    rec = dict(t, ancestors=[{"name": self.taxa[a]["name"], "rank": self.taxa[a]["rank"]}
                                             for a in t["ancestor_ids"][:-1] if a in self.taxa])
                    res.append(project(rec, g("fields")) if v == "v2" and g("fields") else rec)
            return {"total_results": len(res), "results": res}
        if path.endswith("taxa"):
            self.calls["v1/taxa?q"] += 1
            q = g("q") or ""
            res = [t for t in self.taxa.values() if t["name"] == q]
            return {"total_results": len(res), "results": res}
        raise AssertionError(f"inatstub: no such endpoint: {url}")

    def urlopen(self, req, timeout=None, *a, **k):
        url = req.full_url
        assert req.get_header("User-agent"), url
        self.urls.append(url)
        return Reply(json.dumps(self.answer(url)).encode())

    def install(self):
        urllib.request.urlopen = self.urlopen
        time.sleep = self.slept.append
        return self
