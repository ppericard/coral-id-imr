# Plain words for the glossary (beginner review, 2026-11-03: people who never had the IMR coral lecture). Each term
# [term, definition, source] gets a 4th field, a first sentence in plain words written for the app (not copied from a
# source), shown before the sourced definition, which stays as it was with its source. Adds "Polyp" (Corals of the
# World glossary). Re-runnable: python3 tools/apply_plain_terms.py
# 2026-11-03, plain words on the genus sheets (tools/apply_plain_sheets.py): MORE adds, at the end of the list, the most
# frequent words of the genus sheets' scientific lines (IMR notes, ID tips, Coral Finder features) that had no entry yet,
# with the Corals of the World glossary's definition and a plain first sentence (app.js GLOSS_PAT underlines them).
import json
from datajson import dump  # the one data.json layout (one genus per line)

P = 'data.json'
d = json.load(open(P))
PLAIN = {
    'Septa': 'Thin blades that run from the rim of a corallite towards its centre, like the spokes of a wheel. '
    'Their top edges can be smooth or toothed ("septal teeth").',
    'Costae': 'Ridges on the outside of a corallite\'s rim: the septa carried on past the wall.',
    'Coenosteum': 'The skeleton between the corallites, when each corallite has a wall of its own: often spongy, '
    'smooth or bumpy.',
    'Septo-costae': 'Ridges that run from one corallite to the next with no clear wall in between, so the corallites '
    'seem to merge.',
    'Corallite': 'The little cup of skeleton each polyp sits in: on a coral\'s surface they show as small pits, holes '
    'or stars.',
    'Paliform lobes': 'Small upright knobs on the inner ends of the septa, making a ring around the centre of the '
    'corallite.',
    'Axial corallite': 'The corallite at the very tip of a branch, often bigger or shaped differently from the ones '
    'along the sides.',
    'Verrucae': 'Bumps on the surface of a branch, wider than one corallite.',
    'Extra-tentacular budding': 'New corallites grow beside the old ones, so each stays a separate cup.',
    'Intra-tentacular budding': 'An old corallite splits into two or more new ones.',
    'Monticules': 'Small bumps or cones on the coral\'s surface, between the corallites.',
    'Vesicles': 'Bubble-like sacs that some corals puff up by day, hiding the skeleton.',
    'Polyp': 'The small soft animal that builds a coral: a mouth, usually ringed by tentacles. A coral colony is many polyps '
    'living together.',
}
COTW = 'Corals of the World glossary'
MORE = [
    ['Free-living', 'Corals that are not attached to the substrate.', COTW,
     'Not fixed to the reef: the coral lies loose on the sand or rubble, like most mushroom corals.'],
    ['Solitary', 'Corals composed of single individuals. There is no clear distinction (eg. in fungiids) between single '
     'individuals with many mouths and colonies of individuals with single mouths.', COTW,
     'One single polyp on its own instead of a colony of many, like many mushroom corals.'],
    ['Separate walls', 'Plocoid colonies: corals whose corallite centres are isolated from one another by separate walls '
     'which are at least slightly exsert.', COTW,
     'Each corallite has its own rim, so you see a gap, a groove or a shadow between neighbouring cups.'],
    ['Shared walls', 'Cerioid corals: corals which have corallites whose centres are isolated from one another by adjoined '
     '(common) walls.', COTW, 'Neighbouring corallites share one wall between them, like the cells of a honeycomb.'],
    ['Phaceloid', 'Colonial corals that have corallites of generally uniform height which are usually only adjoined towards '
     'their base. Where phaceloid corals branch, the entire branch is formed from only one corallite.', COTW,
     'Each corallite sits at the end of its own tube or stalk, the stalks joined only near the base, like a bunch of '
     'flowers.'],
    ['Radial corallites', 'Corallites on the sides of branches as opposed to axial corallites on the tips of branches.', COTW,
     'The small cups along the sides of a branch, as opposed to the axial corallite at its tip.'],
    ['Tentacular lobes', 'A lobe at the beginning (point of insertion) of a septum. Commonly found in Fungia, where each lobe '
     'supports a single tentacle.', COTW,
     'Small raised bumps on the ridges (septa) of a mushroom coral, each one holding up a tentacle.'],
    ['Axial furrow', 'A groove along the axis of the upper surface of some fungiids.', COTW,
     'The long groove down the middle of an oval or long mushroom coral, where its mouth or mouths sit.'],
    ['Spinules', 'A spinule is a spine of near microscopic size.', COTW,
     "Tiny spines, barely visible to the eye, that give a coral's surface a rough look."],
]
POLYP = ['Polyp', 'An individual coral including soft tissues and skeleton.', 'Corals of the World glossary']
T = [t[:3] for t in d['terms'] if t[0] != 'Polyp' and t[0] not in {m[0] for m in MORE}]
at = next(i for i, t in enumerate(T) if t[0] == 'Corallite')
T.insert(at, POLYP)
d['terms'] = [t + [PLAIN[t[0]]] if t[0] in PLAIN else t for t in T] + MORE
dump(d, P)
