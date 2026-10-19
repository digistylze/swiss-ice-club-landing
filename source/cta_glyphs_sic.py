"""Scroll #69 : « FROID » en tracés Antonio 700 (police variable du site instanciée), une <path> par lettre, le I marqué
.cta__i (c'est lui qui bascule et devient le bouton, comme le I de BUILD dans le catalogue).
Écrit le <svg> dans src/sections/10-cta/index.html entre les marqueurs <!--LOCKUP--> ... <!--/LOCKUP-->.
Usage : python cta_glyphs_sic.py"""
import base64, io, pathlib, re
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = pathlib.Path(__file__).parent
WORD = "FROID"
WGHT = 700
TRACK = 120         # interlettrage en unités de la police (2000/em) : Antonio est très condensé, le mot respire mieux un peu ouvert
css = (ROOT / "fonts" / "fonts.css").read_text(encoding="utf-8")
f = TTFont(io.BytesIO(base64.b64decode(re.search(r"font-family:'Antonio'.*?base64,([A-Za-z0-9+/=]+)", css, re.S)[1])))
if "fvar" in f:
    f = instantiateVariableFont(f, {"wght": WGHT})
gs, cmap, hmtx = f.getGlyphSet(), f.getBestCmap(), f["hmtx"]
ASC = f["hhea"].ascent
num = lambda v: f"{v:.1f}".rstrip("0").rstrip(".")

x, items, bb = 0.0, [], [1e9, 1e9, -1e9, -1e9]
for ch in WORD:
    g = cmap[ord(ch)]
    t = (1, 0, 0, -1, x, ASC)            # y vers le bas, ligne de base à ASC
    bp = BoundsPen(gs); gs[g].draw(TransformPen(bp, t))
    items.append((ch, g, t, bp.bounds))
    bb = [min(bb[0], bp.bounds[0]), min(bb[1], bp.bounds[1]), max(bb[2], bp.bounds[2]), max(bb[3], bp.bounds[3])]
    x += hmtx[g][0] + TRACK

paths = []
for ch, g, t, b in items:
    pen = SVGPathPen(gs, ntos=num); gs[g].draw(TransformPen(pen, t))
    cls = "cta__l cta__i" if ch == "I" else "cta__l"
    paths.append(f'<path class="{cls}" d="{pen.getCommands()}"/>')
    if ch == "I":
        print("I", [num(v) for v in b], "largeur/hauteur", round((b[2] - b[0]) / (b[3] - b[1]), 3))

X0, Y0, X1, Y1 = bb
svg = (f'<svg class="cta__word" viewBox="{num(X0)} {num(Y0)} {num(X1 - X0)} {num(Y1 - Y0)}" aria-hidden="true" focusable="false">'
       f'<defs><clipPath id="cta-c1"><rect x="{num(X0 - 20)}" y="{num(Y0)}" width="{num(X1 - X0 + 40)}" height="{num(Y1 - Y0)}"/></clipPath></defs>'
       f'<g class="cta__line" clip-path="url(#cta-c1)">' + "".join(paths) + "</g></svg>")

page = ROOT / "src" / "sections" / "10-cta" / "index.html"
s = page.read_text(encoding="utf-8")
s, n = re.subn(r"<!--LOCKUP-->.*?<!--/LOCKUP-->", lambda m: "<!--LOCKUP-->" + svg + "<!--/LOCKUP-->", s, flags=re.S)
assert n == 1, "marqueurs <!--LOCKUP--> absents"
page.write_text(s, encoding="utf-8")
print("viewBox", num(X0), num(Y0), num(X1 - X0), num(Y1 - Y0), "ratio", round((X1 - X0) / (Y1 - Y0), 2))
