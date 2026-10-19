"""Captures figées du préchargement (store) : python qa_hero.py [fichier.html] [--gpu] [--vp desk|mob|both] [--t 0.4,1.6,...]
Chaque instant t : ?pre=t (fermeture figée) ; oT (ouverture figée). Écrit qa/pre_<vp>_<t>.png."""
import argparse, asyncio, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).parent
VPS = {"desk": {"width": 1440, "height": 900}, "mob": {"width": 390, "height": 844}}


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file", nargs="?", default=str(ROOT / "qa" / "test_hero.html"))
    ap.add_argument("--gpu", action="store_true")
    ap.add_argument("--vp", default="both")
    ap.add_argument("--t", default="0.2,1.4,2.4,2.9,3.4,o0.35,o0.8,o1.3,o1.8")
    a = ap.parse_args()
    gl = ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] if a.gpu else ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
    url = pathlib.Path(a.file).resolve().as_uri()
    async with async_playwright() as p:
        b = await p.chromium.launch(args=gl)
        for vp in (("desk", "mob") if a.vp == "both" else (a.vp,)):
            ctx = await b.new_context(viewport=VPS[vp], device_scale_factor=1, is_mobile=vp == "mob", has_touch=vp == "mob")
            pg = await ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: m.type in ("error", "warning") and errs.append(f"{m.type}: {m.text}"))
            for t in a.t.split(","):
                await pg.goto(url + "?pre=" + t)
                await pg.wait_for_timeout(1800)
                await pg.screenshot(path=str(ROOT / "qa" / f"pre_{vp}_{t}.png"), timeout=180000)
                print("capture", vp, t)
            print(vp, "erreurs :", errs[:6] or "aucune")
            await ctx.close()
        await b.close()

asyncio.run(main())
