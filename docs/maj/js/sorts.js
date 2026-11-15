// ============================================================
//  MISE EN SCÈNE DES SORTS, DES COMPÉTENCES ET DES ATTAQUES
//  Chaque entrée décrit une petite « chorégraphie » en trois temps :
//    pre(c, cibles)  : la préparation (pose, cercle magique, élan) ;
//    hit(c, cible, n): ce qui arrive sur UNE cible, jusqu'à l'instant de l'impact
//                      (battle.js applique les dégâts juste après) ;
//    post(c, cibles) : la fin (retour à sa place, cristaux qui éclatent...).
//  « melee: true » veut dire que le lanceur est allé au contact et doit revenir.
//  Les briques (flammes, éclats, anneaux, cristaux...) sont dans effets.js.
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { PAL } from './effets.js';
import { HEROES } from './data.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rnd = (a, b) => a + Math.random() * (b - a);
const ease = (t) => t * t * (3 - 2 * t);
const rien = async () => {};
const FEU = [0xffd870, 0xff3a04];
const angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

// Boule de feu : une tête brillante, une traînée de flammes et de braises, une lampe qui la suit
async function bouleDeFeu(fx, from, to, ms, s = 1, P = PAL.Feu) {
  const L = fx.hold(P.b, 3 * s);
  await fx.travel(from, to, ms, 0.5, (p) => {
    fx.emit({ pos: p, cell: 0, color: [P.a, P.b], size: 1.2 * s, life: 0.1, fin: 0.05, pow: 0.6 });
    fx.emit({ pos: p, n: 2, cell: 1, color: [P.a, P.b], size: [0.5 * s, 0.85 * s], grow: 0.3, life: [0.25, 0.45], rad: 0.12, spread: [0, 0.5], spin: [-3, 3] });
    if (Math.random() < 0.6) fx.embers(p, 1, [P.a, P.b], [0, 1]);
    L.set(p);
  });
  L.off();
}

