# Aldéria : La Couronne d'Aube — le jeu (version web 3D)

Jeu de rôle 3D au tour par tour, jouable dans le navigateur. Aucun moteur à installer : HTML, JavaScript et Three.js (fourni dans `lib/`).

## Lancer le jeu
Le jeu doit être servi par un petit serveur web (les modules JavaScript ne se chargent pas en ouvrant le fichier directement) :

```
cd JeuRPG/jeu
python3 serveur.py 8000
```
Puis ouvrir `http://localhost:8000` dans un navigateur.

## Commandes
| Action | Clavier / souris | Tactile |
|---|---|---|
| Marcher | ZQSD, WASD ou flèches | manette en bas à gauche |
| Parler, ouvrir, valider | E, Espace ou Entrée | bouton A |
| Tourner la caméra | glisser la souris | glisser le doigt |
| Menu (équipe, objets) | M ou Échap | bouton ☰ |
| En combat | flèches + Entrée, ou clic | toucher les boutons |

## Ce qui est jouable
- **Chapitre 1 — Les Cendres de Brumeval** : la forge, le village en fête, le bois (tutoriel de combat), le village en flammes, le boss Sergent Krall, la fuite par le pont, la scène du général Darian.
- **Chapitre 2 — Les Bois des Murmures** : la berge et les gobelins, l'arrivée de Lyra, les ronces à brûler, la clairière aux champignons, le père Anselme, le feu de camp, le boss Troll des Murmures, le Relais du Cerf Blanc (auberge, boutique, statue d'Aube).
- **Chapitre 3 — La Cité Blanche** : l'arrivée à Solméria (remparts, rue des Artisans, place du Marché, château), le vol du pendentif, la poursuite de Nyssa sur les toits, les égouts (énigme des trois vannes, rats, gelées, chauves-souris, poison et antidotes), le boss Roi des Égouts qui se divise, la salle du trône (le roi Aldemar, la princesse Alinor, le sage Aldric). Nyssa et Borin rejoignent l'équipe : on termine le chapitre à quatre. Boutiques : armes et armures chez Gontran, potions et antidotes chez Ysolde, auberge de la Licorne.
- **Chapitre 4 — Le Sanctuaire de la Terre** : les collines, le sanctuaire et ses trois énigmes, le Golem Gardien, l'Éclat de Terre.
- **Chapitre 5 — Les Portes de Brasegarde** : le col enneigé (murs de glace à faire fondre), l'épreuve de la forge (mini-jeu), la cité naine, la reine Durgana, les mines et la Taraude impériale.
- **Chapitre 6 — Le Cœur du Volcan** : la chaleur et les capes d'amiante, les coulées de lave à figer, Ignis la Salamandre, l'Éclat de Feu, Grom le Briseur, la fuite chronométrée, le banquet et le serment des nains.
- **Chapitre 7 — Les Mouettes Noires** : Port-Azur, la capitaine Morgane, l'orphelinat et Tim, le choix face à la guilde, l'entrepôt de nuit (rondes de gardes à éviter), Varek le Balafré.
- **Chapitre 8 — Le Temple Englouti** : la traversée (spectres, la nuit avec Borin), le temple et ses vannes, Ondine le Léviathan, l'Éclat d'Eau, Vexia sur la mer gelée.
- **Chapitre 9 — Le Siège de Solméria** : la colline, les saboteurs des égouts, le conseil de guerre, trois vagues sur les remparts, les catapultes (chrono), le Bélier Infernal, l'aube.
- **Chapitre 10 — La Chute de la Cité Blanche** : les rues en feu (trois barrages, trois civils à sauver), le château, Darian, le pendentif, la fuite. **Fin de l'acte I** et bilan.

Une sauvegarde faite à la fin du chapitre 2 continue directement : il suffit de sortir du Relais par le sud.

La partie se sauvegarde toute seule à chaque étape de l'histoire, et aux statues d'Aube.

## Modèles importés
Depuis la dernière mise à jour, les personnages, les maisons, les arbres, les objets et les sols viennent de packs
faits par des artistes (Quaternius et Poly Haven, licence CC0). Tout est expliqué dans `modeles/LISEZ-MOI.md`.

