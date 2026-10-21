import math,os,sys,re
HERE=os.path.dirname(os.path.abspath(__file__))
DIRSRC=os.path.join(os.path.dirname(os.path.dirname(HERE)),"_directions","src")
sys.path.insert(0,DIRSRC)
from outline import omega_outline
import logos
from lib import D
INK,PAPER,BLUE,RED,YEL,KNOB,PBLUE,GREEN,METAL="#161616","#F2F0EB","#0F62FE","#DA1E28","#FFD100","#FF5F00","#1D4ED8","#2E7D00","#8D8D8D"
OMEGA_P=dict(op=.16,neck=.1,ft=.12,spur=.1,spur_y=.2)
REC=[]
def n(x):
    x=round(x,2);return str(int(x)) if x==int(x) else f"{x:g}"
def omega():
    p,segs,info=omega_outline(128,18,200,P=OMEGA_P,rnd=True)
    REC.append(dict(kind="omega",segs=segs,info=info,d=p))
    return p,info
class Path:
    def __init__(s,x,y): s.d=f"M{n(x)} {n(y)}";s.p=(x,y);s.segs=[];s.start=(x,y)
    def L(s,x,y): s.segs.append(("L",s.p,(x,y)));s.d+=f"L{n(x)} {n(y)}";s.p=(x,y);return s
    def A(s,r,cx,cy,x,y,sweep):
        s.segs.append(("A",s.p,(x,y),(cx,cy),r,sweep));s.d+=f"A{n(r)} {n(r)} 0 0 {sweep} {n(x)} {n(y)}";s.p=(x,y);return s
    def Z(s):
        if s.p!=s.start: s.L(*s.start)
        s.d+="Z";return s
def b_paths():
    o=Path(48,24).L(96,24).L(96,96).L(152,96).A(56,152,152,208,152,1).L(208,176).A(56,152,176,152,232,1).L(48,232).Z()
    c=Path(96,136).L(152,136).A(16,152,152,168,152,1).L(168,176).A(16,152,176,152,192,1).L(96,192).Z()
    REC.append(dict(kind="b",paths=[o,c],corners_allowed={(48,24),(96,24),(96,96),(48,232),(96,136),(96,192)}))
    return o.d+c.d
def mho_grid(fg=INK,ac=RED,size=None,title="Grid-Primitive mark"):
    p,_=omega()
    return svg(f'<path d="{p}" fill="{fg}"/><rect x="144" y="136" width="32" height="32" fill="{ac}"/>',size,title)
def b_grid(fg=INK,ac=RED,size=None,title="Grid-Primitive b"):
    return svg(f'<path fill-rule="evenodd" d="{b_paths()}" fill="{fg}"/><rect x="200" y="24" width="32" height="32" fill="{ac}"/>',size,title)
def knob(cx,cy,r,col=KNOB,ink=INK):
    return f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}" fill="{col}"/><rect x="{n(cx-r/8)}" y="{n(cy-r)}" width="{n(r/4)}" height="{n(r/2)}" fill="{ink}"/>'
def mho_prim(dot=True,fg=INK,size=None,title=None):
    p,info=omega()
    body=f'<path d="{p}" fill="{PBLUE}"/><rect x="24" y="16" width="48" height="48" fill="{RED}"/><rect x="184" y="16" width="48" height="48" fill="{YEL}"/>'
    if dot: body+=knob(128,152,32)
    return svg(body,size,title or ("Primitive mark with knob dot" if dot else "Primitive mark without dot"))
def mho_wedge(size=None,title="Wedge accent mark"):
    d4=next(d for d in D if d["id"]=="d4")
    s=logos.svgm(d4,logos.mho,100)
    inner=re.sub(r'^<svg[^>]*>|</svg>$','',s)
    inner=re.sub(r'(<(?:path|polygon)[^>]*?)fill="#E3242B"',r'\1fill="url(#g2metal)"',inner).replace('fill="#E3242B"',f'fill="{RED}"').replace('fill="#EFE6D2"',f'fill="{INK}"').replace('stroke="#141414"',f'stroke="{PAPER}"')
    defs='<defs><linearGradient id="g2metal" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#6F6F6F"/><stop offset=".45" stop-color="#E0E0E0"/><stop offset=".55" stop-color="#FFFFFF"/><stop offset="1" stop-color="#8D8D8D"/></linearGradient></defs>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"{dim(size)} role="img" aria-label="{title}"><title>{title}</title>{defs}<rect width="100" height="100" fill="{PAPER}"/>{inner}</svg>'
