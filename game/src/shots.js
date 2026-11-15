// shots.js — deterministic staged scenes for the entry screenshots.
// Each shot builds a real game state with the game's own classes and the
// normal render path, frozen at a fixed time so the capture is stable.
// ?shot=title | action | victory | gameover  (&seed=N, default 7)
import { mulberry32, rand } from './utils.js';
import { Enemy, Boss } from './enemies.js';
import { Starfield } from './particles.js';

export function stageShot(game, name, seed = 7) {
  const rng = mulberry32(seed);
  game.time = 12.5;
  game.starfield = new Starfield(game.w, game.h, mulberry32(seed + 1));
  if (name === 'title') {
    game.state = 'title';
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
    game.gate.integrity = 64;
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
    game.overReason = 'The gate was overrun on wave 6.';
    game.player.hull = 0;
    game.gate.integrity = 0;
    game.player.x = game.w / 2 - 100;
    game.player.y = game.h / 2 + 250;
    // A last explosion where the ship died.
    game.particles.burst(game.player.x, game.player.y, '#ff5d8f', 40, 260, 1.2, 4);
    game.particles.ring(game.player.x, game.player.y, '#7df9ff', 130);
    return;
  }
  // action: mid-fight on wave 4, HUD alive, bullets and particles everywhere.
  game.state = 'playing';
  game.wave = 4;
  game.score = 12450;
  game.combo = 13;
  game.comboMult = 4;
  game.comboTimer = 2.1;
  game.kills = 58;
  game.shotsFired = 420;
  game.shotsHit = 301;
  game.runTime = 148;
  game.spawnQueue = 9;
  game.player.x = 430;
  game.player.y = 430;
  game.player.angle = -0.5;
  game.player.hull = 3;
  game.player.overdrive = 78;
  game.player.weapon = 'twin';
  game.gate.integrity = 82;
  const spots = [
    ['dart', 880, 220], ['mote', 980, 330], ['mote', 760, 180],
    ['spitter', 1020, 500], ['dart', 700, 560], ['splitter', 900, 420],
    ['mote', 620, 300], ['bulwark', 1080, 300], ['dart', 840, 640],
    ['mote', 560, 520], ['spitter', 940, 150], ['dart', 1120, 460],
  ];
  for (const [kind, x, y] of spots) {
    const e = new Enemy(kind, x, y, rng);
    e.angle = rand(rng, 0, 6.28);
    game.enemies.push(e);
  }
  // A spread of player bolts mid-flight toward the swarm.
  for (let i = 0; i < 7; i++) {
    const a = -0.5 + (rand(rng, -0.12, 0.12));
    game.bullets.spawn(
      470 + i * 46, 420 - i * 12, a, 780, 1, false, '#7df9ff', true,
    );
  }
  game.enemyBullets.spawn(1020, 500, 2.6, 220, 1, false, '#c77dff', false);
  game.enemyBullets.spawn(1020, 500, 2.9, 220, 1, false, '#c77dff', false);
  // Explosions and shards from recent kills.
  game.particles.burst(880, 220, '#ff8a3d', 26, 220, 0.8, 3);
  game.particles.burst(760, 180, '#ff5d8f', 18, 180, 0.7, 3);
  game.particles.ring(880, 220, '#ffd166', 90);
  game.particles.floatText(880, 190, '+400', '#ffd166', 18);
  game.particles.floatText(760, 150, 'COMBO x4', '#7df9ff', 15);
  for (let i = 0; i < 5; i++) game.shards.spawn(820 + i * 24, 260 + (i % 2) * 20, rng);
  game.banner = null;
}
