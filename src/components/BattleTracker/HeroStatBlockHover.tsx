import { Hero, Combatant } from '../../types/index';
import { createUpdateHero } from "../../utils/Utils";
import { useHeroes } from "../../hooks/useHeroes";
import { StatConditions, StatNotes, StatPanel } from './StatPanel';
import { abilityModifier, orDefault } from './statValues';


interface HeroStatBlockHoverProps {
  hero?: Hero; // <-- optional to avoid undefined crash
  children: React.ReactNode;
  combatant?: Combatant;
}

export function HeroStatBlockHover({ hero, children, combatant }: HeroStatBlockHoverProps) {
  // Shared roster. This component renders once per hero row, so the old
  // private useState + storeHeroes effect meant N copies of the whole list all
  // writing to localStorage on mount.
  const { heroes, setHeroes } = useHeroes();
  const updateHero = createUpdateHero(setHeroes);

  // SAFE FIELDS
  const name = orDefault(hero?.name, "Unknown Hero");
  const player = orDefault(hero?.player, "Unknown Player");
  const ac = orDefault(hero?.ac, 0);
  const init = orDefault(hero?.init, 0);
  const stats = {
    STR: orDefault(hero?.str, 10),
    DEX: orDefault(hero?.dex, 10),
    CON: orDefault(hero?.con, 10),
    INT: orDefault(hero?.int, 10),
    WIS: orDefault(hero?.wis, 10),
    CHA: orDefault(hero?.cha, 10),
  };
  const pp = orDefault(hero?.pp, 10);
  const id = orDefault(hero?.id, hero?.name ?? '');

  return (
    <StatPanel kind="hero" trigger={children}>
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
            <div>{abilityModifier(value)}</div>
          </div>
        ))}
      </div>

      {/* Bottom Info */}
      <div className='heroStatPP'>
        <span>Passive Perception</span>
        <span>{pp}</span>
      </div>
      <StatConditions
        className='heroStatConditions'
        conditions={combatant?.conditions ?? []}
        holder={combatant}
        tipKey={`hero-${combatant?.id ?? hero?.id ?? 'x'}`}
      />
      <StatNotes id={id} entries={heroes.filter((h) => h.id === id)} updateEntity={updateHero} />
    </StatPanel>
  );
}
