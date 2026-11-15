// dedans.mjs ETAT phase prefixe : entre dans chaque maison ouverte du lieu et prend une image
import { start } from './lib.mjs';
const [etat, nom, pre, n = '0'] = process.argv.slice(2);
process.env.SHOTS = '*';
const T = await start(etat);
await T.ev((n) => { const g = window.__game; g.setFastText(true); g.debugPhase(n); }, nom);
await T.p.waitForTimeout(4000);
const r = await T.ev((i) => { const st = window.__game.E.stage, k = Object.keys(st).filter((k) => Array.isArray(st[k]) && st[k].some((e) => e && e.label === 'Entrer')); if (!k.length) return 'aucune maison'; const l = st[k[0]].filter((e) => e.label === 'Entrer'); l[i % l.length].action(); return l.length + ' maisons'; }, +n);
console.log(r); await T.p.waitForTimeout(2500);
await T.shot(pre); const s = await T.state(); if (s.err) console.log('ERR', s.err);
await T.fin(0);
