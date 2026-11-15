// ============================================================
//  HISTOIRE — CHAPITRE 5 : LES FORGES DE FERRECIME
//  Le col enneigé et ses murs de glace, les portes de bronze, la reine Durgana, l'épreuve de la forge,
//  Brasegarde, les mines (chariot, levier, prisonniers), la Taraude, l'ordre du Conseiller Gris.
//  (dialogues repris du script « 01_Acte1_Chapitres_01-10.md », chapitre 5)
//  Ce fichier prête aussi ses petites aides (niveau plancher, équipement…) aux chapitres 6 à 10.
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { E } from './engine.js';
import { G, save, healParty, hero, addItem, removeItem, countItem, gainXP, xpForNext, heroStats } from './state.js';
import { EQUIP, HEROES } from './data.js';
import { sleep, talk, choose, toast, setObjective, updateGold, hint, fade, narrate, chapterCard, shop } from './ui.js';
import { sfx, music } from './audio.js';
import { buildCol, buildBrasegarde, buildMines } from './world5.js';
import { brancherMaisons } from './interieurs.js';
import { makeChar, makeEnemyModel, makeFire } from './models.js';
import { jauge } from './jauge.js';

const PI = Math.PI;
const F = () => G.flags;
export const NOMS = { kael: 'Kael', lyra: 'Lyra', nyssa: 'Nyssa', borin: 'Borin' };

// ---------- Aides communes aux chapitres 5 à 10 ----------
export const or = (n) => { G.gold += n; updateGold(); sfx('item'); toast(`Obtenu : <b>${n} pièces d'or</b>`); };
export const equipement = (id) => { addItem(id); sfx('item'); toast(`Obtenu : <b>${EQUIP[id].name}</b>`); };
// Donne une pièce d'équipement et la fait porter tout de suite si elle est meilleure (l'ancienne retourne dans le sac)
export function equiper(heroId, id) {
  const h = hero(heroId), e = EQUIP[id]; equipement(id); if (!h) return false;
  const vieux = h[e.slot]; h[e.slot] = id; removeItem(id); if (vieux) addItem(vieux);
  const s = heroStats(h); h.hp = Math.min(h.hp, s.maxHp); return true;
}
// Personne n'aborde un chapitre sous son niveau conseillé : le voyage a servi d'entraînement
export async function niveauMin(n, texte) {
  const gagne = [];
  for (const h of G.party) { let k = 0; while (h.level < n) { gainXP(h, xpForNext(h.level) - h.xp); k++; } if (k) gagne.push(NOMS[h.id] + ' : niveau ' + h.level); }
  if (gagne.length) { sfx('levelup'); await talk([['', texte + '\n' + gagne.join(' · ')]]); }
}
export function xpTous(n) { for (const h of G.party) gainXP(h, n); }
// Une marchande ou un armurier : un seul appel
export const boutique = (titre, stock) => shop(titre, stock);
// Trajet en fondu vers un autre lieu
export const fondu = async (T, phase, flag) => { await fade(true, 600); if (flag) F()[flag[0]] = flag[1]; await T.goPhase(phase); };

