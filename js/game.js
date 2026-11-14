/* ============================================================
   game.js  --  Spielzustand, Menüs, Story, Speichern, Hauptschleife
   ============================================================ */
(function (global) {
  'use strict';

  var Game = {
    state: 'title', party: [], items: {}, gear: {}, gold: 300,
    flags: { crystals: 0, events: {}, chests: {}, quest: false, recruited: {} },
    mapId: null, px: 0, py: 0, time: 0, version: 1
  };

  var SAVE_KEY = 'aetheria_save_v1';

  /* ============================================================
     Charaktere
     ============================================================ */

  function recalc(a) {
    var d = Data.CHARS[a.id];
    var n = a.lvl - 1;
    a.stats = {};
    for (var k in d.base) a.stats[k] = Math.round(d.base[k] + d.grow[k] * n);
    a.maxhp = a.stats.hp + equipMod(a, 'hp');
    a.maxmp = a.stats.mp + equipMod(a, 'mp');
    if (a.hp == null) a.hp = a.maxhp;
    if (a.mp == null) a.mp = a.maxmp;
    a.hp = Math.min(a.hp, a.maxhp);
    a.mp = Math.min(a.mp, a.maxmp);
  }

  function equipMod(a, key) {
    var sum = 0;
    ['weapon', 'armor', 'acc'].forEach(function (s) {
      var e = Data.EQUIP[a.equip[s]];
      if (e && e.mods && e.mods[key]) sum += e.mods[key];
    });
    return sum;
  }

  Game.stat = function (a, key) {
    if (key === 'hp') return a.maxhp;
    if (key === 'mp') return a.maxmp;
    return Math.max(1, (a.stats[key] || 0) + equipMod(a, key));
  };

  Game.weaponElement = function (a) {
    var e = Data.EQUIP[a.equip.weapon];
    return e ? e.element : null;
  };

  function learnAll(a) {
    var d = Data.CHARS[a.id];
    a.spells = []; a.abilities = [];
    d.spells.forEach(function (p) { if (a.lvl >= p[0] && a.spells.indexOf(p[1]) < 0) a.spells.push(p[1]); });
    d.abilities.forEach(function (p) { if (a.lvl >= p[0] && a.abilities.indexOf(p[1]) < 0) a.abilities.push(p[1]); });
  }

  Game.makeActor = function (id, lvl) {
    var d = Data.CHARS[id];
    var a = {
      id: id, name: d.name, cls: d.cls, sprite: d.sprite,
      lvl: 1, xp: 0, hp: null, mp: null,
      equip: { weapon: d.equip.weapon, armor: d.equip.armor, acc: d.equip.acc },
      status: {}, buffs: {}, isEnemy: false
    };
    recalc(a);
    a.hp = a.maxhp; a.mp = a.maxmp;
    while (a.lvl < (lvl || 1)) {
      a.lvl++;
      recalc(a);
      a.hp = a.maxhp; a.mp = a.maxmp;
    }
    learnAll(a);
    return a;
  };

  Game.gainXp = function (a, amount) {
    var msgs = [];
    if (a.lvl >= Data.MAX_LEVEL) return msgs;
    a.xp += amount;
    while (a.lvl < Data.MAX_LEVEL && a.xp >= Data.xpToNext(a.lvl)) {
      a.xp -= Data.xpToNext(a.lvl);
      a.lvl++;
      var before = { hp: a.maxhp, mp: a.maxmp };
      var learnedBefore = a.spells.length + a.abilities.length;
      recalc(a);
      a.hp += (a.maxhp - before.hp);
      a.mp += (a.maxmp - before.mp);
      learnAll(a);
      msgs.push(a.name + ' erreicht Stufe ' + a.lvl + '!');
      if (a.spells.length + a.abilities.length > learnedBefore) {
        var nw = a.spells.concat(a.abilities);
        var last = nw[nw.length - 1];
        var def = Data.SPELLS[last] || Data.ABILITIES[last];
        if (def) msgs.push(a.name + ' erlernt ' + def.name + '!');
      }
      Sound.sfx('levelup');
    }
    return msgs;
  };

  /* ============================================================
     Inventar
     ============================================================ */

  Game.addItem = function (id, n) {
    n = n || 1;
    if (Data.ITEMS[id]) Game.items[id] = (Game.items[id] || 0) + n;
    else if (Data.EQUIP[id]) Game.gear[id] = (Game.gear[id] || 0) + n;
  };
  Game.removeItem = function (id, n) {
    n = n || 1;
    if (Data.ITEMS[id]) { Game.items[id] = Math.max(0, (Game.items[id] || 0) - n); if (!Game.items[id]) delete Game.items[id]; }
    else if (Data.EQUIP[id]) { Game.gear[id] = Math.max(0, (Game.gear[id] || 0) - n); if (!Game.gear[id]) delete Game.gear[id]; }
  };
  Game.itemCount = function (id) {
    return (Data.ITEMS[id] ? Game.items[id] : Game.gear[id]) || 0;
  };
  Game.defOf = function (id) { return Data.ITEMS[id] || Data.EQUIP[id]; };

  /* ============================================================
     Neues Spiel / Speichern
     ============================================================ */

  Game.newGame = function () {
    Game.party = [Game.makeActor('alric', 1), Game.makeActor('lyra', 1)];
    Game.items = { trank: 5, antidot: 2, phoenix: 1 };
    Game.gear = {};
    Game.gold = 300;
    Game.flags = { crystals: 0, events: {}, chests: {}, quest: false, recruited: {} };
    Game.time = 0;
    Game.wx = null; Game.wy = null;
    Maps.reset();
    Game.state = 'world';
    World.enter('aldenmark_castle', 10, 12, 'up');
    setTimeout(function () { introScene(); }, 300);
  };

  Game.save = function () {
    var data = {
      v: Game.version, gold: Game.gold, items: Game.items, gear: Game.gear,
      flags: Game.flags, mapId: Game.mapId, px: Game.px, py: Game.py,
      time: Game.time, wx: Game.wx, wy: Game.wy,
      party: Game.party.map(function (a) {
        return { id: a.id, lvl: a.lvl, xp: a.xp, hp: a.hp, mp: a.mp, equip: a.equip };
      })
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) { return false; }
  };

  Game.hasSave = function () {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  };

  Game.load = function () {
    var raw;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
    if (!raw) return false;
    var d;
    try { d = JSON.parse(raw); } catch (e) { return false; }
    Maps.reset();
    Game.gold = d.gold; Game.items = d.items || {}; Game.gear = d.gear || {};
    Game.flags = d.flags || { crystals: 0, events: {}, chests: {}, recruited: {} };
    Game.flags.events = Game.flags.events || {};
    Game.flags.chests = Game.flags.chests || {};
    Game.flags.recruited = Game.flags.recruited || {};
    Game.time = d.time || 0;
    Game.wx = d.wx; Game.wy = d.wy;
    Game.party = d.party.map(function (p) {
      var a = Game.makeActor(p.id, p.lvl);
      a.xp = p.xp; a.equip = p.equip;
      recalc(a);
      a.hp = Math.min(p.hp, a.maxhp); a.mp = Math.min(p.mp, a.maxmp);
      learnAll(a);
      return a;
    });
    Game.state = 'world';
    World.enter(d.mapId, d.px, d.py, 'down');
    return true;
  };

  /* ============================================================
     Story
     ============================================================ */

  function introScene() {
    UI.say([
      'Aetheria stirbt.',
      'Vier Kristalle hielten die Welt im Gleichgewicht -',
      'Feuer, Eis, Wind und Erde.',
      '',
      'Doch Malkoth, der Schattenfürst, hat sie entweiht.',
      'Flüsse versiegen, Felder verdorren, die Nächte werden länger.',
      '',
      'König Aldric hat seinen treuesten Hauptmann rufen lassen...'
    ], function () {
      UI.say([
        'Alric, mein treuester Hauptmann.',
        'Vier Wächter halten die Kristalle in ihrer Gewalt.',
        'Brich ihre Macht, und die Kristalle werden wieder leuchten.',
        '',
        'Erst dann fällt die Barriere um die Finsterburg.',
        'Lyra vom Lichttempel wird dich begleiten.',
        'Geh - und rette, was noch zu retten ist!'
      ], function () {
        Game.flags.quest = true;
        UI.say(['Lyra schließt sich der Gruppe an!'], function () {
          Sound.sfx('levelup');
        }, { speaker: 'Lyra' });
      }, { speaker: 'König Aldric' });
    });
  }

  Game.talkKing = function (npc) {
    var lines = typeof npc.lines === 'function' ? npc.lines(Game) : npc.lines;
    if (Game.flags.quest) lines = lines.concat(['', Game.goal().text]);
    UI.say(lines, null, { speaker: npc.name });
  };

  Game.recruitNpc = function (npc) {
    if (Game.flags.recruited[npc.recruit]) {
      UI.say(npc.afterLines || ['...'], null, { speaker: npc.name });
      return;
    }
    UI.say(npc.lines, function () {
      Game.flags.recruited[npc.recruit] = true;
      var avg = Math.round(Game.party.reduce(function (s, a) { return s + a.lvl; }, 0) / Game.party.length);
      var a = Game.makeActor(npc.recruit, Math.max(1, avg));
      Game.party.push(a);
      // NPC von der Karte entfernen
      var m = World.map;
      var i = m.npcs.indexOf(npc);
      if (i >= 0) m.npcs.splice(i, 1);
      Sound.sfx('levelup');
      UI.say([a.name + ' (' + a.cls + ') schließt sich der Gruppe an!']);
    }, { speaker: npc.name });
  };

  /* ---------- Ereignisse (Bosse) ---------- */

  Game.runEvent = function (ev, map) {
    if (Game.flags.events[ev.id]) return;
    var boss = map.boss;
    if (!boss || boss.event !== ev.id) return;

    UI.say([boss.intro], function () {
      Game.state = 'battle';
      Battle.start([boss.enemy], {
        boss: true, music: 'boss', intro: boss.intro, bg: '#1a0f2a',
        onWin: function () {
          Game.flags.events[ev.id] = true;
          Game.state = 'world';
          if (boss.crystal) {
            Game.flags.crystals++;
            var cr = Data.CRYSTALS.filter(function (c) { return c.id === boss.crystal; })[0];
            if (map.altar) Maps.set(map, map.altar.x, map.altar.y, GFX.TILE.CRYSTAL);
            Sound.play(map.music);
            UI.say([
              'Der Wächter zerfällt zu Asche.',
              'Über dem Sockel erwacht der ' + cr.name + '!',
              '',
              cr.name + ' wiederhergestellt (' + Game.flags.crystals + '/4).',
              Game.flags.crystals >= 4
                ? 'Alle vier Kristalle leuchten. Die Barriere der Finsterburg fällt!'
                : 'Noch ' + (4 - Game.flags.crystals) + ' Kristalle harren ihrer Befreiung.'
            ]);
          } else {
            endingScene();
          }
        },
        onLose: function () { gameOver(); }
      });
    });
  };

  function endingScene() {
    Game.state = 'ending';
    Sound.play('ending', true);
    UI.say([
      'Malkoth sinkt in sich zusammen.',
      '"Ich wollte... nur nicht vergessen werden..."',
      '',
      'Dann ist der Schatten fort.',
      '',
      'Über Aetheria bricht ein Morgen an, wie ihn seit',
      'Generationen niemand gesehen hat.',
      'Die Flüsse füllen sich. Die Felder ergrünen.',
      '',
      'Vier Kristalle leuchten wieder über der Welt -',
      'und vier Gefährten kehren heim.',
      '',
      'ENDE',
      '',
      'Danke fürs Spielen!'
    ], function () {
      Game.endingHold = true;
    });
  }

  function gameOver() {
    Game.state = 'gameover';
    Game.gameOverT = 0;
  }

  /* ============================================================
     Zufallskämpfe
     ============================================================ */

  Game.startRandomBattle = function (table) {
    var avg = Game.party.reduce(function (s, a) { return s + a.lvl; }, 0) / Game.party.length;
    var group = Data.rollEncounter(table, avg);
    Sound.sfx('encounter');
    Game.state = 'battle';
    Game.battleFlash = .45;
    var bgs = { snow: '#1a2a44', desert: '#3a2c18', volcano: '#2a1008',
                dark: '#140c22', forest: '#12261a', swamp: '#16200f',
                mountain: '#1c2230', grass: '#101828' };
    Battle.start(group, {
      bg: bgs[table] || '#101828',
      onWin: function () { Game.state = 'world'; Sound.play(World.map.music); },
      onFlee: function () { Game.state = 'world'; Sound.play(World.map.music); },
      onLose: function () { gameOver(); }
    });
  };

  /* ============================================================
     Laden & Gasthaus
     ============================================================ */

  Game.openShop = function (shopId, npc) {
    var shop = Data.SHOPS[shopId];
    UI.say(npc.lines || ['Willkommen!'], function () { shopMenu(shop); }, { speaker: npc.name });
  };

  function shopMenu(shop) {
    UI.menu({
      x: 96, y: 78, w: 128, rows: 3, title: shop.name,
      items: [{ label: 'Kaufen', key: 'buy' }, { label: 'Verkaufen', key: 'sell' }, { label: 'Verlassen', key: 'exit' }],
      onSelect: function (it) {
        if (it.key === 'exit') { UI.pop(); return; }
        if (it.key === 'buy') buyMenu(shop);
        else sellMenu(shop);
      },
      footer: function () { return 'Gold: ' + Game.gold; }
    });
  }

  function buyMenu(shop) {
    var items = shop.stock.map(function (id) {
      var d = Game.defOf(id);
      return { label: d.name, right: d.price, key: id,
               disabled: d.price > Game.gold,
               rightColor: d.price > Game.gold ? '#8a5a5a' : '#ffe45c' };
    });
    UI.menu({
      x: 40, y: 40, w: 240, rows: 8, title: 'Kaufen  (Gold: ' + Game.gold + ')',
      items: items,
      footer: function (it) { return it ? describe(it.key) : ''; },
      onSelect: function (it, i, modal) {
        var d = Game.defOf(it.key);
        if (Game.gold < d.price) { Sound.sfx('error'); return; }
        Game.gold -= d.price;
        Game.addItem(it.key, 1);
        Sound.sfx('gold');
        UI.notice(d.name + ' gekauft!');
        modal.cfg.title = 'Kaufen  (Gold: ' + Game.gold + ')';
        modal.cfg.items.forEach(function (x) {
          var dd = Game.defOf(x.key);
          x.disabled = dd.price > Game.gold;
          x.rightColor = x.disabled ? '#8a5a5a' : '#ffe45c';
        });
      }
    });
  }

  function sellMenu(shop) {
    var items = [];
    var src = shop.kind === 'item' ? Game.items : Game.gear;
    for (var id in src) {
      if (!src[id]) continue;
      var d = Game.defOf(id);
      if (!d || d.price == null || d.price === 0) continue;
      items.push({ label: d.name, right: 'x' + src[id] + '  ' + Math.floor(d.price / 2) + 'G', key: id });
    }
    if (!items.length) { UI.notice('Nichts zu verkaufen.'); Sound.sfx('error'); return; }
    UI.menu({
      x: 40, y: 40, w: 240, rows: 8, title: 'Verkaufen', items: items,
      footer: function (it) { return it ? describe(it.key) : ''; },
      onSelect: function (it, i, modal) {
        var d = Game.defOf(it.key);
        Game.gold += Math.floor(d.price / 2);
        Game.removeItem(it.key, 1);
        Sound.sfx('gold');
        var left = Game.itemCount(it.key);
        if (!left) {
          modal.cfg.items.splice(i, 1);
          if (modal.index >= modal.cfg.items.length) modal.index = Math.max(0, modal.cfg.items.length - 1);
          if (!modal.cfg.items.length) UI.pop();
        } else it.right = 'x' + left + '  ' + Math.floor(d.price / 2) + 'G';
      }
    });
  }

  function describe(id) {
    var d = Game.defOf(id);
    if (!d) return '';
    if (d.slot) {
      var parts = [];
      for (var k in d.mods) parts.push(k.toUpperCase() + (d.mods[k] > 0 ? '+' : '') + d.mods[k]);
      return parts.join(' ');
    }
    return d.desc || '';
  }

  Game.openInn = function (npc) {
    var price = npc.inn;
    UI.confirm('Übernachten für ' + price + ' Gold?', function () {
      if (Game.gold < price) { UI.say('Dafür reicht dein Gold nicht.'); Sound.sfx('error'); return; }
      Game.gold -= price;
      Game.party.forEach(function (a) { a.hp = a.maxhp; a.mp = a.maxmp; a.status = {}; });
      Sound.sfx('heal');
      UI.say(['Ihr schlaft tief und fest...', 'KP und MP vollständig wiederhergestellt!'], function () {
        UI.confirm('Spielstand speichern?', function () {
          if (Game.save()) UI.say('Spielstand gespeichert.');
          else UI.say('Speichern fehlgeschlagen.');
        });
      });
    });
  };

  /* ============================================================
     Hauptmenü
     ============================================================ */

  Game.openMenu = function () {
    Sound.sfx('confirm');
    UI.push(mainMenuModal());
  };

  function mainMenuModal() {
    var cmds = [
      { label: 'Item', key: 'item' },
      { label: 'Magie', key: 'magic' },
      { label: 'Ausrüstung', key: 'equip' },
      { label: 'Status', key: 'status' },
      { label: 'Karte', key: 'map' },
      { label: 'Speichern', key: 'save' },
      { label: 'Zurück', key: 'back' }
    ];
    var idx = 0;
    var modal = {
      key: function (k) {
        if (k === 'up') { idx = (idx + cmds.length - 1) % cmds.length; Sound.sfx('cursor'); }
        else if (k === 'down') { idx = (idx + 1) % cmds.length; Sound.sfx('cursor'); }
        else if (k === 'cancel' || k === 'menu') { Sound.sfx('cancel'); UI.pop(); }
        else if (k === 'confirm') {
          Sound.sfx('confirm');
          var c = cmds[idx].key;
          if (c === 'back') { UI.pop(); return; }
          if (c === 'item') itemMenu();
          else if (c === 'magic') pickMember('Magie', function (a) { fieldMagicMenu(a); }, function (a) { return a.spells.length > 0; });
          else if (c === 'equip') pickMember('Ausrüstung', function (a) { equipMenu(a); });
          else if (c === 'status') pickMember('Status', function (a) { statusScreen(a); });
          else if (c === 'map') mapScreen();
          else if (c === 'save') {
            UI.confirm('Spielstand speichern?', function () {
              if (Game.save()) { Sound.sfx('confirm'); UI.notice('Gespeichert!'); }
              else UI.say('Speichern fehlgeschlagen.');
            });
          }
        }
      },
      draw: function () {
        // Befehlsspalte
        UI.panel(4, 4, 86, 105);
        for (var i = 0; i < cmds.length; i++) {
          var y = 12 + i * 13;
          if (i === idx) UI.cursor(10, y);
          UI.text(cmds[i].label, 20, y, i === idx ? UI.COL.sel : UI.COL.text);
        }
        // Info
        UI.panel(4, 112, 86, 54);
        UI.text('Gold', 12, 118, UI.COL.dim);
        UI.textR(String(Game.gold), 82, 118, '#ffe45c');
        UI.text('Zeit', 12, 130, UI.COL.dim);
        UI.textR(fmtTime(Game.time), 82, 130, UI.COL.text);
        UI.text('Kristalle', 12, 142, UI.COL.dim);
        for (var c = 0; c < 4; c++) {
          var got = c < Game.flags.crystals;
          var col = got ? Data.CRYSTALS[c].color : '#2a3050';
          var cx2 = 22 + c * 14, cy2 = 153;
          GFX.rect(cx2 + 1, cy2, 5, 3, col);
          GFX.rect(cx2, cy2 + 3, 7, 3, col);
          GFX.rect(cx2 + 1, cy2 + 6, 5, 2, col);
          GFX.rect(cx2 + 2, cy2 + 8, 3, 1, col);
          if (got) GFX.rect(cx2 + 2, cy2 + 1, 1, 4, '#ffffff');
        }
        // Gruppe
        UI.panel(94, 4, 222, 232);
        Game.party.forEach(function (a, i) {
          var x = 104, y = 12 + i * 56;
          var set = Sprites.hero[a.sprite];
          if (set) GFX.draw(set.down[0], x, y + 6, 1);
          UI.text(a.name, x + 24, y, a.hp > 0 ? UI.COL.text : '#e05050');
          UI.text(a.cls, x + 24, y + 10, UI.COL.dim);
          UI.text('St.' + a.lvl, x + 150, y, UI.COL.sel);
          UI.text('KP', x + 24, y + 22, UI.COL.dim);
          UI.text(a.hp + '/' + a.maxhp, x + 42, y + 22, UI.hpColor(a.hp, a.maxhp));
          UI.bar(x + 110, y + 23, 80, 5, a.hp, a.maxhp, UI.hpColor(a.hp, a.maxhp));
          UI.text('MP', x + 24, y + 32, UI.COL.dim);
          UI.text(a.mp + '/' + a.maxmp, x + 42, y + 32, UI.COL.mp);
          UI.bar(x + 110, y + 33, 80, 5, a.mp, a.maxmp, UI.COL.mp);
          var need = Data.xpToNext(a.lvl);
          var maxed = a.lvl >= Data.MAX_LEVEL;
          UI.text('EXP', x + 24, y + 42, UI.COL.dim);
          UI.textR(maxed ? 'MAX' : String(need - a.xp), x + 106, y + 42, UI.COL.dim);
          UI.bar(x + 110, y + 43, 80, 4, maxed ? 1 : a.xp, maxed ? 1 : need, UI.COL.xp);
          // Statusleiden
          var sx = x + 150;
          for (var k in a.status) { if (a.status[k]) { UI.text(Data.STATUS[k].short, sx, y + 10, Data.STATUS[k].color); sx += 20; } }
        });
      }
    };
    return modal;
  }

  function fmtTime(sec) {
    var h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function pickMember(title, cb, filter) {
    var items = Game.party.map(function (a, i) {
      return { label: a.name, right: 'St.' + a.lvl, key: i,
               disabled: filter ? !filter(a) : false,
               color: a.hp > 0 ? UI.COL.text : '#e05050' };
    });
    UI.menu({
      x: 96, y: 60, w: 130, rows: 4, title: title, items: items,
      onSelect: function (it) { cb(Game.party[it.key]); }
    });
  }

  /* ---------- Items ---------- */

  function itemMenu() {
    var items = buildItemList();
    if (!items.length) { UI.notice('Keine Items.'); Sound.sfx('error'); return; }
    var modal = UI.menu({
      x: 40, y: 30, w: 240, rows: 10, title: 'Items', items: items,
      footer: function (it) { return it ? (Data.ITEMS[it.key].desc || '') : ''; },
      onSelect: function (it) { useItem(it.key, modal); }
    });
  }

  function buildItemList() {
    var out = [];
    for (var id in Game.items) {
      if (!Game.items[id]) continue;
      var d = Data.ITEMS[id];
      if (!d) continue;
      out.push({ label: d.name, right: 'x' + Game.items[id], key: id });
    }
    return out;
  }

  function useItem(id, modal) {
    var d = Data.ITEMS[id];
    if (d.kind === 'key') { UI.say(d.desc); return; }
    if (d.kind === 'tent') {
      if (World.map && World.map.id === 'world') {
        Game.removeItem(id, 1);
        Game.party.forEach(function (a) { a.hp = a.maxhp; a.mp = a.maxmp; a.status = {}; });
        Sound.sfx('heal');
        UI.say('Die Gruppe rastet. Alle Werte wiederhergestellt!', function () { refresh(modal); });
      } else { Sound.sfx('error'); UI.notice('Nur auf der Weltkarte nutzbar.'); }
      return;
    }
    if (d.kind === 'attack') { Sound.sfx('error'); UI.notice('Nur im Kampf nutzbar.'); return; }

    pickMember('Auf wen?', function (a) {
      var ok = false, msg = '';
      switch (d.kind) {
        case 'heal':
          if (a.hp <= 0) { msg = 'Hat keine Wirkung.'; break; }
          var amt = Math.min(d.power >= 9999 ? a.maxhp : d.power, a.maxhp - a.hp);
          if (amt <= 0) { msg = a.name + ' ist bei voller Kraft.'; break; }
          a.hp += amt; ok = true; msg = a.name + ' erholt sich um ' + amt + ' KP.'; break;
        case 'mp':
          var am = Math.min(d.power, a.maxmp - a.mp);
          if (am <= 0) { msg = a.name + ' hat volle MP.'; break; }
          a.mp += am; ok = true; msg = a.name + ' erhält ' + am + ' MP.'; break;
        case 'full':
          if (a.hp >= a.maxhp && a.mp >= a.maxmp) { msg = 'Hat keine Wirkung.'; break; }
          a.hp = a.maxhp; a.mp = a.maxmp; a.status = {}; ok = true;
          msg = a.name + ' ist vollständig wiederhergestellt!'; break;
        case 'revive':
          if (a.hp > 0) { msg = a.name + ' lebt bereits.'; break; }
          a.hp = Math.max(1, Math.round(a.maxhp * d.power)); ok = true;
          msg = a.name + ' kehrt ins Leben zurück!'; break;
        case 'cure':
          if (!a.status[d.status]) { msg = 'Hat keine Wirkung.'; break; }
          delete a.status[d.status]; ok = true; msg = a.name + ' ist geheilt.'; break;
        case 'cureall':
          a.status = {}; ok = true; msg = a.name + ' ist gereinigt.'; break;
      }
      if (ok) { Game.removeItem(id, 1); Sound.sfx(d.kind === 'mp' ? 'magic' : 'heal'); }
      else Sound.sfx('error');
      UI.say(msg, function () { refresh(modal); });
    });
  }

  function refresh(modal) {
    if (!modal) return;
    var items = buildItemList();
    modal.cfg.items = items;
    if (modal.index >= items.length) modal.index = Math.max(0, items.length - 1);
    if (!items.length) UI.pop();
  }

  /* ---------- Feldmagie ---------- */

  function fieldMagicMenu(a) {
    var usable = a.spells.filter(function (id) {
      var s = Data.SPELLS[id];
      return s.kind === 'heal' || s.kind === 'cure' || s.kind === 'revive';
    });
    if (!usable.length) { Sound.sfx('error'); UI.notice('Keine Feldzauber.'); return; }
    var items = usable.map(function (id) {
      var s = Data.SPELLS[id];
      return { label: s.name, right: s.mp, key: id, disabled: a.mp < s.mp,
               rightColor: a.mp < s.mp ? '#8a5a5a' : UI.COL.mp };
    });
    UI.menu({
      x: 70, y: 50, w: 180, rows: 8, title: a.name + ' - Magie', items: items,
      footer: function (it) { return it ? Data.SPELLS[it.key].desc : ''; },
      onSelect: function (it) {
        var s = Data.SPELLS[it.key];
        if (a.mp < s.mp) { Sound.sfx('error'); return; }
        if (s.target === 'allies') {
          a.mp -= s.mp;
          Game.party.forEach(function (t) {
            if (t.hp <= 0) return;
            t.hp = Math.min(t.maxhp, t.hp + Math.round(s.power * (1 + Game.stat(a, 'mag') / 70)));
          });
          Sound.sfx('heal');
          UI.say(a.name + ' wirkt ' + s.name + ' auf die Gruppe.');
          return;
        }
        pickMember('Auf wen?', function (t) {
          if (a.mp < s.mp) { Sound.sfx('error'); return; }
          var msg = '';
          if (s.kind === 'heal') {
            if (t.hp <= 0) { UI.say('Hat keine Wirkung.'); return; }
            var amt = Math.min(Math.round(s.power * (1 + Game.stat(a, 'mag') / 70)), t.maxhp - t.hp);
            if (amt <= 0) { UI.say(t.name + ' ist bei voller Kraft.'); return; }
            t.hp += amt; msg = t.name + ' erholt sich um ' + amt + ' KP.';
          } else if (s.kind === 'cure') {
            var any = Object.keys(t.status).length;
            if (!any) { UI.say('Hat keine Wirkung.'); return; }
            t.status = {}; msg = t.name + ' ist gereinigt.';
          } else if (s.kind === 'revive') {
            if (t.hp > 0) { UI.say(t.name + ' lebt bereits.'); return; }
            t.hp = Math.max(1, Math.round(t.maxhp * s.power));
            msg = t.name + ' kehrt ins Leben zurück!';
          }
          a.mp -= s.mp;
          Sound.sfx('heal');
          UI.say(msg);
        });
      }
    });
  }

  /* ---------- Ausrüstung ---------- */

  function equipMenu(a) {
    var slots = [
      { label: 'Waffe', slot: 'weapon' },
      { label: 'Rüstung', slot: 'armor' },
      { label: 'Accessoire', slot: 'acc' }
    ];
    var modal = UI.menu({
      x: 20, y: 40, w: 190, rows: 3, title: a.name + ' - Ausrüstung',
      itemH: 13,
      items: slots.map(function (s) {
        var e = Data.EQUIP[a.equip[s.slot]];
        return { label: s.label, right: e ? e.name : '-', key: s.slot };
      }),
      onSelect: function (it) { slotChoice(a, it.key, modal); },
      onMove: function () {}
    });
    modal.statsFor = a;
    var baseDraw = modal.draw;
    modal.draw = function () {
      baseDraw();
      drawStatBox(a, 214, 40);
    };
  }

  function slotChoice(a, slot, parent) {
    var allowed = Data.SLOT_KINDS[a.id][slot === 'acc' ? 'acc' : slot] || ['acc'];
    var items = [{ label: '(nichts)', key: null, right: '' }];
    for (var id in Game.gear) {
      if (!Game.gear[id]) continue;
      var e = Data.EQUIP[id];
      if (e.slot !== slot) continue;
      if (slot !== 'acc' && allowed.indexOf(e.kind) < 0) continue;
      items.push({ label: e.name, key: id, right: 'x' + Game.gear[id] });
    }
    if (items.length === 1) { Sound.sfx('error'); UI.notice('Nichts Passendes im Gepäck.'); return; }
    UI.menu({
      x: 20, y: 96, w: 190, rows: 7, title: 'Anlegen', items: items,
      footer: function (it) { return it && it.key ? describe(it.key) : ''; },
      onSelect: function (it) {
        var old = a.equip[slot];
        if (old) Game.addItem(old, 1);
        if (it.key) Game.removeItem(it.key, 1);
        a.equip[slot] = it.key;
        recalc(a);
        Sound.sfx('confirm');
        UI.pop();
        // Anzeige im Elternmenü auffrischen
        parent.cfg.items.forEach(function (x) {
          var e = Data.EQUIP[a.equip[x.key]];
          x.right = e ? e.name : '-';
        });
      }
    });
  }

  function drawStatBox(a, x, y) {
    UI.panel(x, y, 96, 116);
    UI.text(a.name, x + 8, y + 6, UI.COL.sel);
    var keys = [['atk', 'ANG'], ['def', 'ABW'], ['mag', 'MAG'], ['res', 'RES'],
                ['spd', 'TMP'], ['luk', 'GLK']];
    keys.forEach(function (k, i) {
      var ly = y + 20 + i * 12;
      UI.text(k[1], x + 8, ly, UI.COL.dim);
      UI.textR(String(Game.stat(a, k[0])), x + 88, ly, UI.COL.text);
    });
    UI.text('KP', x + 8, y + 94, UI.COL.dim);
    UI.textR(String(a.maxhp), x + 88, y + 94, UI.COL.hp);
    UI.text('MP', x + 8, y + 104, UI.COL.dim);
    UI.textR(String(a.maxmp), x + 88, y + 104, UI.COL.mp);
  }

  /* ---------- Status ---------- */

  function statusScreen(a) {
    var modal = {
      key: function (k) { if (k === 'cancel' || k === 'confirm' || k === 'menu') { Sound.sfx('cancel'); UI.pop(); } },
      draw: function () {
        UI.panel(16, 14, 288, 212);
        var set = Sprites.hero[a.sprite];
        if (set) GFX.draw(set.down[0], 30, 26, 2);
        UI.text(a.name, 72, 26, UI.COL.sel);
        UI.text(a.cls, 72, 38, UI.COL.text);
        UI.text('Stufe ' + a.lvl, 72, 50, UI.COL.text);
        var need = Data.xpToNext(a.lvl);
        UI.text('EXP ' + a.xp + '/' + need, 72, 62, UI.COL.dim);

        UI.text('KP', 30, 82, UI.COL.dim);
        UI.text(a.hp + ' / ' + a.maxhp, 52, 82, UI.hpColor(a.hp, a.maxhp));
        UI.bar(120, 83, 60, 5, a.hp, a.maxhp, UI.hpColor(a.hp, a.maxhp));
        UI.text('MP', 30, 94, UI.COL.dim);
        UI.text(a.mp + ' / ' + a.maxmp, 52, 94, UI.COL.mp);
        UI.bar(120, 95, 60, 5, a.mp, a.maxmp, UI.COL.mp);

        var keys = [['atk', 'Angriff'], ['def', 'Abwehr'], ['mag', 'Magie'],
                    ['res', 'Resistenz'], ['spd', 'Tempo'], ['luk', 'Glück']];
        keys.forEach(function (k, i) {
          var y = 112 + i * 12;
          UI.text(k[1], 30, y, UI.COL.dim);
          UI.textR(String(Game.stat(a, k[0])), 130, y, UI.COL.text);
        });

        UI.text('Ausrüstung', 190, 82, UI.COL.sel);
        ['weapon', 'armor', 'acc'].forEach(function (s, i) {
          var e = Data.EQUIP[a.equip[s]];
          UI.text(e ? e.name : '-', 190, 96 + i * 12, UI.COL.text);
        });

        var skills = a.spells.concat(a.abilities);
        UI.text('Fähigkeiten', 190, 138, UI.COL.sel);
        for (var i = 0; i < Math.min(6, skills.length); i++) {
          var d = Data.SPELLS[skills[i]] || Data.ABILITIES[skills[i]];
          UI.text(d.name, 190, 152 + i * 11, UI.COL.text);
        }
        if (skills.length > 6) UI.text('+' + (skills.length - 6) + ' weitere', 190, 218, UI.COL.dim);

        var bio = Font.wrap(Data.CHARS[a.id].bio, 150);
        bio.forEach(function (l, i) { UI.text(l, 30, 190 + i * 11, UI.COL.dim); });
      }
    };
    UI.push(modal);
  }


  /* ============================================================
     Zielhinweis & Weltkarte
     ============================================================ */

  /** Naechstes Etappenziel: Text + Schluessel der Landmarke. */
  Game.goal = function () {
    var f = Game.flags, ev = f.events, r = f.recruited;
    if (!r.faelan) return { key: 'selvia', text: 'Ziel: Sucht in Hafen Selvia im Südosten nach dem Magier Faelan.' };
    if (!ev.boss_fire) return { key: 'cave', text: 'Ziel: Die Feuerhöhle im Aschland westlich von Aldenmark.' };
    if (!r.nyx) return { key: 'nordheim', text: 'Ziel: Reist nach Nordheim im Schneeland - dort wartet Verstärkung.' };
    if (!ev.boss_ice) return { key: 'icetemple', text: 'Ziel: Der Eistempel östlich von Nordheim.' };
    if (!ev.boss_wind) return { key: 'windtower', text: 'Ziel: Der Windturm im Osthochland.' };
    if (!ev.boss_earth) return { key: 'earthruin', text: 'Ziel: Die Erdruinen in der Wüste im Südosten.' };
    if (!ev.boss_final) return { key: 'fortress', text: 'Ziel: Die Finsterburg im Herzen des Finsterlands. Die Barriere ist gefallen!' };
    return { key: 'aldenmark', text: 'Aetheria ist gerettet.' };
  };

  var MAP_COLORS = null, mapImg = null, mapImgFor = null;

  function worldImage(m) {
    if (mapImg && mapImgFor === m) return mapImg;
    var T = GFX.TILE;
    if (!MAP_COLORS) {
      MAP_COLORS = {};
      MAP_COLORS[T.GRASS] = '#3d8340'; MAP_COLORS[T.FLOWER] = '#4f9c46'; MAP_COLORS[T.TREE] = '#1f5527';
      MAP_COLORS[T.WATER] = '#1c3f8f'; MAP_COLORS[T.SHALLOW] = '#3a72c9'; MAP_COLORS[T.MOUNT] = '#8d8475';
      MAP_COLORS[T.HILL] = '#5c8f47'; MAP_COLORS[T.ROCK] = '#7d7466'; MAP_COLORS[T.SAND] = '#d8b878';
      MAP_COLORS[T.PALM] = '#b8a060'; MAP_COLORS[T.SNOW] = '#e4ebf5'; MAP_COLORS[T.SNOWTREE] = '#9fc0b0';
      MAP_COLORS[T.SWAMP] = '#3a4a2c'; MAP_COLORS[T.DEADTREE] = '#2b2a22'; MAP_COLORS[T.ROAD] = '#c7ab80';
      MAP_COLORS[T.BRIDGE] = '#8a6134'; MAP_COLORS[T.VOLCANO] = '#6b3a2a'; MAP_COLORS[T.CHEST] = '#3d8340';
    }
    var cv = document.createElement('canvas');
    cv.width = m.w; cv.height = m.h;
    var c = cv.getContext('2d');
    for (var y = 0; y < m.h; y++) for (var x = 0; x < m.w; x++) {
      c.fillStyle = MAP_COLORS[Maps.at(m, x, y)] || '#3d8340';
      c.fillRect(x, y, 1, 1);
    }
    mapImg = cv; mapImgFor = m;
    return cv;
  }

  function mapScreen() {
    var m = Maps.get('world'), S = 3, ox = 12, oy = 24;
    var img = worldImage(m);
    var L = Maps.LANDMARKS;
    var order = [
      ['aldenmark', 'Aldenmark'], ['selvia', 'Selvia'], ['nordheim', 'Nordheim'],
      ['cave', 'Feuerhöhle', 'boss_fire'], ['icetemple', 'Eistempel', 'boss_ice'],
      ['windtower', 'Windturm', 'boss_wind'], ['earthruin', 'Erdruinen', 'boss_earth'],
      ['fortress', 'Festung', 'boss_final']
    ];
    var goal = Game.goal();
    var goalLines = Font.wrap(goal.text, 296);
    UI.push({
      key: function (k) {
        if (k === 'cancel' || k === 'confirm' || k === 'menu') { Sound.sfx('cancel'); UI.pop(); }
      },
      draw: function () {
        UI.panel(4, 4, 312, 232);
        UI.text('Weltkarte von Aetheria', 12, 10, UI.COL.sel);
        GFX.frame(ox - 1, oy - 1, m.w * S + 2, m.h * S + 2, UI.COL.edge2);
        GFX.ctx.drawImage(img, ox, oy, m.w * S, m.h * S);
        var blink = (UI.time % .7) < .4;

        order.forEach(function (o, i) {
          var lm = L[o[0]];
          var town = !o[2];
          var done = o[2] && Game.flags.events[o[2]];
          var col = town ? '#ffe45c' : (done ? '#7fd8ff' : '#ff5a4a');
          var mx = ox + lm.x * S - 1, my = oy + lm.y * S - 1;
          GFX.rect(mx - 1, my - 1, 7, 7, '#000814');
          GFX.rect(mx, my, 5, 5, col);
          if (o[0] === goal.key && blink) GFX.frame(mx - 3, my - 3, 11, 11, '#ffffff');
          UI.text(String(i + 1), mx + 7, my - 1, '#ffffff');
          // Legende
          var ly = 26 + i * 15;
          GFX.rect(238, ly + 1, 5, 5, col);
          UI.text((i + 1) + ' ' + o[1], 247, ly, o[0] === goal.key ? UI.COL.sel : UI.COL.text);
        });

        UI.text('Stadt', 247, 152, '#ffe45c');
        UI.text('Wächter', 247, 164, '#ff5a4a');
        UI.text('Befreit', 247, 176, '#7fd8ff');
        UI.text('Gruppe', 247, 188, '#ffffff');
        GFX.rect(238, 153, 5, 5, '#ffe45c'); GFX.rect(238, 165, 5, 5, '#ff5a4a');
        GFX.rect(238, 177, 5, 5, '#7fd8ff');
        GFX.rect(239, 189, 3, 5, '#ffffff'); GFX.rect(238, 190, 5, 3, '#ffffff');

        // Position der Gruppe
        var gx = Game.wx != null ? Game.wx : L.aldenmark.x;
        var gy = Game.wy != null ? Game.wy : L.aldenmark.y + 1;
        if (blink) {
          var px = ox + gx * S, py = oy + gy * S;
          GFX.rect(px - 2, py, 7, 3, '#000814'); GFX.rect(px, py - 2, 3, 7, '#000814');
          GFX.rect(px - 1, py + 1, 5, 1, '#ffffff'); GFX.rect(px + 1, py - 1, 1, 5, '#ffffff');
        }

        goalLines.forEach(function (l, i) { UI.text(l, 12, 210 + i * 11, i ? UI.COL.text : UI.COL.sel); });
      }
    });
  }

  /* ============================================================
     Titelbildschirm
     ============================================================ */

  var titleIdx = 0, titleT = 0;

  function drawTitle() {
    // Hintergrund: Sternenhimmel + Kristalle
    for (var y = 0; y < GFX.VH; y++) {
      var t = y / GFX.VH;
      GFX.rect(0, y, GFX.VW, 1, 'rgb(' + Math.round(8 + t * 20) + ',' + Math.round(10 + t * 16) + ',' + Math.round(32 + t * 40) + ')');
    }
    for (var i = 0; i < 60; i++) {
      var sx = (i * 71) % GFX.VW, sy = (i * 37) % 150;
      var tw = (Math.sin(titleT * 1.6 + i) + 1) / 2;
      if (tw > .45) GFX.rect(sx, sy, 1, 1, 'rgba(220,230,255,' + tw * .8 + ')');
    }
    // Bergsilhouette
    for (var x = 0; x < GFX.VW; x++) {
      var h = 40 + Math.sin(x * .05) * 12 + Math.sin(x * .017 + 2) * 18;
      GFX.rect(x, GFX.VH - h, 1, h, '#0b0e1c');
    }
    // Kristalle mit weichem Schein
    for (i = 0; i < 4; i++) {
      var cx = 76 + i * 56;
      var cy = 148 + Math.sin(titleT * 1.3 + i * 1.5) * 3;
      glow(cx, cy + 8, 20 + Math.sin(titleT * 2 + i) * 3, Data.CRYSTALS[i].color, .5);
      GFX.draw(Sprites.crystals[i], cx - 8, cy, 1);
    }

    // Titel
    var ty = 40;
    drawBigTitle('AETHERIA', GFX.VW / 2, ty);
    Font.drawCentered(GFX.ctx, 'C H R O N I K   D E R   V I E R   K R I S T A L L E',
      GFX.VW / 2, ty + 30, '#8fb0e8', '#000');

    // Menü
    var opts = [{ label: 'Neues Spiel' }];
    if (Game.hasSave()) opts.push({ label: 'Fortsetzen' });
    opts.push({ label: 'Musik: ' + (Sound.enabled ? 'An' : 'Aus') });
    titleOptions = opts;

    var my = 178;
    UI.panel(GFX.VW / 2 - 66, my - 8, 132, opts.length * 14 + 14);
    for (i = 0; i < opts.length; i++) {
      var oy = my + i * 14;
      if (i === titleIdx) UI.cursor(GFX.VW / 2 - 54, oy);
      Font.drawCentered(GFX.ctx, opts[i].label, GFX.VW / 2 + 4, oy,
        i === titleIdx ? UI.COL.sel : UI.COL.text, '#000');
    }
    Font.drawCentered(GFX.ctx, 'Enter = Auswählen', GFX.VW / 2, GFX.VH - 12, '#5f6a92', '#000');
  }

  var titleOptions = [];

  /** Weicher, farbiger Lichtschein. */
  function glow(cx, cy, r, color, alpha) {
    var c = GFX.ctx;
    var g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.save();
    c.globalAlpha = alpha;
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = g;
    c.fillRect(cx - r, cy - r, r * 2, r * 2);
    c.restore();
  }

  function drawBigTitle(text, cx, y) {
    var scale = 3;
    var w = Font.width(text) * scale;
    var x = Math.round(cx - w / 2);
    var c = GFX.ctx;
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    Font.draw(c, text, 0, 1, '#2a1c50');
    Font.draw(c, text, 0, 0, '#ffe45c');
    c.restore();
    // Unterstrich
    GFX.rect(x, y + 7 * scale + 3, w, 2, '#c9a83c');
  }

  function titleKey(k) {
    if (k === 'up') { titleIdx = (titleIdx + titleOptions.length - 1) % titleOptions.length; Sound.sfx('cursor'); }
    else if (k === 'down') { titleIdx = (titleIdx + 1) % titleOptions.length; Sound.sfx('cursor'); }
    else if (k === 'confirm') {
      Sound.sfx('confirm');
      var label = titleOptions[titleIdx].label;
      if (label === 'Neues Spiel') Game.newGame();
      else if (label === 'Fortsetzen') { if (!Game.load()) UI.say('Kein Spielstand gefunden.'); }
      else { Sound.toggle(); if (Sound.enabled) Sound.play('title', true); }
    }
  }

  /* ============================================================
     Game Over
     ============================================================ */

  function drawGameOver() {
    GFX.clear('#000');
    var a = Math.min(1, Game.gameOverT / 1.2);
    GFX.ctx.save(); GFX.ctx.globalAlpha = a;
    Font.drawCentered(GFX.ctx, 'D I E   G R U P P E   F I E L', GFX.VW / 2, 92, '#c04040', '#200');
    if (Game.gameOverT > 2) {
      Font.drawCentered(GFX.ctx, Game.hasSave() ? 'Enter: Letzten Spielstand laden'
        : 'Enter: Zurück zum Titel', GFX.VW / 2, 140, '#9aa6c8', '#000');
      Font.drawCentered(GFX.ctx, 'Esc: Titelbildschirm', GFX.VW / 2, 154, '#5f6a92', '#000');
    }
    GFX.ctx.restore();
  }

  function gameOverKey(k) {
    if (Game.gameOverT < 2) return;
    if (k === 'confirm') {
      if (Game.hasSave() && Game.load()) { Sound.play(World.map.music, true); return; }
      toTitle();
    } else if (k === 'cancel') toTitle();
  }

  function toTitle() {
    Game.state = 'title';
    titleIdx = 0;
    UI.clear();
    Sound.play('title', true);
  }

  /* ============================================================
     Eingabe
     ============================================================ */

  var Input = {
    down: {}, queue: [],
    map: {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right',
      W: 'up', S: 'down', A: 'left', D: 'right',
      Enter: 'confirm', ' ': 'confirm', z: 'confirm', Z: 'confirm',
      Escape: 'cancel', x: 'cancel', X: 'cancel', Backspace: 'cancel',
      Shift: 'run'
    },
    held: function (k) { return !!Input.down[k]; }
  };

  function keyName(e) {
    if (e.key === 'Shift') return 'run';
    return Input.map[e.key] || null;
  }

  window.addEventListener('keydown', function (e) {
    if (e.key === 'm' || e.key === 'M') {
      var on = Sound.toggle();
      UI.notice('Musik ' + (on ? 'an' : 'aus'));
      return;
    }
    var k = keyName(e);
    if (!k) return;
    e.preventDefault();
    Sound.unlock();
    if (!Input.down[k]) Input.queue.push(k);
    Input.down[k] = true;
  });
  window.addEventListener('keyup', function (e) {
    var k = keyName(e);
    if (k) { Input.down[k] = false; }
  });
  window.addEventListener('blur', function () { Input.down = {}; });

  // Touch-Steuerung
  function bindTouch() {
    var btns = document.querySelectorAll('.tb');
    Array.prototype.forEach.call(btns, function (b) {
      var key = b.getAttribute('data-key');
      var k = Input.map[key];
      function on(e) {
        e.preventDefault(); Sound.unlock();
        if (!Input.down[k]) Input.queue.push(k);
        Input.down[k] = true;
      }
      function off(e) { e.preventDefault(); Input.down[k] = false; }
      b.addEventListener('touchstart', on, { passive: false });
      b.addEventListener('touchend', off, { passive: false });
      b.addEventListener('touchcancel', off, { passive: false });
      b.addEventListener('mousedown', on);
      b.addEventListener('mouseup', off);
      b.addEventListener('mouseleave', off);
    });
  }

  function handleKey(k) {
    if (Game.state === 'title') { titleKey(k); return; }
    if (Game.state === 'gameover') { gameOverKey(k); return; }
    if (UI.busy()) { UI.key(k); return; }
    if (Game.state === 'ending') {
      if (Game.endingHold && k === 'confirm') toTitle();
      return;
    }
    if (Game.state === 'battle') { Battle.key(k); return; }
    if (Game.state === 'world') {
      if (k === 'confirm') World.interact();
      else if (k === 'cancel') Game.openMenu();
    }
  }

  /* ============================================================
     Hauptschleife
     ============================================================ */

  var last = 0;

  function frame(now) {
    var dt = Math.min(.05, (now - last) / 1000 || 0);
    last = now;

    // Eingaben abarbeiten
    while (Input.queue.length) handleKey(Input.queue.shift());

    // Update
    UI.update(dt);
    titleT += dt;
    if (Game.state === 'world') { Game.time += dt; World.update(dt, Input); }
    else if (Game.state === 'battle') {
      // Shift (oder gehaltene Bestaetigung waehrend der Ausfuehrung) spult vor
      var fast = Input.held('run') || (Battle.phase === 'exec' && Input.held('confirm'));
      Battle.update(dt * (fast ? 3 : 1));
    }
    else if (Game.state === 'gameover') Game.gameOverT += dt;
    else if (Game.state === 'ending') { /* nur Dialog */ }

    if (GFX.shakeX || GFX.shakeY) {
      GFX.shakeX *= .85; GFX.shakeY *= .85;
      if (Math.abs(GFX.shakeX) < .3) GFX.shakeX = 0;
      if (Math.abs(GFX.shakeY) < .3) GFX.shakeY = 0;
    }

    // Zeichnen
    GFX.begin();
    if (Game.state === 'title') drawTitle();
    else if (Game.state === 'gameover') drawGameOver();
    else if (Game.state === 'battle') Battle.draw();
    else if (Game.state === 'ending') drawEnding();
    else World.draw();

    UI.draw();

    if (Game.battleFlash > 0) {
      GFX.fade(Game.battleFlash, '#ffffff');
      Game.battleFlash -= dt * 1.6;
    }

    requestAnimationFrame(frame);
  }

  function drawEnding() {
    for (var y = 0; y < GFX.VH; y++) {
      var t = y / GFX.VH;
      GFX.rect(0, y, GFX.VW, 1,
        'rgb(' + Math.round(20 + t * 90) + ',' + Math.round(16 + t * 70) + ',' + Math.round(50 + t * 60) + ')');
    }
    for (var i = 0; i < 4; i++) {
      var cx = 76 + i * 56, cy = 60 + Math.sin(titleT * 1.2 + i) * 4;
      glow(cx, cy + 8, 22, Data.CRYSTALS[i].color, .55);
      GFX.draw(Sprites.crystals[i], cx - 8, cy, 1);
    }
    if (Game.endingHold) {
      Font.drawCentered(GFX.ctx, 'Enter: Zurück zum Titel', GFX.VW / 2, GFX.VH - 20, '#ffe45c', '#000');
    }
  }

  /* ============================================================
     Start
     ============================================================ */

  function boot() {
    GFX.init(document.getElementById('screen'));
    Sprites.build();
    bindTouch();
    Game.state = 'title';
    // Musik startet erst nach der ersten Eingabe (Browser-Richtlinie)
    var startAudio = function () {
      Sound.unlock();
      Sound.play('title');
      window.removeEventListener('pointerdown', startAudio);
      window.removeEventListener('keydown', startAudio);
    };
    window.addEventListener('pointerdown', startAudio);
    window.addEventListener('keydown', startAudio);
    requestAnimationFrame(frame);
  }

  global.Game = Game;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
