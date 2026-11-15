# Modèles importés

Ce dossier contient les modèles 3D **faits par des artistes** que le jeu utilise maintenant
à la place des modèles construits en code. Ce sont les versions glTF de packs qui sont
aussi livrés pour Unity (en FBX) : la même géométrie, les mêmes textures, le même squelette.

## D'où viennent les fichiers

| Dossier | Pack d'origine | Auteur | Licence |
|---|---|---|---|
| `perso/` costumes | Modular Character Outfits – Fantasy (version gratuite : paysan et rôdeur) | Quaternius | CC0 1.0 |
| `perso/` têtes, cheveux, barbe | Universal Base Characters | Quaternius | CC0 1.0 |
| `perso/anims.glb` | Universal Animation Library | Quaternius | CC0 1.0 |
| `decor/village.*` | Medieval Village MegaKit | Quaternius | CC0 1.0 |
| `decor/nature.*` | Stylized Nature MegaKit | Quaternius | CC0 1.0 |
| `decor/objets.*`, épée, bouclier | Fantasy Props MegaKit | Quaternius | CC0 1.0 |
| `reel/nature.*` arbres et buissons | générés par **ez-tree** 1.1.0 (Daniel Greenheck) | github.com/dgreenheck/ez-tree | MIT (texte dans `reel/LICENCE-ez-tree.txt`) |
| `reel/tex/ecorce_*`, `feuilles_*` | écorces et rameaux livrés avec ez-tree (écorces photographiées : Poly Haven et TextureCan) | idem | MIT / CC0 |
| `reel/nature.*` rochers, cailloux | rock_moss_set_01, rock_moss_set_02, namaqualand_stones_01 (scans 3D) | Poly Haven | CC0 1.0 |
| `reel/nature.*` plantes | fern_02, weed_plant_02, nettle_plant, shrub_sorrel_01, grass_bermuda_01, dandelion_01, flower_empodium, flower_gazania (scans 3D) | Poly Haven | CC0 1.0 |
| `reel/nature.*` souches, branches mortes | tree_stump_01, tree_stump_02, dry_branches_medium_01 (scans 3D) | Poly Haven | CC0 1.0 |
| `reel/objets.*` tonneaux, caisses, coffre | wine_barrel_01, wooden_barrels_01, wooden_crate_01, wooden_crate_02, treasure_chest, food_apple_01 | Poly Haven | CC0 1.0 |
| `reel/objets.*` meubles | WoodenTable_01, painted_wooden_chair_01, painted_wooden_stool, wooden_bookshelf_worn | Poly Haven | CC0 1.0 |
| `reel/objets.*` petits objets | wooden_bucket_01, wooden_bucket_02, ceramic_vase_01, brass_pot_01, brass_goblets | Poly Haven | CC0 1.0 |
| `reel/objets.*` navire | dutch_ship_medium | Poly Haven | CC0 1.0 |
| `decor/tex/sol_*.jpg` | rocky_terrain_02, grass_path_2, cobblestone_floor_04, forest_leaves_03, wood_planks_dirt | Poly Haven | CC0 1.0 |

CC0 veut dire « domaine public » : on peut les utiliser, les modifier et les vendre dans un jeu,
sans rien payer et sans obligation de citer l'auteur. Pages des packs : `quaternius.com` et `polyhaven.com`.

## Ce qui a été changé par rapport aux packs

Les packs complets pèsent environ 850 Mo. Pour un jeu qui se charge dans un navigateur,
ils ont été allégés (les scripts sont dans `../outils/`) :

- **Textures** réduites de 4096 ou 2048 pixels à 1024 (512 pour les petites), enregistrées en JPEG
  quand il n'y a pas de transparence.
- **Animations** : 18 clips gardés sur 43, avec seulement les rotations des os.
- **Décor** : les modèles choisis (52 pièces de village, 32 de nature, 31 objets) sont regroupés
  dans un seul fichier par pack, pour un chargement rapide.
- **Arbres et plantes** : troncs simplifiés et une partie des feuilles retirée (de 72 000 à 21 000
  triangles pour tout le pack), parce qu'une forêt en affiche des centaines.
- **Sols** : photos ramenées à une teinte neutre, pour être colorées par le jeu (herbe verte, chemin ocre).

Résultat : environ 29 Mo au lieu de 850.

## Comment un personnage est assemblé

1. un **costume** (`Male_Peasant`, `Female_Ranger`…) : corps, bras, jambes, pieds, avec ses 65 os ;
2. une **tête** prise dans `Base_Male` ou `Base_Female` (on ne garde que les triangles de la tête et du cou) ;
3. des **cheveux**, des sourcils, parfois une barbe (`Hair_*`), accrochés au même squelette ;
4. une **teinture** : le tissu du costume est repeint dans la couleur du personnage (bleu pour Lyra,
   rouge pour les Soldats de Cendre…), le cuir et le métal ne changent pas ;
