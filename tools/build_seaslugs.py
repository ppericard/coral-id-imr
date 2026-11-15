#!/usr/bin/env python3
"""Builds tools/seaslugs.json: the sea-slug species confirmed in the Philippines, their popularity signals, the "stars"
set and the circles proposal (the first, app-free steps of the sea-slug subject; docs/reviews/2026-11-15-seaslug-list.md).

Decided with Pierre, 2026-11-15 (Q369, after docs/reviews/2026-11-15-nudibranch-mode-study.md):
  (a) one subject, "sea slugs", its circles ordered by popularity, not by group: circle 1 holds the stars and the most
      common species, from any group (sacoglossans included);
  (b) a zone per subject: sea slugs are ranked over the whole Philippines (the source's `area`); the instance centre
      (tools/instance.json, Dauin) still gives "seen near Dauin";
  (c) a "stars" set from English Wikipedia pageviews and mentions in public articles, never the opening order, editable
      by Pierre (the source's stars.add / stars.remove);
  (d) scientific names only: the English names and diver nicknames are information for the sheets.

Inputs: tools/seaslug_source.json (hand-kept: the roots, the area, the pageviews window, the nicknames, the pages read,
the stars size and edits, the circles sizes).

Two stages:
  fetch (network, every reply cached in tools/.cache/seaslugs.json, git-ignored; a rerun is offline):
    - iNaturalist (through tools/inat.py, rule C7: 1 s between requests, the project's User-Agent, paced retries): every
      Research Grade observation of each root in the area, paged by id, 200 a request (v2, the fields the counts need);
      the taxa and places they name (30 and 100 a request); worldwide Research Grade observations per species by photo
      licence and with the "Life Stage: Juvenile" annotation (species_counts, 100 taxa a request);
    - WoRMS (0.3 s between requests): the accepted name, AphiaID, order and family (AphiaRecordsByMatchNames, 50 names a
      request), the English vernaculars and the species synonyms of each confirmed species;
    - English Wikipedia: titles resolved with redirects (50 a request), one pageviews request per article over the
      source's window (wikimedia.org rate-limits hard: 3 s between requests, retries after 1 to 10 minutes);
    - the public pages of the source, read only, one every 2 s or more, a page that refuses (403, 503) recorded as not
      readable, never retried another way; the nicknames' Wikipedia redirects.
  derive (offline, pure): from those signals to the stars score, the stars set and the circles (`derive`); `--check`
    reruns it on the committed file and fails when the file disagrees (CI has no cache).

Counts per species (no observer id anywhere in the output): `obs` and `observers` (distinct, Research Grade, in the
area), `prov` (provinces with an observation; `provTop`: the three with most, their share), `cells` (half-degree cells),
`top` (the share of its observations made by its single most active observer), `nearObs` / `nearObservers` (within the
instance centre's radius), `near` (rule C8's near test), `phBy` (rule C8's reasons; every species kept has one),
`faved`, photo licences by observation (`photos`: area open = CC0 / CC BY, nc = CC BY-NC, other; world Research Grade
with an open / nc photo), life-stage annotations (`juv`: area, world). Presence is rule C8 from tools/presence.py
(ph_confirmed, near_dauin, CENTRE): no sea-slug checklist exists, so the routes are 3 observers in the Philippines or
2 near Dauin. Commonness = distinct observers, ties by cells then observations (the study's 3.1).

Stars rule (`stars_scores`): W = log10(1 + views) / log10(1 + the best views), counted only for a species' own article
or an article of its own under another name (not a genus or family article, not one shared by two species); M =
log(1 + sites) / log(1 + the best sites), sites = distinct web sites among the readable ph and general pages that name
it (scientific name, a WoRMS synonym, or a nickname whose Wikipedia redirect lands on its article); score = (W + M) / 2.
The stars = the `stars.size` best scores, then Pierre's add / remove. Circles (`circles`): circle 1 = the stars plus the
most common species up to `circles.one`; then the rest by commonness in blocks of `circles.next`, the remainder last.

Usage: python3 tools/build_seaslugs.py [--offline | --refresh] [--seed DIR] [--dry]
       python3 tools/build_seaslugs.py --check     (derive again from tools/seaslugs.json, offline; exit 1 on a difference)
  --seed DIR: a cache of earlier replies, one DIR/<sha1 of the URL>.json each (the study's pulls of 2026-11-15), read
  before asking the network. Tests: node --test tests/seaslugs.test.js.
"""
import argparse
import datetime
import hashlib
import html
import html.parser
import json
import math
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import inat  # noqa: E402  (the one paced, retried client; rule C7)
from presence import CENTRE, NEAR_OBSERVERS, PH_OBSERVERS, near_dauin, ph_confirmed  # noqa: E402  (rule C8, once)

