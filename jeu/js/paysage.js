// ============================================================
//  PAYSAGE : ciel, montagnes, nuages, eau, fumée et flammes
//  Tout est fabriqué par le programme (aucun fichier à télécharger) :
//  - la fumée et les flammes sont des nuées de petits panneaux toujours tournés vers la caméra
//    (des « billboards », le Particle System de Unity), animés par la carte graphique ;
//  - le ciel est une grande sphère peinte en dégradé, avec le halo du soleil ;
//  - les montagnes sont des reliefs bosselés, coloriés sommet par sommet (roche, forêt, neige, brume) ;
//  - l'eau est un plan dont la couleur ondule avec le temps (rides, reflets, écume sur les berges).
// ============================================================
import * as THREE from '../lib/three.module.min.js';

const TEMPS = { value: 0 };                                    // l'horloge commune de tous les effets
const tick = (dt, m, t) => { TEMPS.value = t; };
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const C = (c) => new THREE.Color(c);

// Bruit régulier (« value noise ») pour les fragments : sert à l'eau et aux sols
export const BRUIT_GLSL = `
float hachage(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float bruit(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hachage(i), hachage(i + vec2(1.0, 0.0)), f.x), mix(hachage(i + vec2(0.0, 1.0)), hachage(i + vec2(1.0, 1.0)), f.x), f.y); }
`;

// ---------- Textures dessinées ----------
let T_BOUFFEE = null, T_FLAMME = null;
function bouffee() {
  if (T_BOUFFEE) return T_BOUFFEE;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), R = rng(7);
  // une volute : plusieurs boules floues qui se chevauchent, plus denses au centre
  for (let i = 0; i < 16; i++) {
    const a = R() * 6.283, d = i === 0 ? 0 : 8 + R() * 26, r = (i === 0 ? 40 : 14 + R() * 20), px = 64 + Math.cos(a) * d, py = 64 + Math.sin(a) * d;
    const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.55, 'rgba(255,255,255,.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  }
  // le bord s'efface toujours avant le cadre
  const d = x.getImageData(0, 0, 128, 128);
  for (let j = 0; j < 128; j++) for (let i = 0; i < 128; i++) { const k = (j * 128 + i) * 4, r = Math.hypot(i - 63.5, j - 63.5) / 64, f = Math.max(0, Math.min(1, (1 - r) / 0.3)); const v = d.data[k + 3] * f; d.data[k] = d.data[k + 1] = d.data[k + 2] = v; d.data[k + 3] = 255; }
  x.putImageData(d, 0, 0);
  T_BOUFFEE = new THREE.CanvasTexture(c); T_BOUFFEE.generateMipmaps = false; T_BOUFFEE.minFilter = THREE.LinearFilter; return T_BOUFFEE;
}
function flamme() {
  if (T_FLAMME) return T_FLAMME;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 64, 64);
  // une langue de feu : goutte pointue vers le haut, cœur plus dense
  x.globalCompositeOperation = 'lighter';
  for (const [k, a] of [[1, 0.35], [0.72, 0.4], [0.45, 0.5]]) {
    x.save(); x.translate(32, 38); x.scale(k, k); x.filter = 'blur(3px)';
    x.fillStyle = `rgba(255,255,255,${a})`; x.beginPath(); x.moveTo(0, -34); x.bezierCurveTo(14, -12, 20, 4, 14, 14); x.bezierCurveTo(8, 24, -8, 24, -14, 14); x.bezierCurveTo(-20, 4, -14, -12, 0, -34); x.fill(); x.restore();
  }
  T_FLAMME = new THREE.CanvasTexture(c); T_FLAMME.generateMipmaps = false; T_FLAMME.minFilter = THREE.LinearFilter; return T_FLAMME;
}

