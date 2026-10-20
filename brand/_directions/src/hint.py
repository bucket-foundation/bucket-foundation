import sys,io,json;sys.path.insert(0,__import__("os").path.dirname(__import__("os").path.abspath(__file__)))
import logos,cairosvg
from lib import D
from PIL import Image
from paths import SRC_DIR
OUT=SRC_DIR+"/hinted.json"
def hexrgb(h): return tuple(int(h[k:k+2],16) for k in (1,3,5))
def viol(m):
    N=len(m);bad=set()
    for t in (0,1):
        for a in range(N):
            line=[m[a][b] if t==0 else m[b][a] for b in range(N)];k=0
            while k<N:
                j=k
                while j<N and line[j]==line[k]: j+=1
                if j-k==1 and (line[k] or (k>0 and j<N)): bad.add((a,k) if t==0 else (k,a))
                k=j
    return bad
def hint(m):
    m=[r[:] for r in m]
    for it in range(400):
        v=viol(m)
        if not v: return m
        best=None
        cand=set()
        for y,x in v:
            for dy,dx in ((0,0),(0,1),(0,-1),(1,0),(-1,0)):
                if 0<=y+dy<len(m) and 0<=x+dx<len(m): cand.add((y+dy,x+dx))
        for y,x in cand:
            m[y][x]=not m[y][x];s=len(viol(m));m[y][x]=not m[y][x]
            if best is None or s<best[0]: best=(s,y,x)
        m[best[1]][best[2]]=not m[best[1]][best[2]]
    return m
def build(px=16):
    res={}
    F=dict((k,f) for k,_,f in logos.MARKS+[("mascot","",logos.mascot)])
    for d in D:
        fg,ac,bg=logos.markcols(d);B=hexrgb(d["c"]["bg"])
        for k,fn in F.items():
            logos.HINTED.pop(f'{d["id"]}-{k}',None)
            s=logos.svgm(d,fn,px)
            im=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=s.encode(),output_width=px,output_height=px,background_color=d["c"]["bg"]))).convert("RGB")
            m=[[sum(abs(a-b) for a,b in zip(im.getpixel((x,y)),B))>120 for x in range(px)] for y in range(px)]
            if not viol(m): continue
            h=hint(m)
            full=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=logos.svgm(d,fn,px*8).encode(),output_width=px*8,output_height=px*8,background_color=d["c"]["bg"]))).convert("RGB")
            rows=[]
            for y in range(px):
                r=[]
                for x in range(px):
                    if not h[y][x]: r.append(None);continue
                    cols=[full.getpixel((x*8+a,y*8+b)) for a in range(1,8,2) for b in range(1,8,2)]
                    cols=[c for c in cols if sum(abs(p-q) for p,q in zip(c,B))>120] or [hexrgb(fg)]
                    c=max(set(cols),key=cols.count);r.append("#%02X%02X%02X"%c)
                rows.append(r)
            res[f'{d["id"]}-{k}']=rows;print(d["id"],k,"hinted",len(viol(h)))
    json.dump(res,open(OUT,"w"))
if __name__=="__main__": build()
HAND={}
HAND_OLD={"d2-mho":["......####......","....########....","..############..","..##...##...##..",".###...##...###.",".###..####..###.","####..####..####","####..#oo#..####","####..#oo#..####","####..####..####",".####......####.",".####......####.","..############..","..############..","....########....","......####......"]}
def apply_hand():
    res=json.load(open(OUT))
    for k,rows in HAND.items():
        d=next(x for x in D if x["id"]==k.split("-")[0]);fg,ac,bg=logos.markcols(d)
        res[k]=[[{"#":fg,"o":ac}.get(c) for c in r] for r in rows]
    json.dump(res,open(OUT,"w"))
if __name__=="__main__": apply_hand()
