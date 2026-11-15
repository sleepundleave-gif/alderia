// ============================================================
//  INTÉRIEURS : on peut entrer dans les maisons
//  Devant une porte, « E : Entrer » fait passer dans une petite scène à part (comme dans Pokémon) :
//  la pièce, ses meubles, son feu, ses habitants. On ressort en repassant le seuil.
//  - Les murs ne sont dessinés que du côté intérieur : quand la caméra passe derrière un mur,
//    il disparaît et l'on voit la pièce « en coupe », quel que soit l'angle de vue.
//  - Les meubles viennent du kit « Fantasy Props » (table, chaises, bibliothèque, tonneaux…) ;
//    le lit, la cheminée, les tapis, les étagères et le comptoir sont assemblés ici.
//  - Les plans de pièce : « maison » (deux chaumières différentes), « auberge » (salle commune, comptoir et dortoir),
//    « chef » (grande demeure), « armurerie » et « herboristerie » (boutiques : comptoir, marchandises du métier),
//    avec des variantes tirées du numéro de la maison (plan retourné, couleurs, meubles).
//  - Toutes les maisons d'un lieu s'ouvrent : celles que l'histoire ne décrit pas sont meublées et parfois habitées.
//  - Un marchand qui tient boutique (CONTENU[id].tenancier) attend derrière son comptoir, pas dans la rue.
//  Pour rendre une maison visitable : la ranger dans st.spots.maisons ({ obj, type, id }) quand on
//  construit le lieu, puis appeler brancherMaisons(st, TOOLS) dans l'histoire. CONTENU dit qui s'y trouve.
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { E, Stage } from './engine.js';
import { G } from './state.js';
import { box, cyl, sph, cone, mat, makeFire } from './models.js';
import { piece, wallMat, infosMaison, decorReady, taillePiece, hasPiece } from './decor.js';
import { talk, fade, toast, updateGold } from './ui.js';
import { sfx } from './audio.js';

