// ============================================================
//  PERSONNAGES ET CRÉATURES
//
//  Les personnages sont fabriqués comme dans un moteur de jeu :
//    1. un MAILLAGE d'un seul tenant (formes tournées, sphères…),
//    2. des COULEURS par sommet (une palette par personnage),
//    3. un SQUELETTE (os : bassin, buste, tête, bras, jambes…),
//    4. des POIDS qui attachent chaque sommet à un ou deux os
//       (coudes, genoux et taille se plient sans cassure),
//    5. des ANIMATIONS (clips : Repos, Marche, Attaque, Sort…).
//  Rendu « dessin animé » : ombrage en aplats + contour à l'encre.
//  La page atelier.html montre ces étapes et exporte des fichiers .glb.
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { packReady, makeChar as makeImported, HEROES3D } from './pack.js';

import { makeRat, makeJelly, makeBat, makeSewerKing, makeGolem, makeTaraude, makeTortue, makeBelier } from './betes.js';
import { estMonstre, makeMonstre } from './monstres.js';
const PI = Math.PI;

// ---------- Matériaux : aplats de couleur + contour ----------
const GRAD = (() => {
  const t = new THREE.DataTexture(new Uint8Array([105, 185, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
const TOON = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: GRAD });
// Contour : la coque du maillage, gonflée le long des normales et vue de l'intérieur.
// L'attribut « ow » règle l'épaisseur sommet par sommet (0 = pas de contour, pour les détails du visage).
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x1c130d, side: THREE.BackSide });
OUTLINE.onBeforeCompile = (sh) => { sh.vertexShader = 'attribute float ow;\n' + sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * (ow * 0.0095);'); };
OUTLINE.customProgramCacheKey = () => 'outline-ow';
const GLOW = new Map();
function glowMat(color, opacity) { const k = color + '|' + (opacity || 1); let m = GLOW.get(k); if (!m) { m = new THREE.MeshBasicMaterial({ color }); if (opacity) { m.transparent = true; m.opacity = opacity; m.depthWrite = false; m.blending = THREE.AdditiveBlending; } GLOW.set(k, m); } return m; }

// ---------- Géométries partagées ----------
// Sphères à plusieurs niveaux de détail : les petites pièces n'ont pas besoin d'être aussi lisses que la tête
const G_BALL = new THREE.SphereGeometry(0.5, 12, 8), G_BALL_HI = new THREE.SphereGeometry(0.5, 22, 14), G_BALL_MID = new THREE.SphereGeometry(0.5, 8, 6), G_BALL_LO = new THREE.SphereGeometry(0.5, 6, 4);
const G_BOX = new THREE.BoxGeometry(1, 1, 1);
const G_SPIKE = new THREE.ConeGeometry(0.5, 1, 7);
const G_CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
const GEO = new Map();
function cached(key, make) { let g = GEO.get(key); if (!g) { g = make(); GEO.set(key, g); } return g; }
const capGeo = (r, len) => cached(`cap|${r.toFixed(3)}|${len.toFixed(3)}`, () => new THREE.CapsuleGeometry(r, len, 3, 8));
const domeGeo = (theta) => cached(`dome|${theta.toFixed(3)}`, () => new THREE.SphereGeometry(0.5, 18, 7, 0, PI * 2, 0, theta * PI));
const bandGeo = () => cached('band', () => new THREE.SphereGeometry(0.5, 16, 4, PI / 2 + 0.95, PI * 2 - 1.9, 0.3 * PI, 0.34 * PI));
function latheGeo(pts, phiStart = 0, phiLen = PI * 2) {
  return cached('lathe|' + pts.map(p => p[0].toFixed(3) + ',' + p[1].toFixed(3)).join(';') + '|' + phiStart.toFixed(2) + '|' + phiLen.toFixed(2),
    () => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(Math.max(0.0005, p[0]), p[1])), phiLen > 6 ? 16 : 8, phiStart, phiLen));
}

// ---------- Pièces : de simples repères (forme + couleur + position) fusionnés ensuite ----------
function piece(geo, color, x = 0, y = 0, z = 0) { const o = new THREE.Object3D(); o.userData.geo = geo; o.userData.color = color; o.position.set(x, y, z); return o; }
const ball = (sx, sy, sz, color, x, y, z) => { const d = Math.max(sx, sy, sz), o = piece(d >= 0.4 ? G_BALL_HI : d >= 0.2 ? G_BALL : d >= 0.085 ? G_BALL_MID : G_BALL_LO, color, x, y, z); o.scale.set(sx, sy, sz); return o; };
const eye = (sx, sy, sz, color, x, y, z) => { const o = piece(G_BALL, color, x, y, z); o.scale.set(sx, sy, sz); return o; };   // toujours lisse : vu de près dans les dialogues
const cap = (r, len, color, x, y, z) => piece(capGeo(r, len), color, x, y, z);
const bx = (w, h, d, color, x, y, z) => { const o = piece(G_BOX, color, x, y, z); o.scale.set(w, h, d); return o; };
const spike = (r, h, color, x, y, z) => { const o = piece(G_SPIKE, color, x, y, z); o.scale.set(r * 2, h, r * 2); return o; };
const tube = (r, h, color, x, y, z) => { const o = piece(G_CYL, color, x, y, z); o.scale.set(r * 2, h, r * 2); return o; };
const dome = (theta, color, sx, sy, sz, tilt = 0, x = 0, y = 0, z = 0) => { const o = piece(domeGeo(theta), color, x, y, z); o.scale.set(sx, sy, sz); o.rotation.x = tilt; return o; };
const lathe = (pts, color, sx = 1, sz = 1, phiStart, phiLen) => { const o = piece(latheGeo(pts, phiStart, phiLen), color); o.scale.set(sx, 1, sz); return o; };
const rot = (o, x = 0, y = 0, z = 0) => { o.rotation.set(x, y, z); return o; };
function shade(hex, k) { const c = new THREE.Color(hex); c.multiplyScalar(k); return c.getHex(); }

// Membre d'un seul tenant : profil [hauteur, rayon] du haut vers le bas, découpé en bandes de couleur [hauteurDuHaut, couleur]
function limb(profile, bands, sx = 1, sz = 1) {
  const last = profile[profile.length - 1];
  const rAt = (y) => { for (let i = 0; i < profile.length - 1; i++) { const [y0, r0] = profile[i], [y1, r1] = profile[i + 1]; if (y <= y0 + 1e-9 && y >= y1 - 1e-9) return r0 + (r1 - r0) * (y0 - y) / ((y0 - y1) || 1); } return last[1]; };
  return bands.map(([yTop, color], i) => {
    const yBot = i + 1 < bands.length ? bands[i + 1][0] : last[0];
    const pts = [[rAt(yTop), yTop], ...profile.filter(([y]) => y < yTop - 1e-6 && y > yBot + 1e-6).map(([y, r]) => [r, y]), [rAt(yBot), yBot]].reverse();
    return lathe(pts, color, sx, sz);
  });
}

