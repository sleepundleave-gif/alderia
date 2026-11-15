// ============================================================
//  HISTOIRE : chapitres 1 et 2, scène par scène (le chapitre 3 est dans story3.js)
//  (dialogues repris du script « 01_Acte1_Chapitres_01-10.md »)
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { E } from './engine.js';
import { G, save, makeHero, healParty, heroStats, addItem, removeItem, countItem, hero, snapshot, restore } from './state.js';
import { ITEMS, EQUIP, HEROES, SKILLS, ENEMIES } from './data.js';
import { $, sleep, say, talk, choose, toast, setObjective, updateGold, showHud, hint, fade, setFade, narrate, chapterCard, shop } from './ui.js';
import { sfx, music } from './audio.js';
import { runBattle } from './battle.js';
import { buildBrumeval, buildBois, buildMurmures, buildRelais } from './world.js';
import { chapter3 } from './story3.js';
import { chapter4 } from './story4.js';
import { chapter5 } from './story5.js';
import { chapter6 } from './story6.js';
import { chapter7 } from './story7.js';
import { chapter8 } from './story8.js';
import { chapter9 } from './story9.js';
import { chapter10 } from './story10.js';
import { appliquerHeros, surChangement } from './perso.js';
import { brancherMaisons, loge } from './interieurs.js';
import { makeChar, makeWolf, makeChest, makeEnemyModel, makeHorse, makeFire, sph } from './models.js';

const PI = Math.PI;
const F = () => G.flags;
let kael = null, lyra = null, nyssa = null, borin = null;

// ---------- Outils ----------
function syncParty() {
  if (!kael) { appliquerHeros(); kael = makeChar('kael'); }
  if (!lyra) lyra = makeChar('lyra');
  if (hero('nyssa') && !nyssa) nyssa = makeChar('nyssa');
  if (hero('borin') && !borin) borin = makeChar('borin');
  kael.userData.pose = false; kael.rotation.x = 0; kael.position.y = 0; kael.visible = true;
  for (const o of [nyssa, borin]) if (o) { o.userData.pose = false; o.userData.stay = false; o.position.y = 0; o.visible = true; }
  // Les compagnons suivent en file : Lyra, Nyssa, Borin
  E.setParty(kael, [hero('lyra') && lyra, hero('nyssa') && nyssa, hero('borin') && borin].filter(Boolean));
}

// Le joueur a changé l'apparence de Kael depuis le menu : on refait son modèle, à la même place
surChangement.push(() => {
  if (!kael) return;
  const vieux = kael; kael = makeChar('kael');
  kael.position.copy(vieux.position); kael.rotation.y = vieux.rotation.y;
  E.setParty(kael, E.followers.slice());
  save();
});

function enter(st, spawn) { syncParty(); E.setStage(st, spawn); music(st.music); showHud(true); updateGold(); }

function autosave(phase) { if (phase) G.phase = phase; delete G.flags.pos; save(); }

async function goPhase(name) { autosave(name); await PHASES[name](); }

function tween(ms, fn) {
  return new Promise(res => { const t0 = performance.now(); (function step() { const k = Math.min(1, (performance.now() - t0) / ms); fn(k); if (k < 1) requestAnimationFrame(step); else res(); })(); });
}

// Combat avec transition ; les combats d'histoire se rejouent en cas de défaite
async function fight(enemies, opts = {}) {
  while (true) {
    const snap = snapshot();
    await fade(true, 220);
    const p = runBattle(enemies, opts);
    fade(false, 260);
    const result = await p;
    setFade(1);
    if (result === 'lose') {
      restore(snap); healParty();
      if (opts.story) {
        await narrate(["L'équipe reprend son souffle...\nPV et PM restaurés. Le combat recommence."]);
        continue;
      }
    }
    music(E.stage ? E.stage.music : '');
    updateGold();
    fade(false, 300);
    return result;
  }
}

function give(id, n = 1) { addItem(id, n); sfx('item'); toast(`Obtenu : <b>${ITEMS[id].name}</b>${n > 1 ? ' ×' + n : ''}`); }

// Coffre : donne son contenu une seule fois
function chest(st, id, pos, ry, onOpen, label = 'Ouvrir le coffre') {
  const c = makeChest(!!F()['c_' + id]);
  st.add(c, pos.x, pos.z, ry); st.circle(pos.x, pos.z, 0.5);
  st.interact({ obj: c, r: 2.1, label, turn: false, cond: () => !F()['c_' + id], action: async () => {
    sfx('chest');
    await tween(350, k => { c.userData.lid.rotation.x = -1.2 * k; });
    F()['c_' + id] = 1; await onOpen();
  } });
  return c;
}

function npc(st, key, charKey, x, z, ry, label, action, over) {
  const o = makeChar(charKey, over);
  o.userData.fiche = { charKey, over, label, action };
  if (loge(st, key)) { st.actors[key] = o; o.position.set(x, 0, z); return o; }      // il tient boutique : on le trouvera derrière son comptoir (interieurs.js)
  st.actor(key, o, x, z, ry);
  if (action) st.interact({ obj: o, r: 2.9, label: 'Parler ' + label, action });
  return o;
}

function reader(st, pos, label, lines) { st.interact({ x: pos.x, z: pos.z, r: 2.2, label, action: () => talk(lines) }); }

// Statue d'Aube : sauvegarde (et tente)
function statue(st, pos) {
  st.interact({ x: pos.x, z: pos.z, r: 2.6, label: "Toucher la statue d'Aube", action: async () => {
    const opts = [{ label: 'Sauvegarder la partie' }];
    if (countItem('tente')) opts.push({ label: 'Planter la tente', right: '×' + countItem('tente'), sub: "Restaure les PV et PM de toute l'équipe" });
    const r = await choose("<b>Statue d'Aube</b> — Une lumière douce émane de la pierre.", opts, { cancel: true });
    if (r === -1) return;
    if (r === 1) { removeItem('tente'); await fade(true, 500); healParty(); sfx('heal'); await sleep(400); await fade(false, 500); toast('PV et PM restaurés.'); }
    G.flags.pos = { x: E.player.position.x, z: E.player.position.z };
    if (save()) { sfx('save'); toast('Partie sauvegardée.'); } else toast('Sauvegarde impossible dans ce navigateur.');
  } });
}

function sparkle(st, id, pos, item) {
  if (F()['s_' + id]) return;
  const g = new THREE.Group();
  const s = sph(0.3, 0xfff4a0, 0, 0.35, 0, { basic: true }), h = sph(0.8, 0xfff4a0, 0, 0.35, 0, { basic: true, opacity: 0.25 });
  g.add(s); g.add(h);
  g.userData.anim = (dt, m, t) => { const k = 1 + Math.sin(t * 5) * 0.3; s.scale.setScalar(0.3 * k); h.scale.setScalar(0.8 * k); };
  st.add(g, pos.x, pos.z);
  st.interact({ obj: g, r: 2, label: 'Ramasser', turn: false, cond: () => !F()['s_' + id], action: async () => { F()['s_' + id] = 1; st.remove(g); give(item); } });
}

