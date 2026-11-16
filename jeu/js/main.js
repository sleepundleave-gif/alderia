// ============================================================
//  ALDÉRIA : LA COURONNE D'AUBE — point d'entrée
//  Boucle de jeu, écran titre, nouvelle partie / continuer
// ============================================================
import { Ecran, fluidite, surPause, surRetour, infosApp, ecranMaj, verifierMaj, surAnnonce, annonceMaj, texteAnnonce } from './ecran.js';   // en premier : l'interface est mise à l'échelle de l'écran avant de s'afficher
import { E } from './engine.js';
import * as THREE from '../lib/three.module.min.js';   // (prêté aux outils d'essai : cartes, vérification des pieds)
import { G, newGame, load, hasSave } from './state.js';
import { initInput, Input } from './input.js';
import { initUI, $, pick, setFade, fade, setFastText, showHud } from './ui.js';
import { initAudio, music, pauseAudio } from './audio.js';
import { buildBrumeval } from './world.js';
import { startGame, debugPhase, PHASE_NAMES } from './story.js';
import { BattleCfg } from './battle.js';
import { loadPack } from './pack.js';
import { loadDecor, decorMode, setDecorMode } from './decor.js';
import { loadMonstres } from './monstres.js';
import { telecharger, journal } from './charge.js';
import { creerHeros } from './perso.js';
import './carte.js';                                        // ajoute « Carte du lieu » au menu
import { Q, NIVEAU, NIVEAUX, ORDRE, choisirNiveau, ambiancePour, compter, compteurVoulu, reglerCompteur, puce, sansPuce, BILAN } from './qualite.js';

function showError(e) {
  const el = $('err'); el.style.display = 'block';
  el.textContent = 'Erreur : ' + (e && (e.stack || e.message) || e);
}
window.addEventListener('error', (e) => showError(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => showError(e.reason));

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  const v = E.view;
  if (!v) return;
  v.update(dt);
  ambiancePour(v.scene);
  if (!window.__sansImage) E.renderer.render(v.scene, v.camera);      // (essais automatiques : on peut couper l'affichage)
  compter(E.renderer);
  fluidite(E, Q.plancher);                                                         // téléphone : la finesse de l'image suit la vitesse de l'appareil
  if (E.enabled && !E.busy) G.time += dt;
}

// Écran titre : le village de Brumeval, vu d'une caméra qui tourne lentement
async function titleScreen() {
  const st = buildBrumeval(false);
  E.setStage(st, { x: 0, z: 0 });
  let t = 0;
  E.view = {
    scene: E.scene, camera: E.camera,
    update(dt) {
      t += dt;
      for (const o of st.anims) o.userData.anim(dt, false, t);
      const a = t * 0.05 + 0.6;
      E.camera.position.set(Math.sin(a) * 46, 15, Math.cos(a) * 46 + 4);
      E.camera.lookAt(0, 6, -10);
    },
  };
  $('title').classList.remove('hidden');
  setFade(0);
  music('title');
  const vueTitre = E.view;
  // Nouvelle version en ligne ? L'application regarde (si le téléphone est connecté) et l'écran titre l'annonce.
  const annoncer = () => {
    const o = annonceMaj(), t = texteAnnonce(o, infosApp());
    $('titleNouveau').textContent = t ? '★ ' + t + ' — touchez « Mises à jour »' : '';
    for (const b of $('titleBtns').querySelectorAll('button')) if (b.textContent.startsWith('Mises à jour')) b.classList.toggle('neuf', !!t);
  };
  surAnnonce(annoncer); verifierMaj();
  while (true) {
    $('title').classList.remove('hidden'); E.view = vueTitre;
    const app = infosApp();                                    // dans l'application Android : version du jeu et mises à jour
    const nomPuce = puce(E.renderer);
    $('titleVersion').textContent = (app ? `Version ${app.jeu}${app.maj ? ' (mise à jour installée)' : ''} · application ${app.app} · sans connexion · ` : '') + 'graphismes ' + Q.nom;
    // pas de puce graphique utilisable : l'image est calculée par le processeur, aucun réglage ne rendra le jeu fluide
    $('titleAlerte').textContent = sansPuce(nomPuce) ? 'Ce téléphone dessine le jeu sans sa puce graphique (« ' + nomPuce.slice(0, 40) + ' ») : il sera lent. Mettez à jour « Android System WebView » et « Chrome » depuis le Play Store, puis relancez le jeu.' : '';
    const choix = pick($('titleBtns'), [
      { label: 'Nouvelle partie' },
      { label: 'Continuer', disabled: !hasSave() },
      { label: 'Options' },
      ...(app ? [{ label: 'Mises à jour' }] : []),
    ]);
    annoncer();                                                // (le menu vient d'être refait : on y remet l'annonce)
    const r = await choix;
    if (r === 3) { $('title').classList.add('hidden'); await ecranMaj(); continue; }
    if (r === 2) { await options(nomPuce); continue; }
    initAudio();
    if (r === 1 && load()) { await fade(true, 600); $('title').classList.add('hidden'); break; }
    // Nouvelle partie : choix de la vocation, puis de l'apparence (essais automatiques : __sansCreation saute l'écran)
    let heros = typeof window.__sansCreation === 'object' ? window.__sansCreation : null;
    if (!window.__sansCreation) {
      await fade(true, 300); $('title').classList.add('hidden'); setFade(0);
      heros = await creerHeros();
      if (!heros) continue;                                    // « Retour à l'écran titre »
    }
    await fade(true, 600); $('title').classList.add('hidden');
    newGame(heros); break;
  }
  await startGame();
}

