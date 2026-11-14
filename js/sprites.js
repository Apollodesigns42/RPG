/* ============================================================
   sprites.js  --  Pixelart-Daten fuer Helden, NPCs, Gegner, Bosse
   Symmetrische Sprites werden als linke Haelfte definiert und
   gespiegelt -> halbe Datenmenge, garantierte Symmetrie.
   ============================================================ */
(function (global) {
  'use strict';

  var S = { hero: {}, enemy: {}, npc: {} };

  /* ---------- Hilfsfunktionen ---------- */

  var PAD = '................................';

  /** Spiegelt linke Haelfte zu vollem Sprite der Breite w*2. */
  function mir(rows, w) {
    return rows.map(function (r) {
      r = (r + PAD).slice(0, w);
      return r + r.split('').reverse().join('');
    });
  }

  /** Ersetzt Gesichtsfarben durch Haar -> Rueckansicht. */
  function backOf(rows) {
    return rows.map(function (r, i) {
      if (i < 2 || i > 7) return r;
      return r.replace(/[sSewr]/g, 'h');
    });
  }

  /** Erzeugt Laufframe: Beine um 1px versetzt. */
  function legShift(rows, dir) {
    var out = rows.slice();
    var n = out.length;
    // Beine sitzen in den letzten 4 Zeilen
    var a = n - 4, b = n - 3;
    if (dir > 0) {
      out[a] = out[a].replace(/b/g, 'B');
      out[n - 1] = out[n - 1].replace(/^(.{6})o/, '$1.');
    } else {
      out[b] = out[b].replace(/b/g, 'B');
      out[n - 1] = out[n - 1].replace(/o(.{5})$/, '.$1');
    }
    return out;
  }

  /* ---------- Helden-Formen (linke Haelfte, 8 breit) ---------- */

  // Krieger / normaler Kopf
  var FIGHTER_DOWN = [
    '....oooo',
    '...ohhhh',
    '..ohhhhh',
    '..ohssss',
    '..ohsoow',
    '..ohssss',
    '..oohsss',
    '...oocdd',
    '..otcccc',
    '.osdcccc',
    '.osdcccc',
    '..occccc',
    '..oedddd',
    '...obbbb',
    '...obbbb',
    '...ooooo'
  ];

  // Magier mit Spitzhut
  var MAGE_DOWN = [
    '......oo',
    '.....odd',
    '....oddd',
    '...odddd',
    '..oddddd',
    '.oddddddd',
    'oeeeeeee',
    '..ohssss',
    '..ohsoow',
    '..oohsss',
    '..otcccc',
    '.osdcccc',
    '.osccccc',
    '..occccc',
    '..obbbbb',
    '...ooooo'
  ];

  // Kapuze
  var HOOD_DOWN = [
    '.....ooo',
    '....odddd',
    '...odddd',
    '..oddddd',
    '..odsooo',
    '..odssss',
    '..oddddd',
    '...odddd',
    '..otcccc',
    '.osdcccc',
    '.osdcccc',
    '..occccc',
    '..oedddd',
    '...obbbb',
    '...obbbb',
    '...ooooo'
  ];

  // Seitenansicht (volle Breite 16, blickt nach links)
  var FIGHTER_SIDE = [
    '.....oooooo.....',
    '....ohhhhhho....',
    '...ohhhhhhhho...',
    '...ohssssshho...',
    '...ohsoosshho...',
    '...ohsssssho....',
    '....oohsssho....',
    '.....occcddo....',
    '....otccccco....',
    '...oscccccco....',
    '...oscccccco....',
    '....occcccco....',
    '....oeddddo.....',
    '....obbbbo......',
    '...obbbbbo......',
    '...oooooo.......'
  ];

  var MAGE_SIDE = [
    '.......oooo.....',
    '......oddddo....',
    '.....odddddo....',
    '....oddddddo....',
    '...odddddddo....',
    '..oddddddddo....',
    '.oeeeeeeeeeo....',
    '...ohsssssho....',
    '...ohsooshho....',
    '....oohssho.....',
    '....otcccco.....',
    '...osccccco.....',
    '...osccccco.....',
    '....occccco.....',
    '....obbbbbo.....',
    '....oooooo......'
  ];

  var HOOD_SIDE = [
    '......ooooo.....',
    '.....oddddddo...',
    '....oddddddddo..',
    '...oddsssdddo...',
    '...odsoosddo....',
    '...odssssddo....',
    '....oddddddo....',
    '.....odddddo....',
    '....otccccco....',
    '...oscccccco....',
    '...oscccccco....',
    '....occcccco....',
    '....oedddddo....',
    '....obbbbbo.....',
    '...obbbbbo......',
    '...oooooo.......'
  ];

  var SHAPES = {
    fighter: { down: FIGHTER_DOWN, side: FIGHTER_SIDE },
    mage:    { down: MAGE_DOWN,    side: MAGE_SIDE },
    hood:    { down: HOOD_DOWN,    side: HOOD_SIDE }
  };

  /* ---------- Helden-Paletten ---------- */

  var HERO_PAL = {
    alric: { o: '#1a1420', h: '#8a5a2a', s: '#e8b98a', S: '#c99568', w: '#ffffff',
             c: '#4a6fb0', C: '#6f96d8', d: '#c9ced8', e: '#8d6a2a', t: '#e8d45c',
             b: '#5a4630', B: '#6b543a' },
    lyra:  { o: '#241a20', h: '#f0d878', s: '#f2c8a0', S: '#d8a878', w: '#ffffff',
             c: '#eaeef7', C: '#ffffff', d: '#c94a5a', e: '#c94a5a', t: '#e8d45c',
             b: '#8a6a4a', B: '#9c7a58' },
    faelan:{ o: '#12101c', h: '#2a2438', s: '#d8b088', S: '#b08a64', w: '#ffe45c',
             c: '#3a3560', C: '#4d4780', d: '#241f3a', e: '#e8c45c', t: '#e8c45c',
             b: '#2a2438', B: '#3a3450' },
    nyx:   { o: '#161022', h: '#3a2a40', s: '#e0b48a', S: '#c09068', w: '#8ff0c0',
             c: '#3f7a5a', C: '#54a077', d: '#5a3f70', e: '#c9a83c', t: '#c9a83c',
             b: '#3a2a20', B: '#4a3628' }
  };

  var NPC_PAL = {
    villager: { o: '#1a1420', h: '#6a4a2a', s: '#e8b98a', S: '#c99568', w: '#fff',
                c: '#7a8a4a', C: '#94a45e', d: '#b0783a', e: '#8a6a3a', t: '#d8c46a',
                b: '#5a4630', B: '#6b543a' },
    guard:    { o: '#14161f', h: '#4a4a5a', s: '#e8b98a', S: '#c99568', w: '#fff',
                c: '#7f8ba0', C: '#a3b0c6', d: '#4a5468', e: '#c94a3a', t: '#e8d45c',
                b: '#39404f', B: '#48505f' },
    king:     { o: '#1c1420', h: '#d8d8e0', s: '#e8b98a', S: '#c99568', w: '#fff',
                c: '#7a2f5a', C: '#9c4478', d: '#e8c45c', e: '#e8c45c', t: '#e8d45c',
                b: '#4a3050', B: '#5a3c60' },
    elder:    { o: '#1c1a20', h: '#e0e0e8', s: '#e0b490', S: '#bd9070', w: '#fff',
                c: '#6a5f8a', C: '#8577a8', d: '#4a4266', e: '#c9b46a', t: '#c9b46a',
                b: '#4a4038', B: '#5a4e46' },
    merchant: { o: '#1c1620', h: '#3a2a1a', s: '#e8b98a', S: '#c99568', w: '#fff',
                c: '#b06a2a', C: '#d08a44', d: '#6a3f18', e: '#e8c45c', t: '#e8c45c',
                b: '#5a3a20', B: '#6a482a' },
    child:    { o: '#1a1420', h: '#c98a3a', s: '#f2c8a0', S: '#d8a878', w: '#fff',
                c: '#c95a7a', C: '#e07a98', d: '#8a3f5a', e: '#8a3f5a', t: '#fff',
                b: '#6a4a30', B: '#7a5a3c' }
  };

  /* ---------- Helden-Sprites bauen ---------- */

  function buildActor(shapeName, pal) {
    var sh = SHAPES[shapeName];
    var downHalf = sh.down, upHalf = backOf(sh.down);
    var set = {
      down: [GFX.sprite(mir(downHalf, 8), pal),
             GFX.sprite(mir(legShift(downHalf, 1), 8), pal),
             GFX.sprite(mir(downHalf, 8), pal),
             GFX.sprite(mir(legShift(downHalf, -1), 8), pal)],
      up:   [GFX.sprite(mir(upHalf, 8), pal),
             GFX.sprite(mir(legShift(upHalf, 1), 8), pal),
             GFX.sprite(mir(upHalf, 8), pal),
             GFX.sprite(mir(legShift(upHalf, -1), 8), pal)],
      left: [GFX.sprite(sh.side, pal),
             GFX.sprite(legShift(sh.side, 1), pal),
             GFX.sprite(sh.side, pal),
             GFX.sprite(legShift(sh.side, -1), pal)]
    };
    set.right = set.left;   // wird beim Zeichnen gespiegelt
    return set;
  }

  /* ---------- Gegner: linke Haelften ---------- */
  /* Palette: o Kontur, a hell, b Koerper, c Schatten, d Akzent,
              e Akzent2, w weiss, r rot/Auge, m Metall, y gelb        */

  var E = {};

  E.slime = ['............', '............', '............', '............',
    '............', '............', '.........ooo', '.......ooaaa',
    '......oaaaab', '.....oaaabbb', '....oaabbbbb', '...oaabbbbbb',
    '...oabbbbbbb', '..oabbbbbbbb', '..oabbbbbbbb', '..oaboooobbb',
    '..oabowwoobb', '.oabbooooobb', '.oabbbbbbbbb', '.oabbbbbbbbb',
    '.oacbbbbbbbb', '.oaccbbbbbbb', '.oacccccbbbb', '.ooooooooooo'];

  E.bat = ['............', '............', 'oo..........', 'oao.........',
    'oaao........', 'oaaao.......', 'oaaaao......', '.oaaaaoo....',
    '.oaaaaaao...', '..oaaaaaaoo.', '..oaaaaaabbb', '...oaaaaabbb',
    '....ooaaabbb', '......oobbbb', '.......obbbb', '.......oborr',
    '.......obbrr', '.......obbbb', '........obbb', '........obwb',
    '........oobb', '.........obb', '..........oo', '............'];

  E.wolf = ['............', '............', '..oo........', '..oao.......',
    '..oaao......', '..oaaao.....', '...oaaaoooo.', '...oaaaaaaao',
    '...oaaaaaaaa', '...oaroaaaaa', '...oarraaaaa', '...oaaaaaaaa',
    '....oaaoowwa', '....oaaowwaa', '.....oaaaaaa', '.....obbbbbb',
    '....obbbbbbb', '...obbbbbbbb', '...obbbbbbbb', '...obbccbbbb',
    '...obbc..cbb', '..obbc...cbb', '..obc....obb', '..oo.....oo.'];

  E.goblin = ['............', '............', '.....ooo....', '...oo.aao...',
    '..oaao.aaoo.', '..oaaaoaaaao', '...oaaaaaaaa', '...oaaaaaaaa',
    '....oarraaaa', '....oaaaaaaa', '.....oawwwaa', '.....ooaaaaa',
    '......occccc', '....oomccccc', '...omcocccc c', '...omcocccccc',
    '...omcoccccc', '....oocccccc', '......ocdddd', '......odddddd',
    '.....obb..bb', '.....obb..bb', '.....ooo..oo', '............'];

  E.skeleton = ['............', '............', '......ooooo.', '.....owwwww.',
    '....owwwwwww', '....owwwwwww', '....owooowww', '....owooowww',
    '....owwwwwww', '.....owwoWww', '.....owwwwww', '......owwwww',
    '.......oooww', '.....oomwwww', '....omwwoowww', '...omwoowwww',
    '...omwoowwww', '....omwoowww', '.....oowwwww', '.......owwww',
    '......owwwww', '.....oww..ww', '.....oww..ww', '.....ooo..oo'];

  E.plant = ['............', '.......oo...', '......oddo..', '.....oddddo.',
    '....oddddddo', '....oddddddd', '...odddddddd', '...oddoooddd',
    '...oddowwodd', '...oddoooddd', '....odddddddd', '....oedddddd',
    '.....oeeeeee', '......oaaaaa', '.....oaaaaaa', '....oaaaaaaa',
    '...oaaoaaaaa', '..oaao.oaaaa', '..oao...oaaa', '..oo....oaaa',
    '.........oaa', '........obbb', '.......obbbb', '.......ooooo'];

  E.golem = ['............', '............', '.....ooooooo', '....oaaaaaaa',
    '....oaaaaaaa', '....oarrraaa', '....oaaaaaaa', '.....ooaaaaa',
    '..ooo..obbbb', '.obbbo.obbbb', '.obbbboobbbb', '.obbbbbbbbbb',
    '.obbbbbbbbbb', '.obbbbbbcccb', '.obbbbbbcccb', '..obbbbbbbbb',
    '..obbbbbbbbb', '...obbbbbbbb', '...obbbbbbbb', '....obbbbbbb',
    '....obbbbbbb', '....obbbb...', '....obbbb...', '....oooo....'];

  E.wisp = ['............', '............', '.........o..', '......oo.o.o',
    '.....oaaaoo.', '....oaaaaaao', '...oaaaaaaaa', '...oaabbbbbb',
    '..oaabbbbbbb', '..oabbbbbbbb', '..oabbboooobb', '..oabboowwoo',
    '..oabboowwoo', '..oabbboooobb', '..oabbbbbbbb', '..oaabbbbbbb',
    '...oaabbbbbb', '...oaaaaaaaa', '....oaaaaaao', '.....oaaaao.',
    '......oooo..', '.......o.o..', '............', '............'];

  E.serpent = ['............', '............', '............', '.......oooo.',
    '.....ooaaaao', '....oaaaaaaa', '....oaaraaaa', '....oaarraaa',
    '....oaaaaaaa', '.....oaawwwa', '......oaaaaa', '.......oaaab',
    '......obbbbb', '....obbbbbbb', '...obbbbbbbb', '...obbbbbbbb',
    '...obbcccccb', '...obbcccccb', '....obbbbbbb', '.....obbbbbb',
    '......obbbbb', '.......obbbb', '........oobb', '..........oo'];

  E.knight = ['............', '.......oo...', '......ommmo.', '.....ommmmmm',
    '.....ommmmmm', '.....omrrmmm', '.....ommmmmm', '......ommmmm',
    '...oo.ommmmm', '..ommo.ommmm', '..ommmoocccc', '..ommmmcccccc',
    '...ommmcccccc', '...ommmccccc', '....ommcdddd', '....omcddddd',
    '....omcddddd', '.....occdddd', '.....occccccc', '......ommmmm',
    '......ommmmm', '......omm.mm', '......omm.mm', '......ooo.oo'];

  /* ---------- Bosse (linke Haelfte, 16 breit -> 32x32) ---------- */

  var B = {};

  // Frontalansicht: Hoerner und Kopf mittig, Schwingen nach beiden Seiten
  B.dragon = [
    '................', '................', '..........o.....', '.........oao....',
    '.........oaao...', '..........oaaoo.', '..........oaaaaa', '.........oaaaaaa',
    '.........oarraaa', '.........oaaaaaa', '..........oaaaaa', '..........oawwaa',
    '...........oaaaa', 'oo.........obbbb', 'occo.......obbbb', 'occcco.....obbbb',
    'occcccco...obbbb', 'occcccccoo.obbbb', 'occcccccccoobbbb', '.occcccccccbbbbb',
    '..occcccccbbbbbb', '...occcccbbbbbbb', '....occcbbbbbbbb', '.....occbbbbbbbb',
    '......obbbbbbbbb', '......obbbcccbbb', '.....obbbcccccbb', '.....obbbcccccbb',
    '.....obbbbcccbbb', '......obbbbbbbbb', '.......obbbbbbbb', '.......oooooooo.'];

  B.icelord = [
    '................', '................', '.........oooooo.', '........oaaaaaa',
    '........oaaaaaaa', '........oaaaaaaa', '........oarrraaa', '........oaaaaaaa',
    '.........oaaaaaa', '....ooo..oaaaaaa', '...obbbo.obbbbbb', '...obbbboobbbbbb',
    '...obbbbbbbbbbbb', '...obbbbbbbbbbbb', '...obbbbbbbwwwbb', '...obbbbbbbwwwbb',
    '...obbbbbbbwwwbb', '....obbbbbbbbbbb', '....obbbbbbbbbbb', '....obbbbbbbbbbb',
    '.....obbbbbbbbbb', '.....obbbbbbbbbb', '.....obbbbbbbbbb', '.....obbbccccbbb',
    '.....obbbccccbbb', '.....obbbccccbbb', '.....obbbb...bbb', '.....obbbb...bbb',
    '.....obbbb...bbb', '.....obbbb...bbb', '.....ooooo...ooo', '................'];

  B.witch = [
    '................', '.............oo.', '...........oodd.', '.........oodddd.',
    '.......oodddddd.', '.....oodddddddd.', '...ooddddddddddd', '..oeeeeeeeeeeeee',
    '.......oaaaaaaaa', '.......oaaaaaaaa', '.......oarraaaaa', '.......oaaaaaaaa',
    '.......ooaaaaaaa', '..oo....occccccc', '.omdo..omcccccccc', '.omddoomcccccccc',
    '..omdddmcccccccc', '...ommmmcccccccc', '....ommmccccccccc', '.....ommcccccccc',
    '.......occcccccc', '.......occcccccc', '......occcccccccc', '.....occcccccccc',
    '....occccccccccc', '....occcccccccccc', '...occcccccccccc', '...occcccccccccc',
    '...occcccccccccc', '....occccccccccc', '.....ooccccccccc', '.......ooooooooo'];

  B.titan = [
    '................', '................', '.......ooooooooo', '......oaaaaaaaaa',
    '......oaaaaaaaaa', '......oaaaaaaaaa', '......oarrrraaaa', '......oaaaaaaaaa',
    '.......oaaaaaaaa', '.......oowwwwwww', '..ooo...obbbbbbb', '.obbbo..obbbbbbb',
    '.obbbbo.obbbbbbb', '.obbbbbobbbbbbbb', '.obbbbbbbbbbbbbb', '.obbbbbbbbbbbbbb',
    '.obbbbbbbbbbbbbb', '..obbbbbbbccccbb', '..obbbbbbbccccbb', '..obbbbbbbccccbb',
    '...obbbbbbbbbbbb', '...obbbbbbbbbbbb', '....obbbbbbbbbbb', '....obbbbbbbbbbb',
    '.....obbbbbbbbbb', '.....obbbbb..bbb', '.....obbbbb..bbb', '.....obbbbb..bbb',
    '.....obbbbb..bbb', '.....obbbbb..bbb', '.....ooooo...ooo', '................'];

  B.malkoth = [
    '................', '..............oo', '............oodd', '..........oodddd',
    '.........odddddd', '........oddddddd', '........oddddddd', '........odddoooo',
    '........oddorrrr', '........oddorrrr', '........oddoooo.', '........oddddddd',
    '..oo....odddddddd', '.omdo..omdddddddd', '.ommdoommdddddddd', '..ommdmmmddddddd',
    '...ommmmmddddddd', '....ommmmddddddd', '.....ommmdddddddd', '......ommddddddd',
    '.......odddddddd', '.......oddddwwdd', '......oddddwwwdd', '.....oddddddwwdd',
    '....oddddddddddd', '...oddddddddddddd', '...odddddddddddd', '...odddddddddddd',
    '...odddddddddddd', '....oddddddddddd', '.....oooddddddddd', '........oooooooo'];

  /* ---------- Gegner-Paletten ---------- */

  var EP = {
    slimeG:  { o: '#0d2a14', a: '#8ef09a', b: '#3faa52', c: '#256a34', w: '#ffffff' },
    slimeI:  { o: '#0c2a3a', a: '#d6f4ff', b: '#5fb8e0', c: '#2f78a8', w: '#ffffff' },
    slimeF:  { o: '#3a0e08', a: '#ffd08a', b: '#e05a1e', c: '#a03a10', w: '#ffffff' },
    bat:     { o: '#160f22', a: '#5a4a70', b: '#8a7aa8', c: '#3a2f4a', r: '#ff4040', w: '#ffffff' },
    batS:    { o: '#0d0a16', a: '#2f2848', b: '#4a3f68', c: '#1d1830', r: '#c94aff', w: '#e0d0ff' },
    wolf:    { o: '#1a1410', a: '#8a7a5a', b: '#6a5a3a', c: '#3a3020', r: '#ffcc33', w: '#ffffff' },
    wolfI:   { o: '#101c26', a: '#c9dcea', b: '#8fb0c8', c: '#5a7488', r: '#66e0ff', w: '#ffffff' },
    goblin:  { o: '#12200f', a: '#7fbf5a', b: '#5a9440', c: '#3a6a2a', r: '#ff3030',
               w: '#ffffff', d: '#8a5a2a', m: '#b0b6c2' },
    goblinS: { o: '#201230', a: '#a87fd0', b: '#7f5aa8', c: '#5a3a7a', r: '#ffd030',
               w: '#ffffff', d: '#c9a83c', m: '#e0d060' },
    imp:     { o: '#2a0c08', a: '#ff8a4a', b: '#d8502a', c: '#9a2f18', r: '#ffe45c',
               w: '#ffffff', d: '#5a2a1a', m: '#e8c45c' },
    bandit:  { o: '#2a1a0e', a: '#d8a86a', b: '#b08040', c: '#7a5628', r: '#ff4040',
               w: '#ffffff', d: '#8a3a3a', m: '#c0c6d2' },
    skel:    { o: '#1a1a20', w: '#e8e4d8', W: '#ffffff', m: '#b0b6c2' },
    skelD:   { o: '#14101c', w: '#9aa8b8', W: '#d0e0f0', m: '#7a6a9a' },
    plant:   { o: '#14260f', a: '#4f8a3a', b: '#3a6a2a', c: '#2a4a1e',
               d: '#d05a8a', e: '#a03a68', w: '#ffffff' },
    plantD:  { o: '#2a2410', a: '#a8944a', b: '#8a7838', c: '#5a4c24',
               d: '#d0b04a', e: '#a08a30', w: '#ffffff' },
    golem:   { o: '#20201a', a: '#8a8478', b: '#6e6a5e', c: '#4a4740', r: '#ff9030' },
    golemI:  { o: '#12222e', a: '#a8cfe0', b: '#79a8c8', c: '#4a7a9a', r: '#8ff0ff' },
    golemF:  { o: '#2a1008', a: '#c96a3a', b: '#9a4a24', c: '#6a2e14', r: '#ffd25a' },
    wisp:    { o: '#101a2a', a: '#8fd0ff', b: '#4a90d0', c: '#2a5a90', w: '#ffffff' },
    wispD:   { o: '#180f24', a: '#c98fff', b: '#7a4ad0', c: '#4a2a90', w: '#ffe0ff' },
    wispW:   { o: '#0f2420', a: '#8ffcd0', b: '#3fc9a0', c: '#248a6a', w: '#ffffff' },
    serp:    { o: '#2a2010', a: '#d8bc7a', b: '#b0954a', c: '#7a6428', r: '#ff5030', w: '#fff' },
    serpD:   { o: '#1a2010', a: '#7fa84a', b: '#5a8430', c: '#3a5a1e', r: '#ff3030', w: '#fff' },
    knight:  { o: '#14161f', m: '#98a2b6', c: '#4a5468', d: '#7a3a4a', r: '#ff4040' },
    knightD: { o: '#0e0c18', m: '#5a4a78', c: '#2f2848', d: '#c94a4a', r: '#ff2a2a' },
    // Bosse
    dragonF: { o: '#2a0c06', a: '#ff9a3a', b: '#d8401a', c: '#8a2210', r: '#ffe45c', w: '#fff8d0' },
    iceL:    { o: '#0e2233', a: '#dff2ff', b: '#79b8e0', c: '#3f7fa8', r: '#66e8ff', w: '#ffffff' },
    witchS:  { o: '#180f28', a: '#e8c0a0', b: '#8f6ad0', c: '#6a4aa8', d: '#4a3a78',
               e: '#c9a83c', m: '#d8d8e8', r: '#ffe45c', w: '#ffffff' },
    titanE:  { o: '#231a10', a: '#a8905a', b: '#7a6438', c: '#4a3c20', r: '#ffb03a', w: '#d8c890' },
    dark:    { o: '#0a0812', a: '#3a2f5a', b: '#2a2246', c: '#181230', d: '#2f2850',
               e: '#c94aff', m: '#8a4ad0', r: '#ff2a4a', w: '#ff6a8a' }
  };

  /* ---------- Oeffentliche Bau-Funktionen ---------- */

  S.build = function () {
    // Helden
    S.hero.alric  = buildActor('fighter', HERO_PAL.alric);
    S.hero.lyra   = buildActor('fighter', HERO_PAL.lyra);
    S.hero.faelan = buildActor('mage',    HERO_PAL.faelan);
    S.hero.nyx    = buildActor('hood',    HERO_PAL.nyx);

    // NPCs
    for (var k in NPC_PAL) {
      var shape = (k === 'elder' || k === 'king') ? 'mage' : 'fighter';
      if (k === 'merchant') shape = 'hood';
      S.npc[k] = buildActor(shape, NPC_PAL[k]);
    }

    // Gegner (24x24)
    function ce(id, art, pal) { S.enemy[id] = GFX.sprite(mir(art, 12), pal); }
    ce('slime',      E.slime,    EP.slimeG);
    ce('slime_ice',  E.slime,    EP.slimeI);
    ce('slime_fire', E.slime,    EP.slimeF);
    ce('bat',        E.bat,      EP.bat);
    ce('bat_shadow', E.bat,      EP.batS);
    ce('wolf',       E.wolf,     EP.wolf);
    ce('wolf_ice',   E.wolf,     EP.wolfI);
    ce('goblin',     E.goblin,   EP.goblin);
    ce('goblin_sh',  E.goblin,   EP.goblinS);
    ce('bandit',     E.goblin,   EP.bandit);
    ce('imp',        E.goblin,   EP.imp);
    ce('skeleton',   E.skeleton, EP.skel);
    ce('skeleton_d', E.skeleton, EP.skelD);
    ce('plant',      E.plant,    EP.plant);
    ce('plant_d',    E.plant,    EP.plantD);
    ce('golem',      E.golem,    EP.golem);
    ce('golem_ice',  E.golem,    EP.golemI);
    ce('golem_fire', E.golem,    EP.golemF);
    ce('wisp',       E.wisp,     EP.wisp);
    ce('wisp_dark',  E.wisp,     EP.wispD);
    ce('wisp_wind',  E.wisp,     EP.wispW);
    ce('serpent',    E.serpent,  EP.serp);
    ce('serpent_d',  E.serpent,  EP.serpD);
    ce('knight',     E.knight,   EP.knight);
    ce('knight_d',   E.knight,   EP.knightD);

    // Bosse (32x32)
    function cb(id, art, pal) { S.enemy[id] = GFX.sprite(mir(art, 16), pal); }
    cb('boss_dragon', B.dragon,  EP.dragonF);
    cb('boss_ice',    B.icelord, EP.iceL);
    cb('boss_witch',  B.witch,   EP.witchS);
    cb('boss_titan',  B.titan,   EP.titanE);
    cb('boss_dark',   B.malkoth, EP.dark);

    // Kristall-Symbole (eins je Element)
    var CRYSTAL_ART = [
      '......oo', '.....oaao', '....oaaaa', '...oaaaab',
      '..oaaabbb', '..oaabbbb', '..oabbbbb', '..oabbbbb',
      '..oabbbbb', '..oabbbbc', '...oabbcc', '....oabcc',
      '.....oacc', '......occ', '.......oc', '........o'
    ];
    S.crystal = GFX.sprite(mir(CRYSTAL_ART, 8),
      { o: '#1a2a3a', a: '#eaffff', b: '#7fd8ff', c: '#3f8ac0' });
    S.crystals = Data.CRYSTALS.map(function (c) {
      return GFX.sprite(mir(CRYSTAL_ART, 8), {
        o: shade(c.color, -.72), a: shade(c.color, .78),
        b: c.color, c: shade(c.color, -.42)
      });
    });
  };

  /** Hellt (f>0) oder dunkelt (f<0) eine Hex-Farbe ab. */
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    else { r *= (1 + f); g *= (1 + f); b *= (1 + f); }
    return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
  }

  S.HERO_PAL = HERO_PAL;
  S.NPC_PAL = NPC_PAL;
  global.Sprites = S;
})(window);
