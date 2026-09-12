import { useState, useEffect, useCallback } from 'react';
import { useStatPanel } from './useStatPanel';
import { Hero, Combatant } from '../../types/index';
import { createUpdateHero, EditableCell } from "../../utils/Utils";
import { useHeroes } from "../../hooks/useHeroes";
import { conditionDescriptionsTwentyFourteen, conditionDescriptionsTwentyTwentyFour } from '../../constants/Conditions';
import ConditionMark from './ConditionMark';
import { roundsHeld } from '../../utils/conditionRounds';
import { useCombat } from './CombatContext';
import { useGlobalContext } from '../../hooks/optionsContext';
import { useConditionTip } from './useConditionTip';


interface HeroStatBlockHoverProps {
  hero?: Hero; // <-- optional to avoid undefined crash
  children: React.ReactNode;
  combatant?: Combatant;
}

export function HeroStatBlockHover({ hero, children, combatant }: HeroStatBlockHoverProps) {
  const { rootRef, isOpen, close, toggle, onMouseEnter, onMouseLeave } = useStatPanel();
  const [editingField, setEditingField] = useState<string | null>(null);
  // Shared roster. This component renders once per hero row, so the old
  // private useState + storeHeroes effect meant N copies of the whole list all
  // writing to localStorage on mount.
  const { heroes, setHeroes } = useHeroes();
  const updateHero = createUpdateHero(setHeroes);
  // The descriptions are on the chips themselves now, so the old click-to-
  // expand toggle (which appended ": <description>" after each name and made
  // the panel several times taller) is gone.
  const { showTip, hideTip, tipNode, tipId, tipName } = useConditionTip(
    `hero-${combatant?.id ?? hero?.id ?? 'x'}`,
  );

  const safe = <T,>(value: T | undefined | null, fallback: T): T =>
    value !== undefined && value !== null ? value : fallback;

  const getModifier = (stat: number): string => {
    const mod = Math.floor((stat - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };
  const { settings } = useGlobalContext();
  /* For how long each condition has been held — the round is the other half
     of that sum. */
  const { roundNumber } = useCombat();
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

  const handleKeyPressx = useCallback((event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key === 'x' && !(event.ctrlKey || event.shiftKey || event.altKey || event.metaKey)) {
      // Drive this through state. The old version wrote inline styles onto
      // every .statHover node, which React overwrote on the next render.
      close();
    }
  }, [close]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPressx);
    return () => {
      document.removeEventListener('keydown', handleKeyPressx);
    };
  }, [handleKeyPressx]);

  // SAFE FIELDS
  const name = safe(hero?.name, "Unknown Hero");
  const player = safe(hero?.player, "Unknown Player");
  const ac = safe(hero?.ac, 0);
  const init = safe(hero?.init, 0);
  const stats = {
    STR: safe(hero?.str, 10),
    DEX: safe(hero?.dex, 10),
    CON: safe(hero?.con, 10),
    INT: safe(hero?.int, 10),
    WIS: safe(hero?.wis, 10),
    CHA: safe(hero?.cha, 10),
  };
  const pp = safe(hero?.pp, 10);
  const id = safe(hero?.id, hero?.name);

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

      {/* Slide-in stat block */}
      {/* The scroll: rolled up off to the left when shut, it slides out and
          then unrolls to the right. All of that is in CSS so the two phases
          can be timed against each other; this only says whether it is open. */}
      <div className={`statHover heroStatHover${isOpen ? ' isOpen' : ''}`}>
        {/* Header */}
        <button className='closeStats'
          onClick={closeStatsButton}>X
        </button>
        {/* Fixed width, so the text does not reflow line by line while the
            scroll is still unrolling. */}
        <div className='statHoverSheet'>
        <div className='heroStatHeader'>
          <h3 className='heroStatHeaderName'>
            {name}
          </h3>
          <div className='heroStatHeaderPlayer'>
            Player: {player}
          </div>
        </div>

        {/* Top Stats */}
        <div className='heroStatACInit'>
          <div>
            <div>AC</div>
            <div>{ac}</div>
          </div>
          <div>
            <div>Initiative</div>
            <div>{init >= 0 ? '+' : ''}{init}</div>
          </div>
        </div>

        {/* Ability Scores */}
        <div className='heroStatAbility'>
          {Object.entries(stats).map(([label, value]) => (
            <div key={label}>
              <div>{label}</div>
              <div>{value}</div>
              <div>{getModifier(value)}</div>
            </div>
          ))}
        </div>

        {/* Bottom Info */}
        <div className='heroStatPP'>
          <span>Passive Perception</span>
          <span>{pp}</span>
        </div>
        <div className='heroStatConditions'>
          <span className='statConditionsLabel'>Conditions</span>
          {combatant?.conditions.length ? (
            combatant.conditions.map((conditionName) => (
              <span
                key={conditionName}
                className='conditionName'
                tabIndex={0}
                onMouseEnter={(e) => showTip(e, conditionName, conditionDescriptions[conditionName], combatant ? roundsHeld(combatant, conditionName, roundNumber) : null)}
                onMouseLeave={hideTip}
                onFocus={(e) => showTip(e, conditionName, conditionDescriptions[conditionName], combatant ? roundsHeld(combatant, conditionName, roundNumber) : null)}
                onBlur={hideTip}
                aria-describedby={tipName === conditionName ? tipId : undefined}
              >
                <ConditionMark
                  name={conditionName}
                  rounds={combatant ? roundsHeld(combatant, conditionName, roundNumber) : null}
                />
              </span>
            ))
          ) : (
            <span className='noStatCondition'>none</span>
          )}
          {tipNode}
      </div>
      <div className={`${id}-notes`}>
          Notes: {heroes.filter(h => h.id === id).map(h => (
            <EditableCell
          key={`${id}-notes`}
          entity={h}
          field='notes'
          type='textarea'
          editingField={editingField}
          setEditingField={setEditingField}
          updateEntity={updateHero}
          >{h.notes ? (h.notes.length > 0 ? h.notes : `Enter ${h.name}'s notes here`) : `Enter ${h.name}'s notes here`}</EditableCell>
          ))}
          
        </div>
    </div>
    </div>
  </div>
  );
}
