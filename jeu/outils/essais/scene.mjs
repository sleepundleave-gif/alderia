// scene.mjs phase x,z préfixe [nombre] [intervalle ms] : va en (x, z), laisse la scène se jouer (textes passés à la touche) et prend une image de l'écran du jeu à intervalles réguliers
//   DRAPEAUX='{"vol":0}' : drapeaux changés avant ; E=1 : appuie sur E à l'arrivée ; CHOIX=n : rang de la réponse aux choix ; LENT=1 : texte à vitesse normale
import { start } from './lib.mjs';
const [nom, ou, pref, nb = '12', pas = '700'] = process.argv.slice(2);
const T = await start('state4.json'), { p, ev, state } = T;
if (process.env.DRAPEAUX) await ev((d) => { const f = window.__game.G.flags, n = JSON.parse(d); for (const k in n) { if (n[k] === null) delete f[k]; else f[k] = n[k]; } }, process.env.DRAPEAUX);
await ev(([n, d]) => { const g = window.__game; g.setFastText(!d); g.debugPhase(n); }, [nom, !!process.env.DIRECT]);
await p.waitForTimeout(4200); if (!process.env.DIRECT) await T.idle(60000, 'arrivée');
await ev(() => { window.__sansImage = false; window.__game.setFastText(!window.__lent); });
if (!process.env.DIRECT) { const [x, z] = ou.split(',').map(Number); await T.tp(x, z); await p.waitForTimeout(300); }
if (process.env.E) { await p.keyboard.press('KeyE'); }
let fini = 0;
for (let i = 0; i < +nb; i++) { await p.waitForTimeout(+pas); const s = await state(); if (s.err) { console.log('ERREUR', s.err); break; }
  try { await p.screenshot({ path: `shots/${pref}${String(i).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 78, timeout: 30000 }); } catch (e) { console.log('capture ratée', i); }
  if (s.choice) { for (let k = 0; k < +(process.env.CHOIX || 0); k++) await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); }
  else if (s.busy && !process.env.SANS_TOUCHE) await p.keyboard.press('Enter');
  if (s.en && s.busy === 0 && !s.battle) { if (++fini > 1) break; } else fini = 0; }
const s = await state(); console.log('fin :', s.stage, s.phase, 'occupé', s.busy, 'pos', JSON.stringify(s.pos), s.err || '');
console.log(T.logs.join('\n') || 'aucune erreur'); process.exit(0);
