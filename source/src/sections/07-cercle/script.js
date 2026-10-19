// ---------- Text Animations #2 (3D Text Circle) : l'anneau de mots autour du très grand « 30 » ----------
// Repris du code de la pièce (three + texte MSDF) en canvas 2D : mêmes positions (chaque mot part du cercle, en rayon, à
// 2π/N d'écart, ceux de gauche tête en bas), même mécanique (cible accumulée par le défilement, lissage 0,1, vitesse =
// écart × 0,001, rotation = défilement × 0,0007) et même courbure que le vertex shader : chaque lettre tourne de
// vitesse × distance × amplitude, les mots se cintrent quand l'anneau accélère. Ajouts : une dérive lente pour qu'il vive
// sans interaction, une entrée où il tourne vite puis se pose, et le reflet de l'or du « 30 » qui suit la rotation.
SECTIONS.push({
  id: "cercle",
  init(ctx) {
    const { gsap, ScrollTrigger, lenis } = ctx;
    const sec = document.getElementById("s-cercle");
    if (!sec) return;
    const stage = sec.querySelector(".ce-stage");
    const cv = sec.querySelector(".ce-ring");
    const g = cv.getContext("2d");
    const num = sec.querySelector(".ce-num");
    const WORDS = ["Cercle", "Privé", "Trente", "Membres", "Une année", "Priorité", "Protocoles", "Carouge", "Slow down", "Speed up"];
    const RING = [...WORDS, ...WORDS].map(w => w.toUpperCase());
    const N = RING.length, TRACK = .12, CIRCLE = .0007, BEND = .17, AUTO = .1, LIGHT = -2.3, TAU = Math.PI * 2;
    const st = { base: ctx.reduced ? 0 : -2800, acc: 0, cur: ctx.reduced ? 0 : -2800, speed: 0, alpha: ctx.reduced ? 1 : 0 };
    let S = 0, dpr = 1, R = 0, F = 0, words = [];

    // tailles d'après la scène : le mot le plus long tient entre le cercle et le bord
    const layout = () => {
      S = stage.clientWidth;
      if (!S) return;
      dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = cv.height = Math.round(S * dpr);
      R = S * (ctx.isMobile() ? .28 : .3);
      g.font = "500 100px Antonio";
      const wide = Math.max(...RING.map(w => g.measureText(w).width + w.length * 100 * TRACK));
      F = Math.min(S * .05, (S * .49 - R) / wide * 100);
      g.font = `500 ${F}px Antonio`;
      g.textBaseline = "middle";
      words = RING.map(w => [...w].map((c, k) => ({ c, x: g.measureText(w.slice(0, k)).width + k * F * TRACK })));
    };

    const draw = () => {
      if (!S) return;
      const a = st.cur * CIRCLE, c = S / 2 * dpr;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cv.width, cv.height);
      g.globalAlpha = st.alpha;
      // anneau fin de la cuve vue du dessus, entre les mots et le « 30 »
      g.setTransform(dpr, 0, 0, dpr, c, c);
      g.strokeStyle = "rgba(200,164,90,.32)";
      g.lineWidth = 1;
      g.beginPath(); g.arc(0, 0, R * .9, 0, TAU); g.stroke();
      for (let i = 0; i < N; i++) {
        const a0 = a + i / N * TAU;
        g.fillStyle = `rgba(200,164,90,${(.3 + .7 * Math.max(0, Math.cos(a0 - LIGHT)) ** 2).toFixed(3)})`;   // reflet fixe en haut à gauche
        for (const { c: ch, x } of words[i]) {
          const t = a0 + st.speed * BEND * (x / F);
          const cs = Math.cos(t) * dpr, sn = Math.sin(t) * dpr;
          g.setTransform(cs, sn, -sn, cs, c, c);
          g.fillText(ch, R + x, 0);
        }
      }
      num.style.setProperty("--sheen", (50 + 46 * Math.sin(a)).toFixed(1) + "%");
    };

    new ResizeObserver(() => { layout(); draw(); }).observe(stage);
    if (ctx.reduced) return;

    const tick = (time, dt) => {
      st.acc += Math.min(dt, 50) * AUTO + (lenis.velocity || 0);   // dérive lente + défilement de la page (la molette de la pièce)
      const target = st.base + st.acc;
      st.cur += (target - st.cur) * .1;
      st.speed += ((target - st.cur) * .001 - st.speed) * .1;
      draw();
    };
    let on = false;
    ctx.whenVisible(stage,
      () => { if (!on) { on = true; gsap.ticker.add(tick); } },
      () => { if (on) { on = false; gsap.ticker.remove(tick); } });

    // entrée : l'anneau arrive en tournant vite (les mots se cintrent) et se pose ; le « 30 » monte de son masque
    const digits = num.querySelectorAll("span");
    gsap.set(digits, { yPercent: 112 });
    ScrollTrigger.create({
      trigger: stage, start: "top 78%", once: true,
      onEnter: () => {
        gsap.to(st, { base: 0, duration: 2.8, ease: "power3.inOut" });
        gsap.to(st, { alpha: 1, duration: 1.4, ease: "power1.out" });
        gsap.to(digits, { yPercent: 0, duration: 1.5, ease: "power4.out", stagger: .1, delay: .4 });
      },
    });

    gsap.from(sec.querySelectorAll(".ce-eyebrow, .ce-title, .ce-list li, .ce-cta"), {
      y: 24, autoAlpha: 0, duration: 1.1, ease: "power2.out", stagger: .08,
      scrollTrigger: { trigger: sec.querySelector(".ce-body"), start: "top 82%", once: true },
    });
    const team = sec.querySelector(".ce-team");
    gsap.from(team, { y: 30, autoAlpha: 0, duration: 1.1, ease: "power2.out", scrollTrigger: { trigger: team, start: "top 90%", once: true } });
  },
});
