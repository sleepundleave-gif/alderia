// ============================================================
//  PERSONNAGES IMPORTÉS
//  Ici les personnages ne sont plus écrits en code : ce sont des
//  modèles faits par un artiste (packs gratuits de Quaternius,
//  licence CC0), livrés pour Unity, Unreal et Godot.
//  Un personnage = un costume + une tête + des cheveux, tous liés
//  au même squelette de 65 os, animés par une bibliothèque de clips.
//  Voir modeles/LISEZ-MOI.md pour la provenance des fichiers.
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { clone as cloneSkinned } from '../lib/SkeletonUtils.js';
import { gltf, texture, prefetch, release } from './charge.js';
import { ambianceDe, partagerSquelettes, fusionnerPieces, fusionnerRigide, detailSelonDistance } from './qualite.js';

const DIR = new URL('../modeles/perso/', import.meta.url).href;
const FILES = ['Male_Peasant', 'Female_Peasant', 'Male_Ranger', 'Female_Ranger', 'Base_Male', 'Base_Female',
  'Hair_Beard', 'Hair_Buns', 'Hair_Buzzed', 'Hair_Long', 'Hair_SimpleParted', 'Sword_Bronze', 'Shield_Wooden', 'Axe_Bronze'];
const EXTRA = ['T_Peasant_2_BaseColor', 'T_Ranger_3_BaseColor', 'T_Superhero_Male_Ligh', 'T_Superhero_Female_Light_BaseColor',
  'T_Regular_Male_Light_BaseColor', 'T_Regular_Female_Light_BaseColor', 'T_Hair_1_BaseColor', 'T_Hair_2_BaseColor'];
const LIB = {}, CLIP = {}, TEX = {}, MATS = new Map();
const NATIVE = { M: 1.8, F: 1.7 };                           // taille des modèles d'origine, mesurée au chargement

// ---------- Chargement (une fois, avant le jeu) ----------
export async function loadPack(onProgress) {
  await prefetch('perso', onProgress);                       // téléchargement (avec reprise si la connexion coupe)
  const tick = () => {};                                     // les fichiers sont lus dans la mémoire (charge.js), sans nouvelle demande au réseau
  await Promise.all([
    ...FILES.map((f) => gltf(DIR + f + '.gltf').then((g) => { LIB[f] = g; tick(); })),
    gltf(DIR + 'anims.glb').then((g) => { for (const c of g.animations) CLIP[c.name] = c; tick(); }),
    ...EXTRA.map((f) => texture(DIR + 'tex/' + f + '.jpg', false).then((t) => { t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; TEX[f] = t; tick(); })),
  ]);
  for (const [g, f] of [['M', 'Base_Male'], ['F', 'Base_Female']]) {
    LIB[f].scene.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(LIB[f].scene); NATIVE[g] = b.max.y - b.min.y;
  }
  for (const f of ['Sword_Bronze', 'Shield_Wooden', 'Axe_Bronze']) LIB[f].scene.traverse((m) => { if (m.isMesh) { m.material.vertexColors = false; m.material.side = THREE.FrontSide; } });
  for (const f of FILES) LIB[f].scene.traverse((m) => { if (m.isMesh) for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) if (m.material[k]) m.material[k].anisotropy = 4; });
  release('perso'); loaded = true;
}
// Lumière d'ambiance : un ciel et un sol flous que les matières « physiques » (métal, cuir, peau) reflètent.
// Sans elle, une lame en métal serait noire. Dans Unity c'est le rôle de la « Skybox » et des « Reflection Probes ».
const ENVS = new Map();
export function envFor(renderer, sky = 0xbfe0ff, ground = 0x7a9a5a, power = 1) {
  const key = sky + '|' + ground + '|' + power; if (ENVS.has(key)) return ENVS.get(key);
  const sc = new THREE.Scene(), top = new THREE.Color(sky).multiplyScalar(power), bot = new THREE.Color(ground).multiplyScalar(power * 0.6), hor = new THREE.Color(0xffffff).multiplyScalar(power * 1.1);
  const geo = new THREE.SphereGeometry(10, 24, 16), col = [], p = geo.attributes.position, c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 10; if (y > 0) c.copy(hor).lerp(top, Math.min(1, y * 2.2)); else c.copy(hor).lerp(bot, Math.min(1, -y * 5)); col.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  sc.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const sun = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0c8).multiplyScalar(6 * power) })); sun.position.set(5, 6.5, 4); sc.add(sun);
  const pm = new THREE.PMREMGenerator(renderer), t = pm.fromScene(sc, 0.04).texture; pm.dispose(); geo.dispose();
  t.userData.amb = ambianceDe(sky, ground, power);        // la même ambiance, pour les matières simples (niveau « rapide »)
  ENVS.set(key, t); return t;
}
let loaded = false;
export const packReady = () => loaded;        // vrai seulement quand TOUS les fichiers sont arrivés
export const clipNames = () => Object.keys(CLIP);
export const clipsPerso = () => CLIP;          // les clips du squelette commun (les monstres du pack « Bestiary » les rejouent)

