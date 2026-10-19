/* Fondateur : porté de Scroll Animation #71 (Sticky Cards). Mécanique d'origine : cartes empilées (xPercent -50,
   yPercent -50 + i × 10, scale 1 - i × 0,15) ; la carte de devant part vers le haut en pivotant (rotation 20°,
   z 350, power2.in), les suivantes avancent d'un cran avec un léger rebond (back.out(2), départ décalé à 30 %).
   Adapté : piloté par le temps et non par un épinglage de 8 écrans (lecture automatique quand la section est à
   l'écran, en pause au survol, hors écran ou au bouton) ; la carte partie s'efface et revient au fond, en boucle.
   La barre de la photo courante sert de minuterie. Clic sur la pile : photo suivante. */
SECTIONS.push({
  id: "fondateur",
  init(ctx) {
    const root = document.getElementById("s-fondateur");
    if (!root) return;
    const { gsap, ScrollTrigger } = ctx;
    const stack = root.querySelector(".fd__stack");
    const cards = [...stack.querySelectorAll(".fd__card")];
    const ticks = root.querySelector(".fd__ticks");
    const fills = [...ticks.querySelectorAll("b")];
    const n = cards.length;
    const STEP = 10, SCALE = .15, DIM = .28, HOLD = 3.6; // décalage, échelle (valeurs d'origine), assombrissement, pause
    const order = cards.map((_, i) => i);               // order[0] = carte de devant

    const slot = k => ({ x: 0, y: 0, xPercent: -50, yPercent: -50 + k * STEP, scale: 1 - k * SCALE, rotation: 0, z: 0, "--dim": k * DIM });
    order.forEach((c, k) => gsap.set(cards[c], { ...slot(k), zIndex: n - k }));
    if (ctx.reduced) { ticks.hidden = true; return; } // pile posée, immobile

    let busy = false, started = false, visible = false, hover = false, paused = false, prog = null;
    const sync = () => prog && prog.paused(!(started && visible && !hover && !paused));

    // minuterie : la barre de la carte de devant se remplit, puis la carte part
    const arm = () => {
      const c = order[0];
      fills.forEach((f, i) => gsap.set(f, { scaleX: i < c ? 1 : 0 }));
      prog = gsap.fromTo(fills[c], { scaleX: 0 }, { scaleX: 1, duration: HOLD, ease: "none", onComplete: next });
      sync();
    };

    function next() {
      if (busy || !started) return;
      busy = true;
      prog && prog.kill();
      const front = cards[order[0]], rest = order.slice(1).map(c => cards[c]);
      const exitY = ctx.isMobile() ? -120 : -150;
      gsap.set(front, { zIndex: n + 1 });
      rest.forEach((card, k) => gsap.set(card, { zIndex: n - k }));
      gsap.timeline({ onComplete: () => { order.push(order.shift()); busy = false; arm(); } })
        // la carte de devant s'envole en pivotant vers le spectateur, et s'efface avant de quitter la section
        .to(front, { yPercent: exitY, rotation: 20, z: 350, duration: 1, ease: "power2.in" }, 0)
        .to(front, { autoAlpha: 0, duration: .5, ease: "power1.in" }, .5)
        // les suivantes avancent d'un cran (départ décalé, léger rebond)
        .to(rest, { yPercent: i => -50 + i * STEP, scale: i => 1 - i * SCALE, "--dim": i => i * DIM, duration: .9, ease: "back.out(2)", stagger: .04 }, .3)
        // puis elle revient au fond de la pile
        .set(front, { ...slot(n - 1), zIndex: 1 }, 1)
        .to(front, { autoAlpha: 1, duration: .6, ease: "power2.out" }, 1);
    }

    // entrée : la pile se forme depuis le bas, de la dernière carte à la première, puis la lecture démarre
    gsap.set(cards, { autoAlpha: 0 });
    ScrollTrigger.create({
      trigger: stack, start: "top 78%", once: true,
      onEnter: () => {
        gsap.timeline({ onComplete: () => { started = true; arm(); } })
          .fromTo([...cards].reverse(), { yPercent: i => -50 + (n - 1 - i) * STEP + 22, autoAlpha: 0 },
            { yPercent: i => -50 + (n - 1 - i) * STEP, autoAlpha: 1, duration: 1.1, ease: "power3.out", stagger: .12 });
      },
    });

    stack.addEventListener("click", () => next());
    stack.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") { hover = true; sync(); } });
    stack.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") { hover = false; sync(); } });
    ticks.addEventListener("click", () => {
      paused = !paused;
      ticks.setAttribute("aria-pressed", String(paused));
      sync();
    });
    ctx.whenVisible(stack, () => { visible = true; sync(); }, () => { visible = false; sync(); }, "0px");

    // texte : montée douce à l'arrivée
    [[".fd__head", ".fd__head > *"], [".fd__body", ".fd__body > *"], [".fd__water", ".fd__water-copy > *, .fd__figs li"]].forEach(([t, els]) => {
      gsap.from(root.querySelectorAll(els), {
        y: 24, autoAlpha: 0, duration: 1.1, ease: "power2.out", stagger: .09,
        scrollTrigger: { trigger: root.querySelector(t), start: "top 86%", once: true },
      });
    });
  },
});
