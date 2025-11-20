import { useState } from 'react';
import { Hero } from '../../types/index';

interface StatBlockHoverProps {
  hero: Hero;
  children: React.ReactNode;
}

export function HeroStatBlockHover({ hero, children }: StatBlockHoverProps) {
  const [isHovering, setIsHovering] = useState(false);

  const getModifier = (stat: number): string => {
    const mod = Math.floor((stat - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  return (
    <div
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{ display: 'inline-block' }}
    >
      {children}

      {/* Slide-in stat block */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          right: isHovering ? '0px' : '-380px', // slide
          transform: 'translateY(-50%)',
          opacity: isHovering ? 1 : 0,
          transition: 'right 0.35s ease-out, opacity 0.3s ease-out',

          backgroundColor: '#f4e8d8',
          border: '3px solid #8b4513',
          borderRadius: '8px',
          padding: '1rem',
          width: '320px',
          boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
          zIndex: 10000,
          fontFamily: '"Bookman Old Style", serif',
          color: '#2c1810',
          pointerEvents: 'none',
        }}
      >
        {/* Header */}
        <div style={{
          borderBottom: '2px solid #8b4513',
          paddingBottom: '0.5rem',
          marginBottom: '0.75rem'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#8b0000',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            {hero.name}
          </h3>
          <div style={{
            fontSize: '13px',
            fontStyle: 'italic',
            color: '#555',
            marginTop: '2px'
          }}>
            Player: {hero.player}
          </div>
        </div>

        {/* Top Stats Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginBottom: '0.75rem',
          padding: '0.5rem',
          backgroundColor: '#e8dcc8',
          borderRadius: '4px',
          border: '1px solid #8b4513'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#8b4513',
              textTransform: 'uppercase'
            }}>
              AC
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#8b0000'
            }}>
              {hero.ac}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#8b4513',
              textTransform: 'uppercase'
            }}>
              Initiative
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#006400'
            }}>
              {hero.init >= 0 ? '+' : ''}{hero.init}
            </div>
          </div>
        </div>

        {/* Ability Scores */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
          marginBottom: '0.75rem'
        }}>
          {[
            { name: 'STR', value: hero.str },
            { name: 'DEX', value: hero.dex },
            { name: 'CON', value: hero.con },
            { name: 'INT', value: hero.int },
            { name: 'WIS', value: hero.wis },
            { name: 'CHA', value: hero.cha }
          ].map(stat => (
            <div
              key={stat.name}
              style={{
                backgroundColor: '#e8dcc8',
                border: '2px solid #8b4513',
                borderRadius: '4px',
                padding: '0.4rem',
                textAlign: 'center'
              }}
            >
              <div style={{
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#8b4513',
                marginBottom: '2px'
              }}>
                {stat.name}
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#2c1810',
                lineHeight: '1'
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#666',
                marginTop: '2px'
              }}>
                {getModifier(stat.value)}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Info */}
        <div style={{
          borderTop: '2px solid #8b4513',
          paddingTop: '0.5rem',
          fontSize: '13px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: 'bold', color: '#8b4513' }}>
              Passive Perception
            </span>
            <span style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#2c1810',
              backgroundColor: '#e8dcc8',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid #8b4513'
            }}>
              {hero.pp}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