SRC = ROOT / "tools" / "seaslug_source.json"
OUT = ROOT / "tools" / "seaslugs.json"
CACHE = ROOT / "tools" / ".cache" / "seaslugs.json"
V = 1
WORMS = "https://www.marinespecies.org/rest/"
OBS_FIELDS = ("id,faves_count,observed_on,location,user.id,taxon.id,taxon.name,taxon.rank,taxon.ancestor_ids,"
              "photos.license_code,annotations.controlled_attribute_id,annotations.controlled_value_id,place_ids")
OPEN, NC = {"cc0", "cc-by"}, {"cc-by-nc"}
LIFE_STAGE, JUVENILE, EGG = 1, 8, 7  # iNaturalist's controlled annotation ids
PAGE_GAP = 2.0  # seconds between two page reads, whatever the host
PAGE_UA = "Mozilla/5.0 (compatible; page-reader/1.0)"  # a generic User-Agent for the public pages: no project, no person
TWO_LEVEL = {"com.au", "com.ph", "co.uk", "co.id", "org.uk"}


def today():
    return datetime.date.today().isoformat()


# ---------------------------------------------------------------- network, cached


class Net:
    """GET with a cache ({url: reply}, and {url: date pulled}); --seed reads a folder of sha1(url).json replies first."""

    def __init__(self, offline=False, refresh=False, seed=None):
        self.offline, self.refresh, self.seed, self.new, self.asked = offline, refresh, seed, 0, set()
        c = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
        self.c, self.at = c.get("r", {}), c.get("at", {})
        self.wiki = inat.Client(pace={"wikimedia.org": 3.0, "en.wikipedia.org": 2.0}, waits=(60, 120, 300, 600))
        self.last_page = 0.0

    def _cached(self, url):
        if url in self.c and not (self.refresh and url not in self.asked):
            return True, self.c[url]
        if self.seed and not self.refresh:
            f = Path(self.seed) / (hashlib.sha1(url.encode()).hexdigest() + ".json")
            if f.exists():
                self.c[url] = json.loads(f.read_text(encoding="utf-8"))
                self.at[url] = datetime.date.fromtimestamp(f.stat().st_mtime).isoformat()
                return True, self.c[url]
        if self.offline:
            sys.exit(f"--offline: not cached: {url}")
        return False, None

    def _keep(self, url, v):
        self.c[url], self.at[url] = v, today()
        self.asked.add(url)
        self.new += 1
        if self.new % 40 == 0:
            self.save()
        return v

    def get(self, url):
        hit, v = self._cached(url)
        if hit:
            return v
        host = urllib.parse.urlsplit(url).hostname or ""
        client = self.wiki if host.endswith("wikimedia.org") or host.endswith("wikipedia.org") else inat.CLIENT
        return self._keep(url, client.get(url, missing=True))

    def page(self, url):
        """{status, final, html} of a public page, read once (PAGE_GAP between two reads; a refusal is recorded)."""
        key = "page:" + url
        hit, v = self._cached(key)
        if hit:
            return v
        left = self.last_page + PAGE_GAP - time.monotonic()
        if left > 0:
            time.sleep(left)
        req = urllib.request.Request(url, headers={"User-Agent": PAGE_UA, "Accept": "text/html,application/xhtml+xml"})
        out = {"status": None, "final": url, "html": None}
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read()
                cs = r.headers.get_content_charset() or "utf-8"
                out.update(status=getattr(r, "status", 200), final=r.geturl(), html=raw.decode(cs, errors="replace"))
        except urllib.error.HTTPError as e:
            out["status"] = e.code
        except (OSError, ValueError) as e:  # refused, reset, timeout, a bad URL
            out["status"] = type(e).__name__
        self.last_page = time.monotonic()
        print(f"  page {out['status']}: {url}", file=sys.stderr)
        return self._keep(key, out)

    def date(self, url):
        return self.at.get(url) or self.at.get("page:" + url)

    def save(self):
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        tmp = CACHE.with_suffix(".tmp")
        tmp.write_text(json.dumps({"r": self.c, "at": self.at}, sort_keys=True, separators=(",", ":")), encoding="utf-8")
        tmp.replace(CACHE)


