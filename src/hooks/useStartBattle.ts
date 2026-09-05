import { useCallback } from 'react';
import { Hero, Monster, Combatant } from '../types/index';
import { notify } from '../utils/notify';

interface UseBattleManagerProps {
  setRoundNumber: (round: number) => void;
  getHeroes: () => Hero[];
  getMonsters: () => Monster[];
  /** Prompts for one combatant's initiative; rejects if the user cancels. */
  askForInitiative: (entity: Hero | Monster) => Promise<number>;
  /** Removes the monsters that joined the battle from the manager roster. */
  removeMonstersFromRoster: (ids: string[]) => void;
  setCombatants: (combatants: Combatant[]) => void;
  setCurrentTurnIndex: (index: number) => void;
}

export const useBattleManager = (props: UseBattleManagerProps) => {
  const {
    setRoundNumber,
    getHeroes,
    getMonsters,
    askForInitiative,
    removeMonstersFromRoster,
    setCombatants,
    setCurrentTurnIndex,
  } = props;

  const handleStartBattle = useCallback(async () => {
    const presentHeroes = getHeroes().filter(h => h.present);
    const presentMonsters = getMonsters().filter(m => m.present);

    if (presentHeroes.length === 0) {
      await notify("Mark at least one hero as ready for battle, then try again.", {
        title: "No heroes ready",
        tone: "warning",
      });
      return;
    }

    const newCombatants: Combatant[] = [];

    try {
      for (const hero of presentHeroes) {
        const initiative = await askForInitiative(hero);

        newCombatants.push({
          id: hero.id,
          name: hero.name,
          type: 'hero',
          currHp: hero.hp,
          maxHp: hero.hp,
          tHp: 0,
          initiative,
          init: hero.init ?? 0,
          action: false,
          bonus: false,
          move: false,
          reaction: false,
          conditions: [],
          deathsaves: [],
          ac: hero.ac ?? 10,
          str: hero.str ?? 10,
          dex: hero.dex ?? 10,
          con: hero.con ?? 10,
          int: hero.int ?? 10,
          wis: hero.wis ?? 10,
          cha: hero.cha ?? 10,
          pp: hero.pp ?? 0,
          link: hero.link ?? ""
        });
      }

      for (const monster of presentMonsters) {
        const initiative = await askForInitiative(monster);

        newCombatants.push({
          id: monster.id,
          name: monster.name,
          link: monster.link,
          type: 'monster',
          currHp: monster.hp,
          maxHp: monster.hp,
          tHp: 0,
          initiative,
          action: false,
          bonus: false,
          move: false,
          reaction: false,
          conditions: monster.conditions ?? [],
          init: monster.init,
          deathsaves: [],
          ac: monster.ac,
          str: monster.str,
          dex: monster.dex,
          con: monster.con,
          int: monster.int,
          wis: monster.wis,
          cha: monster.cha,
          pp: monster.pp,
        });
      }
    } catch {
      // Cancelled part-way through. Nothing has been committed yet, so the
      // roster and the previous battle are both left exactly as they were.
      return;
    }

    // Only now is the battle real: pull the used monsters out of the manager
    // and swap in the new combatants.
    removeMonstersFromRoster(presentMonsters.map(m => m.id));
    setRoundNumber(1);
    setCombatants(newCombatants.sort((a, b) => b.initiative - a.initiative));
    setCurrentTurnIndex(0);
  }, [
    setRoundNumber,
    getHeroes,
    getMonsters,
    askForInitiative,
    removeMonstersFromRoster,
    setCombatants,
    setCurrentTurnIndex,
  ]);

  return { handleStartBattle };
};
