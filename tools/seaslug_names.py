#!/usr/bin/env python3
"""Builds tools/seaslug_names.json: the English common names and nicknames of the sea slugs' families, genera and species
in the game (circles 1 to 3 of tools/seaslugs.json, tools/seaslug_game.py CIRCLES), each with its source(s).

Pierre, 2026-11-17 (~06:29 Manila): no common-name branch for the sea slugs, but their common names, at the family, genus
and species level, and their nicknames, shown wherever names are shown, when they exist. They are information only (Q369
(d): scientific names only in the game): tools/seaslug_game.py copies them into seaslug.json, the app shows them on the
sheets, the Learn tiles and after an answer, never as a choice.

Sources (rule C2: a name is kept only when a source gives it; the same sources the species list reads, plus pages read
by hand, as Pierre asked on 2026-11-17 ~06:34: "toutes les sources possibles"):
  inat   iNaturalist taxa (/v1/taxa/<ids>?all_names=true&locale=en, 30 taxa a request, through tools/inat.py: rule C7):
         its English name (preferred_common_name) and the other names of its English lexicon (Latin script only: a name
         in another script filed under English is left out);
  worms  WoRMS (AphiaRecordsByMatchNames for the genera and families, 50 names a request; AphiaVernacularsByAphiaID for
         each taxon): its vernaculars in English;
  wiki   English Wikipedia (action=query, 20 titles a request, the intros and the redirects together): the article's own
         title when the taxon's name redirects to an article under an English name ("Spanish dancer"); the names its
         intro gives ("commonly known as", "also known as", "nicknamed": `said`, with the sentence); the redirects to the
         article that are English names (`redirect_names`: a possessive, a word of the sea slugs' English vocabulary or an
         English family plural; never a word of the taxon's scientific names and synonyms, never a genus of the subject
         first);
  guide  the specialist guides of tools/seaslug_names_src.json `guides`, read as public pages (2 s apart, a generic
         User-Agent; a page that refuses is recorded, never fetched another way): an index page (kind "index": Florent's
         Guide, each link to a species page named by a scientific name of the taxon, its text the guide's English name),
         or one page per species (kind "species": SEASLUG.WORLD, its heading's English name beside the scientific name it
         checks); their links are kept in the output (`guides`), so the merge is offline;
  web    pages read by hand (tools/seaslug_names_src.json `web`: the taxon, the name, the page, the words that give it, the
         date read; `src` "wiki" for a Wikipedia page read so), for the names the APIs and guides miss (Pierre,
         2026-11-17 ~06:34: specialist sites, guides and articles that use the nicknames, besides the general sources).
A name is a nickname (nick) when its source says so: the intro calls it a nickname ("nicknamed", "nickname"), or a page
of `web` does (its `nick`). Each taxon's names: one per spelling (case, hyphens and apostrophes aside), in this order: the
number of sources giving it, then iNaturalist's preferred name, then by source (inat, worms, wiki, web) and as each
source lists them (inat, worms, wiki, guide, web). The first is the one the app shows first (learn.js, quiz.js).

Disagreements (rule C5): one name given to two taxa by the sources (`shared`) is listed, never settled: points.json holds
them for Pierre (subj seaslug, kind names).

Two stages, as tools/build_seaslugs.py:
  fetch (network; every reply cached in tools/.cache/seaslug_names.json, git-ignored; a rerun is offline): writes each
    taxon's raw replies, reduced to the names (`raw`);
  derive (offline, pure: `derive`): from `raw` and tools/seaslug_names_src.json to `names` and `shared`. `--check`
    reruns it on the committed file and fails when the file disagrees or misses a taxon of the game (CI has no cache).

Usage: python3 tools/seaslug_names.py [--offline] [--no-wiki]
       python3 tools/seaslug_names.py --check
Tests: node --test tests/seaslug-names.test.js.
"""
import argparse
import datetime
import json
import re
import sys
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import inat  # noqa: E402  (the one paced, retried client; rule C7)
from seaslug_game import CIRCLES  # noqa: E402

