// ============================================================
//  Construit le « décor réaliste » du jeu : modeles/reel/nature.gltf (+ .bin + tex/)
//
//  Sources (toutes libres) :
//   - rochers, souches, fougères, herbes, fleurs : scans de Poly Haven (CC0), téléchargés par polyhaven.py ;
//   - arbres et buissons : générés par ez-tree (licence MIT), avec des écorces photographiées
//     (Poly Haven et TextureCan, CC0) et les feuillages fournis avec ez-tree.
//
//  Chaque pièce REMPLACE une pièce du pack d'origine et porte le même nom (CommonTree_1, Rock_Medium_2…),
//  à la même taille : le jeu n'a rien d'autre à changer que de charger ce fichier par-dessus.
//  Les scans sont allégés (quelques centaines à quelques milliers de triangles) et les images réduites.
//
//  Usage (une fois) :
//    mkdir travail && cd travail
//    npm i @dgreenheck/ez-tree three meshoptimizer sharp --legacy-peer-deps
//    python3 <jeu>/outils/reel/polyhaven.py prendre rock_moss_set_01 namaqualand_stones_01 \
//       fern_02 shrub_sorrel_01 weed_plant_02 nettle_plant flower_empodium dandelion_01 grass_bermuda_01 --dest dl
//    node <jeu>/outils/reel/construire.mjs dl <jeu>
// ============================================================
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(path.join(process.cwd(), 'x.js'));
const dossier = (n) => path.join(process.cwd(), 'node_modules', n);      // à lancer depuis le dossier où l'on a fait « npm i »
const imp = (n, f) => import(f ? path.join(dossier(n), f) : require.resolve(n));

globalThis.document = { createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, set src(v) {}, style: {} }) };   // ez-tree charge ses images au démarrage : on fait semblant
globalThis.self = globalThis;
const THREE = await imp('three', 'build/three.module.js');
const { Tree } = await imp('@dgreenheck/ez-tree', 'build/ez-tree.es.js');
const { MeshoptSimplifier } = await imp('meshoptimizer');
const sharp = (await imp('sharp')).default;
await MeshoptSimplifier.ready;

const [DL, JEU] = process.argv.slice(2);
const SORTIE = path.join(JEU, 'modeles', 'reel'), TEX = path.join(SORTIE, 'tex');
fs.mkdirSync(TEX, { recursive: true });
const EZ = dossier('@dgreenheck/ez-tree');

// ---------- Lire un glTF (fichier .gltf + .bin) ----------
function lireGltf(fichier) {
  const json = JSON.parse(fs.readFileSync(fichier, 'utf8')), dir = path.dirname(fichier);
  const bufs = json.buffers.map((b) => fs.readFileSync(path.join(dir, decodeURIComponent(b.uri))));
  const acc = (i) => {
    const a = json.accessors[i], v = json.bufferViews[a.bufferView], n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    const T = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array, 5121: Uint8Array }[a.componentType], taille = T.BYTES_PER_ELEMENT;
    const buf = bufs[v.buffer], debut = (v.byteOffset || 0) + (a.byteOffset || 0), pas = v.byteStride || n * taille, out = new (a.componentType === 5126 ? Float32Array : Uint32Array)(a.count * n);
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) { const o = debut + k * pas + c * taille; out[k * n + c] = a.componentType === 5126 ? dv.getFloat32(o, true) : a.componentType === 5123 ? dv.getUint16(o, true) : a.componentType === 5125 ? dv.getUint32(o, true) : dv.getUint8(o); }
    return out;
  };
  const noeuds = {};
  const visiter = (i, parent, racine) => {
    const n = json.nodes[i], m = new THREE.Matrix4();
    if (n.matrix) m.fromArray(n.matrix); else m.compose(new THREE.Vector3(...(n.translation || [0, 0, 0])), new THREE.Quaternion(...(n.rotation || [0, 0, 0, 1])), new THREE.Vector3(...(n.scale || [1, 1, 1])));
    const monde = parent.clone().multiply(m), nom = racine || n.name;
    if (n.mesh != null) for (const p of json.meshes[n.mesh].primitives) {
      const pos = acc(p.attributes.POSITION), nor = p.attributes.NORMAL != null ? acc(p.attributes.NORMAL) : null, uv = p.attributes.TEXCOORD_0 != null ? acc(p.attributes.TEXCOORD_0) : new Float32Array(pos.length / 3 * 2);
      const idx = p.indices != null ? acc(p.indices) : Uint32Array.from({ length: pos.length / 3 }, (_, k) => k);
      const nm = new THREE.Matrix3().getNormalMatrix(monde), v = new THREE.Vector3();
      for (let k = 0; k < pos.length; k += 3) { v.fromArray(pos, k).applyMatrix4(monde).toArray(pos, k); if (nor) v.fromArray(nor, k).applyMatrix3(nm).normalize().toArray(nor, k); }
      (noeuds[nom] = noeuds[nom] || []).push({ pos, nor, uv, idx: Uint32Array.from(idx), mat: json.materials[p.material || 0].name });
    }
    for (const c of n.children || []) visiter(c, monde, nom);
  };
  for (const i of json.scenes[json.scene || 0].nodes) visiter(i, new THREE.Matrix4(), null);
  return noeuds;
}

