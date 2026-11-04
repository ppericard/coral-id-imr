# Traits found in some species of a genus only (data.json gen[g].trs; Pierre, 2026-11-04, "the least bad option" after
# the Favites report). Every tool reads them through proto/lab.js trHas, never by genus name: half a match in the Coral
# ID Key, never eliminated on in the Elimination board, an "In some species" row in the Feature gallery, a ring and
# "(some species)" in the Feature matrix. Only species recorded in the Philippines count (AGENTS.md rule 6d).
# Re-runnable: python3 tools/apply_some_species.py
#
# - Favites `pali`: a clear crown of paliform lobes in F. pentagona ("Paliform lobes are well developed, commonly forming
#   a conspicuous crown"; iNaturalist Philippines 11 observations, 6 Research Grade, 1 RG within 50 km of Dauin) and
#   F. colemani ("A paliform crown is well developed"; 12, 6 RG) (Corals of the World factsheets); weak or absent in the
#   genus as a rule (WoRMS: "often poorly developed"). Checked 2026-11-04.
# - Goniastrea `plo`: G. stelligera has conical corallites whose costae "do not join" (Corals of the World, as Favia
#   stelligera); iNaturalist Philippines 2 observations, both Research Grade.
# - Not added: Dipsastraea `pali`. D. matthaii has a paliform crown (Corals of the World) but is recorded once in the
#   Philippines, Needs ID only (iNaturalist, 2026-11-04): not confirmed here.
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
