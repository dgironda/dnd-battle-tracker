import React from 'react';
import Icon from './Icon';

interface ActionEconomyProps {
  action: boolean;
  bonus: boolean;
  move: boolean;
  reaction: boolean;
  onToggleAction: () => void;
  onToggleBonus: () => void;
  onToggleMove: () => void;
  onToggleReaction: () => void;
  disabled?: boolean;
}

/**
 * Action Economy component with SVG icons
 * Displays action, bonus, movement, and reaction with visual icons
 * 
 * Usage:
 * <ActionEconomy 
 *   action={combatant.action}
 *   bonus={combatant.bonus}
 *   move={combatant.move}
 *   reaction={combatant.reaction}
 *   onToggleAction={() => toggle('action')}
 *   onToggleBonus={() => toggle('bonus')}
 *   onToggleMove={() => toggle('move')}
 *   onToggleReaction={() => toggle('reaction')}
 * />
 */
const ActionEconomy: React.FC<ActionEconomyProps> = ({
  action,
  bonus,
  move,
  reaction,
  onToggleAction,
  onToggleBonus,
  onToggleMove,
  onToggleReaction,
  disabled = false
}) => {
  return (
    <div className="action-economy">
      {/* Action */}
      <div 
        className={`action-item ${action ? 'used' : 'available'} ${disabled ? 'disabled' : ''}`}
        onClick={!disabled ? onToggleAction : undefined}
        title="Action (A)"
      >
        <Icon name="action" size={24} />
        <span className="action-label">A</span>
      </div>
      
      {/* Bonus Action */}
      <div 
        className={`action-item ${bonus ? 'used' : 'available'} ${disabled ? 'disabled' : ''}`}
        onClick={!disabled ? onToggleBonus : undefined}
        title="Bonus Action (S)"
      >
        <Icon name="bonus" size={24} />
        <span className="action-label">B</span>
      </div>
      
      {/* Movement */}
      <div 
        className={`action-item ${move ? 'used' : 'available'} ${disabled ? 'disabled' : ''}`}
        onClick={!disabled ? onToggleMove : undefined}
        title="Movement (D)"
      >
        <Icon name="movement" size={24} />
        <span className="action-label">M</span>
      </div>
      
      {/* Reaction */}
      <div 
        className={`action-item ${reaction ? 'used' : 'available'} ${disabled ? 'disabled' : ''}`}
        onClick={!disabled ? onToggleReaction : undefined}
        title="Reaction"
      >
        <Icon name="reaction" size={24} />
        <span className="action-label">R</span>
      </div>
    </div>
  );
};

export default ActionEconomy;
