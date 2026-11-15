import { start } from './lib.mjs';
const [etat, ...phases] = process.argv.slice(2);
const T = await start(etat);
for (const nom of phases) {
  await T.ev((n) => { const g = window.__game; g.setFastText(true); g.debugPhase(n); }, nom);
  await T.p.waitForTimeout(3500);
  console.log(nom, await T.ev(() => { const E = window.__game.E, sc = E.scene || (E.stage && E.stage.group.parent); if (!sc) return 'pas de scène : ' + Object.keys(E).join(','); let tri = 0, kit = 0, inst = 0, feuilles = 0; const par = {}; sc.traverse((m) => { if (!m.isMesh) return; const g = m.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3, n = m.isInstancedMesh ? m.count : 1; tri += t * n; if (m.isInstancedMesh) { kit += t * n; inst += n; if (/Reel|Leaves|Bark/.test(m.material.name)) { par[m.material.name] = (par[m.material.name] || 0) + t * n; } } }); return JSON.stringify({ tri: Math.round(tri), kit: Math.round(kit), inst, par }); }));
}
await T.fin(0);
