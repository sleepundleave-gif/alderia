// ============================================================
//  COMBAT AU TOUR PAR TOUR (style Dragon Quest / Pokémon)
//  1. le joueur choisit une action par héros
//  2. tout le monde agit dans l'ordre de la Vitesse
// ============================================================
import { versUI } from './ecran.js';
import * as THREE from '../lib/three.module.min.js';
import { E } from './engine.js';
import { envFor } from './pack.js';
import { wallMat, piece } from './decor.js';
import { G, heroStats, knownSkills, gainXP, removeItem, addItem } from './state.js';
import { HEROES, SKILLS, ITEMS, ENEMIES, elemMult, ELEM_COLOR, STATUS_LABEL } from './data.js';
import { $, sleep, pick, bar, showHud, updateGold } from './ui.js';
import { makeChar, makeEnemyModel, makeMarker, sph, cone, disc, box, makeTree, makeRock, makeFire, makeHouse, makeGlowShroom, makeCart, makeBush, makeMountain } from './models.js';
import { sfx, music } from './audio.js';
import { Effets } from './effets.js';
import { sortFx, attaqueFx, coupFx, fioleFx, larcinFx, provocationFx, dechirureFx } from './sorts.js';

export const BattleCfg = { auto: false, speed: 1 };   // auto : combat joué tout seul (tests)

const ARENAS = {
  foret:   { sky: 0x9fd4ff, ground: 0x5fa04a, inner: 0x76b85a, hemi: [0xffffff, 0x5a8a4a, 1.05], sun: 0xfff1d0, decor: 'trees' },
  village_feu: { sky: 0x4a1a12, ground: 0x5a4636, inner: 0x7a6250, hemi: [0xffb890, 0x5a2a18, 1.2], sun: 0xff8a50, decor: 'fire' },
  murmures: { sky: 0x2a4a4a, ground: 0x2f5a3a, inner: 0x3f7048, hemi: [0xbfe8e0, 0x2a4a3a, 0.95], sun: 0xd8f0e0, decor: 'deep' },
  berge:   { sky: 0xa8c8d8, ground: 0x8a9a7a, inner: 0xa8b090, hemi: [0xffffff, 0x6a8a7a, 1.0], sun: 0xfff1d0, decor: 'river' },
  egouts:  { sky: 0x0e1612, ground: 0x5c625e, inner: 0x6e7470, hemi: [0x9ac8a8, 0x1a2a20, 0.95], sun: 0xb8e0c0, decor: 'sewer' },
  citerne: { sky: 0x0a120e, ground: 0x565c58, inner: 0x686e6a, hemi: [0xa0d0b0, 0x1a2a20, 1.0], sun: 0xc0e8c8, decor: 'sewer', big: true },
  toits:   { sky: 0xa8d0f0, ground: 0xb8b4ac, inner: 0xc8c4bc, hemi: [0xffffff, 0x6a7a9a, 1.05], sun: 0xfff1d0, decor: 'roofs' },
  collines: { sky: 0xb4d6f2, ground: 0x9a9670, inner: 0xb4ae8a, hemi: [0xffffff, 0x8a8468, 1.05], sun: 0xfff1d0, decor: 'rocks' },
  sanctuaire: { sky: 0x14110e, ground: 0x6e6452, inner: 0x857a64, hemi: [0xffe8c0, 0x3a3024, 1.0], sun: 0xffd8a0, decor: 'temple' },
  gardien: { sky: 0x100e0c, ground: 0x665c4c, inner: 0x7e7460, hemi: [0xffe8c0, 0x3a3024, 1.05], sun: 0xffd8a0, decor: 'temple', big: true },
  // --- chapitres 5 à 10 ---
  neige:   { sky: 0xc8d8e8, ground: 0xe8eef4, inner: 0xf4f8fc, hemi: [0xffffff, 0xa8b8c8, 1.1], sun: 0xf0f4ff, decor: 'rocks' },
  mine:    { sky: 0x120e0c, ground: 0x4e4640, inner: 0x625850, hemi: [0xffc890, 0x2a2018, 1.05], sun: 0xffb070, decor: 'temple' },
  foreuse: { sky: 0x140e0a, ground: 0x4a423c, inner: 0x5e544c, hemi: [0xffc890, 0x2a2018, 1.1], sun: 0xffb070, decor: 'temple', big: true },
  volcan:  { sky: 0x2a0c08, ground: 0x3a2a26, inner: 0x54382e, hemi: [0xffa070, 0x4a1408, 1.2], sun: 0xff8a50, decor: 'rocks' },
  autel_feu: { sky: 0x2a0c08, ground: 0x40282a, inner: 0x5c3a30, hemi: [0xffa070, 0x4a1408, 1.25], sun: 0xff8a50, decor: 'temple', big: true },
  port:    { sky: 0x9fd0f0, ground: 0xb8a888, inner: 0xcfc0a0, hemi: [0xffffff, 0x7a8a9a, 1.05], sun: 0xfff1d0, decor: 'river' },
  entrepot: { sky: 0x0e1018, ground: 0x4a4238, inner: 0x5e5446, hemi: [0xb0c0e8, 0x1a1a24, 0.95], sun: 0xc0d0f0, decor: 'temple' },
  navire:  { sky: 0x0c1428, ground: 0x6a5238, inner: 0x86683f, hemi: [0xa8c0f0, 0x1a2238, 1.0], sun: 0xc8d8ff, decor: 'bridge' },
  temple_eau: { sky: 0x082030, ground: 0x3a6470, inner: 0x4e7c88, hemi: [0xa8e8f0, 0x103040, 1.1], sun: 0xb0f0ff, decor: 'temple' },
  abysse:  { sky: 0x061826, ground: 0x30586a, inner: 0x447482, hemi: [0xa8e8f0, 0x103040, 1.15], sun: 0xb0f0ff, decor: 'temple', big: true },
  remparts: { sky: 0x101626, ground: 0x8a8a90, inner: 0xa0a0a6, hemi: [0xb8c8f0, 0x2a2420, 1.0], sun: 0xc8d4ff, decor: 'roofs' },
  siege:   { sky: 0x1c1010, ground: 0x4a4034, inner: 0x625444, hemi: [0xffb890, 0x3a2018, 1.15], sun: 0xff9a60, decor: 'fire', big: true },
  cite_feu: { sky: 0x3a1410, ground: 0x8a8078, inner: 0xa09488, hemi: [0xffb890, 0x5a2a18, 1.2], sun: 0xff8a50, decor: 'fire' },
  trone:   { sky: 0x181420, ground: 0xb8b0a8, inner: 0xd0c8c0, hemi: [0xfff0e0, 0x3a3440, 1.1], sun: 0xffe8d0, decor: 'temple', big: true },
  pont:    { sky: 0x4a6a6a, ground: 0x4a5a3a, inner: 0x6a7050, hemi: [0xd8f0e0, 0x3a4a3a, 0.95], sun: 0xe8f0d8, decor: 'bridge' },
};

let B = null;                 // combat en cours
const cam = new THREE.PerspectiveCamera(52, 1, 0.1, 300);
let camReg = false;

// Attente. Pendant un combat, elle suit l'horloge des images (comme les animations) : sur un appareil lent,
// les pauses et les effets restent ainsi parfaitement ensemble.
const S = (ms) => (B && E.view === battleView ? tween(ms, null) : sleep(Math.max(1, ms / BattleCfg.speed)));

