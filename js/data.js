/* ============================================================
   data.js  --  Charakterklassen, Zauber, Fähigkeiten, Items,
                Ausrüstung, Gegner, Bosse, Begegnungstabellen
   ============================================================ */
(function (global) {
  'use strict';

  var D = {};

  /* ---------- Elemente ---------- */

  D.ELEMENTS = {
    none:    { name: '-',        color: '#cfd4e2' },
    fire:    { name: 'Feuer',    color: '#ff7a3a' },
    ice:     { name: 'Eis',      color: '#7fd8ff' },
    thunder: { name: 'Blitz',    color: '#ffe45c' },
    earth:   { name: 'Erde',     color: '#c9a05a' },
    wind:    { name: 'Wind',     color: '#8ff0c0' },
    holy:    { name: 'Heilig',   color: '#fff2a8' },
    dark:    { name: 'Dunkel',   color: '#c07aff' }
  };

  /* ---------- Statuseffekte ---------- */

  D.STATUS = {
    poison:  { name: 'Gift',    short: 'GIF', color: '#9ad84a' },
    sleep:   { name: 'Schlaf',  short: 'SLF', color: '#7fb0ff' },
    silence: { name: 'Stumm',   short: 'STM', color: '#c07aff' },
    blind:   { name: 'Blind',   short: 'BLD', color: '#8a8a9a' },
    slow:    { name: 'Langsam', short: 'LGS', color: '#c9903a' }
  };

  /* ---------- Zauber ---------- */

  D.SPELLS = {
    // Weißmagie
    heal:     { name: 'Heilung',      mp: 5,  kind: 'heal',  power: 70,  target: 'ally',   sfx: 'heal', desc: 'Heilt einen Verbündeten.' },
    healall:  { name: 'Vitalstrom',   mp: 14, kind: 'heal',  power: 60,  target: 'allies', sfx: 'heal', desc: 'Heilt die ganze Gruppe.' },
    heal2:    { name: 'Gr. Heilung',  mp: 18, kind: 'heal',  power: 200, target: 'ally',   sfx: 'heal', desc: 'Heilt einen Verbündeten stark.' },
    healall2: { name: 'Lebensquell',  mp: 32, kind: 'heal',  power: 170, target: 'allies', sfx: 'heal', desc: 'Heilt die Gruppe stark.' },
    cure:     { name: 'Reinigung',    mp: 6,  kind: 'cure',  target: 'ally',   sfx: 'holy', desc: 'Entfernt alle Statusleiden.' },
    revive:   { name: 'Wiederbelebg', mp: 22, kind: 'revive', power: .5, target: 'ally',   sfx: 'holy', desc: 'Belebt einen Gefallenen wieder.' },
    protect:  { name: 'Schutz',       mp: 8,  kind: 'buff',  stat: 'def', amount: .6, turns: 6, target: 'allies', sfx: 'magic', desc: 'Erhöht die Abwehr der Gruppe.' },
    aura:     { name: 'Aura',         mp: 16, kind: 'buff',  stat: 'atk', amount: .5, turns: 6, target: 'allies', sfx: 'magic', desc: 'Erhöht den Angriff der Gruppe.' },
    holy:     { name: 'Heiligstrahl', mp: 10, kind: 'mag',   element: 'holy', power: 60,  target: 'enemy', sfx: 'holy', desc: 'Heiliger Schaden an einem Gegner.' },
    judicium: { name: 'Judicium',     mp: 40, kind: 'mag',   element: 'holy', power: 150, target: 'enemies', sfx: 'holy', desc: 'Heiliges Gericht über alle Gegner.' },

    // Schwarzmagie
    fire:     { name: 'Feuer',   mp: 4,  kind: 'mag', element: 'fire',    power: 45,  target: 'enemy',   sfx: 'fire',    desc: 'Feuerschaden an einem Gegner.' },
    ice:      { name: 'Eis',     mp: 4,  kind: 'mag', element: 'ice',     power: 45,  target: 'enemy',   sfx: 'ice',     desc: 'Eisschaden an einem Gegner.' },
    thunder:  { name: 'Blitz',   mp: 5,  kind: 'mag', element: 'thunder', power: 48,  target: 'enemy',   sfx: 'thunder', desc: 'Blitzschaden an einem Gegner.' },
    fira:     { name: 'Feuera',  mp: 11, kind: 'mag', element: 'fire',    power: 105, target: 'enemy',   sfx: 'fire',    desc: 'Starker Feuerschaden.' },
    blizzara: { name: 'Eisa',    mp: 11, kind: 'mag', element: 'ice',     power: 105, target: 'enemy',   sfx: 'ice',     desc: 'Starker Eisschaden.' },
    thundara: { name: 'Blitza',  mp: 12, kind: 'mag', element: 'thunder', power: 110, target: 'enemy',   sfx: 'thunder', desc: 'Starker Blitzschaden.' },
    firaga:   { name: 'Feuerga', mp: 24, kind: 'mag', element: 'fire',    power: 130, target: 'enemies', sfx: 'fire',    desc: 'Feuersturm auf alle Gegner.' },
    blizzaga: { name: 'Eisga',   mp: 24, kind: 'mag', element: 'ice',     power: 130, target: 'enemies', sfx: 'ice',     desc: 'Eissturm auf alle Gegner.' },
    thundaga: { name: 'Blitzga', mp: 26, kind: 'mag', element: 'thunder', power: 135, target: 'enemies', sfx: 'thunder', desc: 'Gewitter auf alle Gegner.' },
    quake:    { name: 'Beben',   mp: 20, kind: 'mag', element: 'earth',   power: 120, target: 'enemies', sfx: 'quake',   desc: 'Erdschaden an allen Gegnern.' },
    meteor:   { name: 'Meteor',  mp: 48, kind: 'mag', element: 'none',    power: 230, target: 'enemies', sfx: 'quake',   desc: 'Meteore vernichten alle Gegner.' },
    sleepz:   { name: 'Schlaflied', mp: 6,  kind: 'status', status: 'sleep',   chance: .7, target: 'enemies', sfx: 'magic', desc: 'Schläfert Gegner ein.' },
    weaken:   { name: 'Schwäche',  mp: 9,  kind: 'debuff', stat: 'def', amount: -.4, turns: 5, target: 'enemy', sfx: 'magic', desc: 'Senkt die Abwehr eines Gegners.' },
    poisonz:  { name: 'Giftwolke',  mp: 8,  kind: 'status', status: 'poison', chance: .8, target: 'enemies', sfx: 'magic', desc: 'Vergiftet alle Gegner.' }
  };

  /* ---------- Fähigkeiten (körperlich) ---------- */

  D.ABILITIES = {
    power:    { name: 'Kraftschlag',   mp: 3,  kind: 'phys', mult: 1.9, target: 'enemy',   sfx: 'hit',  desc: 'Ein wuchtiger Hieb.' },
    taunt:    { name: 'Provozieren',   mp: 2,  kind: 'taunt', turns: 3, target: 'self',    sfx: 'guard', desc: 'Zieht Angriffe auf dich und erhöht die Abwehr.' },
    shield:   { name: 'Schildwall',    mp: 9,  kind: 'buff', stat: 'def', amount: .9, turns: 4, target: 'allies', sfx: 'guard', desc: 'Schützt die ganze Gruppe.' },
    charge:   { name: 'Sturmangriff',  mp: 7,  kind: 'phys', mult: 2.6, selfDef: -.3, target: 'enemy', sfx: 'crit', desc: 'Enorme Wucht, aber offene Deckung.' },
    whirl:    { name: 'Klingenwirbel', mp: 12, kind: 'phys', mult: 1.15, target: 'enemies', sfx: 'hit', desc: 'Trifft alle Gegner.' },
    laststand:{ name: 'Letzte Bastion', mp: 20, kind: 'laststand', target: 'self',   sfx: 'holy', desc: 'Heilt dich und verdoppelt deine Abwehr.' },

    dbl:      { name: 'Doppelschlag',  mp: 4,  kind: 'phys', mult: .85, hits: 2, target: 'enemy', sfx: 'hit', desc: 'Zwei schnelle Treffer.' },
    steal:    { name: 'Stehlen',       mp: 0,  kind: 'steal', target: 'enemy', sfx: 'item', desc: 'Stiehlt einem Gegner etwas.' },
    poisondag:{ name: 'Giftdolch',     mp: 5,  kind: 'phys', mult: 1.1, status: 'poison', chance: .75, target: 'enemy', sfx: 'hit', desc: 'Vergiftet das Ziel.' },
    smoke:    { name: 'Rauchbombe',    mp: 6,  kind: 'status', status: 'blind', chance: .8, target: 'enemies', sfx: 'wind', desc: 'Blendet alle Gegner.' },
    shadow:   { name: 'Schattenschritt', mp: 8, kind: 'evade', turns: 3, target: 'self', sfx: 'wind', desc: 'Stark erhöhte Ausweichchance.' },
    weakpoint:{ name: 'Schwachpunkt',  mp: 11, kind: 'phys', mult: 1.6, pierce: true, target: 'enemy', sfx: 'crit', desc: 'Ignoriert die Abwehr des Ziels.' },
    thousand: { name: 'Tausend Klingen', mp: 26, kind: 'phys', mult: .8, hits: 4, random: true, target: 'enemies', sfx: 'crit', desc: 'Vier Treffer auf zufällige Gegner.' }
  };

  /* ---------- Items ---------- */

  D.ITEMS = {
    trank:    { name: 'Trank',        price: 50,   kind: 'heal',   power: 90,  target: 'ally',   battle: true, desc: 'Stellt 90 KP her.' },
    hitrank:  { name: 'Hi-Trank',     price: 300,  kind: 'heal',   power: 350, target: 'ally',   battle: true, desc: 'Stellt 350 KP her.' },
    xtrank:   { name: 'X-Trank',      price: 900,  kind: 'heal',   power: 9999, target: 'ally',  battle: true, desc: 'Stellt alle KP her.' },
    aether:   { name: 'Aether',       price: 400,  kind: 'mp',     power: 60,  target: 'ally',   battle: true, desc: 'Stellt 60 MP her.' },
    elixier:  { name: 'Elixier',      price: 2000, kind: 'full',   target: 'ally',   battle: true, desc: 'Stellt KP und MP komplett her.' },
    phoenix:  { name: 'Phönixfeder', price: 250,  kind: 'revive', power: .5,  target: 'ally',   battle: true, desc: 'Belebt einen Gefallenen wieder.' },
    antidot:  { name: 'Antidot',      price: 40,   kind: 'cure',   status: 'poison', target: 'ally', battle: true, desc: 'Heilt Gift.' },
    augentr:  { name: 'Augentropfen', price: 40,   kind: 'cure',   status: 'blind',  target: 'ally', battle: true, desc: 'Heilt Blindheit.' },
    wachruf:  { name: 'Weckruf',      price: 40,   kind: 'cure',   status: 'sleep',  target: 'ally', battle: true, desc: 'Weckt Schlafende.' },
    echokraut:{ name: 'Echokraut',    price: 60,   kind: 'cure',   status: 'silence', target: 'ally', battle: true, desc: 'Heilt Stummheit.' },
    heilwasser:{name: 'Heilwasser',   price: 220,  kind: 'cureall', target: 'ally',  battle: true, desc: 'Heilt alle Statusleiden.' },
    bombe:    { name: 'Feuerbombe',   price: 180,  kind: 'attack', element: 'fire',    power: 140, target: 'enemies', battle: true, sfx: 'fire',    desc: 'Feuerschaden an allen Gegnern.' },
    frostkug: { name: 'Frostkugel',   price: 180,  kind: 'attack', element: 'ice',     power: 140, target: 'enemies', battle: true, sfx: 'ice',     desc: 'Eisschaden an allen Gegnern.' },
    donnerst: { name: 'Donnerstein',  price: 180,  kind: 'attack', element: 'thunder', power: 140, target: 'enemies', battle: true, sfx: 'thunder', desc: 'Blitzschaden an allen Gegnern.' },
    zelt:     { name: 'Zelt',         price: 350,  kind: 'tent',   target: 'party',  battle: false, desc: 'Stellt die Gruppe außerhalb von Kämpfen her.' },
    kristallsplitter: { name: 'Kristallsplitter', price: 0, kind: 'key', desc: 'Ein Splitter reinen Kristalllichts.' }
  };

  /* ---------- Ausrüstung ---------- */

  function W(id, name, kind, price, mods, desc, el) {
    D.EQUIP[id] = { id: id, name: name, slot: 'weapon', kind: kind, price: price, mods: mods, desc: desc || '', element: el };
  }
  function A(id, name, slot, kind, price, mods, desc) {
    D.EQUIP[id] = { id: id, name: name, slot: slot, kind: kind, price: price, mods: mods, desc: desc || '' };
  }

  D.EQUIP = {};

  // Schwerter (Alric)
  W('sword1', 'Kurzschwert',   'sword', 120,  { atk: 8 });
  W('sword2', 'Breitschwert',  'sword', 600,  { atk: 18 });
  W('sword3', 'Ritterklinge',  'sword', 2200, { atk: 32, def: 4 });
  W('sword4', 'Drachentöter', 'sword', 6000, { atk: 48, spd: 2 }, 'Gegen Drachen besonders wirksam.');
  W('sword5', 'Aetherklinge',  'sword', 0,    { atk: 66, mag: 10 }, 'Klinge aus reinem Kristalllicht.', 'holy');
  // Stäbe (Lyra)
  W('staff1', 'Eichenstab',    'staff', 100,  { atk: 5, mag: 4 });
  W('staff2', 'Silberstab',    'staff', 520,  { atk: 9, mag: 11 });
  W('staff3', 'Segensstab',    'staff', 2000, { atk: 14, mag: 22, res: 6 });
  W('staff4', 'Lichtszepter',  'staff', 5600, { atk: 20, mag: 36, res: 12 }, '', 'holy');
  // Ruten (Faelan)
  W('rod1',   'Zauberrute',    'rod',   100,  { atk: 4, mag: 6 });
  W('rod2',   'Flammenrute',   'rod',   540,  { atk: 7, mag: 15 }, '', 'fire');
  W('rod3',   'Sturmrute',     'rod',   2050, { atk: 11, mag: 27 }, '', 'thunder');
  W('rod4',   'Chaosrute',     'rod',   5800, { atk: 15, mag: 44 }, '', 'dark');
  // Dolche (Nyx)
  W('dag1',   'Dolch',         'dagger', 110, { atk: 7, spd: 1 });
  W('dag2',   'Sturmdolch',    'dagger', 560, { atk: 16, spd: 3 });
  W('dag3',   'Schattenklinge','dagger', 2100,{ atk: 29, spd: 5, luk: 4 });
  W('dag4',   'Mondsichel',    'dagger', 5800,{ atk: 44, spd: 8, luk: 8 });

  // Schwere Rüstung
  A('hv1', 'Lederrüstung',  'armor', 'heavy', 130,  { def: 6 });
  A('hv2', 'Kettenpanzer',   'armor', 'heavy', 620,  { def: 14 });
  A('hv3', 'Ritterplatte',   'armor', 'heavy', 2300, { def: 24, res: 6 });
  A('hv4', 'Drachenpanzer',  'armor', 'heavy', 6200, { def: 36, res: 12, spd: -1 });
  // Roben
  A('rb1', 'Stoffrobe',      'armor', 'robe', 110,  { def: 4, res: 5 });
  A('rb2', 'Magierrobe',     'armor', 'robe', 520,  { def: 8, res: 12 });
  A('rb3', 'Weiße Robe',    'armor', 'robe', 2000, { def: 13, res: 21, mag: 4 });
  A('rb4', 'Sternenrobe',    'armor', 'robe', 5600, { def: 19, res: 32, mag: 10 });
  // Leichte Rüstung
  A('lt1', 'Lederwams',      'armor', 'light', 120, { def: 5, spd: 1 });
  A('lt2', 'Nachtmantel',    'armor', 'light', 560, { def: 11, spd: 2 });
  A('lt3', 'Schattenrobe',   'armor', 'light', 2100,{ def: 18, spd: 4, luk: 3 });
  A('lt4', 'Windschleier',   'armor', 'light', 5800,{ def: 27, spd: 7, luk: 6 });

  // Accessoires (für alle)
  A('ac1', 'Kraftring',      'acc', 'acc', 700,  { atk: 10 });
  A('ac2', 'Schutzamulett',  'acc', 'acc', 700,  { def: 9 });
  A('ac3', 'Magiering',      'acc', 'acc', 900,  { mag: 12 });
  A('ac4', 'Flinke Stiefel', 'acc', 'acc', 900,  { spd: 8 });
  A('ac5', 'Glücksmünze',  'acc', 'acc', 800,  { luk: 12 });
  A('ac6', 'Elfenreif',      'acc', 'acc', 1400, { mag: 6, res: 10, mp: 25 });
  A('ac7', 'Kristallkette','acc', 'acc', 4000, { atk: 6, def: 6, mag: 6, res: 6, spd: 3 });

  D.SLOT_KINDS = {
    alric:  { weapon: ['sword'],  armor: ['heavy', 'light'] },
    lyra:   { weapon: ['staff'],  armor: ['robe', 'light'] },
    faelan: { weapon: ['rod'],    armor: ['robe'] },
    nyx:    { weapon: ['dagger'], armor: ['light', 'robe'] }
  };

  /* ---------- Charakterklassen ---------- */

  D.CHARS = {
    alric: {
      id: 'alric', name: 'Alric', cls: 'Ritter', sprite: 'alric',
      base: { hp: 46, mp: 8, atk: 13, def: 12, mag: 4, res: 6, spd: 8, luk: 6 },
      grow: { hp: 9.5, mp: 1.2, atk: 2.4, def: 2.2, mag: .5, res: 1.1, spd: 1.0, luk: .8 },
      abilities: [[1, 'power'], [3, 'taunt'], [7, 'shield'], [12, 'charge'], [18, 'whirl'], [26, 'laststand']],
      spells: [],
      equip: { weapon: 'sword1', armor: 'hv1', acc: null },
      cmd: ['Angriff', 'Fähigkeit', 'Item', 'Verteidigen'],
      bio: 'Hauptmann der Wache von Aldenmark. Standhaft und pflichtbewusst.'
    },
    lyra: {
      id: 'lyra', name: 'Lyra', cls: 'Weißmagierin', sprite: 'lyra',
      base: { hp: 32, mp: 20, atk: 7, def: 7, mag: 14, res: 13, spd: 9, luk: 8 },
      grow: { hp: 6.0, mp: 3.8, atk: 1.0, def: 1.3, mag: 2.5, res: 2.1, spd: 1.1, luk: 1.0 },
      abilities: [],
      spells: [[1, 'heal'], [3, 'protect'], [5, 'cure'], [7, 'holy'], [10, 'healall'],
               [14, 'revive'], [17, 'heal2'], [21, 'aura'], [26, 'healall2'], [31, 'judicium']],
      equip: { weapon: 'staff1', armor: 'rb1', acc: null },
      cmd: ['Angriff', 'Magie', 'Item', 'Verteidigen'],
      bio: 'Heilerin des Lichttempels. Sanft, aber unbeugsam im Willen.'
    },
    faelan: {
      id: 'faelan', name: 'Faelan', cls: 'Schwarzmagier', sprite: 'faelan',
      base: { hp: 28, mp: 22, atk: 6, def: 6, mag: 16, res: 11, spd: 10, luk: 7 },
      grow: { hp: 5.4, mp: 4.2, atk: .9, def: 1.1, mag: 2.9, res: 1.7, spd: 1.2, luk: 1.0 },
      abilities: [],
      spells: [[1, 'fire'], [1, 'ice'], [4, 'thunder'], [6, 'sleepz'], [9, 'weaken'],
               [11, 'fira'], [13, 'blizzara'], [15, 'thundara'], [18, 'poisonz'],
               [21, 'quake'], [24, 'firaga'], [26, 'blizzaga'], [28, 'thundaga'], [33, 'meteor']],
      equip: { weapon: 'rod1', armor: 'rb1', acc: null },
      cmd: ['Angriff', 'Magie', 'Item', 'Verteidigen'],
      bio: 'Verbannter Gelehrter der Sturmakademie. Sucht Wissen um jeden Preis.'
    },
    nyx: {
      id: 'nyx', name: 'Nyx', cls: 'Schurkin', sprite: 'nyx',
      base: { hp: 36, mp: 12, atk: 11, def: 8, mag: 8, res: 8, spd: 15, luk: 13 },
      grow: { hp: 7.0, mp: 1.9, atk: 2.1, def: 1.5, mag: 1.2, res: 1.4, spd: 1.9, luk: 1.7 },
      abilities: [[1, 'dbl'], [1, 'steal'], [4, 'poisondag'], [8, 'smoke'],
                  [12, 'shadow'], [16, 'weakpoint'], [24, 'thousand']],
      spells: [],
      equip: { weapon: 'dag1', armor: 'lt1', acc: null },
      cmd: ['Angriff', 'Fähigkeit', 'Item', 'Verteidigen'],
      bio: 'Diebin aus den Nordmarken. Loyal gegenüber denen, die sie sich verdient.'
    }
  };

  /* ---------- Erfahrungskurve ---------- */

  D.xpToNext = function (lvl) {
    // An den typischen Spielverlauf angepasst: ohne Grinden ~Stufe 11/19/26/31/39 vor den Bossen
    return Math.round(5 * Math.pow(lvl, 1.75) + 15);
  };

  D.MAX_LEVEL = 50;

  /* ---------- Gegner ---------- */

  function mk(id, o) { o.id = id; D.ENEMIES[id] = o; return o; }
  D.ENEMIES = {};

  // -- Region: Grasland --
  mk('slime',      { name: 'Grünschleim',   sprite: 'slime',      hp: 30,  atk: 7,  def: 5,  mag: 4,  res: 4,  spd: 5,  exp: 8,   gold: 10,  weak: ['fire'], resist: ['water'], drop: ['trank', .14] });
  mk('bat',        { name: 'Höhlenfledermaus', sprite: 'bat',     hp: 24,  atk: 8,  def: 4,  mag: 5,  res: 5,  spd: 14, exp: 9,   gold: 12,  weak: ['wind'], drop: ['antidot', .12] });
  mk('wolf',       { name: 'Steppenwolf',    sprite: 'wolf',       hp: 40,  atk: 11, def: 7,  mag: 3,  res: 5,  spd: 12, exp: 14,  gold: 16,  weak: ['ice'], drop: ['trank', .14] });
  mk('goblin',     { name: 'Goblin',         sprite: 'goblin',     hp: 48,  atk: 12, def: 9,  mag: 4,  res: 6,  spd: 8,  exp: 17,  gold: 24,  drop: ['trank', .16],
                     skills: [{ name: 'Keulenhieb', kind: 'phys', mult: 1.4, weight: 22 }] });
  mk('plant',      { name: 'Rankenwürger',  sprite: 'plant',      hp: 60,  atk: 13, def: 12, mag: 8,  res: 8,  spd: 4,  exp: 18,  gold: 18,  weak: ['fire'], resist: ['earth'],
                     skills: [{ name: 'Giftsporen', kind: 'status', status: 'poison', chance: .6, target: 'enemies', weight: 30, sfx: 'wind' }] });

  // -- Region: Aschland & Feuerhöhle (früh) --
  mk('slime_ember',{ name: 'Glutschleim',    sprite: 'slime_fire', hp: 54,  atk: 13, def: 8,  mag: 10, res: 8,  spd: 6,  exp: 26,  gold: 26,  weak: ['ice'], resist: ['fire'], drop: ['trank', .15],
                     skills: [{ name: 'Funkenspritzer', kind: 'mag', element: 'fire', power: 30, weight: 30, sfx: 'fire' }] });
  mk('imp',        { name: 'Feuerkobold',    sprite: 'imp',        hp: 62,  atk: 17, def: 10, mag: 9,  res: 8,  spd: 11, exp: 30,  gold: 34,  weak: ['ice'], resist: ['fire'], drop: ['antidot', .12],
                     skills: [{ name: 'Glutwurf', kind: 'mag', element: 'fire', power: 34, weight: 25, sfx: 'fire' },
                              { name: 'Kratzer', kind: 'phys', mult: 1.4, weight: 20 }] });

  // -- Region: Wald & Sumpf --
  mk('wisp',       { name: 'Irrlicht',       sprite: 'wisp',       hp: 48,  atk: 9,  def: 8,  mag: 18, res: 16, spd: 13, exp: 20,  gold: 24,  weak: ['thunder'], resist: ['fire', 'ice'],
                     skills: [{ name: 'Funkenflug', kind: 'mag', element: 'thunder', power: 45, weight: 45, sfx: 'thunder' }] });
  mk('goblin_sh',  { name: 'Goblin-Schamane', sprite: 'goblin_sh', hp: 64,  atk: 12, def: 9,  mag: 20, res: 14, spd: 10, exp: 26,  gold: 34,  drop: ['aether', .1],
                     skills: [{ name: 'Fluch', kind: 'mag', element: 'dark', power: 50, weight: 35, sfx: 'dark' },
                              { name: 'Heilritual', kind: 'healself', power: 70, weight: 20, sfx: 'heal' }] });
  mk('bat_shadow', { name: 'Schattenflatterer', sprite: 'bat_shadow', hp: 58, atk: 20, def: 8, mag: 12, res: 12, spd: 19, exp: 24, gold: 26, weak: ['holy'], resist: ['dark'],
                     skills: [{ name: 'Blutsauger', kind: 'drain', mult: 1.0, weight: 30, sfx: 'dark' }] });
  mk('skeleton',   { name: 'Skelettkrieger', sprite: 'skeleton',   hp: 78,  atk: 24, def: 16, mag: 5,  res: 10, spd: 9,  exp: 32,  gold: 40,  weak: ['holy'], resist: ['dark', 'ice'], immune: ['poison'],
                     skills: [{ name: 'Knochenhieb', kind: 'phys', mult: 1.6, weight: 30 }] });

  // -- Region: Wüste --
  mk('bandit',     { name: 'Wüstenräuber', sprite: 'bandit',     hp: 92,  atk: 30, def: 18, mag: 6,  res: 10, spd: 16, exp: 46,  gold: 90,  drop: ['hitrank', .12],
                     skills: [{ name: 'Doppelhieb', kind: 'phys', mult: .9, hits: 2, weight: 35 },
                              { name: 'Sandwurf', kind: 'status', status: 'blind', chance: .6, weight: 20, sfx: 'wind' }] });
  mk('serpent',    { name: 'Sandwurm',       sprite: 'serpent',    hp: 120, atk: 34, def: 22, mag: 8,  res: 12, spd: 8,  exp: 58,  gold: 70,  weak: ['ice'], resist: ['earth'],
                     skills: [{ name: 'Verschlingen', kind: 'phys', mult: 2.0, weight: 25 },
                              { name: 'Giftbiss', kind: 'phys', mult: 1.1, status: 'poison', chance: .7, weight: 20 }] });
  mk('plant_d',    { name: 'Sandkriecher',   sprite: 'plant_d',    hp: 104, atk: 26, def: 24, mag: 14, res: 14, spd: 6,  exp: 50,  gold: 56,  weak: ['fire'],
                     skills: [{ name: 'Dornenpeitsche', kind: 'phys', mult: 1.4, target: 'enemies', weight: 25 }] });
  mk('golem',      { name: 'Steingolem',     sprite: 'golem',      hp: 168, atk: 36, def: 34, mag: 6,  res: 18, spd: 4,  exp: 74,  gold: 110, weak: ['thunder'], resist: ['earth'], immune: ['poison', 'sleep'],
                     skills: [{ name: 'Felsfaust', kind: 'phys', mult: 1.8, weight: 30 },
                              { name: 'Steinschlag', kind: 'mag', element: 'earth', power: 80, target: 'enemies', weight: 15, sfx: 'quake' }] });

  // -- Region: Schnee --
  mk('slime_ice',  { name: 'Frostschleim',   sprite: 'slime_ice',  hp: 96,  atk: 24, def: 20, mag: 16, res: 20, spd: 6,  exp: 44,  gold: 48,  weak: ['fire'], resist: ['ice'], immune: ['sleep'],
                     skills: [{ name: 'Frosthauch', kind: 'mag', element: 'ice', power: 70, weight: 35, sfx: 'ice' }] });
  mk('wolf_ice',   { name: 'Frostwolf',      sprite: 'wolf_ice',   hp: 118, atk: 34, def: 20, mag: 12, res: 18, spd: 18, exp: 56,  gold: 62,  weak: ['fire'], resist: ['ice'],
                     skills: [{ name: 'Eisfang', kind: 'phys', mult: 1.7, element: 'ice', weight: 30 },
                              { name: 'Rudelheulen', kind: 'buffself', stat: 'atk', amount: .5, turns: 4, weight: 15, sfx: 'wind' }] });
  mk('wisp_wind',  { name: 'Sturmgeist',     sprite: 'wisp_wind',  hp: 104, atk: 20, def: 16, mag: 30, res: 26, spd: 22, exp: 62,  gold: 76,  weak: ['thunder'], resist: ['wind'],
                     skills: [{ name: 'Windschnitt', kind: 'mag', element: 'wind', power: 85, target: 'enemies', weight: 35, sfx: 'wind' },
                              { name: 'Stille', kind: 'status', status: 'silence', chance: .6, weight: 15, sfx: 'magic' }] });
  mk('knight',     { name: 'Verlorene Wache', sprite: 'knight',    hp: 196, atk: 46, def: 40, mag: 10, res: 20, spd: 12, exp: 96,  gold: 150, weak: ['thunder'], immune: ['poison'],
                     skills: [{ name: 'Wuchtstoß', kind: 'phys', mult: 2.0, weight: 30 },
                              { name: 'Schildstoß', kind: 'phys', mult: 1.2, status: 'blind', chance: .5, weight: 15 }] });

  // -- Region: Vulkan --
  mk('slime_fire', { name: 'Magmaschleim',   sprite: 'slime_fire', hp: 130, atk: 32, def: 22, mag: 22, res: 22, spd: 7,  exp: 66,  gold: 70,  weak: ['ice'], resist: ['fire'], immune: ['poison'],
                     skills: [{ name: 'Glutspritzer', kind: 'mag', element: 'fire', power: 85, weight: 35, sfx: 'fire' }] });
  mk('golem_fire', { name: 'Magmagolem',     sprite: 'golem_fire', hp: 230, atk: 50, def: 38, mag: 24, res: 24, spd: 6,  exp: 118, gold: 170, weak: ['ice'], resist: ['fire', 'earth'], immune: ['poison', 'sleep'],
                     skills: [{ name: 'Lavabrocken', kind: 'mag', element: 'fire', power: 105, target: 'enemies', weight: 25, sfx: 'fire' },
                              { name: 'Bersten', kind: 'phys', mult: 2.2, weight: 25 }] });
  mk('serpent_d',  { name: 'Jungdrache',     sprite: 'serpent_d',  hp: 260, atk: 56, def: 36, mag: 34, res: 28, spd: 15, exp: 140, gold: 210, resist: ['fire'],
                     skills: [{ name: 'Flammenodem', kind: 'mag', element: 'fire', power: 120, target: 'enemies', weight: 30, sfx: 'fire' },
                              { name: 'Klauenhieb', kind: 'phys', mult: 1.9, weight: 30 }] });

  // -- Region: Finsterland --
  mk('skeleton_d', { name: 'Grabwächter',   sprite: 'skeleton_d', hp: 240, atk: 58, def: 42, mag: 26, res: 30, spd: 14, exp: 150, gold: 190, weak: ['holy'], resist: ['dark', 'ice'], immune: ['poison', 'sleep'],
                     skills: [{ name: 'Seelenschnitt', kind: 'drain', mult: 1.3, weight: 30, sfx: 'dark' },
                              { name: 'Grabesfluch', kind: 'status', status: 'slow', chance: .6, target: 'enemies', weight: 15, sfx: 'dark' }] });
  mk('wisp_dark',  { name: 'Schattenauge',   sprite: 'wisp_dark',  hp: 200, atk: 34, def: 28, mag: 46, res: 40, spd: 20, exp: 158, gold: 200, weak: ['holy'], resist: ['dark'],
                     skills: [{ name: 'Finsterstrahl', kind: 'mag', element: 'dark', power: 130, weight: 35, sfx: 'dark' },
                              { name: 'Albtraum', kind: 'status', status: 'sleep', chance: .5, target: 'enemies', weight: 15, sfx: 'magic' }] });
  mk('knight_d',   { name: 'Todesritter',    sprite: 'knight_d',   hp: 340, atk: 74, def: 54, mag: 30, res: 34, spd: 16, exp: 205, gold: 280, weak: ['holy'], resist: ['dark'], immune: ['poison', 'sleep'],
                     skills: [{ name: 'Seelenklinge', kind: 'phys', mult: 2.3, element: 'dark', weight: 30 },
                              { name: 'Schreckensruf', kind: 'debuffall', stat: 'atk', amount: -.35, turns: 4, weight: 15, sfx: 'dark' }] });

  /* ---------- Bosse ---------- */

  mk('boss_dragon', {
    name: 'Ignarok', title: 'Feuerdrache', sprite: 'boss_dragon', boss: true,
    hp: 1050, atk: 40, def: 30, mag: 36, res: 26, spd: 12, exp: 600, gold: 900,
    weak: ['ice'], resist: ['fire'], immune: ['poison', 'sleep', 'blind'],
    skills: [
      { name: 'Flammenodem', kind: 'mag', element: 'fire', power: 95, target: 'enemies', weight: 30, sfx: 'fire' },
      { name: 'Klauenhieb', kind: 'phys', mult: 1.8, weight: 30 },
      { name: 'Schwingenschlag', kind: 'phys', mult: 1.1, target: 'enemies', weight: 20, sfx: 'wind' },
      { name: 'Inferno', kind: 'mag', element: 'fire', power: 145, target: 'enemies', weight: 12, hpBelow: .4, sfx: 'fire' }
    ]
  });

  mk('boss_ice', {
    name: 'Glacius', title: 'Eiskoloss', sprite: 'boss_ice', boss: true,
    hp: 2900, atk: 62, def: 48, mag: 46, res: 40, spd: 9, exp: 1100, gold: 1400,
    weak: ['fire'], resist: ['ice', 'earth'], immune: ['poison', 'sleep', 'slow'],
    skills: [
      { name: 'Frostnova', kind: 'mag', element: 'ice', power: 125, target: 'enemies', weight: 30, sfx: 'ice' },
      { name: 'Eisfaust', kind: 'phys', mult: 2.1, weight: 30 },
      { name: 'Frostpanzer', kind: 'buffself', stat: 'def', amount: .6, turns: 4, weight: 12, sfx: 'guard' },
      { name: 'Absoluter Nullpunkt', kind: 'mag', element: 'ice', power: 165, target: 'enemies', weight: 14, hpBelow: .35, sfx: 'ice' }
    ]
  });

  mk('boss_witch', {
    name: 'Sylphara', title: 'Sturmhexe', sprite: 'boss_witch', boss: true,
    hp: 5200, atk: 58, def: 42, mag: 72, res: 54, spd: 24, exp: 1800, gold: 2000,
    weak: ['thunder'], resist: ['wind', 'dark'], immune: ['sleep', 'silence'],
    skills: [
      { name: 'Orkanklinge', kind: 'mag', element: 'wind', power: 140, target: 'enemies', weight: 28, sfx: 'wind' },
      { name: 'Blitzschlag', kind: 'mag', element: 'thunder', power: 165, weight: 25, sfx: 'thunder' },
      { name: 'Bann der Stille', kind: 'status', status: 'silence', chance: .7, target: 'enemies', weight: 14, sfx: 'magic' },
      { name: 'Windzehrer', kind: 'drain', mult: 1.6, weight: 18, sfx: 'wind' },
      { name: 'Sturm des Endes', kind: 'mag', element: 'wind', power: 180, target: 'enemies', weight: 15, hpBelow: .35, sfx: 'wind' }
    ]
  });

  mk('boss_titan', {
    name: 'Terramoth', title: 'Erdtitan', sprite: 'boss_titan', boss: true,
    hp: 6200, atk: 88, def: 62, mag: 50, res: 46, spd: 11, exp: 2600, gold: 2800,
    weak: ['wind'], resist: ['earth', 'fire'], immune: ['poison', 'sleep', 'blind', 'slow'],
    skills: [
      { name: 'Erdspalt', kind: 'mag', element: 'earth', power: 130, target: 'enemies', weight: 28, sfx: 'quake' },
      { name: 'Titanenfaust', kind: 'phys', mult: 2.4, weight: 30 },
      { name: 'Steinhaut', kind: 'buffself', stat: 'def', amount: .5, turns: 5, weight: 10, sfx: 'guard' },
      { name: 'Zermalmen', kind: 'phys', mult: 1.5, target: 'enemies', weight: 18 },
      { name: 'Weltenbeben', kind: 'mag', element: 'earth', power: 180, target: 'enemies', weight: 14, hpBelow: .3, sfx: 'quake' }
    ]
  });

  mk('boss_dark', {
    name: 'Malkoth', title: 'Der Schattenfürst', sprite: 'boss_dark', boss: true, final: true,
    hp: 9500, atk: 96, def: 70, mag: 92, res: 62, spd: 20, exp: 9999, gold: 9999,
    weak: ['holy'], resist: ['dark', 'fire', 'ice', 'thunder'], immune: ['poison', 'sleep', 'blind', 'silence', 'slow'],
    skills: [
      { name: 'Finsternisstoß', kind: 'mag', element: 'dark', power: 140, target: 'enemies', weight: 26, sfx: 'dark' },
      { name: 'Schattenklinge', kind: 'phys', mult: 2.4, element: 'dark', weight: 26 },
      { name: 'Seelenraub', kind: 'drain', mult: 2.0, weight: 18, sfx: 'dark' },
      { name: 'Verzweiflung', kind: 'debuffall', stat: 'def', amount: -.4, turns: 4, weight: 10, sfx: 'dark' },
      { name: 'Ende aller Dinge', kind: 'mag', element: 'dark', power: 195, target: 'enemies', weight: 18, hpBelow: .35, sfx: 'dark' }
    ]
  });

  /* ---------- Begegnungstabellen ---------- */

  D.ENCOUNTERS = {
    grass:    [['slime', 3], ['bat', 3], ['wolf', 2], ['goblin', 2]],
    forest:   [['plant', 3], ['wisp', 2], ['goblin', 2], ['bat', 2], ['wolf', 2]],
    swamp:    [['plant', 3], ['bat_shadow', 2], ['goblin_sh', 2], ['skeleton', 1]],
    desert:   [['bandit', 3], ['serpent', 2], ['plant_d', 2], ['golem', 1]],
    snow:     [['slime_ice', 3], ['wolf_ice', 3], ['wisp_wind', 2], ['skeleton', 2]],
    volcano:  [['slime_ember', 3], ['imp', 2], ['wolf', 2], ['bat', 2]],
    mountain: [['wisp_wind', 3], ['knight', 2], ['skeleton', 2], ['wolf_ice', 2]],
    dark:     [['knight_d', 2], ['skeleton_d', 3], ['wisp_dark', 3], ['serpent_d', 2]],

    // Dungeons
    cave_fire:  [['slime_ember', 3], ['imp', 3], ['bat', 2], ['goblin', 2], ['skeleton', 1]],
    temple_ice: [['slime_ice', 3], ['wolf_ice', 3], ['skeleton', 2], ['wisp', 2]],
    tower_wind: [['wisp_wind', 3], ['bat_shadow', 3], ['knight', 2], ['goblin_sh', 2]],
    ruins_earth:[['golem', 3], ['serpent', 3], ['plant_d', 2], ['bandit', 2], ['knight', 2]],
    fortress:   [['knight_d', 3], ['skeleton_d', 3], ['wisp_dark', 3], ['golem_fire', 2], ['serpent_d', 2], ['slime_fire', 1]]
  };

  /** Wählt eine Gegnergruppe passend zur Tabelle und Gruppenstärke. */
  D.rollEncounter = function (tableId, avgLevel) {
    var table = D.ENCOUNTERS[tableId] || D.ENCOUNTERS.grass;
    var total = 0, i;
    for (i = 0; i < table.length; i++) total += table[i][1];

    function pick() {
      var r = Math.random() * total;
      for (var j = 0; j < table.length; j++) { r -= table[j][1]; if (r <= 0) return table[j][0]; }
      return table[0][0];
    }

    // Gruppengröße wächst mit der Gruppenstärke
    var count = 1;
    if (avgLevel >= 3 && Math.random() < .5) count++;
    if (avgLevel >= 7 && Math.random() < .45) count++;
    if (avgLevel >= 14 && Math.random() < .35) count++;
    count = Math.min(4, count);

    var group = [];
    var lead = pick();
    for (i = 0; i < count; i++) group.push(Math.random() < .65 ? lead : pick());
    return group;
  };

  /* ---------- Läden ---------- */

  D.SHOPS = {
    aldenmark_item: { name: 'Kräuterladen', kind: 'item',
      stock: ['trank', 'antidot', 'augentr', 'wachruf', 'echokraut', 'zelt'] },
    aldenmark_gear: { name: 'Waffenschmiede', kind: 'gear',
      stock: ['sword1', 'staff1', 'rod1', 'dag1', 'hv1', 'rb1', 'lt1'] },
    selvia_item: { name: 'Hafenmarkt', kind: 'item',
      stock: ['trank', 'hitrank', 'aether', 'phoenix', 'antidot', 'augentr', 'wachruf', 'echokraut', 'heilwasser', 'bombe', 'zelt'] },
    selvia_gear: { name: 'Selvias Ausrüster', kind: 'gear',
      stock: ['sword2', 'staff2', 'rod2', 'dag2', 'hv2', 'rb2', 'lt2', 'ac1', 'ac2'] },
    nordheim_item: { name: 'Nordwarenhaus', kind: 'item',
      stock: ['hitrank', 'xtrank', 'aether', 'phoenix', 'heilwasser', 'bombe', 'frostkug', 'donnerst', 'zelt', 'elixier'] },
    nordheim_gear: { name: 'Halle der Schmiede', kind: 'gear',
      stock: ['sword3', 'staff3', 'rod3', 'dag3', 'hv3', 'rb3', 'lt3', 'ac3', 'ac4', 'ac5', 'ac6'] },
    endshop: { name: 'Wandernder Händler', kind: 'gear',
      stock: ['sword4', 'staff4', 'rod4', 'dag4', 'hv4', 'rb4', 'lt4', 'ac7'] }
  };

  /* ---------- Kristalle & Story ---------- */

  D.CRYSTALS = [
    { id: 'fire',  name: 'Feuerkristall',  color: '#ff8a3a' },
    { id: 'ice',   name: 'Eiskristall',    color: '#8fdcff' },
    { id: 'wind',  name: 'Windkristall',   color: '#8ff0c0' },
    { id: 'earth', name: 'Erdkristall',    color: '#e0c070' }
  ];

  global.Data = D;
})(window);
