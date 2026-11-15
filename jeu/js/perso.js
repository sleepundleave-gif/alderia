// ============================================================
//  CRÉATION DU HÉROS : choix de la vocation et de l'apparence
//  - au tout début d'une nouvelle partie : vocation (rôle dans l'équipe), puis apparence ;
//  - en cours de partie : menu → « Apparence de Kael » (la vocation, elle, ne change plus).
//  Le choix est rangé dans la sauvegarde : G.flags.heros = { classe, look }.
//  « look » ne contient que des numéros de choix (voir CHAMPS) : une sauvegarde reste petite et lisible.
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { E } from './engine.js';
import { G, save } from './state.js';
import { CLASSES, CLASSE_DEFAUT, SKILLS, STAT_LABELS, appliquerClasse } from './data.js';
import { HEROES3D, makeHero, envFor } from './pack.js';
import { Input } from './input.js';
import { $, pick, menuExtras, toast } from './ui.js';
import { sfx } from './audio.js';

const SIL = ['Masculine', 'Féminine'];
const PEAUX = [['Claire', 0xf0c8a8, {}], ['Dorée', 0xd8a67c, { skinTint: 0xe6c3a2 }], ['Brune', 0x9a6a4a, { skin: 'dark', skinTint: 0xfff0e0 }], ['Sombre', 0x5a3c2c, { skin: 'dark', skinTint: 0xb09a90 }]];
const COIFFURES = [['Courte', 'SimpleParted'], ['Longue', 'Long'], ['Chignons', 'Buns'], ['Rasée', 'Buzzed'], ['Capuche', null]];
const CHEVEUX = [['Châtain', 0x9a6a48], ['Brun', 0x4a3020], ['Noir', 0x1c1616], ['Blond', 0xf0d070], ['Roux', 0xd0602a], ['Blanc', 0xe8e8e8], ['Bleu', 0x3a62d8], ['Rose', 0xe07aa8]];
const TENUES = [['Villageois', 'Peasant', 1], ['Voyageur', 'Peasant', 2], ['Rôdeur', 'Ranger', 1], ['Rôdeur du désert', 'Ranger', 2]];
const TEINTES = [["D'origine", null], ['Rouge', 0xb8322a], ['Bleu', 0x2f58c0], ['Vert', 0x3f8a46], ['Violet', 0x7a3fa8], ['Or', 0xd8a83a], ['Blanc', 0xf2efe6], ['Noir', 0x2a2630], ['Brun', 0x8a5a36]];
const CAPES = [['Aucune', null], ['Rouge', 0xa82a26], ['Bleue', 0x1e3f8f], ['Verte', 0x2f6a3a], ['Noire', 0x24222c], ['Blanche', 0xe6dfcc], ['Violette', 0x5a2a7a]];
const TAILLES = [['Petite', -0.1], ['Moyenne', 0], ['Grande', 0.1]];
const CARRURES = [['Fine', 0.93], ['Normale', 1], ['Large', 1.1]];
const OUI_NON = ['Non', 'Oui'];

// Une ligne de l'éditeur : k = nom dans « look », opts = noms des choix, sw = pastilles de couleur (facultatif)
const CHAMPS = [
  { k: 'sil', nom: 'Silhouette', opts: SIL },
  { k: 'peau', nom: 'Peau', opts: PEAUX.map((p) => p[0]), sw: PEAUX.map((p) => p[1]) },
  { k: 'coif', nom: 'Coiffure', opts: COIFFURES.map((c) => c[0]) },
  { k: 'chev', nom: 'Cheveux', opts: CHEVEUX.map((c) => c[0]), sw: CHEVEUX.map((c) => c[1]) },
  { k: 'barbe', nom: 'Barbe', opts: OUI_NON },
  { k: 'tenue', nom: 'Tenue', opts: TENUES.map((t) => t[0]) },
  { k: 'teinte', nom: 'Couleur', opts: TEINTES.map((t) => t[0]), sw: TEINTES.map((t) => t[1]) },
  { k: 'epaul', nom: 'Épaulière', opts: OUI_NON, si: (l) => l.tenue >= 2 },
  { k: 'cape', nom: 'Cape', opts: CAPES.map((c) => c[0]), sw: CAPES.map((c) => c[1]) },
  { k: 'taille', nom: 'Taille', opts: TAILLES.map((t) => t[0]) },
  { k: 'carrure', nom: 'Carrure', opts: CARRURES.map((t) => t[0]) },
];
export const LOOK_DEFAUT = { sil: 0, peau: 0, coif: 0, chev: 0, barbe: 0, tenue: 0, teinte: 0, epaul: 0, cape: 0, taille: 1, carrure: 1 };

