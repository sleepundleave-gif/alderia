// ============================================================
//  LES LIEUX DES CHAPITRES 9 ET 10 : la colline au-dessus du siège, les égouts courts,
//  les remparts de nuit, le camp des catapultes, la porte Ouest, les rues en feu.
//  Convention : nord = -z, est = +x. 1 unité = 1 mètre.
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { Stage } from './engine.js';
import { box, sph, cyl, cone, flat, disc, mat, makeHouse, makeStatue, makeCrate, makeBarrel, makeFire, makeTree, makeRock } from './models.js';
import { bloc as B, colonne as C, dalle as G, matiere as W, room, rng } from './world3.js';
import { murs, plaque, lueur, lumiere, brasero, particules } from './world5.js';

const PI = Math.PI;
const NUIT = { sky: 0x070a16, fog: [0x0c1020, 40, 240], hemi: [0xb0c0f0, 0x3a3038, 1.1], sun: [0xc0d0ff, 0.6, [20, 50, 10]] };
const etoiles = (st) => { const p = particules(st, [-220, 220, -220, 220], 500, 0xffffff, { h: 90, v: 0.0001, size: 0.6, opacity: 0.9, graine: 9 }); p.position.y = 50; p.material.fog = false; };

// ----- Petits modèles du siège -----
function tente(c = 0x4a4a52) { const g = new THREE.Group(); const t = cone(1.9, 2.4, c, 0, 1.2, 0, 4); t.rotation.y = PI / 4; g.add(t); g.add(box(0.06, 0.9, 0.5, 0x8a1a1a, 0, 2.8, 0.25)); g.add(cyl(0.04, 0.04, 1.2, 0x3a3a3a, 0, 2.6, 0, 5)); return g; }
function feuCamp(st, x, z, light = false) { const f = makeFire(0.8, false); st.add(f, x, z); if (light) lumiere(st, x, 1.4, z, 0xff8030, 1.5, 15); }
function creneaux(st, m, x1, x2, z, h = 1.0) { for (let x = x1; x < x2 - 0.2; x += 2.2) B(st, m, 1.2, 0.8, 0.9, x + 0.6, h + 0.4, z); B(st, m, x2 - x1, h, 0.9, (x1 + x2) / 2, h / 2, z); }
export function catapulte() {
  const g = new THREE.Group(), b = 0x6a4a2c, f = 0x3a3a40;
  g.add(box(2.4, 0.35, 4.6, b, 0, 0.5, 0)); for (const c of [-1, 1]) { g.add(box(0.3, 2.6, 0.3, b, c * 0.9, 1.7, -0.6)); for (const z of [-1.7, 1.7]) { const r = cyl(0.55, 0.55, 0.25, f, c * 1.3, 0.55, z, 12); r.rotation.z = PI / 2; g.add(r); } }
  g.add(box(2.1, 0.3, 0.3, b, 0, 2.9, -0.6));
  const bras = new THREE.Group(); bras.position.set(0, 1.5, -0.6); bras.add(box(0.26, 0.26, 5, b, 0, 0, 1.7)); bras.add(box(0.9, 0.5, 0.9, f, 0, 0, 4.1)); bras.add(box(0.8, 0.9, 0.8, 0x2a2a2e, 0, -0.5, -0.7)); bras.rotation.x = -0.5; g.add(bras);
  g.userData.bras = bras;
  return g;
}
function tourSiege() { const g = new THREE.Group(), b = 0x4a3a2a; g.add(box(3.4, 9, 3.4, b, 0, 4.9, 0)); g.add(box(3.8, 0.4, 3.8, 0x2a2a2e, 0, 9.6, 0)); for (const c of [-1, 1]) for (const z of [-1.3, 1.3]) { const r = cyl(0.6, 0.6, 0.3, 0x2a2a2e, c * 1.9, 0.6, z, 10); r.rotation.z = PI / 2; g.add(r); } g.add(box(0.06, 1.4, 1.0, 0x8a1a1a, 0, 10.6, 0.5)); return g; }
function echelle(h = 5) { const g = new THREE.Group(); for (const c of [-1, 1]) g.add(box(0.1, h, 0.1, 0x6a4a2c, c * 0.35, h / 2, 0)); for (let y = 0.4; y < h; y += 0.45) g.add(box(0.7, 0.07, 0.07, 0x6a4a2c, 0, y, 0)); return g; }

