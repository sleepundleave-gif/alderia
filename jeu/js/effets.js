// ============================================================
//  EFFETS VISUELS DES COMBATS
//  Feu, glace, vent, terre, poison, lumière... Tout est fabriqué ici, sans fichier d'image :
//    - les textures (halo, flamme, fumée, éclat de glace, flocon, anneau...) sont dessinées sur un canevas ;
//    - les particules sont de petits carrés toujours tournés vers la caméra, dessinés tous ensemble
//      en un seul appel (« instances ») : des centaines de flammèches ne coûtent presque rien ;
//    - les grandes formes (cercle magique au sol, colonne de lumière, cristaux, pics de roche,
//      dôme protecteur, traînée de lame) sont de vrais objets 3D animés.
//  Dans Unity, l'équivalent serait le « Particle System » (ou VFX Graph) avec des matériaux additifs.
// ============================================================
import * as THREE from '../lib/three.module.min.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const R = (v) => (Array.isArray(v) ? rnd(v[0], v[1]) : v);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const outBack = (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
const outQuad = (t) => 1 - (1 - t) * (1 - t);
const ease = (t) => t * t * (3 - 2 * t);
const tA = new THREE.Color(), tB = new THREE.Color();

// Palettes : a = cœur très clair, b = couleur franche, c = couleur de fin (sombre)
export const PAL = {
  Feu: { a: 0xffe08a, b: 0xff5a0c, c: 0xa01c04 }, Eau: { a: 0xffffff, b: 0x8fdcff, c: 0x2a78d8 }, Vent: { a: 0xf2fff0, b: 0x9af0a0, c: 0x3aa860 },
  Terre: { a: 0xffe8b0, b: 0xc09a50, c: 0x6a4a28 }, Foudre: { a: 0xffffff, b: 0xf7e85a, c: 0xc09a10 }, 'Lumière': { a: 0xffffff, b: 0xfff0a0, c: 0xffc040 },
  Ombre: { a: 0xf0d8ff, b: 0xa060f0, c: 0x4a1a90 }, Poison: { a: 0xe8ffb0, b: 0x8ae03a, c: 0x7a3ac0 }, Sang: { a: 0xffd8c8, b: 0xff4030, c: 0x900808 }, Acier: { a: 0xffffff, b: 0xd8e8ff, c: 0x7090c0 },
};
const pal = (el) => PAL[el] || PAL.Ombre;

