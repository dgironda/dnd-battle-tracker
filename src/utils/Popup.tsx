import React from 'react';

interface PopupProps {
  message: string;
  isOpen: boolean;
  onCancel: () => void;
  onContinue: () => void;
  title?: string;
}

export const Popup: React.FC<PopupProps> = ({
  message,
  isOpen,
  onCancel,
  onContinue,
  title = 'Confirmation'
}) => {
  if (!isOpen) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-backdrop" onClick={onCancel} />
      
      <div className="popup-container">
        <h3 className="popup-title">{title}</h3>
        
        <p className="popup-message">{message}</p>
        
        <div className="popup-buttons">
          <button onClick={onCancel} className="btn-cancel">
            Cancel
          </button>
          <button onClick={onContinue} className="btn-continue">
            Continue
          </button>
        </div>
      </div>

      {/* <style>{`
        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .popup-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
        }

        .popup-container {
          position: relative;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          max-width: 448px;
          width: 100%;
          padding: 24px;
        }

        .popup-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 16px 0;
          color: #111827;
        }

        .popup-message {
          color: #374151;
          margin: 0 0 24px 0;
          line-height: 1.5;
        }

        .popup-buttons {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .popup-buttons button {
          padding: 8px 16px;
          border-radius: 4px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-cancel {
          background-color: #e5e7eb;
          color: #1f2937;
        }

        .btn-cancel:hover {
          background-color: #d1d5db;
        }

        .btn-continue {
          background-color: #2563eb;
          color: white;
        }

        .btn-continue:hover {
          background-color: #1d4ed8;
        }
      `}</style> */}
    </div>
  );
};

// Demo usage
export default function App() {
  const [isPopupOpen, setIsPopupOpen] = React.useState(false);

  const handleContinue = () => {
    alert('Continue clicked!');
    setIsPopupOpen(false);
  };

  const handleCancel = () => {
    alert('Cancel clicked!');
    setIsPopupOpen(false);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button
        onClick={() => setIsPopupOpen(true)}
        style={{
          padding: '12px 24px',
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
      >
        Open Popup
      </button>

      <Popup
        message="Are you sure you want to proceed with this action? This cannot be undone."
        isOpen={isPopupOpen}
        onCancel={handleCancel}
        onContinue={handleContinue}
        title="Confirm Action"
      />
    </div>
  );
}