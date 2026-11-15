// ============================================================
//  LES LIEUX DU CHAPITRE 3 : Solméria la Cité Blanche, les toits,
//  les égouts, la salle du trône
//  Maisons, étals, tonneaux, lanternes : pièces importées (mêmes packs que Brumeval),
//  avec toits d'ardoise bleue et murs chaulés. Remparts, tours, quais et voûtes sont
//  bâtis par le code et habillés des photos de pierre de modeles/decor/tex.
//  Convention : nord = -z, est = +x. 1 unité = 1 mètre.
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { Stage } from './engine.js';
import { horizon, eau as eauVive } from './paysage.js';
import { box, sph, cyl, cone, flat, disc, mat, makeTree, makeBush, makeHouse, makeBarrel, makeCrate, makeStall, makeStatue, makeFire, makeCart, makeMountain, makeCloud } from './models.js';
import { decorReady, sprinkle, wallMat, piece } from './decor.js';

const PI = Math.PI;
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- Matières et briques de construction ----------
const BLEU = 0x5878c8;                                   // ardoise bleue de Solméria
const W = (kind, color, tile, fallback, gain) => wallMat(kind, color, tile, gain ? { gain } : {}) || mat(fallback);
const mBlanc = () => W('mur_blanc', 0xfffaf0, 3.2, 0xece8dc, 1.5), mBlancS = () => W('mur_blanc', 0xe0dcd2, 3.2, 0xc8c4b8, 1.25);
const mToit = () => W('ardoise', 0x7a9ae8, 2.4, BLEU), mPaves = (c = 0xf0ece4) => W('paves', c, 3.4, 0xcfc8b8);
const mEgout = (c = 0xffffff) => W('mur_egout', c, 3, 0x6a5444), mMarbre = (c = 0xffffff, g = 2.7) => W('marbre', c, 3, 0xe8e6e0, g);
const mBois = () => W('planches', 0xd8b890, 2, 0x8a6a40);

const UB = new THREE.BoxGeometry(1, 1, 1), UC = new THREE.CylinderGeometry(0.5, 0.5, 1, 20), UK = new THREE.ConeGeometry(0.5, 1, 20), UP = new THREE.PlaneGeometry(1, 1);
function B(st, m, w, h, d, x, y, z, ry = 0) { const o = new THREE.Mesh(UB, m); o.scale.set(w, h, d); o.position.set(x, y, z); o.rotation.y = ry; st.staticGroup.add(o); return o; }
function C(st, m, r, h, x, y, z) { const o = new THREE.Mesh(UC, m); o.scale.set(r * 2, h, r * 2); o.position.set(x, y, z); st.staticGroup.add(o); return o; }
function K(st, m, r, h, x, y, z) { const o = new THREE.Mesh(UK, m); o.scale.set(r * 2, h, r * 2); o.position.set(x, y, z); st.staticGroup.add(o); return o; }
function G(st, m, w, d, x, y, z) { const o = new THREE.Mesh(UP, m); o.rotation.x = -PI / 2; o.scale.set(w, d, 1); o.position.set(x, y, z); st.staticGroup.add(o); return o; }
// Pièce importée
function P(st, name, x, y, z, ry = 0, s = 1) { if (!decorReady()) return null; const o = piece(name, x, y, z, ry, s); st.staticGroup.add(o); return o; }

// Tour ronde coiffée d'un toit pointu bleu
function tower(st, x, z, r, h, y0 = 0, solid = true) {
  C(st, mBlanc(), r, h, x, y0 + h / 2, z); C(st, mBlancS(), r + 0.35, 0.9, x, y0 + h - 0.2, z);
  K(st, mToit(), r + 0.7, r * 2.1, x, y0 + h + 0.25 + r * 1.05, z);
  st.staticGroup.add(sph(0.5, 0xf0d060, x, y0 + h + r * 2.1 + 0.4, z));
  if (solid) st.circle(x, z, r + 0.1).tall = true;
}
// Mur de rempart crénelé entre deux points (axe x ou z)
function rampart(st, x1, z1, x2, z2, h = 9, t = 3, solid = true) {
  const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1), len = alongX ? Math.abs(x2 - x1) : Math.abs(z2 - z1), cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
  B(st, mBlanc(), alongX ? len : t, h, alongX ? t : len, cx, h / 2, cz);
  B(st, mBlancS(), alongX ? len : t + 0.5, 0.4, alongX ? t + 0.5 : len, cx, h + 0.2, cz);
  const n = Math.floor(len / 2.4);
  for (let i = 0; i < n; i++) { const u = -len / 2 + 1.2 + i * 2.4; for (const s of [-1, 1]) B(st, mBlanc(), alongX ? 1.2 : 0.5, 0.9, alongX ? 0.5 : 1.2, cx + (alongX ? u : s * t / 2), h + 0.85, cz + (alongX ? s * t / 2 : u)); }
  if (solid) st.wall(alongX ? Math.min(x1, x2) : cx - t / 2, alongX ? cz - t / 2 : Math.min(z1, z2), alongX ? Math.max(x1, x2) : cx + t / 2, alongX ? cz + t / 2 : Math.max(z1, z2)).tall = true;
}
// Bannière bleue au soleil blanc, accrochée à plat sur un mur
function blason(st, x, y, z, ry = 0, s = 1) {
  const g = new THREE.Group();
  g.add(box(1.3 * s, 3 * s, 0.06, 0x2a4aa8, 0, 0, 0)); g.add(box(1.5 * s, 0.12 * s, 0.1, 0xd8b040, 0, 1.52 * s, 0));
  const tip = cone(0.65 * s, 0.7 * s, 0x2a4aa8, 0, -1.84 * s, 0, 4); tip.rotation.x = PI; tip.scale.z = 0.06; g.add(tip);
  const sun = sph(0.62 * s, 0xffffff, 0, 0.25 * s, 0.03); sun.scale.z = 0.06; g.add(sun);
  for (let i = 0; i < 8; i++) { const a = i * PI / 4, r = box(0.1 * s, 0.34 * s, 0.05, 0xffffff, Math.sin(a) * 0.52 * s, 0.25 * s + Math.cos(a) * 0.52 * s, 0.03); r.rotation.z = -a; g.add(r); }
  g.position.set(x, y, z); g.rotation.y = ry; st.staticGroup.add(g); return g;
}
function ladder(st, x, z, h, ry = 0, y0 = 0) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) g.add(box(0.08, h, 0.08, 0x7a5a36, 0.28 * s, h / 2, 0));
  for (let y = 0.35; y < h; y += 0.4) g.add(box(0.56, 0.06, 0.06, 0x8a6a40, 0, y, 0));
  g.position.set(x, y0, z); g.rotation.y = ry; g.rotation.x = -0.12; st.staticGroup.add(g); return g;
}
// Statue d'un des Sept (fontaine) ; « worn » : le visage effacé
function septStatue(worn) {
  const g = new THREE.Group(), c = worn ? 0xb8b4a8 : 0xe8e6de;
  g.add(box(0.8, 0.7, 0.8, 0xd8d4c8, 0, 0.35, 0)); g.add(cyl(0.22, 0.34, 1.25, c, 0, 1.33, 0, 10)); g.add(sph(0.52, c, 0, 1.75, 0)); g.add(sph(0.36, c, 0, 2.17, 0));
  if (worn) g.add(box(0.3, 0.3, 0.1, 0x9a968a, 0, 2.17, 0.15)); else { const cr = cyl(0.2, 0.17, 0.12, 0xe8c860, 0, 2.38, 0, 8); g.add(cr); }
  const arm = box(0.12, 0.7, 0.12, c, 0.28, 1.9, 0.12); arm.rotation.set(-0.9, 0, -0.3); g.add(arm);
  return g;
}

