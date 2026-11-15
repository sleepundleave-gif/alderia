// ============================================================
//  LES LIEUX DES CHAPITRES 7 ET 8 : Port-Azur, l'entrepôt des Mouettes Noires,
//  le pont de la Vouivre (nuit, jour, mer gelée) et le temple englouti.
//  Convention : nord = -z, est = +x. 1 unité = 1 mètre.
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { Stage } from './engine.js';
import { horizon, eau } from './paysage.js';
import { piece, hasPiece } from './decor.js';
import { box, sph, cyl, cone, flat, disc, mat, makeHouse, makeStatue, makeCrate, makeBarrel, makeStall } from './models.js';
import { bloc as B, colonne as C, dalle as G, matiere as W, room, rng } from './world3.js';
import { murs, plaque, lueur, lumiere, brasero, particules, grille } from './world5.js';

const PI = Math.PI;

// Un voilier vu du quai ou du large : coque, pont, deux mâts, voiles
function navire(L = 30) {
  const g = new THREE.Group(), bois = 0x5a3a24, clair = 0x8a6a40;
  g.add(box(L, 3.2, 7, bois, 0, 0.4, 0)); g.add(box(L - 3, 0.3, 6.6, clair, 0, 2.1, 0));
  g.add(box(6, 2.4, 7, bois, L / 2 - 3, 3.2, 0)); g.add(box(5, 1.6, 6.4, bois, -L / 2 + 2.5, 2.8, 0));
  const proue = cone(3.4, 7, bois, -L / 2 - 3, 0.8, 0, 4); proue.rotation.z = PI / 2; g.add(proue);
  const beaupre = cyl(0.14, 0.2, 7, clair, -L / 2 - 4, 3.6, 0, 6); beaupre.rotation.z = PI / 2 - 0.3; g.add(beaupre);
  for (const [x, h] of [[-5, 17], [6, 14]]) {
    g.add(cyl(0.22, 0.34, h, clair, x, 2 + h / 2, 0, 8));
    for (const [y, w] of [[h * 0.42, 9], [h * 0.8, 7]]) { const v = cyl(0.1, 0.1, w, clair, x, 2 + y + 2.4, 0, 6); v.rotation.x = PI / 2; g.add(v); g.add(box(0.12, 4.4, w - 0.6, 0xf4eedc, x + 0.3, 2 + y, 0)); }
    g.add(box(0.06, 0.8, 1.6, 0x1a1a1a, x, 2 + h + 0.6, 0.8));
  }
  for (let x = -L / 2 + 2; x < L / 2 - 1; x += 2.4) for (const c of [-1, 1]) g.add(box(0.12, 0.9, 0.12, clair, x, 2.7, c * 3.3));
  for (const c of [-1, 1]) g.add(box(L - 3, 0.14, 0.14, clair, 0, 3.15, c * 3.3));
  return g;
}

