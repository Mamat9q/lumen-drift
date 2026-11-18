// waves.js — the ten-night escalation table and the keeper's upgrade cards.
// Nights grow in count and mix; bosses anchor nights 5 and 10. Snuff-moths
// appear from night 3: they fly straight for the beacon lanterns.
export const TOTAL_WAVES = 10;

// Revision 5 — THREE REALMS. One descent, three countries of the dark:
// the warm Ember Reaches (nights 1–3), the brassy Depths (4–6, where the
// drift mines breed), and the cold Quench (7–10, where the dark gutters
// the lanterns half again as fast). Each realm tints the sky and names
// the night banner, so the run reads as a journey, not ten samey waves.
export const REALMS = [
  { id: 'reaches', name: 'EMBER REACHES', nights: [1, 2, 3], gutter: 1.0, color: '#ffb03d', bg: ['#0a0618', '#171233', '#05030c'] },
  { id: 'depths', name: 'BRASS DEPTHS', nights: [4, 5, 6], gutter: 1.0, color: '#d8a24a', bg: ['#0d0810', '#241a20', '#060309'] },
  { id: 'quench', name: 'THE QUENCH', nights: [7, 8, 9, 10], gutter: 1.5, color: '#6db3ff', bg: ['#050914', '#0d1a33', '#02040a'] },
];

export function realmFor(night) {
  return REALMS.find((r) => r.nights.includes(night)) || REALMS[0];
}

// Revision 5 — THE BRANCHING ROAD. After nights 3 and 6 the descent
// forks: the keeper picks one road, and it holds for the rest of the run.
// Roads apply to the whole game (g, p), unlike upgrade cards (p only).
export const ROADS = [
  { id: 'ember', name: 'EMBER ROAD', icon: 'E', desc: 'Burn hotter all the way down. +1 damage, +1 ember-glass charge.', apply: (g, p) => { p.damageBonus += 1; p.bubbleMax += 1; p.bubbleCharges = p.bubbleMax; } },
  { id: 'brass', name: 'BRASS ROAD', icon: 'B', desc: 'Dredge deeper, carry more. +1 max hull and repair 1; relics drop more often.', apply: (g, p) => { p.maxHull += 1; p.hull = Math.min(p.maxHull, p.hull + 1); g.relicChance = Math.min(0.6, (g.relicChance || 0.3) + 0.15); } },
  { id: 'glass', name: 'GLASS ROAD', icon: 'G', desc: 'Shatter wider, chain further. +30 shatter radius, +1 chain hop.', apply: (g, p) => { p.shatterBonusR += 30; p.chainBonus += 1; } },
];

export function pickRoads() {
  return ROADS.slice();
}

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
  { id: 'glass', name: 'EMBER GLASS', desc: '+1 bubble charge, refill all charges.', icon: '◯', apply: (p) => { p.bubbleMax += 1; p.bubbleCharges = p.bubbleMax; } },
  // Revision 5 — eight more kinds, sixteen in all. Every one is a
  // measured, named effect on fields the player already carries, so the
  // pool stays a real choice instead of three familiar cards.
  { id: 'lens', name: 'CHAIN LENS', desc: 'Shatter radius +30, and chains hop once further.', icon: '◈', apply: (p) => { p.shatterBonusR += 30; p.chainBonus += 1; } },
  { id: 'cache', name: 'QUICK GLASS', desc: 'Every 4th ember (not 6th) restores a bubble charge.', icon: '◐', apply: (p) => { p.emberPerCharge = 4; } },
  { id: 'sense', name: 'MINEFIELD SENSE', desc: 'Drift-mine blasts hit +2 harder.', icon: '✦', apply: (p) => { p.mineBonus += 2; } },
  { id: 'wick', name: 'LANTERN WICK', desc: 'Lanterns rekindle +25 flame per second faster.', icon: '♨', apply: (p) => { p.rekindleBonus += 25; } },
  { id: 'siphon', name: 'OVERDRIVE SIPHON', desc: 'Overdrive fills 25% faster.', icon: '↯', apply: (p) => { p.overdriveMul *= 1.25; } },
  { id: 'harvest', name: 'SHARD HARVEST', desc: 'Every ember is worth +25 score.', icon: '$', apply: (p) => { p.emberScoreBonus += 25; } },
  { id: 'iron', name: 'IRON LANTERN', desc: '+0.6s invulnerability after a hit.', icon: '▣', apply: (p) => { p.invulnBonus += 0.6; } },
  { id: 'pockets', name: 'DEEP POCKETS', desc: 'Ember magnet reach +60.', icon: '◎', apply: (p) => { p.magnet += 60; } },
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
