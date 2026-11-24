#!/usr/bin/env python3
"""Reads Pierre's chat answer to gold set 2's page ("ok sauf 4 (hors jeu : trop flou), 12 (juvénile)") into a table
per photo and field: agree, or his correction.

  python3 -B -I parse.py answer.txt            one row per photo, one column per field ("=" agrees, else his words)
  python3 -B -I parse.py answer.txt --long     one TSV row per photo and field: photo, field, page, answer, words
  python3 -B -I parse.py -                     the answer from stdin; --page PATH reads another copy of the page

The page (revue-photos-2.html, next to this file) gives the judge's value for each field; a photo or field he does not
cite agrees (the page says so). A "Doute" photo he does not cite keeps the judge's "plutôt ..." side. Reading rules:
- "ok sauf" opens the exceptions; "ok" alone, or "tout ok", means no exception.
- Each exception is a photo number, or a list (4, 5 / 4 et 5 / 4-6), then his words in parentheses. A list shares the
  parenthesis that follows it ("4, 12 (flou)" corrects both). A number with no parenthesis is cited without a
  correction ("cited": a field is not named, ask him).
- His words split on ";" and "," into fragments; each fragment goes to the field its keywords name (status, ease,
  view, light, colours, sharpness, size, count, juvenile, watermark, camouflage). A fragment with no keyword
  continues the one before it; with none before, the field is "?" and the words are kept for a human to place.
- "hors jeu : trop flou" is one fragment, read as status (the reason stays in his words).
The reading is mechanical: look at the words column before scoring anything. Warnings (stderr) name anything it
could not place: a number outside 1-42, text outside numbers and parentheses.
"""
import html
import re
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
FIELDS = ["status", "ease", "view", "light", "colours", "sharpness", "size", "count", "juvenile", "watermark", "camouflage"]


def fold(s):
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")


def read_page(path):
    """{number: {field: page value}} from the page's cards."""
    text = Path(path).read_text(encoding="utf-8")
    out = {}
    for num, body in re.findall(r'<article class="card" id="p(\d+)">(.*?)</article>', text, re.S):
        st = re.search(r'<p class="status (\w+)">(.*?)</p>', body, re.S)
        fm = re.search(r'<p class="fields">(.*?)</p>', body, re.S)
        status = html.unescape(st.group(2)).strip()
        row = {f: "" for f in FIELDS}
        row["status"] = status
        ease = re.search(r"facilit\w* (\d)/5", status)
        row["ease"] = ease.group(1) + "/5" if ease else "-"
        parts = [html.unescape(x).strip() for x in fm.group(1).split(" · ")] if fm else []
        for f, v in zip(["view", "light", "colours", "sharpness", "size", "count", "juvenile"], parts):
            row[f] = v
        row["watermark"] = "filigrane" if any(p.startswith("filigrane") for p in parts) else "-"
        row["camouflage"] = "camouflé" if "camouflé" in parts else "-"
        out[int(num)] = row
    return out


# Keyword -> field, first match wins; each is searched in the accent-folded, lower-cased fragment.
RULES = [
    ("status", r"hors jeu|en jeu|\bdoute\b|\bjeu\b"),
    ("ease", r"facil|difficile|\b[1-5]\s*/\s*5\b"),
    ("juvenile", r"juven|adulte|\bjeune\b"),
    ("watermark", r"filigrane|watermark"),
    ("camouflage", r"camoufl"),
    ("light", r"lumiere|eclair|\bflash\b"),
    ("colours", r"couleur|ternie|monochrome|intacte|\bteinte"),
    ("sharpness", r"flou|\bnet\b|\bnette\b|nettete|trouble"),
    ("size", r"taille|grand|moyen|petit"),
    ("view", r"profil|trois.quarts|\bface\b|\bdos\b|dessus|partiel|entier|\bvue\b|cache|coupe"),
    ("count", r"seul|plusieurs|confus|sujet|espece|nombre|banc|couple|\bautre"),
]


def classify(fragment):
    f = fold(fragment)
    for field, rx in RULES:
        if re.search(rx, f):
            return field
    return None


def fragments(words):
    """His words in a parenthesis as [(field or '?', text)], a keyword-less fragment joining the previous one."""
    out = []
    for frag in re.split(r"[;,]", words):
        frag = frag.strip()
        if not frag:
            continue
        field = classify(frag)
        if field is None:
            if out:
                out[-1] = (out[-1][0], out[-1][1] + ", " + frag)
            else:
                out.append(("?", frag))
        else:
            out.append((field, frag))
    return out