function lieDown(o, on = true) {
  if (o.userData.imported) { if (on) o.userData.poseAt('Death01'); else o.userData.pose = false; o.rotation.x = 0; o.position.y = 0; return; }   // modèle importé : dernière image du clip de chute
  o.userData.pose = on; o.rotation.x = on ? -1.45 : 0; o.position.y = on ? 0.18 : 0;
}

function mobs(st, list, arena, extra) {
  for (const m of list) {
    if (F()['m_' + m.id]) continue;
    st.mob({ obj: makeEnemyModel((ENEMIES[m.enemies[0]] && ENEMIES[m.enemies[0]].model) || m.enemies[0]), x: m.x, z: m.z, roam: m.roam ?? 3, enemies: m.enemies, id: m.id, speed: m.speed || 3.3 });
  }
  st.onMob = async (m) => {
    const opts = Object.assign({ arena }, extra ? extra(m) : {});
    const r = await fight(m.enemies, opts);
    if (r === 'win') { st.removeMob(m); F()['m_' + m.id] = 1; if (m.onWin) await m.onWin(); if (st.onMobWin) await st.onMobWin(m); }
    else { m.cool = 5; if (r === 'lose') { toast("L'équipe a été secourue de justesse."); } }
  };
}

// ============================================================
//  CHAPITRE 1 — LES CENDRES DE BRUMEVAL
// ============================================================

