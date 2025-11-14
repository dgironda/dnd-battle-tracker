import { useState } from 'react';
import { Combatant } from '../types/index';
import { EditableCell } from '../components/Utils';
import { ConcentrationCheckModal } from './concentrationCheck';
import { useGlobalContext } from '../hooks/versionContext';

interface HpChangeModalProps {
  combatant: Combatant;
  combatantId: string;
  combatantName: string;
  currentHp: number;
  maxHp: number;
  tHp: number;
  conditions: string[];
  type: 'hero' | 'monster';
  deathsaves: boolean[];
  currentCombatantID: string;
  onSubmit: (newHp: number, newtHp: number) => void;
  onRemoveCondition: (condition: string) => void;
  onAddCondition: (condition: string) => void;
  onUpdateBoth: (newHp: number, newtHp: number, newConditions: string[]) => void;
  onUpdateDeathSaves: (saves: boolean[]) => void;
  onClose: () => void;
  handleNextTurn: () => void;
  updateCombatant: (combatantId: string, field: keyof Combatant, value: any) => void;
}

export function HpChangeModal({ combatant, combatantId, currentCombatantID, combatantName, currentHp, maxHp, tHp, type, deathsaves, conditions, onSubmit, onRemoveCondition, onAddCondition, onUpdateBoth, onUpdateDeathSaves, onClose, handleNextTurn, updateCombatant }: HpChangeModalProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [showConcentrationCheck, setShowConcentrationCheck] = useState(false);
  const [concentrationDC, setConcentrationDC] = useState(10);
  const { status } = useGlobalContext();
  // const [condition, setConditions] = useState<string[]>(conditions)
  const isConcentrating = conditions.includes('Concentrating');
  const isDying = conditions.includes('Death Saves')
  const [editingField, setEditingField] = useState<string | null>(null);
  
  const addDeathSaveSuccess = () => {
    if (!onUpdateDeathSaves) {
            console.log('onUpdateDeathSaves is not defined!');
            return;
    }
    const newSaves = [...deathsaves, true];
    // if (combatantId === currentCombatantID) {handleNextTurn()}
    onUpdateDeathSaves(newSaves);
    
    // If 3 successes, stabilize
    if (newSaves.filter(s => s === true).length >= 3) {
      onRemoveCondition('Death Saves');
      let dsCondition = conditions.indexOf('Death Saves');
      conditions.splice(dsCondition, 1);
      alert(`${combatantName} is stabilized!`);
      const resetSaves: boolean[] = [];
      onUpdateDeathSaves(resetSaves);
      onClose();
    }
  };

  const addDeathSaveFailure = () => {
    if (!onUpdateDeathSaves) {
      console.log('onUpdateDeathSaves is not defined!');
      return;
    }
    const newSaves = [...deathsaves, false];
    // if (combatantId === currentCombatantID) {handleNextTurn()}
    onUpdateDeathSaves(newSaves);
    
    // If 3 failures, dead
    if (newSaves.filter(s => s === false).length >= 3) {
      onRemoveCondition('Death Saves');
      onAddCondition('Dead');
      let dsCondition = conditions.indexOf('Death Saves');
      conditions.splice(dsCondition, 1);
      conditions.push("Dead");
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
    
    let updatedConditions = [...conditions];
    let newHp:number ;
    // Apply damage normally if not concentrating
    if (tHp > 0) {
      let updatedDamageAmount = Math.max(0, damageAmount - tHp);
      newHp = Math.max(0, currentHp - updatedDamageAmount)}
    else {newHp = Math.max(0, currentHp - damageAmount);}
    
    
    // Auto-add death save or dead condition
    if (newHp <= 0) {
      if (type === 'hero' && !conditions.includes('Death Saves')) {
        updatedConditions.push('Death Saves');
        if (onUpdateDeathSaves) {
            onUpdateDeathSaves([]);
          }
      } else if (type === 'monster' && !conditions.includes('Dead')) {
        updatedConditions.push('Dead');
      }
    }
    let newtHp = Math.max(0, tHp - damageAmount)
    console.log("New Temp HP", newtHp)
    // If conditions changed, use onUpdateBoth
    if (updatedConditions.length !== conditions.length && onUpdateBoth) {
      onUpdateBoth(newHp, newtHp, updatedConditions);
      setShowConcentrationCheck(false);
      return; // Don't call onSubmit separately
    }
    
    
    // Otherwise just update HP
    onSubmit(newHp, newtHp);
    onClose();
};

const handleConcentrationPass = () => {
  // They passed - apply damage and keep concentrating
  const damageAmount = parseInt(amount);
  let newHp:number ;
  if (tHp > 0) {
    let updatedDamageAmount = Math.max(0, damageAmount - tHp);
    newHp = Math.max(0, currentHp - updatedDamageAmount)}
  else {newHp = Math.max(0, currentHp - damageAmount);}
  let newtHp = Math.max(0, tHp - damageAmount)
  onSubmit(newHp, newtHp);
  setShowConcentrationCheck(false);
  onClose();
};

const handleConcentrationFail = () => {
  // They failed - apply damage and remove concentrating
  const damageAmount = parseInt(amount);
  let newHp:number ;
  if (tHp > 0) {
    let updatedDamageAmount = Math.max(0, damageAmount - tHp);
    newHp = Math.max(0, currentHp - updatedDamageAmount)}
  else {newHp = Math.max(0, currentHp - damageAmount);}
  let newtHp = Math.max(0, tHp - damageAmount)
  const newConditions = conditions.filter(c => c !== 'Concentrating');
  setShowConcentrationCheck(false);
  if (onUpdateBoth) {
    onUpdateBoth(newHp, newtHp, newConditions);
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
      onUpdateBoth(newHp, tHp, newConditions);
     } else  
      {onSubmit(newHp, tHp);}
    
    
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDamage(); // Default to damage on Enter
    } else if (e.key === 'Escape') {
      onClose();
    }}

  const removeLastDeathSave = (index:number) => {
    if (index === deathsaves.length - 1) {
    const newSaves = deathsaves.slice(0, -1);
    onUpdateDeathSaves(newSaves);
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
                    onClick={() => removeLastDeathSave(index)}
                    style={{
                      fontSize: '24px',
                      color: save ? '#28a745' : '#dc3545',
                      fontWeight: 'bold',
                      cursor: index === deathsaves.length - 1 ? 'pointer' : 'default',
                      opacity: index === deathsaves.length - 1 ? 1 : 0.7,
                      transition: 'opacity 0.2s'
                    }}
                    title={index === deathsaves.length - 1 ? `Click to remove this ${save ? 'success' : 'failure'}` : (save ? 'Success' : 'Failure')}
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
        <div>
          Temporary HP🛡️:
          <EditableCell
            entity={combatant}
            field="tHp"
            type="number"
            editingField={editingField}
            setEditingField={setEditingField}
            updateEntity={updateCombatant}
          /><span title='Temp HP, click to edit'></span>
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