# ---------------------------------------------------------------- iNaturalist


def obs_url(root, place, above):
    return (f"{inat.V2}observations?taxon_id={root}&place_id={place}&quality_grade=research&per_page=200&order_by=id"
            f"&order=asc&id_above={above}&fields={OBS_FIELDS}")


def pull(net, root, place):
    """Every Research Grade observation of root in the place, paged by id (the study's requests, so its cache serves)."""
    out, last, urls = [], 0, []
    while True:
        u = obs_url(root, place, last)
        urls.append(u)
        r = (net.get(u) or {}).get("results") or []
        if not r:
            return out, urls
        out += r
        last = r[-1]["id"]


def taxa_places(net, obs):
    """{taxon id: {name, rank, cn}} for every taxon and ancestor met; {place id: {name, level}}."""
    ids, pl = set(), set()
    for o in obs:
        t = o.get("taxon") or {}
        ids.add(t["id"])
        ids.update(t.get("ancestor_ids") or [])
        pl.update(o.get("place_ids") or [])
    taxa, places = {}, {}
    for B in inat.chunks(sorted(ids), 30):
        for t in (net.get(f"{inat.V1}taxa/{','.join(map(str, B))}?locale=en&per_page=30") or {}).get("results") or []:
            taxa[t["id"]] = {"name": t["name"], "rank": t["rank"], "cn": t.get("preferred_common_name")}
    for B in inat.chunks(sorted(pl), 100):
        for p in (net.get(f"{inat.V1}places/{','.join(map(str, B))}?per_page=100") or {}).get("results") or []:
            places[p["id"]] = {"name": p["name"], "level": p.get("admin_level")}
    return taxa, places


def km(a, b, c, d):
    p = math.pi / 180
    x = math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(x))


def aggregate(obs, roots, taxa, places, centre):
    """Per species (a subspecies counts for its species), from the area's observations: the counts the output keeps.
    roots: {group name: taxon id}. Observer ids are used to count, never returned."""
    group_of = {v: k for k, v in roots.items()}
    S = defaultdict(lambda: {"users": Counter(), "prov": Counter(), "cells": set(), "near": Counter(), "obs": 0,
                             "faved": 0, "open": 0, "nc": 0, "other": 0, "juv": 0, "egg": 0})
    meta = {}
    for o in obs:
        t = o.get("taxon") or {}
        anc = t.get("ancestor_ids") or []
        sp = t["id"] if t.get("rank") == "species" else next(
            (a for a in reversed(anc) if (taxa.get(a) or {}).get("rank") == "species"), None)
        if sp is None:
            continue
        s, u = S[sp], (o.get("user") or {}).get("id")
        meta[sp] = anc
        s["obs"] += 1
        s["users"][u] += 1
        for p in o.get("place_ids") or []:
            if (places.get(p) or {}).get("level") == 10:
                s["prov"][places[p]["name"]] += 1
        if o.get("location"):
            la, lo = map(float, o["location"].split(","))
            s["cells"].add((math.floor(la * 2), math.floor(lo * 2)))
            if km(centre["lat"], centre["lon"], la, lo) <= centre["radiusKm"]:
                s["near"][u] += 1
        s["faved"] += (o.get("faves_count") or 0) > 0
        lic = {p.get("license_code") for p in o.get("photos") or []}
        s["open" if lic & OPEN else "nc" if lic & NC else "other"] += 1
        for a in o.get("annotations") or []:
            if a.get("controlled_attribute_id") == LIFE_STAGE:
                s["juv"] += a.get("controlled_value_id") == JUVENILE
                s["egg"] += a.get("controlled_value_id") == EGG
    out = {}
    for sp, s in S.items():
        anc = meta[sp]
        rank = lambda r: next((taxa[a]["name"] for a in anc if (taxa.get(a) or {}).get("rank") == r), "")  # noqa: E731
        nobs, nu = s["obs"], len(s["users"])
        near_u = len(s["near"])
        out[sp] = {
            "inat": sp, "name": taxa[sp]["name"], "group": next((group_of[a] for a in anc if a in group_of), "?"),
            "inatFamily": rank("family"), "genus": rank("genus"), "en": taxa[sp].get("cn"),
            "obs": nobs, "observers": nu, "prov": len(s["prov"]),
            "provTop": [[p, round(n / nobs, 2)] for p, n in sorted(s["prov"].items(), key=lambda x: (-x[1], x[0]))[:3]],
            "cells": len(s["cells"]), "top": round(s["users"].most_common(1)[0][1] / nobs, 3),
            "nearObs": sum(s["near"].values()), "nearObservers": near_u, "near": bool(near_dauin(near_u)),
            "phBy": ph_confirmed(nobs, nu, False, near_dauin(near_u)), "faved": s["faved"],
            "photos": {"open": s["open"], "nc": s["nc"], "other": s["other"]}, "juv": {"area": s["juv"]},
            "egg": s["egg"]}
    return out