// ---------- Scènes 1 et 2 : la forge, la place du village ----------
async function ch1_forge() {
  const st = buildBrumeval(false), S = st.spots;
  brancherMaisons(st, TOOLS);                                // on peut entrer dans les maisons, l'auberge et la demeure du chef
  const hagen = npc(st, 'hagen', 'hagen', -1.25, 26.6, PI / 2, 'à Hagen', async () => {
    if (!F().epee) await talk([['HAGEN', "Tu es encore là ? L'épée du chef ne va pas se livrer toute seule. Sa maison est à l'ouest de la place."]]);
    else await talk([['HAGEN', "Livrée ? Bien. Maintenant, au bois. Le sentier part au nord, après le pont de pierre."], ['HAGEN', "Et tiens ta garde haute. C'est une arme, pas une louche."]]);
  });
  // Hagen martèle l'enclume
  const baseAnim = hagen.userData.anim, HP = hagen.userData.P;
  hagen.userData.hammer = true;
  if (hagen.userData.imported) hagen.userData.post = (b, t) => { if (hagen.userData.hammer && !E.busy) b.lowerarm_r.rotateZ(-1.15 + Math.sin(t * 7) * 0.55); };   // un geste ajouté par-dessus le clip de repos
  else hagen.userData.anim = (dt, m, t) => { if (hagen.userData.hammer && !E.busy) HP.armR.rotation.x = -1.5 + Math.sin(t * 7) * 0.7; else baseAnim(dt, m, t); };

  chest(st, 'forge', S.chestForge, PI, async () => { give('potion', 2); await talk([['KAEL', "Les potions de secours de Hagen. Il ne dira rien... s'il ne le voit pas."]]); });

  const aubin = npc(st, 'aubin', 'aubin', -15.6, 0, PI / 2, 'au chef Aubin', async () => {
    if (!F().epee) {
      await talk([
        ['AUBIN', "Ah, Kael ! Mon épée. Je commençais à croire que Hagen l'avait gardée pour lui."],
        ['KAEL', "Il l'a trempée trois fois. Il dit qu'elle vous enterrera."],
        ['AUBIN', "*Il soupèse la lame.* Du beau travail. Ce vieux bougon forge comme on forgeait à la capitale."],
        ['AUBIN', 'Tiens, pour ta peine. Et profite de la fête, mon garçon. Une journée comme celle-ci, ça ne revient pas.'],
      ]);
      F().epee = 1; G.gold += 20; updateGold(); sfx('item'); toast("Reçu : <b>20 pièces d'or</b>");
      setObjective("Aller s'exercer au bois : le sentier part au nord, après le pont de pierre");
      save();
    } else await talk([['AUBIN', "Trente ans que je dirige ce village, et jamais une Fête de l'Aube sans soleil. Les anciens veillent sur nous."]]);
  });

  const mira = npc(st, 'mira', 'mira', 14.9, 3.5, -PI / 2, 'à Mira', async () => {
    if (!F().epee) await talk([['MIRA', "Kael ! Tu n'as pas encore livré l'épée ? Le chef fait les cent pas sur son perron depuis ce matin."], ['MIRA', 'File. Et reviens me voir après.']]);
    else if (!F().mira) await miraScene();
    else await talk([['MIRA', "À ce soir. Et n'oublie pas : tu as promis."]]);
  });

  npc(st, 'gaspard', 'gaspard', 14.4, -6.3, PI, 'à Gaspard', () => talk([
    ['GASPARD', "Kael ! Dis à Hagen que son tonneau de bière l'attend. Ce soir, c'est l'auberge du Coq Doré qui régale."],
    ['GASPARD', "Et si tu vois ma fille, dis-lui que les chopes ne s'essuient pas toutes seules."],
  ]));
  npc(st, 'boulanger', 'boulanger', -6.5, -8.9, 0, 'au boulanger', () => talk([
    ['BOULANGER', "Brioches de l'Aube ! Toutes chaudes ! Une par personne... bon, deux pour toi, tu as l'air affamé."],
    ['BOULANGER', "On dit que des colonnes de soldats gris ont passé la frontière du nord. Bah. Brumeval est trop petit pour intéresser qui que ce soit."],
  ]));
  npc(st, 'odile', 'odile', -5.2, 7.4, 2.4, 'à la vieille Odile', () => talk([
    ['ODILE', "Assieds-toi, petit. Sais-tu pourquoi nous fêtons l'Aube ?"],
    ['ODILE', "Il y a mille ans, un roi portait la Couronne d'Aube. Il voulut vivre toujours, et la Couronne fit de lui Morvath, le Dévoreur d'Aube, qui avalait la lumière du jour."],
    ['ODILE', 'Sept héros le vainquirent. Ils brisèrent la Couronne en sept Éclats et les cachèrent aux quatre coins du monde.'],
    ['ODILE', "Tant que les Éclats restent séparés, Morvath dort. Voilà pourquoi le soleil se lève. Voilà pourquoi on danse."],
    ['KAEL', "C'est une belle histoire, Odile."],
    ['ODILE', "Les belles histoires sont les plus vraies. *Elle regarde le pendentif de Kael un instant de trop.*"],
  ]));
  npc(st, 'v1', 'villageois1', -11, -16, 1.2, 'au villageois', () => talk([['VILLAGEOIS', "Le pont de pierre a tenu cent crues. Mon grand-père disait qu'il tiendrait jusqu'à la fin du monde."]]));
  npc(st, 'v2', 'villageoise1', 7.2, -8.9, 0, 'à la marchande', () => talk([['MARCHANDE', "Des rubans pour la danse de ce soir ! Un bleu irait bien à la petite Mira, tu ne crois pas ?"]]));
  npc(st, 'v3', 'villageois1', 10.2, 6.5, -PI / 2, 'au forain', () => talk([['FORAIN', "Trois anneaux, trois piquets ! ... Reviens ce soir, je n'ai pas fini d'installer."]]), { top: 0x8a4a8a, sleeve: 0x8a4a8a, hair: 0xc0a040 });

  // Deux enfants courent en rond autour du mât de fête
  ['enfant1', 'enfant2'].forEach((k, i) => {
    const c = makeChar(k); st.actor(k, c, 0, -4, 0, false);
    let a = i * PI;
    c.userData.anim = ((base) => (dt, m, t) => {
      if (E.busy) { base(dt, false, t); return; }     // ils s'arrêtent pendant les dialogues
      a += dt * 1.1; const x = Math.cos(a) * 4.6, z = -4 + Math.sin(a) * 4.6; c.position.set(x, st.sol ? st.sol(x, z, c.position.y) : 0, z); c.userData.gy = c.position.y; c.rotation.y = -a; base(dt, true, t);   // (à la hauteur du pavé)
    })(c.userData.anim);
    st.interact({ obj: c, r: 2.0, label: 'Parler', turn: false, action: () => talk([[i ? 'LISON' : 'TOM', i ? "Kael ! C'est vrai que tu vas danser avec Mira ? Tout le village le sait !" : "Attrape-moi si tu peux ! Tu cours moins vite qu'un forgeron !"]]) });
  });

  chest(st, 'auberge', S.chestAuberge, -PI / 2, async () => { G.gold += 30; updateGold(); toast("Trouvé : <b>30 pièces d'or</b>"); await talk([['KAEL', "La cachette de Gaspard, derrière les tonneaux. Il la change de place tous les ans... et je la retrouve tous les ans."]]); });
  sparkle(st, 'moulin', S.herbe, 'herbe');
  reader(st, S.panneauSud, 'Lire le panneau', [['PANNEAU', 'Route de Solméria, la Cité Blanche — trois jours de marche.'], ['KAEL', "La capitale... Hagen dit que je n'y ai rien à faire. Pas aujourd'hui, en tout cas."]]);
  reader(st, S.panneauNord, 'Lire le panneau', [['PANNEAU', 'Bois de Brumeval — attention aux loups.']]);
  reader(st, { x: 0, z: 3 }, 'Regarder le puits', [['KAEL', "Le puits de la place. Mira y a jeté une pièce pour chacun de ses vœux. Il doit être plein."]]);

  async function miraScene() {
    F().mira = 1;
    mira.userData.col.off = true;
    const p = kael.position;
    if (Math.hypot(mira.position.x - p.x, mira.position.z - p.z) > 3) {
      await say('MIRA', 'Kael ! Attends !');
      const d = Math.hypot(mira.position.x - p.x, mira.position.z - p.z);
      const tx = p.x + (mira.position.x - p.x) / d * 1.5, tz = p.z + (mira.position.z - p.z) / d * 1.5;
      await E.walk(mira, tx, tz, 6.5);
    }
    E.faceEach(kael, mira);
    await talk([
      ['MIRA', "Tu viens danser ce soir, ou tu vas encore te cacher derrière l'enclume ?"],
      ['KAEL', 'Je danse très bien. Quand personne ne regarde.'],
      ['MIRA', 'Alors je fermerai les yeux. Promets.'],
      ['KAEL', 'Promis.'],
    ]);
    await E.walk(mira, 14.9, 3.5, 4.5); mira.rotation.y = -PI / 2; mira.userData.col.off = false;
    save();
  }
  st.trigger({ x1: -8, x2: 40, z1: -14, z2: 14, cond: () => F().epee && !F().mira, action: miraScene });
  st.trigger({ x1: -3, x2: 3, z1: -32, z2: -18, cond: () => F().epee && !F().mira, action: miraScene });

  // Sortie nord : le sentier du bois
  st.trigger({ x1: -6, x2: 6, z1: -60, z2: -48.2, once: false, action: async () => {
    if (!F().epee) { await talk([['KAEL', "Je dois d'abord livrer l'épée au chef Aubin. Sa maison est à l'ouest de la place."]]); await E.walk(kael, 0, -45); return; }
    await fade(true, 500);
    await goPhase('ch1_bois');
  } });

  enter(st, { x: 1.7, z: 27.9, ry: -2.2, yaw: 0 });

  if (!F().intro1) {
    setFade(1); showHud(false); music('');
    for (let i = 0; i < 3; i++) { sfx('hit'); await sleep(520); }
    await narrate(['Royaume de Solméria. Village de Brumeval.', "Le matin de la Fête de l'Aube."]);
    E.shot([4.6, 2.3, 19.2], [-0.4, 1.3, 27], true);
    music('village');
    await fade(false, 1400);
    await sleep(900);
    E.shot([0, 9, 16], [15, 70, -290]);
    await sleep(2800);
    await chapterCard('Chapitre 1', 'Les Cendres de Brumeval');
    E.shot([4.2, 2.6, 21.5], [-0.2, 1.2, 27.4]);
    await sleep(900);
    await talk([
      ['HAGEN', "Debout, fainéant ! Le soleil est levé depuis une heure et l'épée du chef n'est pas livrée."],
      ['KAEL', "C'est la Fête de l'Aube, Hagen. Personne ne travaille aujourd'hui."],
      ['HAGEN', 'Le fer ne connaît pas les fêtes. Livre l\'épée, puis va t\'exercer. Tu tiens encore ton arme comme une louche.'],
      ['KAEL', '*Il touche son pendentif.* Tu me diras un jour d\'où il vient ?'],
      ['HAGEN', "Un jour. Pas aujourd'hui. Allez, file."],
    ]);
    E.unshot();
    F().intro1 = 1; save();
    showHud(true);
  } else await fade(false, 500);
  setObjective(F().epee ? "Aller s'exercer au bois : le sentier part au nord, après le pont de pierre" : "Livrer l'épée au chef Aubin : sa maison est à l'ouest de la place");
  if (!F().epee) {
    hint("<b>Marcher :</b> ZQSD / WASD ou flèches · <b>Parler, ouvrir :</b> E ou Espace · <b>Caméra :</b> glisser la souris · <b>Menu :</b> M");
    setTimeout(() => hint(null), 14000);
  }
}

