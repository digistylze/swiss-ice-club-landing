// ---------- Hero Animations #20 (Cinematic loader entrance) : deux bandes défilantes en sens contraire ----------
// Repris de la pièce : la bande d'encre s'ouvre depuis sa ligne médiane (clip-path, power4.inOut) pendant que chaque
// marquee glisse depuis un côté opposé (power3.inOut, ~2,5 s) ; ici elles ne s'effacent pas : elles enchaînent sur une
// dérive lente et continue (noms vers la droite, logos vers la gauche), en pause hors écran et au survol des logos.
SECTIONS.push({
  id: "partenaires",
  init(ctx) {
    const { gsap, ScrollTrigger } = ctx;
    const sec = document.getElementById("s-partenaires");
    if (!sec) return;
    if (ctx.reduced) { sec.classList.add("pa-static"); return; }
    const names = sec.querySelector(".pa-band--names");
    const bands = [
      { el: names, dir: 1, speed: 46 },
      { el: sec.querySelector(".pa-band--logos"), dir: -1, speed: 38 },
    ];

    // assez de copies pour couvrir deux largeurs d'écran ; la boucle parcourt exactement une série
    const build = b => {
      const track = b.el.querySelector(".pa-track");
      if (!b.set) b.set = [...track.children];
      track.replaceChildren(...b.set);
      const D = () => track.children[b.set.length].offsetLeft - track.children[0].offsetLeft;
      const one = () => b.set.forEach(n => { const c = n.cloneNode(true); c.setAttribute("aria-hidden", "true"); track.appendChild(c); });
      one();
      while (track.scrollWidth < Math.max(innerWidth, screen.width || 0) * 2 + D()) one();
      const d = D();
      b.loop?.kill();
      b.loop = gsap.fromTo(track, { x: b.dir > 0 ? -d : 0 }, { x: b.dir > 0 ? 0 : -d, duration: d / b.speed, ease: "none", repeat: -1, paused: !b.on });
    };
    bands.forEach(build);
    let w = innerWidth;
    addEventListener("resize", () => { if (Math.abs(innerWidth - w) > 40) { w = innerWidth; bands.forEach(build); } });

    ctx.whenVisible(sec,
      () => bands.forEach(b => { b.on = true; b.loop.play(); }),
      () => bands.forEach(b => { b.on = false; b.loop.pause(); }));

    // survol des logos : la bande ralentit jusqu'à l'arrêt, repart à la sortie
    const logos = bands[1];
    logos.el.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") gsap.to(logos.loop, { timeScale: 0, duration: .6, ease: "power2.out" }); });
    logos.el.addEventListener("pointerleave", () => gsap.to(logos.loop, { timeScale: 1, duration: .6, ease: "power2.in" }));

    // entrée de la pièce : la bande d'encre s'ouvre, les deux bandes arrivent par les côtés opposés
    const [mNames, mLogos] = bands.map(b => b.el.querySelector(".pa-move"));
    gsap.set(names, { clipPath: "inset(50% 0% 50% 0%)" });
    gsap.set(mNames, { x: () => -innerWidth });
    gsap.set(mLogos, { x: () => innerWidth, autoAlpha: .9 });
    ScrollTrigger.create({
      trigger: sec, start: "top 80%", once: true,
      onEnter: () => {
        gsap.to(names, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.6, ease: "power4.inOut" });
        gsap.to(mNames, { x: 0, duration: 2.6, ease: "power3.inOut" });
        gsap.to(mLogos, { x: 0, autoAlpha: 1, duration: 2.4, ease: "power3.inOut", delay: .15 });
      },
    });
    gsap.from(sec.querySelectorAll(".pa-title, .pa-line"), {
      y: 22, autoAlpha: 0, duration: 1, ease: "power2.out", stagger: .1,
      scrollTrigger: { trigger: sec, start: "top 80%", once: true },
    });
  },
});