- `modeles/perso/` : costumes, têtes, cheveux, armes, animations (65 os, 18 clips).
- `modeles/decor/` : pièces de maison, nature, objets, textures de sol.
- `js/pack.js` assemble et anime les personnages ; `js/decor.js` assemble les maisons et pose le décor.
- `importes.html` : pour regarder chaque personnage de près et lancer ses animations.
- `outils/` : les scripts qui ont téléchargé et allégé les packs.

Le jeu n'a plus qu'un seul mode : il utilise toujours ces modèles. L'ancien « mode léger » (bouton de l'écran
titre et adresse `?classique=1`) a été retiré. `atelier.html` et `galerie.html` (le dossier `assets/` a été supprimé en version 12 ; l'atelier sait le refabriquer) montrent
encore les anciens modèles construits en code, mais le jeu ne s'en sert plus pour les personnages.

### Nature réaliste ou dessinée

Les arbres, buissons, rochers, herbes et fleurs existent en deux versions. À l'écran titre, le troisième bouton
(« Nature : réaliste (changer) ») passe de l'une à l'autre ; le choix est retenu. On peut aussi ajouter `?decor=dessin`
ou `?decor=reel` à l'adresse.

- **réaliste** (par défaut) : arbres générés par ez-tree (MIT) avec écorces et feuillages photographiés, rochers et plantes
  scannés par Poly Haven (CC0). Fichiers dans `modeles/reel/`, fabriqués par `outils/reel/construire.mjs`.
  S'y ajoutent des objets scannés (tonneaux, caisses, cageots de pommes, coffre, table, chaise, tabouret, étagère, seaux,
  vase, pot, coupe) et le trois-mâts de Port-Azur. Chaque arbre, rocher ou plante existe en plusieurs formes, tirées au
  sort, pour que deux voisins ne se ressemblent pas.
- **dessinée** : le pack Quaternius d'origine, plus léger. À préférer sur un téléphone ou un ordinateur sans carte graphique.

Les maisons, les personnages, les monstres et quelques objets (établi, banc, lustre, armes) restent ceux des packs
Quaternius dans les deux cas.
Sources, licences et marche à suivre : `modeles/LISEZ-MOI.md`.

## Créer son personnage
Au début d'une **nouvelle partie**, deux écrans :
1. **La vocation de Kael** (définitive pour la partie) : elle fixe son arme, ses statistiques et ses cinq compétences.

| Vocation | Rôle | Arme | Points forts | Compétences (niveau) |
|---|---|---|---|---|
| Épéiste | polyvalent | épée | équilibré | Entaille (1), Lueur (4), Frappe Croisée (9), Cri de Ralliement (15), Lame Tournoyante (22) |
| Gardien | protecteur | masse et bouclier | PV et défense | Coup de Masse (1), Lueur (4), Défi (8), Mur de Fer (15), Onde de Choc (22) |
| Mage | magie | bâton | magie et PM | Éclair (1), Lueur (4), Rayon d'Aube (9), Bénédiction (15), Orage (22) |
| Éclaireur | rapide | deux dagues | vitesse et chance | Estoc Vif (1), Lueur (4), Double Lame (9), Croc de Venin (15), Danse des Lames (22) |

2. **L'apparence** : silhouette, peau, coiffure, couleur des cheveux, barbe, tenue et sa couleur, cape, taille, carrure. On fait tourner le personnage en glissant la souris ; « Au hasard » tire une apparence, « Défaire » revient en arrière.

L'apparence se change ensuite quand on veut : **menu (M) → « Apparence de Kael »**. Les anciennes sauvegardes restent valables (Kael y est Épéiste).
Tout est dans `js/perso.js` (les écrans) et `js/data.js` (table `CLASSES`). Pour ajouter une vocation : une entrée dans `CLASSES`, ses compétences dans `SKILLS`.

## Entrer dans les maisons
Devant une porte, **E : Entrer**. On visite les huit maisons de Brumeval, l'auberge du Coq Doré, la demeure du chef, la salle commune du Relais et trois maisons de Solméria. Dedans : cheminée allumée, lits, tables, étagères, tapis, habitants à qui parler, parfois un coffre. On ressort en repassant le seuil.
Tout est dans `js/interieurs.js` : trois plans de pièce (`maison`, `auberge`, `chef`), et la table `CONTENU` qui dit qui habite où et ce qu'on y trouve. Pour ouvrir une maison de plus : l'ajouter à `st.spots.maisons` là où le lieu est construit, puis lui donner une entrée dans `CONTENU`.

