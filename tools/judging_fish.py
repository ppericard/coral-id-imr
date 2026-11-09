#!/usr/bin/env python3
"""Fish candidate pass: the pre-sort of fish-cand.json, on the fish judging rubric (judging/FISH.md).

One fish judging vocabulary (Pierre, 2026-11-04): a candidate is judged on the same visual code as the game photos
(judging/FISH.md "Tags": view, whole, light, colour loss, clarity, size in the frame, count / subject obvious, the
juvenile, camouflage and out-of-water flags, ease 1-5), plus what only a candidate needs: keep (best / alt / dup within
its observation), the IMR phase when the photo shows one, a suggested crop. **Visual criteria only**: the species is the
iNaturalist identification by human experts (Research Grade, or Pierre's own), taken as given; the pass never says
whether a photo shows the right species. Its sure decisions (autosort.js fishSure) go through the admin's auto-sort once
the fish curation exists (admin plan PR 4); nothing here writes curation.json.

    python3 tools/judging_fish.py sheets [id ...]   download the photos (judging/fish/img/, not in git) and build contact
                                                   sheets per species (judging/fish/sheets/<species id>/), 12 tiles at
                                                   most, observation by observation, an observation never split over two
                                                   sheets (one of more than 12 photos fills sheets of its own), so its
                                                   near-duplicates are side by side; prints tile number -> photo,
                                                   observation, iNat annotation; ids = species (s091) or teaching entries
                                                   (t01)
    python3 tools/judging_fish.py big <photo>      the 1024 px version, for a closer look
    python3 tools/judging_fish.py todo             species with candidates not judged yet
    python3 tools/judging_fish.py rep              re-apply the reference flag (fish-cand.json rep) to suggest.json "fish"
    python3 tools/judging_fish.py codes            re-apply the judging files' codes, unsure fields and notes to the
                                                   candidates already judged in suggest.json "fish" (a re-judge of some
                                                   tags, e.g. the other species split, Q323)
    python3 tools/judging_fish.py --check [id ...] check judging/fish/<species id>.json, write nothing (exit 1 on error)
    python3 tools/judging_fish.py [id ...]         check, then import every species that passes into suggest.json "fish"

judging/fish/<species id>.json = {"photos": {photo: {code, keep, phase, crop, unsure, note}}}; suggest.json "fish"
{photo: {jt, e, k, ph, c, u, n}} (autosort.js fishSure reads it): jt the tags and e the ease after the rubric's caps
(tools/fish_judge.py cap, the same as the game photos' jt and e in fish-photos.json), c the proposed crop; "by" {species: {fish: {by, at, n}}}. Re-importing a species replaces its candidates' entries; the rest is kept.
"""
import datetime
import json
import os
import sys
import urllib.request
from collections import Counter, OrderedDict, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fish_judge import CODE, NEW_COUNT, cap, juv_early  # noqa: E402  the rubric's code and caps, one for game photos and candidates

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)  # noqa: E731


def load(p, d=None):
    try:
        return json.load(open(P(p), encoding="utf-8"))
    except FileNotFoundError:
        return d


FISH = load("fish.json", {"species": [], "teach": []})
SP = {s["id"]: s for s in FISH["species"]}
CAND = (load("fish-cand.json", {}) or {}).get("cand", {})
CUR = (load("curation.json", {}) or {}).get("fish") or {}
TEACH = {t["id"]: t for t in FISH["teach"]}
# The teaching entry of each species (its first level-1 entry): the dimorph flag and the juvenile classes of the caps.
ENTRY = {}
for _t in FISH["teach"]:
    if _t.get("level") == 1:
        for _s in _t.get("species") or []:
            ENTRY.setdefault(_s, _t)
# The sex and colour phases the IMR fish presentation names (fish.json teach "phase"), when the photo shows one; a
# juvenile is the code's j flag, an adult needs no tag. Never another category (rule C2).
PHASES = ("subadult", "intermediate", "terminal", "female", "male")
KEEP = ("best", "alt", "dup")
FIELDS = {"code", "keep", "phase", "crop", "unsure", "note"}


def ids(args):
    """Species ids from species or teaching ids (all species with candidates when none)."""
    if not args:
        return [s for s in CAND if CAND[s]]
    T = {t["id"]: t for t in FISH["teach"]}
    out = []
    for a in args:
        out += [s for s in (T[a].get("species") or []) if s in CAND] if a in T else [a]
    return out


def cands(sid):
    """Candidates still waiting for Pierre's decision (not added, rejected, excluded or sent elsewhere)."""
    done = {**(CUR.get("add") or {}), **(CUR.get("seen") or {}), **(CUR.get("exclude") or {}), **(CUR.get("out") or {})}
    return [p for p in CAND.get(sid, []) if p["f"] not in done]


