import { useState } from "react";
import { Hero } from "./Hero";

interface AddHeroProps {
  onAddHero: (hero: Omit<Hero, "id">) => void;
}

export default function AddHero({ onAddHero }: AddHeroProps) {
  const [form, setForm] = useState<Omit<Hero, "id">>({
    name: "",
    player: "",
    hp: 0,
    ac: 0,
    str: 0,
    dex: 0,
    con: 0,
    int: 0,
    wis: 0,
    cha: 0,
    pp: 0,
    present: false,
  });

  const handleAddHero = () => {
    if (!form.name.trim()) {
      alert('Please enter a name');
      return;
    }

    onAddHero(form);
    
    // Reset form
    setForm({
      name: "",
      player: "",
      hp: 0,
      ac: 0,
      str: 0,
      dex: 0,
      con: 0,
      int: 0,
      wis: 0,
      cha: 0,
      pp: 0,
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
