import math,json
def lum(h):
    h=h.lstrip('#');c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    c=[x/12.92 if x<=0.03928 else ((x+0.055)/1.055)**2.4 for x in c]
    return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def cr(a,b):
    la,lb=sorted([lum(a),lum(b)],reverse=True);return (la+0.05)/(lb+0.05)

def gear(cx,cy,R,r,n=8,hole=None):
    pts=[]
    for i in range(n*4):
        a=2*math.pi*i/(n*4); rad=R if (i%4) in (0,1) else r
        pts.append(f"{cx+rad*math.cos(a-math.pi/(n*4)):.2f},{cy+rad*math.sin(a-math.pi/(n*4)):.2f}")
    d="M"+" L".join(pts)+"Z"
    if hole: d+=f" M{cx-hole},{cy}a{hole},{hole} 0 1 0 {2*hole},0a{hole},{hole} 0 1 0 {-2*hole},0Z"
    return d
NAMES=["home","search","library","cards","listen","cite","profile","settings"]
SHARP32={
"home":"M16 3 3 14v15h10v-9h6v9h10V14Z",
"search":"M13 3a10 10 0 1 0 0 20a10 10 0 1 0 0-20ZM13 7a6 6 0 1 1 0 12a6 6 0 1 1 0-12ZM20 23l3-3 6 6-3 3Z",
"library":"M3 5h11v22H3ZM18 5h11v22H18ZM6 9v3h5V9ZM21 9v3h5V9Z",
"cards":"M10 3h19v17h-3V6H10ZM3 9h20v20H3Z",
"listen":"M3 11h6l9-7v24l-9-7H3ZM21 11h3v10h-3ZM26 6h3v20h-3Z",
"cite":"M7 3h18v26l-9-6-9 6Z",
"profile":"M16 3a7 7 0 1 0 0 14a7 7 0 1 0 0-14ZM3 29c0-7 6-10 13-10s13 3 13 10Z",
"settings":gear(16,16,13,9.5,8,4.5),
}
def scale(d,s): 
    import re
    return f'<g transform="scale({s})"><path fill-rule="evenodd" d="{d}"/></g>'
def icon_carbon(n,c):
    return f'<svg viewBox="0 0 32 32" class="ic" fill="{c}"><path fill-rule="evenodd" d="{SHARP32[n]}"/></svg>'
def icon_round(n,c,stroke=2.2,vb=32):
    return f'<svg viewBox="-2 -2 36 36" class="ic" fill="{c}"><path fill-rule="evenodd" d="{SHARP32[n]}" stroke="{c}" stroke-width="{stroke}" stroke-linejoin="round"/></svg>'
def icon_mon(n,c,bg):
    return f'<svg viewBox="0 0 40 40" class="ic"><circle cx="20" cy="20" r="19" fill="{c}"/><circle cx="20" cy="20" r="16.5" fill="none" stroke="{bg}" stroke-width="1"/><g transform="translate(9 9) scale(.6875)" fill="{bg}"><path fill-rule="evenodd" d="{SHARP32[n]}" stroke="{bg}" stroke-width="1.6" stroke-linejoin="round"/></g></svg>'
def icon_duo(n,c,lip):
    p=SHARP32[n]
    return f'<svg viewBox="-3 -3 38 40" class="ic"><path fill-rule="evenodd" d="{p}" transform="translate(0 3)" fill="{lip}" stroke="{lip}" stroke-width="4" stroke-linejoin="round"/><path fill-rule="evenodd" d="{p}" fill="{c}" stroke="{c}" stroke-width="4" stroke-linejoin="round"/><path d="M6 8h4" stroke="#fff" stroke-opacity=".55" stroke-width="2.4" stroke-linecap="round"/></svg>'
