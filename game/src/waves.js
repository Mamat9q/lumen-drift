// waves.js — the ten-night escalation table and the keeper's upgrade cards.
// Nights grow in count and mix; bosses anchor nights 5 and 10. Snuff-moths
// appear from night 3: they fly straight for the beacon lanterns.
export const TOTAL_WAVES = 10;

export const WAVE_TABLE = [
  { mote: 6 },
  { mote: 8, dart: 3 },
  { mote: 8, dart: 5, spitter: 2, snuff: 1 },
  { mote: 10, dart: 6, spitter: 3, splitter: 2, snuff: 2 },
  { boss: 'shatterheart', mote: 6, dart: 4, snuff: 1 },
  { mote: 12, dart: 8, spitter: 4, splitter: 3, snuff: 2 },
  { mote: 12, dart: 8, spitter: 5, splitter: 4, bulwark: 1, snuff: 3 },
  { mote: 14, dart: 10, spitter: 6, splitter: 5, bulwark: 2, snuff: 3 },
  { mote: 16, dart: 12, spitter: 7, splitter: 6, bulwark: 2, snuff: 4 },
  { boss: 'voidmaw', mote: 10, dart: 8, spitter: 4, bulwark: 2, snuff: 3 },
];

export const UPGRADES = [
  { id: 'twin', name: 'TWIN WICKS', desc: 'Light two wicks at once — two parallel bolts.', icon: 'II', apply: (p) => { p.weapon = 'twin'; } },
  { id: 'spread', name: 'TRINE FAN', desc: 'Three bolts fanned like a lantern’s rays.', icon: 'W', apply: (p) => { p.weapon = 'spread'; } },
  { id: 'rail', name: 'LONGFLAME LANCE', desc: 'Slow piercing bolts that hit for 3.', icon: 'R', apply: (p) => { p.weapon = 'rail'; } },
  { id: 'damage', name: 'HOTTER WICK', desc: '+1 damage on every bolt.', icon: '+1', apply: (p) => { p.damageBonus += 1; } },
  { id: 'rapid', name: 'BRASS CYCLER', desc: '+25% fire rate.', icon: '>>', apply: (p) => { p.fireRateBonus += 2; } },
  { id: 'hull', name: 'LANTERN PLATING', desc: 'Repair 1 hull and raise max hull by 1.', icon: '♥', apply: (p) => { p.maxHull += 1; p.hull = Math.min(p.maxHull, p.hull + 1); } },
  { id: 'dash', name: 'SWIFT CURRENT', desc: 'Dash recharges 40% faster.', icon: '»', apply: (p) => { p.dashMax *= 0.6; } },
  { id: 'magnet', name: 'EMBER MAGNET', desc: 'Pull embers from much further away.', icon: '◎', apply: (p) => { p.magnet += 130; } },
];

// Three distinct cards, never repeating a weapon the player already owns.
export function pickUpgrades(rng, player) {
  const pool = UPGRADES.filter((u) => {
    if (u.id === 'twin' && player.weapon !== 'pulse') return false;
    if (u.id === 'spread' && player.weapon !== 'pulse') return false;
    if (u.id === 'rail' && player.weapon !== 'pulse') return false;
    return true;
  });
  const picks = [];
  while (picks.length < 3 && pool.length > 0) {
    const i = Math.floor(rng() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks;
}
