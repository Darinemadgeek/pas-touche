/* Pas Touche ! — données du jeu : défenses, voleurs, pouvoirs, améliorations.
   Ce fichier ne touche ni au DOM ni au canvas : il est aussi chargé par tools/sim.js. */
(function (PT) {
  'use strict';

  // Monde logique : toutes les coordonnées des niveaux sont exprimées dans ce repère.
  PT.WORLD = { W: 1280, H: 720, WALL: 84 };

  /* ---------- Défenses ----------
     unlock : premier niveau où la défense est disponible.
     levels[i].cost : prix de l'amélioration vers ce rang (le rang 0 coûte `cost`). */
  PT.TOWERS = {
    gardien: {
      name: 'Gardien', unlock: 1, cost: 70, color: '#3d6fd6',
      desc: 'Lance sa matraque sur le voleur le plus proche de la sortie. Fiable et pas cher.',
      projectile: 'matraque', projSpeed: 560,
      levels: [
        { dmg: 12, rate: 1.0, range: 135 },
        { dmg: 21, rate: 1.15, range: 150, cost: 65 },
        { dmg: 34, rate: 1.3, range: 165, cost: 120 },
      ],
    },
    glu: {
      name: 'Pot de Glu', unlock: 1, cost: 60, color: '#5cc23a',
      desc: 'Projette une flaque de glu qui ralentit tous les voleurs qui marchent dedans.',
      projectile: 'glu', projSpeed: 380,
      levels: [
        { dmg: 4, rate: 0.75, range: 120, slow: 0.45, slowDur: 2.2, splash: 55, puddle: 2.5 },
        { dmg: 7, rate: 0.85, range: 132, slow: 0.55, slowDur: 2.6, splash: 62, puddle: 3, cost: 55 },
        { dmg: 12, rate: 0.95, range: 145, slow: 0.65, slowDur: 3.0, splash: 70, puddle: 3.5, cost: 100 },
      ],
    },
    camera: {
      name: 'Caméra', unlock: 2, cost: 50, color: '#4fb6e8', support: true,
      desc: 'Repère les voleurs invisibles et démasque les faux touristes. Les voleurs filmés prennent plus de dégâts.',
      levels: [
        { range: 150, mark: 0.2 },
        { range: 180, mark: 0.3, cost: 50 },
        { range: 215, mark: 0.4, cost: 90 },
      ],
    },
    chien: {
      name: 'Bouledogue', unlock: 2, cost: 90, color: '#c98a4b', melee: true,
      desc: 'Mord tout ce qui passe à sa portée. Courte portée, gros dégâts.',
      levels: [
        { dmg: 20, rate: 1.5, range: 92 },
        { dmg: 33, rate: 1.7, range: 102, cost: 80 },
        { dmg: 52, rate: 1.9, range: 112, cost: 140 },
      ],
    },
    filet: {
      name: 'Lance-Filet', unlock: 3, cost: 120, color: '#e0703a',
      desc: 'Tire un filet qui immobilise tout un groupe de voleurs.',
      projectile: 'filet', projSpeed: 340,
      levels: [
        { dmg: 28, rate: 0.45, range: 150, splash: 62, stun: 0.9 },
        { dmg: 46, rate: 0.5, range: 162, splash: 68, stun: 1.1, cost: 100 },
        { dmg: 75, rate: 0.55, range: 178, splash: 76, stun: 1.4, cost: 170 },
      ],
    },
    laser: {
      name: 'Laser', unlock: 4, cost: 150, color: '#ff3d5a', beam: true,
      desc: 'Rayon continu à longue portée. Fait fondre les voleurs les plus coriaces.',
      levels: [
        { dps: 38, range: 190 },
        { dps: 64, range: 210, cost: 130 },
        { dps: 104, range: 235, cost: 220 },
      ],
    },
    canon: {
      name: 'Canon de Marine', unlock: 7, cost: 140, color: '#2f5d8a', pierce: true,
      desc: 'Un vieux canon de la Marine remis en service. Ses boulets portent très loin, écrasent tout un groupe et traversent les armures. Lent à recharger.',
      projectile: 'boulet', projSpeed: 330, arc: 120,
      levels: [
        { dmg: 46, rate: 0.32, range: 225, splash: 60 },
        { dmg: 78, rate: 0.35, range: 245, splash: 66, cost: 120 },
        { dmg: 124, rate: 0.39, range: 270, splash: 74, cost: 200 },
      ],
    },
  };
  PT.TOWER_ORDER = ['gardien', 'glu', 'camera', 'chien', 'filet', 'laser', 'canon'];

  /* ---------- Voleurs ---------- */
  PT.ENEMIES = {
    voleur: {
      name: 'Le Monte-en-l’air', hp: 40, speed: 62, reward: 7, loot: 1, size: 1,
      desc: 'Le cambrioleur classique : marinière, bonnet et gros sac.',
    },
    pickpocket: {
      name: 'Le Pickpocket', hp: 22, speed: 108, reward: 5, loot: 1, size: 0.82,
      desc: 'Petit et très rapide. Il faut le cueillir avant qu’il file.',
    },
    costaud: {
      name: 'Le Costaud', hp: 210, speed: 38, reward: 22, loot: 2, size: 1.35, stunImmune: true, heavy: true,
      desc: 'Emporte deux objets d’un coup. Les filets ne l’arrêtent pas.',
    },
    ombre: {
      name: 'L’Ombre', hp: 52, speed: 78, reward: 12, loot: 1, size: 0.95, camo: true,
      desc: 'Invisible ! Seule une caméra (ou l’alarme) permet de la viser.',
    },
    acrobate: {
      name: 'L’Acrobate', hp: 60, speed: 72, reward: 13, loot: 1, size: 0.95, slowImmune: true, leap: true,
      desc: 'Ignore la glu et fait des bonds par-dessus vos défenses.',
    },
    hackeuse: {
      name: 'La Hackeuse', hp: 75, speed: 56, reward: 15, loot: 1, size: 1, emp: true,
      desc: 'Coupe le courant des défenses proches pendant quelques secondes.',
    },
    faussaire: {
      name: 'Le Faux Touriste', hp: 85, speed: 58, reward: 14, loot: 1, size: 1, disguise: true,
      desc: 'Déguisé en touriste : impossible à viser tant qu’une caméra ne l’a pas démasqué.',
    },
    chevalier: {
      name: 'Le Chevalier', hp: 150, speed: 44, reward: 18, loot: 1, size: 1.12, armor: 10,
      desc: 'Bardé de fer : les petits coups rebondissent sur son armure. Améliorez vos défenses, ou sortez le Laser qui la traverse.',
    },
    illusionniste: {
      name: 'L’Illusionniste', hp: 95, speed: 60, reward: 16, loot: 1, size: 1, mirror: true,
      desc: 'Abracadabra ! Il fait apparaître des reflets de lui-même qui attirent vos tirs. Une Caméra (ou l’alarme) fait éclater les reflets.',
    },
    // Reflet créé par l'Illusionniste : se brise au premier coup, ne vole rien. Absent du fichier des suspects.
    reflet: {
      name: 'Reflet', hp: 1, speed: 60, reward: 0, loot: 0, size: 1, decoy: true,
      desc: 'Un simple reflet dans un miroir.',
    },
    touriste: {
      name: 'Touriste', hp: 1, speed: 54, reward: 0, loot: 0, size: 1, innocent: true,
      desc: 'Innocent ! Il paie 2 pièces en admirant le trésor. Vos défenses ne le visent jamais.',
    },
    gentleman: {
      name: 'Le Gentleman', hp: 2200, speed: 34, reward: 250, loot: 5, size: 1.6, boss: true,
      stunImmune: true, smoke: true, summon: true,
      desc: 'L’organisateur du Grand Concours. Fumigènes, complices… et il ne vole que le meilleur.',
    },
  };
  PT.ENEMY_ORDER = ['voleur', 'pickpocket', 'ombre', 'costaud', 'acrobate', 'faussaire', 'hackeuse', 'chevalier', 'illusionniste', 'touriste', 'gentleman'];

  /* ---------- Pouvoirs ---------- */
  PT.POWERS = {
    buste: {
      name: 'Buste en marbre', unlock: 1, cd: 22, target: true, dmg: 110, radius: 78, stun: 1.2,
      desc: 'Touchez la carte : un buste tombe du plafond sur les voleurs.',
    },
    alarme: {
      name: 'Alarme générale', unlock: 2, cd: 45, freeze: 2.5, reveal: 5,
      desc: 'Fige tous les voleurs et révèle les invisibles quelques secondes.',
    },
    cafe: {
      name: 'Pause café', unlock: 3, cd: 50, dur: 8, boost: 0.6,
      desc: 'Toutes les défenses tirent 60 % plus vite pendant 8 secondes.',
    },
    verrou: {
      name: 'Verrouillage', unlock: 9, cd: 55, dur: 6,
      desc: 'Les portes de sortie se verrouillent 6 secondes : les voleurs chargés restent coincés devant, à portée de vos défenses.',
    },
  };
  PT.POWER_ORDER = ['buste', 'alarme', 'cafe', 'verrou'];

  /* ---------- Atelier : améliorations permanentes payées en étoiles ---------- */
  PT.UPGRADES = [
    { id: 'budget', name: 'Budget municipal', costs: [1, 2, 2], desc: function (r) { return '+' + (30 * r) + ' pièces au début de chaque niveau'; } },
    { id: 'formation', name: 'Formation des gardiens', costs: [1, 2], desc: function (r) { return '+' + (15 * r) + ' % de dégâts pour Gardiens et Bouledogues'; } },
    { id: 'glu', name: 'Glu extra-forte', costs: [1, 2], desc: function (r) { return '+' + (25 * r) + ' % de durée de ralentissement'; } },
    { id: 'optique', name: 'Optique HD', costs: [1, 2], desc: function (r) { return '+' + (12 * r) + ' % de portée pour Caméras, Filets, Lasers et Canons'; } },
    { id: 'assurance', name: 'Assurance tous risques', costs: [1, 2], desc: function (r) { return '+' + (3 * r) + ' objets dans la collection'; } },
    { id: 'recup', name: 'Brocante', costs: [1, 1], desc: function (r) { return 'Revente des défenses à ' + (60 + 15 * r) + ' %'; } },
    { id: 'recharge', name: 'Recharge express', costs: [1, 2], desc: function (r) { return '-' + (15 * r) + ' % de temps de recharge des pouvoirs'; } },
  ];

  // Traduit les rangs achetés en modificateurs utilisés par le moteur.
  PT.computeMods = function (upgrades) {
    var u = upgrades || {};
    var r = function (id) { return u[id] || 0; };
    return {
      startCoins: 30 * r('budget'),
      guardDmg: 1 + 0.15 * r('formation'),
      slowDur: 1 + 0.25 * r('glu'),
      techRange: 1 + 0.12 * r('optique'),
      lives: 3 * r('assurance'),
      sell: 0.6 + 0.15 * r('recup'),
      powerCd: 1 - 0.15 * r('recharge'),
    };
  };
})(globalThis.PT = globalThis.PT || {});
