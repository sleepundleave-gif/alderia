// zoom.mjs phase prefixe [fov] : la vue du jeu au téléobjectif, avec puis sans les versions lointaines (pour les comparer)
import { start } from './lib.mjs';
const [ph, pre, fov] = process.argv.slice(2);
const T = await start('state4.json'), { p, ev } = T;
await ev((n) => { const g = window.__game; g.setFastText(true); g.debugPhase(n); }, ph); await p.waitForTimeout(4500);
if (process.env.HORIZON) await ev((h) => { window.__horizon = h; }, +process.env.HORIZON);
await ev((f) => { const g = window.__game, E = g.E; window.__sansImage = true; document.querySelectorAll('body > *:not(canvas)').forEach((e) => { if (!e.querySelector('canvas')) e.style.visibility = 'hidden'; });
  const tour = () => { const C = E.camera.clone(); C.fov = f; C.updateProjectionMatrix(); if (window.__horizon) { const d = E.camLook.clone().sub(C.position); d.y = 0; d.normalize(); C.lookAt(C.position.x + d.x * 60, window.__horizon, C.position.z + d.z * 60); } E.renderer.render(E.scene, C); requestAnimationFrame(tour); }; tour(); }, +(fov || 16));
const etat = () => ev(() => { const g = window.__game, E = g.E, st = E.stage, D = st.details || []; const P = [E.player, ...E.followers, ...st.anims].filter((o) => o && o.userData.details); const i = E.renderer.info.render;
  return D.filter((e) => e.etat).length + '/' + D.length + ' décors au loin, ' + P.filter((o) => o.userData.detailLoin).length + '/' + P.length + ' personnages au loin · ' + Math.round(i.triangles / 1000) + ' k triangles, ' + i.calls + ' objets'; });
await p.waitForTimeout(2500); console.log('avec :', await etat());
try { await p.screenshot({ path: 'shots/' + pre + '_avec.jpg', type: 'jpeg', quality: 90, timeout: 40000 }); } catch (e) { console.log('capture ratée'); }
await ev(() => { const Q = window.__game.Q; Q.lod = 1e9; Q.lodDecor = 1e9; }); await p.waitForTimeout(2500); console.log('sans :', await etat());
try { await p.screenshot({ path: 'shots/' + pre + '_sans.jpg', type: 'jpeg', quality: 90, timeout: 40000 }); } catch (e) { console.log('capture ratée'); }
await T.fin(0);
