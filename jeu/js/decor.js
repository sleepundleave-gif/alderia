// ============================================================
//  DÉCOR IMPORTÉ : maisons, arbres, rochers, objets, sols
//  Les pièces viennent de trois packs gratuits de Quaternius (licence CC0),
//  les mêmes que ceux livrés pour Unity : « Medieval Village MegaKit »,
//  « Stylized Nature MegaKit » et « Fantasy Props MegaKit ».
//  Les sols sont des photos de Poly Haven (CC0).
//  Une maison n'est pas un seul modèle : elle est assemblée comme un jeu de
//  construction, mur par mur (pièces de 2 m de large et 3 m de haut), puis le toit.
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { gltf, texture, prefetch, release } from './charge.js';
import { BRUIT_GLSL } from './paysage.js';

const DIR = new URL('../modeles/decor/', import.meta.url).href;
// Nature « réaliste » (modeles/reel/, fabriquée par outils/reel/construire.mjs) : arbres générés par ez-tree (MIT),
// rochers, fougères, herbes et fleurs scannés par Poly Haven (CC0). Chaque pièce porte le nom de celle qu'elle remplace.
// Le choix se fait à l'écran titre (ou avec ?decor=dessin / ?decor=reel dans l'adresse) et il est retenu.
const DIR_REEL = new URL('../modeles/reel/', import.meta.url).href;
let MODE = 'reel';
try { const m = new URLSearchParams(location.search).get('decor') || localStorage.getItem('alderia_decor'); if (m === 'dessin' || m === 'reel') MODE = m; } catch (e) { /* stockage interdit : on garde le réglage par défaut */ }
export const decorMode = () => MODE;
export function setDecorMode(m) { try { localStorage.setItem('alderia_decor', m); } catch (e) { /* tant pis */ } }
const LIB = {}, GROUND = {}, VARIANTS = new Map(), FORMES = {};
let ready = false;
export const decorReady = () => ready;
export const pieceNames = () => Object.keys(LIB);
export const hasPiece = (name) => !!LIB[name];
// Taille d'une pièce (largeur, hauteur, profondeur), pour poser quelque chose dessus : elle change entre le décor dessiné et le réaliste
const TAILLES = new Map();
export function taillePiece(name) {
  const src = LIB[name]; if (!src) return { w: 1, h: 1, d: 1 };
  let t = TAILLES.get(src); if (!t) { const b = new THREE.Box3().setFromObject(src), v = b.getSize(new THREE.Vector3()); t = { w: v.x, h: b.max.y, d: v.z }; TAILLES.set(src, t); }
  return t;
}

// Réglages communs à toutes les pièces importées
function preparer(g, reel) {
  g.scene.traverse((m) => {
    if (!m.isMesh) return; m.geometry.userData.kit = true;          // « kit » : pièce importée, affichée par copies (instances)
    const mt = m.material; mt.vertexColors = /_Vertex/.test(mt.name) && !!m.geometry.attributes.color; if (!mt.alphaTest && !mt.transparent && !/2faces/.test(mt.name)) mt.side = THREE.FrontSide;
    if (mt.alphaTest) { mt.alphaTest = reel ? 0.3 : 0.4; mt.side = THREE.DoubleSide; }
    for (const k of ['map', 'normalMap', 'roughnessMap']) if (mt[k]) mt[k].anisotropy = 4;
    if (/Leaves|Leaf|Grass|Flowers|Vine/.test(mt.name)) { mt.roughness = 1; mt.metalness = 0; mt.normalMap = null; }
    if (/Glass/.test(mt.name)) { mt.transparent = false; mt.color.set(0x6f9ac0); mt.roughness = 0.15; mt.metalness = 0.3; }
  });
}
export async function loadDecor(onProgress) {
  await prefetch('decor', onProgress);                       // téléchargement (avec reprise si la connexion coupe)
  const sols = ['sol_herbe', 'sol_terre', 'sol_paves', 'sol_feuilles', 'sol_planches', 'mur_blanc', 'mur_egout', 'sol_marbre', 'ardoise'], tick = () => {};
  await Promise.all([
    ...['village', 'nature', 'objets'].map((f) => gltf(DIR + f + '.gltf').then((g) => { preparer(g); for (const c of [...g.scene.children]) LIB[c.name] = c; })),
    ...sols.map((s) => texture(DIR + 'tex/' + s + '.jpg').then((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; GROUND[s.replace('sol_', '')] = t; tick(); })),
  ]);
  // Le feuillage « TwistedTree » du pack est rouge : dans les bois d'Aldéria on le veut vert, on lui donne donc la matière des arbres communs.
  let green = null; LIB.CommonTree_1.traverse((m) => { if (m.isMesh && /Leaves_NormalTree/.test(m.material.name)) green = m.material; });
  for (const n of ['TwistedTree_1', 'Bush_Common']) LIB[n].traverse((m) => { if (m.isMesh && /Leaves_Twisted/.test(m.material.name)) m.material = green; });
  if (MODE === 'reel') {
    try {
      for (const f of ['nature', 'objets']) {
        const g = await gltf(DIR_REEL + f + '.gltf'); preparer(g, true);
        // « Nom~b », « Nom~c »… : d'autres formes de la pièce « Nom ». piece() tire au sort, deux voisins ne sont plus identiques.
        for (const c of [...g.scene.children]) { const [base, v] = c.name.split('~'); if (!v) { LIB[base] = c; FORMES[base] = [c]; } else (FORMES[base] = FORMES[base] || [LIB[base]]).push(c); }
      }
    }
    catch (e) { console.warn('Décor réaliste indisponible, on garde le décor dessiné : ' + e.message); MODE = 'dessin'; }
  }
  release('decor'); release('reel'); ready = true;
}

