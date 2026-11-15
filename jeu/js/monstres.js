// ============================================================
//  MONSTRES ET ANIMAUX IMPORTÉS  (dossier modeles/monstres)
//  Modèles téléchargés (packs gratuits de Quaternius), chacun avec son squelette et ses animations :
//    - rat, araignée, serpent, guêpe, grenouille   (« Easy Animated Enemies »)
//    - chauve-souris, gelée, squelette, dragon      (« Animated Monsters »)
//    - cheval, mouton, vache, cochon                (« Animated Animals »)
//    - diablotin (Imp) et gobelin (Puglin)          (« Bestiary », même squelette que les personnages :
//      ils rejouent donc les animations des héros : marche, coup, sort, K.-O.)
//  Un monstre du jeu = un modèle + une taille + des couleurs. La table MONSTRES ci-dessous dit lequel.
//  Chaque monstre répond comme un personnage importé (userData.play, userData.anim, userData.height) :
//  le combat et l'exploration n'ont pas besoin de savoir que c'est un animal.
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { clone as cloneSkinned } from '../lib/SkeletonUtils.js';
import { partagerSquelettes, fusionnerPieces, detailSelonDistance } from './qualite.js';
import { gltf, texture, prefetch, release } from './charge.js';
import { clipsPerso } from './pack.js';

const DIR = new URL('../modeles/monstres/', import.meta.url).href;
const FICHIERS = ['Rat', 'Spider', 'Snake', 'Wasp', 'Frog', 'Bat', 'Slime', 'Skeleton', 'Dragon', 'Horse', 'Sheep', 'Cow', 'Pig', 'Imp', 'Puglin'];
const TEXTURES = ['Imp_2', 'Imp_3', 'Puglin_2', 'Puglin_3'];
const LIB = {}, TEX = {}, MATS = new Map();
let pret = false;
export const monstresPrets = () => pret;

export async function loadMonstres() {
  await prefetch('monstres');
  await Promise.all([
    ...FICHIERS.map((f) => gltf(DIR + f + '.glb').then((g) => { LIB[f] = g; })),
    ...TEXTURES.map((f) => texture(DIR + 'tex/' + f + '.jpg', false).then((t) => { t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; TEX[f] = t; })),
  ]);
  for (const f of FICHIERS) {
    const g = LIB[f]; g.clips = {};
    for (const c of g.animations) g.clips[c.name.replace(/^.*\|/, '').replace(/^[A-Za-z]+_/, '')] = c;       // « Armature|Rat_Attack » → « Attack »
    g.scene.traverse((m) => { if (m.isMesh) { m.frustumCulled = false; m.material.metalness = 0; m.material.roughness = Math.max(0.6, m.material.roughness); m.material.side = THREE.FrontSide; } });
  }
  release('monstres'); pret = true;
}

