import { useState, useEffect } from "react";
import { getHeroes, storeHeroes } from './LocalStorage';

interface Hero {
  id: string;
  name: string;
  player: string;
  hp: number;
  ac: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  pp: number;
  present: boolean;
}

export default function HeroManager() {
  const [heroes, setHeroes] = useState<Hero[]>(() => {
    return getHeroes();
  });
  useEffect(() => {
    storeHeroes(heroes);
  }, [heroes]);
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

  const addHero = () => {
    setHeroes([...heroes, { ...form, id: crypto.randomUUID() }]);
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
    <div style={{ marginTop: "2rem" }}>
      <h2>Hero Manager</h2>
      <div style={{ marginBottom: "1rem" }}>
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
          value={form.hp}
          onChange={(e) => setForm({ ...form, hp: Number(e.target.value) })}
        />
        <input
          type="number"
          placeholder="AC"
          value={form.ac}
          onChange={(e) => setForm({ ...form, ac: Number(e.target.value) })}
        />
        <label>
          Present?
          <input
            type="checkbox"
            checked={form.present}
            onChange={(e) => setForm({ ...form, present: e.target.checked })}
          />
        </label>
        <button onClick={addHero}>Add Hero</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Player</th>
            <th>HP</th>
            <th>AC</th>
            <th>Present</th>
          </tr>
        </thead>
        <tbody>
          {heroes.map((h) => (
            <tr key={h.id}>
              <td>{h.name}</td>
              <td>{h.player}</td>
              <td>{h.hp}</td>
              <td>{h.ac}</td>
              <td>
                <span 
                  onClick={() => setHeroes(prevHeroes => 
                    prevHeroes.map(hero => 
                      hero.id === h.id 
                        ? { ...hero, present: !hero.present }
                        : hero
                    )
                  )}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  {h.present ? "✅" : "❌"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export {Hero}