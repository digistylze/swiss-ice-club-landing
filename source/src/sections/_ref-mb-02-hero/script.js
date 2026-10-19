/* Hero Animations #26 « Outfit reveal ». Mécanisme du catalogue : six photos inclinées (7,5 / -2,5 / -10 / 12,5 / -5 / 5 deg)
   grandissent en s'ouvrant (clip-path 20 % -> 0 %, ease « hop », décalage 0,2 s) ; le nom monte lettre à lettre dans un ordre
   aléatoire, compteur 000 -> 100 ; à 3,25 s tout ressort, les photos se referment (décalage inversé), le voile remonte
   (clip-path vers le haut) et le mot du hero arrive lettre à lettre. Adapté : mot « IGNIS » rouge géant, puis titre, offre et photo ;
   ?pre=0 saute le préchargement (QA) ; mouvement réduit = état final direct. */
SECTIONS.push({
  id: "hero",
  init(ctx) {
    const { gsap, lenis } = ctx;
    const root = document.getElementById("s-hero");
    if (!root) return;
    const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
    CustomEase.create("hop", "0.8, 0, 0.2, 1");
    CustomEase.create("hop2", "0.9, 0, 0.1, 1");

    // mot géant : une boîte par lettre (le parent rogne, chaque lettre monte depuis dessous)
    const word = $(".hero__word");
    const txt = word.textContent.trim();
    word.textContent = "";
    const chars = [...txt].map(ch => { const s = document.createElement("span"); s.className = "ch"; s.textContent = ch; word.appendChild(s); return s; });

    // taille du mot : toute la largeur du conteneur, sans dépasser ~38 % de la hauteur d'écran (desktop) pour garder l'offre visible
    const fit = () => {
      word.style.fontSize = "100px"; word.style.justifyContent = "flex-start";
      const w = chars[chars.length - 1].getBoundingClientRect().right - chars[0].getBoundingClientRect().left;
      const byW = 100 * word.clientWidth / w * .985;
      const byH = ctx.isMobile() ? Infinity : innerHeight * (innerHeight < 720 ? .32 : .38) / .74;   // hauteur de capitale d'Archivo ≈ 0,74 em
      word.style.fontSize = Math.min(byW, byH, 520) + "px"; word.style.justifyContent = "";
    };
    fit();
    let rw = innerWidth;
    addEventListener("resize", () => { if (innerWidth !== rw || !ctx.isMobile()) { rw = innerWidth; fit(); } });

    const name = new SplitText($(".pre__name"), { type: "chars", mask: "chars" });
    const tw = $$(".hero__tw");
    const count = $(".pre__count p");
    const imgs = $$(".pre__img");
    const copy = [$(".hero__title"), $(".hero__lead"), $(".hero__actions")];
    const media = $(".hero__media");

    const finish = () => { document.documentElement.classList.add("is-pre-off"); lenis.start(); };
    if (ctx.reduced || /[?&]pre=0\b/.test(location.search)) { ctx.introDone(); finish(); return; }

    lenis.stop();
    scrollTo(0, 0);

    const rot = [7.5, -2.5, -10, 12.5, -5, 5];
    gsap.set(imgs, { xPercent: -50, yPercent: -50, rotate: i => rot[i], scale: 0 });
    gsap.set(name.chars, { yPercent: 100 });
    gsap.set(count, { yPercent: 100 });
    gsap.set(chars, { yPercent: 105 });
    gsap.set(tw, { yPercent: 110 });
    gsap.set(copy, { autoAlpha: 0, y: 26 });
    gsap.set(media, { clipPath: "inset(100% 0% 0% 0%)" });

    const n = { v: 0 };
    gsap.timeline({ delay: .4 })
      .to(imgs, { scale: 1, clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", duration: 1, ease: "hop", stagger: .2 })
      .to(name.chars, { yPercent: 0, duration: 1, ease: "hop2", stagger: { each: .1, from: "random" } }, .35)
      .to(count, { yPercent: 0, duration: 1, ease: "hop2" }, "<")
      .to(n, { v: 100, duration: 2, ease: "power2.inOut", onUpdate: () => (count.textContent = String(Math.round(n.v)).padStart(3, "0")) }, .85)
      .to(count, { yPercent: -100, duration: .75, ease: "hop2" }, 3.25)
      .to(name.chars, { yPercent: -100, duration: .75, ease: "hop2", stagger: { each: .1, from: "random" } }, 3.25)
      .to(imgs, { scale: 0, clipPath: "polygon(20% 20%, 80% 20%, 80% 80%, 20% 80%)", duration: 1, ease: "hop2", stagger: -.075 }, 3.5)
      .to($(".pre"), { clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)", duration: 1, ease: "hop2" }, 4.35)
      .add(() => ctx.introDone(), 4.6)
      .to(chars, { yPercent: 0, duration: 1.1, ease: "hop", stagger: { each: .08, from: "random" } }, 4.65)
      .to(tw, { yPercent: 0, duration: 1, ease: "hop", stagger: .06 }, 4.8)
      .to(media, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "hop" }, 4.85)
      .to(copy, { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out", stagger: .1 }, 5.05)
      .add(finish, 5.4);
  },
});
