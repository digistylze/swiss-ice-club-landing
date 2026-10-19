/* Navigation Menus #2 : une timeline jouée pour ouvrir, inversée pour fermer. Sur desktop, le panneau part de la taille et de la
   place du bouton d'où l'on vient (pilule flottante en bas à droite, ou « Demander une étude » de la barre) et s'agrandit jusqu'au
   coin haut droit ; le curseur du bouton monte de « Votre projet » à « Fermer » ; le contenu bascule en place (rotateX + back.out,
   en cascade). Sur mobile, le panneau monte du bas en plein écran. Formulaire rapide : 2 étapes, envoi par WhatsApp ou e-mail. */
SECTIONS.push({
  id: "devis",
  init(ctx) {
    const { gsap, lenis } = ctx;
    const root = document.getElementById("s-devis");
    if (!root) return;
    const q = s => root.querySelector(s), qa = s => [...root.querySelectorAll(s)];
    const panel = q(".devis__panel"), backdrop = q(".devis__backdrop"), btn = q(".devis__close"), slider = q(".devis__slider");
    const form = q(".devis__form"), steps = qa(".devis__step"), segs = qa(".devis__seg"), count = q(".devis__count"), status = q(".devis__status");
    const fab = document.querySelector(".devis-fab");
    const choices = qa('input[name="projet"]');
    const WA = "41793870506", EMAIL = "carmelo@crea-immobilier.ch", N = steps.length;
    let isOpen = false, tl = null, lastFocus = null, step = 1;

    const visible = el => el.getClientRects().length > 0 && !el.disabled;
    const fields = () => qa("button, input, textarea, a[href]").filter(visible);
    const firstField = () => steps[step - 1].querySelector("input:checked") || steps[step - 1].querySelector("input, textarea") || steps[step - 1].querySelector("button");

    // ---------- étapes ----------
    const go = (n, animate = true) => {
      step = n;
      steps.forEach((s, i) => { s.hidden = i !== n - 1; });
      segs.forEach((s, i) => s.classList.toggle("is-done", i < n));
      count.innerHTML = `<span aria-hidden="true">${n}/${N}</span><span class="sr-only">Étape ${n} sur ${N}</span>`;
      status.textContent = "";
      form.scrollTop = 0;
      if (animate && !ctx.reduced) {
        gsap.fromTo(steps[n - 1].children, { opacity: 0, rotateX: 70, y: 30, transformPerspective: 400, transformOrigin: "50% 100%" },
          { opacity: 1, rotateX: 0, y: 0, duration: .55, ease: "back.out(1.2)", stagger: .05, clearProps: "transform,opacity" });
      }
      if (animate) firstField().focus({ preventScroll: true });
    };

    const fail = (n, bad, msg) => {
      qa("[aria-invalid]").forEach(el => el.removeAttribute("aria-invalid"));
      q(`#devis-err-${n}`).textContent = msg;
      bad.forEach(el => el.setAttribute("aria-invalid", "true"));
      if (bad[0]) bad[0].focus();
      return !msg;
    };

    const check = n => {
      const f = form.elements;
      if (n === 1) { const ok = choices.some(c => c.checked); return fail(1, ok ? [] : [choices[0]], ok ? "" : "Choisissez l'option qui vous ressemble le plus."); }
      const bad = [], msg = [];
      if (f.nom.value.trim().length < 2) { bad.push(f.nom); msg.push("Indiquez votre nom."); }
      if (f.tel.value.replace(/\D/g, "").length < 9) { bad.push(f.tel); msg.push("Indiquez un numéro de téléphone valide."); }
      return fail(2, bad, msg.join(" "));
    };

    qa(".devis__next").forEach(b => b.addEventListener("click", () => { if (check(step)) go(step + 1); }));
    qa(".devis__back").forEach(b => b.addEventListener("click", () => go(step - 1)));
    // une fois corrigé, le champ perd son état d'erreur
    form.addEventListener("input", e => { if (e.target.hasAttribute("aria-invalid")) { e.target.removeAttribute("aria-invalid"); q(`#devis-err-${step}`).textContent = ""; } });
    form.addEventListener("change", e => { if (e.target.name === "projet") { choices.forEach(c => c.removeAttribute("aria-invalid")); q("#devis-err-1").textContent = ""; } });
    // un choix fait à la souris ou au doigt passe directement à l'étape suivante (au clavier, « Continuer » reste nécessaire)
    let pointer = false;
    form.addEventListener("pointerdown", () => { pointer = true; });
    form.addEventListener("keydown", () => { pointer = false; });
    choices.forEach(c => c.addEventListener("change", () => { if (pointer && step === 1) setTimeout(() => go(2), ctx.reduced ? 0 : 280); }));
    form.addEventListener("submit", e => e.preventDefault());
    // Entrée dans un champ texte de l'étape 1 : passe à l'étape suivante plutôt que de soumettre
    form.addEventListener("keydown", e => {
      if (e.key === "Enter" && e.target.tagName === "INPUT" && step < N) { e.preventDefault(); if (check(step)) go(step + 1); }
    });

    // ---------- envoi : résumé lisible, par WhatsApp ou par e-mail ----------
    const summary = () => {
      const f = form.elements, v = el => el.value.trim();
      const projet = (choices.find(c => c.checked) || {}).value;
      return [
        "Bonjour, je m'intéresse au concept L'Éveil des sens.", "",
        `Projet : ${projet}`,
        v(f.commune) ? `Commune : ${v(f.commune)}` : null,
        "",
        `Nom : ${v(f.nom)}`,
        `Téléphone : ${v(f.tel)}`,
      ].filter(l => l !== null).join("\n");
    };
    qa("[data-send]").forEach(b => b.addEventListener("click", () => {
      if (!check(2)) return;
      const text = summary();
      if (b.dataset.send === "wa") {
        window.open(`https://wa.me/${WA}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
        status.textContent = "WhatsApp s'ouvre avec votre demande déjà rédigée. Il ne reste qu'à l'envoyer.";
      } else {
        location.href = `mailto:${EMAIL}?subject=${encodeURIComponent("Espace nuit : demande d'étude")}&body=${encodeURIComponent(text)}`;
        status.textContent = "Votre messagerie s'ouvre avec la demande déjà rédigée. Il ne reste qu'à l'envoyer.";
      }
    }));

    // ---------- ouverture / fermeture ----------
    // point de départ : le bouton cliqué s'il s'agit de la pilule ou du bouton de la barre, sinon la pilule si elle est à l'écran
    const rectOf = el => {
      if (!el) return null;
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      return r.width && r.top >= 0 && r.bottom <= innerHeight && cs.visibility !== "hidden" && +cs.opacity > 0.5 ? r : null;
    };
    const origin = src => {
      const navBtn = document.querySelector("#s-nav .nav__devis");
      const own = src && (src === fab || src === navBtn) ? rectOf(src) : null;
      return own || rectOf(fab) || rectOf(navBtn) || { top: innerHeight - 84, right: innerWidth - 24, width: 220, height: 60 };
    };
    const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    const preselect = projet => {
      const t = norm(projet || "");
      if (!t) return false;
      const c = choices.find(x => norm(x.value) === t);
      if (c) c.checked = true;
      return !!c;
    };
    const reveal = () => [...q(".devis__head").children, ...steps[step - 1].children, q(".devis__foot")];

    function open(projet, src) {
      const chosen = preselect(projet);
      if (isOpen) return;
      isOpen = true;
      lastFocus = document.activeElement;
      go(chosen ? 2 : 1, false);          // formule déjà choisie (bouton d'une carte) : directement aux coordonnées
      root.classList.add("is-open");
      document.documentElement.classList.add("is-devis-open");
      ctx.setMenuOpen(true);
      lenis.stop();
      const mob = ctx.isMobile(), vw = innerWidth, vh = innerHeight;
      const els = reveal();
      tl && tl.kill();
      gsap.set(root, { visibility: "visible" });
      tl = gsap.timeline({ defaults: { ease: "power3.inOut" }, onReverseComplete: hide });
      if (mob) {
        gsap.set(btn, { top: 10, right: 12, width: 48, height: 48 });
        gsap.set(slider, { yPercent: -50 });
        gsap.set(panel, { top: "auto", bottom: 0, left: 0, right: 0, width: "100%", borderRadius: 0 });
        tl.fromTo(panel, { height: 0 }, { height: vh, duration: .7 }, 0)
          .fromTo(btn, { autoAlpha: 0 }, { autoAlpha: 1, duration: .3, ease: "power2.out" }, .4);
      } else {
        // le panneau s'ancre au coin haut droit de l'écran ; le bouton glisse de la place d'origine vers son coin
        const r = origin(src), right0 = vw - r.right, M = 12;
        gsap.set(btn, { width: 130, height: 44, autoAlpha: 1 });
        gsap.set(panel, { bottom: "auto", left: "auto" });
        tl.fromTo(panel, { top: r.top, right: right0, width: r.width, height: r.height, borderRadius: r.height / 2 },
          { top: M, right: M, width: Math.min(520, vw - 2 * M), height: vh - 2 * M, borderRadius: 26, duration: .8 }, 0)
          .fromTo(btn, { top: r.top + (r.height - 44) / 2, right: right0 + Math.max(0, (r.width - 130) / 2) }, { top: M + 18, right: M + 20, duration: .8 }, 0)
          .fromTo(slider, { yPercent: 0 }, { yPercent: -50, duration: .5 }, 0);
      }
      tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: .6, ease: "power2.out" }, 0)
        .add(() => root.classList.add("is-shown"), .25)
        .fromTo(els, { opacity: 0, rotateX: 90, y: 60, x: -16, transformPerspective: 400, transformOrigin: "50% 100%" },
          { opacity: 1, rotateX: 0, y: 0, x: 0, duration: .65, ease: "back.out(1.2)", stagger: .05 }, .45);
      tl.timeScale(ctx.reduced ? 20 : 1);
      firstField().focus({ preventScroll: true });
    }

    function hide() {
      root.classList.remove("is-shown");
      gsap.set(reveal(), { clearProps: "all" });
      gsap.set([panel, btn, slider, root], { clearProps: "all" });
      document.documentElement.classList.remove("is-devis-open");
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      root.classList.remove("is-open");
      ctx.setMenuOpen(false);
      lenis.start();
      tl.timeScale(ctx.reduced ? 20 : 1.5).reverse();
      if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    }

    ctx.openDevis = open;
    btn.addEventListener("click", close);
    backdrop.addEventListener("click", close);

    // Échap ferme ; Tab reste dans le panneau
    document.addEventListener("keydown", e => {
      if (!isOpen) return;
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      const f = fields();
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey ? i <= 0 : i === -1 || i === f.length - 1) {
        e.preventDefault();
        (e.shiftKey ? f[f.length - 1] : f[0]).focus();
      }
    });

    // la pilule se cache sur le CTA final et le pied de page (le bouton y est déjà)
    if (fab) {
      const hiders = [...document.querySelectorAll("#s-cta, #s-footer")];
      const on = new Set();
      hiders.forEach(h => new IntersectionObserver(([e]) => { e.isIntersecting ? on.add(h) : on.delete(h); fab.classList.toggle("is-away", on.size > 0); }, { threshold: .2 }).observe(h));
    }

    go(1, false);
  },
});
