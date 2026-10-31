import json, urllib.request, os, re, concurrent.futures as cf
# Manual crops (fractions l t r b) and dropped photos, from crops.txt.
CROP={}
for l in open('crops.txt'):
    if l.strip() and not l.startswith('#'):
        k,*v=l.split(); CROP[k]='DROP' if v==['DROP'] else [float(x) for x in v]
from PIL import Image
C=json.load(open('cands18.json'))
V={}
for line in open('views.txt'):
    g,rest=line.split(' ',1)
    V[g]={}
    for part in rest.split('|'):
        k,*ids=part.split(); V[g][{'W':'wide','M':'medium','X':'macro'}[k]]=[int(i) for i in ids]
jobs=[];out={}
for g,vs in V.items():
    out[g]={}
    for view,ids in vs.items():
        out[g][view]=[]
        for i in ids:
            p=C[g]['photos'][i]
            name=f"{g.lower()}-{view}-{p['id']}"
            if CROP.get(name)=='DROP': continue
            out[g][view].append(dict(f=name,a=p['attr'],lic=p['lic'],o=p['obs'],t=p['taxon'],own=p['own'],src=p['url'].replace('square','original')))
            jobs.append((p['url'].replace('square','original'),name))
def do(j):
    u,name=j
    fn=f'orig/{name}.jpg'
    if not os.path.exists(fn):
        for k in range(3):
            try: open(fn,'wb').write(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'coral-id/1.0'}),timeout=120).read()); break
            except Exception as e: err=e
    im=Image.open(fn).convert('RGB')
    c=CROP.get(name)
    if c:
        W,H=im.size; im=im.crop((round(c[0]*W),round(c[1]*H),round(c[2]*W),round(c[3]*H)))
    for w,q,suf in ((1600,78,''),(480,72,'-s')):
        t=im.copy(); t.thumbnail((w,w)); t.save(f'site/img/{name}{suf}.webp','WEBP',quality=q,method=5)
    return name, im.size
with cf.ThreadPoolExecutor(10) as ex: res=list(ex.map(do,jobs))
json.dump(out,open('views.json','w'),indent=0)
small=[r for r in res if max(r[1])<1000]
print(len(res),'small originals:',len(small), small[:10])
