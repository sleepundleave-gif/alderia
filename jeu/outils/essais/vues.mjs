// vues.mjs phase  nom:x,y,z:cx,cy,cz[:fov] …  : plusieurs images d'un même lieu, par une caméra libre (PREP="code" exécuté avant ; g = window.__game)
import { start } from './lib.mjs';
const [nom, ...vues] = process.argv.slice(2);
const T = await start('state4.json');
if (process.env.DRAPEAUX) await T.ev((d) => { Object.assign(window.__game.G.flags, JSON.parse(d)); }, process.env.DRAPEAUX);
await T.ev(([n, lent]) => { const g = window.__game; g.setFastText(!lent); g.debugPhase(n); }, [nom, !!process.env.LENT]);
await T.p.waitForTimeout(4000);
if (process.env.PREP) { await T.ev((c) => { const g = window.__game; return new Function('g', 'E', 'st', 'S', c)(g, g.E, g.E.stage, g.E.stage.spots); }, process.env.PREP); await T.p.waitForTimeout(+(process.env.ATTENTE || 600)); }
await T.ev(() => { const g = window.__game, E = g.E, C = E.camera.clone(); C.far = 2000; window.__C = C;
  window.__sansImage = true; document.querySelectorAll('body > *:not(canvas)').forEach((e) => { if (!e.querySelector('canvas')) e.style.visibility = 'hidden'; });
  const tour = () => { E.renderer.render(E.scene, C); requestAnimationFrame(tour); }; tour(); });
for (const v of vues) { const [img, de, vers, fov] = v.split(':');
  await T.ev(([a, b, f]) => { const C = window.__C; C.fov = f; C.updateProjectionMatrix(); C.position.set(...a); C.lookAt(...b); }, [de.split(',').map(Number), vers.split(',').map(Number), +(fov || 50)]);
  await T.p.waitForTimeout(+(process.env.POSE || 1500));
  await T.p.screenshot({ path: 'shots/' + img + '.jpg', type: 'jpeg', quality: 82, timeout: 40000 }); }
console.log(T.logs.join('\n') || 'ok'); process.exit(0);
