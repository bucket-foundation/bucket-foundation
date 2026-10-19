import math,os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
PHI=(1+5**.5)/2
T30=math.tan(math.pi/6)
LAT=("d1","d6")
from paths import DIRECTIONS_DIR,REPO_DIR
PXDIR=DIRECTIONS_DIR+"/logos/px/"
RED,BLUE,YEL="#E1251B","#1D4ED8","#FFD100"
G=None
PX=None
def small(): return PX is not None and PX<=24
def mw(u,w=100): return max(u,2.4*w/PX) if small() else u
REC=[]
def vb(d): return 256 if d["id"] in LAT else 100
def n(x):
    x=round(x,2)
    return str(int(x)) if x==int(x) else f"{x:g}"
def pts(p): return " ".join(f"{n(x)},{n(y)}" for x,y in p)
def g(s):
    if G is not None: G.append(s)
def gc(cx,cy,r): g(f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}"/>')
def gl(x1,y1,x2,y2): g(f'<path d="M{n(x1)} {n(y1)}L{n(x2)} {n(y2)}"/>')
def gr(x,y,w,h): g(f'<rect x="{n(x)}" y="{n(y)}" width="{n(w)}" height="{n(h)}"/>')
def mirror(p,cx=50): return p+[(2*cx-x,y) for x,y in reversed(p)]
def mho_path(cx,cy,R,r,T,t,F,W=100):
    REC.append(dict(kind="mho",cx=cx,cy=cy,R=R,r=r,T=T,t=t,F=F))
    for k in (R,r): gc(cx,cy,k)
    for x in (cx-R,cx-r,cx+r,cx+R): gl(x,0,x,W)
    for y in (T,T+t,cy): gl(0,y,W,y)
    gr(cx-R-F,T,F,t);gr(cx+R,T,F,t)
    return (f"M{n(cx-R-F)} {n(T)}H{n(cx-r)}V{n(cy)}A{n(r)} {n(r)} 0 0 0 {n(cx+r)} {n(cy)}V{n(T)}H{n(cx+R+F)}V{n(T+t)}H{n(cx+R)}"
            f"V{n(cy)}A{n(R)} {n(R)} 0 0 1 {n(cx-R)} {n(cy)}V{n(T+t)}H{n(cx-R-F)}Z")
def half_ring(cx,cy,R,r):
    gc(cx,cy,R);gc(cx,cy,r)
    return f"M{n(cx-R)} {n(cy)}A{n(R)} {n(R)} 0 0 0 {n(cx+R)} {n(cy)}H{n(cx+r)}A{n(r)} {n(r)} 0 0 1 {n(cx-r)} {n(cy)}Z"
def vesica(cx,y1,y2,w):
    h=(y2-y1)/2;rho=(h*h+w*w)/(2*w)
    for s in (-1,1): gc(cx+s*(rho-w),(y1+y2)/2,rho)
    return f"M{n(cx)} {n(y1)}A{n(rho)} {n(rho)} 0 0 1 {n(cx)} {n(y2)}A{n(rho)} {n(rho)} 0 0 1 {n(cx)} {n(y1)}Z"
def star(cx,cy,R,nn,m,rot=-math.pi/2):
    ri=R*math.cos(math.pi*m/nn)/math.cos(math.pi/nn)
    p=[(cx+(R if k%2==0 else ri)*math.cos(rot+math.pi*k/nn),cy+(R if k%2==0 else ri)*math.sin(rot+math.pi*k/nn)) for k in range(2*nn)]
    REC.append(dict(kind="star",cx=cx,cy=cy,n=nn,p=p))
    gc(cx,cy,R);gc(cx,cy,ri)
    for k in range(nn): gl(cx,cy,cx+R*1.1*math.cos(rot+2*math.pi*k/nn),cy+R*1.1*math.sin(rot+2*math.pi*k/nn))
    return p
def wedge(ac):
    y=100-100*T30;gl(0,100,100,y)
    for k in range(-4,8): gl(k*16,100,k*16+100,100-100*T30)
    if small(): return f'<path d="M0 100V78L100 {n(y)}V100Z" fill="{ac}"/>'
    return f'<path d="M0 100L100 {n(y)}V100Z" fill="{ac}"/>'
def rnd(path,col,w): return f'<path d="{path}" fill="{col}" stroke="{col}" stroke-width="{w}" stroke-linejoin="round"/>'
def lip(inner,dy,col):
    import re
    return f'<g transform="translate(0 {dy})">'+re.sub(r'(fill|stroke)="#[0-9A-Fa-f]{6}"',lambda m:f'{m.group(1)}="{col}"',inner)+'</g>'+inner
def grid(step,W):
    for x in range(0,W+1,step): gl(x,0,x,W);gl(0,x,W,x)
TERRA,INK,PARCH,BYB,BYY="#A6442A","#1A1714","#F3EEE3","#1E4F94","#E3A72F"
def lab(x,y,t):
    g(f'<circle cx="{n(x)}" cy="{n(y)}" r=".9" fill="currentColor"/><text x="{n(x+1.5)}" y="{n(y-1.5)}" font-size="4" font-family="serif" fill="currentColor" stroke="none">{t}</text>')
def prop1(A,B):
    d=math.dist(A,B);gc(*A,d);gc(*B,d);gl(*A,*B)
    mx,my=(A[0]+B[0])/2,(A[1]+B[1])/2;h=d*math.sqrt(3)/2;ux,uy=(B[0]-A[0])/d,(B[1]-A[1])/d
    C=(mx+uy*h,my-ux*h);gl(*A,*C);gl(*B,*C)
    REC.append(dict(kind="prop1",A=A,B=B,C=C))
    for p,t in ((A,"A"),(B,"B"),(C,"Γ")): lab(*p,t)
    return C
def tangent_pt(P,C,r,side):
    d=math.dist(P,C);a=math.atan2(P[1]-C[1],P[0]-C[0]);b=math.acos(r/d)
    c=[(C[0]+r*math.cos(a+s*b),C[1]+r*math.sin(a+s*b)) for s in (1,-1)]
    q=min(c,key=lambda p:p[0]) if side<0 else max(c,key=lambda p:p[0])
    gl(*P,*q);REC.append(dict(kind="tan",P=P,C=C,r=r,T=q));return q
def arcto(c,r,p,q):
    a=lambda z:math.atan2(z[1]-c[1],z[0]-c[0]);dl=(a(q)-a(p)+math.pi)%(2*math.pi)-math.pi
    return f"A{n(r)} {n(r)} 0 0 {1 if dl>0 else 0} {n(q[0])} {n(q[1])}"
_REFCACHE={}
def refimg(key,transform="",x=0,y=0,w=100,h=100,op=.3):
    if G is None: return
    if key not in _REFCACHE:
        import base64,io as _io
        from crops import crop
        b=_io.BytesIO();crop(key,300).save(b,"JPEG",quality=70);_REFCACHE[key]=base64.b64encode(b.getvalue()).decode()
    G.insert(0,f'<image href="data:image/jpeg;base64,{_REFCACHE[key]}" x="{x}" y="{y}" width="{w}" height="{h}" opacity="{op}" transform="{transform}" preserveAspectRatio="none"/>')
def d7_mho(fg,ac,bg,p,info):
    cx,cy,Bw=info["cx"],info["cy"],info["Bw"]
    prop1((cx-.5*Bw,cy),(cx+.5*Bw,cy));lab(cx,cy,"Ο");src_glyph("noto",(cx-.51*Bw,info["top"],1.02*Bw,info["H"]))
    refimg("mho",op=.22);gr(10,10,80,80)
    for k in (1,2): gl(10+80*k/3,10,10+80*k/3,90);gl(10,10+80*k/3,90,10+80*k/3)
    return (f'<rect x="10" y="10" width="80" height="80" fill="none" stroke="{fg}" stroke-width="2"/><path d="{p}" fill="{fg}"/>'
            f'<path d="{p}" fill="none" stroke="{bg}" stroke-opacity=".3" stroke-width=".6" transform="translate(50 {n(cy)}) scale(.86) translate(-50 {n(-cy)})"/><circle cx="50" cy="{n(cy+2)}" r="3.5" fill="{ac}"/>')
