// ---------- Scroll Animation #70 : FAQ en bulles de discussion ----------
// Chaque <details> arrive au passage : la question naît en pastille « … » puis s'étire, le <details> s'ouvre
// (attribut open) et la réponse fait de même après un temps de frappe. Clavier : les <summary> restent natifs.
SECTIONS.push({
  id: "faq",
  init(ctx) {
    const { gsap, ScrollTrigger } = ctx;
    const root = document.getElementById("s-faq");
    if (!root) return;
    const items = [...root.querySelectorAll(".faq__item")].map(d => ({
      d,
      rows: [...d.querySelectorAll(".faq__row")],
      msgs: [...d.querySelectorAll(".faq__msg")],
      dots: [...d.querySelectorAll(".faq__dots")],
      copy: [...d.querySelectorAll(".faq__copy")],
      played: false, busy: false, st: null, m: [],
    }));

    if (ctx.reduced) { items.forEach(it => { it.d.open = true; }); return; }
    root.classList.add("is-anim");

    const D = 56; // diamètre de la pastille « … »
    const finish = it => {
      it.d.classList.add("is-done");
      gsap.set(it.msgs, { clearProps: "all" });
      gsap.set(it.copy, { opacity: 1 });
      it.rows.forEach(r => (r.style.minHeight = ""));
      it.d.style.minHeight = "";
      it.busy = false;
    };

    // mesure la taille finale des bulles (details ouvert un instant), réserve la place, puis replie en pastille
    const measure = it => {
      if (it.played) return;
      gsap.set(it.msgs, { clearProps: "all" });
      it.rows.forEach(r => (r.style.minHeight = ""));
      it.d.style.minHeight = "";
      it.d.open = true;
      it.m = it.msgs.map((el, i) => {
        // largeur arrondie au pixel supérieur : offsetWidth arrondit à l'inférieur et le texte passerait à la ligne
        const cs = getComputedStyle(el), box = el.getBoundingClientRect();
        const m = { w: Math.ceil(box.width), h: Math.ceil(box.height), px: cs.paddingLeft, py: cs.paddingTop, r: cs.borderTopLeftRadius };
        it.rows[i].style.minHeight = `${m.h}px`;
        return m;
      });
      it.d.style.minHeight = `${it.d.offsetHeight}px`;
      it.d.open = false;
      gsap.set(it.msgs, { width: D, height: D, borderRadius: D / 2, padding: 0, scale: 0 });
    };

    // une bulle : apparition, « … » pendant `typing` s, étirement en largeur puis en hauteur, texte
    const bubble = (tl, it, i, typing) => {
      const el = it.msgs[i], m = it.m[i];
      tl.to(el, { scale: 1, duration: 0.3, ease: "power2.out" })
        .to(it.dots[i], { autoAlpha: 0, duration: 0.2 }, `+=${typing}`)
        .to(el, { width: m.w, borderRadius: m.r, paddingLeft: m.px, paddingRight: m.px, duration: 0.4, ease: "power3.inOut" })
        .to(el, { height: m.h, paddingTop: m.py, paddingBottom: m.py, duration: 0.4, ease: "power3.inOut" }, "-=0.2")
        .to(it.copy[i], { opacity: 1, duration: 0.3 }, "-=0.25");
    };

    const play = it => {
      if (it.played) return;
      it.played = it.busy = true;
      const tl = gsap.timeline({ onComplete: () => finish(it) });
      bubble(tl, it, 0, 0.05);
      tl.add(() => { it.d.open = true; }, "+=0.05");
      bubble(tl, it, 1, 0.35);
    };

    gsap.set(items.flatMap(it => it.copy), { opacity: 0 });
    items.forEach(it => {
      measure(it);
      it.st = ScrollTrigger.create({ trigger: it.d, start: ctx.isMobile() ? "top 94%" : "top 90%", once: true, onEnter: () => play(it) });
      it.d.addEventListener("toggle", () => {
        if (!it.played) {
          // ouvert au clavier (ou par la recherche du navigateur) avant son tour : état final direct
          if (it.d.open) { it.played = true; it.st && it.st.kill(); finish(it); ScrollTrigger.refresh(); }
          return;
        }
        if (!it.busy) ScrollTrigger.refresh(); // ouvert/fermé par le visiteur : la suite de la page bouge
      });
    });
    // largeur changée : les bulles pas encore jouées sont remesurées avant chaque recalcul
    ScrollTrigger.addEventListener("refreshInit", () => items.forEach(measure));
  },
});