def world_counts(net, ids, query):
    """{taxon: worldwide observations matching query}: species_counts, 100 taxa a request; a species' own row plus the
    rows below it (its subspecies)."""
    return inat.leaf_counts(net.get, ids, query, estimate=True)


# ---------------------------------------------------------------- WoRMS


def worms(net, names):
    """{name: {aphia, accepted, aphiaAcc, status, order, family}} by AphiaRecordsByMatchNames (an exact match first)."""
    out = {}
    for B in inat.chunks(sorted(names), 50):
        q = "&".join("scientificnames[]=" + urllib.parse.quote(n) for n in B)
        d = net.get(f"{WORMS}AphiaRecordsByMatchNames?{q}&marine_only=false") or []
        for n, recs in zip(B, d):
            recs = recs or []
            r = next((r for r in recs if r.get("match_type") == "exact"), recs[0] if recs else None)
            if r:
                out[n] = {"aphia": r["AphiaID"], "accepted": r.get("valid_name") or r["scientificname"],
                          "aphiaAcc": r.get("valid_AphiaID") or r["AphiaID"], "status": r.get("status"),
                          "order": r.get("order"), "family": r.get("family"), "match": r.get("match_type")}
    return out


def worms_names(net, aphia):
    """(English vernaculars, species-rank synonyms) of an accepted AphiaID."""
    v = net.get(f"{WORMS}AphiaVernacularsByAphiaID/{aphia}") or []
    s = net.get(f"{WORMS}AphiaSynonymsByAphiaID/{aphia}") or []
    en = sorted({x["vernacular"] for x in v if x.get("language_code") == "eng"})
    syn = sorted({x["scientificname"] for x in s if (x.get("rank") or "") == "Species" and x.get("scientificname")})
    return en, syn


# ---------------------------------------------------------------- Wikipedia


def wiki_titles(net, names):
    """{name: resolved article title} (redirects followed; absent: no article)."""
    out = {}
    for B in inat.chunks(sorted(names), 50):
        d = net.get("https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&titles="
                    + urllib.parse.quote("|".join(B))) or {}
        q = d.get("query") or {}
        red = {r["from"]: r["to"] for r in q.get("redirects") or []}
        norm = {r["from"]: r["to"] for r in q.get("normalized") or []}
        exist = {p["title"] for p in (q.get("pages") or {}).values() if "missing" not in p and "invalid" not in p}
        for n in B:
            t = red.get(norm.get(n, n), norm.get(n, n))
            if t in exist:
                out[n] = t
    return out


def wiki_views(net, title, w):
    u = ("https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/"
         + urllib.parse.quote(title.replace(" ", "_"), safe="") + f"/monthly/{w['from']}/{w['to']}")
    d = net.get(u) or {}
    return sum(i.get("views") or 0 for i in d.get("items") or []), u


def article_kind(name, title, shared):
    """own: the species' article; named: an article of its own under another name ("Spanish dancer"); higher: a genus
    or family article (one word); shared: one article for two species or more. Only own and named count."""
    if title in shared:
        return "shared"
    if title == name:
        return "own"
    return "higher" if len(title.split()) == 1 else "named"


# ---------------------------------------------------------------- pages


