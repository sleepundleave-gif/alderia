// ============================================================
//  ALDÉRIA — graphismes selon l'appareil
//
//  Le jeu « pèse » peu en mégaoctets, mais ce qui compte pour la fluidité c'est le travail demandé À CHAQUE IMAGE :
//  nombre de triangles, nombre d'objets à dessiner, calcul de la lumière en chaque point, nombre de points de l'écran.
//  Un ordinateur avale tout ; un téléphone non. Trois niveaux :
//
//    rapide  (téléphones, par défaut au doigt) : image de 540 points de haut, matières simples (sans reflets ni relief),
//             textures de 512, modèles allégés à 45 % de leurs triangles.
//    moyen   : 720 points de haut, matières physiques sans relief, textures de 1024, modèles à 70 %.
//    beau    (ordinateurs, par défaut à la souris) : tout, comme avant.
//
//  À TOUS les niveaux, le détail suit la distance : de près un modèle garde tous les triangles de son niveau ; au loin
//  (là où un triangle est plus petit qu'un point de l'écran) il passe sur une version allégée. On ne perd rien à l'œil.
//
//  Le niveau se choisit à l'écran titre (Options) ; il est lu au chargement, car les modèles sont préparés une fois.
//  Essais : ?graphismes=rapide|moyen|beau dans l'adresse.
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { MeshoptSimplifier } from '../lib/meshopt_simplifier.module.js';
import { mergeGeometries } from '../lib/BufferGeometryUtils.js';

export const NIVEAUX = {
  rapide: { nom: 'rapides', aide: 'le plus fluide', lisse: false, hauteur: 540, ratio: 1.25, plancher: 0.55, matiere: 'simple', tex: 512, tri: 0.45, erreur: 0.012, loin: 22, triLoin: 0.22, erreurLoin: 0.03, lod: 16, lodDecor: 22 },
  moyen:  { nom: 'moyens', aide: 'bon équilibre', lisse: false, hauteur: 720, ratio: 1.5, plancher: 0.7, matiere: 'leger', tex: 1024, tri: 0.7, erreur: 0.007, loin: 34, triLoin: 0.35, erreurLoin: 0.02, lod: 20, lodDecor: 28 },
  beau:   { nom: 'beaux', aide: 'tout le détail', lisse: true, hauteur: 1e9, ratio: 1.75, plancher: 1, matiere: 'physique', tex: 1e9, tri: 1, erreur: 0, loin: 45, triLoin: 0.4, erreurLoin: 0.012, lod: 24, lodDecor: 32 },
};
export const ORDRE = ['rapide', 'moyen', 'beau'];
const CLE = 'alderia_graphismes';
const auDoigt = () => { try { return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches || !!window.AlderiaApp; } catch (_) { return 'ontouchstart' in window; } };

function lire() {
  let c = null;
  try { c = new URLSearchParams(location.search).get('graphismes'); } catch (_) {}
  if (!NIVEAUX[c]) try { c = localStorage.getItem(CLE); } catch (_) {}
  if (!NIVEAUX[c]) c = auDoigt() ? 'rapide' : 'beau';
  return c;
}
export const NIVEAU = lire();
export const Q = NIVEAUX[NIVEAU];
export function choisirNiveau(c) { try { localStorage.setItem(CLE, c); } catch (_) {} }
// Finesse de départ de l'image : jamais plus de points que le niveau n'en demande
export function finesseDepart() {
  const h = Math.min(window.innerWidth, window.innerHeight) || 400;
  return Math.max(Q.plancher, Math.min(window.devicePixelRatio || 1, Q.ratio, Q.hauteur / h));
}

