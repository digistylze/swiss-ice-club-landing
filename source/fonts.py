"""Polices Google Fonts -> fonts/fonts.css autonome (sous-ensemble latin, woff2 en base64).
Usage : python fonts.py "family=Foo:wght@300..600&family=Bar:ital,wght@0,400;1,400" [sortie.css]"""
import base64, re, sys, urllib.request, pathlib

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=30).read()


def fonts_css(query):
    css = get(f"https://fonts.googleapis.com/css2?{query}&display=swap").decode()
    faces = {}  # (famille, style, url) -> poids ; une police variable renvoie la même url pour chaque poids
    for subset, body in re.findall(r"/\* ([\w-]+) \*/\s*@font-face\s*\{(.*?)\}", css, re.S):
        if subset != "latin":
            continue
        fam = re.search(r"font-family:\s*'([^']+)'", body)[1]
        style = re.search(r"font-style:\s*(\w+)", body)[1]
        weight = re.search(r"font-weight:\s*([\d ]+);", body)[1].split()
        url = re.search(r"url\((\S+?)\)", body)[1]
        faces.setdefault((fam, style, url), []).extend(int(w) for w in weight)
    assert faces, "aucune face latin : vérifier la requête"
    out = []
    for (fam, style, url), ws in faces.items():
        w = f"{min(ws)} {max(ws)}" if min(ws) != max(ws) else str(ws[0])
        b64 = base64.b64encode(get(url)).decode()
        out.append(f"@font-face{{font-family:'{fam}';font-style:{style};font-weight:{w};font-display:swap;"
                   f"src:url(data:font/woff2;base64,{b64}) format('woff2')}}")
    return "\n".join(out)


if __name__ == "__main__":
    dest = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else pathlib.Path(__file__).parent / "fonts" / "fonts.css")
    css = fonts_css(sys.argv[1])
    dest.write_text(css, encoding="utf-8")
    for line in css.splitlines():
        print(re.sub(r"src:.*", "", line), round(len(line) / 1024), "KB")