def b_solar(size=None,title="Solarpunk b variant"):
    t=math.tan(math.pi/6);y0=232;y1=y0-256*t
    cut=f'<path d="M0 {n(y0)}L256 {n(y1)}L256 {n(y1+24)}L0 {n(y0+24)}Z" fill="url(#g2metalb)"/>'
    defs='<defs><linearGradient id="g2metalb" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#6F6F6F"/><stop offset=".5" stop-color="#FFFFFF"/><stop offset="1" stop-color="#8D8D8D"/></linearGradient><clipPath id="g2bclip"><path fill-rule="evenodd" d="'+b_paths()+'"/></clipPath></defs>'
    return svg(defs+f'<path fill-rule="evenodd" d="{b_paths()}" fill="{INK}"/><g clip-path="url(#g2bclip)">{cut}</g><circle cx="216" cy="56" r="24" fill="{GREEN}"/><circle cx="216" cy="56" r="8" fill="{YEL}"/>',size,title)
def b_punk(size=None,title="Subtle punk b variant"):
    t=math.tan(math.pi/6)
    notch=f'<path d="M208 {n(176-56*t)}L144 176L208 {n(176+8)}Z" fill="{PAPER}"/>'
    rivets="".join(f'<rect x="{x}" y="{y}" width="8" height="8" fill="url(#g2metalp)"/>' for x,y in ((64,48),(64,200),(184,208)))
    defs='<defs><linearGradient id="g2metalp" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#6F6F6F"/><stop offset=".5" stop-color="#FFFFFF"/><stop offset="1" stop-color="#8D8D8D"/></linearGradient></defs>'
    return svg(defs+f'<path fill-rule="evenodd" d="{b_paths()}" fill="{INK}"/>{notch}<path d="M144 176L208 {n(176-56*t)}" stroke="url(#g2metalp)" stroke-width="4"/>{rivets}<rect x="200" y="24" width="32" height="32" fill="{RED}"/>',size,title)
def svg(body,size,title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"{dim(size)} role="img" aria-label="{title}"><title>{title}</title>{body}</svg>'
def dim(size): return f' width="{size}" height="{size}"' if size else ""
def girih_tile(u=64,stroke=INK,op=.14):
    s=logos.star(u/2,u/2,u*.46,8,3)
    REC.append(dict(kind="girih",cx=u/2,cy=u/2,n=8,p=s))
    oc=[(u/2+u*.5*math.cos(math.pi/8+k*math.pi/4)/math.cos(math.pi/8),u/2+u*.5*math.sin(math.pi/8+k*math.pi/4)/math.cos(math.pi/8)) for k in range(8)]
    return (f'<polygon points="{logos.pts(s)}" fill="none" stroke="{stroke}" stroke-opacity="{op}" stroke-width="1.5"/>'
            f'<polygon points="{logos.pts(oc)}" fill="none" stroke="{stroke}" stroke-opacity="{op*.7:.3f}" stroke-width="1"/>')
def girih_svg(u=64,stroke=INK,op=.14):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {u} {u}" width="{u}" height="{u}">{girih_tile(u,stroke,op)}</svg>'
def construction(size=None):
    p,info=omega()
    lines="".join(f'<path d="M{x} 0V256M0 {x}H256"/>' for x in range(0,257,32))
    cx,cy,Bw=info["cx"],info["cy"],info["Bw"]
    g=f'<g fill="none" stroke="{BLUE}" stroke-opacity=".5" stroke-width="1">{lines}<ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(Bw/2)}" ry="{n(.52*Bw)}"/><ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(.33*Bw)}" ry="{n(.45*Bw)}"/></g>'
    return svg(f'<g opacity=".3"><path d="{p}" fill="{INK}"/></g>{g}<rect x="144" y="136" width="32" height="32" fill="none" stroke="{RED}" stroke-width="2"/>',size,"Grid-Primitive mark on its 32-unit lattice")
def favicon():
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="{PAPER}"/><path d="{omega()[0]}" fill="{INK}"/><rect x="144" y="136" width="32" height="32" fill="{RED}"/></svg>'
def write_assets(out):
    os.makedirs(out,exist_ok=True)
    files=dict(mho=mho_grid(),b=b_grid(),**{"mho-primitive-dot":mho_prim(True),"mho-primitive":mho_prim(False),"mho-wedge":mho_wedge(),"b-solar":b_solar(),"b-punk":b_punk(),"girih":girih_svg(),"mho-construction":construction(),"favicon":favicon()})
    for k,v in files.items(): open(os.path.join(out,k+".svg"),"w",encoding="utf-8").write(v)
    return files