// ---------- Les monstres du jeu ----------
// f : fichier ; h : hauteur voulue en mètres (ou « long » : longueur) ; clips : nom des animations du fichier ;
// vol : hauteur de vol ; couleurs : { nom de la matière : couleur } ; teinte : couleur multipliée (modèles à image) ;
// tex : autre jeu de couleurs du pack ; lueur : force de la lueur (yeux, braises) ; large : épaisseur.
const BETE = { idle: 'Idle', walk: 'Walk', run: 'Run', attack: 'Attack', death: 'Death' };
const HUMAIN = { idle: 'Idle_Loop', walk: 'Walk_Loop', run: 'Jog_Fwd_Loop', attack: 'Punch_Cross', attack2: 'Spell_Simple_Shoot', hit: 'Hit_Chest', death: 'Death01', humain: true };
export const MONSTRES = {
  // --- chapitres 2 et 3 ---
  gobelin:        { f: 'Puglin', h: 1.15, clips: HUMAIN },
  gobelin_chef:   { f: 'Puglin', h: 1.45, clips: HUMAIN, tex: 'Puglin_2' },
  rat:            { f: 'Rat', h: 0.8, clips: BETE, couleurs: { Grey: 0x6a5a50, Pink: 0xd89a9a } },
  gelee:          { f: 'Slime', h: 0.95, clips: BETE, couleurs: { Body: 0x58c84a, Eyes: 0x10180c }, brillant: true },
  chauve_souris:  { f: 'Bat', h: 0.75, clips: { idle: 'Flying', walk: 'Flying', attack: 'Attack', attack2: 'Attack2', hit: 'Hit', death: 'Death' }, vol: 1.15, couleurs: { Main: 0x3a2a4a, Belly: 0x8a6a4a, Black: 0x1a1218, Nose: 0x6a3a4a, Eyes: 0xff4030 } },
  // --- chapitre 4 : les Collines de Granit et le Sanctuaire de la Terre ---
  serpent:        { f: 'Snake', h: 0.75, clips: BETE, couleurs: { DarkGreen: 0x8a7a4a, LightGreen: 0xc8b878, Purple: 0x4a2a1a } },
  guepe:          { f: 'Wasp', h: 0.8, ry: Math.PI / 2, clips: { idle: 'Flying', walk: 'Flying', attack: 'Attack', death: 'Death' }, vol: 1.0 },
  araignee:       { f: 'Spider', h: 0.8, clips: BETE, couleurs: { Material: 0x8a8478, 'Material.001': 0xd8a040 } },            // araignée de granit : carapace de pierre, yeux d'ambre
  esprit:         { f: 'Imp', h: 1.35, clips: HUMAIN, teinte: 0xb8b0a4, tex: 'Imp_3', lueur: 2.2, vol: 0.25 },                  // esprit de granit
  squelette:      { f: 'Skeleton', h: 1.7, clips: { idle: 'Idle', walk: 'Running', run: 'Running', attack: 'Attack', death: 'Death' }, couleurs: { Skeleton: 0xd8d0b8 } },
  // --- pour la suite de l'histoire ---
  diablotin:      { f: 'Imp', h: 1.2, clips: HUMAIN, lueur: 1.6 },
  grenouille:     { f: 'Frog', h: 0.6, clips: { idle: 'Idle', walk: 'Jump', attack: 'Attack', death: 'Death' } },
  dragon:         { f: 'Dragon', h: 2.4, clips: { idle: 'Flying', walk: 'Flying', attack: 'Attack', attack2: 'Attack2', hit: 'Hit', death: 'Death' }, vol: 1.2, couleurs: { Main: 0x8a2a1a, Belly: 0xd8a040, Wings: 0x5a1a14, Claws: 0x2a2018, Eyes: 0xffd040 } },
  // --- chapitres 5 à 10 ---
  diablotin_lave: { f: 'Imp', h: 1.25, clips: HUMAIN, teinte: 0xff8a50, lueur: 2.4 },
  chauve_ardente: { f: 'Bat', h: 0.85, clips: { idle: 'Flying', walk: 'Flying', attack: 'Attack', attack2: 'Attack2', hit: 'Hit', death: 'Death' }, vol: 1.15, couleurs: { Main: 0xc8401a, Belly: 0xffb040, Black: 0x3a1208, Nose: 0xffd080 } },
  ignis:          { f: 'Dragon', h: 3.0, clips: { idle: 'Flying', walk: 'Flying', attack: 'Attack', attack2: 'Attack2', hit: 'Hit', death: 'Death' }, vol: 0.9, couleurs: { Main: 0xd8401a, Belly: 0xffc040, Wings: 0xff7a20, Claws: 0x2a1208 } },
  ondine:         { f: 'Dragon', h: 3.6, clips: { idle: 'Flying', walk: 'Flying', attack: 'Attack', attack2: 'Attack2', hit: 'Hit', death: 'Death' }, vol: 1.0, couleurs: { Main: 0x1e6a9a, Belly: 0xa8e8f0, Wings: 0x2ab0c0, Claws: 0xe8f8ff } },
  spectre:        { f: 'Skeleton', h: 1.8, clips: { idle: 'Idle', walk: 'Running', run: 'Running', attack: 'Attack', death: 'Death' }, couleurs: { Skeleton: 0x7ad8d0 }, vol: 0.2 },
  meduse:         { f: 'Slime', h: 1.0, clips: BETE, couleurs: { Body: 0xe87ac8, Eyes: 0xfff0a0 }, brillant: true, vol: 0.9 },
  crabe:          { f: 'Spider', h: 1.1, clips: BETE, couleurs: { Material: 0xc8502a, 'Material.001': 0xffe0a0 } },
  // --- animaux (décor vivant) ---
  cheval:         { f: 'Horse', h: 2.0, clips: { idle: 'Idle', walk: 'Walk', run: 'Run', death: 'Death' }, couleurs: { 'Material.003': 0x8a5a36, 'Material.006': 0x2a1c14 }, animal: true },
  cheval_noir:    { f: 'Horse', h: 2.1, clips: { idle: 'Idle', walk: 'Walk', run: 'Run', death: 'Death' }, couleurs: { 'Material.003': 0x1e1c20, 'Material.006': 0x0c0c0e }, animal: true },
  mouton:         { f: 'Sheep', h: 1.0, clips: { idle: 'Idle', walk: 'Jump' }, couleurs: { White: 0xf0ece0, Black: 0x2a2420 }, animal: true },
  vache:          { f: 'Cow', h: 1.5, clips: { idle: 'Idle', walk: 'WalkSlow', run: 'Run' }, couleurs: { White: 0xf0ece4, Black: 0x2a2420, Pink: 0xe0a0a0 }, animal: true },
  cochon:         { f: 'Pig', h: 0.8, clips: { idle: 'Idle', walk: 'Jump' }, couleurs: { 'Material.003': 0xe8a8a8, Material: 0x5a3a2a }, animal: true },
};
export const estMonstre = (cle) => pret && !!MONSTRES[cle];

