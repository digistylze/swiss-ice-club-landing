"""Fin de page sur mobile : captures du CTA (#69) et du pied de page, élément réellement touché au centre des boutons.
Usage : python qa_end.py [390x844]"""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).parent
URL = (ROOT.parent / "landing_carmelo-crea.html").resolve().as_uri() + "?pre=99"
W, H = map(int, (sys.argv[1] if len(sys.argv) > 1 else "390x844").split("x"))
HIT = """sel => { const b = document.querySelector(sel); if (!b) return 'absent'; const r = b.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2; if (y < 0 || y > innerHeight) return 'hors écran ' + Math.round(y);
  const e = document.elementFromPoint(x, y); return Math.round(y) + ' -> ' + (e ? (e.className.baseVal ?? e.className) + ' <' + e.tagName + '>' : 'rien'); }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"])
        ctx = await b.new_context(viewport={"width": W, "height": H}, is_mobile=True, has_touch=True, device_scale_factor=2)
        pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(2000)
        top = await pg.evaluate("document.querySelector('#s-cta').getBoundingClientRect().top + scrollY")
        end = await pg.evaluate("document.documentElement.scrollHeight - innerHeight")
        ys = [top - H * .3 + k * H * .25 for k in range(30)]
        ys = [y for y in ys if y < end] + [end]
        for i, y in enumerate(ys):
            await pg.mouse.wheel(0, 0)
            await pg.evaluate(f"window.scrollTo(0, {y})"); await pg.wait_for_timeout(700)
            await pg.screenshot(path=str(ROOT / "qa" / f"end_{i:02d}.png"))
            print(i, int(y), "I:", await pg.evaluate(HIT, ".cta__btn.is-on"), "| pied:", await pg.evaluate(HIT, ".ft__cta"))
        print("scrollY final", await pg.evaluate("scrollY"), "max", end, "erreurs", errs or "aucune")
        await b.close()
asyncio.run(main())
