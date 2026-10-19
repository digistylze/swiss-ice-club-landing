/* Socle : images, Lenis + ScrollTrigger, initialisation des sections, ancres, ouverture du devis, barre mobile, fin d'intro. */
(() => {
  const IMG = window.IMG || {};
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mq = matchMedia("(max-width: 768px)");
  const plugins = [window.ScrollTrigger, window.SplitText, window.Flip, window.CustomEase, window.MorphSVGPlugin, window.ScrambleTextPlugin].filter(Boolean);
  gsap.registerPlugin(...plugins);

  // images : chaque data URI n'existe qu'une fois (window.IMG) ; le HTML les référence par clé
  document.querySelectorAll("img[data-img]").forEach(el => { if (IMG[el.dataset.img]) el.src = IMG[el.dataset.img]; });
  document.querySelectorAll("[data-bg]").forEach(el => { if (IMG[el.dataset.bg]) el.style.backgroundImage = `url("${IMG[el.dataset.bg]}")`; });

  // défilement doux unique pour toute la page
  const lenis = new Lenis({ duration: 1.1, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: !reduced });
  lenis.on("scroll", ScrollTrigger.update);
  // Lenis ne voit pas toujours les changements de hauteur (épinglages, FAQ qui s'ouvre) : sa limite de défilement restait
  // périmée et la fin de page devenait inaccessible à la molette. On la recale après chaque recalcul et à chaque changement de taille.
  ScrollTrigger.addEventListener("refresh", () => lenis.resize());
  new ResizeObserver(() => lenis.resize()).observe(document.body);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  // fin de l'intro (préchargement : la scène 3D du bain) : le hero appelle ctx.introDone() une fois le hero posé
  let introResolve;
  const intro = new Promise(r => (introResolve = r));

  const SIC = window.SIC = {
    gsap, ScrollTrigger, lenis, IMG, reduced, mq,
    THREE: window.THREE,
    isMobile: () => mq.matches,
    intro,
    introDone() { introResolve(); document.documentElement.classList.add("is-intro-done"); },
    // remplacée par la section réservation ; garde-fou si elle manque. offre : clé de l'expérience (decouverte, privee...)
    openBooking: offre => console.warn("réservation absente", offre),
    // pause/reprise d'une boucle coûteuse quand l'élément sort de l'écran
    whenVisible(el, on, off, margin = "100px") {
      const io = new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? on : off)()), { rootMargin: margin });
      io.observe(el); return io;
    },
  };

  // défilement au clavier bloqué tant que Lenis est arrêté (préchargement, menu, formulaire), sauf dans un champ ou un panneau
  const SCROLL_KEYS = new Set([" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End"]);
  addEventListener("keydown", e => {
    if (!lenis.isStopped || !SCROLL_KEYS.has(e.key)) return;
    const a = document.activeElement;
    if (!a || a === document.body || a === document.documentElement) e.preventDefault();
  });

  // ancres internes
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    const offset = id === "#top" ? 0 : -((document.querySelector("#s-nav .nav__bar, #s-nav")?.offsetHeight) || 72);   // juste sous la barre fixe
    // les sections animées changent de hauteur pendant le trajet : on recale jusqu'à 3 fois, après stabilisation
    const settle = n => setTimeout(() => {
      if (n > 0 && Math.abs(el.getBoundingClientRect().top + offset) > 8) lenis.scrollTo(el, { offset, duration: .6, onComplete: () => settle(n - 1) });
    }, 450);
    lenis.scrollTo(el, { offset, onComplete: () => settle(3) });
  });

  // tout élément [data-book] ouvre la réservation : data-book="<clé de l'expérience>" la présélectionne
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-book]");
    if (!b) return;
    e.preventDefault();
    SIC.openBooking(b.dataset.book || "");
  });

  // barre mobile : visible quand le bouton du hero est sorti de l'écran, cachée sur [data-hide-mbar] (CTA final, footer)
  const bar = document.querySelector("[data-mbar]");
  const heroCta = document.querySelector("[data-hero-cta]");
  const hiders = [...document.querySelectorAll("[data-hide-mbar]")];
  const state = { heroGone: false, hidden: new Set(), menu: false };
  const syncBar = () => {
    if (!bar) return;
    const on = mq.matches && state.heroGone && !state.hidden.size && !state.menu;
    bar.classList.toggle("is-on", on);
    bar.setAttribute("aria-hidden", on ? "false" : "true");
    bar.inert = !on;
    document.documentElement.style.setProperty("--bar-h", mq.matches ? bar.offsetHeight + "px" : "0px");
  };
  SIC.setMenuOpen = open => { state.menu = open; syncBar(); };
  if (bar) {
    if (heroCta) new IntersectionObserver(([e]) => { state.heroGone = !e.isIntersecting && e.boundingClientRect.top < 0; syncBar(); }).observe(heroCta);
    else state.heroGone = true;
    hiders.forEach(h => new IntersectionObserver(([e]) => { e.isIntersecting ? state.hidden.add(h) : state.hidden.delete(h); syncBar(); }, { threshold: .15 }).observe(h));
    mq.addEventListener("change", syncBar);
    syncBar();
  }

  // sections : init après les polices (les découpages SplitText en dépendent)
  const start = () => {
    for (const s of window.SECTIONS) {
      try { s.init(SIC); } catch (err) { console.error(`[section ${s.id}]`, err); }
    }
    ScrollTrigger.refresh();
    document.documentElement.classList.add("is-ready");
    // sans section hero (tests d'une section seule), l'intro est considérée comme terminée
    if (!document.querySelector("#s-hero")) SIC.introDone();
  };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
  let w = innerWidth;
  addEventListener("resize", () => { if (Math.abs(innerWidth - w) > 40) { w = innerWidth; ScrollTrigger.refresh(); } });
})();