const G_DISC = new THREE.CircleGeometry(0.5, 20), M_OMBRE = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
function matiere(src, cle, d) {
  const nom = src.name, k = cle + '|' + nom; let m = MATS.get(k);
  if (!m) {
    m = src.clone();
    if (d.couleurs && d.couleurs[nom] != null) m.color.set(d.couleurs[nom]);
    if (d.teinte != null) m.color.set(d.teinte);
    if (d.tex && TEX[d.tex]) m.map = TEX[d.tex];
    if (m.emissiveMap) m.emissiveIntensity = d.lueur || 1;
    if (d.brillant) { m.roughness = 0.25; m.transparent = true; m.opacity = 0.9; }
    if (d.couleurs && /Eyes/.test(nom) && d.couleurs[nom] > 0x400000) { m.emissive = new THREE.Color(d.couleurs[nom]); m.emissiveIntensity = 0.8; }
    MATS.set(k, m);
  }
  return m;
}

// mesure du modèle dans sa pose de repos (les os comptent : les fichiers d'origine sont à l'échelle 1/100)
const MESURES = {};
function mesurer(f, inst, clipRepos) {
  if (MESURES[f]) return MESURES[f];
  const mixer = new THREE.AnimationMixer(inst);
  if (clipRepos) { mixer.clipAction(clipRepos).play(); mixer.update(0.01); }
  inst.updateMatrixWorld(true);
  const box = new THREE.Box3(), v = new THREE.Vector3(); let rates = 0;
  inst.traverse((m) => {
    if (!m.isSkinnedMesh) { if (m.isMesh) box.expandByObject(m); return; }
    const pos = m.geometry.attributes.position, pas = Math.max(1, Math.floor(pos.count / 400));
    for (let i = 0; i < pos.count; i += pas) { v.fromBufferAttribute(pos, i); m.applyBoneTransform(i, v); v.applyMatrix4(m.matrixWorld); if (isFinite(v.x + v.y + v.z)) box.expandByPoint(v); else rates++; }
  });
  mixer.stopAllAction(); mixer.uncacheRoot(inst);
  return (MESURES[f] = { min: box.min.clone(), max: box.max.clone(), rates });
}

// Imp et Puglin ont 55 des 65 os des héros : on garde, dans chaque clip des héros, les seules pistes dont l'os existe.
const HUMAINS = {};
function clipsHumains(f, inst) {
  if (HUMAINS[f]) return HUMAINS[f];
  const os = new Set(); inst.traverse((n) => { if (n.name) os.add(n.name); });
  const out = {}, tous = clipsPerso();
  for (const k in tous) { const c = tous[k]; out[k] = new THREE.AnimationClip(c.name, c.duration, c.tracks.filter((t) => os.has(t.name.split('.')[0]))); }
  return (HUMAINS[f] = out);
}

