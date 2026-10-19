/* 12-reservation · Navigation Menus #2 : une timeline jouée pour ouvrir, inversée pour fermer. Sur desktop, le panneau part de la
   taille et de la place du bouton cliqué (pastille flottante, « Réserver » de la barre, bouton d'une carte...) et s'agrandit
   jusqu'au coin haut droit ; le curseur du bouton monte de « Réserver » à « Fermer » ; le contenu bascule en place (rotateX +
   back.out, en cascade). Sur mobile, le panneau monte du bas en plein écran.
   Étape 1 : l'expérience ; étape 2 : l'agenda en ligne (Google Agenda pour l'entretien), ou une demande rédigée pour les groupes.
   API : ctx.openBooking(offre) ; offre connue = présélection + étape 2 directement. */
SECTIONS.push({
  id: "reservation",
  init(ctx) {
    const { gsap, lenis } = ctx;
    const sec = document.getElementById("s-reservation");
    if (!sec) return;
    const q = s => sec.querySelector(s), qa = s => [...sec.querySelectorAll(s)];
    const layer = q(".rs-layer"), panel = q(".rs-panel"), backdrop = q(".rs-backdrop"), btn = q(".rs-close"), slider = q(".rs-slider");
    const fab = q(".rs-fab"), form = q(".rs-form"), steps = qa(".rs-step"), segs = qa(".rs-seg"), count = q(".rs-count");
    const choices = qa('input[name="offre"]');
    const legend2 = steps[1].querySelector("legend"), goBox = q(".rs-go"), goBtn = q(".rs-go__btn"), forEls = qa(".rs-go [data-for]");
    const ask = q(".rs-ask"), status = q(".rs-status");
    const AGENDA = "https://book.agenda.ch/services?companyId=17167", CAL = "https://calendar.app.google/S53BFsSnwfsiBusT8";
    const WA = "41782487529", EMAIL = "info@swissiceclub.ch", N = steps.length;
    // ce qui accompagne le lien : lieu, affaires à apporter (bains et sauna), précautions (offres avec le froid)
    const COLD = new Set(["decouverte", "ice-discovery", "ice-performance", "free-plunge", "privee-60", "privee-120", "ice-premium", "contrast", "infroid"]);
    let isOpen = false, tl = null, lastFocus = null, step = 1, src = null;

    const choice = () => choices.find(c => c.checked);
    // morceaux qui basculent en cascade : titre de l'étape, blocs de la liste, bouton « Continuer »
    const parts = n => [...steps[n - 1].querySelectorAll(":scope > legend, .rs-scroll > *, .rs-actions")].filter(el => el.getClientRects().length);
    const kind = c => (c.dataset.form ? "form" : c.value === "entretien" ? "cal" : "agenda");
    const visible = el => el.getClientRects().length > 0 && !el.disabled;
    // ordre de tabulation réel : un groupe de boutons radio ne compte qu'une fois (le choix en cours, sinon le premier)
    const fields = () => [...layer.querySelectorAll("button, input, textarea, a[href]")].filter(visible)
      .filter(el => el.type !== "radio" || el === (choice() || choices[0]));
    const firstField = () => {
      if (step === 1) return choice() || choices[0];
      const c = choice();
      if (kind(c) !== "form") return goBtn;
      return ctx.isMobile() ? q(".rs-back") : form.elements.nom;   // pas de clavier qui surgit sur mobile
    };

    // ---------- étape 2 : rappel de l'offre et action adaptée ----------
    const fill = () => {
      const c = choice(), lab = c.closest(".rs-opt"), k = kind(c);
      q(".rs-pick__name").textContent = lab.querySelector("strong").textContent;
      q(".rs-pick__meta").textContent = lab.querySelector("em").textContent;
      q(".rs-pick__detail").textContent = c.dataset.detail || "";
      legend2.textContent = k === "form" ? "Votre demande" : "Votre créneau";
      goBox.hidden = k === "form";
      ask.hidden = k !== "form";
      goBtn.href = k === "cal" ? CAL : AGENDA;
      const show = { place: k === "agenda", kit: COLD.has(c.value) || c.value === "sauna", cal: k === "cal", cold: COLD.has(c.value) };
      forEls.forEach(el => { el.hidden = !show[el.dataset.for]; });
    };

    const go = (n, animate = true) => {
      step = n;
      if (n === 2) fill();
      steps.forEach((s, i) => { s.hidden = i !== n - 1; });
      segs.forEach((s, i) => s.classList.toggle("is-done", i < n));
      count.innerHTML = `<span aria-hidden="true">${n}/${N}</span><span class="sr-only">Étape ${n} sur ${N}</span>`;
      status.textContent = "";
      steps[n - 1].querySelector(".rs-scroll").scrollTop = 0;
      if (animate && !ctx.reduced) {
        gsap.fromTo(parts(n), { opacity: 0, rotateX: 70, y: 30, transformPerspective: 400, transformOrigin: "50% 100%" },
          { opacity: 1, rotateX: 0, y: 0, duration: .55, ease: "back.out(1.2)", stagger: .05, clearProps: "transform,opacity" });
      }
      if (animate) firstField().focus({ preventScroll: true });
    };

    const fail = (n, bad, msg) => {
      qa("[aria-invalid]").forEach(el => el.removeAttribute("aria-invalid"));
      q(`#rs-err-${n}`).textContent = msg;
      bad.forEach(el => el.setAttribute("aria-invalid", "true"));
      if (bad[0]) bad[0].focus();
      return !msg;
    };
    const check = n => {
      if (n === 1) { const ok = !!choice(); return fail(1, ok ? [] : [choices[0]], ok ? "" : "Choisissez une expérience."); }
      const f = form.elements, bad = [], msg = [];
      if (f.nom.value.trim().length < 2) { bad.push(f.nom); msg.push("Indiquez votre nom."); }
      const c = f.contact.value.trim();
      if (!/^\S+@\S+\.\S+$/.test(c) && c.replace(/\D/g, "").length < 9) { bad.push(f.contact); msg.push("Indiquez un téléphone ou un e-mail valide."); }
      return fail(2, bad, msg.join(" "));
    };

    q(".rs-next").addEventListener("click", () => { if (check(1)) go(2); });
    q(".rs-back").addEventListener("click", () => go(1));
    form.addEventListener("input", e => { if (e.target.hasAttribute("aria-invalid")) { e.target.removeAttribute("aria-invalid"); q(`#rs-err-${step}`).textContent = ""; } });
    form.addEventListener("change", e => { if (e.target.name === "offre") { choices.forEach(c => c.removeAttribute("aria-invalid")); q("#rs-err-1").textContent = ""; } });
    // un choix fait à la souris ou au doigt (même déjà coché) passe directement à l'étape 2 ; au clavier, « Continuer » reste nécessaire
    let pointer = false;
    form.addEventListener("pointerdown", () => { pointer = true; });
    form.addEventListener("keydown", () => { pointer = false; });
    choices.forEach(c => c.addEventListener("click", () => { if (pointer && step === 1) setTimeout(() => step === 1 && go(2), ctx.reduced ? 0 : 260); }));
    form.addEventListener("submit", e => e.preventDefault());
    form.addEventListener("keydown", e => {
      if (e.key === "Enter" && e.target.tagName === "INPUT" && step === 1) { e.preventDefault(); if (check(1)) go(2); }
    });

    // ---------- groupes : demande rédigée, envoyée depuis la messagerie ou WhatsApp ----------
    const summary = () => {
      const f = form.elements, v = el => el.value.trim(), c = choice();
      return [
        "Bonjour,", "",
        c.value === "le30" ? "Je souhaite demander une adhésion au Cercle Privé LE 30." : "Je souhaite recevoir une proposition pour un team building.",
        "",
        `Nom : ${v(f.nom)}`,
        `Contact : ${v(f.contact)}`,
        v(f.message) ? `Message : ${v(f.message)}` : null,
      ].filter(l => l !== null).join("\n");
    };
    qa("[data-send]").forEach(b => b.addEventListener("click", () => {
      if (!check(2)) return;
      const text = summary();
      if (b.dataset.send === "wa") {
        window.open(`https://wa.me/${WA}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
        status.textContent = "WhatsApp s’ouvre avec votre demande déjà rédigée. Il ne reste qu’à l’envoyer.";
      } else {
        const subject = choice().value === "le30" ? "LE 30 : demande d'adhésion" : "Team building : demande de proposition";
        location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
        status.textContent = "Votre messagerie s’ouvre avec la demande déjà rédigée. Il ne reste qu’à l’envoyer.";
      }
    }));

    // ---------- ouverture / fermeture ----------
    // le bouton cliqué sert de point de départ : on le note avant que le socle n'appelle openBooking
    document.addEventListener("click", e => { src = e.target.closest("[data-book]"); }, true);
    const rectOf = el => {
      if (!el) return null;
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      const ok = r.width && r.width <= 640 && r.height <= 160 && r.top >= 0 && r.bottom <= innerHeight && cs.visibility !== "hidden" && +cs.opacity > .5;
      return ok ? r : null;
    };
    const origin = el => rectOf(el) || rectOf(fab) || rectOf(document.querySelector("#s-nav .nav__book"))
      || { top: innerHeight - 84, right: innerWidth - 24, width: 260, height: 60 };
    const preselect = offre => {
      const c = offre && choices.find(x => x.value === offre);
      if (c) c.checked = true;
      return !!c;
    };
    const reveal = () => [...q(".rs-head").children, ...parts(step), q(".rs-foot")];

    function open(offre) {
      const from = src; src = null;
      const chosen = preselect(offre);
      if (isOpen) { go(chosen ? 2 : 1); return; }
      isOpen = true;
      lastFocus = document.activeElement;
      go(chosen ? 2 : 1, false);          // expérience déjà choisie (bouton d'une carte) : directement au créneau
      layer.classList.add("is-open");
      document.documentElement.classList.add("is-booking-open");
      ctx.setMenuOpen(true);
      lenis.stop();
      const vw = innerWidth, vh = innerHeight, els = reveal();
      tl && tl.kill();
      gsap.set(layer, { visibility: "visible" });
      tl = gsap.timeline({ defaults: { ease: "power3.inOut" }, onReverseComplete: hide });
      if (ctx.isMobile()) {
        gsap.set(btn, { top: 10, right: 12, width: 48, height: 48 });
        gsap.set(slider, { yPercent: -50 });
        gsap.set(panel, { top: "auto", bottom: 0, left: 0, right: 0, width: "100%" });
        tl.fromTo(panel, { height: 0 }, { height: vh, duration: .7 }, 0)
          .fromTo(btn, { autoAlpha: 0 }, { autoAlpha: 1, duration: .3, ease: "power2.out" }, .4);
      } else {
        // le panneau s'ancre au coin haut droit de l'écran ; le bouton glisse de la place d'origine vers son coin
        const r = origin(from), right0 = vw - r.right, M = 12;
        gsap.set(btn, { width: 130, height: 44, autoAlpha: 1 });
        gsap.set(panel, { bottom: "auto", left: "auto" });
        tl.fromTo(panel, { top: r.top, right: right0, width: r.width, height: r.height },
          { top: M, right: M, width: Math.min(680, vw - 2 * M), height: vh - 2 * M, duration: .8 }, 0)
          .fromTo(btn, { top: r.top + (r.height - 44) / 2, right: right0 + (r.width - 130) / 2 }, { top: M + 20, right: M + 22, duration: .8 }, 0)
          .fromTo(slider, { yPercent: 0 }, { yPercent: -50, duration: .5 }, 0);
      }
      tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: .6, ease: "power2.out" }, 0)
        .add(() => layer.classList.add("is-shown"), .25)
        .fromTo(els, { opacity: 0, rotateX: 90, y: 60, x: -16, transformPerspective: 400, transformOrigin: "50% 100%" },
          { opacity: 1, rotateX: 0, y: 0, x: 0, duration: .65, ease: "back.out(1.2)", stagger: .05 }, .45);
      tl.timeScale(ctx.reduced ? 20 : 1);
      firstField().focus({ preventScroll: true });
    }

    function hide() {
      layer.classList.remove("is-shown");
      gsap.set(qa(".rs-head > *, .rs-step > legend, .rs-scroll > *, .rs-actions, .rs-foot"), { clearProps: "all" });
      gsap.set([panel, btn, slider, layer], { clearProps: "all" });
      document.documentElement.classList.remove("is-booking-open");
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      layer.classList.remove("is-open");
      ctx.setMenuOpen(false);
      lenis.start();
      tl.timeScale(ctx.reduced ? 20 : 1.5).reverse();
      if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    }

    ctx.openBooking = open;
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

    // la pastille se cache tant que le bouton du hero est à l'écran, puis sur le CTA final et le pied de page
    const away = new Set();
    const watch = (el, opts) => el && new IntersectionObserver(([e]) => {
      e.isIntersecting ? away.add(el) : away.delete(el);
      fab.classList.toggle("is-away", away.size > 0);
    }, opts).observe(el);
    watch(document.querySelector("[data-hero-cta]"));
    document.querySelectorAll("#s-cta, #s-footer").forEach(h => watch(h, { threshold: .2 }));

    go(1, false);
  },
});