// ============================================================
//  PORT-AZUR (chapitre 7)
// ============================================================
export function buildPortAzur() {
  const R = rng(707);
  const st = new Stage({ name: 'port', bounds: [-32, 32, -19.2, 24], sky: 0x8fcdf6, fog: [0xcfe8fa, 120, 700], hemi: [0xffffff, 0x8aa0b0, 1.15], sun: [0xfff2d0, 1.3, [-30, 60, -20]], music: 'cite', pitch: 0.95 });
  const S = st.spots = {};
  const quai = W('paves', 0xf0e2c4, 3.4, 0xd8c8a8), boisM = W('planches', 0xc8a070, 2, 0x8a6a40);
  st.deco(flat(160, 120, 0xd8c8a0, 0, -0.02, 46));
  G(st, quai, 70, 40, 0, 0, 6);
  const mer = eau(900, 500, { fond: 0x1e6a9a, clair: 0x6ad0e0, berges: false, courant: 0.35, eclats: 0.12 }); mer.position.set(0, -1.1, -264); st.add(mer);
  B(st, W('mur_blanc', 0xd8d0c0, 3, 0xb8b0a0, 1.1), 70, 1.6, 0.8, 0, -0.5, -14.2);
  // la jetée centrale et les deux pontons
  B(st, boisM, 6, 0.4, 6, 0, -0.18, -17); for (const x of [-3, 3]) for (const z of [-15, -19.6]) C(st, mat(0x5a3a24), 0.22, 3, x, -0.4, z);
  for (const x of [-18, 18]) { B(st, boisM, 3, 0.3, 10, x, -0.2, -19); for (const z of [-16, -20, -24]) for (const c of [-1, 1]) C(st, mat(0x5a3a24), 0.18, 3, x + c * 1.5, -0.4, z); }
  st.wall(-40, -26, -3, -13.8); st.wall(3, -26, 40, -13.8); st.wall(-3, -22, 3, -19.6);
  for (const x of [-24, -12, -6, 6, 12, 24]) st.deco(cyl(0.3, 0.36, 0.8, 0x3a3a40, x, 0.4, -13.2, 8));
  // la Vouivre à quai, deux barques
  // décor réaliste : un vrai trois-mâts (scan Poly Haven, 24 m de long, agrandi à 30 m) ; sinon le voilier fait de blocs
  if (hasPiece('Navire')) { const g = new THREE.Group(); g.add(piece('Navire', 0, 0, 0, 0, 1.25)); S.navire = st.add(g, 0, -24.5, 0, -1.85); }
  else S.navire = st.add(navire(30), 0, -24.5, 0, -1.3);
  for (const [x, z, r] of [[-18, -27, 0.3], [20, -26, -0.2]]) { const b = new THREE.Group(); b.add(box(5, 1, 2, 0x7a5a36, 0, 0, 0)); b.add(box(4.4, 0.2, 1.6, 0xa88a5a, 0, 0.5, 0)); st.deco(b, x, z, r, -1.0); }
  S.passerelle = { x: 0, z: -18.2 };
  // maisons de couleur : rangée du sud, orphelinat (ouest), entrepôt (est)
  const couleurs = [0xf2c8a0, 0xa8d8e8, 0xf4e0a0, 0xe8a8a8, 0xb8e0b0, 0xf0d0e0], tuile = 0xc8643a;
  S.maisons = [];                                             // toutes s'ouvrent (voir interieurs.js) ; l'orphelinat a son dortoir
  [-27, -18, -9, 9, 18, 27].forEach((x, i) => S.maisons.push({ obj: st.house(makeHouse(8, 6.5, 3.4 + (i % 2) * 0.8, couleurs[i], tuile, { flowers: true }), x, 20.5, 8, 6.5, PI), type: 'maison', id: 'port' + i }));
  S.maisons.push({ obj: st.house(makeHouse(8, 11, 4.4, 0xf4ecd8, 0x5a8ab0, { flowers: true, roofH: 3 }), -27.5, 4, 8, 11, PI / 2), type: 'auberge', id: 'port_orphelinat', label: "Entrer dans l'orphelinat" }); S.orphelinat = { x: -21.6, z: 4 };
  for (const z of [-0.4, 8.4]) { const f = new THREE.Group(); for (let k = 0; k < 6; k++) f.add(box(0.1, 1.3, 0.1, 0x3a3a42, k * 0.5, 0.65, 0)); f.add(box(2.7, 0.08, 0.08, 0x3a3a42, 1.25, 1.2, 0)); st.deco(f, -23.4, z, 0); st.wall(-23.5, z - 0.15, -20.7, z + 0.15); }
  const pancarte = new THREE.Group(); pancarte.add(box(0.1, 1.6, 0.1, 0x5a3e24, 0, 0.8, 0)); pancarte.add(box(1.5, 0.5, 0.06, 0xf0e8d0, 0, 1.5, 0)); st.prop(pancarte, -21.2, 9.6, PI / 2, 0.3); S.pancarte = { x: -21.2, z: 9.6 };
  const boisS = W('planches', 0x8a6a4a, 2.4, 0x5a4630);
  B(st, boisS, 9, 6.5, 15, 27.5, 3.25, 1); B(st, mat(0x3a2a20), 9.6, 0.5, 15.6, 27.5, 6.7, 1); B(st, mat(0x1a1410), 0.2, 3.2, 2.6, 22.95, 1.6, 1); st.wall(23, -6.5, 32, 8.5);
  B(st, mat(0x1a1a1a), 0.1, 0.9, 1.2, 22.9, 4.2, 1); S.entrepot = { x: 21.6, z: 1 };
  // étals, fontaine d'Aube, caisses, filets
  st.prop(makeStall(0x3a8ab0, 'maree'), -9, 5, 0, 0); st.wall(-10.2, 4.5, -7.8, 5.5); S.poissonniere = { x: -9, z: 3.7 };          // la marchande se tient derrière son étal
  st.prop(makeStall(0xc8503a, 'armes'), 9, 5, 0, 0); st.wall(7.8, 4.5, 10.2, 5.5); S.armurier = { x: 9, z: 3.7 };
  if (hasPiece('WeaponStand')) { st.staticGroup.add(piece('WeaponStand', 11.1, 0, 4.6, 0.25, 1)); st.circle(11.1, 4.6, 0.75); st.staticGroup.add(piece('Dummy', 6.9, 0, 4.4, 0.3, 1)); st.circle(6.9, 4.4, 0.4); st.staticGroup.add(piece('Barrel', -11.0, 0, 4.6, 0, 1)); st.circle(-11.0, 4.6, 0.5); }
  st.prop(makeStatue(), 0, 11, 0, 0.9); S.statue = { x: 0, z: 11 };
  for (const [x, z] of [[-13, -11.5], [-12, -12.2], [5.4, -12], [14, -11.6], [15.2, -12.2], [-4.6, -12], [18.6, 6], [19.4, -3.6], [-17, 12.6]]) st.prop(R() < 0.5 ? makeBarrel() : makeCrate(), x, z, R() * 6, 0.5);
  for (const x of [-22, 22]) { const m = new THREE.Group(); m.add(cyl(0.08, 0.1, 3.4, 0x5a3e24, 0, 1.7, 0, 6)); m.add(sph(0.36, 0xffe9a0, 0, 3.5, 0)); st.prop(m, x, -11, 0, 0.3); }
  // mouettes
  for (let i = 0; i < 7; i++) {
    const o = new THREE.Group(); for (const c of [-1, 1]) { const a = box(0.9, 0.05, 0.3, 0xffffff, c * 0.42, 0, 0); a.rotation.z = c * 0.3; o.add(a); } o.add(box(0.2, 0.14, 0.5, 0xf0f0f0, 0, -0.05, 0));
    const r0 = 10 + i * 3.4, v = 0.25 + (i % 3) * 0.08, h = 9 + (i % 4) * 2, ph = i * 1.7, cx = (i % 2 ? 8 : -8), cz = -12;
    o.userData.anim = (dt, m, t) => { const a = t * v + ph; o.position.set(cx + Math.cos(a) * r0, h + Math.sin(t + ph) * 0.6, cz + Math.sin(a) * r0); o.rotation.y = -a; o.children[0].rotation.z = -0.3 + Math.sin(t * 6 + ph) * 0.35; o.children[1].rotation.z = 0.3 - Math.sin(t * 6 + ph) * 0.35; };
    st.add(o, 0, 0);
  }
  horizon(st, R, { rayon: 430, mount: 0x8aa0b4 });
  S.morgane = { x: 2.4, z: -12.4 }; S.marins = [{ x: -5.6, z: -11, ry: 0.6, k: 'marin' }, { x: 12.4, z: -9.4, ry: -0.8, k: 'marin2' }, { x: -15, z: 2, ry: 1.2, k: 'marin2' }, { x: 4, z: 14, ry: PI, k: 'citadine2' }, { x: -4.4, z: 16, ry: 2.4, k: 'citadin1' }];
  S.tim = { x: -21.3, z: 6.0 }; S.nyssa = { x: -19.6, z: 6.0 };          // à côté de la porte, pas dedans : on entre dans l'orphelinat S.messager = { x: -14, z: 10 };
  st.wall(-34, 24.4, -3, 28); st.wall(3, 24.4, 34, 28);
  st.bake();
  return st;
}

