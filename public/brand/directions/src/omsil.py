import io,cairosvg
from PIL import Image
def mask_svg(inner,vb,N=400):
    s=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vb} {vb}" width="{N}" height="{N}">{inner}</svg>'
    a=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=s.encode(),output_width=N,output_height=N))).getchannel("A")
    return [[a.getpixel((x,y))>127 for x in range(N)] for y in range(N)]
def runs(row):
    r=[];k=0;n=len(row)
    while k<n:
        if row[k]:
            j=k
            while j<n and row[j]: j+=1
            r.append((k,j));k=j
        else: k+=1
    return r
def inner_gap(row,cx):
    r=runs(row);L=[b for a,b in r if b<=cx];R_=[a for a,b in r if a>=cx]
    if not L or not R_: return 0
    return min(R_)-max(L)
def metrics(m):
    rows=[y for y,r in enumerate(m) if any(r)];top,bot=rows[0],rows[-1];H=bot-top
    spans={y:runs(m[y]) for y in rows}
    xs=[x for y in rows for a,b in spans[y] for x in (a,b)];cx=(min(xs)+max(xs))/2
    width=lambda y:spans[y][-1][1]-spans[y][0][0]
    B=max(width(y) for y in rows if y>top+H*0.45)
    full=lambda y:sum(b-a for a,b in spans[y])
    f0=full(top+1)
    fb=next(y for y in rows if y>top and full(y)<f0*0.6)
    y=fb+max(1,int(H*0.04))
    feetW=max(width(y_) for y_ in range(top,fb))
    gaps=[inner_gap(m[y_],cx) for y_ in rows if fb<=y_<top+H*0.5]
    return dict(opening=inner_gap(m[y],cx)/B,aspect=(bot-top)/B,feet=feetW/B,feet_t=(fb-top)/H,max_gap=max(gaps)/B)
