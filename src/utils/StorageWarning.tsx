import React, { useState, useEffect } from 'react';

interface StorageWarningProps {
  threshold?: number; // in bytes, default 3MB
  onWarningChange?: (isWarning: boolean) => void;
}

export const StorageWarning: React.FC<StorageWarningProps> = ({
  threshold = 3 * 1024 * 1024, // 3MB default
  onWarningChange,
}) => {
  const [currentSize, setCurrentSize] = useState<number>(0);
  const [isExceeded, setIsExceeded] = useState<boolean>(false);

  // Calculate total localStorage size
  const calculateStorageSize = (): number => {
    let totalBytes = 0;
    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const item = localStorage.getItem(key);
          if (item) {
            totalBytes += new Blob([item]).size + new Blob([key]).size;
          }
        }
      }
    } catch (error) {
      console.error('Error calculating storage size:', error);
    }
    return totalBytes;
  };

  // Format bytes to human readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Check storage size on mount and when storage changes
  useEffect(() => {
    const checkStorage = () => {
      const size = calculateStorageSize();
      setCurrentSize(size);
      const exceeded = size > threshold;
      setIsExceeded(exceeded);
      onWarningChange?.(exceeded);
    };

    checkStorage();

    // Listen for storage changes (works across tabs)
    window.addEventListener('storage', checkStorage);

    // Optional: Periodically check storage (every 5 seconds)
    const interval = setInterval(checkStorage, 5000);

    return () => {
      window.removeEventListener('storage', checkStorage);
      clearInterval(interval);
    };
  }, [threshold, onWarningChange]);

  if (!isExceeded) {
    return null;
  }

  const thresholdMB = threshold / (1024 * 1024);

  return (
    <div className="storage-warning-container">
      <div className="storage-warning-banner">
        <svg
          className="warning-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div className="warning-content">
          <p className="warning-title">Storage Limit Exceeded</p>
          <p className="warning-message">
            Please consider deleting one of your saved battles with photos before uploading a new photo.
          </p>
          <p className="storage-info">
            Current usage: {formatBytes(currentSize)} / 5MB
          </p>
        </div>
      </div>

      <style>{`
        .storage-warning-container {
          padding: 16px;
        }

        .storage-warning-banner {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          background-color: #fef2f2;
          border: 1px solid #fca5a5;
          border-radius: 6px;
          color: #991b1b;
        }

        .warning-icon {
          flex-shrink: 0;
          margin-top: 2px;
          color: #dc2626;
        }

        .warning-content {
          flex: 1;
        }

        .warning-title {
          margin: 0 0 4px 0;
          font-weight: 600;
          font-size: 14px;
        }

        .warning-message {
          margin: 0 0 8px 0;
          font-size: 14px;
          line-height: 1.5;
        }

        .storage-info {
          margin: 0;
          font-size: 12px;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
};

export default StorageWarning;
