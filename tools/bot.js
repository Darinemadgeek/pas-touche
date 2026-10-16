/* Joueur virtuel pour tester le jeu sans affichage.
   Trois profils : 'novice' (place au hasard, réagit lentement), 'moyen' et 'expert'
   (bons emplacements, contre les voleurs spéciaux, utilise les synergies et les pouvoirs).
   Utilisé par tools/campagne.js. */
'use strict';
require('../js/data.js');
require('../js/levels.js');
require('../js/levels-gen.js');
require('../js/game.js');
var PT = globalThis.PT;

var PROFILES = {
  novice: { think: 1.4, topK: 6, powers: 0.35, upgradeBias: 0.25, counters: 0.3, early: false, synergy: false },
  moyen: { think: 0.8, topK: 3, powers: 0.8, upgradeBias: 0.45, counters: 0.8, early: false, synergy: true },
  expert: { think: 0.4, topK: 1, powers: 1, upgradeBias: 0.55, counters: 1, early: true, synergy: true },
};

function coverage(level, x, y, range) {
  var c = 0;
  level.paths.forEach(function (p) {
    var bp = PT.buildPath(p);
    for (var d = 0; d < bp.L; d += 8) { var q = PT.pathPos(bp, d); if (q.y > 84 && Math.hypot(q.x - x, q.y - y) <= range) c += 8; }
  });
  return c;
}