// Fusionne des pièces en une seule géométrie : positions, normales, couleurs, épaisseur du contour
// et, pour un personnage, les os et les poids de chaque sommet.
//   items : [{ p: pièce, b: os porteur, o: { outline, big, scale, skin } }]   k : échelle globale
const NONIDX = new Map(), ZERO = new THREE.Vector3();
const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _nm = new THREE.Matrix3(), _c = new THREE.Color();
function buildGeometry(items, k = 1, skinned = false) {
  const pos = [], nor = [], col = [], ow = [], si = [], sw = [];
  for (const it of items) {
    const p = it.p, o = it.o || {};
    p.updateMatrix();
    let g = NONIDX.get(p.userData.geo); if (!g) { g = p.userData.geo.index ? p.userData.geo.toNonIndexed() : p.userData.geo; NONIDX.set(p.userData.geo, g); }
    const P = g.attributes.position, N = g.attributes.normal;
    const sc = o.scale || 1, off = it.b ? it.b.userData.bind : ZERO, flip = !!p.userData.flip, w = o.outline === false ? 0 : (o.big ? 1.9 : 1);
    _nm.getNormalMatrix(p.matrix); _c.setHex(p.userData.color);
    for (let i = 0; i < P.count; i += 3) for (let j = 0; j < 3; j++) {
      const v = i + (flip ? 2 - j : j);
      _v.fromBufferAttribute(P, v).applyMatrix4(p.matrix).multiplyScalar(sc);
      if (skinned) {
        const s = o.skin ? o.skin(_v) : null;
        if (s) { si.push(s[0], s[2], 0, 0); sw.push(s[1], s[3], 0, 0); } else { si.push(it.b.userData.index, 0, 0, 0); sw.push(1, 0, 0, 0); }
      }
      pos.push((_v.x + off.x) * k, (_v.y + off.y) * k, (_v.z + off.z) * k);
      _n.fromBufferAttribute(N, v).applyMatrix3(_nm).normalize(); if (flip) _n.negate();
      nor.push(_n.x, _n.y, _n.z); col.push(_c.r, _c.g, _c.b); ow.push(w);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('ow', new THREE.Float32BufferAttribute(ow, 1));
  if (skinned) { geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); }
  return geo;
}
// Objet rigide (arme, créature) : un maillage coloré et son contour
function part(list, o = {}) {
  const g = buildGeometry(list.filter(Boolean).map(p => ({ p, o })));
  const m = new THREE.Mesh(g, TOON);
  if (o.outline !== false) { const ol = new THREE.Mesh(g, OUTLINE); ol.userData.outline = true; m.add(ol); }
  return m;
}
const G_DISC = new THREE.CircleGeometry(0.5, 20), SHADOW = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
function blob(r) { const m = new THREE.Mesh(G_DISC, SHADOW); m.userData.shadow = true; m.rotation.x = -PI / 2; m.scale.set(r * 2, r * 2, 1); m.position.y = 0.03; return m; }
function glow(color, sx, sy, sz, x, y, z, opacity) { const m = new THREE.Mesh(G_BALL, glowMat(color, opacity)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); return m; }

// ============================================================
//  HUMANOÏDE
// ============================================================
export function humanoid(o = {}) {
  const skin = o.skin || 0xe8b88a, top = o.top || 0x888888, bottom = o.bottom || 0x5a4030, boots = o.boots || 0x3a2a1a;
  const wide = o.wide || 1, belly = o.belly || 1;
  const armW = o.armW || (1 + (wide - 1) * 0.7), legW = 1 + (wide - 1) * 0.7;
  const hairC = o.hair ?? 0x3a2a1a, skinD = shade(skin, 0.84);
  const fat = belly > 1 ? belly - 1 : 0;
  const waistR = 0.185 * (1 + fat * 0.6) * (o.fem ? 0.88 : 1), zs = 0.7 * (1 + fat * 0.75);
  const beltR = Math.max(0.212, waistR + 0.012);
  const k = (o.height || 1.75) / 1.9;                       // le modèle est dessiné pour 1,90 m puis mis à la taille voulue
  const g = new THREE.Group();

  // ===== 1. SQUELETTE : chaque os est un pivot (positions en mètres, dans la pose de repos) =====
  const bones = [], items = [];
  const bone = (name, parent, x, y, z) => {
    const b = new THREE.Bone(); b.name = name; b.userData.bind = new THREE.Vector3(x, y, z); b.userData.index = bones.length;
    const pb = parent ? parent.userData.bind : ZERO; b.position.set((x - pb.x) * k, (y - pb.y) * k, (z - pb.z) * k); b.userData.rest = b.position.clone();
    if (parent) parent.add(b); bones.push(b); return b;
  };
  const put = (b, list, opt) => { for (const p of list) if (p) items.push({ p, b, o: opt }); };               // pièces dessinées par rapport à l'os b
  const attach = (b, obj) => { obj.position.multiplyScalar(k); obj.scale.multiplyScalar(k); b.add(obj); return obj; };   // objet rigide accroché à un os
  // Poids progressifs autour d'une articulation : au-dessus de y0 l'os a, en dessous l'os b (sens inverse si blend < 0)
  const joint = (a, b, y0, blend) => (v) => {
    let t = (y0 + blend - v.y) / (2 * blend); t = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
    return t < 0.002 ? [a.userData.index, 1, 0, 0] : t > 0.998 ? [b.userData.index, 1, 0, 0] : [a.userData.index, 1 - t, b.userData.index, t];
  };
  const root = bone('Root', null, 0, 0, 0), hips = bone('Hips', root, 0, 0.92, 0), spine = bone('Spine', hips, 0, 1.0, 0);
  const head = bone('Head', spine, 0, 1.63, o.hunch ? 0.06 : 0);
  const P = { body: root, hips, spine, head };

  // ===== 2. MAILLAGE =====
  // ----- Tronc : le bas suit le bassin, le haut suit le buste, la taille fait le fondu -----
  const T = [];
  T.push(lathe([[0.19, 0.86], [0.2, 0.9], [(0.2 + waistR) / 2 - 0.004, 0.95], [waistR, 1.0], [waistR + ((o.fem ? 0.2 : 0.214) - waistR) * 0.3, 1.05], [waistR + ((o.fem ? 0.2 : 0.214) - waistR) * 0.6, 1.1], [o.fem ? 0.2 : 0.214, 1.2], [o.fem ? 0.192 : 0.206, 1.31], [0.15, 1.39], [0.07, 1.435], [0.001, 1.44]], top, wide, zs));
  T.push(ball(0.41 * wide, 0.24, 0.42 * zs, o.robe || bottom, 0, 0.845, 0));           // bassin
  T.push(cap(0.058, 0.07, skin, 0, 1.47, 0));                                            // cou
  if (fat > 0.25) T.push(ball(0.4 * wide, 0.42, 0.5 * zs, o.apron || top, 0, 1.02, 0.07 * zs));   // gros ventre
  if (o.belt !== false) {
    T.push(lathe([[beltR - 0.012, 0.87], [beltR, 0.88], [beltR, 0.94], [beltR - 0.014, 0.95]], o.belt || 0x3a2a1a, wide, zs));
    T.push(bx(0.07, 0.06, 0.02, 0xd8b040, 0, 0.91, beltR * zs + 0.004));
  }
  const robeLen = o.robe ? (o.robeLen || 0.72) : 0, hemR = beltR + robeLen * 0.2, zr = zs * 1.08;
  const robeR = (y) => beltR + ((0.93 - y) / (robeLen || 1)) * (hemR - beltR);
  if (o.robe) T.push(lathe([[hemR - 0.006, 0.93 - robeLen - 0.012], [hemR, 0.93 - robeLen], [beltR + (hemR - beltR) * 0.45, 0.93 - robeLen * 0.5], [beltR - 0.004, 0.93]], o.robe, wide, zr));
  if (o.apron) {
    const low = o.robe ? Math.max(0.235, robeR(0.5) + 0.014) : 0.236, sz = o.robe ? zr : zs;
    T.push(lathe([[low, 0.5], [beltR + 0.012, 0.9], [waistR + 0.02, 1.0], [0.226, 1.2], [0.222, 1.28]], o.apron, wide, sz, -0.95, 1.9));
    T.push(lathe([[beltR + 0.014, 0.9], [beltR + 0.014, 0.93]], shade(o.apron, 0.8), wide, sz));
  }
  if (o.waistApron) T.push(lathe([[beltR + 0.028, 0.7], [beltR + 0.02, 0.8], [beltR + 0.008, 0.9]], o.waistApron, wide, zs, -1.25, 2.5));
  if (o.satchel) {
    T.push(rot(ball(0.2, 0.22, 0.12, o.satchel, 0.2 * wide, 0.8, -0.06), 0, 0.35, 0)); T.push(rot(bx(0.17, 0.09, 0.125, shade(o.satchel, 0.75), 0.2 * wide, 0.86, -0.06), 0, 0.35, 0));
    T.push(rot(bx(0.035, 0.68, 0.012, shade(o.satchel, 0.75), 0.02, 1.14, 0.158), 0, 0, 0.62)); T.push(rot(bx(0.035, 0.68, 0.012, shade(o.satchel, 0.75), 0.02, 1.14, -0.158), 0, 0, 0.62));
  }
  if (o.hoodDown) T.push(ball(0.3, 0.2, 0.2, o.hoodDown, 0, 1.44, -0.13));
  if (o.tabard) for (const ps of [-0.62, PI - 0.62]) T.push(lathe([[0.232, 0.6], [beltR + 0.012, 0.9], [waistR + 0.02, 1.0], [0.226, 1.2], [0.218, 1.33]], o.tabard, wide, zs, ps, 1.24));
  if (o.scarf) T.push(lathe([[0.09, 1.385], [0.128, 1.405], [0.13, 1.46], [0.09, 1.485]], o.scarf, 1, 0.95));
  if (o.collar) T.push(lathe([[0.1, 1.4], [0.115, 1.42], [0.1, 1.455]], o.collar, 1, 0.9));
  put(root, T, { skin: joint(hips, spine, 1.0, -0.1) });
  if (o.pendant) put(spine, [rot(bx(0.011, 0.19, 0.011, 0x3a2a1a, -0.045, 0.31, 0.147 * (zs / 0.7)), 0.25, 0, 0.42), rot(bx(0.011, 0.19, 0.011, 0x3a2a1a, 0.045, 0.31, 0.147 * (zs / 0.7)), 0.25, 0, -0.42)], { outline: false });
  if (o.pendant) attach(spine, glow(0xfff0b0, 0.07, 0.085, 0.05, 0, 0.225, 0.165 * (zs / 0.7)));

  // ----- Jambes : un seul tube de la hanche à la cheville, plié au genou -----
  const legCol = o.bareLegs ? skin : bottom;
  for (const s of [1, -1]) {                                 // +x = côté GAUCHE du personnage (il regarde vers +z)
    const side = s > 0 ? 'Left' : 'Right', K = s > 0 ? 'L' : 'R', hx = 0.098 * s * wide;
    const up = bone(side + 'UpperLeg', hips, hx, 0.86, 0), low = bone(side + 'LowerLeg', up, hx, 0.46, 0), foot = bone(side + 'Foot', low, hx, 0.13, 0);
    put(up, limb([[0.075, 0.001], [0.066, 0.05 * legW], [0.03, 0.08 * legW], [-0.04, 0.085 * legW], [-0.2, 0.08 * legW], [-0.31, 0.075 * legW], [-0.355, 0.074 * legW], [-0.4, 0.074 * legW], [-0.445, 0.073 * legW], [-0.49, 0.072 * legW], [-0.61, 0.068 * legW]], [[0.075, legCol]]), { skin: joint(up, low, -0.4, 0.09) });
    put(low, [cap(0.079 * legW, 0.1, boots, 0, -0.3, 0), o.bootTop ? tube(0.09 * legW, 0.035, o.bootTop, 0, -0.215, 0) : null]);
    put(foot, [ball(0.185 * legW, 0.135, 0.33, boots, 0, -0.065, 0.06)]);
    P['leg' + K] = up; P['knee' + K] = low; P['foot' + K] = foot;
  }

  // ----- Bras : un seul tube de l'épaule au poignet, plié au coude -----
  const sleeveBands = o.sleeve != null ? [[0.072 * armW, o.sleeve]] : o.sleeveless ? [[0.072 * armW, skin]] : [[0.072 * armW, top], [o.shortSleeve ? -0.2 : -0.07, skin]];
  for (const s of [1, -1]) {
    const side = s > 0 ? 'Left' : 'Right', K = s > 0 ? 'L' : 'R', sx = (0.2 * wide + 0.04) * s;
    const up = bone(side + 'UpperArm', spine, sx, 1.335, 0), low = bone(side + 'LowerArm', up, sx, 1.035, 0), hand = bone(side + 'Hand', low, sx, 0.765, 0);
    put(up, limb([[0.072 * armW, 0.001], [0.066 * armW, 0.034 * armW], [0.045 * armW, 0.06 * armW], [0, 0.071 * armW], [-0.07, 0.066 * armW], [-0.16, 0.059 * armW], [-0.23, 0.056 * armW], [-0.265, 0.055 * armW], [-0.3, 0.055 * armW], [-0.335, 0.054 * armW], [-0.37, 0.053 * armW], [-0.46, 0.05 * armW], [-0.565, 0.045 * armW]], sleeveBands), { skin: joint(up, low, -0.3, 0.075) });
    if (o.pauldron) put(up, [ball(0.27, 0.2, 0.27, o.pauldron, 0.025 * s, 0.035, 0), ball(0.3, 0.07, 0.3, shade(o.pauldron, 0.75), 0.025 * s, -0.01, 0)]);
    put(low, [o.bracer ? cap(0.062 * armW, 0.075, o.bracer, 0, -0.15, 0) : null, o.cuff ? tube(0.066 * armW, 0.03, o.cuff, 0, -0.215, 0) : null]);
    put(hand, [ball(0.118 * armW, 0.13 * armW, 0.118 * armW, o.glove || skin, 0, -0.015, 0)]);
    P['arm' + K] = up; P['elbow' + K] = low; P['hand' + K] = hand;
  }

  // ----- Tête -----
  const H = [];
  H.push(ball(0.44, 0.47, 0.45, skin, 0, 0, 0));
  const covered = o.hood || o.visor;
  if (!o.ears && !covered) for (const s of [-1, 1]) H.push(ball(0.05, 0.09, 0.065, skinD, 0.215 * s, -0.005, 0));
  if (o.ears) for (const s of [-1, 1]) { H.push(rot(spike(0.06, 0.34, skin, 0.33 * s, 0.05, -0.02), 0, 0, -s * 1.2)); H.push(rot(spike(0.035, 0.24, skinD, 0.31 * s, 0.045, 0.0), 0, 0, -s * 1.2)); }
  const F = [];
  if (!o.noFace) {
    const mood = o.mood || 'neutral', eyeC = o.eye || 0x4a3020, es = o.eyeSize || 1, ink = 0x2a1a12;
    for (const s of [-1, 1]) {
      const ex = 0.083 * s;
      F.push(eye(0.098 * es, 0.112 * es, 0.036, ink, ex, 0.02, 0.197));              // trait de paupière
      F.push(eye(0.086 * es, 0.105 * es, 0.04, 0xffffff, ex, 0.012, 0.2));
      F.push(eye(0.062 * es, 0.08 * es, 0.03, eyeC, ex, 0.008, 0.212));
      F.push(eye(0.032 * es, 0.046 * es, 0.02, 0x140c08, ex, 0.006, 0.223));
      F.push(eye(0.02, 0.02, 0.012, 0xffffff, ex + 0.014, 0.03, 0.229));
      // Sourcils : leur inclinaison donne l'expression
      const tilt = mood === 'angry' ? 0.42 : mood === 'kind' ? -0.18 : mood === 'sad' ? -0.35 : mood === 'bold' ? 0.2 : 0.04;
      F.push(rot(bx(0.085, 0.02, 0.02, o.brow ?? shade(hairC, 0.75), ex, 0.094 + (mood === 'angry' ? -0.014 : 0), 0.207), 0, 0, tilt * s));
    }
    const ns = o.nose || 1; (ns > 1.5 ? H : F).push(ball(0.04 * ns, 0.045 * ns, 0.06 * ns, skinD, 0, -0.04, 0.215));
    if (!o.beard || (o.beardLen || 0) < 0.25) {
      const lip = 0x8a3a2c, up = mood === 'kind' ? 1 : mood === 'smile' ? 0.7 : mood === 'angry' ? -1 : 0, mw = mood === 'kind' ? 0.075 : 0.055;
      F.push(bx(mw, 0.013, 0.012, lip, 0, -0.108, 0.2));
      if (up) for (const s of [-1, 1]) F.push(rot(bx(0.03, 0.013, 0.012, lip, (mw / 2 + 0.009) * s, -0.108 + 0.008 * up, 0.196), 0, 0, 0.65 * s * up));
    }
    if (o.blush) for (const s of [-1, 1]) F.push(ball(0.065, 0.04, 0.02, 0xf29a94, 0.135 * s, -0.058, 0.172));
    if (o.freckles) for (const [fx, fy] of [[0.105, -0.038], [0.135, -0.03], [0.12, -0.062], [0.03, -0.02]]) for (const s of [-1, 1]) F.push(ball(0.014, 0.014, 0.008, shade(skin, 0.72), fx * s, fy, 0.215 - Math.abs(fx) * 0.24));
    if (o.tusks) for (const s of [-1, 1]) H.push(rot(spike(0.03, 0.13, 0xf4eed8, 0.07 * s, -0.09, 0.2), 0.2, 0, 0));
  }
  // Cheveux
  const hc = hairC, fringe = (n = 3, w = 0.1) => { for (let i = 0; i < n; i++) { const fx = (i - (n - 1) / 2) * w; H.push(ball(0.13, 0.065, 0.08, hc, fx, 0.142 - Math.abs(fx) * 0.14, 0.186 - Math.abs(fx) * 0.25)); } };
  const hairCap = () => H.push(dome(0.56, hc, 0.475, 0.5, 0.485, -0.72));
  if (!o.helmet && !o.hood) switch (o.hairStyle) {
    case 'short': hairCap(); fringe(3); break;
    case 'messy':
      hairCap();
      for (const [x, y, z, rx, rz] of [[-0.1, 0.225, 0.03, 0.2, 0.55], [0.09, 0.235, -0.02, 0, -0.5], [0, 0.245, -0.09, -0.7, 0], [0.15, 0.165, -0.1, -0.3, -0.95], [-0.155, 0.16, -0.09, -0.3, 0.95], [0.02, 0.24, 0.07, 0.6, -0.15], [0, 0.12, -0.21, -1.5, 0]]) H.push(rot(spike(0.06, 0.16, hc, x, y, z), rx, 0, rz));
      H.push(rot(spike(0.05, 0.13, hc, 0.05, 0.118, 0.205), 0.3, 0, PI - 0.35));   // la mèche rebelle
      H.push(rot(spike(0.045, 0.09, hc, -0.05, 0.135, 0.2), 0.3, 0, PI + 0.3));
      H.push(rot(spike(0.04, 0.08, hc, -0.125, 0.125, 0.165), 0.25, 0, PI + 0.5)); H.push(rot(spike(0.04, 0.08, hc, 0.13, 0.125, 0.16), 0.25, 0, PI - 0.5));
      break;
    case 'long': hairCap(); fringe(3); H.push(ball(0.45, 0.62, 0.25, hc, 0, -0.2, -0.125)); for (const s of [-1, 1]) H.push(ball(0.1, 0.36, 0.14, hc, 0.2 * s, -0.12, 0.02)); break;
    case 'bun': hairCap(); fringe(3, 0.095); H.push(ball(0.19, 0.18, 0.19, hc, 0, 0.19, -0.17)); for (const s of [-1, 1]) H.push(ball(0.06, 0.2, 0.08, hc, 0.21 * s, -0.04, 0.07)); break;
    case 'braid':
      hairCap(); fringe(3);
      H.push(ball(0.3, 0.3, 0.2, hc, 0.06, -0.08, -0.14));
      [[0.2, -0.13, 0.04, 0.115], [0.215, -0.225, 0.085, 0.105], [0.22, -0.315, 0.115, 0.095], [0.22, -0.4, 0.13, 0.085]].forEach(([x, y, z, d]) => H.push(ball(d, d, d, hc, x, y, z)));
      H.push(ball(0.075, 0.05, 0.075, 0xe8912d, 0.22, -0.455, 0.135)); H.push(rot(spike(0.04, 0.1, hc, 0.22, -0.52, 0.135), PI, 0, 0));
      break;
    case 'sides': { const b = piece(bandGeo(), hc); b.scale.set(0.475, 0.5, 0.485); b.rotation.x = -0.3; H.push(b); break; }
    case 'back': hairCap(); H.push(ball(0.36, 0.3, 0.2, hc, 0, -0.1, -0.16)); break;
    default: break;
  }
  if (o.beard) {
    H.push(ball(0.31, 0.2, 0.2, o.beard, 0, -0.15, 0.11));
    for (const s of [-1, 1]) H.push(ball(0.1, 0.2, 0.14, o.beard, 0.17 * s, -0.09, 0.07));
    H.push(ball(0.17, 0.05, 0.06, o.beard, 0, -0.078, 0.212));
    if ((o.beardLen || 0) >= 0.25) H.push(rot(spike(0.14, o.beardLen + 0.1, o.beard, 0, -0.2 - o.beardLen / 2, 0.12), PI, 0, 0));
  }
  if (o.hood) { H.push(dome(0.64, o.hood, 0.55, 0.56, 0.56, -0.38)); H.push(ball(0.4, 0.42, 0.24, o.hood, 0, -0.2, -0.15)); }
  if (o.helmet) {
    const hm = o.helmet, hmD = shade(hm, 0.72);
    if (o.visor) {
      H.push(dome(0.72, hm, 0.51, 0.53, 0.52, 0)); H.push(ball(0.3, 0.2, 0.2, hmD, 0, -0.17, 0.1));
      H.push(rot(bx(0.03, 0.2, 0.03, hmD, 0, -0.08, 0.255), -0.15, 0, 0));
    } else {
      H.push(dome(0.52, hm, 0.505, 0.5, 0.515, -0.25));
      H.push(lathe([[0.262, 0.01], [0.27, 0.03], [0.262, 0.05]], hmD, 1, 1.02));
      H.push(bx(0.045, 0.17, 0.03, hmD, 0, 0.0, 0.235));
      for (const s of [-1, 1]) H.push(ball(0.05, 0.2, 0.17, hm, 0.225 * s, -0.07, 0.03));
    }
    if (o.plume) { H.push(ball(0.075, 0.2, 0.44, o.plume, 0, 0.275, -0.04)); H.push(ball(0.06, 0.08, 0.3, hmD, 0, 0.215, -0.03)); }
    if (o.wings) for (const s of [-1, 1]) H.push(rot(spike(0.06, 0.34, hmD, 0.22 * s, 0.3, -0.1), -0.35, 0, -s * 0.55));
  }
  if (o.hat === 'toque') { H.push(tube(0.2, 0.1, 0xf4f0e8, 0, 0.2, -0.01)); H.push(ball(0.5, 0.3, 0.5, 0xf8f4ec, 0, 0.33, -0.01)); }
  else if (o.hat) { H.push(tube(0.34, 0.03, o.hat, 0, 0.15, -0.01)); H.push(lathe([[0.2, 0.15], [0.17, 0.3], [0.001, 0.31]], o.hat)); H.push(tube(0.2, 0.04, shade(o.hat, 0.7), 0, 0.185, -0.01)); }
  put(head, H, { scale: o.headScale || 1 });
  put(head, F, { scale: o.headScale || 1, outline: false });
  if (o.visor) attach(head, glow(o.visorGlow || 0xb070ff, 0.26, 0.035, 0.04, 0, 0.02, 0.246));

  // ----- Cape : un os à elle, pour qu'elle flotte (deux faces : dehors et dedans) -----
  if (o.cape) {
    const len = o.capeLen || 0.9, c = bone('Cape', spine, 0, 1.405, -0.01);
    const sheet = () => lathe([[0.36, -len], [0.33, -len * 0.6], [0.26, -len * 0.25], [0.2, 0]], o.cape, wide * 1.02, 0.78, PI - 1.3, 2.6);
    const inner = sheet(); inner.userData.flip = true; inner.userData.color = shade(o.cape, 0.8);
    put(c, [sheet(), inner, lathe([[0.1, -0.03], [0.215, 0.0], [0.2, 0.03], [0.1, 0.045]], o.cape, wide, 0.82)]);
    P.cape = c;
  }

  // ===== 3. PEAU : le maillage est lié au squelette (chaque sommet connaît ses os et leurs poids) =====
  const geo = buildGeometry(items, k, true);
  g.add(root); root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  const mesh = new THREE.SkinnedMesh(geo, TOON); mesh.name = 'Corps'; mesh.frustumCulled = false; g.add(mesh); mesh.bind(skeleton);
  const outline = new THREE.SkinnedMesh(geo, OUTLINE); outline.name = 'Contour'; outline.frustumCulled = false; outline.userData.outline = true; g.add(outline); outline.bind(skeleton, mesh.bindMatrix);

  // ----- Arme (main droite) et bouclier (bras gauche) : objets rigides accrochés à un os, comme dans Unity -----
  if (o.weapon) { const w = makeWeapon(o.weapon, o.weaponColor); w.name = 'Arme'; w.position.set(0, -0.02, 0.02); attach(P.handR, w); P.weapon = w; }
  if (o.shield) {
    const sh = part([rot(tube(0.26, 0.04, o.shield, 0, 0, 0), 0, 0, PI / 2), rot(tube(0.285, 0.03, shade(o.shield, 0.6), 0, 0, 0), 0, 0, PI / 2), ball(0.09, 0.14, 0.14, 0xc8ccd0, 0.03, 0, 0)]);
    sh.name = 'Bouclier'; sh.position.set(0.09, -0.2, 0.02); attach(P.elbowL, sh);
  }

  g.add(blob(0.36 * wide * (o.height || 1.75) / 1.75));
  const u = g.userData;
  u.P = P; u.height = o.height || 1.75; u.walkT = Math.random() * 6; u.seed = Math.random() * 10; u.move = 0; u.k = k;
  u.stride = o.robe ? 0.36 : 0.62; u.knee = o.robe ? 0.42 : 1.0; u.lean = o.hunch ? 0.16 : 0; u.armed = !!o.weapon;
  u.rig = { mesh, outline, skeleton, bones, root, pieces: items.length };
  u.anim = (dt, moving, t) => animHumanoid(g, dt, moving, t);
  animHumanoid(g, 0.016, false, 0);
  return g;
}

export function makeWeapon(type, color) {
  const g = new THREE.Group(), L = [];
  if (type === 'sword') {
    L.push(bx(0.085, 0.66, 0.018, color || 0xdfe6ee, 0, 0.44, 0)); L.push(bx(0.02, 0.62, 0.03, 0xb8c2cc, 0, 0.42, 0));
    { const tip = spike(0.043, 0.12, color || 0xdfe6ee, 0, 0.83, 0); tip.scale.set(0.086, 0.12, 0.02); L.push(tip); }
    L.push(bx(0.25, 0.045, 0.045, 0xa8802e, 0, 0.1, 0)); L.push(cap(0.02, 0.1, 0x4a3220, 0, 0.02, 0)); L.push(ball(0.05, 0.05, 0.05, 0xa8802e, 0, -0.06, 0));
    g.rotation.set(PI / 2 + 0.42, 0, 0.16);
  } else if (type === 'bigsword') {
    L.push(bx(0.15, 1.05, 0.022, color || 0x2c2c38, 0, 0.66, 0)); L.push(bx(0.03, 1.0, 0.036, 0x6a3fa0, 0, 0.64, 0));
    { const tip = spike(0.075, 0.2, color || 0x2c2c38, 0, 1.28, 0); tip.scale.set(0.15, 0.2, 0.024); L.push(tip); }
    L.push(bx(0.4, 0.06, 0.05, 0x4a4a58, 0, 0.12, 0)); L.push(cap(0.022, 0.16, 0x1a1a20, 0, 0.0, 0)); L.push(ball(0.06, 0.06, 0.06, 0x6a3fa0, 0, -0.12, 0));
    g.rotation.set(PI / 2 + 0.42, 0, 0.16);
  } else if (type === 'staff') {
    L.push(cap(0.022, 1.45, color || 0x7a5a36, 0, 0.35, 0));
    for (let i = 0; i < 3; i++) { const a = (i / 3) * PI * 2; L.push(rot(spike(0.025, 0.2, 0x8a6a40, Math.cos(a) * 0.07, 1.12, Math.sin(a) * 0.07), Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5)); }
    g.add(glow(0xff5a3a, 0.13, 0.13, 0.13, 0, 1.19, 0)); g.add(glow(0xff7a40, 0.22, 0.22, 0.22, 0, 1.19, 0, 0.3));
  } else if (type === 'hammer') {
    L.push(cap(0.022, 0.46, 0x6a4a2a, 0, 0.2, 0)); L.push(bx(0.12, 0.12, 0.26, 0x5a5e66, 0, 0.46, 0)); L.push(bx(0.135, 0.135, 0.06, 0x3e4248, 0, 0.46, 0));
    g.rotation.x = PI / 2 - 0.3;
  } else if (type === 'club') {
    L.push(lathe([[0.03, -0.08], [0.035, 0.2], [0.085, 0.62], [0.09, 0.74], [0.05, 0.8], [0.001, 0.81]], color || 0x6a4a2a));
    for (let i = 0; i < 5; i++) { const a = i * 1.3; L.push(rot(spike(0.022, 0.08, 0xd8d0c0, Math.cos(a) * 0.09, 0.56 + i * 0.045, Math.sin(a) * 0.09), Math.sin(a) * 1.57, 0, -Math.cos(a) * 1.57)); }
    g.rotation.x = PI / 2 - 0.35;
  } else if (type === 'cane') {
    L.push(cap(0.018, 0.95, 0x5a4026, 0, 0.1, 0)); L.push(ball(0.07, 0.06, 0.1, 0x5a4026, 0, 0.6, 0.02));
  }
  g.add(part(L));
  return g;
}

// ============================================================
//  ANIMATION
// ============================================================
// Pose de marche (phase en radians, m = 0 à l'arrêt … 1 en pleine marche)
function walkPose(P, u, phase, m) {
  const s = Math.sin(phase), c = Math.cos(phase), st = u.stride;
  P.legL.rotation.x = s * st * m; P.legR.rotation.x = -s * st * m;
  P.kneeL.rotation.x = (0.06 + u.knee * Math.max(0, -c)) * m; P.kneeR.rotation.x = (0.06 + u.knee * Math.max(0, c)) * m;
  P.footL.rotation.x = -0.25 * Math.max(0, -c) * m; P.footR.rotation.x = -0.25 * Math.max(0, c) * m;
  P.body.position.y = (Math.abs(c) * 0.045 - 0.03) * m * u.k;
  P.body.rotation.x = u.lean + 0.08 * m;
  P.hips.rotation.y = -s * 0.06 * m; P.spine.rotation.y = s * 0.13 * m;
  return { armL: -s * 0.6 * m, armR: s * (u.armed ? 0.22 : 0.6) * m,
           elbowL: -0.18 - 0.45 * m * Math.max(0, s) - 0.15 * m, elbowR: -0.18 - (u.armed ? 0.1 : 0.45) * m * Math.max(0, -s) - 0.15 * m };
}
// Dans le jeu : marche calculée en direct (fondu arrêt ↔ marche), respiration et regard au repos
function animHumanoid(g, dt, moving, t) {
  const u = g.userData, P = u.P;
  if (u.pose) return;                                       // pose imposée (cinématique)
  u.move += ((moving ? 1 : 0) - u.move) * Math.min(1, dt * 9);
  if (moving) u.walkT += dt * 10.5;
  const m = u.move, k = Math.min(1, dt * 14), idle = Math.sin((t || 0) * 1.8 + u.seed);
  const a = walkPose(P, u, u.walkT, m);
  P.body.position.y += idle * 0.006 * (1 - m) * u.k;
  P.spine.rotation.x = idle * 0.015 * (1 - m);
  // Les bras suivent en douceur : les combats et les cinématiques peuvent ainsi les lever librement
  P.armL.rotation.x += (a.armL - P.armL.rotation.x) * k; P.armR.rotation.x += (a.armR - P.armR.rotation.x) * k;
  P.armL.rotation.z = 0.1 + idle * 0.012; P.armR.rotation.z = -(0.1 + idle * 0.012);
  P.elbowL.rotation.x += (a.elbowL - P.elbowL.rotation.x) * k; P.elbowR.rotation.x += (a.elbowR - P.elbowR.rotation.x) * k;
  P.head.rotation.y = Math.sin((t || 0) * 0.55 + u.seed * 2) * 0.14 * (1 - m) - Math.sin(u.walkT) * 0.08 * m;
  P.head.rotation.x = idle * 0.02 * (1 - m);
  if (P.cape) P.cape.rotation.x = 0.06 + m * (0.32 + Math.sin(u.walkT * 0.5) * 0.08) + idle * 0.015;
}

// ----- Clips d'animation (comme les « Animation Clips » de Unity) : des poses clés enregistrées os par os -----
const TAU = PI * 2;
// Valeur d'une courbe à l'instant t : [[t0, v0], [t1, v1], …] avec des transitions douces
function curve(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const [t0, v0] = keys[i], [t1, v1] = keys[i + 1]; if (t <= t1) { const x = (t - t0) / (t1 - t0), e = x * x * (3 - 2 * x); return v0 + (v1 - v0) * e; } }
  return keys[keys.length - 1][1];
}
function restPose(P, u) {
  for (const b of u.rig.bones) { b.rotation.set(0, 0, 0); b.scale.set(1, 1, 1); b.position.copy(b.userData.rest); }
}
function standPose(P, u) {   // debout, détendu : bras légèrement écartés, coudes à peine pliés
  P.body.rotation.x = u.lean; P.armL.rotation.z = 0.1; P.armR.rotation.z = -0.1; P.elbowL.rotation.x = -0.18; P.elbowR.rotation.x = -0.18;
  if (P.cape) P.cape.rotation.x = 0.06;
}
export const CLIPS = {
  Repos: { label: 'Repos', dur: 4, loop: true, pose(P, u, t) {
    standPose(P, u); const b = Math.sin(TAU * t / 2), h = Math.sin(TAU * t / 4);
    P.spine.rotation.x = b * 0.025; P.body.position.y = b * 0.006 * u.k; P.armL.rotation.z = 0.1 + b * 0.02; P.armR.rotation.z = -0.1 - b * 0.02;
    P.head.rotation.y = h * 0.16; P.head.rotation.x = b * 0.02; if (P.cape) P.cape.rotation.x = 0.06 + b * 0.02;
  } },
  Marche: { label: 'Marche', dur: TAU / 10.5, loop: true, pose(P, u, t) {
    standPose(P, u); const ph = TAU * t / this.dur, a = walkPose(P, u, ph, 1);
    P.armL.rotation.x = a.armL; P.armR.rotation.x = a.armR; P.elbowL.rotation.x = a.elbowL; P.elbowR.rotation.x = a.elbowR;
    P.head.rotation.y = -Math.sin(ph) * 0.08; if (P.cape) P.cape.rotation.x = 0.38 + Math.sin(ph) * 0.06;
  } },
  Attaque: { label: 'Attaque', dur: 0.9, loop: false, pose(P, u, t) {
    standPose(P, u);
    P.armR.rotation.x = curve(t, [[0, 0], [0.28, -2.5], [0.42, 0.55], [0.6, 0.3], [0.9, 0]]);
    P.armR.rotation.z = -0.1 + curve(t, [[0, 0], [0.28, -0.35], [0.42, 0.25], [0.9, 0]]);
    P.elbowR.rotation.x = curve(t, [[0, -0.18], [0.28, -1.3], [0.42, -0.15], [0.9, -0.18]]);
    P.armL.rotation.x = curve(t, [[0, 0], [0.28, -0.5], [0.42, 0.5], [0.9, 0]]); P.elbowL.rotation.x = curve(t, [[0, -0.18], [0.3, -0.9], [0.9, -0.18]]);
    P.spine.rotation.y = curve(t, [[0, 0], [0.28, -0.5], [0.42, 0.55], [0.6, 0.35], [0.9, 0]]);
    P.spine.rotation.x = curve(t, [[0, 0], [0.28, -0.12], [0.42, 0.3], [0.9, 0]]);
    P.body.rotation.x = u.lean + curve(t, [[0, 0], [0.28, -0.05], [0.42, 0.16], [0.9, 0]]);
    P.legL.rotation.x = curve(t, [[0, 0], [0.3, 0.1], [0.42, -0.55], [0.6, -0.5], [0.9, 0]]); P.kneeL.rotation.x = curve(t, [[0, 0], [0.42, 0.45], [0.6, 0.4], [0.9, 0]]);
    P.legR.rotation.x = curve(t, [[0, 0], [0.42, 0.35], [0.6, 0.3], [0.9, 0]]);
    P.body.position.y = -curve(t, [[0, 0], [0.42, 0.05], [0.6, 0.045], [0.9, 0]]) * u.k;
    P.head.rotation.x = curve(t, [[0, 0], [0.28, -0.1], [0.42, 0.1], [0.9, 0]]);
    if (P.cape) P.cape.rotation.x = 0.06 + curve(t, [[0, 0], [0.42, 0.1], [0.55, 0.6], [0.9, 0]]);
  } },
  Sort: { label: 'Sort', dur: 1.2, loop: false, pose(P, u, t) {
    standPose(P, u);
    P.armR.rotation.x = curve(t, [[0, 0], [0.35, -2.8], [0.8, -2.8], [1.2, 0]]); P.elbowR.rotation.x = curve(t, [[0, -0.18], [0.2, -0.9], [0.4, -0.1], [0.8, -0.1], [1.2, -0.18]]);
    P.armL.rotation.x = curve(t, [[0, 0], [0.35, -1.3], [0.8, -1.3], [1.2, 0]]); P.armL.rotation.z = 0.1 + curve(t, [[0, 0], [0.35, 0.5], [0.8, 0.5], [1.2, 0]]);
    P.elbowL.rotation.x = curve(t, [[0, -0.18], [0.35, -0.7], [0.8, -0.7], [1.2, -0.18]]);
    P.spine.rotation.x = curve(t, [[0, 0], [0.35, -0.2], [0.8, -0.2], [1.2, 0]]); P.head.rotation.x = curve(t, [[0, 0], [0.35, -0.3], [0.8, -0.3], [1.2, 0]]);
    P.body.position.y = curve(t, [[0, 0], [0.2, -0.04], [0.4, 0.06], [0.8, 0.06], [1.2, 0]]) * u.k;
    P.kneeL.rotation.x = P.kneeR.rotation.x = curve(t, [[0, 0], [0.2, 0.3], [0.4, 0], [1.2, 0]]); P.legL.rotation.x = P.legR.rotation.x = -P.kneeL.rotation.x / 2;
    if (P.cape) P.cape.rotation.x = 0.06 + curve(t, [[0, 0], [0.4, 0.5], [0.8, 0.4], [1.2, 0]]);
  } },
  Touche: { label: 'Touché', dur: 0.55, loop: false, pose(P, u, t) {
    standPose(P, u); const k = curve(t, [[0, 0], [0.1, 1], [0.25, 0.7], [0.55, 0]]);
    P.spine.rotation.x = -0.4 * k; P.head.rotation.x = -0.35 * k; P.body.rotation.x = u.lean - 0.12 * k; P.spine.rotation.y = 0.25 * k;
    P.armL.rotation.z = 0.1 + 0.7 * k; P.armR.rotation.z = -0.1 - 0.7 * k; P.armL.rotation.x = P.armR.rotation.x = -0.3 * k;
    P.kneeL.rotation.x = P.kneeR.rotation.x = 0.3 * k; P.legL.rotation.x = P.legR.rotation.x = -0.15 * k; P.body.position.y = -0.03 * k * u.k;
  } },
  KO: { label: 'K.-O.', dur: 1.3, loop: false, pose(P, u, t) {
    standPose(P, u); const k = curve(t, [[0, 0], [0.25, 0.2], [0.75, 1], [1.3, 1]]), j = curve(t, [[0, 0], [0.3, 1], [0.75, 0.2], [1.3, 0]]);
    P.body.rotation.x = u.lean * (1 - k) - 1.5 * k; P.body.position.y = (0.14 * k - 0.1 * j) * u.k; P.body.position.z = -0.5 * k * u.k;
    P.kneeL.rotation.x = P.kneeR.rotation.x = 0.9 * j + 0.1 * k; P.legL.rotation.x = -0.5 * j - 0.05 * k; P.legR.rotation.x = -0.5 * j + 0.12 * k;
    P.armL.rotation.z = 0.1 + 0.9 * k; P.armR.rotation.z = -0.1 - 0.75 * k; P.armL.rotation.x = -0.5 * j; P.armR.rotation.x = -0.5 * j;
    P.head.rotation.x = 0.35 * j - 0.15 * k; P.spine.rotation.x = 0.3 * j; if (P.cape) P.cape.rotation.x = 0.06 * (1 - k);
  } },
};
// Enregistre chaque pose 30 fois par seconde : on obtient de vrais clips, jouables par un AnimationMixer
// (ici) ou un Animator (Unity), et rangés dans le fichier .glb.
export function makeClips(g, fps = 30) {
  const u = g.userData, P = u.P, bones = u.rig.bones, defs = Object.entries(u.clips || CLIPS);
  const saved = bones.map(b => [b.position.clone(), b.quaternion.clone(), b.scale.clone()]);
  // 1) on prend la pose à chaque image et on note, pour chaque os, sa rotation, sa position et sa taille
  const rec = defs.map(([name, def]) => {
    const n = Math.max(2, Math.ceil(def.dur * fps)), times = [], quat = bones.map(() => []), pos = bones.map(() => []), scl = bones.map(() => []);
    for (let i = 0; i <= n; i++) {
      const t = def.dur * i / n; times.push(t);
      restPose(P, u); def.pose(P, u, t);
      bones.forEach((b, j) => { const q = b.quaternion; quat[j].push(q.x, q.y, q.z, q.w); pos[j].push(b.position.x, b.position.y, b.position.z); scl[j].push(b.scale.x, b.scale.y, b.scale.z); });
    }
    return { name, def, times, quat, pos, scl };
  });
  // 2) la rotation est gardée pour tous les os ; la position et la taille seulement pour les os qui en changent
  const differs = (arr, ref) => arr.some((v, i) => Math.abs(v - ref[i % 3]) > 1e-6);
  const movesPos = bones.map((b, j) => b === u.rig.root || rec.some(r => differs(r.pos[j], b.userData.rest.toArray())));
  const movesScl = bones.map((b, j) => rec.some(r => differs(r.scl[j], [1, 1, 1])));
  const clips = rec.map((r) => {
    const tracks = bones.map((b, j) => new THREE.QuaternionKeyframeTrack(b.name + '.quaternion', r.times, r.quat[j]));
    bones.forEach((b, j) => {
      if (movesPos[j]) tracks.push(new THREE.VectorKeyframeTrack(b.name + '.position', r.times, r.pos[j]));
      if (movesScl[j]) tracks.push(new THREE.VectorKeyframeTrack(b.name + '.scale', r.times, r.scl[j]));
    });
    const clip = new THREE.AnimationClip(r.name, r.def.dur, tracks); clip.userData = { loop: r.def.loop, label: r.def.label };
    return clip;
  });
  bones.forEach((b, j) => { b.position.copy(saved[j][0]); b.quaternion.copy(saved[j][1]); b.scale.copy(saved[j][2]); });
  return clips;
}
// Remet le squelette dans sa pose de repos (celle du fichier exporté)
export function toRestPose(g) { restPose(g.userData.P, g.userData); }

