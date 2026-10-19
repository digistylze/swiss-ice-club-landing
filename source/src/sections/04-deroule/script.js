/* Scroll Animation #29. Mécanisme de la pièce : pile d'images épinglée à côté de la colonne de texte ; pour chaque image,
   clip-path inset(0) -> inset(0 0 100%) et object-position 0 -> 60 % pendant que la suivante passe à 40 %, et le fond
   change. Adapté : épinglage du bloc interne sous la barre, une bascule scrubée par passage d'étape (calée sur le texte),
   épinglage court (≈ 0,55 écran par étape), quatre
   noirs à peine teintés (neutre, chaud du sauna, froid du bain, neutre), un fil rouge qui se remplit et l'étape lue en
   pleine opacité. Sur mobile (et en mouvement réduit) : pas d'épinglage, chaque étape porte sa photo. */
SECTIONS.push({
  id: "deroule",
  init(ctx) {
    const { gsap, ScrollTrigger } = ctx;
    const sec = document.getElementById("s-deroule");
    if (!sec) return;
    const left = sec.querySelector(".dr-left"), arch = sec.querySelector(".dr-arch"), pin = sec.querySelector(".dr-pin");
    const steps = [...sec.querySelectorAll(".dr-step")];
    const wraps = [...sec.querySelectorAll(".dr-img")];
    const imgs = wraps.map(w => w.querySelector("img"));
    const count = sec.querySelector(".dr-count__n");
    const bg = ["#0C0D0F", "#13100E", "#0A0E12", "#0D0F10"];
    const setStep = i => { steps.forEach((s, k) => s.classList.toggle("is-on", k === i)); count.textContent = "0" + (i + 1); };

    if (ctx.reduced) { sec.classList.add("dr-static"); left.style.setProperty("--rail", 1); steps.forEach(s => s.classList.add("is-on")); return; }

    // le fil se remplit sur toute la hauteur des étapes (mobile et desktop)
    gsap.fromTo(left, { "--rail": 0 }, {
      "--rail": 1, ease: "none",
      scrollTrigger: { trigger: left, start: "top 55%", end: "bottom 55%", scrub: true },
    });
    // étape lue : celle qui traverse le milieu de l'écran
    steps.forEach((s, i) => ScrollTrigger.create({
      trigger: s, start: "top 55%", end: "bottom 55%",
      onToggle: self => { if (self.isActive) setStep(i); },
    }));
    setStep(0);

    ScrollTrigger.matchMedia({
      "(min-width: 769px)": () => {
        sec.classList.add("dr-live");
        gsap.set(wraps, { clipPath: "inset(0% 0% 0% 0%)" });
        gsap.set(imgs, { objectPosition: "50% 0%" });
        ScrollTrigger.create({
          trigger: arch, start: () => `top ${76 + 32}px`, end: () => `bottom ${innerHeight - 32}px`,
          pin, pinSpacing: false, invalidateOnRefresh: true,
        });
        // une bascule par passage d'étape (au lieu d'une seule timeline répartie à parts égales) : la photo change pendant
        // que le texte change, quelle que soit la hauteur de l'écran. Valeurs de départ explicites : les plages ne se
        // chevauchent pas, mais une arrivée par ancre au milieu de la section doit retomber juste.
        const imm = { immediateRender: false, ease: "none" };
        wraps.forEach((w, i) => {
          const next = imgs[i + 1];
          if (!next) return;
          gsap.timeline({ scrollTrigger: { trigger: steps[i + 1], start: "top 75%", end: "top 38%", scrub: true } })
            .fromTo(sec, { backgroundColor: bg[i] }, { ...imm, backgroundColor: bg[i + 1], ease: "power2.inOut" }, 0)
            .fromTo(w, { clipPath: "inset(0% 0% 0% 0%)" }, { ...imm, clipPath: "inset(0% 0% 100% 0%)" }, 0)
            .fromTo(imgs[i], { objectPosition: i ? "50% 40%" : "50% 0%" }, { ...imm, objectPosition: "50% 60%" }, 0)
            .fromTo(next, { objectPosition: "50% 0%" }, { ...imm, objectPosition: "50% 40%" }, 0);
        });
        return () => { sec.classList.remove("dr-live"); gsap.set([sec, ...wraps, ...imgs], { clearProps: "all" }); };
      },
    });

    // en-tête et pied : entrée simple
    [".dr-head", ".dr-foot"].forEach(s => gsap.from(sec.querySelectorAll(s + " > *"), {
      y: 26, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.08,
      scrollTrigger: { trigger: sec.querySelector(s), start: "top 97%", once: true },
    }));
  },
});