// ---------- Matériaux : une copie par variante (texture de couleur, teinte), partagée entre les personnages ----------
function matFor(src, mapName, tint, dye) {
  const key = src.uuid + '|' + (mapName || '') + '|' + (tint ?? '') + '|' + (dye ? dye.kind + dye.color : '');
  let m = MATS.get(key);
  if (!m) {
    m = src.clone(); if (mapName) m.map = TEX[mapName]; if (tint != null) m.color.set(tint);
    if (dye && m.map) m.map = dyed(m.map, dye.kind, dye.color);
    MATS.set(key, m);
  }
  return m;
}
// Teinture : on repeint seulement le tissu de la texture (le vert du rôdeur, le lin clair du paysan) dans une autre couleur,
// en gardant les ombres et les plis peints par l'artiste. Le cuir, le métal et les bottes ne changent pas.
const DYED = new Map();
const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function dyed(tex, kind, hex) {
  const key = tex.uuid + kind + hex; if (DYED.has(key)) return DYED.get(key);
  const img = tex.image, w = img.width, h = img.height, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
  const id = cx.getImageData(0, 0, w, h), d = id.data, c = new THREE.Color(hex).convertLinearToSRGB(), T = [c.r, c.g, c.b], ref = kind === 'green' ? 0.26 : 0.66;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = (mx - mn) / (mx + 1e-5);
    let k;
    if (kind === 'green') k = smooth(g - Math.max(r, b), 0.015, 0.07);
    else k = smooth(mx, 0.36, 0.52) * (1 - smooth(sat, 0.42, 0.58));
    if (k <= 0) continue;
    const l = Math.min(1.5, (kind === 'green' ? mx : (mx + mn) / 2) / ref);
    d[i] = (r + (Math.min(1, T[0] * l) - r) * k) * 255; d[i + 1] = (g + (Math.min(1, T[1] * l) - g) * k) * 255; d[i + 2] = (b + (Math.min(1, T[2] * l) - b) * k) * 255;
  }
  cx.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT; t.anisotropy = 4;
  DYED.set(key, t); return t;
}
// La tête seule : du corps complet on ne garde que les triangles qui suivent les os de la tête et du cou
// (le costume apporte le reste ; garder le corps entier le ferait dépasser des vêtements).
function headParts(file) {
  const g = LIB[file]; if (g.parts) return g.parts;
  const parts = { body: null, eyes: null, brows: null };
  g.scene.traverse((m) => { if (!m.isSkinnedMesh) return; const n = m.material.name; if (/Eyes/.test(n)) parts.eyes = m; else if (/Hair/.test(n)) parts.brows = m; else parts.body = m; });
  const b = parts.body, geo = b.geometry, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, idx = geo.index;
  const names = b.skeleton.bones.map((x) => x.name), isHead = names.map((x) => x === 'Head' || x === 'neck_01');
  const w = new Float32Array(si.count);
  for (let i = 0; i < si.count; i++) w[i] = (isHead[si.getX(i)] ? sw.getX(i) : 0) + (isHead[si.getY(i)] ? sw.getY(i) : 0) + (isHead[si.getZ(i)] ? sw.getZ(i) : 0) + (isHead[si.getW(i)] ? sw.getW(i) : 0);
  const keep = [];
  for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i), c = idx.getX(i + 1), d = idx.getX(i + 2); if (w[a] > 0.45 && w[c] > 0.45 && w[d] > 0.45) keep.push(a, c, d); }
  const head = new THREE.BufferGeometry(); for (const k in geo.attributes) head.setAttribute(k, geo.attributes[k]); head.setIndex(keep);
  parts.headGeo = head; g.parts = parts; return parts;
}

// ---------- Armes ----------
const M_WOOD = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.8 }), M_IRON = new THREE.MeshStandardMaterial({ color: 0x8a8f98, roughness: 0.45, metalness: 0.8 });
const M_DARK = new THREE.MeshStandardMaterial({ color: 0x2a2630, roughness: 0.4, metalness: 0.85 }), M_BONE = new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.7 });
function weaponModel(type) {
  const g = new THREE.Group(); let m;
  const add = (geo, mat, x, y, z) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); g.add(o); return o; };
  if (type === 'sword' || type === 'bigsword') {
    m = LIB.Sword_Bronze.scene.clone(true); m.position.y = 0.1; g.add(m);
    if (type === 'bigsword') { m.scale.set(1.35, 1.45, 1.35); m.traverse((o) => { if (o.isMesh) o.material = matFor(o.material, null, 0x5a5468); }); }
  } else if (type === 'staff') {
    add(new THREE.CylinderGeometry(0.018, 0.024, 1.6, 10), M_WOOD, 0, 0.45, 0);
    add(new THREE.TorusGeometry(0.07, 0.014, 8, 16), M_WOOD, 0, 1.32, 0);
    add(new THREE.SphereGeometry(0.055, 16, 12), new THREE.MeshStandardMaterial({ color: 0xff7a40, emissive: 0xff4a1a, emissiveIntensity: 2.2, roughness: 0.3 }), 0, 1.32, 0);
  } else if (type === 'hammer') {
    add(new THREE.CylinderGeometry(0.02, 0.022, 0.5, 10), M_WOOD, 0, 0.17, 0); add(new THREE.BoxGeometry(0.12, 0.12, 0.26), M_IRON, 0, 0.44, 0);
  } else if (type === 'club') {
    add(new THREE.CylinderGeometry(0.085, 0.03, 0.95, 10), M_WOOD, 0, 0.38, 0);
    for (let i = 0; i < 6; i++) { const a = i * 1.3, s = add(new THREE.ConeGeometry(0.022, 0.09, 6), M_BONE, Math.cos(a) * 0.085, 0.55 + i * 0.05, Math.sin(a) * 0.085); s.rotation.set(Math.sin(a) * 1.57, 0, -Math.cos(a) * 1.57); }
  } else if (type === 'cane') {
    add(new THREE.CylinderGeometry(0.016, 0.02, 1.0, 8), M_WOOD, 0, 0.12, 0); add(new THREE.SphereGeometry(0.04, 10, 8), M_WOOD, 0, 0.63, 0.02);
  } else if (type === 'dagger') {                          // dague de Nyssa : lame courte, garde dorée
    add(new THREE.CylinderGeometry(0.014, 0.016, 0.12, 8), M_LEATHER, 0, 0.0, 0); add(new THREE.BoxGeometry(0.1, 0.018, 0.03), M_GOLD, 0, 0.068, 0);
    const b = add(new THREE.ConeGeometry(0.026, 0.3, 4), M_STEEL, 0, 0.225, 0); b.scale.z = 0.32; add(new THREE.SphereGeometry(0.02, 8, 6), M_GOLD, 0, -0.07, 0);
  } else if (type === 'mace') {                            // masse d'armes à ailettes de Borin
    add(new THREE.CylinderGeometry(0.02, 0.024, 0.6, 10), M_WOOD, 0, 0.2, 0); add(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 10), M_STEEL, 0, -0.1, 0);
    add(new THREE.SphereGeometry(0.052, 12, 10), M_STEEL, 0, 0.54, 0);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, f = add(new THREE.BoxGeometry(0.01, 0.1, 0.042), M_DARK, Math.sin(a) * 0.055, 0.54, Math.cos(a) * 0.055); f.rotation.y = a; }
    add(new THREE.ConeGeometry(0.02, 0.07, 8), M_STEEL, 0, 0.635, 0);
  }
  return g;
}
const M_STEEL = new THREE.MeshStandardMaterial({ color: 0xc4ccd6, roughness: 0.32, metalness: 0.9 }), M_GOLD = new THREE.MeshStandardMaterial({ color: 0xe2b23a, roughness: 0.35, metalness: 0.85 });
const M_LEATHER = new THREE.MeshStandardMaterial({ color: 0x4a3222, roughness: 0.85 });
const clothMat = (color) => { const k = 'cloth' + color; let m = MATS.get(k); if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide }); MATS.set(k, m); } return m; };

