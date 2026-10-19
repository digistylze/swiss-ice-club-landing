// ---------- Produits : Grid Animations #4 (liste / grande vue qui s'ouvre en croix) + Scroll Animation #9 (photo en lames) ----------
SECTIONS.push({
  id: "produits",
  init(ctx) {
    const { gsap, IMG } = ctx;
    const sec = document.getElementById("s-produits");
    if (!sec) return;
    // photo de chaque famille (clés littérales : build.py n'embarque que celles-là) et son cadrage dans la vue
    const PHOTO = {
      toiles: [IMG["p-toiles"], "30% 50%"],
      pergolas: [IMG["p-pergolas"], "45% 55%"],
      lamelles: [IMG["p-lamelles"], "45% 52%"],
      zip: [IMG["p-zip"], "42% 50%"],
      volets: [IMG["p-volets"], "50% 45%"],
      battants: [IMG["p-battants"], "50% 42%"],
      veranda: [IMG["p-veranda"], "40% 50%"],
      interieurs: [IMG["p-interieurs"], "50% 40%"],
      moustiquaires: [IMG["p-moustiquaires"], "50% 45%"],
    };
    const list = sec.querySelector(".pr-list");
    const tabs = [...list.querySelectorAll(".pr-tab")];
    const keys = tabs.map(t => t.dataset.key);
    const panels = tabs.map(t => document.getElementById(t.getAttribute("aria-controls")));
    const bars = tabs.map(t => t.querySelector(".pr-tab__bar i"));
    const stage = sec.querySelector(".pr-stage");
    const base = stage.querySelector(".pr-base");
    const dim = stage.querySelector(".pr-dim");
    const box = stage.querySelector(".pr-slats");
    const cross = stage.querySelector(".pr-cross");
    const dhead = sec.querySelector(".pr-dhead");
    const nameEl = sec.querySelector(".pr-name");
    const lineEl = sec.querySelector(".pr-line");
    const cta = sec.querySelector(".pr-cta");
    const setPhoto = (img, k) => { img.src = PHOTO[k][0]; img.style.objectPosition = PHOTO[k][1]; };
    setPhoto(base, keys[0]);

    // #9 en lames de store : N bandes horizontales, chacune porte la photo entière décalée de sa hauteur,
    // et pivote de la tranche (-90°) à plat, l'une après l'autre depuis le haut
    const N = 14;
    const slats = [], slatImgs = [], shades = [];
    for (let i = 0; i < N; i++) {
      const s = document.createElement("div"), im = document.createElement("img"), sh = document.createElement("i");
      s.className = "pr-slat"; im.alt = "";
      s.append(im, sh); box.append(s);
      slats.push(s); slatImgs.push(im); shades.push(sh);
    }
    new ResizeObserver(() => {
      const H = stage.clientHeight;
      slats.forEach((s, i) => {
        const t = Math.round(i * H / N), b = Math.round((i + 1) * H / N);
        s.style.top = t + "px"; s.style.height = b - t + 1 + "px";   // 1 px de recouvrement : pas de couture entre lames
        slatImgs[i].style.top = -t + "px"; slatImgs[i].style.height = H + "px";
      });
    }).observe(stage);

    // rangée de pastilles (mobile) : l'onglet actif reste visible
    const scrollRow = tab => {
      if (list.scrollWidth > list.clientWidth + 2) list.scrollTo({ left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2, behavior: ctx.reduced ? "auto" : "smooth" });
    };

    let cur = 0, tl = null, token = 0;
    function show(i) {
      if (i === cur) return;
      tl && tl.progress(1);            // transition en cours : on la termine d'un coup
      cur = i;
      const k = keys[i], tab = tabs[i];
      tabs.forEach((t, j) => { const on = j === i; t.classList.toggle("is-active", on); t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; });
      panels.forEach((p, j) => (p.hidden = j !== i));
      nameEl.textContent = tab.querySelector(".pr-tab__name").textContent;
      lineEl.textContent = tab.querySelector(".pr-tab__line").textContent;
      base.alt = nameEl.textContent;
      cta.dataset.devis = k;
      stage.classList.toggle("is-velux", k === "interieurs");
      scrollRow(tab);
      if (ctx.reduced) { setPhoto(base, k); return; }

      // opacité seule (pas autoAlpha) : la visibilité des fiches cachées reste gérée par [hidden]
      gsap.fromTo([dhead, panels[i]], { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .6, stagger: .07, ease: "power3.out", overwrite: true });
      slatImgs.forEach(im => setPhoto(im, k));
      const id = ++token;
      tl = gsap.timeline({
        onComplete: () => {
          setPhoto(base, k);
          // les lames restent tant que la photo de fond n'est pas décodée (pas de flash)
          const done = () => { if (id === token) gsap.set([box, dim], { autoAlpha: 0 }); };
          base.decode ? base.decode().then(done, done) : done();
        },
      })
        .set(box, { autoAlpha: 1 })
        .fromTo(slats, { rotationX: -90 }, { rotationX: 0, duration: .95, ease: "power3.out", stagger: .065 }, 0)
        .fromTo(shades, { opacity: .85 }, { opacity: 0, duration: 1, ease: "power2.out", stagger: .065 }, 0)
        .fromTo(slatImgs, { scale: 1.14 }, { scale: 1.06, duration: 1.8, ease: "power3.out" }, 0)
        .fromTo(dim, { autoAlpha: 0 }, { autoAlpha: .5, duration: .9, ease: "power2.in" }, 0);
    }

    // défilement automatique (~5 s par famille) tant que la section est à l'écran ; arrêt définitif à la première action
    let auto = !ctx.reduced, visible = false, prog = null;
    const arm = (delay = 0) => {
      prog && prog.kill();
      if (!auto) return;
      prog = gsap.fromTo(bars[cur], { scaleX: 0 }, {
        scaleX: 1, duration: 5, delay, ease: "none", paused: !visible,
        onComplete: () => { show((cur + 1) % keys.length); arm(); },
      });
    };
    const stop = () => {
      if (!auto) return;
      auto = false; prog && prog.kill(); prog = null;
      sec.classList.remove("is-auto");
      nameEl.setAttribute("aria-live", "polite");   // annoncé seulement quand c'est le visiteur qui change de famille
    };
    // la première famille a ses 5 s pleines après l'ouverture en croix de l'entrée (≈ 1,2 s)
    if (auto) { sec.classList.add("is-auto"); nameEl.setAttribute("aria-live", "off"); arm(1.2); }
    ctx.whenVisible(sec, () => { visible = true; prog && prog.play(); }, () => { visible = false; prog && prog.pause(); }, "-25% 0px");
    ["click", "keydown", "focusin"].forEach(ev => sec.addEventListener(ev, stop));
    list.addEventListener("touchstart", stop, { passive: true });

    // clic = choix ; survol (souris) = aperçu, après un court délai comme dans #4
    let hoverT;
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => { stop(); show(i); });
      t.addEventListener("pointerenter", e => { if (e.pointerType !== "mouse") return; clearTimeout(hoverT); hoverT = setTimeout(() => { stop(); show(i); }, 180); });
      t.addEventListener("pointerleave", () => clearTimeout(hoverT));
    });
    // clavier : flèches haut/bas (gauche/droite pour la rangée mobile), Début, Fin
    list.addEventListener("keydown", e => {
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      const from = Math.max(0, tabs.indexOf(document.activeElement));
      const i = step ? (from + step + keys.length) % keys.length : e.key === "Home" ? 0 : e.key === "End" ? keys.length - 1 : -1;
      if (i < 0) return;
      e.preventDefault(); show(i); tabs[i].focus();
    });
    const stacked = matchMedia("(max-width: 1079px)");
    const orient = () => list.setAttribute("aria-orientation", stacked.matches ? "horizontal" : "vertical");
    orient(); stacked.addEventListener("change", orient);

    // appelé par core.js pour les liens [data-product] ailleurs dans la page
    ctx.showProduct = key => { const i = keys.indexOf(key); if (i < 0) return; stop(); show(i); };

    // entrée (#4) : la vue s'ouvre en quatre carreaux pendant que la photo se pose, la liste glisse en place
    if (ctx.reduced) return;
    const crossAt = a => `polygon(${50 - a}% 0%, ${50 + a}% 0%, ${50 + a}% ${50 - a}%, 100% ${50 - a}%, 100% ${50 + a}%, ${50 + a}% ${50 + a}%, ${50 + a}% 100%, ${50 - a}% 100%, ${50 - a}% ${50 + a}%, 0% ${50 + a}%, 0% ${50 - a}%, ${50 - a}% ${50 - a}%)`;
    gsap.set(cross, { clipPath: crossAt(50) });
    gsap.set(tabs, { opacity: 0, x: -16 });
    gsap.timeline({ scrollTrigger: { trigger: sec, start: "top 72%", once: true } })
      .to(cross, { clipPath: crossAt(0), duration: 1.3, ease: "power3.inOut" }, 0)
      .fromTo(base, { scale: 1.2 }, { scale: 1.06, duration: 1.7, ease: "power3.out" }, 0)
      .to(tabs, { opacity: 1, x: 0, duration: .7, stagger: .05, ease: "power3.out" }, .1);
  },
});
