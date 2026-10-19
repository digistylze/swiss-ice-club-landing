// ---------- Scroll Animation #40 : la photo des bains se coupe en trois cartes qui se retournent sur les trois expériences ----------
SECTIONS.push({
  id: "offres",
  init(ctx) {
    const { gsap, ScrollTrigger } = ctx;
    const sec = document.getElementById("s-offres");
    if (!sec) return;
    const stage = sec.querySelector(".of-stage");
    const head = sec.querySelector(".of-head");
    const cont = sec.querySelector(".of-cards");
    const cards = gsap.utils.toArray(".of-card", sec);
    const outer = [cards[0], cards[2]];
    const GAP = 28, TILT = [-4, 4];
    const mm = gsap.matchMedia();

    // desktop : scène épinglée (0,9 écran), la photo rétrécit, la photo se fend en trois, les cartes se retournent
    mm.add("(min-width: 1000px)", () => {
      // taille des cartes d'après le texte réel : format portrait 2/3 au départ ; si le texte n'y tient pas, les cartes
      // s'élargissent jusqu'à toute la largeur utile et deviennent moins hautes, et seulement en dernier recours le texte
      // rétrécit (--fit) puis le prix passe à la taille du titre (of-tight). Jamais de carte plus basse que son texte.
      const backs = cards.map(c => c.querySelector(".of-card__back"));
      const pad = () => { const s = getComputedStyle(stage); return { x: parseFloat(s.paddingLeft) * 2, top: parseFloat(s.paddingTop), gap: parseFloat(s.rowGap) || 36 }; };
      const avail = () => { const p = pad(); return innerHeight - p.top - p.gap - head.offsetHeight - 76; };   // 76 : bas de scène + cartes inclinées
      const cw = W => (W - 2 * GAP) / 3;                     // largeur d'une carte une fois la photo fendue
      const need = wc => Math.max(...backs.map(b => {        // hauteur naturelle du dos le plus haut à cette largeur
        const c = b.cloneNode(true);
        c.style.cssText = `position:absolute;left:-9999px;top:0;width:${wc}px;height:auto;transform:none;visibility:hidden`;
        b.parentNode.appendChild(c);                         // même carte : mêmes règles CSS (couleurs de la 2e carte)
        const h = c.offsetHeight; c.remove(); return h;
      }));
      let W1 = 0, AR = 2 / 3;
      const size = () => {
        sec.classList.remove("of-tight"); sec.style.setProperty("--fit", 1);
        const A = Math.max(220, avail()), MAXW = Math.min(innerWidth - pad().x, 1180);
        let W = Math.min(MAXW, Math.max(innerWidth * 0.62, 860), A * 2);
        let h = need(cw(W));
        if (h > cw(W) * 1.5) { W = MAXW; h = need(cw(W)); }
        if (h > A) {
          sec.style.setProperty("--fit", Math.max(0.78, A / h).toFixed(3)); h = need(cw(W));
          if (h > A) { sec.classList.add("of-tight"); h = need(cw(W)); }
        }
        const H = Math.max(Math.min(cw(W) * 1.5, A), h);      // portrait si la place le permet, jamais moins que le texte
        W1 = W; AR = cw(W) / H;
        cont.style.setProperty("--ar", AR);
      };
      size();
      ScrollTrigger.addEventListener("refreshInit", size);
      const w1 = () => W1;
      const w0 = () => Math.max(W1, Math.min(innerWidth - pad().x, Math.max(innerWidth * 0.76, 960), (avail() + 40) * 3 * AR, 1320));
      if (ctx.reduced) {
        gsap.set(cont, { columnGap: GAP, width: w1() });
        gsap.set(cards, { rotationY: 180 });
        gsap.set(outer, { y: 24, rotationZ: i => TILT[i] });
        return () => { ScrollTrigger.removeEventListener("refreshInit", size); gsap.set([cont, ...cards], { clearProps: "all" }); };
      }
      let split = false, flipped = false;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: stage, pin: true, start: "top top", end: () => "+=" + innerHeight * 0.9, scrub: 1, invalidateOnRefresh: true,
          onUpdate: self => {
            const p = self.progress;
            if (p >= 0.3 !== split) {
              split = !split;
              gsap.to(cont, { columnGap: split ? GAP : 0, duration: 0.5, ease: "power3.out" });
            }
            if (p >= 0.55 !== flipped) {
              flipped = !flipped;
              gsap.to(cards, { rotationY: flipped ? 180 : 0, duration: 0.75, ease: "power3.inOut", stagger: flipped ? 0.1 : -0.1 });
              gsap.to(outer, { y: flipped ? 24 : 0, rotationZ: i => (flipped ? TILT[i] : 0), duration: 0.75, ease: "power3.inOut" });
            }
          },
        },
      });
      tl.fromTo(cont, { width: w0 }, { width: w1, duration: 0.25, ease: "none" }, 0).set({}, {}, 1);
      // le titre monte dès l'arrivée de la section (pas de bande vide au-dessus de la photo au début de l'épinglage)
      gsap.fromTo(head, { y: 40, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: stage, start: "top 75%", toggleActions: "play none none reverse" },
      });
      // les bascules sont créées après coup (hors contexte) : on les nettoie à la main au changement de média
      return () => {
        ScrollTrigger.removeEventListener("refreshInit", size); sec.classList.remove("of-tight"); sec.style.removeProperty("--fit");
        gsap.killTweensOf([cont, ...cards]); gsap.set([cont, head, ...cards], { clearProps: "all" });
      };
    });

    // mobile / tablette : cartes en colonne, chacune se retourne quand elle passe aux deux tiers de l'écran
    mm.add("(max-width: 999px)", () => {
      if (ctx.reduced) { gsap.set(cards, { rotationY: 180 }); return; }
      cards.forEach(c => gsap.to(c, {
        rotationY: 180, duration: 0.9, ease: "power3.inOut",
        scrollTrigger: { trigger: c, start: "center 62%", toggleActions: "play none none reverse" },
      }));
    });

    // bande : les lignes de formules entrent une à une
    if (!ctx.reduced) {
      gsap.from(sec.querySelectorAll(".of-band__intro, .of-list li"), {
        y: 18, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.05,
        scrollTrigger: { trigger: sec.querySelector(".of-band"), start: "top 82%", once: true },
      });
    }
  },
});
