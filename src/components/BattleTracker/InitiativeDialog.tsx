import { useEffect, useState } from 'react';
import InitIcon from '../../assets/draftsvgs_v2/icon_init.svg';

interface InitiativeDialogProps {
  combatantName: string;
  initiativeModifier: number;
  onSubmit: (initiative: number) => void;
  onCancel: () => void;
}

export function InitiativeDialog({
  combatantName,
  initiativeModifier,
  onSubmit,
  onCancel,
}: InitiativeDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  // Escape backs out of the whole start-battle flow. Without this the only way
  // out of an accidental "Start Battle" was to roll for every combatant or
  // reload the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (trimmed === '') {
      setError('Enter a total, or press Roll.');
      return;
    }
    const value = Number(trimmed);
    // Negative and zero totals are legal: a natural 1 with a -2 Dex modifier
    // really is -1. The old check rejected anything <= 0.
    if (!Number.isFinite(value)) {
      setError('That is not a number.');
      return;
    }
    setError('');
    onSubmit(value);
  };

  const handleRandom = () => {
    const roll = Math.floor(Math.random() * 20) + 1;
    onSubmit(roll + initiativeModifier);
  };

  const modifierLabel =
    initiativeModifier === 0 ? '' : initiativeModifier > 0 ? `+${initiativeModifier}` : `${initiativeModifier}`;

  return (
    <div id="initiativeDialogOuter" role="presentation" onClick={onCancel}>
      <div
        id="initiativeDialogInner"
        className="initiativeDialogInner"
        role="dialog"
        aria-modal="true"
        aria-label={`Initiative for ${combatantName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>
          Initiative for {combatantName}
          <span className="initiativeFormula">1d20 {modifierLabel}</span>
        </h3>

        <input
          type="number"
          value={inputValue}
          name="initiative-value-input"
          onChange={(e) => {
            setInputValue(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Enter the rolled total"
          aria-label="Initiative total"
          autoFocus
        />

        {error && <p className="errorMsg">{error}</p>}

        <div className="initiativeDialogButtons">
          <button type="button" onClick={handleSubmit} id="submitInit">
            Submit
          </button>
          <button type="button" onClick={handleRandom} id="randomInit">
            Roll
            <img src={InitIcon} alt="" aria-hidden="true" />
          </button>
        </div>

        <button type="button" onClick={onCancel} id="cancelInit">
          Cancel battle
        </button>
      </div>
    </div>
  );
}
