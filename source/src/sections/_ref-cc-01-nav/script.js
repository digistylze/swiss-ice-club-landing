/* Navigation Menus #3 « Curved Menu » : une timeline jouée pour ouvrir, inversée pour fermer. Le panneau glisse depuis la droite
   pendant que son bord gauche (tracé SVG) passe de bombé à droit ; les liens arrivent en décalé ; un point miel marque le lien
   survolé, sinon celui de la section à l'écran. */
SECTIONS.push({
  id: "nav",
  init(ctx) {
    const { gsap, lenis } = ctx;
    const root = document.getElementById("s-nav");
    if (!root) return;
    const burger = root.querySelector(".nav__burger");
    const menu = root.querySelector(".nav__menu");
    const veil = root.querySelector(".nav__veil");
    const curve = root.querySelector(".nav__curve path");
    const info = root.querySelector(".nav__info");
    const links = [...root.querySelectorAll(".nav__link")];
    const BOW = 80;   // creux maximal du bord (px) ; 100 dans le catalogue
    let open = false, tl = null;

    // la barre descend une fois le préchargement terminé
    ctx.intro.then(() => root.classList.add("is-in"));

    // bord gauche : le SVG fait 100 px de large, seule la zone entre x = 100 et la courbe est visible
    const path = bow => {
      const h = menu.offsetHeight;
      return `M100 0 L200 0 L200 ${h} L100 ${h} Q${100 - 2 * bow} ${h / 2} 100 0`;
    };
    // construite à l'ouverture (hauteur et largeur du moment), inversée à la fermeture
    const build = () => gsap.timeline({
      paused: true,
      defaults: { duration: .7, ease: "power3.inOut" },
      onReverseComplete: () => gsap.set(menu, { visibility: "hidden" }),
    })
      .fromTo(menu, { x: menu.offsetWidth + 110 }, { x: 0 }, 0)
      .fromTo(curve, { attr: { d: path(BOW) } }, { attr: { d: path(0) }, duration: .85 }, 0)
      .fromTo(veil, { autoAlpha: 0 }, { autoAlpha: 1, duration: .5, ease: "power1.out" }, 0)
      .fromTo(links, { x: 70, opacity: 0 }, { x: 0, opacity: 1, stagger: .04 }, .05)
      .fromTo(info, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .5, ease: "power2.out" }, .4);

    // section à l'écran : la dernière dont le haut a passé le tiers de l'écran
    const markCurrent = () => {
      links.forEach(a => a.removeAttribute("aria-current"));
      const cur = links.filter(a => { const t = document.querySelector(a.hash); return t && t.getBoundingClientRect().top < innerHeight * .4; }).pop();
      if (cur) cur.setAttribute("aria-current", "location");
    };

    function openMenu() {
      if (open) return;
      open = true;
      markCurrent();
      root.classList.add("is-open");
      burger.setAttribute("aria-expanded", "true");
      ctx.setMenuOpen(true);
      lenis.stop();
      if (!tl || tl.progress() === 0) { tl && tl.kill(); tl = build(); }   // une fermeture en cours repart simplement en avant
      gsap.set(menu, { visibility: "visible" });
      tl.timeScale(ctx.reduced ? 20 : 1).play();
    }

    function closeMenu() {
      if (!open) return;
      open = false;
      root.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      ctx.setMenuOpen(false);
      lenis.start();
      if (menu.contains(document.activeElement)) burger.focus({ preventScroll: true });
      tl.timeScale(ctx.reduced ? 20 : 1.3).reverse();
    }

    burger.addEventListener("click", () => (open ? closeMenu() : openMenu()));
    veil.addEventListener("click", closeMenu);
    // ancre ou bouton de devis (panneau ou barre) : le menu se ferme d'abord, puis le socle défile ou ouvre le formulaire
    root.addEventListener("click", e => { if (e.target.closest('a[href^="#"], [data-devis]')) closeMenu(); });

    // Échap ferme ; Tab tourne entre « Fermer » et le panneau
    document.addEventListener("keydown", e => {
      if (!open) return;
      if (e.key === "Escape") { e.preventDefault(); closeMenu(); return; }
      if (e.key !== "Tab") return;
      const f = [burger, ...menu.querySelectorAll("a, button")];
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey ? i <= 0 : i === -1 || i === f.length - 1) {
        e.preventDefault();
        (e.shiftKey ? f[f.length - 1] : f[0]).focus();
      }
    });

    // redimensionnement menu ouvert : la courbe et le décalage dépendent de la taille du panneau
    addEventListener("resize", () => {
      if (open && tl && tl.progress() === 1) { tl.kill(); tl = build(); tl.progress(1); }
    });
  },
});
