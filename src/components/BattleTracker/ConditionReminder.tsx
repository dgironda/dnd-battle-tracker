import { useEffect } from 'react';
import { Combatant } from '../../types/index';
import { conditionDescriptionsTwentyFourteen, conditionDescriptionsTwentyTwentyFour } from '../../constants/Conditions';
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
      <div id="conditionReminderContent">
        <h2>{combatant.name}</h2><span>has the following conditions:</span>
        <div>
          {combatant.conditions.map((conditionName) => (
            <p
            key={conditionName}>
              <span className='bold'>{conditionName}</span>: {conditionDescriptions[conditionName]}
            </p>
          ))}
        </div>
        <sup>(this reminder can be turned off in Options)</sup>
      </div>
    </div>
  );
}
