// ============================================================
//  LES LIEUX : Brumeval (jour / en feu), Bois de Brumeval,
//  Bois des Murmures, Relais du Cerf Blanc
//  Convention : nord = -z, est = +x. 1 unité = 1 mètre.
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { Stage } from './engine.js';
import {
  box, sph, cyl, cone, prism, flat, disc, mat, makeChar, makeWolf, makeMushroom, makeFirefly, makeHorse, makeEnemyModel,
  makeTree, makeRock, makeBush, makeHouse, makeWell, makeFence, makeBarrel, makeCrate, makeStall, makeChest, makeStatue,
  makeFire, makeCampfire, makeSmoke, makeAnvil, makeCart, makeBanner, makeGarland, makeMountain, makeCloud, makeBramble, makeGlowShroom,
} from './models.js';
import { decorReady, sprinkle, piece, infosMaison, wallMat } from './decor.js';
import { horizon, eau, fumee } from './paysage.js';

const PI = Math.PI;
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Ligne d'arbres infranchissable le long d'une suite de points
function treeLine(st, pts, R, o = {}) {
  const step = o.step || 2.3;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[i + 1], len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, x = x1 + (x2 - x1) * t + (R() - 0.5) * 0.5, z = z1 + (z2 - z1) * t + (R() - 0.5) * 0.5;
      const sc = (o.scale || 1) * (0.85 + R() * 0.4), ry = R() * 6;
      if (!decorReady() || k % 2 === 0) st.deco(makeTree(o.type || 'pine', sc * (decorReady() ? 1.15 : 1), o.tint), x, z, ry);   // arbres importés : un sur deux suffit, ils sont plus larges
      st.circle(x, z, 1.25).tall = true;
    }
  }
}
function scatter(st, n, R, area, make, avoid) {
  if (decorReady() && n >= 100) n = Math.round(n * 0.5);     // les arbres importés sont plus touffus : deux fois moins suffisent pour une forêt
  for (let i = 0; i < n; i++) {
    const x = area[0] + R() * (area[1] - area[0]), z = area[2] + R() * (area[3] - area[2]);
    if (avoid && avoid(x, z)) continue;
    st.deco(make(R), x, z, R() * 6);
  }
}
function sign(text) { const g = new THREE.Group(); g.add(box(0.12, 1.4, 0.12, 0x5a3e24, 0, 0.7, 0)); g.add(box(1.3, 0.6, 0.08, 0x9a7a4a, 0, 1.3, 0)); g.userData.text = text; return g; }
function sparkle() {
  const g = new THREE.Group();
  const s = sph(0.3, 0xfff4a0, 0, 0.35, 0, { basic: true }); const h = sph(0.8, 0xfff4a0, 0, 0.35, 0, { basic: true, opacity: 0.25 });
  g.add(s); g.add(h);
  g.userData.anim = (dt, m, t) => { const k = 1 + Math.sin(t * 5) * 0.3; s.scale.setScalar(0.3 * k); h.scale.setScalar(0.8 * k); s.position.y = 0.35 + Math.sin(t * 2.5) * 0.08; };
  return g;
}
// Ciel, montagnes lointaines et nuages (voir paysage.js)
function skyDecor(st, R, o = {}) { horizon(st, R, Object.assign({ rayon: 230 }, o)); }