// Options de l'écran titre : graphismes, nature, compteur d'images. Les deux premières se lisent au chargement : on relance la page.
async function options(nomPuce) {
  const relancer = async () => { $('titleBtns').innerHTML = '<p>Un instant…</p>'; location.reload(); await new Promise(() => {}); };
  while (true) {
    const compteur = compteurVoulu();
    const r = await pick($('titleBtns'), [
      { label: 'Graphismes : ' + Q.nom, sub: Q.aide + ' · toucher pour changer (' + ORDRE.map((c) => NIVEAUX[c].nom).join(' → ') + ')' },
      { label: 'Nature : ' + (decorMode() === 'reel' ? 'réaliste' : 'dessinée'), sub: 'la nature dessinée est plus légère · toucher pour changer' },
      { label: 'Compteur d\'images : ' + (compteur ? 'affiché' : 'caché'), sub: 'images par seconde, en haut de l\'écran' },
      { label: '← Retour' },
    ]);
    if (r === 0) { choisirNiveau(ORDRE[(ORDRE.indexOf(NIVEAU) + 1) % ORDRE.length]); await relancer(); }
    else if (r === 1) { setDecorMode(decorMode() === 'reel' ? 'dessin' : 'reel'); await relancer(); }
    else if (r === 2) reglerCompteur(!compteur);
    else return;
  }
}

function boot() {
  const canvas = $('c');
  try { E.init(canvas); }
  catch (e) { showError("Impossible de démarrer l'affichage 3D (WebGL) dans ce navigateur.\n" + e); return; }
  initInput(canvas);
  initUI();
  surPause(pauseAudio);                                      // application en arrière-plan : la musique se tait
  surRetour(() => { Input.menuFlag = true; });               // touche Retour d'Android : ouvre le menu du jeu
  reglerCompteur(compteurVoulu());
  requestAnimationFrame(loop);
  // Outils de test (console du navigateur)
  window.__game = { E, G, Input, BattleCfg, setFastText, debugPhase, PHASE_NAMES, newGame, showHud, Q, BILAN, THREE };
  // Les modèles (personnages, maisons, arbres…) sont téléchargés puis préparés avant l'écran titre.
  // Le téléchargement ne renonce jamais : si la connexion coupe, il attend et reprend (voir charge.js).
  const ld = $('loading'), what = $('loadWhat'), note = $('loadNote'), mo = (n) => (n / 1048576).toFixed(1).replace('.', ',');
  const show = (e) => {
    if (!ld) return;
    const k = e.total ? e.recu / e.total : 0;
    ld.querySelector('i').style.width = Math.round(k * 100) + '%';
    ld.querySelector('span').textContent = e.total ? Math.round(k * 100) + ' % (' + mo(e.recu) + ' sur ' + mo(e.total) + ' Mo)' : '';
    what.textContent = e.fini ? 'Préparation des modèles…' : 'Téléchargement des modèles…';
    if (e.fini) ld.querySelector('span').textContent = '';
    note.textContent = e.message;
  };
  telecharger(show)
    .then(() => Promise.all([loadPack(), loadDecor(), loadMonstres()]))
    .then(() => { if (ld) ld.remove(); return titleScreen(); })
    .catch((e) => { journal('erreur au demarrage : ' + ((e && (e.stack || e.message)) || e)); showError(e); });
}
boot();