// ============================================================
//  FICHES DES PERSONNAGES
// ============================================================
export const CHARS = {
  kael:   { height: 1.74, skin: 0xd9a070, hair: 0x4a3220, hairStyle: 'messy', eye: 0xe8a82a, mood: 'bold', armW: 1.12, top: 0xe6d8b4, sleeveless: true, bottom: 0x6b4226, boots: 0x3e2a1a, bootTop: 0x5a3c22, belt: 0x4a2f1a, waistApron: 0x7a5230, bracer: 0x6b4226, pendant: true, weapon: 'sword' },
  lyra:   { height: 1.63, fem: true, skin: 0xf6d0b4, hair: 0xc8582a, hairStyle: 'braid', eye: 0x2f9a52, freckles: true, mood: 'smile', top: 0x24327a, sleeve: 0x24327a, cuff: 0xe0b040, robe: 0x24327a, robeLen: 0.42, bottom: 0x2a2a3a, boots: 0x4a3020, bootTop: 0xe0b040, cape: 0x1a2458, capeLen: 0.62, hoodDown: 0x1a2458, satchel: 0x8a5a30, belt: 0xb08a2a, collar: 0xe0b040, weapon: 'staff' },
  hagen:  { height: 1.7, wide: 1.25, belly: 1.25, armW: 1.35, skin: 0xd9a078, hair: 0xe8e4dc, hairStyle: 'sides', beard: 0xe8e4dc, beardLen: 0.26, brow: 0xd0ccc4, eye: 0x4a5a6a, mood: 'angry', top: 0x8a7a6a, bottom: 0x4a4038, apron: 0x5a3a22, bracer: 0x5a3a22, weapon: 'hammer' },
  mira:   { height: 1.65, fem: true, skin: 0xf8d2b6, hair: 0xf2d06a, hairStyle: 'bun', eye: 0x3a78c0, blush: true, mood: 'kind', top: 0x7fa6d9, sleeve: 0x7fa6d9, cuff: 0xf4f0e8, robe: 0x7fa6d9, bottom: 0x7fa6d9, apron: 0xf8f4ec, boots: 0x6a4a2a, belt: false },
  aubin:  { height: 1.78, skin: 0xe0b090, hair: 0x9a9a9a, hairStyle: 'short', beard: 0x9a9a9a, eye: 0x5a4a3a, mood: 'kind', top: 0x3a6a3a, sleeve: 0x3a6a3a, cuff: 0xd8b040, bottom: 0x4a3a2a, cape: 0x2a4a2a, capeLen: 0.85, collar: 0xd8b040 },
  odile:  { height: 1.5, fem: true, skin: 0xe8c4a8, hair: 0xd8d8d8, hairStyle: 'bun', brow: 0xb8b8b8, eye: 0x5a6a7a, mood: 'kind', top: 0x7a4a8a, sleeve: 0x7a4a8a, robe: 0x5a3a6a, bottom: 0x5a3a6a, scarf: 0xb07ac0, belt: false, weapon: 'cane', hunch: true },
  gaspard:{ height: 1.76, wide: 1.15, belly: 1.4, skin: 0xe8b890, hair: 0x6a4a2a, hairStyle: 'sides', beard: 0x6a4a2a, mood: 'kind', top: 0xf0e8d8, sleeve: 0xf0e8d8, bottom: 0x4a3a2a, apron: 0xb04a3a },
  boulanger: { height: 1.72, belly: 1.3, skin: 0xe8b890, hair: 0x3a2a1a, hairStyle: 'short', mood: 'kind', blush: true, top: 0xf4f0e8, sleeve: 0xf4f0e8, bottom: 0x8a7a5a, apron: 0xf8f4ec, hat: 'toque' },
  enfant1:{ height: 1.1, headScale: 1.28, eyeSize: 1.15, skin: 0xf4ccac, hair: 0x8a5a2a, hairStyle: 'messy', mood: 'kind', blush: true, top: 0xc84a3a, shortSleeve: true, bottom: 0x4a4a7a, boots: 0x5a3a22 },
  enfant2:{ height: 1.05, headScale: 1.3, eyeSize: 1.15, fem: true, skin: 0xd9a070, hair: 0x2a1a0a, hairStyle: 'long', mood: 'kind', blush: true, top: 0xe8c840, sleeve: 0xe8c840, robe: 0xe8c840, robeLen: 0.4, bottom: 0xe8c840, belt: false },
  villageois1: { height: 1.74, skin: 0xe0b090, hair: 0x5a3a1a, hairStyle: 'short', top: 0x5a7a4a, sleeve: 0x5a7a4a, bottom: 0x5a4a3a },
  villageoise1: { height: 1.66, fem: true, skin: 0xf4ccac, hair: 0x7a3a1a, hairStyle: 'long', mood: 'kind', top: 0xb05a5a, sleeve: 0xb05a5a, robe: 0xb05a5a, bottom: 0xb05a5a, apron: 0xe8e0d0, belt: false },
  soldat: { height: 1.8, skin: 0xd8b090, eye: 0x3a3a3a, mood: 'angry', top: 0x74747e, sleeve: 0x55555e, bottom: 0x3a3a42, boots: 0x2a2a2e, helmet: 0x7a7a84, plume: 0xb02020, pauldron: 0x7a7a84, glove: 0x3a3a42, bracer: 0x7a7a84, weapon: 'sword', shield: 0x5a2020, belt: 0x2a2a2e, tabard: 0x4a4a52 },
  krall:  { height: 1.95, wide: 1.14, armW: 1.2, skin: 0xd0a080, eye: 0x8a2a1a, mood: 'angry', beard: 0x3a2a22, top: 0x5a5a64, sleeve: 0x4a4a52, bottom: 0x2e2e36, boots: 0x1e1e22, helmet: 0x62626c, plume: 0xe02020, pauldron: 0x8a2222, glove: 0x2e2e36, bracer: 0x62626c, cape: 0x8a1818, capeLen: 1.0, weapon: 'sword', weaponColor: 0xe8e8f0, belt: 0x8a1818, tabard: 0x7a1c1c },
  darian: { height: 1.86, skin: 0xe8d0c0, top: 0x1e1e26, sleeve: 0x1e1e26, bottom: 0x16161a, boots: 0x101012, bootTop: 0x4a2a7a, helmet: 0x24242e, visor: true, wings: true, pauldron: 0x2e2e3a, glove: 0x101012, bracer: 0x2e2e3a, cape: 0x74747e, capeLen: 1.1, weapon: 'bigsword', belt: 0x6a3fa0, tabard: 0x2a2a34, noFace: true },
  // Chapitre 3 (versions construites en code, pour galerie.html)
  nyssa:  { height: 1.66, fem: true, skin: 0xb07a50, hair: 0x1a1a1a, hairStyle: 'short', eye: 0x4a3a2a, mood: 'smile', top: 0x4a3a2a, sleeve: 0xb8a888, bottom: 0x8a7a60, boots: 0x3a2a20, scarf: 0xd03a3a, belt: 0x3a2a1a, weapon: 'sword' },
  borin:  { height: 1.9, wide: 1.2, skin: 0xd8a880, hair: 0x8a8a8a, hairStyle: 'short', beard: 0x8a8a8a, mood: 'angry', top: 0x2a4aa8, sleeve: 0x2a4aa8, bottom: 0x1a2a5a, boots: 0x5a3a22, pauldron: 0xa4adb8, cape: 0x1e3f8f, capeLen: 0.7, weapon: 'club', shield: 0x1e3f8f, belt: 0x5a3a22 },
  roi:    { height: 1.8, skin: 0xe0b090, hair: 0x4a3a2a, hairStyle: 'short', beard: 0x4a3a2a, top: 0xf0ece0, sleeve: 0xf0ece0, bottom: 0x3a2a2a, cape: 0xe6dfcc, capeLen: 0.8, hat: 0xe0b840, belt: 0xd8b040 },
  alinor: { height: 1.66, fem: true, skin: 0xf0c8a8, hair: 0x3a2a1a, hairStyle: 'bun', mood: 'kind', top: 0x3a6ad0, sleeve: 0x3a6ad0, robe: 0x3a6ad0, bottom: 0x2a2a3a, collar: 0xe0b040 },
  aldric: { height: 1.74, skin: 0xe8c4a8, hair: 0xe8e8e8, hairStyle: 'long', beard: 0xe8e8e8, mood: 'kind', top: 0x8a8aa0, sleeve: 0x8a8aa0, robe: 0x8a8aa0, bottom: 0x3a3a4a, cape: 0x6a6a80, capeLen: 0.7, weapon: 'staff' },
  renaud: { height: 1.8, skin: 0xe0b090, hair: 0x2a2a2a, beard: 0x2a2a2a, top: 0x2a5ad0, sleeve: 0x2a5ad0, bottom: 0x1a2a6a, boots: 0x5a3a22, pauldron: 0xa4adb8, weapon: 'sword', shield: 0x1e3f8f },
  garde:  { height: 1.8, skin: 0xe0b090, mood: 'neutral', top: 0x9ba4ae, sleeve: 0x7a838c, bottom: 0x3a4a6a, boots: 0x2a2a2e, helmet: 0xa4adb8, plume: 0x1e3f8f, pauldron: 0xa4adb8, tabard: 0x1e3f8f, glove: 0x5a5a5a, weapon: 'sword', shield: 0x1e3f8f, belt: 0x5a3a22 },
  berthe: { height: 1.62, fem: true, wide: 1.15, belly: 1.3, skin: 0xf0c0a0, hair: 0xa04a2a, hairStyle: 'bun', mood: 'kind', blush: true, top: 0x8a5a3a, sleeve: 0xe8e0d0, robe: 0x6a4a3a, bottom: 0x6a4a3a, apron: 0xf0e8d8, belt: false },
  colporteur: { height: 1.7, skin: 0xd9a070, hair: 0x2a2a2a, hairStyle: 'short', beard: 0x2a2a2a, mood: 'kind', top: 0x9a6a2a, sleeve: 0xc0a060, bottom: 0x4a3a2a, hat: 0x6a4a2a, scarf: 0xb03a3a },
  anselme:{ height: 1.68, skin: 0xe0b898, hair: 0xd8d8d0, beard: 0xe0e0d8, beardLen: 0.42, brow: 0xc8c8c0, mood: 'kind', top: 0x6a5a3a, sleeve: 0x6a5a3a, robe: 0x6a5a3a, bottom: 0x6a5a3a, hood: 0x5a4a2e, belt: 0x8a7a4a, weapon: 'cane', hunch: true },
  gobelin:{ height: 1.08, headScale: 1.35, eyeSize: 1.2, nose: 2.0, skin: 0x74aa4c, hair: 0x2a3a1a, brow: 0x2a3a1a, eye: 0xffd020, mood: 'angry', ears: true, tusks: true, top: 0x7a5a36, bottom: 0x5a4026, boots: 0x5c8a3c, armW: 1.15, weapon: 'club', belt: 0x3a2a1a, hunch: true },
  troll:  { height: 3.1, wide: 1.55, belly: 1.6, armW: 1.7, headScale: 0.95, nose: 2.2, skin: 0x7c9068, hair: 0x3a4a2a, brow: 0x3a4a2a, eye: 0xff5a20, mood: 'angry', ears: true, tusks: true, top: 0x7c9068, bottom: 0x5a4a36, boots: 0x6c8058, weapon: 'club', weaponColor: 0x5a4026, belt: 0x4a3a26, hunch: true },
};

