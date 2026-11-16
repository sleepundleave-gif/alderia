// ============================================================
//  MOTEUR D'EXPLORATION 3D : scène, joueur, caméra, collisions,
//  interactions, déclencheurs, ennemis visibles, cinématiques
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { envFor } from './pack.js';
import { Q, finesseDepart, reglerChamp, dansChamp, distanceCamera, geoLoin, indexLoin, reglerDetail } from './qualite.js';
import { Input, moveVector } from './input.js';
import { prompt as uiPrompt, openMenu } from './ui.js';

export const E = {
  renderer: null, camera: null, scene: null, stage: null,
  player: null, followers: [],
  busy: 0, enabled: false,
  camYaw: 0, camPitch: 0.5, camDist: 8.5, shotCam: null, camLook: new THREE.Vector3(),
  time: 0, view: null, movers: [],
};

const PLAYER_SPEED = 5.8, PLAYER_R = 0.4;

const NONIDX = new Map();

// ---------- Une scène d'exploration (« Stage ») ----------
export class Stage {
  constructor(o = {}) {
    this.group = new THREE.Group();
    this.staticGroup = new THREE.Group(); this.group.add(this.staticGroup);   // décor fixe, fusionné par bake()
    this.bounds = o.bounds || [-40, 40, -40, 40];       // minX, maxX, minZ, maxZ
    this.sky = o.sky ?? 0x8fc8ff;
    this.fog = o.fog || [this.sky, 45, 150];
    this.hemi = o.hemi || [0xffffff, 0x6a8a5a, 1.0];
    this.sun = o.sun || [0xfff1d0, 1.2, [30, 50, 20]];
    this.music = o.music || ''; this.pitch = o.pitch; this.name = o.name || '';
    this.colliders = []; this.inter = []; this.triggers = []; this.mobs = []; this.anims = []; this.roofs = []; this.actors = {};
    this.onMob = null;
  }
  // x, z, ry, y sont facultatifs : sans eux, l'objet garde sa position
  place(obj, x, z, ry, y) {
    if (x !== undefined) { obj.position.x = x; obj.position.z = z; }
    if (y !== undefined) obj.position.y = y;
    if (ry !== undefined) obj.rotation.y = ry;
  }
  add(obj, x, z, ry, y) {
    this.place(obj, x, z, ry, y); this.group.add(obj);
    if (obj.userData.anim) this.anims.push(obj);
    return obj;
  }
  // Décor fixe : sera fusionné en quelques gros maillages (beaucoup plus rapide à afficher)
  deco(obj, x, z, ry, y) { this.place(obj, x, z, ry, y); this.staticGroup.add(obj); return obj; }
  bake() {
    this.staticGroup.updateMatrixWorld(true);
    const buckets = new Map(), v = new THREE.Vector3(), nm = new THREE.Matrix3(), kits = new Map();
    this.staticGroup.traverse(o => {
      if (!o.isMesh) return;
      // Pièce importée : on ne recopie pas ses triangles, on note seulement où elle est posée (« instance », comme le GPU Instancing de Unity)
      if (o.geometry.userData.kit) { const key = o.geometry.uuid + o.material.uuid; let k = kits.get(key); if (!k) { k = { geo: o.geometry, mat: o.material, at: [] }; kits.set(key, k); } k.at.push(o.matrixWorld.clone()); return; }
      if (o.material.isShaderMaterial) return;                 // (les matières programmées — ciel, eau — ne se fusionnent pas)
      // Matière unie (une couleur, sans texture ni lueur) : sa couleur est écrite dans les sommets, et toutes les matières
      // unies partagent un seul maillage. Une ville de 80 couleurs se dessine en 2 ou 3 fois au lieu de 80.
      const unie = matiereUnie(o.material), cle = unie || o.material, teinte = unie ? o.material.color : null;
      let b = buckets.get(cle); if (!b) { b = { pos: [], nor: [], col: cle.vertexColors ? [] : null }; buckets.set(cle, b); }
      let g = NONIDX.get(o.geometry); if (!g) { g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry; NONIDX.set(o.geometry, g); }
      const p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color;
      nm.getNormalMatrix(o.matrixWorld);
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); b.pos.push(v.x, v.y, v.z);
        v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); b.nor.push(v.x, v.y, v.z);
        if (teinte) b.col.push(teinte.r, teinte.g, teinte.b);
        else if (b.col) { if (c) b.col.push(c.getX(i), c.getY(i), c.getZ(i)); else b.col.push(1, 1, 1); }      // couleurs par sommet (montagnes)
      }
    });
    this.releve(buckets);
    const garde = this.staticGroup.children.filter((o) => o.isMesh && o.material.isShaderMaterial);
    this.staticGroup.clear(); for (const o of garde) this.staticGroup.add(o);
    for (const [material, b] of buckets) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      if (b.col) g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      const m = new THREE.Mesh(g, material); g.computeBoundingSphere(); g.userData.fusion = true; m.renderOrder = material.transparent ? 1 : 0;     // (sphère englobante : hors du champ de la caméra, il n'est pas dessiné)
      this.staticGroup.add(m);
    }
    // Pièces importées (murs, fenêtres, tonneaux, arbres…). Le téléphone peine surtout sur le NOMBRE d'objets à dessiner :
    //  - les petites pièces (moins de 1 500 triangles) sont recopiées dans un seul maillage par matière et par case du
    //    terrain : une rue de 300 planches, poutres et volets se dessine en quelques fois au lieu de 300 ;
    //  - les grosses (arbres) restent des copies (« instances »), groupées par case.
    // Une case entière hors du champ de la caméra n'est pas dessinée ; avant, toute la carte passait à chaque image.
    const CASE = 26, pc = new THREE.Vector3(), nbTri = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
    const caseDe = (mx) => { pc.setFromMatrixPosition(mx); return Math.floor(pc.x / CASE) + ',' + Math.floor(pc.z / CASE); };
    let series = 0; const lots = new Map(), details = [];
    const estPetite = (g) => nbTri(g) < 1500 && g.index && g.attributes.normal && !g.morphAttributes.position;
    // une matière peu employée (moins de 15 000 triangles sur toute la carte) ne vaut pas un découpage : un seul maillage
    const poids = new Map(); for (const k of kits.values()) if (estPetite(k.geo)) poids.set(k.mat, (poids.get(k.mat) || 0) + nbTri(k.geo) * k.at.length);
    for (const k of kits.values()) {
      const g = k.geo, petite = estPetite(g), entier = poids.get(k.mat) < 15000;
      if (petite) {
        for (const mx of k.at) { const c = k.mat.uuid + (entier ? '' : caseDe(mx)); let l = lots.get(c); if (!l) lots.set(c, l = { mat: k.mat, pieces: [], nv: 0, ni: 0, ni2: 0, loin: false }); l.pieces.push(g, mx); l.nv += g.attributes.position.count; l.ni += g.index.count; const ix2 = indexLoin(g); l.ni2 += (ix2 || g.index).count; if (ix2) l.loin = true; }
        continue;
      }
      const cases = new Map();
      if (k.at.length < 2) cases.set('', k.at);
      else for (const mx of k.at) { const c = caseDe(mx); let l = cases.get(c); if (!l) cases.set(c, l = []); l.push(mx); }
      for (const l of cases.values()) {
        const m = new THREE.InstancedMesh(k.geo, k.mat, l.length); l.forEach((mx, i) => m.setMatrixAt(i, mx)); m.instanceMatrix.needsUpdate = true;
        m.computeBoundingSphere(); this.staticGroup.add(m); series++;
        const gl = geoLoin(k.geo); if (gl) details.push({ m, pres: k.geo, loin: gl, c: m.boundingSphere.center.clone(), r: m.boundingSphere.radius, etat: false });
      }
    }
    for (const l of lots.values()) {
      const P = new Float32Array(l.nv * 3), N = new Float32Array(l.nv * 3), U = l.mat.map ? new Float32Array(l.nv * 2) : null, C = l.mat.vertexColors ? new Float32Array(l.nv * 3) : null;
      const I = new (l.nv > 65535 ? Uint32Array : Uint16Array)(l.ni); let v0 = 0, i0 = 0, j0 = 0;
      const I2 = l.loin ? new (l.nv > 65535 ? Uint32Array : Uint16Array)(l.ni2) : null;        // la même case vue de loin : moins de triangles, mêmes sommets
      for (let q = 0; q < l.pieces.length; q += 2) {
        const g = l.pieces[q], mx = l.pieces[q + 1], p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv, c = g.attributes.color, ix = g.index, nb = p.count;
        nm.getNormalMatrix(mx);
        for (let i = 0, j = v0 * 3, u = v0 * 2; i < nb; i++, j += 3, u += 2) {
          v.fromBufferAttribute(p, i).applyMatrix4(mx); P[j] = v.x; P[j + 1] = v.y; P[j + 2] = v.z;
          v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); N[j] = v.x; N[j + 1] = v.y; N[j + 2] = v.z;
          if (U && uv) { U[u] = uv.getX(i); U[u + 1] = uv.getY(i); }
          if (C) { if (c) { C[j] = c.getX(i); C[j + 1] = c.getY(i); C[j + 2] = c.getZ(i); } else C[j] = C[j + 1] = C[j + 2] = 1; }
        }
        const miroir = mx.determinant() < 0;                     // pièce retournée (échelle négative) : ses faces changent de sens
        for (let i = 0; i < ix.count; i += 3) { I[i0++] = ix.getX(i) + v0; I[i0++] = ix.getX(i + (miroir ? 2 : 1)) + v0; I[i0++] = ix.getX(i + (miroir ? 1 : 2)) + v0; }
        if (I2) { const iy = indexLoin(g) || ix; for (let i = 0; i < iy.count; i += 3) { I2[j0++] = iy.getX(i) + v0; I2[j0++] = iy.getX(i + (miroir ? 2 : 1)) + v0; I2[j0++] = iy.getX(i + (miroir ? 1 : 2)) + v0; } }
        v0 += nb;
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
      if (U) g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); if (C) g.setAttribute('color', new THREE.BufferAttribute(C, 3));
      g.setIndex(new THREE.BufferAttribute(I, 1)); g.computeBoundingSphere(); g.userData.fusion = true;
      const m = new THREE.Mesh(g, l.mat); m.renderOrder = l.mat.transparent ? 1 : 0; this.staticGroup.add(m); series++;
      if (I2) {
        const g2 = new THREE.BufferGeometry(); for (const n in g.attributes) g2.setAttribute(n, g.attributes[n]); g2.setIndex(new THREE.BufferAttribute(I2, 1));
        g2.boundingSphere = g.boundingSphere.clone(); g2.userData.fusion = true;
        details.push({ m, pres: g, loin: g2, c: g.boundingSphere.center.clone(), r: g.boundingSphere.radius, etat: false });
      }
    }
    this.series = series; this.details = details;
    this.kitCount = [...kits.values()].reduce((a, k) => a + k.at.length, 0);
    return this;
  }
  // --- Hauteur du sol ---
  // Relevé des dalles, marches, estrades et quais sur lesquels on marche : une grille de hauteurs (cases de 25 cm),
  // tirée du décor fixe au moment où il est fusionné. Sans cela tout le monde marcherait à la hauteur 0 et aurait
  // les pieds enfoncés dans la moindre dalle. Deux étages : « bas » (jusqu'à 45 cm, où l'on monte d'un pas) et
  // « haut » (jusqu'à 1,6 m : on n'y accède que de proche en proche, par des marches).
  releve(buckets) {
    const b = this.bounds, M = this.solMarge || 3, pas = (b[1] - b[0] + 2 * M) * (b[3] - b[2] + 2 * M) > 90000 ? 0.5 : 0.25;
    const x0 = b[0] - M, z0 = b[2] - M, nx = Math.ceil((b[1] - b[0] + 2 * M) / pas), nz = Math.ceil((b[3] - b[2] + 2 * M) / pas);
    const bas = new Float32Array(nx * nz), haut = new Float32Array(nx * nz); let n = 0;
    for (const [material, bk] of buckets) {
      if (material.transparent || material.userData.sansSol) continue;
      const P = bk.pos;
      for (let i = 0; i < P.length; i += 9) {
        const ay = P[i + 1], by = P[i + 4], cy = P[i + 7], y = Math.max(ay, by, cy);
        if (y < 0.035 || y > (this.solMax || 1.6) || y - Math.min(ay, by, cy) > 0.02) continue;                      // seulement les faces plates, près du sol
        const ax = P[i], az = P[i + 2], bx = P[i + 3], bz = P[i + 5], cx = P[i + 6], cz = P[i + 8];
        const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az); if (ny <= 1e-6) continue;          // … tournées vers le haut
        const i1 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - x0) / pas)), i2 = Math.min(nx - 1, Math.floor((Math.max(ax, bx, cx) - x0) / pas));
        const j1 = Math.max(0, Math.floor((Math.min(az, bz, cz) - z0) / pas)), j2 = Math.min(nz - 1, Math.floor((Math.max(az, bz, cz) - z0) / pas));
        for (let j = j1; j <= j2; j++) for (let k = i1; k <= i2; k++) {
          const px = x0 + (k + 0.5) * pas, pz = z0 + (j + 0.5) * pas;
          const d1 = (px - bx) * (az - bz) - (ax - bx) * (pz - bz), d2 = (px - cx) * (bz - cz) - (bx - cx) * (pz - cz), d3 = (px - ax) * (cz - az) - (cx - ax) * (pz - az);
          if ((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)) continue;
          const c = j * nx + k; if (y > haut[c]) haut[c] = y; if (y <= 0.45 && y > bas[c]) bas[c] = y; n++;
        }
      }
    }
    this.grille = n ? { x0, z0, nx, nz, pas, bas, haut } : null;
  }
  // Hauteur du sol sous (x, z) pour quelqu'un qui se trouve à la hauteur y : on ne monte que d'un pas à la fois
  sol(x, z, y = 0) {
    const g = this.grille; if (!g) return 0;
    const k = Math.floor((x - g.x0) / g.pas), j = Math.floor((z - g.z0) / g.pas); if (k < 0 || j < 0 || k >= g.nx || j >= g.nz) return 0;
    const c = j * g.nx + k, h = g.haut[c];
    return h <= y + 0.5 ? h : g.bas[c];
  }
  // Hauteur où poser quelqu'un qui ne bouge pas (un habitant sur une estrade) : la plus haute dalle sous ses pieds
  solPose(x, z) { const g = this.grille; if (!g) return 0; let h = 1e9; for (const [dx, dz] of [[0, 0], [0.18, 0], [-0.18, 0], [0, 0.18], [0, -0.18]]) h = Math.min(h, this.sol(x + dx, z + dz, 1e3)); return h; }
  remove(obj) { this.group.remove(obj); const i = this.anims.indexOf(obj); if (i >= 0) this.anims.splice(i, 1); }
  circle(x, z, r) { const c = { x, z, r }; this.colliders.push(c); return c; }
  wall(x1, z1, x2, z2) { const c = { box: true, x1: Math.min(x1, x2), z1: Math.min(z1, z2), x2: Math.max(x1, x2), z2: Math.max(z1, z2) }; this.colliders.push(c); return c; }
  prop(obj, x, z, ry = 0, r = 0.6) { this.deco(obj, x, z, ry); if (r) this.circle(x, z, r); return obj; }
  house(obj, x, z, w, d, ry = 0) {
    this.deco(obj, x, z, ry);
    const sw = Math.abs(Math.sin(ry)) > 0.7, hw = (sw ? d : w) / 2, hd = (sw ? w : d) / 2;
    this.wall(x - hw, z - hd, x + hw, z + hd).tall = true;      // « tall » : cache la vue, la caméra se rapproche
    (this.batiments || (this.batiments = [])).push(obj);         // (on pourra y entrer : voir interieurs.js)
    return obj;
  }
  actor(key, obj, x, z, ry = 0, solid = true) {
    this.add(obj, x, z, ry); this.actors[key] = obj;
    if (solid) { const c = this.circle(x, z, 0.45); c.follow = obj; obj.userData.col = c; }
    return obj;
  }
  interact(o) { this.inter.push(o); return o; }      // { x, z | obj, r, label, action, cond }
  trigger(o) { this.triggers.push(o); return o; }    // { x1, z1, x2, z2, action, cond, once }
  mob(o) {                                           // { obj, x, z, roam, enemies }
    this.add(o.obj, o.x, o.z, Math.random() * 6);
    const m = Object.assign({ home: { x: o.x, z: o.z }, roam: 4, t: 0, tx: o.x, tz: o.z, cool: 0, dead: false, speed: 3.3 }, o);
    this.mobs.push(m); return m;
  }
  removeMob(m) { m.dead = true; this.remove(m.obj); }
}