def d7_lyre(fg,ac,bg):
    refimg("lyre",transform="rotate(24 50 50)",op=.25)
    for c in ((-34,40),(134,40)): gc(c[0]+0,c[1],60)
    gc(22,30,6);gc(78,30,6)
    box=f'<path d="M26 58H74V82A8 8 0 0 1 66 90H34A8 8 0 0 1 26 82Z" fill="{ac}"/>'
    arms=(f'<path d="M26 58A60 60 0 0 1 14 22H26A60 60 0 0 0 36 58Z" fill="{ac}"/><path d="M74 58A60 60 0 0 0 86 22H74A60 60 0 0 1 64 58Z" fill="{ac}"/>')
    yoke=f'<rect x="8" y="{14 if small() else 16}" width="84" height="{10 if small() else 6}" fill="{fg}"/>'
    if small():
        arms=f'<path d="M26 60A60 60 0 0 1 12 18H28A60 60 0 0 0 40 60Z" fill="{ac}"/><path d="M74 60A60 60 0 0 0 88 18H72A60 60 0 0 1 60 60Z" fill="{ac}"/>'
        return f'<path d="M24 56H76V84A6 6 0 0 1 70 90H30A6 6 0 0 1 24 84Z" fill="{ac}"/>'+arms+f'<rect x="6" y="12" width="88" height="12" fill="{fg}"/>'
    vol=f'<circle cx="22" cy="32" r="5" fill="none" stroke="{fg}" stroke-width="1.6"/><circle cx="78" cy="32" r="5" fill="none" stroke="{fg}" stroke-width="1.6"/><circle cx="22" cy="32" r="1.6" fill="{fg}"/><circle cx="78" cy="32" r="1.6" fill="{fg}"/>'
    strings="".join(f'<path d="M{n(36+k*28/6)} 22L{n(42+k*16/6)} 78" stroke="{fg}" stroke-width="1.2"/>' for k in range(7))
    return box+arms+yoke+strings+vol+f'<rect x="38" y="76" width="24" height="3" fill="{fg}"/><circle cx="8" cy="19" r="3.5" fill="{BYB}"/><circle cx="92" cy="19" r="3.5" fill="{BYB}"/>'
GOAT_T="translate(50 50) scale(.82) translate(-54 -56)"
GOAT=[(13,31),(22,29),(34,30),(46,32),(58,31),(68,28),(76,24),(82,22),(86,23),(92,30),(96,35),(93,38),(88,37),(86,44),(84,52),(80,52),(76,56),(74,60),(77,74),(79,86),(75,87),(73,75),(70,63),(70,74),(71,88),(67,88),(66,75),(65,62),(50,63),(36,62),(33,66),(33,82),(31,86),(28,86),(29,80),(28,66),(27,64),(25,70),(26,86),(23,88),(21,87),(21,70),(17,58),(14,48),(12,38)]
GOAT_S=[(13,31),(34,30),(58,31),(76,24),(86,23),(96,35),(88,38),(84,52),(76,56),(80,88),(64,88),(64,63),(36,63),(34,88),(18,88),(14,48)]
def circ3(a,b,c):
    ax,ay=a;bx,by=b;cx_,cy_=c;dd=2*(ax*(by-cy_)+bx*(cy_-ay)+cx_*(ay-by))
    ux=((ax*ax+ay*ay)*(by-cy_)+(bx*bx+by*by)*(cy_-ay)+(cx_*cx_+cy_*cy_)*(ay-by))/dd
    uy=((ax*ax+ay*ay)*(cx_-bx)+(bx*bx+by*by)*(ax-cx_)+(cx_*cx_+cy_*cy_)*(bx-ax))/dd
    return (ux,uy),math.dist((ux,uy),a)
def d7_goat(fg,ac,bg):
    gc(50,50,48)
    refimg("goat",transform=GOAT_T,op=.3)
    o=[(85,24),(66,13),(44,20)];i_=[(81,25),(66,17),(46,22)]
    (c1,r1)=circ3(*o);(c2,r2)=circ3(*i_)
    g(f'<g transform="{GOAT_T}"><circle cx="{n(c1[0])}" cy="{n(c1[1])}" r="{n(r1)}"/><circle cx="{n(c2[0])}" cy="{n(c2[1])}" r="{n(r2)}"/></g>')
    horn=f'M85 24A{n(r1)} {n(r1)} 0 0 0 44 20L46 22A{n(r2)} {n(r2)} 0 0 1 81 25Z'
    if small():
        horn=f'M86 25A{n(r1)} {n(r1)} 0 0 0 42 19L46 25A{n(r2)} {n(r2)} 0 0 1 80 27Z'
        return f'<circle cx="50" cy="50" r="48" fill="{fg}"/><g transform="{GOAT_T}" fill="{ac}"><polygon points="{pts(GOAT_S)}"/><path d="{horn}"/></g>'
    body=f'<polygon points="{pts(GOAT)}"/><polygon points="86,40 88,52 83,46"/><polygon points="13,31 8,27 9,36 12,38"/><path d="{horn}"/>'
    return (f'<circle cx="50" cy="50" r="48" fill="{fg}"/><circle cx="50" cy="50" r="44" fill="none" stroke="{ac}" stroke-width="1" stroke-dasharray="1 3"/>'
            f'<g transform="{GOAT_T}" fill="{ac}">{body}<circle cx="86" cy="28" r="1.4" fill="{fg}"/></g>')
def d7_vessel(fg,ac,bg):
    refimg("vessel",op=.3)
    C=(50,54);r=25;gc(*C,r);lab(*C,"Κ")
    P1,P2,F1,F2=(39,30),(61,30),(45,82),(55,82)
    tl=tangent_pt(P1,C,r,-1);tr=tangent_pt(P2,C,r,1);bl=tangent_pt(F1,C,r,-1);br=tangent_pt(F2,C,r,1)
    for p,t in ((tl,"Α"),(bl,"Β"),(tr,"Γ"),(br,"Δ")): lab(*p,t)
    path=f"M39 25V30L{n(tl[0])} {n(tl[1])}{arcto(C,r,tl,bl)}L45 82H37V89H63V82H55L{n(br[0])} {n(br[1])}{arcto(C,r,br,tr)}L61 30V25Z"
    hw=n(mw(3.5))
    handles=f'<path d="M39 28A9 10 0 1 0 31 40M61 28A9 10 0 1 1 69 40" fill="none" stroke="{fg}" stroke-width="{hw}" stroke-linecap="round"/>'
    lid=f'<path d="M31 23H69L63 16H37Z" fill="{fg}"/><rect x="47" y="11" width="6" height="6" fill="{fg}"/><circle cx="50" cy="10" r="4" fill="{fg}"/>'
    if small(): return handles+f'<path d="{path}" fill="{ac}"/>'+lid
    band="".join(f'<rect x="{n(50-math.sqrt(r*r-(y-54)**2))}" y="{y}" width="{n(2*math.sqrt(r*r-(y-54)**2))}" height="{h}" fill="{fg}"/>' for y,h in ((66,4),(38,3)))
    key='<path d="M36 66.6h6v2h-4v1.2h-2ZM47 66.6h6v2h-4v1.2h-2ZM58 66.6h6v2h-4v1.2h-2Z" fill="'+ac+'"/>'
    tongues="".join(f'<path d="M{n(50+20*math.cos(math.radians(a)))} {n(54+20*math.sin(math.radians(a)))}L{n(50+24.5*math.cos(math.radians(a)))} {n(54+24.5*math.sin(math.radians(a)))}"/>' for a in range(-150,-25,8))
    spir="".join(f'<circle cx="{x}" cy="55" r="{r_}"/>' for x in (31,69) for r_ in (1.5,3,4.5))
    ry=[];y0,y1=71,79
    hw=lambda y:math.sqrt(max(r*r-(y-54)**2,0))
    for k in range(-4,5):
        x=50+k*3.6;ry.append(f'{n(x-1.6)},{y1} {n(x)},{y0} {n(x+1.6)},{y1}')
    rays="".join(f'<polygon points="{p}"/>' for p in ry)
    palm="".join(f'<ellipse cx="{n(40.5+k*3.8)}" cy="27.5" rx="1.2" ry="2"/>' for k in range(6))
    detail=(f'<g fill="none" stroke="{fg}" stroke-width=".8">{tongues}{spir}</g><g fill="{fg}">{rays}{palm}</g>'
            f'<path d="{path}" fill="none" stroke="{fg}" stroke-width="1"/><path d="M41 54H59M44 50l3 4M53 50l3 4" stroke="{fg}" stroke-width=".7"/>')
    return handles+f'<path d="{path}" fill="{ac}"/>'+band+key+detail+lid+f'<rect x="37" y="87" width="26" height="2" fill="{fg}"/>'