export function makeChar(key, over = {}) {
  // Si les modèles importés sont chargés, on les utilise ; sinon on garde les personnages construits en code.
  if (packReady() && !over.classic && HEROES3D[key]) return makeImported(key, over);
  const o = Object.assign({}, CHARS[key] || CHARS.villageois1, over);
  const g = humanoid(o);
  g.userData.key = key;
  if (key === 'troll') { const w = g.userData.P.weapon; if (w) w.scale.multiplyScalar(1.7); }
  return g;
}

// ============================================================
//  CRÉATURES
// ============================================================
// Squelette d'une créature. Chaque ligne : [nom de l'os, os parent, x, y, z du pivot, pièces, options].
// Les pièces sont dessinées par rapport au pivot de leur os ({ abs: true } : par rapport au sol) ; chacune suit son os seul (poids 1).
function rigCreature(g, defs, clips) {
  const bones = [], items = [], B = {};
  for (const [name, parent, x, y, z, list, o = {}] of defs) {
    const b = new THREE.Bone(); b.name = name; b.userData.bind = new THREE.Vector3(x, y, z); b.userData.index = bones.length;
    const pb = parent ? B[parent].userData.bind : ZERO; b.position.set(x - pb.x, y - pb.y, z - pb.z); b.userData.rest = b.position.clone();
    if (parent) B[parent].add(b); bones.push(b); B[name] = b;
    for (const p of list || []) if (p) { if (o.abs) p.position.sub(b.userData.bind); items.push({ p, b, o }); }
  }
  const root = bones[0], geo = buildGeometry(items, 1, true);
  g.add(root); root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  const mesh = new THREE.SkinnedMesh(geo, TOON); mesh.name = 'Corps'; mesh.frustumCulled = false; g.add(mesh); mesh.bind(skeleton);
  const outline = new THREE.SkinnedMesh(geo, OUTLINE); outline.name = 'Contour'; outline.frustumCulled = false; outline.userData.outline = true; g.add(outline); outline.bind(skeleton, mesh.bindMatrix);
  const u = g.userData; u.P = Object.assign({ body: root }, B); u.k = 1; u.clips = clips; u.creature = true;
  u.rig = { mesh, outline, skeleton, bones, root, pieces: items.length };
  return u.P;
}
const hit = (t, d) => curve(t, [[0, 0], [0.1, 1], [0.25, 0.7], [d, 0]]);          // sursaut d'un coup reçu
const fall = (t, d) => curve(t, [[0, 0], [0.25, 0.12], [0.7, 1], [d, 1]]);        // chute du K.-O.