def added(sid):
    """{observation: [its photos Pierre added to species sid]}: an observation whose other photos come later (every photo
    of an observation is a candidate since Pierre, 2026-11-08) already has a photo in play, its best so far. They are
    shown first on its sheet as context, never judged again (Codex review #715)."""
    A = CUR.get("add") or {}
    out = OrderedDict()
    for p in CAND.get(sid, []):
        if A.get(p["f"]) == sid:
            out.setdefault(p["o"], []).append(p)
    return out


def groups(sid):
    """The contact sheets' groups of species sid, observation by observation: (context, waiting) per observation with a
    photo waiting, context being the photos of it Pierre already added (added)."""
    A, G = added(sid), OrderedDict()
    for p in cands(sid):
        G.setdefault(p["o"], []).append(p)
    return [(A.get(o, []), L) for o, L in G.items()]


def fetch(p, size="medium"):
    out = P("judging", "fish", "img", f"{p['f']}{'-l' if size == 'large' else ''}.jpg")
    if os.path.exists(out) and os.path.getsize(out):
        return out
    os.makedirs(os.path.dirname(out), exist_ok=True)
    u = p["src"].replace("/original.", f"/{size}.")
    req = urllib.request.Request(u, headers={"User-Agent": "coral-id-imr/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        open(out, "wb").write(r.read())
    return out


TILES = 12  # photos per contact sheet at most


def pack(groups, size=TILES):
    """The contact sheets of a species: its observations' photos (groups, one list per observation, in order) in sheets of
    at most `size`, an observation never split over two sheets: one that does not fit in what is left of a sheet starts the
    next; one of more than `size` photos (every photo of an observation is a candidate since Pierre, 2026-11-08) fills
    sheets of its own. Its photos side by side are what lets the judge mark the near-duplicates (keep dup)."""
    out = []
    for g in groups:
        if out and len(out[-1]) + len(g) <= size:
            out[-1] += g
            continue
        out += [list(g[i:i + size]) for i in range(0, len(g), size)]
    return out


def sheet(sid, k, L, start=0):
    """One contact sheet of up to 12 photos (4 per row), each 360 px high, numbered from start + 1."""
    from PIL import Image, ImageDraw, ImageFont
    H, GAP = 360, 8
    ims = []
    for p in L:
        try:
            im = Image.open(fetch(p)).convert("RGB")
        except Exception as e:  # noqa: BLE001
            print(f"  could not load {p['f']}: {e}")
            im = Image.new("RGB", (H, H), (90, 90, 90))
        ims.append(im.resize((max(1, round(im.width * H / im.height)), H)))
    rows = [ims[i:i + 4] for i in range(0, len(ims), 4)]
    W = max(sum(i.width for i in r) + GAP * (len(r) - 1) for r in rows)
    S = Image.new("RGB", (W, len(rows) * H + GAP * (len(rows) - 1)), (255, 255, 255))
    d = ImageDraw.Draw(S)
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 34)
    except OSError:
        font = ImageFont.load_default()
    n = start
    for y, r in enumerate(rows):
        x = 0
        for im in r:
            n += 1
            S.paste(im, (x, y * (H + GAP)))
            d.rectangle([x, y * (H + GAP), x + 58, y * (H + GAP) + 46], fill=(0, 0, 0))
            d.text((x + 8, y * (H + GAP) + 4), str(n), fill=(255, 255, 0), font=font)
            x += im.width + GAP
    out = P("judging", "fish", "sheets", sid, f"{k + 1}.jpg")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    S.save(out, quality=85)
    return os.path.relpath(out, ROOT)


def cmd_sheets(names):
    for sid in names:
        G = groups(sid)
        if not G:
            continue
        s = SP.get(sid, {})
        ctx = {p["f"] for c, _ in G for p in c}
        L = [p for c, w in G for p in c + w]  # observation by observation, what Pierre added first
        print(f"## {sid} {s.get('name')} ({s.get('common', '')}): {len(L) - len(ctx)} photos to judge in {len(G)} observations"
              f"{f', {len(ctx)} added by Pierre shown as context' if ctx else ''}")
        n = 0
        for k, S in enumerate(pack([c + w for c, w in G])):
            print(sheet(sid, k, S, n))
            n += len(S)
        for i, p in enumerate(L, 1):
            extra = [p.get("loc", ""), p.get("lic", "")] + (["own"] if p.get("own") else []) + ([f"iNat: {p['st']}"] if p.get("st") else [])
            if p["f"] in ctx:
                extra.append("added by Pierre: context, not to judge")
            print(f"  {i} {p['f']}  obs {p['o'].rsplit('/', 1)[-1]}  ({', '.join(x for x in extra if x)})")


def check(sid):
    E = []
    j = load(f"judging/fish/{sid}.json")
    if j is None:
        return [f"{sid}: no judging/fish/{sid}.json"], None
    if not isinstance(j, dict) or not isinstance(j.get("photos"), dict):
        return [f'{sid}: must be {{"photos": {{photo: judgment}}}}'], None
    if set(j) - {"photos"}:
        E.append(f"{sid}: unknown top-level keys {sorted(set(j) - {'photos'})}")
    mine = {p["f"]: p for p in cands(sid)}
    # A candidate Pierre has decided on since its judgement (added, rejected, excluded, moved) stays in the file as
    # judged: not checked again, imported unchanged, and its best still counts for its observation.
    decided = {p["f"]: p for p in CAND.get(sid, []) if p["f"] not in mine}
    best, new = defaultdict(list), Counter()  # new: the bests among the photos still waiting
    for f, x in j["photos"].items():
        at = f"{sid}/{f}"
        if f in decided:
            if isinstance(x, dict) and x.get("keep") == "best":
                best[decided[f]["o"]].append(f)
            continue
        if f not in mine:
            E.append(f"{at}: not a candidate of {sid}")
            continue
        if not isinstance(x, dict):
            E.append(f"{at}: must be an object")
            continue
        if set(x) - FIELDS:
            E.append(f"{at}: unknown fields {sorted(set(x) - FIELDS)}")
        if not CODE.match(str(x.get("code", ""))):
            E.append(f"{at}: code must follow judging/FISH.md \"Tags\" (e.g. p1g0sm14), not {x.get('code')!r}")
        elif str(x["code"])[6] not in NEW_COUNT:
            E.append(f"{at}: count m is the code before the split (Q323): o (other species, no risk of confusion) or k "
                     "(other species one could take for the subject)")
        if x.get("keep") not in KEEP:
            E.append(f"{at}: keep must be one of {KEEP}")
        elif x["keep"] == "best":
            best[mine[f]["o"]].append(f)
            new[mine[f]["o"]] += 1
        if "phase" in x and x["phase"] not in PHASES:
            E.append(f"{at}: phase is one of {PHASES}, or omitted")
        u = x.get("unsure", [])
        if not isinstance(u, list) or set(u) - (FIELDS - {"unsure", "note"}):
            E.append(f"{at}: unsure must be a list of field names")
        elif u and not x.get("note"):
            E.append(f"{at}: note required when unsure is not empty")
        if len(x.get("note", "")) > 140:
            E.append(f"{at}: note longer than 140 characters")
        c = x.get("crop")
        if c is not None and not (isinstance(c, list) and len(c) == 4 and all(isinstance(v, (int, float)) for v in c)
                                  and 0 <= c[0] < c[2] <= 1 and 0 <= c[1] < c[3] <= 1):
            E.append(f"{at}: crop must be [left, top, right, bottom] fractions of the photo, 0 <= left < right <= 1, "
                     "0 <= top < bottom <= 1")
    missing = [f for f in mine if f not in j["photos"]]
    if missing:
        E.append(f"{sid}: {len(missing)} candidate(s) not judged yet, e.g. {missing[:3]}")
    obs = {mine[f]["o"] for f, x in j["photos"].items() if f in mine and isinstance(x, dict)}
    A = added(sid)
    for o in sorted(obs):
        nb = new[o] if o in A else len(best.get(o, []))  # Pierre's add is its best so far: a new one may beat it
        if o in A and nb > 1:
            E.append(f"{sid}: observation {o}: {nb} photos marked best; at most one (Pierre added one of its photos)")
        elif o not in A and nb != 1:
            E.append(f"{sid}: observation {o}: {nb} photos marked best; exactly one")
    return E, j


def entry(sid, x, rep=None):
    """A judging file's record -> suggest.json "fish" (autosort.js fishSure): the tags and ease after the rubric's caps
    (tools/fish_judge.py cap: the phase flag for a dimorph entry, the juvenile classes of the species' entry, and the
    reference flag r with its ease bonus for a candidate whose fish-cand.json record carries `rep`)."""
    t = ENTRY.get(sid) or {}
    s = SP.get(sid) or {}
    ease, tags = cap(x["code"], bool(t.get("dimorph")), juv_early(t.get("juv"), (s.get("name"), s.get("now"))), rep)
    e = {"jt": tags, "e": ease, "k": x["keep"]}
    if x.get("phase"):
        e["ph"] = x["phase"]
    if x.get("crop") and x["crop"] != [0, 0, 1, 1]:
        e["c"] = x["crop"]  # a proposal, as the game photos' (judging/FISH.md "A proposed crop")
    if x.get("unsure"):
        e["u"] = sorted(x["unsure"])
    if x.get("note"):
        e["n"] = x["note"]
    return e


def cmd_import(names, only_check, by):
    if not names and os.path.isdir(P("judging", "fish")):
        names = sorted(x[:-5] for x in os.listdir(P("judging", "fish")) if x.endswith(".json"))
    if not names:
        sys.exit("Nothing in judging/fish/ yet.")
    ok, bad = {}, []
    for sid in names:
        E, j = check(sid)
        for e in E:
            print("ERROR:", e)
        (bad.append(sid) if E else ok.__setitem__(sid, j))
    print(f"{len(ok)} species file(s) pass, {len(bad)} fail{': ' + ', '.join(bad) if bad else ''}.")
    if only_check or not ok:
        sys.exit(1 if bad else 0)
    S = load("suggest.json", {}) or {}
    S.setdefault("by", {})
    Sf = S.setdefault("fish", {})
    stamp = datetime.date.today().isoformat()
    for sid, j in ok.items():
        for p in CAND.get(sid, []):
            Sf.pop(p["f"], None)
        rep = {p["f"]: p.get("rep") for p in CAND.get(sid, [])}
        for f, x in j["photos"].items():
            Sf[f] = entry(sid, x, rep.get(f))
        S["by"].setdefault(sid, {})["fish"] = {"by": by, "at": stamp, "n": len(j["photos"])}
    S["fish"] = dict(sorted(Sf.items()))
    with open(P("suggest.json"), "w", encoding="utf-8") as fh:
        json.dump(S, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    print(f'Imported {len(ok)} species file(s): {len(S["fish"])} fish candidates judged in suggest.json "fish".')
    sys.exit(1 if bad else 0)


def cmd_rep(fields=("jt", "e")):
    """Re-applies the reference flag (fish-cand.json `rep`, tools/fetch_fish.py --rep, tools/fetch_fishbase.py) to the
    judged candidates of suggest.json "fish", from their codes in judging/fish/<species>.json: a candidate tagged since its
    judgement gets the flag r and the ease bonus, one no longer tagged loses them. Only those entries change.
    fields ("codes": also u and n): re-applies a re-judge of some photos' codes, unsure fields and notes (the other
    species split of 2026-11-09, Q323) to the candidates already judged, without the whole species' --check (a species
    may hold new candidates not judged yet, which the import refuses); waiting or decided alike."""
    S = load("suggest.json", {}) or {}
    Sf = S.get("fish") or {}
    n = 0
    for sid, L in CAND.items():
        j = load(f"judging/fish/{sid}.json")
        if not j:
            continue
        for p in L:
            x, old = (j.get("photos") or {}).get(p["f"]), Sf.get(p["f"])
            if not x or not old or not CODE.match(str(x.get("code", ""))):
                continue
            new = entry(sid, x, p.get("rep"))
            if any(new.get(k) != old.get(k) for k in fields):
                for k in fields:
                    if k in new:
                        old[k] = new[k]
                    else:
                        old.pop(k, None)
                n += 1
    with open(P("suggest.json"), "w", encoding="utf-8") as fh:
        json.dump(S, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    what = "Reference flag" if fields == ("jt", "e") else "Codes, unsure fields and notes"
    print(f"{what} re-applied: {n} judged candidates changed in suggest.json \"fish\".")


def cmd_todo():
    Sf = (load("suggest.json", {}) or {}).get("fish", {})
    T = [(sid, sum(1 for p in cands(sid) if p["f"] not in Sf), len(cands(sid))) for sid in CAND]
    T = [t for t in T if t[1]]
    for sid, a, b in T:
        print(f"{sid} {SP.get(sid, {}).get('name')}: {a} of {b} not judged")
    print(f"{sum(t[1] for t in T)} fish candidates not judged in {len(T)} species.")


if __name__ == "__main__":
    a = sys.argv[1:]
    BY = a[a.index("--by") + 1] if "--by" in a else "claude"
    rest = [x for x in a if not x.startswith("--") and x != BY]
    if rest[:1] == ["sheets"]:
        import slot

        slot.guard("tools/judging_fish.py")  # one heavy run at a time on the machine (rule W24)
        cmd_sheets(ids(rest[1:]))
    elif rest[:1] == ["big"]:
        p = next((p for L in CAND.values() for p in L if p["f"] == rest[1]), None)
        print(os.path.relpath(fetch(p, "large"), ROOT) if p else f"Unknown candidate {rest[1]}")
    elif rest[:1] == ["todo"]:
        cmd_todo()
    elif rest[:1] == ["rep"]:
        cmd_rep()
    elif rest[:1] == ["codes"]:
        cmd_rep(("jt", "e", "u", "n"))
    else:
        cmd_import(ids(rest) if rest else [], "--check" in a, BY)
