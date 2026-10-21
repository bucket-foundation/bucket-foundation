import os,sys,asyncio,io
from playwright.async_api import async_playwright
from PIL import Image
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from g2tokens import cr
R2=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES=[p for p in sys.argv[1:]] or [os.path.join(R2,"screens","grid2-texture.html"),os.path.join(R2,"index.html")]
JS="""()=>{const out=[];document.querySelectorAll('body *').forEach(e=>{if(![...e.childNodes].some(n=>n.nodeType==3&&n.textContent.trim()))return;if(!e.checkVisibility({visibilityProperty:true,opacityProperty:true}))return;[...e.childNodes].filter(n=>n.nodeType==3&&n.textContent.trim()).forEach(n=>{const g=document.createRange();g.selectNodeContents(n);[...g.getClientRects()].forEach(r=>{if(r.width)out.push({t:n.textContent.trim().slice(0,30),c:getComputedStyle(e).color,x:r.x,y:r.y+scrollY,w:r.width,h:r.height})})})});return out}"""
def hexc(c):
    v=[int(float(x)) for x in c[c.index("(")+1:c.index(")")].split(",")[:3]];return "#%02X%02X%02X"%tuple(v)
async def main():
    worst=99
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=next((x for x in ("/usr/bin/google-chrome","/usr/bin/chromium-browser","/usr/bin/chromium") if os.path.exists(x)),None))
        for f in PAGES:
            for w,h in ((1440,900),(390,844)):
                pg=await b.new_page(viewport=dict(width=w,height=h));await pg.goto("file://"+f,wait_until="networkidle");await pg.evaluate("document.fonts.ready");await pg.wait_for_timeout(500)
                boxes=await pg.evaluate(JS)
                await pg.add_style_tag(content="*{color:transparent!important;text-shadow:none!important}")
                im=Image.open(io.BytesIO(await pg.screenshot(full_page=True))).convert("RGB")
                for bx in boxes:
                    crop=im.crop((int(bx["x"])+1,int(bx["y"])+1,int(bx["x"]+bx["w"])-1,int(bx["y"]+bx["h"])-1))
                    cols={"#%02X%02X%02X"%c for _,c in crop.getcolors(1<<20) or []}
                    if not cols: continue
                    fg=hexc(bx["c"]);r=min(cr(fg,c) for c in cols)
                    if r<5.0: print(f"LOW {os.path.basename(f)} {w} {r:.2f} {bx['t']!r}")
                    worst=min(worst,r)
                await pg.close()
        await b.close()
    print(f"worst sampled ratio {worst:.2f}");return worst
sys.exit(0 if asyncio.run(main())>=5.0 else 1)
