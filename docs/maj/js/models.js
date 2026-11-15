// ============================================================
//  MODÈLES 3D : personnages, créatures et décors construits
//  à partir de formes simples (style « low-poly » coloré) — les décors ; les personnages sont dans chars.js
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { fumee, feu, montagne, nuage } from './paysage.js';
import { piece, hasPiece, decorReady, groundMat, kitHouse, kitTree, kitRock, kitBush, kitFence, kitBarrel, kitCrate, kitAnvil, kitStall, kitChest, kitCart, kitBanner } from './decor.js';

// ---------- Matériaux et géométries partagés ----------
const MATS = new Map();
export function mat(color, o = {}) {
  const key = color + '|' + (o.smooth ? 's' : '') + (o.emissive || '') + (o.opacity || '') + (o.basic ? 'b' : '') + (o.side ? 'd' : '');
  let m = MATS.get(key);
  if (!m) {
    if (o.basic) m = new THREE.MeshBasicMaterial({ color });
    else m = new THREE.MeshLambertMaterial({ color, flatShading: !o.smooth });
    if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.emissiveIntensity || 1; }
    if (o.opacity) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; }
    if (o.side) m.side = THREE.DoubleSide;
    MATS.set(key, m);
  }
  return m;
}

const G_BOX = new THREE.BoxGeometry(1, 1, 1);
const G_SPH = new THREE.IcosahedronGeometry(0.5, 1);
const G_SPH_S = new THREE.SphereGeometry(0.5, 14, 10);
const G_CONE = new THREE.ConeGeometry(0.5, 1, 8);
const G_CONE4 = new THREE.ConeGeometry(0.5, 1, 4);
const G_CONE6 = new THREE.ConeGeometry(0.5, 1, 6);
const G_PLANE = new THREE.PlaneGeometry(1, 1);
const G_CIRCLE = new THREE.CircleGeometry(0.5, 20);
const CYLS = new Map();
function cylGeo(ratio, seg) { const k = ratio.toFixed(2) + '|' + seg; let g = CYLS.get(k); if (!g) { g = new THREE.CylinderGeometry(0.5 * ratio, 0.5, 1, seg); CYLS.set(k, g); } return g; }
const G_PRISM = (() => {
  const s = new THREE.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0, 1); s.lineTo(-0.5, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -0.5); return g;
})();

function M(geo, color, o) { return new THREE.Mesh(geo, typeof color === 'object' && color.isMaterial ? color : mat(color, o)); }
export function box(w, h, d, color, x = 0, y = 0, z = 0, o) { const m = M(G_BOX, color, o); m.scale.set(w, h, d); m.position.set(x, y, z); return m; }
export function sph(d, color, x = 0, y = 0, z = 0, o) { const m = M(o && o.smooth ? G_SPH_S : G_SPH, color, o); m.scale.setScalar(d); m.position.set(x, y, z); return m; }
export function cyl(rTop, rBot, h, color, x = 0, y = 0, z = 0, seg = 10, o) { const m = M(cylGeo(rBot ? rTop / rBot : 1, seg), color, o); m.scale.set(rBot * 2, h, rBot * 2); m.position.set(x, y, z); return m; }
export function cone(r, h, color, x = 0, y = 0, z = 0, seg = 8, o) { const m = M(seg === 4 ? G_CONE4 : seg === 6 ? G_CONE6 : G_CONE, color, o); m.scale.set(r * 2, h, r * 2); m.position.set(x, y, z); return m; }
export function prism(w, h, d, color, x = 0, y = 0, z = 0) { const m = M(G_PRISM, color); m.scale.set(w, h, d); m.position.set(x, y, z); return m; }
export function flat(w, d, color, x = 0, y = 0.01, z = 0, o) { const m = M(G_PLANE, (!o && typeof color === 'number' && Math.min(w, d) >= 0.4 && groundMat(color)) || color, o); m.rotation.x = -Math.PI / 2; m.scale.set(w, d, 1); m.position.set(x, y, z); return m; }
export function disc(r, color, x = 0, y = 0.01, z = 0, o) { const m = M(G_CIRCLE, (!o && typeof color === 'number' && r >= 0.4 && groundMat(color)) || color, o); m.rotation.x = -Math.PI / 2; m.scale.set(r * 2, r * 2, 1); m.position.set(x, y, z); return m; }
function grp(...kids) { const g = new THREE.Group(); kids.forEach(k => k && g.add(k)); return g; }
const SHADOW = mat(0x000000, { basic: true, opacity: 0.28 });
function blob(r) { const m = M(G_CIRCLE, SHADOW); m.rotation.x = -Math.PI / 2; m.scale.set(r * 2, r * 2, 1); m.position.y = 0.03; return m; }

