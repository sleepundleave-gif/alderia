// ============================================================
//  CRÉATURES DU CHAPITRE 3 (égouts de Solméria)
//  Rat géant, Gelée verte, Chauve-souris, Roi des Égouts.
//  Les packs importés ne contiennent aucun animal : ces créatures sont donc
//  modelées par le code, avec des matières lisses assorties aux modèles importés.
//  Chaque créature expose userData.anim(dt, enMouvement, temps) et userData.height.
// ============================================================
import * as THREE from '../lib/three.module.min.js';

const PI = Math.PI;
const MAT = new Map();
function mat(color, o = {}) {
  const k = color + '|' + JSON.stringify(o); let m = MAT.get(k);
  if (!m) { m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.7 }, o)); MAT.set(k, m); }
  return m;
}
const G_SPH = new THREE.SphereGeometry(1, 20, 14), G_DISC = new THREE.CircleGeometry(0.5, 18), G_CONE = new THREE.ConeGeometry(1, 1, 10), G_CYL = new THREE.CylinderGeometry(1, 1, 1, 10);
const SHADOW = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
const ball = (m, sx, sy, sz, x, y, z) => { const o = new THREE.Mesh(G_SPH, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); return o; };
const cone = (m, r, h, x, y, z) => { const o = new THREE.Mesh(G_CONE, m); o.scale.set(r, h, r); o.position.set(x, y, z); return o; };
const cyl = (m, r, h, x, y, z) => { const o = new THREE.Mesh(G_CYL, m); o.scale.set(r, h, r); o.position.set(x, y, z); return o; };
function blob(r) { const m = new THREE.Mesh(G_DISC, SHADOW); m.rotation.x = -PI / 2; m.scale.set(r * 2, r * 2, 1); m.position.y = 0.03; m.userData.shadow = true; return m; }
function eyes(g, m, pm, r, x, y, z) {
  for (const s of [-1, 1]) { g.add(ball(m, r, r * 1.1, r * 0.6, x * s, y, z)); g.add(ball(pm, r * 0.45, r * 0.55, r * 0.3, x * s, y, z + r * 0.5)); }
}

// ---------- Rat géant ----------
export function makeRat(s = 1) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const fur = mat(0x6a5a50), belly = mat(0x9a8a7a), pink = mat(0xd89a9a, { roughness: 0.5 }), dark = mat(0x1a1210);
  body.add(ball(fur, 0.3, 0.27, 0.5, 0, 0.36, -0.05));                                  // corps
  body.add(ball(belly, 0.24, 0.18, 0.4, 0, 0.27, -0.02));
  const head = new THREE.Group(); head.position.set(0, 0.42, 0.42); body.add(head);
  head.add(ball(fur, 0.19, 0.17, 0.24, 0, 0, 0.05));
  const snout = cone(fur, 0.11, 0.26, 0, -0.03, 0.3); snout.rotation.x = PI / 2; head.add(snout);
  head.add(ball(pink, 0.04, 0.035, 0.035, 0, -0.03, 0.44));                              // truffe
  for (const sd of [-1, 1]) {
    const ear = ball(pink, 0.085, 0.1, 0.025, 0.14 * sd, 0.15, -0.03); ear.rotation.y = 0.5 * sd; head.add(ear);
    head.add(ball(mat(0xff3a2a, { emissive: 0xc01a10, emissiveIntensity: 1.2, roughness: 0.3 }), 0.032, 0.032, 0.025, 0.09 * sd, 0.05, 0.2));   // yeux rouges
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.07, 0.015), mat(0xf4ecd0)); tooth.position.set(0.018 * sd, -0.1, 0.36); head.add(tooth);
    for (let i = 0; i < 3; i++) { const w = cyl(dark, 0.004, 0.2, 0.12 * sd, -0.04 + i * 0.02, 0.36); w.rotation.set(0.2 * (i - 1), 0, (PI / 2 + 0.25 * (i - 1)) * sd); head.add(w); }   // moustaches
  }
  const legs = [];
  for (const [x, z] of [[-0.17, 0.2], [0.17, 0.2], [-0.19, -0.3], [0.19, -0.3]]) { const l = new THREE.Group(); l.position.set(x, 0.24, z); l.add(ball(fur, 0.07, 0.14, 0.08, 0, -0.1, 0)); l.add(ball(pink, 0.06, 0.03, 0.1, 0, -0.22, 0.04)); body.add(l); legs.push(l); }
  // queue : une suite de segments qui ondulent
  const tail = []; let parent = body, at = new THREE.Vector3(0, 0.36, -0.5);
  for (let i = 0; i < 7; i++) { const seg = new THREE.Group(); seg.position.copy(at); const r = 0.035 - i * 0.0038; const c = cyl(pink, r, 0.16, 0, 0, -0.08); c.rotation.x = PI / 2; seg.add(c); parent.add(seg); tail.push(seg); parent = seg; at = new THREE.Vector3(0, 0, -0.15); }
  body.scale.setScalar(s); g.add(blob(0.55 * s));
  const u = g.userData; u.height = 0.95 * s; u.creature = true; u.ph = Math.random() * 6;
  u.anim = (dt, moving, t) => {
    const k = (t || 0) * (moving ? 13 : 2.2) + u.ph;
    body.position.y = moving ? Math.abs(Math.sin(k)) * 0.05 : Math.sin(k) * 0.012;
    head.rotation.x = moving ? Math.sin(k * 2) * 0.06 : Math.sin(k * 0.7) * 0.12; head.rotation.y = moving ? 0 : Math.sin(k * 0.4) * 0.3;
    legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(k + (i === 0 || i === 3 ? 0 : PI)) * 0.8 : 0; });
    tail.forEach((sg, i) => { sg.rotation.y = Math.sin(k * (moving ? 0.5 : 1) - i * 0.6) * 0.22; sg.rotation.x = i === 0 ? -0.25 : 0.1; });
  };
  u.anim(0, false, 0);
  return g;
}

