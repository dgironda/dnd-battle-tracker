import { useState } from 'react';
import { Combatant } from '../types/index';
import { EditableCell } from '../utils/Utils';
import { ConcentrationCheckModal } from './concentrationCheck';
import { useGlobalContext } from '../hooks/optionsContext';
import { notify } from './notify';
import { resolveDamage } from './damage';

interface HpChangeModalProps {
  combatant: Combatant;
  combatantName: string;
  currentHp: number;
  maxHp: number;
  tHp: number;
  conditions: string[];
  type: 'hero' | 'monster';
  deathsaves: boolean[];
  onSubmit: (newHp: number, newtHp: number) => void;
  onUpdateBoth: (newHp: number, newtHp: number, newConditions: string[]) => void;
  onUpdateDeathSaves: (saves: boolean[]) => void;
  onClose: () => void;
  updateCombatant: (
    combatantId: string,
    field: keyof Combatant,
    value: string | number | boolean | string[]
  ) => void;
}

export function HpChangeModal({
  combatant,
  combatantName,
  currentHp,
  maxHp,
  tHp,
  type,
  deathsaves,
  conditions,
  onSubmit,
  onUpdateBoth,
  onUpdateDeathSaves,
  onClose,
  updateCombatant,
}: HpChangeModalProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [showConcentrationCheck, setShowConcentrationCheck] = useState(false);
  const [concentrationDC, setConcentrationDC] = useState(10);
  const { settings } = useGlobalContext();
  const isConcentrating = conditions.includes('Concentrating');
  const isDying = conditions.includes('Death Saves');
  const [editingField, setEditingField] = useState<string | null>(null);

  const addDeathSaveSuccess = () => {
    const newSaves = [...deathsaves, true];

    if (newSaves.filter(Boolean).length >= 3) {
      // Stabilised: drop the condition and clear the tally. This goes through
      // onUpdateBoth rather than splicing the conditions array in place, which
      // is what the old version did to React's own state.
      onUpdateBoth(currentHp, tHp, conditions.filter(c => c !== 'Death Saves'));
      onUpdateDeathSaves([]);
      notify(`${combatantName} is stable and no longer needs to roll death saves.`, {
        title: 'Stabilised',
      });
      onClose();
      return;
    }

    onUpdateDeathSaves(newSaves);
  };

  const addDeathSaveFailure = () => {
    const newSaves = [...deathsaves, false];

    if (newSaves.filter(s => s === false).length >= 3) {
      const next = conditions.filter(c => c !== 'Death Saves');
      if (!next.includes('Dead')) next.push('Dead');
      onUpdateBoth(currentHp, tHp, next);
      onUpdateDeathSaves([]);
      notify(`${combatantName} has died.`, { title: 'Death', tone: 'danger' });
      onClose();
      return;
    }

    onUpdateDeathSaves(newSaves);
  };

  const parseAmount = (): number | null => {
    const trimmed = amount.trim();
    if (trimmed === '') {
      setError('Enter an amount.');
      return null;
    }
    const value = Number(trimmed);
    if (!Number.isFinite(value)) {
      setError('Enter a valid number.');
      return null;
    }
    return value;
  };

  /** Commit a damage result and close. Shared by all three damage paths. */
  const commitDamage = (damage: number, dropConcentration: boolean) => {
    const result = resolveDamage(damage, currentHp, tHp, conditions, type);
    const finalConditions = dropConcentration
      ? result.conditions.filter(c => c !== 'Concentrating')
      : result.conditions;

    // A hero who just dropped starts a fresh set of death saves.
    if (finalConditions.includes('Death Saves') && !conditions.includes('Death Saves')) {
      onUpdateDeathSaves([]);
    }

    if (finalConditions.length !== conditions.length || dropConcentration) {
      onUpdateBoth(result.newHp, result.newtHp, finalConditions);
    } else {
      onSubmit(result.newHp, result.newtHp);
    }

    setShowConcentrationCheck(false);
    onClose();
  };

  const handleDamage = () => {
    const damageAmount = parseAmount();
    if (damageAmount === null) return;
    if (damageAmount < 0) {
      setError('Damage must be positive.');
      return;
    }

    // Already down: a hit on a dying creature is a failed death save.
    if (currentHp === 0 && isDying) {
      addDeathSaveFailure();
      return;
    }

    if (isConcentrating && damageAmount > 0) {
      const half = Math.floor(damageAmount / 2);
      const dc =
        settings.version === 'twentyFourteen'
          ? Math.max(10, half)
          : Math.min(Math.max(10, half), 30);
      setConcentrationDC(dc);
      setShowConcentrationCheck(true);
      return; // resumed by handleConcentrationPass / handleConcentrationFail
    }

    commitDamage(damageAmount, false);
  };

  const handleConcentrationPass = () => {
    const damageAmount = parseAmount();
    if (damageAmount === null) return;
    commitDamage(damageAmount, false);
  };

  const handleConcentrationFail = () => {
    const damageAmount = parseAmount();
    if (damageAmount === null) return;
    commitDamage(damageAmount, true);
  };

  const handleHeal = () => {
    const healAmount = parseAmount();
    if (healAmount === null) return;
    if (healAmount < 0) {
      setError('Healing must be positive.');
      return;
    }

    const newHp = Math.min(maxHp, currentHp + healAmount);

    // Any healing brings a dying creature back and ends the death saves. A dead
    // one stays dead until the condition is removed by hand.
    if (isDying && healAmount > 0) {
      onUpdateDeathSaves([]);
      onUpdateBoth(newHp, tHp, conditions.filter(c => c !== 'Death Saves'));
      notify(`${combatantName} is conscious again and no longer rolling death saves.`, {
        title: 'Back up',
      });
    } else {
      onSubmit(newHp, tHp);
    }

    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDamage(); // Default to damage on Enter
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const removeLastDeathSave = (index: number) => {
    if (index === deathsaves.length - 1) {
      onUpdateDeathSaves(deathsaves.slice(0, -1));
    }
  };

  return (
    <div className="hpChangeModalOuter" role="presentation" onClick={onClose}>
      <div
        className="hpChangeModalInner"
        role="dialog"
        aria-modal="true"
        aria-label={`Change HP for ${combatantName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{combatantName}</h3>

        {/* Death Saves section */}
        {isDying && (
          <div id="deathSavesBox">
            <h2>Death Saving Throws</h2>

            <div id="deathSavesBoxInner">
              {deathsaves.length === 0 ? (
                <span id="deathSavesNull">No saves yet</span>
              ) : (
                deathsaves.map((save, index) => {
                  const isLast = index === deathsaves.length - 1;
                  return (
                    <span
                      key={index}
                      className={`deathSaveMark ${save ? 'success' : 'failure'} ${isLast ? 'removable' : ''}`}
                      onClick={() => removeLastDeathSave(index)}
                      title={
                        isLast
                          ? `Click to remove this ${save ? 'success' : 'failure'}`
                          : save
                            ? 'Success'
                            : 'Failure'
                      }
                    >
                      {save ? '✅' : '❌'}
                    </span>
                  );
                })
              )}
            </div>
            <div className="deathSavesButtons">
              <div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addDeathSaveSuccess();
                  }}
                  className="hpChangeModalHealButton"
                >
                  Success
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addDeathSaveFailure();
                  }}
                  className="hpChangeModalDmgButton"
                >
                  Failure
                </button>
              </div>
            </div>
          </div>
        )}

        {/* hp, dmg, heal */}
        <div className="hpChangeModalCurrent">
          Current HP: {currentHp} / {maxHp}
        </div>
        <div>
          <span title="Temp HP, click to edit">Temporary HP🛡️:</span>
          <EditableCell
            entity={combatant}
            field="tHp"
            type="number"
            editingField={editingField}
            setEditingField={setEditingField}
            updateEntity={updateCombatant}
          />
        </div>

        <input
          className="hpChangeModalInput"
          type="number"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError('');
          }}
          onKeyDown={handleKeyPress}
          placeholder="Enter amount"
          aria-label="Amount of damage or healing"
          autoFocus
        />

        {error && <p className="errorMsg">{error}</p>}

        <div className="hpChangeModalButtonBox">
          <button onClick={handleDamage} className="hpChangeModalDmgButton">
            Take Damage
          </button>
          <button onClick={handleHeal} className="hpChangeModalHealButton">
            Heal
          </button>
        </div>

        <button className="hpChangeModalCancelButton" onClick={onClose}>
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
