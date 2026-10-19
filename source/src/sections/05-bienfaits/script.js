/* Bienfaits : porté de Text Animations #15 (Block reveal, composant Copy). Mécanique d'origine : SplitText en lignes,
   chaque ligne glissée dans un enveloppant avec un bloc de couleur ; le bloc s'étire depuis la gauche (scaleX 0 -> 1,
   power4.inOut), la ligne apparaît dessous, puis le bloc se retire vers la droite ; lignes décalées de 0,15 s.
   Adapté : bloc rouge pour le titre, encre pour les raisons, givre sur la cuve vue du dessus ; chaque raison se révèle
   à son arrivée à l'écran (décalée par colonne) ; découpage annulé une fois joué (le texte se recompose au resize). */
SECTIONS.push({
  id: "bienfaits",
  init(ctx) {
    const root = document.getElementById("s-bienfaits");
    if (!root || ctx.reduced || !window.SplitText) return; // le CSS pose déjà l'état final
    const { gsap, ScrollTrigger } = ctx;
    const css = getComputedStyle(root);
    const C = { red: css.getPropertyValue("--red"), ink: css.getPropertyValue("--ink"), soft: css.getPropertyValue("--ink-soft"), frost: css.getPropertyValue("--frost") };
    const D = .75, STAGGER = .15; // valeurs du composant d'origine

    const block = (parent, color) => {
      const b = document.createElement("span");
      b.className = "bf-blk"; b.style.background = color;
      parent.appendChild(b);
      return b;
    };
    // une ligne : le bloc couvre, la ligne apparaît, le bloc se retire de l'autre côté
    const wipe = (b, target) => gsap.timeline()
      .to(b, { scaleX: 1, duration: D, ease: "power4.inOut" })
      .set(target, { opacity: 1 })
      .set(b, { transformOrigin: "right center" })
      .to(b, { scaleX: 0, duration: D, ease: "power4.inOut" });

    // texte découpé en lignes ; refait au resize tant qu'il n'a pas été joué
    const texts = [];
    const prepare = (el, color) => {
      const t = { el, color, split: null, lines: [], blocks: [], played: false };
      t.build = () => {
        t.split = new SplitText(el, { type: "lines", tag: "span", linesClass: "bf-line" });
        t.lines = t.split.lines;
        t.blocks = t.lines.map(line => {
          const w = document.createElement("span");
          w.className = "bf-lw";
          line.parentNode.insertBefore(w, line);
          w.appendChild(line);
          return block(w, color);
        });
        gsap.set(t.lines, { opacity: 0, whiteSpace: "nowrap" });
      };
      t.play = (tl, at) => {
        t.played = true;
        t.lines.forEach((line, i) => tl.add(wipe(t.blocks[i], line), at + i * STAGGER));
        return at + (t.lines.length - 1) * STAGGER;
      };
      t.build();
      texts.push(t);
      return t;
    };
    const done = list => () => list.forEach(t => t.split.revert());

    // titre : bloc rouge
    const title = prepare(root.querySelector(".bf__title"), C.red);
    const disc = root.querySelector(".bf__water"), discImg = disc.querySelector("img");
    const discBlock = block(disc, C.frost);
    gsap.set(discImg, { opacity: 0 });
    ScrollTrigger.create({
      trigger: root.querySelector(".bf__head"), start: "top 82%", once: true,
      onEnter: () => {
        const tl = gsap.timeline({ onComplete: done([title]) });
        title.play(tl, 0);
        tl.add(wipe(discBlock, discImg), .25);
      },
    });
    // l'eau tourne très lentement, seulement à l'écran
    const spin = gsap.to(discImg, { rotation: 360, duration: 140, ease: "none", repeat: -1, paused: true });
    ctx.whenVisible(disc, () => spin.play(), () => spin.pause());

    // raisons : filet qui se trace, titre (bloc encre), phrase (bloc gris) ; décalage par colonne
    const list = root.querySelector(".bf__list");
    const items = [...list.querySelectorAll(".bf__item")].map(li => ({
      li, rule: li.querySelector(".bf__rule"), h: prepare(li.querySelector("h3"), C.ink), p: prepare(li.querySelector("p"), C.soft),
    }));
    gsap.set(items.map(it => it.rule), { scaleX: 0 });
    const cols = () => getComputedStyle(list).gridTemplateColumns.split(" ").length;
    items.forEach((it, i) => ScrollTrigger.create({
      trigger: it.li, start: "top 88%", once: true,
      onEnter: () => {
        const tl = gsap.timeline({ delay: (i % cols()) * .14, onComplete: done([it.h, it.p]) });
        tl.to(it.rule, { scaleX: 1, duration: 1.1, ease: "power3.inOut" }, 0);
        const end = it.h.play(tl, .15);
        it.p.play(tl, end + .2);
      },
    }));

    // note de précaution et bouton
    const note = prepare(root.querySelector(".bf__note"), C.soft);
    const cta = root.querySelector(".bf__cta");
    gsap.set(cta, { autoAlpha: 0, y: 16 });
    ScrollTrigger.create({
      trigger: root.querySelector(".bf__foot"), start: "top 92%", once: true,
      onEnter: () => {
        const tl = gsap.timeline({ onComplete: done([note]) });
        note.play(tl, 0);
        tl.to(cta, { autoAlpha: 1, y: 0, duration: .9, ease: "power2.out" }, .3);
      },
    });

    // largeur changée avant la révélation : on redécoupe ce qui n'a pas encore été joué
    let w = root.clientWidth;
    new ResizeObserver(() => {
      if (Math.abs(root.clientWidth - w) < 2) return;
      w = root.clientWidth;
      texts.filter(t => !t.played).forEach(t => { t.split.revert(); t.build(); });
    }).observe(root);
  },
});