// ---------- Matières unies : une seule matière, la couleur est portée par les sommets ----------
const UNIES = new Map();
function matiereUnie(m) {
  if (!m.isMeshLambertMaterial || m.map || m.transparent || m.alphaTest || m.vertexColors || m.opacity < 1 || m.emissiveMap || m.alphaMap || m.envMap || m.lightMap || m.userData.sansFusion || m.polygonOffset || m.wireframe) return null;
  if (m.emissive.r + m.emissive.g + m.emissive.b > 0 || m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) return null;
  const cle = [m.side, m.flatShading, m.fog, m.depthWrite, m.depthTest, !!m.userData.sansSol].join('|');
  let u = UNIES.get(cle);
  if (!u) { u = new THREE.MeshLambertMaterial({ vertexColors: true, side: m.side, flatShading: m.flatShading, fog: m.fog, depthWrite: m.depthWrite, depthTest: m.depthTest }); if (m.userData.sansSol) u.userData.sansSol = true; u.name = 'unie'; UNIES.set(cle, u); }
  return u;
}

// ---------- Initialisation ----------
E.init = function (canvas) {
  // lissage des bords et finesse de l'image : selon le niveau de graphismes (qualite.js)
  const r = new THREE.WebGLRenderer({ canvas, antialias: Q.lisse, powerPreference: 'high-performance' });
  r.setPixelRatio(finesseDepart());
  E.renderer = r;
  E.camera = new THREE.PerspectiveCamera(52, 1, 0.3, 900);
  const resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    r.setSize(w, h, false);
    for (const cam of E.cameras) { cam.aspect = w / h; cam.fov = w < h ? 68 : 52; cam.updateProjectionMatrix(); }
  };
  E.cameras = [E.camera];
  E.resize = resize;
  window.addEventListener('resize', resize);
  resize();
  Input.onDrag = (dx, dy) => {
    if (E.view !== E.worldView || E.shotCam) return;
    E.camYaw -= dx * 0.006;
    E.camPitch = Math.max(0.18, Math.min(1.15, E.camPitch + dy * 0.004));
  };
};