// Pièce rectangulaire fermée de murs, avec des ouvertures.
// gaps : { n: [[a, b]], s: [...], e: [...], w: [...] } (a..b le long du mur, en coordonnées du monde)
// visual(x1, z1, x2, z2) : dessine un tronçon de mur ; collide = false pour ne poser que le dessin
function room(st, x1, z1, x2, z2, gaps = {}, visual, tall = true, t = 0.6) {
  const seg = (a, b, list) => { const out = []; let p = a; for (const [g1, g2] of (list || []).slice().sort((u, v) => u[0] - v[0])) { if (g1 > p) out.push([p, g1]); p = Math.max(p, g2); } if (p < b) out.push([p, b]); return out; };
  const put = (ax, az, bx, bz) => { const c = st.wall(ax, az, bx, bz); c.tall = tall; if (visual) visual(ax, az, bx, bz); };
  for (const [a, b] of seg(x1 - t, x2 + t, gaps.n)) put(a, z1 - t, b, z1);
  for (const [a, b] of seg(x1 - t, x2 + t, gaps.s)) put(a, z2, b, z2 + t);
  for (const [a, b] of seg(z1, z2, gaps.w)) put(x1 - t, a, x1, b);
  for (const [a, b] of seg(z1, z2, gaps.e)) put(x2, a, x2 + t, b);
}

function skyRing(st, R, mount = 0x8a9ab8) { horizon(st, R, { rayon: 340, mount }); }
// Le château royal sur son île (décor lointain, vu de la ville et des toits)
function castle(st, cx, cz, y0 = 0) {
  B(st, mBlanc(), 64, 3.2, 62, cx, y0 - 1.6, cz);                                        // l'île
  B(st, mBlanc(), 40, 20, 26, cx, y0 + 10, cz - 6); B(st, mBlancS(), 41, 0.6, 27, cx, y0 + 20.3, cz - 6);
  B(st, mToit(), 30, 1.2, 18, cx, y0 + 21, cz - 6);
  B(st, mBlanc(), 16, 12, 6, cx, y0 + 6, cz + 10); B(st, mBlancS(), 17, 0.5, 7, cx, y0 + 12.2, cz + 10);   // corps de garde
  st.staticGroup.add(box(4.2, 6, 0.3, 0x4a3420, cx, y0 + 3, cz + 13.05)); st.staticGroup.add(box(4.8, 0.5, 0.4, 0xd8b040, cx, y0 + 6.2, cz + 13.1));
  for (const [dx, dz, r, h] of [[-21, 8, 4.6, 26], [21, 8, 4.6, 26], [-21, -20, 4.6, 30], [21, -20, 4.6, 30], [0, -8, 6.5, 40], [-9, 13, 2.6, 16], [9, 13, 2.6, 16]]) tower(st, cx + dx, cz + dz, r, h, y0, false);
  for (const s of [-1, 1]) blason(st, cx + s * 5.2, y0 + 8, cz + 13.1, 0, 1.5);
  for (let i = 0; i < 5; i++) st.staticGroup.add(box(1.6, 5, 0.2, [0x4a7ae0, 0xe0b040, 0xc04a6a, 0x4ac09a, 0x8a5ae0][i], cx - 14 + i * 7, y0 + 13, cz + 7.05, { emissive: [0x2a4a90, 0x806020, 0x70203a, 0x207050, 0x4a2a80][i] }));   // vitraux
}