// ---------- Géométrie ----------
function boite(prims) {
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const p of prims) for (let k = 0; k < p.pos.length; k++) { const c = k % 3, v = p.pos[k]; if (v < mn[c]) mn[c] = v; if (v > mx[c]) mx[c] = v; }
  return { mn, mx, h: mx[1] - mn[1], l: Math.max(mx[0] - mn[0], mx[2] - mn[2]) };
}
// Réduit le nombre de triangles d'un morceau, puis ne garde que les sommets encore utilisés
function alleger(p, cible, erreur = 0.05, o = {}) {
  let idx = p.idx;
  if (idx.length / 3 > cible) {
    // les scans ont des coutures (même point, deux coordonnées d'image) : on soude d'abord les points confondus, sinon l'allègement s'arrête aux coutures
    const n = Math.max(12, Math.floor(cible) * 3);
    idx = MeshoptSimplifier.simplify(idx, p.pos, 3, n, erreur)[0];
    if (idx.length > n * 1.5 && !o.doux) idx = MeshoptSimplifier.simplify(idx, p.pos, 3, n, 0.5)[0];
    if (idx.length > n * 1.5 && o.plein) idx = MeshoptSimplifier.simplifySloppy(p.idx, p.pos, 3, n, 0.5)[0];
  }
  const carte = new Map(), pos = [], nor = [], uv = [], out = new Uint32Array(idx.length);
  for (let k = 0; k < idx.length; k++) {
    const i = idx[k]; let j = carte.get(i);
    if (j === undefined) { j = carte.size; carte.set(i, j); pos.push(p.pos[i * 3], p.pos[i * 3 + 1], p.pos[i * 3 + 2]); if (p.nor) nor.push(p.nor[i * 3], p.nor[i * 3 + 1], p.nor[i * 3 + 2]); uv.push(p.uv[i * 2], p.uv[i * 2 + 1]); }
    out[k] = j;
  }
  return { pos: Float32Array.from(pos), nor: p.nor ? Float32Array.from(nor) : null, uv: Float32Array.from(uv), idx: out, mat: p.mat };
}
function fusion(liste) {       // plusieurs morceaux de même matière → un seul
  const par = {};
  for (const p of liste) (par[p.mat] = par[p.mat] || []).push(p);
  return Object.entries(par).map(([mat, ps]) => {
    const n = ps.reduce((s, p) => s + p.pos.length / 3, 0), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = new Uint32Array(ps.reduce((s, p) => s + p.idx.length, 0));
    let v = 0, i = 0;
    for (const p of ps) { pos.set(p.pos, v * 3); if (p.nor) nor.set(p.nor, v * 3); uv.set(p.uv, v * 2); for (let k = 0; k < p.idx.length; k++) idx[i + k] = p.idx[k] + v; v += p.pos.length / 3; i += p.idx.length; }
    return { pos, nor, uv, idx, mat };
  });
}
const copie = (ps) => ps.map((p) => ({ pos: p.pos.slice(), nor: p.nor ? p.nor.slice() : null, uv: p.uv.slice(), idx: p.idx.slice(), mat: p.mat }));
function deplacer(ps, dx, dz, ry = 0, s = 1) {
  const c = Math.cos(ry), sn = Math.sin(ry);
  for (const p of ps) for (let k = 0; k < p.pos.length; k += 3) {
    const x = p.pos[k] * s, z = p.pos[k + 2] * s; p.pos[k] = x * c + z * sn + dx; p.pos[k + 1] *= s; p.pos[k + 2] = -x * sn + z * c + dz;
    if (p.nor) { const nx = p.nor[k], nz = p.nor[k + 2]; p.nor[k] = nx * c + nz * sn; p.nor[k + 2] = -nx * sn + nz * c; }
  }
  return ps;
}
// Pose la pièce au sol, centrée, à la taille voulue (hauteur, ou largeur si « large »)
function normaliser(ps, taille, o = {}) {
  let b = boite(ps);
  const cx = o.centre === false ? 0 : (b.mn[0] + b.mx[0]) / 2, cz = o.centre === false ? 0 : (b.mn[2] + b.mx[2]) / 2, k = taille / (o.large ? b.l : b.h);
  for (const p of ps) for (let i = 0; i < p.pos.length; i += 3) { p.pos[i] = (p.pos[i] - cx) * k; p.pos[i + 1] = (p.pos[i + 1] - b.mn[1]) * k - (o.enfonce || 0) * taille; p.pos[i + 2] = (p.pos[i + 2] - cz) * k; }
  return ps;
}

// ---------- Tailles de référence : les pièces du pack d'origine ----------
const ORIG = Object.assign({}, ...['village', 'objets', 'nature'].map((f) => lireGltf(path.join(JEU, 'modeles', 'decor', f + '.gltf'))));
const ref = (nom) => boite(ORIG[nom]);

// ---------- Arbres (ez-tree) ----------
const TEINTES = {};
const AFFINER = { segments: [6, 4, 3, 3], sections: 0.6 };
function arbre(preset, o = {}) {
  const t = new Tree(); t.loadPreset(preset);
  const op = t.options;
  if (o.seed) op.seed = o.seed;
  for (const l of [0, 1, 2, 3]) {
    if (op.branch.segments[l] != null) op.branch.segments[l] = Math.min(op.branch.segments[l], AFFINER.segments[l]);
    if (op.branch.sections[l] != null) op.branch.sections[l] = Math.max(1, Math.round(op.branch.sections[l] * (o.sections || AFFINER.sections)));
  }
  if (o.enfants) o.enfants.forEach((n, l) => { if (n != null) op.branch.children[l] = n; });     // moins de branches = moins de triangles
  if (o.feuilles != null) { op.leaves.count = o.feuilles; op.leaves.size *= o.taille || 1; }        // feuilles par rameau, et taille des cartes
  if (o.ecorce) op.bark.type = o.ecorce;
  if (o.options) o.options(op);
  t.generate();
  const prims = [], g = t.branchesMesh.geometry, sx = op.bark.textureScale.x, sy = 1 / op.bark.textureScale.y;
  const uv = Float32Array.from(g.attributes.uv.array); for (let k = 0; k < uv.length; k += 2) { uv[k] *= sx * 2; uv[k + 1] *= sy * 2; }
  prims.push({ pos: Float32Array.from(g.attributes.position.array), nor: Float32Array.from(g.attributes.normal.array), uv, idx: Uint32Array.from(g.index.array), mat: 'Bark_Reel_' + op.bark.type });
  TEINTES['Bark_Reel_' + op.bark.type] = TEINTES['Bark_Reel_' + op.bark.type] || op.bark.tint; TEINTES['Leaves_Reel_' + op.leaves.type] = TEINTES['Leaves_Reel_' + op.leaves.type] || op.leaves.tint;
  const l = t.leavesMesh.geometry;
  if (op.leaves.count > 0 && l.index && l.index.count) {
    // les normales des feuilles pointent vers l'extérieur de la couronne : le feuillage prend la lumière comme une masse, pas carte par carte
    const pos = Float32Array.from(l.attributes.position.array), nor = new Float32Array(pos.length), b = boite([{ pos }]), c = [(b.mn[0] + b.mx[0]) / 2, b.mn[1] + b.h * 0.35, (b.mn[2] + b.mx[2]) / 2], v = new THREE.Vector3();
    for (let k = 0; k < pos.length; k += 3) v.set(pos[k] - c[0], (pos[k + 1] - c[1]) * 1.2 + b.h * 0.25, pos[k + 2] - c[2]).normalize().toArray(nor, k);
    const uvl = Float32Array.from(l.attributes.uv.array);
    prims.push({ pos, nor, uv: uvl, idx: Uint32Array.from(l.index.array), mat: 'Leaves_Reel_' + op.leaves.type });
  }
  if (process.env.DETAIL) console.log(preset, prims.map((p) => p.mat + ' ' + p.idx.length / 3).join(', '), 'niveaux', op.branch.levels, JSON.stringify(op.branch.sections), JSON.stringify(op.branch.segments), JSON.stringify(op.branch.children), 'feuilles', op.leaves.count, op.leaves.size.toFixed(2), op.leaves.billboard);
  return prims;
}

