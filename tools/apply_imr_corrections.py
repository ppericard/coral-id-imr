# Corrections to the IMR wording approved by Pierre (2026-11-03, review of the plain sentences): where the references
# checked for the plain sentences (tools/plain_sources.json) differ from the lecture wording, these four lines follow
# the references. An exception to rule C1, made by Pierre himself. The ID tips themselves are corrected in
# tools/id_tips.txt (tools/apply_id_tips.py); this script corrects the lecture notes (gen[g].imr, review slides included),
# the mnemonic, the short description (sum) and Herpolitha's "to check" note. Re-runnable: python3 tools/apply_imr_corrections.py
#
# - Seriatopora: corallites in neat rows, not "black" (Pierre has seen pale ones at Dauin; Corals of the World,
#   S. hystrix: "Corallites are arranged in neat rows along branches", colour pink, cream, blue or green; Wikipedia and
#   Naturalis: rows, no dark colour). The lecture's mnemonic "Serius Black" (serial black pores) goes too (Pierre: not a
#   fan, a better one or none): the name itself says it, Latin seriatus "in rows" + pora, so SERIA_MN.
# - Lobactis: tentacular lobes "often green, blue or white", not "pale" (Corals of the World, Fungia (Lobactis) scutaria:
#   "Usually brown, blue or yellow, often with bright green, blue or white tentacular lobes").
# - Heliofungia: tentacle tips "white or pink" (Corals of the World, H. actiniformis: "tentacles with white or pink tips").
# - Herpolitha, solitary or colonial: no contradiction once the words are defined. The IMR lecture puts it in group 8
#   "Solitary" (the free-living mushroom corals, one disc each, growth form Mushroom: "Solitary (single polyp) and
#   free-living"). The Coral Finder (p. 65) and Corals of the World ("Colonies are usually elongate ... Secondary mouths
#   outside the furrow are numerous") call it colonial because one disc has many mouths. Hoeksema (1989, Zoologische
#   Verhandelingen 254, p. 17) prefers "monostomatous" / "polystomatous" for that reason ("the terms 'solitary' and
#   'colonial' may lead to confusion") and describes Herpolitha as "free-living ... polystomatous" (p. 167), juveniles with
#   one mouth, then mouths dividing inside the axial groove and secondary mouths beside it (p. 171); Naturalis: "polystomatous
#   by additional mouths along and alongside central fossa, free-living, elongate". So the ID tip says both: free-living
#   like a mushroom coral, but many mouths along the furrow; the "to check" note becomes an "Other sources" note.
import json, os
from datajson import dump  # the one data.json layout (one genus per line)

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data.json')
# genus -> field -> [(old, new)]; a pair whose old text is gone and new text is there is already applied.
FIX = {
    'Seriatopora': {
        'imr': [('Black corallites arranged in rows.', 'Corallites arranged in neat rows.')],
    },
    'Lobactis': {
        'imr': [('Regular septal teeth with tall, pale tentacular lobes.',
                 'Regular septal teeth with tall tentacular lobes, often green, blue or white.'),
                ('Review slide: Oval disc; pale tentacular lobes; regular septa.',
                 'Review slide: Oval disc; tentacular lobes (often green, blue or white); regular septa.')],
        'sum': [('with tall pale tentacular lobes raised on the major septa.',
                 'with tall tentacular lobes, often green, blue or white, raised on the major septa.')],
    },
    'Heliofungia': {
        'imr': [('Long, anemone-like tentacles out by day, white tips.', 'Long, anemone-like tentacles out by day, white or pink tips.'),
                ('Review slide: Round disc; daytime extended polyps; white tips on tentacles.',
                 'Review slide: Round disc; daytime extended polyps; white or pink tips on tentacles.')],
        'sum': [('long anemone-like tentacles with white tips', 'long anemone-like tentacles with white or pink tips')],
    },
}
SERIA_MN = '"Seria-topora": pores in series, tiny holes lined up in rows along the twigs.'
HERPO_INFO = ('Solitary or colonial? Both are said, and both are true: the IMR lecture groups it with the solitary '
              'mushroom corals (free-living, one disc), while the Coral Finder (p. 65) and Corals of the World call it '
              'colonial because one disc has many mouths. Hoeksema (1989), the mushroom coral revision, says '
              '"monostomatous" / "polystomatous" (one mouth / many mouths) instead, as the two words lead to confusion.')


def main():
    d = json.load(open(P, encoding='utf-8'))
    for n, fields in FIX.items():
        g = d['gen'][n]
        for k, pairs in fields.items():
            for old, new in pairs:
                if isinstance(g[k], list):
                    if old in g[k]:
                        g[k] = [new if x == old else x for x in g[k]]
                    assert new in g[k], (n, k, new)
                else:
                    g[k] = g[k].replace(old, new)
                    assert new in g[k], (n, k, new)
    if d['gen']['Seriatopora'].get('mn', '').startswith('"Serius Black"'):
        d['gen']['Seriatopora']['mn'] = SERIA_MN
    assert d['gen']['Seriatopora']['mn'] == SERIA_MN
    h = d['gen']['Herpolitha']
    h.pop('check', None)
    h['info'] = [x for x in h.get('info', []) if not x.startswith('Solitary or colonial?')] + [HERPO_INFO]
    dump(d, P)


if __name__ == '__main__':
    main()
