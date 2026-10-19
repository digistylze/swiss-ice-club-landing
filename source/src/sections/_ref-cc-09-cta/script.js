// ---------- Scroll Animation #69 : « NUIT » apparaît, le I bascule et devient le bouton ----------
SECTIONS.push({
  id: "cta",
  init(ctx) {
    const { gsap, ScrollTrigger } = ctx;
    const sec = document.getElementById("s-cta");
    if (!sec) return;
    const stage = sec.querySelector(".cta__stage");
    const btn = sec.querySelector(".cta__btn");
    const svg = stage.querySelector(".cta__word");
    const lines = [...svg.querySelectorAll(".cta__line")];
    const letters = lines.map(l => [...l.querySelectorAll(".cta__l")]);
    const iPath = svg.querySelector(".cta__i");
    const vb = svg.viewBox.baseVal;
    const NS = "http://www.w3.org/2000/svg";

    // le I sort du masque de sa ligne (sinon il serait coupé en basculant) : on le révèle à part, par opacité
    const g = document.createElementNS(NS, "g");
    svg.appendChild(g);
    g.appendChild(iPath);
    const bb = iPath.getBBox();
    const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
    gsap.set(g, { svgOrigin: `${cx} ${cy}` }); // une seule fois : GSAP compense x/y à chaque changement d'origine

    // libellé écrit en travers du I (il se lit à l'horizontale une fois le I couché)
    const TXT = "DEMANDER UNE ÉTUDE";
    const label = document.createElementNS(NS, "text");
    label.setAttribute("class", "cta__lbl");
    label.setAttribute("aria-hidden", "true");
    g.appendChild(label);
    let fs = bb.width * 0.46;
    label.style.fontSize = `${fs}px`;
    label.textContent = TXT;
    const len = label.getComputedTextLength();
    if (len > bb.height * 0.8) { fs *= (bb.height * 0.8) / len; label.style.fontSize = `${fs}px`; }
    label.textContent = "";
    label.setAttribute("x", cx);
    label.setAttribute("y", cy + fs * 0.36);               // centrage optique : capitales de Manrope = 0,72 em
    label.setAttribute("transform", `rotate(-90 ${cx} ${cy})`);

    // ScrambleText ne se rejoue pas à l'envers proprement (il laissait des lettres au hasard, « DEMANDER PBLRWTK ») :
    // à l'apparition on brouille vers le texte exact, à la disparition on efface net
    const scramble = window.ScrambleTextPlugin && !ctx.reduced;
    let reveal = null;
    const css = getComputedStyle(sec);
    const mix = gsap.utils.interpolate(css.getPropertyValue("--ink").trim(), css.getPropertyValue("--cembro-deep").trim());
    // mobile : le bouton couché doit rester lisible (≥ 44 px de haut)
    const tune = () => (ctx.isMobile() ? { scale: 2.6, gap: 0.08 } : { scale: 1.45, gap: 0.08 });
    let T = tune(), travel = 0, st = null, shown = false;

    // bascule du I : couché, recentré sous le nom, terra
    const pose = p => {
      gsap.set(g, { rotation: 90 * p, x: p * (vb.x + vb.width / 2 - cx), y: p * travel, scale: 1 + (T.scale - 1) * p });
      iPath.style.fill = p >= 1 ? "" : mix(p);
    };
    const showLabel = on => {
      if (on === shown) return;
      shown = on;
      btn.classList.toggle("is-on", on);
      g.classList.toggle("is-on", on);
      if (reveal) { reveal.kill(); reveal = null; }
      if (!on) { label.textContent = ""; return; }
      if (!scramble) { label.textContent = TXT; return; }
      label.textContent = "";
      reveal = gsap.to(label, { duration: 0.7, scrambleText: { text: TXT, chars: "upperCase", revealDelay: 0.1, speed: 0.5 }, onComplete: () => { label.textContent = TXT; } });
    };
    // bouton HTML (clavier, lecteurs d'écran) calé sur la position FINALE du I, calculée et non mesurée : la mesure du I
    // après pose() ne tenait pas compte de son déplacement horizontal, le bouton tombait plusieurs centaines de px à gauche.
    // Le I couché est centré sur la scène, descendu de `travel`, mis à l'échelle T.scale, largeur et hauteur échangées.
    const placeBtn = () => {
      const k = svg.getBoundingClientRect().width / vb.width;          // px par unité du viewBox
      const w = bb.height * T.scale * k, h = bb.width * T.scale * k;
      const x = vb.width / 2 * k, y = (cy + travel - vb.y) * k;
      Object.assign(btn.style, { left: `${x - w / 2}px`, top: `${y - h / 2}px`, width: `${w}px`, height: `${h}px` });
      return y + h / 2;
    };
    // le I dessiné est lui-même cliquable (c'est lui que l'on voit) : il déclenche le vrai bouton, qui ouvre le formulaire
    g.addEventListener("click", () => { if (shown) btn.click(); });
    const render = p => { pose(p); showLabel(p > 0.92); };

    // bouton HTML calé sur la position finale du I ; la scène s'arrête juste sous lui (pas de grand vide)
    const layout = () => {
      T = tune();
      travel = vb.y + vb.height - cy + vb.height * T.gap + (bb.width / 2) * T.scale;
      stage.style.height = `${Math.ceil(placeBtn() + 24)}px`;
      pose(ctx.reduced ? 1 : st ? st.progress : 0);
    };
    layout();
    ScrollTrigger.addEventListener("refreshInit", layout);

    if (ctx.reduced) { render(1); return; }

    // 1) le mot apparaît : lettres qui montent dans leur ligne, une fois, à l'entrée
    letters.forEach(ls => gsap.set(ls, { y: vb.height * 1.1 }));
    gsap.set(iPath, { opacity: 0 });
    gsap.timeline({ scrollTrigger: { trigger: stage, start: "top 82%", once: true } })
      .to(letters[0], { y: 0, duration: 0.9, ease: "power4.out", stagger: 0.035 })
      .to(iPath, { opacity: 1, duration: 0.5, ease: "power2.out" }, 0.55);

    // 2) puis, au défilement, le I bascule et devient le bouton
    st = ScrollTrigger.create({
      trigger: stage,
      start: () => (ctx.isMobile() ? "top 55%" : "top 45%"),
      end: () => (ctx.isMobile() ? "bottom 70%" : "bottom 75%"),
      scrub: true,
      onUpdate: self => render(self.progress),
      onRefresh: self => render(self.progress),
    });
  },
});