// ============================================================
//  LA COLLINE : on découvre le siège (chapitre 9)
// ============================================================
export function buildPlaine() {
  const R = rng(901);
  const st = new Stage({ name: 'plaine', bounds: [-13, 13, -17, 16], ...NUIT, fog: [0x10121e, 60, 330], music: 'danger', pitch: 0.6 });
  const S = st.spots = {};
  st.deco(flat(500, 500, 0x2a3c30, 0, -0.03, -120));
  st.deco(disc(24, 0x3c5442, 0, 0.0, 0));
  // la ville au loin : muraille blanche, tours, château
  const blanc = mat(0xb8bcc8), toit = mat(0x2a3a6a);
  B(st, blanc, 150, 11, 3, 0, 1.5, -150); for (let x = -70; x <= 70; x += 20) { B(st, blanc, 6, 17, 6, x, 4.5, -150); const t = cone(4.6, 6, 0x2a3a6a, x, 16, -150, 4); t.rotation.y = PI / 4; st.deco(t); }
  B(st, blanc, 26, 22, 14, 0, 7, -175); for (const x of [-11, 11]) { B(st, blanc, 6, 32, 6, x, 12, -172); const t = cone(4.6, 9, 0x2a3a6a, x, 32.5, -172, 4); t.rotation.y = PI / 4; st.deco(t); }
  for (let i = 0; i < 9; i++) { const f = makeFire(3 + R() * 2, false); st.add(f, -60 + R() * 120, -158 - R() * 14, 0, 6 + R() * 5); }
  // l'armée grise : tentes, feux, tours de siège
  for (let i = 0; i < 90; i++) { const x = -110 + R() * 220, z = -128 + R() * 92; st.deco(tente(R() < 0.2 ? 0x5a2a2a : 0x3a3a42), x, z, R() * 6, -4 - (z + 36) * 0.02); }
  for (let i = 0; i < 46; i++) { const f = makeFire(1.4, false); st.add(f, -110 + R() * 220, -130 + R() * 96, 0, -3.4); }
  for (const x of [-48, -20, 14, 44]) st.deco(tourSiege(), x, -134, 0, -4);
  for (const x of [-32, 0, 30]) st.deco(catapulte(), x, -118, PI, -4);
  // la crête : rochers, arbres morts, la grille d'égout
  for (let i = 0; i < 9; i++) { const a = 0.3 + i * 0.5, r = 12.6 + R() * 2; st.prop(makeRock(1.2 + R(), 0x4a4e58), Math.cos(a) * r, Math.sin(a) * r * 0.9 + 2, R() * 6, 1.3); }
  for (const [x, z] of [[-9, 6], [10, 8], [-11, -4], [11.4, -6]]) st.prop(makeTree('big', 1.1, 0x26382c), x, z, R() * 6, 0.6);
  B(st, mat(0x5a5e68), 2.6, 0.5, 2.6, -8, 0.25, -11); st.add(plaque(1.6, 1.6, mat(0x15181c), -8, 0.52, -11)); for (let k = -2; k <= 2; k++) st.deco(box(0.08, 0.08, 1.6, 0x3a3a42, -8 + k * 0.32, 0.56, -11));
  st.wall(-9.3, -12.3, -6.7, -9.7); S.grille = { x: -8, z: -11 };
  S.vue = { x: 0, z: -12 };
  for (let x = -12; x <= 12; x += 3) st.prop(makeRock(0.9, 0x3a3e48), x + R(), -16.4, R() * 6, 0.9);
  etoiles(st);
  st.bake();
  return st;
}

