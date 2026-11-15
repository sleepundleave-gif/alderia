# Regroupe les modèles de décor choisis (packs Quaternius, CC0) en un seul fichier par pack, textures réduites.
import json, os, glob
from PIL import Image
import numpy as np
X = '/home/user/.cache/dl/x'; OUT = '/home/user/JeuRPG/jeu/modeles/decor'
os.makedirs(OUT + '/tex', exist_ok=True)
def tex(src, size):
    key = os.path.splitext(os.path.basename(src))[0].replace('_png', '')
    im = Image.open(src); alpha = im.mode in ('RGBA', 'LA') and im.getchannel('A').getextrema()[0] < 250
    s = min(size, im.size[0]); im = im.resize((s, round(s * im.size[1] / im.size[0])), Image.LANCZOS)
    if alpha: out = key + '.png'; im.save(f'{OUT}/tex/{out}', optimize=True)
    else: out = key + '.jpg'; im.convert('RGB').save(f'{OUT}/tex/{out}', quality=82)
    return 'tex/' + out
def merge(name, srcdir, texdirs, models, size=1024, small=()):
    out = {'asset': {'version': '2.0', 'generator': 'ALDERIA build_decor.py (modeles Quaternius, CC0)'}, 'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'meshes': [], 'materials': [], 'textures': [], 'images': [], 'samplers': [{'magFilter': 9729, 'minFilter': 9987}], 'accessors': [], 'bufferViews': [], 'buffers': [{}]}
    blob = bytearray(); matIdx = {}; imgIdx = {}; tris = 0
    for m in models:
        f = f'{srcdir}/{m}.gltf'; j = json.load(open(f)); d = os.path.dirname(f)
        bins = [open(os.path.join(d, b['uri']), 'rb').read() for b in j['buffers']]
        bv0 = len(out['bufferViews']); ac0 = len(out['accessors']); me0 = len(out['meshes']); no0 = len(out['nodes'])
        for bv in j['bufferViews']:
            data = bins[bv['buffer']][bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
            while len(blob) % 4: blob.append(0)
            nb = {k: v for k, v in bv.items() if k not in ('buffer', 'byteOffset')}; nb['buffer'] = 0; nb['byteOffset'] = len(blob); blob += data; out['bufferViews'].append(nb)
        for a in j['accessors']:
            a = dict(a)
            if 'bufferView' in a: a['bufferView'] += bv0
            out['accessors'].append(a)
        def img(i):
            uri = j['images'][j['textures'][i]['source']]['uri']
            if uri not in imgIdx:
                src = next((os.path.join(t, n) for n in (uri, uri.replace('_png', '')) for t in [d] + texdirs if os.path.exists(os.path.join(t, n))), None)
                if not src: raise SystemExit('texture introuvable ' + uri)
                out['images'].append({'uri': tex(src, 512 if any(s in uri for s in tuple(small) + ('Normal', 'ORM', 'Roughness', 'Leaves', 'Flowers', 'Vine')) else size)}); out['textures'].append({'source': len(out['images']) - 1, 'sampler': 0}); imgIdx[uri] = len(out['textures']) - 1
            return imgIdx[uri]
        mm = {}
        for i, mt in enumerate(j.get('materials', [])):
            if mt['name'] not in matIdx:
                mt = json.loads(json.dumps(mt)); pbr = mt.get('pbrMetallicRoughness', {})
                for k in ('baseColorTexture', 'metallicRoughnessTexture'):
                    if k in pbr: pbr[k] = {'index': img(pbr[k]['index'])}
                for k in ('normalTexture', 'occlusionTexture', 'emissiveTexture'):
                    if k in mt: mt[k]['index'] = img(mt[k]['index'])
                out['materials'].append(mt); matIdx[mt['name']] = len(out['materials']) - 1
            mm[i] = matIdx[mt['name']]
        for me in j['meshes']:
            me = json.loads(json.dumps(me))
            for p in me['primitives']:
                vc = '_Vertex' in j['materials'][p['material']]['name']          # couleurs peintes sur les sommets (pommes, carottes) : à garder
                p['attributes'] = {k: v + ac0 for k, v in p['attributes'].items() if k in ('POSITION', 'NORMAL', 'TEXCOORD_0') or (vc and k == 'COLOR_0')}
                p['indices'] += ac0; tris += j['accessors'][p['indices'] - ac0]['count'] // 3
                if 'material' in p: p['material'] = mm[p['material']]
            out['meshes'].append(me)
        roots = j['scenes'][j.get('scene', 0)]['nodes']
        for n in j['nodes']:
            n = dict(n)
            if 'mesh' in n: n['mesh'] += me0
            n.pop('skin', None)
            if 'children' in n: n['children'] = [c + no0 for c in n['children']]
            out['nodes'].append(n)
        out['nodes'].append({'name': m, 'children': [r + no0 for r in roots]}); out['scenes'][0]['nodes'].append(len(out['nodes']) - 1)
    out['buffers'][0] = {'uri': name + '.bin', 'byteLength': len(blob)}
    open(f'{OUT}/{name}.bin', 'wb').write(blob); json.dump(out, open(f'{OUT}/{name}.gltf', 'w'), separators=(',', ':'))
    print(name, len(models), 'modèles', tris, 'triangles', round(len(blob) / 1e6, 2), 'Mo', len(out['materials']), 'matières', len(out['images']), 'textures')
V = glob.glob(X + '/village/*')[0]
merge('village', V + '/glTF', [V + '/Textures'], '''Wall_Plaster_Straight Wall_Plaster_Window_Wide_Flat Wall_Plaster_Window_Wide_Round Wall_Plaster_Door_Flat Wall_Plaster_Door_Round Wall_Plaster_WoodGrid
 Wall_UnevenBrick_Straight Wall_UnevenBrick_Window_Wide_Flat Wall_UnevenBrick_Window_Wide_Round Wall_UnevenBrick_Door_Flat Wall_UnevenBrick_Door_Round Corner_Exterior_Wood
 Door_1_Flat Door_2_Flat Door_1_Round Door_2_Round Window_Wide_Flat1 Window_Wide_Round1 WindowShutters_Wide_Flat_Open WindowShutters_Wide_Round_Open WindowShutters_Wide_Flat_Closed
 Roof_RoundTiles_4x4 Roof_RoundTiles_4x6 Roof_RoundTiles_6x6 Roof_RoundTiles_6x8 Roof_RoundTiles_6x10 Roof_RoundTiles_8x8 Roof_RoundTiles_8x10 Roof_RoundTiles_8x12 Roof_RoundTiles_8x14 Roof_RoundTiles_6x12 Roof_Front_Brick4 Roof_Front_Brick6 Roof_Front_Brick8
 Prop_Chimney Prop_Chimney2 Prop_Crate Prop_Wagon Prop_WoodenFence_Single Prop_WoodenFence_Extension1 Prop_Vine1 Prop_Vine2 Prop_Vine5 Floor_UnevenBrick Floor_Brick Floor_WoodDark
 Prop_ExteriorBorder_Straight1 Roof_Wooden_2x1 Wall_Arch Prop_Support Stairs_Exterior_Straight Balcony_Simple_Straight
 Roof_Tower_RoundTiles Prop_MetalFence_Simple Floor_RedBrick Balcony_Cross_Straight Door_8_Round'''.split())
N = X + '/nature'
merge('nature', N + '/glTF', [N + '/Textures'], '''CommonTree_1 CommonTree_2 CommonTree_3 CommonTree_4 CommonTree_5 Pine_1 Pine_2 Pine_3 Pine_4 Pine_5 TwistedTree_1 DeadTree_1 DeadTree_2
 Bush_Common Bush_Common_Flowers Rock_Medium_1 Rock_Medium_2 Rock_Medium_3 Grass_Common_Short Grass_Wispy_Short Flower_3_Group Flower_4_Group Fern_1 Plant_1 Plant_7 Mushroom_Common
 Pebble_Round_1 Pebble_Round_2 Pebble_Round_3 Clover_1 Flower_3_Single Flower_4_Single'''.split(), small=('Normal', 'Grass', 'Mushrooms', 'PathRocks'))
P = X + '/props'
merge('objets', P + '/Exports/glTF', [P + '/Textures'], '''Anvil Anvil_Log Barrel Barrel_Apples Barrel_Holder Crate_Wooden Chest_Wood Stall_Empty Stall_Cart_Empty Banner_1 Banner_2 Bench Table_Large Lantern_Wall
 WeaponStand Workbench Cauldron FarmCrate_Apple FarmCrate_Carrot Bag Dummy Stool Bucket_Wooden_1 Mug Pot_1 Whetstone Torch_Metal Sword_Bronze Shield_Wooden Axe_Bronze Pickaxe_Bronze
 Bookcase_2 Chandelier Chair_1 Chalice Coin_Pile Potion_1 Potion_2 Potion_4 Vase_2 Vase_4 Scroll_1 Bucket_Metal BookStand Book_Stack_1'''.split())
# Sols : textures photographiques de Poly Haven (CC0), ramenées à une moyenne claire pour être teintées par la couleur du jeu
for n, out in [('rocky_terrain_02', 'sol_herbe'), ('grass_path_2', 'sol_terre'), ('cobblestone_floor_04', 'sol_paves'), ('forest_leaves_03', 'sol_feuilles'), ('wood_planks_dirt', 'sol_planches'),
               ('white_sandstone_blocks_02', 'mur_blanc'), ('mossy_brick', 'mur_egout'), ('marble_tiles', 'sol_marbre'), ('roof_slates_02', 'ardoise')]:   # chapitre 3 : remparts, égouts, salle du trône, toits
    a = np.asarray(Image.open(f'/home/user/.cache/dl/ph/{n}.jpg').convert('RGB').resize((512, 512), Image.LANCZOS), dtype=np.float32) / 255
    lum = a.mean(axis=2, keepdims=True); grey = lum / lum.mean()                    # relief clair/sombre
    tint = a / a.reshape(-1, 3).mean(0)                                              # variations de teinte
    r = np.clip((0.7 * grey ** 0.85 + 0.3 * tint) * 0.82, 0, 1)
    if out == 'mur_egout': r = np.clip(a * 2.1, 0, 1)                                 # briques moussues : on garde les vraies couleurs, éclaircies
    if out == 'sol_marbre': r = np.clip(0.62 + (grey - 1) * 0.35, 0, 1) * np.ones(3)   # dalles : relief adouci
    Image.fromarray((r * 255).astype('uint8')).save(f'{OUT}/tex/{out}.jpg', quality=85)
