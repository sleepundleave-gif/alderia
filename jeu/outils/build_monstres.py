#!/usr/bin/env python3
# Prépare les monstres et les animaux téléchargés pour le jeu (dossier modeles/monstres).
#   python3 outils/build_monstres.py <dossier des .glb d'origine> <dossier Textures du pack Bestiary>
# - Bat, Slime, Rat, Spider… (anciens packs, convertis de FBX en GLB avec FBX2glTF) : copiés tels quels (150 à 600 Ko).
# - Imp et Puglin (pack Bestiary, 8 à 9 Mo chacun) : on garde la couleur (512 px, JPEG) et la lueur (256 px),
#   on retire le relief et les reflets (4 images de 2048 px), et les tangentes. Résultat : moins de 1 Mo chacun.
#   Les autres jeux de couleurs du pack vont dans tex/ (Imp_2.jpg, Puglin_3.jpg…).
import sys, os, json, struct, io, shutil
from PIL import Image

SRC, TEX = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else None)
OUT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'modeles', 'monstres'))
SIMPLES = ['Bat', 'Slime', 'Rat', 'Spider', 'Skeleton', 'Dragon', 'Snake', 'Wasp', 'Frog', 'Horse', 'Sheep', 'Cow', 'Pig']
TEXTURES = ['Imp', 'Puglin']

def lire(p):
    with open(p, 'rb') as f:
        f.read(12); n, _ = struct.unpack('<II', f.read(8)); j = json.loads(f.read(n)); n, _ = struct.unpack('<II', f.read(8)); return j, f.read(n)

def ecrire(p, j, b):
    js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * (-len(js) % 4); b += b'\0' * (-len(b) % 4)
    with open(p, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(b))); f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js); f.write(struct.pack('<II', len(b), 0x004E4942)); f.write(b)

def jpeg(im, cote, q=86):
    im = im.convert('RGB'); im.thumbnail((cote, cote), Image.LANCZOS); o = io.BytesIO(); im.save(o, 'JPEG', quality=q); return o.getvalue()

def alleger(nom):
    j, b = lire(os.path.join(SRC, nom + '.glb')); bv = j['bufferViews']
    vue = lambda i: b[bv[i].get('byteOffset', 0): bv[i].get('byteOffset', 0) + bv[i]['byteLength']]
    images = {}                                                     # rôle -> octets JPEG
    for im in j['images']:
        n = im.get('name', '')
        if 'BaseColor' in n: images['couleur'] = jpeg(Image.open(io.BytesIO(vue(im['bufferView']))), 512)
        elif 'Emissive' in n: images['lueur'] = jpeg(Image.open(io.BytesIO(vue(im['bufferView']))), 256, 80)
    for me in j['meshes']:
        for pr in me['primitives']: pr['attributes'].pop('TANGENT', None)
    # on ne garde que les vues utilisées par la géométrie, le squelette et les animations
    utiles = []
    def garder(a):
        if a is not None and a not in utiles: utiles.append(a)
    for me in j['meshes']:
        for pr in me['primitives']:
            garder(pr.get('indices'))
            for a in pr['attributes'].values(): garder(a)
    for s in j.get('skins', []): garder(s.get('inverseBindMatrices'))
    for an in j.get('animations', []):
        for s in an['samplers']: garder(s['input']); garder(s['output'])
    acc = j['accessors']; nb = bytearray(); vues = []; carte = {}
    for a in sorted(utiles):
        v = acc[a]['bufferView']
        if v not in carte:
            d = vue(v); nb += b'\0' * (-len(nb) % 4); nv = dict(bv[v]); nv['byteOffset'] = len(nb); nv['buffer'] = 0; nb += d; carte[v] = len(vues); vues.append(nv)
    idx = {a: i for i, a in enumerate(sorted(utiles))}; j['accessors'] = [dict(acc[a], bufferView=carte[acc[a]['bufferView']]) for a in sorted(utiles)]
    for me in j['meshes']:
        for pr in me['primitives']:
            if 'indices' in pr: pr['indices'] = idx[pr['indices']]
            pr['attributes'] = {k: idx[a] for k, a in pr['attributes'].items()}
    for s in j.get('skins', []):
        if 'inverseBindMatrices' in s: s['inverseBindMatrices'] = idx[s['inverseBindMatrices']]
    for an in j.get('animations', []):
        for s in an['samplers']: s['input'] = idx[s['input']]; s['output'] = idx[s['output']]
    j['images'] = []; j['textures'] = []
    for role in ('couleur', 'lueur'):
        if role in images:
            nb += b'\0' * (-len(nb) % 4); vues.append({'buffer': 0, 'byteOffset': len(nb), 'byteLength': len(images[role])}); nb += images[role]
            j['images'].append({'bufferView': len(vues) - 1, 'mimeType': 'image/jpeg', 'name': role}); j['textures'].append({'source': len(j['images']) - 1, 'sampler': 0})
    j['samplers'] = [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]
    for m in j['materials']:
        m.pop('normalTexture', None); m.pop('occlusionTexture', None); m.pop('extensions', None)
        m['pbrMetallicRoughness'] = {'baseColorTexture': {'index': 0}, 'metallicFactor': 0, 'roughnessFactor': 0.85}
        if 'lueur' in images: m['emissiveTexture'] = {'index': 1}; m['emissiveFactor'] = [1, 1, 1]
        else: m.pop('emissiveTexture', None)
    j['extensionsUsed'] = [e for e in j.get('extensionsUsed', []) if e != 'KHR_materials_emissive_strength']
    if not j['extensionsUsed']: j.pop('extensionsUsed')
    j['bufferViews'] = vues; j['buffers'] = [{'byteLength': len(nb)}]
    ecrire(os.path.join(OUT, nom + '.glb'), j, bytes(nb))
    if TEX:
        for k in (2, 3):
            p = os.path.join(TEX, 'T_%s_BaseColor_%d.png' % (nom, k))
            if os.path.exists(p):
                with open(os.path.join(OUT, 'tex', '%s_%d.jpg' % (nom, k)), 'wb') as f: f.write(jpeg(Image.open(p), 512))

os.makedirs(os.path.join(OUT, 'tex'), exist_ok=True)
for n in SIMPLES: shutil.copyfile(os.path.join(SRC, n + '.glb'), os.path.join(OUT, n + '.glb'))
for n in TEXTURES: alleger(n)
for f in sorted(os.listdir(OUT)):
    p = os.path.join(OUT, f)
    if os.path.isfile(p): print('%-14s %7d octets' % (f, os.path.getsize(p)))
