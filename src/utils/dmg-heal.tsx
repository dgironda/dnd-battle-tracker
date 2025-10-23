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
  deathsaves: boolean[];
  currentCombatantID: string;
  onSubmit: (newHp: number) => void;
  onRemoveCondition: (condition: string) => void;
  onAddCondition: (condition: string) => void;
  onUpdateBoth: (newHp: number, newConditions: string[]) => void;
  onUpdateDeathSaves: (saves: boolean[]) => void;
  onClose: () => void;
  handleNextTurn: () => void;
}

export function HpChangeModal({ combatantId, currentCombatantID, combatantName, currentHp, maxHp, type, conditions, deathsaves, onSubmit, onRemoveCondition, onAddCondition, onUpdateBoth, onUpdateDeathSaves, onClose, handleNextTurn }: HpChangeModalProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [showConcentrationCheck, setShowConcentrationCheck] = useState(false);
  const [concentrationDC, setConcentrationDC] = useState(10);
  const { status } = useGlobalContext();
  // const [condition, setConditions] = useState<string[]>(conditions)
  const isConcentrating = conditions.includes('Concentrating');
  const isDying = conditions.includes('Death Saves')
  // const successes = deathsaves.filter(s => s === true).length;
  // const failures = deathsaves.filter(s => s === false).length;
  
  const addDeathSaveSuccess = () => {
    console.log('Adding death save success');
    console.log('Current deathSaves:', deathsaves);
    if (!onUpdateDeathSaves) {
            console.log('onUpdateDeathSaves is not defined!');
            return;
    }
    const newSaves = [...deathsaves, true];
    console.log('New deathSaves:', newSaves);
    if (combatantId === currentCombatantID) {handleNextTurn}
    onUpdateDeathSaves(newSaves);
    
    // If 3 successes, stabilize
    if (newSaves.filter(s => s === true).length >= 3) {
      onRemoveCondition('Death Saves');
      alert(`${combatantName} is stabilized!`);
      const resetSaves: boolean[] = [];
      onUpdateDeathSaves(resetSaves);
      onClose();
    }
  };

  const addDeathSaveFailure = () => {
    console.log('Adding death save failure');
    console.log('Current deathSaves:', deathsaves);
    if (!onUpdateDeathSaves) {
      console.log('onUpdateDeathSaves is not defined!');
      return;
    }
    const newSaves = [...deathsaves, false];
    console.log('New deathSaves:', newSaves);
    if (combatantId === currentCombatantID) {handleNextTurn}
    onUpdateDeathSaves(newSaves);
    
    // If 3 failures, dead
    if (newSaves.filter(s => s === false).length >= 3) {
      onRemoveCondition('Death Saves');
      onAddCondition('Dead');
      alert(`${combatantName} has died!`);
      const resetSaves: boolean[] = [];
      onUpdateDeathSaves(resetSaves);
      onClose();
    }
  };
  

  const handleDamage = () => {
  const damageAmount = parseInt(amount);
  if (isNaN(damageAmount) || amount.trim() === '') {
    setError('Please enter a valid number');
    return;
  }
  if (currentHp === 0 && isDying) {
      if (!onUpdateDeathSaves) return;
      
      const newSaves = [...deathsaves, false, false]; // Add 2 failures
      onUpdateDeathSaves(newSaves);
      
      const newFailures = newSaves.filter(s => s === false).length;
      if (newFailures >= 3) {
        onRemoveCondition('Death Saves');
        onAddCondition('Dead');
        alert(`${combatantName} has died.`);
      } 
      onClose();
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
       if (onUpdateDeathSaves) {
          onUpdateDeathSaves([]); // Initialize empty death saves array
        }
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
    const newHp = Math.min(maxHp, currentHp + healAmount);
    if (isNaN(healAmount) || amount.trim() === '') {
      setError('Please enter a valid number');
      return;
    }
    if (healAmount < 0) {
      setError('Healing must be positive');
      return;
    }
    if (isDying) {
      alert(`${combatantName} is now stable and no longer needs to make death saving throws`);
      const newConditions = conditions.filter(c => c !== 'Death Saves');
      const resetSaves: boolean[] = [];
      onUpdateDeathSaves(resetSaves);
      onUpdateBoth(newHp, newConditions);
     } else {onSubmit(newHp);}
    
    
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
        <h3>
          {combatantName}
        </h3>
        {/* new addition */}

        {/* Death Saves section */}
        {isDying && (
          <div className='deathSavesBox'>
            <h2 style={{ textAlign: 'center' }}>Death Saving Throws</h2>
            
            <div style={{ 
              marginBottom: '1rem',
              padding: '0.5rem',
              backgroundColor: 'white',
              borderRadius: '4px',
              minHeight: '40px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {deathsaves.length === 0 ? (
                <span style={{ margin: 'auto', color: '#999', fontSize: '14px' }}>No saves yet</span>
              ) : (
                deathsaves.map((save, index) => (
                  <span
                    key={index}
                    style={{
                      fontSize: '24px',
                      color: save ? '#28a745' : '#dc3545',
                      fontWeight: 'bold'
                    }}
                    title={save ? 'Success' : 'Failure'}
                  >
                    {save ? '✅' : '❌'}
                  </span>
                ))
              )}
            </div>
            <div className='deathSavesButtons'>
            <div>
              <button
                onClick={(e) => {
                  e.stopPropagation(); 
                  addDeathSaveSuccess();
                }}
                className='hpChangeModalHealButton'
              >
                Success
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation(); 
                  addDeathSaveFailure();
                }}
                className='hpChangeModalDmgButton'
              >
                Failure
              </button>
            </div></div>
          </div>
        )}

        {/* hp, dmg, heal */}
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
          Close
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