def read_answer(text, warn=lambda m: None):
    """{number: [(field, words)]}; a cited photo with no words has [("?", "")]."""
    t = text.strip()
    m = re.search(r"\bsauf\b", t, re.I)
    if m:
        t = t[m.end():]
    elif re.fullmatch(r"\W*(tout\s+)?(est\s+)?(ok|d'accord|bon)\W*", t, re.I):
        return {}
    cited, pending = {}, []
    pos = 0
    tok = re.compile(r"\(((?:[^()]|\([^()]*\))*)\)|(\d+)\s*(?:-|à)\s*(\d+)|(\d+)")
    for mt in tok.finditer(t):
        gap = t[pos:mt.start()]
        pos = mt.end()
        junk = re.sub(r"\b(et|puis|ainsi que|photos?|les|la|le|:|&)\b|[\s,;.:&+/]", "", gap, flags=re.I)
        if junk:
            warn("text outside numbers and parentheses, not read: " + gap.strip())
        if mt.group(1) is not None:
            if not pending:
                warn("words with no photo number before them, not read: (" + mt.group(1) + ")")
            frs = fragments(mt.group(1)) or [("?", "")]
            for n in pending:
                cited.setdefault(n, []).extend(frs)
            pending = []
        else:
            if mt.group(2):
                lo, hi = int(mt.group(2)), int(mt.group(3))
                nums = list(range(lo, hi + 1)) if lo <= hi and hi - lo < 50 else []
            else:
                nums = [int(mt.group(4))]
            for n in nums:
                if n not in pending:
                    pending.append(n)
    for n in pending:  # numbers with no parenthesis after them
        cited.setdefault(n, []).append(("?", ""))
    return cited


def table(page, cited):
    """Rows (photo, field, page value, 'agree' | 'correction' | 'cited', his words)."""
    rows = []
    for n in sorted(page):
        mine = {}
        for field, words in cited.get(n, []):
            mine.setdefault(field, []).append(words)
        for f in FIELDS:
            if f in mine:
                words = " / ".join(w for w in mine[f] if w)
                rows.append((n, f, page[n][f], "correction" if words else "cited", words))
            else:
                rows.append((n, f, page[n][f], "agree", ""))
        if "?" in mine:
            rows.append((n, "?", "", "correction" if any(mine["?"]) else "cited", " / ".join(w for w in mine["?"] if w)))
    return rows


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    page_path = HERE / "revue-photos-2.html"
    if "--page" in argv:
        page_path = Path(argv[argv.index("--page") + 1])
        args = [a for a in args if a != str(page_path)]
    if len(args) != 1:
        sys.exit(__doc__)
    text = sys.stdin.read() if args[0] == "-" else Path(args[0]).read_text(encoding="utf-8")
    page = read_page(page_path)
    warns = []
    cited = read_answer(text, warns.append)
    for n in sorted(cited):
        if n not in page:
            warns.append("photo %d is not on the page (1-%d), not read" % (n, len(page)))
    cited = {n: v for n, v in cited.items() if n in page}
    rows = table(page, cited)
    if "--long" in argv:
        print("photo\tfield\tpage\tanswer\this words")
        for r in rows:
            print("\t".join(str(x) for x in r))
    else:
        cols = FIELDS + ["?"]
        by = {(r[0], r[1]): r for r in rows}
        print("photo\t" + "\t".join(cols))
        for n in sorted(page):
            cells = []
            for f in cols:
                r = by.get((n, f))
                cells.append("" if r is None else "=" if r[3] == "agree" else (r[4] or "cited, no words"))
            print(str(n) + "\t" + "\t".join(cells))
    changed = sorted({r[0] for r in rows if r[3] != "agree"})
    print("\n%d of %d photos with a correction or a citation: %s" % (len(changed), len(page), ", ".join(map(str, changed)) or "none"))
    for f in FIELDS + ["?"]:
        k = sum(1 for r in rows if r[1] == f and r[3] != "agree")
        if k:
            print("  %s: %d" % (f, k))
    for w in warns:
        print("WARNING: " + w, file=sys.stderr)


if __name__ == "__main__":
    main(sys.argv[1:])