// ---------- Scène 3 : le bois (tutoriel de combat) ----------
async function ch1_bois() {
  const st = buildBois(), S = st.spots;
  reader(st, S.panneau, 'Lire le panneau', [['PANNEAU', 'Bois de Brumeval — attention aux loups.']]);
  reader(st, S.mannequin, 'Regarder le mannequin', [['KAEL', "Le mannequin de paille de Hagen. « Cent coups par jour, et tu seras peut-être moins mauvais. »"]]);
  chest(st, 'bois', S.chest, 2.2, async () => { give('potion'); });

  let wolf1 = null;
  if (!F().loup1) { wolf1 = makeWolf(); st.actor('loup1', wolf1, 0.5, 2.5, 0, false); }
  st.trigger({ x1: -12, x2: 12, z1: -12, z2: 11.5, cond: () => !F().loup1, action: async () => {
    E.shot([4, 2.5, 13], [0, 0.8, 4]);
    E.face(kael, 0.5, 2.5);
    await talk([['KAEL', "Des loups, sur le terrain d'entraînement. Hagen dirait que c'est l'occasion rêvée."]]);
    await E.walk(wolf1, kael.position.x, kael.position.z + (kael.position.z > 2.5 ? -1.6 : 1.6), 7);
    await fight(['loup'], { arena: 'foret', story: true, canFlee: false, intro: 'Un loup gris attaque !', onRound: async (api, r) => {
      if (r === 1) { await api.msg('<b>Attaque</b> : frappe un ennemi avec ton arme.', 2400); await api.msg("Chaque tour, tout le monde agit dans l'ordre de la <b>Vitesse</b>.", 2400); }
      if (r === 2) await api.msg("<b>Défense</b> : divise par deux les dégâts reçus pendant ce tour.", 2600);
    } });
    st.remove(wolf1); F().loup1 = 1; E.unshot(true); save();
    hint('Les ennemis sont <b>visibles</b> : les toucher lance le combat. Il reste des loups dans le bois.');
    setTimeout(() => hint(null), 9000);
    setObjective('Chasser le second loup de la clairière');
  } });

  mobs(st, [{ id: 'loup2', x: 6, z: -9, enemies: ['loup'], roam: 4 }, { id: 'loup3', x: -15, z: -14, enemies: ['loup', 'loup'], roam: 4 }], 'foret', (m) => ({
    onRound: async (api, r) => { if (r === 1 && !F().tutoSkill) { F().tutoSkill = 1; const sk = SKILLS[HEROES.kael.skills[0][1]]; await api.msg(`<b>Compétences</b> : <b>${sk.name}</b> frappe plus fort, mais coûte ${sk.pm} PM (barre bleue).`, 2800); } },
  }));
  st.onMobWin = async (m) => { if (m.id === 'loup2') { F().loups = 1; save(); setObjective('Monter au rocher plat, tout au nord du bois'); } };

  st.trigger({ x1: -7, x2: 7, z1: -24.5, z2: -19, cond: () => F().loups, action: async () => {
    await E.walk(kael, 0, -22.6);
    kael.rotation.y = 0;
    music('');
    S.smoke.visible = true;
    await talk([['KAEL', "D'ici, on voit tout le village. Les guirlandes, le pont, la forge..."]]);
    E.shot([0, 3.2, -26.5], [0, 9, 60]);
    await sleep(1800);
    await talk([['KAEL', '... De la fumée ?'], ['KAEL', "Ce n'est pas le feu de la fête. C'est noir. Ça vient de la place."], ['KAEL', 'Hagen. Mira !']]);
    music('danger');
    await fade(true, 600);
    await goPhase('ch1_feu');
  } });

  enter(st, { x: 0, z: 22, ry: PI, yaw: 0 });
  await fade(false, 500);
  setObjective(F().loups ? 'Monter au rocher plat, tout au nord du bois' : F().loup1 ? 'Chasser le second loup de la clairière' : "S'exercer dans la clairière");
}

