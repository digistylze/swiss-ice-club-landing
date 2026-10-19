"""Captures de QA d'un fichier HTML de la landing (complet ou test de section).

Usage :
  python qa_shot.py FICHIER.html --name hero [--sel "#s-hero"] [--offsets 0,0.5,1] [--times 300,1200,3000]
         [--vp desk|mob|both] [--hover x,y]
- --sel : élément à amener à l'écran (sinon haut de page) ; --offsets : positions de défilement en fraction de la
  hauteur de l'élément (0 = son haut aligné en haut de l'écran) ; --times : instants (ms) des captures à chaque position.
- Écrit qa/<name>_<vp>_<offset>_<t>.png et affiche : erreurs console, débordement horizontal (scrollWidth > largeur).
"""
import argparse, asyncio, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).parent
VPS = {"desk": {"width": 1440, "height": 900}, "mob": {"width": 390, "height": 844}}


async def run(p, args, vpname):
    b = await p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = await b.new_context(viewport=VPS[vpname], device_scale_factor=1, is_mobile=vpname == "mob", has_touch=vpname == "mob")
    pg = await ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: m.type in ("error", "warning") and errs.append(f"{m.type}: {m.text}"))
    await pg.goto(pathlib.Path(args.file).resolve().as_uri())
    await pg.wait_for_timeout(400)
    offsets = [float(x) for x in args.offsets.split(",")]
    times = [int(x) for x in args.times.split(",")]
    for off in offsets:
        if args.sel:
            y = await pg.evaluate("""([s, o]) => { const el = document.querySelector(s); if (!el) return -1;
                const r = el.getBoundingClientRect(); return Math.max(0, r.top + scrollY + r.height * o); }""", [args.sel, off])
            if y < 0:
                print("sélecteur introuvable :", args.sel); break
        else:
            y = off * await pg.evaluate("document.documentElement.scrollHeight - innerHeight")
        # défilement progressif pour déclencher les ScrollTrigger intermédiaires
        cur = await pg.evaluate("scrollY")
        steps = max(1, int(abs(y - cur) / 300))
        for i in range(1, steps + 1):
            await pg.evaluate(f"window.scrollTo(0, {cur + (y - cur) * i / steps})")
            await pg.wait_for_timeout(60)
        if args.hover:
            x, yy = (int(v) for v in args.hover.split(","))
            await pg.mouse.move(x, yy, steps=8)
        last = 0
        for t in times:
            await pg.wait_for_timeout(max(0, t - last)); last = t
            out = ROOT / "qa" / f"{args.name}_{vpname}_{off:g}_{t}.png"
            await pg.screenshot(path=str(out))
            print("capture", out.name)
    over = await pg.evaluate("[document.documentElement.scrollWidth, innerWidth]")
    print(vpname, "débordement horizontal :", "OUI " + str(over) if over[0] > over[1] + 1 else "non")
    print(vpname, "erreurs :", errs[:8] if errs else "aucune")
    await b.close()


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file"); ap.add_argument("--name", required=True); ap.add_argument("--sel", default="")
    ap.add_argument("--offsets", default="0"); ap.add_argument("--times", default="1500")
    ap.add_argument("--vp", default="both"); ap.add_argument("--hover", default="")
    args = ap.parse_args()
    (ROOT / "qa").mkdir(exist_ok=True)
    async with async_playwright() as p:
        for vp in (("desk", "mob") if args.vp == "both" else (args.vp,)):
            await run(p, args, vp)

asyncio.run(main())
