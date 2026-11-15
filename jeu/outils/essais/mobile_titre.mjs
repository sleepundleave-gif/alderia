// mobile_titre.mjs [prefixe] : écran titre, écran des mises à jour, création du héros, sur un téléphone imité
import { chromium } from 'playwright';
const pre = process.argv[2] || 't', [vl, vh] = (process.env.VUE || '640x360').split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: vl, height: vh }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }), p = await ctx.newPage(), logs = [];
p.on('console', (m) => { if (m.type() === 'error') logs.push('error: ' + m.text()); }); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
if (process.env.ANNONCE) await p.addInitScript(() => { window.__annonceEssai = true; });
if (process.env.ENCOCHES) await p.addInitScript((e) => { window.__encochesEssai = e; }, process.env.ENCOCHES.split(',').map(Number));
if (process.env.APP !== '0') await p.addInitScript(() => {
  const dire = (...a) => setTimeout(() => window.__maj && window.__maj(...a), 60);
  window.AlderiaApp = { infos: () => JSON.stringify({ app: '1.0', code: 1, jeu: 10, nom: 'Chapitres 1 à 10', base: 10, maj: false, adresse: '' }), encoches: () => '0,0,0,0',
    verifier: () => { if (window.__annonceEssai) setTimeout(() => window.__nouveau && window.__nouveau({ jeu: 14, nom: 'Chapitre 11 : les Marais de Brume', appMin: 0, appCode: 5, appNom: '1.4', lien: 'https://github.com/sleepundleave-gif/alderia/releases/latest' }), 200); }, ouvrir: (l) => { window.__ouvert = l; },
    chercher: (a) => { window.__cherche = a; dire('cours', 'Téléchargement…', 0.4); }, choisirFichier: () => dire('echec', "Ce fichier n'est pas une mise à jour d'Aldéria.", -1), retablir: () => {}, quitter: () => {} };
});
await p.goto((process.env.ADRESSE || 'http://localhost:8000/') + 'index.html');
await p.waitForFunction(() => !document.getElementById('loading') && !document.getElementById('title').classList.contains('hidden'), null, { timeout: 120000 }); await p.waitForTimeout(1500); await p.evaluate(() => { window.__sansImage = true; });
let fautes = 0;
const verifier = async (nom) => {
  const r = await p.evaluate(() => { const W = innerWidth, H = innerHeight, E = window.__ecran, out = [], vu = new Set(), fonds = new Set(['fade', 'card', 'title', 'menu', 'narr', 'majEcran', 'perso', 'touch', 'dmg']);
    for (const el of document.querySelectorAll('#ui *')) { if (el.closest('.hidden')) continue; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue; const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || fonds.has(el.id)) continue;
      if (/auto|scroll/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2) out.push('(défile) ' + (el.id || el.className) + ' ' + el.scrollHeight + ' > ' + el.clientHeight);
      let a = el.parentElement, coupe = false; while (a && a.id !== 'ui') { if (/auto|scroll|hidden/.test(getComputedStyle(a).overflow)) { coupe = true; break; } a = a.parentElement; } if (coupe) continue;
      const n = el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]; if (vu.has(n)) continue;
      if (r.left < E.g - 1 || r.right > W - E.d + 1 || r.top < E.h - 1 || r.bottom > H - E.b + 1) { vu.add(n); out.push('DÉBORDE ' + n + ' [' + [r.left, r.top, r.right, r.bottom].map(Math.round) + ']'); } }
    return { out, k: +E.k.toFixed(3), ui: [Math.round(E.l), Math.round(E.t)], cls: document.body.className }; });
  console.log(`${nom} · k=${r.k} interface ${r.ui.join('×')} · ${r.cls}`); for (const l of r.out) { console.log('    ' + l); if (/^DÉBORDE/.test(l)) fautes++; }
  await p.evaluate(() => { window.__sansImage = false; }); await p.waitForTimeout(1800);
  try { await p.screenshot({ path: 'shots/' + pre + '_' + nom + '.jpg', type: 'jpeg', quality: 82, timeout: 25000 }); } catch (e) { console.log('capture ratée ' + nom); }
  await p.evaluate(() => { window.__sansImage = true; });
};
const toucher = async (texte) => { const ok = await p.evaluate((t) => { const b = [...document.querySelectorAll('#ui button')].find((b) => b.textContent.includes(t) && !b.closest('.hidden')); if (b) b.click(); return !!b; }, texte); if (!ok) console.log('bouton absent : ' + texte); await p.waitForTimeout(1200); };
console.log('annonce (titre) :', await p.evaluate(() => document.getElementById('titleNouveau').textContent), '· bouton marqué :', await p.evaluate(() => [...document.querySelectorAll('#titleBtns button.neuf')].map((b) => b.textContent).join()));
await verifier('titre');
await toucher('Options'); await p.waitForTimeout(500); await verifier('options'); await toucher('images par seconde'); await p.waitForTimeout(700); console.log('compteur :', await p.evaluate(() => { const c = document.getElementById('compteur'); return c ? getComputedStyle(c).display + ' « ' + c.textContent + ' »' : 'absent'; })); await toucher('images par seconde'); await p.waitForTimeout(300); await toucher('Retour'); await p.waitForTimeout(500);
console.log('alerte :', await p.evaluate(() => document.getElementById('titleAlerte').textContent), '· niveau', await p.evaluate(() => window.__game.Q.nom));
if (process.env.APP !== '0') { await toucher('Mises à jour'); await verifier('maj'); console.log('annonce (mises à jour) :', await p.evaluate(() => document.getElementById('majNouveau').textContent), '· adresse :', await p.evaluate(() => document.getElementById('majAdresse').value), '· bouton appli :', await p.evaluate(() => getComputedStyle(document.getElementById('majAppli')).display)); await toucher('Installer un fichier'); await p.waitForTimeout(300); await verifier('maj_echec'); await toucher('Retour'); await p.waitForTimeout(600); }
await toucher('Nouvelle partie'); await p.waitForTimeout(2500); await verifier('heros');
const retour = await p.evaluate(() => window.__retour()); console.log('touche Retour sur la création du héros →', retour);
console.log(fautes ? fautes + ' débordements' : 'aucun débordement'); console.log(logs.join('\n') || 'no console errors');
await b.close();
