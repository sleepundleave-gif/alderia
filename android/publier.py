#!/usr/bin/env python3
# PUBLIER SUR GITHUB : le jeu, l'application et le dossier des mises à jour en ligne.
#
#   GITHUB_TOKEN=ghp_…  python3 android/publier.py            (après « sh android/construire.sh »)
#
# Ce que fait ce script, dans l'ordre :
#   1. il copie dans un dossier de travail (hors de l'espace de travail) : jeu/, android/ SANS la clé de signature,
#      les modes d'emploi, et docs/ = le site (page de téléchargement + dossier « maj » des mises à jour en ligne) ;
#   2. il envoie le tout sur GitHub (branche main) ;
#   3. il allume « GitHub Pages » sur le dossier docs/ : c'est l'adresse que l'application interroge à chaque lancement ;
#   4. il crée la « release » de cette version avec Alderia.apk, la version pour ordinateur et le fichier .zip de mise à jour.
#
# Dès que le site est à jour (une à deux minutes), toutes les applications 1.3 et suivantes annoncent la nouvelle version
# à leur écran titre. Le jeton (GITHUB_TOKEN) n'est écrit nulle part.
import base64, json, os, shutil, subprocess, sys, tempfile, time, urllib.request, urllib.error

DEPOT = os.environ.get('DEPOT', 'sleepundleave-gif/alderia')
ICI = os.path.dirname(os.path.abspath(__file__)); RACINE = os.path.dirname(ICI); JEU = os.path.join(RACINE, 'jeu')
JETON = os.environ.get('GITHUB_TOKEN', '').strip()
if not JETON: sys.exit('Donnez le jeton : GITHUB_TOKEN=ghp_… python3 android/publier.py')
PROPRIO, NOM = DEPOT.split('/')
SITE = 'https://%s.github.io/%s/' % (PROPRIO, NOM)

def api(methode, chemin, corps=None, hote='https://api.github.com', brut=None, type_='application/json'):
    d = brut if brut is not None else (json.dumps(corps).encode() if corps is not None else None)
    r = urllib.request.Request(hote + chemin, data=d, method=methode, headers={'Authorization': 'Bearer ' + JETON, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'alderia-publier', 'Content-Type': type_})
    try:
        with urllib.request.urlopen(r, timeout=600) as f: t = f.read(); return f.status, (json.loads(t) if t else {})
    except urllib.error.HTTPError as e:
        t = e.read()
        try: return e.code, json.loads(t)
        except Exception: return e.code, {'message': t[:300].decode('utf-8', 'replace')}

def git(*a, cwd):
    entete = 'Authorization: Basic ' + base64.b64encode(('x-access-token:' + JETON).encode()).decode()
    r = subprocess.run(['git', '-c', 'http.extraheader=' + entete, '-c', 'user.name=' + PROPRIO, '-c', 'user.email=%s@users.noreply.github.com' % PROPRIO, '-c', 'core.autocrlf=false', '-c', 'http.postBuffer=524288000'] + list(a), cwd=cwd, capture_output=True, text=True)
    if r.returncode: sys.exit('git %s : %s' % (a[0], (r.stderr or r.stdout).replace(JETON, '***')[-600:]))
    return r.stdout.strip()

# ---- versions
sys.path.insert(0, os.path.join(JEU, 'outils')); import maj
vjeu, nomjeu, _ = maj.version()
manifs = sorted((f for f in os.listdir(os.path.join(ICI, 'versions')) if f.startswith('manifeste-app')), key=lambda f: int(f.split('app')[1].split('-')[0]))
code = int(manifs[-1].split('app')[1].split('-')[0])
nomapp = os.environ.get('NOM') or '1.%d' % (code - 1)
apk = os.path.join(RACINE, 'Alderia.apk')
if not os.path.isfile(apk): sys.exit("Alderia.apk manque : lancez d'abord android/construire.sh")
print('application %s (code %d), jeu version %d « %s »' % (nomapp, code, vjeu, nomjeu))

# ---- 1. le dossier de travail
T = tempfile.mkdtemp(prefix='alderia-depot-'); D = os.path.join(T, 'depot')
existe = api('GET', '/repos/%s/branches/main' % DEPOT)[0] == 200
if existe: git('clone', '--depth', '1', 'https://github.com/%s.git' % DEPOT, D, cwd=T)
else:
    os.makedirs(D); git('init', '-b', 'main', cwd=D); git('remote', 'add', 'origin', 'https://github.com/%s.git' % DEPOT, cwd=D)
for x in os.listdir(D):
    if x != '.git': p = os.path.join(D, x); shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
