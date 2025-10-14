import React, { useState, useEffect } from "react";
import HeroManager from "../HeroManager/HeroManager";
import { Hero, Monster, Combatant } from "../../types/index";
import { startBattle } from "../../utils/battleUtils";
import { predefinedConditions, conditionDescriptionsTwentyTwentyFour, conditionDescriptionsTwentyFourteen } from "../../constants/Conditions";
import { EditableCell } from "../../utils/editableCell";
import { HpChangeModal } from "../../utils/dmg-heal";
import { useHeroes } from "../../hooks/useHeroes";
import { useMonsters } from "../../hooks/useMonsters";
import { InitiativeDialog } from "./InitiativeDialog";
import { getHeroes, storeHeroes, getMonsters, storeMonsters, getCombatants, getRoundNumber, storeCombatants } from "../../utils/LocalStorage";
import { useGlobalContext } from "../../hooks/versionContext";
import { createDeleteMonster } from "../Utils";
import RoundNumberSpan from "./RoundNumber";

interface BattleTrackerProps {
  setShowHeroManager: (show: boolean) => void;
  setShowMonsterManager: (show: boolean) => void;
}

const BattleTracker: React.FC<BattleTrackerProps> = ({ 
  setShowHeroManager, 
  setShowMonsterManager 
}) => {
  const { heroes, setHeroes } = useHeroes();
    const [combatants, setCombatants] = useState<Combatant[]>(() => {
    return getCombatants() || [];
  });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingConditions, setEditingConditions] = useState<string | null>(null);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(() => {
    const saved = localStorage.getItem('currentTurnIndex');
    return saved ? parseInt(saved) : 0;
  });
  const [hasSavedCombat, setHasSavedCombat] = useState(false);
  const [currentCombatant, setCurrentCombatant] = useState<Hero | Monster | null>(null);
  const { monsters, setMonsters } = useMonsters();
  const deleteMonster = createDeleteMonster(monsters, setMonsters);
  const [initiativeResolver, setInitiativeResolver] = useState<((init: number) => void) | null>(null);
  const { status } = useGlobalContext();
  const [hpModalCombatant, setHpModalCombatant] = useState<Combatant | null>(null);

  const sortedCombatants = [...combatants].sort((a, b) => b.initiative - a.initiative);
  const [roundNumber, setRoundNumber] = useState(() => {
    return getRoundNumber();
  });
  
  useEffect(() => {
    const saved = getCombatants();
    setHasSavedCombat(saved && saved.length > 0);
  }, []);

  const updateCombatant = (combatantId: string, field: keyof Combatant, value: any) => {
    const updatedCombatants = combatants.map(combatant =>
      combatant.id === combatantId ? { ...combatant, [field]: value } : combatant
    );
    setCombatants(updatedCombatants);
  };

  const addCondition = (combatantId: string, condition: string) => {
    const combatant = combatants.find(c => c.id === combatantId);
    if (combatant && !combatant.conditions.includes(condition)) {
      const updatedConditions = [...combatant.conditions, condition];
      updateCombatant(combatantId, 'conditions', updatedConditions);
    }
  };

  const removeCondition = (combatantId: string, conditionToRemove: string) => {
    const combatant = combatants.find(c => c.id === combatantId);
    if (combatant) {
      const updatedConditions = combatant.conditions.filter(c => c !== conditionToRemove);
      updateCombatant(combatantId, 'conditions', updatedConditions);
    }
  };
  
  const conditionDescriptions = status === 'twentyFourteen' ? conditionDescriptionsTwentyFourteen : conditionDescriptionsTwentyTwentyFour;

  const getHpColor = (currHp: number, maxHp: number): string => {
  if (maxHp === 0) return '#f8f2eb';
  
  const percentage = Math.max(0, Math.min(1, currHp / maxHp));
  
  // Start color: #f8f2eb (100% HP)
  const startR = 0xf8;
  const startG = 0xf2;
  const startB = 0xeb;
  
  // End color: #880808 (0% HP)
  const endR = 0x88;
  const endG = 0x08;
  const endB = 0x08;
  
  // Interpolate each channel
  const r = Math.round(endR + (startR - endR) * percentage);
  const g = Math.round(endG + (startG - endG) * percentage);
  const b = Math.round(endB + (startB - endB) * percentage);
  
  // Convert to hex
  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');
  
  return `#${rHex}${gHex}${bHex}`;
};
  
  const handleStartBattle = async () => {
    setRoundNumber(1)
	// Confirm with the user before starting a new battle
	const confirmed = window.confirm("Are you sure you want to start a new battle?");
	if (!confirmed) return; // Exit early if user says no
    setShowHeroManager(false); // Close Hero Manager
    setShowMonsterManager(false); // Close Monster Manager

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
        currHp: hero.hp,
        maxHp: hero.hp,
        initiative,
        action: false,
        bonus: false,
        move: false,
        reaction: false,
        conditions: [],
        init: hero.init,
        stats: `Player: ${hero.player}\n\nArmor Class: ${hero.ac}\nStrength: ${hero.str}\nDexterity: ${hero.dex}\nConstitution: ${hero.con}\nIntelligence: ${hero.int}\nWisdom: ${hero.wis}\nCharisma: ${hero.cha}\nPassive Perception: ${hero.pp}`
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
      initiative,
      action: false,
      bonus: false,
      move: false,
      reaction: false,
      conditions: monster.conditions,
      init: monster.init,
      stats: `Armor Class: ${monster.ac}\nStrength: ${monster.str}\nDexterity: ${monster.dex}\nConstitution: ${monster.con}\nIntelligence: ${monster.int}\nWisdom: ${monster.wis}\nCharisma: ${monster.cha}\nPassive Perception: ${monster.pp}\n\n${monster.link}`
    });
    // deleteMonster(monster.id)
  }

  const idsToDelete = presentMonsters.map(m => m.id);
  const updatedMonsters = freshMonsters.filter(m => !idsToDelete.includes(m.id));
  storeMonsters(updatedMonsters);
  
  
  setCurrentCombatant(null);
  setCombatants(newCombatants);
  setCurrentTurnIndex(0);
};

  const handleNextTurn = () => {
  if (sortedCombatants.length === 0) return;
  
  setCurrentTurnIndex((prevIndex) => {
    let nextIndex = (prevIndex + 1) % sortedCombatants.length;
    let attempts = 0;
    const maxAttempts = sortedCombatants.length; // Prevent infinite loop
    
    // Skip dead combatants
     while (
            attempts < maxAttempts && 
            sortedCombatants[nextIndex].conditions.includes('Dead')
        ) {
            nextIndex = (nextIndex + 1) % sortedCombatants.length;
            attempts++;
        }
    if (attempts === maxAttempts) {
            console.warn("All combatants are dead. No turns left.");
            return prevIndex; // or handle as needed (e.g., reset the game)
        }
    // If we've cycled back to the first combatant (or first alive combatant), new round
    if (nextIndex === 0 || (nextIndex < prevIndex && attempts > 0)) {
      const resetCombatants = sortedCombatants.map(combatant => ({
        ...combatant,
        action: false,
        bonus: false,
        move: false
      }));
      setCombatants(resetCombatants);
      setRoundNumber(prev => prev + 1);
    }
    
    // Reset reaction for the next combatant (if they're not dead)
    if (!sortedCombatants[nextIndex].conditions.includes('Dead')) {
      const nextCombatantId = sortedCombatants[nextIndex].id;
      setCombatants(prevCombatants =>
        prevCombatants.map(c =>
          c.id === nextCombatantId ? { ...c, reaction: false } : c
        )
      );
    }
    
    return nextIndex;
  });
};
  


  // Advance turn when action, bonus, and move are checked
  useEffect(() => {
    if (sortedCombatants.length === 0) return;
    
    const currentCombatant = sortedCombatants[currentTurnIndex];
    
    // Skip if dead OR if all three are checked
  if (
    currentCombatant.conditions.includes('Dead') ||
    (currentCombatant.action && currentCombatant.bonus && currentCombatant.move)
  ) {
    handleNextTurn();
  }
}, [combatants, currentTurnIndex]);
  
  // Unchecking will set that player as Current Turn
  useEffect(() => {
  if (sortedCombatants.length === 0) return;

  // Find first combatant that has at least one action unchecked and is not dead
  const nextTurnIndex = sortedCombatants.findIndex(combatant =>
    !combatant.conditions.includes('Dead') && // Add this check
    (!combatant.action || !combatant.bonus || !combatant.move)
  );

  // If we found one and it's different from current turn, switch to it
  if (nextTurnIndex !== -1 && nextTurnIndex !== currentTurnIndex) {
    setCurrentTurnIndex(nextTurnIndex);
  }
}, [combatants]); 

  // Save on every state change
