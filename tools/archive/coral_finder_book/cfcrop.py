import json,cv2,glob,os,numpy as np,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from cfmap import M
from cfspec import O, GRIDS, MANUAL
D=json.load(open('cfwork/detect.json'))
pages={os.path.basename(f).split('-')[0]:f for f in glob.glob('cf/pages/*.jpg')}
def bars(g,x,y,w,h):
    reg=g[y:y+h, x:x+int(w*.7)]; s=(reg<70).mean(1)>0.85
    out=[];i=0
    while i<len(s):
        if s[i]:
            j=i
            while j<len(s) and s[j]: j+=1
            if j-i>=28: out.append((y+i,y+j))
            i=j
        else: i+=1
    return out
os.makedirs('cfwork/crops',exist_ok=True)
res={}
def save(gen,pg,tag,im,x,y,w,h,m=4,col=None):
    META.append(dict(gen=gen,pg=pg,tag=tag,col=col,f=f'cfwork/crops/{gen}__{pg}_{tag}.jpg'))
    cr=im[y+m:y+h-m,x+m:x+w-m]; fn=f'cfwork/crops/{gen}__{pg}_{tag}.jpg'; cv2.imwrite(fn,cr,[cv2.IMWRITE_JPEG_QUALITY,92]); res.setdefault(gen,[]).append(fn)
META=[]
import shutil; shutil.rmtree('cfwork/crops'); os.makedirs('cfwork/crops')
keys=set(O)|{(pg,pi) for pg,pm in M.items() for pi in pm}
for pg,pi in sorted(keys):
    im=cv2.imread(pages[pg]); g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY); pan=D[pg][pi]; P=pan['photos']
    if (pg,pi) in O:
        for rule in O[(pg,pi)]:
            gen,idx=rule[0],rule[1]
            ids=range(len(P)) if idx=='all' else [i for i in range(len(P)) if i not in rule[2]] if idx=='not' else idx
            for k in ids: save(gen,pg,f'{pi}_{k}',im,*P[k],col=0 if (P[k][0]-pan['panel'][0])<0.22*pan['panel'][2] else 1)
    else:
        gen=M[pg][pi]; x,y,w,h=pan['panel']; b=bars(g,x,y,w,h); lim=b[1][0] if len(b)>1 else y+h
        for k,(a,c,ww,hh) in enumerate(P):
            if c<lim-20: save(gen,pg,f'{pi}_{k}',im,a,c,ww,hh,col=0 if (a-x)<0.22*w else 1)
for pg,gen,x,y,w,h,nc,nr in GRIDS:
    im=cv2.imread(pages[pg]); cw,ch=w//nc,h//nr
    for r in range(nr):
        for c in range(nc): save(gen,pg,f'g{r}{c}',im,x+c*cw,y+r*ch,cw,ch,m=int(min(cw,ch)*.04),col=c)
for pg,gen,boxes in MANUAL:
    im=cv2.imread(pages[pg])
    for k,bx in enumerate(boxes): save(gen,pg,f'm{k}',im,*bx,col=k)
json.dump(META,open('cfwork/meta.json','w'));json.dump(res,open('cfwork/crops.json','w'),indent=0)
for gen,L in res.items():
    T=[]
    for f in L:
        t=cv2.imread(f); s=220/max(t.shape[:2]); t=cv2.resize(t,(int(t.shape[1]*s),int(t.shape[0]*s)))
        c=np.full((240,240,3),255,np.uint8); c[:t.shape[0],:t.shape[1]]=t
        cv2.putText(c,str(len(T)),(5,30),0,1,(0,0,255),3); T.append(c)
    while len(T)%8: T.append(np.full((240,240,3),255,np.uint8))
    cv2.imwrite(f'cfwork/sheet_{gen}.jpg',np.vstack([np.hstack(T[i:i+8]) for i in range(0,len(T),8)]))
print({k:len(v) for k,v in res.items()}, sum(map(len,res.values())))
