// audit.mjs [phases…] : pour chaque lieu, cherche les personnages mal posés (dans un mur, dans un meuble, l'un dans l'autre, sur une dalle)
import { start } from './lib.mjs';
const T = await start('state4.json');
T.p.on('crash', () => { console.log('PAGE PLANTÉE'); process.exit(4); });
let phases = process.argv.slice(2); if (!phases.length) phases = await T.ev(() => window.__game.PHASE_NAMES);
for (const nom of phases) {
  await T.ev((n) => { const g = window.__game; g.setFastText(true); g.debugPhase(n); }, nom);
  await T.p.waitForTimeout(3200);
  const r = await T.ev(() => { const E = window.__game.E, st = E.stage, out = [], A = Object.entries(st.actors).filter(([k, o]) => o.parent && o.visible);
    const f = (v) => v.toFixed(1);
    for (const [k, o] of A) { const p = o.position;
      for (const c of st.colliders) { if (c.off || c.ghost || c.follow === o) continue;
        if (c.box) { if (p.x > c.x1 + 0.05 && p.x < c.x2 - 0.05 && p.z > c.z1 + 0.05 && p.z < c.z2 - 0.05) out.push(k + ' dans un mur (' + f(p.x) + ',' + f(p.z) + ') [' + [c.x1, c.z1, c.x2, c.z2].map(f) + ']'); }
        else if (!c.follow && Math.hypot(p.x - c.x, p.z - c.z) < c.r + 0.2) out.push(k + ' dans un objet (' + f(p.x) + ',' + f(p.z) + ') rond ' + f(c.x) + ',' + f(c.z) + ' r' + f(c.r)); }
      for (const [k2, o2] of A) if (k2 > k && Math.hypot(p.x - o2.position.x, p.z - o2.position.z) < 0.7) out.push(k + ' et ' + k2 + ' au même endroit (' + f(p.x) + ',' + f(p.z) + ')');
      if (st.grille) { const h = st.solPose(p.x, p.z), h2 = st.sol(p.x, p.z, 3); if (h > 0.03 || h2 > 0.03) out.push(k + ' sur une dalle de ' + h.toFixed(2) + ' (max ' + h2.toFixed(2) + ') y=' + p.y.toFixed(2)); } }
    return { lieu: st.name, n: A.length, grille: !!st.grille, pb: out, err: document.getElementById('err').textContent.slice(0, 200) }; });
  console.log(nom, '·', r.lieu, '·', r.n, 'personnages', r.grille ? '' : '(sans relevé)', r.err ? 'ERREUR ' + r.err : ''); for (const l of r.pb) console.log('    ' + l);
}
await T.fin(0);