// ---------- Outils ----------
// Une copie d'une pièce (la géométrie et la matière sont partagées, seule la position change)
export function piece(name, x = 0, y = 0, z = 0, ry = 0, s = 1) {
  const f = FORMES[name], src = f && f.length > 1 ? f[Math.floor(Math.random() * f.length)] : LIB[name]; if (!src) throw new Error('pièce inconnue : ' + name);
  const o = src.clone(true); o.position.set(x, y, z); o.rotation.y = ry; if (s !== 1) o.scale.setScalar(s); return o;
}
// Variante teintée d'une matière (maison brûlée, feuillage sombre, toile d'étal colorée…) : créée une fois, puis partagée
function variant(mat, key, fn) {
  const k = mat.uuid + '|' + key; let m = VARIANTS.get(k);
  if (!m) { m = mat.clone(); fn(m); VARIANTS.set(k, m); }
  return m;
}
function retint(obj, key, fn, test) { obj.traverse((m) => { if (m.isMesh && (!test || test.test(m.material.name))) m.material = variant(m.material, key, fn); }); return obj; }
const SHADOW = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }), G_DISC = new THREE.CircleGeometry(0.5, 16);
function blob(r) { const m = new THREE.Mesh(G_DISC, SHADOW); m.rotation.x = -Math.PI / 2; m.scale.set(r * 2, r * 2, 1); m.position.y = 0.035; return m; }
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// ---------- Sols ----------
// La photo est répétée tous les « tile » mètres d'après la position dans le monde (pas besoin de dépliage UV),
// et multipliée par la couleur d'origine : l'herbe reste verte, le chemin reste ocre, mais avec du grain.
const GMATS = new Map();
export function groundMat(color) {
  if (!ready) return null;
  if (GMATS.has(color)) return GMATS.get(color);
  const c = new THREE.Color(color), hsl = {}; c.getHSL(hsl, THREE.SRGBColorSpace);
  let kind = null, tile = 5;
  if (hsl.h > 0.48 && hsl.h < 0.75 && hsl.s > 0.25) kind = null;                                   // eau : pas de texture
  else if (hsl.s < 0.12) { kind = 'paves'; tile = 3.2; }
  else if (hsl.h > 0.17 && hsl.h <= 0.48) { kind = hsl.l < 0.33 ? 'feuilles' : 'herbe'; tile = hsl.l < 0.33 ? 5 : 7; }
  else if (hsl.s < 0.34 && hsl.l > 0.5) { kind = 'paves'; tile = 3.2; }
  else { kind = 'terre'; tile = 4; }
  let m = null;
  if (kind) {
    m = new THREE.MeshLambertMaterial({ color: c.clone().multiplyScalar(kind === 'paves' ? 1.3 : 1.25), map: GROUND[kind] });
    // De loin, une photo répétée se voit : on la module par de grandes taches plus claires, plus sombres ou plus jaunes (prés, terre battue)
    const pre = kind === 'herbe' || kind === 'feuilles';
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n\tvMapUv = ( modelMatrix * vec4( position, 1.0 ) ).xz * ' + (1 / tile).toFixed(4) + ';');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + BRUIT_GLSL).replace('#include <map_fragment>', `#include <map_fragment>
	vec2 solP = vMapUv * ${tile.toFixed(1)};
	float solA = bruit( solP * 0.045 ), solB = bruit( solP * 0.16 + 31.7 ), solC = bruit( solP * 0.6 + 7.3 );
	diffuseColor.rgb *= 0.7 + 0.62 * ( solA * 0.55 + solB * 0.3 + solC * 0.15 );
	${pre ? 'diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 1.22, 1.08, 0.62 ), smoothstep( 0.52, 0.78, bruit( solP * 0.03 + 91.0 ) ) * 0.55 );' : ''}`);
    };
    m.customProgramCacheKey = () => 'sol2' + tile + (pre ? 'p' : '');
  }
  GMATS.set(color, m); return m;
}

// ---------- Murs ----------
// Matière de mur (rempart, tour, égout, dallage) : la photo est plaquée d'après la position dans le monde,
// à plat sur le sol et debout sur les murs. Aucun dépliage UV n'est nécessaire, et les blocs se suivent d'un mur à l'autre.
// kind : mur_blanc | mur_egout | marbre | ardoise | paves | planches
const WMATS = new Map();
export function wallMat(kind, color = 0xffffff, tile = 3, o = {}) {
  if (!ready) return null;
  const key = kind + '|' + color + '|' + tile + '|' + (o.emissive || 0) + '|' + (o.gain || 1); if (WMATS.has(key)) return WMATS.get(key);
  const m = new THREE.MeshLambertMaterial({ color, map: GROUND[kind] });
  if (o.gain) m.color.multiplyScalar(o.gain);                // « gain » : éclaircit la photo (pierre blanche de Solméria)
  if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveMap = GROUND[kind]; }
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
	vec3 wPos = ( modelMatrix * vec4( position, 1.0 ) ).xyz; vec3 wNor = normalize( mat3( modelMatrix ) * normal );
	vMapUv = ( abs( wNor.y ) > 0.6 ? wPos.xz : ( abs( wNor.x ) > abs( wNor.z ) ? wPos.zy : wPos.xy ) ) * ${(1 / tile).toFixed(4)};` + (o.emissive ? '\n\tvEmissiveMapUv = vMapUv;' : ''));
  };
  m.customProgramCacheKey = () => 'mur' + tile + (o.emissive ? 'e' : '');
  WMATS.set(key, m); return m;
}

