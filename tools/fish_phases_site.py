#!/usr/bin/env python3
"""The fish colour phases the Lab's Life stages matched may ask about: writes fish-phases.json (served, read by the Lab game
through app.js UNITS fish phases) from tools/fish_phases.json (the cited list, docs/decisions/2026-11-20-fish-phases-sourced.md).

Why a file of its own: tools/ is not part of the site (.gitattributes export-ignore), so the list cannot be read by the page;
the page needs only the species where a source documents the adult phases, each with its quote and sources (rule C2), not the
list's notes and `no` or `unknown` verdicts.

What goes in (rules C2 and C5, nothing settled here): a species with a `yes` verdict for `sex` (female and male colours) or for
`ip_tp` (initial and terminal phase colours), and none of the verdicts it uses a conflict: the verdict, its quotes (the list's
own words, every one, each about one stage or several) and its sources {t, u}. The juvenile verdict (`juv`) goes in when it is `yes`. A species
whose note for a verdict it uses records a disagreement between sources (the list's `conflict` or a note that says so,
tests/phasepoints.test.js) is left out whole: the game never picks a side. A species with no adult verdict is left out: a match
needs two phases and the young alone gives none.

    python3 tools/fish_phases_site.py          # print what the file should hold
    python3 tools/fish_phases_site.py --fix    # write fish-phases.json
    python3 tools/fish_phases_site.py --check  # fail when fish-phases.json differs (tests/fishphasesite.test.js)
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "fish_phases.json"
OUT = ROOT / "fish-phases.json"
# The same words tests/phasepoints.test.js reads as a disagreement between sources.
DISAGREE = re.compile(r"conflict|disagree|differ(s)? between|contradict|inconsistent", re.I)
SOURCE = re.compile(r"^(.*?)\s*<(https://[^>\s]+)>")


def sources(raw):
    """The list's `src` string ("Name <url> | Name <url> Short description; ...") as [{t, u}], each address once. A source the
    list names with no address (the FishBase Morphology table, a book) keeps its words and u ''."""
    out, seen = [], set()
    # the list separates its sources with " | " or "; " ("FishBase <url> Short description; Reef Life Survey <url>"): each one
    # is kept, never only the first of a part (a quote may come from any of them)
    for part in re.split(r"\s+\|\s+|;\s+", str(raw or "")):
        part = part.strip()
        m = SOURCE.match(part)
        t, u = (m.group(1).strip(" ;,"), m.group(2)) if m else (part, "")
        if t and (u or t) not in seen:
            seen.add(u or t)
            out.append({"t": t, "u": u})
    return out


def verdict(e, k):
    """One verdict of one species as the site file holds it, or None when it is not a `yes` with a quote and a source."""
    if e.get(k) != "yes":
        return None
    q = [x.strip() for x in str((e.get("quote") or {}).get(k) or "").split(" | ") if x.strip()]
    s = sources((e.get("src") or {}).get(k))
    if not q or not s:
        sys.exit(f"{SRC.name} {e.get('sp')}: a yes for {k} with no quote or no source")
    # every quote of the verdict, in the list's order: each may describe another stage (Coris gaimard's sexes: a female's, a
    # male's, then both), and the game says, under a stage's name, only one that names that stage (proto/lifestages.js lsQuote)
    return {"q": q, "s": s}


def build(doc):
    out = {}
    for name, e in doc.items():
        if name.startswith("_"):
            continue
        if any(e.get(k) == "conflict" or DISAGREE.search((e.get("note") or {}).get(k) or "") for k in ("juv", "ip_tp", "sex")):
            continue
        v = {k: verdict(e, k) for k in ("juv", "sex", "ip_tp")}
        if not v["sex"] and not v["ip_tp"]:
            continue
        out[e["sp"]] = {"name": name, **{k: x for k, x in v.items() if x}}
    return {
        "v": 1,
        "about": "the colour phases a cited source documents, per fish species (tools/fish_phases_site.py, from tools/fish_phases.json); read by the Lab's Life stages matched",
        "species": dict(sorted(out.items())),
    }


def dumps(o):
    return json.dumps(o, ensure_ascii=False, separators=(",", ":")) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--fix", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--src", help=argparse.SUPPRESS)  # tests: another list
    ap.add_argument("--out", help=argparse.SUPPRESS)  # tests: another output
    a = ap.parse_args()
    src = Path(a.src) if a.src else SRC
    out = Path(a.out) if a.out else OUT
    text = dumps(build(json.loads(src.read_text(encoding="utf-8"))))
    if a.check:
        if not out.exists() or out.read_text(encoding="utf-8") != text:
            print(f"{out.name} is not what {SRC.name} gives: run python3 tools/fish_phases_site.py --fix")
            sys.exit(1)
        print(f"{out.name} OK")
    elif a.fix:
        out.write_text(text, encoding="utf-8")
        print(f"{out.name}: {len(json.loads(text)['species'])} species")
    else:
        sys.stdout.write(text)


if __name__ == "__main__":
    main()