// ---------- Gelée ----------
// color : teinte ; s : taille ; o.king : le Roi des Égouts (couronne de ferraille, débris avalés, gueule)
export function makeJelly(color = 0x5ac84a, s = 1, o = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const gel = new THREE.MeshPhysicalMaterial({ color, roughness: 0.12, metalness: 0, transparent: true, opacity: o.king ? 0.86 : 0.8, clearcoat: 1, clearcoatRoughness: 0.15, emissive: color, emissiveIntensity: 0.12 });
  const core = mat(new THREE.Color(color).multiplyScalar(0.45).getHex(), { roughness: 0.4 });
  // corps : une cloche (profil tourné autour de l'axe vertical)
  const pts = [[0.001, 0], [0.52, 0], [0.6, 0.06], [0.6, 0.22], [0.52, 0.5], [0.36, 0.72], [0.16, 0.84], [0.001, 0.87]].map(([x, y]) => new THREE.Vector2(x, y));
  const dome = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), gel); dome.renderOrder = 2; body.add(dome);
  body.add(ball(core, 0.26, 0.2, 0.26, 0, 0.3, 0));                                       // noyau sombre vu par transparence
  const white = mat(0xffffff, { roughness: 0.2 }), pupil = mat(0x101010, { roughness: 0.3 });
  if (o.king) {
    const yel = mat(0xffe040, { emissive: 0xc8a010, emissiveIntensity: 0.9, roughness: 0.3 });
    eyes(body, yel, pupil, 0.085, 0.2, 0.52, 0.43);
    // gueule : un croissant sombre et des dents de travers
    const mouth = ball(mat(0x1a1410, { roughness: 0.9 }), 0.26, 0.07, 0.08, 0, 0.26, 0.55); body.add(mouth);
    for (let i = 0; i < 7; i++) { const t = cone(mat(0xe8e0c0), 0.022, 0.07, -0.18 + i * 0.06, 0.3 - Math.abs(i - 3) * 0.006, 0.6); t.rotation.x = PI + (i % 2 ? 0.2 : -0.1); body.add(t); }
    // débris avalés : os, tonneau, pièce
    const bone = mat(0xe8e0c8), rust = mat(0x7a4a2a, { roughness: 0.6, metalness: 0.5 }), wood = mat(0x6a4a2a);
    const b1 = cyl(bone, 0.02, 0.26, -0.22, 0.3, -0.1); b1.rotation.set(0.6, 0, 0.9); body.add(b1); body.add(ball(bone, 0.035, 0.035, 0.035, -0.32, 0.37, -0.15));
    const b2 = cyl(wood, 0.09, 0.16, 0.22, 0.22, -0.18); b2.rotation.set(0.4, 0.2, 0.7); body.add(b2);
    body.add(ball(bone, 0.07, 0.075, 0.075, 0.05, 0.2, -0.3));                             // un crâne
    // couronne de ferraille : fourchettes, clous et un vieux cercle de tonneau
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 20), rust); ring.rotation.x = PI / 2; ring.position.y = 0.84; body.add(ring);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * PI * 2, sp = cone(i % 2 ? rust : mat(0x9a9aa0, { metalness: 0.7, roughness: 0.4 }), 0.022, 0.14 + (i % 3) * 0.04, Math.sin(a) * 0.2, 0.93, Math.cos(a) * 0.2); sp.rotation.set(Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25); body.add(sp); }
    // deux bras de gelée
    for (const sd of [-1, 1]) { const arm = ball(gel, 0.14, 0.2, 0.14, 0.58 * sd, 0.3, 0.12); arm.renderOrder = 2; arm.userData.arm = sd; body.add(arm); }
  } else {
    eyes(body, white, pupil, 0.075, 0.17, 0.5, 0.4);
    for (const [x, y, z, r] of [[0.2, 0.3, -0.2, 0.05], [-0.25, 0.2, 0.1, 0.04], [0.05, 0.62, -0.1, 0.035], [-0.1, 0.15, -0.3, 0.045]]) body.add(ball(mat(0xffffff, { transparent: true, opacity: 0.5, roughness: 0.1 }), r, r, r, x, y, z));   // bulles
  }
  const arms = body.children.filter((c) => c.userData.arm);
  g.add(blob(0.62 * s));
  const u = g.userData; u.height = 1.0 * s; u.creature = true; u.ph = Math.random() * 6;
  u.anim = (dt, moving, t) => {
    const k = (t || 0) * (moving ? 7 : 2.4) + u.ph, w = Math.sin(k) * (moving ? 0.2 : 0.06);
    body.scale.set(s * (1 - w * 0.5), s * (1 + w), s * (1 - w * 0.5));               // la gelée s'écrase puis s'étire
    body.position.y = moving ? Math.max(0, Math.sin(k)) * 0.25 * s : 0;
    for (const a of arms) { a.position.y = 0.3 + Math.sin(k * 0.8 + a.userData.arm) * 0.08; a.scale.y = 0.2 + Math.sin(k * 0.8 + a.userData.arm) * 0.04; }
  };
  u.anim(0, false, 0);
  return g;
}
export const makeSewerKing = () => { const g = makeJelly(0x7a9a3a, 3.1, { king: true }); g.userData.height = 3.0; return g; };