// ---------- Nuée de panneaux (fumée, flammes, braises) ----------
const G_NUEE = new Map();
function geoNuee(n, seed) {
  const key = n + '|' + seed; if (G_NUEE.has(key)) return G_NUEE.get(key);
  const base = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
  g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
  const R = rng(seed * 977 + n), a = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { a[i * 4] = (i + R() * 0.7) / n; a[i * 4 + 1] = R(); a[i * 4 + 2] = R(); a[i * 4 + 3] = 0.35 + R() * 0.65; }
  g.setAttribute('aGraine', new THREE.InstancedBufferAttribute(a, 4)); g.instanceCount = n;
  G_NUEE.set(key, g); return g;
}
const VS_NUEE = `
attribute vec4 aGraine;
uniform float uTemps, uHaut, uLarge, uVitesse, uMontee, uTourne;
uniform vec2 uTaille, uVent;
varying vec2 vUv; varying float vAge; varying float vHaut;
#include <fog_pars_vertex>
void main() {
  float age = fract(uTemps * uVitesse * (0.75 + 0.5 * aGraine.y) + aGraine.x);
  vAge = age; vUv = uv;
  float a = aGraine.z * 6.2832;
  vec3 c = vec3(cos(a), 0.0, sin(a)) * uLarge * aGraine.w * (0.12 + 0.88 * sqrt(age));
  c.y = pow(age, uMontee) * uHaut;
  c.xz += uVent * age * age * uHaut;
  c.x += sin(age * 5.0 + aGraine.y * 20.0 + uTemps * 0.7) * 0.14 * uLarge * age;
  c.z += cos(age * 4.0 + aGraine.z * 17.0 + uTemps * 0.5) * 0.14 * uLarge * age;
  float t = mix(uTaille.x, uTaille.y, pow(age, 0.65)) * (0.75 + 0.5 * aGraine.w) * length(modelMatrix[0].xyz);
  float r = uTourne * (a + age * (aGraine.y - 0.5) * 2.6 + uTemps * (aGraine.z - 0.5) * 0.25);
  vec2 q = vec2(position.x * cos(r) - position.y * sin(r), position.x * sin(r) + position.y * cos(r));
  vHaut = q.y + 0.5;
  vec4 mvPosition = modelViewMatrix * vec4(c, 1.0);
  mvPosition.xy += q * t;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const FS_NUEE = `
