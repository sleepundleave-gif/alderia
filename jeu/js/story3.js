// ============================================================
//  HISTOIRE — CHAPITRE 3 : LA CITÉ BLANCHE
//  Solméria, les toits, les égouts, la salle du trône.
//  (dialogues repris du script « 01_Acte1_Chapitres_01-10.md », chapitre 3)
//  T : outils communs prêtés par story.js (combats, coffres, personnages, sauvegarde…)
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { E } from './engine.js';
import { G, save, makeHero, healParty, hero, addItem } from './state.js';
import { EQUIP, HEROES } from './data.js';
import { sleep, talk, choose, toast, setObjective, updateGold, hint, fade, narrate, chapterCard, shop } from './ui.js';
import { sfx, music } from './audio.js';
import { buildSolmeria, buildToits, buildEgouts, buildTrone } from './world3.js';
import { makeChar, makeEnemyModel } from './models.js';
import { brancherMaisons } from './interieurs.js';

const PI = Math.PI;
const F = () => G.flags;
const near = (o, x, z, r) => Math.hypot(o.position.x - x, o.position.z - z) < r;
const sit = (o) => { if (o.userData.imported) o.userData.poseAt('Sitting_Idle_Loop', 0.4); };
// Un guetteur : appelé à chaque image tant que le joueur est libre de ses mouvements
function watcher(st, fn) { const g = new THREE.Group(); g.userData.anim = (dt) => { if (!E.busy && E.enabled) fn(dt); }; st.add(g); return g; }

