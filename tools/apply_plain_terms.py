# Plain words for the glossary (beginner review, 2026-11-03: people who never had the IMR coral lecture). Each term
# [term, definition, source] gets a 4th field, a first sentence in plain words written for the app (not copied from a
# source), shown before the sourced definition, which stays as it was with its source. Adds "Polyp" (Corals of the
# World glossary). Re-runnable: python3 tools/apply_plain_terms.py
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
POLYP = ['Polyp', 'An individual coral including soft tissues and skeleton.', 'Corals of the World glossary']
T = [t[:3] for t in d['terms'] if t[0] != 'Polyp']
at = next(i for i, t in enumerate(T) if t[0] == 'Corallite')
T.insert(at, POLYP)
d['terms'] = [t + [PLAIN[t[0]]] if t[0] in PLAIN else t for t in T]
dump(d, P)
