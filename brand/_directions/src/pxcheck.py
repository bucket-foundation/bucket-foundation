import sys,io;sys.path.insert(0,__import__("os").path.dirname(__import__("os").path.abspath(__file__)))
import logos,cairosvg
from lib import D
from PIL import Image
def hexrgb(h): return tuple(int(h[k:k+2],16) for k in (1,3,5))
def mask(d,fn,px=16):
    s=logos.svgm(d,fn,px);bg=hexrgb(d["c"]["bg"])
    im=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=s.encode(),output_width=px,output_height=px,background_color=d["c"]["bg"]))).convert("RGB")
    return [[sum(abs(a-b) for a,b in zip(im.getpixel((x,y)),bg))>120 for x in range(px)] for y in range(px)]
def runs1(d,fn,px=16):
    m=mask(d,fn,px);bad=0
    for L in (m,[list(c) for c in zip(*m)]):
        for row in L:
            k=0
            while k<len(row):
                j=k
                while j<len(row) and row[j]==row[k]: j+=1
                if j-k==1 and (row[k] or (k>0 and j<len(row))): bad+=1
                k=j
    return bad
if __name__=="__main__":
    for d in D:
        print(d["id"]," ".join(f"{k}:{runs1(d,f)}" for k,_,f in logos.MARKS+[("mascot","",logos.mascot)]))
