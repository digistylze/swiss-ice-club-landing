"""Images de la landing -> assets/*.webp aux tailles d'usage.
Source : la médiathèque WordPress de swissiceclub.ch (../_site/media/, préfixe = id du média). Aucune photo de stock ici
(les rares compléments de stock sont listés à part dans STOCK, avec leur source)."""
import pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).parent
MEDIA = ROOT.parent / "_site" / "media"
DST = ROOT / "assets"
DST.mkdir(exist_ok=True)


def src(prefix):
    hits = [p for p in MEDIA.iterdir() if p.name.startswith(prefix)]
    assert len(hits) == 1, (prefix, hits)
    return hits[0]


def crop(box):  # box en fractions (gauche, haut, droite, bas)
    return lambda im: im.crop(tuple(round(v * (im.width if k % 2 == 0 else im.height)) for k, v in enumerate(box)))


# clé : (préfixe du fichier, largeur max, qualité, transformation)
MAP = {
    # les bains (shooting d'octobre 2026, 1707 x 2560 ; et janvier / avril 2026)
    "bain-face": ("1877_", 1100, 80, None),          # femme immergée jusqu'au cou, bain haut, logo flocon
    "bain-entree": ("1835_", 1100, 80, None),        # femme debout dans le bain haut, mains sur le bord
    "bain-detail": ("1871_", 1100, 80, None),        # maillot noir, eau, cuve inox (détail)
    "bain-assise": ("1411_", 1400, 80, None),        # femme assise dans le bain bas, cuve inox
    "bain-logo": ("1874_", 1000, 80, None),          # bain haut, panneau au logo flocon
    "bain-seul": ("1174_", 1000, 80, None),          # bain bas + escabeau
    "bains-salle": ("1173_", 1400, 80, None),        # trois bains et leurs escabeaux, salle
    "bains-noirs": ("1129_", 1200, 80, None),        # bains alignés, logo flocon (sur noir)
    "glace-dessus": ("393_", 750, 82, None),         # eau glacée vue du dessus
    "glacons": ("1128_", 1000, 82, None),            # glaçons sur noir
    # le fondateur
    "benoit-bains": ("1103_", 1500, 80, None),       # Benoît Debrosse entre deux bains
    "benoit-portrait": ("1747_", 728, 84, None),     # portrait, polo
    "benoit-coaching": ("1104_", 1500, 80, None),    # coaching respiration avec une cliente
    "benoit-bain": ("1106_", 1500, 80, None),        # Benoît dans un bain
    "benoit-whm": ("898_", 600, 84, None),           # instructeur Wim Hof (certificat)
    "benoit-logo": ("1412_", 1616, 80, None),        # Benoît montre le logo
    # les autres soins et le lieu
    "sauna-ir": ("1410_", 1197, 80, None),           # sauna infrarouge, cliente
    "sauna-rouge": ("915_", 750, 82, None),          # sauna infrarouge, lumière rouge
    "infratherapie": ("1339_", 1110, 82, None),      # dôme d'infrathérapie
    "yoga": ("1105_", 1500, 80, None),               # yoga, posture de l'enfant
    "meditation": ("1896_", 1100, 80, None),         # méditation, tapis
    "respiration": ("1408_", 1197, 80, None),        # séance de respiration au sol, grand O
    "salle": ("1204_", 1800, 78, None),              # la salle de pratique
    "salle-2": ("943_", 1000, 80, None),             # salle, autre angle
    "inhale": ("1171_", 750, 82, None),              # « Inhale the future, exhale the past »
    "le30": ("1438_", 400, 90, None),                # visuel LE 30 (or sur noir)
    "bains-sombre": ("1498_", 1400, 82, None),       # bains en enfilade, pénombre, logo flocon en gros plan
    "recovery": ("1423_", 800, 82, None),            # Marathon de Genève, Recovery Zone
    "team": ("1052_", 750, 82, None),                # Ice Team Challenge (entreprises)
    # logos des partenaires (fond clair ou transparent d'origine)
    "p-spartan": ("1661_", 900, 88, None),
    "p-ccig": ("1789_", 700, 88, None),
    "p-cvt": ("1753_", 700, 88, None),
    "p-vitaltech": ("1485_", 700, 88, None),
    "p-caelis": ("1775_", 600, 88, None),
    "p-flair": ("1487_", 600, 88, None),
    "p-cdn": ("1813_", 900, 88, None),
    "p-whm": ("932_", 900, 88, None),
    "p-gallup": ("365_", 750, 88, None),
}


def main():
    total = 0
    for key, (prefix, w, q, fn) in MAP.items():
        im = Image.open(src(prefix))
        keep_alpha = key.startswith("p-") and im.mode in ("RGBA", "LA", "P")
        im = im.convert("RGBA" if keep_alpha else "RGB")
        if fn:
            im = fn(im)
        if im.width > w:
            im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        out = DST / f"{key}.webp"
        im.save(out, "WEBP", quality=q, method=6)
        total += out.stat().st_size
        print(f"{key:18} {im.size[0]}x{im.size[1]} {out.stat().st_size // 1024} Ko")
    print("total", round(total / 1024 / 1024, 2), "Mo,", len(MAP), "images")


if __name__ == "__main__":
    main()