// ---------- Maisons ----------
const ROOFS = { 4: [4, 6], 6: [6, 8, 10, 12], 8: [8, 10, 12, 14] }, RIDGE = { 4: 3.7, 6: 4.9, 8: 6.0 };
const burn = (m) => { m.color.multiply(new THREE.Color(0x6a5a52)); };
// w × d : emprise au sol ; la porte est sur la façade +z. « dark » : version incendiée.
export function kitHouse(w, d, h, o = {}) {
  const g = new THREE.Group(), k = new THREE.Group(); g.add(k);
  const gable = w <= 8.5 && w <= d + 2.5;                    // pignon en façade si la maison est étroite, sinon façade sur le long côté
  const short = gable ? w : d, long = gable ? d : w;
  const W = Math.min(8, Math.max(4, 2 * Math.round(short / 2))), D = ROOFS[W].reduce((a, b) => (Math.abs(b - long) < Math.abs(a - long) ? b : a));
  const floors = h >= 4.5 ? 2 : 1, top = floors * 3, brick = o.brick ? 'UnevenBrick' : 'Plaster';
  const wall = (kind) => 'Wall_' + brick + '_' + kind;
  let porte = null;
  // un côté = une rangée de modules de 2 m ; « door » : numéro du module qui porte la porte (ou -1)
  const side = (len, at, ry, door, front) => {
    const n = len / 2;
    for (let f = 0; f < floors; f++) for (let i = 0; i < n; i++) {
      const u = -len / 2 + 1 + i * 2, m = new THREE.Group(); m.position.set(at[0] + Math.cos(ry) * u, f * 3, at[1] - Math.sin(ry) * u); m.rotation.y = ry; k.add(m);
      if (f === 0 && i === door) { porte = { x: m.position.x, z: m.position.z, nx: Math.sin(ry), nz: Math.cos(ry) }; const round = !!o.round; m.add(piece(wall(round ? 'Door_Round' : 'Door_Flat'))); m.add(piece(round ? 'Door_1_Round' : pick(['Door_1_Flat', 'Door_2_Flat']), -0.55, 0, -0.05)); }
      else if ((front || (i + f) % 2 === 0) && !(f === 0 && !front && i === 0 && n > 2)) {
        const round = (i + f) % 3 === 0; m.add(piece(wall(round ? 'Window_Wide_Round' : 'Window_Wide_Flat'))); m.add(piece(round ? 'Window_Wide_Round1' : 'Window_Wide_Flat1'));
        if (!o.dark && (front || i % 2 === 0)) m.add(piece(round ? 'WindowShutters_Wide_Round_Open' : 'WindowShutters_Wide_Flat_Open'));
      } else m.add(piece(o.brick ? wall('Straight') : (i + f) % 2 ? 'Wall_Plaster_WoodGrid' : 'Wall_Plaster_Straight'));
    }
  };
  const doorI = (len) => Math.min(len / 2 - 1, Math.max(0, Math.round(((o.doorX || 0) / (gable ? w : w) * len + len / 2 - 1) / 2)));
  side(W, [0, D / 2], 0, gable ? doorI(W) : -1, gable);                 // pignon avant (+z du kit)
  side(W, [0, -D / 2], Math.PI, -1, false);
  side(D, [W / 2, 0], Math.PI / 2, gable ? -1 : doorI(D), !gable);      // long côté (+x du kit)
  side(D, [-W / 2, 0], -Math.PI / 2, -1, false);
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) for (let f = 0; f < floors; f++) k.add(piece('Corner_Exterior_Wood', x * W / 2, f * 3, z * D / 2));
  k.add(piece('Roof_RoundTiles_' + W + 'x' + D, 0, top, 0));
  k.add(piece('Roof_Front_Brick' + W, 0, top, D / 2)); k.add(piece('Roof_Front_Brick' + W, 0, top, -D / 2, Math.PI));
  let chem = null;
  if (o.chimney !== false) { chem = piece(o.brick ? 'Prop_Chimney2' : 'Prop_Chimney', W * 0.22, top + RIDGE[W] * 0.56 - 1.7, -D * 0.2); k.add(chem); }
  if (!o.dark && o.flowers) { const v = piece(pick(['Prop_Vine1', 'Prop_Vine2']), gable ? W / 2 - 0.9 : W / 2 + 0.12, 2.6, gable ? D / 2 + 0.12 : D / 2 - 0.9, gable ? 0 : Math.PI / 2); k.add(v); }
  // mise à l'emprise demandée ; si la façade est sur le long côté, le kit est tourné d'un quart de tour
  if (gable) k.scale.set(w / W, 1, d / D); else { k.rotation.y = -Math.PI / 2; k.scale.set(d / W, 1, w / D); }
  if (o.dark) retint(g, 'brule', burn);
  // Solméria : toits d'ardoise bleue et murs chaulés. La teinte remplace la couleur des tuiles, le relief de la texture reste.
  if (o.roof != null) retint(g, 'toit' + o.roof, (m) => { m.color.set(o.roof); if (m.map) { m.map = GROUND.ardoise || m.map; } }, /RoundTiles/);
  if (o.plaster != null) retint(g, 'mur' + o.plaster, (m) => { m.color.set(o.plaster); }, /Plaster/);
  g.userData.kitHouse = { W, D, floors, gable };
  // Où sont la porte et le haut de la cheminée, dans le repère de la maison (pour entrer, et pour faire fumer la cheminée)
  g.updateMatrixWorld(true);
  if (porte) { const p = new THREE.Vector3(porte.x, 0, porte.z).applyMatrix4(k.matrix), n = new THREE.Vector3(porte.nx, 0, porte.nz).transformDirection(k.matrix); g.userData.kitHouse.porte = { x: p.x, z: p.z, nx: n.x, nz: n.z }; }
  if (chem) { const b = new THREE.Box3().setFromObject(chem), c = b.getCenter(new THREE.Vector3()); g.userData.kitHouse.cheminee = { x: c.x, y: b.max.y, z: c.z }; }
  return g;
}

