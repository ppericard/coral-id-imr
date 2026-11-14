# Name roots on the genus sheets (Pierre, 2026-11-14, Q124 d: "Je suis tes recommandations pour tout"; the name
# study's recommendation: the Latin and Greek roots of genus names, sourced, as a memory aid, the transparent ones
# first; docs/reviews/2026-11-05-name-confusion-study.md 5.2 and question d). Each genus below gets `root` in
# data.json (gen or x.gen):
#   p    the parts of the name, in order, that spell it exactly: [form, gloss, word, [source indexes]]; an ending with no
#        meaning of its own (-ia, -ites, -a) has an empty gloss and no source
#   fit  optional: one of the genus's own ID tips (gen[g].qt, verbatim) that the meaning points to
#   src  the sources: [{t: label, u: https link}]
# Shown on the genus sheet under the ID tips (learn.js rootLine), apart from the IMR tips and mnemonic: an addition with
# its source, never a correction of the IMR course (rule C1).
#
# How a genus gets a line (rule C2: never an invented etymology):
#   A. a dictionary names the genus itself and its parts: E. C. Jaeger, A Source-Book of Biological Names and Terms
#      (1944, archive.org) gives Seriato-pora, Por-ites, Fungia, Lob-actis, Turbin-aria, Mille-pora, Sandalo-litha as
#      examples of their root; Merriam-Webster gives Acropora (acr- + -pora), Porites, Fungia, Millepora, Tubipora
#      (tubi- + -pora): 9 genera;
#   B. or the name is made of dictionary roots with nothing left over but a Latin ending or a linking -o-/-i-, and the
#      form of each root sits under one sense of the dictionary: Jaeger numbers the different words that share a
#      spelling (gon- 1. gonia "angle", 2. gonos "seed"; Gonio- is under 1), and a Merriam-Webster combining form settles
#      the rest (-pora "pore", where Jaeger's por- also has poros "soft stone", as in madrepore): 14 genera.
#   Every entry used was read on the page scans, not only in the OCR text.
# Every other slate genus is in SKIP with the reason it gets no line (main() checks that each slate genus is in one of
# the two), so a later pass knows where to look: a form under two senses of the dictionary, a split that is not clear,
# a person honoured whose source we have not read, a root that points to another genus's IMR cue (the study's
# misleading root: held back until the sheet can say so), or an IMR mnemonic that gives the name another meaning, so a
# dictionary line beside it could read as a correction (rule C1: Platygyra). The skip reasons were read in the OCR text.
#
# Acropora's old unsourced "Other sources" etymology (gen.info) moves here, with its sources. Re-runnable:
# python3 tools/apply_name_roots.py
import json, os, sys
from datajson import dump  # the one data.json layout (one genus per line)

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data.json')

JAEGER = 'https://archive.org/details/in.ernet.dli.2015.350249/page/n%d/mode/1up'
JAEGER_LEAF = 25  # the scan's leaf number is the printed page + 25 (leaf 207 is p. 182)


def jaeger(page, entry):
    return {'t': f'Jaeger 1944, p. {page} ({entry})', 'u': JAEGER % (page + JAEGER_LEAF)}


def mw(word):
    return {'t': f'Merriam-Webster ({word})', 'u': 'https://www.merriam-webster.com/dictionary/' + word}


PORA = ['pora', 'pore', 'Latin porus']  # Merriam-Webster -pora: "one having a pore… chiefly in generic names"
ASTREA = ['astrea', 'star', 'Greek astēr']  # Jaeger p. 25 aster: astēr, a star