// Remet un « look » d'aplomb (sauvegarde ancienne, valeur hors limites…)
function propre(look) {
  const l = Object.assign({}, LOOK_DEFAUT);
  if (look) for (const c of CHAMPS) { const v = look[c.k]; if (Number.isInteger(v) && v >= 0 && v < c.opts.length) l[c.k] = v; }
  return l;
}

// Traduit un « look » et une vocation en options de modèle 3D (voir makeHero dans pack.js)
export function optionsHeros(look, classe) {
  const l = propre(look), c = CLASSES[classe] || CLASSES[CLASSE_DEFAUT], fem = l.sil === 1, t = TENUES[l.tenue], coif = COIFFURES[l.coif][1];
  const ranger = t[1] === 'Ranger';
  const o = {
    fem, outfit: t[1], variant: t[2], hairTint: CHEVEUX[l.chev][1], beard: l.barbe === 1,
    height: (fem ? 1.68 : 1.78) + TAILLES[l.taille][1], wide: CARRURES[l.carrure][1],
    weapon: c.weapon, shield: !!c.shield, sheathed: true, pauldron: ranger && l.epaul === 1,
  };
  // la capuche n'existe que sur la tenue de rôdeur : avec une autre tenue, on garde les cheveux courts
  if (coif) o.hair = coif; else if (ranger) o.hood = true; else o.hair = 'SimpleParted';
  Object.assign(o, PEAUX[l.peau][2]);
  if (TEINTES[l.teinte][1] != null) o.dye = TEINTES[l.teinte][1];
  if (CAPES[l.cape][1] != null) o.cape = CAPES[l.cape][1];
  if (c.weapon === 'mace' || c.weapon === 'staff') o.guard = false;
  return o;
}

// Met Kael (données de combat et modèle 3D) à l'heure de la sauvegarde en cours
export function appliquerHeros() {
  const h = G.flags.heros || {};
  appliquerClasse(h.classe);
  const o = optionsHeros(h.look, h.classe);
  for (const k of Object.keys(HEROES3D.kael)) delete HEROES3D.kael[k];
  Object.assign(HEROES3D.kael, o);
}
// Fonctions appelées quand l'apparence change en cours de partie (story.js y reconstruit le personnage du joueur)
export const surChangement = [];

