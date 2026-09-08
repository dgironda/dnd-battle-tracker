import { describe, it, expect } from 'vitest';
import { planMonsterNames } from '../src/utils/monsterNaming';

describe('planMonsterNames', () => {
  it('leaves the first of a kind unnumbered', () => {
    const plan = planMonsterNames([], 'Goblin', 1);
    expect(plan.newNames).toEqual(['Goblin']);
    expect(plan.renameFrom).toBeNull();
  });

  it('renumbers the original when a second arrives', () => {
    const plan = planMonsterNames(['Goblin'], 'Goblin', 1);
    expect(plan.renameFrom).toBe('Goblin');
    expect(plan.renameTo).toBe('Goblin 1');
    expect(plan.newNames).toEqual(['Goblin 2']);
  });

  it('numbers a batch from one and renumbers the original with it', () => {
    const plan = planMonsterNames(['Ogre'], 'Ogre', 3);
    expect(plan.renameTo).toBe('Ogre 1');
    expect(plan.newNames).toEqual(['Ogre 2', 'Ogre 3', 'Ogre 4']);
  });

  it('numbers a fresh batch from one, with no original to rename', () => {
    const plan = planMonsterNames([], 'Goblin', 3);
    expect(plan.renameFrom).toBeNull();
    expect(plan.newNames).toEqual(['Goblin 1', 'Goblin 2', 'Goblin 3']);
  });

  it('steps past numbers already on the roster', () => {
    const plan = planMonsterNames(['Goblin 1', 'Goblin 2'], 'Goblin', 2);
    expect(plan.renameFrom).toBeNull();
    expect(plan.newNames).toEqual(['Goblin 3', 'Goblin 4']);
  });

  it('does not rename the original when "<name> 1" is already taken', () => {
    // the bare name is a deliberate separate entry here; renaming would collide
    const plan = planMonsterNames(['Goblin', 'Goblin 1'], 'Goblin', 1);
    expect(plan.renameFrom).toBeNull();
    expect(plan.newNames).toEqual(['Goblin 2']);
  });

  it('leaves unrelated names alone', () => {
    const plan = planMonsterNames(['Ogre', 'Skeleton'], 'Goblin', 1);
    expect(plan.renameFrom).toBeNull();
    expect(plan.newNames).toEqual(['Goblin']);
  });

  it('never produces a name already on the roster', () => {
    const existing = ['Goblin', 'Goblin 2', 'Goblin 5'];
    const plan = planMonsterNames(existing, 'Goblin', 4);
    const after = new Set([
      ...existing.filter((n) => n !== plan.renameFrom),
      ...(plan.renameTo ? [plan.renameTo] : []),
      ...plan.newNames,
    ]);
    expect(after.size).toBe(existing.length + plan.newNames.length);
  });
});
