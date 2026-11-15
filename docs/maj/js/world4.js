// ============================================================
//  LES LIEUX DU CHAPITRE 4 : les Collines de Granit et le Sanctuaire de la Terre
//  Convention : nord = -z, est = +x. 1 unité = 1 mètre.
//  Les collines : une piste qui monte vers le nord entre des blocs de granit, jusqu'à la porte aux sept symboles.
//  Le sanctuaire : un donjon de six salles en enfilade (entrée, blocs, dalles, braseros, antichambre, Gardien).
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { Stage } from './engine.js';
import { horizon } from './paysage.js';
import { box, sph, cyl, cone, flat, disc, mat, makeTree, makeBush, makeRock, makeStatue, makeFire, makeCrate, makeBarrel } from './models.js';
import { decorReady, sprinkle } from './decor.js';
import { bloc as B, colonne as C, dalle as G, kit as P, matiere as W, room, rng, PLAN } from './world3.js';

const PI = Math.PI;
export const SYMBOLES = [0xc09a50, 0xff6a2a, 0x6ac8ff, 0x9af0a0, 0xf7e85a, 0xfff4c2, 0x8a50d0];     // Terre, Feu, Eau, Vent, Foudre, Lumière, Ombre

// ============================================================
//  LES COLLINES DE GRANIT
// ============================================================
export function buildCollines() {
  const R = rng(404);
  const st = new Stage({ name: 'collines', bounds: [-21, 21, -112, 13], sky: 0xa8d0f4, fog: [0xd8e4ee, 90, 620], hemi: [0xffffff, 0x9a9070, 1.1], sun: [0xfff2d0, 1.25, [30, 50, 40]], music: 'forest' });
  const S = st.spots = {};
  st.deco(flat(700, 700, 0x9aa868, 0, 0, 0));
  // la piste : des tronçons de terre claire qui serpentent vers le nord
  const piste = [[0, 12], [0, 0], [-5, -14], [-6, -30], [2, -44], [7, -58], [3, -72], [-3, -86], [0, -100], [0, -111]];
  for (let i = 0; i < piste.length - 1; i++) {
    const [x1, z1] = piste[i], [x2, z2] = piste[i + 1], len = Math.hypot(x2 - x1, z2 - z1);
    const p = flat(3.4, len + 1.6, 0xcdb88a, (x1 + x2) / 2, 0.04, (z1 + z2) / 2); p.rotation.z = Math.atan2(x2 - x1, z2 - z1); st.deco(p);
  }
  const surPiste = (x, z, marge = 3) => { for (let i = 0; i < piste.length - 1; i++) { const [x1, z1] = piste[i], [x2, z2] = piste[i + 1], dx = x2 - x1, dz = z2 - z1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz))); if (Math.hypot(x - x1 - t * dx, z - z1 - t * dz) < marge) return true; } return false; };
  for (let i = 0; i < 40; i++) st.deco(disc(1.5 + R() * 2.5, R() < 0.5 ? 0xa8b472 : 0x8e9c5e, -20 + R() * 40, 0.03, -110 + R() * 120));
  // falaises des deux côtés (gros blocs serrés) et blocs épars
  for (let z = 12; z > -114; z -= 4.2) for (const c of [-1, 1]) { const x = c * (23.5 + R() * 2), s = 3.4 + R() * 2.4; st.deco(makeRock(s, 0x8f887c), x, z + R() * 2, R() * 6); if (R() < 0.6) st.deco(makeRock(s * 0.8, 0x99917f), x + c * 4, z + 2, R() * 6, 2 + R() * 2); }
  st.wall(-40, -116, -21.5, 16); st.wall(21.5, -116, 40, 16);
  S.rochers = [];
  for (let i = 0; i < 46; i++) {
    const x = -19 + R() * 38, z = -106 + R() * 114, s = 0.9 + R() * 1.9;
    if (surPiste(x, z, 2.6 + s)) continue;
    st.prop(makeRock(s, R() < 0.5 ? 0x8f887c : 0xa39a88), x, z, R() * 6, s * 0.95); S.rochers.push({ x, z, r: s * 1.1 });
  }
  for (let i = 0; i < 16; i++) { const x = -19 + R() * 38, z = -104 + R() * 112; if (surPiste(x, z, 3.5) || S.rochers.some(r => Math.hypot(r.x - x, r.z - z) < r.r + 1.2)) continue; st.prop(makeTree(R() < 0.6 ? 'round' : 'birch', 0.8 + R() * 0.4), x, z, R() * 6, 0.45); }
  for (let i = 0; i < 22; i++) { const x = -19 + R() * 38, z = -104 + R() * 112; if (surPiste(x, z, 2.4)) continue; st.deco(makeBush(0.6 + R() * 0.6), x, z, R() * 6); }
  if (decorReady()) sprinkle(st, 260, R, [-20, 20, -108, 12], (x, z) => surPiste(x, z, 1.9) || S.rochers.some(r => Math.hypot(r.x - x, r.z - z) < r.r));
  // départ : borne et statue
  const borne = new THREE.Group(); borne.add(box(0.5, 1.3, 0.3, 0xb8b0a0, 0, 0.65, 0)); borne.add(box(0.8, 0.5, 0.06, 0x8a6a40, 0, 1.1, 0.19)); st.prop(borne, 2.6, 7, -0.3, 0.4); S.borne = { x: 2.6, z: 7 };
  st.prop(makeStatue(), -3.4, 5, PI / 5, 0.7); S.statue = { x: -3.4, z: 5 };
  // bivouac à mi-chemin
  S.camp = { x: -2.4, z: -47 }; st.deco(disc(2.6, 0x8a7a5a, S.camp.x, 0.045, S.camp.z));
  for (let i = 0; i < 7; i++) st.deco(sph(0.2, 0x6a6a66, S.camp.x + Math.cos(i * 0.9) * 0.6, 0.1, S.camp.z + Math.sin(i * 0.9) * 0.6));
  st.add(makeFire(0.7, true), S.camp.x, S.camp.z, 0, 0.1); st.circle(S.camp.x, S.camp.z, 0.7);
  for (const [dx, dz, r] of [[-1.7, 0.4, 1.3], [0.6, -1.7, 0]]) { const t = cyl(0.22, 0.22, 1.5, 0x7a5a36, 0, 0.22, 0, 8); t.rotation.z = PI / 2; t.rotation.y = r; st.prop(t, S.camp.x + dx, S.camp.z + dz, r, 0.5); }
  S.coffreCamp = { x: -5.4, z: -49.2 }; S.coffreCache = { x: 15.5, z: -77 };
  // la falaise du fond et la porte aux sept symboles
  const roc = W('mur_blanc', 0x9a9284, 7, 0x8a8070, 1.0), pierre = W('mur_blanc', 0xd8c8a8, 3, 0xa89878, 1.25);
  B(st, roc, 60, 22, 8, 0, 11, -118); B(st, roc, 14, 26, 10, -16, 13, -116); B(st, roc, 14, 28, 10, 16, 14, -116);
  B(st, pierre, 9, 9.5, 1.2, 0, 4.75, -113.6); B(st, pierre, 11, 1.2, 1.8, 0, 9.9, -113.5);
  for (const c of [-1, 1]) { C(st, pierre, 0.75, 9, c * 4.1, 4.5, -112.6); B(st, pierre, 2.1, 0.6, 2.1, c * 4.1, 0.3, -112.6); B(st, pierre, 2.1, 0.5, 2.1, c * 4.1, 9.2, -112.6); st.circle(c * 4.1, -112.6, 1.0); }
  const porte = new THREE.Group(), ombre = mat(0x4a4238);
  porte.add(box(5.2, 7.2, 0.4, 0x6e6252, 0, 3.6, 0)); porte.add(box(0.12, 7.2, 0.44, 0x2a241e, 0, 3.6, 0.01));
  S.symboles = SYMBOLES.map((c, i) => {
    const a = PI - i * PI / 6, m = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), new THREE.MeshBasicMaterial({ color: 0x3a342c }));
    m.position.set(Math.cos(a) * 1.9, 3.6 + Math.sin(a) * 1.9, 0.22); m.userData.couleur = c; porte.add(m); return m;
  });
  const cercle = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 24), new THREE.MeshBasicMaterial({ color: 0x3a342c })); cercle.position.set(0, 3.2, 0.22); porte.add(cercle); S.cercle = cercle;
  porte.position.set(0, 0, -112.9); st.add(porte); S.porteObj = porte; S.porte = { x: 0, z: -110.4 };
  st.wall(-21, -116, 21, -112.4);
  S.mobs = [
    { id: 'col1', x: -4.5, z: -17, enemies: ['serpent', 'serpent'] }, { id: 'col2', x: -7, z: -31, enemies: ['guepe', 'guepe'] },
    { id: 'col3', x: 6.5, z: -60, enemies: ['araignee', 'serpent'] }, { id: 'col4', x: 13, z: -72, enemies: ['guepe', 'guepe', 'serpent'], roam: 2 },
    { id: 'col5', x: -2.5, z: -88, enemies: ['araignee', 'araignee'] },
  ];
  horizon(st, R, { rayon: 320, mount: 0x9a8e7c, snow: 0xf4f0e8 });
  st.bake();
  return st;
}