// ---------- Le studio : une petite scène à part, affichée à la place du jeu pendant l'édition ----------
let studio = null;
function ouvrirStudio() {
  if (studio) return studio;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x10142c);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x4a4660, 1.15));
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.5); sun.position.set(3, 5, 4); scene.add(sun);
  const back = new THREE.DirectionalLight(0x8fb0ff, 0.9); back.position.set(-4, 3, -4); scene.add(back);
  scene.environment = envFor(E.renderer, 0xbfd0ff, 0x6a6a7a, 1);
  // socle de pierre cerclé d'or, halo derrière le personnage
  const socle = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.16, 48), new THREE.MeshStandardMaterial({ color: 0x8a8c9c, roughness: 0.8 })); socle.position.y = -0.08; scene.add(socle);
  const cercle = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.035, 8, 64), new THREE.MeshStandardMaterial({ color: 0xd9b866, roughness: 0.35, metalness: 0.8 })); cercle.rotation.x = Math.PI / 2; cercle.position.y = 0.005; scene.add(cercle);
  const sol = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshBasicMaterial({ color: 0x0c1024 })); sol.rotation.x = -Math.PI / 2; sol.position.y = -0.16; scene.add(sol);
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'), gr = x.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(120,150,255,.75)'); gr.addColorStop(0.45, 'rgba(70,90,200,.28)'); gr.addColorStop(1, 'rgba(40,50,140,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, fog: false })); halo.position.set(0, 1.3, -2.4); scene.add(halo);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.2, 80);
  const pivot = new THREE.Group(); scene.add(pivot);
  const S = { scene, camera, pivot, perso: null, t: 0, zone: null, angle: 0.35, cible: 0.35, precedent: E.view };
  S.view = {
    scene, camera,
    update(dt) {
      S.t += dt;
      if (S.perso && S.perso.userData.anim) S.perso.userData.anim(dt, false, S.t);
      S.angle += (S.cible - S.angle) * Math.min(1, dt * 10); pivot.rotation.y = S.angle;
      // le personnage est cadré au milieu de la zone laissée libre par le panneau (à gauche sur un écran large, en haut sur un téléphone tenu droit)
      const W = window.innerWidth, H = window.innerHeight, r = S.zone ? S.zone.getBoundingClientRect() : { left: 0, top: 0, width: W, height: H };
      const zw = Math.max(60, r.width), zh = Math.max(60, r.height), haut = Math.max(2.55 * H / zh, 2.1 * H / zw), d = haut / (2 * Math.tan(camera.fov * Math.PI / 360));
      camera.aspect = W / H; camera.position.set(0, 1.0, d); camera.lookAt(0, 0.98, 0);
      camera.setViewOffset(W, H, W / 2 - (r.left + zw / 2), H / 2 - (r.top + zh / 2), W, H);
    },
  };
  E.view = S.view; studio = S; return S;
}
function fermerStudio() { if (!studio) return; E.view = studio.precedent; studio = null; }
function montrer(o, arme) {
  const S = studio; if (!S) return;
  if (S.perso) S.pivot.remove(S.perso);
  S.perso = makeHero(o); S.pivot.add(S.perso);
  if (S.perso.userData.draw) S.perso.userData.draw(!!arme);
}

// ---------- L'habillage HTML ----------
function cadre(titre, sous) {
  let el = $('perso');
  if (!el) {
    el = document.createElement('div'); el.id = 'perso';
    el.innerHTML = '<div id="persoZone"><div id="persoAide">Glisse pour faire tourner le personnage</div></div><div id="persoPanel"><h3 id="persoTitre"></h3><p id="persoSous"></p><div id="persoCorps"></div></div>';
    $('ui').appendChild(el);
    const z = el.firstChild; let id = null, lx = 0;
    z.addEventListener('pointerdown', (e) => { id = e.pointerId; lx = e.clientX; try { z.setPointerCapture(id); } catch (_) {} });
    z.addEventListener('pointermove', (e) => { if (e.pointerId !== id || !studio) return; studio.cible += (e.clientX - lx) * 0.012; lx = e.clientX; });
    const fin = (e) => { if (e.pointerId === id) id = null; }; z.addEventListener('pointerup', fin); z.addEventListener('pointercancel', fin);
  }
  el.classList.remove('hidden'); document.body.classList.add('dialog');
  $('persoTitre').textContent = titre; $('persoSous').innerHTML = sous || '';
  if (studio) studio.zone = $('persoZone');
  return $('persoCorps');
}
function fermerCadre() { const el = $('perso'); if (el) el.classList.add('hidden'); document.body.classList.remove('dialog'); }

