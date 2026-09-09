import { useCallback } from "react";
import { Hero, Monster, Combatant } from "../types/index";
import { confirmDialog, notify } from "../utils/notify";
import { ASK_FOR_GROUP_INITIATIVE } from "../utils/experiments";
import { baseMonsterName, groupByKind } from "../utils/monsterNaming";
import { track } from "../utils/telemetry";

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
  /**
   * The fight currently on screen, read at the moment the new one commits.
   *
   * Only for the "battle_ended" report. Most fights never get cleared with the
   * button — the next one is simply started over the top — so without this the
   * started/ended pair would show almost every battle as abandoned.
   */
  getCurrentBattle: () => { rounds: number; combatants: number };
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
    getCurrentBattle,
  } = props;

  const handleStartBattle = useCallback(async () => {
    const presentHeroes = getHeroes().filter((h) => h.present);
    const presentMonsters = getMonsters().filter((m) => m.present);

    if (presentHeroes.length === 0) {
      await notify(
        "Mark at least one hero as ready for battle, then try again.",
        {
          title: "No heroes ready",
          tone: "warning",
        },
      );
      return;
    }

    const newCombatants: Combatant[] = [];
    /* Set inside the monster loop below, read once the battle is committed. */
    let askedToGroup = false;
    let grouped = false;

    try {
      for (const hero of presentHeroes) {
        const initiative = await askForInitiative(hero);

        newCombatants.push({
          id: hero.id,
          name: hero.name,
          type: "hero",
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
          link: hero.link ?? "",
        });
      }

      /* ---------------------------------------------------------------
         EXPERIMENT: group initiative (see utils/experiments.ts)

         Eight goblins used to mean eight prompts before anyone rolled a
         die. Monsters of the same kind are offered one roll for the lot.

         To remove: delete from here to the matching marker below and put
         back the plain loop:

             for (const monster of presentMonsters) {
               const initiative = await askForInitiative(monster);
               newCombatants.push({ ...as below... });
             }
         --------------------------------------------------------------- */
      const monsterGroups = ASK_FOR_GROUP_INITIATIVE
        ? groupByKind(presentMonsters)
        : presentMonsters.map((m) => [m]);

      for (const group of monsterGroups) {
        /* One shared roll, if the DM wants one. Asked rather than assumed:
           plenty of tables roll each monster separately on purpose, and a
           tracker that quietly merged them would be taking a decision that
           is not its to take. */
        let shared: number | null = null;
        if (group.length > 1) {
          askedToGroup = true;
          const together = await confirmDialog(
            `Roll one initiative for all ${group.length} ${baseMonsterName(group[0].name)}s, or one each?`,
            {
              title: "Group initiative",
              confirmLabel: "One roll for all",
              cancelLabel: "One each",
            },
          );
          if (together) {
            shared = await askForInitiative(group[0]);
            grouped = true;
          }
        }

        for (const monster of group) {
          const initiative = shared ?? (await askForInitiative(monster));

          newCombatants.push({
            id: monster.id,
            name: monster.name,
            link: monster.link,
            type: "monster",
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
      }
      /* --- EXPERIMENT: group initiative ends here --------------------- */
    } catch {
      // Cancelled part-way through. Nothing has been committed yet, so the
      // roster and the previous battle are both left exactly as they were.
      return;
    }

    // Only now is the battle real: pull the used monsters out of the manager
    // and swap in the new combatants.
    removeMonstersFromRoster(presentMonsters.map((m) => m.id));
    setRoundNumber(1);
    setCombatants(newCombatants.sort((a, b) => b.initiative - a.initiative));
    setCurrentTurnIndex(0);

    /* Reported here rather than at the top of the function: everything above
       can be cancelled part-way through, and a "battle_started" for a fight
       nobody started would put a hole in every funnel built on it. */
    const outgoing = getCurrentBattle();
    if (outgoing.combatants > 0) {
      track("battle_ended", {
        rounds: outgoing.rounds,
        combatants: outgoing.combatants,
        ending: "replaced",
      });
    }
    track("battle_started", {
      heroes: presentHeroes.length,
      monsters: presentMonsters.length,
      combatants: newCombatants.length,
      grouped_initiative: askedToGroup && grouped,
    });
  }, [
    setRoundNumber,
    getHeroes,
    getMonsters,
    askForInitiative,
    removeMonstersFromRoster,
    setCombatants,
    setCurrentTurnIndex,
    getCurrentBattle,
  ]);

  return { handleStartBattle };
};