// Porte et cheminée d'une maison déjà posée dans une scène, en coordonnées du monde
export function infosMaison(obj) {
  const k = obj.userData.kitHouse || {}, c = Math.cos(obj.rotation.y), s = Math.sin(obj.rotation.y), out = {};
  const tr = (x, z) => ({ x: obj.position.x + x * c + z * s, z: obj.position.z - x * s + z * c });
  if (k.porte) { const p = tr(k.porte.x, k.porte.z), n = tr(k.porte.nx, k.porte.nz); out.porte = { x: p.x, z: p.z, nx: n.x - obj.position.x, nz: n.z - obj.position.z }; }
  if (k.cheminee) { const p = tr(k.cheminee.x, k.cheminee.z); out.cheminee = { x: p.x, y: k.cheminee.y, z: p.z }; }
  return out;
}

// ---------- Nature ----------
const TREES = {
  round: ['CommonTree_5', 'CommonTree_1', 'CommonTree_2', 'CommonTree_5'], birch: ['CommonTree_3', 'CommonTree_4'], pine: ['Pine_5', 'Pine_4', 'Pine_2', 'Pine_5'],
  dead: ['DeadTree_1', 'DeadTree_2'], big: ['Pine_4', 'CommonTree_3', 'CommonTree_4', 'Pine_5'],
};
const TREE_K = { round: 0.85, birch: 0.7, pine: 0.8, dead: 0.5, big: 0.95 };
export function kitTree(type = 'round', s = 1, tint) {
  const g = new THREE.Group(), giant = type === 'big' && s >= 2;
  const t = piece(giant ? 'TwistedTree_1' : pick(TREES[type] || TREES.round), 0, 0, 0, 0, giant ? 0.75 : s * (TREE_K[type] || 0.7)); g.add(t);
  if (tint != null) {
    const c = new THREE.Color(tint), hsl = {}; c.getHSL(hsl, THREE.SRGBColorSpace); const col = new THREE.Color().setHSL(hsl.h, Math.min(0.5, hsl.s), Math.min(0.85, 0.35 + hsl.l * 1.3));
    retint(t, 'f' + tint, (m) => { m.color.copy(col); }, /Leaves|Leaf/);
    if (hsl.l < 0.22) retint(t, 'tronc' + tint, (m) => { m.color.setScalar(0.6); }, /Bark/);
  }
  g.add(blob((giant ? 4.5 : 1.7) * (giant ? 1 : s)));
  return g;
}
export function kitRock(s = 1, color) {
  const g = new THREE.Group(), r = piece(pick(['Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3']), 0, -0.05 * s, 0, Math.random() * 6, s * 0.62); g.add(r);
  if (color != null && color !== 0x8a8a86) retint(r, 'r' + color, (m) => { m.color.set(color).multiplyScalar(1.7); });
  return g;
}
export function kitBush(s = 1, color) {
  const g = new THREE.Group(), b = piece(color == null && Math.random() < 0.35 ? 'Bush_Common_Flowers' : 'Bush_Common', 0, 0, 0, Math.random() * 6, s * 0.95); g.add(b);
  if (color != null) retint(b, 'b' + color, (m) => { m.color.set(color).multiplyScalar(2.2); }, /Leaves/);
  return g;
}
// Petites plantes semées au hasard : herbes, fleurs, trèfles, cailloux (aucune collision)
export function sprinkle(st, n, rnd, [x1, x2, z1, z2], avoid, kinds = ['Grass_Common_Short', 'Grass_Common_Short', 'Grass_Common_Short', 'Clover_1', 'Flower_3_Single', 'Flower_4_Single', 'Plant_1', 'Plant_7', 'Pebble_Round_1', 'Pebble_Round_2']) {
  if (!ready) return;
  if (LIB.Branche_1 && kinds.length === 10 && kinds[0] === 'Grass_Common_Short') kinds = [...kinds, 'Branche_1'];     // semis par défaut : quelques branches mortes (décor réaliste)
  for (let i = 0; i < n; i++) {
    const x = x1 + rnd() * (x2 - x1), z = z1 + rnd() * (z2 - z1); if (avoid && avoid(x, z)) continue;
    const k = kinds[Math.floor(rnd() * kinds.length)], s = /Flower/.test(k) ? 0.3 + rnd() * 0.18 : /Pebble/.test(k) ? 1 + rnd() * 1.5 : /Fern/.test(k) ? 0.12 + rnd() * 0.08 : /Mushroom/.test(k) ? 0.5 + rnd() * 0.5 : 0.45 + rnd() * 0.35;
    st.deco(piece(k, 0, 0, 0, 0, s), x, z, rnd() * 6);
  }
}

