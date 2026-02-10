import React, { ReactNode, useState } from 'react';

interface SVGButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'action' | 'patreon';
  disabled?: boolean;
  className?: string;
  title?: string;
}

/**
 * SVG Button component with background graphics
 * 
 * Usage:
 * <SVGButton variant="primary" onClick={handleClick}>
 *   Start Battle
 * </SVGButton>
 * 
 * <SVGButton variant="action" disabled={!canAct}>
 *   Take Action
 * </SVGButton>
 */
const SVGButton: React.FC<SVGButtonProps> = ({ 
  children, 
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
  title
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  
  // Determine which background image to use
  const getBackgroundImage = () => {
    if (disabled) return `/svg/buttons/button-${variant}-disabled.svg`;
    if (isActive) return `/svg/buttons/button-${variant}-active.svg`;
    if (isHovered) return `/svg/buttons/button-${variant}-hover.svg`;
    return `/svg/buttons/button-${variant}.svg`;
  };
  
  return (
    <button
      className={`svg-button svg-button-${variant} ${className} ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsActive(false);
      }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      disabled={disabled}
      title={title}
      style={{
        backgroundImage: `url(${getBackgroundImage()})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
};

export default SVGButton;