// ---------- Chauve-souris ----------
export function makeBat(s = 1) {
  const g = new THREE.Group(), body = new THREE.Group(); body.position.y = 1.25; g.add(body);
  const fur = mat(0x3a2a44), skin = mat(0x5a3a5a, { roughness: 0.6, side: THREE.DoubleSide }), yel = mat(0xffe040, { emissive: 0xd0a010, emissiveIntensity: 1.1 });
  body.add(ball(fur, 0.17, 0.2, 0.16, 0, 0, 0));
  body.add(ball(fur, 0.13, 0.12, 0.13, 0, 0.2, 0.05));
  for (const sd of [-1, 1]) {
    const ear = cone(skin, 0.05, 0.16, 0.08 * sd, 0.34, 0.03); ear.rotation.z = -0.25 * sd; body.add(ear);
    body.add(ball(yel, 0.028, 0.028, 0.02, 0.055 * sd, 0.22, 0.165));
    const fang = cone(mat(0xffffff), 0.012, 0.045, 0.03 * sd, 0.13, 0.16); fang.rotation.x = PI; body.add(fang);
    const foot = cyl(fur, 0.012, 0.1, 0.06 * sd, -0.22, 0); body.add(foot);
  }
  // ailes : une membrane en trois pans
  const wings = [];
  for (const sd of [-1, 1]) {
    const sh = new THREE.Shape(); sh.moveTo(0, 0.1); sh.lineTo(0.75, 0.3); sh.lineTo(0.62, 0.02); sh.lineTo(0.46, -0.06); sh.lineTo(0.38, -0.2); sh.lineTo(0.2, -0.1); sh.lineTo(0.12, -0.22); sh.lineTo(0, -0.12); sh.lineTo(0, 0.1);
    const w = new THREE.Mesh(new THREE.ShapeGeometry(sh), skin), piv = new THREE.Group(); piv.position.set(0.12 * sd, 0.05, 0); if (sd < 0) w.scale.x = -1; piv.add(w);
    const arm = cyl(fur, 0.012, 0.78, 0.37 * sd, 0.2, 0.005); arm.rotation.z = (-PI / 2 + 0.26) * sd; piv.add(arm);
    body.add(piv); wings.push([piv, sd]);
  }
  body.scale.setScalar(s); g.add(blob(0.32 * s));
  const u = g.userData; u.height = 1.75 * s; u.creature = true; u.ph = Math.random() * 6;
  u.anim = (dt, moving, t) => {
    const k = (t || 0) + u.ph, f = Math.sin(k * 16);
    body.position.y = (1.25 + Math.sin(k * 3) * 0.12) * s; body.rotation.z = Math.sin(k * 1.7) * 0.1; body.rotation.x = moving ? 0.35 : 0.1;
    for (const [piv, sd] of wings) piv.rotation.z = f * 0.7 * sd;
  };
  u.anim(0, false, 0);
  return g;
}

