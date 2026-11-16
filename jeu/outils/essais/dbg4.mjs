import { start } from './lib.mjs';
const T = await start('state4.json');
await T.ev((n) => { const g = window.__game; g.setFastText(true); g.debugPhase(n); }, process.argv[2]); await T.p.waitForTimeout(4000);
console.log(JSON.stringify(await T.ev((c) => { const g = window.__game; return new Function('g', 'E', 'st', 'S', c)(g, g.E, g.E.stage, g.E.stage.spots); }, process.argv[3]))); process.exit(0);