const PIECES = {};
const poser = (nom, prims, o = {}) => { const r = ref(o.comme || nom); PIECES[nom] = normaliser(prims, (o.large ? r.l : r.h) * (o.k || 1), o); };

// Budget : environ 2 500 triangles par arbre (une forêt du jeu en compte 150 à 200), 5 000 pour l'arbre géant.
poser('CommonTree_1', arbre('Oak Medium', { enfants: [5, 3, 2], feuilles: 5, taille: 2.0 }));
poser('CommonTree_2', arbre('Ash Medium', { enfants: [5, 3, 2], feuilles: 5, taille: 2.0, sections: 0.4 }));
poser('CommonTree_5', arbre('Oak Medium', { enfants: [5, 3, 2], feuilles: 5, taille: 2.0, seed: 9041 }));
poser('CommonTree_3', arbre('Aspen Medium', { enfants: [8, 2], feuilles: 12, taille: 2.1, sections: 0.45 }));
poser('CommonTree_4', arbre('Aspen Medium', { enfants: [8, 2], feuilles: 12, taille: 2.1, sections: 0.45, seed: 5127 }));
poser('Pine_2', arbre('Pine Medium', { enfants: [34], feuilles: 8, taille: 1.8, sections: 0.4 }));
poser('Pine_4', arbre('Pine Large', { enfants: [40], feuilles: 7, taille: 1.65, sections: 0.4 }));
poser('Pine_5', arbre('Pine Medium', { enfants: [34], feuilles: 8, taille: 1.8, sections: 0.4, seed: 7713 }));
PIECES.Pine_1 = normaliser(copie(PIECES.Pine_2), ref('Pine_1').h); PIECES.Pine_3 = normaliser(copie(PIECES.Pine_5), ref('Pine_3').h);
poser('TwistedTree_1', arbre('Oak Large', { enfants: [7, 3, 2], feuilles: 7, taille: 1.7, sections: 0.4 }));
poser('DeadTree_1', arbre('Oak Small', { feuilles: 0, ecorce: 'willow', sections: 0.6 }));
poser('DeadTree_2', arbre('Ash Small', { feuilles: 0, ecorce: 'willow', enfants: [7, 3], sections: 0.6, seed: 3311 }));
poser('Bush_Common', arbre('Bush 1', { enfants: [4, 2, 1], feuilles: 5, taille: 2.0, sections: 0.4 }), { k: 1.1 });
poser('Bush_Common_Flowers', arbre('Bush 2', { enfants: [6, 2], feuilles: 6, taille: 2.0, sections: 0.4 }), { k: 1.1 });

// ---------- Rochers et plantes (Poly Haven) ----------
const PH = {};
const scan = (id) => PH[id] || (PH[id] = lireGltf(path.join(DL, id, id + '.gltf')));
const morceau = (id, noeud, cible, mat) => { const ps = scan(id)[noeud]; if (!ps) throw new Error(id + ' : pas de nœud ' + noeud + ' (' + Object.keys(scan(id)).join(', ') + ')'); return ps.map((p) => Object.assign(alleger(p, cible / ps.length), { mat })); };

poser('Rock_Medium_1', morceau('rock_moss_set_01', 'rock_moss_set_01_rock01', 420, 'Rock_Reel_mousse'), { large: true, enfonce: 0.04 });
poser('Rock_Medium_2', morceau('rock_moss_set_01', 'rock_moss_set_01_rock03', 380, 'Rock_Reel_mousse'), { large: true, enfonce: 0.04 });
poser('Rock_Medium_3', morceau('rock_moss_set_01', 'rock_moss_set_01_rock04', 380, 'Rock_Reel_mousse'), { large: true, enfonce: 0.04 });
'abe'.split('').forEach((l, i) => poser('Pebble_Round_' + (i + 1), morceau('namaqualand_stones_01', 'namaqualand_stones_01_' + l, 60, 'Rock_Reel_galet'), { large: true, enfonce: 0.1 }));

