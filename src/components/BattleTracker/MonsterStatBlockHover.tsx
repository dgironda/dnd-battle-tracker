import { useState } from 'react';
import { Monster } from '../../types/index';

interface MonsterStatBlockHoverProps {
  monster: Monster;
  currentHp?: number;
  children: React.ReactNode;
}

export function MonsterStatBlockHover({ monster, currentHp, children }: MonsterStatBlockHoverProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    setIsHovering(true);
    setPosition({
      x: e.clientX,
      y: e.clientY - 100
    });
  };

//   const handleMouseMove = (e: React.MouseEvent) => {
//     updatePosition(e);
//   };

//   const updatePosition = (e: React.MouseEvent) => {
//     setPosition({
//       x: e.clientX + 20,
//       y: e.clientY - 100
//     });
//   };

  const getModifier = (stat: number): string => {
    const mod = Math.floor((stat - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const displayHp = currentHp !== undefined ? currentHp : monster.hp;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovering(false)}
      style={{ display: 'inline-block' }}
    >
      {children}
      
      {isHovering && (
        <div
          style={{
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            backgroundColor: '#fdf8f3',
            border: '2px solid #58180d',
            borderRadius: '4px',
            padding: '1rem',
            width: '350px',
            boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
            zIndex: 10000,
            fontFamily: 'Georgia, serif',
            color: '#58180d',
            pointerEvents: 'auto'
          }}
        >
          {/* Header */}
          <div style={{
            borderBottom: '2px solid #58180d',
            paddingBottom: '0.25rem',
            marginBottom: '0.5rem'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#58180d',
              fontVariant: 'small-caps',
              letterSpacing: '1px',
              lineHeight: '1.2'
            }}>
              {monster.name}
            </h3>
            {monster.link && (
              <div style={{
                fontSize: '11px',
                color: '#822000',
                marginTop: '2px',
                fontStyle: 'italic'
              }}>
                <a 
                  href={monster.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#822000', textDecoration: 'underline' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  View Full Stat Block →
                </a>
              </div>
            )}
          </div>

          {/* Armor Class and Hit Points Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
            padding: '0.4rem 0',
            borderBottom: '1px solid #c9ad6a'
          }}>
            <div>
              <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Armor Class </span>
              <span style={{ fontSize: '13px', color: '#822000' }}>{monster.ac}</span>
            </div>
            <div>
              <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Hit Points </span>
              <span style={{ 
                fontSize: '13px', 
                color: displayHp < monster.hp / 2 ? '#b71c1c' : '#822000',
                fontWeight: displayHp < monster.hp / 2 ? 'bold' : 'normal'
              }}>
                {displayHp}
              </span>
            </div>
            <div>
              <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Initiative </span>
              <span style={{ fontSize: '13px', color: '#822000' }}>
                {monster.init >= 0 ? '+' : ''}{monster.init}
              </span>
            </div>
          </div>

          {/* Speed/Divider */}
          <div style={{
            height: '2px',
            background: 'linear-gradient(to right, #58180d, #c9ad6a, #58180d)',
            margin: '0.5rem 0'
          }} />

          {/* Ability Scores */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '0.25rem',
            marginBottom: '0.5rem',
            textAlign: 'center',
            fontSize: '11px'
          }}>
            {[
              { name: 'STR', value: monster.str },
              { name: 'DEX', value: monster.dex },
              { name: 'CON', value: monster.con },
              { name: 'INT', value: monster.int },
              { name: 'WIS', value: monster.wis },
              { name: 'CHA', value: monster.cha }
            ].map(stat => (
              <div key={stat.name}>
                <div style={{
                  fontWeight: 'bold',
                  color: '#58180d',
                  fontSize: '10px'
                }}>
                  {stat.name}
                </div>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#822000'
                }}>
                  {stat.value} ({getModifier(stat.value)})
                </div>
              </div>
            ))}
          </div>

          {/* Second Divider */}
          <div style={{
            height: '2px',
            background: 'linear-gradient(to right, #58180d, #c9ad6a, #58180d)',
            margin: '0.5rem 0'
          }} />

          {/* Senses */}
          <div style={{
            fontSize: '12px',
            marginBottom: '0.25rem'
          }}>
            <span style={{ fontWeight: 'bold' }}>Senses </span>
            <span>passive Perception {monster.pp}</span>
          </div>

          {/* Note */}
          <div style={{
            marginTop: '0.75rem',
            padding: '0.5rem',
            backgroundColor: '#f5ebe0',
            borderLeft: '3px solid #c9ad6a',
            fontSize: '11px',
            fontStyle: 'italic',
            color: '#666'
          }}>
            Hover over abilities and traits in the full stat block for details
          </div>
        </div>
      )}
    </div>
  );
}

// Example usage component
export default function ExampleUsage() {
  const exampleMonster: Monster = {
    id: '1',
    name: "Adult Red Dragon",
    link: "https://www.dndbeyond.com/monsters/17008-adult-red-dragon",
    hp: 256,
    ac: 19,
    str: 27,
    dex: 10,
    con: 25,
    int: 16,
    wis: 13,
    cha: 21,
    pp: 23,
    init: 0,
    hidden: false,
    present: true,
    conditions: []
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h2>Hover over the monster name to see its stat block:</h2>
      
      <div style={{ marginTop: '2rem' }}>
        <MonsterStatBlockHover monster={exampleMonster} currentHp={180}>
          <span style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#fdf8f3',
            border: '2px solid #58180d',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'inline-block',
            color: '#58180d'
          }}>
            {exampleMonster.name} 🐉
          </span>
        </MonsterStatBlockHover>
      </div>
      
      <p style={{ marginTop: '2rem', color: '#666', fontSize: '14px' }}>
        Wrap any element with &lt;MonsterStatBlockHover&gt; to show monster stats on hover
      </p>
    </div>
  );
}