import { useState, useRef } from 'react';
import ReactDOM from 'react-dom';

interface BattlePhotoThumbnailProps {
  photo: string;
  name: string;
}

const BattlePhotoThumbnail: React.FC<BattlePhotoThumbnailProps> = ({ photo, name }) => {
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    // Add a small delay before hiding to prevent flickering
    timeoutRef.current = window.setTimeout(() => {
      setIsHovered(false);
    }, 100);
  };

  const handleClose = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsHovered(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Close if clicking on backdrop (not the image itself)
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <>
      <div 
        className="battle-photo-thumbnail"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <img src={photo} alt={name} />
      </div>

      {/* Portal the expanded view to document.body */}
      {isHovered && ReactDOM.createPortal(
        <div 
          className="battle-photo-overlay"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleBackdropClick}
        >
          <div className="battle-photo-backdrop" />
          <div className="battle-photo-expanded">
            <button 
              className="battle-photo-close"
              onClick={handleClose}
              aria-label="Close"
            >
              ✕
            </button>
            <img src={photo} alt={name} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default BattlePhotoThumbnail;