// ---------- Matière simple : la lumière d'ambiance du ciel sans le calcul « physique » ----------
// Les matières physiques reçoivent du ciel une lumière d'ambiance (scene.environment). La matière simple la remplace
// par un dégradé ciel / sol, dix fois moins coûteux en chaque point de l'écran. Les deux couleurs sont communes à toutes
// les matières simples : la boucle de jeu les règle avant chaque image d'après la scène affichée (ambiancePour).
const AMB = { ciel: { value: new THREE.Color(0.9, 0.95, 1) }, sol: { value: new THREE.Color(0.3, 0.35, 0.25) } };
export class MatiereSimple extends THREE.MeshLambertMaterial {
  onBeforeCompile(sh) {
    sh.uniforms.ambCiel = AMB.ciel; sh.uniforms.ambSol = AMB.sol;
    sh.fragmentShader = 'uniform vec3 ambCiel;\nuniform vec3 ambSol;\n' + sh.fragmentShader.replace('#include <lights_fragment_begin>',
      '#include <lights_fragment_begin>\n\tirradiance += mix( ambSol, ambCiel, 0.5 + 0.5 * inverseTransformDirection( geometryNormal, viewMatrix ).y );');
  }
  customProgramCacheKey() { return 'alderia-simple'; }
}
// Les couleurs d'ambiance d'un ciel (mêmes entrées que envFor de pack.js) ; rangées avec la texture d'ambiance de la scène
export function ambianceDe(sky, ground, power) {
  const top = new THREE.Color(sky).multiplyScalar(power), bot = new THREE.Color(ground).multiplyScalar(power * 0.6), hor = new THREE.Color(0xffffff).multiplyScalar(power * 1.1);
  const ciel = top.clone().multiplyScalar(0.72).add(hor.clone().multiplyScalar(0.28)).addScalar(0.1 * power).multiplyScalar(Math.PI);
  const sol = bot.clone().multiplyScalar(0.8).add(hor.clone().multiplyScalar(0.2)).multiplyScalar(Math.PI);
  return { ciel, sol };
}
export function ambiancePour(scene) {
  const a = scene && scene.environment && scene.environment.userData.amb;
  if (a) { AMB.ciel.value.copy(a.ciel); AMB.sol.value.copy(a.sol); }
}

const CONV = new Map();
function convertir(m) {
  if (!m || !m.isMeshStandardMaterial) return m;
  if (Q.matiere === 'physique') return m;
  let n = CONV.get(m); if (n) return n;
  if (Q.matiere === 'leger') {                                // physique sans relief ni carte de métal
    n = m; if (m.normalMap) m.normalMap = null; if (m.aoMap) m.aoMap = null;
    if (m.metalnessMap) { m.metalnessMap = null; m.metalness = 0.15; } if (m.roughnessMap) { m.roughnessMap = null; m.roughness = 0.8; }
  } else {
    n = new MatiereSimple({ color: m.color, map: m.map, alphaTest: m.alphaTest, transparent: m.transparent, opacity: m.opacity, side: m.side, vertexColors: m.vertexColors,
      emissive: m.emissive, emissiveMap: m.emissiveMap, emissiveIntensity: m.emissiveIntensity, depthWrite: m.depthWrite, alphaMap: m.alphaMap, flatShading: m.flatShading, fog: m.fog });
    n.name = m.name; n.userData = m.userData;
    // un métal poli n'a presque pas de couleur propre (il reflète) : sans reflets on lui rend un gris clair
    if (m.metalness > 0.6 && !m.metalnessMap && !m.map) n.color.lerp(new THREE.Color(0xb8bcc4), 0.35);
  }
  CONV.set(m, n); return n;
}

