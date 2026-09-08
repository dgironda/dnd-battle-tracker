/**
 * Two ideas on trial.
 *
 * Both were built to be thrown away cheaply, so each is one flag here plus a
 * small number of clearly-marked touchpoints. Flip a flag to false to switch
 * the behaviour off without deleting anything; follow the list under it to
 * remove the code entirely.
 *
 * If both survive, this file goes away and the flags stop being conditions.
 */

/**
 * A slain monster gets a line through its name, the row goes quiet, and its
 * stat panel stops opening.
 *
 * Monsters only, deliberately: a downed hero is unconscious and making death
 * saves, and striking them out would say something the rules do not.
 *
 * This began as a full hand-drawn X in two strokes over the name and was cut
 * back — at the size a row gives it, the cross covered the name it was
 * crossing and a dead monster shouted louder than the living ones beside it.
 *
 * TO REMOVE COMPLETELY:
 *   1. src/components/BattleTracker/BattleTracker.tsx — the `isSlain` const,
 *      the `slainClass` on the <tr>, the `|| isSlain` in the monster name's
 *      strike class, and the `isSlain ? ... :` guard around
 *      <MonsterStatBlockHover>.
 *   2. src/fixes.css — the block marked "EXPERIMENT: mark the slain".
 *   3. this constant.
 */
export const CROSS_OUT_SLAIN_MONSTERS = true;

/**
 * When several monsters of the same kind are joining a battle, offer one
 * initiative roll for the lot instead of asking once per monster.
 *
 * TO REMOVE COMPLETELY:
 *   1. src/hooks/useStartBattle.ts — the block marked "EXPERIMENT: group
 *      initiative"; restore the plain `for (const monster of presentMonsters)`
 *      loop kept in the comment there.
 *   2. src/utils/monsterNaming.ts — `baseMonsterName` and `groupByKind`, plus
 *      their tests in tests/monsterNaming.test.ts.
 *   3. this constant.
 */
export const ASK_FOR_GROUP_INITIATIVE = true;
