/**
 * Working out what to call a batch of monsters being added to the roster.
 *
 * The rule a DM expects: the first Goblin is just "Goblin", and the moment a
 * second one arrives they become "Goblin 1" and "Goblin 2". The original is
 * the first of its kind, not a nameless one sitting beside a numbered set —
 * leaving "Goblin" next to "Goblin 1" reads as though the first is the odd one
 * out.
 *
 * Kept out of the component so it can be tested on its own; the component
 * applies the rename and appends the new names.
 */
export interface NamingPlan {
  /** The roster entry to renumber, or null when nothing needs renaming. */
  renameFrom: string | null;
  /** What to call it instead. */
  renameTo: string | null;
  /** Names for the monsters being added, in order. */
  newNames: string[];
}

export function planMonsterNames(
  existing: readonly string[],
  baseName: string,
  howMany: number,
): NamingPlan {
  const names = new Set(existing);
  const plainNameTaken = names.has(baseName);

  // Only renumber the original when "<name> 1" is actually free — if the
  // roster already has one, the bare name is a deliberate separate entry and
  // renaming it would collide.
  const renameOriginal = plainNameTaken && !names.has(`${baseName} 1`);
  if (renameOriginal) {
    names.delete(baseName);
    names.add(`${baseName} 1`);
  }

  const newNames: string[] = [];
  let next = 1;
  for (let i = 0; i < howMany; i++) {
    let candidate = howMany === 1 && !plainNameTaken ? baseName : `${baseName} ${next++}`;
    while (names.has(candidate)) {
      candidate = `${baseName} ${next++}`;
    }
    newNames.push(candidate);
    names.add(candidate);
  }

  return {
    renameFrom: renameOriginal ? baseName : null,
    renameTo: renameOriginal ? `${baseName} 1` : null,
    newNames,
  };
}