OWL_T="translate(50 50) scale(.84) translate(-50 -52)"
OWL=[(30,26),(24,40),(19,58),(20,76),(28,94),(44,100),(58,98),(66,86),(74,68),(78,48),(74,30)]
def d7_mascot(fg,ac,bg):
    refimg("owl",transform=OWL_T,op=.3)
    g(f'<g transform="{OWL_T}"><ellipse cx="52" cy="20" rx="24" ry="17"/><circle cx="42" cy="18" r="7"/><circle cx="64" cy="18" r="7"/></g>')
    sq=f'<rect x="4" y="4" width="92" height="92" fill="{fg}"/>'
    owl=f'<polygon points="{pts(OWL)}"/><ellipse cx="52" cy="20" rx="24" ry="17"/>'
    if small(): return sq+f'<g transform="{OWL_T}" fill="{ac}">{owl}</g><g transform="{OWL_T}" fill="{bg}"><circle cx="41" cy="18" r="8"/><circle cx="65" cy="18" r="8"/></g>'
    eyes=f'<g fill="{bg}"><circle cx="42" cy="18" r="7"/><circle cx="64" cy="18" r="7"/></g><g fill="{fg}"><circle cx="42" cy="18" r="3.5"/><circle cx="64" cy="18" r="3.5"/><polygon points="50,26 56,26 53,34"/></g>'
    wing=f'<path d="M36 40A44 44 0 0 0 58 96" fill="none" stroke="{fg}" stroke-width="2"/><path d="M46 44A40 40 0 0 0 62 88" fill="none" stroke="{fg}" stroke-width="1.2"/>'
    feathers="".join(f'<path d="M{x} {y}l3 3 3-3" fill="none" stroke="{fg}" stroke-width="1"/>' for x,y in ((60,46),(64,54),(62,62),(66,70)))
    leaves=f'<path d="{vesica(14,10,26,3)}" fill="{BYY}" transform="rotate(-40 14 18)"/><path d="{vesica(20,6,22,3)}" fill="{BYY}" transform="rotate(30 20 14)"/>'
    moon='<path d="M86 10A8 8 0 1 0 86 26A6 6 0 1 1 86 10Z" fill="'+BYY+'"/>'
    contour=f'<polygon points="{pts(OWL)}" fill="none" stroke="{fg}" stroke-width="1.2"/><ellipse cx="52" cy="20" rx="24" ry="17" fill="none" stroke="{fg}" stroke-width="1.2"/>'
    disc=f'<g fill="none" stroke="{fg}" stroke-width=".9"><circle cx="42" cy="18" r="10"/><circle cx="64" cy="18" r="10"/><path d="M30 10L53 23L76 10"/></g>'
    scales="".join(f'<path d="M{n(x)} {y}a2.6 2.6 0 0 0 5.2 0"/>' for r_,y in enumerate(range(44,86,6)) for x in [26+3*(r_%2)+6*k for k in range(6)] if x<60-(y-44)*.2)
    prim="".join(f'<path d="M{60+k*3} {58+k*2}L{58+k*2} {94-k}"/>' for k in range(5))
    feet=f'<path d="M42 98l-3 4M44 98v5M46 98l3 4M56 97l-3 4M58 97v5M60 97l3 4" stroke="{fg}" stroke-width="1.2"/>'
    detail=f'<g fill="none" stroke="{fg}" stroke-width=".8">{scales}{prim}</g>'
    return sq+f'<g transform="{OWL_T}" fill="{ac}">{owl}{detail}{disc}{eyes}{wing}{contour}{feet}</g>'+leaves+moon
import json as _json
from omega import omega as _omega
FONT={"d1":"noto","d2":"gentium","d3":"gentiumb","d4":"noto","d5":"cardo","d6":"noto","d7":"didot"}
FONTNAME={"noto":"Noto Serif","gentium":"Gentium Book Plus","gentiumb":"Gentium Book Plus Bold","cardo":"Cardo","didot":"GFS Didot"}
CANON=_json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),"canon.json")))["canon"]
def GL(key,box): return _omega(key,box)[0]
def src_glyph(key,box,label=True):
    g(f'<path d="{GL(key,box)}" stroke-dasharray="3 2" class="srcglyph"/>')
    if label: g(f'<text x="{n(box[0])}" y="{n(box[1]+box[3]+6)}" font-size="{n(box[2]*.06)}" font-family="sans-serif" fill="currentColor" stroke="none">{FONTNAME[key]} Ω, 180°</text>')
def omega_line(cx,cy,rx,ry,dy,dx,ext):
    REC.append(dict(kind="omega",cx=cx,cy=cy,rx=rx,ry=ry,dy=dy,dx=dx))
    g(f'<ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(rx)}" ry="{n(ry)}"/>');gl(cx-ext,cy-dy,cx+ext,cy-dy);gl(cx,0,cx,cy+ry+20)
    gl(cx-dx,cy-dy,cx,cy);gl(cx+dx,cy-dy,cx,cy)
    return f"M{n(cx-ext)} {n(cy-dy)}H{n(cx-dx)}A{n(rx)} {n(ry)} 0 1 0 {n(cx+dx)} {n(cy-dy)}H{n(cx+ext)}"
def horn(key,x0,y0,w,h): return GL(key,(x0,y0,w,h))
BMP={"d1-mho":["................","................",".######..######.",".######..######.","...###....###...","..###......###..","..##........##..","..##........##..","..##...AA...##..","..##...AA...##..","..###......###..","...###....###...","....########....",".....######.....","................","................"],
"d1-goat":["..............AA","..............AA",".#####....#####.",".#####....#####.","...##......##...","...##......##...","...###....###...","##.##########.##","####.######.####","..############..","...##########...","....########....",".....######.....","......####......","......####......","................"]}
def bitmap(key,fg,ac,cell=16):
    out=[]
    for y,row in enumerate(BMP[key]):
        x=0
        while x<len(row):
            c=row[x]
            if c in "#A":
                s_=x
                while x<len(row) and row[x]==c: x+=1
                out.append(f'<rect x="{s_*cell}" y="{y*cell}" width="{(x-s_)*cell}" height="{cell}" fill="{fg if c=="#" else ac}"/>')
            else: x+=1
    return "".join(out)
def omega_bold(cx,cy,rx,ry,dy,ext,col,sw):
    dx=rx*math.sqrt(1-(dy/ry)**2)
    return f'<path d="{omega_line(cx,cy,rx,ry,dy,dx,ext)}" fill="none" stroke="{col}" stroke-width="{n(sw)}" stroke-linejoin="bevel"/>'
from outline import omega_outline
SKEL=False
OSRC={"d1":"noto","d2":"gentium","d3":"gentiumb","d4":"noto","d5":"cardo","d6":"noto","d7":"noto"}
OBOX={"d2":(27,22,46,50),"d3":(14,12,72,70),"d4":(12,8,76,78),"d5":(25,24,50,52)}
def omega_shape(i):
    if i in ("d1","d6"):
        p,segs,info=omega_outline(128,18,200,rnd=True);return "outline",p,segs,info
    if i=="d7":
        p,segs,info=omega_outline(50,21,52);return "outline",p,segs,info
    b=OBOX[i];return "glyph",GL(OSRC[i],b),None,dict(box=b)
def outline_guides(info):
    cx,cy,Bw=info["cx"],info["cy"],info["Bw"]
    g(f'<ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(Bw/2)}" ry="{n(.52*Bw)}"/><ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(.35*Bw)}" ry="{n(.45*Bw)}"/>')
    gl(cx-.09*Bw,info["top"],cx-.09*Bw,cy);gl(cx+.09*Bw,info["top"],cx+.09*Bw,cy);gl(0,cy,cx*2,cy)
    gr(cx-Bw/2,info["top"],Bw,info["H"])
