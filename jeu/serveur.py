#!/usr/bin/env python3
# Petit serveur web pour le jeu. Il est volontairement simple : une demande, une réponse, puis la connexion est fermée.
# Ce qu'il fait de plus que « python3 -m http.server » :
#   1. ADRESSES DATÉES. Chaque page reçoit une ligne <base href="v/NUMÉRO/"> : tout le reste (code, style, modèles)
#      est alors demandé sous /v/NUMÉRO/... Le numéro change dès qu'un fichier du jeu change. Un navigateur ou un
#      relais qui aurait gardé une ancienne copie ne peut donc plus la resservir : l'adresse n'est plus la même.
#   2. PAQUET DE MODÈLES. Au démarrage (et quand un modèle a changé) il refait modeles/paquet/ avec outils/paquet.py.
#   3. JOURNAL. Le jeu lui signale ce qui se passe au chargement (ligne « JOURNAL » ci-dessous et outils/journal.txt).
# Usage : python3 serveur.py [port]            (puis ouvrir http://localhost:8000)
# Essais : PANNE=0.4 PANNE_CODE=0.2 python3 serveur.py 8001   → 40 % des téléchargements de modèles (et 20 % des
#          fichiers de code) coupés ou refusés exprès : le jeu doit quand même arriver à l'écran titre.
import os, re, sys, time, random
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ICI, 'outils'))
import paquet

TYPES = {'.gltf': 'model/gltf+json', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
         '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8'}
PREFIXE = re.compile(r'^(/v/[0-9a-z]+)+(?=/)')        # /v/NUMÉRO/ (une ou plusieurs fois) devant le vrai chemin
PANNE = float(os.environ.get('PANNE', '0'))
PANNE_CODE = float(os.environ.get('PANNE_CODE', '0'))      # même chose pour les fichiers de code
JOURNAL = os.path.join(ICI, 'outils', 'journal.txt')
_version = [0, '']

def version():
    """Numéro qui change dès qu'un fichier du jeu change (date la plus récente + taille totale)."""
    if time.time() - _version[0] < 1: return _version[1]
    if not paquet.a_jour(): print('PAQUET refait :', paquet.construire(), flush=True)
    recent = 0; total = 0
    for dossier in ('', 'js', 'css', 'lib', os.path.join('modeles', 'paquet')):
        d = os.path.join(ICI, dossier)
        for f in os.listdir(d):
            if f.endswith(('.html', '.js', '.css', '.json')):
                st = os.stat(os.path.join(d, f)); recent = max(recent, int(st.st_mtime)); total += st.st_size
    _version[0] = time.time(); _version[1] = '%x%x' % (recent, total % 4096)
    return _version[1]

class Handler(SimpleHTTPRequestHandler):
    timeout = 60
    def do_GET(self): self.repondre(True)
    def do_HEAD(self): self.repondre(False)
    def do_OPTIONS(self): self.court(204)
    def do_POST(self):
        n = min(int(self.headers.get('Content-Length') or 0), 8192); texte = self.rfile.read(n).decode('utf-8', 'replace').replace('\n', ' | ') if n else ''
        ligne = '%s JOURNAL %s %s' % (time.strftime('%H:%M:%S'), self.client_address[0], texte)
        print(ligne, flush=True)
        try:
            with open(JOURNAL, 'a') as f: f.write(time.strftime('%Y-%m-%d ') + ligne + ' | ' + (self.headers.get('User-Agent') or '')[:120] + '\n')
        except OSError: pass
        self.court(204)
    def court(self, code):
        self.send_response(code); self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Access-Control-Allow-Headers', '*'); self.send_header('Cache-Control', 'no-store'); self.send_header('Content-Length', '0'); self.end_headers()
    def repondre(self, corps):
        chemin = self.path.split('?')[0].split('#')[0]; vrai = PREFIXE.sub('', chemin); date = vrai != chemin
        path = self.translate_path(vrai)
        if os.path.isdir(path): path = os.path.join(path, 'index.html')
        if not os.path.isfile(path): self.send_error(404, 'Fichier introuvable'); return
        ext = os.path.splitext(path)[1].lower()
        with open(path, 'rb') as f: data = f.read()
        if ext == '.html':
            # la page elle-même n'est jamais gardée en mémoire ; elle indique l'adresse datée de tout le reste
            monte = '../' * (chemin.count('/') - 1)
            data = data.replace(b'<head>', ('<head>\n<base href="%sv/%s/">' % (monte, version())).encode(), 1); cache = 'no-store'
        else:
            cache = 'public, max-age=31536000, immutable' if date else 'no-store'
        if PANNE and corps and ('/modeles/' in vrai or (PANNE_CODE and ext == '.js')) and random.random() < (PANNE if '/modeles/' in vrai else PANNE_CODE):
            if random.random() < 0.3: self.send_error(503, 'Panne simulee'); return
            self.send_response(200); self.send_header('Content-Type', TYPES.get(ext) or self.guess_type(path)); self.send_header('Content-Length', str(len(data))); self.end_headers()
            self.wfile.write(data[:len(data) // 2]); return                       # coupure au milieu
        self.send_response(200)
        self.send_header('Content-Type', TYPES.get(ext) or self.guess_type(path))
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', cache)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        if corps: self.wfile.write(data)
    def log_message(self, fmt, *args):
        if self.client_address[0] == '127.0.0.1' and len(args) > 1 and str(args[1])[:1] in '23': return     # essais faits sur la machine même : pas de ligne
        sys.stdout.write('%s %s %s\n' % (time.strftime('%H:%M:%S'), self.client_address[0], fmt % args)); sys.stdout.flush()

if __name__ == '__main__':
    os.chdir(ICI)
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print('ALDÉRIA : serveur prêt sur le port', port, '· version', version(), flush=True)
    ThreadingHTTPServer(('0.0.0.0', port), Handler).serve_forever()
