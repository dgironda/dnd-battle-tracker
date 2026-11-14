import { useState } from 'react';
import { Combatant } from '../types/index';
import { EditableCell } from '../utils/Utils';
import { ConcentrationCheckModal } from './concentrationCheck';
import { useGlobalContext } from '../hooks/optionsContext';
import { notify } from './notify';
import { hitCombatant } from './damage';
import TempHpIcon from '../assets/draftsvgs_v2/icon_temphp.svg';

const DAMAGE_LABEL: Record<string, string> = { true: 'Take Crit Damage', false: 'Take Damage' };

/** Crit: marks the next hit a critical one (two failed death saves for a hero at 0). Beige off, red on. */
function CritToggle({ crit, onToggle }: { crit: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`drawnBtn hpChangeModalCritButton${crit ? ' isRed' : ''}`}
      aria-pressed={crit}
      title="A critical hit: two failed death saves for a hero at 0 HP"
      onClick={onToggle}
    >
      Crit
    </button>
  );
}

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
  /** Every hit, as dealt (before temp HP and 0), even one that changes no hit points. */
  onHit?: (amount: number, crit: boolean) => void;
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
  onHit = () => {},
  onClose,
  updateCombatant,
}: HpChangeModalProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [crit, setCrit] = useState(false);
  const [showConcentrationCheck, setShowConcentrationCheck] = useState(false);
  const [concentrationDC, setConcentrationDC] = useState(10);
  const { settings } = useGlobalContext();
  const isConcentrating = conditions.includes('Concentrating');
  const isDying = conditions.includes('Death Saves');
  /** At 0 and still in it (dying, or a stable hero): a hit is a failed death save, not lost hit points. */
  const atZero = currentHp === 0 && !conditions.includes('Dead') && (isDying || type === 'hero');
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

  /** The hit's outcome by the shared rule (hitCombatant), from what this window shows. */
  const hitOutcome = (damage: number) =>
    hitCombatant({ ...combatant, currHp: currentHp, maxHp, tHp, conditions, deathsaves, type }, damage, crit).updated;

  const announceDeath = (after: Combatant) => {
    if (after.conditions.includes('Dead') && !conditions.includes('Dead')) {
      notify(`${combatantName} has died.`, { title: 'Death', tone: 'danger' });
    }
  };

  /** Commit a damage result and close. Shared by all three damage paths. */
  const commitDamage = (damage: number, dropConcentration: boolean) => {
    onHit(damage, crit);
    const after = hitOutcome(damage);
    const finalConditions = dropConcentration
      ? after.conditions.filter(c => c !== 'Concentrating')
      : after.conditions;

    // A hero who just dropped starts a fresh set of death saves (or none, dead).
    if (after.deathsaves !== deathsaves) onUpdateDeathSaves(after.deathsaves);

    if (finalConditions.length !== conditions.length || dropConcentration) {
      onUpdateBoth(after.currHp, after.tHp, finalConditions);
    } else {
      onSubmit(after.currHp, after.tHp);
    }
    announceDeath(after);

    setShowConcentrationCheck(false);
    onClose();
  };

  /**
   * Already at 0 (dying or stable): temp HP soaks the hit first; what gets
   * through is a failed death save (two on a crit), a stable hero starts dying
   * again, and a hit of at least their maximum hit points kills them.
   */
  const hitWhileDown = (damageAmount: number) => {
    onHit(damageAmount, crit);
    const after = hitOutcome(damageAmount);
    onUpdateDeathSaves(after.deathsaves);
    if (after.conditions !== conditions) onUpdateBoth(after.currHp, after.tHp, after.conditions);
    else if (after.tHp !== tHp) onSubmit(after.currHp, after.tHp);
    announceDeath(after);
    if (after.conditions.includes('Dead')) onClose();
  };

  const handleDamage = () => {
    const damageAmount = parseAmount();
    if (damageAmount === null) return;
    if (damageAmount < 0) {
      setError('Damage must be positive.');
      return;
    }

    if (atZero) {
      hitWhileDown(damageAmount);
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
                      role="img"
                      aria-label={save ? 'Success' : 'Failure'}
                      title={
                        isLast
                          ? `Click to remove this ${save ? 'success' : 'failure'}`
                          : save
                            ? 'Success'
                            : 'Failure'
                      }
                    />
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
        <div className="hpReadout">
          <div className="hpStat">
            <span className="hpStatLabel">Current HP</span>
            <span className="hpStatValue">
              {currentHp}<span className="hpStatOf">/{maxHp}</span>
            </span>
          </div>
          <div className="hpStat hpStatTemp">
            <span className="hpStatLabel">
              <img src={TempHpIcon} alt="" className="hpTempIcon" />
              Temporary
            </span>
            <span className="hpStatValue" title="Temp HP, click to edit">
              <EditableCell
                entity={combatant}
                field="tHp"
                type="number"
                editingField={editingField}
                setEditingField={setEditingField}
                updateEntity={updateCombatant}
              />
            </span>
          </div>
        </div>

        <label className="hpAmountLabel" htmlFor="hpAmount">
          How much?
        </label>
        <input
          id="hpAmount"
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
          <CritToggle crit={crit} onToggle={() => setCrit(!crit)} />
          <button onClick={handleDamage} className="hpChangeModalDmgButton">
            {DAMAGE_LABEL[String(crit)]}
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
