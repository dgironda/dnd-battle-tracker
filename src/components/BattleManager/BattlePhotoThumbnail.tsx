import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { getPhoto } from '../../utils/photoStore';

interface BattlePhotoThumbnailProps
{
  /** Key into the IndexedDB photo store — see photoStore.ts. */
  photoId: string;
  name: string;
}

/**
 * The reference photo on a saved battle.
 *
 * The image is bytes in IndexedDB rather than a base64 string in the battle
 * record, so it is fetched here and handed to the <img> as an object URL. Two
 * sizes are stored: the card gets the thumbnail, and the full one is only read
 * when the lightbox opens — a list of ten battles used to decode ten
 * full-size JPEGs to draw ten 200px boxes.
 */
const BattlePhotoThumbnail: React.FC<BattlePhotoThumbnailProps> = ({ photoId, name }) =>
{
  const [isOpen, setIsOpen] = useState(false);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [fullUrl, setFullUrl] = useState<string | null>(null);

  // The thumbnail, for the card.
  useEffect(() =>
  {
    let url: string | null = null;
    let cancelled = false;

    getPhoto(photoId).then((photo) =>
    {
      if (cancelled || !photo) return;
      url = URL.createObjectURL(photo.thumb);
      setThumbUrl(url);
    });

    // Object URLs live until revoked, so a list of cards that never let go
    // holds every image it has ever shown.
    return () =>
    {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [photoId]);

  // The full size, only once it is actually being looked at.
  useEffect(() =>
  {
    if (!isOpen) return;
    let url: string | null = null;
    let cancelled = false;

    getPhoto(photoId).then((photo) =>
    {
      if (cancelled || !photo) return;
      url = URL.createObjectURL(photo.full);
      setFullUrl(url);
    });

    return () =>
    {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setFullUrl(null);
    };
  }, [isOpen, photoId]);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const handleBackdropClick = (e: React.MouseEvent) =>
  {
    // Close if clicking on backdrop (not the image itself)
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Nothing to show until the bytes arrive, and nothing at all if the store
  // could not be opened.
  if (!thumbUrl) return null;

  return (
    <>
      <div
        className="battle-photo-thumbnail"
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        aria-label={`View the reference photo for ${name}`}
        onKeyDown={(e) =>
        {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen();
          }
        }}
      >
        <img src={thumbUrl} alt={`Reference photo for ${name}`} />
        <div className="battle-photo-overlay">Click to enlarge</div>
      </div>

      {isOpen &&
        ReactDOM.createPortal(
          <div className="battle-photo-backdrop" onClick={handleBackdropClick}>
            <div className="battle-photo-expanded">
              <button
                type="button"
                className="battle-photo-close"
                onClick={handleClose}
                aria-label="Close the photo"
              >
                X
              </button>
              {fullUrl && <img src={fullUrl} alt={`Reference photo for ${name}`} />}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default BattlePhotoThumbnail;