const SORTS = {
  // ---------- Kael ----------
  entaille: (fx, H) => ({ melee: true,
    pre: async (c) => { H.sfx('charge'); fx.converge(fx.hand(c), 0xffe08a, 16, 260); fx.ring(fx.feet(c), 0xffe08a, 1.8, 0.3, 260, 0.6); await fx.W(260); },
    hit: async (c, t) => { await H.lunge(c, t); H.sfx('slash'); const p = fx.mid(t); fx.slash(p, -0.5, 0xffd060, 3.6, 260); fx.slash(p, -0.5, 0xffffff, 2.7, 190); fx.sparks(p, 0xffc040, 22, 8); fx.shock(p, 0xffe08a, 3.6); fx.light(p, 0xffd070, 3.5, 260); H.shake(0.16); },
  }),
  frappe_croisee: (fx, H) => ({ melee: true,
    hit: async (c, t, n) => { if (!n) await H.lunge(c, t); else { fx.play(c, 'Sword_Attack', 2.2); await fx.W(120); } H.sfx('slash'); const p = fx.mid(t); fx.slash(p, n ? 0.75 : -0.75, 0x8fc8ff, 3.2, 230, !!n); fx.slash(p, n ? 0.75 : -0.75, 0xffffff, 2.4, 170, !!n); fx.sparks(p, 0x8fc8ff, 16, 7); if (n) { fx.shock(p, 0xbfe0ff, 4); fx.emit({ pos: p, cell: 3, color: [0xffffff, 0x8fc8ff], size: 2.6, life: 0.24, rot: 0.785, fin: 0.05, pow: 1 }); H.shake(0.14); } fx.light(p, 0x8fc8ff, 3, 240); },
  }),
  lame_tournoyante: (fx, H) => ({
    pre: async (c, ts) => {
      const from = c.obj.position.clone(), cx = ts.reduce((s, t) => s + t.obj.position.x, 0) / ts.length, to = V(cx - 2.3 * fx.dir(c), 0, 0), r0 = c.obj.rotation.y;
      await fx.T(220, (k) => c.obj.position.lerpVectors(from, to, ease(k)));
      H.sfx('whoosh'); fx.play(c, 'Sword_Attack', 1.3); fx.ring(fx.feet(c), 0xffc040, 0.4, 3.6, 520); H.sfx('slash'); fx.whirl(fx.feet(c), 0xffc040, 2.9, 500, 2, 1.0); fx.whirl(fx.feet(c), 0xffffff, 2.2, 500, 2.5, 1.15); fx.light(fx.mid(c), 0xffc040, 3, 500);
      await fx.T(480, (k) => {
        c.obj.rotation.y = r0 + k * Math.PI * 4;
        for (let j = 0; j < 3; j++) { const a = k * 13 + j * 2.094, rr = 1.2 + k * 1.6; fx.emit({ pos: V(to.x + Math.cos(a) * rr, 1.0 + Math.sin(a * 2) * 0.2, to.z + Math.sin(a) * rr), cell: 3, color: [0xffffff, 0xffb030], size: [0.3, 0.6], grow: 0.4, life: 0.25, vel: V(-Math.sin(a) * 4, 0.5, Math.cos(a) * 4), fin: 0.1 }); }
      });
      c.obj.rotation.y = r0; fx.ring(fx.feet(c), 0xffffff, 0.6, 4.4, 350, 0.7); H.shake(0.14);
    },
    hit: async (c, t) => { const p = fx.mid(t); fx.slash(p, rnd(-0.6, 0.6), 0xffd060, 2.6, 200); fx.sparks(p, 0xffc040, 14, 7); fx.light(p, 0xffd070, 2.5, 200); await fx.W(70); },
    post: async (c) => { await H.goHome(c); },
  }),
  cri_ralliement: (fx, H) => ({
    pre: async (c) => { await H.castPose(c); H.sfx('cri'); const f = fx.feet(c); fx.ring(f, 0xffb040, 0.4, 5.5, 550); fx.later(140, () => fx.ring(f, 0xff5020, 0.4, 5.5, 550)); fx.shock(fx.mid(c), 0xffb040, 4); H.shake(0.1); await fx.W(160); },
    hit: async (c, t) => { const f = fx.feet(t); fx.pillar(f, 0xff7030, 0.75, 2.8, 550); fx.rune(f, 0xff9040, 1.0, 650); fx.rise(V(f.x, 0.3, f.z), 15, [0xffe08a, 0xff5020], 5, { size: [0.26, 0.4], up: [1.6, 2.8] }); fx.flames(f, 8, 0.6, [0xffd0a0, 0xe02808], 0.6, [1.5, 3]); fx.light(fx.mid(t), 0xff7030, 2, 400); await fx.W(110); },
  }),
  lueur: (fx, H) => ({ pre: async (c) => { fx.rune(fx.feet(c), 0xfff0a0, 0.95, 600); fx.converge(fx.hand(c), 0xfff0a0, 10, 240); await H.castPose(c); } }),
  // ---------- Lyra ----------
  flammeche: (fx, H) => ({
    pre: async (c) => { fx.rune(fx.feet(c), 0xff8030, 1.05, 750); H.sfx('charge'); await H.castPose(c); fx.converge(fx.hand(c), 0xffb050, 14, 200); fx.flames(fx.hand(c), 6, 0.15, FEU, 0.5, [0.5, 1.5]); await fx.W(170); },
    hit: async (c, t) => { H.sfx('fire'); const to = fx.mid(t); await bouleDeFeu(fx, fx.hand(c), to, 330); H.sfx('explosion'); fx.explosion(to, PAL.Feu, 1); fx.ring(fx.feet(t), 0xff5a0c, 0.3, 2.2, 400, 0.7); },
  }),
  brasier: (fx, H) => ({
    pre: async (c, ts) => {
      const f = fx.feet(c); fx.rune(f, 0xff5020, 1.6, 1300, 3); H.sfx('charge'); H.tint('#ff5a10', 0.2);
      await H.castPose(c);
      await fx.T(420, (k) => { for (let j = 0; j < 2; j++) { const a = k * 12 + j * 3.14; fx.emit({ pos: V(f.x + Math.cos(a) * 0.9, 0.1 + k * 1.6, f.z + Math.sin(a) * 0.9), n: 2, cell: 1, color: FEU, size: [0.4, 0.7], grow: 0.3, life: [0.3, 0.5], up: [1, 2.5], spin: [-3, 3] }); } });
      H.sfx('fire'); H.shake(0.1);
      const x0 = f.x + fx.dir(c), x1 = Math.max(...ts.map((t) => t.obj.position.x * fx.dir(c))) * fx.dir(c), zs = ts.map((t) => t.obj.position.z), z0 = Math.min(...zs) - 0.8, z1 = Math.max(...zs) + 0.8;
      await fx.T(400, (k) => { const x = x0 + (x1 - x0) * k; for (let j = 0; j < 5; j++) fx.emit({ pos: V(x + rnd(-0.25, 0.25), 0.15, z0 + (z1 - z0) * Math.random() * (0.3 + 0.7 * k)), cell: 1, color: FEU, size: [0.6, 1.1], grow: 0.3, life: [0.3, 0.6], up: [1.5, 4], spin: [-3, 3] }); if (Math.random() < 0.5) fx.embers(V(x, 0.3, (z0 + z1) / 2), 2); });
    },
    hit: async (c, t) => { const f = fx.feet(t); H.sfx('explosion'); fx.pillar(f, 0xff5a0c, 1.05, 4.4, 650); fx.pillar(f, 0xffe9a0, 0.55, 3.8, 480); fx.flames(f, 28, 0.7, FEU, 1.25, [3, 7.5]); fx.embers(V(f.x, 0.4, f.z), 18, FEU, [3, 7]); fx.ring(f, 0xff5a0c, 0.3, 2.8, 450); fx.light(V(f.x, 1.2, f.z), 0xff5a0c, 5, 480); H.shake(0.22); await fx.W(150); },
    post: async (c, ts) => { H.tint(null); for (const t of ts) fx.smoke(V(t.obj.position.x, 0.5, t.obj.position.z), 4, 1.1); },
  }),
  eclat_givre: (fx, H) => ({
    pre: async (c) => { fx.rune(fx.feet(c), 0x8fdcff, 1.05, 800); H.sfx('ice'); await H.castPose(c); fx.converge(fx.hand(c), 0xbfe9ff, 12, 220, 5); await fx.W(160); },
    hit: async (c, t) => {
      const to = fx.mid(t), h = fx.hand(c), jobs = [];
      for (let i = 0; i < 3; i++) {
        const from = V(h.x, h.y + 0.25 + i * 0.28, h.z + (i - 1) * 0.4), dest = V(to.x, to.y + (i - 1) * 0.25, to.z), rot = angle(from, dest) - Math.PI / 2;
        jobs.push(fx.W(i * 75).then(() => fx.travel(from, dest, 170, 0, (p) => { fx.emit({ pos: p, cell: 4, color: [0xffffff, 0x8fdcff], size: 0.95, asp: 0.6, life: 0.07, rot, fin: 0.05, pow: 0.5 }); fx.emit({ pos: p, cell: 5, color: [0xffffff, 0xbfe9ff], size: [0.12, 0.24], life: [0.25, 0.5], spread: [0, 0.8], g: 2, spin: [-3, 3] }); })).then(() => { fx.sparks(dest, 0xbfe9ff, 6, 5); }));
      }
      await Promise.all(jobs);
      H.sfx('shatter'); fx.iceBurst(to, 1); fx.cluster(fx.feet(t), 4, 0.7, 1.7, 0.6); fx.ring(fx.feet(t), 0xbfe9ff, 0.3, 2.2, 400, 0.7); H.shake(0.13);
    },
    post: async () => { await fx.W(260); fx.shatter(); },
  }),
  blizzard: (fx, H) => ({
    pre: async (c, ts) => {
      fx.rune(fx.feet(c), 0x8fdcff, 1.7, 1700, 3); H.sfx('wind'); H.tint('#a8d8ff', 0.26);
      await H.castPose(c);
      const d = fx.dir(c), cx = ts.reduce((s, t) => s + t.obj.position.x, 0) / ts.length;
      await fx.T(800, (k) => {
        for (let j = 0; j < 6; j++) fx.emit({ pos: V(cx + rnd(-5.5, 2.5) * d, rnd(0.2, 5), rnd(-4.5, 4.5)), cell: 7, color: [0xffffff, 0xbfe9ff], size: [0.6, 1.1], life: [0.25, 0.45], vel: V(11 * d, -3.5, 1), spread: [0, 1], align: true, a: 0.85, fin: 0.2 });
        for (let j = 0; j < 2; j++) fx.emit({ pos: V(cx + rnd(-4, 3) * d, rnd(1, 5), rnd(-4, 4)), cell: 5, color: [0xffffff, 0xcfeeff], size: [0.14, 0.3], life: [0.5, 0.9], vel: V(5 * d, -2.5, 0.5), spread: [0, 1], spin: [-4, 4] });
        if (Math.random() < 0.25) fx.emit({ fum: true, pos: V(cx + rnd(-3, 2) * d, rnd(0.3, 1.5), rnd(-3.5, 3.5)), cell: 2, color: [0xf0faff, 0xa8d8f8], size: [1.2, 2], grow: 1.8, life: [0.6, 1], vel: V(3 * d, 0, 0), a: 0.3, fin: 0.2, pow: 1.2 });
      });
      H.shake(0.08);
    },
    hit: async (c, t) => { const f = fx.feet(t); H.sfx('ice'); fx.cluster(f, 6, 1.0, Math.max(2.2, t.height * 1.15), 0.75); fx.iceBurst(fx.mid(t), 1.1); fx.ring(f, 0xbfe9ff, 0.3, 3, 500); H.shake(0.17); await fx.W(170); },
    post: async () => { await fx.W(280); fx.shatter(); H.shake(0.15); H.tint(null); },
  }),
  sommeil: (fx, H) => ({
    pre: async (c) => { fx.rune(fx.feet(c), 0xa040ff, 1.05, 900, -1.6); H.sfx('sleep'); await H.castPose(c); },
    hit: async (c, t) => {
      const to = fx.top(t);
      await fx.travel(fx.hand(c), to, 620, 0.7, (p, k) => { for (let j = 0; j < 3; j++) { const a = k * 11 + j * 2.094, r = 0.55 * (1 - k * 0.7); fx.emit({ pos: V(p.x, p.y + Math.sin(a) * r, p.z + Math.cos(a) * r), cell: 0, color: [0xe0a8ff, 0x7020e0], size: 0.8, grow: 0.4, life: 0.32, fin: 0.05, pow: 1 }); } if (Math.random() < 0.5) fx.emit({ pos: p, cell: 3, color: [0xffffff, 0xd0a0ff], size: [0.15, 0.3], life: [0.3, 0.6], spread: [0, 0.6], rad: 0.3 }); });
      fx.shock(to, 0xa040ff, 3.2); fx.flash(fx.mid(t), 0xa040ff, 2.6, 0.3); fx.emit({ pos: to, n: 3, cell: 11, color: [0xffffff, 0xb090ff], size: [0.3, 0.45], grow: 1.6, life: 1.2, up: [0.6, 1], vel: V(0.3, 0, 0), rot: 0.2, delay: [0, 0.5], fin: 0.2, pow: 1 });
      fx.emit({ pos: fx.mid(t), n: 9, cell: 10, color: [0xf0d8ff, 0x9060e0], size: [0.15, 0.32], grow: 1.5, life: [0.7, 1.3], up: [0.3, 1], rad: 0.7, rot: 0, delay: [0, 0.3] }); fx.light(to, 0xc890ff, 2, 500); await fx.W(260);
    },
  }),
  // ---------- Nyssa ----------
  fleche_rapide: (fx, H) => ({
    hit: async (c, t) => { fx.play(c, 'Sword_Attack', 1.9); await fx.W(170); H.sfx('whoosh'); const from = fx.hand(c), to = fx.mid(t), rot = angle(from, to); await fx.travel(from, to, 110, 0.04, (p) => { fx.emit({ pos: p, n: 2, cell: 7, color: [0xffffff, 0xfff0a0], size: 1.6, life: 0.13, rot, fin: 0.05, pow: 0.8 }); }); fx.sparks(to, 0xfff0a0, 12, 7); fx.shock(to, 0xffffff, 2.2); },
  }),
  rafale: (fx, H) => ({
    pre: async (c) => { H.sfx('wind'); fx.converge(fx.hand(c), 0xc8ffd0, 12, 220); fx.ring(fx.feet(c), 0x9af0a0, 1.6, 0.3, 240, 0.5); fx.play(c, 'Sword_Attack', 1.6); await fx.W(200); },
    hit: async (c, t) => {
      const h = fx.hand(c), to = fx.mid(t), d = fx.dir(c), jobs = [];
      for (let i = 0; i < 3; i++) { const from = V(h.x, h.y + (i - 1) * 0.3, h.z), dest = V(to.x, to.y + (i - 1) * 0.35, to.z); jobs.push(fx.W(i * 70).then(() => { H.sfx('whoosh'); return fx.travel(from, dest, 230, 0.15, (p, k) => { fx.emit({ pos: p, cell: 8, color: [0xffffff, 0x8af0a0], size: 2.3, life: 0.12, rot: (d > 0 ? 0 : Math.PI) + Math.sin(k * 9) * 0.3, fin: 0.05, pow: 0.6 }); fx.emit({ pos: p, cell: 7, color: [0xffffff, 0x9af0a0], size: [0.5, 0.9], life: [0.15, 0.3], vel: V(-3 * d, 0, 0), spread: [0, 1], align: true, a: 0.7 }); }); })); }
      await Promise.all(jobs);
      const f = fx.feet(t); fx.shock(to, 0xc8ffd0, 4.2); H.shake(0.12); fx.ring(f, 0xc8ffd0, 0.3, 2.6, 420, 0.8); fx.pillar(f, 0xd8ffe0, 0.95, Math.max(2.6, t.height * 1.6), 480, 0.75); fx.whirl(f, 0xeaffea, 1.4, 380, 2.5, 0.5); fx.whirl(f, 0xc8ffd0, 1.1, 380, -3, 1.3); fx.light(to, 0xc8ffd0, 3, 400);
      await fx.T(300, (k) => { for (let j = 0; j < 4; j++) { const a = k * 15 + j * 1.571, r = 0.35 + k * 0.75; fx.emit({ pos: V(f.x + Math.cos(a) * r, k * t.height * 1.2, f.z + Math.sin(a) * r), cell: 7, color: [0xffffff, 0xa8f8b0], size: 1.5, grow: 0.5, life: 0.28, vel: V(-Math.sin(a) * 3.5, 2, Math.cos(a) * 3.5), align: true, a: 0.85 }); } if (Math.random() < 0.6) fx.emit({ pos: V(f.x, k * 1.5, f.z), cell: 14, color: [0xb8f090, 0x4a9a40], size: [0.14, 0.24], life: [0.4, 0.7], spread: [1.5, 3.5], up: [1, 3], g: 4, spin: [-8, 8], rad: 0.4 }); });
    },
  }),
  lame_empoisonnee: (fx, H) => ({ melee: true,
    pre: async (c) => { H.sfx('poison'); fx.emit({ pos: fx.hand(c), n: 8, cell: 10, color: [0xd8ff90, 0x8a40d0], size: [0.12, 0.26], grow: 1.5, life: [0.3, 0.5], up: [0.5, 1.5], rad: 0.3, rot: 0 }); await fx.W(160); },
    hit: async (c, t) => { await H.lunge(c, t); H.sfx('slash'); const p = fx.mid(t); fx.slash(p, 0.4, 0xa040e0, 3.2, 240); fx.slash(p, 0.4, 0x9af04a, 2.4, 190); fx.splash(p, PAL.Poison, 0.9); fx.light(p, 0x9af04a, 2.5, 260); },
  }),
  // ---------- Borin ----------
  coup_bouclier: (fx, H) => ({ melee: true,
    hit: async (c, t) => { await H.lunge(c, t); H.sfx('boom'); const p = fx.mid(t); fx.flash(p, 0xffffff, 3.2); fx.shock(p, 0xd8e8ff, 4.8); fx.emit({ pos: p, n: 8, cell: 12, color: [0xfff0a0, 0xffb030], size: [0.2, 0.4], life: [0.4, 0.8], spread: [2, 5], g: 6, spin: [-8, 8] }); fx.sparks(p, 0xd8e8ff, 14, 7); fx.ring(fx.feet(t), 0xd8e8ff, 0.3, 2.4, 360, 0.7); fx.dust(fx.feet(t), 6); fx.light(p, 0xd8e8ff, 3.5, 260); H.shake(0.24); },
  }),
  rempart: (fx, H) => ({
    pre: async (c) => { await H.castPose(c); H.sfx('shield'); const f = fx.feet(c); fx.ring(f, 0x8fc8ff, 0.4, 5.5, 550); fx.shock(fx.mid(c), 0x8fc8ff, 3.5); await fx.W(140); },
    hit: async (c, t) => { const f = fx.feet(t); fx.dome(f, 0x8fc8ff, Math.max(1.1, t.height * 0.68), 850); fx.rune(f, 0x8fc8ff, 1.0, 700); fx.rise(V(f.x, 0.3, f.z), 15, [0xd8ecff, 0x4a90ff], 4, { size: [0.24, 0.36], up: [1.4, 2.4] }); fx.light(fx.mid(t), 0x8fc8ff, 2, 450); await fx.W(110); },
  }),
  fracas: (fx, H) => ({
    pre: async (c, ts) => {
      const from = c.obj.position.clone(), d = fx.dir(c); fx.play(c, 'Sword_Attack', 1.1); H.sfx('charge');
      await fx.T(300, (k) => { c.obj.position.set(from.x + d * 0.9 * k, Math.sin(k * Math.PI) * 1.4, from.z); });
      c.obj.position.y = 0; const f = fx.feet(c); H.sfx('quake'); H.shake(0.42); fx.ring(f, 0xe8c890, 0.4, 3.8, 480); fx.dust(f, 14); fx.flash(V(f.x, 0.3, f.z), 0xffe8b0, 2.5);
      const x1 = Math.max(...ts.map((t) => t.obj.position.x * d)) * d;
      await fx.T(300, (k) => { for (const t of ts) { const x = f.x + (x1 - f.x) * k, z = f.z + (t.obj.position.z - f.z) * k; fx.emit({ fum: true, pos: V(x, 0.15, z), n: 2, cell: 9, color: [0xb89a70, 0x5a4028], size: [0.12, 0.3], life: [0.35, 0.6], spread: [0.5, 2], up: [2, 5], g: 14, spin: [-8, 8], pow: 0.6 }); fx.emit({ fum: true, pos: V(x, 0.2, z), cell: 2, color: [0xd8c8a8, 0x8a7a60], size: [0.5, 0.9], grow: 2, life: [0.4, 0.7], up: [0.3, 1], a: 0.45, fin: 0.15, pow: 1.3 }); } });
    },
    hit: async (c, t) => { const f = fx.feet(t); H.sfx('boom'); fx.spikes(f, 5, Math.max(1.7, t.height * 0.95)); fx.ring(f, 0xc09a50, 0.3, 2.6, 420); fx.light(V(f.x, 1, f.z), 0xffd090, 3, 300); H.shake(0.26); await fx.W(140); },
    post: async (c) => { await H.goHome(c); },
  }),
  // ---------- Vocations de Kael ----------
  // Mage : la foudre tombe du ciel ; le Rayon d'Aube est une colonne de lumière
  eclair: (fx, H) => ({
    pre: async (c) => { fx.rune(fx.feet(c), PAL.Foudre.b, 1, 700); fx.converge(fx.hand(c), PAL.Foudre.b, 12, 260); await H.castPose(c); },
    hit: async (c, t) => foudre(fx, H, t, 1),
  }),
  orage: (fx, H) => ({
    pre: async (c) => { fx.rune(fx.feet(c), PAL.Foudre.b, 1.5, 900); fx.converge(fx.hand(c), 0xffffff, 18, 320); H.sfx('wind'); await H.castPose(c); },
    hit: async (c, t) => foudre(fx, H, t, 1.25),
  }),
  rayon_aube: (fx, H) => ({
    pre: async (c) => { fx.rune(fx.feet(c), 0xfff0a0, 1.2, 800); fx.converge(fx.hand(c), 0xfff0a0, 16, 300); H.sfx('charge'); await H.castPose(c); },
    hit: async (c, t) => { const f = fx.feet(t), h = Math.max(4, t.height * 2.4); H.sfx('heal'); fx.pillar(f, 0xfff0a0, 0.75, h, 620, 0.9); fx.ring(f, 0xffe080, 0.3, 2.6, 480); fx.light(V(f.x, 1.2, f.z), 0xfff0a0, 4.5, 420); await fx.W(160); H.sfx('explosion'); fx.sparks(fx.mid(t), 0xfff0a0, 18, 7); fx.shock(fx.mid(t), 0xffffff, 3.2); H.shake(0.16); },
  }),
  // Éclaireur : un coup porté avant tout le monde
  estoc_vif: (fx, H) => ({
    melee: true,
    hit: async (c, t) => { await H.lunge(c, t); H.sfx('whoosh'); const p = fx.mid(t); fx.slash(p, 0.15, 0xc8ffd0, 3.4, 150); fx.sparks(p, 0xffffff, 12, 8); fx.shock(p, 0xc8ffd0, 2.2, 0.22); },
    post: async (c) => { await H.goHome(c); },
  }),
};