LIST = ROOT / "tools" / "seaslugs.json"
SRC = ROOT / "tools" / "seaslug_names_src.json"
OUT = ROOT / "tools" / "seaslug_names.json"
CACHE = ROOT / "tools" / ".cache" / "seaslug_names.json"
V = 1
WORMS = "https://www.marinespecies.org/rest/"
WIKI = "https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&"
ORDER = ("inat", "worms", "wiki", "guide", "web")
PAGE_GAP = 2.0  # seconds between two page reads (tools/build_seaslugs.py)
PAGE_UA = "Mozilla/5.0 (compatible; page-reader/1.0)"  # a generic User-Agent for public pages: no project, no person
RANKS = ("family", "genus", "species")
# About one request a second to every host (rule C7, and the same pace for WoRMS and Wikipedia); Wikipedia's 429 waits
# long (wikimedia.org rate-limits hard: tools/build_seaslugs.py).
PACE = {"api.inaturalist.org": 1.0, "www.marinespecies.org": 1.0, "en.wikipedia.org": 2.0}
LATIN = re.compile(r"^[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ'’ .-]*$")


def today():
    """The date in Manila, as the project dates its records."""
    from zoneinfo import ZoneInfo
    return datetime.datetime.now(ZoneInfo("Asia/Manila")).date().isoformat()


def load(p, default=None):
    return json.loads(Path(p).read_text(encoding="utf-8")) if Path(p).exists() else default


# ---------------------------------------------------------------- the taxa


def taxa_of(L):
    """[(rank, name)] of the game's families, genera and species (circles CIRCLES of tools/seaslugs.json), each once, in
    the list's order (by circle, then commonness), families and genera at their first species; with each species' record."""
    sp = sorted((s for s in L["species"] if s.get("circle") in CIRCLES), key=lambda s: (s["circle"], s["rank"]))
    out, seen = [], set()
    for s in sp:
        for k in (("family", s["family"]), ("genus", s["genus"]), ("species", s["name"])):
            if k not in seen:
                seen.add(k)
                out.append((k[0], k[1], s if k[0] == "species" else None))
    return out


# ---------------------------------------------------------------- names: reading the sources


def key(n):
    """A name's spelling key: case, hyphens, apostrophes, spaces and the plural aside ("Sea Hares", "Seahare")."""
    k = re.sub(r"[\s\-'’]+", "", str(n or "").lower())
    return k[:-3] + "y" if k.endswith("ies") else k[:-1] if k.endswith("s") and not k.endswith("ss") else k


def clean(n):
    """A name as a source gives it, trimmed; '' when it is no English name (another script, digits, too short or long)."""
    n = re.sub(r"\s+", " ", str(n or "")).strip().strip("\"“”'‘’").strip()
    if not n or not LATIN.match(n) or len(n) < 3 or len(n.split()) > 6:
        return ""
    return n


def inat_names(t):
    """{pref, en} of an iNaturalist taxon reply (all_names=true, locale=en): its preferred English name and every name of
    its English lexicon, in its order, Latin script only."""
    pref = clean(t.get("preferred_common_name"))
    en = []
    for x in sorted(t.get("names") or [], key=lambda x: x.get("position") or 0):
        if (x.get("lexicon") or "").lower() == "english" and x.get("is_valid", True) is not False:
            n = clean(x.get("name"))
            if n and n not in en:
                en.append(n)
    return {"pref": pref, "en": en}


def inat_sci(t):
    """The scientific names of an iNaturalist taxon reply (its name and its 'scientific-names' lexicon: synonyms)."""
    return sorted({t.get("name") or ""} | {x.get("name") for x in t.get("names") or []
                                           if (x.get("lexicon") or "").lower() == "scientific-names" and x.get("name")} - {""})


def worms_names(v):
    """The English vernaculars of an AphiaVernacularsByAphiaID reply, in its order."""
    out = []
    for x in v or []:
        if x.get("language_code") == "eng":
            n = clean(x.get("vernacular"))
            if n and n not in out:
                out.append(n)
    return out


