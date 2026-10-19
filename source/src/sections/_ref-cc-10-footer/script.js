// ---------- Scroll Animation #66 : le pied de page se découvre sous la section précédente ----------
SECTIONS.push({
  id: "footer",
  init(ctx) {
    const ft = document.getElementById("s-footer");
    if (!ft || ctx.reduced) return;
    // le contenu part 35 % plus haut (masqué par overflow) et rejoint sa place quand le bas du pied de page touche l'écran.
    // Pas sur mobile : le pied de page y est plus haut que l'écran, son bouton restait à moitié caché sous la section
    // précédente pendant presque tout le défilement, et le toucher tombait sur elle
    ctx.gsap.matchMedia().add("(min-width: 769px)", () => {
      ctx.gsap.fromTo(ft.querySelector(".ft__inner"), { yPercent: -35 }, {
        yPercent: 0, ease: "none",
        scrollTrigger: { trigger: ft, start: "top bottom", end: "bottom bottom", scrub: true },
      });
    });
  },
});
