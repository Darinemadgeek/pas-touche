/* Fait jouer toute la campagne par des joueurs virtuels, comme de vrais joueurs :
   ils recommencent une salle perdue, gagnent des étoiles et les dépensent à l'Atelier.
   Usage :
     node tools/campagne.js                 -> campagne complète pour les 3 profils
     node tools/campagne.js moyen 11 20     -> un profil, salles 11 à 20
   Le rapport signale les plantages, les blocages et les salles trop dures ou trop faciles. */
'use strict';
var bot = require('./bot.js'), PT = bot.PT;

var args = process.argv.slice(2);
var profiles = args[0] && bot.PROFILES[args[0]] ? [args[0]] : ['novice', 'moyen', 'expert'];
var from = +args[1] || 1, to = +args[2] || PT.LEVELS.length;
var MAX_TRIES = 6;

profiles.forEach(function (prof) {
  var stars = {}, upgrades = {}, spent = 0, totalTries = 0, bugs = [], walls = [];
  // Les étoiles des salles déjà passées (si on commence plus loin) sont estimées
  for (var k = 1; k < from; k++) stars[k] = prof === 'novice' ? 3 : 4;
  console.log('\n######## Profil ' + prof + ' ########');
  console.log('salle | essais | étoiles | vies restantes | durée');
  PT.LEVELS.forEach(function (level) {
    if (level.id < from || level.id > to) return;
    var total = 0; for (var s in stars) total += stars[s];
    var free = total - spent;
    var left = bot.spend(upgrades, free); spent += free - left;
    var tries = 0, res = null;
    while (tries < MAX_TRIES) {
      tries++;
      try { res = bot.play(level, upgrades, prof, level.id * 1000 + tries, tries, tries > PT.RELAX.after); }
      catch (e) { bugs.push('salle ' + level.id + ' : ' + e.message); res = { state: 'bug', stars: 0, lives: 0, max: 1, time: 0 }; break; }
      if (res.state === 'won') break;
    }
    totalTries += tries;
    if (res.state === 'won') stars[level.id] = Math.max(stars[level.id] || 0, res.stars);
    else { walls.push(level.id); stars[level.id] = Math.max(stars[level.id] || 0, 1); } // le vrai joueur finirait par passer
    console.log(String(level.id).padStart(5) + ' | ' + String(tries).padStart(6) + ' | ' + (res.state === 'won' ? '★'.repeat(res.stars).padEnd(7) : 'ÉCHEC  ') +
      ' | ' + (res.lives + '/' + res.max).padStart(14) + ' | ' + res.time + ' s' + (level.type === 'casse' ? '  (casse)' : ''));
  });
  var tot = 0; for (var s2 in stars) tot += stars[s2];
  console.log('-> ' + totalTries + ' essais, ' + tot + ' étoiles, murs : ' + (walls.join(', ') || 'aucun') + (bugs.length ? '\n   BUGS : ' + bugs.join(' | ') : ''));
});