// ---------- Décor de l'arène ----------
function buildArena(type) {
  const a = ARENAS[type] || ARENAS.foret;
  const scene = new THREE.Scene(), anims = [];
  scene.background = new THREE.Color(a.sky);
  scene.fog = new THREE.Fog(a.sky, 26, 75);
  scene.add(new THREE.HemisphereLight(a.hemi[0], a.hemi[1], a.hemi[2]));
  const sun = new THREE.DirectionalLight(a.sun, 1.1); sun.position.set(-8, 20, 14); scene.add(sun);
  scene.environment = envFor(E.renderer, a.sky, a.hemi[1], 1);
  scene.add(disc(60, a.ground, 0, 0, 0));
  scene.add(disc(8.5, a.inner, 0, 0.02, 0));
  const put = (o, x, z, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; scene.add(o); if (o.userData.anim) anims.push(o); return o; };
  const rnd = (a0, b0) => a0 + Math.random() * (b0 - a0);
  if (a.decor === 'trees') {
    for (let i = 0; i < 22; i++) { const ang = rnd(Math.PI * 0.95, Math.PI * 2.05), r = rnd(13, 26); put(makeTree(i % 3 ? 'birch' : 'round', rnd(0.9, 1.4)), Math.cos(ang) * r, Math.sin(ang) * r); }
    for (let i = 0; i < 6; i++) put(makeBush(rnd(0.8, 1.3)), rnd(-12, 12), rnd(-12, -9));
    put(makeRock(1.2), -9, -6); put(makeRock(0.8), 10, -7);
  } else if (a.decor === 'fire') {
    for (const [x, z, ry] of [[-9, -12, 0], [1, -15, 0], [11, -12, 0], [-17, -5, 1.57], [18, -6, -1.57]]) {
      put(makeHouse(6, 5, 3.2, 0x5a4a40, 0x3a2a20, { door: 0x1a1210 }), x, z, ry);
      const f = makeFire(2.6, false); f.position.set(x, 3.4, z); scene.add(f); anims.push(f);
      const f2 = makeFire(1.4, false); f2.position.set(x + 2, 0, z + 3); scene.add(f2); anims.push(f2);
    }
    const pl = new THREE.PointLight(0xff6a2a, 2.2, 60, 1.2); pl.position.set(0, 6, -8); scene.add(pl);
  } else if (a.decor === 'deep') {
    for (let i = 0; i < 16; i++) { const ang = rnd(Math.PI * 0.95, Math.PI * 2.05), r = rnd(13, 24); put(makeTree('big', rnd(0.8, 1.2), 0x1f4a34), Math.cos(ang) * r, Math.sin(ang) * r); }
    for (let i = 0; i < 12; i++) put(makeGlowShroom(rnd(0.8, 1.8)), rnd(-13, 13), rnd(-12, -7.5));
  } else if (a.decor === 'river') {
    scene.add(disc(40, 0x4a8ac0, 0, 0.015, -48));
    for (let i = 0; i < 10; i++) put(makeRock(rnd(0.5, 1.2), 0x9a9a94), rnd(-14, 14), rnd(-12, -8.5));
    for (let i = 0; i < 12; i++) { const ang = rnd(Math.PI * 0.1, Math.PI * 0.9), r = rnd(14, 24); put(makeTree('big', rnd(0.7, 1.1), 0x2a5a3a), Math.cos(ang) * r, Math.sin(ang) * r + 4); }
    for (const x of [-16, 16]) for (let i = 0; i < 4; i++) put(makeTree('round', rnd(1, 1.5)), x + rnd(-3, 3), rnd(-8, 6));
  } else if (a.decor === 'bridge') {
    scene.add(box(80, 0.1, 9, 0x1a2420, 0, 0.03, -15));
    for (const x of [-2.2, 2.2]) { scene.add(box(0.3, 1.6, 0.3, 0x5a3e24, x, 0.8, -10.2)); scene.add(box(0.3, 1.6, 0.3, 0x5a3e24, x, 0.8, -19.8)); }
    scene.add(box(4.4, 0.2, 2.4, 0x7a5a36, 0, 0.3, -11.6));
    put(makeCart(true), -8, -7, 0.6);
    for (let i = 0; i < 14; i++) { const ang = rnd(Math.PI * 1.05, Math.PI * 1.95), r = rnd(23, 30); put(makeTree('big', rnd(0.8, 1.2), 0x1f4a34), Math.cos(ang) * r, Math.sin(ang) * r); }
    for (const x of [-15, 15]) for (let i = 0; i < 3; i++) put(makeTree('big', rnd(0.7, 1), 0x1f4a34), x + rnd(-3, 3), rnd(-6, 6));
  }
  else if (a.decor === 'rocks') {
    // Collines de Granit : blocs de pierre, quelques arbres tordus
    for (let i = 0; i < 16; i++) { const ang = rnd(Math.PI * 0.95, Math.PI * 2.05), r = rnd(12, 26); put(makeRock(rnd(1.2, 3.2)), Math.cos(ang) * r, Math.sin(ang) * r, rnd(0, 6)); }
    for (let i = 0; i < 5; i++) { const ang = rnd(Math.PI * 1.1, Math.PI * 1.9), r = rnd(15, 24); put(makeTree('round', rnd(0.8, 1.1)), Math.cos(ang) * r, Math.sin(ang) * r); }
    for (let i = 0; i < 5; i++) put(makeBush(rnd(0.7, 1.1)), rnd(-12, 12), rnd(-12, -9));
  }
  else if (a.decor === 'temple') {
    // Sanctuaire de la Terre : murs de grès, colonnes, braseros
    const wm = wallMat('mur_blanc', 0xd8b888, 3.2, { gain: 1.25 }) || new THREE.MeshStandardMaterial({ color: 0x8a7458 });
    const R = a.big ? 17 : 12;
    const wall = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wm); m.position.set(x, y, z); scene.add(m); return m; };
    wall(70, 11, 1, 0, 5.5, -R); wall(1, 11, 44, -R - 6, 5.5, 0); wall(1, 11, 44, R + 6, 5.5, 0);
    for (const x of [-R + 2, -R / 2.4, R / 2.4, R - 2]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 11, 12), wm); c.position.set(x, 5.5, -R + 2.2); scene.add(c); }
    for (const x of [-R + 4.5, R - 4.5]) { put(makeFire(0.9), x, -R + 4.4).position.y = 1.15; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.35, 1.1, 10), new THREE.MeshStandardMaterial({ color: 0x4a4038 })); b.position.set(x, 0.55, -R + 4.4); scene.add(b); const l = new THREE.PointLight(0xffa850, 2.2, 30, 1.2); l.position.set(x, 3, -R + 5); scene.add(l); }
  }
  else if (a.decor === 'sewer') {
    // Galerie voûtée : mur de briques au fond, eau verte, torches
    const wm = wallMat('mur_egout', 0xffffff, 3) || new THREE.MeshStandardMaterial({ color: 0x5a4a3a });
    const wall = (w, h, d, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wm); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; };
    const R = a.big ? 17 : 12;
    wall(60, 9, 1, 0, 4.5, -R); wall(1, 9, 40, -R - 6, 4.5, 0); wall(1, 9, 40, R + 6, 4.5, 0);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(60, 5), new THREE.MeshStandardMaterial({ color: 0x3a8a4a, emissive: 0x1a5a2a, emissiveIntensity: 0.6, roughness: 0.15, transparent: true, opacity: 0.85 }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0.04, -R + 3.2); scene.add(water);
    for (const x of a.big ? [-14, -7, 7, 14] : [-9, 0, 9]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 9, 10), wm); col.position.set(x, 4.5, -R + 0.9); scene.add(col);
      const t = piece('Torch_Metal', x, 2.3, -R + 1.7, 0); if (t) scene.add(t);
      const fl = makeFire(0.5, false); fl.position.set(x, 2.75, -R + 1.75); scene.add(fl); anims.push(fl);
      const pl = new THREE.PointLight(0xffa050, 1.4, 16, 1.4); pl.position.set(x, 3.2, -R + 2.4); scene.add(pl);
    }
    for (const [n, x, z, ry] of [['Barrel', -8, -6.5, 0.3], ['Crate_Wooden', 9, -7, 0.5], ['Bucket_Metal', 6.5, -6.2, 0], ['Barrel', 10.5, -5.5, 1]]) { const o = piece(n, x, 0, z, ry); if (o) scene.add(o); }
    scene.fog = new THREE.Fog(a.sky, 18, 48);
  } else if (a.decor === 'roofs') {
    // Sur les toits : ardoises bleues sous les pieds, cheminées et tours au loin
    const rm = wallMat('ardoise', 0x6a86c8, 2.2) || new THREE.MeshStandardMaterial({ color: 0x5a76b8 });
    const fl = new THREE.Mesh(new THREE.BoxGeometry(34, 0.4, 20), rm); fl.position.set(0, -0.15, -2); scene.add(fl);
    const wm = wallMat('mur_blanc', 0xffffff, 3) || new THREE.MeshStandardMaterial({ color: 0xe8e4d8 });
    for (const [x, z, h] of [[-12, -11, 3], [4, -12, 2.2], [13, -10, 3.4]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(1.4, h, 1.4), wm); c.position.set(x, h / 2, z); scene.add(c); }
    for (const [x, z, h, r] of [[-22, -34, 22, 3.4], [20, -40, 28, 4], [-4, -52, 34, 4.4], [34, -28, 16, 3]]) {
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, h, 14), wm); tw.position.set(x, h / 2 - 10, z); scene.add(tw);
      const cn = new THREE.Mesh(new THREE.ConeGeometry(r * 1.25, r * 2.2, 14), rm); cn.position.set(x, h - 10 + r * 1.1, z); scene.add(cn);
    }
  }
  return { scene, anims };
}