SAID = re.compile(r"(?P<how>(?:(?:commonly|also|popularly|sometimes|often|colloquially|informally)\s+)?(?:known|referred\s+to|called)"
                  r"\s+as|nicknamed|(?:a|its|the)\s+nickname\s+(?:is|of)|common\s+names?(?:\s+(?:is|are|include|includes))?)\s+"
                  r"(?P<list>[^.;:()]+)", re.I)
CUT = re.compile(r"\s+(?:is|are|was|were|because|due|for|in|from|after|which|that|by|on|owing|as)\b.*$", re.I)
# The words of the sea slugs' English names: a redirect to an article holding none of them (and no possessive, no English
# family plural such as "chromodorids") is taken for a scientific name (a synonym, an older binomial, a subfamily).
VOCAB = {"slug", "slugs", "nudibranch", "nudibranchs", "nudi", "nudis", "sea", "sheep", "bunny", "bunnies", "dancer",
         "dancers", "hare", "hares", "dorid", "dorids", "dragon", "dragons"}


def scientific(n, genera):
    """Whether a name taken from prose is a scientific one: a genus of the subject first (Tambja kushimotoensis), or one
    capitalised word ("Noumea": English names in prose are lower case)."""
    w = n.split()
    return w[0].lower() in {g.lower() for g in genera} or (len(w) == 1 and n[:1].isupper())


def said(text, sci=(), genera=()):
    """[[name, nick (0/1), the sentence]] the intro text gives: what follows "known as", "also known as", "called",
    "nicknamed", "common name is", or the title's ", or …," ("Chromodorididae, or chromodorids, are"), split on commas
    and "or" / "and", each a name of at most six words; a nickname when the words say so. sci: the taxon's scientific
    names, never kept as a name; genera: the subject's genera (scientific)."""
    out, S = [], {key(x) for x in sci}
    # the words before "known as" must be the taxon itself ("Jorunna parva, commonly known as", "It is sometimes also
    # nicknamed", "Its common names are", "Also known as"), never another subject ("… are part of Sacoglossa, also known
    # as the solar powered sea slugs")
    subj = re.compile(r"\s*(?:(?:the\s+)?(?:" + "|".join(re.escape(x) for x in sci if x) + r")\s*[,(]?\s*|it\s+is\s+(?:\w+\s+){0,3}|"
                      r"its\s+|also\s+)?", re.I) if any(sci) else re.compile(r"\s*(?:it\s+is\s+(?:\w+\s+){0,3}|its\s+|also\s+)?", re.I)
    sents = re.split(r"(?<=[.!?])\s+", str(text or ""))
    for i, sent in enumerate(sents):
        found = [(1 if "nick" in m.group("how").lower() else 0, m.group("list")) for m in SAID.finditer(sent)
                 if subj.fullmatch(sent[:m.start()])]
        if i == 0:
            for x in sci:
                m = (re.match(r"(?:the\s+)?" + re.escape(x) + r",?\s+\(?or\s+(?:the\s+)?([^,.;()]+)[,)]", sent, re.I)
                     or re.match(r"(?:the\s+)?" + re.escape(x) + r",\s+the\s+([^,.;()]+),\s+(?:is|are|was|were)\b", sent, re.I))
                if m:
                    found.append((0, m.group(1)))
        for nick, lst in found:
            lst = CUT.sub("", lst)
            for part in re.split(r",\s*|\s+or\s+|\s+and\s+", lst):
                part = re.sub(r"^(?:(?:or|and|the|a|an)\s+)+", "", part.strip(), flags=re.I)
                n = clean(part)
                if n and key(n) not in S and not scientific(n, genera) and not any(o[0] == n for o in out):
                    out.append([n, nick, sent.strip()[:300]])
    return out


