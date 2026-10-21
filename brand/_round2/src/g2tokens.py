import os,sys
sys.path.insert(0,os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),"_directions","src"))
from lib import cr
C=dict(bg="#F2F0EB",surf="#FFFFFF",surf2="#E7E3DA",text="#161616",muted="#4F4C47",line="#CFCAC0",acc="#0050E6",onacc="#FFFFFF",red="#DA1E28",redt="#B3141D",onred="#FFFFFF",knob="#FF5F00",onknob="#161616",yel="#FFD100",onyel="#161616",pblue="#1D4ED8",onpblue="#FFFFFF",ink="#161616",onink="#F2F0EB",inkmuted="#B9B4AA",
       byr="#C8331F",byy="#E8A80C",byb="#1F4E9C")
SQ=dict(bg="#FFF8E7",surf="#FFFFFF",text="#2B2B2B",muted="#5E5A52",green="#58CC02",greenlip="#46A302",ongreen="#173600",pink="#FF4B91",pinklip="#D93A78",onpink="#1A1A1A",sky="#1CB0F6",skylip="#1899D6",onsky="#08283A",line="#E5E0D2",gold="#FFC800",ongold="#2B2B2B")
S=[0,4,8,12,16,24,32,40,48,64,80,96,128]
TEXT=[("text on bg",C["text"],C["bg"]),("muted on bg",C["muted"],C["bg"]),("text on surface",C["text"],C["surf"]),("muted on surface",C["muted"],C["surf"]),
      ("muted on surface 2",C["muted"],C["surf2"]),("text on surface 2",C["text"],C["surf2"]),("link on bg",C["acc"],C["bg"]),("link on surface",C["acc"],C["surf"]),("button label",C["onacc"],C["acc"]),("red label text on bg",C["redt"],C["bg"]),("red label text on surface",C["redt"],C["surf"]),
      ("label on red",C["onred"],C["redt"]),("label on knob",C["onknob"],C["knob"]),("label on yellow",C["onyel"],C["yel"]),("label on Bauhaus blue",C["onpblue"],C["pblue"]),("paper on ink",C["onink"],C["ink"]),("muted on ink",C["inkmuted"],C["ink"]),
      ("young text on bg",SQ["text"],SQ["bg"]),("young muted on bg",SQ["muted"],SQ["bg"]),("young text on surface",SQ["text"],SQ["surf"]),("young muted on surface",SQ["muted"],SQ["surf"]),("young green button",SQ["ongreen"],SQ["green"]),
      ("young pink button",SQ["onpink"],SQ["pink"]),("young sky button",SQ["onsky"],SQ["sky"]),("young gold chip",SQ["ongold"],SQ["gold"]),("young label on knob",C["onknob"],C["knob"])]
NONTEXT=[("action on bg",C["acc"],C["bg"]),("red square on bg",C["red"],C["bg"]),("knob indicator on knob",C["ink"],C["knob"]),("rule ink on bg",C["text"],C["bg"]),("young green on bg",SQ["greenlip"],SQ["bg"]),("young pink on bg",SQ["pinklip"],SQ["bg"]),("focus ring on bg",C["text"],C["bg"])]
def pairs():
    out=[]
    for n_,f,b in TEXT:
        r=cr(f,b);assert r>=4.5,(n_,f,b,r);out.append((n_,f,b,r,4.5))
    for n_,f,b in NONTEXT:
        r=cr(f,b);assert r>=3,(n_,f,b,r);out.append((n_,f,b,r,3))
    return out
def css_vars():
    v=[f"--{k}:{x}" for k,x in C.items()]+[f"--sq-{k}:{x}" for k,x in SQ.items()]+[f"--s{i}:{x}px" for i,x in enumerate(S)]
    return ":root{"+";".join(v)+"}"
if __name__=="__main__":
    for p in pairs(): print(f"{p[0]:<28} {p[3]:.2f}")
    print("min text",min(p[3] for p in pairs() if p[4]==4.5))
