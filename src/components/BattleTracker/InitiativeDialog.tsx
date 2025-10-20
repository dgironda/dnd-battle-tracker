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
    submitInitiative(total);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          minWidth: '400px',
        }}
      >
        <h3 style={{ marginTop: 0 }}>Enter Initiative for {heroName}</h3>

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
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '16px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            marginBottom: '0.5rem',
          }}
        />

        {error && (
          <p style={{ color: '#dc3545', fontSize: '14px', margin: '0.5rem 0' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            OK
          </button>
          <button
            onClick={handleRandom}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Random (1–20)
          </button>
        </div>
      </div>
    </div>
  );
}
