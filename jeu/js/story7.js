// ============================================================
//  HISTOIRE — CHAPITRE 7 : LES MOUETTES NOIRES
//  Port-Azur, la capitaine Morgane et la Vouivre, l'orphelinat et Tim, la proposition de la guilde (choix),
//  l'entrepôt de nuit (rondes de gardes à éviter), Varek le Balafré, le départ.
//  (dialogues repris du script « 01_Acte1_Chapitres_01-10.md », chapitre 7)
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { E } from './engine.js';
import { G, save, healParty, hero, gainXP, xpForNext } from './state.js';
import { sleep, talk, choose, toast, setObjective, hint, fade, narrate, chapterCard } from './ui.js';
import { sfx, music } from './audio.js';
import { buildPortAzur, buildEntrepot } from './world7.js';
import { tic } from './world5.js';
import { brancherMaisons } from './interieurs.js';
import { makeChar } from './models.js';
import { or, niveauMin, boutique } from './story5.js';

const PI = Math.PI;
const F = () => G.flags;

export function chapter7(T) {
  const { enter, goPhase, fight, give, chest, reader, statue, tween, npc } = T;
  const P = () => T.party();

  // ============================================================
  //  PORT-AZUR
  // ============================================================
  async function ch7_port() {
    const st = buildPortAzur(), S = st.spots;
    brancherMaisons(st, T);                         // les maisons du port et l'orphelinat s'ouvrent
    statue(st, S.statue);
    reader(st, S.pancarte, 'Lire la pancarte', [['PANCARTE', "« Orphelinat de la Marée. Pension : quarante pièces par mois. Les dons se glissent sous la grille. »"]]);
    const lignes = [
      [['MARIN', "Trois mois sans prendre la mer. Les Mouettes Noires ont mon gouvernail. Elles ont celui de tout le monde."]],
      [['MARIN', "Varek le Balafré ? Ne dis pas ce nom si fort. Son entrepôt est à l'est du quai. La nuit, il y a des rondes."]],
      [['MARIN', "Le temple englouti ? Mon grand-père disait qu'on voit ses colonnes par temps clair. Et qu'on entend chanter dessous."]],
      [['FEMME DU PORT', "La petite Nyssa est revenue ? Elle volait des figues à mon étal. Elle les donnait aux gamins de la Marée."]],
      [['HOMME DU PORT', "Port-Azur, la ville aux cent couleurs ! Et aux cent impôts, si on compte ceux de la guilde."]],
    ];
    S.marins.forEach((n, i) => npc(st, 'mar' + i, n.k, n.x, n.z, n.ry, i < 3 ? 'au marin' : 'à cette personne', async () => { await talk(lignes[i]); }));
    npc(st, 'poiss', 'poissonniere', S.poissonniere.x, S.poissonniere.z, 0, 'à la marchande', async () => {
      await boutique("L'Étal de la Marée — remèdes et fioles", ['potion', 'potion_plus', 'ether', 'antidote', 'fiole_orage', 'fiole_givre', 'fiole_braise', 'fumigene', 'tente']);
    });
    npc(st, 'armur', 'marin', S.armurier.x, S.armurier.z, 0, "à l'armurier", async () => {
      await boutique('Au Sabre Franc — armes de la côte', ['sabre_corsaire', 'baton_corail', 'stylets_azur', 'veste_ecailles']);
    });

    // ----- Morgane -----
    const morgane = npc(st, 'morgane', 'morgane', S.morgane.x, S.morgane.z, PI, 'à la capitaine Morgane', async () => {
      const { kael, nyssa } = P();
      if (!F().p7_morgane) {
        E.shot([6.5, 2.6, -8.5], [1.4, 1.5, -12.6]);
        await talk([
          ['CAPITAINE MORGANE', "La Vouivre est le meilleur navire de cette côte, et elle pourrit à quai depuis trois mois. Rendez-moi mon gouvernail et je vous emmène au bout du monde."],
          ['BORIN', "Qui l'a pris ?"],
          ['CAPITAINE MORGANE', "Varek le Balafré. Demandez à votre amie. Elle le connaît bien."],
          ['', "Kael se retourne. Nyssa n'est plus là."],
          ['LYRA', "Elle était derrière moi il y a une seconde."], ['BORIN', "Elle est partie vers l'ouest. Kael, va voir. Seul. Nous, on fait trop de bruit."],
        ]);
        E.unshot(); F().p7_morgane = 1; cacherNyssa();
        setObjective("Retrouver Nyssa : elle est partie vers l'ouest du port"); save();
      } else if (!F().p7_varek) await talk([['CAPITAINE MORGANE', F().p7_choix ? "L'entrepôt de Varek est à l'est du quai. Si vous en ressortez, je hisse les voiles." : "Mon gouvernail, et on part. Pas avant."]]);
      else if (!F().ch7_fin) await depart();
      else await talk([['CAPITAINE MORGANE', "On appareille quand vous voulez. Montez par la jetée."]]);
    });

    // ----- Nyssa s'éclipse : orphelinat -----
    let nyssaPnj = null, tim = null;
    // Nyssa a filé ; Borin l'a dit : « Kael, va voir. Seul. » Lyra et Borin restent donc où ils sont, et Kael part sans eux.
    // (Avant, ils le suivaient quand même, et Borin, qui suit Nyssa dans la file, partait tout seul vers le coin où elle était rangée.)
    const attendre = (oui) => { const { lyra, borin } = P(); for (const o of [lyra, borin]) if (o) o.userData.stay = oui; };
    const cacherNyssa = () => {
      const { nyssa } = P(); if (nyssa) { nyssa.visible = false; nyssa.userData.stay = true; nyssa.position.set(-40, 0, 40); }
      attendre(true);
      if (!nyssaPnj) { nyssaPnj = makeChar('nyssa'); st.add(nyssaPnj, S.nyssa.x, S.nyssa.z, -PI / 2); }
    };
    tim = npc(st, 'tim', 'tim', S.tim.x, S.tim.z, PI / 2, 'à Tim', async () => {
      if (!F().p7_tim) await talk([['GARÇON', "Je parle pas aux inconnus. Sauf s'ils ont des figues."]]);
      else if (!F().ch7_fin) await talk([['TIM', "Tu vas vraiment battre Varek ? Il a une cicatrice grande comme ça. Et il rit jamais."]]);
      else await talk([['TIM', "Mousse sur l'Hirondelle ! J'ai déjà appris trois nœuds. Dis à Nyssa que je travaille mes lettres."]]);
    });
    st.trigger({ x1: -21, x2: -14.5, z1: 0, z2: 8, once: true, cond: () => !!F().p7_morgane && !F().p7_tim, action: async () => {
      const { kael, nyssa } = P();
      await E.walk(kael, -17.6, 5.2, 2.2); E.face(kael, S.nyssa.x, S.nyssa.z);
      E.shot([-17, 2.4, 9.5], [-21.4, 1.2, 4]);
      await talk([
        ['', "À la grille de l'orphelinat, Nyssa glisse une bourse à un garçon d'une dizaine d'années."],
        ['TIM', "Tu restes, cette fois ?"], ['NYSSA', "Bientôt, moustique. Tu manges bien ? Tu travailles tes lettres ?"],
        ['TIM', "Les grands de Varek sont venus. Ils ont dit que tu leur devais de l'argent."],
      ]);
      E.face(nyssaPnj, kael.position.x, kael.position.z);
      await talk([
        ['', "Nyssa se retourne. Elle voit Kael."],
        ['NYSSA', "Tu espionnes, maintenant ?"], ['KAEL', "C'est pour lui, le pendentif. Tout ce que tu voles."],
        ['NYSSA', "La pension coûte quarante pièces par mois. Les honnêtes gens gagnent ça en un an."],
        ['NYSSA', "... Si tu répètes ça aux autres, je t'égorge."],
        ['KAEL', "Je ne dirai rien. Mais on va chercher ce gouvernail ensemble."],
      ]);
      F().p7_tim = 1;
      // ----- La proposition de la guilde -----
      const mess = makeChar('messager'); st.add(mess, S.messager.x, S.messager.z, -PI / 2);
      await E.walk(mess, -18.4, 6.6, 3); E.face(mess, S.nyssa.x, S.nyssa.z); E.face(nyssaPnj, -18.4, 6.6);
      E.shot([-15.4, 2.2, 3], [-19.6, 1.4, 5.6]); music('danger');
      await talk([
        ['MESSAGER', "Nyssa la Mouette. Varek te salue. Il sait ce que tu portes dans ton sac : deux cailloux qui valent un royaume."],
        ['MESSAGER', "Tu les lui apportes ce soir. Il efface ta dette. Et le petit, là, continue de grandir tranquille."],
      ]);
      const r = await choose("<b>NYSSA</b> — Que répondre au messager de la guilde ?", [
        { label: 'Refuser tout de suite', sub: "« Dis à Varek d'aller se faire pendre. »" },
        { label: "Faire semblant d'accepter", sub: "« Ce soir. Qu'il laisse la porte ouverte. »" },
      ]);
      F().p7_choix = r === 1 ? 'ruse' : 'refus';
      if (r === 1) await talk([
        ['NYSSA', "Ce soir. Qu'il laisse la porte ouverte."], ['MESSAGER', "Sage décision. Il t'attendra dans son bureau."],
        ['KAEL', "Nyssa..."], ['NYSSA', "Respire, forgeron. Je viens de nous obtenir une invitation. On entre par la porte, on sort avec le gouvernail."],
      ]);
      else await talk([
        ['NYSSA', "Dis à Varek d'aller se faire pendre. Et dis-lui que je viens chercher le gouvernail de Morgane."],
        ['MESSAGER', "Tu viens de signer pour deux, la Mouette. Toi et le gamin."],
        ['NYSSA', "... Kael. Ce soir. On passera par le toit : la porte, ils vont la garder."],
      ]);
      await E.walk(mess, S.messager.x + 6, S.messager.z + 6, 4.5); st.remove(mess);
      st.remove(nyssaPnj); nyssaPnj = null;
      if (nyssa) { nyssa.visible = true; nyssa.userData.stay = false; nyssa.position.set(kael.position.x - 1, 0, kael.position.z + 0.6); nyssa.userData.gy = undefined; }
      attendre(false);                                          // Lyra et Borin rejoignent Kael
      E.unshot(); music(st.music);
      setObjective("Entrer dans l'entrepôt des Mouettes Noires, à l'est du quai"); save();
    } });

    // ----- L'entrepôt -----
    st.interact({ x: S.entrepot.x, z: S.entrepot.z, r: 2.8, label: "Examiner la porte de l'entrepôt", action: async () => {
      if (F().p7_varek) { await talk([['', "La garde du port a posé des scellés sur la porte."]]); return; }
      if (!F().p7_choix) { await talk([['', "Une lourde porte, une mouette noire peinte au-dessus. Deux hommes vous regardent sans un mot."], ['BORIN', "Pas en plein jour. Et pas sans savoir ce qu'on cherche."]]); return; }
      const r = await choose("Attendre la nuit et entrer dans l'<b>entrepôt</b> ?", [{ label: 'Attendre la nuit', sub: "L'équipe sera soignée avant d'entrer" }, { label: 'Pas encore' }], { cancel: true });
      if (r !== 0) return;
      await fade(true, 800); healParty();
      await narrate([F().p7_choix === 'ruse' ? "La nuit tombe sur Port-Azur.\nLa porte de l'entrepôt est entrouverte, comme promis. Personne ne remarque les trois ombres derrière Nyssa." : "La nuit tombe sur Port-Azur.\nNyssa trouve la lucarne du toit du premier coup. Elle n'a pas oublié."]);
      await goPhase('ch7_entrepot');
    } });

    // ----- Le départ (après Varek) -----
    const depart = async () => {
      const { kael, nyssa } = P();
      E.shot([6.5, 2.6, -8.5], [1.4, 1.5, -12.6]);
      await talk([
        ['', "Kael pose le gouvernail sur le quai. Morgane le regarde longtemps, sans rien dire."],
        ['CAPITAINE MORGANE', "Trois mois. ... Bien. J'ai dit le bout du monde, et je n'ai qu'une parole."],
      ]);
      if (G.inv.gouvernail) { delete G.inv.gouvernail; toast('Le <b>gouvernail</b> est rendu à Morgane.'); }
      await talk([
        ['CAPITAINE MORGANE', "Le gamin de la Marée. J'ai un ami, capitaine de l'Hirondelle : un marchand honnête, qui ne quitte pas le port. Il cherche un mousse."],
        ['NYSSA', "... Vous feriez ça ?"], ['CAPITAINE MORGANE', "Je le fais. Va lui dire."],
      ]);
      // Nyssa va le dire à Tim : on la voit devant lui, à la porte de l'orphelinat (avant, l'image montrait Tim seul pendant qu'elle parlait)
      await fade(true, 350);
      if (nyssa) { nyssa.visible = false; nyssa.userData.stay = true; }
      const adieu = makeChar('nyssa'); st.add(adieu, S.nyssa.x, S.nyssa.z, -PI / 2); E.face(adieu, S.tim.x, S.tim.z); E.face(tim, S.nyssa.x, S.nyssa.z);
      E.shot([-17.4, 2.1, 9.2], [-20.6, 1.15, 5.8]); await fade(false, 350);
      await talk([['TIM', "Tu reviens quand ?"], ['NYSSA', "Quand j'aurai sauvé le monde, paraît-il. Ça ne devrait pas être long."]]);
      await fade(true, 350); st.remove(adieu);
      if (nyssa) { nyssa.visible = true; nyssa.userData.stay = false; }
      E.shot([6.5, 2.6, -8.5], [1.4, 1.5, -12.6]); await fade(false, 350);
      const n = hero('nyssa'); let appris = false;
      if (n) { while (n.level < 14) { gainXP(n, xpForNext(n.level) - n.xp); appris = true; } }
      sfx('levelup');
      await talk([['', "Dans le bureau de Varek, Nyssa a retrouvé son vieux sachet de poudre de phare.\nElle connaît désormais <b>Poudre Aveuglante</b> : étourdit tous les ennemis." + (appris ? "\nNyssa : niveau 14." : '')]]);
      F().ch7_fin = 1; E.unshot(); healParty();
      await fade(true, 900);
      music('title');
      await chapterCard('Fin du chapitre 7', 'À suivre : Chapitre 8 — Le Temple Englouti');
      music(st.music);
      setObjective('Embarquer sur la Vouivre, au bout de la jetée'); save();
      await fade(false, 700);
    };
    st.interact({ x: S.passerelle.x, z: S.passerelle.z, r: 2.6, label: 'Embarquer sur la Vouivre', action: async () => {
      if (!F().ch7_fin) { await talk([['', "La Vouivre : trente mètres de chêne, deux mâts, et pas de gouvernail."]]); return; }
      const r = await choose("Prendre la mer vers le <b>temple englouti</b> ?", [{ label: 'Appareiller', sub: 'Chapitre 8 : pensez aux Fioles d\'orage' }, { label: 'Rester à quai' }], { cancel: true });
      if (r !== 0) return;
      await fade(true, 800);
      await narrate(["La Vouivre quitte Port-Azur toutes voiles dehors.\nSur le quai, un petit garçon agite les bras jusqu'à ce qu'on ne le voie plus."]);
      await goPhase('ch8_traversee');
    } });

    // ----- Arrivée -----
    const pos = F().pos || (F().p7_ou === 'entrepot' ? { x: 19, z: 1 } : { x: 0, z: 21 });
    enter(st, { x: pos.x, z: pos.z, ry: F().p7_ou === 'entrepot' ? -PI / 2 : PI, yaw: F().p7_ou === 'entrepot' ? PI / 2 : 0 });
    delete F().p7_ou;
    if (F().p7_morgane && !F().p7_tim) cacherNyssa();          // (partie reprise à ce moment : Nyssa est à l'orphelinat, les deux autres attendent)
    setObjective(F().ch7_fin ? 'Embarquer sur la Vouivre, au bout de la jetée' : F().p7_varek ? 'Rapporter le gouvernail à la capitaine Morgane' : F().p7_choix ? "Entrer dans l'entrepôt des Mouettes Noires, à l'est du quai" : F().p7_morgane ? "Retrouver Nyssa : elle est partie vers l'ouest du port" : 'Trouver un navire : parler aux capitaines du quai');
    if (!F().ch7_intro) {
      await chapterCard('Chapitre 7', 'Les Mouettes Noires');
      await fade(false, 700);
      F().ch7_intro = 1;
      await niveauMin(13, "Dix jours de route. Les cols, puis les collines, puis l'odeur du sel.");
      healParty();
      await talk([
        ['LYRA', "Oh ! Les maisons sont roses. Et jaunes. Et il y a des oiseaux qui crient."],
        ['NYSSA', "Des mouettes. Elles volent tout ce qui brille. On s'entend bien."],
        ['BORIN', "Il nous faut un navire. On demande aux capitaines, sur le quai."],
        ['NYSSA', "... Demandez sans moi. J'ai laissé quelques souvenirs dans cette ville."],
      ]);
      save();
    } else await fade(false, 600);
    if (F().p7_varek && !F().ch7_fin && !F().p7_matin) { F().p7_matin = 1; await talk([['BORIN', "La garde du port emmène Varek. Rapportons ce gouvernail à la capitaine."]]); }
  }

  // ============================================================
  //  L'ENTREPÔT, DE NUIT
  // ============================================================
  async function ch7_entrepot() {
    const st = buildEntrepot(), S = st.spots;
    statue(st, S.statue);
    chest(st, 'ent_a', S.coffres[0], PI / 2, async () => { give('potion_plus', 3); give('fumigene', 2); });
    chest(st, 'ent_b', S.coffres[1], -PI / 2, async () => { give('ether', 3); or(500); });

    // ----- Les rondes : un garde qui voit l'équipe donne l'alerte (combat) -----
    const PORTEE = 6.5, DEMI = 0.62;                       // portée du regard (m), demi-angle (rad)
    const cone = () => { const g = new THREE.BufferGeometry(), n = 10, v = [0, 0, 0]; for (let i = 0; i <= n; i++) { const a = -DEMI + (2 * DEMI * i) / n; v.push(Math.sin(a) * PORTEE, 0, Math.cos(a) * PORTEE); } g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); const idx = []; for (let i = 1; i <= n; i++) idx.push(0, i, i + 1); g.setIndex(idx); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffd040, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide })); m.position.y = 0.06; return m; };
    const cache = (x1, z1, x2, z2) => { for (let k = 1; k < 10; k++) { const x = x1 + (x2 - x1) * k / 10, z = z1 + (z2 - z1) * k / 10; for (const c of st.colliders) if (c.box && !c.off && x > c.x1 && x < c.x2 && z > c.z1 && z < c.z2) return true; } return false; };
    const gardes = S.rondes.map((r, i) => {
      if (F()['e7_g' + i]) return null;
      const o = makeChar(r.k); o.add(cone()); st.add(o, r.a[0], r.a[1], 0);
      return { o, r, i, vers: 1, pause: 0, vu: false };
    }).filter(Boolean);
    tic(st, (dt) => {
      if (E.busy || !E.enabled || !E.player) { for (const g of gardes) g.o.userData.moving = false; return; }
      const p = E.player.position;
      for (const g of gardes) {
        if (g.mort) continue;
        const but = g.vers > 0 ? g.r.b : g.r.a, dx = but[0] - g.o.position.x, dz = but[1] - g.o.position.z, d = Math.hypot(dx, dz);
        if (g.pause > 0) { g.pause -= dt; g.o.userData.moving = false; }
        else if (d < 0.15) { g.vers = -g.vers; g.pause = 1.4; }
        else { g.o.position.x += dx / d * 1.9 * dt; g.o.position.z += dz / d * 1.9 * dt; g.o.rotation.y = Math.atan2(dx, dz); g.o.userData.moving = true; }
        // le regard
        const vx = p.x - g.o.position.x, vz = p.z - g.o.position.z, dist = Math.hypot(vx, vz);
        let da = Math.atan2(vx, vz) - g.o.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
        if ((dist < 1.3 || (dist < PORTEE && Math.abs(da) < DEMI)) && !cache(g.o.position.x, g.o.position.z, p.x, p.z)) {
          g.mort = true;
          E.run(async () => {
            E.face(g.o, p.x, p.z); sfx('encounter');
            await talk([[g.r.k === 'lanceur' ? 'LANCEUSE DE COUTEAUX' : 'COUPE-JARRET', F().e7_alerte ? "Encore eux ! Par ici !" : "Hé ! Qui va là ? ALERTE !"]]);
            F().e7_alerte = 1;
            await fight(g.r.ennemis, { arena: 'entrepot', story: true, canFlee: false, intro: 'Les Mouettes Noires vous ont repérés !' });
            st.remove(g.o); F()['e7_g' + g.i] = 1; save();
          });
          break;
        }
      }
    });

    // ----- Varek -----
    let varek = null, lames = [];
    if (!F().e7_varek) {
      varek = npc(st, 'varek', 'varek', S.varek.x, S.varek.z, 0);
      lames = S.lames.map((l, i) => npc(st, 'lame' + i, 'lame_noire', l.x, l.z, 0));
      st.trigger({ x1: -10, x2: 10, z1: S.seuil - 2.6, z2: S.seuil, once: true, cond: () => !F().e7_varek, action: async () => {
        const { kael, nyssa } = P();
        await E.walk(kael, 0, -53.4, 2.6); E.face(kael, 0, -58);
        E.shot([4.6, 2.4, -52], [0, 1.5, -58]); music('');
        await talk([
          ['VAREK', "Ma petite mouette préférée. Tu m'apportes des cadeaux ?"],
          ['NYSSA', "Je t'apporte des amis. C'est nouveau pour moi aussi."],
          ['VAREK', "Des amis. Tu les vendras comme tu as vendu les autres. C'est moi qui t'ai appris."],
          ['NYSSA', "Tu m'as appris à voler. Eux, ils sont revenus me chercher dans un égout. Fais le calcul."],
          ['VAREK', F().p7_choix === 'ruse' ? "Tu m'avais promis deux cailloux. Je prendrai donc les cailloux, et ta langue." : "Tu as dit non à mon messager. Personne ne me dit non deux fois."],
        ]);
        E.unshot();
        await fight(['lame_noire', 'varek', 'lame_noire'], { arena: 'entrepot', story: true, canFlee: false, music: 'boss', intro: 'Varek le Balafré et ses Lames noires !', onStart: async (api) => {
          await api.msg("Varek est de <b>Vent</b> : il craint le <b>Feu</b> de Lyra. Ses lames empoisonnent : gardez des antidotes.", 2800);
        } });
        F().e7_varek = 1;
        for (const o of lames) st.remove(o);
        T.lieDown(varek, true);
        E.shot([4, 2.2, -54], [0, 0.8, -58]);
        await talk([
          ['VAREK', "... Tu frappes comme je t'ai appris."], ['NYSSA', "Non. Je frappe mieux. Borin, tu as des menottes dans ton barda ?"],
          ['BORIN', "Toujours."],
          ['', "Au mur, derrière le bureau : une roue de chêne cerclée de bronze. Le gouvernail de la Vouivre."],
        ]);
        E.unshot(); setObjective('Décrocher le gouvernail, au fond du bureau'); save();
      } });
    } else st.remove(S.gouvernail);
    st.interact({ x: 0, z: -63.4, r: 3, label: 'Décrocher le gouvernail', cond: () => !!F().e7_varek && !F().p7_varek, action: async () => {
      sfx('item'); st.remove(S.gouvernail); give('gouvernail');
      F().p7_varek = 1; healParty();
      await fade(true, 800);
      await narrate(["Au petit matin, la garde du port emmène Varek le Balafré, enchaîné.\nSur les quais, on ouvre les volets. Quelqu'un applaudit. Puis toute une rue."]);
      F().p7_ou = 'entrepot'; await goPhase('ch7_port');
    } });

    st.trigger({ x1: -2, x2: 2, z1: 6.8, z2: 8, once: false, action: async () => {
      const { kael } = P();
      const r = await choose("Ressortir de l'<b>entrepôt</b> ?", [{ label: 'Ressortir' }, { label: 'Rester' }], { cancel: true });
      if (r !== 0) { await E.walk(kael, 0, 4.6); return; }
      await fade(true, 500); F().p7_ou = 'entrepot'; await goPhase('ch7_port');
    } });

    // ----- Arrivée -----
    const pos = F().pos || { x: 0, z: 4.6 };
    enter(st, { x: pos.x, z: pos.z, ry: PI, yaw: 0 });
    setObjective(F().e7_varek ? 'Décrocher le gouvernail, au fond du bureau' : 'Traverser l\'entrepôt sans être vu, jusqu\'au bureau de Varek (au nord)');
    await fade(false, 600);
    if (!F().e7_intro) {
      F().e7_intro = 1;
      await talk([['NYSSA', "Des rondes. Quatre. Leurs lanternes éclairent devant eux : restez hors du cône, ou derrière les caisses."], ['BORIN', "Et s'ils nous voient ?"], ['NYSSA', "Alors on fait à ta manière, capitaine."]]);
      hint("Évitez le <b>cône de lumière</b> des gardes. Les piles de caisses vous cachent.");
      setTimeout(() => hint(null), 9000);
    }
  }

  return { ch7_port, ch7_entrepot };
}
