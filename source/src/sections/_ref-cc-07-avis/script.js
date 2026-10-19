/* Avis : Shapes Slideshow (Sliders #13). Le rond courant rétrécit et part (vers le haut sur desktop, par le bord de
   l'écran sur mobile), le suivant arrive en petit rond puis grandit (clip-path circle) ; les lignes de la citation sortent et entrent dans leurs masques. Auto toutes les 7 s. */
SECTIONS.push({
  id: "avis",
  init(ctx) {
    const { gsap } = ctx;
    const root = document.getElementById("s-avis");
    if (!root) return;
    const media = root.querySelector(".avis__media");
    const shapes = [...root.querySelectorAll(".avis__shape")];
    const imgs = shapes.map(s => s.querySelector("img"));
    const quotes = [...root.querySelectorAll(".avis__q")];
    const caps = quotes.map(q => q.querySelector(".avis__cap"));
    const live = root.querySelector(".avis__quotes");
    const curEl = root.querySelector(".avis__cur");
    const n = quotes.length;
    let cur = 0, busy = false, shown = ctx.reduced;

    // rond en px : inscrit dans la hauteur, centré à 55 % (il déborde du bord droit sur desktop), centré sur mobile
    let big = "", small = "";
    const geom = () => {
      const w = media.clientWidth, h = media.clientHeight, mob = ctx.isMobile();
      const r = Math.min(h * (mob ? .47 : .46), w * (mob ? .47 : .5));
      // coins vifs : la forme est un rectangle (même mécanisme du catalogue, clip-path inset au lieu de circle)
      const cx = w * (mob ? .5 : .55), cy = h / 2;
      const box = k => { const hw = (mob ? w * .45 : r * .8) * k, hh = (mob ? h * .48 : r) * k; return `inset(${(cy - hh).toFixed(1)}px ${(w - cx - hw).toFixed(1)}px ${(h - cy - hh).toFixed(1)}px ${(cx - hw).toFixed(1)}px)`; };
      big = box(1);
      small = box(.28);
      // la photo couvre une bande de 2,3 rayons autour du rond (sinon un bloc haut la recadre trop serré)
      const ih = Math.min(h, r * 2.3);
      media.style.setProperty("--ih", ih.toFixed(1) + "px");
      media.style.setProperty("--it", ((h - ih) / 2).toFixed(1) + "px");
    };
    geom();

    // autoSplit refait les lignes au resize ; avant l'entrée, la première citation reste cachée dans ses masques
    const splits = quotes.map((q, i) => new SplitText(q.querySelector(".avis__text"), {
      type: "lines", mask: "lines", autoSplit: true,
      onSplit: self => { if (i === 0 && !shown) gsap.set(self.lines, { yPercent: 120 }); },
    }));
    const lines = i => splits[i].lines;

    gsap.set(shapes, { autoAlpha: 0 });
    gsap.set(shapes[0], { autoAlpha: 1, clipPath: shown ? big : small });
    if (!shown) { gsap.set(lines(0), { yPercent: 120 }); gsap.set(caps[0], { autoAlpha: 0 }); }

    new ResizeObserver(() => { geom(); if (!busy) gsap.set(shapes[cur], { clipPath: shown ? big : small }); }).observe(media);

    // lecture automatique : en pause au survol (souris) de la citation, au focus, hors écran ; jamais en mouvement réduit
    let started = false, visible = false, hovered = false, focused = false;
    const timer = gsap.delayedCall(7, () => { live.setAttribute("aria-live", "off"); go(cur + 1, 1); }).pause();
    const sync = () => timer.paused(!(started && visible && !hovered && !focused && !ctx.reduced));
    const restart = () => { timer.restart(true); sync(); };

    const setCount = dir => {
      curEl.textContent = String(cur + 1).padStart(2, "0");
      if (!ctx.reduced) gsap.fromTo(curEl, { yPercent: 100 * dir }, { yPercent: 0, duration: .9, ease: "power3.out" });
    };

    function go(to, dir) {
      to = (to + n) % n;
      if (busy || to === cur || !shown) return;
      const from = cur; cur = to;
      const A = shapes[from], B = shapes[to], up = dir > 0;
      quotes[to].classList.add("is-current");
      setCount(dir);
      restart();
      const done = () => {
        quotes[from].classList.remove("is-current");
        gsap.set(A, { autoAlpha: 0 });
        gsap.set(B, { clipPath: big });
        busy = false;
      };
      if (ctx.reduced) {
        gsap.set(B, { autoAlpha: 1, xPercent: 0, yPercent: 0, clipPath: big });
        gsap.set(caps[to], { autoAlpha: 1 });
        return done();
      }
      busy = true;
      // desktop : les ronds montent (sortie par le haut du bloc) ; mobile : ils glissent et sortent par les bords de l'écran
      const ax = ctx.isMobile() ? "xPercent" : "yPercent", s = up ? 1 : -1;
      const at = v => ({ xPercent: 0, yPercent: 0, [ax]: v });
      gsap.timeline({ onComplete: done })
        // le rond courant rétrécit, sa citation sort par le haut
        .set(B, { autoAlpha: 1, ...at(100 * s), clipPath: small, zIndex: 2 }, 0)
        .set(A, { zIndex: 1 }, 0)
        .set(imgs[to], at(-50 * s), 0)
        .to(A, { clipPath: small, duration: 1, ease: "power3.out" }, 0)
        .to(lines(from), { yPercent: -120 * s, duration: 1, ease: "power3.inOut" }, 0)
        .to(caps[from], { autoAlpha: 0, duration: .5, ease: "power2.out" }, 0)
        // il part, le suivant arrive en petit rond (l'image glisse moins vite que sa forme)
        .to(A, { [ax]: -100 * s, duration: 1, ease: "power2.inOut" }, .6)
        .to(imgs[from], { [ax]: 50 * s, duration: 1, ease: "power2.inOut" }, .6)
        .to(B, { [ax]: 0, duration: 1, ease: "power2.inOut" }, .6)
        .to(imgs[to], { [ax]: 0, duration: 1, ease: "power2.inOut" }, .6)
        // puis il grandit ; la nouvelle citation monte ligne à ligne
        .to(B, { clipPath: big, duration: 1.5, ease: "expo.inOut" }, 1.2)
        .fromTo(lines(to), { yPercent: 120 * s }, { yPercent: 0, duration: 1.5, ease: "expo.inOut", stagger: .07 * s }, 1.1)
        .fromTo(caps[to], { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1, ease: "power2.out" }, 1.7)
        .set(imgs[from], at(0));
    }

    // entrée : le premier rond grandit quand la section arrive à l'écran
    if (!shown) {
      ctx.ScrollTrigger.create({
        trigger: root, start: "top 70%", once: true,
        onEnter: () => {
          busy = true;
          started = true; restart();
          gsap.timeline({ onComplete: () => { busy = false; shown = true; gsap.set(shapes[0], { clipPath: big }); } })
            .to(shapes[0], { clipPath: big, duration: 1.6, ease: "expo.inOut" }, 0)
            .fromTo(imgs[0], { scale: 1.14 }, { scale: 1, duration: 2.2, ease: "power2.out" }, 0)
            .to(lines(0), { yPercent: 0, duration: 1.5, ease: "expo.inOut", stagger: .07 }, .3)
            .fromTo(caps[0], { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1, ease: "power2.out" }, .9);
        },
      });
    }

    const user = dir => { live.setAttribute("aria-live", "polite"); go(cur + dir, dir); };
    root.querySelectorAll(".avis__arrow").forEach(b => b.addEventListener("click", () => user(+b.dataset.dir)));

    // glisser au doigt (horizontal franc seulement)
    let sx = 0, sy = 0;
    root.addEventListener("touchstart", e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    root.addEventListener("touchend", e => {
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) user(dx < 0 ? 1 : -1);
    }, { passive: true });

    [live, root.querySelector(".avis__nav")].forEach(el => {
      el.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") { hovered = true; sync(); } });
      el.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") { hovered = false; sync(); } });
    });
    root.addEventListener("focusin", () => { focused = true; sync(); });
    root.addEventListener("focusout", e => { if (!root.contains(e.relatedTarget)) { focused = false; sync(); } });
    ctx.whenVisible(root, () => { visible = true; sync(); }, () => { visible = false; sync(); }, "0px");
  },
});