// Fumée claire qui sort de la cheminée d'une maison posée dans la scène
function fumeeCheminee(st, maison, o = {}) {
  const c = infosMaison(maison).cheminee; if (!c) return;
  st.add(fumee(Object.assign({ n: 16, couleur: 0xe6e2dc, large: 0.45, haut: 6.5, taille: [0.55, 2.6], vent: [0.34, 0.1], vitesse: 0.1, alpha: 0.42 }, o)), c.x, c.z, 0, c.y - 0.15);
}
// Petits objets posés devant une maison, de part et d'autre de la porte : tonneau, caisse, banc, bûches, lanterne
function abords(st, maison, R) {
  const p = infosMaison(maison).porte; if (!p || !decorReady()) return;
  const tx = p.nz, tz = -p.nx, at = (u, v) => [p.x + tx * u + p.nx * v, p.z + tz * u + p.nz * v], ry = Math.atan2(p.nx, p.nz);
  const k = Math.floor(R() * 4), cote = R() < 0.5 ? 1 : -1;
  if (k === 0) { const [x, z] = at(1.75 * cote, 0.55); st.deco(piece(R() < 0.5 ? 'Barrel' : 'Barrel_Apples', 0, 0, 0, R() * 6), x, z); st.circle(x, z, 0.42); }
  else if (k === 1) { const [x, z] = at(1.9 * cote, 0.6); st.deco(piece('Crate_Wooden', 0, 0, 0, R() * 0.6, 0.8), x, z); st.circle(x, z, 0.45); const [x2, z2] = at(2.65 * cote, 0.5); st.deco(piece('Bucket_Wooden_1', 0, 0, 0, R() * 6, 1.1), x2, z2); }
  else if (k === 2) { const [x, z] = at(2.3 * cote, 0.5); st.deco(piece('Bench', 0, 0, 0, ry), x, z); st.circle(x - tx * 0.7, z - tz * 0.7, 0.4); st.circle(x + tx * 0.7, z + tz * 0.7, 0.4); }
  else { const [x, z] = at(2.0 * cote, 0.55); st.deco(buches(R), x, z, ry); st.circle(x, z, 0.6); }
  // pots de fleurs près du seuil
  const [fx, fz] = at(-0.95 * cote, 0.45); st.deco(piece('Vase_4', 0, 0, 0, 0, 0.8), fx, fz); st.deco(piece('Flower_3_Group', 0, 0.3, 0, R() * 6, 0.28), fx, fz);
}
// Tas de bûches rangées
function buches(R) {
  const g = new THREE.Group();
  for (let j = 0; j < 3; j++) for (let i = 0; i < 4 - j; i++) { const b = cyl(0.14, 0.14, 0.9, j % 2 ? 0x8a623a : 0x7a5230, -0.45 + i * 0.3 + j * 0.15, 0.14 + j * 0.25, 0, 7); b.rotation.x = Math.PI / 2; g.add(b); const c = cyl(0.1, 0.1, 0.02, 0xd8b888, b.position.x, b.position.y, 0.455, 7); c.rotation.x = Math.PI / 2; g.add(c); }
  return g;
}
// Roue à aubes du moulin (elle tourne autour de l'axe x)
function roueMoulin() {
  const g = new THREE.Group(), bois = mat(0x6a4a2a), clair = mat(0x8a6238);
  for (const s of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.09, 6, 22), bois); t.rotation.y = PI / 2; t.position.x = s * 0.36; g.add(t);
    const t2 = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.06, 5, 18), bois); t2.rotation.y = PI / 2; t2.position.x = s * 0.36; g.add(t2);
    for (let i = 0; i < 4; i++) { const b = box(0.07, 3.8, 0.1, bois, s * 0.36, 0, 0); b.rotation.x = (i / 4) * PI; g.add(b); }
  }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * PI * 2, pale = box(0.78, 0.06, 0.62, clair, 0, Math.cos(a) * 1.92, Math.sin(a) * 1.92); pale.rotation.x = a + PI / 2; g.add(pale); }
  const axe = cyl(0.14, 0.14, 1.3, 0x4a3220, 0, 0, 0, 8); axe.rotation.z = PI / 2; g.add(axe);
  return g;
}
// Épouvantail : croix de bois, chemise, tête de toile, chapeau de paille
function epouvantail() {
  const g = new THREE.Group();
  g.add(box(0.1, 2.3, 0.1, 0x5a3e24, 0, 1.15, 0)); g.add(box(1.9, 0.09, 0.09, 0x5a3e24, 0, 1.75, 0));
  g.add(box(0.62, 0.8, 0.26, 0xa8483a, 0, 1.5, 0)); for (const s of [-1, 1]) { const m = box(0.62, 0.2, 0.2, 0xa8483a, s * 0.56, 1.75, 0); g.add(m); const p = cone(0.1, 0.3, 0xe8cc6a, s * 1.0, 1.75, 0, 6); p.rotation.z = -s * PI / 2; g.add(p); }
  g.add(box(0.66, 0.08, 0.28, 0x5a3e24, 0, 1.14, 0)); for (let i = 0; i < 5; i++) { const c = cone(0.06, 0.34, 0xe8cc6a, -0.24 + i * 0.12, 0.95, 0, 5); c.rotation.x = PI; g.add(c); }
  g.add(sph(0.46, 0xe6d2a0, 0, 2.12, 0)); for (const s of [-1, 1]) g.add(sph(0.07, 0x2a2018, s * 0.1, 2.16, 0.2));
  g.add(cyl(0.48, 0.5, 0.03, 0xd8b84a, 0, 2.3, 0, 12)); g.add(cone(0.24, 0.3, 0xd8b84a, 0, 2.46, 0, 10));
  return g;
}
// Berge : galets, rochers, touffes d'herbe et fougères le long d'un cours d'eau qui coule d'ouest en est
function berge(st, R, z, x1, x2, sauf) {
  if (!decorReady()) return;
  for (let x = x1; x < x2; x += 1.1 + R() * 1.6) {
    if (sauf && sauf(x)) continue;
    for (const s of [-1, 1]) {
      const k = R(), zz = z + s * (3.25 + R() * 0.55);
      if (k < 0.3) st.deco(piece('Pebble_Round_' + (1 + Math.floor(R() * 3)), 0, 0, 0, R() * 6, 1.5 + R() * 2.5), x + R(), zz);
      else if (k < 0.42) st.deco(piece('Rock_Medium_' + (1 + Math.floor(R() * 3)), 0, -0.05, 0, R() * 6, 0.16 + R() * 0.2), x + R(), z + s * (3.0 + R() * 0.4));
      else if (k < 0.75) st.deco(piece(R() < 0.5 ? 'Grass_Wispy_Short' : 'Grass_Common_Short', 0, 0, 0, R() * 6, 0.6 + R() * 0.5), x + R(), zz + s * 0.3);
      else if (k < 0.86) st.deco(piece('Fern_1', 0, 0, 0, R() * 6, 0.3 + R() * 0.2), x + R(), zz + s * 0.5);
    }
  }
  // quelques rochers au milieu du courant
  for (let i = 0; i < 9; i++) { const x = x1 + R() * (x2 - x1); if (sauf && sauf(x)) continue; st.deco(piece('Rock_Medium_' + (1 + Math.floor(R() * 3)), 0, -0.2, 0, R() * 6, 0.2 + R() * 0.22), x, z + (R() - 0.5) * 3.6); }
}