// La foudre : un pilier blanc très bref, un éclat, des étincelles
async function foudre(fx, H, t, k) {
  const f = fx.feet(t), h = Math.max(5, t.height * 3);
  H.sfx('explosion'); fx.pillar(f, 0xffffff, 0.22 * k, h, 170, 1); fx.pillar(f, PAL.Foudre.b, 0.5 * k, h, 260, 0.55);
  fx.light(V(f.x, 1.4, f.z), 0xfff8c0, 6 * k, 240); fx.shock(fx.mid(t), PAL.Foudre.b, 3 * k, 0.3); fx.sparks(fx.mid(t), PAL.Foudre.b, 18, 8); fx.ring(f, PAL.Foudre.b, 0.2, 2.2 * k, 360);
  H.shake(0.2 * k); await fx.W(90);
}

// Mise en scène d'une compétence. Les compétences sans entrée reçoivent une version simple selon leur genre.
export function sortFx(fx, H, id, sk) {
  const cle = SORTS[id] ? id : (sk.fx && SORTS[sk.fx] ? sk.fx : null);        // « fx » : mise en scène empruntée à une autre compétence
  const F = cle ? SORTS[cle](fx, H) : {};
  if (!cle) {
    if (sk.kind === 'mag') { const P = PAL[sk.element] || PAL.Ombre; F.pre = async (c) => { fx.rune(fx.feet(c), P.b, 1, 700); await H.castPose(c); }; F.hit = async (c, t) => { H.sfx(sk.element === 'Eau' ? 'ice' : 'fire'); const to = fx.mid(t); await bouleDeFeu(fx, fx.hand(c), to, 330, 0.9, P); if (sk.element === 'Eau') fx.iceBurst(to, 1); else fx.explosion(to, P, 0.9); }; }
    else if (sk.kind === 'phys') { F.melee = !sk.ranged; F.hit = async (c, t) => attaqueFx(fx, H, c, t); }
    else F.pre = async (c) => { await H.castPose(c); };
  }
  return { pre: F.pre || rien, hit: F.hit || rien, post: F.post || rien, melee: !!F.melee };
}

