# Outils de préparation des modèles

Ces scripts ont servi une fois, pour télécharger les packs et fabriquer le dossier `../modeles/`.
Le jeu n'en a pas besoin pour tourner. Les chemins écrits dedans (`/home/user/.cache/dl/…`) sont
ceux de la machine où ils ont été lancés : à adapter avant de les relancer ailleurs.

| Script | Rôle |
|---|---|
| `itch.py` | télécharge un pack gratuit depuis itch.io : `python3 itch.py <nom-du-pack> any <sortie.zip>` |
| `build_perso.py` | copie costumes, têtes, cheveux et armes, réduit les textures, ne garde que 18 animations |
| `build_decor.py` | regroupe les pièces de village, de nature et d'objets en un fichier par pack, prépare les sols |
| `simplify.mjs` | allège les arbres et les plantes : `node simplify.mjs ../modeles/decor nature` (demande `npm install meshoptimizer`) |

Ordre : `itch.py` pour chaque pack, décompresser (sans les FBX), `build_perso.py`, `build_decor.py`, puis `simplify.mjs`.