export function makeMonstre(cle, o = {}) {
  const d = MONSTRES[cle]; if (!pret || !d) return null;
  const src = LIB[d.f], inst = cloneSkinned(src.scene), g = new THREE.Group();
  inst.traverse((m) => { if (m.isMesh) { m.material = matiere(m.material, cle, d); m.frustumCulled = false; } });
  const humain = !!d.clips.humain, CL = humain ? clipsHumains(d.f, inst) : src.clips, nom = (r) => d.clips[r], clip = (r) => (nom(r) ? CL[nom(r)] : null);
  const mes = mesurer(d.f, inst, clip('idle'));
  const haut = mes.max.y - mes.min.y, large = mes.max.x - mes.min.x, long = mes.max.z - mes.min.z;
  const k = (o.h || d.h) / Math.max(haut, 0.0001) * (o.s || 1);
  inst.scale.multiplyScalar(k); inst.position.y = -mes.min.y * k + (d.vol || 0);
  inst.position.x = -(mes.min.x + mes.max.x) / 2 * k; inst.position.z = -(mes.min.z + mes.max.z) / 2 * k;
  const pivot = new THREE.Group(); pivot.rotation.y = d.ry || 0; pivot.add(inst); g.add(pivot);      // ry : certains fichiers regardent de côté
  const ombre = new THREE.Mesh(G_DISC, M_OMBRE); ombre.rotation.x = -Math.PI / 2; ombre.position.y = 0.03; ombre.scale.set(Math.max(0.5, large * k * 0.9), Math.max(0.5, long * k * 0.9), 1); ombre.userData.shadow = true; g.add(ombre);

  const mixer = new THREE.AnimationMixer(inst), acts = {};
  const act = (r) => acts[r] || (acts[r] = mixer.clipAction(clip(r)));
  const u = g.userData;
  u.mes = mes; u.height = (o.h || d.h) * (o.s || 1) + (d.vol || 0); u.imported = true; u.monstre = cle; u.creature = true; u.mixer = mixer; u.corps = inst; partagerSquelettes(inst); fusionnerPieces(inst); u.details = detailSelonDistance(inst); u.P = {}; u.armed = false;
  u.draw = () => {};
  const ROLE = { Sword_Attack: 'attack', Punch_Cross: 'attack', Spell_Simple_Shoot: 'attack2', Hit_Chest: 'hit', Hit_Head: 'hit', Death01: 'death', Idle_Loop: 'idle', Interact: 'attack' };
  let base = null, one = null, oneT = 0, oneEnd = 0, vitesse = 0, last = null;
  const setBase = (r, fondu) => { if (base === r || !clip(r)) return; act(r).reset().setLoop(THREE.LoopRepeat, Infinity).setEffectiveWeight(1).fadeIn(fondu).play(); if (base) act(base).fadeOut(fondu); base = r; };
  u.play = (name, opt = {}) => {
    let r = ROLE[name] || name; if (r === 'attack2' && !clip(r)) r = 'attack';
    const c = clip(r); if (!c) return 0;
    const a = act(r), sp = (opt.speed || 1) * (humain ? 1 : 0.85);
    a.reset().setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = sp; a.setEffectiveWeight(1).fadeIn(0.08).play();
    if (one && one !== a) one.fadeOut(0.08); if (base) { act(base).fadeOut(0.08); base = null; }
    one = a; oneT = 0; oneEnd = opt.hold ? Infinity : c.duration / sp - 0.12;
    return c.duration / sp;
  };
  u.stop = () => { if (one) { one.fadeOut(0.2); one = null; } };
  u.poseAt = (name) => { u.play(name, { hold: true, speed: 50 }); mixer.update(1); };
  u.anim = (dt, moving, t) => {
    if (u.pose) return;
    const p = g.position; if (last && dt > 0) { const v = Math.hypot(p.x - last.x, p.z - last.z) / dt; vitesse += (v - vitesse) * Math.min(1, dt * 8); } last = last || new THREE.Vector3(); last.copy(p);
    if (one) { oneT += dt; if (oneT >= oneEnd) { one.fadeOut(0.18); one = null; } }
    if (!one) { const r = moving ? (vitesse > 3 && clip('run') ? 'run' : 'walk') : 'idle'; setBase(clip(r) ? r : 'idle', base ? 0.18 : 0.0001); }
    mixer.update(dt);
    if (d.vol && !u.dead) inst.position.y = -mes.min.y * k + d.vol + Math.sin(t * 2.2 + g.id) * 0.08;      // les créatures volantes flottent
  };
  u.anim(0.016 + Math.random() * 2, false, 0);
  return g;
}
