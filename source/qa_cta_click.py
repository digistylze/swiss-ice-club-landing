"""CTA #69 : le I couché doit être cliquable. Compare le bouton HTML et le I dessiné, puis clique au centre du I
(desktop, écran bas, mobile) et vérifie que la réservation s'ouvre sur « decouverte ».
Usage : python qa_cta_click.py [FICHIER.html]   (défaut : qa/test_faq-cta-footer.html)"""
import asyncio, json, pathlib, sys
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).parent
URL = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "qa" / "test_faq-cta-footer.html").resolve().as_uri()
JS = """() => { const i = document.querySelector('#s-cta .cta__i').getBoundingClientRect(), b = document.querySelector('#s-cta .cta__btn');
  const r = b.getBoundingClientRect(); const cx = i.left + i.width / 2, cy = i.top + i.height / 2; const el = document.elementFromPoint(cx, cy);
  return { I: [i.left, i.top, i.width, i.height].map(Math.round), btn: [r.left, r.top, r.width, r.height].map(Math.round), on: b.classList.contains('is-on'),
           lbl: document.querySelector('#s-cta .cta__lbl').textContent,
           under: el && (el.className.baseVal !== undefined ? el.tagName + '.' + el.className.baseVal : el.tagName + '.' + el.className) }; }"""
# espionne l'ouverture de la réservation (section 12 présente ou non)
SPY = "(() => { const o = SIC.openBooking; SIC.openBooking = k => { window.__booked = k; try { o(k); } catch (e) {} }; })()"


async def main():
    ok = True
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        for vp in ({"width": 1440, "height": 900}, {"width": 1366, "height": 625}, {"width": 390, "height": 844}):
            mob = vp["width"] < 500
            pg = await (await b.new_context(viewport=vp, is_mobile=mob, has_touch=mob)).new_page()
            await pg.goto(URL); await pg.wait_for_timeout(1500)
            await pg.evaluate(SPY)
            # défilement progressif jusqu'à ce que le bas de la scène soit à mi-écran (au-delà de la fin de la bascule)
            y = await pg.evaluate("document.querySelector('#s-cta .cta__stage').getBoundingClientRect().bottom + scrollY - innerHeight * .5")
            for k in range(1, 41):
                await pg.evaluate(f"window.scrollTo(0, {y * k / 40})"); await pg.wait_for_timeout(40)
            await pg.wait_for_timeout(1800)
            info = await pg.evaluate(JS); print(vp["width"], vp["height"], json.dumps(info, ensure_ascii=False))
            i, r = info["I"], info["btn"]
            fit = all(abs(a - c) <= 2 for a, c in zip(i, r))
            print("  bouton calé sur le I :", fit)
            if mob:
                await pg.touchscreen.tap(i[0] + i[2] / 2, i[1] + i[3] / 2)
            else:
                await pg.mouse.click(i[0] + i[2] / 2, i[1] + i[3] / 2)
            await pg.wait_for_timeout(600)
            booked = await pg.evaluate("window.__booked")
            print("  réservation ouverte sur :", booked)
            ok &= fit and info["on"] and booked == "decouverte" and info["lbl"] == "RÉSERVER MA SÉANCE DÉCOUVERTE"
            await pg.screenshot(path=str(ROOT / "qa" / f"cta_click_{vp['width']}x{vp['height']}.png"))
            await pg.close()
        await b.close()
    print("RÉSULTAT :", "OK" if ok else "ÉCHEC")

asyncio.run(main())
