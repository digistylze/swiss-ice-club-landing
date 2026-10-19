/* ---------- Sliders #22 « Perpetual Motion » : la bande des chantiers dérive seule et ne finit jamais ----------
   Repris du #22 : un flux infini où chaque photo, sortie d'un côté, est reprise de l'autre (wrap), une cible de défilement
   que l'affichage rejoint par lerp (l'inertie), le tirage à la souris ou au doigt par capture du pointeur. Adapté : les photos
   gardent leur format (hauteur commune, largeur selon le cadrage, aucun portrait recoupé), dérive lente quand la section est
   à l'écran, arrêtée dès que l'on agit, flèches, filtres par type, visionneuse plein écran dont le fond descend en lames. */
SECTIONS.push({
  id: "realisations",
  init(ctx) {
    const { gsap, ScrollTrigger } = ctx;
    const sec = document.getElementById("s-realisations");
    if (!sec) return;
    const q = s => sec.querySelector(s), qa = s => [...sec.querySelectorAll(s)];
    const vp = q(".re-viewport"), strip = q(".re-strip"), head = q(".re-head");
    const originals = qa(".re-slide"), filters = qa(".re-filter");
    const countN = q(".re-count__n"), countT = q(".re-count__t"), countL = q(".re-count__label");
    const track = q(".re-progress"), thumb = q(".re-progress span");
    const LABEL = { lamelles: "Store à lamelles", volets: "Volet roulant", toiles: "Store toile", interieurs: "Store intérieur" };
    const LERP = ctx.reduced ? 1 : 0.085;          // part de l'écart rattrapée à chaque image (le lerp du #22)
    const DRIFT = ctx.reduced ? 0 : 30;            // dérive autonome, en px/s
    const IDLE = 7000;                             // la dérive reprend après 7 s sans interaction
    const wrap = (v, m) => ((v % m) + m) % m;
    const pad2 = n => String(n).padStart(2, "0");
    const CLOSED = "inset(0% 0% 100% 0%)", OPEN = "inset(0% 0% 0% 0%)";

    originals.forEach((li, i) => {
      li.dataset.idx = i;
      li.dataset.type = li.querySelector("img").dataset.img.split("-")[1];
    });
    vp.classList.add("is-live");

    let filter = "", list = [], nodes = [], M = 1, maxW = 0, anchor = 0, trackW = 0, thumbW = 0, shown = -1;
    let scroll = 0, target = 0, vel = 0, auto = !ctx.reduced, hover = false, idleT = 0, running = false, raf = 0, last = 0;
    let drag = null, dragged = false, lbOpen = false;

    const posAt = (n, s) => wrap(n.x0 - s + maxW, M) - maxW;
    const current = () => {
      let best = nodes[0], d = Infinity;
      for (const n of nodes) { const k = Math.abs(posAt(n, scroll) - anchor); if (k < d) { d = k; best = n; } }
      return best ? best.i : 0;
    };
    const inView = () => nodes.filter(n => n.x < innerWidth && n.x + n.w > 0).map(n => n.el.firstElementChild);

    const render = () => {
      for (const n of nodes) {
        const x = Math.round(posAt(n, scroll) * 10) / 10;
        if (x !== n.x) { n.x = x; n.el.style.transform = `translate3d(${x}px,0,0)`; }
      }
      const i = current();
      if (i !== shown) { shown = i; countN.textContent = pad2(i + 1); countL.textContent = LABEL[list[i].dataset.type]; }
      thumb.style.transform = `translateX(${(wrap(scroll + anchor, M) / M) * (trackW - thumbW)}px)`;
    };

    // hauteur de la bande : toute la section tient dans l'écran, sous la barre de navigation et au-dessus de la barre mobile
    const fit = () => {
      const cs = getComputedStyle(document.documentElement);
      const nav = parseFloat(cs.getPropertyValue("--nav-h")) || 0, bar = parseFloat(cs.getPropertyValue("--bar-h")) || 0;
      const chrome = sec.offsetHeight - vp.offsetHeight;
      const [lo, hi] = ctx.isMobile() ? [220, 380] : [300, 520];
      sec.style.setProperty("--re-h", Math.round(Math.min(hi, Math.max(lo, innerHeight - nav - bar - chrome))) + "px");
    };

    // place les photos du filtre en cours ; assez de copies pour qu'aucun vide n'apparaisse au bouclage
    const layout = keep => {
      const head0 = keep && nodes.length ? current() : 0;
      fit();
      const H = vp.clientHeight, gap = parseFloat(getComputedStyle(sec).getPropertyValue("--re-gap")) || 12;
      strip.querySelectorAll(".re-clone").forEach(n => n.remove());
      list = originals.filter(li => !filter || li.dataset.type === filter);
      originals.forEach(li => { li.hidden = !list.includes(li); });
      const ws = list.map(li => { const im = li.querySelector("img"); return Math.round(H * im.getAttribute("width") / im.getAttribute("height")); });
      const one = ws.reduce((s, w) => s + w + gap, 0);
      maxW = Math.max(...ws) + gap;
      const copies = Math.max(1, Math.ceil((innerWidth + 2 * maxW) / one));
      nodes = []; let x = 0;
      for (let c = 0; c < copies; c++) list.forEach((li, i) => {
        let el = li;
        if (c) {
          el = li.cloneNode(true);
          el.classList.add("re-clone"); el.setAttribute("aria-hidden", "true"); el.querySelector("button").tabIndex = -1;
          strip.appendChild(el);
        }
        el.style.width = ws[i] + "px";
        nodes.push({ el, i, x0: x, w: ws[i], x: NaN });
        x += ws[i] + gap;
      });
      M = x;
      anchor = head.getBoundingClientRect().left + parseFloat(getComputedStyle(head).paddingLeft);
      trackW = track.clientWidth;
      thumbW = Math.max(28, Math.min(1, innerWidth / M) * trackW);
      thumb.style.width = thumbW + "px";
      scroll = target = nodes[Math.min(head0, list.length - 1)].x0 - anchor;
      shown = -1; countT.textContent = pad2(list.length);
      render();
    };

    // ---------- boucle : dérive, lerp, rendu (en pause hors écran) ----------
    const tick = now => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(64, last ? now - last : 16.7); last = now;
      const want = auto && !hover && !drag && !lbOpen ? DRIFT : 0;
      vel += (want - vel) * Math.min(1, dt / 600);                 // la dérive démarre et s'arrête en douceur
      target += vel * dt / 1000;
      scroll += (target - scroll) * (1 - Math.pow(1 - LERP, dt / 16.7));
      if (Math.abs(target - scroll) < .05) scroll = target;
      render();
    };
    const play = () => { if (!running) { running = true; last = 0; raf = requestAnimationFrame(tick); } };
    const pause = () => { running = false; cancelAnimationFrame(raf); };

    // toute action arrête la dérive ; elle reprend après un moment d'inactivité
    const interact = () => {
      auto = false; clearTimeout(idleT);
      if (!ctx.reduced) idleT = setTimeout(() => { auto = true; }, IDLE);
    };

    // ---------- tirer à la souris ou au doigt (le défilement vertical de la page reste libre : touch-action pan-y) ----------
    vp.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") hover = true; });
    vp.addEventListener("pointerleave", () => { hover = false; });
    vp.addEventListener("dragstart", e => e.preventDefault());
    vp.addEventListener("pointerdown", e => {
      if (e.button !== 0 || lbOpen) return;
      drag = { id: e.pointerId, x0: e.clientX, x: e.clientX, t: e.timeStamp, v: 0, on: false };
    });
    vp.addEventListener("pointermove", e => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.on) {
        if (Math.abs(e.clientX - drag.x0) < 6) return;
        drag.on = true; drag.x = e.clientX; drag.t = e.timeStamp;
        vp.setPointerCapture(e.pointerId); vp.classList.add("is-drag"); interact();
      }
      const dx = e.clientX - drag.x, dt = Math.max(1, e.timeStamp - drag.t);
      target -= dx;
      drag.v = drag.v * .6 + (dx / dt) * .4;
      drag.x = e.clientX; drag.t = e.timeStamp;
    });
    const release = e => {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.on) {
        // lancer : l'élan du geste prolonge la cible, le lerp l'amortit
        if (e.type === "pointerup" && e.timeStamp - drag.t < 90) target -= Math.max(-4, Math.min(4, drag.v)) * 300;
        dragged = true; setTimeout(() => { dragged = false; }, 0);
        vp.classList.remove("is-drag"); interact();
      }
      drag = null;
    };
    vp.addEventListener("pointerup", release);
    vp.addEventListener("pointercancel", release);
    // pavé tactile : un balayage horizontal fait glisser la bande, la molette verticale continue de faire défiler la page
    vp.addEventListener("wheel", e => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault(); target += e.deltaX; interact();
    }, { passive: false });

    // ---------- flèches : la voisine de la photo de tête (celle du compteur) vient s'aligner sur la marge ----------
    // calcul sur la position visée et non affichée : plusieurs clics rapides avancent d'autant de photos
    const step = dir => {
      interact();
      let cur = 0, d = Infinity;
      nodes.forEach((n, k) => { const e = Math.abs(posAt(n, target) - anchor); if (e < d) { d = e; cur = k; } });
      const next = nodes[wrap(cur + dir, nodes.length)];
      target += wrap(posAt(next, target) - anchor + M / 2, M) - M / 2;   // par le plus court chemin dans la boucle
      if (!running) render();
    };
    qa(".re-arrow").forEach(b => b.addEventListener("click", () => step(+b.dataset.dir)));
    vp.addEventListener("keydown", e => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); step(e.key === "ArrowRight" ? 1 : -1); }
    });
    // au clavier, la photo qui reçoit le focus est amenée dans la bande visible
    strip.addEventListener("focusin", e => {
      const li = e.target.closest(".re-slide");
      if (!li || !e.target.matches(":focus-visible")) return;
      interact();
      const n = nodes.find(k => k.el === li), x = posAt(n, target);
      if (x < anchor - 1 || x + n.w > innerWidth - anchor + 1) target += x - anchor;
    });

    // ---------- filtres : les photos remontent comme un store, les nouvelles se déroulent ----------
    let ftl = null, wanted = "";
    const setFilter = f => {
      if (f === wanted) return;
      wanted = f;
      filters.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.filter === f)));
      interact();
      const swap = () => {
        ftl = null; filter = f; layout(false);
        gsap.set(qa(".re-open"), { clearProps: "clipPath" });
        if (ctx.reduced) return;
        ftl = gsap.fromTo(inView(), { clipPath: CLOSED }, { clipPath: OPEN, duration: .75, ease: "power3.out", stagger: .07, clearProps: "clipPath" });
      };
      if (ftl) ftl.kill();
      if (ctx.reduced) return swap();
      ftl = gsap.to(inView(), { clipPath: CLOSED, duration: .4, ease: "power2.in", stagger: .035, onComplete: swap });
    };
    filters.forEach(b => b.addEventListener("click", () => setFilter(b.dataset.filter)));

    // ---------- visionneuse ----------
    const lb = q(".re-lb"), fig = q(".re-lb__fig"), lbImg = q(".re-lb__img"), lbLabel = q(".re-lb__label"), lbN = q(".re-lb__n");
    const slats = qa(".re-lb__slats i"), ctrls = qa(".re-lb__btn"), closeBtn = q(".re-lb__close");
    let lbI = 0, lastFocus = null, lbTl = null;
    const fill = i => {
      lbI = wrap(i, list.length);
      const im = list[lbI].querySelector("img");
      lbImg.src = im.src; lbImg.alt = im.alt;
      lbLabel.textContent = LABEL[list[lbI].dataset.type];
      lbN.textContent = `${pad2(lbI + 1)} / ${pad2(list.length)}`;
    };
    const go = dir => {
      if (ctx.reduced) return fill(lbI + dir);
      gsap.killTweensOf(fig);
      gsap.to(fig, { x: -36 * dir, opacity: 0, duration: .18, ease: "power2.in", onComplete: () => {
        fill(lbI + dir);
        gsap.fromTo(fig, { x: 36 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: .45, ease: "power3.out" });
      } });
    };
    const onKey = e => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); go(e.key === "ArrowRight" ? 1 : -1); }
      else if (e.key === "Tab") {           // focus piégé dans la visionneuse
        e.preventDefault();
        const k = ctrls.indexOf(document.activeElement);
        ctrls[(k + (e.shiftKey ? -1 : 1) + ctrls.length) % ctrls.length].focus();
      }
    };
    const open = i => {
      if (lbOpen) return;
      lbOpen = true; auto = false; clearTimeout(idleT);
      lastFocus = document.activeElement;
      fill(i);
      lb.hidden = false;
      ctx.lenis.stop();
      document.addEventListener("keydown", onKey);
      closeBtn.focus({ preventScroll: true });
      if (ctx.reduced) return;
      if (lbTl) lbTl.kill();
      lbTl = gsap.timeline()
        .fromTo(slats, { scaleY: 0, transformOrigin: "50% 0%" }, { scaleY: 1, duration: .5, ease: "power3.inOut", stagger: .045 })
        .fromTo(fig, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: .55, ease: "power3.out" }, "-=.2")
        .fromTo(ctrls, { opacity: 0 }, { opacity: 1, duration: .4, ease: "power1.out" }, "<");
    };
    const close = () => {
      if (!lbOpen) return;
      lbOpen = false;
      document.removeEventListener("keydown", onKey);
      if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
      interact();
      const done = () => { lb.hidden = true; ctx.lenis.start(); gsap.set([fig, ...slats, ...ctrls], { clearProps: "all" }); };
      if (lbTl) lbTl.kill();
      if (ctx.reduced) return done();
      lbTl = gsap.timeline({ onComplete: done })
        .to([fig, ...ctrls], { opacity: 0, duration: .22, ease: "power2.in" })
        .to(slats, { scaleY: 0, transformOrigin: "50% 100%", duration: .45, ease: "power3.inOut", stagger: { each: .04, from: "end" } }, "-=.05");
    };
    strip.addEventListener("click", e => {
      const b = e.target.closest(".re-open");
      if (!b || dragged) return;
      open(list.indexOf(originals[+b.closest(".re-slide").dataset.idx]));
    });
    qa(".re-lb__nav").forEach(b => b.addEventListener("click", () => go(+b.dataset.dir)));
    closeBtn.addEventListener("click", close);
    // balayage dans la visionneuse ; un toucher hors de la photo la referme
    let sx = null;
    lb.addEventListener("pointerdown", e => { sx = e.target.closest("button") ? null : e.clientX; });
    lb.addEventListener("pointerup", e => {
      if (sx === null) return;
      const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      else if (e.target === lb || e.target.closest(".re-lb__slats")) close();
    });

    // ---------- mise en place ----------
    layout(false);
    let w0 = innerWidth;
    addEventListener("resize", () => { if (Math.abs(innerWidth - w0) > 40) { w0 = innerWidth; layout(true); } });
    ctx.whenVisible(sec, play, pause);

    if (!ctx.reduced) {
      // entrée : l'en-tête monte, les photos visibles se déroulent l'une après l'autre
      gsap.from([q(".re-intro"), q(".re-lede"), q(".re-filters"), q(".re-foot")], {
        y: 28, opacity: 0, duration: .9, ease: "power3.out", stagger: .1,
        scrollTrigger: { trigger: sec, start: "top 78%", once: true },
      });
      gsap.set(qa(".re-open"), { clipPath: CLOSED });
      ScrollTrigger.create({
        trigger: vp, start: "top 85%", once: true,
        onEnter: () => {
          const seen = inView();
          gsap.set(qa(".re-open").filter(b => !seen.includes(b)), { clearProps: "clipPath" });
          gsap.to(seen, { clipPath: OPEN, duration: 1, ease: "power3.inOut", stagger: .09, clearProps: "clipPath" });
        },
      });
    }
  },
});