// ---------- Modèles allégés : moins de triangles, mêmes sommets (les poids des os et les textures restent justes) ----------
let pret = null;
const simplifieur = () => pret || (pret = (MeshoptSimplifier.supported ? MeshoptSimplifier.ready.then(() => true) : Promise.resolve(false)).catch(() => false));
const VUES = new WeakSet();
export const BILAN = { avant: 0, apres: 0, pieces: 0, loin: 0 };
// Version lointaine d'une géométrie : mêmes sommets, autre liste de triangles. (WeakMap : une copie de la géométrie n'en hérite pas.)
const LOIN = new WeakMap(), GEO_LOIN = new WeakMap();
function alleger(geo) {
  if (VUES.has(geo)) return; VUES.add(geo);
  const idx = geo.index, pos = geo.attributes.position; if (!idx || !pos || idx.count < 900) return;
  let P = pos.array;
  if (pos.isInterleavedBufferAttribute || !(P instanceof Float32Array) || pos.itemSize !== 3) { P = new Float32Array(pos.count * 3); for (let i = 0; i < pos.count; i++) { P[i * 3] = pos.getX(i); P[i * 3 + 1] = pos.getY(i); P[i * 3 + 2] = pos.getZ(i); } }
  const src = idx.array instanceof Uint32Array ? idx.array : Uint32Array.from(idx.array);
  const Type = pos.count > 65535 ? Uint32Array : Uint16Array;
  // 1. de près : le détail du niveau choisi (rien à faire au niveau « beau »)
  if (Q.tri < 1) {
    const groupes = geo.groups.length > 1 ? geo.groups.map((g) => ({ ...g })) : [{ start: 0, count: idx.count, materialIndex: 0 }];
    const morceaux = []; let total = 0;
    for (const g of groupes) {
      let part = src.subarray(g.start, g.start + g.count);
      if (g.count >= 600) {
        const cible = Math.max(300, Math.floor(g.count * Q.tri / 3) * 3);
        try { const r = MeshoptSimplifier.simplify(part, P, 3, cible, Q.erreur); if (r && r[0] && r[0].length >= 3 && r[0].length < part.length) part = r[0]; } catch (_) { /* on garde la pièce telle quelle */ }
      }
      morceaux.push({ part, g }); total += part.length;
    }
    if (total < idx.count) {
      const out = new Type(total); let o = 0;
      const avecGroupes = geo.groups.length > 1; if (avecGroupes) geo.clearGroups();
      for (const m of morceaux) { out.set(m.part, o); if (avecGroupes) geo.addGroup(o, m.part.length, m.g.materialIndex); o += m.part.length; }
      BILAN.avant += idx.count / 3; BILAN.apres += total / 3; BILAN.pieces++;
      geo.setIndex(new THREE.BufferAttribute(out, 1));
    }
  }
  // 2. au loin : une seconde liste de triangles, plus courte, pour les mêmes sommets
  if (Q.triLoin < 1 && geo.groups.length <= 1) {
    const cible = Math.max(300, Math.floor(src.length * Q.triLoin / 3) * 3);
    try {
      const r = MeshoptSimplifier.simplify(src, P, 3, cible, Q.erreurLoin);
      if (r && r[0] && r[0].length >= 3 && r[0].length < geo.index.count * 0.8) { LOIN.set(geo, new THREE.BufferAttribute(new Type(r[0]), 1)); BILAN.loin++; }
    } catch (_) { /* pas de version lointaine pour cette pièce */ }
  }
}
// La géométrie « de loin » d'une géométrie (elle partage ses sommets), ou null
export function geoLoin(geo) {
  let g = GEO_LOIN.get(geo); if (g !== undefined) return g;
  const ix = LOIN.get(geo);
  if (!ix) g = null;
  else {
    g = new THREE.BufferGeometry(); for (const n in geo.attributes) g.setAttribute(n, geo.attributes[n]); g.setIndex(ix);
    g.morphAttributes = geo.morphAttributes; g.morphTargetsRelative = geo.morphTargetsRelative;
    if (!geo.boundingSphere) geo.computeBoundingSphere(); if (!geo.boundingBox) geo.computeBoundingBox();
    g.boundingSphere = geo.boundingSphere.clone(); g.boundingBox = geo.boundingBox.clone(); g.name = geo.name;
  }
  GEO_LOIN.set(geo, g); return g;
}
export const indexLoin = (geo) => LOIN.get(geo) || null;
export function poserIndexLoin(geo, attribut) { LOIN.set(geo, attribut); GEO_LOIN.delete(geo); }
// Les pièces d'un objet qui ont une version lointaine ; reglerDetail passe de l'une à l'autre
export function detailSelonDistance(racine) { const l = []; racine.traverse((m) => { if (!m.isMesh) return; const g = geoLoin(m.geometry); if (g) l.push({ m, pres: m.geometry, loin: g }); }); return l; }
export function reglerDetail(l, loin) { for (const e of l) { const g = loin ? e.loin : e.pres; if (e.m.geometry !== g) e.m.geometry = g; } }

