# Keeps only look-alike pairs found in an existing reference and records the source of each pair (data.json gen[*].lsrc).
# Sources, in order: the IMR lecture or the Coral Finder comparing the two genera in words; the same Coral Finder box;
# the same IMR lecture group. Run once: python3 tools/apply_look_sources.py
import json
P='data.json'; d=json.load(open(P)); G=d['gen']
TEXT={('Leptoria','Platygyra'):'IMR Lecture 6: Leptoria "could be confused for Platygyra"',
 ('Montipora','Porites'):'IMR Lecture 6: Montipora "can be confused for Porites"',
 ('Astrea','Favites'):'IMR Lecture 6: Favites "could be confused for Astrea"',
 ('Dipsastraea','Favites'):'IMR Lecture 6 (instructor notes): Dipsastraea vs Favites budding',
 ('Pocillopora','Stylophora'):'IMR Lecture 6 (instructor notes): Stylophora smooth from afar, unlike Pocillopora',
 ('Ctenactis','Fungia'):'IMR Lecture 6 (instructor notes): septal teeth vs the striations of Fungia',
 ('Fungia','Lobactis'):'IMR Lecture 6 (instructor notes): septal teeth vs the striations of Fungia',
 ('Goniastrea','Leptoria'):'IMR Lecture 6 (instructor notes) and Coral Finder p. 18: neat, zipper, ragged',
 ('Goniastrea','Platygyra'):'Coral Finder p. 17-18: Goniastrea neater, with paliform lobes',
 ('Seriatopora','Stylophora'):'Coral Finder p. 5: Seriatopora finer than Stylophora, no hoods',
 ('Acropora','Anacropora'):'Coral Finder p. 8: like Acropora without axial corallites',
 ('Acropora','Echinopora'):'Coral Finder p. 9: like Acropora without axial corallite',
 ('Acropora','Cyphastrea'):'Coral Finder p. 8: axial corallite like Acropora but undifferentiated',
 ('Astrea','Dipsastraea'):'Coral Finder p. 23: Astrea vs Dipsastraea',
 ('Danafungia','Fungia'):'Coral Finder p. 63: Fungia smaller than Danafungia',
 ('Fungia','Lithophyllon'):'Coral Finder p. 63-64: Fungia larger than Lithophyllon',
 ('Danafungia','Lithophyllon'):'Coral Finder p. 64: Lithophyllon neater than Danafungia',
 ('Hydnophora','Montipora'):'Coral Finder p. 11: monticules coarser than Montipora ornament',
 ('Astreopora','Cyphastrea'):'Coral Finder p. 25: Cyphastrea smaller and finer than Astreopora',
 ('Favites','Goniastrea'):'Coral Finder p. 32: Goniastrea neater than Favites',
 ('Goniopora','Porites'):'Coral Finder p. 71: small-polyp Goniopora confused with Porites'}
box={}
for k in d['key']:
    for l in k['leaves']:
        for g in l['g']: box.setdefault(g,{})[l['id']]=l
def source(a,b):
    p=tuple(sorted((a,b)))
    if p in TEXT: return TEXT[p]
    sh=sorted(set(box.get(a,{}))&set(box.get(b,{})))
    if sh:
        l=box[a][sh[0]]; return f'Same Coral Finder box: {l["t"]}' + (f' ({l["s"]})' if l['s'] else '') + f', p. {l["a"]}' + (f'-{l["b"]}' if l['b']!=l['a'] else '')
    if G[a]['ig'] and G[a]['ig']==G[b]['ig']:
        return f'Same IMR lecture group: {G[a]["ig"]}. {d["imrg"][G[a]["ig"]-1]["t"]}'
    return None
dropped=[]
for a,v in G.items():
    keep=[b for b in v['look'] if source(a,b)]
    dropped+=[(a,b) for b in v['look'] if b not in keep]
    v['look']=keep
for a,v in G.items():
    others=[b for b in G if b!=a and (b in v['look'] or a in G[b]['look'])]
    v['lsrc']={b:source(a,b) for b in others}
json.dump(d,open(P,'w'),ensure_ascii=False,separators=(',',':'))
print('dropped',dropped)
