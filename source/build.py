"""Assemble la landing Swiss Ice Club en UN fichier HTML autonome (file:// OK, zéro requête réseau).

Sources : src/shell.html + src/base.css + src/core.js, puis une section par dossier src/sections/NN-nom/
(index.html, style.css, script.js, tous facultatifs), assets/*.webp (images.py), logo (_logo/logo.png, médiathèque du site),
assets/woman.glb (modèle 3D riggé et animé, ../_3d/), fonts/fonts.css (fonts.py), vendor/*.js (three.bundle.js = three r159 +
GLTFLoader + MeshoptDecoder, construit dans ../_3d/tools/).

Usage :
  python build.py                      -> ../landing_swiss-ice-club.html (+ copie ../Landing.html)
  python build.py --only hero,faq      -> qa/test_hero-faq.html (sections choisies seulement, pour tester)
  python build.py --only hero --pad    -> idem + un écran vide avant/après pour pouvoir défiler
"""
import argparse, base64, html, io, json, pathlib, re, shutil
from PIL import Image

ROOT = pathlib.Path(__file__).parent
RUN = ROOT.parent
SRC = ROOT / "src"
SLUG = "swiss-ice-club"
PHONE = "+41 78 247 75 25"

b64 = lambda b: base64.b64encode(b).decode()


def png(im):
    buf = io.BytesIO(); im.save(buf, "PNG", optimize=True); return "data:image/png;base64," + b64(buf.getvalue())


