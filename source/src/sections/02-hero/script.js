// ---------- Hero + préchargement : le bain froid du club, en WebGL ----------
// Une seule scène three.js. Pendant le chargement : le bain vu du dessus, l'eau qui frissonne, compteur à rouleaux
// (Hero Animations #8) et température qui descend. Prêt : une femme (modèle riggé, clip d'animation) arrive par le haut,
// monte l'escabeau et entre dans l'eau ; la caméra descend devant le bain ; les informations apparaissent autour,
// reliées au bain par des filets ; le texte du hero se pose à gauche. Ensuite : respiration, eau, vapeur, parallaxe.
// QA : ?pre=99 saute l'intro ; ?pre=<s> fige le clip à s secondes ; ?pre=l0.4 fige le chargement à 40 %.
SECTIONS.push({
  id: "hero",
  init(ctx) {
    const { gsap, THREE, lenis } = ctx;
    const sec = document.getElementById("s-hero");
    if (!sec) return;
    const pre = sec.querySelector(".hr-pre");
    const canvas = sec.querySelector(".hr-gl");
    const title = sec.querySelector(".hr-title");
    const parts = [".hr-eyebrow", ".hr-lead", ".hr-ctas", ".hr-price", ".hr-proof", ".hr-scroll"].map(s => sec.querySelector(s));
    const tags = [...sec.querySelectorAll(".hr-tag")];
    const svgG = sec.querySelector(".hr-lines g");
    const q = new URLSearchParams(location.search);
    const preParam = q.get("pre");
    const freezeLoad = preParam && preParam.startsWith("l") ? +preParam.slice(1) : null;
    const freezeClip = preParam && !preParam.startsWith("l") && +preParam < 99 ? +preParam : null;
    const skipAll = ctx.reduced || (preParam && !preParam.startsWith("l") && +preParam >= 99);

    // ---------- dimensions (mètres) : le bain bas du club, d'après les photos ----------
    const R_OUT = .48, R_IN = .435, RIM_Y = .70, WATER_Y = .62, SHELL_H = .69;
    const WOMAN_AT = new THREE.Vector3(-.15, 0, -1.62);   // décalage du clip pour qu'elle finisse au centre du bain
    const CLIP_END = 9.95, SPEED = 1.22;                  // durée du clip (s) et vitesse de lecture
    const CAM_FROM = 6.35, CAM_TO = 9.35;                 // descente de la caméra (temps du clip)
    const TAGS_AT = 8.55, COPY_AT = 8.95, DONE_AT = 9.4;
    const DEG = Math.PI / 180;
    const clamp01 = v => Math.min(1, Math.max(0, v));
    const smooth = t => { t = clamp01(t); return t * t * (3 - 2 * t); };
    const inOut = t => { t = clamp01(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    const lerp = (a, b, t) => a + (b - a) * t;

    // ---------- sortie de l'intro ----------
    let split = null, copyShown = false, finished = false;
    const showCopy = (instant) => {
      if (copyShown) return; copyShown = true;
      sec.classList.add("is-posed");
      gsap.set([copy(), ...parts], { visibility: "visible" });
      if (instant || ctx.reduced) { gsap.set([title, ...parts], { autoAlpha: 1, y: 0 }); return; }
      if (window.SplitText) {
        split = new SplitText(title, { type: "lines", mask: "lines", linesClass: "hr-line", maskClass: "hr-line-mask" });
        gsap.from(split.lines, { yPercent: 108, duration: 1.15, ease: "expo.out", stagger: .1, onComplete: () => split.revert() });
      }
      gsap.set(title, { autoAlpha: 1 });
      gsap.fromTo(parts, { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .9, ease: "power3.out", stagger: .08, delay: .2, clearProps: "transform" });
    };
    function copy() { return sec.querySelector(".hr-copy"); }
    const finish = () => {
      if (finished) return; finished = true;
      document.querySelectorAll("main > :not(#s-hero), #s-nav").forEach(el => (el.inert = false));
      sec.querySelectorAll("button, a").forEach(el => (el.inert = false));
      lenis.start();
      ctx.introDone();
      gsap.to(pre, { autoAlpha: 0, duration: .6, ease: "power2.out", onComplete: () => pre.remove() });
    };

    // ---------- rendu ----------
    let renderer = null;
    try {
      if (!THREE || !THREE.GLTFLoader) throw new Error("three absent");
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
      if (!renderer.getContext()) throw new Error("contexte WebGL absent");
    } catch (err) {
      console.warn("bain WebGL indisponible, photo à la place :", err.message);
      renderer = null;
    }
    if (!renderer) {
      sec.classList.add("is-nogl");
      pre && pre.remove();
      tags.forEach(t => (t.style.display = "none"));
      showCopy(true);
      finish();
      return;
    }

    // pendant l'intro : page bloquée en haut, rien d'autre de focalisable
    if (!skipAll) {
      document.querySelectorAll("main > :not(#s-hero), #s-nav").forEach(el => (el.inert = true));
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      scrollTo(0, 0);
      lenis.stop();
      gsap.set([title, ...parts], { autoAlpha: 0 });
    }

    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, .05, 60);
    const pmrem = new THREE.PMREMGenerator(renderer);
    // environnement : une pièce sombre, une grande boîte à lumière décalée au plafond, une bande froide à gauche, une
    // boîte basse en face (reflets de la cuve vue de face) ; vu du dessus, l'eau reflète surtout du noir
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.BoxGeometry(24, 24, 24), new THREE.MeshBasicMaterial({ color: 0x08090a, side: THREE.BackSide })));
    const panel = (w, h, rgb, pos, rot) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
      m.material.color.setRGB(...rgb); m.position.set(...pos); m.rotation.set(...rot); envScene.add(m);
    };
    panel(7, 2.4, [2.4, 2.3, 2.15], [3.4, 10, 3.6], [Math.PI / 2, 0, 0]);
    panel(1.1, 8, [.55, .75, .9], [-10, 2.5, -1.5], [0, Math.PI / 2, 0]);
    panel(7, 1.6, [1.3, 1.25, 1.2], [0, 2.6, 10], [0, Math.PI, 0]);
    panel(2.2, 2.2, [.9, .95, 1], [-3, 10, -4], [Math.PI / 2, 0, 0]);
    scene.environment = pmrem.fromScene(envScene, .035).texture;

    // lumières : une douche de lumière au-dessus du bain, un contre-jour froid, un fond très bas
    const key = new THREE.SpotLight(0xfff3e6, 78, 0, .5, .9, 2);
    key.position.set(.9, 4.4, 1.5); key.target.position.set(0, .45, 0);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0004; key.shadow.normalBias = .02;
    key.shadow.camera.near = 1; key.shadow.camera.far = 9;
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0xbfe2f0, 1.5); rim.position.set(-1.6, 2.4, -2.6); scene.add(rim);
    const fill = new THREE.HemisphereLight(0xdfe8ee, 0x1a1c1f, .6); scene.add(fill);
    // lumière douce de face, à hauteur du visage : n'éclaire que la scène de face (pas d'ombre)
    const face = new THREE.PointLight(0xffeee2, 0, 6, 2); face.position.set(.5, 1.35, 1.9); scene.add(face);

    // ---------- textures dessinées (logo du bain, bois, sol, vapeur) ----------
    const canvasTex = (w, h, draw, srgb = true) => {
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      draw(c.getContext("2d"), w, h);
      const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return t;
    };
    // le logo des bains : goutte au trait blanc, disque blanc, flocon noir, « SWISS » et « ICE CLUB » sur l'arc
    const emblemTex = canvasTex(1024, 1280, (g, w, h) => {
      const cx = w / 2, cy = h * .6, R = w * .4;
      const tipY = cy - R * 1.62;
      g.strokeStyle = "#F2F4F5"; g.fillStyle = "#F2F4F5"; g.lineWidth = R * .045; g.lineJoin = "round";
      // goutte : cercle + deux tangentes vers la pointe
      const d = cy - tipY, a = Math.asin(R / d);
      g.beginPath();
      g.moveTo(cx, tipY);
      g.arc(cx, cy, R, -Math.PI / 2 - (Math.PI / 2 - a), -Math.PI / 2 + (Math.PI / 2 - a), true);
      g.closePath(); g.stroke();
      // disque et flocon
      const r = R * .6;
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#0E0F11"; g.lineCap = "round";
      for (let k = 0; k < 6; k++) {
        const an = k * Math.PI / 3 - Math.PI / 2, L = r * .86;
        const ux = Math.cos(an), uy = Math.sin(an);
        g.lineWidth = r * .07;
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + ux * L, cy + uy * L); g.stroke();
        g.lineWidth = r * .05;
        for (let j = 1; j <= 5; j++) {
          const s = L * (.22 + j * .14), bl = L * (.3 - j * .035);
          const bx = cx + ux * s, by = cy + uy * s;
          for (const sg of [-1, 1]) {
            const ba = an + sg * 42 * DEG;
            g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(ba) * bl, by + Math.sin(ba) * bl); g.stroke();
          }
        }
      }
      // lettrage sur l'arc entre le disque et la goutte
      g.fillStyle = "#F2F4F5";
      g.font = `600 ${Math.round(R * .2)}px "Instrument Sans", Arial, sans-serif`;
      g.textAlign = "center"; g.textBaseline = "middle";
      const ring = (txt, mid, span, rr, up) => {
        const chars = [...txt];
        chars.forEach((ch, i) => {
          const an = mid + (i - (chars.length - 1) / 2) * span * (up ? 1 : -1);
          g.save(); g.translate(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr);
          g.rotate(an + (up ? Math.PI / 2 : -Math.PI / 2)); g.fillText(ch, 0, 0); g.restore();
        });
      };
      ring("SWISS", -Math.PI / 2, .3, R * .8, true);
      ring("ICE CLUB", Math.PI / 2, .245, R * .8, false);
    });
    const woodTex = canvasTex(512, 128, (g, w, h) => {
      g.fillStyle = "#A8743F"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        const y = Math.random() * h, a = .05 + Math.random() * .12;
        g.strokeStyle = Math.random() < .5 ? `rgba(70,38,14,${a})` : `rgba(230,180,120,${a * .7})`;
        g.lineWidth = .6 + Math.random() * 2.4;
        g.beginPath(); g.moveTo(0, y);
        for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * .02 + i) * 2.2);
        g.stroke();
      }
    });
    const floorAlpha = canvasTex(512, 512, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, "#fff"); gr.addColorStop(.42, "#cfcfcf"); gr.addColorStop(.78, "#3a3a3a"); gr.addColorStop(1, "#000");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, false);
    const mistTex = canvasTex(128, 128, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.45, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });

    // ---------- matériaux ----------
    const matte = new THREE.MeshPhysicalMaterial({ color: 0x0f1012, roughness: .58, metalness: 0, clearcoat: .25, clearcoatRoughness: .5, envMapIntensity: .55 });
    const inox = new THREE.MeshPhysicalMaterial({ color: 0xc3c9ce, roughness: .26, metalness: 1, envMapIntensity: 1.05 });
    const inoxIn = new THREE.MeshPhysicalMaterial({ color: 0x9ea6ac, roughness: .34, metalness: 1, envMapIntensity: .8, side: THREE.BackSide });
    const oak = new THREE.MeshStandardMaterial({ map: woodTex, roughness: .62, envMapIntensity: .5 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: .9, metalness: 0, alphaMap: floorAlpha, transparent: true, envMapIntensity: .3 });
    const emblemMat = new THREE.MeshStandardMaterial({ map: emblemTex, transparent: true, roughness: .5, envMapIntensity: .4, polygonOffset: true, polygonOffsetFactor: -2 });

    // eau : surface physique (reflets de l'environnement) dont la normale suit des vagues et des ondes circulaires
    const U = { uTime: { value: 0 }, uRip: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, -99, 0)) } };
    const water = new THREE.MeshPhysicalMaterial({ color: 0x0a1a20, roughness: .05, metalness: 0, transparent: true, opacity: .86, envMapIntensity: 1.25, depthWrite: false });
    water.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;")
        .replace("#include <fog_vertex>", "#include <fog_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;\nuniform float uTime;\nuniform vec4 uRip[6];")
        .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
          vec2 p = vWPos.xz; float hx = 0.0, hz = 0.0;
          vec2 k1 = vec2(13.0, 5.0), k2 = vec2(-7.0, 15.0), k3 = vec2(21.0, -17.0);
          float a1 = .0011, a2 = .0009, a3 = .0005;
          float f1 = dot(k1, p) - 1.7 * uTime, f2 = dot(k2, p) - 1.3 * uTime, f3 = dot(k3, p) - 2.4 * uTime;
          hx += a1 * k1.x * cos(f1) + a2 * k2.x * cos(f2) + a3 * k3.x * cos(f3);
          hz += a1 * k1.y * cos(f1) + a2 * k2.y * cos(f2) + a3 * k3.y * cos(f3);
          for (int i = 0; i < 6; i++) {
            vec4 R = uRip[i]; float age = uTime - R.z;
            if (age > 0.0 && age < 6.0) {
              vec2 dd = p - R.xy; float dist = length(dd) + 1e-4;
              float front = smoothstep(age * .34 + .03, age * .34 - .05, dist);
              float env = R.w * exp(-age * 1.0) * exp(-dist * 2.2) * front;
              float g = env * 22.0 * cos(dist * 22.0 - age * 7.0);
              hx += g * dd.x / dist; hz += g * dd.y / dist;
            }
          }
          vec3 nW = normalize(vec3(-hx, 1.0, -hz));
          normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);`);
    };
    let ripI = 0;
    const ripple = (x, z, amp) => { U.uRip.value[ripI % 6].set(x, z, U.uTime.value, amp); ripI++; };

    // ---------- le bain (et deux autres dans la pénombre) ----------
    const makeTub = (withEmblem) => {
      const g = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(R_OUT, R_OUT, SHELL_H, 128, 1, true), matte);
      shell.position.y = SHELL_H / 2; shell.castShadow = true; shell.receiveShadow = true; g.add(shell);
      const lip = new THREE.Mesh(new THREE.TorusGeometry((R_OUT + R_IN) / 2, (R_OUT - R_IN) / 2, 18, 128), inox);
      lip.rotation.x = Math.PI / 2; lip.position.y = RIM_Y - (R_OUT - R_IN) / 2 + .004; lip.castShadow = true; g.add(lip);
      const liner = new THREE.Mesh(new THREE.CylinderGeometry(R_IN, R_IN, RIM_Y - .03, 96, 1, true), inoxIn);
      liner.position.y = (RIM_Y - .03) / 2 + .03; g.add(liner);
      const bottom = new THREE.Mesh(new THREE.CircleGeometry(R_IN, 64), new THREE.MeshPhysicalMaterial({ color: 0x8d959b, metalness: 1, roughness: .4 }));
      bottom.rotation.x = -Math.PI / 2; bottom.position.y = .035; g.add(bottom);
      const surf = new THREE.Mesh(new THREE.CircleGeometry(R_IN - .002, 96), water);
      surf.rotation.x = -Math.PI / 2; surf.position.y = WATER_Y; surf.renderOrder = 2; g.add(surf);
      if (withEmblem) {
        const W = .7;   // largeur angulaire (rad) du logo sur le fût
        const em = new THREE.Mesh(new THREE.CylinderGeometry(R_OUT + .0015, R_OUT + .0015, .44, 48, 1, true, -W / 2, W), emblemMat);
        em.position.y = .36; g.add(em);
      }
      // escabeau : deux joues noires en triangle, deux marches en chêne, côté -z
      const sideShape = new THREE.Shape(); sideShape.moveTo(0, 0); sideShape.lineTo(.52, 0); sideShape.lineTo(0, .52); sideShape.closePath();
      const sideGeo = new THREE.ExtrudeGeometry(sideShape, { depth: .022, bevelEnabled: false });
      for (const sx of [-.21, .21]) {
        const s = new THREE.Mesh(sideGeo, matte);
        s.rotation.y = Math.PI / 2; s.position.set(sx + .011, 0, -R_OUT - .005); s.castShadow = true; s.receiveShadow = true; g.add(s);
      }
      for (const [y, u0, u1] of [[.23, .27, .49], [.46, .04, .26]]) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(.4, .028, u1 - u0), oak);
        st.position.set(0, y - .014, -R_OUT - .005 - (u0 + u1) / 2); st.castShadow = true; st.receiveShadow = true; g.add(st);
      }
      return g;
    };
    const tub = makeTub(true); scene.add(tub);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

    // glaçons et glace pilée qui flottent, poussés quand elle entre
    const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xeaf6fb, roughness: .14, metalness: 0, transmission: .92, thickness: .05, ior: 1.31, envMapIntensity: 1.2 });
    const ICE = [];
        // cube arrondi : chaque sommet est ramené dans un cube intérieur puis repoussé du rayon d'arrondi
    const roundedBox = (s, rr, seg) => {
      const g = new THREE.BoxGeometry(s, s, s, seg, seg, seg), pos = g.attributes.position, h = s / 2 - rr, v = new THREE.Vector3(), c = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i); c.set(Math.max(-h, Math.min(h, v.x)), Math.max(-h, Math.min(h, v.y)), Math.max(-h, Math.min(h, v.z)));
        v.sub(c).normalize().multiplyScalar(rr).add(c); pos.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals(); return g;
    };
    const iceGeoBig = roundedBox(.042, .008, 4), iceGeoSmall = new THREE.IcosahedronGeometry(.012, 0);
    const addIce = (geo, n, s0, s1) => {
      const m = new THREE.InstancedMesh(geo, iceMat, n); m.renderOrder = 3; tub.add(m);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * (R_IN - .06);
        ICE.push({ m, i, x: Math.cos(a) * rr, z: Math.sin(a) * rr, vx: 0, vz: 0, s: lerp(s0, s1, Math.random()),
          sx: .8 + Math.random() * .5, sy: .6 + Math.random() * .5, sz: .8 + Math.random() * .5,
          rx: Math.random() * 6, ry: Math.random() * 6, ph: Math.random() * 6, w: .6 + Math.random() * .8 });
      }
      return m;
    };
    addIce(iceGeoBig, 12, .8, 1.25); addIce(iceGeoSmall, 40, .7, 1.4);
    const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3(), E3 = new THREE.Euler();
    const LQ = new THREE.Quaternion(), PQ = new THREE.Quaternion(), ZF = new THREE.Vector3(0, 0, 1);

    // vapeur froide au ras de l'eau
    const MIST = Array.from({ length: 16 }, (_, i) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0, color: 0xdfeef5 }));
      sp.renderOrder = 4; tub.add(sp);
      return { sp, t: Math.random(), life: 5 + Math.random() * 4, a: Math.random() * 6.28, r: Math.random() * .34, s: .22 + Math.random() * .25 };
    });

    // ---------- la femme (glTF embarqué en base64) ----------
    const holder = new THREE.Group(); holder.position.copy(WOMAN_AT); holder.visible = false; scene.add(holder);
    let mixer = null, action = null, bones = {}, rest = {};
    const loadWoman = () => new Promise((resolve, reject) => {
      const b64 = window.WOMAN_GLB;
      if (!b64) return reject(new Error("modèle absent"));
      const bin = atob(b64), buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      const loader = new THREE.GLTFLoader(); loader.setMeshoptDecoder(THREE.MeshoptDecoder);
      loader.parse(buf.buffer, "", gltf => {
        const w = gltf.scene;
        w.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; if (o.material) { o.material.envMapIntensity = .7; o.material.roughness = .62; } } });
        holder.add(w);
        ["Hips", "Head", "neck", "Spine02", "RightArm", "LeftArm", "LeftFoot", "RightFoot"].forEach(n => (bones[n] = w.getObjectByName(n)));
        rest.head = bones.Head.quaternion.clone(); rest.neck = bones.neck.quaternion.clone();
        w.updateMatrixWorld(true); rest.headWorld = bones.Head.getWorldQuaternion(new THREE.Quaternion());
        mixer = new THREE.AnimationMixer(w);
        action = mixer.clipAction(gltf.animations[0]); action.setLoop(THREE.LoopRepeat); action.play();
        resolve();
      }, reject);
    });

    // ---------- chronologie déterministe (temps du clip r) ----------
    // descente dans le bain : le clip la fait monter sur une marche puis s'agenouiller ; on l'abaisse pendant l'enjambée
    const offY = r => -.55 * smooth((r - 5.75) / .85) - .13 * smooth((r - 7.3) / 1.7);
    const S = { r: 0, mx: 0, my: 0, scroll: 0 };
    const camAt = (r, tNow) => {
      const k = inOut((r - CAM_FROM) / (CAM_TO - CAM_FROM));
      const top = smooth(r / 6.2);
      const mob = innerWidth <= 768;
      const aspect = innerWidth / innerHeight;
      // dessus : léger quart de tour pendant qu'elle arrive ; face : un peu de trois quarts
      const theta = lerp(lerp(26, 4, top), -11, k) * DEG + (finished ? S.mx * 4 * DEG : 0);
      const beta = lerp(89.5, 12, k) * DEG + (finished ? -S.my * 1.6 * DEG : 0);
      const tanV = Math.tan(camera.fov * DEG / 2);
      // distance : vu du dessus, ~1,2 m de part et d'autre du bain ; de face, ~0,8 m (desktop) ; sur mobile, la largeur décide
      // pendant le chargement le bain remplit l'écran, puis la caméra prend du champ quand elle arrive
      const zoomOut = smooth(r / 1.9), settle = smooth((r - 2.2) / 4);
      const Rtop = (mob ? Math.max(1.3 / tanV, .62 / (tanV * aspect)) : lerp(1.3, 1.18, settle) / tanV) * lerp(.62, 1, zoomOut);
      // de face : le bain fait ~27 % de la largeur (desktop) ou ~56 % (mobile), et le sujet moins de la moitié de la hauteur
      const Rfront = mob ? Math.max(.96 / (.56 * 2 * tanV * aspect), 1.0 / (.3 * 2 * tanV)) : Math.max(.96 / (.31 * 2 * tanV * aspect), 1.0 / (.52 * 2 * tanV));
      const R = lerp(Rtop, Rfront, k) * (1 - S.scroll * .08);
      const tx = 0, ty = lerp(0, .55, k), tz = lerp(mob ? .05 : -.08, 0, k);
      const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), theta);
      const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -beta);
      const qc = qy.multiply(qx);
      camera.quaternion.copy(qc);
      camera.position.set(0, 0, R).applyQuaternion(qc).add(V3.set(tx, ty, tz));
      // cadrage : bain au centre vu du dessus ; à droite (desktop) ou en haut (mobile) une fois de face
      const W = innerWidth, H = innerHeight;
      const ox = mob ? 0 : -.14 * W * k, oy = mob ? .22 * H * k : 0;
      camera.setViewOffset(W, H, ox, oy, W, H);
      face.intensity = 2.2 * k;
      sec.style.setProperty("--hx", mob ? "50%" : (50 + 14 * k).toFixed(1) + "%");
      return k;
    };

    // pose de la femme et de l'eau pour un instant r (temps du clip) ; t = temps réel
    let lastRippleR = -1;
    const RIPPLES = [[5.0, .02, -.18, .26], [6.15, -.03, -.12, .4], [6.6, .06, .02, .28], [7.9, .02, .08, .36], [8.6, -.04, .1, .22]];
    const poseAt = (r, t) => {
      if (!mixer) return;
      holder.visible = r > .02;
      const rc = Math.min(r, CLIP_END);
      action.time = rc; mixer.update(0);
      holder.position.y = offY(rc);
      // la tête revient droite quand elle est dans l'eau (le clip la fait regarder vers le haut)
      const w = smooth((rc - 7.3) / 1.7);
      if (w > 0) {
        bones.neck.quaternion.slerp(rest.neck, w * .6);
        // la tête se tourne doucement vers la caméra (regard posé, pas fixe : 75 % du chemin)
        holder.updateMatrixWorld(true);
        bones.Head.getWorldPosition(V3);
        const dir = S3.copy(camera.position).sub(V3).normalize();
        LQ.setFromUnitVectors(ZF, dir).multiply(rest.headWorld);
        bones.Head.parent.getWorldQuaternion(PQ).invert();
        LQ.premultiply(PQ);
        bones.Head.quaternion.slerp(LQ, w * .75);
      }
      // respiration une fois installée
      if (r >= CLIP_END - .05 && bones.Spine02) {
        const br = Math.sin(t * 1.35);
        bones.Spine02.rotation.x += br * .012;
        holder.position.y += br * .0035;
      }
      // ondes à l'entrée dans l'eau
      for (const [at, x, z, a] of RIPPLES) if (r >= at && lastRippleR < at) ripple(x, z, a);
      lastRippleR = r;
    };

    // ---------- étiquettes : ancres 3D projetées, filets SVG ----------
    const NS = "http://www.w3.org/2000/svg";
    const tagEls = tags.map(el => {
      const line = document.createElementNS(NS, "line"), dot = document.createElementNS(NS, "circle"), ring = document.createElementNS(NS, "circle");
      dot.setAttribute("r", "3"); ring.setAttribute("r", "9"); ring.setAttribute("class", "hr-ring");
      svgG.append(line, ring, dot);
      return { el, line, dot, ring, key: el.dataset.anchor, w: 0, h: 0 };
    });
    const measureTags = () => { tagEls.forEach(o => { o.w = o.el.offsetWidth; o.h = o.el.offsetHeight; }); };
    // ancres : la tête (respiration), l'épaule droite (durée), l'eau, le bord inox
    const anchorWorld = key => {
      if (key === "breath" && bones.Head) { bones.Head.getWorldPosition(V3); return V3.add(S3.set(-.04, .09, .02)); }
      if (key === "time" && bones.Head) { bones.Head.getWorldPosition(V3); return V3.add(S3.set(.1, -.01, .03)); }
      if (key === "water") return V3.set(.29, WATER_Y + .012, .06);
      return V3.set(R_IN * .62, RIM_Y + .012, R_IN * .8);
    };
    const toScreen = v => {
      const p = v.clone().project(camera);
      return [(p.x * .5 + .5) * innerWidth, (-p.y * .5 + .5) * innerHeight];
    };
    // emprise du bain à l'écran (bord et pied, 16 points)
    const tubBox = () => {
      let l = 1e9, rgt = -1e9, t = 1e9, btm = -1e9;
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2;
        for (const y of [0, RIM_Y]) {
          const [x, yy] = toScreen(S3.set(Math.cos(a) * R_OUT, y, Math.sin(a) * R_OUT));
          l = Math.min(l, x); rgt = Math.max(rgt, x); t = Math.min(t, yy); btm = Math.max(btm, yy);
        }
      }
      return { l, r: rgt, t, b: btm };
    };
    let copyRect = null;
    const placeTags = r => {
      const mob = innerWidth <= 768, W = innerWidth;
      const box = tubBox();
      const pos = {};
      tagEls.forEach(o => {
        const [ax, ay] = toScreen(anchorWorld(o.key)); pos[o.key] = { ax, ay };
      });
      if (mob) {
        // mobile : deux étiquettes de chaque côté du bain, largeur = la place disponible
        const roomL = Math.max(70, box.l - 22), roomR = Math.max(70, W - box.r - 22);
        const slot = { breath: ["left", box.t - 34], rim: ["left", pos.rim.ay + 26], time: ["right", box.t - 34], water: ["right", pos.water.ay + 30] };
        tagEls.forEach(o => {
          const [side, y] = slot[o.key]; o.el.style.maxWidth = (side === "left" ? roomL : roomR) + "px";
          o.side = side; o.y = y;
        });
      } else {
        // desktop : trois étiquettes à droite du bain, la respiration au-dessus du texte, à gauche de la tête
        const slot = { breath: ["left", pos.breath.ay - 70], time: ["right", pos.time.ay - 40], water: ["right", pos.water.ay + 4], rim: ["right", pos.rim.ay + 40] };
        tagEls.forEach(o => { const [side, y] = slot[o.key]; o.side = side; o.y = y; o.el.style.maxWidth = ""; });
      }
      measureTags();
      // même ordre que les ancres, espacement minimal : les filets ne se croisent pas
      for (const side of ["left", "right"]) {
        const col = tagEls.filter(o => o.side === side).sort((a, b) => pos[a.key].ay - pos[b.key].ay);
        const ys = col.map(o => o.y).sort((a, b) => a - b);
        col.forEach((o, i) => (o.y = ys[i]));
        for (let i = 1; i < col.length; i++) col[i].y = Math.max(col[i].y, col[i - 1].y + col[i - 1].h + 18);
      }
      tagEls.forEach((o, i) => {
        const pr = clamp01((r - TAGS_AT - i * .16) / .55);
        if (pr <= 0) { o.el.style.visibility = "hidden"; o.line.style.opacity = o.dot.style.opacity = o.ring.style.opacity = 0; return; }
        const { ax, ay } = pos[o.key];
        const side = o.side;
        let x;
        if (mob) x = side === "left" ? Math.max(10, box.l - 12 - o.w) : Math.min(W - 10 - o.w, box.r + 12);
        else x = side === "left" ? ax - 120 - o.w : box.r + 46;
        let y = o.y;
        if (!mob && copyRect && side === "left" && y + o.h > copyRect.top - 20) y = copyRect.top - 20 - o.h;
        x = Math.max(10, Math.min(W - o.w - 10, x)); y = Math.max(mob ? 64 : 92, y);
        const ex = side === "left" ? x + o.w + 10 : x - 10, ey = y + Math.min(o.h / 2, 13);
        const k = smooth(pr * 1.6);
        o.line.setAttribute("x1", ax); o.line.setAttribute("y1", ay);
        o.line.setAttribute("x2", ax + (ex - ax) * k); o.line.setAttribute("y2", ay + (ey - ay) * k);
        [o.dot, o.ring].forEach(c => { c.setAttribute("cx", ax); c.setAttribute("cy", ay); });
        o.line.style.opacity = 1; o.dot.style.opacity = Math.min(1, pr * 3); o.ring.style.opacity = Math.min(.9, pr * 2) * (.6 + .4 * Math.sin(U.uTime.value * 2 + i));
        const tp = smooth((pr - .45) / .55);
        o.el.dataset.side = side;
        o.el.style.visibility = tp > 0 ? "visible" : "hidden";
        o.el.style.opacity = tp;
        o.el.style.transform = `translate3d(${x + (side === "left" ? 1 : -1) * (1 - tp) * 14}px, ${y}px, 0)`;
      });
    };

    // ---------- glace et vapeur ----------
    const stepIce = (dt, r) => {
      let hx = 99, hz = 99;
      if (bones.Hips && r > 5.6) { bones.Hips.getWorldPosition(V3); hx = V3.x; hz = V3.z; }
      const t = U.uTime.value;
      for (const c of ICE) {
        // pousse hors du corps, rebondit sur la cuve, frottement de l'eau
        const dx = c.x - hx, dz = c.z - hz, d = Math.hypot(dx, dz);
        const body = .2;
        if (d < body) { const f = (body - d) * 6; c.vx += dx / (d + 1e-4) * f * dt * 10; c.vz += dz / (d + 1e-4) * f * dt * 10; }
        c.vx += Math.sin(t * .3 + c.ph) * .0006; c.vz += Math.cos(t * .27 + c.ph) * .0006;
        c.vx *= .94; c.vz *= .94;
        c.x += c.vx * dt * 8; c.z += c.vz * dt * 8;
        const rr = Math.hypot(c.x, c.z), lim = R_IN - .04 * c.s;
        if (rr > lim) { c.x *= lim / rr; c.z *= lim / rr; c.vx *= -.4; c.vz *= -.4; }
        const bob = Math.sin(t * c.w + c.ph) * .004;
        E3.set(c.rx + Math.sin(t * .2 + c.ph) * .2, c.ry + t * .05 * c.w, 0);
        Q4.setFromEuler(E3);
        M4.compose(V3.set(c.x, WATER_Y + .004 + bob, c.z), Q4, S3.set(c.s * c.sx, c.s * c.sy, c.s * c.sz));
        c.m.setMatrixAt(c.i, M4);
      }
      ICE.forEach(c => (c.m.instanceMatrix.needsUpdate = true));
      for (const m of MIST) {
        m.t += dt / m.life;
        if (m.t > 1) { m.t = 0; m.a = Math.random() * 6.28; m.r = Math.random() * .34; }
        const e = Math.sin(Math.PI * m.t);
        m.sp.position.set(Math.cos(m.a) * m.r, WATER_Y + .02 + m.t * .26, Math.sin(m.a) * m.r);
        const s = m.s * (.7 + m.t * .9); m.sp.scale.set(s, s, 1);
        m.sp.material.opacity = e * .13;
      }
    };

    // ---------- compteur à rouleaux (Hero #8) et température ----------
    const digits = pre.querySelector(".hr-pre__digits");
    const cols = [0, 1, 2].map(() => {
      const c = document.createElement("span"); c.className = "hr-pre__col";
      c.innerHTML = "<span>" + "0123456789".split("").map(n => `<span>${n}</span>`).join("") + "</span>";
      digits.appendChild(c); return c;
    });
    const tempEl = pre.querySelector(".hr-pre__temp b");
    let shown = -1;
    const setPct = p => {
      if (p === shown) return; shown = p;
      const ds = [Math.floor(p / 100), Math.floor(p / 10) % 10, p % 10];
      cols[0].classList.toggle("is-hidden", p < 100);
      cols[1].classList.toggle("is-hidden", p < 10);
      ds.forEach((d, i) => (cols[i].firstChild.style.transform = `translateY(${-d * 1.12}em)`));
      tempEl.textContent = (12 - 8 * p / 100).toFixed(1).replace(".", ",");
    };
    setPct(0);
    pre.querySelector(".hr-pre__label").setAttribute("aria-hidden", "true");
    const sr = pre.querySelector(".hr-pre__sr");

    // ---------- taille ----------
    const resize = () => {
      renderer.setSize(innerWidth, innerHeight, false);
      camera.aspect = innerWidth / innerHeight;
      camera.fov = innerWidth <= 768 ? 30 : 24;
      camera.updateProjectionMatrix();
      measureTags();
      copyRect = sec.querySelector(".hr-copy").getBoundingClientRect();
    };
    resize();

    // ---------- boucle ----------
    const MIN_LOAD = 1.9;
    let loaded = false, loadT = 0, startT = null, speed = 1, last = performance.now() / 1000, running = true;
    const frame = () => {
      const now = performance.now() / 1000, dt = Math.min(.05, now - last); last = now;
      U.uTime.value += dt;
      if (freezeLoad === null && freezeClip === null) {
        if (startT === null) {
          loadT += dt * speed;
          const p = Math.round(100 * Math.min(loaded ? 1 : .96, smooth(loadT / MIN_LOAD) * (loaded ? 1 : .96)));
          setPct(loaded && loadT >= MIN_LOAD / speed ? 100 : Math.min(p, 99));
          if (loaded && (loadT >= MIN_LOAD || speed > 1)) { setPct(100); pre.classList.add("is-ready"); sr.textContent = "L'eau est prête."; startT = now + (speed > 1 ? 0 : .35); }
        } else if (now > startT && S.r < CLIP_END) {
          if (S.r > 1.6) pre.classList.add("is-going");   // le compteur s'efface quand elle arrive
          S.r = Math.min(CLIP_END, S.r + dt * SPEED * speed);
        }
      }
      const r = S.r;
      poseAt(r, U.uTime.value);
      camAt(r, U.uTime.value);
      stepIce(dt, r);
      placeTags(r);
      if (!copyShown && r >= COPY_AT && freezeClip === null) showCopy(false);
      if (!finished && r >= DONE_AT && freezeClip === null && freezeLoad === null) finish();
      if (running) renderer.render(scene, camera);
    };
    gsap.ticker.add(frame);

    // pause hors écran une fois l'intro finie
    ctx.whenVisible(sec, () => (running = true), () => { if (finished) running = false; }, "0px");
    // défilement : la caméra s'approche un peu quand on quitte le hero
    ctx.ScrollTrigger.create({ trigger: sec, start: "top top", end: "bottom top", onUpdate: s => (S.scroll = s.progress) });
    addEventListener("pointermove", e => {
      if (ctx.isMobile()) return;
      gsap.to(S, { mx: e.clientX / innerWidth * 2 - 1, my: e.clientY / innerHeight * 2 - 1, duration: 1.2, ease: "power2.out", overwrite: true });
    }, { passive: true });
    let rw = innerWidth;
    addEventListener("resize", () => { resize(); if (Math.abs(innerWidth - rw) > 40) { rw = innerWidth; } });

    // passer l'intro : avance rapide (bouton, molette, glisser, clavier)
    const fast = () => { if (!finished) speed = 7; };
    pre.querySelector(".hr-pre__skip").addEventListener("click", fast);
    addEventListener("wheel", e => { if (!finished && Math.abs(e.deltaY) > 4) fast(); }, { passive: true });
    let ty0 = null;
    addEventListener("touchstart", e => { ty0 = e.touches[0] ? e.touches[0].clientY : null; }, { passive: true });
    addEventListener("touchmove", e => { if (!finished && ty0 !== null && e.touches[0] && Math.abs(ty0 - e.touches[0].clientY) > 24) fast(); }, { passive: true });
    addEventListener("keydown", e => { if (!finished && [" ", "ArrowDown", "PageDown", "Enter", "Escape"].includes(e.key)) fast(); });

    // QA : outils de mesure
    window.__hero = { S, bones, holder, camera, poseAt, camAt, offY };

    // chargement réel : modèle décodé, shaders compilés, première image
    loadWoman().then(() => {
      if (skipAll) {
        S.r = CLIP_END; startT = 0; pre.remove(); poseAt(S.r, 0); camAt(S.r, 0);
        measureTags(); showCopy(true); finish();
      } else if (freezeClip !== null) {
        S.r = freezeClip; startT = 0; pre.classList.add("is-ready"); setPct(100);
        if (freezeClip >= COPY_AT) showCopy(true);
        if (freezeClip > .1) pre.style.display = "none";
      } else if (freezeLoad !== null) {
        setPct(Math.round(freezeLoad * 100));
      }
      try { renderer.compile(scene, camera); } catch (e) {}
      requestAnimationFrame(() => { loaded = true; measureTags(); });
    }).catch(err => {
      console.error("[hero] modèle 3D :", err);
      loaded = true; S.r = CLIP_END; startT = 0;
      showCopy(true); finish();
    });
  },
});
