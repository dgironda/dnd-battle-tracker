import { useState } from "react";
import { Hero, Combatant } from '../../types/index';

interface AddHeroProps {
  onAddHero: (hero: Omit<Hero, "id">) => void;
}

export default function AddHero({ onAddHero }: AddHeroProps) {
  const [form, setForm] = useState<Omit<Hero, "id">>({
    name: "",
    player: "",
    hp: 0,
    ac: 0,
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    pp: 10,
    init: 0,
    present: false,
  });

  const handleAddHero = () => {
    if (!form.name.trim()) {
      alert('Please enter a name');
      return;
    }

    if (!form.player.trim()) {
      alert('Please enter a player name');
      return;
    }

    onAddHero(form);
    
    // Reset form
    setForm({
      name: "",
      player: "",
      hp: 0,
      ac: 0,
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      pp: 10,
      init: 0,
      present: false,
    });
  };

  return (
    <div id="addHeroOuter">
      <h3 style={{ marginTop: 0 }}>Add New Hero</h3>
      <div id="addHeroInner">
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="Player"
          value={form.player}
          onChange={(e) => setForm({ ...form, player: e.target.value })}
        />
        <input
          type="number"
          placeholder="HP"
          value={form.hp || ''}
          onChange={(e) => setForm({ ...form, hp: Number(e.target.value) || 0 })}
        />
        <input
          type="number"
          placeholder="AC"
          value={form.ac || ''}
          onChange={(e) => setForm({ ...form, ac: Number(e.target.value) || 0 })}
        />
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={form.present}
            onChange={(e) => setForm({ ...form, present: e.target.checked })}
          />
          Present?
        </label>
        <button onClick={handleAddHero}>
          Add Hero
        </button>
      </div>
    </div>
  );
}
