// ---------- Scroll Animation #71 (Sticky Cards) : quatre étapes, une pile de photos qui se défait au défilement ----------
// Desktop : la scène (bloc interne, pas un enfant flex) est épinglée ~2 écrans ; la carte du dessus s'envole en pivotant
// pendant que les suivantes avancent (mêmes courbes que le #71), et le texte de gauche passe à l'étape suivante.
// Mobile / tablette / mouvement réduit : étapes empilées, la photo se déroule comme un store au passage.
SECTIONS.push({
  id: "projet",
  init(ctx) {
    const { gsap } = ctx;
    const sec = document.getElementById("s-projet");
    if (!sec) return;
    const pin = sec.querySelector(".pj-pin");
    const steps = gsap.utils.toArray(".pj-step", sec);
    const cards = steps.map(s => s.querySelector(".pj-card"));
    const shades = steps.map(s => s.querySelector(".pj-card__shade"));
    const titles = steps.map(s => s.querySelector(".pj-step__t span"));
    const texts = steps.map(s => s.querySelector(".pj-step__p"));
    const index = gsap.utils.toArray(".pj-index li", sec);
    const T = cards.length - 1;            // transitions
    const mm = gsap.matchMedia();

    mm.add("(min-width: 1000px) and (min-height: 600px)", () => {
      if (ctx.reduced) return;              // mouvement réduit : la mise en page empilée reste
      sec.classList.add("is-deck");

      // réglages du #71 : décalage et réduction des cartes en attente, envol de la carte active
      const Y = 9, S = 0.13, ROT = 14, Z = 300, OUT = -250, DRIFT = 12;
      const inE = gsap.parseEase("power2.in"), backE = gsap.parseEase("back.out(1.6)");
      cards.forEach((c, i) => {
        c.style.zIndex = cards.length - i;
        gsap.set(c, { xPercent: -50, yPercent: -50 + i * Y, scale: 1 - i * S, transformPerspective: 1200 });
        gsap.set(shades[i], { opacity: Math.min(0.6, i * 0.28) });
      });

      // texte : la ligne du sommaire s'allume, le paragraphe de l'étape monte, les autres sortent (haut si passées, bas sinon)
      let cur = -1;
      const show = (i, instant) => {
        if (i === cur) return;
        cur = i;
        index.forEach((r, j) => r.classList.toggle("is-on", j === i));
        texts.forEach((t, j) => {
          const on = j === i;
          // l'ancien paragraphe sort en 0,2 s, le nouveau n'entre qu'ensuite : jamais deux textes superposés
          const v = on ? { opacity: 1, y: 0, duration: 0.6, delay: 0.2, ease: "power2.out" } : { opacity: 0, y: j < i ? -14 : 14, duration: 0.2, ease: "power1.in" };
          if (instant) v.duration = v.delay = 0;
          gsap.to(t, { ...v, overwrite: true });
        });
      };
      show(0, true);

      // q : progression des transitions (petite tenue au début et à la fin de l'épinglage)
      const place = p => {
        const q = gsap.utils.clamp(0, 1, (p - 0.04) / 0.86);
        const a = Math.min(Math.floor(q * T), T - 1);
        const s = q * T - a;
        cards.forEach((c, i) => {
          if (i < a) {
            gsap.set(c, { xPercent: -50 + DRIFT, yPercent: OUT, rotation: ROT, z: Z, scale: 1 });
            gsap.set(shades[i], { opacity: 0 });
          } else if (i === a) {
            const e = inE(s);
            gsap.set(c, { xPercent: -50 + DRIFT * e, yPercent: -50 + (OUT + 50) * e, rotation: ROT * e, z: Z * e, scale: 1 });
            gsap.set(shades[i], { opacity: 0 });
          } else {
            const b = i - a - backE(gsap.utils.clamp(0, 1, (s - 0.3) / 0.7));
            gsap.set(c, { xPercent: -50, yPercent: -50 + b * Y, rotation: 0, z: 0, scale: 1 - b * S });
            gsap.set(shades[i], { opacity: Math.min(0.6, Math.max(0, b) * 0.28) });
          }
        });
        show(Math.min(T, Math.floor(q * T + 0.5)));   // l'étape change à mi-envol de la carte
      };

      const st = { p: 0 };
      gsap.to(st, {
        p: 1, ease: "none",
        onUpdate: () => place(st.p),
        scrollTrigger: { trigger: pin, pin: true, start: "top top", end: () => "+=" + Math.round(innerHeight * 2), scrub: 0.8, invalidateOnRefresh: true },
      });

      return () => {
        sec.classList.remove("is-deck");
        gsap.killTweensOf(texts);
        gsap.set([...cards, ...shades, ...texts], { clearProps: "all" });
        cards.forEach(c => (c.style.zIndex = ""));
        index.forEach(r => r.classList.remove("is-on"));
      };
    });

    // empilé : chaque photo se déroule du haut vers le bas, comme un store qui descend, puis le texte suit
    mm.add("(max-width: 999px), (max-height: 599px)", () => {
      if (ctx.reduced) return;
      steps.forEach((s, i) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: s, start: "top 86%", once: true } });
        tl.fromTo(cards[i], { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "power3.inOut" })
          .fromTo(cards[i].querySelector("img"), { scale: 1.14 }, { scale: 1, duration: 1.4, ease: "power3.out" }, 0)
          .fromTo([titles[i], texts[i]], { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: "power2.out" }, 0.45);
      });
    });

    // engagements : les lignes se posent l'une après l'autre (créés après l'épinglage, positions à jour)
    if (!ctx.reduced) {
      const li = gsap.utils.toArray(".pj-promises li", sec);
      gsap.fromTo(li, { opacity: 0, y: 16 }, {
        opacity: 1, y: 0, duration: 0.7, stagger: 0.09, ease: "power2.out",
        scrollTrigger: { trigger: sec.querySelector(".pj-promises"), start: "top 92%", once: true },
      });
    }
  },
});