uniform sampler2D uTex; uniform vec3 uA, uB, uC; uniform float uAlpha, uCorps, uEntree, uSortie, uOmbre;
varying vec2 vUv; varying float vAge; varying float vHaut;
#include <fog_pars_fragment>
void main() {
  float m = texture2D(uTex, vUv).r;
  float f = smoothstep(0.0, uEntree, vAge) * (1.0 - smoothstep(uSortie, 1.0, vAge));
  float al = clamp(m * f * uAlpha, 0.0, 1.0);
  if (al < 0.004) discard;
  vec3 col = vAge < 0.5 ? mix(uA, uB, vAge * 2.0) : mix(uB, uC, vAge * 2.0 - 1.0);
  col *= 1.0 - uOmbre + uOmbre * 1.6 * clamp(vHaut, 0.0, 1.0) * (0.55 + 0.6 * m);      // faux éclairage : le dessus de la volute est plus clair
  float corps = uCorps;
  col = linearToOutputTexel(vec4(col, 1.0)).rgb;
  #ifdef USE_FOG
    float brume = smoothstep(fogNear, fogFar, vFogDepth);
    col = mix(col, fogColor, brume * corps); al *= 1.0 - brume * (1.0 - corps) * 0.9;
  #endif
  gl_FragColor = vec4(col * al, al * corps);                 // couleurs « prémultipliées » : corps = 1 → fumée opaque, corps = 0 → lumière qui s'ajoute
}`;
// o : n, tex ('bouffee' | 'flamme'), a / b / c (couleurs : naissance, milieu, fin), haut, large, taille [début, fin], vent [x, z],
//     vitesse, montee (1 = régulière, < 1 = rapide puis lente), alpha, corps, entree, sortie, ombre, tourne, graine
function nuee(o) {
  const u = {
    uTemps: TEMPS, uTex: { value: o.tex === 'flamme' ? flamme() : bouffee() }, uA: { value: C(o.a) }, uB: { value: C(o.b) }, uC: { value: C(o.c != null ? o.c : o.b) },
    uHaut: { value: o.haut }, uLarge: { value: o.large }, uTaille: { value: new THREE.Vector2(o.taille[0], o.taille[1]) }, uVent: { value: new THREE.Vector2(...(o.vent || [0, 0])) },
    uVitesse: { value: o.vitesse }, uMontee: { value: o.montee || 1 }, uAlpha: { value: o.alpha }, uCorps: { value: o.corps }, uEntree: { value: o.entree || 0.1 }, uSortie: { value: o.sortie || 0.45 },
    uOmbre: { value: o.ombre || 0 }, uTourne: { value: o.tourne == null ? 1 : o.tourne },
  };
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]), vertexShader: VS_NUEE, fragmentShader: FS_NUEE, fog: true, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
  });
  Object.assign(m.uniforms, u);
  const mesh = new THREE.Mesh(geoNuee(o.n, o.graine || 1), m); mesh.frustumCulled = false; mesh.renderOrder = o.ordre || 3;
  return mesh;
}

// Fumée. Deux usages : fumée de cheminée (claire, fine, emportée par le vent) et fumée d'incendie (sombre, épaisse, haute).
// o : n (nombre de volutes), couleur, large, haut, taille [début, fin], vent [x, z], vitesse, alpha
let GRAINE = 1;
export function fumee(o = {}) {
  const g = new THREE.Group(), col = C(o.couleur != null ? o.couleur : 0xd8d8d8), clair = col.clone().lerp(C(0xffffff), 0.25), fonce = col.clone().multiplyScalar(0.72);
  g.add(nuee({
    n: o.n || 22, a: fonce, b: col, c: clair, haut: o.haut || 7, large: o.large == null ? 0.9 : o.large, taille: o.taille || [0.7, 3.4], vent: o.vent || [0.22, 0.06],
    vitesse: o.vitesse || 0.11, montee: 0.85, alpha: o.alpha == null ? 0.5 : o.alpha, corps: 1, entree: 0.08, sortie: 0.35, ombre: 0.42, graine: GRAINE++, ordre: 2,
  }));
  g.userData.anim = tick;
  return g;
}

// Feu : langues de flamme, cœur clair, braises qui s'envolent ; light = ajoute une lumière qui tremble
export function feu(size = 1, light = true) {
  const g = new THREE.Group(), s = size, seed = GRAINE++;
  g.add(nuee({ n: 16, tex: 'flamme', a: 0xffd070, b: 0xff6a12, c: 0xc02404, haut: 1.25 * s, large: 0.3 * s, taille: [0.95 * s, 0.3 * s], vitesse: 1.05, montee: 1.1, alpha: 1.15, corps: 0.55, entree: 0.08, sortie: 0.35, tourne: 0.12, graine: seed, ordre: 4 }));
  g.add(nuee({ n: 9, tex: 'flamme', a: 0xfff6d0, b: 0xffc040, c: 0xff7a18, haut: 0.75 * s, large: 0.14 * s, taille: [0.6 * s, 0.2 * s], vitesse: 1.3, montee: 1.0, alpha: 1.0, corps: 0.25, entree: 0.1, sortie: 0.3, tourne: 0.1, graine: seed + 1, ordre: 5 }));
  g.add(nuee({ n: Math.round(5 + 3 * Math.min(3, s)), a: 0xffe0a0, b: 0xff8a20, c: 0xc03008, haut: 3.2 * s, large: 0.7 * s, taille: [0.1 * Math.sqrt(s), 0.04 * Math.sqrt(s)], vent: [0.15, 0.05], vitesse: 0.5, montee: 0.9, alpha: 1.6, corps: 0.1, entree: 0.05, sortie: 0.5, graine: seed + 2, ordre: 5 }));
  let pl = null;
  if (light) { pl = new THREE.PointLight(0xff8a30, 1.6 * size, 14 * size, 1.6); pl.position.y = 1.0 * size; g.add(pl); }
  const off = (seed * 1.7) % 10;
  g.userData.anim = (dt, m, t) => { TEMPS.value = t; if (pl) pl.intensity = size * (1.4 + Math.sin(t * 13 + off) * 0.3 + Math.sin(t * 7.1 + off) * 0.2); };
  return g;
}

// ---------- Ciel ----------
// Une sphère vue de l'intérieur : dégradé de l'horizon (couleur de la brume) au zénith, halo du soleil.
export function ciel(o = {}) {
  const haut = C(o.haut), horizon = C(o.horizon), sol = C(o.soleil != null ? o.soleil : 0xfff2d0), dir = new THREE.Vector3(...(o.dir || [0.4, 0.7, 0.3])).normalize();
  const m = new THREE.ShaderMaterial({
    uniforms: { uHaut: { value: haut }, uHorizon: { value: horizon }, uSoleil: { value: sol }, uDir: { value: dir }, uForce: { value: o.force == null ? 1 : o.force } },
    vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uHaut, uHorizon, uSoleil, uDir; uniform float uForce; varying vec3 vDir;
      void main() { vec3 d = normalize(vDir); float h = max(d.y, 0.0);
        vec3 col = mix(uHorizon, uHaut, pow(smoothstep(0.0, 0.62, h), 0.8));
        float s = max(dot(d, uDir), 0.0);
        col += uSoleil * (pow(s, 900.0) * 1.6 + pow(s, 60.0) * 0.32 + pow(s, 6.0) * 0.12) * uForce;
        col = mix(col, uHorizon, smoothstep(0.02, -0.06, d.y));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(760, 32, 16), m); mesh.renderOrder = -10; mesh.frustumCulled = false;
  return mesh;
}

// ---------- Montagnes ----------
const M_MONT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, fog: false });
// r : rayon du pied, h : hauteur, color : roche, snow : neige (ou null), o.brume : couleur de l'air lointain, o.voile : part de brume (0..1), o.foret : couleur du bas des pentes
export function montagne(r, h, color, snow, o = {}) {
  const R = rng(o.graine || Math.round(r * 131 + h * 17)), S = 26, J = 9, pos = [], col = [], idx = [];
  const roche = C(color), neige = snow != null ? C(snow) : null, brume = o.brume != null ? C(o.brume) : null, voile = o.voile == null ? 0.45 : o.voile, foret = o.foret != null ? C(o.foret) : roche.clone().multiplyScalar(0.8);
  // crêtes : le rayon et la hauteur ondulent autour du sommet
  const ph = [R() * 6.28, R() * 6.28, R() * 6.28], crete = (a) => 0.5 + 0.5 * (Math.sin(a * 3 + ph[0]) * 0.5 + Math.sin(a * 5 + ph[1]) * 0.3 + Math.sin(a * 9 + ph[2]) * 0.2);
  const ox = (R() - 0.5) * r * 0.16, oz = (R() - 0.5) * r * 0.16, ligne = 0.3 + R() * 0.1, c = new THREE.Color();
  for (let j = 0; j <= J; j++) {
    const t = j / J;                                         // 0 au sommet, 1 au pied
    for (let i = 0; i < S; i++) {
      const a = (i / S) * Math.PI * 2, k = crete(a), jit = j === 0 ? 0 : 1;
      const rad = r * Math.pow(t, 0.9) * (0.72 + 0.4 * k) * (1 + (R() - 0.5) * 0.1 * jit);
      const y = h * Math.pow(1 - t, 1.25) * (1 - 0.3 * (1 - k) * Math.sin(t * Math.PI)) + (j > 0 && j < J ? (R() - 0.5) * h * 0.035 : 0);
      pos.push(Math.cos(a) * rad + ox * (1 - t), j === J ? -2 : y, Math.sin(a) * rad + oz * (1 - t));
      // couleur : neige en haut (limite irrégulière), roche, puis forêt vers le pied ; creux plus sombres
      const n = R();
      if (neige && t < ligne + (k - 0.5) * 0.16 + (n - 0.5) * 0.06) c.copy(neige).multiplyScalar(0.93 + n * 0.07);
      else { c.copy(roche).lerp(foret, Math.min(1, Math.max(0, (t - 0.45) / 0.45))); c.multiplyScalar(0.8 + 0.28 * k + (n - 0.5) * 0.1); }
      if (brume) c.lerp(brume, voile * (0.45 + 0.55 * t));
      col.push(c.r, c.g, c.b);
    }
  }
  for (let j = 0; j < J; j++) for (let i = 0; i < S; i++) { const a = j * S + i, b = j * S + (i + 1) % S, d = a + S, e = b + S; idx.push(a, b, d, b, e, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  const flatG = g.toNonIndexed(); flatG.computeVertexNormals();
  return new THREE.Mesh(flatG, M_MONT);
}

// ---------- Nuages ----------
const G_BOULE = new THREE.IcosahedronGeometry(0.5, 2), MATS_NUAGE = new Map();
export function nuage(s = 1, teinte = 0xffffff, graine = 1) {
  let m = MATS_NUAGE.get(teinte);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: teinte, emissive: C(teinte).multiplyScalar(0.62), fog: false }); MATS_NUAGE.set(teinte, m); }
  const g = new THREE.Group(), R = rng(graine * 53 + Math.round(s * 100)), n = 7 + Math.floor(R() * 4);
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * 2 - 1, d = (4.5 + R() * 3.5) * (1 - 0.45 * u * u) * s, b = new THREE.Mesh(G_BOULE, m);
    b.position.set(u * 9 * s + (R() - 0.5) * 2 * s, (R() - 0.35) * 1.6 * s + d * 0.12, (R() - 0.5) * 5 * s); b.scale.set(d * 1.25, d * 0.72, d); g.add(b);
  }
  return g;
}

// ---------- Horizon complet d'une scène : ciel, deux rangs de montagnes, nuages ----------
// st : la scène ; R : générateur aléatoire ; o : mount, snow, clouds, rayon (distance des montagnes), haut, force (soleil), foret
export function horizon(st, R, o = {}) {
  const brume = st.fog[0], sky = C(st.sky), hsl = {}; sky.getHSL(hsl);
  const haut = o.haut != null ? C(o.haut) : new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 1.2 + 0.05), hsl.l * 0.66);
  st.add(ciel({ haut, horizon: brume, dir: st.sun[2], soleil: st.sun[0], force: o.force }));
  const r0 = o.rayon || 230, mount = o.mount || 0x7a8aa0, neige = o.snow === false ? null : 0xf0f4fa, foret = o.foret != null ? o.foret : C(mount).lerp(C(0x4a6a52), 0.5).getHex();
  // premier rang : contreforts boisés, bas et larges ; second rang : hauts sommets enneigés, plus voilés
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + R() * 0.25, r = r0 * (0.92 + R() * 0.14);
    st.deco(montagne(48 + R() * 30, 26 + R() * 22, foret, null, { brume, voile: 0.42, foret, graine: 100 + i }), Math.cos(a) * r, Math.sin(a) * r, R() * 6);
  }
  for (let i = 0; i < 13; i++) {
    const a = (i / 13) * Math.PI * 2 + R() * 0.3 + 0.2, r = r0 * (1.32 + R() * 0.2);
    st.deco(montagne(66 + R() * 40, 64 + R() * 52, mount, neige, { brume, voile: 0.62, foret, graine: 200 + i }), Math.cos(a) * r, Math.sin(a) * r, R() * 6);
  }
  if (o.clouds !== false) {
    const teinte = C(0xffffff).lerp(C(brume), 0.18).getHex();
    for (let i = 0; i < 12; i++) { const a = R() * Math.PI * 2, r = 90 + R() * 260; st.deco(nuage(1.3 + R() * 1.8, teinte, i + 1), Math.cos(a) * r, Math.sin(a) * r, R() * 0.6 - 0.3, 62 + R() * 40); }
  }
}

// ---------- Eau ----------
// Plan d'eau animé : w × d mètres, le courant va vers +x (du plan : on peut le tourner avec o.angle).
// L'eau reflète le ciel quand on la regarde de loin et laisse voir sa couleur quand on la regarde de près (comme la vraie),
// le soleil y fait des éclats, les vagues ont un relief, l'écume bat les bords.
// o : fond, clair (couleurs de l'eau profonde et peu profonde), ciel, horizon (couleurs reflétées), soleil ([x, y, z]),
//     berges : true/1 = écume sur les deux bords longs, 2 = sur les quatre bords, false/0 = aucune (mer, lac) ;
//     rond : true = disque de diamètre w (fontaine, bassin), l'écume suit le bord ;
//     courant (vitesse), eclats (soleil), relief (hauteur des vagues), reflet (0 à 1), alpha (< 1 : on voit le fond),
//     ondes : 1 = ronds dans l'eau partant du centre (fontaine), cascade : true = l'eau tombe (plan vertical, coule vers le bas)
export function eau(w, d, o = {}) {
  const berges = o.rond ? 3 : o.berges === false ? 0 : o.berges === 2 ? 2 : (o.berges === 0 ? 0 : 1);
  const u = {
    uFond: { value: C(o.fond != null ? o.fond : 0x1f5f9a) }, uClair: { value: C(o.clair != null ? o.clair : 0x6fc0e0) },
    uCiel: { value: C(o.ciel != null ? o.ciel : 0x4a90dc) }, uHorizon: { value: C(o.horizon != null ? o.horizon : 0xa4cdee) },
    uSoleil: { value: new THREE.Vector3(...(o.soleil || [-0.35, 0.8, -0.45])).normalize() },
    uBerges: { value: berges }, uDemi: { value: new THREE.Vector2(w / 2, (o.rond ? w : d) / 2) },
    uCourant: { value: o.courant == null ? 1 : o.courant }, uEclats: { value: o.eclats == null ? 1 : o.eclats },
    uRelief: { value: o.relief == null ? 1 : o.relief }, uReflet: { value: o.reflet == null ? 1 : o.reflet },
    uAlpha: { value: o.alpha == null ? 1 : o.alpha }, uOndes: { value: o.ondes || 0 }, uCascade: { value: o.cascade ? 1 : 0 },
  };
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, u]),
    vertexShader: `uniform vec3 uSoleil; varying vec2 vL; varying vec3 vV; varying vec3 vS;
      #include <fog_pars_vertex>
      void main() { vL = position.xy; vec4 wp = modelMatrix * vec4(position, 1.0);
        vV = (vec4(cameraPosition - wp.xyz, 0.0) * modelMatrix).xyz;      // regard et soleil ramenés dans le repère du plan (z = vers le haut)
        vS = (vec4(uSoleil, 0.0) * modelMatrix).xyz;
        vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uFond, uClair, uCiel, uHorizon; uniform vec2 uDemi;
      uniform float uTemps, uBerges, uCourant, uEclats, uRelief, uReflet, uAlpha, uOndes, uCascade; varying vec2 vL; varying vec3 vV; varying vec3 vS;
      #include <fog_pars_fragment>
      ${BRUIT_GLSL}
      float haut(vec2 p, float t) {
        float h = bruit(p * vec2(0.28, 0.75) + vec2(-t * 0.55, 0.0)) * 0.5 + bruit(p * vec2(0.7, 1.7) + vec2(-t * 1.0, t * 0.12)) * 0.3
                + bruit(p * vec2(1.9, 3.6) + vec2(-t * 1.7, -t * 0.2)) * 0.14 + bruit(p * vec2(4.6, 7.0) + vec2(-t * 2.3, t * 0.5)) * 0.06;
        if (uOndes > 0.5) { float r = length(p); h += sin(r * 7.0 - uTemps * 5.0) * 0.07 / (1.0 + r * 0.5); }
        return h;
      }
      void main() {
        float t = uTemps * uCourant; vec2 p = vL;
        if (uCascade > 0.5) { p = vec2(-vL.y * 0.35, vL.x * 2.2); t *= 3.2; }           // l'eau qui tombe : étirée en filets, rapide
        float e = 0.09, h = haut(p, t), hx = haut(p + vec2(e, 0.0), t), hy = haut(p + vec2(0.0, e), t);
        vec3 N = normalize(vec3((h - hx) / e * 0.2 * uRelief, (h - hy) / e * 0.2 * uRelief, 1.0));
        vec3 V = normalize(vV), S = normalize(vS), R = reflect(-V, N);
        // à quelle distance du bord est-on (en mètres) ?
        float db = 1000.0;
        if (uBerges > 2.5) db = uDemi.x - length(vL); else if (uBerges > 1.5) db = min(uDemi.x - abs(vL.x), uDemi.y - abs(vL.y)); else if (uBerges > 0.5) db = uDemi.y - abs(vL.y);
        float peu = 1.0 - smoothstep(0.0, 1.6, db);                                    // peu profond près des bords
        vec3 col = mix(uFond, uClair, clamp(peu * 0.7 + (h - 0.45) * 0.55, 0.0, 1.0));
        col += vec3(0.05, 0.07, 0.08) * smoothstep(0.56, 0.72, h);                     // dos des vagues, plus clair
        // le ciel se reflète d'autant plus qu'on regarde l'eau en rasant
        float fres = 0.03 + 0.97 * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 5.0);
        vec3 cielR = mix(uHorizon, uCiel, smoothstep(0.02, 0.55, R.z));
        col = mix(col, cielR, clamp(fres * uReflet, 0.0, 0.8));
        // le soleil : une traînée douce et des éclats vifs
        float sp = max(dot(R, S), 0.0);
        col += vec3(1.0, 0.95, 0.82) * (pow(sp, 26.0) * 0.22 + pow(sp, 260.0) * 1.6) * uEclats;
        col += vec3(0.5) * uEclats * smoothstep(0.86, 0.93, bruit(p * vec2(1.9, 3.6) + vec2(-t * 1.7, -t * 0.2)) * 0.6 + bruit(p * vec2(0.7, 1.7) + vec2(-t, t * 0.12)) * 0.5) * 0.3;
        // écume : un liseré qui bat contre la rive, et des traînées emportées par le courant
        float bat = 0.18 + 0.14 * sin(uTemps * 1.6 + bruit(vL * 0.6) * 9.0);
        float etroit = clamp(min(uDemi.x, uDemi.y) / 2.2, 0.16, 1.0);          // rigole, ruisseau : un liseré fin, pas une eau toute blanche
        float ecume = (1.0 - smoothstep(bat * etroit, (bat + 0.22) * etroit, db + (bruit(p * 3.0 + vec2(-t * 1.2, 0.0)) - 0.5) * 0.3 * etroit)) * step(0.5, uBerges) * (0.45 + 0.55 * etroit);
        ecume += (1.0 - smoothstep(0.0, 1.3 * etroit, db)) * smoothstep(0.66, 0.84, bruit(p * vec2(1.3, 5.0) + vec2(-t * 1.5, 0.0))) * 0.3 * step(0.5, uBerges);
        if (uCascade > 0.5) ecume = smoothstep(0.52, 0.8, bruit(p * vec2(1.0, 0.8) + vec2(0.0, 0.0) + vec2(-t, 0.0))) * 0.75;
        col = mix(col, vec3(0.94, 0.97, 1.0), clamp(ecume, 0.0, 0.9));
        float a = uAlpha < 0.999 ? clamp(uAlpha * (1.0 + fres * 0.8 + ecume * 0.6), 0.0, 1.0) : 1.0;
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
    fog: true, transparent: (o.alpha != null && o.alpha < 1), depthWrite: !(o.alpha != null && o.alpha < 1), side: o.cascade ? THREE.DoubleSide : THREE.FrontSide,
  });
  m.uniforms.uTemps = TEMPS;
  Object.defineProperty(m, 'opacity', { get() { return this.uniforms ? this.uniforms.uAlpha.value : 1; }, set(v) { if (this.uniforms) this.uniforms.uAlpha.value = v; } });   // (« material.opacity » règle la transparence de l'eau)
  const geo = o.rond ? new THREE.CircleGeometry(w / 2, 40) : new THREE.PlaneGeometry(w, d);
  const mesh = new THREE.Mesh(geo, m); mesh.userData.anim = tick;
  if (!o.cascade) { mesh.rotation.order = 'YXZ'; mesh.rotation.x = -Math.PI / 2; if (o.angle) mesh.rotation.y = o.angle; }
  return mesh;
}
