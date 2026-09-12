import { useEffect } from 'react';
import { Combatant } from '../../types/index';
import { conditionDescriptionsTwentyFourteen, conditionDescriptionsTwentyTwentyFour } from '../../constants/Conditions';
import ConditionMark from './ConditionMark';
import { roundsHeld } from '../../utils/conditionRounds';
import { useCombat } from './CombatContext';
import { useGlobalContext } from '../../hooks/optionsContext';

interface ConditionReminderProps {
  combatant: Combatant; // <-- optional to avoid undefined crash (copied from hero stat hover)
  isOpen: boolean;
  onClose: () => void;
  timeout?: number;
}

export const ConditionReminder: React.FC<ConditionReminderProps> = ({
  combatant,
  isOpen,
  onClose,
  timeout = 10000
}) => {
  const { settings } = useGlobalContext();
  /* Up here with the other hooks, not beside the code that uses it: there is an
     early return below, and a hook after it runs on some renders and not
     others. */
  const { roundNumber } = useCombat();

  useEffect(() => {
        const overlay = document.getElementById("conditionReminderOverlay");
        if (overlay) {
            if (isOpen) {
                overlay.classList.add("open");
            } else {
                overlay.classList.remove("open");
            }
        }
    }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // Auto-dismiss after timeout
    const timer = setTimeout(() => {
      onClose();
    }, timeout);

    // Dismiss on key press
    const handleKeyPress = () => {
      setTimeout(() => onClose(), 0);
    };

    // Dismiss on mouse click
    const handleClick = () => {
      setTimeout(() => onClose(), 0);
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('click', handleClick);

    // Cleanup
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('click', handleClick);
    };
  }, [isOpen, onClose, timeout]);

  if (!isOpen) return null;

  const conditionDescriptions = settings.version === 'twentyFourteen' ? conditionDescriptionsTwentyFourteen : conditionDescriptionsTwentyTwentyFour;
  

  return (
    <div id='conditionReminderOverlay'>
      {/* The overlay is `pointer-events: none` so the page underneath stays
          usable while this is up, and a click anywhere dismisses it through
          the window listener above. The card itself has to take its own
          clicks back, though: without this a click ON the reminder fell
          straight through to whatever was behind it — usually a combatant's
          action checkbox — so the one place you would naturally click to get
          rid of it also ticked a box. */}
      <div
        id="conditionReminderContent"
        role="button"
        tabIndex={0}
        title="Dismiss"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClose(); }}
      >
        <h2>{combatant.name}</h2><span>has the following conditions:</span>
        <div>
          {combatant.conditions.map((conditionName) => (
            <p
            key={conditionName}>
              <span className='bold'><ConditionMark
                name={conditionName}
                withName
                rounds={roundsHeld(combatant, conditionName, roundNumber)}
              /></span>: {conditionDescriptions[conditionName]}
            </p>
          ))}
        </div>
        <sup>(this reminder can be turned off in Options)</sup>
      </div>
    </div>
  );
}