// ============================================================
//  LE SANCTUAIRE DE LA TERRE
// ============================================================
export const SALLE_BLOCS = { x1: -7, x2: 7, z1: -16, z2: -2 };
export function buildSanctuaire() {
  const R = rng(4040), H = 5.2;
  const st = new Stage({ name: 'sanctuaire', bounds: [-14, 14, -103, 11], sky: 0x0c0a08, fog: [0x1a140e, 26, 95], hemi: [0xffe8c8, 0x5a4c3a, 1.3], sun: [0xffd8a8, 0.55, [10, 40, 20]], music: 'egouts', pitch: 0.8 });
  const S = st.spots = {};
  const mur = W('mur_blanc', 0xe6c896, 3.2, 0x8a7458, 1.3), murS = W('mur_blanc', 0xa08a6a, 3.2, 0x6a5a44, 1.05), sol = W('paves', 0x8e8c92, 3.4, 0x6a5e4c);
  const or = new THREE.MeshBasicMaterial({ color: 0xffb040 });
  G(st, sol, 60, 130, 0, 0, -45);
  const wall = (ax, az, bx, bz) => { B(st, mur, bx - ax, H, bz - az, (ax + bx) / 2, H / 2, (az + bz) / 2); B(st, murS, bx - ax + 0.16, 0.35, bz - az + 0.16, (ax + bx) / 2, H + 0.17, (az + bz) / 2); B(st, murS, bx - ax + 0.1, 0.4, bz - az + 0.1, (ax + bx) / 2, 0.2, (az + bz) / 2); };
  room(st, -5, 0, 5, 10, { n: [[-2, 2]] }, wall);                                   // entrée
  room(st, -9, -18, 9, 0, { s: [[-2, 2]], n: [[-2, 2]] }, wall);                    // salle des blocs
  room(st, -9, -36, 9, -18, { s: [[-2, 2]], n: [[-2, 2]] }, wall);                  // salle des dalles
  room(st, -9, -60, 9, -36, { s: [[-2, 2]], n: [[-2, 2]] }, wall);                  // salle des braseros et gouffre
  room(st, -6, -72, 6, -60, { s: [[-2, 2]], n: [[-2.6, 2.6]] }, wall);              // antichambre
  room(st, -13, -102, 13, -72, { s: [[-2.6, 2.6]] }, wall);                         // salle du Gardien
  // torches
  const lamp = (x, z, ry, light) => { P(st, 'Torch_Metal', x, 1.7, z, ry); const f = makeFire(0.42, false); st.add(f, x + Math.sin(ry) * 0.28, z + Math.cos(ry) * 0.28, 0, 2.15); if (light) { const l = new THREE.PointLight(0xffa860, 1.6, 19, 1.3); l.position.set(x + Math.sin(ry) * 1.2, 2.8, z + Math.cos(ry) * 1.2); st.group.add(l); } };
  lamp(-4.9, 5, PI / 2, true); lamp(4.9, 5, -PI / 2);
  lamp(-8.9, -9, PI / 2, true); lamp(8.9, -9, -PI / 2, true); lamp(-8.9, -27, PI / 2, true); lamp(8.9, -27, -PI / 2, true);
  lamp(-8.9, -41, PI / 2); lamp(8.9, -56, -PI / 2, true); lamp(-5.9, -66, PI / 2, true); lamp(5.9, -66, -PI / 2);
  lamp(-12.9, -80, PI / 2, true); lamp(12.9, -80, -PI / 2, true); lamp(-12.9, -94, PI / 2, true); lamp(12.9, -94, -PI / 2, true);
  // gravures : bandeau d'or le long des murs des grandes salles
  for (const z of [-17.6, -35.6]) B(st, or, 3.2, 0.08, 0.05, 0, 4.3, z + 0.34);
  // Entrée : la porte du dehors, une statue, des jarres
  S.sortie = { x: 0, z: 9.2 }; B(st, mat(0x1a1612), 4, 4.6, 0.2, 0, 2.3, 9.9); B(st, new THREE.MeshBasicMaterial({ color: 0xcfe4ff }), 3, 4, 0.1, 0, 2.0, 9.82);
  const aube = makeStatue(); aube.scale.setScalar(0.62); st.add(aube, -3.6, 2.4, PI / 4); st.circle(-3.6, 2.4, 0.6); S.statue = { x: -3.6, z: 2.4 };
  for (const [x, z] of [[3.9, 8.6], [4.1, 7.2], [-4, 8.6]]) { const o = P(st, 'Vase_4', x, 0, z, R() * 6, 1.3); if (o) st.circle(x, z, 0.45); }
  S.fresque = { x: 4.4, z: 3 }; B(st, or, 0.05, 1.6, 2.6, 4.96, 2.2, 3);
  // ----- Salle des blocs : deux blocs à pousser sur deux dalles gravées, un pilier qui gêne -----
  S.cibles = [{ x: -4, z: -14 }, { x: 6, z: -6 }];
  for (const c of S.cibles) { G(st, mat(0x3a3228), 1.9, 1.9, c.x, 0.03, c.z); G(st, or, 1.2, 0.12, c.x, 0.04, c.z); G(st, or, 0.12, 1.2, c.x, 0.04, c.z); }
  S.piliers = [{ x: -4, z: -10 }, { x: 2, z: -8 }];
  for (const p of S.piliers) { B(st, murS, 1.7, H, 1.7, p.x, H / 2, p.z); st.wall(p.x - 0.85, p.z - 0.85, p.x + 0.85, p.z + 0.85); }
  S.blocsDepart = [{ x: -4, z: -6 }, { x: 4, z: -12 }];
  S.rune = { x: 7.6, z: -1.6 }; B(st, or, 0.6, 0.6, 0.05, 7.6, 1.5, -0.33);
  S.porte1 = porteDePierre(st, 0, -18, or);
  // ----- Salle des dalles : trois dalles de pression, et le levier derrière la porte -----
  S.dalles = [{ x: -6, z: -29, nom: 'ouest' }, { x: 0, z: -24, nom: 'centre' }, { x: 6, z: -29, nom: 'est' }];
  S.dalleObjs = S.dalles.map((d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 1.8), new THREE.MeshLambertMaterial({ color: 0x8a6a3a, emissive: 0x000000 })); m.position.set(d.x, 0.07, d.z); st.group.add(m); G(st, mat(0x2a241c), 2.1, 2.1, d.x, 0.02, d.z); return m; });
  S.plaque2 = { x: -3.2, z: -19.2 }; B(st, or, 1.4, 0.8, 0.05, -4.4, 1.7, -18.33);
  S.porte2 = porteDePierre(st, 0, -36, or);
  S.levier = { x: 3.4, z: -38.2 };
  const lev = new THREE.Group(); lev.add(box(0.5, 0.3, 0.5, 0x4a4038, 0, 0.15, 0)); const manche = new THREE.Group(); manche.add(cyl(0.05, 0.05, 1.1, 0x8a6a40, 0, 0.55, 0, 8)); manche.add(sph(0.12, 0xffb040, 0, 1.1, 0)); manche.position.y = 0.25; manche.rotation.z = 0.6; lev.add(manche); lev.userData.manche = manche;
  st.add(lev, S.levier.x, S.levier.z); st.circle(S.levier.x, S.levier.z, 0.4); S.levierObj = lev;
  S.coffreDalles = { x: -7.8, z: -20 };
  // ----- Salle des braseros : quatre braseros, un gouffre, un pont de lumière -----
  S.braseros = [{ x: -6.5, z: -39.5, nom: 'lune', label: 'la Lune' }, { x: 6.5, z: -39.5, nom: 'soleil', label: 'le Soleil' }, { x: -6.5, z: -44, nom: 'etoile', label: "l'Étoile" }, { x: 6.5, z: -44, nom: 'montagne', label: 'la Montagne' }];
  S.braseroObjs = S.braseros.map((b, i) => {
    const g = new THREE.Group(); g.add(cyl(0.3, 0.42, 0.9, 0x4a4038, 0, 0.45, 0, 10)); g.add(cyl(0.62, 0.34, 0.4, 0x5a4a3c, 0, 1.05, 0, 12));
    // le signe gravé sur le socle : croissant, soleil, étoile, montagne
    const signe = new THREE.Group(); signe.position.set(0, 0.5, 0.44);
    if (b.nom === 'lune') { const t = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 6, 14, PI), or); t.rotation.z = PI / 2; signe.add(t); }
    else if (b.nom === 'soleil') { signe.add(new THREE.Mesh(new THREE.CircleGeometry(0.12, 14), or)); for (let k = 0; k < 8; k++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.1), or); r.position.set(Math.cos(k * PI / 4) * 0.2, Math.sin(k * PI / 4) * 0.2, 0); r.rotation.z = k * PI / 4 + PI / 2; signe.add(r); } }
    else if (b.nom === 'etoile') { for (let k = 0; k < 4; k++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.36), or); r.rotation.z = k * PI / 4; signe.add(r); } }
    else { const t = new THREE.Mesh(new THREE.CircleGeometry(0.2, 3), or); t.rotation.z = PI / 2; signe.add(t); }
    g.add(signe); st.add(g, b.x, b.z, b.x < 0 ? PI / 2 : -PI / 2); st.circle(b.x, b.z, 0.65); return g;
  });
  S.plaque3 = { x: 0, z: -38.4 }; const stele = new THREE.Group(); stele.add(box(1.5, 1.2, 0.3, 0x8a7a62, 0, 0.6, 0)); stele.add(box(1.1, 0.08, 0.02, 0xffb040, 0, 0.85, 0.16)); stele.add(box(1.1, 0.08, 0.02, 0xffb040, 0, 0.6, 0.16)); stele.add(box(0.8, 0.08, 0.02, 0xffb040, 0, 0.35, 0.16)); st.prop(stele, 3.2, -40.4, PI, 0.8); S.plaque3 = { x: 3.2, z: -40.4 };
  // gouffre : le sol s'ouvre sur toute la largeur
  S.gouffre = { z1: -52, z2: -47 };
  const vide = new THREE.Mesh(PLAN, new THREE.MeshBasicMaterial({ color: 0x000000 })); vide.rotation.x = -PI / 2; vide.scale.set(18, 5, 1); vide.position.set(0, 0.05, -49.5); st.staticGroup.add(vide);
  for (const z of [-46.9, -52.1]) B(st, murS, 18, 0.3, 0.3, 0, 0.15, z);
  S.gouffreMurs = [st.wall(-9, -52, -1.6, -47), st.wall(1.6, -52, 9, -47), st.wall(-1.6, -52, 1.6, -47)];
  const pont = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 5.4), new THREE.MeshBasicMaterial({ color: 0xffd880, transparent: true, opacity: 0.75 })); pont.position.set(0, 0.1, -49.5); pont.visible = false;
  pont.userData.anim = (dt, m, t) => { pont.material.opacity = 0.62 + Math.sin(t * 3) * 0.14; }; st.add(pont); S.pont = pont;
  S.coffreBraseros = { x: -7.6, z: -57.6 };
  // ----- Antichambre : caisses des éclaireurs impériaux -----
  for (const [x, z] of [[-4.8, -62], [-4.6, -63.6], [4.8, -70]]) st.prop(R() < 0.5 ? makeCrate() : makeBarrel(), x, z, R() * 6, 0.55);
  S.eclaireurs = [{ x: -1.6, z: -68.5 }, { x: 0, z: -69.5 }, { x: 1.6, z: -68.5 }];
  // ----- Salle du Gardien : colonnes, estrade, autel de l'Éclat -----
  for (const z of [-78, -86, -94]) for (const c of [-1, 1]) { C(st, mur, 1.0, H + 3, c * 9, (H + 3) / 2, z); C(st, murS, 1.25, 0.5, c * 9, 0.25, z); st.circle(c * 9, z, 1.15); }
  G(st, mat(0x3a3026), 9, 9, 0, 0.03, -85); for (let i = 0; i < 7; i++) { const a = i * 2 * PI / 7; const m = new THREE.Mesh(new THREE.CircleGeometry(0.34, 14), new THREE.MeshBasicMaterial({ color: SYMBOLES[i] })); m.rotation.x = -PI / 2; m.position.set(Math.sin(a) * 3.7, 0.05, -85 + Math.cos(a) * 3.7); st.staticGroup.add(m); }
  B(st, murS, 8, 0.5, 4.5, 0, 0.25, -98.5); B(st, murS, 5.5, 0.5, 3, 0, 0.75, -99.2); st.wall(-4, -100.8, 4, -96.3);
  B(st, mur, 1.3, 1.1, 1.3, 0, 1.55, -98.6);
  const eclat = new THREE.Group(), ambre = new THREE.MeshBasicMaterial({ color: 0xe8a840 });
  const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), ambre); cr.scale.set(0.7, 1.5, 0.7); eclat.add(cr);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0.18, depthWrite: false })); eclat.add(halo);
  const lum = new THREE.PointLight(0xffb850, 2.4, 22, 1.2); eclat.add(lum);
  eclat.userData.anim = (dt, m, t) => { cr.rotation.y = t * 0.8; eclat.position.y = 2.9 + Math.sin(t * 1.6) * 0.12; halo.scale.setScalar(0.9 + Math.sin(t * 2.3) * 0.12); };
  st.add(eclat, 0, -98.6, 0, 2.9); S.eclatObj = eclat; S.eclat = { x: 0, z: -95.6 };
  S.golem = { x: 0, z: -85 }; S.seuil = -76.5;
  S.mobs = [
    { id: 'san1', x: 5, z: -4, enemies: ['araignee', 'esprit'], roam: 1.5 }, { id: 'san2', x: 5, z: -32, enemies: ['esprit', 'esprit'], roam: 2 },
    { id: 'san3', x: -4, z: -56, enemies: ['araignee', 'esprit', 'araignee'], roam: 2 },
  ];
  st.bake();
  return st;
}

// Porte de pierre à deux battants qui s'enfonce dans le sol. Rend { obj, mur, ouvrir(immédiat) }
function porteDePierre(st, x, z, or) {
  const g = new THREE.Group();
  g.add(box(4.4, 5, 0.5, 0x6e6252, 0, 2.5, 0)); g.add(box(0.1, 5, 0.54, 0x2a241e, 0, 2.5, 0));
  const s = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 20), or); s.position.set(0, 2.9, 0.27); g.add(s); const s2 = s.clone(); s2.position.z = -0.27; s2.rotation.y = PI; g.add(s2);
  st.add(g, x, z); const mur = st.wall(x - 2.2, z - 0.4, x + 2.2, z + 0.4); mur.tall = true;
  return { obj: g, mur, ouverte: false };
}