// ----- Loup -----
function wolfWalk(P, ph, m) {
  const s = Math.sin(ph) * 0.65 * m;                         // trot : les pattes en diagonale bougent ensemble
  P.LegFR.rotation.x = s; P.LegBL.rotation.x = s; P.LegFL.rotation.x = -s; P.LegBR.rotation.x = -s;
  P.Body.position.y = P.Body.userData.rest.y + Math.abs(Math.cos(ph)) * 0.05 * m;
  P.Body.rotation.x = Math.sin(ph * 2) * 0.04 * m; P.Tail.rotation.x = -0.2 * m;
}
const WOLF_CLIPS = {
  Repos: { label: 'Repos', dur: 2, loop: true, pose(P, u, t) {
    const b = Math.sin(TAU * t / 2);
    P.Body.position.y += b * 0.008; P.Head.rotation.x = b * 0.04; P.Head.rotation.y = b * 0.14; P.Tail.rotation.y = Math.sin(TAU * t) * 0.35;
  } },
  Marche: { label: 'Marche', dur: TAU / 14, loop: true, pose(P, u, t) { const ph = TAU * t / this.dur; wolfWalk(P, ph, 1); P.Tail.rotation.y = Math.sin(ph) * 0.3; P.Head.rotation.x = Math.sin(ph * 2) * 0.05; } },
  Attaque: { label: 'Attaque', dur: 0.8, loop: false, pose(P, u, t) {                      // se ramasse, bondit, mord
    P.body.position.z = curve(t, [[0, 0], [0.25, -0.18], [0.42, 0.7], [0.55, 0.6], [0.8, 0]]);
    P.Body.position.y += curve(t, [[0, 0], [0.25, -0.08], [0.42, 0.16], [0.8, 0]]);
    P.Body.rotation.x = curve(t, [[0, 0], [0.25, 0.14], [0.42, -0.3], [0.8, 0]]);
    P.Head.rotation.x = curve(t, [[0, 0], [0.25, -0.35], [0.47, 0.55], [0.8, 0]]);
    P.LegFL.rotation.x = P.LegFR.rotation.x = curve(t, [[0, 0], [0.25, 0.2], [0.42, -0.9], [0.8, 0]]);
    P.LegBL.rotation.x = P.LegBR.rotation.x = curve(t, [[0, 0], [0.25, -0.3], [0.42, 0.8], [0.8, 0]]);
    P.Tail.rotation.x = curve(t, [[0, 0], [0.42, 0.45], [0.8, 0]]);
  } },
  Touche: { label: 'Touché', dur: 0.5, loop: false, pose(P, u, t) {
    const k = hit(t, 0.5);
    P.body.position.z = -0.2 * k; P.Body.rotation.x = -0.18 * k; P.Body.rotation.z = 0.1 * k; P.Head.rotation.x = -0.3 * k; P.Tail.rotation.x = -0.5 * k;
    P.LegFL.rotation.x = P.LegFR.rotation.x = -0.3 * k;
  } },
  KO: { label: 'K.-O.', dur: 1.2, loop: false, pose(P, u, t) {                             // tombe sur le flanc
    const k = fall(t, 1.2);
    P.Body.rotation.z = 1.45 * k; P.Body.position.y -= 0.4 * k; P.Head.rotation.x = 0.3 * k; P.Tail.rotation.x = -0.4 * k;
    P.LegFL.rotation.x = -0.35 * k; P.LegFR.rotation.x = -0.2 * k; P.LegBL.rotation.x = 0.35 * k; P.LegBR.rotation.x = 0.2 * k;
  } },
};
export function makeWolf(pal = [0x858a94, 0x5c606a, 0xc8ccd2], taille = 1) {
  const g = new THREE.Group();
  const [fur, dark, light] = pal;
  const leg = () => [cap(0.065, 0.14, fur, 0, -0.1, 0), cap(0.048, 0.18, dark, 0, -0.32, 0.0), ball(0.13, 0.09, 0.17, dark, 0, -0.455, 0.03)];
  const P = rigCreature(g, [
    ['Root', null, 0, 0, 0],
    ['Body', 'Root', 0, 0.62, 0, [
      rot(cap(0.2, 0.56, fur, 0, 0.62, -0.02), PI / 2, 0, 0),              // corps
      ball(0.46, 0.44, 0.5, fur, 0, 0.66, 0.3),                             // poitrail
      ball(0.3, 0.3, 0.6, light, 0, 0.5, 0.05),                             // ventre clair
      ball(0.3, 0.2, 0.3, dark, 0, 0.8, -0.05),                             // échine
    ], { abs: true }],
    ['Head', 'Body', 0, 0.76, 0.46, [
      rot(cap(0.13, 0.2, fur, 0, 0.8, 0.5), 0.9, 0, 0),                     // cou
      ball(0.34, 0.3, 0.36, fur, 0, 0.9, 0.64),                             // tête
      rot(spike(0.105, 0.3, dark, 0, 0.85, 0.9), PI / 2, 0, 0),             // museau
      ball(0.2, 0.12, 0.2, light, 0, 0.8, 0.8),
      ball(0.07, 0.06, 0.07, 0x18120e, 0, 0.87, 1.04),                      // truffe
      rot(spike(0.065, 0.18, dark, -0.11, 1.08, 0.58), -0.15, 0, 0.25), rot(spike(0.065, 0.18, dark, 0.11, 1.08, 0.58), -0.15, 0, -0.25),
      ball(0.07, 0.06, 0.04, 0xffd640, -0.09, 0.95, 0.795), ball(0.07, 0.06, 0.04, 0xffd640, 0.09, 0.95, 0.795),
      ball(0.03, 0.045, 0.03, 0x140c08, -0.09, 0.95, 0.812), ball(0.03, 0.045, 0.03, 0x140c08, 0.09, 0.95, 0.812),
      rot(bx(0.09, 0.02, 0.03, dark, -0.09, 0.995, 0.79), 0, 0, -0.45), rot(bx(0.09, 0.02, 0.03, dark, 0.09, 0.995, 0.79), 0, 0, 0.45),
    ], { abs: true }],
    ['Tail', 'Body', 0, 0.7, -0.5, [rot(cap(0.07, 0.34, dark, 0, -0.04, -0.2), 1.1, 0, 0), ball(0.14, 0.14, 0.2, light, 0, -0.14, -0.4)]],
    ['LegFL', 'Body', 0.14, 0.5, 0.36, leg()], ['LegFR', 'Body', -0.14, 0.5, 0.36, leg()],
    ['LegBL', 'Body', 0.14, 0.5, -0.36, leg()], ['LegBR', 'Body', -0.14, 0.5, -0.36, leg()],
  ], WOLF_CLIPS);
  g.add(blob(0.5));
  const u = g.userData; u.walkT = Math.random() * 6; u.height = 1.15; u.move = 0;
  u.anim = (dt, moving, t) => {
    u.move += ((moving ? 1 : 0) - u.move) * Math.min(1, dt * 9);
    if (moving) u.walkT += dt * 14;
    wolfWalk(P, u.walkT, u.move);
    P.Body.position.y += Math.sin((t || 0) * 3 + u.walkT) * 0.008;
    P.Tail.rotation.y = Math.sin((t || 0) * 5 + u.walkT) * 0.35;
  };
  return g;
}