// ---------- Attaque simple ----------
const GRIFFES = /loup|rat|chauve|luciole|champi/, MASSE = /troll|gelee|roi_egouts|gobelin/;
export async function attaqueFx(fx, H, c, t) {
  await H.lunge(c, t);
  const p = fx.mid(t), d = fx.dir(c), model = c.isHero ? c.id : (c.d.model || ''), style = c.isHero ? (HEROES[c.id].style || c.id) : '';
  if (c.isHero) {
    H.sfx('slash');
    if (style === 'borin') { fx.shock(p, 0xd8e8ff, 3.4); fx.sparks(p, 0xd8e8ff, 12, 6); fx.dust(fx.feet(t), 5); H.shake(0.12); }
    else if (style === 'lyra') { fx.emit({ pos: p, cell: 3, color: [0xffffff, 0xffb060], size: 2, life: 0.22, rot: 0.4, fin: 0.05, pow: 1 }); fx.sparks(p, 0xffb060, 10, 5); }
    else if (style === 'nyssa') { fx.slash(p, 0.5, 0xc8ffd0, 2.2, 170); fx.later(70, () => fx.slash(p, -0.6, 0xffffff, 2, 160, true)); fx.sparks(p, 0xc8ffd0, 10, 6); }
    else { fx.slash(p, -0.4, 0xfff0c0, 2.8, 210); fx.sparks(p, 0xffe0a0, 12, 6); }
  } else if (GRIFFES.test(model)) { H.sfx('slash'); fx.claws(p, 0xff5040, d); }
  else if (MASSE.test(model)) { H.sfx('boom'); const f = fx.feet(t); fx.shock(p, 0xffe0c0, 3.6); fx.ring(f, 0xe8c890, 0.3, 2.2, 380, 0.7); fx.dust(f, 8); if (/gelee|roi_egouts/.test(model)) fx.splash(p, { a: 0xe8ffb0, b: 0x8ae03a, c: 0x3a8a20 }, 0.7); H.shake(0.16); }
  else { H.sfx('slash'); fx.slash(p, 0.5, 0xff7060, 2.8, 210, true); fx.sparks(p, 0xff9080, 12, 6); }
}