// Un modèle glTF qui vient d'être lu : matières et triangles au niveau choisi. (Appelé par charge.js, avant toute copie.)
export async function preparerModele(g) {
  const ok = (Q.tri < 1 || Q.triLoin < 1) && await simplifieur();
  g.scene.traverse((m) => {
    if (!m.isMesh) return;
    m.material = Array.isArray(m.material) ? m.material.map(convertir) : convertir(m.material);
    // les feuillages découpés (cartes à trous) ne s'allègent pas : ils perdraient leurs feuilles
    const decoupe = [].concat(m.material).some((x) => x.alphaTest > 0 || x.transparent);
    if (ok && !decoupe) alleger(m.geometry);
  });
  return g;
}

// ---------- Textures : jamais plus grandes que ce que le niveau demande ----------
export async function reduireImage(img) {
  const w = img.width, h = img.height, max = Q.tex;
  if (!w || !h || Math.max(w, h) <= max) return img;
  const k = max / Math.max(w, h), W = Math.max(1, Math.round(w * k)), H = Math.max(1, Math.round(h * k));
  try {
    if (typeof createImageBitmap === 'function' && typeof ImageBitmap === 'function' && img instanceof ImageBitmap) {
      const r = await createImageBitmap(img, { resizeWidth: W, resizeHeight: H, resizeQuality: 'medium', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
      if (r.width === W) { if (img.close) img.close(); return r; }
    }
  } catch (_) { /* on passe par un canevas */ }
  try { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0, W, H); return c; } catch (_) { return img; }
}
// Dans un fichier glTF : les images qui ne servent qu'au relief, au métal ou à l'occlusion (inutiles au niveau choisi)
export function imagesInutiles(json) {
  const out = new Set(); if (Q.matiere === 'physique' || !json || !json.materials || !json.textures) return out;
  const utiles = new Set(), autres = new Set(), src = (t) => (t && json.textures[t.index] ? json.textures[t.index].source : undefined);
  for (const m of json.materials) {
    const p = m.pbrMetallicRoughness || {};
    for (const t of [p.baseColorTexture, m.emissiveTexture]) { const s = src(t); if (s !== undefined) utiles.add(s); }
    for (const t of [p.metallicRoughnessTexture, m.normalTexture, m.occlusionTexture]) { const s = src(t); if (s !== undefined) autres.add(s); }
    for (const e of Object.values(m.extensions || {})) for (const v of Object.values(e || {})) { const s = v && typeof v === 'object' ? src(v) : undefined; if (s !== undefined) utiles.add(s); }
  }
  for (const s of autres) if (!utiles.has(s)) out.add(s);
  return out;
}

// ---------- Squelettes : un seul par personnage ----------
// Un personnage est fait d'une dizaine de pièces (corps, tête, cheveux, bottes…) qui suivent les mêmes os. Si chaque pièce
// a son propre squelette, les mêmes 65 os sont recalculés et envoyés à la carte graphique dix fois par image.
export function partagerSquelettes(racine) {
  const vus = []; let gain = 0;
  racine.traverse((m) => {
    if (!m.isSkinnedMesh || !m.skeleton) return;
    const s = m.skeleton;
    for (const v of vus) {
      if (v === s) return;
      if (v.bones.length !== s.bones.length) continue;
      let pareil = true;
      for (let i = 0; pareil && i < s.bones.length; i++) {
        if (v.bones[i] !== s.bones[i]) pareil = false;
        else { const a = v.boneInverses[i].elements, b = s.boneInverses[i].elements; for (let k = 0; k < 16; k++) if (Math.abs(a[k] - b[k]) > 1e-5) { pareil = false; break; } }
      }
      if (pareil) { m.skeleton = v; if (s.boneTexture) s.dispose(); gain++; return; }
    }
    vus.push(s);
  });
  return gain;
}

// ---------- Moins d'objets à dessiner : les pièces d'un personnage qui ont la même matière n'en font plus qu'une ----------
// (bras, torse, jambes et bottes d'un même costume : une seule pièce ; la tête, les yeux, les cheveux gardent la leur)
const FUSIONS = new Map(), sig = (mx) => Array.from(mx.elements, (x) => x.toFixed(4)).join(',');
const accord = (l, nom) => { const a = l[0].geometry.attributes[nom]; return !!a && l.every((m) => { const b = m.geometry.attributes[nom]; return b && !b.isInterleavedBufferAttribute && b.array.constructor === a.array.constructor && b.itemSize === a.itemSize && b.normalized === a.normalized; }); };
function reunir(l, noms, transformer) {
  const copies = l.map((m) => { const c = new THREE.BufferGeometry(); for (const n of noms) c.setAttribute(n, transformer ? m.geometry.attributes[n].clone() : m.geometry.attributes[n]); c.setIndex(m.geometry.index); if (transformer) transformer(c, m); return c; });
  try { return mergeGeometries(copies, false); } catch (_) { return null; }
}
// Ce dont la matière a besoin dans chaque sommet ; null si les pièces ne s'accordent pas (alors on ne les réunit pas)
const CARTES = ['map', 'normalMap', 'aoMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap', 'lightMap', 'bumpMap', 'specularMap'];
function attributsUtiles(mat, l, peau) {
  const noms = ['position', 'normal'], canaux = new Set();
  for (const c of CARTES) if (mat[c]) canaux.add(mat[c].channel || 0);
  for (const c of canaux) noms.push(c ? 'uv' + c : 'uv');
  if (mat.vertexColors) noms.push('color');                    // (elle multiplie la texture : sans elle le costume sortirait noir)
  if (l.some((m) => m.geometry.attributes.tangent)) noms.push('tangent');
  if (peau) noms.push('skinIndex', 'skinWeight');
  return noms.every((n) => accord(l, n)) ? noms : null;
}
// La liste de triangles « de loin » de pièces réunies : celles de chaque pièce, décalées comme ses sommets
function indexLoinReuni(l, g, indexDe) {
  if (!l.some((m) => LOIN.has(m.geometry))) return null;
  let total = 0; for (const m of l) total += indexDe(m).count;
  const I = new (g.attributes.position.count > 65535 ? Uint32Array : Uint16Array)(total); let o = 0, v0 = 0;
  for (const m of l) { const a = indexDe(m).array; for (let i = 0; i < a.length; i++) I[o++] = a[i] + v0; v0 += m.geometry.attributes.position.count; }
  return new THREE.BufferAttribute(I, 1);
}
const indexDeLoin = (m) => LOIN.get(m.geometry) || m.geometry.index;
export function fusionnerPieces(racine) {
  const groupes = new Map(); let gain = 0;
  racine.traverse((m) => {
    if (!m.isSkinnedMesh || !m.visible || Array.isArray(m.material) || !m.geometry.index || m.geometry.morphAttributes.position || m.geometry.groups.length > 1) return;
    m.updateMatrix();
    const k = m.skeleton.uuid + m.material.uuid + m.parent.uuid + sig(m.matrix) + sig(m.bindMatrix);
    let l = groupes.get(k); if (!l) groupes.set(k, l = []); l.push(m);
  });
  for (const l of groupes.values()) {
    if (l.length < 2) continue;
    const cle = l.map((m) => m.geometry.uuid).join('+');
    let g = FUSIONS.get(cle);
    if (g === undefined) {
      const noms = attributsUtiles(l[0].material, l, true);
      g = noms ? reunir(l, noms) : null;
      if (g) { const ix = indexLoinReuni(l, g, indexDeLoin); if (ix) LOIN.set(g, ix); }
      FUSIONS.set(cle, g || null);
    }
    if (!g) continue;
    l[0].geometry = g; for (let i = 1; i < l.length; i++) { l[i].parent.remove(l[i]); gain++; }
  }
  return gain;
}
// Un objet rigide fait de plusieurs morceaux (épée : lame, garde, pommeau) : un seul morceau par matière
export function fusionnerRigide(racine) {
  if (!racine) return 0;
  racine.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(racine.matrixWorld).invert(), groupes = new Map(), rel = new THREE.Matrix4(); let gain = 0;
  racine.traverse((m) => {
    if (!m.isMesh || m.isSkinnedMesh || m.isInstancedMesh || !m.visible || Array.isArray(m.material) || !m.geometry.attributes.normal || m.userData.shadow || m.userData.anim) return;
    for (let a = m.parent; a && a !== racine; a = a.parent) if (!a.visible || a.userData.anim) return;
    if (m.matrixWorld.determinant() < 0) return;
    const k = m.material.uuid + '|' + !!m.geometry.index;
    let l = groupes.get(k); if (!l) groupes.set(k, l = []); l.push(m);
  });
  for (const l of groupes.values()) {
    if (l.length < 2) continue;
    const noms = attributsUtiles(l[0].material, l, false);
    if (!noms) continue;
    const g = reunir(l, noms, (c, m) => { rel.multiplyMatrices(inv, m.matrixWorld); c.applyMatrix4(rel); });
    if (!g) continue;
    const m0 = new THREE.Mesh(g, l[0].material); m0.name = l[0].name; racine.add(m0);
    for (const m of l) { m.parent.remove(m); gain++; }
    gain--;
  }
  return gain;
}

// ---------- Ce que l'on voit seulement : champ de la caméra ----------
const champ = new THREE.Frustum(), mat4 = new THREE.Matrix4(), boule = new THREE.Sphere(), vPos = new THREE.Vector3();
export function reglerChamp(camera) { camera.updateMatrixWorld(); mat4.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); champ.setFromProjectionMatrix(mat4); vPos.setFromMatrixPosition(camera.matrixWorld); }
// Un personnage (ou un monstre) est-il dans le champ ? rayon large : on ne veut pas le voir « apparaître » au bord de l'écran
export function dansChamp(o, rayon = 2.6) {
  const h = o.userData.height || 1.8, e = o.scale.y || 1;
  boule.center.set(o.position.x, o.position.y + h * e * 0.5, o.position.z); boule.radius = (rayon + h * 0.5) * Math.max(1, e);
  return champ.intersectsSphere(boule);
}
export const distanceCamera = (o) => Math.hypot(o.position.x - vPos.x, o.position.z - vPos.z);

