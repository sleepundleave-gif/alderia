// ============================================================
//  LES LIEUX DES CHAPITRES 5 ET 6 : le col de Ferrecime, Brasegarde, les mines, le volcan
//  Convention : nord = -z, est = +x. 1 unité = 1 mètre.
//  Ce fichier prête aussi ses petits outils (murs, lumières, leviers, neige…) aux lieux des chapitres 7 à 10.
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { Stage } from './engine.js';
import { box, sph, cyl, cone, flat, disc, mat, makeTree, makeRock, makeStatue, makeFire, makeCrate, makeBarrel, makeAnvil, makeStall } from './models.js';
import { piece, hasPiece, taillePiece } from './decor.js';
import { bloc as B, colonne as C, dalle as G, matiere as W, room, rng, PLAN } from './world3.js';

const PI = Math.PI;

// ---------- Outils communs ----------
export const murs = (st, m, H, m2) => (ax, az, bx, bz) => {
  B(st, m, bx - ax, H, bz - az, (ax + bx) / 2, H / 2, (az + bz) / 2);
  if (m2) B(st, m2, bx - ax + 0.14, 0.35, bz - az + 0.14, (ax + bx) / 2, H + 0.17, (az + bz) / 2);
};
export const plaque = (w, d, m, x, y, z) => { const o = new THREE.Mesh(PLAN, m); o.rotation.x = -PI / 2; o.scale.set(w, d, 1); o.position.set(x, y, z); return o; };
export const lueur = (c) => new THREE.MeshBasicMaterial({ color: c });
export function lumiere(st, x, y, z, c = 0xffa860, f = 1.5, d = 18) { const l = new THREE.PointLight(c, f, d, 1.3); l.position.set(x, y, z); st.group.add(l); return l; }
export function brasero(st, x, z, light, taille = 0.55) {
  const g = new THREE.Group(); g.add(cyl(0.16, 0.28, 0.7, 0x3a3a40, 0, 0.35, 0, 8)); g.add(cyl(0.5, 0.3, 0.3, 0x4a4a52, 0, 0.82, 0, 10));
  st.prop(g, x, z, 0, 0.5); st.add(makeFire(taille, false), x, z, 0, 0.9);
  if (light) lumiere(st, x, 2.6, z);
}
export function levier(st, x, z, ry = 0) {
  const g = new THREE.Group(); g.add(box(0.55, 0.3, 0.55, 0x4a4a50, 0, 0.15, 0));
  const m = new THREE.Group(); m.position.y = 0.3; m.add(box(0.1, 1.0, 0.1, 0x8a6a40, 0, 0.5, 0)); m.add(sph(0.24, 0xc22b2b, 0, 1.0, 0)); m.rotation.z = -0.6; g.add(m);
  g.userData.manche = m; st.add(g, x, z, ry); st.circle(x, z, 0.4); return g;
}
// Une fonction appelée à chaque image tant que le lieu est affiché
export function tic(st, fn) { const o = new THREE.Group(); o.userData.anim = fn; st.add(o, 0, 0); return o; }
// Flocons, cendres ou braises qui tombent (ou montent) dans une boîte
export function particules(st, [x1, x2, z1, z2], n, color, o = {}) {
  const h = o.h || 12, v = o.v || 1.6, pos = new Float32Array(n * 3), R = rng(o.graine || 7);
  for (let i = 0; i < n; i++) { pos[i * 3] = x1 + R() * (x2 - x1); pos[i * 3 + 1] = R() * h; pos[i * 3 + 2] = z1 + R() * (z2 - z1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color, size: o.size || 0.12, transparent: true, opacity: o.opacity || 0.85, depthWrite: false }));
  p.frustumCulled = false;
  p.userData.anim = (dt) => { const a = g.attributes.position; for (let i = 0; i < n; i++) { let y = a.getY(i) - v * dt; if (y < 0) y += h; else if (y > h) y -= h; a.setY(i, y); if (o.vent) a.setX(i, a.getX(i) + Math.sin(y * 2 + i) * dt * o.vent); } a.needsUpdate = true; };
  st.add(p, 0, 0); return p;
}
// Grille de barreaux (porte, cage)
export function grille(w, h, c = 0x3a3a42) {
  const g = new THREE.Group();
  for (let x = -w / 2; x <= w / 2 + 0.01; x += 0.32) g.add(box(0.07, h, 0.07, c, x, h / 2, 0));
  g.add(box(w + 0.1, 0.1, 0.1, c, 0, h - 0.05, 0)); g.add(box(w + 0.1, 0.1, 0.1, c, 0, 0.25, 0));
  return g;
}
export function cage(st, x, z) {
  const g = new THREE.Group();
  for (const [dx, dz, r] of [[0, 1, 0], [0, -1, 0], [1, 0, PI / 2], [-1, 0, PI / 2]]) { const b = grille(2, 2.3); b.position.set(dx, 0, dz); b.rotation.y = r; g.add(b); }
  g.add(box(2.1, 0.08, 2.1, 0x3a3a42, 0, 2.34, 0));
  st.add(g, x, z); const col = st.circle(x, z, 1.35); return { obj: g, col };
}

