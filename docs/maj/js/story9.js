// ============================================================
//  HISTOIRE — CHAPITRE 9 : LE SIÈGE DE SOLMÉRIA
//  La colline, les égouts et les saboteurs, le conseil de guerre, puis la nuit du siège :
//  trois vagues sur les remparts, les trois catapultes (chrono), le Bélier Infernal à la porte Ouest. L'aube.
//  (dialogues repris du script « 01_Acte1_Chapitres_01-10.md », chapitre 9)
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { E } from './engine.js';
import { G, save, healParty } from './state.js';
import { sleep, talk, choose, toast, setObjective, hint, fade, narrate, chapterCard } from './ui.js';
import { sfx, music } from './audio.js';
import { buildTrone } from './world3.js';
import { buildPlaine, buildEgouts9, buildRemparts, buildCatapultes, buildPorteOuest } from './world9.js';
import { tic, lumiere } from './world5.js';
import { makeChar, makeEnemyModel, makeFire } from './models.js';
import { or, niveauMin, equiper, equipement } from './story5.js';

const PI = Math.PI;
const F = () => G.flags;
const DUREE_SORTIE = 150;      // secondes pour saboter les trois catapultes
const PAUSE_VAGUE = 30;        // secondes entre deux vagues

export function chapter9(T) {
  const { enter, goPhase, fight, give, chest, statue, mobs, tween, npc } = T;
  const P = () => T.party();

  // ============================================================
  //  LA COLLINE
  // ============================================================
  async function ch9_plaine() {
    const st = buildPlaine(), S = st.spots;
    st.interact({ x: S.grille.x + 1.6, z: S.grille.z + 1.2, r: 2.8, label: "Descendre par la grille d'égout", action: async () => {
      if (!F().s9_vue) { await talk([['NYSSA', "Regarde d'abord ce qui nous attend. Là, au bord de la crête."]]); return; }
      await fade(true, 700);
      await narrate(["Un vieux collecteur, oublié des cartes de l'armée.\nIl passe sous le camp gris, sous les douves, sous la muraille."]);
      await goPhase('ch9_egouts');
    } });
    st.trigger({ x1: -5, x2: 5, z1: -14, z2: -8, once: true, cond: () => !F().s9_vue, action: async () => {
      const { kael, borin } = P();
      await E.walk(kael, 0, -11, 2.4); E.face(kael, 0, -150);
      E.shot([0, 9, 4], [0, -2, -130]); music('');
      await talk([['', "Du haut de la colline : vingt mille soldats gris, des tours de siège, des feux jusqu'à l'horizon."]]);
      E.shot([3.6, 2.2, -7.6], [0, 1.5, -11]); music('danger');
      await talk([
        ['BORIN', "Vingt ans que je garde ces murs. Je n'ai jamais vu autant d'hommes."],
        ['LYRA', "Les portes sont fermées. Comment on rentre ?"],
        ['NYSSA', "Je connais un chemin. Vous n'allez pas aimer l'odeur."],
      ]);
      F().s9_vue = 1; E.unshot();
      setObjective("Descendre par la grille d'égout, à l'ouest de la crête"); save();
    } });
    enter(st, { x: 0, z: 12, ry: PI, yaw: 0 });
    setObjective(F().s9_vue ? "Descendre par la grille d'égout, à l'ouest de la crête" : "Avancer jusqu'au bord de la crête, au nord");
    if (!F().ch9_intro) {
      await chapterCard('Chapitre 9', 'Le Siège de Solméria');
      await fade(false, 700);
      F().ch9_intro = 1;
      await niveauMin(17, "Quatre jours de mer, un mât cassé, puis deux jours de marche forcée.");
      healParty();
      await talk([['', "La nuit. Une odeur de fumée, bien avant de voir la ville."]]);
      save();
    } else await fade(false, 600);
  }

  // ============================================================
  //  LES ÉGOUTS : les saboteurs
  // ============================================================
  async function ch9_egouts() {
    const st = buildEgouts9(), S = st.spots;
    statue(st, S.statue);
    mobs(st, S.mobs, 'egouts');
    chest(st, 'eg9', S.coffre, -PI / 2, async () => { give('potion_plus', 4); give('ether', 2); });
    const ids = ['s9a', 's9b', 's9c'];
    S.barils.forEach((b, i) => {
      if (F()['s9_b' + i]) b.obj.children[b.obj.children.length - 1].visible = false;
      st.interact({ x: b.x + 0.3, z: b.z + 0.3, r: 2.6, label: 'Arracher la mèche', cond: () => !F()['s9_b' + i], action: async () => {
        if (!F()['m_' + ids[i]]) { await talk([['NYSSA', "Pas tant que ceux-là respirent. Ils la rallumeraient."]]); return; }
        sfx('steal'); b.obj.children[b.obj.children.length - 1].visible = false; F()['s9_b' + i] = 1;
        const n = [0, 1, 2].filter((k) => F()['s9_b' + k]).length;
        await talk([['', n < 3 ? `La mèche est arrachée. Encore ${3 - n} charge${3 - n > 1 ? 's' : ''} de poudre sous la muraille.` : "La dernière mèche est arrachée. La muraille ne sautera pas cette nuit."]]);
        if (n === 3) setObjective("Monter par l'échelle, au fond de l'égout");
        save();
      } });
    });
    st.interact({ x: S.echelle.x, z: S.echelle.z, r: 2.6, label: "Monter par l'échelle", action: async () => {
      if (![0, 1, 2].every((k) => F()['s9_b' + k])) { await talk([['BORIN', "On ne laisse pas de poudre allumée sous mes murs. Trouvez toutes les charges."]]); return; }
      await fade(true, 700);
      await narrate(["Vous ressortez dans une cave du quartier bas.\nDans les rues, on porte des blessés, de l'eau, des flèches. Personne ne parle.", "Le château. La salle du conseil."]);
      await goPhase('ch9_conseil');
    } });
    const pos = F().pos || { x: 0, z: 4.6 };
    enter(st, { x: pos.x, z: pos.z, ry: PI, yaw: 0 });
    setObjective([0, 1, 2].every((k) => F()['s9_b' + k]) ? "Monter par l'échelle, au fond de l'égout" : 'Éliminer les saboteurs et arracher les mèches (3 charges)');
    await fade(false, 600);
    if (!F().s9_intro) {
      F().s9_intro = 1;
      await talk([['NYSSA', "Chut. Des voix. ... Ils posent de la poudre contre les fondations."], ['BORIN', "Des saboteurs. S'ils font sauter le mur, le siège est fini avant l'aube."]]);
      hint("Les <b>saboteurs</b> sont d'Ombre. Battez chaque groupe, puis arrachez la mèche des barils.");
      setTimeout(() => hint(null), 9000);
    }
  }

  // ============================================================
  //  LE CONSEIL DE GUERRE
  // ============================================================
  async function ch9_conseil() {
    const st = buildTrone(), S = st.spots;
    const up = (o, s) => { o.position.y = s.y; if (o.userData.col) o.userData.col.off = true; return o; };
    const roi = up(npc(st, 'roi', 'roi', S.roi.x, S.roi.z + 1.2, 0), S.roi);
    const alinor = up(npc(st, 'alinor', 'alinor', S.alinor.x, S.alinor.z, -0.3), S.alinor);
    const aldric = up(npc(st, 'aldric', 'aldric', S.aldric.x, S.aldric.z, 0.3), S.aldric);
    S.gardes.slice(0, 4).forEach((g, i) => npc(st, 'gt' + i, 'garde', g.x, g.z - 12, g.ry));
    enter(st, { x: 0, z: -29.6, ry: PI, yaw: 0 });
    const { kael, lyra, nyssa, borin } = P();
    lyra.position.set(-1.5, 0, -28.6); if (nyssa) nyssa.position.set(1.6, 0, -28.2); if (borin) borin.position.set(3.2, 0, -30.4);
    for (const f of E.followers) { f.userData.stay = true; f.rotation.y = PI; }
    setObjective(''); healParty();
    E.shot([4.3, 3.3, -22.6], [-0.4, 2.2, -36], true);
    music('camp');
    await fade(false, 900);
    await talk([
      ['', "Le roi est debout, en armure. Il n'a pas dormi depuis trois nuits."],
      ['PRINCESSE ALINOR', "Les murs tiennent, mais ils ont un bélier que rien n'arrête. Il sera à la porte Ouest avant l'aube."],
      ['ALDRIC', "Les Éclats doivent quitter la ville, Majesté. Confiez-les-moi : je connais des chemins que l'Empire ignore."],
      ['ROI ALDEMAR', "L'Éclat de Terre reste dans ma chambre forte, sous mon château, derrière mes soldats. Personne n'y touchera."],
      ['ALDRIC', "... Comme il vous plaira, Sire."],
      ['BORIN', "Sire, laissez-moi la porte Ouest."], ['ROI ALDEMAR', "Elle est à toi, vieil ami."],
      ['PRINCESSE ALINOR', "Kael. Vous vous battez sans armure depuis Brumeval. La Garde vous en doit une."],
    ]);
    await equiper('kael', 'armure_garde_royale');
    await talk([
      ['BORIN', "Écoutez-moi, tous les trois. Cette nuit, on ne dort pas : les remparts d'abord, puis leurs catapultes, puis la porte."],
      ['NYSSA', "Trois batailles. Et on dort quand ?"], ['BORIN', "Quand on a gagné."],
    ]);
    F().s9_conseil = 1;
    for (const f of E.followers) f.userData.stay = false;
    E.unshot();
    await fade(true, 800);
    await narrate(["La nuit du siège."]);
    await goPhase('ch9_remparts');
  }

  // ============================================================
  //  1. LES REMPARTS : trois vagues d'échelles
  // ============================================================
  const VAGUES = [['fantassin', 'arbaletrier', 'fantassin'], ['fantassin', 'mage_guerre', 'arbaletrier'], ['mage_guerre', 'fantassin', 'mage_guerre']];
  async function ch9_remparts() {
    const st = buildRemparts(), S = st.spots;
    S.gardes.forEach((g, i) => npc(st, 'gr' + i, 'garde', g.x, g.z, PI));
    let reste = 0, actif = false, dernier = -1;
    const vague = async () => {
      actif = false;
      const n = F().r9_vague || 0, e = S.echelles[n];
      const { kael } = P();
      E.shot([e.x + 5, 3.4, 2.6], [e.x, 0.8, -2.4]); sfx('quake'); e.obj.visible = true;
      await tween(600, (k) => { e.obj.position.y = -4 + 2.6 * k; });
      const grimpeurs = VAGUES[n].map((k, i) => { const o = makeChar(ENEMI[k] || k); st.add(o, e.x + (i - 1) * 1.3, -1.3, 0); return o; });
      await talk([['GARDE', ['Échelles ! Échelles au centre-ouest !', 'Deuxième vague ! Ils ont des mages !', 'Ils reviennent ! Tenez le mur !'][n]]]);
      await E.walk(kael, e.x, 1.2, 4); E.face(kael, e.x, -2);
      E.unshot();
      await fight(VAGUES[n], { arena: 'remparts', story: true, canFlee: false, intro: `Vague ${n + 1} sur 3 : les soldats de Cendre franchissent les créneaux !` });
      for (const o of grimpeurs) st.remove(o);
      sfx('shatter'); await tween(500, (k) => { e.obj.position.y = -1.4 - 4 * k; e.obj.rotation.z = k * 0.8; }); e.obj.visible = false;
      F().r9_vague = n + 1; save();
      if (n + 1 < 3) {
        await talk([['BORIN', n === 0 ? "L'échelle est à terre ! Soignez-vous, vite : ils reviennent." : "Encore une. Buvez, bandez vos plaies. Trente secondes."]]);
        reste = PAUSE_VAGUE; dernier = -1; actif = true;
      } else {
        music('');
        await talk([
          ['', "La troisième échelle bascule dans le vide. Sur la plaine, un cor sonne la retraite."],
          ['GARDE', "Ils reculent ! Ils reculent !"],
          ['BORIN', "Ils ne reculent pas. Ils dégagent le champ pour leurs catapultes. Nyssa : la poterne. On sort."],
          ['NYSSA', "Enfin un plan qui me ressemble."],
        ]);
        await fade(true, 800);
        await narrate(["Une poterne basse, au pied de la muraille.\nDehors : trois machines, et un camp qui ne vous attend pas."]);
        await goPhase('ch9_catapultes');
      }
    };
    const ENEMI = { fantassin: 'fantassin', arbaletrier: 'arbaletrier', mage_guerre: 'mage_guerre' };
    tic(st, (dt) => {
      if (!actif || E.busy || !E.enabled) return;
      reste -= dt;
      const s = Math.max(0, Math.ceil(reste));
      if (s !== dernier) { dernier = s; setObjective(`Soignez l'équipe (menu ☰) : prochaine vague dans <b>${s} s</b>`); }
      if (reste <= 0) { actif = false; E.run(vague); }
    });
    npc(st, 'sergent', 'soldat', S.soigneur.x, S.soigneur.z, PI, 'au sergent', async () => {
      if (!actif) { await talk([['SERGENT', "Tenez bon. On tient avec vous."]]); return; }
      const r = await choose("<b>SERGENT</b> — Vous êtes prêts ? Je fais sonner le cor.", [{ label: 'Prêts : faites venir la vague' }, { label: 'Pas encore' }], { cancel: true });
      if (r === 0) reste = 0;
    });
    enter(st, { x: 0, z: 1.4, ry: PI, yaw: 0 });
    setObjective('Défendre les remparts');
    await fade(false, 700);
    if (!F().r9_intro) {
      F().r9_intro = 1;
      await talk([['', "Le chemin de ronde, au-dessus de la porte Nord. En bas, la plaine entière brille de torches."], ['BORIN', "Trois échelles en approche. On les prend une par une. Avec moi !"]]);
      hint("Trois vagues. Entre deux vagues, <b>30 secondes</b> pour soigner l'équipe avec le menu.");
      setTimeout(() => hint(null), 8000);
    }
    E.run(vague);
  }

  // ============================================================
  //  2. LES CATAPULTES : sortie de nuit, chronométrée
  // ============================================================
  async function ch9_catapultes() {
    const st = buildCatapultes(), S = st.spots;
    const ids = ['k9a', 'k9b', 'k9c'];
    mobs(st, S.mobs, 'siege');
    let reste = DUREE_SORTIE, actif = false, dernier = -1;
    const compte = () => [0, 1, 2].filter((k) => F()['k9_' + k]).length;
    const casser = (m) => { m.obj.userData.bras.rotation.x = 0.7; const f = makeFire(1.6, false); st.add(f, m.x, m.z, 0, 1.2); lumiere(st, m.x, 2.4, m.z, 0xff7030, 1.6, 16); };
    S.machines.forEach((m, i) => {
      if (F()['k9_' + i]) casser(m);
      st.interact({ x: m.x, z: m.z, r: 4.2, label: 'Saboter la catapulte', cond: () => !F()['k9_' + i], action: async () => {
        if (!F()['m_' + ids[i]]) { await talk([['BORIN', "Ses servants d'abord !"]]); return; }
        sfx('steal'); await sleep(250); sfx('fire'); casser(m); F()['k9_' + i] = 1;
        const n = compte();
        toast(`Catapulte en feu : <b>${n} / 3</b>`);
        if (n === 3) {
          actif = false; music('');
          await talk([['', "La troisième machine s'embrase. Tout le camp se réveille en hurlant."], ['BORIN', "À la poterne ! Maintenant !"]]);
          F().k9_fin = 1;
          await fade(true, 700);
          await narrate(["Vous repassez la poterne sous une pluie de carreaux.\nÀ peine le verrou tiré, la terre se met à trembler. Un coup. Puis un autre.", "La porte Ouest."]);
          await goPhase('ch9_porte');
        }
      } });
    });
    tic(st, (dt) => {
      if (!actif || E.busy || !E.enabled) return;
      reste -= dt;
      const s = Math.max(0, Math.ceil(reste));
      if (s !== dernier) { dernier = s; setObjective(`Sabotez les trois catapultes : ${compte()} / 3 — <b>${s} s</b>`); if (s <= 10 && s > 0) sfx('windup'); }
      if (reste <= 0) {
        actif = false;
        E.run(async () => {
          sfx('encounter'); await fade(true, 500);
          await narrate(["Trop tard : tout le camp est debout, et vous êtes au milieu.\nLe pendentif brûle, et le temps revient en arrière. Recommencez la sortie."]);
          for (let k = 0; k < 3; k++) { delete F()['k9_' + k]; delete F()['m_' + ids[k]]; }
          await goPhase('ch9_catapultes');
        });
      }
    });
    enter(st, { x: 0, z: 5.4, ry: PI, yaw: 0 });
    setObjective('Sabotez les trois catapultes');
    await fade(false, 600);
    if (!F().k9_intro) {
      F().k9_intro = 1;
      await talk([['NYSSA', "Trois machines : deux devant, une au fond. Les servants, puis la corde du bras, puis le feu."], ['BORIN', "On a peu de temps avant que le camp se réveille. Courez."]]);
      hint(`Le chrono ne tourne pas pendant les combats. Vous avez <b>${DUREE_SORTIE} secondes</b>.`);
      setTimeout(() => hint(null), 8000);
    }
    actif = true;
  }

  // ============================================================
  //  3. LA PORTE OUEST : le Bélier Infernal
  // ============================================================
  async function ch9_porte() {
    const st = buildPorteOuest(false), S = st.spots;
    S.gardes.forEach((g, i) => npc(st, 'gp' + i, i % 2 ? 'soldat' : 'garde', g.x, g.z, PI));
    enter(st, { x: 0, z: 7, ry: PI, yaw: 0 });
    setObjective('Tenir la porte Ouest');
    healParty();
    await fade(false, 700);
    const { kael } = P();
    await talk([['', "La porte Ouest. Chaque coup fait tomber de la poussière des voûtes. Les battants se fendent."], ['BORIN', "Gardes de Solméria ! Derrière les barricades ! Quand elle cède, personne ne recule !"]]);
    await E.walk(kael, 0, -2, 3); E.face(kael, 0, -14);
    E.shot([6, 3, -3], [0, 2.4, -15]); music('');
    sfx('quake'); await tween(500, (k) => { for (const b of S.battants) b.rotation.x = Math.sin(k * 30) * 0.04; });
    await sleep(350); sfx('explosion');
    const belier = makeEnemyModel('belier'); st.add(belier, 0, -19, 0);
    await tween(700, (k) => { S.battants[0].rotation.y = -0.12 - 1.2 * k; S.battants[1].rotation.y = 0.12 + 1.2 * k; belier.position.z = -19 + (S.belier.z + 19) * k; });
    const hesk = makeChar('hesk'); st.add(hesk, S.hesk.x, -15, 0); await E.walk(hesk, S.hesk.x, S.hesk.z, 3);
    music('boss');
    await talk([
      ['', "Les battants volent en éclats. Une tête de bélier en fonte, rougie au feu, entre dans la ville."],
      ['COMMANDANT HESK', "Capitaine Borin ! Vingt ans que vous gardez cette porte. Je viens de l'ouvrir en une nuit."],
      ['BORIN', "Tu as ouvert une porte, Hesk. Tu n'es pas encore entré."],
    ]);
    E.unshot();
    await fight(['hesk', 'belier'], { arena: 'siege', story: true, canFlee: false, music: 'boss', intro: 'Le Bélier Infernal et le commandant Hesk !', onStart: async (api) => {
      await api.msg("Tant que <b>Hesk</b> est debout, il <b>répare</b> le bélier de 200 PV. Battez-le d'abord !", 3000);
      await api.msg("Le bélier est une machine de <b>Feu</b> : il craint l'<b>Eau</b> (Éclat de Givre, Fioles de givre).", 2800);
    } });
    F().p9_belier = 1; st.remove(hesk);
    const f = makeFire(3, false); st.add(f, belier.position.x, belier.position.z, 0, 1.4); sfx('fire');
    await talk([['', "Le Bélier Infernal s'effondre sur ses roues et prend feu. Derrière lui, les soldats gris refluent."], ['GARDE', "La porte tient ! LA PORTE TIENT !"]]);
    equipement('medaille_rempart');
    await talk([['BORIN', "Tiens, petit. La Médaille du Rempart. On la donne à ceux qui étaient sur le mur. Tu y étais."]]);
    await fade(true, 900);
    await goPhase('ch9_aube');
  }

  async function ch9_aube() {
    const st = buildPorteOuest(true), S = st.spots;
    S.gardes.forEach((g, i) => npc(st, 'gp' + i, i % 2 ? 'soldat' : 'garde', g.x * 1.4, g.z + 6, i % 2 ? PI / 2 : -PI / 2));
    const epave = makeEnemyModel('belier'); st.add(epave, S.epave.x, S.epave.z, 0.2); epave.rotation.z = 0.12;
    enter(st, { x: -9.4, z: -4, ry: PI / 2, yaw: -PI / 2 });
    const { kael, lyra, nyssa, borin } = P();
    lyra.position.set(-8.2, 0, -2.6); if (nyssa) nyssa.position.set(-7.6, 0, -5.2); if (borin) borin.position.set(-5.6, 0, -3.4);
    for (const fo of E.followers) { fo.userData.stay = true; E.face(fo, kael.position.x, kael.position.z); }
    if (kael.userData.imported) kael.userData.poseAt('Sitting_Idle_Loop', 0.4); else kael.userData.pose = true;
    setObjective('');
    E.shot([-3.6, 2.4, 1.6], [-8.6, 0.9, -4], true);
    await fade(false, 1200);
    await talk([
      ['', "L'aube. Le bélier brûle encore. Sur les murs, les soldats de Solméria crient le nom de leur ville."],
      ['', "Kael s'assoit contre le rempart, épuisé."],
      ['LYRA', "On a gagné ? On a vraiment gagné ?"],
      ['NYSSA', "Ne dis pas ça. Dans les histoires, celui qui dit ça..."],
    ]);
    music(''); sfx('cri'); await sleep(900); sfx('cri'); await sleep(500);
    await talk([['', "Un cor sonne à l'est. Puis un deuxième."]]);
    const garde = makeChar('blesse'); st.add(garde, 10, 6, -PI / 2);
    E.shot([-1, 2.6, 2.6], [-4, 1.3, -3]);
    await E.walk(garde, -3.4, -2.8, 5.5); E.face(garde, borin ? borin.position.x : -5.6, -3.4); if (borin) E.face(borin, -3.4, -2.8);
    music('danger');
    await talk([
      ['', "Un garde arrive en courant, le visage en sang."],
      ['GARDE', "Capitaine ! La porte Est ! Elle est ouverte !"], ['BORIN', "Enfoncée ?"],
      ['GARDE', "Non, capitaine. Ouverte. De l'intérieur. Le Chevalier Noir est dans la ville."],
    ]);
    kael.userData.pose = false; kael.position.y = 0;
    await talk([['KAEL', "... De l'intérieur."], ['BORIN', "Le roi. Au château. COUREZ !"]]);
    F().ch9_fin = 1;
    for (const fo of E.followers) fo.userData.stay = false;
    E.unshot(); healParty();
    await fade(true, 900);
    music('title');
    await chapterCard('Fin du chapitre 9', 'À suivre : Chapitre 10 — La Chute de la Cité Blanche');
    await goPhase('ch10_rues');
  }

  return { ch9_plaine, ch9_egouts, ch9_conseil, ch9_remparts, ch9_catapultes, ch9_porte, ch9_aube };
}
