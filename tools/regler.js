/* Règle la résistance des voleurs (hpMul) des salles 11 à 50 pour suivre une courbe de difficulté.
   Le joueur virtuel « moyen » joue la campagne dans l'ordre, avec les talents qu'il aurait achetés ;
   pour chaque salle on cherche le hpMul qui lui laisse la proportion de vies visée.
   Usage : node tools/regler.js  -> affiche la table HPMUL à recopier dans js/levels-gen.js */
'use strict';
var bot = require('./bot.js'), PT = bot.PT;

var INTRO_LEVELS = { 11: 1, 12: 1, 14: 1, 16: 1, 19: 1, 21: 1, 24: 1 };
var BREATHER = { 16: 1, 21: 1, 26: 1, 31: 1, 36: 1, 41: 1, 46: 1 };
// Proportion de vies qu'il doit rester au joueur moyen : la campagne se durcit peu à peu
function target(level) {
  var n = level.id;
  if (BREATHER[n]) return 0.85;
  var t = 0.74 - (n - 11) * (0.3 / 39);
  if (INTRO_LEVELS[n]) t += 0.06;
  if (level.type === 'casse') t -= 0.06;
  return t;
}

var SEEDS = [11, 22, 33, 44, 55, 66];
function score(level, upgrades) {
  var sum = 0;
  SEEDS.forEach(function (s) {
    var r;
    try { r = bot.play(level, upgrades, 'moyen', level.id * 100 + s); }
    catch (e) { console.log('  ! salle ' + level.id + ' hpMul ' + level.hpMul.toFixed(2) + ' : ' + e.message); r = { state: 'bug', wave: 0, total: 1 }; }
    sum += r.state === 'won' ? r.ratio : -0.5 + 0.5 * r.wave / r.total;
  });
  return sum / SEEDS.length;
}

var stars = {}, upgrades = {}, spent = 0, table = {};
PT.LEVELS.forEach(function (level) {
  var tot = 0; for (var s in stars) tot += stars[s];
  var free = tot - spent, left = bot.spend(upgrades, free); spent += free - left;
  if (level.id > 10) {
    var goal = target(level), lo = 0.5, hi = 14, best = level.hpMul;
    for (var it = 0; it < 9; it++) {
      var mid = (lo + hi) / 2;
      level.hpMul = mid;
      var sc = score(level, upgrades);
      if (sc > goal) lo = mid; else hi = mid;
      best = mid;
    }
    level.hpMul = +((lo + hi) / 2).toFixed(2);
    table[level.id] = level.hpMul;
  }
  var res = bot.play(level, upgrades, 'moyen', level.id * 100 + 1);
  stars[level.id] = res.state === 'won' ? res.stars : 1;
  console.log('salle ' + level.id + ' hpMul ' + level.hpMul + ' -> ' + res.state + ' ' + res.lives + '/' + res.max + ' (' + stars[level.id] + '★, visé ' + (level.id > 10 ? target(level).toFixed(2) : '-') + ')');
});
var ns = Object.keys(table).map(Number).filter(function (n) { return !BREATHER[n]; });
var mx = 0, my = 0;
ns.forEach(function (n) { mx += n; my += Math.log(table[n]); }); mx /= ns.length; my /= ns.length;
var sxy = 0, sxx = 0;
ns.forEach(function (n) { sxy += (n - mx) * (Math.log(table[n]) - my); sxx += (n - mx) * (n - mx); });
var slope = sxy / sxx;
Object.keys(table).forEach(function (k) {
  var n = +k, trend = Math.exp(my + slope * (n - mx)) * (BREATHER[n] ? 0.85 : 1);
  table[n] = +Math.min(trend * 1.35, Math.max(trend * 0.55, table[n])).toFixed(2);
});
var rows = [];
for (var n = 11; n <= 50; n += 10) {
  var line = [];
  for (var k = n; k < n + 10 && table[k] != null; k++) line.push(k + ': ' + table[k]);
  rows.push('    ' + line.join(', ') + ',');
}
console.log('\n  var HPMUL = {\n' + rows.join('\n') + '\n  };');
