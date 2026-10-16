import { useCallback } from "react";
import { Hero, Monster, Combatant } from "../types/index";
import type { InitiativeEntry } from "../components/BattleTracker/InitiativeTable";
import { confirmDialog, notify } from "../utils/notify";
import { ASK_FOR_GROUP_INITIATIVE } from "../utils/experiments";
import { baseMonsterName, groupByKind } from "../utils/monsterNaming";
import { monsterCombatant } from "../utils/newCombatant";
import { track } from "../utils/telemetry";

interface UseBattleManagerProps {
  setRoundNumber: (round: number) => void;
  getHeroes: () => Hero[];
  getMonsters: () => Monster[];
  /** Prompts for one combatant's initiative; rejects if the user cancels. */
  askForInitiative: (entity: Hero | Monster) => Promise<number>;
  /** Asks for everyone's initiative in one table; rejects if the user cancels. */
  askForInitiatives: (groups: InitiativeEntry[][]) => Promise<Record<string, number>>;
  /** Manual mode: the one table, instead of a prompt per combatant. */
  manualInitiative: boolean;
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

/** A hero as they enter a new fight: at full health, nothing spent. */
function heroCombatant(hero: Hero, initiative: number): Combatant {
  return {
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
  };
}

/* Rows of the initiative table. The modifier is the one the single prompt
   rolls with, so Roll gives the same odds either way. */
const heroEntry = (hero: Hero): InitiativeEntry => ({
  id: hero.id,
  name: hero.name,
  type: "hero",
  modifier: hero.init || 0,
  player: hero.player || undefined,
});

const monsterEntry = (monster: Monster): InitiativeEntry => ({
  id: monster.id,
  name: monster.name,
  type: "monster",
  modifier: monster.init || 0,
});

export const useBattleManager = (props: UseBattleManagerProps) => {
  const {
    setRoundNumber,
    getHeroes,
    getMonsters,
    askForInitiative,
    askForInitiatives,
    manualInitiative,
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

    /* ---------------------------------------------------------------
       EXPERIMENT: group initiative (see utils/experiments.ts)

       Eight goblins used to mean eight prompts before anyone rolled a
       die. Monsters of the same kind travel together, so they can be
       offered one roll for the lot: as a question in the one-at-a-time
       prompts below, and as a row of its own in the table.

       To remove: make this `presentMonsters.map((m) => [m])` and take
       out the question marked below.
       --------------------------------------------------------------- */
    const monsterGroups = ASK_FOR_GROUP_INITIATIVE
      ? groupByKind(presentMonsters)
      : presentMonsters.map((m) => [m]);

    let initiatives: Record<string, number> = {};
    /* Set while asking, read once the battle is committed. */
    let askedToGroup = false;
    let grouped = false;

    try {
      if (manualInitiative) {
        initiatives = await askForInitiatives([
          ...presentHeroes.map((hero) => [heroEntry(hero)]),
          ...monsterGroups.map((group) => group.map(monsterEntry)),
        ]);
        /* The table asks no question, so for the report "asked" means a group
           row was on offer, and "grouped" that a whole group came out level.
           Separate rolls that happen to match count too, which is rare enough
           at a 1 in 20 per pair not to matter to the number. */
        askedToGroup = monsterGroups.some((group) => group.length > 1);
        grouped = monsterGroups.some(
          (group) =>
            group.length > 1 && group.every((m) => initiatives[m.id] === initiatives[group[0].id]),
        );
      } else {
        for (const hero of presentHeroes) {
          initiatives[hero.id] = await askForInitiative(hero);
        }

        for (const group of monsterGroups) {
          /* EXPERIMENT: group initiative. One shared roll, if the DM wants
             one. Asked rather than assumed: plenty of tables roll each
             monster separately on purpose, and a tracker that quietly merged
             them would be taking a decision that is not its to take. */
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
          /* --- EXPERIMENT: group initiative ends here --------------------- */

          for (const monster of group) {
            initiatives[monster.id] = shared ?? (await askForInitiative(monster));
          }
        }
      }
    } catch {
      // Cancelled part-way through. Nothing has been committed yet, so the
      // roster and the previous battle are both left exactly as they were.
      return;
    }

    /* Heroes first, then the monsters kind by kind: the order both ways of
       asking go in, and the order a tie in initiative is left in. */
    const newCombatants: Combatant[] = [
      ...presentHeroes.map((hero) => heroCombatant(hero, initiatives[hero.id])),
      ...monsterGroups.flat().map((monster) => monsterCombatant(monster, initiatives[monster.id])),
    ];

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
      initiative_entry: manualInitiative ? "table" : "one_at_a_time",
    });
  }, [
    setRoundNumber,
    getHeroes,
    getMonsters,
    askForInitiative,
    askForInitiatives,
    manualInitiative,
    removeMonstersFromRoster,
    setCombatants,
    setCurrentTurnIndex,
    getCurrentBattle,
  ]);

  return { handleStartBattle };
};
