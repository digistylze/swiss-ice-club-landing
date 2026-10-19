// ---------- Scroll Animation #69 : « FROID » apparaît, le I bascule et devient le bouton ----------
// Le I d'Antonio est un simple rectangle : en tombant, il s'épaissit et s'allonge (échelles X et Y distinctes) jusqu'aux
// proportions d'un vrai bouton, rouge, coins vifs. Transformation écrite à la main (attribut transform), pas via GSAP :
// la position finale est ainsi connue exactement et le bouton HTML est posé dessus par CALCUL, jamais par mesure.
SECTIONS.push({
  id: "cta",
  init(ctx) {
    const { gsap, ScrollTrigger } = ctx;
    const sec = document.getElementById("s-cta");
    if (!sec) return;
    const stage = sec.querySelector(".cta__stage");
    const btn = sec.querySelector(".cta__btn");
    const svg = stage.querySelector(".cta__word");
    const line = svg.querySelector(".cta__line");
    const iPath = svg.querySelector(".cta__i");
    const vb = svg.viewBox.baseVal;
    const NS = "http://www.w3.org/2000/svg";
    stage.style.setProperty("--cta-ratio", (vb.width / vb.height).toFixed(4));

    // le I sort du masque de sa ligne (sinon il serait coupé en basculant) : on le révèle à part, par opacité
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "cta__fall");
    svg.appendChild(g);
    g.appendChild(iPath);
    const letters = [...line.querySelectorAll(".cta__l")];
    const bb = iPath.getBBox();
    const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;

    // libellé du bouton, écrit dans le groupe du I (il le suit), contre-transformé pour rester droit et non déformé
    const TXT = "RÉSERVER MA SÉANCE DÉCOUVERTE";
    const label = document.createElementNS(NS, "text");
    label.setAttribute("class", "cta__lbl");
    label.setAttribute("aria-hidden", "true");
    label.setAttribute("x", cx);
    g.appendChild(label);

    const css = getComputedStyle(sec);
    const mix = gsap.utils.interpolate(css.getPropertyValue("--ink").trim(), css.getPropertyValue("--red").trim());
    const ease = gsap.parseEase("power2.inOut");
    // taille du bouton couché, en px : pleine largeur de la scène sur mobile, ≥ 44 px de haut partout
    const target = w => (ctx.isMobile()
      ? { L: w, H: 54, fs: 13, pad: 14 }
      : { L: gsap.utils.clamp(440, 560, w * 0.6), H: 68, fs: 15, pad: 30 });
    let F = { dx: 0, dy: 0, sx: 1, sy: 1, k: 1, L: 0, H: 0 }, st = null, shown = false, reveal = null;

    // q = avancement de la bascule (0 debout dans le mot, 1 couché sous le mot)
    const pose = q => {
      const sx = 1 + (F.sx - 1) * q, sy = 1 + (F.sy - 1) * q;
      g.setAttribute("transform", `translate(${cx + F.dx * q} ${cy + F.dy * q}) rotate(${90 * q}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`);
      iPath.style.fill = q >= 1 ? "" : mix(q);
    };

    // ScrambleText ne se rejoue pas à l'envers proprement : à l'apparition on brouille VERS le texte exact, à la disparition on efface net
    const scramble = window.ScrambleTextPlugin && !ctx.reduced;
    const showLabel = on => {
      if (on === shown) return;
      shown = on;
      btn.classList.toggle("is-on", on);
      g.classList.toggle("is-on", on);
      if (reveal) { reveal.kill(); reveal = null; }
      if (!on || !scramble) { label.textContent = on ? TXT : ""; return; }
      label.textContent = "";
      reveal = gsap.to(label, { duration: 0.7, scrambleText: { text: TXT, chars: "upperCase", revealDelay: 0.1, speed: 0.5 }, onComplete: () => { label.textContent = TXT; } });
    };
    // la bascule se termine à 90 % du défilement, puis le bouton reste posé (et le libellé apparaît)
    const render = p => { const q = ease(Math.min(1, p / 0.9)); pose(q); showLabel(q >= 1); };

    // géométrie finale : I couché, centré sous le mot, aux dimensions du bouton ; bouton HTML calé dessus par calcul
    const layout = () => {
      const k = svg.getBoundingClientRect().width / vb.width;          // px par unité du viewBox
      const T = target(vb.width * k);
      const gap = gsap.utils.clamp(16, 40, vb.height * k * 0.1);       // espace entre le mot et le bouton, px
      const Lv = T.L / k, Hv = T.H / k;
      F = { k, L: T.L, H: T.H, sx: Hv / bb.width, sy: Lv / bb.height,
            dx: vb.x + vb.width / 2 - cx, dy: vb.y + vb.height + gap / k + Hv / 2 - cy };
      // libellé : corps maximal, réduit s'il ne tient pas dans la longueur du bouton
      label.style.fontSize = "100px";
      label.textContent = TXT;
      const len100 = label.getComputedTextLength();
      label.textContent = shown ? TXT : "";
      const fsV = Math.min(T.fs / k, ((T.L - 2 * T.pad) / k) * 100 / len100);
      label.style.fontSize = `${fsV}px`;
      label.setAttribute("y", cy + fsV * 0.35);                         // centrage optique : capitales d'Instrument Sans ≈ 0,7 em
      label.setAttribute("transform", `translate(${cx} ${cy}) rotate(-90) scale(${1 / F.sy} ${1 / F.sx}) translate(${-cx} ${-cy})`);
      // bouton HTML : centre final du I, en px dans la scène (le svg est en haut à gauche de la scène)
      const x = (cx + F.dx - vb.x) * k, y = (cy + F.dy - vb.y) * k;
      Object.assign(btn.style, { left: `${x - T.L / 2}px`, top: `${y - T.H / 2}px`, width: `${T.L}px`, height: `${T.H}px` });
      stage.style.height = `${Math.ceil(y + T.H / 2 + 8)}px`;          // la scène s'arrête juste sous le bouton
      render(ctx.reduced ? 1 : st ? st.progress : 0);
    };
    layout();
    ScrollTrigger.addEventListener("refreshInit", layout);

    // le I dessiné est lui-même cliquable (c'est lui que l'on voit) : il déclenche le vrai bouton
    g.addEventListener("click", () => { if (shown) btn.click(); });

    if (ctx.reduced) return;

    // 1) le mot apparaît : lettres qui montent dans leur ligne, une fois, à l'entrée ; le I par opacité
    gsap.set(letters, { y: vb.height * 1.1 });
    gsap.set(iPath, { opacity: 0 });
    const intro = gsap.timeline({ scrollTrigger: { trigger: stage, start: "top 96%", once: true } })
      .to(letters, { y: 0, duration: 0.9, ease: "power4.out", stagger: 0.05 })
      .to(iPath, { opacity: 1, duration: 0.45, ease: "power2.out" }, 0.25);

    // 2) puis, au défilement, le I bascule et devient le bouton
    st = ScrollTrigger.create({
      trigger: stage,
      start: () => (ctx.isMobile() ? "top 78%" : "top 80%"),
      end: () => (ctx.isMobile() ? "bottom 58%" : "bottom 88%"),
      scrub: true,
      onUpdate: self => {
        if (self.progress > 0 && intro.progress() < 1) intro.progress(1);   // défilement très rapide : le mot est posé avant la bascule
        render(self.progress);
      },
      onRefresh: self => render(self.progress),
    });
  },
});
