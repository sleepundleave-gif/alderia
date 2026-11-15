// ============================================================
//  EXPORT DES ASSETS
//  Transforme un personnage, une créature ou un décor du jeu en
//  fichier .glb (glTF 2.0) : le format standard que Unity (paquet
//  glTFast), Blender ou Godot savent ouvrir.
//  Un asset = 1 maillage + 1 texture (la palette) + 1 matériau,
//  et pour les personnages et les créatures : 1 squelette + les
//  poids + les clips, plus le contour à l'encre (2e maillage).
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { GLTFExporter } from '../lib/GLTFExporter.js';
import { mergeVertices } from '../lib/BufferGeometryUtils.js';
import { makeChar, makeClips, toRestPose, makeWeapon, makeWolf, makeMushroom, makeFirefly, makeHorse, CHARS } from './chars.js';
import { makeTree, makeHouse, makeWell, makeBarrel, makeCrate, makeChest, makeStatue, makeStall, makeCart, makeAnvil, makeRock, makeBush, makeFence } from './models.js';

const _c = new THREE.Color();
const hexOf = (r, g, b) => _c.setRGB(r, g, b).getHex();

// ---------- La palette : une petite image où chaque case est une couleur du modèle ----------
export function makePalette(hexList) {
  const colors = [...new Set(hexList)].sort((a, b) => a - b);
  const cols = Math.max(2, Math.ceil(Math.sqrt(colors.length))), cell = 8;
  let size = 16; while (size < cols * cell) size *= 2;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, size, size);
  const uv = new Map();
  colors.forEach((hex, i) => {
    const cx = i % cols, cy = Math.floor(i / cols);
    ctx.fillStyle = '#' + hex.toString(16).padStart(6, '0'); ctx.fillRect(cx * cell, cy * cell, cell, cell);
    uv.set(hex, [(cx + 0.5) * cell / size, 1 - (cy + 0.5) * cell / size]);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.magFilter = texture.minFilter = THREE.NearestFilter; texture.generateMipmaps = false; texture.name = 'Palette';
  return { canvas, texture, uv, colors };
}
// Couleurs utilisées par les maillages d'un objet (couleurs par sommet)
export function colorsOf(obj) {
  const out = [];
  obj.traverse((m) => {
    if (!m.isMesh || m.userData.outline || !m.geometry.attributes.color || !m.material.vertexColors) return;
    const C = m.geometry.attributes.color, seen = new Set();
    for (let i = 0; i < C.count; i++) { const h = hexOf(C.getX(i), C.getY(i), C.getZ(i)); if (!seen.has(h)) { seen.add(h); out.push(h); } }
  });
  return out;
}

// Géométrie d'export : positions, normales, coordonnées de texture (+ os et poids), sommets identiques soudés
function exportGeometry(geo, pal) {
  const C = geo.attributes.color, uv = new Float32Array(C.count * 2);
  for (let i = 0; i < C.count; i++) { const p = pal.uv.get(hexOf(C.getX(i), C.getY(i), C.getZ(i))); uv[i * 2] = p[0]; uv[i * 2 + 1] = p[1]; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', geo.attributes.position); g.setAttribute('normal', geo.attributes.normal);
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (geo.attributes.skinIndex) { g.setAttribute('skinIndex', geo.attributes.skinIndex); g.setAttribute('skinWeight', geo.attributes.skinWeight); }
  return mergeVertices(g, 1e-5);
}
// Le contour à l'encre : une seconde peau, gonflée de quelques millimètres, retournée (on n'en voit que l'intérieur,
// donc seulement ce qui dépasse derrière le modèle) et d'un noir uni. Rangée telle quelle dans le fichier,
// elle donne le même trait dans n'importe quel moteur, sans shader spécial.
const INK = 0x1c130d, INK_WIDTH = 0.0095, INKED = new WeakSet();
function outlineGeometry(geo) {
  const g0 = geo.index ? geo.toNonIndexed() : geo;
  const P = g0.attributes.position, N = g0.attributes.normal, W = g0.attributes.ow, SI = g0.attributes.skinIndex, SW = g0.attributes.skinWeight;
  const pos = [], nor = [], si = [], sw = [];
  for (let i = 0; i < P.count; i += 3) {
    if (!W.getX(i) && !W.getX(i + 1) && !W.getX(i + 2)) continue;       // petits détails du visage : pas de trait
    for (const j of [0, 2, 1]) {                                          // ordre inversé : la face est retournée
      const v = i + j, w = W.getX(v) * INK_WIDTH;
      pos.push(P.getX(v) + N.getX(v) * w, P.getY(v) + N.getY(v) * w, P.getZ(v) + N.getZ(v) * w);
      nor.push(-N.getX(v), -N.getY(v), -N.getZ(v));
      if (SI) { si.push(SI.getX(v), SI.getY(v), SI.getZ(v), SI.getW(v)); sw.push(SW.getX(v), SW.getY(v), SW.getZ(v), SW.getW(v)); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  if (SI) { g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); }
  return mergeVertices(g, 1e-5);
}
const paletteMaterial = (pal) => new THREE.MeshStandardMaterial({ map: pal.texture, roughness: 0.85, metalness: 0, name: 'Palette' });

async function writeGLB(root, clips) {
  return new GLTFExporter().parseAsync(root, { binary: true, animations: clips || [], onlyVisible: true });
}
function statsOf(root, buffer, extra) {
  let tris = 0, verts = 0;
  let ink = 0;
  root.traverse((m) => { if (m.isMesh && m.visible) { const n = (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; tris += n; verts += m.geometry.attributes.position.count; if (INKED.has(m)) ink += n; } });
  return Object.assign({ triangles: Math.round(tris), outlineTriangles: Math.round(ink), vertices: verts, bytes: buffer.byteLength }, extra);
}

// ---------- Personnage, créature, arme : on garde la hiérarchie (os, pièces mobiles) ----------
// L'objet du jeu est modifié le temps de l'export puis remis exactement comme avant.
export async function toGLB(obj, name, opt = {}) {
  const rig = obj.userData.rig, clips = rig ? makeClips(obj) : [];
  const pal = makePalette(colorsOf(obj)), material = paletteMaterial(pal), ink = new THREE.MeshBasicMaterial({ color: INK, name: 'Encre' });
  const nodes = []; obj.traverse((n) => nodes.push(n));
  const undo = [], geos = new Map(), inks = new Map();
  const keep = { pos: obj.position.clone(), quat: obj.quaternion.clone(), scale: obj.scale.clone(), name: obj.name, parent: obj.parent };
  const bonesSaved = rig ? rig.bones.map((b) => [b.position.clone(), b.quaternion.clone()]) : null;
  if (rig) toRestPose(obj);                                  // le fichier contient la pose de repos ; les poses animées sont dans les clips
  for (const n of nodes) {
    const isInk = n.userData.outline && n.isMesh && opt.outline !== false && n.geometry.attributes.ow;
    const hide = (n.userData.outline && !isInk) || n.userData.shadow || (n.isMesh && n.material.transparent && n.material.opacity < 0.5);   // ombre au sol, halos : propres à ce moteur
    if (hide) { const v = n.visible; n.visible = false; undo.push(() => { n.visible = v; }); }
    else if (isInk) {
      const g0 = n.geometry, m0 = n.material, v = n.visible; let g1 = inks.get(g0); if (!g1) { g1 = outlineGeometry(g0); inks.set(g0, g1); }
      n.geometry = g1; n.material = ink; n.visible = true; if (!n.name) n.name = 'ContourPiece'; undo.push(() => { n.geometry = g0; n.material = m0; n.visible = v; });
      INKED.add(n);
    }
    else if (n.isMesh && n.geometry.attributes.color && n.material.vertexColors) {
      const g0 = n.geometry, m0 = n.material; let g1 = geos.get(g0); if (!g1) { g1 = exportGeometry(g0, pal); geos.set(g0, g1); }
      n.geometry = g1; n.material = material; if (!n.name) n.name = 'Piece'; undo.push(() => { n.geometry = g0; n.material = m0; });
    }
    const ud = n.userData; n.userData = {}; undo.push(() => { n.userData = ud; });
  }
  if (keep.parent) keep.parent.remove(obj);
  obj.position.set(0, 0, 0); obj.quaternion.identity(); obj.scale.set(1, 1, 1); obj.name = name; obj.updateMatrixWorld(true);
  let buffer;
  // Personnage : le maillage et l'os racine sont posés à la racine du fichier (recommandation glTF pour les maillages à squelette)
  const input = rig ? [rig.root, rig.mesh, ...obj.children.filter((c) => c !== rig.root && c !== rig.mesh && c.visible)] : obj;
  try { buffer = await writeGLB(input, clips); }
  finally {
    var stats = buffer ? statsOf(obj, buffer, { bones: rig ? rig.bones.length : 0, clips: clips.map((c) => c.name), colors: pal.colors.length }) : null;
    undo.reverse().forEach((f) => f());
    obj.position.copy(keep.pos); obj.quaternion.copy(keep.quat); obj.scale.copy(keep.scale); obj.name = keep.name;
    if (keep.parent) keep.parent.add(obj);
    if (rig) rig.bones.forEach((b, i) => { b.position.copy(bonesSaved[i][0]); b.quaternion.copy(bonesSaved[i][1]); });
    geos.forEach((g) => g.dispose()); inks.forEach((g) => g.dispose()); material.dispose(); ink.dispose();
  }
  return { buffer, stats, palette: pal };
}

// ---------- Décor : tout est soudé en un seul maillage fixe ----------
const _v = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3(), _nm = new THREE.Matrix3();
export async function staticToGLB(obj, name) {
  obj.position.set(0, 0, 0); obj.rotation.set(0, 0, 0); obj.updateMatrixWorld(true);
  const pos = [], nor = [], hex = [];
  obj.traverse((m) => {
    if (!m.isMesh || !m.visible || m.material.transparent || m.userData.outline || m.userData.shadow) return;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry, P = g.attributes.position, N = g.attributes.normal, C = m.material.vertexColors ? g.attributes.color : null;
    const flat = !!m.material.flatShading, base = m.material.color ? m.material.color.getHex() : 0xffffff;
    _nm.getNormalMatrix(m.matrixWorld);
    for (let i = 0; i < P.count; i += 3) {
      const tri = [0, 1, 2].map((j) => new THREE.Vector3().fromBufferAttribute(P, i + j).applyMatrix4(m.matrixWorld));
      _n.copy(_a.subVectors(tri[1], tri[0])).cross(_b.subVectors(tri[2], tri[0]));
      if (_n.lengthSq() < 1e-16) continue;                   // triangle aplati : inutile
      _n.normalize();                                        // facettes nettes : une normale par triangle
      for (let j = 0; j < 3; j++) {
        pos.push(tri[j].x, tri[j].y, tri[j].z);
        if (!flat) { _v.fromBufferAttribute(N, i + j).applyMatrix3(_nm); if (_v.lengthSq() < 1e-16) _v.copy(_n); else _v.normalize(); } else _v.copy(_n);
        nor.push(_v.x, _v.y, _v.z);
        hex.push(C ? hexOf(C.getX(i + j), C.getY(i + j), C.getZ(i + j)) : base);
      }
    }
  });
  const pal = makePalette(hex), uv = new Float32Array(hex.length * 2);
  hex.forEach((h, i) => { const p = pal.uv.get(h); uv[i * 2] = p[0]; uv[i * 2 + 1] = p[1]; });
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo = mergeVertices(geo, 1e-5);
  const mesh = new THREE.Mesh(geo, paletteMaterial(pal)); mesh.name = name;
  const buffer = await writeGLB(mesh, []);
  return { buffer, stats: statsOf(mesh, buffer, { bones: 0, clips: [], colors: pal.colors.length }), palette: pal };
}

// ---------- Catalogue : tout ce que le jeu sait fabriquer ----------
const upright = (w) => { w.rotation.set(0, 0, 0); return w; };
export const CATALOGUE = [
  ...Object.keys(CHARS).map((k) => ({ dir: 'personnages', file: k, kind: 'rig', make: () => makeChar(k) })),
  { dir: 'creatures', file: 'loup', kind: 'rig', make: makeWolf },
  { dir: 'creatures', file: 'champignon', kind: 'rig', make: makeMushroom },
  { dir: 'creatures', file: 'luciole', kind: 'rig', make: makeFirefly },
  { dir: 'creatures', file: 'cheval', kind: 'rig', make: () => makeHorse() },
  { dir: 'armes', file: 'epee', kind: 'parts', make: () => upright(makeWeapon('sword')) },
  { dir: 'armes', file: 'grande_epee', kind: 'parts', make: () => upright(makeWeapon('bigsword')) },
  { dir: 'armes', file: 'baton', kind: 'parts', make: () => upright(makeWeapon('staff')) },
  { dir: 'armes', file: 'marteau', kind: 'parts', make: () => upright(makeWeapon('hammer')) },
  { dir: 'armes', file: 'massue', kind: 'parts', make: () => upright(makeWeapon('club')) },
  { dir: 'armes', file: 'canne', kind: 'parts', make: () => upright(makeWeapon('cane')) },
  { dir: 'decors', file: 'arbre', kind: 'static', make: () => makeTree('round') },
  { dir: 'decors', file: 'sapin', kind: 'static', make: () => makeTree('pine') },
  { dir: 'decors', file: 'bouleau', kind: 'static', make: () => makeTree('birch') },
  { dir: 'decors', file: 'maison', kind: 'static', make: () => makeHouse(7, 6, 3.2) },
  { dir: 'decors', file: 'puits', kind: 'static', make: makeWell },
  { dir: 'decors', file: 'tonneau', kind: 'static', make: makeBarrel },
  { dir: 'decors', file: 'caisse', kind: 'static', make: () => makeCrate() },
  { dir: 'decors', file: 'coffre', kind: 'static', make: () => makeChest(false) },
  { dir: 'decors', file: 'statue_aube', kind: 'static', make: makeStatue },
  { dir: 'decors', file: 'etal', kind: 'static', make: () => makeStall() },
  { dir: 'decors', file: 'charrette', kind: 'static', make: () => makeCart() },
  { dir: 'decors', file: 'enclume', kind: 'static', make: makeAnvil },
  { dir: 'decors', file: 'rocher', kind: 'static', make: () => makeRock() },
  { dir: 'decors', file: 'buisson', kind: 'static', make: () => makeBush() },
  { dir: 'decors', file: 'barriere', kind: 'static', make: () => makeFence(4) },
];
export async function exportEntry(e) {
  const obj = e.make();
  return e.kind === 'static' ? staticToGLB(obj, e.file) : toGLB(obj, e.file);
}
