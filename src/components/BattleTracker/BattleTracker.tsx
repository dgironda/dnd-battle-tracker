import React, { useState, useEffect, useRef } from "react";
import HeroManager from "../HeroManager/HeroManager";
import { Hero, Monster, Combatant } from "../../types/index";
import { startBattle } from "../../utils/battleUtils";
import { predefinedConditions, conditionDescriptionsTwentyTwentyFour, conditionDescriptionsTwentyFourteen } from "../../constants/Conditions";
import { EditableCell } from "../../utils/editableCell";
import { HpChangeModal } from "../../utils/dmg-heal";
import { useHeroes } from "../../hooks/useHeroes";
import { useMonsters } from "../../hooks/useMonsters";
import { useCombat } from "./CombatContext";
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
  //   const [combatants, setCombatants] = useState<Combatant[]>(() => {
  //   return getCombatants() || [];
  // });
  const { combatants, setCombatants, currentTurnIndex, setCurrentTurnIndex, roundNumber, setRoundNumber } = useCombat();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingConditions, setEditingConditions] = useState<string | null>(null);
  // const [currentTurnIndex, setCurrentTurnIndex] = useState(() => {
  //   const saved = localStorage.getItem('currentTurnIndex');
  //   return saved ? parseInt(saved) : 0;
  // });
  const [hasSavedCombat, setHasSavedCombat] = useState(false);
  const [currentCombatant, setCurrentCombatant] = useState<Hero | Monster | null>(null);
  const { monsters, setMonsters } = useMonsters();
  const deleteMonster = createDeleteMonster(monsters, setMonsters);
  const [initiativeResolver, setInitiativeResolver] = useState<((init: number) => void) | null>(null);
  const { status } = useGlobalContext();
  const [hpModalCombatant, setHpModalCombatant] = useState<Combatant | null>(null);

  const sortedCombatants = [...combatants].sort((a, b) => b.initiative - a.initiative);
  // const [roundNumber, setRoundNumber] = useState(() => {
  //   return getRoundNumber();
  // });
  
  useEffect(() => {
    const saved = getCombatants();
    setHasSavedCombat(saved && saved.length > 0);
  }, [combatants]);

  const updateCombatant = (combatantId: string, field: keyof Combatant, value: any) => {
  const updatedCombatants = combatants.map(combatant =>
    combatant.id === combatantId ? { ...combatant, [field]: value } : combatant
  ).sort((a, b) => b.initiative - a.initiative);  
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
        tHp: 0,
        initiative,
        action: false,
        bonus: false,
        move: false,
        reaction: false,
        conditions: [],
        init: hero.init,
        deathsaves: [],
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
      tHp: 0,
      initiative,
      action: false,
      bonus: false,
      move: false,
      reaction: false,
      conditions: monster.conditions,
      init: monster.init,
      deathsaves: [],
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

  let nextIndex = (currentTurnIndex + 1) % sortedCombatants.length;
  let attempts = 0;
  const maxAttempts = sortedCombatants.length;

  while (
    attempts < maxAttempts &&
    sortedCombatants[nextIndex].conditions.includes('Dead')
  ) {
    nextIndex = (nextIndex + 1) % sortedCombatants.length;
    attempts++;
  }

  if (attempts === maxAttempts) {
    console.warn("All combatants are dead. No turns left.");
    return;
  }

  // Reset ALL combatants at the start of a new round
  if (nextIndex === 0 || (nextIndex < currentTurnIndex && attempts > 0)) {
    const nextCombatantId = sortedCombatants[nextIndex].id;
    const resetCombatants = combatants
  .map(c => {
    if (!c.conditions.includes('Dead')) {
      return { ...c, action: false, bonus: false, move: false };
    }
    return c;
  })
  .sort((a, b) => b.initiative - a.initiative)
  .map(c => c.id === nextCombatantId ? { ...c, reaction: false } : c);

    setCombatants(resetCombatants);
    setRoundNumber(roundNumber + 1);
    setCurrentTurnIndex(nextIndex);
  } else {
    // Just reset reaction for the next combatant
    const nextCombatantId = sortedCombatants[nextIndex].id;
    const updatedCombatants = combatants.map(c =>
      c.id === nextCombatantId ? { ...c, reaction: false } : c
    );
    setCombatants(updatedCombatants);
    setCurrentTurnIndex(nextIndex);
    if (nextIndex < updatedCombatants.length) {
    updatedCombatants[nextIndex].action = false;
    updatedCombatants[nextIndex].bonus = false;
    updatedCombatants[nextIndex].move = false;
    console.log("After Handle Next Turn:", updatedCombatants, "Current Turn", sortedCombatants[nextIndex].name);
  }
  }
   
};
  
  // Auto-open HP modal for death saves
  useEffect(() => {
  if (sortedCombatants.length === 0 || hpModalCombatant !== null) return;
  
  const currentCombatant = sortedCombatants[currentTurnIndex];
  if (currentCombatant.conditions.includes('Death Saves')) {
    setHpModalCombatant(currentCombatant);
    console.log(currentCombatant.name," needs to make a death saving throw.")
    updateCombatant(currentCombatant.id, 'action', true);
    updateCombatant(currentCombatant.id, 'bonus', true);
    updateCombatant(currentCombatant.id, 'move', true);
  }
}, [currentTurnIndex]);

  // Advance turn when action, bonus, and move are checked
  useEffect(() => {
    if (sortedCombatants.length === 0) return;
    const currentCombatant = sortedCombatants[currentTurnIndex];
   
    console.log('Auto-advance check:', currentCombatant.name, {
    action: currentCombatant.action,
    bonus: currentCombatant.bonus,
    move: currentCombatant.move,
    conditions: currentCombatant.conditions
  });

    // Skip if dead OR if all three are checked
  if (!currentCombatant.conditions.includes('Dead') &&
  (currentCombatant.action && currentCombatant.bonus && currentCombatant.move)) {
    handleNextTurn();
}

}, [combatants]);
  
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

  // Action, Bonus, Movement Keyboard shortcuts
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
            ⚠️ Battle in progress detected!
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
        <button title="Start a new Battle" id="buttonStartBattle" onClick={handleStartBattle}>
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
            <th title="Hero/Monster Name">Name</th>
            <th title="Initiative, either input or rolled">Initiative</th>
            <th title="Current HP / Maximum HP">HP</th>
            <th title="Check if this combatant is using, passing, or holding their action">Action<sup>(a)</sup></th>
            <th title="Check if this combatant is using or passing their bonus action">Bonus<sup>(s)</sup></th>
            <th title="Check if this combatant is using or passing their movement">Move<sup>(d)</sup></th>
            <th title="Check if this combatant has used their reaction, resets on their next turn">Reaction</th>
            <th title="Input any conditions as they come up, hover over their name for a reminder of the effects. Reminder text changes depending on which version is selected in the upper right.">Conditions</th>
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
                <span title="Initiative">
                  <EditableCell
                    entity={combatant}
                    field="initiative"
                    type="number"
                    editingField={editingField}
                    setEditingField={setEditingField}
                    updateEntity={updateCombatant}
                  />
                </span>
              </td>
              <td
              className="combatantHP"
              style={{ 
                backgroundColor: getHpColor(combatant.currHp, combatant.maxHp),
                color: combatant.currHp < combatant.maxHp * 0.5 ? 'white' : 'black'
              }}
              onClick={() => setHpModalCombatant(combatant)}
              title="Click to change HP">
                <>{combatant.tHp > 0 && (
                  <p className="thp">🛡️( {combatant.tHp} )</p>
                  )}
                {combatant.currHp} / {combatant.maxHp}   
              </></td>
			  
			  {/* Added disabling of checkboxes on "Dead", might want to do this on "Death Saves" after prompt to roll and count of Saves/Fails? */}
			  <td>
			    <input
          key={combatant.id}
				  type="checkbox"
          id={`${combatant.id}-action`}
				  checked={combatant.action}
				  disabled={combatant.conditions.includes('Dead') || combatant.conditions.includes('Death Saves')}
				  onChange={(e) => updateCombatant(combatant.id, 'action', e.target.checked)}
			    />
			  </td>
			  <td>
			    <input
          key={combatant.id}
				  type="checkbox"
          id={`${combatant.id}-bonus`}
				  checked={combatant.bonus}
				  disabled={combatant.conditions.includes('Dead') || combatant.conditions.includes('Death Saves')}
				  onChange={(e) => updateCombatant(combatant.id, 'bonus', e.target.checked)}
			    />
			  </td>
			  <td>
			    <input
          key={combatant.id}
				  type="checkbox"
          id={`${combatant.id}-move`}
				  checked={combatant.move}
				  disabled={combatant.conditions.includes('Dead') || combatant.conditions.includes('Death Saves')}
				  onChange={(e) => updateCombatant(combatant.id, 'move', e.target.checked)}
			    />
			  </td>
			  <td>
			    <input
          key={combatant.id}
				  type="checkbox"
          id={`${combatant.id}-reaction`}
				  checked={combatant.reaction}
				  disabled={combatant.conditions.includes('Dead') || combatant.conditions.includes('Death Saves')}
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
        <>
        {console.log('InitiativeDialog rendering for:', currentCombatant.name)}
        <InitiativeDialog 
          heroName={currentCombatant.name}
          initiativeModifier={currentCombatant.init}
          onSubmit={(init) => {
            console.log('Initiative submitted:', init);
            initiativeResolver(init);
            setCurrentCombatant(null);
            setInitiativeResolver(null);
      }}
  />
  </>
)}
{hpModalCombatant && (
  <HpChangeModal
    combatant={hpModalCombatant}
    combatantId={hpModalCombatant.id}
    combatantName={hpModalCombatant.name}
    currentHp={hpModalCombatant.currHp}
    maxHp={hpModalCombatant.maxHp}
    tHp={hpModalCombatant.tHp}
    conditions={hpModalCombatant.conditions}
    type={hpModalCombatant.type}
    deathsaves={hpModalCombatant.deathsaves || []}
    currentCombatantID={sortedCombatants[currentTurnIndex].id}
    onSubmit={(newHp, newtHp) => {
      // updateCombatant(hpModalCombatant.id, 'currHp', newHp);
      const updatedCombatants = combatants.map(c =>
        c.id === hpModalCombatant.id
          ? { ...c, currHp: newHp, tHp: newtHp, }
          : c
      ).sort((a, b) => b.initiative - a.initiative);
      setCombatants(updatedCombatants);
    }}
    onRemoveCondition={(condition) => {
      const updated = hpModalCombatant.conditions.filter(c => c !== condition);
      updateCombatant(hpModalCombatant.id, 'conditions', updated);
    }}
    onAddCondition={(newCondition) => {
      const updated = [...hpModalCombatant.conditions, newCondition];
      updateCombatant(hpModalCombatant.id, 'conditions', updated);
    }}
    onUpdateBoth={(newHp, newtHp, newConditions) => {
      const updatedCombatants = combatants.map(c =>
        c.id === hpModalCombatant.id
          ? { ...c, currHp: newHp, tHp: newtHp, conditions: newConditions }
          : c
      ).sort((a, b) => b.initiative - a.initiative);
      setCombatants(updatedCombatants);
      setHpModalCombatant(null); // Close modal here after update
    }}
    onUpdateDeathSaves={(saves) => {
      console.log('BattleTracker onUpdateDeathSaves called with:', saves);
      console.log('Updating combatant:', hpModalCombatant.name);
      const updated = combatants.map(c =>
        c.id === hpModalCombatant.id ? { ...c, deathsaves: saves } : c
      ).sort((a, b) => b.initiative - a.initiative);
      console.log('Updated combatants:', updated);
      setCombatants(updated);
      setHpModalCombatant({ ...hpModalCombatant, deathsaves: saves });
    }}
    onClose={() => {
      const currentCombatant = sortedCombatants[currentTurnIndex];
      if (currentCombatant.id === hpModalCombatant.id && currentCombatant.conditions.includes('Death Saves')
      ) {handleNextTurn()}
      setHpModalCombatant(null)}}
    handleNextTurn={handleNextTurn}
    updateCombatant={updateCombatant}
  />
)}
    </div>

  );
  
};

export default BattleTracker;