// ============================================================
//  LE COL DE FERRECIME (chapitre 5)
// ============================================================
export function buildCol() {
  const R = rng(505);
  const st = new Stage({ name: 'col', bounds: [-13, 13, -93, 12], sky: 0xbccede, fog: [0xdfe8f0, 26, 140], hemi: [0xffffff, 0xb0c0d0, 1.2], sun: [0xf4f8ff, 0.9, [20, 50, 30]], music: 'forest', pitch: 0.7 });
  const S = st.spots = {};
  st.deco(flat(400, 400, 0xeef2f6, 0, 0, 0));
  st.deco(flat(4.2, 112, 0xd4dde8, 0, 0.03, -42));
  for (let i = 0; i < 46; i++) st.deco(disc(1.2 + R() * 2.6, R() < 0.5 ? 0xe2e8f0 : 0xf8fafc, -12 + R() * 24, 0.035, -92 + R() * 104));
  // parois du col : gros blocs gelés
  for (let z = 14; z > -98; z -= 4) for (const c of [-1, 1]) {
    const x = c * (15 + R() * 2), s = 3.6 + R() * 2.2; st.deco(makeRock(s, 0xaab4c0), x, z + R() * 2, R() * 6);
    if (R() < 0.7) st.deco(makeRock(s * 0.9, 0xc4ccd6), x + c * 4, z + 2, R() * 6, 2.5 + R() * 2);
  }
  st.wall(-40, -100, -13.4, 16); st.wall(13.4, -100, 40, 16); st.wall(-14, 12.6, 14, 16);
  // trois murs de glace : la piste se resserre, la glace la ferme
  S.glaces = [-22, -46, -68].map((z, i) => {
    for (const c of [-1, 1]) { st.deco(makeRock(4.6, 0x9aa6b4), c * 8.6, z, i + c); st.deco(makeRock(3.6, 0xb4bec8), c * 11.6, z + 1.2, i * 2 + c); st.wall(c * 4.3, z - 1.6, c * 14, z + 1.6); }
    const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0xa8e0ff, transparent: true, opacity: 0.78, roughness: 0.08, metalness: 0.1, emissive: 0x2a6a9a, emissiveIntensity: 0.25 });
    const bl = new THREE.Mesh(new THREE.BoxGeometry(8.6, 4.4, 1.5), m); bl.position.y = 2.2; g.add(bl);
    for (let k = 0; k < 9; k++) { const p = new THREE.Mesh(new THREE.ConeGeometry(0.5 + R() * 0.4, 1.6 + R() * 1.8, 5), m); p.position.set(-3.8 + k * 0.95, 4.4 + R() * 0.5, R() * 0.6 - 0.3); g.add(p); }
    st.add(g, 0, z);
    return { obj: g, z, mur: st.wall(-4.3, z - 0.8, 4.3, z + 0.8) };
  });
  // sapins sous la neige, rochers
  for (let i = 0; i < 34; i++) {
    const x = -12 + R() * 24, z = -84 + R() * 94; if (Math.abs(x) < 3.2 || S.glaces.some(g => Math.abs(g.z - z) < 4)) continue;
    if (R() < 0.6) st.prop(makeTree('big', 0.7 + R() * 0.4, 0xd8e6ee), x, z, R() * 6, 0.7); else st.prop(makeRock(0.8 + R() * 1.2, 0xb8c2cc), x, z, R() * 6, 1.1);
  }
  // départ
  st.prop(makeStatue(), -3.6, 7.4, PI / 5, 0.7); S.statue = { x: -3.6, z: 7.4 };
  const borne = new THREE.Group(); borne.add(box(0.5, 1.3, 0.3, 0x8a8478, 0, 0.65, 0)); borne.add(box(0.8, 0.5, 0.06, 0x6a4a30, 0, 1.1, 0.19)); st.prop(borne, 2.8, 8, -0.3, 0.4); S.borne = { x: 2.8, z: 8 };
  S.mobs = [
    { id: 'c5a', x: 2, z: -10, enemies: ['loup_neige', 'loup_neige'] }, { id: 'c5b', x: -2, z: -34, enemies: ['loup_neige', 'loup_neige', 'loup_neige'] },
    { id: 'c5c', x: 2, z: -57, enemies: ['loup_neige', 'loup_neige', 'loup_neige'] }, { id: 'c5d', x: -6, z: -76, enemies: ['loup_neige', 'loup_neige'], roam: 2 },
  ];
  S.coffres = [{ x: 9.4, z: -31 }, { x: -9.6, z: -58 }];
  // la falaise du fond et les portes de bronze
  const roc = W('mur_blanc', 0x8a909c, 7, 0x7a808a, 1.0), pierre = W('mur_blanc', 0xc8c0b0, 3, 0x9a9488, 1.2), bronze = new THREE.MeshStandardMaterial({ color: 0xb8773a, roughness: 0.42, metalness: 0.75 });
  B(st, roc, 70, 40, 8, 0, 20, -101); B(st, roc, 16, 44, 10, -19, 22, -99); B(st, roc, 16, 46, 10, 19, 23, -99);
  for (const c of [-1, 1]) { B(st, pierre, 2.4, 19, 2.4, c * 6.2, 9.5, -96.4); B(st, pierre, 3, 0.8, 3, c * 6.2, 0.4, -96.4); st.wall(c * 5, -98, c * 7.6, -95); }
  B(st, pierre, 15, 2.2, 2.6, 0, 19.6, -96.4);
  S.portes = [-1, 1].map((c) => {
    const p = new THREE.Group(), f = new THREE.Mesh(new THREE.BoxGeometry(5, 18, 0.5), bronze); f.position.set(-c * 2.5, 9, 0); p.add(f);
    for (let y = 2; y < 18; y += 4) { const r = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.3, 0.6), mat(0x6a4a2a)); r.position.set(-c * 2.5, y, 0); p.add(r); }
    const a = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.09, 8, 16), mat(0x3a2a1a)); a.position.set(-c * 0.9, 1.6, 0.32); p.add(a);
    st.add(p, c * 5, -96.6); return p;
  });
  S.porteMur = st.wall(-5, -97.4, 5, -95.8);
  // la forge des veilleurs, devant les portes
  S.forge = { x: -7.6, z: -88 };
  st.prop(makeAnvil(), -7.6, -88, PI / 2, 0.55);
  const four = new THREE.Group(); four.add(box(2.2, 1.6, 1.8, 0x5a5450, 0, 0.8, 0)); four.add(box(1.2, 0.7, 0.2, 0x1a1210, 0, 0.7, 0.86)); four.add(cyl(0.3, 0.4, 2.0, 0x4a4440, 0.5, 2.5, -0.3, 8));
  st.prop(four, -10.4, -89.5, PI / 2, 1.3); st.add(makeFire(0.6, false), -9.6, -89.5, 0, 0.5); lumiere(st, -8.6, 2.2, -88.6, 0xff9a50, 1.4, 14);
  const bac = new THREE.Group(); bac.add(box(1.4, 0.6, 0.8, 0x6a4a30, 0, 0.3, 0)); bac.add(plaque(1.2, 0.6, lueur(0x4a8ac0), 0, 0.62, 0)); st.prop(bac, -7.4, -90.6, 0, 0.7);
  for (const c of [-1, 1]) brasero(st, c * 4, -92.6, c > 0);
  S.garde = { x: 2.2, z: -92.2 }; S.garde2 = { x: -2.2, z: -92.2 }; S.durgana = { x: 0, z: -92.6 };
  particules(st, [-16, 16, -98, 14], 1400, 0xffffff, { h: 13, v: 2.2, vent: 0.5, size: 0.14 });
  st.bake();
  return st;
}

