/* Pas Touche ! — dessins cartoon procéduraux (personnages, défenses, décor, trésors, icônes).
   Tout est dessiné en Canvas 2D avec un contour encré, aucune image externe. */
(function (PT) {
  'use strict';

  var INK = '#2a1c16';
  var TAU = Math.PI * 2;
  var A = PT.Art = {};
  A.INK = INK;
  A.FONT = '"Lilita One", "Arial Black", Impact, sans-serif';

  /* ---------- Utilitaires ---------- */
  A.shade = function (hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };
  var shade = A.shade;

  A.rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, TAU); }
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.abs(r), 0, TAU); }
  function fs(c, fill, lw) {
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (lw !== 0) { c.lineWidth = lw || 2.6; c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
  }
  function shadow(c, x, y, rx, ry, a) { c.fillStyle = 'rgba(25,12,6,' + (a || 0.25) + ')'; ell(c, x, y, rx, ry); c.fill(); }
  function line(c, x1, y1, x2, y2, col, lw) {
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
    c.strokeStyle = col || INK; c.lineWidth = lw || 2.6; c.lineCap = 'round'; c.stroke();
  }
  function starPath(c, x, y, r, ri, n) {
    n = n || 5; ri = ri || r * 0.45;
    c.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var a = -Math.PI / 2 + i * Math.PI / n, rad = i % 2 ? ri : r;
      c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    c.closePath();
  }
  A.rr = rr; A.ell = ell; A.circ = circ; A.fs = fs; A.shadow = shadow; A.line = line; A.starPath = starPath;

  /* ---------- Personnages ---------- */
  var SKINS = ['#f6d3b3', '#eab38c', '#c98c62', '#9b6545', '#f1c39c', '#7a4a32'];
  var SHIRTS = ['#f39c34', '#2fb3c7', '#e8506a', '#7bc043', '#f4d03f', '#9b6bd6'];

  var LOOKS = {
    voleur: { shirt: '#f5f1e8', stripe: '#26325f', pants: '#2b2b3a', hat: 'beanie', hatColor: '#2b2b3a', mask: true, w: 22 },
    pickpocket: { shirt: '#4f9a46', pants: '#5a4632', hat: 'cap', hatColor: '#80603e', mask: true, scarf: '#d8402f', w: 20 },
    costaud: { shirt: '#e7e0d0', stripe: '#b8343d', pants: '#3a3550', hat: 'bald', mask: true, mustache: '#3a2418', w: 32, big: true },
    ombre: { shirt: '#24212f', pants: '#24212f', hat: 'ninja', hatColor: '#24212f', band: '#d0313c', w: 20, skin: '#24212f', eyesOnly: true },
    acrobate: { shirt: '#8e44ad', harlequin: '#f4c430', pants: '#8e44ad', hat: 'hair', hair: '#e2583e', mask: true, w: 19 },
    hackeuse: { shirt: '#2f8f5b', pants: '#30344a', hat: 'hood', hatColor: '#2f8f5b', glasses: true, laptop: true, w: 22, hair: '#3b2a20' },
    touriste: { flowers: true, pants: '#dcc79e', shorts: true, hat: 'straw', hatColor: '#e9c46a', sunglasses: true, cameraNeck: true, w: 22 },
    faussaire: { flowers: true, pants: '#dcc79e', shorts: true, hat: 'straw', hatColor: '#e9c46a', sunglasses: true, cameraNeck: true, w: 22 },
    gentleman: { shirt: '#22222c', vest: '#f5f1e8', pants: '#22222c', hat: 'top', hatColor: '#1b1b22', cape: '#6b2d8f', monocle: true, mustache: '#2a1a12', cane: true, w: 24, skin: '#f2cfae' },
    chevalier: { shirt: '#c3cad4', pants: '#8f98a6', hat: 'helmet', hatColor: '#d3d9e1', plume: '#c0392b', plates: true, tabard: '#b8283a', w: 25, skin: '#c3cad4' },
    illusionniste: { shirt: '#3b2a7a', stars: '#f4d03f', pants: '#2a1d5a', hat: 'wizard', hatColor: '#5b3fa8', wand: true, mustache: '#efeff5', w: 22 },
  };
  LOOKS.reflet = LOOKS.illusionniste;
  A.LOOKS = LOOKS;

  // Dessine un personnage debout, pieds en (0,0). o : { phase, face, size, flash, carrying, grab, alpha, id, revealed, t }
  A.person = function (c, type, o) {
    var L = LOOKS[type] || LOOKS.voleur;
    var id = o.id || 0;
    var skin = L.skin || SKINS[id % SKINS.length];
    var shirt = L.shirt || SHIRTS[(id * 7) % SHIRTS.length];
    var flash = o.flash;
    var col = function (x) { return flash ? '#ffffff' : x; };
    var w = L.w, ph = o.phase || 0, sw = Math.sin(ph), t = o.t || 0;
    var moving = o.moving !== false;
    var bob = moving ? Math.abs(Math.sin(ph)) * 2 : 0;

    c.save();
    c.scale((o.face || 1) * (o.size || 1), o.size || 1);
    shadow(c, 0, 0, w * 0.7, 5);

    // Cape du Gentleman (derrière)
    if (L.cape) {
      c.beginPath();
      c.moveTo(-8, -38 - bob); c.quadraticCurveTo(-26 - sw * 2, -10, -20, -2); c.lineTo(10, -4); c.quadraticCurveTo(4, -20, 8, -38 - bob);
      fs(c, col(L.cape));
    }
    // Sac de butin (derrière)
    if (o.carrying) {
      var n = Math.min(o.carrying, 3);
      for (var s = 0; s < n; s++) {
        var sx = -w / 2 - 6 - s * 6, sy = -30 - bob - s * 9, sr = L.big ? 12 : 10;
        circ(c, sx, sy, sr); fs(c, col('#9a6b3c'));
        c.beginPath(); c.moveTo(sx - 3, sy - sr + 1); c.lineTo(sx, sy - sr - 5); c.lineTo(sx + 3, sy - sr + 1); fs(c, col('#9a6b3c'), 2);
        starPath(c, sx + 1, sy + 2, 4.5, 2); fs(c, col('#ffd447'), 1.4);
      }
    }

    // Jambes
    var legH = L.big ? 14 : 13;
    var l1 = moving ? Math.max(0, sw) * 3.5 : 0, l2 = moving ? Math.max(0, -sw) * 3.5 : 0;
    var legW = L.big ? 8 : 6, lx = L.big ? 7 : 5;
    rr(c, -lx - legW / 2, -legH - l1, legW, legH - 1, 3); fs(c, col(L.shorts ? skin : L.pants), 2.2);
    rr(c, lx - legW / 2, -legH - l2, legW, legH - 1, 3); fs(c, col(L.shorts ? skin : L.pants), 2.2);
    if (L.shorts) {
      rr(c, -w / 2 + 1, -18 - bob, w - 2, 8, 3); fs(c, col(L.pants), 2.2);
    }
    ell(c, -lx + 1.5, -2 - l1, 5, 3.2); fs(c, col('#3a2a22'), 2);
    ell(c, lx + 1.5, -2 - l2, 5, 3.2); fs(c, col('#3a2a22'), 2);

    // Torse
    var ty = -36 - bob, th = 24;
    rr(c, -w / 2, ty, w, th, 8); fs(c, col(shirt), 0);
    if (!flash) {
      c.save(); rr(c, -w / 2, ty, w, th, 8); c.clip();
      if (L.stripe) { c.fillStyle = L.stripe; for (var yy = ty + 3; yy < ty + th; yy += 6) c.fillRect(-w / 2, yy, w, 2.6); }
      if (L.harlequin) {
        c.fillStyle = L.harlequin;
        for (var hx = -w / 2; hx < w / 2; hx += 8) for (var hy = ty; hy < ty + th; hy += 10) {
          c.beginPath(); c.moveTo(hx + 4, hy); c.lineTo(hx + 8, hy + 5); c.lineTo(hx + 4, hy + 10); c.lineTo(hx, hy + 5); c.fill();
        }
      }
      if (L.flowers) {
        c.fillStyle = 'rgba(255,255,255,0.85)';
        for (var f = 0; f < 6; f++) { circ(c, -w / 2 + 4 + (f * 7) % (w - 4), ty + 5 + ((f * 11) % (th - 6)), 2.2); c.fill(); }
      }
      if (L.plates) {
        c.fillStyle = L.tabard; c.fillRect(-5, ty, 10, th);
        c.fillStyle = '#f2c14e'; c.fillRect(-5, ty + 9, 10, 2.5);
        c.fillStyle = 'rgba(42,28,22,0.28)'; for (var py = ty + 7; py < ty + th; py += 7) { c.fillRect(-w / 2, py, w / 2 - 5, 1.6); c.fillRect(5, py, w / 2 - 5, 1.6); }
        c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(-w / 2 + 3, ty + 3, 2.6, th - 8);
      }
      if (L.stars) {
        c.fillStyle = L.stars;
        for (var sk = 0; sk < 5; sk++) { starPath(c, -w / 2 + 4 + (sk * 9) % (w - 6), ty + 5 + ((sk * 13) % (th - 8)), 2.8, 1.2); c.fill(); }
      }
      if (L.vest) { c.fillStyle = L.vest; c.beginPath(); c.moveTo(-4, ty); c.lineTo(4, ty); c.lineTo(0, ty + 14); c.fill(); c.fillStyle = '#c0392b'; c.beginPath(); c.moveTo(-3, ty + 2); c.lineTo(3, ty + 2); c.lineTo(0, ty + 6); c.fill(); }
      c.restore();
    }
    rr(c, -w / 2, ty, w, th, 8); fs(c, null, 2.6);
    if (L.scarf) { rr(c, -w / 2 + 1, ty - 2, w - 2, 6, 3); fs(c, col(L.scarf), 2); rr(c, -w / 2 - 2, ty + 2, 6, 10, 3); fs(c, col(L.scarf), 2); }

    // Bras
    var armR = L.big ? 7 : 4.2, armL = L.big ? 11 : 8;
    var swing = moving ? sw * 0.55 : 0;
    var armsUp = o.grab;
    [-1, 1].forEach(function (side) {
      c.save();
      c.translate(side * (w / 2 + 0.5), ty + 6);
      c.rotate(armsUp ? side * -2.6 : side * 0.15 + (side > 0 ? swing : -swing));
      rr(c, -armR, 0, armR * 2, armL + 4, armR); fs(c, col(L.shirt ? shirt : shirt), 2.2);
      circ(c, 0, armL + 4, armR * 0.85); fs(c, col(L.gloves || L.cane ? '#ffffff' : skin), 2);
      c.restore();
    });
    if (L.plates) {
      // épaulières
      ell(c, -w / 2, ty + 4, 7, 5); fs(c, col(L.hatColor), 2); ell(c, w / 2, ty + 4, 7, 5); fs(c, col(L.hatColor), 2);
    }
    if (L.wand) {
      line(c, w / 2 + 1, ty + 19, w / 2 + 11, ty + 3, col(INK), 3.2);
      line(c, w / 2 + 9, ty + 6, w / 2 + 11, ty + 3, col('#ffffff'), 2.6);
      if (!flash) { starPath(c, w / 2 + 12, ty + 1, 4.5 + Math.sin(t * 9) * 1.3, 1.7, 4); fs(c, '#fff36b', 1.2); }
    }
    if (L.cane) { line(c, w / 2 + 3, ty + 16, w / 2 + 10, -1, col('#1b1b22'), 3); circ(c, w / 2 + 3, ty + 15, 3); fs(c, col('#f2c14e'), 1.5); }
    if (L.laptop) {
      c.save(); c.translate(4, ty + 13);
      rr(c, -3, -2, 18, 11, 2); fs(c, col('#3a3f55'), 2);
      if (!flash) { c.fillStyle = 'rgba(90,220,255,' + (0.6 + Math.sin(t * 9) * 0.3) + ')'; c.fillRect(-1, 0, 14, 7); }
      c.restore();
    }
    if (L.cameraNeck) { line(c, -4, ty + 1, 0, ty + 9, INK, 1.4); line(c, 4, ty + 1, 0, ty + 9, INK, 1.4); rr(c, -5, ty + 8, 10, 7, 2); fs(c, col('#30303a'), 1.6); circ(c, 0, ty + 11.5, 2.2); fs(c, col('#8fd3ff'), 1); }

    // Tête
    var hr = L.big ? 12 : 11, hy = ty - hr + 2;
    if (L.hat === 'hood') { circ(c, -2, hy, hr + 4); fs(c, col(shade(L.hatColor, -0.15))); }
    circ(c, 0, hy, hr); fs(c, col(skin));
    if (L.hat === 'hair') { c.beginPath(); c.arc(0, hy, hr, Math.PI * 1.05, Math.PI * 1.95); c.quadraticCurveTo(-4, hy - hr - 9, -12, hy - 4); fs(c, col(L.hair), 2.2); }
    if (L.hat === 'hood') { c.beginPath(); c.arc(-2, hy, hr + 4, Math.PI * 0.65, Math.PI * 1.75); c.arc(1, hy, hr - 1, Math.PI * 1.6, Math.PI * 0.8, true); c.closePath(); fs(c, col(L.hatColor), 2.2); }

    if (L.hat === 'helmet') {
      // Heaume : un seau d'acier avec une fente pour les yeux, et un plumet
      c.beginPath(); c.moveTo(-1, hy - hr - 2); c.quadraticCurveTo(-12, hy - hr - 16, -20 - sw, hy - hr + 3); c.quadraticCurveTo(-10, hy - hr - 6, -1, hy - hr - 2); fs(c, col(L.plume), 2);
      rr(c, -hr - 1, hy - hr - 2, hr * 2 + 2, hr * 2 + 3, 6); fs(c, col(L.hatColor));
      c.fillStyle = INK; c.fillRect(-hr + 3, hy - 3.5, hr * 2 - 5, 3.6);
      circ(c, 3, hy - 1.7, 1.3); circ(c, 8.5, hy - 1.7, 1.3); c.fillStyle = '#ffffff'; c.fill();
      c.fillStyle = 'rgba(42,28,22,0.45)'; for (var hb = 0; hb < 3; hb++) { circ(c, 4 + hb * 3, hy + 5, 0.9); c.fill(); }
      line(c, 0, hy - hr - 1, 0, hy - 4, 'rgba(42,28,22,0.35)', 1.4);
      if (!flash) { c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(-hr + 2, hy - hr + 1, 3, hr); }
    } else if (L.eyesOnly) {
      // Cagoule de ninja : seule une fente laisse voir les yeux
      rr(c, -6, hy - 4, 16, 6, 3); fs(c, col('#f2d3b3'), 1.6);
      circ(c, 1, hy - 1, 1.6); circ(c, 7, hy - 1, 1.6); c.fillStyle = INK; c.fill();
      rr(c, -hr, hy - 9, hr * 2, 4, 2); fs(c, col(L.band), 1.6);
      var flow = Math.sin(t * 10) * 3;
      c.beginPath(); c.moveTo(-hr + 1, hy - 7); c.quadraticCurveTo(-hr - 8, hy - 10 + flow, -hr - 14, hy - 4 + flow); fs(c, null, 0);
      c.strokeStyle = col(L.band); c.lineWidth = 3.4; c.stroke();
    } else {
      if (L.mask || o.revealed) { rr(c, -hr + 0.5, hy - 5, hr * 2 - 1, 7, 3); fs(c, col('#1d1b26'), 1.4); }
      if (L.sunglasses && !o.revealed) {
        rr(c, -2, hy - 4, 7, 5, 2); fs(c, col('#1d1b26'), 1.2); rr(c, 6, hy - 4, 6, 5, 2); fs(c, col('#1d1b26'), 1.2);
      } else {
        circ(c, 1.5, hy - 1.5, 2.8); fs(c, '#fff', 1.2);
        circ(c, 7.5, hy - 1.5, 2.6); fs(c, '#fff', 1.2);
        circ(c, 2.6, hy - 1.2, 1.3); circ(c, 8.4, hy - 1.2, 1.3); c.fillStyle = INK; c.fill();
      }
      if (L.glasses) { c.beginPath(); c.arc(1.5, hy - 1.5, 3.6, 0, TAU); c.moveTo(11.1, hy - 1.5); c.arc(7.5, hy - 1.5, 3.6, 0, TAU); c.lineWidth = 1.3; c.strokeStyle = INK; c.stroke(); }
      if (L.monocle) { circ(c, 7.5, hy - 1.5, 4); c.lineWidth = 1.6; c.strokeStyle = '#f2c14e'; c.stroke(); line(c, 7.5, hy + 2.5, 5, hy + 10, '#f2c14e', 1); }
      // Bouche : sourire narquois, ou bouche ronde de surprise quand il porte le butin
      c.beginPath();
      if (o.carrying || o.grab) { circ(c, 5, hy + 5, 1.8); c.fillStyle = INK; c.fill(); }
      else { c.moveTo(1, hy + 4.5); c.quadraticCurveTo(5, hy + 7, 9, hy + 3.5); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke(); }
      if (L.mustache || (o.revealed && type === 'faussaire')) {
        var mc = L.mustache || '#3a2418';
        c.beginPath(); c.ellipse(2.5, hy + 3, 4, 2, -0.2, 0, TAU); c.ellipse(8, hy + 3, 4, 2, 0.2, 0, TAU); fs(c, col(mc), 1.2);
      }
    }

    // Chapeaux
    if (L.hat === 'beanie') {
      c.beginPath(); c.arc(0, hy - 2, hr + 0.5, Math.PI, 0); c.closePath(); fs(c, col(L.hatColor), 2.2);
      rr(c, -hr - 1, hy - 5, hr * 2 + 2, 5, 2); fs(c, col(shade(L.hatColor, 0.2)), 2);
      circ(c, -2, hy - hr - 4, 3.6); fs(c, col('#d8402f'), 1.8);
    } else if (L.hat === 'cap') {
      c.beginPath(); c.arc(0, hy - 2, hr, Math.PI, 0); c.closePath(); fs(c, col(L.hatColor), 2.2);
      ell(c, hr - 1, hy - 3, 7, 2.6); fs(c, col(shade(L.hatColor, -0.2)), 2);
    } else if (L.hat === 'bald') {
      if (!flash) { c.fillStyle = 'rgba(255,255,255,0.45)'; ell(c, -3, hy - 7, 4, 2, -0.4); c.fill(); }
    } else if (L.hat === 'straw') {
      ell(c, 0, hy - 6, hr + 7, 4); fs(c, col(L.hatColor), 2);
      rr(c, -7, hy - 15, 14, 9, 4); fs(c, col(L.hatColor), 2);
      c.fillStyle = col('#d8402f'); c.fillRect(-7, hy - 9, 14, 2.5);
    } else if (L.hat === 'wizard') {
      ell(c, 0, hy - 7, hr + 6, 3.6); fs(c, col(L.hatColor), 2);
      c.beginPath(); c.moveTo(-hr + 1, hy - 8); c.quadraticCurveTo(-3, hy - 26, 7 - sw * 1.5, hy - 34); c.quadraticCurveTo(3, hy - 20, hr - 1, hy - 8); c.closePath(); fs(c, col(L.hatColor), 2.2);
      starPath(c, 0, hy - 16, 3.8, 1.6); fs(c, col(L.stars), 1.2);
    } else if (L.hat === 'top') {
      ell(c, 0, hy - 8, hr + 4, 3.4); fs(c, col(L.hatColor), 2);
      rr(c, -8, hy - 26, 16, 18, 2); fs(c, col(L.hatColor), 2.2);
      c.fillStyle = col('#6b2d8f'); c.fillRect(-8, hy - 13, 16, 3.5);
    }
    c.restore();
  };

  /* ---------- Socle des défenses ---------- */
  A.pedestal = function (c, level, accent, disabled) {
    shadow(c, 0, 8, 36, 12, 0.3);
    rr(c, -29, -16, 58, 24, 5); fs(c, disabled ? '#8d8d96' : '#e9e2d3');
    ell(c, 0, -16, 29, 9); fs(c, disabled ? '#a6a6ae' : '#f7f2e6');
    c.fillStyle = accent; c.fillRect(-27, -2, 54, 4);
    rr(c, -29, -16, 58, 24, 5); fs(c, null, 2.4);
    for (var i = 0; i <= level; i++) {
      starPath(c, (i - level / 2) * 13, 3, 5.2, 2.3);
      fs(c, '#ffd447', 1.4);
    }
  };

  /* ---------- Défenses ---------- */
  // t : { level, aim, face, fireT, lungeT, lx, ly, disabled, time, x, y, beamOn }
  A.tower = function (c, type, t) {
    var lv = t.level || 0, time = t.time || 0, def = PT.TOWERS[type];
    A.pedestal(c, lv, def.color, t.disabled);
    c.save();
    c.translate(0, -18);
    if (type === 'gardien') drawGuard(c, t, lv, time);
    else if (type === 'glu') drawGlue(c, t, lv, time);
    else if (type === 'camera') drawCamera(c, t, lv, time);
    else if (type === 'chien') drawDog(c, t, lv, time);
    else if (type === 'filet') drawNetGun(c, t, lv, time);
    else if (type === 'laser') drawLaser(c, t, lv, time);
    else if (type === 'canon') drawCanon(c, t, lv, time);
    c.restore();
    if (t.disabled) {
      c.save();
      c.strokeStyle = '#6fe3ff'; c.lineWidth = 2.4; c.lineCap = 'round';
      for (var i = 0; i < 2; i++) {
        var bx = (i ? 16 : -18) + Math.sin(time * 30 + i) * 2, by = -50 - i * 8;
        c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + 5, by + 6); c.lineTo(bx - 1, by + 9); c.lineTo(bx + 4, by + 16); c.stroke();
      }
      c.font = '20px ' + A.FONT; c.textAlign = 'center'; c.fillStyle = '#ffffff'; c.strokeStyle = INK; c.lineWidth = 4;
      c.strokeText('?', 0, -70 + Math.sin(time * 6) * 2); c.fillText('?', 0, -70 + Math.sin(time * 6) * 2);
      c.restore();
    }
  };

  function drawGuard(c, t, lv, time) {
    var face = t.face || 1, throwing = t.fireT > 0;
    c.save(); c.scale(face, 1);
    var breathe = Math.sin(time * 2.4) * 0.8;
    // jambes
    rr(c, -8, -14, 7, 14, 3); fs(c, '#22346e', 2.2);
    rr(c, 1, -14, 7, 14, 3); fs(c, '#22346e', 2.2);
    ell(c, -4, -1, 5.5, 3); fs(c, '#1d1b26', 2); ell(c, 5, -1, 5.5, 3); fs(c, '#1d1b26', 2);
    // corps
    rr(c, -13, -40 + breathe, 26, 28, 9); fs(c, '#2f4fa8');
    c.fillStyle = '#1d1b26'; c.fillRect(-12, -18 + breathe, 24, 4);
    starPath(c, -5, -30 + breathe, 4.5, 2); fs(c, lv >= 2 ? '#ffd447' : '#d9dde6', 1.4);
    if (lv >= 1) { rr(c, -16, -40 + breathe, 9, 5, 2); fs(c, '#ffd447', 1.6); rr(c, 7, -40 + breathe, 9, 5, 2); fs(c, '#ffd447', 1.6); }
    if (lv >= 2) { circ(c, 5, -27 + breathe, 3.2); fs(c, '#e74c3c', 1.4); }
    // bras + matraque
    c.save();
    c.translate(11, -34 + breathe);
    c.rotate(throwing ? -2.2 + (0.25 - t.fireT) * 8 : 0.25);
    rr(c, -4, 0, 8, 15, 4); fs(c, '#2f4fa8', 2.2);
    circ(c, 0, 16, 3.6); fs(c, '#f1c39c', 1.8);
    if (!throwing) { rr(c, -2, 14, 4, 16, 2); fs(c, '#1d1b26', 1.8); }
    c.restore();
    rr(c, -15, -36 + breathe, 7, 14, 3.5); fs(c, '#2f4fa8', 2.2);
    // tête
    var hy = -50 + breathe;
    circ(c, 0, hy, 11); fs(c, '#f1c39c');
    circ(c, 3, hy - 1, 2.4); fs(c, '#fff', 1.2); circ(c, 8, hy - 1, 2.2); fs(c, '#fff', 1.2);
    circ(c, 3.8, hy - 0.8, 1.1); circ(c, 8.7, hy - 0.8, 1.1); c.fillStyle = INK; c.fill();
    var mw = lv >= 2 ? 6 : 5;
    c.beginPath(); c.ellipse(2, hy + 4, mw, 2.6, -0.25, 0, TAU); c.ellipse(9, hy + 4, mw - 1, 2.4, 0.25, 0, TAU); fs(c, '#6b4226', 1.4);
    // képi
    rr(c, -11, hy - 15, 22, 9, 3); fs(c, lv >= 2 ? '#1d2c66' : '#22346e', 2.2);
    ell(c, 6, hy - 5, 10, 3); fs(c, '#1d1b26', 2);
    c.fillStyle = lv >= 2 ? '#ffd447' : '#d9dde6'; c.fillRect(-11, hy - 8.5, 22, 2.4);
    circ(c, 1, hy - 11, 2.8); fs(c, '#ffd447', 1.2);
    c.restore();
  }

  function drawGlue(c, t, lv, time) {
    var s = 1 + lv * 0.08;
    c.save(); c.scale(s, s);
    // tonneau
    rr(c, -16, -36, 32, 36, 8); fs(c, '#4a9b33');
    c.fillStyle = lv >= 2 ? '#ffd447' : '#7f8a8f';
    c.fillRect(-16, -30, 32, 3.5); c.fillRect(-16, -9, 32, 3.5);
    rr(c, -16, -36, 32, 36, 8); fs(c, null, 2.4);
    c.font = '9px ' + A.FONT; c.textAlign = 'center'; c.fillStyle = '#e8ffd9'; c.fillText('GLU', 0, -15);
    // glu qui bouillonne
    ell(c, 0, -36, 14, 5); fs(c, '#8be05f', 2.2);
    for (var i = 0; i < 3; i++) {
      var bp = (time * 1.4 + i * 0.37) % 1;
      circ(c, -8 + i * 8, -38 - bp * 10, 2.6 * (1 - bp) + 1); fs(c, '#a9f07f', 1.4);
    }
    // goutte qui coule
    var drip = (Math.sin(time * 2) + 1) * 4;
    c.beginPath(); c.moveTo(-10, -34); c.quadraticCurveTo(-13, -26 + drip, -10, -22 + drip); c.quadraticCurveTo(-7, -26 + drip, -8, -34); fs(c, '#8be05f', 1.6);
    // buse orientée vers la cible
    c.save();
    c.translate(0, -40);
    c.rotate(t.aim || 0);
    var rec = t.fireT > 0 ? -t.fireT * 12 : 0;
    rr(c, 2 + rec, -4, 18, 8, 3); fs(c, '#7f8a8f', 2);
    c.restore();
    c.restore();
  }

  function drawCamera(c, t, lv, time) {
    // poteau
    rr(c, -3, -46, 6, 46, 2); fs(c, '#9aa3ad', 2.2);
    c.save();
    c.translate(0, -48);
    var a = t.aim || 0, flip = Math.cos(a) < 0 ? -1 : 1;
    c.scale(flip, 1);
    var tilt = Math.max(-0.7, Math.min(0.7, Math.sin(a) * 0.7));
    c.rotate(tilt * flip);
    rr(c, -8, -9, 28, 16, 4); fs(c, lv >= 2 ? '#2b2f3a' : '#f2f4f7');
    rr(c, 18, -6, 7, 10, 2); fs(c, '#3a3f55', 2);
    circ(c, 25, -1, 3.6); fs(c, '#69c9ff', 1.6);
    if (lv >= 1) { rr(c, -6, -14, 18, 5, 2); fs(c, '#4fb6e8', 1.8); }
    var blink = Math.sin(time * 6) > 0;
    circ(c, -3, -3, 2.4); c.fillStyle = blink && !t.disabled ? '#ff3b3b' : '#6b2222'; c.fill();
    c.restore();
    if (lv >= 2) { line(c, 0, -58, 0, -72, '#9aa3ad', 2); circ(c, 0, -73, 3); fs(c, '#ff3b3b', 1.4); }
  }

  function drawDog(c, t, lv, time) {
    var face = t.face || 1;
    var lunge = t.lungeT > 0 ? Math.sin((t.lungeT / 0.25) * Math.PI) : 0;
    var ox = 0, oy = 0;
    if (lunge) { var dx = t.lx - t.x, dy = t.ly - t.y, d = Math.hypot(dx, dy) || 1; ox = dx / d * 16 * lunge; oy = dy / d * 8 * lunge; }
    // coussin
    ell(c, 0, -4, 24, 8); fs(c, '#c0392b');
    c.save();
    c.translate(ox, oy);
    c.scale(face, 1);
    var pant = Math.sin(time * 8) * 1;
    // corps
    ell(c, -4, -16, 18, 13); fs(c, '#d8a066');
    ell(c, -16, -6, 6, 4); fs(c, '#d8a066', 2); ell(c, 6, -5, 6, 4); fs(c, '#d8a066', 2);
    // tête
    var hx = 10, hy = -26 + pant * 0.5;
    ell(c, hx, hy, 15, 12); fs(c, '#e2b07a');
    ell(c, hx + 6, hy + 5, 10, 7); fs(c, '#f2d2a8', 2);
    // oreilles
    ell(c, hx - 9, hy - 10, 5, 4, -0.5); fs(c, '#7a4b2a', 2); ell(c, hx + 5, hy - 12, 5, 4, 0.4); fs(c, '#7a4b2a', 2);
    // yeux grincheux
    circ(c, hx - 1, hy - 3, 2.6); fs(c, '#fff', 1.2); circ(c, hx + 7, hy - 3, 2.6); fs(c, '#fff', 1.2);
    circ(c, hx, hy - 2.5, 1.2); circ(c, hx + 8, hy - 2.5, 1.2); c.fillStyle = INK; c.fill();
    line(c, hx - 4, hy - 7, hx + 1, hy - 5.5, INK, 2); line(c, hx + 10, hy - 7, hx + 5, hy - 5.5, INK, 2);
    // museau + crocs
    ell(c, hx + 9, hy + 1, 3, 2.2); c.fillStyle = INK; c.fill();
    var open = lunge > 0 ? 5 : 1.5;
    rr(c, hx + 1, hy + 6, 14, open + 2, 2); fs(c, '#7a1f2b', 1.6);
    c.fillStyle = '#fff'; c.fillRect(hx + 3, hy + 5, 2.5, 3); c.fillRect(hx + 11, hy + 5, 2.5, 3);
    // collier
    rr(c, hx - 12, hy + 8, 18, 5, 2); fs(c, '#1d1b26', 1.6);
    for (var i = 0; i < 3; i++) { c.beginPath(); c.moveTo(hx - 9 + i * 6, hy + 8); c.lineTo(hx - 7 + i * 6, hy + 4); c.lineTo(hx - 5 + i * 6, hy + 8); fs(c, '#d9dde6', 1.2); }
    if (lv >= 1) { c.beginPath(); c.moveTo(hx - 12, hy + 13); c.lineTo(hx + 4, hy + 13); c.lineTo(hx - 4, hy + 22); c.closePath(); fs(c, '#e74c3c', 1.8); }
    if (lv >= 2) { rr(c, hx - 10, hy - 20, 20, 8, 3); fs(c, '#22346e', 2); ell(c, hx + 6, hy - 12, 8, 2.6); fs(c, '#1d1b26', 1.6); circ(c, hx, hy - 16, 2.2); fs(c, '#ffd447', 1); }
    c.restore();
  }

  function drawNetGun(c, t, lv, time) {
    var barrel = lv >= 2 ? '#c9953c' : lv >= 1 ? '#7b8794' : '#5b6470';
    // affût
    rr(c, -16, -18, 32, 12, 4); fs(c, '#8a5a34');
    circ(c, -11, -6, 8); fs(c, '#6b4226'); circ(c, -11, -6, 2.5); fs(c, '#ffd447', 1.4);
    circ(c, 11, -6, 8); fs(c, '#6b4226'); circ(c, 11, -6, 2.5); fs(c, '#ffd447', 1.4);
    c.save();
    c.translate(0, -24);
    var a = t.aim || 0, flip = Math.cos(a) < 0 ? -1 : 1;
    c.scale(flip, 1);
    var tilt = Math.max(-0.6, Math.min(0.5, Math.sin(a) * 0.6)) * flip - 0.25;
    c.rotate(tilt);
    var rec = t.fireT > 0 ? -t.fireT * 18 : 0;
    // filet roulé à l'arrière
    circ(c, -12 + rec, 0, 9); fs(c, '#c8a46a');
    c.save(); circ(c, -12 + rec, 0, 9); c.clip(); c.strokeStyle = '#7a5a34'; c.lineWidth = 1.2;
    for (var k = -12; k < 12; k += 4) { line(c, -21 + rec + k, -9, -3 + rec + k, 9, '#7a5a34', 1.2); line(c, -3 + rec + k, -9, -21 + rec + k, 9, '#7a5a34', 1.2); }
    c.restore();
    rr(c, -6 + rec, -8, 34, 16, 6); fs(c, barrel);
    rr(c, 24 + rec, -10, 8, 20, 3); fs(c, shade(barrel, -0.2), 2.2);
    c.restore();
  }

  function drawCanon(c, t, lv, time) {
    var metal = lv >= 2 ? '#c9953c' : lv >= 1 ? '#4a5563' : '#3a3f4a';
    if (lv >= 2) {
      // pavillon pirate à l'arrière
      line(c, -15, -20, -15, -64, '#4a2c16', 2.6);
      var wave = Math.sin(time * 4) * 1.5;
      c.beginPath(); c.moveTo(-15, -64); c.lineTo(3, -62 + wave); c.lineTo(3, -51 + wave); c.lineTo(-15, -53); c.closePath(); fs(c, '#1d1b26', 1.8);
      circ(c, -6, -58 + wave * 0.5, 2.6); c.fillStyle = '#ffffff'; c.fill();
      line(c, -10, -54, -2, -56, '#ffffff', 1.2); line(c, -10, -56, -2, -54, '#ffffff', 1.2);
    }
    // affût en bois
    c.beginPath(); c.moveTo(-20, -6); c.lineTo(-14, -24); c.lineTo(14, -24); c.lineTo(20, -6); c.closePath(); fs(c, '#8a5a34');
    line(c, -12, -15, 12, -15, '#6b4226', 1.6);
    [-12, 12].forEach(function (wx) {
      circ(c, wx, -6, 9); fs(c, '#6b4226');
      for (var k = 0; k < 4; k++) { var a = k * Math.PI / 4; line(c, wx - Math.cos(a) * 7.5, -6 - Math.sin(a) * 7.5, wx + Math.cos(a) * 7.5, -6 + Math.sin(a) * 7.5, '#4a2c16', 1.6); }
      circ(c, wx, -6, 2.6); fs(c, '#ffd447', 1.2);
    });
    // fût orienté vers la cible, pointé vers le haut (tir en cloche)
    c.save();
    c.translate(0, -28);
    var a = t.aim || 0, flip = Math.cos(a) < 0 ? -1 : 1;
    c.scale(flip, 1);
    c.rotate(Math.max(-0.45, Math.min(0.3, Math.sin(a) * 0.45)) * flip - 0.38);
    var rec = t.fireT > 0 ? -t.fireT * 22 : 0;
    circ(c, -13 + rec, 0, 9); fs(c, metal);
    rr(c, -13 + rec, -8.5, 38, 17, 8); fs(c, metal);
    rr(c, 21 + rec, -10.5, 8, 21, 3); fs(c, shade(metal, -0.25), 2.2);
    c.fillStyle = lv >= 1 ? '#e3c06a' : shade(metal, 0.3); c.fillRect(-2 + rec, -8, 3.4, 16); c.fillRect(10 + rec, -8, 3.4, 16);
    line(c, -6 + rec, -4, 18 + rec, -4, 'rgba(255,255,255,0.35)', 2.4);
    if (t.fireT > 0) {
      var k2 = 1 - t.fireT / 0.25;
      for (var sm = 0; sm < 3; sm++) { circ(c, 34 + rec + k2 * 20 + sm * 7, -2 - sm * 5 - k2 * 8, 6 + k2 * 6 - sm); c.fillStyle = 'rgba(232,232,238,' + (0.9 * (1 - k2)) + ')'; c.fill(); }
    } else {
      // mèche qui grésille
      line(c, -21 + rec, -3, -25 + rec, -9, '#c8a46a', 2);
      if (Math.sin(time * 17) > 0) { circ(c, -25 + rec, -10, 2.2); c.fillStyle = '#ffb347'; c.fill(); }
    }
    c.restore();
  }

  function drawLaser(c, t, lv, time) {
    rr(c, -15, -18, 30, 18, 5); fs(c, '#596273');
    c.fillStyle = '#ff3d5a'; c.fillRect(-13, -10, 26, 3);
    c.beginPath(); c.arc(0, -18, 16, Math.PI, 0); c.closePath(); fs(c, lv >= 2 ? '#3c4250' : '#8792a3');
    c.save();
    c.translate(0, -26);
    var a = t.aim || 0, flip = Math.cos(a) < 0 ? -1 : 1;
    c.scale(flip, 1);
    c.rotate(Math.max(-0.8, Math.min(0.8, Math.sin(a) * 0.8)) * flip);
    rr(c, -2, -6, 26, 12, 5); fs(c, '#d6dbe3');
    circ(c, 24, 0, 6); fs(c, '#2b2f3a', 2);
    var glow = t.beamOn ? 1 : 0.55 + Math.sin(time * 5) * 0.2;
    circ(c, 24, 0, 3.6); c.fillStyle = 'rgba(255,61,90,' + glow + ')'; c.fill();
    if (lv >= 1) { rr(c, 4, -11, 12, 5, 2); fs(c, '#ff3d5a', 1.6); }
    c.restore();
  }

  /* ---------- Projectiles ---------- */
  A.projectile = function (c, p) {
    c.save();
    if (p.kind === 'matraque') {
      c.translate(p.x, p.y); c.rotate(p.rot);
      rr(c, -9, -2.6, 18, 5.2, 2.5); fs(c, '#1d1b26', 1.6);
      c.fillStyle = '#f5f1e8'; c.fillRect(2, -2.6, 3, 5.2);
    } else {
      var gx = p.sx + (p.tx - p.sx) * (p.k || 0), gy = p.sy + (p.ty - p.sy) * (p.k || 0) + 44;
      shadow(c, gx, gy, 8, 3, 0.18);
      c.translate(p.x, p.y);
      if (p.kind === 'glu') {
        c.rotate(p.rot * 0.3);
        c.beginPath(); c.ellipse(0, 0, 9, 7.5, 0, 0, TAU); fs(c, '#7ed957', 2);
        circ(c, -3, -2.5, 2.4); c.fillStyle = 'rgba(255,255,255,0.75)'; c.fill();
      } else if (p.kind === 'boulet') {
        circ(c, 0, 0, 8.5); fs(c, '#2b2f3a', 2.2);
        circ(c, -2.6, -2.6, 2.8); c.fillStyle = 'rgba(255,255,255,0.55)'; c.fill();
      } else {
        c.rotate(p.rot * 0.5);
        circ(c, 0, 0, 9); fs(c, '#c8a46a', 2);
        line(c, -6, -6, 6, 6, '#7a5a34', 1.4); line(c, 6, -6, -6, 6, '#7a5a34', 1.4); line(c, -9, 0, 9, 0, '#7a5a34', 1.2);
      }
    }
    c.restore();
  };

  /* ---------- Buste (pouvoir) ---------- */
  A.bust = function (c) {
    rr(c, -16, -10, 32, 12, 3); fs(c, '#c9c3b8');
    c.beginPath(); c.moveTo(-20, -12); c.quadraticCurveTo(-18, -30, 0, -30); c.quadraticCurveTo(18, -30, 20, -12); c.closePath(); fs(c, '#efe9df');
    circ(c, 0, -42, 12); fs(c, '#f5f0e8');
    c.beginPath(); c.arc(0, -46, 12.5, Math.PI * 1.05, Math.PI * 1.95); fs(c, '#e2dccf', 2);
    line(c, -4, -41, -1, -41, INK, 1.6); line(c, 3, -41, 6, -41, INK, 1.6);
    line(c, -1, -36, 3, -36, INK, 1.4);
  };

  /* ---------- Trésors ---------- */
  A.treasure = function (c, kind, present, time, alarm) {
    // colonne + coussin
    shadow(c, 0, 10, 46, 14, 0.3);
    rr(c, -30, -34, 60, 44, 6); fs(c, '#efe8da');
    c.fillStyle = '#d8cfbd'; for (var i = -22; i <= 22; i += 11) c.fillRect(i - 2, -30, 4, 36);
    rr(c, -30, -34, 60, 44, 6); fs(c, null, 2.6);
    rr(c, -36, -40, 72, 9, 3); fs(c, '#e2b84a');
    ell(c, 0, -44, 28, 8); fs(c, '#b8283a');
    if (present) {
      var g = c.createRadialGradient(0, -66, 4, 0, -66, 56);
      g.addColorStop(0, 'rgba(255,230,120,' + (0.55 + Math.sin(time * 3) * 0.15) + ')');
      g.addColorStop(1, 'rgba(255,230,120,0)');
      c.fillStyle = g; circ(c, 0, -66, 56); c.fill();
      c.save(); c.translate(0, -48 + Math.sin(time * 2) * 1.5);
      A.treasureItem(c, kind, time);
      c.restore();
    } else {
      c.font = '26px ' + A.FONT; c.textAlign = 'center'; c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 5;
      c.strokeText('?', 0, -56); c.fillText('?', 0, -56);
    }
    // cloche de verre
    c.beginPath(); c.moveTo(-30, -44); c.lineTo(-30, -84); c.quadraticCurveTo(-30, -104, 0, -104); c.quadraticCurveTo(30, -104, 30, -84); c.lineTo(30, -44);
    c.fillStyle = alarm > 0 ? 'rgba(255,60,60,' + (0.18 + 0.15 * Math.sin(time * 20)) + ')' : 'rgba(190,230,255,0.18)'; c.fill();
    c.lineWidth = 2.4; c.strokeStyle = 'rgba(42,28,22,0.75)'; c.stroke();
    c.beginPath(); c.moveTo(-20, -52); c.lineTo(-20, -84); c.quadraticCurveTo(-20, -96, -8, -98);
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 3; c.stroke();
    // gyrophare
    if (alarm > 0) {
      var a = time * 9;
      c.save(); c.translate(0, -108);
      c.fillStyle = 'rgba(255,40,40,0.35)';
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 60, a, a + 0.6); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 60, a + Math.PI, a + Math.PI + 0.6); c.closePath(); c.fill();
      c.restore();
      rr(c, -6, -114, 12, 9, 3); fs(c, '#ff3b3b', 2);
    }
  };

  A.treasureItem = function (c, kind, time) {
    if (kind === 'poule') {
      ell(c, -16, 4, 6, 7.5); fs(c, '#ffe27a', 2); ell(c, 15, 5, 5.5, 7); fs(c, '#ffe27a', 2);
      ell(c, 0, -6, 15, 12); fs(c, '#f2c230');
      c.beginPath(); c.moveTo(-12, -10); c.quadraticCurveTo(-26, -24, -16, -2); fs(c, '#e0a91c', 2);
      circ(c, 9, -20, 8); fs(c, '#f2c230');
      c.beginPath(); c.moveTo(6, -28); c.quadraticCurveTo(9, -34, 11, -28); c.quadraticCurveTo(14, -33, 15, -26); fs(c, '#e74c3c', 1.6);
      c.beginPath(); c.moveTo(16, -21); c.lineTo(23, -19); c.lineTo(16, -16); fs(c, '#f08a24', 1.6);
      circ(c, 11, -22, 1.6); c.fillStyle = INK; c.fill();
    } else if (kind === 'masque') {
      c.beginPath(); c.moveTo(-18, -26); c.lineTo(18, -26); c.lineTo(22, 6); c.lineTo(-22, 6); c.closePath(); fs(c, '#2f6fb0');
      c.fillStyle = '#f2c230'; for (var i = -22; i < 22; i += 7) c.fillRect(i, -24, 3.5, 30);
      c.beginPath(); c.moveTo(-18, -26); c.lineTo(18, -26); c.lineTo(22, 6); c.lineTo(-22, 6); c.closePath(); fs(c, null, 2.2);
      ell(c, 0, -10, 11, 14); fs(c, '#f2c230');
      line(c, -6, -13, -2, -13, INK, 2); line(c, 2, -13, 6, -13, INK, 2);
      rr(c, -2, 2, 4, 9, 2); fs(c, '#2f6fb0', 1.6);
    } else if (kind === 'oeuf') {
      ell(c, 0, 6, 20, 6); fs(c, '#9a7b4a');
      ell(c, 0, -10, 14, 18); fs(c, '#f2ead2');
      c.fillStyle = '#7bb35a';
      [[-5, -18, 3], [5, -8, 4], [-6, -2, 2.5], [6, -22, 2]].forEach(function (s) { circ(c, s[0], s[1], s[2]); c.fill(); });
      ell(c, 0, -10, 14, 18); fs(c, null, 2.2);
    } else if (kind === 'tableau') {
      line(c, -12, 8, -8, -30, '#7a5a34', 3); line(c, 12, 8, 8, -30, '#7a5a34', 3);
      rr(c, -20, -34, 40, 32, 2); fs(c, '#e2b84a');
      c.fillStyle = '#fbfaf5'; c.fillRect(-16, -30, 32, 24);
      c.fillStyle = '#efe6cf'; c.fillRect(-9, -25, 18, 14);
    } else if (kind === 'epee') {
      // Durandouille, plantée dans son rocher
      rr(c, -2.6, -30, 5.2, 26, 2); fs(c, '#e8eef5', 2);
      line(c, 0, -28, 0, -8, 'rgba(110,130,150,0.6)', 1.3);
      rr(c, -12, -34, 24, 5, 2); fs(c, '#f2c230', 2);
      circ(c, 0, -31.5, 1.9); fs(c, '#e74c3c', 1);
      rr(c, -2.4, -44, 4.8, 10, 2); fs(c, '#7a3b2e', 1.8);
      circ(c, 0, -46, 3.6); fs(c, '#f2c230', 1.8);
      c.beginPath(); c.moveTo(-22, 8); c.quadraticCurveTo(-21, -6, -9, -9); c.quadraticCurveTo(0, -14, 10, -8); c.quadraticCurveTo(22, -5, 22, 8); c.closePath(); fs(c, '#9aa0a8');
      c.fillStyle = 'rgba(255,255,255,0.3)'; ell(c, -8, -4, 6, 2.5, -0.3); c.fill();
      c.fillStyle = '#6fa04a'; circ(c, 14, 4, 3); c.fill(); circ(c, 18, 2, 2.4); c.fill();
    } else if (kind === 'coffre') {
      // le coffre de Barbe-à-Papa : couvercle ouvert, pièces d'or… et une barbe à papa
      c.beginPath(); c.moveTo(-20, -14); c.lineTo(-23, -32); c.quadraticCurveTo(0, -42, 23, -32); c.lineTo(20, -14); c.closePath(); fs(c, '#7a4b2a');
      c.fillStyle = '#e3c06a'; c.fillRect(-21, -28, 42, 3);
      line(c, 10, -16, 14, -40, '#f5f1e8', 2);
      [[14, -42, 6], [10, -46, 5], [18, -47, 5], [13, -50, 4.5]].forEach(function (b) { circ(c, b[0], b[1], b[2]); fs(c, '#ff9ecf', 1.6); });
      [[-12, -16], [-4, -18], [4, -17], [-8, -21], [1, -22], [-15, -19], [8, -20]].forEach(function (p) { circ(c, p[0], p[1], 4.2); fs(c, '#f7c948', 1.4); });
      rr(c, -20, -14, 40, 20, 3); fs(c, '#8a5a34');
      c.fillStyle = '#e3c06a'; c.fillRect(-20, -7, 40, 3); c.fillRect(-13, -14, 3, 20); c.fillRect(10, -14, 3, 20);
      rr(c, -20, -14, 40, 20, 3); fs(c, null, 2.2);
      rr(c, -3.5, -10, 7, 8, 1.6); fs(c, '#f2c230', 1.4);
    } else if (kind === 'perruque') {
      // la perruque du Roi-Soleil sur sa tête de bois
      rr(c, -3, -6, 6, 12, 2); fs(c, '#7a4b2a', 1.8); ell(c, 0, 6, 12, 4); fs(c, '#7a4b2a', 2);
      [[-16, -12], [16, -12], [-17, -3], [17, -3], [-14, 5], [14, 5], [-11, -22], [11, -22]].forEach(function (p) { circ(c, p[0], p[1], 6.5); fs(c, '#f5efe2', 1.6); });
      ell(c, 0, -16, 8, 10); fs(c, '#e9d8bf', 2);
      circ(c, -3, -17, 1.2); circ(c, 3, -17, 1.2); c.fillStyle = INK; c.fill();
      [[-9, -28], [0, -32], [9, -28], [-5, -30], [5, -30]].forEach(function (p) { circ(c, p[0], p[1], 6); fs(c, '#f5efe2', 1.6); });
      c.beginPath(); c.moveTo(0, -38); c.lineTo(-7, -43); c.lineTo(-7, -34); c.closePath(); fs(c, '#3b5bd6', 1.4);
      c.beginPath(); c.moveTo(0, -38); c.lineTo(7, -43); c.lineTo(7, -34); c.closePath(); fs(c, '#3b5bd6', 1.4);
    } else if (kind === 'joconde') {
      // la vraie Joconde (celle du Louvre est une copie, chut)
      line(c, -11, 8, -7, -30, '#7a5a34', 3); line(c, 11, 8, 7, -30, '#7a5a34', 3);
      rr(c, -17, -38, 34, 42, 2); fs(c, '#c9953c');
      c.fillStyle = '#5f6b45'; c.fillRect(-13, -34, 26, 34);
      c.fillStyle = '#8a8a5a'; c.fillRect(-13, -34, 26, 8);
      ell(c, 0, -21, 7.5, 9.5); c.fillStyle = '#3a2618'; c.fill();
      ell(c, 0, -22, 4.6, 6); c.fillStyle = '#e2bb8a'; c.fill();
      c.beginPath(); c.moveTo(-1.8, -19); c.quadraticCurveTo(0, -18, 1.8, -19.4); c.lineWidth = 0.9; c.strokeStyle = INK; c.stroke();
      ell(c, 0, -4, 10, 8); c.fillStyle = '#2e2418'; c.fill();
      ell(c, 0, -5, 5, 2.2); c.fillStyle = '#e2bb8a'; c.fill();
      rr(c, -17, -38, 34, 42, 2); fs(c, null, 2.2);
    } else if (kind === 'lingots') {
      var bar = function (x, y) {
        c.beginPath(); c.moveTo(x - 10, y); c.lineTo(x + 10, y); c.lineTo(x + 7, y - 7); c.lineTo(x - 7, y - 7); c.closePath(); fs(c, '#f2c230', 1.8);
        line(c, x - 5, y - 5, x + 4, y - 5, 'rgba(255,255,255,0.75)', 1.4);
      };
      bar(-19, 6); bar(0, 6); bar(19, 6); bar(-9.5, -1); bar(9.5, -1); bar(0, -8);
      c.font = '6px ' + A.FONT; c.textAlign = 'center'; c.fillStyle = '#9a6f12'; c.fillText('RF', 0, -9.5);
    } else if (kind === 'couronne') {
      ell(c, 0, 4, 20, 6); fs(c, '#6b2d8f');
      c.beginPath(); c.moveTo(-17, 0); c.lineTo(-19, -20); c.lineTo(-9, -10); c.lineTo(0, -26); c.lineTo(9, -10); c.lineTo(19, -20); c.lineTo(17, 0); c.closePath(); fs(c, '#f2c230');
      circ(c, 0, -6, 3.6); fs(c, '#e74c3c', 1.6); circ(c, -10, -4, 2.8); fs(c, '#3fa7e0', 1.4); circ(c, 10, -4, 2.8); fs(c, '#4ec27a', 1.4);
      circ(c, 0, -27, 2.6); fs(c, '#fff', 1.2);
    }
    var sp = (time * 1.3) % 1;
    c.save(); c.globalAlpha = 1 - sp;
    starPath(c, 16, -26 - sp * 6, 4 + sp * 3, 1.4, 4); c.fillStyle = '#fff'; c.fill();
    c.restore();
  };

  /* ---------- Décor ---------- */
  A.deco = function (c, d, th) {
    c.save();
    c.translate(d.x, d.y);
    if (d.s) c.scale(d.s, d.s);
    var t = d.t;
    if (t === 'plante') {
      shadow(c, 0, 4, 22, 7);
      for (var i = 0; i < 7; i++) {
        var a = -Math.PI / 2 + (i - 3) * 0.42;
        ell(c, Math.cos(a) * 16, -34 + Math.sin(a) * 18, 7, 15, a + Math.PI / 2); fs(c, i % 2 ? '#4f9e47' : '#3f8a3a', 2);
      }
      c.beginPath(); c.moveTo(-15, -22); c.lineTo(15, -22); c.lineTo(11, 2); c.lineTo(-11, 2); c.closePath(); fs(c, '#c86b3c');
      c.fillStyle = '#a95730'; c.fillRect(-15, -22, 30, 5);
    } else if (t === 'banc') {
      shadow(c, 0, 4, 46, 9);
      rr(c, -42, -10, 6, 14, 2); fs(c, '#5a3a24', 2); rr(c, 36, -10, 6, 14, 2); fs(c, '#5a3a24', 2);
      rr(c, -46, -20, 92, 12, 4); fs(c, '#a8693b');
      line(c, -40, -14, 40, -14, '#8a5430', 1.4);
    } else if (t === 'statue') {
      shadow(c, 0, 6, 28, 9);
      rr(c, -22, -20, 44, 24, 4); fs(c, '#d7cfbf');
      c.beginPath(); c.moveTo(-10, -20); c.quadraticCurveTo(-14, -50, -6, -66); c.lineTo(6, -66); c.quadraticCurveTo(14, -50, 10, -20); c.closePath(); fs(c, '#f2eee6');
      c.beginPath(); c.moveTo(-11, -34); c.quadraticCurveTo(0, -30, 11, -38); fs(c, null, 1.8);
      circ(c, 0, -74, 9); fs(c, '#f5f1ea');
      c.beginPath(); c.arc(0, -77, 9.5, Math.PI, 0); fs(c, '#e4ded2', 2);
    } else if (t === 'colonne') {
      shadow(c, 0, 4, 22, 7);
      rr(c, -20, -10, 40, 12, 3); fs(c, '#e2dccf');
      rr(c, -14, -84, 28, 76, 3); fs(c, '#f2eee6');
      c.strokeStyle = '#cfc7b6'; c.lineWidth = 2;
      for (var k = -8; k <= 8; k += 6) { c.beginPath(); c.moveTo(k, -82); c.lineTo(k, -10); c.stroke(); }
      rr(c, -14, -84, 28, 76, 3); fs(c, null, 2.4);
      rr(c, -22, -94, 44, 12, 4); fs(c, '#e2dccf');
    } else if (t === 'vitrine') {
      shadow(c, 0, 4, 32, 9);
      rr(c, -28, -26, 56, 28, 3); fs(c, '#7a4b2a');
      c.save(); c.translate(0, -30);
      c.beginPath(); c.moveTo(-8, 0); c.quadraticCurveTo(-12, -14, -5, -20); c.lineTo(5, -20); c.quadraticCurveTo(12, -14, 8, 0); c.closePath(); fs(c, '#3fa7a0', 2);
      c.restore();
      rr(c, -26, -62, 52, 36, 3); c.fillStyle = 'rgba(200,235,255,0.25)'; c.fill(); c.lineWidth = 2.2; c.strokeStyle = 'rgba(42,28,22,0.8)'; c.stroke();
      line(c, -18, -56, -10, -34, 'rgba(255,255,255,0.7)', 2.4);
    } else if (t === 'sarcophage') {
      shadow(c, 0, 4, 22, 7);
      c.beginPath(); c.moveTo(-14, 0); c.quadraticCurveTo(-20, -40, -12, -78); c.quadraticCurveTo(0, -92, 12, -78); c.quadraticCurveTo(20, -40, 14, 0); c.closePath(); fs(c, '#e2b84a');
      c.fillStyle = '#2f6fb0'; for (var s = -64; s < -6; s += 9) c.fillRect(-14, s, 28, 3.5);
      c.beginPath(); c.moveTo(-14, 0); c.quadraticCurveTo(-20, -40, -12, -78); c.quadraticCurveTo(0, -92, 12, -78); c.quadraticCurveTo(20, -40, 14, 0); c.closePath(); fs(c, null, 2.4);
      ell(c, 0, -70, 8, 10); fs(c, '#f2c230', 2);
      line(c, -4, -72, -1, -72, INK, 1.6); line(c, 2, -72, 5, -72, INK, 1.6);
    } else if (t === 'obelisque') {
      shadow(c, 0, 4, 20, 6);
      rr(c, -18, -12, 36, 14, 2); fs(c, '#c9a96a');
      c.beginPath(); c.moveTo(-11, -12); c.lineTo(-7, -96); c.lineTo(0, -106); c.lineTo(7, -96); c.lineTo(11, -12); c.closePath(); fs(c, '#d9bd84');
      c.strokeStyle = '#8a6a34'; c.lineWidth = 1.6;
      for (var h = -88; h < -20; h += 13) { c.beginPath(); c.arc(0, h, 2.6, 0, TAU); c.stroke(); line(c, -3, h + 6, 3, h + 6, '#8a6a34', 1.6); }
    } else if (t === 'dino') {
      shadow(c, 0, 4, 110, 12, 0.2);
      c.strokeStyle = INK; c.lineCap = 'round';
      var bone = '#f2ead2';
      c.beginPath(); c.moveTo(-100, -20); c.quadraticCurveTo(-40, -60, 30, -44); c.quadraticCurveTo(70, -38, 86, -64);
      c.lineWidth = 9; c.stroke(); c.strokeStyle = bone; c.lineWidth = 5; c.stroke();
      for (var r = 0; r < 6; r++) {
        var rx = -30 + r * 10;
        c.beginPath(); c.moveTo(rx, -50 + Math.abs(r - 2.5) * 2); c.quadraticCurveTo(rx + 6, -30, rx + 2, -16);
        c.strokeStyle = INK; c.lineWidth = 6; c.stroke(); c.strokeStyle = bone; c.lineWidth = 2.6; c.stroke();
      }
      [[-10, -40, -14, 0], [30, -42, 34, 0]].forEach(function (l) {
        c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(l[2], l[3]); c.strokeStyle = INK; c.lineWidth = 8; c.stroke(); c.strokeStyle = bone; c.lineWidth = 4; c.stroke();
      });
      c.save(); c.translate(96, -70); c.rotate(-0.2);
      rr(c, -14, -12, 34, 22, 8); fs(c, bone);
      circ(c, 2, -3, 4); c.fillStyle = INK; c.fill();
      c.fillStyle = '#fff'; for (var tth = 0; tth < 4; tth++) { c.beginPath(); c.moveTo(4 + tth * 4, 10); c.lineTo(6 + tth * 4, 15); c.lineTo(8 + tth * 4, 10); c.fill(); }
      c.restore();
      rr(c, -40, -6, 80, 10, 3); fs(c, '#7a5a34');
    } else if (t === 'fossile') {
      shadow(c, 0, 4, 26, 7);
      rr(c, -24, -40, 48, 42, 6); fs(c, '#a99a82');
      c.beginPath();
      for (var q = 0; q < 60; q++) { var ang = q * 0.32, rad = 2 + q * 0.28; c.lineTo(Math.cos(ang) * rad, -19 + Math.sin(ang) * rad); }
      c.strokeStyle = '#5e5242'; c.lineWidth = 2.4; c.stroke();
    } else if (t === 'sculpture') {
      shadow(c, 0, 4, 24, 7);
      rr(c, -20, -28, 40, 30, 3); fs(c, '#f5f5f2');
      rr(c, -14, -54, 26, 26, 3); fs(c, '#e8506a');
      circ(c, 2, -66, 12); fs(c, '#3fa7e0');
      c.beginPath(); c.moveTo(-8, -76); c.lineTo(4, -100); c.lineTo(14, -76); c.closePath(); fs(c, '#f4d03f');
    } else if (t === 'mobile') {
      shadow(c, 0, 4, 16, 5);
      rr(c, -14, -8, 28, 10, 3); fs(c, '#2b2f3a');
      line(c, 0, -8, 0, -60, INK, 2.6);
      line(c, -34, -60, 30, -66, INK, 2.2);
      circ(c, -34, -54, 9); fs(c, '#e74c3c', 2); circ(c, 30, -58, 11); fs(c, '#f4d03f', 2);
      line(c, -6, -80, 22, -76, INK, 2); line(c, 0, -60, 0, -80, INK, 2);
      circ(c, -6, -86, 7); fs(c, '#3fa7e0', 2); circ(c, 24, -70, 5); fs(c, '#1d1b26', 2);
    } else if (t === 'trophee') {
      shadow(c, 0, 4, 22, 7);
      rr(c, -14, -6, 28, 8, 3); fs(c, '#6b4226');
      rr(c, -3.5, -44, 7, 40, 2); fs(c, '#7a4b2a');
      [-1, 1].forEach(function (sd) {
        line(c, -22 * sd, -42, 20 * sd, -92, INK, 6); line(c, -22 * sd, -42, 20 * sd, -92, '#d9dde6', 3);
        line(c, -17 * sd, -54, -9 * sd, -46, INK, 4); circ(c, -23 * sd, -40, 3.4); fs(c, '#f2c14e', 1.6);
      });
      c.beginPath(); c.moveTo(-18, -90); c.lineTo(18, -90); c.lineTo(18, -70); c.quadraticCurveTo(18, -50, 0, -42); c.quadraticCurveTo(-18, -50, -18, -70); c.closePath();
      fs(c, th.carpet);
      c.save(); c.clip();
      c.fillStyle = th.trim; c.beginPath(); c.moveTo(-20, -60); c.lineTo(0, -78); c.lineTo(20, -60); c.lineTo(20, -52); c.lineTo(0, -70); c.lineTo(-20, -52); c.closePath(); c.fill();
      c.restore();
      c.beginPath(); c.moveTo(-18, -90); c.lineTo(18, -90); c.lineTo(18, -70); c.quadraticCurveTo(18, -50, 0, -42); c.quadraticCurveTo(-18, -50, -18, -70); c.closePath(); fs(c, null, 2.6);
    } else if (t === 'brasero') {
      var glow = c.createRadialGradient(0, -44, 4, 0, -44, 70);
      glow.addColorStop(0, 'rgba(255,180,70,0.35)'); glow.addColorStop(1, 'rgba(255,180,70,0)');
      c.fillStyle = glow; circ(c, 0, -44, 70); c.fill();
      shadow(c, 0, 4, 18, 6);
      line(c, -12, 2, -4, -26, INK, 4); line(c, 12, 2, 4, -26, INK, 4); line(c, 0, 2, 0, -26, INK, 4);
      c.beginPath(); c.arc(0, -32, 17, 0, Math.PI); c.closePath(); fs(c, '#3a3f4a');
      ell(c, 0, -32, 17, 4.5); fs(c, '#596273', 2);
      [[-8, '#e8502e', 14], [7, '#e8502e', 12], [0, '#ffb347', 20], [-3, '#ffe27a', 11]].forEach(function (fl) {
        c.beginPath(); c.moveTo(fl[0] - 6, -33); c.quadraticCurveTo(fl[0] - 6, -40 - fl[2] * 0.5, fl[0], -34 - fl[2]); c.quadraticCurveTo(fl[0] + 6, -40 - fl[2] * 0.5, fl[0] + 6, -33); c.closePath();
        c.fillStyle = fl[1]; c.fill();
      });
    } else if (t === 'ancre') {
      shadow(c, 0, 4, 26, 7);
      rr(c, -20, -8, 40, 10, 3); fs(c, '#6b4226');
      c.beginPath(); c.arc(0, -34, 22, 0.12 * Math.PI, 0.88 * Math.PI); c.lineWidth = 10; c.strokeStyle = INK; c.stroke(); c.lineWidth = 5.5; c.strokeStyle = '#596273'; c.stroke();
      [-1, 1].forEach(function (sd) { c.beginPath(); c.moveTo(sd * 21, -30); c.lineTo(sd * 28, -40); c.lineTo(sd * 15, -36); c.closePath(); fs(c, '#596273', 2); });
      rr(c, -3.5, -86, 7, 76, 3); fs(c, '#596273');
      rr(c, -15, -76, 30, 6, 2); fs(c, '#7a4b2a', 2);
      circ(c, 0, -92, 6); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.lineWidth = 2.6; c.strokeStyle = '#596273'; c.stroke();
      c.beginPath(); c.moveTo(0, -86); c.bezierCurveTo(18, -70, -16, -56, 6, -40); c.lineWidth = 3; c.strokeStyle = '#c8a46a'; c.stroke();
    } else if (t === 'gouvernail') {
      shadow(c, 0, 4, 22, 7);
      rr(c, -14, -6, 28, 8, 3); fs(c, '#6b4226');
      rr(c, -4, -46, 8, 42, 2); fs(c, '#7a4b2a');
      for (var sp = 0; sp < 8; sp++) {
        var sa = sp * Math.PI / 4;
        line(c, Math.cos(sa) * 4, -62 + Math.sin(sa) * 4, Math.cos(sa) * 31, -62 + Math.sin(sa) * 31, INK, 6);
        line(c, Math.cos(sa) * 4, -62 + Math.sin(sa) * 4, Math.cos(sa) * 31, -62 + Math.sin(sa) * 31, '#a8693b', 3);
      }
      circ(c, 0, -62, 22); c.lineWidth = 9; c.strokeStyle = INK; c.stroke(); c.lineWidth = 5; c.strokeStyle = '#a8693b'; c.stroke();
      circ(c, 0, -62, 6); fs(c, '#e3c06a', 2);
    } else if (t === 'maquette') {
      shadow(c, 0, 4, 32, 7);
      rr(c, -24, -8, 48, 10, 3); fs(c, '#7a4b2a');
      rr(c, -16, -14, 6, 8, 2); fs(c, '#6b4226', 1.6); rr(c, 10, -14, 6, 8, 2); fs(c, '#6b4226', 1.6);
      c.save(); c.translate(0, -12);
      c.beginPath(); c.moveTo(-16, -8); c.lineTo(12, -8); c.lineTo(8, -2); c.lineTo(-12, -2); c.closePath(); fs(c, '#8a5a34', 1.4);
      line(c, -6, -8, -6, -28, INK, 1.4); line(c, 4, -8, 4, -24, INK, 1.4);
      c.beginPath(); c.moveTo(-6, -27); c.lineTo(-6, -11); c.lineTo(2, -12); c.closePath(); fs(c, '#ffffff', 1.2);
      c.beginPath(); c.moveTo(4, -23); c.lineTo(4, -11); c.lineTo(10, -12); c.closePath(); fs(c, '#ffffff', 1.2);
      c.fillStyle = '#4fa3d8'; c.fillRect(-26, -3, 46, 3);
      rr(c, -28, -32, 50, 32, 14); c.fillStyle = 'rgba(200,235,255,0.3)'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
      rr(c, 20, -22, 12, 12, 3); c.fillStyle = 'rgba(200,235,255,0.3)'; c.fill(); c.stroke();
      rr(c, 30, -23, 7, 14, 2); fs(c, '#c8a46a', 1.8);
      line(c, -20, -26, -10, -28, 'rgba(255,255,255,0.8)', 2.2);
      c.restore();
    } else if (t === 'oranger') {
      shadow(c, 0, 4, 22, 7);
      rr(c, -3, -48, 6, 24, 2); fs(c, '#7a4b2a', 2);
      circ(c, 0, -70, 25); fs(c, '#3f8a3a');
      [[-10, -78, 9], [9, -62, 8], [6, -84, 6]].forEach(function (l) { circ(c, l[0], l[1], l[2]); c.fillStyle = '#4f9e47'; c.fill(); });
      [[-12, -64], [10, -74], [-2, -86], [14, -58], [-15, -80]].forEach(function (o) { circ(c, o[0], o[1], 3.6); fs(c, '#f39c34', 1.2); });
      rr(c, -18, -28, 36, 30, 2); fs(c, '#f5f1e8');
      c.strokeStyle = '#2f6b3a'; c.lineWidth = 2;
      c.strokeRect(-14, -24, 28, 22); line(c, -14, -24, 14, -2, '#2f6b3a', 1.6); line(c, 14, -24, -14, -2, '#2f6b3a', 1.6);
      circ(c, -18, -30, 3.4); fs(c, '#2f6b3a', 1.6); circ(c, 18, -30, 3.4); fs(c, '#2f6b3a', 1.6);
    } else if (t === 'candelabre') {
      var cg = c.createRadialGradient(0, -86, 4, 0, -86, 60);
      cg.addColorStop(0, 'rgba(255,220,120,0.35)'); cg.addColorStop(1, 'rgba(255,220,120,0)');
      c.fillStyle = cg; circ(c, 0, -86, 60); c.fill();
      shadow(c, 0, 4, 16, 5);
      ell(c, 0, -2, 14, 5); fs(c, '#e2b84a', 2);
      rr(c, -3, -70, 6, 68, 2); fs(c, '#f2c14e', 2);
      c.beginPath(); c.moveTo(-26, -78); c.quadraticCurveTo(-24, -60, 0, -62); c.quadraticCurveTo(24, -60, 26, -78); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3; c.strokeStyle = '#f2c14e'; c.stroke();
      [-26, -13, 0, 13, 26].forEach(function (cx, k) {
        var cy = k === 2 ? -86 : -80;
        rr(c, cx - 2.6, cy - 12, 5.2, 12, 1.5); fs(c, '#fbfaf5', 1.6);
        c.beginPath(); c.moveTo(cx, cy - 21); c.quadraticCurveTo(cx + 4, cy - 15, cx, cy - 12); c.quadraticCurveTo(cx - 4, cy - 15, cx, cy - 21); c.fillStyle = '#ffb347'; c.fill();
      });
    } else if (t === 'miroir') {
      shadow(c, 0, 4, 24, 7);
      rr(c, -16, -4, 8, 6, 2); fs(c, '#c9953c', 1.8); rr(c, 8, -4, 8, 6, 2); fs(c, '#c9953c', 1.8);
      rr(c, -21, -98, 42, 94, 20); fs(c, '#e2b84a');
      var mg = c.createLinearGradient(-15, -92, 15, -10);
      mg.addColorStop(0, '#e6f4ff'); mg.addColorStop(1, '#8fb3d1');
      rr(c, -15, -92, 30, 82, 15); c.fillStyle = mg; c.fill(); c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke();
      line(c, -9, -74, 5, -88, 'rgba(255,255,255,0.85)', 3); line(c, -9, -60, 9, -80, 'rgba(255,255,255,0.6)', 2);
      circ(c, 0, -100, 5); fs(c, '#f2c14e', 1.8);
    } else if (t === 'caisses') {
      shadow(c, 0, 4, 34, 8);
      var crate = function (x, y, w2, h2) {
        rr(c, x, y, w2, h2, 2); fs(c, '#b8864f');
        line(c, x + 3, y + 3, x + w2 - 3, y + h2 - 3, '#8a5a34', 2.4);
        c.lineWidth = 2.4; c.strokeStyle = '#8a5a34'; c.strokeRect(x + 3, y + 3, w2 - 6, h2 - 6);
        rr(c, x, y, w2, h2, 2); fs(c, null, 2.4);
      };
      crate(-32, -30, 34, 30); crate(2, -26, 30, 26); crate(-20, -58, 30, 28);
      c.font = '8px ' + A.FONT; c.textAlign = 'center'; c.fillStyle = '#c0392b'; c.fillText('FRAGILE', -15, -10);
    } else if (t === 'lampe') {
      shadow(c, 0, 4, 18, 6);
      line(c, 0, -46, -14, 2, INK, 3.4); line(c, 0, -46, 14, 2, INK, 3.4); line(c, 0, -46, 3, 2, INK, 3);
      rr(c, -2, -70, 4, 26, 2); fs(c, '#596273', 1.8);
      rr(c, -13, -82, 26, 16, 4); fs(c, '#f2c230');
      rr(c, -10, -71, 20, 6, 2); fs(c, '#fffbe0', 1.6);
      c.fillStyle = 'rgba(255,245,190,0.35)'; c.beginPath(); c.moveTo(-10, -66); c.lineTo(10, -66); c.lineTo(20, -40); c.lineTo(-20, -40); c.closePath(); c.fill();
    } else if (t === 'bache') {
      shadow(c, 0, 4, 26, 7);
      c.beginPath(); c.moveTo(-25, 2); c.quadraticCurveTo(-28, -48, -12, -76); c.quadraticCurveTo(0, -90, 12, -76); c.quadraticCurveTo(28, -48, 25, 2); c.closePath(); fs(c, '#e8e4da');
      c.strokeStyle = 'rgba(42,28,22,0.3)'; c.lineWidth = 1.8;
      [[-10, -60, -14, 0], [4, -70, 6, 0], [14, -44, 18, 0]].forEach(function (l) { c.beginPath(); c.moveTo(l[0], l[1]); c.quadraticCurveTo(l[0] - 4, (l[1] + l[3]) / 2, l[2], l[3]); c.stroke(); });
      c.beginPath(); c.moveTo(-23, -30); c.quadraticCurveTo(0, -22, 23, -30); c.lineWidth = 3; c.strokeStyle = '#c8a46a'; c.stroke();
      rr(c, 12, -30, 12, 9, 2); fs(c, '#ffd447', 1.6);
    } else if (t === 'sacs') {
      shadow(c, 0, 4, 30, 7);
      var bag = function (x, sc) {
        c.save(); c.translate(x, 0); c.scale(sc, sc);
        c.beginPath(); c.moveTo(-6, -30); c.quadraticCurveTo(-20, -24, -18, -8); c.quadraticCurveTo(-16, 2, 0, 2); c.quadraticCurveTo(16, 2, 18, -8); c.quadraticCurveTo(20, -24, 6, -30); c.closePath(); fs(c, '#c9a46a');
        c.beginPath(); c.moveTo(-6, -30); c.lineTo(-9, -38); c.lineTo(0, -34); c.lineTo(9, -38); c.lineTo(6, -30); c.closePath(); fs(c, '#c9a46a', 2);
        line(c, -7, -30, 7, -30, '#7a4b2a', 2.4);
        c.font = '14px ' + A.FONT; c.textAlign = 'center'; c.fillStyle = '#7a4b2a'; c.fillText('€', 0, -8);
        c.restore();
      };
      bag(-14, 1); bag(14, 0.85);
    } else if (t === 'coffret') {
      shadow(c, 0, 4, 24, 7);
      rr(c, -22, -44, 44, 46, 5); fs(c, '#596273');
      rr(c, -17, -39, 34, 36, 3); fs(c, '#6d7884', 2);
      circ(c, -2, -22, 9); fs(c, '#c9ced6', 2);
      for (var dk = 0; dk < 8; dk++) { var da = dk * Math.PI / 4; line(c, -2 + Math.cos(da) * 6, -22 + Math.sin(da) * 6, -2 + Math.cos(da) * 8, -22 + Math.sin(da) * 8, INK, 1.2); }
      line(c, -2, -22, 2, -27, INK, 1.8);
      rr(c, 11, -28, 4, 14, 2); fs(c, '#f2c14e', 1.6);
      rr(c, -18, -2, 8, 4, 1); fs(c, '#3a3f4a', 1.4); rr(c, 10, -2, 8, 4, 1); fs(c, '#3a3f4a', 1.4);
    } else if (t === 'armure') {
      shadow(c, 0, 4, 20, 6);
      rr(c, -16, -6, 32, 8, 2); fs(c, '#7a4b2a');
      rr(c, -10, -34, 8, 30, 3); fs(c, '#b8c0cc', 2.2); rr(c, 2, -34, 8, 30, 3); fs(c, '#b8c0cc', 2.2);
      rr(c, -14, -66, 28, 34, 8); fs(c, '#d0d6de');
      rr(c, -20, -66, 9, 26, 4); fs(c, '#b8c0cc', 2); rr(c, 11, -66, 9, 26, 4); fs(c, '#b8c0cc', 2);
      rr(c, -10, -88, 20, 22, 8); fs(c, '#d0d6de');
      c.fillStyle = INK; c.fillRect(-7, -80, 14, 3);
      c.beginPath(); c.moveTo(0, -88); c.quadraticCurveTo(10, -104, 14, -96); fs(c, '#c0392b', 2);
      line(c, 24, -2, 24, -90, '#7a4b2a', 3); c.beginPath(); c.moveTo(24, -102); c.lineTo(19, -88); c.lineTo(29, -88); c.closePath(); fs(c, '#b8c0cc', 2);
    }
    c.restore();
  };

  /* ---------- Icônes (images pour l'interface) ---------- */
  var iconCache = {};
  A.icon = function (key, w, h, draw) {
    if (iconCache[key]) return iconCache[key];
    if (typeof document === 'undefined') return '';
    var cv = document.createElement('canvas'), s = 2;
    cv.width = w * s; cv.height = h * s;
    var c = cv.getContext('2d');
    c.scale(s, s);
    draw(c, w, h);
    iconCache[key] = cv.toDataURL();
    return iconCache[key];
  };

  A.towerIcon = function (type, level) {
    level = level || 0;
    return A.icon('t-' + type + level, 80, 96, function (c) {
      c.translate(40, 78);
      A.tower(c, type, { level: level, aim: -0.25, face: 1, time: 0.3 });
    });
  };
  A.enemyIcon = function (type) {
    return A.icon('e-' + type, 72, 80, function (c) {
      c.translate(36, 72);
      var size = Math.min(1.25, (PT.ENEMIES[type].size || 1)) * 1.15;
      A.person(c, type, { face: 1, size: size, phase: 0, moving: false, id: 3, t: 0.4 });
    });
  };
  A.powerIcon = function (id) {
    return A.icon('p-' + id, 64, 64, function (c) {
      c.translate(32, 32);
      if (id === 'buste') { c.translate(0, 22); c.scale(0.95, 0.95); A.bust(c); }
      else if (id === 'alarme') {
        c.beginPath(); c.arc(0, 2, 18, Math.PI, 0); c.lineTo(18, 12); c.lineTo(-18, 12); c.closePath(); fs(c, '#ff3b3b');
        rr(c, -22, 12, 44, 8, 3); fs(c, '#596273');
        ell(c, -7, -4, 4, 7, -0.4); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fill();
        line(c, -28, -14, -22, -9, INK, 3); line(c, 28, -14, 22, -9, INK, 3); line(c, 0, -26, 0, -20, INK, 3);
      } else if (id === 'verrou') {
        c.beginPath(); c.arc(0, -5, 11, Math.PI, 0); c.lineWidth = 9; c.strokeStyle = INK; c.stroke(); c.lineWidth = 4.5; c.strokeStyle = '#c9ced6'; c.stroke();
        rr(c, -17, -6, 34, 26, 6); fs(c, '#f2c230', 3);
        circ(c, 0, 4, 4); c.fillStyle = INK; c.fill(); rr(c, -1.8, 5, 3.6, 8, 1.5); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(-13, -2, 4, 17);
      } else if (id === 'cafe') {
        rr(c, -16, -8, 26, 24, 6); fs(c, '#fff');
        c.beginPath(); c.arc(12, 3, 7, -Math.PI / 2, Math.PI / 2); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); c.lineWidth = 2.5; c.strokeStyle = '#fff'; c.stroke();
        ell(c, -3, -8, 13, 3.5); fs(c, '#6b4226', 2);
        c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 3; c.lineCap = 'round';
        for (var i = 0; i < 2; i++) { c.beginPath(); c.moveTo(-7 + i * 8, -14); c.quadraticCurveTo(-11 + i * 8, -20, -6 + i * 8, -26); c.stroke(); }
        ell(c, -3, 18, 20, 4); fs(c, '#e2dccf', 2);
      }
    });
  };
  A.coinIcon = function () {
    return A.icon('coin', 40, 40, function (c) {
      circ(c, 20, 20, 15); fs(c, '#f7c948', 3);
      circ(c, 20, 20, 10); c.lineWidth = 2; c.strokeStyle = '#c99a1e'; c.stroke();
      starPath(c, 20, 20.5, 6, 2.6); c.fillStyle = '#c99a1e'; c.fill();
    });
  };
  A.vaseIcon = function () {
    return A.icon('vase', 40, 44, function (c) {
      c.translate(20, 40);
      c.beginPath(); c.moveTo(-6, -36); c.lineTo(6, -36); c.lineTo(5, -30); c.quadraticCurveTo(16, -24, 13, -10); c.quadraticCurveTo(10, 0, 0, 0); c.quadraticCurveTo(-10, 0, -13, -10); c.quadraticCurveTo(-16, -24, -5, -30); c.closePath();
      fs(c, '#3fa7a0', 3);
      c.fillStyle = '#f2c230'; c.fillRect(-12, -20, 24, 4);
      c.beginPath(); c.moveTo(-6, -36); c.lineTo(6, -36); c.lineTo(5, -30); c.quadraticCurveTo(16, -24, 13, -10); c.quadraticCurveTo(10, 0, 0, 0); c.quadraticCurveTo(-10, 0, -13, -10); c.quadraticCurveTo(-16, -24, -5, -30); c.closePath(); fs(c, null, 3);
    });
  };
  A.starIcon = function (on) {
    return A.icon('star' + (on ? 1 : 0), 40, 40, function (c) {
      starPath(c, 20, 21, 16, 7.5); fs(c, on ? '#ffd447' : '#8f8579', 3);
      if (on) { c.beginPath(); c.ellipse(15, 15, 3, 5, -0.6, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fill(); }
    });
  };
  A.portrait = function (type) {
    // Portrait en buste (dialogues, briefings)
    return A.icon('portrait-' + type, 96, 96, function (c) {
      c.translate(48, 150);
      A.person(c, type, { face: 1, size: 2.6, moving: false, id: 2, t: 0.2 });
    });
  };
  A.guardPortrait = function () {
    return A.icon('portrait-guard', 96, 96, function (c) {
      c.translate(48, 160); c.scale(2.6, 2.6);
      drawGuard(c, { face: 1, fireT: 0 }, 2, 0);
    });
  };
})(globalThis.PT = globalThis.PT || {});