## Paysages
`js/paysage.js` dessine le ciel (dégradé et halo du soleil), les montagnes (relief, neige, brume au pied), les nuages, l'eau animée de la rivière, la fumée et le feu. La fumée sort des cheminées, de la forge et des incendies. Le sol a des nuances de couleur au lieu d'un aplat.

## Organisation du code (`js/`)
| Fichier | Rôle |
|---|---|
| `main.js` | démarrage, boucle de jeu, écran titre |
| `engine.js` | exploration 3D : caméra, déplacements, collisions, interactions, déclencheurs, ennemis visibles |
| `battle.js` | combat au tour par tour : menus, ordre des tours, dégâts, éléments, altérations, expérience |
| `effets.js` | effets visuels des combats : particules (feu, glace, fumée, étincelles...), cercles magiques, colonnes de lumière, cristaux, pics de roche, dômes, lumières |
| `sorts.js` | mise en scène de chaque sort, compétence, objet et attaque ennemie (une petite « chorégraphie » par action) |
| `story.js` | l'histoire des chapitres 1 et 2, scène par scène (dialogues, cinématiques, combats scénarisés), et la table `PHASES` |
| `story3.js` | l'histoire du chapitre 3 (reçoit les outils de `story.js`) |
| `world.js` | construction des lieux des chapitres 1 et 2 (Brumeval, bois, Murmures, Relais) |
| `world3.js` | construction des lieux du chapitre 3 (Solméria, toits, égouts, salle du trône) |
| `story4.js` à `story10.js` | l'histoire des chapitres 4 à 10, un fichier par chapitre. `story5.js` exporte aussi les aides communes (`or`, `equiper`, `niveauMin`, `boutique`…) |
| `world4.js` | lieux du chapitre 4 (collines, sanctuaire) |
| `world5.js` | lieux des chapitres 5 et 6 (col, Brasegarde, mines, volcan) et aides de construction (`murs`, `lumiere`, `brasero`, `particules`, `tic`…) |
| `world7.js` | lieux des chapitres 7 et 8 (Port-Azur, entrepôt, pont de la Vouivre, temple englouti) |
| `world9.js` | lieux des chapitres 9 et 10 (colline, égouts courts, remparts, camp des catapultes, porte Ouest, rues en feu) |
| `jauge.js` | mini-jeu de la jauge (forge du chapitre 5) |
| `monstres.js` | bestiaire importé (table `MONSTRES`) |
| `pack.js` | personnages importés : un seul squelette, habillé différemment pour chaque rôle (table `HEROES3D`) |
| `decor.js` | pièces de décor importées, textures de mur et de sol |
| `paysage.js` | ciel, montagnes, nuages, eau, fumée, feu |
| `interieurs.js` | intérieurs des maisons : pièces, meubles, habitants |
| `perso.js` | création du personnage : choix de la vocation, éditeur d'apparence |
| `betes.js` | créatures du chapitre 3 construites en code (rat, gelée, chauve-souris, Roi des Égouts) |
| `chars.js` | personnages et créatures. Chacun est un maillage d'un seul tenant, lié à un squelette (os, poids), avec ses clips d'animation ; rendu dessin animé avec contour (table `CHARS`, puis loup, champignon, luciole, cheval) |
| `export.js` | exporte les modèles en fichiers `.glb` pour Unity, Blender ou Godot (depuis `atelier.html`) : maillage, palette, squelette, clips et contour à l'encre |
| `models.js` | décors en 3D « low-poly » (maisons, arbres, coffres…) ; réexporte les personnages de `chars.js` |
| `data.js` | héros, compétences, objets, équipement, ennemis |
| `state.js` | équipe, inventaire, progression, sauvegarde |
| `ui.js` | dialogues, choix, menu, boutique, messages |
| `input.js` | clavier, souris, tactile |
| `audio.js` | musiques et bruitages générés par le navigateur |

## Effets des combats

Tout est fabriqué par le code, sans fichier d'image ni de son.