// ----- Champignon hurleur -----
function mushPose(P, k, hop, wob) {                           // petits bonds : le pied s'écrase, le chapeau balance
  P.body.position.y = Math.abs(Math.sin(k)) * hop;
  P.Body.scale.y = 1 + Math.sin(k * 2) * 0.04; P.Body.scale.x = P.Body.scale.z = 1 - Math.sin(k * 2) * 0.025;
  P.Cap.rotation.x = Math.sin(k * 2 + 0.8) * wob;
}
const MUSH_CLIPS = {
  Repos: { label: 'Repos', dur: TAU / 2.5, loop: true, pose(P, u, t) { mushPose(P, TAU * t / this.dur, 0.03, 0.03); } },
  Marche: { label: 'Marche', dur: TAU / 9, loop: true, pose(P, u, t) { mushPose(P, TAU * t / this.dur, 0.24, 0.09); } },
  Attaque: { label: 'Attaque', dur: 0.9, loop: false, pose(P, u, t) {                      // s'écrase, puis coup de chapeau
    const sy = curve(t, [[0, 1], [0.28, 0.72], [0.42, 1.15], [0.6, 1], [0.9, 1]]);
    P.Body.scale.y = sy; P.Body.scale.x = P.Body.scale.z = 1 + (1 - sy) * 0.5;
    P.body.position.z = curve(t, [[0, 0], [0.28, -0.1], [0.45, 0.65], [0.6, 0.55], [0.9, 0]]);
    P.body.position.y = curve(t, [[0, 0], [0.28, 0], [0.42, 0.3], [0.6, 0], [0.9, 0]]);
    P.Body.rotation.x = curve(t, [[0, 0], [0.28, -0.2], [0.45, 0.55], [0.9, 0]]); P.Cap.rotation.x = curve(t, [[0, 0], [0.28, -0.15], [0.45, 0.25], [0.9, 0]]);
  } },
  Touche: { label: 'Touché', dur: 0.5, loop: false, pose(P, u, t) {
    const k = hit(t, 0.5);
    P.body.position.z = -0.15 * k; P.Body.rotation.x = -0.3 * k; P.Body.scale.y = 1 - 0.15 * k; P.Body.scale.x = P.Body.scale.z = 1 + 0.08 * k; P.Cap.rotation.x = -0.25 * k;
  } },
  KO: { label: 'K.-O.', dur: 1.2, loop: false, pose(P, u, t) {                             // se dégonfle, le chapeau de travers
    const k = fall(t, 1.2), j = curve(t, [[0, 0], [0.3, 1], [0.7, 0], [1.2, 0]]);
    P.Body.scale.y = 1 - 0.55 * k + 0.1 * j; P.Body.scale.x = P.Body.scale.z = 1 + 0.22 * k; P.Cap.rotation.z = 0.35 * k; P.Cap.rotation.x = 0.2 * k;
  } },
};
export function makeMushroom() {
  const g = new THREE.Group();
  const capC = 0x4a6ad8, stem = 0xf4ecd8;
  const top = [
    lathe([[0.001, 0.62], [0.5, 0.62], [0.68, 0.68], [0.7, 0.8], [0.56, 1.02], [0.3, 1.16], [0.001, 1.2]], capC),
    lathe([[0.3, 0.6], [0.62, 0.66], [0.3, 0.7]], shade(stem, 0.85)),
  ];
  for (const [a, r, y, d] of [[0.6, 0.6, 0.95, 0.22], [2.3, 0.6, 0.95, 0.24], [3.6, 0.6, 0.95, 0.2], [5.0, 0.6, 0.95, 0.22], [1.4, 0.4, 1.1, 0.2], [4.2, 0.4, 1.1, 0.18], [-0.4, 0.4, 1.1, 0.16], [0, 0.12, 1.18, 0.16], [1.5, 0.66, 0.85, 0.14], [-0.3, 0.66, 0.85, 0.15]]) top.push(ball(d, d * 0.5, d, 0xe8f4ff, Math.sin(a) * r, y, Math.cos(a) * r));
  const P = rigCreature(g, [
    ['Root', null, 0, 0, 0],
    ['Body', 'Root', 0, 0, 0, [
      lathe([[0.001, 0], [0.3, 0.02], [0.34, 0.2], [0.27, 0.5], [0.25, 0.72], [0.001, 0.74]], stem),
      ball(0.16, 0.2, 0.06, 0xffffff, -0.13, 0.46, 0.25), ball(0.16, 0.2, 0.06, 0xffffff, 0.13, 0.46, 0.25),
      ball(0.08, 0.1, 0.04, 0x140c08, -0.12, 0.45, 0.275), ball(0.08, 0.1, 0.04, 0x140c08, 0.12, 0.45, 0.275),
      rot(bx(0.2, 0.035, 0.03, 0x3a2a40, -0.13, 0.585, 0.25), 0, 0, -0.45), rot(bx(0.2, 0.035, 0.03, 0x3a2a40, 0.13, 0.585, 0.25), 0, 0, 0.45),
      ball(0.2, 0.16, 0.08, 0x4a1420, 0, 0.26, 0.3),
      ball(0.2, 0.12, 0.26, shade(stem, 0.8), -0.16, 0.05, 0.08), ball(0.2, 0.12, 0.26, shade(stem, 0.8), 0.16, 0.05, 0.08),
    ], { big: true }],
    ['Cap', 'Body', 0, 0.66, 0, top, { abs: true, big: true }],
  ], MUSH_CLIPS);
  g.add(blob(0.55));
  const u = g.userData; u.height = 1.35; u.walkT = Math.random() * 6;
  u.anim = (dt, moving, t) => { mushPose(P, (t || 0) * (moving ? 9 : 2.5) + u.walkT, moving ? 0.24 : 0.03, moving ? 0.09 : 0.03); };
  return g;
}