// ============================================================
//  L'ENTREPÔT DES MOUETTES NOIRES, DE NUIT (chapitre 7)
// ============================================================
export function buildEntrepot() {
  const R = rng(717), H = 5;
  const st = new Stage({ name: 'entrepot', bounds: [-16, 16, -66, 8], sky: 0x080a12, fog: [0x10141e, 24, 90], hemi: [0xb8c8f0, 0x3a3440, 1.15], sun: [0xc0d0ff, 0.55, [10, 40, 20]], music: 'danger', pitch: 0.7 });
  const S = st.spots = {};
  const bois = W('planches', 0x9a7a58, 2.4, 0x5a4630, 1.1), boisS = W('planches', 0x6a543c, 2.4, 0x3a2c20), sol = W('planches', 0xb09070, 3, 0x6a5440), caisse = W('planches', 0xc8a070, 1.6, 0x8a6a40);
  G(st, sol, 40, 84, 0, 0, -29);
  const wall = murs(st, bois, H, boisS);
  room(st, -16, -48, 16, 8, { s: [[-2, 2]], n: [[-2.5, 2.5]] }, wall);            // la halle
  room(st, -10, -66, 10, -48, { s: [[-2.5, 2.5]] }, wall);                        // le bureau de Varek
  // piles de caisses : elles découpent des allées et cachent l'équipe
  const pile = (x1, z1, x2, z2, h = 2.6) => { B(st, caisse, x2 - x1, h, z2 - z1, (x1 + x2) / 2, h / 2, (z1 + z2) / 2); B(st, boisS, x2 - x1 - 0.6, 0.9, z2 - z1 - 0.6, (x1 + x2) / 2 + 0.2, h + 0.45, (z1 + z2) / 2); st.wall(x1, z1, x2, z2); };
  pile(-16, -2, -5, 0.4); pile(5, -2, 16, 0.4);                                    // derrière l'entrée
  pile(-11, -12, -2, -9.6); pile(2, -12, 11, -9.6);
  pile(-16, -24, -9, -16); pile(-3, -24, 3, -16, 3.4); pile(9, -24, 16, -16);
  pile(-11, -32, -3, -29.6); pile(3, -32, 11, -29.6);
  pile(-16, -44, -8, -37); pile(-2.4, -42, 2.4, -36, 3.4); pile(8, -44, 16, -37);
  for (const [x, z] of [[-14, 4], [13.6, 5], [-13, -6], [14, -27], [-14, -34], [0, -13.6], [6, -46]]) st.prop(R() < 0.5 ? makeBarrel() : makeCrate(), x, z, R() * 6, 0.5);
  const lant = (x, z, on = true) => { st.deco(cyl(0.05, 0.05, 1.2, 0x3a3a40, x, H - 0.6, z, 6)); st.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), lueur(0xffc060)), x, z, 0, H - 1.3); if (on) lumiere(st, x, H - 1.4, z, 0xffb060, 1.4, 16); };
  lant(0, 4); lant(-12, -14, false); lant(12, -14); lant(0, -27); lant(-12, -34.6, false); lant(12, -35); lant(0, -45, false);
  // rondes des gardes : [départ, arrivée]
  S.rondes = [
    { a: [-13, -6], b: [13, -6], k: 'coupe_jarret', ennemis: ['coupe_jarret', 'molosse'] },
    { a: [-6, -14], b: [-6, -27.4], k: 'lanceur', ennemis: ['lanceur', 'coupe_jarret'] },
    { a: [6, -27.4], b: [6, -14], k: 'coupe_jarret', ennemis: ['coupe_jarret', 'lanceur', 'molosse'] },
    { a: [-13.6, -34.4], b: [13.6, -34.4], k: 'lanceur', ennemis: ['lanceur', 'lanceur', 'coupe_jarret'] },
  ];
  S.coffres = [{ x: -14.4, z: -26.4 }, { x: 14.4, z: -46 }];
  S.statue = { x: 3.6, z: 5.4 }; st.prop(makeStatue(), 3.6, 5.4, -PI / 4, 0.7);
  // le bureau : table, coffres, le gouvernail accroché au mur
  B(st, mat(0x4a3424), 4.4, 0.9, 1.8, 0, 0.45, -61); st.wall(-2.2, -61.9, 2.2, -60.1);
  for (let i = 0; i < 5; i++) st.deco(sph(0.3, 0xe8c040, -1.6 + i * 0.8, 1.05, -61));
  const roue = new THREE.Group(); const cercle = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.12, 8, 24), mat(0x8a5a30)); roue.add(cercle);
  for (let i = 0; i < 4; i++) { const r = box(2.9, 0.12, 0.12, 0x8a5a30, 0, 0, 0); r.rotation.z = i * PI / 4; roue.add(r); } { const moyeu = cyl(0.22, 0.22, 0.2, 0xc8a040, 0, 0, 0.05, 10); moyeu.rotation.x = PI / 2; roue.add(moyeu); }
  S.gouvernail = st.add(roue, 0, -65.7, 0, 2.6);
  for (const c of [-1, 1]) { brasero(st, c * 8, -52, c > 0, 0.6); st.deco(box(0.1, 3, 2, 0x1a1a1a, c * 9.9, 3, -58)); }
  S.varek = { x: 0, z: -58 }; S.lames = [{ x: -3, z: -57 }, { x: 3, z: -57 }]; S.seuil = -50;
  st.bake();
  return st;
}

