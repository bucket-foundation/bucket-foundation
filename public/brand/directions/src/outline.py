OP=dict(H=1.1,ryo=.52,rxi=.33,ryi=.45,op=.13,neck=.1,feet=.51,ft=.11,spur=.1,spur_y=.2,f=.04,k1=.12,k2=.3,k3=.1,k4=.34)
def omega_outline(cx,top,Bw,P=None,rnd=False):
    P=dict(OP,**(P or {}))
    q=(lambda v:float(round(v))) if rnd else (lambda v:v)
    X=lambda u:q(cx+u*Bw);Y=lambda v:q(top+v*Bw)
    cy=P["H"]-P["ryo"];xi=P["op"]/2;xo=xi+P["neck"];F=P["feet"];ft=P["ft"];f=P["f"]
    segs=[];pos=[None]
    def M(x,y): pos[0]=(x,y)
    def L(x,y): segs.append(("lineTo",[pos[0],(x,y)]));pos[0]=(x,y)
    def C(a,b,c): segs.append(("curveTo",[pos[0],a,b,c]));pos[0]=c
    def A(rx,ry,sweep,x,y,t0,t1):
        segs.append(("arc",[pos[0],(pos[0][0]+t0[0],pos[0][1]+t0[1]),(x-t1[0],y-t1[1]),(x,y)],rx,ry,sweep));pos[0]=(x,y)
    rxo=.5;ryo=P["ryo"];rxi=P["rxi"];ryi=P["ryi"];s_=P["spur"];sy=P["spur_y"]
    M(X(-F),Y(0))
    L(X(-xi),Y(0));L(X(-xi),Y(ft))
    C((X(-xi),Y(ft+P["k1"])),(X(-rxi),Y(cy-P["k2"])),(X(-rxi),Y(cy)))
    A(rxi*Bw,ryi*Bw,0,X(rxi),Y(cy),(0,1),(0,-1))
    C((X(rxi),Y(cy-P["k2"])),(X(xi),Y(ft+P["k1"])),(X(xi),Y(ft)))
    L(X(xi),Y(0));L(X(F),Y(0));L(X(F),Y(sy));L(X(F-s_),Y(sy));L(X(F-s_),Y(ft));L(X(xo+f),Y(ft))
    A(f*Bw,f*Bw,0,X(xo),Y(ft+f),(-1,0),(0,1))
    C((X(xo),Y(ft+f+P["k3"])),(X(rxo),Y(cy-P["k4"])),(X(rxo),Y(cy)))
    A(rxo*Bw,ryo*Bw,1,X(-rxo),Y(cy),(0,1),(0,-1))
    C((X(-rxo),Y(cy-P["k4"])),(X(-xo),Y(ft+f+P["k3"])),(X(-xo),Y(ft+f)))
    A(f*Bw,f*Bw,0,X(-xo-f),Y(ft),(0,-1),(-1,0))
    L(X(-F+s_),Y(ft));L(X(-F+s_),Y(sy));L(X(-F),Y(sy));L(X(-F),Y(0))
    d=""
    for s in segs:
        if s[0]=="lineTo": d+=f"L{n_(s[1][1][0])} {n_(s[1][1][1])}"
        elif s[0]=="curveTo": d+="C"+" ".join(f"{n_(p[0])} {n_(p[1])}" for p in s[1][1:])
        else: d+=f"A{n_(s[2])} {n_(s[3])} 0 0 {s[4]} {n_(s[1][3][0])} {n_(s[1][3][1])}"
    d=f"M{n_(segs[0][1][0][0])} {n_(segs[0][1][0][1])}"+d+"Z"
    return d,[segs],dict(cx=cx,cy=top+cy*Bw,top=top,Bw=Bw,H=P["H"]*Bw)
def n_(x):
    x=round(x,2);return str(int(x)) if x==int(x) else f"{x:g}"
