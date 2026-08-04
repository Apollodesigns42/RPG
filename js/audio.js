/* ============================================================
   audio.js  --  Chiptune-Musik & Soundeffekte (WebAudio, ohne Assets)
   ============================================================ */
(function (global) {
  'use strict';

  var ctx = null, master = null, musicGain = null, sfxGain = null;
  var enabled = true, ready = false;
  var current = null, timer = null, noiseBuf = null;

  var NOTES = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

  function freq(name) {
    if (!name || name === '-') return 0;
    var m = /^([a-gA-G])([#b]?)(-?\d)$/.exec(name);
    if (!m) return 0;
    var n = NOTES[m[1].toLowerCase()];
    if (m[2] === '#') n++; else if (m[2] === 'b') n--;
    var oct = parseInt(m[3], 10);
    var midi = (oct + 1) * 12 + n;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /** 'c4 e4 g4:2 -' -> [{f, len}] */
  function parseSeq(str) {
    return str.trim().split(/\s+/).map(function (tok) {
      var p = tok.split(':');
      return { f: freq(p[0]), len: p[1] ? parseFloat(p[1]) : 1 };
    });
  }

  /* ---------- Songs ---------- */
  /* wave: 'square'|'triangle'|'sawtooth'|'noise', vol, duty via detune  */

  var SONGS = {
    title: {
      bpm: 96,
      tracks: [
        { wave: 'triangle', vol: .22, seq:
          'a4:2 e5:2 d5:1 c5:1 b4:2 a4:2 g4:2 a4:4 -:2 ' +
          'a4:2 e5:2 f5:1 e5:1 d5:2 c5:2 b4:2 a4:4 -:2' },
        { wave: 'square', vol: .10, seq:
          'a2:4 a2:4 f2:4 f2:4 c3:4 c3:4 e2:4 e2:4 ' +
          'a2:4 a2:4 f2:4 f2:4 g2:4 g2:4 a2:4 a2:4' }
      ]
    },
    world: {
      bpm: 132,
      tracks: [
        { wave: 'square', vol: .16, seq:
          'e5:1 d5:1 c5:1 d5:1 e5:1 e5:1 e5:2 d5:1 d5:1 d5:2 e5:1 g5:1 g5:2 ' +
          'e5:1 d5:1 c5:1 d5:1 e5:1 e5:1 e5:1 e5:1 d5:1 d5:1 e5:1 d5:1 c5:4 ' +
          'g5:1 f5:1 e5:1 f5:1 g5:2 g5:2 a5:1 g5:1 f5:1 e5:1 d5:4 ' +
          'e5:1 d5:1 c5:1 d5:1 e5:2 g5:2 e5:1 d5:1 c5:2 c5:4' },
        { wave: 'triangle', vol: .18, seq:
          'c3:2 g3:2 c3:2 g3:2 g2:2 d3:2 g2:2 d3:2 ' +
          'a2:2 e3:2 a2:2 e3:2 f2:2 c3:2 g2:2 g3:2 ' +
          'c3:2 g3:2 c3:2 g3:2 f2:2 c3:2 f2:2 c3:2 ' +
          'a2:2 e3:2 g2:2 d3:2 c3:2 g3:2 c3:4' }
      ]
    },
    town: {
      bpm: 108,
      tracks: [
        { wave: 'square', vol: .14, seq:
          'g4:1 a4:1 b4:2 d5:2 b4:1 a4:1 g4:4 ' +
          'e4:1 g4:1 a4:2 b4:2 a4:1 g4:1 a4:4 ' +
          'b4:1 d5:1 e5:2 d5:2 b4:1 a4:1 b4:4 ' +
          'g4:1 a4:1 b4:2 a4:2 g4:1 e4:1 g4:4' },
        { wave: 'triangle', vol: .16, seq:
          'g2:2 d3:2 g2:2 d3:2 c3:2 g3:2 c3:2 g3:2 ' +
          'e3:2 b3:2 e3:2 b3:2 d3:2 a3:2 d3:2 a3:2 ' +
          'g2:2 d3:2 g2:2 d3:2 c3:2 g3:2 c3:2 g3:2 ' +
          'a2:2 e3:2 d3:2 a3:2 g2:2 d3:2 g2:4' }
      ]
    },
    dungeon: {
      bpm: 90,
      tracks: [
        { wave: 'square', vol: .11, seq:
          'd4:2 eb4:2 d4:2 a4:2 g4:2 f4:2 e4:4 ' +
          'd4:2 eb4:2 f4:2 g4:2 a4:4 bb4:4 ' +
          'a4:2 g4:2 f4:2 e4:2 d4:8' },
        { wave: 'triangle', vol: .20, seq:
          'd2:4 d2:4 bb1:4 bb1:4 g1:4 g1:4 a1:4 a1:4 ' +
          'd2:4 d2:4 f2:4 f2:4 a1:8' }
      ]
    },
    battle: {
      bpm: 168,
      tracks: [
        { wave: 'square', vol: .15, seq:
          'a4:1 a4:1 c5:1 a4:1 e5:2 d5:1 c5:1 b4:2 a4:2 ' +
          'a4:1 a4:1 c5:1 a4:1 g5:2 f5:1 e5:1 d5:2 c5:2 ' +
          'f5:1 e5:1 d5:1 c5:1 b4:2 c5:2 d5:1 e5:1 f5:1 g5:1 a5:4' },
        { wave: 'triangle', vol: .18, seq:
          'a1:1 a1:1 a1:1 a1:1 a1:1 a1:1 a1:1 a1:1 ' +
          'f1:1 f1:1 f1:1 f1:1 g1:1 g1:1 g1:1 g1:1 ' +
          'a1:1 a1:1 a1:1 a1:1 c2:1 c2:1 c2:1 c2:1 ' +
          'd2:1 d2:1 d2:1 d2:1 e2:1 e2:1 e2:1 e2:1' },
        { wave: 'noise', vol: .05, seq: 'c1:1 -:1 c1:1 -:1' }
      ]
    },
    boss: {
      bpm: 152,
      tracks: [
        { wave: 'square', vol: .15, seq:
          'd4:1 d4:1 eb4:1 d4:1 bb4:2 a4:2 d4:1 d4:1 eb4:1 f4:1 g4:2 a4:2 ' +
          'bb4:1 a4:1 g4:1 f4:1 e4:2 d4:2 c5:2 bb4:2 a4:4 ' +
          'd5:1 c5:1 bb4:1 a4:1 g4:2 f4:2 e4:2 d4:2 d4:4' },
        { wave: 'sawtooth', vol: .09, seq:
          'd2:1 d2:1 d2:1 d2:1 d2:1 d2:1 eb2:1 e2:1 ' +
          'f2:1 f2:1 f2:1 f2:1 g2:1 g2:1 a2:1 bb2:1 ' +
          'd2:1 d2:1 d2:1 d2:1 c2:1 c2:1 bb1:1 a1:1 ' +
          'd2:2 a2:2 d3:2 a2:2' },
        { wave: 'noise', vol: .06, seq: 'c1:1 c1:1 -:1 c1:1' }
      ]
    },
    victory: {
      bpm: 150, once: true,
      tracks: [
        { wave: 'square', vol: .18, seq:
          'c5:.5 c5:.5 c5:.5 c5:2 ab4:2 bb4:2 c5:1 -:.5 bb4:.5 c5:4' },
        { wave: 'triangle', vol: .18, seq:
          'c3:.5 c3:.5 c3:.5 c3:2 ab2:2 bb2:2 c3:1 -:.5 bb2:.5 c3:4' }
      ]
    },
    ending: {
      bpm: 84,
      tracks: [
        { wave: 'triangle', vol: .22, seq:
          'c5:2 e5:2 g5:4 f5:2 e5:2 d5:4 c5:2 d5:2 e5:2 f5:2 g5:6 -:2 ' +
          'a4:2 c5:2 e5:4 d5:2 c5:2 b4:4 c5:8' },
        { wave: 'square', vol: .09, seq:
          'c3:4 g3:4 f3:4 c3:4 a2:4 e3:4 f3:4 g3:4 ' +
          'a2:4 e3:4 g2:4 d3:4 c3:8' }
      ]
    },
    gameover: {
      bpm: 70, once: true,
      tracks: [
        { wave: 'triangle', vol: .2, seq: 'a4:2 g4:2 f4:2 e4:2 d4:4 a3:6' },
        { wave: 'square', vol: .08, seq: 'a2:4 f2:4 d2:4 a1:6' }
      ]
    }
  };

  /* ---------- Engine ---------- */

  function ensure() {
    if (ctx) return true;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = .8; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 1; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 1; sfxGain.connect(master);
    var len = ctx.sampleRate * 1;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    ready = true;
    return true;
  }

  function playNote(track, note, t, beat) {
    if (!note.f) return;
    var dur = note.len * beat;
    var g = ctx.createGain();
    g.connect(musicGain);
    var v = track.vol;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.012);
    g.gain.setValueAtTime(v, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur * 0.98);

    var src;
    if (track.wave === 'noise') {
      src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      var flt = ctx.createBiquadFilter();
      flt.type = 'bandpass'; flt.frequency.value = 1400; flt.Q.value = 1.2;
      src.connect(flt); flt.connect(g);
    } else {
      src = ctx.createOscillator();
      src.type = track.wave;
      src.frequency.setValueAtTime(note.f, t);
      src.connect(g);
    }
    src.start(t);
    src.stop(t + dur);
  }

  function schedule() {
    if (!current) return;
    var song = current.song, beat = 60 / song.bpm;
    var horizon = ctx.currentTime + 1.2;
    var loopSec = current.lenBeats * beat;
    var done = true;

    for (var i = 0; i < current.tracks.length; i++) {
      var tr = current.tracks[i], guard = 0;
      while (current.start + tr.time < horizon && guard++ < 400) {
        if (tr.i >= tr.seq.length) {
          if (song.once) break;
          tr.i = 0; tr.pass++;
          tr.time = tr.pass * loopSec;      // Spuren synchron halten
          continue;
        }
        var note = tr.seq[tr.i];
        playNote(tr.def, note, current.start + tr.time, beat);
        tr.time += note.len * beat;
        tr.i++;
        done = false;
      }
      if (!song.once || tr.i < tr.seq.length) done = false;
    }

    if (song.once && done && ctx.currentTime > current.start + current.maxTime) {
      current = null;
      if (timer) { clearInterval(timer); timer = null; }
    }
  }

  var Audio2 = {
    get enabled() { return enabled; },

    unlock: function () {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
    },

    toggle: function () {
      enabled = !enabled;
      if (!enabled) Audio2.stop();
      else if (Audio2.pending) Audio2.play(Audio2.pending);
      return enabled;
    },

    play: function (id, force) {
      Audio2.pending = id;
      if (!enabled || !SONGS[id]) return;
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (current && current.id === id && !force) return;
      Audio2.stopMusic();
      var song = SONGS[id];
      var lenBeats = 0;
      var tracks = song.tracks.map(function (t) {
        var seq = parseSeq(t.seq), sum = 0;
        seq.forEach(function (n) { sum += n.len; });
        lenBeats = Math.max(lenBeats, sum);
        return { def: t, seq: seq, i: 0, pass: 0, time: 0 };
      });
      current = {
        id: id, song: song, start: ctx.currentTime + 0.06,
        lenBeats: lenBeats, maxTime: lenBeats * (60 / song.bpm), tracks: tracks
      };
      if (timer) clearInterval(timer);
      timer = setInterval(schedule, 250);
      schedule();
    },

    stopMusic: function () {
      current = null;
      if (timer) { clearInterval(timer); timer = null; }
      if (musicGain && ctx) {
        musicGain.gain.cancelScheduledValues(ctx.currentTime);
        musicGain.gain.setValueAtTime(0.0001, ctx.currentTime);
        musicGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.12);
      }
    },

    stop: function () { Audio2.stopMusic(); },

    /** Kurzer Effektton. */
    sfx: function (name) {
      if (!enabled || !ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      var t = ctx.currentTime;
      switch (name) {
        case 'cursor':  blip('square', 620, 780, t, .05, .10); break;
        case 'confirm': blip('square', 700, 1180, t, .09, .13); break;
        case 'cancel':  blip('square', 460, 260, t, .09, .11); break;
        case 'error':   blip('sawtooth', 180, 120, t, .16, .12); break;
        case 'hit':     noise(t, .13, .22, 900, 240); break;
        case 'crit':    noise(t, .2, .3, 1800, 300); blip('square', 900, 200, t, .16, .12); break;
        case 'guard':   noise(t, .1, .14, 2600, 1400); break;
        case 'miss':    blip('sine', 900, 400, t, .1, .07); break;
        case 'heal':    arp(['c5', 'e5', 'g5', 'c6'], t, .07, .12, 'triangle'); break;
        case 'magic':   arp(['e5', 'a5', 'c6', 'e6'], t, .05, .11, 'square'); break;
        case 'fire':    noise(t, .34, .2, 700, 120); blip('sawtooth', 320, 90, t, .3, .1); break;
        case 'ice':     arp(['a5', 'e6', 'a6'], t, .05, .10, 'sine'); noise(t + .05, .2, .1, 5200, 3800); break;
        case 'thunder': noise(t, .28, .28, 3400, 400); blip('square', 1400, 160, t, .2, .1); break;
        case 'wind':    noise(t, .4, .14, 500, 2600); break;
        case 'quake':   noise(t, .5, .3, 120, 60); break;
        case 'dark':    blip('sawtooth', 200, 60, t, .45, .14); break;
        case 'holy':    arp(['g5', 'b5', 'd6', 'g6'], t, .08, .12, 'triangle'); break;
        case 'item':    arp(['c5', 'g5'], t, .07, .12, 'square'); break;
        case 'gold':    arp(['e6', 'a6', 'e6', 'a6'], t, .04, .09, 'square'); break;
        case 'chest':   arp(['c5', 'e5', 'g5', 'c6', 'e6'], t, .06, .12, 'square'); break;
        case 'door':    noise(t, .18, .12, 400, 180); break;
        case 'levelup': arp(['c5', 'e5', 'g5', 'c6', 'g5', 'c6'], t, .08, .14, 'square'); break;
        case 'encounter': blip('square', 200, 1600, t, .28, .14); noise(t, .3, .12, 2000, 400); break;
        case 'flee':    blip('square', 1200, 300, t, .22, .1); break;
        case 'down':    blip('sawtooth', 400, 60, t, .5, .13); break;
        case 'step':    noise(t, .04, .05, 800, 500); break;
      }
    }
  };

  function blip(wave, f0, f1, t, dur, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + dur + .02);
  }

  function noise(t, dur, vol, f0, f1) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = .9;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxGain);
    s.start(t); s.stop(t + dur + .02);
  }

  function arp(notes, t, step, vol, wave) {
    for (var i = 0; i < notes.length; i++) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = wave || 'square';
      o.frequency.value = freq(notes[i]);
      var st = t + i * step;
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(vol, st + .01);
      g.gain.exponentialRampToValueAtTime(.0008, st + step * 1.9);
      o.connect(g); g.connect(sfxGain);
      o.start(st); o.stop(st + step * 2);
    }
  }

  global.Sound = Audio2;
})(window);
