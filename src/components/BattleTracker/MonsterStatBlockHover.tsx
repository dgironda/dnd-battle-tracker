import { Monster, Combatant } from '../../types/index';
import { useCombat } from './CombatContext';
import { safeLink } from '../../utils/links';
import { StatConditions, StatNotes, StatPanel } from './StatPanel';
import { abilityModifier, orDefault } from './statValues';

interface MonsterStatBlockHoverProps {
  monster: Monster;
  currentHp?: number;
  children: React.ReactNode;
  updateCombatant: (
    combatantID: string,
    field: keyof Combatant,
    value: string | number | boolean | string[]
  ) => void;
}

export function MonsterStatBlockHover({ monster, currentHp, children, updateCombatant }: MonsterStatBlockHoverProps) {
  // Combatants come from the shared combat context. This used to be a private
  // copy seeded from localStorage on mount, so the notes shown here drifted out
  // of step with the tracker.
  const { combatants } = useCombat();

  const safeStat = (value: number | undefined | null) => (typeof value === 'number' ? value : 10);

  // Safe fields
  const name = orDefault(monster.name, 'Unknown Creature');
  /* Filtered, not just defaulted: this goes straight into an href, and the
     link came from whoever typed it — see safeLink. */
  const link = safeLink(monster.link);
  const ac = orDefault(monster.ac, 10);
  const baseHp = orDefault(currentHp ?? monster.currHp ?? monster.maxHp ?? 1, 1);
  const initiative = orDefault(monster.init, 0);
  const id = orDefault(monster.id, monster.name);
  /* The durations live on the combatant in the fight, not on the roster entry
     this panel is handed. */
  const inFight = combatants.find((c) => c.id === id);

  const stats = {
    STR: safeStat(monster.str),
    DEX: safeStat(monster.dex),
    CON: safeStat(monster.con),
    INT: safeStat(monster.int),
    WIS: safeStat(monster.wis),
    CHA: safeStat(monster.cha),
  };

  const pp = orDefault(monster.pp, 10);

  return (
    <StatPanel kind="monster" trigger={children}>
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
              {value} ({abilityModifier(value)})
            </div>
          </div>
        ))}
      </div>

      <div className='monsterStatPP'>
        <span>Passive Perception {pp}</span>
      </div>
      <StatConditions
        className='monsterStatConditions'
        conditions={monster.conditions}
        holder={inFight}
        tipKey={`monster-${monster.id ?? monster.name}`}
      />
      <StatNotes id={id} entries={combatants.filter((c) => c.id === id)} updateEntity={updateCombatant} />
    </StatPanel>
  );
}