// ============================================================
//  SOLMÉRIA — Porte Sud, quartier des Artisans, place du Marché, quartier du Canal
// ============================================================
export function buildSolmeria() {
  const R = rng(303);
  const st = new Stage({ name: 'solmeria', bounds: [-35, 35, -43.4, 66], sky: 0x9ccdfa, fog: [0xcfe4ff, 110, 620], hemi: [0xffffff, 0x8a94a8, 1.1], sun: [0xfff4d8, 1.25, [35, 60, 40]], music: 'cite', pitch: 0.52 });
  const S = st.spots = {};
  const TOIT = { roof: BLEU, plaster: 0xf6f3ea };

  // ----- Sols -----
  st.deco(flat(500, 240, 0x7aa850, 0, -0.03, 166));                // prairie devant la ville
  st.deco(flat(6, 70, 0xd0b888, 0, 0.02, 81));                     // la route du nord
  G(st, mPaves(), 78, 90.6, 0, 0, 2.3);                            // pavés de la ville (z -43 .. 47.6)
  G(st, mPaves(0xd8d0c0), 16, 34, 0, 0.012, 28.5);                 // chaussée des Artisans, plus sombre
  st.deco(disc(21, 0xe8e2d4, 0, 0.015, -10));                      // la place du Marché
  st.deco(disc(7.2, 0xcfc8b8, 0, 0.02, -10));
  // Le lac du château et le canal
  const water = eauVive(700, 400, { fond: 0x1c5a9c, clair: 0x5ab0e0, berges: false, courant: 0.3, eclats: 0.35, relief: 0.8 }); water.position.set(0, -1.5, -243); st.add(water);
  B(st, mBlancS(), 78, 1.8, 0.8, 0, -0.9, -43.4);                  // mur du quai
  for (const s of [-1, 1]) { B(st, mBlanc(), 35.4, 0.9, 0.5, s * 20.3, 0.45, -43.2); B(st, mBlancS(), 35.6, 0.14, 0.7, s * 20.3, 0.95, -43.2); }
  st.wall(-39, -44, -2.6, -42.9); st.wall(2.6, -44, 39, -42.9);
  // Le pont du château
  B(st, mBlanc(), 5.2, 1.7, 13, 0, -0.86, -49.5); G(st, mPaves(0xd8d0c0), 4.4, 13, 0, 0.012, -49.5);
  for (const s of [-1, 1]) { B(st, mBlanc(), 0.5, 0.9, 13, s * 2.6, 0.45, -49.5); for (const z of [-43.4, -49.5, -55.6]) { B(st, mBlancS(), 0.8, 1.5, 0.8, s * 2.6, 0.75, z); st.staticGroup.add(sph(0.5, 0xf0d060, s * 2.6, 1.7, z)); } }
  st.wall(-2.6, -45.3, 2.6, -44.9);                                 // les gardes ne laissent passer personne
  castle(st, 0, -88);
  S.pont = [{ x: -1.5, z: -44.2 }, { x: 1.5, z: -44.2 }];
  S.tobie = { x: 5.2, z: -41.4 };

  // ----- Remparts et Porte Sud -----
  rampart(st, -39, 46, -3.4, 46); rampart(st, 3.4, 46, 39, 46);
  B(st, mBlanc(), 6.8, 3.4, 3, 0, 7.3, 46); B(st, mBlancS(), 7, 0.4, 3.5, 0, 9.2, 46); B(st, mBlancS(), 6.8, 0.5, 3.2, 0, 5.5, 46);
  for (let i = 0; i < 6; i++) st.staticGroup.add(box(0.12, 1.4, 0.12, 0x3a3a40, -2.6 + i * 1.04, 4.75, 46.6));      // herse relevée
  st.staticGroup.add(box(6.4, 0.14, 0.14, 0x3a3a40, 0, 4.2, 46.6));
  tower(st, -6.6, 47.6, 3.4, 13); tower(st, 6.6, 47.6, 3.4, 13);
  const porche = st.wall(-3.4, 44.5, 3.4, 47.5); porche.tall = true; porche.ghost = true;      // sous le porche, la caméra se rapproche au lieu de traverser la pierre
  rampart(st, -37.5, 44.5, -37.5, -43, 9, 3); rampart(st, 37.5, 44.5, 37.5, -43, 9, 3);
  for (const [x, z] of [[-37.5, 46], [37.5, 46], [-37.5, 2], [37.5, 2], [-37.5, -43], [37.5, -43]]) tower(st, x, z, 3.8, 14);
  for (const x of [-6.6, 6.6]) blason(st, x, 7.5, 51.05, 0, 1.3);
  for (const x of [-22, -13, 13, 22]) blason(st, x, 5.6, 47.55, 0, 1.1);
  blason(st, 0, 7.4, 44.45, PI, 1.2);
  S.porte = [{ x: -2.4, z: 49.2 }, { x: 2.4, z: 49.2 }]; S.renaud = { x: 2.2, z: 42.6 };

  // ----- Maisons : toits d'ardoise bleue, murs chaulés -----
  const house = (x, z, w, d, h, ry, o = {}) => st.house(makeHouse(w, d, h, 0xf6f3ea, BLEU, Object.assign({ flowers: R() < 0.6 }, TOIT, o)), x, z, w, d, ry);
  // Quartier des Artisans (la rue fait 18 m de large)
  S.maisons = [{ obj: house(-13.5, 38.5, 9, 9, 4.6, PI / 2, { brick: true }), type: 'armurerie', id: 'sol_fer', palette: 'cite', label: 'Entrer « Au Fer Droit »' }];
  S.maisons.push({ obj: house(-13.5, 28, 9, 9, 3.2, PI / 2), type: 'maison', id: 'sol1', palette: 'cite' });       // maisons où l'on peut entrer (voir interieurs.js)
  S.maisons.push({ obj: house(-14, 17, 10, 10, 4.6, PI / 2, { round: true }), type: 'auberge', id: 'sol_auberge', palette: 'auberge', label: 'Entrer aux « Sept Couronnes »' });
  S.maisons.push({ obj: house(13.5, 38.5, 9, 9, 3.2, -PI / 2), type: 'maison', id: 'sol2', palette: 'cite' });
  S.maisons.push({ obj: house(13.5, 28, 9, 9, 4.6, -PI / 2, { round: true }), type: 'herboristerie', id: 'sol_mandragore', palette: 'cite', label: 'Entrer à « La Mandragore »' });
  S.maisons.push({ obj: house(14, 17, 10, 10, 4.6, -PI / 2), type: 'maison', id: 'sol3', palette: 'cite' });
  for (const s of [-1, 1]) for (const [z, h] of [[38.5, 4.6], [27.5, 3.2], [16.5, 4.6]]) house(s * 27.5, z, 10, 9, h, s * PI / 2, { chimney: R() < 0.6 });
  st.wall(-36, 11.6, -9, 44.6).tall = true; st.wall(9, 11.6, 36, 44.6).tall = true;
  // Autour de la place
  for (const s of [-1, 1]) for (const [z, h] of [[4.5, 4.6], [-7.5, 3.2], [-19.5, 4.6]]) house(s * 30.5, z, 10, 10, h, -s * PI / 2, { round: R() < 0.4 });
  st.wall(-36, -25, -25.5, 11.6).tall = true; st.wall(25.5, -25, 36, 11.6).tall = true;
  house(-19, -33.5, 14, 8, 4.6, 0); house(19, -33.5, 14, 8, 4.6, 0, { brick: true });
  st.wall(-36, -37.5, -26, -25).tall = true; st.wall(26, -37.5, 36, -25).tall = true;

  // ----- Enseignes et devantures -----
  const enseigne = (x, z, color, s) => { st.staticGroup.add(box(0.1, 0.1, 1.5, 0x4a3420, x - s * 0.75, 3.5, z, 0)); const b = box(0.08, 0.8, 1.0, color, x - s * 1.3, 2.95, z); st.staticGroup.add(b); st.staticGroup.add(box(0.1, 0.9, 0.08, 0xe0c060, x - s * 1.3, 2.95, z)); };
  enseigne(-8.2, 41.4, 0x8a8a94, -1); enseigne(-8.2, 20.5, 0xc8a040, -1); enseigne(8.2, 31, 0x4a9a5a, 1);
  if (decorReady()) {
    P(st, 'Anvil_Log', -7.6, 0, 36.4, 0.6, 1.1); st.circle(-7.6, 36.4, 0.6); P(st, 'Barrel', -8.2, 0, 34.6); st.circle(-8.2, 34.6, 0.5); P(st, 'Crate_Wooden', -8.1, 0, 42.6, 0.3); st.circle(-8.1, 42.6, 0.55);
    P(st, 'Table_Large', 7.4, 0, 25.4, PI / 2, 0.9); st.wall(6.7, 24.3, 8.1, 26.5);
    P(st, 'Potion_1', 7.3, 0.86, 24.9); P(st, 'Potion_2', 7.5, 0.86, 25.5); P(st, 'Potion_4', 7.2, 0.86, 26.0); P(st, 'Vase_2', 8.2, 0, 23.6); P(st, 'Vase_4', 8.3, 0, 30.6);
    P(st, 'Bench', -8.1, 0, 13.6, PI / 2); P(st, 'Barrel', -8.3, 0, 21.9); P(st, 'Lantern_Wall', -9.02, 2.5, 19.2, PI / 2); P(st, 'Lantern_Wall', 9.02, 2.5, 30.2, -PI / 2);
    for (const [x, z, ry] of [[-6.2, -15.8, 0.9], [6.2, -15.8, -0.9], [-7.6, -5, 1.9], [7.6, -5, -1.9]]) { P(st, 'Bench', x, 0, z, ry); st.circle(x, z, 0.8); }
  }
  S.gontran = { x: -6.9, z: 38.4 }; S.ysolde = { x: 6.2, z: 27.6 }; S.hotesse = { x: -7.3, z: 17.2 };
  // Tableau d'affichage
  st.staticGroup.add(box(0.14, 2.2, 0.14, 0x5a3e24, 5.1, 1.1, 42.9)); st.staticGroup.add(box(0.14, 2.2, 0.14, 0x5a3e24, 7.3, 1.1, 42.9)); st.staticGroup.add(box(2.5, 1.3, 0.1, 0x9a7a4a, 6.2, 1.55, 42.9));
  for (const [x, y, c] of [[5.6, 1.8, 0xf4ecd0], [6.4, 1.7, 0xf0e0b8], [6.9, 1.35, 0xf4ecd0], [5.8, 1.25, 0xe8d8a8]]) st.staticGroup.add(box(0.42, 0.5, 0.02, c, x, y, 42.83));
  st.wall(5, 42.7, 7.4, 43.1); S.tableau = { x: 6.2, z: 42.1 };
  // Statue d'Aube
  const aube = makeStatue(); st.add(aube, -6.4, 8.6, 0); st.circle(-6.4, 8.6, 0.9); S.statue = { x: -6.4, z: 8.6 };

  // ----- La Fontaine des Sept -----
  C(st, mBlanc(), 4.4, 0.8, 0, 0.4, -10); C(st, mBlancS(), 4.6, 0.16, 0, 0.84, -10);
  const eau = eauVive(7.8, 7.8, { rond: true, ondes: 1, fond: 0x2a7ac8, clair: 0x8ad8ff, courant: 0.5, eclats: 0.7, relief: 0.7 }); eau.position.set(0, 0.94, -10); st.add(eau);
  C(st, mBlanc(), 0.7, 3.2, 0, 1.6, -10); C(st, mBlancS(), 1.9, 0.3, 0, 2.7, -10); C(st, mBlanc(), 0.35, 1.4, 0, 3.5, -10); st.staticGroup.add(sph(0.9, 0xf0d060, 0, 4.5, -10, { emissive: 0x806010 }));
  for (let i = 0; i < 8; i++) { const a = i * PI / 4, j = box(0.08, 1.5, 0.08, 0xa8d8ff, Math.sin(a) * 1.5, 1.95, -10 + Math.cos(a) * 1.5, { emissive: 0x4a80b0 }); j.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5); st.staticGroup.add(j); }
  S.sept = [];
  for (let i = 0; i < 7; i++) { const a = (i / 7) * PI * 2 + PI / 7, x = Math.sin(a) * 5.7, z = -10 + Math.cos(a) * 5.7, s = septStatue(i === 4); s.position.set(x, 0, z); s.rotation.y = a; st.staticGroup.add(s); st.circle(x, z, 0.6); S.sept.push({ x, z, worn: i === 4 }); }
  st.circle(0, -10, 4.7);
  S.fontaine = { x: 0, z: -4.6 };

  // ----- Les étals du marché -----
  S.etals = [];
  const cols = [0xc04a3a, 0x3a6ac0, 0xd8a030, 0x4a9a5a, 0xa04ab0, 0xd06a30, 0x3a9aa8, 0xc04a6a, 0x6a8a30, 0x3a6ac0];
  const genres = ['fruits', 'tissus', 'legumes', 'poisson', 'fleurs', 'poterie', 'bazar', 'pain'];          // ce que vend chaque marchand (voir story3.js)
  [38, 68, 104, 140, 220, 256, 292, 322].forEach((deg, i) => {
    const a = deg * PI / 180, x = Math.sin(a) * 14.5, z = -10 + Math.cos(a) * 14.5;
    st.deco(makeStall(cols[i], genres[i]), x, z, a + PI); st.circle(x, z, 1.5);
    S.etals.push({ x, z, a, vx: Math.sin(a) * 16.6, vz: -10 + Math.cos(a) * 16.6 });
  });
  for (const [x, z, ry, c, g] of [[-20, 3, PI / 2, 0xd8a030, 'outils'], [20, 3, -PI / 2, 0x4a9a5a, 'legumes'], [-21, -22, PI / 2, 0xc04a6a, 'potions'], [21, -22, -PI / 2, 0xd06a30, 'fruits']]) { st.deco(makeStall(c, g), x, z, ry); st.circle(x, z, 1.5); }
  S.fruits = S.etals[0];                                             // l'étal de fruits, au sud-est de la fontaine
  for (const [x, z] of [[11.5, 4.2], [12.4, 3.3], [-12, 3.6], [-17, -12], [17.4, -12.6], [-8.6, -24.2], [11, -23.4]]) st.prop(R() < 0.5 ? makeBarrel() : makeCrate(), x, z, R() * 6, 0.5);
  st.prop(makeCart(false), -14.5, -26.5, 0.5, 1.7);
  // Quelques arbres en bac
  for (const [x, z] of [[-22, 9], [22, 9], [-22, -27], [22, -27], [-8.4, 31.6], [8.4, 21.4]]) { C(st, mBlancS(), 1.1, 0.7, x, 0.35, z); st.deco(makeTree('round', 0.75), x, z, R() * 6, 0.5); st.circle(x, z, 1.15); }

  // ----- L'échelle des toits et le quai des Lavandières -----
  ladder(st, 25.3, -17.5, 7.5, -PI / 2); S.echelle = { x: 24.4, z: -17.5 };
  // bouche d'égout : margelle ronde, grille, escalier qui s'enfonce
  C(st, mBlancS(), 1.7, 0.5, -30, 0.25, -40.4); const trou = new THREE.Mesh(new THREE.CircleGeometry(1.35, 20), mat(0x0a100c, { basic: true })); trou.rotation.x = -PI / 2; trou.position.set(-30, 0.51, -40.4); st.staticGroup.add(trou);
  for (let i = 0; i < 5; i++) st.staticGroup.add(box(0.07, 0.07, 2.7, 0x3a3a40, -31.1 + i * 0.55, 0.56, -40.4));
  st.circle(-30, -40.4, 1.75); S.egout = { x: -27.6, z: -40.4 };
  for (const [x, c] of [[-20, 0xf4f0e8], [-17.5, 0xc04a3a], [-15, 0x4a7ac0], [-12.5, 0xf0e0a0]]) st.staticGroup.add(box(1.6, 1.1, 0.04, c, x, 1.75, -42.2));   // linge qui sèche
  st.staticGroup.add(box(11, 0.04, 0.04, 0x5a4a3a, -16.2, 2.32, -42.2)); for (const x of [-21.6, -10.8]) st.staticGroup.add(box(0.1, 2.4, 0.1, 0x5a3e24, x, 1.2, -42.2));
  st.prop(makeBarrel(), -11, -40.6, 0, 0.5); st.prop(makeCrate(), 12.5, -41, 0.4, 0.55);

  // ----- Devant la porte -----
  for (const [x, z] of [[-14, 56], [-24, 52], [15, 58], [26, 53], [-9, 64], [10, 65], [-30, 62], [31, 63]]) { st.deco(makeTree(R() < 0.4 ? 'birch' : 'round', 1 + R() * 0.5), x, z); st.circle(x, z, 0.6); }
  for (let i = 0; i < 60; i++) { const x = -160 + R() * 320, z = 70 + R() * 150; if (Math.abs(x) < 6) continue; st.deco(makeTree(R() < 0.3 ? 'pine' : 'round', 0.9 + R() * 0.7), x, z, R() * 6); }
  for (let i = 0; i < 8; i++) st.deco(makeBush(0.5 + R() * 0.5), (R() < 0.5 ? -1 : 1) * (5 + R() * 24), 50 + R() * 14);
  st.wall(-36, 48, -35.4, 67); st.wall(35.4, 48, 36, 67);
  skyRing(st, R);
  sprinkle(st, 220, rng(31), [-34, 34, 49, 66], (x, z) => Math.abs(x) < 3.6 || (Math.abs(Math.abs(x) - 6.6) < 3.8 && z < 51.5));
  st.bake();
  return st;
}

