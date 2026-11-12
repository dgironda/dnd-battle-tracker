import { describe, expect, it } from 'vitest';
import type { Combatant } from '../src/types/index';
import { nextTurn, passTurn } from '../src/utils/turnOrder';

/** A hero's ally with no turn of its own (an echo, a companion acting on its hero's) is skipped when the turn passes. */

const fighter = (id: string, initiative: number, over: Partial<Combatant> = {}): Combatant =>
  ({ id, name: id, initiative, conditions: [], action: false, bonus: false, move: false, ...over }) as Combatant;

describe("an ally with no turn", () => {
  const acted = { action: true, bonus: true, move: true };
  const order = [fighter('goblin', 18, acted), fighter('qwint', 12), fighter('qwint~echo', 12, { owner: 'qwint', noTurn: true }), fighter('ogre', 8)];

  it('is passed over: after its hero comes whoever is next', () => {
    expect(nextTurn(order, 1)).toEqual({ index: 3, isNewRound: false });
  });

  it("doesn't hold up the round: once the rest have gone, it turns over", () => {
    const done = [fighter('goblin', 18, acted), fighter('qwint', 12, acted), order[2], fighter('ogre', 8)];
    expect(nextTurn(done, 3)).toEqual({ index: 0, isNewRound: true });
  });
});

describe("an ally's reaction", () => {
  it("refreshes when its hero's turn starts, if it has no turn of its own; a summon with its own turn waits for that", () => {
    const used = { reaction: true };
    const fight = [fighter('qwint', 12, used), fighter('qwint~wolf', 12, { ...used, owner: 'qwint', noTurn: true }), fighter('qwint~bear', 12, { ...used, owner: 'qwint' }), fighter('ogre', 8, used)];
    const after = Object.fromEntries(passTurn(fight, 'qwint', false).map((c) => [c.id, c.reaction]));
    expect(after).toEqual({ qwint: false, 'qwint~wolf': false, 'qwint~bear': true, ogre: true });
  });
});
