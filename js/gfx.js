/* ============================================================
   gfx.js  --  Renderer, Sprite-Parser, prozeduraler Tile-Atlas
   ============================================================ */
(function (global) {
  'use strict';

  var VW = 320, VH = 240, TS = 16;

  var GFX = {
    VW: VW, VH: VH, TS: TS,
    canvas: null, ctx: null, scale: 1, shakeX: 0, shakeY: 0
  };

  /* ---------- Initialisierung ---------- */

  GFX.init = function (canvas) {
    GFX.canvas = canvas;
    GFX.ctx = canvas.getContext('2d');
    GFX.resize();
    window.addEventListener('resize', GFX.resize);
    buildTiles();
  };

  GFX.resize = function () {
    var pad = 24;
    var s = Math.min((window.innerWidth - pad) / VW, (window.innerHeight - pad) / VH);
    s = Math.max(1, Math.floor(s));
    GFX.scale = s;
    GFX.canvas.width = VW * s;
    GFX.canvas.height = VH * s;
    GFX.canvas.style.width = (VW * s) + 'px';
    GFX.canvas.style.height = (VH * s) + 'px';
    var c = GFX.ctx;
    c.setTransform(s, 0, 0, s, 0, 0);
    c.imageSmoothingEnabled = false;
  };

  /** Muss vor jedem Frame aufgerufen werden (setzt Transform inkl. Screenshake). */
  GFX.begin = function () {
    var c = GFX.ctx, s = GFX.scale;
    c.setTransform(s, 0, 0, s, Math.round(GFX.shakeX) * s, Math.round(GFX.shakeY) * s);
    c.imageSmoothingEnabled = false;
  };

  GFX.clear = function (color) {
    var c = GFX.ctx;
    c.fillStyle = color || '#000';
    c.fillRect(-8, -8, VW + 16, VH + 16);
  };

  GFX.rect = function (x, y, w, h, color) {
    GFX.ctx.fillStyle = color;
    GFX.ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  };

  GFX.frame = function (x, y, w, h, color) {
    GFX.rect(x, y, w, 1, color);
    GFX.rect(x, y + h - 1, w, 1, color);
    GFX.rect(x, y, 1, h, color);
    GFX.rect(x + w - 1, y, 1, h, color);
  };

  /* ---------- Sprites ---------- */

  /**
   * Erzeugt ein Sprite aus Zeichen-Zeilen + Palette.
   * '.' / ' ' = transparent.
   */
  GFX.sprite = function (rows, palette) {
    var h = rows.length, w = 0, i;
    for (i = 0; i < h; i++) w = Math.max(w, rows[i].length);
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var c = cv.getContext('2d');
    for (var y = 0; y < h; y++) {
      var row = rows[y];
      for (var x = 0; x < row.length; x++) {
        var ch = row.charAt(x);
        if (ch === '.' || ch === ' ') continue;
        var col = palette[ch];
        if (!col) continue;
        c.fillStyle = col;
        c.fillRect(x, y, 1, 1);
      }
    }
    cv.pxw = w; cv.pxh = h;
    return cv;
  };

  /** Faerbt ein Sprite komplett um (Silhouette), z.B. fuer Trefferblitz. */
  GFX.tint = function (spr, color) {
    var cv = document.createElement('canvas');
    cv.width = spr.width; cv.height = spr.height;
    var c = cv.getContext('2d');
    c.drawImage(spr, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = color;
    c.fillRect(0, 0, cv.width, cv.height);
    cv.pxw = spr.width; cv.pxh = spr.height;
    return cv;
  };

  GFX.draw = function (spr, x, y, scale, flip, alpha) {
    if (!spr) return;
    var c = GFX.ctx;
    scale = scale || 1;
    if (alpha != null && alpha < 1) { c.save(); c.globalAlpha = Math.max(0, alpha); }
    var w = spr.width * scale, h = spr.height * scale;
    if (flip) {
      c.save();
      c.translate(Math.round(x) + w, Math.round(y));
      c.scale(-1, 1);
      c.drawImage(spr, 0, 0, w, h);
      c.restore();
    } else {
      c.drawImage(spr, Math.round(x), Math.round(y), w, h);
    }
    if (alpha != null && alpha < 1) c.restore();
  };

  /* ---------- Deterministischer Zufall (fuer Texturen) ---------- */

  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }
  GFX.rng = rng;

  /* ---------- Tile-Definitionen ---------- */

  var TILE = {
    GRASS: 0, TREE: 1, WATER: 2, SHALLOW: 3, MOUNT: 4, HILL: 5, SAND: 6, SNOW: 7,
    ROAD: 8, SWAMP: 9, LAVA: 10, BRIDGE: 11, FLOOR: 12, WALL: 13, DOOR: 14,
    HOUSE: 15, ROOF: 16, CHEST: 17, STAIRS_DOWN: 18, STAIRS_UP: 19, TOWN: 20,
    CAVE: 21, TOWER: 22, RUIN: 23, CASTLE: 24, SIGN: 25, CARPET: 26, COUNTER: 27,
    BED: 28, FLOWER: 29, ICE: 30, ICEWALL: 31, PILLAR: 32, ALTAR: 33,
    DARKFLOOR: 34, DARKWALL: 35, FENCE: 36, VOLCANO: 37, DEADTREE: 38, PALM: 39,
    SNOWTREE: 40, LAVAFLOOR: 41, LAVAWALL: 42, ICEFLOOR: 43, SANDFLOOR: 44,
    SANDWALL: 45, TOWERFLOOR: 46, TOWERWALL: 47, CRYSTAL: 48, EXIT: 49,
    WATERFALL: 50, ROCK: 51, GRAVE: 52, BOOK: 53, POT: 54, WELL: 55, VOID: 56,
    WINDOW: 57, ROOFTOP: 58
  };
  GFX.TILE = TILE;

  // Welche Tiles blockieren die Bewegung?
  var SOLID = {};
  [TILE.TREE, TILE.WATER, TILE.MOUNT, TILE.WALL, TILE.HOUSE, TILE.ROOF,
   TILE.CHEST, TILE.SIGN, TILE.COUNTER, TILE.ICEWALL, TILE.PILLAR, TILE.ALTAR,
   TILE.DARKWALL, TILE.FENCE, TILE.VOLCANO, TILE.DEADTREE, TILE.PALM,
   TILE.SNOWTREE, TILE.LAVA, TILE.LAVAWALL, TILE.SANDWALL, TILE.TOWERWALL,
   TILE.CRYSTAL, TILE.ROCK, TILE.GRAVE, TILE.BOOK, TILE.POT, TILE.WELL,
   TILE.VOID, TILE.WATERFALL, TILE.RUIN, TILE.WINDOW, TILE.ROOFTOP
  ].forEach(function (t) { SOLID[t] = true; });
  GFX.isSolid = function (t) { return !!SOLID[t]; };

  // Tiles, auf denen Zufallskaempfe moeglich sind
  var ENCOUNTER_OK = {};
  [TILE.GRASS, TILE.SAND, TILE.SNOW, TILE.HILL, TILE.SWAMP, TILE.FLOOR,
   TILE.ICE, TILE.DARKFLOOR, TILE.LAVAFLOOR, TILE.ICEFLOOR, TILE.SANDFLOOR,
   TILE.TOWERFLOOR, TILE.SHALLOW].forEach(function (t) { ENCOUNTER_OK[t] = true; });
  GFX.canEncounter = function (t) { return !!ENCOUNTER_OK[t]; };

  /* ---------- Tile-Atlas (prozedural gezeichnet) ---------- */

  var atlas = {};
  GFX.atlas = atlas;

  function tileCanvas(fn, seed) {
    var cv = document.createElement('canvas');
    cv.width = TS; cv.height = TS;
    var c = cv.getContext('2d');
    var r = rng(seed || 1);
    var api = {
      fill: function (col) { c.fillStyle = col; c.fillRect(0, 0, TS, TS); },
      rect: function (x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); },
      px: function (x, y, col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); },
      speckle: function (col, n) {
        c.fillStyle = col;
        for (var i = 0; i < n; i++) c.fillRect((r() * TS) | 0, (r() * TS) | 0, 1, 1);
      },
      dither: function (col, mod, off) {
        c.fillStyle = col;
        for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++)
          if (((x + y * (off || 1)) % mod) === 0) c.fillRect(x, y, 1, 1);
      },
      rnd: r
    };
    fn(api, c);
    return cv;
  }

  function buildTiles() {
    var t = TILE;

    atlas[t.GRASS] = tileCanvas(function (p) {
      p.fill('#2f6d34'); p.dither('#3d8340', 3, 2); p.speckle('#4f9c46', 10);
      p.speckle('#245a2b', 6);
    }, 11);

    atlas[t.FLOWER] = tileCanvas(function (p) {
      p.fill('#2f6d34'); p.dither('#3d8340', 3, 2);
      p.px(4, 5, '#e8d45c'); p.px(5, 4, '#e8d45c'); p.px(5, 6, '#e8d45c'); p.px(6, 5, '#e8d45c');
      p.px(10, 10, '#d96a8f'); p.px(11, 9, '#d96a8f'); p.px(11, 11, '#d96a8f'); p.px(12, 10, '#d96a8f');
    }, 12);

    atlas[t.TREE] = tileCanvas(function (p) {
      p.fill('#2f6d34'); p.dither('#3d8340', 3, 2);
      p.rect(6, 11, 4, 5, '#5b3a1e');
      p.rect(3, 2, 10, 10, '#1f5527');
      p.rect(2, 4, 12, 6, '#1f5527');
      p.rect(4, 3, 8, 3, '#2d7a34');
      p.rect(3, 5, 4, 4, '#37913c');
      p.speckle('#123a19', 12);
    }, 13);

    atlas[t.PALM] = tileCanvas(function (p) {
      p.fill('#c9a86a'); p.speckle('#dbbd82', 14);
      p.rect(7, 7, 2, 9, '#7a5a2e');
      p.rect(2, 4, 12, 2, '#2d7a34');
      p.rect(4, 2, 8, 2, '#37913c');
      p.rect(1, 6, 4, 1, '#1f5527'); p.rect(11, 6, 4, 1, '#1f5527');
    }, 14);

    atlas[t.DEADTREE] = tileCanvas(function (p) {
      p.fill('#4a3b32'); p.speckle('#5a4a3e', 12);
      p.rect(7, 5, 2, 11, '#2b1f18');
      p.rect(3, 4, 4, 1, '#2b1f18'); p.rect(9, 6, 4, 1, '#2b1f18');
      p.rect(3, 2, 1, 3, '#2b1f18'); p.rect(12, 3, 1, 4, '#2b1f18');
    }, 15);

    atlas[t.SNOWTREE] = tileCanvas(function (p) {
      p.fill('#dfe7f2'); p.speckle('#ffffff', 12);
      p.rect(7, 12, 2, 4, '#5b3a1e');
      p.rect(6, 2, 4, 3, '#1d4f38'); p.rect(4, 5, 8, 3, '#1d4f38'); p.rect(3, 8, 10, 4, '#17402d');
      p.rect(6, 2, 2, 1, '#eaf2ff'); p.rect(4, 5, 3, 1, '#eaf2ff'); p.rect(3, 8, 4, 1, '#eaf2ff');
    }, 16);

    atlas[t.WATER] = tileCanvas(function (p) {
      p.fill('#1c3f8f'); p.dither('#2450b0', 4, 3);
      p.rect(2, 4, 5, 1, '#4a7ee0'); p.rect(9, 10, 5, 1, '#4a7ee0');
    }, 17);

    atlas[t.SHALLOW] = tileCanvas(function (p) {
      p.fill('#3a72c9'); p.dither('#5a93e6', 3, 2);
      p.rect(3, 7, 4, 1, '#8ec2f7'); p.rect(10, 3, 4, 1, '#8ec2f7');
    }, 18);

    atlas[t.WATERFALL] = tileCanvas(function (p) {
      p.fill('#3f7fd6');
      for (var x = 0; x < TS; x += 3) p.rect(x, 0, 1, TS, '#a9d4ff');
      p.speckle('#ffffff', 14);
    }, 19);

    atlas[t.MOUNT] = tileCanvas(function (p) {
      p.fill('#2f6d34'); p.dither('#3d8340', 3, 2);
      p.rect(1, 12, 14, 4, '#6b6357');
      p.rect(2, 9, 12, 3, '#7d7466');
      p.rect(4, 6, 8, 3, '#8d8475');
      p.rect(6, 3, 4, 3, '#9c9384');
      p.rect(6, 3, 4, 2, '#e4e6ea');
      p.speckle('#4f4a42', 14);
    }, 20);

    atlas[t.VOLCANO] = tileCanvas(function (p) {
      p.fill('#3a2620');
      p.rect(1, 11, 14, 5, '#4b332a');
      p.rect(3, 7, 10, 4, '#5a3d31');
      p.rect(5, 3, 6, 4, '#6b4a3a');
      p.rect(6, 2, 4, 2, '#e05a1e');
      p.rect(7, 1, 2, 1, '#f2b03a');
      p.speckle('#2a1a14', 12);
    }, 21);

    atlas[t.HILL] = tileCanvas(function (p) {
      p.fill('#2f6d34'); p.dither('#3d8340', 3, 2);
      p.rect(3, 8, 10, 5, '#4e7e3d'); p.rect(5, 6, 6, 3, '#5c8f47');
      p.speckle('#69a052', 10);
    }, 22);

    atlas[t.ROCK] = tileCanvas(function (p) {
      p.fill('#2f6d34'); p.dither('#3d8340', 3, 2);
      p.rect(4, 7, 8, 6, '#7d7466'); p.rect(5, 5, 5, 3, '#8d8475');
      p.speckle('#5c554b', 10);
    }, 23);

    atlas[t.SAND] = tileCanvas(function (p) {
      p.fill('#d8b878'); p.dither('#e6cd93', 4, 3); p.speckle('#c2a063', 10);
    }, 24);

    atlas[t.SNOW] = tileCanvas(function (p) {
      p.fill('#e4ebf5'); p.dither('#f6faff', 4, 3); p.speckle('#c9d6e8', 8);
    }, 25);

    atlas[t.ICE] = tileCanvas(function (p) {
      p.fill('#a8cfe8'); p.dither('#c9e6f7', 4, 3);
      p.rect(2, 3, 6, 1, '#eaf7ff'); p.rect(8, 11, 6, 1, '#eaf7ff');
    }, 26);

    atlas[t.SWAMP] = tileCanvas(function (p) {
      p.fill('#3a4a2c'); p.dither('#4a5c38', 3, 2); p.speckle('#5d7042', 8);
      p.rect(3, 6, 4, 2, '#2a3a22'); p.rect(9, 11, 4, 2, '#2a3a22');
    }, 27);

    atlas[t.ROAD] = tileCanvas(function (p) {
      p.fill('#b39a72'); p.dither('#c7ab80', 4, 3); p.speckle('#9c855f', 10);
    }, 28);

    atlas[t.BRIDGE] = tileCanvas(function (p) {
      p.fill('#8a6134');
      for (var y = 0; y < TS; y += 4) p.rect(0, y, TS, 1, '#5d3f20');
      p.rect(0, 0, 1, TS, '#5d3f20'); p.rect(15, 0, 1, TS, '#5d3f20');
    }, 29);

    atlas[t.LAVA] = tileCanvas(function (p) {
      p.fill('#c8340e'); p.dither('#f07018', 3, 2);
      p.rect(3, 5, 5, 1, '#ffd25a'); p.rect(9, 11, 4, 1, '#ffd25a');
    }, 30);

    /* --- Dungeon --- */
    atlas[t.FLOOR] = tileCanvas(function (p) {
      p.fill('#565064'); p.dither('#635c73', 4, 3); p.speckle('#474153', 10);
      p.rect(0, 0, TS, 1, '#4a4457'); p.rect(0, 0, 1, TS, '#4a4457');
    }, 31);

    atlas[t.WALL] = tileCanvas(function (p) {
      p.fill('#33303f');
      p.rect(0, 0, TS, 7, '#413d50'); p.rect(0, 8, TS, 7, '#3a3648');
      p.rect(0, 7, TS, 1, '#24222e'); p.rect(0, 15, TS, 1, '#24222e');
      p.rect(7, 0, 1, 7, '#24222e'); p.rect(3, 8, 1, 7, '#24222e'); p.rect(11, 8, 1, 7, '#24222e');
      p.speckle('#4d4860', 10);
    }, 32);

    atlas[t.DARKFLOOR] = tileCanvas(function (p) {
      p.fill('#443a68'); p.dither('#514578', 4, 3); p.speckle('#5c4f88', 8);
      p.speckle('#332c52', 10);
      p.rect(0, 0, TS, 1, '#332c50'); p.rect(0, 0, 1, TS, '#332c50');
    }, 33);

    atlas[t.DARKWALL] = tileCanvas(function (p) {
      p.fill('#181328');
      p.rect(0, 0, TS, 7, '#251d3c'); p.rect(0, 8, TS, 7, '#1f1834');
      p.rect(0, 7, TS, 1, '#0e0a18'); p.rect(7, 0, 1, 7, '#0e0a18'); p.rect(3, 8, 1, 7, '#0e0a18');
      p.speckle('#3a2d5c', 8);
    }, 34);

    atlas[t.LAVAFLOOR] = tileCanvas(function (p) {
      p.fill('#7a4630'); p.dither('#8d5539', 4, 3); p.speckle('#9c6242', 10);
      p.speckle('#5f3423', 8);
      p.rect(0, 0, TS, 1, '#5f3423'); p.rect(0, 0, 1, TS, '#5f3423');
      p.px(4, 9, '#e0631c'); p.px(11, 4, '#e0631c');
    }, 35);

    atlas[t.LAVAWALL] = tileCanvas(function (p) {
      p.fill('#2e1a14');
      p.rect(0, 0, TS, 7, '#432521'); p.rect(0, 8, TS, 7, '#3a201b');
      p.rect(0, 7, TS, 1, '#1c0f0b'); p.rect(7, 0, 1, 7, '#1c0f0b'); p.rect(3, 8, 1, 7, '#1c0f0b');
      p.px(2, 3, '#e0631c'); p.px(12, 11, '#e0631c');
    }, 36);

    atlas[t.ICEFLOOR] = tileCanvas(function (p) {
      p.fill('#8fb8d8'); p.dither('#a8cfe8', 4, 3);
      p.rect(0, 0, TS, 1, '#7ea6c8'); p.rect(0, 0, 1, TS, '#7ea6c8');
      p.speckle('#dff0ff', 6);
    }, 37);

    atlas[t.ICEWALL] = tileCanvas(function (p) {
      p.fill('#4f7fa8');
      p.rect(0, 0, TS, 7, '#6796bd'); p.rect(0, 8, TS, 7, '#5b89b0');
      p.rect(0, 7, TS, 1, '#365a7c'); p.rect(7, 0, 1, 7, '#365a7c'); p.rect(3, 8, 1, 7, '#365a7c');
      p.rect(2, 2, 3, 1, '#cfeaff'); p.rect(10, 10, 3, 1, '#cfeaff');
    }, 38);

    atlas[t.SANDFLOOR] = tileCanvas(function (p) {
      p.fill('#a8894f'); p.dither('#bb9c5f', 4, 3); p.speckle('#8f7340', 10);
      p.rect(0, 0, TS, 1, '#8f7340'); p.rect(0, 0, 1, TS, '#8f7340');
    }, 39);

    atlas[t.SANDWALL] = tileCanvas(function (p) {
      p.fill('#6e5a34');
      p.rect(0, 0, TS, 7, '#877044'); p.rect(0, 8, TS, 7, '#7a643c');
      p.rect(0, 7, TS, 1, '#54452a'); p.rect(7, 0, 1, 7, '#54452a'); p.rect(3, 8, 1, 7, '#54452a');
      p.speckle('#9c8250', 8);
    }, 40);

    atlas[t.TOWERFLOOR] = tileCanvas(function (p) {
      p.fill('#5a6a80'); p.dither('#697a92', 4, 3);
      p.rect(0, 0, TS, 1, '#48576b'); p.rect(0, 0, 1, TS, '#48576b');
      p.speckle('#7e90aa', 6);
    }, 41);

    atlas[t.TOWERWALL] = tileCanvas(function (p) {
      p.fill('#38445a');
      p.rect(0, 0, TS, 7, '#46546e'); p.rect(0, 8, TS, 7, '#3f4c64');
      p.rect(0, 7, TS, 1, '#28323f'); p.rect(7, 0, 1, 7, '#28323f'); p.rect(3, 8, 1, 7, '#28323f');
      p.speckle('#55658a', 8);
    }, 42);

    /* --- Objekte --- */
    atlas[t.DOOR] = tileCanvas(function (p) {
      p.fill('#3b3040');
      p.rect(3, 2, 10, 14, '#7a4b23');
      p.rect(4, 3, 8, 12, '#966030');
      p.rect(7, 3, 1, 12, '#6b3f1c');
      p.px(10, 9, '#e8d45c');
    }, 43);

    // Schlichte Hauswand (Putz mit Balken)
    atlas[t.HOUSE] = tileCanvas(function (p) {
      p.fill('#cbb08a'); p.speckle('#b89b74', 14); p.speckle('#dcc59f', 8);
      p.rect(0, 0, TS, 1, '#9c8462');
      p.rect(0, 15, TS, 1, '#8f7757');
    }, 44);

    // Wand mit Fenster
    atlas[t.WINDOW] = tileCanvas(function (p) {
      p.fill('#cbb08a'); p.speckle('#b89b74', 12);
      p.rect(0, 0, TS, 1, '#9c8462'); p.rect(0, 15, TS, 1, '#8f7757');
      p.rect(3, 3, 10, 9, '#6b5233');
      p.rect(4, 4, 8, 7, '#2f4a72');
      p.rect(4, 4, 8, 3, '#4a6f9e');
      p.rect(7, 4, 2, 7, '#6b5233');
      p.rect(4, 7, 8, 1, '#6b5233');
    }, 68);

    // Dachschraege
    atlas[t.ROOF] = tileCanvas(function (p) {
      p.fill('#a03a34');
      for (var y = 0; y < TS; y += 4) {
        p.rect(0, y, TS, 1, '#6e2320');
        p.rect(0, y + 1, TS, 2, '#bb4a42');
      }
      for (var x = 2; x < TS; x += 5) p.rect(x, 0, 1, TS, '#8a2f2a');
    }, 45);

    // Dachfirst (oberste Reihe)
    atlas[t.ROOFTOP] = tileCanvas(function (p) {
      p.fill('#8a2f2a');
      p.rect(0, 0, TS, 3, '#5a1c1a');
      p.rect(0, 3, TS, 3, '#c95a50');
      p.rect(0, 6, TS, 10, '#a03a34');
      for (var y = 8; y < TS; y += 4) { p.rect(0, y, TS, 1, '#6e2320'); }
      for (var x = 2; x < TS; x += 5) p.rect(x, 6, 1, 10, '#8a2f2a');
    }, 69);

    atlas[t.CHEST] = tileCanvas(function (p) {
      p.rect(2, 5, 12, 9, '#8a5a22');
      p.rect(2, 5, 12, 3, '#b07a2e');
      p.rect(2, 8, 12, 1, '#5c3a12');
      p.rect(6, 7, 4, 4, '#e8c45c');
      p.px(7, 9, '#3a2a10'); p.px(8, 9, '#3a2a10');
      p.rect(2, 5, 1, 9, '#5c3a12'); p.rect(13, 5, 1, 9, '#5c3a12'); p.rect(2, 13, 12, 1, '#5c3a12');
    }, 46);

    atlas[t.STAIRS_DOWN] = tileCanvas(function (p) {
      p.fill('#4a4457');
      p.rect(2, 3, 12, 3, '#7d768c'); p.rect(4, 6, 10, 3, '#6b6479');
      p.rect(6, 9, 8, 3, '#585267'); p.rect(8, 12, 6, 3, '#3b3648');
    }, 47);

    atlas[t.STAIRS_UP] = tileCanvas(function (p) {
      p.fill('#4a4457');
      p.rect(2, 12, 12, 3, '#8d8699'); p.rect(2, 9, 10, 3, '#7d768c');
      p.rect(2, 6, 8, 3, '#6b6479'); p.rect(2, 3, 6, 3, '#585267');
    }, 48);

    atlas[t.EXIT] = tileCanvas(function (p) {
      p.fill('#2a2338');
      p.rect(3, 4, 10, 12, '#12101c');
      p.rect(3, 4, 10, 1, '#5c5470'); p.rect(3, 4, 1, 12, '#5c5470'); p.rect(12, 4, 1, 12, '#5c5470');
      p.rect(6, 9, 4, 3, '#9ad4ff');
    }, 49);

    atlas[t.TOWN] = tileCanvas(function (p) {
      p.fill('#2f6d34'); p.dither('#3d8340', 3, 2);
      p.rect(1, 8, 14, 7, '#cbb08a');
      p.rect(0, 4, TS, 5, '#a03a34'); p.rect(0, 4, TS, 1, '#6e2320');
      p.rect(6, 10, 4, 5, '#7a4b23'); p.px(9, 12, '#e8d45c');
      p.rect(2, 10, 3, 3, '#3a5a86'); p.rect(11, 10, 3, 3, '#3a5a86');
    }, 50);

    atlas[t.CAVE] = tileCanvas(function (p) {
      p.fill('#2f6d34'); p.dither('#3d8340', 3, 2);
      p.rect(1, 4, 14, 12, '#6b6357'); p.rect(2, 3, 12, 3, '#7d7466');
      p.rect(4, 8, 8, 8, '#120f18'); p.rect(5, 6, 6, 3, '#120f18');
      p.speckle('#4f4a42', 12);
    }, 51);

    atlas[t.TOWER] = tileCanvas(function (p) {
      p.fill('#2f6d34'); p.dither('#3d8340', 3, 2);
      p.rect(4, 3, 8, 13, '#7f8ea6'); p.rect(4, 3, 8, 1, '#5c6b82');
      p.rect(3, 1, 10, 2, '#5c6b82');
      p.rect(6, 6, 4, 4, '#1d2436'); p.rect(6, 12, 4, 4, '#3b2a18');
    }, 52);

    atlas[t.RUIN] = tileCanvas(function (p) {
      p.fill('#d8b878'); p.dither('#e6cd93', 4, 3);
      p.rect(2, 5, 3, 11, '#a89468'); p.rect(11, 3, 3, 13, '#a89468');
      p.rect(6, 9, 3, 7, '#948357');
      p.rect(1, 14, 14, 2, '#8a7a50');
    }, 53);

    atlas[t.CASTLE] = tileCanvas(function (p) {
      p.fill('#1d1830');
      p.rect(2, 5, 12, 11, '#3d3552');
      p.rect(1, 2, 3, 4, '#4a4166'); p.rect(12, 2, 3, 4, '#4a4166');
      p.rect(6, 0, 4, 6, '#4a4166');
      p.rect(6, 10, 4, 6, '#12101c');
      p.rect(3, 7, 2, 2, '#c94a8a'); p.rect(11, 7, 2, 2, '#c94a8a');
    }, 54);

    atlas[t.SIGN] = tileCanvas(function (p) {
      p.fill('#2f6d34'); p.dither('#3d8340', 3, 2);
      p.rect(7, 9, 2, 6, '#6b4a24');
      p.rect(2, 3, 12, 7, '#b07a3e'); p.rect(3, 4, 10, 5, '#d19a58');
      p.rect(4, 5, 8, 1, '#6b4a24'); p.rect(4, 7, 6, 1, '#6b4a24');
    }, 55);

    atlas[t.CARPET] = tileCanvas(function (p) {
      p.fill('#8c2f4a'); p.dither('#a53c5c', 4, 3);
      p.rect(0, 0, TS, 1, '#e0c060'); p.rect(0, 15, TS, 1, '#e0c060');
    }, 56);

    atlas[t.COUNTER] = tileCanvas(function (p) {
      p.fill('#6b4a24');
      p.rect(0, 2, TS, 10, '#966a34'); p.rect(0, 2, TS, 2, '#b4854a');
      p.rect(0, 11, TS, 1, '#4e3418');
    }, 57);

    atlas[t.BED] = tileCanvas(function (p) {
      p.fill('#6b4a24');
      p.rect(1, 1, 14, 14, '#d8dce8');
      p.rect(1, 1, 14, 4, '#f0f2f8');
      p.rect(1, 6, 14, 9, '#4a6bb0');
      p.rect(1, 6, 14, 1, '#2f4a86');
    }, 58);

    atlas[t.FENCE] = tileCanvas(function (p) {
      p.fill('#2f6d34'); p.dither('#3d8340', 3, 2);
      p.rect(0, 6, TS, 2, '#8a6134'); p.rect(0, 11, TS, 2, '#8a6134');
      p.rect(3, 3, 2, 12, '#6b4a24'); p.rect(11, 3, 2, 12, '#6b4a24');
    }, 59);

    atlas[t.PILLAR] = tileCanvas(function (p) {
      p.fill('#4a4457');
      p.rect(3, 0, 10, 16, '#9a93a8'); p.rect(4, 0, 8, 16, '#b4adc4');
      p.rect(2, 0, 12, 2, '#847d94');
      p.rect(2, 13, 12, 3, '#847d94');
      p.rect(6, 2, 1, 11, '#8f88a0'); p.rect(9, 2, 1, 11, '#8f88a0');
    }, 60);

    atlas[t.ALTAR] = tileCanvas(function (p) {
      p.fill('#2a2340');
      p.rect(2, 6, 12, 9, '#6e6884'); p.rect(1, 12, 14, 3, '#5a5470');
      p.rect(4, 3, 8, 4, '#9ad4ff'); p.rect(5, 2, 6, 2, '#d6f0ff');
    }, 61);

    atlas[t.CRYSTAL] = tileCanvas(function (p) {
      p.fill('#2a2340');
      p.rect(6, 1, 4, 3, '#d6f0ff'); p.rect(4, 4, 8, 7, '#7fd8ff');
      p.rect(5, 11, 6, 3, '#4aa8e0'); p.rect(6, 14, 4, 2, '#2f7aa8');
      p.rect(6, 3, 2, 8, '#eaffff');
    }, 62);

    atlas[t.GRAVE] = tileCanvas(function (p) {
      p.fill('#3a4a2c'); p.dither('#4a5c38', 3, 2);
      p.rect(4, 4, 8, 11, '#8d8699'); p.rect(5, 2, 6, 3, '#9a93a8');
      p.rect(7, 6, 2, 6, '#5c5670'); p.rect(5, 8, 6, 2, '#5c5670');
    }, 63);

    atlas[t.BOOK] = tileCanvas(function (p) {
      p.fill('#565064');
      p.rect(1, 2, 14, 13, '#5b3a1e');
      p.rect(2, 3, 12, 11, '#7a5228');
      p.rect(2, 4, 12, 2, '#c9b48a'); p.rect(2, 8, 12, 2, '#c9b48a'); p.rect(2, 12, 12, 2, '#c9b48a');
    }, 64);

    atlas[t.POT] = tileCanvas(function (p) {
      p.fill('#565064');
      p.rect(5, 3, 6, 2, '#8a5a3a');
      p.rect(3, 5, 10, 10, '#a86a42'); p.rect(4, 6, 8, 8, '#c07f50');
      p.rect(4, 9, 8, 1, '#8a5a3a');
    }, 65);

    atlas[t.WELL] = tileCanvas(function (p) {
      p.fill('#b39a72'); p.dither('#c7ab80', 4, 3);
      p.rect(3, 6, 10, 9, '#7d7466'); p.rect(4, 7, 8, 7, '#2450b0');
      p.rect(3, 1, 1, 6, '#6b4a24'); p.rect(12, 1, 1, 6, '#6b4a24');
      p.rect(2, 0, 12, 2, '#8a6134');
    }, 66);

    atlas[t.VOID] = tileCanvas(function (p) { p.fill('#05040a'); p.speckle('#1a1730', 8); }, 67);
  }

  /* ---------- Effekte ---------- */

  GFX.fade = function (alpha, color) {
    if (alpha <= 0) return;
    var c = GFX.ctx;
    c.save();
    c.globalAlpha = Math.min(1, alpha);
    c.fillStyle = color || '#000';
    c.fillRect(-16, -16, VW + 32, VH + 32);
    c.restore();
  };

  GFX.shake = function (amount) {
    GFX.shakeX = (Math.random() * 2 - 1) * amount;
    GFX.shakeY = (Math.random() * 2 - 1) * amount;
  };

  global.GFX = GFX;
})(window);