def redirect_names(redirects, sci, genera):
    """The redirects to an article that are English names: a possessive ("Gardiner's headshield slug"), a word of the
    sea slugs' English vocabulary (VOCAB: sea bunny, slipper slug, Pikachu nudibranch) or an English family plural
    ("Chromodorids", "Pleurobranchid"); never a scientific name of the taxon (its name, its synonyms) nor a word of one,
    nor a name starting with a genus of the subject (a misspelt or older binomial); Latin script."""
    S = {w.lower() for x in sci for w in str(x).split()}
    G = {g.lower() for g in genera}
    out = []
    for r in redirects or []:
        n = clean(r)
        if not n:
            continue
        w = re.findall(r"[a-z]+", n.lower())
        english = ("'" in n or "’" in n or any(x in VOCAB for x in w)
                   or (len(n.split()) == 1 and re.search(r"[a-np-z]ids?$", n) is not None))
        if not english or w[0] in G or any(x in S for x in n.lower().split()) or key(n) in {key(x) for x in sci}:
            continue
        if n not in out:
            out.append(n)
    return out


# ---------------------------------------------------------------- derive (pure)


def anchors(html, base):
    """[[the linked page's stem, the link's text, its URL]] of a guide's index page (kind "index"): each
    <a href="stem.html">text</a>, in order; base: the index's folder."""
    out = []
    for m in re.finditer(r'<a\s+href="([A-Za-z0-9_-]+)\.html?"\s*>([^<]+)</a>', html or "", re.I):
        t = html_text(m.group(2))
        if t and not any(o[0] == m.group(1).lower() for o in out):
            out.append([m.group(1).lower(), t, base + m.group(1) + ".html"])
    return out


def html_text(s):
    import html as H
    return re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()


def heading(html):
    """(English name, scientific name) of a guide's species page (kind "species"): its first <h1>, the English name
    before a <small> holding the scientific name in <em> ("Anna's Chromodoris <small><em>Chromodoris annae</em>");
    ('', the name) when the heading is the scientific name alone; None without one."""
    m = re.search(r"<h1[^>]*>(.*?)</h1>", html or "", re.I | re.S)
    if not m:
        return None
    h = m.group(1)
    sm = re.search(r"<small>\s*<em>(.*?)</em>", h, re.I | re.S)
    if sm:
        return html_text(h[:sm.start()]), html_text(sm.group(1))
    em = re.match(r"\s*<em>(.*?)</em>", h, re.I | re.S)
    return ("", html_text(em.group(1))) if em else None


def stem(n):
    """A scientific name as a guide's page names it: lower case, letters only (Chromodoris annae: chromodorisannae)."""
    return re.sub(r"[^a-z]", "", str(n or "").lower())


def guide_names(t, guides):
    """[[name, {t, u}]] the guides' indexes give taxon t: a link whose page is named by the taxon's scientific name or
    one of its synonyms (t sci), its text the guide's English name for it."""
    S = {stem(x) for x in [t["name"], *(t.get("sci") or [])] if len(str(x).split()) >= (2 if t["rank"] == "species" else 1)}
    out = []
    for g in guides or []:
        for st, text, u in g.get("links") or []:
            if st in S and text:
                out.append([text, {"t": g["t"], "u": u}])
    return out


