// ============================================================
//  HISTOIRE — CHAPITRE 6 : LE CŒUR DU VOLCAN
//  La descente (chaleur, capes d'amiante, coulées de lave figées par Lyra), Ignis la Salamandre,
//  l'Éclat de Feu, Grom le Briseur, la fuite chronométrée, le banquet et le serment des nains.
//  (dialogues repris du script « 01_Acte1_Chapitres_01-10.md », chapitre 6)
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { E } from './engine.js';
import { G, save, healParty } from './state.js';
import { sleep, talk, toast, setObjective, hint, fade, narrate, chapterCard } from './ui.js';
import { sfx, music } from './audio.js';
import { buildVolcan, buildBrasegarde, tic } from './world5.js';
import { brancherMaisons } from './interieurs.js';
import { makeChar, makeEnemyModel, makeFire, makeRock } from './models.js';
import { or, niveauMin, xpTous } from './story5.js';

const PI = Math.PI;
const F = () => G.flags;
const DUREE_FUITE = 75;             // secondes

export function chapter6(T) {
  const { enter, goPhase, fight, give, chest, statue, mobs, tween, npc } = T;
  const P = () => T.party();

  // ============================================================
  //  LA DESCENTE ET LE SANCTUAIRE DU FEU
  // ============================================================
  async function ch6_volcan() {
    const st = buildVolcan(false), S = st.spots;
    statue(st, S.statue);
    mobs(st, S.mobs, 'volcan');
    chest(st, 'vol_a', S.coffres[0], PI / 2, async () => { give('fiole_givre', 3); give('potion_plus', 2); });
    chest(st, 'vol_b', S.coffres[1], -PI / 2, async () => { give('ether', 3); or(350); });

    // ----- La chaleur : tant que l'équipe n'a pas les capes, elle perd des PV hors de l'alcôve fraîche -----
    let chrono = 0, averti = false;
    tic(st, (dt) => {
      if (F().v6_capes || E.busy || !E.enabled || !E.player) return;
      const p = E.player.position;
      if (Math.hypot(p.x - S.statue.x, p.z - S.statue.z) < 4) return;                 // au frais
      chrono += dt; if (chrono < 5) return; chrono = 0;
      for (const h of G.party) h.hp = Math.max(1, h.hp - 3);
      sfx('fire'); if (!averti) { averti = true; toast("La chaleur ronge l'équipe : <b>−3 PV</b> toutes les cinq secondes."); }
    });

    // ----- Les coulées de lave : Lyra les fige -----
    S.coulees.forEach((c, i) => {
      const cle = 'v6_c' + i;
      if (F()[cle]) { c.pont.visible = true; c.mur.off = true; return; }
      st.interact({ x: c.x, z: c.z + 3.4, r: 3.2, label: 'Figer la lave', cond: () => !F()[cle], action: async () => {
        const { kael, lyra } = P();
        if (!F().v6_capes) {
          // Un coureur envoyé par Durgana rattrape l'équipe
          const nain = makeChar('nain2'); st.add(nain, 0, c.z + 16, PI);
          await E.walk(nain, kael.position.x + 1.2, kael.position.z + 1.6, 5.5); E.faceEach(nain, kael);
          await talk([
            ['COUREUR NAIN', "Attendez ! Attendez, les grands ! La reine a dit... ouf... la reine a dit que vous alliez cuire."],
            ['COUREUR NAIN', "Des capes d'amiante. Tissées par ma mère. On peut dormir dans un four avec ça."],
          ]);
          give('cape_amiante'); F().v6_capes = 1;
          await talk([['NYSSA', "Je déteste cet endroit."], ['LYRA', "Tu détestais la neige hier."], ['NYSSA', "Je suis une fille de la mer. Je déteste tout ce qui n'est pas mouillé et tiède."]]);
          E.walk(nain, 0, c.z + 20, 5).then(() => st.remove(nain));
        }
        E.shot([c.x + 6, 3.4, c.z + 7], [c.x, 0.6, c.z]);
        await E.walk(lyra, c.x + 0.6, c.z + 3.2, 3); E.face(lyra, c.x, c.z);
        if (lyra.userData.imported) lyra.userData.play('Spell_Simple_Shoot', { speed: 0.8 });
        sfx('ice'); c.pont.visible = true; c.pont.scale.set(1, 0.05, 0.05);
        await tween(1100, (k) => { c.pont.scale.set(1, 0.05 + 0.95 * k, 0.05 + 0.95 * k); });
        sfx('shatter'); c.mur.off = true; F()[cle] = 1; E.unshot();
        if (i === 0) await talk([['LYRA', "La lave fige en basalte. Ça tiendra... un moment. Passez vite."]]);
        save();
      } });
    });

    // ----- Ignis -----
    let ignis = null;
    if (!F().v6_ignis) {
      ignis = makeEnemyModel('ignis'); st.add(ignis, S.ignis.x, S.ignis.z, 0);
      st.trigger({ x1: -9, x2: 9, z1: S.seuil - 3, z2: S.seuil, once: true, cond: () => !F().v6_ignis, action: async () => {
        const { kael } = P();
        await E.walk(kael, 0, -91.5, 2.6); E.face(kael, 0, -99);
        E.shot([6, 2.6, -89], [0, 2.6, -99]); music('');
        await talk([
          ['', "Une rotonde de marbre rouge. Autour de l'autel, une salamandre de flammes déroule ses anneaux."],
          ['IGNIS', "Encore des mains qui veulent prendre. Les Sept nous avaient promis mille ans de silence."],
          ['KAEL', "D'autres arrivent derrière nous. Ils ne demanderont pas."],
          ['IGNIS', "Alors montre-moi que tu brûles pour quelque chose."],
        ]);
        E.unshot();
        await fight(['ignis'], { arena: 'autel_feu', story: true, canFlee: false, music: 'boss', intro: 'Ignis, la Salamandre, se dresse !', onStart: async (api) => {
          await api.msg("Ignis est de <b>Feu</b> : elle craint l'<b>Eau</b>. Le feu de Lyra, lui, ne lui fait presque rien.", 2800);
          await api.msg("Quand elle recule vers la lave pour s'y <b>baigner</b>, un coup de <b>Givre</b> l'en empêche.", 2800);
        } });
        F().v6_ignis = 1;
        E.shot([4.5, 2.2, -92], [0, 1.2, -99]);
        ignis.userData.pose = true; sfx('vanish');
        await tween(1500, (k) => { ignis.scale.setScalar(1 - k * 0.86); });
        await talk([
          ['', "La salamandre se replie sur elle-même, jusqu'à n'être plus qu'une flamme grande comme la main."],
          ['IGNIS', "Prends l'Éclat. Et souviens-toi de moi, petit forgeron. Un jour, tu auras besoin d'un feu que les hommes ne savent pas allumer."],
        ]);
        st.remove(ignis);
        const flamme = makeFire(0.5, false); st.add(flamme, S.ignis.x, S.ignis.z, 0, 0.1);
        E.unshot(); music(st.music); setObjective("Prendre l'Éclat de Feu sur l'autel"); save();
      } });
    } else st.add(makeFire(0.5, false), S.ignis.x, S.ignis.z, 0, 0.1);

    // ----- L'Éclat de Feu, puis Grom -----
    st.interact({ x: S.autel.x, z: S.autel.z + 1.6, r: 2.8, label: "Prendre l'Éclat de Feu", cond: () => !!F().v6_ignis && !F().v6_grom, action: async () => {
      const { kael, lyra, nyssa, borin } = P();
      if (!F().v6_eclat) {
        E.shot([3.6, 2.6, -99.4], [0, 2.2, -105.4]); music('');
        await talk([['', "Une braise taillée flotte au-dessus de l'autel. Elle ne brûle pas la main de Kael."]]);
        sfx('levelup'); await tween(1000, (k) => { S.eclatObj.scale.setScalar(1 - 0.8 * k); S.eclatObj.position.z = -105.4 + 1.6 * k; });
        st.remove(S.eclatObj);
        give('eclat_feu'); F().v6_eclat = 1;
        await talk([['', "Le pendentif s'échauffe. Kael voit une forge immense, sept marteaux, une couronne qu'on martèle... puis plus rien."], ['LYRA', "Deux sur sept. Maître Aldric a dit de les garder sur nous."]]);
      }
      // le mur explose
      sfx('explosion'); E.shot([5.5, 2.6, -101], [S.breche.x, 2, S.breche.z]);
      const gravats = []; for (let i = 0; i < 6; i++) { const r = makeRock(0.5 + i * 0.12, 0x5a3a30); st.add(r, S.breche.x + 1, S.breche.z + (i - 3) * 0.5); gravats.push(r); }
      const grom = makeChar('grom'); st.add(grom, S.breche.x + 0.5, S.breche.z, PI / 2);
      await tween(700, (k) => gravats.forEach((r, i) => { r.position.x = S.breche.x + 1 + k * (1.5 + i * 0.5); r.position.y = Math.sin(k * PI) * 1.2; }));
      await E.walk(grom, -3.4, -98, 2.4); E.face(grom, kael.position.x, kael.position.z);
      for (const o of [kael, lyra, nyssa, borin]) if (o) E.face(o, -3.4, -98);
      music('danger');
      await talk([
        ['', "Le mur explose. Un géant en armure de pierre entre par la brèche, une masse sur l'épaule."],
        ['GROM', "Tiens. On m'a mâché le travail. Pose l'Éclat, petit, et je te casse un seul bras."],
        ['BORIN', "Derrière moi, tous."], ['GROM', "Un bouclier de Solméria ! J'en ai une collection."],
      ]);
      E.unshot();
      await fight(['grom'], { arena: 'autel_feu', story: true, canFlee: false, music: 'boss', intro: 'Grom le Briseur lève sa masse !', onStart: async (api) => {
        await api.msg("Grom est de <b>Terre</b> : il craint le <b>Vent</b>. Son <b>Briseur</b> ignore la Défense.", 2600);
      }, onRoundEnd: async (api) => {
        const g = api.enemies[0];
        if (g.hp > 0 && g.hp <= g.maxHp / 2) { await api.msg("Grom recule d'un pas... et éclate de rire.", 1600); api.end('stop'); }
      } });
      xpTous(1800); F().v6_grom = 1;
      E.shot([4.5, 2.4, -95], [-3.4, 2, -98]);
      await talk([['GROM', "Vous tapez comme des adultes. Ça me plaît ! On remet ça quand vous aurez grandi."]]);
      if (grom.userData.imported) grom.userData.play('Sword_Attack', { speed: 0.8 });
      await sleep(500); sfx('quake'); sfx('explosion');
      await tween(900, (k) => { E.camera.position.y += Math.sin(k * 60) * 0.05; });
      await talk([['', "Sa masse frappe le sol. Le marbre se fend d'un mur à l'autre. La lave monte par les fissures."], ['BORIN', "La sortie ! Courez ! COUREZ !"]]);
      E.unshot();
      await fade(true, 500);
      await goPhase('ch6_fuite');
    } });

    st.trigger({ x1: -3, x2: 3, z1: 6.8, z2: 8.4, once: false, action: async () => {
      const { kael } = P();
      await fade(true, 500); F().b5_ou = 'volcan'; await goPhase('ch5_brasegarde');
    } });

    // ----- Arrivée -----
    const pos = F().pos || { x: 0, z: 4.6 };
    enter(st, { x: pos.x, z: pos.z, ry: PI, yaw: 0 });
    setObjective(F().v6_ignis ? "Prendre l'Éclat de Feu sur l'autel" : 'Descendre jusqu\'au sanctuaire du Feu');
    if (!F().ch6_intro) {
      await chapterCard('Chapitre 6', 'Le Cœur du Volcan');
      await fade(false, 700);
      F().ch6_intro = 1;
      await niveauMin(11, "Deux jours à Brasegarde. Les nains ne savent pas s'entraîner doucement.");
      await talk([['BORIN', "On étouffe. Restez près des alcôves fraîches tant qu'on n'a rien pour se couvrir."], ['LYRA', "Des créatures de feu partout. Mon givre va servir. Mes flammes, beaucoup moins."]]);
      hint("Tout ce qui vit ici est de <b>Feu</b> : utilisez l'<b>Éclat de Givre</b> et les <b>Fioles de givre</b>.");
      setTimeout(() => hint(null), 9000);
      save();
    } else await fade(false, 600);
  }

  // ============================================================
  //  LA FUITE CHRONOMÉTRÉE
  // ============================================================
  async function ch6_fuite() {
    const st = buildVolcan(true), S = st.spots;
    let reste = DUREE_FUITE, actif = false, dernier = -1;
    const depart = () => {
      const { kael } = P();
      kael.position.set(0, 0, -84); kael.rotation.y = 0; E.followers.forEach((f, i) => f.position.set((i - 1) * 1.1, 0, -86));
      E.camYaw = PI; E.snapCamera(); reste = DUREE_FUITE; dernier = -1; actif = true;
    };
    tic(st, (dt) => {
      if (!actif || E.busy || !E.enabled) return;
      reste -= dt;
      const s = Math.max(0, Math.ceil(reste));
      if (s !== dernier) { dernier = s; setObjective(`FUYEZ vers la sortie, au sud ! <b>${s} s</b>`); if (s <= 10 && s > 0) sfx('windup'); }
      if (reste <= 0) {
        actif = false;
        E.run(async () => {
          sfx('explosion'); await fade(true, 500);
          await narrate(["La lave vous coupe la route...\nLe pendentif brûle, et le temps revient en arrière. Recommencez la fuite."]);
          depart(); await fade(false, 500);
        });
      }
    });
    st.trigger({ x1: -4, x2: 4, z1: 5, z2: 8.4, once: true, action: async () => {
      actif = false; F().v6_fuite = 1; sfx('quake');
      await fade(true, 700);
      await narrate(["Derrière vous, la galerie s'effondre dans un grondement.\nVous êtes vivants. Tous les quatre.", "Brasegarde. Le soir même."]);
      await goPhase('ch6_banquet');
    } });
    enter(st, { x: 0, z: -84, ry: 0, yaw: PI });
    depart(); actif = false;
    setObjective('FUYEZ vers la sortie, au sud !');
    await fade(false, 500);
    await talk([['NYSSA', "Les ponts de Lyra tiennent encore ! Par là !"]]);
    hint(`Courez vers le <b>sud</b>. Vous avez <b>${DUREE_FUITE} secondes</b>.`); setTimeout(() => hint(null), 6000);
    actif = true;
  }

  // ============================================================
  //  LE BANQUET
  // ============================================================
  async function ch6_banquet() {
    const st = buildBrasegarde({ banquet: true }), S = st.spots;
    brancherMaisons(st, T);
    const durgana = npc(st, 'durgana', 'durgana', 0, -34, 0);
    S.convives.forEach((n, i) => npc(st, 'cv' + i, n.k, n.x, n.z, n.ry));
    S.gardes.forEach((g, i) => npc(st, 'gd' + i, 'garde_nain', g.x, g.z, 0));
    enter(st, { x: 0, z: -29, ry: PI, yaw: 0 });
    const { kael, lyra, nyssa, borin } = P();
    lyra.position.set(-1.2, 0, -28.2); if (nyssa) nyssa.position.set(1.2, 0, -28); if (borin) borin.position.set(0.2, 0, -27);
    for (const f of E.followers) { f.userData.stay = true; f.rotation.y = PI; }
    healParty(); setObjective(''); music('cite');
    E.shot([4.6, 3.2, -24.5], [0, 1.4, -33], true);
    await fade(false, 900);
    await talk([
      ['', "Deux longues tables, de la bière brune, du sanglier, et deux cents nains qui tapent du poing en cadence."],
      ['NYSSA', "Borin. Tu souris."], ['BORIN', "Non."], ['LYRA', "Si. Je l'ai vu aussi."],
      ['DURGANA', "Silence ! ... Ces quatre grands ont cassé la machine et tenu tête au Briseur. Ignis elle-même leur a donné l'Éclat."],
      ['DURGANA', "Les nains ont une dette. Le jour où tu auras besoin de nos marteaux, envoie un mot."],
      ['KAEL', "Je m'en souviendrai."],
    ]);
    sfx('levelup'); toast("<b>Serment des nains</b> : Brasegarde répondra à l'appel.");
    F().serment_nains = 1;
    // Aldric dans le Miroir
    E.shot([kael.position.x + 1.8, 1.9, kael.position.z + 2.4], [kael.position.x, 1.4, kael.position.z]);
    music(''); sfx('save');
    await talk([
      ['', "Dans le sac de Kael, le Miroir de Scrutation se met à luire. Le visage d'Aldric y apparaît, comme au fond d'un puits."],
      ['ALDRIC', "Deux Éclats. Vous avancez plus vite que l'Empire, mes enfants. Gardez-les sur vous, comme je vous l'ai dit."],
      ['ALDRIC', "Le troisième est celui de l'Eau. Un temple englouti, au large de Port-Azur, sur la côte ouest."],
      ['NYSSA', "... Port-Azur."], ['LYRA', "Tu connais ?"], ['NYSSA', "J'y suis née. Et j'y dois de l'argent à peu près à tout le monde."],
      ['ALDRIC', "Il vous faudra un navire. Hâtez-vous. Le Conseil de l'Empire s'impatiente... dit-on."],
    ]);
    F().ch6_fin = 1; F().b5_ou = 'reine';
    for (const f of E.followers) f.userData.stay = false;
    E.unshot();
    await fade(true, 900);
    music('title');
    await chapterCard('Fin du chapitre 6', 'À suivre : Chapitre 7 — Les Mouettes Noires');
    await goPhase('ch5_brasegarde');
  }

  return { ch6_volcan, ch6_fuite, ch6_banquet };
}
