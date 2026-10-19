// ---------- Scroll Animation #40 : la photo de la terrasse se coupe en trois cartes qui se retournent sur les services ----------
SECTIONS.push({
  id: "services",
  init(ctx) {
    const { gsap, ScrollTrigger } = ctx;
    const sec = document.getElementById("s-services");
    if (!sec) return;
    const stage = sec.querySelector(".sv-stage");
    const head = sec.querySelector(".sv-head");
    const cont = sec.querySelector(".sv-cards");
    const cards = gsap.utils.toArray(".sv-card", sec);
    const outer = [cards[0], cards[2]];
    const R = 3, GAP = 28, TILT = [-5, 5];
    const mm = gsap.matchMedia();

    // desktop : scène épinglée (0,9 écran), la photo rétrécit, le titre monte, la photo se fend en trois, les cartes se retournent
    mm.add("(min-width: 1000px)", () => {
      // taille des cartes d'après le texte réel (retour : sur un portable bas, le texte débordait des cartes). On part du
      // format portrait 2/3 ; si le texte n'y tient pas, les cartes s'élargissent jusqu'à toute la largeur utile et
      // deviennent moins hautes, et seulement en dernier recours le texte rétrécit (--fit) puis le grand numéro s'efface.
      const backs = cards.map(c => c.querySelector(".sv-card__back"));
      const gut = () => parseFloat(getComputedStyle(stage).paddingLeft) * 2;
      const avail = () => innerHeight - 84 - head.offsetHeight - 100;
      const cw = W => (W - 2 * GAP) / 3;                     // largeur d'une carte une fois la photo fendue
      const need = wc => Math.max(...backs.map(b => {        // hauteur naturelle du dos le plus haut à cette largeur
        const c = b.cloneNode(true);
        c.style.cssText = `position:absolute;left:-9999px;top:0;width:${wc}px;height:auto;transform:none;visibility:hidden`;
        b.parentNode.appendChild(c);                         // même carte : mêmes règles CSS (couleurs de la 2e carte)
        const h = c.offsetHeight; c.remove(); return h;
      }));
      let W1 = 0, AR = 2 / 3;
      const size = () => {
        sec.classList.remove("sv-tight"); sec.style.setProperty("--fit", 1);
        const A = Math.max(220, avail());
        let W = Math.min(innerWidth - gut(), Math.max(innerWidth * 0.65, 860), A * 2, 1160);
        let h = need(cw(W));
        if (h > cw(W) * 1.5) { W = Math.min(innerWidth - gut(), 1160); h = need(cw(W)); }
        if (h > A) {
          sec.style.setProperty("--fit", Math.max(0.74, A / h).toFixed(3)); h = need(cw(W));
          if (h > A) { sec.classList.add("sv-tight"); h = need(cw(W)); }
        }
        const H = Math.max(Math.min(cw(W) * 1.5, A), h);      // portrait si la place le permet, jamais moins que le texte
        W1 = W; AR = cw(W) / H;
        cont.style.setProperty("--ar", AR);
      };
      size();
      ScrollTrigger.addEventListener("refreshInit", size);
      const w1 = () => W1;
      const w0 = () => Math.max(W1, Math.min(innerWidth - gut(), Math.max(innerWidth * 0.76, 960), (avail() + 50) * 3 * AR, 1320));
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
      tl.fromTo(cont, { width: w0 }, { width: w1, duration: 0.25, ease: "none" }, 0).set({}, {}, 1);
      // le titre monte dès l'arrivée de la section (pas de bande vide au-dessus de la photo au début de l'épinglage)
      gsap.fromTo(head, { y: 40, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: stage, start: "top 75%", toggleActions: "play none none reverse" },
      });
      // les bascules sont créées après coup (hors contexte) : on les nettoie à la main au changement de média
      return () => {
        ScrollTrigger.removeEventListener("refreshInit", size); sec.classList.remove("sv-tight"); sec.style.removeProperty("--fit");
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
  },
});