// ---------- Scènes 4, 5 et 6 : le village en flammes ----------
async function ch1_feu() {
  const st = buildBrumeval(true), S = st.spots;
  let guard = null, hagen = null, krall = null, s1 = null, s2 = null;
  if (!F().soldat1) guard = st.actor('guard', makeChar('soldat'), 0, -19.5, PI);
  hagen = st.actor('hagen', makeChar('hagen'), 0, 21.6, PI);
  krall = st.actor('krall', makeChar('krall'), 0, 18.2, 0);
  s1 = st.actor('s1', makeChar('soldat'), -2.4, 17.6, 0.3); s2 = st.actor('s2', makeChar('soldat'), 2.4, 17.6, -0.3);

  st.trigger({ x1: -3, x2: 3, z1: -30.5, z2: -15, cond: () => !F().soldat1, action: async () => {
    E.faceEach(kael, guard);
    await talk([['SOLDAT', 'Halte ! Toi, le gamin. Approche, et montre ton cou.'], ['KAEL', 'Écartez-vous. Ma maison brûle !'], ['SOLDAT', "Ordre du général : on cherche un enfant au pendentif. Tu as l'âge."]]);
    await fight(['soldat'], { arena: 'village_feu', story: true, canFlee: false, intro: 'Un Soldat de Cendre barre le pont !', onRound: async (api, r) => {
      if (r === 1) await api.msg('<b>Objets</b> : une Potion rend 50 PV. Sers-t\'en quand tes PV sont bas.', 2800);
    } });
    st.remove(guard); guard.userData.col.off = true; F().soldat1 = 1; save();
    // Un villageois en fuite
    const v = makeChar('villageois1'); st.actor('fuyard', v, 3, -6, PI, false);
    await E.walk(v, 0.8, -19.2, 7.5);
    E.faceEach(kael, v);
    await talk([['VILLAGEOIS', "Kael ! Ne va pas là-bas ! Ils fouillent toutes les maisons, ils cherchent un enfant avec un pendentif !"], ['KAEL', 'Et Hagen ?'], ['VILLAGEOIS', "À la forge. Il leur barre la porte avec son marteau. Fuis, petit !"]]);
    E.walk(v, 0, -47, 7.5).then(() => st.remove(v));
    setObjective('Rejoindre Hagen à la forge, au sud de la place');
  } });

  mobs(st, [{ id: 'sold_a', x: -8, z: 3, enemies: ['soldat'], roam: 4, speed: 2.8 }, { id: 'sold_b', x: 9, z: -4, enemies: ['soldat'], roam: 4, speed: 2.8 }], 'village_feu');

  st.trigger({ x1: -13, x2: 13, z1: 12.5, z2: 30, action: async () => {
    await E.walk(kael, 3.4, 15.4, 6);
    E.face(kael, 0, 20);
    E.shot([8.5, 3.4, 13.5], [0, 1.4, 19.5]);
    await sleep(700);
    await talk([
      ['SERGENT KRALL', 'Le gamin au pendentif, vieillard. Donne-le et tes voisins vivront.'],
      ['HAGEN', "J'ai servi la Vieille Garde trente ans. On ne livre pas un enfant."],
      ['KAEL', 'Hagen !'],
      ['HAGEN', "Imbécile, je t'avais dit de courir !"],
    ]);
    krall.rotation.y = Math.atan2(kael.position.x - krall.position.x, kael.position.z - krall.position.z);
    await talk([['SERGENT KRALL', 'Le pendentif. Il le porte au cou. Soldats, tenez le vieux. Le gamin est pour moi.']]);
    await fight(['krall'], { arena: 'village_feu', story: true, canFlee: false, intro: 'Le sergent Krall dégaine son épée !',
      onRound: async (api, r) => { if (r === 1) await api.msg("Quand un ennemi <b>prépare une attaque</b>, choisis <b>Défense</b> au tour suivant !", 2800); },
      onRoundEnd: async (api, r) => { const k = api.enemies[0]; if (r % 3 === 0 && k.hp > 20) { await api.msg('Hagen se dégage et abat son marteau sur le sergent !', 900); await api.strike(k, 14, 0xffc060); } },
    });
    // Après la victoire
    F().krall = 1;
    lieDown(krall); krall.position.set(-1.5, 0.18, 17.5);
    music('sad');
    E.walk(s1, -14, 6, 6).then(() => st.remove(s1)); E.walk(s2, 14, 8, 6).then(() => st.remove(s2));
    hagen.userData.col.off = true; lieDown(hagen); hagen.rotation.y = PI;
    await E.walk(kael, 1.1, 21.4, 5);
    E.face(kael, 0, 21.6);
    E.shot([3.6, 1.7, 18.6], [0.3, 0.7, 21.6]);
    await sleep(600);
    await talk([
      ['HAGEN', 'Écoute. Va à Solméria. Trouve le capitaine Borin. Dis-lui... que Hagen de la Vieille Garde t\'envoie.'],
      ['KAEL', 'Je ne te laisse pas ici.'],
      ['HAGEN', "Le pendentif vient de ta mère. Ne le donne à personne. À personne, tu m'entends ?"],
      ['HAGEN', '*Il sourit.* Tu la tiens mieux, ton arme. Presque plus comme une louche.'],
      ['', '*La main de Hagen retombe.*'],
      ['KAEL', 'Hagen... Hagen !'],
    ]);
    music('danger');
    await talk([['SOLDAT', 'Par ici ! Le sergent est à terre ! Le gamin est à la forge !']]);
    await fade(true, 600);

    // Le pont : Kael saute dans la rivière
    kael.position.set(0, 0, -20.5); kael.rotation.y = PI;
    const a = st.actor('pa', makeChar('soldat'), 0, -15, PI, false), b = st.actor('pb', makeChar('soldat'), 0, -34, 0, false), c = st.actor('pc', makeChar('soldat'), 1, -13.5, PI, false);
    E.shot([9.5, 4.2, -18.5], [0, 1, -25], true);
    await fade(false, 600);
    await Promise.all([E.walk(kael, 0, -25, 5.5), E.walk(b, 0, -29.3, 4), E.walk(a, 0, -20.8, 4), E.walk(c, 1, -19.6, 4)]);
    kael.rotation.y = 0;
    await talk([['SOLDAT', 'Plus un geste. Donne le pendentif, et tu vivras.'], ['KAEL', '*Il serre le pendentif dans son poing.* À personne.']]);
    kael.userData.pose = true;
    sfx('move');
    await tween(900, k => { kael.position.x = k * 3.6; kael.position.y = Math.sin(k * PI) * 1.9 - k * 1.6; kael.rotation.y = PI / 2; });
    sfx('ice'); kael.visible = false;
    await talk([['SOLDAT', "Il a sauté ! Fouillez les berges ! Le général veut ce pendentif avant l'aube !"]]);
    await fade(true, 900);
    st.remove(a); st.remove(b); st.remove(c);

    // La colline : le général Darian
    const H = S.colline, ry = Math.atan2(-H.x, -H.z);
    const horse = makeHorse(); st.add(horse, H.x, H.z, ry, H.y);
    const darian = makeChar('darian'); darian.userData.pose = true; st.add(darian, H.x, H.z, ry, H.y + 0.95);
    if (darian.userData.imported) { darian.userData.poseAt('Idle_Loop', 0); darian.userData.bones.thigh_l.rotateX(0.55); darian.userData.bones.thigh_r.rotateX(-0.55); darian.position.y -= 0.1; }
    else { darian.userData.P.legL.rotation.z = 0.5; darian.userData.P.legR.rotation.z = -0.5; }
    const sol = makeChar('soldat'); st.add(sol, H.x - 1.2, H.z + 3.4, ry + PI + 0.5, H.y - 0.25);
    E.shot([H.x + 5.5, H.y + 3.6, H.z + 6.5], [10, 3, -4], true);
    music('sad');
    await fade(false, 1400);
    await sleep(1200);
    await talk([['SOLDAT', "Le pendentif n'est pas ici, général Darian."], ['DARIAN', "Alors cherchez encore. L'Empereur ne récompense pas les excuses."]]);
    await sleep(600);
    await fade(true, 1200);
    music('title');
    await chapterCard('ALDÉRIA', "La Couronne d'Aube");
    // Kael arrive épuisé au chapitre 2
    const k = hero('kael'); k.hp = Math.max(1, Math.round(heroStats(k).maxHp * 0.55));
    await goPhase('ch2_berge');
  }, cond: () => !F().krall });

  enter(st, { x: 0, z: -46.5, ry: 0, yaw: PI });
  setObjective(F().soldat1 ? 'Rejoindre Hagen à la forge, au sud de la place' : 'Courir au village');
  await fade(false, 700);
  if (!F().feu_intro) { F().feu_intro = 1; await talk([['KAEL', 'Non... Non, non, non !']]); }
}

// ============================================================
//  CHAPITRE 2 — LES BOIS DES MURMURES
// ============================================================
const MOBS2 = [
  { id: 'g1', x: 0, z: -8, enemies: ['gobelin', 'gobelin'], roam: 2.5 },
  { id: 'g2', x: 0, z: 17, enemies: ['luciole', 'gobelin'], roam: 2.5 },
  { id: 'g3', x: 17, z: 11, enemies: ['luciole'], roam: 2 },
  { id: 'c1', x: 4, z: 42, enemies: ['champignon'], roam: 3 },
  { id: 'c2', x: -9, z: 50, enemies: ['champignon', 'champignon'], roam: 3 },
  { id: 'c3', x: 10, z: 53, enemies: ['champignon', 'luciole'], roam: 3 },
  { id: 'c4', x: -2, z: 57, enemies: ['champignon', 'gobelin'], roam: 2.5 },
];