// ============================================================
//  LES ÉGOUTS, EN COURT (chapitre 9)
// ============================================================
export function buildEgouts9() {
  const H = 3.6;
  const st = new Stage({ name: 'egouts9', bounds: [-9, 9, -52, 8], sky: 0x070c09, fog: [0x0a120d, 22, 80], hemi: [0xd0f0d8, 0x4a5a4c, 1.35], sun: [0xb8e0c0, 0.5, [10, 40, 20]], music: 'egouts', pitch: 0.78 });
  const S = st.spots = {};
  const wm = W('mur_egout', 0xffffff, 3, 0x6a5444, 1.7), wmS = W('mur_egout', 0xc8c8b8, 3, 0x5a4a3c, 1.5), fm = W('paves', 0xa8b4a0, 3, 0x4a5448);
  G(st, fm, 30, 70, 0, 0, -22);
  const wall = murs(st, wm, H, wmS);
  room(st, -4, -8, 4, 8, { n: [[-1.8, 1.8]] }, wall);
  room(st, -9, -30, 9, -8, { s: [[-1.8, 1.8]], n: [[-1.8, 1.8]] }, wall);
  room(st, -6, -52, 6, -30, { s: [[-1.8, 1.8]] }, wall);
  // rigole centrale
  st.add(plaque(1.4, 58, new THREE.MeshStandardMaterial({ color: 0x3a6a4a, emissive: 0x143a22, emissiveIntensity: 0.5, roughness: 0.2 }), 0, 0.03, -22));
  for (const [x, z] of [[0, 4], [-7, -12], [7, -26], [0, -19], [-4, -36], [4, -46]]) lumiere(st, x, 2.6, z, 0xa8ffc0, 1.2, 15);
  // les barils de poudre des saboteurs
  S.barils = [{ x: -7.4, z: -14 }, { x: 7.4, z: -24 }, { x: -4.6, z: -40 }].map((b) => { const g = new THREE.Group(); for (const [dx, dz] of [[0, 0], [0.7, 0.2], [0.3, 0.75]]) { const t = makeBarrel(); t.position.set(dx, 0, dz); g.add(t); } g.add(sph(0.12, 0xff5030, 0.3, 1.25, 0.3)); st.add(g, b.x, b.z); st.circle(b.x + 0.3, b.z + 0.3, 0.9); return Object.assign(b, { obj: g }); });
  S.mobs = [
    { id: 's9a', x: -5, z: -15, enemies: ['saboteur', 'saboteur'] }, { id: 's9b', x: 5, z: -24, enemies: ['saboteur', 'fantassin'] }, { id: 's9c', x: -2.6, z: -40, enemies: ['saboteur', 'saboteur', 'arbaletrier'] },
  ];
  st.prop(makeStatue(), 2.6, 4.4, -PI / 4, 0.6); S.statue = { x: 2.6, z: 4.4 };
  st.add(echelle(H + 0.6), 0, -51.6, 0); S.echelle = { x: 0, z: -50.4 };
  S.coffre = { x: 7.4, z: -11 };
  st.bake();
  return st;
}

