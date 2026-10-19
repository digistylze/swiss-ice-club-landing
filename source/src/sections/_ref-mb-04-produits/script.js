/* Grid Animations #6 (add-to-cart). Mécanisme du catalogue : au clic, les autres produits passent à scale .8 / opacité .05, le produit
   choisi grossit (1,05) ; sa pile de photos descend (ou monte) de 1,5 hauteur à 40 %, puis file vers le bouton panier en rétrécissant
   jusqu'à 0, décalage 0,04 s depuis la fin ; à 0,6 s l'article rejoint le panier (compteur élastique), puis tout revient.
   Adapté : le « panier » est la demande de devis (pastille « Mon devis » ou barre mobile), le bouton passe à « Ajouté (n) ». */
SECTIONS.push({
  id: "produits",
  init(ctx) {
    const { gsap } = ctx;
    const sec = document.getElementById("s-produits");
    if (!sec) return;
    const items = [...sec.querySelectorAll(".pr__item")];
    let busy = false;

    // cible visible : pastille (desktop), bouton de la barre mobile, sinon bouton de la barre de navigation
    const target = () => {
      const cands = [document.querySelector(".devis-fab"), document.querySelector("[data-mbar] .btn"), document.querySelector("#s-nav .nav__devis")];
      for (const el of cands) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width && r.bottom > 0 && r.top < innerHeight && getComputedStyle(el).visibility !== "hidden") return r;
      }
      return { left: innerWidth - 120, right: innerWidth - 24, top: innerHeight - 80, bottom: innerHeight - 24, width: 96, height: 56 };
    };

    items.forEach((item, i) => {
      const btn = item.querySelector(".pr__cta");
      btn.addEventListener("click", () => {
        const qty = ctx.addToSelection(item.dataset.id, item.dataset.name);
        btn.classList.add("is-added");
        btn.textContent = `Ajouté au devis (${qty})`;
        if (busy || ctx.reduced) return;
        busy = true;

        const others = items.filter(x => x !== item);
        const gallery = item.querySelector(".pr__gallery");
        const pics = [...gallery.children];
        const cols = getComputedStyle(sec.querySelector(".pr__list")).gridTemplateColumns.split(" ").length;
        const top = i < cols && innerWidth > 768;
        gsap.set(gallery, { autoAlpha: 1 });
        gsap.set(pics, { transformOrigin: top ? "top right" : "bottom left" });
        const r = pics[0].getBoundingClientRect(), t = target();

        gsap.timeline({
          onComplete: () => { gsap.set(pics, { clearProps: "all" }); gsap.set(gallery, { autoAlpha: 0 }); busy = false; },
        })
          .to(others, { scale: .8, autoAlpha: .05, duration: .6, stagger: .04, ease: "power2.out" }, 0)
          .to(item, { scale: 1.05, duration: 1, ease: "power2.out" }, .7)
          .to(pics, {
            keyframes: {
              "40%": { y: top ? r.height * 1.2 : -r.height * 1.2, scale: top ? .8 : .5, autoAlpha: 1 },
              "100%": { x: t.left + t.width / 2 - (r.left + r.width / 2), y: t.top + t.height / 2 - (r.top + r.height / 2), scale: 0, autoAlpha: 0 },
            },
            stagger: { from: "end", each: .04 }, duration: 1.8, ease: "power2.inOut",
          }, 0)
          .add(() => ctx.bumpSelection && ctx.bumpSelection(), 1.7)
          .to([item, ...others], { scale: 1, autoAlpha: 1, duration: .8, stagger: .03, ease: "power2.out" }, 1.6);
      });
    });

    // la sélection a été vidée depuis le formulaire : les boutons reviennent à l'état de départ
    addEventListener("selection-change", () => items.forEach(item => {
      const b = item.querySelector(".pr__cta"), q = ctx.selection.get(item.dataset.id)?.qty || 0;
      b.classList.toggle("is-added", q > 0);
      b.textContent = q ? `Ajouté au devis (${q})` : "Ajouter au devis";
    }));
  },
});
