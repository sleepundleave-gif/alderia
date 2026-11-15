#!/usr/bin/env python3
# MISES À JOUR DU JEU (application Android)
#
#   python3 outils/maj.py copie DOSSIER      copie le jeu (les fichiers que l'application embarque) dans DOSSIER, avec son manifeste.
#                                            Sert à fabriquer l'APK (android/construire.sh) et à mettre les mises à jour EN LIGNE :
#                                            déposez le contenu de DOSSIER chez un hébergeur ; l'adresse de ce dossier est celle
#                                            qu'on donne à l'application (« Chercher en ligne »).
#   python3 outils/maj.py paquet [DOSSIER]   fabrique alderia-maj-N.zip : le manifeste et les seuls fichiers qui ont changé depuis
#                                            les APK déjà distribués (android/versions/manifeste-*.txt). C'est le fichier qu'on envoie
#                                            aux joueurs ; ils l'installent depuis le jeu (« Installer un fichier de mise à jour »).
#   python3 outils/maj.py manifeste          affiche le manifeste du jeu tel qu'il est.
#
# Le numéro de version est dans version.txt (1re ligne : le numéro, à augmenter à chaque sortie ; 2e ligne : le nom).
# Une mise à jour n'est acceptée par l'application que si son numéro est plus grand que celui du jeu installé.
# « app-min N » (3e ligne de version.txt, facultative) : la mise à jour exige l'application de code N au moins.
import hashlib, os, shutil, sys, zipfile

ICI = os.path.dirname(os.path.abspath(__file__))
JEU = os.path.dirname(ICI)
VERSIONS = os.path.join(os.path.dirname(JEU), 'android', 'versions')
DOSSIERS = ('css', 'js', 'lib', os.path.join('modeles', 'paquet'))          # ce dont le jeu a besoin pour tourner
RACINE = ('index.html',)

def version():
    l = [x.strip() for x in open(os.path.join(JEU, 'version.txt'), encoding='utf-8').read().split('\n') if x.strip()]
    return int(l[0]), (l[1] if len(l) > 1 else ''), (int(l[2]) if len(l) > 2 else 0)

def fichiers():
    sys.path.insert(0, ICI)
    import paquet
    # le paquet de modèles suit ses sources ; sans les sources (dossiers modeles/perso, decor…) on garde le paquet tel qu'il est
    if paquet.sources() and not paquet.a_jour(): print('paquet de modèles refait :', paquet.construire(), file=sys.stderr)
    import json
    idx = json.load(open(os.path.join(JEU, 'modeles', 'paquet', 'index.json')))
    if not idx.get('fichiers') or not idx.get('morceaux'): sys.exit('Le paquet de modèles (modeles/paquet) est vide : rien n\'est fabriqué.')
    l = [f for f in RACINE]
    for d in DOSSIERS:
        for base, _, noms in os.walk(os.path.join(JEU, d)):
            for n in noms:
                if n.startswith('.') or n.endswith(('.pyc', '~')): continue
                l.append(os.path.relpath(os.path.join(base, n), JEU).replace(os.sep, '/'))
    return sorted(l)

def empreinte(chemin):
    h = hashlib.sha256()
    with open(chemin, 'rb') as f:
        for bloc in iter(lambda: f.read(1 << 20), b''): h.update(bloc)
    return h.hexdigest()

def manifeste():
    v, nom, app_min = version()
    lignes = ['alderia-manifeste 1', 'version %d' % v, 'nom ' + nom, 'app-min %d' % app_min]
    liste = {}
    for f in fichiers():
        p = os.path.join(JEU, f); liste[f] = (empreinte(p), os.path.getsize(p))
        lignes.append('f %s %d %s' % (liste[f][0], liste[f][1], f))
    return '\n'.join(lignes) + '\n', liste, v

def lire(chemin):
    d = {}
    for l in open(chemin, encoding='utf-8'):
        if l.startswith('f '):
            _, e, t, c = l.rstrip('\n').split(' ', 3); d[c] = e
    return d

def copie(dest):
    texte, liste, v = manifeste()
    if os.path.isdir(dest): shutil.rmtree(dest)
    for f in liste:
        os.makedirs(os.path.dirname(os.path.join(dest, f)) or dest, exist_ok=True)
        shutil.copyfile(os.path.join(JEU, f), os.path.join(dest, f))
    open(os.path.join(dest, 'manifeste.txt'), 'w', encoding='utf-8').write(texte)
    print('version %d : %d fichiers, %.1f Mo → %s' % (v, len(liste), sum(t for _, t in liste.values()) / 1048576, dest))
    return v

def paquet(dest):
    texte, liste, v = manifeste()
    bases = sorted(f for f in os.listdir(VERSIONS) if f.startswith('manifeste-') and f.endswith('.txt')) if os.path.isdir(VERSIONS) else []
    if not bases: sys.exit("Aucun APK distribué n'est connu (android/versions/ est vide) : fabriquez d'abord l'APK.")
    anciens = [lire(os.path.join(VERSIONS, b)) for b in bases]
    # un fichier voyage s'il diffère de celui d'au moins un APK déjà distribué (chaque joueur a l'un d'eux)
    change = [f for f in liste if any(a.get(f) != liste[f][0] for a in anciens)]
    os.makedirs(dest, exist_ok=True)
    sortie = os.path.join(dest, 'alderia-maj-%d.zip' % v)
    with zipfile.ZipFile(sortie, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        z.writestr('manifeste.txt', texte)
        for f in change: z.write(os.path.join(JEU, f), f, zipfile.ZIP_STORED if f.endswith('.bin') else zipfile.ZIP_DEFLATED)
    print('version %d : %d fichiers changés sur %d (depuis %s) → %s, %.2f Mo' % (v, len(change), len(liste), ', '.join(b[10:-4] for b in bases), sortie, os.path.getsize(sortie) / 1048576))
    return sortie

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['copie'] and len(a) == 2: copie(a[1])
    elif a[:1] == ['paquet']: paquet(a[1] if len(a) > 1 else os.path.join(os.path.dirname(JEU), 'mises-a-jour'))
    elif a[:1] == ['manifeste']: sys.stdout.write(manifeste()[0])
    else: sys.exit(__doc__ or 'usage : maj.py copie DOSSIER | paquet [DOSSIER] | manifeste')