def icon_m3(n,c,acc):
    return f'<svg viewBox="0 0 32 32" class="ic"><defs><clipPath id="cut{n}"><path d="M0 0H32V32H0ZM-4 26 26 -4 28 -2 -2 28Z" clip-rule="evenodd"/></clipPath></defs><path fill-rule="evenodd" d="{SHARP32[n]}" fill="{c}" clip-path="url(#cut{n})" transform="translate(1 1) scale(.9375)"/><path d="M24 30 30 24V30Z" fill="{acc}"/></svg>'
def icon_fluent(n,c,acc):
    return f'<svg viewBox="-3 -3 38 38" class="ic"><path fill-rule="evenodd" d="{SHARP32[n]}" fill="{c}" stroke="{c}" stroke-width="2.6" stroke-linejoin="round"/><path d="M29 -1l1.2 2.8 2.8 1.2-2.8 1.2L29 7l-1.2-2.8L25 3l2.8-1.2Z" fill="{acc}"/></svg>'
PRIM={
"home":'<path d="M16 3 29 15H3Z" fill="A"/><rect x="5" y="17" width="22" height="12" fill="B"/>',
"search":'<circle cx="13" cy="13" r="10" fill="A"/><circle cx="13" cy="13" r="5" fill="BG"/><rect x="20" y="20" width="9" height="9" fill="B"/>',
"library":'<rect x="3" y="5" width="12" height="22" fill="A"/><rect x="17" y="5" width="12" height="22" fill="B"/>',
"cards":'<rect x="11" y="3" width="18" height="18" fill="B"/><rect x="3" y="11" width="18" height="18" fill="A"/>',
"listen":'<rect x="3" y="11" width="7" height="10" fill="A"/><path d="M10 11 20 3V29L10 21Z" fill="A"/><circle cx="26" cy="16" r="4" fill="B"/>',
"cite":'<path d="M6 3H26V29L16 21 6 29Z" fill="A"/><circle cx="16" cy="11" r="3.5" fill="B"/>',
"profile":'<circle cx="16" cy="10" r="7" fill="A"/><path d="M3 29a13 11 0 0 1 26 0Z" fill="B"/>',
"settings":'<rect x="7" y="7" width="18" height="18" transform="rotate(45 16 16)" fill="A"/><circle cx="16" cy="16" r="5" fill="B"/>',
}
def icon_te(n,a,b,bg):
    return '<svg viewBox="0 0 32 32" class="ic">'+PRIM[n].replace('"A"',f'"{a}"').replace('"BG"',f'"{bg}"').replace('"B"',f'"{b}"')+'</svg>'

