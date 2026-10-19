"""Pages entières aux 5 largeurs de la procédure digiprez (préchargement sauté) + débordement horizontal par largeur."""
import asyncio, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).parent
URL = (ROOT.parent / "landing_ds-stores.html").resolve().as_uri() + "?pre=99"
OUT = ROOT.parent / "screenshots"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"])
        for w, h in ((1920, 1080), (1440, 900), (1024, 768), (768, 1024), (375, 812)):
            ctx = await b.new_context(viewport={"width": w, "height": h}, is_mobile=w < 500, has_touch=w < 800)
            pg = await ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto(URL); await pg.wait_for_timeout(2500)
            H = await pg.evaluate("document.documentElement.scrollHeight")
            for y in range(0, H, 500):
                await pg.evaluate(f"scrollTo(0, {y})"); await pg.wait_for_timeout(90)
            await pg.wait_for_timeout(2500)
            over = await pg.evaluate("""() => { const W = innerWidth; const bad = [];
                document.querySelectorAll('body *').forEach(el => { const r = el.getBoundingClientRect();
                  if (r.width && (r.right > W + 2) && getComputedStyle(el).position !== 'fixed') {
                    let p = el, clipped = false; while ((p = p.parentElement)) { const o = getComputedStyle(p).overflowX; if (o !== 'visible') { clipped = true; break; } }
                    if (!clipped) bad.push((el.id || el.className || el.tagName).toString().slice(0, 40)); } });
                return [document.documentElement.scrollWidth, W, bad.slice(0, 5)]; }""")
            await pg.evaluate("scrollTo(0, 0)"); await pg.wait_for_timeout(800)
            await pg.screenshot(path=str(OUT / f"landing_{w}px.png"))
            print(w, "hauteur", H, "scrollWidth/innerWidth", over[:2], "éléments qui dépassent", over[2], "erreurs", errs[:3] or "aucune")
            await ctx.close()
        await b.close()
asyncio.run(main())
