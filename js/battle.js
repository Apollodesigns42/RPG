/* ============================================================
   battle.js  --  Rundenbasiertes Kampfsystem im Final-Fantasy-Stil
   ============================================================ */
(function (global) {
  'use strict';

  var B = {
    active: false, phase: 'idle', party: [], enemies: [], actions: [],
    fx: [], pops: [], seq: [], wait: 0, msg: '', msgT: 0, time: 0,
    cmdIndex: 0, opts: null, result: null, bg: '#101828', flash: 0,
    intro: 0, escaped: false, targetIdx: 0
  };

  var FIELD_Y = 26;
  var STATUS_Y = 154;
  var HORIZON = 72;          // Linie zwischen Himmel und Boden
  var FEET_ROW0 = 112;       // Fusslinie der hinteren Gegnerreihe
  var FEET_ROW1 = 144;
  var PARTY_X = 250, PARTY_Y0 = 66, PARTY_DY = 21;
  var CMD_W = 96;

  /* ---------- Start ---------- */

  B.start = function (enemyIds, opts) {
    opts = opts || {};
    B.opts = opts;
    B.active = true;
    B.phase = 'intro';
    B.intro = .75;
    B.escaped = false;
    B.result = null;
    B.fx = []; B.pops = []; B.seq = []; B.wait = 0;
    B.time = 0; B.flash = .5;
    B.bg = opts.bg || '#101828';

    B.party = Game.party.slice();
    B.party.forEach(function (a) {
      a.defending = false;
      a.buffs = a.buffs || {};
      a.bx = 0; a.by = 0; a.flash = 0; a.hurt = 0;
    });

    var counts = {};
    B.enemies = enemyIds.map(function (id, i) {
      var ref = Data.ENEMIES[id];
      counts[id] = (counts[id] || 0) + 1;
      return {
        ref: ref, id: id, name: ref.name, idx: i,
        hp: ref.hp, maxhp: ref.hp, alive: true,
        atk: ref.atk, def: ref.def, mag: ref.mag, res: ref.res, spd: ref.spd,
        luk: 5, lvl: 1, status: {}, buffs: {}, isEnemy: true,
        x: 0, y: 0, bx: 0, by: 0, flash: 0, hurt: 0, fade: 0, dying: 0
      };
    });
    // Mehrfachnamen mit A/B/C kennzeichnen
    var seen = {};
    B.enemies.forEach(function (e) {
      if (counts[e.id] > 1) {
        seen[e.id] = (seen[e.id] || 0);
        e.name = e.ref.name + ' ' + 'ABCD'.charAt(seen[e.id]);
        seen[e.id]++;
      }
    });
    layoutEnemies();

    Sound.play(opts.music || (opts.boss ? 'boss' : 'battle'), true);

    var introText = opts.intro || (B.enemies.length > 1
      ? 'Gegner tauchen auf!'
      : B.enemies[0].name + ' erscheint!');
    B.setMsg(introText, 1.4);
  };

  function layoutEnemies() {
    var n = B.enemies.length;
    var perRow = n <= 3 ? n : Math.ceil(n / 2);
    B.enemies.forEach(function (e, i) {
      var spr = Sprites.enemy[e.ref.sprite];
      var big = !!e.ref.boss;
      e.scale = big ? 2 : 1;
      var sw = (spr ? spr.width : 24) * e.scale;
      var sh = (spr ? spr.height : 24) * e.scale;
      if (big) {
        e.x = 106 - sw / 2;
        e.y = 132 - sh;
        return;
      }
      var row = i < perRow ? 0 : 1;
      var col = row === 0 ? i : i - perRow;
      var inRow = row === 0 ? perRow : n - perRow;
      var spread = Math.min(56, 168 / Math.max(1, inRow));
      var totalW = (inRow - 1) * spread;
      e.x = 106 + col * spread - totalW / 2 - sw / 2 + (row === 1 ? 22 : -10);
      e.y = (row === 0 ? FEET_ROW0 : FEET_ROW1) - sh;
    });
  }

  B.setMsg = function (text, dur) { B.msg = text; B.msgT = dur || 1.1; };

  /* ---------- Werte ---------- */

  function stat(u, key) {
    var v;
    if (u.isEnemy) v = u[key] || 0;
    else v = Game.stat(u, key);
    var b = u.buffs && u.buffs[key];
    if (b) v = Math.round(v * (1 + b.amount));
    if (key === 'spd' && u.status && u.status.slow) v = Math.round(v * .5);
    if (u.defending && key === 'def') v = Math.round(v * 1.8);
    return Math.max(1, v);
  }
  B.stat = stat;

  function isAlive(u) { return u.isEnemy ? u.alive : u.hp > 0; }
  function livingEnemies() { return B.enemies.filter(function (e) { return e.alive; }); }
  function livingParty() { return B.party.filter(function (a) { return a.hp > 0; }); }

  function elemMult(target, element) {
    if (!element || element === 'none') return 1;
    var ref = target.isEnemy ? target.ref : null;
    if (ref) {
      if (ref.immune && ref.immune.indexOf(element) >= 0) return 0;
      if (ref.weak && ref.weak.indexOf(element) >= 0) return 1.65;
      if (ref.resist && ref.resist.indexOf(element) >= 0) return .5;
      return 1;
    }
    // Spielerseite: Ausruestung koennte spaeter resistieren
    return 1;
  }

  function physDamage(att, tgt, mult, opt) {
    opt = opt || {};
    var a = stat(att, 'atk') * 1.5 + (att.lvl || 1) * .8;
    var d = opt.pierce ? 0 : stat(tgt, 'def') * .62;
    var dmg = a * (mult || 1) - d;
    dmg *= .92 + Math.random() * .16;
    if (att.isEnemy && opt.aoe) dmg *= .8;
    var crit = false;
    var critChance = .04 + stat(att, 'luk') / 400;
    if (att.critNext) { crit = true; att.critNext = false; }
    else if (Math.random() < critChance) crit = true;
    if (crit) dmg *= 1.8;
    var el = opt.element;
    if (el) dmg *= elemMult(tgt, el);
    if (tgt.defending) dmg *= .5;
    return { dmg: Math.max(1, Math.round(dmg)), crit: crit,
             mult: el ? elemMult(tgt, el) : 1 };
  }

  function magDamage(caster, tgt, power, element, opt) {
    opt = opt || {};
    var scale = caster.isEnemy ? 130 : 80;
    var base = power * (1 + stat(caster, 'mag') / scale);
    var dmg = base - stat(tgt, 'res') * 1.15;
    dmg *= .93 + Math.random() * .14;
    if (caster.isEnemy && opt.aoe) dmg *= .75;
    var m = elemMult(tgt, element);
    dmg *= m;
    if (tgt.defending) dmg *= .7;
    return { dmg: Math.max(m === 0 ? 0 : 1, Math.round(dmg)), mult: m, crit: false };
  }

  function healAmount(caster, power) {
    if (power >= 9999) return 9999;
    return Math.round(power * (1 + stat(caster, 'mag') / 70));
  }

  function hitChance(att, tgt) {
    var c = .94;
    if (att.status && att.status.blind) c -= .40;
    if (tgt.evading) c -= .55;
    if (tgt.status && tgt.status.sleep) c += .06;
    return c;
  }

  /* ---------- Schaden anwenden ---------- */

  function damage(unit, amount, opts) {
    opts = opts || {};
    unit.hp = Math.max(0, unit.hp - amount);
    unit.flash = .22; unit.hurt = .3;
    pop(unit, amount, opts.color || (opts.crit ? '#ffd23a' : '#ffffff'), opts.crit);
    if (unit.status && unit.status.sleep && amount > 0) delete unit.status.sleep;
    if (unit.hp <= 0) kill(unit);
  }

  function heal(unit, amount) {
    var max = unit.isEnemy ? unit.maxhp : unit.maxhp;
    amount = Math.min(amount, max - unit.hp);
    if (amount <= 0) amount = 0;
    unit.hp += amount;
    pop(unit, amount, '#7ef29a');
  }

  function kill(unit) {
    if (unit.isEnemy) { unit.alive = false; unit.dying = .45; }
    else { unit.hp = 0; unit.status = {}; }
    Sound.sfx('down');
  }

  function pop(unit, value, color, big) {
    var p = unitPos(unit);
    B.pops.push({ x: p.x, y: p.y - 6, text: (value === 0 ? 'MISS' : String(value)),
                  color: color, t: 0, dur: .95, big: !!big,
                  vy: -22, ox: (Math.random() - .5) * 8 });
  }
  function popText(unit, text, color) {
    var p = unitPos(unit);
    B.pops.push({ x: p.x, y: p.y - 6, text: text, color: color, t: 0, dur: 1.1,
                  vy: -18, ox: 0 });
  }

  function unitPos(u) {
    if (u.isEnemy) {
      var spr = Sprites.enemy[u.ref.sprite];
      var w = spr ? spr.width * u.scale : 24, h = spr ? spr.height * u.scale : 24;
      return { x: u.x + w / 2 + u.bx, y: u.y + h / 2 + u.by };
    }
    var i = B.party.indexOf(u);
    return { x: PARTY_X + u.bx + 8, y: PARTY_Y0 + i * PARTY_DY + u.by + 8 };
  }
  B.unitPos = unitPos;

  /* ---------- Ablaufsteuerung ---------- */

  function push(dur, onStart, onEnd) {
    B.seq.push({ dur: dur, onStart: onStart, onEnd: onEnd });
  }

  B.update = function (dt) {
    if (!B.active) return;
    B.time += dt;
    if (B.flash > 0) B.flash = Math.max(0, B.flash - dt * 2);
    if (B.msgT > 0) B.msgT -= dt;

    // Effekte
    for (var i = B.fx.length - 1; i >= 0; i--) {
      var f = B.fx[i]; f.t += dt;
      if (f.t >= f.dur) B.fx.splice(i, 1);
    }
    for (i = B.pops.length - 1; i >= 0; i--) {
      var p = B.pops[i]; p.t += dt;
      if (p.t >= p.dur) B.pops.splice(i, 1);
    }
    B.party.forEach(decay);
    B.enemies.forEach(function (e) {
      decay(e);
      if (e.dying > 0) e.dying = Math.max(0, e.dying - dt);
    });

    if (B.phase === 'intro') {
      B.intro -= dt;
      if (B.intro <= 0) beginRound();
      return;
    }

    if (B.phase === 'exec') {
      if (B.wait > 0) { B.wait -= dt; return; }
      if (B.cur && B.cur.onEnd) { B.cur.onEnd(); B.cur = null; }
      if (!B.seq.length) { endRound(); return; }
      var step = B.seq.shift();
      B.cur = step;
      if (step.onStart) step.onStart();
      B.wait = step.dur;
      return;
    }

    if (B.phase === 'result') {
      if (B.wait > 0) { B.wait -= dt; return; }
      if (B.seq.length) {
        var s = B.seq.shift();
        B.cur = s;
        if (s.onStart) s.onStart();
        B.wait = s.dur;
      }
    }
  };

  function decay(u) {
    if (u.flash > 0) u.flash = Math.max(0, u.flash - .06);
    if (u.hurt > 0) u.hurt = Math.max(0, u.hurt - .06);
    if (u.bx) u.bx *= .8;
    if (u.by) u.by *= .8;
  }

  /* ---------- Runde: Befehle ---------- */

  function beginRound() {
    B.phase = 'command';
    B.actions = [];
    B.party.forEach(function (a) { a.defending = false; });
    B.cmdIndex = 0;
    nextCommand();
  }

  function nextCommand() {
    UI.clear();
    if (B.cmdIndex >= B.party.length) { startExecution(); return; }
    var a = B.party[B.cmdIndex];
    if (a.hp <= 0) { B.actions[B.cmdIndex] = null; B.cmdIndex++; nextCommand(); return; }
    if (a.status.sleep) {
      B.actions[B.cmdIndex] = { type: 'sleep', actor: a };
      B.cmdIndex++; nextCommand(); return;
    }
    openCommandMenu(a);
  }

  function backCommand() {
    if (B.cmdIndex === 0) { Sound.sfx('error'); return; }
    B.cmdIndex--;
    while (B.cmdIndex > 0 && (!B.party[B.cmdIndex] || B.party[B.cmdIndex].hp <= 0 ||
           (B.actions[B.cmdIndex] && B.actions[B.cmdIndex].type === 'sleep'))) B.cmdIndex--;
    nextCommand();
  }

  function openCommandMenu(a) {
    var def = Data.CHARS[a.id];
    var items = [{ label: 'Angriff', key: 'attack' }];
    if (def.spells.length) items.push({ label: 'Magie', key: 'magic' });
    if (def.abilities.length) items.push({ label: 'Faehigkeit', key: 'skill' });
    items.push({ label: 'Item', key: 'item' });
    items.push({ label: 'Verteidigen', key: 'defend' });
    items.push({ label: 'Fliehen', key: 'flee', disabled: !!B.opts.boss });

    UI.menu({
      x: 2, y: STATUS_Y - 2, w: CMD_W, rows: 6, title: null, itemH: 12,
      items: items,
      onSelect: function (it) {
        if (it.key === 'attack') chooseTarget('enemy', function (t) { commit({ type: 'attack', actor: a, target: t }); });
        else if (it.key === 'magic') openSpellMenu(a);
        else if (it.key === 'skill') openSkillMenu(a);
        else if (it.key === 'item') openItemMenu(a);
        else if (it.key === 'defend') commit({ type: 'defend', actor: a });
        else if (it.key === 'flee') commit({ type: 'flee', actor: a });
      },
      onCancel: backCommand
    });
  }

  function openSpellMenu(a) {
    if (a.status.silence) { Sound.sfx('error'); UI.notice('Stumm - keine Magie moeglich!'); return; }
    var items = a.spells.map(function (id) {
      var sp = Data.SPELLS[id];
      return { label: sp.name, right: sp.mp, key: id, disabled: a.mp < sp.mp,
               rightColor: a.mp < sp.mp ? '#8a5a5a' : UI.COL.mp };
    });
    if (!items.length) { Sound.sfx('error'); return; }
    UI.menu({
      x: 94, y: 44, w: 156, rows: 6, title: 'Magie', items: items,
      footer: function (it) { return it ? Data.SPELLS[it.key].desc : ''; },
      onSelect: function (it) {
        var sp = Data.SPELLS[it.key];
        pickForEffect(a, sp.target, function (t) {
          commit({ type: 'spell', actor: a, spell: it.key, target: t });
        });
      }
    });
  }

  function openSkillMenu(a) {
    var items = a.abilities.map(function (id) {
      var ab = Data.ABILITIES[id];
      return { label: ab.name, right: ab.mp, key: id, disabled: a.mp < ab.mp,
               rightColor: a.mp < ab.mp ? '#8a5a5a' : UI.COL.mp };
    });
    if (!items.length) { Sound.sfx('error'); return; }
    UI.menu({
      x: 94, y: 44, w: 156, rows: 6, title: 'Faehigkeiten', items: items,
      footer: function (it) { return it ? Data.ABILITIES[it.key].desc : ''; },
      onSelect: function (it) {
        var ab = Data.ABILITIES[it.key];
        pickForEffect(a, ab.target, function (t) {
          commit({ type: 'ability', actor: a, ability: it.key, target: t });
        });
      }
    });
  }

  function openItemMenu(a) {
    var items = [];
    for (var id in Game.items) {
      if (!Game.items[id]) continue;
      var def = Data.ITEMS[id];
      if (!def || !def.battle) continue;
      items.push({ label: def.name, right: 'x' + Game.items[id], key: id });
    }
    if (!items.length) { Sound.sfx('error'); UI.notice('Keine nutzbaren Items!'); return; }
    UI.menu({
      x: 94, y: 44, w: 156, rows: 6, title: 'Items', items: items,
      footer: function (it) { return it ? Data.ITEMS[it.key].desc : ''; },
      onSelect: function (it) {
        var def = Data.ITEMS[it.key];
        pickForEffect(a, def.target, function (t) {
          commit({ type: 'item', actor: a, item: it.key, target: t });
        });
      }
    });
  }

  function pickForEffect(a, target, cb) {
    if (target === 'enemy') chooseTarget('enemy', cb);
    else if (target === 'ally') chooseTarget('ally', cb);
    else if (target === 'self') cb(a);
    else cb(null);   // 'enemies' / 'allies' / 'party' -> kein Einzelziel
  }

  function commit(action) {
    B.actions[B.cmdIndex] = action;
    B.cmdIndex++;
    nextCommand();
  }

  /* ---------- Zielauswahl ---------- */

  function chooseTarget(kind, cb) {
    var list = kind === 'enemy' ? livingEnemies() : B.party;
    if (!list.length) { Sound.sfx('error'); return; }
    var idx = 0;
    if (kind === 'ally') {
      for (var i = 0; i < list.length; i++) if (list[i].hp > 0) { idx = i; break; }
    }
    var modal = {
      key: function (k) {
        if (k === 'left' || k === 'up') { idx = (idx - 1 + list.length) % list.length; Sound.sfx('cursor'); }
        else if (k === 'right' || k === 'down') { idx = (idx + 1) % list.length; Sound.sfx('cursor'); }
        else if (k === 'confirm') { Sound.sfx('confirm'); UI.pop(); cb(list[idx]); }
        else if (k === 'cancel') { Sound.sfx('cancel'); UI.pop(); }
      },
      draw: function () {
        var u = list[idx];
        var p = unitPos(u);
        var bob = Math.sin(UI.time * 8) * 2;
        var ax = Math.round(p.x - 4), ay = Math.round(p.y - 26 + bob);
        GFX.rect(ax, ay, 9, 2, '#ffe45c');
        GFX.rect(ax + 1, ay + 2, 7, 2, '#ffe45c');
        GFX.rect(ax + 2, ay + 4, 5, 2, '#ff9a3a');
        GFX.rect(ax + 3, ay + 6, 3, 2, '#ff9a3a');
        var label = u.isEnemy ? u.name : u.name;
        var w = Font.width(label) + 10;
        UI.panel(Math.round(p.x - w / 2), ay - 15, w, 13);
        UI.textC(label, p.x, ay - 11, '#ffffff');
      },
      targeting: true
    };
    UI.push(modal);
  }

  /* ---------- Ausfuehrung ---------- */

  function startExecution() {
    UI.clear();
    B.phase = 'exec';
    B.seq = []; B.wait = 0; B.cur = null;

    // Fliehen hat Vorrang
    var fleeing = B.actions.some(function (a) { return a && a.type === 'flee'; });
    if (fleeing) { tryFlee(); return; }

    // Gegneraktionen bestimmen
    var all = [];
    B.actions.forEach(function (act) { if (act && act.actor.hp > 0) all.push(act); });
    livingEnemies().forEach(function (e) { all.push(enemyAction(e)); });

    // Nach Tempo sortieren
    all.forEach(function (a) { a.spd = stat(a.actor, 'spd') * (.85 + Math.random() * .3); });
    all.sort(function (x, y) { return y.spd - x.spd; });

    all.forEach(function (act) {
      push(0, function () { runAction(act); });
    });

    // Rundenende: Gift & Buff-Ticks
    push(.05, function () { endOfRoundTicks(); });
  }

  function endRound() {
    if (checkEnd()) return;
    beginRound();
  }

  function runAction(act) {
    var a = act.actor;
    if (!isAlive(a)) return;
    if (a.status && a.status.sleep) {
      if (Math.random() < .35) { delete a.status.sleep; popText(a, 'Erwacht!', '#7fb0ff'); }
      else { popText(a, 'Schlaeft', '#7fb0ff'); return; }
    }

    switch (act.type) {
      case 'attack':   doAttack(a, act.target); break;
      case 'defend':   a.defending = true; B.setMsg(a.name + ' geht in Deckung.'); Sound.sfx('guard'); break;
      case 'spell':    doSpell(a, Data.SPELLS[act.spell], act.target); break;
      case 'ability':  doAbility(a, Data.ABILITIES[act.ability], act.target); break;
      case 'item':     doItem(a, act.item, act.target); break;
      case 'enemy':    doEnemySkill(a, act.skill, act.target); break;
      case 'sleep':    popText(a, 'Schlaeft', '#7fb0ff'); break;
    }
  }

  function retarget(t, isEnemySide) {
    if (t && isAlive(t)) return t;
    var pool = isEnemySide ? livingEnemies() : livingParty();
    return pool.length ? pool[(Math.random() * pool.length) | 0] : null;
  }

  function doAttack(a, target) {
    target = retarget(target, !a.isEnemy);
    if (!target) return;
    B.setMsg(a.name + ' greift an!');
    lunge(a, target);
    if (Math.random() > hitChance(a, target)) {
      B.wait = .3;
      Sound.sfx('miss'); pop(target, 0, '#c8cbe0');
      return;
    }
    var r = physDamage(a, target, 1, { element: a.isEnemy ? null : Game.weaponElement(a) });
    Sound.sfx(r.crit ? 'crit' : 'hit');
    slash(target, r.crit);
    damage(target, r.dmg, { crit: r.crit });
    if (r.crit) B.setMsg('Kritischer Treffer!');
    B.wait = .42;
  }

  function doSpell(a, sp, target) {
    if (a.mp < sp.mp) { popText(a, 'Kein MP', '#8fa0c8'); return; }
    if (a.status.silence) { popText(a, 'Stumm!', '#c07aff'); return; }
    a.mp -= sp.mp;
    B.setMsg(a.name + ' wirkt ' + sp.name + '!');
    Sound.sfx(sp.sfx || 'magic');
    applyEffect(a, sp, target, 'spell');
    B.wait = .55;
  }

  function doAbility(a, ab, target) {
    if (a.mp < ab.mp) { popText(a, 'Kein MP', '#8fa0c8'); return; }
    a.mp -= ab.mp;
    B.setMsg(a.name + ': ' + ab.name + '!');
    Sound.sfx(ab.sfx || 'hit');
    applyEffect(a, ab, target, 'ability');
    B.wait = .5;
  }

  function doItem(a, itemId, target) {
    var def = Data.ITEMS[itemId];
    if (!Game.itemCount(itemId)) return;
    Game.removeItem(itemId, 1);
    B.setMsg(a.name + ' benutzt ' + def.name + '.');
    Sound.sfx(def.sfx || 'item');
    var targets = resolveTargets(a, def.target, target);
    targets.forEach(function (t) {
      switch (def.kind) {
        case 'heal':   if (t.hp <= 0) { popText(t, 'Kein Effekt', '#8fa0c8'); break; }
                       heal(t, def.power >= 9999 ? t.maxhp : def.power); fxHeal(t); break;
        case 'mp':     t.mp = Math.min(t.maxmp, t.mp + def.power); pop(t, def.power, '#5aa8ff'); break;
        case 'full':   heal(t, t.maxhp); t.mp = t.maxmp; fxHeal(t); break;
        case 'revive': if (t.hp > 0) { popText(t, 'Kein Effekt', '#8fa0c8'); break; }
                       t.hp = Math.max(1, Math.round(t.maxhp * def.power)); fxHeal(t); popText(t, 'Belebt!', '#ffe45c'); break;
        case 'cure':   if (t.status[def.status]) { delete t.status[def.status]; popText(t, 'Geheilt', '#7ef29a'); }
                       else popText(t, 'Kein Effekt', '#8fa0c8'); break;
        case 'cureall': t.status = {}; popText(t, 'Gereinigt', '#7ef29a'); break;
        case 'attack': {
          var r = magDamage({ isEnemy: false, mag: 20, buffs: {}, lvl: a.lvl, hp: 1 }, t, def.power, def.element);
          fxElement(t, def.element);
          damage(t, r.dmg, { color: Data.ELEMENTS[def.element].color });
          break;
        }
      }
    });
    B.wait = .5;
  }

  function resolveTargets(a, kind, single) {
    switch (kind) {
      case 'enemy':   return single && isAlive(single) ? [single] : (livingEnemies().length ? [livingEnemies()[0]] : []);
      case 'enemies': return a.isEnemy ? livingParty() : livingEnemies();
      case 'ally':    return single ? [single] : [a];
      case 'allies':
      case 'party':   return a.isEnemy ? B.enemies.filter(function (e) { return e.alive; }) : B.party;
      case 'self':    return [a];
      default:        return single ? [single] : [a];
    }
  }

  /** Gemeinsame Effektlogik fuer Zauber, Faehigkeiten und Gegner-Skills. */
  function applyEffect(a, eff, target, source) {
    var enemySide = !a.isEnemy;
    var targets;
    if (eff.target === 'enemy' || eff.target === 'enemies')
      targets = resolveTargets(a, eff.target, retarget(target, enemySide));
    else targets = resolveTargets(a, eff.target || 'self', target);

    var aoe = targets.length > 1;

    switch (eff.kind) {
      case 'phys': {
        var hits = eff.hits || 1;
        for (var h = 0; h < hits; h++) {
          var tg = eff.random ? pickRandom(targets) : null;
          (eff.random ? [tg] : targets).forEach(function (t) {
            if (!t || !isAlive(t)) return;
            lunge(a, t);
            if (Math.random() > hitChance(a, t)) { pop(t, 0, '#c8cbe0'); Sound.sfx('miss'); return; }
            var r = physDamage(a, t, eff.mult || 1, { pierce: eff.pierce, element: eff.element, aoe: aoe });
            slash(t, r.crit);
            damage(t, r.dmg, { crit: r.crit });
            if (eff.status && Math.random() < (eff.chance || .5)) applyStatus(t, eff.status);
          });
        }
        if (eff.selfDef) addBuff(a, 'def', eff.selfDef, 2);
        break;
      }
      case 'mag': {
        targets.forEach(function (t) {
          if (!isAlive(t)) return;
          fxElement(t, eff.element);
          var r = magDamage(a, t, eff.power, eff.element, { aoe: aoe });
          if (r.mult === 0) { popText(t, 'Immun', '#8fa0c8'); return; }
          damage(t, r.dmg, { color: (Data.ELEMENTS[eff.element] || Data.ELEMENTS.none).color });
          if (r.mult > 1.2) popText(t, 'Schwachpunkt!', '#ffe45c');
        });
        break;
      }
      case 'heal': {
        targets.forEach(function (t) {
          if (t.hp <= 0) return;
          fxHeal(t);
          heal(t, healAmount(a, eff.power));
        });
        break;
      }
      case 'healself': {
        fxHeal(a); heal(a, healAmount(a, eff.power)); break;
      }
      case 'revive': {
        targets.forEach(function (t) {
          if (t.hp > 0) { popText(t, 'Kein Effekt', '#8fa0c8'); return; }
          t.hp = Math.max(1, Math.round(t.maxhp * eff.power));
          fxHeal(t); popText(t, 'Belebt!', '#ffe45c');
        });
        break;
      }
      case 'cure': {
        targets.forEach(function (t) { t.status = {}; popText(t, 'Gereinigt', '#7ef29a'); });
        break;
      }
      case 'buff': {
        targets.forEach(function (t) {
          if (!isAlive(t)) return;
          addBuff(t, eff.stat, eff.amount, eff.turns || 4);
          popText(t, eff.stat.toUpperCase() + ' hoch', '#7fd8ff');
        });
        break;
      }
      case 'buffself': {
        addBuff(a, eff.stat, eff.amount, eff.turns || 4);
        popText(a, eff.stat.toUpperCase() + ' hoch', '#7fd8ff');
        break;
      }
      case 'debuff': {
        targets.forEach(function (t) {
          if (!isAlive(t)) return;
          addBuff(t, eff.stat, eff.amount, eff.turns || 4);
          popText(t, eff.stat.toUpperCase() + ' runter', '#c07aff');
        });
        break;
      }
      case 'debuffall': {
        (a.isEnemy ? livingParty() : livingEnemies()).forEach(function (t) {
          addBuff(t, eff.stat, eff.amount, eff.turns || 4);
          popText(t, eff.stat.toUpperCase() + ' runter', '#c07aff');
        });
        break;
      }
      case 'status': {
        targets.forEach(function (t) {
          if (!isAlive(t)) return;
          var immune = t.isEnemy && t.ref.immune && t.ref.immune.indexOf(eff.status) >= 0;
          if (immune || Math.random() > (eff.chance || .6)) { popText(t, 'Widersteht', '#8fa0c8'); return; }
          applyStatus(t, eff.status);
        });
        break;
      }
      case 'drain': {
        targets.forEach(function (t) {
          if (!isAlive(t)) return;
          var r = physDamage(a, t, eff.mult || 1, { element: 'dark' });
          fxElement(t, 'dark');
          damage(t, r.dmg, { color: '#c07aff' });
          heal(a, Math.round(r.dmg * .5));
        });
        break;
      }
      case 'taunt': {
        a.taunt = eff.turns || 3;
        addBuff(a, 'def', .5, eff.turns || 3);
        popText(a, 'Provoziert!', '#ffe45c');
        break;
      }
      case 'evade': {
        a.evading = true; a.evadeTurns = eff.turns || 3;
        popText(a, 'Ausweichen!', '#8ff0c0');
        break;
      }
      case 'laststand': {
        heal(a, Math.round(a.maxhp * .35));
        addBuff(a, 'def', 1.0, 5);
        fxHeal(a);
        break;
      }
      case 'steal': {
        var t2 = targets[0];
        if (!t2 || !isAlive(t2)) break;
        var chance = .35 + stat(a, 'luk') / 120;
        if (t2.stolen) { popText(t2, 'Nichts mehr', '#8fa0c8'); break; }
        if (Math.random() < chance) {
          t2.stolen = true;
          var drop = t2.ref.drop;
          if (drop && Math.random() < .55) {
            Game.addItem(drop[0], 1);
            popText(t2, Data.ITEMS[drop[0]].name + '!', '#ffe45c');
            B.setMsg('Nyx stiehlt ' + Data.ITEMS[drop[0]].name + '!');
          } else {
            var g = Math.round(t2.ref.gold * (.8 + Math.random() * .8));
            Game.gold += g;
            popText(t2, g + ' G', '#ffe45c');
            B.setMsg('Nyx stiehlt ' + g + ' Gold!');
          }
          Sound.sfx('gold');
        } else { popText(t2, 'Fehlschlag', '#8fa0c8'); }
        break;
      }
    }
  }

  function pickRandom(list) {
    var pool = list.filter(isAlive);
    return pool.length ? pool[(Math.random() * pool.length) | 0] : null;
  }

  function applyStatus(t, st) {
    if (t.isEnemy && t.ref.immune && t.ref.immune.indexOf(st) >= 0) { popText(t, 'Immun', '#8fa0c8'); return; }
    t.status[st] = true;
    popText(t, Data.STATUS[st].name + '!', Data.STATUS[st].color);
  }

  function addBuff(t, key, amount, turns) {
    if (!t.buffs) t.buffs = {};
    t.buffs[key] = { amount: amount, turns: turns };
  }

  /* ---------- Gegner-KI ---------- */

  function enemyAction(e) {
    var skills = (e.ref.skills || []).filter(function (s) {
      if (s.hpBelow && e.hp / e.maxhp > s.hpBelow) return false;
      return true;
    });
    var total = 0;
    skills.forEach(function (s) { total += s.weight || 20; });
    var r = Math.random() * 100;
    if (r < total) {
      var acc = 0;
      for (var i = 0; i < skills.length; i++) {
        acc += skills[i].weight || 20;
        if (r <= acc) return { type: 'enemy', actor: e, skill: skills[i], target: pickPartyTarget() };
      }
    }
    return { type: 'attack', actor: e, target: pickPartyTarget() };
  }

  function pickPartyTarget() {
    var alive = livingParty();
    if (!alive.length) return null;
    var taunting = alive.filter(function (a) { return a.taunt > 0; });
    if (taunting.length && Math.random() < .75) return taunting[0];
    // leicht verwundete bevorzugen
    if (Math.random() < .3) {
      alive.sort(function (a, b) { return a.hp / a.maxhp - b.hp / b.maxhp; });
      return alive[0];
    }
    return alive[(Math.random() * alive.length) | 0];
  }

  function doEnemySkill(e, skill, target) {
    B.setMsg(e.name + ': ' + skill.name + '!');
    Sound.sfx(skill.sfx || 'hit');
    var eff = {
      kind: skill.kind, mult: skill.mult, hits: skill.hits, power: skill.power,
      element: skill.element, status: skill.status, chance: skill.chance,
      stat: skill.stat, amount: skill.amount, turns: skill.turns,
      target: skill.target || (skill.kind === 'phys' || skill.kind === 'mag' || skill.kind === 'drain' ? 'enemy' : 'self')
    };
    if (eff.target === 'enemy' && !target) target = pickPartyTarget();
    applyEffect(e, eff, target, 'enemy');
    B.wait = .5;
  }

  /* ---------- Rundenende ---------- */

  function endOfRoundTicks() {
    B.party.concat(B.enemies).forEach(function (u) {
      if (!isAlive(u)) return;
      if (u.status && u.status.poison) {
        var d = Math.max(1, Math.round(u.maxhp * .06));
        damage(u, d, { color: '#9ad84a' });
      }
      if (u.buffs) {
        for (var k in u.buffs) {
          u.buffs[k].turns--;
          if (u.buffs[k].turns <= 0) delete u.buffs[k];
        }
      }
      if (u.taunt > 0) u.taunt--;
      if (u.evadeTurns > 0) { u.evadeTurns--; if (u.evadeTurns <= 0) u.evading = false; }
      if (u.status && u.status.sleep && Math.random() < .25) delete u.status.sleep;
    });
  }

  /* ---------- Flucht ---------- */

  function tryFlee() {
    var ps = livingParty().reduce(function (s, a) { return s + stat(a, 'spd'); }, 0) / Math.max(1, livingParty().length);
    var es = livingEnemies().reduce(function (s, e) { return s + stat(e, 'spd'); }, 0) / Math.max(1, livingEnemies().length);
    var chance = Math.max(.15, Math.min(.92, .45 + (ps - es) * .03));
    if (Math.random() < chance) {
      Sound.sfx('flee');
      B.setMsg('Flucht gelungen!', 1.2);
      B.escaped = true;
      B.phase = 'result';
      B.seq = [{ dur: 1.0, onStart: function () {} },
               { dur: 0, onStart: function () { finish('flee'); } }];
    } else {
      Sound.sfx('error');
      B.setMsg('Flucht gescheitert!', 1.0);
      B.phase = 'exec';
      B.seq = [];
      livingEnemies().forEach(function (e) {
        push(0, function () { runAction(enemyAction(e)); });
      });
      push(.05, function () { endOfRoundTicks(); });
    }
  }

  /* ---------- Sieg / Niederlage ---------- */

  function checkEnd() {
    if (!livingEnemies().length) { victory(); return true; }
    if (!livingParty().length) { defeat(); return true; }
    return false;
  }

  function victory() {
    B.phase = 'result';
    UI.clear();
    var exp = 0, gold = 0, drops = [];
    B.enemies.forEach(function (e) {
      exp += e.ref.exp; gold += e.ref.gold;
      if (e.ref.drop && Math.random() < e.ref.drop[1]) drops.push(e.ref.drop[0]);
    });
    Game.gold += gold;
    drops.forEach(function (d) { Game.addItem(d, 1); });

    var msgs = ['Sieg!', 'Die Gruppe erhaelt ' + exp + ' EXP und ' + gold + ' Gold.'];
    drops.forEach(function (d) { msgs.push('Fundstueck: ' + Data.ITEMS[d].name + '!'); });

    var ups = [];
    Game.party.forEach(function (a) {
      var gain = a.hp > 0 ? exp : Math.round(exp * .5);
      var res = Game.gainXp(a, gain);
      res.forEach(function (r) { ups.push(r); });
    });
    ups.forEach(function (u) { msgs.push(u); });

    Sound.play('victory', true);
    B.seq = [{ dur: .5, onStart: function () {} }, {
      dur: 0, onStart: function () {
        UI.say(msgs, function () { finish('win'); });
      }
    }];
  }

  function defeat() {
    B.phase = 'result';
    UI.clear();
    Sound.play('gameover', true);
    B.seq = [{ dur: 1.2, onStart: function () { B.setMsg('Die Gruppe wurde besiegt...', 3); } },
             { dur: 0, onStart: function () { finish('lose'); } }];
  }

  function finish(kind) {
    B.active = false;
    B.phase = 'idle';
    UI.clear();
    B.party.forEach(function (a) {
      a.defending = false; a.evading = false; a.taunt = 0; a.buffs = {};
      a.bx = 0; a.by = 0;
    });
    var opts = B.opts || {};
    if (kind === 'win' && opts.onWin) opts.onWin();
    else if (kind === 'lose' && opts.onLose) opts.onLose();
    else if (kind === 'flee' && opts.onFlee) opts.onFlee();
    else if (opts.onEnd) opts.onEnd(kind);
  }

  /* ---------- Visuelle Effekte ---------- */

  function lunge(a, t) {
    var dir = a.isEnemy ? 1 : -1;
    a.bx = 14 * dir;
  }

  function slash(t, crit) {
    var p = unitPos(t);
    B.fx.push({ t: 0, dur: .3, kind: 'slash', x: p.x, y: p.y, crit: crit });
  }

  function fxElement(t, element) {
    var p = unitPos(t);
    B.fx.push({ t: 0, dur: .55, kind: 'elem', x: p.x, y: p.y,
                color: (Data.ELEMENTS[element] || Data.ELEMENTS.none).color, element: element });
    if (element === 'earth' || element === 'thunder') GFX.shake(3);
  }

  function fxHeal(t) {
    var p = unitPos(t);
    B.fx.push({ t: 0, dur: .6, kind: 'heal', x: p.x, y: p.y });
  }

  /* ---------- Zeichnen ---------- */

  B.draw = function () {
    drawBackground();
    drawEnemies();
    drawParty();
    drawFx();
    drawPops();
    drawStatus();
    if (B.msgT > 0) drawMessage();
    if (B.flash > 0) GFX.fade(B.flash * .9, '#ffffff');
  };

  function drawBackground() {
    // Himmel
    for (var y = 0; y < HORIZON; y++) {
      GFX.rect(0, y, GFX.VW, 1, mix('#05060f', B.bg, y / HORIZON));
    }
    // Sterne
    for (var i = 0; i < 30; i++) {
      var sx = (i * 97) % GFX.VW;
      var sy = ((i * 53) % (HORIZON - 8)) + 3;
      var tw = (Math.sin(B.time * 2 + i) + 1) / 2;
      if (tw > .55) GFX.rect(sx, sy, 1, 1, 'rgba(200,210,255,' + (tw * .55) + ')');
    }
    // Ferne Huegel
    for (var x = 0; x < GFX.VW; x++) {
      var h = 10 + Math.sin(x * .045) * 5 + Math.sin(x * .014 + 1.7) * 6;
      GFX.rect(x, HORIZON - h, 1, h, mix(B.bg, '#000000', .45));
    }
    // Boden mit Perspektivstreifen
    for (y = HORIZON; y < STATUS_Y; y++) {
      var f = (y - HORIZON) / (STATUS_Y - HORIZON);
      GFX.rect(0, y, GFX.VW, 1, mix(mix(B.bg, '#ffffff', .10), '#0a0c14', 1 - f * .85));
    }
    GFX.rect(0, HORIZON, GFX.VW, 1, mix(B.bg, '#ffffff', .35));
    for (i = 2; i < 5; i++) {
      var ly = HORIZON + Math.round(Math.pow(i / 5, 2.1) * (STATUS_Y - HORIZON));
      GFX.rect(0, ly, GFX.VW, 1, 'rgba(255,255,255,.035)');
    }
  }

  function mix(a, b, t) {
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    var r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
    var g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
    var bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }

  function drawEnemies() {
    B.enemies.forEach(function (e) {
      var spr = Sprites.enemy[e.ref.sprite];
      if (!spr) return;
      var alpha = 1;
      if (!e.alive) {
        if (e.dying <= 0) return;
        alpha = e.dying / .45;
      }
      if (B.phase === 'intro') alpha *= 1 - Math.max(0, B.intro / .75) * .5;
      var bob = Math.sin(B.time * 2 + e.idx) * 1.5;
      var x = e.x + e.bx, y = e.y + e.by + bob;
      // Schatten
      var w = spr.width * e.scale;
      GFX.ctx.save();
      GFX.ctx.globalAlpha = .3 * alpha;
      GFX.rect(x + 3, e.y + spr.height * e.scale - 3, w - 6, 3, '#000');
      GFX.ctx.restore();
      if (e.flash > 0) {
        GFX.draw(GFX.tint(spr, '#ffffff'), x, y, e.scale, false, alpha);
      } else {
        GFX.draw(spr, x, y, e.scale, false, alpha);
      }
      // Statusanzeige
      var sy = y - 8, sx = x;
      for (var k in e.status) {
        if (!e.status[k]) continue;
        UI.text(Data.STATUS[k].short, sx, sy, Data.STATUS[k].color);
        sx += 20;
      }
    });
  }

  function drawParty() {
    B.party.forEach(function (a, i) {
      var set = Sprites.hero[a.sprite];
      if (!set) return;
      var spr = set.left[0];
      var x = PARTY_X + a.bx, y = PARTY_Y0 + i * PARTY_DY + a.by;
      if (a.hp <= 0) {
        GFX.ctx.save();
        GFX.ctx.globalAlpha = .45;
        GFX.ctx.translate(x + 16, y + 16);
        GFX.ctx.rotate(Math.PI / 2);
        GFX.ctx.drawImage(spr, -8, -8, 16, 16);
        GFX.ctx.restore();
        return;
      }
      GFX.ctx.save(); GFX.ctx.globalAlpha = .3;
      GFX.rect(x + 3, y + 15, 10, 3, '#000');
      GFX.ctx.restore();
      var bob = a.defending ? 0 : Math.sin(B.time * 3 + i) * 1;
      if (a.flash > 0) GFX.draw(GFX.tint(spr, '#ff8080'), x, y + bob, 1);
      else GFX.draw(spr, x, y + bob, 1);
      if (a.defending) {
        GFX.frame(x - 2, y - 2, 20, 20, 'rgba(140,190,255,.5)');
      }
    });
  }

  function drawFx() {
    var c = GFX.ctx;
    B.fx.forEach(function (f) {
      var p = f.t / f.dur;
      if (f.kind === 'slash') {
        var n = f.crit ? 3 : 2;
        for (var i = 0; i < n; i++) {
          var off = i * 6 - 3;
          var len = 26 * (1 - Math.abs(p - .4));
          c.save();
          c.globalAlpha = 1 - p;
          c.strokeStyle = f.crit ? '#ffe45c' : '#ffffff';
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(f.x - len / 2 + off, f.y - len / 2);
          c.lineTo(f.x + len / 2 + off, f.y + len / 2);
          c.stroke();
          c.restore();
        }
      } else if (f.kind === 'elem') {
        var r = 6 + p * 26;
        c.save();
        c.globalAlpha = (1 - p) * .95;
        c.strokeStyle = f.color; c.lineWidth = 2;
        c.beginPath(); c.arc(f.x, f.y, r, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.arc(f.x, f.y, r * .6, 0, Math.PI * 2); c.stroke();
        c.restore();
        for (var j = 0; j < 8; j++) {
          var ang = j / 8 * Math.PI * 2 + p * 3;
          var rr = r * (.5 + (j % 3) * .2);
          GFX.rect(Math.round(f.x + Math.cos(ang) * rr), Math.round(f.y + Math.sin(ang) * rr),
                   2, 2, f.color);
        }
      } else if (f.kind === 'heal') {
        for (var k = 0; k < 7; k++) {
          var a2 = (k / 7) * Math.PI * 2;
          var rad = 12 * (1 - p);
          var yy = f.y + 12 - p * 30 + Math.sin(a2) * 3;
          var xx = f.x + Math.cos(a2 + p * 2) * rad;
          c.save(); c.globalAlpha = 1 - p;
          GFX.rect(Math.round(xx), Math.round(yy), 2, 2, k % 2 ? '#b6ffd0' : '#ffffff');
          c.restore();
        }
      }
    });
  }

  function drawPops() {
    B.pops.forEach(function (p) {
      var k = p.t / p.dur;
      var y = p.y + p.vy * k - (-14) * k * k;
      var alpha = k > .75 ? (1 - k) / .25 : 1;
      GFX.ctx.save();
      GFX.ctx.globalAlpha = alpha;
      var s = p.text;
      if (p.big) {
        Font.drawCentered(GFX.ctx, s, p.x + p.ox, Math.round(y) - 1, '#3a2200');
        Font.drawCentered(GFX.ctx, s, p.x + p.ox + 1, Math.round(y), p.color);
      } else {
        Font.drawCentered(GFX.ctx, s, p.x + p.ox, Math.round(y), p.color, '#000000');
      }
      GFX.ctx.restore();
    });
  }

  function drawStatus() {
    var px = CMD_W + 4;
    UI.panel(px, STATUS_Y - 2, GFX.VW - px - 2, 88);
    B.party.forEach(function (a, i) {
      var x = px + 8, y = STATUS_Y + 4 + i * 20;
      var dead = a.hp <= 0;
      UI.text(a.name, x, y, dead ? '#e05050' : '#ffffff');
      // Status-Kuerzel
      var sx = x + 44;
      for (var k in a.status) {
        if (!a.status[k]) continue;
        UI.text(Data.STATUS[k].short, sx, y, Data.STATUS[k].color);
        sx += 20;
      }
      UI.text('KP', x + 100, y, UI.COL.dim);
      UI.textR(a.hp + '/' + a.maxhp, x + 158, y, UI.hpColor(a.hp, a.maxhp));
      UI.bar(x + 162, y + 1, 48, 5, a.hp, a.maxhp, UI.hpColor(a.hp, a.maxhp));
      UI.text('MP', x + 100, y + 9, UI.COL.dim);
      UI.textR(String(a.mp), x + 158, y + 9, UI.COL.mp);
      UI.bar(x + 162, y + 10, 48, 4, a.mp, a.maxmp, UI.COL.mp);
    });
  }

  function drawMessage() {
    var w = Font.width(B.msg) + 16;
    var x = Math.round((GFX.VW - w) / 2);
    UI.panel(x, 4, w, 16);
    UI.textC(B.msg, GFX.VW / 2, 9, '#ffffff');
  }

  /* ---------- Eingabe ---------- */

  B.key = function (k) {
    if (B.phase === 'intro' && (k === 'confirm')) { B.intro = 0; return; }
  };

  global.Battle = B;
})(window);
