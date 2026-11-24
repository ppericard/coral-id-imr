#!/usr/bin/env python3
"""Checks parse.py on the real page and on made-up answers: python3 -B -I tools/studies/gold-set-2/test_parse.py"""
import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("parse", HERE / "parse.py")
P = importlib.util.module_from_spec(spec)
spec.loader.exec_module(P)

page = P.read_page(HERE / "revue-photos-2.html")
assert sorted(page) == list(range(1, 43)), "42 photos"
assert page[1]["status"].startswith("En jeu") and page[1]["ease"] == "5/5" and page[1]["watermark"] == "filigrane"
assert page[4]["status"].startswith("Hors jeu") and page[4]["ease"] == "-"
assert page[5]["status"].startswith("Doute") and page[5]["ease"] == "1/5"
assert all(page[n]["view"] and page[n]["juvenile"] for n in page), "every photo has its fields"

warns = []
c = P.read_answer("ok sauf 4 (hors jeu : trop flou), 12 (juvénile), 5, 9 (couleurs un peu ternies; facilité 3), 20-21 (net), 99 (flou)", warns.append)
assert c[4] == [("status", "hors jeu : trop flou")], c[4]
assert c[12] == [("juvenile", "juvénile")]
assert c[5] == c[9] == [("colours", "couleurs un peu ternies"), ("ease", "facilité 3")]
assert c[20] == c[21] == [("sharpness", "net")]
assert 99 in c and warns == [], warns  # the page check happens in main, not here
assert P.read_answer("ok") == {} and P.read_answer("Tout ok.") == {}
assert P.read_answer("ok sauf 7") == {7: [("?", "")]}, "cited, no words"
assert P.read_answer("ok sauf 7 (il est mort)") == {7: [("?", "il est mort")]}, "no keyword: kept for a human"
assert P.read_answer("ok sauf 3 (juvénile, très ternies)")[3] == [("juvenile", "juvénile"), ("colours", "très ternies")]
w = []
P.read_answer("ok sauf 3 (flou) et puis bof 8 (grand)", w.append)
assert len(w) == 1 and "bof" in w[0], w

rows = P.table(page, {4: [("status", "hors jeu : trop flou")], 7: [("?", "")]})
by = {(r[0], r[1]): r for r in rows}
assert by[(4, "status")][3:] == ("correction", "hors jeu : trop flou")
assert by[(4, "light")][3] == "agree" and by[(5, "status")][3] == "agree"
assert by[(7, "?")][3] == "cited"
assert len(rows) == 42 * len(P.FIELDS) + 1
print("parse.py: all checks passed")
sys.exit(0)