// ============================================================
//  PERSONNAGES ET CRÉATURES : voir chars.js
// ============================================================
export { humanoid, CHARS, CLIPS, makeClips, toRestPose, makeWeapon, makeChar, makeWolf, makeMushroom, makeFirefly, makeHorse, makeEnemyModel } from './chars.js';

// ============================================================
//  DÉCORS
// ============================================================
export function makeTree(type = 'round', s = 1, tint) {
  if (decorReady()) return kitTree(type, s, tint);
  const g = new THREE.Group();
  if (type === 'pine') {
    g.add(cyl(0.14 * s, 0.2 * s, 1.2 * s, 0x5a3e24, 0, 0.6 * s, 0, 6));
    const c = tint || 0x2f6a3a;
    g.add(cone(1.3 * s, 2.0 * s, c, 0, 1.9 * s, 0, 6)); g.add(cone(1.0 * s, 1.7 * s, c, 0, 3.0 * s, 0, 6)); g.add(cone(0.65 * s, 1.4 * s, c, 0, 4.0 * s, 0, 6));
  } else if (type === 'birch') {
    g.add(cyl(0.1 * s, 0.14 * s, 3.2 * s, 0xe8e4d8, 0, 1.6 * s, 0, 6));
    const c = tint || 0x8fc45a;
    g.add(sph(2.0 * s, c, 0, 3.6 * s, 0)); g.add(sph(1.4 * s, c, 0.6 * s, 4.4 * s, 0.2 * s));
  } else if (type === 'dead') {
    g.add(cyl(0.1 * s, 0.22 * s, 3.0 * s, 0x2a2220, 0, 1.5 * s, 0, 5));
    const b1 = cyl(0.03 * s, 0.08 * s, 1.4 * s, 0x2a2220, 0.4 * s, 2.6 * s, 0, 4); b1.rotation.z = -0.9; g.add(b1);
    const b2 = cyl(0.03 * s, 0.08 * s, 1.1 * s, 0x2a2220, -0.35 * s, 2.2 * s, 0.1, 4); b2.rotation.z = 0.8; g.add(b2);
  } else if (type === 'big') {
    g.add(cyl(0.45 * s, 0.7 * s, 4.5 * s, 0x4e3a26, 0, 2.25 * s, 0, 8));
    const c = tint || 0x2a5a34;
    g.add(sph(5.0 * s, c, 0, 6.0 * s, 0)); g.add(sph(3.6 * s, c, 1.6 * s, 7.4 * s, 0.6 * s)); g.add(sph(3.4 * s, c, -1.5 * s, 7.0 * s, -0.8 * s));
  } else {
    g.add(cyl(0.16 * s, 0.24 * s, 1.8 * s, 0x6a4a2a, 0, 0.9 * s, 0, 6));
    const c = tint || 0x4a9a4a;
    g.add(sph(2.4 * s, c, 0, 2.7 * s, 0)); g.add(sph(1.7 * s, c, 0.7 * s, 3.5 * s, 0.3 * s)); g.add(sph(1.5 * s, c, -0.6 * s, 3.3 * s, -0.4 * s));
  }
  return g;
}

export function makeRock(s = 1, color = 0x8a8a86) { if (decorReady()) return kitRock(s, color); const g = new THREE.Group(); const r = sph(1.4 * s, color, 0, 0.4 * s, 0); r.scale.set(1.4 * s, 0.9 * s, 1.2 * s); r.rotation.y = Math.random() * 3; g.add(r); return g; }
export function makeBush(s = 1, color = 0x3f8a3f) { if (decorReady()) return kitBush(s, color === 0x3f8a3f ? null : color); const g = new THREE.Group(); g.add(sph(1.1 * s, color, 0, 0.4 * s, 0)); g.add(sph(0.8 * s, color, 0.5 * s, 0.3 * s, 0.2 * s)); return g; }