E.worldView = { update: (dt) => E.update(dt), get scene() { return E.scene; }, get camera() { return E.camera; } };

// ---------- Changer de scène ----------
E.setStage = function (stage, spawn = { x: 0, z: 0 }) {
  // la scène que l'on quitte rend la mémoire de la carte graphique (ses maillages fusionnés sont propres à elle)
  if (E.stage && E.stage !== stage && E.stage.staticGroup) { for (const o of E.stage.staticGroup.children) if (o.geometry && o.geometry.userData.fusion) o.geometry.dispose(); for (const e of E.stage.details || []) { if (e.pres.userData.fusion) e.pres.dispose(); if (e.loin.userData.fusion) e.loin.dispose(); } }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(stage.sky);
  scene.fog = new THREE.Fog(stage.fog[0], stage.fog[1], stage.fog[2]);
  const hemi = new THREE.HemisphereLight(stage.hemi[0], stage.hemi[1], stage.hemi[2]); scene.add(hemi);
  const sun = new THREE.DirectionalLight(stage.sun[0], stage.sun[1]);
  sun.position.set(...stage.sun[2]); scene.add(sun);
  E.lights = { hemi, sun };
  scene.environment = envFor(E.renderer, stage.sky, stage.hemi[1], stage.hemi[2] > 1.15 ? 0.75 : 1);
  scene.add(stage.group);
  E.scene = scene; E.stage = stage; E.movers = []; E.shotCam = null;
  if (E.player) {
    scene.add(E.player);
    E.player.position.set(spawn.x, 0, spawn.z);
    E.player.rotation.y = spawn.ry ?? Math.PI;
    E.player.visible = true;
    E.player.userData.gy = undefined;
    E.followers.forEach((f, i) => { scene.add(f); f.position.set(spawn.x + 0.9 * (i + 1), 0, spawn.z + 0.9); resolve(stage, f.position, 0.3, f); f.userData.gy = undefined; f.rotation.y = E.player.rotation.y; f.visible = true; });
  }
  if (spawn.yaw !== undefined) E.camYaw = spawn.yaw;
  E.camPitch = stage.pitch || 0.5;
  E.snapCamera();
  E.view = E.worldView;
};

