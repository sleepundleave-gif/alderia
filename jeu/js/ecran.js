// ============================================================
//  ÉCRAN : l'interface s'adapte à tous les écrans, et l'application Android
//
//  1. ADAPTATION. L'interface est dessinée pour un écran d'au moins 740 × 420 points. Sur un écran plus petit
//     (téléphone en paysage) ou tactile plus grand (tablette), toute l'interface (#ui) est réduite ou agrandie
//     d'un même facteur k : rien ne déborde, les proportions restent celles qui ont été vérifiées.
//     Le décor 3D, lui, remplit toujours tout l'écran.
//       k = min(hauteur / 420, largeur / 740), borné
//     Les feuilles de style ne se servent pas de vw / vh (qui ignorent k) mais de var(--vw), var(--vh), var(--vmin).
//     body.bas : écran « bas » (moins de 480 points de haut une fois mis à l'échelle) : panneaux plus serrés.
//  2. ENCOCHES. Sur un téléphone à encoche, l'interface reste dans la zone sûre ; les fonds (fondu au noir,
//     écran titre, menu) vont, eux, jusqu'au bord (var(--eg), --ed, --eh, --eb : marges à gauche, à droite…).
//  3. FLUIDITÉ. Sur un appareil tactile, si l'image ralentit, la finesse de l'image baisse d'un cran ; elle remonte
//     si l'appareil suit largement.
//  4. APPLICATION ANDROID (window.AlderiaApp, voir android/) : touche Retour, pause, versions, mises à jour.
// ============================================================
const App = window.AlderiaApp || null;
const REF_H = 420, REF_L = 740;
export const Ecran = { k: 1, g: 0, h: 0, d: 0, b: 0, l: window.innerWidth, t: window.innerHeight, app: !!App, tactile: false };

let sonde = null;
function encoches() {
  let e = [0, 0, 0, 0];
  // ce que dit le navigateur (env(safe-area-inset-*)) …
  try {
    if (!sonde) { sonde = document.createElement('div'); sonde.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)'; document.body.appendChild(sonde); }
    const c = getComputedStyle(sonde); e = [parseFloat(c.paddingLeft) || 0, parseFloat(c.paddingTop) || 0, parseFloat(c.paddingRight) || 0, parseFloat(c.paddingBottom) || 0];
  } catch (_) {}
  // … et ce que dit l'application (plus sûr sur Android) : on garde le plus grand des deux
  try { if (App && App.encoches) { const a = String(App.encoches()).split(',').map(Number); for (let i = 0; i < 4; i++) if (a[i] > e[i]) e[i] = a[i]; } } catch (_) {}
  if (window.__encochesEssai) e = window.__encochesEssai;                      // essais automatiques
  return e.map((v) => Math.max(0, Math.min(120, Math.round(v))));
}

export function adapter() {
  const ui = document.getElementById('ui'), B = document.body, R = document.documentElement.style; if (!ui) return;
  const L = window.innerWidth, T = window.innerHeight, [g, h, d, b] = encoches();
  const tactile = !!App || B.classList.contains('touch') || !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const l = Math.max(1, L - g - d), t = Math.max(1, T - h - b);
  let k = Math.min(t / REF_H, l / REF_L);
  k = tactile ? Math.max(0.5, Math.min(1.6, k)) : Math.max(0.5, Math.min(1, k));   // à la souris, on ne grossit jamais l'interface
  if (Math.abs(k - 1) < 0.02) k = 1;
  const echelle = k !== 1 || g + h + d + b > 0;
  Object.assign(Ecran, { k, g, h, d, b, l: l / k, t: t / k, tactile });
  if (echelle) Object.assign(ui.style, { left: g + 'px', top: h + 'px', right: 'auto', bottom: 'auto', width: l / k + 'px', height: t / k + 'px', transform: k === 1 ? '' : `scale(${k})`, transformOrigin: '0 0' });
  else Object.assign(ui.style, { left: '', top: '', right: '', bottom: '', width: '', height: '', transform: '', transformOrigin: '' });
  R.setProperty('--vw', l / k / 100 + 'px'); R.setProperty('--vh', t / k / 100 + 'px'); R.setProperty('--vmin', Math.min(l, t) / k / 100 + 'px');
  R.setProperty('--eg', g / k + 'px'); R.setProperty('--ed', d / k + 'px'); R.setProperty('--eh', h / k + 'px'); R.setProperty('--eb', b / k + 'px');
  B.classList.toggle('echelle', echelle); B.classList.toggle('bas', t / k <= 480); B.classList.toggle('etroit', l / k < 700);
  B.classList.toggle('app', !!App); B.classList.toggle('tactile', tactile);
}

// Un point de l'écran (en points réels) → sa place dans l'interface mise à l'échelle
export function versUI(x, y) { return [(x - Ecran.g) / Ecran.k, (y - Ecran.h) / Ecran.k]; }

