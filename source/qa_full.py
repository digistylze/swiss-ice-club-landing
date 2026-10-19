"""QA de la page complète : captures écran par écran (desktop 1440 et mobile 390), erreurs console, débordement,
hauteur et fond de chaque section (pour repérer les vides). Usage : python qa_full.py [desk|mob|both] [préfixe]"""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).parent
URL = (ROOT.parent / "landing_swiss-ice-club.html").resolve().as_uri() + "?pre=99"  # préchargement sauté
VPS = {"desk": {"width": 1440, "height": 900}, "mob": {"width": 390, "height": 844}, "tab": {"width": 768, "height": 1024}}


async def run(p, vp, prefix):
    b = await p.chromium.launch(args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"])
    ctx = await b.new_context(viewport=VPS[vp], device_scale_factor=1, is_mobile=vp == "mob", has_touch=vp == "mob")
    pg = await ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: m.type in ("error", "warning") and errs.append(f"{m.type}: {m.text}"))
    await pg.goto(URL)
    await pg.wait_for_timeout(2500)
    await pg.screenshot(path=str(ROOT / "qa" / f"{prefix}{vp}_00.png"), timeout=180000)
    H = await pg.evaluate("document.documentElement.scrollHeight")
    y, i = 0, 1
    step = int(VPS[vp]["height"] * 0.85)
    while y + VPS[vp]["height"] < H and i < 40:
        target = y + step
        for k in range(1, 5):
            await pg.evaluate(f"window.scrollTo(0, {y + (target - y) * k / 4})")
            await pg.wait_for_timeout(120)
        y = target
        await pg.wait_for_timeout(1400)
        await pg.screenshot(path=str(ROOT / "qa" / f"{prefix}{vp}_{i:02d}.png"), timeout=180000); print("capture", i, y, flush=True)
        i += 1
        H = await pg.evaluate("document.documentElement.scrollHeight")
    secs = await pg.evaluate("""() => [...document.querySelectorAll('body > header, main > section, body > footer')].map(s => {
        const r = s.getBoundingClientRect(); return `${s.id}: top ${Math.round(r.top + scrollY)} h ${Math.round(r.height)} bg ${getComputedStyle(s).backgroundColor}`; })""")
    over = await pg.evaluate("[document.documentElement.scrollWidth, innerWidth]")
    print(vp, "hauteur", H, "captures", i)
    print("\n".join(secs))
    print(vp, "débordement horizontal :", "OUI " + str(over) if over[0] > over[1] + 1 else "non")
    print(vp, "erreurs :", errs[:10] if errs else "aucune")
    await b.close()


async def main():
    what = sys.argv[1] if len(sys.argv) > 1 else "both"
    prefix = sys.argv[2] if len(sys.argv) > 2 else "full_"
    (ROOT / "qa").mkdir(exist_ok=True)
    async with async_playwright() as p:
        for vp in (("desk", "mob") if what == "both" else (what,)):
            await run(p, vp, prefix)

asyncio.run(main())
