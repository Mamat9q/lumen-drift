// shots.js — deterministic staged scenes for the entry screenshots.
// Each shot builds a real game state with the game's own classes and the
// normal render path, frozen at a fixed time so the capture is stable.
// ?shot=title | action | victory | gameover  (&seed=N, default 7)
import { mulberry32, rand } from './utils.js';
import { Enemy, Boss } from './enemies.js';
import { Starfield } from './particles.js';
import { RELICS } from './relics.js';
import { realmFor } from './waves.js';

export function stageShot(game, name, seed = 7) {
  const rng = mulberry32(seed);
  game.time = 12.5;
  game.starfield = new Starfield(game.w, game.h, mulberry32(seed + 1));
  if (name === 'title') {
    game.state = 'title';
    // All three beacon lanterns burn bright behind the title; a live swarm
    // drifts at the edges, so the menu reads as a game in progress.
    game.lanterns[0].flame = 100;
    game.lanterns[1].flame = 100;
    game.lanterns[2].flame = 100;
    const edgeSpots = [
      ['dart', 150, 130], ['mote', 1130, 110], ['spitter', 120, 610],
      ['dart', 1140, 620], ['mote', 1040, 90],
    ];
    for (const [kind, x, y] of edgeSpots) {
      const e = new Enemy(kind, x, y, rng);
      e.angle = rand(rng, 0, 6.28);
      game.enemies.push(e);
    }
    game.particles.burst(150, 130, '#ff8a3d', 14, 160, 0.7, 3);
    game.particles.burst(1140, 620, '#c77dff', 12, 150, 0.7, 3);
    return;
  }
  if (name === 'victory') {
    game.state = 'victory';
    game.score = 48320;
    game.wave = 10;
    game.kills = 214;
    game.shotsFired = 1820;
    game.shotsHit = 1294;
    game.runTime = 482;
    game.player.hull = 2;
    game.gate.integrity = 92;
    // Ten nights held: every beacon lantern still burns, gate blazing —
    // and three relics dredged up from the deep along the way. The run
    // took the Ember Road, then the Glass Road — both forks show gold.
    game.relicsOwned = [RELICS[0], RELICS[4], RELICS[10]];
    game.road = ['ember', 'glass'];
    game.realm = realmFor(10);
    game.realmGutter = game.realm.gutter;
    game.lanterns[0].flame = 100;
    game.lanterns[1].flame = 100;
    game.lanterns[2].flame = 100;
    game.player.x = game.w / 2;
    game.player.y = game.h - 80;
    return;
  }
  if (name === 'gameover') {
    game.state = 'gameover';
    game.score = 18900;
    game.wave = 6;
    game.kills = 96;
    game.shotsFired = 940;
    game.shotsHit = 588;
    game.runTime = 301;
    game.overReason = 'The last lantern went out on night 6.';
    game.realm = realmFor(6);
    game.realmGutter = game.realm.gutter;
    game.player.hull = 0;
    game.gate.integrity = 0;
    // The dark won: every beacon lantern is cold, the Great Lantern dead.
    game.lanterns[0].flame = 0;
    game.lanterns[1].flame = 0;
    game.lanterns[2].flame = 0;
    game.player.x = game.w / 2 - 100;
    game.player.y = game.h / 2 + 250;
    // A last explosion where the ship died.
    game.particles.burst(game.player.x, game.player.y, '#ff5d8f', 40, 260, 1.2, 4);
    game.particles.ring(game.player.x, game.player.y, '#7df9ff', 130);
    return;
  }
  // action: boss fight on night 5 — SHATTERHEART mid-arena with its escort
  // swarm, radial bullet ring, overdrive active and combo at x8 — while a
  // snuff-moth dives on the north-east beacon lantern, its flame guttering.
  // The signature moment is now the Ember Glass chain: a trapped splitter
  // in a glass bubble with three motes inside its shatter radius, the
  // rings still expanding and CHAIN x3 on screen. This is the cover shot.
  // Revision 5: the run is in the Brass Depths on the Ember Road — the
  // HUD names the realm, the road reads under the relic row, and the dive
  // chart shows the night-3 fork taken.
  game.state = 'playing';
  game.wave = 5;
  game.realm = realmFor(5);
  game.realmGutter = game.realm.gutter;
  game.road = ['ember'];
  game.player.damageBonus = 1;
  game.score = 21480;
  game.combo = 23;
  game.comboMult = 8;
  game.comboTimer = 2.1;
  game.kills = 96;
  game.shotsFired = 640;
  game.shotsHit = 471;
  game.runTime = 236;
  game.spawnQueue = 6;
  game.player.x = 400;
  game.player.y = 500;
  game.player.angle = -0.35;
  game.player.hull = 3;
  game.player.overdrive = 0;
  game.player.overdriveActive = 4.2;
  game.player.weapon = 'spread';
  game.player.bubbleCharges = 2;
  game.player.bubbleMax = 3;
  game.lastChain = 3;
  game.chainFlash = { n: 3, t: 2.0 };
  game.gate.integrity = 74;
  game.lanterns[0].flame = 100;
  game.lanterns[1].flame = 28;
  game.lanterns[2].flame = 100;
  // The boss, at 60% HP so the boss bar reads mid-fight — and one brass
  // plate already cracked off, so the plate pips read 2 of 3 and the
  // burst rate is visibly up.
  const boss = new Boss('shatterheart', 950, 300, rng);
  boss.hp = 78;
  boss.plates = 2;
  boss.platesBroken = 1;
  boss.plateHp = 20;
  boss.burstBase = 2.4 * 0.85;
  boss.angle = 0.6;
  game.enemies.push(boss);
  // A snuff-moth closing on the guttering north-east lantern.
  const snuff = new Enemy('snuff', 990, 210, rng);
  snuff.angle = 0.9;
  game.enemies.push(snuff);
  game.particles.burst(1070, 150, '#8a7cff', 18, 170, 0.8, 3);
  game.particles.floatText(1070, 118, 'SNUFF-MOTH!', '#8a7cff', 14);
  const spots = [
    ['dart', 830, 210], ['mote', 1040, 210],
    ['spitter', 1080, 430], ['dart', 780, 320], ['splitter', 1010, 480],
    ['mote', 700, 260], ['bulwark', 1120, 330], ['dart', 900, 540],
    ['mote', 620, 420], ['spitter', 1060, 140], ['dart', 1180, 520],
  ];
  for (const [kind, x, y] of spots) {
    const e = new Enemy(kind, x, y, rng);
    e.angle = rand(rng, 0, 6.28);
    game.enemies.push(e);
  }
  // Ember Glass chain, frozen mid-shatter: a splitter trapped in a glass
  // bubble at (880, 380) with three motes inside its 90px shatter radius,
  // all flashed white from the blast, rings expanding, CHAIN x3 on screen.
  // (The boss at (950, 300) sits just outside the blast — it takes
  // shatter damage in play, but it is never trapped and never chain-killed.)
  const trapped = new Enemy('splitter', 880, 380, rng);
  trapped.trapped = 3;
  trapped.flash = 0.12;
  game.enemies.push(trapped);
  for (const [x, y] of [[850, 335], [920, 420], [905, 330]]) {
    const m = new Enemy('mote', x, y, rng);
    m.angle = rand(rng, 0, 6.28);
    m.flash = 0.12;
    game.enemies.push(m);
  }
  // Brass Depths, frozen mid-descent: a relic (BRASS WICK) dropped and
  // waiting at (560, 300), one drift mine pulsing at (760, 560), and one
  // relic already owned (KEEN SIGHT) so the HUD's relic row reads.
  game.relics.spawnAt(560, 300, RELICS[0]);
  game.relicsOwned = [RELICS[10]];
  game.player.fireRateBonus = 1;
  game.hazards.push({ x: 760, y: 560, r: 16, t: 1.2, dead: false });
  game.particles.floatText(560, 268, 'RELIC!', '#ffd166', 14);
  // A second bubble still drifting in from the ship, for the alternate fire.
  game.bullets.spawnBubble(700, 430, -0.3);
  game.particles.ring(880, 380, '#aee9ff', 90);
  game.particles.burst(880, 380, '#aee9ff', 26, 240, 0.8, 3);
  game.particles.floatText(880, 330, 'CHAIN x3', '#aee9ff', 24);
  // The boss's radial burst, frozen mid-flight.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 6.28318 + 0.6;
    game.enemyBullets.spawn(
      950 + Math.cos(a) * 70, 300 + Math.sin(a) * 70, a, 190, 1, false, '#e0aaff', false,
    );
  }
  // Trine spread mid-flight from the ship toward the boss.
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 3; i++) {
      const a = -0.35 + (j - 1) * 0.14;
      const d = 90 + i * 70;
      game.bullets.spawn(
        400 + Math.cos(a) * d, 500 + Math.sin(a) * d, a, 780, 1, false, '#7df9ff', true,
      );
    }
  }
  // Explosions and embers from recent kills.
  game.particles.burst(830, 210, '#ff8a3d', 26, 220, 0.8, 3);
  game.particles.burst(1040, 210, '#ff5d8f', 18, 180, 0.7, 3);
  game.particles.ring(950, 300, '#ffd166', 120);
  game.particles.floatText(830, 180, '+500', '#ffd166', 18);
  game.particles.floatText(1040, 180, 'COMBO x8', '#7df9ff', 15);
  for (let i = 0; i < 5; i++) game.embers.spawn(720 + i * 24, 380 + (i % 2) * 20, rng);
  game.banner = { text: 'WARNING', sub: 'SHATTERHEART APPROACHES', t: 2.6 };
}
