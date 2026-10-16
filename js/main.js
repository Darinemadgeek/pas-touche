/* Pas Touche ! — démarrage, sauvegarde, boucle de jeu et entrées. */
(function (PT) {
  'use strict';

  var UI = PT.UI, Au = PT.Audio;
  var SAVE_KEY = 'pastouche-save-v1';
  var STEP = 1 / 60;

  var App = PT.App = {
    save: null, renderer: null, game: null, demo: null, scene: 'menu',
    paused: false, speed: 1, levelIdx: 0, u: 1, resultTimer: null,
  };

  /* ---------- Sauvegarde ---------- */
  function freshSave() { return { stars: {}, upgrades: {}, music: true, sfx: true, story: false, seen: {}, talents: 3, starScale: 5, fails: {} }; }
  function loadSave() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { s = null; }
    var base = freshSave();
    if (!s || typeof s !== 'object') return base;
    for (var k in base) if (s[k] == null) s[k] = base[k];
    return s;
  }
  App.persist = function () { try { localStorage.setItem(SAVE_KEY, JSON.stringify(App.save)); } catch (e) { /* stockage indisponible */ } };
  App.resetSave = function () {
    var keep = { music: App.save.music, sfx: App.save.sfx };
    App.save = freshSave();
    App.save.music = keep.music; App.save.sfx = keep.sfx;
    UI.wing = null;
    App.persist();
  };

  App.starsTotal = function () { var t = 0; for (var k in App.save.stars) t += App.save.stars[k]; return t; };
  App.starsSpent = function () {
    var t = 0;
    PT.UPGRADES.forEach(function (u) { var r = Math.min(App.save.upgrades[u.id] || 0, u.costs.length); for (var i = 0; i < r; i++) t += u.costs[i]; });
    return t;
  };
  App.starsFree = function () { return App.starsTotal() - App.starsSpent(); };
  App.buyUpgrade = function (id) {
    var u = PT.upgradeById(id);
    var r = App.save.upgrades[id] || 0;
    if (!u || r >= u.costs.length || App.starsFree() < u.costs[r] || !PT.upgradeOpen(id, App.save.upgrades)) return false;
    App.save.upgrades[id] = r + 1;
    App.persist();
    return true;
  };
  App.isUnlocked = function (idx) { return idx === 0 || (App.save.stars[PT.LEVELS[idx - 1].id] || 0) > 0; };
  App.maxUnlockedId = function () {
    var m = 1;
    PT.LEVELS.forEach(function (l, i) { if (App.isUnlocked(i)) m = Math.max(m, l.id); });
    return m;
  };

  App.setSound = function (music, sfx) {
    App.save.music = music; App.save.sfx = sfx;
    Au.setMusic(music); Au.setSfx(sfx);
    App.persist();
  };

  /* ---------- Plein écran ---------- */
  App.toggleFullscreen = function () {
    var d = document, el = d.documentElement;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
      var req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) {
        var p = req.call(el);
        if (p && p.then) p.then(function () { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {}); }).catch(function () {});
      }
    } catch (e) { /* plein écran refusé */ }
  };
  var triedFull = false;
  App.fullscreenOnce = function () {
    if (triedFull) return;
    triedFull = true;
    if (matchMedia('(pointer: coarse)').matches && !document.fullscreenElement) App.toggleFullscreen();
  };

  /* ---------- Scènes ---------- */
  function makeDemo() {
    var lv = PT.LEVELS[0];
    var g = new PT.Game(lv, { demo: true, unlockAll: true });
    g.coins = 1e9;
    [[0, 'gardien', 1], [1, 'glu', 0], [3, 'chien', 1], [4, 'gardien', 2], [6, 'filet', 0], [7, 'camera', 1], [2, 'laser', 0]].forEach(function (b) {
      var t = g.build(g.spots[b[0]], b[1]);
      for (var i = 0; t && i < b[2]; i++) g.upgrade(t);
    });
    g.events.length = 0;
    App.demo = g;
    App.renderer.setLevel(lv);
  }

  App.startLevel = function (idx, relax) {
    clearTimeout(App.resultTimer);
    var lv = PT.LEVELS[idx];
    App.levelIdx = idx;
    App.relax = !!relax;
    App.game = new PT.Game(lv, { upgrades: App.save.upgrades, relax: relax });
    App.renderer.setLevel(lv);
    App.scene = 'game';
    App.paused = false;
    App.speed = 1;
    UI.closeScreens();
    UI.hudInit(App.game);
    Au.music(lv.type === 'casse' ? 'heist' : 'game');
    if (lv.waves[0].crew) {
      App.paused = true;
      UI.showCrew(lv, 0, function () { App.paused = false; });
    }
  };

  App.quitToLevels = function (silent) {
    clearTimeout(App.resultTimer);
    App.scene = 'menu';
    App.game = null;
    App.paused = false;
    UI.hudHide();
    App.renderer.setLevel(App.demo.level);
    Au.music('menu');
    if (!silent) UI.showLevels();
  };

  App.pause = function () {
    if (App.scene !== 'game' || App.paused || App.game.state === 'won' || App.game.state === 'lost') return;
    App.paused = true;
    UI.closeRadial(); UI.stopAim();
    UI.showPause();
  };
  App.resume = function () { App.paused = false; UI.closeScreens(); };

  App.toggleSpeed = function () {
    App.speed = App.speed >= 3 ? 1 : App.speed + 1;
    UI.updateSpeed(App.speed);
  };

  App.callWave = function () {
    var g = App.game;
    if (!g || App.paused) return;
    if (g.startNextWave()) UI.closeRadial();
    else Au.play('error');
  };

  App.triggerPower = function (id) {
    var g = App.game;
    if (!g || App.paused) return;
    if (!g.powerReady(id)) { Au.play('error'); return; }
    if (PT.POWERS[id].target) {
      if (UI.aiming === id) UI.stopAim(); else { Au.play('click'); UI.startAim(id); }
      return;
    }
    UI.stopAim();
    g.usePower(id);
  };

  /* ---------- Événements du moteur ---------- */
  var SOUNDS = {
    build: 'build', upgrade: 'upgrade', sell: 'sell', bite: 'bite', splat: 'splat', net: 'net', hit: 'hit',
    catch: 'catch', escape: 'escape', grab: 'grab', return: 'coin', reveal: 'reveal', emp: 'emp', leap: 'leap',
    smoke: 'smoke', summon: 'summon', waveStart: 'whistle', bustFall: 'bustFall', bustImpact: 'boom',
    gust: 'gust', heal: 'heal', burrow: 'burrow', interest: 'coin',
    alarm: 'alarm', cafe: 'cafe', ticket: 'ticket', bonus: 'coin', win: 'win', lose: 'lose',
    clang: 'clang', shatter: 'shatter', mirror: 'mirror', blast: 'blast', lock: 'lock', unlock: 'unlock',
  };

  function handleEvents(g) {
    var evs = g.events;
    if (!evs.length) return;
    g.events = [];
    var demo = g === App.demo;
    for (var i = 0; i < evs.length; i++) {
      var ev = evs[i];
      App.renderer.onEvent(ev, g);
      if (demo) continue;
      if (ev.type === 'shoot') Au.play(ev.tower === 'glu' ? 'glu' : ev.tower === 'canon' ? 'cannon' : 'throw');
      else if (ev.type === 'spawn' && ev.boss) Au.play('boss');
      else if (SOUNDS[ev.type]) Au.play(SOUNDS[ev.type]);
      onGameEvent(ev, g);
    }
  }

  function onGameEvent(ev, g) {
    var lv = g.level;
    switch (ev.type) {
      case 'waveStart':
        UI.toast('Vague ' + (ev.index + 1), ev.crew ? ev.crew.name : ev.index === lv.waves.length - 1 ? 'Dernière vague !' : '');
        (lv.taunts || []).forEach(function (t) { if (t.wave === ev.index) UI.taunt(t.text); });
        break;
      case 'briefing':
        if (g.state === 'playing') {
          App.paused = true;
          UI.closeRadial(); UI.stopAim();
          UI.showCrew(lv, ev.index, function () { App.paused = false; });
        }
        break;
      case 'spawn':
        if (!App.save.seen[ev.enemy]) { App.save.seen[ev.enemy] = 1; App.persist(); }
        if (ev.boss) UI.toast('Le Gentleman arrive !', 'Fumigènes et complices');
        break;
      case 'bonus':
        UI.toast('Bonus +' + ev.value, 'Vague appelée en avance');
        break;
      case 'lock':
        UI.toast('Portes verrouillées !', 'Personne ne sort pendant ' + Math.round(g.lockT) + ' secondes');
        break;
      case 'win': {
        var old = App.save.stars[lv.id] || 0, stars = g.stars;
        App.save.stars[lv.id] = Math.max(old, stars);
        if (App.save.fails) delete App.save.fails[lv.id];
        if (!old) UI.wing = null; // une nouvelle aile a pu s'ouvrir : on y retournera
        App.persist();
        UI.closeRadial(); UI.stopAim();
        App.resultTimer = setTimeout(function () {
          UI.showWin({ level: lv, stars: stars, gained: Math.max(0, stars - old), firstClear: old === 0, game: g });
        }, 1400);
        break;
      }
      case 'lose':
        App.save.fails = App.save.fails || {};
        App.save.fails[lv.id] = (App.save.fails[lv.id] || 0) + 1;
        App.persist();
        UI.closeRadial(); UI.stopAim();
        App.resultTimer = setTimeout(function () { UI.showLose({ level: lv, game: g }); }, 1400);
        break;
    }
  }

  /* ---------- Boucle ---------- */
  var last = 0, acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.1, (now - (last || now)) / 1000);
    last = now;
    var inGame = App.scene === 'game' && App.game;
    var g = inGame ? App.game : App.demo;
    var running = g && !(inGame && App.paused);
    var mul = inGame ? App.speed : 1;
    if (running) {
      acc += dt * mul;
      var n = 0;
      while (acc >= STEP && n < 10) { g.update(STEP); acc -= STEP; n++; }
      if (n === 10) acc = 0;
      handleEvents(g);
    }
    App.renderer.render(g, inGame ? UI : null, running ? dt * mul : 0);
    if (inGame) {
      UI.updateHud(App.game);
      var beam = false;
      if (running) for (var i = 0; i < App.game.towers.length; i++) if (App.game.towers[i].beamOn) { beam = true; break; }
      Au.setHum(beam && App.save.sfx);
    } else Au.setHum(false);
  }

  /* ---------- Entrées ---------- */
  function bindInput() {
    var cv = document.getElementById('game');
    var down = null;
    cv.addEventListener('pointerdown', function (e) { Au.unlock(); down = { x: e.clientX, y: e.clientY }; });
    cv.addEventListener('pointerup', function (e) {
      if (!down) return;
      var moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved < 16) tap(e.clientX, e.clientY);
    });
    cv.addEventListener('pointermove', function (e) {
      if (App.scene !== 'game' || !App.game) return;
      var w = App.renderer.toWorld(e.clientX, e.clientY);
      if (UI.aiming) UI.aim = w;
      var hot = UI.aiming || App.game.spotAt(w.x, w.y) || App.game.spotAt(w.x, w.y + 34);
      cv.style.cursor = hot ? 'pointer' : 'default';
    });
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    document.getElementById('btn-pause').addEventListener('click', function (e) { e.stopPropagation(); Au.play('click'); App.pause(); });
    document.getElementById('btn-speed').addEventListener('click', function (e) { e.stopPropagation(); Au.play('click'); App.toggleSpeed(); });
    document.getElementById('btn-wave').addEventListener('click', function (e) { e.stopPropagation(); Au.unlock(); App.callWave(); });

    window.addEventListener('keydown', function (e) {
      if (App.scene !== 'game' || !App.game) return;
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (UI.aiming) UI.stopAim();
        else if (UI.radialKind) UI.closeRadial();
        else if (App.paused && document.getElementById('scr-pause')) App.resume();
        else App.pause();
        e.preventDefault();
      } else if (App.paused) return;
      else if (e.key === ' ') { App.callWave(); e.preventDefault(); }
      else if (e.key === 'v' || e.key === 'V' || e.key === 'f' || e.key === 'F') App.toggleSpeed();
      else if (e.key >= '1' && e.key <= '4') { var id = PT.POWER_ORDER[+e.key - 1]; if (App.game.powers[id]) App.triggerPower(id); }
    });

    document.addEventListener('visibilitychange', function () { if (document.hidden) App.pause(); });
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });
  }

  function tap(cx, cy) {
    if (App.scene !== 'game' || !App.game || App.paused) return;
    var g = App.game, w = App.renderer.toWorld(cx, cy);
    if (g.state === 'won' || g.state === 'lost') return;
    if (UI.aiming) {
      if (w.x > 0 && w.x < PT.WORLD.W && w.y > PT.WORLD.WALL && w.y < PT.WORLD.H) {
        g.usePower(UI.aiming, w.x, w.y);
        UI.stopAim();
      }
      return;
    }
    var spot = g.spotAt(w.x, w.y) || g.spotAt(w.x, w.y + 34);
    if (spot) {
      if ((spot.tower && UI.selectedTower === spot.tower) || (!spot.tower && UI.selectedSpot === spot)) { UI.closeRadial(); return; }
      Au.play('click');
      if (spot.tower) UI.openTower(spot.tower); else UI.openBuild(spot);
    } else UI.closeRadial();
  }

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    App.renderer.resize(w, h);
    var u = Math.max(0.58, Math.min(1.25, Math.min(w / 1280, h / 720) * 1.3));
    App.u = u;
    document.documentElement.style.setProperty('--u', u + 'px');
    UI.closeRadial();
    // Téléphone tenu en portrait : l'écran « tournez votre téléphone » s'affiche, on met en pause.
    if (matchMedia('(orientation: portrait) and (pointer: coarse)').matches) App.pause();
  }

  /* ---------- Démarrage ---------- */
  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    App.save = loadSave();
    // Sauvegarde d’une ancienne version : si les talents coûtent plus que les étoiles gagnées, on rembourse tout
    // Passage à 5 étoiles par salle : on convertit les anciennes notes sur 3
    if (App.save.starScale !== 5) {
      var conv = { 1: 1, 2: 3, 3: 5 };
      for (var sid in App.save.stars) App.save.stars[sid] = conv[App.save.stars[sid]] || App.save.stars[sid];
      App.save.starScale = 5; App.persist();
    }
    if (App.save.talents !== 3 || App.starsSpent() > App.starsTotal()) {
      var had = Object.keys(App.save.upgrades).length > 0;
      App.save.upgrades = {}; App.save.talents = 3; App.persist();
      if (had) setTimeout(function () { UI.toast('Nouvel Atelier !', 'Vos étoiles vous sont rendues'); }, 800);
    }
    Au.musicOn = App.save.music; Au.sfxOn = App.save.sfx;
    App.renderer = new PT.Renderer(document.getElementById('game'));
    resize();
    makeDemo();
    bindInput();
    UI.showTitle();
    Au.music('menu');
    requestAnimationFrame(frame);
    // L'audio ne peut démarrer qu'après une interaction.
    var unlock = function () { Au.unlock(); Au.setMusic(App.save.music); Au.setSfx(App.save.sfx); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  function whenFontsReady(cb) {
    var done = false, go = function () { if (!done) { done = true; cb(); } };
    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load('20px "Lilita One"'), document.fonts.load('800 16px "Nunito"')]).then(go, go);
      setTimeout(go, 1800);
    } else go();
  }

  document.addEventListener('DOMContentLoaded', function () { whenFontsReady(boot); });
})(globalThis.PT = globalThis.PT || {});
