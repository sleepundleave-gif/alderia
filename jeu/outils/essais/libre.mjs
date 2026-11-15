// libre.mjs ETAT phase nom  x,y,z  cx,cy,cz [fov] : image prise par une caméra libre (hors du jeu)
import { start } from './lib.mjs';
const [etat, nom, img, de, vers, fov] = process.argv.slice(2);
const T = await start(etat);
if (nom !== '-') await T.ev((n) => { const g = window.__game; g.setFastText(true); g.debugPhase(n); }, nom);
await T.p.waitForTimeout(4000);
await T.ev(([a, b, f]) => { const g = window.__game, E = g.E, C = E.camera.clone(); C.fov = f; C.far = 2000; C.updateProjectionMatrix(); C.position.set(...a); C.lookAt(...b);
  window.__sansImage = true; document.querySelectorAll('body > *:not(canvas)').forEach((e) => { if (!e.querySelector('canvas')) e.style.visibility = 'hidden'; });
  const tour = () => { E.renderer.render(E.scene, C); requestAnimationFrame(tour); }; tour(); }, [de.split(',').map(Number), vers.split(',').map(Number), +(fov || 45)]);
await T.p.waitForTimeout(3000);
await T.p.screenshot({ path: 'shots/' + img + '.jpg', type: 'jpeg', quality: 84, timeout: 30000 });
const inf = await T.ev(() => { const i = window.__game.E.renderer.info; return i.render.triangles + ' triangles, ' + i.render.calls + ' appels'; }); console.log(inf);
process.exit(0);
