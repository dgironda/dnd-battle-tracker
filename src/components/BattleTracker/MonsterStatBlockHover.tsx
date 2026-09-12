import { useState, useCallback, useEffect } from 'react';
import { useStatPanel } from './useStatPanel';
import { Monster, Combatant } from '../../types/index';
import { EditableCell } from "../../utils/Utils";
import { useCombat } from './CombatContext';
import { conditionDescriptionsTwentyFourteen, conditionDescriptionsTwentyTwentyFour } from '../../constants/Conditions';
import ConditionMark from './ConditionMark';
import { useGlobalContext } from '../../hooks/optionsContext';
import { useConditionTip } from './useConditionTip';

interface MonsterStatBlockHoverProps {
  monster: Monster;
  currentHp?: number;
  children: React.ReactNode;
  updateCombatant: (
    combatantID: string,
    field: keyof Combatant,
    value: string | number | boolean | string[]
  ) => void;
}

export function MonsterStatBlockHover({ monster, currentHp, children, updateCombatant }: MonsterStatBlockHoverProps) {
  const { rootRef, isOpen, close, toggle, onMouseEnter, onMouseLeave } = useStatPanel();
  const [editingField, setEditingField] = useState<string | null>(null);
  // Combatants come from the shared combat context. This used to be a private
  // copy seeded from localStorage on mount, so the notes shown here drifted out
  // of step with the tracker.
  const { combatants } = useCombat();
  // The descriptions are on the chips themselves now, so the old click-to-
  // expand toggle (which appended ": <description>" after each name and made
  // the panel several times taller) is gone.
  const { showTip, hideTip, tipNode, tipId, tipName } = useConditionTip(
    `monster-${monster.id ?? monster.name}`,
  );

  const safe = <T,>(value: T | undefined | null, fallback: T): T =>
    value !== undefined && value !== null ? value : fallback;

  const safeStat = (value: number | undefined | null) => (typeof value === 'number' ? value : 10);

  const getModifier = (stat: number): string => {
    const mod = Math.floor((stat - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };
  const { settings } = useGlobalContext();
  const conditionDescriptions = settings.version === 'twentyFourteen' ? conditionDescriptionsTwentyFourteen : conditionDescriptionsTwentyTwentyFour;

  function closeStatsButton(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    close();
    /* The close button lives inside .statBlockTrigger, and the trigger draws
       the name's underline on :focus-within as well as on open. A mouse click
       leaves focus on the button, so without this the underline stayed drawn
       after the panel had shut. */
    e.currentTarget.blur();
  }

  // Was declared but never registered, so X didn't close monster stat blocks the
  // way it does hero ones. Driven through state rather than by writing inline
  // styles React then overwrites.
  const handleKeyPressx = useCallback((event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key.toLowerCase() === 'x' && !(event.ctrlKey || event.shiftKey || event.altKey || event.metaKey)) {
      close();
    }
  }, [close]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPressx);
    return () => document.removeEventListener('keydown', handleKeyPressx);
  }, [handleKeyPressx]);

  // Safe fields
  const name = safe(monster.name, 'Unknown Creature');
  const link = safe(monster.link, '');
  const ac = safe(monster.ac, 10);
  const baseHp = safe(currentHp ?? monster.currHp ?? monster.maxHp ?? 1, 1);
  const initiative = safe(monster.init, 0);
  const id = safe(monster.id, monster.name);

  const stats = {
    STR: safeStat(monster.str),
    DEX: safeStat(monster.dex),
    CON: safeStat(monster.con),
    INT: safeStat(monster.int),
    WIS: safeStat(monster.wis),
    CHA: safeStat(monster.cha),
  };

  const pp = safe(monster.pp, 10);

  return (
    <div
      ref={rootRef}
      className={`statBlockTrigger${isOpen ? " isOpen" : ""}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={toggle}
      style={{ left: '0px', opacity: 1 }}
    >
      {children}

      {/* The scroll: rolled up off to the left when shut, it slides out and
          then unrolls to the right. All of that is in CSS so the two phases
          can be timed against each other; this only says whether it is open. */}
      <div className={`statHover monsterStatHover${isOpen ? ' isOpen' : ''}`}>
        <button className='closeStats'
          onClick={closeStatsButton}>X
        </button>
        {/* Fixed width, so the text does not reflow line by line while the
            scroll is still unrolling. */}
        <div className='statHoverSheet'>
        <div className='monsterStatName'>
          <h3>
            {name}
          </h3>  
        </div>
          {link && (
            <div className='monsterStatLink'>
              <a href={link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                View Full Stat Block →
              </a>

            </div>
          )}
        <div className='monsterStatACHPInit'>
          <div>
            <span>Armor Class </span>
            <span>{ac}</span>
          </div>
          <div>
            <span>Hit Points </span>
            <span>{baseHp}</span>
          </div>
          <div>
            <span>Initiative </span>
            <span>{initiative >= 0 ? '+' : ''}{initiative}</span>
          </div>
        </div>

        <div className='monsterStatAbility'>
          {Object.entries(stats).map(([label, value]) => (
            <div key={label}>
              <div>{label}</div>
              <div>
                {value} ({getModifier(value)})
              </div>
            </div>
          ))}
        </div>

        <div className='monsterStatPP'>
          {/* <span style={{ fontWeight: 'bold' }}>Senses </span> */}
          <span>Passive Perception {pp}</span>
        </div>
        <div className='monsterStatConditions'>
          <span className='statConditionsLabel'>Conditions</span>
          {monster.conditions.length ? (
            monster.conditions.map((conditionName) => (
              <span
                key={conditionName}
                className='conditionName'
                tabIndex={0}
                onMouseEnter={(e) => showTip(e, conditionName, conditionDescriptions[conditionName])}
                onMouseLeave={hideTip}
                onFocus={(e) => showTip(e, conditionName, conditionDescriptions[conditionName])}
                onBlur={hideTip}
                aria-describedby={tipName === conditionName ? tipId : undefined}
              >
                <ConditionMark name={conditionName} />
              </span>
            ))
          ) : (
            <span className='noStatCondition'>none</span>
          )}
          {tipNode}
        </div>
        <div className={`${id}-notes`}>
          Notes: {combatants.filter(c => c.id === id).map(c => (
            <EditableCell
          key={`${id}-notes`}
          entity={c}
          field='notes'
          type='textarea'
          editingField={editingField}
          setEditingField={setEditingField}
          updateEntity={updateCombatant}
          >{c.notes ? (c.notes.length > 0 ? c.notes : `Enter ${c.name}'s notes here`) : `Enter ${c.name}'s notes here`}</EditableCell>
          ))}
          
        </div>
        </div>
      </div>
    </div>
  );
}