function setupMurmures() {
  const st = buildMurmures(F()), S = st.spots;
  chest(st, 'barque', S.barque, 0.5, async () => { give('ether'); }, 'Fouiller la barque');
  chest(st, 'fer', S.chestFer, -PI / 2, async () => {
    const l = hero('lyra');
    if (l && l.armor !== 'tunique_voyage') { l.armor = 'tunique_voyage'; sfx('item'); toast('Obtenu : <b>Tunique de voyage</b> (DEF +2, RES +3)'); await talk([['LYRA', "Une tunique de voyage, presque neuve. Elle est à ma taille : c'est donc la mienne."]]); }
    else give('potion_sup');
  });
  sparkle(st, 'clairiere', S.herbe, 'herbe');
  statue(st, S.statue);

  // Les ronces que Lyra brûle
  for (const rc of S.ronces) {
    st.interact({ x: rc.x, z: rc.z, r: 3.2, label: hero('lyra') ? 'Brûler les ronces' : 'Examiner les ronces', cond: () => !F()['ronces' + rc.i], action: async () => {
      if (!hero('lyra')) { await talk([['KAEL', "Un mur de ronces. Impossible de passer sans y laisser la peau."]]); return; }
      if (!F().tutoRonces) {
        F().tutoRonces = 1;
        await talk([['KAEL', "Des ronces. Il faut faire le tour."], ['LYRA', "Ou alors tu recules de trois pas et tu regardes travailler une mage d'Ysmère."]]);
      }
      const f = makeFire(2.2, true); st.add(f, rc.x, rc.z);
      sfx('fire'); await sleep(500); sfx('fire');
      await tween(900, k => { rc.obj.scale.setScalar(Math.max(0.01, 1 - k)); });
      st.remove(rc.obj); st.remove(f); rc.col.off = true; F()['ronces' + rc.i] = 1;
      if (rc.i === 0) { toast('<b>Capacité de terrain :</b> Lyra peut brûler les ronces.'); await talk([['LYRA', "Voilà. Tu marches devant, n'oublie pas."]]); }
      save();
    } });
  }

  // Le père Anselme, dans le vieux chêne
  npc(st, 'anselme', 'anselme', S.anselme.x, S.anselme.z, PI / 2, 'au père Anselme', async () => {
    if (!F().anselme) { F().anselme = 1; await talk([['PÈRE ANSELME', "Des visiteurs ! Dans mon chêne ! Voilà dix ans que ça n'était pas arrivé."], ['PÈRE ANSELME', "Les arbres chuchotent qu'un vieux mal se réveille. Écoutez-les : ils ne mentent jamais."]]); }
    while (true) {
      const left = 3 - (F().anselmePotions || 0);
      const r = await choose(`<b>Père Anselme</b> — « J'ai quelques potions, à moitié prix pour les gens polis. » (${G.gold} or)`, [
        { label: 'Acheter une Potion', right: '10 or', sub: `Il lui en reste ${left}`, disabled: left <= 0 || G.gold < 10 },
      ], { cancel: true, cancelLabel: '← Au revoir' });
      if (r !== 0) break;
      G.gold -= 10; F().anselmePotions = (F().anselmePotions || 0) + 1; addItem('potion'); sfx('item'); updateGold(); toast('Acheté : Potion');
    }
  });

  // Ennemis visibles et tutoriel des éléments
  mobs(st, MOBS2, 'murmures', (m) => ({
    onStart: async (api) => {
      if (!F().tutoElem && m.enemies.some(e => e === 'champignon' || e === 'luciole')) {
        F().tutoElem = 1;
        await api.msg('Chaque créature a ses <b>faiblesses</b>. Les Champignons hurleurs craignent le <b>Feu</b>.', 3000);
        await api.msg('Les Lucioles de braise sont de Feu : elles craignent le <b>Givre</b> de Lyra (élément Eau).', 3000);
      }
    },
  }));

  // Scène 3 : le feu de camp
  S.camp.userData.fire.visible = !!F().camp;
  st.interact({ x: S.campPos.x, z: S.campPos.z, r: 2.6, label: 'Se reposer près du feu', cond: () => F().camp, action: async () => {
    await fade(true, 600); healParty(); sfx('heal'); await sleep(500); G.flags.pos = { x: kael.position.x, z: kael.position.z }; save(); await fade(false, 600);
    toast('PV et PM restaurés. Partie sauvegardée.');
  } });
  st.trigger({ x1: -12, x2: 12, z1: 67.5, z2: 81, cond: () => !F().camp && hero('lyra'), action: async () => {
    await talk([['LYRA', "Un cercle de pierres, un ruisseau, une statue d'Aube. On s'arrête ici."], ['KAEL', 'Il fait encore jour.'], ['LYRA', "Plus pour longtemps. Et tu dors debout."]]);
    await fade(true, 800);
    // La nuit tombe
    const sc = E.scene, bg = sc.background.getHex(), fg = sc.fog.color.getHex(), hi = E.lights.hemi.intensity, si = E.lights.sun.intensity;
    sc.background.setHex(0x081218); sc.fog.color.setHex(0x081218); E.lights.hemi.intensity = 0.32; E.lights.sun.intensity = 0.08;
    S.camp.userData.fire.visible = true;
    kael.position.set(1.2, 0, 74.3); lyra.position.set(4.8, 0, 74.3); lyra.userData.stay = true;
    E.face(kael, 3, 74); E.face(lyra, 3, 74);
    E.shot([3, 2.0, 69.6], [3, 1.0, 74], true);
    music('camp');
    await fade(false, 900);
    await talk([
      ['KAEL', 'Ta lettre, elle dit quoi ?'],
      ['LYRA', "Que l'Académie d'Ysmère n'existe plus. Que l'Empire est venu chercher un vieux livre sur des « Éclats » et qu'il a tout brûlé pour l'avoir."],
      ['KAEL', 'Mon village aussi. Ils cherchaient ça. *Il montre le pendentif.*'],
      ['LYRA', 'Un bijou ? Ils ont rasé un village pour un bijou ?'],
      ['KAEL', 'Je ne sais pas ce que c\'est. Celui qui savait est mort hier.'],
      ['LYRA', '*Après un silence.* Mon maître aussi. Dors. Je prends le premier tour de garde.'],
    ]);
    await fade(true, 900);
    healParty(); sfx('heal');
    sc.background.setHex(bg); sc.fog.color.setHex(fg); E.lights.hemi.intensity = hi; E.lights.sun.intensity = si;
    lyra.userData.stay = false; kael.position.set(0, 0, 70.5); lyra.position.set(1.4, 0, 69.6); kael.rotation.y = 0; E.unshot(true); music('forest');
    F().camp = 1; G.flags.pos = { x: kael.position.x, z: kael.position.z }; save();
    await fade(false, 900);
    toast('PV et PM restaurés. Partie sauvegardée.');
    hint("Le <b>feu de camp</b> soigne l'équipe. La <b>statue d'Aube</b> sauvegarde la partie.");
    setTimeout(() => hint(null), 9000);
    setObjective('Atteindre le pont, au sud du camp');
  } });

  // Scène 4 : le pont brisé et le troll
  let troll = null;
  if (!F().troll) { troll = makeChar('troll'); st.actor('troll', troll, S.troll.x, S.troll.z, PI); const c = troll.userData.col; c.r = 1.6; }
  st.trigger({ x1: -14, x2: 14, z1: 87.5, z2: 99, cond: () => !F().troll && hero('lyra'), action: async () => {
    E.shot([6, 3.2, 86.5], [0, 2.2, 95.5]);
    E.face(kael, 0, 95.5);
    await talk([
      ['LYRA', 'Le pont. Il est en miettes.'],
      ['KAEL', "Et celui qui l'a cassé est toujours là. Il mange le grain de la charrette."],
      ['LYRA', "Un troll des Murmures. Ces bêtes-là referment leurs plaies à vue d'œil... sauf quand elles brûlent."],
      ['TROLL', 'GRRROOOAAAR !'],
    ]);
    await fight(['troll'], { arena: 'pont', story: true, canFlee: false, intro: 'Le Troll des Murmures se dresse !',
      onRound: async (api, r) => { if (r === 1) await api.msg('Le troll <b>se régénère</b> à chaque tour. Une <b>Brûlure</b> l\'en empêche : le Feu de Lyra est précieux.', 3200); } });
    F().troll = 1; st.remove(troll); troll.userData.col.off = true;
    E.shot([6, 4, 92], [0, 0.5, 103]);
    await talk([['', '*Le troll bascule dans le ravin avec un fracas de rochers.*'], ['KAEL', 'Le pont est mort. On passe comment ?'], ['LYRA', "Ce tronc, là. Il ne tient plus que par l'écorce. Pousse."]]);
    sfx('boom'); S.log.visible = true; S.gate.off = true;
    await tween(500, k => { S.log.position.y = -0.8 + Math.sin(k * PI) * 0.4; });
    await talk([['LYRA', "Tu vois ? Tu sers à quelque chose."], ['KAEL', 'Et toi, tu as failli sourire.'], ['LYRA', "N'exagère pas."]]);
    E.unshot(); save();
    setObjective('Traverser le ravin et suivre la route vers le sud');
  } });

  // Sortie sud : le Relais
  st.trigger({ x1: -6, x2: 6, z1: 119, z2: 130, once: false, action: async () => { await fade(true, 600); await goPhase('ch2_relais'); } });
  return st;
}

