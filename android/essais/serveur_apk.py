#!/usr/bin/env python3
# Sert le jeu TEL QU'IL EST DANS L'APK, comme le fait l'application (MainActivity.servir) :
# seuls les fichiers du manifeste existent, le préfixe /v/<id> est retiré, « journal » répond 204.
#   python3 essais/serveur_apk.py ../Alderia.apk 8100       puis ouvrir http://localhost:8100/
# Permet de vérifier sur l'ordinateur qu'il ne manque aucun fichier dans l'APK.
import re, sys, zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
apk = zipfile.ZipFile(sys.argv[1]); port = int(sys.argv[2]) if len(sys.argv) > 2 else 8100
connus = set()
for l in apk.read('assets/jeu/manifeste.txt').decode('utf-8').split('\n'):
    if l.startswith('f '): connus.add(l.split(' ', 3)[3])
TYPES = {'html': 'text/html; charset=utf-8', 'js': 'text/javascript; charset=utf-8', 'css': 'text/css; charset=utf-8', 'json': 'application/json', 'txt': 'text/plain; charset=utf-8', 'png': 'image/png', 'jpg': 'image/jpeg'}
refus = []
class H(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def rep(self, code, corps=b'', type='text/plain'):
        self.send_response(code); self.send_header('Content-Type', type); self.send_header('Content-Length', str(len(corps))); self.send_header('Cache-Control', 'no-store'); self.end_headers()
        if self.command != 'HEAD': self.wfile.write(corps)
    def do_GET(self):
        c = re.sub(r'^(/v/[0-9a-z]+)+(?=/)', '', self.path.split('?')[0]).lstrip('/') or 'index.html'
        if c == 'journal': return self.rep(204)
        if c == '__refus': return self.rep(200, '\n'.join(refus).encode())
        if c not in connus: refus.append(c); return self.rep(404)
        self.rep(200, apk.read('assets/jeu/' + c), TYPES.get(c.rsplit('.', 1)[-1], 'application/octet-stream'))
    do_HEAD = do_GET
    def do_POST(self):
        n = int(self.headers.get('Content-Length') or 0); self.rfile.read(n); self.rep(204)
    def log_message(self, *a): pass
print('jeu de l\'APK : %d fichiers, port %d' % (len(connus), port), flush=True)
ThreadingHTTPServer(('0.0.0.0', port), H).serve_forever()