const touffe = (id, noeuds, cible, mat, rayon) => fusion(noeuds.flatMap((n, i) => { const ps = normaliser(copie(morceau(id, n, cible / noeuds.length, mat)), 1, { large: true }); const a = i * 2.4, r = i ? rayon * (0.6 + 0.4 * ((i * 7) % 3) / 2) : 0; return deplacer(ps, Math.cos(a) * r, Math.sin(a) * r, i * 1.9, i ? 0.8 + 0.2 * (i % 2) : 1); }));
poser('Fern_1', morceau('fern_02', 'fern_02_a', 320, 'Grass_Reel_fougere'), { large: true });
poser('Plant_1', morceau('weed_plant_02', 'weed_plant_02_a_LOD0', 220, 'Grass_Reel_herbe_folle'), { large: true });
poser('Plant_7', morceau('nettle_plant', 'nettle_plant_small_b_LOD0', 240, 'Grass_Reel_ortie'), { large: true });
poser('Clover_1', touffe('shrub_sorrel_01', ['shrub_sorrel_01_a', 'shrub_sorrel_01_b', 'shrub_sorrel_01_c'], 200, 'Grass_Reel_oseille', 0.7), { large: true });
const G = Object.keys(scan('grass_bermuda_01')).filter((n) => /medium|tall|large/.test(n));
poser('Grass_Common_Short', touffe('grass_bermuda_01', G.slice(0, 5), 400, 'Grass_Reel_herbe', 0.55), { large: true, k: 1.15 });
poser('Grass_Wispy_Short', touffe('grass_bermuda_01', G.slice(3, 9), 400, 'Grass_Reel_herbe', 0.6), { large: true, k: 1.15 });
poser('Flower_3_Single', morceau('dandelion_01', 'dandelion_01_a_LOD0', 200, 'Flowers_Reel_pissenlit'));
poser('Flower_4_Single', morceau('flower_empodium', 'flower_empodium_a_LOD0', 150, 'Flowers_Reel_etoile'));
poser('Flower_3_Group', touffe('dandelion_01', ['dandelion_01_a_LOD0', 'dandelion_01_b_LOD0', 'dandelion_01_c_LOD0'], 420, 'Flowers_Reel_pissenlit', 0.6), { large: true });
poser('Flower_4_Group', touffe('flower_empodium', ['flower_empodium_a_LOD0', 'flower_empodium_b_LOD0', 'flower_empodium_c_LOD0'], 330, 'Flowers_Reel_etoile', 0.6), { large: true });

// ---------- Variantes ----------
// Une pièce nommée « Nom~b » est une autre forme possible de « Nom » : le jeu tire au sort entre elles,
// si bien que deux chênes ou deux rochers voisins ne sont plus identiques.
const un = (id) => Object.keys(scan(id))[0];
poser('CommonTree_1~b', arbre('Oak Medium', { enfants: [5, 3, 2], feuilles: 5, taille: 2.0, seed: 20311 }), { comme: 'CommonTree_1' });
poser('CommonTree_2~b', arbre('Ash Medium', { enfants: [5, 3, 2], feuilles: 5, taille: 2.0, sections: 0.4, seed: 4177 }), { comme: 'CommonTree_2' });
poser('CommonTree_3~b', arbre('Aspen Medium', { enfants: [8, 2], feuilles: 12, taille: 2.1, sections: 0.45, seed: 811 }), { comme: 'CommonTree_3' });
poser('Pine_2~b', arbre('Pine Medium', { enfants: [34], feuilles: 8, taille: 1.8, sections: 0.4, seed: 1502 }), { comme: 'Pine_2' });
poser('Pine_4~b', arbre('Pine Large', { enfants: [40], feuilles: 7, taille: 1.65, sections: 0.4, seed: 6068 }), { comme: 'Pine_4' });
poser('Bush_Common~b', arbre('Bush 3', { enfants: [5, 2, 1], feuilles: 5, taille: 2.0, sections: 0.4 }), { comme: 'Bush_Common', k: 1.1 });
poser('DeadTree_1~b', arbre('Oak Small', { feuilles: 0, ecorce: 'willow', sections: 0.6, seed: 9902 }), { comme: 'DeadTree_1' });
poser('DeadTree_2~b', arbre('Ash Small', { feuilles: 0, ecorce: 'willow', enfants: [7, 3], sections: 0.6, seed: 12 }), { comme: 'DeadTree_2' });
// une souche de temps en temps à la place d'un arbre mort (taille réelle : le jeu affiche les arbres morts à moitié de leur taille)
PIECES['DeadTree_1~c'] = normaliser(morceau('tree_stump_01', un('tree_stump_01'), 520, 'Bark_Reel_souche'), 2.9, { large: true, enfonce: 0.07 });
PIECES['DeadTree_2~c'] = normaliser(morceau('tree_stump_02', un('tree_stump_02'), 520, 'Bark_Reel_souche2'), 2.9, { large: true, enfonce: 0.1 });

[['Rock_Medium_1', 'b', 1, '02'], ['Rock_Medium_2', 'b', 1, '05'], ['Rock_Medium_3', 'b', 1, '06'], ['Rock_Medium_1', 'c', 2, '07'], ['Rock_Medium_2', 'c', 2, '11'], ['Rock_Medium_3', 'c', 2, '13'], ['Rock_Medium_1', 'd', 2, '10'], ['Rock_Medium_2', 'd', 2, '12']]
  .forEach(([nom, l, jeu, n]) => poser(nom + '~' + l, morceau('rock_moss_set_0' + jeu, 'rock_moss_set_0' + jeu + '_rock' + n, 380, jeu === 1 ? 'Rock_Reel_mousse' : 'Rock_Reel_mousse2'), { comme: nom, large: true, enfonce: 0.04 }));
poser('Pebble_Round_1~b', morceau('namaqualand_stones_01', 'namaqualand_stones_01_c', 60, 'Rock_Reel_galet'), { comme: 'Pebble_Round_1', large: true, enfonce: 0.1 });
poser('Pebble_Round_2~b', morceau('namaqualand_stones_01', 'namaqualand_stones_01_d', 60, 'Rock_Reel_galet'), { comme: 'Pebble_Round_2', large: true, enfonce: 0.1 });
'bcd'.split('').forEach((l) => poser('Fern_1~' + l, morceau('fern_02', 'fern_02_' + l, 320, 'Grass_Reel_fougere'), { comme: 'Fern_1', large: true }));
'bc'.split('').forEach((l) => poser('Plant_1~' + l, morceau('weed_plant_02', 'weed_plant_02_' + l + '_LOD0', 220, 'Grass_Reel_herbe_folle'), { comme: 'Plant_1', large: true }));
poser('Clover_1~b', touffe('shrub_sorrel_01', ['shrub_sorrel_01_d', 'shrub_sorrel_01_e', 'shrub_sorrel_01_f'], 200, 'Grass_Reel_oseille', 0.7), { comme: 'Clover_1', large: true });
if (G.length >= 12) poser('Grass_Common_Short~b', touffe('grass_bermuda_01', G.slice(7, 12), 400, 'Grass_Reel_herbe', 0.55), { comme: 'Grass_Common_Short', large: true, k: 1.15 });
poser('Flower_3_Single~b', morceau('dandelion_01', 'dandelion_01_b_LOD0', 200, 'Flowers_Reel_pissenlit'), { comme: 'Flower_3_Single', k: 0.8 });
poser('Flower_4_Single~b', morceau('flower_empodium', 'flower_empodium_b_LOD0', 150, 'Flowers_Reel_etoile'), { comme: 'Flower_4_Single' });
// gazanias (fleurs orange, basses et larges) : même encombrement au sol que la fleur d'origine une fois réduite par le jeu
PIECES['Flower_3_Single~c'] = normaliser(morceau('flower_gazania', 'flower_gazania_a_LOD0', 220, 'Flowers_Reel_gazania'), 1.9, { large: true });
PIECES['Flower_4_Single~c'] = normaliser(morceau('flower_gazania', 'flower_gazania_b_LOD0', 220, 'Flowers_Reel_gazania'), 1.9, { large: true });
// branches mortes semées au sol (pièce nouvelle : le jeu ne la sème que si elle existe)
'abc'.split('').forEach((l, i) => { PIECES['Branche_1' + (i ? '~' + 'abc'[i] : '')] = normaliser(morceau('dry_branches_medium_01', 'dry_branches_medium_01_' + l, 110, 'Bark_Reel_branche'), 2.3, { large: true, enfonce: 0.15 }); });