// ============================================================
//  BRUMEVAL
// ============================================================
export function buildBrumeval(feu = false) {
  const R = rng(11);
  const st = new Stage(feu ? {
    name: 'brumeval_feu', bounds: [-40, 40, -50, 41], sky: 0x3a120c, fog: [0x4a1a10, 30, 160], hemi: [0xffb890, 0x5a2a18, 1.25], sun: [0xff8a50, 1.0, [-20, 30, 30]], music: 'danger',
  } : {
    name: 'brumeval', bounds: [-40, 40, -50, 41], sky: 0x9fd0ff, fog: [0xbfe0ff, 90, 750], hemi: [0xffffff, 0x7a9a5a, 1.05], sun: [0xfff0c8, 1.25, [40, 50, 30]], music: 'village',
  });
  const grass = feu ? 0x4a5a34 : 0x6fb04e, pathC = feu ? 0x7a6850 : 0xd8c090, wallC = feu ? 0x8a7a70 : 0xf4eee2, roofC = feu ? 0x4a3628 : 0xcfa552;
  const S = st.spots = {};

  st.deco(flat(700, 700, grass, 0, 0, 0));
  // Chemins
  st.deco(flat(3.6, 54, pathC, 0, 0.04, -24));          // place -> pont -> bois
  st.deco(flat(3.6, 12, pathC, 0, 0.04, 17));           // place -> forge
  st.deco(flat(34, 3.4, pathC, 0, 0.04, 0));            // maison du chef <-> auberge
  st.deco(flat(3.2, 34, pathC, 9.5, 0.04, 26));         // route de Solméria
  st.deco(flat(10, 3.2, pathC, 5, 0.04, 10.5));
  st.deco(disc(12.5, feu ? 0x5a5048 : 0xcdc3a8, 0, 0.06, 0));   // la place pavée
  st.deco(disc(3.2, feu ? 0x4a423c : 0xb8ae94, 0, 0.07, 3));

  // Rivière et pont de pierre
  const riv = eau(700, 6.4, feu ? { fond: 0x2a100c, clair: 0x8a3a1c, ciel: 0x7a3018, horizon: 0xd0602a, eclats: 0.5 } : { fond: 0x1f5a96, clair: 0x7ac8e6 }); riv.position.set(0, 0.05, -25); st.add(riv);
  st.deco(flat(700, 1.1, feu ? 0x3a3028 : 0x9a7a4a, 0, 0.045, -21.6)); st.deco(flat(700, 1.1, feu ? 0x3a3028 : 0x9a7a4a, 0, 0.045, -28.4));   // grève de sable
  berge(st, rng(77), -25, -120, 120, (x) => Math.abs(x) < 3.2);
  st.wall(-200, -28, -2.0, -22); st.wall(2.0, -28, 200, -22);
  st.deco(box(4.6, 0.3, 8.4, 0xa8a49c, 0, 0.0, -25));
  for (const s of [-1, 1]) { st.deco(box(0.4, 1.0, 8.4, 0x98948c, 2.2 * s, 0.45, -25)); st.deco(box(0.6, 1.3, 0.6, 0x88847c, 2.2 * s, 0.6, -20.9)); st.deco(box(0.6, 1.3, 0.6, 0x88847c, 2.2 * s, 0.6, -29.1)); }
  S.pont = { x: 0, z: -25 };

  // Puits et mât de fête
  st.prop(makeWell(), 0, 3, 0, 1.25);
  if (!feu) {
    st.prop(cyl(0.12, 0.16, 8, 0x7a5a36, 0, 4, 0, 6), 0, -4, 0, 0.4);
    st.deco(sph(0.5, 0xffd040, 0, 8.2, 0), 0, -4);
    const cols = [0xe04a4a, 0xe0c040, 0x4a8ae0, 0x50b060, 0xe07ab0, 0xf09030];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; const r = box(0.12, 8.6, 0.03, cols[i], Math.cos(a) * 1.6, 4.1, -4 + Math.sin(a) * 1.6); r.rotation.z = Math.cos(a) * 0.38; r.rotation.x = -Math.sin(a) * 0.38; st.deco(r, r.position.x, r.position.z, 0, 4.1); }
    for (const [x, z, ry, len] of [[-9, -2, 0.2, 16], [9, -2, -0.2, 16], [0, 9, PI / 2, 14], [-7, 7, 0.9, 10], [7, 7, -0.9, 10]]) st.deco(makeGarland(len, 11), x, z, ry, 4.6);
  }

  // Maisons : [x, z, largeur, profondeur, hauteur, orientation]
  const houses = [
    [-14.5, 19, 7, 6, 3.2, PI / 2], [-27, 13, 7, 6, 3.2, 0], [18.5, 21, 7, 6, 3.2, -PI / 2], [28, 12, 6.5, 6, 3.0, PI],
    [-30, -11, 7, 6, 3.2, PI / 2], [31, -12, 7, 6, 3.2, -PI / 2], [-28, 28, 6.5, 6, 3.0, PI / 2], [30, 30, 6.5, 6, 3.0, -PI / 2],
  ];
  S.fires = [];
  S.maisons = [];                                             // maisons où l'on peut entrer : { obj, type, id } (voir interieurs.js)
  const RA = rng(301);
  houses.forEach(([x, z, w, d, h, ry], i) => {
    const m = st.house(makeHouse(w, d, h, wallC, roofC, { flowers: !feu, door: feu ? 0x1a1210 : undefined }), x, z, w, d, ry);
    if (feu) S.fires.push([x, z, h]);
    else { S.maisons.push({ obj: m, type: 'maison', id: 'bv' + i }); if (i % 3 !== 2) fumeeCheminee(st, m); abords(st, m, RA); }
  });
  // Auberge du Coq Doré (est) et maison du chef (ouest)
  const auberge = st.house(makeHouse(12, 8, 4.2, wallC, feu ? roofC : 0xc88a48, { flowers: !feu, roofH: 3 }), 21, 0, 12, 8, -PI / 2);
  st.deco(box(0.1, 0.1, 1.4, 0x5a3e24, 16.6, 3.6, 3.2)); st.deco(sph(0.8, 0xf0c030, 16.2, 3.0, 3.8));   // enseigne du coq doré
  const chef = st.house(makeHouse(13, 9, 5.4, wallC, roofC, { flowers: !feu, roofH: 3.4 }), -22, 0, 13, 9, PI / 2);
  if (!feu) { S.maisons.push({ obj: auberge, type: 'auberge', id: 'bv_auberge' }, { obj: chef, type: 'chef', id: 'bv_chef' }); fumeeCheminee(st, auberge, { n: 20, large: 0.55 }); fumeeCheminee(st, chef); }
  st.deco(box(2.6, 0.3, 4, 0xa8a49c, -16.6, 0.15, 0));
  if (feu) { S.fires.push([21, 0, 4.2], [-22, 0, 5.4]); }
  if (!feu) { st.prop(makeBanner(0x1e3f8f), -16.2, 2.6, PI / 2, 0.2); st.prop(makeBanner(0x1e3f8f), -16.2, -2.6, PI / 2, 0.2); }
  // Terrasse de l'auberge et recoin derrière
  for (const [x, z] of [[15.2, -7.2], [16.1, -8.0], [27.2, 2.2], [27.6, -1.6], [26.2, 3.1]]) st.prop(makeBarrel(), x, z, 0, 0.45);
  st.prop(box(2.2, 1.0, 0.8, 0x8a6a40, 0, 0.5, 0), 14.4, -5.2, 0, 0); st.wall(13.3, -5.6, 15.5, -4.8);
  S.chestAuberge = { x: 27.4, z: 0.4 };

  // Étals de la fête
  if (!feu) {
    st.prop(makeStall(0xc04a3a, 'pain'), -6.5, -7.5, 0, 0); st.wall(-7.7, -8, -5.3, -7);
    st.prop(makeStall(0x3a7ac0, 'tissus'), 6.5, -7.5, 0, 0); st.wall(5.3, -8, 7.7, -7);
    st.prop(makeStall(0xe0b030, 'forain'), 9, 6.5, -PI / 2, 0); st.wall(8.5, 5.3, 9.5, 7.7);
    st.prop(box(1.8, 0.5, 0.6, 0x8a6a40, 0, 0.25, 0), -6, 8.5, 0.5, 0.9);   // banc d'Odile
  } else {
    const s1 = makeStall(0x3a2a20); s1.rotation.z = 1.3; st.deco(s1, -6.5, -7.5, 0.4, 0.6); st.circle(-6.5, -7.5, 1.3);
    const s2 = makeStall(0x3a2a20); s2.rotation.x = 1.4; st.deco(s2, 6.5, -7.5, 0, 0.5); st.circle(6.5, -7.5, 1.3);
  }

  // Moulin (nord-ouest) avec sa roue
  st.house(makeHouse(6, 6, 5, wallC, roofC, { chimney: false }), -18, -32.5, 6, 6, PI);
  const wheel = roueMoulin();
  const wheelHold = new THREE.Group(); wheelHold.add(wheel);
  if (!feu) wheelHold.userData.anim = (dt) => { wheel.rotation.x += dt * 0.8; };
  st.add(wheelHold, -21.6, -28.6, 0, 1.3);
  st.circle(-21.6, -29.2, 0.9);
  S.herbe = { x: -24.2, z: -30.2 };

  // Champs de blé et épouvantail (nord-est)
  st.deco(flat(17, 12, feu ? 0x4a3a1a : 0xe0c050, 14, 0.05, -38));
  for (let i = 0; i < 6; i++) st.deco(box(16, 0.7, 0.9, feu ? 0x3a2a12 : 0xd8b040, 14, 0.35, -43 + i * 2));
  st.wall(5.5, -44.2, 22.5, -31.8);
  st.deco(epouvantail(), 14, -38, 0.3);

  // Clôtures, route du sud fermée, sentier du nord
  st.deco(makeFence(8), 9.5, 39.5); st.wall(5, 39.2, 14, 39.8);
  st.prop(sign('Route de Solméria — trois jours de marche.'), 12.2, 37.5, PI, 0.3); S.panneauSud = { x: 12.2, z: 37.5 };
  st.prop(sign('Bois de Brumeval — attention aux loups.'), 2.6, -44, PI, 0.3); S.panneauNord = { x: 2.6, z: -44 };
  for (const [x, z, ry, l] of [[-9, 34, 0, 10], [-32, 22, PI / 2, 10], [34, 22, PI / 2, 10], [-10, -31, 0, 8]]) st.deco(makeFence(l), x, z, ry);

  // Arbres et buissons
  const tree = (r) => makeTree(feu ? (r() < 0.5 ? 'dead' : 'round') : (r() < 0.25 ? 'birch' : 'round'), 0.9 + r() * 0.6, feu ? 0x3a3a22 : undefined);
  for (const [x, z] of [[-36, 2], [-36, -20], [36, 0], [37, -24], [-12, 31], [22, 34], [-34, 36], [36, 38], [-8, -34], [-30, -40], [28, -44], [-36, -46], [-10, 12], [11, 14], [-34, -30], [36, -38]]) { st.deco(tree(R), x, z, R() * 6); st.circle(x, z, 0.5); }
  scatter(st, 150, R, [-110, 110, -110, 110], tree, (x, z) => (x > -45 && x < 45 && z > -55 && z < 46) || Math.abs(z + 25) < 6);
  scatter(st, 26, R, [-38, 38, -48, 40], (r) => makeBush(0.6 + r() * 0.6, feu ? 0x2a3a1a : undefined), (x, z) => Math.hypot(x, z) < 15 || Math.abs(x) < 4 || Math.abs(z + 25) < 5 || (Math.abs(z) < 3) || (x > 4 && x < 24 && z < -30) || (Math.abs(x) < 6 && z > 20));
  if (!feu) scatter(st, 60, R, [-38, 38, -48, 40], (r) => sph(0.22, [0xf06080, 0xf0d040, 0xffffff, 0xb070f0][Math.floor(r() * 4)], 0, 0.12, 0), (x, z) => Math.hypot(x, z) < 13 || Math.abs(z + 25) < 4 || (Math.abs(x) < 5.5 && z > 22 && z < 32));

  // Lointain : le Mont Aurore, doré par le lever du soleil
  st.deco(makeMountain(95, 150, feu ? 0x3a2420 : 0xe8b860, feu ? 0x5a3a30 : 0xfff2c8, { brume: st.fog[0], voile: feu ? 0.5 : 0.3, foret: feu ? 0x2a1c18 : 0x9a8a5a, graine: 5 }), 15, -330);
  skyDecor(st, R, feu ? { mount: 0x2a1c1c, snow: false, clouds: false } : {});

  // ---------- La forge de Hagen (sud) ----------
  const fz = 27;
  // murs de pierre, dalles, charpente et toit de bardeaux (photos du kit), outils et armes de l'atelier
  const fPierre = wallMat('mur_blanc', feu ? 0x7a6a60 : 0xd4ccc0, 2.8, { gain: 1.25 }) || mat(0x9a968e), fDalle = wallMat('paves', feu ? 0x7a6a60 : 0xbcb4a8, 2.4, { gain: 1.15 }) || mat(0x8a8680);
  const fBois = wallMat('planches', feu ? 0x5a3a28 : 0xb08a5c, 1.4) || mat(0x5a3e24), fToit = wallMat('planches', feu ? 0x4a3024 : 0xc87a48, 1.1, { gain: 1.2 }) || mat(0x7a5236);
  const fBox = (w, h, d, m, x, y, z) => { const o = box(w, h, d, 0xffffff, x, y, z); o.material = m; return o; };
  { const sol = flat(9.4, 8.4, 0x8a8680, 0, 0.07, fz); sol.material = fDalle; st.deco(sol); }
  for (const s of [-1, 1]) st.deco(fBox(0.4, 3.4, 8.4, fPierre, 4.5 * s, 1.7, fz));
  for (const s of [-1, 1]) { st.deco(fBox(0.5, 3.4, 0.5, fBois, 4.5 * s, 1.7, fz - 4.1)); st.deco(fBox(0.5, 3.5, 0.5, fBois, 4.5 * s, 1.75, fz + 4.0)); }
  st.wall(-4.75, 22.8, -4.25, 31.2); st.wall(4.25, 22.8, 4.75, 31.2); st.wall(-4.75, 30.75, 4.75, 31.25);
  const top = new THREE.Group();
  top.add(fBox(9.4, 3.4, 0.4, fPierre, 0, 1.7, fz + 4.0));
  top.add(fBox(1.0, 1.9, 0.1, fBois, -1.6, 0.95, fz + 3.76)); top.add(fBox(1.24, 0.14, 0.14, fBois, -1.6, 1.97, fz + 3.76));   // porte de la pièce de vie
  if (decorReady()) {                                                                            // armes accrochées au mur du fond
    for (const [x, rz] of [[0.5, 0.5], [1.0, -0.5]]) { const e = piece('Sword_Bronze', 0, 0, 0, 0, 1.3); e.rotation.z = rz; e.position.set(x + 0.25, 2.0, fz + 3.74); top.add(e); }
    const bo = piece('Shield_Wooden', 0, 0, 0, 0, 1.25); bo.rotation.y = PI; bo.position.set(2.6, 2.0, fz + 3.76); top.add(bo);
  } else for (let i = 0; i < 3; i++) top.add(box(0.08, 1.0, 0.14, 0xcfd6dd, 0.6 + i * 0.6, 2.1, fz + 3.76));
  top.add(fBox(9.6, 0.3, 0.34, fBois, 0, 3.3, fz - 4.1));                                         // poutre de façade
  { const toit = prism(10.6, 2.6, 9.6, 0xffffff, 0, 3.4, fz); toit.traverse((o) => { if (o.isMesh) o.material = fToit; }); top.add(toit); }
  top.add(fBox(0.9, 2.2, 0.9, fPierre, -3.2, 5.0, fz + 2.6)); top.add(fBox(1.1, 0.16, 1.1, fPierre, -3.2, 6.1, fz + 2.6));
  st.add(top, 0, 0); st.roofs.push({ obj: top, x1: -4.6, x2: 4.6, z1: 22.6, z2: 31.2 });
  if (!feu) { const f = fumee({ n: 18, couleur: 0xc8c2bc, large: 0.5, haut: 7, taille: [0.6, 2.8], vent: [0.34, 0.1], vitesse: 0.1, alpha: 0.5 }); st.add(f, -3.2, fz + 2.6, 0, 6.2); }
  st.prop(makeAnvil(), 0, fz - 0.4, 0, 0.6);
  // le foyer : un massif de pierre, une hotte, les braises
  st.deco(fBox(2.2, 1.0, 1.4, fPierre, -3.1, 0.5, fz + 3.0)); st.wall(-4.2, fz + 2.2, -2.0, fz + 3.8);
  st.deco(box(1.7, 0.06, 1.0, 0x1c1612, -3.1, 1.02, fz + 3.0)); st.deco(fBox(2.3, 0.9, 0.5, fPierre, -3.1, 2.75, fz + 3.5));
  st.deco(box(0.9, 0.5, 0.6, 0x7a4a2a, -1.6, 0.45, fz + 2.6));                                    // soufflet
  if (!feu) st.add(makeFire(0.7, true), -3.1, fz + 3.0, 0, 1.0);
  st.prop(cyl(0.6, 0.55, 0.8, 0x6a4a2a, 0, 0.4, 0, 10), 3.1, fz + 2.6, 0, 0.65); st.deco(disc(0.5, 0x3a6a9a, 3.1, 0.81, fz + 2.6));
  if (decorReady()) {
    st.deco(piece('WeaponStand', 0, 0, 0, 0, 1.15), 3.85, fz - 1.5, -PI / 2); st.wall(3.5, fz - 2.4, 4.3, fz - 0.6);                 // râtelier d'armes
    st.deco(piece('Workbench', 0, 0, 0, 0, 1), -3.65, fz - 1.9, PI / 2); st.wall(-4.2, fz - 3.0, -3.1, fz - 0.8);                    // établi
    st.deco(piece('Bucket_Metal', 0, 0, 0, 0, 1), -3.7, fz - 2.4, 0.4, 0.89); st.deco(piece('Sword_Bronze', 0, 0, 0, 0, 1.1), -3.6, fz - 1.5, 0.3, 0.93).rotation.z = PI / 2;
    st.deco(piece('Whetstone', 0, 0, 0, 0, 1), -3.5, fz + 0.5, PI / 2); st.circle(-3.5, fz + 0.5, 0.55);                              // meule
    st.deco(piece('Bag', 0, 0, 0, 0, 0.9), 3.7, fz + 0.6, -PI / 2); st.circle(3.7, fz + 0.6, 0.35);                                    // sac de charbon
    st.deco(buches(rng(31)), 3.6, fz - 3.6, 0);
  } else {
    st.deco(box(0.3, 1.6, 2.2, 0x5a3e24, 4.1, 0.8, fz - 1.5)); st.wall(3.8, fz - 2.7, 4.3, fz - 0.3);
    for (let i = 0; i < 4; i++) st.deco(box(0.06, 1.1, 0.08, 0x9aa0a8, 3.9, 1.0, fz - 2.3 + i * 0.5));
  }
  S.forge = { x: 0, z: fz }; S.chestForge = { x: 3.5, z: fz + 3.5 };

  // ---------- Version en feu ----------
  if (feu) {
    let lights = 0;
    for (const [x, z, h] of S.fires) {
      st.add(makeFire(2.4 + R(), false), x, z, 0, h * 0.9);
      st.add(makeFire(1.6, false), x + 1.8, z - 1.2, 0, h * 0.7);
      st.add(makeSmoke(4, 1.5), x, z, 0, h + 2);
    }
    for (const [x, z] of [[-6, -6], [8, 8], [-9, 14], [-12, -2], [4, -13]]) { st.add(makeFire(1.1 + R() * 0.6, lights++ < 3), x, z); st.circle(x, z, 0.7); }
    st.add(makeFire(2.2, true), 0, fz + 2, 0, 4.2);
    // Poutres tombées : l'auberge et la route du sud sont bloquées
    for (const [x, z, ry] of [[14, 1, 0.3], [14.5, -2, -0.5], [9.5, 20, 1.2], [8.5, 19, 0.6]]) { const b = box(6, 0.5, 0.5, 0x2a1c14, 0, 0.4, 0); b.rotation.z = 0.12; st.deco(b, x, z, ry); st.add(makeFire(0.9, false), x, z, 0, 0.3); }
    st.wall(12.5, -5, 13.5, 4); st.wall(5.5, 18.5, 13, 20);
    // La colline du général (sud-est, hors d'atteinte)
    const hill = sph(1, 0x4a4a30, 0, 0, 0); hill.scale.set(34, 15, 34); st.deco(hill, 62, 46);
    S.colline = { x: 62, z: 46, y: 7.5 };
  }
  if (!feu) sprinkle(st, 420, rng(5), [-40, 40, -48, 40], (x, z) => Math.hypot(x, z) < 14 || Math.abs(x) < 3 || Math.abs(z) < 2.6 || Math.abs(z + 25) < 4.5 || (Math.abs(x) < 6 && z > 20 && z < 33) || (x > 7 && x < 12 && z > 8) || (x > 4 && x < 24 && z < -31));
  st.bake();
  return st;
}