function objectiveMurmures() {
  setObjective(F().troll ? 'Traverser le ravin et suivre la route vers le sud' : F().camp ? 'Atteindre le pont, au sud du camp' : 'Traverser les Bois des Murmures vers le sud');
}

// ---------- Scène 1 : la berge ----------
async function ch2_berge() {
  const st = setupMurmures(), S = st.spots;
  enter(st, { x: S.reveil.x, z: S.reveil.z, ry: 0, yaw: PI });
  setFade(1); showHud(false); music('');
  await narrate(['La rivière a porté Kael toute la nuit.', 'Au matin, elle le dépose sur une berge de galets, au cœur des Bois des Murmures.']);
  await chapterCard('Chapitre 2', 'Les Bois des Murmures');
  lieDown(kael); kael.rotation.y = 0.4;
  E.shot([3.5, 2.6, -37.5], [0, 0.4, -33], true);
  music('forest');
  await fade(false, 1200);
  await sleep(700);
  await talk([['KAEL', '*Il tousse.* ... Hagen...']]);
  lieDown(kael, false);
  // Trois gobelins sortent du bois
  const gobs = [[-7, -26], [0, -25], [7, -26]].map(([x, z], i) => { const g = makeChar('gobelin'); st.actor('gob' + i, g, x, z, PI, false); return g; });
  E.shot([0, 4.5, -39], [0, 1, -30]);
  kael.rotation.y = 0;
  await Promise.all(gobs.map((g, i) => E.walk(g, -2.2 + i * 2.2, -30.4 + Math.abs(i - 1) * -0.6, 4.5)));
  await talk([['GOBELIN', 'Hik ! Hik hik !'], ['KAEL', 'Des gobelins. Pas maintenant...']]);
  await fight(['gobelin', 'gobelin', 'gobelin'], { arena: 'berge', story: true, canFlee: false, noDeath: true, intro: 'Trois gobelins encerclent Kael !',
    onStart: async (api) => { await api.msg('Kael a nagé toute la nuit : il tient à peine debout.', 2200); },
    onRound: async (api, r) => {
      if (r === 3) {
        await api.msg('Une boule de feu jaillit des arbres !', 1100); sfx('fire');
        for (const e of api.enemies) if (e.hp > 0) await api.strike(e, 99, 0xff6a2a);
      }
    } });
  gobs.forEach(g => st.remove(g));
  // Lyra
  st.actor('lyraNpc', lyra, 6, -25.5, PI, false);
  E.shot([-3.5, 2.4, -35.5], [2, 1.2, -30]);
  await E.walk(lyra, 2.2, -31.2, 3.6);
  E.faceEach(kael, lyra);
  await talk([
    ['LYRA', 'Trois gobelins. Tu allais mourir à cause de trois gobelins.'],
    ['KAEL', "J'ai nagé toute la nuit."],
    ['LYRA', "Belle excuse. Moi, j'ai marché six jours. Tu vas où ?"],
    ['KAEL', 'Solméria.'],
    ['LYRA', "Moi aussi. Tu sais te battre ? Non, ne réponds pas, j'ai vu. Tu marches devant, au moins tu serviras de bouclier."],
    ['LYRA', '*Elle lui lance une gourde.* Et bois ça. Tu fais peine à voir.'],
  ]);
  st.remove(lyra); delete st.actors.lyraNpc;
  const l = makeHero('lyra', 4); l.weapon = 'baton_noisetier'; const s = heroStats(l); l.hp = s.maxHp; l.mp = s.maxMp;
  G.party.push(l); healParty();
  const lp = lyra.position.clone();
  syncParty(); lyra.position.copy(lp);
  sfx('levelup'); toast('<b>Lyra</b> rejoint l\'équipe ! (Mage : Flammèche, Éclat de Givre)');
  E.unshot();
  autosave('ch2_bois');
  showHud(true); objectiveMurmures();
  hint('En combat, vous choisissez maintenant une action pour <b>chaque héros</b>.');
  setTimeout(() => hint(null), 9000);
}

