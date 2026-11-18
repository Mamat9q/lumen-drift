// workshop.js — the keeper's permanent workshop (Revision 5).
// Embers banked from finished runs buy permanent starting boosts that
// carry across runs. Everything is local: one localStorage key, no
// network, no account, no wallet. A fresh profile plays exactly like
// Revision 4 — the workshop only ever adds.
const KEY = 'lumen-workshop-v1';

// Every item: a measured, named starting boost. Cost in banked embers.
export const WORKSHOP_ITEMS = [
  { id: 'bubble', name: 'BRASS WICK', icon: '◯', desc: '+1 ember-glass charge at the start of every run.', cost: 150, max: 3 },
  { id: 'hull', name: 'CLOCKWORK PLATING', icon: '♥', desc: '+1 max hull at the start of every run.', cost: 300, max: 2 },
  { id: 'damage', name: 'HOTTER WICK', icon: '+1', desc: '+1 damage on every bolt, from the first night.', cost: 200, max: 2 },
];

export class Workshop {
  constructor() {
    this.banked = 0;
    this.ranks = { bubble: 0, hull: 0, damage: 0 };
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.banked === 'number') this.banked = Math.max(0, Math.floor(data.banked));
      if (data.ranks) {
        for (const item of WORKSHOP_ITEMS) {
          if (typeof data.ranks[item.id] === 'number') {
            this.ranks[item.id] = Math.max(0, Math.min(item.max, Math.floor(data.ranks[item.id])));
          }
        }
      }
    } catch (e) {
      // No storage (private mode, file://, headless without a profile):
      // the workshop simply stays empty and the game plays on.
      this.banked = 0;
      this.ranks = { bubble: 0, hull: 0, damage: 0 };
    }
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ banked: this.banked, ranks: this.ranks }));
    } catch (e) {
      // Storage unavailable — the run is unaffected.
    }
  }

  // Bank a tenth of the run's score, capped at 500 in the till.
  bank(score) {
    const earned = Math.floor((score || 0) / 100);
    if (earned > 0) {
      this.banked = Math.min(500, this.banked + earned);
      this.save();
    }
    return earned;
  }

  canBuy(item) {
    return this.ranks[item.id] < item.max && this.banked >= item.cost;
  }

  // Buy one rank. Returns true on a completed purchase.
  buy(id) {
    const item = WORKSHOP_ITEMS.find((w) => w.id === id);
    if (!item || !this.canBuy(item)) return false;
    this.banked -= item.cost;
    this.ranks[item.id] += 1;
    this.save();
    return true;
  }

  // Apply the owned ranks to a fresh run, after player.reset().
  applyToRun(game, player) {
    if (this.ranks.bubble > 0) {
      player.bubbleMax += this.ranks.bubble;
      player.bubbleCharges = player.bubbleMax;
    }
    if (this.ranks.hull > 0) {
      player.maxHull += this.ranks.hull;
      player.hull = player.maxHull;
    }
    if (this.ranks.damage > 0) player.damageBonus += this.ranks.damage;
  }
}