D=[
dict(id="d1",n="1",name="Grid",movement="Swiss International Style",system="IBM Carbon",
 feel="Bucket as a reference work. Flush-left type on a 16-column grid, one blue for action, everything else black, white and grey. The canon reads like an index you trust because nothing on the page is decorative.",
 fonts="family=IBM+Plex+Sans:wght@300;400;600&family=IBM+Plex+Mono:wght@400",disp="'IBM Plex Sans'",dispw=300,body="'IBM Plex Sans'",mono="'IBM Plex Mono'",
 c=dict(bg="#FFFFFF",surf="#F4F4F4",text="#161616",muted="#525252",acc="#0F62FE",onacc="#FFFFFF",hl="#DA1E28"),
 layout="16-column Carbon 2x grid, 0 radius, 1px #E0E0E0 rules, flush left, ragged right, headline at 300 weight 54px",
 illus="No illustration. Data is the picture: canon counts, timelines and grids drawn as Carbon charts. The hero image is a Muller-Brockmann style circle study.",
 iconstyle="Carbon 32px artboard, 2px padding, square terminals, filled, single color, no rounding",
 motion="Carbon productive easing cubic-bezier(0.2,0,0.38,0.9), 110 to 240ms; card flip is a 2D slide, no 3D",
 ease="cubic-bezier(0.2,0,0.38,0.9)",dur="240ms",anim="slide",
 src=[("Josef Muller-Brockmann, Grid Systems in Graphic Design, 1981","https://archive.org/details/gridsystemsingra0000mull"),("Carbon icon design guidelines","https://carbondesignsystem.com/elements/icons/design/"),("Carbon motion","https://carbondesignsystem.com/elements/motion/overview/"),("Carbon color tokens","https://carbondesignsystem.com/elements/color/tokens/")],
 img="swiss",icon=lambda n,c:icon_carbon(n,c["text"]),hero="Every foundation, indexed.",cta="Open the canon"),
dict(id="d2",n="2",name="Kamon",movement="Japanese mon crests and ukiyo-e",system="Apple Human Interface Guidelines",
 feel="Each canon branch and each language gets a crest, the way Edo families marked their goods. Indigo and sumi on washi, vermilion for the one seal of approval. Calm, ceremonial, made to be collected.",
 fonts="family=Shippori+Mincho:wght@500;800&family=Zen+Kaku+Gothic+New:wght@400;700",disp="'Shippori Mincho'",dispw=800,body="'Zen Kaku Gothic New'",mono="'Zen Kaku Gothic New'",
 c=dict(bg="#F4EFE4",surf="#FBF8F1",text="#1C1C1C",muted="#5A5148",acc="#1F3A5F",onacc="#F4EFE4",hl="#B8341B"),
 layout="Centered vertical axis like a hanging scroll, HIG 1024 superellipse icon, 20pt continuous corner cards, generous ma, the negative space of Japanese composition",
 illus="Woodblock-print scenes in flat indigo and sumi with keyline outlines, Hokusai and Hiroshige as source. Crests drawn as SVG.",
 iconstyle="SF Symbols filled weight read inside a mon enclosure: circle, inner hairline ring, glyph in negative space",
 motion="HIG spring, response 0.5s, damping 0.85; the seal stamps with a 1.04 overshoot",
 ease="cubic-bezier(0.65,0,0.35,1)",dur="500ms",anim="stamp",
 src=[("Matsuya Piece-Goods Store, Japanese Design Motifs: 4,260 Illustrations of Japanese Crests, Dover 1972","https://store.doverpublications.com/products/9780486228747"),("Katsushika Hokusai, Thirty-six Views of Mount Fuji, Met collection","https://www.metmuseum.org/art/collection/search/45434"),("Apple HIG, App icons","https://developer.apple.com/design/human-interface-guidelines/app-icons"),("SF Symbols","https://developer.apple.com/sf-symbols/")],
 img="mon",icon=lambda n,c:icon_mon(n,c["acc"],c["bg"]),hero="build the past.",cta="Begin a study"),
dict(id="d3",n="3",name="Squiggle",movement="Memphis Group",system="Duolingo design system",
 feel="Discovery through play. Memphis pattern and plum ink give learning a curious, handmade voice. Research pages keep clear reading surfaces and source labels.",
 fonts="family=Fredoka:wght@600;700&family=Nunito:wght@400;800",disp="'Fredoka'",dispw=700,body="'Nunito'",mono="'Nunito'",
 c=dict(bg="#FFF8E7",surf="#FFFFFF",text="#2B2B2B",muted="#5E5A52",acc="#6B367C",onacc="#FFFFFF",hl="#FF4B91"),
 layout="Paper cards with rounded corners; plum actions and yellow or pink learning accents. Patterns belong to illustrations and celebrations.",
 illus="Duolingo rule of simple shapes, rounded corners and flat fills, composed with Memphis squiggles, terrazzo and zigzags. Hero is generated.",
 iconstyle="Duolingo chunky glyphs: 4px rounded stroke-fill, darker lip offset 3px, one highlight tick",
 motion="Bouncy press: 3px lip collapses in 80ms, release overshoot cubic-bezier(0.34,1.56,0.64,1) at 300ms",
 ease="cubic-bezier(0.34,1.56,0.64,1)",dur="300ms",anim="bounce",
 src=[("Memphis Group, Milan 1981, Design Museum","https://designmuseum.org/discover-design/all-stories/memphis-group-awful-tasteless-and-brilliant"),("Ettore Sottsass, Carlton bookcase 1981, V&A","https://collections.vam.ac.uk/item/O1138636/carlton-bookcase-sottsass-ettore/"),("Duolingo design guidelines","https://design.duolingo.com/"),("Duolingo illustration guidelines","https://design.duolingo.com/marketing/illustration")],
 img="memphis",icon=lambda n,c:icon_duo(n,"#6B367C","#492457"),hero="Learn the words that built the world.",cta="Start a streak"),
dict(id="d4",n="4",name="Wedge",movement="Soviet constructivism",system="Material Design 3",
 feel="Knowledge as construction. A hot-red wedge cuts a black field at 30 degrees, type stacks in condensed caps, photomontage of hands at work. Bucket builds the past and the page shows the scaffolding.",
 fonts="family=Oswald:wght@500;700&family=Roboto+Flex:wght@400;600",disp="'Oswald'",dispw=700,body="'Roboto Flex'",mono="'Roboto Flex'",
 c=dict(bg="#141414",surf="#222222",text="#EFE6D2",muted="#B5AC9A",acc="#E3242B",onacc="#FFFFFF",hl="#EFE6D2"),
 layout="M3 window classes with a 30 degree diagonal axis; one red wedge per screen points at the action; uppercase condensed headlines",
 illus="Rodchenko photomontage: halftone photos cut into wedges and circles. Hero is generated.",
 iconstyle="Material Symbols Sharp, filled, 24dp grid with 20dp live area, plus a diagonal cut and a red corner wedge",
 motion="M3 emphasized easing cubic-bezier(0.2,0,0,1), 500ms; elements enter on the 30 degree axis",
 ease="cubic-bezier(0.2,0,0,1)",dur="500ms",anim="diag",
 src=[("El Lissitzky, Beat the Whites with the Red Wedge, 1919","https://en.wikipedia.org/wiki/Beat_the_Whites_with_the_Red_Wedge"),("Alexander Rodchenko, Books poster for Lengiz, 1924, MoMA","https://www.moma.org/collection/works/6543"),("Material 3 icons","https://m3.material.io/styles/icons/designing-icons"),("Material 3 easing and duration","https://m3.material.io/styles/motion/easing-and-duration/tokens-specs")],
 img="constructivist",icon=lambda n,c:icon_m3(n,c["text"],c["acc"]),hero="BUILD THE PAST",cta="JOIN THE BUILD"),
dict(id="d5",n="5",name="Girih",movement="Islamic geometric tiling",system="Microsoft Fluent 2",
 feel="Foundations as pattern. One compass, one ruler, infinite tiling: girih and zellige show that a few axioms generate everything. Cobalt night, turquoise glaze, white plaster.",
 fonts="family=Reem+Kufi:wght@500;700&family=Noto+Sans:wght@400;600",disp="'Reem Kufi'",dispw=700,body="'Noto Sans'",mono="'Noto Sans'",
 c=dict(bg="#0B2A5B",surf="#123873",text="#F5F7FA",muted="#C3CEE2",acc="#3FC1C9",onacc="#062027",hl="#F2C14E"),
 layout="Fluent 4px spacing ramp, 8px radius, layered acrylic surfaces; every container sits on an 8-fold tile lattice",
 illus="Tiles built from compass and straightedge construction, after Broug: star, rosette, interlace. Hero is generated.",
 iconstyle="Fluent 2 filled, 20 and 24 grids, 2px rounded corners, with an 8-point star as the active marker",
 motion="Fluent decelerate-max cubic-bezier(0,0,0,1) at 367ms; patterns rotate 45 degrees on reveal",
 ease="cubic-bezier(0,0,0,1)",dur="367ms",anim="rotate",
 src=[("Eric Broug, Islamic Geometric Patterns, Thames and Hudson 2008","https://www.broug.com/"),("Alhambra tilework, Patronato de la Alhambra","https://www.alhambra-patronato.es/en"),("Fluent 2 iconography","https://fluent2.microsoft.design/iconography"),("Fluent 2 motion","https://fluent2.microsoft.design/motion")],
 img="girih",icon=lambda n,c:icon_fluent(n,c["text"],c["acc"]),hero="Few axioms. Every pattern.",cta="Enter the canon"),
dict(id="d6",n="6",name="Primitive",movement="Bauhaus",system="Teenage Engineering",
 feel="Circle, square, triangle, and a knob. Kandinsky's 1923 questionnaire gives the colors, Bayer's universal alphabet the letters, Teenage Engineering the hardware feel: Bucket as an instrument you play.",
 fonts="family=Jost:wght@400;700&family=Space+Mono:wght@400;700",disp="'Jost'",dispw=700,body="'Jost'",mono="'Space Mono'",
 c=dict(bg="#D9D6CF",surf="#EDEBE6",text="#111111",muted="#3F3D39",acc="#FF5F00",onacc="#111111",hl="#1D4ED8"),
 layout="Hardware panel: 8px module, mono labels in small caps, 2px black keylines, controls laid out like OP-1 keys",
 illus="Only the three primitives in primary colors, composed like Bauhaus posters. No figures.",
 iconstyle="Built from circle, square and triangle only, two-color, 16px module scaled 2x, after OP-1 screen graphics",
 motion="Stepped and linear: steps(4) for state, 120ms linear for knobs, after TE device screens",
 ease="steps(4,end)",dur="320ms",anim="step",
 src=[("Herbert Bayer, Universal alphabet, 1925, MoMA","https://www.moma.org/collection/works/7108"),("Wassily Kandinsky, Bauhaus color-form questionnaire, 1923","https://www.bauhauskooperation.com/knowledge/the-bauhaus/works/"),("Teenage Engineering OP-1 field guide","https://teenage.engineering/guides/op-1"),("Teenage Engineering design","https://teenage.engineering/products")],
 img="bauhaus",icon=lambda n,c:icon_te(n,c["text"],"#1D4ED8",c["bg"]),hero="build the past.",cta="press play"),
]

