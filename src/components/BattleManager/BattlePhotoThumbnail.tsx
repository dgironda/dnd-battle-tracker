import { useState } from 'react';
import ReactDOM from 'react-dom';

interface BattlePhotoThumbnailProps
{
  photo: string;
  name: string;
}

const BattlePhotoThumbnail: React.FC<BattlePhotoThumbnailProps> = ({ photo, name }) =>
{
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const handleBackdropClick = (e: React.MouseEvent) =>
  {
    // Close if clicking on backdrop (not the image itself)
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <>
      <div
        className="battle-photo-thumbnail"
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleOpen()}
        style={{ cursor: 'pointer' }}
        title={`${name} - Click to enlarge`}
      >
        <img src={photo} alt={`${name} - Click to enlarge`} />
      </div>

      {/* Portal the expanded view to document.body */}
      {isOpen && ReactDOM.createPortal(
        <div
          className="battle-photo-overlay"
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