// ============================================================
//  LES REMPARTS, LA NUIT (chapitre 9)
// ============================================================
export function buildRemparts() {
  const R = rng(919);
  const st = new Stage({ name: 'remparts', bounds: [-27, 27, -2.2, 3.4], ...NUIT, music: 'danger', pitch: 0.7 });
  const S = st.spots = {};
  const pierre = W('mur_blanc', 0xc8ccd8, 3, 0x8a8e9c, 1.1), sol = W('paves', 0xb8bcc8, 3, 0x7a7e8c);
  G(st, sol, 62, 7.4, 0, 0, 0.6);
  creneaux(st, pierre, -31, 31, -3.1, 1.0); B(st, pierre, 62, 0.5, 0.6, 0, 0.25, 4.3);
  B(st, pierre, 62, 12, 7.6, 0, -6.02, 0.6);
  for (const x of [-30, 30]) { B(st, pierre, 7, 9, 8.4, x, 4.5, 0.6); const t = cone(5.6, 5, 0x2a3a6a, x, 11.5, 0.6, 4); t.rotation.y = PI / 4; st.deco(t); }
  st.wall(-34, -4, -27.2, 5); st.wall(27.2, -4, 34, 5);
  // au pied des murs : la plaine, les feux, les tentes
  st.deco(flat(500, 300, 0x243228, 0, -12, -150));
  for (let i = 0; i < 50; i++) { const x = -110 + R() * 220, z = -30 - R() * 90; st.deco(tente(R() < 0.2 ? 0x5a2a2a : 0x3a3a42), x, z, R() * 6, -12); }
  for (let i = 0; i < 30; i++) { const f = makeFire(1.6, false); st.add(f, -110 + R() * 220, -24 - R() * 96, 0, -11.6); }
  for (const x of [-40, 38]) st.deco(tourSiege(), x, -34, 0, -12);
  // la ville derrière : toits
  for (let i = 0; i < 16; i++) { const x = -60 + i * 8 + R() * 3; st.deco(makeHouse(6, 6, 4 + R() * 2, 0xd8d8e0, 0x2a3a6a, {}), x, 16 + R() * 14, 0, -12); }
  // échelles d'assaut (cachées tant que la vague n'arrive pas), braseros, caisses
  S.echelles = [-16, 0, 16].map((x) => { const e = echelle(3.4); e.rotation.x = 0.16; st.add(e, x, -3.2, 0, -1.4); e.visible = false; return { x, z: -1.2, obj: e }; });
  for (const x of [-22, -8, 8, 22]) brasero(st, x, 3.2, true, 0.6);
  for (const [x, z] of [[-12, 3.2], [-11.2, 3.3], [4, 3.3], [19, 3.2]]) st.prop(makeCrate(), x, z, R(), 0.5);
  S.gardes = [{ x: -20, z: -1.4 }, { x: -6, z: -1.6 }, { x: 10, z: -1.4 }, { x: 22, z: -1.6 }];
  S.soigneur = { x: -3, z: 2.6 }; S.borin = { x: 3, z: 0 };
  etoiles(st);
  st.bake();
  return st;
}