def omark(d,fg,ac,bg):
    i=d["id"];kind,p,segs,info=omega_shape(i)
    REC.append(dict(kind="omega_shape",dir=i,type=kind,segs=segs,info=info))
    if SKEL: return f'<path d="{p}" fill="#000"/>'
    if kind=="outline": outline_guides(info)
    if i=="d1":
        grid(32,256);src_glyph("noto",(28,18,200,220))
        return f'<path d="{p}" fill="{fg}"/><rect x="112" y="128" width="32" height="32" fill="{ac}"/>'
    if i=="d6":
        grid(32,256);src_glyph("noto",(28,18,200,220))
        return (f'<path d="{p}" fill="{BLUE}"/><rect x="24" y="16" width="48" height="48" fill="{RED}"/><rect x="184" y="16" width="48" height="48" fill="{YEL}"/>'
                f'<circle cx="128" cy="136" r="20" fill="{fg}"/>')
    if i=="d2":
        b=info["box"];gc(50,50,46);src_glyph("gentium",b)
        return f'<circle cx="50" cy="50" r="46" fill="{fg}"/><path d="{p}" fill="{bg}"/><circle cx="50" cy="{n(b[1]+b[3]*.6)}" r="3.5" fill="{ac}"/>'
    if i=="d3":
        grid(10,100);b=info["box"];src_glyph("gentiumb",b)
        return lip(rnd(p,ac,4),5,"#1F5600")+f'<circle cx="50" cy="{n(b[1]+b[3]*.6)}" r="7" fill="#FF4B91"/>'
    if i=="d4":
        b=info["box"];src_glyph("noto",b);gl(100,30,52,58)
        cut=f'<polygon points="100,30 100,46 58,58" fill="{ac}"/>'
        slit=f'<path d="M6 {n(54+44*T30)}L44 {n(54+22*T30)}" stroke="{bg}" stroke-width="3"/>'
        return wedge(ac)+f'<path d="{p}" fill="{fg}"/>'+slit+cut+f'<circle cx="50" cy="{n(b[1]+b[3]*.6)}" r="5" fill="{ac}"/>'
    if i=="d5":
        s=star(50,50,48,16,5);b=info["box"];src_glyph("cardo",b)
        return f'<polygon points="{pts(s)}" fill="none" stroke="{ac}" stroke-width="2.5" stroke-linejoin="round"/><path d="{p}" fill="{fg}"/><circle cx="50" cy="{n(b[1]+b[3]*.62)}" r="4" fill="{ac}"/>'
    return d7_mho(fg,ac,bg,p,info)
def mho(d,fg,ac,bg):
    return omark(d,fg,ac,bg)
import re as _re
def _sc(v,k): return n(float(v)*k)
def _scpath(dd,k):
    out=[];toks=_re.findall(r'[A-Za-z]|-?\d*\.?\d+',dd);cmd=None;idx=0
    for t in toks:
        if t.isalpha(): cmd=t;idx=0;out.append(t);continue
        if cmd in "Aa": out.append(t if idx%7 in (2,3,4) else _sc(t,k))
        else: out.append(_sc(t,k))
        idx+=1
    r="";prev=""
    for t in out:
        r+=(" " if prev and not prev.isalpha() and not t.isalpha() else "")+t;prev=t
    return r
def scale4(svg,k=4):
    svg=_re.sub(r'\s(x|y|width|height|cx|cy|r|rx|ry|stroke-width)="([-\d.]+)"',lambda m:f' {m.group(1)}="{_sc(m.group(2),k)}"',svg)
    svg=_re.sub(r'points="([^"]+)"',lambda m:'points="'+" ".join(",".join(_sc(v,k) for v in p.split(",")) for p in m.group(1).split())+'"',svg)
    svg=_re.sub(r'\sd="([^"]+)"',lambda m:f' d="{_scpath(m.group(1),k)}"',svg)
    svg=_re.sub(r'rotate\(([-\d.]+) ([-\d.]+) ([-\d.]+)\)',lambda m:f'rotate({m.group(1)} {_sc(m.group(2),k)} {_sc(m.group(3),k)})',svg)
    return svg
def goat256(d,fg,ac,bg):
    i=d["id"];grid(32,256)
    if i=="d1":
        if small(): return bitmap("d1-goat",fg,ac)
        sw=32 if small() else 24
        head=mirror([(72,112),(72,152),(104,200),(112,232),(128,248)],128)
        return (f'<path d="{omega_line(128,88,60,50,40,36,96)}" fill="none" stroke="{fg}" stroke-width="{sw}"/><polygon points="{pts(head)}" fill="{fg}"/>'
                f'<polygon points="72,120 24,136 72,152" fill="{fg}"/><polygon points="184,120 232,136 184,152" fill="{fg}"/>'
                f'<rect x="88" y="144" width="24" height="16" fill="{bg}"/><rect x="144" y="144" width="24" height="16" fill="{bg}"/>{'<rect x="224" y="0" width="32" height="32" fill="'+ac+'"/>' if small() else '<rect x="224" y="8" width="24" height="24" fill="'+ac+'"/>'}')
    gc(128,100,60);gc(128,100,36)
    return (f'<circle cx="128" cy="100" r="60" fill="{BLUE}"/><circle cx="128" cy="100" r="36" fill="{bg}"/><rect x="104" y="32" width="48" height="56" fill="{bg}"/>'
            f'<rect x="40" y="40" width="40" height="40" fill="{RED}"/><rect x="176" y="40" width="40" height="40" fill="{YEL}"/><polygon points="64,136 192,136 128,248" fill="{RED}"/>'
            f'<circle cx="104" cy="164" r="12" fill="{bg}"/><circle cx="152" cy="164" r="12" fill="{bg}"/>')
def mho_legacy(d,fg,ac,bg):
    i=d["id"]
    if i=="d7": return d7_mho(fg,ac,bg)
    if i=="d1":
        grid(8,64)
        if small(): return f'<path d="{mho_path(32,32,24,8,8,8,8,64)}" fill="{fg}"/><rect x="24" y="0" width="16" height="8" fill="{ac}"/>'
        return f'<path d="{mho_path(32,32,16,8,16,8,8,64)}" fill="{fg}"/><rect x="48" y="48" width="8" height="8" fill="{ac}"/>'
    if i=="d2":
        R=46/PHI**2;r=R/PHI;gc(50,50,46);gr(50-R,50-R,2*R,2*R/PHI)
        return f'<circle cx="50" cy="50" r="46" fill="{fg}"/><path d="{mho_path(50,50,R,r,50-R,R-r,R-r)}" fill="{bg}"/><circle cx="50" cy="{n(50+R+(46-R)/2)}" r="4" fill="{ac}"/>'
    if i=="d3":
        grid(10,100);p=mho_path(50,50,20,10,30,10,10)
        return lip(rnd(p,ac,6),5,"#1F5600")
    if i=="d4":
        return wedge(ac)+f'<path d="{mho_path(50,52,20,8,26,12,14)}" fill="{fg}"/>'
    if i=="d5":
        s=star(50,50,48,16,5)
        if small(): return f'<circle cx="50" cy="50" r="48" fill="{ac}"/>'+rnd(mho_path(50,50,22,11,26,11,8),"#062027",2)
        return f'<polygon points="{pts(s)}" fill="none" stroke="{ac}" stroke-width="2.5" stroke-linejoin="round"/>'+rnd(mho_path(50,50,18,11,32,7,7),fg,2)
    grid(8,64)
    REC.append(dict(kind="mho",cx=32,cy=32,R=16,r=8,T=16,t=8,F=8))
    return (f'<path d="{half_ring(32,32,16,8)}" fill="{BLUE}"/><rect x="16" y="16" width="8" height="16" fill="{fg}"/><rect x="40" y="16" width="8" height="16" fill="{fg}"/>'
            f'<rect x="8" y="16" width="8" height="8" fill="{RED}"/><rect x="48" y="16" width="8" height="8" fill="{YEL}"/><circle cx="32" cy="56" r="4" fill="{ac}"/>')
