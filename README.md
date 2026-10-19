# Swiss Ice Club · Bien plus que le froid (landing)

Prévisualisation de la landing de Swiss Ice Club (bains froids, sauna infrarouge et respiration à Carouge, Genève) réalisée par Digistylze.

- `index.html` : la page publiée, un seul fichier autonome (images, polices, scripts et modèle 3D embarqués, aucune requête réseau). Non indexée par les moteurs de recherche (`noindex`).
- `source/` : les sources (une section par dossier dans `source/src/sections/`, socle dans `source/src/`, hero WebGL dans `source/src/sections/02-hero/`). `python build.py` reconstruit la page ; il lit aussi la médiathèque du site client, qui n'est pas versionnée ici.

Préchargement : `?pre=99` saute l'intro 3D du bain, `?pre=<secondes>` la fige à un instant.
