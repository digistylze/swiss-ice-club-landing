"""Intro en temps réel (GPU) : captures toutes les ~1,5 s, i/s mesurés, état de l'intro, puis défilement réel à la molette jusqu'en bas."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).parent
URL = (ROOT.parent / "landing_swiss-ice-club.html").resolve().as_uri()
async def main():
    vp = sys.argv[1] if len(sys.argv) > 1 else "desk"
    size = {"desk": {"width": 1440, "height": 900}, "mob": {"width": 390, "height": 844}}[vp]
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"])
        ctx = await b.new_context(viewport=size, is_mobile=vp == "mob", has_touch=vp == "mob")
        pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type in ("error", "warning") and errs.append(m.text))
        await pg.goto(URL)
        await pg.evaluate("""() => { window.__f = 0; const t = () => { window.__f++; requestAnimationFrame(t); }; requestAnimationFrame(t); }""")
        t0 = 0
        for i in range(9):
            await pg.wait_for_timeout(1500)
            st = await pg.evaluate("[window.__f, window.__hero ? +window.__hero.S.r.toFixed(2) : -1, document.documentElement.classList.contains('is-intro-done')]")
            await pg.screenshot(path=str(ROOT / "qa" / f"rt_{vp}_{i}.png"))
            print(f"t={1.5*(i+1):.1f}s  frames={st[0]}  r={st[1]}  intro_done={st[2]}")
        # défilement réel à la molette
        await pg.mouse.move(size["width"] / 2, size["height"] / 2)
        for k in range(160):
            await pg.mouse.wheel(0, 400); await pg.wait_for_timeout(60)
        await pg.wait_for_timeout(1500)
        res = await pg.evaluate("[scrollY + innerHeight, document.documentElement.scrollHeight, window.SIC.lenis.limit, document.documentElement.scrollHeight - innerHeight]")
        print("bas atteint :", res)
        await pg.screenshot(path=str(ROOT / "qa" / f"rt_{vp}_end.png"))
        print("erreurs :", errs[:8] or "aucune")
        await b.close()
asyncio.run(main())
