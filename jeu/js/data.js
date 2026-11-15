// ============================================================
//  DONNÉES DU JEU : éléments, héros, compétences, objets, ennemis
//  (valeurs issues de la bible du jeu)
// ============================================================

// Eau > Feu > Vent > Terre > Foudre > Eau ; Lumière <> Ombre
export const STRONG = { Eau: 'Feu', Feu: 'Vent', Vent: 'Terre', Terre: 'Foudre', Foudre: 'Eau', 'Lumière': 'Ombre', Ombre: 'Lumière' };

export function elemMult(el, target) {
  if (!el) return 1;
  if (target.weak && target.weak.includes(el)) return 1.5;
  if (target.resist && target.resist.includes(el)) return 0.5;
  if (target.element) {
    if (STRONG[el] === target.element) return 1.5;
    if (STRONG[target.element] === el) return 0.5;
    if (target.element === el) return 0.5;
  }
  return 1;
}

export const STAT_KEYS = ['hp', 'mp', 'atk', 'def', 'mag', 'res', 'vit', 'cha'];
export const STAT_LABELS = { hp: 'PV', mp: 'PM', atk: 'ATK', def: 'DEF', mag: 'MAG', res: 'RES', vit: 'VIT', cha: 'CHA' };

export const HEROES = {
  kael: {
    name: 'Kael', title: "Épéiste de l'Aube", color: '#6fa8ff',
    base: { hp: 32, mp: 10, atk: 12, def: 9, mag: 8, res: 8, vit: 10, cha: 5 },
    gain: { hp: 11, mp: 3, atk: 3.2, def: 2.4, mag: 2.2, res: 2.2, vit: 2.1, cha: 0.5 },
    skills: [[1, 'entaille'], [4, 'lueur'], [9, 'frappe_croisee'], [15, 'cri_ralliement'], [22, 'lame_tournoyante']],
  },
  lyra: {
    name: 'Lyra', title: "Mage d'Ysmère", color: '#ff9a5a',
    base: { hp: 24, mp: 18, atk: 6, def: 6, mag: 14, res: 11, vit: 9, cha: 6 },
    gain: { hp: 8, mp: 5, atk: 1.4, def: 1.6, mag: 3.6, res: 2.8, vit: 2.0, cha: 0.5 },
    skills: [[1, 'flammeche'], [3, 'eclat_givre'], [10, 'brasier'], [13, 'sommeil'], [20, 'blizzard']],
  },
  nyssa: {
    name: 'Nyssa', title: 'Voleuse de Solméria', color: '#e85a5a',
    base: { hp: 28, mp: 10, atk: 10, def: 7, mag: 6, res: 7, vit: 14, cha: 12 },
    gain: { hp: 9, mp: 3, atk: 2.9, def: 1.9, mag: 1.6, res: 1.9, vit: 3.0, cha: 1.0 },
    skills: [[1, 'fleche_rapide'], [1, 'larcin'], [7, 'rafale'], [10, 'lame_empoisonnee'], [14, 'poudre_aveuglante']],
  },
  borin: {
    name: 'Borin', title: 'Capitaine de la Garde', color: '#5a8ae0',
    base: { hp: 45, mp: 6, atk: 11, def: 14, mag: 4, res: 8, vit: 5, cha: 4 },
    gain: { hp: 14, mp: 2, atk: 2.8, def: 3.4, mag: 1.0, res: 2.0, vit: 1.3, cha: 0.4 },
    skills: [[1, 'coup_bouclier'], [5, 'provocation'], [10, 'rempart'], [16, 'fracas']],
  },
};

