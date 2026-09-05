import React, { useCallback, useEffect, useState } from 'react';

interface StorageWarningProps {
  threshold?: number; // in bytes, default 3MB
  onWarningChange?: (isWarning: boolean) => void;
}

/** Rough per-origin localStorage budget in most browsers. */
const ASSUMED_LIMIT = 5 * 1024 * 1024;

export const StorageWarning: React.FC<StorageWarningProps> = ({
  threshold = 3 * 1024 * 1024,
  onWarningChange,
}) => {
  const [currentSize, setCurrentSize] = useState<number>(0);
  const [isExceeded, setIsExceeded] = useState<boolean>(false);

  const calculateStorageSize = useCallback((): number => {
    let totalChars = 0;
    try {
      // Object.keys skips the prototype's own members, so no hasOwnProperty
      // dance. Length is also enough: building a Blob per key just to measure
      // it meant re-hashing megabytes of battle photos on every check.
      for (const key of Object.keys(localStorage)) {
        const item = localStorage.getItem(key);
        if (item) totalChars += item.length + key.length;
      }
    } catch (error) {
      console.error('Error calculating storage size:', error);
    }
    // Stored as UTF-16 in practice, so two bytes per code unit.
    return totalChars * 2;
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  useEffect(() => {
    const checkStorage = () => {
      const size = calculateStorageSize();
      setCurrentSize(size);
      const exceeded = size > threshold;
      setIsExceeded(exceeded);
      onWarningChange?.(exceeded);
    };

    checkStorage();

    // Only recheck when something actually writes. The old version also polled
    // every five seconds for the life of the component.
    window.addEventListener('storage', checkStorage);
    window.addEventListener('focus', checkStorage);

    return () => {
      window.removeEventListener('storage', checkStorage);
      window.removeEventListener('focus', checkStorage);
    };
    // onWarningChange is intentionally not a dependency: callers pass an inline
    // arrow, which would tear down and re-register the listeners every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold, calculateStorageSize]);

  if (!isExceeded) {
    return null;
  }

  return (
    <div className="storage-warning-container">
      <div className="storage-warning-banner" role="status">
        <svg
          className="warning-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div className="warning-content">
          <p className="warning-title">Storage is nearly full</p>
          <p className="warning-message">
            Delete a saved battle — especially one with a photo — before saving another.
          </p>
          <p className="storage-info">
            Using {formatBytes(currentSize)} of about {formatBytes(ASSUMED_LIMIT)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StorageWarning;
