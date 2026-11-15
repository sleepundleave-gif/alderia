// suite.mjs [phase] : le héros marche (touches) contre des murs, des étals et des personnages ; à chaque étape on vérifie
// que ni lui ni ses compagnons ne sont dans un mur, dans un objet ou l'un dans l'autre, et qu'ils sont posés à la hauteur du sol.
import { start } from './lib.mjs';
const T = await start('state4.json'), nom = process.argv[2] || 'ch1_forge';
const trajets = { ch1_forge: [[-12.6, 2.2, 'KeyA', 1800], [-13.2, 0, 'KeyW', 1500], [-6.5, -5.4, 'KeyW', 2200], [5.5, -6.2, 'KeyD', 2500], [0, -2, 'KeyW', 2500], [0, 4, 'KeyS', 2500]],
  ch3_ville: [[14.5, -18, 'KeyD', 2500], [-6, 36.4, 'KeyA', 2500], [0, -3, 'KeyW', 2500], [-4.6, -15.4, 'KeyW', 2500]],
  ch7_port: [[-9, 7.4, 'KeyW', 2500], [9, 7.4, 'KeyW', 2500], [-18.5, 6, 'KeyA', 2500]] }[nom];
await T.ev((n) => { const g = window.__game; g.setFastText(true); g.debugPhase(n); }, nom);
await T.p.waitForTimeout(4200);
let fautes = 0;
for (const [x, z, touche, ms] of trajets) {
  await T.tp(x, z); await T.ev(() => { const E = window.__game.E; [E.player, ...E.followers].forEach((o) => { o.userData.gy = undefined; }); });
  await T.p.waitForTimeout(500);
  await T.p.keyboard.down(touche); await T.p.waitForTimeout(ms); await T.p.keyboard.up(touche); await T.p.waitForTimeout(700);
  const r = await T.ev(() => { const E = window.__game.E, st = E.stage, out = [], f = (v) => v.toFixed(2), tous = [['héros', E.player], ...E.followers.map((o, i) => ['compagnon' + (i + 1), o])].filter(([, o]) => o.visible);
    const autres = Object.entries(st.actors).filter(([, o]) => o.parent && o.visible && !tous.some(([, t]) => t === o));
    for (const [k, o] of tous) { const p = o.position;
      for (const c of st.colliders) { if (c.off || c.ghost || c.follow === o) continue;
        if (c.box) { if (p.x > c.x1 + 0.08 && p.x < c.x2 - 0.08 && p.z > c.z1 + 0.08 && p.z < c.z2 - 0.08) out.push(k + ' dans un mur'); }
        else if (Math.hypot(p.x - c.x, p.z - c.z) < c.r - 0.05) out.push(k + ' dans ' + (c.follow ? 'un personnage' : 'un objet') + ' (' + f(Math.hypot(p.x - c.x, p.z - c.z)) + ' < ' + f(c.r) + ')'); }
      for (const [k2, o2] of tous) if (k2 > k && Math.hypot(p.x - o2.position.x, p.z - o2.position.z) < 0.6) out.push(k + ' et ' + k2 + ' à ' + f(Math.hypot(p.x - o2.position.x, p.z - o2.position.z)) + ' m');
      const h = st.grille ? st.sol(p.x, p.z, p.y) : 0; if (Math.abs(h - p.y) > 0.03) out.push(k + ' y=' + f(p.y) + ' sol=' + f(h)); }
    return { pos: tous.map(([k, o]) => k[0] + ' ' + f(o.position.x) + ',' + f(o.position.z) + ',y' + f(o.position.y)).join(' | '), out, n: autres.length, bataille: !document.getElementById('battle').classList.contains('hidden') }; });
  console.log(`${x},${z} ${touche} →`, r.pos, r.bataille ? '(combat)' : ''); for (const l of r.out) { console.log('    FAUTE ' + l); fautes++; }
}
console.log(fautes ? fautes + ' fautes' : 'aucune faute');
await T.fin(0);