def glyph(d,size):
    c=d["c"];i=d["id"];small=size<=64
    if i=="d1": body=f'<rect width="100" height="100" fill="{c["acc"]}"/><path fill="#fff" fill-rule="evenodd" d="M20 12h16v28h28a16 16 0 0 1 16 16v16a16 16 0 0 1-16 16H20ZM36 52v24h24a4 4 0 0 0 4-4V56a4 4 0 0 0-4-4Z"/><rect x="72" y="12" width="16" height="16" fill="{c["hl"]}"/>'
    elif i=="d2": body=f'<rect width="100" height="100" rx="22" fill="{c["acc"]}"/><circle cx="50" cy="50" r="38" fill="none" stroke="{c["bg"]}" stroke-width="3"/><circle cx="50" cy="50" r="32" fill="none" stroke="{c["bg"]}" stroke-width="1"/><path fill="{c["bg"]}" fill-rule="evenodd" d="M34 22h9v56h-9Z"/><path fill="{c["bg"]}" fill-rule="evenodd" d="M57 42a18 18 0 1 1 0 36a18 18 0 1 1 0-36ZM57 51a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z"/>{"" if small else f'<circle cx="72" cy="28" r="6" fill="{c["hl"]}"/>'}'
    elif i=="d3": body=f'<rect width="100" height="100" rx="24" fill="#FFC800"/>{"" if small else '<path d="M12 84q8-8 16 0t16 0" stroke="#FF4B91" stroke-width="5" fill="none" stroke-linecap="round"/>'}<g stroke-linejoin="round" stroke-width="8"><path fill="#492457" stroke="#492457" fill-rule="evenodd" d="M30 18h14v20a22 22 0 1 1-14 20ZM56 50a10 10 0 1 0 .1 0Z" transform="translate(0 5)"/><path fill="#6B367C" stroke="#6B367C" fill-rule="evenodd" d="M30 18h14v20a22 22 0 1 1-14 20ZM56 50a10 10 0 1 0 .1 0Z"/></g>'
    elif i=="d4": body=f'<rect width="100" height="100" fill="{c["bg"]}"/><path d="M0 100 100 30V100Z" fill="{c["acc"]}"/><rect x="22" y="16" width="15" height="68" fill="{c["text"]}" transform="rotate(-8 30 50)"/><circle cx="54" cy="62" r="20" fill="{c["text"]}"/><circle cx="54" cy="62" r="8" fill="{c["acc"]}"/>'
    elif i=="d5":
        st=" ".join(f"{56+((19 if small else 15) if k%2==0 else (12 if small else 9))*math.cos(math.pi*k/8-math.pi/2):.1f},{62+((19 if small else 15) if k%2==0 else (12 if small else 9))*math.sin(math.pi*k/8-math.pi/2):.1f}" for k in range(16))
        body=f'<rect width="100" height="100" rx="18" fill="{c["surf"]}"/>{"" if small else f'<rect x="5" y="5" width="90" height="90" rx="14" fill="none" stroke="{c["acc"]}" stroke-width="2"/>'}<rect x="24" y="12" width="15" height="76" rx="2" fill="{c["text"]}"/><circle cx="56" cy="62" r="26" fill="{c["text"]}"/><polygon points="{st}" fill="{c["acc"]}"/>'
    elif i=="d7": body=f'<rect width="100" height="100" rx="4" fill="{c["acc"]}"/><path fill="{c["text"]}" fill-rule="evenodd" d="M26 14h12v34.6A22 22 0 1 1 26 66ZM48 48a14 14 0 1 0 0.01 0Z"/>'+("" if small else f'<path d="M78 8h14v14h-8v-6h-6Z" fill="{c["surf"]}"/>')
    else: body=f'<rect width="100" height="100" rx="14" fill="{c["surf"]}"/><rect x="22" y="14" width="16" height="70" fill="#1D4ED8"/><circle cx="56" cy="62" r="22" fill="#E1251B"/><circle cx="56" cy="62" r="8" fill="{c["surf"]}"/><circle cx="80" cy="20" r="{11 if small else 7}" fill="{c["acc"]}"/>'
    return f'<svg viewBox="0 0 100 100" width="{size}" height="{size}" role="img" aria-label="bkt glyph">{body}</svg>'

