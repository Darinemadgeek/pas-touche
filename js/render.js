/* Pas Touche ! — rendu Canvas 2D : décor mis en cache, entités triées en profondeur, effets visuels. */
(function (PT) {
  'use strict';

  var A = PT.Art, INK = A.INK, TAU = Math.PI * 2;
  var W = PT.WORLD.W, H = PT.WORLD.H, WALL = PT.WORLD.WALL;
  var MX = 320, MY = 180; // marge de décor autour de la salle (visible sur les écrans très larges)
  var rr = A.rr, ell = A.ell, circ = A.circ, fs = A.fs, line = A.line;

  function Renderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fx = []; this.decals = [];
    this.shake = 0; this.redFlash = 0; this.alarmT = 0; this.time = 0;
    this.dpr = 1; this.scale = 1; this.ox = 0; this.oy = 0; this.bgRes = 1;
    this.bg = null; this.night = null; this.level = null;
  }
  PT.Renderer = Renderer;
  var R = Renderer.prototype;

  // Miniature d'un niveau pour l'écran de sélection (sans canvas de jeu).
  Renderer.thumbnail = function (level, w) {
    var r = Object.create(R);
    r.bgRes = w / W;
    r.buildBackground(level);
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = Math.round(w * H / W);
    var c = cv.getContext('2d'), k = r.bgRes;
    c.drawImage(r.bg, MX * k, MY * k, W * k, H * k, 0, 0, cv.width, cv.height);
    if (r.night) c.drawImage(r.night, MX * 0.5, MY * 0.5, W * 0.5, H * 0.5, 0, 0, cv.width, cv.height);
    var tr = level.paths[0][level.paths[0].length - 1];
    c.save(); c.scale(k, k); c.translate(tr[0], tr[1]); A.treasure(c, level.treasure.kind, true, 0.5, 0); c.restore();
    return cv.toDataURL('image/jpeg', 0.86);
  };

  R.resize = function (cssW, cssH) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(cssW * dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * dpr));
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.scale = Math.min(this.canvas.width / W, this.canvas.height / H);
    this.ox = (this.canvas.width - W * this.scale) / 2;
    this.oy = (this.canvas.height - H * this.scale) / 2;
    var res = Math.min(1.5, Math.max(0.5, Math.round(this.scale * 4) / 4));
    if (this.level && res !== this.bgRes) { this.bgRes = res; this.buildBackground(this.level); }
    this.bgRes = res;
  };

  R.toWorld = function (cx, cy) { return { x: (cx * this.dpr - this.ox) / this.scale, y: (cy * this.dpr - this.oy) / this.scale }; };
  R.toScreen = function (wx, wy) { return { x: (wx * this.scale + this.ox) / this.dpr, y: (wy * this.scale + this.oy) / this.dpr }; };
  R.cssScale = function () { return this.scale / this.dpr; };

  R.setLevel = function (level) {
    this.level = level;
    this.fx = []; this.decals = [];
    this.alarmT = 0; this.redFlash = 0; this.shake = 0;
    this.buildBackground(level);
  };

  /* ================= Décor statique ================= */
  R.buildBackground = function (level) {
    if (typeof document === 'undefined') return;
    var res = this.bgRes, th = level.theme, rnd = A.rng(level.id * 7919 + 13);
    var cv = document.createElement('canvas');
    cv.width = Math.ceil((W + 2 * MX) * res); cv.height = Math.ceil((H + 2 * MY) * res);
    var c = cv.getContext('2d');
    c.scale(res, res); c.translate(MX, MY);

    // Murs extérieurs
    c.fillStyle = th.wallDark; c.fillRect(-MX, -MY, W + 2 * MX, H + 2 * MY);
    c.fillStyle = 'rgba(255,255,255,0.035)';
    for (var sx = -MX; sx < W + MX; sx += 38) c.fillRect(sx, -MY, 16, H + 2 * MY);

    // Sol
    c.save(); c.beginPath(); c.rect(0, WALL, W, H - WALL); c.clip();
    drawFloor(c, th, rnd);
    var gl = c.createLinearGradient(0, WALL, 0, H);
    gl.addColorStop(0, 'rgba(255,255,255,0.08)'); gl.addColorStop(1, 'rgba(0,0,0,0.08)');
    c.fillStyle = gl; c.fillRect(0, WALL, W, H - WALL);
    c.restore();

    // Murs latéraux et bas de la salle
    c.fillStyle = A.shade(th.wall, -0.15);
    c.fillRect(-18, WALL, 18, H - WALL + 18); c.fillRect(W, WALL, 18, H - WALL + 18); c.fillRect(-18, H, W + 36, 18);
    c.lineWidth = 3; c.strokeStyle = INK;
    c.strokeRect(-18, -2, W + 36, H + 20); c.strokeRect(0, WALL, W, H - WALL);

    // Tapis rouge des chemins
    var paths = level.paths;
    c.save(); c.beginPath(); c.rect(-MX, WALL, W + 2 * MX, H - WALL + MY); c.clip();
    c.lineJoin = 'round'; c.lineCap = 'butt';
    var layers = [
      { w: 82, col: 'rgba(20,10,5,0.28)', dy: 6 },
      { w: 80, col: INK },
      { w: 74, col: th.trim },
      { w: 66, col: A.shade(th.carpet, -0.35) },
      { w: 62, col: th.carpet },
      { w: 44, col: A.shade(th.carpet, 0.07) },
    ];
    layers.forEach(function (L) {
      paths.forEach(function (p) {
        c.save(); if (L.dy) c.translate(0, L.dy);
        carpetLine(c, p); c.lineWidth = L.w; c.strokeStyle = L.col; c.stroke();
        c.restore();
      });
    });
    paths.forEach(function (p) {
      carpetLine(c, p); c.setLineDash([3, 16]); c.lineWidth = 4; c.strokeStyle = A.shade(th.trim, -0.05); c.globalAlpha = 0.55; c.stroke();
      c.setLineDash([]); c.globalAlpha = 1;
    });
    // tapis de sol sous le trésor
    var tr = paths[0][paths[0].length - 1];
    ell(c, tr[0], tr[1] + 4, 64, 26); fs(c, th.trim, 3);
    ell(c, tr[0], tr[1] + 4, 54, 20); fs(c, th.carpet, 2);
    c.restore();

    // Portes
    var self = this;
    paths.forEach(function (p) { self.drawDoor(c, p, th); });

    // Poteaux et cordons de velours
    drawStanchions(c, level, th);

    // Mur du fond
    drawBackWall(c, level, th, rnd);
    paths.forEach(function (p) { if (p[0][1] < WALL) drawSkylight(c, p, th); });

    // Ombre portée du mur sur le sol
    var sh = c.createLinearGradient(0, WALL, 0, WALL + 34);
    sh.addColorStop(0, 'rgba(20,10,5,0.32)'); sh.addColorStop(1, 'rgba(20,10,5,0)');
    c.fillStyle = sh; c.fillRect(0, WALL, W, 34);

    // Décor
    (level.deco || []).slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (d) { A.deco(c, d, th); });

    // Vignettage des marges
    vignette(c);
    this.bg = cv;

    // Ambiance nocturne
    this.night = null;
    if (th.night) {
      var nr = 0.5, nv = document.createElement('canvas');
      nv.width = Math.ceil((W + 2 * MX) * nr); nv.height = Math.ceil((H + 2 * MY) * nr);
      var n = nv.getContext('2d');
      n.scale(nr, nr); n.translate(MX, MY);
      var panne = level.variant === 'panne';
      n.fillStyle = panne ? 'rgba(6,8,26,0.72)' : 'rgba(8,10,38,0.6)'; n.fillRect(-MX, -MY, W + 2 * MX, H + 2 * MY);
      n.globalCompositeOperation = 'destination-out';
      var lights;
      if (panne) {
        // Panne de courant : les lampes de secours éclairent exactement la zone où les défenses voient.
        var lamps = (level.deco || []).filter(function (d) { return d.t === 'lampe'; });
        lights = lamps.map(function (d) { return { x: d.x, y: d.y, r: d.r || 150, hard: true }; })
          .concat([{ x: tr[0], y: tr[1] - 20, r: 110, hard: true }])
          .concat(level.spots.map(function (sp) { return { x: sp[0], y: sp[1] - 20, r: 58 }; }));
      } else {
        var ls = level.lights || [];
        lights = ls.map(function (l) { return { x: l[0], y: l[1], r: 150 }; })
          .concat(level.spots.map(function (sp) { return { x: sp[0], y: sp[1], r: 105 }; }))
          .concat([{ x: tr[0], y: tr[1] - 40, r: 105 }]);
      }
      lights.forEach(function (l) {
        var g = n.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
        if (l.hard) { g.addColorStop(0, 'rgba(0,0,0,0.97)'); g.addColorStop(0.82, 'rgba(0,0,0,0.88)'); g.addColorStop(1, 'rgba(0,0,0,0)'); }
        else { g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(0.6, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); }
        n.fillStyle = g; n.beginPath(); n.arc(l.x, l.y, l.r, 0, TAU); n.fill();
      });
      if (panne) {
        n.globalCompositeOperation = 'source-over';
        n.setLineDash([10, 9]); n.lineWidth = 3; n.strokeStyle = 'rgba(255,226,120,0.4)';
        lights.forEach(function (l) { if (l.hard) { n.beginPath(); n.arc(l.x, l.y, l.r - 4, 0, TAU); n.stroke(); } });
        n.setLineDash([]);
      }
      this.night = nv;
    }
  };

  function carpetLine(c, p) {
    var p0 = p[0], p1 = p[1], dx = p0[0] - p1[0], dy = p0[1] - p1[1], l = Math.hypot(dx, dy);
    c.beginPath();
    c.moveTo(p0[0] + dx / l * 600, p0[1] + dy / l * 600);
    for (var i = 0; i < p.length; i++) c.lineTo(p[i][0], p[i][1]);
  }

  function drawFloor(c, th, rnd) {
    var x, y, col;
    if (th.floor === 'parquet') {
      var ph = 26;
      for (y = WALL; y < H; y += ph) {
        x = -rnd() * 140;
        while (x < W) {
          var len = 90 + rnd() * 120;
          col = A.shade(rnd() < 0.5 ? th.floorA : th.floorB, (rnd() - 0.5) * 0.08);
          c.fillStyle = col; c.fillRect(x, y, len, ph);
          c.strokeStyle = 'rgba(70,35,12,0.4)'; c.lineWidth = 1.6; c.strokeRect(x, y, len, ph);
          c.strokeStyle = 'rgba(70,35,12,0.12)'; c.lineWidth = 1;
          c.beginPath(); c.moveTo(x + 8, y + 8 + rnd() * 4); c.lineTo(x + len - 8, y + 9 + rnd() * 4); c.stroke();
          x += len;
        }
      }
    } else if (th.floor === 'stone') {
      var tw = 92, tht = 62, row = 0;
      for (y = WALL; y < H; y += tht, row++) {
        for (x = (row % 2) * -tw / 2; x < W; x += tw) {
          c.fillStyle = A.shade(rnd() < 0.5 ? th.floorA : th.floorB, (rnd() - 0.5) * 0.1);
          rr(c, x + 2, y + 2, tw - 4, tht - 4, 6); c.fill();
          if (rnd() < 0.12) { c.strokeStyle = 'rgba(90,60,20,0.35)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x + 20, y + 14); c.lineTo(x + 34, y + 30); c.lineTo(x + 30, y + 44); c.stroke(); }
        }
      }
    } else if (th.floor === 'marble') {
      var sz = 72;
      for (y = WALL; y < H; y += sz) for (x = 0; x < W; x += sz) {
        c.fillStyle = ((x / sz + (y - WALL) / sz) | 0) % 2 ? th.floorB : th.floorA;
        c.fillRect(x, y, sz, sz);
      }
      c.strokeStyle = 'rgba(120,110,95,0.25)'; c.lineWidth = 1.4;
      for (var v = 0; v < 26; v++) {
        x = rnd() * W; y = WALL + rnd() * (H - WALL);
        c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 30, y + rnd() * 40, x + 50, y - 20, x + 90, y + rnd() * 30); c.stroke();
      }
    } else if (th.floor === 'gallery') {
      c.fillStyle = th.floorA; c.fillRect(0, WALL, W, H - WALL);
      for (y = WALL; y < H; y += 128) for (x = 0; x < W; x += 160) {
        c.fillStyle = A.shade(th.floorB, (rnd() - 0.5) * 0.06); c.fillRect(x + 2, y + 2, 156, 124);
      }
      c.fillStyle = 'rgba(255,255,255,0.04)';
      for (var s = 0; s < 18; s++) { ell(c, rnd() * W, WALL + rnd() * (H - WALL), 40 + rnd() * 60, 8 + rnd() * 10); c.fill(); }
    } else if (th.floor === 'royal') {
      var d = 56;
      c.fillStyle = th.floorA; c.fillRect(0, WALL, W, H - WALL);
      c.save(); c.translate(W / 2, (H + WALL) / 2); c.rotate(Math.PI / 4);
      for (var i = -20; i < 20; i++) for (var j = -20; j < 20; j++) {
        if ((i + j) % 2 === 0) { c.fillStyle = th.floorB; c.fillRect(i * d, j * d, d, d); }
      }
      c.restore();
      c.fillStyle = A.shade(th.trim, -0.1);
      var dd = d * Math.SQRT2;
      for (y = WALL; y < H + dd; y += dd / 2) for (x = ((Math.round((y - WALL) / (dd / 2))) % 2) * dd / 2; x < W; x += dd) {
        circ(c, x + (W / 2) % dd, y, 2.6); c.fill();
      }
    } else drawFloor2(c, th, rnd);
  }

  // Sols des salles 6 à 10
  function drawFloor2(c, th, rnd) {
    var x, y, k;
    if (th.floor === 'dalles') {
      // dalles de château
      c.fillStyle = A.shade(th.floorB, -0.3); c.fillRect(0, WALL, W, H - WALL);
      for (y = WALL; y < H; y += 64) {
        x = -rnd() * 60;
        while (x < W) {
          var sw = 70 + rnd() * 70;
          c.fillStyle = A.shade(rnd() < 0.5 ? th.floorA : th.floorB, (rnd() - 0.5) * 0.12);
          rr(c, x + 3, y + 3, sw - 6, 58, 9); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.07)'; rr(c, x + 7, y + 6, sw - 16, 9, 4); c.fill();
          if (rnd() < 0.12) { c.strokeStyle = 'rgba(40,40,50,0.3)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x + 16, y + 14); c.lineTo(x + 30, y + 32); c.lineTo(x + 26, y + 48); c.stroke(); }
          if (rnd() < 0.08) { c.fillStyle = 'rgba(90,140,70,0.35)'; ell(c, x + sw - 10, y + 56, 12, 4); c.fill(); }
          x += sw;
        }
      }
    } else if (th.floor === 'pont') {
      // pont de navire : lattes, calfatage et clous
      c.fillStyle = A.shade(th.floorB, -0.5); c.fillRect(0, WALL, W, H - WALL);
      for (y = WALL; y < H; y += 24) {
        x = -rnd() * 220;
        while (x < W) {
          var len = 220 + rnd() * 160;
          c.fillStyle = A.shade(rnd() < 0.5 ? th.floorA : th.floorB, (rnd() - 0.5) * 0.1);
          c.fillRect(x + 1, y + 1.5, len - 2, 21);
          c.strokeStyle = 'rgba(60,35,15,0.16)'; c.lineWidth = 1;
          c.beginPath(); c.moveTo(x + 10, y + 8 + rnd() * 3); c.bezierCurveTo(x + len * 0.3, y + 6, x + len * 0.6, y + 14, x + len - 10, y + 10 + rnd() * 4); c.stroke();
          c.fillStyle = 'rgba(40,28,18,0.55)';
          circ(c, x + 7, y + 7, 1.6); c.fill(); circ(c, x + 7, y + 17, 1.6); c.fill();
          x += len;
        }
      }
    } else if (th.floor === 'versailles') {
      // parquet de Versailles : panneaux carrés à treillis
      var P = 120;
      c.fillStyle = A.shade(th.floorB, -0.35); c.fillRect(0, WALL, W, H - WALL);
      for (y = WALL - 30; y < H; y += P) for (x = -40; x < W; x += P) {
        c.save(); c.beginPath(); c.rect(x + 2, y + 2, P - 4, P - 4); c.clip();
        c.fillStyle = A.shade(th.floorA, (rnd() - 0.5) * 0.06); c.fillRect(x, y, P, P);
        c.strokeStyle = th.floorB; c.lineWidth = 10;
        c.beginPath();
        for (k = -P; k <= P; k += 40) { c.moveTo(x + k, y); c.lineTo(x + k + P, y + P); c.moveTo(x + k + P, y); c.lineTo(x + k, y + P); }
        c.stroke();
        c.strokeStyle = 'rgba(80,40,10,0.22)'; c.lineWidth = 1; c.stroke();
        c.strokeStyle = A.shade(th.floorA, -0.14); c.lineWidth = 12; c.strokeRect(x + 6, y + 6, P - 12, P - 12);
        c.restore();
      }
    } else if (th.floor === 'beton') {
      // béton de réserve : dalles, taches et marquage au sol
      c.fillStyle = th.floorA; c.fillRect(0, WALL, W, H - WALL);
      for (k = 0; k < 160; k++) {
        c.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,' + (rnd() * 0.06).toFixed(3) + ')' : 'rgba(255,255,255,' + (rnd() * 0.05).toFixed(3) + ')';
        ell(c, rnd() * W, WALL + rnd() * (H - WALL), 10 + rnd() * 40, 6 + rnd() * 20); c.fill();
      }
      c.strokeStyle = 'rgba(30,35,40,0.35)'; c.lineWidth = 2;
      for (x = 200; x < W; x += 200) { c.beginPath(); c.moveTo(x, WALL); c.lineTo(x, H); c.stroke(); }
      for (y = WALL + 160; y < H; y += 160) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      c.strokeStyle = 'rgba(30,35,40,0.3)'; c.lineWidth = 1.4;
      for (k = 0; k < 7; k++) { x = rnd() * W; y = WALL + rnd() * (H - WALL); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 20 + rnd() * 20, y + 10 + rnd() * 16); c.lineTo(x + 30 + rnd() * 30, y + 6 + rnd() * 30); c.stroke(); }
      c.fillStyle = 'rgba(20,20,25,0.12)';
      for (k = 0; k < 5; k++) { ell(c, rnd() * W, WALL + rnd() * (H - WALL), 26 + rnd() * 20, 10 + rnd() * 8); c.fill(); }
      c.fillStyle = A.shade(th.trim, -0.1); c.globalAlpha = 0.45;
      for (x = 0; x < W; x += 36) c.fillRect(x, WALL + 12, 20, 6);
      c.globalAlpha = 1;
    } else if (th.floor === 'acier') {
      // plancher blindé : tôles larmées et rivets
      var Q = 96;
      for (y = WALL; y < H; y += Q) for (x = 0; x < W; x += Q) {
        c.fillStyle = A.shade(rnd() < 0.5 ? th.floorA : th.floorB, (rnd() - 0.5) * 0.06); c.fillRect(x, y, Q, Q);
        c.fillStyle = 'rgba(255,255,255,0.09)';
        for (var ty = 10; ty < Q - 6; ty += 16) for (var tx = 10; tx < Q - 6; tx += 16) {
          c.save(); c.translate(x + tx + (((ty / 16) | 0) % 2) * 8, y + ty); c.rotate(((tx / 16 + ty / 16) | 0) % 2 ? 0.7 : -0.7);
          c.fillRect(-5, -1.5, 10, 3); c.restore();
        }
        c.strokeStyle = 'rgba(15,20,28,0.55)'; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, Q - 2, Q - 2);
        c.fillStyle = 'rgba(220,226,234,0.55)';
        [[6, 6], [Q - 6, 6], [6, Q - 6], [Q - 6, Q - 6]].forEach(function (p) { circ(c, x + p[0], y + p[1], 2.4); c.fill(); });
      }
    }
  }

  R.drawDoor = function (c, p, th) {
    var p0 = p[0];
    if (p0[1] < WALL) return; // entrée par le toit, traitée à part
    var side = p0[0] < 0 ? 'L' : p0[0] > W ? 'R' : 'B';
    var cx, cy;
    if (side === 'L') { cx = 0; cy = p0[1]; } else if (side === 'R') { cx = W; cy = p0[1]; } else { cx = p0[0]; cy = H; }
    c.save();
    c.translate(cx, cy);
    if (side === 'B') c.rotate(-Math.PI / 2);
    // montants de porte
    rr(c, -14, -56, 22, 14, 3); fs(c, '#6b4226');
    rr(c, -14, 42, 22, 14, 3); fs(c, '#6b4226');
    c.restore();
    // panneau SORTIE
    var sxp = side === 'L' ? 34 : side === 'R' ? W - 34 : cx + 70, syp = side === 'B' ? H - 50 : cy - 76;
    rr(c, sxp - 30, syp - 11, 60, 22, 4); fs(c, '#2e9e57', 2.4);
    c.font = '13px ' + A.FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffffff';
    c.fillText('SORTIE', sxp + 4, syp + 1);
    c.fillStyle = '#fff'; circ(c, sxp - 21, syp - 4, 2.4); c.fill();
    line(c, sxp - 21, syp - 1, sxp - 24, syp + 6, '#fff', 2); line(c, sxp - 22, syp + 1, sxp - 17, syp + 3, '#fff', 1.6);
    c.textBaseline = 'alphabetic';
  };

  function drawSkylight(c, p, th) {
    var x = p[0][0];
    var g = c.createLinearGradient(0, 0, 0, WALL);
    g.addColorStop(0, '#05030a'); g.addColorStop(1, A.shade(th.wallDark, -0.4));
    c.fillStyle = g; rr(c, x - 44, -4, 88, WALL + 6, 6); c.fill();
    c.lineWidth = 6; c.strokeStyle = th.trim; c.stroke(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
    // corde qui pend
    line(c, x - 18, -4, x - 22, WALL + 30, '#c8a46a', 4);
    for (var k = 8; k < WALL + 26; k += 12) line(c, x - 25, k, x - 16, k + 2, '#8a6a3a', 2);
    c.font = '12px ' + A.FONT; c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,0.6)';
    c.fillText('VERRIÈRE', x + 14, 26);
  }

  function segDist(px, py, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    var t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l2));
    return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
  }
  function minPathDist(level, x, y) {
    var m = Infinity;
    level.paths.forEach(function (p) { for (var i = 0; i < p.length - 1; i++) m = Math.min(m, segDist(x, y, p[i], p[i + 1])); });
    return m;
  }

  function drawStanchions(c, level, th) {
    var posts = [], ropes = [];
    var tr = level.paths[0][level.paths[0].length - 1];
    var seen = {};
    level.paths.forEach(function (p) {
      for (var i = 0; i < p.length - 1; i++) {
        var a = p[i], b = p[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
        var ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
        [-1, 1].forEach(function (side) {
          var prev = null;
          for (var d = 50; d < len - 40; d += 64) {
            var x = a[0] + ux * d + nx * 47 * side, y = a[1] + uy * d + ny * 47 * side;
            var key = Math.round(x / 12) + ',' + Math.round(y / 12);
            var ok = x > 14 && x < W - 14 && y > WALL + 16 && y < H - 8 && minPathDist(level, x, y) > 44 &&
              Math.hypot(x - tr[0], y - tr[1]) > 80 && !seen[key];
            for (var s = 0; ok && s < level.spots.length; s++) if (Math.hypot(level.spots[s][0] - x, level.spots[s][1] - y) < 48) ok = false;
            (level.deco || []).forEach(function (dc) { if (Math.hypot(dc.x - x, dc.y - y) < 40) ok = false; });
            if (ok) {
              seen[key] = 1;
              var pt = { x: x, y: y };
              posts.push(pt);
              if (prev) ropes.push([prev, pt]);
              prev = pt;
            } else prev = null;
          }
        });
      }
    });
    ropes.forEach(function (r) {
      var a = r[0], b = r[1];
      c.beginPath(); c.moveTo(a.x, a.y - 20); c.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 - 8, b.x, b.y - 20);
      c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3.4; c.strokeStyle = '#b8283a'; c.stroke();
    });
    posts.forEach(function (p) {
      A.shadow(c, p.x, p.y + 2, 8, 3);
      ell(c, p.x, p.y, 7, 3); fs(c, th.trim, 1.8);
      rr(c, p.x - 2.2, p.y - 24, 4.4, 24, 2); fs(c, th.trim, 1.8);
      circ(c, p.x, p.y - 25, 3.6); fs(c, th.trim, 1.8);
    });
  }

  function drawBackWall(c, level, th, rnd) {
    c.fillStyle = th.wall; c.fillRect(0, 0, W, WALL);
    c.fillStyle = 'rgba(255,255,255,0.05)';
    for (var x = 0; x < W; x += 30) c.fillRect(x, 8, 12, 54);
    c.fillStyle = A.shade(th.wall, -0.3); c.fillRect(0, 0, W, 8);
    c.fillStyle = th.trim; c.fillRect(0, 8, W, 2.5);
    // soubassement
    c.fillStyle = A.shade(th.wall, -0.22); c.fillRect(0, 62, W, WALL - 62);
    c.fillStyle = th.trim; c.fillRect(0, 61, W, 2.5);
    c.fillStyle = A.shade(th.wallDark, -0.2); c.fillRect(0, WALL - 6, W, 6);
    var kind = th.floor;
    if (kind === 'stone') {
      // frise de hiéroglyphes
      c.strokeStyle = th.trim; c.lineWidth = 2;
      for (var hx = 14; hx < W; hx += 26) {
        var k = (hx / 26) | 0;
        if (k % 4 === 0) { c.beginPath(); c.ellipse(hx, 72, 6, 3, 0, 0, TAU); c.stroke(); circ(c, hx, 72, 1.4); c.fillStyle = th.trim; c.fill(); }
        else if (k % 4 === 1) { circ(c, hx, 67, 3); c.stroke(); line(c, hx, 70, hx, 80, th.trim, 2); line(c, hx - 4, 73, hx + 4, 73, th.trim, 2); }
        else if (k % 4 === 2) { line(c, hx - 5, 78, hx + 5, 66, th.trim, 2); line(c, hx - 5, 66, hx + 5, 78, th.trim, 2); }
        else { c.beginPath(); c.moveTo(hx - 6, 78); c.lineTo(hx, 66); c.lineTo(hx + 6, 78); c.stroke(); }
      }
    } else if (kind === 'gallery') {
      c.fillStyle = th.trim; c.fillRect(0, 61, W, 3);
      c.shadowColor = th.trim; c.shadowBlur = 12; c.fillRect(0, 61, W, 3); c.shadowBlur = 0;
    } else if (kind === 'royal') {
      c.fillStyle = 'rgba(242,193,78,0.35)';
      for (var dx = 10; dx < W; dx += 22) { c.beginPath(); c.moveTo(dx, 66); c.lineTo(dx + 6, 72); c.lineTo(dx, 78); c.lineTo(dx - 6, 72); c.fill(); }
    } else if (kind === 'dalles') {
      // gros blocs de pierre
      c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 2;
      for (var by = 10, bi = 0; by < 61; by += 17, bi++) {
        c.beginPath(); c.moveTo(0, by + 17); c.lineTo(W, by + 17); c.stroke();
        for (var bx = (bi % 2) * 30; bx < W; bx += 60) { c.beginPath(); c.moveTo(bx, by); c.lineTo(bx, by + 17); c.stroke(); }
      }
    } else if (kind === 'pont') {
      // cordage
      for (var rx = 0; rx < W; rx += 10) { c.beginPath(); c.ellipse(rx + 5, 72, 6, 3.4, 0.6, 0, TAU); c.fillStyle = rx % 20 ? '#c8a46a' : '#a8844a'; c.fill(); }
    } else if (kind === 'versailles') {
      c.fillStyle = 'rgba(255,240,200,0.25)';
      for (var gx = 40; gx < W; gx += 85) c.fillRect(gx, 10, 6, 51);
      c.fillStyle = th.trim;
      for (var gx2 = 40; gx2 < W; gx2 += 85) { circ(c, gx2 + 3, 70, 4); c.fill(); }
    } else if (kind === 'beton') {
      // tuyaux
      [70, 78].forEach(function (py, i) {
        c.fillStyle = i ? '#7a8590' : '#9aa3ad'; c.fillRect(0, py - 3, W, 6);
        c.fillStyle = 'rgba(0,0,0,0.25)'; for (var cx = 60 + i * 30; cx < W; cx += 160) c.fillRect(cx, py - 4, 8, 8);
      });
    } else if (kind === 'acier') {
      c.fillStyle = 'rgba(220,226,234,0.5)';
      for (var vx = 14; vx < W; vx += 28) { circ(c, vx, 72, 2.2); c.fill(); }
    }
    // tableaux accrochés
    var tops = level.paths.filter(function (p) { return p[0][1] < WALL; }).map(function (p) { return p[0][0]; });
    for (var px = 130; px < W - 60; px += 170 + rnd() * 40) {
      if (tops.some(function (t) { return Math.abs(t - px) < 110; })) continue;
      drawPainting(c, px, kind, rnd);
    }
  }

  var NEW_STYLES = { dalles: 'blason', versailles: 'miroir', beton: 'emballe', acier: 'coffres' };
  function drawPainting(c, x, kind, rnd) {
    var w = 64 + rnd() * 16, h = 40 + rnd() * 8, y = 14;
    var style = kind === 'stone' ? 'egypte' : kind === 'marble' ? 'dino' : kind === 'gallery' ? (rnd() < 0.5 ? 'mondrian' : 'splash') : kind === 'royal' ? 'portrait' :
      kind === 'pont' ? (rnd() < 0.5 ? 'marine' : 'hublot') : NEW_STYLES[kind] || ['paysage', 'portrait', 'nature'][(rnd() * 3) | 0];
    c.save();
    A.shadow(c, x + 3, y + h + 4, w / 2, 3, 0.2);
    if (style === 'hublot') {
      // hublot de cuivre sur la mer
      circ(c, x, y + h / 2, h / 2 + 5); fs(c, '#c9953c', 2.4);
      var hg = c.createLinearGradient(0, y, 0, y + h);
      hg.addColorStop(0, '#8fd0ff'); hg.addColorStop(0.55, '#4fa3d8'); hg.addColorStop(1, '#1d5f8a');
      circ(c, x, y + h / 2, h / 2 - 1); c.fillStyle = hg; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
      c.fillStyle = '#f39c34'; ell(c, x - 4, y + h * 0.65, 6, 3.4); c.fill();
      c.beginPath(); c.moveTo(x + 2, y + h * 0.65); c.lineTo(x + 7, y + h * 0.65 - 3.5); c.lineTo(x + 7, y + h * 0.65 + 3.5); c.fill();
      for (var b = 0; b < 6; b++) { var ba = b * Math.PI / 3; circ(c, x + Math.cos(ba) * (h / 2 + 2), y + h / 2 + Math.sin(ba) * (h / 2 + 2), 1.8); c.fillStyle = '#7a5a34'; c.fill(); }
      c.restore();
      return;
    }
    if (style === 'emballe') {
      // tableau emballé dans du papier kraft
      rr(c, x - w / 2 - 3, y - 3, w + 6, h + 6, 2); fs(c, '#c9a46a', 2.4);
      line(c, x, y - 3, x, y + h + 3, '#7a5a34', 2.4); line(c, x - w / 2 - 3, y + h / 2, x + w / 2 + 3, y + h / 2, '#7a5a34', 2.4);
      c.save(); c.translate(x - w / 4, y + h / 4 + 2); c.rotate(-0.15);
      c.font = '9px ' + A.FONT; c.textAlign = 'center'; c.fillStyle = 'rgba(192,57,43,0.85)'; c.fillText('FRAGILE', 0, 3);
      c.restore();
      c.restore();
      return;
    }
    rr(c, x - w / 2 - 5, y - 4, w + 10, h + 8, 3); fs(c, style === 'coffres' ? '#8792a3' : '#d9a63a', 2.4);
    c.beginPath(); c.rect(x - w / 2, y, w, h); c.clip();
    var x0 = x - w / 2;
    if (style === 'blason') {
      c.fillStyle = '#7a1f2b'; c.fillRect(x0, y, w, h);
      c.fillStyle = 'rgba(242,193,78,0.25)'; for (var bs = 0; bs < w; bs += 10) c.fillRect(x0 + bs, y, 2, h);
      c.beginPath(); c.moveTo(x - 12, y + 6); c.lineTo(x + 12, y + 6); c.lineTo(x + 12, y + 20); c.quadraticCurveTo(x + 12, y + h - 8, x, y + h - 3); c.quadraticCurveTo(x - 12, y + h - 8, x - 12, y + 20); c.closePath();
      fs(c, '#2f4fa8', 1.8);
      c.fillStyle = '#f2c14e'; c.beginPath(); c.moveTo(x - 12, y + 26); c.lineTo(x, y + 14); c.lineTo(x + 12, y + 26); c.lineTo(x + 12, y + 31); c.lineTo(x, y + 19); c.lineTo(x - 12, y + 31); c.closePath(); c.fill();
    } else if (style === 'marine') {
      var sg = c.createLinearGradient(0, y, 0, y + h); sg.addColorStop(0, '#ffd9a0'); sg.addColorStop(0.6, '#8fd0ff'); sg.addColorStop(1, '#2f6fa8');
      c.fillStyle = sg; c.fillRect(x0, y, w, h);
      c.fillStyle = '#1d5f8a'; c.fillRect(x0, y + h * 0.7, w, h * 0.3);
      c.strokeStyle = '#ffffff'; c.lineWidth = 1.4;
      for (var wv = 0; wv < w; wv += 12) { c.beginPath(); c.arc(x0 + wv + 6, y + h * 0.78, 4, Math.PI, 0); c.stroke(); }
      c.fillStyle = '#7a4b2a'; c.beginPath(); c.moveTo(x - 16, y + h * 0.66); c.lineTo(x + 14, y + h * 0.66); c.lineTo(x + 9, y + h * 0.76); c.lineTo(x - 12, y + h * 0.76); c.closePath(); c.fill();
      c.fillStyle = '#fbfaf5'; c.beginPath(); c.moveTo(x - 2, y + 6); c.lineTo(x - 2, y + h * 0.62); c.lineTo(x - 15, y + h * 0.62); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(x + 1, y + 10); c.lineTo(x + 1, y + h * 0.62); c.lineTo(x + 12, y + h * 0.62); c.closePath(); c.fill();
    } else if (style === 'miroir') {
      var mg = c.createLinearGradient(x0, y, x0 + w, y + h); mg.addColorStop(0, '#eef8ff'); mg.addColorStop(1, '#8fb3d1');
      c.fillStyle = mg; c.fillRect(x0, y, w, h);
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x0 + 8, y + h - 6); c.lineTo(x0 + 26, y + 6); c.stroke();
      c.lineWidth = 1.6; c.beginPath(); c.moveTo(x0 + 18, y + h - 4); c.lineTo(x0 + 34, y + 8); c.stroke();
      c.strokeStyle = 'rgba(42,28,22,0.25)'; c.lineWidth = 1.2; c.strokeRect(x0 + w / 3, y, 0.1, h); c.strokeRect(x0 + 2 * w / 3, y, 0.1, h);
    } else if (style === 'coffres') {
      c.fillStyle = '#596273'; c.fillRect(x0, y, w, h);
      var cw2 = w / 4, ch2 = h / 2;
      for (var ci = 0; ci < 4; ci++) for (var cj = 0; cj < 2; cj++) {
        rr(c, x0 + ci * cw2 + 2, y + cj * ch2 + 2, cw2 - 4, ch2 - 4, 2); fs(c, '#8792a3', 1.4);
        circ(c, x0 + ci * cw2 + cw2 / 2, y + cj * ch2 + ch2 / 2, 2); c.fillStyle = '#f2c14e'; c.fill();
      }
    } else if (style === 'paysage') {
      var g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#8fd0ff'); g.addColorStop(1, '#ffe6b0');
      c.fillStyle = g; c.fillRect(x0, y, w, h);
      c.fillStyle = '#ffd447'; circ(c, x0 + w * 0.75, y + 12, 6); c.fill();
      c.fillStyle = '#5aa64a'; c.beginPath(); c.moveTo(x0, y + h); c.quadraticCurveTo(x0 + w * 0.3, y + h * 0.4, x0 + w * 0.6, y + h * 0.75); c.quadraticCurveTo(x0 + w * 0.8, y + h * 0.5, x0 + w, y + h * 0.7); c.lineTo(x0 + w, y + h); c.fill();
    } else if (style === 'portrait') {
      c.fillStyle = kind === 'royal' ? '#3b1f5a' : '#2f5a46'; c.fillRect(x0, y, w, h);
      c.fillStyle = kind === 'royal' ? '#b8283a' : '#7a4b2a'; ell(c, x, y + h, w * 0.3, h * 0.35); c.fill();
      c.fillStyle = '#f1c39c'; circ(c, x, y + h * 0.45, h * 0.2); c.fill();
      if (kind === 'royal') { c.fillStyle = '#f2c14e'; c.beginPath(); c.moveTo(x - 8, y + h * 0.28); c.lineTo(x - 9, y + h * 0.12); c.lineTo(x - 3, y + h * 0.2); c.lineTo(x, y + h * 0.08); c.lineTo(x + 3, y + h * 0.2); c.lineTo(x + 9, y + h * 0.12); c.lineTo(x + 8, y + h * 0.28); c.fill(); }
    } else if (style === 'nature') {
      c.fillStyle = '#4a2f2a'; c.fillRect(x0, y, w, h);
      c.fillStyle = '#7a4b2a'; c.fillRect(x0, y + h * 0.7, w, h * 0.3);
      ['#e74c3c', '#f4d03f', '#7bc043'].forEach(function (col, i) { c.fillStyle = col; circ(c, x - 14 + i * 13, y + h * 0.62, 7); c.fill(); });
    } else if (style === 'egypte') {
      c.fillStyle = '#efdcae'; c.fillRect(x0, y, w, h);
      c.fillStyle = '#2f6fb0'; c.fillRect(x - 4, y + 8, 8, h - 14); circ(c, x, y + 8, 5); c.fill();
      c.strokeStyle = '#a8742f'; c.lineWidth = 1.6;
      for (var i = 0; i < 4; i++) { c.beginPath(); c.arc(x0 + 10, y + 8 + i * 9, 3, 0, TAU); c.stroke(); c.beginPath(); c.arc(x0 + w - 10, y + 8 + i * 9, 3, 0, TAU); c.stroke(); }
    } else if (style === 'dino') {
      c.fillStyle = '#f2e3b3'; c.fillRect(x0, y, w, h);
      c.strokeStyle = '#7a5a34'; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x0 + 8, y + h - 10); c.quadraticCurveTo(x, y + 6, x0 + w - 14, y + 14); c.stroke();
      for (var r = 0; r < 4; r++) { c.beginPath(); c.moveTo(x - 10 + r * 7, y + 16); c.lineTo(x - 8 + r * 7, y + 28); c.stroke(); }
    } else if (style === 'mondrian') {
      c.fillStyle = '#fbfaf5'; c.fillRect(x0, y, w, h);
      c.fillStyle = '#e63b2e'; c.fillRect(x0, y, w * 0.45, h * 0.55);
      c.fillStyle = '#2f5fb3'; c.fillRect(x0 + w * 0.7, y + h * 0.6, w * 0.3, h * 0.4);
      c.fillStyle = '#f4d03f'; c.fillRect(x0 + w * 0.5, y, w * 0.2, h * 0.3);
      c.fillStyle = INK; c.fillRect(x0 + w * 0.45, y, 3, h); c.fillRect(x0, y + h * 0.55, w, 3); c.fillRect(x0 + w * 0.7, y + h * 0.3, 3, h);
    } else {
      c.fillStyle = '#fbfaf5'; c.fillRect(x0, y, w, h);
      ['#e8506a', '#3fa7e0', '#f4d03f', '#7bc043', '#2a1c16'].forEach(function (col) {
        c.fillStyle = col; for (var s = 0; s < 3; s++) { circ(c, x0 + rnd() * w, y + rnd() * h, 2 + rnd() * 6); c.fill(); }
      });
    }
    c.restore();
  }

  function vignette(c) {
    var g;
    g = c.createLinearGradient(0, 0, -MX, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.75)');
    c.fillStyle = g; c.fillRect(-MX, -MY, MX, H + 2 * MY);
    g = c.createLinearGradient(W, 0, W + MX, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.75)');
    c.fillStyle = g; c.fillRect(W, -MY, MX, H + 2 * MY);
    g = c.createLinearGradient(0, H, 0, H + MY); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.75)');
    c.fillStyle = g; c.fillRect(-MX, H, W + 2 * MX, MY);
    g = c.createLinearGradient(0, 0, 0, -MY); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.75)');
    c.fillStyle = g; c.fillRect(-MX, -MY, W + 2 * MX, MY);
  }

  /* ================= Image par image ================= */
  R.render = function (game, ui, dt) {
    var c = this.ctx;
    this.time += dt;
    var time = this.time;
    this.updateFx(dt, game);
    if (this.alarmT > 0) this.alarmT -= dt;
    if (this.redFlash > 0) this.redFlash -= dt;

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = this.level ? this.level.theme.wallDark : '#111';
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (!game || !this.bg) return;

    var shx = 0, shy = 0;
    if (this.shake > 0) { this.shake = Math.max(0, this.shake - dt * 30); shx = (Math.random() - 0.5) * this.shake; shy = (Math.random() - 0.5) * this.shake; }
    c.setTransform(this.scale, 0, 0, this.scale, this.ox + shx * this.scale, this.oy + shy * this.scale);
    c.drawImage(this.bg, -MX, -MY, W + 2 * MX, H + 2 * MY);

    var i;
    // Flaques de glu
    for (i = 0; i < game.puddles.length; i++) drawPuddle(c, game.puddles[i], time);
    // Filets au sol
    for (i = 0; i < this.decals.length; i++) drawNetDecal(c, this.decals[i]);
    // Champ de vision des caméras
    for (i = 0; i < game.towers.length; i++) if (game.towers[i].type === 'camera') drawCameraRange(c, game, game.towers[i], time);

    if (this.night) c.drawImage(this.night, -MX, -MY, W + 2 * MX, H + 2 * MY);

    // Socles libres
    var minCost = Infinity;
    game.availableTowers.forEach(function (id) { minCost = Math.min(minCost, PT.TOWERS[id].cost); });
    for (i = 0; i < game.spots.length; i++) {
      var s = game.spots[i];
      if (!s.tower) drawSpot(c, s, game.coins >= minCost, ui && ui.selectedSpot === s, time);
    }
    // Aperçu de portée
    if (ui && ui.preview) drawRange(c, ui.preview);

    // Entités triées par profondeur
    var list = [];
    for (i = 0; i < game.towers.length; i++) list.push({ y: game.towers[i].y, k: 0, o: game.towers[i] });
    for (i = 0; i < game.enemies.length; i++) list.push({ y: game.enemies[i].y, k: 1, o: game.enemies[i] });
    list.push({ y: game.treasure.y, k: 2 });
    list.sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < list.length; i++) {
      var it = list[i];
      if (it.k === 0) this.drawTower(c, game, it.o, time, ui);
      else if (it.k === 1) this.drawEnemy(c, game, it.o, time);
      else { c.save(); c.translate(game.treasure.x, game.treasure.y); A.treasure(c, game.level.treasure.kind, game.inRoom > 0, time, this.alarmT); c.restore(); }
    }

    if (game.lockT > 0) this.drawLocks(c, game, time);

    // Rayons laser
    for (i = 0; i < game.towers.length; i++) { var t = game.towers[i]; if (t.beamOn && t.target) drawBeam(c, t, time); }
    // Projectiles
    for (i = 0; i < game.projectiles.length; i++) A.projectile(c, game.projectiles[i]);
    // Bustes qui tombent
    for (i = 0; i < game.drops.length; i++) drawDrop(c, game.drops[i]);
    // Effets
    this.drawFx(c, time);
    // Visée du pouvoir
    if (ui && ui.aim) {
      c.save(); c.setLineDash([8, 8]); c.lineDashOffset = -time * 30;
      circ(c, ui.aim.x, ui.aim.y, PT.POWERS.buste.radius); c.fillStyle = 'rgba(255,212,71,0.15)'; c.fill();
      c.lineWidth = 3; c.strokeStyle = '#ffd447'; c.stroke(); c.restore();
    }

    // Écran : flash rouge, alarme, café
    c.setTransform(1, 0, 0, 1, 0, 0);
    var cw = this.canvas.width, ch = this.canvas.height, g;
    if (this.redFlash > 0 || game.freezeT > 0) {
      var a = Math.max(this.redFlash / 0.6, game.freezeT > 0 ? 0.35 + 0.25 * Math.sin(time * 14) : 0);
      g = c.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.max(cw, ch) * 0.7);
      g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, 'rgba(255,30,30,' + (0.55 * Math.min(1, a)) + ')');
      c.fillStyle = g; c.fillRect(0, 0, cw, ch);
    }
    if (game.cafeT > 0) {
      g = c.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.4, cw / 2, ch / 2, Math.max(cw, ch) * 0.7);
      g.addColorStop(0, 'rgba(255,170,60,0)'); g.addColorStop(1, 'rgba(255,170,60,0.28)');
      c.fillStyle = g; c.fillRect(0, 0, cw, ch);
    }
  };

  R.drawLocks = function (c, game, time) {
    var a = Math.min(1, game.lockT / 0.3, (PT.POWERS.verrou.dur - game.lockT) / 0.2);
    c.save(); c.globalAlpha = Math.max(0, a);
    game.level.paths.forEach(function (p) {
      var p0 = p[0], lx, ly;
      c.save();
      if (p0[1] < WALL) {
        // grille sur la verrière
        lx = p0[0]; ly = WALL + 20;
        c.translate(p0[0], WALL);
        rr(c, -48, -8, 96, 14, 4); fs(c, '#596273', 2.4);
        for (var bx = -40; bx <= 40; bx += 16) { rr(c, bx - 2.5, -WALL + 4, 5, WALL - 2, 2); fs(c, '#9aa3ad', 1.8); }
      } else {
        var side = p0[0] < 0 ? 'L' : p0[0] > W ? 'R' : 'B';
        if (side === 'L') { c.translate(0, p0[1]); lx = 46; ly = p0[1]; }
        else if (side === 'R') { c.translate(W, p0[1]); c.rotate(Math.PI); lx = W - 46; ly = p0[1]; }
        else { c.translate(p0[0], H); c.rotate(-Math.PI / 2); lx = p0[0]; ly = H - 46; }
        rr(c, -4, -50, 14, 100, 4); fs(c, '#596273', 2.4);
        for (var by = -42; by <= 42; by += 14) { rr(c, -8, by - 2.5, 22, 5, 2); fs(c, '#9aa3ad', 1.6); }
      }
      c.restore();
      // cadenas
      c.save(); c.translate(lx, ly - 12 + Math.sin(time * 6) * 1.5); c.scale(0.8, 0.8);
      c.beginPath(); c.arc(0, -5, 9, Math.PI, 0); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3.4; c.strokeStyle = '#c9ced6'; c.stroke();
      rr(c, -13, -6, 26, 20, 5); fs(c, '#f2c230', 2.4);
      circ(c, 0, 2, 3); c.fillStyle = INK; c.fill();
      c.restore();
    });
    c.restore();
  };

  function drawSpot(c, s, affordable, selected, time) {
    c.save(); c.translate(s.x, s.y);
    var pulse = affordable ? 0.5 + 0.5 * Math.sin(time * 3 + s.i) : 0;
    if (selected) { ell(c, 0, 0, 40, 17); c.fillStyle = 'rgba(255,212,71,0.45)'; c.fill(); }
    ell(c, 0, 2, 32, 13); c.fillStyle = 'rgba(20,10,5,0.25)'; c.fill();
    ell(c, 0, 0, 30, 12); c.fillStyle = 'rgba(245,238,224,0.85)'; c.fill();
    c.setLineDash([6, 5]); c.lineWidth = 2.6; c.strokeStyle = affordable ? 'rgba(201,140,30,' + (0.6 + pulse * 0.4) + ')' : 'rgba(120,110,100,0.7)'; c.stroke(); c.setLineDash([]);
    c.lineWidth = 3.4; c.strokeStyle = affordable ? '#c98c1e' : '#9a9088'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); c.moveTo(0, -5); c.lineTo(0, 5); c.stroke();
    c.restore();
  }

  function drawRange(c, p) {
    c.save();
    circ(c, p.x, p.y, p.range);
    c.fillStyle = p.ok === false ? 'rgba(255,80,80,0.12)' : 'rgba(255,255,255,0.16)'; c.fill();
    c.setLineDash([10, 8]); c.lineWidth = 3; c.strokeStyle = p.ok === false ? 'rgba(255,90,90,0.9)' : 'rgba(255,255,255,0.9)'; c.stroke();
    c.restore();
  }

  function drawCameraRange(c, game, t, time) {
    if (t.disabledT > 0) return;
    var st = game.towerStats(t);
    c.save();
    circ(c, t.x, t.y - 10, st.range);
    c.fillStyle = 'rgba(79,182,232,0.07)'; c.fill();
    c.setLineDash([4, 10]); c.lineDashOffset = -time * 12; c.lineWidth = 2; c.strokeStyle = 'rgba(120,205,255,0.45)'; c.stroke();
    c.setLineDash([]);
    var g = c.createRadialGradient(t.x, t.y - 40, 10, t.x, t.y - 40, st.range);
    g.addColorStop(0, 'rgba(140,220,255,0.28)'); g.addColorStop(1, 'rgba(140,220,255,0)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(t.x, t.y - 40); c.arc(t.x, t.y - 40, st.range, t.aim - 0.42, t.aim + 0.42); c.closePath(); c.fill();
    c.restore();
  }

  function drawPuddle(c, p, time) {
    var a = Math.min(1, p.t / 0.6) * 0.85;
    c.save(); c.globalAlpha = a;
    var r = p.r, rnd = A.rng((p.seed * 1000) | 0);
    c.fillStyle = '#6fcf4a';
    c.beginPath(); c.ellipse(p.x, p.y, r, r * 0.45, 0, 0, TAU); c.fill();
    for (var i = 0; i < 6; i++) { var an = rnd() * TAU; circ(c, p.x + Math.cos(an) * r * 0.75, p.y + Math.sin(an) * r * 0.32, r * (0.18 + rnd() * 0.14)); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.45)';
    ell(c, p.x - r * 0.3, p.y - r * 0.1, r * 0.22, r * 0.07); c.fill();
    circ(c, p.x + r * 0.25, p.y + Math.sin(time * 4 + p.seed) * 2, 2.5); c.fill();
    c.restore();
  }

  function drawNetDecal(c, d) {
    c.save(); c.globalAlpha = Math.min(1, d.t / 0.5) * 0.8;
    c.translate(d.x, d.y); c.scale(1, 0.5);
    circ(c, 0, 0, d.r); c.clip();
    c.strokeStyle = '#c8a46a'; c.lineWidth = 2.4;
    for (var k = -d.r; k < d.r; k += 12) {
      c.beginPath(); c.moveTo(k, -d.r); c.lineTo(k + d.r, d.r); c.stroke();
      c.beginPath(); c.moveTo(k, -d.r); c.lineTo(k - d.r, d.r); c.stroke();
    }
    c.restore();
  }

  function drawBeam(c, t, time) {
    var e = t.target;
    var sx = t.x + Math.cos(t.aim) * 26, sy = t.y - 44 + Math.sin(t.aim) * 12, ex = e.x, ey = e.y - 22;
    var wob = Math.sin(time * 40) * 1.5;
    c.save(); c.lineCap = 'round';
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey);
    c.strokeStyle = 'rgba(255,61,90,0.3)'; c.lineWidth = 14 + wob; c.stroke();
    c.strokeStyle = 'rgba(255,90,120,0.8)'; c.lineWidth = 6; c.stroke();
    c.strokeStyle = '#fff3f5'; c.lineWidth = 2.4; c.stroke();
    circ(c, ex, ey, 7 + wob * 2); c.fillStyle = 'rgba(255,220,230,0.8)'; c.fill();
    c.restore();
  }

  function drawDrop(c, d) {
    var k = 1 - d.t / d.max;
    c.save();
    A.shadow(c, d.x, d.y, 30 * k + 8, 10 * k + 3, 0.15 + 0.25 * k);
    circ(c, d.x, d.y, PT.POWERS.buste.radius); c.setLineDash([6, 6]); c.lineWidth = 2.4; c.strokeStyle = 'rgba(255,80,60,0.8)'; c.stroke();
    c.translate(d.x, d.y - (1 - k * k) * 420);
    c.rotate((1 - k) * 0.6);
    c.scale(1.4, 1.4);
    A.bust(c);
    c.restore();
  }

  R.drawTower = function (c, game, t, time, ui) {
    c.save();
    c.translate(t.x, t.y);
    if (t.builtT < 0.3) { var k = 1 + Math.sin(t.builtT / 0.3 * Math.PI) * 0.18; c.scale(k, 1 / k); }
    if (ui && ui.selectedTower === t) { ell(c, 0, 6, 44, 18); c.fillStyle = 'rgba(255,212,71,0.45)'; c.fill(); }
    A.tower(c, t.type, { level: t.level, aim: t.aim, face: t.face, fireT: t.fireT, lungeT: t.lungeT, lx: t.lx, ly: t.ly, x: t.x, y: t.y, disabled: t.disabledT > 0, time: time + t.id, beamOn: t.beamOn });
    if (game.cafeT > 0) {
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2.4; c.lineCap = 'round';
      for (var i = 0; i < 2; i++) {
        var ph = (time * 1.5 + i * 0.5) % 1;
        c.globalAlpha = 1 - ph;
        c.beginPath(); c.moveTo(-6 + i * 12, -78 - ph * 20); c.quadraticCurveTo(-10 + i * 12, -86 - ph * 20, -5 + i * 12, -94 - ph * 20); c.stroke();
      }
      c.globalAlpha = 1;
    }
    c.restore();
  };

  R.drawEnemy = function (c, game, e, time) {
    var camo = game.isCamo(e);
    var look = e.type === 'faussaire' && e.disguised ? 'touriste' : e.type;
    var decoy = !!e.def.decoy;
    c.save();
    c.translate(e.x, e.y);
    var size = e.def.size || 1;
    if (e.slowT > 0 && !e.def.slowImmune) { ell(c, 0, 1, 15 * size, 5 * size); c.fillStyle = 'rgba(111,207,74,0.85)'; c.fill(); }
    if (e.mark > 0 && !camo) {
      c.save(); c.setLineDash([4, 4]); ell(c, 0, 1, 18 * size, 7 * size); c.lineWidth = 2; c.strokeStyle = 'rgba(120,205,255,0.9)'; c.stroke(); c.restore();
    }
    if (e.leapT > 0) {
      var lp = 1 - e.leapT / 0.8;
      A.shadow(c, 0, 0, 10, 4, 0.2);
      c.translate(0, -Math.sin(lp * Math.PI) * 50);
      c.translate(0, -24 * size); c.rotate(lp * TAU * e.face); c.translate(0, 24 * size);
    }
    if (camo) c.globalAlpha = 0.18 + 0.1 * Math.sin(time * 7 + e.id);
    else if (decoy) c.globalAlpha = 0.72 + 0.12 * Math.sin(time * 9 + e.id);
    if (e.smokeT > 0) {
      c.save(); c.globalAlpha = 0.6;
      for (var s = 0; s < 5; s++) { circ(c, Math.cos(time * 2 + s * 1.3) * 26, -40 - Math.sin(time * 3 + s) * 16, 16 + s * 2); c.fillStyle = 'rgba(160,160,175,0.6)'; c.fill(); }
      c.restore();
    }
    var shake = (e.stunT > 0 || game.freezeT > 0 || e.blocked) ? Math.sin(time * 50) * 1.2 : 0;
    c.translate(shake, 0);
    A.person(c, look, {
      phase: e.phase, face: e.face, size: size, flash: e.flashT > 0, carrying: e.carrying || e.fake, grab: e.grabbing,
      id: e.id, t: time + e.id, moving: e.curSpeed > 0, revealed: e.type === 'faussaire' && !e.disguised,
    });
    if (camo && game.dark && !e.def.camo && e.smokeT <= 0) {
      // dans le noir, seuls les yeux brillent
      c.save(); c.globalAlpha = 0.9; c.scale(e.face * size, size);
      circ(c, 2, -46.5, 1.9); circ(c, 8, -46.5, 1.9); c.fillStyle = '#fff6b0'; c.fill();
      c.restore();
    }
    if (decoy && !camo) {
      c.globalAlpha = 0.9;
      for (var gl = 0; gl < 3; gl++) {
        var gp = (time * 1.6 + gl * 0.33 + e.id * 0.17) % 1;
        A.starPath(c, Math.sin(e.id + gl * 2.1) * 14, -18 - gl * 14 - gp * 6, 2 + Math.sin(gp * Math.PI) * 3, 0.9, 4);
        c.fillStyle = '#dff6ff'; c.fill();
      }
    }
    c.globalAlpha = 1;
    var top = -62 * size - (e.def.boss ? 16 : 0);
    if (e.netT > 0) {
      c.save(); circ(c, 0, -28 * size, 26 * size); c.clip();
      c.strokeStyle = '#a9824a'; c.lineWidth = 2;
      for (var k = -40; k < 40; k += 9) { line(c, k, -60 * size, k + 40, 10, '#a9824a', 2); line(c, k, -60 * size, k - 40, 10, '#a9824a', 2); }
      c.restore();
    }
    if ((e.stunT > 0 && !e.def.stunImmune) || (game.freezeT > 0 && !e.def.innocent)) {
      for (var st = 0; st < 3; st++) {
        var an = time * 6 + st * TAU / 3;
        A.starPath(c, Math.cos(an) * 14, top + 6 + Math.sin(an) * 4, 5, 2.2);
        fs(c, game.freezeT > 0 ? '#9fe3ff' : '#ffd447', 1.4);
      }
    }
    var showBar = !e.def.innocent && !camo && !(e.disguised) && (e.hp < e.maxHp || e.def.boss);
    if (showBar) {
      var bw = e.def.boss ? 60 : 30, k2 = Math.max(0, e.hp / e.maxHp);
      rr(c, -bw / 2 - 1.5, top - 1.5, bw + 3, 8, 4); c.fillStyle = INK; c.fill();
      rr(c, -bw / 2, top, bw * k2, 5, 2.5); c.fillStyle = k2 > 0.5 ? '#7ed957' : k2 > 0.25 ? '#ffc23d' : '#ff5a4a'; c.fill();
    }
    if ((e.carrying || e.fake) && !camo) {
      c.font = '16px ' + A.FONT; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = INK; c.fillStyle = '#ff5a4a';
      var by = top - 8 + Math.sin(time * 8) * 2;
      c.strokeText('!', 0, by); c.fillText('!', 0, by);
    }
    c.restore();
  };

  /* ================= Effets ================= */
  var CATCH_WORDS = ['PAF !', 'ATTRAPÉ !', 'BIM !', 'HOP !', 'COFFRÉ !', 'POW !'];

  R.addFx = function (f) { f.t = 0; this.fx.push(f); return f; };

  R.onEvent = function (ev, game) {
    var x = ev.x, y = ev.y, i;
    switch (ev.type) {
      case 'catch':
        this.addFx({ kind: 'caught', x: x, y: y, enemy: ev.enemy, face: ev.face, life: 0.55 });
        this.addFx({ kind: 'comic', x: x + 10, y: y - 70, text: CATCH_WORDS[(Math.random() * CATCH_WORDS.length) | 0], life: 0.8, big: ev.boss });
        if (ev.reward) this.addFx({ kind: 'text', x: x, y: y - 40, text: '+' + ev.reward, color: '#ffd447', size: 22, life: 1 });
        this.burst(x, y - 26, 8, '#ffd447');
        if (ev.boss) this.shake = 18;
        break;
      case 'hit': this.burst(x, y, 3, '#fff4b0', 0.6); break;
      case 'bite': this.addFx({ kind: 'text', x: x, y: y - 50, text: 'CRAC', color: '#fff', size: 15, life: 0.5 }); this.burst(x, y - 20, 4, '#fff'); break;
      case 'splat': this.burst(x, y, 7, '#7ed957'); break;
      case 'net': this.decals.push({ x: x, y: y, r: ev.r, t: 1.4 }); this.addFx({ kind: 'ring', x: x, y: y, r0: 10, r1: ev.r, color: '#c8a46a', life: 0.35 }); break;
      case 'escape':
        this.addFx({ kind: 'text', x: Math.max(60, x), y: y - 40, text: '-' + ev.n + ' objet' + (ev.n > 1 ? 's' : ''), color: '#ff5a4a', size: 22, life: 1.4 });
        this.redFlash = 0.6;
        break;
      case 'grab':
        this.alarmT = 2.5;
        this.addFx({ kind: 'comic', x: x, y: y - 90, text: 'VOLÉ !', life: 0.9, red: true });
        break;
      case 'return':
        this.addFx({ kind: 'fly', x: x, y: y - 30, tx: game.treasure.x, ty: game.treasure.y - 60, life: 0.8 });
        this.addFx({ kind: 'text', x: x, y: y - 66, text: 'Récupéré !', color: '#7ed957', size: 18, life: 1.1 });
        break;
      case 'reveal':
        this.addFx({ kind: 'comic', x: x, y: y - 76, text: 'DÉMASQUÉ !', life: 0.9 });
        this.addFx({ kind: 'poof', x: x, y: y - 30, r: 22, life: 0.45 });
        break;
      case 'emp':
        this.addFx({ kind: 'ring', x: x, y: y - 20, r0: 10, r1: 130, color: '#6fe3ff', life: 0.5, w: 5 });
        this.addFx({ kind: 'text', x: x, y: y - 70, text: 'CLIC ! Plus de courant', color: '#6fe3ff', size: 15, life: 1.1 });
        break;
      case 'leap': this.addFx({ kind: 'poof', x: x, y: y, r: 12, life: 0.35 }); break;
      case 'smoke': for (i = 0; i < 6; i++) this.addFx({ kind: 'poof', x: x + (Math.random() - 0.5) * 50, y: y - 30 + (Math.random() - 0.5) * 30, r: 26, life: 0.9, grey: true }); break;
      case 'summon': this.addFx({ kind: 'poof', x: x, y: y - 20, r: 30, life: 0.5 }); this.addFx({ kind: 'text', x: x, y: y - 100, text: 'À moi, mes complices !', color: '#fff', size: 15, life: 1.3 }); break;
      case 'bustImpact':
        this.addFx({ kind: 'ring', x: x, y: y, r0: 20, r1: ev.r + 20, color: '#ffffff', life: 0.4, w: 6 });
        for (i = 0; i < 7; i++) this.addFx({ kind: 'poof', x: x + Math.cos(i) * 36, y: y + Math.sin(i) * 14, r: 18, life: 0.6, grey: true });
        this.addFx({ kind: 'comic', x: x, y: y - 80, text: 'BOUM !', life: 0.9, big: true });
        this.shake = 14;
        break;
      case 'alarm':
        this.alarmT = 3;
        this.addFx({ kind: 'ring', x: game.treasure.x, y: game.treasure.y - 60, r0: 30, r1: 900, color: '#ff4040', life: 1, w: 8 });
        break;
      case 'cafe': this.addFx({ kind: 'text', x: W / 2, y: 160, text: 'Pause café ! Tirs accélérés', color: '#ffb347', size: 30, life: 1.6 }); break;
      case 'build': this.addFx({ kind: 'poof', x: x, y: y, r: 28, life: 0.4 }); this.burst(x, y - 30, 6, '#ffd447'); break;
      case 'upgrade': this.burst(x, y - 40, 12, '#ffd447'); this.addFx({ kind: 'text', x: x, y: y - 90, text: 'Niveau ' + (ev.level + 1) + ' !', color: '#ffd447', size: 18, life: 1 }); break;
      case 'sell': this.addFx({ kind: 'text', x: x, y: y - 50, text: '+' + ev.value, color: '#ffd447', size: 20, life: 1 }); this.addFx({ kind: 'poof', x: x, y: y, r: 30, life: 0.45 }); break;
      case 'ticket': this.addFx({ kind: 'text', x: x, y: y - 60, text: '+' + ev.value, color: '#ffd447', size: 15, life: 0.8 }); break;
      case 'spawn': if (ev.boss) this.shake = 10; break;
      case 'clang':
        this.addFx({ kind: 'text', x: x + 8, y: y - 58, text: 'TING !', color: '#e6edf5', size: 15, life: 0.55 });
        this.burst(x, y - 34, 3, '#ffffff', 0.7);
        break;
      case 'blast':
        this.addFx({ kind: 'ring', x: x, y: y, r0: 12, r1: ev.r + 10, color: '#ffb347', life: 0.35, w: 6 });
        for (i = 0; i < 5; i++) this.addFx({ kind: 'poof', x: x + Math.cos(i * 1.3) * 22, y: y + Math.sin(i * 1.3) * 9, r: 18, life: 0.55, grey: true });
        this.burst(x, y - 10, 6, '#ffd447');
        this.shake = Math.max(this.shake, 3);
        break;
      case 'mirror':
        this.addFx({ kind: 'ring', x: x, y: y - 26, r0: 6, r1: 46, color: '#bfefff', life: 0.4, w: 3 });
        this.burst(x, y - 30, 6, '#dff6ff', 0.8);
        if (Math.random() < 0.35) this.addFx({ kind: 'text', x: x, y: y - 76, text: 'Abracadabra !', color: '#d9c8ff', size: 14, life: 1 });
        break;
      case 'shatter':
        this.addFx({ kind: 'poof', x: x, y: y - 28, r: 16, life: 0.35 });
        for (i = 0; i < 7; i++) {
          var sa = Math.random() * TAU, sv = 80 + Math.random() * 120;
          this.addFx({ kind: 'spark', x: x, y: y - 30, vx: Math.cos(sa) * sv, vy: Math.sin(sa) * sv - 60, color: i % 2 ? '#bfefff' : '#ffffff', life: 0.45 + Math.random() * 0.2, star: true });
        }
        if (Math.random() < 0.4) this.addFx({ kind: 'text', x: x, y: y - 64, text: 'Un reflet !', color: '#bfefff', size: 14, life: 0.8 });
        break;
      case 'lock':
        this.addFx({ kind: 'text', x: W / 2, y: 160, text: 'Portes verrouillées !', color: '#f2c230', size: 30, life: 1.6 });
        this.shake = Math.max(this.shake, 5);
        break;
      case 'unlock':
        this.addFx({ kind: 'text', x: W / 2, y: 160, text: 'Portes rouvertes', color: '#e6edf5', size: 22, life: 1.2 });
        break;
    }
  };

  R.burst = function (x, y, n, color, speed) {
    speed = speed || 1;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, v = (60 + Math.random() * 120) * speed;
      this.addFx({ kind: 'spark', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, color: color, life: 0.4 + Math.random() * 0.3, star: Math.random() < 0.5 });
    }
  };

  R.updateFx = function (dt, game) {
    for (var i = this.fx.length - 1; i >= 0; i--) {
      var f = this.fx[i];
      f.t += dt;
      if (f.kind === 'spark') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 420 * dt; }
      if (f.t >= f.life) this.fx.splice(i, 1);
    }
    for (var j = this.decals.length - 1; j >= 0; j--) { this.decals[j].t -= dt; if (this.decals[j].t <= 0) this.decals.splice(j, 1); }
    if (this.fx.length > 260) this.fx.splice(0, this.fx.length - 260);
  };

  R.drawFx = function (c, time) {
    for (var i = 0; i < this.fx.length; i++) {
      var f = this.fx[i], k = f.t / f.life;
      c.save();
      if (f.kind === 'text') {
        var a = k > 0.65 ? 1 - (k - 0.65) / 0.35 : 1;
        c.globalAlpha = a;
        c.font = f.size + 'px ' + A.FONT; c.textAlign = 'center';
        var yy = f.y - k * 34 - (k < 0.15 ? (0.15 - k) * -60 : 0);
        c.lineWidth = Math.max(4, f.size / 4); c.strokeStyle = INK; c.lineJoin = 'round';
        c.strokeText(f.text, f.x, yy); c.fillStyle = f.color; c.fillText(f.text, f.x, yy);
      } else if (f.kind === 'comic') {
        var sc = k < 0.2 ? 0.4 + k / 0.2 * 0.75 : 1.15 - (k - 0.2) * 0.2;
        c.globalAlpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
        c.translate(f.x, f.y); c.scale(sc * (f.big ? 1.4 : 1), sc * (f.big ? 1.4 : 1)); c.rotate(-0.08);
        c.font = '18px ' + A.FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
        var tw = c.measureText(f.text).width / 2 + 16;
        c.beginPath();
        for (var p = 0; p < 18; p++) {
          var an = p / 18 * TAU, rad = p % 2 ? 0.78 : 1;
          c.lineTo(Math.cos(an) * tw * rad, Math.sin(an) * 22 * rad);
        }
        c.closePath(); fs(c, f.red ? '#ff5a4a' : '#fff36b', 2.6);
        c.fillStyle = f.red ? '#ffffff' : '#d8302f'; c.fillText(f.text, 0, 1);
      } else if (f.kind === 'spark') {
        c.globalAlpha = 1 - k;
        if (f.star) { A.starPath(c, f.x, f.y, 5, 2.2); c.fillStyle = f.color; c.fill(); }
        else { circ(c, f.x, f.y, 3); c.fillStyle = f.color; c.fill(); }
      } else if (f.kind === 'poof') {
        c.globalAlpha = (1 - k) * 0.9;
        for (var q = 0; q < 5; q++) {
          var an2 = q / 5 * TAU + f.x;
          circ(c, f.x + Math.cos(an2) * f.r * k, f.y + Math.sin(an2) * f.r * 0.5 * k, f.r * (0.5 + k * 0.5));
          c.fillStyle = f.grey ? 'rgba(190,190,200,0.9)' : 'rgba(255,255,255,0.95)'; c.fill();
        }
      } else if (f.kind === 'ring') {
        c.globalAlpha = 1 - k;
        circ(c, f.x, f.y, f.r0 + (f.r1 - f.r0) * k);
        c.lineWidth = f.w || 4; c.strokeStyle = f.color; c.stroke();
      } else if (f.kind === 'caught') {
        c.translate(f.x, f.y);
        c.globalAlpha = 1 - k * k;
        c.translate(0, -k * 20);
        c.rotate(Math.sin(k * 20) * 0.25);
        var look = f.enemy === 'faussaire' ? 'faussaire' : f.enemy;
        A.person(c, look, { face: f.face, size: (PT.ENEMIES[f.enemy].size || 1) * (1 - k * 0.4), moving: false, id: 1, t: time, revealed: true });
        // menottes
        c.translate(0, -30);
        circ(c, -6, 0, 5); c.lineWidth = 3; c.strokeStyle = '#d9dde6'; c.stroke();
        circ(c, 6, 0, 5); c.stroke();
        line(c, -1, 0, 1, 0, '#d9dde6', 3);
      } else if (f.kind === 'fly') {
        var e2 = k * (2 - k);
        var fx2 = f.x + (f.tx - f.x) * e2, fy2 = f.y + (f.ty - f.y) * e2 - Math.sin(k * Math.PI) * 80;
        A.starPath(c, fx2, fy2, 10, 4); fs(c, '#ffd447', 2);
      }
      c.restore();
    }
  };
})(globalThis.PT = globalThis.PT || {});