// ---------- Étape 1 : la vocation ----------
const barre = (v, max) => `<i class="pBarre"><b style="width:${Math.round(Math.min(1, v / max) * 100)}%"></b></i>`;
function ficheClasse(id) {
  const c = CLASSES[id], b = c.base;
  const lignes = [['hp', 45], ['mp', 20], ['atk', 15], ['def', 15], ['mag', 15], ['vit', 15]].map(([k, m]) => `<span>${STAT_LABELS[k]}</span>${barre(b[k], m)}`).join('');
  const sk = c.skills.map(([lv, s]) => `<li><b>${SKILLS[s].name}</b> <small>niv. ${lv} — ${SKILLS[s].desc}</small></li>`).join('');
  const arme = { sword: 'une épée', mace: 'une masse et un bouclier', staff: 'un bâton', dagger: 'deux dagues' }[c.weapon];
  return `<p class="pDesc">${c.desc}</p><div class="pStats">${lignes}</div><p class="pArme">Arme : ${arme}</p><ul class="pSk">${sk}</ul>`;
}
async function choisirClasse(look, depart) {
  const ids = Object.keys(CLASSES), corps = cadre('Choisis ta vocation', "Le rôle de Kael dans l'équipe. Ce choix est définitif pour cette partie.");
  corps.innerHTML = '<div id="persoListe"></div><div id="persoFiche"></div>';
  const voir = (i) => { if (i < 0) return; $('persoFiche').innerHTML = ficheClasse(ids[i]); montrer(Object.assign(optionsHeros(look, ids[i]), { sheathed: false }), true); };
  const opts = ids.map((id) => ({ label: CLASSES[id].nom, right: CLASSES[id].role }));
  // la sélection de départ : on fait défiler la liste jusqu'à la vocation déjà choisie
  const p = pick($('persoListe'), opts, { cancel: true, cancelLabel: "← Retour à l'écran titre", onHover: voir });
  for (let i = 0; i < Math.max(0, ids.indexOf(depart)); i++) Input.nav('down');
  const r = await p;
  return r < 0 ? null : ids[r];
}