def lyre(d,fg,ac,bg):
    i=d["id"]
    if i=="d7": return d7_lyre(fg,ac,bg)
    if i in LAT:
        grid(8,64)
        if i=="d6":
            gc(8,40,24);gc(8,40,16);gc(56,40,24);gc(56,40,16)
            REC.append(dict(kind="lyre6"))
            return (f'<path d="M8 16A24 24 0 0 1 32 40H24A16 16 0 0 0 8 24Z" fill="{RED}"/><path d="M56 16A24 24 0 0 0 32 40H40A16 16 0 0 1 56 24Z" fill="{BLUE}"/>'
                    f'<rect x="0" y="8" width="64" height="8" fill="{fg}"/><rect x="24" y="40" width="16" height="8" fill="{fg}"/><rect x="8" y="48" width="48" height="8" fill="{fg}"/>'
                    +("" if small() else f'<rect x="16" y="16" width="8" height="16" fill="{fg}"/><rect x="40" y="16" width="8" height="16" fill="{fg}"/>')+f'<circle cx="32" cy="28" r="4" fill="{ac}"/>')
        return (f'<rect x="0" y="8" width="8" height="48" fill="{fg}"/><rect x="56" y="8" width="8" height="48" fill="{fg}"/><rect x="0" y="8" width="64" height="8" fill="{fg}"/>'
                f'<rect x="8" y="48" width="48" height="8" fill="{fg}"/>'+("" if small() else f'<rect x="16" y="16" width="8" height="32" fill="{fg}"/><rect x="40" y="16" width="8" height="32" fill="{fg}"/>')+f'<rect x="24" y="0" width="16" height="8" fill="{ac}"/>')
    if small():
        if i=="d2":
            return f'<circle cx="50" cy="50" r="48" fill="{fg}"/><path d="M30 76A40 40 0 0 1 22 30H34A40 40 0 0 0 42 76ZM70 76A40 40 0 0 0 78 30H66A40 40 0 0 1 58 76Z" fill="{bg}"/><rect x="18" y="20" width="64" height="12" fill="{bg}"/><rect x="28" y="70" width="44" height="12" fill="{bg}"/><rect x="45" y="32" width="10" height="38" fill="{ac}"/>'
            return f'<circle cx="50" cy="50" r="48" fill="{fg}"/><path d="M24 22H76V36H68V52A18 18 0 0 1 32 52V36H24Z" fill="{bg}"/><path d="M44 36H56V60H44Z" fill="{fg}"/><circle cx="50" cy="84" r="6" fill="{ac}"/>'
        if i=="d3":
            return lip(rnd("M16 16H84V34H72V62A22 22 0 0 1 28 62V34H16ZM42 34V70H58V34Z",ac,6),5,"#1F5600")
        if i=="d4":
            return wedge(ac)+f'<polygon points="12,14 30,14 42,78 26,78" fill="{fg}"/><polygon points="88,14 70,14 58,78 74,78" fill="{fg}"/><rect x="12" y="14" width="76" height="14" fill="{fg}"/><rect x="26" y="72" width="48" height="14" fill="{fg}"/>'
        st=star(50,50,49,8,2)
        return f'<polygon points="{pts(st)}" fill="{ac}"/><path d="M28 26H72V40H64V62H72V76H28V62H36V40H28Z" fill="#062027"/><rect x="44" y="40" width="12" height="22" fill="#062027"/>'
    sw=mw({"d2":5,"d3":11,"d4":9,"d5":5}[i]);cap="butt" if i=="d4" else "round"
    if i=="d4":
        dx=60*T30*.5;arms=f'M{n(34-dx)} 22L34 84M{n(66+dx)} 22L66 84';gl(34,84,34-dx,22);gl(66,84,66+dx,22)
    else:
        rho=70
        for x0,x1 in ((34,30),(66,70)):
            mx,my=(x0+x1)/2,50;L=math.hypot(x1-x0,68);k=math.sqrt(rho*rho-(L/2)**2);ux,uy=(x1-x0)/L,-68/L
            sg=1 if x0<50 else -1;gc(mx+sg*uy*k,my-sg*ux*k,rho);gl(x0,84,x1,16)
        arms=f'M34 84A{rho} {rho} 0 0 1 30 16M66 84A{rho} {rho} 0 0 0 70 16'
    body=f'<path d="{arms}" fill="none" stroke="{fg}" stroke-width="{sw}" stroke-linecap="{cap}"/><path d="M24 30H76M32 84H68" stroke="{fg}" stroke-width="{sw}" stroke-linecap="{cap}"/>'
    body+="".join(f'<path d="M{x} 30V84" stroke="{ac if k==1 else fg}" stroke-width="{n(mw(max(2,sw/3)))}"/>' for k,x in enumerate((42,50,58)) if not small() or k==1)
    if i=="d2": gc(50,50,47);body=f'<circle cx="50" cy="50" r="47" fill="none" stroke="{fg}" stroke-width="{n(mw(2))}"/>'+body
    if i=="d3": body=lip(body,4,"#1F5600")
    if i=="d4": body=wedge(ac)+body
    if i=="d5": s=star(50,52,47,8,3);body=("" if small() else f'<polygon points="{pts(s)}" fill="none" stroke="{ac}" stroke-width="2"/>')+body
    return body
def goat(d,fg,ac,bg):
    i=d["id"]
    if i in LAT: return goat256(d,fg,ac,bg)
    if i=="d7": return d7_goat(fg,ac,bg)
    if i=="d1":
        grid(8,64)
        head=mirror([(8,32),(8,40),(24,56),(32,64)],32)
        return (f'<path d="{mho_path(32,24,16,8,8,8,8,64)}" fill="{fg}"/><polygon points="{pts(head)}" fill="{fg}"/>'
                f'<rect x="16" y="40" width="8" height="8" fill="{bg}"/><rect x="40" y="40" width="8" height="8" fill="{bg}"/><rect x="56" y="0" width="8" height="8" fill="{ac}"/>')
    if i=="d6":
        grid(8,64)
        return (f'<path d="{half_ring(32,24,16,8)}" fill="{BLUE}"/><rect x="16" y="8" width="8" height="16" fill="{fg}"/><rect x="40" y="8" width="8" height="16" fill="{fg}"/>'
                f'<rect x="8" y="8" width="8" height="8" fill="{fg}"/><rect x="48" y="8" width="8" height="8" fill="{fg}"/><polygon points="16,32 48,32 32,64" fill="{RED}"/>'
                f'<circle cx="26" cy="40" r="3" fill="{bg}"/><circle cx="38" cy="40" r="3" fill="{bg}"/>')
    if i=="d2":
        R=46*.3;r=R*.58;gc(50,50,46)
        return (f'<circle cx="50" cy="50" r="46" fill="{fg}"/><g fill="{bg}"><path d="{horn("gentium",30.40,20,39.19,31.80)}"/><path d="{vesica(50,40,86,R)}"/>'
                f'<path d="{vesica(34,44,64,5)}" transform="rotate(60 34 54)"/><path d="{vesica(66,44,64,5)}" transform="rotate(-60 66 54)"/></g>'
                f'<circle cx="43.5" cy="58" r="2.6" fill="{fg}"/><circle cx="56.5" cy="58" r="2.6" fill="{fg}"/><circle cx="50" cy="14" r="3.5" fill="{ac}"/>')
    if i=="d3":
        grid(10,100);head=mirror([(30,50),(40,80),(50,90)])
        b=rnd(horn("gentiumb",20.00,20,60.00,40.00),ac,6)+rnd(f'M{pts(head)}Z',ac,6)+rnd("M30 50L10 60H30ZM70 50L90 60H70Z",ac,6)
        return lip(b,5,"#1F5600")+'<circle cx="42" cy="62" r="5" fill="#fff"/><circle cx="58" cy="62" r="5" fill="#fff"/><circle cx="43" cy="63" r="2.5" fill="#1A1A1A"/><circle cx="59" cy="63" r="2.5" fill="#1A1A1A"/>'
    if i=="d4":
        dy=18/T30
        if small():
            hd=[(30,46),(70,46),(58,88),(42,88)]
            return wedge(ac)+f'{omega_bold(50,30,24,22,16,40,fg,14)}<polygon points="{pts(hd)}" fill="{fg}"/>'
        head=[(32,46),(68,46),(50,46+dy)];gl(32,46,50,46+dy);gl(68,46,50,46+dy)
        beard=[(46,46+dy-4/T30),(54,46+dy-4/T30),(50,96)]
        return (wedge(ac)+f'<path d="{horn("noto",20.00,20,60.00,38.00)}" fill="{fg}"/><polygon points="{pts(head)}" fill="{fg}"/><polygon points="{pts(beard)}" fill="{fg}"/>'
                f'<polygon points="32,46 14,{n(46+18*T30)} 32,{n(46+18*T30)}" fill="{fg}"/><polygon points="68,46 86,{n(46+18*T30)} 68,{n(46+18*T30)}" fill="{fg}"/>'
                +("" if small() else f'<polygon points="39,54 46,54 46,{n(54+7*T30)}" fill="{bg}"/><polygon points="61,54 54,54 54,{n(54+7*T30)}" fill="{bg}"/>'))
    head=mirror([(30,42),(30,58),(42,72),(44,88),(50,94)])
    oc=[(50+44*math.cos(math.pi/8+k*math.pi/4),50+44*math.sin(math.pi/8+k*math.pi/4)) for k in range(8)]
    REC.append(dict(kind="star",cx=50,cy=50,n=8,p=oc))
    for x,y in oc: gl(50,50,x,y)
    if small(): return omega_bold(50,30,24,22,16,40,fg,14)+rnd("M30 46H70L58 76L50 94L42 76Z",fg,4)
    return (rnd(horn("cardo",24.00,8,52.00,40.00),fg,2)+rnd(f"M{pts(head)}Z",fg,2)+("" if small() else rnd("M30 42L12 50L30 56ZM70 42L88 50L70 56Z",fg,2))
            +f'<path d="M50 74l6 6-6 6-6-6Z" fill="{ac}"/>'+("" if small() else f'<path d="M40 52l3 3-3 3-3-3ZM60 52l3 3-3 3-3-3Z" fill="{ac}"/>'))
