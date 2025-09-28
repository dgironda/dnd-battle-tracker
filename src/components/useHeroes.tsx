import { useState, useEffect } from "react";
import { Hero } from "./Hero";
import { getHeroes, storeHeroes } from "./LocalStorage";


export const useHeroes = () => {
  const [heroes, setHeroes] = useState<Hero[]>(() => getHeroes());
  
  useEffect(() => {
    storeHeroes(heroes);
  }, [heroes]);

  return { heroes, setHeroes };
};