#!/bin/sh
# FABRIQUE L'APK D'ALDÉRIA, sans Android Studio ni Gradle.
#
#   sh construire.sh            → ../Alderia.apk  (jeu complet embarqué : il fonctionne sans connexion)
#
# Il faut : Java 11 ou plus (javac, keytool), python3, et les outils Android « build-tools » 34 et « platform » 34 :
#   https://dl.google.com/android/repository/build-tools_r34-linux.zip   → dossier indiqué par BT
#   https://dl.google.com/android/repository/platform-34-ext7_r03.zip    → android.jar indiqué par AJ
#
# CODE et NOM : version de l'APPLICATION (à augmenter quand on redistribue un APK). La version du JEU est dans jeu/version.txt.
# La clé de signature (cle/alderia.jks) est créée au premier lancement. GARDEZ-LA : un APK signé avec une autre clé ne peut pas
# remplacer l'application installée (il faudrait la désinstaller, et les sauvegardes seraient perdues).
set -e
cd "$(dirname "$0")"
CODE=${CODE:-1}; NOM=${NOM:-1.0}
BT=${BT:-$HOME/.cache/android/android-14}; AJ=${AJ:-$HOME/.cache/android/android-34/android.jar}
JAVA=${JAVA_HOME:+$JAVA_HOME/bin/}
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
mkdir -p "$T/gen" "$T/cls" "$T/dex" "$T/assets" cle versions

echo "1/6 le jeu et son manifeste"
V=$(python3 ../jeu/outils/maj.py copie "$T/assets/jeu" | tee /dev/stderr | sed 's/^version \([0-9]*\).*/\1/')

echo "2/6 ressources"
"$BT/aapt2" compile --dir res -o "$T/res.zip"
"$BT/aapt2" link -o "$T/base.apk" -I "$AJ" --manifest AndroidManifest.xml --java "$T/gen" -A "$T/assets" -0 bin \
    --min-sdk-version 21 --target-sdk-version 34 --version-code "$CODE" --version-name "$NOM" "$T/res.zip"

echo "3/6 code Java"
"${JAVA}javac" -nowarn -source 8 -target 8 -encoding UTF-8 -bootclasspath "$AJ" -d "$T/cls" src/com/alderia/couronne/*.java "$T/gen/com/alderia/couronne/R.java" 2>&1 | grep -v "^Note:\|bootstrap class path\|^1 warning" || true
"$BT/d8" --release --min-api 21 --lib "$AJ" --output "$T/dex" $(find "$T/cls" -name '*.class')

echo "4/6 assemblage"
(cd "$T/dex" && zip -q -9 "$T/base.apk" classes.dex)
"$BT/zipalign" -f -p 4 "$T/base.apk" "$T/aligne.apk"

echo "5/6 signature"
if [ ! -f cle/alderia.jks ]; then
    "${JAVA}keytool" -genkeypair -keystore cle/alderia.jks -storepass alderia-couronne -keypass alderia-couronne -alias alderia \
        -keyalg RSA -keysize 2048 -validity 12000 -dname "CN=Alderia La Couronne d'Aube, O=Alderia" >/dev/null 2>&1
    echo "    clé créée : cle/alderia.jks (à conserver)"
fi
"$BT/apksigner" sign --ks cle/alderia.jks --ks-pass pass:alderia-couronne --ks-key-alias alderia --v1-signing-enabled true --v2-signing-enabled true --out ../Alderia.apk "$T/aligne.apk"
rm -f ../Alderia.apk.idsig

echo "6/6 vérification"
"$BT/apksigner" verify --min-sdk-version 21 ../Alderia.apk && echo "    signature valide"
"$BT/zipalign" -c -p 4 ../Alderia.apk && echo "    alignement correct"
"$BT/aapt2" dump badging ../Alderia.apk | grep -E "^package|^sdkVersion|^targetSdkVersion|^application-label:|launchable-activity|uses-permission" | sed 's/^/    /'
# on garde le manifeste de cet APK : les mises à jour (.zip) ne contiendront que ce qui a changé depuis
cp "$T/assets/jeu/manifeste.txt" "versions/manifeste-app$CODE-jeu$V.txt"
ls -l ../Alderia.apk | awk '{ printf "→ Alderia.apk : %.1f Mo (application %s, jeu version %s)\n", $5 / 1048576, "'"$NOM"'", "'"$V"'" }'