// ---------- Vocations du héros ----------
// Au tout début d'une partie, le joueur choisit le rôle de Kael dans l'équipe. La vocation fixe ses statistiques,
// ses compétences, son arme (modèle 3D, nom et bonus des armes qu'il trouvera) et l'allure de ses coups.
// « style » : mise en scène de l'attaque simple (celle de kael, borin, lyra ou nyssa).
export const CLASSES = {
  epeiste: {
    nom: 'Épéiste', role: 'Polyvalent', title: "Épéiste de l'Aube", weapon: 'sword', style: 'kael',
    desc: "Bon partout : frappe fort, encaisse correctement et soigne un peu. Le choix le plus simple.",
    base: { hp: 32, mp: 10, atk: 12, def: 9, mag: 8, res: 8, vit: 10, cha: 5 },
    gain: { hp: 11, mp: 3, atk: 3.2, def: 2.4, mag: 2.2, res: 2.2, vit: 2.1, cha: 0.5 },
    skills: [[1, 'entaille'], [4, 'lueur'], [9, 'frappe_croisee'], [15, 'cri_ralliement'], [22, 'lame_tournoyante']],
    armes: { epee_hagen: ['Épée de Hagen', 'atk'], epee_garde: ['Épée de la Garde', 'atk'] },
  },
  gardien: {
    nom: 'Gardien', role: 'Protecteur', title: "Gardien de l'Aube", weapon: 'mace', shield: true, style: 'borin',
    desc: "Beaucoup de PV et de défense, une masse et un bouclier. Attire les coups pour protéger l'équipe, mais agit en dernier.",
    base: { hp: 42, mp: 8, atk: 11, def: 13, mag: 5, res: 9, vit: 6, cha: 4 },
    gain: { hp: 14, mp: 2.4, atk: 2.9, def: 3.3, mag: 1.4, res: 2.4, vit: 1.4, cha: 0.4 },
    skills: [[1, 'coup_masse'], [4, 'lueur'], [8, 'defi'], [15, 'mur_de_fer'], [22, 'onde_de_choc']],
    armes: { epee_hagen: ['Masse de Hagen', 'atk'], epee_garde: ['Masse de la Garde', 'atk'] },
  },
  mage: {
    nom: 'Mage', role: 'Magie', title: "Mage de l'Aube", weapon: 'staff', style: 'lyra',
    desc: "Sorts de foudre et de lumière très puissants, beaucoup de PM et des soins de groupe. Fragile : peu de PV et de défense.",
    base: { hp: 25, mp: 18, atk: 6, def: 6, mag: 14, res: 11, vit: 9, cha: 5 },
    gain: { hp: 8.5, mp: 5, atk: 1.4, def: 1.7, mag: 3.6, res: 2.8, vit: 2.0, cha: 0.5 },
    skills: [[1, 'eclair'], [4, 'lueur'], [9, 'rayon_aube'], [15, 'benediction'], [22, 'orage']],
    armes: { epee_hagen: ['Bâton de Hagen', 'mag'], epee_garde: ['Sceptre de la Garde', 'mag'] },
  },
  eclaireur: {
    nom: 'Éclaireur', role: 'Rapide', title: "Éclaireur de l'Aube", weapon: 'dagger', style: 'nyssa',
    desc: "Deux dagues et une grande vitesse : joue avant les ennemis, frappe deux fois, empoisonne. Encaisse moins bien.",
    base: { hp: 28, mp: 10, atk: 11, def: 7, mag: 6, res: 7, vit: 14, cha: 9 },
    gain: { hp: 9.5, mp: 3, atk: 3.1, def: 2.0, mag: 1.7, res: 2.0, vit: 3.0, cha: 0.9 },
    skills: [[1, 'estoc_vif'], [4, 'lueur'], [9, 'double_lame'], [15, 'croc_venin'], [22, 'danse_lames']],
    armes: { epee_hagen: ['Dagues de Hagen', 'atk'], epee_garde: ['Dagues de la Garde', 'atk'] },
  },
};
export const CLASSE_DEFAUT = 'epeiste';
const BONUS_ARME = {};
// Met les données de Kael à l'heure de sa vocation (appelé au lancement d'une partie, nouvelle ou chargée)
export function appliquerClasse(id) {
  const c = CLASSES[id] || CLASSES[CLASSE_DEFAUT], k = HEROES.kael;
  k.title = c.title; k.base = c.base; k.gain = c.gain; k.skills = c.skills; k.style = c.style; k.classe = CLASSES[id] ? id : CLASSE_DEFAUT;
  for (const [arme, [nom, stat]] of Object.entries(c.armes)) {
    const e = EQUIP[arme]; if (!e) continue;
    if (BONUS_ARME[arme] == null) BONUS_ARME[arme] = e.atk;
    e.name = nom; delete e.atk; delete e.mag; e[stat] = BONUS_ARME[arme];
  }
  return c;
}

// kind : phys | mag | heal | buff | steal | taunt      first : agit toujours en premier
// kind : phys | mag | heal | buff      target : enemy | enemies | ally | allies | self
export const SKILLS = {
  entaille:        { name: 'Entaille', pm: 3, kind: 'phys', power: 130, target: 'enemy', desc: 'Coup puissant (130 %)' },
  lueur:           { name: 'Lueur', pm: 4, kind: 'heal', power: 30, scale: 1.5, target: 'ally', desc: 'Soigne un allié' },
  frappe_croisee:  { name: 'Frappe Croisée', pm: 6, kind: 'phys', power: 80, hits: 2, target: 'enemy', desc: 'Deux coups à 80 %' },
  cri_ralliement:  { name: 'Cri de Ralliement', pm: 8, kind: 'buff', buff: { atk: 1.25, turns: 3 }, target: 'allies', desc: "ATK de l'équipe +25 % (3 tours)" },
  lame_tournoyante:{ name: 'Lame Tournoyante', pm: 10, kind: 'phys', power: 110, target: 'enemies', desc: 'Frappe tous les ennemis' },
  flammeche:       { name: 'Flammèche', pm: 3, kind: 'mag', power: 130, element: 'Feu', target: 'enemy', status: { brulure: 0.3 }, desc: 'Feu sur un ennemi' },
  eclat_givre:     { name: 'Éclat de Givre', pm: 3, kind: 'mag', power: 130, element: 'Eau', target: 'enemy', status: { gel: 0.1 }, desc: 'Givre (Eau) sur un ennemi' },
  brasier:         { name: 'Brasier', pm: 8, kind: 'mag', power: 100, element: 'Feu', target: 'enemies', desc: 'Feu sur tous les ennemis' },
  sommeil:         { name: 'Sommeil', pm: 5, kind: 'mag', power: 0, target: 'enemy', status: { sommeil: 0.6 }, desc: 'Endort un ennemi (60 %)' },
  fleche_rapide:   { name: 'Flèche Rapide', pm: 3, kind: 'phys', power: 100, target: 'enemy', first: true, ranged: true, desc: 'Agit toujours en premier' },
  larcin:          { name: 'Larcin', pm: 2, kind: 'steal', target: 'enemy', desc: "Vole un objet à l'ennemi" },
  rafale:          { name: 'Rafale', pm: 5, kind: 'phys', power: 140, element: 'Vent', target: 'enemy', ranged: true, desc: 'Lame de vent sur un ennemi' },
  lame_empoisonnee:{ name: 'Lame Empoisonnée', pm: 6, kind: 'phys', power: 110, target: 'enemy', status: { poison: 0.5 }, desc: 'Coup à 110 %, empoisonne (50 %)' },
  poudre_aveuglante:{ name: 'Poudre Aveuglante', pm: 6, kind: 'mag', power: 0, target: 'enemies', status: { etourdi: 0.45 }, fx: 'sommeil', desc: 'Étourdit les ennemis (45 %)' },
  coup_bouclier:   { name: 'Coup de Bouclier', pm: 3, kind: 'phys', power: 110, target: 'enemy', status: { etourdi: 0.2 }, desc: 'Coup à 110 %, étourdit (20 %)' },
  provocation:     { name: 'Provocation', pm: 4, kind: 'taunt', turns: 2, target: 'self', desc: 'Les ennemis visent Borin (2 tours)' },
  rempart:         { name: 'Rempart', pm: 8, kind: 'buff', buff: { def: 1.3, turns: 3 }, target: 'allies', desc: "DEF de l'équipe +30 % (3 tours)" },
  fracas:          { name: 'Fracas Tellurique', pm: 10, kind: 'phys', power: 100, element: 'Terre', target: 'enemies', desc: 'Terre sur tous les ennemis' },
  blizzard:        { name: 'Blizzard', pm: 12, kind: 'mag', power: 110, element: 'Eau', target: 'enemies', desc: 'Givre sur tous les ennemis' },
  // --- Vocations de Kael (choisies au début d'une partie). « fx » : mise en scène empruntée à une autre compétence ---
  coup_masse:      { name: 'Coup de Masse', pm: 3, kind: 'phys', power: 125, target: 'enemy', status: { etourdi: 0.15 }, fx: 'coup_bouclier', desc: 'Coup à 125 %, étourdit (15 %)' },
  defi:            { name: 'Défi', pm: 4, kind: 'taunt', turns: 2, target: 'self', fx: 'provocation', desc: 'Les ennemis visent Kael (2 tours)' },
  mur_de_fer:      { name: 'Mur de Fer', pm: 8, kind: 'buff', buff: { def: 1.3, turns: 3 }, target: 'allies', fx: 'rempart', desc: "DEF de l'équipe +30 % (3 tours)" },
  onde_de_choc:    { name: 'Onde de Choc', pm: 10, kind: 'phys', power: 105, element: 'Terre', target: 'enemies', fx: 'fracas', desc: 'Terre sur tous les ennemis' },
  eclair:          { name: 'Éclair', pm: 3, kind: 'mag', power: 130, element: 'Foudre', target: 'enemy', status: { etourdi: 0.1 }, desc: 'Foudre sur un ennemi' },
  rayon_aube:      { name: "Rayon d'Aube", pm: 6, kind: 'mag', power: 155, element: 'Lumière', target: 'enemy', desc: 'Lumière sur un ennemi (155 %)' },
  benediction:     { name: 'Bénédiction', pm: 9, kind: 'heal', power: 22, scale: 1.2, target: 'allies', fx: 'lueur', desc: "Soigne toute l'équipe" },
  orage:           { name: 'Orage', pm: 11, kind: 'mag', power: 105, element: 'Foudre', target: 'enemies', desc: 'Foudre sur tous les ennemis' },
  estoc_vif:       { name: 'Estoc Vif', pm: 3, kind: 'phys', power: 110, target: 'enemy', first: true, desc: 'Agit toujours en premier (110 %)' },
  double_lame:     { name: 'Double Lame', pm: 5, kind: 'phys', power: 85, hits: 2, target: 'enemy', fx: 'frappe_croisee', desc: 'Deux coups à 85 %' },
  croc_venin:      { name: 'Croc de Venin', pm: 6, kind: 'phys', power: 110, target: 'enemy', status: { poison: 0.5 }, fx: 'lame_empoisonnee', desc: 'Coup à 110 %, empoisonne (50 %)' },
  danse_lames:     { name: 'Danse des Lames', pm: 10, kind: 'phys', power: 105, target: 'enemies', fx: 'lame_tournoyante', desc: 'Frappe tous les ennemis' },
};

