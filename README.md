# Pas Touche ! — Défense du Musée

Tower defense cartoon en HTML5 / Canvas 2D, sans dépendance, dessiné façon papier découpé. Pensé pour le mobile à l'horizontale, jouable aussi sur PC.

Le Gentleman a lancé le **Grand Concours** des cambrioleurs. Les voleurs traversent le musée jusqu'au trésor, prennent un objet, puis repartent par la porte d'entrée. Il faut les attraper avant qu'ils ressortent, à l'aller comme au retour.

## Lancer le jeu

- **Jouer en ligne** : https://darinemadgeek.github.io/pas-touche/
- **Hors ligne** : ouvrir `dist/pas-touche.html` (un seul fichier, tout est dedans).
- **Pendant le développement** : `node tools/serve.js`, puis ouvrir http://localhost:8765.
- `index.html` s'ouvre aussi directement par double-clic.

## Contenu

- **50 salles** rangées en 5 ailes, de plus en plus difficiles, avec un casse tous les 5 niveaux et des salles « respiration » plus calmes pour souffler. Les 10 premières sont dessinées à la main :
  1. Musée de Trouville-sur-Bof : tutoriel, hordes simples.
  2. Galerie d'Égypte : les Ombres invisibles et la Caméra.
  3. Aile des Dinosaures : deux entrées, Costauds et Acrobates.
  4. Nocturne d'Art Moderne : la variante « portes ouvertes », avec de vrais touristes et des Faux Touristes cachés parmi eux.
  5. Les Joyaux de la Couronne : **niveau casse**. Chaque vague est une équipe de voleurs avec son plan, annoncée par un briefing, et le Gentleman vient en personne pour la dernière.
  6. Salle des Armures : une porte de chaque côté et les Chevaliers, dont l'armure fait rebondir les petits coups.
  7. Musée de la Marine : une porte et une verrière, et le Canon de Marine en renfort.
  8. Galerie des Glaces : un très long couloir, et l'Illusionniste qui sème des reflets pour gaspiller vos tirs.
  9. Réserve souterraine : la variante « panne de courant ». Les défenses ne voient que sous les lampes de secours ou grâce aux Caméras. Le Verrouillage arrive.
  10. Coffre-fort de la Banque de France : **2e niveau casse**, trois entrées (porte, verrière, égouts), neuf équipes et le Gentleman en finale.

  Les salles 11 à 50 (Galerie des Impressionnistes, Musée de l'Espace, Salle des Pharaons, Musée du Fromage… jusqu'au Coffre du Gentleman) sont construites par `js/levels-gen.js` à partir de 12 plans de salle et de 19 thèmes.
- **10 défenses** à 3 niveaux : Gardien, Pot de Glu, Caméra, Bouledogue, Lance-Filet, Laser, Canon de Marine, Ventilateur (repousse les voleurs), Arroseur (mouille et ralentit), Chef de la Sécurité (renforce les défenses voisines).
- **7 synergies** : Filmé (Caméra), Patrouille (Gardiens groupés), Croc-en-filet (Bouledogue + Filet), Cible facile (Canon + Glu), Court-jus (Laser + Arroseur), Glissade (Ventilateur + Arroseur), Sous les ordres (Chef). Elles sont rappelées dans l'infobulle de chaque défense.
- **4 pouvoirs** : Buste en marbre (zone ciblée), Alarme générale, Pause café, Verrouillage des portes.
- **15 types de personnages** : 13 voleurs (dont le Patineur, la Taupe qui creuse sous le tapis, la Soigneuse et le Déménageur), le touriste innocent et le boss.
- **Progression** : jusqu'à 3 étoiles par salle. Les étoiles se dépensent dans l'**arbre de talents de l'Atelier** (3 branches : Défenses, Pouvoirs, Économie, 17 talents). Les défenses et pouvoirs se débloquent au fil des salles, et le **Fichier des suspects** se remplit à chaque nouvelle rencontre.
- **Décor vivant** : le trait vibre comme dans un dessin animé en papier, les portraits et les armures suivent les voleurs des yeux, les torches crépitent, les plantes se balancent.
- Musique et bruitages synthétisés en direct (Web Audio), sauvegarde locale, menus, pause, vitesse x2.