// ---------- Objets (scans Poly Haven) ----------
// Chaque objet prend la place d'un objet du pack d'origine : même nom, posé au même endroit, à la même hauteur ou à la même largeur.
const OBJETS = {};
const tout = (id, cible, mat, filtre) => {
  const sc = scan(id), noms = Object.keys(sc).filter((n) => !filtre || filtre.test(n)); if (!noms.length) throw new Error(id + ' : aucun nœud pour ' + filtre);
  const total = noms.reduce((t, n) => t + sc[n].reduce((u, p) => u + p.idx.length / 3, 0), 0);
  return fusion(noms.flatMap((n) => sc[n].map((p) => Object.assign(alleger(p, Math.max(12, cible * (p.idx.length / 3) / total)), { mat }))));
};
const monter = (ps, dy) => { for (const p of ps) for (let k = 1; k < p.pos.length; k += 3) p.pos[k] += dy; return ps; };
// Met « prims » à la place de la pièce d'origine « nom ». mode : 'h' même hauteur, 'l' même largeur, 'boite' tient dans le même volume.
function caler(prims, nom, mode = 'h', o = {}) {
  const r = ref(nom), rx = r.mx[0] - r.mn[0], rz = r.mx[2] - r.mn[2]; let b = boite(prims), dx = b.mx[0] - b.mn[0], dz = b.mx[2] - b.mn[2];
  const allonge = (x, z) => Math.abs(Math.log(x / z)) > 0.14;
  const quart = o.tourner != null ? o.tourner : (allonge(dx, dz) && allonge(rx, rz) && (dx > dz) !== (rx > rz) ? Math.PI / 2 : 0);
  if (quart) { deplacer(prims, 0, 0, quart); b = boite(prims); dx = b.mx[0] - b.mn[0]; dz = b.mx[2] - b.mn[2]; }
  const k = (o.k || 1) * (mode === 'h' ? r.h / b.h : mode === 'l' ? r.l / b.l : Math.min(r.h / b.h, rx / dx, rz / dz));
  const cx = (b.mn[0] + b.mx[0]) / 2, cz = (b.mn[2] + b.mx[2]) / 2, ox = (r.mn[0] + r.mx[0]) / 2, oz = (r.mn[2] + r.mx[2]) / 2;
  // 'etire' : la pièce prend exactement la boîte de l'ancienne (meubles contre un mur, objets posés dessus)
  const [kx, ky, kz] = mode === 'etire' ? [rx / dx, r.h / b.h, rz / dz] : [k, k, k];
  for (const p of prims) for (let i = 0; i < p.pos.length; i += 3) {
    p.pos[i] = (p.pos[i] - cx) * kx + ox; p.pos[i + 1] = (p.pos[i + 1] - b.mn[1]) * ky + r.mn[1]; p.pos[i + 2] = (p.pos[i + 2] - cz) * kz + oz;
    if (mode === 'etire' && p.nor) { const x = p.nor[i] / kx, y = p.nor[i + 1] / ky, z = p.nor[i + 2] / kz, n = Math.hypot(x, y, z) || 1; p.nor[i] = x / n; p.nor[i + 1] = y / n; p.nor[i + 2] = z / n; }
  }
  return prims;
}
const pommes = (liste, taille) => liste.flatMap(([x, y, z], i) => monter(deplacer(normaliser(tout('food_apple_01', 84, 'Objet_Reel_pomme'), taille), x, z, i * 1.7), y));

OBJETS.Barrel = caler(tout('wine_barrel_01', 520, 'Objet_Reel_tonneau'), 'Barrel');
{ const t = caler(morceau('wooden_barrels_01', 'wooden_barrels_01_barrel01', 520, 'Objet_Reel_tonneau2'), 'Barrel_Apples'), b = boite(t), y = b.mx[1] - 0.035, cx = (b.mn[0] + b.mx[0]) / 2, cz = (b.mn[2] + b.mx[2]) / 2;
  OBJETS.Barrel_Apples = [...t, ...pommes([0, 1, 2, 3, 4, 5].map((i) => [cx + Math.cos(i * 1.047) * 0.17, y, cz + Math.sin(i * 1.047) * 0.17]).concat([[cx, y, cz], [cx + 0.08, y + 0.11, cz + 0.03], [cx - 0.07, y + 0.11, cz - 0.06], [cx, y + 0.11, cz + 0.11]]), 0.15)]; }
