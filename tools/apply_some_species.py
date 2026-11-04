# Traits found in some species of a genus only (data.json gen[g].trs; Pierre, 2026-11-04, "the least bad option" after
# the Favites report). Every tool reads them through proto/lab.js trHas, never by genus name: half a match in the Coral
# ID Key, never eliminated on in the Elimination board, an "In some species" row in the Feature gallery, a ring and
# "(some species)" in the Feature matrix. Only species present in the Philippines count (AGENTS.md rule 6e, from #484).
# Re-runnable: python3 tools/apply_some_species.py
#
# Presence in the Philippines by Pierre's rule (2026-11-04; Research Grade observations / distinct observers on
# iNaturalist, place 6873, from the presence study; both species are in Corals of the World's Philippine ecoregions):
# (1) >= 3 observers, or (2) >= 1 Research Grade and that checklist, or (3) confirmed near Dauin.
# - Favites `pali`: a clear crown of paliform lobes in F. pentagona ("Paliform lobes are well developed, commonly forming
#   a conspicuous crown"; 6 / 3, rule 1) and F. colemani ("A paliform crown is well developed"; 6 / 2, rule 2) (Corals of
#   the World factsheets); weak or absent in the genus as a rule (WoRMS: "often poorly developed").
# - Goniastrea `plo`: G. stelligera has conical corallites whose costae "do not join" (Corals of the World, as Favia
#   stelligera); 2 / 2, rule 2.
# - Not added: Dipsastraea `pali`. D. matthaii has a paliform crown (Corals of the World) but no Research Grade record in
#   the Philippines (one Needs ID observation): not present by the rule.
import json, os
from datajson import dump

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data.json')
SOME = {'Favites': ['pali'], 'Goniastrea': ['plo']}


def main():
    d = json.load(open(P, encoding='utf-8'))
    ids = {o['id'] for t in d['traits'] for o in t['opts']}
    for g, add in SOME.items():
        v = d['gen'][g]
        assert all(t in ids and t not in v['tr'] for t in add), (g, add)
        v['trs'] = v.get('trs', []) + [t for t in add if t not in v.get('trs', [])]
    dump(d, P)


if __name__ == '__main__':
    main()
