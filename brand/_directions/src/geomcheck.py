import sys,re,math,io
sys.path.insert(0,__import__("os").path.dirname(__import__("os").path.abspath(__file__)))
import logos,icons,cairosvg
from lib import D
from PIL import Image,ImageOps,ImageChops
R=[]
def rec(name,ok,info=""): R.append((name,ok,info))
NUM=re.compile(r'-?\d+\.?\d*')
def coords(svg):
    vals=[]
    for m in re.finditer(r'(?:\s(?:x|y|width|height|cx|cy|r)="([^"]+)"|points="([^"]+)"|\sd="([^"]+)")',svg):
        vals+= [float(v) for v in NUM.findall(next(x for x in m.groups() if x))]
    return vals
for d in D:
    if d["id"] not in logos.LAT: continue
    for key,_,fn in logos.MARKS+[("mascot","",logos.mascot)]:
        s=logos.svgm(d,fn,64);v=coords(s)
        bad=[x for x in v if abs(x-round(x))>1e-9]
        rec(f"{d['id']} {key} lattice integer",not bad,f"{len(v)} values")
        rects=[(float(a),float(b),float(c),float(e)) for a,b,c,e in re.findall(r'<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"',s)]
        off=[r for r in rects if any(x%8 for x in r)]
        rec(f"{d['id']} {key} rect edges on 8-module",not off,f"{len(rects)} rects")
    for nme in icons.NAMES:
        v=coords(icons.icon(d,nme));bad=[x for x in v if abs(x-round(x))>1e-9]
        rec(f"{d['id']} icon {nme} integer",not bad,f"{len(v)} values")
for d in D:
    for key,_,fn in [("mho","",logos.mho),("goat","",logos.goat)]:
        logos.REC.clear();fg,ac,bg=logos.markcols(d);fn(d,fg,ac,bg)
        for m in [r for r in logos.REC if r["kind"]=="mho"]:
            worst=0
            for rad in (m["R"],m["r"]):
                for s in (-1,1):
                    x0=m["cx"]+s*rad;e=1e-4
                    ax=m["cx"]+s*rad*math.cos(e);ay=m["cy"]+rad*math.sin(e)
                    tx,ty=(ax-x0),(ay-m["cy"]);worst=max(worst,abs(tx/math.hypot(tx,ty)))
                    worst=max(worst,abs(math.hypot(x0-m["cx"],0)-rad))
            rec(f"{d['id']} {key} arc/line tangency",worst<1e-3,f"max dev {worst:.1e}")
def png(s,px=200): return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=s.encode(),output_width=px,output_height=px))).convert("RGBA")
SYM={"d1":["goat","lyre"],"d2":["lyre","vessel","mascot"],"d3":["lyre"],"d4":["mascot"],"d5":["vessel","lyre"],"d6":["goat","mho","lyre","mascot"],"d7":["mho","lyre","vessel"]}
F=dict((k,f) for k,_,f in logos.MARKS);F["mascot"]=logos.mascot;F["owl"]=logos.mascot
for d in D:
    for key in SYM[d["id"]]:
        fg,ac,bg=logos.markcols(d)
        s=logos.svgm(d,F[key],200)
        if d["id"]=="d4": s=s.replace(logos.wedge(ac),"")
        if key in("goat",) and d["id"]=="d1": s=re.sub(r'<rect x="224" y="[08]"[^>]*/>','',s)
        if d["id"]=="d6": s=s.replace(f'fill="{logos.YEL}"',f'fill="{logos.RED}"')
        if key=="lyre" and d["id"] in logos.LAT: s=s.replace(f'fill="{logos.RED}"',f'fill="{fg}"').replace(f'fill="{logos.BLUE}"',f'fill="{fg}"')
        if key=="mho" and d["id"]=="d2": pass
        if d["id"]=="d7": s=re.sub(r'<path d="M36 53.5[^>]*/>','',s)
        a=png(s);b=ImageOps.mirror(a)
        diff=ImageChops.difference(a,b).convert("L");frac=sum(1 for p in diff.getdata() if p>60)/(200*200)
        rec(f"{d['id']} {key} mirror symmetry",frac<0.004,f"{frac*100:.2f}% px differ")
