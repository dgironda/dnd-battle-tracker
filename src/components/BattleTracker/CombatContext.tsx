// contexts/CombatContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Hero, Monster, Combatant } from "../../types/index";
import { InitiativeDialog } from './InitiativeDialog';
import { getHeroes, getMonsters, getCombatants, getRoundNumber, storeHeroes, storeMonsters, storeCombatants } from '../../utils/LocalStorage';
import { useMonsters } from "../../hooks/useMonsters";

interface CombatContextType {
  combatants: Combatant[];
  setCombatants: (c: Combatant[]) => void;
  currentTurnIndex: number;
  setCurrentTurnIndex: (i: number) => void;
  roundNumber: number;
  setRoundNumber: (r: number) => void;
  addMonsterToCombat: (id: string) => Promise<void>;
  currentCombatant: Hero | Monster | null;
  setCurrentCombatant: (c: Hero | Monster | null) => void;
  initiativeResolver: ((init: number) => void) | null;
  setInitiativeResolver: (fn: ((init: number) => void) | null) => void;
}

const CombatContext = createContext<CombatContextType | null>(null);

export function CombatProvider({ children }: { children: React.ReactNode }) {
  const { monsters, setMonsters } = useMonsters();
     const [combatants, setCombatants] = useState<Combatant[]>(() => {
      return getCombatants() || [];
    });
  const [currentTurnIndex, setCurrentTurnIndex] = useState(() => {
    const saved = localStorage.getItem('currentTurnIndex');
    return saved ? parseInt(saved) : 0;
  });
   const [roundNumber, setRoundNumber] = useState(() => {
      return getRoundNumber();
    });
  const [currentCombatant, setCurrentCombatant] = useState<Hero | Monster | null>(null);
  const [initiativeResolver, setInitiativeResolver] = useState<((init: number) => void) | null>(null);

  useEffect(() => {
    if (combatants.length > 0) {
      localStorage.setItem('currentTurnIndex', currentTurnIndex.toString());
      storeCombatants(combatants, roundNumber);
    }
  }, [combatants, currentTurnIndex, roundNumber]);


    const addMonsterToCombat = async (monsterId:string) => {
        // Get the monster you want to add
        const monster = monsters.find(m => m.id === monsterId);
        console.log('1. Monster found:', monster?.name);
        
        if (!monster) return;
        setCurrentCombatant(monster);
        console.log('2. About to set currentCombatant and wait for initiative');
  console.log('3. currentCombatant before:', currentCombatant);
  console.log('4. initiativeResolver before:', initiativeResolver);
        // Get initiative for the monster
        const initiative = await new Promise<number>((resolve) => {
                console.log('5. Inside Promise, setting currentCombatant');
            setCurrentCombatant(monster);
                console.log('6. Setting initiativeResolver');
            setInitiativeResolver(() => resolve);
                console.log('7. Waiting for initiative dialog');
        });
        console.log('8. Initiative received:', initiative);
        console.log('Initiative received:', initiative);
        
        const newCombatant: Combatant = {
            id: monster.id,
            name: monster.name,
            link: monster.link,
            type: 'monster',
            currHp: monster.hp,
            maxHp: monster.hp,
            initiative: initiative,
            action: false,
            bonus: false,
            move: false,
            reaction: false,
            conditions: monster.conditions,
            init: monster.init,
            stats: `Armor Class: ${monster.ac}\nStrength: ${monster.str}\nDexterity: ${monster.dex}\nConstitution: ${monster.con}\nIntelligence: ${monster.int}\nWisdom: ${monster.wis}\nCharisma: ${monster.cha}\nPassive Perception: ${monster.pp}\n\n${monster.link}`
        };
        // console.log("addMonsterToCombat newCombatant: ", newCombatant)
        
        setCombatants([...combatants, newCombatant]);
        const freshMonsters = getMonsters();
        const updatedMonsters = freshMonsters.filter(m => m.id !== monsterId);
        storeMonsters(updatedMonsters);
        
        // Re-sort will happen automatically
        setCurrentCombatant(null);
    };


  return (
    <CombatContext.Provider value={{
      combatants,
      setCombatants,
      currentTurnIndex,
      setCurrentTurnIndex,
      roundNumber,
      setRoundNumber,
      addMonsterToCombat,
      currentCombatant, // Add these to context
      setCurrentCombatant,
      initiativeResolver,
      setInitiativeResolver
    }}>
      {children}
    </CombatContext.Provider>
  );
}

export function useCombat() {
  const context = useContext(CombatContext);
  if (!context) throw new Error('useCombat must be used inside CombatProvider');
  return context;
}