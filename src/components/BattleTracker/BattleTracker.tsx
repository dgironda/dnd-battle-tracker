import React, { useState } from "react";
import HeroManager from "../HeroManager/HeroManager";
import { Hero } from "../../types/Hero";
import { Combatant } from "../../types/Combatant";
import { startBattle } from "../../utils/battleUtils";
import { predefinedConditions, conditionDescriptions } from "../../constants/Conditions";
import { EditableCell } from "../../utils/editableCell";
import { useHeroes } from "../../hooks/useHeroes";
import { InitiativeDialog } from "./InitiativeDialog";


const BattleTracker: React.FC = () => {
  const { heroes, setHeroes } = useHeroes();
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  // const [showHeroManager, setShowHeroManager] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingConditions, setEditingConditions] = useState<string | null>(null);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [currentHero, setCurrentHero] = useState<Hero | null>(null);
  const [initiativeResolver, setInitiativeResolver] = useState<((init: number) => void) | null>(null);

  const sortedCombatants = [...combatants].sort((a, b) => b.initiative - a.initiative);

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

  const handleStartBattle = async () => {
    const presentHeroes = heroes.filter(h => h.present);
    const newCombatants: Combatant[] = [];
    
    for (const hero of presentHeroes) {
      // Show dialog and wait for initiative
      const initiative = await new Promise<number>((resolve) => {
        setCurrentHero(hero);
        setInitiativeResolver(() => resolve);
      });
      
      newCombatants.push({
        id: hero.id,
        name: hero.name,
        currHp: hero.hp,
        maxHp: hero.hp,
        initiative,
        action: false,
        bonus: false,
        move: false,
        reaction: false,
        conditions: []
      });
  }
  
  setCurrentHero(null);
  setCombatants(newCombatants);
  setCurrentTurnIndex(0);
};

  const handleNextTurn = () => {
    if (sortedCombatants.length > 0) {
      setCurrentTurnIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % sortedCombatants.length;
        
        // If we've cycled back to the first combatant, reset all action states
        if (nextIndex === 0) {
          const resetCombatants = sortedCombatants.map(combatant => ({
            ...combatant,
            action: false,
            bonus: false,
            move: false,
            reaction: false
          }));
          setCombatants(resetCombatants);
        }
        
        return nextIndex;
      });
    }
  };

  const EditableHp = ({ combatant }: { combatant: Combatant }) => {
    return (
      <span>
        <EditableCell
          entity={combatant}
          field="currHp"
          type="number"
          editingField={editingField}
          setEditingField={setEditingField}
          updateEntity={updateCombatant}
        />
        /{combatant.maxHp}
      </span>
    );
  };

  const ConditionsEditor = ({ combatant }: { combatant: Combatant }) => {
    const isEditing = editingConditions === combatant.id;

    if (isEditing) {
      return (
        <div style={{ minWidth: '200px' }}>
          {/* Current conditions with remove buttons */}
          <div style={{ marginBottom: '8px' }}>
            {combatant.conditions.map((conditionName) => (
              <span
                key={conditionName}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  marginRight: '4px',
                  marginBottom: '2px',
                  cursor: 'pointer'
                }}
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
            style={{ width: '100%', padding: '2px', marginBottom: '4px' }}
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
            style={{ 
              padding: '2px 6px', 
              fontSize: '11px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      );
    }

    return (
      <span 
        onClick={() => setEditingConditions(combatant.id)}
        style={{ cursor: 'pointer', padding: '2px 4px', borderRadius: '2px', minHeight: '20px', display: 'inline-block' }}
        title="Click to edit conditions"
      >
        {combatant.conditions.length > 0 
          ? combatant.conditions.map((conditionName) => (
              <span
                key={conditionName}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  padding: '1px 4px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  marginRight: '2px'
                }}
                title={conditionDescriptions[conditionName] || conditionName}
              >
                {conditionName}
              </span>
            ))
          : <span style={{ color: '#6c757d', fontSize: '12px' }}>None</span>
        }
      </span>
    );
  };

  return (
    <div style={{ padding: "2rem" }}>
      
      <div>
        <button id="buttonStartBattle" onClick={handleStartBattle}>
          Start Battle
        </button>
        <button id="buttonNextTurn" onClick={handleNextTurn} disabled={combatants.length === 0}>
          Next Turn
        </button>
      </div>

      {/* Battle Table */}
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Name</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Initiative</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>HP</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Action</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Bonus</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Move</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Reaction</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Conditions</th>
          </tr>
        </thead>
        <tbody>
          {sortedCombatants.map((combatant, index) => (
            <tr 
              key={combatant.id}
              style={{ 
                backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa',
                borderLeft: index === currentTurnIndex ? '4px solid #28a745' : 'none'
              }}
            >
              <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: index === currentTurnIndex ? 'bold' : 'normal' }}>
                {combatant.name}
                {index === currentTurnIndex && <span style={{ color: '#28a745', marginLeft: '8px' }}>← Current Turn</span>}
              </td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
                {combatant.initiative}
              </td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                <EditableHp combatant={combatant} />
              </td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={combatant.action}
                  onChange={(e) => updateCombatant(combatant.id, 'action', e.target.checked)}
                />
              </td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={combatant.bonus}
                  onChange={(e) => updateCombatant(combatant.id, 'bonus', e.target.checked)}
                />
              </td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={combatant.move}
                  onChange={(e) => updateCombatant(combatant.id, 'move', e.target.checked)}
                />
              </td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={combatant.reaction}
                  onChange={(e) => updateCombatant(combatant.id, 'reaction', e.target.checked)}
                />
              </td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                <ConditionsEditor combatant={combatant} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {sortedCombatants.length === 0 && (
        <p style={{ textAlign: 'center', color: '#6c757d', fontStyle: 'italic', marginTop: '2rem' }}>
          No combatants in battle. Start a battle to see combatants here.
        </p>
      )}
      {currentHero && initiativeResolver && (
        <InitiativeDialog 
          heroName={currentHero.name}
          onSubmit={(init) => {
            initiativeResolver(init);
            setCurrentHero(null);
            setInitiativeResolver(null);
          }}
        />
      )}
    </div>
  );
};

export default BattleTracker;