- **`effets.js`** contient les « briques » : `explosion`, `iceBurst`, `splash`, `flames`, `sparks`, `ring` (onde au sol), `rune` (cercle magique), `pillar` (colonne de lumière), `slash` (traînée de lame), `whirl` (lame tournoyante), `dome` (bouclier), `cluster` / `shatter` (cristaux de glace qui poussent puis éclatent), `spikes` (pics de roche), `travel` (projectile). Il gère aussi les réactions communes : coup reçu, coup critique, soin, mort, garde, et les auras des altérations (flammes de la brûlure, bulles du poison, « Z » du sommeil, étoiles de l'étourdissement, bloc de glace du gel).
- **`sorts.js`** décrit chaque action en trois temps : `pre` (préparation), `hit` (ce qui arrive sur une cible, jusqu'à l'impact) et `post` (la fin). Pour une nouvelle compétence, ajouter une entrée du même nom que dans `SKILLS` (`data.js`). Sans entrée, la compétence reçoit une mise en scène simple selon son genre et son élément.
- **`battle.js`** fournit les effets d'écran : secousse de caméra, éclair, voile de couleur, arrêt sur image des coups critiques, caméra qui s'approche de l'action.
- **`audio.js`** : bruitages `slash`, `whoosh`, `charge`, `explosion`, `shatter`, `wind`, `quake`, `poison`, `sleep`, `stun`, `cri`, `sonic`, `shield`, `buff`, `steal`, `vanish`.

Dans Unity, l'équivalent serait le Particle System (ou VFX Graph), Cinemachine pour la caméra et une Timeline par sort.

## Ajouter un chapitre
Le chapitre 3 sert d'exemple : il tient dans `world3.js` et `story3.js`.
1. `data.js` : ajouter les nouveaux ennemis, objets, compétences et héros.
2. `pack.js` : ajouter une ligne par personnage dans `HEROES3D`. Tous partagent le même squelette et les mêmes animations ; on choisit la tenue, la teinture, la peau, les cheveux, la barbe, la taille, l'arme et les accessoires (couronne, diadème, foulard, cape, pavois). `importes.html` permet de les regarder.
3. Créatures : les packs n'en contiennent pas ; les construire en code dans `betes.js` et les brancher dans `makeEnemyModel` (`chars.js`).
4. `world4.js` : écrire une fonction `build...()` par lieu, avec les pièces de `decor.js` (`piece`, `kitHouse`, `wallMat`, `groundMat`).
5. `story4.js` : écrire une fonction par phase (`ch4_...`) et l'ajouter à la table `PHASES` de `story.js`, comme `...chapter3(TOOLS)`.
6. `battle.js` : ajouter un décor d'arène dans `ARENAS` si besoin.

## Chargement du jeu

Le jeu marche de deux façons : avec `python3 serveur.py 8000`, ou ouvert comme une simple page depuis un
hébergement de fichiers (`JeuRPG/jeu/index.html`). Le chargement est fait pour ne jamais échouer : s'il y a une
coupure, il attend et reprend tout seul.

- **Aucune adresse « blob: » ni « data: ».** Une fois les morceaux reçus, les modèles et les images sont lus
  directement dans la mémoire (`gltf()` et `texture()` de `js/charge.js`). Certains hébergements interdisent au
  navigateur d'ouvrir ces adresses internes : c'était la cause de l'erreur « TypeError: Failed to fetch » dans
  `pack.js`. Essai : `python3 outils/statique.py 8002` (serveur de simples fichiers avec cette interdiction) puis
  `node outils/essai_statique.mjs 8002`.

- **Un paquet en petits morceaux.** Les 133 fichiers de modèles sont rangés dans `modeles/paquet/` : 47 morceaux
  de 256 Ko, 12 Mo en tout au lieu de 22 (la géométrie y est compressée). Une coupure ne fait perdre qu'un
  morceau. Le serveur refait le paquet tout seul quand un modèle change (`outils/paquet.py`).
- **Des essais sans limite.** `js/charge.js` télécharge trois morceaux à la fois, vérifie chacun (taille et somme
  de contrôle) et redemande ceux qui sont coupés, incomplets ou refusés. L'écran affiche le pourcentage, les Mo
  reçus et, en cas de souci, la raison exacte.
- **Une seule fois.** Les morceaux reçus sont gardés dans la mémoire du navigateur (IndexedDB) : aux lancements
  suivants, les modèles ne sont plus téléchargés. Si la page est fermée en plein chargement, il reprend où il en était.
- **Des adresses datées.** Le serveur ajoute `<base href="v/NUMÉRO/">` à chaque page : le code, le style et les
  modèles sont demandés sous `/v/NUMÉRO/...`, et le numéro change dès qu'un fichier change. Un navigateur ou un
  relais ne peut donc plus resservir une ancienne version du jeu.
- **Le code aussi.** `index.html` télécharge d'abord chaque fichier de code un par un, avec nouveaux essais, en
  exigeant une copie fraîche : après une mise à jour, anciens et nouveaux fichiers ne se mélangent pas.
- **Journal.** Le jeu signale au serveur ce qui se passe au chargement : lignes `JOURNAL` dans la sortie du
  serveur et dans `outils/journal.txt`.
- **Essai de pannes.** `PANNE=0.4 PANNE_CODE=0.25 python3 serveur.py 8001` coupe ou refuse exprès 40 % des
  morceaux et 25 % des fichiers de code ; `node outils/essai_chargement.mjs 8001 recharger` vérifie que le jeu
  arrive quand même à l'écran titre (il faut `playwright`).


## Jouer hors ligne

`Alderia-hors-ligne.html` (dans le dossier `JeuRPG`, 19 Mo) contient tout le jeu : la page, le style, le code réuni et les modèles 3D.

- On le copie où l'on veut (ordinateur, clé USB, téléphone) et on l'ouvre d'un double-clic dans Chrome, Edge, Firefox ou Safari récents. Ni serveur ni Internet.
- Les sauvegardes restent dans le navigateur, attachées à l'emplacement du fichier : si on déplace le fichier, on repart d'une partie neuve.
- Après une modification du jeu, on refabrique le fichier : `python3 outils/hors_ligne.py` (il faut `esbuild` : `npm install esbuild`).
- Essai automatique, réseau coupé : `node outils/essai_hors_ligne.mjs` (il faut `playwright`).

Fonctionnement : `js/charge.js` regarde si la page fournit `window.__HORS_LIGNE`. Si oui, il lit les morceaux du paquet de modèles dans la page au lieu de les télécharger, et n'écrit rien au serveur.

## Chapitre 4 — Le Sanctuaire de la Terre

- Lieux : `js/world4.js` (`buildCollines`, `buildSanctuaire`). Histoire : `js/story4.js` (phases `ch4_route`, `ch4_sanctuaire`, `ch4_retour`).
- On y entre par la Porte Sud de Solméria, une fois l'équipe au complet. Les anciennes sauvegardes de fin de chapitre 3 y mènent aussi.
- Le donjon : deux blocs à pousser sur deux dalles (une rune remet les blocs en place), trois dalles tenues par les compagnons pendant que Kael passe abaisser un levier, quatre braseros à allumer dans l'ordre de la stèle (étoile, lune, soleil, montagne) pour faire apparaître le pont.
- Ennemis (`js/data.js`) : vipère, guêpe géante, araignée de granit, esprit de granit, éclaireur impérial, Golem Gardien (650 PV, Terre, craint le Vent ; sa Carapace double sa défense deux tours).
- Pas encore faits, par rapport au script : la carte du monde (la route est un lieu à parcourir à pied), la Jauge d'Aube et les Arts d'Aube, l'usage du Miroir de Scrutation (l'objet est donné, il ne sert pas encore).
- Essai automatique du chapitre entier : `node outils/essai_chapitre4.mjs` (part d'une sauvegarde de fin de chapitre 3).

## Chapitres 5 à 10 — la fin de l'acte I

- **Enchaînement** : Porte Sud de Solméria (après le chapitre 4) → col de Ferrecime → Brasegarde → mines → volcan → Port-Azur (sortie sud de Brasegarde) → la Vouivre → temple englouti → colline du siège → égouts → conseil → remparts → catapultes → porte Ouest → rues en feu → salle du trône → bilan.
- **Phases** : `ch5_col`, `ch5_brasegarde`, `ch5_mines`, `ch6_volcan`, `ch6_fuite`, `ch6_banquet`, `ch7_port`, `ch7_entrepot`, `ch8_traversee`, `ch8_temple`, `ch8_glace`, `ch9_plaine`, `ch9_egouts`, `ch9_conseil`, `ch9_remparts`, `ch9_catapultes`, `ch9_porte`, `ch9_aube`, `ch10_rues`, `ch10_trone`, `ch10_fin`.
- **Niveau** : en arrivant dans un chapitre, toute l'équipe est remontée au niveau conseillé si elle est en dessous (9, 11, 13, 15, 17, 19). Un joueur qui a évité les combats n'est donc jamais bloqué.
- **Combat** : coups annoncés un tour à l'avance (certains s'annulent avec le bon élément : le Bain de lave d'Ignis avec l'Eau), ennemis qui en soignent un autre (Hesk répare le Bélier), ennemi hors d'atteinte (Darian : chaque coup fait 1). Nouveaux objets : Grande potion, Fiole d'orage. Nouvelle compétence : Poudre Aveuglante (Nyssa, niveau 14).
- **Forge de Brasegarde** : Bram renforce une arme pour 1 minerai de fer et 150 pièces (trois fois par héros).

