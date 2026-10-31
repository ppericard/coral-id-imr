# Adds the IMR Lecture 6 review slides (slides 63-71) to each genus's lecture cues, verbatim,
# and restores the lecture's own wording for Goniastrea's bleached look. Run once: python3 tools/apply_review_slides.py
import json
P='data.json'; d=json.load(open(P)); G=d['gen']
REVIEW={'Fungia':'Round disc; septal teeth alternate between regular & saw-like; weakly domed; pale tentacular lobes.',
 'Heliofungia':'Round disc; daytime extended polyps; white tips on tentacles.',
 'Danafungia':'Round disc; dome shaped / central arch; septal teeth.',
 'Lobactis':'Oval disc; pale tentacular lobes; regular septa.',
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
json.dump(d,open(P,'w'),ensure_ascii=False,separators=(',',':'))