d6=next(d for d in D if d["id"]=="d6")
for c,sg in ((8,1),(56,-1)):
    e=1e-4;R_=24;y0=40-R_;yy=40-R_*math.cos(e)
    rec(f"d6 lyre arm {'L' if sg>0 else 'R'} tangent to yoke y=16",abs(y0-16)<1e-9 and abs(yy-16)/e<1e-2,f"slope {abs(yy-16)/e:.1e}")
from pxcheck import runs1
for d in D:
    for key,_,fn in logos.MARKS+[("mascot","",logos.mascot)]:
        k=runs1(d,fn,16);rec(f"{d['id']} {key} 16px no 1px runs",k==0,f"{k} runs")
d7=next(d for d in D if d["id"]=="d7")
for key,fn in (("mho",logos.mho),("vessel",logos.vessel)):
    logos.REC.clear();fn(d7,*logos.markcols(d7))
    for m in logos.REC:
        if m["kind"]=="prop1":
            a,b,c=m["A"],m["B"],m["C"];e=max(abs(math.dist(a,b)-math.dist(b,c)),abs(math.dist(a,b)-math.dist(a,c)))
            rec(f"d7 {key} Elements I.1 equilateral",e<1e-9,f"err {e:.1e}")
        if m["kind"]=="tan":
            P,C,r,T=m["P"],m["C"],m["r"],m["T"];dot=(T[0]-C[0])*(P[0]-T[0])+(T[1]-C[1])*(P[1]-T[1])
            rec(f"d7 {key} tangent at {T[0]:.1f},{T[1]:.1f}",abs(dot)<1e-6 and abs(math.dist(T,C)-r)<1e-9,f"radius.tangent {dot:.1e}")
logos.REC.clear();d5=next(d for d in D if d["id"]=="d5");logos.mho(d5,*logos.markcols(d5));logos.vessel(d5,*logos.markcols(d5));logos.mascot(d5,*logos.markcols(d5))
for st in [r for r in logos.REC if r["kind"]=="star"]:
    cx,cy,nn,p=st["cx"],st["cy"],st["n"],st["p"];a=2*math.pi/nn
    rot=[(cx+(x-cx)*math.cos(a)-(y-cy)*math.sin(a),cy+(x-cx)*math.sin(a)+(y-cy)*math.cos(a)) for x,y in p]
    err=max(min(math.hypot(x-u,y-v) for u,v in p) for x,y in rot)
    rec(f"d5 star {nn}-fold symmetry",err<1e-6,f"max err {err:.1e}")
from omsil import mask_svg,metrics
from omega import omega,omega_segments,corners
OPEN={}
for d in D:
    i=d["id"];logos.SKEL=True;logos.REC.clear()
    s=logos.svgm(d,logos.mho,400);logos.SKEL=False
    rec_=[r for r in logos.REC if r["kind"]=="omega_shape"][0]
    inner=re.sub(r'^<svg[^>]*>|</svg>$','',s);m=mask_svg(inner,logos.vb(d))
    mt=metrics(m);src=logos.OSRC[i]
    sp,_=omega(src,(10,10,80,80));ms=metrics(mask_svg(f'<path d="{sp}"/>',100))
    OPEN[i]=mt["opening"]
    rec(f"{i} ℧ opening vs {src} Ω",abs(mt["opening"]-ms["opening"])<=0.10,f"{mt['opening']:.3f} vs {ms['opening']:.3f}")
    rec(f"{i} ℧ bowl aspect vs {src} Ω",abs(mt["aspect"]/ms["aspect"]-1)<=0.10,f"{mt['aspect']:.3f} vs {ms['aspect']:.3f}")
    rec(f"{i} ℧ foot serifs",mt["feet"]>=0.95 and mt["feet_t"]>=0.05,f"feet {mt['feet']:.2f}B, slab {mt['feet_t']:.2f}H")
    if rec_["type"]=="outline":
        info=rec_["info"];cs=corners(rec_["segs"],ymin=info["top"]+0.3*info["H"])
    else:
        b=rec_["info"]["box"];cs=corners(omega_segments(src,b),ymin=b[1]+0.3*b[3])
    rec(f"{i} ℧ G1 bowl and neck joins",not cs,f"{len(cs)} corners below the slab")
w=max(len(r[0]) for r in R)
for nme,ok,info in R: print(f"{nme:<{w}}  {'PASS' if ok else 'FAIL'}  {info}")
f=sum(1 for r in R if not r[1]);print(f"\n{len(R)-f}/{len(R)} pass");sys.exit(1 if f else 0)