E.setParty = function (player, followers = []) {
  if (E.scene) { if (E.player) E.scene.remove(E.player); E.followers.forEach(f => E.scene.remove(f)); }
  E.player = player; E.followers = followers;
  if (E.scene) {
    E.scene.add(player);
    followers.forEach((f, i) => { E.scene.add(f); if (f.position.lengthSq() === 0) f.position.set(player.position.x + 1, 0, player.position.z + 1); });
  }
};

// ---------- Cinématiques ----------
E.run = async function (fn) {
  E.busy++; uiPrompt(null);
  try { return await fn(); }
  catch (err) { console.error(err); const el = document.getElementById('err'); if (el) { el.style.display = 'block'; el.textContent = 'Erreur : ' + (err && err.stack || err); } }
  finally { E.busy--; }
};
E.walk = function (obj, x, z, speed = 3.6) { return new Promise(res => E.movers.push({ obj, x, z, speed, res })); };
E.face = function (obj, x, z) { obj.rotation.y = Math.atan2(x - obj.position.x, z - obj.position.z); };
E.faceEach = function (a, b) { E.face(a, b.position.x, b.position.z); E.face(b, a.position.x, a.position.z); };
E.shot = function (pos, look, snap = false) {
  E.shotCam = { pos: new THREE.Vector3(...pos), look: new THREE.Vector3(...look) };
  if (snap) { E.camera.position.copy(E.shotCam.pos); E.camLook.copy(E.shotCam.look); E.camera.lookAt(E.camLook); }
};
E.unshot = function (snap = false) { E.shotCam = null; if (snap) E.snapCamera(); };
E.snapCamera = function () { E.camDistCur = camTargetDist(); const d = desiredCam(); E.camera.position.copy(d.pos); E.camLook.copy(d.look); E.camera.lookAt(E.camLook); };

