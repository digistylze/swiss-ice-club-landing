/* Scroll Animation #29. Mécanisme du catalogue : timeline scrubée de la section, pile d'images épinglée ; pour chaque image,
   clip-path inset(0) -> inset(0 0 100%) et object-position 0 -> 60 % pendant que la suivante passe à 40 %, et le fond change.
   Adapté : épinglage du bloc interne centré sur la hauteur utile (sous la barre), quatre teintes chaudes, rien sur mobile
   (les photos sont dans le texte). */
SECTIONS.push({
  id: "services",
  init(ctx) {
    const { gsap, ScrollTrigger } = ctx;
    const sec = document.getElementById("s-services");
    if (!sec || ctx.reduced) return;
    const arch = sec.querySelector(".arch"), pin = sec.querySelector(".arch__pin");
    const imgs = [...sec.querySelectorAll(".arch__img img")];
    const wraps = [...sec.querySelectorAll(".arch__img")];
    const bg = ["#F1EEEA", "#F3ECE6", "#EFEAE6", "#F4E9E2"];

    ScrollTrigger.matchMedia({
      "(min-width: 769px)": () => {
        gsap.set(wraps, { clipPath: "inset(0% 0% 0% 0%)" });
        gsap.set(imgs, { objectPosition: "50% 0%" });
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: arch, start: () => `top ${76 + 32}px`, end: () => `bottom ${innerHeight - 32}px`,
            pin, pinSpacing: false, scrub: true, invalidateOnRefresh: true,
          },
        });
        wraps.forEach((w, i) => {
          const next = imgs[i + 1];
          if (!next) return;
          tl.to(sec, { backgroundColor: bg[i + 1], duration: 1.5, ease: "power2.inOut" }, i * 1.5)
            .to(w, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.5, ease: "none" }, i * 1.5)
            .to(imgs[i], { objectPosition: "50% 60%", duration: 1.5, ease: "none" }, i * 1.5)
            .to(next, { objectPosition: "50% 40%", duration: 1.5, ease: "none" }, i * 1.5);
        });
        return () => gsap.set([sec, ...wraps, ...imgs], { clearProps: "all" });
      },
    });
  },
});
