// ============================================================
//  HISTOIRE — CHAPITRE 10 : LA CHUTE DE LA CITÉ BLANCHE
//  Les rues en feu (barrages, civils à sauver), les marches du château, la salle du trône,
//  le combat perdu d'avance contre Darian, le pendentif, la fuite. FIN DE L'ACTE I.
//  (dialogues repris du script « 01_Acte1_Chapitres_01-10.md », chapitre 10)
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { E } from './engine.js';
import { G, save, healParty } from './state.js';
import { sleep, talk, choose, toast, setObjective, hint, fade, narrate, chapterCard } from './ui.js';
import { sfx, music } from './audio.js';
import { buildTrone } from './world3.js';
import { buildRuesFeu } from './world9.js';
import { makeChar } from './models.js';
import { niveauMin } from './story5.js';

const PI = Math.PI;
const F = () => G.flags;

// Un voile blanc par-dessus tout (la pierre de téléportation d'Aldric)
function voileBlanc() {
  let d = document.getElementById('voileBlanc');
  if (!d) { d = document.createElement('div'); d.id = 'voileBlanc'; d.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:40;transition:opacity .7s'; document.body.appendChild(d); }
  return d;
}

export function chapter10(T) {
  const { enter, goPhase, fight, statue, tween, npc, lieDown } = T;
  const P = () => T.party();
  const sauves = () => [0, 1, 2].filter((k) => F()['c10_s' + k]).length;

  // ============================================================
  //  LES RUES EN FEU
  // ============================================================
  async function ch10_rues() {
    const st = buildRuesFeu(), S = st.spots;
    statue(st, S.statue);

    // ----- Les barrages : trois combats obligatoires -----
    S.barrages.forEach((b, i) => {
      if (F()['c10_b' + i]) return;
      const objs = b.ennemis.map((k, j) => { const o = makeChar(k); st.add(o, (j - (b.ennemis.length - 1) / 2) * 1.8, b.z - 2.4, 0); return o; });
      st.trigger({ x1: -8, x2: 8, z1: b.z - 0.4, z2: b.z + 1.6, once: true, cond: () => !F()['c10_b' + i], action: async () => {
        const { kael } = P();
        E.face(kael, 0, b.z - 3); sfx('encounter');
        await talk([[i === 2 ? 'CHEVALIER DE CENDRE' : 'SOLDAT DE CENDRE', ["Encore des gardes ! Tuez-les !", "Personne ne monte au château. Ordre du général.", "Le roi est déjà mort, gamin. Pose ton épée."][i]]]);
        await fight(b.ennemis, { arena: 'cite_feu', story: true, canFlee: false, music: 'battle', intro: "Les soldats de Cendre barrent la rue !" });
        for (const o of objs) st.remove(o);
        F()['c10_b' + i] = 1; save();
        if (i === 0) await talk([['KAEL', "C'est comme Brumeval. C'est exactement comme Brumeval."], ['LYRA', "Kael. Regarde-moi. Cette fois, tu n'es pas seul. Avance."]]);
      } });
    });

    // ----- Les civils : un par ruelle, facultatifs -----
    const NOMS_CIVILS = ['FEMME', 'ENFANT', 'VIEIL HOMME'];
    S.civils.forEach((c, i) => {
      if (F()['c10_s' + i]) return;
      const civil = makeChar(c.k); st.add(civil, c.x, c.z, c.ry); st.circle(c.x, c.z, 0.45);
      const p = S.pillards[i], pillard = makeChar(i === 1 ? 'mage_guerre' : 'fantassin'); st.add(pillard, p.x, p.z, -c.ry);
      const cote = Math.sign(c.x);
      st.trigger({ x1: Math.min(cote * 8.4, cote * 12), x2: Math.max(cote * 8.4, cote * 12), z1: c.z - 2.4, z2: c.z + 2.4, once: true, cond: () => !F()['c10_s' + i], action: async () => {
        const { kael } = P();
        E.face(kael, p.x, p.z); E.face(pillard, kael.position.x, kael.position.z);
        await talk([[NOMS_CIVILS[i], ["Pitié ! Je n'ai rien ! Je n'ai rien !", "Maman ! MAMAN !", "Laissez la maison. Prenez-moi, mais laissez la maison."][i]]]);
        await fight(i === 1 ? ['mage_guerre', 'fantassin'] : ['fantassin', 'arbaletrier'], { arena: 'cite_feu', story: true, canFlee: false, intro: 'Des pillards !' });
        st.remove(pillard); F()['c10_s' + i] = 1;
        E.face(civil, kael.position.x, kael.position.z);
        await talk([[NOMS_CIVILS[i], ["Merci... merci. Le passage des jardins, c'est ça ? J'y cours.", "... Tu es un chevalier ? Tu as pas d'armure de chevalier.", "Mon garçon... que la Lumière te garde. Elle ne garde plus grand monde, ce matin."][i]]]);
        await E.walk(civil, cote * 6, c.z + 1, 4.5); st.remove(civil);
        toast(`Civil sauvé : <b>${sauves()} / 3</b>`); sfx('heal'); save();
      } });
    });

    // ----- Les marches du château -----
    let alinor = null, porteurs = [];
    if (!F().c10_alinor) {
      alinor = makeChar('alinor'); st.add(alinor, S.alinor.x, S.alinor.z, 0);
      porteurs = [-1, 1].map((c) => { const o = makeChar('garde'); st.add(o, S.alinor.x + c * 0.9, S.alinor.z, 0); return o; });
      for (const [x, z, r] of [[-3, -77.6, 0.6], [2.6, -78.4, -1.2], [0.6, -79.4, 2.2]]) { const m = makeChar('garde'); st.add(m, x, z, r); lieDown(m, true); }
      st.trigger({ x1: -8, x2: 8, z1: -72.6, z2: -70.4, once: true, cond: () => !F().c10_alinor, action: async () => {
        const { kael, borin } = P();
        await E.walk(kael, 0, -72.6, 3); E.face(kael, 0, -76);
        E.shot([4.6, 2.4, -70.6], [0, 1.4, -76]); music('');
        await talk([
          ['', "La garde royale est morte dans les escaliers. La princesse Alinor, blessée, est portée par deux gardes."],
          ['PRINCESSE ALINOR', "Mon père a refusé de quitter le trône. Borin, je vous en prie."],
          ['BORIN', "Emmenez-la au passage des jardins. C'est un ordre."],
        ]);
        await Promise.all([E.walk(alinor, 6, -66, 3), E.walk(porteurs[0], 5.2, -66.4, 3), E.walk(porteurs[1], 6.8, -66.4, 3)]);
        for (const o of [alinor, ...porteurs]) st.remove(o);
        await talk([['BORIN', "Avec moi."]]);
        F().c10_alinor = 1; E.unshot(); music(st.music);
        setObjective('Entrer dans le château'); save();
      } });
    }
    st.interact({ x: S.chateau.x, z: S.chateau.z, r: 3, label: 'Entrer dans le château', cond: () => !!F().c10_alinor, action: async () => {
      const n = sauves();
      if (n < 3) {
        const r = await choose(`Il reste <b>${3 - n} civil${3 - n > 1 ? 's' : ''}</b> dans les ruelles. Entrer quand même ?`, [{ label: 'Entrer dans le château', sub: 'On ne pourra plus revenir' }, { label: 'Retourner les chercher' }], { cancel: true });
        if (r !== 0) return;
      }
      await fade(true, 800); healParty();
      await narrate(["Le grand escalier. Les tapisseries brûlent.\nAu bout du couloir, les portes de la salle du trône sont entrouvertes."]);
      await goPhase('ch10_trone');
    } });

    const pos = F().pos || { x: 0, z: 7 };
    enter(st, { x: pos.x, z: pos.z, ry: PI, yaw: 0 });
    setObjective(F().c10_alinor ? 'Entrer dans le château' : 'Atteindre le château, au nord');
    if (!F().ch10_intro) {
      await chapterCard('Chapitre 10', 'La Chute de la Cité Blanche');
      await fade(false, 700);
      F().ch10_intro = 1;
      await niveauMin(19, "Une nuit entière sur les murs. Personne n'en redescend le même.");
      healParty();
      await talk([['', "La ville basse brûle. Des gens courent dans tous les sens, sans crier. C'est le pire : personne ne crie."], ['BORIN', "Par la grand-rue. Tout droit jusqu'au château."]]);
      hint("Des <b>civils</b> sont piégés dans les <b>ruelles</b>, à gauche et à droite. Les sauver comptera plus tard.");
      setTimeout(() => hint(null), 9000);
      save();
    } else await fade(false, 600);
  }

  // ============================================================
  //  LA SALLE DU TRÔNE
  // ============================================================
  async function ch10_trone() {
    const st = buildTrone(), S = st.spots;
    st.sky = 0x2a1410; st.fog = [0x3a1c14, 40, 160]; st.hemi = [0xffc8a8, 0x6a4a48, 1.0];
    const roi = makeChar('roi'); st.add(roi, 0, -31.6, 0);
    let darian = makeChar('darian'); st.add(darian, 0, -30.2, PI);
    for (const [x, z, r] of [[-4, -12, 0.4], [4.4, -18, -0.9], [-3.6, -24, 1.6]]) { const m = makeChar('garde'); st.add(m, x, z, r); lieDown(m, true); }
    enter(st, { x: 0, z: -4, ry: PI, yaw: 0 });
    const { kael, lyra, nyssa, borin } = P();
    lyra.position.set(-1.4, 0, -3); if (nyssa) nyssa.position.set(1.4, 0, -2.6); if (borin) borin.position.set(0.6, 0, -5.4);
    for (const f of E.followers) { f.userData.stay = true; f.rotation.y = PI; }
    setObjective(''); music('');
    E.shot([0, 6, 2], [0, 2.4, -30], true);
    await fade(false, 1200);
    await talk([['', "Les portes s'ouvrent. Le roi Aldemar est à genoux."]]);
    E.shot([3.4, 2.2, -26.4], [0, 1.4, -31]);
    if (darian.userData.imported) darian.userData.play('Sword_Attack', { speed: 0.5 });
    sfx('slash'); await sleep(700);
    lieDown(roi, true);
    await talk([['', "Le Chevalier Noir retire son épée de la poitrine du roi."]]);
    E.shot([-3, 2.4, -3], [0.4, 1.5, -6]);
    sfx('cri');
    await talk([['BORIN', "SIRE !"]]);
    E.face(darian, 0, -4);
    await Promise.all([E.walk(kael, 0, -24.4, 5), E.walk(lyra, -1.6, -23.4, 5), nyssa ? E.walk(nyssa, 1.8, -23, 5) : null, borin ? E.walk(borin, 0.8, -25.6, 5.5) : null]);
    for (const o of [kael, lyra, nyssa, borin]) if (o) E.face(o, 0, -30);
    E.shot([4.4, 2.6, -24.6], [0, 1.6, -29.4]); music('danger');
    await talk([
      ['DARIAN', "Capitaine Borin. Le roi a combattu debout. Vous pourrez le dire à ses chroniqueurs."],
      ['BORIN', "Je vais te tuer."], ['DARIAN', "Non."],
    ]);
    E.unshot();
    // ----- Combat scénarisé : impossible à gagner -----
    await fight(['darian_noir'], { arena: 'trone', canFlee: false, noDeath: true, music: 'boss', intro: 'Darian, le Chevalier Noir.', onStart: async (api) => {
      await api.msg("Son armure boit les coups : rien ne semble l'atteindre.", 2400);
    }, onRound: async (api, round) => {
      if (round === 2) await api.msg("<b>DARIAN</b> : Vous vous battez bien. Ça ne changera rien.", 2400);
      if (round === 3) await api.msg("L'ombre monte le long de sa lame. Darian lève son épée à deux mains...", 2600);
      if (round >= 4) {
        sfx('explosion');
        await api.msg("<b>ÉCLIPSE</b> ! La salle entière devient noire.", 2200);
        for (const h of api.heroes) { h.hp = 1; }
        api.refresh(); sfx('crit');
        await api.msg("Toute l'équipe est à terre.", 2000);
        api.end('stop');
      }
    } });
    for (const h of G.party) h.hp = 1;
    F().c10_darian = 1;
    // ----- Le pendentif -----
    for (const o of [lyra, nyssa, borin]) if (o) lieDown(o, true);
    lyra.position.set(-3, 0.02, -22.6); if (nyssa) nyssa.position.set(3.4, 0.02, -22); if (borin) borin.position.set(2, 0.02, -26.4);
    kael.position.set(0, 0, -27.6); kael.rotation.y = PI; darian.position.set(0, 0, -29); darian.rotation.y = 0;
    E.shot([2.6, 1.9, -26], [0, 1.3, -28.4], true); music('');
    await fade(false, 800);
    await talk([['', "Darian désarme Kael d'un revers et lève son épée."]]);
    if (darian.userData.imported) darian.userData.play('Sword_Attack', { speed: 0.35 });
    await sleep(500); sfx('levelup');
    await talk([
      ['', "La chaîne du pendentif glisse hors de la tunique. La lame s'arrête."],
      ['DARIAN', "Où as-tu eu ça ?"], ['KAEL', "Va au diable."],
      ['', "Darian le soulève par le col."], ['DARIAN', "Où ?"],
      ['KAEL', "C'était à ma mère ! Elara ! C'est tout ce qui me reste d'elle, et tu ne l'auras pas !"],
    ]);
    await E.walk(darian, 0, -30.4, 1.2); E.face(darian, 0, -27.6);
    const nu = makeChar('darian_nu'); st.remove(darian); st.add(nu, 0, -30.4, 0); darian = nu;
    E.shot([1.5, 1.8, -28.2], [0, 1.55, -30.4]); music('sad');
    await talk([
      ['', "Darian le lâche. Il recule d'un pas. Lentement, il enlève son casque."],
      ['', "La même mâchoire. Les mêmes yeux que Kael. Sept ans de plus."],
      ['DARIAN', "... Kael ?"], ['KAEL', "Comment tu connais mon nom ?"],
      ['DARIAN', "On m'a dit que tu étais mort. On m'a dit que les chevaliers de Solméria t'avaient tué avec elle."],
      ['DARIAN', "J'avais quatorze ans. Je t'ai cherché dans les cendres."],
    ]);
    await fade(true, 500);
    await narrate(["Une maison en feu.\nUn adolescent qui crie un prénom.\nUne main gantée qui l'emporte."]);
    // ----- La fuite -----
    const soldats = [[-3, -8], [3, -8], [0, -6]].map(([x, z]) => { const o = makeChar('chevalier_cendre'); st.add(o, x, z, PI); return o; });
    const aldric = makeChar('aldric'); st.add(aldric, -8.6, -25, PI / 2);
    E.shot([5, 3.2, -19], [-1, 1.4, -27], true); music('danger');
    await fade(false, 500);
    await talk([['', "Des soldats impériaux entrent dans la salle. Darian hésite, l'épée basse."]]);
    await Promise.all([E.walk(aldric, -2.4, -26, 4.5), ...soldats.map((o, i) => E.walk(o, (i - 1) * 2.6, -16, 4))]);
    const pierre = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0x6ab8ff })); pierre.position.set(0.3, 1.5, 0.2); aldric.add(pierre);
    await talk([
      ['', "Aldric surgit d'une porte dérobée, une pierre bleue à la main."],
      ['ALDRIC', "Maintenant, mes enfants !"], ['KAEL', "Attends ! Darian ! DARIAN !"],
    ]);
    const v = voileBlanc(); sfx('vanish'); v.style.opacity = 1; await sleep(900);
    for (const o of [kael, lyra, nyssa, borin, aldric]) if (o) o.visible = false;
    E.shot([2.4, 2.2, -26.4], [0, 1.5, -30.4], true); music('');
    v.style.opacity = 0; await sleep(900);
    await E.walk(soldats[1], 0.6, -27.4, 2.2);
    await talk([
      ['', "Dans la salle vide, un soldat s'approche du Chevalier Noir."],
      ['SOLDAT', "Général ? La chambre forte est ouverte. L'Éclat de Terre est à nous."],
    ]);
    const casque = makeChar('darian'); st.remove(darian); st.add(casque, 0, -30.4, 0);
    await talk([['', "Il remet son casque. Sa main tremble."], ['DARIAN', "... Prenez-le. Et sortez. Tous."]]);
    for (const o of [kael, lyra, nyssa, borin]) if (o) { o.visible = true; lieDown(o, false); }
    for (const f of E.followers) f.userData.stay = false;
    F().ch10_fin = 1; F().acte1_fin = 1; F().civils_sauves = sauves();
    healParty();
    await fade(true, 1600);
    E.unshot();
    await goPhase('ch10_fin');
  }

  // ============================================================
  //  FIN DE L'ACTE I : le bilan
  // ============================================================
  async function ch10_fin() {
    await fade(true, 0);
    E.enabled = false; setObjective(''); music('title');
    await sleep(600);
    await chapterCard("FIN DE L'ACTE I", "L'Éveil");
    const t = Math.floor(G.time || 0), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60);
    const niv = G.party.map((p) => `${({ kael: 'Kael', lyra: 'Lyra', nyssa: 'Nyssa', borin: 'Borin' })[p.id] || p.id} niv. ${p.level}`).join(' · ');
    const n = F().civils_sauves || 0;
    await narrate([
      "L'Empire de Cendre possède maintenant deux Éclats : l'Ombre et la Terre.\nIl vous en reste deux : le Feu et l'Eau.",
      `BILAN DE L'ACTE I\n\nTemps de jeu : ${h} h ${String(m).padStart(2, '0')} min\n${niv}\nCivils sauvés : ${n} / 3\nSerment des nains : ${F().serment_nains ? 'obtenu' : 'non'}`,
      "Le Chevalier Noir s'appelle Darian.\nC'est le frère de Kael.\n\nÀ suivre : Acte II — Les Sept Lumières.",
    ]);
    F().bilan_vu = 1; save();
    document.getElementById('choice').style.zIndex = 60;      // le choix final passe au-dessus de l'écran noir
    while (true) {
      const r = await choose("<b>Fin de l'acte I.</b> Merci d'avoir joué. La partie est sauvegardée.", [{ label: "Revenir à l'écran titre" }, { label: 'Revoir le bilan' }]);
      if (r === 1) { await narrate([`BILAN DE L'ACTE I\n\nTemps de jeu : ${h} h ${String(m).padStart(2, '0')} min\n${niv}\nCivils sauvés : ${n} / 3`]); continue; }
      location.reload(); return;
    }
  }

  return { ch10_rues, ch10_trone, ch10_fin };
}