// ---------- Combattants ----------
function heroC(h, i, n) {
  const s = heroStats(h);
  const obj = makeChar(h.id); if (obj.userData.draw) obj.userData.draw(true);
  const z = (i - (n - 1) / 2) * (n > 3 ? 1.75 : 2.1);
  obj.position.set(n > 3 ? -3.3 - (i % 2) * 0.9 : -3.6, 0, z); obj.rotation.y = Math.PI / 2;
  return { isHero: true, h, id: h.id, name: HEROES[h.id].name, hp: h.hp, maxHp: s.maxHp, mp: h.mp, maxMp: s.maxMp, atk: s.atk, def: s.def, mag: s.mag, res: s.res, vit: s.vit, cha: s.cha, status: {}, buffs: {}, defending: false, obj, home: obj.position.clone(), height: 1.9 };
}

function enemyC(key, i, n, label) {
  const d = ENEMIES[key];
  const obj = makeEnemyModel(d.model);
  const z = (i - (n - 1) / 2) * 2.4;
  obj.position.set(d.boss ? 3.9 : 3.5 + (i % 2) * 0.5, 0, z); obj.rotation.y = -Math.PI / 2;
  return { isHero: false, key, d, name: label, hp: d.hp, maxHp: d.hp, mp: 0, maxMp: 0, atk: d.atk, def: d.def, mag: d.mag || 0, res: d.res, vit: d.vit, cha: 0, element: d.element, weak: d.weak, resist: d.resist, status: {}, buffs: {}, defending: false, charging: null, obj, home: obj.position.clone(), height: (obj.userData.height || 1.7) + 0.3 };
}

const alive = (list) => list.filter(c => c.hp > 0);

// ---------- Animations ----------
function tween(ms, fn) {
  return new Promise(res => B.tweens.push({ t: 0, dur: Math.max(0.001, ms / 1000 / BattleCfg.speed), fn, res }));
}
const ease = (t) => t * t * (3 - 2 * t);

function floatNum(c, text, cls = '') {
  const v = new THREE.Vector3(c.obj.position.x, c.height, c.obj.position.z).project(cam);
  const d = document.createElement('div');
  d.className = 'dmgNum ' + cls; d.textContent = text;
  const [x, y] = versUI((v.x * 0.5 + 0.5) * window.innerWidth, (-v.y * 0.5 + 0.5) * window.innerHeight);     // (l'interface est à l'échelle de l'écran : voir ecran.js)
  d.style.left = (x + (Math.random() - 0.5) * 30) + 'px';
  d.style.top = y + 'px';
  $('dmg').appendChild(d);
  setTimeout(() => d.remove(), 1000);
}

// ---------- Effets d'écran : secousse de caméra, éclair, voile de couleur, arrêt sur image, zoom ----------
function camShake(a) { if (B) B.quake = Math.max(B.quake, a); }
function screenFlash(color, alpha, ms) {
  const el = $('bFlash'); if (!el) return;
  el.style.transition = 'none'; el.style.background = color; el.style.opacity = alpha; void el.offsetWidth;
  el.style.transition = `opacity ${Math.max(30, ms / BattleCfg.speed)}ms ease-out`; el.style.opacity = 0;
}
function screenTint(color, alpha = 0.2) {
  const el = $('bTint'); if (!el) return;
  if (!color) { el.style.opacity = 0; return; }
  el.style.background = `radial-gradient(ellipse at 50% 45%, ${color}00 42%, ${color} 100%)`; el.style.opacity = Math.min(1, alpha * 1.5);
}
function hitStop(sec) { if (B && BattleCfg.speed <= 1) B.hitStop = sec; }
// La caméra s'approche de l'action : entre celui qui agit et ses cibles
function camFocus(c, targets, zoom) {
  if (!B || !targets.length) return;
  const x = (c.home.x + targets.reduce((s, t) => s + t.home.x, 0) / targets.length) / 2, z = (c.home.z + targets.reduce((s, t) => s + t.home.z, 0) / targets.length) / 2;
  B.lookTo.set(x * 0.6, 1.2, z * 0.5); B.zoomTo = zoom || (targets.length > 1 ? 0.9 : 0.8);
}
function camReset() { if (B) { B.lookTo.set(0, 1.2, 0); B.zoomTo = 1; } }
// Outils prêtés aux effets (effets.js) et aux mises en scène des sorts (sorts.js)
const H = { tween, S: (ms) => S(ms), lunge: (c, t) => lunge(c, t), goHome: (c) => goHome(c), castPose: (c) => castPose(c), sfx, speed: () => BattleCfg.speed, shake: camShake, flash: screenFlash, tint: screenTint, freeze: hitStop };