// ---------- Étape 2 : l'apparence ----------
function editerLook(look0, classe, cfg) {
  return new Promise((res) => {
    const look = propre(look0), corps = cadre(cfg.titre, cfg.sous);
    corps.innerHTML = '<div id="persoLignes"></div><div id="persoBoutons"></div>';
    $('persoPanel').classList.add('look');
    const lignes = $('persoLignes'), boutons = $('persoBoutons');
    let idx = 0, items = [];
    const maj = () => montrer(optionsHeros(look, classe), false);
    const change = (c, d, abs) => {
      look[c.k] = abs != null ? abs : (look[c.k] + d + c.opts.length) % c.opts.length;
      sfx('move'); dessiner(); maj();
    };
    const fini = (v) => { Input.nav = null; $('persoPanel').classList.remove('look'); sfx(v ? 'ok' : 'cancel'); res(v ? look : null); };
    const hasard = () => { for (const c of CHAMPS) look[c.k] = Math.floor(Math.random() * c.opts.length); if (Math.random() < 0.6) look.cape = 0; if (look.sil === 1) look.barbe = 0; sfx('move'); dessiner(); maj(); };
    const ACTIONS = [{ label: cfg.valider, go: () => fini(true), fort: true }, { label: '⚄ Au hasard', go: hasard }, { label: '↺ Défaire', go: () => { Object.assign(look, propre(look0)); sfx('move'); dessiner(); maj(); } }, { label: cfg.retour, go: () => fini(false) }];
    function dessiner() {
      lignes.innerHTML = ''; boutons.innerHTML = ''; items = [];
      for (const c of CHAMPS) {
        if (c.si && !c.si(look)) continue;
        const row = document.createElement('div'); row.className = 'pLigne';
        const nom = document.createElement('span'); nom.className = 'l'; nom.textContent = c.nom; row.appendChild(nom);
        const fl = (txt, d) => { const b = document.createElement('button'); b.className = 'pFl'; b.textContent = txt; b.addEventListener('click', () => { idx = items.findIndex((it) => it.c === c); change(c, d); }); return b; };
        row.appendChild(fl('‹', -1));
        const val = document.createElement('span'); val.className = 'v';
        if (c.sw) {
          c.sw.forEach((col, i) => {
            const b = document.createElement('button'); b.className = 'pSw' + (i === look[c.k] ? ' on' : '') + (col == null ? ' vide' : ''); b.title = c.opts[i];
            if (col != null) b.style.background = '#' + col.toString(16).padStart(6, '0');
            b.addEventListener('click', () => { idx = items.findIndex((it) => it.c === c); change(c, 0, i); }); val.appendChild(b);
          });
          const n = document.createElement('small'); n.textContent = c.opts[look[c.k]]; val.appendChild(n);
        } else val.textContent = c.opts[look[c.k]];
        row.appendChild(val); row.appendChild(fl('›', 1));
        row.addEventListener('pointerenter', () => { const i = items.findIndex((it) => it.c === c); if (i >= 0 && i !== idx) { idx = i; surligner(); } });
        lignes.appendChild(row); items.push({ el: row, c });
      }
      for (const a of ACTIONS) {
        const b = document.createElement('button'); b.className = 'opt' + (a.fort ? ' fort' : ''); b.textContent = a.label; b.addEventListener('click', a.go);
        b.addEventListener('pointerenter', () => { const i = items.findIndex((it) => it.a === a); if (i >= 0 && i !== idx) { idx = i; surligner(); } });
        boutons.appendChild(b); items.push({ el: b, a });
      }
      if (idx >= items.length) idx = items.length - 1;
      surligner();
    }
    function surligner() { items.forEach((it, i) => it.el.classList.toggle('sel', i === idx)); }
    Input.nav = (a) => {
      const it = items[idx];
      if (a === 'up' || a === 'down') { idx = (idx + (a === 'up' ? -1 : 1) + items.length) % items.length; sfx('move'); surligner(); items[idx].el.scrollIntoView({ block: 'nearest' }); }
      else if ((a === 'left' || a === 'right') && it.c) change(it.c, a === 'left' ? -1 : 1);
      else if (a === 'ok') { if (it.a) it.a.go(); else change(it.c, 1); }
      else if (a === 'cancel') fini(false);
    };
    dessiner(); maj();
  });
}

// ---------- Les deux entrées ----------
// Nouvelle partie : renvoie { classe, look }, ou null si le joueur revient à l'écran titre
export async function creerHeros() {
  ouvrirStudio();
  let classe = CLASSE_DEFAUT, look = propre(null);
  try {
    while (true) {
      const c = await choisirClasse(look, classe); if (!c) return null;
      classe = c;
      const l = await editerLook(look, classe, { titre: 'Ton apparence', sous: `Vocation : <b>${CLASSES[classe].nom}</b>. Tu pourras changer d'apparence plus tard, depuis le menu.`, valider: "✔ Commencer l'aventure", retour: '← Changer de vocation' });
      if (l) return { classe, look: l };
    }
  } finally { fermerCadre(); fermerStudio(); }
}

// En cours de partie : change l'apparence de Kael (pas sa vocation)
export async function modifierApparence() {
  const h = G.flags.heros || (G.flags.heros = { classe: CLASSE_DEFAUT, look: null });
  ouvrirStudio();
  let l = null;
  try { l = await editerLook(h.look, h.classe, { titre: 'Apparence de Kael', sous: `Vocation : <b>${(CLASSES[h.classe] || CLASSES[CLASSE_DEFAUT]).nom}</b> (elle ne change pas en cours de partie).`, valider: '✔ Garder cette apparence', retour: '← Annuler' }); }
  finally { fermerCadre(); fermerStudio(); }
  if (!l) return false;
  h.look = l; appliquerHeros();
  for (const f of surChangement) f();
  toast('Apparence modifiée.');
  return true;
}

menuExtras.push({ label: 'Apparence de Kael', sub: 'Coiffure, couleurs, tenue, cape…', action: modifierApparence, ferme: true });