// ----- Luciole de braise -----
function flyPose(P, bob, tilt, flap, amp = 1) {
  P.Body.position.y = P.Body.userData.rest.y + bob; P.Body.rotation.z = tilt;
  P.WingR.rotation.z = Math.sin(flap) * 0.7 * amp; P.WingL.rotation.z = -Math.sin(flap) * 0.7 * amp;
}
const FLY_CLIPS = {
  Repos: { label: 'Repos', dur: 2, loop: true, pose(P, u, t) { flyPose(P, Math.sin(TAU * t) * 0.15, Math.sin(TAU * t / 2) * 0.12, TAU * t * 7); } },
  Marche: { label: 'Vol', dur: 1, loop: true, pose(P, u, t) { flyPose(P, Math.sin(TAU * t * 2) * 0.08, Math.sin(TAU * t) * 0.08, TAU * t * 8); P.Body.rotation.x = 0.3; } },
  Attaque: { label: 'Attaque', dur: 0.8, loop: false, pose(P, u, t) {                      // prend de la hauteur puis pique
    flyPose(P, curve(t, [[0, 0], [0.25, 0.22], [0.42, -0.38], [0.8, 0]]), 0, TAU * t * 7.5);
    P.body.position.z = curve(t, [[0, 0], [0.25, -0.25], [0.42, 0.8], [0.55, 0.7], [0.8, 0]]);
    P.Body.rotation.x = curve(t, [[0, 0], [0.25, -0.3], [0.42, 0.7], [0.8, 0]]);
  } },
  Touche: { label: 'Touché', dur: 0.5, loop: false, pose(P, u, t) {
    const k = hit(t, 0.5); flyPose(P, 0.1 * k, 0.6 * k, TAU * t * 8);
    P.body.position.z = -0.25 * k; P.Body.rotation.x = -0.4 * k;
  } },
  KO: { label: 'K.-O.', dur: 1.3, loop: false, pose(P, u, t) {                             // tombe en vrille, les ailes s'arrêtent
    const k = fall(t, 1.3); flyPose(P, -1.0 * k, 2.6 * k, TAU * t * 7, 1 - k);
  } },
};
export function makeFirefly() {
  const g = new THREE.Group();
  const P = rigCreature(g, [
    ['Root', null, 0, 0, 0],
    ['Body', 'Root', 0, 1.2, 0, [
      ball(0.3, 0.28, 0.3, 0x3a2418, 0, 0.06, 0.24),                          // tête
      ball(0.26, 0.24, 0.3, 0x4a2c1a, 0, 0.02, 0.02),                         // thorax
      ball(0.1, 0.12, 0.05, 0xffffff, -0.08, 0.1, 0.36), ball(0.1, 0.12, 0.05, 0xffffff, 0.08, 0.1, 0.36),
      ball(0.05, 0.06, 0.03, 0x140c08, -0.08, 0.1, 0.385), ball(0.05, 0.06, 0.03, 0x140c08, 0.08, 0.1, 0.385),
      rot(cap(0.008, 0.16, 0x3a2418, -0.07, 0.26, 0.3), 0.5, 0, 0.3), rot(cap(0.008, 0.16, 0x3a2418, 0.07, 0.26, 0.3), 0.5, 0, -0.3),
      ball(0.035, 0.035, 0.035, 0xffb040, -0.105, 0.33, 0.345), ball(0.035, 0.035, 0.035, 0xffb040, 0.105, 0.33, 0.345),
      ...[-1, 1].flatMap(s => [0.14, 0.02, -0.08].map(z => rot(cap(0.01, 0.14, 0x2a180e, 0.13 * s, -0.12, z), 0, 0, 0.6 * s))),
    ]],
    ['WingL', 'Body', 0.06, 1.34, -0.02], ['WingR', 'Body', -0.06, 1.34, -0.02],
  ], FLY_CLIPS);
  // L'abdomen de braise, le halo et les ailes sont des objets lumineux accrochés aux os (comme une arme dans une main)
  const ember = glow(0xffa030, 0.4, 0.38, 0.5, 0, 0, -0.26); ember.name = 'Braise'; P.Body.add(ember);
  const core = glow(0xffe090, 0.22, 0.2, 0.3, 0, 0.02, -0.28); core.name = 'Coeur'; P.Body.add(core);
  const halo = glow(0xff9030, 0.9, 0.9, 0.9, 0, 0, -0.25, 0.12); halo.name = 'Halo'; P.Body.add(halo);
  for (const [b, s] of [[P.WingL, 1], [P.WingR, -1]]) { const m = glow(0xfff4d0, 0.56, 0.02, 0.22, 0.3 * s, 0, -0.06, 0.55); m.name = 'Aile'; b.add(m); }
  g.add(blob(0.3));
  const u = g.userData; u.height = 1.75; u.walkT = Math.random() * 6;
  u.anim = (dt, moving, t) => { const k = (t || 0) + u.walkT; flyPose(P, Math.sin(k * 3) * 0.15, Math.sin(k * 2.1) * 0.12, k * 42); halo.scale.setScalar(0.9 + Math.sin(k * 6) * 0.12); };
  return g;
}