// Maison : w (largeur x), d (profondeur z), h (hauteur des murs)
export function makeHouse(w, d, h, wall = 0xf2ece0, roof = 0xc8a050, o = {}) {
  if (decorReady()) return kitHouse(w, d, h, Object.assign({ dark: new THREE.Color(wall).getHSL({}, THREE.SRGBColorSpace).l < 0.45 }, o));
  const g = new THREE.Group();
  g.add(box(w, h, d, wall, 0, h / 2, 0));
  const r = prism(w + 0.8, o.roofH || h * 0.75, d + 0.8, roof, 0, h, 0); g.add(r); g.userData.roof = r;
  // Colombages et ouvertures sur la façade (côté +z)
  const wood = 0x5a3e24;
  g.add(box(w + 0.05, 0.14, d + 0.05, wood, 0, h - 0.07, 0));
  g.add(box(0.9, 1.7, 0.08, o.door || wood, o.doorX || 0, 0.85, d / 2 + 0.02));
  for (const s of [-1, 1]) {
    if (Math.abs((o.doorX || 0) - s * w * 0.3) < 0.8) continue;
    g.add(box(0.8, 0.8, 0.08, 0x8fc0e0, s * w * 0.3, h * 0.58, d / 2 + 0.02));
    g.add(box(0.95, 0.1, 0.12, wood, s * w * 0.3, h * 0.58 - 0.45, d / 2 + 0.03));
    if (o.flowers) g.add(box(0.9, 0.16, 0.16, [0xe04a6a, 0xe0c040, 0xb060e0][Math.floor(Math.random() * 3)], s * w * 0.3, h * 0.58 - 0.34, d / 2 + 0.12));
  }
  if (o.chimney !== false) g.add(box(0.5, 1.4, 0.5, 0x8a7a6a, w * 0.28, h + (o.roofH || h * 0.75) * 0.6, -d * 0.2));
  return g;
}

export function makeWell() {
  const g = new THREE.Group();
  g.add(cyl(0.9, 0.9, 0.8, 0x9a9a94, 0, 0.4, 0, 10));
  g.add(disc(0.72, 0x2a5a8a, 0, 0.81, 0));
  for (const s of [-1, 1]) g.add(box(0.12, 1.8, 0.12, 0x5a3e24, 0.8 * s, 1.3, 0));
  g.add(prism(2.2, 0.6, 1.4, 0x8a5a36, 0, 2.2, 0));
  const axle = cyl(0.06, 0.06, 1.6, 0x5a3e24, 0, 1.9, 0, 6); axle.rotation.z = Math.PI / 2; g.add(axle);
  return g;
}

export function makeFence(len, color = 0x7a5a36) {
  if (decorReady()) return kitFence(len);
  const g = new THREE.Group();
  const n = Math.max(2, Math.round(len / 1.6));
  for (let i = 0; i <= n; i++) g.add(box(0.12, 1.0, 0.12, color, -len / 2 + (len * i) / n, 0.5, 0));
  g.add(box(len, 0.1, 0.06, color, 0, 0.75, 0)); g.add(box(len, 0.1, 0.06, color, 0, 0.4, 0));
  return g;
}

export function makeBarrel() { if (decorReady()) return kitBarrel(); const g = new THREE.Group(); g.add(cyl(0.34, 0.34, 0.9, 0x7a5230, 0, 0.45, 0, 10)); g.add(cyl(0.36, 0.36, 0.07, 0x3a3a3a, 0, 0.2, 0, 10)); g.add(cyl(0.36, 0.36, 0.07, 0x3a3a3a, 0, 0.7, 0, 10)); return g; }
export function makeCrate(s = 0.8) { if (decorReady()) return kitCrate(s); const g = new THREE.Group(); g.add(box(s, s, s, 0x9a7a4a, 0, s / 2, 0)); g.add(box(s + 0.03, 0.08, s + 0.03, 0x6a4a2a, 0, s - 0.05, 0)); return g; }

