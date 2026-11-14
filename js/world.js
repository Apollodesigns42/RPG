/* ============================================================
   world.js  --  Erkundung: Bewegung, NPCs, Truhen, Warps,
                 Zufallskämpfe, Beleuchtung
   ============================================================ */
(function (global) {
  'use strict';

  var TS = GFX.TS;

  var W = {
    map: null, x: 0, y: 0, dir: 'down', frame: 0, animT: 0,
    moving: false, mvT: 0, mvDur: .16, fromX: 0, fromY: 0,
    camX: 0, camY: 0, steps: 0, encT: 0, justWarped: true,
    banner: 0, bannerText: '', transition: 0, transTo: null, blocked: 0
  };

  var DIRS = {
    up:    { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 },
    left:  { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 }
  };

  /* ---------- Betreten ---------- */

  W.enter = function (mapId, tx, ty, dir) {
    var m = Maps.get(mapId);
    if (!m) return;
    var prev = W.map ? W.map.id : null;
    W.map = m;

    // Bereits geplünderte Truhen verschwinden lassen
    m.chests.forEach(function (c) {
      if (Game.flags.chests[c.id] && Maps.at(m, c.x, c.y) === GFX.TILE.CHEST)
        Maps.set(m, c.x, c.y, floorTileFor(m));
    });
    // Befreiter Kristall bleibt auf dem Sockel sichtbar
    if (m.boss && m.boss.crystal && Game.flags.events[m.boss.event] && m.altar)
      Maps.set(m, m.altar.x, m.altar.y, GFX.TILE.CRYSTAL);

    if (tx == null || tx < 0) {
      var e = Maps.entryFor(m, prev);
      tx = e.x; ty = e.y;
    }
    W.x = tx; W.y = ty;
    W.fromX = tx; W.fromY = ty;
    W.moving = false; W.mvT = 0;
    W.dir = dir || W.dir;
    W.justWarped = true;
    W.encT = 0;
    updateCamera(true);
    if (m.name) { W.bannerText = m.name; W.banner = 2.4; }
    Game.mapId = mapId;
    Game.px = tx; Game.py = ty;
    if (mapId === 'world') { Game.wx = tx; Game.wy = ty; }
    if (m.music) Sound.play(m.music);
    // NPC-Startpositionen sichern
    m.npcs.forEach(function (n) {
      if (n.hx == null) { n.hx = n.x; n.hy = n.y; n.t = Math.random() * 3; }
    });
  };

  /* ---------- Hilfen ---------- */

  function tileAt(x, y) { return Maps.at(W.map, x, y); }

  function npcAt(x, y) {
    var list = W.map.npcs;
    for (var i = 0; i < list.length; i++) if (list[i].x === x && list[i].y === y) return list[i];
    return null;
  }

  function passable(x, y) {
    if (x < 0 || y < 0 || x >= W.map.w || y >= W.map.h) return false;
    var t = tileAt(x, y);
    if (GFX.isSolid(t)) return false;
    if (npcAt(x, y)) return false;
    return true;
  }

  function warpAt(x, y) {
    var ws = W.map.warps;
    for (var i = 0; i < ws.length; i++) if (ws[i].x === x && ws[i].y === y) return ws[i];
    return null;
  }

  function eventAt(x, y) {
    var es = W.map.events;
    for (var i = 0; i < es.length; i++) {
      var e = es[i];
      if (e.x === x && e.y === y && !(e.once && Game.flags.events[e.id])) return e;
    }
    return null;
  }

  function chestAt(x, y) {
    var cs = W.map.chests;
    for (var i = 0; i < cs.length; i++) if (cs[i].x === x && cs[i].y === y) return cs[i];
    return null;
  }

  /* ---------- Update ---------- */

  W.update = function (dt, input) {
    if (!W.map) return;
    if (W.banner > 0) W.banner -= dt;
    if (W.blocked > 0) W.blocked -= dt;

    // Übergang (Fade) zwischen Karten
    if (W.transition > 0) {
      W.transition -= dt;
      if (W.transition <= 0 && W.transTo) {
        var t = W.transTo; W.transTo = null;
        W.enter(t.to, t.tx, t.ty, t.dir);
        W.fadeIn = .3;
      }
      return;
    }
    if (W.fadeIn > 0) W.fadeIn -= dt;

    updateNpcs(dt);

    if (UI.busy()) return;

    if (W.moving) {
      W.mvT += dt;
      W.animT += dt;
      if (W.mvT >= W.mvDur) {
        W.moving = false;
        W.fromX = W.x; W.fromY = W.y;
        onArrive(input);
      }
    }

    if (!W.moving) {
      var d = null;
      if (input.held('up')) d = 'up';
      else if (input.held('down')) d = 'down';
      else if (input.held('left')) d = 'left';
      else if (input.held('right')) d = 'right';

      if (d) {
        W.dir = d;
        var nx = W.x + DIRS[d].dx, ny = W.y + DIRS[d].dy;
        if (passable(nx, ny)) {
          W.fromX = W.x; W.fromY = W.y;
          W.x = nx; W.y = ny;
          W.moving = true; W.mvT = 0;
          W.mvDur = input.held('run') ? .085 : .155;
        } else {
          W.animT += dt;
          if (W.blocked <= 0) { W.blocked = .25; }
        }
      } else {
        W.frame = 0;
      }
    }

    if (W.moving || W.animT > 0) {
      W.frame = Math.floor(W.animT / .12) % 4;
    }
    updateCamera(false);
  };

  function onArrive(input) {
    W.justWarpedTile = false;
    Game.px = W.x; Game.py = W.y;
    if (W.map.id === 'world') { Game.wx = W.x; Game.wy = W.y; }

    // Warp?
    var wp = warpAt(W.x, W.y);
    if (wp) {
      if (!W.justWarped) { doWarp(wp); return; }
    } else {
      W.justWarped = false;
    }

    // Ereignis?
    var ev = eventAt(W.x, W.y);
    if (ev) { Game.runEvent(ev, W.map); return; }

    // Zufallskampf
    var t = tileAt(W.x, W.y);
    if (GFX.canEncounter(t)) {
      var table = Maps.encounterTableAt(W.map, W.x, W.y);
      var rate = W.map.rate || 0;
      if (table && rate > 0) {
        W.steps++;
        W.encT += rate * (.6 + Math.random() * .8);
        if (W.encT >= 1) {
          W.encT = 0;
          Game.startRandomBattle(table);
        }
      }
    }
  }

  function doWarp(wp) {
    if (wp.key === 'fortress' && Game.flags.crystals < 4) {
      UI.say(['Eine Barriere aus Finsternis versperrt den Weg.',
              'Erst das Licht aller vier Kristalle kann sie brechen.']);
      W.justWarped = true;
      return;
    }
    Sound.sfx(wp.stairs ? 'step' : 'door');
    W.transition = .28;
    W.transTo = { to: wp.to, tx: wp.tx, ty: wp.ty };
  }

  W.warpTo = function (to, tx, ty) {
    W.transition = .28;
    W.transTo = { to: to, tx: tx, ty: ty };
  };

  function updateNpcs(dt) {
    if (!W.map) return;
    W.map.npcs.forEach(function (n) {
      if (!n.wander) return;
      n.t -= dt;
      if (n.t > 0) return;
      n.t = 1.6 + Math.random() * 2.6;
      var dirs = ['up', 'down', 'left', 'right'];
      var d = dirs[(Math.random() * 4) | 0];
      var nx = n.x + DIRS[d].dx, ny = n.y + DIRS[d].dy;
      n.dir = d;
      if (Math.abs(nx - n.hx) > 2 || Math.abs(ny - n.hy) > 2) return;
      if (nx === W.x && ny === W.y) return;
      if (passable(nx, ny)) { n.x = nx; n.y = ny; }
    });
  }

  function updateCamera(snap) {
    var px = lerpX() * TS, py = lerpY() * TS;
    var cx = px - GFX.VW / 2 + TS / 2;
    var cy = py - GFX.VH / 2 + TS / 2;
    var maxX = W.map.w * TS - GFX.VW, maxY = W.map.h * TS - GFX.VH;
    cx = maxX <= 0 ? maxX / 2 : Math.max(0, Math.min(maxX, cx));
    cy = maxY <= 0 ? maxY / 2 : Math.max(0, Math.min(maxY, cy));
    W.camX = cx; W.camY = cy;
  }

  function lerpX() {
    if (!W.moving) return W.x;
    var t = Math.min(1, W.mvT / W.mvDur);
    return W.fromX + (W.x - W.fromX) * t;
  }
  function lerpY() {
    if (!W.moving) return W.y;
    var t = Math.min(1, W.mvT / W.mvDur);
    return W.fromY + (W.y - W.fromY) * t;
  }

  /* ---------- Interaktion ---------- */

  W.interact = function () {
    if (!W.map || W.moving) return;
    var d = DIRS[W.dir];
    var tx = W.x + d.dx, ty = W.y + d.dy;

    var npc = npcAt(tx, ty);
    if (npc) { talkTo(npc); return; }

    var t = tileAt(tx, ty);

    // Über eine Ladentheke hinweg ansprechen
    if (t === GFX.TILE.COUNTER) {
      var beyond = npcAt(tx + d.dx, ty + d.dy);
      if (beyond) { talkTo(beyond); return; }
    }
    if (t === GFX.TILE.CHEST) { openChest(tx, ty); return; }
    if (t === GFX.TILE.SIGN) {
      var s = findSign(tx, ty);
      if (s) { UI.say(s.text); return; }
    }
    if (t === GFX.TILE.ALTAR || t === GFX.TILE.CRYSTAL) {
      var boss = W.map.boss;
      if (boss && Game.flags.events[boss.event]) {
        var cr = boss.crystal ? Data.CRYSTALS.filter(function (c) { return c.id === boss.crystal; })[0] : null;
        UI.say(cr ? ['Der ' + cr.name + ' pulsiert in reinem Licht.',
                     'Seine Kraft strömt zurück in die Welt.']
                  : ['Ein leerer Sockel. Hier endete alles.']);
      } else {
        UI.say(['Ein alter Sockel. Etwas Machtvolles ruht hier.']);
      }
      return;
    }
    // Ereignis direkt vor uns
    var ev = eventAt(tx, ty);
    if (ev) { Game.runEvent(ev, W.map); return; }

    // Bett im Gasthaus
    if (t === GFX.TILE.BED) { UI.say('Ein weiches Bett. Der Wirt kümmert sich um die Buchung.'); return; }
    if (t === GFX.TILE.BOOK) { UI.say(randomLore()); return; }
    if (t === GFX.TILE.WELL) { UI.say('Ein tiefer Brunnen. Das Wasser ist klar und kalt.'); return; }
    if (t === GFX.TILE.POT) { UI.say('Nur ein Tontopf. Leer.'); return; }
    if (t === GFX.TILE.GRAVE) { UI.say('Ein namenloses Grab. Möge es ruhen.'); return; }
  };

  var LORE = [
    'Chronik: "Vier Kristalle wurden in die Welt gesetzt, damit\nsie atme."',
    'Notiz: "Feuer schmilzt Eis. Blitz zerbricht Stein.\nHeiliges Licht verzehrt die Finsternis."',
    'Chronik: "Malkoth trat vor die Kristalle und begehrte\nihre Macht. Sie wiesen ihn ab."',
    'Notiz: "Wer flieht, verliert nichts als Stolz - und\nmanchmal ist das genug."'
  ];
  function randomLore() {
    return LORE[(Math.random() * LORE.length) | 0].split('\n');
  }

  function findSign(x, y) {
    var ss = W.map.signs;
    for (var i = 0; i < ss.length; i++) {
      if (Math.abs(ss[i].x - x) <= 1 && Math.abs(ss[i].y - y) <= 1) return ss[i];
    }
    return ss[0] || null;
  }

  function talkTo(npc) {
    // NPC dreht sich zum Spieler
    npc.dir = npc.x === W.x ? (npc.y > W.y ? 'up' : 'down') : (npc.x > W.x ? 'left' : 'right');
    if (npc.shop) { Game.openShop(npc.shop, npc); return; }
    if (npc.inn) { Game.openInn(npc); return; }
    if (npc.king) { Game.talkKing(npc); return; }
    if (npc.recruit) { Game.recruitNpc(npc); return; }
    var lines = typeof npc.lines === 'function' ? npc.lines(Game) : npc.lines;
    UI.say(lines || ['...'], null, { speaker: npc.name });
  }

  function openChest(x, y) {
    var c = chestAt(x, y);
    if (!c) return;
    if (Game.flags.chests[c.id]) { UI.say('Die Truhe ist leer.'); return; }
    Game.flags.chests[c.id] = true;
    Maps.set(W.map, x, y, floorTileFor(W.map));
    Sound.sfx('chest');
    if (c.gold) {
      Game.gold += c.gold;
      UI.say('Du findest ' + c.gold + ' Gold!');
    } else if (c.item) {
      Game.addItem(c.item, 1);
      var name = (Data.ITEMS[c.item] || Data.EQUIP[c.item]).name;
      UI.say('Du findest: ' + name + '!');
    }
  }

  function floorTileFor(m) {
    var t = GFX.TILE;
    if (m.id === 'world') return t.GRASS;
    for (var i = 0; i < m.tiles.length; i++) { /* Bodenart aus Karte ableiten */ }
    var guess = Maps.at(m, m.rooms ? m.rooms[0].cx : 1, m.rooms ? m.rooms[0].cy : 1);
    if (guess === t.STAIRS_UP || guess === t.STAIRS_DOWN) {
      guess = Maps.at(m, (m.rooms ? m.rooms[0].cx : 1) + 1, m.rooms ? m.rooms[0].cy : 1);
    }
    return GFX.isSolid(guess) ? t.FLOOR : guess;
  }

  /* ---------- Zeichnen ---------- */

  W.draw = function () {
    if (!W.map) return;
    var m = W.map;
    GFX.clear(m.bg || '#000');

    var ox = Math.round(W.camX), oy = Math.round(W.camY);
    var x0 = Math.floor(ox / TS), y0 = Math.floor(oy / TS);
    var cols = Math.ceil(GFX.VW / TS) + 1, rows = Math.ceil(GFX.VH / TS) + 1;

    for (var ty = y0; ty < y0 + rows; ty++) {
      for (var tx = x0; tx < x0 + cols; tx++) {
        var t = Maps.at(m, tx, ty);
        var img = GFX.atlas[t];
        if (!img) continue;
        GFX.ctx.drawImage(img, tx * TS - ox, ty * TS - oy);
      }
    }

    // NPCs + Spieler nach y sortiert
    var drawables = [];
    m.npcs.forEach(function (n) {
      var set = Sprites.npc[n.sprite] || Sprites.hero[n.sprite] || Sprites.npc.villager;
      drawables.push({ y: n.y, draw: function () { drawChar(set, n.x * TS - ox, n.y * TS - oy, n.dir, 0); } });
    });
    var px = lerpX() * TS - ox, py = lerpY() * TS - oy;
    drawables.push({ y: lerpY(), draw: function () {
      var lead = Game.party[0];
      var set = Sprites.hero[lead ? lead.sprite : 'alric'];
      drawChar(set, px, py, W.dir, W.moving ? W.frame : 0);
    } });
    // Begleiter (dezent hinter dem Anführer)
    drawables.sort(function (a, b) { return a.y - b.y; });
    drawables.forEach(function (d) { d.draw(); });

    // Dunkelheit
    if (m.dark > 0) drawDarkness(px + 8, py + 8, m.dark);

    // Ortsbanner
    if (W.banner > 0) {
      var a = Math.min(1, W.banner);
      GFX.ctx.save(); GFX.ctx.globalAlpha = Math.min(1, W.banner * 1.4);
      var bw = Font.width(W.bannerText) + 20;
      UI.panel(Math.round((GFX.VW - bw) / 2), 8, bw, 16);
      UI.textC(W.bannerText, GFX.VW / 2, 13, '#ffe45c');
      GFX.ctx.restore();
    }

    if (W.transition > 0) GFX.fade(1 - W.transition / .28);
    if (W.fadeIn > 0) GFX.fade(W.fadeIn / .3);
  };

  function drawChar(set, x, y, dir, frame) {
    if (!set) return;
    var flip = dir === 'right';
    var arr = set[dir === 'right' ? 'left' : dir] || set.down;
    var spr = arr[frame % arr.length];
    // Schatten
    GFX.ctx.save(); GFX.ctx.globalAlpha = .28;
    GFX.rect(Math.round(x) + 3, Math.round(y) + 14, 10, 3, '#000');
    GFX.ctx.restore();
    GFX.draw(spr, x, y - 2, 1, flip);
  }

  function drawDarkness(cx, cy, amount) {
    var c = GFX.ctx;
    var r = 68;
    var outer = Math.min(.92, amount * 1.5);
    var g = c.createRadialGradient(cx, cy, 8, cx, cy, r);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(.45, 'rgba(0,0,0,' + (outer * .3).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(0,0,0,' + outer.toFixed(3) + ')');
    c.save();
    c.fillStyle = g;
    c.fillRect(0, 0, GFX.VW, GFX.VH);
    c.restore();
  }

  global.World = W;
})(window);