// ---------- Accessoires rigides : couronne, diadème, foulard, cape, pavois ----------
// Chacun est modelé dans le repère du personnage debout (mètres, pour une taille de 1,75 m) puis accroché à un os,
// exactement comme une arme dans une main : il suit ensuite toutes les animations.
function crownModel(tiara) {
  const g = new THREE.Group(), r = tiara ? 0.098 : 0.104;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.97, tiara ? 0.014 : 0.04, 24, 1, true), tiara ? M_STEEL : M_GOLD); band.material.side = THREE.DoubleSide; g.add(band);
  if (tiara) { const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.018), new THREE.MeshStandardMaterial({ color: 0x4a8aff, emissive: 0x1a3a9a, roughness: 0.2 })); gem.position.set(0, 0.012, r); g.add(gem); }
  else for (let i = 0; i < 7; i++) {                      // sept pointes : les Sept héros
    const a = (i / 7) * Math.PI * 2, p = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 4), M_GOLD); p.position.set(Math.sin(a) * r, 0.05, Math.cos(a) * r); p.rotation.y = a; g.add(p);
    const j = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x3a6adf : 0xd03a3a, roughness: 0.25 })); j.position.set(Math.sin(a + 0.45) * r, 0.0, Math.cos(a + 0.45) * r); g.add(j);
  }
  return g;
}
function scarfModel(color) {
  const g = new THREE.Group(), m = clothMat(color), tilt = new THREE.Group(); tilt.rotation.x = -0.3; g.add(tilt);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.54), m); cap.scale.set(0.101, 0.097, 0.121); tilt.add(cap);
  const band = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 6, 24), m); band.scale.set(0.101, 0.121, 0.11); band.rotation.x = Math.PI / 2; band.position.y = -0.014; tilt.add(band);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.027, 8, 6), m); knot.position.set(0, -0.052, -0.118); g.add(knot);
  for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.17, 0.008), m); t.position.set(s * 0.027, -0.137, -0.132); t.rotation.set(0.28, 0, s * 0.2); g.add(t); }
  return g;
}
function capeModel(color, trim) {
  // une bande courbe posée sur les épaules, qui s'écarte du dos et s'évase vers le bas ; le dernier rang peut être un galon doré
  const W = 10, H = 12, pos = [], cloth = [], gold = [];
  for (let j = 0; j <= H; j++) for (let i = 0; i <= W; i++) {
    const u = i / W - 0.5, v = j / H, half = 0.215 + v * 0.13, wrap = Math.pow(Math.abs(u) * 2, 2.2) * 0.13 * (1 - v * 0.75);
    pos.push(u * 2 * half, -v * 0.96 - wrap * 0.12, -0.02 - v * 0.13 + wrap + Math.sin(u * 15) * 0.014 * v);
  }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const a = j * (W + 1) + i, b = a + 1, c = a + W + 1, d = c + 1; (trim != null && j === H - 1 ? gold : cloth).push(a, c, b, b, c, d); }
  const mk = (idx, mat) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return new THREE.Mesh(geo, mat); };
  const g = new THREE.Group(); g.add(mk(cloth, clothMat(color)));
  if (gold.length) { const gm = M_GOLD.clone(); gm.side = THREE.DoubleSide; g.add(mk(gold, gm)); }
  const col = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.024, 8, 20, Math.PI * 1.3), trim != null ? M_GOLD : clothMat(color)); col.rotation.set(Math.PI / 2, 0, Math.PI * 0.85 + Math.PI / 2); col.position.set(0, 0.012, 0.125); g.add(col);
  return g;
}
function pavoisModel() {
  const g = new THREE.Group(), blue = new THREE.MeshStandardMaterial({ color: 0x1e3f8f, roughness: 0.55, metalness: 0.25 });
  const sh = new THREE.Shape(), w = 0.27, h = 0.5; sh.moveTo(-w, h); sh.lineTo(w, h); sh.lineTo(w, -h * 0.45); sh.quadraticCurveTo(w, -h * 0.9, 0, -h); sh.quadraticCurveTo(-w, -h * 0.9, -w, -h * 0.45); sh.lineTo(-w, h);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1 }), blue); g.add(body);
  const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: false }), M_STEEL); rim.scale.set(1.07, 1.05, 1); rim.position.z = 0.004; g.add(rim);
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.6 });
  const sun = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.012, 20), white); sun.rotation.x = Math.PI / 2; sun.position.set(0, 0.1, 0.052); g.add(sun);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.085, 4), white); r.position.set(Math.sin(a) * 0.135, 0.1 + Math.cos(a) * 0.135, 0.05); r.rotation.z = -a; r.scale.z = 0.3; g.add(r); }
  // l'os de l'avant-bras pointe vers la main : on retourne le pavois pour que son bord droit soit en haut
  const flip = new THREE.Group(); g.rotation.z = Math.PI; flip.add(g); return flip;
}
// Prise en main : position et orientation de l'arme dans le repère de l'os de la main droite
const GRIP = { pos: [-0.03, 0.085, 0.0], rot: [Math.PI / 2, 0, 0] };
// Rangée : dans le dos, en travers, accrochée à l'os du haut de la colonne
const BACK = { sword: { at: [-0.25, 1.5, -0.17], dir: [0.5, -0.86, 0] }, staff: { at: [0.2, 0.62, -0.17], dir: [-0.36, 0.93, 0] },
  dagger: { at: [0.17, 1.0, -0.14], dir: [-0.92, -0.38, 0] }, mace: { at: [-0.215, 0.93, -0.04], dir: [0.06, -0.99, -0.1] } };   // dague en travers des reins, masse pendue à la ceinture