export function chapter3(T) {
  const { enter, goPhase, fight, give, chest, npc, reader, statue, mobs, tween } = T;
  const P = () => T.party();

  // ============================================================
  //  SOLMÉRIA
  // ============================================================
  async function ch3_ville() {
    const st = buildSolmeria(), S = st.spots;
    brancherMaisons(st, T);                         // quelques maisons du quartier des Artisans sont ouvertes
    const apres = !!F().trone;                      // après l'audience : l'équipe est au complet
    statue(st, S.statue);

    // ----- Porte Sud -----
    npc(st, 'g_porte1', 'garde', S.porte[0].x, S.porte[0].z, 0, 'au garde', () => talk([['GARDE', 'Solméria, la Cité Blanche. Sept siècles, pas une brèche dans ses murs.'], ['GARDE', "Gardez vos armes au fourreau, et tout ira bien."]]));
    npc(st, 'g_porte2', 'garde', S.porte[1].x, S.porte[1].z, 0, 'au garde', () => talk([['GARDE', apres ? "Le laissez-passer du roi ? Passez, passez. Et bonne route." : "Les patrouilles du nord ne rentrent plus. Si vous venez de là-haut, le capitaine voudra vous entendre."]]));
    npc(st, 'renaud', 'renaud', S.renaud.x, S.renaud.z, -PI / 2, 'au sergent Renaud', () => talk(apres ? [
      ['RENAUD', "Le capitaine part avec vous ? Alors c'est que l'affaire est grave."], ['RENAUD', "Ramenez-le entier. La Garde ne tient debout que parce qu'il crie dessus."],
    ] : [
      ['RENAUD', "Le capitaine Borin ? À la caserne, près du château. Mais elle est fermée aux civils."], ['RENAUD', "Il traverse la place du Marché tous les jours à midi. Tentez votre chance là-bas, tout droit au nord."],
    ]));
    reader(st, S.tableau, "Lire le tableau d'affichage", [
      ['AVIS', "« Par ordre du roi Aldemar : les portes ferment à la tombée du jour. »"],
      ['AVIS', "« RECHERCHÉE — une voleuse au foulard rouge. Agile. Insolente. Récompense : 200 pièces d'or. »"],
      ['AVIS', "« On a vu des rats gros comme des chiens au quai des Lavandières. La Garde est priée de faire quelque chose. — Les lavandières »"],
      ['AVIS', "« Cherche bras solides pour escorter une caravane vers les Collines de Granit. S'adresser Au Fer Droit. »"],
    ]);

    // ----- Quartier des Artisans -----
    npc(st, 'gontran', 'gontran', S.gontran.x, S.gontran.z, PI / 2, 'à Gontran, « Au Fer Droit »', async () => {
      await talk([['GONTRAN', "Au Fer Droit ! Acier de Solméria, trempé deux fois. Ce que tu portes là, petit, c'est du fer de village."]]);
      await shop('Au Fer Droit — armes et armures', ['epee_garde', 'baton_braise', 'cotte_mailles', 'robe_renforcee']);
    });
    npc(st, 'ysolde', 'ysolde', S.ysolde.x, S.ysolde.z, -PI / 2, 'à Ysolde, « La Mandragore »', async () => {
      await talk([['YSOLDE', "La Mandragore. Potions, antidotes, et de quoi mettre le feu à ce qui vous ennuie."], ['YSOLDE', "Si vous descendez un jour sous la ville : prenez des antidotes. Tout ce qui vit en bas est sale."]]);
      await shop('La Mandragore — herboristerie', ['potion', 'ether', 'antidote', 'fiole_braise', 'fiole_givre', 'fumigene', 'tente']);
    });
    npc(st, 'hotesse', 'hotesse', S.hotesse.x, S.hotesse.z, PI / 2, "à l'hôtesse des Sept Couronnes", async () => {
      while (true) {
        const r = await choose(`<b>Auberge « Les Sept Couronnes »</b> (${G.gold} or)`, [
          { label: 'Dormir', right: '20 or', sub: "Restaure les PV et PM de toute l'équipe", disabled: G.gold < 20 },
          { label: 'Écouter les rumeurs' },
        ], { cancel: true, cancelLabel: '← Au revoir' });
        if (r === 0) { G.gold -= 20; updateGold(); await fade(true, 700); healParty(); sfx('heal'); await sleep(600); await fade(false, 700); toast('Des draps propres, enfin. PV et PM restaurés.'); }
        else if (r === 1) await talk(apres ? [
          ['HÔTESSE', "On dit que le roi a reçu trois vagabonds couverts de vase. Dans la salle du trône ! Vous imaginez l'odeur ?"], ['NYSSA', "Très bien, merci."],
        ] : [
          ['HÔTESSE', "Sept couronnes, comme les Sept de la fontaine. Les sept héros qui ont enfermé le Dévoreur, il y a mille ans."],
          ['HÔTESSE', "Regardez bien les statues, sur la place : il y en a une dont on a martelé le visage. Personne ne sait plus pourquoi."],
        ]);
        else break;
      }
    });

    // ----- Place du Marché -----
    reader(st, S.fontaine, 'Lire la plaque de la fontaine', [
      ['PLAQUE', "« Aux Sept, qui portèrent la Couronne d'Aube et scellèrent la nuit. Que leur lumière veille sur Solméria. »"],
      ['LYRA', "Sept statues. Six visages. Le septième a été effacé au burin... et pas par le temps."],
      ['KAEL', "*Le pendentif pèse un peu plus lourd, d'un coup.*"],
    ]);
    const vend = [
      ['citadin1', 0, 'au marchand de fruits', [['MARCHAND', "Pommes de Brumeval ! Enfin... les dernières. Plus rien ne descend du nord depuis trois jours."], ['KAEL', "..."]]],
      ['citadine1', 1, 'à la drapière', [['DRAPIÈRE', "Du bleu de Solméria, le vrai. On n'en teint plus : l'indigo venait d'Ysmère."], ['LYRA', "*Elle détourne les yeux.*"]]],
      ['citadin2', 3, 'au poissonnier', [['POISSONNIER', "Ne mangez rien qui sorte du canal, c'est un conseil d'ami. Ça grouille, là-dessous. Ça grossit."]]],
      ['citadine2', 4, 'à la fleuriste', [['FLEURISTE', "Des fleurs pour la princesse Alinor ? Elle descend parfois sur la place, sans escorte. Son père en est malade."]]],
      ['citadin3', 6, 'au vieux camelot', [['CAMELOT', "Attention à vos poches. Il y a une fille au foulard rouge qui vous délesterait un garde de ses bottes sans qu'il s'arrête de marcher."]]],
      ['citadine3', 7, 'à la boulangère', [['BOULANGÈRE', "Le sage Aldric m'achète un pain chaque matin. Un homme si doux. Trente ans qu'il conseille le roi, et jamais un mot plus haut que l'autre."]]],
    ];
    for (const [key, i, label, lines] of vend) { const e = S.etals[i]; npc(st, key, key, e.vx, e.vz, e.a + PI, label, () => talk(lines)); }
    npc(st, 'noble', 'noble', -4.6, -17.4, 0.6, 'au gentilhomme', () => talk([['GENTILHOMME', "L'Empire de Cendre ? Des rumeurs de frontière. Solméria n'est jamais tombée, et ce n'est pas cette année qu'elle commencera."]]));
    npc(st, 'noble_f', 'noble_f', -3.2, -18.6, -1.2, 'à la dame', () => talk([['DAME', "Mon cousin commandait un fortin au nord. Ses lettres n'arrivent plus. Mais chut : au palais, il ne faut pas en parler."]]));
    npc(st, 'pretre', 'pretre', -8.2, 7.4, 1.2, "au prêtre de l'Aube", () => talk([['PRÊTRE', "Touchez la statue, mes enfants. La lumière se souvient de ceux qui passent."], ['PRÊTRE', "Les Sept n'étaient ni rois ni saints. C'étaient des gens. C'est bien pour cela qu'on les prie."]]));
    npc(st, 'gamin', 'gamin', 9.2, -25.6, 2.4, 'au gamin', () => talk(F().vol && !F().toits ? [['GAMIN', "La fille au foulard ? Par l'échelle, là ! Elle passe toujours par les toits !"]] : [['GAMIN', "Moi, quand je serai grand, je serai capitaine comme Borin. Ou voleur. J'hésite."]]));
    // ----- Quartier du Canal -----
    const tobie = npc(st, 'tobie', 'tobie', S.tobie.x, S.tobie.z, PI, 'au vieux Tobie', () => talk([
      ['TOBIE', "Quarante ans que je pêche sous ce pont. J'ai vu passer trois rois... et des choses, la nuit, par les bouches d'égout."],
      ['TOBIE', "Si tu descends un jour, petit : la gauche, la droite, et le cœur en dernier. C'est les Rats qui disent ça. Les voleurs, pas les bêtes."],
    ]));
    for (let i = 0; i < 2; i++) npc(st, 'g_pont' + i, 'garde', S.pont[i].x, S.pont[i].z, 0, 'au garde du pont', () => talk([['GARDE', apres ? "Le roi vous a reçus. Il ne vous recevra pas deux fois dans la journée." : "Le château est fermé. Pas d'audience sans convocation."]]));

    // ----- L'échelle des toits, la bouche d'égout -----
    st.interact({ x: S.echelle.x, z: S.echelle.z, r: 2.4, label: "Grimper à l'échelle", cond: () => F().vol && !F().toits, action: async () => { await fade(true, 500); await goPhase('ch3_toits'); } });
    st.interact({ x: S.egout.x, z: S.egout.z, r: 2.6, label: 'Descendre dans les égouts', cond: () => F().toits && !F().trone, action: async () => {
      if (!F().egout_vu) { F().egout_vu = 1; await talk([['LYRA', "Elle a sauté là-dedans. Sans hésiter. Elle connaît le chemin."], ['KAEL', "Alors on le connaîtra aussi."], ['LYRA', "... Ça sent exactement comme je l'imaginais."]]); }
      await fade(true, 500); await goPhase('ch3_egouts');
    } });
    st.interact({ x: S.egout.x, z: S.egout.z, r: 2.6, label: "Regarder la bouche d'égout", cond: () => !F().toits || F().trone, action: () => talk(F().trone ? [['NYSSA', "Mon ancienne porte d'entrée. Ne me regardez pas comme ça, c'est très pratique."], ['BORIN', "Je la ferai murer."]] : [['KAEL', "Une bouche d'égout. La grille est ouverte."]]) });

    // ----- Scène 2 : le vol du pendentif -----
    let voleuse = null;
    if (!F().vol) {
      voleuse = makeChar('nyssa'); st.actor('voleuse', voleuse, S.fruits.x - 2.4, S.fruits.z - 1.4, 0, false);
      st.trigger({ x1: -9, x2: 9, z1: 3.5, z2: 9.5, cond: () => !F().vol, action: async () => {
        const { kael, lyra } = P();
        const p = kael.position;
        E.shot([p.x - 4, 4.2, p.z + 6], [p.x + 1, 1.3, p.z - 2]);
        await talk([['LYRA', "La place du Marché. Reste près de moi : dans une foule pareille, on perd vite ce qu'on a de plus précieux."]]);
        await E.walk(voleuse, p.x + 0.5, p.z - 0.7, 8);
        sfx('hit'); if (kael.userData.imported) kael.userData.play('Hit_Chest');
        E.faceEach(kael, voleuse);
        await talk([['NYSSA', "Oh ! Pardon, mon grand. Regarde où tu poses les pieds."]]);
        await E.walk(voleuse, p.x + 5, p.z - 5, 7);
        E.face(lyra, p.x, p.z); E.face(kael, lyra.position.x, lyra.position.z);
        await talk([['LYRA', "Kael. Ton cou."], ['KAEL', "Mon... Le pendentif ! Hé ! Reviens !"]]);
        music('danger');
        E.shot([14, 9, -2], [S.echelle.x, 3, S.echelle.z]);
        await E.walk(voleuse, 19, -14, 11); await E.walk(voleuse, S.echelle.x, S.echelle.z, 11);
        voleuse.userData.pose = true;
        await tween(900, (k) => { voleuse.position.y = k * 7.4; voleuse.rotation.y = PI / 2; });
        voleuse.visible = false; st.remove(voleuse);
        E.unshot();
        F().vol = 1;
        await talk([['LYRA', "Elle est montée sur les toits. Par l'échelle, à l'est de la place !"], ['KAEL', "C'est tout ce qu'il me reste de ma mère. Viens !"]]);
        setObjective("Poursuivre la voleuse : grimper à l'échelle, à l'est de la place");
        hint("L'<b>échelle</b> est appuyée contre une maison, du côté est de la place du Marché.");
        setTimeout(() => hint(null), 9000);
        save();
      } });
    }

    // ----- Sortie par la Porte Sud -----
    st.trigger({ x1: -8, x2: 8, z1: 63.6, z2: 70, once: false, action: async () => {
      const { kael } = P();
      if (!F().trone) { await talk([['LYRA', F().vol ? "Et ton pendentif ? On ne part pas sans lui." : "On vient d'arriver. Borin est quelque part dans cette ville."]]); await E.walk(kael, 0, 60); return; }
      if (F().ch4_fin) {                              // chapitre 4 terminé : la route du nord, vers Ferrecime (chapitre 5)
        if (!F().ch5_intro) await talk([['BORIN', "Ferrecime est au nord, par le col des Aigles. Une semaine de marche. Couvrez-vous."], ['NYSSA', "Des nains. De l'or. Je suis prête depuis hier."]]);
        else { const r = await choose('Reprendre la route du nord, vers <b>Ferrecime</b> ?', [{ label: 'Partir' }, { label: 'Rester en ville' }], { cancel: true }); if (r !== 0) { await E.walk(kael, 0, 60); return; } }
        await fade(true, 900);
        if (F().c5_portes) F().c5_ou = 'portes';
        await goPhase('ch5_col'); return;
      }
      if (!F().ch4_intro) await talk([['BORIN', "Les Collines de Granit sont à trois jours, à l'est. On marchera de l'aube à la nuit. Des questions ?"], ['NYSSA', "Une seule. On mange quand ?"], ['BORIN', "..."], ['LYRA', "Je crois que je commence à l'apprécier."]]);
      else { const r = await choose('Repartir pour les <b>Collines de Granit</b> ?', [{ label: 'Partir' }, { label: 'Rester en ville' }], { cancel: true }); if (r !== 0) { await E.walk(kael, 0, 60); return; } }
      F().fin3 = 1;
      await fade(true, 900);
      await goPhase('ch4_route');
    } });

    // ----- Arrivée -----
    const retour = F().s4_retour; delete F().s4_retour;      // retour du chapitre 4 : par la Porte Sud, ou au pied du château
    const pos = F().pos || (retour === 'porte' ? { x: 0, z: 60 } : retour === 'chateau' ? { x: 0, z: -40.5, sud: 1 } : apres && !F().sorti_chateau ? { x: 0, z: -40.5, sud: 1 } : F().toits && !apres ? { x: -22, z: -40.4, ouest: 1 } : F().vol ? { x: 0, z: 2 } : { x: 0, z: 61 });
    enter(st, { x: pos.x, z: pos.z, ry: pos.sud ? 0 : pos.ouest ? -PI / 2 : PI, yaw: pos.sud ? PI : pos.ouest ? PI / 2 : 0 });
    if (tobie.userData.imported) sit(tobie);
    setObjective(apres ? "Se préparer en ville, puis quitter Solméria par la Porte Sud" : F().toits ? "Suivre la voleuse dans les égouts (quai des Lavandières, à l'ouest du canal)" : F().vol ? "Poursuivre la voleuse : grimper à l'échelle, à l'est de la place" : F().ch3_intro ? 'Trouver le capitaine Borin : aller à la place du Marché, au nord' : '');
    if (!F().ch3_intro) {
      const { kael, lyra } = P();
      E.shot([-18, 26, 104], [0, 10, 20], true);
      await chapterCard('Chapitre 3', 'La Cité Blanche');
      await fade(false, 900);
      E.shot([14, 9, 84], [0, 8, 30]);
      await talk([
        ['LYRA', "Solméria. Sept siècles qu'elle est debout. Mon maître disait qu'on voit ses tours à une journée de marche."],
        ['KAEL', "Je n'avais jamais rien vu de plus grand que le moulin de Brumeval."],
        ['LYRA', "Ferme la bouche, on dirait un paysan."],
        ['KAEL', "Je suis un paysan."],
      ]);
      E.unshot();
      F().ch3_intro = 1;
      setObjective('Trouver le capitaine Borin : aller à la place du Marché, au nord');
      hint('Première vraie ville : <b>armes</b> chez Gontran, <b>potions</b> chez Ysolde, un lit à l\'auberge. Tout est dans la rue des Artisans, juste après la porte.');
      setTimeout(() => hint(null), 12000);
      save();
    } else {
      await fade(false, 700);
      if (apres && !F().sorti_chateau) {
        F().sorti_chateau = 1;
        await talk([
          ['NYSSA', "Dix ans de cachot ou un voyage. Vous parlez d'un choix."],
          ['BORIN', "Tu marches devant, la voleuse. Là où je peux te voir."],
          ['NYSSA', "À vos ordres, capitaine."],
          ['LYRA', "Les Collines de Granit... Kael, si Aldric dit vrai, ton pendentif n'est pas un simple bijou."],
          ['KAEL', "Je sais. Faisons les provisions, et partons."],
        ]);
        hint("<b>Borin</b> encaisse les coups : sa <b>Provocation</b> force les ennemis à le viser. <b>Nyssa</b> frappe la première et vole des objets avec <b>Larcin</b>.");
        setTimeout(() => hint(null), 14000);
        save();
      }
    }
  }

  // ============================================================
  //  LES TOITS — la poursuite
  // ============================================================
  async function ch3_toits() {
    const st = buildToits(), S = st.spots;
    const ny = makeChar('nyssa'); st.actor('nyssa', ny, S.nyssa[0].x, S.nyssa[0].z, PI, false);
    let etape = 0, enFuite = false;
    const piques = ["Encore là ? Tu es têtu, mon grand !", "Attention aux planches, elles sont pourries !", "Lâche l'affaire ! C'est une babiole !", "Tu cours bien, pour un paysan !", "Bon. Là, tu commences à m'agacer."];
    watcher(st, () => {
      const { kael } = P();
      if (enFuite || etape >= S.nyssa.length - 1 || !near(kael, ny.position.x, ny.position.z, 7.5)) return;
      enFuite = true; toast('<b>NYSSA</b> — ' + piques[etape]); sfx('move');
      const n = S.nyssa[++etape];
      E.walk(ny, n.x, n.z, 10.5).then(() => { enFuite = false; E.face(ny, kael.position.x, kael.position.z); });
    });
    mobs(st, [
      { id: 'to1', x: S.mobs[0].x, z: S.mobs[0].z, enemies: ['chauve_souris'], roam: 4 },
      { id: 'to2', x: S.mobs[1].x, z: S.mobs[1].z, enemies: ['chauve_souris', 'chauve_souris'], roam: 4 },
      { id: 'to3', x: S.mobs[2].x, z: S.mobs[2].z, enemies: ['chauve_souris', 'chauve_souris'], roam: 3 },
    ], 'toits');
    chest(st, 'toits', S.coffre, PI / 2, async () => {
      const k = hero('kael'); k.ring = 'anneau_vigueur'; sfx('item');
      toast("Obtenu : <b>Anneau de vigueur</b> — Kael le passe au doigt (PV max +15)");
    }, 'Ouvrir le coffre de fer');
    reader(st, { x: 0, z: 43.4 }, "Regarder l'échelle", [['KAEL', "Pas question de redescendre. Elle a mon pendentif."]]);
    st.trigger({ x1: -6, x2: 8, z1: -28, z2: -21.5, action: async () => {
      const { kael } = P();
      E.movers.length = 0; ny.position.set(S.fin.x, 0, S.fin.z); etape = 99;
      E.face(kael, ny.position.x, ny.position.z); E.face(ny, kael.position.x, kael.position.z);
      await talk([['KAEL', "Plus de toit. Rends-le-moi !"], ['NYSSA', "Plus de toit ? *Elle sourit.* Tu n'es pas d'ici, toi."]]);
      ny.userData.pose = true;
      await tween(700, (k) => { ny.position.z = S.fin.z - k * 3.2; ny.position.y = Math.sin(k * PI) * 1.6 - k * k * 5; });
      ny.visible = false; sfx('ice');
      await talk([['LYRA', "Elle a sauté dans le canal... non. Dans la bouche d'égout, sur le quai. Regarde !"], ['KAEL', "Il y a une échelle. On descend."]]);
      F().toits = 1;
      await fade(true, 600);
      await goPhase('ch3_ville');
    } });
    enter(st, { x: S.depart.x, z: S.depart.z, ry: PI, yaw: 0 });
    setObjective('Rattraper la voleuse sur les toits');
    await fade(false, 600);
    if (!F().toits_intro) {
      F().toits_intro = 1;
      await talk([['NYSSA', "Tu m'as suivie jusqu'ici ? Mignon. Essaie de ne pas tomber !"], ['LYRA', "Kael, je déteste les hauteurs. Je tiens à ce que ce soit dit."]]);
      hint('Passe de toit en toit par les <b>planches</b>. Les chauves-souris craignent le <b>Feu</b>.');
      setTimeout(() => hint(null), 10000);
    }
  }

  // ============================================================
  //  LES ÉGOUTS — donjon, boss, arrestation
  // ============================================================
  async function ch3_egouts() {
    const st = buildEgouts(), S = st.spots;
    statue(st, S.statue);
    st.interact({ x: S.echelle.x, z: S.echelle.z, r: 2.2, label: 'Remonter en ville', action: async () => { await fade(true, 500); await goPhase('ch3_ville'); } });
    reader(st, S.graffiti, 'Lire les mots tracés à la craie', [['GRAFFITI', "« La gauche, la droite, et le cœur en dernier. — Les Rats »"], ['LYRA', "Les Rats... Une guilde de voleurs, sans doute. Retiens la phrase."]]);
    reader(st, S.planque, 'Examiner la porte de fer', [['KAEL', "Une porte de fer, sans poignée ni serrure. Trois entailles gravées à hauteur d'yeux."], ['LYRA', "Quelqu'un tient à ce qu'on n'entre pas. Pas aujourd'hui, en tout cas."]]);

    // ----- Les trois vannes : gauche, droite, centre -----
    const ORDRE = ['gauche', 'droite', 'centre'];
    let suite = [];
    const ouvrir = () => { st.remove(S.chute); S.chute.visible = false; S.chuteWall.off = true; };
    if (F().vannes) ouvrir();
    S.vannes.forEach((v, i) => {
      const obj = S.vanneObjs[i];
      st.interact({ x: v.x, z: v.z, r: 2.1, label: `Tourner la vanne (${v.nom})`, cond: () => !F().vannes && !suite.includes(v.nom), action: async () => {
        sfx('windup');
        await tween(700, (k) => { obj.userData.wheel.rotation.y = k * PI * 2; });
        suite.push(v.nom);
        if (suite[suite.length - 1] !== ORDRE[suite.length - 1]) {
          sfx('ice');
          await talk([['', "L'eau gronde dans les murs... puis les roues reviennent d'elles-mêmes à leur place."], ...(F().vanne_rate ? [] : [['LYRA', "Mauvais ordre. Il y avait une phrase à la craie, à l'entrée."]])]);
          F().vanne_rate = 1; suite = [];
        } else if (suite.length === 3) {
          sfx('save'); F().vannes = 1;
          E.shot([0, 6, -15], [0, 1.5, -24.3]);
          await tween(1300, (k) => { S.chute.scale.y = Math.max(0.01, 1 - k); S.chute.position.y = 1.8 * (1 - k); });
          ouvrir();
          await talk([['', "Le niveau baisse. La chute d'eau qui barrait la galerie nord s'est tarie."]]);
          E.unshot();
          setObjective('Suivre la galerie nord, vers le fond des égouts');
        } else toast(suite.length === 1 ? "Un déclic. L'eau change de bruit." : 'Deuxième déclic...');
      } });
    });
    st.trigger({ x1: -2.2, x2: 2.2, z1: -23.6, z2: -22.4, once: false, cond: () => !F().vannes && !F().chute_vue, action: async () => { F().chute_vue = 1; await talk([['KAEL', "Une chute d'eau barre le passage. Le courant m'emporterait."], ['LYRA', "Trois vannes dans la salle. Il doit y avoir un ordre."]]); setObjective("Tourner les trois vannes dans le bon ordre"); } });

    // ----- Monstres -----
    mobs(st, [
      { id: 'eg1', x: S.gelees[0].x, z: S.gelees[0].z, enemies: ['gelee'], roam: 3, speed: 2.4 },
      { id: 'eg2', x: S.gelees[1].x, z: S.gelees[1].z, enemies: ['gelee', 'chauve_souris'], roam: 3, speed: 2.4 },
      { id: 'eg3', x: S.rats[0].x, z: S.rats[0].z, enemies: ['rat', 'rat'], roam: 2 },
      { id: 'eg4', x: S.rats[1].x, z: S.rats[1].z, enemies: ['rat', 'chauve_souris'], roam: 2 },
      { id: 'eg5', x: S.rats[2].x, z: S.rats[2].z, enemies: ['rat', 'rat', 'gelee'], roam: 2 },
    ], 'egouts', () => (F().tuto_etat ? {} : { onStart: async (api) => {
      F().tuto_etat = 1;
      await api.msg("<b>Altérations d'état</b> — Les bêtes des égouts <b>empoisonnent</b> : le Poison ronge les PV à la fin de chaque tour.", 2600);
      await api.msg("Un <b>Antidote</b> (menu Objets) le guérit. Le poison disparaît à la fin du combat.", 2400);
    } }));
    chest(st, 'egouts', S.coffre, PI / 2, async () => { give('antidote', 3); });

    // ----- Scène 3 : la citerne, Nyssa engluée, le Roi des Égouts -----
    let ny = null;
    if (!F().roi_egouts) {
      ny = makeChar('nyssa'); st.actor('nyssa', ny, S.nyssa.x, S.nyssa.z, 0, false);
      if (ny.userData.imported) ny.userData.poseAt('Hit_Chest', 0.25);
      st.trigger({ x1: -13, x2: 13, z1: -53, z2: -47.5, cond: () => !F().roi_egouts, action: async () => {
        const { kael, lyra } = P();
        music('');
        await Promise.all([E.walk(kael, -0.8, -60.5, 5), E.walk(lyra, 1.2, -59.6, 5)]);
        E.face(kael, S.nyssa.x, S.nyssa.z); E.face(lyra, S.nyssa.x, S.nyssa.z);
        E.shot([3.4, 2.6, -60.4], [0, 1.5, -66]);
        await talk([
          ['NYSSA', "Bon. Je propose un marché. Vous me sortez de là, je vous rends la babiole."],
          ['LYRA', "Ou on récupère la babiole sur ton squelette dans une heure."],
          ['NYSSA', "Elle est charmante, ta copine."],
        ]);
        // Le monstre tombe du plafond
        const roi = makeEnemyModel('roi_egouts'); st.add(roi, S.boss.x, S.boss.z, 0, 14); roi.rotation.y = PI;
        E.shot([7, 4.5, -66], [0, 1.6, -58]);
        sfx('windup'); await tween(650, (k) => { roi.position.y = 14 * (1 - k * k); });
        sfx('crit'); music('boss');
        E.face(kael, S.boss.x, S.boss.z); E.face(lyra, S.boss.x, S.boss.z);
        await talk([['KAEL', "Lyra, feu à gauche. Toi, la voleuse, tu sais te servir de ces dagues ?"]]);
        sfx('fire'); if (lyra.userData.imported) lyra.userData.play('Spell_Simple_Shoot');
        await sleep(350); ny.userData.pose = false; if (ny.userData.draw) ny.userData.draw(true);
        await E.walk(ny, 2.6, -61.2, 7); E.face(ny, S.boss.x, S.boss.z);
        await talk([['NYSSA', "Mieux que toi de ton arme, à ce que j'ai vu."]]);
        // Nyssa combat en invitée
        if (!hero('nyssa')) { const h = makeHero('nyssa', Math.max(5, hero('kael').level)); h.weapon = 'dagues_nyssa'; h.armor = 'veste_ombre'; G.party.push(h); }
        const r = await fight(['roi_egouts'], { arena: 'citerne', story: true, canFlee: false, intro: 'Le Roi des Égouts se dresse !', onStart: async (api) => {
          await api.msg("<b>Nyssa</b> se bat à vos côtés ! Son <b>Larcin</b> vole un objet à l'ennemi ; sa <b>Flèche Rapide</b> part toujours la première.", 2800);
          await api.msg("Le Roi des Égouts est mou : les <b>armes</b> lui font moitié moins de mal. Il craint le <b>Feu</b>.", 2600);
        } });
        st.remove(roi); st.remove(ny);
        F().roi_egouts = 1;
        T.syncParty();                                   // Nyssa suit désormais l'équipe
        const { nyssa } = P();
        kael.position.set(-0.8, 0, -55); lyra.position.set(1, 0, -54.4); nyssa.position.set(2.6, 0, -56); kael.rotation.y = PI / 2; 
        E.faceEach(kael, nyssa); E.face(lyra, nyssa.position.x, nyssa.position.z);
        E.shot([0.6, 2.4, -50.5], [1, 1.4, -55.4], true);
        music('');
        await talk([
          ['NYSSA', "Ha ! Vous avez vu ça ? Il a fondu comme du beurre."],
          ['KAEL', "Le pendentif."],
          ['NYSSA', "Tout de suite les affaires... *Elle le fait sauter dans sa paume, puis le lui lance.* Tiens. Il chauffe, ton truc. C'est normal ?"],
        ]);
        give('pendentif');
        await talk([['KAEL', "*Il referme le poing dessus.* ... Oui. Parfois."]]);
        // ----- Scène 4 : l'arrestation -----
        sfx('windup');
        const borin = makeChar('borin'), g1 = makeChar('garde'), g2 = makeChar('garde');
        st.actor('borin', borin, S.sortie.x, S.sortie.z, -PI / 2, false); st.actor('ga', g1, S.sortie.x, S.sortie.z - 1.4, -PI / 2, false); st.actor('gb', g2, S.sortie.x, S.sortie.z + 1.4, -PI / 2, false);
        E.shot([-3, 3.6, -51], [5, 1.4, -56.4]);
        await talk([['', "Des bottes ferrées sur les barreaux de l'échelle. Des lanternes. La garde descend."]]);
        await Promise.all([E.walk(borin, 5.4, -55.6, 3.2), E.walk(g1, 6.6, -57.6, 3.2), E.walk(g2, 6.4, -53.6, 3.2)]);
        for (const o of [kael, lyra, nyssa]) E.face(o, borin.position.x, borin.position.z);
        E.face(borin, kael.position.x, kael.position.z);
        music('sad');
        await talk([
          ['BORIN', "Trois gamins et un monstre mort dans mes égouts. Qui parle le premier ?"],
          ['KAEL', "Capitaine Borin ? Hagen de la Vieille Garde m'envoie."],
          ['BORIN', "*Il se fige.* Hagen. Où est-il ?"],
          ['KAEL', "Mort. Avant-hier. Les soldats de Cendre."],
        ]);
        await sleep(900);
        await talk([['BORIN', "*Longtemps silencieux.* Enlevez-leur les fers. Ils viennent avec moi."], ['NYSSA', "Quels fers ? On n'a pas de... ah. Ceux-là. D'accord."]]);
        E.unshot();
        await fade(true, 900);
        await goPhase('ch3_trone');
      } });
    }

    const pos = F().pos || { x: 0, z: 7.4 };
    enter(st, { x: pos.x, z: pos.z, ry: PI, yaw: 0 });
    setObjective(F().vannes ? 'Suivre la galerie nord, vers le fond des égouts' : 'Explorer les égouts et retrouver la voleuse');
    await fade(false, 700);
    if (!F().egouts_intro) {
      F().egouts_intro = 1;
      await talk([['KAEL', "Elle ne peut pas être loin."], ['LYRA', "Des galeries de sept siècles, des rats, de l'eau verte. Ton pendentif a intérêt à valoir le détour."]]);
      save();
    }
  }

  // ============================================================
  //  LA SALLE DU TRÔNE
  // ============================================================
  async function ch3_trone() {
    const st = buildTrone(), S = st.spots;
    const up = (o, s) => { o.position.y = s.y; if (o.userData.col) o.userData.col.off = true; return o; };
    const roi = up(npc(st, 'roi', 'roi', S.roi.x, S.roi.z, 0), S.roi); sit(roi);
    const alinor = up(npc(st, 'alinor', 'alinor', S.alinor.x, S.alinor.z, -0.3), S.alinor);
    const aldric = up(npc(st, 'aldric', 'aldric', S.aldric.x, S.aldric.z, 0.3), S.aldric);
    S.gardes.forEach((g, i) => npc(st, 'gt' + i, i % 3 === 0 ? 'renaud' : 'garde', g.x, g.z, g.ry));
    S.nobles.forEach((g, i) => npc(st, 'nb' + i, i % 2 ? 'noble_f' : 'noble', g.x, g.z, g.ry));
    const borin = makeChar('borin'); st.actor('borin', borin, 1.6, -4.4, PI, false);
    enter(st, { x: 0, z: -3.4, ry: PI, yaw: 0 });
    const { kael, lyra, nyssa } = P();
    lyra.position.set(-1.4, 0, -2.6); if (nyssa) nyssa.position.set(1.4, 0, -2.2);
    for (const f of E.followers) f.userData.stay = true;
    setObjective('');
    healParty();
    E.shot([0, 9, 6], [0, 4, -26], true);
    music('cite');
    await fade(false, 1100);
    await talk([['', "Le château de Solméria. Une heure plus tard — et un seau d'eau plus tard, sur ordre du capitaine."]]);
    E.shot([4.3, 3.3, -22.6], [-0.4, 2.2, -36]);
    await Promise.all([E.walk(kael, 0, -29.6, 4.2), E.walk(lyra, -1.5, -28.6, 4.2), nyssa ? E.walk(nyssa, 1.6, -28.2, 4.2) : null, E.walk(borin, 3.2, -30.4, 4.2)]);
    for (const o of [kael, lyra, nyssa, borin]) if (o) E.face(o, 0, -39);
    await talk([
      ['BORIN', "Majesté. Ces jeunes gens viennent du nord. Brumeval est en cendres. Ysmère aussi. L'Empire a passé la frontière."],
      ['ROI ALDEMAR', "Brumeval... Un hameau de bûcherons. Et c'est pour cela qu'on interrompt mon conseil ?"],
      ['LYRA', "Mon maître, Théobald d'Ysmère, m'a confié une lettre pour le sage Aldric. Il est mort en la protégeant."],
    ]);
    // Aldric descend les marches et lit la lettre
    await Promise.all([E.walk(aldric, -1.6, -32.6, 2.2), tween(1900, (k) => { aldric.position.y = S.aldric.y * (1 - k); })]);
    aldric.position.y = 0; E.face(aldric, lyra.position.x, lyra.position.z); E.face(lyra, aldric.position.x, aldric.position.z);
    E.shot([-4.6, 2.2, -29.4], [-1.4, 1.5, -32.4]);
    await talk([['', "Aldric lit la lettre de Théobald, lentement, en faisant tourner un anneau d'argent à son doigt."]]);
    E.face(aldric, 0, -39);
    E.shot([4.3, 3.3, -24.6], [-0.4, 2.3, -37]);
    await talk([
      ['ALDRIC', "Sept Éclats, sept sanctuaires. Si l'Empire les réunit, la Couronne d'Aube renaîtra et le Dévoreur avec elle."],
      ['ROI ALDEMAR', "Des contes pour enfants."],
      ['ALDRIC', "Brumeval et Ysmère ont brûlé pour ces contes, Majesté. Il faut prendre les Éclats avant l'Empereur. Le plus proche dort sous les Collines de Granit."],
      ['PRINCESSE ALINOR', "Père, envoyez la Garde."],
      ['ROI ALDEMAR', "La Garde défend les murs. Borin, prends ces deux-là. Et la voleuse."],
      ['NYSSA', "Pardon ?"],
      ['ROI ALDEMAR', "Dix ans de cachot ou un voyage. Choisis."],
      ['NYSSA', "J'adore voyager."],
    ]);
    // Aldric s'approche de Kael
    await E.walk(aldric, kael.position.x - 1.1, kael.position.z - 0.5, 1.8);
    E.faceEach(aldric, kael);
    E.shot([kael.position.x + 2.2, 1.9, kael.position.z + 2.2], [kael.position.x - 0.6, 1.5, kael.position.z - 0.3]);
    await talk([['', "Aldric s'approche de Kael et regarde longuement le pendentif."], ['ALDRIC', "Un bien bel objet. Garde-le précieusement, mon garçon. Il te mènera loin."]]);
    E.shot([4.3, 3.3, -24.6], [-0.4, 2.3, -37]);
    await talk([
      ['PRINCESSE ALINOR', "Capitaine. Prenez ceci : le sceau de mon père. Aucune porte du royaume ne vous sera fermée."],
      ['BORIN', "Princesse."],
    ]);
    give('laissez_passer');
    await talk([
      ['BORIN', "Vous trois. Je ne sais pas ce que Hagen a vu en toi, gamin. Mais il ne se trompait pas souvent."],
      ['BORIN', "On part à l'aube. Je marche devant, je prends les coups. Vous, vous restez en vie."],
    ]);
    // L'équipe est au complet
    if (!hero('nyssa')) { const h = makeHero('nyssa', Math.max(5, hero('kael').level)); h.weapon = 'dagues_nyssa'; h.armor = 'veste_ombre'; G.party.push(h); }
    if (!hero('borin')) { const h = makeHero('borin', Math.max(6, hero('kael').level + 1)); h.weapon = 'masse_borin'; h.armor = 'armure_garde'; G.party.push(h); }
    healParty(); sfx('levelup');
    await talk([['', "Nyssa et Borin rejoignent l'équipe ! Le groupe de quatre est au complet."]]);
    F().trone = 1; delete F().pos;
    for (const f of E.followers) f.userData.stay = false;
    E.unshot();
    await fade(true, 900);
    await goPhase('ch3_ville');
  }

  return { ch3_ville, ch3_toits, ch3_egouts, ch3_trone };
}