// ---------- Golem Gardien (chapitre 4) ----------
// Aucun golem dans les packs gratuits : celui-ci est bâti de blocs de roche taillés, avec des runes d'ambre qui battent.
export function makeGolem(s = 1) {
  const g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
  const roche = new THREE.MeshStandardMaterial({ color: 0x8a7e6c, roughness: 0.95, flatShading: true }), sombre = new THREE.MeshStandardMaterial({ color: 0x5e5448, roughness: 0.95, flatShading: true });
  const rune = new THREE.MeshBasicMaterial({ color: 0xffb040 }), mousse = new THREE.MeshStandardMaterial({ color: 0x5a7a3a, roughness: 1, flatShading: true });
  const GEO = new THREE.DodecahedronGeometry(0.5, 0), CUBE = new THREE.BoxGeometry(1, 1, 1);
  const bloc = (parent, m, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0, geo = GEO) => { const o = new THREE.Mesh(geo, m); o.scale.set(w, h, d); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); parent.add(o); return o; };
  // jambes
  for (const c of [-1, 1]) { bloc(corps, sombre, 0.95, 1.3, 1.0, 0.62 * c, 0.65, 0, 0, 0.3 * c); bloc(corps, roche, 1.15, 0.5, 1.4, 0.64 * c, 0.25, 0.12, 0, 0, 0, CUBE); }
  // bassin, torse, épaules
  bloc(corps, sombre, 1.7, 0.8, 1.2, 0, 1.45, 0, 0, 0.4);
  const torse = new THREE.Group(); torse.position.y = 1.7; corps.add(torse);
  bloc(torse, roche, 2.6, 1.9, 1.7, 0, 0.95, 0, 0.1, 0.5, 0.05);
  bloc(torse, roche, 1.3, 1.0, 1.2, -1.35, 1.5, 0, 0.3, 0.2, 0.3); bloc(torse, roche, 1.3, 1.0, 1.2, 1.35, 1.5, 0, 0.2, 0.7, -0.3);
  bloc(torse, mousse, 1.1, 0.3, 0.9, -1.3, 2.0, -0.05, 0, 0.4); bloc(torse, mousse, 0.8, 0.25, 0.7, 0.9, 1.95, -0.3, 0, 1.0);
  // cœur de rune, tête, yeux
  const coeur = bloc(torse, rune, 0.5, 0.5, 0.2, 0, 0.95, 0.82, 0, 0, Math.PI / 4, CUBE);
  for (const [x, y, r] of [[-0.55, 1.25, 0.5], [0.55, 1.25, -0.5], [-0.45, 0.5, -0.4], [0.45, 0.5, 0.4]]) bloc(torse, rune, 0.5, 0.07, 0.1, x, y, 0.8, 0, 0, r, CUBE);
  const tete = new THREE.Group(); tete.position.set(0, 2.1, 0.15); torse.add(tete);
  bloc(tete, sombre, 1.0, 0.85, 0.95, 0, 0.3, 0, 0.2, 0.3); bloc(tete, roche, 1.05, 0.3, 0.9, 0, 0.62, 0.02, 0, 0, 0, CUBE);
  const yeux = [bloc(tete, rune, 0.2, 0.09, 0.1, -0.22, 0.34, 0.46, 0, 0, 0.15, CUBE), bloc(tete, rune, 0.2, 0.09, 0.1, 0.22, 0.34, 0.46, 0, 0, -0.15, CUBE)];
  // bras : épaule, avant-bras, poing
  const bras = (c) => {
    const b = new THREE.Group(); b.position.set(1.75 * c, 1.45, 0); torse.add(b);
    bloc(b, sombre, 0.8, 1.3, 0.85, 0.1 * c, -0.6, 0, 0, 0.4 * c); bloc(b, roche, 0.95, 1.2, 1.0, 0.18 * c, -1.6, 0.1, 0.2, 0.2); bloc(b, roche, 1.25, 1.05, 1.25, 0.2 * c, -2.45, 0.2, 0, 0, 0, CUBE);
    return b;
  };
  const armL = bras(-1), armR = bras(1);
  const ombre = new THREE.Mesh(new THREE.CircleGeometry(2.3, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })); ombre.rotation.x = -Math.PI / 2; ombre.position.y = 0.03; g.add(ombre);
  g.scale.setScalar(s);
  const u = g.userData; u.height = 4.6 * s; u.creature = true; u.P = { armR, armL, head: tete };
  u.anim = (dt, moving, t) => {
    if (u.pose) return;
    const k = Math.sin(t * 1.3); torse.rotation.x = 0.04 + k * 0.025; torse.position.y = 1.7 + k * 0.04;
    armL.rotation.z = -0.08 + k * 0.03; if (Math.abs(armR.rotation.x) < 0.02) armR.rotation.z = 0.08 - k * 0.03;
    tete.rotation.y = Math.sin(t * 0.5) * 0.18;
    const p = 0.75 + Math.sin(t * 3.2) * 0.25; rune.color.setRGB(1 * p, 0.62 * p, 0.2 * p); coeur.scale.set(0.5 + p * 0.08, 0.5 + p * 0.08, 0.2);
    if (moving) { corps.rotation.z = Math.sin(t * 5) * 0.05; corps.position.y = Math.abs(Math.sin(t * 5)) * 0.08; } else { corps.rotation.z *= 0.9; corps.position.y *= 0.9; }
  };
  return g;
}