const G_DISC = new THREE.CircleGeometry(0.5, 20), M_SHADOW = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false });

// ---------- Un personnage ----------
export function makeHero(o = {}) {
  const sex = o.fem ? 'Female' : 'Male', src = LIB[sex + '_' + (o.outfit || 'Peasant')], base = headParts('Base_' + sex);
  const inst = cloneSkinned(src.scene), g = new THREE.Group(); g.add(inst);
  let bones = null, parent = null; const cloth = [];
  inst.traverse((m) => { if (m.isSkinnedMesh) { bones = m.skeleton.bones; parent = m.parent; cloth.push(m); } });
  const bone = Object.fromEntries(bones.map((b) => [b.name, b]));
  const light = o.skin !== 'dark';
  const skinMap = (isHead) => !light ? null : isHead ? (o.fem ? 'T_Superhero_Female_Light_BaseColor' : 'T_Superhero_Male_Ligh') : (o.fem ? 'T_Regular_Female_Light_BaseColor' : 'T_Regular_Male_Light_BaseColor');
  const clothMap = o.variant === 2 ? (o.outfit === 'Ranger' ? 'T_Ranger_3_BaseColor' : 'T_Peasant_2_BaseColor') : null;
  for (const m of cloth) {
    m.frustumCulled = false;
    if ((/Hood/.test(m.name) && !o.hood) || (/Pauldron/.test(m.name) && !o.pauldron) || (/Bracer/.test(m.name) && o.bracer === false) || (/Belt_2/.test(m.name) && o.belt2 === false)) { m.visible = false; continue; }
    const dyeKind = (o.outfit === 'Ranger' && o.variant !== 2) ? 'green' : 'cream';
    const one = (mat) => /Regular/.test(mat.name) ? matFor(mat, skinMap(false), o.skinTint) : matFor(mat, clothMap, o.tint, o.dye != null ? { kind: dyeKind, color: o.dye } : null);
    m.material = Array.isArray(m.material) ? m.material.map(one) : one(m.material);
  }
  // Tête, yeux, sourcils, cheveux, barbe : pris dans d'autres fichiers et liés au même squelette
  const addSkinned = (s, geo, mat) => {
    const m = new THREE.SkinnedMesh(geo || s.geometry, mat); m.name = s.name; m.position.copy(s.position); m.quaternion.copy(s.quaternion); m.scale.copy(s.scale); m.frustumCulled = false;
    parent.add(m); m.bind(new THREE.Skeleton(bones, s.skeleton.boneInverses), s.bindMatrix); return m;
  };
  addSkinned(base.body, base.headGeo, matFor(base.body.material, skinMap(true), o.skinTint));
  addSkinned(base.eyes, null, base.eyes.material);
  const hairMat = (mat) => matFor(mat, o.hairTex === 1 ? 'T_Hair_1_BaseColor' : o.hairTex === 2 ? 'T_Hair_2_BaseColor' : null, o.hairTint);
  if (base.brows) addSkinned(base.brows, null, hairMat(base.brows.material));
  const hairs = []; if (o.hair && !o.hood) hairs.push('Hair_' + o.hair); if (o.beard) hairs.push('Hair_Beard');
  for (const h of hairs) LIB[h].scene.traverse((m) => { if (m.isSkinnedMesh) addSkinned(m, null, hairMat(m.material)); });

  // Taille et carrure
  const height = o.height || (o.fem ? 1.66 : 1.78), s = height / NATIVE[o.fem ? 'F' : 'M'], wide = o.wide || 1;
  inst.scale.set(s * wide, s, s * wide);
  if (o.headScale) bone.Head.scale.setScalar(o.headScale);
  // Arme dans la main droite, bouclier sur l'avant-bras gauche : objets rigides accrochés à un os
  let weapon = null;
  if (o.weapon) weapon = weaponModel(o.weapon);
  if (o.weapon === 'staff' && o.orb != null) weapon.traverse((m) => { if (m.isMesh && m.material.emissive && m.material.emissiveIntensity > 1) m.material = new THREE.MeshStandardMaterial({ color: o.orb, emissive: o.orb, emissiveIntensity: 1.6, roughness: 0.3 }); });
  if (o.shield === 'pavois') { const sh = pavoisModel(); sh.position.set(0.085, 0.17, 0); sh.rotation.set(0, -Math.PI / 2, 0); sh.scale.setScalar(1 / s); bone.lowerarm_l.add(sh); g.userData.shield = sh; }
  else if (o.shield) { const sh = LIB.Shield_Wooden.scene.clone(true); sh.position.set(0, 0.12, -0.07); sh.rotation.set(0, 0, Math.PI / 2); sh.scale.setScalar(0.8); bone.lowerarm_l.add(sh); }
  const blob = new THREE.Mesh(G_DISC, M_SHADOW); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.025; blob.scale.setScalar(0.8 * wide * s); blob.userData.shadow = true; g.add(blob);

  // ---------- Animation : des clips, mélangés par un AnimationMixer (l'« Animator » de Unity) ----------
  const mixer = new THREE.AnimationMixer(inst), acts = {};
  const act = (name) => acts[name] || (acts[name] = mixer.clipAction(CLIP[name]));
  const u = g.userData;
  partagerSquelettes(inst);                                // une dizaine de pièces, un seul squelette à calculer
  fusionnerPieces(inst);                                   // … et une seule pièce par matière
  u.details = detailSelonDistance(inst);                   // au loin, le moteur passe sur la version allégée de ces pièces
  if (weapon) fusionnerRigide(weapon); if (g.userData.shield) fusionnerRigide(g.userData.shield);
  u.height = height; u.imported = true; u.bones = bone; u.weapon = weapon; u.mixer = mixer; u.P = {}; u.corps = inst;
  u.idle = 'Idle_Loop';
  // Dégainer / rengainer : l'arme passe de l'os du dos à l'os de la main, et le repos devient une garde
  u.draw = (on = true) => {
    u.armed = !!weapon && on; if (!weapon) return;
    if (on) { bone.hand_r.add(weapon); weapon.position.set(...GRIP.pos); weapon.rotation.set(...GRIP.rot); weapon.scale.setScalar(1); }
    else { bone[backBone].add(weapon); weapon.position.copy(back.p); weapon.quaternion.copy(back.q); weapon.scale.copy(back.s); }
    if (u.offhand) { const d = u.offhand; if (on) { bone.hand_l.add(d); d.position.set(0.03, 0.085, 0.0); d.rotation.set(Math.PI / 2, 0, 0); d.scale.setScalar(1); } else { bone[backBone].add(d); d.position.copy(back2.p); d.quaternion.copy(back2.q); d.scale.copy(back2.s); } }
    u.idle = on && o.guard !== false ? (o.weapon === 'staff' ? 'Idle_Loop' : 'Sword_Idle') : 'Idle_Loop';
  };
  // place de l'arme rangée, calculée une fois dans la pose de repos puis exprimée dans le repère de l'os du dos
  const back = { p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() }, back2 = { p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() };
  const backBone = o.weapon === 'dagger' || o.weapon === 'mace' ? 'pelvis' : 'spine_03';
  if (weapon) {
    const b = BACK[o.weapon] || BACK.sword, k = height / 1.75, w = new THREE.Matrix4();
    w.compose(new THREE.Vector3(b.at[0] * k * wide, b.at[1] * k, b.at[2] * k * wide), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...b.dir).normalize()), new THREE.Vector3(s, s, s));
    g.updateMatrixWorld(true); w.premultiply(g.matrixWorld); new THREE.Matrix4().copy(bone[backBone].matrixWorld).invert().multiply(w).decompose(back.p, back.q, back.s);
    if (o.weapon === 'dagger') {   // la seconde dague, croisée sur la première
      const w2 = new THREE.Matrix4().compose(new THREE.Vector3(-0.17 * k * wide, 1.0 * k, -0.14 * k * wide), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.92, -0.38, 0).normalize()), new THREE.Vector3(s, s, s));
      w2.premultiply(g.matrixWorld); new THREE.Matrix4().copy(bone[backBone].matrixWorld).invert().multiply(w2).decompose(back2.p, back2.q, back2.s);
    }
  }
  // Accessoires rigides : placés dans le repère du personnage au repos, puis confiés à un os
  const attach = (obj, boneName, x, y, z, rx = 0) => {
    const k = height / 1.75, w = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    w.compose(new THREE.Vector3(x * k * wide, y * k, z * k * wide), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)), new THREE.Vector3(k * wide, k, k * wide));
    g.updateMatrixWorld(true); w.premultiply(g.matrixWorld); new THREE.Matrix4().copy(bone[boneName].matrixWorld).invert().multiply(w).decompose(p, q, sc);
    obj.position.copy(p); obj.quaternion.copy(q); obj.scale.copy(sc); bone[boneName].add(obj); return obj;
  };
  const hs = o.headScale || 1;
  if (o.crown) attach(crownModel(false), 'Head', 0, 1.715 + (hs - 1) * 0.2, 0.012, -0.14);
  if (o.tiara) attach(crownModel(true), 'Head', 0, 1.705, 0.012, -0.2);
  if (o.scarf != null) attach(scarfModel(o.scarf), 'Head', 0, 1.675, -0.014);
  if (o.cape != null) attach(capeModel(o.cape, o.capeTrim), 'spine_03', 0, 1.485, -0.125);
  // seconde dague (main gauche en combat, à la ceinture sinon)
  let off = null; if (o.weapon === 'dagger') { off = weaponModel('dagger'); u.offhand = off; }
  u.draw(!o.sheathed);                                     // clip de repos (changé en combat ou dans une scène : assis, en garde…)
  let base0 = null, one = null, oneT = 0, oneEnd = 0, last = null, speed = 0, frozen = false;
  const setBase = (name, fade) => {
    if (base0 === name) return; const a = act(name);
    a.reset().setLoop(THREE.LoopRepeat, Infinity).setEffectiveWeight(1).fadeIn(fade).play(); if (base0) act(base0).fadeOut(fade); base0 = name;
  };
  // Joue un clip une fois (attaque, sort, coup reçu…) puis revient au repos ; { hold: true } reste sur la dernière image (K.-O.)
  u.play = (name, opt = {}) => {
    if (!CLIP[name]) return 0; const a = act(name), sp = opt.speed || 1;
    a.reset().setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = sp; a.setEffectiveWeight(1).fadeIn(0.1).play();
    if (one && one !== a) one.fadeOut(0.1); if (base0) { act(base0).fadeOut(0.1); base0 = null; }
    one = a; oneT = 0; oneEnd = opt.hold ? Infinity : CLIP[name].duration / sp - 0.18;
    return CLIP[name].duration / sp;
  };
  u.stop = () => { if (one) { one.fadeOut(0.2); one = null; } };
  // Pour les essais et les scènes figées : met le personnage à l'instant t d'un clip
  u.poseAt = (name, t = 1e9) => { mixer.stopAllAction(); one = null; base0 = null; const a = act(name); a.reset().setEffectiveWeight(1).play(); a.time = Math.min(t, CLIP[name].duration - 0.001); mixer.update(0); u.pose = true; frozen = true; };
  // Grimper à une échelle. Aucun clip de la bibliothèque ne le fait : on part du personnage debout et on tourne ses bras et ses
  // jambes vers les barreaux, main gauche et pied droit ensemble, puis l'inverse. « phase » avance d'un tour par deux barreaux.
  // Les directions sont données dans le repère du personnage (x : sa gauche, y : le haut, z : devant lui).
  let debout = null;
  u.grimper = (phase) => {
    if (!debout) {
      mixer.stopAllAction(); one = null; base0 = null; const a = act('Idle_Loop'); a.reset().setEffectiveWeight(1).play(); a.time = 0; mixer.update(0);
      debout = GRIMPE.map((n) => [bone[n], bone[n] && bone[n].quaternion.clone()]).filter(([b]) => b);
    }
    u.pose = true; frozen = true; blob.visible = false;        // (pas d'ombre ronde sous les pieds : ils sont en l'air)
    for (const [b, q] of debout) b.quaternion.copy(q);
    g.updateMatrixWorld(true); g.getWorldQuaternion(Q_G);
    const viser = (n, n2, x, y, z) => {
      const b = bone[n], c = bone[n2]; if (!b || !c) return;
      b.getWorldPosition(V_A); c.getWorldPosition(V_B); V_B.sub(V_A).normalize(); V_C.set(x, y, z).normalize().applyQuaternion(Q_G);
      Q_D.setFromUnitVectors(V_B, V_C); b.parent.getWorldQuaternion(Q_P); b.getWorldQuaternion(Q_B);
      b.quaternion.copy(Q_P.invert()).multiply(Q_D).multiply(Q_B); b.updateMatrixWorld(true);
    };
    const m = (a, b, k) => a + (b - a) * k, onde = Math.sin(phase * Math.PI * 2);
    for (const [c, s] of [['l', 1], ['r', -1]]) {
      const h = 0.5 + 0.5 * onde * s, j = 1 - h;                 // h : la main de ce côté est haute ; j : le genou de ce côté est levé
      viser('upperarm_' + c, 'lowerarm_' + c, s * 0.22, m(-0.35, 0.6, h), 0.8);
      viser('lowerarm_' + c, 'hand_' + c, -s * 0.05, m(0.7, 0.92, h), m(0.7, 0.4, h));
      viser('thigh_' + c, 'calf_' + c, s * 0.08, m(-1, -0.3, j), m(0.1, 0.95, j));
      viser('calf_' + c, 'foot_' + c, 0, -1, m(-0.1, -0.22, j));
    }
  };
  u.finGrimper = () => { debout = null; u.pose = false; blob.visible = true; };
  u.anim = (dt, moving, t) => {
    if (u.pose) return;
    if (frozen) { mixer.stopAllAction(); frozen = false; base0 = null; one = null; }
    // vitesse réelle de déplacement : marche en dessous de 2,6 m/s, course au-dessus
    const p = g.position; if (last && dt > 0) { const v = Math.hypot(p.x - last.x, p.z - last.z) / dt; speed += (v - speed) * Math.min(1, dt * 8); } last = last || new THREE.Vector3(); last.copy(p);
    if (one) { oneT += dt; if (oneT >= oneEnd) { one.fadeOut(0.22); one = null; } }
    if (!one) {
      const run = speed > 2.6, name = moving ? (run ? 'Jog_Fwd_Loop' : 'Walk_Loop') : u.idle;
      setBase(name, base0 ? 0.22 : 0.0001);
      act(name).timeScale = !moving ? 1 : run ? Math.min(1.6, Math.max(0.85, speed / 3.6)) : Math.min(1.6, Math.max(0.7, speed / 1.45));
    }
    mixer.update(dt);
    if (u.post) u.post(bone, t, dt);
  };
  u.anim(0.016 + Math.random() * 2, false, 0);
  return g;
}