// Un étal et ce qu'on y vend. genre : 'fruits', 'legumes', 'pain', 'poisson', 'fleurs', 'tissus', 'armes', 'potions',
// 'maree' (remèdes de la côte), 'bazar', 'poterie', 'outils', 'forain' ; false : étal vide (renversé, brûlé).
// La marchandise est posée sur le plateau (y0), dans la largeur de l'étal ; le marchand se tient derrière (côté -z).
export function makeStall(color = 0xc04a3a, genre) {
  const kit = decorReady(), g = kit ? kitStall(color, false) : new THREE.Group(), y0 = kit ? 1.12 : 0.9, yT = kit ? 2.42 : 2.1;
  if (!kit) {
    g.add(box(2.4, 0.9, 1.0, 0x8a6a40, 0, 0.45, 0));
    for (const [x, z] of [[-1.15, -0.45], [1.15, -0.45], [-1.15, 0.45], [1.15, 0.45]]) g.add(box(0.08, 2.2, 0.08, 0x5a3e24, x, 1.1, z));
    const roof = box(2.7, 0.08, 1.5, color, 0, 2.25, 0.1); roof.rotation.x = 0.18; g.add(roof);
  }
  if (genre === undefined) genre = new THREE.Color(color).getHSL({}).l > 0.25 ? 'fruits' : false;
  if (genre) g.add(marchandise(genre, y0, yT));
  return g;
}
function marchandise(genre, y0, yT) {
  const g = new THREE.Group(), R = Math.random, P = (nom, x, y, z, ry = 0, sc = 1) => { if (!hasPiece(nom)) return null; const o = piece(nom, x, y0 + y, z, ry, sc); g.add(o); return o; };
  const A = (o) => { o.position.y += y0; g.add(o); return o; };
  const aPlat = (nom, x, z, ry, sc = 1) => { const o = P(nom, x, 0.04, z, ry, sc); if (o) { o.rotation.order = 'YXZ'; o.rotation.x = -Math.PI / 2; } return o; };
  const tas = (n, d, couleurs, x, z, l = 0.5, pr = 0.3) => { for (let i = 0; i < n; i++) A(sph(d * (0.85 + R() * 0.3), couleurs[i % couleurs.length], x + (R() - 0.5) * l, d * 0.42 + (i > n * 0.6 ? d * 0.6 : 0), z + (R() - 0.5) * pr)); };
  const panier = (x, z, r = 0.24, h = 0.16, c = 0xb08a50) => A(cyl(r, r * 0.8, h, c, x, h / 2, z, 10));
  const nappe = (c) => { A(box(2.32, 0.03, 1.06, c, 0, 0.012, 0)); A(box(2.32, 0.34, 0.02, c, 0, -0.16, 0.54)); };
  const pend = (x, fn) => { const o = fn(); o.position.set(x, yT - y0 - 0.42, 0.42); A(o); A(box(0.012, 0.3, 0.012, 0x5a4a30, x, yT - y0 - 0.2, 0.42)); };
  const poisson = (L = 0.42, c = 0x9ab4c8) => { const o = new THREE.Group(), b = sph(1, c, 0, 0, 0); b.scale.set(L, L * 0.3, L * 0.16); o.add(b); const q = cone(L * 0.14, L * 0.3, c, -L * 0.6, 0, 0, 4); q.rotation.z = -Math.PI / 2; q.scale.z = L * 0.08; o.add(q); o.add(sph(L * 0.06, 0x1a1a1a, L * 0.34, L * 0.04, L * 0.07)); return o; };
  switch (genre) {
    case 'fruits':
      P('FarmCrate_Apple', -0.62, 0, 0.05, 0.15, 1.05); panier(0.1, 0.1, 0.27); tas(9, 0.15, [0xe8a030, 0xf0c040], 0.1, 0.1, 0.34, 0.3); panier(0.72, 0.12, 0.25); tas(9, 0.13, [0x6ab040, 0xc23030, 0x8a3a6a], 0.72, 0.12, 0.3, 0.28);
      tas(4, 0.2, [0xd0a020], 0.42, -0.3, 0.5, 0.1); break;
    case 'legumes':
      P('FarmCrate_Carrot', -0.62, 0, 0.05, -0.1, 1.05); tas(5, 0.26, [0x6aa040, 0x8ab850], 0.12, 0.08, 0.4, 0.3);
      for (const [x, z, d] of [[0.72, 0.14, 0.36], [0.88, -0.26, 0.28], [0.5, -0.3, 0.24]]) { const c = sph(d, 0xe07a20, x, d * 0.36, z); c.scale.y *= 0.72; A(c); A(cyl(0.02, 0.025, 0.08, 0x4a6a2a, x, d * 0.72, z, 5)); }
      tas(6, 0.11, [0xa83a2a, 0xe8e0c8], -0.1, -0.3, 0.5, 0.12); break;
    case 'pain':
      nappe(0xf0e8d4);
      for (const [x, z, r] of [[-0.85, 0.2, 0.2], [-0.5, 0.26, -0.3], [-0.72, -0.12, 0.6]]) { const o = sph(1, 0xc8903a, x, 0.085, z); o.scale.set(0.42, 0.17, 0.2); o.rotation.y = r; A(o); }
      for (const [x, z] of [[-0.1, 0.18], [0.22, 0.26], [0.06, -0.14]]) { const o = sph(0.3, 0xb87a30, x, 0.08, z); o.scale.y *= 0.55; A(o); A(box(0.2, 0.012, 0.03, 0xe8d0a0, x, 0.165, z)); }
      panier(0.72, 0.05, 0.25, 0.3); for (let i = 0; i < 6; i++) { const o = cyl(0.04, 0.045, 0.62, 0xd8a850, 0.72 + (R() - 0.5) * 0.24, 0.36, 0.05 + (R() - 0.5) * 0.24, 6); o.rotation.set((R() - 0.5) * 0.4, 0, (R() - 0.5) * 0.4); A(o); }
      tas(7, 0.11, [0xd8b060, 0xc89a48], 0.3, -0.3, 0.4, 0.1); break;
    case 'poisson':
      A(box(2.3, 0.07, 1.04, 0xdcecf4, 0, 0.035, 0));
      for (let i = 0; i < 7; i++) { const o = poisson(0.36 + R() * 0.16, [0x9ab4c8, 0x8aa2b8, 0xc8a8a0, 0x7a98b0][i % 4]); o.position.set(-0.86 + i * 0.29, 0.11, 0.14 + (i % 2) * 0.16 - 0.08); o.rotation.set(Math.PI / 2, 0, 1.1 + (R() - 0.5) * 0.5, 'YXZ'); A(o); }
      panier(0.7, -0.26, 0.22, 0.2, 0x6a5a40); tas(6, 0.1, [0xe08a70, 0xd87060], 0.7, -0.26, 0.26, 0.24);
      for (const x of [-0.75, -0.25, 0.25, 0.75]) pend(x, () => { const o = poisson(0.44, 0x8aa2b8); o.rotation.z = -Math.PI / 2; return o; }); break;
    case 'fleurs':
      for (const [x, z, n, k] of [[-0.82, 0.12, 'Flower_3_Group', 0.34], [-0.36, 0.2, 'Flower_4_Group', 0.34], [0.1, 0.1, 'Flower_3_Group', 0.3], [0.56, 0.2, 'Flower_4_Group', 0.36], [0.92, -0.12, 'Flower_3_Group', 0.3], [-0.58, -0.26, 'Flower_4_Group', 0.28], [0.3, -0.28, 'Flower_3_Group', 0.28]]) {
        A(cyl(0.11, 0.08, 0.16, 0xb8643a, x, 0.08, z, 8)); if (!P(n, x, 0.14, z, R() * 6, k)) { A(cone(0.12, 0.22, 0x4a8a3a, x, 0.27, z, 6)); A(sph(0.14, [0xe85a8a, 0xf0d040, 0xb060d0, 0xf07030][Math.floor(R() * 4)], x, 0.4, z)); }
      }
      for (const x of [-0.6, 0.6]) pend(x, () => { const o = new THREE.Group(); o.add(cyl(0.14, 0.09, 0.14, 0x8a5a3a, 0, 0, 0, 8)); o.add(sph(0.3, 0x4a8a3a, 0, 0.12, 0)); for (let i = 0; i < 5; i++) o.add(sph(0.09, [0xe85a8a, 0xf0d040, 0xffffff][i % 3], Math.cos(i * 1.3) * 0.13, 0.2, Math.sin(i * 1.3) * 0.13)); return o; }); break;
    case 'tissus': {
      const c = [0x2a5ac0, 0xc23a4a, 0xe0b030, 0x4a9a5a, 0x8a4ab0, 0xf0e8d8, 0x2a8a9a];
      [[-0.78, 0.06, 0.1], [-0.56, 0.06, 0.1], [-0.34, 0.06, 0.1], [-0.67, 0.25, 0.1], [-0.45, 0.25, 0.1], [-0.56, 0.44, 0.1]].forEach(([x, y, z], i) => { const o = cyl(0.105, 0.105, 0.78, c[i % c.length], x, y + 0.05, z, 10); o.rotation.x = Math.PI / 2; A(o); A(cyl(0.03, 0.03, 0.84, 0xd8c8a0, x, y + 0.05, z, 6)).rotation.x = Math.PI / 2; });
      [0, 1, 2, 3].forEach((i) => A(box(0.52, 0.06, 0.44, c[(i + 3) % c.length], 0.22, 0.03 + i * 0.062, 0.05 + (i % 2) * 0.03)));
      for (let i = 0; i < 5; i++) A(cyl(0.07, 0.07, 0.07, c[i], 0.66 + (i % 3) * 0.17, 0.035 + Math.floor(i / 3) * 0.07, -0.22 + (i % 2) * 0.1, 10));
      [0x2a5ac0, 0xc23a4a, 0xe0b030].forEach((k, i) => A(box(0.3, 0.62, 0.02, k, -0.5 + i * 0.5, -0.3, 0.55)));
      for (const [x, k] of [[-0.8, 0x2a5ac0], [0.0, 0xf0e8d8], [0.8, 0xc23a4a]]) pend(x, () => box(0.34, 0.5, 0.03, k, 0, 0, 0)); break; }
    case 'armes':
      nappe(0x5a2a2a);
      aPlat('Sword_Bronze', -0.82, -0.3, 0, 1.0); aPlat('Sword_Bronze', -0.52, -0.3, 0.12, 1.0); aPlat('Sword_Bronze', -0.22, -0.3, -0.1, 1.0);
      aPlat('Axe_Bronze', 0.3, 0.05, 0.4, 0.9); aPlat('Pickaxe_Bronze', 0.78, 0.1, 2.6, 0.62);
      for (const x of [-0.72, 0.72]) { const o = P('Shield_Wooden', x, -0.42, 0.56, 0, 1.15); if (o) o.rotation.x = -0.12; }
      { const o = P('Sword_Bronze', 0, -0.16, 0.57, 0, 0.95); if (o) { o.rotation.order = 'YXZ'; o.rotation.z = Math.PI; } }
      if (!hasPiece('Sword_Bronze')) for (let i = 0; i < 4; i++) { A(box(0.07, 0.02, 0.7, 0xc8ccd4, -0.8 + i * 0.3, 0.05, 0.05)); A(box(0.22, 0.03, 0.06, 0x8a6a30, -0.8 + i * 0.3, 0.05, 0.36)); }
      break;
    case 'potions': case 'maree':
      nappe(genre === 'maree' ? 0x2a6a8a : 0x4a3a6a);
      for (let i = 0; i < 9; i++) { const n = ['Potion_1', 'Potion_2', 'Potion_4'][i % 3], x = -0.9 + i * 0.16, z = 0.26 - (i % 2) * 0.13; if (!P(n, x, 0.03, z, i, 1.5)) { A(cyl(0.05, 0.07, 0.16, [0xc23a4a, 0x3a7ac0, 0x4ab04a][i % 3], x, 0.11, z, 8)); A(cyl(0.02, 0.02, 0.06, 0xd8c8a0, x, 0.22, z, 6)); } }
      A(box(1.0, 0.16, 0.34, 0x6a4a30, -0.4, 0.11, -0.26)); for (let i = 0; i < 6; i++) P(['Potion_2', 'Potion_4', 'Potion_1'][i % 3], -0.8 + i * 0.16, 0.19, -0.26, i * 2, 1.5);
      if (genre === 'maree') { A(box(0.7, 0.05, 0.5, 0xdcecf4, 0.72, 0.055, 0.1)); for (let i = 0; i < 3; i++) { const o = poisson(0.4, [0x9ab4c8, 0xc8a8a0, 0x8aa2b8][i]); o.position.set(0.56 + i * 0.16, 0.12, 0.1); o.rotation.set(Math.PI / 2, 0, 1.2, 'YXZ'); A(o); } }
      else { P('Pot_1', 0.72, 0.03, 0.14, 0, 0.75) || panier(0.72, 0.14); P('Book_Stack_1', 0.5, 0.03, -0.26, 0.3, 0.9); }
      P('Scroll_1', 0.9, 0.03, -0.3, 0.6, 1.5);
      for (const x of [-0.7, 0, 0.7]) pend(x, () => { const o = cone(0.1, 0.36, [0x5a8a3a, 0x8a6aa0, 0x7a9a4a][Math.round(x + 1)], 0, 0, 0, 6); o.rotation.x = Math.PI; return o; }); break;
    case 'bazar':
      nappe(0x7a3a5a);
      P('Chalice', -0.84, 0.03, 0.18, 0, 1.2); P('Chalice', -0.62, 0.03, 0.26, 1, 1.0); P('Coin_Pile', -0.38, 0.03, 0.22, 0, 1.6); P('Book_Stack_1', -0.06, 0.03, 0.14, 0.4, 1.0); P('Scroll_1', 0.28, 0.03, 0.26, 0.5, 1.6); P('Scroll_1', 0.3, 0.03, 0.08, -0.4, 1.6);
      P('Mug', 0.56, 0.03, 0.2, 0, 1.1); P('Vase_4', 0.86, 0.03, 0.08, 0, 0.5); P('Potion_4', -0.84, 0.03, -0.24, 0, 1.5); P('Pot_1', -0.48, 0.03, -0.26, 0, 0.6); P('Coin_Pile', 0.0, 0.03, -0.28, 1, 1.4); P('Mug', 0.36, 0.03, -0.28, 2, 1.1); P('Chalice', 0.62, 0.03, -0.26, 2, 0.9);
      if (!hasPiece('Chalice')) tas(8, 0.14, [0xe0c040, 0xc8c8d0, 0xb060c0], 0, 0, 1.6, 0.5);
      for (const x of [-0.7, 0.7]) pend(x, () => { const o = new THREE.Group(); o.add(box(0.16, 0.24, 0.16, 0xf0c060, 0, 0, 0, { emissive: 0xffa030 })); o.add(cone(0.12, 0.1, 0x3a3a42, 0, 0.17, 0, 4)); return o; }); break;
    case 'poterie':
      for (const [n, x, z, k] of [['Vase_2', -0.8, 0.08, 0.42], ['Vase_4', -0.42, 0.2, 0.55], ['Vase_2', -0.05, 0.05, 0.36], ['Pot_1', 0.34, 0.18, 0.7], ['Vase_4', 0.68, 0.06, 0.5], ['Mug', 0.94, 0.28, 1.2], ['Mug', -0.56, -0.28, 1.2], ['Pot_1', -0.16, -0.3, 0.55], ['Mug', 0.2, -0.3, 1.2], ['Chalice', 0.5, -0.3, 1.0]])
        if (!P(n, x, 0, z, R() * 6, k)) A(cyl(0.07 + k * 0.08, 0.06 + k * 0.05, 0.14 + k * 0.3, [0xb8643a, 0xc87a4a, 0x8a6a5a][Math.floor(R() * 3)], x, 0.07 + k * 0.15, z, 9));
      break;
    case 'outils':
      aPlat('Pickaxe_Bronze', -0.7, 0.05, 0.5, 0.72); aPlat('Axe_Bronze', -0.12, 0.0, -0.4, 0.95); aPlat('Pickaxe_Bronze', 0.42, 0.0, 2.9, 0.72);
      P('Bucket_Metal', 0.84, 0, 0.1, 0, 0.8) || panier(0.84, 0.1); P('Bucket_Wooden_1', 0.84, 0, -0.28, 0, 0.7);
      for (const x of [-0.6, 0.1]) { const o = cyl(0.13, 0.13, 0.06, 0x8a8a90, x, 0.03, -0.3, 12); A(o); }
      for (const x of [-0.75, 0, 0.75]) pend(x, () => { const o = new THREE.Group(); const t = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 6, 14), mat(0xb89a5a)); o.add(t); return o; }); break;
    case 'forain': {
      nappe(0x6a3a8a);
      [-0.7, 0, 0.7].forEach((x, i) => { A(box(0.3, 0.05, 0.3, 0x8a6238, x, 0.05, -0.1)); A(cyl(0.025, 0.03, 0.42, [0xc23a3a, 0xe0b030, 0x3a7ac0][i], x, 0.28, -0.1, 6)); });
      for (const [x, y, z, r] of [[-0.7, 0.1, -0.1, 0], [0.34, 0.05, 0.3, 0.2], [0.5, 0.07, 0.26, -0.2], [-0.3, 0.05, 0.32, 0]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 6, 14), mat(0xf0e0b0)); t.rotation.x = Math.PI / 2 + r; t.position.set(x, y, z); A(t); }
      for (const [x, k] of [[-0.8, 0xe85a8a], [-0.4, 0xf0d040], [0, 0x4ab0e0], [0.4, 0x6ad06a], [0.8, 0xf07030]]) pend(x, () => { const o = new THREE.Group(); o.add(sph(0.2, k, 0, 0, 0)); o.add(sph(0.1, k, -0.07, 0.13, 0)); o.add(sph(0.1, k, 0.07, 0.13, 0)); return o; }); break; }
  }
  return g;
}