// ============================================================
//  LES TOITS — la poursuite (le sol du jeu est le niveau des toits)
// ============================================================
export function buildToits() {
  const R = rng(77), Y = -12.5;
  const st = new Stage({ name: 'toits', bounds: [-27, 9, -28.5, 44.5], sky: 0x9ccdfa, fog: [0xcfe4ff, 110, 620], hemi: [0xffffff, 0x8a94b8, 1.12], sun: [0xfff4d8, 1.25, [35, 60, 40]], music: 'danger', pitch: 0.6 });
  const S = st.spots = {};
  G(st, mPaves(0xcfc8b8), 400, 400, 0, Y, 0);
  // Toits praticables : [x1, z1, x2, z2, ouvertures]
  const roofs = [
    [-5, 30, 5, 44, { n: [[-1, 1]] }],
    [-7, 12, 7, 26, { s: [[-1, 1]], w: [[18, 20]] }],
    [-25, 10, -11, 28, { e: [[18, 20]], n: [[-19, -17]] }],
    [-26, -8, -10, 6, { s: [[-19, -17]], e: [[-2, 0]] }],
    [-6, -10, 8, 4, { w: [[-2, 0]], n: [[0, 2]] }],
    [-6, -28, 8, -14, { s: [[0, 2]] }],
  ];
  const planks = [[-1, 26, 1, 30, 'z'], [-11, 18, -7, 20, 'x'], [-19, 6, -17, 10, 'z'], [-10, -2, -6, 0, 'x'], [0, -14, 2, -10, 'z']];
  const edge = (ax, az, bx, bz) => { B(st, mBlancS(), Math.max(0.5, bx - ax), 0.45, Math.max(0.5, bz - az), (ax + bx) / 2, 0.22, (az + bz) / 2); };
  for (const [x1, z1, x2, z2, gaps] of roofs) {
    const w = x2 - x1, d = z2 - z1, cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    G(st, mToit(), w + 1.2, d + 1.2, cx, 0, cz); B(st, mToit(), w + 1.2, 0.5, d + 1.2, cx, -0.27, cz);
    B(st, mBlanc(), w, -Y, d, cx, Y / 2 - 0.5, cz);
    room(st, x1, z1, x2, z2, gaps, edge, false, 0.5);
  }
  for (const [x1, z1, x2, z2, ax] of planks) {
    const w = x2 - x1, d = z2 - z1, cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    B(st, mBois(), w + (ax === 'x' ? 1.4 : 0), 0.14, d + (ax === 'z' ? 1.4 : 0), cx, -0.06, cz);
    for (let i = 0; i < 4; i++) st.staticGroup.add(box(ax === 'x' ? 0.08 : w, 0.03, ax === 'x' ? d : 0.08, 0x6a4a2a, cx + (ax === 'x' ? -1.6 + i * 1.07 : 0), 0.02, cz + (ax === 'z' ? -1.6 + i * 1.07 : 0)));
    if (ax === 'z') { st.wall(x1 - 0.5, z1 - 0.5, x1, z2 + 0.5); st.wall(x2, z1 - 0.5, x2 + 0.5, z2 + 0.5); } else { st.wall(x1 - 0.5, z1 - 0.5, x2 + 0.5, z1); st.wall(x1 - 0.5, z2, x2 + 0.5, z2 + 0.5); }
  }
  // Cheminées, lucarnes, linge
  for (const [x, z, h] of [[-3.2, 40, 2], [3.4, 33.5, 1.6], [4.6, 22.5, 2.2], [-4.6, 15, 1.7], [-14, 24.5, 2], [-22, 14, 2.3], [-13.5, 3, 1.8], [-22.5, -5, 2.1], [5.4, 1.2, 2], [-3.6, -7, 1.6], [5.6, -17.5, 2.2], [-3.8, -25, 1.8]]) {
    B(st, mBlanc(), 1.3, h, 1.3, x, h / 2, z); B(st, mBlancS(), 1.6, 0.25, 1.6, x, h + 0.1, z); st.staticGroup.add(box(0.8, 0.5, 0.8, 0x7a4a3a, x, h + 0.45, z)); st.wall(x - 0.7, z - 0.7, x + 0.7, z + 0.7).tall = true;
  }
  for (const [x, z, n, c0] of [[-21, 21.5, 4, 0], [-18, -4.5, 3, 2], [0.5, -4, 4, 1]]) {
    st.staticGroup.add(box(n * 1.5 + 0.6, 0.04, 0.04, 0x5a4a3a, x + n * 0.75 - 0.75, 2.3, z)); for (const dx of [-1, n * 1.5 - 0.5]) st.staticGroup.add(box(0.1, 2.4, 0.1, 0x5a3e24, x + dx, 1.2, z));
    for (let i = 0; i < n; i++) st.staticGroup.add(box(1.1, 1.0, 0.04, [0xf4f0e8, 0xc04a3a, 0x4a7ac0, 0xf0e0a0, 0x6aa86a][(i + c0) % 5], x + i * 1.5, 1.75, z));
  }
  for (const [x, z] of [[2.6, 42], [-5.6, 23], [6.4, -8.6]]) st.prop(makeCrate(), x, z, R() * 6, 0.55);
  ladder(st, 0, 44.3, 3, PI, -2.4);
  ladder(st, 1, -28.3, 3, 0, -2.4);
  S.depart = { x: 0, z: 42 }; S.coffre = { x: -23.2, z: 26 }; S.fin = { x: 1, z: -26.6 };
  S.nyssa = [{ x: 0, z: 31.5 }, { x: -6, z: 19 }, { x: -18, z: 11 }, { x: -11, z: -1 }, { x: 1, z: -9 }, { x: 1, z: -26 }];
  S.mobs = [{ x: -18, z: 20 }, { x: -18, z: -1 }, { x: 1, z: -3 }, { x: 1, z: -20 }];
  // La ville en contrebas : toits bleus, tours, château au nord
  if (decorReady()) for (const [x, z, ry] of [[14, 36, 0], [16, 18, PI / 2], [-16, 38, 0], [-34, 30, PI / 2], [-36, 8, 0], [-2, -40, 0], [18, -4, PI / 2], [18, -24, 0], [-18, -22, PI / 2], [-36, -14, 0], [-14, 52, 0], [10, 54, PI / 2], [30, 10, 0], [-20, -40, PI / 2], [32, 34, 0]]) {
    st.deco(makeHouse(10, 10, 4.6, 0xf6f3ea, BLEU, { roof: BLEU, plaster: 0xf6f3ea, chimney: R() < 0.7 }), x, z, ry, Y);
  } else for (let i = 0; i < 26; i++) { const x = -60 + R() * 120, z = -60 + R() * 120; if (x > -29 && x < 11 && z > -31 && z < 47) continue; B(st, mBlanc(), 9, 7, 9, x, Y + 3.5, z); K(st, mToit(), 7, 4, x, Y + 9, z); }
  for (const [x, z, r, h] of [[40, 50, 3.6, 22], [-52, 44, 3.6, 22], [-54, -20, 3.6, 22], [44, -30, 3.6, 22], [30, 70, 3.4, 24], [-20, 72, 3.4, 24]]) tower(st, x, z, r, h, Y, false);
  const water = new THREE.Mesh(UP, new THREE.MeshLambertMaterial({ color: 0x3a8ad0, emissive: 0x143a60 })); water.rotation.x = -PI / 2; water.scale.set(700, 300, 1); water.position.set(0, Y - 1.0 + 1.1, -212); st.staticGroup.add(water);
  castle(st, 0, -108, Y);
  skyRing(st, R);
  st.bake();
  return st;
}