// ---------- Attaques des ennemis ----------
export function coupFx(fx, H, c, mv) {
  const n = mv.name, d = fx.dir(c), mouth = () => V(c.obj.position.x + d * 0.5, Math.min(c.height * 0.75, 2.2), c.obj.position.z);
  if (mv.kind === 'mag') {
    if (/acide|Crachat/i.test(n)) return { melee: false, pre: async () => { await H.castPose(c); },
      hit: async (c2, t) => { H.sfx('poison'); const to = fx.mid(t); await fx.travel(mouth(), to, 380, 1.1, (p) => { fx.emit({ pos: p, cell: 0, color: [0xe8ffb0, 0x6ac020], size: 0.75, life: 0.12, fin: 0.05, pow: 0.6 }); fx.emit({ pos: p, cell: 14, color: [0xd8ff70, 0x5aa818], size: [0.12, 0.22], life: [0.3, 0.5], spread: [0, 0.8], g: 8, align: true, off: Math.PI / 2 }); }); fx.splash(to, PAL.Poison, 1); fx.ring(fx.feet(t), 0x8ae03a, 0.3, 1.9, 420, 0.6); } };
    if (/Cri/i.test(n)) return { melee: false,
      pre: async () => { await H.castPose(c); H.sfx('sonic'); H.shake(0.13); const m = mouth(); for (let i = 0; i < 5; i++) fx.later(i * 90, () => fx.emit({ pos: m, cell: 6, color: [0xffffff, 0xc8a0ff], size: 0.6, grow: 9, life: 0.55, vel: V(d * 9, -0.6, 0), rot: 0, a: 0.85, fin: 0.1, pow: 1 })); await fx.W(480); },
      hit: async (c2, t) => { fx.shock(fx.mid(t), 0xc8a0ff, 2.6); } };
    const P = PAL[mv.element] || PAL.Ombre;
    return { melee: false, pre: async () => { await H.castPose(c); fx.converge(mouth(), P.b, 10, 200); await fx.W(150); },
      hit: async (c2, t) => { H.sfx(mv.element === 'Eau' ? 'ice' : 'fire'); const to = fx.mid(t); await bouleDeFeu(fx, mouth(), to, 320, 0.75, P); H.sfx('explosion'); if (mv.element === 'Eau') fx.iceBurst(to, 0.9); else fx.explosion(to, P, 0.8); } };
  }
  if (/Rocher/i.test(n)) return { melee: false, hit: rien,
    pre: async (ts) => {
      fx.play(c, 'Sword_Attack', 1.2); await fx.W(200); H.sfx('whoosh');
      const to = V(ts.reduce((s, t) => s + t.obj.position.x, 0) / ts.length, 0.4, ts.reduce((s, t) => s + t.obj.position.z, 0) / ts.length);
      const rock = fx.boulder(0.8); await fx.travel(fx.top(c), to, 560, 3.2, (p, k) => { rock.position.copy(p); rock.rotation.set(k * 9, k * 5, 0); });
      fx.scene.remove(rock); H.sfx('quake'); H.shake(0.4); fx.ring(to, 0xe8c890, 0.4, 4.6, 520); fx.dust(to, 18); fx.flash(to, 0xffe8b0, 3);
      fx.emit({ fum: true, pos: to, n: 22, cell: 9, color: [0xb89a70, 0x5a4028], size: [0.16, 0.4], life: [0.5, 1], spread: [2, 6.5], up: [2, 6], g: 14, spin: [-8, 8], pow: 0.6 });
    } };
  if (/Charge/i.test(n)) return { melee: true, hit: rien,
    pre: async (ts) => { const t = ts[0]; fx.flames(fx.feet(c), 12, 0.7, [0xffb090, 0xc01808], 0.8, [1.5, 3.5]); await H.lunge(c, t); H.sfx('slash'); H.sfx('boom'); const p = fx.mid(t); fx.slash(p, 0.5, 0xff4030, 4.2, 280, true); fx.slash(p, -0.5, 0xffffff, 3.4, 220); fx.explosion(p, PAL.Sang, 1); fx.ring(fx.feet(t), 0xff4030, 0.3, 3.4, 450); H.flash('#ff3020', 0.22, 220); H.shake(0.4); } };
  return { melee: true, hit: rien, pre: async (ts) => { await attaqueFx(fx, H, c, ts[0]); } };
}

