[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Mamat9q/lumen-drift/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Mamat9q/lumen-drift/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# LUMEN DRIFT — Lanternkeeper of the Drift Gate · Brass Depths

An original lantern-keeping arcade game for make.fun's **best-game-01**
bounty ("Make the best game", $1,000). You are the Lanternkeeper of the
Drift Gate: fly your lantern-skiff through ten nights of the Shatter swarm,
tend the three beacon lanterns, and keep the Great Lantern burning — if
every flame goes out, the dark takes the gate. The deeper the descent, the
harder the table fights back: bosses wear breakable brass armour, drift
mines seed the arena, and the deep pays its debts in relics.

## How to play

Open `game/index.html` from any static file server (for example
`node serve.ts`, then http://localhost:8080). No build step, no network,
no files outside `game/`.

| Control | Action |
|---|---|
| WASD / Arrow keys | Fly |
| Mouse | Aim |
| Hold left click | Fire |
| Fly close to a lantern | Rekindle its flame |
| Space / Right-click | Dash (brief invulnerability) |
| E | Overdrive when the meter is full (6s of double fire rate) |
| 1 / 2 / 3 or click | Choose a keeper's craft between nights |
| P | Pause — M mute — R restart on end screens |

## The loop

- **Tend the lanterns.** Three beacon lanterns ring the arena and every
  flame gutters down on its own. Fly close to rekindle one. Anything that
  touches a lantern throws itself at the flame and gutters it — and the
  **snuff-moths** (from night 3) fly straight for the lanterns to snuff
  them out. If all three go out, the dark creeps in and the gate itself
  starts to fade.
- **Defend the Great Lantern.** Enemies spawn at the arena edge and drift
  toward the gate. Anything that reaches it damages the gate — lose the
  gate, lose the game. Chasers hunt you when you get close; spitters shoot
  back; splitters break into three cinders; bulwarks soak damage; the
  bosses **SHATTERHEART** (night 5) and **VOID MAW** (night 10) fire radial
  bursts, summon cinders, and the Void Maw charges.
- **Crack the brass armour.** The bosses wear breakable plates —
  **SHATTERHEART** 3, **VOID MAW** 5, 40 damage each — and no hull damage
  lands until every plate is off. Each cracked plate makes the boss faster
  and its radial bursts and summons come quicker, so the fight escalates
  as the armour comes off. Plate pips under the boss bar show the count.
- **Dredge up relics.** Bosses always drop a relic, bulwarks sometimes do
  (30%). Twelve named keepsakes — Brass Wick, Clockwork Heart, Deep
  Current, Magnet Coil, Ember Lode, Overdrive Coil, Lantern Oil, Shatter
  Lens, Twin Flame, Iron Plating, Keen Sight, Gilded Ember — each a
  permanent run-long effect. The HUD shows the relics you own.
- **Mind the drift mines.** The arena fights back: one mine per two nights
  (up to five) seeds the floor. Drift too close and one goes off in your
  face; shoot one and its blast shreds the swarm for you.
- **Read the dive chart.** Ten nights as one descent, bosses at nights 5
  and 10, on the title screen, between nights, and at victory.
- **Score with combos.** Kills chain a combo multiplier up to x8. Enemies
  drop embers worth points (and rare hull repairs). Kills fill the Overdrive
  meter.
- **Choose a keeper's craft.** After every held night, pick 1 of 3 cards:
  new lamp weapons (Twin Wicks, Trine Fan, Longflame Lance), a hotter wick,
  faster cycling, lantern plating, a swifter dash, or an ember magnet.
- **Win or lose.** Hold all ten nights and the gate still burns. Lose your
  3 hull, the gate's flame, or every beacon lantern and the light goes out.
  Both end screens show your score, kills, accuracy and time — and restart
  with R.

## Presentation

- All art is drawn in code (canvas 2D): a warm indigo night with amber
  nebulae, a parallax starfield, the Great Lantern with its turning light
  rays and guttering flame, three beacon lanterns you tend by flying close,
  additive particle explosions, shockwave rings, floating score text,
  screen shake, and a full HUD (score, combo, night, lantern flames, hull
  hearts, gate flame, dash and overdrive meters, boss bar).
- All sound is synthesized live with WebAudio: laser, explosions, pickups,
  dash whoosh, night fanfares, boss alarms, and a 132 BPM bass/hat/pad loop.
  No audio files ship with the game.

## Structure

- `game/index.html` — canvas shell, loads the game
- `game/src/main.js` — Game state machine, loop, collisions, night director,
  beacon-lantern tending, drift mines, relic drops
- `game/src/player.js` — the lantern-skiff: thrust, aim, dash, lamp weapons
- `game/src/enemies.js` — swarm kinds, AI, snuff-moths, and the two bosses
  with breakable brass armour plates
- `game/src/bullets.js` — projectile pools and ember pickups
- `game/src/relics.js` — the twelve-relic set and the relic pickup pool
- `game/src/waves.js` — the ten-night table and keeper's craft cards
- `game/src/render.js` — background, Great Lantern, beacon lanterns, HUD,
  dive chart, drift mines, and all screens
- `game/src/particles.js` — explosions, rings, floating text, starfield
- `game/src/audio.js` — synthesized SFX and music
- `game/src/input.js` — keyboard + mouse
- `game/src/shots.js` — deterministic staged scenes for the screenshots
- `game/src/utils.js` — math helpers and a seeded RNG
- `main.ts` — entrypoint: copies `game/` + `screenshots/` and writes the dossier
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

## Screenshots

`1-title.jpg` title screen with all three beacon lanterns burning and the
ten-night dive chart, `2-action.jpg` the night-5 SHATTERHEART boss fight —
one brass plate cracked, a relic dropped, a drift mine pulsing — with a
snuff-moth diving on a guttering lantern, `3-victory.jpg` the win screen,
`4-gameover.jpg` the loss screen with every lantern cold. All four are real
renders of the game's own code in a browser (see `shots.json`).

## License

MIT — see `LICENSE`.