export function makeChest(open = false) {
  if (decorReady()) return kitChest(open);
  const g = new THREE.Group();
  g.add(box(0.8, 0.45, 0.55, 0x7a5230, 0, 0.23, 0));
  g.add(box(0.84, 0.08, 0.59, 0x3a3a3a, 0, 0.45, 0));
  const lid = new THREE.Group(); lid.position.set(0, 0.48, -0.27);
  lid.add(box(0.8, 0.22, 0.55, 0x8a6238, 0, 0.11, 0.27)); lid.add(box(0.12, 0.14, 0.06, 0xe0c040, 0, 0.04, 0.56));
  g.add(lid); g.userData.lid = lid;
  if (open) lid.rotation.x = -1.2;
  return g;
}

export function makeStatue() {
  const g = new THREE.Group();
  const st = 0xd8d8d0;
  g.add(cyl(0.7, 0.8, 0.4, 0x9a9a94, 0, 0.2, 0, 8));
  g.add(cyl(0.28, 0.45, 1.3, st, 0, 1.05, 0, 8));
  g.add(sph(0.36, st, 0, 1.95, 0));
  for (const s of [-1, 1]) { const a = box(0.12, 0.7, 0.12, st, 0.3 * s, 1.95, 0.12); a.rotation.z = -s * 0.5; a.rotation.x = -0.6; g.add(a); }
  const sun = sph(0.42, 0xffe08a, 0, 2.55, 0.3, { emissive: 0xffd050, emissiveIntensity: 1 }); g.add(sun);
  const halo = sph(1.1, 0xffe08a, 0, 2.55, 0.3, { basic: true, opacity: 0.2 }); g.add(halo);
  g.userData.anim = (dt, m, t) => { halo.scale.setScalar(1.1 + Math.sin(t * 2) * 0.12); };
  return g;
}