OBJETS['Barrel~b'] = caler(morceau('wooden_barrels_01', 'wooden_barrels_01_barrel01', 520, 'Objet_Reel_tonneau2'), 'Barrel');
// caisses : le pack d'origine a une grosse caisse cubique, les scans sont des caisses longues → on en fait une pile de même encombrement
const caisseLongue = () => tout('wooden_crate_02', 420, 'Objet_Reel_caisse2'), caissePlate = () => tout('wooden_crate_01', 420, 'Objet_Reel_caisse');
{ const a = caisseLongue(), b = deplacer(caisseLongue(), 0.56, 0.03, 0.04), c = monter(deplacer(caisseLongue(), 0.3, 0, Math.PI / 2 + 0.12), 0.47);
  OBJETS.Prop_Crate = caler(fusion([...deplacer(a, 0, 0, -0.03), ...b, ...c]), 'Prop_Crate', 'l', { tourner: 0 }); }
{ const a = caisseLongue(), b = deplacer(caisseLongue(), 0.57, -0.04, -0.05), c = monter(deplacer(caissePlate(), 0.28, -0.3, 0.1), 0.47), d = monter(deplacer(caissePlate(), 0.3, 0.2, -0.25), 0.47);
  OBJETS.Crate_Wooden = caler(fusion([...a, ...b, ...c, ...d]), 'Crate_Wooden', 'l', { tourner: 0 }); }
for (const [nom, rangs] of [['FarmCrate_Apple', 1], ['FarmCrate_Carrot', 2]]) {
  const c = caler(tout('wooden_crate_01', 420, 'Objet_Reel_caisse', /^wooden_crate_01$/), nom, 'boite', { k: nom === 'FarmCrate_Carrot' ? 1.25 : 1.05 }), b = boite(c), lx = b.mx[0] - b.mn[0], lz = b.mx[2] - b.mn[2], liste = [];
  for (let e = 0; e < rangs; e++) for (let i = 0; i < 5 - e; i++) for (let j = 0; j < 2; j++) liste.push([b.mn[0] + lx * (0.17 + (i + e * 0.5) * 0.165), b.mn[1] + b.h * (0.42 + e * 0.3), b.mn[2] + lz * (0.33 + j * 0.34)]);
  OBJETS[nom] = [...c, ...pommes(liste, lx * 0.17)];
}
{ const bas = tout('treasure_chest', 1500, 'Objet_Reel_coffre', /bottom|handle/), haut = tout('treasure_chest', 1100, 'Objet_Reel_coffre', /lid|lock/);
  caler([...bas, ...haut], 'Chest_Wood'); OBJETS.Chest_Wood = { enfants: { Chest_Wood_Base: bas, Chest_Wood_Lid: haut } }; }   // le couvercle reste une pièce à part : le jeu l'ouvre
OBJETS.Stool = caler(tout('painted_wooden_stool', 700, 'Objet_Reel_tabouret'), 'Stool');
OBJETS.Chair_1 = caler(tout('painted_wooden_chair_01', 760, 'Objet_Reel_chaise'), 'Chair_1');
OBJETS.Table_Large = caler(tout('WoodenTable_01', 1000, 'Objet_Reel_table'), 'Table_Large', 'etire');
OBJETS.Bookcase_2 = caler(tout('wooden_bookshelf_worn', 1800, 'Objet_Reel_etagere'), 'Bookcase_2', 'etire');
OBJETS.Bucket_Wooden_1 = caler(tout('wooden_bucket_01', 420, 'Objet_Reel_seau'), 'Bucket_Wooden_1', 'l');
OBJETS.Bucket_Metal = caler(tout('wooden_bucket_02', 420, 'Objet_Reel_seau2'), 'Bucket_Metal');
OBJETS.Vase_4 = caler(tout('ceramic_vase_01', 320, 'Objet_Reel_vase'), 'Vase_4');
OBJETS.Vase_2 = caler(tout('brass_pot_01', 380, 'Objet_Reel_pot'), 'Vase_2');
OBJETS.Chalice = caler(tout('brass_goblets', 220, 'Objet_Reel_coupe', /goblet_01/), 'Chalice');
// le voilier du port : un vrai trois-mâts hollandais (longueur 24 m, laissé à sa taille : le jeu l'agrandit)
{ const sc = scan('dutch_ship_medium'), part = (re, cible, mat) => fusion(Object.keys(sc).filter((n) => re.test(n)).flatMap((n) => sc[n].map((p) => Object.assign(alleger(p, cible, /rigging/.test(n) ? 0.004 : 0.02, { doux: /rigging/.test(n) }), { mat }))));
  // (les mâts et les cordages sont trop fins pour être allégés : ils disparaîtraient. Un seul navire est affiché, on les garde presque entiers.)
  OBJETS.Navire = deplacer([...part(/hull/, 5200, 'Objet_Reel_coque'), ...part(/rigging/, 24000, 'Objet_Reel_greement_2faces'), ...part(/sails/, 2400, 'Objet_Reel_voiles')], 0, 0, Math.PI); }   // proue vers -x, comme l'ancien