KERN={'d1':(-0.01,-0.03),'d2':(-0.02,-0.04),'d3':(-0.01,-0.02),'d4':(0.0,-0.01),'d5':(-0.02,-0.03),'d6':(0,0)}
def wordmark(d):
    c=d["c"]
    if d["id"]=="d6":
        return f'<svg viewBox="0 0 150 60" height="72" role="img" aria-label="bkt"><rect x="0" y="0" width="10" height="56" fill="{c["text"]}"/><circle cx="26" cy="40" r="16" fill="{c["text"]}"/><circle cx="26" cy="40" r="6" fill="{c["bg"]}"/><rect x="48" y="0" width="10" height="56" fill="{c["text"]}"/><path d="M58 38 82 18V56Z" fill="#E1251B"/><rect x="96" y="6" width="10" height="50" fill="{c["text"]}"/><rect x="86" y="20" width="30" height="10" fill="{c["text"]}"/><circle cx="128" cy="50" r="6" fill="{c["acc"]}"/></svg>'
    txt={"d4":"BKT"}.get(d["id"],"bkt")
    k1,k2=KERN[d["id"]]
    return f'<span class="wm" style="font-family:{d["disp"]};font-weight:{d["dispw"]};color:{c["text"]}" aria-label="bkt"><i>{txt[0]}</i><i style="margin-left:{k1}em">{txt[1]}</i><i style="margin-left:{k2}em">{txt[2]}</i></span>'