// ============================================================
//  BOIS DE BRUMEVAL (tutoriel de combat)
// ============================================================
export function buildBois() {
  const R = rng(23);
  const st = new Stage({ name: 'bois', bounds: [-27, 27, -31, 25], sky: 0xa8d8ff, fog: [0xc8e8ff, 70, 700], hemi: [0xffffff, 0x7aa05a, 1.05], sun: [0xfff0c8, 1.2, [30, 50, 40]], music: 'forest' });
  const S = st.spots = {};
  st.deco(flat(600, 600, 0x78b856, 0, 0, 0));
  st.deco(flat(3.2, 30, 0xd0b888, 0, 0.04, 12));
  st.deco(disc(9.5, 0x8cc866, 0, 0.05, 0));
  st.deco(flat(3.0, 16, 0xd0b888, 0, 0.04, -14));
  for (let i = 0; i < 26; i++) st.deco(disc(1.5 + R() * 2, 0x9ad872, -25 + R() * 50, 0.045, -28 + R() * 50));   // taches de soleil
  // Lisières
  treeLine(st, [[-3.5, 26], [-28, 26], [-28, -32], [28, -32], [28, 26], [3.5, 26]], R, { type: 'birch', scale: 1, step: 2.6 });
  // Bouleaux épars
  for (let i = 0; i < 60; i++) {
    const x = -25 + R() * 50, z = -29 + R() * 52;
    if (Math.abs(x) < 3.2 || Math.hypot(x, z) < 11 || (Math.abs(x) < 9 && z < -18)) continue;
    st.deco(makeTree(R() < 0.8 ? 'birch' : 'round', 0.8 + R() * 0.5), x, z, R() * 6); st.circle(x, z, 0.35);
  }
  scatter(st, 30, R, [-26, 26, -30, 24], (r) => makeBush(0.5 + r() * 0.5), (x, z) => Math.abs(x) < 3 || Math.hypot(x, z) < 10 || (Math.abs(x) < 9 && z < -18));
  scatter(st, 180, R, [-110, 110, -110, 110], (r) => makeTree(r() < 0.7 ? 'birch' : 'round', 0.9 + r() * 0.6), (x, z) => x > -30 && x < 30 && z > -34 && z < 28);
  st.prop(sign('Bois de Brumeval — attention aux loups.'), 2.8, 20, PI, 0.3); S.panneau = { x: 2.8, z: 20 };
  // Mannequin de paille planté par Hagen
  const man = new THREE.Group(); man.add(box(0.14, 1.9, 0.14, 0x5a3e24, 0, 0.95, 0)); man.add(box(1.3, 0.14, 0.14, 0x5a3e24, 0, 1.45, 0)); man.add(cyl(0.3, 0.36, 0.9, 0xd8c070, 0, 1.2, 0, 8)); man.add(sph(0.46, 0xe0c880, 0, 1.95, 0));
  st.prop(man, -4.5, -2, 0.4, 0.5); S.mannequin = { x: -4.5, z: -2 };
  // Le rocher plat
  const rock = new THREE.Group(); const r1 = sph(1, 0x8e8e88, 0, 0, 0); r1.scale.set(9, 2.2, 6); rock.add(r1); rock.add(box(5, 0.5, 3.4, 0x9a9a94, 0, 0.9, 0));
  st.deco(rock, 0, -26.5); st.wall(-4.2, -29, 4.2, -24.4);
  st.prop(makeRock(1.2), 6.5, -25, 0, 1.2); st.prop(makeRock(0.9), -6.5, -26, 0, 1.0);
  S.rocher = { x: 0, z: -22.5 }; S.chest = { x: 8.6, z: -28.6 };
  // Fumée du village (cachée jusqu'à la cinématique), au sud
  const smoke = new THREE.Group(); for (const dx of [-18, 0, 20]) { const s = makeSmoke(6, 4, 0x1e1e1e); s.scale.setScalar(6); s.position.set(dx, 0, 0); smoke.add(s); }
  smoke.userData.anim = (dt, m, t) => smoke.children.forEach(c => c.userData.anim(dt, m, t));
  smoke.visible = false; st.add(smoke, 0, 150); S.smoke = smoke;
  st.deco(makeMountain(95, 150, 0xe8b860, 0xfff2c8, { brume: st.fog[0], voile: 0.3, foret: 0x9a8a5a, graine: 5 }), 15, -340);
  skyDecor(st, R);
  sprinkle(st, 380, rng(6), [-27, 27, -31, 25], (x, z) => Math.abs(x) < 2.2, ['Grass_Common_Short', 'Grass_Common_Short', 'Clover_1', 'Flower_3_Single', 'Flower_4_Single', 'Plant_1', 'Plant_7', 'Mushroom_Common', 'Pebble_Round_2']);
  st.bake();
  return st;
}

