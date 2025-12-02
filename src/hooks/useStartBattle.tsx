import { useCallback } from 'react';
import { Hero, Monster, Combatant } from '../types/index';

interface UseBattleManagerProps {
  setRoundNumber: (round: number) => void;
  setShowHeroManager: (show: boolean) => void;
  setShowMonsterManager: (show: boolean) => void;
  getHeroes: () => Hero[];
  getMonsters: () => Monster[];
  setCurrentCombatant: (combatant: any) => void;
  setInitiativeResolver: (resolver: any) => void;
  storeMonsters: (monsters: Monster[]) => void;
  setCombatants: (combatants: Combatant[]) => void;
  setCurrentTurnIndex: (index: number) => void;
}

export const useBattleManager = (props: UseBattleManagerProps) => {
  const {
    setRoundNumber,
    setShowHeroManager,
    setShowMonsterManager,
    getHeroes,
    getMonsters,
    setCurrentCombatant,
    setInitiativeResolver,
    storeMonsters,
    setCombatants,
    setCurrentTurnIndex
  } = props;

  const handleStartBattle = useCallback(async () => {
    setRoundNumber(1);
    
    const confirmed = window.confirm("Are you sure you want to start a new battle?");
    if (!confirmed) return;
    
    setShowHeroManager(false);
    setShowMonsterManager(false);
    
    const freshHeroes = getHeroes();
    const freshMonsters = getMonsters();
    const presentHeroes = freshHeroes.filter(h => h.present);
    const presentMonsters = freshMonsters.filter(m => m.present);
    const newCombatants: Combatant[] = [];
    
    for (const hero of presentHeroes) {
      // Show dialog and wait for initiative
      const initiative = await new Promise<number>((resolve) => {
        setCurrentCombatant(hero);
        setInitiativeResolver(() => resolve);
      });
      
      newCombatants.push({
        id: hero.id,
        name: hero.name,
        type: 'hero',
        currHp: hero.hp ?? hero.maxHp ?? 0,
        maxHp: hero.maxHp ?? hero.hp ?? 0,
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
    
    // Process monsters
    for (const monster of presentMonsters) {
      const initiative = await new Promise<number>((resolve) => {
        setCurrentCombatant(monster);
        setInitiativeResolver(() => resolve);
      });
      
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
        conditions: monster.conditions,
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
    
    const idsToDelete = presentMonsters.map(m => m.id);
    const updatedMonsters = freshMonsters.filter(m => !idsToDelete.includes(m.id));
    storeMonsters(updatedMonsters);
    setCurrentCombatant(null);
    setCombatants(newCombatants);
    setCurrentTurnIndex(0);
  }, [setRoundNumber, setShowHeroManager, setShowMonsterManager, getHeroes, getMonsters, setCurrentCombatant, setInitiativeResolver, storeMonsters, setCombatants, setCurrentTurnIndex]);

  return { handleStartBattle };
};