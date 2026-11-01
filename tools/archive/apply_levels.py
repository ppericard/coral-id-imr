# Applies levels.txt to views.json: moves/drops photos between views, derives closer crops,
# marks two-level genera and picks the cover photo. Writes views2.json and covers.json.
import json, copy
from PIL import Image
V=json.load(open('views.json')); O=copy.deepcopy(V)
CROP={}
for l in open('crops.txt'):
    if l.strip() and not l.startswith('#'):
        k,*v=l.split()
        if v!=['DROP']: CROP[k]=[float(x) for x in v]
def src(g,view,i): return O[g][view][int(i)]
def open_cropped(name):
    im=Image.open(f'orig/{name}.jpg').convert('RGB'); c=CROP.get(name)
    if c: W,H=im.size; im=im.crop((round(c[0]*W),round(c[1]*H),round(c[2]*W),round(c[3]*H)))
    return im
moves=[]; derives=[]; levels={}; covers={}
for l in open('levels.txt'):
    l=l.split('#')[0].split()
    if not l: continue
    if l[0]=='DERIVE': derives.append(l[1:])
    elif l[0]=='LEVELS2': levels[l[1]]=l[2]
    elif l[0]=='COVER': covers[l[1]]=src(l[1],l[2],l[3])['f']
    else: moves.append((l[0],l[1],src(*l[:3])['f'],l[3]))
for g,view,fromview,i,*b in derives:
    p=dict(src(g,fromview,i)); im=open_cropped(p['f']); W,H=im.size; b=[float(x) for x in b]
    im=im.crop((round(b[0]*W),round(b[1]*H),round(b[2]*W),round(b[3]*H)))
    p['f']=p['f'].replace(f'-{fromview}-',f'-{view}-')+'d'
    for w,q,suf in ((1600,78,''),(480,72,'-s')):
        t=im.copy(); t.thumbnail((w,w)); t.save(f'site/img/{p["f"]}{suf}.webp','WEBP',quality=q,method=5)
    V[g][view].append(p); print('derived',p['f'],im.size)
for g,view,name,act in moves:
    p=next(x for x in V[g][view] if x['f']==name); V[g][view].remove(p)
    if act!='drop': V[g][act[2:]].append(p)
for g,m in levels.items():
    V[g][m]=(V[g]['medium']+V[g][m])[:4]; V[g]['medium']=[]
json.dump(V,open('views2.json','w'),indent=0)
json.dump(dict(levels=levels,covers=covers),open('covers.json','w'),indent=0)
for g in V:
    n={v:len(V[g][v]) for v in V[g]}
    if g not in levels and min(n.values())<2: print('thin',g,n)
    if g not in covers: print('no cover',g)