// ============================================================
//  CHAPITRES 5 À 10 : machines et bêtes bâties à la main
// ============================================================
const ombreSol = (r) => { const o = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })); o.rotation.x = -Math.PI / 2; o.position.y = 0.03; return o; };
const piece3 = (parent, geo, m, sx, sy, sz, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); parent.add(o); return o; };
const J_CUBE = new THREE.BoxGeometry(1, 1, 1), J_CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 16), J_CONE = new THREE.ConeGeometry(0.5, 1, 14), J_BOULE = new THREE.SphereGeometry(0.5, 14, 10);

// La Taraude : une foreuse impériale sur chenilles. « petit » : l'automate foreur, même machine en réduction.
export function makeTaraude(s = 1, petit = false) {
  const g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
  const fer = new THREE.MeshStandardMaterial({ color: petit ? 0x7a7068 : 0x5a5450, roughness: 0.55, metalness: 0.6 }), rouille = new THREE.MeshStandardMaterial({ color: 0x8a4a2a, roughness: 0.8, metalness: 0.3 });
  const noir = new THREE.MeshStandardMaterial({ color: 0x1e1c1c, roughness: 0.9 }), acier = new THREE.MeshStandardMaterial({ color: 0xc8c8c8, roughness: 0.3, metalness: 0.8 });
  const braise = new THREE.MeshBasicMaterial({ color: 0xff7a20 }), rouge = new THREE.MeshStandardMaterial({ color: 0x8a1e1a, roughness: 0.7 });
  for (const c of [-1, 1]) {                                                    // chenilles
    piece3(corps, J_CUBE, noir, 0.9, 1.0, 4.6, 1.75 * c, 0.5, -0.2);
    for (let i = 0; i < 4; i++) piece3(corps, J_CYL, fer, 0.9, 0.3, 0.9, 2.25 * c, 0.5, -1.9 + i * 1.15, 0, 0, Math.PI / 2);
  }
  piece3(corps, J_CUBE, fer, 3.0, 2.2, 4.0, 0, 2.0, -0.4);                       // caisse
  piece3(corps, J_CUBE, rouille, 3.2, 0.3, 4.2, 0, 3.2, -0.4); piece3(corps, J_CUBE, rouge, 3.05, 0.5, 0.2, 0, 2.6, 1.62);
  const chaud = piece3(corps, J_CYL, rouille, 1.9, 2.4, 1.9, 0, 3.6, -1.3);     // chaudière
  const foyer = piece3(corps, J_CUBE, braise, 0.9, 0.6, 0.1, 0, 1.7, -2.42);
  for (const c of [-1, 1]) { piece3(corps, J_CYL, noir, 0.45, 2.2, 0.45, 0.9 * c, 5.2, -1.6); const o = piece3(corps, J_CUBE, braise, 0.5, 0.22, 0.08, 0.7 * c, 2.75, 1.63); o.userData.oeil = true; }
  const tete = new THREE.Group(); tete.position.set(0, 2.0, 1.6); corps.add(tete);     // la vrille
  piece3(tete, J_CYL, fer, 2.4, 0.8, 2.4, 0, 0, 0.4, Math.PI / 2);
  const vrille = new THREE.Group(); vrille.position.z = 0.8; tete.add(vrille);
  piece3(vrille, J_CONE, acier, 2.2, 3.4, 2.2, 0, 0, 1.7, Math.PI / 2);
  for (let i = 0; i < 7; i++) { const k = i / 7, r = 1.0 * (1 - k) + 0.1; piece3(vrille, J_CUBE, rouille, r * 2.1, 0.14, 0.3, 0, 0, 0.25 + k * 3.0, 0, 0, i * 0.9); }
  g.add(ombreSol(3.2));
  g.scale.setScalar(s);
  const u = g.userData; u.height = 6.2 * s; u.creature = true; u.P = { head: tete };
  u.anim = (dt, moving, t) => {
    if (u.pose) return;
    vrille.rotation.z = t * (petit ? 9 : 6);
    corps.position.y = Math.sin(t * 22) * 0.012; corps.rotation.z = Math.sin(t * 2.2) * 0.008;
    const p = 0.7 + Math.sin(t * 5) * 0.3; braise.color.setRGB(1 * p, 0.5 * p, 0.14 * p); chaud.scale.x = chaud.scale.z = 1.9 + Math.sin(t * 5) * 0.03;
    foyer.scale.y = 0.6;
  };
  return g;
}

