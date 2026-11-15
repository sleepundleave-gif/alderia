# Aldéria sur Android

Le fichier à installer : **`Alderia.apk`** (20,8 Mo, application 1.2, jeu version 12). Il contient tout le jeu (chapitres 1 à 10, modèles, sons) : une fois installé, il fonctionne **sans connexion**.

## Installer

1. Copiez `Alderia.apk` sur le téléphone (câble, WhatsApp, Drive, carte SD…).
2. Ouvrez-le depuis l'application « Fichiers ». Android demande d'autoriser l'installation « depuis cette source » : acceptez.
   Si « Play Protect » affiche un avertissement (application inconnue du Play Store), choisissez « Installer quand même ».
3. Lancez **Aldéria**. Le premier démarrage prend quelques secondes (chargement des modèles).

Il faut Android 5 ou plus récent, et le composant « Android System WebView » (ou Chrome) à jour : c'est lui qui affiche le jeu. S'il est trop ancien, le jeu le signale au démarrage.

## Ce que fait l'application

- **Paysage** uniquement, plein écran ; l'écran reste allumé pendant le jeu.
- **Adaptation à l'écran** : l'interface est dessinée pour une surface de référence puis mise à l'échelle de l'écran du téléphone, en restant à l'écart de l'encoche et des bords arrondis. Vérifié sans débordement en 640×360, 800×360, 844×390, 915×412 et 1280×720.
- **Fluidité** : si le téléphone peine (moins de 25 images par seconde), la finesse de l'image baisse d'elle-même.
- **Touche Retour** : ferme le panneau ouvert, ou ouvre le menu ; sur l'écran titre, propose de quitter.
- **Sauvegardes** : gardées dans le téléphone. Elles restent après une mise à jour. Elles sont perdues si on désinstalle l'application ou si on efface ses données.

## Mises à jour : ajouter des chapitres sans réinstaller

Écran titre → **Mises à jour**. Deux moyens :

- **Installer un fichier de mise à jour (.zip)** : vous recevez un fichier `alderia-maj-11.zip` (quelques dizaines de Ko à quelques Mo : il ne contient que ce qui a changé), vous le choisissez dans le téléphone, le jeu redémarre avec les nouveaux chapitres. Aucune connexion nécessaire.
- **Chercher en ligne** : saisissez l'adresse du dossier des mises à jour. **Aucune adresse n'existe pour l'instant** : il faut d'abord un hébergement (voir plus bas).

Sécurités : chaque fichier reçu est contrôlé (empreinte SHA-256) ; une mise à jour abîmée, incomplète, coupée en route ou plus ancienne est refusée et **le jeu installé n'est pas touché**. Si une mise à jour pose problème : touche Retour sur l'écran titre → « Retirer la mise à jour ».

## Fabriquer une mise à jour (pour qui modifie le jeu)

1. Modifiez le jeu dans `jeu/` (nouveau chapitre, corrections).
2. Augmentez le numéro dans `jeu/version.txt` (1re ligne : `11` ; 2e ligne : le nom affiché, par exemple `Chapitre 11`).
3. `python3 jeu/outils/maj.py paquet` → `mises-a-jour/alderia-maj-11.zip`. C'est le fichier à envoyer aux joueurs.
4. Pour les mises à jour en ligne : `python3 jeu/outils/maj.py copie dossier-en-ligne`, déposez ce dossier chez un hébergeur (GitHub Pages, Netlify, un site personnel…) et donnez son adresse aux joueurs. Pour qu'elle soit déjà remplie dans le jeu, inscrivez-la dans `android/res/values/valeurs.xml` (`adresse_maj`) avant de fabriquer l'APK.

## Refabriquer l'APK

`sh android/construire.sh` (Java 11, python3, outils Android « build-tools 34 » et « platform 34 » : les adresses de téléchargement sont en tête du script). Pas besoin d'Android Studio.

- `android/cle/alderia.jks` est la **clé de signature**. Gardez-la : un APK signé avec une autre clé ne peut pas remplacer l'application installée.
- Un nouvel APK installé par-dessus l'ancien garde les sauvegardes. Augmentez `CODE` (`CODE=2 NOM=1.1 sh android/construire.sh`).

## Si le jeu saccade : les graphismes

Un jeu peut être petit en mégaoctets et lourd à afficher : ce qui fatigue le téléphone, ce n'est pas la taille du fichier, c'est le travail à refaire **à chaque image** (30 à 60 fois par seconde). Depuis la version 1.1, l'application allège ce travail ; la version 1.2 le fait aussi au niveau « beaux », sans rien retirer à l'image.

Écran titre → **Options** :

| Réglage | Effet |
|---|---|
| **Graphismes : rapides** (choisi d'office sur téléphone) | image moins fine, lumière simplifiée, modèles et textures allégés. Le plus fluide. |
| **Graphismes : moyens** | lumière complète, image plus fine. Bon équilibre pour un téléphone de milieu de gamme. |
| **Graphismes : beaux** | tout le détail, comme sur ordinateur. À essayer sur un téléphone récent : gardez-le si le compteur reste à 30 ou plus. |
| **Nature : dessinée** | arbres et herbes simplifiés : encore un peu plus léger. |
| **Compteur d'images** | affiche en haut de l'écran le nombre d'images par seconde. 30 ou plus : le jeu est fluide. |

Changer de graphismes relance le jeu (quelques secondes) ; la sauvegarde n'est pas touchée.

Si l'écran titre affiche en orange « Ce téléphone dessine le jeu sans sa puce graphique », aucun réglage ne suffira : mettez à jour « Android System WebView » et « Chrome » dans le Play Store, puis relancez.

**Garder le détail et gagner en vitesse (version 1.2).** À tous les niveaux, « beaux » compris :
- le détail suit la distance : de près, un personnage ou une maison garde tous ses triangles ; au loin, là où ils sont plus petits qu'un point de l'écran, le jeu passe sur une version allégée. À l'œil, l'image est la même ;
- les pièces d'un personnage et les petites pièces du décor sont regroupées : la ville du chapitre 3 se dessine en 243 objets au lieu de 561, avec les mêmes matières et les mêmes textures ;
- si le téléphone peine quand même, le jeu baisse de lui-même la finesse de l'image (jamais les modèles), puis la remonte quand il le peut.

Pour passer d'une version précédente à la 1.2, au choix :
- installer le nouvel `Alderia.apk` par-dessus l'ancien (la sauvegarde est gardée) ;
- ou, sans réinstaller : copier `mises-a-jour/alderia-maj-12.zip` (70 ko) sur le téléphone, puis écran titre → Mises à jour → Installer un fichier.

## Vérifier sur l'ordinateur

- `sh android/essais/essai.sh` : 34 vérifications du moteur de mises à jour (installation, fichier abîmé, coupure, version ancienne, retour arrière, en ligne).
- `python3 android/essais/serveur_apk.py Alderia.apk 8100` : sert le jeu tel qu'il est dans l'APK, pour vérifier qu'il n'y manque aucun fichier.

## Limites connues

- L'APK a été fabriqué, signé et contrôlé sur ordinateur, et son contenu a été joué dans un navigateur réglé comme un téléphone. **Il n'a pas été lancé sur un vrai téléphone** : la fluidité réelle dépend de l'appareil (la ville du chapitre 3 est la scène la plus lourde).
- L'application n'est pas sur le Play Store : elle s'installe à la main.
