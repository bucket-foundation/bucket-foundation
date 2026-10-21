import os,sys,asyncio,io
from playwright.async_api import async_playwright
from PIL import Image
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from g2tokens import cr
R2=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES=[os.path.abspath(p) for p in sys.argv[1:]] or sorted(__import__("glob").glob(os.path.join(R2,"screens","*.html")))+[os.path.join(R2,"index.html")]
JS="""()=>{const fx=e=>{for(let a=e;a;a=a.parentElement){const p=getComputedStyle(a).position;if(p==="fixed"){a.dataset.fx=1;return true}}return false};const out=[];document.querySelectorAll('body *').forEach(e=>{if(![...e.childNodes].some(n=>n.nodeType==3&&n.textContent.trim()))return;if(!e.checkVisibility({visibilityProperty:true,opacityProperty:true}))return;[...e.childNodes].filter(n=>n.nodeType==3&&n.textContent.trim()).forEach(n=>{const g=document.createRange();g.selectNodeContents(n);[...g.getClientRects()].forEach(r=>{if(r.width)out.push({t:n.textContent.trim().slice(0,30),c:(e instanceof SVGElement?getComputedStyle(e).fill:getComputedStyle(e).color),fx:fx(e),x:r.x,y:r.y+scrollY,w:r.width,h:r.height})})})});return out}"""
def hexc(c):
    v=[int(float(x)) for x in c[c.index("(")+1:c.index(")")].split(",")[:3]];return "#%02X%02X%02X"%tuple(v)
fails=[]
async def main():
    worst=99;fails.clear()
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=next((x for x in ("/usr/bin/google-chrome","/usr/bin/chromium-browser","/usr/bin/chromium") if os.path.exists(x)),None))
        for f in PAGES:
            for w,h in ((1440,900),(390,844)):
                pg=await b.new_page(viewport=dict(width=w,height=h));await pg.goto("file://"+f,wait_until="networkidle");await pg.evaluate("document.fonts.ready");await pg.wait_for_timeout(500)
                boxes=await pg.evaluate(JS)
                await pg.add_style_tag(content="*{color:transparent!important;fill-opacity:1;text-shadow:none!important}svg text{fill:transparent!important}")
                limit=5.0 if any(k in f for k in ("texture","index.html")) else 4.5
                await pg.add_style_tag(content="[data-fx]{visibility:hidden!important}")
                full=Image.open(io.BytesIO(await pg.screenshot(full_page=True))).convert("RGB")
                await pg.add_style_tag(content="[data-fx]{visibility:visible!important}")
                await pg.evaluate("scrollTo(0,0)")
                view=Image.open(io.BytesIO(await pg.screenshot())).convert("RGB")
                for bx in boxes:
                    im=view if bx["fx"] else full
                    crop=im.crop((int(bx["x"])+1,int(bx["y"])+1,int(bx["x"]+bx["w"])-1,int(bx["y"]+bx["h"])-1))
                    gc=crop.getcolors(1<<20) or [];tot=sum(n for n,_ in gc) or 1;cols={"#%02X%02X%02X"%c for n,c in gc if n/tot>=.03}
                    if not cols or bx["c"] in ("none",): continue
                    fg=hexc(bx["c"]);r=min(cr(fg,c) for c in cols)
                    if r<limit: print(f"LOW {os.path.basename(f)} {w} {r:.2f} {bx['t']!r}");fails.append(r)
                    worst=min(worst,r)
                await pg.close()
        await b.close()
    print(f"worst sampled ratio {worst:.2f}");return worst
asyncio.run(main());sys.exit(1 if fails else 0)