// ---------- Objets ----------
export function kitFence(len) {
  const g = new THREE.Group(), n = Math.max(1, Math.round(len / 2)), k = len / (n * 2);
  for (let i = 0; i < n; i++) { const f = piece(i % 3 === 2 ? 'Prop_WoodenFence_Extension1' : 'Prop_WoodenFence_Single', -len / 2 + (i + 0.5) * 2 * k, 0, 0); f.scale.set(k, 1.25, 1); g.add(f); }
  return g;
}
export const kitBarrel = () => { const g = new THREE.Group(); g.add(piece(Math.random() < 0.3 ? 'Barrel_Apples' : 'Barrel', 0, 0, 0, Math.random() * 6, 1.05)); return g; };
export const kitCrate = (s = 0.8) => { const g = new THREE.Group(); g.add(piece(Math.random() < 0.5 ? 'Crate_Wooden' : 'Prop_Crate', 0, 0, 0, 0, s * 1.05)); return g; };
export const kitAnvil = () => { const g = new THREE.Group(); g.add(piece('Anvil_Log', 0, 0, 0, Math.PI / 2, 1.1)); return g; };
export function kitStall(color = 0xc04a3a, garni = true) {
  const g = new THREE.Group(), s = piece('Stall_Empty', 0, 0, 0, 0, 1.3); g.add(s);
  retint(s, 't' + color, (m) => { m.color.set(color).lerp(new THREE.Color(0xffffff), 0.25); }, /Banner/);
  if (garni && new THREE.Color(color).getHSL({}, THREE.SRGBColorSpace).l > 0.25) g.add(piece(pick(['FarmCrate_Apple', 'FarmCrate_Carrot']), 0, 1.12, 0.1, 0.2, 1.2));
  return g;
}
export function kitChest(open = false) {
  const g = new THREE.Group(), c = piece('Chest_Wood', 0, 0, 0, 0, 0.85); g.add(c);
  let lidMesh = null; c.traverse((m) => { if (m.name === 'Chest_Wood_Lid') lidMesh = m; });
  let reel = false; if (lidMesh) lidMesh.traverse((m) => { if (m.material && /_Reel_/.test(m.material.name)) reel = true; });
  const hy = reel ? 0.459 : 0.4286, hz = reel ? -0.295 : -0.3143;                // charnière du couvercle (le coffre réaliste a la sienne ailleurs)
  const lid = new THREE.Group(); lid.position.set(0, hy, hz);
  if (lidMesh) { lidMesh.parent.add(lid); lid.add(lidMesh); lidMesh.position.set(0, -hy, -hz); }
  g.userData.lid = lid; if (open) lid.rotation.x = -1.2;
  return g;
}
export function kitCart(broken = false) {
  const g = new THREE.Group(), c = piece('Prop_Wagon', 0, 0, 1.1, 0, 0.95); g.add(c);
  g.add(piece('Bag', 0.2, 0.75, 0.3, 0.4)); g.add(piece('Crate_Wooden', -0.25, 0.75, -0.6, 0.2, 0.7));
  if (broken) { g.rotation.z = 0.35; g.position.y = 0.15; }
  return g;
}
export function kitBanner(color = 0x1e3f8f) {
  const g = new THREE.Group(), pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 3.4, 8), new THREE.MeshStandardMaterial({ color: 0x5a3e24, roughness: 0.8 })); pole.position.y = 1.7; g.add(pole);
  const b = piece('Banner_1', 0, 2.5, 0); g.add(b); retint(b, 't' + color, (m) => { m.color.set(color).lerp(new THREE.Color(0xffffff), 0.3); }, /Banner/);
  return g;
}
