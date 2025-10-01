import { useState, useEffect } from "react";
import { Hero } from "../types/Hero";
import { getHeroes, storeHeroes } from "../utils/LocalStorage";


export const useHeroes = () => {
  const [heroes, setHeroes] = useState<Hero[]>(() => getHeroes());
  
  useEffect(() => {
    storeHeroes(heroes);
  }, [heroes]);

  return { heroes, setHeroes };
};