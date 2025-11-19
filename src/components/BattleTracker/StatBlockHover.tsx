import { useState } from 'react';
import { Hero } from '../../types/index';

interface StatBlockHoverProps {
  hero: Hero;
  currentHp?: number;
  tempHp?: number;
  children: React.ReactNode;
}

export function StatBlockHover({ hero, currentHp, tempHp = 0, children }: StatBlockHoverProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    setIsHovering(true);
    updatePosition(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    updatePosition(e);
  };

  const updatePosition = (e: React.MouseEvent) => {
    setPosition({
      x: e.clientX + 20,
      y: e.clientY - 100
    });
  };

  const getModifier = (stat: number): string => {
    const mod = Math.floor((stat - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const displayHp = currentHp !== undefined ? currentHp : hero.hp;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
      style={{ display: 'inline-block' }}
    >
      {children}
      
      {isHovering && (
        <div
          style={{
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            backgroundColor: '#f4e8d8',
            border: '3px solid #8b4513',
            borderRadius: '8px',
            padding: '1rem',
            width: '320px',
            boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
            zIndex: 10000,
            fontFamily: '"Bookman Old Style", serif',
            color: '#2c1810',
            pointerEvents: 'none'
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
                HP
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#8b0000'
              }}>
                {displayHp}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#8b4513',
                textTransform: 'uppercase'
              }}>
                Temp HP
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#4169e1'
              }}>
                {tempHp}
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
      )}
    </div>
  );
}

// Example usage component
export default function ExampleUsage() {
  const exampleHero: Hero = {
    id: '1',
    name: "Thorin Ironforge",
    player: "John",
    hp: 45,
    tHp: 0,
    ac: 18,
    str: 16,
    dex: 10,
    con: 14,
    int: 8,
    wis: 12,
    cha: 13,
    pp: 14,
    init: 2,
    present: true
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h2>Hover over the combatant name to see their stat block:</h2>
      
      <div style={{ marginTop: '2rem' }}>
        <StatBlockHover hero={exampleHero} currentHp={32} tempHp={8}>
          <span style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#e8dcc8',
            border: '2px solid #8b4513',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'inline-block'
          }}>
            {exampleHero.name} ⓘ
          </span>
        </StatBlockHover>
      </div>
      
      <p style={{ marginTop: '2rem', color: '#666', fontSize: '14px' }}>
        Wrap any element with &lt;StatBlockHover&gt; to show character stats on hover
      </p>
    </div>
  );
}