import { DEVMODE } from "../../utils/devmode";
import { useState } from "react";
import { Hero } from '../../types/index';

interface AddHeroProps {
  onAddHero: (hero: Omit<Hero, "id">) => void;
}

export default function AddHero({ onAddHero }: AddHeroProps) {
  const initialForm: Omit<Hero, 'id'> = {
    name: "",
    player: "",
    hp: 10,
    currHp: 10,
    maxHp: 10,
    link: "",
    tHp: 0,
    ac: 10,
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    pp: 10,
    init: 0,
    present: true,
    conditions: [],
  };

  const [form, setForm] = useState<Omit<Hero, "id">>(initialForm);

  const handleAddHero = () => {
    if (!form.name.trim()) {
      alert('Please enter a name');
      return;
    }

    // Ensure numeric values are proper numbers
    const heroToAdd: Omit<Hero, "id"> = {
      ...form,
      hp: Number(form.hp) || 10,
      currHp: Number(form.currHp) || Number(form.hp) || 10,
      maxHp: Number(form.maxHp) || Number(form.hp) || 10,
      ac: Number(form.ac) || 10,
      str: Number(form.str) || 10,
      dex: Number(form.dex) || 10,
      con: Number(form.con) || 10,
      int: Number(form.int) || 10,
      wis: Number(form.wis) || 10,
      cha: Number(form.cha) || 10,
      pp: Number(form.pp) || 10,
      init: Number(form.init) || 0,
    };

    onAddHero(heroToAdd);
    setForm(initialForm);
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
          value={form.hp}
          onKeyDown={keyDownAddHero}
          onChange={(e) => setForm({ 
            ...form, 
            hp: Number(e.target.value) || 0, 
            currHp: Number(e.target.value) || 0,
            maxHp: Number(e.target.value) || 0 
          })}
        />
        <input
          type="number"
          placeholder="AC"
          value={form.ac}
          onKeyDown={keyDownAddHero}
          onChange={(e) => setForm({ ...form, ac: Number(e.target.value) || 0 })}
        />
      </div>

      <div className="addPresent-div">
        <button onClick={handleAddHero}>Add Hero</button>
      </div>
    </div>
  );
}