def images():
    imgs = {p.stem: "data:image/webp;base64," + b64(p.read_bytes()) for p in sorted((ROOT / "assets").glob("*.webp"))}
    # logo officiel (goutte blanche, disque rouge, croix suisse), tel quel : il se lit sur fond sombre comme sur clair
    im = Image.open(ROOT / "_logo" / "logo.png").convert("RGBA"); im.thumbnail((420, 420), Image.LANCZOS)
    imgs["logo"] = png(im)
    # favicon : la goutte du logo
    im = Image.open(ROOT / "_logo" / "logo.png").convert("RGBA"); im.thumbnail((60, 60), Image.LANCZOS)
    fav = Image.new("RGBA", (64, 64), (0, 0, 0, 0)); fav.alpha_composite(im, ((64 - im.width) // 2, (64 - im.height) // 2))
    return imgs, png(fav)


# typographie française : insécables avant ; ? ! » et :, après «, numéros de téléphone
NNB, NB, WJ = " ", " ", "⁠"  # insécable normale partout (l'espace fine n'est pas sûre dans les sous-ensembles de polices)
def fr(t):
    t = t.replace("'", "’")  # apostrophe typographique
    t = re.sub(r" ([;?!»])", NNB + r"\1", t)
    t = re.sub(r"(\w)([?!])", r"\1" + NNB + r"\2", t)
    t = t.replace(" :", NB + ":").replace("« ", "«" + NB)
    t = re.sub(r"\b(?!rendez-)(\w+)-(il|elle|on|je|vous)\b", r"\1" + WJ + "-" + WJ + r"\2", t)  # « faut-il », pas « rendez-vous »
    t = re.sub(r"\+41 (\d{2}) (\d{3}) (\d{2}) (\d{2})", lambda m: "+41" + NB + NB.join(m.groups()), t)
    t = re.sub(r"(0\d{2}) (\d{3}) (\d{2}) (\d{2})", lambda m: NB.join(m.groups()), t)
    return t


def fr_html(page):
    out = []
    for part in re.split(r"(<script\b.*?</script>|<style\b.*?</style>|<[^>]+>)", page, flags=re.S):
        out.append(part if part.startswith("<") else fr(part))
    page = "".join(out)
    # attributs lus à l'écran ou par les lecteurs d'écran
    return re.sub(r'\b(alt|aria-label|title|placeholder|data-label|data-detail)="([^"]*)"', lambda m: f'{m[1]}="{fr(m[2])}"', page)


def sections(only):
    dirs = sorted(p for p in (SRC / "sections").iterdir() if p.is_dir() and not p.name.startswith("_"))
    if only:
        dirs = [d for d in dirs if d.name.split("-", 1)[-1] in only or d.name in only]
        missing = set(only) - {d.name.split("-", 1)[-1] for d in dirs} - {d.name for d in dirs}
        assert not missing, f"sections inconnues : {missing}"
    read = lambda d, n: (d / n).read_text(encoding="utf-8") if (d / n).exists() else ""
    return [(d.name, read(d, "index.html"), read(d, "style.css"), read(d, "script.js")) for d in dirs]


def faq_items(markup):
    items = []
    for block in re.findall(r"<details\b.*?</details>", markup, flags=re.S):
        q = re.search(r"<summary\b[^>]*>(.*?)</summary>", block, flags=re.S)
        if not q:
            continue
        strip = lambda s: re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()
        a = block[q.end():]
        items.append((strip(q[1]), strip(a)))
    return items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--pad", action="store_true")
    args = ap.parse_args()
    only = [s.strip() for s in args.only.split(",") if s.strip()]

    secs = sections(only)
    imgs, favicon = images()
    # nav avant <main>, footer et panneau de réservation après
    OUTSIDE = ("nav", "footer", "reservation")
    part = lambda keep: "\n".join(f"<!-- {n} -->\n{h}" for n, h, _, _ in secs if (n.split("-", 1)[-1] in OUTSIDE) == keep)
    head = "\n".join(f"<!-- {n} -->\n{h}" for n, h, _, _ in secs if n.split("-", 1)[-1] == "nav")
    tail = "\n".join(f"<!-- {n} -->\n{h}" for n, h, _, _ in secs if n.split("-", 1)[-1] in ("footer", "reservation"))
    sec_html = f'{head}\n<main id="contenu">\n{part(False)}\n</main>\n{tail}'
    if args.pad:
        pad = '<div style="height:100vh;display:grid;place-items:center;color:#999">(espace de test)</div>'
        sec_html = pad + sec_html + pad
    sec_css = "\n".join(f"/* {n} */\n{c}" for n, _, c, _ in secs)
    sec_js = "\n".join(f"/* {n} */\n{j}" for n, _, _, j in secs)
    css = re.sub(r"/\*.*?\*/", "", (SRC / "base.css").read_text(encoding="utf-8") + "\n" + sec_css, flags=re.S)

    # images réellement utilisées (data-img, data-bg, IMG.x, IMG["x"], %%IMG:x%%)
    blob = sec_html + sec_css + sec_js
    used = set(re.findall(r'data-(?:img|bg)="([\w-]+)"', blob))
    used |= set(re.findall(r"\bIMG\.([A-Za-z_]\w*)", blob))
    used |= set(re.findall(r"\bIMG\[\s*['\"]([\w-]+)['\"]\s*\]", blob))
    used |= set(re.findall(r"%%IMG:([\w-]+)%%", blob))
    used |= {k.strip() for v in re.findall(r'data-imgs="([^"]+)"', blob) for k in v.split(",")}
    absent = used - imgs.keys()
    assert not absent, f"images absentes : {absent} (disponibles : {sorted(imgs)})"
    imgmap = {k: imgs[k] for k in sorted(used)}
    sec_html = re.sub(r"%%IMG:([\w-]+)%%", lambda m: imgs[m[1]], sec_html)

    vendor_files = ["gsap.min.js", "ScrollTrigger.min.js", "SplitText.min.js", "Flip.min.js", "CustomEase.min.js", "lenis.min.js"]
    if "MorphSVGPlugin" in sec_js: vendor_files.append("MorphSVGPlugin.min.js")
    if "ScrambleText" in sec_js: vendor_files.append("ScrambleTextPlugin.min.js")
    if "THREE" in sec_js: vendor_files.insert(0, "three.bundle.js")   # three r159 + GLTFLoader + MeshoptDecoder (window.THREE)
    vendor = "\n".join((ROOT / "vendor" / f).read_text(encoding="utf-8") for f in vendor_files)

    faq = faq_items(sec_html)
    business = {"@type": "HealthAndBeautyBusiness", "name": "Swiss Ice Club",
                "description": "Centre de bien-être à Carouge (Genève) : bains froids encadrés de 0 à 10 °C, sauna infrarouge, respiration avec un instructeur certifié Wim Hof Method, yoga, reiki, oxygénation cellulaire et coaching.",
                "slogan": "Slow down to speed up",
                "url": "https://swissiceclub.ch/", "telephone": PHONE, "email": "info@swissiceclub.ch",
                "founder": {"@type": "Person", "name": "Benoît Debrosse"},
                "address": {"@type": "PostalAddress", "streetAddress": "Chemin du Faubourg-de-Cruseilles 15-17", "postalCode": "1227", "addressLocality": "Carouge", "addressRegion": "GE", "addressCountry": "CH"},
                "priceRange": "CHF 25 à 300",
                "areaServed": ["Genève", "Carouge"],
                "sameAs": ["https://www.instagram.com/swissiceclub.ch/", "https://www.tiktok.com/@swiss.ice.club",
                           "https://www.facebook.com/profile.php?id=61583440150221", "https://www.linkedin.com/in/swiss-ice-club-5a6731398/"]}
    graph = [business]
    if faq:
        graph.append({"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]})
    jsonld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)

    shell = (SRC / "shell.html").read_text(encoding="utf-8")
    shell = re.sub(r"<!--.*?-->", "", shell, flags=re.S)
    sec_html = re.sub(r"<!--(?! \d\d-).*?-->", "", sec_html, flags=re.S)
    page = shell.replace("%%SECTIONS%%", sec_html)
    page = fr_html(page)
    esc = lambda s: s.replace("</script", "<\\/script")
    page = (page
            .replace("%%FONTS%%", (ROOT / "fonts" / "fonts.css").read_text(encoding="utf-8").replace("font-display:swap", "font-display:block"))
            .replace("%%CSS%%", css)
            .replace("%%FAVICON%%", favicon)
            .replace("%%JSONLD%%", esc(jsonld))
            .replace("%%IMGMAP%%", esc(json.dumps(imgmap)))
            .replace("%%GLB%%", b64((ROOT / "assets" / "woman.glb").read_bytes()) if "WOMAN_GLB" in sec_js else "")
            .replace("%%VENDOR%%", esc(vendor))
            .replace("%%SECTIONJS%%", esc(sec_js))
            .replace("%%CORE%%", esc((SRC / "core.js").read_text(encoding="utf-8"))))
    left = re.search(r"%%[\w:-]+%%", page)
    assert not left, f"token non résolu : {left[0]}"
    visible = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", page, flags=re.S)
    dash = re.search(r".{30}[—–].{30}", visible, flags=re.S)
    assert not dash, f"tiret cadratin dans le texte : {dash[0]!r}"

    if only:
        out = ROOT / "qa" / f"test_{'-'.join(only)}.html"
        out.parent.mkdir(exist_ok=True)
    else:
        out = RUN / f"landing_{SLUG}.html"
    out.write_text(page, encoding="utf-8", newline="\n")
    if not only:
        shutil.copy2(out, RUN / "Landing.html")
    print(out.name, round(out.stat().st_size / 1024 / 1024, 2), "Mo ·", len(secs), "sections ·", len(imgmap), "images ·", len(faq), "questions FAQ")


if __name__ == "__main__":
    main()