// Squelette d'un humanoïde (les créatures ont aussi un squelette, mais pas de bras à lever)
const armsOf = (o) => (o.userData.P && o.userData.P.armR ? o.userData.P : null);
async function lunge(c, tgt) {
  const from = c.home.clone(), to = from.clone().lerp(tgt.obj.position, 0.72);
  const P = armsOf(c.obj), u = c.obj.userData;
  if (u.imported) {
    // Modèle importé : on joue le vrai clip d'attaque (épée ou poing) et on attend l'instant de l'impact
    const armed = u.armed; u.play(armed ? 'Sword_Attack' : 'Punch_Cross', { speed: armed ? 1.7 : 1.5 });
    await tween(armed ? 300 : 230, (t) => { c.obj.position.lerpVectors(from, to, ease(t)); });
    await S(armed ? 190 : 40);
    return;
  }
  await tween(170, (t) => { c.obj.position.lerpVectors(from, to, ease(t)); if (P) P.armR.rotation.x = -2.2 * t; });
  if (P) tween(120, (t) => { P.armR.rotation.x = -2.2 + 2.6 * t; });
}
async function goHome(c) {
  const from = c.obj.position.clone(), P = armsOf(c.obj);
  await tween(190, (t) => { c.obj.position.lerpVectors(from, c.home, ease(t)); if (P) P.armR.rotation.x = 0.4 * (1 - t); });
}
async function shake(c) {
  if (c.obj.userData.imported && c.hp > 0) c.obj.userData.play(Math.random() < 0.5 ? 'Hit_Chest' : 'Hit_Head');
  await tween(240, (t) => { c.obj.position.x = c.home.x + Math.sin(t * 38) * 0.18 * (1 - t); });
  c.obj.position.x = c.home.x;
}
async function castPose(c) {
  const P = armsOf(c.obj);
  if (c.obj.userData.imported) { c.obj.userData.play('Spell_Simple_Shoot', { speed: 0.8 }); await S(260); return; }
  await tween(280, (t) => { c.obj.position.y = Math.sin(t * Math.PI) * 0.25; if (P) P.armR.rotation.x = -2.6 * Math.sin(t * Math.PI * 0.5); });
  if (P) tween(250, (t) => { P.armR.rotation.x = -2.6 * (1 - t); });
  c.obj.position.y = 0;
}
async function dieFx(c) {
  if (c.obj.userData.imported) {
    c.obj.userData.play('Death01', { hold: true, speed: 1.5 }); c.obj.userData.dead = true; await S(c.isHero ? 1100 : 1000); if (c.isHero) return;
    B.fx.mort(c); sfx('vanish');
    await tween(450, (t) => { c.obj.position.y = -t * 0.5; c.obj.scale.setScalar(Math.max(0.001, 1 - t * t)); }); c.obj.visible = false; return;
  }
  if (c.isHero) { await tween(350, (t) => { c.obj.rotation.x = -1.45 * t; c.obj.position.y = 0.1 * t; }); }
  else { B.fx.mort(c); sfx('vanish'); await tween(420, (t) => { c.obj.scale.setScalar(Math.max(0.001, 1 - t)); c.obj.position.y = t * 0.6; c.obj.rotation.y += 0.25; }); c.obj.visible = false; }
}

// ---------- Affichage ----------
async function msg(text, wait = 800) { $('bMsg').innerHTML = text; if (wait) await S(wait); }

function renderParty(activeId) {
  $('bParty').classList.toggle('quatre', B.heroes.length > 3);
  $('bParty').innerHTML = B.heroes.map(c => {
    const st = Object.keys(c.status).map(k => STATUS_LABEL[k]).join(' ');
    return `<div class="pRow ${c.hp <= 0 ? 'ko' : ''} ${c === activeId ? 'act' : ''}"><div class="pName">${c.name}<span>${c.hp <= 0 ? 'K.O.' : st}${c.defending ? ' Garde' : ''}${c.taunt > 0 ? ' Provoque' : ''}</span></div>
      <div class="pBars"><span>PV</span>${bar(c.hp, c.maxHp)}<span>${c.hp}/${c.maxHp}</span><span>PM</span>${bar(c.mp, c.maxMp, 'mp')}<span>${c.mp}/${c.maxMp}</span></div></div>`;
  }).join('');
}
function renderEnemies() {
  $('bEnemies').innerHTML = B.enemies.map(c => {
    const st = Object.keys(c.status).map(k => STATUS_LABEL[k]).join(' ');
    return `<div class="eRow ${c.hp <= 0 ? 'dead' : ''}"><span>${c.name}${st ? ' <small style="color:#ffb37a">' + st + '</small>' : ''}</span>${bar(c.hp, c.maxHp)}</div>`;
  }).join('');
}
function refresh(active) { renderParty(active); renderEnemies(); }

function mark(c) {
  if (!c) { B.marker.visible = false; return; }
  B.marker.visible = true; B.markTarget = c;
}

// ---------- Calculs ----------
function calc(att, tgt, { kind, power, element, flatDmg, pierce }) {
  let base;
  if (flatDmg) base = flatDmg;
  else {
    const a = kind === 'mag' ? att.mag : att.atk * (att.buffs.atk ? att.buffs.atk.mult : 1) * (att.status.brulure ? 0.8 : 1);
    const d = pierce ? 0 : kind === 'mag' ? tgt.res : tgt.def * (tgt.buffs.def ? tgt.buffs.def.mult : 1);
    base = a * (power / 100) * 100 / (100 + d);
    if (kind !== 'mag' && tgt.d && tgt.d.physRes) base *= tgt.d.physRes;      // corps mou : les coups s'enfoncent
  }
  const em = elemMult(element, tgt);
  const crit = !flatDmg && kind === 'phys' && Math.random() < 0.05 + (att.cha || 0) / 400;
  let dmg = base * em * (0.9 + Math.random() * 0.2) * (crit ? 1.5 : 1);
  if (tgt.defending) dmg /= 2;
  if (tgt.d && tgt.d.invuln) dmg = 1;                                         // adversaire hors d'atteinte : chaque coup ne fait que 1
  return { dmg: Math.max(1, Math.round(dmg)), em, crit, element };
}

async function hurt(tgt, dmg, info = {}) {
  if (tgt.hp <= 0) return;
  tgt.hp = Math.max(B.opts.noDeath && tgt.isHero ? 1 : 0, tgt.hp - dmg);
  floatNum(tgt, String(dmg), info.crit ? 'crit' : info.em > 1 ? 'weak' : '');
  sfx(info.crit ? 'crit' : 'hit');
  if (tgt.status.sommeil) delete tgt.status.sommeil;
  refresh();
  B.fx.impact(tgt, info);
  await shake(tgt);
  if (info.crit) await msg('Coup critique !', 450);
  if (info.em > 1) await msg("C'est très efficace !", 500);
  else if (info.em < 1) await msg("Ce n'est pas très efficace...", 500);
  if (tgt.hp > 0 && tgt.charging && tgt.charging.cancel && info.element === tgt.charging.cancel) {
    const mv = tgt.charging; tgt.charging = null; sfx('ice');
    await msg(mv.cancelText || `${tgt.name} est interrompu !`, 1300);
  }
  if (tgt.hp <= 0) {
    await msg(tgt.isHero ? `${tgt.name} est K.O. !` : `${tgt.name} est à terre !`, 500);
    await dieFx(tgt); refresh();
  }
}

async function heal(tgt, n) {
  const v = Math.min(n, tgt.maxHp - tgt.hp); tgt.hp += v;
  sfx('heal'); floatNum(tgt, '+' + v, 'heal'); refresh(); await B.fx.soin(tgt);
}

async function tryStatus(tgt, status) {
  if (!status || tgt.hp <= 0) return;
  for (const k in status) {
    if (tgt.d && tgt.d.boss && (k === 'gel' || k === 'sommeil')) continue;
    if (Math.random() < status[k]) {
      if (k === 'poison' && tgt.status.poison) continue;
      tgt.status[k] = k === 'brulure' ? 3 : k === 'poison' ? 4 : k === 'gel' ? 1 : k === 'sommeil' ? 2 : 1;
      refresh(); B.fx.statut(tgt, k); sfx({ brulure: 'fire', gel: 'ice', poison: 'poison', sommeil: 'sleep', etourdi: 'stun' }[k]);
      await msg(`${tgt.name} subit : ${STATUS_LABEL[k]} !`, 600);
    }
  }
}