// ============================================================
//  LES ÉGOUTS — entrée, salle des vannes, galerie des rats, citerne
// ============================================================
export function buildEgouts() {
  const R = rng(909), H = 3.6;
  const st = new Stage({ name: 'egouts', bounds: [-15, 15, -71, 11], sky: 0x070c09, fog: [0x0a120d, 22, 80], hemi: [0xd0f0d8, 0x4a5a4c, 1.35], sun: [0xb8e0c0, 0.5, [10, 40, 20]], music: 'egouts', pitch: 0.78 });
  const S = st.spots = {};
  const wm = W('mur_egout', 0xffffff, 3, 0x6a5444, 1.7), wmS = W('mur_egout', 0xc8c8b8, 3, 0x5a4a3c, 1.5), fm = W('paves', 0xa8b4a0, 3, 0x4a5448);
  G(st, fm, 60, 100, 0, 0, -30);
  const wall = (ax, az, bx, bz) => { B(st, wm, bx - ax, H, bz - az, (ax + bx) / 2, H / 2, (az + bz) / 2); B(st, wmS, bx - ax + 0.14, 0.3, bz - az + 0.14, (ax + bx) / 2, H + 0.15, (az + bz) / 2); };
  // Pièces : entrée, couloir, salle des vannes, galerie des rats et ses deux alcôves, citerne
  room(st, -5, 0, 5, 10, { n: [[-2, 2]] }, wall);
  room(st, -2, -10, 2, 0, { n: [[-2, 2]], s: [[-2, 2]] }, wall);
  room(st, -14, -24, 14, -10, { s: [[-2, 2]], n: [[-2.2, 2.2]] }, wall);
  room(st, -3, -44, 3, -24, { s: [[-2.2, 2.2]], n: [[-3, 3]], w: [[-36, -31]], e: [[-37.5, -34.5]] }, wall);
  room(st, -10, -37, -3, -30, { e: [[-36, -31]] }, wall);
  room(st, 3, -39, 5.5, -33, { w: [[-37.5, -34.5]] }, wall);
  room(st, -13, -70, 13, -44, { s: [[-3, 3]] }, wall);
  // Rigoles d'eau verte (lumineuse : c'est elle qui éclaire les galeries)
  const VERT = { fond: 0x145a34, clair: 0x4ab07a, ciel: 0x2a6a48, horizon: 0x5ac890, eclats: 0.35, courant: 0.7, relief: 0.9 };
  const bord = mat(0x2a342c);
  const rig = (w, d, x, z) => { const m = d > w ? eauVive(d, w, Object.assign({ angle: PI / 2 }, VERT)) : eauVive(w, d, VERT); m.position.set(x, 0.03, z); st.add(m); const e = new THREE.Mesh(UP, bord); e.rotation.x = -PI / 2; e.scale.set(w + 0.36, d + 0.36, 1); e.position.set(x, 0.02, z); st.staticGroup.add(e); };
  rig(1.2, 22, 0, -1); rig(24, 1.2, 0, -12.6); rig(1.2, 20, 0, -34); rig(1.2, 10, -12.2, -17); rig(1.2, 10, 12.2, -17);
  const bassin = eauVive(15, 15, Object.assign({ rond: true, ondes: 1 }, VERT)); bassin.position.set(0, 0.03, -57); st.add(bassin);
  // Torches et lumières
  const lamp = (x, z, ry, light) => { P(st, 'Torch_Metal', x, 1.5, z, ry); const f = makeFire(0.42, false); st.add(f, x + Math.sin(ry) * 0.28, z + Math.cos(ry) * 0.28, 0, 1.95); if (light) { const l = new THREE.PointLight(0xffa860, 1.5, 17, 1.3); l.position.set(x + Math.sin(ry) * 1.2, 2.6, z + Math.cos(ry) * 1.2); st.group.add(l); } };
  lamp(-4.9, 5, PI / 2, true); lamp(4.9, 5, -PI / 2); lamp(-13.9, -17, PI / 2, true); lamp(13.9, -17, -PI / 2, true); lamp(-5, -23.9, 0); lamp(5, -23.9, 0);
  lamp(-2.9, -27.5, PI / 2); lamp(2.9, -41, -PI / 2, true); lamp(-9.9, -33.5, PI / 2);
  lamp(-12.9, -50, PI / 2, true); lamp(12.9, -50, -PI / 2); lamp(-12.9, -64, PI / 2); lamp(12.9, -64, -PI / 2, true);
  // Entrée : échelle, petite statue, graffiti
  ladder(st, 0, 9.85, 4.2, PI); S.echelle = { x: 0, z: 8.8 };
  const aube = makeStatue(); aube.scale.setScalar(0.62); st.add(aube, -3.6, 2.2, PI / 4); st.circle(-3.6, 2.2, 0.6); S.statue = { x: -3.6, z: 2.2 };
  for (const [y, w] of [[2.3, 1.7], [2.0, 2.1], [1.7, 1.3]]) st.staticGroup.add(box(0.03, 0.14, w, 0xf0e8c8, 4.98, y, 5.2 + (2.1 - w) / 2 - 1.6));
  S.graffiti = { x: 4.2, z: 4.4 };
  for (const [x, z] of [[3.9, 8.8], [-4, 8.6], [-1.3, -9.2]]) st.prop(R() < 0.5 ? makeBarrel() : makeCrate(), x, z, R() * 6, 0.5);
  // Salle des vannes : trois roues, et la chute d'eau qui barre la sortie nord
  S.vannes = [{ x: -11.6, z: -19.5, nom: 'gauche' }, { x: 0, z: -21.4, nom: 'centre' }, { x: 11.6, z: -19.5, nom: 'droite' }];
  S.vanneObjs = S.vannes.map((v) => {
    const g = new THREE.Group(); g.add(cyl(0.16, 0.2, 1.15, 0x5a5a60, 0, 0.58, 0, 10)); g.add(box(0.5, 0.2, 0.5, 0x4a4a50, 0, 0.1, 0));
    const wheel = new THREE.Group(); wheel.position.y = 1.2; const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 8, 18), mat(0xb03a2a)); ring.rotation.x = PI / 2; wheel.add(ring);
    for (let i = 0; i < 3; i++) { const sp = box(0.78, 0.05, 0.05, 0xb03a2a, 0, 0, 0); sp.rotation.y = i * PI / 3; wheel.add(sp); }
    g.add(wheel); g.userData.wheel = wheel; st.add(g, v.x, v.z); st.circle(v.x, v.z, 0.45); return g;
  });
  const chute = eauVive(4.4, H, { cascade: true, fond: 0x1a6a4a, clair: 0x6ad0a0, ciel: 0x4ab07a, horizon: 0x8af0c0, alpha: 0.86, eclats: 0.3, courant: 1 });
  { const coule = chute.userData.anim; chute.position.set(0, H / 2, -24.3); chute.userData.anim = (dt, m, t) => { coule(dt, m, t); chute.scale.x = 1 + Math.sin(t * 9) * 0.02; }; }
  st.add(chute); S.chute = chute; S.chuteWall = st.wall(-2.2, -24.6, 2.2, -24);
  S.gelees = [{ x: -8, z: -14 }, { x: 8, z: -15 }];
  // Galerie des rats, alcôve au coffre, porte de la planque
  S.rats = [{ x: 0, z: -28 }, { x: 0.5, z: -34 }, { x: -0.5, z: -40 }]; S.coffre = { x: -8.8, z: -33.5 };
  st.staticGroup.add(box(0.2, 2.6, 2.4, 0x3a3a42, 5.4, 1.3, -36)); for (let i = 0; i < 3; i++) st.staticGroup.add(box(0.06, 0.5, 0.08, 0xd8c060, 5.28, 1.6, -36.5 + i * 0.5));
  S.planque = { x: 4.4, z: -36 };
  for (const [x, z] of [[-9.2, -31], [-4.2, -36.2], [-9, -36]]) st.prop(R() < 0.5 ? makeBarrel() : makeCrate(), x, z, R() * 6, 0.5);
  // Citerne : quatre colonnes, et la colonne nord où Nyssa est engluée
  for (const [x, z] of [[-7.5, -50], [7.5, -50], [-7.5, -64], [7.5, -64], [0, -67.4]]) { C(st, wm, 0.9, H + 2.4, x, (H + 2.4) / 2, z); C(st, wmS, 1.15, 0.4, x, 0.2, z); st.circle(x, z, 1.0); }
  const goo = mat(0x7aba3a, { emissive: 0x2a5a10 });
  for (const [x, y, z, s] of [[0, 0.5, -66.2, 1.3], [-0.5, 1.2, -66.4, 0.9], [0.5, 1.5, -66.4, 0.8], [0, 0.15, -65.6, 1.6]]) { const b = sph(s, goo, x, y, z, { smooth: true }); b.scale.set(s, s * 0.6, s * 0.5); st.staticGroup.add(b); }
  S.nyssa = { x: 0, z: -66.1 }; S.boss = { x: 0, z: -57 }; S.sortie = { x: 11.6, z: -57 };
  ladder(st, 12.85, -57, 4.4, -PI / 2);
  st.bake();
  return st;
}