def derive(taxa, web=(), guides=()):
    """(names by taxon index, shared) from the taxa's raw replies, the guides' indexes (guides: [{t, u, links}]) and the
    hand-read pages (web: [{taxon, rank, name, nick, t, u, words, read}]). Each taxon's names: [{n, src [the sources],
    nick: 1 when one says so, web: [{t, u}] the guide and web pages}], ordered as the module doc says. shared: [{n, taxa
    [[rank, name, [sources]]]}], a name given to two taxa or more."""
    allnames = []
    for i, t in enumerate(taxa):
        raw, sci = t.get("raw") or {}, set(t.get("sci") or []) | {t["name"]}
        S = {key(x) for x in sci}
        got = {}  # key -> {n, src set, nick, web, first (source rank, position)}

        def put(n, src, pos, nick=0, w=None):
            n = clean(n)
            if not n or key(n) in S:
                return
            k = key(n)
            e = got.setdefault(k, {"n": n, "src": set(), "nick": 0, "web": [], "at": (ORDER.index(src), pos), "sp": {}})
            # its spellings (case aside): the one most sources give is shown, as its first source wrote it
            e["sp"].setdefault(n.lower(), [n, set()])[1].add(src)
            e["src"].add(src)
            e["nick"] = e["nick"] or nick
            if w and w not in e["web"]:
                e["web"].append(w)
            e["at"] = min(e["at"], (ORDER.index(src), pos))

        I = raw.get("inat") or {}
        if I.get("pref"):
            put(I["pref"], "inat", -1)
        for j, n in enumerate(I.get("en") or []):
            put(n, "inat", j)
        for j, n in enumerate(raw.get("worms") or []):
            put(n, "worms", j)
        W = raw.get("wiki") or {}
        if W.get("kind") == "named":
            put(W["title"], "wiki", -1)
        for j, (n, nick, _) in enumerate(W.get("said") or []):
            put(n, "wiki", j, nick)
        for j, n in enumerate(W.get("names") or []):
            put(n, "wiki", 100 + j)
        for j, (n, w) in enumerate(guide_names(t, guides)):
            put(n, "guide", j, 0, w)
        for j, x in enumerate(w for w in web if w["taxon"] == t["name"] and w["rank"] == t["rank"]):
            put(x["name"], x.get("src") or "web", j, 1 if x.get("nick") else 0, {"t": x["t"], "u": x["u"]})
        pref = key(I.get("pref"))
        L = sorted(got.items(), key=lambda kv: (-len(kv[1]["src"]), kv[0] != pref, kv[1]["at"]))
        for e in got.values():
            e["n"] = max(e["sp"].values(), key=lambda v: len(v[1]))[0]  # max keeps the first of equals: the first met
        names = [{"n": e["n"], "src": [s for s in ORDER if s in e["src"]], **({"nick": 1} if e["nick"] else {}),
                  **({"web": e["web"]} if e["web"] else {})} for _, e in L]
        allnames.append(names)
    by = {}
    for t, names in zip(taxa, allnames):
        for x in names:
            by.setdefault(key(x["n"]), []).append([t["rank"], t["name"], x["src"], x["n"]])
    shared = [{"n": L[0][3], "taxa": [x[:3] for x in L]} for k, L in sorted(by.items()) if len(L) > 1]
    return allnames, shared


# ---------------------------------------------------------------- fetch (network, cached)