def cornucopia(ac):
    c1=(46,40);r1=40;c2=(36,48);r2=30
    dx,dy=c2[0]-c1[0],c2[1]-c1[1];dd=math.hypot(dx,dy);u=(-dx/dd,-dy/dd)
    a=(r1*r1-r2*r2+dd*dd)/(2*dd);h=math.sqrt(r1*r1-a*a);px,py=c1[0]+a*dx/dd,c1[1]+a*dy/dd
    tips=[(px+h*dy/dd,py-h*dx/dd),(px-h*dy/dd,py+h*dx/dd)];tip=max(tips,key=lambda p:p[1])
    gc(*c1,r1);gc(*c2,r2)
    o1=(c1[0]+r1*u[0],c1[1]+r1*u[1]);i1=(c2[0]+r2*u[0],c2[1]+r2*u[1])
    ang=lambda c,p:math.atan2(p[1]-c[1],p[0]-c[0])
    def arc(c,r,p,q):
        dl=(ang(c,q)-ang(c,p)+math.pi)%(2*math.pi)-math.pi
        return f"A{n(r)} {n(r)} 0 0 {1 if dl>0 else 0} {n(q[0])} {n(q[1])}"
    path=f"M{n(o1[0])} {n(o1[1])}{arc(c1,r1,o1,tip)}{arc(c2,r2,tip,i1)}Z"
    REC.append(dict(kind="corn",tip=tip,c1=c1,r1=r1,c2=c2,r2=r2))
    m=((o1[0]+i1[0])/2,(o1[1]+i1[1])/2)
    ticks="".join(f'<path d="M{n(c1[0]+(r1-6)*math.cos(t))} {n(c1[1]+(r1-6)*math.sin(t))}l{n(4*math.cos(t+1))} {n(4*math.sin(t+1))}"/>' for t in (math.radians(a_) for a_ in (60,90,120)))
    return path,m,ticks
def vessel(d,fg,ac,bg):
    i=d["id"]
    if i=="d7": return d7_vessel(fg,ac,bg)
    if i=="d1":
        grid(8,64);gc(32,40,16);gc(32,40,8)
        REC.append(dict(kind="mho",cx=32,cy=40,R=16,r=8,T=16,t=0,F=0))
        return f'<path d="M16 16H24V40A8 8 0 0 0 40 40V16H48V40A16 16 0 0 1 16 40Z" fill="{fg}"/><rect x="48" y="0" width="8" height="8" fill="{ac}"/>'
    if i=="d2":
        a=46/PHI**3;w=46/PHI**4;L=46*.72;gc(50,50,46);gc(50,50,L);gr(50-a,50-a,2*a,2*a)
        if small(): return f'<circle cx="50" cy="50" r="48" fill="{fg}"/><g fill="{bg}"><rect x="28" y="16" width="14" height="68"/><rect x="58" y="16" width="14" height="68"/><rect x="16" y="28" width="68" height="14"/><rect x="16" y="58" width="68" height="14"/></g><rect x="42" y="42" width="16" height="16" fill="{ac}"/>'
        bars="".join(f'<rect x="{n(50+s*a-w/2)}" y="{n(50-L)}" width="{n(w)}" height="{n(2*L)}"/><rect x="{n(50-L)}" y="{n(50+s*a-w/2)}" width="{n(2*L)}" height="{n(w)}"/>' for s in (-1,1))
        return f'<circle cx="50" cy="50" r="46" fill="{fg}"/><circle cx="50" cy="50" r="{n(L)}" fill="{bg}"/><circle cx="50" cy="50" r="{n(L-3)}" fill="{fg}"/><g fill="{bg}">{bars}</g><rect x="{n(50-a+w/2)}" y="{n(50-a+w/2)}" width="{n(2*a-w)}" height="{n(2*a-w)}" fill="{ac}"/>'
    if i=="d3":
        grid(10,100);path,m,ticks=cornucopia(ac)
        body=lip(rnd(path,ac,4),5,"#1F5600")
        if small(): return body+f'<circle cx="{n(m[0]+2)}" cy="{n(m[1]-10)}" r="14" fill="#FF4B91"/>'
        return body+f'<g stroke="#FF4B91" stroke-width="4" stroke-linecap="round">{ticks}</g><circle cx="{n(m[0]+4)}" cy="{n(m[1]-8)}" r="9" fill="#FF4B91"/><circle cx="{n(m[0]+12)}" cy="{n(m[1]+8)}" r="7" fill="#1CB0F6"/><circle cx="{n(m[0]-6)}" cy="{n(m[1]-18)}" r="5" fill="#FFC800"/>'
    if i=="d4":
        if small():
            sd=[(50+(16+14*((y-56)/34)**2)*0+math.sqrt(1+((y-56)/34)**2)*14,y) for y in range(18,94,6)]
            sd=[(x+0,y) for x,y in sd];hy=[(100-x,y) for x,y in sd]+[(x,y) for x,y in reversed(sd)]
            hy=[(50+(x-50)*1.2,y) for x,y in hy]
            return wedge(ac)+f'<polygon points="{pts(hy)}" fill="{fg}"/><rect x="26" y="12" width="48" height="14" fill="{fg}"/>'
        N=18;ph=2*math.pi*.36;out=[];lw=mw(1.6) if small() else 1.6
        eb=lambda t:(50+30*math.cos(t),90+5*math.sin(t));et=lambda t:(50+16*math.cos(t),16+3*math.sin(t))
        REC.append(dict(kind="hyper",N=N,ph=ph))
        for k in range(N):
            t=2*math.pi*k/N
            for s in (1,-1):
                p=eb(t);q=et(t+s*ph);front=math.sin(t+s*ph/2)>0
                out.append(f'<path d="M{n(p[0])} {n(p[1])}L{n(q[0])} {n(q[1])}" stroke-opacity="{1 if front else .4}"/>')
        g('<ellipse cx="50" cy="90" rx="30" ry="5"/><ellipse cx="50" cy="16" rx="16" ry="3"/>')
        return wedge(ac)+f'<g stroke="{fg}" stroke-width="{n(lw)}" stroke-linecap="round">{"".join(out)}</g><ellipse cx="50" cy="90" rx="30" ry="5" fill="none" stroke="{fg}" stroke-width="{n(mw(3))}"/><ellipse cx="50" cy="16" rx="16" ry="3" fill="none" stroke="{fg}" stroke-width="{n(mw(3))}"/>'
    if i=="d5":
        s=star(50,58,28,8,3);gc(50,58,36)
        if small(): return f'<circle cx="50" cy="58" r="38" fill="{fg}"/><polygon points="{pts(s)}" fill="#0B2A5B"/><path d="M40 22H60V12H40Z" fill="{fg}"/>'
        return (f'<circle cx="50" cy="58" r="36" fill="none" stroke="{fg}" stroke-width="5"/><circle cx="50" cy="58" r="31" fill="none" stroke="{ac}" stroke-width="1.5"/>'
                f'<polygon points="{pts(s)}" fill="{ac}"/><circle cx="50" cy="58" r="4" fill="{bg}"/><path d="M43 22H57V14H43Z" fill="{fg}"/><circle cx="50" cy="8" r="5" fill="none" stroke="{fg}" stroke-width="3"/>')
    grid(8,64);gc(32,40,16)
    return (f'<circle cx="52" cy="28" r="10" fill="none" stroke="{BLUE}" stroke-width="{n(mw(4,64))}"/><path d="M16 40A16 16 0 0 1 48 40Z" fill="{fg}"/><rect x="24" y="16" width="16" height="8" fill="{fg}"/>'
            f'<circle cx="32" cy="12" r="4" fill="{ac}"/>{'<rect x="0" y="24" width="16" height="8" fill="'+fg+'"/>' if small() else '<polygon points="16,32 0,24 16,40" fill="'+fg+'"/>'}<rect x="24" y="40" width="16" height="8" fill="{fg}"/><rect x="8" y="48" width="48" height="8" fill="{fg}"/>')
