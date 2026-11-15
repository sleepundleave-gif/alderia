import { start } from './lib.mjs';
const T = await start('state4.json'), { p, ev } = T;
const ph = process.argv[2] || 'ch3_ville';
await ev((ph) => { const g = window.__game; g.setFastText(true); g.debugPhase(ph); }, ph); await p.waitForTimeout(5000);
const r = await ev(() => { const g = window.__game, E = g.E, st = E.stage, D = st.details || [], tri = (x) => x.index.count / 3;
  const persos = [E.player, ...E.followers, ...st.anims].filter((o) => o && o.userData.corps);
  const pd = persos.map((o) => { const u = o.userData, l = u.details || []; let n = 0, a = 0, b = 0; u.corps.traverse((m) => { if (m.isMesh) n++; }); for (const e of l) { a += tri(e.pres); b += tri(e.loin); } return n + ' pièces, ' + l.length + ' avec version lointaine ' + Math.round(a) + '→' + Math.round(b) + (u.detailLoin ? ' LOIN' : ''); });
  let a = 0, b = 0, nl = 0; for (const e of D) { a += tri(e.pres) * (e.m.count || 1); b += tri(e.loin) * (e.m.count || 1); if (e.etat) nl++; }
  const info = E.renderer.info;
  return { niveau: g.Q.nom, bilan: g.BILAN, decor: D.length + ' éléments à deux versions (' + nl + ' au loin en ce moment) : ' + Math.round(a / 1000) + ' k → ' + Math.round(b / 1000) + ' k', persos: pd.slice(0, 8), n: persos.length, dessin: info.render.calls + ' objets, ' + Math.round(info.render.triangles / 1000) + ' k triangles', geos: info.memory.geometries }; });
console.log(JSON.stringify(r, null, 1));
await T.fin(0);
