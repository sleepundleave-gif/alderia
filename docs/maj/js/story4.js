// ============================================================
//  HISTOIRE — CHAPITRE 4 : LE SANCTUAIRE DE LA TERRE
//  Les Collines de Granit, la porte aux sept symboles, le donjon (blocs, dalles, braseros),
//  les éclaireurs impériaux, le Golem Gardien, l'Éclat de Terre, le retour devant le roi.
//  (dialogues repris du script « 01_Acte1_Chapitres_01-10.md », chapitre 4)
//  T : outils communs prêtés par story.js (combats, coffres, personnages, sauvegarde…)
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { E } from './engine.js';
import { G, save, healParty, hero, addItem, gainXP, xpForNext } from './state.js';
import { EQUIP } from './data.js';
import { sleep, talk, choose, toast, setObjective, updateGold, hint, fade, narrate, chapterCard } from './ui.js';
import { sfx, music } from './audio.js';
import { buildCollines, buildSanctuaire } from './world4.js';
import { buildTrone } from './world3.js';
import { makeChar, makeEnemyModel, makeFire, box } from './models.js';

const PI = Math.PI;
const F = () => G.flags;
const NOMS = { kael: 'Kael', lyra: 'Lyra', nyssa: 'Nyssa', borin: 'Borin' };
const or = (n) => { G.gold += n; updateGold(); sfx('item'); toast(`Obtenu : <b>${n} pièces d'or</b>`); };
const equipement = (id) => { addItem(id); sfx('item'); toast(`Obtenu : <b>${EQUIP[id].name}</b>`); };