// ---------- Textures dessinées ----------
// Cases de la planche : 0 halo, 1 flamme, 2 fumée, 3 étincelle, 4 éclat, 5 flocon, 6 anneau, 7 trait,
// 8 croissant, 9 caillou, 10 bulle, 11 « Z », 12 étoile, 13 plus, 14 goutte, 15 flèche vers le haut
let TEX = null;
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function texOf(c, repeat) { const t = new THREE.CanvasTexture(c); t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; if (repeat) t.wrapS = THREE.RepeatWrapping; return t; }
function halo(g, r, stops) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); for (const [o, a] of stops) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); }
function makeTextures() {
  const N = 128, [cv, g] = canvas(N * 4, N * 4);
  const cell = (i, fn) => { g.save(); g.translate((i % 4) * N + N / 2, Math.floor(i / 4) * N + N / 2); g.beginPath(); g.rect(-N / 2 + 1, -N / 2 + 1, N - 2, N - 2); g.clip(); fn(N / 2 - 8); g.restore(); };
  cell(0, (r) => halo(g, r, [[0, 1], [0.2, 0.7], [0.5, 0.22], [1, 0]]));
  cell(1, (r) => { for (let i = 0; i < 9; i++) { g.save(); g.translate(rnd(-r * 0.35, r * 0.35), rnd(-r * 0.35, r * 0.35)); halo(g, r * rnd(0.35, 0.6), [[0, 0.55], [0.5, 0.25], [1, 0]]); g.restore(); } });
  cell(2, (r) => { for (let i = 0; i < 14; i++) { g.save(); g.translate(rnd(-r * 0.4, r * 0.4), rnd(-r * 0.4, r * 0.4)); halo(g, r * rnd(0.3, 0.55), [[0, 0.3], [0.6, 0.12], [1, 0]]); g.restore(); } });
  cell(3, (r) => { halo(g, r * 0.45, [[0, 1], [0.4, 0.4], [1, 0]]); for (const a of [0, Math.PI / 2]) { g.save(); g.rotate(a); g.scale(1, 0.07); halo(g, r, [[0, 1], [0.5, 0.5], [1, 0]]); g.restore(); } });
  cell(4, (r) => { const gr = g.createLinearGradient(-r * 0.3, -r, r * 0.3, r); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,.95)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.32, -r * 0.1); g.lineTo(0, r); g.lineTo(-r * 0.32, -r * 0.1); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -r); g.lineTo(0, r); g.stroke(); });
  cell(5, (r) => { halo(g, r * 0.5, [[0, 0.6], [1, 0]]); g.strokeStyle = '#fff'; g.lineWidth = 4; g.lineCap = 'round'; for (let i = 0; i < 6; i++) { g.save(); g.rotate(i * Math.PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -r * 0.9); g.moveTo(0, -r * 0.5); g.lineTo(r * 0.2, -r * 0.7); g.moveTo(0, -r * 0.5); g.lineTo(-r * 0.2, -r * 0.7); g.stroke(); g.restore(); } });
  cell(6, (r) => { g.shadowColor = '#fff'; g.shadowBlur = 10; g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, r * 0.8, 0, 7); g.stroke(); });
  cell(7, (r) => { g.scale(1, 0.12); halo(g, r, [[0, 1], [0.3, 0.8], [1, 0]]); });
  cell(8, (r) => { g.shadowColor = '#fff'; g.shadowBlur = 8; g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r * 0.85, -1.2, 1.2); g.arc(-r * 0.45, 0, r * 0.95, 0.95, -0.95, true); g.closePath(); g.fill(); });
  cell(9, (r) => { const gr = g.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#6a6a6a'); g.fillStyle = gr; g.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283, q = r * rnd(0.6, 0.9); g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fill(); });
  cell(10, (r) => { halo(g, r * 0.8, [[0, 0.08], [0.8, 0.25], [1, 0]]); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r * 0.7, 0, 7); g.stroke(); g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, r * 0.48, -2.4, -1.5); g.stroke(); });
  cell(11, (r) => { g.fillStyle = '#fff'; g.font = `bold ${Math.round(r * 1.7)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#fff'; g.shadowBlur = 6; g.fillText('Z', 0, 4); });
  cell(12, (r) => { g.shadowColor = '#fff'; g.shadowBlur = 8; g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? r * 0.38 : r * 0.85; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fill(); });
  cell(13, (r) => { g.shadowColor = '#fff'; g.shadowBlur = 8; g.fillStyle = '#fff'; g.fillRect(-r * 0.18, -r * 0.7, r * 0.36, r * 1.4); g.fillRect(-r * 0.7, -r * 0.18, r * 1.4, r * 0.36); });
  cell(14, (r) => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -r * 0.9); g.bezierCurveTo(r * 0.7, 0, r * 0.55, r * 0.8, 0, r * 0.8); g.bezierCurveTo(-r * 0.55, r * 0.8, -r * 0.7, 0, 0, -r * 0.9); g.fill(); });
  cell(15, (r) => { g.shadowColor = '#fff'; g.shadowBlur = 6; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -r * 0.85); g.lineTo(r * 0.6, -r * 0.1); g.lineTo(r * 0.22, -r * 0.1); g.lineTo(r * 0.22, r * 0.8); g.lineTo(-r * 0.22, r * 0.8); g.lineTo(-r * 0.22, -r * 0.1); g.lineTo(-r * 0.6, -r * 0.1); g.closePath(); g.fill(); });
  const T = { planche: texOf(cv) };
  { // traînée de lame : un croissant brillant sur son bord extérieur
    const [c, x] = canvas(256, 256); x.translate(128, 128); x.shadowColor = '#fff'; x.shadowBlur = 12; x.fillStyle = '#fff';
    x.beginPath(); x.arc(-10, 0, 108, -1.25, 1.25); x.arc(-58, 0, 128, 0.93, -0.93, true); x.closePath(); x.fill();
    x.shadowBlur = 0; x.globalCompositeOperation = 'destination-in'; const gr = x.createRadialGradient(-10, 0, 70, -10, 0, 116); gr.addColorStop(0, 'rgba(255,255,255,.08)'); gr.addColorStop(0.75, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = gr; x.fillRect(-128, -128, 256, 256);
    T.lame = texOf(c);
  }
  { // onde de choc au sol
    const [c, x] = canvas(256, 256); x.translate(128, 128); const gr = x.createRadialGradient(0, 0, 0, 0, 0, 126);
    for (const [o, a] of [[0, 0], [0.5, 0.04], [0.78, 0.6], [0.88, 1], [0.94, 0.5], [1, 0]]) gr.addColorStop(o, `rgba(255,255,255,${a})`); x.fillStyle = gr; x.fillRect(-128, -128, 256, 256);
    T.onde = texOf(c);
  }
  { // cercle magique
    const [c, x] = canvas(512, 512); x.translate(256, 256); x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.shadowColor = '#fff'; x.shadowBlur = 16; x.lineWidth = 6;
    for (const r of [236, 212, 118]) { x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); }
    for (const a0 of [0, Math.PI]) { x.beginPath(); for (let i = 0; i < 3; i++) { const a = a0 + i * 2.0944 - Math.PI / 2; x[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 212, Math.sin(a) * 212); } x.closePath(); x.stroke(); }
    x.lineWidth = 4; for (let i = 0; i < 36; i++) { const a = i / 36 * 6.283; x.beginPath(); x.moveTo(Math.cos(a) * 218, Math.sin(a) * 218); x.lineTo(Math.cos(a) * 231, Math.sin(a) * 231); x.stroke(); }
    for (let i = 0; i < 6; i++) { const a = i * 1.0472 - Math.PI / 2; x.beginPath(); x.arc(Math.cos(a) * 212, Math.sin(a) * 212, 13, 0, 7); x.fill(); }
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + 0.26; x.save(); x.translate(Math.cos(a) * 165, Math.sin(a) * 165); x.rotate(a + Math.PI / 2); x.beginPath(); x.moveTo(-9, -12); x.lineTo(9, -4); x.lineTo(-9, 4); x.lineTo(9, 12); x.stroke(); x.restore(); }
    halo(x, 110, [[0, 0.35], [1, 0]]);
    T.cercle = texOf(c);
  }
  { // colonne de lumière : forte en bas, transparente en haut, avec des filets plus clairs
    const [c, x] = canvas(64, 256); const grad = (a) => { const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.45, `rgba(255,255,255,${a * 0.35})`); gr.addColorStop(1, `rgba(255,255,255,${a})`); return gr; };
    x.fillStyle = grad(0.55); x.fillRect(0, 0, 64, 256); for (let i = 0; i < 16; i++) { x.fillStyle = grad(rnd(0.3, 0.9)); x.fillRect(Math.random() * 64, 0, rnd(1, 4), 256); }
    T.colonne = texOf(c, true);
  }
  return T;
}

// ---------- Particules (carrés tournés vers la caméra, tous dessinés en un seul appel) ----------
const VERT = `
attribute vec3 iPos; attribute vec4 iPar; attribute vec3 iCol; attribute float iAsp;
varying vec2 vUv; varying vec4 vCol;
void main() {
  float c = cos(iPar.y), s = sin(iPar.y);
  vec2 q = position.xy * vec2(iAsp, 1.0) * iPar.x;
  q = vec2(q.x * c - q.y * s, q.x * s + q.y * c);
  vec4 mv = viewMatrix * vec4(iPos, 1.0);
  mv.xy += q;
  gl_Position = projectionMatrix * mv;
  vec2 cc = vec2(mod(iPar.z, 4.0), floor(iPar.z / 4.0));
  vec2 u = uv * 0.96 + 0.02;
  vUv = vec2((cc.x + u.x) / 4.0, 1.0 - (cc.y + 1.0 - u.y) / 4.0);
  vCol = vec4(iCol, iPar.w);
}`;
const FRAG = `
uniform sampler2D map; uniform float uCorps; varying vec2 vUv; varying vec4 vCol;
void main() {
  vec4 t = texture2D(map, vUv);
  gl_FragColor = vec4(vCol.rgb * t.rgb, t.a * vCol.a);
  #include <colorspace_fragment>
  // uCorps = 0 : lumière pure (s'ajoute au décor). uCorps = 1 : couleur pleine (cache le décor).
  // Entre les deux, le feu garde sa vraie couleur même devant une prairie claire.
  gl_FragColor = vec4(gl_FragColor.rgb * gl_FragColor.a, gl_FragColor.a * uCorps);
}`;
class Nuage {
  constructor(tex, additive, max) {
    const base = new THREE.PlaneGeometry(1, 1), geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index; geo.setAttribute('position', base.attributes.position); geo.setAttribute('uv', base.attributes.uv);
    const attr = (n) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(max * n), n); a.setUsage(THREE.DynamicDrawUsage); return a; };
    this.aPos = attr(3); this.aPar = attr(4); this.aCol = attr(3); this.aAsp = attr(1);
    geo.setAttribute('iPos', this.aPos); geo.setAttribute('iPar', this.aPar); geo.setAttribute('iCol', this.aCol); geo.setAttribute('iAsp', this.aAsp);
    geo.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({ uniforms: { map: { value: tex }, uCorps: { value: additive ? 0.6 : 1 } }, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
    this.mesh = new THREE.Mesh(geo, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = additive ? 12 : 11; this.mesh.visible = false;
    this.max = max; this.list = [];
  }
  add(p) { if (this.list.length < this.max) this.list.push(p); }
  update(dt) {
    const L = this.list, P = this.aPos.array, A = this.aPar.array, Cc = this.aCol.array, S = this.aAsp.array; let n = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i]; p.age += dt;
      if (p.age >= p.life) { L[i] = L[L.length - 1]; L.pop(); i--; continue; }
      if (p.age < 0) continue;
      const k = p.age / p.life;
      p.vy -= p.g * dt; if (p.drag) { const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d; p.vz *= d; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.align) p.rot = Math.atan2(p.vy, p.vx) + p.off; else p.rot += p.spin * dt;
      P[n * 3] = p.x; P[n * 3 + 1] = p.y; P[n * 3 + 2] = p.z;
      A[n * 4] = p.s0 + (p.s1 - p.s0) * k; A[n * 4 + 1] = p.rot; A[n * 4 + 2] = p.cell; A[n * 4 + 3] = p.a * Math.min(1, k / p.fin) * Math.pow(1 - k, p.pow);
      const kc = Math.min(1, k * 2.4);      // la couleur passe vite du cœur clair à la teinte franche
      Cc[n * 3] = p.r0 + (p.r1 - p.r0) * kc; Cc[n * 3 + 1] = p.g0 + (p.g1 - p.g0) * kc; Cc[n * 3 + 2] = p.b0 + (p.b1 - p.b0) * kc;
      S[n] = p.asp; n++;
    }
    this.mesh.geometry.instanceCount = n; this.mesh.visible = n > 0;
    if (n) { this.aPos.needsUpdate = this.aPar.needsUpdate = this.aCol.needsUpdate = this.aAsp.needsUpdate = true; }
  }
}

// Matériau « lumière » des formes 3D (cercles, colonnes, traînées) : même mélange que les particules
function corps(sh) { sh.fragmentShader = sh.fragmentShader.replace('#include <premultiplied_alpha_fragment>', 'gl_FragColor = vec4(gl_FragColor.rgb * gl_FragColor.a, gl_FragColor.a * 0.55);'); }
function lumMat(tex, color, o = {}) { const m = new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, ...o }); m.onBeforeCompile = corps; return m; }

// ---------- Formes 3D partagées ----------
let GEO = null, MAT = null;
function makeShared() {
  GEO = {
    plat: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), face: new THREE.PlaneGeometry(1, 1),
    tube: new THREE.CylinderGeometry(1, 1, 1, 20, 1, true).translate(0, 0.5, 0),
    cristal: new THREE.ConeGeometry(1, 1, 6).translate(0, 0.5, 0), pic: new THREE.ConeGeometry(1, 1, 5).translate(0, 0.5, 0),
    bloc: new THREE.IcosahedronGeometry(1, 0), roc: new THREE.DodecahedronGeometry(1, 0), dome: new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
  };
  MAT = {
    glace: new THREE.MeshStandardMaterial({ color: 0xc8ecff, emissive: 0x2a6ab0, emissiveIntensity: 0.7, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.86, flatShading: true }),
    bloc: new THREE.MeshStandardMaterial({ color: 0xc8ecff, emissive: 0x2a6ab0, emissiveIntensity: 0.5, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.5, flatShading: true, depthWrite: false }),
    roche: new THREE.MeshStandardMaterial({ color: 0x8a6c4c, roughness: 1, metalness: 0, flatShading: true }),
  };
}
const DOME_V = 'varying vec3 vN, vV, vP; void main() { vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }';
const DOME_F = `uniform vec3 uColor; uniform float uAlpha, uTime; varying vec3 vN, vV, vP;
void main() {
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
  float l = smoothstep(0.9, 1.0, sin(vP.y * 20.0 - uTime * 7.0)) * 0.45 + smoothstep(0.92, 1.0, sin(atan(vP.z, vP.x) * 12.0)) * 0.35;
  gl_FragColor = vec4(uColor * (f * 1.7 + l + 0.1), uAlpha);
  #include <colorspace_fragment>
}`;

// ============================================================
//  Le gestionnaire d'effets d'un combat
//  H : outils fournis par battle.js { tween, S, lunge, goHome, castPose, sfx, speed, shake, flash, tint, freeze }
// ============================================================
export class Effets {
  constructor(scene, camera, H) {
    if (!TEX) { TEX = makeTextures(); makeShared(); }
    this.scene = scene; this.cam = camera; this.H = H; this.time = 0;
    this.lum = new Nuage(TEX.planche, true, 1600); this.fum = new Nuage(TEX.planche, false, 500);
    scene.add(this.fum.mesh, this.lum.mesh);
    this.jobs = []; this.cristaux = [];
    // Deux lampes présentes dès le début (éteintes) : en allumer une pendant le combat ne provoque alors aucun à-coup
    this.lampes = [0, 1].map(() => { const l = new THREE.PointLight(0xffffff, 0, 14, 1.6); l.userData = { t: 1, dur: 1, power: 0, held: false }; scene.add(l); return l; });
    this.nLampe = 0;
  }
  // --- repères sur un combattant ---
  dir(c) { return c.isHero ? 1 : -1; }
  feet(c) { return V(c.obj.position.x, 0.05, c.obj.position.z); }
  mid(c) { return V(c.obj.position.x, c.height * 0.55, c.obj.position.z); }
  top(c) { return V(c.obj.position.x, c.height + 0.25, c.obj.position.z); }
  hand(c) { return V(c.obj.position.x + this.dir(c) * 0.55, Math.min(1.45, c.height * 0.75), c.obj.position.z); }
  W(ms) { return this.H.S(ms); }
  T(ms, fn) { return this.H.tween(ms, fn); }

  // --- boucle ---
  update(dt) {
    const d = dt * Math.min(30, this.H.speed()); this.time += d;
    this.lum.update(d); this.fum.update(d);
    for (let i = this.jobs.length - 1; i >= 0; i--) {
      const j = this.jobs[i]; j.t += d; const k = Math.min(1, j.t / j.dur);
      if (j.fn) j.fn(k, j.obj);
      if (k >= 1) { this.jobs.splice(i, 1); if (j.obj) { this.scene.remove(j.obj); if (!j.keep && j.obj.material) j.obj.material.dispose(); } if (j.end) j.end(); if (j.res) j.res(); }
    }
    for (const l of this.lampes) { const u = l.userData; if (u.held) continue; u.t += d; const k = Math.min(1, u.t / u.dur); l.intensity = u.power * (1 - k) * (1 - k); }
  }
  dispose() {
    for (const j of this.jobs) if (j.obj) { this.scene.remove(j.obj); if (!j.keep && j.obj.material) j.obj.material.dispose(); }
    for (const m of this.cristaux) this.scene.remove(m);
    this.jobs.length = 0; this.cristaux.length = 0; this.lum.list.length = 0; this.fum.list.length = 0;
    for (const n of [this.lum, this.fum]) { this.scene.remove(n.mesh); n.mesh.geometry.dispose(); n.mesh.material.dispose(); }
  }
  job(obj, ms, fn, o = {}) { if (obj) this.scene.add(obj); if (fn) fn(0, obj); return new Promise((res) => this.jobs.push({ obj, t: 0, dur: Math.max(0.001, ms / 1000), fn, res, keep: o.keep, end: o.end })); }
  later(ms, fn) { this.jobs.push({ t: 0, dur: Math.max(0.001, ms / 1000), end: fn }); }

  // --- émission de particules ---
  emit(o) {
    const sys = o.fum ? this.fum : this.lum, n = o.n || 1, col = Array.isArray(o.color) ? o.color : [o.color, o.color];
    tA.set(col[0]); tB.set(col[1]);
    for (let i = 0; i < n; i++) {
      let ox = 0, oy = 0, oz = 0;
      if (o.rad) { const a = Math.random() * 6.283, u = o.flat ? 0 : Math.random() * 2 - 1, q = Math.sqrt(1 - u * u), rr = o.rad * (o.shell ? 1 : Math.cbrt(Math.random())); ox = Math.cos(a) * q * rr; oz = Math.sin(a) * q * rr; oy = u * rr; }
      const life = R(o.life || 0.5); let vx = 0, vy = 0, vz = 0;
      if (o.vel) { vx = o.vel.x; vy = o.vel.y; vz = o.vel.z; }
      if (o.spread) { const a = Math.random() * 6.283, u = o.flat ? 0 : Math.random() * 2 - 1, q = Math.sqrt(1 - u * u), s = R(o.spread); vx += Math.cos(a) * q * s; vy += u * s; vz += Math.sin(a) * q * s * (o.flat ? 1 : 0.6); }
      if (o.inward) { vx -= ox / life; vy -= oy / life; vz -= oz / life; }
      if (o.out) { const l = Math.hypot(ox, oy, oz) || 1, s = R(o.out); vx += ox / l * s; vy += oy / l * s; vz += oz / l * s; }
      if (o.up) vy += R(o.up);
      const s0 = R(o.size || 0.5);
      sys.add({ x: o.pos.x + ox, y: o.pos.y + oy, z: o.pos.z + oz, vx, vy, vz, age: -(o.delay ? R(o.delay) : 0), life, s0, s1: s0 * (o.grow === undefined ? 1 : o.grow),
        rot: o.rot === undefined ? Math.random() * 6.283 : o.rot, spin: R(o.spin || 0), cell: o.cell || 0, r0: tA.r, g0: tA.g, b0: tA.b, r1: tB.r, g1: tB.g, b1: tB.b,
        a: o.a === undefined ? 1 : o.a, fin: o.fin || 0.1, pow: o.pow === undefined ? 1.5 : o.pow, g: o.g || 0, drag: o.drag || 0, asp: o.asp || 1, align: !!o.align, off: o.off || 0 });
    }
  }

  // ============================================================
  //  BRIQUES : petits effets réutilisés par tous les sorts
  // ============================================================
  flash(p, color, size = 2, life = 0.18) { this.emit({ pos: p, cell: 0, color, size, grow: 1.8, life, fin: 0.05, pow: 1 }); }
  sparks(p, color, n = 14, sp = 6, size = 0.55) { this.emit({ pos: p, n, cell: 7, color: [0xffffff, color], size: [size * 0.6, size], grow: 0.3, life: [0.2, 0.45], spread: [sp * 0.35, sp], g: 9, drag: 1.5, align: true }); }
  shock(p, color, size = 3, life = 0.35) { this.emit({ pos: p, cell: 6, color: [0xffffff, color], size: 0.5, grow: size * 2, life, a: 0.9, pow: 1.2, fin: 0.05 }); }
  smoke(p, n = 6, size = 1, color = [0x4a423c, 0x15120f]) { this.emit({ fum: true, pos: p, n, cell: 2, color, size: [size * 0.6, size], grow: 2.4, life: [0.7, 1.3], up: [0.6, 1.6], spread: [0, 0.6], drag: 1, a: 0.55, fin: 0.15, pow: 1.2, spin: [-1, 1], rad: 0.3, delay: [0, 0.15] }); }
  dust(p, n = 10, color = [0xd8c8a8, 0x8a7a60]) { this.emit({ fum: true, pos: p, n, cell: 2, color, size: [0.6, 1.1], grow: 2.2, life: [0.5, 1], rad: 0.3, flat: true, out: [1, 3.2], up: [0.2, 1], drag: 2, a: 0.5, fin: 0.1, pow: 1.3, spin: [-1, 1] }); }
  embers(p, n = 12, color = [0xffd070, 0xff4a08], up = [1.5, 4]) { this.emit({ pos: p, n, cell: 0, color, size: [0.08, 0.2], grow: 0.4, life: [0.5, 1.2], up, spread: [0.3, 1.5], g: 1.5, drag: 0.8, rad: 0.3 }); }
  flames(p, n = 10, rad = 0.4, color = [0xffd870, 0xff3a04], size = 0.8, up = [1.5, 3.5]) { this.emit({ pos: p, n, cell: 1, color, size: [size * 0.6, size], grow: 0.35, life: [0.3, 0.6], up, spread: [0, 0.6], rad, flat: true, spin: [-3, 3], a: 0.9, pow: 1.3 }); }
  converge(p, color, n = 12, ms = 240, cell = 7) { this.emit({ pos: p, n, cell, color: [color, 0xffffff], size: [0.25, 0.5], grow: 0.5, life: ms / 1000, rad: 1.3, shell: true, inward: true, align: cell === 7, fin: 0.3, pow: 0.4 }); }
  rise(p, cell, color, n = 6, o = {}) { this.emit({ pos: p, n, cell, color, size: o.size || [0.2, 0.34], grow: o.grow || 1, life: o.life || [0.6, 1.1], up: o.up || [1, 2.4], rad: o.rad || 0.55, flat: true, rot: o.rot === 'hasard' ? undefined : (o.rot || 0), spin: o.spin || 0, drag: 0.6, delay: o.delay === undefined ? [0, 0.25] : o.delay, fin: 0.2, pow: 1 }); }
  light(p, color, power = 3, ms = 320) { const l = this.lampes[this.nLampe++ % 2]; if (l.userData.held) return; l.color.set(color); l.position.set(p.x, Math.max(0.6, p.y), p.z + 0.6); l.userData = { t: 0, dur: ms / 1000, power, held: false }; l.intensity = power; }
  hold(color, power) { const l = this.lampes[this.nLampe++ % 2]; l.color.set(color); l.intensity = power; l.userData.held = true; return { set: (p) => l.position.set(p.x, p.y, p.z + 0.5), off: () => { l.userData = { t: 0, dur: 0.3, power, held: false }; } }; }

  explosion(p, P = PAL.Feu, s = 1) {
    this.flash(p, P.a, 3 * s, 0.22);
    this.emit({ pos: p, n: Math.round(20 * s), cell: 1, color: [P.a, P.b], size: [0.7 * s, 1.3 * s], grow: 0.5, life: [0.28, 0.55], spread: [1.5, 5 * s], drag: 3, a: 0.95, spin: [-3, 3] });
    this.emit({ pos: p, n: Math.round(12 * s), cell: 1, color: [P.b, P.c], size: [0.8 * s, 1.5 * s], grow: 0.8, life: [0.4, 0.75], spread: [0.5, 2.5 * s], drag: 2, a: 0.8, spin: [-2, 2], delay: [0.03, 0.1] });
    this.shock(p, P.b, 4.5 * s); this.sparks(p, P.b, Math.round(18 * s), 9 * s);
    this.smoke(p, Math.round(5 * s), 1.2 * s); this.embers(p, Math.round(12 * s), [P.a, P.b]);
    this.light(p, P.b, 4.5 * s, 380); this.H.shake(0.18 * s);
  }
  iceBurst(p, s = 1) {
    this.flash(p, 0xcfeeff, 2.6 * s, 0.2);
    this.emit({ pos: p, n: Math.round(16 * s), cell: 4, color: [0xffffff, 0x8fdcff], size: [0.3 * s, 0.7 * s], grow: 0.6, life: [0.35, 0.7], spread: [2, 7 * s], g: 8, drag: 1.5, align: true, off: -Math.PI / 2 });
    this.emit({ pos: p, n: Math.round(12 * s), cell: 5, color: [0xffffff, 0xbfe9ff], size: [0.15, 0.35], life: [0.6, 1.2], spread: [0.5, 3], g: 1.5, drag: 2, spin: [-3, 3] });
    this.emit({ fum: true, pos: p, n: Math.round(5 * s), cell: 2, color: [0xf0faff, 0xa8d8f8], size: [0.8 * s, 1.3 * s], grow: 2, life: [0.6, 1.1], spread: [0.2, 1], a: 0.35, fin: 0.15, pow: 1.2, rad: 0.3 });
    this.shock(p, 0xbfe9ff, 4 * s); this.light(p, 0x8fdcff, 3.5 * s, 380);
  }
  splash(p, P = PAL.Poison, s = 1) {
    this.flash(p, P.a, 1.8 * s, 0.16);
    this.emit({ pos: p, n: Math.round(16 * s), cell: 14, color: [P.a, P.b], size: [0.14, 0.3], life: [0.4, 0.75], spread: [1.5, 5 * s], up: [0.5, 2], g: 10, align: true, off: Math.PI / 2 });
    this.emit({ pos: p, n: Math.round(9 * s), cell: 10, color: [P.a, P.c], size: [0.15, 0.35], grow: 1.5, life: [0.6, 1.2], up: [0.4, 1.4], rad: 0.6, drag: 0.5, delay: [0, 0.3], rot: 0 });
    this.emit({ fum: true, pos: p, n: Math.round(4 * s), cell: 2, color: [P.b, P.c], size: [0.7, 1.1], grow: 2, life: [0.6, 1], up: [0.3, 0.9], a: 0.4, fin: 0.15, pow: 1.2, rad: 0.3 });
  }
  claws(p, color, d) { for (let i = 0; i < 3; i++) this.emit({ pos: V(p.x + (i - 1) * 0.28 * d, p.y + (i - 1) * 0.12, p.z + 0.3), cell: 7, color: [0xffffff, color], size: 2.3, grow: 1.25, life: 0.24, rot: d > 0 ? -1.05 : 1.05 + Math.PI, delay: i * 0.035, fin: 0.15, pow: 0.9 }); this.sparks(p, color, 8, 5); }

  // --- objets 3D ---
  plat(tex, color) { const m = new THREE.Mesh(GEO.plat, lumMat(tex, color)); m.renderOrder = 8; return m; }
  ring(p, color, r0, r1, ms = 450, a = 0.9) { const m = this.plat(TEX.onde, color); m.position.set(p.x, 0.07, p.z); return this.job(m, ms, (k) => { const r = r0 + (r1 - r0) * outQuad(k); m.scale.set(r * 2, 1, r * 2); m.material.opacity = a * Math.pow(1 - k, 1.3); }); }
  rune(p, color, r, ms = 700, spin = 1.6) { const m = this.plat(TEX.cercle, color); m.position.set(p.x, 0.06, p.z); return this.job(m, ms, (k) => { const s = r * 2 * (k < 0.2 ? outBack(k / 0.2) : 1); m.scale.set(s, 1, s); m.rotation.y = k * spin; m.material.opacity = 0.95 * Math.min(1, k / 0.12) * (k > 0.72 ? (1 - k) / 0.28 : 1); }); }
  pillar(p, color, r, h, ms = 600, a = 0.8) {
    const m = new THREE.Mesh(GEO.tube, lumMat(TEX.colonne, color)); m.renderOrder = 9; m.position.set(p.x, 0, p.z);
    return this.job(m, ms, (k) => { const w = r * (1.25 - 0.45 * k); m.scale.set(w, h * Math.max(0.02, outQuad(Math.min(1, k * 5))), w); m.rotation.y = k * 2.5; m.material.opacity = a * Math.pow(Math.sin(Math.min(1, k * 1.1) * Math.PI), 0.7); });
  }
  slash(p, ang, color, len = 2.6, ms = 220, flip = false) {
    const m = new THREE.Mesh(GEO.face, lumMat(TEX.lame, color, { depthTest: false })); m.renderOrder = 13; m.position.set(p.x, p.y, p.z + 0.3);
    return this.job(m, ms, (k) => { m.quaternion.copy(this.cam.quaternion); m.rotateZ(ang + (flip ? -1 : 1) * (-0.8 + 1.2 * outQuad(k))); const s = len * (0.75 + 0.4 * k); m.scale.set(flip ? -s : s, s, 1); m.material.opacity = Math.min(1, k * 6) * Math.pow(1 - k, 0.9); });
  }
  // Lame qui tourne à plat autour d'un point (attaque tournoyante)
  whirl(p, color, r, ms = 450, turns = 2, y = 1) {
    const m = this.plat(TEX.lame, color); m.position.set(p.x, y, p.z); m.renderOrder = 10;
    return this.job(m, ms, (k) => { const s = r * 2 * (0.7 + 0.3 * k); m.scale.set(s, 1, s); m.rotation.y = -k * turns * 6.283; m.material.opacity = Math.pow(Math.sin(Math.min(1, k * 1.05) * Math.PI), 0.6); });
  }
  dome(p, color, r, ms = 800) {
    const mat = new THREE.ShaderMaterial({ uniforms: { uColor: { value: new THREE.Color(color) }, uAlpha: { value: 1 }, uTime: { value: 0 } }, vertexShader: DOME_V, fragmentShader: DOME_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const m = new THREE.Mesh(GEO.dome, mat); m.renderOrder = 9; m.position.set(p.x, 0, p.z);
    return this.job(m, ms, (k) => { const s = r * (k < 0.25 ? outBack(k / 0.25) : 1 + (k - 0.25) * 0.12); m.scale.setScalar(Math.max(0.01, s)); mat.uniforms.uTime.value = k * ms / 1000; mat.uniforms.uAlpha.value = k > 0.6 ? (1 - k) / 0.4 : 1; });
  }
  // Un cristal de glace qui jaillit du sol. Il reste là jusqu'à shatter().
  crystal(p, h, r, tx = 0, tz = 0, delay = 0) {
    const m = new THREE.Mesh(GEO.cristal, MAT.glace); m.position.set(p.x, -0.05, p.z); m.rotation.set(tx, Math.random() * 3, tz); m.scale.set(r, 0.01, r); m.visible = false; m.userData.h = h;
    this.scene.add(m); this.cristaux.push(m);
    this.later(delay, () => { m.visible = true; this.job(null, 170, (k) => { m.scale.y = h * Math.max(0.01, outBack(k)); }); this.emit({ pos: V(p.x, 0.2, p.z), n: 4, cell: 5, color: [0xffffff, 0xbfe9ff], size: [0.12, 0.25], life: [0.4, 0.8], spread: [0.5, 2], up: [0.5, 2], g: 3 }); });
    return m;
  }
  cluster(p, n, hMin, hMax, rad = 0.55) { for (let i = 0; i < n; i++) { const a = i / n * 6.283 + rnd(-0.3, 0.3), q = i === 0 ? 0 : rad * rnd(0.6, 1); this.crystal(V(p.x + Math.cos(a) * q, 0, p.z + Math.sin(a) * q), i === 0 ? hMax : rnd(hMin, hMax * 0.85), rnd(0.16, 0.3), Math.sin(a) * 0.35 * (i ? 1 : 0), -Math.cos(a) * 0.35 * (i ? 1 : 0), i * 35); } }
  shatter() {
    for (const m of this.cristaux) {
      if (m.visible) { const p = V(m.position.x, m.userData.h * 0.5, m.position.z); this.emit({ pos: p, n: 7, cell: 4, color: [0xffffff, 0x8fdcff], size: [0.25, 0.55], grow: 0.5, life: [0.35, 0.7], spread: [1.5, 5], up: [0, 2], g: 9, align: true, off: -Math.PI / 2, rad: 0.3 }); this.emit({ pos: p, n: 3, cell: 3, color: 0xffffff, size: [0.3, 0.6], life: [0.2, 0.4], rad: 0.4 }); }
      this.scene.remove(m);
    }
    if (this.cristaux.length) this.H.sfx('shatter');
    this.cristaux.length = 0;
  }
  spikes(p, n = 4, hMax = 2) {
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.283 + rnd(-0.4, 0.4), q = i === 0 ? 0 : rnd(0.35, 0.7), h = i === 0 ? hMax : rnd(0.8, hMax * 0.8), r = rnd(0.22, 0.4);
      const m = new THREE.Mesh(GEO.pic, MAT.roche); m.position.set(p.x + Math.cos(a) * q, -0.05, p.z + Math.sin(a) * q); m.rotation.set(Math.sin(a) * 0.3 * (i ? 1 : 0), Math.random() * 3, -Math.cos(a) * 0.3 * (i ? 1 : 0)); m.scale.set(r, 0.01, r);
      this.later(i * 30, () => this.job(m, 1050, (k) => { const u = k < 0.13 ? outBack(k / 0.13) : k > 0.78 ? 1 - (k - 0.78) / 0.22 : 1; m.scale.y = h * Math.max(0.01, u); }, { keep: true }));
    }
    this.emit({ fum: true, pos: V(p.x, 0.3, p.z), n: 14, cell: 9, color: [0xb89a70, 0x5a4028], size: [0.14, 0.34], life: [0.5, 0.9], spread: [1.5, 5], up: [2, 5], g: 14, spin: [-8, 8], a: 1, pow: 0.6 });
    this.dust(p, 10);
  }
  boulder(r) { const m = new THREE.Mesh(GEO.roc, MAT.roche); m.scale.setScalar(r); this.scene.add(m); return m; }
  // Déplace un point de « from » à « to » (avec une cloche de hauteur « arc ») ; each(p, k) est appelé à chaque image
  async travel(from, to, ms, arc, each) { const p = from.clone(); await this.T(ms, (k) => { p.lerpVectors(from, to, k); p.y += Math.sin(k * Math.PI) * arc; each(p, k); }); return to; }
  play(c, clip, speed = 1.5) { const u = c.obj.userData; if (u.imported && u.play) u.play(clip, { speed }); }

  // ============================================================
  //  RÉACTIONS : coup reçu, soin, mort, altérations
  // ============================================================
  impact(t, info = {}) {
    const p = this.mid(t), P = info.element ? pal(info.element) : null, col = P ? P.b : 0xffffff;
    this.flash(p, P ? P.a : 0xffffff, info.crit ? 3.2 : 1.6, 0.14);
    this.sparks(p, col, info.crit ? 26 : 10, info.crit ? 10 : 6);
    if (info.em > 1) this.shock(p, col, 3.6);
    if (info.crit) { this.shock(p, 0xffe060, 5.2); this.emit({ pos: p, cell: 3, color: [0xffffff, 0xffe060], size: 3.4, grow: 1.4, life: 0.26, rot: 0.4, fin: 0.05, pow: 1 }); this.H.flash('#ffffff', 0.32, 170); this.H.freeze(0.09); this.H.shake(0.3); this.light(p, 0xfff0c0, 4, 260); }
  }
  async soin(t, color = 0x9af5a0) {
    const f = this.feet(t);
    this.pillar(f, 0xfff4b0, 0.8, 3.2, 700, 0.6); this.rune(f, color, 1.1, 800);
    this.rise(V(f.x, 0.3, f.z), 13, [0xd8ffe0, color], 7);
    this.rise(V(f.x, 0.2, f.z), 3, [0xffffff, 0xfff0a0], 14, { size: [0.15, 0.35], up: [0.8, 2.6], spin: [-2, 2], rot: 'hasard', rad: 0.7 });
    this.light(this.mid(t), 0xc8ffb0, 2.2, 520);
    await this.W(430);
  }
  async ether(t) { const f = this.feet(t); this.pillar(f, 0x70b0ff, 0.7, 3, 650, 0.6); this.rune(f, 0x70b0ff, 1.0, 750); this.rise(V(f.x, 0.2, f.z), 3, [0xffffff, 0x70b0ff], 16, { size: [0.15, 0.35], up: [0.8, 2.6], spin: [-2, 2], rot: 'hasard', rad: 0.7 }); this.rise(V(f.x, 0.3, f.z), 10, [0xd8ecff, 0x4a8aff], 6, { size: [0.14, 0.26] }); this.light(this.mid(t), 0x70b0ff, 2, 500); await this.W(430); }
  async antidote(t) { const p = this.mid(t), f = this.feet(t); this.emit({ pos: p, n: 12, cell: 10, color: [0xd8a0ff, 0x7a3ac0], size: [0.2, 0.4], grow: 2, life: [0.25, 0.5], rad: 0.6, up: [0.5, 1.5], rot: 0 }); await this.W(200); this.shock(p, 0x9af5a0, 3); this.rune(f, 0x9af5a0, 1.0, 650); this.rise(V(f.x, 0.3, f.z), 13, [0xd8ffe0, 0x60e080], 7); await this.W(330); }
  mort(c) {
    const p = this.mid(c), s = Math.min(2, Math.max(0.8, c.height / 1.8));
    this.emit({ pos: p, n: Math.round(28 * s), cell: 0, color: [0xe8d8ff, 0x5a30b0], size: [0.1, 0.3], grow: 0.4, life: [0.6, 1.3], rad: 0.7 * s, up: [1, 3.2], spread: [0, 0.8], drag: 0.5, delay: [0, 0.35] });
    this.smoke(p, Math.round(5 * s), 1.1 * s, [0x504070, 0x201830]); this.shock(p, 0xb090ff, 3.2 * s);
  }
  garde(c) { const f = this.feet(c); this.dome(f, 0x9fc8ff, Math.max(1, c.height * 0.62), 550); this.ring(f, 0x9fc8ff, 0.3, 1.6, 400, 0.6); }
  charge(c) { const f = this.feet(c); this.converge(this.mid(c), 0xff5030, 18, 500); this.ring(f, 0xff4030, 2.6, 0.4, 500, 0.8); this.flames(f, 16, 0.8, [0xffb090, 0xc01808], 0.8, [1.5, 3.5]); this.light(this.mid(c), 0xff4030, 2.5, 600); this.H.shake(0.08); }
  statut(t, k) {
    const p = this.mid(t), f = this.feet(t);
    if (k === 'brulure') { this.flames(V(p.x, p.y * 0.5, p.z), 14, 0.5); this.embers(p, 8); }
    else if (k === 'gel') { this.iceBurst(p, 0.7); }
    else if (k === 'poison') { this.splash(p, PAL.Poison, 0.6); }
    else if (k === 'sommeil') { this.emit({ pos: this.top(t), n: 3, cell: 11, color: [0xffffff, 0xb090ff], size: [0.3, 0.45], grow: 1.6, life: 1.2, up: [0.6, 1], vel: V(0.3, 0, 0), rot: 0.2, delay: [0, 0.6], fin: 0.2, pow: 1 }); }
    else if (k === 'etourdi') { this.emit({ pos: this.top(t), n: 8, cell: 12, color: [0xfff0a0, 0xffb030], size: [0.2, 0.36], life: [0.4, 0.8], spread: [1.5, 4], g: 6, spin: [-8, 8] }); this.ring(f, 0xffe060, 0.3, 1.6, 350, 0.6); }
  }
  // Ambiance de l'arène : braises, lucioles, pollen, gouttes... (très discret, quelques particules par seconde)
  ambiance(kind, dt) {
    this.amb = (this.amb || 0) + dt * Math.min(30, this.H.speed()); if (this.amb < 0.16) return; this.amb = 0;
    const p = V(rnd(-9, 9), 0, rnd(-6, 3));
    if (kind === 'fire') { p.y = rnd(0, 1); this.emit({ pos: p, cell: 0, color: [0xffd070, 0xff4a08], size: [0.06, 0.16], life: [1.5, 3], up: [0.8, 2], vel: V(0.5, 0, 0), spread: [0, 0.4], a: 0.9, pow: 1 }); if (Math.random() < 0.25) this.emit({ fum: true, pos: p, cell: 2, color: [0x3a3030, 0x151010], size: [1.5, 2.5], grow: 1.8, life: [2, 3.5], up: [0.5, 1], vel: V(0.4, 0, 0), a: 0.22, fin: 0.3, pow: 1 }); }
    else if (kind === 'deep') { p.y = rnd(0.4, 3); this.emit({ pos: p, cell: 0, color: [0xe8ffb0, 0x60e0a0], size: [0.1, 0.2], life: [2, 3.5], spread: [0.1, 0.4], a: 0.9, fin: 0.3, pow: 1 }); }
    else if (kind === 'sewer') { if (Math.random() < 0.5) { p.y = 4.5; this.emit({ pos: p, cell: 14, color: [0xd8f0e8, 0x80b0a0], size: 0.13, life: 0.95, g: 9, rot: 0, a: 0.7, fin: 0.05, pow: 0.3 }); } else { p.y = 0.3; this.emit({ fum: true, pos: p, cell: 2, color: [0xa8c8b0, 0x607868], size: [1.5, 2.5], grow: 1.6, life: [2.5, 4], vel: V(0.3, 0.05, 0), a: 0.16, fin: 0.3, pow: 1 }); } }
    else if (kind === 'roofs') { p.y = rnd(0.5, 4); p.x = -10; this.emit({ pos: p, cell: 7, color: [0xffffff, 0xd8ecff], size: [0.8, 1.6], life: [0.8, 1.4], vel: V(13, 0, 0), a: 0.3, rot: 0, fin: 0.3, pow: 1 }); }
    else if (kind === 'river' || kind === 'bridge') { p.y = rnd(0.2, 1.2); this.emit({ fum: true, pos: p, cell: 2, color: [0xf0f8ff, 0xc0d8e0], size: [1.5, 2.5], grow: 1.5, life: [2.5, 4], vel: V(0.5, 0.05, 0), a: 0.14, fin: 0.3, pow: 1 }); }
    else { p.y = rnd(2.5, 5); this.emit({ fum: true, pos: p, cell: 14, color: [0xb8e078, 0x5a9a3a], size: [0.12, 0.2], life: [2.5, 4], vel: V(0.7, -0.9, 0.2), spread: [0, 0.3], spin: [-3, 3], a: 0.9, fin: 0.1, pow: 0.5 }); if (Math.random() < 0.5) this.emit({ pos: V(p.x, rnd(0.3, 2.5), p.z), cell: 0, color: [0xffffe0, 0xfff0a0], size: [0.05, 0.1], life: [2, 3.5], spread: [0.05, 0.3], a: 0.7, fin: 0.3, pow: 1 }); }
  }
  // Appelé à chaque image : petits effets qui restent tant que l'altération dure
  suivi(list, dt) {
    const d = dt * Math.min(30, this.H.speed());
    for (const c of list) {
      const s = c._fx || (c._fx = { t: Math.random() * 0.1, ice: null });
      if (c.hp <= 0 || !c.status.gel) { if (s.ice) { const m = s.ice; s.ice = null; this.scene.remove(m); if (c.hp > 0) { this.iceBurst(this.mid(c), 0.8); this.H.sfx('shatter'); } } }
      if (c.hp <= 0) continue;
      if (c.status.gel && !s.ice) { const m = new THREE.Mesh(GEO.bloc, MAT.bloc); m.renderOrder = 7; m.position.set(c.obj.position.x, c.height * 0.5, c.obj.position.z); m.scale.set(Math.max(0.7, c.height * 0.42), c.height * 0.62, Math.max(0.7, c.height * 0.42)); m.rotation.y = 0.4; this.scene.add(m); s.ice = m; }
      s.t += d; if (s.t < 0.11) continue; s.t = 0;
      const st = c.status, x = c.obj.position.x, z = c.obj.position.z, h = c.height;
      if (st.brulure) { this.emit({ pos: V(x + rnd(-0.3, 0.3), rnd(0.3, h * 0.8), z + rnd(-0.2, 0.3)), n: 2, cell: 1, color: [0xffd870, 0xff3a04], size: [0.3, 0.55], grow: 0.3, life: [0.3, 0.55], up: [1, 2.2], spin: [-3, 3], a: 0.85 }); if (Math.random() < 0.3) this.embers(V(x, h * 0.6, z), 1); }
      if (st.poison && Math.random() < 0.6) this.emit({ pos: V(x, h * 0.5, z), cell: 10, color: [0xd8ff90, 0x8a40d0], size: [0.12, 0.26], grow: 1.5, life: [0.6, 1.1], up: [0.5, 1.3], rad: 0.45, drag: 0.5, rot: 0 });
      if (st.sommeil && Math.random() < 0.16) this.emit({ pos: V(x + 0.2, h + 0.1, z), cell: 11, color: [0xffffff, 0xb090ff], size: 0.3, grow: 1.7, life: 1.3, up: [0.5, 0.8], vel: V(0.3, 0, 0), rot: 0.2, fin: 0.2, pow: 1 });
      if (st.etourdi) for (let j = 0; j < 3; j++) { const a = this.time * 5 + j * 2.094; this.emit({ pos: V(x + Math.cos(a) * 0.45, h + 0.2, z + Math.sin(a) * 0.45), cell: 12, color: [0xfff0a0, 0xffc040], size: 0.24, life: 0.16, fin: 0.3, pow: 0.5, rot: a }); }
      if (c.buffs.atk && Math.random() < 0.18) this.rise(V(x, 0.3, z), 15, [0xffd0a0, 0xff5020], 1, { size: 0.22, delay: 0, rad: 0.45 });
      if (c.buffs.def && Math.random() < 0.18) this.rise(V(x, 0.3, z), 15, [0xd0e8ff, 0x4a90ff], 1, { size: 0.22, delay: 0, rad: 0.45 });
      if (c.taunt > 0 && Math.random() < 0.35) this.emit({ pos: V(x, 0.2, z), cell: 1, color: [0xffb090, 0xc01808], size: [0.3, 0.5], grow: 0.3, life: [0.4, 0.7], up: [1.2, 2.4], rad: 0.5, flat: true, a: 0.7 });
    }
  }
}