adapter();
window.addEventListener('resize', adapter);
window.addEventListener('orientationchange', () => setTimeout(adapter, 250));
window.addEventListener('touchmode', adapter);
window.__encoches = adapter;                                                    // l'application prévient quand les encoches changent
window.__ecran = Ecran;

// ---------- Fluidité : la finesse de l'image suit ce que l'appareil sait faire ----------
let debut = 0, images = 0, lent = 0, vite = 0, finesse = 0, plafond = 0, hausses = 0;
// plancher : la finesse la plus basse permise par le niveau de graphismes (qualite.js)
export function fluidite(E, plancher = 1) {
  if (!Ecran.tactile || document.hidden || window.__sansImage || !E.renderer) return;
  const m = performance.now();
  if (!finesse) { finesse = plafond = E.renderer.getPixelRatio(); debut = m; images = 0; return; }
  if (m - debut > 3000) { debut = m; images = 0; return; }                    // un long arrêt (chargement, pause) ne compte pas
  if (++images < 30 || m - debut < 700) return;
  const ips = images * 1000 / (m - debut); debut = m; images = 0;
  let cible = finesse;
  // sous 27 images par seconde deux mesures de suite : on dessine moins de points ; très lent (sous 16) : on réagit tout de suite
  if (ips < 27) { vite = 0; if (++lent >= 2 || ips < 16) { cible = Math.max(Math.min(plancher, finesse), finesse * (ips < 16 ? 0.75 : 0.86)); lent = 0; } }
  else if (ips > 50) { lent = 0; if (++vite >= 6 && hausses < 3 && finesse < plafond) { cible = Math.min(plafond, finesse * 1.1); vite = 0; hausses++; } }
  else { lent = 0; vite = 0; }
  if (Math.abs(cible - finesse) > 0.01) { finesse = cible; E.renderer.setPixelRatio(finesse); if (E.resize) E.resize(); }
}

// ---------- Pause : quand le jeu passe à l'arrière-plan, la musique se tait ----------
const pauses = [];
export function surPause(fn) { pauses.push(fn); }
const pause = (p) => { for (const f of pauses) try { f(p); } catch (_) {} };
document.addEventListener('visibilitychange', () => pause(document.hidden));
window.__pause = pause;

// ---------- Touche Retour d'Android : ferme ce qui est ouvert, sinon ouvre le menu ; false = « quitter ? » ----------
let retourMenu = null;
export function surRetour(fn) { retourMenu = fn; }
window.__retour = () => {
  const visible = (id) => { const e = document.getElementById(id); return !!e && !e.classList.contains('hidden'); };
  if (visible('majEcran')) { fermerMaj(); return true; }
  if (visible('menu') || visible('choice') || visible('perso')) { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true })); return true; }
  if (visible('title') || visible('battle') || document.body.classList.contains('dialog')) return false;
  if (visible('hud') && retourMenu) { retourMenu(); return true; }
  return false;
};

// ---------- Application : versions et mises à jour ----------
export function infosApp() { try { return App ? JSON.parse(App.infos()) : null; } catch (_) { return null; } }

// L'adresse du dossier des mises à jour (GitHub). Les applications 1.3 et suivantes la connaissent déjà ; les plus anciennes
// la trouvent ici, préremplie dans l'écran « Mises à jour », dès qu'elles ont reçu cette version du jeu.
export const ADRESSE_MAJ = 'https://sleepundleave-gif.github.io/alderia/maj/';

// ---------- Annonce d'une nouvelle version ----------
// À l'écran titre, l'application regarde en ligne (si le téléphone est connecté) s'il existe une version plus récente du jeu
// ou de l'application. Elle ne télécharge rien : elle prévient, et le joueur décide. Sans connexion, rien ne se passe.
//   annonce = { jeu, nom, appMin, appCode, appNom, lien }   (seuls les champs utiles sont présents)
let annonce = null; const ecouteurs = new Set();
window.__nouveau = (o) => { if (!o || typeof o !== 'object') return; annonce = o; for (const f of ecouteurs) { try { f(o); } catch (_) {} } };
export const annonceMaj = () => annonce;
export function surAnnonce(f) { ecouteurs.add(f); if (annonce) f(annonce); return () => ecouteurs.delete(f); }
export function verifierMaj() { try { if (App && App.verifier && navigator.onLine !== false) App.verifier(); } catch (_) {} }
// La phrase qui annonce la nouveauté (écran titre et écran des mises à jour)
export function texteAnnonce(o, I) {
  if (!o) return '';
  const code = I && I.code != null ? I.code : 0, l = [];
  if (o.jeu != null) l.push('Nouvelle version du jeu : ' + (o.nom || 'version ' + o.jeu) + (o.appMin > code ? ' (elle demande la nouvelle application)' : ''));
  if (o.appCode != null) l.push('Nouvelle application ' + (o.appNom || '') + ' à télécharger');
  return l.join(' · ');
}