// ---------- Compteur d'images et renseignements sur l'appareil ----------
export function puce(renderer) {
  try { const gl = renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return String(e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || ''); } catch (_) { return ''; }
}
export const sansPuce = (nom) => /swiftshader|llvmpipe|software|softpipe|microsoft basic/i.test(nom || '');
const CLE_C = 'alderia_compteur';
export const compteurVoulu = () => { try { return localStorage.getItem(CLE_C) === '1' || /[?&]compteur=1/.test(location.search); } catch (_) { return false; } };
export function reglerCompteur(oui) { try { localStorage.setItem(CLE_C, oui ? '1' : '0'); } catch (_) {} const el = document.getElementById('compteur'); if (el) el.style.display = oui ? '' : 'none'; }
let cDebut = 0, cImages = 0;
export const MESURE = { ips: 0, objets: 0, triangles: 0 };
export function compter(renderer) {
  const m = performance.now(); cImages++;
  if (!cDebut) { cDebut = m; cImages = 0; return; }
  if (m - cDebut < 500) return;
  MESURE.ips = Math.round(cImages * 1000 / (m - cDebut)); cDebut = m; cImages = 0;
  MESURE.objets = renderer.info.render.calls; MESURE.triangles = renderer.info.render.triangles;
  const el = document.getElementById('compteur'); if (!el || el.style.display === 'none') return;
  const c = renderer.domElement;
  el.textContent = MESURE.ips + ' images/s · ' + MESURE.objets + ' objets · ' + Math.round(MESURE.triangles / 1000) + ' k triangles · ' + c.width + '×' + c.height + ' · ' + Q.nom;
}
