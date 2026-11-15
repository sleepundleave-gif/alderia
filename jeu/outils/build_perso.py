# Prépare les fichiers importés (packs Quaternius, CC0) pour le jeu : textures réduites, clips utiles seulement.
import json, glob, os, struct, shutil
from PIL import Image
X = '/home/user/.cache/dl/x'; OUT = '/home/user/JeuRPG/jeu/modeles/perso'
os.makedirs(OUT + '/tex', exist_ok=True)
OUTFITS = glob.glob(X + '/modular-character-outfits-fantasy/*/Exports/glTF*/Outfits')[0]
BASE = glob.glob(X + '/universal-base-characters/*/Base Characters/Godot - UE')[0]
HAIR = glob.glob(X + '/universal-base-characters/*/Hairstyles/Rigged to Head Bone/glTF*')[0]
TEXDIRS = [OUTFITS, BASE, HAIR] + glob.glob(X + '/modular-character-outfits-fantasy/*/Textures/*') + glob.glob(X + '/universal-base-characters/*/Base Characters/Textures')
done = {}
def tex(name, size=1024):
    key = os.path.splitext(name)[0].replace('_png', '')
    if key in done: return done[key]
    src = next((os.path.join(d, n) for n in (name, name.replace('_png', '')) for d in TEXDIRS if os.path.exists(os.path.join(d, n))), None)
    if not src: raise SystemExit('texture introuvable ' + name)
    im = Image.open(src); alpha = im.mode in ('RGBA', 'LA') and im.getchannel('A').getextrema()[0] < 250
    s = min(size, im.size[0])
    if any(w in key for w in ('Normal', 'ORM', 'Roughness')): s = min(s, 512)      # relief et rugosité : 512 suffit, c'est moitié moins à télécharger
    if 'Eye' in key: s = im.size[0]
    im = im.resize((s, s), Image.LANCZOS)
    if alpha: out = key + '.png'; im.save(os.path.join(OUT, 'tex', out), optimize=True)
    else: out = key + '.jpg'; im.convert('RGB').save(os.path.join(OUT, 'tex', out), quality=84)
    done[key] = 'tex/' + out; return done[key]
def copy(src, dst):
    j = json.load(open(src)); d = os.path.dirname(src)
    for im in j.get('images', []): im['uri'] = tex(im['uri']); im.pop('mimeType', None)
    for b in j['buffers']: shutil.copy(os.path.join(d, b['uri']), os.path.join(OUT, dst + '.bin')); b['uri'] = dst + '.bin'
    json.dump(j, open(os.path.join(OUT, dst + '.gltf'), 'w'), separators=(',', ':'))
for n in ['Male_Peasant', 'Female_Peasant', 'Male_Ranger', 'Female_Ranger']: copy(f'{OUTFITS}/{n}.gltf', n)
copy(f'{BASE}/Superhero_Male_FullBody.gltf', 'Base_Male'); copy(f'{BASE}/Superhero_Female_FullBody.gltf', 'Base_Female')
for n in ['Hair_Beard', 'Hair_Buns', 'Hair_Buzzed', 'Hair_Long', 'Hair_SimpleParted']: copy(f'{HAIR}/{n}.gltf', n)
# armes (Fantasy Props MegaKit)
PROPS = X + '/props/Exports/glTF'; TEXDIRS.append(X + '/props/Textures')
for n in ['Sword_Bronze', 'Shield_Wooden', 'Axe_Bronze']: copy(f'{PROPS}/{n}.gltf', n)
# variantes de couleur
for n in ['T_Peasant_2_BaseColor.png', 'T_Ranger_3_BaseColor.png', 'T_Superhero_Male_Ligh.png', 'T_Superhero_Female_Light_BaseColor.png', 'T_Hair_1_BaseColor.png', 'T_Hair_2_BaseColor.png']: tex(n)
# peau claire pour les mains (corps « Regular ») : même rapport clair/foncé que les têtes
import numpy as np
def mean(p): return np.asarray(Image.open(os.path.join(OUT, p)).convert('RGB'), dtype=np.float32).reshape(-1, 3).mean(0)
for g, light, dark in [('Male', 'tex/T_Superhero_Male_Ligh.jpg', 'tex/T_Superhero_Male_Dark.jpg'), ('Female', 'tex/T_Superhero_Female_Light_BaseColor.jpg', 'tex/T_Superhero_Female_Dark_BaseColor.jpg')]:
    ratio = mean(light) / mean(dark); a = np.asarray(Image.open(f'{OUT}/tex/T_Regular_{g}_Dark_BaseColor.jpg').convert('RGB'), dtype=np.float32)
    Image.fromarray(np.clip(a * ratio, 0, 255).astype('uint8')).save(f'{OUT}/tex/T_Regular_{g}_Light_BaseColor.jpg', quality=84); print(g, 'rapport clair/foncé', ratio.round(2))