class Net:
    def __init__(self, offline=False, wiki=True):
        self.offline, self.wiki = offline, wiki
        c = load(CACHE, {})
        self.c, self.at = c.get("r", {}), c.get("at", {})
        self.client = inat.Client(pace={**inat.PACE, **PACE}, waits=(30, 60, 120, 300, 600))
        # Wikipedia: one paced retry after a minute, then recorded as refused (its 429s last: tools/build_seaslugs.py)
        self.wclient = inat.Client(pace=PACE, waits=(60,))
        self.refused = None
        self.new = 0

    def get(self, url):
        if url in self.c:
            return self.c[url]
        if self.offline:
            sys.exit(f"--offline: not cached: {url}")
        v = (self.wclient if url.startswith(WIKI) else self.client).get(url, missing=True)
        self.c[url], self.at[url] = v, today()
        self.new += 1
        if self.new % 25 == 0:
            self.save()
        return v

    def page(self, url):
        """A public page's HTML, read once (PAGE_GAP between two reads, a generic User-Agent); None when it refuses (the
        refusal recorded, never retried another way)."""
        k = "page:" + url
        if k in self.c:
            return self.c[k]
        if self.offline:  # a page cut at the last run: none this time, the next online run asks again
            print(f"  --offline: page not cached: {url}", file=sys.stderr)
            return None
        import http.client
        import time
        import urllib.error
        import urllib.request
        time.sleep(PAGE_GAP)
        req = urllib.request.Request(url, headers={"User-Agent": PAGE_UA, "Accept": "text/html"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                v = r.read().decode(r.headers.get_content_charset() or "utf-8", errors="replace")
        except urllib.error.HTTPError as e:  # missing (404) or refused (403…): recorded, never asked another way
            print(f"  page {e.code}: {url}", file=sys.stderr)
            v = None
        except (OSError, ValueError, http.client.HTTPException) as e:  # a cut connection: not kept, the next run asks again
            print(f"  page cut ({type(e).__name__}), not kept: {url}", file=sys.stderr)
            return None
        self.c[k], self.at[k] = v, today()
        return v

    def save(self):
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        tmp = CACHE.with_suffix(".tmp")
        tmp.write_text(json.dumps({"r": self.c, "at": self.at}, sort_keys=True, separators=(",", ":")), encoding="utf-8")
        tmp.replace(CACHE)


def inat_taxa(net, ids):
    out = {}
    for B in inat.chunks(sorted(set(ids)), 30):
        d = net.get(f"{inat.V1}taxa/{','.join(map(str, B))}?all_names=true&locale=en&per_page=30") or {}
        for t in d.get("results") or []:
            out[t["id"]] = t
    return out


def worms_match(net, names):
    """{name: AphiaID} of the accepted genus or family record matching each name exactly."""
    out = {}
    for B in inat.chunks(sorted(names), 50):
        q = "&".join("scientificnames[]=" + urllib.parse.quote(n) for n in B)
        d = net.get(f"{WORMS}AphiaRecordsByMatchNames?{q}&marine_only=false") or []
        for n, recs in zip(B, d):
            ok = [r for r in recs or [] if r.get("match_type") == "exact" and r.get("scientificname") == n]
            r = next((r for r in ok if r.get("status") == "accepted"), ok[0] if ok else None)
            if r:
                out[n] = r.get("valid_AphiaID") or r["AphiaID"]
    return out


def wiki_pages(net, names):
    """{name: {title, kind, extract, redirects}} for the names with an English Wikipedia article (redirects followed)."""
    out = {}
    for B in inat.chunks(sorted(names), 20):
        d = net.get(WIKI + "redirects=1&prop=extracts|redirects&exintro=1&explaintext=1&exlimit=20&rdlimit=max&rdnamespace=0"
                    "&titles=" + urllib.parse.quote("|".join(B))) or {}
        q = d.get("query") or {}
        red = {r["from"]: r["to"] for r in q.get("redirects") or []}
        norm = {r["from"]: r["to"] for r in q.get("normalized") or []}
        pages = {p["title"]: p for p in q.get("pages") or [] if not p.get("missing") and not p.get("invalid")}
        for n in B:
            t = red.get(norm.get(n, n), norm.get(n, n))
            if t in pages:
                p = pages[t]
                out[n] = {"title": t, "extract": p.get("extract") or "",
                          "redirects": [r["title"] for r in p.get("redirects") or []]}
        cont = d.get("continue")
        while cont and "rdcontinue" in cont:  # more redirects than one reply holds
            d = net.get(WIKI + "redirects=1&prop=redirects&rdlimit=max&rdnamespace=0&rdcontinue=" + urllib.parse.quote(
                cont["rdcontinue"]) + "&titles=" + urllib.parse.quote("|".join(B))) or {}
            for p in (d.get("query") or {}).get("pages") or []:
                for n, o in out.items():
                    if o["title"] == p.get("title"):
                        o["redirects"] += [r["title"] for r in p.get("redirects") or [] if r["title"] not in o["redirects"]]
            cont = d.get("continue")
    return out


def kind(name, title, sci, genera):
    """own: the taxon's article; other: an article under another scientific name (a species redirected to its genus, a
    synonym, an older binomial: one word, or a scientific name of the taxon, or a subject's genus first); named: an
    article of its own under an English name ("Spanish dancer")."""
    if title == name:
        return "own"
    w = title.split()
    if len(w) == 1 or title in sci or w[0] in genera or w[0] in {x.split()[0] for x in sci}:
        return "other"
    return "named"


def fetch(net, L, log=print):
    T = taxa_of(L)
    sp = {name: s for rank, name, s in T if s}
    allgen = sorted({s["genus"] for s in L["species"]})
    # iNaturalist: the species by id; their genera and families by the ancestors the species replies name
    it = inat_taxa(net, [s["inat"] for s in sp.values()])
    anc = {}
    for s in sp.values():
        for a in (it.get(s["inat"]) or {}).get("ancestors") or []:
            if a.get("rank") in ("genus", "family"):
                anc[(a["rank"], a["name"])] = a["id"]
    up = inat_taxa(net, [anc[(r, n)] for r, n, _ in T if (r, n) in anc])
    wm = worms_match(net, [n for r, n, _ in T if r != "species"])
    wiki = {}
    if net.wiki:
        try:
            if net.offline and "wiki:refused" in net.c:
                raise RuntimeError(net.c["wiki:refused"])
            wiki = wiki_pages(net, [n for _, n, _ in T])
        except (RuntimeError, OSError, ValueError) as e:  # refused after the paced retry (wikimedia.org's 429): recorded
            net.c["wiki:refused"] = net.c.get("wiki:refused") if net.offline else f"{today()}: {e}"[:200]
            net.wiki, net.refused = False, f"refused ({net.c['wiki:refused']})"
            log(f"Wikipedia: {net.refused}; its names come only from the pages read by hand (seaslug_names_src.json web)")
    out = []
    for rank, name, s in T:
        iid = s["inat"] if s else anc.get((rank, name))
        I = (it if s else up).get(iid) or {}
        aphia = ((s.get("worms") or {}).get("aphiaAcc") if s else wm.get(name))
        V = net.get(f"{WORMS}AphiaVernacularsByAphiaID/{aphia}") if aphia else None
        sci = sorted(set(inat_sci(I)) | set((s or {}).get("syn") or []) | ({(s.get("worms") or {}).get("accepted")} if s else set())
                     - {None, ""})
        w = wiki.get(name)
        W = None
        if w:
            k = kind(name, w["title"], sci, set(allgen) | {s0["family"] for s0 in L["species"]})
            W = {"title": w["title"], "kind": k}
            if k != "other":
                W["said"] = said(w["extract"], [name, w["title"], *sci], allgen)
                W["names"] = redirect_names(w["redirects"], [name, *sci], allgen)
        out.append({"rank": rank, "name": name, **({"inat": iid} if iid else {}), **({"worms": aphia} if aphia else {}),
                    **({"sci": [x for x in sci if x != name]} if [x for x in sci if x != name] else {}),
                    "raw": {"inat": inat_names(I) if I else None, "worms": worms_names(V) if aphia else None,
                            "wiki": W if net.wiki else None}})
    log(f"taxa: {len(out)}; iNaturalist {sum(1 for t in out if t['raw']['inat'])}, WoRMS "
        f"{sum(1 for t in out if t['raw']['worms'] is not None)}, Wikipedia articles {sum(1 for t in out if t['raw']['wiki'])}")
    return out


# ---------------------------------------------------------------- output


def dump(head, taxa):
    lines = ["{"] + [f" {json.dumps(k)}: {json.dumps(v, ensure_ascii=False, sort_keys=True)}," for k, v in head.items()]
    lines.append(' "taxa": [')
    lines += [" " + json.dumps(t, ensure_ascii=False) + ("," if i < len(taxa) - 1 else "") for i, t in enumerate(taxa)]
    lines += [" ]", "}"]
    return "\n".join(lines) + "\n"


def read_guides(net, src, species):
    """[{t, u, kind, read, links [[stem, English name, page]]}] of the guides (tools/seaslug_names_src.json guides): an
    index page (kind "index"), its links; or one page per species (kind "species", u a template with {genus} and
    {species}), each page's heading, kept when its scientific name is the one asked. species: the game's species names.
    A page that refuses or is missing gives nothing (counted in `missing`)."""
    out = []
    for g in (src or {}).get("guides") or []:
        if g.get("kind") == "species":
            links, miss, dates = [], 0, []
            for n in species:
                gs, sp = n.lower().split()[:2]
                u = g["u"].format(genus=gs, species=sp)
                h = heading(net.page(u))
                dates.append(net.at.get("page:" + u))
                if h and stem(h[1]) == stem(n):
                    links.append([stem(n), h[0], u])
                else:
                    miss += 1
            out.append({"t": g["t"], "u": g["u"], "kind": "species", "read": min(filter(None, dates), default=None),
                        "missing": miss, "links": [x for x in links if x[1]]})
        else:
            h = net.page(g["u"])
            out.append({"t": g["t"], "u": g["u"], "kind": "index", "read": net.at.get("page:" + g["u"]),
                        "links": anchors(h, g["u"].rsplit("/", 1)[0] + "/") if h else [], **({} if h else {"refused": True})})
    return out


def assemble(taxa, src, pulled, guides=()):
    names, shared = derive(taxa, (src or {}).get("web") or [], guides)
    rows = [{**{k: v for k, v in t.items() if k != "names"}, "names": n} for t, n in zip(taxa, names)]
    cnt = {r: {"taxa": sum(1 for t in rows if t["rank"] == r),
               "named": sum(1 for t in rows if t["rank"] == r and t["names"]),
               "nick": sum(1 for t in rows if t["rank"] == r and any(x.get("nick") for x in t["names"]))} for r in RANKS}
    head = {
        "_doc": "Built by tools/seaslug_names.py (its doc says how): the English common names and nicknames of the sea "
                "slugs in the game, each with its sources; raw is what each source gave, names the merge. "
                "tools/seaslug_game.py copies the names into seaslug.json.",
        "v": V,
        "pulled": pulled,
        "counts": cnt,
        "shared": shared,
        "guides": list(guides),
    }
    return head, rows


def check(L, src):
    d = load(OUT)
    if not d:
        print("tools/seaslug_names.json is missing: run python3 tools/seaslug_names.py")
        return 1
    want = [(r, n) for r, n, _ in taxa_of(L)]
    have = [(t["rank"], t["name"]) for t in d["taxa"]]
    if want != have:
        miss = [f"{r} {n}" for r, n in want if (r, n) not in have]
        print(f"tools/seaslug_names.json does not hold the game's taxa: missing {miss[:10]}, "
              f"{len([x for x in have if x not in want])} more; run python3 tools/seaslug_names.py")
        return 1
    head, rows = assemble([{k: v for k, v in t.items() if k != "names"} for t in d["taxa"]], src, d["pulled"],
                          d.get("guides") or [])
    if dump(head, rows) != OUT.read_text(encoding="utf-8"):
        print("tools/seaslug_names.json is not what the derive stage gives: run python3 tools/seaslug_names.py --offline")
        return 1
    c = d["counts"]
    print("tools/seaslug_names.json derives as written: " + "; ".join(
        f"{r} {c[r]['named']}/{c[r]['taxa']} named, {c[r]['nick']} with a nickname" for r in RANKS)
        + f"; {len(d['shared'])} names on two taxa")
    return 0


def main():
    a = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    a.add_argument("--offline", action="store_true")
    a.add_argument("--no-wiki", action="store_true", help="leave Wikipedia out (raw wiki null)")
    a.add_argument("--check", action="store_true")
    o = a.parse_args()
    L, src = load(LIST), load(SRC, {})
    if o.check:
        sys.exit(check(L, src))
    net = Net(offline=o.offline, wiki=not o.no_wiki)
    try:
        taxa = fetch(net, L)
        guides = read_guides(net, src, [t["name"] for t in taxa if t["rank"] == "species"])
    finally:
        net.save()
    dates = lambda pre: sorted(d for u, d in net.at.items() if u.startswith(pre) and u in net.c)
    pulled = {}
    for k, pre in (("inat", inat.V1), ("worms", WORMS), ("wiki", WIKI)):
        D = dates(pre)
        pulled[k] = [D[0], D[-1]] if D else None
    if net.refused:
        pulled["wiki"] = net.refused
    head, rows = assemble(taxa, src, pulled, guides)
    OUT.write_text(dump(head, rows), encoding="utf-8")
    c = head["counts"]
    print("; ".join(f"{r}: {c[r]['named']}/{c[r]['taxa']} named, {c[r]['nick']} nickname" for r in RANKS))
    print(f"names on two taxa: {len(head['shared'])}; requests: {dict(net.client.calls)}; wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
