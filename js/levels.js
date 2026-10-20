/* Pas Touche ! — niveaux.
   Pour ajouter un niveau : copier un bloc, changer l'id, le décor, les chemins, les socles et les vagues.
   - paths : liste de chemins (points en coordonnées monde 1280x720). Tous finissent sur le trésor.
     Le premier point doit être hors de la salle (porte d'entrée), le dernier est le trésor.
   - spots : socles où l'on peut construire.
   - waves : groupes { t: type de voleur, n: nombre, gap: secondes entre deux, at: départ (s),
             p: index du chemin ou 'alt' (alterne), hp: multiplicateur de résistance }.
   - crew  : (niveaux "casse") équipe annoncée par un briefing avant la vague.
   - type  : 'horde' ou 'casse' (un casse tous les 5 niveaux). */
(function (PT) {
  'use strict';

  PT.LEVELS = [
    /* ------------------------------------------------------------------ 1 */
    {
      id: 1, type: 'horde',
      name: 'Musée de Trouville-sur-Bof',
      subtitle: 'La Poule aux Œufs d’Or',
      blurb: 'Un petit musée de province tranquille… jusqu’à ce soir. Placez des Gardiens près des virages et ralentissez les voleurs avec la glu.',
      theme: { floor: 'parquet', floorA: '#c98d55', floorB: '#b97c47', wall: '#7d3b3b', wallDark: '#4e2326', trim: '#e8b84a', carpet: '#b8283a', night: false },
      treasure: { kind: 'poule', name: 'La Poule aux Œufs d’Or' },
      startCoins: 220, lives: 20, hpMul: 1,
      paths: [
        [[-60, 400], [280, 400], [280, 200], [680, 200], [680, 540], [1000, 540], [1000, 340], [1140, 340]],
      ],
      spots: [[180, 328], [390, 272], [570, 272], [608, 440], [840, 468], [840, 612], [1072, 455], [902, 267], [170, 482]],
      deco: [
        { t: 'plante', x: 50, y: 140 }, { t: 'plante', x: 1235, y: 660 }, { t: 'banc', x: 1120, y: 640 },
        { t: 'statue', x: 420, y: 630 }, { t: 'colonne', x: 60, y: 640 }, { t: 'colonne', x: 1230, y: 150 },
        { t: 'vitrine', x: 560, y: 640 }, { t: 'plante', x: 800, y: 130 },
      ],
      taunts: [
        { wave: 0, text: 'Bonsoir, cher gardien ! Que le Grand Concours commence… Ma poule en or, s’il vous plaît.' },
        { wave: 3, text: 'Mes petits pickpockets courent vite, n’est-ce pas ?' },
        { wave: 5, text: 'Dernière vague ! Mes meilleurs élèves arrivent.' },
      ],
      outro: 'Pas mal pour un débutant… Rendez-vous à la Galerie d’Égypte. Vous ne verrez même pas mes Ombres arriver.',
      waves: [
        { groups: [{ t: 'voleur', n: 6, gap: 1.7 }] },
        { groups: [{ t: 'voleur', n: 8, gap: 1.2 }, { t: 'pickpocket', n: 3, gap: 1, at: 7 }] },
        { groups: [{ t: 'pickpocket', n: 10, gap: 0.75 }] },
        { groups: [{ t: 'voleur', n: 10, gap: 1.0 }, { t: 'pickpocket', n: 6, gap: 0.8, at: 4 }] },
        { groups: [{ t: 'voleur', n: 14, gap: 0.8 }, { t: 'pickpocket', n: 8, gap: 0.6, at: 3 }] },
        { groups: [{ t: 'voleur', n: 16, gap: 0.65 }, { t: 'pickpocket', n: 12, gap: 0.5, at: 2 }, { t: 'voleur', n: 6, gap: 1.2, at: 13, hp: 2 }] },
      ],
    },

    /* ------------------------------------------------------------------ 2 */
    {
      id: 2, type: 'horde',
      name: 'Galerie d’Égypte',
      subtitle: 'Le Masque de Toutankhamouille',
      blurb: 'Les Ombres arrivent : invisibles, elles passent sous le nez de vos gardiens. Posez des Caméras pour les repérer.',
      theme: { floor: 'stone', floorA: '#e2c48a', floorB: '#d3b273', wall: '#a8742f', wallDark: '#5e3f1a', trim: '#3fa7a0', carpet: '#2f6f8f', night: false },
      treasure: { kind: 'masque', name: 'Le Masque de Toutankhamouille' },
      startCoins: 260, lives: 20, hpMul: 2.2,
      paths: [
        [[-60, 180], [1000, 180], [1000, 380], [260, 380], [260, 590], [1060, 590]],
      ],
      spots: [[350, 252], [560, 252], [770, 252], [1122, 280], [420, 457], [640, 457], [860, 457], [158, 485], [500, 662], [800, 662], [1142, 492]],
      deco: [
        { t: 'sarcophage', x: 60, y: 650 }, { t: 'obelisque', x: 1220, y: 140 }, { t: 'plante', x: 1235, y: 660 },
        { t: 'statue', x: 140, y: 290 }, { t: 'vitrine', x: 1225, y: 375 }, { t: 'obelisque', x: 1240, y: 560 },
      ],
      taunts: [
        { wave: 0, text: 'Bienvenue en Égypte ! Avez-vous déjà vu une Ombre ? Non ? C’est normal.' },
        { wave: 2, text: 'Hop, mes Ombres sont là. Sans caméra, vous ne les attraperez jamais !' },
        { wave: 7, text: 'Le masque sera du plus bel effet dans mon salon.' },
      ],
      outro: 'Grr… Mes Ombres démasquées ! Allez donc voir la Galerie des Dinosaures : mes Costauds y ont rendez-vous.',
      waves: [
        { groups: [{ t: 'voleur', n: 8, gap: 1.2 }] },
        { groups: [{ t: 'pickpocket', n: 10, gap: 0.7 }, { t: 'voleur', n: 6, gap: 1, at: 5 }] },
        { groups: [{ t: 'ombre', n: 5, gap: 1.6 }, { t: 'voleur', n: 6, gap: 1, at: 3 }] },
        { groups: [{ t: 'voleur', n: 12, gap: 0.8 }, { t: 'ombre', n: 6, gap: 1.2, at: 6 }] },
        { groups: [{ t: 'pickpocket', n: 16, gap: 0.5 }, { t: 'ombre', n: 6, gap: 1, at: 4 }] },
        { groups: [{ t: 'voleur', n: 16, gap: 0.6 }, { t: 'ombre', n: 10, gap: 0.9, at: 3 }] },
        { groups: [{ t: 'pickpocket', n: 20, gap: 0.4 }, { t: 'voleur', n: 12, gap: 0.7, at: 4 }, { t: 'ombre', n: 8, gap: 0.8, at: 8 }] },
        { groups: [{ t: 'ombre', n: 16, gap: 0.6 }, { t: 'voleur', n: 18, gap: 0.5, at: 2 }, { t: 'pickpocket', n: 14, gap: 0.4, at: 10 }] },
      ],
    },

    /* ------------------------------------------------------------------ 3 */
    {
      id: 3, type: 'horde',
      name: 'Galerie des Dinosaures',
      subtitle: 'L’Œuf de Diplodocus',
      blurb: 'Deux entrées ! Les Costauds encaissent tout et les Acrobates sautent par-dessus la glu. Le Lance-Filet arrive en renfort.',
      theme: { floor: 'marble', floorA: '#e9e4d6', floorB: '#cfc8b4', wall: '#3f6b4a', wallDark: '#223d2a', trim: '#e0a33a', carpet: '#7c3a8f', night: false },
      treasure: { kind: 'oeuf', name: 'L’Œuf de Diplodocus' },
      startCoins: 270, lives: 20, hpMul: 3.0,
      paths: [
        [[-60, 180], [420, 180], [420, 380], [780, 380], [780, 560], [1000, 560], [1000, 300], [1160, 300]],
        [[-60, 600], [420, 600], [420, 380], [780, 380], [780, 560], [1000, 560], [1000, 300], [1160, 300]],
      ],
      spots: [[300, 252], [300, 518], [540, 308], [540, 462], [660, 308], [670, 452], [862, 450], [890, 632], [1072, 420], [924, 254], [150, 672], [150, 262]],
      deco: [
        { t: 'dino', x: 640, y: 690 }, { t: 'fossile', x: 1210, y: 640 }, { t: 'plante', x: 1235, y: 140 },
        { t: 'colonne', x: 40, y: 390 }, { t: 'vitrine', x: 1150, y: 560 }, { t: 'plante', x: 760, y: 130 },
      ],
      taunts: [
        { wave: 0, text: 'Deux portes, deux fois plus de voleurs. Les maths sont de mon côté !' },
        { wave: 3, text: 'Mes Acrobates adorent votre glu. Ils sautent par-dessus !' },
        { wave: 9, text: 'Tout le monde dehors… euh, dedans ! Prenez-moi cet œuf !' },
      ],
      outro: 'Bien joué… Mais la nocturne de l’Art Moderne est ouverte au public. Saurez-vous reconnaître mes Faux Touristes ?',
      waves: [
        { groups: [{ t: 'voleur', n: 6, gap: 1.4, p: 0 }, { t: 'voleur', n: 6, gap: 1.4, p: 1, at: 0.7 }] },
        { groups: [{ t: 'costaud', n: 2, gap: 3, p: 'alt' }, { t: 'voleur', n: 10, gap: 0.9, p: 'alt', at: 2 }] },
        { groups: [{ t: 'pickpocket', n: 14, gap: 0.55, p: 'alt' }, { t: 'ombre', n: 6, gap: 1, p: 'alt', at: 4 }] },
        { groups: [{ t: 'acrobate', n: 6, gap: 1.3, p: 'alt' }, { t: 'voleur', n: 10, gap: 0.8, p: 'alt', at: 3 }] },
        { groups: [{ t: 'costaud', n: 4, gap: 2.5, p: 'alt' }, { t: 'pickpocket', n: 16, gap: 0.45, p: 'alt', at: 3 }] },
        { groups: [{ t: 'acrobate', n: 10, gap: 0.9, p: 'alt' }, { t: 'ombre', n: 8, gap: 0.9, p: 'alt', at: 4 }] },
        { groups: [{ t: 'costaud', n: 6, gap: 2, p: 'alt' }, { t: 'voleur', n: 20, gap: 0.5, p: 'alt', at: 2 }] },
        { groups: [{ t: 'acrobate', n: 12, gap: 0.7, p: 'alt' }, { t: 'pickpocket', n: 20, gap: 0.35, p: 'alt', at: 3 }, { t: 'ombre', n: 10, gap: 0.7, p: 'alt', at: 7 }] },
        { groups: [{ t: 'costaud', n: 8, gap: 1.6, p: 'alt' }, { t: 'acrobate', n: 12, gap: 0.7, p: 'alt', at: 4 }, { t: 'voleur', n: 20, gap: 0.45, p: 'alt', at: 8 }] },
        { groups: [{ t: 'costaud', n: 10, gap: 1.4, p: 'alt' }, { t: 'acrobate', n: 16, gap: 0.6, p: 'alt', at: 3 }, { t: 'ombre', n: 14, gap: 0.6, p: 'alt', at: 8 }, { t: 'pickpocket', n: 24, gap: 0.3, p: 'alt', at: 12 }] },
      ],
    },

    /* ------------------------------------------------------------------ 4 */
    {
      id: 4, type: 'horde', variant: 'visiteurs',
      name: 'Nocturne d’Art Moderne',
      subtitle: 'Le Carré Pas Très Blanc',
      blurb: 'Variante « portes ouvertes » : de vrais touristes visitent le musée (et paient !). Des Faux Touristes se cachent parmi eux, et les Hackeuses coupent le courant.',
      theme: { floor: 'gallery', floorA: '#5b6378', floorB: '#525a6e', wall: '#262b45', wallDark: '#14172a', trim: '#f04f8a', carpet: '#3a3550', night: true },
      treasure: { kind: 'tableau', name: 'Le Carré Pas Très Blanc' },
      startCoins: 320, lives: 20, hpMul: 4.0,
      paths: [
        [[-60, 360], [200, 360], [200, 160], [520, 160], [520, 560], [840, 560], [840, 160], [1100, 160], [1100, 480], [1180, 480]],
      ],
      spots: [[128, 240], [100, 452], [272, 260], [420, 232], [448, 460], [680, 488], [600, 632], [760, 632], [912, 260], [1028, 380], [1172, 300], [1053, 575]],
      deco: [
        { t: 'sculpture', x: 680, y: 290 }, { t: 'mobile', x: 300, y: 600 }, { t: 'plante', x: 1235, y: 665 },
        { t: 'banc', x: 940, y: 670 }, { t: 'sculpture', x: 1210, y: 140 }, { t: 'mobile', x: 680, y: 130 },
      ],
      lights: [[680, 290], [300, 600], [1180, 480], [680, 130], [1210, 140]],
      taunts: [
        { wave: 0, text: 'Ce soir, c’est nocturne gratuite ! Lequel de ces charmants touristes travaille pour moi ?' },
        { wave: 3, text: 'Vous aimez vos défenses électriques ? Ma Hackeuse aussi. Clic !' },
        { wave: 9, text: 'Tout le monde dans la salle, et que personne ne bouge… sauf mes voleurs !' },
      ],
      outro: 'Impressionnant. Alors parlons sérieusement : les Joyaux de la Couronne. Ma meilleure équipe. Moi en personne. Préparez-vous.',
      waves: [
        { groups: [{ t: 'touriste', n: 8, gap: 1.6 }, { t: 'voleur', n: 8, gap: 1.2, at: 2 }] },
        { groups: [{ t: 'touriste', n: 10, gap: 1.2 }, { t: 'faussaire', n: 5, gap: 1.6, at: 2 }, { t: 'voleur', n: 6, gap: 1, at: 6 }] },
        { groups: [{ t: 'touriste', n: 10, gap: 1.1 }, { t: 'faussaire', n: 8, gap: 1.2, at: 1 }, { t: 'pickpocket', n: 12, gap: 0.5, at: 6 }] },
        { groups: [{ t: 'hackeuse', n: 4, gap: 2 }, { t: 'voleur', n: 12, gap: 0.7, at: 2 }, { t: 'touriste', n: 8, gap: 1.3, at: 1 }] },
        { groups: [{ t: 'faussaire', n: 10, gap: 1 }, { t: 'ombre', n: 8, gap: 0.9, at: 4 }, { t: 'touriste', n: 10, gap: 1.1 }] },
        { groups: [{ t: 'hackeuse', n: 6, gap: 1.6 }, { t: 'costaud', n: 4, gap: 2.2, at: 3 }, { t: 'acrobate', n: 6, gap: 1, at: 6 }, { t: 'touriste', n: 10, gap: 1.2 }] },
        { groups: [{ t: 'faussaire', n: 14, gap: 0.8 }, { t: 'pickpocket', n: 20, gap: 0.35, at: 4 }, { t: 'touriste', n: 12, gap: 0.9 }] },
        { groups: [{ t: 'hackeuse', n: 8, gap: 1.2 }, { t: 'costaud', n: 6, gap: 1.8, at: 2 }, { t: 'ombre', n: 10, gap: 0.7, at: 6 }, { t: 'touriste', n: 8, gap: 1.5 }] },
        { groups: [{ t: 'faussaire', n: 16, gap: 0.7 }, { t: 'acrobate', n: 12, gap: 0.7, at: 4 }, { t: 'hackeuse', n: 6, gap: 1.3, at: 8 }, { t: 'touriste', n: 14, gap: 0.9 }] },
        { groups: [{ t: 'hackeuse', n: 8, gap: 1 }, { t: 'faussaire', n: 16, gap: 0.6, at: 2 }, { t: 'costaud', n: 8, gap: 1.4, at: 6 }, { t: 'ombre', n: 14, gap: 0.5, at: 10 }, { t: 'touriste', n: 16, gap: 0.8 }] },
      ],
    },

    /* ------------------------------------------------------------------ 5 */
    {
      id: 5, type: 'casse',
      name: 'Les Joyaux de la Couronne',
      subtitle: 'La Couronne du Roi Dagobert',
      blurb: 'NIVEAU CASSE : pas de hordes ce soir, mais des équipes de professionnels. Chaque équipe a son plan, lisez les briefings ! Le Gentleman viendra en personne.',
      theme: { floor: 'royal', floorA: '#7a4048', floorB: '#6e3940', wall: '#2c1a4a', wallDark: '#170c2b', trim: '#f2c14e', carpet: '#1f3f8f', night: false },
      treasure: { kind: 'couronne', name: 'La Couronne du Roi Dagobert' },
      startCoins: 450, lives: 20, hpMul: 1.75,
      paths: [
        [[-60, 520], [300, 520], [300, 300], [640, 300], [640, 520], [900, 520], [900, 360], [1120, 360]],
        [[560, -60], [560, 170], [900, 170], [900, 360], [1120, 360]],
      ],
      spots: [[200, 448], [420, 382], [530, 382], [420, 228], [740, 242], [760, 448], [1020, 432], [1020, 288], [436, 605], [780, 592], [1175, 274]],
      deco: [
        { t: 'armure', x: 60, y: 300 }, { t: 'armure', x: 1225, y: 470 }, { t: 'colonne', x: 120, y: 650 },
        { t: 'vitrine', x: 1100, y: 650 }, { t: 'plante', x: 300, y: 150 }, { t: 'armure', x: 960, y: 650 },
      ],
      taunts: [
        { wave: 0, text: 'Voici le vrai jeu, gardien. Mes équipes ont un plan. Le vôtre est-il aussi bon ?' },
        { wave: 4, text: 'Vous tenez encore ? Je vais devoir me salir les gants.' },
        { wave: 7, text: 'Assez joué. Je viens chercher MA couronne moi-même !' },
      ],
      outro: 'Impossible… Battu par un gardien de nuit ! Ce n’est qu’un au revoir. Le Grand Concours continue ailleurs…',
      waves: [
        {
          crew: { name: 'Les Frères Pinces', plan: 'Deux Costauds ouvrent la marche pour encaisser vos tirs, leurs cousins suivent dans leur ombre.' },
          groups: [{ t: 'costaud', n: 2, gap: 2.5, p: 0 }, { t: 'voleur', n: 8, gap: 0.6, p: 0, at: 1.5, hp: 1.4 }],
        },
        {
          crew: { name: 'Le Réseau Fantôme', plan: 'Les Hackeuses passent par le toit pour couper vos caméras, puis les Ombres foncent par la grande porte.' },
          groups: [{ t: 'hackeuse', n: 2, gap: 1.5, p: 1 }, { t: 'ombre', n: 12, gap: 0.6, p: 0, at: 4, hp: 1.3 }],
        },
        {
          crew: { name: 'Le Cirque Volant', plan: 'Toute la troupe d’Acrobates descend par la verrière. La glu ne servira à rien.' },
          groups: [{ t: 'acrobate', n: 10, gap: 0.65, p: 1, hp: 1.1 }],
        },
        {
          crew: { name: 'Opération Touristes', plan: 'Un car entier de touristes… et une dizaine de faussaires cachés dedans.' },
          groups: [{ t: 'touriste', n: 16, gap: 0.6, p: 'alt' }, { t: 'faussaire', n: 12, gap: 0.8, p: 'alt', at: 1, hp: 1.3 }],
        },
        {
          crew: { name: 'La Division Lourde', plan: 'Les Hackeuses coupent tout, les Costauds défoncent la porte. Simple et brutal.' },
          groups: [{ t: 'hackeuse', n: 4, gap: 1.2, p: 0 }, { t: 'costaud', n: 8, gap: 1.6, p: 0, at: 2, hp: 1.2 }],
        },
        {
          crew: { name: 'Les Mille Mains', plan: 'Une marée de pickpockets par les deux entrées. Ils misent sur le nombre.' },
          groups: [{ t: 'pickpocket', n: 44, gap: 0.28, p: 'alt', hp: 1.4 }],
        },
        {
          crew: { name: 'La Grande Équipe', plan: 'Tous les spécialistes ensemble, par les deux entrées. Le grand chelem du cambriolage.' },
          groups: [
            { t: 'hackeuse', n: 4, gap: 1.5, p: 1 }, { t: 'costaud', n: 6, gap: 1.6, p: 0, at: 1 },
            { t: 'ombre', n: 10, gap: 0.6, p: 0, at: 5 }, { t: 'acrobate', n: 10, gap: 0.6, p: 1, at: 6 },
            { t: 'faussaire', n: 8, gap: 0.8, p: 0, at: 10 },
          ],
        },
        {
          crew: { name: 'Le Gentleman en personne', plan: 'Le maître lui-même, entouré de sa garde rapprochée. Fumigènes et complices à volonté.' },
          groups: [
            { t: 'costaud', n: 4, gap: 1.5, p: 0, hp: 1.3 }, { t: 'gentleman', n: 1, gap: 1, p: 0, at: 4 },
            { t: 'ombre', n: 10, gap: 0.8, p: 1, at: 6 }, { t: 'acrobate', n: 8, gap: 0.8, p: 1, at: 14 },
          ],
        },
      ],
    },

    /* ------------------------------------------------------------------ 6 */
    {
      id: 6, type: 'horde',
      name: 'Salle des Armures',
      subtitle: 'L’Épée Durandouille',
      blurb: 'Deux portes, une de chaque côté, et les Chevaliers débarquent en armure complète : les petits coups rebondissent. Améliorez vos défenses et gardez un Laser pour eux.',
      theme: { floor: 'dalles', floorA: '#a3a7ad', floorB: '#92979e', wall: '#3d4f6b', wallDark: '#1f2a3b', trim: '#d9a440', carpet: '#8f1d2c', night: false },
      treasure: { kind: 'epee', name: 'L’Épée Durandouille' },
      startCoins: 380, lives: 20, hpMul: 2.75,
      paths: [
        [[-60, 400], [140, 400], [140, 180], [380, 180], [380, 620], [640, 620], [640, 260]],
        [[1340, 400], [1140, 400], [1140, 180], [900, 180], [900, 620], [640, 620], [640, 260]],
      ],
      spots: [[212, 280], [308, 520], [452, 520], [568, 380], [566, 230], [1068, 280], [972, 520], [828, 520], [712, 380], [714, 230], [68, 260], [1212, 260], [640, 692]],
      deco: [
        { t: 'armure', x: 40, y: 150 }, { t: 'armure', x: 1240, y: 150 }, { t: 'trophee', x: 420, y: 120 }, { t: 'trophee', x: 860, y: 120 },
        { t: 'trophee', x: 640, y: 130 }, { t: 'brasero', x: 380, y: 700 }, { t: 'brasero', x: 900, y: 700 },
        { t: 'armure', x: 200, y: 700 }, { t: 'armure', x: 1080, y: 700 },
      ],
      taunts: [
        { wave: 0, text: 'Bienvenue au château, gardien ! Mes Chevaliers portent l’armure complète. Vos matraques vont faire « ting ».' },
        { wave: 3, text: 'Une armure, c’est un coffre-fort qui marche. Et qui court presque.' },
        { wave: 9, text: 'Chargez, mes preux ! Rapportez-moi Durandouille !' },
      ],
      outro: 'Durandouille reste dans sa pierre… Soit. Le Musée de la Marine cache un coffre de pirate qui me fait de l’œil. Hissez les voiles !',
      waves: [
        { groups: [{ t: 'voleur', n: 10, gap: 1, p: 'alt' }, { t: 'pickpocket', n: 6, gap: 0.6, p: 'alt', at: 5 }] },
        { groups: [{ t: 'chevalier', n: 3, gap: 2.5, p: 'alt' }, { t: 'voleur', n: 10, gap: 0.8, p: 'alt', at: 3 }] },
        { groups: [{ t: 'pickpocket', n: 18, gap: 0.45, p: 'alt' }, { t: 'ombre', n: 6, gap: 1, p: 'alt', at: 4 }] },
        { groups: [{ t: 'chevalier', n: 5, gap: 2, p: 'alt' }, { t: 'acrobate', n: 8, gap: 0.9, p: 'alt', at: 4 }] },
        { groups: [{ t: 'costaud', n: 3, gap: 2.5, p: 'alt' }, { t: 'chevalier', n: 3, gap: 2.2, p: 'alt', at: 3 }, { t: 'voleur', n: 14, gap: 0.55, p: 'alt', at: 6 }] },
        { groups: [{ t: 'hackeuse', n: 2, gap: 2, p: 'alt' }, { t: 'chevalier', n: 5, gap: 1.8, p: 'alt', at: 2 }, { t: 'pickpocket', n: 16, gap: 0.4, p: 'alt', at: 8 }] },
        { groups: [{ t: 'acrobate', n: 12, gap: 0.7, p: 'alt' }, { t: 'ombre', n: 10, gap: 0.7, p: 'alt', at: 3 }, { t: 'chevalier', n: 6, gap: 1.5, p: 'alt', at: 8 }] },
        { groups: [{ t: 'chevalier', n: 14, gap: 0.9, p: 'alt', hp: 1.2 }, { t: 'costaud', n: 6, gap: 1.8, p: 'alt', at: 4 }, { t: 'voleur', n: 22, gap: 0.4, p: 'alt', at: 10, hp: 1.2 }] },
        { groups: [{ t: 'hackeuse', n: 6, gap: 1.4, p: 'alt' }, { t: 'chevalier', n: 12, gap: 0.9, p: 'alt', at: 2, hp: 1.2 }, { t: 'acrobate', n: 16, gap: 0.55, p: 'alt', at: 6 }, { t: 'pickpocket', n: 24, gap: 0.3, p: 'alt', at: 12, hp: 1.2 }] },
        { groups: [{ t: 'chevalier', n: 20, gap: 0.7, p: 'alt', hp: 1.3 }, { t: 'costaud', n: 10, gap: 1.3, p: 'alt', at: 3, hp: 1.2 }, { t: 'ombre', n: 16, gap: 0.55, p: 'alt', at: 7 }, { t: 'acrobate', n: 16, gap: 0.55, p: 'alt', at: 11 }, { t: 'voleur', n: 30, gap: 0.3, p: 'alt', at: 14, hp: 1.3 }] },
      ],
    },

    /* ------------------------------------------------------------------ 7 */
    {
      id: 7, type: 'horde',
      name: 'Musée de la Marine',
      subtitle: 'Le Coffre de Barbe-à-Papa',
      blurb: 'Les voleurs entrent par la grande porte et descendent aussi par la verrière. Le Canon de Marine reprend du service : longue portée, gros dégâts de zone, et il perce les armures.',
      theme: { floor: 'pont', floorA: '#9c7b55', floorB: '#8f6f4b', wall: '#2a4d72', wallDark: '#14273d', trim: '#e3c06a', carpet: '#1d5f8a', night: false },
      treasure: { kind: 'coffre', name: 'Le Coffre de Barbe-à-Papa' },
      startCoins: 420, lives: 20, hpMul: 3.25,
      paths: [
        [[-60, 190], [240, 190], [240, 470], [480, 470], [480, 250], [760, 250], [760, 560], [1060, 560], [1060, 330], [1170, 330]],
        [[620, -60], [620, 250], [760, 250], [760, 560], [1060, 560], [1060, 330], [1170, 330]],
      ],
      spots: [[168, 300], [340, 398], [408, 280], [360, 542], [548, 160], [552, 350], [688, 470], [717, 618], [826, 221], [832, 460], [988, 330], [910, 632], [1132, 450]],
      deco: [
        { t: 'maquette', x: 40, y: 120 }, { t: 'ancre', x: 60, y: 700 }, { t: 'maquette', x: 240, y: 670 },
        { t: 'gouvernail', x: 1230, y: 610 }, { t: 'maquette', x: 1070, y: 690 }, { t: 'ancre', x: 1230, y: 150 },
      ],
      taunts: [
        { wave: 0, text: 'Ohé, moussaillon ! Le coffre de Barbe-à-Papa est plein de pièces d’or… et de barbe à papa.' },
        { wave: 4, text: 'Mes hommes passent par la verrière. Vous n’aviez pas fermé le hublot ?' },
        { wave: 10, text: 'À l’abordage ! Tout le monde au coffre !' },
      ],
      outro: 'Coulé, je suis coulé… Mais la Galerie des Glaces m’attend. Là-bas, vous ne saurez plus où donner de la tête : mes reflets sont partout.',
      waves: [
        { groups: [{ t: 'voleur', n: 12, gap: 0.9, p: 0 }, { t: 'pickpocket', n: 8, gap: 0.6, p: 1, at: 4 }] },
        { groups: [{ t: 'chevalier', n: 4, gap: 2, p: 'alt' }, { t: 'voleur', n: 12, gap: 0.7, p: 'alt', at: 3 }] },
        { groups: [{ t: 'costaud', n: 5, gap: 2, p: 0 }, { t: 'pickpocket', n: 16, gap: 0.45, p: 1, at: 3 }] },
        { groups: [{ t: 'acrobate', n: 10, gap: 0.8, p: 1 }, { t: 'chevalier', n: 6, gap: 1.6, p: 0, at: 2 }] },
        { groups: [{ t: 'hackeuse', n: 4, gap: 1.6, p: 1 }, { t: 'ombre', n: 10, gap: 0.8, p: 'alt', at: 3 }, { t: 'voleur', n: 16, gap: 0.5, p: 0, at: 6 }] },
        { groups: [{ t: 'chevalier', n: 10, gap: 1.2, p: 'alt' }, { t: 'costaud', n: 6, gap: 2, p: 'alt', at: 4 }, { t: 'pickpocket', n: 20, gap: 0.35, p: 'alt', at: 9 }] },
        { groups: [{ t: 'acrobate', n: 14, gap: 0.6, p: 1 }, { t: 'ombre', n: 12, gap: 0.6, p: 0, at: 3 }, { t: 'chevalier', n: 8, gap: 1.2, p: 'alt', at: 8 }] },
        { groups: [{ t: 'hackeuse', n: 6, gap: 1.3, p: 1 }, { t: 'costaud', n: 8, gap: 1.6, p: 'alt', at: 2 }, { t: 'chevalier', n: 10, gap: 1, p: 'alt', at: 6 }] },
        { groups: [{ t: 'pickpocket', n: 34, gap: 0.22, p: 'alt', hp: 1.3 }, { t: 'acrobate', n: 14, gap: 0.55, p: 'alt', at: 4, hp: 1.2 }, { t: 'voleur', n: 24, gap: 0.35, p: 'alt', at: 9, hp: 1.3 }] },
        { groups: [{ t: 'chevalier', n: 20, gap: 0.7, p: 'alt', hp: 1.3 }, { t: 'hackeuse', n: 6, gap: 1.2, p: 1, at: 2 }, { t: 'ombre', n: 16, gap: 0.45, p: 'alt', at: 7, hp: 1.3 }, { t: 'costaud', n: 8, gap: 1.4, p: 'alt', at: 10, hp: 1.3 }] },
        { groups: [{ t: 'costaud', n: 12, gap: 1.1, p: 'alt', hp: 1.4 }, { t: 'chevalier', n: 18, gap: 0.7, p: 'alt', at: 3, hp: 1.4 }, { t: 'acrobate', n: 18, gap: 0.45, p: 'alt', at: 7, hp: 1.3 }, { t: 'ombre', n: 16, gap: 0.45, p: 'alt', at: 10, hp: 1.3 }, { t: 'pickpocket', n: 30, gap: 0.25, p: 'alt', at: 14, hp: 1.4 }] },
      ],
    },

    /* ------------------------------------------------------------------ 8 */
    {
      id: 8, type: 'horde',
      name: 'Galerie des Glaces',
      subtitle: 'La Perruque du Roi-Soleil',
      blurb: 'Une seule porte, à droite, et un très long couloir de miroirs. L’Illusionniste sème des reflets qui gaspillent vos tirs : une Caméra les fait éclater.',
      theme: { floor: 'versailles', floorA: '#c98f52', floorB: '#b77f45', wall: '#b89a5e', wallDark: '#3e2f1c', trim: '#f2c14e', carpet: '#2c4a9a', night: false },
      treasure: { kind: 'perruque', name: 'La Perruque du Roi-Soleil' },
      startCoins: 450, lives: 20, hpMul: 5.0,
      paths: [
        [[1340, 580], [1080, 580], [1080, 200], [800, 200], [800, 520], [520, 520], [520, 200], [240, 200], [240, 560], [150, 560]],
      ],
      spots: [[1008, 300], [872, 440], [728, 420], [592, 300], [448, 300], [312, 440], [660, 592], [1152, 300], [1180, 508], [168, 330], [168, 450], [240, 632], [1020, 640]],
      deco: [
        { t: 'oranger', x: 50, y: 130 }, { t: 'oranger', x: 1235, y: 130 }, { t: 'miroir', x: 940, y: 130 }, { t: 'miroir', x: 380, y: 130 },
        { t: 'candelabre', x: 520, y: 680 }, { t: 'candelabre', x: 800, y: 680 }, { t: 'oranger', x: 55, y: 690 }, { t: 'statue', x: 1225, y: 690 },
      ],
      taunts: [
        { wave: 0, text: 'La Galerie des Glaces ! Dix-sept miroirs, et autant de façons de vous tromper.' },
        { wave: 1, text: 'Voici mon Illusionniste. Lequel est le vrai ? Vos gardiens vont tirer sur des reflets !' },
        { wave: 10, text: 'Que le Roi-Soleil me pardonne : sa perruque ira très bien avec mon chapeau.' },
      ],
      outro: 'Des caméras contre mes miroirs… bien vu. Descendons d’un étage : la Réserve souterraine, où dorment les trésors cachés. Et où il y a souvent des pannes de courant.',
      waves: [
        { groups: [{ t: 'voleur', n: 14, gap: 0.8 }, { t: 'pickpocket', n: 10, gap: 0.5, at: 5 }] },
        { groups: [{ t: 'illusionniste', n: 4, gap: 2.5 }, { t: 'voleur', n: 10, gap: 0.8, at: 3 }] },
        { groups: [{ t: 'chevalier', n: 6, gap: 1.6 }, { t: 'illusionniste', n: 4, gap: 2, at: 3 }] },
        { groups: [{ t: 'acrobate', n: 8, gap: 0.9 }, { t: 'pickpocket', n: 14, gap: 0.45, at: 4 }] },
        { groups: [{ t: 'illusionniste', n: 8, gap: 1.4 }, { t: 'costaud', n: 4, gap: 2.2, at: 4 }, { t: 'voleur', n: 14, gap: 0.6, at: 8 }] },
        { groups: [{ t: 'hackeuse', n: 5, gap: 1.6 }, { t: 'chevalier', n: 10, gap: 1.2, at: 2 }, { t: 'illusionniste', n: 6, gap: 1.5, at: 8 }] },
        { groups: [{ t: 'ombre', n: 14, gap: 0.6 }, { t: 'acrobate', n: 12, gap: 0.7, at: 4 }, { t: 'illusionniste', n: 6, gap: 1.4, at: 9 }] },
        { groups: [{ t: 'costaud', n: 8, gap: 1.6 }, { t: 'illusionniste', n: 10, gap: 1, at: 3 }, { t: 'pickpocket', n: 24, gap: 0.3, at: 8 }] },
        { groups: [{ t: 'chevalier', n: 14, gap: 0.9 }, { t: 'hackeuse', n: 6, gap: 1.3, at: 3 }, { t: 'acrobate', n: 14, gap: 0.6, at: 8 }] },
        { groups: [{ t: 'illusionniste', n: 16, gap: 0.7, hp: 1.3 }, { t: 'ombre', n: 16, gap: 0.45, at: 4, hp: 1.3 }, { t: 'costaud', n: 10, gap: 1.2, at: 8, hp: 1.3 }, { t: 'voleur', n: 28, gap: 0.3, at: 12, hp: 1.3 }] },
        { groups: [{ t: 'chevalier', n: 20, gap: 0.7, hp: 1.4 }, { t: 'illusionniste', n: 16, gap: 0.7, at: 3, hp: 1.3 }, { t: 'acrobate', n: 18, gap: 0.45, at: 7, hp: 1.3 }, { t: 'hackeuse', n: 8, gap: 1, at: 10 }, { t: 'costaud', n: 10, gap: 1.1, at: 13, hp: 1.4 }] },
      ],
    },

    /* ------------------------------------------------------------------ 9 */
    {
      id: 9, type: 'horde', variant: 'panne',
      name: 'Réserve souterraine',
      subtitle: 'La Vraie Joconde',
      blurb: 'Variante « panne de courant » : vos défenses ne voient les voleurs que sous les lampes de secours, ou grâce aux Caméras. Nouveau : le Verrouillage bloque les voleurs chargés devant la sortie.',
      theme: { floor: 'beton', floorA: '#8c9095', floorB: '#81858a', wall: '#4a5560', wallDark: '#22282f', trim: '#e8b923', carpet: '#b8283a', night: true },
      treasure: { kind: 'joconde', name: 'La Vraie Joconde' },
      startCoins: 480, lives: 20, hpMul: 3.95,
      paths: [
        [[-60, 300], [220, 300], [220, 600], [520, 600], [520, 220], [820, 220], [820, 560], [1100, 560], [1100, 300], [1170, 300]],
        [[370, 780], [370, 600], [520, 600], [520, 220], [820, 220], [820, 560], [1100, 560], [1100, 300], [1170, 300]],
      ],
      spots: [[100, 200], [120, 372], [148, 600], [292, 500], [448, 360], [592, 320], [748, 460], [670, 148], [892, 460], [1028, 330], [960, 632], [1172, 440], [470, 672]],
      deco: [
        { t: 'lampe', x: 160, y: 240 }, { t: 'lampe', x: 450, y: 530 }, { t: 'lampe', x: 760, y: 280 }, { t: 'lampe', x: 1040, y: 500 },
        { t: 'caisses', x: 40, y: 700 }, { t: 'caisses', x: 1230, y: 140 }, { t: 'bache', x: 1230, y: 680 }, { t: 'caisses', x: 820, y: 685 },
      ],
      taunts: [
        { wave: 0, text: 'Oups, les plombs ont sauté ! Vos défenses ne voient plus rien en dehors des lampes de secours.' },
        { wave: 3, text: 'Dans le noir, tous les voleurs sont gris. Et invisibles.' },
        { wave: 10, text: 'Dernière ronde, gardien. La vraie Joconde sourira bientôt dans mon salon.' },
      ],
      outro: 'Vous avez des yeux de chat, ma parole ! Il ne reste qu’un endroit digne de moi : le coffre-fort de la Banque de France. Ma plus grande équipe. Mon plus grand casse.',
      waves: [
        { groups: [{ t: 'voleur', n: 12, gap: 0.9, p: 'alt' }, { t: 'pickpocket', n: 8, gap: 0.6, p: 'alt', at: 5 }] },
        { groups: [{ t: 'ombre', n: 6, gap: 1.4, p: 'alt' }, { t: 'voleur', n: 12, gap: 0.8, p: 'alt', at: 2 }] },
        { groups: [{ t: 'chevalier', n: 6, gap: 1.6, p: 'alt' }, { t: 'pickpocket', n: 14, gap: 0.45, p: 'alt', at: 4 }] },
        { groups: [{ t: 'illusionniste', n: 6, gap: 1.6, p: 'alt' }, { t: 'acrobate', n: 8, gap: 0.9, p: 'alt', at: 3 }] },
        { groups: [{ t: 'costaud', n: 4, gap: 2.2, p: 'alt' }, { t: 'hackeuse', n: 3, gap: 2, p: 'alt', at: 3 }, { t: 'voleur', n: 14, gap: 0.55, p: 'alt', at: 6 }] },
        { groups: [{ t: 'ombre', n: 12, gap: 0.7, p: 'alt' }, { t: 'chevalier', n: 8, gap: 1.3, p: 'alt', at: 4 }, { t: 'pickpocket', n: 18, gap: 0.35, p: 'alt', at: 9 }] },
        { groups: [{ t: 'illusionniste', n: 10, gap: 1.1, p: 'alt' }, { t: 'acrobate', n: 12, gap: 0.7, p: 'alt', at: 4 }, { t: 'costaud', n: 4, gap: 2, p: 'alt', at: 9 }] },
        { groups: [{ t: 'hackeuse', n: 6, gap: 1.3, p: 'alt' }, { t: 'chevalier', n: 12, gap: 1, p: 'alt', at: 2 }, { t: 'ombre', n: 12, gap: 0.6, p: 'alt', at: 7 }] },
        { groups: [{ t: 'pickpocket', n: 30, gap: 0.25, p: 'alt' }, { t: 'illusionniste', n: 10, gap: 1, p: 'alt', at: 3 }, { t: 'acrobate', n: 14, gap: 0.6, p: 'alt', at: 8 }] },
        { groups: [{ t: 'costaud', n: 10, gap: 1.3, p: 'alt', hp: 1.3 }, { t: 'chevalier', n: 16, gap: 0.8, p: 'alt', at: 3, hp: 1.3 }, { t: 'ombre', n: 16, gap: 0.45, p: 'alt', at: 8, hp: 1.3 }, { t: 'hackeuse', n: 6, gap: 1.2, p: 'alt', at: 11 }] },
        { groups: [{ t: 'chevalier', n: 20, gap: 0.7, p: 'alt', hp: 1.4 }, { t: 'illusionniste', n: 14, gap: 0.8, p: 'alt', at: 3, hp: 1.3 }, { t: 'acrobate', n: 18, gap: 0.45, p: 'alt', at: 7, hp: 1.3 }, { t: 'ombre', n: 18, gap: 0.45, p: 'alt', at: 10, hp: 1.3 }, { t: 'costaud', n: 10, gap: 1.2, p: 'alt', at: 14, hp: 1.4 }] },
      ],
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 10, type: 'casse',
      name: 'Coffre-fort de la Banque de France',
      subtitle: 'Les Lingots de la Nation',
      blurb: 'NIVEAU CASSE : trois entrées (la grande porte, la verrière et les égouts) et neuf équipes de spécialistes. Lisez chaque plan intercepté. Le Gentleman joue sa dernière carte.',
      theme: { floor: 'acier', floorA: '#6f7a86', floorB: '#66717d', wall: '#2f3b4a', wallDark: '#161e28', trim: '#d4a72c', carpet: '#8f1d2c', night: false },
      treasure: { kind: 'lingots', name: 'Les Lingots de la Nation' },
      startCoins: 520, lives: 20, hpMul: 3.5,
      paths: [
        [[-60, 380], [180, 380], [180, 170], [440, 170], [440, 600], [720, 600], [720, 300], [980, 300], [980, 560], [1150, 560]],
        [[850, -60], [850, 300], [980, 300], [980, 560], [1150, 560]],
        [[310, 780], [310, 600], [720, 600], [720, 300], [980, 300], [980, 560], [1150, 560]],
      ],
      spots: [[108, 270], [80, 452], [252, 270], [368, 500], [238, 680], [512, 230], [648, 380], [512, 500], [778, 200], [922, 200], [792, 400], [908, 520], [1052, 420], [1060, 632]],
      deco: [
        { t: 'coffret', x: 40, y: 690 }, { t: 'coffret', x: 1235, y: 690 }, { t: 'sacs', x: 420, y: 690 }, { t: 'sacs', x: 790, y: 690 },
        { t: 'colonne', x: 40, y: 130 }, { t: 'colonne', x: 1240, y: 130 },
      ],
      taunts: [
        { wave: 0, text: 'La Banque de France, gardien ! Trois entrées, neuf équipes et tout l’or du pays. Que le dernier casse commence.' },
        { wave: 4, text: 'Mes équipes vous ont testé. La suite va moins vous faire rire.' },
        { wave: 8, text: 'Le Grand Concours se termine ce soir. Et c’est MOI qui le gagne !' },
      ],
      outro: 'Battu… dans MA banque préférée ! Bravo, gardien. Le Grand Concours est terminé pour cette saison. Mais j’ai des cousins à l’étranger, vous savez…',
      waves: [
        {
          crew: { name: 'Les Rats d’égout', plan: 'Une nuée de Pickpockets remonte par les égouts, juste sous le coffre. Ils misent tout sur la vitesse.' },
          groups: [{ t: 'pickpocket', n: 24, gap: 0.4, p: 2, hp: 1.4 }, { t: 'voleur', n: 8, gap: 0.7, p: 2, at: 4, hp: 1.3 }],
        },
        {
          crew: { name: 'Les Templiers', plan: 'Des Chevaliers en armure enfoncent la grande porte. Vos matraques ne leur feront rien : sortez les canons.' },
          groups: [{ t: 'chevalier', n: 10, gap: 1.2, p: 0, hp: 1.2 }, { t: 'costaud', n: 2, gap: 2, p: 0, at: 6 }],
        },
        {
          crew: { name: 'Le Cabinet des Miroirs', plan: 'Les Illusionnistes descendent par la verrière en semant leurs reflets, les Ombres les suivent. Gardez une Caméra près du coffre.' },
          groups: [{ t: 'illusionniste', n: 10, gap: 1, p: 1, hp: 1.2 }, { t: 'ombre', n: 8, gap: 0.8, p: 1, at: 6 }],
        },
        {
          crew: { name: 'La Coupure', plan: 'Les Hackeuses coupent le courant depuis les égouts pendant que les Ombres entrent par la grande porte.' },
          groups: [{ t: 'hackeuse', n: 5, gap: 1.4, p: 2 }, { t: 'ombre', n: 14, gap: 0.6, p: 0, at: 3, hp: 1.3 }],
        },
        {
          crew: { name: 'Les Acrobates du Toit', plan: 'Des Acrobates par la verrière, des Costauds par la porte : les uns attirent vos tirs, les autres filent au coffre.' },
          groups: [{ t: 'acrobate', n: 10, gap: 0.7, p: 1 }, { t: 'costaud', n: 5, gap: 2, p: 0, at: 2 }],
        },
        {
          crew: { name: 'Le Grand Défilé', plan: 'Toutes les entrées à la fois ! Une marée de voleurs, en espérant que vous ne sachiez plus où regarder.' },
          groups: [{ t: 'voleur', n: 30, gap: 0.3, p: 'alt', hp: 1.5 }, { t: 'pickpocket', n: 20, gap: 0.3, p: 'alt', at: 4, hp: 1.4 }, { t: 'chevalier', n: 6, gap: 1.2, p: 'alt', at: 9 }],
        },
        {
          crew: { name: 'La Brigade Blindée', plan: 'Les Hackeuses en tête, puis un mur de Chevaliers par la porte et de Costauds par les égouts. Lent, lourd, inarrêtable… en théorie.' },
          groups: [{ t: 'hackeuse', n: 4, gap: 1.4, p: 0 }, { t: 'chevalier', n: 10, gap: 1.1, p: 0, at: 2 }, { t: 'costaud', n: 6, gap: 1.8, p: 2, at: 5 }],
        },
        {
          crew: { name: 'Les Finalistes du Concours', plan: 'Les meilleurs voleurs du Grand Concours, chacun avec sa spécialité, par les trois entrées en même temps.' },
          groups: [
            { t: 'illusionniste', n: 8, gap: 1, p: 1 }, { t: 'ombre', n: 12, gap: 0.6, p: 0, at: 2 },
            { t: 'acrobate', n: 12, gap: 0.6, p: 2, at: 5 }, { t: 'faussaire', n: 8, gap: 0.9, p: 0, at: 9 }, { t: 'chevalier', n: 8, gap: 1, p: 2, at: 12 },
          ],
        },
        {
          crew: { name: 'Le Gentleman, plan final', plan: 'Le maître en personne par la grande porte, avec sa garde blindée. Ses Illusionnistes brouillent les pistes par la verrière, ses Acrobates passent par les égouts.' },
          groups: [
            { t: 'chevalier', n: 6, gap: 1.2, p: 0, hp: 1.3 }, { t: 'gentleman', n: 1, gap: 1, p: 0, at: 4, hp: 1.25 },
            { t: 'illusionniste', n: 8, gap: 1, p: 1, at: 6 }, { t: 'acrobate', n: 10, gap: 0.7, p: 2, at: 12 }, { t: 'costaud', n: 6, gap: 1.6, p: 2, at: 18 },
          ],
        },
      ],
    },
  ];
})(globalThis.PT = globalThis.PT || {});
