import React from 'react';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
  onClick?: () => void;
  title?: string;
}

// SVG path data for each icon
const iconPaths: Record<string, string> = {
  heart: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  action: "M6.92 5L5 6.92l6.5 6.5-1.27 1.27c-.5.5-.54 1.3-.11 1.86l.15.16L8 18.94a.996.996 0 101.41 1.41l2.23-2.23.16.15c.56.43 1.36.39 1.86-.11L15 16.85 21.07 23l2-2L17 14.93l1.28-1.28c.5-.5.54-1.3.11-1.86l-.15-.16L21.07 9 19 6.93l-2.23 2.23-.16-.15c-.56-.43-1.36-.39-1.86.11L13.5 10.5 7 4.07 5.07 2 2 5.07l2.92 2.92z",
  bonus: "M7 2v11h3v9l7-12h-4l4-8z",
  movement: "M20 8h-5v4h-2V4h2v2h5v2zm0 8v2h-5v-4h2v2h3zm-9-6H9v10H7V10H5V8h6v2z",
  reaction: "M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z",
  shield: "M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z",
  dice: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM7.5 18c-.83 0-1.5-.67-1.5-1.5S6.67 15 7.5 15s1.5.67 1.5 1.5S8.33 18 7.5 18zm0-9C6.67 9 6 8.33 6 7.5S6.67 6 7.5 6 9 6.67 9 7.5 8.33 9 7.5 9zm4.5 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4.5 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm0-9c-.83 0-1.5-.67-1.5-1.5S15.67 6 16.5 6s1.5.67 1.5 1.5S17.33 9 16.5 9z",
  gear: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
};

/**
 * Icon component - Works everywhere, including tables!
 * Uses inline SVG instead of <img> tags to avoid CSS conflicts
 * 
 * Usage:
 * <Icon name="heart" size={16} color="#dc3545" />
 */
const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 24, 
  color = '#000000',
  className = '',
  onClick,
  title
}) => {
  const pathData = iconPaths[name];
  
  if (!pathData) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`icon icon-${name} ${className}`}
      onClick={onClick}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        marginRight: '4px',
        cursor: onClick ? 'pointer' : 'default',
      }}
      aria-label={title || name}
    >
      {title && <title>{title}</title>}
      <path d={pathData} fill={color} />
    </svg>
  );
};

export default Icon;
