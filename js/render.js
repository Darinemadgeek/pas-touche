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
    r.buildBackground(level, 1);
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
    var res = Math.min(1.25, Math.max(0.5, Math.round(this.scale * 4) / 4));
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
  // Deux ambiances en papier découpé : la galerie de peinture (velours, boiseries, cadres dorés)
  // et le hall des antiquités (pierre, colonnes, frise grecque, torches).
  var ANTIQUE = { stone: 1, marble: 1, dalles: 1, beton: 1, acier: 1 };
  function family(th) { return ANTIQUE[th.floor] ? 'antique' : 'galerie'; }
  // Objets du décor qui bougent : ils sont redessinés à chaque image au lieu d'être figés dans le fond.
  var LIVE_DECO = { plante: 1, oranger: 1, mobile: 1, gouvernail: 1 };
  var BOIL_FPS = 6;

  // variants : nombre de versions du fond dont le trait tremble (1 pour les miniatures)
  R.buildBackground = function (level, variants) {
    if (typeof document === 'undefined') return;
    var th = level.theme, self = this;
    this.wallAnims = [];
    this.bgs = [];
    for (var v = 0; v < (variants || 3); v++) {
      A.BOIL = v;
      this.bgs.push(this.paintRoom(level, v === 0));
    }
    A.BOIL = 0;
    this.bg = this.bgs[0];
    this.liveDeco = (level.deco || []).filter(function (d) { return LIVE_DECO[d.t]; }).sort(function (a, b) { return a.y - b.y; });
    this.flicker = (level.id * 7) % Math.max(1, this.wallAnims.filter(function (a) { return a.t === 'light'; }).length);
    var tr = level.paths[0][level.paths[0].length - 1];

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

  // Peint une variante complète du fond. record : enregistre les éléments animés (une seule fois).
  R.paintRoom = function (level, record) {
    var res = this.bgRes, th = level.theme, rnd = A.rng(level.id * 7919 + 13), self = this;
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
    c.restore();

    // Murs latéraux et bas de la salle
    c.fillStyle = A.shade(th.wall, -0.15);
    c.fillRect(-18, WALL, 18, H - WALL + 18); c.fillRect(W, WALL, 18, H - WALL + 18); c.fillRect(-18, H, W + 36, 18);
    c.lineWidth = 2; c.strokeStyle = INK;
    c.strokeRect(-18, -2, W + 36, H + 20); c.strokeRect(0, WALL, W, H - WALL);

    // Tapis : bordure dorée, coutures, aplat de feutrine
    var paths = level.paths;
    c.save(); c.beginPath(); c.rect(-MX, WALL, W + 2 * MX, H - WALL + MY); c.clip();
    c.lineJoin = 'round'; c.lineCap = 'butt';
    var layers = [
      { w: 80, col: 'rgba(20,10,5,0.22)', dy: 6 },
      { w: 78, col: INK },
      { w: 75, col: th.trim },
      { w: 63, col: INK },
      { w: 61.6, col: th.carpet },
      { w: 54, col: A.shade(th.carpet, 0.35), dash: [7, 6] },
      { w: 51, col: th.carpet },
    ];
    layers.forEach(function (L) {
      paths.forEach(function (p, pi) {
        c.save(); if (L.dy) c.translate(0, L.dy);
        if (L.dash) c.setLineDash(L.dash);
        carpetLine(c, p, pi); c.lineWidth = L.w; c.strokeStyle = L.col; c.stroke();
        c.restore();
      });
    });
    // tapis de sol sous le trésor
    var tr = paths[0][paths[0].length - 1];
    A.wobble(c, ovalPts(tr[0], tr[1] + 4, 64, 26), 2, 21); A.paper(c, th.trim, 2);
    A.wobble(c, ovalPts(tr[0], tr[1] + 4, 54, 20), 1.6, 22); A.paper(c, th.carpet, 1.4);
    c.restore();

    // Portes
    paths.forEach(function (p) { self.drawDoor(c, p, th); });

    // Poteaux et cordons de velours
    drawStanchions(c, level, th);

    // Mur du fond
    drawBackWall(c, level, th, rnd, record ? this.wallAnims : null);
    paths.forEach(function (p) { if (p[0][1] < WALL) drawSkylight(c, p, th); });

    // Ombre portée du mur sur le sol
    c.fillStyle = 'rgba(20,10,5,0.2)'; c.fillRect(0, WALL, W, 12);

    // Décor : chaque objet est légèrement décalé d'une variante à l'autre
    (level.deco || []).slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (d, i) {
      if (LIVE_DECO[d.t]) return;
      var r = A.rng(i * 31 + A.BOIL * 7 + 5);
      c.save(); c.translate(d.x, d.y); c.rotate((r() - 0.5) * 0.03); c.translate(-d.x + (r() - 0.5) * 1.2, -d.y);
      A.deco(c, d, th);
      c.restore();
    });

    // Grain du papier sur toute la salle
    A.grain(c, -18, -2, W + 36, H + 20, 0.09, level.id * 13 + A.BOIL);

    // Vignettage des marges
    vignette(c);
    return cv;
  };

  function ovalPts(x, y, rx, ry) {
    var pts = [];
    for (var i = 0; i < 16; i++) pts.push([x + Math.cos(i * TAU / 16) * rx, y + Math.sin(i * TAU / 16) * ry]);
    return pts;
  }

  // Tracé du tapis : les coudes tremblent un peu d'une variante à l'autre
  function carpetLine(c, p, seed) {
    var r = A.rng((seed || 0) * 17 + A.BOIL * 131 + 1);
    var p0 = p[0], p1 = p[1], dx = p0[0] - p1[0], dy = p0[1] - p1[1], l = Math.hypot(dx, dy);
    c.beginPath();
    c.moveTo(p0[0] + dx / l * 600, p0[1] + dy / l * 600);
    for (var i = 0; i < p.length; i++) {
      var j = i > 0 && i < p.length - 1 ? 2.4 : 0;
      c.lineTo(p[i][0] + (r() - 0.5) * j, p[i][1] + (r() - 0.5) * j);
    }
  }

  // Sols en papier découpé : chaque lame ou dalle est un morceau de papier collé
  function drawFloor(c, th, rnd) {
    var f = th.floor, ca = th.floorA, cb = th.floorB, x, y, i;
    c.fillStyle = A.shade(cb, f === 'parquet' || f === 'royal' || f === 'gallery' || f === 'pont' ? -0.14 : -0.28); c.fillRect(0, WALL, W, H - WALL);
    function tile(x, y, w, h, col, amp) { A.wobRect(c, x + 1, y + 1, w - 2, h - 2, amp || 1.4, (x * 7 + y * 13) | 0); A.paper(c, col, 0); }
    function tone(col, k) { return A.shade(col, (rnd() - 0.5) * (k || 0.08)); }
    if (f === 'parquet' || f === 'royal') {
      // Parquet à lames décalées
      for (y = WALL, i = 0; y < H; y += 18, i++) {
        var o = -rnd() * 110;
        for (x = o; x < W; x += 110) tile(x, y, 110, 18, tone(rnd() < 0.5 ? ca : cb, 0.06), 0.8);
      }
      if (f === 'royal') {
        c.fillStyle = 'rgba(242,193,78,0.22)';
        for (y = WALL + 60; y < H; y += 120) for (x = 60; x < W; x += 160) { A.starPath(c, x + (y % 240 ? 80 : 0), y, 9, 4); c.fill(); }
      }
    } else if (f === 'gallery' || f === 'pont') {
      // Longues planches
      for (y = WALL; y < H; y += 26) {
        var off = rnd() * 160;
        for (x = -off; x < W; x += 160) {
          tile(x, y, 160, 26, tone(rnd() < 0.5 ? ca : cb));
          if (f === 'pont') { c.fillStyle = 'rgba(30,20,10,0.45)'; c.fillRect(x + 6, y + 6, 2.4, 2.4); c.fillRect(x + 6, y + 18, 2.4, 2.4); }
        }
      }
    } else if (f === 'versailles') {
      // Parquet de Versailles : grands panneaux à croisillons
      var P = 96;
      for (y = WALL; y < H; y += P) for (x = 0; x < W; x += P) {
        tile(x, y, P, P, tone(ca), 2);
        A.wobRect(c, x + 12, y + 12, P - 24, P - 24, 1.4, x + y * 3); A.paper(c, tone(cb), 0);
        c.strokeStyle = A.shade(ca, -0.18); c.lineWidth = 2.4; c.beginPath();
        c.moveTo(x + 12, y + 12); c.lineTo(x + P - 12, y + P - 12); c.moveTo(x + P - 12, y + 12); c.lineTo(x + 12, y + P - 12); c.stroke();
      }
    } else if (f === 'marble') {
      // Damier de marbre veiné
      var S = 64;
      for (y = WALL; y < H; y += S) for (x = 0; x < W; x += S) tile(x, y, S, S, tone(((x + y) / S) % 2 ? ca : cb, 0.05), 1.8);
      c.strokeStyle = 'rgba(110,95,70,0.25)'; c.lineWidth = 1.2;
      for (i = 0; i < 26; i++) {
        var vx = rnd() * W, vy = WALL + rnd() * (H - WALL);
        c.beginPath(); c.moveTo(vx, vy); c.lineTo(vx + 14, vy + 6); c.lineTo(vx + 24, vy + 2); c.lineTo(vx + 34, vy + 9); c.stroke();
      }
    } else if (f === 'acier') {
      // Plaques d'acier rivetées
      var Q = 80;
      for (y = WALL; y < H; y += Q) for (x = 0; x < W; x += Q) {
        tile(x, y, Q, Q, tone(rnd() < 0.5 ? ca : cb, 0.06), 1.2);
        c.fillStyle = 'rgba(220,226,234,0.55)';
        [[7, 7], [Q - 7, 7], [7, Q - 7], [Q - 7, Q - 7]].forEach(function (p) { circ(c, x + p[0], y + p[1], 2.4); c.fill(); });
      }
    } else {
      // Dalles de pierre de tailles variées (Égypte, château, réserve)
      for (y = WALL; y < H; y += 48) {
        x = -rnd() * 60;
        while (x < W) { var w = 60 + rnd() * 60; tile(x, y, w, 48, tone(rnd() < 0.5 ? ca : cb, 0.1), 2); x += w; }
      }
      if (f === 'beton') {
        c.strokeStyle = 'rgba(30,30,35,0.3)'; c.lineWidth = 1.4;
        for (i = 0; i < 10; i++) {
          var kx = rnd() * W, ky = WALL + rnd() * (H - WALL);
          c.beginPath(); c.moveTo(kx, ky); c.lineTo(kx + 10, ky + 8); c.lineTo(kx + 6, ky + 18); c.lineTo(kx + 16, ky + 26); c.stroke();
        }
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

  function drawBackWall(c, level, th, rnd, anims) {
    var fam = family(th);
    c.fillStyle = A.shade(th.wall, -0.3); c.fillRect(0, -2, W, WALL + 2);
    A.wobRect(c, -6, -2, W + 12, WALL + 2, 2.4, 2); A.paper(c, th.wall, 0);
    if (fam === 'galerie') {
      // Tenture rayée, corniche dorée, lambris à panneaux
      c.fillStyle = 'rgba(0,0,0,0.09)'; for (var x = 0; x < W; x += 24) c.fillRect(x, 8, 10, 52);
      A.wobRect(c, -6, -2, W + 12, 9, 1.4, 3); A.paper(c, th.trim, 1.6);
      A.wobRect(c, -6, 60, W + 12, WALL - 60, 1.6, 4); A.paper(c, A.shade(th.wall, -0.35), 1.6);
      for (var p = 8; p < W; p += 64) { A.wobRect(c, p, 64, 52, 14, 1, p); A.paper(c, A.shade(th.wall, -0.25), 1); }
    } else {
      // Appareil de pierre, frise grecque, plinthe
      c.strokeStyle = 'rgba(0,0,0,0.16)'; c.lineWidth = 1.2;
      for (var by = 12, bi = 0; by < 62; by += 16, bi++) for (var bx = (bi % 2) * 22 - 22; bx < W; bx += 44) c.strokeRect(bx, by, 44, 16);
      meander(c, -1, th.trim);
      A.wobRect(c, -6, 62, W + 12, WALL - 62, 1.6, 4); A.paper(c, A.shade(th.wall, -0.3), 1.6);
    }
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
    // tableaux accrochés (et colonnes à torches dans le hall des antiquités)
    var tops = level.paths.filter(function (p) { return p[0][1] < WALL; }).map(function (p) { return p[0][0]; });
    var xs = [];
    for (var px = 130; px < W - 60; px += 170 + rnd() * 40) {
      if (!tops.some(function (t) { return Math.abs(t - px) < 110; })) xs.push(px);
    }
    if (fam === 'antique') {
      var cols = [26, W - 26];
      for (var k = 0; k < xs.length - 1; k++) cols.push((xs[k] + xs[k + 1]) / 2);
      cols.forEach(function (cx) {
        if (tops.some(function (t) { return Math.abs(t - cx) < 70; })) return;
        drawColumn(c, cx, th);
        if (anims) anims.push({ t: 'torch', x: cx, y: 36 });
      });
    }
    xs.forEach(function (x) {
      var info = drawPainting(c, x, kind, rnd);
      if (fam === 'galerie') {
        drawLampBody(c, x);
        if (anims) anims.push({ t: 'light', x: x, y: 6, w: info.w, h: info.h + 10 });
      }
      if (anims && info.style === 'portrait') anims.push({ t: 'eyes', x: x, y: 14 + info.h * 0.45, r: info.h * 0.2 });
    });
  }

  function meander(c, y, col) {
    A.wobRect(c, -6, y, W + 12, 12, 1, 9); A.paper(c, col, 1.4);
    c.strokeStyle = 'rgba(255,248,225,0.85)'; c.lineWidth = 1.8; c.beginPath();
    for (var x = 0; x < W; x += 16) { c.moveTo(x + 2, y + 10); c.lineTo(x + 2, y + 2); c.lineTo(x + 12, y + 2); c.lineTo(x + 12, y + 8); c.lineTo(x + 7, y + 8); c.lineTo(x + 7, y + 5); }
    c.stroke();
  }
  function drawColumn(c, x, th) {
    var col = A.shade(th.wall, 0.45), cap = A.shade(col, 0.12), top = 11, bot = 63;
    A.wobRect(c, x - 11, top + 8, 22, bot - top - 14, 1.4, x + 11); A.paper(c, col, 1.6);
    for (var k = -1; k <= 1; k++) line(c, x + k * 5, top + 11, x + k * 5, bot - 9, 'rgba(0,0,0,0.13)', 2);
    A.wobRect(c, x - 15, top, 30, 8, 1, x + 12); A.paper(c, cap, 1.4);
    circ(c, x - 13, top + 6, 3.4); A.paper(c, cap, 1.2); circ(c, x + 13, top + 6, 3.4); A.paper(c, cap, 1.2);
    A.wobRect(c, x - 14, bot - 6, 28, 7, 1, x + 13); A.paper(c, cap, 1.4);
  }
  // Lampe de tableau en laiton (son faisceau est animé à part)
  function drawLampBody(c, x) {
    line(c, x, -2, x, 3, INK, 1.6);
    A.wobble(c, [[x - 10, 3], [x + 10, 3], [x + 8, 8], [x - 8, 8]], 1, x); A.paper(c, '#c9952e', 1.4);
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
      circ(c, x, y + h / 2, h / 2 - 1); c.fillStyle = '#6cb8e6'; c.fill();
      c.save(); circ(c, x, y + h / 2, h / 2 - 1); c.clip(); c.fillStyle = '#2f78ad'; c.fillRect(x - h, y + h * 0.6, h * 2, h); c.restore();
      circ(c, x, y + h / 2, h / 2 - 1); fs(c, null, 2);
      c.fillStyle = '#f39c34'; ell(c, x - 4, y + h * 0.65, 6, 3.4); c.fill();
      c.beginPath(); c.moveTo(x + 2, y + h * 0.65); c.lineTo(x + 7, y + h * 0.65 - 3.5); c.lineTo(x + 7, y + h * 0.65 + 3.5); c.fill();
      for (var b = 0; b < 6; b++) { var ba = b * Math.PI / 3; circ(c, x + Math.cos(ba) * (h / 2 + 2), y + h / 2 + Math.sin(ba) * (h / 2 + 2), 1.8); c.fillStyle = '#7a5a34'; c.fill(); }
      c.restore();
      return { style: style, w: w, h: h };
    }
    if (style === 'emballe') {
      // tableau emballé dans du papier kraft
      rr(c, x - w / 2 - 3, y - 3, w + 6, h + 6, 2); fs(c, '#c9a46a', 2.4);
      line(c, x, y - 3, x, y + h + 3, '#7a5a34', 2.4); line(c, x - w / 2 - 3, y + h / 2, x + w / 2 + 3, y + h / 2, '#7a5a34', 2.4);
      c.save(); c.translate(x - w / 4, y + h / 4 + 2); c.rotate(-0.15);
      c.font = '9px ' + A.FONT; c.textAlign = 'center'; c.fillStyle = 'rgba(192,57,43,0.85)'; c.fillText('FRAGILE', 0, 3);
      c.restore();
      c.restore();
      return { style: style, w: w, h: h };
    }
    var fc = style === 'coffres' ? '#8792a3' : '#e2b13e';
    A.wobRect(c, x - w / 2 - 7, y - 6, w + 14, h + 12, 2, x | 0); A.paper(c, fc, 2);
    A.wobRect(c, x - w / 2 - 3, y - 2, w + 6, h + 4, 1.2, (x | 0) + 1); A.paper(c, A.shade(fc, -0.22), 1.2);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (k) { circ(c, x + k[0] * (w / 2 + 4), y + h / 2 + k[1] * (h / 2 + 3), 3); A.paper(c, A.shade(fc, 0.25), 1); });
    c.beginPath(); c.rect(x - w / 2, y, w, h); c.clip();
    var x0 = x - w / 2;
    if (style === 'blason') {
      c.fillStyle = '#7a1f2b'; c.fillRect(x0, y, w, h);
      c.fillStyle = 'rgba(242,193,78,0.25)'; for (var bs = 0; bs < w; bs += 10) c.fillRect(x0 + bs, y, 2, h);
      c.beginPath(); c.moveTo(x - 12, y + 6); c.lineTo(x + 12, y + 6); c.lineTo(x + 12, y + 20); c.quadraticCurveTo(x + 12, y + h - 8, x, y + h - 3); c.quadraticCurveTo(x - 12, y + h - 8, x - 12, y + 20); c.closePath();
      fs(c, '#2f4fa8', 1.8);
      c.fillStyle = '#f2c14e'; c.beginPath(); c.moveTo(x - 12, y + 26); c.lineTo(x, y + 14); c.lineTo(x + 12, y + 26); c.lineTo(x + 12, y + 31); c.lineTo(x, y + 19); c.lineTo(x - 12, y + 31); c.closePath(); c.fill();
    } else if (style === 'marine') {
      c.fillStyle = '#8fd0ff'; c.fillRect(x0, y, w, h); c.fillStyle = '#ffd9a0'; c.fillRect(x0, y, w, h * 0.25);
      c.fillStyle = '#1d5f8a'; c.fillRect(x0, y + h * 0.7, w, h * 0.3);
      c.strokeStyle = '#ffffff'; c.lineWidth = 1.4;
      for (var wv = 0; wv < w; wv += 12) { c.beginPath(); c.arc(x0 + wv + 6, y + h * 0.78, 4, Math.PI, 0); c.stroke(); }
      c.fillStyle = '#7a4b2a'; c.beginPath(); c.moveTo(x - 16, y + h * 0.66); c.lineTo(x + 14, y + h * 0.66); c.lineTo(x + 9, y + h * 0.76); c.lineTo(x - 12, y + h * 0.76); c.closePath(); c.fill();
      c.fillStyle = '#fbfaf5'; c.beginPath(); c.moveTo(x - 2, y + 6); c.lineTo(x - 2, y + h * 0.62); c.lineTo(x - 15, y + h * 0.62); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(x + 1, y + 10); c.lineTo(x + 1, y + h * 0.62); c.lineTo(x + 12, y + h * 0.62); c.closePath(); c.fill();
    } else if (style === 'miroir') {
      c.fillStyle = '#b9d6ec'; c.fillRect(x0, y, w, h);
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
      c.fillStyle = '#8fd0ff'; c.fillRect(x0, y, w, h);
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
    return { style: style, w: w, h: h };
  }

  /* ================= Décor animé ================= */
  // Tout bouge par à-coups (quelques poses par seconde), comme une animation en papier découpé.
  R.drawDecorAnim = function (c, game, time) {
    var level = this.level, th = level.theme, st = Math.floor(time * 4), self = this;
    function nearest(x, y) {
      var best = null, bd = Infinity;
      for (var i = 0; i < game.enemies.length; i++) {
        var e = game.enemies[i];
        if (!e.alive) continue;
        var d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y);
        if (d < bd) { bd = d; best = e; }
      }
      return best;
    }
    function lookAt(x, y) {
      var e = nearest(x, y);
      if (!e) return { x: [0, 0, 0.6, -0.6][Math.floor(time * 0.7) % 4], y: 0 };
      var dx = e.x - x, dy = e.y - 30 - y, l = Math.hypot(dx, dy) || 1;
      return { x: dx / l, y: dy / l };
    }

    var lights = 0;
    (this.wallAnims || []).forEach(function (a) {
      if (a.t === 'light') {
        // Faisceau de la lampe de tableau ; l'une d'elles grésille
        var on = !(lights++ === self.flicker && (st % 11 === 3 || st % 11 === 5));
        if (!on) return;
        c.fillStyle = 'rgba(255,240,170,0.2)';
        c.beginPath(); c.moveTo(a.x - 8, a.y + 2); c.lineTo(a.x + 8, a.y + 2); c.lineTo(a.x + a.w * 0.6, a.y + a.h); c.lineTo(a.x - a.w * 0.6, a.y + a.h); c.closePath(); c.fill();
      } else if (a.t === 'torch') {
        // Torche : support de bronze et flamme en trois poses
        var tf = Math.floor(time * 6 + a.x) % 3, f = [[0, -14], [2, -16], [-2, -12]][tf];
        c.fillStyle = 'rgba(255,190,90,0.18)'; circ(c, a.x, a.y - 6, 20); c.fill();
        A.wobble(c, [[a.x - 5, a.y], [a.x + 5, a.y], [a.x + 3, a.y + 10], [a.x - 3, a.y + 10]], 0.6, a.x); A.paper(c, '#8a6a3a', 1.4);
        A.wobble(c, [[a.x - 6, a.y], [a.x + f[0] - 2, a.y - 7], [a.x + f[0], a.y + f[1]], [a.x + f[0] + 3, a.y - 6], [a.x + 6, a.y]], 0.8, a.x + tf); A.paper(c, '#ff9f1c', 1.2);
        ell(c, a.x + f[0] * 0.5, a.y - 4, 2.4, 3.6); c.fillStyle = '#fff1a6'; c.fill();
      } else if (a.t === 'eyes') {
        // Les portraits suivent les voleurs des yeux
        var lk = lookAt(a.x, a.y), er = a.r * 0.28, ex = a.r * 0.42;
        [-1, 1].forEach(function (s) {
          circ(c, a.x + s * ex, a.y - a.r * 0.12, er); c.fillStyle = '#ffffff'; c.fill();
          circ(c, a.x + s * ex + lk.x * er * 0.45, a.y - a.r * 0.12 + lk.y * er * 0.4, er * 0.55); c.fillStyle = INK; c.fill();
        });
      }
    });

    // Plantes, orangers, mobiles et gouvernails qui se balancent
    (this.liveDeco || []).forEach(function (d, i) {
      var p = (st + i) % 4;
      c.save(); c.translate(d.x, d.y);
      if (d.t === 'mobile') c.scale([1, 0.55, -1, 0.55][p], 1);
      else c.rotate([0.05, 0, -0.05, 0][p] * (d.t === 'gouvernail' ? 0.6 : 1));
      c.translate(-d.x, -d.y);
      A.deco(c, d, th);
      c.restore();
    });

    // Armures et sarcophages qui regardent passer les voleurs, braseros qui crépitent
    (level.deco || []).forEach(function (d) {
      if (d.t !== 'armure' && d.t !== 'sarcophage' && d.t !== 'brasero') return;
      var s = d.s || 1;
      c.save(); c.translate(d.x, d.y); c.scale(s, s);
      if (d.t === 'armure') {
        var la = lookAt(d.x, d.y - 80 * s);
        circ(c, -3 + la.x * 2.5, -78.5, 1.2); circ(c, 3 + la.x * 2.5, -78.5, 1.2); c.fillStyle = '#ffe9a8'; c.fill();
      } else if (d.t === 'sarcophage') {
        if (Math.floor(time * 2.5 + d.x) % 9 !== 0) {
          var ls = lookAt(d.x, d.y - 72 * s);
          ell(c, -2.5, -72, 2.6, 2); ell(c, 3.5, -72, 2.6, 2); c.fillStyle = '#ffffff'; c.fill();
          circ(c, -2.5 + ls.x * 1.2, -72, 1.2); circ(c, 3.5 + ls.x * 1.2, -72, 1.2); c.fillStyle = INK; c.fill();
        }
      } else {
        var bp = Math.floor(time * 7 + d.x) % 3, bx = [-6, 5, -1][bp], bh = [14, 18, 12][bp];
        A.wobble(c, [[bx - 4, -40], [bx, -40 - bh], [bx + 4, -40]], 0.8, bp); A.paper(c, '#ffb347', 1);
      }
      c.restore();
    });

    // Une mouche qui zigzague par à-coups dans la salle
    var ft = Math.floor(time * 8) / 8, sd = level.id;
    var fx = W * 0.5 + Math.cos(ft * 0.9 + sd) * W * 0.36 + Math.sin(ft * 2.3) * 26;
    var fy = WALL + 90 + (H - WALL - 160) * (0.5 + 0.5 * Math.sin(ft * 0.7 + sd * 2)) + Math.cos(ft * 3.1) * 14;
    circ(c, fx, fy, 2.4); c.fillStyle = INK; c.fill();
    ell(c, fx - 1.5, fy - 3, 2.4, 1.4); ell(c, fx + 1.5, fy - 3, 2.4, 1.4);
    c.fillStyle = Math.floor(time * 16) % 2 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)'; c.fill();
  };

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
    var bg = this.bgs ? this.bgs[Math.floor(time * BOIL_FPS) % this.bgs.length] : this.bg;
    c.drawImage(bg, -MX, -MY, W + 2 * MX, H + 2 * MY);
    this.drawDecorAnim(c, game, time);

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
      var br = PT.POWERS.buste.radius * game.mods.bustRadius;
      (game.mods.bustDouble ? [-br * 0.75, br * 0.75] : [0]).forEach(function (ox) {
        circ(c, ui.aim.x + ox, ui.aim.y, br); c.fillStyle = 'rgba(255,212,71,0.15)'; c.fill();
        c.lineWidth = 3; c.strokeStyle = '#ffd447'; c.stroke();
      });
      c.restore();
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
    // Socle libre : une estrade bien visible et une pastille « + » qui sautille en deux poses
    c.save(); c.translate(s.x, s.y);
    var top = affordable ? '#ffe9a8' : '#ddd6c8', side = affordable ? '#e0a63a' : '#a89f92', badge = affordable ? '#3fae46' : '#9a9088';
    if (selected) { ell(c, 0, 2, 44, 19); c.fillStyle = 'rgba(255,212,71,0.6)'; c.fill(); }
    ell(c, 0, 7, 34, 13); c.fillStyle = 'rgba(20,10,5,0.25)'; c.fill();
    ell(c, 0, 5, 31, 12); fs(c, side, 2.6);
    c.fillStyle = side; c.fillRect(-31, 0, 62, 5);
    line(c, -31, 0, -31, 5, INK, 1.6); line(c, 31, 0, 31, 5, INK, 1.6);
    ell(c, 0, 0, 31, 12); fs(c, top, 2.6);
    ell(c, 0, 0, 20, 7.5); c.setLineDash([5, 4]); c.lineWidth = 1.6; c.strokeStyle = side; c.stroke(); c.setLineDash([]);
    var hop = (Math.floor(time * 2.5 + s.i * 0.7) & 1) ? 4 : 0, by = -30 - hop;
    c.beginPath(); c.moveTo(-5, by + 9); c.lineTo(0, by + 18); c.lineTo(5, by + 9); c.closePath(); fs(c, badge, 2);
    circ(c, 0, by, 12.5); fs(c, badge, 2.6);
    c.lineWidth = 4.2; c.strokeStyle = '#ffffff'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-6, by); c.lineTo(6, by); c.moveTo(0, by - 6); c.lineTo(0, by + 6); c.stroke();
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
    circ(c, d.x, d.y, d.r || PT.POWERS.buste.radius); c.setLineDash([6, 6]); c.lineWidth = 2.4; c.strokeStyle = 'rgba(255,80,60,0.8)'; c.stroke();
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
    if (t.type !== 'chef' && game.towerStats(t).chefBuff > 0) {
      A.starPath(c, 24, -16 - (Math.floor(time * 3 + t.id) % 2) * 2, 6, 2.6); A.fs(c, '#ffd447', 1.6);
    }
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
    if (e.burrowT > 0) {
      // La Taupe creuse : seul un monticule de terre avance sous le tapis
      c.save(); c.translate(e.x, e.y);
      var bump = Math.floor(time * 8 + e.id) % 2 ? 2 : 0;
      A.ell(c, 0, -4 - bump, 17, 9 + bump); A.fs(c, '#7a5232', 2);
      c.fillStyle = '#5a3a1e'; [[-8, -8], [6, -11], [1, -4]].forEach(function (p) { A.circ(c, p[0], p[1] - bump, 2.2); c.fill(); });
      c.restore();
      return;
    }
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
      circ(c, A.EYES[0][0], A.EYES[0][1], 1.9); circ(c, A.EYES[1][0], A.EYES[1][1], 1.9); c.fillStyle = '#fff6b0'; c.fill();
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
    if (e.wetT > 0) {
      c.fillStyle = 'rgba(90,170,255,0.9)';
      for (var wd = 0; wd < 3; wd++) {
        var wp = (time * 2 + wd * 0.33 + e.id * 0.1) % 1;
        A.ell(c, (wd - 1) * 10 * size, -30 * size + wp * 26, 1.8, 2.8); c.fill();
      }
    }
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
      case 'gust':
        this.addFx({ kind: 'gust', x: x, y: y, tx: ev.tx, ty: ev.ty, life: 0.45 });
        this.addFx({ kind: 'comic', x: ev.tx, y: ev.ty - 70, text: 'FIOUU !', life: 0.6 });
        break;
      case 'heal':
        for (i = 0; i < 5; i++) this.addFx({ kind: 'text', x: x + (Math.random() - 0.5) * 70, y: y - 30 - Math.random() * 40, text: '+', color: '#5fd35f', size: 18, life: 0.8 });
        this.addFx({ kind: 'ring', x: x, y: y - 20, r0: 20, r1: 115, color: '#5fd35f', life: 0.5 });
        break;
      case 'burrow': this.addFx({ kind: 'poof', x: x, y: y - 6, r: 18, life: 0.4, grey: true }); this.addFx({ kind: 'comic', x: x, y: y - 60, text: 'GRAT GRAT', life: 0.6 }); break;
      case 'surface': this.addFx({ kind: 'poof', x: x, y: y - 6, r: 22, life: 0.4, grey: true }); break;
      case 'interest': this.addFx({ kind: 'text', x: W / 2, y: 200, text: 'Intérêts +' + ev.value, color: '#ffd447', size: 22, life: 1.2 }); break;
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
      } else if (f.kind === 'gust') {
        // Rafale : traits de vent du ventilateur vers la cible
        c.save(); c.globalAlpha = 1 - k; c.strokeStyle = '#e8f6ff'; c.lineWidth = 3; c.lineCap = 'round';
        for (var gi = -1; gi <= 1; gi++) {
          var gx = f.x + (f.tx - f.x) * (0.25 + k * 0.6), gy = f.y + (f.ty - 30 - f.y) * (0.25 + k * 0.6) + gi * 12;
          c.beginPath(); c.moveTo(gx - (f.tx - f.x) * 0.18, gy - (f.ty - f.y) * 0.18); c.quadraticCurveTo(gx, gy - 6, gx + 10, gy + 2); c.stroke();
        }
        c.restore();
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
