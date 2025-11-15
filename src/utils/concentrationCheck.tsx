import { DEVMODE } from "./devmode";

interface ConcentrationCheckModalProps {
  combatantName: string;
  dc: number;
  onPass: () => void;
  onFail: () => void;
}

export function ConcentrationCheckModal({ 
  combatantName, 
  dc, 
  onPass, 
  onFail 
}: ConcentrationCheckModalProps) {
  
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
        zIndex: 1001 // Higher than HP modal
      }}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          minWidth: '400px',
          textAlign: 'center'
        }}
      >
        <h3 style={{ 
          marginTop: 0,
          color: '#856404',
          fontSize: '20px'
        }}>
          ⚠️ Concentration Check
        </h3>
        
        <div style={{ 
          fontSize: '18px', 
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: '#fff3cd',
          borderRadius: '4px',
          border: '1px solid #ffc107'
        }}>
          <strong>{combatantName}</strong> must make a<br/>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
            DC {dc}
          </span><br/>
          Constitution saving throw
        </div>
        
        <p style={{ marginBottom: '1.5rem', color: '#666' }}>
          Did they pass the concentration check?
        </p>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={onPass}
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
            ✓ Yes - Maintained
          </button>
          <button
            onClick={onFail}
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
            ✗ No - Lost Concentration
          </button>
        </div>
      </div>
    </div>
  );
}
