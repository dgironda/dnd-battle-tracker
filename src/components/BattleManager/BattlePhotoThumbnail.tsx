import { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { getPhoto } from '../../utils/photoStore';

interface BattlePhotoThumbnailProps
{
  /** Key into the IndexedDB photo store — see photoStore.ts. */
  photoId: string;
  name: string;
  /** Offered in the viewer when given: choose a different photo for the battle. */
  onChange?: () => void;
  /** Offered in the viewer when given: take the photo off the battle. */
  onRemove?: () => void;
}

/**
 * The reference photo on a saved battle.
 *
 * The image is bytes in IndexedDB rather than a base64 string in the battle
 * record, so it is fetched here and handed to the <img> as an object URL. Two
 * sizes are stored: the card gets the thumbnail, and the full one is only read
 * when the viewer opens — a list of ten battles used to decode ten
 * full-size JPEGs to draw ten 200px boxes.
 *
 * The card this sits on is a click target of its own (it opens the battle's
 * roster), so every click here stops at the photo. The viewer needs that as
 * much as the thumbnail does: it is portalled to <body>, but React bubbles a
 * portal's events up the component tree regardless, and every click inside it
 * — the image, the X, the backdrop — was reaching the card and flipping it
 * open or shut behind the photo.
 */
const BattlePhotoThumbnail: React.FC<BattlePhotoThumbnailProps> = ({
  photoId,
  name,
  onChange,
  onRemove,
}) =>
{
  const [isOpen, setIsOpen] = useState(false);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

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

  const handleClose = useCallback(() =>
  {
    setIsOpen(false);
    // Back to the photo it was opened from, rather than the top of the page.
    thumbRef.current?.focus();
  }, []);

  /* Escape closes the viewer and nothing else. It is caught on the way down,
     so the app's own Escape — which shuts the whole Battle Manager — never
     sees it. A confirm raised from in here (Remove) sits above the viewer and
     answers its own Escape first. */
  useEffect(() =>
  {
    if (!isOpen) return;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) =>
    {
      if (e.key !== 'Escape' || document.querySelector('.appDialogOuter')) return;
      e.stopPropagation();
      handleClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, handleClose]);

  // Nothing to show until the bytes arrive, and nothing at all if the store
  // could not be opened.
  if (!thumbUrl) return null;

  const canEdit = Boolean(onChange || onRemove);

  return (
    <>
      <div
        ref={thumbRef}
        className="battle-photo-thumbnail"
        onClick={(e) =>
        {
          e.stopPropagation();
          handleOpen();
        }}
        role="button"
        tabIndex={0}
        aria-label={`View the reference photo for ${name}`}
        onKeyDown={(e) =>
        {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            handleOpen();
          }
        }}
      >
        <img src={thumbUrl} alt={`Reference photo for ${name}`} />
        <div className="battle-photo-overlay">
          {canEdit ? 'View or change photo' : 'Click to enlarge'}
        </div>
      </div>

      {isOpen &&
        ReactDOM.createPortal(
          <div
            className="photoViewerOuter"
            role="presentation"
            onClick={(e) =>
            {
              e.stopPropagation();
              // The backdrop closes it; a click on the photo or its frame does not.
              if (e.target === e.currentTarget) handleClose();
            }}
          >
            <div
              className="photoViewerInner"
              role="dialog"
              aria-modal="true"
              aria-label={`Reference photo for ${name}`}
            >
              <button
                ref={closeRef}
                type="button"
                className="photoViewerClose"
                onClick={handleClose}
                aria-label="Close the photo"
              >
                X
              </button>
              <h3 className="photoViewerTitle">{name}</h3>
              {/* The thumbnail stands in until the full size has been read, so
                  the frame never opens empty. */}
              <img
                className="photoViewerImage"
                src={fullUrl ?? thumbUrl}
                alt={`Reference photo for ${name}, full size`}
              />
              {canEdit && (
                <div className="photoViewerActions">
                  {onChange && (
                    <button type="button" className="drawnBtn" onClick={onChange}>
                      Change photo
                    </button>
                  )}
                  {onRemove && (
                    <button type="button" className="drawnBtn isRed" onClick={onRemove}>
                      Remove photo
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default BattlePhotoThumbnail;