// Tortue magmatique : carapace de roche fendue de braise
export function makeTortue() {
  const g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
  const roche = new THREE.MeshStandardMaterial({ color: 0x4a3a34, roughness: 0.95, flatShading: true }), peau = new THREE.MeshStandardMaterial({ color: 0x7a3a22, roughness: 0.9 });
  const braise = new THREE.MeshBasicMaterial({ color: 0xff7a20 });
  const dos = piece3(corps, new THREE.DodecahedronGeometry(0.5, 1), roche, 2.0, 1.2, 2.3, 0, 0.75, 0);
  piece3(corps, J_BOULE, braise, 1.86, 1.0, 2.16, 0, 0.72, 0);
  piece3(corps, J_BOULE, peau, 1.7, 0.5, 2.0, 0, 0.38, 0);
  for (const [x, z] of [[-0.8, 0.75], [0.8, 0.75], [-0.8, -0.75], [0.8, -0.75]]) piece3(corps, J_CYL, peau, 0.42, 0.5, 0.42, x, 0.25, z);
  const tete = new THREE.Group(); tete.position.set(0, 0.6, 1.15); corps.add(tete);
  piece3(tete, J_BOULE, peau, 0.6, 0.5, 0.75, 0, 0, 0.2);
  for (const c of [-1, 1]) piece3(tete, J_BOULE, braise, 0.1, 0.1, 0.1, 0.2 * c, 0.1, 0.48);
  for (let i = 0; i < 5; i++) piece3(corps, J_CONE, roche, 0.4, 0.6, 0.4, Math.sin(i * 2.4) * 0.5, 1.4, Math.cos(i * 2.4) * 0.6 - 0.1);
  g.add(ombreSol(1.4));
  const u = g.userData; u.height = 1.7; u.creature = true; u.P = { head: tete };
  u.anim = (dt, moving, t) => {
    if (u.pose) return;
    const p = 0.7 + Math.sin(t * 3) * 0.3; braise.color.setRGB(1 * p, 0.5 * p, 0.14 * p);
    tete.rotation.y = Math.sin(t * 0.8) * 0.3; tete.position.z = 1.15 + Math.sin(t * 1.2) * 0.05;
    corps.position.y = moving ? Math.abs(Math.sin(t * 5)) * 0.06 : Math.sin(t * 1.5) * 0.015; dos.rotation.y = 0;
  };
  return g;
}

