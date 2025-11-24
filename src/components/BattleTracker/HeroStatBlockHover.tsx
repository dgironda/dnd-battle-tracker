import { useState } from 'react';
import { Hero } from '../../types/index';
import { getHeroes, storeHeroes } from "../../utils/LocalStorage";
import { createAddHero, createUpdateHero, createDeleteHero, EditableCell } from "../Utils";

interface HeroStatBlockHoverProps {
  hero?: Hero; // <-- optional to avoid undefined crash
  children: React.ReactNode;
}

export function HeroStatBlockHover({ hero, children }: HeroStatBlockHoverProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [heroes, setHeroes] = useState<Hero[]>(() => getHeroes() || []);
  const updateHero = createUpdateHero(setHeroes);

  const safe = <T,>(value: T | undefined | null, fallback: T): T =>
    value !== undefined && value !== null ? value : fallback;

  const getModifier = (stat: number): string => {
    const mod = Math.floor((stat - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  // SAFE FIELDS
  const name = safe(hero?.name, "Unknown Hero");
  const player = safe(hero?.player, "Unknown Player");
  const ac = safe(hero?.ac, 0);
  const init = safe(hero?.init, 0);
  const stats = {
    STR: safe(hero?.str, 10),
    DEX: safe(hero?.dex, 10),
    CON: safe(hero?.con, 10),
    INT: safe(hero?.int, 10),
    WIS: safe(hero?.wis, 10),
    CHA: safe(hero?.cha, 10),
  };
  const pp = safe(hero?.pp, 10);
  const id = safe(hero?.id, hero?.name);

  return (
    <div
      onMouseEnter={() => !isStuck && setIsHovering(true)}
      onMouseLeave={() => !isStuck && setIsHovering(false)}
      onClick={() => setIsStuck(!isStuck)}
      style={{ display: 'inline-block' }}
    >
      {children}

      {/* Slide-in stat block */}
      <div
        style={{
          position: 'fixed',
          top: '25%',
          left: (isHovering || isStuck) ? '0px' : '-380px',
          transform: 'translateY(-50%)',
          opacity: (isHovering || isStuck) ? 1 : 0,
          transition: 'left 0.35s ease-out, opacity 0.3s ease-out',
          backgroundColor: '#f4e8d8',
          border: '3px solid #8b4513',
          borderRadius: '8px',
          padding: '1rem',
          width: '320px',
          boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
          zIndex: 10000,
          fontFamily: '"Bookman Old Style", serif',
          color: '#2c1810',
          pointerEvents: isStuck ? 'auto' : 'none',
        }}
      >
        {/* Header */}
        <div style={{ borderBottom: '2px solid #8b4513', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#8b0000', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {name}
          </h3>
          <div style={{ fontSize: '13px', fontStyle: 'italic', color: '#555', marginTop: '2px' }}>
            Player: {player}
          </div>
        </div>

        {/* Top Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '0.75rem', padding: '0.5rem', backgroundColor: '#e8dcc8', borderRadius: '4px', border: '1px solid #8b4513' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#8b4513', textTransform: 'uppercase' }}>AC</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b0000' }}>{ac}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#8b4513', textTransform: 'uppercase' }}>Initiative</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#006400' }}>{init >= 0 ? '+' : ''}{init}</div>
          </div>
        </div>

        {/* Ability Scores */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {Object.entries(stats).map(([label, value]) => (
            <div key={label} style={{ backgroundColor: '#e8dcc8', border: '2px solid #8b4513', borderRadius: '4px', padding: '0.4rem', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#8b4513', marginBottom: '2px' }}>{label}</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c1810', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{getModifier(value)}</div>
            </div>
          ))}
        </div>

        {/* Bottom Info */}
        <div style={{ borderTop: '2px solid #8b4513', paddingTop: '0.5rem', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', color: '#8b4513' }}>Passive Perception</span>
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c1810', backgroundColor: '#e8dcc8', padding: '2px 8px', borderRadius: '4px', border: '1px solid #8b4513' }}>
              {pp}
            </span>
          </div>
        </div>
        <div className={`${id}-notes`}>
          Notes: {heroes.filter(h => h.id === id).map(h => (
            <EditableCell
          entity={h}
          field='notes'
          type='textarea'
          editingField={editingField}
          setEditingField={setEditingField}
          updateEntity={updateHero}
          />
          ))}
          
        </div>
      </div>
    </div>
  );
}