ignore = shutil.ignore_patterns('__pycache__', '*.pyc', 'journal.txt', 'node_modules', 'cle', '*.jks', '*.keystore')
shutil.copytree(JEU, os.path.join(D, 'jeu'), ignore=ignore)
shutil.copytree(ICI, os.path.join(D, 'android'), ignore=ignore)                       # (la clé de signature ne quitte jamais l'espace de travail)
shutil.copyfile(os.path.join(RACINE, 'LISEZ-MOI-Android.md'), os.path.join(D, 'LISEZ-MOI-Android.md'))
lien_apk = 'https://github.com/%s/releases/latest/download/Alderia.apk' % DEPOT
remplacer = lambda t: t.replace('{{APP}}', nomapp).replace('{{JEU}}', str(vjeu)).replace('{{NOM}}', nomjeu).replace('{{APK}}', lien_apk).replace('{{DEPOT}}', DEPOT).replace('{{SITE}}', SITE).replace('{{MO}}', ('%.1f' % (os.path.getsize(apk) / 1048576)).replace('.', ','))
open(os.path.join(D, 'README.md'), 'w', encoding='utf-8').write(remplacer(open(os.path.join(ICI, 'site', 'README.md'), encoding='utf-8').read()))
open(os.path.join(D, '.gitignore'), 'w').write('# la clé de signature ne se publie pas\nandroid/cle/\n*.jks\n*.keystore\n__pycache__/\nnode_modules/\n')
docs = os.path.join(D, 'docs'); os.makedirs(docs)
maj.copie(os.path.join(docs, 'maj'))                                                  # le dossier que l'application interroge
open(os.path.join(docs, 'maj', 'application.txt'), 'w', encoding='utf-8').write('code %d\nnom %s\nlien %s\n' % (code, nomapp, lien_apk))
open(os.path.join(docs, 'index.html'), 'w', encoding='utf-8').write(remplacer(open(os.path.join(ICI, 'site', 'index.html'), encoding='utf-8').read()))
open(os.path.join(docs, '.nojekyll'), 'w').write('')

# ---- 2. l'envoi
git('add', '-A', cwd=D)
if git('status', '--porcelain', cwd=D):
    git('commit', '-q', '-m', 'Application %s, jeu version %d : %s' % (nomapp, vjeu, nomjeu), cwd=D)
    git('push', '-q', 'origin', 'HEAD:main', cwd=D); print('envoyé sur https://github.com/' + DEPOT)
else: print('rien de nouveau à envoyer')
sha = git('rev-parse', 'HEAD', cwd=D)

# ---- 3. le site (GitHub Pages sur docs/)
c, r = api('GET', '/repos/%s/pages' % DEPOT)
if c == 404:
    c, r = api('POST', '/repos/%s/pages' % DEPOT, {'source': {'branch': 'main', 'path': '/docs'}})
    print('site allumé' if c in (201, 409) else 'site : réponse %s %s' % (c, r.get('message')))
elif r.get('source', {}).get('path') != '/docs':
    c, r = api('PUT', '/repos/%s/pages' % DEPOT, {'source': {'branch': 'main', 'path': '/docs'}}); print('site réglé sur docs/ (%s)' % c)

# ---- 4. la release
# (une release par application ; si seul le jeu a changé depuis, une release « v1.3-jeu14 »)
titre = 'Aldéria %s — jeu version %d' % (nomapp, vjeu)
c, rel = api('GET', '/repos/%s/releases/tags/v%s' % (DEPOT, nomapp)); tag = 'v' + nomapp
if c == 200 and rel.get('name') != titre: tag = 'v%s-jeu%d' % (nomapp, vjeu); c, rel = api('GET', '/repos/%s/releases/tags/%s' % (DEPOT, tag))
if c == 404:
    texte = remplacer(open(os.path.join(ICI, 'site', 'release.md'), encoding='utf-8').read())
    c, rel = api('POST', '/repos/%s/releases' % DEPOT, {'tag_name': tag, 'target_commitish': sha, 'name': titre, 'body': texte, 'make_latest': 'true'})
    if c != 201: sys.exit('release : %s %s' % (c, rel))
zipmaj = os.path.join(RACINE, 'mises-a-jour', 'alderia-maj-%d.zip' % vjeu)
pieces = [(apk, 'Alderia.apk', 'application/vnd.android.package-archive'), (os.path.join(RACINE, 'Alderia-hors-ligne.html'), 'Alderia-hors-ligne.html', 'text/html'), (zipmaj, os.path.basename(zipmaj), 'application/zip')]
deja = {a['name']: a['id'] for a in rel.get('assets', [])}; tailles = {a['name']: a['size'] for a in rel.get('assets', [])}
for chemin, nom, type_ in pieces:
    if not os.path.isfile(chemin): continue
    if tailles.get(nom) == os.path.getsize(chemin) and nom != 'Alderia.apk': print('  %s : déjà en place' % nom); continue
    if nom == 'Alderia.apk' and nom in deja and not os.environ.get('REFAIRE') and tailles.get(nom) == os.path.getsize(chemin): print('  %s : déjà en place' % nom); continue
    if nom in deja: api('DELETE', '/repos/%s/releases/assets/%d' % (DEPOT, deja[nom]))
    c, r = api('POST', '/repos/%s/releases/%d/assets?name=%s' % (DEPOT, rel['id'], nom), hote='https://uploads.github.com', brut=open(chemin, 'rb').read(), type_=type_)
    print('  %s : %s' % (nom, 'déposé (%.1f Mo)' % (os.path.getsize(chemin) / 1048576) if c == 201 else 'ÉCHEC %s %s' % (c, r.get('message'))))
print('release : ' + rel.get('html_url', ''))

# ---- attendre que le site serve la nouvelle version
for i in range(40):
    try:
        t = urllib.request.urlopen(SITE + 'maj/manifeste.txt?t=%d' % time.time(), timeout=20).read().decode('utf-8', 'replace')
        if ('version %d' % vjeu) in t.split('\n')[1]: print('site à jour : %smaj/ sert la version %d' % (SITE, vjeu)); break
    except Exception: pass
    time.sleep(15)
else: print("le site n'a pas encore la version %d (GitHub peut mettre quelques minutes) : %smaj/manifeste.txt" % (vjeu, SITE))
shutil.rmtree(T, ignore_errors=True)
