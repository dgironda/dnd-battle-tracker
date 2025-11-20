import { useState } from 'react';
import { Monster } from '../../types/index';

interface MonsterStatBlockHoverProps {
  monster: Monster;
  currentHp?: number;
  children: React.ReactNode;
}

export function MonsterStatBlockHover({ monster, currentHp, children }: MonsterStatBlockHoverProps) {
  const [isHovering, setIsHovering] = useState(false);

  // SAFE ACCESS HELPERS
  const safe = <T,>(value: T | undefined | null, fallback: T): T =>
    value !== undefined && value !== null ? value : fallback;

  const safeStat = (value: number | undefined | null) =>
    typeof value === "number" ? value : 10;

  const getModifier = (stat: number): string => {
    const mod = Math.floor((stat - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  // SAFE FIELDS
  const name = safe(monster?.name, "Unknown Creature");
  const link = safe(monster?.link, null);
  const ac = safe(monster?.ac, "—");
  const baseHp = safe(monster?.hp, 1);
  const initiative = safe(monster?.init, 0);

  const displayHp = currentHp !== undefined ? currentHp : baseHp;

  const stats = {
    STR: safeStat(monster?.str),
    DEX: safeStat(monster?.dex),
    CON: safeStat(monster?.con),
    INT: safeStat(monster?.int),
    WIS: safeStat(monster?.wis),
    CHA: safeStat(monster?.cha)
  };

  const pp = safe(monster?.pp, 10);

  return (
    <div
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{ display: 'inline-block' }}
    >
      {children}

      {/* Slide-in monster stat block */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          right: isHovering ? '0px' : '-400px',
          transform: 'translateY(-50%)',
          opacity: isHovering ? 1 : 0,
          transition: 'right 0.35s ease-out, opacity 0.3s ease-out',

          backgroundColor: '#fdf8f3',
          border: '2px solid #58180d',
          borderRadius: '4px',
          padding: '1rem',
          width: '350px',
          boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
          zIndex: 10000,
          fontFamily: 'Georgia, serif',
          color: '#58180d',
          pointerEvents: 'none',
        }}
      >
        {/* Header */}
        <div
          style={{
            borderBottom: '2px solid #58180d',
            paddingBottom: '0.25rem',
            marginBottom: '0.5rem',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#58180d',
              fontVariant: 'small-caps',
              letterSpacing: '1px',
              lineHeight: '1.2',
            }}
          >
            {name}
          </h3>

          {link && (
            <div
              style={{
                fontSize: '11px',
                color: '#822000',
                marginTop: '2px',
                fontStyle: 'italic',
              }}
            >
              <a
                href={link}
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

        {/* AC / HP / Initiative */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
            padding: '0.4rem 0',
            borderBottom: '1px solid #c9ad6a',
          }}
        >
          <div>
            <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Armor Class </span>
            <span style={{ fontSize: '13px', color: '#822000' }}>{ac}</span>
          </div>
          <div>
            <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Hit Points </span>
            <span
              style={{
                fontSize: '13px',
                color: displayHp < baseHp / 2 ? '#b71c1c' : '#822000',
                fontWeight: displayHp < baseHp / 2 ? 'bold' : 'normal',
              }}
            >
              {displayHp}
            </span>
          </div>
          <div>
            <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Initiative </span>
            <span style={{ fontSize: '13px', color: '#822000' }}>
              {initiative >= 0 ? '+' : ''}
              {initiative}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: '2px',
            background: 'linear-gradient(to right, #58180d, #c9ad6a, #58180d)',
            margin: '0.5rem 0',
          }}
        />

        {/* Ability Scores */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '0.25rem',
            marginBottom: '0.5rem',
            textAlign: 'center',
            fontSize: '11px',
          }}
        >
          {Object.entries(stats).map(([label, value]) => (
            <div key={label}>
              <div
                style={{
                  fontWeight: 'bold',
                  color: '#58180d',
                  fontSize: '10px',
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#822000',
                }}
              >
                {value} ({getModifier(value)})
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            height: '2px',
            background: 'linear-gradient(to right, #58180d, #c9ad6a, #58180d)',
            margin: '0.5rem 0',
          }}
        />

        {/* Senses */}
        <div
          style={{
            fontSize: '12px',
            marginBottom: '0.25rem',
          }}
        >
          <span style={{ fontWeight: 'bold' }}>Senses </span>
          <span>passive Perception {pp}</span>
        </div>
      </div>
    </div>
  );
}
