import { useState, useEffect } from "react";
import { Monster } from "./Monster";
import { getMonsters, storeMonsters } from "./LocalStorage";

export const useMonsters = () => {
  const [monsters, setMonsters] = useState<Monster[]>(() => getMonsters());

  useEffect(() => {
    storeMonsters(monsters);
  }, [monsters]);

  return { monsters, setMonsters };
};