useEffect(() => {
  if (combatants.length > 0) {
    storeCombatants(combatants, roundNumber);
    localStorage.setItem('currentTurnIndex', currentTurnIndex.toString());
  }
}, [combatants, currentTurnIndex]);

  // Keyboard shortcuts
  useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (sortedCombatants.length === 0) return;
    
    const currentCombatant = sortedCombatants[currentTurnIndex];
    
    switch(e.key.toLowerCase()) {
      case 'a':
        updateCombatant(currentCombatant.id, 'action', !currentCombatant.action);
        break;
      case 's':
        updateCombatant(currentCombatant.id, 'bonus', !currentCombatant.bonus);
        break;
      case 'd':
        updateCombatant(currentCombatant.id, 'move', !currentCombatant.move);
        break;
    }
  };

  // Add event listener
  window.addEventListener('keydown', handleKeyPress);

  // Cleanup: remove listener when component unmounts
  return () => {
    window.removeEventListener('keydown', handleKeyPress);
  };
}, [sortedCombatants, currentTurnIndex, updateCombatant]);

  const ConditionsEditor = ({ combatant }: { combatant: Combatant }) => {
    const isEditing = editingConditions === combatant.id;

    if (isEditing) {
      return (
        <div className="conditionEditOuter">
          {/* Current conditions with remove buttons */}
          <div>
            {combatant.conditions.map((conditionName) => (
              <span
                key={conditionName}
                className="conditionNameEditing"
                onClick={() => removeCondition(combatant.id, conditionName)}
                title={conditionDescriptions[conditionName] || conditionName}
              >
                {conditionName} ×
              </span>
            ))}
          </div>
          
          {/* Add new conditions */}
          <select
            onChange={(e) => {
              if (e.target.value) {
                addCondition(combatant.id, e.target.value);
                e.target.value = '';
              }
            }}
            className="conditionSelect"
          >
            <option value="">Add condition...</option>
            {predefinedConditions
              .filter(condition => !combatant.conditions.includes(condition))
              .map(condition => (
                <option key={condition} value={condition}>{condition}</option>
              ))}
          </select>
          
          <button
            onClick={() => setEditingConditions(null)}
            className="editConditionsDone"
          >
            Done
          </button>
        </div>
      );
    }

    return (
      <span 
        onClick={() => setEditingConditions(combatant.id)}
        className="editConditions" 
        title="Click to edit conditions"
      >
        {combatant.conditions.length > 0 
          ? combatant.conditions.map((conditionName) => (
              <span
                key={conditionName}
                className="conditionName"
                title={conditionDescriptions[conditionName] || conditionName}
              >
                {conditionName}
              </span>
            ))
          : <span className="noCondition">None</span>
        }
      </span>
    );
  };

  return (
    <div id="battleTrackerOuter">
      {/* #7: Resume Combat UI */}
      {hasSavedCombat && combatants.length === 0 && (
        <div style={{ 
          backgroundColor: '#fff3cd', 
          padding: '1rem', 
          marginBottom: '1rem',
          borderRadius: '4px',
          border: '1px solid #ffc107'
        }}>
          <p style={{ margin: '0 0 0.5rem 0' }}>
            ⚠️ Combat in progress detected!
          </p>
          <button 
            onClick={() => {
              const saved = getCombatants();
              if (saved) setCombatants(saved);
              setHasSavedCombat(false);
            }}
            style={{ marginRight: '0.5rem' }}
          >
            Resume Combat
          </button>
          <button onClick={handleStartBattle}>
            Start New Combat
          </button>
        </div>
      )}
      <div>
        <button id="buttonStartBattle" onClick={handleStartBattle}>
          Start Battle
        </button>
        <RoundNumberSpan
        roundNumber={roundNumber} />
        {/* <button id="buttonNextTurn" onClick={handleNextTurn} disabled={combatants.length === 0}>
          Next Turn
        </button> */}
      </div>

      {/* Battle Table */}
      <table id="battleTracker">
        <thead>
          <tr>
            <th>Name</th>
            <th>Initiative</th>
            <th>HP</th>
            <th>Action</th>
            <th>Bonus</th>
            <th>Move</th>
            <th>Reaction</th>
            <th>Conditions</th>
          </tr>
        </thead>
        <tbody>
          {sortedCombatants.map((combatant, index) => (
            <tr 
              key={combatant.id}
              style={{ 
                backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa',
                borderLeft: index === currentTurnIndex ? '5px solid #777777' : 'none'
              }}
            >
              {/* Do we need to update the styles above and below this? */}
			  <td style={{ fontWeight: index === currentTurnIndex ? 'bold' : 'normal' }}>
				  {combatant.type === "monster" && combatant.link ? (
					<a 
					  href={combatant.link} 
					  target="_blank" 
					  rel="noopener noreferrer" 
					  title={combatant.stats}
					  style={{ color: '#007bff', textDecoration: 'none' }}
					  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
					  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
					>
					  {combatant.name}
					</a>
				  ) : (
					<span title={combatant.stats}>{combatant.name}</span>
				  )}
				  {index === currentTurnIndex && (
					<span style={{ color: '#28a745', marginLeft: '8px' }}>← Current Turn</span>
				  )}
			  </td>

              <td>
                {combatant.initiative}
              </td>
              <td
              className="combatantHP"
              style={{ 
                backgroundColor: getHpColor(combatant.currHp, combatant.maxHp),
                color: combatant.currHp < combatant.maxHp * 0.5 ? 'white' : 'black'
              }}
              onClick={() => setHpModalCombatant(combatant)}
              title="Click to change HP">
                {combatant.currHp} / {combatant.maxHp}
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={combatant.action}
                  onChange={(e) => updateCombatant(combatant.id, 'action', e.target.checked)}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={combatant.bonus}
                  onChange={(e) => updateCombatant(combatant.id, 'bonus', e.target.checked)}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={combatant.move}
                  onChange={(e) => updateCombatant(combatant.id, 'move', e.target.checked)}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={combatant.reaction}
                  onChange={(e) => updateCombatant(combatant.id, 'reaction', e.target.checked)}
                />
              </td>
              <td>
                <ConditionsEditor combatant={combatant} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
          
      {sortedCombatants.length === 0 && (
        <p id="noCombatants">
          No combatants in battle. Start a battle to see combatants here.
        </p>
      )}
      {currentCombatant && initiativeResolver && (
        <InitiativeDialog 
          heroName={currentCombatant.name}
          initiativeModifier={currentCombatant.init}
          onSubmit={(init) => {
            initiativeResolver(init);
            setCurrentCombatant(null);
            setInitiativeResolver(null);
      }}
  />
)}
{hpModalCombatant && (
  <HpChangeModal
    combatantId={hpModalCombatant.id}
    combatantName={hpModalCombatant.name}
    currentHp={hpModalCombatant.currHp}
    maxHp={hpModalCombatant.maxHp}
    conditions={hpModalCombatant.conditions}
    onSubmit={(newHp) => {
      updateCombatant(hpModalCombatant.id, 'currHp', newHp);
    }}
    onRemoveCondition={(condition) => {
      const updated = hpModalCombatant.conditions.filter(c => c !== condition);
      updateCombatant(hpModalCombatant.id, 'conditions', updated);
    }}
    onUpdateBoth={(newHp, newConditions) => {
      setCombatants(prev => prev.map(c => 
        c.id === hpModalCombatant.id 
          ? { ...c, currHp: newHp, conditions: newConditions }
          : c
      ));
      setHpModalCombatant(null); // Close modal here after update
    }}
    onClose={() => setHpModalCombatant(null)}
  />
)}
    </div>

  );
  
};

export default BattleTracker;