let fermerMaj = () => {};
// L'écran « Mises à jour » : version en place, recherche en ligne, installation depuis un fichier, retour à l'origine
export function ecranMaj() {
  return new Promise((fin) => {
    const ui = document.getElementById('ui'), el = document.createElement('div'), I = infosApp() || {};
    el.id = 'majEcran';
    el.innerHTML = `<div id="majBoite">
      <h3>Mises à jour</h3>
      <p id="majVersion"></p>
      <p id="majNouveau"></p>
      <button class="opt" id="majAppli">Télécharger la nouvelle application<small>Ouvre la page de téléchargement ; installez-la par-dessus celle-ci, vos sauvegardes sont conservées</small></button>
      <p class="majAide">Les nouveaux chapitres s'ajoutent au jeu déjà installé. <b>Vos sauvegardes sont conservées.</b> Le jeu lui-même fonctionne sans connexion.</p>
      <div class="majLigne"><input id="majAdresse" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://… (adresse des mises à jour)"><button class="opt" id="majChercher">Chercher en ligne</button></div>
      <button class="opt" id="majFichier">Installer un fichier de mise à jour (.zip)<small>Un fichier « alderia-maj-….zip » reçu ou copié sur le téléphone : aucune connexion nécessaire</small></button>
      <button class="opt" id="majOrigine">Revenir à la version d'origine<small>Retire les mises à jour ; l'application retrouve le jeu avec lequel elle a été installée</small></button>
      <div id="majEtat"><span></span><div class="bar"><i style="width:0"></i></div></div>
      <button class="opt" id="majFermer">← Retour</button>
    </div>`;
    ui.appendChild(el);
    const $ = (id) => el.querySelector('#' + id), etat = $('majEtat'), barre = etat.querySelector('.bar'), boutons = [...el.querySelectorAll('button')];
    const montrer = () => { const J = infosApp() || I; $('majVersion').innerHTML = `Jeu : <b>version ${J.jeu != null ? J.jeu : '?'}</b>${J.nom ? ' (' + J.nom + ')' : ''}${J.maj ? ' — mise à jour installée' : ''}<br>Application : ${J.app || '?'}`; $('majOrigine').style.display = J.maj ? '' : 'none'; };
    const dire = (t, part, cls = '') => { etat.className = cls; etat.querySelector('span').textContent = t; barre.style.display = part >= 0 ? '' : 'none'; barre.firstChild.style.width = Math.round(Math.max(0, part) * 100) + '%'; };
    const geler = (g) => boutons.forEach((b) => { if (b.id !== 'majFermer' || g === 2) b.disabled = !!g; });
    $('majAdresse').value = I.adresse || ADRESSE_MAJ; montrer(); dire('', -1);
    // une nouveauté annoncée : on le dit, et on propose le bon bouton
    const annoncer = (o) => {
      const t = texteAnnonce(o, I); $('majNouveau').textContent = t ? '★ ' + t + (o.jeu != null && !(o.appMin > (I.code || 0)) ? '. Touchez « Chercher en ligne » pour l\'installer.' : '.') : '';
      $('majAppli').style.display = o && o.lien && App && App.ouvrir ? '' : 'none';
      el.querySelector('.majAide').style.display = t ? 'none' : '';      // (petits écrans : l'annonce prend la place de l'explication)
      $('majChercher').classList.toggle('neuf', !!(o && o.jeu != null));
    };
    annoncer(annonce); const oublier = surAnnonce(annoncer);
    $('majAppli').onclick = () => { try { App.ouvrir(annonce.lien); } catch (_) {} };
    window.__maj = (e, texte, part) => {
      if (e === 'cours') { geler(1); dire(texte, part); }
      else if (e === 'fait') { geler(2); dire(texte, 1, 'bon'); }            // la page va être rechargée par l'application
      else if (e === 'ajour') { geler(0); dire(texte, -1, 'bon'); montrer(); }
      else if (e === 'echec') { geler(0); dire(texte, -1, 'mauvais'); }
      else { geler(0); dire('', -1); }
    };
    const appel = (fn) => { try { fn(); } catch (e) { dire('Indisponible dans cette version de l\'application.', -1, 'mauvais'); } };
    $('majChercher').onclick = () => appel(() => { dire('Recherche d\'une mise à jour…', -1); App.chercher($('majAdresse').value); });
    $('majFichier').onclick = () => appel(() => { dire('Choisissez le fichier de mise à jour…', -1); App.choisirFichier(); });
    $('majOrigine').onclick = () => appel(() => App.retablir());
    fermerMaj = () => { if ($('majFermer').disabled) return; window.__maj = null; fermerMaj = () => {}; oublier(); el.remove(); fin(); };
    $('majFermer').onclick = () => fermerMaj();
  });
}