// ============================================================
//  LE CAMP DES CATAPULTES (chapitre 9)
// ============================================================
export function buildCatapultes() {
  const R = rng(929);
  const st = new Stage({ name: 'catapultes', bounds: [-26, 26, -44, 8], ...NUIT, music: 'danger', pitch: 0.85 });
  const S = st.spots = {};
  st.deco(flat(300, 300, 0x2e4034, 0, -0.03, -20));
  for (let i = 0; i < 40; i++) st.deco(disc(1.5 + R() * 2.5, 0x3a5040, -26 + R() * 52, 0.01, -44 + R() * 52));
  // la muraille de la ville, au sud, et la poterne
  const pierre = W('mur_blanc', 0xc8ccd8, 3, 0x8a8e9c, 1.1);
  // (elle est loin derrière le point de départ : la caméra, placée au sud de l'équipe, ne doit pas se retrouver dedans)
  B(st, pierre, 90, 11, 3, 0, 5.5, 27); creneaux(st, pierre, -45, 45, 25.8, 11); B(st, mat(0x2a1c14), 1.6, 2.4, 0.3, 0, 1.2, 25.4); S.poterne = { x: 0, z: 7.6 };
  // palissades : elles forcent un détour d'une machine à l'autre
  const pal = (x1, z1, x2, z2) => { const dx = x2 - x1, dz = z2 - z1, n = Math.round(Math.hypot(dx, dz) / 0.6); for (let i = 0; i <= n; i++) { const p = cone(0.3, 2.4, 0x4a3a28, x1 + dx * i / n, 1.2, z1 + dz * i / n, 6); st.deco(p); } st.wall(Math.min(x1, x2) - 0.3, Math.min(z1, z2) - 0.3, Math.max(x1, x2) + 0.3, Math.max(z1, z2) + 0.3); };
  pal(-26, -8, -9, -8); pal(9, -8, 26, -8); pal(-5, -22, 5, -22); pal(-26, -30, -16, -30); pal(16, -30, 26, -30);
  for (const [x, z] of [[-22, -3], [22, -2], [-10, -14], [10, -15], [0, -28], [-22, -38], [22, -39], [-6, -41], [7, -40]]) { st.deco(tente(R() < 0.3 ? 0x5a2a2a : 0x3a3a42), x, z, R() * 6); st.circle(x, z, 1.5); }
  for (const [x, z] of [[-14, -3], [15, -4], [0, -12], [-12, -26], [13, -27], [0, -42]]) feuCamp(st, x, z, true);
  S.machines = [{ x: -18, z: -18 }, { x: 18, z: -20 }, { x: 0, z: -35 }].map((m, i) => { const c = catapulte(); st.add(c, m.x, m.z, PI + (i - 1) * 0.3); st.wall(m.x - 1.5, m.z - 2.5, m.x + 1.5, m.z + 2.5); return Object.assign(m, { obj: c }); });
  S.mobs = [
    { id: 'k9a', x: -14.6, z: -15, enemies: ['fantassin', 'arbaletrier'] }, { id: 'k9b', x: 14.6, z: -17, enemies: ['mage_guerre', 'fantassin'] }, { id: 'k9c', x: 0, z: -31, enemies: ['fantassin', 'mage_guerre', 'arbaletrier'] },
  ];
  etoiles(st);
  st.bake();
  return st;
}

// ============================================================
//  LA PORTE OUEST (chapitre 9) — aube = true : le lendemain matin
// ============================================================
export function buildPorteOuest(aube = false) {
  const R = rng(939);
  const st = new Stage({ name: 'porte_ouest', bounds: [-13, 13, -15, 12], ...(aube ? { sky: 0xf0b890, fog: [0xf4d0b0, 60, 300], hemi: [0xffe8d8, 0x8a7a80, 1.1], sun: [0xffc890, 1.2, [-40, 20, -30]] } : NUIT), music: aube ? 'sad' : 'danger', pitch: 0.7 });
  const S = st.spots = {};
  const pierre = W('mur_blanc', 0xd8dce8, 3, 0x9a9eac, 1.1), sol = W('paves', 0xc8ccd0, 3.4, 0x8a8e9c);
  G(st, sol, 40, 40, 0, 0, 0);
  // la muraille et l'arche de la porte
  for (const c of [-1, 1]) { B(st, pierre, 14, 11, 3.4, c * 11.5, 5.5, -17.2); B(st, pierre, 5.6, 15, 5.6, c * 6.6, 7.5, -17.2); const t = cone(4.4, 5, 0x2a3a6a, c * 6.6, 17.5, -17.2, 4); t.rotation.y = PI / 4; st.deco(t); }
  B(st, pierre, 8, 4.6, 3.4, 0, 8.7, -17.2); creneaux(st, pierre, -18, 18, -17.2, 11);
  st.wall(-20, -19, -3.6, -15.2); st.wall(3.6, -19, 20, -15.2); st.wall(-4, -19.4, 4, -17.6);
  // les battants : fendus de nuit, arrachés à l'aube
  S.battants = [-1, 1].map((c) => { const b = new THREE.Group(); b.add(box(3.5, 6.2, 0.4, 0x4a3424, 0, 3.1, 0)); for (const y of [1.4, 3.2, 5]) b.add(box(3.6, 0.3, 0.46, 0x2a2a30, 0, y, 0)); st.add(b, c * 1.8, -16.2, c * (aube ? 1.1 : 0.12)); if (aube) { b.rotation.x = c * 0.2; b.position.y = -0.3; } return b; });
  // maisons de la cour, barricades
  for (const c of [-1, 1]) { st.house(makeHouse(8, 7, 4.4, 0xf2f0e8, 0x2a4aa8, {}), c * 14.6, -3, 8, 7, -c * PI / 2); st.house(makeHouse(8, 7, 3.8, 0xf2f0e8, 0x2a4aa8, {}), c * 14.6, 7, 8, 7, -c * PI / 2); }
  for (const [x, z, r] of [[-7, 1.6, 0.3], [7.4, 2.2, -0.4], [-8.6, -7, 0.9], [8.8, -8, -0.8]]) { const g = new THREE.Group(); g.add(box(3, 0.9, 0.8, 0x6a4a2c, 0, 0.45, 0)); g.add(makeCrate()); for (let k = -1; k <= 1; k++) { const p = cone(0.14, 1.6, 0x4a3a28, k * 0.9, 0.9, -0.5, 5); p.rotation.x = -0.9; g.add(p); } st.add(g, x, z, r); st.circle(x, z, 1.3); }
  for (const [x, z] of [[-10, -12], [10, -12], [-11, 9], [11, 9]]) brasero(st, x, z, !aube, 0.7);
  if (!aube) for (const x of [-4.6, 4.6]) lumiere(st, x, 3, -12, 0xff9040, 1.2, 14);
  S.belier = { x: 0, z: -13.4 }; S.hesk = { x: 3.2, z: -11.6 }; S.seuil = -3;
  S.gardes = [{ x: -5, z: -6 }, { x: 5, z: -6.4 }, { x: -3, z: -4.4 }, { x: 3.4, z: -4.6 }];
  S.epave = { x: 0, z: -12.4 };
  if (aube) { for (let i = 0; i < 7; i++) st.deco(box(0.5 + R() * 1.6, 0.3, 0.4 + R(), 0x2a1c14, -3 + R() * 6, 0.15, -14 + R() * 4)); particules(st, [-6, 6, -16, -8], 120, 0x4a4a4a, { h: 8, v: -0.8, size: 0.3, opacity: 0.4 }); }
  else etoiles(st);
  st.bake();
  return st;
}