def pairs(d):
    c=d["c"]
    P=[("text on bg",c["text"],c["bg"]),("muted on bg",c["muted"],c["bg"]),("text on surface",c["text"],c["surf"]),("muted on surface",c["muted"],c["surf"]),("button label",c["onacc"],c["acc"])]
    if d["id"]=="d6": P.append(("blue link on bg","#1D4ED8","#EDEBE6"))
    NT={"d1":[("icon on bg",c["text"],c["bg"]),("action on bg",c["acc"],c["bg"])],"d2":[("crest on bg",c["acc"],c["bg"])],"d3":[("icon on bg","#6B367C",c["bg"]),("glyph on yellow","#6B367C","#FFC800")],"d4":[("icon on bg",c["text"],c["bg"]),("wedge on bg",c["acc"],c["bg"])],"d5":[("icon on bg",c["text"],c["bg"]),("star on bg",c["acc"],c["bg"])],"d6":[("icon on bg",c["text"],c["bg"]),("orange key keyline","#111111",c["acc"])],"d7":[("icon on bg",c["text"],c["bg"]),("terracotta on bg",c["acc"],c["bg"])]}[d["id"]]
    if d["id"]=="d2": P.append(("seal label","#FFFFFF",c["hl"]))
    if d["id"]=="d3": P.append(("pink tag label","#1A1A1A",c["hl"]))
    if d["id"]=="d5": P.append(("gold on bg",c["hl"],c["bg"]))
    out=[]
    for n,f,b in P:
        r=cr(f,b); assert r>=4.5,(d["name"],n,r); out.append((n,f,b,r))
    for n,f,b in NT:
        r=cr(f,b); assert r>=3,(d["name"],n,r); out.append((n+", non-text 3:1",f,b,r))
    return out

