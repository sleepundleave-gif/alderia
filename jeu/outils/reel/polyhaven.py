#!/usr/bin/env python3
# Télécharge des modèles, des textures ou des ciels de Poly Haven (https://polyhaven.com, licence CC0 : libre, même pour vendre).
#
#   python3 polyhaven.py liste modeles nature          → affiche les modèles de la catégorie « nature »
#   python3 polyhaven.py liste textures terrain        → affiche les textures de sol
#   python3 polyhaven.py liste ciels outdoor           → affiche les ciels (HDRI) d'extérieur
#   python3 polyhaven.py prendre rock_09 fern_02       → télécharge ces modèles en 1k dans ./polyhaven/
#   python3 polyhaven.py prendre rock_09 --res 4k      → la même chose en 4k (plus beau, bien plus lourd)
#   python3 polyhaven.py categorie modeles rocks --res 2k --max 20   → toute une catégorie
#
# Les modèles arrivent au format glTF (.gltf + .bin + textures), lisible par Blender, Unity, Godot et three.js.
import sys, os, json, urllib.request

API = 'https://api.polyhaven.com'
AGENT = {'User-Agent': 'AlderiaGame/1.0 (outil de telechargement)'}
TYPES = {'modeles': 'models', 'textures': 'textures', 'ciels': 'hdris'}

def lire(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=AGENT), timeout=60) as r: return r.read()

def catalogue(genre, categorie=None):
    url = API + '/assets?t=' + TYPES[genre] + ('&c=' + categorie if categorie else '')
    return json.loads(lire(url))

def recuperer(url, chemin):
    if os.path.exists(chemin) and os.path.getsize(chemin) > 0: return 0
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    data = lire(url)
    with open(chemin, 'wb') as f: f.write(data)
    return len(data)

def prendre(ident, res='1k', dest='polyhaven'):
    info = json.loads(lire(API + '/files/' + ident)); total = 0
    if 'gltf' in info:                                   # un modèle : le .gltf et tout ce qu'il référence
        g = info['gltf'].get(res) or info['gltf'][sorted(info['gltf'])[0]]
        g = g['gltf']; dossier = os.path.join(dest, ident)
        total += recuperer(g['url'], os.path.join(dossier, ident + '.gltf'))
        for nom, f in g.get('include', {}).items(): total += recuperer(f['url'], os.path.join(dossier, nom))
        for cle in info:                                    # plantes, voiles… : la carte de transparence n'est pas dans le .gltf
            if cle.lower().endswith('alpha') and res in info[cle] and 'jpg' in info[cle][res]:
                total += recuperer(info[cle][res]['jpg']['url'], os.path.join(dossier, 'textures', '%s_%s_%s.jpg' % (ident, cle.lower(), res)))
    elif 'hdri' in info:                                 # un ciel
        h = info['hdri'].get(res) or info['hdri']['1k']
        total += recuperer(h['hdr']['url'], os.path.join(dest, ident + '_' + res + '.hdr'))
    else:                                                # une texture : couleur, relief, rugosité
        for carte, cle in (('Diffuse', 'diff'), ('nor_gl', 'nor_gl'), ('Rough', 'rough'), ('arm', 'arm'), ('Displacement', 'disp')):
            if carte in info and res in info[carte] and 'jpg' in info[carte][res]:
                total += recuperer(info[carte][res]['jpg']['url'], os.path.join(dest, ident, '%s_%s_%s.jpg' % (ident, cle, res)))
    print('%-34s %6.1f Mo' % (ident, total / 1e6))
    return total

def main(a):
    if len(a) < 2 or a[0] not in ('liste', 'prendre', 'categorie'): print(__doc__ or open(__file__).read().split('import')[0]); return
    res, dest, maxi = '1k', 'polyhaven', 9999
    for cle in ('--res', '--dest', '--max'):
        if cle in a:
            i = a.index(cle); v = a[i + 1]; del a[i:i + 2]
            if cle == '--res': res = v
            elif cle == '--dest': dest = v
            else: maxi = int(v)
    if a[0] == 'liste':
        cat = catalogue(a[1], a[2] if len(a) > 2 else None)
        for k, v in sorted(cat.items(), key=lambda kv: -kv[1].get('download_count', 0)): print('%-36s %s' % (k, ', '.join(c for c in v.get('categories', []) if not c.startswith('collection'))))
        print(len(cat), 'résultats')
    elif a[0] == 'prendre':
        print('Total : %.1f Mo dans %s/' % (sum(prendre(i, res, dest) for i in a[1:]) / 1e6, dest))
    else:
        ids = sorted(catalogue(a[1], a[2]).items(), key=lambda kv: -kv[1].get('download_count', 0))[:maxi]
        print('Total : %.1f Mo dans %s/' % (sum(prendre(k, res, dest) for k, _ in ids) / 1e6, dest))

if __name__ == '__main__': main(sys.argv[1:])