// Feu animé : size = taille, light = ajoute une lumière (flammes et braises : voir paysage.js)
export function makeFire(size = 1, light = true) { return feu(size, light); }

export function makeCampfire() {
  const g = new THREE.Group();
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; g.add(sph(0.3, 0x7a7a76, Math.cos(a) * 0.55, 0.1, Math.sin(a) * 0.55)); }
  const l1 = cyl(0.07, 0.07, 0.9, 0x4a3220, 0, 0.12, 0, 5); l1.rotation.z = Math.PI / 2; g.add(l1);
  const l2 = cyl(0.07, 0.07, 0.9, 0x4a3220, 0, 0.12, 0, 5); l2.rotation.x = Math.PI / 2; g.add(l2);
  const f = makeFire(0.8, true); g.add(f);
  g.userData.anim = f.userData.anim; g.userData.fire = f;
  return g;
}

// Fumée d'incendie : n = épaisseur, spread = largeur, color = teinte (voir paysage.js)
export function makeSmoke(n = 5, spread = 1.2, color = 0x2a2a2a) {
  return fumee({ n: n * 6, couleur: color, large: spread * 1.1, haut: 13, taille: [1.6, 6.5], vent: [0.3, 0.1], vitesse: 0.09, alpha: 0.62 });
}

export function makeAnvil() { if (decorReady()) return kitAnvil(); const g = new THREE.Group(); g.add(box(0.5, 0.5, 0.5, 0x5a3e24, 0, 0.25, 0)); g.add(box(0.3, 0.2, 0.3, 0x2e2e34, 0, 0.6, 0)); g.add(box(0.75, 0.16, 0.34, 0x2e2e34, 0, 0.78, 0)); const horn = cone(0.12, 0.3, 0x2e2e34, 0.5, 0.78, 0, 6); horn.rotation.z = -Math.PI / 2; g.add(horn); return g; }

