/* Pas Touche ! — interface DOM : écrans, HUD, menu radial de construction, bulles et toasts. */
(function (PT) {
  'use strict';

  var A = PT.Art;
  var UI = PT.UI = { selectedSpot: null, selectedTower: null, preview: null, aim: null, aiming: null, radialSel: null };
  var $ = function (id) { return document.getElementById(id); };
  var App = function () { return PT.App; };

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function click(node, fn) {
    node.addEventListener('click', function (ev) { ev.stopPropagation(); PT.Audio.unlock(); PT.Audio.play('click'); fn(ev); });
  }
  UI.el = el;
  var VARIANTS = { visiteurs: 'Portes ouvertes', panne: 'Panne de courant' };

  var ICON_SOUND = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#2a1c16"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="#2a1c16" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';
  var ICON_MUTE = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#2a1c16"/><path d="M16 9l5 6M21 9l-5 6" stroke="#2a1c16" stroke-width="2.4" stroke-linecap="round"/></svg>';
  var ICON_FULL = '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" stroke="#2a1c16" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ================= Écrans ================= */
  UI.closeScreens = function () { $('screens').innerHTML = ''; };
  UI.screen = function (id, cls) {
    UI.closeScreens();
    UI.hideTaunt();
    var s = el('section', 'screen' + (cls ? ' ' + cls : ''));
    s.id = id;
    $('screens').appendChild(s);
    return s;
  };
  UI.hasScreen = function () { return $('screens').children.length > 0; };

  function starsBadge() {
    var a = App();
    return '<span class="pill star-count"><img alt="" src="' + A.starIcon(true) + '"><span>' + a.starsFree() + '</span></span>';
  }
  // Vrai si au moins un talent ouvert est achetable : on le signale par une pastille
  function canBuy() {
    var a = App(), free = a.starsFree();
    return PT.UPGRADES.some(function (u) {
      var r = a.save.upgrades[u.id] || 0;
      return r < u.costs.length && u.costs[r] <= free && PT.upgradeOpen(u.id, a.save.upgrades);
    });
  }
  function shopBtn(id, back) {
    var b = el('button', 'btn small ghost shop-btn' + (canBuy() ? ' notify' : ''), '<img alt="" src="' + A.starIcon(true) + '">Atelier');
    b.id = id;
    click(b, function () { UI.showAtelier(back); });
    return b;
  }
  // Croix rouge « Fermer », en haut à droite, là où on la cherche d'instinct
  var ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  function closeBtn(fn) { var b = el('button', 'btn-round btn-close', ICON_CLOSE); b.setAttribute('aria-label', 'Fermer'); click(b, fn); return b; }

  /* ---------- Titre ---------- */
  UI.showTitle = function () {
    var a = App();
    var s = UI.screen('scr-title');
    s.innerHTML =
      '<div class="title-corner"><button class="btn-round" id="t-full" aria-label="Plein écran">' + ICON_FULL + '</button>' +
      '<button class="btn-round" id="t-sound" aria-label="Son">' + (a.save.music || a.save.sfx ? ICON_SOUND : ICON_MUTE) + '</button></div>' +
      '<div class="logo"><span class="l1">PAS TOUCHE <em>!</em></span><span class="l2">Défense du Musée</span></div>' +
      '<div class="title-buttons">' +
      '<button class="btn big" id="t-play">Jouer</button>' +
      '<div class="row"><button class="btn small ghost' + (canBuy() ? ' notify' : '') + '" id="t-shop"><img alt="" src="' + A.starIcon(true) + '">Atelier</button>' +
      '<button class="btn small ghost" id="t-sus">Fichier des suspects</button>' +
      '<button class="btn small ghost" id="t-opt">Options</button></div></div>' +
      '<div class="credit">Le Grand Concours des cambrioleurs a commencé. Défendez la collection !</div>';
    click($('t-play'), function () { a.fullscreenOnce(); if (!a.save.story) UI.showStory(); else UI.showLevels(); });
    click($('t-shop'), function () { UI.showAtelier(UI.showTitle); });
    click($('t-sus'), function () { UI.showSuspects(UI.showTitle); });
    click($('t-opt'), function () { UI.showOptions(UI.showTitle); });
    click($('t-full'), function () { a.toggleFullscreen(); });
    click($('t-sound'), function () {
      var on = !(a.save.music || a.save.sfx);
      a.setSound(on, on);
      $('t-sound').innerHTML = on ? ICON_SOUND : ICON_MUTE;
    });
  };

  /* ---------- Histoire ---------- */
  var STORY = [
    { pic: 'guard', text: 'Trouville-sur-Bof, 23 h. Vous voilà chef de la sécurité du musée. « Un poste tranquille », vous avait-on promis.' },
    { pic: 'gentleman', letter: '« Chers confrères voleurs, j’ouvre LE GRAND CONCOURS. Celui qui pillera les musées de la région deviendra mon héritier. Que le meilleur gagne ! »<br>— Le Gentleman' },
    { pic: 'voleur', text: 'Ce soir, tous les cambrioleurs du pays débarquent. Leur plan : filer jusqu’au trésor, prendre un objet, et ressortir par où ils sont venus.' },
    { pic: 'guard', text: 'Votre mission : touchez les socles <b>+</b> pour poser vos défenses, et attrapez les voleurs <b>avant qu’ils ressortent</b>. À l’aller comme au retour. Une seule consigne : PAS TOUCHE !' },
  ];
  UI.showStory = function (i) {
    i = i || 0;
    var a = App(), st = STORY[i];
    var s = UI.screen('scr-story');
    var pic = st.pic === 'guard' ? A.guardPortrait() : A.portrait(st.pic);
    var dots = STORY.map(function (_, k) { return '<i class="' + (k === i ? 'on' : '') + '"></i>'; }).join('');
    s.innerHTML = '<div class="frame story"><div class="pic"><img alt="" src="' + pic + '"></div><div>' +
      '<div class="eyebrow">Le Grand Concours · ' + (i + 1) + '/' + STORY.length + '</div>' +
      (st.letter ? '<p class="letter">' + st.letter + '</p>' : '<p>' + st.text + '</p>') +
      '<div class="dots">' + dots + '</div>' +
      '<div class="actions"><button class="btn ghost small" id="s-skip">Passer</button><button class="btn" id="s-next">' + (i === STORY.length - 1 ? 'Au travail !' : 'Suivant') + '</button></div></div></div>';
    PT.Audio.play('page');
    var done = function () { a.save.story = true; a.persist(); UI.showLevels(); };
    click($('s-next'), function () { if (i < STORY.length - 1) UI.showStory(i + 1); else done(); });
    click($('s-skip'), done);
  };

  /* ---------- Choix des salles ---------- */
  var thumbs = {};
  function thumb(lv) { if (!thumbs[lv.id]) thumbs[lv.id] = PT.Renderer.thumbnail(lv, 320); return thumbs[lv.id]; }
  var WINGS = ['Les débuts', 'Les grandes galeries', 'Les trésors du monde', 'Les réserves secrètes', 'Le Grand Final'];
  UI.wing = null;
  UI.showLevels = function () {
    var a = App();
    var s = UI.screen('scr-levels');
    var head = el('div', 'screen-head');
    var left = el('div', 'head-right', starsBadge());
    left.appendChild(shopBtn('l-shop', UI.showLevels));
    head.appendChild(left);
    head.appendChild(el('h2', '', 'Choisissez une salle'));
    head.appendChild(closeBtn(UI.showTitle));
    s.appendChild(head);
    // Les salles sont rangées par ailes de 10 ; on ouvre celle de la dernière salle débloquée
    var nWings = Math.ceil(PT.LEVELS.length / 10), lastOpen = 0;
    PT.LEVELS.forEach(function (lv, idx) { if (a.isUnlocked(idx)) lastOpen = idx; });
    if (UI.wing == null || UI.wing >= nWings || !a.isUnlocked(UI.wing * 10)) UI.wing = Math.floor(lastOpen / 10);
    var tabs = el('div', 'wings');
    for (var w = 0; w < nWings; w++) {
      var got = 0, open = a.isUnlocked(w * 10);
      PT.LEVELS.slice(w * 10, w * 10 + 10).forEach(function (lv) { got += a.save.stars[lv.id] || 0; });
      var tb = el('button', 'wing' + (w === UI.wing ? ' on' : '') + (open ? '' : ' locked'),
        '<small>Aile ' + (w + 1) + '</small>' + esc(WINGS[w] || '') + '<span>' + got + '/' + Math.min(10, PT.LEVELS.length - w * 10) * PT.MAX_STARS + ' ★</span>');
      (function (w, open) {
        if (open) click(tb, function () { UI.wing = w; UI.showLevels(); });
        else tb.addEventListener('click', function () { PT.Audio.play('error'); UI.toast('Aile fermée', 'Terminez la salle ' + (w * 10) + ' pour l’ouvrir'); });
      })(w, open);
      tabs.appendChild(tb);
    }
    s.appendChild(tabs);
    var list = el('div', 'levels');
    PT.LEVELS.forEach(function (lv, idx) {
      if (Math.floor(idx / 10) !== UI.wing) return;
      var unlocked = a.isUnlocked(idx), stars = a.save.stars[lv.id] || 0;
      var b = el('button', 'lvl' + (unlocked ? '' : ' locked'));
      var st = '';
      for (var k = 0; k < PT.MAX_STARS; k++) st += '<img alt="" src="' + A.starIcon(k < stars) + '">';
      var badge = lv.type === 'casse' ? '<span class="badge casse">CASSE</span>' : lv.variant ? '<span class="badge variante">' + VARIANTS[lv.variant] + '</span>' : '';
      b.innerHTML = badge + (unlocked ? '' : '<img class="lock-ic" alt="Verrouillée" src="' + A.lockIcon() + '">') + '<img class="thumb" alt="" src="' + thumb(lv) + '"><div class="body"><span class="num">SALLE ' + lv.id + '</span>' +
        '<span class="name">' + esc(lv.name) + '</span><span class="sub">' + esc(lv.subtitle) + '</span><span class="stars">' + st + '</span></div>';
      if (unlocked) click(b, function () { UI.showBrief(idx); });
      else b.addEventListener('click', function () { PT.Audio.play('error'); UI.toast('Salle verrouillée', 'Terminez la salle ' + (idx) + ' pour l’ouvrir'); });
      list.appendChild(b);
    });
    s.appendChild(list);
    var more = el('p', 'credit', 'Un casse toutes les 5 salles · Le Gentleman vous attend en salle ' + PT.LEVELS.length);
    s.appendChild(more);
    // Faire défiler jusqu'à la dernière salle ouverte
    setTimeout(function () {
      var cards = list.querySelectorAll('.lvl:not(.locked)');
      if (cards.length) cards[cards.length - 1].scrollIntoView({ inline: 'center', block: 'nearest' });
    }, 30);
  };

  /* ---------- Briefing avant la salle ---------- */
  function enemiesOf(level) {
    var types = [];
    level.waves.forEach(function (w) { w.groups.forEach(function (g) { if (types.indexOf(g.t) < 0) types.push(g.t); }); });
    return PT.ENEMY_ORDER.filter(function (t) { return types.indexOf(t) >= 0; });
  }
  UI.newThings = function (level) {
    var before = [];
    PT.LEVELS.forEach(function (l) { if (l.id < level.id) enemiesOf(l).forEach(function (t) { if (before.indexOf(t) < 0) before.push(t); }); });
    return {
      enemies: enemiesOf(level).filter(function (t) { return before.indexOf(t) < 0; }),
      towers: PT.TOWER_ORDER.filter(function (t) { return PT.TOWERS[t].unlock === level.id; }),
      powers: PT.POWER_ORDER.filter(function (p) { return PT.POWERS[p].unlock === level.id; }),
    };
  };
  function chip(img, name, kind, wide) {
    return '<div class="chip' + (wide ? ' wide' : '') + '"><img alt="" src="' + img + '"><span><small>' + esc(kind) + '</small>' + esc(name) + '</span></div>';
  }
  function card(img, name, desc, tag, tagCls) {
    return '<div class="card"><img alt="" src="' + img + '"><div><b>' + esc(name) + (tag ? '<span class="tag ' + (tagCls || '') + '">' + tag + '</span>' : '') + '</b><small>' + esc(desc) + '</small></div></div>';
  }
  UI.showBrief = function (idx) {
    var a = App(), lv = PT.LEVELS[idx];
    var s = UI.screen('scr-brief');
    var nw = UI.newThings(lv);
    var cards = '';
    nw.towers.forEach(function (t) { cards += card(A.towerIcon(t), PT.TOWERS[t].name, PT.TOWERS[t].desc, 'DÉFENSE', 'def'); });
    nw.powers.forEach(function (p) { cards += card(A.powerIcon(p), PT.POWERS[p].name, PT.POWERS[p].desc, 'POUVOIR', 'pow'); });
    nw.enemies.forEach(function (t) { cards += card(A.enemyIcon(t), PT.ENEMIES[t].name, PT.ENEMIES[t].desc, 'SUSPECT'); });
    var foes = enemiesOf(lv).map(function (t) { return '<img alt="' + esc(PT.ENEMIES[t].name) + '" title="' + esc(PT.ENEMIES[t].name) + '" src="' + A.enemyIcon(t) + '">'; }).join('');
    var kind = lv.type === 'casse' ? 'Niveau casse' : lv.variant ? 'Variante ' + VARIANTS[lv.variant].toLowerCase() : 'Horde';
    s.innerHTML = '<div class="frame brief"><div class="top"><img alt="" src="' + thumb(lv) + '"><div>' +
      '<div class="eyebrow">Salle ' + lv.id + ' · ' + kind + ' · ' + lv.waves.length + ' vagues</div>' +
      '<h2>' + esc(lv.name) + '</h2><p><b>Trésor :</b> ' + esc(lv.treasure.name) + '</p><p>' + esc(lv.blurb) + '</p></div></div>' +
      (cards ? '<h3>Nouveautés</h3><div class="cards">' + cards + '</div>' : '') +
      '<h3>Suspects attendus</h3><div class="foes">' + foes + '</div>' +
      '<div class="actions"><button class="btn ghost" id="b-back">Retour</button><button class="btn big" id="b-go">C’est parti !</button></div></div>';
    click($('b-back'), UI.showLevels);
    click($('b-go'), function () { a.startLevel(idx); });
  };

  /* ---------- Briefing d'équipe (niveaux casse) ---------- */
  UI.showCrew = function (level, index, onClose) {
    var w = level.waves[index], crew = w.crew;
    var counts = {};
    w.groups.forEach(function (g) { counts[g.t] = (counts[g.t] || 0) + g.n; });
    var s = UI.screen('scr-crew', 'dim');
    var members = Object.keys(counts).map(function (t, i) {
      return '<div class="m" style="--r:' + ((i % 2 ? 3 : -3)) + 'deg"><img alt="" src="' + A.enemyIcon(t) + '"><small>' + esc(PT.ENEMIES[t].name) + '</small><span>×' + counts[t] + '</span></div>';
    }).join('');
    s.innerHTML = '<div class="dossier"><span class="stamp">PLAN DU CASSE INTERCEPTÉ</span>' +
      '<div class="eyebrow" style="margin-top:8px">Équipe ' + (index + 1) + ' sur ' + level.waves.length + '</div>' +
      '<h2>' + esc(crew.name) + '</h2><p>' + esc(crew.plan) + '</p><div class="crew">' + members + '</div>' +
      '<div class="actions"><button class="btn big" id="c-ok">Compris !</button></div></div>';
    PT.Audio.play('page');
    click($('c-ok'), function () { UI.closeScreens(); if (onClose) onClose(); });
  };

  /* ---------- Pause ---------- */
  UI.showPause = function () {
    var a = App();
    var s = UI.screen('scr-pause', 'dim');
    s.innerHTML = '<div class="frame" style="width:min(100%, calc(var(--u) * 460))"><h2>Pause</h2>' +
      '<div class="eyebrow">' + esc(a.game.level.name) + '</div>' +
      toggleRow('p-music', 'Musique', a.save.music) + toggleRow('p-sfx', 'Effets sonores', a.save.sfx) +
      '<div class="actions"><button class="btn ghost small" id="p-quit">Quitter</button><button class="btn ghost small" id="p-restart">Recommencer</button><button class="btn green" id="p-resume">Reprendre</button></div></div>';
    bindToggles();
    click($('p-resume'), function () { a.resume(); });
    click($('p-restart'), function () { a.startLevel(a.levelIdx); });
    click($('p-quit'), function () { a.quitToLevels(); });
  };

  function toggleRow(id, label, on) {
    return '<div class="toggle"><span>' + label + '</span><button class="sw' + (on ? ' on' : '') + '" id="' + id + '" role="switch" aria-checked="' + !!on + '" aria-label="' + label + '"></button></div>';
  }
  function bindToggles() {
    var a = App();
    if ($('p-music')) click($('p-music'), function () { a.setSound(!a.save.music, a.save.sfx); $('p-music').classList.toggle('on', a.save.music); });
    if ($('p-sfx')) click($('p-sfx'), function () { a.setSound(a.save.music, !a.save.sfx); $('p-sfx').classList.toggle('on', a.save.sfx); });
  }

  /* ---------- Victoire / défaite ---------- */
  UI.showWin = function (info) {
    var a = App(), lv = info.level, idx = a.levelIdx, next = PT.LEVELS[idx + 1];
    var s = UI.screen('scr-win');
    var stars = '';
    for (var k = 0; k < PT.MAX_STARS; k++) stars += '<img alt="" class="' + (k < info.stars ? 'on' : '') + '" style="animation-delay:' + (0.25 + k * 0.3) + 's" src="' + A.starIcon(k < info.stars) + '">';
    var unl = '';
    if (info.firstClear && next) {
      PT.TOWER_ORDER.forEach(function (t) { if (PT.TOWERS[t].unlock === next.id) unl += chip(A.towerIcon(t), PT.TOWERS[t].name, 'Défense'); });
      PT.POWER_ORDER.forEach(function (p) { if (PT.POWERS[p].unlock === next.id) unl += chip(A.powerIcon(p), PT.POWERS[p].name, 'Pouvoir'); });
      unl += chip(thumb(next), next.name, 'Salle ' + next.id, true);
    }
    var g = info.game;
    s.innerHTML = '<div class="frame result"><img class="end-art" alt="" src="' + A.endArt(true, lv.treasure.kind) + '"><div class="eyebrow">Salle ' + lv.id + ' · ' + esc(lv.name) + '</div><h2>Musée protégé !</h2>' +
      '<div class="big-stars">' + stars + '</div>' +
      '<div class="stats-row"><div><b>' + g.stats.caught + '</b>voleurs attrapés</div><div><b>' + g.lives + '/' + g.maxLives + '</b>objets sauvés</div><div><b>' + g.stats.returned + '</b>repris aux voleurs</div></div>' +
      (info.gained > 0 ? '<p><b>+' + info.gained + ' étoile' + (info.gained > 1 ? 's' : '') + '</b> à dépenser à l’Atelier.</p>' : '') +
      (unl ? '<div class="eyebrow">Débloqué</div><div class="unlocks">' + unl + '</div>' : '') +
      '<div class="quote"><img alt="" src="' + A.portrait('gentleman') + '"><p>« ' + esc(lv.outro) + ' »</p></div>' +
      '<div class="actions"><button class="btn ghost small" id="w-menu">Salles</button><button class="btn ghost small' + (canBuy() ? ' notify' : '') + '" id="w-shop">Atelier</button><button class="btn ghost small" id="w-retry">Rejouer</button>' +
      (next ? '<button class="btn green" id="w-next">Salle suivante</button>' : '') + '</div></div>';
    for (var j = 0; j < info.stars; j++) setTimeout(function () { PT.Audio.play('star'); }, 300 + j * 300);
    click($('w-menu'), function () { a.quitToLevels(); });
    click($('w-shop'), function () { a.quitToLevels(); UI.showAtelier(UI.showLevels); });
    click($('w-retry'), function () { a.startLevel(idx); });
    if (next) click($('w-next'), function () { a.quitToLevels(true); UI.showBrief(idx + 1); });
  };

  var LOSE_QUOTES = [
    'Merci pour la visite, gardien ! Je repasserai.',
    'Trop facile. Le Grand Concours vous remercie de votre participation.',
    'Un musée sans gardien, c’est un supermarché gratuit.',
    'Ne le prenez pas mal : j’ai juste meilleur goût que vous.',
  ];
  UI.showLose = function (info) {
    var a = App(), lv = info.level;
    var tips = [];
    var types = enemiesOf(lv);
    if (types.some(function (t) { return PT.ENEMIES[t].camo || PT.ENEMIES[t].disguise; })) tips.push('Les Ombres et les Faux Touristes ne peuvent être visés que s’ils sont filmés : posez des Caméras le long du chemin.');
    if (types.indexOf('hackeuse') >= 0) tips.push('Les Hackeuses coupent le courant des Caméras et des Lasers proches : misez aussi sur les Gardiens et les Bouledogues.');
    if (types.indexOf('acrobate') >= 0) tips.push('Les Acrobates ignorent la glu : comptez sur les Gardiens, les Filets et les Lasers.');
    if (types.indexOf('chevalier') >= 0) tips.push('Les petits coups rebondissent sur les Chevaliers : améliorez vos défenses, ou misez sur le Laser et le Canon qui traversent l’armure.');
    if (types.indexOf('illusionniste') >= 0) tips.push('Les reflets de l’Illusionniste gaspillent vos tirs : une Caméra les fait éclater dès qu’ils passent à portée.');
    if (lv.variant === 'panne') tips.push('Dans le noir, vos défenses ne voient que sous les lampes : posez des Caméras là où il fait sombre.');
    if (lv.id >= 9) tips.push('Le Verrouillage bloque les voleurs chargés devant la sortie : gardez une défense de zone près des portes.');
    tips.push('Placez vos défenses près des virages : les voleurs y passent à l’aller ET au retour.');
    tips.push('Améliorer une défense coûte souvent moins cher que d’en construire une nouvelle.');
    tips.push('Dépensez vos étoiles à l’Atelier pour des bonus permanents.');
    var canRelax = !a.relax && ((a.save.fails || {})[lv.id] || 0) >= PT.RELAX.after;
    var s = UI.screen('scr-lose');
    s.innerHTML = '<div class="frame result"><img class="end-art" alt="" src="' + A.endArt(false, lv.treasure.kind) + '"><div class="eyebrow">Salle ' + lv.id + ' · vague ' + Math.max(1, info.game.waveIndex + 1) + '/' + lv.waves.length + '</div><h2>Cambriolé !</h2>' +
      '<div class="quote"><img alt="" src="' + A.portrait('gentleman') + '"><p>« ' + LOSE_QUOTES[(Math.random() * LOSE_QUOTES.length) | 0] + ' »</p></div>' +
      '<p><b>Astuce :</b> ' + tips[(Math.random() * Math.min(4, tips.length)) | 0] + '</p>' +
      (canRelax ? '<div class="relax"><b>Cette salle vous résiste ?</b> Rejouez-la en <b>mode détente</b> : les voleurs sont 25 % moins résistants, mais vous gagnerez ' + PT.RELAX.maxStars + ' étoiles au plus.</div>' : '') +
      '<div class="actions"><button class="btn ghost small" id="l-menu">Salles</button><button class="btn ghost small" id="l-shop">Atelier</button>' +
      (canRelax ? '<button class="btn small ghost" id="l-relax">Mode détente</button>' : '') + '<button class="btn big" id="l-retry">Réessayer</button></div></div>';
    if (canRelax) click($('l-relax'), function () { a.startLevel(a.levelIdx, true); });
    click($('l-menu'), function () { a.quitToLevels(); });
    click($('l-shop'), function () { a.quitToLevels(); UI.showAtelier(UI.showLevels); });
    click($('l-retry'), function () { a.startLevel(a.levelIdx, a.relax); });
  };

  /* ---------- Atelier : arbre de talents ---------- */
  UI.atelierBranch = 'def';
  UI.atelierSel = null;
  function talentState(u, a) {
    var r = a.save.upgrades[u.id] || 0, max = u.costs.length;
    if (r >= max) return 'done';
    if (u.excl && (a.save.upgrades[u.excl] || 0) > 0) return 'banned';
    if (!PT.upgradeOpen(u.id, a.save.upgrades)) return 'locked';
    return a.starsFree() >= u.costs[r] ? 'buy' : 'poor';
  }
  // Pastille compacte : nom, rangs, prix
  // Talent = un rond avec son dessin, ses rangs en petits points, et son nom dessous.
  function pillHtml(u, a) {
    var r = a.save.upgrades[u.id] || 0, max = u.costs.length, st = talentState(u, a);
    var badge = st === 'locked' ? '<span class="badge"><img alt="" src="' + A.lockIcon() + '"></span>' : st === 'banned' ? '<span class="badge no">✕</span>' : st === 'done' ? '<span class="badge ok">✓</span>' : '';
    var pips = '';
    for (var k = 0; k < max; k++) pips += '<i class="' + (k < r ? 'on' : '') + '"></i>';
    return '<button class="pill-node ' + st + (r > 0 ? ' owned' : '') + (UI.atelierSel === u.id ? ' sel' : '') + '" data-id="' + u.id + '"' + (u.req ? ' data-req="' + u.req + '"' : '') + '>' +
      '<span class="dot"><img alt="" src="' + A.talentIcon(u.id) + '">' + badge + '</span><span class="pips">' + pips + '</span><span class="nm">' + esc(u.name) + '</span></button>';
  }
  function drawTreeLines(box, color) {
    // Traits fins entre les ronds ; positions de mise en page (insensibles à l'animation du cadre)
    var svg = box.querySelector('svg.links'), out = '';
    function dot(n) { var d = n.querySelector('.dot'); return { x: n.offsetLeft + d.offsetLeft + d.offsetWidth / 2, top: n.offsetTop + d.offsetTop, bot: n.offsetTop + d.offsetTop + d.offsetHeight }; }
    box.querySelectorAll('.pill-node[data-req]').forEach(function (n) {
      var p = box.querySelector('.pill-node[data-id="' + n.getAttribute('data-req') + '"]');
      if (!p) return;
      var A1 = dot(p), B1 = dot(n), y1 = A1.bot, y2 = B1.top, my = (y1 + y2) / 2, on = p.classList.contains('owned');
      // Le trait part du rond et contourne le nom du talent parent
      var yl = p.offsetTop + p.offsetHeight + 2;
      out += '<path d="M' + A1.x + ' ' + yl + ' C' + A1.x + ' ' + (yl + y2) / 2 + ' ' + B1.x + ' ' + (yl + y2) / 2 + ' ' + B1.x + ' ' + y2 + '" stroke="' + (on ? color : '#d6c9b3') + '"' + (on ? '' : ' stroke-dasharray="3 4"') + ' />';
    });
    svg.setAttribute('width', box.offsetWidth); svg.setAttribute('height', box.offsetHeight);
    svg.innerHTML = out;
  }
  UI.showAtelier = function (back) {
    var s = UI.screen('scr-atelier');
    var head = el('div', 'screen-head');
    head.appendChild(el('div', 'a-stars', starsBadge()));
    head.appendChild(el('h2', '', 'L’Atelier'));
    head.appendChild(closeBtn(back || UI.showTitle));
    s.appendChild(head);
    var f = el('div', 'frame shop atelier');
    f.style.marginTop = 'calc(var(--u) * 56)';
    s.appendChild(f);
    renderAtelier(f, false);
  };
  // Redessine le contenu de l'Atelier sans rouvrir l'écran (garde la position de défilement)
  function renderAtelier(f, confirmReset) {
    var a = App();
    var scroll = f.scrollTop;
    var badge = document.querySelector('#scr-atelier .a-stars');
    if (badge) badge.innerHTML = starsBadge();
    var sel = PT.upgradeById(UI.atelierSel);
    if (!sel) sel = PT.UPGRADES.filter(function (u) { return talentState(u, a) === 'buy'; })[0] || PT.UPGRADES.filter(function (u) { return talentState(u, a) !== 'done'; })[0] || PT.UPGRADES[0];
    UI.atelierSel = sel.id;
    var br = PT.BRANCHES.filter(function (x) { return x.id === sel.branch; })[0];
    // Toute la marge de progression d'un coup d'œil
    var html = '<div class="atelier-top"><span><b>' + a.starsTotal() + '</b> étoiles gagnées sur ' + PT.LEVELS.length * PT.MAX_STARS + '</span><span><b>' + a.starsSpent() + '</b> investies</span><span><b>' + a.starsFree() + '</b> à dépenser</span></div>';
    html += '<div class="atelier-body" style="--bc:' + br.color + '"><div class="branches">';
    PT.BRANCHES.forEach(function (x) {
      var list = PT.UPGRADES.filter(function (u) { return u.branch === x.id; });
      var spent = 0, cap = 0;
      list.forEach(function (u) {
        var r = a.save.upgrades[u.id] || 0;
        for (var k = 0; k < u.costs.length; k++) { if (!u.excl || u.id < u.excl) cap += u.costs[k]; if (k < r) spent += u.costs[k]; }
      });
      html += '<div class="talent-tree" style="--bc:' + x.color + '"><svg class="links" aria-hidden="true"></svg>' +
        '<div class="bhead"><b>' + esc(x.name) + '</b><span class="bar"><i style="width:' + Math.round(100 * spent / cap) + '%"></i></span></div>';
      list.filter(function (u) { return u.path === 't'; }).forEach(function (u) { html += '<div class="trow">' + pillHtml(u, a) + '</div>'; });
      var pa = list.filter(function (u) { return u.path === 'a' && !u.excl; }), pb = list.filter(function (u) { return u.path === 'b' && !u.excl; });
      for (var i = 0; i < Math.max(pa.length, pb.length); i++) html += '<div class="trow two">' + (pa[i] ? pillHtml(pa[i], a) : '<span></span>') + (pb[i] ? pillHtml(pb[i], a) : '<span></span>') + '</div>';
      html += '<div class="trow two">';
      ['a', 'b'].forEach(function (p) {
        var duo = list.filter(function (u) { return u.path === p && u.excl; });
        html += '<div class="duo">' + pillHtml(duo[0], a) + pillHtml(duo[1], a) + '</div>';
      });
      html += '</div></div>';
    });
    html += '</div>';

    // Panneau de détail
    var r = a.save.upgrades[sel.id] || 0, max = sel.costs.length, st = talentState(sel, a);
    var why = st === 'banned' ? 'Vous avez choisi l’autre option : remboursez vos étoiles pour changer d’avis.' :
      st === 'locked' ? 'Achetez d’abord « ' + esc(PT.upgradeById(sel.req).name) + ' ».' : '';
    html += '<div class="talent-detail"><div class="td-head"><img alt="" src="' + A.talentIcon(sel.id) + '"><h3>' + esc(sel.name) + '</h3></div>' +
      (sel.excl ? '<span class="excl-tag">Au choix avec « ' + esc(PT.upgradeById(sel.excl).name) + ' »</span>' : '') +
      '<p class="rank">' + (sel.path === 't' ? 'Tronc commun' : 'Voie : ' + esc(br.paths[sel.path])) + ' · rang ' + r + ' / ' + max + '</p>' +
      (r > 0 ? '<p class="now">Actuel : ' + esc(sel.desc(r)) + '</p>' : '') +
      (r < max ? '<p class="next">' + (r > 0 ? 'Prochain : ' : '') + esc(sel.desc(r + 1)) + '</p>' : '<p class="next">Talent au maximum.</p>') +
      (why ? '<p class="why">' + why + '</p>' : '') +
      (r < max && (st === 'buy' || st === 'poor') ? '<button class="btn" id="a-buy"' + (st === 'poor' ? ' disabled' : '') + '><img alt="" src="' + A.starIcon(true) + '">Acheter · ' + sel.costs[r] + '</button>' +
        (st === 'poor' ? '<p class="why">Il vous manque ' + (sel.costs[r] - a.starsFree()) + ' étoile' + (sel.costs[r] - a.starsFree() > 1 ? 's' : '') + '.</p>' : '') : '') +
      '<div class="refund">' + (confirmReset ? '<span>Tout rembourser ?</span><button class="btn small ghost" id="a-no">Non</button><button class="btn small red" id="a-yes">Oui</button>' : '<button class="linkish" id="a-reset">Rembourser mes étoiles (gratuit)</button>') + '</div>' +
      '</div></div>';
    f.innerHTML = html;
    f.scrollTop = scroll;
    f.querySelectorAll('.talent-tree').forEach(function (box) { drawTreeLines(box, box.style.getPropertyValue('--bc')); });
    f.querySelectorAll('.pill-node').forEach(function (n) {
      click(n, function () { UI.atelierSel = n.getAttribute('data-id'); PT.Audio.play('click'); renderAtelier(f); });
    });
    if ($('a-buy')) click($('a-buy'), function () {
      if (a.buyUpgrade(sel.id)) {
        PT.Audio.play('upgrade'); renderAtelier(f);
        var bought = f.querySelector('.pill-node[data-id="' + sel.id + '"] .dot');
        if (bought) bought.classList.add('bought');
      }
      else PT.Audio.play('error');
    });
    if ($('a-reset')) click($('a-reset'), function () { renderAtelier(f, true); });
    if ($('a-no')) click($('a-no'), function () { renderAtelier(f); });
    if ($('a-yes')) click($('a-yes'), function () { a.save.upgrades = {}; a.persist(); PT.Audio.play('sell'); renderAtelier(f); });
  }
  window.addEventListener('resize', function () {
    document.querySelectorAll('#scr-atelier .talent-tree').forEach(function (box) { drawTreeLines(box, box.style.getPropertyValue('--bc')); });
  });

  UI.showSuspects = function (back) {
    var a = App();
    var s = UI.screen('scr-suspects');
    var head = el('div', 'screen-head');
    head.appendChild(el('div', ''));
    head.appendChild(el('h2', '', 'Fichier des suspects'));
    head.appendChild(closeBtn(back || UI.showTitle));
    s.appendChild(head);
    var f = el('div', 'frame shop');
    f.style.marginTop = 'calc(var(--u) * 56)';
    var html = '<h3>Les voleurs</h3><div class="cards">';
    PT.ENEMY_ORDER.forEach(function (t) {
      var d = PT.ENEMIES[t];
      if (a.save.seen[t]) html += card(A.enemyIcon(t), d.name, d.desc + (d.innocent ? '' : ' Résistance ' + d.hp + ', vitesse ' + d.speed + '.'));
      else html += '<div class="card locked"><img alt="" src="' + A.enemyIcon(t) + '" style="filter:brightness(0) opacity(0.8)"><div><b>???</b><small>Pas encore croisé.</small></div></div>';
    });
    html += '</div><h3>Vos défenses</h3><div class="cards">';
    var reach = a.maxUnlockedId();
    PT.TOWER_ORDER.forEach(function (t) {
      var d = PT.TOWERS[t];
      if (d.unlock <= reach) html += card(A.towerIcon(t, 2), d.name, d.desc + ' Prix : ' + d.cost + '.');
      else html += '<div class="card locked"><img alt="" src="' + A.towerIcon(t) + '" style="filter:grayscale(1)"><div><b>' + esc(d.name) + '</b><small>Débloquée à la salle ' + d.unlock + '.</small></div></div>';
    });
    html += '</div><h3>Vos pouvoirs</h3><div class="cards">';
    PT.POWER_ORDER.forEach(function (p) {
      var d = PT.POWERS[p];
      if (d.unlock <= reach) html += card(A.powerIcon(p), d.name, d.desc + ' Recharge : ' + d.cd + ' s.');
      else html += '<div class="card locked"><img alt="" src="' + A.powerIcon(p) + '" style="filter:grayscale(1)"><div><b>' + esc(d.name) + '</b><small>Débloqué à la salle ' + d.unlock + '.</small></div></div>';
    });
    html += '</div><h3>Synergies</h3><div class="cards">';
    // Une synergie s'affiche dès que toutes ses défenses sont débloquées
    PT.SYNERGIES.forEach(function (sy) {
      var open = sy.towers.every(function (t) { return PT.TOWERS[t].unlock <= reach; });
      var icon = A.towerIcon(sy.towers[sy.towers.length - 1], 1);
      if (open) html += card(icon, sy.name, sy.desc + ' (' + sy.towers.map(function (t) { return PT.TOWERS[t].name; }).join(' + ') + ')');
      else html += '<div class="card locked"><img alt="" src="' + icon + '" style="filter:grayscale(1)"><div><b>' + esc(sy.name) + '</b><small>Débloquez d’abord : ' + esc(sy.towers.map(function (t) { return PT.TOWERS[t].name; }).join(' + ')) + '.</small></div></div>';
    });
    html += '</div>';
    f.innerHTML = html;
    s.appendChild(f);
  };

  /* ---------- Options ---------- */
  UI.showOptions = function (back, confirmReset) {
    var a = App();
    var s = UI.screen('scr-options');
    s.innerHTML = '<div class="frame" style="width:min(100%, calc(var(--u) * 520))"><h2>Options</h2>' +
      toggleRow('p-music', 'Musique', a.save.music) + toggleRow('p-sfx', 'Effets sonores', a.save.sfx) +
      '<div class="toggle"><span>Plein écran</span><button class="btn small ghost" id="o-full">Basculer</button></div>' +
      '<div class="toggle"><span>Progression</span>' + (confirmReset ? '<span><button class="btn small ghost" id="o-no">Non</button> <button class="btn small red" id="o-yes">Tout effacer</button></span>' : '<button class="btn small ghost" id="o-reset">Effacer</button>') + '</div>' +
      (confirmReset ? '<p class="confirm-line">Les étoiles, améliorations et suspects découverts seront effacés.</p>' : '') +
      '<p style="margin-top:12px;font-size:calc(var(--u) * 14)">Raccourcis clavier : <b>Espace</b> vague suivante, <b>1</b> à <b>4</b> pouvoirs, <b>V</b> vitesse, <b>Échap</b> pause.</p>' +
      '<div class="actions"><button class="btn" id="o-back">Retour</button></div></div>';
    s.querySelector('.frame').appendChild(closeBtn(back || UI.showTitle)).classList.add('in-frame');
    bindToggles();
    click($('o-full'), function () { a.toggleFullscreen(); });
    click($('o-back'), back || UI.showTitle);
    if ($('o-reset')) click($('o-reset'), function () { UI.showOptions(back, true); });
    if ($('o-no')) click($('o-no'), function () { UI.showOptions(back); });
    if ($('o-yes')) click($('o-yes'), function () { a.resetSave(); UI.showOptions(back); });
  };

  /* ================= HUD ================= */
  var hudCache = {};
  UI.hudInit = function (game) {
    $('hud').hidden = false;
    document.querySelectorAll('[data-icon="vase"]').forEach(function (i) { i.src = A.vaseIcon(); });
    document.querySelectorAll('[data-icon="coin"]').forEach(function (i) { i.src = A.coinIcon(); });
    var pw = $('powers');
    pw.innerHTML = '';
    PT.POWER_ORDER.forEach(function (id, k) {
      if (!game.powers[id]) return;
      var b = el('button', 'power', '<img alt="" src="' + A.powerIcon(id) + '"><span class="cd"></span><span class="key">' + (k + 1) + '</span>');
      b.setAttribute('aria-label', PT.POWERS[id].name);
      b.dataset.power = id;
      b.addEventListener('click', function (ev) { ev.stopPropagation(); PT.Audio.unlock(); App().triggerPower(id); });
      pw.appendChild(b);
    });
    hudCache = {};
    $('boss-bar').hidden = true;
    $('taunt').hidden = true;
    UI.closeRadial();
    UI.updateSpeed(1);
  };
  UI.hudHide = function () { $('hud').hidden = true; UI.closeRadial(); UI.stopAim(); };

  UI.updateSpeed = function (s) { $('btn-speed').textContent = 'x' + s; };

  UI.updateHud = function (g) {
    var c = hudCache;
    if (c.lives !== g.lives) {
      if (c.lives != null && g.lives < c.lives) { var p = $('hud-lives'); p.classList.remove('hurt'); void p.offsetWidth; p.classList.add('hurt'); }
      c.lives = g.lives; $('hud-lives').querySelector('span').textContent = g.lives;
    }
    var coins = Math.floor(g.coins);
    if (c.coins !== coins) {
      if (c.coins != null && coins > c.coins) { var q = $('hud-coins'); q.classList.remove('gain'); void q.offsetWidth; q.classList.add('gain'); }
      c.coins = coins; $('hud-coins').querySelector('span').textContent = coins;
      if (UI.radialKind) UI.refreshRadialAfford(g);
    }
    var wv = Math.max(0, g.waveIndex + 1) + '/' + g.totalWaves();
    if (c.wave !== wv) { c.wave = wv; $('hud-wave').innerHTML = 'Vague <b>' + Math.max(0, g.waveIndex + 1) + '</b>/' + g.totalWaves(); }

    // Bouton de vague
    var wb = $('btn-wave'), info = g.nextWaveInfo();
    var key;
    if (!info || g.state === 'won' || g.state === 'lost') key = 'none';
    else if (!g.canCallWave()) key = 'busy';
    else key = 'call' + info.index + (g.waveIndex < 0 ? 'first' : '') + '|' + g.earlyBonus();
    if (c.waveKey !== key) {
      c.waveKey = key;
      if (key === 'none') wb.hidden = true;
      else if (key === 'busy') {
        wb.hidden = false; wb.className = 'wave-btn busy';
        wb.innerHTML = '<span class="play" style="opacity:.5"></span>Vague en cours…';
      } else {
        wb.hidden = false;
        wb.className = 'wave-btn' + (g.waveIndex < 0 ? ' pulse' : '');
        var types = info.types.filter(function (t) { return t !== 'touriste' || info.types.length === 1; }).slice(0, 4)
          .map(function (t) { return '<img alt="" src="' + A.enemyIcon(t) + '">'; }).join('');
        var bonus = g.earlyBonus();
        wb.innerHTML = '<span class="play"><span class="ring"></span></span>' + (g.waveIndex < 0 ? 'Lancer la vague 1' : 'Vague ' + (info.index + 1)) +
          '<span class="types">' + types + '</span>' + (bonus > 0 ? '<span class="bonus">+' + bonus + '</span>' : '');
      }
    }
    if (key.indexOf('call') === 0 && g.countdown != null) {
      var max = g.level.waves[g.waveIndex + 1] && g.level.waves[g.waveIndex + 1].crew ? 24 : 16;
      var ring = wb.querySelector('.ring');
      if (ring) ring.style.setProperty('--p', Math.round((1 - g.countdown / max) * 100));
    }

    // Pouvoirs
    $('powers').querySelectorAll('.power').forEach(function (b) {
      var id = b.dataset.power, p = g.powers[id];
      var pct = p.cd > 0 && p.max ? Math.round(p.cd / p.max * 100) : 0;
      var k = 'pw' + id;
      if (c[k] !== pct) { c[k] = pct; b.querySelector('.cd').style.setProperty('--p', pct); b.classList.toggle('ready', pct === 0); }
      b.classList.toggle('active', UI.aiming === id);
    });

    // Un bouton de pouvoir devient transparent quand un voleur passe juste dessous (pas toute la barre)
    var rd = App().renderer, pts = [];
    for (var e2 = 0; e2 < g.enemies.length; e2++) { var en = g.enemies[e2]; if (en.alive) pts.push(rd.toScreen(en.x, en.y - 25)); }
    $('powers').querySelectorAll('.power').forEach(function (b) {
      var pr = b.getBoundingClientRect(), under = false;
      for (var q = 0; q < pts.length && !under; q++) if (pts[q].x > pr.left - 10 && pts[q].x < pr.right + 10 && pts[q].y > pr.top - 20 && pts[q].y < pr.bottom + 6) under = true;
      if (b._under !== under) { b._under = under; b.classList.toggle('see-through', under); }
    });

    // Boss
    var boss = null;
    for (var i = 0; i < g.enemies.length; i++) if (g.enemies[i].def.boss) { boss = g.enemies[i]; break; }
    $('boss-bar').hidden = !boss;
    if (boss) $('boss-bar').querySelector('i').style.width = Math.max(0, boss.hp / boss.maxHp * 100) + '%';

    // Petit coaching pour la première salle
    if (g.level.id === 1 && !UI.radialKind && !UI.aiming) {
      var msg = null;
      if (g.towers.length === 0) msg = '<h4>Posez votre première défense</h4><p>Touchez un socle <b>+</b> près du tapis rouge, choisissez le Gardien, puis touchez-le encore pour confirmer.</p>';
      else if (g.waveIndex < 0) msg = '<h4>Prêt ?</h4><p>Lancez la vague avec le bouton rouge en haut. Les voleurs vont vers le trésor puis repartent par la porte : attrapez-les avant !</p>';
      if (c.coach !== msg) { c.coach = msg; if (msg) UI.showTip(msg); else UI.hideTip(); }
    } else if (c.coach) { c.coach = null; if (!UI.radialKind) UI.hideTip(); }
  };

  /* ---------- Toasts et bulles ---------- */
  UI.toast = function (text, sub) {
    var t = $('toast');
    t.innerHTML = esc(text) + (sub ? '<small>' + esc(sub) + '</small>' : '');
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  };
  var tauntTimer = null;
  UI.hideTaunt = function () { clearTimeout(tauntTimer); $('taunt').hidden = true; };
  UI.taunt = function (text) {
    var t = $('taunt');
    t.querySelector('img').src = A.portrait('gentleman');
    t.querySelector('p').innerHTML = '<b>LE GENTLEMAN</b>' + esc(text);
    t.hidden = false;
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(tauntTimer);
    tauntTimer = setTimeout(function () { t.hidden = true; }, 5200);
  };
  document.addEventListener('DOMContentLoaded', function () {
    $('taunt').addEventListener('click', function (ev) { ev.stopPropagation(); $('taunt').hidden = true; });
  });

  // Quand un menu radial est ouvert, l'infobulle se place du côté opposé pour ne pas le cacher
  UI.showTip = function (html) {
    var t = $('tip'); t.innerHTML = html; t.hidden = false;
    t.style.left = ''; t.style.top = ''; t.style.bottom = '';
    var cx = UI.radialCx, cy = UI.radialCy;
    if (cx == null) return;
    // L'infobulle se place à côté du menu radial s'il y a la place, sinon au-dessus ou en dessous
    var tw = t.offsetWidth || 300, vw = window.innerWidth, vh = window.innerHeight, rad = (UI.radialR || 90) + 40;
    var right = cx + rad + tw + 8 <= vw, left = cx - rad - tw - 8 >= 0;
    if (right || left) {
      t.style.left = (right && (cx < vw / 2 || !left) ? cx + rad + tw / 2 : cx - rad - tw / 2) + 'px';
      var th = t.offsetHeight || 120, u0 = App().u;
      t.style.top = Math.max(50 * u0, Math.min(vh - th - 8, cy - th / 2)) + 'px';
    } else if (cy < vh / 2) {
      t.style.top = 'auto'; t.style.bottom = 'calc(var(--u) * 100)';
    }
  };
  UI.hideTip = function () { $('tip').hidden = true; };

  /* ================= Menu radial ================= */
  function statLine(type, st, next) {
    var out = [], d = PT.TOWERS[type];
    function f(label, a, b, unit, mul) {
      mul = mul || 1; unit = unit || '';
      var va = Math.round(a * mul * 10) / 10, vb = b != null ? Math.round(b * mul * 10) / 10 : null;
      var fr = function (v) { return String(v).replace('.', ','); };
      out.push('<span>' + label + ' ' + fr(va) + unit + (vb != null && vb !== va ? ' <b class="up">→ ' + fr(vb) + unit + '</b>' : '') + '</span>');
    }
    if (st.dmg != null) f(d.splash || st.splash ? 'Dégâts zone' : 'Dégâts', st.dmg, next && next.dmg);
    if (st.dps != null) f('Dégâts/s', st.dps, next && next.dps);
    if (st.rate != null) f('Cadence', st.rate, next && next.rate, '/s');
    if (st.slow != null) f('Ralentit', st.slow, next && next.slow, ' %', 100);
    if (st.stun != null) f('Immobilise', st.stun, next && next.stun, ' s');
    if (st.mark != null) f('Bonus dégâts', st.mark, next && next.mark, ' %', 100);
    if (st.push != null) f('Recul', st.push, next && next.push);
    if (st.wet != null) f('Mouille', st.wet, next && next.wet, ' s');
    if (st.buff != null && d.commander) f('Renfort', st.buff, next && next.buff, ' %', 100);
    if (st.chefBuff && !d.commander) out.push('<span class="up">Chef : +' + Math.round(st.chefBuff * 100) + ' %</span>');
    if (st.patrol) out.push('<span class="up">Patrouille : +' + Math.round(st.patrol * 100) + ' % cadence</span>');
    f('Portée', st.range, next && next.range);
    return '<div class="stats">' + out.join('') + '</div>';
  }
  function statsFor(g, type, level, at) { return g.towerStats({ type: type, level: level, x: at && at.x, y: at && at.y, id: at && at.id }); }
  function synergiesOf(type) {
    var list = PT.SYNERGIES.filter(function (s) { return s.towers.indexOf(type) >= 0; });
    if (!list.length) return '';
    return '<div class="syn">' + list.map(function (s) { return '<span><b>' + esc(s.name) + '</b> ' + esc(s.desc) + '</span>'; }).join('') + '</div>';
  }

  UI.closeRadial = function () {
    var r = $('radial');
    r.hidden = true; r.innerHTML = '';
    UI.radialKind = null; UI.radialSel = null; UI.radialCx = null;
    UI.selectedSpot = null; UI.selectedTower = null; UI.preview = null;
    UI.hideTip();
    if (hudCache) hudCache.coach = undefined;
  };

  function layoutRadial(cx, cy, n, radius) {
    var vw = window.innerWidth, vh = window.innerHeight, m = radius + 44;
    cx = Math.max(m, Math.min(vw - m, cx));
    cy = Math.max(m * 0.9, Math.min(vh - m * 0.8, cy));
    var pos = [];
    for (var i = 0; i < n; i++) {
      var a = n === 1 ? -Math.PI / 2 : n === 2 ? (i ? Math.PI / 2 : -Math.PI / 2) : -Math.PI / 2 + i * (Math.PI * 2 / n);
      pos.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius });
    }
    return { cx: cx, cy: cy, pos: pos };
  }

  UI.openBuild = function (spot) {
    var a = App(), g = a.game, r = $('radial');
    UI.closeRadial();
    UI.selectedSpot = spot;
    UI.radialKind = 'build';
    var types = g.availableTowers;
    var u = a.u, radius = Math.max(82, 13.5 * types.length) * u; // le cercle grandit avec le nombre de défenses
    var sp = a.renderer.toScreen(spot.x, spot.y - 24);
    var L = layoutRadial(sp.x, sp.y, types.length, radius);
    UI.radialCx = L.cx; UI.radialCy = L.cy; UI.radialR = radius;
    r.innerHTML = '';
    var ring = el('div', 'ring-bg');
    ring.style.cssText = 'left:' + (L.cx - radius) + 'px;top:' + (L.cy - radius) + 'px;width:' + radius * 2 + 'px;height:' + radius * 2 + 'px';
    r.appendChild(ring);
    types.forEach(function (t, i) {
      var d = PT.TOWERS[t], cost = g.towerCost(t);
      var b = el('button', 'r-item', '<img alt="" src="' + A.towerIcon(t, 0, true) + '"><span class="price"><img alt="" src="' + A.coinIcon() + '" style="width:1em;height:1em;margin:0">' + cost + '</span>');
      b.dataset.type = t; b.dataset.cost = cost;
      b.setAttribute('aria-label', d.name + ', ' + cost + ' pièces');
      b.style.left = L.pos[i].x + 'px'; b.style.top = L.pos[i].y + 'px';
      b.style.animationDelay = (i * 0.025) + 's';
      b.addEventListener('click', function (ev) {
        ev.stopPropagation(); PT.Audio.unlock();
        if (UI.radialSel === t) {
          if (g.build(spot, t)) { UI.closeRadial(); }
          else { PT.Audio.play('error'); UI.toast('Pas assez de pièces', 'Il en faut ' + cost); }
          return;
        }
        PT.Audio.play('click');
        UI.radialSel = t;
        r.querySelectorAll('.r-item').forEach(function (x) { x.classList.toggle('sel', x === b); });
        var st = statsFor(g, t, 0, { x: spot.x, y: spot.y, id: -1 });
        UI.preview = { x: spot.x, y: spot.y - 10, range: st.range, ok: g.coins >= cost };
        UI.showTip('<h4>' + esc(d.name) + ' · ' + cost + ' pièces</h4><p>' + esc(d.desc) + '</p>' + statLine(t, st) + synergiesOf(t) +
          '<div class="hint">' + (g.coins >= cost ? 'Touchez à nouveau pour construire.' : 'Pas encore assez de pièces.') + '</div>');
      });
      r.appendChild(b);
    });
    r.hidden = false;
    UI.refreshRadialAfford(g);
  };

  UI.refreshRadialAfford = function (g) {
    $('radial').querySelectorAll('.r-item[data-cost]').forEach(function (b) { b.classList.toggle('poor', g.coins < +b.dataset.cost); });
  };

  UI.openTower = function (tower) {
    var a = App(), g = a.game, r = $('radial');
    UI.closeRadial();
    UI.selectedTower = tower;
    UI.radialKind = 'tower';
    var d = PT.TOWERS[tower.type], st = g.towerStats(tower), cost = g.upgradeCost(tower), sell = g.sellValue(tower);
    var specs = tower.level === 1 && PT.SPECS[tower.type];
    UI.preview = { x: tower.x, y: tower.y - 10, range: st.range };
    var u = a.u, radius = (specs ? 80 : 70) * u;
    var sp = a.renderer.toScreen(tower.x, tower.y - 30);
    var L = layoutRadial(sp.x, sp.y, specs ? 3 : 2, radius);
    UI.radialCx = L.cx; UI.radialCy = L.cy; UI.radialR = radius;
    r.innerHTML = '';
    var coin = '<img alt="" src="' + A.coinIcon() + '" style="width:1em;height:1em;margin:0">';
    var items = [];
    function select(btn, key) { UI.radialSel = key; items.forEach(function (x) { x.classList.toggle('sel', x === btn); }); }
    function upItem(spec, pos) {
      var b = el('button', 'r-item' + (cost == null ? ' max' : '') + (spec ? ' spec' : ''));
      if (cost == null) b.innerHTML = '<span class="lbl">MAX</span>';
      else {
        b.innerHTML = '<img alt="" src="' + A.towerIcon(tower.type, tower.level + 1, true) + '">' + (spec ? '<span class="spec-name" style="background:' + specs[spec].color + '">' + esc(specs[spec].name) + '</span>' : '') +
          '<span class="price">' + coin + cost + '</span>';
        b.dataset.cost = cost;
      }
      b.setAttribute('aria-label', cost == null ? 'Niveau maximum' : (spec ? specs[spec].name + ', ' : 'Améliorer, ') + cost + ' pièces');
      b.style.left = pos.x + 'px'; b.style.top = pos.y + 'px';
      b.addEventListener('click', function (ev) {
        ev.stopPropagation(); PT.Audio.unlock();
        if (cost == null) { PT.Audio.play('error'); return; }
        var key = 'up' + (spec || '');
        if (UI.radialSel === key) {
          if (g.upgrade(tower, spec)) UI.openTower(tower);
          else { PT.Audio.play('error'); UI.toast('Pas assez de pièces', 'Il en faut ' + cost); }
          return;
        }
        PT.Audio.play('click');
        select(b, key);
        var nx = g.towerStats({ type: tower.type, level: tower.level + 1, spec: spec, x: tower.x, y: tower.y, id: tower.id });
        UI.preview = { x: tower.x, y: tower.y - 10, range: nx.range, ok: g.coins >= cost };
        UI.showTip(spec ? '<h4>' + esc(specs[spec].name) + ' · ' + cost + ' pièces</h4><p>' + esc(specs[spec].desc) + '</p>' + statLine(tower.type, st, nx) +
            '<div class="hint">Choix définitif pour cette défense. Touchez à nouveau pour confirmer.</div>'
          : '<h4>Améliorer : niveau ' + (tower.level + 2) + ' · ' + cost + ' pièces</h4>' + statLine(tower.type, st, nx) + '<div class="hint">Touchez à nouveau pour confirmer.</div>');
      });
      items.push(b); r.appendChild(b);
    }
    if (specs) { upItem('a', L.pos[0]); upItem('b', L.pos[1]); } else upItem(null, L.pos[0]);
    var slPos = L.pos[specs ? 2 : 1];
    var sl = el('button', 'r-item sell', '<span class="lbl">Vendre</span><span class="price">' + coin + '+' + sell + '</span>');
    sl.setAttribute('aria-label', 'Vendre pour ' + sell + ' pièces');
    sl.style.left = slPos.x + 'px'; sl.style.top = slPos.y + 'px';
    r.appendChild(sl); items.push(sl);
    r.hidden = false;
    var spName = tower.spec && PT.SPECS[tower.type] ? ' · ' + PT.SPECS[tower.type][tower.spec].name : '';
    UI.showTip('<h4>' + esc(d.name) + esc(spName) + ' · niveau ' + (tower.level + 1) + '/3</h4>' + statLine(tower.type, st) + synergiesOf(tower.type) +
      '<div class="hint">' + (specs ? 'Niveau 3 : choisissez une spécialisation.' : 'Touchez l’amélioration ou la vente.') + '</div>');
    sl.addEventListener('click', function (ev) {
      ev.stopPropagation(); PT.Audio.unlock();
      if (UI.radialSel === 'sell') { g.sell(tower); UI.closeRadial(); return; }
      PT.Audio.play('click');
      select(sl, 'sell');
      UI.preview = { x: tower.x, y: tower.y - 10, range: st.range };
      UI.showTip('<h4>Vendre pour ' + sell + ' pièces ?</h4><p>Touchez à nouveau pour confirmer la vente.</p>');
    });
    UI.refreshRadialAfford(g);
  };

  /* ---------- Visée du buste ---------- */
  UI.startAim = function (id) {
    UI.closeRadial();
    UI.aiming = id;
    UI.showTip('<h4>' + esc(PT.POWERS[id].name) + '</h4><p>Touchez la carte là où le buste doit tomber.</p>');
  };
  UI.stopAim = function () { UI.aiming = null; UI.aim = null; UI.hideTip(); };
})(globalThis.PT = globalThis.PT || {});
