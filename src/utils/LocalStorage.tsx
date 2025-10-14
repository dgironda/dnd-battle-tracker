import { Hero, Monster, Combatant } from '../types/index';



const HEROES_KEY = "storedHeroes";
const MONSTERS_KEY = "storedMonsters";
const COMBATANTS_KEY = "storedCombatants";

/**
 * Store heroes array to localStorage
 */
function storeHeroes(heroes: Hero[]): void {
  try {
    localStorage.setItem(HEROES_KEY, JSON.stringify(heroes ?? []));
    console.log("Stored heroes:", localStorage.getItem(HEROES_KEY));
  } catch (error) {
    console.error("Error storing heroes:", error);
  }
}

/**
 * Retrieve heroes array from localStorage
 */
function getHeroes(): Hero[] {
  try {
    const stored = localStorage.getItem(HEROES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error loading heroes:", error);
    return [];
  }
}

/**
 * Clear heroes
 */
function clearHeroes(): void {
  try {
    localStorage.removeItem(HEROES_KEY);
  } catch (error) {
    console.error("Error clearing heroes:", error);
  }
}

/**
 * Check if heroes data exists
 */
function hasStoredHeroes(): boolean {
  try {
    return localStorage.getItem(HEROES_KEY) !== null;
  } catch (error) {
    console.error("Error checking for stored heroes:", error);
    return false;
  }
}

/**
 * Store monsters array to localStorage
 */
function storeMonsters(monsters: Monster[]): void {
  try {
    localStorage.setItem(MONSTERS_KEY, JSON.stringify(monsters ?? []));
    console.log("Stored monsters:", localStorage.getItem(MONSTERS_KEY));
  } catch (error) {
    console.error("Error storing monsters:", error);
  }
}

/**
 * Retrieve monsters array from localStorage
 */
function getMonsters(): Monster[] {
  try {
    const stored = localStorage.getItem(MONSTERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error loading monsters:", error);
    return [];
  }
}

/**
 * Clear monsters
 */
function clearMonsters(): void {
  try {
    localStorage.removeItem(MONSTERS_KEY);
  } catch (error) {
    console.error("Error clearing monsters:", error);
  }
}

/**
 * Check if monsters data exists
 */
function hasStoredMonsters(): boolean {
  try {
    return localStorage.getItem(MONSTERS_KEY) !== null;
  } catch (error) {
    console.error("Error checking for stored monsters:", error);
    return false;
  }
}

/**
 * Store combatants array to localStorage
 */
function storeCombatants(combatants: Combatant[], round: number): void {
  try {
    localStorage.setItem(COMBATANTS_KEY, JSON.stringify(combatants ?? []));
    console.log("Stored combatants:", localStorage.getItem(COMBATANTS_KEY));
    localStorage.setItem('roundNumber', round.toString())
  } catch (error) {
    console.error("Error storing combatants:", error);
  }
}

/**
 * Retrieve combatants array from localStorage
 */
function getCombatants(): Combatant[] {
  try {
    const stored = localStorage.getItem(COMBATANTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error loading combatants:", error);
    return [];
  }
}

function getRoundNumber(): number {
  const stored = localStorage.getItem('roundNumber');
  return stored ? parseInt(stored) : 0;
};

/**
 * Clear combatants
 */
function clearCombatants(): void {
  try {
    localStorage.removeItem(COMBATANTS_KEY);
    localStorage.removeItem('roundNumber');
  } catch (error) {
    console.error("Error clearing combatants or round:", error);
  }
}

/**
 * Check if combatants data exists
 */
function hasStoredCombatants(): boolean {
  try {
    return localStorage.getItem(COMBATANTS_KEY) !== null;
  } catch (error) {
    console.error("Error checking for stored combatants:", error);
    return false;
  }
}

export {
  storeHeroes,
  getHeroes,
  clearHeroes,
  hasStoredHeroes,
  storeMonsters,
  getMonsters,
  clearMonsters,
  hasStoredMonsters,
  storeCombatants,
  getCombatants,
  getRoundNumber,
  clearCombatants,
  hasStoredCombatants,
};
