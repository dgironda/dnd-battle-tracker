import { DEVMODE } from "../../utils/devmode";

// contexts/CombatContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { InitiativeDialog } from './InitiativeDialog';
import { Hero, Monster, Combatant } from "../../types/index";
import {
  getMonsters,
  getCombatants,
  getRoundNumber,
  storeMonsters,
  storeCombatants
} from '../../utils/LocalStorage';
import { useMonsters } from "../../hooks/useMonsters";

interface CombatContextType {
  combatants: Combatant[];
  setCombatants: (c: Combatant[]) => void;
  currentTurnIndex: number;
  setCurrentTurnIndex: (i: number) => void;
  roundNumber: number;
  setRoundNumber: (r: number) => void;
  addMonsterToCombat: (monster: Monster) => Promise<void>;
  currentCombatant: Hero | Monster | null;
  setCurrentCombatant: (c: Hero | Monster | null) => void;
  initiativeResolver: ((init: number) => void) | null;
  setInitiativeResolver: (fn: ((init: number) => void) | null) => void;
}

const CombatContext = createContext<CombatContextType | null>(null);

export function CombatProvider({ children }: { children: React.ReactNode }) {
  const { monsters } = useMonsters();

  const [combatants, setCombatants] = useState<Combatant[]>(() => getCombatants() || []);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(() => {
    const saved = localStorage.getItem('currentTurnIndex');
    return saved ? parseInt(saved) : 0;
  });
  const [roundNumber, setRoundNumber] = useState(() => getRoundNumber());
  const [currentCombatant, setCurrentCombatant] = useState<Hero | Monster | null>(null);
  const [initiativeResolver, setInitiativeResolver] = useState<((init: number) => void) | null>(null);

  // Store updates in localStorage when things change
  useEffect(() => {
    if (combatants.length > 0) {
      localStorage.setItem('currentTurnIndex', currentTurnIndex.toString());
      storeCombatants(combatants, roundNumber);
    }
  }, [combatants, currentTurnIndex, roundNumber]);

  /**
   * Adds a monster into an *existing combat*, with initiative dialog
   */
  const addMonsterToCombat = async (monster: Monster) => {
    if (!monster) return;

    // Trigger the initiative dialog by setting currentCombatant
    const initiative = await new Promise<number>((resolve) => {
      setCurrentCombatant(monster);
      setInitiativeResolver(() => resolve);
    });

    // Create Combatant entry
    const newCombatant: Combatant = {
      id: monster.id,
      name: monster.name,
      link: monster.link,
      type: 'monster',
      currHp: monster.hp,
      maxHp: monster.hp,
      tHp: 0,
      initiative,
      init: initiative,
      action: false,
      bonus: false,
      move: false,
      reaction: false,
      deathsaves: [],
      conditions: monster.conditions ?? [],
      stats: `Armor Class: ${monster.ac}\nSTR: ${monster.str}\nDEX: ${monster.dex}\nCON: ${monster.con}\nINT: ${monster.int}\nWIS: ${monster.wis}\nCHA: ${monster.cha}\nPP: ${monster.pp}\n\n${monster.link || ''}`,
    };

    // Add and sort by initiative (descending)
    setCombatants((prev) => {
      const updated = [...prev, newCombatant].sort((a, b) => b.initiative - a.initiative);
      storeCombatants(updated, roundNumber);
      return updated;
    });

    // Remove monster from selection pool
    const freshMonsters = getMonsters();
    const updatedMonsters = freshMonsters.filter((m) => m.id !== monster.id);
    storeMonsters(updatedMonsters);

    // Clear dialog context
    setCurrentCombatant(null);
    setInitiativeResolver(null);
  };

return (
  <CombatContext.Provider
    value={{
      combatants,
      setCombatants,
      currentTurnIndex,
      setCurrentTurnIndex,
      roundNumber,
      setRoundNumber,
      addMonsterToCombat,
      currentCombatant,
      setCurrentCombatant,
      initiativeResolver,
      setInitiativeResolver,
    }}
  >
    {children}

    {/*Render the InitiativeDialog when a combatant and resolver exist */}
    {initiativeResolver && currentCombatant && (
      <InitiativeDialog
        heroName={currentCombatant.name}
        initiativeModifier={currentCombatant.init || 0}
        onSubmit={(initiative: number) => {
          initiativeResolver(initiative);
          setInitiativeResolver(null);
          setCurrentCombatant(null);
        }}
      />
    )}
  </CombatContext.Provider>
);


}

export function useCombat() {
  const context = useContext(CombatContext);
  if (!context) throw new Error('useCombat must be used inside CombatProvider');
  return context;
}
