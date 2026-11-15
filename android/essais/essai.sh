#!/bin/sh
# Essai du moteur de mises à jour sur l'ordinateur (Java 11 ou plus, python3 pour le petit serveur).
cd "$(dirname "$0")/.." || exit 1
T=$(mktemp -d); JAVA=${JAVA_HOME:+$JAVA_HOME/bin/}
"${JAVA}javac" -encoding UTF-8 -d "$T/cls" src/com/alderia/couronne/Maj.java essais/EssaiMaj.java || exit 1
mkdir -p "$T/web"; (cd "$T/web" && exec python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1) & S=$!
sleep 1
"${JAVA}java" -Dfile.encoding=UTF-8 -Dsun.stdout.encoding=UTF-8 -cp "$T/cls" EssaiMaj http://127.0.0.1:8765/ "$T/web"; R=$?
kill $S 2>/dev/null; rm -rf "$T"; exit $R