// ============================================================
//  BRASEGARDE, LA CITÉ NAINE (chapitres 5 et 6)
// ============================================================
export function buildBrasegarde(o = {}) {
  const R = rng(515), H = 8;
  const st = new Stage({ name: 'brasegarde', bounds: [-25, 25, -44, 13], sky: 0x140a08, fog: [0x2c1610, 34, 130], hemi: [0xffd4a8, 0x6a3a26, 1.3], sun: [0xffb878, 0.65, [10, 40, 20]], music: 'cite', pitch: 0.72 });
  const S = st.spots = {};
  const roc = W('mur_egout', 0xc8a890, 4, 0x5a4a40, 1.3), rocS = W('mur_egout', 0x8a7060, 4, 0x4a3a32, 1.1), sol = W('paves', 0x9a8a80, 3.4, 0x5a4e48), pierre = W('mur_blanc', 0xc8b098, 3, 0x8a7868, 1.15);
  const lave = lueur(0xff6a1a), fen = lueur(0xffc060), noir = mat(0x120c0a);
  G(st, sol, 70, 70, 0, 0, -15);
  room(st, -25, -44, 25, 13, { s: [[-3, 3]] }, murs(st, roc, H, rocS));
  // la rivière de lave et son pont
  st.add(plaque(50, 5, lave, 0, 0.03, -11.5));
  for (let i = 0; i < 16; i++) st.deco(disc(0.4 + R() * 0.7, 0x5a2a16, -24 + R() * 48, 0.045, -13.4 + R() * 3.8));
  for (const c of [-1, 1]) { st.wall(c * 3, -14.2, c * 25, -8.8); B(st, rocS, 22, 0.5, 0.5, c * 14, 0.25, -8.9); B(st, rocS, 22, 0.5, 0.5, c * 14, 0.25, -14.1); lumiere(st, c * 13, 2.2, -11.5, 0xff6a2a, 1.7, 22); }
  B(st, pierre, 6, 0.5, 6.4, 0, 0.12, -11.5); for (const c of [-1, 1]) { B(st, pierre, 0.5, 1.0, 6.4, c * 3, 0.6, -11.5); for (const z of [-14.6, -8.4]) C(st, pierre, 0.4, 1.6, c * 3, 0.8, z); }
  // maisons taillées dans la roche (sud)
  const maison = (x, z, w, d, ry = 0) => {
    B(st, pierre, w, 4.2, d, x, 2.1, z); B(st, rocS, w + 0.5, 0.5, d + 0.5, x, 4.4, z); st.wall(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
    const fx = Math.sin(ry), fz = Math.cos(ry), px = x + fx * (ry ? w / 2 : 0), pz = z + fz * d / 2;
    if (ry) { B(st, noir, 0.14, 2.3, 1.3, px, 1.15, z); B(st, fen, 0.14, 0.8, 0.8, px, 2.5, z - d / 3.2); B(st, fen, 0.14, 0.8, 0.8, px, 2.5, z + d / 3.2); }
    else { B(st, noir, 1.3, 2.3, 0.14, x, 1.15, pz); B(st, fen, 0.8, 0.8, 0.14, x - w / 3.2, 2.5, pz); B(st, fen, 0.8, 0.8, 0.14, x + w / 3.2, 2.5, pz); }
    S.maisons.push({ type: 'maison', id: 'bras' + S.maisons.length, porte: ry ? { x: px, z, nx: fx, nz: 0 } : { x, z: pz, nx: 0, nz: 1 } });       // on peut y entrer (voir interieurs.js)
  };
  S.maisons = [];
  maison(-19, 8, 9, 6, 0); maison(19, 8, 9, 6, 0); maison(-21, -2, 6, 6, PI / 2); maison(21, -2, 6, 6, -PI / 2); maison(-10, 10, 5, 4, 0); maison(10, 10, 5, 4, 0);
  // forge (ouest) et comptoir (est)
  st.prop(makeAnvil(), -15, -2.6, 0, 0.55); S.forge = { x: -15, z: -2.6 }; S.forgeron = { x: -16.4, z: -1.2 };
  if (hasPiece('WeaponStand')) {
    const Q = (n, x, y, z, ry = 0, sc = 1) => { const o = piece(n, x, y, z, ry, sc); st.staticGroup.add(o); return o; };
    Q('WeaponStand', -13.2, 0, -5.4, 0, 1.1); st.circle(-13.2, -5.4, 0.8); Q('WeaponStand', -11.5, 0, -5.4, 0, 1.1); st.circle(-11.5, -5.4, 0.8);
    Q('Whetstone', -13.4, 0, -0.6, 0.6); st.circle(-13.4, -0.6, 0.6); Q('Bucket_Metal', -15.9, 0, -3.3, 0, 1.1); Q('Dummy', -10.2, 0, -5.0, 0.3); st.circle(-10.2, -5.0, 0.4);
    // l'établi de vente : lames, hache, bouclier, lingots
    Q('Workbench', -12.4, 0, -2.4, 0, 1.15); st.wall(-13.6, -3.0, -11.2, -1.8);
    for (const [x, r] of [[-13.2, 0.1], [-12.85, -0.08], [-12.5, 0.05]]) { const e = Q('Sword_Bronze', x, 1.07, -2.7, 0, 1.0); e.rotation.order = 'YXZ'; e.rotation.x = -PI / 2; e.rotation.y = r; }
    { const b = Q('Shield_Wooden', -11.75, 1.05, -2.35, 0, 1.2); b.rotation.x = -PI / 2; const h = Q('Axe_Bronze', -12.0, 1.07, -2.75, 0, 1.0); h.rotation.order = 'YXZ'; h.rotation.x = -PI / 2; h.rotation.y = 0.5; }
    for (let i = 0; i < 5; i++) st.staticGroup.add(box(0.34, 0.1, 0.14, i % 2 ? 0x8a8a94 : 0xb87a4a, -14.3 + (i % 3) * 0.16, 0.05 + Math.floor(i / 3) * 0.1, -0.5 + (i % 3) * 0.2));
  }
  const four = new THREE.Group(); four.add(box(2.4, 1.8, 1.6, 0x4a4440, 0, 0.9, 0)); four.add(box(1.3, 0.8, 0.2, 0x1a1210, 0, 0.75, 0.76)); st.prop(four, -16.6, -5.2, 0, 1.3); st.add(makeFire(0.7, false), -16.6, -4.3, 0, 0.5); lumiere(st, -15.4, 2.4, -3.4, 0xff9a50, 1.5, 15);
  if (hasPiece('Stall_Empty')) {
    st.prop(makeStall(0x8a3a2a, 'potions'), 15.4, -2.6, 0, 0);
    for (const [n, x, z, sc] of [['Barrel', 17.3, -2.7, 1], ['Crate_Wooden', 13.5, -2.6, 0.8], ['Bag', 13.5, -3.5, 1], ['Cauldron', 17.4, -4.2, 0.9]]) { st.staticGroup.add(piece(n, x, 0, z, 0.3, sc)); st.circle(x, z, 0.5); }
    for (const [n, x, sc] of [['Potion_2', 13.4, 1.6], ['Potion_4', 13.65, 1.6]]) st.staticGroup.add(piece(n, x, 0.8 * taillePiece('Crate_Wooden').h, -2.6, 0, sc));
  } else {
    const etal = new THREE.Group(); etal.add(box(3.2, 0.9, 1.1, 0x6a4a30, 0, 0.45, 0)); for (let i = 0; i < 5; i++) etal.add(sph(0.3, [0xc22b2b, 0x4a8ad8, 0x4ab04a, 0xe8c040, 0xb060c0][i], -1.2 + i * 0.6, 1.05, 0));
    st.prop(etal, 15.4, -2.6, 0, 0);
  } st.wall(13.8, -3.2, 17, -2); S.marchande = { x: 15.4, z: -4.2 }; lumiere(st, 15.4, 2.6, -2, 0xffc890, 1.2, 13);
  st.prop(makeStatue(), -5.4, 5.6, PI / 6, 0.8); S.statue = { x: -5.4, z: 5.6 };
  for (const [x, z] of [[6, 4], [7.2, 4.6], [-8, -3.6], [9, -5.6]]) st.prop(R() < 0.5 ? makeBarrel() : makeCrate(), x, z, R() * 6, 0.5);
  // la salle de Durgana (nord) : colonnes, estrade, trône
  for (const z of [-20, -28, -36]) for (const c of [-1, 1]) { C(st, pierre, 1.0, H, c * 8, H / 2, z); C(st, rocS, 1.3, 0.5, c * 8, 0.25, z); st.circle(c * 8, z, 1.15); if (z !== -28) brasero(st, c * 5.4, z, z === -20); }
  B(st, pierre, 11, 0.4, 5.6, 0, 0.2, -40.6); B(st, pierre, 2.2, 3.2, 1.2, 0, 1.8, -42.4); B(st, rocS, 2.8, 0.6, 1.4, 0, 3.6, -42.4); st.wall(-5.5, -43.4, 5.5, -38.2);
  B(st, lueur(0xc22b2b), 1.6, 5, 0.1, 0, 5.6, -43.3); lumiere(st, 0, 4, -37, 0xffb070, 1.3, 18);
  S.durgana = { x: 0, z: -37 }; S.gardes = [{ x: -3.4, z: -37.2 }, { x: 3.4, z: -37.2 }];
  // portes des mines (ouest) et du volcan (est)
  B(st, noir, 0.3, 5, 5, -24.8, 2.5, -27); B(st, pierre, 0.6, 0.6, 6, -24.7, 5.3, -27); for (const z of [-30, -24]) B(st, pierre, 0.6, 5, 0.6, -24.7, 2.5, z);
  for (const x of [-24.4, -23.4, -22.4, -21.4]) B(st, mat(0x4a3a2a), 0.2, 0.08, 1.6, x, 0.05, -27); for (const z of [-27.6, -26.4]) B(st, mat(0x6a6a70), 4, 0.1, 0.1, -22.8, 0.1, z);
  B(st, lueur(0xff4a1a), 0.3, 5, 5, 24.8, 2.5, -27); B(st, pierre, 0.6, 0.6, 6, 24.7, 5.3, -27); for (const z of [-30, -24]) B(st, pierre, 0.6, 5, 0.6, 24.7, 2.5, z); lumiere(st, 22, 2.6, -27, 0xff5a20, 1.6, 16);
  S.mines = { x: -23.2, z: -27 }; S.volcan = { x: 23.2, z: -27 };
  S.nains = [{ x: -8.4, z: 4.4, ry: 0.6, k: 'nain' }, { x: 8, z: 2, ry: -1, k: 'naine' }, { x: 3.4, z: -4.6, ry: PI, k: 'nain2' }, { x: -4, z: -18, ry: 0.4, k: 'naine' }, { x: 11, z: -30, ry: -PI / 2, k: 'nain' }];
  // le banquet (fin du chapitre 6)
  if (o.banquet) {
    for (const x of [-3.2, 3.2]) { B(st, mat(0x6a4a30), 2.2, 0.9, 10, x, 0.45, -27); st.wall(x - 1.1, -32, x + 1.1, -22); for (let i = 0; i < 6; i++) { st.deco(sph(0.34, [0xc8702a, 0xe8c040, 0xa83a2a][i % 3], x + (i % 2 ? 0.4 : -0.4), 1.05, -31 + i * 1.6)); st.deco(cyl(0.1, 0.1, 0.3, 0xc8c8d0, x + (i % 2 ? -0.5 : 0.5), 1.05, -30.4 + i * 1.6, 8)); } }
    S.convives = [{ x: -5, z: -30, ry: PI / 2, k: 'nain' }, { x: -5, z: -26, ry: PI / 2, k: 'naine' }, { x: -5, z: -23, ry: PI / 2, k: 'nain2' }, { x: 5, z: -30, ry: -PI / 2, k: 'naine' }, { x: 5, z: -26, ry: -PI / 2, k: 'nain' }, { x: 5, z: -23, ry: -PI / 2, k: 'garde_nain' }];
  }
  particules(st, [-25, 25, -15, -8], 120, 0xffa040, { h: 5, v: -0.8, size: 0.1, opacity: 0.9 });
  st.bake();
  return st;
}

// ============================================================
//  LES MINES DE FERRECIME (chapitre 5)
// ============================================================
export function buildMines() {
  const R = rng(525), H = 4.2;
  const st = new Stage({ name: 'mines', bounds: [-23, 23, -92, 8], sky: 0x0a0806, fog: [0x160f0a, 22, 90], hemi: [0xffdcb8, 0x5a4430, 1.3], sun: [0xffc890, 0.5, [10, 40, 20]], music: 'egouts', pitch: 0.7 });
  const S = st.spots = {};
  const roc = W('mur_egout', 0xb89878, 3.4, 0x5a4a3a, 1.35), rocS = W('mur_egout', 0x7a6450, 3.4, 0x4a3c30, 1.1), sol = W('paves', 0x8a7a6a, 3.2, 0x54483c), bois = mat(0x6a4a2a), fer = mat(0x5a5a62);
  G(st, sol, 60, 110, 0, 0, -42);
  const wall = murs(st, roc, H, rocS);
  room(st, -6, -14, 6, 8, { n: [[-2, 2]] }, wall);                                // hall d'entrée, le chariot
  room(st, -3, -30, 3, -14, { s: [[-2, 2]], n: [[-2, 2]] }, wall);                // couloir (grille)
  room(st, -22, -42, -10, -14, {}, wall);                                         // galerie ouest (par le chariot)
  room(st, 10, -42, 22, -14, {}, wall);                                           // galerie est (par le chariot)
  room(st, -9.4, -56, 9.4, -30, { s: [[-2, 2]], n: [[-3, 3]] }, wall);            // le chantier
  room(st, -14, -91, 14, -56, { s: [[-3, 3]] }, wall);                            // la chambre de la Taraude
  // étais de bois, lanternes
  const etai = (x, z, w = 4, ry = 0) => { const g = new THREE.Group(); for (const c of [-1, 1]) g.add(box(0.3, H - 0.3, 0.3, 0x6a4a2a, c * w / 2, (H - 0.3) / 2, 0)); g.add(box(w + 0.6, 0.3, 0.34, 0x6a4a2a, 0, H - 0.3, 0)); st.deco(g, x, z, ry); };
  for (const z of [-17, -22, -27]) etai(0, z, 5.2); etai(0, -14, 4.4); etai(0, -30, 4.4); etai(0, -56, 6.4);
  const lant = (x, z, on = true) => { st.deco(box(0.3, 0.4, 0.3, 0x3a3a40, x, 2.6, z)); st.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), lueur(0xffc060)), x, z, 0, 2.6); if (on) lumiere(st, x, 2.8, z, 0xffb060, 1.5, 17); };
  lant(-5.6, 0); lant(5.6, -8, false); lant(-2.7, -22); lant(-21.6, -28); lant(-10.4, -20, false); lant(21.6, -28); lant(10.4, -20, false); lant(-9, -43); lant(9, -43, false); lant(-13.6, -66); lant(13.6, -80); lant(13.6, -62, false);
  // rails : du hall vers les deux galeries
  const rails = (x1, z1, x2, z2) => { const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz), a = Math.atan2(dx, dz), g = new THREE.Group(); for (const c of [-0.4, 0.4]) g.add(box(0.08, 0.1, L, 0x7a7a82, c, 0.1, 0)); for (let k = -L / 2 + 0.3; k < L / 2; k += 0.8) g.add(box(1.3, 0.07, 0.2, 0x5a3e24, 0, 0.04, k)); st.deco(g, (x1 + x2) / 2, (z1 + z2) / 2, a); };
  rails(0, 6, 0, -12); rails(-16, -16, -16, -24); rails(16, -16, 16, -24);
  const chariot = () => { const g = new THREE.Group(); g.add(box(1.3, 0.12, 2.0, 0x5a3e24, 0, 0.45, 0)); for (const c of [-1, 1]) { g.add(box(0.1, 0.8, 2.0, 0x6a4a2a, c * 0.65, 0.85, 0)); g.add(box(1.3, 0.8, 0.1, 0x6a4a2a, 0, 0.85, c * 1.0)); for (const z of [-0.6, 0.6]) { const r = cyl(0.22, 0.22, 0.1, 0x3a3a40, c * 0.55, 0.22, z, 10); r.rotation.z = PI / 2; g.add(r); } } return g; };
  S.chariot = st.add(chariot(), 0, -8.4); S.chariotCol = st.circle(0, -8.4, 1.1);
  st.prop(chariot(), -16, -17.4, 0, 1.1); st.prop(chariot(), 16, -17.4, 0, 1.1);
  S.arrivee = { ouest: { x: -16, z: -20.5 }, est: { x: 16, z: -20.5 }, hall: { x: 0, z: -5.4 } };
  // aiguillage : un panneau
  const pan = new THREE.Group(); pan.add(box(0.12, 1.5, 0.12, 0x5a3e24, 0, 0.75, 0)); pan.add(box(1.3, 0.34, 0.06, 0x8a6a40, -0.4, 1.4, 0)); pan.add(box(1.3, 0.34, 0.06, 0x8a6a40, 0.4, 1.0, 0)); st.prop(pan, 2.2, -10.4, 0, 0.3); S.panneau = { x: 2.2, z: -10.4 };
  // la grille du couloir, commandée par le levier de la galerie est
  S.grille = st.add(grille(4.2, 3.4), 0, -14.2); S.grilleMur = st.wall(-2.2, -14.6, 2.2, -13.8);
  S.levier = levier(st, 19.5, -39, 0); S.levierPos = { x: 19.5, z: -39 };
  // tas de minerai, caisses, pioches
  const tas = (x, z, s = 1) => { const g = new THREE.Group(); for (let i = 0; i < 6; i++) g.add(sph(0.5 * s + R() * 0.3, i % 3 ? 0x5a5048 : 0x8a6a4a, (R() - 0.5) * s, 0.2 + R() * 0.3 * s, (R() - 0.5) * s)); st.prop(g, x, z, R() * 6, 0.8 * s); };
  tas(-20, -18); tas(-11.6, -30); tas(20.4, -19); tas(12, -40); tas(-7.6, -33, 1.2); tas(7.4, -36); tas(-12, -60, 1.4); tas(12, -86, 1.5);
  for (const [x, z] of [[-4.6, 5.4], [4.4, 6], [-20.4, -40], [20, -32], [7.8, -53], [-8, -41]]) st.prop(R() < 0.5 ? makeBarrel() : makeCrate(), x, z, R() * 6, 0.5);
  st.prop(makeStatue(), 4.2, 2.4, -PI / 4, 0.7); S.statue = { x: 4.2, z: 2.4 };
  // prisonniers : trois cages
  S.cages = [{ x: -19, z: -37.5, id: 1 }, { x: 12.6, z: -37.5, id: 2 }, { x: -6.6, z: -50, id: 3 }].map((c) => Object.assign(c, cage(st, c.x, c.z)));
  S.coffres = [{ x: -12, z: -40.4 }, { x: 7.6, z: -32 }];
  S.mobs = [
    { id: 'm5a', x: -16, z: -30, enemies: ['mineur', 'mineur'] }, { id: 'm5b', x: 16, z: -30, enemies: ['mineur', 'automate'] },
    { id: 'm5c', x: 0, z: -40, enemies: ['automate', 'mineur', 'mineur'] }, { id: 'm5d', x: 2, z: -50, enemies: ['automate', 'automate'], roam: 2 },
  ];
  // la chambre : le tunnel foré au nord, la machine
  B(st, mat(0x060404), 9, 4.1, 0.3, 0, 2.05, -90.8); for (const c of [-1, 1]) etai(c * 4.6, -90.2, 0.1); etai(0, -90.2, 9.4);
  S.taraude = { x: 0, z: -78 }; S.seuil = -59;
  lumiere(st, 0, 3.4, -74, 0xff8a40, 1.6, 26);
  st.bake();
  return st;
}