export function makeCart(broken = false) {
  if (decorReady()) return kitCart(broken);
  const g = new THREE.Group();
  g.add(box(1.6, 0.5, 2.4, 0x8a6a40, 0, 0.8, 0));
  for (const [x, z] of [[-0.9, 0.7], [0.9, 0.7], [-0.9, -0.7], [0.9, -0.7]]) { const w = cyl(0.42, 0.42, 0.1, 0x4a3220, x, 0.42, z, 10); w.rotation.z = Math.PI / 2; g.add(w); }
  g.add(sph(0.6, 0xd8c8a0, 0, 1.2, 0.4)); g.add(sph(0.5, 0xd8c8a0, 0.2, 1.15, -0.5));
  if (broken) { g.rotation.z = 0.5; g.position.y = 0.3; }
  return g;
}

export function makeBanner(color = 0x1e3f8f) { if (decorReady()) return kitBanner(color); const g = new THREE.Group(); g.add(cyl(0.04, 0.04, 3.2, 0x5a3e24, 0, 1.6, 0, 6)); g.add(box(0.7, 1.1, 0.04, color, 0.4, 2.5, 0)); return g; }

export function makeGarland(len, n = 9) {
  const g = new THREE.Group(); const cols = [0xe04a4a, 0xe0c040, 0x4a8ae0, 0x50b060, 0xe07ab0];
  for (let i = 0; i < n; i++) { const t = i / (n - 1), x = -len / 2 + len * t, y = -Math.sin(t * Math.PI) * 0.7; const f = cone(0.16, 0.34, cols[i % cols.length], x, y, 0, 4); f.rotation.x = Math.PI; g.add(f); }
  return g;
}