## Commandes

- **Tactile / souris** :
  - Touchez un socle **+**, choisissez une défense, puis touchez-la une deuxième fois pour confirmer.
  - Touchez une défense pour l'améliorer ou la vendre.
- **Clavier** : `Espace` lance la vague suivante, `1` à `4` les pouvoirs, `V` la vitesse, `Échap` la pause.

## Structure

| Fichier | Rôle |
|---|---|
| `js/data.js` | Défenses, voleurs, pouvoirs, améliorations de l'Atelier |
| `js/levels.js` | Les salles 1 à 10 : décor, chemins, socles, vagues, répliques du Gentleman |
| `js/levels-gen.js` | Les salles 11 à 50 : plans, thèmes, placement automatique des socles et du décor, vagues, table de difficulté |
| `js/game.js` | Moteur de jeu pur (aucun DOM), testable sous Node |
| `js/art.js` | Tous les dessins cartoon (personnages, défenses, décor, icônes) |
| `js/render.js` | Rendu : décor en cache, tri en profondeur, effets visuels |
| `js/audio.js` | Synthé sonore et musiques |
| `js/ui.js` | Écrans, HUD, menu radial |
| `js/main.js` | Démarrage, sauvegarde, boucle de jeu, entrées |
| `tools/sim.js` | Vérifie les niveaux et fait jouer un bot : `node tools/sim.js [parties] [niveau]` |
| `tools/bot.js` | Joueur virtuel à trois profils (débutant, moyen, expert) |
| `tools/campagne.js` | Fait jouer toute la campagne comme un vrai joueur (essais, étoiles, Atelier) et signale bugs et murs : `node tools/campagne.js [profil] [de] [à]` |
| `tools/regler.js` | Règle la résistance des voleurs des salles 11 à 50 sur une courbe de difficulté |
| `tools/planche.html`, `tools/decors.html` | Planches de développement : tous les personnages et défenses, pistes de décor |
| `tools/build.js` | Assemble `dist/pas-touche.html` : `node tools/build.js` |

## Ajouter une salle

Le plus simple : ajouter une ligne dans la liste `ROOMS` de `js/levels-gen.js` (nom, trésor, objet, thème, décor, plan, type, variante), puis relancer `node tools/regler.js` et recopier la table `HPMUL` affichée.

Pour une salle dessinée à la main :

1. Dans `js/levels.js`, copier un bloc de niveau et changer `id`, `name`, `theme`, `paths`, `spots`, `deco` et `waves`.
   - Le premier point d'un chemin est hors de la salle (porte, verrière ou égouts), le dernier est le trésor.
   - Placez les socles à environ 72 px du centre du tapis, près des virages : plus loin, le Gardien et le Bouledogue atteignent mal les voleurs.
   - Pour un niveau casse (prévu tous les 5 niveaux), mettre `type: 'casse'` et ajouter un `crew: { name, plan }` à chaque vague.
   - Variantes : `variant: 'visiteurs'` (portes ouvertes) ou `variant: 'panne'` (panne de courant : les décors `lampe` deviennent les seules zones éclairées, rayon `r` réglable, 150 par défaut).
2. Pour qu'une nouvelle défense ou un nouveau pouvoir arrive avec cette salle, mettre son `unlock` à l'id de la salle dans `js/data.js`. L'écran de briefing affiche automatiquement les nouveautés.
3. Lancer `node tools/sim.js 5 <id>` : la commande signale les socles ou décors mal placés et donne une idée de la difficulté.
4. Lancer `node tools/build.js` pour régénérer la version en un seul fichier.
