/* Pas Touche ! — moteur de jeu (logique pure, sans DOM ni canvas).
   Le rendu, l'interface et le son lisent l'état et consomment `game.events`. */
(function (PT) {
  'use strict';

  var rand = Math.random;
  var dist2 = function (ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };

  /* ---------- Chemins ---------- */
  function buildPath(pts) {
    var segs = [], cum = 0;
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1];
      var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      segs.push({ ax: a[0], ay: a[1], dx: dx / len, dy: dy / len, len: len, start: cum });
      cum += len;
    }
    return { pts: pts, segs: segs, L: cum };
  }

  function pathPos(path, d, out) {
    out = out || {};
    if (d < 0) d = 0; else if (d > path.L) d = path.L;
    var segs = path.segs, s = segs[segs.length - 1];
    for (var i = 0; i < segs.length; i++) { if (d <= segs[i].start + segs[i].len) { s = segs[i]; break; } }
    var k = d - s.start;
    out.x = s.ax + s.dx * k; out.y = s.ay + s.dy * k;
    out.dx = s.dx; out.dy = s.dy;
    return out;
  }
  function entryDist(path) {
    var p = {}, WD = PT.WORLD;
    for (var d = 0; d < path.L; d += 2) {
      pathPos(path, d, p);
      if (p.x >= 0 && p.x <= WD.W && p.y >= WD.WALL && p.y <= WD.H) return d;
    }
    return 0;
  }
  PT.buildPath = buildPath;
  PT.pathPos = pathPos;

  /* ---------- Partie ---------- */
  function Game(level, opts) {
    opts = opts || {};
    this.level = level;
    this.demo = !!opts.demo;
    this.relax = !!opts.relax;
    this.mods = PT.computeMods(opts.upgrades);
    this.paths = level.paths.map(buildPath);
    var end = level.paths[0][level.paths[0].length - 1];
    this.treasure = { x: end[0], y: end[1] };
    this.spots = level.spots.map(function (s, i) { return { i: i, x: s[0], y: s[1], tower: null }; });
    this.coins = level.startCoins + this.mods.startCoins + (level.type === 'casse' ? this.mods.casseCoins : 0);
    this.maxLives = level.lives + this.mods.lives;
    this.lives = this.maxLives;
    this.inRoom = this.maxLives;
    this.enemies = []; this.towers = []; this.projectiles = []; this.puddles = []; this.drops = [];
    this.events = [];
    this.time = 0;
    this.waveIndex = -1;
    this.spawns = [];
    this.waveTime = 0;
    this.countdown = null;
    this.state = 'ready';
    this.cafeT = 0; this.freezeT = 0; this.revealT = 0; this.lockT = 0;
    // Distance à laquelle chaque chemin franchit le mur de la salle (là où le Verrouillage bloque les voleurs).
    this.doorD = this.paths.map(entryDist);
    // Variante « panne de courant » : seules les lampes (et la vitrine du trésor) éclairent la salle.
    this.dark = level.variant === 'panne';
    this.lamps = (level.deco || []).filter(function (d) { return d.t === 'lampe'; }).map(function (d) { return { x: d.x, y: d.y, r: d.r || 150 }; });
    if (this.dark) this.lamps.push({ x: end[0], y: end[1] - 20, r: 110 });
    this.stats = { caught: 0, escaped: 0, returned: 0, earned: 0 };
    this.nextId = 1;
    this.altCounter = 0;
    this.demoT = 1;
    var lid = level.id;
    this.availableTowers = PT.TOWER_ORDER.filter(function (id) { return opts.unlockAll || PT.TOWERS[id].unlock <= lid; });
    this.powers = {};
    var self = this;
    PT.POWER_ORDER.forEach(function (id) {
      if (opts.unlockAll || PT.POWERS[id].unlock <= lid) self.powers[id] = { cd: 0 };
    });
  }
  PT.Game = Game;
  var G = Game.prototype;

  G.emit = function (type, data) { data = data || {}; data.type = type; this.events.push(data); };

  /* ---------- Défenses ---------- */
  var TECH = { camera: 1, filet: 1, laser: 1, canon: 1, ventilo: 1 };
  G.towerStats = function (t) {
    var def = PT.TOWERS[t.type], base = def.levels[t.level], m = this.mods, s = {};
    for (var k in base) s[k] = base[k];
    var sp = t.level === 2 && t.spec && PT.SPECS[t.type] ? PT.SPECS[t.type][t.spec] : null;
    if (sp) {
      for (k in sp.mul || {}) if (s[k] != null) s[k] *= sp.mul[k];
      for (k in sp.add || {}) if (s[k] != null) s[k] += sp.add[k];
      ['stunHit', 'thermal', 'multi', 'heavyNet', 'beams', 'ramp', 'chill'].forEach(function (f) { if (sp[f]) s[f] = sp[f]; });
      s.spec = t.spec;
    }
    if (t.type === 'gardien' || t.type === 'chien') s.dmg *= m.guardDmg;
    if (t.type === 'chien') s.dmg *= m.dogDmg;
    if (t.type === 'laser') s.dps *= m.laserDmg;
    if (TECH[t.type]) s.range *= m.techRange;
    if (s.slowDur) s.slowDur *= m.slowDur;
    if (s.wet) s.wet *= m.slowDur;
    if (t.x == null) return s;
    // Sous les ordres : le meilleur Chef à portée renforce la défense
    var buff = 0, rb = 0, i, o;
    if (!def.commander) {
      for (i = 0; i < this.towers.length; i++) {
        o = this.towers[i];
        if (o.type !== 'chef' || o.disabledT > 0) continue;
        var cs = this.towerStats({ type: 'chef', level: o.level, spec: o.spec });
        if (dist2(o.x, o.y, t.x, t.y) <= cs.range * cs.range) { buff = Math.max(buff, cs.buff); rb = Math.max(rb, cs.rangeBuff); }
      }
    }
    if (def.commander) s.buff *= m.synergy;
    s.chefBuff = buff * m.synergy;
    if (buff) {
      if (s.dmg != null) s.dmg *= 1 + s.chefBuff;
      if (s.dps != null) s.dps *= 1 + s.chefBuff;
      s.range *= 1 + rb * m.synergy;
    }
    // Patrouille : les Gardiens proches les uns des autres tirent plus vite
    if (t.type === 'gardien') {
      var n = 0;
      for (i = 0; i < this.towers.length; i++) {
        o = this.towers[i];
        if (o.id !== t.id && o.type === 'gardien' && dist2(o.x, o.y, t.x, t.y) <= 170 * 170) n++;
      }
      s.patrol = Math.min(0.3, 0.1 * n) * m.patrol * m.synergy;
      s.rate *= 1 + s.patrol;
    }
    return s;
  };

  G.spotAt = function (x, y) {
    for (var i = 0; i < this.spots.length; i++) {
      var s = this.spots[i];
      if (dist2(x, y, s.x, s.y) < 46 * 46) return s;
    }
    return null;
  };

  G.towerCost = function (type) {
    var m = this.mods;
    return Math.round(PT.TOWERS[type].cost * m.towerCost * (type === 'gardien' ? m.guardCost : 1));
  };

  G.build = function (spot, type) {
    var def = PT.TOWERS[type], cost = def && this.towerCost(type);
    if (!def || spot.tower || this.coins < cost || this.availableTowers.indexOf(type) < 0) return null;
    this.coins -= cost;
    var t = {
      id: this.nextId++, type: type, spot: spot, x: spot.x, y: spot.y, level: 0, cd: 0.2,
      target: null, aim: 0, face: 1, spent: cost, disabledT: 0, fireT: 0, lungeT: 0, lx: 0, ly: 0,
      beamOn: false, builtT: 0, spec: null, target2: null, rampT: 0, rampOn: null,
    };
    spot.tower = t;
    this.towers.push(t);
    this.emit('build', { x: t.x, y: t.y, tower: type });
    return t;
  };

  G.upgradeCost = function (t) {
    var lv = PT.TOWERS[t.type].levels[t.level + 1];
    return lv ? Math.round(lv.cost * this.mods.upgradeCost) : null;
  };

  G.upgrade = function (t, spec) {
    var c = this.upgradeCost(t);
    if (c == null || this.coins < c) return false;
    this.coins -= c; t.spent += c; t.level++; t.builtT = 0;
    if (t.level === 2) t.spec = spec === 'b' ? 'b' : 'a';
    this.emit('upgrade', { x: t.x, y: t.y, tower: t.type, level: t.level });
    return true;
  };

  G.sellValue = function (t) { return Math.floor(t.spent * this.mods.sell); };

  G.sell = function (t) {
    var v = this.sellValue(t);
    this.coins += v;
    t.spot.tower = null;
    this.towers.splice(this.towers.indexOf(t), 1);
    this.emit('sell', { x: t.x, y: t.y, value: v });
  };

  /* ---------- Vagues ---------- */
  G.totalWaves = function () { return this.level.waves.length; };

  G.nextWaveInfo = function () {
    var idx = this.waveIndex + 1, w = this.level.waves[idx];
    if (!w) return null;
    var types = [];
    w.groups.forEach(function (g) { if (types.indexOf(g.t) < 0) types.push(g.t); });
    return { index: idx, types: types, crew: w.crew || null };
  };

  G.canCallWave = function () {
    return this.state !== 'won' && this.state !== 'lost' && this.spawns.length === 0 && this.waveIndex < this.totalWaves() - 1;
  };

  G.earlyBonus = function () {
    return this.countdown != null && this.waveIndex >= 0 ? Math.round(this.countdown * 1.5 * this.mods.earlyMul) : 0;
  };

  G.startNextWave = function () {
    if (!this.canCallWave()) return false;
    var bonus = this.earlyBonus();
    if (bonus > 0) { this.coins += bonus; this.emit('bonus', { value: bonus }); }
    if (this.mods.interest && this.waveIndex >= 0) {
      var gain = Math.min(30, Math.floor(this.coins * this.mods.interest));
      if (gain > 0) { this.coins += gain; this.emit('interest', { value: gain }); }
    }
    this.waveIndex++;
    var w = this.level.waves[this.waveIndex], list = [], self = this, np = this.paths.length;
    w.groups.forEach(function (g) {
      for (var i = 0; i < g.n; i++) {
        var p = g.p === 'alt' ? (self.altCounter++ % np) : (g.p || 0);
        if (p >= np) p = 0;
        list.push({ t: (g.at || 0) + i * g.gap, type: g.t, path: p, hp: g.hp || 1 });
      }
    });
    list.sort(function (a, b) { return a.t - b.t; });
    this.spawns = list;
    this.waveTime = 0;
    this.countdown = null;
    this.state = 'playing';
    this.emit('waveStart', { index: this.waveIndex, crew: w.crew || null });
    return true;
  };

  /* ---------- Voleurs ---------- */
  G.spawnEnemy = function (s) {
    var def = PT.ENEMIES[s.type];
    var hp = def.hp * this.level.hpMul * (1 + 0.06 * Math.max(0, this.waveIndex)) * (s.hp || 1) * (this.relax ? PT.RELAX.hp : 1);
    var e = {
      id: this.nextId++, type: s.type, def: def, path: s.path, d: s.d || 0, dir: s.dir || 1,
      hp: hp, maxHp: hp, speed: def.speed * (0.94 + rand() * 0.12), lat: def.boss ? 0 : (rand() - 0.5) * 28,
      alive: true, stunT: 0, netT: 0, slowT: 0, slowF: 0, flashT: 0, pauseT: 0, grabbing: false, carrying: 0,
      leapT: 0, leapCD: 2 + rand() * 2, empCD: 2, burrowT: 0, burrowCD: 2.5 + rand() * 2, healCD: 1.5, wetT: 0, gluT: 0, healedT: 0, pushN: 0, smokeCD: 5, smokeT: 0, summonCD: 9, mirrorCD: 2.5, clangCD: 0, lit: false, blocked: false, fake: 0,
      disguised: !!def.disguise, seen: false, mark: 0, phase: rand() * 6, x: 0, y: 0, face: 1, curSpeed: 0, age: 0,
    };
    this.placeEnemy(e);
    this.enemies.push(e);
    if (!def.decoy) this.emit('spawn', { enemy: s.type, boss: !!def.boss, x: e.x, y: e.y });
    return e;
  };

  var tmpPos = {};
  G.placeEnemy = function (e) {
    var p = pathPos(this.paths[e.path], e.d, tmpPos);
    e.x = p.x - p.dy * e.lat;
    e.y = p.y + p.dx * e.lat;
    var fx = p.dx * e.dir;
    if (Math.abs(fx) > 0.2) e.face = fx > 0 ? 1 : -1;
  };

  G.isCamo = function (e) { return (e.def.camo || e.smokeT > 0 || (this.dark && !e.lit)) && !e.seen; };

  G.targetable = function (e) {
    return e.alive && !e.def.innocent && !e.disguised && e.leapT <= 0 && (e.burrowT <= 0 || e.thermal) && !this.isCamo(e);
  };

  // Distance qu'il reste au voleur pour sortir du musée (plus c'est petit, plus il est dangereux).
  G.remaining = function (e) {
    var L = this.paths[e.path].L;
    return e.dir > 0 ? (L - e.d) + L : e.d;
  };

  G.applySlow = function (e, f, dur) {
    if (e.def.slowImmune || e.leapT > 0 || e.burrowT > 0) return;
    if (e.def.slick) f = Math.min(0.85, f * 1.8);
    if (e.slowT <= 0) e.slowF = 0;
    e.slowF = Math.max(e.slowF, f);
    e.slowT = Math.max(e.slowT, dur);
  };

  G.applyStun = function (e, dur, net) {
    if (e.def.stunImmune || e.leapT > 0) return;
    e.stunT = Math.max(e.stunT, dur);
    if (net) e.netT = Math.max(e.netT, dur);
  };

  // pierce : le coup traverse les armures (Laser, Canon).
  G.hit = function (e, dmg, pierce) {
    if (!e.alive) return;
    if (e.def.decoy) { this.shatter(e); return; }
    var d = dmg * (1 + e.mark);
    if (e.def.armor && !pierce) {
      var left = Math.max(d * 0.25, d - e.def.armor * (1 - this.mods.armorPierce));
      if (d - left > 4 && e.clangCD <= 0) { e.clangCD = 0.7; this.emit('clang', { x: e.x, y: e.y }); }
      d = left;
    }
    e.hp -= d;
    if (d > 2) e.flashT = 0.08; // le rayon continu du Laser ne fait pas clignoter
    if (e.hp <= 0) this.catchEnemy(e);
  };

  G.catchEnemy = function (e) {
    e.alive = false;
    var reward = Math.round(e.def.reward * this.mods.reward * (e.def.boss || e.def.heavy ? this.mods.bigReward : 1));
    this.coins += reward;
    this.stats.caught++;
    this.stats.earned += reward;
    if (e.carrying > 0) {
      this.inRoom += e.carrying;
      this.stats.returned += e.carrying;
      this.emit('return', { x: e.x, y: e.y, n: e.carrying });
    }
    this.emit('catch', { x: e.x, y: e.y, enemy: e.type, reward: reward, boss: !!e.def.boss, face: e.face });
  };

  // Un reflet de l'Illusionniste éclate (touché, filmé, ou arrivé au bout du chemin).
  G.shatter = function (e) {
    if (!e.alive) return;
    e.alive = false;
    this.emit('shatter', { x: e.x, y: e.y });
  };

  G.arrive = function (e) {
    if (e.def.decoy) { this.shatter(e); return; }
    e.dir = -1;
    e.leapT = 0;
    if (e.burrowT > 0) { e.burrowT = 0; e.burrowCD = 2.5; }
    if (e.def.innocent) {
      e.pauseT = 1.2;
      this.coins += 2;
      this.emit('ticket', { x: e.x, y: e.y, value: 2 });
    } else {
      e.pauseT = 0.7;
      e.grabbing = true;
      this.emit('grabStart', { x: e.x, y: e.y });
    }
  };

  G.finishGrab = function (e) {
    e.grabbing = false;
    var take = Math.min(e.def.loot, this.inRoom);
    if (take > 0) {
      this.inRoom -= take;
      e.carrying = take;
      this.emit('grab', { x: e.x, y: e.y, n: take });
    }
  };

  G.escape = function (e) {
    e.alive = false;
    if (e.def.innocent || e.def.decoy) return;
    if (e.carrying > 0) {
      if (this.demo) this.inRoom += e.carrying;
      else { this.lives -= e.carrying; this.stats.escaped += e.carrying; }
      this.emit('escape', { x: e.x, y: e.y, n: e.carrying });
    } else {
      this.emit('leave', { x: e.x, y: e.y });
    }
  };

  G.updateEnemy = function (e, dt) {
    var def = e.def;
    e.age += dt;
    e.flashT -= dt;
    if (e.stunT > 0) e.stunT -= dt;
    if (e.netT > 0) e.netT -= dt;
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowF = 0; }
    if (e.smokeT > 0) e.smokeT -= dt;
    if (e.wetT > 0) e.wetT -= dt;
    if (e.gluT > 0) e.gluT -= dt;
    if (e.healedT > 0) e.healedT -= dt;
    if (e.clangCD > 0) e.clangCD -= dt;

    var sp = e.speed;
    if (e.slowT > 0) sp *= 1 - e.slowF;
    if (e.carrying && !def.heavy) sp *= 0.85;
    if (e.stunT > 0 || (this.freezeT > 0 && !def.innocent)) sp = 0;
    if (e.pauseT > 0) {
      sp = 0;
      e.pauseT -= dt;
      if (e.pauseT <= 0 && e.grabbing) this.finishGrab(e);
    }

    // Capacités spéciales
    if (def.leap) {
      if (e.leapT > 0) {
        e.leapT -= dt;
        sp = 175;
      } else {
        e.leapCD -= dt;
        if (e.leapCD <= 0 && sp > 0 && e.pauseT <= 0) {
          e.leapT = 0.8; e.leapCD = 4.5 + rand() * 1.5;
          e.stunT = 0; e.slowT = 0; e.slowF = 0;
          this.emit('leap', { x: e.x, y: e.y });
        }
      }
    }
    if (def.burrow) {
      if (e.burrowT > 0) {
        e.burrowT -= dt;
        if (e.burrowT <= 0) { e.burrowCD = 3.2 + rand() * 1.2; this.emit('surface', { x: e.x, y: e.y }); }
      } else if (!e.grabbing && e.pauseT <= 0 && sp > 0) {
        e.burrowCD -= dt;
        if (e.burrowCD <= 0) { e.burrowT = 1.7; e.stunT = 0; e.slowT = 0; e.slowF = 0; this.emit('burrow', { x: e.x, y: e.y }); }
      }
    }
    if (def.heal && !this.demo) {
      e.healCD -= dt;
      if (e.healCD <= 0) {
        e.healCD = 2.6;
        var healed = 0;
        for (var h = 0; h < this.enemies.length; h++) {
          var o = this.enemies[h];
          if (!o.alive || o.def.innocent || o.def.decoy || o.hp >= o.maxHp || o.healedT > 0) continue;
          if (dist2(o.x, o.y, e.x, e.y) <= 115 * 115) {
            o.healedT = 2.6; // les soins de plusieurs Soigneuses ne se cumulent pas
            o.hp = Math.min(o.maxHp, o.hp + o.maxHp * (o === e ? 0.05 : o.def.boss ? 0.02 : 0.12));
            healed++;
          }
        }
        if (healed) this.emit('heal', { x: e.x, y: e.y });
      }
    }
    if (def.emp && !this.demo) {
      e.empCD -= dt;
      if (e.empCD <= 0) {
        var hitAny = false;
        for (var i = 0; i < this.towers.length; i++) {
          var t = this.towers[i];
          if (PT.TOWERS[t.type].electric && dist2(t.x, t.y, e.x, e.y) < 130 * 130) { t.disabledT = this.mods.empDur; hitAny = true; }
        }
        if (hitAny) { this.emit('emp', { x: e.x, y: e.y }); e.empCD = 6; } else e.empCD = 0.4;
      }
    }
    if (def.smoke) {
      e.smokeCD -= dt;
      if (e.smokeCD <= 0) { e.smokeT = 2.5; e.smokeCD = 9; this.emit('smoke', { x: e.x, y: e.y }); }
    }
    if (def.summon) {
      e.summonCD -= dt;
      if (e.summonCD <= 0) {
        e.summonCD = 12;
        for (var k = 0; k < 3; k++) {
          this.spawnEnemy({ type: 'pickpocket', path: e.path, d: Math.max(0, e.d - 10 - k * 14), dir: 1, hp: 1.2 });
        }
        this.emit('summon', { x: e.x, y: e.y });
      }
    }

    if (def.mirror && !this.demo) {
      e.mirrorCD -= dt;
      if (e.mirrorCD <= 0 && sp > 0 && e.leapT <= 0) {
        e.mirrorCD = 6.5;
        var Lp = this.paths[e.path].L;
        for (var m = -1; m <= 1; m += 2) {
          var r = this.spawnEnemy({ type: 'reflet', path: e.path, d: Math.max(0, Math.min(Lp - 1, e.d + m * 26 * e.dir)), dir: e.dir, hp: 1 });
          r.speed = e.speed; r.phase = e.phase; r.fake = e.carrying;
        }
        this.emit('mirror', { x: e.x, y: e.y });
      }
    }

    // Verrouillage : les voleurs qui repartent restent coincés devant la porte.
    var door = this.doorD[e.path], before = e.d;
    e.blocked = false;
    e.curSpeed = sp;
    e.d += sp * dt * e.dir;
    if (e.dir < 0 && this.lockT > 0 && !def.innocent && before >= door && e.d < door) { e.d = door; e.blocked = true; e.curSpeed = 0; }
    e.phase += e.curSpeed * dt * 0.11;
    var L = this.paths[e.path].L;
    if (e.dir > 0 && e.d >= L) { e.d = L; this.arrive(e); }
    else if (e.dir < 0 && e.d <= 0) { e.d = 0; this.escape(e); }
    this.placeEnemy(e);
  };

  /* ---------- Caméras ---------- */
  G.updateVision = function () {
    var es = this.enemies, i, j;
    for (i = 0; i < es.length; i++) { es[i].seen = this.revealT > 0; es[i].mark = 0; es[i].thermal = false; }
    if (this.dark) {
      for (i = 0; i < es.length; i++) {
        var en = es[i]; en.lit = false;
        for (j = 0; j < this.lamps.length; j++) { var l = this.lamps[j]; if (dist2(l.x, l.y, en.x, en.y) <= l.r * l.r) { en.lit = true; break; } }
      }
    }
    for (j = 0; j < this.towers.length; j++) {
      var t = this.towers[j];
      if (t.type !== 'camera' || t.disabledT > 0) continue;
      var st = this.towerStats(t), r2 = st.range * st.range;
      for (i = 0; i < es.length; i++) {
        var e = es[i];
        if (!e.alive || e.def.innocent) continue;
        if (dist2(t.x, t.y, e.x, e.y) <= r2) {
          if (e.def.decoy) { this.shatter(e); continue; }
          e.seen = true;
          if (st.thermal && e.burrowT > 0) e.thermal = true;
          if (st.mark > e.mark) e.mark = st.mark;
          if (e.disguised) { e.disguised = false; this.emit('reveal', { x: e.x, y: e.y }); }
        }
      }
    }
  };

  /* ---------- Tirs ---------- */
  // skip : voleur à ignorer (pour une deuxième cible)
  G.pickTarget = function (t, range, preferUnslowed, skip) {
    var best = null, bestR = Infinity, alt = null, altR = Infinity, r2 = range * range;
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (e === skip || !this.targetable(e)) continue;
      if (dist2(t.x, t.y, e.x, e.y) > r2) continue;
      var rem = this.remaining(e);
      if (preferUnslowed && e.gluT > 0.4 && !e.def.slowImmune) { if (rem < altR) { altR = rem; alt = e; } continue; }
      if (rem < bestR) { bestR = rem; best = e; }
    }
    return best || alt;
  };

  G.predict = function (e, time) {
    var d = e.d + e.dir * e.curSpeed * time;
    var p = pathPos(this.paths[e.path], d, {});
    return { x: p.x - p.dy * e.lat, y: p.y + p.dx * e.lat };
  };

  G.updateTower = function (t, dt) {
    t.builtT += dt;
    if (t.fireT > 0) t.fireT -= dt;
    if (t.lungeT > 0) t.lungeT -= dt;
    t.beamOn = false;
    if (t.disabledT > 0) { t.disabledT -= dt; t.target = null; return; }
    var st = this.towerStats(t), def = PT.TOWERS[t.type];
    var rateMul = this.cafeT > 0 ? 1 + PT.POWERS.cafe.boost : 1;

    if (def.aura) {
      // Arroseur : mouille et ralentit tous les voleurs à portée, par petites giclées
      t.cd -= dt;
      var any = null, ar2 = st.range * st.range;
      for (var ai = 0; ai < this.enemies.length; ai++) {
        var ae = this.enemies[ai];
        if (!ae.alive || ae.def.innocent || ae.burrowT > 0 || ae.leapT > 0) continue;
        if (dist2(t.x, t.y, ae.x, ae.y) <= ar2) {
          any = ae;
          if (t.cd <= 0) { ae.wetT = Math.max(ae.wetT, st.wet); this.applySlow(ae, st.slow, 0.5); }
        }
      }
      if (t.cd <= 0) t.cd = 0.25;
      t.target = any;
      if (any) { t.fireT = 0.25; t.aim += dt * 5; }
      return;
    }

    if (def.support) {
      // La caméra suit un voleur visible, sinon elle balaie la salle.
      var seen = null, r2 = st.range * st.range;
      for (var i = 0; i < this.enemies.length; i++) {
        var e = this.enemies[i];
        if (e.alive && !e.def.innocent && dist2(t.x, t.y, e.x, e.y) <= r2) { seen = e; break; }
      }
      var want = seen ? Math.atan2(seen.y - t.y, seen.x - t.x) : Math.sin(this.time * 0.8 + t.id) * 1.2 + Math.PI / 2;
      t.aim += angleDiff(t.aim, want) * Math.min(1, dt * 6);
      t.target = seen;
      return;
    }

    if (def.beam) {
      var bt = this.pickTarget(t, st.range);
      t.target = bt; t.target2 = null;
      if (bt) {
        t.beamOn = true;
        t.aim = Math.atan2(bt.y - 20 - t.y, bt.x - t.x);
        if (st.ramp) { if (t.rampOn !== bt) { t.rampOn = bt; t.rampT = 0; } t.rampT += dt; }
        var heat = st.ramp ? 1 + Math.min(1.5, t.rampT * 0.75) : 1;
        this.hit(bt, st.dps * rateMul * dt * heat * (bt.wetT > 0 ? 1 + 0.6 * this.mods.synergy : 1), true);
        if (st.beams === 2) {
          var b2 = this.pickTarget(t, st.range, false, bt);
          if (b2) { t.target2 = b2; this.hit(b2, st.dps * rateMul * dt * (b2.wetT > 0 ? 1 + 0.6 * this.mods.synergy : 1), true); }
        }
      }
      return;
    }

    t.cd -= dt * rateMul;
    if (t.cd > 0) return;
    var target = this.pickTarget(t, st.range, t.type === 'glu');
    t.target = target;
    if (!target) { t.cd = 0; return; }
    t.cd = 1 / st.rate;
    t.fireT = 0.25;
    t.aim = Math.atan2(target.y - t.y, target.x - t.x);
    t.face = target.x >= t.x ? 1 : -1;

    if (def.melee) {
      t.lungeT = 0.25; t.lx = target.x; t.ly = target.y;
      // Croc-en-filet : double dégâts sur un voleur pris dans un filet
      this.hit(target, st.dmg * (target.netT > 0 ? 1 + this.mods.netBite * this.mods.synergy : 1));
      if (st.multi === 2) {
        var t2 = this.pickTarget(t, st.range, false, target);
        if (t2) { this.hit(t2, st.dmg * (t2.netT > 0 ? 1 + this.mods.netBite * this.mods.synergy : 1)); this.emit('bite', { x: t2.x, y: t2.y }); }
      }
      this.emit('bite', { x: target.x, y: target.y });
      return;
    }
    if (def.gust) {
      // Ventilateur : rafale qui repousse tout le groupe autour de la cible
      var self = this;
      this.splashTargets(target.x, target.y, st.splash, function (e) {
        self.hit(e, st.dmg);
        if (st.chill && e.alive) self.applySlow(e, st.chill, 2);
        if (!e.alive || e.def.heavy || e.def.boss) return;
        self.push(e, st.push * (e.wetT > 0 ? 1 + self.mods.synergy : 1));
      });
      this.emit('gust', { x: t.x, y: t.y - 30, tx: target.x, ty: target.y });
      return;
    }
    var sx = t.x, sy = t.y - 44;
    if (def.projectile === 'matraque') {
      this.projectiles.push({ kind: 'matraque', x: sx, y: sy, target: target, tx: target.x, ty: target.y - 20, speed: def.projSpeed, dmg: st.dmg, rot: 0, stunHit: st.stunHit || 0 });
      this.emit('shoot', { tower: t.type, x: sx, y: sy });
    } else {
      var dd = Math.sqrt(dist2(sx, sy, target.x, target.y));
      var dur = Math.max(0.35, dd / def.projSpeed);
      var aimAt = this.predict(target, dur);
      this.projectiles.push({
        kind: def.projectile, sx: sx, sy: sy, x: sx, y: sy, tx: aimAt.x, ty: aimAt.y, t: 0, dur: dur,
        dmg: st.dmg, splash: st.splash, slow: st.slow, slowDur: st.slowDur, puddle: st.puddle, stun: st.stun, rot: 0, arc: def.arc || 70, pierce: !!def.pierce, heavyNet: !!st.heavyNet,
      });
      this.emit('shoot', { tower: t.type, x: sx, y: sy });
    }
  };

  function angleDiff(a, b) {
    var d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  // Repousse un voleur en arrière sur son chemin (sans le faire ressortir ni dépasser le trésor)
  G.push = function (e, dist) {
    var L = this.paths[e.path].L, door = this.doorD[e.path];
    if (e.grabbing || e.pauseT > 0) return;
    // Chaque rafale porte moins sur un même voleur : il finit par s'accrocher (pas de blocage sans fin)
    dist *= Math.max(0, 1 - 0.25 * e.pushN);
    e.pushN++;
    if (dist <= 0) return;
    if (e.dir > 0) e.d = Math.max(Math.min(e.d, door), e.d - dist);
    else e.d = Math.min(L - 4, e.d + dist);
    this.placeEnemy(e);
  };

  G.splashTargets = function (x, y, r, fn) {
    var r2 = r * r;
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (!e.alive || e.def.innocent || e.disguised || e.leapT > 0 || (e.burrowT > 0 && !e.thermal)) continue;
      if (dist2(x, y, e.x, e.y) <= r2) fn(e);
    }
  };

  G.updateProjectiles = function (dt) {
    var self = this;
    for (var i = this.projectiles.length - 1; i >= 0; i--) {
      var p = this.projectiles[i], done = false;
      p.rot += dt * 14;
      if (p.kind === 'matraque') {
        if (p.target && p.target.alive) { p.tx = p.target.x; p.ty = p.target.y - 20; }
        var dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), step = p.speed * dt;
        if (d <= step + 6) {
          if (p.target && p.target.alive && this.targetable(p.target)) {
            this.hit(p.target, p.dmg);
            if (p.stunHit) this.applyStun(p.target, p.stunHit);
            this.emit('hit', { x: p.tx, y: p.ty, kind: 'matraque' });
          }
          done = true;
        } else { p.x += dx / d * step; p.y += dy / d * step; }
      } else {
        p.t += dt;
        var k = Math.min(1, p.t / p.dur);
        p.x = p.sx + (p.tx - p.sx) * k;
        p.y = p.sy + (p.ty - p.sy) * k - Math.sin(k * Math.PI) * p.arc;
        p.k = k;
        if (k >= 1) {
          done = true;
          if (p.kind === 'glu') {
            this.splashTargets(p.tx, p.ty, p.splash, function (e) { self.hit(e, p.dmg); self.applySlow(e, p.slow, p.slowDur); e.gluT = Math.max(e.gluT, p.slowDur); });
            this.puddles.push({ x: p.tx, y: p.ty, r: p.splash * 0.85, slow: p.slow, t: p.puddle, max: p.puddle, seed: rand() * 10 });
            this.emit('splat', { x: p.tx, y: p.ty });
          } else if (p.kind === 'filet') {
            this.splashTargets(p.tx, p.ty, p.splash, function (e) {
              self.hit(e, p.dmg);
              if (p.heavyNet && e.alive && e.def.stunImmune && !e.def.boss && e.leapT <= 0) { e.stunT = Math.max(e.stunT, p.stun * 0.5); e.netT = Math.max(e.netT, p.stun * 0.5); }
              else self.applyStun(e, p.stun, true);
            });
            this.emit('net', { x: p.tx, y: p.ty, r: p.splash });
          } else if (p.kind === 'boulet') {
            this.splashTargets(p.tx, p.ty, p.splash, function (e) { self.hit(e, p.dmg * (e.slowT > 0 ? 1 + 0.35 * self.mods.synergy : 1), p.pierce); });
            this.emit('blast', { x: p.tx, y: p.ty, r: p.splash });
          }
        }
      }
      if (done) this.projectiles.splice(i, 1);
    }
  };

  G.updatePuddles = function (dt) {
    for (var i = this.puddles.length - 1; i >= 0; i--) {
      var p = this.puddles[i];
      p.t -= dt;
      if (p.t <= 0) { this.puddles.splice(i, 1); continue; }
      var r2 = p.r * p.r;
      for (var j = 0; j < this.enemies.length; j++) {
        var e = this.enemies[j];
        if (!e.alive || e.def.innocent) continue;
        if (dist2(p.x, p.y, e.x, e.y) <= r2) { this.applySlow(e, p.slow, 0.3); e.gluT = Math.max(e.gluT, 0.3); }
      }
    }
  };

  /* ---------- Pouvoirs ---------- */
  G.powerReady = function (id) { return this.powers[id] && this.powers[id].cd <= 0; };

  G.usePower = function (id, x, y) {
    var p = this.powers[id], def = PT.POWERS[id];
    if (!p || p.cd > 0 || this.state === 'won' || this.state === 'lost') return false;
    p.cd = def.cd * this.mods.powerCd * (id === 'cafe' ? this.mods.cafeCd : 1);
    p.max = p.cd;
    if (id === 'buste') {
      var m = this.mods, r = def.radius * m.bustRadius, dmg = def.dmg * m.bustDmg;
      var xs = m.bustDouble ? [x - r * 0.75, x + r * 0.75] : [x];
      for (var b = 0; b < xs.length; b++) {
        var delay = m.bustDelay + b * 0.12;
        this.drops.push({ x: xs[b], y: y, t: delay, max: delay, r: r, dmg: dmg });
        this.emit('bustFall', { x: xs[b], y: y });
      }
    } else if (id === 'alarme') {
      this.freezeT = def.freeze + this.mods.alarmPlus;
      this.revealT = def.reveal;
      for (var i = 0; i < this.enemies.length; i++) {
        var e = this.enemies[i];
        if (e.alive && e.def.decoy) this.shatter(e);
        else if (e.alive && e.disguised) { e.disguised = false; this.emit('reveal', { x: e.x, y: e.y }); }
      }
      this.emit('alarm', {});
    } else if (id === 'cafe') {
      this.cafeT = def.dur + this.mods.cafePlus;
      this.emit('cafe', {});
    } else if (id === 'verrou') {
      this.lockT = def.dur + this.mods.lockPlus;
      this.emit('lock', {});
    }
    return true;
  };

  G.updateDrops = function (dt) {
    var self = this, def = PT.POWERS.buste;
    for (var i = this.drops.length - 1; i >= 0; i--) {
      var d = this.drops[i];
      d.t -= dt;
      if (d.t <= 0) {
        var knock = self.mods.bustStun;
        this.splashTargets(d.x, d.y, d.r || def.radius, function (e) {
          self.hit(e, d.dmg || def.dmg);
          // Buste assommant : même les Costauds restent sonnés (le boss un peu moins)
          if (knock && e.alive) e.stunT = Math.max(e.stunT, e.def.boss ? 1 : knock);
          else self.applyStun(e, def.stun);
        });
        this.emit('bustImpact', { x: d.x, y: d.y, r: d.r || def.radius });
        this.drops.splice(i, 1);
      }
    }
  };

  /* ---------- Boucle ---------- */
  G.update = function (dt) {
    if (this.state === 'won' || this.state === 'lost') return;
    this.time += dt;
    if (this.cafeT > 0) this.cafeT -= dt;
    if (this.freezeT > 0) this.freezeT -= dt;
    if (this.revealT > 0) this.revealT -= dt;
    if (this.lockT > 0) { this.lockT -= dt; if (this.lockT <= 0) this.emit('unlock', {}); }
    for (var id in this.powers) if (this.powers[id].cd > 0) this.powers[id].cd -= dt;

    if (this.demo) this.demoTick(dt);
    else if (this.spawns.length) {
      this.waveTime += dt;
      while (this.spawns.length && this.spawns[0].t <= this.waveTime) this.spawnEnemy(this.spawns.shift());
      if (!this.spawns.length && this.waveIndex < this.totalWaves() - 1) {
        var nxt = this.level.waves[this.waveIndex + 1];
        this.countdown = nxt.crew ? 24 : 16;
        this.emit('waveSpawned', { index: this.waveIndex });
        if (nxt.crew) this.emit('briefing', { index: this.waveIndex + 1, crew: nxt.crew });
      }
    } else if (this.countdown != null) {
      this.countdown -= dt;
      if (this.countdown <= 0) this.startNextWave();
    }

    this.updateVision();
    var i;
    for (i = 0; i < this.enemies.length; i++) if (this.enemies[i].alive) this.updateEnemy(this.enemies[i], dt);
    for (i = 0; i < this.towers.length; i++) this.updateTower(this.towers[i], dt);
    this.updateProjectiles(dt);
    this.updatePuddles(dt);
    this.updateDrops(dt);
    for (i = this.enemies.length - 1; i >= 0; i--) if (!this.enemies[i].alive) this.enemies.splice(i, 1);

    if (this.demo) return;
    if (this.lives <= 0) {
      this.lives = 0;
      this.state = 'lost';
      this.emit('lose', {});
      return;
    }
    if (this.waveIndex === this.totalWaves() - 1 && !this.spawns.length) {
      var left = 0;
      for (i = 0; i < this.enemies.length; i++) if (!this.enemies[i].def.innocent && !this.enemies[i].def.decoy) left++;
      if (!left) {
        this.state = 'won';
        this.stars = this.computeStars();
        this.emit('win', { stars: this.stars });
      }
    }
  };

  G.computeStars = function () {
    var r = this.lives / this.maxLives;
    var st = r >= 1 ? 5 : r >= 0.85 ? 4 : r >= 0.65 ? 3 : r >= 0.4 ? 2 : 1;
    return this.relax ? Math.min(st, PT.RELAX.maxStars) : st;
  };

  /* ---------- Mode démo (fond animé du menu) ---------- */
  var DEMO_TYPES = ['voleur', 'voleur', 'pickpocket', 'costaud', 'acrobate', 'touriste', 'touriste', 'voleur', 'chevalier'];
  G.demoTick = function (dt) {
    this.demoT -= dt;
    if (this.demoT <= 0 && this.enemies.length < 14) {
      this.demoT = 1.1 + rand() * 1.6;
      this.spawnEnemy({ type: DEMO_TYPES[(rand() * DEMO_TYPES.length) | 0], path: (rand() * this.paths.length) | 0, hp: 0.7 });
    }
  };
})(globalThis.PT = globalThis.PT || {});
