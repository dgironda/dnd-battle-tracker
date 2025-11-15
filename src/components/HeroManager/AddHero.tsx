import { DEVMODE } from "../../utils/devmode";

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
    tHp: 0,
    ac: 0,
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    pp: 10,
    init: 0,
    present: true,
  });

  const handleAddHero = () => {
    if (!form.name.trim()) {
      alert('Please enter a name');
      return;
    }

    // if (!form.player.trim()) {
    //   alert('Please enter a player name');
    //   return;
    // }

    onAddHero(form);
    
    // Reset form
    setForm({
      name: "",
      player: "",
      hp: 0,
      tHp: 0,
      ac: 0,
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      pp: 10,
      init: 0,
      present: true,
    });
    
  };

  const keyDownAddHero = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault(); 
      handleAddHero(); 
    }
  };

  return (
    <div id="addHeroOuter">
      <h3>Add New Hero</h3>
      <div id="addHeroInner">
        <input
          placeholder="Name"
          value={form.name}
          onKeyDown={keyDownAddHero}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="Player"
          value={form.player}
          onKeyDown={keyDownAddHero}
          onChange={(e) => setForm({ ...form, player: e.target.value })}
        />
        <input
          type="number"
          placeholder="HP"
          value={form.hp || ''}
          onKeyDown={keyDownAddHero}
          onChange={(e) => setForm({ ...form, hp: Number(e.target.value) || 0 })}
        />
        <input
          type="number"
          placeholder="AC"
          value={form.ac || ''}
          onKeyDown={keyDownAddHero}
          onChange={(e) => setForm({ ...form, ac: Number(e.target.value) || 0 })}
        />
      </div>
      
      <div className="addPresent-div">
        {/* <label>
          <input
            type="checkbox"
            checked={form.present}
            onChange={(e) => setForm({ ...form, present: e.target.checked })}
          />
          Present?
        </label> */}
        <button onClick={handleAddHero}>
          Add Hero
        </button>
      </div>
    </div>
  );
}