ROOTS = {
    # The IMR slate, in slate order
    'Acropora': {'p': [['Acro', 'tip', 'Greek akros', [0, 1]], PORA + [[2]]], 'fit': 'Axial corallite at branch tips',
                 'src': [mw('Acropora'), mw('acr-'), mw('-pora')]},
    'Seriatopora': {'p': [['Seriato', 'in rows', 'Latin seriatus', [0]], PORA + [[1]]], 'fit': 'Corallites in neat rows',
                    'src': [jaeger(211, 'seriat'), mw('-pora')]},
    'Porites': {'p': [['Por', 'pore', 'Latin porus', [0, 1]], ['ites', '', '', []]], 'src': [jaeger(182, 'por'), mw('Porites')]},
    'Tubastraea': {'p': [['Tub', 'tube', 'Latin tubus', [0, 1]], ['astraea', 'starry', 'Greek astraios', [2]]],
                   'fit': 'Round tubular corallite at each branch end', 'src': [jaeger(244, 'tub'), mw('tubi-'), jaeger(25, 'astrae')]},
    'Echinopora': {'p': [['Echino', 'hedgehog, sea urchin', 'Greek echinos', [0, 1]], PORA + [[2]]], 'fit': 'Spines between large corallites',
                   'src': [jaeger(78, 'echin'), mw('echin-'), mw('-pora')]},
    'Turbinaria': {'p': [['Turbin', 'spinning top; cone-shaped', 'Latin turbo', [0]], ['aria', '', '', []]], 'src': [jaeger(244, 'turb')]},
    'Lobophyllia': {'p': [['Lobo', 'lobe', 'Greek lobos', [0]], ['phyll', 'leaf', 'Greek phyllon', [1]], ['ia', '', '', []]],
                    'src': [jaeger(125, 'lob'), jaeger(174, 'phyll')]},
    'Goniopora': {'p': [['Gonio', 'angle', 'Greek gōnia', [0, 1]], PORA + [[2]]], 'src': [jaeger(98, 'gon'), mw('goni-'), mw('-pora')]},
    'Plerogyra': {'p': [['Plero', 'full', 'Greek plērēs', [0]], ['gyr', 'round, a circle', 'Greek gyros', [1]], ['a', '', '', []]],
                  'src': [jaeger(178, 'pler'), jaeger(100, 'gyr')]},
    'Montipora': {'p': [['Monti', 'mountain', 'Latin mons', [0]], PORA + [[1]]], 'src': [jaeger(139, 'mont'), mw('-pora')]},
    'Fungia': {'p': [['Fung', 'mushroom', 'Latin fungus', [0, 1]], ['ia', '', '', []]], 'src': [jaeger(93, 'fung'), mw('Fungia')]},
    'Lithophyllon': {'p': [['Litho', 'stone', 'Greek lithos', [0]], ['phyllon', 'leaf', 'Greek phyllon', [1]]],
                     'src': [jaeger(125, 'lith'), jaeger(174, 'phyll')]},
    'Ctenactis': {'p': [['Cten', 'comb', 'Greek kteis', [0]], ['actis', 'ray', 'Greek aktis', [1]]], 'src': [jaeger(63, 'cten'), jaeger(6, 'actin')]},
    'Lobactis': {'p': [['Lob', 'lobe', 'Greek lobos', [0]], ['actis', 'ray', 'Greek aktis', [1]]],
                 'fit': 'Tall tentacular lobes, often green, blue or white', 'src': [jaeger(125, 'lob'), jaeger(6, 'actin')]},
    'Herpolitha': {'p': [['Herpo', 'creeping', 'Greek herpō, to creep', [0]], ['lith', 'stone', 'Greek lithos', [1]], ['a', '', '', []]],
                   'src': [jaeger(104, 'herp'), jaeger(125, 'lith')]},
    'Diploastrea': {'p': [['Diplo', 'double', 'Greek diploos', [0]], ASTREA + [[1]]], 'src': [jaeger(73, 'dipl'), jaeger(25, 'aster')]},
    'Goniastrea': {'p': [['Goni', 'angle', 'Greek gōnia', [0, 1]], ASTREA + [[2]]], 'fit': 'Shared walls, sub-angular corallites',
                   'src': [jaeger(98, 'gon'), mw('goni-'), jaeger(25, 'aster')]},
    'Astrea': {'p': [['Astr', 'star', 'Greek astēr', [0]], ['ea', '', '', []]], 'src': [jaeger(25, 'aster')]},
    # The starred look-alikes
    'Alveopora': {'p': [['Alveo', 'hollow', 'Latin alveus', [0]], PORA + [[1]]], 'src': [jaeger(12, 'alveol'), mw('-pora')]},
    'Cyphastrea': {'p': [['Cyph', 'humped, curved', 'Greek kyphos', [0]], ASTREA + [[1]]], 'src': [jaeger(66, 'cyph'), jaeger(25, 'aster')]},
    # Millepora (x.gen, on the slate) and two bonus genera already sourced
    'Millepora': {'p': [['Mille', 'thousand', 'Latin mille', [0, 1]], PORA + [[2]]], 'src': [jaeger(137, 'mille'), mw('Millepora'), mw('-pora')]},
    'Sandalolitha': {'p': [['Sandalo', 'sandal', 'Greek sandalon', [0]], ['litha', 'stone', 'Greek lithos', [1]]],
                     'src': [jaeger(202, 'sandal'), jaeger(125, 'lith')]},
    'Tubipora': {'p': [['Tubi', 'tube', 'Latin tubus', [0, 1]], PORA + [[2]]], 'fit': 'Organ pipe: red tube skeleton',
                 'src': [mw('tubi-'), mw('Tubipora'), mw('-pora')]},
}
PHORA = 'the ending -phora has two meanings in the dictionary (Greek phora "motion", phoros "bearing"; Jaeger p. 172)'
SKIP = {
    'Pocillopora': 'its root pocillum "small cup" (Jaeger p. 180) points to the cup that IMR teaches for Acropora ("A-cup-ora", "Cup-shaped radial corallites"): held back until the sheet can warn about it',
    'Stylophora': PHORA,
    'Anacropora': 'the split is not clear (an-, ana- or Acropora)',
    'Astreopora': 'astreo- is not a dictionary form (Jaeger p. 25 has aster-, astero-, astr-, astrae-)',
    'Galaxea': 'the dictionary gives galax- "milky" (Jaeger p. 94); that the name means the galaxy is not sourced',
    'Mycedium': 'myc- is "fungus" (Jaeger p. 141), but -edium is not a dictionary root',
    'Pavona': 'pavon- is "peacock" (Jaeger p. 163), but the same entry warns that Pavonia honours a person (Pavon): not clear for this coral',
    'Pachyseris': 'the ending -seris has two meanings in the dictionary ("silk", "endive"; Jaeger p. 211)',
    'Pectinia': 'pectin- "comb" (Jaeger p. 163) is the meaning of Ctenactis\'s cten- too: a shared meaning, held back until the sheet can warn about it',
    'Platygyra': 'the IMR mnemonic says "gyre means disorder"; the dictionary gyros "round, a circle" beside it could read as a correction',
    'Leptoria': 'lept- is "thin" (Jaeger p. 122), but the dictionary has no root -oria',
    'Hydnophora': PHORA,
    'Danafungia': 'honours a person (Dana): no source read yet',
    'Heliofungia': 'helio- has two meanings in the dictionary (helios "sun", helos "marsh"; Jaeger p. 102)',
    'Dipsastraea': 'dips- has two meanings in the dictionary ("thirst", a serpent; Jaeger p. 73)',
    'Favites': 'its root favus "honeycomb" (Jaeger p. 89) is the IMR tip of Porites ("Honeycomb pattern"): held back until the sheet can warn about it',
    'Duncanopsammia': 'honours a person (Duncan): no source read yet',
    'Merulina': 'the only dictionary root, merula "blackbird" (Jaeger p. 135), is not sourced for this coral',
    'Halomitra': 'hal- has two meanings in the dictionary ("the sea", "to breathe"; Jaeger p. 101)',
}
# The old "Other sources" line it replaces (unsourced; the root line now says it with its sources).
OLD_INFO = {'Acropora': 'The name comes from Greek akros (tip) and poros (pore): the pore at the branch tip, i.e. the axial corallite.'}


