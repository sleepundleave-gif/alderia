// cartes_jeu.mjs dossier phases… : la carte du jeu (celle du menu) de chaque lieu, en image ; écrit aussi dossier/liste.json (lieu, nom, phases)
import { start } from './lib.mjs';
import fs from 'fs';
const [dossier, ...phases] = process.argv.slice(2);
const T = await start('state4.json'); T.p.on('crash', () => { console.log('PAGE PLANTÉE'); process.exit(4); });
const liste = fs.existsSync(dossier + '/liste.json') ? JSON.parse(fs.readFileSync(dossier + '/liste.json', 'utf8')) : {};
for (const nom of phases) {
  await T.ev((n) => { const g = window.__game; g.setFastText(true); g.debugPhase(n); }, nom); await T.p.waitForTimeout(3800);
  const r = await T.ev(async () => { const u = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /\/carte\.js/.test(n)); const D = await import(u), st = window.__game.E.stage;
    const c = D.dessinerCarte(1500, 900); return { lieu: st.name, nom: D.nomDuLieu(st), image: c.toDataURL('image/jpeg', 0.84), t: c.width + '×' + c.height }; });
  const e = liste[r.lieu] || (liste[r.lieu] = { nom: r.nom, phases: [] }); if (!e.phases.includes(nom)) e.phases.push(nom);
  if (e.phases[0] === nom) { fs.writeFileSync(`${dossier}/${r.lieu}.jpg`, Buffer.from(r.image.split(',')[1], 'base64')); console.log(nom, '→', r.lieu, '·', r.nom, r.t); } else console.log(nom, '→', r.lieu, '(déjà fait)');
  fs.writeFileSync(dossier + '/liste.json', JSON.stringify(liste, null, 1));
}
console.log(T.logs.join('\n') || 'aucune erreur'); process.exit(0);