const _v = new THREE.Vector3(), _l = new THREE.Vector3();
// Distance jusqu'au premier obstacle haut (arbre, maison) entre le joueur et la caméra
function camClear(ox, oz, dx, dz, L) {
  let best = L;
  if (!E.stage) return best;
  for (const c of E.stage.colliders) {
    if (!c.tall || c.off) continue;
    if (c.box) {
      let t0 = 0, t1 = best, ok = true;
      for (const [o, d, lo, hi] of [[ox, dx, c.x1, c.x2], [oz, dz, c.z1, c.z2]]) {
        if (Math.abs(d) < 1e-6) { if (o < lo || o > hi) { ok = false; break; } continue; }
        let a = (lo - o) / d, b = (hi - o) / d; if (a > b) { const s = a; a = b; b = s; }
        t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) { ok = false; break; }
      }
      if (ok && t0 < best) best = t0;
    } else {
      const fx = ox - c.x, fz = oz - c.z, b = fx * dx + fz * dz, q = fx * fx + fz * fz - c.r * c.r;
      if (q <= 0) continue;
      const disc = b * b - q; if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t > 0 && t < best) best = t;
    }
  }
  return best;
}
function camTargetDist() {
  const p = E.player ? E.player.position : _v.set(0, 0, 0);
  const cp = Math.cos(E.camPitch), L = cp * E.camDist;
  const t = camClear(p.x, p.z, Math.sin(E.camYaw), Math.cos(E.camYaw), L);
  return t >= L ? E.camDist : Math.max(2.4, (t - 0.5) / cp);
}
function desiredCam() {
  if (E.shotCam) return E.shotCam;
  const p = E.player ? E.player.position : _v.set(0, 0, 0);
  const cp = Math.cos(E.camPitch), sp = Math.sin(E.camPitch), d = E.camDistCur || E.camDist;
  return {
    pos: new THREE.Vector3(p.x + Math.sin(E.camYaw) * cp * d, 1.4 + sp * d, p.z + Math.cos(E.camYaw) * cp * d),
    look: _l.set(p.x, 1.35, p.z),
  };
}

