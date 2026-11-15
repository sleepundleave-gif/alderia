// ============================================================
//  ÉTAT DE LA PARTIE : équipe, inventaire, drapeaux, sauvegarde
// ============================================================
import { HEROES, SKILLS, EQUIP, STAT_KEYS, CLASSES, CLASSE_DEFAUT, appliquerClasse } from './data.js';

const SAVE_KEY = 'alderia_save_v1';

export const G = {
  party: [],      // héros actifs : { id, level, xp, hp, mp, weapon, armor }
  gold: 0,
  inv: {},        // { idObjet: quantité }
  flags: {},      // progression de l'histoire
  phase: '',      // phase en cours (point de reprise)
  time: 0,        // temps de jeu en secondes
};

export function makeHero(id, level = 1) {
  const h = { id, level, xp: 0, hp: 1, mp: 0, weapon: null, armor: null };
  const s = heroStats(h);
  h.hp = s.maxHp; h.mp = s.maxMp;
  return h;
}

export function heroStats(h) {
  const d = HEROES[h.id];
  const s = {};
  for (const k of STAT_KEYS) s[k] = Math.round(d.base[k] + d.gain[k] * (h.level - 1));
  for (const slot of ['weapon', 'armor', 'ring']) {
    const e = h[slot] && EQUIP[h[slot]];
    if (e) for (const k of ['hp', 'atk', 'def', 'mag', 'res', 'vit']) if (e[k]) s[k] += e[k];
  }
  if (h.forge) { s.atk += h.forge * 2; s.mag += h.forge * 2; }                // arme renforcée à la forge de Brasegarde (chapitre 5)
  s.maxHp = s.hp; s.maxMp = s.mp;
  return s;
}

export function xpForNext(level) { return Math.round(30 * Math.pow(level, 1.8)); }

export function knownSkills(h) {
  return HEROES[h.id].skills.filter(([lv]) => lv <= h.level).map(([, id]) => id);
}

// Ajoute de l'expérience ; renvoie la liste des niveaux gagnés
export function gainXP(h, xp) {
  h.xp += xp;
  const ups = [];
  while (h.level < 60 && h.xp >= xpForNext(h.level)) {
    h.xp -= xpForNext(h.level);
    h.level++;
    const learned = HEROES[h.id].skills.filter(([lv]) => lv === h.level).map(([, id]) => SKILLS[id].name);
    ups.push({ level: h.level, learned });
  }
  if (ups.length) healHero(h);
  return ups;
}

export function healHero(h) { const s = heroStats(h); h.hp = s.maxHp; h.mp = s.maxMp; }
export function healParty() { G.party.forEach(healHero); }
export function hero(id) { return G.party.find(h => h.id === id); }

export function addItem(id, n = 1) { G.inv[id] = (G.inv[id] || 0) + n; }
export function removeItem(id, n = 1) { G.inv[id] = Math.max(0, (G.inv[id] || 0) - n); if (!G.inv[id]) delete G.inv[id]; }
export function countItem(id) { return G.inv[id] || 0; }

// heros : { classe, look } choisis sur l'écran de création (voir perso.js) ; sans rien, l'épéiste d'origine
export function newGame(heros) {
  const classe = heros && CLASSES[heros.classe] ? heros.classe : CLASSE_DEFAUT;
  appliquerClasse(classe);
  G.party = [makeHero('kael', 1)];
  G.party[0].weapon = 'epee_hagen';
  G.gold = 0;
  G.inv = { potion: 1 };
  G.flags = { heros: { classe, look: (heros && heros.look) || null } };
  G.phase = 'ch1_forge';
  G.time = 0;
}

export function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, party: G.party, gold: G.gold, inv: G.inv, flags: G.flags, phase: G.phase, time: G.time }));
    return true;
  } catch (e) { return false; }
}

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}

export function load() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!d || d.v !== 1) return false;
    G.party = d.party; G.gold = d.gold; G.inv = d.inv; G.flags = d.flags; G.phase = d.phase; G.time = d.time || 0;
    appliquerClasse(G.flags.heros && G.flags.heros.classe);      // les anciennes sauvegardes n'ont pas de vocation : épéiste
    return true;
  } catch (e) { return false; }
}

export function snapshot() { return JSON.stringify({ party: G.party, inv: G.inv, gold: G.gold }); }
export function restore(snap) { const d = JSON.parse(snap); G.party = d.party; G.inv = d.inv; G.gold = d.gold; }
