import React from 'react';

interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

/**
 * Simple Icon component for SVG icons
 * Works with SVG files in public/svg/icons/
 */
const Icon: React.FC<IconProps> = ({ name, size = 24, className = '' }) => {
  return (
    <img
      src={`/svg/icons/${name}.svg`}
      alt={name}
      width={size}
      height={size}
      className={`icon ${className}`}
      style={{ 
        display: 'inline-block', 
        verticalAlign: 'middle',
        marginRight: '4px'
      }}
    />
  );
};

export default Icon;