### Simplifié par rapport au script
- Pas de carte du monde ni de carte marine : les voyages sont racontés par un texte, puis on arrive.
- Le wagonnet des mines est un fondu (pas de trajet à piloter).
- L'infiltration de l'entrepôt : quatre gardes font leur ronde avec un cône de lumière ; être vu déclenche un combat (pas d'alarme générale, pas d'échec).
- Les deux réponses possibles au messager de la guilde changent les dialogues et la façon d'entrer, pas la suite de l'histoire.
- La nuit du siège : la partie est sauvegardée entre les trois batailles (le script les voulait sans sauvegarde).
- Le chapitre 10 n'a pas de scène d'escalier séparée : la princesse Alinor est sur les marches du château, au bout de la rue. Les ennemis « Incendiaire » et « Garde noir » sont remplacés par le Mage de guerre et le Chevalier de Cendre.
- Toujours absents : Jauge d'Aube et Arts d'Aube, usage du Miroir de Scrutation.

### Essais automatiques
`outils/essais/` contient `lib.mjs` et un script par chapitre (`play5.mjs` … `play10.mjs`). Chacun part de la sauvegarde laissée par le précédent, joue le chapitre en combat automatique et écrit `stateN.json`. Il faut Playwright (`npm i playwright`) et le serveur lancé sur le port 8000. Variantes : `ECHEC=1` (chronos des chapitres 6 et 9), `RUSE=1` (chapitre 7), `ERREUR=1` (vannes du chapitre 8 dans le mauvais ordre), `CIVILS=0` (chapitre 10).

