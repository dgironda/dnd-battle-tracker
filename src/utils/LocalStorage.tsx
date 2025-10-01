import { Hero } from '../types/Hero';
import { Monster } from '../types/index'; // <- define like Hero

const HEROES_KEY = "storedHeroes";
const MONSTERS_KEY = "storedMonsters";

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

export {
  storeHeroes,
  getHeroes,
  clearHeroes,
  hasStoredHeroes,
  storeMonsters,
  getMonsters,
  clearMonsters,
  hasStoredMonsters,
};
