import React, { ReactNode, CSSProperties } from 'react';

interface SVGBorderProps {
  children: ReactNode;
  variant?: 'default' | 'fancy' | 'combat' | 'magic' | 'scroll';
  className?: string;
  padding?: string;
  borderWidth?: string;
}

/**
 * SVG Border component for decorative borders
 * 
 * Usage:
 * <SVGBorder variant="fancy">
 *   <p>Content goes here</p>
 * </SVGBorder>
 * 
 * <SVGBorder variant="scroll" className="hero-panel">
 *   <HeroManager />
 * </SVGBorder>
 */
const SVGBorder: React.FC<SVGBorderProps> = ({ 
  children, 
  variant = 'default',
  className = '',
  padding = '1rem',
  borderWidth = '15px'
}) => {
  // Path to the border SVG
  const borderImagePath = `/svg/borders/border-${variant}.svg`;
  
  // CSS for border-image
  const style: CSSProperties = {
    padding,
    borderStyle: 'solid',
    borderWidth: borderWidth,
    borderImageSource: `url(${borderImagePath})`,
    borderImageSlice: '30 fill', // Adjust based on your SVG design
    borderImageRepeat: 'round',
  };
  
  return (
    <div 
      className={`svg-border svg-border-${variant} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

export default SVGBorder;