## Version 9 : maisons, boutiques, étals, eau, collisions

- **Toutes les maisons s'ouvrent** (Brumeval, le Relais, Solméria, Brasegarde, Port-Azur). `brancherMaisons(st, T)` (js/interieurs.js) ouvre chaque
  maison posée avec `st.house()` ; celles de `st.spots.maisons` ont un plan et un contenu choisis. Les maisons que l'histoire ne décrit pas
  sont meublées (deux plans de chaumière) et parfois habitées (`HABITANTS`).
- **Plans** : `maison` (deux chaumières), `auberge` (salle commune, comptoir, dortoir de quatre lits), `chef`, `armurerie`, `herboristerie`.
- **Les marchands qui tiennent boutique sont derrière leur comptoir** : `CONTENU[id].tenancier = 'clé du personnage'`. Gontran (« Au Fer Droit »),
  Ysolde (« La Mandragore »), l'hôtesse des Sept Couronnes, Berthe (le Cerf Blanc). La conversation est celle de l'histoire, inchangée.
- **Étals** : `makeStall(couleur, genre)` (js/models.js) pose la marchandise du métier : fruits, legumes, pain, poisson, fleurs, tissus,
  armes, potions, maree, bazar, poterie, outils, forain. La forge de Bram et le comptoir de Hilda (Brasegarde) sont garnis de même.
- **Eau** : `eau()` (js/paysage.js) refaite : reflet du ciel, éclats du soleil, relief des vagues, écume des rives (fine sur les rigoles),
  bassins ronds, ondes, cascade, transparence.