export const ELEM_COLOR = { Feu: 0xff6a2a, Eau: 0x6ac8ff, Vent: 0x9af0a0, Terre: 0xc09a50, Foudre: 0xf7e85a, 'Lumière': 0xfff4c2, Ombre: 0x8a50d0 };

export const ITEMS = {
  herbe:        { name: 'Herbe de soin', desc: 'Rend 20 PV à un allié', price: 8, use: 'heal', value: 20, target: 'ally', field: true },
  potion:       { name: 'Potion', desc: 'Rend 50 PV à un allié', price: 20, use: 'heal', value: 50, target: 'ally', field: true },
  potion_sup:   { name: 'Potion supérieure', desc: 'Rend 200 PV', price: 120, use: 'heal', value: 200, target: 'ally', field: true },
  ether:        { name: 'Éther', desc: 'Rend 30 PM', price: 80, use: 'mp', value: 30, target: 'ally', field: true },
  fiole_braise: { name: 'Fiole de braise', desc: '120 dégâts de Feu', price: 60, use: 'dmg', value: 120, element: 'Feu', target: 'enemy' },
  fiole_givre:  { name: 'Fiole de givre', desc: "120 dégâts d'Eau", price: 60, use: 'dmg', value: 120, element: 'Eau', target: 'enemy' },
  antidote:     { name: 'Antidote', desc: 'Guérit le poison (en combat)', price: 15, use: 'cure', cures: 'poison', target: 'ally' },
  laissez_passer: { name: 'Laissez-passer royal', desc: 'Ouvre les portes du royaume. Signé du roi Aldemar.', use: 'key' },
  eclat_terre:  { name: 'Éclat de Terre', desc: "Un fragment de la Couronne d'Aube. Il pèse comme une montagne et bat comme un cœur.", use: 'key' },
  miroir:       { name: 'Miroir de Scrutation', desc: "Le miroir d'Aldric. Il montre les lieux et les ennemis que l'on a déjà vus.", use: 'key' },
  // --- chapitres 5 à 10 ---
  minerai_fer:  { name: 'Minerai de fer', desc: 'Du bon fer de Ferrecime. La forge de Brasegarde en fait une arme meilleure.', use: 'key' },
  cape_amiante: { name: "Capes d'amiante", desc: 'Tissées par les nains. Avec elles, la chaleur du volcan ne blesse plus.', use: 'key' },
  ordre_gris:   { name: 'Ordre du Conseiller Gris', desc: "« Par ordre du Conseiller Gris, l'Éclat de Feu avant la nouvelle lune. »", use: 'key' },
  eclat_feu:    { name: 'Éclat de Feu', desc: "Un fragment de la Couronne d'Aube. Il est tiède, et il ne brûle pas.", use: 'key' },
  gouvernail:   { name: 'Gouvernail de la Vouivre', desc: 'Confisqué par les Mouettes Noires. Morgane le veut.', use: 'key' },
  perle_souffle: { name: 'Perles de souffle', desc: "Une perle sous la langue, et l'on respire sous la mer.", use: 'key' },
  eclat_eau:    { name: "Éclat d'Eau", desc: "Un fragment de la Couronne d'Aube. On y entend la mer.", use: 'key' },
  pendentif:    { name: 'Pendentif de Kael', desc: 'Le pendentif de ta mère. Il tiédit parfois.', use: 'key' },
  tente:        { name: 'Tente', desc: "Soigne toute l'équipe (près d'une statue d'Aube)", price: 150, use: 'tent' },
  potion_plus:  { name: 'Grande potion', desc: 'Rend 150 PV à un allié', price: 70, use: 'heal', value: 150, target: 'ally', field: true },
  fiole_orage:  { name: "Fiole d'orage", desc: '160 dégâts de Foudre', price: 90, use: 'dmg', value: 160, element: 'Foudre', target: 'enemy' },
  fumigene:     { name: 'Fumigène', desc: 'Fuite garantie', price: 40, use: 'flee' },
};

