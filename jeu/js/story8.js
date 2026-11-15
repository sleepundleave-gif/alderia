// ============================================================
//  HISTOIRE — CHAPITRE 8 : LE TEMPLE ENGLOUTI
//  La traversée (spectres sur le pont, la nuit avec Borin), les Perles de souffle, le temple
//  (vannes et niveaux d'eau), Ondine le Léviathan, l'Éclat d'Eau, Vexia sur la mer gelée.
//  (dialogues repris du script « 01_Acte1_Chapitres_01-10.md », chapitre 8)
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { E } from './engine.js';
import { G, save, healParty } from './state.js';
import { sleep, talk, choose, toast, setObjective, hint, fade, narrate, chapterCard } from './ui.js';
import { sfx, music } from './audio.js';
import { buildPont, buildTempleEau } from './world7.js';
import { makeChar, makeEnemyModel, makeFire } from './models.js';
import { or, niveauMin } from './story5.js';

const PI = Math.PI;
const F = () => G.flags;

export function chapter8(T) {
  const { enter, goPhase, fight, give, chest, reader, statue, mobs, tween, npc } = T;
  const P = () => T.party();

  // ============================================================
  //  LA TRAVERSÉE : le pont de la Vouivre, de nuit
  // ============================================================
  async function ch8_traversee() {
    const st = buildPont('nuit'), S = st.spots;
    const morgane = npc(st, 'morgane', 'morgane', S.morgane.x, S.morgane.z, PI, 'à la capitaine Morgane', async () => {
      if (!F().t8_spectres) { await talk([['CAPITAINE MORGANE', "Bon vent, mer plate. Trop plate. Je n'aime pas ça."]]); return; }
      if (!F().t8_borin) { await talk([['CAPITAINE MORGANE', "Votre capitaine est à la proue. Il ne dort jamais, celui-là ?"]]); return; }
      const r = await choose("<b>CAPITAINE MORGANE</b> — On sera au-dessus du temple à l'aube. Vous devriez dormir.", [{ label: "Dormir jusqu'à l'aube" }, { label: 'Rester encore sur le pont' }], { cancel: true });
      if (r !== 0) return;
      await fade(true, 900); healParty();
      await narrate(["L'aube. La Vouivre a jeté l'ancre au milieu de la mer d'Émeraude.\nSous la coque, très loin, des colonnes blanches."]);
      music('cite');
      await talk([
        ['CAPITAINE MORGANE', "Des perles de souffle. Une sous la langue, et vous respirez là-dessous comme des carpes. Ne l'avalez pas."],
        ['NYSSA', "Et si on l'avale ?"], ['CAPITAINE MORGANE', "Alors vous respirez comme des carpes sur un quai."],
      ]);
      give('perle_souffle'); give('fiole_orage', 4);
      await talk([
        ['CAPITAINE MORGANE', "Et ça : des fioles d'orage. Ce qui vit en bas craint la foudre, et aucun de vous n'en lance."],
        ['LYRA', "... Non. Aucun de nous."],
      ]);
      await narrate(["Vous plongez.\nUne colonne de lumière descend de la surface jusqu'aux portes du temple. Vous la suivez."]);
      await goPhase('ch8_temple');
    });
    npc(st, 'marin', 'marin2', -2.6, 6, PI / 2, 'au matelot', async () => { await talk([['MATELOT', "On raconte que les noyés de la mer d'Émeraude remontent par nuit claire. Moi, je dis que c'est la brume."]]); });
    let borinPnj = null;
    const poserBorin = () => {
      const { borin } = P(); if (borin) { borin.visible = false; borin.userData.stay = true; borin.position.set(40, 0, 40); }
      borinPnj = makeChar('borin'); st.add(borinPnj, S.borin.x, S.borin.z, PI); st.circle(S.borin.x, S.borin.z, 0.45);
      st.interact({ x: S.borin.x, z: S.borin.z, r: 2.6, label: 'Rejoindre Borin', cond: () => !F().t8_borin, action: async () => {
        const { kael } = P();
        E.shot([2.6, 2.2, -7.4], [-0.6, 1.5, -10.6]); music('sad');
        await talk([
          ['BORIN', "Tu ne dors pas non plus."], ['KAEL', "Je pensais à Hagen."],
          ['BORIN', "Hagen et moi, on a tenu la porte de Haute-Garde à deux, une nuit entière. Il chantait faux pour énerver l'ennemi."],
          ['KAEL', "Il ne m'a jamais parlé de la Garde. Ni de ma mère."],
          ['BORIN', "Il a quitté la Garde du jour au lendemain, il y a dix ans, avec un enfant dans les bras. Il n'a jamais dit pourquoi."],
          ['BORIN', "J'avais perdu mon fils ce printemps-là. Je n'ai pas posé de questions."],
          ['KAEL', "... Je suis désolé."], ['BORIN', "Va dormir, petit. Je prends le quart."],
        ]);
        F().t8_borin = 1; E.unshot(); music(st.music);
        setObjective("Parler à la capitaine Morgane, à la barre, pour attendre l'aube"); save();
      } });
    };
    if (F().t8_spectres) poserBorin();

    enter(st, { x: 0, z: 6, ry: PI, yaw: 0 });
    if (F().t8_spectres) { const { borin } = P(); if (borin) { borin.visible = false; borin.userData.stay = true; borin.position.set(40, 0, 40); } }
    setObjective(F().t8_borin ? "Parler à la capitaine Morgane, à la barre, pour attendre l'aube" : F().t8_spectres ? 'Rejoindre Borin à la proue' : '');
    if (!F().ch8_intro) {
      await chapterCard('Chapitre 8', 'Le Temple Englouti');
      await fade(false, 700);
      F().ch8_intro = 1;
      await niveauMin(15, "Trois jours de mer. Morgane fait grimper tout le monde dans les haubans, « pour le souffle ».");
      healParty(); save();
    } else await fade(false, 600);
    if (!F().t8_spectres) {
      const { kael } = P();
      await talk([['', "La deuxième nuit. La mer est d'huile. La brume se lève d'un seul coup."], ['CAPITAINE MORGANE', "Tout le monde sur le pont ! Ce n'est pas de la brume !"]]);
      const sp = S.spectres.map((s) => { const o = makeEnemyModel('spectre'); st.add(o, s.x, s.z, 0); o.position.y = -2; return o; });
      E.shot([3, 3, 3], [0, 1.2, -7]); sfx('sleep'); music('danger');
      await tween(1400, (k) => sp.forEach((o) => { o.position.y = -2 + 2 * k; }));
      await talk([['', "Des silhouettes ruisselantes enjambent le bastingage. Des marins, morts depuis longtemps."], ['LYRA', "Des noyés. Ils sont d'<b>Ombre</b> : la lumière les blesse, le reste glisse un peu."]]);
      E.unshot();
      await fight(['spectre', 'spectre', 'spectre'], { arena: 'navire', story: true, canFlee: false, intro: 'Les spectres noyés montent à bord !' });
      for (const o of sp) st.remove(o);
      F().t8_spectres = 1; music(st.music);
      await talk([['CAPITAINE MORGANE', "Ils gardent quelque chose, là-dessous. On approche."], ['', "Borin s'éloigne vers la proue, sans un mot."]]);
      poserBorin();
      setObjective('Rejoindre Borin à la proue'); save();
    }
  }

  // ============================================================
  //  LE TEMPLE ENGLOUTI
  // ============================================================
  async function ch8_temple() {
    const st = buildTempleEau(), S = st.spots;
    statue(st, S.statue);
    mobs(st, S.mobs, 'temple_eau');
    chest(st, 'tem_a', S.coffres[0], PI / 2, async () => { give('fiole_orage', 3); give('potion_plus', 2); });
    chest(st, 'tem_b', S.coffres[1], -PI / 2, async () => { give('ether', 3); or(600); });
    reader(st, S.stele, 'Lire la stèle', [['STÈLE', "« Qui remplit sans fermer nourrit le courant. Ferme l'écluse du couchant, puis ouvre la source du levant. »"]]);

    // ----- Les vannes -----
    const tourner = async (v) => { sfx('move'); await tween(600, (k) => { v.obj.userData.wheel.rotation.y = k * PI * 1.5; }); };
    const vider1 = (k) => { S.eau1.position.y = 0.5 - k * 0.6; S.eau1.material.opacity = 0.72 * (1 - k); };
    const remplir2 = (k) => { S.eau2.visible = true; S.eau2.position.y = -0.4 + k * 0.5; S.dalles.visible = k > 0.6; S.dalles.position.y = -0.2 + 0.2 * k; };
    if (F().t8_v1) { vider1(1); S.eau1.visible = false; S.mur1.off = true; }
    if (F().t8_v3) { remplir2(1); S.mur2.off = true; }
    st.interact({ x: S.vannes[0].x, z: S.vannes[0].z, r: 2.4, label: 'Tourner la vanne', cond: () => !F().t8_v1, action: async () => {
      await tourner(S.vannes[0]); E.shot([6, 4.4, -16], [0, 0, -26]); sfx('whoosh');
      await tween(1500, vider1); S.eau1.visible = false; S.mur1.off = true; F().t8_v1 = 1;
      await talk([['', "L'eau du bassin s'engouffre dans une bouche de pierre. Le fond apparaît : on peut traverser à pied sec."]]);
      E.unshot(); save();
    } });
    st.interact({ x: S.vannes[1].x, z: S.vannes[1].z, r: 2.4, label: "Fermer l'écluse (couchant)", cond: () => !F().t8_v2, action: async () => {
      await tourner(S.vannes[1]); sfx('quake'); F().t8_v2 = 1;
      await talk([['', "Quelque part sous les dalles, une lourde porte de pierre se referme. Le courant se tait."]]); save();
    } });
    st.interact({ x: S.vannes[2].x, z: S.vannes[2].z, r: 2.4, label: 'Ouvrir la source (levant)', cond: () => !F().t8_v3, action: async () => {
      const { kael } = P();
      await tourner(S.vannes[2]);
      if (!F().t8_v2) {
        // mauvais ordre : le courant emporte l'équipe
        sfx('whoosh'); E.shot([0, 6, -40], [0, 0, -54]); remplir2(0.3);
        await talk([['', "L'eau jaillit dans la fosse... et repart aussitôt par l'écluse ouverte. Le courant enfle, déborde, vous arrache du sol !"]]);
        await fade(true, 500); S.eau2.visible = false; S.dalles.visible = false; S.vannes[2].obj.userData.wheel.rotation.y = 0;
        kael.position.set(0, 0, -17); E.followers.forEach((f, i) => f.position.set((i - 1) * 0.9, 0, -15.8)); E.unshot(true);
        for (const h of G.party) h.hp = Math.max(1, h.hp - 15);
        await fade(false, 500);
        await talk([['NYSSA', "Pff... J'ai avalé la moitié de la mer."], ['LYRA', "La stèle, près des vannes. « Ferme l'écluse du couchant, puis ouvre la source du levant. » L'ordre compte."]]);
        return;
      }
      E.shot([6, 4.4, -44], [0, 0, -54]); sfx('whoosh');
      await tween(1700, remplir2); S.mur2.off = true; F().t8_v3 = 1;
      await talk([['', "La fosse se remplit jusqu'au bord. De larges dalles claires remontent du fond et flottent : un gué."]]);
      E.unshot(); setObjective("Traverser le gué jusqu'à la salle du fond"); save();
    } });

    // ----- Ondine -----
    let ondine = null;
    if (!F().t8_ondine) {
      ondine = makeEnemyModel('ondine'); st.add(ondine, S.ondine.x, S.ondine.z, 0);
      st.trigger({ x1: -14, x2: 14, z1: S.seuil - 3, z2: S.seuil, once: true, cond: () => !F().t8_ondine, action: async () => {
        const { kael } = P();
        await E.walk(kael, 0, -80.6, 2.6); E.face(kael, 0, -88);
        E.shot([6.5, 2.6, -78], [0, 3, -88]); music('');
        await talk([
          ['', "Au-dessus d'un bassin rond, un serpent de mer aux ailes de nageoires ondule lentement. Sa voix est une marée."],
          ['ONDINE', "La mer a gardé ce secret mille ans. Elle se souvient du prix payé. Et toi, enfant de la Lumière, le connais-tu ?"],
          ['KAEL', "Quel prix ?"], ['ONDINE', "Celui qu'on a effacé de vos chansons."],
        ]);
        E.unshot();
        await fight(['ondine'], { arena: 'abysse', story: true, canFlee: false, music: 'boss', intro: 'Ondine, le Léviathan, déploie ses anneaux !', onStart: async (api) => {
          await api.msg("Ondine est d'<b>Eau</b> : le feu et le givre de Lyra ne lui font presque rien.", 2600);
          await api.msg("Elle craint la <b>Foudre</b> : lancez les <b>Fioles d'orage</b> (menu Objets). N'importe qui peut le faire.", 3000);
        } });
        F().t8_ondine = 1;
        E.shot([4.5, 2.2, -81], [0, 1.4, -88]);
        ondine.userData.pose = true; sfx('vanish');
        await tween(1500, (k) => { ondine.scale.setScalar(1 - k * 0.9); ondine.position.y = -k * 1.2; });
        st.remove(ondine);
        await talk([['ONDINE', "Tu ne sais pas... et tu avances quand même. Prends. Et demande-toi qui a écrit vos chansons."], ['', "Le léviathan se dissout dans le bassin. L'eau redevient lisse."]]);
        E.unshot(); music(st.music); setObjective("Prendre l'Éclat d'Eau sur l'autel"); save();
      } });
    }
    if (F().t8_eclat) st.remove(S.eclatObj);
    st.interact({ x: S.autel.x, z: S.autel.z + 1.6, r: 2.8, label: "Prendre l'Éclat d'Eau", cond: () => !!F().t8_ondine && !F().t8_eclat, action: async () => {
      E.shot([3.6, 2.6, -89.6], [0, 2.2, -95.6]); music('');
      await talk([['', "Une goutte de lumière bleue flotte au-dessus de l'autel. Elle est fraîche dans la main de Kael."]]);
      sfx('levelup'); await tween(1000, (k) => { S.eclatObj.scale.setScalar(1 - 0.8 * k); S.eclatObj.position.z = -95.6 + 1.6 * k; });
      st.remove(S.eclatObj); give('eclat_eau'); F().t8_eclat = 1;
      await talk([
        ['', "Le pendentif devient froid. Kael voit sept silhouettes debout dans la mer jusqu'à la taille. L'une d'elles pleure. Puis plus rien."],
        ['NYSSA', "Trois. On en a trois. Je commence à croire qu'on va y arriver."], ['BORIN', "Ne dis pas ça. On remonte."],
      ]);
      healParty(); E.unshot();
      await fade(true, 900);
      await narrate(["Vous remontez le long de la colonne de lumière.\nMais la lumière a changé. Elle est blanche. Et la surface... ne bouge plus."]);
      await goPhase('ch8_glace');
    } });

    // ----- Arrivée -----
    const pos = F().pos || { x: 0, z: 4.6 };
    enter(st, { x: pos.x, z: pos.z, ry: PI, yaw: 0 });
    setObjective(F().t8_ondine ? "Prendre l'Éclat d'Eau sur l'autel" : F().t8_v3 ? "Traverser le gué jusqu'à la salle du fond" : 'Trouver comment franchir les bassins du temple');
    await fade(false, 600);
    if (!F().t8_intro) {
      F().t8_intro = 1;
      await talk([['LYRA', "On respire. Sous la mer. Maître Théobald n'aurait jamais voulu me croire."], ['BORIN', "Des bassins, des vannes. Lisez tout ce qui est gravé avant de tourner quoi que ce soit."]]);
      hint("Les créatures d'<b>Eau</b> craignent la <b>Foudre</b> : <b>Fioles d'orage</b>. Les <b>spectres</b> sont d'Ombre.");
      setTimeout(() => hint(null), 9000);
    }
  }

  // ============================================================
  //  LA MER GELÉE : Vexia
  // ============================================================
  async function ch8_glace() {
    const st = buildPont('glace'), S = st.spots;
    const morgane = npc(st, 'morgane', 'morgane', 1.4, 3, PI / 2);
    const vexia = makeChar('vexia'); st.add(vexia, 30, -3, -PI / 2); vexia.position.y = S.vexia.y;
    enter(st, { x: 0, z: 0, ry: PI / 2, yaw: -PI / 2 });
    const { kael, lyra, nyssa, borin } = P();
    lyra.position.set(2.6, 0, -1.6); if (nyssa) nyssa.position.set(-0.6, 0, 1.4); if (borin) borin.position.set(0.4, 0, -2.2);
    for (const f of E.followers) { f.userData.stay = true; f.rotation.y = PI / 2; }
    setObjective(''); music('');
    E.shot([-3.4, 4.4, 4.5], [10, -0.6, -3], true);
    await fade(false, 900);
    await talk([['', "La mer est prise par la glace, à perte de vue. La Vouivre craque, serrée comme dans un poing."], ['CAPITAINE MORGANE', "En plein été. Ce n'est pas un temps de ce monde."]]);
    music('danger');
    await E.walk(vexia, S.vexia.x, S.vexia.z, 3.2); vexia.position.y = S.vexia.y;
    E.shot([3.4, 2.6, 1.6], [S.vexia.x, -0.8, S.vexia.z]);
    await talk([
      ['', "Une femme en robe blanche marche sur la glace, sans se presser. Le givre fleurit sous ses pas."],
      ['VEXIA', "La petite dernière de Théobald. Tu as encore de la suie sur les doigts."],
      ['LYRA', "Vexia. C'est toi qui as ouvert les portes de l'Académie."],
      ['VEXIA', "J'ai ouvert une bibliothèque qu'un vieillard gardait fermée. Il aurait pu me donner le livre. Il a préféré mourir."],
      ['VEXIA', "Et toi, ta foudre, tu la retrouves ? Non ? Dommage. C'était ton seul talent."],
    ]);
    E.face(lyra, S.vexia.x, S.vexia.z);
    if (lyra.userData.imported) lyra.userData.play('Spell_Simple_Shoot', { speed: 0.8 });
    const boule = makeFire(1.2, false); st.add(boule, lyra.position.x, lyra.position.z, 0, 1.4); sfx('fire');
    await tween(700, (k) => { boule.position.set(lyra.position.x + (S.vexia.x - 1.5 - lyra.position.x) * k, 1.4 - 2.6 * k, lyra.position.z + (S.vexia.z - lyra.position.z) * k); });
    sfx('ice'); await tween(300, (k) => boule.scale.setScalar(1 - k)); st.remove(boule);
    await talk([['', "Lyra lance tout son feu. Vexia lève deux doigts : la flamme gèle en plein vol et tombe en poussière."], ['CAPITAINE MORGANE', "Canonniers ! Dans la glace, pas sur elle ! FEU !"]]);
    sfx('explosion'); await sleep(250); sfx('explosion'); await tween(700, (k) => { E.camera.position.y += Math.sin(k * 50) * 0.04; }); sfx('shatter');
    await talk([
      ['', "Les boulets crèvent la banquise. De longues fissures courent vers la coque : la Vouivre se libère."],
      ['VEXIA', "Gardez votre Éclat. Pendant que vous ramassiez des coquillages, Darian a passé la frontière avec vingt mille hommes."],
      ['VEXIA', "Courez, les enfants. Votre ville blanche va devenir grise."],
    ]);
    sfx('vanish'); await tween(900, (k) => { vexia.scale.setScalar(1 - k); }); st.remove(vexia);
    E.shot([3.4, 2.4, 3], [0.6, 1.4, -1]);
    await talk([
      ['BORIN', "Vingt mille. ... Capitaine. Combien de temps jusqu'à la côte la plus proche de Solméria ?"],
      ['CAPITAINE MORGANE', "Six jours. Quatre si je casse quelque chose."], ['BORIN', "Cassez."],
      ['LYRA', "Elle a dit « ta foudre ». Kael... je ne t'ai jamais dit que je lançais la foudre, avant."], ['KAEL', "Tu me le diras quand tu voudras."],
    ]);
    F().ch8_fin = 1;
    for (const f of E.followers) f.userData.stay = false;
    E.unshot(); healParty();
    await fade(true, 900);
    music('title');
    await chapterCard('Fin du chapitre 8', 'À suivre : Chapitre 9 — Le Siège de Solméria');
    await goPhase('ch9_plaine');
  }

  return { ch8_traversee, ch8_temple, ch8_glace };
}
