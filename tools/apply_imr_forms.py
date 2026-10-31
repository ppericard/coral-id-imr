# Switches photo growth forms to the 7 IMR Lecture 6 growth forms (slides 3-10; the classic AIMS lifeforms,
# English, Wilkinson & Baker 1997), as Pierre chose on 2026-10-31. Writes into forms.json:
#   "forms"  the 7 forms (single source for the admin, the site and the judging package)
#   "cf"     which IMR forms illustrate each Coral Finder front-page box (L = the polyps flag, not a form)
#   "gf"     first guesses {photo: letter + optional "p" (polyps or vesicles extended)}
#   "gunsure" guesses to double-check
# Only one-to-one conversions from the old Coral Finder letters ("form", kept untouched as a hint) are made:
#   C Columns -> S Submassive (IMR: "form thick columns / lobes / fingers"), F -> U Mushroom (free-living genera only),
#   x -> x, L -> polyps flag only, B -> B but marked unsure (could be Tabulate or Submassive).
# P, S, M are ambiguous (Encrusting/Foliose/Tabulate, Massive/Submassive, ...) and get no guess.
import json, os
P = lambda f: os.path.join(os.path.dirname(__file__), '..', f)
F = json.load(open(P('forms.json')))
FORMS = [
    {'id': 'B', 'name': 'Branching', 'slide': 4, 'def': 'Secondary branches form off the first branch; complex 3D structures.'},
    {'id': 'E', 'name': 'Encrusting', 'slide': 5, 'def': 'Low, spreading; follows the contour of the rock or dead skeleton beneath.'},
    {'id': 'T', 'name': 'Tabulate', 'slide': 6, 'def': 'Flat, table-like horizontal surface on a single holdfast; branches horizontally.'},
    {'id': 'U', 'name': 'Mushroom', 'slide': 7, 'def': 'Solitary (single polyp) and free-living (unattached).'},
    {'id': 'M', 'name': 'Massive', 'slide': 8, 'def': 'Grows in equal proportion on a 3D axis; brain or boulder corals.'},
    {'id': 'S', 'name': 'Submassive', 'slide': 9, 'def': 'Thick columns, lobes or fingers; no true secondary branches; too irregular to be massive.'},
    {'id': 'F', 'name': 'Foliose/Plating', 'slide': 10, 'def': 'Thin, leafy, vertical plates, like petals, lettuce or cabbage.'},
]
# Coral Finder box -> IMR forms whose photos can illustrate it (the Coral Finder site only shows genera it lists in the box).
# IMR slide 6: tabulate is "classified as branching in the CoralFinder". Meandering is a corallite pattern, seen on any form.
CF = {'B': 'BT', 'P': 'EF', 'S': 'MS', 'M': 'BETMSF', 'C': 'S', 'F': 'U', 'L': 'p'}
ATTACHED = ('lobophyllia', 'plerogyra')  # Coral Finder F4 "isolated and attached": not IMR mushrooms
gf, unsure = {}, []
for f, v in F['form'].items():
    if v == 'x': gf[f] = 'x'
    elif v == 'C': gf[f] = 'S'
    elif v == 'F' and not f.startswith(ATTACHED): gf[f] = 'U'
    elif v == 'L': gf[f] = 'p'
    elif v == 'B': gf[f] = 'B'; unsure.append(f)
F['note'] = ('Growth form of each photo. "gf" = the 7 IMR Lecture 6 growth forms (see "forms"; one per photo, the main form '
             'visible; x = not visible), plus "p" when polyps or vesicles are extended. First guesses, Pierre checks them in admin.html; '
             'his choices live in curation.json "gf" and always win. "form" = the old Coral Finder letters, kept as a hint only.')
F['forms'], F['cf'], F['gf'], F['gunsure'] = FORMS, CF, dict(sorted(gf.items())), sorted(unsure)
order = ['note', 'forms', 'cf', 'gunsure', 'batch', 'unsure']
with open(P('forms.json'), 'w') as fh:
    fh.write('{' + ',\n'.join(f'{json.dumps(k)}:{json.dumps(F[k])}' for k in order if k in F) + ',\n')
    for k in ('gf', 'form'):
        fh.write(f'"{k}":{{\n' + ',\n'.join(f'{json.dumps(a)}:{json.dumps(b)}' for a, b in F[k].items()) + '\n}' + (',\n' if k == 'gf' else '}\n'))
print(len(gf), 'guesses,', len(unsure), 'unsure,', len(F['form']) - len(gf), 'to classify')