// ============================================================
//  LA SALLE DU TRÔNE
// ============================================================
export function buildTrone() {
  const st = new Stage({ name: 'trone', bounds: [-9.4, 9.4, -33, -1], sky: 0x1a2038, fog: [0x2a3050, 60, 200], hemi: [0xffffff, 0x9a94a8, 1.15], sun: [0xfff0d8, 0.9, [10, 40, 30]], music: 'cite', pitch: 0.42 });
  const S = st.spots = {};
  G(st, mMarbre(0xf4eee0, 2.1), 22, 44, 0, 0, -20);
  B(st, mat(0x2a4aa8), 3.6, 0.04, 31, 0, 0.02, -16.5); for (const s of [-1, 1]) B(st, mat(0xd8b040), 0.16, 0.05, 31, s * 1.8, 0.025, -16.5);   // tapis bleu
  // Murs (pas de mur au sud : c'est de là que regarde la caméra)
  B(st, mBlanc(), 1, 13, 44, -10.5, 6.5, -20); B(st, mBlanc(), 1, 13, 44, 10.5, 6.5, -20); B(st, mBlanc(), 22, 13, 1, 0, 6.5, -41.5);
  st.wall(-11, -42, -10, 2); st.wall(10, -42, 11, 2); st.wall(-11, -1, 11, 0);
  // Colonnes, vitraux, bannières
  const vit = [[0x4a7ae0, 0x2a4a90], [0xe0b040, 0x806020], [0xc04a6a, 0x70203a], [0x4ac09a, 0x207050], [0x8a5ae0, 0x4a2a80], [0xe07a3a, 0x80401a], [0x5ac0e0, 0x2a6a80]];
  for (let i = 0; i < 6; i++) {
    const z = -4 - i * 5.4;
    for (const s of [-1, 1]) {
      C(st, mMarbre(0xf4f2ee), 0.55, 10, s * 6.6, 5, z); C(st, mBlancS(), 0.8, 0.5, s * 6.6, 0.25, z); C(st, mBlancS(), 0.8, 0.5, s * 6.6, 9.9, z); st.circle(s * 6.6, z, 0.75);
      const [c, e] = vit[(i + (s > 0 ? 3 : 0)) % 7];
      st.staticGroup.add(box(0.12, 5.4, 1.7, c, s * 9.96, 5.6, z - 2.7, { emissive: e })); st.staticGroup.add(box(0.16, 0.14, 2.0, 0xd8b040, s * 9.94, 2.85, z - 2.7));
      const tip = cone(0.85, 1.2, c, s * 9.96, 8.9, z - 2.7, 4, { emissive: e }); tip.scale.x = 0.07; st.staticGroup.add(tip);
      if (i % 2 === 0) blason(st, s * 6.6 - s * 0.6, 6.4, z, -s * PI / 2, 0.9);
    }
  }
  // Grande rosace derrière le trône : les sept couleurs
  for (let i = 0; i < 7; i++) { const a = (i / 7) * PI * 2, p = sph(1.75, vit[i][0], Math.sin(a) * 1.8, 8.6 + Math.cos(a) * 1.8, -40.95, { emissive: vit[i][1] }); p.scale.z = 0.06; st.staticGroup.add(p); }
  const coeur = sph(1.5, 0xfff4c2, 0, 8.6, -40.9, { emissive: 0xb09030 }); coeur.scale.z = 0.08; st.staticGroup.add(coeur);
  for (const [r, t] of [[2.75, 0.22], [0.95, 0.1]]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 36), mBlancS()); ring.position.set(0, 8.6, -40.9); st.staticGroup.add(ring); }
  for (let i = 0; i < 7; i++) { const a = (i / 7) * PI * 2 + PI / 7, sp = box(0.12, 1.9, 0.14, 0xd8d4c8, Math.sin(a) * 1.85, 8.6 + Math.cos(a) * 1.85, -40.88); sp.rotation.z = -a; st.staticGroup.add(sp); }
  // L'estrade : sept marches de marbre, le trône blanc
  for (let i = 0; i < 7; i++) B(st, mMarbre(0xf4f2ee), 12 - i * 0.9, 0.25, 7.6 - i * 0.62, 0, 0.125 + i * 0.25, -37.7 - i * 0.31);
  st.wall(-6.2, -42, 6.2, -33.9);
  const ty = 1.75;
  B(st, mMarbre(), 1.5, 0.55, 1.3, 0, ty + 0.28, -39.2); B(st, mMarbre(), 1.7, 3.4, 0.35, 0, ty + 1.7, -39.95);
  for (const s of [-1, 1]) { B(st, mMarbre(), 0.3, 1.1, 1.3, s * 0.9, ty + 0.55, -39.2); st.staticGroup.add(sph(0.4, 0xf0d060, s * 0.9, ty + 1.25, -38.6)); }
  st.staticGroup.add(box(1.2, 0.1, 1.0, 0x2a4aa8, 0, ty + 0.6, -39.15)); const top = sph(0.9, 0xf0d060, 0, ty + 3.6, -39.95, { emissive: 0x806010 }); top.scale.z = 0.25; st.staticGroup.add(top);
  S.roi = { x: 0, y: ty + 0.02, z: -39.0 }; S.alinor = { x: 2.6, y: 1.25, z: -37.4 }; S.aldric = { x: -2.6, y: 1.25, z: -37.4 };
  S.gardes = []; for (let i = 0; i < 4; i++) for (const s of [-1, 1]) S.gardes.push({ x: s * 4.4, z: -7 - i * 6.4, ry: -s * PI / 2 });
  S.nobles = [{ x: -8.2, z: -12, ry: PI / 2 }, { x: -8.2, z: -14, ry: PI / 2 }, { x: 8.2, z: -20, ry: -PI / 2 }, { x: 8.2, z: -22.2, ry: -PI / 2 }];
  if (decorReady()) {
    for (const z of [-8, -19, -30]) P(st, 'Chandelier', 0, 7.2, z, 0, 1.6);
    for (const s of [-1, 1]) { P(st, 'Vase_4', s * 5.2, 0, -32.6, 0, 1.4); P(st, 'Vase_2', s * 8.6, 0, -3, 0, 1.4); P(st, 'BookStand', s * 4.2, 0, -32.4, s * 0.6); }
  }
  for (const z of [-8, -19, -30]) { const l = new THREE.PointLight(0xffe0a0, 0.9, 26, 1.2); l.position.set(0, 6.4, z); st.group.add(l); }
  st.bake();
  return st;
}

// Briques de construction prêtées aux chapitres suivants (world4.js…)
export { B as bloc, C as colonne, K as cone3, G as dalle, P as kit, W as matiere, room, ladder, rng, UP as PLAN };