// ----- Cheval -----
const HORSE_CLIPS = {
  Repos: { label: 'Repos', dur: 4, loop: true, pose(P, u, t) {
    const b = Math.sin(TAU * t / 4);
    P.Neck.rotation.x = 0.05 + b * 0.07; P.Tail.rotation.z = Math.sin(TAU * t / 2) * 0.22; P.Body.position.y += Math.sin(TAU * t / 2) * 0.006;
  } },
  Marche: { label: 'Marche', dur: 1, loop: true, pose(P, u, t) {
    const ph = TAU * t, s = Math.sin(ph) * 0.42;
    P.LegFR.rotation.x = s; P.LegBL.rotation.x = s; P.LegFL.rotation.x = -s; P.LegBR.rotation.x = -s;
    P.Body.position.y += Math.abs(Math.cos(ph)) * 0.035; P.Neck.rotation.x = 0.05 + Math.sin(ph * 2) * 0.06; P.Tail.rotation.z = Math.sin(ph) * 0.18;
  } },
};
export function makeHorse(color = 0x1a1a1e) {
  if (estMonstre('cheval')) return makeMonstre(color === 0x1a1a1e ? 'cheval_noir' : 'cheval');
  if (color === 0x1a1a1e) color = 0x2a2a32;
  const g = new THREE.Group(), d = shade(color, 0.6), mane = shade(color, 0.45);
  const rug = rot(lathe([[0.345, 0], [0.352, 0.05], [0.352, 0.5], [0.345, 0.55]], 0x6e6e78, 1, 1.02, -1.5, 3.0), PI / 2, 0, 0); rug.position.set(0, 1.28, -0.27);
  const leg = (x, z) => [cap(0.09, 0.4, color, x, 0.82, z), cap(0.06, 0.36, color, x, 0.36, z), ball(0.17, 0.14, 0.2, d, x, 0.07, z + 0.02)];
  const o = { abs: true, big: true };
  const P = rigCreature(g, [
    ['Root', null, 0, 0, 0],
    ['Body', 'Root', 0, 1.28, 0, [
      rot(cap(0.33, 0.95, color, 0, 1.28, 0), PI / 2, 0, 0),
      ball(0.7, 0.72, 0.8, color, 0, 1.3, 0.48), ball(0.68, 0.7, 0.76, color, 0, 1.3, -0.5),
      ball(0.5, 0.14, 0.6, 0x3a2418, 0, 1.63, 0.0), rug,
    ], o],
    ['Neck', 'Body', 0, 1.5, 0.66, [
      rot(cap(0.17, 0.62, color, 0, 1.78, 0.86), 0.62, 0, 0),
      rot(cap(0.15, 0.34, color, 0, 2.14, 1.3), PI / 2 + 0.35, 0, 0),
      ball(0.25, 0.22, 0.26, d, 0, 2.05, 1.52),
      rot(spike(0.05, 0.16, color, -0.09, 2.38, 1.08), -0.2, 0, 0.2), rot(spike(0.05, 0.16, color, 0.09, 2.38, 1.08), -0.2, 0, -0.2),
      ball(0.06, 0.07, 0.04, 0x140c08, -0.13, 2.2, 1.3), ball(0.06, 0.07, 0.04, 0x140c08, 0.13, 2.2, 1.3),
      rot(ball(0.1, 0.8, 0.26, mane, 0, 1.92, 0.72), 0.62, 0, 0),
    ], o],
    ['Tail', 'Body', 0, 1.38, -0.9, [rot(cap(0.07, 0.6, mane, 0, 1.1, -0.99), -0.3, 0, 0)], o],
    ['LegFL', 'Body', 0.2, 1.0, 0.6, leg(0.2, 0.6), o], ['LegFR', 'Body', -0.2, 1.0, 0.6, leg(-0.2, 0.6), o],
    ['LegBL', 'Body', 0.2, 1.0, -0.62, leg(0.2, -0.62), o], ['LegBR', 'Body', -0.2, 1.0, -0.62, leg(-0.2, -0.62), o],
  ], HORSE_CLIPS);
  g.add(blob(0.9));
  const u = g.userData; u.height = 2.4; u.seed = Math.random() * 6;
  u.anim = (dt, moving, t) => { const k = (t || 0) + u.seed; P.Neck.rotation.x = 0.05 + Math.sin(k * 0.8) * 0.07; P.Tail.rotation.z = Math.sin(k * 1.6) * 0.22; };
  return g;
}

const grandir = (o, k) => { o.scale.multiplyScalar(k); if (o.userData.height) o.userData.height *= k; return o; };
export function makeEnemyModel(key) {
  if (estMonstre(key)) return makeMonstre(key);                // modèle téléchargé (monstres.js) quand il existe
  switch (key) {
    case 'loup': return makeWolf();
    case 'loup_neige': return grandir(makeWolf([0xe8eef4, 0xb8c4d0, 0xffffff]), 1.15);
    case 'molosse': return grandir(makeWolf([0x3a3230, 0x1e1a1a, 0x6a5a50]), 1.25);
    case 'taraude': return makeTaraude(1);
    case 'automate': return makeTaraude(0.36, true);
    case 'tortue': return makeTortue();
    case 'belier': return makeBelier();
    case 'champignon': return makeMushroom();
    case 'luciole': return makeFirefly();
    case 'rat': return makeRat();
    case 'gelee': return makeJelly();
    case 'chauve_souris': return makeBat();
    case 'roi_egouts': return makeSewerKing();
    case 'golem': return makeGolem();
    default: return makeChar(key);
  }
}
