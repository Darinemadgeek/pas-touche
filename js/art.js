/* Pas Touche ! — dessins cartoon procéduraux (personnages, défenses, décor, trésors, icônes).
   Tout est dessiné en Canvas 2D avec un contour encré, aucune image externe. */
(function (PT) {
  'use strict';

  var INK = '#2a1c16';
  var OUTLINE = 0.6; // épaisseur des contours noirs (1 = trait d'origine)
  var TAU = Math.PI * 2;
  var A = PT.Art = {};
  A.HALO = false;
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
  // Passe « liseré » : quand A.HALO est vrai, chaque forme est tracée plus large en crème,
  // juste avant le vrai dessin. On obtient le bord blanc d'une découpe aux ciseaux.
  var HALO_COL = '#fff4dc', HALO_W = 10;
  function fs(c, fill, lw) {
    if (A.HALO) {
      if (fill) { c.fillStyle = HALO_COL; c.fill(); }
      if (lw !== 0) { c.lineWidth = (lw || 2.6) * OUTLINE + HALO_W; c.strokeStyle = HALO_COL; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
      return;
    }
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (lw !== 0) { c.lineWidth = (lw || 2.6) * OUTLINE; c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
  }
  function shadow(c, x, y, rx, ry, a) { if (A.HALO) return; c.fillStyle = 'rgba(25,12,6,' + (a || 0.25) + ')'; ell(c, x, y, rx, ry); c.fill(); }
  function line(c, x1, y1, x2, y2, col, lw) {
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
    if (A.HALO) { c.strokeStyle = HALO_COL; c.lineWidth = (lw || 2.6) + HALO_W; c.lineCap = 'round'; c.stroke(); return; }
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

  /* ---------- Papier découpé ---------- */
  // Le décor est dessiné en plusieurs variantes (A.BOIL = 0, 1, 2) dont les bords tremblent
  // légèrement : en les alternant, le trait « vibre » comme dans un dessin animé en papier.
  A.BOIL = 0;
  A.wobble = function (c, pts, amp, seed) {
    var r = A.rng((seed | 0) + A.BOIL * 977);
    c.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var x = pts[i][0] + (r() - 0.5) * amp, y = pts[i][1] + (r() - 0.5) * amp;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.closePath();
  };
  // Rectangle aux bords coupés aux ciseaux
  A.wobRect = function (c, x, y, w, h, amp, seed) {
    var pts = [], n = Math.max(1, Math.round(w / 40)), m = Math.max(1, Math.round(h / 40)), i;
    for (i = 0; i <= n; i++) pts.push([x + w * i / n, y]);
    for (i = 1; i <= m; i++) pts.push([x + w, y + h * i / m]);
    for (i = n - 1; i >= 0; i--) pts.push([x + w * i / n, y + h]);
    for (i = m - 1; i > 0; i--) pts.push([x, y + h * i / m]);
    A.wobble(c, pts, amp, seed);
  };
  A.paper = function (c, fill, lw) { c.fillStyle = fill; c.fill(); if (lw !== 0) fs(c, null, lw || 2); };
  // Grain de papier : petites taches claires et sombres
  A.grain = function (c, x, y, w, h, alpha, seed) {
    var r = A.rng(seed), n = Math.round(w * h / 160);
    for (var i = 0; i < n; i++) {
      c.fillStyle = (r() < 0.5 ? 'rgba(0,0,0,' : 'rgba(255,255,255,') + (alpha * r()).toFixed(3) + ')';
      c.fillRect(x + r() * w, y + r() * h, 1 + r() * 2, 1 + r() * 2);
    }
  };

  /* ---------- Personnages ---------- */
  // Style papier découpé : une grosse tête ronde posée sur un petit corps en trapèze, des yeux
  // ovales collés l'un à l'autre, des moufles, et une marche saccadée en quatre poses.
  var SKINS = ['#ffdcb5', '#f2c093', '#d49a6a', '#a8714b', '#fbd0a6', '#7d4d33'];
  var SHIRTS = ['#f08a24', '#22a7c9', '#e2405e', '#6cbf3a', '#f5c518', '#8e5bd6'];
  var MASK = '#1d1b26';

  var LOOKS = {
    voleur: { shirt: '#f4efe4', stripe: '#1f2a5a', pants: '#2b2b3a', hat: 'beanie', hatColor: '#3a3a48', pom: '#f5c518', mask: true, lids: true },
    pickpocket: { headK: 1.18, shirt: '#4f9a46', pants: '#5a4632', hat: 'cap', hatColor: '#80603e', mask: true, scarf: '#d8402f', longScarf: '#d8402f', lids: true, small: true },
    costaud: { shirt: '#c0392b', tank: true, pants: '#3a3550', hat: 'bald', mask: true, mustache: '#3a2418', stubble: true, brows: true, big: true },
    ombre: { shirt: '#24212f', pants: '#24212f', shoes: '#24212f', mitten: '#24212f', hat: 'ninja', band: '#d0313c', skin: '#24212f', lids: true },
    acrobate: { shirt: '#8e44ad', harlequin: '#f4c430', pants: '#8e44ad', hat: 'hair', hair: '#e2583e', mask: true, small: true },
    hackeuse: { shirt: '#4a4f63', pants: '#2b2e3a', hat: 'hood', hatColor: '#4a4f63', glasses: true, laptop: true, lids: true },
    touriste: { flowers: true, pants: '#dcc79e', shorts: true, hat: 'straw', hatColor: '#e9c46a', sunglasses: true, cameraNeck: true, smile: true },
    faussaire: { flowers: true, pants: '#dcc79e', shorts: true, hat: 'straw', hatColor: '#e9c46a', sunglasses: true, cameraNeck: true, smile: true },
    gentleman: { shirt: '#22222c', vest: '#f5f1e8', pants: '#22222c', hat: 'top', hatColor: '#1b1b22', cape: '#6b2d8f', monocle: true, mustache: '#2a1a12', cane: true, mitten: '#ffffff', skin: '#f2cfae', lids: true },
    chevalier: { shirt: '#c3cad4', pants: '#8f98a6', shoes: '#8f98a6', mitten: '#c3cad4', hat: 'helmet', hatColor: '#d3d9e1', plume: '#c0392b', plates: true, tabard: '#b8283a' },
    illusionniste: { shirt: '#3b2a7a', stars: '#f4d03f', pants: '#2a1d5a', hat: 'wizard', hatColor: '#5b3fa8', wand: true, mustache: '#efeff5', mitten: '#ffffff', lids: true },
    garde: { shirt: '#2f4fa8', pants: '#22346e', hat: 'kepi', hatColor: '#22346e', mustache: '#6b4226', baton: true, belt: true, skin: '#f1c39c', mitten: '#ffffff', brows: true },
  };
  LOOKS.patineur = { shirt: '#ff7a1a', stripe: '#ffd23f', pants: '#2b5fb3', shorts: true, hat: 'cap', hatColor: '#e2405e', mask: true, skates: true, lean: true, longScarf: '#ffd23f', lids: true, small: true };
  LOOKS.taupe = { shirt: '#8a5a32', pants: '#8a5a32', hat: 'miner', hatColor: '#f5c518', straps: '#5a3a1e', mitten: '#5a3a1e', glasses: true, dirt: true, shovel: true };
  LOOKS.soigneuse = { shirt: '#f6f6f2', pants: '#e9e9e2', hat: 'nurse', hatColor: '#ffffff', cross: true, mask: true, mitten: '#9fd3ff', lids: true, medbag: true };
  LOOKS.demenageur = { shirt: '#f4efe4', pants: '#2f6fb0', straps: '#2f6fb0', hat: 'cap', hatColor: '#e8b84a', mustache: '#3a2418', stubble: true, brows: true, big: true, mitten: '#c9a46a' };
  LOOKS.chef = { shirt: '#1f2a5a', pants: '#161d40', hat: 'kepi', hatColor: '#161d40', mustache: '#9a9a9a', mitten: '#ffffff', sunglasses: true, megaphone: true, belt: true, skin: '#f1c39c' };
  LOOKS.reflet = LOOKS.illusionniste;
  A.LOOKS = LOOKS;
  // Position des pupilles d'un personnage standard (pour les faire briller dans le noir)
  A.EYES = [[-1.2, -40], [8.4, -40]];

  // Dessine un personnage debout, pieds en (0,0).
  // o : { phase, face, size, flash, carrying, grab, id, revealed, t, moving, rank, armRot, throwing }
  A.person = function (c, type, o) {
    var L = LOOKS[type] || LOOKS.voleur;
    var id = o.id || 0;
    var skin = L.skin || SKINS[id % SKINS.length];
    var shirt = L.shirt || SHIRTS[(id * 7) % SHIRTS.length];
    var flash = o.flash;
    var col = function (x) { return flash && typeof x === 'string' && x.length === 7 && x[0] === '#' ? shade(x, 0.5) : x; };
    var t = o.t || 0, moving = o.moving !== false;
    // Quatre poses par cycle de pas, sans interpolation : c'est ce qui donne l'effet découpé.
    var step = moving ? Math.floor((o.phase || 0) / (Math.PI / 2)) & 3 : 0;
    var hop = moving && (step & 1) ? 2.5 : 0;
    var big = !!L.big, k = big ? 1.12 : 1;
    var W = big ? 38 : L.small ? 24 : 27, R = 17 * k * (L.headK || 1);
    var top = -27 - hop, bot = -5 - hop;
    var hx = 1, hy = top - R * 0.68;
    var revealed = o.revealed, masked = L.mask || revealed;
    var surprised = o.carrying || o.grab;
    var lw = 1.8;

    c.save();
    c.scale((o.face || 1) * (o.size || 1), o.size || 1);
    shadow(c, 0, 0, W * 0.62, 4.5);
    if (moving) c.rotate(L.lean ? 0.26 + (step & 2 ? 0.03 : 0) : step & 2 ? 0.045 : -0.045);

    if (L.shovel) {
      // Pelle portée à l'épaule, derrière le corps : la lame dépasse à côté de la tête
      line(c, -W * 0.25, top + 18, -R - 6, hy - R * 0.55, col('#8a5a32'), 3.4);
      c.save(); c.translate(-R - 7, hy - R * 0.6); c.rotate(-0.35);
      c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); c.lineTo(5, -11); c.quadraticCurveTo(0, -16, -5, -11); c.closePath(); fs(c, col('#9aa3ad'), lw);
      c.restore();
    }
    // Cape du Gentleman (derrière)
    if (L.cape) {
      c.beginPath();
      c.moveTo(-W * 0.3, top + 1); c.quadraticCurveTo(-W * 0.8 - (step & 1) * 2, top + 16, -W * 0.62, -1);
      c.lineTo(W * 0.3, -2); c.lineTo(W * 0.3, top + 1); c.closePath();
      fs(c, col(L.cape), lw);
    }
    // Sacs de butin (derrière)
    if (o.carrying) {
      var n = Math.min(o.carrying, 3);
      for (var s = 0; s < n; s++) {
        var sx = -W / 2 - 7 - s * 6, sy = top + 4 - s * 9, sr = big ? 13 : 11;
        circ(c, sx, sy, sr); fs(c, col('#9a6b3c'), lw);
        c.beginPath(); c.moveTo(sx - 3, sy - sr + 1); c.lineTo(sx, sy - sr - 5); c.lineTo(sx + 3, sy - sr + 1); fs(c, col('#9a6b3c'), lw);
        starPath(c, sx + 1, sy + 2, 4.5, 2); fs(c, col('#ffd447'), 1.2);
      }
    }
    if (L.longScarf) {
      var wv = moving ? (step & 1 ? 3 : -2) : 0;
      c.beginPath(); c.moveTo(-W * 0.2, top + 1); c.quadraticCurveTo(-W * 0.7, top - 2 + wv, -W * 1.05, top + 6 - wv);
      c.lineTo(-W * 1.0, top + 12 - wv); c.quadraticCurveTo(-W * 0.65, top + 6 + wv, -W * 0.18, top + 6); c.closePath();
      fs(c, col(L.longScarf), lw);
    }
    // Plumet du chevalier (derrière le heaume)
    if (L.plume) {
      c.beginPath(); c.moveTo(hx - 2, hy - R * 0.8); c.quadraticCurveTo(hx - 14, hy - R - 14, hx - 24 - (step & 1) * 2, hy - R + 4);
      c.quadraticCurveTo(hx - 12, hy - R - 4, hx - 2, hy - R * 0.8); fs(c, col(L.plume), lw);
    }

    // Jambes : un bloc de pantalon et deux chaussures ovales qui dépassent
    rr(c, -W * 0.42, bot - 2, W * 0.84, 1 - bot, 2);
    fs(c, col(L.shorts ? skin : L.pants), lw);
    if (L.shorts) { rr(c, -W * 0.44, bot - 2, W * 0.88, 5, 2); fs(c, col(L.pants), lw); }
    line(c, 0.5, bot + 2, 0.5, -2, INK, 1.2);
    var f = [0, 3, 0, -3][step];
    if (L.skates) {
      [-1, 1].forEach(function (sd) {
        var fx = sd * W * 0.21 + (sd < 0 ? -f : f);
        circ(c, fx - 3.5, -1.2, 2); fs(c, col('#e2405e'), 1.2); circ(c, fx + 3.5, -1.2, 2); fs(c, col('#e2405e'), 1.2);
        rr(c, fx - 6, -9, 12, 7, 3); fs(c, col('#f4efe4'), lw);
      });
    } else {
      ell(c, -W * 0.2 - f, -2, W * 0.22, 3.4); fs(c, col(L.shoes || '#2b2724'), lw);
      ell(c, W * 0.22 + f, -2, W * 0.22, 3.4); fs(c, col(L.shoes || '#2b2724'), lw);
    }

    // Torse en trapèze
    var th = bot - top;
    function torso() {
      c.beginPath();
      c.moveTo(-W * 0.36, top); c.lineTo(W * 0.36, top);
      c.quadraticCurveTo(W * 0.52, top + 4, W * 0.5, bot);
      c.lineTo(-W * 0.5, bot);
      c.quadraticCurveTo(-W * 0.52, top + 4, -W * 0.36, top);
      c.closePath();
    }
    torso(); c.fillStyle = col(shirt); c.fill();
    if (!flash) {
      c.save(); torso(); c.clip();
      var x0 = -W / 2 - 2;
      if (L.stripe) { c.fillStyle = L.stripe; for (var yy = top + 3; yy < bot; yy += 5.5) c.fillRect(x0, yy, W + 4, 2.4); }
      if (L.harlequin) {
        c.fillStyle = L.harlequin;
        for (var hx2 = x0; hx2 < W / 2; hx2 += 8) for (var hy2 = top; hy2 < bot; hy2 += 10) {
          c.beginPath(); c.moveTo(hx2 + 4, hy2); c.lineTo(hx2 + 8, hy2 + 5); c.lineTo(hx2 + 4, hy2 + 10); c.lineTo(hx2, hy2 + 5); c.fill();
        }
      }
      if (L.flowers) {
        for (var fl = 0; fl < 6; fl++) {
          var fx = -W / 2 + 4 + (fl * 9) % (W - 4), fy = top + 4 + ((fl * 11) % (th - 4));
          c.fillStyle = fl % 2 ? '#ff6f91' : '#fff4a3';
          for (var p = 0; p < 5; p++) { circ(c, fx + Math.cos(p * 1.26) * 2.2, fy + Math.sin(p * 1.26) * 2.2, 1.6); c.fill(); }
        }
      }
      if (L.plates) {
        c.fillStyle = L.tabard; c.fillRect(-5, top, 11, th);
        c.fillStyle = '#f2c14e'; c.fillRect(-5, top + 8, 11, 2.5);
        c.fillStyle = 'rgba(0,0,0,0.25)'; for (var py = top + 6; py < bot; py += 6) { c.fillRect(x0, py, W / 2 - 3, 1.4); c.fillRect(6, py, W / 2, 1.4); }
      }
      if (L.stars) {
        c.fillStyle = L.stars;
        for (var sk = 0; sk < 5; sk++) { starPath(c, -W / 2 + 5 + (sk * 9) % (W - 6), top + 5 + ((sk * 13) % (th - 6)), 2.8, 1.2); c.fill(); }
      }
      if (L.vest) {
        c.fillStyle = L.vest; c.beginPath(); c.moveTo(-5, top); c.lineTo(6, top); c.lineTo(0.5, top + 13); c.fill();
        c.fillStyle = '#c0392b'; c.beginPath(); c.moveTo(-3.5, top + 1); c.lineTo(4.5, top + 5); c.lineTo(4.5, top + 1); c.lineTo(-3.5, top + 5); c.fill();
      }
      if (L.straps) { c.fillStyle = L.straps; c.fillRect(-W * 0.32, top, 4, th); c.fillRect(W * 0.32 - 3, top, 4, th); c.fillRect(-W * 0.36, top + th * 0.45, W * 0.72, th * 0.55); }
      if (L.cross) { c.fillStyle = '#e2342e'; c.fillRect(-2, top + 4, 5, 13); c.fillRect(-5.5, top + 8, 12, 5); }
      if (L.dirt) { c.fillStyle = 'rgba(60,35,15,0.45)'; [[-6, 6], [5, 13], [-2, 17]].forEach(function (p) { circ(c, p[0], top + p[1], 2.4); c.fill(); }); }
      if (L.belt) { c.fillStyle = '#1d1b26'; c.fillRect(x0, bot - 5, W + 4, 3.5); c.fillStyle = '#c9c9c9'; c.fillRect(-2, bot - 5.5, 5, 4.5); }
      c.restore();
    }
    torso(); fs(c, null, lw);
    if (!L.plates && !L.flowers && !L.vest && !L.harlequin && !L.cross && !L.straps && !L.tank) line(c, 0.5, top + 2, 0.5, bot - 1, 'rgba(0,0,0,0.3)', 1.2);
    if (type === 'garde' || type === 'chef') {
      var rank = o.rank || 0;
      starPath(c, -5, top + 7, 3.8, 1.7); fs(c, col(rank >= 2 ? '#ffd447' : '#d9dde6'), 1.2);
      if (rank >= 2) { circ(c, 7, top + 8, 2.6); fs(c, col('#e74c3c'), 1.2); }
    }
    if (L.scarf) {
      rr(c, -W * 0.4, top - 3, W * 0.8, 5, 2.5); fs(c, col(L.scarf), lw);
      rr(c, -W * 0.38, top, 5, 10, 2.5); fs(c, col(L.scarf), lw);
    }
    if (L.laptop) {
      rr(c, 0, top + 8, 17, 11, 2); fs(c, col('#3a3f55'), lw);
      if (!flash) { c.fillStyle = 'rgba(90,220,255,' + (Math.sin(t * 9) > 0 ? 0.9 : 0.5) + ')'; c.fillRect(2, top + 10, 13, 7); }
    }
    if (L.cameraNeck) {
      line(c, -4, top + 1, 0.5, top + 8, INK, 1.3); line(c, 5, top + 1, 0.5, top + 8, INK, 1.3);
      rr(c, -4.5, top + 7, 10, 7, 2); fs(c, col('#30303a'), 1.4); circ(c, 0.5, top + 10.5, 2.1); fs(c, col('#8fd3ff'), 1);
    }

    // Bras courts terminés par des moufles
    var swing = moving ? (step & 2 ? 0.25 : -0.25) : 0;
    var mit = L.mitten || (masked ? '#2b2b33' : skin);
    [-1, 1].forEach(function (side) {
      c.save();
      c.translate(side * W * 0.42, top + 4);
      var rot = o.grab ? side * -2.5 : -side * 0.28 + swing;
      if (side > 0 && o.armRot != null) rot = o.armRot;
      c.rotate(rot);
      if (side > 0 && L.baton && !o.throwing) { rr(c, -1.6, 9, 3.4, 15, 1.5); fs(c, col('#1d1b26'), 1.4); }
      rr(c, -3.6 * k, -1, 7.2 * k, 11 * k, 3.5 * k); fs(c, col(L.tank ? skin : (L.sleeve || shirt)), lw);
      circ(c, side * 3.2 * k, 9 * k, 1.9 * k); fs(c, col(mit), 1.4);
      circ(c, 0, 11 * k, 4 * k); fs(c, col(mit), lw);
      c.restore();
    });
    if (L.plates) { ell(c, -W * 0.44, top + 3, 7, 5); fs(c, col(L.hatColor), lw); ell(c, W * 0.44, top + 3, 7, 5); fs(c, col(L.hatColor), lw); }
    if (L.tank) { c.fillStyle = col('#8e2a20'); c.fillRect(-W * 0.36, top, 4, 5); c.fillRect(W * 0.36 - 4, top, 4, 5); }
    if (L.medbag) {
      line(c, W * 0.3, top + 1, -W * 0.45, top + 13, col('#7a4b2a'), 2.2);
      rr(c, -W * 0.72, top + 10, 15, 12, 3); fs(c, col('#ffffff'), lw);
      c.fillStyle = col('#e2342e'); c.fillRect(-W * 0.72 + 6, top + 12, 3, 8); c.fillRect(-W * 0.72 + 3.5, top + 14.5, 8, 3);
    }

    if ((type === 'garde' || type === 'chef') && (o.rank || 0) >= 1) {
      rr(c, -W * 0.56, top - 1, 9, 4.5, 2); fs(c, col('#ffd447'), 1.4); rr(c, W * 0.56 - 9, top - 1, 9, 4.5, 2); fs(c, col('#ffd447'), 1.4);
    }
    if (L.wand) {
      line(c, W * 0.5, top + 14, W * 0.5 + 10, top - 2, col(INK), 3);
      line(c, W * 0.5 + 8, top + 1, W * 0.5 + 10, top - 2, col('#ffffff'), 2.4);
      if (!flash) { starPath(c, W * 0.5 + 11, top - 4, Math.sin(t * 9) > 0 ? 5.5 : 4, 1.7, 4); fs(c, '#fff36b', 1.2); }
    }
    if (L.megaphone) {
      c.save(); c.translate(W * 0.5 + 3, top + 10); c.rotate(-0.5);
      c.beginPath(); c.moveTo(0, -3); c.lineTo(13, -8); c.lineTo(13, 8); c.lineTo(0, 3); c.closePath(); fs(c, col('#e2405e'), lw);
      ell(c, 13, 0, 2.4, 8); fs(c, col('#f5c518'), 1.2);
      c.restore();
    }
    if (L.cane) { line(c, W * 0.5 + 2, top + 14, W * 0.5 + 8, -1, col('#1b1b22'), 3); circ(c, W * 0.5 + 2, top + 13, 3); fs(c, col('#f2c14e'), 1.3); }

    // Tête
    var e1 = hx - 3.8 * k, e2 = hx + 5.8 * k, ey = hy - 2 * k, erx = 4.9 * k, ery = 6 * k;
    function head() { ell(c, hx, hy, R, R * 0.9); }
    function capTop(color, yCut) {
      // Couvre-chef plaqué sur le haut du crâne (bonnet, casquette, capuche, cagoule)
      c.save(); head(); c.clip(); c.fillStyle = col(color); c.fillRect(hx - R - 2, hy - R - 2, R * 2 + 4, yCut - (hy - R - 2)); c.restore();
    }
    if (L.hat === 'hood') { ell(c, hx - 1.5, hy + 1, R + 4, R * 0.9 + 4); fs(c, col(shade(L.hatColor, -0.15)), lw); }

    if (L.hat === 'helmet') {
      // Heaume : un seau d'acier avec une fente pour les yeux
      rr(c, hx - R, hy - R * 0.95, R * 2, R * 1.9, 8); fs(c, col(L.hatColor), lw);
      rr(c, hx - R * 0.78, ey - 3, R * 1.56, 6.5, 3); fs(c, col(MASK), 1.2);
      circ(c, e1 + 2, ey + 0.2, 1.5); circ(c, e2 + 1, ey + 0.2, 1.5); c.fillStyle = '#ffffff'; c.fill();
      c.fillStyle = 'rgba(0,0,0,0.4)'; for (var hb = 0; hb < 3; hb++) { circ(c, hx + 2 + hb * 3.5, hy + 7, 0.9); c.fill(); }
      line(c, hx, hy - R * 0.9, hx, ey - 4, 'rgba(0,0,0,0.3)', 1.3);
      if (!flash) { c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(hx - R + 3, hy - R * 0.7, 3, R * 0.9); }
    } else {
      head(); c.fillStyle = col(skin); c.fill();
      if (L.hat === 'beanie' || L.hat === 'cap' || L.hat === 'miner') capTop(L.hatColor, hy - R * 0.4);
      if (L.hat === 'hood') capTop(L.hatColor, hy - R * 0.5);
      if (L.stubble && !flash) {
        c.save(); head(); c.clip(); c.fillStyle = 'rgba(40,30,30,0.18)'; ell(c, hx + 1, hy + R * 0.75, R * 0.85, R * 0.45); c.fill(); c.restore();
      }
      head(); fs(c, null, lw);
      if (L.hat === 'hair') {
        c.beginPath(); c.moveTo(hx - R - 1, hy - R * 0.2);
        for (var hs = 0; hs <= 6; hs++) c.lineTo(hx - R + hs * R / 3, hy - R * (hs % 2 ? 0.55 : 1.15));
        c.lineTo(hx + R + 1, hy - R * 0.2); c.quadraticCurveTo(hx, hy - R * 0.7, hx - R - 1, hy - R * 0.2); c.closePath();
        fs(c, col(L.hair), lw);
      }
      if (L.hat === 'ninja') {
        rr(c, hx - R * 0.8, ey - 6, R * 1.6, 12, 5); fs(c, col('#f2d3b3'), 1.4);
        rr(c, hx - R * 0.98, hy - R * 0.62, R * 1.96, 4.5, 2); fs(c, col(L.band), 1.4);
        var flow = Math.sin(t * 10) > 0 ? 3 : -1;
        c.beginPath(); c.moveTo(hx - R + 1, hy - R * 0.55); c.quadraticCurveTo(hx - R - 8, hy - R * 0.6 + flow, hx - R - 14, hy - R * 0.25 + flow);
        c.strokeStyle = col(L.band); c.lineWidth = 3.4; c.stroke();
      }

      // Visage
      if (masked) {
        rr(c, hx - R * 0.94, ey - 5.5 * k, R * 1.88, 10.5 * k, 4 * k); fs(c, col(MASK), 1.4);
        c.beginPath(); c.moveTo(hx - R * 0.9, ey - 2); c.lineTo(hx - R - 6, ey - 5); c.lineTo(hx - R - 5, ey + 1); c.closePath(); fs(c, col(MASK), 1.2);
      }
      if (L.sunglasses && !revealed) {
        rr(c, e1 - erx, ey - 3.5, erx * 2, 7, 3); fs(c, col(MASK), 1.4);
        rr(c, e2 - erx, ey - 3.5, erx * 2, 7, 3); fs(c, col(MASK), 1.4);
        if (!flash) { c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(e1 - 2, ey - 2, 2, 2); c.fillRect(e2 - 2, ey - 2, 2, 2); }
      } else {
        [e1, e2].forEach(function (ex) {
          ell(c, ex, ey, erx, ery); fs(c, '#ffffff', 1.4);
          if (surprised) { circ(c, ex + 0.8, ey, 1.2 * k); }
          else { circ(c, ex + 1.6 * k, ey + 0.6, 1.5 * k); }
          c.fillStyle = INK; c.fill();
          if (L.lids && !surprised) {
            // Paupières mi-closes : le regard en coin du filou
            c.save(); ell(c, ex, ey, erx, ery); c.clip();
            c.fillStyle = col(masked ? MASK : skin); c.fillRect(ex - erx - 1, ey - ery - 1, erx * 2 + 2, ery * 0.85);
            c.restore();
            line(c, ex - erx + 0.5, ey - ery * 0.15, ex + erx - 0.5, ey - ery * 0.15, INK, 1.4);
          }
        });
        if (L.brows) {
          line(c, e1 - 4, ey - ery - 2.5, e1 + 3.5, ey - ery + 0.5, INK, 2.4);
          line(c, e2 + 4, ey - ery - 2.5, e2 - 3.5, ey - ery + 0.5, INK, 2.4);
        }
      }
      if (L.glasses) {
        c.beginPath(); ell(c, e1, ey, erx + 1.5, ery + 1.5); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke();
        ell(c, e2, ey, erx + 1.5, ery + 1.5); c.stroke();
      }
      if (L.monocle) { ell(c, e2, ey, erx + 1.8, ery + 1.8); c.lineWidth = 1.8; c.strokeStyle = '#f2c14e'; c.stroke(); line(c, e2 + 2, ey + ery + 1.5, e2 - 1, ey + ery + 9, '#f2c14e', 1); }

      // Bouche
      var my = hy + R * 0.52;
      if (surprised) { ell(c, hx + 2, my, 2.6, 3.2); fs(c, col('#5a1f1f'), 1.3); }
      else if (L.smile && !revealed) {
        c.beginPath(); c.moveTo(hx - 3, my - 1.5); c.quadraticCurveTo(hx + 2, my + 3.5, hx + 7, my - 1.5); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
      } else {
        c.beginPath(); c.moveTo(hx - 2, my); c.quadraticCurveTo(hx + 3, my + 1, hx + 7, my - 2); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
      }
      if (L.mustache || (revealed && type === 'faussaire')) {
        var mc = L.mustache || '#3a2418';
        c.beginPath(); c.ellipse(hx - 0.5, my - 3.2, 4.5, 2, -0.2, 0, TAU); c.ellipse(hx + 5.5, my - 3.2, 4.5, 2, 0.2, 0, TAU); fs(c, col(mc), 1.2);
      }
    }

    // Chapeaux
    var crown = hy - R * 0.9;
    if (L.hat === 'beanie') {
      rr(c, hx - R - 1, hy - R * 0.48, R * 2 + 2, 5, 2.5); fs(c, col(shade(L.hatColor, 0.18)), lw);
      circ(c, hx - 1, crown - 2, 4.2); fs(c, col(L.pom), lw);
    } else if (L.hat === 'cap') {
      ell(c, hx + R * 0.72, hy - R * 0.42, 8.5, 2.6); fs(c, col(shade(L.hatColor, -0.2)), lw);
      circ(c, hx, crown + 0.5, 1.8); fs(c, col(shade(L.hatColor, -0.2)), 1);
    } else if (L.hat === 'bald') {
      if (!flash) { c.fillStyle = 'rgba(255,255,255,0.5)'; ell(c, hx - 5, hy - R * 0.6, 4, 2, -0.4); c.fill(); }
    } else if (L.hat === 'straw') {
      ell(c, hx, hy - R * 0.6, R + 7, 4.5); fs(c, col(L.hatColor), lw);
      rr(c, hx - 9, hy - R * 0.6 - 10, 18, 10, 4); fs(c, col(L.hatColor), lw);
      c.fillStyle = col('#d8402f'); c.fillRect(hx - 9, hy - R * 0.6 - 4, 18, 2.5);
    } else if (L.hat === 'wizard') {
      ell(c, hx, hy - R * 0.62, R + 6, 3.8); fs(c, col(L.hatColor), lw);
      c.beginPath(); c.moveTo(hx - R + 3, hy - R * 0.66); c.lineTo(hx + 8 - (step & 1) * 2, hy - R * 0.66 - 26); c.lineTo(hx + R - 3, hy - R * 0.66); c.closePath(); fs(c, col(L.hatColor), lw);
      starPath(c, hx + 1, hy - R * 0.66 - 9, 3.8, 1.6); fs(c, col(L.stars), 1.1);
    } else if (L.hat === 'top') {
      ell(c, hx, hy - R * 0.72, R + 3, 3.6); fs(c, col(L.hatColor), lw);
      rr(c, hx - 9, hy - R * 0.72 - 18, 18, 18, 2); fs(c, col(L.hatColor), lw);
      c.fillStyle = col('#6b2d8f'); c.fillRect(hx - 9, hy - R * 0.72 - 6, 18, 3.5);
    } else if (L.hat === 'miner') {
      rr(c, hx - R - 2, hy - R * 0.48, R * 2 + 4, 4.5, 2); fs(c, col(shade(L.hatColor, -0.15)), lw);
      rr(c, hx + R * 0.35, crown + 2, 8, 7, 2); fs(c, col('#7a7a7a'), 1.2);
      circ(c, hx + R * 0.35 + 6, crown + 5.5, 3); fs(c, col('#fff6b0'), 1.2);
    } else if (L.hat === 'nurse') {
      // Coiffe haute d'infirmière : la silhouette se reconnaît de loin
      c.beginPath(); c.moveTo(hx - 11, crown + 3); c.lineTo(hx - 8, crown - 16); c.quadraticCurveTo(hx, crown - 21, hx + 8, crown - 16); c.lineTo(hx + 11, crown + 3); c.closePath(); fs(c, col('#ffffff'), lw);
      c.fillStyle = col('#e2342e'); c.fillRect(hx - 2, crown - 13, 4, 11); c.fillRect(hx - 5.5, crown - 9.5, 11, 4);
    } else if (L.hat === 'kepi') {
      rr(c, hx - 12, crown - 5, 24, 11, 3); fs(c, col(L.hatColor), lw);
      c.fillStyle = col((o.rank || 0) >= 2 ? '#ffd447' : '#d9dde6'); c.fillRect(hx - 12, crown + 2, 24, 2.4);
      ell(c, hx + 7, crown + 6, 10, 2.8); fs(c, col('#1d1b26'), lw);
      circ(c, hx + 1, crown - 0.5, 2.6); fs(c, col('#ffd447'), 1.1);
    }
    c.restore();
  };

  // Version mise en cache : chaque pose (type, couleurs, pas, sens, sac, liseré…) est dessinée
  // une seule fois dans une petite image, puis réutilisée. Le liseré papier ne coûte plus rien.
  var personCache = new Map();
  A.personCached = function (c, type, o, halo) {
    if (typeof document === 'undefined') return A.person(c, type, o);
    // Voleurs à animation continue (baguette, écran, bandeau) : dessinés en direct pour rester fluides
    var Lc = LOOKS[type] || LOOKS.voleur;
    if (Lc.wand || Lc.laptop || Lc.hat === 'ninja') {
      if (halo) { A.HALO = true; A.person(c, type, o); A.HALO = false; }
      return A.person(c, type, o);
    }
    var tr = c.getTransform(), sc = Math.hypot(tr.a, tr.b) || 1, size = o.size || 1;
    var step = o.moving !== false ? Math.floor((o.phase || 0) / (Math.PI / 2)) & 3 : 0;
    var tq = Math.floor((o.t || 0) * 2) % 2;
    var key = [type, (o.id || 0) % 6, step, (o.face || 1) > 0 ? 1 : 0, Math.min(o.carrying || 0, 3), o.grab ? 1 : 0, o.flash ? 1 : 0,
      o.revealed ? 1 : 0, o.moving === false ? 0 : 1, size, tq, halo ? 1 : 0, Math.round(sc * 20)].join('|');
    var e = personCache.get(key);
    if (!e) {
      var bw = 130 * size, bh = 160 * size, ox = 65 * size, oy = 125 * size;
      var cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.ceil(bw * sc)); cv.height = Math.max(1, Math.ceil(bh * sc));
      var g = cv.getContext('2d'); g.scale(sc, sc); g.translate(ox, oy);
      var o2 = {}; for (var k in o) o2[k] = o[k]; o2.t = tq * 0.5;
      if (halo) { A.HALO = true; A.person(g, type, o2); A.HALO = false; }
      A.person(g, type, o2);
      e = { cv: cv, ox: ox, oy: oy, w: bw, h: bh };
      if (personCache.size > 900) personCache.clear();
      personCache.set(key, e);
    }
    c.drawImage(e.cv, -e.ox, -e.oy, e.w, e.h);
  };

  /* ---------- Socle des défenses ---------- */
  A.pedestal = function (c, level, accent, disabled) {
    shadow(c, 0, 8, 37, 12, 0.45);
    // Niveau 3 : socle doré, repérable d'un coup d'œil
    var gold = level >= 2 && !disabled;
    rr(c, -29, -16, 58, 24, 5); fs(c, disabled ? '#8d8d96' : '#e9e2d3');
    ell(c, 0, -16, 29, 9); fs(c, disabled ? '#a6a6ae' : '#f7f2e6');
    c.fillStyle = accent; c.fillRect(-27, -3, 54, 7);
    if (gold) {
      ell(c, 0, -16, 29, 9); c.lineWidth = 3; c.strokeStyle = '#e2b13e'; c.stroke();
      c.beginPath(); c.moveTo(-12, 6); c.lineTo(-12, -6); c.lineTo(-6, -1); c.lineTo(0, -9); c.lineTo(6, -1); c.lineTo(12, -6); c.lineTo(12, 6); c.closePath(); fs(c, '#f2c230', 1.8);
    }
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
    if (!t.bare) A.pedestal(c, lv, def.color, t.disabled);
    c.save();
    c.translate(0, -18);
    if (type === 'gardien') drawGuard(c, t, lv, time);
    else if (type === 'glu') drawGlue(c, t, lv, time);
    else if (type === 'camera') drawCamera(c, t, lv, time);
    else if (type === 'chien') drawDog(c, t, lv, time);
    else if (type === 'filet') drawNetGun(c, t, lv, time);
    else if (type === 'laser') drawLaser(c, t, lv, time);
    else if (type === 'canon') drawCanon(c, t, lv, time);
    else if (type === 'ventilo') drawFan(c, t, lv, time);
    else if (type === 'arroseur') drawSprinkler(c, t, lv, time);
    else if (type === 'chef') drawChief(c, t, lv, time);
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
    var throwing = t.fireT > 0;
    c.save();
    c.translate(0, Math.sin(time * 2.4) > 0 ? -1 : 0);
    A.person(c, 'garde', {
      face: t.face || 1, moving: false, t: time, rank: lv, throwing: throwing,
      armRot: throwing ? -2.2 + (0.25 - t.fireT) * 8 : null,
    });
    c.restore();
  }

  // Ventilateur sur pied : les pales tournent par crans, plus vite quand il souffle
  function drawFan(c, t, lv, time) {
    var face = Math.cos(t.aim || 0) < 0 ? -1 : 1, blow = t.fireT > 0;
    rr(c, -3, -40, 6, 40, 2); fs(c, '#8a9099', 2);
    ell(c, 0, -2, 14, 5); fs(c, '#6f7680', 2);
    c.save(); c.translate(0, -50); c.scale(face, 1);
    circ(c, 0, 0, 22); fs(c, lv >= 2 ? '#2b5f73' : '#5fb8c9', 2.2);
    var a = Math.floor(time * (blow ? 18 : 6)) * (Math.PI / 6);
    for (var i = 0; i < 3; i++) {
      c.save(); c.rotate(a + i * Math.PI * 2 / 3);
      ell(c, 0, -10, 6, 10); fs(c, '#f4efe4', 1.6);
      c.restore();
    }
    circ(c, 0, 0, 4.5); fs(c, lv >= 1 ? '#ffd447' : '#8a9099', 1.6);
    c.strokeStyle = 'rgba(42,28,22,0.55)'; c.lineWidth = 1.1;
    for (var k = 0; k < 6; k++) { var ka = k * Math.PI / 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(ka) * 22, Math.sin(ka) * 22); c.stroke(); }
    circ(c, 0, 0, 22); fs(c, null, 2.2);
    c.restore();
  }

  // Arroseur : une borne rouge avec une buse qui tourne et des jets d'eau
  function drawSprinkler(c, t, lv, time) {
    rr(c, -13, -34, 26, 34, 7); fs(c, lv >= 2 ? '#b8283a' : '#d8402f');
    c.fillStyle = '#f4efe4'; c.fillRect(-13, -26, 26, 4);
    rr(c, -17, -20, 6, 9, 2); fs(c, '#c9c9c9', 1.6); rr(c, 11, -20, 6, 9, 2); fs(c, '#c9c9c9', 1.6);
    ell(c, 0, -36, 11, 4); fs(c, '#9a3a2a', 1.8);
    var spin = Math.floor((t.aim || 0) * 2) * 0.6;
    c.save(); c.translate(0, -42); c.rotate(spin);
    rr(c, -14, -2.5, 28, 5, 2.5); fs(c, '#c9c9c9', 1.6);
    c.restore();
    if (t.fireT > 0) {
      c.strokeStyle = 'rgba(90,170,255,0.85)'; c.lineWidth = 2.4; c.lineCap = 'round'; c.setLineDash([3, 5]);
      for (var j = 0; j < 4; j++) {
        var ja = spin + j * Math.PI / 2, dx = Math.cos(ja), dy = Math.sin(ja) * 0.5;
        c.beginPath(); c.moveTo(dx * 14, -42 + dy * 14); c.quadraticCurveTo(dx * 40, -62 + dy * 30, dx * 62, -10 + dy * 40); c.stroke();
      }
      c.setLineDash([]);
    }
    if (lv >= 1) { circ(c, 0, -14, 4); fs(c, '#ffd447', 1.4); }
  }

  // Chef de la Sécurité : il commande au mégaphone
  function drawChief(c, t, lv, time) {
    var talk = Math.sin(time * 1.3) > 0.6;
    c.save();
    c.translate(0, talk ? -1 : 0);
    A.person(c, 'chef', { face: t.face || 1, moving: false, t: time, rank: lv + 1 });
    c.restore();
    if (talk) {
      c.font = '12px ' + A.FONT; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = INK; c.fillStyle = '#fff';
      c.strokeText('!', 30, -70); c.fillText('!', 30, -70);
    }
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
    // Trésors des salles 11 à 50
    if (kind === 'diamant') {
      c.beginPath(); c.moveTo(-18, -14); c.lineTo(-10, -24); c.lineTo(10, -24); c.lineTo(18, -14); c.lineTo(0, 8); c.closePath(); fs(c, '#9fe7ff');
      c.beginPath(); c.moveTo(-18, -14); c.lineTo(18, -14); c.moveTo(-6, -24); c.lineTo(-8, -14); c.lineTo(0, 8); c.lineTo(8, -14); c.lineTo(6, -24); c.lineWidth = 1.4; c.strokeStyle = 'rgba(42,28,22,0.6)'; c.stroke();
      if (Math.sin(time * 4) > 0.3) { starPath(c, 12, -22, 5, 1.5, 4); c.fillStyle = '#fff'; c.fill(); }
      return;
    }
    if (kind === 'vase') {
      c.beginPath(); c.moveTo(-6, -34); c.lineTo(6, -34); c.lineTo(5, -28); c.quadraticCurveTo(18, -20, 15, -4); c.quadraticCurveTo(12, 8, 0, 8); c.quadraticCurveTo(-12, 8, -15, -4); c.quadraticCurveTo(-18, -20, -5, -28); c.closePath();
      fs(c, '#2f6fb0');
      c.fillStyle = '#f4efe4'; c.fillRect(-14, -16, 28, 5); c.fillStyle = '#f5c518'; circ(c, 0, -2, 4); c.fill();
      return;
    }
    if (kind === 'globe') {
      rr(c, -3, -2, 6, 10, 2); fs(c, '#c9952e', 1.6); ell(c, 0, 8, 12, 3.5); fs(c, '#c9952e', 1.6);
      circ(c, 0, -16, 15); fs(c, '#4fa3d8');
      c.fillStyle = '#6cbf3a'; c.beginPath(); c.moveTo(-9, -24); c.quadraticCurveTo(-2, -28, 0, -20); c.quadraticCurveTo(-4, -12, -10, -14); c.fill();
      c.beginPath(); c.moveTo(4, -12); c.quadraticCurveTo(12, -16, 10, -6); c.quadraticCurveTo(4, -4, 4, -12); c.fill();
      circ(c, 0, -16, 15); fs(c, null, 2);
      c.beginPath(); c.arc(0, -16, 19, -2.4, 0.8); c.lineWidth = 2.4; c.strokeStyle = '#c9952e'; c.stroke();
      return;
    }
    if (kind === 'trophee') {
      c.beginPath(); c.moveTo(-14, -30); c.lineTo(14, -30); c.quadraticCurveTo(14, -8, 0, -6); c.quadraticCurveTo(-14, -8, -14, -30); c.closePath(); fs(c, '#f2c230');
      c.beginPath(); c.arc(-14, -22, 6, Math.PI * 0.5, Math.PI * 1.5); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
      c.beginPath(); c.arc(14, -22, 6, -Math.PI * 0.5, Math.PI * 0.5); c.stroke();
      rr(c, -3, -7, 6, 8, 1); fs(c, '#e0a91c', 1.6); rr(c, -10, 1, 20, 7, 2); fs(c, '#7a4b2a', 1.6);
      starPath(c, 0, -20, 5, 2.2); c.fillStyle = '#fff6b0'; c.fill();
      return;
    }
    if (kind === 'fusee') {
      c.beginPath(); c.moveTo(0, -38); c.quadraticCurveTo(11, -26, 9, 0); c.lineTo(-9, 0); c.quadraticCurveTo(-11, -26, 0, -38); c.closePath(); fs(c, '#f4efe4');
      c.beginPath(); c.moveTo(-9, -6); c.lineTo(-16, 6); c.lineTo(-9, 2); c.closePath(); fs(c, '#e2405e', 1.6);
      c.beginPath(); c.moveTo(9, -6); c.lineTo(16, 6); c.lineTo(9, 2); c.closePath(); fs(c, '#e2405e', 1.6);
      circ(c, 0, -20, 4.5); fs(c, '#4fa3d8', 1.6);
      if (Math.floor(time * 8) % 2) { c.beginPath(); c.moveTo(-5, 1); c.lineTo(0, 12); c.lineTo(5, 1); c.closePath(); fs(c, '#ffb347', 1.2); }
      return;
    }
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

  // bare : sans le socle (menu de construction), la défense occupe toute l'icône
  A.towerIcon = function (type, level, bare) {
    level = level || 0;
    return A.icon('t-' + type + level + (bare ? 'b' : ''), 80, 96, function (c) {
      if (bare) { c.translate(40, 104); c.scale(1.12, 1.12); } else c.translate(40, 78);
      A.tower(c, type, { level: level, aim: -0.25, face: 1, time: 0.3, bare: bare });
    });
  };
  A.enemyIcon = function (type) {
    return A.icon('e-' + type, 72, 80, function (c) {
      c.translate(36, 76);
      var size = (LOOKS[type] && LOOKS[type].big ? 0.9 : 1) * 0.98;
      A.person(c, type, { face: 1, size: size, phase: 0, moving: false, id: 3, t: 0.4 });
    });
  };
  A.powerIcon = function (id) {
    return A.icon('p-' + id, 64, 64, function (c) { c.translate(32, 32); A.drawPower(c, id); });
  };
  A.drawPower = function (c, id) {
    {
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
    }
  };

  A.lockIcon = function () {
    return A.icon('lock2', 48, 48, function (c) {
      c.translate(24, 26);
      c.beginPath(); c.arc(0, -4, 9, Math.PI, 0); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3.5; c.strokeStyle = '#b9b2a6'; c.stroke();
      rr(c, -13, -5, 26, 21, 5); fs(c, '#8a8378', 3);
      circ(c, 0, 4, 3); c.fillStyle = INK; c.fill(); rr(c, -1.4, 5, 2.8, 6, 1.2); c.fill();
    });
  };
  // Victoire : le gardien salue à côté du trésor ; défaite : cloche vide et voleur qui file
  A.endArt = function (win, kind) {
    return A.icon('end-' + (win ? 'w' : 'l') + kind, 220, 120, function (c) {
      if (win) {
        c.save(); c.translate(150, 112); c.scale(0.55, 0.55); A.treasure(c, kind, true, 0.5, 0); c.restore();
        c.save(); c.translate(70, 114); c.scale(1.45, 1.45); A.person(c, 'garde', { face: 1, moving: false, t: 0.3, rank: 2, grab: true }); c.restore();
        [[24, 20], [110, 12], [200, 28]].forEach(function (p) { starPath(c, p[0], p[1], 7, 3); fs(c, '#ffd447', 1.4); });
      } else {
        c.save(); c.translate(60, 112); c.scale(0.55, 0.55); A.treasure(c, kind, false, 0.5, 0); c.restore();
        c.save(); c.translate(150, 112); c.scale(1.4, 1.4); A.person(c, 'voleur', { face: 1, moving: true, phase: 1, t: 0.3, carrying: 1, id: 2 }); c.restore();
        [[100, 70], [94, 86], [104, 98]].forEach(function (p) { line(c, p[0], p[1], p[0] - 18, p[1], 'rgba(42,28,22,0.5)', 2.4); });
      }
    });
  };

  // Personnages en pied pour l'écran titre (gardien d'un côté, Gentleman de l'autre)
  A.heroArt = function (type) {
    return A.icon('hero-' + type, 150, 210, function (c) {
      c.translate(75, 200); c.scale(type === 'gentleman' ? 2.2 : 2.6, type === 'gentleman' ? 2.2 : 2.6);
      A.person(c, type, { face: type === 'gentleman' ? -1 : 1, moving: false, t: 0.3, rank: 2, id: 2 });
    });
  };

  /* ---------- Icônes des talents de l'Atelier ---------- */
  function towerMini(c, type, lv, sc) {
    c.save(); c.translate(0, 24); c.scale(sc || 0.56, sc || 0.56);
    A.tower(c, type, { level: lv || 0, aim: -0.4, face: 1, time: 0.3, fireT: 0 }); c.restore();
  }
  function head(c, type, x, y, sc) {
    c.save(); c.translate(x, y); c.scale(sc, sc); A.person(c, type, { face: 1, moving: false, t: 0.2, rank: 2, id: 1 }); c.restore();
  }
  function coin(c, x, y, r) {
    circ(c, x, y, r); fs(c, '#f7c948', 2); circ(c, x, y, r * 0.66); c.lineWidth = 1.4; c.strokeStyle = '#c99a1e'; c.stroke();
    starPath(c, x, y + 0.5, r * 0.4, r * 0.17); c.fillStyle = '#c99a1e'; c.fill();
  }
  function bustAt(c, x, y, sc, col) {
    c.save(); c.translate(x, y); c.scale(sc, sc); A.bust(c);
    if (col) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = col; c.fillRect(-30, -60, 60, 70); }
    c.restore();
  }
  function plusBadge(c, x, y, col) {
    circ(c, x, y, 7); fs(c, col || '#3fae46', 1.6);
    line(c, x - 3.5, y, x + 3.5, y, '#fff', 2.4); line(c, x, y - 3.5, x, y + 3.5, '#fff', 2.4);
  }
  var TALENT_DRAW = {
    formation: function (c) { head(c, 'garde', 0, 38, 0.95); plusBadge(c, 17, -16); },
    glu: function (c) { towerMini(c, 'glu', 1, 0.6); plusBadge(c, 17, -16); },
    patrouille: function (c) { head(c, 'garde', -10, 34, 0.62); head(c, 'garde', 11, 38, 0.62); },
    machoires: function (c) {
      towerMini(c, 'chien', 2, 0.62);
      c.fillStyle = '#fff'; for (var k = 0; k < 4; k++) { c.beginPath(); c.moveTo(4 + k * 5, -18); c.lineTo(6.5 + k * 5, -11); c.lineTo(9 + k * 5, -18); c.closePath(); c.fill(); c.lineWidth = 1; c.strokeStyle = INK; c.stroke(); }
    },
    brigade: function (c) { head(c, 'garde', -14, 36, 0.5); head(c, 'garde', 14, 36, 0.5); head(c, 'garde', 0, 42, 0.56); },
    perfo: function (c) {
      c.beginPath(); c.moveTo(-14, -16); c.lineTo(14, -16); c.lineTo(14, 2); c.quadraticCurveTo(14, 16, 0, 22); c.quadraticCurveTo(-14, 16, -14, 2); c.closePath(); fs(c, '#c3cad4', 2);
      c.beginPath(); c.moveTo(-3, -16); c.lineTo(2, -4); c.lineTo(-2, 4); c.lineTo(3, 22); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke();
      c.save(); c.rotate(-0.6); rr(c, -24, -3, 30, 6, 3); fs(c, '#f2c230', 1.6); c.beginPath(); c.moveTo(6, -6); c.lineTo(14, 0); c.lineTo(6, 6); c.closePath(); fs(c, '#596273', 1.6); c.restore();
    },
    optique: function (c) {
      circ(c, 0, 0, 20); fs(c, '#3a3f55', 2); circ(c, 0, 0, 14); fs(c, '#69c9ff', 2); circ(c, 0, 0, 7); fs(c, '#2b5f73', 1.6);
      circ(c, -5, -5, 3.5); c.fillStyle = 'rgba(255,255,255,0.85)'; c.fill();
    },
    surchauffe: function (c) {
      towerMini(c, 'laser', 1, 0.6);
      c.beginPath(); c.moveTo(8, -6); c.quadraticCurveTo(22, -16, 14, -26); c.quadraticCurveTo(12, -18, 6, -18); c.quadraticCurveTo(10, -24, 4, -28); c.quadraticCurveTo(-2, -14, 8, -6); fs(c, '#ff9f1c', 1.6);
    },
    blindage: function (c) {
      c.beginPath(); c.moveTo(-18, 14); c.quadraticCurveTo(-10, -2, 0, 6); c.quadraticCurveTo(10, 14, 16, -4); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); c.lineWidth = 2.6; c.strokeStyle = '#596273'; c.stroke();
      c.beginPath(); c.moveTo(2, -20); c.lineTo(18, -20); c.lineTo(18, -8); c.quadraticCurveTo(18, 2, 10, 6); c.quadraticCurveTo(2, 2, 2, -8); c.closePath(); fs(c, '#3d6fd6', 2);
      c.beginPath(); c.moveTo(11, -17); c.lineTo(7, -9); c.lineTo(11, -9); c.lineTo(8, -1); c.lineWidth = 1.6; c.strokeStyle = '#fff'; c.stroke();
    },
    synergie: function (c) {
      c.lineWidth = 5; c.strokeStyle = INK; c.beginPath(); c.arc(-7, 2, 11, 0, TAU); c.stroke(); c.beginPath(); c.arc(7, 2, 11, 0, TAU); c.stroke();
      c.lineWidth = 2.6; c.strokeStyle = '#f2c230'; c.beginPath(); c.arc(-7, 2, 11, 0, TAU); c.stroke(); c.strokeStyle = '#ffd96a'; c.beginPath(); c.arc(7, 2, 11, 0, TAU); c.stroke();
      starPath(c, 0, -16, 7, 3); fs(c, '#ffd447', 1.4);
    },
    recharge: function (c) {
      rr(c, -14, -22, 28, 5, 2); fs(c, '#8a5a34', 1.6); rr(c, -14, 17, 28, 5, 2); fs(c, '#8a5a34', 1.6);
      c.beginPath(); c.moveTo(-11, -17); c.lineTo(11, -17); c.quadraticCurveTo(10, -4, 2, 0); c.quadraticCurveTo(10, 4, 11, 17); c.lineTo(-11, 17); c.quadraticCurveTo(-10, 4, -2, 0); c.quadraticCurveTo(-10, -4, -11, -17); c.closePath(); fs(c, '#dff6ff', 1.8);
      c.beginPath(); c.moveTo(-6, 15); c.lineTo(6, 15); c.lineTo(0, 7); c.closePath(); c.fillStyle = '#f2c230'; c.fill();
      c.beginPath(); c.moveTo(-7, -12); c.lineTo(7, -12); c.lineTo(0, -4); c.closePath(); c.fill();
    },
    granit: function (c) { bustAt(c, 0, 24, 0.95, 'rgba(90,90,100,0.35)'); plusBadge(c, 17, -16); },
    chute: function (c) {
      bustAt(c, 3, 26, 0.85);
      [-16, -10].forEach(function (x, k) { line(c, x, -24 + k * 6, x, -6 + k * 6, 'rgba(42,28,22,0.6)', 2); });
      line(c, 18, -22, 18, -8, 'rgba(42,28,22,0.6)', 2);
    },
    doublebuste: function (c) { bustAt(c, -10, 26, 0.68); bustAt(c, 11, 26, 0.68); },
    assomme: function (c) {
      bustAt(c, 0, 28, 0.8);
      [[-14, -18], [0, -24], [14, -18]].forEach(function (p) { starPath(c, p[0], p[1], 5, 2.2); fs(c, '#ffd447', 1.2); });
    },
    sirene: function (c) { c.scale(0.82, 0.82); A.drawPower(c, 'alarme'); },
    expresso: function (c) { c.scale(0.82, 0.82); A.drawPower(c, 'cafe'); },
    serrures: function (c) { c.scale(0.82, 0.82); A.drawPower(c, 'verrou'); plusBadge(c, 20, -20); },
    machine: function (c) {
      rr(c, -16, -22, 32, 40, 4); fs(c, '#596273', 2);
      rr(c, -12, -18, 24, 9, 2); fs(c, '#2b2f3a', 1.4); circ(c, 7, -13.5, 2); c.fillStyle = '#ff3b3b'; c.fill();
      rr(c, -4, -6, 8, 6, 1); fs(c, '#2b2f3a', 1.4);
      rr(c, -7, 4, 14, 11, 3); fs(c, '#fff', 1.6); ell(c, 0, 4, 7, 2); c.fillStyle = '#6b4226'; c.fill();
    },
    budget: function (c) { coin(c, -8, 10, 11); coin(c, 8, 8, 11); coin(c, 0, -6, 12); },
    assurance: function (c) {
      c.save(); c.translate(-4, 18);
      c.beginPath(); c.moveTo(-6, -36); c.lineTo(6, -36); c.lineTo(5, -30); c.quadraticCurveTo(16, -24, 13, -10); c.quadraticCurveTo(10, 0, 0, 0); c.quadraticCurveTo(-10, 0, -13, -10); c.quadraticCurveTo(-16, -24, -5, -30); c.closePath(); fs(c, '#3fa7a0', 2);
      c.fillStyle = '#f2c230'; c.fillRect(-12, -20, 24, 4); c.restore();
      c.beginPath(); c.moveTo(6, -2); c.lineTo(22, -2); c.lineTo(22, 8); c.quadraticCurveTo(22, 18, 14, 22); c.quadraticCurveTo(6, 18, 6, 8); c.closePath(); fs(c, '#3fae46', 1.8);
      line(c, 10, 9, 13, 13, '#fff', 2.2); line(c, 13, 13, 19, 5, '#fff', 2.2);
    },
    recup: function (c) {
      c.save(); c.rotate(-0.4);
      c.beginPath(); c.moveTo(-18, -10); c.lineTo(8, -10); c.lineTo(18, 0); c.lineTo(8, 10); c.lineTo(-18, 10); c.closePath(); fs(c, '#f4efe4', 2);
      circ(c, 9, 0, 2.6); c.fillStyle = INK; c.fill();
      c.font = '13px ' + A.FONT; c.textAlign = 'center'; c.fillStyle = '#c0392b'; c.fillText('€', -5, 5);
      c.restore();
    },
    atelier: function (c) {
      c.save(); c.rotate(0.7);
      rr(c, -4, -6, 8, 30, 3); fs(c, '#8a9099', 2);
      c.beginPath(); c.arc(0, -12, 11, 0, TAU); fs(c, '#8a9099', 2);
      rr(c, -4, -26, 8, 12, 1); c.fillStyle = '#fbf6ea'; c.fill();
      c.restore();
    },
    soldes: function (c) {
      starPath(c, 0, 0, 22, 17, 12); fs(c, '#e2405e', 2);
      c.font = '13px ' + A.FONT; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText('-10%', 0, 5);
    },
    interets: function (c) {
      ell(c, 0, 4, 19, 14); fs(c, '#ff9fb5', 2);
      ell(c, 17, 4, 5, 4.5); fs(c, '#ff8aa5', 1.6); circ(c, 16, 3, 0.9); circ(c, 18.5, 3, 0.9); c.fillStyle = INK; c.fill();
      c.beginPath(); c.moveTo(-6, -9); c.lineTo(-2, -16); c.lineTo(2, -9); c.closePath(); fs(c, '#ff8aa5', 1.4);
      rr(c, -10, 16, 5, 6, 1); fs(c, '#ff8aa5', 1.2); rr(c, 6, 16, 5, 6, 1); fs(c, '#ff8aa5', 1.2);
      circ(c, 6, -1, 1.4); c.fillStyle = INK; c.fill(); rr(c, -6, -9, 10, 2.5, 1); c.fill();
      coin(c, -1, -20, 7);
    },
    prime: function (c) { coin(c, 0, 2, 17); starPath(c, 16, -16, 6, 2.4, 4); c.fillStyle = '#fff6b0'; c.fill(); },
    anticipe: function (c) {
      circ(c, -2, 4, 17); fs(c, '#fff', 2); rr(c, -6, -18, 8, 5, 2); fs(c, '#596273', 1.4);
      line(c, -2, 4, -2, -6, INK, 2.2); line(c, -2, 4, 6, 8, INK, 2.2);
      c.beginPath(); c.moveTo(14, -10); c.lineTo(22, -4); c.lineTo(14, 2); c.closePath(); fs(c, '#3fae46', 1.4);
    },
    chasseur: function (c) {
      ['#e2405e', '#fff', '#e2405e', '#fff'].forEach(function (col, k) { circ(c, 0, 0, 20 - k * 5); fs(c, col, 1.6); });
      c.save(); c.rotate(-0.7); rr(c, -2, -30, 4, 26, 2); fs(c, '#8a5a34', 1.4); c.restore();
      coin(c, 14, 14, 7);
    },
    mecene: function (c) {
      c.beginPath(); c.moveTo(-8, -14); c.quadraticCurveTo(-20, 0, -16, 14); c.quadraticCurveTo(0, 22, 16, 14); c.quadraticCurveTo(20, 0, 8, -14); c.closePath(); fs(c, '#a8693b', 2);
      rr(c, -9, -18, 18, 6, 2); fs(c, '#7a4b2a', 1.6);
      c.beginPath(); c.moveTo(-10, -24); c.lineTo(-6, -18); c.lineTo(0, -26); c.lineTo(6, -18); c.lineTo(10, -24); c.lineTo(9, -16); c.lineTo(-9, -16); c.closePath(); fs(c, '#f2c230', 1.4);
      coin(c, 0, 4, 8);
    },
  };
  // Icône d'un talent (64 x 64, mise en cache)
  A.talentIcon = function (id) {
    return A.icon('tal-' + id, 64, 64, function (c) {
      c.translate(32, 32);
      if (TALENT_DRAW[id]) TALENT_DRAW[id](c);
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