const PI = Math.PI, G_PLAN = new THREE.PlaneGeometry(1, 1);
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const graineDe = (id) => { let h = 7; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

// ---------- Palettes ----------
// mur, sol (teinte des planches), bois (poutres), tapis [fond, bord], lit (couverture)
const PALETTES = {
  village: { mur: 0xefe2c8, sol: 0xc89a68, bois: 0x6a4628, pierre: 0xb4aca0, tapis: [[0xa83a32, 0xe0c070], [0x3a6a9a, 0xe8dcc0], [0x4a7a48, 0xe0c070], [0x8a4a8a, 0xe8dcc0]], lit: [0xb84a40, 0x3f6fb0, 0x4a8a58, 0xc89a3a] },
  auberge: { mur: 0xead8b8, sol: 0xb0804e, bois: 0x5a3a20, pierre: 0xa8a094, tapis: [[0x8a2a2a, 0xd8b050]], lit: [0xb84a40] },
  relais:  { mur: 0xf0e6d2, sol: 0xa87848, bois: 0x7a3e2a, pierre: 0xb0a898, tapis: [[0x2f5a8a, 0xe0c880]], lit: [0x3f6fb0] },
  chef:    { mur: 0xf2e8d4, sol: 0xb88a5a, bois: 0x5a3a22, pierre: 0xbcb4a8, tapis: [[0x2a4a9a, 0xd8b040]], lit: [0x2a4a9a] },
  nain:    { mur: 0xb8a694, sol: 0x8a6a50, bois: 0x4a3426, pierre: 0x8a7a70, tapis: [[0x8a2a1c, 0xd8a040], [0x5a3a6a, 0xd8b060]], lit: [0x9a3a2a, 0x6a4a8a, 0x3a6a5a] },
  port:    { mur: 0xf8f0dc, sol: 0xc0a078, bois: 0x3a6a8a, pierre: 0xd0c8b8, tapis: [[0x2a7a9a, 0xf0e8d0], [0xc8603a, 0xf0e0b0], [0x3a8a6a, 0xf0ecd8]], lit: [0x3a8ab0, 0xd0704a, 0x4a9a7a, 0xe0b040] },
  cite:    { mur: 0xf6f3ea, sol: 0xcaa67a, bois: 0x4a5a8a, pierre: 0xd8d4cc, tapis: [[0x3a5ab8, 0xe8e4d8], [0x9a3a4a, 0xe8d8a0], [0x3a8a8a, 0xf0ece0]], lit: [0x4a6ac8, 0xb04a5a, 0x4a9a8a] },
};

// ---------- Une pièce ----------
// Renvoie des outils pour la meubler ; « retourne » : plan en miroir (est ↔ ouest)
function salle(W, D, pal, retourne, musique, px = 0) {                 // px : où se trouve la porte le long du mur sud (0 = au milieu)
  const H = 3.1, fx = retourne ? -1 : 1;
  const st = new Stage({ name: 'interieur', bounds: [-W / 2 + 0.45, W / 2 - 0.45, -D / 2 + 0.45, D / 2 + 0.75], sky: 0x120e0b, fog: [0x120e0b, 60, 200], hemi: [0xfff4e4, 0xa08468, 1.3], sun: [0xfff0d8, 0.8, [3 * fx, 12, 7]], music: musique, pitch: 0.86 });
  const mMur = wallMat('mur_blanc', pal.mur, 3.4, { gain: 1.35 }) || mat(pal.mur), mSol = wallMat('planches', pal.sol, 2.4, { gain: 1.25 }) || mat(pal.sol);
  const mBois = wallMat('planches', pal.bois, 1.3) || mat(pal.bois), mPierre = wallMat('paves', pal.pierre, 1.5, { gain: 1.2 }) || mat(pal.pierre);
  const s = { st, W, D, H, fx, pal, mBois, mPierre, spots: {} };
  const plan = (w, h, m) => { const p = new THREE.Mesh(G_PLAN, typeof m === 'number' ? mat(m) : m); p.scale.set(w, h, 1); return p; };
  // un panneau plaqué sur un mur (n, s, e, o), tourné vers l'intérieur ; u : position le long du mur, off : écart au mur
  s.mur = (cote, u, w, h, y, m, off = 0) => {
    if (retourne && (cote === 'e' || cote === 'o')) cote = cote === 'e' ? 'o' : 'e';
    const p = plan(w, h, m);
    if (cote === 'n') st.deco(p, u * fx, -D / 2 + off, 0, y); else if (cote === 's') st.deco(p, u * fx, D / 2 - off, PI, y);
    else if (cote === 'o') st.deco(p, -W / 2 + off, u, PI / 2, y); else st.deco(p, W / 2 - off, u, -PI / 2, y);
    return p;
  };
  // un panneau posé à plat sur le sol (tapis, tache de lumière)
  s.sol = (w, d, m, x, z, y = 0.012, ry = 0) => { const p = plan(w, d, m); p.rotation.order = 'YXZ'; p.rotation.x = -PI / 2; st.deco(p, x * fx, z, ry * fx, y); return p; };
  // une pièce du kit ; un groupe fabriqué ici ; des collisions
  s.P = (name, x, z, ry = 0, sc = 1, y = 0) => st.deco(piece(name, 0, 0, 0, 0, sc), x * fx, z, ry * fx, y);
  s.obj = (o, x, z, ry = 0, y = 0) => st.deco(o, x * fx, z, ry * fx, y);
  s.bloc = (x1, z1, x2, z2) => st.wall(x1 * fx, z1, x2 * fx, z2);
  s.rond = (x, z, r) => st.circle(x * fx, z, r);
  s.spot = (nom, x, z, ry = 0, o = {}) => { s.spots[nom] = Object.assign({ x: x * fx, z, ry: ry * fx }, o); };

  // --- sol, murs, boiseries ---
  const sol = plan(W + 0.3, D + 0.3, mSol); sol.rotation.x = -PI / 2; st.deco(sol, 0, 0, 0, 0);
  const PORTE = 1.5, HP = 2.25;                               // largeur et hauteur de la porte (au milieu du mur sud)
  for (const c of ['n', 'e', 'o']) s.mur(c, 0, (c === 'n' ? W : D), H, H / 2, mMur);
  const sud = (h, y, m, off) => { s.mur('s', (-W / 2 + px - PORTE / 2) / 2, px - PORTE / 2 + W / 2, h, y, m, off); s.mur('s', (px + PORTE / 2 + W / 2) / 2, W / 2 - px - PORTE / 2, h, y, m, off); };
  sud(H, H / 2, mMur);
  s.mur('s', px, PORTE, H - HP, HP + (H - HP) / 2, mMur);
  for (const c of ['n', 'e', 'o', 's']) {
    const L = c === 'n' || c === 's' ? W : D;
    s.mur(c, 0, L, 0.2, H - 0.1, mBois, 0.02);                // sablière (poutre du haut)
    if (c === 's') sud(0.16, 0.08, mBois, 0.02);
    else s.mur(c, 0, L, 0.16, 0.08, mBois, 0.02);             // plinthe
    const n = Math.max(2, Math.round(L / 2.4));
    for (let i = 0; i <= n; i++) { const u = -L / 2 + 0.09 + (L - 0.18) * i / n; if (c === 's' && Math.abs(u - px) < PORTE / 2 + 0.2) continue; s.mur(c, u, 0.17, H, H / 2, mBois, 0.015); }   // poteaux
  }
  // encadrement de la porte, jour qui entre, pierre du seuil
  for (const k of [-1, 1]) s.mur('s', px + k * (PORTE / 2 + 0.07), 0.16, HP + 0.1, (HP + 0.1) / 2, mBois, 0.03);
  s.mur('s', px, PORTE + 0.3, 0.16, HP + 0.08, mBois, 0.03);
  const jour = plan(PORTE, HP, new THREE.MeshBasicMaterial({ color: 0xe8f2ff })); st.deco(jour, px * fx, D / 2 + 0.9, PI, HP / 2);
  const seuil = plan(PORTE, 1.0, mPierre); seuil.rotation.x = -PI / 2; st.deco(seuil, px * fx, D / 2 + 0.42, 0, 0.004);
  s.sol(PORTE * 0.9, 2.2, new THREE.MeshBasicMaterial({ color: 0xfff4d8, transparent: true, opacity: 0.13, depthWrite: false }), px, D / 2 - 1.2, 0.02);
  // dessus des murs : une bordure sombre qui donne leur épaisseur aux murs vus d'en haut
  const cap = (w, d, x, z) => { const p = plan(w, d, 0x2a1c12); p.rotation.x = -PI / 2; st.deco(p, x, z, 0, H); };
  cap(W + 0.5, 0.25, 0, -D / 2 - 0.125); cap(0.25, D, -W / 2 - 0.125, 0); cap(0.25, D, W / 2 + 0.125, 0);   // (pas au sud : il barrerait la vue)
  // collisions du mur sud (de part et d'autre de la porte) et couloir de sortie
  st.wall(-W / 2 - 1, D / 2, px * fx - PORTE / 2 + 0.05, D / 2 + 2); st.wall(px * fx + PORTE / 2 - 0.05, D / 2, W / 2 + 1, D / 2 + 2);
  s.entree = { x: px * fx, z: D / 2 - 1.5 }; s.sortie = { x1: px * fx - PORTE / 2, x2: px * fx + PORTE / 2, z1: D / 2 + 0.3, z2: D / 2 + 3 };

  // --- éléments fabriqués ---
  const mVitre = new THREE.MeshBasicMaterial({ color: 0xcfe8ff }), mRayon = new THREE.MeshBasicMaterial({ color: 0xfff2cc, transparent: true, opacity: 0.12, depthWrite: false });
  // fenêtre : cadre de bois, vitre claire, croisillons, tache de soleil sur le plancher
  s.fenetre = (cote, u, w = 1.25, h = 1.25, y = 1.8) => {
    s.mur(cote, u, w + 0.24, h + 0.24, y, mBois, 0.03); s.mur(cote, u, w, h, y, mVitre, 0.04);
    s.mur(cote, u, 0.07, h, y, mBois, 0.05); s.mur(cote, u, w, 0.07, y, mBois, 0.05);
    s.mur(cote, u, w + 0.44, 0.1, y - h / 2 - 0.15, mBois, 0.06);
    const c = retourne && (cote === 'e' || cote === 'o') ? (cote === 'e' ? 'o' : 'e') : cote, d = 1.25;
    if (c === 'o') st.deco(plan(1.9, w, mRayon), -W / 2 + d, u, 0, 0.018).rotation.x = -PI / 2;
    else if (c === 'e') st.deco(plan(1.9, w, mRayon), W / 2 - d, u, 0, 0.018).rotation.x = -PI / 2;
    else if (c === 'n') st.deco(plan(w, 1.9, mRayon), u * fx, -D / 2 + d, 0, 0.018).rotation.x = -PI / 2;
  };
  // cheminée adossée au mur nord : âtre, jambages, manteau, hotte ; k : taille. Le feu est ajouté à part (il est animé).
  s.cheminee = (x, k = 1, chaudron = false) => {
    const g = new THREE.Group(), noir = mat(0x1c1612);
    g.add(box(2.2 * k, 0.1, 1.05 * k, mPierre, 0, 0.05, 0.52 * k));
    for (const c of [-1, 1]) g.add(box(0.42 * k, 1.3 * k, 0.8 * k, mPierre, c * 0.82 * k, 0.65 * k, 0.4 * k));
    g.add(box(1.24 * k, 1.3 * k, 0.08, noir, 0, 0.65 * k, 0.06)); g.add(box(1.24 * k, 0.03, 0.7 * k, noir, 0, 0.115, 0.4 * k));
    g.add(box(2.3 * k, 0.22 * k, 0.95 * k, mPierre, 0, 1.41 * k, 0.47 * k));
    g.add(box(1.55 * k, H - 1.52 * k, 0.6 * k, mPierre, 0, 1.52 * k + (H - 1.52 * k) / 2, 0.3 * k));
    for (const [dx, r] of [[-0.22, 0.3], [0.2, -0.4], [0, 1.2]]) { const b = cyl(0.07 * k, 0.07 * k, 0.7 * k, 0x4a3020, dx * k, 0.2, 0.42 * k, 6); b.rotation.z = PI / 2; b.rotation.y = r; g.add(b); }
    s.obj(g, x, -D / 2); s.bloc(x - 1.15 * k, -D / 2, x + 1.15 * k, -D / 2 + 1.05 * k);
    const f = makeFire(0.5 * k, true); st.add(f, x * fx, -D / 2 + 0.42 * k, 0, 0.16);
    if (chaudron) s.P('Cauldron', x, -D / 2 + 0.48 * k, 0, 0.62 * k, 0.3 * k);
    s.P('Pot_1', x + 0.82 * k, -D / 2 + 0.6 * k, 0.4, 0.8, 1.52 * k); s.P('Vase_4', x - 0.8 * k, -D / 2 + 0.5 * k, 0, 0.55, 1.52 * k);
    s.spot('feu', x, -D / 2 + 1.05 * k + 0.75, 0);
    return g;
  };
  // lit : la tête vers -z ; couleur de la couverture
  s.lit = (x, z, ry, couleur, large = 1.15) => {
    const g = new THREE.Group(), L = 2.1;
    g.add(box(large, 0.22, L, mBois, 0, 0.3, 0)); for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(box(0.12, 0.36, 0.12, mBois, dx * (large / 2 - 0.06), 0.18, dz * (L / 2 - 0.06)));
    g.add(box(large, 0.95, 0.1, mBois, 0, 0.62, -L / 2 + 0.05)); g.add(box(large, 0.5, 0.08, mBois, 0, 0.45, L / 2 - 0.04));
    g.add(box(large - 0.1, 0.18, L - 0.16, 0xf0ead8, 0, 0.5, 0)); g.add(box(large - 0.06, 0.2, L * 0.62, couleur, 0, 0.52, L * 0.16));
    g.add(box(large - 0.06, 0.06, 0.22, 0xf6f2e6, 0, 0.625, -L * 0.14)); g.add(box(large * 0.62, 0.13, 0.4, 0xfaf6ec, 0, 0.66, -L / 2 + 0.36));
    s.obj(g, x, z, ry);
    const sw = Math.abs(Math.sin(ry)) > 0.7, hw = (sw ? L : large) / 2, hd = (sw ? large : L) / 2; s.bloc(x - hw, z - hd, x + hw, z + hd);
  };
  // lampe murale : une potence et une lanterne allumée (x, z : point du mur ; la lanterne s'écarte du mur toute seule)
  const mLampe = new THREE.MeshBasicMaterial({ color: 0xffd98a });
  s.lampe = (x, z, y = 1.95) => {
    const g = new THREE.Group(), surX = Math.abs(Math.abs(x) - W / 2) < 0.3, k = surX ? -Math.sign(x) : 1;
    g.add(box(0.05, 0.05, 0.36, 0x2a2420, 0, 0.2, 0.18)); g.add(box(0.03, 0.12, 0.03, 0x2a2420, 0, 0.13, 0.32));
    const l = box(0.17, 0.22, 0.17, 0, 0, -0.03, 0.32); l.material = mLampe; g.add(l);
    g.add(box(0.21, 0.035, 0.21, 0x2a2420, 0, 0.09, 0.32)); g.add(box(0.21, 0.035, 0.21, 0x2a2420, 0, -0.15, 0.32));
    s.obj(g, x, z, surX ? k * PI / 2 : 0, y);
  };
  // tapis : fond et bordure
  s.tapis = (x, z, w, d, [fond, bord]) => { s.sol(w, d, mat(bord), x, z, 0.012); s.sol(w - 0.3, d - 0.3, mat(fond), x, z, 0.016); s.sol(w - 0.7, d - 0.7, mat(bord), x, z, 0.019); s.sol(w - 0.8, d - 0.8, mat(fond), x, z, 0.022); };
  // étagère murale garnie (cote : mur, u : position, y : hauteur)
  s.etagere = (cote, u, y, objets) => {
    const c = retourne && (cote === 'e' || cote === 'o') ? (cote === 'e' ? 'o' : 'e') : cote, lg = 1.5;
    const pose = (du, dy, f) => c === 'o' ? f(-W / 2 + 0.17, u + du, PI / 2) : c === 'e' ? f(W / 2 - 0.17, u + du, -PI / 2) : f((u + du) * fx, -D / 2 + 0.17, 0);
    pose(0, 0, (x, z, ry) => { const b = box(lg, 0.05, 0.3, mBois, 0, 0, 0); st.deco(b, x, z, ry, y); for (const k of [-1, 1]) { const e = box(0.05, 0.2, 0.26, mBois, 0, 0, 0); st.deco(e, x + Math.cos(ry) * k * 0.6, z - Math.sin(ry) * k * 0.6, ry, y - 0.12); } });
    objets.forEach(([nom, sc = 1], i) => pose(-lg / 2 + 0.22 + i * (lg - 0.44) / Math.max(1, objets.length - 1), 0, (x, z) => st.deco(piece(nom, 0, 0, 0, i * 1.3, sc), x, z, 0, y + 0.03)));
  };
  // table du kit avec ce qui est posé dessus ; ry = 0 : le grand côté le long de x
  s.table = (x, z, ry, dessus = []) => {
    s.P('Table_Large', x, z, ry);
    const sw = Math.abs(Math.sin(ry)) > 0.7, hw = sw ? 0.6 : 1.45, hd = sw ? 1.45 : 0.6; s.bloc(x - hw, z - hd, x + hw, z + hd);
    for (const [nom, u, v, sc = 1, r = 0] of dessus) s.P(nom, x + (sw ? v : u), z + (sw ? u : v), r, sc, 0.815);
  };
  s.chaise = (x, z, ry, nom = 'Chair_1') => { s.P(nom, x, z, ry); s.rond(x, z, 0.28); };
  // une pièce du kit accrochée à un mur (bouclier, épée, hache) ; rz : inclinaison
  s.accroche = (nom, cote, u, y, sc = 1, rz = 0) => {
    const c = retourne && (cote === 'e' || cote === 'o') ? (cote === 'e' ? 'o' : 'e') : cote, o = piece(nom, 0, 0, 0, 0, sc); o.rotation.order = 'YXZ'; o.rotation.z = rz;
    if (c === 'n') st.deco(o, u * fx, -D / 2 + 0.05, 0, y); else if (c === 'o') st.deco(o, -W / 2 + 0.05, u, PI / 2, y); else st.deco(o, W / 2 - 0.05, u, -PI / 2, y);
    return o;
  };
  // une pièce posée à plat (épée sur un comptoir) : ry = direction
  s.aPlat = (nom, x, z, y, ry = 0, sc = 1) => { const o = piece(nom, 0, 0, 0, 0, sc); o.rotation.order = 'YXZ'; o.rotation.x = -PI / 2; st.deco(o, x * fx, z, ry * fx, y); return o; };
  // comptoir droit, le long de x : planches, plateau ; ce qui est posé dessus
  s.comptoir = (x1, x2, z, dessus = []) => {
    const g = new THREE.Group(), L = x2 - x1, cx = (x1 + x2) / 2;
    g.add(box(L, 1.0, 0.7, mBois, 0, 0.5, 0)); g.add(box(L + 0.16, 0.08, 0.86, mat(0x8a6238), 0, 1.04, 0)); g.add(box(L + 0.04, 0.12, 0.74, mat(0x3a2a1c), 0, 0.06, 0));
    s.obj(g, cx, z); s.bloc(x1, z - 0.35, x2, z + 0.35);
    for (const [nom, u, v = 0, sc = 1, r = 0] of dessus) s.P(nom, cx + u, z + v, r, sc, 1.08);
  };
  // cloison de planches (le long de z), avec ses poteaux
  s.cloison = (x, z1, z2, h = 2.3) => {
    const g = new THREE.Group(), L = z2 - z1; g.add(box(0.1, h, L, mBois, 0, h / 2, 0)); g.add(box(0.2, 0.14, L + 0.1, mat(0x3a2a1c), 0, h + 0.07, 0));
    for (const k of [-1, 0, 1]) g.add(box(0.2, h, 0.2, mat(0x3a2a1c), 0, h / 2, k * (L / 2 - 0.1)));
    s.obj(g, x, (z1 + z2) / 2); s.bloc(x - 0.1, z1, x + 0.1, z2);
  };

  // une caisse (taille k) avec un objet posé dessus, à la bonne hauteur que la caisse soit dessinée ou réaliste
  s.caisse = (x, z, k, dessus, sc = 1, ry = 0.1, r) => { s.P('Crate_Wooden', x, z, ry, k); s.rond(x, z, r || 0.62 * k); if (dessus) s.P(dessus, x, z, 0.5, sc, taillePiece('Crate_Wooden').h * k - 0.01); };
  s.chevet = (x, z, nom = 'Mug') => s.caisse(x, z, 0.5, nom, 1, 0.1, 0.3);
  s.finir = () => { st.bake(); return s; };
  return s;
}

// ---------- Les trois plans ----------
function chaumiere(id, pal, musique) {
  const R = rng(graineDe(id)), W = 8, D = 6.4, s = salle(W, D, pal, R() < 0.5, musique), v = Math.floor(R() * 3);
  const lit = pal.lit[Math.floor(R() * pal.lit.length)], tapis = pal.tapis[Math.floor(R() * pal.tapis.length)];
  s.cheminee(-1.75, 1, R() < 0.5);
  // coin nuit (nord-est)
  s.lit(W / 2 - 0.72, -D / 2 + 1.2, 0, lit);
  s.caisse(W / 2 - 1.78, -D / 2 + 0.42, 0.55, R() < 0.5 ? 'Potion_2' : 'Book_Stack_1');
  // mur nord, à droite de la cheminée : bibliothèque, établi ou petit lit
  if (v === 0) { s.P('Bookcase_2', 0.75, -D / 2 + 0.25); s.bloc(0.0, -D / 2, 1.5, -D / 2 + 0.5); s.spot('livres', 0.75, -D / 2 + 1.2); }
  else if (v === 1) { s.P('Workbench', 0.85, -D / 2 + 0.55); s.bloc(-0.2, -D / 2, 1.9, -D / 2 + 1.08); s.P('Bucket_Metal', 0.3, -D / 2 + 0.5, 0, 0.9, 0.89); s.P('Shield_Wooden', 0.85, -D / 2 + 0.03, 0, 1.1, 2.0); s.spot('etabli', 0.85, -D / 2 + 1.75); }
  else { s.lit(0.7, -D / 2 + 1.0, PI / 2, pal.lit[(pal.lit.indexOf(lit) + 1) % pal.lit.length], 0.95); }
  // table et chaises
  s.table(-1.2, 0.75, 0, [['Mug', -0.9, -0.2], ['Mug', 0.5, 0.25], ['Pot_1', -0.1, 0, 0.9], [R() < 0.5 ? 'FarmCrate_Apple' : 'Book_Stack_1', 0.95, -0.1, 0.7, 0.3], ['Chalice', -0.5, 0.3, 0.9]]);
  s.chaise(-1.9, -0.1, 0); s.chaise(-0.5, -0.1, 0); s.chaise(-1.2, 1.62, PI); s.chaise(0.6, 0.75, -PI / 2, 'Stool');
  s.tapis(2.05, 1.35, 2.3, 1.6, tapis);
  // mur ouest : réserves
  s.caisse(-W / 2 + 0.55, -1.75, 0.85, 'FarmCrate_Carrot', 0.9);
  s.P('Barrel', -W / 2 + 0.5, 2.6); s.rond(-W / 2 + 0.5, 2.6, 0.42); s.P('Bag', -W / 2 + 0.5, 1.85, PI / 2); s.rond(-W / 2 + 0.5, 1.85, 0.35);
  s.P('Vase_2', -W / 2 + 0.55, D / 2 - 0.55, 0, 0.8); s.rond(-W / 2 + 0.55, D / 2 - 0.55, 0.36);
  s.lampe(-W / 2 + 0.02, 0.9);
  // mur est : étagère, fenêtre ; coin sud-est : coffre ou tonneau
  s.etagere('e', 2.0, 1.55, [['Potion_1'], ['Vase_4', 0.5], ['Mug'], ['Potion_4']]);
  s.P('Bucket_Wooden_1', W / 2 - 0.45, 1.3, 0, 1.1); s.P('Stool', W / 2 - 0.5, 2.1); s.rond(W / 2 - 0.5, 2.1, 0.26);
  s.fenetre('e', 0.1); s.fenetre('o', -0.3); s.fenetre('s', 2.5); s.fenetre('s', -2.5);
  s.spot('coffre', W / 2 - 0.62, D / 2 - 0.62, -PI / 2); s.spot('table', -1.2, 2.45, PI); s.spot('milieu', 1.9, 0.2, 0.3); s.spot('lit', W / 2 - 1.9, -D / 2 + 1.5, PI / 2);
  return s;
}

// Seconde chaumière : le feu au milieu du mur du fond, deux lits d'un côté, la table de l'autre
function logis(id, pal, musique) {
  const R = rng(graineDe(id) + 11), W = 9, D = 6.8, s = salle(W, D, pal, R() < 0.5, musique), v = Math.floor(R() * 3);
  const lit = pal.lit[Math.floor(R() * pal.lit.length)], tapis = pal.tapis[Math.floor(R() * pal.tapis.length)];
  s.cheminee(0, 1.05, R() < 0.6);
  // coin nuit (ouest) : deux lits, la tête au mur, une table de nuit entre eux
  s.lit(-W / 2 + 1.12, -1.9, PI / 2, lit); s.lit(-W / 2 + 1.12, 0.2, PI / 2, pal.lit[(pal.lit.indexOf(lit) + 1) % pal.lit.length]);
  s.chevet(-W / 2 + 0.4, -0.85, R() < 0.5 ? 'Book_Stack_1' : 'Mug'); s.lampe(-W / 2 + 0.02, -0.85, 1.7);
  s.tapis(-1.6, -0.8, 1.3, 2.6, tapis);
  // la table (est), en long, et ses chaises
  s.table(2.5, 0.2, PI / 2, [['Mug', -0.9, 0.2], ['Pot_1', 0, 0, 0.9], ['Chalice', 0.6, -0.2, 0.9], [R() < 0.5 ? 'FarmCrate_Apple' : 'Book_Stack_1', -0.3, -0.1, 0.7, 0.3], ['Mug', 1.0, 0.15]]);
  s.chaise(1.55, -0.5, PI / 2); s.chaise(1.55, 0.9, PI / 2); s.chaise(3.45, 0.2, -PI / 2, 'Stool');
  // mur du fond, de part et d'autre du feu
  s.P('Bookcase_2', 2.3, -D / 2 + 0.25); s.bloc(1.55, -D / 2, 3.05, -D / 2 + 0.5); s.spot('livres', 2.3, -D / 2 + 1.2);
  s.P('Barrel', W / 2 - 0.5, -D / 2 + 0.5); s.rond(W / 2 - 0.5, -D / 2 + 0.5, 0.42);
  if (v === 0) { s.P('Workbench', -2.6, -D / 2 + 0.55); s.bloc(-3.65, -D / 2, -1.55, -D / 2 + 1.08); s.P('Bucket_Metal', -3.0, -D / 2 + 0.5, 0, 0.9, 0.89); s.accroche('Shield_Wooden', 'n', -2.6, 2.0, 1.1); }
  else if (v === 1) { s.caisse(-2.0, -D / 2 + 0.5, 0.8, 'FarmCrate_Apple', 0.9); s.P('Barrel_Apples', -2.95, -D / 2 + 0.5); s.rond(-2.95, -D / 2 + 0.5, 0.42); s.P('Bag', -3.75, -D / 2 + 0.45, 0.3); s.rond(-3.75, -D / 2 + 0.45, 0.35); }
  else { s.P('WeaponStand', -2.6, -D / 2 + 0.55); s.bloc(-3.3, -D / 2, -1.9, -D / 2 + 1.05); s.accroche('Sword_Bronze', 'n', -2.75, 2.2, 1.2, 0.75); s.accroche('Sword_Bronze', 'n', -2.45, 2.2, 1.2, -0.75); }
  // réserves près de la porte, étagère, seau
  s.P('Vase_2', W / 2 - 0.55, D / 2 - 0.55, 0, 0.8); s.rond(W / 2 - 0.55, D / 2 - 0.55, 0.36); s.P('Bag', W / 2 - 0.5, D / 2 - 1.4, -PI / 2); s.rond(W / 2 - 0.5, D / 2 - 1.4, 0.35);
  s.caisse(-W / 2 + 0.6, D / 2 - 0.6, 0.8, 'FarmCrate_Carrot', 0.9); s.P('Bucket_Wooden_1', -W / 2 + 0.45, D / 2 - 1.5, 0, 1.1);
  s.etagere('e', -1.7, 1.6, [['Potion_1'], ['Mug'], ['Vase_4', 0.5], ['Potion_4']]); s.lampe(W / 2 - 0.02, 1.9);
  s.fenetre('o', 1.9); s.fenetre('e', 0.2, 1.0); s.fenetre('s', 2.9); s.fenetre('s', -2.9);
  s.spot('coffre', -2.9, D / 2 - 0.62, PI); s.spot('table', 1.1, 2.0, PI / 2); s.spot('milieu', 0.4, 1.1, 0.3); s.spot('lit', -W / 2 + 2.6, -0.85, PI / 2);
  return s;
}

// L'auberge : la salle commune, le comptoir de l'aubergiste, et le dortoir derrière sa cloison (à l'ouest)
function auberge(id, pal, musique) {
  const R = rng(graineDe(id)), W = 17.4, D = 9, dx = 2.2, s = salle(W, D, pal, false, musique, dx), X = (x) => x + dx, E = W / 2, O = X(-6.5);   // E : mur est ; O : cloison du dortoir
  s.cheminee(X(-3.8), 1.25, true);
  // le comptoir (nord-est) : un « L » de planches, tonneaux en perce et vaisselle derrière
  const bar = new THREE.Group();
  bar.add(box(4.0, 1.0, 0.7, s.mBois, 3.6, 0.5, -1.7)); bar.add(box(4.2, 0.08, 0.86, mat(0x8a6238), 3.6, 1.04, -1.7));
  bar.add(box(0.7, 1.0, 2.5, s.mBois, 1.95, 0.5, -3.25)); bar.add(box(0.86, 0.08, 2.6, mat(0x8a6238), 1.95, 1.04, -3.2));
  s.obj(bar, dx, 0); s.bloc(X(1.6), -2.05, X(5.6), -1.35); s.bloc(X(1.6), -D / 2, X(2.3), -1.35);
  for (const [n, x, z, sc] of [['Mug', 2.6, -1.6], ['Mug', 3.1, -1.85], ['Chalice', 3.9, -1.6], ['Potion_2', 4.5, -1.75, 1.4], ['Pot_1', 5.1, -1.65, 0.9], ['Mug', 1.95, -2.6], ['Coin_Pile', 3.5, -1.5, 1.4], ['Book_Stack_1', 2.2, -1.75, 0.9]]) s.P(n, X(x), z, x, sc || 1, 1.08);
  s.P('Barrel_Holder', X(3.05), -D / 2 + 0.45); s.P('Barrel_Holder', X(4.5), -D / 2 + 0.45); s.bloc(X(2.3), -D / 2, X(5.2), -D / 2 + 0.85);
  s.P('Bookcase_2', X(5.75), -D / 2 + 0.25); s.bloc(X(5.0), -D / 2, X(6.5), -D / 2 + 0.5);
  s.etagere('n', X(3.7), 2.0, [['Mug'], ['Chalice'], ['Potion_2'], ['Mug'], ['Vase_4', 0.5]]);
  s.spot('comptoir', X(3.7), -2.75, 0); s.spot('client', X(3.2), -0.55, PI);
  // les tables : bancs pour les deux grandes, tabourets pour la troisième
  s.table(X(-3.7), 0.1, 0, [['Mug', -0.9, -0.25], ['Mug', 0.2, 0.2], ['Pot_1', 0.8, -0.1, 0.9], ['Chalice', -0.3, -0.2]]);
  s.P('Bench', X(-3.7), -0.78); s.P('Bench', X(-3.7), 0.98); s.bloc(X(-5.1), -1.05, X(-2.3), 1.25);
  s.table(X(-3.7), 2.95, 0, [['Mug', 0.6, 0.2], ['FarmCrate_Apple', -0.6, 0, 0.7, 0.4], ['Mug', -1.0, -0.25]]);
  s.P('Bench', X(-3.7), 2.07); s.P('Bench', X(-3.7), 3.83); s.bloc(X(-5.1), 1.8, X(-2.3), 4.1);
  s.table(X(3.7), 1.9, 0, [['Mug', -0.7, 0.2], ['Mug', 0.6, -0.2], ['Pot_1', 0, 0.1, 0.9]]);
  for (const [x, z] of [[3.0, 1.0], [4.4, 1.0], [3.0, 2.8], [4.4, 2.8]]) s.chaise(X(x), z, 0, 'Stool');
  s.spot('banc', X(-3.1), -0.78, 0, { assis: true }); s.spot('banc2', X(-4.3), 2.07, 0, { assis: true }); s.spot('tabouret', X(4.4), 2.8, PI, { assis: true }); s.spot('milieu', X(-0.9), 1.2, 0.4);
  s.spot('salle', X(0.9), -0.4, 0.5);
  s.tapis(dx, 1.9, 1.5, 4.6, pal.tapis[0]);
  // réserves et décor
  s.P('Barrel', E - 0.5, 3.95); s.rond(E - 0.5, 3.95, 0.42); s.P('Barrel_Apples', E - 1.25, 3.98); s.rond(E - 1.25, 3.98, 0.42); s.caisse(E - 0.55, 3.1, 0.85, null, 1, 0.2); s.P('Bag', E - 0.5, 0.3, -PI / 2); s.rond(E - 0.5, 0.3, 0.35);
  s.P('Barrel', O + 0.6, -2.2); s.rond(O + 0.6, -2.2, 0.42);
  s.accroche('Shield_Wooden', 'n', X(-1.3), 2.15, 1.3); s.lampe(X(0.6), -D / 2 + 0.02); s.lampe(E - 0.02, -0.6);
  s.etagere('e', 1.9, 1.6, [['Mug'], ['Mug'], ['Potion_2'], ['Chalice'], ['Vase_4', 0.5]]);
  s.fenetre('e', 3.5); s.fenetre('s', X(3.6)); s.fenetre('s', X(-3.6)); s.fenetre('n', X(-0.8), 1.0, 1.0, 2.0);
  s.spot('coffre', E - 0.62, -D / 2 + 3.6, -PI / 2);
  // --- le dortoir : quatre lits la tête au mur, tables de nuit, coffre des voyageurs, patères ---
  const xo = -W / 2;
  s.cloison(O - 0.1, -D / 2, 1.7);
  const lits = [-3.45, -1.35, 0.75, 2.85];
  lits.forEach((z, i) => s.lit(xo + 1.12, z, PI / 2, pal.lit[i % pal.lit.length] ^ (i > 1 ? 0x101810 : 0)));
  s.chevet(xo + 0.38, -2.4, 'Mug'); s.chevet(xo + 0.38, -0.3, 'Book_Stack_1'); s.chevet(xo + 0.38, 1.8, 'Potion_1');
  s.tapis(xo + 3.2, -1.2, 1.3, 5.2, pal.tapis[pal.tapis.length - 1]);
  s.P('Chest_Wood', O - 0.6, -D / 2 + 0.5, 0, 0.85); s.rond(O - 0.6, -D / 2 + 0.5, 0.5); s.P('Bag', O - 0.6, -2.6, -PI / 2); s.rond(O - 0.6, -2.6, 0.35);
  s.P('Stool', O - 0.55, -1.5); s.rond(O - 0.55, -1.5, 0.26); s.P('Bucket_Wooden_1', xo + 0.45, D / 2 - 0.5, 0, 1.1); s.P('Vase_2', xo + 1.5, D / 2 - 0.55, 0, 0.8); s.rond(xo + 1.5, D / 2 - 0.55, 0.36);
  s.fenetre('o', -2.4, 0.9, 0.9, 2.0); s.fenetre('o', 1.8, 0.9, 0.9, 2.0); s.fenetre('s', xo + 2.3, 1.1); s.lampe(xo + 2.6, -D / 2 + 0.02);
  s.spot('dortoir', xo + 3.0, 0.4, -PI / 2); s.spot('lits', xo + 2.5, -1.3, -PI / 2);
  return s;
}

// Une boutique : le comptoir en travers, le marchand derrière, les marchandises de son métier partout
function echoppe(genre) {
  return (id, pal, musique) => {
    const R = rng(graineDe(id)), W = 10, D = 7.4, s = salle(W, D, pal, false, musique), N = -D / 2;
    s.cheminee(-3.3, 1.0, genre === 'herboristerie');
    s.spot('comptoir', 0.9, -2.35, 0); s.spot('client', 0.9, 0.2, PI); s.spot('milieu', -1.6, 1.4, 0.4);
    s.tapis(0.9, 1.3, 3.6, 2.2, pal.tapis[0]);
    if (genre === 'armurerie') {
      // le comptoir : lames posées à plat, bouclier, bourse
      s.comptoir(-1.6, 3.4, -1.2, [['Coin_Pile', 2.1, 0.1, 1.5]]);
      s.aPlat('Sword_Bronze', -0.6, -1.2, 1.1, PI / 2, 1.15); s.aPlat('Sword_Bronze', 0.5, -1.05, 1.1, PI / 2 + 0.2, 1.15); s.aPlat('Axe_Bronze', 1.7, -1.25, 1.1, 0.3, 1.1); s.aPlat('Shield_Wooden', 2.9, -1.2, 1.09, 0, 1.0);
      // derrière le marchand : râteliers, armes au mur
      s.P('WeaponStand', 0.1, N + 0.55); s.P('WeaponStand', 1.75, N + 0.55); s.bloc(-0.6, N, 2.45, N + 1.05);
      for (const [u, rz] of [[-0.25, 0.6], [0.45, -0.6], [1.4, 0.6], [2.1, -0.6]]) s.accroche('Sword_Bronze', 'n', u, 2.2, 1.25, rz);
      s.accroche('Shield_Wooden', 'n', 0.1, 2.25, 1.15); s.accroche('Shield_Wooden', 'n', 1.75, 2.25, 1.15); s.accroche('Axe_Bronze', 'n', 3.4, 2.0, 1.3, 0.5); s.accroche('Pickaxe_Bronze', 'n', 4.2, 1.7, 1.1, -0.3);
      s.P('Barrel', 3.5, N + 0.5); s.rond(3.5, N + 0.5, 0.42); s.caisse(4.4, N + 0.5, 0.7, 'Pot_1', 0.8);
      // l'atelier (ouest) : enclume devant le feu, meule, seau de trempe
      s.P('Anvil', -3.3, -1.55, 0.3); s.rond(-3.3, -1.55, 0.55); s.P('Whetstone', -4.35, 0.3, PI / 2); s.rond(-4.35, 0.3, 0.6); s.P('Bucket_Metal', -2.3, -2.2, 0, 1.0);
      s.accroche('Shield_Wooden', 'o', 1.8, 1.9, 1.3); s.accroche('Sword_Bronze', 'o', 1.45, 2.0, 1.2, 0.7); s.accroche('Sword_Bronze', 'o', 2.15, 2.0, 1.2, -0.7);
      // les armures (est) : mannequins, caisses de fer
      s.P('Dummy', 4.35, 0.3, -PI / 2); s.rond(4.35, 0.3, 0.38); s.P('Dummy', 4.35, 1.7, -PI / 2); s.rond(4.35, 1.7, 0.38);
      s.accroche('Shield_Wooden', 'e', -1.2, 1.9, 1.2); s.accroche('Axe_Bronze', 'e', -2.2, 2.0, 1.2, 0.6);
      s.caisse(4.35, 3.05, 0.8, 'Shield_Wooden', 1); s.P('Barrel', -4.45, 3.1); s.rond(-4.45, 3.1, 0.42); s.P('WeaponStand', -4.35, 1.75, PI / 2); s.bloc(-W / 2, 1.05, -3.85, 2.45);
      s.spot('etabli', -2.6, -0.3, -2.4); s.spot('coffre', -3.3, D / 2 - 0.62, PI);
    } else {
      // le comptoir : fioles alignées, mortier, grimoire, balance
      s.comptoir(-1.6, 3.4, -1.2, [['Potion_1', -2.2, 0.1, 1.5], ['Potion_2', -1.8, -0.1, 1.4], ['Potion_4', -1.4, 0.12, 1.4], ['Potion_1', -1.0, -0.12, 1.5], ['Pot_1', -0.2, 0, 0.8], ['Book_Stack_1', 0.7, 0.05, 1.1], ['Scroll_1', 1.3, -0.1, 1.5, 0.5], ['Potion_2', 1.8, 0.1, 1.4], ['Potion_4', 2.15, -0.1, 1.4], ['Coin_Pile', 0.2, 0.22, 1.4]]);
      // derrière la marchande : rayonnages de fioles et de pots, sacs d'herbes
      for (const [u, y, objets] of [[0.1, 1.25, [['Potion_1', 1.4], ['Potion_2', 1.3], ['Potion_4', 1.3], ['Potion_1', 1.4], ['Potion_2', 1.3]]], [1.8, 1.25, [['Vase_4', 0.5], ['Potion_4', 1.3], ['Pot_1', 0.6], ['Potion_1', 1.4]]], [0.1, 1.95, [['Vase_4', 0.5], ['Potion_2', 1.3], ['Mug'], ['Potion_4', 1.3]]], [1.8, 1.95, [['Potion_1', 1.4], ['Vase_4', 0.45], ['Potion_2', 1.3], ['Book_Stack_1', 0.8]]]]) s.etagere('n', u, y, objets);
      s.P('Bag', -0.3, N + 0.4, 0.2); s.P('Bag', 0.5, N + 0.4, -0.3); s.P('Barrel', 1.5, N + 0.5); s.caisse(2.45, N + 0.5, 0.7, 'Vase_4', 0.6); s.bloc(-0.7, N, 3.0, N + 0.9);
      s.P('Bookcase_2', 4.1, N + 0.25); s.bloc(3.35, N, 4.85, N + 0.5); s.spot('livres', 4.1, N + 1.2);
      // bottes d'herbes qui sèchent, pendues à une perche au-dessus du comptoir
      const perche = new THREE.Group(); perche.add(box(5.2, 0.07, 0.07, s.mBois, 0, 0, 0));
      for (let i = 0; i < 11; i++) { const c = cone(0.1 + R() * 0.05, 0.34 + R() * 0.14, [0x5a8a3a, 0x7a9a4a, 0x8a6aa0, 0x4a7a4a, 0xb0a050][i % 5], -2.4 + i * 0.48, -0.24, 0, 6); c.rotation.x = PI; perche.add(c); perche.add(box(0.015, 0.1, 0.015, 0x6a5a3a, -2.4 + i * 0.48, -0.04, 0)); }
      s.obj(perche, 0.9, -1.2, 0, 2.55);
      // l'atelier (ouest) : le chaudron est sur le feu ; pilon, seau, plantes en pot
      s.P('BookStand', -2.2, -1.9, 0.5); s.rond(-2.2, -1.9, 0.32); s.P('Bucket_Wooden_1', -4.4, -1.3, 0, 1.1);
      const pot = (x, z, plante, h = 0.6) => { const kv = 0.5 / taillePiece('Vase_2').h; s.P('Vase_2', x, z, 0, kv); s.rond(x, z, 0.32); if (hasPiece(plante)) s.P(plante, x, z, R() * 6, h / taillePiece(plante).h, 0.42); };
      pot(-4.4, 0.3, 'Fern_1', 0.7); pot(-4.4, 1.3, 'Flower_3_Group'); pot(-4.4, 2.3, 'Bush_Common', 0.7);
      pot(4.4, 0.6, 'Flower_4_Group'); pot(4.4, 1.6, 'Fern_1', 0.7); pot(4.4, 2.6, 'Flower_3_Group');
      s.etagere('e', -1.4, 1.6, [['Potion_4', 1.3], ['Vase_4', 0.5], ['Potion_1', 1.4], ['Mug']]); s.etagere('o', 1.3, 1.9, [['Vase_4', 0.45], ['Potion_2', 1.3], ['Potion_1', 1.4]]);
      s.spot('coffre', -3.3, D / 2 - 0.62, PI);
    }
    s.lampe(-W / 2 + 0.02, -0.6); s.lampe(W / 2 - 0.02, -0.4, 2.3); s.fenetre('s', 3.2); s.fenetre('s', -3.2); s.fenetre('e', 2.2, 1.0, 1.0, 2.1);
    return s;
  };
}

function demeure(id, pal, musique) {
  const W = 11, D = 8, s = salle(W, D, pal, false, musique);
  s.cheminee(0, 1.15, false);
  // armes au-dessus de l'âtre
  const epee = (x, rz) => { const e = piece('Sword_Bronze', 0, 0, 0, 0, 1.25); e.rotation.z = rz; s.st.deco(e, x, -D / 2 + 0.72, 0, 2.35); };
  epee(-0.12, 0.75); epee(0.12, -0.75); s.P('Shield_Wooden', 0, -D / 2 + 0.74, 0, 1.0, 2.35);
  // le cabinet (nord-ouest) : bibliothèques, bureau, lutrin
  s.P('Bookcase_2', -4.6, -D / 2 + 0.25); s.P('Bookcase_2', -3.1, -D / 2 + 0.25); s.bloc(-W / 2, -D / 2, -2.3, -D / 2 + 0.5); s.spot('livres', -3.8, -D / 2 + 1.25);
  s.table(-3.7, -0.9, 0, [['Scroll_1', -0.8, -0.1, 1.4, 0.4], ['Scroll_1', -0.5, 0.2, 1.4, 1.2], ['Book_Stack_1', 0.7, -0.15, 1.1], ['Coin_Pile', 0.2, 0.2, 1.5], ['Chalice', 1.05, 0.25], ['Potion_1', -0.1, -0.25, 1.2]]);
  s.chaise(-3.7, -1.8, 0); s.P('BookStand', -1.75, -1.6, 0.5); s.rond(-1.75, -1.6, 0.32); s.spot('bureau', -3.7, 0.2, PI);
  s.P('WeaponStand', -W / 2 + 0.6, 1.9, PI / 2); s.bloc(-W / 2, 1.2, -W / 2 + 1.05, 2.6);
  s.P('Vase_2', -W / 2 + 0.55, D / 2 - 0.55); s.rond(-W / 2 + 0.55, D / 2 - 0.55, 0.4); s.P('Flower_4_Group', -W / 2 + 0.55, D / 2 - 0.55, 0, 0.32, 0.4);
  // la chambre (nord-est) : grand lit, coffre au pied
  s.lit(W / 2 - 0.85, -D / 2 + 1.2, 0, pal.lit[0], 1.45); s.caisse(W / 2 - 2.15, -D / 2 + 0.42, 0.55, 'Book_Stack_1'); s.lampe(W / 2 - 2.15, -D / 2 + 0.02);
  s.spot('coffre', W / 2 - 0.62, -1.15, -PI / 2);
  // la table à manger (sud-est)
  s.table(2.7, 1.9, 0, [['Pot_1', -0.6, 0, 0.9], ['Chalice', 0.2, -0.2], ['Chalice', 0.7, 0.2], ['FarmCrate_Apple', -0.1, 0.1, 0.7, 0.2], ['Mug', 1.05, -0.2]]);
  s.chaise(2.1, 1.05, 0); s.chaise(3.3, 1.05, 0); s.chaise(2.1, 2.75, PI); s.chaise(3.3, 2.75, PI);
  s.tapis(-0.9, 1.6, 3.4, 2.3, pal.tapis[0]);
  s.P('Vase_4', W / 2 - 0.45, D / 2 - 0.5, 0, 1.3); s.P('Barrel_Apples', W / 2 - 0.5, 0.2); s.rond(W / 2 - 0.5, 0.2, 0.42);
  s.etagere('o', 0.2, 1.6, [['Potion_4'], ['Book_Stack_1'], ['Vase_4', 0.5], ['Chalice']]);
  s.lampe(-W / 2 + 0.02, -1.4); s.lampe(W / 2 - 0.02, 1.9);
  s.fenetre('o', -2.6, 1.0); s.fenetre('e', -0.4); s.fenetre('s', 3.2); s.fenetre('s', -3.2); s.fenetre('n', 2.6, 1.0, 1.0, 2.0);
  s.spot('milieu', -0.9, 1.4, 0);
  return s;
}

// « maison » : l'une des deux chaumières, selon le numéro de la maison
const maisonAuChoix = (id, pal, musique) => (graineDe(id) % 5 < 2 ? logis : chaumiere)(id, pal, musique);
const PLANS = { maison: maisonAuChoix, chaumiere, logis, auberge, chef: demeure, armurerie: echoppe('armurerie'), herboristerie: echoppe('herboristerie') };

// ---------- Qui habite où, et ce qu'on y trouve ----------
// pnj : { char (modèle), over (couleurs), spot, nom (dans « Parler … »), lignes } ; coffre : { item, n } ou { or } ;
// lire : { spot, label, lignes }. Les maisons sans entrée ici sont simplement meublées.
const K = 'KAEL';
export const CONTENU = {
  // --- Brumeval, le matin de la Fête de l'Aube ---
  bv0: { lire: [{ spot: 'table', label: 'Regarder la table', lignes: [[K, "Des brioches de l'Aube, encore tièdes. Le boulanger en a caché une fournée chez lui... Je n'ai rien vu."]] }] },
  bv1: { pnj: [{ char: 'villageoise1', over: { hair: 0xd8d8d8, top: 0x7a6aa0 }, spot: 'feu', nom: 'à la grand-mère', lignes: [['GRAND-MÈRE', "Entre, entre, petit. Tu es l'apprenti de Hagen, n'est-ce pas ? Il grogne, mais il a le cœur à la bonne place."], ['GRAND-MÈRE', "Va donc danser sur la place. À mon âge, on regarde la fête par la fenêtre, et c'est déjà beaucoup."]] }], coffre: { item: 'herbe', n: 2 } },
  bv2: { pnj: [{ char: 'villageois1', over: { top: 0x6a7a4a }, spot: 'milieu', nom: 'au chasseur', lignes: [['CHASSEUR', "Les loups descendent du bois plus tôt que d'habitude, cette année. Quelque chose les dérange, là-haut."], ['CHASSEUR', "Si tu passes le pont, reste sur le sentier. Et garde ton arme à la main."]] }] },
  bv3: { coffre: { or: 15 }, lire: [{ spot: 'feu', label: 'Regarder le feu', lignes: [[K, "Personne. Tout le monde est sur la place... et le feu est resté allumé."]] }] },
  bv4: { pnj: [{ char: 'villageoise1', over: { hair: 0x4a3020, top: 0xc86a8a }, spot: 'table', nom: 'à la tisserande', lignes: [['TISSERANDE', "Je finis les derniers rubans du mât. Chaque couleur est un vœu : le rouge pour le courage, le bleu pour la paix."], ['TISSERANDE', "Tu en veux un ? Non ? Les garçons de ton âge ne croient plus aux vœux. Dommage."]] }] },
  bv5: { lire: [{ spot: 'milieu', label: 'Regarder autour de soi', lignes: [[K, "Ça sent le pain et la cire. On laisse sa porte ouverte, à Brumeval. Personne n'a jamais eu de raison de la fermer."]] }], coffre: { item: 'potion', n: 1 } },
  bv6: { pnj: [{ char: 'enfant2', spot: 'lit', nom: 'à la fillette', lignes: [['FILLETTE', "Chut ! Je joue à cache-cache. Si Pierrot demande, tu ne m'as pas vue."], [K, "Je n'ai vu personne."], ['FILLETTE', "T'es le meilleur, Kael !"]] }] },
  bv7: { pnj: [{ char: 'villageois1', over: { hair: 0xe0e0e0, top: 0x8a7a5a }, spot: 'feu', nom: 'au vieil homme', lignes: [['VIEIL HOMME', "Des soldats gris à la frontière du nord, qu'ils racontent à l'auberge. Bah ! J'ai entendu ça toute ma vie."], ['VIEIL HOMME', "Brumeval n'a ni or ni château. Qui viendrait jusqu'ici ?"]] }] },
  bv_auberge: {
    pnj: [
      { char: 'villageoise1', over: { hair: 0x8a4a2a, top: 0xe0a85a }, spot: 'comptoir', nom: 'à la cuisinière', lignes: [['CUISINIÈRE', "Gaspard fait le beau dehors pendant que je tiens les fourneaux. Comme à chaque Fête de l'Aube."], ['CUISINIÈRE', "Ce soir, ragoût pour tout le village. Dis à Hagen de venir avant qu'il n'en reste plus."]] },
      { char: 'villageois1', over: { hair: 0x3a2a20, top: 0x5a7ab0 }, spot: 'banc2', nom: 'au buveur', lignes: [['BUVEUR', "La bière du Coq Doré, il n'y a pas meilleure d'ici à Solméria."], ['BUVEUR', "... Bon. Je ne suis jamais allé à Solméria. Mais ça se saurait."]] },
    ],
    lire: [{ spot: 'feu', label: 'Regarder la marmite', lignes: [[K, "Le ragoût de la fête mijote depuis l'aube. Ça sent le thym et le lard."]] }],
  },
  bv_chef: {
    lire: [
      { spot: 'bureau', label: 'Regarder le bureau', lignes: [[K, "Les registres des récoltes. Trente ans d'écriture serrée, pas une année manquante. Le chef Aubin ne laisse rien au hasard."]] },
      { spot: 'livres', label: 'Regarder les livres', lignes: [[K, "Des livres de comptes, un traité de labour... et un recueil de contes de l'Aube, usé à force d'être lu."]] },
      { spot: 'coffre', label: 'Regarder le coffre', lignes: [[K, "Le coffre du chef. Fermé à clé, évidemment."]] },
    ],
  },
  // --- Relais du Cerf Blanc ---
  relais: {
    pnj: [
      { char: 'citadin3', spot: 'tabouret', nom: 'au voyageur', lignes: [['VOYAGEUR', "Je descends de Solméria. Deux jours de marche, et des gardes à chaque carrefour."], ['VOYAGEUR', "La Cité Blanche est belle, vous verrez. Mais gardez votre bourse contre vous sur la place du Marché."]] },
      { char: 'villageoise1', over: { hair: 0x6a4a30, top: 0x9a5a4a }, spot: 'salle', nom: 'à la servante', lignes: [['SERVANTE', "Les chambres, c'est Berthe, au comptoir. Moi, je ne sers que la soupe."], ['SERVANTE', "Le dortoir est derrière la cloison. Quatre lits, des draps propres : c'est plus qu'on n'en trouve d'ici à Solméria."]] },
    ],
    tenancier: 'berthe',
    lire2: [{ spot: 'lits', label: 'Regarder les lits', lignes: [[K, "Des vrais lits. Avec des vraies couvertures. Il faut demander à Berthe, au comptoir."]] }],
    lire: [{ spot: 'feu', label: 'Se réchauffer', lignes: [[K, "Un vrai feu, un toit. Après les Murmures, ça ressemble à un palais."]] }],
  },
  // --- Port-Azur ---
  port_orphelinat: {
    pnj: [
      { char: 'enfant1', spot: 'banc', nom: "à l'orphelin", lignes: [['ORPHELIN', "Tim dit qu'un jour il aura un bateau à lui. Et qu'on montera tous dedans."], ['ORPHELIN', "Moi je serai vigie. C'est celui qui voit les choses avant tout le monde."]] },
      { char: 'enfant2', spot: 'milieu', nom: "à l'orpheline", lignes: [['ORPHELINE', "Quarante pièces par mois, c'est ce que coûte un de nous. Je le sais, j'ai écouté à la porte."]] },
    ],
    lire: [{ spot: 'lits', label: 'Regarder les lits', lignes: [[K, "Quatre lits pour tous ces enfants. Ils doivent dormir tête-bêche."], ['NYSSA', "Trois par lit, l'hiver. On a moins froid. ... Quoi ? Tout le monde sait ça."]] }],
  },
  // --- Solméria ---
  sol_fer: { tenancier: 'gontran', lire: [{ spot: 'etabli', label: "Regarder l'enclume", lignes: [[K, "Une enclume deux fois plus lourde que celle de Hagen. Et pas une trace de rouille."]] }] },
  sol_mandragore: { tenancier: 'ysolde', lire: [{ spot: 'livres', label: 'Regarder les grimoires', lignes: [['LYRA', "« Des simples et de leurs vertus », « Poisons lents »... Elle a une meilleure bibliothèque que mon ancien maître."]] }] },
  sol_auberge: {
    tenancier: 'hotesse',
    pnj: [
      { char: 'citadin1', spot: 'banc', nom: 'au buveur', lignes: [['BUVEUR', "Sept couronnes la chambre, du temps de mon père. Aujourd'hui vingt pièces le lit ! Tout augmente, sauf ma solde."]] },
      { char: 'citadine2', spot: 'tabouret', nom: 'à la voyageuse', lignes: [['VOYAGEUSE', "Je venais vendre du drap au nord. On m'a fait faire demi-tour à la troisième borne. « Route fermée », et pas un mot de plus."]] },
    ],
    lire: [{ spot: 'lits', label: 'Regarder les lits', lignes: [[K, "Des draps blancs, des couvertures bleues. L'hôtesse loue les lits à la nuit : il faut le lui demander au comptoir."]] }],
  },
  sol1: { pnj: [{ char: 'citadine1', spot: 'milieu', nom: "à l'habitante", lignes: [['HABITANTE', "Vous regardez nos toits ? De l'ardoise bleue des Collines de Granit. Toute la ville en est couverte."], ['HABITANTE', "On dit qu'un géant de pierre garde la carrière. Des histoires pour faire peur aux apprentis, si vous voulez mon avis."]] }] },
  sol2: { pnj: [{ char: 'citadin2', spot: 'feu', nom: "à l'artisan", lignes: [['ARTISAN', "Trois générations de tonneliers dans cette maison. Et pas une seule fuite !"], ['ARTISAN', "Si vous cherchez de bonnes lames, allez « Au Fer Droit ». Gontran est cher, mais son acier ne ment pas."]] }], coffre: { item: 'potion', n: 1 } },
  sol3: { pnj: [{ char: 'citadine3', spot: 'table', nom: 'à la couturière', lignes: [['COUTURIÈRE', "Entrez, mais ne touchez à rien : ces étoffes partent au château demain."], ['COUTURIÈRE', "La princesse Alinor choisit elle-même ses couleurs. Du bleu, toujours du bleu."]] }] },
};

// ---------- Les maisons que l'histoire ne décrit pas ----------
// Selon le lieu : qui peut s'y trouver et ce qu'il dit. Une maison sur trois est vide (ses habitants sont sortis).
const HABITANTS = {
  solmeria: { chars: ['citadin1', 'citadine1', 'citadin2', 'citadine2', 'citadin3', 'citadine3'], noms: ["à l'habitant", "à l'habitante"], lignes: [
    [['HABITANT', "Vous entrez chez les gens comme ça, vous ? ... Bah. Asseyez-vous, tant que vous y êtes."]],
    [['HABITANTE', "Les cloches du château ont sonné deux fois cette semaine. D'habitude, c'est pour les naissances ou pour les guerres."]],
    [['HABITANT', "Mon fils est dans la Garde. Il dit que le capitaine Borin dort tout habillé, l'épée sur les genoux."]],
    [['HABITANTE', "Le pain a encore augmenté. Quand le blé du nord ne descend plus, c'est toute la ville qui a faim."]],
    [['HABITANT', "Fermez la porte en sortant. Il y a des rats gros comme des chats qui remontent du canal."]],
    [['HABITANTE', "Si vous cherchez un lit, les Sept Couronnes sont dans la rue des Artisans. Ici, ce n'est pas une auberge."]],
  ] },
  port: { chars: ['marin', 'citadine2', 'marin2', 'citadin1'], noms: ['au marin', "à l'habitante"], lignes: [
    [['MARIN', "Trois mois que mon bateau pourrit à quai. Sans gouvernail, c'est une baignoire."]],
    [['HABITANTE', "Mon homme répare ses filets tous les soirs. Pour quoi faire ? Personne ne sort plus du port."]],
    [['MARIN', "Les Mouettes Noires ont pris tous les gouvernails. Celui qui paie le récupère... pour une semaine."]],
    [['HABITANTE', "Les petits de l'orphelinat viennent chercher du pain ici. Je n'ai jamais su dire non."]],
    [['MARIN', "La Vouivre ? Le seul navire qui ose encore défier Varek. Sa capitaine a plus de cran que tout le port réuni."]],
  ] },
  brasegarde: { chars: ['nain', 'naine', 'nain2'], noms: ['au nain', 'à la naine'], lignes: [
    [['NAIN', "Une maison de nain se taille, elle ne se bâtit pas. Celle-ci, c'est mon arrière-grand-père qui l'a creusée."]],
    [['NAINE', "Vous sentez la chaleur dans les murs ? C'est la montagne qui respire. On s'y fait. On ne s'en passe plus."]],
    [['NAIN', "Mon frère est aux mines. Il n'est pas remonté depuis quatre jours. Ici, personne n'ose compter plus loin."]],
    [['NAINE', "Asseyez-vous, les Grands. Baissez la tête, surtout : les poutres n'ont pas été pensées pour vous."]],
  ] },
};
const LIEUX_PALETTE = { solmeria: 'cite', port: 'port', brasegarde: 'nain' };
function contenuDe(id, lieu) {
  if (CONTENU[id]) return CONTENU[id];
  const H = HABITANTS[lieu]; if (!H) return {};
  const R = rng(graineDe(id) + 5), c = {};
  if (R() < 0.8) {
    const lignes = H.lignes[Math.floor(R() * H.lignes.length)], qui = lignes[0][0], femme = /E$/.test(qui);
    const choix = H.chars.filter((k) => (qui === 'MARIN' ? /^marin/.test(k) : !/^marin/.test(k) && /(e\d?|naine)$/.test(k) === femme)), char = choix[Math.floor(R() * choix.length)] || H.chars[0];
    c.pnj = [{ char, spot: ['feu', 'table', 'milieu'][Math.floor(R() * 3)], nom: H.noms[femme ? 1 : 0], lignes }];
  }
  const t = R(); if (t < 0.22) c.coffre = { or: 10 + Math.floor(R() * 4) * 5 }; else if (t < 0.4) c.coffre = { item: 'potion', n: 1 }; else if (t < 0.48) c.coffre = { item: 'antidote', n: 1 };
  return c;
}
// Le personnage « key » du lieu tient-il boutique dans une des maisons ? (il attend alors à l'intérieur, pas dans la rue)
export function loge(st, key) { return !!st.maisonsOuvertes && ((st.spots && st.spots.maisons) || []).some((m) => (CONTENU[m.id] || {}).tenancier === key); }

// ---------- Construire un intérieur ----------
// T : les outils de l'histoire (npc, chest, reader, give) ; o : { musique, palette }
export function construireInterieur(type, id, T = {}, o = {}) {
  const pal = PALETTES[o.palette] || PALETTES[LIEUX_PALETTE[o.lieu ? o.lieu.name : '']] || PALETTES[type === 'auberge' ? 'auberge' : type === 'chef' ? 'chef' : 'village'];
  const lieu = o.lieu, nomLieu = lieu ? lieu.name : '';
  const s = (PLANS[type] || chaumiere)(id, pal, o.musique || '').finir(), st = s.st, c = contenuDe(id, nomLieu), F = G.flags;
  st.interieur = s;
  // celui qui tient la maison (aubergiste, marchand) : le même personnage, la même conversation que dans l'histoire, derrière son comptoir
  const hote = c.tenancier && lieu && lieu.actors[c.tenancier], fiche = hote && hote.userData.fiche, spC = s.spots.comptoir;
  if (fiche && spC && T.npc) { const perso = T.npc(st, 'tenancier', fiche.charKey, spC.x, spC.z, spC.ry, fiche.label, fiche.action, fiche.over); const it = st.inter[st.inter.length - 1]; if (it && it.obj === perso) it.r = 3.3; }
  for (const [i, p] of (c.pnj || []).entries()) {
    const sp = s.spots[p.spot] || s.spots.milieu; if (!sp || !T.npc) continue;
    const perso = T.npc(st, 'hab' + i, p.char, sp.x, sp.z, sp.ry, p.nom, () => talk(p.lignes), p.over);
    if (sp.assis && perso.userData.imported) { perso.userData.idle = 'Sitting_Idle_Loop'; perso.userData.assis = true; }
  }
  const sc = s.spots.coffre;
  if (c.coffre && sc && T.chest) {
    T.chest(st, 'int_' + id, sc, sc.ry, async () => {
      if (c.coffre.or) { G.gold += c.coffre.or; updateGold(); sfx('item'); toast(`Trouvé : <b>${c.coffre.or} pièces d'or</b>`); }
      else if (T.give) T.give(c.coffre.item, c.coffre.n || 1);
    });
  } else if (sc && decorReady()) { st.deco(piece('Chest_Wood', 0, 0, 0, 0, 0.85), sc.x, sc.z, sc.ry); st.circle(sc.x, sc.z, 0.5); }
  for (const l of [...(c.lire || []), ...(c.lire2 || [])]) { const sp = s.spots[l.spot]; if (sp && T.reader) T.reader(st, sp, l.label, l.lignes); }
  return st;
}

// ---------- Brancher les portes d'un lieu ----------
// Toutes les maisons posées avec st.house() s'ouvrent ; celles de st.spots.maisons ont un plan et un contenu choisis.
// Une maison sans porte connue peut donner la sienne : { porte: { x, z, nx, nz } } (nx, nz : vers la rue).
export function brancherMaisons(st, T, o = {}) {
  const S = st.spots || (st.spots = {}), liste = S.maisons || (S.maisons = []); st.maisonsOuvertes = true;
  if (o.toutes !== false) (st.batiments || []).forEach((obj, i) => { if (!liste.some((m) => m.obj === obj)) liste.push({ obj, type: 'maison', id: (st.name || 'lieu') + '_m' + i }); });
  for (const m of liste) {
    const p = m.porte || (m.obj && infosMaison(m.obj).porte); if (!p) continue;
    const dehors = { x: p.x + p.nx * 1.35, z: p.z + p.nz * 1.35, ry: Math.atan2(p.nx, p.nz) };
    const b = st.bounds; if (p.x < b[0] || p.x > b[1] || p.z < b[2] || p.z > b[3]) continue;                              // porte hors du terrain : on ne peut pas l'atteindre
    dehors.x = Math.min(b[1] - 0.45, Math.max(b[0] + 0.45, dehors.x)); dehors.z = Math.min(b[3] - 0.45, Math.max(b[2] + 0.45, dehors.z));
    st.interact({ x: p.x + p.nx * 0.4, z: p.z + p.nz * 0.4, r: 1.3, label: m.label || 'Entrer', action: () => entrer(st, m, dehors, T, o) });
  }
}

async function entrer(lieu, m, dehors, T, o) {
  sfx('step'); await fade(true, 260);
  const dedans = construireInterieur(m.type, m.id, T, { musique: lieu.music, palette: m.palette || o.palette, lieu });
  const s = dedans.interieur, z = s.sortie;
  dedans.trigger({ x1: z.x1, x2: z.x2, z1: z.z1, z2: z.z2, once: true, action: async () => {
    sfx('step'); await fade(true, 260);
    E.setStage(lieu, { x: dehors.x, z: dehors.z, ry: dehors.ry, yaw: dehors.ry });   // la caméra se place dehors, face à la porte
    await fade(false, 260);
  } });
  E.setStage(dedans, { x: s.entree.x, z: s.entree.z, ry: PI, yaw: 0 });
  // les compagnons entrent derrière le joueur, sans traverser le mur
  E.followers.forEach((f, i) => { f.position.set(s.entree.x + (i % 2 ? 0.9 : -0.9) * (1 + Math.floor(i / 2)), 0, s.entree.z + 0.5); f.userData.gy = undefined; });
  await fade(false, 260);
}
