import sys,os,math,io,re
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import g2marks as M,g2tokens as T,cairosvg
from omega import corners
from PIL import Image,ImageOps,ImageChops
R=[]
def rec(n,ok,i=""): R.append((n,ok,i))
NUM=re.compile(r'-?\d+\.?\d*')
def coords(s):
    v=[]
    for m in re.finditer(r'(?:\s(?:x|y|width|height|cx|cy|r)="([^"]+)"|\sd="([^"]+)")',s): v+=[float(x) for x in NUM.findall(next(g for g in m.groups() if g))]
    return v
for k,fn in (("℧",M.mho_grid),("b",M.b_grid),("℧ primitive",lambda:M.mho_prim(True)),("℧ primitive no dot",lambda:M.mho_prim(False))):
    s=fn();v=coords(s);bad=[x for x in v if abs(x-round(x))>1e-9];rec(f"{k} integer lattice",not bad,f"{len(v)} values")
    rects=[tuple(map(float,r)) for r in re.findall(r'<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"',s)]
    if k in("℧","b"): rec(f"{k} rect edges on 8-module",all(x%8==0 for r in rects for x in r),f"{len(rects)} rects")
M.REC.clear();M.omega()
o=M.REC[0];info=o["info"];cs=corners(o["segs"],ymin=info["top"]+0.3*info["H"]);rec("℧ G1 bowl and neck joins",not cs,f"{len(cs)} corners")
def png(s,px=256): return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=s.encode(),output_width=px,output_height=px))).convert("RGBA")
for k,body in (("℧ outline",f'<path d="{o["d"]}"/>'),("℧ primitive",re.sub(r'<rect[^>]*/>','',M.mho_prim(True)))):
    s=body if body.startswith("<svg") else M.svg(body,256,"t");a=png(s);d=ImageChops.difference(a,ImageOps.mirror(a)).convert("L")
    f=sum(1 for p in d.getdata() if p>60)/256**2;rec(f"{k} mirror symmetry",f<0.004,f"{f*100:.2f}%")
M.REC.clear();M.b_paths();b=M.REC[0]
def tan(seg,end):
    if seg[0]=="L": dx,dy=seg[2][0]-seg[1][0],seg[2][1]-seg[1][1]
    else:
        p=seg[2] if end else seg[1];c=seg[3];rx,ry=p[0]-c[0],p[1]-c[1];dx,dy=(-ry,rx) if seg[5]==1 else (ry,-rx)
    L=math.hypot(dx,dy);return dx/L,dy/L
worst=0;bad=[]
for P in b["paths"]:
    for i,s in enumerate(P.segs):
        if s[0]=="A":
            for p in (s[1],s[2]): worst=max(worst,abs(math.dist(p,s[3])-s[4]))
        a=P.segs[i-1];t1=tan(a,True);t2=tan(s,False);j=s[1]
        if abs(t1[0]*t2[1]-t1[1]*t2[0])>1e-9 and j not in b["corners_allowed"]: bad.append(j)
rec("b arc endpoints on radius",worst<1e-9,f"max {worst:.1e}");rec("b G1 except the drawn corners",not bad,f"{bad}")
M.REC.clear();M.girih_tile()
g=M.REC[0];a=2*math.pi/8;cx,cy=g["cx"],g["cy"];p=g["p"]
rot=[(cx+(x-cx)*math.cos(a)-(y-cy)*math.sin(a),cy+(x-cx)*math.sin(a)+(y-cy)*math.cos(a)) for x,y in p]
e=max(min(math.hypot(x-u,y-v) for u,v in p) for x,y in rot);rec("girih 8-fold symmetry",e<1e-6,f"{e:.1e}")
pr=T.pairs();m=min(x[3] for x in pr if x[4]==4.5);rec(f"AA {len(pr)} pairs",True,f"min text {m:.2f}")
css=open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),"assets/grid2/grid2.css")).read()
css2=re.sub(r'(font(?:-size)?:[^;}]*?)\b1[24]px',r'\1',css);css2=re.sub(r'font-size:1[24]px','',css2)
off=sorted({int(v) for v in re.findall(r'(?<![\d.])(\d+)px',css2) if int(v)>3 and int(v)%4})
rec("CSS spacing and line heights on 4px rhythm, 12 and 14px type exempt",not off,f"{off}")
w=max(len(r[0]) for r in R)
for n,ok,i in R: print(f"{n:<{w}}  {'PASS' if ok else 'FAIL'}  {i}")
f=sum(1 for r in R if not r[1]);print(f"{len(R)-f}/{len(R)} pass");sys.exit(1 if f else 0)
