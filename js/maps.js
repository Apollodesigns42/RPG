/* ============================================================
   maps.js  --  Weltkarte, Städte, Innenräume, Dungeons
   Alle Karten werden deterministisch erzeugt (fester Seed),
   Landmarken/NPCs/Truhen sind von Hand platziert.
   ============================================================ */
(function (global) {
  'use strict';

  var T = GFX.TILE;
  var M = { cache: {} };

  /* ---------- PRNG ---------- */
  function mulberry(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------- Karten-Grundgerüst ---------- */

  function newMap(id, w, h, fill, opts) {
    var m = {
      id: id, w: w, h: h, tiles: new Uint8Array(w * h),
      npcs: [], warps: [], chests: [], events: [], signs: [],
      music: 'town', encounter: null, rate: 0, dark: 0,
      name: '', regions: null, bg: '#000'
    };
    if (fill) m.tiles.fill(fill);
    for (var k in (opts || {})) m[k] = opts[k];
    return m;
  }

  function at(m, x, y) {
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return T.VOID;
    return m.tiles[y * m.w + x];
  }
  function set(m, x, y, t) {
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return;
    m.tiles[y * m.w + x] = t;
  }
  function fillRect(m, x, y, w, h, t) {
    for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) set(m, i, j, t);
  }
  function ellipse(m, cx, cy, rx, ry, t, rnd, ragged) {
    for (var y = cy - ry - 2; y <= cy + ry + 2; y++) {
      for (var x = cx - rx - 2; x <= cx + rx + 2; x++) {
        var dx = (x - cx) / rx, dy = (y - cy) / ry;
        var d = dx * dx + dy * dy;
        var lim = 1 + (ragged ? (rnd() - .5) * ragged : 0);
        if (d <= lim) set(m, x, y, t);
      }
    }
  }
  M.at = at; M.set = set;

  /* ---------- Weltkarte ---------- */

  var WORLD_W = 72, WORLD_H = 60;

  var LANDMARKS = {
    aldenmark: { x: 20, y: 44, tile: T.TOWN,  to: 'aldenmark', tx: 16, ty: 24, name: 'Aldenmark' },
    selvia:    { x: 40, y: 51, tile: T.TOWN,  to: 'selvia',    tx: 16, ty: 24, name: 'Hafen Selvia' },
    nordheim:  { x: 33, y: 8,  tile: T.TOWN,  to: 'nordheim',  tx: 16, ty: 24, name: 'Nordheim' },
    cave:      { x: 9,  y: 30, tile: T.CAVE,  to: 'cave1',     tx: -1, ty: -1, name: 'Feuerhöhle' },
    icetemple: { x: 55, y: 9,  tile: T.CAVE,  to: 'ice1',      tx: -1, ty: -1, name: 'Eistempel' },
    windtower: { x: 61, y: 30, tile: T.TOWER, to: 'tower1',    tx: -1, ty: -1, name: 'Windturm' },
    earthruin: { x: 57, y: 47, tile: T.RUIN,  to: 'ruins1',    tx: -1, ty: -1, name: 'Erdruinen' },
    fortress:  { x: 34, y: 27, tile: T.CASTLE, to: 'dark1',    tx: -1, ty: -1, name: 'Finsterburg' }
  };
  M.LANDMARKS = LANDMARKS;

  function buildWorld() {
    var rnd = mulberry(20240815);
    var m = newMap('world', WORLD_W, WORLD_H, T.WATER, {
      music: 'world', rate: .055, name: 'Aetheria', bg: '#12306b'
    });
    m.regions = new Uint8Array(WORLD_W * WORLD_H);

    // --- Kontinent ---
    ellipse(m, 34, 34, 27, 18, T.GRASS, rnd, .30);
    ellipse(m, 22, 42, 16, 12, T.GRASS, rnd, .30);
    ellipse(m, 46, 44, 16, 11, T.GRASS, rnd, .30);
    ellipse(m, 34, 14, 22, 10, T.GRASS, rnd, .30);
    ellipse(m, 58, 26, 12, 12, T.GRASS, rnd, .30);
    ellipse(m, 12, 28, 10, 10, T.GRASS, rnd, .30);

    // --- Biome ---
    // Norden: Schnee
    for (var y = 0; y < 20; y++) {
      for (var x = 0; x < WORLD_W; x++) {
        if (at(m, x, y) !== T.GRASS) continue;
        var chance = (20 - y) / 12;
        if (rnd() < chance) set(m, x, y, T.SNOW);
      }
    }
    // Osten: Wüste
    ellipse(m, 58, 44, 14, 10, T.SAND, rnd, .35);
    ellipse(m, 62, 34, 9, 9, T.SAND, rnd, .35);
    // Westen: Vulkanland
    ellipse(m, 11, 29, 9, 9, T.VOLCANO, rnd, .4);
    ellipse(m, 11, 29, 6, 6, T.HILL, rnd, .4);
    // Sumpf im Süden
    ellipse(m, 30, 50, 7, 4, T.SWAMP, rnd, .4);

    // --- Gebirgsketten ---
    ridge(m, rnd, 24, 24, 46, 22, 2);      // Nordwall des Zentrums
    ridge(m, rnd, 24, 24, 24, 34, 2);
    ridge(m, rnd, 46, 22, 46, 34, 2);
    ridge(m, rnd, 24, 34, 30, 36, 2);
    ridge(m, rnd, 40, 36, 46, 34, 2);
    ridge(m, rnd, 4, 22, 20, 18, 1);
    ridge(m, rnd, 48, 12, 62, 18, 1);
    ridge(m, rnd, 60, 22, 66, 38, 1);

    // Zentrum: Finsterland
    for (y = 21; y < 36; y++) for (var x2 = 25; x2 < 46; x2++) {
      if (at(m, x2, y) === T.GRASS) set(m, x2, y, rnd() < .3 ? T.DEADTREE : T.SWAMP);
    }

    // --- Vegetation ---
    for (y = 0; y < WORLD_H; y++) {
      for (x = 0; x < WORLD_W; x++) {
        var t = at(m, x, y);
        var r = rnd();
        if (t === T.GRASS) {
          if (r < .17) set(m, x, y, T.TREE);
          else if (r < .21) set(m, x, y, T.HILL);
          else if (r < .225) set(m, x, y, T.FLOWER);
          else if (r < .235) set(m, x, y, T.ROCK);
        } else if (t === T.SNOW) {
          if (r < .13) set(m, x, y, T.SNOWTREE);
          else if (r < .17) set(m, x, y, T.MOUNT);
        } else if (t === T.SAND) {
          if (r < .07) set(m, x, y, T.PALM);
          else if (r < .10) set(m, x, y, T.ROCK);
        } else if (t === T.SWAMP) {
          if (r < .12) set(m, x, y, T.DEADTREE);
        }
      }
    }

    // --- Küstenlinie ---
    for (y = 0; y < WORLD_H; y++) {
      for (x = 0; x < WORLD_W; x++) {
        if (at(m, x, y) !== T.WATER) continue;
        if (isLandNear(m, x, y)) set(m, x, y, T.SHALLOW);
      }
    }

    // --- Wege zwischen den Landmarken ---
    var L = LANDMARKS;
    road(m, L.aldenmark.x, L.aldenmark.y, L.selvia.x, L.selvia.y);
    road(m, L.selvia.x, L.selvia.y, L.earthruin.x, L.earthruin.y);
    road(m, L.aldenmark.x, L.aldenmark.y, L.cave.x, L.cave.y);
    road(m, L.aldenmark.x, L.aldenmark.y, 20, 20);
    road(m, 20, 20, L.nordheim.x, L.nordheim.y);
    road(m, L.nordheim.x, L.nordheim.y, L.icetemple.x, L.icetemple.y);
    road(m, L.icetemple.x, L.icetemple.y, L.windtower.x, L.windtower.y);
    road(m, L.windtower.x, L.windtower.y, L.earthruin.x, L.earthruin.y);
    // Brücke ins Finsterland (erst nach 4 Kristallen begehbar - Ereignis)
    road(m, 36, 40, L.fortress.x, L.fortress.y + 6);

    // --- Landmarken setzen ---
    for (var key in L) {
      var lm = L[key];
      set(m, lm.x, lm.y, lm.tile);
      // Umgebung freiräumen
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        var tt = at(m, lm.x + dx, lm.y + dy);
        if (GFX.isSolid(tt) && tt !== T.WATER) set(m, lm.x + dx, lm.y + dy, T.GRASS);
      }
      set(m, lm.x, lm.y + 1, key === 'nordheim' || key === 'icetemple' ? T.SNOW :
        (key === 'earthruin' ? T.SAND : T.ROAD));
      if (lm.to) {
        m.warps.push({ x: lm.x, y: lm.y, to: lm.to, tx: lm.tx, ty: lm.ty,
                       name: lm.name, key: key });
      }
    }

    // --- Regionen für Zufallskämpfe ---
    for (y = 0; y < WORLD_H; y++) {
      for (x = 0; x < WORLD_W; x++) {
        var tl = at(m, x, y), reg = 2;                                   // Wildnis
        var da = Math.abs(x - LANDMARKS.aldenmark.x) + Math.abs(y - LANDMARKS.aldenmark.y);
        if (da <= 9) reg = 1;                                            // direkt um Aldenmark: sanft
        else if (x >= 24 && x <= 46 && y >= 20 && y <= 36) reg = 8;     // Finsterland
        else if (y < 18) reg = 4;                                        // Schnee
        else if (tl === T.SAND || tl === T.PALM) reg = 3;                // Wüste
        else if (x < 20 && y > 20 && y < 40) reg = 5;                    // Aschland
        else if (tl === T.SWAMP || tl === T.DEADTREE) reg = 7;           // Sumpf
        else if (x > 48 && y < 40) reg = 6;                              // Osthochland
        else if (da <= 16) reg = 1;                                      // Umland von Aldenmark
        m.regions[y * WORLD_W + x] = reg;
      }
    }

    // Schatztruhen in der Wildnis
    worldChest(m, 15, 20, { item: 'hitrank' });
    worldChest(m, 64, 40, { gold: 600 });
    worldChest(m, 27, 55, { item: 'phoenix' });
    worldChest(m, 50, 20, { item: 'ac4' });
    worldChest(m, 6, 40, { item: 'ac2' });

    return m;
  }

  var REGION_TABLE = { 1: 'grass', 2: 'forest', 3: 'desert', 4: 'snow',
                       5: 'volcano', 6: 'mountain', 7: 'swamp', 8: 'dark' };
  M.REGION_TABLE = REGION_TABLE;

  function worldChest(m, x, y, data) {
    // freie Stelle in der Nähe suchen
    for (var r = 0; r < 6; r++) {
      for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
        var tx = x + dx, ty = y + dy;
        var t = at(m, tx, ty);
        if (t === T.GRASS || t === T.SAND || t === T.SNOW || t === T.HILL) {
          set(m, tx, ty, T.CHEST);
          data.x = tx; data.y = ty; data.id = 'world_' + tx + '_' + ty;
          m.chests.push(data);
          return;
        }
      }
    }
  }

  function isLandNear(m, x, y) {
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      var t = at(m, x + dx, y + dy);
      if (t !== T.WATER && t !== T.SHALLOW && t !== T.VOID) return true;
    }
    return false;
  }

  function ridge(m, rnd, x1, y1, x2, y2, thick) {
    var steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var x = Math.round(x1 + (x2 - x1) * t + (rnd() - .5) * 2);
      var y = Math.round(y1 + (y2 - y1) * t + (rnd() - .5) * 2);
      for (var dy = -thick; dy <= thick; dy++) for (var dx = -thick; dx <= thick; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > thick + 1) continue;
        if (at(m, x + dx, y + dy) === T.WATER) continue;
        if (rnd() < .82) set(m, x + dx, y + dy, T.MOUNT);
      }
    }
  }

  /** Legt einen begehbaren Weg (L-förmig) und Brücken über Wasser. */
  function road(m, x1, y1, x2, y2) {
    var x = x1, y = y1, guard = 0;
    while ((x !== x2 || y !== y2) && guard++ < 400) {
      if (x !== x2 && (y === y2 || guard % 2 === 0)) x += x2 > x ? 1 : -1;
      else if (y !== y2) y += y2 > y ? 1 : -1;
      var t = at(m, x, y);
      if (t === T.WATER || t === T.SHALLOW) set(m, x, y, T.BRIDGE);
      else if (t !== T.TOWN && t !== T.CAVE && t !== T.TOWER && t !== T.RUIN && t !== T.CASTLE)
        set(m, x, y, T.ROAD);
    }
  }

  /* ---------- Gebäude & Innenräume ---------- */

  function building(m, x, y, w, h, doorDX, warpTo, label) {
    // Dach mit Überstand
    fillRect(m, x - 1, y, w + 2, 1, T.ROOFTOP);
    fillRect(m, x - 1, y + 1, w + 2, 2, T.ROOF);
    // Wände
    fillRect(m, x, y + 3, w, h - 3, T.HOUSE);
    // Fenster in der oberen Wandreihe
    for (var i = 1; i < w - 1; i += 3) set(m, x + i, y + 3, T.WINDOW);
    var dx = x + (doorDX == null ? (w >> 1) : doorDX);
    var dy = y + h - 1;
    set(m, dx, dy, T.DOOR);
    if (warpTo) m.warps.push({ x: dx, y: dy, to: warpTo, tx: -1, ty: -1, name: label });
    return { dx: dx, dy: dy };
  }

  function interior(id, w, h, floor, wall, opts) {
    var m = newMap(id, w, h, wall, opts || {});
    fillRect(m, 1, 1, w - 2, h - 2, floor);
    return m;
  }

  /* ---------- Städte ---------- */

  var TOWN_THEME = {
    aldenmark: { ground: T.GRASS, edge: T.TREE, music: 'town' },
    selvia:    { ground: T.SAND,  edge: T.PALM, music: 'town' },
    nordheim:  { ground: T.SNOW,  edge: T.SNOWTREE, music: 'town' }
  };

  function buildTown(id, def) {
    var th = TOWN_THEME[id];
    var w = 33, h = 27;
    var m = newMap(id, w, h, th.ground, { music: th.music, name: def.name, rate: 0 });

    // Rand
    for (var x = 0; x < w; x++) { set(m, x, 0, th.edge); set(m, x, 1, th.edge); set(m, x, h - 1, th.edge); }
    for (var y = 0; y < h; y++) { set(m, 0, y, th.edge); set(m, 1, y, th.edge); set(m, w - 1, y, th.edge); set(m, w - 2, y, th.edge); }

    // Ausgang unten mittig
    set(m, 16, h - 1, th.ground);
    fillRect(m, 15, h - 4, 3, 4, T.ROAD);
    m.warps.push({ x: 16, y: h - 1, to: 'world', tx: def.wx, ty: def.wy + 1, exit: true });

    // Hauptwege
    fillRect(m, 15, 6, 3, h - 9, T.ROAD);
    fillRect(m, 4, 12, 25, 2, T.ROAD);

    // Brunnen
    set(m, 20, 9, T.WELL);

    // Gebäude
    var inn   = building(m, 4, 4, 8, 6, 3, id + '_inn', 'Gasthaus');
    var shopI = building(m, 21, 3, 7, 6, 3, id + '_item', 'Laden');
    var shopG = building(m, 4, 17, 8, 6, 3, id + '_gear', 'Schmiede');
    var hs1   = building(m, 21, 17, 7, 6, 3, id + '_house', 'Haus');
    connect(m, inn.dx, inn.dy); connect(m, shopI.dx, shopI.dy);
    connect(m, shopG.dx, shopG.dy); connect(m, hs1.dx, hs1.dy);

    // Schilder
    m.signs.push({ x: 14, y: h - 5, text: def.signText });

    // NPCs
    def.npcs.forEach(function (n) { m.npcs.push(n); });

    // Innenräume registrieren
    M.defs[id + '_inn'] = function () { return makeInn(id, def); };
    M.defs[id + '_item'] = function () { return makeShop(id + '_item', def.shopItem, def.shopItemNpc); };
    M.defs[id + '_gear'] = function () { return makeShop(id + '_gear', def.shopGear, def.shopGearNpc); };
    M.defs[id + '_house'] = function () { return makeHouse(id + '_house', def.houseNpcs); };

    return m;
  }

  /** Verbindet eine Tür mit dem nächsten Weg. */
  function connect(m, dx, dy) {
    var y = dy + 1;
    while (y < m.h - 1 && at(m, dx, y) !== T.ROAD) { set(m, dx, y, T.ROAD); y++; }
    if (at(m, dx, dy + 1) !== T.ROAD) set(m, dx, dy + 1, T.ROAD);
  }

  function backWarp(m, townId) {
    m.warps.push({ x: (m.w >> 1), y: m.h - 1, to: townId, tx: -1, ty: -1, exit: true });
  }

  function makeInn(townId, def) {
    var m = interior(townId + '_inn', 15, 11, T.FLOOR, T.WALL,
      { music: 'town', name: 'Gasthaus', inn: true });
    set(m, 7, 10, T.DOOR);
    m.warps.push({ x: 7, y: 10, to: townId, tx: -1, ty: -1, exit: true, door: 'inn' });
    fillRect(m, 2, 2, 3, 2, T.BED); fillRect(m, 6, 2, 3, 2, T.BED); fillRect(m, 10, 2, 3, 2, T.BED);
    fillRect(m, 3, 6, 9, 1, T.COUNTER);
    m.npcs.push({ x: 7, y: 5, sprite: 'merchant', dir: 'down', name: 'Wirt',
      inn: def.innPrice, lines: ['Willkommen im Gasthaus!'] });
    m.npcs.push({ x: 12, y: 8, sprite: 'villager', dir: 'left', name: 'Gast',
      lines: def.innGuest, wander: true });
    return m;
  }

  function makeShop(id, shopId, npc) {
    var m = interior(id, 15, 11, T.FLOOR, T.WALL, { music: 'town', name: Data.SHOPS[shopId].name });
    set(m, 7, 10, T.DOOR);
    m.warps.push({ x: 7, y: 10, to: id.replace(/_(item|gear)$/, ''), tx: -1, ty: -1, exit: true });
    fillRect(m, 2, 5, 11, 1, T.COUNTER);
    fillRect(m, 2, 2, 2, 2, T.POT); set(m, 12, 2, T.BOOK);
    m.npcs.push({ x: 7, y: 4, sprite: 'merchant', dir: 'down', name: npc.name,
      shop: shopId, lines: npc.lines });
    return m;
  }

  function makeHouse(id, npcs) {
    var m = interior(id, 15, 11, T.FLOOR, T.WALL, { music: 'town', name: 'Haus' });
    set(m, 7, 10, T.DOOR);
    m.warps.push({ x: 7, y: 10, to: id.replace(/_house$/, ''), tx: -1, ty: -1, exit: true });
    fillRect(m, 2, 2, 3, 2, T.BED);
    set(m, 12, 2, T.BOOK); set(m, 11, 2, T.POT);
    fillRect(m, 6, 7, 4, 1, T.CARPET);
    (npcs || []).forEach(function (n) { m.npcs.push(n); });
    return m;
  }

  /* ---------- Dungeon-Generator ---------- */

  function genDungeon(id, seed, opts) {
    var w = opts.w || 44, h = opts.h || 40;
    var rnd = mulberry(seed);
    var m = newMap(id, w, h, opts.wall, {
      music: opts.music || 'dungeon', name: opts.name,
      encounter: opts.encounter, rate: opts.rate || .09, dark: opts.dark || 0
    });

    var rooms = [], tries = 0;
    while (rooms.length < (opts.rooms || 9) && tries++ < 400) {
      var rw = 5 + ((rnd() * 7) | 0), rh = 4 + ((rnd() * 5) | 0);
      var rx = 2 + ((rnd() * (w - rw - 4)) | 0), ry = 2 + ((rnd() * (h - rh - 4)) | 0);
      var ok = true;
      for (var i = 0; i < rooms.length; i++) {
        var o = rooms[i];
        if (rx < o.x + o.w + 2 && rx + rw + 2 > o.x && ry < o.y + o.h + 2 && ry + rh + 2 > o.y) { ok = false; break; }
      }
      if (!ok) continue;
      rooms.push({ x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1) });
    }

    rooms.forEach(function (r) { fillRect(m, r.x, r.y, r.w, r.h, opts.floor); });

    // Korridore
    for (i = 1; i < rooms.length; i++) corridor(m, rooms[i - 1], rooms[i], opts.floor, rnd);
    // Ein paar Querverbindungen für Schleifen
    for (i = 0; i + 3 < rooms.length; i += 3) corridor(m, rooms[i], rooms[i + 3], opts.floor, rnd);

    // Deko
    rooms.forEach(function (r, idx) {
      if (idx === 0) return;
      if (r.w >= 7 && r.h >= 5 && rnd() < .6) {
        set(m, r.x + 1, r.y + 1, T.PILLAR);
        set(m, r.x + r.w - 2, r.y + 1, T.PILLAR);
        set(m, r.x + 1, r.y + r.h - 2, T.PILLAR);
        set(m, r.x + r.w - 2, r.y + r.h - 2, T.PILLAR);
      }
    });

    m.rooms = rooms;
    return m;
  }

  function corridor(m, a, b, floor, rnd) {
    var x = a.cx, y = a.cy;
    var horizFirst = rnd() < .5;
    function carve(px, py) {
      if (GFX.isSolid(at(m, px, py)) || at(m, px, py) === m.tiles[0]) set(m, px, py, floor);
      set(m, px, py, floor);
    }
    if (horizFirst) {
      while (x !== b.cx) { carve(x, y); x += b.cx > x ? 1 : -1; }
      while (y !== b.cy) { carve(x, y); y += b.cy > y ? 1 : -1; }
    } else {
      while (y !== b.cy) { carve(x, y); y += b.cy > y ? 1 : -1; }
      while (x !== b.cx) { carve(x, y); x += b.cx > x ? 1 : -1; }
    }
    carve(b.cx, b.cy);
  }

  /** Setzt Treppen, Truhen und Boss in einen erzeugten Dungeon. */
  function furnish(m, opts) {
    var rooms = m.rooms;
    var start = rooms[0];
    m.start = { x: start.cx, y: start.cy };

    if (opts.up) {
      set(m, start.cx, start.cy, T.STAIRS_UP);
      m.warps.push({ x: start.cx, y: start.cy, to: opts.up.to, tx: opts.up.tx, ty: opts.up.ty, exit: true, stairs: true });
    }

    // Entferntester Raum = Ziel
    var far = rooms[1] || rooms[0], best = -1;
    rooms.forEach(function (r, i) {
      if (i === 0) return;
      var d = Math.abs(r.cx - start.cx) + Math.abs(r.cy - start.cy);
      if (d > best) { best = d; far = r; }
    });
    m.farRoom = far;

    if (opts.down) {
      set(m, far.cx, far.cy, T.STAIRS_DOWN);
      m.warps.push({ x: far.cx, y: far.cy, to: opts.down.to, tx: opts.down.tx, ty: opts.down.ty, stairs: true });
    }

    if (opts.boss) {
      // Bossraum: Altar + Auslöser davor (mehrere Felder breit)
      fillRect(m, far.x, far.y, far.w, far.h, opts.floor);
      set(m, far.cx, far.y + 1, T.ALTAR);
      m.altar = { x: far.cx, y: far.y + 1 };
      for (var dx = -1; dx <= 1; dx++) {
        var ex = far.cx + dx;
        if (ex <= far.x || ex >= far.x + far.w - 1) continue;
        m.events.push({ x: ex, y: far.y + 2, id: opts.boss.event, once: true });
      }
      m.boss = opts.boss;
    }

    // Truhen in mittleren Räumen
    var loot = opts.loot || [];
    var li = 0;
    rooms.forEach(function (r, i) {
      if (i === 0 || r === far || li >= loot.length) return;
      if (i % 2 === 1) {
        var cx = r.x + 1, cy = r.y + 1;
        set(m, cx, cy, T.CHEST);
        var data = loot[li++];
        m.chests.push({ x: cx, y: cy, item: data.item, gold: data.gold,
                        id: m.id + '_' + cx + '_' + cy });
      }
    });
  }

  /* ---------- Konkrete Karten ---------- */

  M.defs = {};

  M.defs.world = buildWorldLazy;
  function buildWorldLazy() { return buildWorld(); }

  /* --- Aldenmark --- */
  M.defs.aldenmark = function () {
    return buildTown('aldenmark', {
      name: 'Aldenmark', wx: 20, wy: 44,
      signText: 'ALDENMARK - Herz des Königreichs. Norden: Schloss.',
      innPrice: 20,
      innGuest: ['Vier Kristalle halten die Welt im Gleichgewicht.',
                 'Seit Malkoth sie entweiht hat, stirbt das Land.'],
      shopItem: 'aldenmark_item',
      shopItemNpc: { name: 'Kräuterfrau', lines: ['Tränke retten Leben, Held.'] },
      shopGear: 'aldenmark_gear',
      shopGearNpc: { name: 'Schmied Borin', lines: ['Gutes Eisen hält länger als gute Worte.'] },
      houseNpcs: [
        { x: 5, y: 6, sprite: 'child', dir: 'down', name: 'Junge', wander: true,
          lines: ['Wenn ich groß bin, werde ich Ritter wie Alric!'] },
        { x: 10, y: 6, sprite: 'villager', dir: 'down', name: 'Mutter',
          lines: ['Die Ernte verdorrt. Der Erdkristall schweigt.'] }
      ],
      npcs: [
        { x: 13, y: 15, sprite: 'guard', dir: 'right', name: 'Wache',
          lines: ['Der König erwartet dich im Schloss im Norden.'] },
        { x: 22, y: 14, sprite: 'villager', dir: 'down', name: 'Bürger', wander: true,
          lines: ['Im Westen speit der Berg Feuer. Dort war früher Ackerland.'] },
        { x: 19, y: 20, sprite: 'elder', dir: 'down', name: 'Alte Mira',
          lines: ['Vier Kristalle, vier Wächter. Nur wer alle vier befreit,',
                  'kann die Brücke zur Finsterburg beschreiten.'] },
        { x: 26, y: 11, sprite: 'child', dir: 'left', name: 'Mädchen', wander: true,
          lines: ['Speichere oft! Im Gasthaus kannst du rasten.'] }
      ]
    });
  };

  // Schloss von Aldenmark (Startpunkt)
  M.defs.aldenmark_castle = function () {
    var m = interior('aldenmark_castle', 21, 17, T.FLOOR, T.WALL,
      { music: 'town', name: 'Schloss Aldenmark' });
    fillRect(m, 9, 3, 3, 12, T.CARPET);
    set(m, 10, 15, T.DOOR);
    m.warps.push({ x: 10, y: 15, to: 'aldenmark', tx: 16, ty: 6, exit: true });
    // Thronbereich
    fillRect(m, 7, 1, 7, 1, T.PILLAR);
    set(m, 5, 4, T.PILLAR); set(m, 15, 4, T.PILLAR);
    set(m, 5, 8, T.PILLAR); set(m, 15, 8, T.PILLAR);
    set(m, 5, 12, T.PILLAR); set(m, 15, 12, T.PILLAR);
    set(m, 2, 2, T.BOOK); set(m, 18, 2, T.BOOK);

    m.npcs.push({ x: 10, y: 2, sprite: 'king', dir: 'down', name: 'König Aldric', king: true,
      lines: function (g) {
        if (g.flags.crystals >= 4) return [
          'Die vier Kristalle leuchten wieder!',
          'Die Brücke ins Finsterland steht offen.',
          'Beende, was Malkoth begonnen hat - im Namen Aetherias!'];
        if (g.flags.quest) return [
          'Vier Kristalle, Alric. ' + g.flags.crystals + ' hast du bereits befreit.',
          'Aetheria hält den Atem an.'];
        return ['Alric, mein treuester Hauptmann...'];
      } });
    m.npcs.push({ x: 7, y: 5, sprite: 'guard', dir: 'right', name: 'Wache',
      lines: ['Steh dem König bei, Hauptmann.'] });
    m.npcs.push({ x: 13, y: 5, sprite: 'guard', dir: 'left', name: 'Wache',
      lines: ['Die Kristallkammern liegen außerhalb der Stadtmauern.'] });
    m.npcs.push({ x: 4, y: 10, sprite: 'elder', dir: 'right', name: 'Hofmagier',
      lines: ['Elemente schlagen einander: Feuer schmilzt Eis,',
              'Blitz zerbricht Stein, Heiliges verzehrt Finsternis.'] });
    return m;
  };

  /* --- Selvia --- */
  M.defs.selvia = function () {
    return buildTown('selvia', {
      name: 'Hafen Selvia', wx: 40, wy: 51,
      signText: 'HAFEN SELVIA - Tor zum Osten.',
      innPrice: 60,
      innGuest: ['Der Eistempel im Norden ist seit Jahren verschlossen.',
                 'Aber seit dem Beben steht das Tor offen...'],
      shopItem: 'selvia_item',
      shopItemNpc: { name: 'Händlerin Sae', lines: ['Frische Ware aus Übersee!'] },
      shopGear: 'selvia_gear',
      shopGearNpc: { name: 'Waffenmeister', lines: ['Der Osten ist rau. Rüst dich besser aus.'] },
      houseNpcs: [
        { x: 5, y: 6, sprite: 'villager', dir: 'down', name: 'Fischer',
          lines: ['Die Fische fliehen vor der Kälte aus dem Norden.'] },
        { x: 10, y: 7, sprite: 'elder', dir: 'left', name: 'Kartograf',
          lines: ['Windturm im Osten, Erdruinen im Südosten.',
                  'Und in der Mitte: die Finsterburg. Meide sie - noch.'] }
      ],
      npcs: [
        { x: 22, y: 14, sprite: 'villager', dir: 'down', name: 'Matrose', wander: true,
          lines: ['Ein Magier lungert am Brunnen herum. Seltsamer Kerl.'] },
        { x: 13, y: 20, sprite: 'guard', dir: 'right', name: 'Hafenwache',
          lines: ['Ohne die Kristalle wird kein Schiff mehr sicher segeln.'] },
        { x: 19, y: 10, sprite: 'faelan', dir: 'down', name: 'Faelan', recruit: 'faelan',
          lines: ['Ihr jagt die Kristallwächter? Wie ungeheuer unvernünftig.',
                  'Die Sturmakademie hat mich verbannt, weil ich zu viel wissen wollte.',
                  'Jetzt weiß ich, was Malkoth tat - und wie man ihn aufhält.',
                  'Ich komme mit. Nicht aus Heldenmut. Aus Neugier.'] }
      ]
    });
  };

  /* --- Nordheim --- */
  M.defs.nordheim = function () {
    return buildTown('nordheim', {
      name: 'Nordheim', wx: 33, wy: 8,
      signText: 'NORDHEIM - Letzte Feste vor dem ewigen Eis.',
      innPrice: 150,
      innGuest: ['Sylphara, die Sturmhexe, haust im Windturm.',
                 'Ihr Sturm hat drei Dörfer verschluckt.'],
      shopItem: 'nordheim_item',
      shopItemNpc: { name: 'Händler Sven', lines: ['Teuer, aber du lebst länger.'] },
      shopGear: 'nordheim_gear',
      shopGearNpc: { name: 'Meisterschmiedin', lines: ['Nordstahl. Nichts Besseres südlich des Eises.'] },
      houseNpcs: [
        { x: 5, y: 6, sprite: 'elder', dir: 'down', name: 'Seherin',
          lines: ['Malkoth war einst ein Mensch. Ein König sogar.',
                  'Die Kristalle wiesen ihn ab - und er wies die Welt ab.'] },
        { x: 10, y: 6, sprite: 'child', dir: 'down', name: 'Kind', wander: true,
          lines: ['Kalt hier, oder? Der Eiskristall schläft.'] }
      ],
      npcs: [
        { x: 22, y: 14, sprite: 'guard', dir: 'down', name: 'Nordwache',
          lines: ['Der Eistempel liegt im Osten. Nimm Feuerzauber mit.'] },
        { x: 13, y: 9, sprite: 'villager', dir: 'right', name: 'Jäger', wander: true,
          lines: ['Frostwölfe jagen im Rudel. Trenne sie nicht - töte sie schnell.'] },
        { x: 19, y: 20, sprite: 'nyx', dir: 'left', name: 'Nyx', recruit: 'nyx',
          lines: ['Steh still. Ich habe dir gerade den Beutel abgenommen -',
                  'und wieder zurückgelegt. Du hast nichts gemerkt.',
                  'Malkoths Schatten haben mein Dorf verschluckt.',
                  'Ich gehe mit euch. Und ich nehme mir, was ich brauche.'] }
      ]
    });
  };

  /* --- Dungeons --- */

  function dungeonDef(id, seed, opts) {
    M.defs[id] = function () {
      var m = genDungeon(id, seed, opts);
      furnish(m, opts);
      return m;
    };
  }

  // Feuerhöhle: 2 Ebenen
  dungeonDef('cave1', 90210, {
    name: 'Feuerhöhle B1', floor: T.LAVAFLOOR, wall: T.LAVAWALL, rooms: 9, dark: .55,
    encounter: 'cave_fire', rate: .10, w: 40, h: 34,
    up: { to: 'world', tx: 9, ty: 31 },
    down: { to: 'cave2', tx: -1, ty: -1 },
    loot: [{ item: 'trank' }, { gold: 200 }, { item: 'sword2' }, { item: 'hitrank' }]
  });
  dungeonDef('cave2', 90211, {
    name: 'Feuerhöhle B2', floor: T.LAVAFLOOR, wall: T.LAVAWALL, rooms: 8, dark: .6,
    encounter: 'cave_fire', rate: .11, w: 38, h: 32,
    up: { to: 'cave1', tx: -1, ty: -1 },
    boss: { event: 'boss_fire', enemy: 'boss_dragon', crystal: 'fire',
            music: 'boss', intro: 'Ignarok, der Feuerdrache, erwacht!' },
    loot: [{ item: 'aether' }, { item: 'ac1' }, { gold: 400 }]
  });

  // Eistempel: 2 Ebenen
  dungeonDef('ice1', 51001, {
    name: 'Eistempel 1', floor: T.ICEFLOOR, wall: T.ICEWALL, rooms: 10,
    encounter: 'temple_ice', rate: .10, w: 42, h: 36,
    up: { to: 'world', tx: 55, ty: 10 },
    down: { to: 'ice2', tx: -1, ty: -1 },
    loot: [{ item: 'hitrank' }, { item: 'rb2' }, { gold: 500 }, { item: 'phoenix' }]
  });
  dungeonDef('ice2', 51002, {
    name: 'Eistempel 2', floor: T.ICEFLOOR, wall: T.ICEWALL, rooms: 8,
    encounter: 'temple_ice', rate: .11, w: 38, h: 34,
    up: { to: 'ice1', tx: -1, ty: -1 },
    boss: { event: 'boss_ice', enemy: 'boss_ice', crystal: 'ice',
            music: 'boss', intro: 'Glacius, der Eiskoloss, erhebt sich!' },
    loot: [{ item: 'elixier' }, { item: 'ac2' }, { gold: 800 }]
  });

  // Windturm: 3 Ebenen
  dungeonDef('tower1', 77001, {
    name: 'Windturm 1F', floor: T.TOWERFLOOR, wall: T.TOWERWALL, rooms: 8,
    encounter: 'tower_wind', rate: .10, w: 36, h: 32,
    up: { to: 'world', tx: 61, ty: 31 },
    down: { to: 'tower2', tx: -1, ty: -1 },
    loot: [{ item: 'hitrank' }, { gold: 700 }, { item: 'aether' }]
  });
  dungeonDef('tower2', 77002, {
    name: 'Windturm 2F', floor: T.TOWERFLOOR, wall: T.TOWERWALL, rooms: 9,
    encounter: 'tower_wind', rate: .11, w: 36, h: 32,
    up: { to: 'tower1', tx: -1, ty: -1 },
    down: { to: 'tower3', tx: -1, ty: -1 },
    loot: [{ item: 'lt3' }, { item: 'elixier' }, { gold: 900 }, { item: 'ac6' }]
  });
  dungeonDef('tower3', 77003, {
    name: 'Windturm 3F', floor: T.TOWERFLOOR, wall: T.TOWERWALL, rooms: 7,
    encounter: 'tower_wind', rate: .12, w: 34, h: 30,
    up: { to: 'tower2', tx: -1, ty: -1 },
    boss: { event: 'boss_wind', enemy: 'boss_witch', crystal: 'wind',
            music: 'boss', intro: 'Sylphara, die Sturmhexe, lacht im Orkan!' },
    loot: [{ item: 'xtrank' }, { gold: 1200 }]
  });

  // Erdruinen: 2 Ebenen
  dungeonDef('ruins1', 33001, {
    name: 'Erdruinen', floor: T.SANDFLOOR, wall: T.SANDWALL, rooms: 10, dark: .3,
    encounter: 'ruins_earth', rate: .10, w: 42, h: 36,
    up: { to: 'world', tx: 57, ty: 48 },
    down: { to: 'ruins2', tx: -1, ty: -1 },
    loot: [{ item: 'hitrank' }, { item: 'ac5' }, { gold: 1000 }, { item: 'elixier' }]
  });
  dungeonDef('ruins2', 33002, {
    name: 'Tiefe Erdruinen', floor: T.SANDFLOOR, wall: T.SANDWALL, rooms: 8, dark: .45,
    encounter: 'ruins_earth', rate: .12, w: 40, h: 34,
    up: { to: 'ruins1', tx: -1, ty: -1 },
    boss: { event: 'boss_earth', enemy: 'boss_titan', crystal: 'earth',
            music: 'boss', intro: 'Terramoth, der Erdtitan, wälzt sich empor!' },
    loot: [{ item: 'xtrank' }, { item: 'phoenix' }, { gold: 1600 }]
  });

  // Finsterburg: 3 Ebenen
  dungeonDef('dark1', 66601, {
    name: 'Finsterburg - Hof', floor: T.DARKFLOOR, wall: T.DARKWALL, rooms: 10, dark: .5,
    encounter: 'fortress', rate: .11, w: 42, h: 36,
    up: { to: 'world', tx: 34, ty: 28 },
    down: { to: 'dark2', tx: -1, ty: -1 },
    loot: [{ item: 'xtrank' }, { item: 'elixier' }, { gold: 2000 }, { item: 'phoenix' }]
  });
  dungeonDef('dark2', 66602, {
    name: 'Finsterburg - Hallen', floor: T.DARKFLOOR, wall: T.DARKWALL, rooms: 10, dark: .55,
    encounter: 'fortress', rate: .12, w: 42, h: 36,
    up: { to: 'dark1', tx: -1, ty: -1 },
    down: { to: 'dark3', tx: -1, ty: -1 },
    loot: [{ item: 'sword5' }, { item: 'elixier' }, { item: 'ac7' }, { gold: 2500 }]
  });
  dungeonDef('dark3', 66603, {
    name: 'Finsterburg - Thron', floor: T.DARKFLOOR, wall: T.DARKWALL, rooms: 7, dark: .45,
    encounter: 'fortress', rate: .10, w: 36, h: 32,
    up: { to: 'dark2', tx: -1, ty: -1 },
    boss: { event: 'boss_final', enemy: 'boss_dark', crystal: null,
            music: 'boss', intro: 'Malkoth, der Schattenfürst, erwartet euch.' },
    loot: [{ item: 'xtrank' }, { item: 'elixier' }]
  });

  /* ---------- Zugriff ---------- */

  M.get = function (id) {
    if (M.cache[id]) return M.cache[id];
    var def = M.defs[id];
    if (!def) {
      // Innenräume werden erst beim Bau der Stadt registriert
      var base = id.split('_')[0];
      if (base !== id && M.defs[base]) { M.get(base); def = M.defs[id]; }
    }
    if (!def) { console.warn('Unbekannte Karte:', id); return null; }
    var m = def();
    M.cache[id] = m;
    return m;
  };

  M.reset = function () { M.cache = {}; };

  /** Findet den passenden Eingangspunkt beim Betreten einer Karte. */
  M.entryFor = function (map, fromId) {
    // Treppe/Tür, die zurück führt
    for (var i = 0; i < map.warps.length; i++) {
      var w = map.warps[i];
      if (w.to === fromId) return { x: w.x, y: w.y };
    }
    if (map.start) return { x: map.start.x, y: map.start.y };
    // Erstbeste begehbare Kachel
    for (var y = 1; y < map.h - 1; y++) for (var x = 1; x < map.w - 1; x++)
      if (!GFX.isSolid(at(map, x, y))) return { x: x, y: y };
    return { x: 1, y: 1 };
  };

  M.encounterTableAt = function (map, x, y) {
    if (map.regions) {
      var r = map.regions[y * map.w + x];
      return REGION_TABLE[r] || 'grass';
    }
    return map.encounter;
  };

  global.Maps = M;
})(window);