# animations : seulement les clips utiles, rotations des os + déplacement du bassin
KEEP = ['Idle_Loop', 'Idle_Talking_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sword_Idle', 'Sword_Attack', 'Punch_Cross', 'Spell_Simple_Enter', 'Spell_Simple_Idle_Loop', 'Spell_Simple_Shoot', 'Spell_Simple_Exit', 'Hit_Chest', 'Hit_Head', 'Death01', 'Sitting_Idle_Loop', 'Fixing_Kneeling', 'Interact', 'Roll']
data = open(glob.glob(X + '/universal-animation-library/*/Unreal-Godot/UAL1_Standard.glb')[0], 'rb').read()
jl = struct.unpack('<I', data[12:16])[0]; j = json.loads(data[20:20 + jl]); bo = 20 + jl; bl = struct.unpack('<I', data[bo:bo + 4])[0]; bn = data[bo + 8:bo + 8 + bl]
anims = [a for a in j['animations'] if a['name'] in KEEP]; assert len(anims) == len(KEEP), [a['name'] for a in anims]
for a in anims:
    ch = [c for c in a['channels'] if c['target']['path'] == 'rotation' or (c['target']['path'] == 'translation' and j['nodes'][c['target']['node']]['name'] in ('root', 'pelvis'))]
    used = sorted(set(c['sampler'] for c in ch)); rm = {s: i for i, s in enumerate(used)}
    a['samplers'] = [a['samplers'][s] for s in used]
    for c in ch: c['sampler'] = rm[c['sampler']]
    a['channels'] = ch
accs = sorted(set(x for a in anims for s in a['samplers'] for x in (s['input'], s['output'])))
NC = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}; nb = bytearray(); nbv = []; nacc = []; amap = {}
for ai in accs:
    acc = dict(j['accessors'][ai]); bv = j['bufferViews'][acc['bufferView']]; assert acc['componentType'] == 5126 and 'byteStride' not in bv
    size = acc['count'] * NC[acc['type']] * 4; st = bv.get('byteOffset', 0) + acc.get('byteOffset', 0)
    nbv.append({'buffer': 0, 'byteOffset': len(nb), 'byteLength': size}); nb += bn[st:st + size]
    acc['bufferView'] = len(nbv) - 1; acc.pop('byteOffset', None); amap[ai] = len(nacc); nacc.append(acc)
for a in anims:
    for s in a['samplers']: s['input'] = amap[s['input']]; s['output'] = amap[s['output']]
for n in j['nodes']: n.pop('mesh', None); n.pop('skin', None)
for k in ['meshes', 'skins', 'materials', 'textures', 'images', 'samplers']: j.pop(k, None)
j['animations'] = anims; j['accessors'] = nacc; j['bufferViews'] = nbv; j['buffers'] = [{'byteLength': len(nb)}]
js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
open(OUT + '/anims.glb', 'wb').write(b'glTF' + struct.pack('<II', 2, 12 + 8 + len(js) + 8 + len(nb)) + struct.pack('<I', len(js)) + b'JSON' + js + struct.pack('<I', len(nb)) + b'BIN\x00' + bytes(nb))
print('clips', [(a['name'], round(nacc[a['samplers'][0]['input']]['max'][0], 2)) for a in anims])
