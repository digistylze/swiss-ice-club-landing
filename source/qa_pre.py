"""Captures figées du hero 3D (GPU) : python qa_pre.py [fichier] --t l0.3,0,2,4,6,7,8,9,99 [--vp desk|mob|both] [--size 1440x900]
Écrit qa/pre_<vp>_<t>.png ; affiche les erreurs console."""
import argparse, asyncio, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).parent
async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file", nargs="?", default=str(ROOT / "qa" / "test_hero.html"))
    ap.add_argument("--t", default="l0.4,1,3,5,6,7,8,9,99")
    ap.add_argument("--vp", default="both")
    ap.add_argument("--size", default="")
    ap.add_argument("--wait", type=int, default=2600)
    a = ap.parse_args()
    url = pathlib.Path(a.file).resolve().as_uri()
    vps = {"desk": {"width": 1440, "height": 900}, "mob": {"width": 390, "height": 844}}
    if a.size: w, h = a.size.split("x"); vps["desk"] = {"width": int(w), "height": int(h)}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"])
        for vp in (("desk", "mob") if a.vp == "both" else (a.vp,)):
            ctx = await b.new_context(viewport=vps[vp], device_scale_factor=1, is_mobile=vp == "mob", has_touch=vp == "mob")
            pg = await ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: m.type in ("error", "warning") and errs.append(f"{m.type}: {m.text}"))
            for t in a.t.split(","):
                await pg.goto(url + "?pre=" + t)
                await pg.wait_for_timeout(a.wait)
                await pg.screenshot(path=str(ROOT / "qa" / f"pre_{vp}_{t}.png"), timeout=120000)
            print(vp, "erreurs :", errs[:6] or "aucune")
            await ctx.close()
        await b.close()
asyncio.run(main())
