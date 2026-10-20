/* Pas Touche ! — salles 11 à 50.
   Chaque salle est construite à partir d'un plan (chemins), d'un thème et d'un barème de difficulté.
   Les socles, le décor et les vagues sont placés automatiquement, de façon déterministe :
   la même salle sort toujours à l'identique. La résistance des voleurs (hpMul) a été réglée
   en faisant jouer toute la campagne par le bot de tools/campagne.js. */
(function (PT) {
  'use strict';

  var WD = PT.WORLD, W = WD.W, H = WD.H, WALL = WD.WALL;
  var rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---------- Plans de salle ----------
     Premier point hors de la salle (porte à gauche/droite, verrière en haut, égouts en bas), dernier point sur le trésor. */
  var PLANS = {
    serpent: [[[-60, 190], [1060, 190], [1060, 410], [220, 410], [220, 620], [1150, 620]]],
    spirale: [[[-60, 180], [1160, 180], [1160, 620], [160, 620], [160, 390], [880, 390]]],
    zigzag: [[[-60, 420], [210, 420], [210, 190], [470, 190], [470, 620], [730, 620], [730, 190], [990, 190], [990, 450], [1150, 450]]],
    escalier: [[[-60, 190], [330, 190], [330, 350], [640, 350], [640, 510], [950, 510], [950, 640], [1160, 640]]],
    boucle: [[[-60, 620], [260, 620], [260, 200], [1020, 200], [1020, 560], [640, 560]]],
    grandtour: [[[-60, 180], [1170, 180], [1170, 400], [130, 400], [130, 630], [940, 630]]],
    face: [[[-60, 250], [420, 250], [420, 470], [640, 470]], [[1340, 620], [860, 620], [860, 470], [640, 470]]],
    fourche: [[[-60, 410], [300, 410], [300, 190], [760, 190], [760, 410], [1090, 410]], [[-60, 410], [300, 410], [300, 630], [760, 630], [760, 410], [1090, 410]]],
    verriere: [[[-60, 560], [330, 560], [330, 250], [700, 250], [700, 520], [1100, 520]], [[960, -60], [960, 170], [1180, 170], [1180, 520], [1100, 520]]],
    double: [[[-60, 200], [540, 200], [540, 400], [800, 400]], [[-60, 600], [1100, 600], [1100, 400], [800, 400]]],
    trois: [[[-60, 220], [480, 220], [480, 430], [740, 430]], [[1340, 220], [1000, 220], [1000, 430], [740, 430]], [[300, 780], [300, 640], [740, 640], [740, 430]]],
    toit: [[[-60, 620], [420, 620], [420, 380], [760, 380]], [[760, -60], [760, 150], [1120, 150], [1120, 380], [760, 380]]],
  };
  // Symétries : gauche-droite toujours possible ; haut-bas seulement sans verrière
  function transform(paths, mx, my) {
    return paths.map(function (p) {
      return p.map(function (pt) { return [mx ? W - pt[0] : pt[0], my ? (WALL + H) - pt[1] : pt[1]]; });
    });
  }
  function hasSkylight(paths) { return paths.some(function (p) { return p[0][1] < 0; }); }

  /* ---------- Géométrie ---------- */
  function segDist(px, py, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    var t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l2));
    return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
  }
  function pathDist(paths, x, y) {
    var m = Infinity;
    paths.forEach(function (p) { for (var i = 0; i < p.length - 1; i++) m = Math.min(m, segDist(x, y, p[i], p[i + 1])); });
    return m;
  }
  // Longueur de tapis à portée d'un point : plus elle est grande, meilleur est le socle
  function coverage(paths, x, y, r) {
    var c = 0;
    paths.forEach(function (p) {
      for (var i = 0; i < p.length - 1; i++) {
        var a = p[i], b = p[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (var d = 0; d < len; d += 12) {
          var qx = a[0] + (b[0] - a[0]) * d / len, qy = a[1] + (b[1] - a[1]) * d / len;
          if (qy < WALL || qx < 0 || qx > W || qy > H) continue;
          if ((qx - x) * (qx - x) + (qy - y) * (qy - y) <= r * r) c += 12;
        }
      }
    });
    return c;
  }

  // Socles : à 72 px du tapis, là où ils couvrent le plus de chemin, assez espacés
  function makeSpots(paths, count) {
    var cands = [], tr = paths[0][paths[0].length - 1];
    paths.forEach(function (p) {
      for (var i = 0; i < p.length - 1; i++) {
        var a = p[i], b = p[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        var ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
        for (var d = 30; d < len - 10; d += 26) {
          [-1, 1].forEach(function (sd) {
            cands.push([a[0] + ux * d - uy * 72 * sd, a[1] + uy * d + ux * 72 * sd]);
          });
        }
        if (i > 0) {
          // coin extérieur du virage
          var pa = p[i - 1], vx = (pa[0] - a[0]), vy = (pa[1] - a[1]), vl = Math.hypot(vx, vy);
          var bx = -(vx / vl + ux), by = -(vy / vl + uy), bl = Math.hypot(bx, by) || 1;
          cands.push([a[0] + bx / bl * 80, a[1] + by / bl * 80]);
          cands.push([a[0] - bx / bl * 80, a[1] - by / bl * 80]);
        }
      }
    });
    var scored = [];
    cands.forEach(function (c) {
      var x = Math.round(c[0]), y = Math.round(c[1]);
      if (x < 60 || x > W - 60 || y < 150 || y > H - 28) return;
      if (pathDist(paths, x, y) < 68) return;
      if (Math.hypot(x - tr[0], y - tr[1]) < 100) return;
      scored.push({ x: x, y: y, s: coverage(paths, x, y, 150) + coverage(paths, x, y, 100) * 0.6 });
    });
    scored.sort(function (a, b) { return b.s - a.s; });
    var out = [];
    for (var i = 0; i < scored.length && out.length < count; i++) {
      var c = scored[i];
      if (out.every(function (o) { return Math.hypot(o[0] - c.x, o[1] - c.y) >= 96; })) out.push([c.x, c.y]);
    }
    return out;
  }

  // Décor : dans les espaces libres, loin du tapis, des socles et du trésor
  function makeDeco(paths, spots, list, r, n, lamps) {
    var tr = paths[0][paths[0].length - 1], out = [], i;
    function free(x, y, minPath) {
      if (pathDist(paths, x, y) < minPath) return false;
      if (Math.hypot(x - tr[0], y - tr[1]) < 110) return false;
      for (i = 0; i < spots.length; i++) if (Math.hypot(spots[i][0] - x, spots[i][1] - y) < 74) return false;
      for (i = 0; i < out.length; i++) if (Math.hypot(out[i].x - x, out[i].y - y) < 96) return false;
      return true;
    }
    // Lampes de secours (variante panne) : près du tapis, bien réparties
    if (lamps) {
      var tries = 0;
      while (out.length < lamps && tries++ < 4000) {
        var lx = 80 + r() * (W - 160), ly = 150 + r() * (H - 200);
        var pd = pathDist(paths, lx, ly);
        if (pd < 62 || pd > 120 || !free(lx, ly, 62)) continue;
        if (out.some(function (o) { return Math.hypot(o.x - lx, o.y - ly) < 300; })) continue;
        out.push({ t: 'lampe', x: Math.round(lx), y: Math.round(ly) });
      }
    }
    var cells = [];
    for (var y = 140; y < H - 20; y += 30) for (var x = 40; x < W - 30; x += 30) cells.push([x + (r() - 0.5) * 20, y + (r() - 0.5) * 16]);
    for (var k = cells.length - 1; k > 0; k--) { var j = (r() * (k + 1)) | 0, tmp = cells[k]; cells[k] = cells[j]; cells[j] = tmp; }
    var want = out.length + n;
    for (k = 0; k < cells.length && out.length < want; k++) {
      var cx = cells[k][0], cy = cells[k][1];
      if (!free(cx, cy, 78)) continue;
      out.push({ t: list[(out.length * 7 + (r() * list.length | 0)) % list.length], x: Math.round(cx), y: Math.round(cy) });
    }
    return out;
  }

  /* ---------- Thèmes ---------- */
  var THEMES = {
    parquetRouge: { floor: 'parquet', floorA: '#c98d55', floorB: '#b97c47', wall: '#7d3b3b', wallDark: '#4e2326', trim: '#e8b84a', carpet: '#b8283a' },
    parquetVert: { floor: 'parquet', floorA: '#c49a62', floorB: '#b48852', wall: '#2f5a46', wallDark: '#1a3328', trim: '#e8b84a', carpet: '#8f1d2c' },
    chocolat: { floor: 'parquet', floorA: '#8a5a3a', floorB: '#7a4d30', wall: '#5a2e1e', wallDark: '#2e160d', trim: '#f2c14e', carpet: '#d9a35a' },
    jouets: { floor: 'gallery', floorA: '#e8c890', floorB: '#dcbc84', wall: '#3fa7a0', wallDark: '#1f5a56', trim: '#f5c518', carpet: '#e2405e' },
    galerieNuit: { floor: 'gallery', floorA: '#5b6378', floorB: '#525a6e', wall: '#262b45', wallDark: '#14172a', trim: '#f04f8a', carpet: '#3a3550', night: true },
    cinema: { floor: 'gallery', floorA: '#4a3f52', floorB: '#42384a', wall: '#7a1f2b', wallDark: '#3a0d14', trim: '#f5c518', carpet: '#b8283a', night: true },
    royal: { floor: 'royal', floorA: '#7a4048', floorB: '#6e3940', wall: '#2c1a4a', wallDark: '#170c2b', trim: '#f2c14e', carpet: '#1f3f8f' },
    versailles: { floor: 'versailles', floorA: '#c98f52', floorB: '#b77f45', wall: '#b89a5e', wallDark: '#3e2f1c', trim: '#f2c14e', carpet: '#2c4a9a' },
    musique: { floor: 'versailles', floorA: '#b98048', floorB: '#a8713e', wall: '#3b1f5a', wallDark: '#1d0f2e', trim: '#f2c14e', carpet: '#8f1d2c' },
    marine: { floor: 'pont', floorA: '#9c7b55', floorB: '#8f6f4b', wall: '#2a4d72', wallDark: '#14273d', trim: '#e3c06a', carpet: '#1d5f8a' },
    egypte: { floor: 'stone', floorA: '#e2c48a', floorB: '#d3b273', wall: '#a8742f', wallDark: '#5e3f1a', trim: '#3fa7a0', carpet: '#2f6f8f' },
    antique: { floor: 'stone', floorA: '#e6dcc4', floorB: '#d8cbb0', wall: '#c9b28a', wallDark: '#6a5a3a', trim: '#3d6fa8', carpet: '#2f4f9a' },
    marbre: { floor: 'marble', floorA: '#e9e4d6', floorB: '#cfc8b4', wall: '#3f6b4a', wallDark: '#223d2a', trim: '#e0a33a', carpet: '#7c3a8f' },
    ocean: { floor: 'marble', floorA: '#a9cfd8', floorB: '#98c2cc', wall: '#1d5f8a', wallDark: '#0e2f45', trim: '#f2c14e', carpet: '#2f4f9a' },
    chateau: { floor: 'dalles', floorA: '#a3a7ad', floorB: '#92979e', wall: '#3d4f6b', wallDark: '#1f2a3b', trim: '#d9a440', carpet: '#8f1d2c' },
    mines: { floor: 'beton', floorA: '#7c7166', floorB: '#71665b', wall: '#4a3a2e', wallDark: '#231a12', trim: '#e8b923', carpet: '#8f1d2c', night: true },
    sciences: { floor: 'acier', floorA: '#b9c2cc', floorB: '#adb6c0', wall: '#2f6f5a', wallDark: '#173a2f', trim: '#f5c518', carpet: '#2b5fb3' },
    espace: { floor: 'acier', floorA: '#5a6a8a', floorB: '#4f5e7c', wall: '#1d2240', wallDark: '#0d1022', trim: '#9fe7ff', carpet: '#3a2a7a' },
    coffre: { floor: 'acier', floorA: '#6f7a86', floorB: '#66717d', wall: '#2f3b4a', wallDark: '#161e28', trim: '#d4a72c', carpet: '#8f1d2c' },
  };
  var DECOS = {
    galerie: ['plante', 'banc', 'statue', 'colonne', 'vitrine', 'oranger', 'sculpture', 'candelabre', 'plante', 'mobile'],
    antique: ['colonne', 'statue', 'obelisque', 'sarcophage', 'vitrine', 'brasero', 'armure', 'fossile', 'colonne'],
    marine: ['ancre', 'gouvernail', 'maquette', 'caisses', 'sacs', 'plante', 'banc'],
    reserve: ['caisses', 'bache', 'sacs', 'caisses', 'vitrine', 'statue'],
    coffre: ['coffret', 'sacs', 'caisses', 'trophee', 'colonne', 'vitrine'],
    chateau: ['armure', 'brasero', 'candelabre', 'colonne', 'armure', 'trophee'],
  };

  /* ---------- Les 40 salles ---------- */
  // [nom, trésor, objet, thème, décor, plan, type ('casse'), variante]
  var ROOMS = [
    ['Galerie des Impressionnistes', 'Les Nénuphars Mouillés', 'tableau', 'parquetVert', 'galerie', 'serpent'],
    ['Salle des Globes', 'Le Globe de Mercator', 'globe', 'marbre', 'antique', 'escalier'],
    ['Musée des Jouets', 'Le Trophée du Meilleur Jouet', 'trophee', 'jouets', 'galerie', 'boucle', '', 'visiteurs'],
    ['Galerie des Minéraux', 'Le Diamant Bleu Pâle', 'diamant', 'mines', 'reserve', 'zigzag'],
    ['L’Hôtel des Ventes', 'Le Vase de Soissons (recollé)', 'vase', 'royal', 'galerie', 'face', 'casse'],
    ['Musée du Chocolat', 'La Poule en Chocolat Noir', 'poule', 'chocolat', 'galerie', 'grandtour'],
    ['Salle de la Marine Royale', 'Le Trésor de l’Amiral Pinson', 'coffre', 'marine', 'marine', 'fourche'],
    ['Les Catacombes', 'Le Masque du Fantôme', 'masque', 'mines', 'reserve', 'spirale', '', 'panne'],
    ['Musée de l’Espace', 'La Fusée Lune-Express', 'fusee', 'espace', 'coffre', 'verriere'],
    ['Le Palais Doré', 'La Tiare de l’Impératrice', 'couronne', 'versailles', 'galerie', 'trois', 'casse'],

    ['Pavillon Japonais', 'Le Vase aux Mille Grues', 'vase', 'parquetRouge', 'galerie', 'escalier'],
    ['Musée du Cinéma', 'La Statuette Dorée', 'trophee', 'cinema', 'galerie', 'double'],
    ['Musée Océanographique', 'La Perle Géante', 'diamant', 'ocean', 'marine', 'serpent'],
    ['Salle des Pharaons', 'Le Masque d’Akhénatonton', 'masque', 'egypte', 'antique', 'toit'],
    ['Le Musée de Cire', 'La Joconde en Cire', 'joconde', 'royal', 'galerie', 'fourche', 'casse'],
    ['Le Jardin d’Hiver', 'L’Œuf de Pâques Impérial', 'oeuf', 'parquetVert', 'galerie', 'boucle'],
    ['Musée de la Musique', 'Le Diapason d’Or', 'trophee', 'musique', 'galerie', 'zigzag'],
    ['Musée des Sciences', 'Le Premier Satellite', 'fusee', 'sciences', 'coffre', 'face', '', 'visiteurs'],
    ['Galerie des Rois', 'La Couronne de Pépin le Bref', 'couronne', 'royal', 'chateau', 'spirale'],
    ['Le Coffre de la Monnaie', 'Les Lingots de la Monnaie', 'lingots', 'coffre', 'coffre', 'trois', 'casse'],

    ['Atelier de Restauration', 'Le Tableau Pas Fini', 'tableau', 'parquetRouge', 'galerie', 'grandtour'],
    ['Salle des Géants', 'L’Œuf de T-Rex', 'oeuf', 'marbre', 'antique', 'verriere'],
    ['Réserve des Momies', 'Le Masque Maudit', 'masque', 'mines', 'reserve', 'double', '', 'panne'],
    ['Musée de l’Aviation', 'La Fusée de Papier', 'fusee', 'sciences', 'coffre', 'serpent'],
    ['La Chambre des Bijoux', 'Le Diamant du Régent Distrait', 'diamant', 'royal', 'chateau', 'toit', 'casse'],
    ['Musée du Fromage', 'La Meule d’Or', 'trophee', 'chocolat', 'galerie', 'escalier'],
    ['Salle des Miroirs', 'La Perruque de la Reine', 'perruque', 'versailles', 'galerie', 'fourche'],
    ['Musée d’Art Moderne', 'Le Rond Presque Rouge', 'tableau', 'galerieNuit', 'galerie', 'zigzag', '', 'visiteurs'],
    ['L’Arsenal', 'L’Épée du Mousquetaire', 'epee', 'chateau', 'chateau', 'spirale'],
    ['Le Musée National', 'La Joconde (la vraie de vraie)', 'joconde', 'royal', 'galerie', 'trois', 'casse'],

    ['Musée des Arts Forains', 'Le Cheval de Bois Doré', 'trophee', 'jouets', 'galerie', 'boucle'],
    ['Salle des Cartes', 'La Mappemonde du Capitaine', 'globe', 'marine', 'marine', 'double'],
    ['Les Égouts du Musée', 'Le Coffre Perdu', 'coffre', 'mines', 'reserve', 'serpent', '', 'panne'],
    ['Temple d’Angkor-sur-Loire', 'L’Amphore de Marseille', 'vase', 'antique', 'antique', 'face'],
    ['Le Musée Ferroviaire', 'L’Or du Train Postal', 'lingots', 'coffre', 'coffre', 'verriere', 'casse'],
    ['Musée de la Poule', 'La Poule aux Œufs de Platine', 'poule', 'parquetRouge', 'galerie', 'grandtour'],
    ['Le Grand Louvre-sur-Mer', 'Le Radeau de la Méduse en Pédalo', 'tableau', 'galerieNuit', 'galerie', 'fourche', '', 'visiteurs'],
    ['L’Observatoire', 'La Lunette de Galilée', 'globe', 'espace', 'coffre', 'zigzag'],
    ['Le Trésor des Rois', 'La Couronne des Couronnes', 'couronne', 'royal', 'chateau', 'toit'],
    ['Le Coffre du Gentleman', 'Le Cœur du Musée', 'diamant', 'coffre', 'coffre', 'trois', 'casse'],
  ];

  /* ---------- Voleurs et barème ---------- */
  var INTRO = { voleur: 1, pickpocket: 1, ombre: 2, costaud: 3, acrobate: 3, faussaire: 4, hackeuse: 4, chevalier: 6, illusionniste: 8, patineur: 11, taupe: 14, soigneuse: 19, demenageur: 24 };
  var THREAT = { voleur: 1, pickpocket: 0.75, ombre: 1.5, costaud: 4.5, acrobate: 1.5, faussaire: 1.7, hackeuse: 1.8, chevalier: 3.4, illusionniste: 2.3, patineur: 1, taupe: 2.2, soigneuse: 3, demenageur: 12 };
  var GAP = { voleur: 0.85, pickpocket: 0.5, ombre: 0.75, costaud: 1.6, acrobate: 0.75, faussaire: 0.9, hackeuse: 1.3, chevalier: 1.15, illusionniste: 1.2, patineur: 0.45, taupe: 1, soigneuse: 1.7, demenageur: 3.2 };
  // Les salles « respiration » sont plus faciles, pour souffler entre deux gros morceaux.
  var BREATHER = { 16: 1, 21: 1, 26: 1, 31: 1, 36: 1, 41: 1, 46: 1 };
  // Résistance des voleurs, réglée salle par salle par le bot de campagne (tools/campagne.js).
  var HPMUL = {
    11: 5.54, 12: 3.84, 13: 5.61, 14: 5.65, 15: 3.84, 16: 4.63, 17: 5.76, 18: 4.07, 19: 2.38, 20: 3.73,
    21: 3.47, 22: 3.91, 23: 3.99, 24: 2.46, 25: 5.71, 26: 4.44, 27: 4.97, 28: 4.18, 29: 6.23, 30: 4.13,
    31: 5.13, 32: 1.95, 33: 3.62, 34: 6.43, 35: 4.4, 36: 5.5, 37: 6.56, 38: 6.6, 39: 4.68, 40: 4.5,
    41: 5.23, 42: 6.5, 43: 6.82, 44: 4.97, 45: 2.3, 46: 5.34, 47: 7, 48: 6.02, 49: 3.91, 50: 5.36,
  };
  // Coefficient par aile, réglé sur la campagne complète du joueur moyen (tools/campagne.js) :
  // chaque aile doit être un peu plus exigeante que la précédente.
  var WING_MUL = [1, 1, 1.06, 1.16, 1.13];
  PT.HPMUL = HPMUL;

  var CREW_NAMES = {
    voleur: ['Les Marinières', 'Le Gang des Bonnets', 'Les Monte-en-l’air Associés'],
    pickpocket: ['Les Mille Mains', 'Les Doigts de Fée', 'La Bande à Filou'],
    ombre: ['Le Réseau Fantôme', 'Les Ombres Chinoises', 'Les Silencieux'],
    costaud: ['Les Frères Pinces', 'Les Gros Bras', 'La Division Lourde'],
    acrobate: ['Le Cirque Volant', 'Les Trapézistes', 'La Troupe Élastique'],
    faussaire: ['Opération Touristes', 'Le Club Bermuda', 'Les Faux Visiteurs'],
    hackeuse: ['Les Courts-Circuits', 'Le Club des Câbles', 'Panne Organisée'],
    chevalier: ['La Table Pas Ronde', 'Les Boîtes de Conserve', 'L’Ordre du Coffre'],
    illusionniste: ['Les Prestidigitateurs', 'Le Cabinet des Illusions', 'Abracadabra & Cie'],
    patineur: ['Les Roulettes Russes', 'Le Roller Derby', 'Les Glisseurs'],
    taupe: ['Les Terrassiers', 'Le Tunnel du Siècle', 'Les Taupes Modèles'],
    soigneuse: ['La Croix Rouge-Gorge', 'Les Infirmières de Garde', 'Le Service des Urgences'],
    demenageur: ['Déménagements Express', 'Les Armoires à Glace', 'Transports Pas Discrets'],
  };
  var PLAN_TIPS = {
    voleur: 'Du classique, mais en nombre.',
    pickpocket: 'Ils misent sur la vitesse : ralentissez-les vite.',
    ombre: 'Invisibles sans caméra !',
    costaud: 'Ils encaissent tout et repartent avec deux objets chacun.',
    acrobate: 'La glu ne les arrête pas et ils sautent par-dessus vos défenses.',
    faussaire: 'Démasquez-les avec une Caméra.',
    hackeuse: 'Elles coupent les Caméras et les Lasers.',
    chevalier: 'Les petits coups rebondissent sur leur armure.',
    illusionniste: 'Leurs reflets vont gaspiller vos tirs.',
    patineur: 'Ultra rapides, mais la glu et l’eau les font déraper.',
    taupe: 'Elles creusent sous le tapis : visez-les quand elles ressortent.',
    soigneuse: 'Elles soignent leurs complices : attrapez-les d’abord.',
    demenageur: 'Trois objets chacun : il ne faut pas les laisser sortir.',
  };
  var NAMES = {
    voleur: 'Monte-en-l’air', pickpocket: 'Pickpockets', ombre: 'Ombres', costaud: 'Costauds', acrobate: 'Acrobates', faussaire: 'Faux Touristes',
    hackeuse: 'Hackeuses', chevalier: 'Chevaliers', illusionniste: 'Illusionnistes', patineur: 'Patineurs', taupe: 'Taupes', soigneuse: 'Soigneuses', demenageur: 'Déménageurs',
  };
  var TAUNTS = {
    voleur: 'Mes Monte-en-l’air connaissent ce musée par cœur.',
    pickpocket: 'Vous avez vu passer quelque chose ? Mes pickpockets, peut-être.',
    ombre: 'Vous ne verrez même pas mes Ombres arriver.',
    costaud: 'Mes Costauds ont fait de la musculation tout l’hiver.',
    acrobate: 'Hop là ! Mes Acrobates adorent vos plafonds.',
    faussaire: 'Que de touristes ce soir… Êtes-vous sûr qu’ils sont tous vrais ?',
    hackeuse: 'Vos caméras ? Clic. Plus de caméras.',
    chevalier: 'Mes Chevaliers ont poli leur armure rien que pour vous.',
    illusionniste: 'Un voleur, deux voleurs, trois voleurs… lequel est le vrai ?',
    patineur: 'Mes Patineurs ont huilé leurs roulettes. Bonne chance !',
    taupe: 'Regardez bien sous vos pieds, gardien.',
    soigneuse: 'Mes Soigneuses remettent mes hommes sur pied en un clin d’œil.',
    demenageur: 'J’ai réservé un camion. Un très, très grand camion.',
  };

  // Mélange déterministe
  function pick(r, list) { return list[(r() * list.length) | 0]; }

  function buildWaves(n, r, room, nPaths, intro) {
    var casse = room[6] === 'casse', variant = room[7] || null;
    var pool = Object.keys(INTRO).filter(function (t) { return INTRO[t] <= n; });
    // Les petits voleurs servent de remplissage ; le Déménageur reste une menace rare
    var recent = pool.filter(function (t) { return INTRO[t] >= n - 8 && t !== 'demenageur'; });
    var star = pool.filter(function (t) { return t !== 'demenageur' && (n < 20 || (t !== 'voleur' && t !== 'pickpocket')); });
    var featured = [];
    if (intro) featured.push(intro);
    while (featured.length < 3) {
      var cand = r() < 0.55 && recent.length ? pick(r, recent) : pick(r, star);
      if (featured.indexOf(cand) < 0) featured.push(cand);
    }
    if (variant === 'panne' && featured.indexOf('ombre') < 0) featured[2] = 'ombre';
    if (variant === 'visiteurs' && featured.indexOf('faussaire') < 0) featured[2] = 'faussaire';
    var nWaves = casse ? 9 : 8 + Math.floor((n - 11) / 10);
    var base = 10 + n * 0.45;
    var heavyUsed = 0;
    var waves = [];
    for (var w = 0; w < nWaves; w++) {
      var last = w === nWaves - 1;
      var budget = base * (1 + 0.2 * w) * (last ? 1.3 : 1) * (intro && w < 2 ? 0.8 : 1);
      var types;
      if (intro && w < 2) types = w === 0 ? [intro] : [intro, 'voleur'];
      else {
        var k = 1 + (r() < 0.6 ? 1 : 0) + (w >= nWaves / 2 && r() < 0.5 ? 1 : 0);
        types = [];
        while (types.length < k) {
          var t = r() < 0.65 ? pick(r, featured) : pick(r, pool);
          if (t === 'demenageur' && (w < 2 || heavyUsed >= 2 || r() < 0.6)) t = pick(r, star);
          if (t === 'demenageur') heavyUsed++;
          if (types.indexOf(t) < 0) types.push(t);
        }
      }
      var groups = [], at = 0, share = budget / types.length;
      types.forEach(function (t, gi) {
        // pas de vague géante trop tôt : le plafond monte avec le numéro de vague
        var cnt = Math.max(2, Math.min(40, 12 + 4 * w, Math.round(share / THREAT[t])));
        if (t === 'demenageur') cnt = Math.min(cnt, 1 + Math.floor((n - 22) / 10));
        var gap = +(GAP[t] * Math.max(0.6, 1.05 - n / 110)).toFixed(2);
        var g = { t: t, n: cnt, gap: gap };
        if (at) g.at = +at.toFixed(1);
        if (nPaths > 1) g.p = casse ? (gi + w) % nPaths : 'alt';
        if (!intro || w >= 2) { if (w >= nWaves / 2 && r() < 0.3 && THREAT[t] <= 1.5) g.hp = 1.5; }
        groups.push(g);
        at += Math.min(8, cnt * gap * 0.45) + 1;
      });
      if (variant === 'visiteurs') groups.push({ t: 'touriste', n: 6 + Math.floor(w * 0.8), gap: 1, p: nPaths > 1 ? 'alt' : 0 });
      var wave = { groups: groups };
      if (casse) {
        var main = types[0];
        var parts = groups.filter(function (g) { return g.t !== 'touriste'; }).map(function (g) { return g.n + ' ' + NAMES[g.t]; });
        wave.crew = {
          name: pick(r, CREW_NAMES[main]),
          plan: 'Au programme : ' + parts.join(', ') + '. ' + NAMES[main] + ' : ' + PLAN_TIPS[main].charAt(0).toLowerCase() + PLAN_TIPS[main].slice(1) +
            (types[1] && types[1] !== 'touriste' ? ' ' + NAMES[types[1]] + ' : ' + PLAN_TIPS[types[1]].charAt(0).toLowerCase() + PLAN_TIPS[types[1]].slice(1) : ''),
        };
      }
      waves.push(wave);
    }
    if (casse) {
      // Le Gentleman en personne pour clore chaque casse
      var esc = featured.filter(function (t) { return t !== 'demenageur'; }).slice(0, 2);
      var fin = [{ t: 'gentleman', n: 1, gap: 1, at: 3, hp: +(1 + (n - 10) / 30).toFixed(2), p: 0 }];
      esc.forEach(function (t, i) { fin.push({ t: t, n: Math.max(4, Math.round(base * 0.9 / THREAT[t])), gap: GAP[t], at: i * 6, p: nPaths > 1 ? (i + 1) % nPaths : 0 }); });
      if (n === 50) fin.push({ t: 'demenageur', n: 3, gap: 4, at: 10, p: 0 }, { t: 'soigneuse', n: 4, gap: 2, at: 8, p: nPaths > 1 ? 1 : 0 });
      waves.push({
        crew: { name: n === 50 ? 'Le Gentleman, tout ou rien' : 'Le Gentleman en personne', plan: n === 50 ? 'La dernière nuit du Grand Concours. Le Gentleman vient chercher le Cœur du Musée avec toute sa troupe. C’est maintenant ou jamais.' : 'Le maître lui-même, avec sa garde rapprochée. Fumigènes et complices à volonté.' },
        groups: fin,
      });
    }
    return { waves: waves, featured: featured };
  }

  var DOOR_TXT = { 1: 'une porte', 2: 'deux entrées', 3: 'trois entrées' };
  function blurbFor(room, n, nPaths, featured, intro) {
    var bits = [];
    if (room[6] === 'casse') bits.push('NIVEAU CASSE : des équipes de professionnels, chacune avec son plan. Lisez les briefings ! Le Gentleman viendra en personne.');
    else bits.push('Une salle avec ' + DOOR_TXT[nPaths] + '.');
    if (room[7] === 'visiteurs') bits.push('Portes ouvertes : de vrais touristes se mêlent aux Faux Touristes. Une Caméra fera le tri.');
    if (room[7] === 'panne') bits.push('Panne de courant : vos défenses ne voient que sous les lampes de secours ou grâce aux Caméras.');
    if (intro) bits.push('Nouveau suspect : ' + PT.ENEMIES[intro].name + '. ' + PLAN_TIPS[intro]);
    if (BREATHER[n]) bits.push('Une soirée plutôt calme… profitez-en pour tester de nouvelles combinaisons.');
    else if (!intro) bits.push('Attendez-vous surtout à des ' + featured.slice(0, 2).map(function (t) { return NAMES[t]; }).join(' et des ') + '.');
    return bits.join(' ');
  }

  var introAt = {};
  Object.keys(INTRO).forEach(function (t) { if (INTRO[t] > 10) introAt[INTRO[t]] = t; });

  ROOMS.forEach(function (room, i) {
    var n = 11 + i, r = rng(n * 7919 + 77);
    var plan = PLANS[room[5]];
    var my = !hasSkylight(plan) && !plan.some(function (p) { return p[0][1] > H; }) && r() < 0.5;
    var mx = r() < 0.5;
    // Parmi les symétries possibles, on évite le trésor sous l'interface du haut
    // et le tapis derrière les boutons de pouvoir (en bas à gauche).
    var canMy = !hasSkylight(plan) && !plan.some(function (p) { return p[0][1] > H; });
    var best = null;
    [[mx, my], [!mx, my], [mx, canMy ? !my : my], [!mx, canMy ? !my : my]].forEach(function (o) {
      var ps = transform(plan, o[0], o[1]), pen = 0, t0 = ps[0][ps[0].length - 1];
      if (t0[1] < 230 && (t0[0] > 1010 || t0[0] < 300)) pen += 1000;
      if (t0[1] > 540 && t0[0] < 360) pen += 1000;
      ps.forEach(function (p) {
        for (var q = 0; q < p.length - 1; q++) for (var k = 0; k <= 10; k++) {
          var x = p[q][0] + (p[q + 1][0] - p[q][0]) * k / 10, y = p[q][1] + (p[q + 1][1] - p[q][1]) * k / 10;
          if (x >= 0 && x < 440 && y > 610 && y <= H) pen += 1;
        }
      });
      if (!best || pen < best.pen) best = { pen: pen, ps: ps };
    });
    var paths = best.ps;
    var casse = room[6] === 'casse', variant = room[7] || null;
    var theme = {};
    var src = THEMES[room[3]];
    for (var k in src) theme[k] = src[k];
    theme.night = !!src.night || variant === 'panne';
    var spots = makeSpots(paths, casse ? 14 : 12);
    var deco = makeDeco(paths, spots, DECOS[room[4]], r, 7, variant === 'panne' ? 5 : 0);
    var intro = introAt[n] || null;
    var built = buildWaves(n, r, room, paths.length, intro);
    var feat = built.featured;
    var next = ROOMS[i + 1];
    var level = {
      id: n, type: casse ? 'casse' : 'horde',
      name: room[0], subtitle: room[1],
      blurb: blurbFor(room, n, paths.length, feat, intro),
      theme: theme,
      treasure: { kind: room[2], name: room[1] },
      startCoins: 300 + n * 5 + (casse ? 140 : 0) + (paths.length - 1) * 40,
      lives: 20,
      hpMul: +((HPMUL[n] || 3) * WING_MUL[Math.floor((n - 1) / 10)]).toFixed(2),
      paths: paths, spots: spots, deco: deco,
      taunts: [
        { wave: 0, text: n === 50 ? 'Nous y voilà, gardien. La dernière salle. Le Cœur du Musée sera à moi.' : TAUNTS[feat[0]] },
        { wave: Math.floor(built.waves.length / 2), text: TAUNTS[feat[1]] },
        { wave: built.waves.length - 1, text: casse ? 'Assez joué. Je viens le chercher moi-même !' : 'Dernière vague ! Mes meilleurs éléments arrivent.' },
      ],
      outro: next ? 'Vous avez gagné cette manche… Rendez-vous à « ' + next[0] + ' ». Le Grand Concours n’est pas fini !' :
        'Impossible ! Le Gentleman est battu, le Grand Concours est terminé et le musée est sauvé. Bravo, gardien !',
      waves: built.waves,
    };
    if (variant) level.variant = variant;
    PT.LEVELS.push(level);
  });

  PT.LEVEL_PLANS = PLANS;
})(globalThis.PT = globalThis.PT || {});
