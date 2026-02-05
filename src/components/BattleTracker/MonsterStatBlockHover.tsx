import { useState, useCallback } from 'react';
import { Monster, Combatant } from '../../types/index';
import { createUpdateMonster, createDeleteMonster, EditableCell } from "../../utils/Utils";
import { getCombatants, getMonsters, storeMonsters } from '../../utils/LocalStorage';
import { conditionDescriptionsTwentyFourteen, conditionDescriptionsTwentyTwentyFour } from '../../constants/Conditions';
import { useGlobalContext } from '../../hooks/optionsContext';

interface MonsterStatBlockHoverProps {
  monster: Monster;
  currentHp?: number;
  children: React.ReactNode;
  updateCombatant: (combatantID:string, field:keyof Combatant, value:any) => void;
}

export function MonsterStatBlockHover({ monster, currentHp, children, updateCombatant }: MonsterStatBlockHoverProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [combatants, setCombatants] = useState<Combatant[]>(() => getCombatants() || []);
  const [showConditions, setShowConditions] = useState(false);
  const toggleConditions = () => {
    setShowConditions(prevState => !prevState);
  };

  const safe = <T,>(value: T | undefined | null, fallback: T): T =>
    value !== undefined && value !== null ? value : fallback;

  const safeStat = (value: number | undefined | null) => (typeof value === 'number' ? value : 10);

  const getModifier = (stat: number): string => {
    const mod = Math.floor((stat - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };
  const { settings } = useGlobalContext();
  const conditionDescriptions = settings.version === 'twentyFourteen' ? conditionDescriptionsTwentyFourteen : conditionDescriptionsTwentyTwentyFour;

  function closeStatsButton() {
    setIsStuck(false)
    setIsHovering(false)
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

  // Safe fields
  const name = safe(monster.name, 'Unknown Creature');
  const link = safe(monster.link, '');
  const ac = safe(monster.ac, 10);
  const baseHp = safe(currentHp ?? monster.currHp ?? monster.maxHp ?? 1, 1);
  const initiative = safe(monster.init, 0);
  const id = safe(monster.id, monster.name);

  const stats = {
    STR: safeStat(monster.str),
    DEX: safeStat(monster.dex),
    CON: safeStat(monster.con),
    INT: safeStat(monster.int),
    WIS: safeStat(monster.wis),
    CHA: safeStat(monster.cha),
  };

  const pp = safe(monster.pp, 10);

  return (
    <div
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={() => setIsStuck(!isStuck)} style={{left: '0px', opacity: 1}}
    >
      {children}

      <div
        className='statHover monsterStatHover'
        style={{
          position: 'fixed',
          top: '5vh',
          left: (isHovering || isStuck) ? '0px' : '-380px',
          transform: 'translateY(0)',
          opacity: (isHovering || isStuck) ? 1 : 0,
          transition: 'left 0.35s ease-out, opacity 0.3s ease-out',
        }}
      >
        <button className='closeStats'
          onClick={closeStatsButton}>X
        </button>
        <div className='monsterStatName'>
          <h3>
            {name}
          </h3>  
        </div>
          {link && (
            <div className='monsterStatLink'>
              <a href={link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                View Full Stat Block →
              </a>

            </div>
          )}
        <div className='monsterStatACHPInit'>
          <div>
            <span>Armor Class </span>
            <span>{ac}</span>
          </div>
          <div>
            <span>Hit Points </span>
            <span>{baseHp}</span>
          </div>
          <div>
            <span>Initiative </span>
            <span>{initiative >= 0 ? '+' : ''}{initiative}</span>
          </div>
        </div>

        <div className='monsterStatAbility'>
          {Object.entries(stats).map(([label, value]) => (
            <div key={label}>
              <div>{label}</div>
              <div>
                {value} ({getModifier(value)})
              </div>
            </div>
          ))}
        </div>

        <div className='monsterStatPP'>
          {/* <span style={{ fontWeight: 'bold' }}>Senses </span> */}
          <span>Passive Perception {pp}</span>
        </div>
        <div className='monsterStatConditions' onClick={toggleConditions} >
          <div>
          Current conditions:{monster.conditions.map((conditionName) => (
            <div
            key={conditionName}>
              <span className="monsterStatConditionsName">{conditionName}</span>{showConditions && (<span className={`${conditionName}-description`}>: {conditionDescriptions[conditionName]}</span>)}
            </div>
          ))}
        </div>
        
        
        </div>
        <div className={`${id}-notes`}>
          Notes: {combatants.filter(c => c.id === id).map(c => (
            <EditableCell
          key={`${id}-notes`}
          entity={c}
          field='notes'
          type='textarea'
          editingField={editingField}
          setEditingField={setEditingField}
          updateEntity={updateCombatant}
          />
          ))}
          
        </div>
      </div>
    </div>
  );
}