// ============================================================
//  BOIS DES MURMURES (la berge, les ronces, la clairière, le camp, le pont brisé)
//  Le joueur progresse vers le sud (+z).
// ============================================================
export function buildMurmures(flags = {}) {
  const R = rng(37);
  const st = new Stage({ name: 'murmures', bounds: [-34, 28, -39.5, 124], sky: 0x29484a, fog: [0x2f5458, 16, 95], hemi: [0xd0f4ec, 0x3a5a48, 1.15], sun: [0xe0f0d8, 0.9, [-20, 50, -30]], music: 'forest', pitch: 0.7 });
  const S = st.spots = {};
  const wallO = { type: 'pine', scale: 1.25, tint: 0x1f4a38, step: 2.2 };
  st.deco(flat(600, 600, 0x2f5a3e, 0, 0, 40));
  // Sentier
  st.deco(flat(3.4, 150, 0x6a6248, 0, 0.04, 46));
  st.deco(flat(18, 3, 0x6a6248, 12, 0.04, 11));

  // --- La berge ---
  st.deco(flat(600, 80, 0x3a7a9a, 0, 0.05, -80));
  st.deco(flat(36, 17, 0xb0aa98, 0, 0.045, -32.5));       // galets
  for (let i = 0; i < 40; i++) st.deco(sph(0.25 + R() * 0.35, 0x9a968c, -16 + R() * 32, 0.05, -40 + R() * 14));
  for (let i = 0; i < 26; i++) { const x = -17 + R() * 34; st.deco(cyl(0.03, 0.05, 1.6 + R(), 0x7a9a4a, x, 0.9, -40.6 + R() * 1.2, 4)); }   // roseaux
  const boat = new THREE.Group(); boat.add(box(1.4, 0.5, 3.4, 0x6a4a2a, 0, 0.25, 0)); boat.add(box(1.0, 0.3, 3.0, 0x3a2a1a, 0, 0.42, 0)); boat.rotation.z = 0.25;
  st.prop(boat, -11, -35, 0.5, 1.5); S.barque = { x: -9.3, z: -33.6 };
  treeLine(st, [[-18, -41], [-18, -24], [-5.5, -24]], R, wallO); treeLine(st, [[18, -41], [18, -24], [5.5, -24]], R, wallO);
  S.reveil = { x: 0, z: -33 };

  // --- Le sentier des ronces ---
  treeLine(st, [[-5.5, -24], [-5.5, 34]], R, wallO);
  treeLine(st, [[5.5, -24], [5.5, 8]], R, wallO);
  treeLine(st, [[5.5, 8], [13, 7.5], [14, 4], [24, 4], [24, 18], [14, 18], [13, 14.5], [5.5, 14], [5.5, 34]], R, wallO);
  S.ronces = [];
  [-15, 1, 24].forEach((z, i) => {
    const b = makeBramble(); const col = st.wall(-5, z - 0.8, 5, z + 0.8);
    if (flags['ronces' + i]) col.off = true; else st.add(b, 0, z);
    S.ronces.push({ obj: b, col, x: 0, z, i });
  });
  S.chestFer = { x: 20.5, z: 11 };

  // --- La clairière aux champignons ---
  st.deco(disc(15, 0x3a6a48, 0, 0.045, 47));
  treeLine(st, [[-5.5, 34], [-18, 35.5], [-22, 42]], R, wallO);
  treeLine(st, [[-22, 52.5], [-18, 59], [-5.5, 60.5]], R, wallO);
  treeLine(st, [[5.5, 34], [18, 35.5], [21.5, 47], [18, 59], [5.5, 60.5]], R, wallO);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2 + 0.39, x = Math.cos(a) * 8, z = 47 + Math.sin(a) * 8; st.deco(makeGlowShroom(5 + R() * 2.5), x, z); st.circle(x, z, 0.45); }
  const gl = new THREE.PointLight(0x5ac8ff, 1.3, 30, 1.4); gl.position.set(0, 3, 47); st.group.add(gl);
  S.herbe = { x: 14.5, z: 41 };
  // Le vieux chêne creux et le père Anselme
  st.deco(makeTree('big', 2.2, 0x2a5a34), -27.5, 47.2); st.circle(-27.5, 47.2, 2.4).tall = true;
  st.deco(box(1.6, 2.6, 0.5, 0x1a120c, -25.6, 1.3, 47.2));
  treeLine(st, [[-22, 42], [-27, 41.5], [-31.5, 44]], R, wallO); treeLine(st, [[-31.5, 50.5], [-27, 53], [-22, 52.5]], R, wallO);
  st.deco(sph(0.4, 0xffc060, -24.6, 2.6, 46.2, { emissive: 0xff9a30, emissiveIntensity: 1 }));
  S.anselme = { x: -23.6, z: 47.2 };

  // --- Le camp ---
  treeLine(st, [[-5.5, 60.5], [-5.5, 65], [-13, 66.5], [-14, 81], [-5.5, 82.5], [-5.5, 88]], R, wallO);
  treeLine(st, [[5.5, 60.5], [5.5, 65], [13.5, 66.5], [14.5, 81], [5.5, 82.5], [5.5, 88]], R, wallO);
  st.deco(disc(8, 0x4a6a48, 0, 0.045, 74));
  { const r = eau(15, 1.8, { fond: 0x1c4a5a, clair: 0x5aa8b0, ciel: 0x6a9a8a, horizon: 0x9ac0b0, angle: PI / 2, eclats: 0.5, relief: 0.8 }); r.position.set(10.6, 0.05, 74); st.add(r); }        // ruisseau
  const camp = makeCampfire(); st.add(camp, 3, 74); st.circle(3, 74, 0.8); S.camp = camp; S.campPos = { x: 3, z: 74 };
  const seat = cyl(0.3, 0.3, 2.2, 0x5a4026, 0, 0.3, 0, 6); seat.rotation.z = PI / 2; st.prop(seat, 5.8, 72.2, 0.6, 0.7);
  const statue = makeStatue(); st.add(statue, -7.5, 71.5, 0.9); st.circle(-7.5, 71.5, 0.9);
  for (let i = 0; i < 5; i++) st.deco(sph(0.7, 0x2f6a3a, -7.5 + (R() - 0.5) * 1.2, 0.3 + i * 0.35, 71.5 + (R() - 0.5) * 1.2));   // lierre
  S.statue = { x: -7.5, z: 71.5 };

  // --- Le pont brisé ---
  treeLine(st, [[-5.5, 88], [-14, 89], [-15, 100]], R, wallO); treeLine(st, [[5.5, 88], [14, 89], [15, 100]], R, wallO);
  st.deco(disc(9, 0x4a5a40, 0, 0.045, 94));
  st.deco(flat(600, 10, 0x0c1614, 0, 0.06, 105));            // le ravin
  st.deco(flat(600, 1.2, 0x1c2c24, 0, 0.065, 100.4)); st.deco(flat(600, 1.2, 0x1c2c24, 0, 0.065, 109.6));
  st.wall(-200, 99.7, -1.25, 110.3); st.wall(1.25, 99.7, 200, 110.3);
  S.gate = st.wall(-1.25, 99.7, 1.25, 100.4);
  for (const x of [-1.6, 1.6]) { st.deco(box(0.3, 1.6, 0.3, 0x5a3e24, x, 0.8, 99.6)); st.deco(box(0.3, 1.6, 0.3, 0x5a3e24, x, 0.8, 110.4)); }
  const p1 = box(3, 0.2, 2.6, 0x7a5a36, 0, 0.1, 100.9); p1.rotation.x = 0.35; st.deco(p1, 0, 100.9, 0, 0.35);
  const p2 = box(3, 0.2, 2.2, 0x7a5a36, 0, 0.1, 109.3); p2.rotation.x = -0.3; st.deco(p2, 0, 109.3, 0, 0.3);
  const log = cyl(0.9, 1.0, 11.5, 0x4e3a26, 0, 0, 0, 8); log.rotation.x = PI / 2; const logTop = box(1.5, 0.1, 11.5, 0x6a5236, 0, 0.9, 0); const logG = new THREE.Group(); logG.add(log); logG.add(logTop);
  logG.visible = !!flags.troll; st.add(logG, 0, 105, 0, -0.8); S.log = logG;
  if (flags.troll) S.gate.off = true;
  st.prop(makeCart(true), -7, 92, 0.7, 1.6);
  for (const [x, z] of [[-4.5, 93.5], [-5.5, 95], [-3.4, 91.6], [4.2, 96.5]]) { st.deco(sph(0.9, 0xc8b480, x, 0.3, z)); st.circle(x, z, 0.45); }
  S.troll = { x: 0, z: 95.5 };
  // Après le ravin
  treeLine(st, [[-5.5, 110.5], [-5.5, 126]], R, wallO); treeLine(st, [[5.5, 110.5], [5.5, 126]], R, wallO);

  // Grands arbres anciens derrière les lisières, champignons lumineux, brume
  scatter(st, 150, R, [-70, 70, -45, 150], (r) => makeTree('big', 0.9 + r() * 0.7, r() < 0.5 ? 0x1f4a34 : 0x285a3a), (x, z) => {
    if (Math.abs(x) < 9 && z > -42) return true; if (z < -22 && Math.abs(x) < 21) return true;
    if (z > 30 && z < 64 && x > -35 && x < 25) return true; if (z > 62 && z < 102 && Math.abs(x) < 18) return true; if (x > 4 && x < 27 && z > 1 && z < 21) return true;
    return z > 98 && z < 112;
  });
  const walk = (x, z) => (Math.abs(x) < 4.2);
  scatter(st, 60, R, [-16, 22, -24, 120], (r) => makeGlowShroom(0.6 + r() * 1.2), (x, z) => Math.abs(x) < 1.9 || (z > 98 && z < 112));
  scatter(st, 30, R, [-16, 20, -38, 120], (r) => makeRock(0.3 + r() * 0.4, 0x5a6a5a), (x, z) => Math.abs(x) < 2.5 || (z > 98 && z < 112) || z < -24 && false);
  sprinkle(st, 420, rng(7), [-16, 20, -38, 120], (x, z) => Math.abs(x) < 2 || (z > 98 && z < 112), ['Fern_1', 'Plant_1', 'Plant_7', 'Mushroom_Common', 'Clover_1', 'Pebble_Round_3']);
  st.bake();
  return st;
}

