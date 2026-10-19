// ---------- Scroll Animation #40 : le lit étoilé se coupe en trois cartes qui se retournent sur les formules ----------
SECTIONS.push({
  id: "formules",
  init(ctx) {
    const { gsap, ScrollTrigger } = ctx;
    const sec = document.getElementById("s-formules");
    if (!sec) return;
    const stage = sec.querySelector(".fm-stage");
    const head = sec.querySelector(".fm-head");
    const cont = sec.querySelector(".fm-cards");
    const cards = gsap.utils.toArray(".fm-card", sec);
    const outer = [cards[0], cards[2]];
    const R = 10, GAP = 28, TILT = [-6, 6];
    const mm = gsap.matchMedia();

    // desktop : scène épinglée (0,9 écran), la photo rétrécit, le titre monte, la photo se fend en trois, les cartes se retournent
    mm.add("(min-width: 1000px)", () => {
      // taille des cartes d'après le texte réel (retour : sur un écran bas, titres coupés en haut des cartes). On part du
      // format portrait 4/7 ; si le texte n'y tient pas, les cartes s'élargissent puis deviennent moins hautes, et seulement
      // en dernier recours le texte rétrécit (--fit) puis le grand numéro s'efface (.fm-tight). Repris de DS-Stores.
      const backs = cards.map(c => c.querySelector(".fm-card__back"));
      const gut = () => parseFloat(getComputedStyle(stage).paddingLeft) * 2;
      const avail = () => innerHeight - 84 - head.offsetHeight - 110;
      const cw = W => (W - 2 * GAP) / 3;                     // largeur d'une carte une fois la photo fendue
      const need = wc => Math.max(...backs.map(b => {        // hauteur naturelle du dos le plus haut à cette largeur
        const c = b.cloneNode(true);
        c.style.cssText = `position:absolute;left:-9999px;top:0;width:${wc}px;height:auto;transform:none;visibility:hidden`;
        b.parentNode.appendChild(c);
        const h = c.offsetHeight; c.remove(); return h;
      }));
      let W1 = 0, AR = 4 / 7;
      const size = () => {
        sec.classList.remove("fm-tight"); sec.style.setProperty("--fit", 1);
        const A = Math.max(240, avail());
        let W = Math.min(innerWidth - gut(), Math.max(innerWidth * 0.62, 820), A * 12 / 7, 1100);
        let h = need(cw(W));
        if (h > cw(W) * 1.75) { W = Math.min(innerWidth - gut(), 1160); h = need(cw(W)); }
        if (h > A) {
          sec.style.setProperty("--fit", Math.max(0.74, A / h).toFixed(3)); h = need(cw(W));
          if (h > A) { sec.classList.add("fm-tight"); h = need(cw(W)); }
        }
        const H = Math.max(Math.min(cw(W) * 1.75, A), h);     // portrait si la place le permet, jamais moins que le texte
        W1 = W; AR = cw(W) / H;
        cont.style.setProperty("--ar", AR);
      };
      size();
      ScrollTrigger.addEventListener("refreshInit", size);
      const w1 = () => W1;
      const w0 = () => Math.max(W1, Math.min(innerWidth - gut(), Math.max(innerWidth * 0.76, 900), (avail() + 50) * 3 * AR, 1300));
      if (ctx.reduced) {
        gsap.set(cont, { columnGap: GAP, width: w1() });
        gsap.set(cards, { borderRadius: R, rotationY: 180 });
        gsap.set(outer, { y: 30, rotationZ: i => TILT[i] });
        return;
      }
      let split = false, flipped = false;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: stage, pin: true, start: "top top", end: () => "+=" + innerHeight * 0.9, scrub: 1, invalidateOnRefresh: true,
          onUpdate: self => {
            const p = self.progress;
            if (p >= 0.3 && !split) {
              gsap.to(cont, { columnGap: GAP, duration: 0.5, ease: "power3.out" });
              gsap.to(cards, { borderRadius: R, duration: 0.5, ease: "power3.out" });
              split = true;
            } else if (p < 0.3 && split) {
              gsap.to(cont, { columnGap: 0, duration: 0.5, ease: "power3.out" });
              gsap.to(cards[0], { borderRadius: `${R}px 0px 0px ${R}px`, duration: 0.5, ease: "power3.out" });
              gsap.to(cards[1], { borderRadius: 0, duration: 0.5, ease: "power3.out" });
              gsap.to(cards[2], { borderRadius: `0px ${R}px ${R}px 0px`, duration: 0.5, ease: "power3.out" });
              split = false;
            }
            if (p >= 0.55 && !flipped) {
              gsap.to(cards, { rotationY: 180, duration: 0.75, ease: "power3.inOut", stagger: 0.1 });
              gsap.to(outer, { y: 30, rotationZ: i => TILT[i], duration: 0.75, ease: "power3.inOut" });
              flipped = true;
            } else if (p < 0.55 && flipped) {
              gsap.to(cards, { rotationY: 0, duration: 0.75, ease: "power3.inOut", stagger: -0.1 });
              gsap.to(outer, { y: 0, rotationZ: 0, duration: 0.75, ease: "power3.inOut" });
              flipped = false;
            }
          },
        },
      });
      tl.fromTo(cont, { width: w0 }, { width: w1, duration: 0.25, ease: "none" }, 0)
        .fromTo(head, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.14, ease: "none" }, 0.08)
        .set({}, {}, 1);
      // les bascules sont créées après coup (hors contexte) : on les nettoie à la main au changement de média
      return () => {
        ScrollTrigger.removeEventListener("refreshInit", size); sec.classList.remove("fm-tight"); sec.style.removeProperty("--fit");
        gsap.killTweensOf([cont, ...cards]); gsap.set([cont, head, ...cards], { clearProps: "all" });
      };
    });

    // mobile / tablette : slider horizontal (défilement natif aimanté) ; les cartes se retournent en cascade à l'arrivée,
    // les tirets suivent la carte affichée et y mènent
    mm.add("(max-width: 999px)", () => {
      const dots = gsap.utils.toArray(".fm-dots button", sec), ac = new AbortController();
      const step = () => cards[1].offsetLeft - cards[0].offsetLeft;
      const mark = () => {
        const i = Math.min(cards.length - 1, Math.round(cont.scrollLeft / step()));
        dots.forEach((d, k) => (k === i ? d.setAttribute("aria-current", "true") : d.removeAttribute("aria-current")));
      };
      cont.addEventListener("scroll", mark, { passive: true, signal: ac.signal });
      dots.forEach((d, i) => d.addEventListener("click", () => cont.scrollTo({ left: i * step(), behavior: ctx.reduced ? "auto" : "smooth" }), { signal: ac.signal }));
      if (ctx.reduced) gsap.set(cards, { rotationY: 180 });
      else gsap.to(cards, {
        rotationY: 180, duration: 0.9, ease: "power3.inOut", stagger: 0.12,
        scrollTrigger: { trigger: cont, start: "top 70%", toggleActions: "play none none reverse" },
      });
      return () => { ac.abort(); cont.scrollLeft = 0; };
    });

    // compteurs : créés après l'épinglage pour que leurs positions tiennent compte de l'espace qu'il ajoute
    sec.querySelectorAll("[data-count]").forEach(el => {
      if (ctx.reduced) return;
      const to = +el.dataset.count, dec = +(el.dataset.dec || 0), o = { v: +(el.dataset.from || 0) };
      const show = v => (el.textContent = v.toFixed(dec).replace(".", ","));
      show(o.v);
      gsap.to(o, {
        v: to, duration: 1.8, ease: "power2.out",
        onUpdate: () => show(o.v),
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });
  },
});