function mulberry(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Joue une salle ; renvoie l'issue et des indicateurs pour repérer les bugs.
// attempt : numéro de l'essai ; comme un vrai joueur, le bot change de placement après un échec
function play(level, upgrades, profileName, seed, attempt) {
  var P = PROFILES[profileName];
  var retry = (attempt || 1) - 1;
  var rnd = mulberry(seed || 1);
  var saveRandom = Math.random;
  Math.random = rnd; // parties reproductibles
  try {
    var g = new PT.Game(level, { upgrades: upgrades });
    var types = {};
    level.waves.forEach(function (w) { w.groups.forEach(function (gr) { types[gr.t] = (types[gr.t] || 0) + gr.n; }); });
    var has = function (k) { return Object.keys(types).some(function (t) { return PT.ENEMIES[t][k]; }); };
    var avail = function (t) { return g.availableTowers.indexOf(t) >= 0; };
    var smart = rnd() < P.counters;
    var needCam = level.variant === 'panne' || has('camo') || has('disguise') || has('mirror');
    var armored = has('armor');
    var maxCams = level.variant === 'panne' ? 3 : 2;
    var cov = {};
    g.spots.forEach(function (s) { cov[s.i] = {}; g.availableTowers.forEach(function (t) { cov[s.i][t] = coverage(level, s.x, s.y, PT.TOWERS[t].levels[0].range); }); });

    var order = ['gardien', 'glu', 'gardien', 'chien', 'filet', 'gardien', 'laser', 'chien', 'canon', 'ventilo', 'laser', 'filet', 'gardien', 'canon', 'laser'];
    if (smart && armored) order = ['gardien', 'laser', 'glu', 'gardien', 'laser', 'canon', 'chien', 'laser', 'filet', 'canon', 'ventilo', 'laser'];
    if (!smart) order = order.slice().sort(function () { return rnd() - 0.5; });
    order = order.filter(avail);
    if (!order.length) order = ['gardien'];
    var learned = retry > 0, livesLog = [];
    var oi = 0, dt = 1 / 30, t = 0, think = 0, stuck = 0, lastLives = g.lives, events = { gust: 0, heal: 0, burrow: 0 };

    function bestSpot(type) {
      var free = g.spots.filter(function (s) { return !s.tower; });
      if (!free.length) return null;
      if (type === 'chef') {
        // le Chef se place là où il renforce le plus de défenses
        var cr = PT.TOWERS.chef.levels[0].range;
        free.sort(function (a, b) {
          var na = g.towers.filter(function (o) { return Math.hypot(o.x - a.x, o.y - a.y) <= cr; }).length;
          var nb = g.towers.filter(function (o) { return Math.hypot(o.x - b.x, o.y - b.y) <= cr; }).length;
          return nb - na;
        });
      } else if (type === 'arroseur' && P.synergy) {
        // l'Arroseur va près des Lasers et des Ventilateurs (synergies)
        free.sort(function (a, b) {
          var sa = cov[a.i][type] + g.towers.filter(function (o) { return (o.type === 'laser' || o.type === 'ventilo') && Math.hypot(o.x - a.x, o.y - a.y) < 160; }).length * 300;
          var sb = cov[b.i][type] + g.towers.filter(function (o) { return (o.type === 'laser' || o.type === 'ventilo') && Math.hypot(o.x - b.x, o.y - b.y) < 160; }).length * 300;
          return sb - sa;
        });
      } else {
        free.sort(function (a, b) { return cov[b.i][type] - cov[a.i][type]; });
      }
      return free[Math.min(free.length - 1, (rnd() * (P.topK + retry)) | 0)];
    }

    g.startNextWave();
    while (g.state !== 'won' && g.state !== 'lost' && t < 2400) {
      g.update(dt); t += dt;
      for (var e = 0; e < g.events.length; e++) if (events[g.events[e].type] != null) events[g.events[e].type]++;
      g.events.length = 0;
      if (!isFinite(g.coins) || !isFinite(g.lives)) throw new Error('valeur invalide (pièces ou vies)');
      think -= dt;
      if (think > 0) continue;
      think = P.think;
      var cams = g.towers.filter(function (x) { return x.type === 'camera'; }).length;
      var free = g.spots.filter(function (s) { return !s.tower; });
      var want = null;
      // Les joueurs attentifs posent des Caméras d'emblée ; les autres après avoir perdu des objets
      if (!learned && g.lives < g.maxLives) learned = true;
      if (needCam && (P.counters >= 0.8 || learned) && cams < maxCams && avail('camera')) want = 'camera';
      else if (P.synergy && avail('arroseur') && g.towers.some(function (o) { return o.type === 'laser'; }) && !g.towers.some(function (o) { return o.type === 'arroseur'; })) want = 'arroseur';
      else if (avail('chef') && g.towers.length >= 6 && !g.towers.some(function (o) { return o.type === 'chef'; })) want = 'chef';
      else want = order[oi % order.length];
      var doUpgrade = !free.length || (g.towers.length >= 4 && rnd() < P.upgradeBias);
      if (!doUpgrade && free.length && want) {
        if (g.coins >= PT.TOWERS[want].cost) {
          var sp = bestSpot(want);
          if (sp && g.build(sp, want) && want === order[oi % order.length]) oi++;
        }
      } else {
        var best = null;
        g.towers.forEach(function (tw) {
          var c = g.upgradeCost(tw);
          if (c == null) return;
          var score = c - (tw.type === 'laser' || tw.type === 'gardien' ? 40 : 0);
          if (!best || score < best.s) best = { tw: tw, c: c, s: score };
        });
        if (best && g.coins >= best.c) g.upgrade(best.tw);
      }
      // Pouvoirs
      if (rnd() < P.powers) {
        if (g.powerReady('buste')) {
          var bestE = null, bestN = 2;
          g.enemies.forEach(function (en) {
            if (!g.targetable(en)) return;
            var n = 0; g.enemies.forEach(function (o) { if (Math.hypot(o.x - en.x, o.y - en.y) < 70 && !o.def.innocent) n++; });
            if (en.def.boss || en.def.heavy) n += 3;
            if (n > bestN) { bestN = n; bestE = en; }
          });
          if (bestE) g.usePower('buste', bestE.x, bestE.y);
        }
        if (g.powerReady('alarme') && g.enemies.filter(function (en) { return en.carrying; }).length >= 2) g.usePower('alarme');
        if (g.powerReady('cafe') && g.enemies.length >= 10) g.usePower('cafe');
        if (g.powerReady('verrou') && g.enemies.some(function (en) { return en.carrying && en.dir < 0 && en.d < g.doorD[en.path] + 140; })) g.usePower('verrou');
      }
      // Appel anticipé des vagues (expert) quand la salle est calme
      if (P.early && g.canCallWave() && g.countdown != null && g.enemies.filter(function (en) { return en.alive && !en.def.innocent; }).length === 0) g.startNextWave();
      // Détection de blocage : plus de voleurs vivants mais la vague ne se termine pas
      if (g.lives === lastLives && g.enemies.length > 0 && g.enemies.every(function (en) { return en.curSpeed === 0 && en.stunT <= 0 && en.pauseT <= 0; }) && g.freezeT <= 0 && g.lockT <= 0) stuck += P.think;
      else stuck = 0;
      lastLives = g.lives;
      if (g.waveIndex >= 0 && livesLog.length <= g.waveIndex) livesLog.push(g.lives);
      if (stuck > 30) throw new Error('voleurs immobiles depuis 30 s (vague ' + (g.waveIndex + 1) + ')');
    }
    if (t >= 2400) throw new Error('partie interminable (vague ' + (g.waveIndex + 1) + '/' + g.totalWaves() + ')');
    return {
      state: g.state, lives: g.lives, max: g.maxLives, stars: g.state === 'won' ? g.computeStars() : 0,
      wave: g.waveIndex + 1, total: g.totalWaves(), time: Math.round(t), towers: g.towers.length, events: events,
      ratio: g.lives / g.maxLives, log: livesLog, built: g.towers.map(function (x) { return x.type.slice(0, 3) + x.level; }).join(' '),
    };
  } finally {
    Math.random = saveRandom;
  }
}

// Dépense les étoiles libres dans l'arbre de talents, dans l'ordre d'un joueur raisonnable
var SPEND = ['budget', 'formation', 'recharge', 'assurance', 'optique', 'formation', 'budget', 'granit', 'glu', 'recup', 'perfo', 'sirene', 'prime',
  'optique', 'formation', 'recharge', 'assurance', 'atelier', 'expresso', 'budget', 'granit', 'anticipe', 'glu', 'optique', 'prime', 'atelier',
  'recharge', 'assurance', 'synergie', 'doublebuste', 'sirene', 'expresso', 'recup', 'interets'];
function spend(upgrades, free) {
  var changed = true;
  while (changed) {
    changed = false;
    for (var i = 0; i < SPEND.length; i++) {
      var id = SPEND[i], u = PT.UPGRADES.filter(function (x) { return x.id === id; })[0];
      var r = upgrades[id] || 0;
      if (r >= u.costs.length || !PT.upgradeOpen(id, upgrades)) continue;
      if (u.costs[r] <= free) { upgrades[id] = r + 1; free -= u.costs[r]; changed = true; break; }
      break; // on économise pour le prochain talent prévu
    }
  }
  return free;
}

module.exports = { play: play, spend: spend, PROFILES: PROFILES, PT: PT };
