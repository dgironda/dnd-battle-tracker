import { DEVMODE } from "../../utils/devmode";

import { useState } from 'react';
import { useCombat } from './CombatContext';

interface InitiativeDialogProps {
  heroName: string;
  initiativeModifier: number;
  onSubmit: (initiative: number) => void;
}

export function InitiativeDialog({ heroName, initiativeModifier, onSubmit }: InitiativeDialogProps) {
  const { initiativeResolver, setInitiativeResolver } = useCombat();
  const [inputValue, setInputValue] = useState<number | ''>('');
  const [error, setError] = useState('');

  const submitInitiative = (value: number) => {
    // Resolve if we’re in a combat-initiated flow (e.g., adding monster mid-battle)
    if (initiativeResolver) {
      initiativeResolver(value);
      setInitiativeResolver(null);
    }

    // Always call onSubmit for normal battle start flow
    onSubmit(value);
  };

  const handleSubmit = () => {
    if (inputValue === '' || isNaN(Number(inputValue)) || Number(inputValue) <= 0) {
      setError('Please enter a valid number greater than zero.');
      return;
    }
    setError('');
    submitInitiative(Number(inputValue));
  };

  const handleRandom = () => {
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + initiativeModifier;
    console.log(heroName, " Roll: ", roll, "Total: ", total)
    submitInitiative(total);
  };

  return (
    <div
      id='initiativeDialogOuter'
    >
      <div
        id='initiativeDialogInner'
      >
        <h3>Enter Initiative of 1d20 {initiativeModifier !== 0 ? (initiativeModifier > 0 ? `+${initiativeModifier}` : initiativeModifier) : ''} for {heroName}</h3>

        <input
          type="number"
          min={1}
          max={40}
          value={inputValue}
          onChange={(e) => {
            const value = e.target.value;
            setInputValue(value === '' ? '' : parseInt(value, 10));
          }}
          placeholder="Enter initiative value"
          autoFocus
        />

        {error && (
          <p className="errorMsg">
            {error}
          </p>
        )}

        <div>
          <button
            onClick={handleSubmit}
            id='submitInit'
          >
            OK
          </button>
          <button
            onClick={handleRandom}
            id='randomInit'
          >
            Random (1–20)
          </button>
        </div>
      </div>
    </div>
  );
}