// Montagne lointaine et nuage (voir paysage.js)
export function makeMountain(r, h, color, snow, o) { return montagne(r, h, color, snow, o); }
export function makeCloud(s = 1) { return nuage(s); }

export function makeBramble() {
  const g = new THREE.Group();
  for (let i = 0; i < 9; i++) { const x = -3.2 + i * 0.8; g.add(sph(1.3, 0x3a4a2a, x, 0.5 + Math.random() * 0.3, (Math.random() - 0.5) * 0.6)); g.add(cone(0.08, 0.5, 0x6a3a2a, x + 0.2, 1.2, 0.2, 4)); }
  for (let i = 0; i < 6; i++) g.add(sph(0.9, 0x4a2a3a, -2.8 + i * 1.1, 1.2, (Math.random() - 0.5) * 0.5));
  return g;
}

export function makeGlowShroom(s = 1) { const g = new THREE.Group(); g.add(cyl(0.06 * s, 0.08 * s, 0.4 * s, 0xe0e8f0, 0, 0.2 * s, 0, 6)); const c = sph(0.5 * s, 0x5ac8ff, 0, 0.42 * s, 0, { emissive: 0x2a8aff, emissiveIntensity: 0.9 }); c.scale.y *= 0.6; g.add(c); return g; }

// Marqueur de cible en combat
export function makeMarker() { const m = cone(0.22, 0.45, 0xffd97a, 0, 0, 0, 4, { basic: true }); m.rotation.x = Math.PI; return m; }
export { THREE, grp, blob };
