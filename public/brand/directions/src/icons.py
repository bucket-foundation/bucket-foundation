import math
NAMES=["home","search","library","cards","listen","cite","profile","settings"]
def dist(x,y,cx,cy): return math.hypot(x-cx,y-cy)
def ang(x,y,cx,cy): return math.degrees(math.atan2(y-cy,x-cx))%360
def gear_cell(X,Y):
    r=dist(X,Y,12,12)
    if r<3.2: return False
    if r<=7: return True
    return r<=10 and (ang(X,Y,12,12)%45<12 or ang(X,Y,12,12)%45>33)
def box(X,Y,x0,y0,x1,y1): return x0<=X<x1 and y0<=Y<y1
CELL={
"home":lambda X,Y:(3<=Y<11 and abs(X-12)<=Y-2) or (box(X,Y,5,11,19,22) and not box(X,Y,10,15,14,22)),
"search":lambda X,Y:6<=dist(X,Y,10,10)<=8.2 or (15<=X<=22 and 15<=Y<=22 and abs(X-Y)<=1.6),
"library":lambda X,Y:box(X,Y,3,3,7,22) or box(X,Y,9,3,13,22) or (5<=Y<22 and 0<=X-15-(22-Y)*.25<5),
"cards":lambda X,Y:box(X,Y,2,9,16,22) or (box(X,Y,7,3,22,16) and not box(X,Y,9,5,20,14) and not box(X,Y,1,7,18,23)),
"listen":lambda X,Y:box(X,Y,2,9,6,15) or (6<=X<12 and abs(Y-12)<=X-3) or (X>14 and abs(Y-12)<4 and 4.5<=dist(X,Y,12,12)<=6.5) or (X>15 and abs(Y-12)<7 and 8.5<=dist(X,Y,12,12)<=10.5),
"cite":lambda X,Y:any(box(X,Y,x,5,x+7,12) or (x+3<=X<x+7 and 12<=Y<18 and X-x-3>=(Y-12)*.6) for x in (3,14)),
"profile":lambda X,Y:dist(X,Y,12,7.5)<=4.6 or (14<=Y<22 and ((X-12)/8.6)**2+((Y-22)/8)**2<=1),
"settings":gear_cell,
}
def lattice(n,col,N=48):
    out=[];k=24/N;f=lambda x,y:CELL[n]((x+.5)*k,(y+.5)*k)
    for y in range(N):
        x=0
        while x<N:
            if f(x,y):
                s=x
                while x<N and f(x,y): x+=1
                out.append((s,y,x-s))
            else: x+=1
    return f'<g transform="scale({k:g})"><path fill="{col}" d="'+"".join(f"M{s} {y}h{w}v1h-{w}Z" for s,y,w in out)+'"/></g>'
SF={
"home":'<path d="M4.5 11.5 12 5l7.5 6.5M7 10v9.5h3.5V15h3v4.5H17V10"/>',
"search":'<circle cx="10.5" cy="10.5" r="5.5"/><path d="M14.5 14.5l5 5"/>',
"library":'<path d="M6 5.5h9a2.5 2.5 0 0 1 0 5H6Z"/><path d="M8 10.5v8h9v-8M18 18.5H5"/>',
"cards":'<path d="M9 4.5h10v12"/><rect x="5" y="8" width="10" height="12" rx="1.5"/>',
"listen":'<path d="M12 4.5a5 5 0 0 1 5 5v4l1.5 3h-13L7 13.5v-4a5 5 0 0 1 5-5ZM10 19.5h4"/>',
"cite":'<rect x="8.5" y="4" width="7" height="7" rx="1"/><path d="M5 13.5h14v4H5ZM5 20.5h14"/>',
"profile":'<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
"settings":'<circle cx="12" cy="12" r="3"/>'+"".join(f'<path d="M{12+5*math.cos(a):.2f} {12+5*math.sin(a):.2f}L{12+8*math.cos(a):.2f} {12+8*math.sin(a):.2f}"/>' for a in (k*math.pi/4 for k in range(8))),
}
def gear_poly(cx,cy,R,r,nt,tw=.45):
    p=[]
    for k in range(nt):
        a=2*math.pi*k/nt;h=math.pi/nt*tw
        for aa,rr in ((a-h*1.4,r),(a-h,R),(a+h,R),(a+h*1.4,r)): p.append((cx+rr*math.cos(aa),cy+rr*math.sin(aa)))
    return "M"+"L".join(f"{x:.2f} {y:.2f}" for x,y in p)+"Z"