// ---------- Collisions ----------
function resolve(st, p, r, moi) {
  for (let pass = 0; pass < 2; pass++) {
    for (const c of st.colliders) {
      if (c.off || c.ghost || (moi && c.follow === moi)) continue;                          // « ghost » : ne bloque personne, sert seulement à rapprocher la caméra
      if (c.box) {
        const nx = Math.max(c.x1, Math.min(p.x, c.x2)), nz = Math.max(c.z1, Math.min(p.z, c.z2));
        let dx = p.x - nx, dz = p.z - nz; const d = Math.hypot(dx, dz);
        if (d >= r) continue;
        if (d > 1e-5) { p.x = nx + (dx / d) * r; p.z = nz + (dz / d) * r; }
        else { // à l'intérieur du mur : sortir par le côté le plus proche
          const l = p.x - c.x1, rr = c.x2 - p.x, t = p.z - c.z1, b = c.z2 - p.z, m = Math.min(l, rr, t, b);
          if (m === l) p.x = c.x1 - r; else if (m === rr) p.x = c.x2 + r; else if (m === t) p.z = c.z1 - r; else p.z = c.z2 + r;
        }
      } else {
        const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), min = r + c.r;
        if (d >= min) continue;
        if (d > 1e-5) { p.x = c.x + (dx / d) * min; p.z = c.z + (dz / d) * min; } else p.x += min;
      }
    }
  }
  const b = st.bounds;
  p.x = Math.max(b[0], Math.min(b[1], p.x)); p.z = Math.max(b[2], Math.min(b[3], p.z));
}

// Pose un personnage sur le sol (dalle, marche, estrade). On ne touche pas à ceux dont une scène règle elle-même la hauteur
// (saut, envol, personnage couché) : on les reconnaît à ce que leur hauteur n'est ni 0 ni celle qu'on leur a donnée.
function poser(st, o, dt, fixe) {
  const ud = o.userData, p = o.position;
  if (ud.vol || (p.y !== 0 && (ud.gy === undefined || Math.abs(p.y - ud.gy) > 1e-4))) return;
  const h = fixe ? st.solPose(p.x, p.z) : st.sol(p.x, p.z, p.y);
  p.y = dt == null || Math.abs(h - p.y) < 0.004 ? h : p.y + (h - p.y) * Math.min(1, dt * 14);
  ud.gy = p.y;
}
E.poser = (o) => { if (E.stage && o && o.position.y === 0) poser(E.stage, o, null, true); };
// Deux personnages ne peuvent pas être au même endroit : on écarte « o » de « autre »
function ecarter(o, autre, min) {
  const dx = o.position.x - autre.position.x, dz = o.position.z - autre.position.z, d = Math.hypot(dx, dz);
  if (d >= min) return false;
  if (d > 1e-4) { o.position.x = autre.position.x + (dx / d) * min; o.position.z = autre.position.z + (dz / d) * min; } else o.position.x += min;
  return true;
}

function turnTo(obj, ang, k) {
  let d = ang - obj.rotation.y;
  while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
  obj.rotation.y += d * k;
}

