// node csp.mjs <port> [bac] : ouvre le jeu comme un simple fichier statique (JeuRPG/jeu/index.html) et dit ce qui se passe
import { chromium } from 'playwright';
const port = process.argv[2], bac = process.argv.includes('bac');
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } }); p.setDefaultTimeout(120000);
const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 260)); }); p.on('pageerror', e => errs.push('PAGE ' + e.message));
const url = `http://localhost:${port}/JeuRPG/jeu/index.html`;
if (bac) await p.setContent(`<iframe sandbox="allow-scripts" src="${url}" style="width:620px;height:340px;border:0"></iframe>`); else await p.goto(url);
const f = bac ? p.frames()[1] : p;
await f.evaluate(() => { window.__sansImage = true; }).catch(() => {});
let etat = '';
for (let i = 0; i < 300; i++) {
  etat = await f.evaluate(() => { const e = document.getElementById('err'), t = document.getElementById('title'); return (e && e.textContent.trim()) ? 'ERREUR ' + e.textContent.trim().slice(0, 500) : (t && !t.classList.contains('hidden') && !document.getElementById('loading')) ? 'TITRE' : ''; }).catch(() => '');
  if (etat) break; await p.waitForTimeout(300);
}
console.log('etat :', etat || 'rien apres 90 s : ' + await f.evaluate(() => document.getElementById('loading')?.innerText));
if (etat === 'TITRE') {
  // nouvelle partie : écran de création (vocation, apparence), puis le jeu
  await f.click('#titleBtns > *'); await f.waitForSelector('#persoListe .opt'); await p.waitForTimeout(600);
  await f.click('#persoListe .opt'); await f.waitForSelector('#persoBoutons .opt'); await p.waitForTimeout(600);
  await f.click('#persoBoutons .opt');
  for (let i = 0; i < 200; i++) { if (await f.evaluate(() => { const g = window.__game; return g && g.E.enabled && g.E.busy === 0 && g.E.stage; })) break; await f.evaluate(() => window.__game && window.__game.setFastText(true)); await p.waitForTimeout(300); }
  const r = await f.evaluate(() => { const g = window.__game; return g ? { lieu: g.E.stage && g.E.stage.name, vocation: g.G.flags.heros && g.G.flags.heros.classe, joueur: !!(g.E.player && g.E.player.userData.imported), err: document.getElementById('err').textContent.slice(0, 300) } : 'pas de __game'; });
  console.log('partie :', JSON.stringify(r));
  // entrer dans une maison puis en ressortir
  const m = await f.evaluate(() => { const g = window.__game, d = g.E.stage.inter.find(i => i.label === 'Entrer'); if (!d) return null; g.E.player.position.set(d.x, 0, d.z); return true; });
  if (m) {
    await p.waitForTimeout(500); await p.keyboard.press('KeyE'); await p.waitForTimeout(2500);
    const dedans = await f.evaluate(() => window.__game.E.stage.name);
    await f.evaluate(() => { const g = window.__game, z = g.E.stage.interieur && g.E.stage.interieur.sortie; if (z) g.E.player.position.set(0, 0, z.z1 + 0.3); }); await p.waitForTimeout(2500);
    console.log('maison :', dedans, '→', await f.evaluate(() => window.__game.E.stage.name));
  } else console.log('maison : aucune porte');
}
console.log('erreurs console :', errs.length, errs.slice(0, 6));
await b.close();