// ---------- Scènes 2 à 4 : la forêt (reprise de sauvegarde) ----------
async function ch2_bois() {
  const st = setupMurmures(), S = st.spots;
  const pos = F().pos || (F().troll ? { x: 0, z: 97 } : F().camp ? { x: 0, z: 70 } : { x: 2, z: -30 });
  enter(st, { x: pos.x, z: pos.z, ry: 0, yaw: PI });
  objectiveMurmures();
  await fade(false, 600);
}

// ---------- Scène 5 : le Relais du Cerf Blanc ----------
async function ch2_relais() {
  const st = buildRelais(), S = st.spots;
  brancherMaisons(st, TOOLS);                                // la salle commune de l'auberge
  statue(st, S.statue);
  chest(st, 'ecurie', S.chest, PI, async () => { give('fiole_braise', 2); });
  reader(st, S.panneau, 'Lire le panneau', [['PANNEAU', 'Solméria, la Cité Blanche — deux jours de marche vers le sud.']]);
  reader(st, { x: 9.3, z: 10.5 }, 'Regarder le cheval', [['LYRA', "Ne le regarde pas comme ça. On n'a pas de quoi acheter un cheval. On n'a même pas de quoi acheter une selle."]]);

  npc(st, 'berthe', 'berthe', S.berthe.x, S.berthe.z, PI / 2, 'à Berthe', async () => {
    if (!F().berthe) {
      F().berthe = 1;
      await talk([
        ['BERTHE', "Bienvenue au Cerf Blanc ! Mes pauvres petits, vous sortez des Murmures ? À pied ? Avec ce troll sur le pont ?"],
        ['LYRA', "Il n'y a plus de troll sur le pont."],
        ['BERTHE', "... Asseyez-vous. La soupe est offerte."],
      ]);
      setObjective('Se préparer, puis prendre la route de Solméria, au sud');
    }
    while (true) {
      const r = await choose(`<b>Berthe, aubergiste du Cerf Blanc</b> (${G.gold} or)`, [
        { label: 'Demander les nouvelles' },
        { label: 'Dormir', right: '10 or', sub: "Restaure les PV et PM de toute l'équipe", disabled: G.gold < 10 },
      ], { cancel: true, cancelLabel: '← Au revoir' });
      if (r === 0) await talk([
        ['BERTHE', "Les nouvelles ? Mauvaises. Des colonnes de fumée au nord, trois nuits de suite. Et des soldats gris sur les routes, qui demandent leur chemin sans dire d'où ils viennent."],
        ['BERTHE', "Les marchands ne montent plus. Si ça continue, je servirai ma soupe aux corbeaux."],
        ['KAEL', 'La fumée, au nord... c\'était Brumeval.'],
        ['BERTHE', "Oh, mon petit. *Elle pose une main sur son épaule.* Allez voir le roi. Il faut que quelqu'un le lui dise."],
      ]);
      else if (r === 1) { G.gold -= 10; updateGold(); await fade(true, 700); healParty(); sfx('heal'); await sleep(600); await fade(false, 700); toast('Une vraie nuit dans un vrai lit. PV et PM restaurés.'); }
      else break;
    }
  });
  npc(st, 'colporteur', 'colporteur', S.colporteur.x, S.colporteur.z, PI, 'au colporteur', async () => {
    await talk([['COLPORTEUR', "Potions, tentes, cuir solide ! Tout ce qu'il faut pour arriver vivant à la capitale."]]);
    await shop('Boutique du colporteur', ['potion', 'tente', 'gilet_cuir', 'tunique_voyage']);
  });
  npc(st, 'garde1', 'garde', S.gardes[0].x, S.gardes[0].z, PI / 2, 'au garde de Solméria', () => talk([
    ['GARDE', 'Trois patrouilles envoyées au nord cette semaine. Aucune n\'est revenue.'],
    ['GARDE', "Le capitaine Borin réclame des renforts depuis un mois. Au palais, on lui répond que tout va bien."],
  ]));
  npc(st, 'garde2', 'garde', S.gardes[1].x, S.gardes[1].z, -PI / 2, 'au garde de Solméria', () => talk([
    ['GARDE', "Vous cherchez Borin ? La caserne de la Vieille Garde, à Solméria. Vous ne pouvez pas le rater : c'est le plus large, et le plus fort en gueule."],
  ]));

  // Route du sud : fin de la partie jouable
  st.trigger({ x1: -6, x2: 6, z1: 19.5, z2: 30, once: false, action: async () => {
    await talk([['LYRA', 'La route de Solméria. Deux jours de marche.'], ['KAEL', 'Hagen a dit de trouver le capitaine Borin. Allons-y.']]);
    await fade(true, 900);
    music('');
    await narrate(['Deux jours de marche vers le sud.\nLes collines s\'aplanissent, la route s\'élargit, les charrettes se font plus nombreuses.', "Au matin du troisième jour, des tours blanches percent la brume."]);
    F().fin = 1;
    await goPhase('ch3_ville');
  } });
  st.trigger({ x1: -6, x2: 6, z1: -30, z2: -19.5, once: false, action: async () => { await talk([['LYRA', "Retourner dans les Murmures ? Sans moi."]]); await E.walk(kael, 0, -16); } });

  const pos = F().pos || { x: 0, z: -17 };
  enter(st, { x: pos.x, z: pos.z, ry: 0, yaw: PI });
  setObjective(F().berthe ? 'Se préparer, puis prendre la route de Solméria, au sud' : "Parler à l'aubergiste du Relais");
  await fade(false, 700);
  if (!F().relais_intro) {
    F().relais_intro = 1;
    await talk([['LYRA', 'Le Relais du Cerf Blanc. Un toit, un lit, de la soupe chaude.'], ['KAEL', 'Et des nouvelles, peut-être.']]);
    save();
  }
}

// Chapitre 3 : ses scènes sont dans story3.js et empruntent les outils ci-dessus
const TOOLS = { syncParty, enter, autosave, goPhase, fight, give, chest, npc, reader, statue, sparkle, lieDown, mobs, tween, party: () => ({ kael, lyra, nyssa, borin }) };
const PHASES = { ch1_forge, ch1_bois, ch1_feu, ch2_berge, ch2_bois, ch2_relais, ...chapter3(TOOLS), ...chapter4(TOOLS), ...chapter5(TOOLS), ...chapter6(TOOLS), ...chapter7(TOOLS), ...chapter8(TOOLS), ...chapter9(TOOLS), ...chapter10(TOOLS) };

// Lance (ou reprend) la phase en cours
export async function startGame() {
  const name = PHASES[G.phase] ? G.phase : 'ch1_forge';
  await E.run(() => PHASES[name]());
  E.enabled = true;
}
export const PHASE_NAMES = Object.keys(PHASES);
export async function debugPhase(name) { G.phase = name; await startGame(); }