// ============================================================
//  LE PONT DE LA VOUIVRE (chapitre 8) — etat : 'nuit', 'jour' ou 'glace'
// ============================================================
export function buildPont(etat = 'nuit') {
  const nuit = etat === 'nuit', glace = etat === 'glace';
  const st = new Stage({ name: 'navire', bounds: [-4, 4, -12.6, 11.4],
    sky: nuit ? 0x081024 : glace ? 0xc8d8e8 : 0x8fcdf6, fog: nuit ? [0x0c1630, 40, 260] : glace ? [0xdfe8f0, 40, 300] : [0xcfe8fa, 120, 700],
    hemi: nuit ? [0xa8c0f0, 0x2a3048, 1.05] : [0xffffff, 0x8aa0b0, 1.15], sun: nuit ? [0xc8d8ff, 0.6, [20, 50, 10]] : [0xfff2d0, 1.25, [-30, 60, -20]], music: nuit ? 'camp' : glace ? '' : 'cite', pitch: 0.9 });
  const S = st.spots = {};
  const pont = W('planches', 0xc8a070, 2, 0x8a6a40), coque = W('planches', 0x7a5a3a, 2.4, 0x5a3a24), clair = mat(0x8a6a40);
  G(st, pont, 9, 27, 0, 0, 0);
  for (const c of [-1, 1]) { B(st, coque, 0.4, 1.1, 27, c * 4.5, 0.55, 0); B(st, clair, 0.5, 0.14, 27, c * 4.5, 1.15, 0); }
  // proue (nord) et château arrière (sud)
  for (let i = 0; i < 5; i++) { const w = 9 - i * 1.7; B(st, pont, w, 0.2, 1.4, 0, -0.1, -13.6 - i * 1.4 - 0.7); for (const c of [-1, 1]) B(st, coque, 0.4, 1.1, 1.6, c * w / 2, 0.55, -14.3 - i * 1.4); }
  const bp = cyl(0.14, 0.22, 9, 0x8a6a40, 0, 1.6, -22, 6); bp.rotation.x = PI / 2 - 0.25; st.deco(bp);
  B(st, coque, 9.4, 2.6, 5, 0, 1.3, 14); B(st, pont, 9, 0.2, 5, 0, 2.7, 14); for (const c of [-1, 1]) B(st, clair, 0.14, 0.9, 5, c * 4.4, 3.2, 14);
  B(st, mat(0x2a1c14), 1.3, 2.0, 0.14, 0, 1.0, 11.46);
  st.wall(-6, -14, -4.3, 14); st.wall(4.3, -14, 6, 14); st.wall(-6, 11.5, 6, 14); st.wall(-6, -14.5, 6, -12.9);
  // mâts, voiles, barre, canons
  for (const [z, h] of [[-4, 21], [5, 19]]) {
    C(st, clair, 0.3, h, 0, h / 2, z); st.circle(0, z, 0.5);
    // les voiles sont hautes : elles ne doivent jamais passer entre la caméra et l'équipe
    for (const [y, w] of [[h * 0.64, 10], [h * 0.86, 7.4]]) { B(st, clair, w, 0.2, 0.2, 0, y + 2.0, z); B(st, mat(nuit ? 0x8a8a9a : 0xf4eedc), w - 0.8, 3.6, 0.12, 0, y, z + 0.25); }
  }
  const barre = new THREE.Group(); barre.add(box(0.2, 1.1, 0.2, 0x5a3a24, 0, 0.55, 0)); const rr = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.06, 8, 20), mat(0x8a5a30)); rr.position.y = 1.3; barre.add(rr); for (let i = 0; i < 4; i++) { const r = box(1.5, 0.06, 0.06, 0x8a5a30, 0, 1.3, 0); r.rotation.z = i * PI / 4; barre.add(r); }
  st.prop(barre, 0, 9.6, 0, 0.5); S.barre = { x: 0, z: 9.6 };
  for (const z of [-8, 0]) for (const c of [-1, 1]) { const k = new THREE.Group(); const t = cyl(0.2, 0.26, 1.5, 0x2a2a30, 0, 0.55, 0, 10); t.rotation.z = PI / 2; k.add(t); k.add(box(0.9, 0.3, 0.7, 0x5a3a24, 0, 0.2, 0)); st.prop(k, c * 3.5, z, 0, 0.6); }
  for (const [x, z] of [[-3.2, 4.4], [3.3, 7.6], [-3.3, -10.6]]) st.prop(makeBarrel(), x, z, 0, 0.5);
  if (nuit) { for (const z of [-8, 3, 10]) { st.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), lueur(0xffc060)), 2.2, z, 0, 2.6); lumiere(st, 2.2, 2.8, z, 0xffb060, 1.3, 13); } const et = particules(st, [-160, 160, -160, 160], 500, 0xffffff, { h: 90, v: 0.0001, size: 0.5, opacity: 0.9, graine: 3 }); et.position.y = 40; et.material.fog = false; }
  // la mer, ou la glace
  if (glace) {
    st.add(plaque(700, 700, new THREE.MeshStandardMaterial({ color: 0xdcecf8, roughness: 0.25, metalness: 0.05 }), 0, -2.3, 0));
    const R = rng(88); for (let i = 0; i < 26; i++) { const a = R() * 6.28, r = 14 + R() * 70, p = new THREE.Mesh(new THREE.ConeGeometry(1 + R() * 2.4, 3 + R() * 7, 5), new THREE.MeshStandardMaterial({ color: 0xbfe4ff, roughness: 0.15, transparent: true, opacity: 0.85 })); st.add(p, Math.cos(a) * r, Math.sin(a) * r, R() * 6, -1); }
    particules(st, [-30, 30, -30, 30], 600, 0xffffff, { h: 14, v: 1.6, vent: 0.4, size: 0.14 });
  } else { const mer = eau(900, 900, nuit ? { fond: 0x06142a, clair: 0x1e4a7a, berges: false, courant: 0.35, eclats: 0.12 } : { fond: 0x1e6a9a, clair: 0x6ad0e0, berges: false, courant: 0.35, eclats: 0.12 }); mer.position.set(0, -2.3, 0); st.add(mer); }
  B(st, coque, 9.6, 2.6, 27.4, 0, -1.4, 0);
  S.morgane = { x: 1.8, z: 9 }; S.borin = { x: -1.2, z: -10.6 }; S.plongee = { x: -3.4, z: 1.6 }; S.vexia = { x: 12, y: -2.3, z: -3 };
  S.spectres = [{ x: -2, z: -6 }, { x: 2, z: -7 }, { x: 0, z: -9.6 }];
  st.bake();
  return st;
}

