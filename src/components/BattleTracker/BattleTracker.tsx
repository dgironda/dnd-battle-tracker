import { DEVMODE } from "../../utils/devmode";
import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { getHeroes, storeHeroes, getMonsters, storeMonsters, getCombatants, storeCombatants } from "../../utils/LocalStorage";
import { useGlobalContext } from "../../hooks/versionContext";
import { createDeleteMonster } from "../Utils";
import RoundNumberSpan from "./RoundNumber";
import { HeroStatBlockHover } from "./HeroStatBlockHover";
import { MonsterStatBlockHover } from "./MonsterStatBlockHover";

interface BattleTrackerProps {
  setShowHeroManager: (show: boolean) => void;
  setShowMonsterManager: (show: boolean) => void;
}

type CombatantFieldValue = string | number | boolean | string[];

const numericFields: (keyof Combatant)[] = [
  'hp','currHp','maxHp','ac','str','dex','con','int','wis','cha','pp','init','tHp'
];

const BattleTracker: React.FC<BattleTrackerProps> = ({ setShowHeroManager, setShowMonsterManager }) => {
  const { heroes } = useHeroes();
  const { monsters, setMonsters } = useMonsters();
  const deleteMonster = createDeleteMonster(monsters, setMonsters);
  const { combatants, setCombatants, currentTurnIndex, setCurrentTurnIndex, roundNumber, setRoundNumber } = useCombat();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingConditions, setEditingConditions] = useState<string | null>(null);
  const [hasSavedCombat, setHasSavedCombat] = useState(false);
  const [currentCombatant, setCurrentCombatant] = useState<Hero | Monster | null>(null);
  const [initiativeResolver, setInitiativeResolver] = useState<((init: number) => void) | null>(null);
  const [hpModalCombatant, setHpModalCombatant] = useState<Combatant | null>(null);
  const { status } = useGlobalContext();
  const processedTurnRef = useRef(-1);

  const totalTurns = useMemo(
    () => currentTurnIndex + ((roundNumber - 1) * combatants.length),
    [currentTurnIndex, roundNumber, combatants.length]
  );

  const sortedCombatants = [...combatants].sort((a, b) => b.initiative - a.initiative);

  useEffect(() => {
    const saved = getCombatants();
    setHasSavedCombat(saved && saved.length > 0);
  }, [combatants]);

  const updateCombatant = (combatantId: string, field: keyof Combatant, value: CombatantFieldValue) => {
    const updatedCombatants = combatants
      .map(c =>
        c.id === combatantId
          ? {
              ...c,
              [field]: numericFields.includes(field) && typeof value !== 'number' ? Number(value) : value
            }
          : c
      )
      .sort((a, b) => b.initiative - a.initiative);

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
    const start = { r: 0xf8, g: 0xf2, b: 0xeb };
    const end = { r: 0x88, g: 0x08, b: 0x08 };
    const r = Math.round(end.r + (start.r - end.r) * percentage);
    const g = Math.round(end.g + (start.g - end.g) * percentage);
    const b = Math.round(end.b + (start.b - end.b) * percentage);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  };

  // --- Conditions Editor ---
  const ConditionsEditor = ({ combatant }: { combatant: Combatant }) => {
    const isEditing = editingConditions === combatant.id;

    if (isEditing) {
      return (
        <div className="conditionEditOuter">
          <div>
            {combatant.conditions.map(conditionName => (
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
            {predefinedConditions.filter(c => !combatant.conditions.includes(c)).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button onClick={() => setEditingConditions(null)} className="editConditionsDone">Done</button>
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
          ? combatant.conditions.map(c => (
              <span key={c} className="conditionName" title={conditionDescriptions[c] || c}>{c}</span>
            ))
          : <span className="noCondition">Click to add conditions</span>
        }
      </span>
    );
  };

  // --- The rest of BattleTracker UI and logic remain the same ---
  // All usages of updateCombatant now accept string[] for 'conditions'
  // EditableCell handles numbers safely, so no more TS errors

  return (
    <div id="battleTrackerOuter">
      {/* ...rest of your BattleTracker JSX remains the same */}
    </div>
  );
};

export default BattleTracker;