5. une **arme** accrochée à l'os de la main, ou rangée dans le dos ;
6. les **animations** de `anims.glb`, communes à tous : repos, marche, course, garde, coup d'épée,
   coup de poing, sort, touché, K.-O., assis…

Le code qui fait cet assemblage est `../js/pack.js` ; celui du décor est `../js/decor.js`.
La page `../importes.html` montre chaque personnage de près, avec ses animations.

## Les ouvrir dans Unity

Unity ne lit pas le glTF sans aide : Window ▸ Package Manager ▸ + ▸ Add package by name ▸
`com.unity.cloud.gltfast` ▸ Add, puis glisser un fichier `.gltf` (avec son `.bin` et le dossier `tex/`)
dans Assets. Pour un vrai projet Unity, le plus simple reste de télécharger les packs d'origine
sur `quaternius.com` : ils contiennent directement les FBX prévus pour Unity, en pleine qualité.

## Limites à connaître

- La version gratuite du pack de costumes ne contient que deux tenues (paysan et rôdeur). Tous les
  personnages en sont des variantes ; il n'y a ni armure de plates ni robe de mage.
- Le gobelin et le troll sont des humains recolorés et redimensionnés.
- Loup, champignon, luciole et cheval restent les modèles construits en code.
- Les packs ne contiennent aucun animal ni monstre : le rat, la gelée, la chauve-souris et le Roi des Égouts
  du chapitre 3 sont construits en code (`js/betes.js`).
- La forge, le puits, les ponts, les montagnes et quelques meubles restent aussi construits en code.
- Le kit de village n'a ni rempart ni mur de château : les murailles, les tours, le château, les toits plats
  et les galeries des égouts de Solméria sont des volumes construits en code, habillés avec les textures
  Poly Haven de `decor/tex/` (pierre blanche, pavés, ardoise, brique moussue, marbre).

## Personnages du chapitre 3

Tous sont faits avec le même squelette et les deux mêmes tenues, dans `js/pack.js` :
Nyssa (rôdeuse, foulard rouge, dague), Borin (cape bleue, grand bouclier, masse), le roi Aldemar (couronne),
la princesse Alinor (diadème), Aldric (bâton), le lieutenant Renaud, les gardes, Gontran, Ysolde, l'hôtesse,
Tobie, le prêtre, le gamin, les citadins et les nobles. Les accessoires (couronne, diadème, foulard, cape,
pavois, dague, masse) sont de petites formes ajoutées en code et attachées aux os.

## Monstres et animaux (dossier `monstres/`)

Quinze modèles téléchargés chez Quaternius (itch.io), chacun avec son squelette. Le jeu les charge par `js/monstres.js`.

| Fichier | Pack d'origine | Animations | Dans le jeu |
|---|---|---|---|
| `Rat`, `Spider`, `Snake`, `Wasp`, `Frog` | Animated Easy Enemies | les leurs (repos, marche, attaque, mort) | rat géant, araignée de granit, vipère, guêpe géante ; grenouille en réserve |
| `Bat`, `Slime`, `Skeleton`, `Dragon` | LowPoly Animated Monsters | les leurs | chauve-souris, gelée verte ; squelette et dragon en réserve |
| `Horse`, `Cow`, `Sheep`, `Pig` | LowPoly Animated Animals | les leurs | chevaux de Brumeval et du Relais ; vache, mouton, cochon en réserve |
| `Imp`, `Puglin` | Bestiary — Dungeon Monsters Kit (version gratuite) | celles des héros (même squelette, 55 os en commun) | gobelins (Puglin), esprit de granit (Imp) ; diablotin en réserve |

- Téléchargement : `python3 outils/itch.py <nom du pack> any <fichier.zip>` (noms : `animated-easy-enemies`, `lowpoly-animated-monsters`, `lowpoly-animated-animals`, `bestiary-dungeon-monsters-kit`).
- Les trois premiers packs sont livrés en FBX : conversion en GLB avec FBX2glTF 0.9.7 (`FBX2glTF -b -i X.fbx -o X`).
- Préparation : `python3 outils/build_monstres.py <dossier des .glb> <dossier Textures du Bestiary>`. Imp et Puglin passent de 9 Mo à moins de 1,2 Mo (image de couleur en 512 px, lueur en 256 px ; relief et reflets retirés). Les autres jeux de couleurs sont dans `monstres/tex/`.
- Puis `python3 outils/paquet.py` pour refaire le paquet (15,4 Mo de modèles au total, 14 Mo une fois rangés).
- Taille, couleurs et rôle de chaque monstre : table `MONSTRES` au début de `js/monstres.js`. Pour un nouveau monstre : une ligne dans cette table, et `model: 'sa_clé'` dans `ENEMIES` (`js/data.js`).