// ============================================================
//  LE TEMPLE ENGLOUTI (chapitre 8)
// ============================================================
export function buildTempleEau() {
  const R = rng(808), H = 5.4;
  const st = new Stage({ name: 'temple_eau', bounds: [-14, 14, -98, 8], sky: 0x06202e, fog: [0x0c3444, 22, 100], hemi: [0xb0f0f8, 0x1a5060, 1.3], sun: [0xb0f0ff, 0.6, [10, 40, 20]], music: 'egouts', pitch: 0.9 });
  const S = st.spots = {};
  const mur = W('mur_blanc', 0x8ad0d8, 3.2, 0x4a8a94, 1.2), murS = W('mur_blanc', 0x5a9aa4, 3.2, 0x3a6a74, 1.0), sol = W('paves', 0x7ab0b8, 3.4, 0x4a7a84), corail = [0xe87a8a, 0xf0a060, 0xb070d0];
  G(st, sol, 40, 116, 0, 0, -45);
  const wall = murs(st, mur, H, murS);
  room(st, -6, -14, 6, 8, { n: [[-2, 2]] }, wall);                                // entrée
  room(st, -12, -40, 12, -14, { s: [[-2, 2]], n: [[-2, 2]] }, wall);              // salle du bassin
  room(st, -12, -66, 12, -40, { s: [[-2, 2]], n: [[-2, 2]] }, wall);              // salle de l'écluse
  room(st, -5, -74, 5, -66, { s: [[-2, 2]], n: [[-2.5, 2.5]] }, wall);            // antichambre
  room(st, -14, -98, 14, -74, { s: [[-2.5, 2.5]] }, wall);                        // salle d'Ondine
  const bassin = (w, d, x, y, z, o = {}) => { const e = eau(w, d, Object.assign({ fond: 0x0a5a70, clair: 0x3ad0e0, ciel: 0x2a9ab0, horizon: 0x9af4ff, alpha: 0.72, berges: 2, courant: 0.45, eclats: 0.5 }, o)); e.position.set(x, y, z); return e; };
  // salle du bassin : une eau profonde barre la salle tant que la vanne 1 est fermée
  B(st, murS, 24, 0.3, 0.4, 0, 0.15, -21.8); B(st, murS, 24, 0.3, 0.4, 0, 0.15, -30.2);
  st.add(plaque(24, 8, new THREE.MeshBasicMaterial({ color: 0x041018 }), 0, 0.02, -26));
  S.eau1 = st.add(bassin(24, 8, 0, 0.5, -26)); S.mur1 = st.wall(-12, -30, 12, -22);
  // salle de l'écluse : une fosse à sec ; remplie, des dalles y flottent
  B(st, murS, 24, 0.3, 0.4, 0, 0.15, -49.8); B(st, murS, 24, 0.3, 0.4, 0, 0.15, -58.2);
  st.add(plaque(24, 8, new THREE.MeshBasicMaterial({ color: 0x020a10 }), 0, 0.02, -54));
  S.eau2 = st.add(bassin(24, 8, 0, 0.3, -54)); S.eau2.visible = false; S.mur2 = st.wall(-12, -58, 12, -50);
  S.dalles = new THREE.Group(); for (let i = 0; i < 4; i++) S.dalles.add(box(2.6, 0.3, 1.7, 0xc8e0e0, (i % 2 ? 0.5 : -0.5), 0.3, -57 + i * 2)); S.dalles.visible = false; st.add(S.dalles, 0, 0);
  // vannes : des roues de bronze
  const vanne = (x, z) => { const g = new THREE.Group(); g.add(cyl(0.18, 0.24, 1.2, 0x4a7a7a, 0, 0.6, 0, 10)); const w = new THREE.Group(); w.position.y = 1.3; const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 8, 18), mat(0xd8a040)); ring.rotation.x = PI / 2; w.add(ring); for (let i = 0; i < 3; i++) { const sp = box(0.86, 0.06, 0.06, 0xd8a040, 0, 0, 0); sp.rotation.y = i * PI / 3; w.add(sp); } g.add(w); g.userData.wheel = w; st.add(g, x, z); st.circle(x, z, 0.45); return g; };
  S.vannes = [{ x: 8.5, z: -17.6 }, { x: -8.5, z: -43.6 }, { x: 8.5, z: -43.6 }].map((v) => Object.assign(v, { obj: vanne(v.x, v.z) }));
  S.stele = { x: 0, z: -44.4 }; st.prop(box(1.4, 1.5, 0.3, 0x9ad0d8, 0, 0.75, 0), 3.2, -42, 0, 0.6); S.stele = { x: 3.2, z: -42 };
  // colonnes, coraux, lumières
  for (const [x, z] of [[-8, -18], [-8, -36], [8, -36], [-8, -62], [8, -62], [-9, -80], [9, -80], [-9, -92], [9, -92]]) { C(st, mur, 0.8, H + 1.4, x, (H + 1.4) / 2, z); C(st, murS, 1.05, 0.4, x, 0.2, z); st.circle(x, z, 0.9); }
  for (let i = 0; i < 26; i++) { const x = -11 + R() * 22, z = -96 + R() * 100; if (Math.abs(x) < 3 || (z < -22 && z > -30) || (z < -50 && z > -58) || (z < -66 && z > -74 && Math.abs(x) > 4)) continue; const g = new THREE.Group(), c = corail[i % 3]; for (let k = 0; k < 4; k++) { const b = cyl(0.05, 0.12, 0.6 + R() * 0.8, c, (R() - 0.5) * 0.6, 0.4, (R() - 0.5) * 0.6, 6); b.rotation.z = (R() - 0.5) * 0.8; g.add(b); } st.deco(g, x, z, R() * 6); }
  for (const [x, z] of [[0, 0], [-10, -18], [10, -34], [-10, -46], [10, -62], [0, -70], [-12, -86], [12, -86]]) lumiere(st, x, 3, z, 0x6af0ff, 1.3, 17);
  st.prop(makeStatue(), -3.4, -70, PI / 4, 0.7); S.statue = { x: -3.4, z: -70 };
  S.mobs = [
    { id: 't8a', x: 0, z: -10, enemies: ['meduse', 'meduse'], roam: 2 }, { id: 't8b', x: -4, z: -34, enemies: ['crabe', 'meduse'] },
    { id: 't8c', x: 5, z: -46, enemies: ['spectre', 'crabe'], roam: 2 }, { id: 't8d', x: 0, z: -62, enemies: ['crabe', 'crabe', 'meduse'], roam: 2 },
  ];
  S.coffres = [{ x: -10.4, z: -16.4 }, { x: 10.4, z: -64 }];
  // la salle d'Ondine : un bassin rond, l'autel
  st.add(bassin(18, 14, 0, 0.06, -88, { ondes: 1 }));
  B(st, mur, 3.4, 0.5, 2.2, 0, 0.25, -95.6); B(st, mur, 2.2, 1.1, 1.3, 0, 1.0, -95.6); st.wall(-1.7, -96.8, 1.7, -94.5);
  S.autel = { x: 0, z: -95.6 }; S.ondine = { x: 0, z: -88 }; S.seuil = -77;
  S.eclatObj = (() => { const g = new THREE.Group(); const e = new THREE.Mesh(new THREE.OctahedronGeometry(0.34), lueur(0x6ad8ff)); g.add(e); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), new THREE.MeshBasicMaterial({ color: 0x6ad8ff, transparent: true, opacity: 0.22, depthWrite: false }))); g.userData.anim = (dt, m, t) => { e.rotation.y = t * 1.4; g.position.y = 2.2 + Math.sin(t * 2) * 0.12; }; return g; })();
  st.add(S.eclatObj, 0, -95.6, 0, 2.2);
  particules(st, [-14, 14, -98, 8], 420, 0xc8f8ff, { h: 6, v: -0.7, size: 0.09, opacity: 0.8 });
  st.bake();
  return st;
}
