import { useState, useEffect } from "react";
import { Monster } from "../types/index";
import { getMonsters, storeMonsters } from "../utils/LocalStorage";

export const useMonsters = () => {
  const [monsters, setMonsters] = useState<Monster[]>(() => getMonsters());

  useEffect(() => {
    storeMonsters(monsters);
  }, [monsters]);

  return { monsters, setMonsters };
};