export function chapter5(T) {
  const { enter, goPhase, fight, give, chest, reader, statue, mobs, tween, npc } = T;
  const P = () => T.party();

  // ============================================================
  //  LE COL DE FERRECIME
  // ============================================================
  async function ch5_col() {
    const st = buildCol(), S = st.spots;
    statue(st, S.statue);
    reader(st, S.borne, 'Lire la borne', [['BORNE', "« Col de Ferrecime. Portes de Brasegarde : au nord. Les grands laissent leurs armes au fourreau. »"]]);
    mobs(st, S.mobs, 'neige');
    chest(st, 'col5_a', S.coffres[0], -PI / 2, async () => { give('potion_plus', 2); give('fiole_braise', 2); });
    chest(st, 'col5_b', S.coffres[1], PI / 2, async () => { give('ether', 2); or(200); });

    // ----- Les murs de glace : Lyra les fait fondre -----
    S.glaces.forEach((g, i) => {
      const cle = 'c5_g' + i;
      if (F()[cle]) { st.remove(g.obj); g.mur.off = true; return; }
      st.interact({ x: 0, z: g.z + 2.2, r: 3.4, label: 'Faire fondre la glace', cond: () => !F()[cle], action: async () => {
        const { kael, lyra } = P();
        if (!F().c5_glace) {
          F().c5_glace = 1;
          await talk([['BORIN', "Un mur de glace. De dix pieds. Il n'était pas là il y a vingt ans."], ['NYSSA', "Je déteste cet endroit."], ['LYRA', "Reculez. C'est le genre de porte que je sais ouvrir."]]);
        }
        E.shot([5.5, 3.4, g.z + 8], [0, 2, g.z], false);
        await E.walk(lyra, 0.8, g.z + 3.4, 3); E.face(lyra, 0, g.z);
        if (lyra.userData.imported) lyra.userData.play('Spell_Simple_Shoot', { speed: 0.8 });
        const feu = makeFire(2.4, false); st.add(feu, 0, g.z + 0.9, 0, 0.2); sfx('fire');
        await tween(1500, (k) => { g.obj.scale.y = 1 - k * 0.96; g.obj.position.y = -k * 0.2; });
        sfx('shatter'); st.remove(g.obj); st.remove(feu); g.mur.off = true; F()[cle] = 1;
        E.unshot();
        if (i === 2) await talk([['LYRA', "Trois murs. Je n'ai plus un doigt de chaud."], ['BORIN', "Regardez, là-haut. Les portes."]]);
        save();
      } });
    });

    // ----- Les portes de bronze -----
    const ouvrir = (k) => { S.portes[0].rotation.y = -k * 1.25; S.portes[1].rotation.y = k * 1.25; };
    npc(st, 'gn1', 'garde_nain', S.garde.x, S.garde.z, 0, 'au garde', async () => {
      await talk([['GARDE NAIN', F().c5_portes ? "La reine a dit : ouvert. Alors c'est ouvert." : F().c5_durgana ? "La reine vous attend à l'enclume. Ne la faites pas attendre : elle a un marteau." : "Fermé. Les grands ne passent plus."]]);
    });
    npc(st, 'gn2', 'garde_nain', S.garde2.x, S.garde2.z, 0);
    let durgana = null;
    if (F().c5_durgana && !F().c5_portes) durgana = npc(st, 'durgana', 'durgana', S.forge.x + 2, S.forge.z - 0.4, -PI / 2);
    if (F().c5_portes) { ouvrir(1); S.porteMur.off = true; }
    st.trigger({ x1: -8, x2: 8, z1: -86.5, z2: -82, once: true, cond: () => !F().c5_durgana, action: async () => {
      const { kael, lyra, nyssa, borin } = P();
      await E.walk(kael, 0, -88.6, 3); E.face(kael, 0, -93);
      E.shot([6.5, 3, -84.5], [0, 2.4, -93]);
      await talk([
        ['', "Des portes de bronze hautes comme un donjon. Deux gardes trapus, la barbe prise dans le givre."],
        ['GARDE NAIN', "Fermé. Les grands ne passent plus."], ['BORIN', "Au nom du roi Aldemar."],
        ['GARDE NAIN', "Votre roi n'a pas envoyé un seul soldat quand les gris sont venus. Fermé."],
      ]);
      sfx('quake'); await tween(1400, (k) => ouvrir(k * 0.28));
      durgana = npc(st, 'durgana', 'durgana', 0, -95, 0);
      await E.walk(durgana, 0, -91, 2.2);
      E.shot([3.4, 2.2, -87], [0, 1.3, -91]);
      await talk([
        ['', "Les portes s'entrouvrent. Une naine aux cheveux blancs sort, un marteau sur l'épaule. Les gardes se raidissent."],
        ['DURGANA', "Cette lame. Montre."], ['', "Elle retourne l'épée de Kael, la soupèse, passe le pouce sur le fil."],
        ['DURGANA', "Trempe à l'eau froide, fil rattrapé à la pierre fine. C'est du travail de Hagen."],
        ['KAEL', "Vous le connaissiez ?"], ['DURGANA', "Je lui ai appris. Il est vivant ?"], ['KAEL', "Non."],
        ['DURGANA', "Alors tu vas me montrer ce qu'il t'a laissé dans les mains. Si tu forges comme un apprenti de Hagen, vous entrez. Sinon, vous redescendez."],
      ]);
      E.unshot();
      await E.walk(durgana, S.forge.x + 2, S.forge.z - 0.4, 2.6); E.face(durgana, S.forge.x, S.forge.z);
      await tween(900, (k) => ouvrir(0.28 * (1 - k)));
      F().c5_durgana = 1; setObjective("Forger une dague à l'enclume des veilleurs"); save();
    } });

    // ----- L'épreuve de la forge -----
    st.interact({ x: S.forge.x, z: S.forge.z, r: 2.8, label: "Se mettre à l'enclume", cond: () => !!F().c5_durgana && !F().c5_portes, action: async () => {
      const { kael, nyssa } = P();
      E.shot([S.forge.x + 4.2, 2.6, S.forge.z + 3.6], [S.forge.x, 1.1, S.forge.z]);
      await talk([['DURGANA', "Une dague. Courte, droite, pour une main rapide. Trois gestes : chauffer, frapper, tremper. Je regarde."]]);
      const etapes = [
        { titre: '1 · Chauffer', aide: "Sortez le fer quand il est <b>orange</b> : ni rouge sombre, ni blanc.", zone: [0.52, 0.72], vitesse: 0.75, couleur: '#ff8a2a', rate: "Trop froid, ou trop cuit. Remets-le au feu.", son: 'fire' },
        { titre: '2 · Frapper', aide: "Frappez <b>au centre</b> de la lame, en rythme.", zone: [0.4, 0.6], vitesse: 1.25, couleur: '#e8c040', rate: "Tu tapes à côté. L'enclume, elle, ne t'a rien fait.", son: 'hit', fois: 3 },
        { titre: '3 · Tremper', aide: "Plongez la lame <b>au bon instant</b> : la zone est étroite.", zone: [0.44, 0.56], vitesse: 1.0, couleur: '#4ab0e8', rate: "Trop tard : elle a tiédi. Recommence la trempe.", son: 'ice' },
      ];
      for (const e of etapes) {
        for (let n = 0; n < (e.fois || 1); n++) {
          while (!(await jauge(e))) { sfx('cancel'); await talk([['DURGANA', e.rate]]); }
          sfx(e.son); if (kael.userData.imported) kael.userData.play('Sword_Attack', { speed: 1.2 });
          await sleep(350);
        }
      }
      sfx('levelup');
      await talk([
        ['', "La lame sort de l'eau dans un sifflement. Courte, droite, d'un gris bleuté."],
        ['DURGANA', "Passable. Hagen aurait grogné, donc c'est bon signe."],
        ['KAEL', "Nyssa. Elle est pour toi."], ['NYSSA', "Pour moi ? ... On ne m'a jamais rien fabriqué. On me vend des choses. Ou je les prends."],
      ]);
      if (equiper('nyssa', 'dague_brasegarde')) await talk([['', "Nyssa passe la <b>Dague de Brasegarde</b> à sa ceinture : attaque et vitesse en hausse."]]);
      await talk([['DURGANA', "Ouvrez les portes."]]);
      E.shot([7, 4, -84], [0, 6, -96]);
      sfx('quake'); await tween(2200, (k) => ouvrir(k));
      S.porteMur.off = true; F().c5_portes = 1; E.unshot();
      await fade(true, 800);
      await goPhase('ch5_brasegarde');
    } });
    st.interact({ x: 0, z: -94.6, r: 2.6, label: 'Entrer dans Brasegarde', cond: () => !!F().c5_portes, action: async () => { await fade(true, 500); await goPhase('ch5_brasegarde'); } });

    // retour vers Solméria
    st.trigger({ x1: -8, x2: 8, z1: 11, z2: 16, once: false, action: async () => {
      const { kael } = P();
      const r = await choose('Redescendre vers <b>Solméria</b> ?', [{ label: 'Rentrer à Solméria' }, { label: 'Rester au col' }], { cancel: true });
      if (r !== 0) { await E.walk(kael, 0, 8.6); return; }
      await fade(true, 600); F().s4_retour = 'porte'; await goPhase('ch3_ville');
    } });

    // ----- Arrivée -----
    const haut = F().c5_ou === 'portes';
    const pos = F().pos || (haut ? { x: 0, z: -91 } : { x: 0, z: 8 });
    enter(st, { x: pos.x, z: pos.z, ry: haut ? 0 : PI, yaw: haut ? PI : 0 });
    delete F().c5_ou;
    setObjective(F().c5_portes ? 'Entrer dans Brasegarde' : F().c5_durgana ? "Forger une dague à l'enclume des veilleurs" : 'Monter jusqu\'aux portes de bronze, au nord');
    if (!F().ch5_intro) {
      await chapterCard('Chapitre 5', 'Les Forges de Ferrecime');
      await fade(false, 700);
      F().ch5_intro = 1;
      await niveauMin(9, "Une semaine de marche vers le nord. Borin n'a laissé personne s'endormir sans avoir tiré l'épée.");
      healParty();
      await talk([
        ['NYSSA', "De la neige. Jusqu'aux genoux. Vous aviez dit « des nains et de l'or »."],
        ['BORIN', "J'ai dit « Ferrecime ». L'or, c'est toi qui l'as ajouté."],
        ['LYRA', "Les loups d'ici ont le poil blanc. Ils n'aimeront pas mon feu."],
      ]);
      hint("Les <b>loups des neiges</b> craignent le <b>Feu</b> : la <b>Flammèche</b> de Lyra.");
      setTimeout(() => hint(null), 9000);
      save();
    } else await fade(false, 600);
  }

  // ============================================================
  //  BRASEGARDE
  // ============================================================
  async function ch5_brasegarde() {
    const st = buildBrasegarde(), S = st.spots;
    brancherMaisons(st, T);                         // les maisons taillées dans la roche s'ouvrent
    statue(st, S.statue);
    const lignes = [
      [['NAIN', "Des grands, chez nous. La dernière fois, c'était le forgeron de Brumeval. Il mangeait comme quatre."]],
      [['NAINE', "La lave ne monte jamais. Elle coule depuis mille ans dans le même lit. C'est la machine des gris qui me fait peur."]],
      [['NAIN', "Mon frère est dans la mine nord. Vivant, j'espère. Ils les font creuser."]],
      [['NAINE', "La reine Durgana a forgé les gonds des grandes portes elle-même. À dix-neuf ans."]],
      [['NAIN', "Garde de la salle. On ne touche pas aux colonnes. Elles tiennent la montagne."]],
    ];
    S.nains.forEach((n, i) => npc(st, 'nain' + i, n.k, n.x, n.z, n.ry, n.k === 'naine' ? 'à la naine' : 'au nain', async () => { await talk(lignes[i]); }));
    S.gardes.forEach((g, i) => npc(st, 'gd' + i, 'garde_nain', g.x, g.z, 0));

    // ----- Le forgeron : boutique et renfort des armes -----
    npc(st, 'forgeron', 'nain2', S.forgeron.x, S.forgeron.z, PI / 3, 'au forgeron', async () => {
      const r = await choose("<b>BRAM, maître forgeron</b> — Du fer de Ferrecime. Le meilleur, ou rien.", [
        { label: 'Acheter des armes et des armures' },
        { label: 'Renforcer une arme', right: `minerai ×${countItem('minerai_fer')}`, sub: '1 minerai de fer et 150 or : ATK et MAG +2' },
      ], { cancel: true });
      if (r === 0) await boutique('La Forge de Bram', ['epee_naine', 'baton_rubis', 'masse_naine', 'plastron_nain', 'robe_salamandre']);
      if (r === 1) {
        if (!countItem('minerai_fer')) { await talk([['BRAM', "Pas de minerai, pas de renfort. Les mines en sont pleines. Les prisonniers aussi, hélas."]]); return; }
        if (G.gold < 150) { await talk([['BRAM', "Cent cinquante pièces. Le charbon ne pousse pas sur les arbres."]]); return; }
        const qui = G.party.filter(h => (h.forge || 0) < 3);
        if (!qui.length) { await talk([['BRAM', "Vos lames sont au bout de ce que le fer peut donner."]]); return; }
        const k = await choose('Renforcer l\'arme de qui ?', qui.map(h => ({ label: NOMS[h.id], right: `renfort ${h.forge || 0}/3` })), { cancel: true });
        if (k < 0) return;
        removeItem('minerai_fer'); G.gold -= 150; updateGold(); qui[k].forge = (qui[k].forge || 0) + 1;
        sfx('hit'); await sleep(250); sfx('hit'); await sleep(250); sfx('levelup');
        toast(`L'arme de <b>${NOMS[qui[k].id]}</b> est renforcée : ATK et MAG +2.`); save();
      }
    });
    npc(st, 'marchande', 'naine', S.marchande.x, S.marchande.z, 0, 'à la marchande', async () => {
      await boutique('Le Comptoir de Hilda', ['potion', 'potion_plus', 'ether', 'antidote', 'fiole_givre', 'fiole_braise', 'tente']);
    });

    // ----- Durgana -----
    const durgana = npc(st, 'durgana', 'durgana', S.durgana.x, S.durgana.z, 0, 'à la reine Durgana', async () => {
      const { kael } = P();
      if (!F().b5_mission) {
        E.shot([4.4, 2.4, -32], [0, 1.4, -37]);
        await talk([
          ['DURGANA', "Bienvenue à Brasegarde. Tu vois ces rivières de feu ? Elles nous éclairent depuis mille ans. Et depuis un mois, elles tremblent."],
          ['DURGANA', "Le général Grom a pris la mine nord. Il fore vers le cœur du volcan."],
          ['DURGANA', "Sa machine avale la roche comme du pain. Dans deux jours, elle perce la chambre du sanctuaire."],
          ['NYSSA', "Et vos guerriers ?"],
          ['DURGANA', "La moitié est sous les éboulements qu'elle a provoqués. Cassez-la et le volcan est à vous."],
          ['BORIN', "Une machine. Ça ne saigne pas, une machine."], ['LYRA', "Non. Mais ça rouille. Laissez-moi le givre."],
        ]);
        E.unshot(); F().b5_mission = 1; setObjective('Entrer dans les mines, par la porte ouest de la salle'); save();
      } else if (!F().m5_fin) await talk([['DURGANA', "La mine nord, par la porte ouest. Et si vous croisez mes mineurs dans des cages, ouvrez-les."]]);
      else if (!F().ch6_fin) await talk([['DURGANA', "Le volcan est par la porte est. Ignis garde l'autel depuis avant ma grand-mère. Parlez-lui avec respect."]]);
      else await talk([['DURGANA', "Les nains ont une dette. Le jour où tu auras besoin de nos marteaux, envoie un mot."]]);
    });

    // ----- Les portes -----
    st.trigger({ x1: -25, x2: -22.6, z1: -30, z2: -24, once: false, action: async () => {
      const { kael } = P();
      if (!F().b5_mission) { await talk([['GARDE NAIN', "La reine d'abord. Elle est sur l'estrade, au fond de la salle."]]); await E.walk(kael, -20.5, -27); return; }
      await fade(true, 500); await goPhase('ch5_mines');
    } });
    st.trigger({ x1: 22.6, x2: 25, z1: -30, z2: -24, once: false, action: async () => {
      const { kael } = P();
      if (!F().ch5_fin) { await talk([['GARDE NAIN', "Le volcan ? Pas tant que la machine des gris fait trembler la montagne."]]); await E.walk(kael, 20.5, -27); return; }
      if (F().ch6_fin) { await talk([['GARDE NAIN', "La galerie s'est effondrée derrière vous. Plus personne ne descendra là avant longtemps."]]); await E.walk(kael, 20.5, -27); return; }
      await fade(true, 500); await goPhase('ch6_volcan');
    } });
    st.trigger({ x1: -3, x2: 3, z1: 11.6, z2: 14, once: false, action: async () => {
      const { kael } = P();
      const choix = F().ch6_fin ? [{ label: 'Partir pour Port-Azur', sub: 'Chapitre 7' }, { label: 'Rester à Brasegarde' }] : [{ label: 'Sortir vers le col' }, { label: 'Rester à Brasegarde' }];
      const r = await choose(F().ch6_fin ? "Prendre la route de la mer, vers <b>Port-Azur</b> ?" : 'Quitter <b>Brasegarde</b> ?', choix, { cancel: true });
      if (r !== 0) { await E.walk(kael, 0, 9); return; }
      await fade(true, 700);
      if (F().ch6_fin) { await narrate(["Dix jours de descente vers le sud-ouest.\nLa neige devient pluie, la pluie devient sel.", "Port-Azur. La ville de Nyssa."]); await goPhase('ch7_port'); }
      else { F().c5_ou = 'portes'; await goPhase('ch5_col'); }
    } });

    // ----- Arrivée -----
    const ou = F().b5_ou; delete F().b5_ou;
    const pos = F().pos || (ou === 'mines' ? { x: -20.5, z: -27 } : ou === 'volcan' ? { x: 20.5, z: -27 } : ou === 'reine' ? { x: 0, z: -33 } : { x: 0, z: 9 });
    enter(st, { x: pos.x, z: pos.z, ry: ou === 'mines' ? PI / 2 : ou === 'volcan' ? -PI / 2 : PI, yaw: ou === 'mines' ? -PI / 2 : ou === 'volcan' ? PI / 2 : 0 });
    setObjective(F().ch6_fin ? 'Prendre la route de Port-Azur (sortie sud)' : F().ch5_fin ? 'Descendre dans le volcan, par la porte est' : F().b5_mission ? 'Entrer dans les mines, par la porte ouest de la salle' : 'Parler à la reine Durgana, au fond de la salle');
    await fade(false, 700);
    if (!F().b5_intro) {
      F().b5_intro = 1;
      await talk([['', "Une ville entière sous la montagne. Des maisons taillées dans le roc, des fenêtres dorées, et une rivière de lave pour seul soleil."], ['NYSSA', "Il fait chaud. Enfin."], ['BORIN', "La reine nous attend au fond. On passe le pont."]]);
      save();
    }
    // Retour des mines : la reine remercie, le chapitre se termine, le suivant commence
    if (F().m5_fin && !F().ch5_fin) {
      const { kael } = P();
      E.shot([4.4, 2.4, -32], [0, 1.4, -37]);
      await talk([
        ['DURGANA', "J'ai senti la montagne se taire. Vous avez cassé la bête."],
        ['BORIN', "Et trouvé ceci dans les débris. « Par ordre du Conseiller Gris. »"],
        ['DURGANA', "Je ne connais pas ce nom. Je connais ce genre d'homme : celui qui ne tient jamais la pioche."],
        ['DURGANA', "Le volcan est à vous. La porte est. Reposez-vous d'abord : Hilda et Bram vous serviront."],
      ]);
      healParty(); sfx('heal'); toast('PV et PM restaurés.');
      F().ch5_fin = 1; E.unshot();
      await fade(true, 800);
      music('title');
      await chapterCard('Fin du chapitre 5', 'À suivre : Chapitre 6 — Le Cœur du Volcan');
      music(st.music);
      setObjective('Descendre dans le volcan, par la porte est');
      save(); await fade(false, 700);
    }
  }

  // ============================================================
  //  LES MINES
  // ============================================================
  async function ch5_mines() {
    const st = buildMines(), S = st.spots;
    statue(st, S.statue);
    mobs(st, S.mobs, 'mine');
    chest(st, 'min_a', S.coffres[0], PI, async () => { give('minerai_fer', 2); give('potion_plus', 2); });
    chest(st, 'min_b', S.coffres[1], PI, async () => { give('ether', 2); give('fiole_givre', 3); });
    reader(st, S.panneau, 'Lire le panneau', [['PANNEAU', "« ← Galerie ouest : réserve.   Galerie est : commande de la grille → »"]]);

    // ----- Le chariot : un aiguillage, deux galeries -----
    const trajet = async (vers) => {
      const { kael } = P(), a = S.arrivee[vers];
      sfx('move'); await fade(true, 450); sfx('quake');
      kael.position.set(a.x, 0, a.z); E.followers.forEach((f, i) => f.position.set(a.x + (i - 1) * 0.9, 0, a.z + 1.2));
      E.snapCamera(); await sleep(350); await fade(false, 450);
    };
    st.interact({ x: 0, z: -8.4, r: 2.6, label: 'Monter dans le chariot', action: async () => {
      const r = await choose("Le chariot roule vers un <b>aiguillage</b>. Quelle voie ?", [{ label: 'Voie de gauche', sub: 'Galerie ouest' }, { label: 'Voie de droite', sub: 'Galerie est' }], { cancel: true });
      if (r < 0) return;
      if (!F().m5_chariot) { F().m5_chariot = 1; await talk([['NYSSA', "Je conduis."], ['BORIN', "Il n'y a pas de volant."], ['NYSSA', "Alors je crie dans les descentes."]]); }
      await trajet(r === 0 ? 'ouest' : 'est');
    } });
    for (const c of ['ouest', 'est']) st.interact({ x: S.arrivee[c].x, z: -17.4, r: 2.6, label: 'Reprendre le chariot vers le hall', action: async () => { await trajet('hall'); } });

    // ----- Le levier de la grille -----
    const lever = (k) => { S.grille.position.y = k * 3.3; };
    if (F().m5_grille) { lever(1); S.grilleMur.off = true; S.levier.userData.manche.rotation.z = 0.6; }
    st.interact({ x: S.levierPos.x, z: S.levierPos.z, r: 2.4, label: 'Tirer le levier', cond: () => !F().m5_grille, action: async () => {
      sfx('move'); await tween(350, (k) => { S.levier.userData.manche.rotation.z = -0.6 + 1.2 * k; });
      F().m5_grille = 1; E.shot([3.6, 3, -8], [0, 1.6, -14.2]); await sleep(300);
      sfx('quake'); await tween(1300, lever); S.grilleMur.off = true;
      await talk([['', "Loin dans le hall, une grille remonte dans la roche. Le couloir du chantier est ouvert."]]);
      E.unshot(); setObjective('Traverser le chantier jusqu\'à la machine'); save();
    } });
    st.interact({ x: 0, z: -12.6, r: 2.4, label: 'Examiner la grille', cond: () => !F().m5_grille, action: async () => { await talk([['BORIN', "Fermée. Le panneau parle d'une commande dans la galerie est. Le chariot y mène."]]); } });

    // ----- Les prisonniers -----
    const mots = ["Trois semaines qu'ils nous font pousser leurs wagons. Tenez : du fer de la veine bleue. Dites à la reine que Dori est vivant.", "Je croyais mourir ici. Prenez ce minerai. Bram saura quoi en faire.", "La machine est au bout du chantier. Elle a une chaudière : quand elle vire au blanc, jetez-lui du froid !"];
    for (const c of S.cages) {
      const cle = 'm5_p' + c.id;
      if (F()[cle]) { st.remove(c.obj); c.col.off = true; continue; }
      const nain = makeChar(c.id === 2 ? 'naine' : 'nain'); st.add(nain, c.x, c.z, PI);
      st.interact({ x: c.x, z: c.z, r: 2.9, label: 'Ouvrir la cage', cond: () => !F()[cle], action: async () => {
        const { nyssa } = P();
        await talk([['NYSSA', c.id === 1 ? "Un cadenas impérial. Trois goupilles. Ils se moquent du monde." : "Bouge pas, barbu. J'en ai pour deux secondes."]]);
        sfx('steal'); await sleep(400); st.remove(c.obj); c.col.off = true; F()[cle] = 1;
        await talk([[c.id === 2 ? 'NAINE' : 'NAIN', mots[c.id - 1]]]);
        give('minerai_fer');
        await E.walk(nain, c.x + (c.x < 0 ? 3 : -3), c.z + 4, 4.5); st.remove(nain);
        if (S.cages.every(k => F()['m5_p' + k.id])) { toast('Les trois prisonniers sont libres.'); or(300); }
        save();
      } });
    }

    // ----- La Taraude -----
    if (!F().m5_boss) {
      const machine = makeEnemyModel('taraude'); st.add(machine, S.taraude.x, S.taraude.z, PI); const col = st.circle(S.taraude.x, S.taraude.z, 3.4);
      st.trigger({ x1: -14, x2: 14, z1: S.seuil - 3, z2: S.seuil, once: true, cond: () => !F().m5_boss, action: async () => {
        const { kael } = P();
        await E.walk(kael, 0, -65, 2.6); E.face(kael, 0, -78);
        E.shot([7.5, 3, -63], [0, 3, -78]); music('');
        await talk([
          ['', "Une chambre immense. Au fond, une masse de fer sur chenilles ronge la roche. Sa vrille est plus haute que Borin."],
          ['NYSSA', "C'est ça, leur machine ? Je pensais à quelque chose de... plus petit."],
        ]);
        sfx('quake'); await tween(1600, (k) => { machine.rotation.y = PI * (1 - k); });
        await talk([['LYRA', "Elle se retourne. Elle nous a sentis."], ['BORIN', "Lyra, ton givre sur la chaudière. Nyssa, ton vent dans les rouages. Kael, avec moi."]]);
        E.unshot();
        await fight(['taraude'], { arena: 'foreuse', story: true, canFlee: false, music: 'boss', intro: 'La Taraude fonce, vrille en avant !', onStart: async (api) => {
          await api.msg("La Taraude craint l'<b>Eau</b> (la rouille) et le <b>Vent</b> : Éclat de Givre, Rafale, Fioles de givre.", 2800);
          await api.msg("Quand sa chaudière <b>surchauffe</b>, un sort ou une fiole de <b>Givre</b> annule l'explosion.", 2800);
        } });
        F().m5_boss = 1; col.off = true;
        E.shot([7.5, 3, -66], [0, 2, -78]);
        sfx('explosion'); machine.userData.pose = true;
        await tween(1500, (k) => { machine.rotation.z = k * 0.28; machine.position.y = -k * 0.5; machine.position.x = Math.sin(k * 50) * 0.06 * (1 - k); });
        const fumee = makeFire(1.6, false); st.add(fumee, 0.8, -77, 0, 2.2);
        await talk([['', "La chaudière crève. La vrille tourne encore trois tours, puis s'arrête. Le silence revient dans la montagne."], ['NYSSA', "Je retire ce que j'ai dit. Elle était très bien, cette dague."]]);
        E.unshot(); music(st.music); setObjective('Fouiller les débris de la machine'); save();
      } });
    } else { const epave = makeEnemyModel('taraude'); epave.userData.pose = true; epave.rotation.z = 0.28; st.add(epave, S.taraude.x, S.taraude.z, 0, -0.5); st.circle(S.taraude.x, S.taraude.z, 3.4); }
    st.interact({ x: 0, z: -73.4, r: 2.8, label: 'Fouiller les débris', cond: () => !!F().m5_boss && !F().m5_fin, action: async () => {
      await talk([['', "Parmi les tôles tordues, un étui de cuir. Dedans, un ordre scellé de cire grise."]]);
      give('ordre_gris');
      await talk([
        ['', "« Par ordre du Conseiller Gris, l'Éclat de Feu avant la nouvelle lune. »"],
        ['LYRA', "« Conseiller Gris ». Ce n'est pas un grade militaire."],
        ['BORIN', "Non. C'est quelqu'un qui donne des ordres aux généraux. Ça ne me plaît pas."],
        ['KAEL', "Grom n'était pas dans sa machine. Il est où ?"], ['BORIN', "Devant nous. Toujours devant nous. On remonte voir la reine."],
      ]);
      F().m5_fin = 1; healParty();
      await fade(true, 800); F().b5_ou = 'reine'; await goPhase('ch5_brasegarde');
    } });

    // sortie vers Brasegarde
    st.trigger({ x1: -3, x2: 3, z1: 6.6, z2: 8, once: false, action: async () => {
      const { kael } = P();
      const r = await choose('Remonter à <b>Brasegarde</b> ?', [{ label: 'Remonter' }, { label: 'Rester dans la mine' }], { cancel: true });
      if (r !== 0) { await E.walk(kael, 0, 4); return; }
      await fade(true, 500); F().b5_ou = 'mines'; await goPhase('ch5_brasegarde');
    } });

    // ----- Arrivée -----
    const pos = F().pos || { x: 0, z: 4.6 };
    enter(st, { x: pos.x, z: pos.z, ry: PI, yaw: 0 });
    setObjective(F().m5_boss ? 'Fouiller les débris de la machine' : F().m5_grille ? "Traverser le chantier jusqu'à la machine" : 'Trouver comment ouvrir la grille du couloir');
    await fade(false, 600);
    if (!F().m5_intro) {
      F().m5_intro = 1;
      await talk([['BORIN', "Des rails, un chariot, une grille fermée. Et des coups de pioche plus bas."], ['LYRA', "Les automates craignent l'eau. Le reste... le reste, ce sont des hommes."]]);
      hint("Les <b>automates</b> craignent l'<b>Eau</b> : l'<b>Éclat de Givre</b> de Lyra.");
      setTimeout(() => hint(null), 9000);
    }
  }

  return { ch5_col, ch5_brasegarde, ch5_mines };
}
