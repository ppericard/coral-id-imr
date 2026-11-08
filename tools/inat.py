"""The one HTTP client of the tools that ask iNaturalist (rule C7: about one request a second, batched, a User-Agent,
paced retries), and the batched counts several of them share.

Every tool that asks api.inaturalist.org goes through `get` (or a `Client` of its own in a test), so the pacing holds for
the whole process: a tool that calls another (fetch_fish.py --refill runs fetch_fishbase.py and --rep) never asks faster
than PACE between two requests to one host, whichever module asked.

    get(url, missing=False)   the parsed JSON reply. Waits PACE[host] after the last request to that host (1 s for
                              iNaturalist, 0.3 s for WoRMS). On HTTP 429, a 5xx, a network error, a timeout, a cut or
                              malformed reply: waits (Retry-After when the server gives one, at most RETRY_MAX, else
                              WAITS[k]) and tries again, failing only after the last wait; never in a tight loop. Another
                              4xx fails at once. missing=True: a 204, a 404 or an empty body reads as None (WoRMS answers
                              204 when nothing matches).
    UA                        the User-Agent every request sends: the project's name and the app's, no personal address
                              or account.
    chunks(xs, n)             xs in lists of n (n ids a request: `id=`, `taxon_id=`, /taxa/a,b,c).
    calls                     requests sent so far, by host (the request counts of #784).

The batched counts (rule C7: "observations/species_counts on a family rather than one call per species"), each exactly
what the one-taxon request it replaces would answer:
    leaf_counts(get, taxa, query)       {taxon: its observations matching query} from species_counts, BATCH taxa a request;
                                        None for a taxon whose count species_counts cannot give exactly (iNaturalist counts
                                        only leaf taxa: a species with an observed subspecies), to ask on its own.
    observer_counts(get, est, query, solo)
                                        {taxon: distinct observers of its observations matching query}: the observations
                                        of the taxa with few of them (est) read together, OBS_BATCH_PAGES pages of 200 at
                                        most a batch, their observers counted per taxon; solo(taxon) asks
                                        observations/observers for the others (and for a batch that holds more than its
                                        estimate said).
Tests: node --test tests/inat.test.js.
"""
import http.client
import json
import math
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter

UA = "coral-id-imr/1.0 (IMR Reef ID)"  # the project, no personal address or account
HEADERS = {"User-Agent": UA, "Accept": "application/json"}
API = "https://api.inaturalist.org/"
V1, V2 = API + "v1/", API + "v2/"
PACE = {"api.inaturalist.org": 1.0, "www.marinespecies.org": 0.3}  # seconds between two requests to one host
DEFAULT_PACE = 1.0
WAITS = (5, 15, 30, 60, 120)  # the pauses before each retry
RETRY_MAX = 300  # a Retry-After longer than this is cut to it
TIMEOUT = 90
BATCH = 100  # taxa per species_counts request (the URL stays short)
OBS_PAGE = 200  # observations per page (iNaturalist's most)
OBS_BATCH_PAGES = 5  # pages of observations a batch of observer_counts reads at most
OBS_BATCH_TAXA = 100  # taxa per batch of observer_counts


def chunks(xs, n):
    xs = list(xs)
    return [xs[i:i + n] for i in range(0, len(xs), n)]


class Client:
    """Paced, retried GETs (one instance per process: `CLIENT`). opener, sleep and clock are for the tests."""

    def __init__(self, opener=None, sleep=None, clock=None, waits=WAITS, pace=None, log=None):
        # Looked up at each call, so a test that patches urllib.request.urlopen or time.sleep reaches this client too.
        self.opener = opener or (lambda req, timeout: urllib.request.urlopen(req, timeout=timeout))
        self.sleep = sleep or (lambda s: time.sleep(s))
        self.clock = clock or (lambda: time.monotonic())
        self.waits = tuple(waits)
        self.pace = dict(PACE if pace is None else pace)
        self.log = log or (lambda m: print(m, file=sys.stderr))
        self.last = {}  # host -> clock() of its last request
        self.calls = Counter()

    def wait_turn(self, host):
        p = self.pace.get(host, DEFAULT_PACE)
        if host in self.last:
            left = self.last[host] + p - self.clock()
            if left > 0:
                self.sleep(left)
        self.last[host] = self.clock()

    def read(self, url, missing=False, timeout=TIMEOUT):
        """The body of url (bytes), or None (missing=True) for a 204 or a 404."""
        host = urllib.parse.urlsplit(url).hostname or ""
        for k in range(len(self.waits) + 1):
            self.wait_turn(host)
            self.calls[host] += 1
            try:
                with self.opener(urllib.request.Request(url, headers=HEADERS), timeout) as r:
                    if getattr(r, "status", 200) == 204:
                        return None
                    return r.read()
            except urllib.error.HTTPError as e:
                if missing and e.code in (204, 404):
                    return None
                if k == len(self.waits) or not (e.code == 429 or e.code >= 500):
                    raise
                ra = (e.headers or {}).get("Retry-After") if e.headers is not None else None
                wait = min(int(ra), RETRY_MAX) if ra and str(ra).strip().isdigit() else self.waits[k]
                why = f"HTTP {e.code}"
            except (OSError, http.client.HTTPException) as e:  # URLError, a reset or refused connection, a timeout
                if k == len(self.waits):
                    raise
                wait, why = self.waits[k], type(e).__name__
            self.log(f"  {host} busy ({why}), waiting {wait} s (try {k + 2} of {len(self.waits) + 1}): {url[:100]}")
            self.sleep(wait)

    def get(self, url, missing=False, timeout=TIMEOUT):
        """The parsed JSON reply to url (a malformed reply, a cut transfer, is retried like a 5xx)."""
        for k in range(len(self.waits) + 1):
            body = self.read(url, missing, timeout)
            if body is None or (missing and not body.strip()):
                return None
            try:
                return json.loads(body)
            except ValueError:
                if k == len(self.waits):
                    raise
                self.log(f"  malformed reply, waiting {self.waits[k]} s: {url[:100]}")
                self.sleep(self.waits[k])


