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
  identity: 'hero' | 'monster';
  onSubmit: (newHp: number) => void;
  onRemoveCondition: (condition: string) => void;
  onAddCondition: (condition: string) => void;
  onUpdateBoth?: (newHp: number, newConditions: string[]) => void;
  onClose: () => void;
}

export function HpChangeModal({ combatantName, currentHp, maxHp, identity, conditions, onSubmit, onRemoveCondition, onAddCondition, onUpdateBoth, onClose }: HpChangeModalProps) {
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
    if (identity === 'hero' && !conditions.includes('Death Saves')) {
      updatedConditions.push('Death Saves');
    } else if (identity === 'monster' && !conditions.includes('Dead')) {
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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          minWidth: '400px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>
          {combatantName}
        </h3>
        
        <div style={{ 
          fontSize: '18px', 
          marginBottom: '1rem',
          color: '#666'
        }}>
          Current HP: <strong>{currentHp}</strong> / {maxHp}
        </div>
        
        <input
          type="number"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError('');
          }}
          onKeyDown={handleKeyPress}
          placeholder="Enter amount"
          autoFocus
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '16px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            marginBottom: '0.5rem'
          }}
        />
        
        {error && (
          <p style={{ color: '#dc3545', fontSize: '14px', margin: '0.5rem 0' }}>
            {error}
          </p>
        )}
        
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            onClick={handleDamage}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            Take Damage
          </button>
          <button
            onClick={handleHeal}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            Heal
          </button>
        </div>
        
        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: '0.5rem',
            padding: '0.5rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
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