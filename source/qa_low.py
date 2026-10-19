"""QA écrans bas : capture des sections épinglées / à texte dans des fenêtres de portables réels.
Usage : python qa_low.py [sélecteurs séparés par des virgules]"""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).parent
URL = (ROOT.parent / "landing_carmelo-crea.html").resolve().as_uri() + "?pre=99"
SIZES = [(1366, 625), (1280, 600), (1536, 730), (1920, 960)]
SELS = (sys.argv[1] if len(sys.argv) > 1 else "#s-formules").split(",")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"])
        for w, h in SIZES:
            pg = await (await b.new_context(viewport={"width": w, "height": h})).new_page()
            await pg.goto(URL); await pg.wait_for_timeout(2500)
            for sel in SELS:
                # défile jusqu'à la fin de l'épinglage (cartes retournées) par petits pas
                y = await pg.evaluate(f"(() => {{ const el = document.querySelector('{sel}'); return el.getBoundingClientRect().top + scrollY; }})()")
                end = y + (h * 1.0 if sel == "#s-formules" else 0)
                cur = await pg.evaluate("scrollY")
                for k in range(1, 25):
                    await pg.evaluate(f"window.scrollTo(0, {cur + (end - cur) * k / 24})"); await pg.wait_for_timeout(50)
                await pg.wait_for_timeout(1600)
                out = ROOT / "qa" / f"low_{sel.strip('#')}_{w}x{h}.png"
                await pg.screenshot(path=str(out)); print(out.name)
                over = await pg.evaluate("""(sel) => [...document.querySelectorAll(sel + ' .fm-card__back')].map(b => b.scrollHeight - b.clientHeight)""", sel)
                if over: print("  débordement du texte des cartes (px) :", over)
            await pg.close()
        await b.close()
asyncio.run(main())
