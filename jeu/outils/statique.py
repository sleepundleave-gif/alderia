# Imite l'hébergement « fichiers de l'espace de travail » : simple serveur statique, en-tête CSP sans blob: ni data:
import sys, os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
CSP = os.environ.get('CSP', "default-src 'self' 'unsafe-inline'")
class H(SimpleHTTPRequestHandler):
    def end_headers(self):
        if CSP: self.send_header('Content-Security-Policy', CSP)
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
    def do_POST(self): self.send_error(405)
    def log_message(self, *a): pass
os.chdir('/home/user')
ThreadingHTTPServer(('0.0.0.0', int(sys.argv[1])), H).serve_forever()
