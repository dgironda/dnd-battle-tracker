import { useState, useEffect, useCallback } from 'react';
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

  function closeStatsButton() {
    setIsStuck(false)
  }

  const handleKeyPressx = useCallback((event:KeyboardEvent) => {
    if (event.key === 'x' || event.key === 'X')
    {let statsHover = document.querySelectorAll('.statHover') as NodeListOf<HTMLElement>;
      statsHover.forEach(hover => {
        setIsStuck(false)
        hover.style.opacity = '0'
        hover.style.left = '-300'
      })
    };
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPressx);
    return () => {
      document.removeEventListener('keydown', handleKeyPressx);
    };
  }, [handleKeyPressx]);

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

    useEffect(() => {
    storeHeroes(heroes)
  }, [heroes]) 

  return (
    <div
      
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={() => setIsStuck(!isStuck)}  style={{left: '0px', opacity: 1}}
    >
      {children}

      {/* Slide-in stat block */}
      <div
        className='statHover heroStatHover'
        style={{
          position: 'fixed',
          top: '5vh',
          left: (isHovering || isStuck) ? '0px' : '-380px',
          transform: 'translateY(0)',
          opacity: (isHovering || isStuck) ? 1 : 0,
          transition: 'left 0.35s ease-out, opacity 0.3s ease-out',
        }}
      >
        {/* Header */}
        <button className='closeStats'
          onClick={closeStatsButton}>X
        </button>
        <div className='heroStatHeader'>
          <h3 className='heroStatHeaderName'>
            {name}
          </h3>
          <div className='heroStatHeaderPlayer'>
            Player: {player}
          </div>
        </div>

        {/* Top Stats */}
        <div className='heroStatACInit'>
          <div>
            <div>AC</div>
            <div>{ac}</div>
          </div>
          <div>
            <div>Initiative</div>
            <div>{init >= 0 ? '+' : ''}{init}</div>
          </div>
        </div>

        {/* Ability Scores */}
        <div className='heroStatAbility'>
          {Object.entries(stats).map(([label, value]) => (
            <div key={label}>
              <div>{label}</div>
              <div>{value}</div>
              <div>{getModifier(value)}</div>
            </div>
          ))}
        </div>

        {/* Bottom Info */}
        <div className='heroStatPP'>
          <span>Passive Perception</span>
          <span>{pp}</span>
        </div>
        <div className={`${id}-notes`}>
          Notes: {heroes.filter(h => h.id === id).map(h => (
            <EditableCell
          key={`${id}-notes`}
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