export const EQUIP = {
  epee_hagen:      { name: 'Épée de Hagen', slot: 'weapon', atk: 5, who: ['kael'] },
  baton_noisetier: { name: 'Bâton de noisetier', slot: 'weapon', mag: 6, who: ['lyra'] },
  gilet_cuir:      { name: 'Gilet de cuir', slot: 'armor', def: 4, price: 80, who: ['kael'] },
  tunique_voyage:  { name: 'Tunique de voyage', slot: 'armor', def: 2, res: 3, price: 80, who: ['lyra'] },
  // --- Solméria (chapitre 3) ---
  epee_garde:      { name: 'Épée de la Garde', slot: 'weapon', atk: 9, price: 300, who: ['kael'] },
  baton_braise:    { name: 'Bâton de braise', slot: 'weapon', mag: 10, price: 350, who: ['lyra'] },
  cotte_mailles:   { name: 'Cotte de mailles', slot: 'armor', def: 8, price: 400, who: ['kael'] },
  robe_renforcee:  { name: 'Robe renforcée', slot: 'armor', def: 4, res: 7, price: 400, who: ['lyra'] },
  dagues_nyssa:    { name: 'Dagues jumelles', slot: 'weapon', atk: 5, who: ['nyssa'] },
  veste_ombre:     { name: 'Veste des toits', slot: 'armor', def: 3, vit: 2, who: ['nyssa'] },
  masse_borin:     { name: 'Masse du capitaine', slot: 'weapon', atk: 6, who: ['borin'] },
  armure_garde:    { name: 'Armure de la Garde', slot: 'armor', def: 7, res: 2, who: ['borin'] },
  // --- Sanctuaire de la Terre (chapitre 4) ---
  bouclier_granit: { name: 'Bouclier de granit', slot: 'ring', def: 6, res: 3, hp: 20, who: ['borin'] },
  dague_silex:     { name: 'Dagues de silex', slot: 'weapon', atk: 9, who: ['nyssa'] },
  anneau_vigueur:  { name: 'Anneau de vigueur', slot: 'ring', hp: 15, who: ['kael', 'lyra', 'nyssa', 'borin'] },
  // --- Brasegarde (chapitres 5 et 6) ---
  dague_brasegarde: { name: 'Dague de Brasegarde', slot: 'weapon', atk: 14, vit: 2, who: ['nyssa'] },
  epee_naine:      { name: 'Épée naine', slot: 'weapon', atk: 15, price: 700, who: ['kael'] },
  baton_rubis:     { name: 'Bâton de rubis', slot: 'weapon', mag: 16, price: 750, who: ['lyra'] },
  masse_naine:     { name: 'Masse de Ferrecime', slot: 'weapon', atk: 13, price: 700, who: ['borin'] },
  plastron_nain:   { name: 'Plastron nain', slot: 'armor', def: 14, price: 800, who: ['kael', 'borin'] },
  robe_salamandre: { name: 'Robe de salamandre', slot: 'armor', def: 7, res: 12, price: 800, who: ['lyra'] },
  // --- Port-Azur (chapitres 7 et 8) ---
  sabre_corsaire:  { name: 'Sabre de corsaire', slot: 'weapon', atk: 21, price: 1400, who: ['kael'] },
  baton_corail:    { name: 'Bâton de corail', slot: 'weapon', mag: 22, price: 1400, who: ['lyra'] },
  stylets_azur:    { name: "Stylets d'Azur", slot: 'weapon', atk: 19, vit: 3, price: 1300, who: ['nyssa'] },
  veste_ecailles:  { name: "Veste d'écailles", slot: 'armor', def: 12, res: 8, price: 1200, who: ['nyssa', 'lyra'] },
  // --- Le siège (chapitre 9) ---
  armure_garde_royale: { name: 'Armure de la Garde royale', slot: 'armor', def: 22, res: 6, who: ['kael'] },
  medaille_rempart: { name: 'Médaille du Rempart', slot: 'ring', def: 5, res: 5, hp: 30, who: ['kael', 'lyra', 'nyssa', 'borin'] },
};

