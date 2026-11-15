#!/usr/bin/env python3
# Range tous les modèles (modeles/perso, modeles/decor, modeles/reel et modeles/monstres) dans un « paquet » découpé en petits morceaux.
# Pourquoi : un gros fichier coupé en route fait échouer tout le chargement. Avec des morceaux de 256 Ko,
# une coupure ne fait perdre qu'un morceau, que le jeu redemande tout seul.
#   - les fichiers qui se compressent bien (géométrie, descriptions) sont compressés dans le paquet ;
#   - chaque morceau porte dans son nom l'empreinte du contenu : si un modèle change, les noms changent,
#     et aucun navigateur ni relais ne peut resservir une ancienne copie ;
#   - index.json dit où se trouve chaque fichier, avec la taille et la somme de contrôle de chaque morceau.
# Usage : python3 outils/paquet.py          (le serveur le lance tout seul quand un modèle a changé)
import os, json, zlib, hashlib

RACINE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'modeles'))
SORTIE = os.path.join(RACINE, 'paquet')
TAILLE = 256 * 1024
TYPES = {'.gltf': 'model/gltf+json', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.jpg': 'image/jpeg', '.png': 'image/png'}

def sources():
    out = []
    for groupe in ('perso', 'decor', 'reel', 'monstres'):
        for d, _, fichiers in os.walk(os.path.join(RACINE, groupe)):
            for f in sorted(fichiers):
                if os.path.splitext(f)[1].lower() in TYPES: out.append(os.path.relpath(os.path.join(d, f), RACINE).replace(os.sep, '/'))
    return sorted(out, key=lambda p: (p.split('/')[0] != 'perso', p))

def signature(liste):
    h = hashlib.sha1()
    for p in liste:
        st = os.stat(os.path.join(RACINE, p)); h.update(('%s|%d|%d\n' % (p, st.st_size, int(st.st_mtime))).encode())
    return h.hexdigest()[:16]

def a_jour():
    try:
        with open(os.path.join(SORTIE, 'index.json')) as f: idx = json.load(f)
        return idx.get('signature') == signature(sources()) and all(os.path.getsize(os.path.join(SORTIE, m[0])) == m[1] for m in idx['morceaux'])
    except Exception: return False

def construire(force=False):
    if not force and a_jour(): return None
    liste = sources(); blob = bytearray(); fichiers = {}
    for p in liste:
        with open(os.path.join(RACINE, p), 'rb') as f: brut = f.read()
        comp = zlib.compress(brut, 9); z = len(comp) < len(brut) * 0.9; data = comp if z else brut
        fichiers[p] = [len(blob), len(data), len(brut), 1 if z else 0, TYPES[os.path.splitext(p)[1].lower()]]
        blob += data
    ident = hashlib.sha1(bytes(blob)).hexdigest()[:10]
    os.makedirs(SORTIE, exist_ok=True)
    for f in os.listdir(SORTIE):
        if f.endswith('.bin') and not f.startswith('p-' + ident + '-'): os.remove(os.path.join(SORTIE, f))
    morceaux = []
    for i in range(0, len(blob), TAILLE):
        part = bytes(blob[i:i + TAILLE]); nom = 'p-%s-%03d.bin' % (ident, i // TAILLE)
        with open(os.path.join(SORTIE, nom), 'wb') as f: f.write(part)
        morceaux.append([nom, len(part), zlib.crc32(part)])
    idx = {'id': ident, 'signature': signature(liste), 'taille': len(blob), 'morceaux': morceaux, 'fichiers': fichiers}
    with open(os.path.join(SORTIE, 'index.json'), 'w') as f: json.dump(idx, f, separators=(',', ':'))
    return {'fichiers': len(liste), 'morceaux': len(morceaux), 'Mo': round(len(blob) / 1e6, 1), 'Mo avant': round(sum(v[2] for v in fichiers.values()) / 1e6, 1)}

if __name__ == '__main__':
    print(construire(True))