- **Collisions** (js/engine.js) : relevé des hauteurs du sol (dalles, perrons, pavés) ; tout le monde est posé dessus ; les compagnons
  ne traversent plus les murs, les objets, le héros ni les uns les autres ; les monstres gardent leurs distances.
- **Essais** (outils/essais) : `audit.mjs` (personnages mal posés, toutes les phases), `suite.mjs` (marche contre les murs et les étals),
  `maison.mjs` (entre dans les maisons, prend une image, ressort).

## Version 10 : application Android

- `../Alderia.apk` : le jeu complet pour téléphone Android, en paysage, sans connexion. Mode d'emploi : `../LISEZ-MOI-Android.md`.
- `js/ecran.js` : adaptation de l'interface à l'écran (échelle, encoches, classes `bas` / `etroit` / `tactile` / `app`), finesse de l'image selon la fluidité, pause quand l'application passe à l'arrière-plan, touche Retour, écran « Mises à jour ».
- `css/style.css` : plus de `vw` / `vh` dans l'interface, remplacés par `var(--vw)` / `var(--vh)` / `var(--vmin)` que `ecran.js` tient à jour.
- `version.txt` : numéro et nom de la version du jeu. `outils/maj.py` : manifeste, copie pour l'APK, fichiers de mise à jour `.zip`.
- `../android/` : sources de l'application (`MainActivity.java`, `Maj.java`), `construire.sh`, essais.

## Version 11 : jeu plus fluide sur téléphone

Le jeu saccadait sur téléphone alors qu'il ne pèse que 20 Mo : le poids du fichier ne compte pas, c'est le travail par image qui compte.

- `js/qualite.js` (nouveau) : trois niveaux de graphismes, `rapide` (d'office en tactile), `moyen`, `beau` (d'office à la souris). Choix : écran titre → Options, ou `?graphismes=rapide|moyen|beau`. Compteur d'images : Options ou `?compteur=1`.
- Au niveau `rapide` : pas d'anticrénelage, image limitée à 540 lignes, matières simples (sans calcul « physique », sans cartes de relief ni de métal), textures limitées à 512 points, modèles allégés à 45 % de leurs triangles (`lib/meshopt_simplifier.module.js`, meshoptimizer 0.21, licence MIT).
- À tous les niveaux : un seul squelette calculé par personnage au lieu d'une dizaine ; les personnages hors de l'écran ne sont plus dessinés et sont animés une image sur six ; le décor hors du champ de la caméra n'est plus dessiné (`bake()` dans `js/engine.js` : sphères englobantes, pièces regroupées par case de 26 m).
- Aux niveaux `rapide` et `moyen` : les pièces d'un personnage de même matière sont réunies ; les petites pièces de décor de même matière sont fondues en un seul maillage par case ; les matières unies partagent un seul maillage coloré par sommet.
- Mesures (ville du chapitre 3, la scène la plus lourde, par image) : 561 → 245 objets à dessiner, 1 253 000 → 474 000 triangles, 217 → 28 squelettes, 369 → 97 textures.
- `js/ecran.js` : `fluidite()` réagit plus vite et ne descend jamais sous le plancher du niveau.

## Version 12 : plus vite sans perdre de détail

- Détail selon la distance, à tous les niveaux (`js/qualite.js` : `triLoin`, `erreurLoin`, `lod`, `lodDecor`). Chaque modèle reçoit au chargement une seconde liste de triangles, plus courte, pour les mêmes sommets. `trier()` dans `js/engine.js` passe de l'une à l'autre selon la distance à la caméra (personnages : 16 / 20 / 24 m ; décor : 22 / 28 / 32 m selon le niveau). En combat, les personnages gardent toujours leur version complète.
- Les pièces d'un personnage de même matière sont réunies à tous les niveaux, « beaux » compris, sans perte : on ne réunit que si chaque pièce porte tout ce que la matière utilise (textures, couleurs par sommet, tangentes).
- Mesure au niveau « beaux », ville du chapitre 3 : 561 → 243 objets à dessiner par image, 1 253 000 → 615 000 triangles, mêmes matières et mêmes textures.
- Ménage : dossiers `captures/` et `jeu/assets/` supprimés (anciennes images, anciens exports `.glb` des modèles dessinés, que `atelier.html` sait refabriquer).