def mascot(d,fg,ac,bg):
    i=d["id"]
    if i=="d7": return d7_mascot(fg,ac,bg)
    if i=="d1":
        grid(8,64)
        return (f'<rect x="16" y="24" width="32" height="16" fill="{fg}"/><rect x="16" y="40" width="8" height="16" fill="{fg}"/><rect x="40" y="40" width="8" height="16" fill="{fg}"/>'
                f'<rect x="8" y="24" width="8" height="8" fill="{fg}"/><rect x="48" y="16" width="16" height="16" fill="{fg}"/><rect x="56" y="32" width="8" height="8" fill="{fg}"/>'
                f'<path d="M32 16A16 16 0 0 1 48 0V8A8 8 0 0 0 40 16Z" fill="{fg}"/><rect x="40" y="16" width="8" height="8" fill="{fg}"/><rect x="0" y="56" width="16" height="8" fill="{ac}"/>')
    if i=="d2":
        gc(50,50,46);c1=(50,54);r1=36;c2=(50,66);r2=34
        dd=c2[1]-c1[1];a=(r1*r1-r2*r2+dd*dd)/(2*dd);h=math.sqrt(r1*r1-a*a);y=c1[1]+a
        gc(*c1,r1);gc(*c2,r2)
        wing=f"M{n(50-h)} {n(y)}A{r1} {r1} 0 0 1 {n(50+h)} {n(y)}A{r2} {r2} 0 0 0 {n(50-h)} {n(y)}Z"
        if small(): return f'<circle cx="50" cy="50" r="48" fill="{fg}"/><path d="{wing}" fill="{bg}"/><path d="{vesica(50,30,86,7)}" fill="{bg}"/><circle cx="50" cy="22" r="8" fill="{ac}"/>'
        return (f'<circle cx="50" cy="50" r="46" fill="none" stroke="{fg}" stroke-width="{n(mw(3))}"/><path d="{wing}" fill="{fg}"/><path d="{vesica(50,30,86,7)}" fill="{fg}"/>'
                f'<circle cx="50" cy="24" r="7" fill="{fg}"/><circle cx="50" cy="21" r="3.5" fill="{ac}"/><path d="M50 86L44 94H56Z" fill="{fg}"/>')
    if i=="d3":
        grid(10,100);w="M10 60"
        if small(): return lip(f'<rect x="8" y="48" width="72" height="32" rx="16" fill="{ac}"/><circle cx="80" cy="52" r="22" fill="{ac}"/>',5,"#1F5600")
        w+="".join(f"A10 10 0 0 {k%2} {30+20*k} 60" for k in range(3))
        b=f'<path d="{w}" fill="none" stroke="{ac}" stroke-width="16" stroke-linecap="round"/><circle cx="80" cy="50" r="14" fill="{ac}"/>'
        return lip(b,5,"#1F5600")+'<circle cx="75" cy="46" r="5" fill="#fff"/><circle cx="86" cy="46" r="5" fill="#fff"/><circle cx="76" cy="47" r="2.5" fill="#1A1A1A"/><circle cx="87" cy="47" r="2.5" fill="#1A1A1A"/><circle cx="30" cy="58" r="3" fill="#FF4B91"/>'
    if i=="d4":
        bird=mirror([(50,16),(42,28),(4,24),(4,40),(40,50),(40,90),(50,74)]) if small() else mirror([(50,20),(44,30),(6,30-38*T30),(42,44),(44,62),(30,92),(48,72)])
        for p in bird: gl(50,50,*p)
        return wedge(ac)+f'<polygon points="{pts(bird)}" fill="{fg}"/><polygon points="50,20 54,26 50,28" fill="{ac}"/>'
    if i=="d5":
        s=star(50,50,46,8,2)
        body=mirror([(50,40),(36,46),(30,60),(40,72),(50,74)])
        crest="".join(f'<path d="M50 40L{n(50+18*math.cos(math.radians(a)))} {n(40+18*math.sin(math.radians(a)))}"/>' for a in (-157.5,-135,-112.5,-90,-67.5,-45,-22.5))
        return (f'<polygon points="{pts(s)}" fill="none" stroke="{ac}" stroke-width="{n(mw(2))}"/><g stroke="{ac}" stroke-width="{n(mw(3))}" stroke-linecap="round">{crest}</g>'
                +rnd(f"M{pts(body)}Z",fg,2)+("" if small() else f'<path d="M50 52L50 70" stroke="{bg}" stroke-width="2"/>')+f'<circle cx="50" cy="40" r="7" fill="{fg}"/><polygon points="50,44 53,56 47,56" fill="{ac}"/>')
    grid(8,64)
    if small(): return f'<polygon points="8,64 56,64 48,32 16,32" fill="{RED}"/><rect x="16" y="8" width="32" height="24" fill="{fg}"/><circle cx="24" cy="20" r="8" fill="#EDEBE6"/><circle cx="40" cy="20" r="8" fill="#EDEBE6"/><rect x="24" y="56" width="16" height="8" fill="{ac}"/>'
    return (f'<polygon points="8,64 56,64 32,24" fill="{RED}"/><rect x="16" y="8" width="32" height="24" fill="{fg}"/><polygon points="16,8 16,0 24,8" fill="{fg}"/><polygon points="48,8 48,0 40,8" fill="{fg}"/>'
            f'<circle cx="24" cy="20" r="8" fill="#EDEBE6"/><circle cx="40" cy="20" r="8" fill="#EDEBE6"/><circle cx="24" cy="20" r="4" fill="{BLUE}"/><circle cx="40" cy="20" r="4" fill="{BLUE}"/><rect x="24" y="56" width="16" height="8" fill="{ac}"/>')
MARKS=[("mho","℧ heritage",mho),("lyre","Lyre",lyre),("goat","Goat ℧",goat),("vessel","Vessel",vessel)]
MASCOT={"d7":"Owl of Athena after the Athenian tetradrachm","d1":"Alpine ibex on the 8px lattice","d2":"Tsuru-maru crane from two circles","d3":"Squiggle worm on tangent arcs","d4":"Steel swallow on 30 degree rules","d5":"Hoopoe in a khatam star","d6":"Bauhaus owl from three primitives"}
def markcols(d):
    c=d["c"];i=d["id"]
    if i=="d2": return c["acc"],c["hl"],c["bg"]
    ac={"d3":"#2E7D00"}.get(i,c["acc"] if i!="d1" else c["hl"])
    return c["text"],ac,c["bg"]
try: HINTED=_json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),"hinted.json")))
except Exception: HINTED={}
def hinted_svg(key,w):
    c=w/16;out=[]
    for y,row in enumerate(HINTED[key]):
        x=0
        while x<16:
            col=row[x]
            if col is None: x+=1;continue
            s_=x
            while x<16 and row[x]==col: x+=1
            out.append(f'<rect x="{n(s_*c)}" y="{n(y*c)}" width="{n((x-s_)*c)}" height="{n(c)}" fill="{col}"/>')
    return "".join(out)
