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
      name: 'Caméra', unlock: 2, cost: 40, color: '#4fb6e8', support: true, electric: true,
      desc: 'Repère les voleurs invisibles et démasque les faux touristes. Les voleurs filmés prennent +35 % de dégâts de toutes les défenses.',
      levels: [
        { range: 180, mark: 0.35 },
        { range: 205, mark: 0.45, cost: 50 },
        { range: 235, mark: 0.6, cost: 90 },
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
      name: 'Laser', unlock: 4, cost: 150, color: '#ff3d5a', beam: true, electric: true,
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
    ventilo: {
      name: 'Ventilateur', unlock: 12, cost: 110, color: '#5fb8c9', electric: true, gust: true,
      desc: 'Une rafale qui repousse les voleurs en arrière sur le tapis. Les Costauds, les Déménageurs et les boss tiennent bon.',
      levels: [
        { dmg: 6, rate: 0.5, range: 130, push: 70, splash: 60 },
        { dmg: 10, rate: 0.55, range: 140, push: 90, splash: 66, cost: 95 },
        { dmg: 16, rate: 0.6, range: 150, push: 115, splash: 72, cost: 160 },
      ],
    },
    arroseur: {
      name: 'Arroseur', unlock: 16, cost: 90, color: '#3f7fd9', aura: true,
      desc: 'Arrose les voleurs proches : trempés, ils glissent et ralentissent. Le Laser et le Ventilateur adorent les voleurs mouillés.',
      levels: [
        { range: 115, slow: 0.2, wet: 2.5 },
        { range: 130, slow: 0.28, wet: 3, cost: 70 },
        { range: 145, slow: 0.36, wet: 3.5, cost: 120 },
      ],
    },
    chef: {
      name: 'Chef de la Sécurité', unlock: 21, cost: 160, color: '#d9a440', support: true, commander: true,
      desc: 'Il ne se bat pas, il commande : les défenses à sa portée font plus de dégâts et voient plus loin.',
      levels: [
        { range: 150, buff: 0.2, rangeBuff: 0.08 },
        { range: 165, buff: 0.3, rangeBuff: 0.12, cost: 140 },
        { range: 180, buff: 0.42, rangeBuff: 0.16, cost: 220 },
      ],
    },
  };
  PT.TOWER_ORDER = ['gardien', 'glu', 'camera', 'chien', 'filet', 'laser', 'canon', 'ventilo', 'arroseur', 'chef'];

  /* ---------- Synergies entre défenses (affichées dans l'interface, appliquées par le moteur) ---------- */
  PT.SYNERGIES = [
    { id: 'camera', name: 'Filmé', towers: ['camera'], desc: 'Un voleur filmé par une Caméra prend plus de dégâts de toutes les défenses.' },
    { id: 'patrouille', name: 'Patrouille', towers: ['gardien'], desc: 'Chaque autre Gardien à moins de 170 px donne +10 % de cadence (jusqu’à +30 %).' },
    { id: 'croc', name: 'Croc-en-filet', towers: ['chien', 'filet'], desc: 'Le Bouledogue fait double dégâts aux voleurs pris dans un filet.' },
    { id: 'cible', name: 'Cible facile', towers: ['canon', 'glu'], desc: 'Les boulets font +35 % de dégâts aux voleurs ralentis.' },
    { id: 'courtjus', name: 'Court-jus', towers: ['laser', 'arroseur'], desc: 'Le Laser fait +60 % de dégâts aux voleurs mouillés.' },
    { id: 'glissade', name: 'Glissade', towers: ['ventilo', 'arroseur'], desc: 'Le Ventilateur repousse deux fois plus loin les voleurs mouillés.' },
    { id: 'ordres', name: 'Sous les ordres', towers: ['chef'], desc: 'Le Chef de la Sécurité renforce toutes les défenses à sa portée.' },
  ];

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
      desc: 'Coupe le courant des Caméras et des Lasers proches pendant quelques secondes.',
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
    patineur: {
      name: 'Le Patineur', hp: 34, speed: 128, reward: 7, loot: 1, size: 0.92, slick: true,
      desc: 'Sur ses rollers, il file comme l’éclair… mais la glu et l’eau le ralentissent deux fois plus.',
    },
    taupe: {
      name: 'La Taupe', hp: 95, speed: 54, reward: 15, loot: 1, size: 0.95, burrow: true,
      desc: 'Creuse sous le tapis par moments : sous terre, impossible de la toucher. Visez-la quand elle ressort.',
    },
    soigneuse: {
      name: 'La Soigneuse', hp: 80, speed: 56, reward: 16, loot: 1, size: 1, heal: true,
      desc: 'Elle soigne les voleurs autour d’elle. À attraper en priorité !',
    },
    demenageur: {
      name: 'Le Déménageur', hp: 460, speed: 30, reward: 45, loot: 3, size: 1.45, heavy: true, stunImmune: true, armor: 6,
      desc: 'Une armoire à glace qui repart avec trois objets d’un coup. Lent, mais il faut tout lui envoyer.',
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
  PT.ENEMY_ORDER = ['voleur', 'pickpocket', 'ombre', 'costaud', 'acrobate', 'faussaire', 'hackeuse', 'chevalier', 'illusionniste',
    'patineur', 'taupe', 'soigneuse', 'demenageur', 'touriste', 'gentleman'];

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

  /* ---------- Atelier : arbre de talents payé en étoiles ----------
     Trois branches. Dans une branche, un talent s'ouvre dès que le précédent a au moins un rang. */
  PT.BRANCHES = [
    { id: 'def', name: 'Défenses', color: '#3d6fd6' },
    { id: 'pow', name: 'Pouvoirs', color: '#d8402f' },
    { id: 'eco', name: 'Économie', color: '#c9952e' },
  ];
  PT.UPGRADES = [
    { id: 'formation', branch: 'def', name: 'Formation des gardiens', costs: [1, 2, 3], desc: function (r) { return '+' + (15 * r) + ' % de dégâts pour Gardiens et Bouledogues'; } },
    { id: 'optique', branch: 'def', name: 'Optique HD', costs: [2, 2, 3], desc: function (r) { return '+' + (10 * r) + ' % de portée pour Caméras, Filets, Lasers, Canons et Ventilateurs'; } },
    { id: 'glu', branch: 'def', name: 'Glu extra-forte', costs: [2, 3], desc: function (r) { return '+' + (25 * r) + ' % de durée de ralentissement et de mouillage'; } },
    { id: 'perfo', branch: 'def', name: 'Munitions perforantes', costs: [4], desc: function () { return 'Les armures n’arrêtent plus que la moitié des coups'; } },
    { id: 'atelier', branch: 'def', name: 'Atelier de réparation', costs: [3, 4], desc: function (r) { return 'Améliorations des défenses ' + (12 * r) + ' % moins chères'; } },
    { id: 'synergie', branch: 'def', name: 'Esprit d’équipe', costs: [6], desc: function () { return 'Les bonus de synergie sont 50 % plus forts'; } },

    { id: 'recharge', branch: 'pow', name: 'Recharge express', costs: [1, 2, 3], desc: function (r) { return '-' + (10 * r) + ' % de temps de recharge des pouvoirs'; } },
    { id: 'granit', branch: 'pow', name: 'Buste en granit', costs: [2, 3], desc: function (r) { return 'Buste : +' + (40 * r) + ' % de dégâts et +' + (15 * r) + ' % de zone'; } },
    { id: 'sirene', branch: 'pow', name: 'Sirène longue durée', costs: [2, 3], desc: function (r) { return 'Alarme : +' + r + ' s de gel'; } },
    { id: 'expresso', branch: 'pow', name: 'Double expresso', costs: [3, 4], desc: function (r) { return 'Pause café : +' + (3 * r) + ' s'; } },
    { id: 'doublebuste', branch: 'pow', name: 'Collection de bustes', costs: [6], desc: function () { return 'Le buste tombe en double, côte à côte'; } },

    { id: 'budget', branch: 'eco', name: 'Budget municipal', costs: [1, 2, 2], desc: function (r) { return '+' + (30 * r) + ' pièces au début de chaque salle'; } },
    { id: 'assurance', branch: 'eco', name: 'Assurance tous risques', costs: [1, 2, 3], desc: function (r) { return '+' + (2 * r) + ' objets dans la collection'; } },
    { id: 'recup', branch: 'eco', name: 'Brocante', costs: [1, 2], desc: function (r) { return 'Revente des défenses à ' + (60 + 15 * r) + ' %'; } },
    { id: 'prime', branch: 'eco', name: 'Prime de capture', costs: [3, 4], desc: function (r) { return '+' + (10 * r) + ' % de pièces par voleur attrapé'; } },
    { id: 'anticipe', branch: 'eco', name: 'Zèle', costs: [3], desc: function () { return 'Bonus doublé quand vous appelez une vague en avance'; } },
    { id: 'interets', branch: 'eco', name: 'Placement prudent', costs: [5], desc: function () { return 'À chaque vague, +4 % de vos pièces en intérêts (30 au plus)'; } },
  ];

  // Un talent est accessible si le talent précédent de sa branche a au moins un rang.
  PT.upgradeOpen = function (id, upgrades) {
    var u = PT.UPGRADES.filter(function (x) { return x.id === id; })[0];
    if (!u) return false;
    var same = PT.UPGRADES.filter(function (x) { return x.branch === u.branch; });
    var i = same.indexOf(u);
    return i === 0 || (upgrades[same[i - 1].id] || 0) > 0;
  };

  // Traduit les rangs achetés en modificateurs utilisés par le moteur.
  PT.computeMods = function (upgrades) {
    var u = upgrades || {};
    var r = function (id) { return u[id] || 0; };
    return {
      startCoins: 30 * r('budget'),
      guardDmg: 1 + 0.15 * r('formation'),
      slowDur: 1 + 0.25 * r('glu'),
      techRange: 1 + 0.1 * r('optique'),
      lives: 2 * r('assurance'),
      sell: 0.6 + 0.15 * r('recup'),
      powerCd: 1 - 0.1 * r('recharge'),
      armorPierce: r('perfo') ? 0.5 : 0,
      upgradeCost: 1 - 0.12 * r('atelier'),
      synergy: r('synergie') ? 1.5 : 1,
      bustDmg: 1 + 0.4 * r('granit'),
      bustRadius: 1 + 0.15 * r('granit'),
      bustDouble: r('doublebuste') > 0,
      alarmPlus: r('sirene'),
      cafePlus: 3 * r('expresso'),
      reward: 1 + 0.1 * r('prime'),
      earlyMul: r('anticipe') ? 2 : 1,
      interest: r('interets') ? 0.04 : 0,
    };
  };
})(globalThis.PT = globalThis.PT || {});