// ---------- Boucle d'exploration ----------
E.update = function (dt) {
  E.time += dt;
  const st = E.stage; if (!st) return;
  const t = E.time, pl = E.player;
  const free = E.enabled && !E.busy;

  // Colliders attachés à des personnages
  for (const c of st.colliders) if (c.follow) { c.x = c.follow.position.x; c.z = c.follow.position.z; }

  // Déplacement du joueur
  let moving = false;
  if (free && pl) {
    const mv = moveVector();
    if (mv.l > 0.12) {
      const fx = -Math.sin(E.camYaw), fz = -Math.cos(E.camYaw), rx = Math.cos(E.camYaw), rz = -Math.sin(E.camYaw);
      const dx = fx * mv.y + rx * mv.x, dz = fz * mv.y + rz * mv.x;
      const sp = PLAYER_SPEED * Math.min(1, mv.l * 1.15);
      pl.position.x += dx * sp * dt; pl.position.z += dz * sp * dt;
      resolve(st, pl.position, PLAYER_R);
      turnTo(pl, Math.atan2(dx, dz), Math.min(1, dt * 14));
      moving = true;
    }
  }
  const walkers = new Set();
  // Déplacements de cinématique
  for (let i = E.movers.length - 1; i >= 0; i--) {
    const m = E.movers[i], p = m.obj.position, dx = m.x - p.x, dz = m.z - p.z, d = Math.hypot(dx, dz), stepLen = m.speed * dt;
    if (d <= stepLen) { p.x = m.x; p.z = m.z; E.movers.splice(i, 1); m.res(); }
    else { p.x += (dx / d) * stepLen; p.z += (dz / d) * stepLen; turnTo(m.obj, Math.atan2(dx, dz), Math.min(1, dt * 12)); walkers.add(m.obj); }
  }
  if (pl && pl.userData.anim) animer(pl, dt, moving || walkers.has(pl), t);

  // Compagnons qui suivent
  let lead = pl;
  for (const f of E.followers) {
    if (!lead) break;
    let fm = walkers.has(f);
    if (!fm && !f.userData.stay) {
      const dx = lead.position.x - f.position.x, dz = lead.position.z - f.position.z, d = Math.hypot(dx, dz), ud = f.userData;
      const ax = f.position.x, az = f.position.z;
      ud.coince = d > 5 ? (ud.coince || 0) + dt : 0;              // trop loin trop longtemps (bloqué derrière un mur) : il rejoint le groupe
      if (d > 14 || ud.coince > 2.2) { f.position.set(lead.position.x - Math.sin(lead.rotation.y) * 1.1, 0, lead.position.z - Math.cos(lead.rotation.y) * 1.1); resolve(st, f.position, 0.3, f); ud.coince = 0; ud.gy = undefined; }
      else if (d > 1.9) {
        const sp = Math.min(PLAYER_SPEED * 1.05, (d - 1.5) * 4.5);
        f.position.x += (dx / d) * sp * dt; f.position.z += (dz / d) * sp * dt;
        turnTo(f, Math.atan2(dx, dz), Math.min(1, dt * 10)); fm = true;
      }
      // personne ne traverse personne : on s'écarte du joueur et des compagnons qui précèdent, puis des murs et des meubles
      if (free) {
        let pousse = false;
        if (pl && pl !== f) pousse = ecarter(f, pl, 0.78) || pousse;
        for (const g of E.followers) { if (g === f) break; if (g.visible) pousse = ecarter(f, g, 0.74) || pousse; }
        if (fm || pousse) resolve(st, f.position, 0.3, f);
        if (!fm && pousse && Math.hypot(f.position.x - ax, f.position.z - az) > dt * 0.6) fm = true;
      }
    }
    if (f.userData.anim) animer(f, dt, fm, t);
    if (f.visible && !f.userData.stay) lead = f;             // un compagnon absent (caché, ou qui attend ailleurs) n'entraîne pas les suivants derrière lui
  }

  // Tout le monde a les pieds sur le sol (dalles, marches, estrades)
  if (st.grille) {
    if (pl) poser(st, pl, dt);
    for (const f of E.followers) poser(st, f, dt);
    for (const k in st.actors) { const o = st.actors[k]; if (o.parent) poser(st, o, walkers.has(o) ? dt : null, !walkers.has(o)); }
    for (const m of st.mobs) if (!m.dead) poser(st, m.obj, dt);
  }

  // Animations du décor et des personnages
  for (const o of st.anims) if (o !== pl) animer(o, dt, walkers.has(o) || o.userData.moving, t);

  // Toits masqués quand le joueur est dessous
  for (const rf of st.roofs) rf.obj.visible = !!E.shotCam || !(pl && pl.position.x > rf.x1 && pl.position.x < rf.x2 && pl.position.z > rf.z1 && pl.position.z < rf.z2);

  // Ennemis visibles
  for (const m of st.mobs) {
    if (m.dead) continue;
    const o = m.obj; let mm = false;
    if (free && pl) {
      if (m.cool > 0) m.cool -= dt;
      const dxp = pl.position.x - o.position.x, dzp = pl.position.z - o.position.z, dp = Math.hypot(dxp, dzp);
      const dh = Math.hypot(o.position.x - m.home.x, o.position.z - m.home.z);
      let tx, tz, sp;
      if (m.cool <= 0 && dp < 7.5 && dh < m.roam + 9) { tx = pl.position.x; tz = pl.position.z; sp = m.speed; }
      else {
        m.t -= dt;
        if (m.t <= 0) { m.t = 2 + Math.random() * 3; const a = Math.random() * 6.28, rr = Math.random() * m.roam; m.tx = m.home.x + Math.cos(a) * rr; m.tz = m.home.z + Math.sin(a) * rr; }
        tx = m.tx; tz = m.tz; sp = 1.3;
      }
      const dx = tx - o.position.x, dz = tz - o.position.z, d = Math.hypot(dx, dz);
      if (d > 0.3) {
        o.position.x += (dx / d) * sp * dt; o.position.z += (dz / d) * sp * dt;
        for (const m2 of st.mobs) { if (m2 === m) break; if (!m2.dead) ecarter(o, m2.obj, 0.95); }
        resolve(st, o.position, 0.4); turnTo(o, Math.atan2(dx, dz), Math.min(1, dt * 8)); mm = true;
      }
      if (m.cool <= 0 && dp < 1.15 && st.onMob) { E.run(() => st.onMob(m)); }
    }
    o.userData.moving = mm;
  }

  if (free && pl) {
    // Déclencheurs de zone
    for (const tr of st.triggers) {
      if (tr.done) continue;
      const p = pl.position;
      if (p.x >= tr.x1 && p.x <= tr.x2 && p.z >= tr.z1 && p.z <= tr.z2 && (!tr.cond || tr.cond())) {
        if (tr.once !== false) tr.done = true;
        E.run(tr.action); break;
      }
    }
  }
  if (E.enabled && !E.busy && pl) {
    // Interactions
    let best = null, bd = 1e9;
    for (const it of st.inter) {
      if (it.off || (it.cond && !it.cond())) continue;
      const ix = it.obj ? it.obj.position.x : it.x, iz = it.obj ? it.obj.position.z : it.z;
      const d = Math.hypot(pl.position.x - ix, pl.position.z - iz);
      if (d < (it.r || 2) && d < bd) { bd = d; best = it; }
    }
    uiPrompt(best ? (Input.isTouch ? 'A : ' : 'E : ') + best.label : null);
    if (Input.okFlag) {
      Input.okFlag = false;
      if (best) {
        if (best.obj && best.turn !== false) { E.face(pl, best.obj.position.x, best.obj.position.z); if (best.obj.userData.P && !best.obj.userData.creature && !best.obj.userData.assis) E.face(best.obj, pl.position.x, pl.position.z); }
        E.run(best.action);
      }
    }
    if (Input.menuFlag) { Input.menuFlag = false; E.run(() => openMenu()); }
  } else { Input.okFlag = false; Input.menuFlag = false; }

  // Caméra : se rapproche vite si un obstacle cache le joueur, s'éloigne doucement ensuite
  if (!E.shotCam) { const td = camTargetDist(), cur = E.camDistCur || E.camDist; E.camDistCur = cur + (td - cur) * (1 - Math.exp(-dt * (td < cur ? 14 : 2.5))); }
  const d = desiredCam();
  const k = E.shotCam ? 1 - Math.exp(-dt * 3.2) : 1 - Math.exp(-dt * 9);
  E.camera.position.lerp(d.pos, k);
  E.camLook.lerp(d.look, k);
  E.camera.lookAt(E.camLook);
  trier(st);
};

