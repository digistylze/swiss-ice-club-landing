"""Déroulé réel du préchargement (GPU) : fluidité pendant la fermeture, prêt, un geste (molette ou glisser), page libérée.
python qa_pre_flow.py [fichier.html] [--vp desk|mob]"""
import argparse, asyncio, pathlib, time
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).parent
VPS = {"desk": {"width": 1440, "height": 900}, "mob": {"width": 390, "height": 844}}


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file", nargs="?", default=str(ROOT / "qa" / "test_hero.html"))
    ap.add_argument("--vp", default="desk")
    a = ap.parse_args()
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"])
        vp = VPS[a.vp]; mob = a.vp == "mob"
        ctx = await b.new_context(viewport=vp, is_mobile=mob, has_touch=mob)
        pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type in ("error", "warning") and errs.append(f"{m.type}: {m.text}"))
        await pg.add_init_script("""window.__fr = []; (function f(t){ window.__fr.push(t); requestAnimationFrame(f); })(0);
            new MutationObserver(() => { const p = document.querySelector('.pre');
              if (p && !window.__init && document.documentElement.classList.contains('is-ready')) window.__init = performance.now();
              if (p && p.classList.contains('is-ready') && !window.__rd) window.__rd = performance.now(); })
              .observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });""")
        t0 = time.time()
        await pg.goto(pathlib.Path(a.file).resolve().as_uri())
        await pg.wait_for_selector(".pre.is-ready", timeout=30000)
        ready = time.time() - t0
        fr = await pg.evaluate("(() => { const f = window.__fr.slice(5); const d = f.slice(1).map((t, i) => t - f[i]); d.sort((x, y) => x - y); return [d.length, d[Math.floor(d.length / 2)], d[Math.floor(d.length * .95)]]; })()")
        await pg.screenshot(path=str(ROOT / "qa" / f"flow_pre_{a.vp}_ready.png"))
        await pg.wait_for_timeout(600)
        if mob:
            cdp = await ctx.new_cdp_session(pg)
            for typ, y in (("touchStart", 600), ("touchMove", 580), ("touchMove", 540), ("touchEnd", 540)):
                await cdp.send("Input.dispatchTouchEvent", {"type": typ, "touchPoints": [] if typ == "touchEnd" else [{"x": 200, "y": y}]})
                await pg.wait_for_timeout(30)
        else:
            await pg.mouse.move(700, 450); await pg.mouse.wheel(0, 120)
        await pg.wait_for_timeout(900)
        await pg.screenshot(path=str(ROOT / "qa" / f"flow_pre_{a.vp}_opening.png"))
        await pg.wait_for_selector("[data-intro-loader]", state="detached", timeout=10000)
        await pg.wait_for_timeout(1400)
        await pg.screenshot(path=str(ROOT / "qa" / f"flow_pre_{a.vp}_open.png"))
        st = await pg.evaluate("[document.documentElement.classList.contains('is-intro-done'), DS.lenis.isStopped, document.querySelector('main') && document.querySelector('main').inert, scrollY]")
        tm = await pg.evaluate("[performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd, window.__init, window.__rd]")
        print(a.vp, "DOMContentLoaded, sections prêtes, store prêt (ms) :", [round(x or 0) for x in tm])
        print(a.vp, f"prêt après {ready:.2f} s ; images : {fr[0]}, médiane {fr[1]:.1f} ms, 95e centile {fr[2]:.1f} ms")
        print(a.vp, "intro finie, lenis arrêté, main inert, scrollY :", st)
        print(a.vp, "erreurs :", errs[:6] or "aucune")
        await b.close()

asyncio.run(main())
