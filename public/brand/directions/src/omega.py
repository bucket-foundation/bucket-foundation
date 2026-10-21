import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from paths import DIRECTIONS_DIR
FD=DIRECTIONS_DIR+"/licensed/marks/fonts/"
FONTS={"didot":"gfsdidot-GFSDidot-Regular.ttf","gentium":"gentiumbookplus-GentiumBookPlus-Regular.ttf","gentiumb":"gentiumbookplus-GentiumBookPlus-Bold.ttf","noto":"notoserif-NotoSerif[wdth,wght].ttf","cardo":"cardo-Cardo-Regular.ttf","cardob":"cardo-Cardo-Bold.ttf"}
_C={}
def omega(key,box=(10,10,80,80)):
    if key in _C: f,gs,b=_C[key]
    else:
        f=TTFont(FD+FONTS[key]);gs=f.getGlyphSet();nm=f.getBestCmap()[0x3A9]
        bp=BoundsPen(gs);gs[nm].draw(bp);b=(nm,bp.bounds);_C[key]=(f,gs,b)
    nm,(x0,y0,x1,y1)=b;w,h=x1-x0,y1-y0
    bx,by,bw,bh=box;s=min(bw/w,bh/h);ox=bx+(bw-w*s)/2;oy=by+(bh-h*s)/2
    pen=SVGPathPen(gs,ntos=lambda v:f"{v:.2f}".rstrip("0").rstrip("."))
    tp=TransformPen(pen,(-s,0,0,s,ox+w*s+x0*s,oy-y0*s))
    gs[nm].draw(tp)
    return pen.getCommands(),(w,h)
def measure(key):
    from fontTools.pens.recordingPen import RecordingPen
    d,(w,h)=omega(key,(0,0,1000,1000));return w,h
def omega_segments(key,box=(0,0,100,100)):
    from fontTools.pens.recordingPen import RecordingPen
    omega(key,box);f,gs,b=_C[key];nm,(x0,y0,x1,y1)=b;w,h=x1-x0,y1-y0
    bx,by,bw,bh=box;s=min(bw/w,bh/h);ox=bx+(bw-w*s)/2;oy=by+(bh-h*s)/2
    rp=RecordingPen();gs[nm].draw(TransformPen(rp,(-s,0,0,s,ox+w*s+x0*s,oy-y0*s)))
    contours=[];cur=[];start=None;pt=None
    for op,args in rp.value:
        if op=="moveTo": start=pt=args[0];cur=[]
        elif op in("lineTo","qCurveTo","curveTo"):
            pts=[pt]+list(args)
            if op=="qCurveTo" and len(pts)>3:
                for k in range(1,len(pts)-2):
                    m_=((pts[k][0]+pts[k+1][0])/2,(pts[k][1]+pts[k+1][1])/2)
                cur.append((op,pts))
            else: cur.append((op,pts))
            pt=args[-1]
        elif op in("closePath","endPath"):
            if pt!=start: cur.append(("lineTo",[pt,start]))
            contours.append(cur)
    return contours
def corners(contours,ymin=-1e9,ymax=1e9,tol=8):
    import math
    out=[]
    for c in contours:
        for k in range(len(c)):
            a=c[k-1][1];b=c[k][1];p=b[0]
            t1=(a[-1][0]-a[-2][0],a[-1][1]-a[-2][1]);t2=(b[1][0]-b[0][0],b[1][1]-b[0][1])
            if math.hypot(*t1)<1e-9 or math.hypot(*t2)<1e-9: continue
            ang=abs(math.degrees(math.atan2(t1[0]*t2[1]-t1[1]*t2[0],t1[0]*t2[0]+t1[1]*t2[1])))
            if ymin<=p[1]<=ymax and ang>tol: out.append((p,round(ang,1)))
    return out