// ============================================================
//  LES RUES EN FEU (chapitre 10)
// ============================================================
export function buildRuesFeu() {
  const R = rng(1010);
  const st = new Stage({ name: 'rues_feu', bounds: [-17, 17, -79.4, 10], sky: 0x3a1410, fog: [0x5a2418, 26, 150], hemi: [0xffc0a0, 0x5a3028, 1.15], sun: [0xff8850, 0.9, [-20, 40, -30]], music: 'sad', pitch: 0.8 });
  const S = st.spots = {};
  const sol = W('paves', 0xc8b8b0, 3.4, 0x7a6a64), pierre = W('mur_blanc', 0xe8dcd4, 3, 0xa89890, 1.1), noir = mat(0x2a201c);
  G(st, sol, 60, 110, 0, 0, -35);
  // deux rangées de maisons ; trois ruelles vers l'ouest ou l'est (z = -14, -38, -60)
  const ruelles = [-14, -38, -60], cotes = [-1, 1, -1];
  for (const c of [-1, 1]) {
    let z = 8;
    while (z > -76) {
      const r = ruelles.findIndex((rz, i) => cotes[i] === c && z - 8 < rz + 2 && z > rz - 2);
      if (r >= 0) { z = ruelles[r] - 2.6; continue; }
      const d = Math.min(7 + R() * 2, z + 76), h = 3.6 + R() * 2.2, brule = R() < 0.45;
      st.house(makeHouse(8, d - 0.6, h, brule ? 0x8a7a70 : 0xf2ece4, brule ? 0x2a1c18 : 0x2a4aa8, {}), c * 11.5, z - d / 2, 8, d - 0.6, -c * PI / 2);
      if (brule) { const f = makeFire(2.2 + R(), false); st.add(f, c * (10 + R() * 2), z - d / 2 + (R() - 0.5) * 2, 0, h + 0.6); lumiere(st, c * 7, 3, z - d / 2, 0xff7030, 1.2, 14); }
      z -= d;
    }
    st.wall(c * 15.6, -80, c * 20, 12);
  }
  // fonds de ruelles (culs-de-sac)
  ruelles.forEach((rz, i) => { const c = cotes[i]; B(st, pierre, 1, 5, 6, c * 16.4, 2.5, rz); });
  // décombres : ils barrent la moitié de la rue, il faut zigzaguer
  const tas = (x1, x2, z) => { for (let x = x1; x < x2; x += 1.1) { const b = box(1 + R() * 0.8, 0.6 + R() * 1.2, 1 + R(), R() < 0.5 ? 0x8a7a70 : 0x3a2c26, x + 0.5, 0.5, z + (R() - 0.5) * 0.8); b.rotation.y = R() * 3; st.deco(b); } st.wall(x1, z - 0.9, x2, z + 0.9); const f = makeFire(1.4, false); st.add(f, (x1 + x2) / 2, z, 0, 0.9); };
  tas(-7.4, 1.5, -6); tas(-1.5, 7.4, -26); tas(-7.4, 1.5, -48); tas(-1.5, 7.4, -68);
  for (const [x, z] of [[4, -2], [-5, -18], [5, -32], [-4, -42], [5, -56], [-5, -64], [0, -22], [0, -52]]) { const f = makeFire(1 + R() * 0.6, false); st.add(f, x, z); st.circle(x, z, 0.6); }
  for (const [x, z] of [[3, 4], [-3, -12], [2.6, -36], [-3, -58], [4.6, -72]]) st.prop(R() < 0.5 ? makeBarrel() : makeCrate(), x, z, R() * 6, 0.5);
  // le château au nord : escalier, portes
  B(st, pierre, 40, 16, 4, 0, 8, -83.6); for (const c of [-1, 1]) { B(st, pierre, 6, 22, 6, c * 8, 11, -82.6); const t = cone(4.8, 7, 0x2a3a6a, c * 8, 25.5, -82.6, 4); t.rotation.y = PI / 4; st.deco(t); }
  for (let i = 0; i < 3; i++) B(st, pierre, 9 - i * 0.6, 0.2, 1, 0, 0.1 + i * 0.2, -78 - i * 1);
  B(st, noir, 4.4, 6, 0.4, 0, 3, -81.5); S.chateau = { x: 0, z: -78 };
  st.wall(-20, -84, -2.6, -79.8); st.wall(2.6, -84, 20, -79.8); st.wall(-3, -82, 3, -80.6);
  // les civils (un par ruelle) et les patrouilles sur la rue
  S.civils = ruelles.map((rz, i) => ({ id: i, x: cotes[i] * 13.4, z: rz, ry: -cotes[i] * PI / 2, k: ['citadine2', 'enfant1', 'citadin2'][i] }));
  S.pillards = ruelles.map((rz, i) => ({ x: cotes[i] * 10.4, z: rz }));
  S.barrages = [{ z: -10, ennemis: ['chevalier_cendre', 'fantassin'] }, { z: -34, ennemis: ['mage_guerre', 'chevalier_cendre', 'arbaletrier'] }, { z: -56, ennemis: ['chevalier_cendre', 'chevalier_cendre', 'mage_guerre'] }];
  st.prop(makeStatue(), 5.4, 6.4, 0, 0.8); S.statue = { x: 5.4, z: 6.4 };
  S.alinor = { x: 0, z: -75.4 };
  particules(st, [-17, 17, -80, 10], 520, 0xff9a40, { h: 10, v: -1.4, vent: 0.5, size: 0.11, opacity: 0.9 });
  particules(st, [-17, 17, -80, 10], 160, 0x2a2a2a, { h: 14, v: -0.7, size: 0.5, opacity: 0.35, graine: 4 });
  st.bake();
  return st;
}