// ---------- Ne dessiner et n'animer que ce que l'on voit ----------
// Un personnage, c'est 25 000 triangles et 65 os. Hors du champ de la caméra son corps n'est pas dessiné, et son animation
// n'avance qu'une image sur six (elle reste à l'heure pour le moment où il reviendra à l'écran) ; loin, une image sur deux.
function trier(st) {
  reglerChamp(E.camera);
  const voir = (o) => {
    const u = o.userData; if (!u.corps) return;
    const vu = dansChamp(o); u.vu = vu; if (u.corps.visible !== vu) u.corps.visible = vu;
    const d = distanceCamera(o);
    u.loin = vu && d > Q.loin;
    // le détail suit la distance (avec une marge, pour ne pas hésiter entre les deux versions)
    if (u.details && u.details.length) { const l = d > (u.detailLoin ? Q.lod - 2 : Q.lod); if (l !== !!u.detailLoin) { u.detailLoin = l; reglerDetail(u.details, l); } }
  };
  if (E.player) voir(E.player);
  for (const f of E.followers) voir(f);
  for (const o of st.anims) voir(o);
  // le décor : chaque case (ou chaque groupe de copies) passe sur sa version allégée quand elle est loin de la caméra
  const D = st.details;
  if (D && D.length) { const pc = E.camera.position; for (const e of D) { const l = pc.distanceTo(e.c) - e.r > (e.etat ? Q.lodDecor - 3 : Q.lodDecor); if (l !== e.etat) { e.etat = l; e.m.geometry = l ? e.loin : e.pres; } } }
}
function animer(o, dt, marche, t) {
  const u = o.userData;
  if (u.corps) {
    const pas = u.vu === false ? 6 : u.loin && !marche ? 2 : 1;
    if (pas > 1) {
      if (u.tour === undefined) u.tour = Math.floor(Math.random() * pas);
      u.attente = (u.attente || 0) + dt; u.tour = (u.tour + 1) % pas; if (u.tour) return;
      dt = u.attente; u.attente = 0;
    } else if (u.attente) { dt += u.attente; u.attente = 0; }
  }
  u.anim(dt, marche, t);
}

export { THREE };