// Le Bélier Infernal : une charpente roulante, un tronc ferré à tête de bouc, des pots de poix enflammée
export function makeBelier() {
  const g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
  const bois = new THREE.MeshStandardMaterial({ color: 0x4a3222, roughness: 0.9 }), fer = new THREE.MeshStandardMaterial({ color: 0x3a3838, roughness: 0.5, metalness: 0.7 });
  const cuir = new THREE.MeshStandardMaterial({ color: 0x6a2a20, roughness: 0.85 }), braise = new THREE.MeshBasicMaterial({ color: 0xff7a20 });
  for (const c of [-1, 1]) for (const z of [-2.2, 0, 2.2]) piece3(corps, J_CYL, bois, 1.5, 0.4, 1.5, 2.0 * c, 0.75, z, 0, 0, Math.PI / 2);
  piece3(corps, J_CUBE, bois, 3.6, 0.4, 6.4, 0, 1.1, 0);
  for (const c of [-1, 1]) for (const z of [-2.8, 0, 2.8]) piece3(corps, J_CUBE, bois, 0.3, 3.4, 0.3, 1.6 * c, 2.9, z);
  for (const c of [-1, 1]) piece3(corps, J_CUBE, cuir, 2.6, 0.16, 6.8, 1.1 * c, 4.9, 0, 0, 0, -0.6 * c);       // toit de peaux
  piece3(corps, J_CUBE, fer, 0.3, 0.3, 7.0, 0, 5.55, 0);
  const tronc = new THREE.Group(); tronc.position.set(0, 2.6, 0); corps.add(tronc);
  piece3(tronc, J_CYL, bois, 0.9, 7.6, 0.9, 0, 0, 0.4, Math.PI / 2);
  for (const z of [-2.4, 0, 2.4]) piece3(tronc, J_CYL, fer, 1.0, 0.3, 1.0, 0, 0, z + 0.4, Math.PI / 2);
  const tete = new THREE.Group(); tete.position.set(0, 0, 4.4); tronc.add(tete);
  piece3(tete, J_CUBE, fer, 1.3, 1.3, 1.4, 0, 0, 0); piece3(tete, J_CONE, fer, 1.0, 1.0, 1.0, 0, 0, 1.1, Math.PI / 2);
  for (const c of [-1, 1]) { piece3(tete, J_CONE, fer, 0.4, 1.3, 0.4, 0.75 * c, 0.55, -0.1, -0.5, 0, -0.9 * c); piece3(tete, J_CUBE, braise, 0.26, 0.16, 0.06, 0.34 * c, 0.2, 0.71); }
  for (const c of [-1, 1]) { piece3(corps, J_CYL, fer, 0.7, 0.6, 0.7, 1.3 * c, 1.6, -2.4); piece3(corps, J_BOULE, braise, 0.6, 0.5, 0.6, 1.3 * c, 1.95, -2.4); }
  g.add(ombreSol(3.6));
  const u = g.userData; u.height = 5.8; u.creature = true; u.P = { head: tete };
  u.anim = (dt, moving, t) => {
    if (u.pose) return;
    tronc.position.z = Math.sin(t * 1.6) * 0.5; tronc.rotation.x = Math.sin(t * 1.6 + 1) * 0.02;
    const p = 0.7 + Math.sin(t * 6) * 0.3; braise.color.setRGB(1 * p, 0.5 * p, 0.14 * p);
    corps.position.y = Math.sin(t * 9) * 0.01;
  };
  return g;
}
