import cv2, numpy as np, sys, os
def runs(score, thr, minlen):
    b=score>thr; out=[]; i=0; n=len(b)
    while i<n:
        if b[i]:
            j=i
            while j<n and b[j]: j+=1
            if j-i>=minlen: out.append((i,j))
            i=j
        else: i+=1
    return out
def segments(length, cuts):
    segs=[]; s=0
    for a,b in cuts:
        if a-s>0: segs.append((s,a))
        s=b
    if length-s>0: segs.append((s,length))
    return segs
def xycut(bright, x0,y0,x1,y1, depth=0, out=None, thr=0.8, ml=4):
    if out is None: out=[]
    reg=bright[y0:y1,x0:x1]; h,w=reg.shape
    if h<150 or w<150: return out
    rs=runs(reg.mean(1),thr,ml); cs=runs(reg.mean(0),thr,ml)
    rsegs=segments(h,rs); csegs=segments(w,cs)
    if len(rsegs)>1 or (rs and len(rsegs)==1 and (rsegs[0][1]-rsegs[0][0])<h):
        for a,b in rsegs: xycut(bright,x0,y0+a,x1,y0+b,depth+1,out,thr,ml)
    elif len(csegs)>1 or (cs and len(csegs)==1 and (csegs[0][1]-csegs[0][0])<w):
        for a,b in csegs: xycut(bright,x0+a,y0,x0+b,y1,depth+1,out,thr,ml)
    else: out.append((x0,y0,x1,y1))
    return out
def detect(path):
    im=cv2.imread(path); H,W=im.shape[:2]
    hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV)
    bright=((hsv[...,2]>175)&(hsv[...,1]<80)).astype(np.float32)
    leaves=xycut(bright,0,0,W,H)
    out=[]
    for x0,y0,x1,y1 in leaves:
        w,h=x1-x0,y1-y0
        if w<230 or h<230 or w>0.9*W: continue
        crop=im[y0:y1,x0:x1]; g=cv2.cvtColor(crop,cv2.COLOR_BGR2GRAY)
        if (g<45).mean()>0.45 or (g>200).mean()>0.5: continue
        out.append((x0,y0,w,h))
    return im,out
if __name__=='__main__':
    for p in sys.argv[1:]:
        im,r=detect(p); print(os.path.basename(p), len(r), r[:14])
        for i,(x,y,w,h) in enumerate(r):
            cv2.rectangle(im,(x,y),(x+w,y+h),(0,0,255),12); cv2.putText(im,str(i),(x+20,y+110),cv2.FONT_HERSHEY_SIMPLEX,4,(0,0,255),10)
        cv2.imwrite(os.environ.get('OUT','.')+'/'+os.path.basename(p), cv2.resize(im,(im.shape[1]//4,im.shape[0]//4)))

def detect2(path):
    im=cv2.imread(path); H,W=im.shape[:2]
    hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV); g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
    bright=((hsv[...,2]>175)&(hsv[...,1]<80)).astype(np.float32)
    dark=(g<95).astype(np.float32)
    panels=[]
    for x0,y0,x1,y1 in xycut(bright,0,0,W,H):
        if x1-x0<600 or y1-y0<600: continue
        photos=[]
        for a in xycut(dark,x0,y0,x1,y1,thr=0.6,ml=2):
            ax0,ay0,ax1,ay1=a; w,h=ax1-ax0,ay1-ay0
            if w<300 or h<300: continue
            c=g[ay0:ay1,ax0:ax1]
            if (c<45).mean()>0.4 or (c>215).mean()>0.4: continue
            photos.append((ax0,ay0,w,h))
        panels.append(((x0,y0,x1-x0,y1-y0),photos))
    return im,panels
