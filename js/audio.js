/* Pas Touche ! — sons et musique synthétisés avec la Web Audio API (aucun fichier audio). */
(function (PT) {
  'use strict';

  var Au = PT.Audio = {
    ctx: null, musicOn: true, sfxOn: true, current: null, step: 0, nextTime: 0, timer: null, last: {},
  };
  var ctx, master, sfxBus, musicBus, noiseBuf, humOsc, humGain;

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  Au.init = function () {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    Au.ctx = ctx;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = 0.9;
    master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = Au.sfxOn ? 0.55 : 0; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = Au.musicOn ? 0.26 : 0; musicBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    humGain = ctx.createGain(); humGain.gain.value = 0; humGain.connect(sfxBus);
    humOsc = ctx.createOscillator(); humOsc.type = 'sawtooth'; humOsc.frequency.value = 110;
    var hf = ctx.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 700;
    humOsc.connect(hf); hf.connect(humGain); humOsc.start();
    Au.timer = setInterval(schedule, 30);
    return true;
  };

  Au.unlock = function () {
    if (!Au.init()) return;
    if (ctx.state === 'suspended') ctx.resume();
  };

  Au.setMusic = function (on) {
    Au.musicOn = on;
    if (musicBus) musicBus.gain.setTargetAtTime(on ? 0.26 : 0, ctx.currentTime, 0.1);
  };
  Au.setSfx = function (on) {
    Au.sfxOn = on;
    if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.05);
  };
  Au.setHum = function (on) {
    if (!humGain) return;
    humGain.gain.setTargetAtTime(on ? 0.05 : 0, ctx.currentTime, 0.06);
    if (on) humOsc.frequency.setTargetAtTime(105 + Math.random() * 15, ctx.currentTime, 0.05);
  };

  /* ---------- Briques sonores ---------- */
  function tone(f, dur, o) {
    o = o || {};
    var t = o.at || ctx.currentTime;
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
    if (o.vib) {
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = o.vib; lg.gain.value = o.vibDepth || f * 0.03;
      lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + dur + 0.05);
    }
    var vol = o.vol == null ? 0.3 : o.vol, att = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var node = osc;
    if (o.filter) {
      var f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.filter; f2.Q.value = o.q || 1;
      osc.connect(f2); node = f2;
    }
    node.connect(g); g.connect(o.dest || sfxBus);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  function noise(dur, o) {
    o = o || {};
    var t = o.at || ctx.currentTime;
    var src = ctx.createBufferSource(); src.buffer = noiseBuf;
    var f = ctx.createBiquadFilter(); f.type = o.ftype || 'bandpass'; f.frequency.setValueAtTime(o.freq || 1000, t); f.Q.value = o.q || 1;
    if (o.slide) f.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    var g = ctx.createGain(), vol = o.vol == null ? 0.3 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.dest || sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  /* ---------- Effets sonores ---------- */
  var THROTTLE = { hit: 0.05, throw: 0.06, splat: 0.08, bite: 0.07, coin: 0.05, catch: 0.04, ticket: 0.1, net: 0.08, reveal: 0.1, leap: 0.15, shoot: 0.05, clang: 0.09, shatter: 0.06, mirror: 0.2, blast: 0.08, cannon: 0.1 };

  Au.play = function (name) {
    if (!ctx || !Au.sfxOn) return;
    var now = ctx.currentTime;
    var th = THROTTLE[name];
    if (th && Au.last[name] && now - Au.last[name] < th) return;
    Au.last[name] = now;
    var t = now;
    switch (name) {
      case 'click': tone(700, 0.06, { vol: 0.15, slide: 1000 }); break;
      case 'error': tone(220, 0.12, { vol: 0.18, type: 'square', slide: 160 }); tone(180, 0.14, { vol: 0.14, at: t + 0.09, slide: 120 }); break;
      case 'build':
        tone(180, 0.14, { type: 'sine', vol: 0.5, slide: 70 }); noise(0.12, { freq: 400, vol: 0.25 });
        tone(660, 0.08, { type: 'triangle', vol: 0.18, at: t + 0.08 }); tone(990, 0.12, { type: 'triangle', vol: 0.18, at: t + 0.14 });
        break;
      case 'upgrade': [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.14, { type: 'triangle', vol: 0.22, at: t + i * 0.06 }); }); break;
      case 'sell': [988, 784, 659].forEach(function (f, i) { tone(f, 0.1, { type: 'triangle', vol: 0.2, at: t + i * 0.05 }); }); break;
      case 'throw': noise(0.12, { freq: 900, slide: 2400, vol: 0.12, q: 2 }); break;
      case 'glu': tone(260, 0.14, { type: 'sine', vol: 0.25, slide: 120 }); break;
      case 'splat': tone(160, 0.12, { type: 'sine', vol: 0.3, slide: 60 }); noise(0.1, { freq: 500, vol: 0.18, ftype: 'lowpass' }); break;
      case 'bite': tone(120, 0.12, { type: 'sawtooth', vol: 0.2, vib: 30, vibDepth: 30, filter: 900 }); noise(0.05, { freq: 3000, vol: 0.2, at: t + 0.06 }); break;
      case 'net': noise(0.22, { freq: 600, slide: 200, vol: 0.28, q: 0.7 }); tone(140, 0.18, { type: 'sine', vol: 0.25, slide: 90 }); break;
      case 'laser': tone(1400, 0.18, { type: 'sawtooth', vol: 0.12, slide: 400, filter: 3000 }); break;
      case 'hit': tone(900 + Math.random() * 300, 0.04, { type: 'square', vol: 0.06, filter: 2500 }); break;
      case 'catch':
        tone(330, 0.16, { type: 'sine', vol: 0.3, slide: 700 });
        tone(1318, 0.09, { type: 'triangle', vol: 0.15, at: t + 0.1 }); tone(1760, 0.14, { type: 'triangle', vol: 0.15, at: t + 0.16 });
        break;
      case 'coin': case 'ticket': tone(1318, 0.06, { type: 'triangle', vol: 0.12 }); tone(1976, 0.1, { type: 'triangle', vol: 0.12, at: t + 0.05 }); break;
      case 'escape':
        tone(392, 0.25, { type: 'sawtooth', vol: 0.2, filter: 1200, vib: 6 });
        tone(370, 0.25, { type: 'sawtooth', vol: 0.2, filter: 1200, at: t + 0.25, vib: 6 });
        tone(349, 0.5, { type: 'sawtooth', vol: 0.2, filter: 1000, at: t + 0.5, vib: 5, slide: 300 });
        break;
      case 'grab': for (var i = 0; i < 3; i++) tone(1046, 0.08, { type: 'square', vol: 0.12, at: t + i * 0.12 }); break;
      case 'reveal': tone(880, 0.08, { type: 'triangle', vol: 0.2 }); tone(1320, 0.14, { type: 'triangle', vol: 0.2, at: t + 0.07 }); break;
      case 'emp': tone(90, 0.35, { type: 'sawtooth', vol: 0.25, slide: 40, filter: 800 }); noise(0.3, { freq: 2500, vol: 0.12, slide: 400 }); break;
      case 'leap': tone(300, 0.18, { type: 'sine', vol: 0.18, slide: 900 }); break;
      case 'whistle': tone(2300, 0.5, { type: 'sine', vol: 0.18, vib: 28, vibDepth: 120 }); break;
      case 'bustFall': tone(1600, 0.6, { type: 'sine', vol: 0.12, slide: 300 }); break;
      case 'boom': tone(110, 0.5, { type: 'sine', vol: 0.6, slide: 40 }); noise(0.45, { freq: 300, vol: 0.4, ftype: 'lowpass' }); break;
      case 'alarm': for (var k = 0; k < 6; k++) tone(k % 2 ? 660 : 880, 0.22, { type: 'square', vol: 0.1, filter: 2000, at: t + k * 0.22 }); break;
      case 'cafe': noise(0.25, { freq: 1500, slide: 600, vol: 0.15, q: 3 }); [784, 988, 1175].forEach(function (f, i) { tone(f, 0.12, { type: 'triangle', vol: 0.15, at: t + 0.2 + i * 0.07 }); }); break;
      case 'smoke': noise(0.6, { freq: 800, slide: 200, vol: 0.2, q: 0.5 }); break;
      case 'summon': tone(220, 0.1, { type: 'square', vol: 0.12 }); tone(330, 0.1, { type: 'square', vol: 0.12, at: t + 0.1 }); tone(440, 0.16, { type: 'square', vol: 0.12, at: t + 0.2 }); break;
      case 'boss': [41, 44, 47].forEach(function (n, i) { tone(midi(n), 1.2, { type: 'sawtooth', vol: 0.18, filter: 600, attack: 0.05, at: t + i * 0.05 }); }); tone(midi(29), 1.4, { type: 'sine', vol: 0.4 }); break;
      case 'star': tone(1046, 0.12, { type: 'triangle', vol: 0.25 }); tone(1568, 0.25, { type: 'triangle', vol: 0.2, at: t + 0.06 }); break;
      case 'win': [60, 64, 67, 72, 76, 79, 84].forEach(function (n, i) { tone(midi(n), i === 6 ? 0.6 : 0.16, { type: 'triangle', vol: 0.22, at: t + i * 0.09 }); }); break;
      case 'lose': [67, 66, 65, 64].forEach(function (n, i) { tone(midi(n), i === 3 ? 0.8 : 0.3, { type: 'sawtooth', vol: 0.16, filter: 1100, vib: 5, at: t + i * 0.3 }); }); break;
      case 'unlock': [72, 76, 79, 84, 88].forEach(function (n, i) { tone(midi(n), 0.2, { type: 'sine', vol: 0.2, at: t + i * 0.07 }); }); break;
      case 'gust': noise(0.4, { freq: 400, slide: 1800, vol: 0.2, q: 0.6 }); break;
      case 'heal': [880, 1108, 1318].forEach(function (f, i) { tone(f, 0.12, { type: 'sine', vol: 0.12, at: t + i * 0.06 }); }); break;
      case 'burrow': noise(0.3, { freq: 250, slide: 120, vol: 0.25, ftype: 'lowpass' }); break;
      case 'cannon': tone(70, 0.35, { type: 'sine', vol: 0.5, slide: 35 }); noise(0.3, { freq: 500, slide: 120, vol: 0.35, ftype: 'lowpass' }); break;
      case 'blast': noise(0.28, { freq: 700, slide: 150, vol: 0.3, ftype: 'lowpass' }); tone(90, 0.22, { type: 'sine', vol: 0.3, slide: 45 }); break;
      case 'clang': tone(1850 + Math.random() * 300, 0.16, { type: 'triangle', vol: 0.12 }); tone(2790, 0.1, { type: 'sine', vol: 0.06 }); break;
      case 'shatter': for (var g = 0; g < 4; g++) tone(2400 + Math.random() * 1600, 0.06, { type: 'triangle', vol: 0.07, at: t + g * 0.025 }); noise(0.12, { freq: 5000, vol: 0.08 }); break;
      case 'mirror': [1046, 1318, 1568, 2093].forEach(function (f, i) { tone(f, 0.12, { type: 'sine', vol: 0.09, at: t + i * 0.05 }); }); break;
      case 'lock': tone(180, 0.12, { type: 'square', vol: 0.18, filter: 900 }); noise(0.1, { freq: 1800, vol: 0.2, at: t + 0.08 }); tone(120, 0.2, { type: 'square', vol: 0.16, filter: 700, at: t + 0.14 }); break;
      case 'unlock': tone(520, 0.08, { type: 'triangle', vol: 0.14 }); tone(780, 0.12, { type: 'triangle', vol: 0.14, at: t + 0.07 }); break;
      case 'page': noise(0.12, { freq: 3000, slide: 1200, vol: 0.12, q: 0.6 }); break;
    }
  };

  /* ---------- Musique (séquenceur maison) ---------- */
  var TRACKS = {
    menu: {
      tempo: 92, swing: 0.32,
      chords: [[57, 60, 64, 67], [50, 54, 57, 60], [55, 59, 62, 66], [52, 56, 59, 62]],
      bass: [[45, 48, 52, 50], [50, 54, 57, 52], [43, 47, 50, 51], [40, 44, 47, 44]],
      play: function (s, t, sd) {
        var bar = ((s / 16) | 0) % 4, st = s % 16;
        if (st % 4 === 0) tone(midi(this.bass[bar][st / 4]), sd * 3.6, { type: 'triangle', vol: 0.5, filter: 600, dest: musicBus, at: t });
        if (st === 0 || st === 6) this.chords[bar].forEach(function (n) { tone(midi(n + 12), sd * (st ? 3 : 5), { type: 'sine', vol: 0.09, vib: 5, vibDepth: 2, attack: 0.01, dest: musicBus, at: t }); });
        if (st % 2 === 0) noise(sd * 1.2, { freq: 6000, vol: st % 4 === 0 ? 0.05 : 0.08, ftype: 'highpass', dest: musicBus, at: t });
        if (st === 4 || st === 12) noise(sd * 2, { freq: 2500, vol: 0.06, q: 0.6, dest: musicBus, at: t });
      },
    },
    game: {
      tempo: 112, swing: 0.12,
      bass: [40, 0, 0, 40, 43, 0, 45, 0, 46, 47, 0, 0, 50, 0, 47, 0, 40, 0, 0, 40, 43, 0, 45, 0, 46, 0, 45, 0, 43, 0, 42, 0],
      lead: { 16: [64, 2], 19: [67, 1], 22: [70, 3], 26: [71, 4], 48: [71, 2], 51: [69, 2], 54: [67, 2], 56: [64, 6] },
      play: function (s, t, sd) {
        var st = s % 32, b = this.bass[st];
        if (b) tone(midi(b), sd * 1.6, { type: 'square', vol: 0.22, filter: 520, q: 4, dest: musicBus, at: t });
        if (s % 2 === 0) noise(sd * 0.8, { freq: 7000, vol: s % 4 === 0 ? 0.04 : 0.07, ftype: 'highpass', dest: musicBus, at: t });
        if (s % 16 === 4 || s % 16 === 12) noise(0.06, { freq: 2200, vol: 0.22, q: 3, dest: musicBus, at: t });
        if (s % 16 === 0) tone(60, 0.18, { type: 'sine', vol: 0.4, slide: 40, dest: musicBus, at: t });
        var phrase = (s / 64 | 0) % 2, ls = s % 64, l = this.lead[ls];
        if (l && phrase === 1) tone(midi(l[0]), sd * l[1], { type: 'square', vol: 0.08, filter: 1400, vib: 5, vibDepth: 4, attack: 0.02, dest: musicBus, at: t });
      },
    },
    heist: {
      tempo: 126, swing: 0,
      bass: [38, 0, 38, 0, 41, 0, 38, 0, 44, 0, 43, 0, 41, 0, 40, 0],
      pads: [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]],
      play: function (s, t, sd) {
        var st = s % 16, bar = ((s / 16) | 0) % 4, b = this.bass[st];
        if (b) tone(midi(b + (bar === 3 ? 7 : bar === 1 ? -4 : 0)), sd * 1.4, { type: 'sawtooth', vol: 0.2, filter: 480, q: 5, dest: musicBus, at: t });
        if (st === 0) this.pads[bar].forEach(function (n) { tone(midi(n + 12), sd * 15, { type: 'sawtooth', vol: 0.035, filter: 1200, attack: 0.3, dest: musicBus, at: t }); });
        if (st === 0 || st === 8 || st === 10) tone(62, 0.2, { type: 'sine', vol: 0.5, slide: 38, dest: musicBus, at: t });
        if (st === 4 || st === 12) noise(0.12, { freq: 1800, vol: 0.2, q: 0.8, dest: musicBus, at: t });
        noise(sd * 0.5, { freq: 8000, vol: st % 2 ? 0.03 : 0.06, ftype: 'highpass', dest: musicBus, at: t });
      },
    },
  };

  Au.music = function (name) {
    if (Au.current === name) return;
    Au.current = name;
    Au.step = 0;
    if (ctx) Au.nextTime = ctx.currentTime + 0.1;
  };

  function schedule() {
    if (!ctx || !Au.current || ctx.state !== 'running') return;
    var tr = TRACKS[Au.current];
    if (!tr) return;
    var sd = 60 / tr.tempo / 4;
    if (Au.nextTime < ctx.currentTime - 0.2) Au.nextTime = ctx.currentTime + 0.05;
    while (Au.nextTime < ctx.currentTime + 0.15) {
      var swing = (Au.step % 4 === 2) ? tr.swing * sd : 0;
      if (Au.musicOn) tr.play(Au.step, Au.nextTime + swing, sd);
      Au.nextTime += sd;
      Au.step++;
    }
  }
})(globalThis.PT = globalThis.PT || {});
