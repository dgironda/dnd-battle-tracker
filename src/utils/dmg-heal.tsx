import { useState } from 'react';
import { Combatant } from '../types/index';
import { ConcentrationCheckModal } from './concentrationCheck';
import { useGlobalContext } from '../hooks/versionContext';

interface HpChangeModalProps {
  combatantId: string;
  combatantName: string;
  currentHp: number;
  maxHp: number;
  conditions: string[];
  type: 'hero' | 'monster';
  onSubmit: (newHp: number) => void;
  onRemoveCondition: (condition: string) => void;
  onAddCondition: (condition: string) => void;
  onUpdateBoth?: (newHp: number, newConditions: string[]) => void;
  onClose: () => void;
}

export function HpChangeModal({ combatantName, currentHp, maxHp, type, conditions, onSubmit, onRemoveCondition, onAddCondition, onUpdateBoth, onClose }: HpChangeModalProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [showConcentrationCheck, setShowConcentrationCheck] = useState(false);
  const [concentrationDC, setConcentrationDC] = useState(10);
  const { status } = useGlobalContext();
  // const [condition, setConditions] = useState<string[]>(conditions)
  const isConcentrating = conditions.includes('Concentrating');
  const isDying = conditions.includes('Death Saves')
  

  const handleDamage = () => {
  const damageAmount = parseInt(amount);
  if (isNaN(damageAmount) || amount.trim() === '') {
    setError('Please enter a valid number');
    return;
  }
  
  
  if (isConcentrating && damageAmount > 0) {
    const damageToConcentration = Math.floor(damageAmount / 2);
    // const conditionDescriptions = status === 'twentyFourteen' ? conditionDescriptionsTwentyFourteen : conditionDescriptionsTwentyTwentyFour;
    const dc = status === 'twentyFourteen' ? Math.max(10, damageToConcentration) : Math.min(Math.max(10, damageToConcentration), 30);
    
    setConcentrationDC(dc);
    setShowConcentrationCheck(true);
    
    return;
  }
  
  // Apply damage normally if not concentrating
  const newHp = Math.max(0, currentHp - damageAmount);
  let updatedConditions = [...conditions];
  
  // Auto-add death condition
  if (newHp <= 0) {
    if (type === 'hero' && !conditions.includes('Death Saves')) {
      updatedConditions.push('Death Saves');
    } else if (type === 'monster' && !conditions.includes('Dead')) {
      updatedConditions.push('Dead');
    }
  }
  
  // If conditions changed, use onUpdateBoth
  if (updatedConditions.length !== conditions.length && onUpdateBoth) {
    onUpdateBoth(newHp, updatedConditions);
    setShowConcentrationCheck(false);
    return; // Don't call onSubmit separately
  }
  
  // Otherwise just update HP
  onSubmit(newHp);
  onClose();
};

const handleConcentrationPass = () => {
  // They passed - apply damage and keep concentrating
  const damageAmount = parseInt(amount);
  const newHp = Math.max(0, currentHp - damageAmount);
  onSubmit(newHp);
  setShowConcentrationCheck(false);
  onClose();
};

const handleConcentrationFail = () => {
  // They failed - apply damage and remove concentrating
  const damageAmount = parseInt(amount);
  const newHp = Math.max(0, currentHp - damageAmount);
  const newConditions = conditions.filter(c => c !== 'Concentrating');
  setShowConcentrationCheck(false);
  if (onUpdateBoth) {
    onUpdateBoth(newHp, newConditions);
  }
  
};

  const handleHeal = () => {
    const healAmount = parseInt(amount);
    if (isNaN(healAmount) || amount.trim() === '') {
      setError('Please enter a valid number');
      return;
    }
    if (healAmount < 0) {
      setError('Healing must be positive');
      return;
    }
    if (isDying) {alert(`${combatantName} is now stable and no longer needs to make death saving throws`)}
    const newHp = Math.min(maxHp, currentHp + healAmount);
    onSubmit(newHp);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDamage(); // Default to damage on Enter
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className='hpChangeModalOuter'
      onClick={onClose}
    >
      <div 
        className='hpChangeModalInner'
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>
          {combatantName}
        </h3>
        
        <div className='hpChangeModalCurrent'>
          Current HP: {currentHp} / {maxHp}
        </div>
        
        <input
          className='hpChangeModalInput'
          type="number"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError('');
          }}
          onKeyDown={handleKeyPress}
          placeholder="Enter amount"
          autoFocus
          
        />
        
        {error && (
          <p style={{ color: '#dc3545', fontSize: '14px', margin: '0.5rem 0' }}>
            {error}
          </p>
        )}
        
        <div className='hpChangeModalButtonBox'>
          <button
            onClick={handleDamage}
            className='hpChangeModalDmgButton'
          >
            Take Damage
          </button>
          <button
            onClick={handleHeal}
            className='hpChangeModalHealButton'
          >
            Heal
          </button>
        </div>
        
        <button
          className='hpChangeModalCancelButton'
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
      {showConcentrationCheck && (
  <ConcentrationCheckModal
    combatantName={combatantName}
    dc={concentrationDC}
    onPass={handleConcentrationPass}
    onFail={handleConcentrationFail}
  />
)}
    </div>
  );
}