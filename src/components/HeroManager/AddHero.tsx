import { useState } from "react";
import { Hero } from '../../types/index';
import { notify } from '../../utils/notify';

interface AddHeroProps {
  onAddHero: (hero: Omit<Hero, "id">) => void;
}

const DEFAULTS = { hp: 10, ac: 10, pp: 10 };

export default function AddHero({ onAddHero }: AddHeroProps) {
  // The numeric fields are kept as strings so an empty box stays empty. The
  // old version stored numbers and rendered `form.hp === 10 ? '' : form.hp`,
  // which made the field blank itself the moment you typed "10".
  const [name, setName] = useState("");
  const [player, setPlayer] = useState("");
  const [hp, setHp] = useState("");
  const [ac, setAc] = useState("");

  const reset = () => {
    setName("");
    setPlayer("");
    setHp("");
    setAc("");
  };

  const handleAddHero = async () => {
    if (!name.trim()) {
      await notify("Give your hero a name.", { title: "Name required" });
      return;
    }

    const parse = (raw: string, fallback: number) => {
      const value = Number(raw.trim());
      return raw.trim() !== "" && Number.isFinite(value) ? value : fallback;
    };

    const maxHp = parse(hp, DEFAULTS.hp);

    onAddHero({
      name: name.trim(),
      player: player.trim(),
      hp: maxHp,
      currHp: maxHp,
      maxHp,
      tHp: 0,
      ac: parse(ac, DEFAULTS.ac),
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      pp: DEFAULTS.pp,
      init: 0,
      link: "",
      present: true,
      conditions: [],
      notes: "",
    });

    reset();
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
          id="addHeroName"
          placeholder="Name"
          aria-label="Hero name"
          value={name}
          onKeyDown={keyDownAddHero}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          id="addHeroPlayer"
          placeholder="Player"
          aria-label="Player name"
          value={player}
          onKeyDown={keyDownAddHero}
          onChange={(e) => setPlayer(e.target.value)}
        />
        <input
          id="addHeroHP"
          type="number"
          placeholder={`HP (default ${DEFAULTS.hp})`}
          aria-label="Hit points"
          value={hp}
          onKeyDown={keyDownAddHero}
          onChange={(e) => setHp(e.target.value)}
        />
        <input
          id="addHeroAC"
          type="number"
          placeholder={`AC (default ${DEFAULTS.ac})`}
          aria-label="Armour class"
          value={ac}
          onKeyDown={keyDownAddHero}
          onChange={(e) => setAc(e.target.value)}
        />
      </div>

      <div className="addPresent-div">
        <button id="addNewHeroButton" onClick={handleAddHero}>Add Hero</button>
      </div>
    </div>
  );
}