Licences : les trois anciens packs sont publiés par Quaternius en CC0 (domaine public). Le Bestiary est sous « Quaternius Asset License » : usage libre dans un jeu, même vendu, sans obligation de crédit ; il est interdit de revendre ou de redistribuer les modèles seuls.

Ce qui reste bâti par le code : loup, champignon hurleur, luciole, Roi des Égouts, Golem Gardien (aucun équivalent dans les packs gratuits) ; le troll et Krall sont des humains recolorés.

## Décor réaliste (dossier `reel/`)

Le jeu a deux décors, qui se choisissent à l'écran titre (bouton « Nature : réaliste / dessinée ») :

- **dessinée** : le pack d'origine `decor/nature.*` (Quaternius, formes simples) ;
- **réaliste** : `reel/nature.gltf` (64 pièces) et `reel/objets.gltf` (18 pièces), qui **remplacent** celles des packs
  d'origine et portent le même nom (`CommonTree_1`, `Pine_4`, `Rock_Medium_2`, `Barrel`, `Chest_Wood`…), à la même taille.
  Le reste du jeu ne change pas.

**Variantes.** Une pièce nommée `Nom~b`, `Nom~c`, `Nom~d` est une autre forme de `Nom` : le jeu en tire une au hasard
à chaque fois qu'il pose `Nom`. Deux chênes, deux rochers ou deux tonneaux voisins ne sont donc plus identiques.
Pour ajouter une forme, il suffit d'ajouter une pièce avec ce genre de nom dans `construire.mjs`.

| Pièces | Source | Triangles |
|---|---|---|
| chênes, frênes, bouleaux, pins, arbre géant, arbres morts, buissons, chacun en deux formes | générés par ez-tree, écorces et feuillages photographiés | 1 800 à 3 300 par arbre, 5 300 pour le géant |
| 3 rochers, 3 cailloux et leurs 10 variantes | scans Poly Haven, allégés | 60 à 420 |
| fougère, herbes, ortie, oseille, pissenlits, fleurs étoilées, gazanias | scans Poly Haven, allégés | 70 à 460 |
| souches et branches mortes au sol (`Branche_1`, pièce nouvelle) | scans Poly Haven, allégés | 520 à 1 200 |
| tonneaux (3), caisses (2 piles), cageots de pommes, coffre qui s'ouvre | scans Poly Haven, allégés | 960 à 2 800 |
| table, chaise, tabouret, étagère, seaux, vase, pot, coupe | scans Poly Haven, allégés | 220 à 1 800 |
| `Navire` : le trois-mâts de Port-Azur (24 m, agrandi à 30 m dans le jeu) | scan Poly Haven, coque allégée, gréement gardé | 31 600 |

Les scans d'origine sont beaucoup trop lourds pour un jeu dans le navigateur (60 000 triangles pour six rochers,
plusieurs millions pour un arbre) : `outils/reel/construire.mjs` les réduit, ramène les images à 512 px et fabrique
le fichier. Une forêt du jeu passe d'environ 0,3 à 0,6 million de triangles affichés.

Pour refaire ou enrichir ce dossier :

```
mkdir travail && cd travail
npm i @dgreenheck/ez-tree three@0.167 meshoptimizer sharp --legacy-peer-deps
python3 ../outils/reel/polyhaven.py prendre rock_moss_set_01 rock_moss_set_02 namaqualand_stones_01 fern_02 \
    shrub_sorrel_01 weed_plant_02 nettle_plant flower_empodium flower_gazania dandelion_01 grass_bermuda_01 \
    tree_stump_01 tree_stump_02 dry_branches_medium_01 wine_barrel_01 wooden_barrels_01 wooden_crate_01 \
    wooden_crate_02 treasure_chest food_apple_01 WoodenTable_01 painted_wooden_chair_01 painted_wooden_stool \
    wooden_bookshelf_worn wooden_bucket_01 wooden_bucket_02 ceramic_vase_01 brass_pot_01 brass_goblets \
    dutch_ship_medium --dest dl
node ../outils/reel/construire.mjs dl ..
```

`polyhaven.py` sert aussi à chercher d'autres modèles libres : `python3 polyhaven.py liste modeles rocks`,
`liste textures`, `liste ciels`, puis `prendre <nom> --res 2k`.

**Pourquoi pas l'Asset Store de Unity ?** Ses modèles, même gratuits, sont sous une licence qui interdit de
redistribuer les fichiers. Or ce jeu livre ses modèles en clair (dossier `modeles/`, lisibles par n'importe qui) :
on ne peut donc y mettre que des modèles vraiment libres (CC0, MIT). Rien n'empêche en revanche d'ouvrir les
fichiers `.gltf` de ce dossier **dans** Unity.

**Ce qui reste dessiné** : les maisons, les personnages, les monstres, l'établi, le banc, le lustre, les armes, les
chopes. Poly Haven n'a pas de maisons médiévales ni de personnages.