def check(n, r, g):
    if ''.join(x[0] for x in r['p']).lower() != n.lower():
        return 'parts do not spell the name'
    for form, gloss, word, s in r['p']:
        if gloss and not (word and s and all(0 <= i < len(r['src']) for i in s)):
            return f'{form}: a meaning without its word or source'
    if 'fit' in r and r['fit'] not in (g.get('qt') or []):
        return 'fit is not one of its ID tips'
    return ''


def main():
    d = json.load(open(P, encoding='utf-8'))
    G = {**d['gen'], **d['x']['gen']}
    bad = [(n, check(n, r, G[n]) if n in G else 'unknown genus') for n, r in ROOTS.items()]
    bad = [b for b in bad if b[1]]
    slate = [*d['gen'], 'Millepora']  # core.js slateOf: the gen records and Millepora
    bad += [(n, 'neither a root nor a reason to skip') for n in slate if (n in ROOTS) == (n in SKIP)]
    if bad:
        sys.exit(f'{bad}')
    for n, g in G.items():
        g.pop('root', None)
        if n in ROOTS:
            g['root'] = ROOTS[n]
        if n in OLD_INFO and OLD_INFO[n] in (g.get('info') or []):
            g['info'] = [x for x in g['info'] if x != OLD_INFO[n]]
            if not g['info']:
                del g['info']
    dump(d, P)
    print(len(ROOTS), 'name roots')


if __name__ == '__main__':
    main()
