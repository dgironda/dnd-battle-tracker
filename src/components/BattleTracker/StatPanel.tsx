import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useStatPanel } from './useStatPanel';
import type { Combatant } from '../../types/index';
import { EditableCell } from '../../utils/Utils';
import { useCombat } from './CombatContext';
import { conditionDescriptionsTwentyFourteen, conditionDescriptionsTwentyTwentyFour } from '../../constants/Conditions';
import ConditionMark from './ConditionMark';
import { roundsHeld } from '../../utils/conditionRounds';
import { useGlobalContext } from '../../hooks/optionsContext';
import { useConditionTip } from './useConditionTip';
import { isShortcut } from '../../utils/shortcuts';

/**
 * What the hero and monster side-car stat panels have in common.
 *
 * The two panels were written as copies of each other — the scroll, its close
 * button and the X shortcut, the conditions line with its tooltips, the notes
 * — and had started to drift (X closed monster panels whether or not Caps Lock
 * was on, hero panels only when it was off). Each panel now prints only its
 * own stats between these; statValues.ts has the arithmetic they share.
 */

/**
 * The name that opens the panel, and the scroll itself.
 *
 * The scroll is rolled up off to the left when shut; it slides out and then
 * unrolls to the right. All of that is in CSS so the two phases can be timed
 * against each other; this only says whether it is open.
 */
export function StatPanel({
  kind,
  trigger,
  children,
}: {
  kind: 'hero' | 'monster';
  /** What is clicked or hovered to open it: the combatant's name. */
  trigger: ReactNode;
  children: ReactNode;
}) {
  const { rootRef, isOpen, close, toggle, onMouseEnter, onMouseLeave } = useStatPanel();

  /* X closes it, unless somebody is typing. Driven through state: an older
     version wrote inline styles onto the panel, which React overwrote on the
     next render. */
  const closeOnX = useCallback((event: KeyboardEvent) => {
    if (isShortcut(event) && event.key.toLowerCase() === 'x') close();
  }, [close]);

  useEffect(() => {
    document.addEventListener('keydown', closeOnX);
    return () => document.removeEventListener('keydown', closeOnX);
  }, [closeOnX]);

  function closeStatsButton(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    close();
    /* The close button lives inside .statBlockTrigger, and the trigger draws
       the name's underline on :focus-within as well as on open. A mouse click
       leaves focus on the button, so without this the underline stayed drawn
       after the panel had shut. */
    e.currentTarget.blur();
  }

  return (
    <div
      ref={rootRef}
      className={`statBlockTrigger${isOpen ? ' isOpen' : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={toggle}
      style={{ left: '0px', opacity: 1 }}
    >
      {trigger}

      <div className={`statHover ${kind}StatHover${isOpen ? ' isOpen' : ''}`}>
        <button className='closeStats' onClick={closeStatsButton}>
          X
        </button>
        {/* Fixed width, so the text does not reflow line by line while the
            scroll is still unrolling. */}
        <div className='statHoverSheet'>{children}</div>
      </div>
    </div>
  );
}

/**
 * The conditions line: a drawn mark per condition, its description on hover
 * or focus, and how many rounds it has been held.
 *
 * `holder` is the combatant in the fight the rounds are counted on — for a
 * monster that is not the roster entry the panel is handed.
 */
export function StatConditions({
  className,
  conditions,
  holder,
  tipKey,
}: {
  className: string;
  conditions: string[];
  holder: Combatant | undefined;
  tipKey: string;
}) {
  const { showTip, hideTip, tipNode, tipId, tipName } = useConditionTip(tipKey);
  const { roundNumber } = useCombat();
  const { settings } = useGlobalContext();
  const descriptions =
    settings.version === 'twentyFourteen' ? conditionDescriptionsTwentyFourteen : conditionDescriptionsTwentyTwentyFour;
  const held = (name: string) => (holder ? roundsHeld(holder, name, roundNumber) : null);

  return (
    <div className={className}>
      <span className='statConditionsLabel'>Conditions</span>
      {conditions.length ? (
        conditions.map((conditionName) => (
          <span
            key={conditionName}
            className='conditionName'
            tabIndex={0}
            onMouseEnter={(e) => showTip(e, conditionName, descriptions[conditionName], held(conditionName))}
            onMouseLeave={hideTip}
            onFocus={(e) => showTip(e, conditionName, descriptions[conditionName], held(conditionName))}
            onBlur={hideTip}
            aria-describedby={tipName === conditionName ? tipId : undefined}
          >
            <ConditionMark name={conditionName} rounds={held(conditionName)} />
          </span>
        ))
      ) : (
        <span className='noStatCondition'>none</span>
      )}
      {tipNode}
    </div>
  );
}

/** Notes, editable in place. */
export function StatNotes<T extends { id: string; name: string; notes?: string }>({
  id,
  entries,
  updateEntity,
}: {
  id: string;
  /** The live copy to edit: the roster hero, or the combatant in the fight. */
  entries: T[];
  updateEntity: (entityId: string, field: keyof T, value: string | number) => void;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);
  return (
    <div className={`${id}-notes`}>
      Notes:{' '}
      {entries.map((entry) => (
        <EditableCell
          key={`${id}-notes`}
          entity={entry}
          field='notes'
          type='textarea'
          editingField={editingField}
          setEditingField={setEditingField}
          updateEntity={updateEntity}
        >
          {entry.notes || `Enter ${entry.name}'s notes here`}
        </EditableCell>
      ))}
    </div>
  );
}