// ============================================================
//  LE VOLCAN DE FERRECIME ET LE SANCTUAIRE DU FEU (chapitre 6)
//  « fuite » : la salle s'effondre, des blocs encombrent le chemin, les ponts de basalte sont déjà là.
// ============================================================
export function buildVolcan(fuite = false) {
  const R = rng(606), H = 7;
  const st = new Stage({ name: fuite ? 'fuite' : 'volcan', bounds: [-9, 9, -109, 8], sky: 0x200806, fog: [fuite ? 0x5a1a0a : 0x3a120a, fuite ? 18 : 26, fuite ? 80 : 120], hemi: [0xffb888, 0x6a2010, fuite ? 1.5 : 1.35], sun: [0xff9a60, 0.7, [10, 40, 20]], music: fuite ? 'danger' : 'egouts', pitch: fuite ? 1 : 0.6 });
  const S = st.spots = {};
  const sol = W('paves', 0x6a5a58, 3.4, 0x4a3c3a), roc = W('mur_egout', 0x9a6a58, 4, 0x4a302a, 1.2), basalte = mat(0x2a2628), lave = lueur(0xff6a1a), lave2 = lueur(0xffb030);
  G(st, sol, 19, 124, 0, 0, -50);
  // des lacs de lave de part et d'autre de la corniche
  st.add(plaque(40, 130, lave, -29.5, -0.6, -50)); st.add(plaque(40, 130, lave, 29.5, -0.6, -50));
  for (let z = 8; z > -84; z -= 3.4) for (const c of [-1, 1]) { st.deco(makeRock(1.4 + R() * 1.2, R() < 0.5 ? 0x4a3a38 : 0x5a4440), c * (9.6 + R() * 0.8), z + R(), R() * 6); }
  st.wall(-30, -112, -9.3, 12); st.wall(9.3, -112, 30, 12); st.wall(-10, 8.4, 10, 12);
  for (let i = 0; i < 9; i++) { const c = i % 2 ? 1 : -1; B(st, roc, 5 + R() * 4, 16 + R() * 14, 5 + R() * 4, c * (24 + R() * 10), 6, 4 - i * 13); }
  B(st, roc, 80, 30, 6, 0, 15, 27); G(st, sol, 19, 14, 0, 0, 18);
  // l'entrée (au sud) : la porte de Brasegarde
  st.add(plaque(5, 3, new THREE.MeshBasicMaterial({ color: 0x120c0a }), 0, 0.03, 9.6)); for (const c of [-1, 1]) B(st, roc, 0.8, 1.4, 0.8, c * 2.9, 0.7, 8.6);
  // trois coulées de lave en travers ; un pont de basalte quand Lyra les fige
  S.coulees = [[-22, 0], [-47, -4.5], [-72, 4.5]].map(([z, x]) => {
    st.add(plaque(19, 4.2, lave2, 0, 0.04, z));
    const pont = new THREE.Group(); pont.add(box(4.2, 0.4, 4.8, 0x2a2628, 0, 0.14, 0)); for (let k = 0; k < 5; k++) pont.add(sph(0.9 + R() * 0.6, 0x3a3436, -1.6 + k * 0.8, 0.1, (R() - 0.5) * 3.6));
    pont.visible = fuite; st.add(pont, x, z);
    const murG = st.wall(-9.4, z - 2.1, x - 2.1, z + 2.1), murD = st.wall(x + 2.1, z - 2.1, 9.4, z + 2.1), mur = st.wall(x - 2.1, z - 2.1, x + 2.1, z + 2.1); mur.off = fuite;
    lumiere(st, 0, 2.4, z, 0xff7a2a, 1.3, 15);
    return { z, x, pont, mur };
  });
  // piliers, alcôve fraîche et statue
  for (const [x, z] of [[-6, -8], [6, -14], [-6.4, -33], [6.2, -58], [-6, -62], [6.4, -79]]) { C(st, roc, 1.0, H, x, H / 2, z); st.circle(x, z, 1.1); }
  st.prop(makeStatue(), 6.6, -36, -PI / 3, 0.8); S.statue = { x: 6.6, z: -36 }; st.deco(disc(3, 0x6a8a9a, 6.2, 0.05, -36)); lumiere(st, 6, 2.6, -36, 0x8ad0ff, 1.2, 10);
  S.mobs = [
    { id: 'v6a', x: 2, z: -10, enemies: ['diablotin_lave', 'chauve_ardente'] }, { id: 'v6b', x: -3, z: -34, enemies: ['tortue', 'diablotin_lave'] },
    { id: 'v6c', x: 3, z: -40, enemies: ['chauve_ardente', 'chauve_ardente', 'diablotin_lave'] }, { id: 'v6d', x: -2, z: -60, enemies: ['tortue', 'tortue'] },
    { id: 'v6e', x: 2, z: -80, enemies: ['diablotin_lave', 'tortue', 'chauve_ardente'], roam: 2 },
  ];
  S.coffres = [{ x: -7.4, z: -40 }, { x: 7.6, z: -64 }];
  // le sanctuaire du Feu : une rotonde, l'autel, les braseros
  const marbre = W('marbre', 0xc88a6a, 3, 0x8a5a48, 1.6);
  st.deco(disc(9.2, 0x7a4a40, 0, 0.05, -97)); st.deco(disc(4.4, 0x9a5a40, 0, 0.06, -97));
  for (let i = 0; i < 10; i++) { const a = PI + (i + 0.5) * PI / 10, x = Math.cos(a) * 8.6, z = -97 + Math.sin(a) * 10.5; C(st, marbre, 0.7, H + 2, x, (H + 2) / 2, z); st.circle(x, z, 0.8); }
  B(st, roc, 40, 30, 5, 0, 15, -112);
  B(st, marbre, 3.4, 0.5, 2.2, 0, 0.25, -105.4); B(st, marbre, 2.2, 1.1, 1.3, 0, 1.0, -105.4); st.wall(-1.7, -106.6, 1.7, -104.3);
  S.autel = { x: 0, z: -105.4 }; S.ignis = { x: 0, z: -99 }; S.seuil = -87;
  S.eclatObj = (() => { const g = new THREE.Group(); const e = new THREE.Mesh(new THREE.OctahedronGeometry(0.34), lueur(0xff7a2a)); g.add(e); const h = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.22, depthWrite: false })); g.add(h); g.userData.anim = (dt, m, t) => { e.rotation.y = t * 1.4; g.position.y = 2.2 + Math.sin(t * 2) * 0.12; }; return g; })();
  if (!fuite) st.add(S.eclatObj, 0, -105.4, 0, 2.2);
  for (const c of [-1, 1]) { brasero(st, c * 3.4, -103.6, c > 0, 0.8); brasero(st, c * 6.4, -92, false, 0.7); }
  lumiere(st, 0, 4, -98, 0xff8a40, 1.8, 26);
  S.breche = { x: -8.6, z: -96 };                       // le mur que Grom fait sauter
  particules(st, [-12, 12, -110, 8], fuite ? 700 : 320, 0xffa040, { h: 9, v: fuite ? 3.5 : -0.9, size: fuite ? 0.16 : 0.1, opacity: 0.9 });
  if (fuite) {
    S.blocs = [];
    for (let z = -78; z < 0; z += 5.2) { const x = (R() - 0.5) * 12, s = 1.3 + R() * 0.9; if (S.coulees.some(c => Math.abs(c.z - z) < 4.5)) continue; st.prop(makeRock(s, 0x3a2e2c), x, z, R() * 6, s * 0.95); S.blocs.push({ x, z }); if (R() < 0.5) st.add(makeFire(0.8 + R() * 0.6, false), -x * 0.8, z + 2.4, 0, 0); }
    lumiere(st, 0, 5, -50, 0xff4a1a, 2.0, 60);
  }
  st.bake();
  return st;
}