class _Text(html.parser.HTMLParser):
    SKIP = {"script", "style", "noscript", "svg", "template"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.depth, self.meta, self.title, self._t = [], 0, {}, "", False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self.parts.append(" ")  # "<em>Cyerce nigra</em>and": a tag boundary separates words
        if tag in self.SKIP:
            self.depth += 1
        elif tag == "img" and a.get("alt") and not self.depth:
            self.parts.append(" " + a["alt"] + " ")  # photo captions name species
        elif tag == "meta":
            k = (a.get("property") or a.get("name") or a.get("itemprop") or "").lower()
            if k and a.get("content"):
                self.meta.setdefault(k, a["content"])
        elif tag == "title":
            self._t = True

    def handle_endtag(self, tag):
        self.parts.append(" ")
        if tag in self.SKIP and self.depth:
            self.depth -= 1
        if tag == "title":
            self._t = False

    def handle_data(self, data):
        if self._t and not self.title:
            self.title = data.strip()
        if not self.depth:
            self.parts.append(data)


DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")


def page_text(raw):
    """(title, date published or None, the field it came from, the visible text) of an HTML page: scripts and styles
    left out, photo captions (img alt) kept. The date only from a publication field: the meta article:published_time,
    else a meta datePublished, else JSON-LD datePublished. Never a <time> element or a modified date: a sidebar's
    <time> or an update is not the page's date (xray-mag.com's pages carry the front page's latest note time)."""
    p = _Text()
    p.feed(raw or "")
    m = p.meta
    cands = [("article:published_time", m.get("article:published_time")), ("meta datePublished", m.get("datepublished")),
             ("JSON-LD datePublished", (re.search(r'"datePublished"\s*:\s*"([^"]+)"', raw or "") or [None, None])[1])]
    date, src = next(((DATE_RE.search(c).group(1), k) for k, c in cands if c and DATE_RE.search(c)), (None, None))
    title = html.unescape(m.get("og:title") or p.title or "").strip()
    return title, date, src, re.sub(r"[ \t\r\f\v ]+", " ", "".join(p.parts))


def norm_text(t):
    return " " + re.sub(r"\s+", " ", re.sub(r"[^\w.'\-]+", " ", (t or "").lower())) + " "


def mentions(text, forms, nicks):
    """{species: sorted kinds} named in text. forms: {scientific name: species} (accepted, iNaturalist's, WoRMS
    synonyms; a name claimed by two species is left out by the caller); nicks: {phrase: species}. A binomial counts
    written in full or abbreviated ("C. annae") when that genus is written in full on the page and no other species
    whose genus is on the page abbreviates the same."""
    t = norm_text(text)
    found = defaultdict(set)
    genera_on = {n.split()[0].lower() for n in forms if re.search(r"(?<![\w.])" + re.escape(n.split()[0].lower()) + r"(?![\w])", t)}
    abbr = defaultdict(set)
    for n, sp in forms.items():
        g, e = n.lower().split()[:2]
        if re.search(r"(?<![\w.])" + re.escape(g) + r" " + re.escape(e) + r"(?![\w])", t):
            found[sp].add("name")
        if g in genera_on:
            abbr[(g[0], e)].add(sp)
    for (i, e), sps in abbr.items():
        if len(sps) == 1 and re.search(r"(?<![\w.])" + re.escape(i) + r"\. ?" + re.escape(e) + r"(?![\w])", t):
            found[next(iter(sps))].add("abbr")
    for ph, sp in nicks.items():
        if re.search(r"(?<![\w])" + re.escape(ph.lower()) + r"(?![\w])", t):
            found[sp].add("nickname")
    return {sp: sorted(k) for sp, k in found.items()}


def site_of(url):
    h = (urllib.parse.urlsplit(url).hostname or "").lower()
    if h.startswith("www."):
        h = h[4:]
    parts = h.split(".")
    return ".".join(parts[-3:]) if ".".join(parts[-2:]) in TWO_LEVEL else ".".join(parts[-2:])


# ---------------------------------------------------------------- derive (pure)


def common_key(s):
    return (-s["observers"], -s["cells"], -s["obs"], s["name"])


def stars_scores(species, pages, use_sites=None):
    """{name: (score, W, M, sites)} by the stars rule (module doc). species: the output's rows (wiki, name); pages: the
    output's pages (scope, readable, site, species). use_sites: only these sites (the leave-one-site-out check)."""
    sites = defaultdict(set)
    for p in pages:
        if p["scope"] in ("ph", "general") and p.get("readable") and (use_sites is None or p["site"] in use_sites):
            for n in p.get("species") or []:
                sites[n].add(p["site"])
    views = {s["name"]: (s.get("wiki") or {}).get("views", 0) if (s.get("wiki") or {}).get("kind") in ("own", "named") else 0
             for s in species}
    vmax, smax = max(views.values(), default=0), max((len(v) for v in sites.values()), default=0)
    out = {}
    for s in species:
        n = s["name"]
        w = math.log10(1 + views[n]) / math.log10(1 + vmax) if vmax else 0.0
        m = math.log(1 + len(sites[n])) / math.log(1 + smax) if smax else 0.0
        out[n] = (round((w + m) / 2, 4), round(w, 4), round(m, 4), len(sites[n]))
    return out


def stars_set(scores, size, add=(), remove=()):
    """The `size` best scores (ties: the larger W, then the name), above 0; then Pierre's add and remove."""
    best = sorted((n for n, v in scores.items() if v[0] > 0), key=lambda n: (-scores[n][0], -scores[n][1], n))[:size]
    return [n for n in best if n not in set(remove)] + [n for n in add if n not in best and n in scores]


def circles(species, stars, one, nxt):
    """{name: circle}: 1 = the stars plus the most common species up to `one`; then by commonness in blocks of nxt, the
    remainder in the last circle."""
    order = [s["name"] for s in sorted(species, key=common_key)]
    c1 = list(dict.fromkeys(list(stars) + [n for n in order if n not in stars][:max(0, one - len(stars))]))
    out = {n: 1 for n in c1}
    rest, k = [n for n in order if n not in out], 2
    for size in nxt:
        for n in rest[:size]:
            out[n] = k
        rest, k = rest[size:], k + 1
    for n in rest:
        out[n] = k
    return out


def derive(species, pages, src):
    """Sets each species' stars score, star flag, commonness rank and circle; returns the proposal summary."""
    sc = stars_scores(species, pages)
    st = src["stars"]
    stars = stars_set(sc, st["size"], st.get("add") or [], st.get("remove") or [])
    circ = circles(species, stars, src["circles"]["one"], src["circles"]["next"])
    for i, s in enumerate(sorted(species, key=common_key), 1):
        s["rank"] = i
    for s in species:
        v = sc[s["name"]]
        s["stars"] = {"score": v[0], "w": v[1], "m": v[2], "sites": v[3]}
        s["star"] = s["name"] in stars
        s["circle"] = circ[s["name"]]
    sites = sorted({p["site"] for p in pages if p["scope"] in ("ph", "general") and p.get("readable")})
    flips, core = {}, set(stars)
    for x in sites:  # leave one site out: how many of the stars change, and the stars that every such set keeps
        alt = stars_set(stars_scores(species, pages, set(sites) - {x}), st["size"], st.get("add") or [], st.get("remove") or [])
        flips[x] = len(set(alt) ^ set(stars)) // 2
        core &= set(alt)
    by = Counter(circ.values())
    tot = sum(s["observers"] for s in species)
    c1 = [s for s in sorted(species, key=common_key) if s["circle"] == 1]
    return {"status": "proposal for Pierre's review (Q369); not used by the app",
            "stars": stars, "starsCore": [n for n in stars if n in core], "circle1": [s["name"] for s in c1], "sizes": {str(k): by[k] for k in sorted(by)},
            "circle1ObserverShare": round(sum(s["observers"] for s in c1) / tot, 3) if tot else 0,
            "leaveOneSiteOut": {k: v for k, v in sorted(flips.items()) if v}}


# ---------------------------------------------------------------- build


def build(net, src, log=print):
    roots, place = src["roots"], src["area"]["inatPlace"]
    obs, pulls = [], {}
    for g, r in roots.items():
        o, urls = pull(net, r, place)
        obs += o
        pulls[g] = {"taxon": r, "obs": len(o), "pulled": min(filter(None, (net.date(u) for u in urls)), default=None)}
        log(f"{g}: {len(o)} Research Grade observations in the area")
    taxa, places = taxa_places(net, obs)
    allsp = aggregate(obs, roots, taxa, places, CENTRE)
    sp = {k: v for k, v in allsp.items() if v["phBy"]}
    log(f"species: {len(allsp)}, confirmed (rule C8): {len(sp)}")
    W = worms(net, [s["name"] for s in sp.values()])
    forms, claim = {}, defaultdict(set)
    for s in sp.values():
        w = W.get(s["name"])
        s["worms"] = None
        s["syn"], s["wormsEn"] = [], []
        if w:
            en, syn = worms_names(net, w["aphiaAcc"])
            s["worms"] = {"aphia": w["aphia"], "accepted": w["accepted"], "aphiaAcc": w["aphiaAcc"], "status": w["status"]}
            s["order"], s["family"] = w["order"], w["family"]
            s["wormsEn"], s["syn"] = en, [x for x in syn if x not in (s["name"], w["accepted"])]
        for n in {s["name"], *(([w["accepted"]] if w else [])), *s["syn"]}:
            claim[n].add(s["name"])
    for s in allsp.values():  # the unconfirmed are matched by iNaturalist's name only
        if not s["phBy"]:
            claim[s["name"]].add(s["name"])
    forms = {n: next(iter(v)) for n, v in claim.items() if len(v) == 1 and len(n.split()) >= 2}
    ambiguous = sorted(n for n, v in claim.items() if len(v) > 1)
    ids = sorted(s["inat"] for s in sp.values())
    for key, q in (("all", "quality_grade=research"), ("open", "quality_grade=research&photo_license=cc0,cc-by"),
                   ("nc", "quality_grade=research&photo_license=cc-by-nc"),
                   ("juv", f"quality_grade=research&term_id={LIFE_STAGE}&term_value_id={JUVENILE}")):
        got = world_counts(net, ids, q)
        for s in sp.values():
            if key == "juv":
                s["juv"]["world"] = got.get(s["inat"], 0)
            else:
                s["photos"]["world" + key.capitalize()] = got.get(s["inat"], 0)
    titles = wiki_titles(net, [s["name"] for s in sp.values()])
    shared = {t for t, n in Counter(titles.values()).items() if n > 1}
    wdates = []
    for s in sp.values():
        t = titles.get(s["name"])
        if t:
            views, u = wiki_views(net, t, src["wiki"])
            wdates.append(net.date(u))
            s["wiki"] = {"title": t, "views": views, "kind": article_kind(s["name"], t, shared)}
        else:
            s["wiki"] = None
    nick_t = wiki_titles(net, [x["title"] for x in src["nicknames"]])
    nicks, nick_out = {}, []
    for x in src["nicknames"]:
        lands = nick_t.get(x["title"])
        target = (sp.get(next((k for k, v in sp.items() if v["name"] == x["species"]), None)) or {}).get("wiki") or {}
        ok = not x.get("ask") and lands is not None and lands == target.get("title")
        nick_out.append({"phrases": x["phrases"], "species": x["species"], "wikiTitle": x["title"], "landsOn": lands,
                         "counted": ok, **({"ask": x["ask"]} if x.get("ask") else {})})
        for ph in x["phrases"]:
            if ok:
                nicks[ph] = x["species"]
        for s in sp.values():
            if s["name"] == x["species"]:
                s.setdefault("nick", []).extend(x["phrases"][:1])
    pages, unconf, confirmed = [], Counter(), {s["name"] for s in sp.values()}
    for p in src["pages"]:
        r = net.page(p["url"])
        rec = {"id": p["id"], "url": p["url"], "site": site_of(p["url"]), "scope": p["scope"], "kind": p.get("kind"),
               **({"place": p["place"]} if p.get("place") else {}), "pulled": net.date(p["url"]), "status": r["status"]}
        readable = r["status"] == 200 and r.get("html") and site_of(r.get("final") or p["url"]) == rec["site"]
        if r.get("final") and r["final"] != p["url"]:
            rec["final"] = r["final"]
        rec["readable"] = bool(readable)
        if readable:
            title, date, dsrc, text = page_text(r["html"])
            rec["title"], rec["date"] = title[:160], p.get("date") or date
            rec["dateFrom"] = "source file" if p.get("date") else dsrc
            found = mentions(text, forms, nicks)
            rec["species"] = sorted(n for n in found if n in confirmed)
            rec["how"] = {n: k for n, k in sorted(found.items()) if n in confirmed and k != ["name"]}
            rec["unconfirmed"] = sorted(n for n in found if n not in confirmed)
            if p["scope"] != "out":
                unconf.update(rec["unconfirmed"])
            rec["askNicknames"] = sorted({x["species"] for x in src["nicknames"] if x.get("ask") for ph in x["phrases"]
                                          if re.search(r"(?<![\w])" + re.escape(ph) + r"(?![\w])", norm_text(text))})
        pages.append(rec)
    species = sorted(sp.values(), key=common_key)
    proposal = derive(species, pages, src)
    by_group = Counter(s["group"] for s in species)
    meta = {
        "area": src["area"], "centre": CENTRE,
        "presence": {"phObservers": PH_OBSERVERS, "nearObservers": NEAR_OBSERVERS},
        "pulls": {"inat": pulls, "wiki": {"window": src["wiki"], "pulled": [min(filter(None, wdates), default=None),
                                                                            max(filter(None, wdates), default=None)]}},
        "counts": {"species": len(allsp), "confirmed": len(species), "byGroup": dict(sorted(by_group.items())),
                   "allByGroup": dict(sorted(Counter(s["group"] for s in allsp.values()).items())),
                   "nearDauin": sum(s["near"] for s in species), "obs": sum(s["obs"] for s in allsp.values()),
                   "wikiArticles": sum(1 for s in species if s["wiki"]),
                   "pagesReadable": sum(p["readable"] for p in pages if p["scope"] != "out")},
        "ambiguousNames": ambiguous, "nicknames": nick_out,
        "unconfirmedMentioned": dict(sorted(unconf.items())),
    }
    return species, pages, meta, proposal


ROW_KEYS = ("rank", "name", "worms", "group", "order", "family", "inatFamily", "genus", "en", "wormsEn", "nick", "syn",
            "obs", "observers", "prov", "provTop", "cells", "top", "nearObs", "nearObservers", "near", "phBy", "faved",
            "photos", "juv", "egg", "wiki", "stars", "star", "circle", "inat")


def dump(species, pages, meta, proposal):
    """Deterministic: one species and one page per line."""
    head = {"_doc": "Built by tools/build_seaslugs.py from tools/seaslug_source.json (its doc says how); the method, the "
                    "counts and the open questions: docs/reviews/2026-11-15-seaslug-list.md. Not read by the app.",
            "v": V, **meta, "proposal": proposal}
    lines = ["{"] + [f" {json.dumps(k)}: {json.dumps(v, ensure_ascii=False, sort_keys=True)}," for k, v in head.items()]
    lines.append(' "pages": [')
    lines += [" " + json.dumps(p, ensure_ascii=False, sort_keys=True) + ("," if i < len(pages) - 1 else "") for i, p in enumerate(pages)]
    lines.append(" ],")
    lines.append(' "species": [')
    rows = [{k: s[k] for k in ROW_KEYS if k in s} for s in species]
    lines += [" " + json.dumps(r, ensure_ascii=False) + ("," if i < len(rows) - 1 else "") for i, r in enumerate(rows)]
    lines.append(" ]")
    lines.append("}")
    return "\n".join(lines) + "\n"


def check(src):
    d = json.loads(OUT.read_text(encoding="utf-8"))
    species = [dict(s) for s in d["species"]]
    proposal = derive(species, d["pages"], src)
    bad = [s["name"] for s, o in zip(species, d["species"]) if any(s.get(k) != o.get(k) for k in ("rank", "stars", "star", "circle"))]
    if proposal != d["proposal"] or bad:
        print(f"tools/seaslugs.json is not what the derive stage gives: {bad[:10] or 'the proposal differs'}; "
              "run python3 tools/build_seaslugs.py --offline")
        return 1
    print(f"tools/seaslugs.json derives as written: {len(species)} species, {len(proposal['stars'])} stars, "
          f"circle 1 {len(proposal['circle1'])}")
    return 0


def main():
    a = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    a.add_argument("--offline", action="store_true")
    a.add_argument("--refresh", action="store_true")
    a.add_argument("--seed")
    a.add_argument("--dry", action="store_true")
    a.add_argument("--check", action="store_true")
    o = a.parse_args()
    src = json.loads(SRC.read_text(encoding="utf-8"))
    if o.check:
        sys.exit(check(src))
    net = Net(offline=o.offline, refresh=o.refresh, seed=o.seed)
    try:
        species, pages, meta, proposal = build(net, src)
    finally:
        net.save()
    print(f"stars: {', '.join(proposal['stars'])}")
    print(f"circle 1 ({len(proposal['circle1'])}): {', '.join(proposal['circle1'])}")
    print(f"circles: {proposal['sizes']}; leave one site out: {proposal['leaveOneSiteOut']}")
    print(f"requests: {dict(inat.calls)} + Wikipedia {dict(net.wiki.calls)}")
    if not o.dry:
        OUT.write_text(dump(species, pages, meta, proposal), encoding="utf-8")
        print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