D.append(dict(id="d7",n="7",name="Euclid",movement="Classical Greek: Attic red-figure, stoichedon inscriptions and Byrne's Euclid",system="Wikimedia Codex",
 feel="Bucket as the Greek polymath's notebook. Letters cut on the stoichedon grid, terracotta and black from Attic vases, and Byrne's colored proofs for every diagram. The heritage ℧ links the research workspace to its foundation.",
 fonts="family=GFS+Didot&family=Gentium+Book+Plus:wght@400;700&family=Noto+Sans+Mono",disp="'GFS Didot'",dispw=400,body="'Gentium Book Plus'",mono="'Noto Sans Mono'",
 c=dict(bg="#F3EEE3",surf="#FBF8F1",text="#1A1714",muted="#5B5148",acc="#A6442A",onacc="#FFFFFF",hl="#1E4F94"),
 layout="Stoichedon letter grid for headings, Codex 8px spacing and 2px radius, numbered propositions with a proof column beside the figure",
 illus="Byrne-style Euclid figures in red, yellow and blue on parchment, red-figure silhouettes for people and animals, all drawn by compass and straightedge in code",
 iconstyle="Codex icons, 20px grid, filled, 2px strokes turned to fills, with a Greek-key corner on the active state",
 motion="Proof steps: each construction line draws in order, then the conclusion fades in with QED; cubic-bezier(0.4,0,0.2,1) 240ms per step",
 ease="cubic-bezier(0.4,0,0.2,1)",dur="240ms",anim="slide",
 src=[("Oliver Byrne, The First Six Books of the Elements of Euclid, 1847","https://archive.org/details/firstsixbooksofe00eucl"),("Euphronios krater, Met, public domain","https://www.metmuseum.org/art/collection/search/253425"),("Stoichedon inscription, decree of Athens, British Museum","https://www.britishmuseum.org/collection/term/x11868"),("Wikimedia Codex design system","https://doc.wikimedia.org/codex/latest/")],
 img="greek",icon=lambda n,c:"",hero="Every proof, in order.",cta="Begin the Elements"))