DUO={
"home":"M12 3 21 11H19V21H5V11H3ZM10 15V21H14V15Z",
"search":"M10 3a7 7 0 1 1 0 14a7 7 0 1 1 0-14ZM10 6.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7ZM14.6 16.7 16.7 14.6 21 18.9 18.9 21Z",
"library":"M3 4H8V21H3ZM10 4H15V21H10ZM17 6 21 5 22 20 18 21Z",
"cards":"M8 3H21V16H18V8H8ZM3 9H16V21H3Z",
"listen":"M3 9H7L13 4V20L7 15H3ZM16 8.5a5 5 0 0 1 0 7L18.2 17.7a8 8 0 0 0 0-11.4Z",
"cite":"M7 5a4 4 0 0 1 4 4c0 5-3 8-6 9l-1-2c2-1 3-2 3-3a4 4 0 0 1 0-8ZM17 5a4 4 0 0 1 4 4c0 5-3 8-6 9l-1-2c2-1 3-2 3-3a4 4 0 0 1 0-8Z",
"profile":"M12 3a4.5 4.5 0 1 1 0 9a4.5 4.5 0 1 1 0-9ZM4 21a8 7 0 0 1 16 0Z",
"settings":gear_poly(12,12,10,7.4,8)+"M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z",
}
DUOHI={"home":"M7 12v3","search":"M7 8.5a3.5 3.5 0 0 1 2-2","library":"M5 6v4","cards":"M5 11v3","listen":"M5 11v2","cite":"M6 7a2 2 0 0 1 2-1","profile":"M10 5.5a2 2 0 0 1 2-1","settings":"M8 9a5 5 0 0 1 2-2"}
SHARP={
"home":"M12 2 23 13H20V22H14V16H10V22H4V13H1Z",
"search":"M9 2a7 7 0 1 1 0 14a7 7 0 1 1 0-14ZM9 5a4 4 0 1 0 0 8a4 4 0 1 0 0-8ZM14 16 16 14 23 21 21 23Z",
"library":"M2 3H6V22H2ZM8 3H12V22H8ZM13.5 5.2 17.3 3.9 23 21.8 19.2 23.1Z",
"cards":"M9 2H23L19 14H5ZM5 9H19L15 22H1Z",
"listen":"M2 9 6 9 20 2V22L6 15 2 15ZM21 9 24 7V17L21 15Z",
"cite":"M2 4H10V12L6 20H2L5 12H2ZM13 4H21V12L17 20H13L16 12H13Z",
"profile":"M8 2H16L19 7 16 12H8L5 7ZM1 22 5 14H19L23 22Z",
"settings":gear_poly(12,12,11,7.5,6,.5)+"M12 8.5 15 13.7H9Z",
}
FL={
"home":('<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5.5H9V20H5a1 1 0 0 1-1-1Z"/>','<rect x="10.25" y="15.25" width="3.5" height="4" rx=".75"/>'),
"search":('<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5 20 20"/>','<circle cx="10" cy="10" r="2.5"/>'),
"library":('<rect x="4" y="4" width="4" height="16" rx="1"/><rect x="10" y="4" width="4" height="16" rx="1"/><path d="M16.2 5.4l2.9-.8a.8.8 0 0 1 1 .6l3 14"/>','<rect x="4.75" y="7" width="2.5" height="2.5" rx=".5"/>'),
"cards":('<rect x="4" y="8" width="12" height="12" rx="2"/><path d="M8 5.5A1.5 1.5 0 0 1 9.5 4H18a2 2 0 0 1 2 2v8.5A1.5 1.5 0 0 1 18.5 16"/>','<circle cx="10" cy="14" r="2"/>'),
"listen":('<path d="M3.75 9.5h3.5L12 5.5v13l-4.75-4H3.75Z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>','<path d="M4.5 10.25h2.5v3.5H4.5Z"/>'),
"cite":('<path d="M6 4.75h12a1 1 0 0 1 1 1v14.5l-7-4.5-7 4.5V5.75a1 1 0 0 1 1-1Z"/>','<path d="M12 7.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3Z"/>'),
"profile":('<circle cx="12" cy="8" r="4"/><path d="M4.75 20a7.25 6 0 0 1 14.5 0Z"/>','<circle cx="12" cy="8" r="1.75"/>'),
"settings":('<path d="'+gear_poly(12,12,9,6.8,8,.55)+'"/>','<circle cx="12" cy="12" r="2.75"/>'),
}
PRIM={
"home":'<polygon points="12,2 22,12 2,12" fill="A"/><rect x="5" y="12" width="14" height="10" fill="B"/>',
"search":'<circle cx="10" cy="10" r="8" fill="A"/><circle cx="10" cy="10" r="4" fill="BG"/><rect x="16" y="16" width="6" height="6" fill="B"/>',
"library":'<rect x="2" y="4" width="6" height="18" fill="A"/><rect x="10" y="4" width="6" height="18" fill="B"/><polygon points="18,22 22,22 20,4" fill="A"/>',
"cards":'<rect x="8" y="2" width="14" height="14" fill="B"/><rect x="2" y="8" width="14" height="14" fill="A"/>',
"listen":'<rect x="2" y="8" width="6" height="8" fill="A"/><polygon points="8,8 16,2 16,22 8,16" fill="A"/><circle cx="20" cy="12" r="3" fill="B"/>',
"cite":'<rect x="2" y="4" width="8" height="8" fill="A"/><polygon points="2,12 10,12 2,20" fill="A"/><rect x="14" y="4" width="8" height="8" fill="B"/><polygon points="14,12 22,12 14,20" fill="B"/>',
"profile":'<circle cx="12" cy="7" r="5" fill="A"/><polygon points="12,13 22,22 2,22" fill="B"/>',
"settings":'<rect x="5" y="5" width="14" height="14" fill="A" transform="rotate(45 12 12)"/><rect x="5" y="5" width="14" height="14" fill="A"/><circle cx="12" cy="12" r="4" fill="B"/>',
}
CODEX={
"home":"M12 2.5 2 11h3v10h5.5v-6h3v6H19V11h3Z",
"search":"M9.5 3a6.5 6.5 0 1 0 3.7 11.8l5.6 5.6 1.6-1.6-5.6-5.6A6.5 6.5 0 0 0 9.5 3Zm0 2.2a4.3 4.3 0 1 1 0 8.6 4.3 4.3 0 0 1 0-8.6Z",
"library":"M2 3h4.5v18H2Zm6.5 0H13v18H8.5Zm6 1.6 4.2-1.2 3.3 16.4-4.2 1.2Z",
"cards":"M7 2h15v15h-2.2V4.2H7Z M2 7h15v15H2Zm2.2 2.2v10.6h10.6V9.2Z",
"listen":"M2 8h4.5L12 3v18l-5.5-5H2Z M15 7.5a6 6 0 0 1 0 9l1.6 1.6a8.2 8.2 0 0 0 0-12.2Z",
"cite":"M2 6h8v6.5c0 3.6-2.2 6.4-5.5 7.5l-.8-2c1.8-.8 2.8-2.2 3-4H2Zm11 0h8v6.5c0 3.6-2.2 6.4-5.5 7.5l-.8-2c1.8-.8 2.8-2.2 3-4H13Z",
"profile":"M12 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10ZM2 22c0-5 4.5-8.5 10-8.5S22 17 22 22Z",
"settings":gear_poly(12,12,10,7.4,8,.55)+"M12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z",
}
KEY="M17 24V18H23V22.5H19.5V20.5H21V20H19V24Z"
def icon(d,name):
    c=d["c"];i=d["id"]
    if i=="d7": return f'<g transform="translate(12 12) scale(.833) translate(-12 -12)"><path fill-rule="evenodd" d="{CODEX[name]}" fill="{c["text"]}"/></g><path d="{KEY}" fill="{c["acc"]}"/>'
    if i=="d1": return lattice(name,c["text"])
    if i=="d2":
        return (f'<circle cx="12" cy="12" r="12" fill="{c["acc"]}"/><circle cx="12" cy="12" r="10.9" fill="none" stroke="{c["bg"]}" stroke-width=".5"/>'
                f'<g transform="translate(12 12) scale(.72) translate(-12 -12)" fill="none" stroke="{c["bg"]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{SF[name]}</g>')
    if i=="d3":
        p=DUO[name];f=lambda col,dy:f'<path fill-rule="evenodd" d="{p}" fill="{col}" stroke="{col}" stroke-width="2" stroke-linejoin="round" transform="translate(0 {dy})"/>'
        return f'<g transform="translate(12 11) scale(.86) translate(-12 -12)">{f("#1F5600",2)}{f("#2E7D00",0)}<path d="{DUOHI[name]}" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" fill="none"/></g>'
    if i=="d4":
        return f'<path fill-rule="evenodd" d="{SHARP[name]}" fill="{c["text"]}"/><path d="M0 24 6 24 0 18Z" fill="{c["acc"]}"/>'
    if i=="d5":
        o,a=FL[name]
        return f'<g fill="none" stroke="{c["text"]}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">{o}</g><g fill="{c["acc"]}">{a}</g>'
    return PRIM[name].replace('"A"',f'"{c["text"]}"').replace('"BG"',f'"{c["bg"]}"').replace('"B"','"#1D4ED8"')