CLIENT = Client()
calls = CLIENT.calls


def get(url, missing=False, timeout=TIMEOUT):
    return CLIENT.get(url, missing, timeout)


# ---------------------------------------------------------------- batched counts


def _strip(query, *keys):
    """query (URL parameters) without the given keys."""
    return "&".join(p for p in query.split("&") if p and p.split("=", 1)[0] not in keys)


def leaf_counts(get, taxa, query, batch=BATCH, estimate=False):
    """{taxon: number of observations of it (and below it) matching query}, as `observations?taxon_id=<taxon>&<query>`'s
    total_results, for many taxa a request (observations/species_counts). species_counts counts leaf taxa only (checked
    on iNaturalist, 2026-11-08: a genus with species observed loses its genus-level observations there): a taxon with a
    row of its own and no row below it is exact (its count), one with no row has none (0); one with a row below it (an
    observed subspecies, or a species under a genus asked) is None, to ask on its own: its observations at its own rank
    are not counted there. estimate=True: every taxon gets the sum of its rows and those below it instead (a lower bound,
    to plan batches)."""
    taxa = sorted(set(taxa))
    q = _strip(query, "taxon_id", "per_page", "page", "order_by", "order", "fields", "id_above", "id_below")
    out = {}
    for B in chunks(taxa, batch):
        rows, page, want = [], 1, set(B)
        while True:
            d = get(f"{V1}observations/species_counts?taxon_id={','.join(map(str, B))}&{q}&per_page=500&page={page}") or {}
            rows += d.get("results") or []
            if page * 500 >= (d.get("total_results") or 0) or not d.get("results"):
                break
            page += 1
        own, below, under = Counter(), set(), Counter()
        for r in rows:
            t = r.get("taxon") or {}
            if t.get("id") in want:
                own[t["id"]] += r.get("count") or 0
            for a in set(t.get("ancestor_ids") or []) - {t.get("id")}:
                if a in want:
                    below.add(a)
                    under[a] += r.get("count") or 0
        for x in B:
            out[x] = own[x] + under[x] if estimate else None if x in below else own[x]
    return out


def observer_counts(get, est, query, solo, pages=None, per=None):
    """{taxon: distinct observers of its observations (and those below it) matching query}, as
    `observations/observers?taxon_id=<taxon>&<query>`'s total_results. est: {taxon: its observations, or an estimate}.
    The taxa with few observations are read together, by id, every page of the batch to its end (at most `pages` pages
    of 200), and the observers counted per taxon asked (an observation counts for its taxon and every ancestor asked, as
    a request for that taxon alone would); a batch is only made when it costs fewer requests than its taxa. solo(taxon)
    answers the others (a taxon with many observations, a batch that turns out larger than its estimate)."""
    pages, per = OBS_BATCH_PAGES if pages is None else pages, OBS_BATCH_TAXA if per is None else per
    q = _strip(query, "taxon_id", "per_page", "page", "order_by", "order", "fields", "id_above", "id_below")
    small = sorted((x for x, n in est.items() if n is not None and n <= OBS_PAGE * pages), key=lambda x: (est[x], x))
    out, batches, B, total = {}, [], [], 0
    for x in small:
        if B and (total + est[x] > OBS_PAGE * pages or len(B) >= per):
            batches.append((B, total))
            B, total = [], 0
        B.append(x)
        total += est[x]
    if B:
        batches.append((B, total))
    rest = [x for x in est if x not in small]
    for B, total in batches:
        if max(1, math.ceil(total / OBS_PAGE)) >= len(B):  # no cheaper than asking each alone
            rest += B
            continue
        users = {x: set() for x in B}
        url = (f"{V2}observations?taxon_id={','.join(map(str, B))}&{q}&order_by=id&order=asc&per_page={OBS_PAGE}"
               "&fields=id,user.id,taxon.id,taxon.ancestor_ids")
        above, ok = 0, False
        for _ in range(pages):
            d = get(url + (f"&id_above={above}" if above else "")) or {}
            res = d.get("results") or []
            if not above and (d.get("total_results") or 0) > OBS_PAGE * pages:
                break  # more than the estimate said: each on its own
            if any(not (o.get("taxon") or {}).get("ancestor_ids") for o in res):
                break  # an observation whose ancestry is not said: each taxon on its own
            for o in res:
                t = o["taxon"]
                for a in {t.get("id"), *t["ancestor_ids"]}:
                    if a in users:
                        users[a].add((o.get("user") or {}).get("id"))
            if len(res) < OBS_PAGE or len(res) >= (d.get("total_results") or 0):  # the total counts from id_above on
                ok = True
                break
            above = max(o["id"] for o in res)
        if ok:
            out.update({x: len(u) for x, u in users.items()})
        else:
            rest += B
    for x in rest:
        out[x] = solo(x)
    return out
