# Adds the IMR Lecture 6 review slides (slides 56-60 and 67-71) to each genus's lecture cues, verbatim,
# and restores the lecture's own wording for Goniastrea's bleached look. Run once: python3 tools/apply_review_slides.py
# The lecture cues live in the IMR instance's coral layer (tools/instances/imr/coral.json, since step 5 of
# docs/reviews/2026-11-14-sheet-overlay-design.md): written there, then laid on data.json.
import json
from datajson import dump  # the one data.json layout (one genus per line)
from instance import coral_compose, load_layer, write_layer  # the IMR instance's coral layer
P='data.json'; lay=load_layer('coral'); G=lay['gen']
REVIEW={'Fungia':'Round disc; septal teeth alternate between regular & saw-like; weakly domed; pale tentacular lobes.',
 'Heliofungia':'Round disc; daytime extended polyps; white or pink tips on tentacles.',  # corrected 2026-11-03 (apply_imr_corrections.py)
 'Danafungia':'Round disc; dome shaped / central arch; septal teeth.',
 'Lobactis':'Oval disc; tentacular lobes (often green, blue or white); regular septa.',  # corrected 2026-11-03 (apply_imr_corrections.py)
 'Lithophyllon':'Round disc; flat / weak arch; regular septa.',
 'Astrea':'Separate walls; rounded and crowded corallites (extra-tentacular budding); septa alternate in size.',
 'Dipsastraea':'Separate walls; intra-tentacular budding; oval-shaped corallites; colony does not appear crowded.',
 'Favites':'Shared / separate walls; crowded and sub-rounded corallites (extra-tentacular budding); uneven colony surface.',
 'Goniastrea':'Shared walls; sub-angular corallites; surface appears slightly bleached.'}
for g,t in REVIEW.items():
    L=[x for x in G[g]['imr'] if not x.startswith('Review slide:')]
    i=next((k for k,x in enumerate(L) if x.startswith("Instructor's notes")),len(L))
    G[g]['imr']=L[:i]+['Review slide: '+t]+L[i:]
G['Goniastrea']['imr']=[x.replace('Ridges wider at the base; walls often look bleached.','Ridges wider at the base; wall structure often appears bleached.') for x in G['Goniastrea']['imr']]
write_layer('coral', lay)
dump(coral_compose(json.load(open(P, encoding='utf-8')), lay), P)