// ---------- Images ----------
const jpg = (src, nom, taille, q = 80) => sharp(src).resize(taille, taille, { fit: 'fill' }).jpeg({ quality: q, mozjpeg: true }).toFile(path.join(TEX, nom));
// Image avec transparence. La couleur des feuilles est étalée dans les zones transparentes : sans cela, vues de loin,
// les feuilles se mélangent au noir caché sous la transparence et s'entourent d'un liseré sombre.
async function avecAlpha(couleur, alpha, nom, n) {
  const c = await sharp(couleur).resize(n, n, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
  const a = alpha ? await sharp(alpha).resize(n, n, { fit: 'fill' }).greyscale().raw().toBuffer() : null;
  const rgb = new Float32Array(n * n * 3), w = new Float32Array(n * n), al = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) { al[i] = a ? a[i] : c[i * 4 + 3]; const k = al[i] > 128 ? 1 : 0; w[i] = k; for (let j = 0; j < 3; j++) rgb[i * 3 + j] = c[i * 4 + j] * k; }
  let cur = { rgb, w, n }; const niveaux = [cur];
  while (cur.n > 1) {
    const m = cur.n >> 1, r = new Float32Array(m * m * 3), ww = new Float32Array(m * m);
    for (let y = 0; y < m; y++) for (let x = 0; x < m; x++) {
      let s = 0; const t = [0, 0, 0];
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const i = (y * 2 + dy) * cur.n + x * 2 + dx; s += cur.w[i]; for (let j = 0; j < 3; j++) t[j] += cur.rgb[i * 3 + j]; }
      ww[y * m + x] = s > 0 ? 1 : 0; for (let j = 0; j < 3; j++) r[(y * m + x) * 3 + j] = s > 0 ? t[j] / s : 0;
    }
    cur = { rgb: r, w: ww, n: m }; niveaux.push(cur);
  }
  for (let l = niveaux.length - 2; l >= 0; l--) { const hi = niveaux[l], lo = niveaux[l + 1]; for (let y = 0; y < hi.n; y++) for (let x = 0; x < hi.n; x++) { const i = y * hi.n + x; if (hi.w[i]) continue; const k = (y >> 1) * lo.n + (x >> 1); for (let j = 0; j < 3; j++) hi.rgb[i * 3 + j] = lo.rgb[k * 3 + j]; hi.w[i] = 1; } }
  const out = Buffer.alloc(n * n * 4);
  for (let i = 0; i < n * n; i++) { for (let j = 0; j < 3; j++) out[i * 4 + j] = al[i] > 128 ? c[i * 4 + j] : rgb[i * 3 + j]; out[i * 4 + 3] = al[i]; }
  await sharp(out, { raw: { width: n, height: n, channels: 4 } }).png({ compressionLevel: 9, effort: 10 }).toFile(path.join(TEX, nom));
}
const MAT = {}, travaux = [];
for (const e of ['oak', 'birch', 'pine', 'willow']) {
  travaux.push(jpg(path.join(EZ, 'src/lib/assets/bark', e + '_color_1k.jpg'), 'ecorce_' + e + '.jpg', 512), jpg(path.join(EZ, 'src/lib/assets/bark', e + '_normal_1k.jpg'), 'ecorce_' + e + '_n.jpg', 512, 84));
  MAT['Bark_Reel_' + e] = { map: 'ecorce_' + e + '.jpg', normal: 'ecorce_' + e + '_n.jpg', rough: 0.95 };
}
for (const f of ['oak', 'ash', 'aspen', 'pine']) {
  travaux.push(avecAlpha(path.join(EZ, 'src/lib/assets/leaves', f + '_color.png'), null, 'feuilles_' + f + '.png', 512));
  MAT['Leaves_Reel_' + f] = { map: 'feuilles_' + f + '.png', masque: true, rough: 1 };
}
const roche = (mat, id, taille, eclat) => { const d = path.join(DL, id, 'textures', id); travaux.push(sharp(d + '_diff_1k.jpg').resize(taille, taille).modulate({ saturation: 0.6, brightness: eclat }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(TEX, id + '.jpg')), jpg(d + '_nor_gl_1k.jpg', id + '_n.jpg', taille, 84)); MAT[mat] = { map: id + '.jpg', normal: id + '_n.jpg', rough: 0.92 }; };
roche('Rock_Reel_mousse', 'rock_moss_set_01', 1024, 1.45); roche('Rock_Reel_galet', 'namaqualand_stones_01', 512, 0.75);
const plante = (mat, id) => { const d = path.join(DL, id, 'textures', id); travaux.push(avecAlpha(d + '_diff_1k.jpg', d + '_alpha_1k.jpg', id + '.png', 512)); MAT[mat] = { map: id + '.png', masque: true, rough: 1 }; };
plante('Grass_Reel_fougere', 'fern_02'); plante('Grass_Reel_herbe_folle', 'weed_plant_02'); plante('Grass_Reel_ortie', 'nettle_plant'); plante('Grass_Reel_oseille', 'shrub_sorrel_01');
plante('Grass_Reel_herbe', 'grass_bermuda_01'); plante('Flowers_Reel_pissenlit', 'dandelion_01'); plante('Flowers_Reel_etoile', 'flower_empodium');
roche('Rock_Reel_mousse2', 'rock_moss_set_02', 512, 1.45);
const objet = (mat, base, taille, o = {}) => {
  const d = path.join(DL, o.dossier || base, 'textures', base), nom = (o.nom || base);
  travaux.push(jpg(d + '_diff_1k.jpg', nom + '.jpg', taille, 80)); MAT[mat] = { map: nom + '.jpg', rough: o.rough != null ? o.rough : 0.85, metal: o.metal || 0, double: !!o.double };
  if (o.relief !== false) { travaux.push(jpg(d + '_nor_gl_1k.jpg', nom + '_n.jpg', o.relief || taille, 80)); MAT[mat].normal = nom + '_n.jpg'; }
};
objet('Bark_Reel_souche', 'tree_stump_01', 512, { rough: 0.95 }); objet('Bark_Reel_souche2', 'tree_stump_02', 512, { rough: 0.95 }); objet('Bark_Reel_branche', 'dry_branches_medium_01', 256, { rough: 0.95, relief: false });
plante('Flowers_Reel_gazania', 'flower_gazania');
objet('Objet_Reel_tonneau', 'wine_barrel_01', 512); objet('Objet_Reel_tonneau2', 'wooden_barrels_01_barrel01', 512, { dossier: 'wooden_barrels_01' });
objet('Objet_Reel_caisse', 'wooden_crate_01', 512); objet('Objet_Reel_caisse2', 'wooden_crate_02', 512);
objet('Objet_Reel_coffre', 'treasure_chest', 512, { rough: 0.7 }); objet('Objet_Reel_tabouret', 'painted_wooden_stool', 256); objet('Objet_Reel_chaise', 'painted_wooden_chair_01', 512, { relief: 256 });
objet('Objet_Reel_table', 'WoodenTable_01', 512); objet('Objet_Reel_etagere', 'wooden_bookshelf_worn', 512);
objet('Objet_Reel_seau', 'wooden_bucket_01', 256); objet('Objet_Reel_seau2', 'wooden_bucket_02', 256);
objet('Objet_Reel_vase', 'ceramic_vase_01', 256, { rough: 0.7, relief: false }); TEINTES.Objet_Reel_vase = 0xb9a892;   // faïence blanche : trop éblouissante au soleil, on la fait grès
objet('Objet_Reel_pot', 'brass_pot_01', 256, { rough: 0.4 }); objet('Objet_Reel_coupe', 'brass_goblet_01', 256, { dossier: 'brass_goblets', rough: 0.4, relief: false });
objet('Objet_Reel_pomme', 'food_apple_01', 128, { rough: 0.5, relief: false });
objet('Objet_Reel_coque', 'dutch_ship_medium_hull', 1024, { dossier: 'dutch_ship_medium', relief: 512 }); objet('Objet_Reel_greement_2faces', 'dutch_ship_medium_rigging', 512, { dossier: 'dutch_ship_medium', relief: false, double: true });
{ const d = path.join(DL, 'dutch_ship_medium', 'textures', 'dutch_ship_medium_sails'); travaux.push(avecAlpha(d + '_diff_1k.jpg', d + '_alpha_1k.jpg', 'dutch_ship_medium_sails.png', 512)); MAT.Objet_Reel_voiles = { map: 'dutch_ship_medium_sails.png', masque: true, rough: 1 }; }
await Promise.all(travaux);