def svgm(d,fn,size):
    global G
    global PX
    G=None;PX=size;fg,ac,bg=markcols(d);w=vb(d)
    key=f'{d["id"]}-'+{mho:"mho",lyre:"lyre",goat:"goat",vessel:"vessel",mascot:"mascot"}.get(fn,"")
    if size<=16 and key in HINTED:
        PX=None;return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {w}" width="{size}" height="{size}" role="img" aria-label="mark" shape-rendering="crispEdges">{hinted_svg(key,w)}</svg>'
    body=fn(d,fg,ac,bg);PX=None
    if d["id"] in LAT and fn not in (mho,goat): body=scale4(body)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {w}" width="{size}" height="{size}" role="img" aria-label="mark">{body}</svg>'
def lockup(d,word="Bucket"):
    fg,ac,bg=markcols(d)
    t={"d4":word.upper()}.get(d["id"],word)
    return f'<span class="lk" style="font-family:{d["disp"]};font-weight:{d["dispw"]};color:{fg}">{svgm(d,mho,40)}<span>{t}</span></span>'
def guide_svg(d,fn):
    global G
    G=[];fg,ac,bg=markcols(d);REC.clear();body=fn(d,fg,ac,bg);gs=G;G=None
    if d["id"] in LAT and fn not in (mho,goat): body=scale4(body);gs=[scale4(x) for x in gs]
    c=d["c"];i=d["id"];col=c["hl"] if i in("d1","d2") else c["acc"] if i!="d3" else "#FF4B91"
    sw=1 if vb(d)==256 else .4
    return f'<g fill="none" color="{col}" stroke="{col}" stroke-opacity=".55" stroke-width="{sw}">{"".join(gs)}</g>',body
def guides(d): return guide_svg(d,mho)[0]
def construction(d,fn,size):
    gs,body=guide_svg(d,fn);w=vb(d)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {w}" width="{size}" height="{size}" role="img" aria-label="mark with construction lines"><g opacity=".45">{body}</g>{gs}</svg>'
SIZES=[(16,(1,2,3)),(24,(1,2,3)),(32,(1,2,3)),(64,(1,)),(128,(1,)),(256,(1,)),(512,(1,))]
def pixel_strip(d):
    import cairosvg
    from lib import glyph
    os.makedirs(PXDIR,exist_ok=True);i=d["id"];rows=""
    for key,lab,fn in MARKS+[("mascot","Mascot",mascot),("glyph","bkt glyph",None)]:
        cells=""
        for L,ks in SIZES:
            s=svgm(d,fn,L) if fn else glyph(d,L).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ',1)
            for k in ks:
                nm=f"{i}-{key}-{L}.png" if k==1 else f"{i}-{key}-{L}@{k}x.png"
                cairosvg.svg2png(bytestring=s.encode(),write_to=PXDIR+nm,output_width=L*k,output_height=L*k)
            if L<=64: cells+=f'<span style="display:inline-flex;flex-direction:column;align-items:center;gap:2px">{s}<small>{L}</small></span>'
        rows+=f'<div class="pxrow" style="display:flex;align-items:flex-end;gap:12px"><b style="width:96px">{lab}</b>{cells}</div>'
    return f'<div class="pxstrip" style="display:grid;gap:8px">{rows}</div>'
BF=REPO_DIR+"/"
HERITAGE=[("public/brand/logo/mark-hero.png","Mark hero, 2026"),("public/brand/omega-lyre-gold.png","Omega lyre, gold"),("public/brand/omega-lyre-aegean.png","Omega lyre, Aegean"),
("public/brand/omega-stonepunk.png","Stonepunk ℧"),("public/brand/logo/wordmark-horizontal.png","Wordmark, horizontal"),("public/brand/logo/wordmark-stacked.png","Wordmark, stacked"),
("public/bucket_logo.webp","bucket logo, 2023"),("public/craiyon_233134_a_frontfacing_determined_mountain_goat_looking_down_with_horns_that_are_the_shape_of_.png","Goat with ℧ horns"),
("figma-export/bucket-1.0/2026-04-15/1-2__page-1-landing-page.png","bucket 1.0 Figma, Dec 2022"),("figma-export/bucket-pitch-2024/2026-05-11/209-141__page-1-intro.png","bucket pitch Figma, Jan 2024")]
INVERSE_OMEGA='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="SZ" height="SZ" role="img" aria-label="InverseOmega, live site mark"><g fill="#1F1C16"><path d="M26 48H214V54H26Z"/><path d="M20 44H36V60H20Z"/><path d="M204 44H220V60H204Z"/><path d="M44 54L76 54L72 70C70 82 66 100 64 124C63 138 64 150 68 162L50 162C46 150 44 136 45 120C46 96 48 74 50 60L44 60Z"/><path d="M196 54L164 54L168 70C170 82 174 100 176 124C177 138 176 150 172 162L190 162C194 150 196 136 195 120C194 96 192 74 190 60L196 60Z"/><path d="M50 162C54 180 72 196 96 202C108 204 132 204 144 202C168 196 186 180 190 162L172 162C168 174 156 184 138 188C124 190 116 190 102 188C84 184 72 174 68 162Z"/></g><g stroke="#B8861E" stroke-width="1.6">'''+"".join(f'<line x1="{x}" y1="54" x2="{x}" y2="162"/>' for x in (84,100,120,140,156))+'''</g><circle cx="120" cy="212" r="7.5" fill="#1F1C16"/><circle cx="120" cy="210" r="5.2" fill="#B8861E"/></svg>'''
def heritage_strip(rel="heritage/lineage/"):
    from PIL import Image
    out=os.path.join(os.path.dirname(PXDIR.rstrip("/")),"..",rel);out=os.path.normpath(out)+"/";os.makedirs(out,exist_ok=True)
    cells=f'<figure class="her">{INVERSE_OMEGA.replace("SZ","96")}<figcaption>InverseOmega, live header</figcaption></figure>'
    for src,lab in HERITAGE:
        p=BF+src;fn=os.path.basename(src).rsplit(".",1)[0][:40]+".png"
        if os.path.exists(p):
            im=Image.open(p).convert("RGBA");im.thumbnail((256,256));im.save(out+fn)
        elif not os.path.exists(out+fn): continue
        cells+=f'<figure class="her"><img src="{rel}{fn}" alt="{lab}" width="96" height="96" style="object-fit:contain;width:96px;height:96px"><figcaption>{lab}</figcaption></figure>'
    return f'<div class="herstrip" style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start">{cells}</div>'
MOTION={"d7":("@keyframes idle{50%{transform:translateY(-2px)}}","@keyframes win{0%{opacity:0}60%{opacity:1}100%{transform:none}}","cubic-bezier(0.4,0,0.2,1)"),
"d1":("@keyframes idle{0%,90%{transform:none}91%,100%{transform:translateY(-4px)}}","@keyframes win{0%{transform:none}50%{transform:translateX(8px)}100%{transform:none}}","steps(1)"),
"d2":("@keyframes idle{50%{opacity:.85}}","@keyframes win{0%{clip-path:circle(0)}100%{clip-path:circle(75%)}}","cubic-bezier(0.65,0,0.35,1)"),
"d3":("@keyframes idle{50%{transform:scale(1.04,.96)}}","@keyframes win{30%{transform:scale(1.25,.75)}60%{transform:scale(.85,1.2) translateY(-12px)}100%{transform:none}}","cubic-bezier(0.34,1.56,0.64,1)"),
"d4":("@keyframes idle{50%{transform:translate(2px,-1px)}}","@keyframes win{0%{clip-path:polygon(0 0,0 0,-30% 100%,-30% 100%)}100%{clip-path:polygon(0 0,130% 0,100% 100%,0 100%)}}","cubic-bezier(0.2,0,0,1)"),
"d5":("@keyframes idle{to{transform:rotate(360deg)}}","@keyframes win{0%{transform:scale(.5) rotate(-45deg)}100%{transform:none}}","cubic-bezier(0,0,0,1)"),
"d6":("@keyframes idle{25%{transform:rotate(22.5deg)}50%{transform:rotate(0)}}","@keyframes win{0%{transform:translateY(0)}25%{transform:translateY(-8px)}50%{transform:translateY(0)}75%{transform:translateY(-4px)}}","steps(4,end)")}

MASCOT.setdefault("d7","Owl of Athena")
MOTION.setdefault("d7",("@keyframes idle{50%{transform:translateY(-2px)}}","@keyframes win{0%{opacity:0;transform:scale(.9)}100%{opacity:1;transform:none}}","cubic-bezier(0.4,0,0.2,1)"))