// ---------- Objets et gestes particuliers ----------
export async function fioleFx(fx, H, c, t, element) {
  fx.play(c, 'Sword_Attack', 1.8); await fx.W(170); H.sfx('whoosh');
  const P = PAL[element] || PAL.Feu, to = fx.mid(t);
  await fx.travel(fx.hand(c), to, 420, 1.7, (p) => { fx.emit({ pos: p, cell: 0, color: [P.a, P.b], size: 0.6, life: 0.12, fin: 0.05, pow: 0.6 }); if (Math.random() < 0.6) fx.emit({ pos: p, cell: 3, color: [0xffffff, P.b], size: [0.15, 0.3], life: [0.2, 0.4], rad: 0.1 }); });
  fx.sparks(to, 0xffffff, 10, 6);
  if (element === 'Eau') { H.sfx('shatter'); fx.iceBurst(to, 1.1); fx.cluster(fx.feet(t), 4, 0.7, 1.6, 0.6); fx.later(700, () => fx.shatter()); }
  else { H.sfx('explosion'); fx.explosion(to, P, 1.1); fx.flames(fx.feet(t), 16, 0.6, FEU, 1, [2, 5]); }
  fx.ring(fx.feet(t), P.b, 0.3, 2.4, 420, 0.7);
}
export async function larcinFx(fx, H, c, t, ok) {
  const p = fx.mid(t); fx.emit({ pos: p, n: 10, cell: 3, color: [0xffffff, 0xffd040], size: [0.25, 0.55], life: [0.25, 0.5], rad: 0.5, spin: [-4, 4] }); fx.shock(p, 0xffe080, 2.4);
  if (ok) { H.sfx('steal'); const L = fx.hold(0xffd040, 1.5); await fx.travel(p, fx.hand(c), 320, 0.8, (q) => { fx.emit({ pos: q, cell: 0, color: [0xffffff, 0xffd040], size: 0.55, life: 0.12, fin: 0.05, pow: 0.6 }); fx.emit({ pos: q, cell: 3, color: [0xffffff, 0xffd040], size: [0.15, 0.3], life: [0.25, 0.45], rad: 0.1, spin: [-4, 4] }); L.set(q); }); L.off(); fx.rise(fx.feet(c), 12, [0xfff0a0, 0xffb030], 5, { size: [0.16, 0.28], rot: 'hasard', spin: [-3, 3] }); }
}
export async function provocationFx(fx, H, c) {
  await H.castPose(c); H.sfx('boom'); H.sfx('cri'); H.shake(0.16);
  const f = fx.feet(c); for (let i = 0; i < 3; i++) fx.later(i * 130, () => fx.ring(f, 0xff4030, 0.4, 4.8, 520));
  fx.pillar(f, 0xff3020, 0.9, 2.9, 750); fx.flames(f, 18, 0.8, [0xffb090, 0xc01808], 0.85, [1.5, 3.8]); fx.shock(fx.mid(c), 0xff5040, 4.2); fx.light(fx.mid(c), 0xff4030, 3, 600); H.flash('#ff3020', 0.12, 260);
  await fx.W(280);
}
// Le monstre se déchire : éclaboussures
export function dechirureFx(fx, H, c) { const p = fx.mid(c); fx.splash(p, { a: 0xe8ffb0, b: 0x8ae03a, c: 0x3a8a20 }, 2); fx.shock(p, 0xa8f060, 6); fx.ring(fx.feet(c), 0x8ae03a, 0.5, 4.5, 600); H.shake(0.3); H.sfx('boom'); }