// ============================================================
//  LE RELAIS DU CERF BLANC
// ============================================================
export function buildRelais() {
  const R = rng(51);
  const st = new Stage({ name: 'relais', bounds: [-21, 21, -21, 21], sky: 0xf0b890, fog: [0xf0c8a0, 50, 240], hemi: [0xfff0e0, 0x6a7a4a, 1.0], sun: [0xffd0a0, 1.15, [-40, 30, -10]], music: 'camp', pitch: 0.55 });
  const S = st.spots = {};
  st.deco(flat(600, 600, 0x7aa850, 0, 0, 0));
  st.deco(flat(3.6, 300, 0xd0b888, 0, 0.04, 0));
  st.deco(disc(12, 0xc8b890, 0, 0.05, 0));
  // L'auberge à colombages
  const relais = st.house(makeHouse(14, 9, 4.6, 0xf4eee2, 0x8a4a36, { flowers: true, roofH: 3.4 }), -13, 1, 14, 9, PI / 2);
  S.maisons = [{ obj: relais, type: 'auberge', id: 'relais', palette: 'relais' }]; fumeeCheminee(st, relais, { n: 20, large: 0.55, couleur: 0xf0e0d0 });
  for (let i = 0; i < 5; i++) st.deco(box(0.12, 4.4, 0.16, 0x5a3e24, -8.45, 2.3, -5 + i * 3));
  st.deco(box(0.1, 0.1, 1.6, 0x5a3e24, -7.8, 4.2, 3.4)); st.deco(box(0.08, 0.9, 1.2, 0xf4f0e8, -7.6, 3.5, 3.9));   // enseigne au cerf
  st.deco(sph(0.4, 0x8a5a36, -7.5, 3.5, 3.9));
  S.berthe = { x: -7.2, z: 2.9 };                            // (Berthe tient son comptoir, dans l'auberge : voir interieurs.js)
  // L'écurie
  st.deco(flat(9, 7, 0x9a8a60, 11.5, 0.06, 10));
  for (const [x, z] of [[7.2, 6.7], [15.8, 6.7], [7.2, 13.3], [15.8, 13.3]]) { st.deco(box(0.3, 3, 0.3, 0x5a3e24, x, 1.5, z)); st.circle(x, z, 0.3); }
  const eRoof = new THREE.Group(); eRoof.add(prism(10, 1.8, 8, 0x8a4a36, 0, 3, 0)); st.add(eRoof, 11.5, 10); st.roofs.push({ obj: eRoof, x1: 7, x2: 16, z1: 6.5, z2: 13.5 });
  st.deco(box(9, 3, 0.3, 0x7a5a36, 11.5, 1.5, 13.6)); st.wall(7, 13.4, 16, 13.9);
  st.deco(box(0.3, 3, 7, 0x7a5a36, 16.1, 1.5, 10)); st.wall(15.9, 6.5, 16.3, 13.8);
  for (const [x, z, h] of [[13.4, 11.6, 1.2], [14.6, 10.4, 1.2], [13.2, 10.2, 1.2]]) { st.deco(box(1.3, h, 1.3, 0xd8c060, x, h / 2, z)); st.circle(x, z, 0.75); }
  st.deco(box(1.3, 1.0, 1.3, 0xd8c060, 13.9, 1.7, 11.0));
  st.add(makeHorse(0x8a5a36), 9.3, 10.5, PI); st.circle(9.3, 10.5, 1.1);   // personnage animé : ne doit pas être fusionné avec le décor fixe
  S.chest = { x: 14.9, z: 12.4 };
  // Cour : puits, statue d'Aube, colporteur, table des gardes
  st.prop(makeWell(), 4.5, -7, 0, 1.25);
  const statue = makeStatue(); st.add(statue, 5.5, 2, -PI / 2); st.circle(5.5, 2, 0.9); S.statue = { x: 5.5, z: 2 };
  st.prop(makeCart(false), 10.5, -11.5, 0.5, 1.7); st.prop(makeCrate(), 8.6, -12.6, 0.3, 0.6); st.prop(makeCrate(0.6), 8.4, -11.4, 0.8, 0.5);
  S.colporteur = { x: 8.2, z: -9.6 };
  st.deco(box(2.2, 0.12, 1.2, 0x8a6a40, -5, 0.9, -10)); for (const [x, z] of [[-5.9, -10.4], [-4.1, -10.4], [-5.9, -9.6], [-4.1, -9.6]]) st.deco(box(0.12, 0.9, 0.12, 0x5a3e24, x, 0.45, z));
  st.wall(-6.1, -10.6, -3.9, -9.4);
  S.gardes = [{ x: -6.9, z: -10 }, { x: -3.1, z: -10 }];
  for (const [x, z] of [[-7.6, -4.6], [-7.6, 6.8]]) st.prop(makeBarrel(), x, z, 0, 0.45);
  st.deco(makeFence(14), -11, 14, 0); st.wall(-18, 13.8, -4, 14.2); st.deco(makeFence(12), 12, -16, 0); st.wall(6, -16.2, 18, -15.8);
  st.prop(sign('Solméria, la Cité Blanche — deux jours de marche vers le sud.'), 3, 17, 0, 0.3); S.panneau = { x: 3, z: 17 };
  // Alentours
  for (const [x, z] of [[-18, -12], [-16, -18], [17, -4], [18, 16], [-17, 18], [14, -19]]) { st.deco(makeTree('round', 1.1 + R() * 0.5), x, z); st.circle(x, z, 0.5); }
  scatter(st, 170, R, [-120, 120, -120, 120], (r) => makeTree(r() < 0.3 ? 'pine' : 'round', 0.9 + r() * 0.7), (x, z) => (Math.abs(x) < 24 && Math.abs(z) < 24) || Math.abs(x) < 5);
  scatter(st, 16, R, [-20, 20, -20, 20], (r) => makeBush(0.5 + r() * 0.5), (x, z) => Math.hypot(x, z) < 13 || Math.abs(x) < 3 || (x < -5 && z > -5 && z < 8) || (x > 6 && z > 5));
  skyDecor(st, R, { mount: 0x8a7a90 });
  sprinkle(st, 300, rng(8), [-22, 22, -22, 22], (x, z) => Math.abs(x) < 3.5 || (x < -5 && z > -5 && z < 8) || (x > 6 && x < 17 && z > 5 && z < 14) || Math.hypot(x, z) < 5);
  st.bake();
  return st;
}
