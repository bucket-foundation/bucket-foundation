import os,sys,glob,asyncio
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__))
SCREENS=os.path.join(os.path.dirname(HERE),"screens")
THUMBS=os.path.join(SCREENS,"thumbs")
SIZES=[(1440,900),(390,844)]
async def main(scale=1,only=None):
    os.makedirs(THUMBS,exist_ok=True);bad=0
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get("CHROME","/usr/bin/google-chrome"))
        for f in sorted(glob.glob(os.path.join(SCREENS,"grid2-*.html"))):
            name=os.path.basename(f)[:-5]
            if only and only not in name: continue
            for w,h in SIZES:
                pg=await b.new_page(viewport=dict(width=w,height=h),device_scale_factor=scale,reduced_motion="reduce")
                await pg.goto("file://"+f,wait_until="networkidle");await pg.evaluate("document.fonts.ready");await pg.wait_for_timeout(300)
                sw=await pg.evaluate("document.documentElement.scrollWidth")
                if sw>w: bad+=1;print(f"OVERFLOW {name} {w}: {sw}")
                suf="" if scale==1 else f"@{scale}x"
                out=os.path.join(THUMBS if scale==1 else os.environ.get("OUT2X","/tmp"),f"{name}-{w}{suf}.png")
                await pg.screenshot(path=out);await pg.close()
        await b.close()
    print("overflow failures",bad);return bad
if __name__=="__main__":
    sc=int(sys.argv[1]) if len(sys.argv)>1 else 1
    sys.exit(1 if asyncio.run(main(sc,sys.argv[2] if len(sys.argv)>2 else None)) else 0)
