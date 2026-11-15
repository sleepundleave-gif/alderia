#!/usr/bin/env python3
# Fabrique la VERSION HORS LIGNE du jeu : un seul fichier HTML qui contient tout
# (la page, le style, tout le code réuni, et les modèles 3D). On l'ouvre d'un double-clic :
# pas de serveur, pas d'Internet. Les sauvegardes restent dans le navigateur.
#
#   python3 outils/hors_ligne.py [fichier de sortie]
#
# Il faut « esbuild » pour réunir les fichiers de code (une fois : npm install esbuild).
# Le script le cherche dans : la variable ESBUILD, le PATH, outils/node_modules, puis « npx esbuild ».
import os, sys, re, json, base64, subprocess, shutil

ICI = os.path.dirname(os.path.abspath(__file__)); JEU = os.path.normpath(os.path.join(ICI, '..'))
SORTIE = sys.argv[1] if len(sys.argv) > 1 else os.path.normpath(os.path.join(JEU, '..', 'Alderia-hors-ligne.html'))

def esbuild():
    for c in [os.environ.get('ESBUILD'), shutil.which('esbuild'), os.path.join(ICI, 'node_modules', '.bin', 'esbuild'), '/tmp/tools/node_modules/.bin/esbuild']:
        if c and os.path.exists(c): return [c]
    return ['npx', '--yes', 'esbuild']

# 1. le paquet de modèles à jour
subprocess.run([sys.executable, os.path.join(ICI, 'paquet.py')], check=True, stdout=subprocess.DEVNULL)
# 2. tout le code en un seul script. import.meta.url n'existe pas dans un script simple : on lui donne une adresse
#    de convention, qui ne sert que de nom pour ranger les fichiers du paquet en mémoire (rien n'y est demandé).
r = subprocess.run(esbuild() + [os.path.join(JEU, 'js', 'main.js'), '--bundle', '--format=iife', '--minify-whitespace', '--charset=utf8', '--log-level=error',
                                '--define:import.meta.url="https://alderia.invalid/js/jeu.js"'], check=True, stdout=subprocess.PIPE)
code = r.stdout.decode('utf-8').replace('</script', '<\\/script')
# 3. les morceaux du paquet, écrits en base64 dans la page
P = os.path.join(JEU, 'modeles', 'paquet'); idx = json.load(open(os.path.join(P, 'index.json'), encoding='utf-8'))
blocs = ['<script type="application/octet-stream" id="hl:index.json">' + base64.b64encode(open(os.path.join(P, 'index.json'), 'rb').read()).decode() + '</script>']
for nom, taille, crc in idx['morceaux']:
    blocs.append('<script type="application/octet-stream" id="hl:%s">%s</script>' % (nom, base64.b64encode(open(os.path.join(P, nom), 'rb').read()).decode()))
lecteur = '''<script>
// VERSION HORS LIGNE : les modèles sont dans cette page. Cette fonction rend les octets d'un morceau du paquet.
window.__HORS_LIGNE = function (nom) {
  var el = document.getElementById('hl:' + nom); if (!el) return null;
  var t = atob(el.textContent), n = t.length, b = new Uint8Array(n); for (var i = 0; i < n; i++) b[i] = t.charCodeAt(i);
  el.textContent = ''; return b;                       // le texte ne sert plus : on rend la place
};
window.addEventListener('error', function (e) { var el = document.getElementById('err'); if (el && !el.textContent) { el.style.display = 'block'; el.textContent = 'Erreur au démarrage du jeu :\\n' + (e.message || e); } });
</script>'''
# 4. la page : style écrit dedans, chargeur réseau remplacé par le code réuni
html = open(os.path.join(JEU, 'index.html'), encoding='utf-8').read()
css = open(os.path.join(JEU, 'css', 'style.css'), encoding='utf-8').read()
html, n1 = re.subn(r'<link rel="stylesheet"[^>]*>', lambda m: '<style>\n' + css + '\n</style>', html, count=1)
a = html.rindex('<script>'); b = html.rindex('</script>') + len('</script>')
html = html[:a] + '\n'.join(blocs) + '\n' + lecteur + '\n<script>\n' + code + '\n</script>' + html[b:]
html = html.replace('<a id="galLink"', '<a id="galLink" style="display:none"')
assert n1 == 1 and 'href="css/' not in html and 'src="' not in html.split('<script type="application/octet-stream"')[0], 'il reste un fichier externe dans la page'
html = html.replace('<head>', '<head>\n<!-- ALDÉRIA : LA COURONNE D\'AUBE — version hors ligne. Fichier fabriqué par outils/hors_ligne.py : ne pas le modifier à la main. -->', 1)
open(SORTIE, 'w', encoding='utf-8').write(html)
print('%s : %.1f Mo (code %.1f Mo, modèles %.1f Mo, %d morceaux)' % (SORTIE, os.path.getsize(SORTIE) / 1048576, len(code) / 1048576, idx['taille'] / 1048576, len(idx['morceaux'])))
