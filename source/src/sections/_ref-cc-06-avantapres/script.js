// ---------- Sliders #2 (Atelier Nova) : l'étape suivante naît dans une fenêtre au centre et envahit le cadre ----------
// Mécanisme du catalogue : la photo courante grossit (1 -> 1,8), la suivante s'ouvre (clip-path depuis le centre) puis
// s'agrandit jusqu'au cadre ; le titre sort lettre à lettre par le haut pendant que le suivant monte. Adapté : cadre 4/5
// au lieu du plein écran, titre = étape du chantier, lecture automatique (pause hors écran, au survol, au focus), clic ou
// « Étape suivante » pour avancer, tirets pour aller à une étape. Mouvement réduit : fondu, sans lecture automatique.
// Mobile : la fenêtre au centre cachait la photo et rien ne se manipulait au doigt. Le cadre devient un comparateur :
// la photo « avant » posée sur la photo « après », un curseur à faire glisser (ou à toucher là où l'on veut le poser),
// un sélecteur pour passer d'un chantier à l'autre.
SECTIONS.push({
  id: "avantapres",
  init(ctx) {
    const { gsap } = ctx;
    const root = document.getElementById("s-avantapres");
    if (!root) return;
    const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
    const slider = $(".ap-slider"), stage = $(".ap-stage");
    const items = $$(".ap-src img").map(im => ({ src: im.src, alt: im.alt, word: im.dataset.word, proj: im.dataset.proj, detail: im.dataset.detail }));
    const name = $(".ap-proj__name"), detail = $(".ap-proj__detail");
    const mm = gsap.matchMedia();

    mm.add("(min-width: 861px)", () => {
      const ac = new AbortController(), on = { signal: ac.signal };
      const wCur = $(".ap-word__cur"), wNxt = $(".ap-word__nxt"), countEl = $(".ap-count__cur");
      const dots = $$(".ap-dots button");
      const N = items.length, DWELL = 3.4, PREVIEW = .34;
      let cur = 0, nxt = 1, busy = false, tl = null;

      const chars = (el, txt) => { el.innerHTML = [...txt].map(c => `<i>${c === " " ? "&nbsp;" : c}</i>`).join(""); return [...el.children]; };
      const box = () => ({ w: slider.clientWidth, h: slider.clientHeight });

      // état : photo courante plein cadre + étape suivante en petite fenêtre fermée au centre
      function render() {
        const a = items[cur], b = items[nxt];
        slider.innerHTML = `<div class="ap-cur"><img src="${a.src}" alt=""></div><div class="ap-nxt"><div class="ap-nxt__img"><img src="${b.src}" alt=""></div></div>`;
        const { w, h } = box();
        gsap.set(slider.querySelector(".ap-nxt__img"), { width: w * PREVIEW, height: h * PREVIEW, clipPath: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)" });
        chars(wCur, a.word); chars(wNxt, b.word);
        gsap.set(wNxt, { visibility: "hidden" });
        slider.setAttribute("aria-label", a.alt);
        name.textContent = a.proj; detail.textContent = a.detail;
        countEl.textContent = String(cur + 1).padStart(2, "0");
        dots.forEach((d, i) => (i === cur ? d.setAttribute("aria-current", "step") : d.removeAttribute("aria-current")));
      }
      const revealPreview = () => { tl = gsap.to(slider.querySelector(".ap-nxt__img"), { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", duration: .7, ease: "power3.out" }); };

      function go(to) {
        if (busy || to === cur) return;
        if (to !== nxt) { nxt = to; render(); gsap.set(slider.querySelector(".ap-nxt__img"), { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }); }
        busy = true;
        timer.pause();
        const curImg = slider.querySelector(".ap-cur img"), wrap = slider.querySelector(".ap-nxt__img");
        const done = () => { cur = nxt; nxt = (cur + 1) % N; render(); busy = false; if (!ctx.reduced) revealPreview(); restart(); };
        if (ctx.reduced) { done(); return; }
        const out = [...wCur.children], inn = [...wNxt.children];
        const { w, h } = box();
        gsap.set(wNxt, { visibility: "visible" });
        gsap.set(inn, { yPercent: 110 });
        tl = gsap.timeline({ onComplete: done })
          .to(curImg, { scale: 1.8, duration: 1.5, ease: "power3.out" }, 0)
          .to(out, { yPercent: -110, stagger: .04, duration: .38, ease: "power3.out" }, 0)
          .to(inn, { yPercent: 0, stagger: .04, duration: .45, ease: "power3.out" }, .22)
          .to(wrap, { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", duration: .7, ease: "power3.out" }, .18)
          .to(wrap, { width: w, height: h, duration: 1.6, ease: "power3.out" }, .18)
          .to([name, detail], { autoAlpha: 0, duration: .25, ease: "power1.in" }, .1)
          .add(() => { name.textContent = items[nxt].proj; detail.textContent = items[nxt].detail; }, .36)
          .to([name, detail], { autoAlpha: 1, duration: .5, ease: "power2.out" }, .4);
      }

      // lecture automatique : à l'écran, sans survol (souris) ni focus clavier, jamais en mouvement réduit
      const st = { vis: false, hover: false, focus: false };
      const timer = gsap.delayedCall(DWELL, () => go(nxt)).pause();
      const sync = () => timer.paused(!(st.vis && !st.hover && !st.focus && !busy && !ctx.reduced));
      function restart() { timer.restart(true); sync(); }

      slider.addEventListener("click", () => go(nxt), on);
      $(".ap-step").addEventListener("click", () => go(nxt), on);
      dots.forEach((d, i) => d.addEventListener("click", () => go(i), on));
      stage.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") { st.hover = true; sync(); } }, on);
      stage.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") { st.hover = false; sync(); } }, on);
      root.addEventListener("focusin", e => { st.focus = e.target.matches(":focus-visible"); sync(); }, on);
      root.addEventListener("focusout", e => { if (!root.contains(e.relatedTarget)) { st.focus = false; sync(); } }, on);
      const io = ctx.whenVisible(stage, () => { st.vis = true; sync(); }, () => { st.vis = false; sync(); }, "-10% 0px");

      // la fenêtre d'aperçu suit la taille du cadre
      const ro = new ResizeObserver(() => {
        if (busy) return;
        const { w, h } = box(), wrap = slider.querySelector(".ap-nxt__img");
        if (wrap) gsap.set(wrap, { width: w * PREVIEW, height: h * PREVIEW });
      });
      ro.observe(slider);

      render();
      if (!ctx.reduced) revealPreview();
      restart();
      return () => { ac.abort(); io.disconnect(); ro.disconnect(); timer.kill(); if (tl) tl.kill(); gsap.set([name, detail], { clearProps: "opacity,visibility" }); };
    });

    mm.add("(max-width: 860px)", () => {
      const ac = new AbortController(), on = { signal: ac.signal };
      const cmp = $(".ap-cmp"), imA = $(".ap-cmp__a img"), imB = $(".ap-cmp__b"), range = $(".ap-cmp__range");
      const tabs = $$(".ap-tabs button");
      const PAIRS = [[0, 1], [2, 4]];                   // chantier : [avant, après] dans la liste des étapes
      const pos = { x: 50 };
      let hint = null, drag = null;
      const setX = v => { pos.x = Math.max(0, Math.min(100, v)); cmp.style.setProperty("--x", `${pos.x}%`); range.value = Math.round(pos.x); };
      const stop = () => { if (hint) { hint.kill(); hint = null; } };
      // petit aller-retour du curseur à l'arrivée : la photo se manipule
      const sweep = () => {
        if (ctx.reduced) return;
        stop();
        hint = gsap.timeline({ onUpdate: () => setX(pos.x) })
          .to(pos, { x: 24, duration: .7, ease: "power2.inOut" })
          .to(pos, { x: 76, duration: 1.1, ease: "power2.inOut" })
          .to(pos, { x: 50, duration: .7, ease: "power2.inOut" });
      };
      const show = (p, anim) => {
        const [a, b] = PAIRS[p];
        imA.src = items[a].src; imA.alt = items[a].alt;
        imB.src = items[b].src; imB.alt = items[b].alt;
        name.textContent = items[b].proj; detail.textContent = items[b].detail;
        tabs.forEach((t, i) => t.setAttribute("aria-pressed", i === p));
        stop(); setX(50);
        if (anim && !ctx.reduced) { gsap.fromTo(cmp, { autoAlpha: .3 }, { autoAlpha: 1, duration: .45, ease: "power2.out" }); sweep(); }
      };
      const xAt = e => { const r = cmp.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 100; };
      cmp.addEventListener("pointerdown", e => {
        stop();
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, on: e.pointerType === "mouse" };
        if (drag.on) { cmp.setPointerCapture(e.pointerId); setX(xAt(e)); }
      }, on);
      cmp.addEventListener("pointermove", e => {
        if (!drag || e.pointerId !== drag.id) return;
        if (!drag.on) {                                 // au doigt : glissé horizontal = curseur, vertical = défilement de la page
          const dx = Math.abs(e.clientX - drag.x), dy = Math.abs(e.clientY - drag.y);
          if (dx < 6 && dy < 6) return;
          if (dy > dx) { drag = null; return; }
          drag.on = true; cmp.setPointerCapture(e.pointerId);
        }
        setX(xAt(e));
      }, on);
      cmp.addEventListener("pointerup", e => { if (drag && !drag.on) setX(xAt(e)); drag = null; }, on);   // simple toucher : le curseur y va
      cmp.addEventListener("pointercancel", () => { drag = null; }, on);
      range.addEventListener("input", () => { stop(); setX(+range.value); }, on);
      tabs.forEach((t, i) => t.addEventListener("click", () => show(i, true), on));
      show(0, false);
      ctx.ScrollTrigger.create({ trigger: cmp, start: "top 75%", once: true, onEnter: sweep });
      return () => { ac.abort(); stop(); };
    });
  },
});