// ---------- Écrire un glTF ----------
function ecrire(fichier, pieces) {
  const out = { asset: { version: '2.0', generator: 'Alderia outils/reel/construire.mjs' }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], accessors: [], bufferViews: [], buffers: [], materials: [], textures: [], images: [], samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }] };
  const morceaux = []; let octets = 0;
  const vue = (tab, cible) => { const b = Buffer.from(tab.buffer, tab.byteOffset, tab.byteLength), pad = (4 - (b.length % 4)) % 4; out.bufferViews.push({ buffer: 0, byteOffset: octets, byteLength: b.length, target: cible }); morceaux.push(b, Buffer.alloc(pad)); octets += b.length + pad; return out.bufferViews.length - 1; };
  const image = (f) => { let i = out.images.findIndex((x) => x.uri === 'tex/' + f); if (i < 0) { out.images.push({ uri: 'tex/' + f }); out.textures.push({ source: out.images.length - 1, sampler: 0 }); i = out.images.length - 1; } return { index: i }; };
  const matiere = (nom) => {
    let i = out.materials.findIndex((m) => m.name === nom); if (i >= 0) return i;
    const d = MAT[nom]; if (!d) throw new Error('matière inconnue : ' + nom);
    const m = { name: nom, pbrMetallicRoughness: { baseColorTexture: image(d.map), metallicFactor: d.metal || 0, roughnessFactor: d.rough } };
    if (nom === 'Leaves_Reel_aspen') TEINTES[nom] = 0xd4ff78;      // le préréglage est un tremble d'automne, jaune vif : on en fait un bouleau de printemps
    if (TEINTES[nom] != null && TEINTES[nom] !== 0xffffff) { const c = new THREE.Color(TEINTES[nom]); m.pbrMetallicRoughness.baseColorFactor = [c.r, c.g, c.b, 1]; }
    if (d.normal) m.normalTexture = image(d.normal);
    if (d.masque) { m.alphaMode = 'MASK'; m.alphaCutoff = 0.3; m.doubleSided = true; }
    if (d.double) m.doubleSided = true;
    out.materials.push(m); return out.materials.length - 1;
  };
  let total = 0; const bilan = [];
  const maillage = (nom, prims) => {
    const mesh = { name: nom, primitives: [] }; let tris = 0;
    for (const p of prims) {
      if (!p.idx.length) continue;
      if (!p.nor) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p.pos, 3)); g.setIndex(new THREE.BufferAttribute(p.idx, 1)); g.computeVertexNormals(); p.nor = g.attributes.normal.array; }
      const n = p.pos.length / 3, b = boite([p]), petit = n < 65536, idx = petit ? Uint16Array.from(p.idx) : p.idx;
      const a = (v, type, count, extra = {}) => { out.accessors.push(Object.assign({ bufferView: v, componentType: 5126, count, type }, extra)); return out.accessors.length - 1; };
      mesh.primitives.push({ attributes: { POSITION: a(vue(p.pos, 34962), 'VEC3', n, { min: b.mn, max: b.mx }), NORMAL: a(vue(p.nor, 34962), 'VEC3', n), TEXCOORD_0: a(vue(p.uv, 34962), 'VEC2', n) }, indices: a(vue(idx, 34963), 'SCALAR', idx.length, { componentType: petit ? 5123 : 5125 }), material: matiere(p.mat) });
      tris += idx.length / 3;
    }
    out.meshes.push(mesh); total += tris; return [out.meshes.length - 1, tris];
  };
  for (const [nom, piece] of Object.entries(pieces)) {
    let tris = 0, tous;
    if (piece.enfants) {                                             // pièce en plusieurs morceaux nommés (le coffre et son couvercle)
      const fils = Object.entries(piece.enfants).map(([n, prims]) => { const [m, t] = maillage(n, prims); tris += t; out.nodes.push({ name: n, mesh: m }); return out.nodes.length - 1; });
      out.nodes.push({ name: nom, children: fils }); tous = Object.values(piece.enfants).flat();
    } else { const [m, t] = maillage(nom, piece); tris = t; out.nodes.push({ name: nom, mesh: m }); tous = piece; }
    out.scenes[0].nodes.push(out.nodes.length - 1);
    const b = boite(tous); bilan.push(`${nom} ${tris} tri, ${(b.mx[0] - b.mn[0]).toFixed(2)} × ${b.h.toFixed(2)} × ${(b.mx[2] - b.mn[2]).toFixed(2)} m`);
  }
  out.buffers.push({ uri: fichier + '.bin', byteLength: octets });
  fs.writeFileSync(path.join(SORTIE, fichier + '.bin'), Buffer.concat(morceaux));
  fs.writeFileSync(path.join(SORTIE, fichier + '.gltf'), JSON.stringify(out));
  if (process.env.DETAIL) console.log(bilan.join('\n'));
  console.log(`${fichier} : ${Object.keys(pieces).length} pièces, ${total} triangles, ${(octets / 1e6).toFixed(2)} Mo`);
}
ecrire('nature', PIECES);
ecrire('objets', OBJETS);
const utiles = new Set(Object.values(MAT).flatMap((m) => [m.map, m.normal]).filter(Boolean));
for (const f of fs.readdirSync(TEX)) if (!utiles.has(f)) fs.unlinkSync(path.join(TEX, f));          // images d'une ancienne fabrication
console.log(`images : ${fs.readdirSync(TEX).length} fichiers, ${(fs.readdirSync(TEX).reduce((t, f) => t + fs.statSync(path.join(TEX, f)).size, 0) / 1e6).toFixed(2)} Mo`);
