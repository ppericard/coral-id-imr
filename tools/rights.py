"""The rights a photo comes with, the Python copy of core.js licOf, rightsClass and rightsRank (tests/rights.test.js keeps
them alike). Pierre, 2026-11-08 (Q270): "à qualité égale", photos under CC0 or CC BY, and his own, before CC BY-NC, so the
stock a later commercial app could use grows; the CC BY-NC photos stay fully usable. A tie-break only: the last key of an
order between otherwise-equal photos, never above quality, ease or variety, never a reason to leave a photo out
(docs/rules/photos.md P1).

    licence(p)      the licence code: p's lic, else read from its credit a; None when neither says
    rights_class(p) 'imr' (IMR lecture), 'book' (Coral Finder book), 'own' (Pierre's own, whatever its licence),
                    'open' (CC0, CC BY) or 'nc' (the rest: CC BY-NC, or no licence read)
    rights_rank(p)  the tie-break key: 0 own or open, 1 the rest (own and open alike: his photos are never boosted over
                    another open one, P1 fish)
"""
import re

OPEN = ("cc0", "cc-by")


def licence(p):
    """A photo record's licence code: its lic, else read from its attribution text ("(CC BY-NC-SA)" -> cc-by-nc-sa, "no
    rights reserved" -> cc0); None when neither says (IMR lecture or Coral Finder book photos)."""
    if p.get("lic"):
        return p["lic"].lower()
    m = re.search(r"\((?:CC0|CC[ -][A-Z -]+?)\)", p.get("a") or "")
    if not m:
        return "cc0" if "no rights reserved" in (p.get("a") or "").lower() else None  # iNaturalist's CC0 credit
    t = m.group(0)[1:-1].upper()
    return "cc0" if t == "CC0" else "cc-" + "-".join(t[3:].lower().split())


def rights_class(p):
    if not p:
        return "nc"
    if p.get("imr"):
        return "imr"
    if p.get("cf"):
        return "book"
    if p.get("own"):
        return "own"
    return "open" if licence(p) in OPEN else "nc"


def rights_rank(p):
    return 0 if rights_class(p) in ("own", "open") else 1
