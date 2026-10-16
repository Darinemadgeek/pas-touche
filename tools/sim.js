/* Simulation sans affichage : vérifie les niveaux et fait jouer un bot simple.
   Usage : node tools/sim.js [nombreDeParties] [idNiveau] */
'use strict';
require('../js/data.js');
require('../js/levels.js');
require('../js/game.js');
var PT = globalThis.PT;

var RUNS = +process.argv[2] || 6;
var ONLY = +process.argv[3] || 0;

function segDist(px, py, a, b) {
  var dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  var t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l2));
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}
function pathDist(level, x, y) {
  var m = Infinity;
  level.paths.forEach(function (p) { for (var i = 0; i < p.length - 1; i++) m = Math.min(m, segDist(x, y, p[i], p[i + 1])); });
  return m;
}

function validate(level) {
  var issues = [];
  level.spots.forEach(function (s, i) {
    var d = pathDist(level, s[0], s[1]);
    if (d < 78) issues.push('socle ' + i + ' trop près du chemin (' + d.toFixed(0) + ')');
    if (s[1] < 130 || s[1] > 700 || s[0] < 40 || s[0] > 1240) issues.push('socle ' + i + ' hors zone');
    level.spots.forEach(function (o, j) { if (j > i && Math.hypot(s[0] - o[0], s[1] - o[1]) < 84) issues.push('socles ' + i + '/' + j + ' trop proches'); });
  });
  (level.deco || []).forEach(function (d, i) {
    var pd = pathDist(level, d.x, d.y);
    if (pd < 56) issues.push('déco ' + d.t + ' ' + i + ' sur le chemin (' + pd.toFixed(0) + ')');
    level.spots.forEach(function (s, j) { if (Math.hypot(s[0] - d.x, s[1] - d.y) < 62) issues.push('déco ' + d.t + ' ' + i + ' sur le socle ' + j); });
    var tr = level.paths[0][level.paths[0].length - 1];
    if (Math.hypot(tr[0] - d.x, tr[1] - d.y) < 80) issues.push('déco ' + d.t + ' sur le trésor');
  });
  level.waves.forEach(function (w, i) { w.groups.forEach(function (g) { if (!PT.ENEMIES[g.t]) issues.push('vague ' + i + ' type inconnu ' + g.t); }); });
  return issues;
}

function coverage(level, x, y, range) {
  var c = 0;
  level.paths.forEach(function (p) {
    var bp = PT.buildPath(p);
    for (var d = 0; d < bp.L; d += 8) { var q = PT.pathPos(bp, d); if (Math.hypot(q.x - x, q.y - y) <= range) c += 8; }
  });
  return c;
}

function play(level, upgrades) {
  var g = new PT.Game(level, { upgrades: upgrades });
  var needCam = level.variant === 'panne' || level.waves.some(function (w) { return w.groups.some(function (gr) { var d = PT.ENEMIES[gr.t]; return d.camo || d.disguise || d.mirror; }); });
  var maxCams = level.variant === 'panne' ? 3 : 2;
  var cov = {};
  g.spots.forEach(function (s) { cov[s.i] = {}; g.availableTowers.forEach(function (t) { cov[s.i][t] = coverage(level, s.x, s.y, PT.TOWERS[t].levels[0].range); }); });
  var dt = 1 / 30, t = 0, think = 0, log = [];
  var order = ['gardien', 'glu', 'gardien', 'chien', 'filet', 'gardien', 'laser', 'chien', 'filet', 'laser', 'gardien', 'laser'];
  if (g.availableTowers.indexOf('canon') >= 0) order = ['gardien', 'glu', 'gardien', 'chien', 'canon', 'filet', 'gardien', 'laser', 'canon', 'chien', 'laser', 'filet', 'canon', 'laser'];
  var oi = 0;
  g.startNextWave();
  while (g.state !== 'won' && g.state !== 'lost' && t < 1800) {
    g.update(dt); t += dt; g.events.length = 0;
    think -= dt;
    if (think > 0) continue;
    think = 0.5;
    var cams = g.towers.filter(function (x) { return x.type === 'camera'; }).length;
    var free = g.spots.filter(function (s) { return !s.tower; });
    var want = null;
    if (needCam && cams < maxCams && g.availableTowers.indexOf('camera') >= 0) want = 'camera';
    else {
      for (var k = 0; k < order.length; k++) { var cand = order[(oi + k) % order.length]; if (g.availableTowers.indexOf(cand) >= 0) { want = cand; break; } }
    }
    if (free.length && want) {
      if (g.coins >= PT.TOWERS[want].cost) {
        free.sort(function (a, b) { return cov[b.i][want] - cov[a.i][want]; });
        g.build(free[0], want);
        if (want !== 'camera') oi++;
      }
    } else {
      var best = null;
      g.towers.forEach(function (tw) { var c = g.upgradeCost(tw); if (c != null && (!best || c < best.c)) best = { tw: tw, c: c }; });
      if (best && g.coins >= best.c) g.upgrade(best.tw);
    }
    // Pouvoirs : buste sur le plus gros groupe, alarme si des voleurs chargés approchent de la sortie.
    if (g.powerReady('buste')) {
      var bestE = null, bestN = 2;
      g.enemies.forEach(function (e) {
        if (!g.targetable(e)) return;
        var n = 0; g.enemies.forEach(function (o) { if (Math.hypot(o.x - e.x, o.y - e.y) < 70 && !o.def.innocent) n++; });
        if (n > bestN) { bestN = n; bestE = e; }
      });
      if (bestE) g.usePower('buste', bestE.x, bestE.y);
    }
    if (g.powerReady('alarme') && g.enemies.filter(function (e) { return e.carrying; }).length >= 2) g.usePower('alarme');
    if (g.powerReady('cafe') && g.enemies.length >= 10) g.usePower('cafe');
    if (g.powerReady('verrou') && g.enemies.some(function (e) { return e.carrying && e.dir < 0 && e.d < g.doorD[e.path] + 140; })) g.usePower('verrou');
    if (g.waveIndex >= 0 && log.length <= g.waveIndex) log.push(g.lives);
  }
  return { state: g.state, lives: g.lives, max: g.maxLives, wave: g.waveIndex + 1, total: g.totalWaves(), log: log, time: t | 0, towers: g.towers.length, coins: g.coins };
}

PT.LEVELS.forEach(function (level) {
  if (ONLY && level.id !== ONLY) return;
  var issues = validate(level);
  console.log('\n=== Niveau ' + level.id + ' : ' + level.name + ' ===');
  if (issues.length) console.log('  PROBLÈMES : ' + issues.join(' | '));
  var wins = 0, livesSum = 0, out = [];
  for (var r = 0; r < RUNS; r++) {
    var res = play(level, {});
    if (res.state === 'won') { wins++; livesSum += res.lives; }
    out.push(res.log.join(',') + ' ' + res.state + ' v' + res.wave + '/' + res.total + ' vies ' + res.lives + '/' + res.max + ' (' + res.time + 's)');
  }
  out.forEach(function (o) { console.log('  ' + o); });
  console.log('  -> victoires ' + wins + '/' + RUNS + (wins ? ', vies moyennes ' + (livesSum / wins).toFixed(1) : ''));
});
