/* ============================================================
   ui.js  --  Fenster, Dialoge, Menüs, Balken (FF-Optik)
   ============================================================ */
(function (global) {
  'use strict';

  var UI = { stack: [], toast: null, time: 0 };

  var COL = {
    bg1: '#101a4a', bg2: '#1c2c74', edge: '#eaf0ff', edge2: '#5f7ad0',
    text: '#ffffff', shadow: '#000814', dim: '#9aa6c8', sel: '#ffe45c',
    hp: '#4ad86a', hpLow: '#e8c43a', hpCrit: '#e05050', mp: '#5aa8ff',
    xp: '#c07aff', dark: '#050a1a'
  };
  UI.COL = COL;

  /* ---------- Grundelemente ---------- */

  UI.panel = function (x, y, w, h) {
    var c = GFX.ctx;
    // Füllung mit Verlauf
    for (var i = 0; i < h; i++) {
      var t = i / Math.max(1, h - 1);
      var r = Math.round(16 + t * 12), g = Math.round(26 + t * 18), b = Math.round(74 + t * 42);
      GFX.rect(x, y + i, w, 1, 'rgb(' + r + ',' + g + ',' + b + ')');
    }
    GFX.frame(x, y, w, h, COL.edge2);
    GFX.frame(x + 1, y + 1, w - 2, h - 2, COL.edge);
    // Ecken abrunden
    GFX.rect(x, y, 1, 1, COL.dark); GFX.rect(x + w - 1, y, 1, 1, COL.dark);
    GFX.rect(x, y + h - 1, 1, 1, COL.dark); GFX.rect(x + w - 1, y + h - 1, 1, 1, COL.dark);
  };

  UI.text = function (s, x, y, color) {
    Font.draw(GFX.ctx, s, x, y, color || COL.text, COL.shadow);
  };
  UI.textC = function (s, cx, y, color) {
    Font.drawCentered(GFX.ctx, s, cx, y, color || COL.text, COL.shadow);
  };
  UI.textR = function (s, rx, y, color) {
    Font.drawRight(GFX.ctx, s, rx, y, color || COL.text, COL.shadow);
  };

  UI.cursor = function (x, y) {
    var blink = (UI.time % .8) < .55;
    if (!blink) return;
    var c = COL.sel;
    GFX.rect(x, y, 1, 7, c);
    GFX.rect(x + 1, y + 1, 1, 5, c);
    GFX.rect(x + 2, y + 2, 1, 3, c);
    GFX.rect(x + 3, y + 3, 1, 1, c);
  };

  UI.bar = function (x, y, w, h, val, max, color, bgColor) {
    GFX.rect(x, y, w, h, bgColor || '#0b1030');
    GFX.frame(x, y, w, h, '#33407a');
    var f = Math.max(0, Math.min(1, max > 0 ? val / max : 0));
    var iw = Math.round((w - 2) * f);
    if (iw > 0) {
      GFX.rect(x + 1, y + 1, iw, h - 2, color);
      GFX.rect(x + 1, y + 1, iw, 1, lighten(color));
    }
  };

  function lighten(hex) {
    if (hex.charAt(0) !== '#') return hex;
    var n = parseInt(hex.slice(1), 16);
    var r = Math.min(255, ((n >> 16) & 255) + 60);
    var g = Math.min(255, ((n >> 8) & 255) + 60);
    var b = Math.min(255, (n & 255) + 60);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  UI.lighten = lighten;

  UI.hpColor = function (hp, max) {
    var f = max > 0 ? hp / max : 0;
    return f <= .2 ? COL.hpCrit : (f <= .45 ? COL.hpLow : COL.hp);
  };

  /* ---------- Modal-Stack ---------- */

  UI.push = function (modal) { UI.stack.push(modal); return modal; };
  UI.pop = function () { return UI.stack.pop(); };
  UI.top = function () { return UI.stack[UI.stack.length - 1] || null; };
  UI.busy = function () { return UI.stack.length > 0; };
  UI.clear = function () { UI.stack.length = 0; };

  UI.update = function (dt) {
    UI.time += dt;
    var t = UI.top();
    if (t && t.update) t.update(dt);
    if (UI.toast) {
      UI.toast.t -= dt;
      if (UI.toast.t <= 0) UI.toast = null;
    }
  };

  UI.draw = function () {
    for (var i = 0; i < UI.stack.length; i++) if (UI.stack[i].draw) UI.stack[i].draw();
    if (UI.toast) drawToast();
  };

  UI.key = function (k) {
    var t = UI.top();
    if (t && t.key) { t.key(k); return true; }
    return false;
  };

  /* ---------- Toast ---------- */

  UI.notice = function (text, dur) {
    UI.toast = { text: text, t: dur || 1.8 };
  };

  function drawToast() {
    var w = Font.width(UI.toast.text) + 14;
    var x = Math.round((GFX.VW - w) / 2), y = 12;
    UI.panel(x, y, w, 15);
    UI.textC(UI.toast.text, GFX.VW / 2, y + 4, COL.sel);
  }

  /* ---------- Dialogfenster ---------- */

  var CHARS_PER_SEC = 60;

  UI.say = function (lines, onDone, opts) {
    opts = opts || {};
    if (typeof lines === 'string') lines = [lines];
    var pages = [];
    var maxW = GFX.VW - 34;
    var buf = [];
    lines.forEach(function (l) {
      if (l === '') { buf.push(''); return; }
      Font.wrap(l, maxW).forEach(function (w) { buf.push(w); });
    });
    for (var i = 0; i < buf.length; i += 3) pages.push(buf.slice(i, i + 3));
    if (!pages.length) pages.push(['']);

    var modal = {
      pages: pages, page: 0, chars: 0, done: false, speaker: opts.speaker || null,
      update: function (dt) {
        var total = pages[modal.page].join(' ').length;
        if (modal.chars < total) {
          modal.chars += CHARS_PER_SEC * dt;
          if (modal.chars >= total) { modal.chars = total; modal.done = true; }
        } else modal.done = true;
      },
      key: function (k) {
        if (k !== 'confirm' && k !== 'cancel') return;
        if (!modal.done) {
          modal.chars = 9999; modal.done = true;
          return;
        }
        Sound.sfx('cursor');
        modal.page++;
        modal.chars = 0; modal.done = false;
        if (modal.page >= pages.length) {
          UI.pop();
          if (onDone) onDone();
        }
      },
      draw: function () {
        var h = 52, y = GFX.VW ? GFX.VH - h - 6 : 0, x = 8, w = GFX.VW - 16;
        UI.panel(x, y, w, h);
        if (modal.speaker) {
          var sw = Font.width(modal.speaker) + 10;
          UI.panel(x + 4, y - 11, sw, 14);
          UI.text(modal.speaker, x + 9, y - 7, COL.sel);
        }
        var lines = pages[modal.page];
        var budget = Math.floor(modal.chars);
        var ly = y + 8;
        for (var i = 0; i < lines.length; i++) {
          var s = lines[i];
          var shown = s;
          if (budget < s.length) shown = s.slice(0, Math.max(0, budget));
          budget -= s.length;
          UI.text(shown, x + 10, ly, COL.text);
          ly += 12;
          if (budget <= 0) break;
        }
        if (modal.done) {
          var ay = y + h - 9 + (Math.sin(UI.time * 6) > 0 ? 0 : 1);
          var ax = x + w - 12;
          GFX.rect(ax, ay, 5, 1, COL.sel);
          GFX.rect(ax + 1, ay + 1, 3, 1, COL.sel);
          GFX.rect(ax + 2, ay + 2, 1, 1, COL.sel);
        }
      }
    };
    return UI.push(modal);
  };

  /* ---------- Listenmenü ---------- */

  /**
   * cfg: { x,y,w, rows, cols, title, items:[{label,right,color,disabled,data}],
   *        onSelect(item,i), onCancel(), onMove(item,i), footer, cancelable,
   *        index, itemH, drawItem(item,x,y,sel) }
   */
  UI.menu = function (cfg) {
    var itemH = cfg.itemH || 12;
    var cols = cfg.cols || 1;
    var rows = cfg.rows || Math.ceil(cfg.items.length / cols) || 1;
    var pad = 6;
    var titleH = cfg.title ? 13 : 0;
    var footH = cfg.footer ? 12 : 0;
    var w = cfg.w || 120;
    var h = titleH + rows * itemH + pad * 2 + footH;

    var modal = {
      cfg: cfg, index: cfg.index || 0, scroll: 0,
      setItems: function (items) { cfg.items = items; if (modal.index >= items.length) modal.index = Math.max(0, items.length - 1); },
      key: function (k) {
        var n = cfg.items.length;
        if (!n) { if (k === 'cancel' || k === 'menu') doCancel(); return; }
        var i = modal.index;
        if (k === 'up')    { i -= cols; if (i < 0) i = clampWrap(modal.index, n, cols, -1); Sound.sfx('cursor'); }
        else if (k === 'down')  { i += cols; if (i >= n) i = clampWrap(modal.index, n, cols, 1); Sound.sfx('cursor'); }
        else if (k === 'left')  { if (cols > 1) { i--; if (i < 0) i = n - 1; Sound.sfx('cursor'); } else { i -= rows; if (i < 0) i = modal.index; } }
        else if (k === 'right') { if (cols > 1) { i++; if (i >= n) i = 0; Sound.sfx('cursor'); } else { i += rows; if (i >= n) i = modal.index; } }
        else if (k === 'confirm') {
          var it = cfg.items[modal.index];
          if (!it || it.disabled) { Sound.sfx('error'); return; }
          Sound.sfx('confirm');
          if (cfg.onSelect) cfg.onSelect(it, modal.index, modal);
          return;
        } else if (k === 'cancel' || k === 'menu') { doCancel(); return; }
        if (i !== modal.index) {
          modal.index = i;
          ensureVisible();
          if (cfg.onMove) cfg.onMove(cfg.items[i], i);
        }
        return;

        function doCancel() {
          if (cfg.cancelable === false) { Sound.sfx('error'); return; }
          Sound.sfx('cancel');
          if (cfg.onCancel) cfg.onCancel(); else UI.pop();
        }
      },
      draw: function () {
        var x = cfg.x, y = cfg.y;
        UI.panel(x, y, w, h);
        if (cfg.title) {
          UI.text(cfg.title, x + 8, y + 4, COL.sel);
          GFX.rect(x + 5, y + 13, w - 10, 1, COL.edge2);
        }
        var ox = x + 12, oy = y + pad + titleH;
        var colW = Math.floor((w - 18) / cols);
        var start = modal.scroll * cols;
        for (var vi = 0; vi < rows * cols; vi++) {
          var idx = start + vi;
          if (idx >= cfg.items.length) break;
          var it = cfg.items[idx];
          var cx = ox + (vi % cols) * colW;
          var cy = oy + Math.floor(vi / cols) * itemH;
          var sel = idx === modal.index;
          if (sel) UI.cursor(cx - 8, cy);
          if (cfg.drawItem) cfg.drawItem(it, cx, cy, sel, colW);
          else {
            var col = it.disabled ? '#6d7594' : (it.color || COL.text);
            UI.text(it.label, cx, cy, col);
            if (it.right != null) UI.textR(String(it.right), cx + colW - 8, cy, it.rightColor || col);
          }
        }
        // Scrollpfeile
        if (modal.scroll > 0) UI.text('▲'.replace('▲', '^'), x + w - 12, y + titleH + 4, COL.sel);
        if ((modal.scroll + rows) * cols < cfg.items.length) UI.text('v', x + w - 12, y + h - footH - 10, COL.sel);
        if (cfg.footer) {
          GFX.rect(x + 5, y + h - footH - 2, w - 10, 1, COL.edge2);
          var f = typeof cfg.footer === 'function' ? cfg.footer(cfg.items[modal.index], modal.index) : cfg.footer;
          UI.text(f || '', x + 8, y + h - footH + 2, COL.dim);
        }
      }
    };

    function clampWrap(cur, n, cols, dir) {
      // in derselben Spalte an das andere Ende springen
      var col = cur % cols;
      if (dir < 0) {
        var last = col;
        while (last + cols < n) last += cols;
        return last;
      }
      return col;
    }

    function ensureVisible() {
      var row = Math.floor(modal.index / cols);
      if (row < modal.scroll) modal.scroll = row;
      if (row >= modal.scroll + rows) modal.scroll = row - rows + 1;
    }

    modal.h = h; modal.w = w;
    return UI.push(modal);
  };

  /* ---------- Ja/Nein ---------- */

  UI.confirm = function (text, onYes, onNo, opts) {
    opts = opts || {};
    var w = Math.max(120, Font.width(text) + 24);
    var x = opts.x != null ? opts.x : Math.round((GFX.VW - w) / 2);
    var y = opts.y != null ? opts.y : 78;
    var modal = {
      index: opts.defaultNo ? 1 : 0,
      key: function (k) {
        if (k === 'left' || k === 'up') { modal.index = 0; Sound.sfx('cursor'); }
        else if (k === 'right' || k === 'down') { modal.index = 1; Sound.sfx('cursor'); }
        else if (k === 'confirm') {
          Sound.sfx(modal.index === 0 ? 'confirm' : 'cancel');
          UI.pop();
          if (modal.index === 0) { if (onYes) onYes(); } else if (onNo) onNo();
        } else if (k === 'cancel') {
          Sound.sfx('cancel'); UI.pop(); if (onNo) onNo();
        }
      },
      draw: function () {
        var h = 40;
        UI.panel(x, y, w, h);
        UI.textC(text, x + w / 2, y + 8, COL.text);
        var jx = x + w / 2 - 34, ny = y + 24;
        UI.text('Ja', jx, ny, modal.index === 0 ? COL.sel : COL.dim);
        UI.text('Nein', jx + 44, ny, modal.index === 1 ? COL.sel : COL.dim);
        UI.cursor(modal.index === 0 ? jx - 8 : jx + 36, ny);
      }
    };
    return UI.push(modal);
  };

  /* ---------- Statuszeile Gruppe (für Menüs) ---------- */

  UI.partyRow = function (a, x, y, w, showXp) {
    UI.text(a.name, x, y, a.hp > 0 ? COL.text : '#e05050');
    UI.text('L' + a.lvl, x + w - 26, y, COL.dim);
    UI.text('KP', x, y + 11, COL.dim);
    UI.text(a.hp + '/' + a.maxhp, x + 16, y + 11, UI.hpColor(a.hp, a.maxhp));
    UI.bar(x + w - 62, y + 12, 58, 5, a.hp, a.maxhp, UI.hpColor(a.hp, a.maxhp));
    UI.text('MP', x, y + 21, COL.dim);
    UI.text(a.mp + '/' + a.maxmp, x + 16, y + 21, COL.mp);
    UI.bar(x + w - 62, y + 22, 58, 5, a.mp, a.maxmp, COL.mp);
    if (showXp) {
      var need = Data.xpToNext(a.lvl);
      UI.text('EXP', x, y + 31, COL.dim);
      UI.bar(x + 22, y + 32, w - 26, 4, a.xp, need, COL.xp);
    }
  };

  global.UI = UI;
})(window);