const GRIMPE = ['upperarm_l', 'lowerarm_l', 'upperarm_r', 'lowerarm_r', 'thigh_l', 'calf_l', 'thigh_r', 'calf_r'];
const V_A = new THREE.Vector3(), V_B = new THREE.Vector3(), V_C = new THREE.Vector3(), Q_G = new THREE.Quaternion(), Q_D = new THREE.Quaternion(), Q_P = new THREE.Quaternion(), Q_B = new THREE.Quaternion();

// ---------- Les personnages du jeu ----------
// fem, outfit (Peasant | Ranger), variant (1 | 2 : jeu de couleurs), tint (teinte des vêtements), skin (light | dark), skinTint,
// hair (Buns | Buzzed | Long | SimpleParted), hairTex (1 | 2), hairTint, beard, hood, pauldron, height, wide, weapon, shield
export const HEROES3D = {
  kael:   { outfit: 'Peasant', hair: 'SimpleParted', hairTint: 0x9a6a48, height: 1.78, weapon: 'sword', sheathed: true },
  lyra:   { fem: true, outfit: 'Ranger', dye: 0x3350c8, hair: 'Long', hairTex: 1, hairTint: 0xff8a50, height: 1.68, weapon: 'staff', sheathed: true, bracer: false },
  hagen:  { outfit: 'Peasant', dye: 0x9a8a78, hair: 'Buzzed', hairTint: 0xe8e8e8, beard: true, height: 1.84, wide: 1.12, weapon: 'hammer', guard: false },
  mira:   { fem: true, outfit: 'Peasant', dye: 0x8fb4e6, hair: 'Buns', hairTex: 1, hairTint: 0xffe08a, height: 1.65 },
  aubin:  { outfit: 'Ranger', dye: 0x3f7a3f, hair: 'SimpleParted', hairTint: 0xc8c8c8, beard: true, height: 1.76, bracer: false },
  odile:  { fem: true, outfit: 'Peasant', dye: 0x8a56a0, hair: 'Buns', hairTint: 0xe6e6e6, height: 1.52 },
  gaspard: { outfit: 'Peasant', dye: 0xc8a070, hair: 'Buzzed', beard: true, hairTint: 0x8a5a3a, height: 1.76, wide: 1.1 },
  boulanger: { outfit: 'Peasant', dye: 0xf4f0e6, hair: 'Buzzed', hairTint: 0x6a4a30, height: 1.72, wide: 1.06 },
  enfant1: { outfit: 'Peasant', dye: 0xd86a4a, hair: 'SimpleParted', hairTint: 0xb07040, height: 1.12, headScale: 1.22 },
  enfant2: { fem: true, outfit: 'Peasant', dye: 0xf0c84a, skin: 'dark', hair: 'Buns', hairTint: 0x3a2a20, height: 1.06, headScale: 1.22 },
  villageois1: { outfit: 'Peasant', dye: 0x7fae6a, hair: 'SimpleParted', hairTint: 0x7a5236, height: 1.76 },
  villageoise1: { fem: true, outfit: 'Peasant', dye: 0xd87a8a, hair: 'Long', hairTint: 0x9a5030, height: 1.66 },
  soldat: { outfit: 'Ranger', dye: 0x8a2a26, hood: true, pauldron: true, height: 1.8, weapon: 'sword', shield: true },
  krall:  { outfit: 'Ranger', dye: 0xb0261e, pauldron: true, hair: 'Buzzed', hairTint: 0x4a3020, beard: true, height: 1.96, wide: 1.1, weapon: 'sword' },
  darian: { outfit: 'Ranger', dye: 0x2a2634, tint: 0x8a8498, hood: true, pauldron: true, height: 2.0, wide: 1.08, weapon: 'bigsword' },
  garde:  { outfit: 'Ranger', dye: 0x2a55b8, pauldron: true, hair: 'SimpleParted', hairTint: 0x7a5a3a, height: 1.8, weapon: 'sword', shield: true, sheathed: true },
  berthe: { fem: true, outfit: 'Peasant', dye: 0xe0a85a, hair: 'Buns', hairTex: 1, hairTint: 0xe07a40, height: 1.62, wide: 1.12 },
  colporteur: { outfit: 'Ranger', variant: 2, dye: 0xd8a83a, hair: 'SimpleParted', hairTint: 0x30241c, beard: true, skin: 'dark', height: 1.74, bracer: false },
  anselme: { outfit: 'Ranger', dye: 0x8a7448, hood: true, beard: true, hairTint: 0xf0f0f0, height: 1.7, bracer: false },
  gobelin: { outfit: 'Peasant', dye: 0x7a6a44, skinTint: 0x6fb040, hair: 'Buzzed', hairTint: 0x2a3a1a, height: 1.08, headScale: 1.3, weapon: 'club' },
  troll:  { outfit: 'Peasant', dye: 0x5a5044, skinTint: 0x7a9a6a, height: 2.7, wide: 1.25, headScale: 0.9, weapon: 'club' },
  // ---- Chapitre 3 : Solméria. Tous partagent la même ossature et les mêmes clips que Kael : seuls changent
  //      la tenue, la teinture, la coiffure, la carrure et les accessoires accrochés aux os.
  nyssa:  { fem: true, outfit: 'Ranger', variant: 2, skin: 'dark', hair: 'Buzzed', hairTint: 0x1a1414, scarf: 0xc22b2b, height: 1.68, weapon: 'dagger', sheathed: true },
  borin:  { outfit: 'Ranger', dye: 0x1e3f8f, pauldron: true, hair: 'Buzzed', hairTint: 0x9a9a9a, beard: true, height: 1.9, wide: 1.16, weapon: 'mace', shield: 'pavois', cape: 0x1e3f8f, sheathed: true, guard: false },
  roi:    { outfit: 'Peasant', dye: 0xf2efe6, hair: 'SimpleParted', hairTint: 0x8a8680, beard: true, height: 1.86, wide: 1.06, crown: true, cape: 0xe6dfcc, capeTrim: 1 },
  alinor: { fem: true, outfit: 'Peasant', dye: 0x3f6fd0, hair: 'Buns', hairTint: 0x6a4630, height: 1.68, tiara: true },
  aldric: { outfit: 'Peasant', dye: 0x9a9aa8, hair: 'Long', hairTint: 0xf0f0f0, beard: true, height: 1.76, cape: 0x6a6a7c, weapon: 'staff', orb: 0x9ad0ff, guard: false },
  renaud: { outfit: 'Ranger', dye: 0x2a55b8, pauldron: true, hair: 'Buzzed', hairTint: 0x4a3626, beard: true, height: 1.84, wide: 1.06, weapon: 'sword', shield: true, sheathed: true },
  gontran: { outfit: 'Peasant', variant: 2, hair: 'Buzzed', hairTint: 0x2a2220, beard: true, height: 1.8, wide: 1.16, bracer: true },
  ysolde: { fem: true, outfit: 'Ranger', dye: 0x4a8a5a, hair: 'Long', hairTint: 0xb8b0c8, height: 1.64, bracer: false },
  hotesse: { fem: true, outfit: 'Peasant', dye: 0xb84a4a, hair: 'Buns', hairTex: 1, hairTint: 0xc87a3a, height: 1.66, wide: 1.08 },
  citadin1: { outfit: 'Peasant', dye: 0x6a8ab8, hair: 'SimpleParted', hairTint: 0x5a4030, height: 1.77 },
  citadin2: { outfit: 'Peasant', dye: 0xd0a850, skin: 'dark', hair: 'Buzzed', hairTint: 0x1e1a18, beard: true, height: 1.8 },
  citadin3: { outfit: 'Ranger', variant: 2, hair: 'SimpleParted', hairTint: 0xd8d8d8, beard: true, height: 1.7, bracer: false, weapon: 'cane', guard: false },
  citadine1: { fem: true, outfit: 'Peasant', dye: 0x9a6ac0, hair: 'Long', hairTint: 0x3a2a22, height: 1.66 },
  citadine2: { fem: true, outfit: 'Peasant', dye: 0xe8c860, skin: 'dark', hair: 'Buns', hairTint: 0x1e1a18, height: 1.64 },
  citadine3: { fem: true, outfit: 'Ranger', dye: 0x5aa0a0, hair: 'Long', hairTex: 1, hairTint: 0xe8b060, height: 1.7, bracer: false },
  noble:  { outfit: 'Ranger', dye: 0x7a2a6a, hair: 'SimpleParted', hairTint: 0x3a2a20, height: 1.8, cape: 0x4a1a48, bracer: false },
  noble_f: { fem: true, outfit: 'Peasant', dye: 0xc84a7a, hair: 'Buns', hairTex: 1, hairTint: 0xf0d890, height: 1.68, tiara: true },
  tobie:  { outfit: 'Peasant', variant: 2, tint: 0x8a8278, hood: false, hair: 'Long', hairTint: 0x7a7468, beard: true, height: 1.68, weapon: 'cane', guard: false },
  pretre: { outfit: 'Peasant', dye: 0xfaf6e8, hair: 'Buzzed', hairTint: 0xc8c8c8, height: 1.78, cape: 0xe2b23a },
  // ---- Chapitres 5 à 10 ----
  nain:    { outfit: 'Peasant', dye: 0x8a5a3a, hair: 'Buzzed', hairTint: 0xb8582a, beard: true, height: 1.32, wide: 1.32, headScale: 1.16 },
  nain2:   { outfit: 'Ranger', dye: 0x5a6a7a, pauldron: true, hair: 'SimpleParted', hairTint: 0x4a3a2a, beard: true, height: 1.36, wide: 1.3, headScale: 1.16, weapon: 'club' },
  naine:   { fem: true, outfit: 'Peasant', dye: 0xa84a3a, hair: 'Buns', hairTex: 1, hairTint: 0xd87a30, height: 1.26, wide: 1.26, headScale: 1.16 },
  garde_nain: { outfit: 'Ranger', dye: 0x7a4a2a, pauldron: true, hood: true, beard: true, hairTint: 0x8a4a20, height: 1.38, wide: 1.34, headScale: 1.14, weapon: 'mace', shield: true },
  durgana: { fem: true, outfit: 'Ranger', dye: 0x9a2a2a, pauldron: true, hair: 'Buns', hairTex: 1, hairTint: 0xe8e0d0, height: 1.4, wide: 1.32, headScale: 1.14, weapon: 'mace', cape: 0x7a1a1a, tiara: true, guard: false },
  mineur:  { outfit: 'Ranger', dye: 0x6a625a, hood: true, height: 1.78, wide: 1.08, weapon: 'club' },
  grom:    { outfit: 'Ranger', dye: 0x6a6258, tint: 0xa8a090, pauldron: true, hair: 'Buzzed', hairTint: 0x2a221c, beard: true, height: 2.5, wide: 1.3, headScale: 0.92, weapon: 'mace' },
  morgane: { fem: true, outfit: 'Ranger', variant: 2, dye: 0x2a6a8a, hair: 'Long', hairTex: 1, hairTint: 0x8a2a1a, height: 1.76, weapon: 'sword', sheathed: true, scarf: 0xe8c040 },
  tim:     { outfit: 'Peasant', dye: 0x7a9ab0, hair: 'SimpleParted', hairTint: 0x2a1c14, skin: 'dark', height: 1.2, headScale: 1.2 },
  marin:   { outfit: 'Peasant', dye: 0x3a6a9a, hair: 'Buzzed', hairTint: 0x5a4030, beard: true, height: 1.78, wide: 1.08 },
  marin2:  { outfit: 'Peasant', variant: 2, dye: 0xd8d0b8, skin: 'dark', hair: 'Buzzed', hairTint: 0x1a1414, height: 1.82, scarf: 0x2f5d8a },      // (foulard bleu : le rouge le faisait prendre pour Nyssa)
  poissonniere: { fem: true, outfit: 'Peasant', dye: 0x4aa0a0, hair: 'Buns', hairTint: 0x6a4630, height: 1.64, wide: 1.1 },
  messager: { outfit: 'Ranger', variant: 2, dye: 0x2a2a34, hood: true, height: 1.72, scarf: 0x1a1a1a, bracer: false },
  coupe_jarret: { outfit: 'Ranger', variant: 2, dye: 0x3a3a44, hair: 'Buzzed', hairTint: 0x1a1414, beard: true, height: 1.8, weapon: 'dagger', scarf: 0x1a1a1a },
  lanceur: { fem: true, outfit: 'Ranger', variant: 2, dye: 0x4a3a5a, hair: 'Long', hairTint: 0x1a1414, height: 1.7, weapon: 'dagger', scarf: 0x1a1a1a },
  lame_noire: { outfit: 'Ranger', dye: 0x1e1e26, hood: true, pauldron: true, height: 1.86, wide: 1.06, weapon: 'sword', scarf: 0x1a1a1a },
  varek:   { outfit: 'Ranger', variant: 2, dye: 0x5a1a1a, hair: 'Long', hairTint: 0x1a1414, beard: true, height: 1.94, wide: 1.1, weapon: 'sword', cape: 0x1a1a1a, pauldron: true },
  vexia:   { fem: true, outfit: 'Peasant', dye: 0xf4f6fa, hair: 'Long', hairTex: 1, hairTint: 0xe8f0ff, height: 1.78, cape: 0xd8e8f8, weapon: 'staff', orb: 0x9ad8ff, tiara: true, guard: false },
  fantassin: { outfit: 'Ranger', dye: 0x7a2420, hood: true, pauldron: true, height: 1.84, wide: 1.06, weapon: 'sword', shield: true },
  arbaletrier: { outfit: 'Ranger', variant: 2, dye: 0x7a2420, hood: true, height: 1.78, weapon: 'dagger' },
  mage_guerre: { outfit: 'Peasant', dye: 0x8a1a1a, hood: true, height: 1.8, cape: 0x3a0e0e, weapon: 'staff', orb: 0xff6a2a },
  saboteur: { outfit: 'Ranger', variant: 2, dye: 0x24242c, hood: true, height: 1.74, weapon: 'dagger', scarf: 0x7a2420 },
  hesk:    { outfit: 'Ranger', dye: 0x9a1e1a, pauldron: true, hair: 'Buzzed', hairTint: 0xc8c8c8, beard: true, height: 1.96, wide: 1.12, weapon: 'sword', cape: 0x5a1210 },
  chevalier_cendre: { outfit: 'Ranger', dye: 0x3a3238, tint: 0x9a94a0, hood: true, pauldron: true, height: 1.92, wide: 1.1, weapon: 'bigsword', shield: true },
  darian_nu: { outfit: 'Ranger', dye: 0x2a2634, tint: 0x8a8498, pauldron: true, hair: 'SimpleParted', hairTint: 0x4a3626, height: 2.0, wide: 1.08, weapon: 'bigsword' },
  blesse:  { outfit: 'Peasant', dye: 0xc8c0b0, hair: 'SimpleParted', hairTint: 0x6a5a48, height: 1.76 },
  gamin:  { outfit: 'Peasant', dye: 0x5a9ad8, hair: 'SimpleParted', hairTint: 0x3a2a20, skin: 'dark', height: 1.14, headScale: 1.22 },
};
export function makeChar(key, over = {}) {
  const o = Object.assign({}, HEROES3D[key] || HEROES3D.villageois1);
  if (over.hair != null) o.hairTint = over.hair;
  if (over.top != null) o.dye = over.top;
  const g = makeHero(o); g.userData.key = key; return g;
}
