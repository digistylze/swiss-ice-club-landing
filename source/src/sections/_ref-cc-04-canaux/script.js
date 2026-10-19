// ---------- Scroll Animation #29 : la photo collée à droite se découpe vers la suivante quand le canal suivant arrive ----------
// Adapté : le fond de la section prend la teinte du canal (data-tone), le nom du canal change dans la pastille de la photo.
// Mobile : accordéon (un canal ouvert à la fois), la photo du canal ouvert se découpe à l'ouverture, le fond prend sa lumière.
SECTIONS.push({
  id: "canaux",
  init(ctx) {
    const { gsap } = ctx;
    const sec = document.querySelector("#s-canaux");
    if (!sec) return;
    const items = [...sec.querySelectorAll(".cx__item")];
    const tones = items.map(it => it.dataset.tone);
    const names = items.map(it => it.querySelector(".cx__name").textContent.replace(/^La structure en /, ""));
    const wraps = [...sec.querySelectorAll(".cx__img")];
    const imgs = wraps.map(w => w.querySelector("img"));
    const tag = sec.querySelector(".cx__tag span");
    const FULL = "inset(0% 0% 0% 0%)", GONE = "inset(0% 0% 100% 0%)";
    // reduced motion : la photo change d'un coup quand le canal suivant est centré, sans glissement
    const ease = ctx.reduced ? "steps(1)" : "none";
    wraps.forEach((w, i) => (w.style.zIndex = wraps.length - i)); // la première photo au-dessus
    const mm = gsap.matchMedia();

    let shown = 0;
    const setTag = i => {
      if (i === shown) return;
      const dir = i > shown ? 1 : -1;
      shown = i;
      if (ctx.reduced) { tag.textContent = names[i]; return; }
      gsap.timeline()
        .to(tag, { yPercent: -110 * dir, duration: .25, ease: "power2.in" })
        .add(() => { tag.textContent = names[i]; })
        .fromTo(tag, { yPercent: 110 * dir }, { yPercent: 0, duration: .45, ease: "power3.out" });
    };

    // desktop : une découpe par canal, du centre d'un bloc au centre du suivant ; le fond suit la lumière du canal
    mm.add("(min-width: 900px)", () => {
      gsap.set(wraps, { clipPath: FULL });
      gsap.set(imgs, { objectPosition: "50% 0%" });
      sec.style.backgroundColor = tones[0];
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: items[0], start: "center center", endTrigger: items[items.length - 1], end: "center center", scrub: true,
          onUpdate: self => setTag(Math.round(self.progress * (items.length - 1))),
        },
      });
      wraps.forEach((w, i) => {
        if (!wraps[i + 1]) return;
        tl.add(gsap.timeline()
          .to(sec, { backgroundColor: tones[i + 1], duration: 1.5, ease: ctx.reduced ? ease : "power2.inOut" }, 0)
          .to(w, { clipPath: GONE, duration: 1.5, ease }, 0)
          .to(imgs[i], { objectPosition: "50% 60%", duration: 1.5, ease }, 0)
          .to(imgs[i + 1], { objectPosition: "50% 40%", duration: 1.5, ease }, 0));
      });
      return () => { sec.style.backgroundColor = ""; };
    });

    // mobile : accordéon. Le titre devient un bouton ici (sur desktop les canaux restent de simples titres)
    mm.add("(max-width: 899px)", () => {
      const heads = items.map(it => it.querySelector("h3"));
      const bodies = items.map((it, i) => Object.assign(it.querySelector(".cx__body"), { id: `cx-b${i}` }));
      const btns = heads.map((h, i) => {
        const b = document.createElement("button"), ico = document.createElement("span");
        b.type = "button"; b.className = "cx__toggle"; b.setAttribute("aria-controls", bodies[i].id);
        ico.className = "cx__ico"; ico.setAttribute("aria-hidden", "true");
        b.append(...h.childNodes, ico); h.append(b);
        return b;
      });
      let open = -1;
      const set = (i, anim) => {
        open = i;
        items.forEach((it, k) => {
          const on = k === i;
          it.classList.toggle("is-open", on);
          btns[k].setAttribute("aria-expanded", on);
          bodies[k].inert = !on;
          gsap.to(bodies[k], { height: on ? "auto" : 0, duration: anim ? .6 : 0, ease: "power3.inOut", overwrite: true });
        });
        if (i >= 0) {
          gsap.to(sec, { backgroundColor: tones[i], duration: anim ? .8 : 0, overwrite: true });
          if (anim) gsap.fromTo(bodies[i].querySelector("img"), { clipPath: GONE, objectPosition: "50% 70%" },
            { clipPath: FULL, objectPosition: "50% 35%", duration: 1.1, ease: "power3.out", delay: .1 });
        }
        // la page a changé de hauteur ; si le volet du dessus s'est refermé, le titre ouvert est remis en vue
        gsap.delayedCall(anim ? .65 : 0, () => {
          ctx.ScrollTrigger.refresh();
          if (anim && i >= 0 && items[i].getBoundingClientRect().top < 64) ctx.lenis.scrollTo(items[i], { offset: -72, duration: .6 });
        });
      };
      gsap.set(bodies, { overflow: "hidden" });
      set(0, false);
      btns.forEach((b, i) => b.addEventListener("click", () => set(open === i ? -1 : i, !ctx.reduced)));
      return () => {
        btns.forEach((b, i) => { b.lastChild.remove(); heads[i].append(...b.childNodes); b.remove(); });
        items.forEach(it => it.classList.remove("is-open"));
        bodies.forEach(b => { b.inert = false; });
        gsap.set(bodies, { clearProps: "height,overflow" });
        sec.style.backgroundColor = "";
      };
    });
  },
});