function retarget(c, t) {
  if (t && t.hp > 0) return t;
  const pool = alive(t && t.isHero === c.isHero ? (c.isHero ? B.heroes : B.enemies) : (c.isHero ? B.enemies : B.heroes));
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

// ---------- Exécution d'une action ----------
async function act(c, a) { try { await agir(c, a); } finally { camReset(); screenTint(null); } }
async function agir(c, a) {
  if (c.hp <= 0 || B.over) return;
  refresh(c.isHero ? c : null);
  // Altérations qui empêchent d'agir
  for (const k of ['gel', 'sommeil', 'etourdi']) {
    if (c.status[k]) {
      await msg(`${c.name} ${k === 'gel' ? 'est gelé' : k === 'sommeil' ? 'dort' : 'est étourdi'} et ne peut pas agir.`, 800);
      if (--c.status[k] <= 0) delete c.status[k];
      refresh(); return;
    }
  }
  if (a.type === 'defend') return;

  // Plusieurs cibles : les coups tombent l'un après l'autre, à très peu d'intervalle
  const chacun = (targets, fn) => Promise.all(targets.map((t, i) => S(i * 130).then(() => fn(t))));

  if (a.type === 'attack') {
    const t = retarget(c, a.target); if (!t) return;
    camFocus(c, [t]);
    await msg(`${c.name} attaque ${t.name} !`, 250);
    await attaqueFx(B.fx, H, c, t);
    const r = calc(c, t, { kind: 'phys', power: 100 });
    await Promise.all([hurt(t, r.dmg, r), goHome(c)]);
  }
  else if (a.type === 'skill') {
    const sk = SKILLS[a.skill];
    if (c.mp < sk.pm) { await msg(`${c.name} n'a plus assez de PM !`, 700); return; }
    c.mp -= sk.pm; refresh(c);
    await msg(`${c.name} utilise <b>${sk.name}</b> !`, 350);
    const foes = c.isHero ? B.enemies : B.heroes, friends = c.isHero ? B.heroes : B.enemies;
    let targets = sk.target === 'enemy' ? [retarget(c, a.target)] : sk.target === 'enemies' ? alive(foes) : sk.target === 'ally' ? [a.target && a.target.hp > 0 ? a.target : c] : sk.target === 'allies' ? alive(friends) : [c];
    targets = targets.filter(Boolean); if (!targets.length) return;
    camFocus(c, targets);
    const F = sortFx(B.fx, H, a.skill, sk);          // la mise en scène de cette compétence (sorts.js)
    if (sk.kind === 'phys' || sk.kind === 'mag') {
      await F.pre(c, targets);
      const surUne = async (t) => {
        for (let h = 0; h < (sk.hits || 1); h++) {
          if (t.hp <= 0) break;
          await F.hit(c, t, h);
          if (sk.power > 0) {
            const r = calc(c, t, { kind: sk.kind, power: sk.power, element: sk.element });
            const dernier = h === (sk.hits || 1) - 1 || t.hp - r.dmg <= 0;
            if (F.melee && dernier && targets.length === 1) await Promise.all([hurt(t, r.dmg, r), goHome(c)]); else await hurt(t, r.dmg, r);
          }
          if (sk.kind === 'phys' && t.d && t.d.physRes && !B.toldSoft) { B.toldSoft = true; await msg(`Les coups s'enfoncent dans ${t.name}... Les armes lui font peu de mal. Essayez la magie !`, 1500); }
        }
        await tryStatus(t, sk.status);
      };
      if (targets.length > 1) await chacun(targets, surUne); else await surUne(targets[0]);
      await F.post(c, targets);
      if (c.hp > 0 && c.obj.position.distanceTo(c.home) > 0.05) await goHome(c);
    } else if (sk.kind === 'heal') {
      await F.pre(c, targets);
      for (const t of targets) await heal(t, Math.round(sk.power + c.mag * (sk.scale || 1)));
    } else if (sk.kind === 'steal') {
      const t = targets[0];
      await lunge(c, t);
      const st = t.d && t.d.steal;
      const ok = st && !t.stolen && Math.random() < Math.min(0.95, st[1] + (c.cha || 0) / 200);
      await larcinFx(B.fx, H, c, t, ok);
      if (!st || t.stolen) { await goHome(c); await msg(t.stolen ? `${t.name} n'a plus rien à voler.` : `${t.name} ne porte rien d'intéressant.`, 900); }
      else if (ok) { t.stolen = true; addItem(st[0]); sfx('item'); await goHome(c); await msg(`${c.name} subtilise : <b>${ITEMS[st[0]].name}</b> !`, 1200); }
      else { sfx('miss'); await goHome(c); await msg(`${c.name} tend la main... raté !`, 800); }
    } else if (sk.kind === 'taunt') {
      await provocationFx(B.fx, H, c);
      c.taunt = (sk.turns || 2) + 1; refresh();
      await msg(`${c.name} frappe son bouclier : « Par ici, vermine ! » Les ennemis ne visent plus que lui.`, 1200);
    } else if (sk.kind === 'buff') {
      await F.pre(c, targets); sfx('buff');
      for (const t of targets) { for (const k in sk.buff) if (k !== 'turns') t.buffs[k] = { mult: sk.buff[k], turns: sk.buff.turns }; refresh(); await F.hit(c, t, 0); }
      await S(300);
      await msg(sk.desc, 700);
    }
  }
  else if (a.type === 'item') {
    const it = ITEMS[a.item];
    if (!G.inv[a.item]) { await msg(`Il n'y a plus de ${it.name} !`, 700); return; }
    removeItem(a.item);
    await msg(`${c.name} utilise : <b>${it.name}</b>.`, 350);
    sfx('item');
    if (it.use === 'heal') { const t = a.target && a.target.hp > 0 ? a.target : c; await heal(t, it.value); }
    else if (it.use === 'cure') { const t = a.target && a.target.hp > 0 ? a.target : c; if (t.status[it.cures]) { delete t.status[it.cures]; refresh(); sfx('heal'); await B.fx.antidote(t); await msg(`${t.name} est guéri du poison.`, 700); } else await msg("Cela n'a aucun effet.", 700); }
    else if (it.use === 'mp') { const t = a.target || c; t.mp = Math.min(t.maxMp, t.mp + it.value); floatNum(t, '+' + it.value + ' PM', 'heal'); refresh(); sfx('heal'); await B.fx.ether(t); }
    else if (it.use === 'dmg') {
      const t = retarget(c, a.target); if (!t) return;
      camFocus(c, [t]);
      await fioleFx(B.fx, H, c, t, it.element);
      const r = calc(c, t, { flatDmg: it.value, element: it.element });
      await hurt(t, r.dmg, r);
    }
  }
  else if (a.type === 'move') {   // attaque d'un ennemi
    const mv = a.move;
    const bait = alive(B.heroes).find(h => h.taunt > 0);                       // Provocation : la cible est forcée
    const targets = mv.target === 'all' ? alive(B.heroes) : [bait || retarget(c, a.target)].filter(Boolean);
    if (!targets.length) return;
    if (mv.kind === 'buff') {
      camFocus(c, [c]); await msg(`${c.name} : <b>${mv.name}</b> !`, 500); sfx('buff');
      for (const k in mv.buff) if (k !== 'turns') c.buffs[k] = { mult: mv.buff[k], turns: mv.buff.turns + 1 };
      B.fx.charge(c); refresh(); await S(500); if (mv.text) await msg(mv.text, 1500);
      return;
    }
    if (mv.kind === 'heal') {
      const cible = mv.on ? alive(B.enemies).find(e => e.key === mv.on) : c;
      if (cible && cible.hp < cible.maxHp) {
        camFocus(c, [cible]); await msg(`${c.name} : <b>${mv.name}</b> !`, 500);
        await heal(cible, mv.heal); if (mv.text) await msg(mv.text, 1300);
        return;
      }
      return act(c, { type: 'move', move: c.d.moves[0], target: a.target });      // rien à soigner : il frappe
    }
    camFocus(c, targets);
    await msg(`${c.name} : <b>${mv.name}</b> !`, 350);
    const M = coupFx(B.fx, H, c, mv);                 // la mise en scène de cette attaque (sorts.js)
    await M.pre(targets);
    const surUne = async (t) => { await M.hit(c, t); const r = calc(c, t, { kind: mv.kind, power: mv.power, element: mv.element, pierce: mv.pierce }); await hurt(t, r.dmg, r); await tryStatus(t, mv.status); };
    const jobs = [targets.length > 1 ? chacun(targets, surUne) : surUne(targets[0])];
    if (M.melee) jobs.push(goHome(c));
    await Promise.all(jobs);
  }
}

// Division : le monstre se déchire et d'autres ennemis entrent dans le combat
async function splitFx(c) {
  const sp = c.d.split; c.splitDone = true;
  sfx('windup'); await msg(sp.text, 1500);
  const from = c.obj.position.clone();
  await tween(300, (t) => { c.obj.scale.set(1 + Math.sin(t * Math.PI) * 0.25, 1 - Math.sin(t * Math.PI) * 0.3, 1 + Math.sin(t * Math.PI) * 0.25); });
  c.obj.scale.set(1, 1, 1); dechirureFx(B.fx, H, c);
  const spots = [[2.0, -3.6], [2.0, 3.6], [1.2, -1.9], [1.2, 1.9]];
  const news = sp.spawn.map((k, i) => {
    const d = ENEMIES[k], e = enemyC(k, 0, 1, d.name + ' ' + 'ABCD'[i]);
    e.home.set(spots[i][0], 0, spots[i][1]); e.obj.position.copy(from); B.scene.add(e.obj);
    B.enemies.push(e); B.all.push(e); return e;
  });
  await tween(450, (t) => { for (const e of news) { e.obj.position.lerpVectors(from, e.home, ease(t)); e.obj.position.y = Math.sin(t * Math.PI) * 1.6; } });
  for (const e of news) { e.obj.position.copy(e.home); B.fx.dust(B.fx.feet(e), 6); }
  refresh();
}

function enemyChoose(c) {
  if (c.d.split && !c.splitDone && c.hp <= c.maxHp * c.d.split.at) return { type: 'split' };
  if (c.charging) { const mv = c.charging; c.charging = null; return { type: 'move', move: mv, target: retarget(c, null) }; }
  const moves = c.d.moves, total = moves.reduce((s, m) => s + m.w, 0);
  let r = Math.random() * total, mv = moves[0];
  for (const m of moves) { r -= m.w; if (r <= 0) { mv = m; break; } }
  if (mv.kind === 'buff' && Object.keys(mv.buff).some(k => c.buffs[k])) mv = moves[0];      // déjà renforcé : il frappe
  if (mv.windup) { c.charging = mv; return { type: 'windup', move: mv }; }
  return { type: 'move', move: mv, target: retarget(c, null) };
}

// ---------- Choix du joueur ----------
async function chooseTarget(list, header) {
  const pool = alive(list);
  if (pool.length === 1) return pool[0];
  if (BattleCfg.auto) return pool[0];
  const r = await pick($('bMenu'), pool.map(c => ({ label: c.name, right: c.isHero ? `PV ${c.hp}/${c.maxHp}` : '' })), { header: `<div class="who">${header}</div>`, cancel: true, onHover: (i) => mark(i >= 0 ? pool[i] : null) });
  mark(null);
  return r === -1 ? null : pool[r];
}

function autoAction(c) {
  const foes = alive(B.enemies);
  const used = (id) => B.pending.filter(p => p && p.type === 'item' && p.item === id).length;
  if (c.hp < c.maxHp * 0.4 && (G.inv.potion_plus || 0) > used('potion_plus')) return { type: 'item', item: 'potion_plus', target: c };
  if (c.hp < c.maxHp * 0.4 && (G.inv.potion || 0) > used('potion')) return { type: 'item', item: 'potion', target: c };
  if (c.status.poison && c.hp < c.maxHp * 0.7 && (G.inv.antidote || 0) > used('antidote')) return { type: 'item', item: 'antidote', target: c };
  const sk = knownSkills(c.h).map(id => [id, SKILLS[id]]).filter(([id, s]) => (s.kind === 'mag' || s.kind === 'phys') && s.power > 0 && c.mp >= s.pm && s.target === 'enemy')
    .map(x => [x[0], x[1], x[1].power * (x[1].hits || 1) * elemMult(x[1].element, foes[0])]).sort((p, q) => q[2] - p[2])[0];
  // une fiole de l'élément que l'ennemi craint, si aucune compétence ne touche sa faiblesse
  if (!sk || sk[2] <= sk[1].power * (sk[1].hits || 1)) for (const id of ['fiole_orage', 'fiole_givre', 'fiole_braise']) {
    if ((G.inv[id] || 0) > used(id) && elemMult(ITEMS[id].element, foes[0]) > 1 && foes[0].hp > 60) return { type: 'item', item: id, target: foes[0] };
  }
  if (sk && (c.id === 'lyra' || (c.id === 'kael' && HEROES.kael.style === 'lyra') || foes[0].hp > 20)) return { type: 'skill', skill: sk[0], target: foes[0] };
  return { type: 'attack', target: foes[0] };
}

async function chooseAction(c, canBack) {
  if (BattleCfg.auto) return autoAction(c);
  while (true) {
    refresh(c); mark(c);
    await msg(`Que doit faire ${c.name} ?`, 0);
    const r = await pick($('bMenu'), [
      { label: 'Attaque' },
      { label: 'Compétences', right: `${c.mp} PM` },
      { label: 'Objets' },
      { label: 'Défense', sub: 'Dégâts subis divisés par deux' },
      { label: 'Fuite', disabled: B.opts.canFlee === false },
    ], { header: `<div class="who">${c.name}</div>`, cancel: canBack, cancelLabel: '← Héros précédent' });
    mark(null);
    if (r === -1) return 'back';
    if (r === 0) { const t = await chooseTarget(B.enemies, 'Attaquer qui ?'); if (t) return { type: 'attack', target: t }; }
    else if (r === 1) {
      const ids = knownSkills(c.h);
      const s = await pick($('bMenu'), ids.map(id => ({ label: SKILLS[id].name + (SKILLS[id].element ? ` <small style="display:inline;color:#ffd97a">[${SKILLS[id].element}]</small>` : ''), right: SKILLS[id].pm + ' PM', sub: SKILLS[id].desc, disabled: c.mp < SKILLS[id].pm })), { header: `<div class="who">Compétences de ${c.name}</div>`, cancel: true });
      if (s === -1) continue;
      const sk = SKILLS[ids[s]];
      let t = null;
      if (sk.target === 'enemy') { t = await chooseTarget(B.enemies, `${sk.name} sur qui ?`); if (!t) continue; }
      else if (sk.target === 'ally') { t = await chooseTarget(B.heroes, `${sk.name} pour qui ?`); if (!t) continue; }
      return { type: 'skill', skill: ids[s], target: t };
    }
    else if (r === 2) {
      const ids = Object.keys(G.inv).filter(id => ['heal', 'mp', 'dmg', 'cure'].includes(ITEMS[id].use));
      const reserved = (id) => B.pending.filter(p => p && p.type === 'item' && p.item === id).length;
      const s = await pick($('bMenu'), ids.map(id => ({ label: ITEMS[id].name, right: '×' + (G.inv[id] - reserved(id)), sub: ITEMS[id].desc, disabled: G.inv[id] - reserved(id) <= 0 })), { header: `<div class="who">Objets</div>${ids.length ? '' : '<div style="margin:6px">Le sac est vide.</div>'}`, cancel: true });
      if (s === -1) continue;
      const it = ITEMS[ids[s]];
      let t = null;
      if (it.target === 'enemy') { t = await chooseTarget(B.enemies, `${it.name} sur qui ?`); if (!t) continue; }
      else { t = await chooseTarget(B.heroes, `${it.name} pour qui ?`); if (!t) continue; }
      return { type: 'item', item: ids[s], target: t };
    }
    else if (r === 3) return { type: 'defend' };
    else if (r === 4) return { type: 'flee' };
  }
}

function checkEnd() {
  if (B.over) return true;
  if (!alive(B.enemies).length) { B.over = 'win'; return true; }
  if (!alive(B.heroes).length) { B.over = 'lose'; return true; }
  return false;
}

// Pour les essais automatiques : jouer une action précise sans passer par les menus
BattleCfg.essai = { act: (c, a) => act(c, a), get combat() { return B; } };

// ---------- Boucle d'affichage du combat ----------
const battleView = {
  get scene() { return B.scene; }, camera: cam,
  update(dt) {
    if (B.hitStop > 0) { B.hitStop -= dt; dt *= 0.05; }      // arrêt sur image : un coup critique fige tout un instant
    B.time += dt;
    for (let i = B.tweens.length - 1; i >= 0; i--) {
      const tw = B.tweens[i]; tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      if (tw.fn) tw.fn(k);
      if (k >= 1) { B.tweens.splice(i, 1); tw.res(); }
    }
    for (const o of B.anims) o.userData.anim(dt, false, B.time);
    for (const c of B.all) { const u = c.obj.userData; if (u.dead && c.hp > 0) { u.dead = false; u.stop(); } if ((c.hp > 0 || u.imported) && u.anim) u.anim(dt, false, B.time); }
    B.fx.update(dt); B.fx.suivi(B.all, dt); B.fx.ambiance(B.decor, dt);
    if (B.marker.visible && B.markTarget) { const c = B.markTarget; B.marker.position.set(c.obj.position.x, c.height + 0.5 + Math.sin(B.time * 6) * 0.12, c.obj.position.z); B.marker.rotation.y = B.time * 3; }
    // Caméra : recule sur les écrans étroits pour garder tout le monde à l'image
    const half = Math.tan((cam.fov * Math.PI) / 360) * cam.aspect;
    const kc = Math.min(1, dt * 4.5 * Math.min(8, BattleCfg.speed));
    B.zoom += (B.zoomTo - B.zoom) * kc; B.look.lerp(B.lookTo, kc);
    const dist = Math.max(10.5, 6.2 / half) * B.zoom;
    cam.position.set(B.look.x * 0.85 + Math.sin(B.time * 0.25) * 0.5, 3.4 + dist * 0.12, B.look.z + dist);
    if (B.quake > 0.004) { cam.position.x += (Math.random() - 0.5) * B.quake * 1.3; cam.position.y += (Math.random() - 0.5) * B.quake; B.quake *= Math.exp(-dt * 9); }
    cam.lookAt(B.look);
    // L'image est décalée vers le haut pour que les menus du bas ne cachent pas les combattants
    const w = window.innerWidth, h = window.innerHeight;
    const ui = Math.min(0.5, ($('bBottom').offsetHeight || 0) / h);
    cam.setViewOffset(w, h, 0, Math.round(h * ui * 0.42), w, h);
  },
};

// ============================================================
//  LANCER UN COMBAT
//  enemyKeys : ['loup', 'loup']   opts : { arena, music, canFlee, noDeath, onStart, onRound, onRoundEnd, intro }
//  Renvoie 'win', 'lose' ou 'flee'
// ============================================================
export async function runBattle(enemyKeys, opts = {}) {
  if (!camReg) { E.cameras.push(cam); camReg = true; }
  E.resize();
  const { scene, anims } = buildArena(opts.arena || 'foret');
  const counts = {}; enemyKeys.forEach(k => counts[k] = (counts[k] || 0) + 1);
  const seen = {};
  B = { scene, anims, tweens: [], time: 0, opts, over: null, round: 0, pending: [], marker: makeMarker(), markTarget: null, quake: 0, hitStop: 0, zoom: 1, zoomTo: 1, look: new THREE.Vector3(0, 1.2, 0), lookTo: new THREE.Vector3(0, 1.2, 0) };
  B.fx = new Effets(scene, cam, H); B.decor = (ARENAS[opts.arena || 'foret'] || ARENAS.foret).decor;
  screenTint(null);
  B.heroes = G.party.map((h, i) => heroC(h, i, G.party.length));
  B.enemies = enemyKeys.map((k, i) => { seen[k] = (seen[k] || 0) + 1; return enemyC(k, i, enemyKeys.length, ENEMIES[k].name + (counts[k] > 1 ? ' ' + 'ABCDE'[seen[k] - 1] : '')); });
  B.all = [...B.heroes, ...B.enemies];
  B.all.forEach(c => { scene.add(c.obj); if (c.hp <= 0) { if (c.obj.userData.imported) c.obj.userData.play('Death01', { hold: true, speed: 50 }); else c.obj.rotation.x = -1.45; } });
  B.marker.visible = false; scene.add(B.marker);

  const prevView = E.view;
  sfx('encounter');
  E.view = battleView;
  showHud(false);
  $('battle').classList.remove('hidden');
  $('bMenu').innerHTML = '';
  refresh();
  const isBoss = B.enemies.some(c => c.d.boss);
  music(opts.music || (isBoss ? 'boss' : 'battle'));

  // API donnée aux scripts d'histoire
  const api = {
    heroes: B.heroes, enemies: B.enemies, msg,
    get round() { return B.round; },
    async strike(target, dmg, color) { const b = color || 0xff6a2a; sfx('explosion'); B.fx.explosion(B.fx.mid(target), { a: 0xfff3b0, b, c: 0xb82808 }, 1.2); B.fx.ring(B.fx.feet(target), b, 0.3, 3, 450); await S(120); await hurt(target, dmg, { element: 'Feu' }); },
    async heal(target, n) { await heal(target, n); },
    async hurt(target, dmg, info) { await hurt(target, dmg, info || {}); },
    setStatus(target, k, turns) { target.status[k] = turns; refresh(); },
    end(result) { B.over = result; },
    refresh,
  };

  await msg(opts.intro || (B.enemies.length > 1 ? 'Des ennemis apparaissent !' : `${B.enemies[0].name} apparaît !`), 1100);
  if (opts.onStart) await opts.onStart(api);

  while (!checkEnd()) {
    B.round++;
    B.all.forEach(c => c.defending = false);
    refresh();
    if (opts.onRound) { $('bMenu').innerHTML = ''; await opts.onRound(api, B.round); if (checkEnd()) break; }

    // 1. Choix du joueur
    const hs = alive(B.heroes).filter(c => !c.status.gel && !c.status.sommeil && !c.status.etourdi);
    B.pending = [];
    for (let i = 0; i < hs.length; i++) {
      const a = await chooseAction(hs[i], i > 0);
      if (a === 'back') { B.pending.pop(); i -= 2; continue; }
      B.pending[i] = a;
    }
    $('bMenu').innerHTML = ''; mark(null);
    const actions = hs.map((c, i) => ({ c, a: B.pending[i] }));
    for (const c of alive(B.heroes)) if (!hs.includes(c)) actions.push({ c, a: { type: 'attack', target: null } });

    // Fuite
    if (actions.some(x => x.a.type === 'flee')) {
      const hv = alive(B.heroes).reduce((s, c) => s + c.vit, 0) / alive(B.heroes).length, ev = alive(B.enemies).reduce((s, c) => s + c.vit, 0) / alive(B.enemies).length;
      const chance = Math.max(0.3, Math.min(0.95, 0.55 + (hv - ev) * 0.03));
      await msg("L'équipe tente de fuir...", 700);
      if (Math.random() < chance) { await msg('Vous prenez la fuite !', 800); B.over = 'flee'; break; }
      await msg('Impossible de fuir !', 800);
      actions.forEach(x => { if (x.c.isHero) x.a = { type: 'defend', failed: true }; });
    }
    // Défense : appliquée tout de suite
    for (const x of actions) if (x.a.type === 'defend' && !x.a.failed) { x.c.defending = true; refresh(); B.fx.garde(x.c); sfx('shield'); await msg(`${x.c.name} se met en garde.`, 450); }

    // 2. Choix des ennemis
    for (const c of alive(B.enemies)) actions.push({ c, a: enemyChoose(c) });

    // 3. Résolution dans l'ordre de la Vitesse
    actions.forEach(x => x.ini = x.c.vit * (0.9 + Math.random() * 0.2) + (x.a.type === 'skill' && SKILLS[x.a.skill].first ? 1000 : 0));
    actions.sort((p, q) => q.ini - p.ini);
    for (const x of actions) {
      if (checkEnd()) break;
      if (x.c.hp <= 0) continue;
      if (x.a.type === 'split') { await splitFx(x.c); await S(200); continue; }
      if (x.a.type === 'windup') {
        if (x.c.status.gel || x.c.status.sommeil || x.c.status.etourdi) { x.c.charging = null; await act(x.c, { type: 'none' }); }
        else { sfx('windup'); B.fx.charge(x.c); await msg(x.a.move.windup, 1300); }
        continue;
      }
      await act(x.c, x.a);
      await S(180);
    }
    if (checkEnd()) break;

    // 4. Fin de tour : brûlure, régénération, bonus qui s'épuisent
    for (const c of alive(B.all)) {
      if (c.status.brulure) {
        const d = Math.max(1, Math.round(c.maxHp * 0.05));
        await msg(`${c.name} souffre de sa brûlure.`, 350);
        B.fx.statut(c, 'brulure'); sfx('fire');
        await hurt(c, d, { element: 'Feu' });
        if (c.hp > 0 && --c.status.brulure <= 0) { delete c.status.brulure; refresh(); }
      }
      if (c.status.poison && c.hp > 0) {
        const d = Math.max(1, Math.round(c.maxHp * (c.d && c.d.boss ? 0.03 : 0.08)));
        await msg(`Le poison ronge ${c.name}.`, 350);
        B.fx.statut(c, 'poison'); sfx('poison');
        await hurt(c, d, { element: 'Poison' });
        if (c.hp > 0 && --c.status.poison <= 0) { delete c.status.poison; refresh(); await msg(`Le poison de ${c.name} se dissipe.`, 400); }
      }
      if (c.taunt > 0 && --c.taunt <= 0) { c.taunt = 0; refresh(); }
      if (c.status.brulure) { /* déjà traité */ } else if (c.d && c.d.regen && c.hp < c.maxHp && c.hp > 0) {
        await msg(`${c.name} se régénère !`, 350);
        await heal(c, c.d.regen);
      }
      for (const k in c.buffs) if (--c.buffs[k].turns <= 0) delete c.buffs[k];
      if (checkEnd()) break;
    }
    if (opts.onRoundEnd && !checkEnd()) await opts.onRoundEnd(api, B.round);
  }

  // ---------- Fin du combat ----------
  $('bMenu').innerHTML = ''; mark(null);
  const result = B.over;
  // Les PV et PM reviennent aux héros
  for (const c of B.heroes) { c.h.hp = Math.max(result === 'win' ? 1 : 0, c.hp); c.h.mp = c.mp; }
  if (result === 'win') {
    music(''); sfx('victory');
    const xp = B.enemies.reduce((s, c) => s + c.d.xp, 0), gold = B.enemies.reduce((s, c) => s + c.d.gold, 0);
    for (const c of alive(B.heroes)) { const f = B.fx.feet(c); B.fx.rise(new THREE.Vector3(f.x, 0.2, f.z), 3, [0xffffff, 0xffd040], 14, { size: [0.18, 0.4], up: [1, 3], spin: [-2, 2], rot: 'hasard', rad: 0.8 }); B.fx.ring(f, 0xffd040, 0.3, 1.8, 600, 0.6); }
    await msg('Victoire !', 1200);
    G.gold += gold;
    await msg(`Chaque héros gagne <b>${xp}</b> points d'expérience. Vous trouvez <b>${gold}</b> pièces d'or.`, 1700);
    for (const c of B.enemies) if (c.d.drop && Math.random() < c.d.drop[1]) { addItem(c.d.drop[0]); await msg(`L'ennemi laisse tomber : <b>${ITEMS[c.d.drop[0]].name}</b>.`, 1200); }
    for (const h of G.party) {
      const ups = gainXP(h, xp);
      for (const u of ups) {
        sfx('levelup');
        const s = heroStats(h), c = B.heroes.find(x => x.h === h); if (c) { c.hp = h.hp; c.mp = h.mp; c.maxHp = s.maxHp; c.maxMp = s.maxMp; refresh(); const f = B.fx.feet(c); B.fx.pillar(f, 0xffd040, 0.85, 3.6, 900); B.fx.rune(f, 0xffe080, 1.1, 900); B.fx.rise(new THREE.Vector3(f.x, 0.3, f.z), 15, [0xffffff, 0xffc030], 8, { size: [0.26, 0.4], up: [1.6, 3] }); B.fx.light(B.fx.mid(c), 0xffd040, 2.5, 700); }
        await msg(`<b>${HEROES[h.id].name}</b> passe au niveau <b>${u.level}</b> ! PV et PM restaurés.` + (u.learned.length ? `<br>Nouvelle compétence : <b>${u.learned.join(', ')}</b>` : ''), u.learned.length ? 2400 : 1600);
      }
    }
  } else if (result === 'lose') {
    music(''); sfx('lose');
    await msg("L'équipe est vaincue...", 1800);
  }
  $('battle').classList.add('hidden');
  $('dmg').innerHTML = '';
  E.view = prevView;
  showHud(true); updateGold();
  screenTint(null); B.fx.dispose();
  B = null;
  return result;
}