export function chapter4(T) {
  const { enter, goPhase, fight, give, chest, reader, statue, mobs, tween, npc } = T;
  const P = () => T.party();

  // ============================================================
  //  LES COLLINES DE GRANIT
  // ============================================================
  async function ch4_route() {
    const st = buildCollines(), S = st.spots;
    statue(st, S.statue);
    reader(st, S.borne, 'Lire la borne', [['BORNE', "« Collines de Granit. Sanctuaire des Anciens : une demi-journée au nord. Les pierres bougent : ne dormez pas contre elles. »"]]);
    mobs(st, S.mobs, 'collines');
    chest(st, 'col_camp', S.coffreCamp, PI / 2, async () => { give('tente'); give('potion', 2); });
    chest(st, 'col_cache', S.coffreCache, -PI / 2, async () => { give('ether', 2); or(150); });
    // le bivouac : repos, et une scène autour du feu la première fois
    st.interact({ x: S.camp.x, z: S.camp.z, r: 2.6, label: 'Se reposer au bivouac', action: async () => {
      await fade(true, 500); healParty(); sfx('heal'); await sleep(400); await fade(false, 500);
      if (!F().s4_camp) {
        F().s4_camp = 1;
        await talk([
          ['NYSSA', "Capitaine. Tu dors avec ton armure ?"], ['BORIN', "Je dors quand la relève arrive. Elle n'arrive plus depuis vingt ans."],
          ['LYRA', "Kael, ton pendentif. Il brille un peu, non ? Depuis qu'on voit ces collines."], ['KAEL', "Il est tiède. Comme le soir où Brumeval a brûlé."],
          ['BORIN', "Alors on est sur la bonne route. Dormez. Je prends le premier quart."],
        ]);
      }
      toast('PV et PM restaurés.'); save();
    } });
    // retour vers Solméria par le sud
    st.trigger({ x1: -8, x2: 8, z1: 11.6, z2: 16, once: false, action: async () => {
      const { kael } = P();
      const r = await choose('Reprendre la route de <b>Solméria</b> ?', [{ label: 'Rentrer à Solméria' }, { label: 'Rester dans les collines' }], { cancel: true });
      if (r !== 0) { await E.walk(kael, 0, 9); return; }
      await fade(true, 600); F().s4_retour = 'porte'; await goPhase('ch3_ville');
    } });
    // ----- La porte aux sept symboles -----
    const ouvrirPorte = () => { S.porteObj.visible = false; st.remove(S.porteObj); };
    if (F().s4_porte) {
      ouvrirPorte();
      st.interact({ x: S.porte.x, z: S.porte.z - 1.4, r: 2.6, label: 'Entrer dans le sanctuaire', action: async () => { await fade(true, 500); F().s4_ou = 'entree'; await goPhase('ch4_sanctuaire'); } });
    } else {
      st.interact({ x: S.porte.x, z: S.porte.z, r: 3, label: 'Examiner la porte', cond: () => !F().s4_porte, action: async () => {
        const { kael, lyra, nyssa, borin } = P();
        E.shot([5.5, 3.2, -102.5], [0, 3.4, -113]);
        await talk([
          ['BORIN', "Pas de serrure. Pas de gonds. Une dalle de dix pieds, posée là par des gens qui ne voulaient pas de visiteurs."],
          ['NYSSA', "Sept symboles. J'ai ouvert des coffres à sept goupilles, mais là... il n'y a rien à crocheter."],
          ['LYRA', "Terre, Feu, Eau, Vent, Foudre, Lumière, Ombre. Les sept éléments. Kael... ton pendentif !"],
        ]);
        music('');
        for (const m of S.symboles) { m.material.color.set(m.userData.couleur); sfx('move'); await sleep(260); }
        S.cercle.material.color.set(0xfff4c2); sfx('levelup');
        await talk([['', "Le pendentif brûle contre la poitrine de Kael. Un à un, les sept symboles s'allument."], ['KAEL', "Je n'ai rien fait. Je me suis juste approché."]]);
        sfx('windup');
        await tween(2200, (k) => { S.porteObj.position.y = -7.4 * k; S.porteObj.position.x = Math.sin(k * 90) * 0.03; });
        F().s4_porte = 1; ouvrirPorte();
        await talk([['NYSSA', "Bon. Je retire ce que j'ai dit sur les cailloux magiques."], ['BORIN', "Personne ne touche à rien. Je passe devant."]]);
        E.unshot();
        await fade(true, 600); F().s4_ou = 'entree'; await goPhase('ch4_sanctuaire');
      } });
    }
    // ----- Arrivée -----
    const pos = F().pos || (F().s4_ou === 'porte' ? { x: 0, z: -107, nord: 0 } : { x: 0, z: 8.5, nord: 1 });
    enter(st, { x: pos.x, z: pos.z, ry: pos.nord === 0 ? 0 : PI, yaw: pos.nord === 0 ? PI : 0 });
    delete F().s4_ou;
    setObjective(F().s4_eclat ? 'Rentrer à Solméria, au sud' : 'Trouver le sanctuaire, au nord des collines');
    if (!F().ch4_intro) {
      await chapterCard('Chapitre 4', 'Le Sanctuaire de la Terre');
      await fade(false, 700);
      F().ch4_intro = 1;
      await talk([
        ['NYSSA', "Donc on cherche un caillou magique dans une grotte, pour un roi qui ne croit pas aux cailloux magiques."],
        ['BORIN', "On obéit à un ordre. C'est plus simple que de réfléchir, tu devrais essayer."],
        ['NYSSA', "Et toi, le gamin ? Pourquoi tu marches ?"],
        ['KAEL', "Parce que les gens qui ont tué Hagen veulent ce caillou. Ça me suffit."],
      ]);
      // Trois jours de marche : Borin a fait travailler tout le monde. Personne n'aborde le sanctuaire sous le niveau 7.
      const gagne = [];
      for (const h of G.party) { let n = 0; while (h.level < 7) { gainXP(h, xpForNext(h.level) - h.xp); n++; } if (n) gagne.push(NOMS[h.id] + ' : niveau ' + h.level); }
      if (gagne.length) {
        sfx('levelup');
        await talk([['', "Trois jours de marche. Chaque soir, Borin a fait s'entraîner tout le monde, sans exception.\n" + gagne.join(' · ')], ['NYSSA', "Regardez ça. <b>Rafale</b> : une lame de vent. Les bêtes de pierre vont détester."]]);
      }
      hint("Les créatures de <b>Terre</b> craignent le <b>Vent</b> : la <b>Rafale</b> de Nyssa.");
      setTimeout(() => hint(null), 10000);
      save();
    } else await fade(false, 600);
  }

  // ============================================================
  //  LE SANCTUAIRE DE LA TERRE
  // ============================================================
  async function ch4_sanctuaire() {
    const st = buildSanctuaire(), S = st.spots;
    statue(st, S.statue);
    st.interact({ x: S.sortie.x, z: S.sortie.z, r: 2.2, label: 'Sortir du sanctuaire', action: async () => { await fade(true, 500); F().s4_ou = 'porte'; await goPhase('ch4_route'); } });
    reader(st, S.fresque, 'Regarder la fresque', [
      ['FRESQUE', "Sept silhouettes debout autour d'une couronne. Sous la première : une montagne."],
      ['LYRA', "« Aux Sept, la garde. À la Terre, la patience. » C'est du vieil aldérien. Maître Aldric m'a forcée à l'apprendre."],
    ]);
    mobs(st, S.mobs, 'sanctuaire');
    const ouvrir = async (porte, vite) => {
      porte.ouverte = true; porte.mur.off = true;
      if (vite) { st.remove(porte.obj); porte.obj.visible = false; return; }
      sfx('windup'); await tween(1500, (k) => { porte.obj.position.y = -5.2 * k; porte.obj.position.x = Math.sin(k * 70) * 0.03; }); st.remove(porte.obj); porte.obj.visible = false;
    };

    // ---------- Salle 1 : les blocs ----------
    const LIM = { x1: -6, x2: 6, z1: -14, z2: -4 };
    const blocs = S.blocsDepart.map((d, i) => {
      const g = new THREE.Group(); g.add(box(1.7, 1.7, 1.7, 0x8a7a62, 0, 0.85, 0)); g.add(box(1.76, 0.2, 1.76, 0x6a5c48, 0, 1.7, 0)); g.add(box(1.0, 0.1, 0.06, 0xffb040, 0, 1.0, 0.86)); g.add(box(0.06, 0.1, 1.0, 0xffb040, 0.86, 1.0, 0)); g.add(box(1.0, 0.1, 0.06, 0xffb040, 0, 1.0, -0.86)); g.add(box(0.06, 0.1, 1.0, 0xffb040, -0.86, 1.0, 0));
      const p = F().s4_blocs ? S.cibles[i] : d; st.add(g, p.x, p.z);
      const b = { g, x: p.x, z: p.z, mur: st.wall(p.x - 0.85, p.z - 0.85, p.x + 0.85, p.z + 0.85) };
      return b;
    });
    const poserMur = (b) => { b.mur.x1 = b.x - 0.85; b.mur.x2 = b.x + 0.85; b.mur.z1 = b.z - 0.85; b.mur.z2 = b.z + 0.85; };
    const resolu = () => S.cibles.every(c => blocs.some(b => b.x === c.x && b.z === c.z));
    if (F().s4_blocs) ouvrir(S.porte1, true);
    for (const b of blocs) {
      st.interact({ obj: b.g, r: 2.3, label: 'Pousser le bloc', turn: false, cond: () => !F().s4_blocs, action: async () => {
        const { kael } = P(), dx = b.x - kael.position.x, dz = b.z - kael.position.z;
        const dir = Math.abs(dx) > Math.abs(dz) ? [Math.sign(dx), 0] : [0, Math.sign(dz)], nx = b.x + dir[0] * 2, nz = b.z + dir[1] * 2;
        const libre = nx >= LIM.x1 && nx <= LIM.x2 && nz >= LIM.z1 && nz <= LIM.z2 && !S.piliers.some(p => Math.abs(p.x - nx) < 1.8 && Math.abs(p.z - nz) < 1.8) && !blocs.some(o => o !== b && o.x === nx && o.z === nz);
        E.face(kael, b.x, b.z);
        if (!libre) { sfx('hit'); await tween(160, (k) => { b.g.position.x = b.x + dir[0] * Math.sin(k * PI) * 0.08; b.g.position.z = b.z + dir[1] * Math.sin(k * PI) * 0.08; }); toast('Le bloc ne peut pas aller plus loin de ce côté.'); return; }
        sfx('move'); if (kael.userData.imported) kael.userData.play('Interact', { speed: 1.4 });
        const x0 = b.x, z0 = b.z; b.mur.off = true;
        await tween(380, (k) => { b.g.position.x = x0 + (nx - x0) * k; b.g.position.z = z0 + (nz - z0) * k; });
        b.x = nx; b.z = nz; poserMur(b); b.mur.off = false;
        if (resolu()) {
          F().s4_blocs = 1; sfx('levelup');
          await talk([['', 'Les deux blocs s\'enfoncent d\'un pouce. Quelque part, un contrepoids tombe.']]);
          await ouvrir(S.porte1);
          await talk([['BORIN', "Une porte qui s'ouvre quand on range. Ma caserne devrait prendre exemple."]]);
          save();
        }
      } });
    }
    st.interact({ x: S.rune.x, z: S.rune.z, r: 2, label: 'Toucher la rune (remettre les blocs en place)', cond: () => !F().s4_blocs, action: async () => {
      sfx('ice'); blocs.forEach((b, i) => { const d = S.blocsDepart[i]; b.x = d.x; b.z = d.z; b.g.position.set(d.x, 0, d.z); poserMur(b); });
      toast('Les blocs reprennent leur place.');
    } });
    st.trigger({ x1: -2, x2: 2, z1: -2.5, z2: -0.5, once: true, cond: () => !F().s4_blocs && !F().s4_tuto1, action: async () => {
      F().s4_tuto1 = 1;
      await talk([['LYRA', "Deux blocs, deux dalles gravées d'une croix. Je crois qu'on nous demande de faire le ménage."], ['NYSSA', "Poussez, les costauds. Moi je supervise."]]);
      hint('Place-toi <b>derrière</b> un bloc et pousse-le. Bloqué ? La <b>rune</b> du mur sud remet tout en place.'); setTimeout(() => hint(null), 11000);
    } });

    // ---------- Salle 2 : les dalles de pression ----------
    const tenue = [null, null, null];                    // qui tient chaque dalle
    const libres = () => { const { lyra, nyssa, borin } = P(); return [['borin', borin], ['nyssa', nyssa], ['lyra', lyra]].filter(([id, o]) => o && hero(id) && !tenue.some(t => t && t.id === id)); };
    const allume = (i, on) => { S.dalleObjs[i].material.emissive.set(on ? 0xb06a10 : 0x000000); S.dalleObjs[i].position.y = on ? 0.02 : 0.07; };
    if (F().s4_dalles) { ouvrir(S.porte2, true); S.levierObj.userData.manche.rotation.z = -0.6; }
    reader(st, S.plaque2, 'Lire la plaque', [['PLAQUE', "« Trois portent le poids. Un seul passe. Qui passe délivre ceux qui portent. »"], ['BORIN', "Trois dalles, trois d'entre nous. Le quatrième passe et cherche de quoi bloquer la porte. Simple."]]);
    S.dalles.forEach((d, i) => {
      st.interact({ x: d.x, z: d.z, r: 1.9, label: 'Faire tenir cette dalle par un compagnon', cond: () => !F().s4_dalles && !tenue[i] && libres().length > 0, action: async () => {
        const [id, o] = libres()[0];
        await talk([[NOMS[id].toUpperCase(), id === 'borin' ? "Je ne bouge plus. C'est ce que je fais de mieux." : id === 'nyssa' ? "Rester immobile sur un piège. Tout ce que j'aime." : "D'accord. Mais ne traîne pas, Kael."]]);
        o.userData.stay = true; await E.walk(o, d.x, d.z, 3.4); o.rotation.y = 0;
        tenue[i] = { id, o }; allume(i, true); sfx('move');
        if (tenue.every(Boolean) && !S.porte2.ouverte) {
          await ouvrir(S.porte2);
          await talk([['LYRA', "Elle s'ouvre ! Vas-y, Kael. Il doit y avoir un mécanisme de l'autre côté."]]);
          setObjective('Passer la porte seul et bloquer le mécanisme');
        }
      } });
    });
    st.interact({ x: S.levier.x, z: S.levier.z, r: 2, label: 'Abaisser le levier', cond: () => !F().s4_dalles && S.porte2.ouverte, action: async () => {
      sfx('chest'); await tween(400, (k) => { S.levierObj.userData.manche.rotation.z = 0.6 - 1.2 * k; });
      F().s4_dalles = 1; sfx('levelup');
      for (const t of tenue) if (t) t.o.userData.stay = false;
      S.dalleObjs.forEach((m, i) => allume(i, false));
      await talk([['', "Un verrou de pierre tombe dans la porte. Elle ne se refermera plus."], ['NYSSA', "On peut bouger ? Parce que j'ai une crampe héroïque."]]);
      setObjective('Traverser le sanctuaire'); save();
    } });

    // ---------- Salle 3 : les braseros et le pont ----------
    const ORDRE = ['etoile', 'lune', 'soleil', 'montagne'];
    let suite = [], feux = [];
    const pont = (on) => { S.pont.visible = on; S.gouffreMurs[2].off = on; };
    const flamme = (i) => { const f = makeFire(0.6, true); st.add(f, S.braseros[i].x, S.braseros[i].z, 0, 1.2); feux[i] = f; };
    pont(!!F().s4_pont);
    if (F().s4_pont) S.braseros.forEach((b, i) => flamme(i));
    reader(st, S.plaque3, 'Lire la stèle', [['STÈLE', "« L'étoile ouvre la nuit. La lune la suit. Le soleil les chasse. La montagne demeure. »"], ['LYRA', "Quatre braseros, quatre signes sur leurs socles. Laisse-moi faire : le feu, c'est mon rayon."]]);
    S.braseros.forEach((b, i) => {
      st.interact({ x: b.x, z: b.z, r: 2.1, label: 'Demander à Lyra d\'allumer le brasero : ' + b.label, cond: () => !F().s4_pont && !feux[i], action: async () => {
        const { lyra } = P();
        if (lyra.userData.imported) lyra.userData.play('Spell_Simple_Shoot'); E.face(lyra, b.x, b.z);
        await sleep(300); sfx('fire'); flamme(i); suite.push(b.nom);
        if (suite.some((n, k) => n !== ORDRE[k])) {
          await sleep(500); sfx('ice');
          for (const f of feux) if (f) st.remove(f); feux = []; suite = [];
          await talk([['', "Un souffle froid monte du gouffre. Toutes les flammes s'éteignent."], ['LYRA', "Mauvais ordre. La stèle, près de l'entrée : relisons-la."]]);
        } else if (suite.length === 4) {
          F().s4_pont = 1; music(''); sfx('levelup'); await sleep(300);
          E.shot([6.5, 4.5, -42.5], [0, 0.5, -50]);
          pont(true); S.pont.scale.z = 0.01; await tween(1400, (k) => { S.pont.scale.z = Math.max(0.01, k); });
          await talk([['', "Quatre flammes. Au-dessus du vide, la lumière se tisse en un pont."], ['NYSSA', "Je passe en dernier. Si ça tient sous Borin, ça tient sous tout le monde."], ['BORIN', "..."]]);
          E.unshot(); music(st.music); save();
        }
      } });
    });
    chest(st, 'san_dalles', S.coffreDalles, PI / 2, async () => { equipement('dague_silex'); const n = hero('nyssa'); if (n && n.weapon === 'dagues_nyssa') { n.weapon = 'dague_silex'; G.inv.dague_silex--; if (!G.inv.dague_silex) delete G.inv.dague_silex; addItem('dagues_nyssa'); toast('Nyssa s\'équipe des <b>Dagues de silex</b>.'); } });
    chest(st, 'san_braseros', S.coffreBraseros, PI / 2, async () => { give('ether', 2); give('potion', 2); });

    // ---------- Antichambre : les éclaireurs impériaux ----------
    let ecl = [];
    if (!F().s4_ecl) {
      ecl = S.eclaireurs.map((p, i) => { const o = makeChar('soldat'); st.actor('ecl' + i, o, p.x, p.z, PI, false); return o; });
      st.trigger({ x1: -6, x2: 6, z1: -64.5, z2: -62.5, once: true, cond: () => !F().s4_ecl, action: async () => {
        const { kael } = P();
        for (const o of ecl) E.face(o, kael.position.x, kael.position.z);
        E.shot([4.6, 2.6, -62.2], [0, 1.4, -68.5]);
        music('danger');
        await talk([
          ['BORIN', "Des uniformes de l'Empire. Ils étaient là avant nous."], ['LYRA', "Alors le vieux sage avait raison. Ça me contrarie."],
          ['ÉCLAIREUR', "Des gamins et un garde de Solméria. Le Commandeur voulait la salle intacte. Il n'a rien dit des témoins."],
        ]);
        E.unshot();
        await fight(['eclaireur', 'eclaireur', 'eclaireur'], { arena: 'sanctuaire', story: true, canFlee: false, intro: 'Les éclaireurs impériaux dégainent !' });
        for (const o of ecl) st.remove(o); F().s4_ecl = 1; music(st.music);
        await talk([['NYSSA', "Ils ont creusé un tunnel jusqu'ici. Des semaines de travail. L'Empire veut vraiment ce caillou."], ['BORIN', "Alors on le prend avant leur relève."]]);
        setObjective('Entrer dans la salle du Gardien'); save();
      } });
    }

    // ---------- Salle du Gardien ----------
    if (!F().s4_golem) {
      const golem = makeEnemyModel('golem'); st.add(golem, S.golem.x, S.golem.z, 0); const col = st.circle(S.golem.x, S.golem.z, 2.4);
      golem.userData.pose = true; golem.userData.P.head.rotation.x = 0.5;
      st.trigger({ x1: -13, x2: 13, z1: S.seuil - 3, z2: S.seuil, once: true, cond: () => !F().s4_golem, action: async () => {
        const { kael, lyra, nyssa, borin } = P();
        await E.walk(kael, 0, -78.5, 2.4); E.face(kael, 0, -85);
        E.shot([5.5, 2.2, -75.5], [0, 2.8, -85]);
        music(''); await sleep(500); sfx('windup');
        await tween(1300, (k) => { golem.userData.P.head.rotation.x = 0.5 * (1 - k); });
        golem.userData.pose = false;
        await talk([
          ['', "La statue colossale ouvre les yeux. Sa voix résonne dans la tête de Kael, et de lui seul."],
          ['GOLEM GARDIEN', "Porteur de Lumière. Pourquoi veux-tu réunir ce qui fut séparé ?"],
          ['KAEL', "Pour empêcher l'Empire de le faire."],
          ['GOLEM GARDIEN', "Les Sept ont brisé. Tu rassembles. Prouve que ta main est plus sûre que la leur."],
        ]);
        E.unshot();
        await fight(['golem'], { arena: 'gardien', story: true, canFlee: false, music: 'boss', intro: 'Le Golem Gardien se dresse !', onStart: async (api) => {
          await api.msg("Le Golem est de <b>Terre</b> : il craint le <b>Vent</b>. La <b>Rafale</b> de Nyssa lui fait très mal.", 2600);
          await api.msg("Quand il se met en <b>Carapace</b>, les armes rebondissent : passez à la <b>magie</b>.", 2600);
        } });
        F().s4_golem = 1; col.off = true;
        golem.position.set(S.golem.x, 0, S.golem.z); golem.visible = true; golem.scale.setScalar(1);
        E.shot([5.5, 2.2, -77], [0, 1.6, -85]);
        sfx('windup'); golem.userData.pose = true;
        await tween(1600, (k) => { golem.scale.set(1 + k * 0.15, Math.max(0.05, 1 - k * 0.95), 1 + k * 0.15); golem.position.x = S.golem.x + Math.sin(k * 60) * 0.05 * (1 - k); });
        st.remove(golem);
        await talk([['GOLEM GARDIEN', "Ta main... est sûre. Prends, Porteur. Et garde-toi de celui qui t'attend au bout du chemin."], ['', "Le colosse retombe en gravats. Au fond de la salle, la pierre ambrée bat comme un cœur."]]);
        E.unshot(); music(st.music); setObjective("Prendre l'Éclat de Terre sur l'autel"); save();
      } });
    }
    st.interact({ x: S.eclat.x, z: S.eclat.z, r: 2.6, label: "Prendre l'Éclat de Terre", cond: () => !!F().s4_golem && !F().s4_eclat, action: async () => {
      const { kael } = P();
      E.shot([3.6, 2.6, -92.4], [0, 2.4, -98.6]); music('');
      await talk([['', "Une pierre ambrée flotte au-dessus de l'autel. Kael tend la main."]]);
      sfx('levelup'); await tween(1200, (k) => { S.eclatObj.position.z = -98.6 + 2.6 * k; S.eclatObj.scale.setScalar(1 - 0.75 * k); });
      st.remove(S.eclatObj);
      await talk([['', "Le pendentif chauffe. Un instant, Kael voit sept silhouettes autour d'une couronne brisée. Puis plus rien."]]);
      give('eclat_terre');
      await talk([
        ['NYSSA', "« Porteur de Lumière » ? Il t'a parlé, la statue ?"], ['KAEL', "Vous n'avez rien entendu ?"],
        ['BORIN', "On a entendu un tas de pierres grogner."],
        ['LYRA', "Borin, regarde dans les gravats. Ce disque de granit : il a une poignée."],
      ]);
      const b = hero('borin'); equipement('bouclier_granit');
      if (b && !b.ring) { b.ring = 'bouclier_granit'; G.inv.bouclier_granit--; if (!G.inv.bouclier_granit) delete G.inv.bouclier_granit; await talk([['', "Borin passe le <b>Bouclier de granit</b> à son bras : défense et résistance en hausse."]]); }
      await talk([['BORIN', "Il fera l'affaire. En route. Le roi attend."]]);
      F().s4_eclat = 1; healParty(); E.unshot();
      await fade(true, 900);
      await narrate(["Trois jours de marche vers l'ouest.\nL'Éclat de Terre pèse dans le sac de Kael comme une montagne.", "Solméria. La salle du trône."]);
      await goPhase('ch4_retour');
    } });

    // ----- Arrivée -----
    const pos = F().pos || { x: 0, z: 7.2 };
    enter(st, { x: pos.x, z: pos.z, ry: PI, yaw: 0 });
    delete F().s4_ou;
    setObjective(F().s4_golem ? "Prendre l'Éclat de Terre sur l'autel" : 'Traverser le sanctuaire');
    await fade(false, 600);
    if (!F().s4_intro) {
      F().s4_intro = 1;
      await talk([['LYRA', "Cet endroit est plus vieux que le royaume. Plus vieux que les cartes."], ['BORIN', "Restez groupés. Et regardez où vous posez les pieds."]]);
    }
  }

  // ============================================================
  //  RETOUR À SOLMÉRIA : l'Éclat devant le roi
  // ============================================================
  async function ch4_retour() {
    const st = buildTrone(), S = st.spots;
    const up = (o, s) => { o.position.y = s.y; if (o.userData.col) o.userData.col.off = true; return o; };
    const roi = up(npc(st, 'roi', 'roi', S.roi.x, S.roi.z, 0), S.roi); if (roi.userData.imported) roi.userData.poseAt('Sitting_Idle_Loop', 0.4);
    up(npc(st, 'alinor', 'alinor', S.alinor.x, S.alinor.z, -0.3), S.alinor);
    const aldric = up(npc(st, 'aldric', 'aldric', S.aldric.x, S.aldric.z, 0.3), S.aldric);
    S.gardes.forEach((g, i) => npc(st, 'gt' + i, i % 3 === 0 ? 'renaud' : 'garde', g.x, g.z, g.ry));
    S.nobles.forEach((g, i) => npc(st, 'nb' + i, i % 2 ? 'noble_f' : 'noble', g.x, g.z, g.ry));
    enter(st, { x: 0, z: -24, ry: PI, yaw: 0 });
    const { kael, lyra, nyssa, borin } = P();
    lyra.position.set(-1.4, 0, -23); if (nyssa) nyssa.position.set(1.4, 0, -22.6); if (borin) borin.position.set(2.6, 0, -23.6);
    for (const f of E.followers) { f.userData.stay = true; f.rotation.y = PI; }
    setObjective(''); music('cite');
    E.shot([4.3, 3.3, -22.6], [-0.4, 2.3, -37], true);
    await fade(false, 900);
    await talk([
      ['ROI ALDEMAR', "Ainsi, les contes de nourrice disaient vrai. Une pierre qui bat comme un cœur."],
      ['BORIN', "Sire. L'Empire avait creusé un tunnel jusqu'au sanctuaire. Trois éclaireurs. Ils y étaient depuis des semaines."],
      ['ROI ALDEMAR', "Sur mes terres. Sous mon nez."],
      ['PRINCESSE ALINOR', "Père, si l'Empire cherche les Éclats, il les cherche tous. Il y en a six autres."],
      ['ROI ALDEMAR', "Celui-ci ira dans la chambre forte royale. Sept serrures, cent gardes. Il n'en sortira pas."],
    ]);
    if (G.inv.eclat_terre) { delete G.inv.eclat_terre; toast("L'<b>Éclat de Terre</b> est remis au roi."); }
    await E.walk(aldric, kael.position.x - 1.1, kael.position.z - 0.5, 1.8);
    E.faceEach(aldric, kael);
    E.shot([kael.position.x + 2.2, 1.9, kael.position.z + 2.2], [kael.position.x - 0.6, 1.5, kael.position.z - 0.3]);
    await talk([
      ['ALDRIC', "Tu as bien travaillé, mon garçon. Mieux que je ne l'espérais."],
      ['ALDRIC', "Prends ce miroir. Où que tu sois, je pourrai te parler, et te conseiller."],
    ]);
    give('miroir');
    await talk([
      ['ALDRIC', "Un dernier conseil. Les prochains Éclats... gardez-les sur vous. Les chambres fortes ont des portes. Les portes ont des clés."],
      ['LYRA', "Maître ? Vous venez de dire le contraire du roi."], ['ALDRIC', "Je viens de dire ce que le roi ne peut pas dire, Lyra."],
      ['BORIN', "Le deuxième Éclat est au nord. Les Forges de Ferrecime, chez les nains. On repart à l'aube."],
      ['NYSSA', "Des nains. De l'or, donc. Je commence à aimer ce voyage."],
    ]);
    F().ch4_fin = 1; F().s4_retour = 'chateau';
    for (const f of E.followers) f.userData.stay = false;
    E.unshot();
    await fade(true, 900);
    music('title');
    await chapterCard('Fin du chapitre 4', 'À suivre : Chapitre 5 — Les Forges de Ferrecime');
    await narrate(["Vous avez terminé les quatre premiers chapitres d'Aldéria : La Couronne d'Aube.", "Le premier Éclat est en lieu sûr... du moins le roi le croit.\nLa suite de l'aventure reste à construire. Votre partie est sauvegardée à Solméria."]);
    await goPhase('ch3_ville');
  }

  return { ch4_route, ch4_sanctuaire, ch4_retour };
}
