/* Manifeste : porté de Scroll Animation #17 (Image Expansion Typography). Les pastilles passent de l'état fermé à
   l'état ouvert au défilement (scrub), l'image gardant sa taille d'ouverture (révélation depuis le centre) ; la dernière
   s'ouvre ensuite en grand cadre (effet 3 du catalogue). Largeurs en em : le resize se recale tout seul.
   Mobile : le cadre ne descend plus depuis la pastille (pendant le trajet, il laissait un grand vide sous le titre) :
   la dernière pastille s'ouvre comme les autres et le cadre se dévoile sur place, depuis son centre. */
SECTIONS.push({
  id: "manifeste",
  init(ctx) {
    const root = document.querySelector("#s-manifeste");
    if (!root || ctx.reduced) return; // le CSS pose déjà l'état final
    const { gsap } = ctx;
    const pills = [...root.querySelectorAll(".mf__pill")];
    const last = pills[pills.length - 1];
    const frame = root.querySelector(".mf__frame");
    const open = root.querySelector(".mf__open");
    const text = root.querySelector(".mf__text");

    const num = (el, v) => parseFloat(getComputedStyle(el).getPropertyValue(v));
    const shut = el => num(el, "--h") + "em";                    // fermée : un disque
    const wide = el => num(el, "--w") * num(el, "--k") + "em";   // ouverte

    // une pastille s'élargit pendant que sa ligne monte dans l'écran
    const grow = p => gsap.fromTo(p, { width: () => shut(p) }, {
      width: () => wide(p), ease: "sine.inOut",
      scrollTrigger: { trigger: p.parentElement, start: "top 92%", end: "top 52%", scrub: 1, invalidateOnRefresh: true },
    });
    pills.slice(0, -1).forEach(grow);
    const mm = gsap.matchMedia();

    mm.add("(min-width: 769px)", () => {
      // départ du grand cadre : la dernière pastille ouverte, mesurée par rapport au cadre
      const from = () => {
        const keep = last.style.width;
        last.style.width = wide(last);
        const p = last.getBoundingClientRect(), f = frame.getBoundingClientRect();
        last.style.width = keep;
        return { x: p.left - f.left, y: p.top - f.top, w: p.width, h: p.height };
      };
      // la pastille s'ouvre, puis le cadre en part : d'abord vers le bas (il quitte la ligne sans couvrir le texte),
      // ensuite vers la gauche jusqu'à la pleine largeur
      const tl = gsap.timeline({
        scrollTrigger: { trigger: last.parentElement, start: "top 92%", endTrigger: frame, end: "top 22%", scrub: 1, invalidateOnRefresh: true },
      });
      tl.fromTo(last, { width: () => shut(last) }, { width: () => wide(last), ease: "sine.inOut", duration: 1 })
        // le cadre n'apparaît qu'une fois la pastille ouverte (même image, même cadrage : passage sans saut)
        .fromTo(open, { autoAlpha: 0 }, { autoAlpha: 1, duration: .02, ease: "none" }, .98)
        .fromTo(open,
          { y: () => from().y, height: () => from().h, borderRadius: () => from().h / 2 },
          { y: 0, height: () => frame.clientHeight, borderRadius: () => num(root, "--r"), ease: "power2.inOut", duration: 2.4 }, 1)
        .fromTo(open,
          { x: () => from().x, width: () => from().w },
          { x: 0, width: () => frame.clientWidth, ease: "power2.inOut", duration: 1.6 }, 2);
    });

    mm.add("(max-width: 768px)", () => {
      grow(last);
      const st = { trigger: frame, start: "top 95%", end: "top 40%", scrub: 1 };
      gsap.fromTo(open, { clipPath: "inset(16% 22% 16% 22%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "power2.inOut", scrollTrigger: st });
      gsap.fromTo(open.querySelector("img"), { scale: 1.22 }, { scale: 1, ease: "power2.inOut", scrollTrigger: { ...st } });
    });

    // puis le texte de présentation
    gsap.from(text.children, {
      y: 26, autoAlpha: 0, duration: 1.2, ease: "power2.out", stagger: .12,
      scrollTrigger: { trigger: text, start: "top 88%", once: true },
    });
  },
});