// moves : kind phys|mag, power %, target one|all, w = poids (fréquence), windup = attaque annoncée un tour avant
export const ENEMIES = {
  loup: {
    name: 'Loup gris', model: 'loup', hp: 18, atk: 7, def: 4, mag: 0, res: 2, vit: 9, weak: ['Feu'], xp: 15, gold: 6,
    moves: [{ name: 'Morsure', kind: 'phys', power: 100, w: 1 }],
  },
  soldat: {
    name: 'Soldat de Cendre', model: 'soldat', hp: 35, atk: 11, def: 6, mag: 0, res: 4, vit: 8, xp: 25, gold: 20,
    moves: [{ name: "Coup d'épée", kind: 'phys', power: 100, w: 3 }, { name: 'Estoc', kind: 'phys', power: 125, w: 1 }],
    drop: ['potion', 0.5],
  },
  krall: {
    name: 'Sergent Krall', model: 'krall', boss: true, hp: 120, atk: 14, def: 8, mag: 0, res: 5, vit: 9, xp: 110, gold: 50,
    moves: [
      { name: "Coup d'épée", kind: 'phys', power: 100, w: 3 },
      { name: 'Charge', kind: 'phys', power: 230, w: 1.6, windup: 'Le sergent Krall recule et prend son élan !' },
    ],
  },
  gobelin: {
    name: 'Gobelin', model: 'gobelin', hp: 28, atk: 9, def: 5, mag: 0, res: 3, vit: 8, weak: ['Feu'], xp: 15, gold: 8,
    moves: [{ name: 'Coup de gourdin', kind: 'phys', power: 100, w: 3 }, { name: 'Morsure', kind: 'phys', power: 115, w: 1 }],
  },
  champignon: {
    name: 'Champignon hurleur', model: 'champignon', hp: 32, atk: 8, def: 6, mag: 8, res: 4, vit: 5, weak: ['Feu'], xp: 18, gold: 9,
    moves: [{ name: 'Coup de tête', kind: 'phys', power: 100, w: 2 }, { name: 'Cri strident', kind: 'mag', power: 60, target: 'all', w: 1 }],
  },
  luciole: {
    name: 'Luciole de braise', model: 'luciole', hp: 24, atk: 5, def: 3, mag: 10, res: 6, vit: 12, element: 'Feu', xp: 16, gold: 9,
    moves: [{ name: 'Étincelle', kind: 'mag', power: 100, element: 'Feu', w: 2 }, { name: 'Piqué', kind: 'phys', power: 110, w: 1 }],
  },
  troll: {
    name: 'Troll des Murmures', model: 'troll', boss: true, hp: 260, atk: 20, def: 10, mag: 0, res: 6, vit: 6, weak: ['Feu'], xp: 250, gold: 120, regen: 20,
    moves: [
      { name: 'Massue', kind: 'phys', power: 110, w: 3 },
      { name: 'Rocher lancé', kind: 'phys', power: 70, target: 'all', w: 2 },
    ],
  },
  // --- Égouts de Solméria (chapitre 3) ---
  // physRes : part des dégâts physiques réellement subie ; steal : [objet, chance de base] pour Larcin
  rat: {
    name: 'Rat géant', model: 'rat', hp: 40, atk: 13, def: 6, mag: 0, res: 4, vit: 12, weak: ['Feu'], xp: 22, gold: 10, steal: ['potion', 0.5],
    moves: [{ name: 'Morsure', kind: 'phys', power: 100, w: 3 }, { name: 'Dents sales', kind: 'phys', power: 85, status: { poison: 0.35 }, w: 1.5 }],
  },
  gelee: {
    name: 'Gelée verte', model: 'gelee', hp: 45, atk: 11, def: 7, mag: 11, res: 6, vit: 5, element: 'Eau', weak: ['Foudre'], physRes: 0.7, xp: 24, gold: 12, steal: ['antidote', 0.6],
    moves: [{ name: 'Écrasement', kind: 'phys', power: 100, w: 2 }, { name: 'Crachat acide', kind: 'mag', power: 80, status: { poison: 0.4 }, w: 1.5 }],
    drop: ['antidote', 0.35],
  },
  chauve_souris: {
    name: 'Chauve-souris', model: 'chauve_souris', hp: 30, atk: 12, def: 4, mag: 6, res: 5, vit: 16, element: 'Vent', weak: ['Feu'], xp: 20, gold: 9, steal: ['herbe', 0.6],
    moves: [{ name: 'Piqué', kind: 'phys', power: 100, w: 3 }, { name: 'Cri aigu', kind: 'mag', power: 55, target: 'all', w: 1 }],
  },
  roi_egouts: {
    name: 'Roi des Égouts', model: 'roi_egouts', boss: true, hp: 400, atk: 22, def: 10, mag: 15, res: 8, vit: 6, weak: ['Feu'], physRes: 0.5, xp: 420, gold: 200, steal: ['ether', 0.5],
    split: { at: 0.5, spawn: ['gelee', 'gelee'], text: 'Le Roi des Égouts se déchire en deux... Deux gelées en tombent !' },
    moves: [
      { name: 'Écrasement', kind: 'phys', power: 100, w: 3 },
      { name: 'Engloutir', kind: 'phys', power: 80, status: { etourdi: 1 }, w: 1.4 },
      { name: 'Jet acide', kind: 'mag', power: 70, target: 'all', status: { poison: 0.5 }, w: 1.6 },
    ],
  },
  // --- Collines de Granit et Sanctuaire de la Terre (chapitre 4) ---
  // moves de type « buff » : l'ennemi se renforce lui-même ({ def: 2, turns: 2 } = défense ×2 pendant 2 tours)
  serpent: {
    name: 'Vipère des collines', model: 'serpent', hp: 46, atk: 16, def: 6, mag: 0, res: 5, vit: 14, weak: ['Feu'], xp: 34, gold: 14, steal: ['antidote', 0.6],
    moves: [{ name: 'Morsure', kind: 'phys', power: 100, w: 3 }, { name: 'Crochets venimeux', kind: 'phys', power: 85, status: { poison: 0.45 }, w: 2 }],
  },
  guepe: {
    name: 'Guêpe géante', model: 'guepe', hp: 38, atk: 17, def: 5, mag: 0, res: 5, vit: 19, element: 'Vent', weak: ['Feu'], xp: 34, gold: 13, steal: ['herbe', 0.6],
    moves: [{ name: 'Dard', kind: 'phys', power: 105, w: 3 }, { name: 'Piqué', kind: 'phys', power: 125, w: 1 }],
  },
  araignee: {
    name: 'Araignée de granit', model: 'araignee', hp: 60, atk: 17, def: 13, mag: 0, res: 5, vit: 9, element: 'Terre', weak: ['Vent'], xp: 44, gold: 18, steal: ['potion', 0.5],
    moves: [{ name: 'Mandibules', kind: 'phys', power: 100, w: 3 }, { name: 'Jet de gravier', kind: 'phys', power: 60, target: 'all', element: 'Terre', w: 1.2 }],
  },
  esprit: {
    name: 'Esprit de granit', model: 'esprit', hp: 55, atk: 9, def: 8, mag: 17, res: 11, vit: 11, element: 'Terre', weak: ['Vent'], xp: 46, gold: 20, steal: ['ether', 0.4],
    moves: [{ name: 'Éclat de roche', kind: 'mag', power: 100, element: 'Terre', w: 3 }, { name: 'Poussière ancienne', kind: 'mag', power: 55, target: 'all', element: 'Terre', w: 1.2 }],
    drop: ['ether', 0.2],
  },
  eclaireur: {
    name: 'Éclaireur impérial', model: 'soldat', hp: 70, atk: 18, def: 9, mag: 0, res: 6, vit: 13, xp: 55, gold: 36, steal: ['fiole_braise', 0.4],
    moves: [{ name: 'Coup de sabre', kind: 'phys', power: 100, w: 3 }, { name: "Tir d'arbalète", kind: 'phys', power: 130, w: 1.2 }],
    drop: ['potion', 0.5],
  },
  golem: {
    name: 'Golem Gardien', model: 'golem', boss: true, hp: 650, atk: 25, def: 15, mag: 16, res: 9, vit: 5, element: 'Terre', weak: ['Vent'], xp: 700, gold: 300, steal: ['ether', 0.5],
    moves: [
      { name: 'Poing de pierre', kind: 'phys', power: 110, w: 3 },
      { name: 'Séisme', kind: 'phys', power: 65, target: 'all', element: 'Terre', w: 1.5, windup: 'Le Golem lève ses deux poings... Le sol va trembler !' },
      { name: 'Carapace', kind: 'buff', buff: { def: 2, turns: 2 }, w: 1.2, text: 'Sa pierre se resserre : sa défense double. La magie, elle, passe au travers !' },
    ],
  },
  // --- Chapitre 5 : le col de Ferrecime et les mines ---
  // move.cancel : élément qui interrompt l'attaque pendant qu'elle se prépare ; move.pierce : ignore la Défense ;
  // move.kind 'heal' : soigne « on » (clé d'un allié) ou soi-même ; invuln : chaque coup reçu ne fait que 1.
  loup_neige: {
    name: 'Loup des neiges', model: 'loup_neige', hp: 85, atk: 27, def: 10, mag: 0, res: 8, vit: 18, weak: ['Feu'], xp: 100, gold: 24, steal: ['potion', 0.5],
    moves: [{ name: 'Morsure', kind: 'phys', power: 100, w: 3 }, { name: 'Croc de givre', kind: 'phys', power: 90, element: 'Eau', status: { gel: 0.12 }, w: 1.2 }],
  },
  mineur: {
    name: 'Mineur impérial', model: 'mineur', hp: 95, atk: 29, def: 13, mag: 0, res: 8, vit: 11, xp: 110, gold: 45, steal: ['fiole_braise', 0.5],
    moves: [{ name: 'Coup de pioche', kind: 'phys', power: 100, w: 3 }, { name: 'Bâton de poudre', kind: 'phys', power: 58, target: 'all', element: 'Feu', w: 1.2 }],
    drop: ['potion', 0.5],
  },
  automate: {
    name: 'Automate foreur', model: 'automate', hp: 110, atk: 28, def: 20, mag: 22, res: 8, vit: 8, weak: ['Eau'], xp: 125, gold: 50, steal: ['ether', 0.4],
    moves: [{ name: 'Foret', kind: 'phys', power: 108, w: 3 }, { name: 'Jet de vapeur', kind: 'mag', power: 70, target: 'all', element: 'Feu', status: { brulure: 0.2 }, w: 1.2 }],
  },
  taraude: {
    name: 'La Taraude', model: 'taraude', boss: true, hp: 900, atk: 38, def: 18, mag: 44, res: 12, vit: 7, weak: ['Eau', 'Vent'], xp: 1500, gold: 500, steal: ['ether', 0.5],
    moves: [
      { name: 'Vrille', kind: 'phys', power: 150, w: 3 },
      { name: 'Éboulement', kind: 'phys', power: 62, target: 'all', element: 'Terre', w: 1.8 },
      { name: 'Surchauffe', kind: 'mag', power: 150, target: 'all', element: 'Feu', w: 1.5, windup: 'La chaudière de la Taraude vire au blanc... Elle va exploser ! Refroidissez-la avec du <b>Givre</b> !', cancel: 'Eau', cancelText: "Le givre saisit la chaudière : la pression retombe. <b>Surchauffe annulée !</b>" },
    ],
  },
  // --- Chapitre 6 : le volcan ---
  diablotin_lave: {
    name: 'Diablotin de lave', model: 'diablotin_lave', hp: 100, atk: 24, def: 12, mag: 33, res: 14, vit: 17, element: 'Feu', weak: ['Eau'], xp: 140, gold: 40, steal: ['fiole_braise', 0.6],
    moves: [{ name: 'Boule de feu', kind: 'mag', power: 100, element: 'Feu', w: 3 }, { name: 'Griffes', kind: 'phys', power: 100, w: 1.5 }],
  },
  chauve_ardente: {
    name: 'Chauve-souris ardente', model: 'chauve_ardente', hp: 90, atk: 31, def: 10, mag: 20, res: 12, vit: 23, element: 'Feu', weak: ['Eau'], xp: 130, gold: 36, steal: ['potion', 0.5],
    moves: [{ name: 'Piqué brûlant', kind: 'phys', power: 100, status: { brulure: 0.25 }, w: 3 }, { name: 'Cri aigu', kind: 'mag', power: 60, target: 'all', w: 1 }],
  },
  tortue: {
    name: 'Tortue magmatique', model: 'tortue', hp: 150, atk: 33, def: 30, mag: 28, res: 12, vit: 5, element: 'Feu', weak: ['Eau'], xp: 170, gold: 55, steal: ['ether', 0.4],
    moves: [{ name: 'Morsure', kind: 'phys', power: 110, w: 3 }, { name: 'Geyser', kind: 'mag', power: 65, target: 'all', element: 'Feu', w: 1.3 }, { name: 'Carapace', kind: 'buff', buff: { def: 2, turns: 2 }, w: 1, text: 'Elle rentre dans sa carapace : passez à la magie.' }],
  },
  ignis: {
    name: 'Ignis, la Salamandre', model: 'ignis', boss: true, hp: 1300, atk: 42, def: 18, mag: 46, res: 20, vit: 14, element: 'Feu', weak: ['Eau'], xp: 2200, gold: 600, steal: ['ether', 0.5],
    moves: [
      { name: 'Queue fouet', kind: 'phys', power: 120, w: 3 },
      { name: 'Souffle ardent', kind: 'mag', power: 72, target: 'all', element: 'Feu', status: { brulure: 0.35 }, w: 2 },
      { name: 'Bain de lave', kind: 'heal', heal: 150, w: 1.3, windup: "Ignis recule vers la coulée de lave... Elle va s'y baigner ! Le <b>Givre</b> peut l'en empêcher.", cancel: 'Eau', cancelText: "Le givre fige la coulée : <b>Ignis ne peut pas s'y baigner !</b>", text: 'Ignis ressort de la lave, ravivée.' },
    ],
  },
  grom: {
    name: 'Grom le Briseur', model: 'grom', boss: true, hp: 1000, atk: 46, def: 26, mag: 0, res: 14, vit: 9, element: 'Terre', weak: ['Vent'], xp: 0, gold: 0,
    moves: [
      { name: 'Coup de masse', kind: 'phys', power: 110, w: 3 },
      { name: 'Briseur', kind: 'phys', power: 80, pierce: true, w: 1.5 },
      { name: 'Onde de choc', kind: 'phys', power: 62, target: 'all', element: 'Terre', w: 1.5 },
    ],
  },
  // --- Chapitre 7 : Port-Azur ---
  coupe_jarret: {
    name: 'Coupe-jarret', model: 'coupe_jarret', hp: 130, atk: 37, def: 15, mag: 0, res: 12, vit: 18, xp: 190, gold: 70, steal: ['potion_plus', 0.4],
    moves: [{ name: 'Coup de surin', kind: 'phys', power: 100, w: 3 }, { name: 'Coup bas', kind: 'phys', power: 125, w: 1 }],
  },
  lanceur: {
    name: 'Lanceur de couteaux', model: 'lanceur', hp: 110, atk: 35, def: 12, mag: 0, res: 12, vit: 23, element: 'Vent', weak: ['Feu'], xp: 180, gold: 65, steal: ['fumigene', 0.5],
    moves: [{ name: 'Lancer de couteau', kind: 'phys', power: 100, w: 3 }, { name: 'Pluie de lames', kind: 'phys', power: 55, target: 'all', w: 1.2 }],
  },
  molosse: {
    name: 'Molosse de quai', model: 'molosse', hp: 140, atk: 39, def: 14, mag: 0, res: 10, vit: 19, weak: ['Feu'], xp: 190, gold: 40,
    moves: [{ name: 'Morsure', kind: 'phys', power: 100, w: 3 }, { name: 'Mâchoire', kind: 'phys', power: 128, w: 1 }],
  },
  lame_noire: {
    name: 'Lame noire', model: 'lame_noire', hp: 300, atk: 39, def: 18, mag: 0, res: 14, vit: 17, xp: 300, gold: 120, steal: ['potion_plus', 0.5],
    moves: [{ name: 'Sabre', kind: 'phys', power: 100, w: 3 }, { name: 'Croc-en-jambe', kind: 'phys', power: 85, status: { etourdi: 0.25 }, w: 1.2 }],
  },
  varek: {
    name: 'Varek le Balafré', model: 'varek', boss: true, hp: 1600, atk: 50, def: 22, mag: 0, res: 20, vit: 20, element: 'Vent', weak: ['Feu'], xp: 3000, gold: 900, steal: ['ether', 0.6],
    moves: [
      { name: 'Dague empoisonnée', kind: 'phys', power: 108, status: { poison: 0.5 }, w: 3 },
      { name: 'Coup bas', kind: 'phys', power: 90, status: { etourdi: 0.3 }, w: 1.5 },
      { name: 'Écran de fumée', kind: 'buff', buff: { def: 1.6, turns: 2 }, w: 1.2, text: 'La fumée le dérobe aux regards : les armes le touchent mal pendant deux tours.' },
    ],
  },
  // --- Chapitre 8 : la mer d'Émeraude et le temple englouti ---
  spectre: {
    name: 'Spectre noyé', model: 'spectre', hp: 150, atk: 30, def: 14, mag: 43, res: 22, vit: 15, element: 'Ombre', xp: 250, gold: 50, steal: ['ether', 0.4],
    moves: [{ name: 'Toucher glacé', kind: 'mag', power: 100, element: 'Ombre', w: 3 }, { name: 'Plainte des noyés', kind: 'mag', power: 52, target: 'all', element: 'Ombre', status: { sommeil: 0.12 }, w: 1.2 }],
  },
  meduse: {
    name: 'Méduse lanterne', model: 'meduse', hp: 130, atk: 34, def: 10, mag: 44, res: 24, vit: 13, element: 'Eau', weak: ['Foudre'], physRes: 0.8, xp: 240, gold: 55, steal: ['antidote', 0.6],
    moves: [{ name: 'Filaments', kind: 'phys', power: 95, status: { poison: 0.3 }, w: 2 }, { name: 'Lueur des abysses', kind: 'mag', power: 100, element: 'Eau', w: 2 }],
  },
  crabe: {
    name: 'Crabe cuirassé', model: 'crabe', hp: 190, atk: 43, def: 34, mag: 0, res: 14, vit: 8, element: 'Eau', weak: ['Foudre'], xp: 280, gold: 70, steal: ['potion_plus', 0.4],
    moves: [{ name: 'Pince', kind: 'phys', power: 110, w: 3 }, { name: 'Carapace', kind: 'buff', buff: { def: 1.8, turns: 2 }, w: 1, text: 'Sa cuirasse se referme : passez à la magie ou aux fioles.' }],
  },
  ondine: {
    name: 'Ondine, le Léviathan', model: 'ondine', boss: true, hp: 2200, atk: 46, def: 22, mag: 54, res: 26, vit: 15, element: 'Eau', weak: ['Foudre'], xp: 3800, gold: 1000, steal: ['ether', 0.6],
    moves: [
      { name: 'Coup de queue', kind: 'phys', power: 115, w: 3 },
      { name: 'Raz-de-marée', kind: 'mag', power: 78, target: 'all', element: 'Eau', w: 1.8, windup: "La mer se retire autour d'Ondine... Une vague immense se lève !" },
      { name: 'Bulle prison', kind: 'mag', power: 55, element: 'Eau', status: { etourdi: 1 }, w: 1.4 },
      { name: 'Chant des abysses', kind: 'mag', power: 25, target: 'all', status: { sommeil: 0.3 }, w: 1.1 },
    ],
  },
  // --- Chapitre 9 : le siège de Solméria ---
  fantassin: {
    name: 'Fantassin de Cendre', model: 'fantassin', hp: 200, atk: 46, def: 22, mag: 0, res: 14, vit: 14, xp: 320, gold: 80, steal: ['potion_plus', 0.4],
    moves: [{ name: "Coup d'épée", kind: 'phys', power: 100, w: 3 }, { name: 'Charge', kind: 'phys', power: 125, w: 1 }],
    drop: ['potion_plus', 0.3],
  },
  arbaletrier: {
    name: 'Arbalétrier de Cendre', model: 'arbaletrier', hp: 170, atk: 48, def: 16, mag: 0, res: 14, vit: 18, weak: ['Vent'], xp: 310, gold: 80, steal: ['fiole_braise', 0.5],
    moves: [{ name: 'Carreau', kind: 'phys', power: 105, w: 3 }, { name: 'Salve', kind: 'phys', power: 55, target: 'all', w: 1.2 }],
  },
  mage_guerre: {
    name: 'Mage de guerre', model: 'mage_guerre', hp: 160, atk: 20, def: 14, mag: 54, res: 24, vit: 15, element: 'Feu', weak: ['Eau'], xp: 330, gold: 90, steal: ['ether', 0.5],
    moves: [{ name: 'Trait de feu', kind: 'mag', power: 100, element: 'Feu', status: { brulure: 0.2 }, w: 3 }, { name: 'Pluie de braises', kind: 'mag', power: 58, target: 'all', element: 'Feu', w: 1.3 }],
  },
  saboteur: {
    name: 'Saboteur', model: 'saboteur', hp: 180, atk: 46, def: 16, mag: 0, res: 16, vit: 23, element: 'Ombre', xp: 320, gold: 90, steal: ['fumigene', 0.5],
    moves: [{ name: 'Lame courte', kind: 'phys', power: 100, w: 3 }, { name: 'Charge de poudre', kind: 'phys', power: 58, target: 'all', element: 'Feu', w: 1.2 }],
  },
  belier: {
    name: 'Bélier Infernal', model: 'belier', boss: true, hp: 2800, atk: 56, def: 28, mag: 44, res: 18, vit: 6, element: 'Feu', weak: ['Eau'], xp: 4500, gold: 1200,
    moves: [
      { name: 'Coup de boutoir', kind: 'phys', power: 110, w: 3 },
      { name: 'Charge du bélier', kind: 'phys', power: 66, target: 'all', w: 1.6, windup: 'Les servants reculent le Bélier Infernal... Il va charger !' },
      { name: 'Jet de poix', kind: 'mag', power: 85, element: 'Feu', status: { brulure: 0.5 }, w: 1.6 },
    ],
  },
  hesk: {
    name: 'Commandant Hesk', model: 'hesk', hp: 800, atk: 50, def: 24, mag: 0, res: 18, vit: 15, xp: 900, gold: 300, steal: ['potion_plus', 0.6],
    moves: [
      { name: 'Coup de sabre', kind: 'phys', power: 105, w: 2 },
      { name: 'Ordre de tir', kind: 'phys', power: 50, target: 'all', w: 1.3 },
      { name: 'Réparation', kind: 'heal', heal: 200, on: 'belier', w: 2.2, text: 'Hesk fait recercler le bélier. Tant qu\'il est debout, la machine se répare !' },
    ],
  },
  // --- Chapitre 10 : la chute de la Cité Blanche ---
  chevalier_cendre: {
    name: 'Chevalier de Cendre', model: 'chevalier_cendre', hp: 260, atk: 54, def: 28, mag: 0, res: 18, vit: 15, weak: ['Foudre'], xp: 400, gold: 110, steal: ['potion_plus', 0.5],
    moves: [{ name: 'Taille', kind: 'phys', power: 105, w: 3 }, { name: 'Coup de bouclier', kind: 'phys', power: 90, status: { etourdi: 0.2 }, w: 1.2 }],
  },
  darian_noir: {
    name: 'Darian, le Chevalier Noir', model: 'darian', boss: true, invuln: true, hp: 9999, atk: 66, def: 60, mag: 60, res: 60, vit: 30, element: 'Ombre', xp: 0, gold: 0,
    moves: [{ name: 'Lame noire', kind: 'phys', power: 100, w: 3 }, { name: 'Revers', kind: 'phys', power: 55, target: 'all', w: 1.5 }],
  },
};

export const STATUS_LABEL = { brulure: 'Brûlure', gel: 'Gel', sommeil: 'Sommeil', etourdi: 'Étourdi', poison: 'Poison' };
