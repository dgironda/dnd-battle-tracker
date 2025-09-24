import { Hero } from './Hero';

const STORAGE_KEY = "storedHeroes";

/**
 * Store heroes array to localStorage
 * @param heroes - Array of Hero objects to store
 */
function storeHeroes(heroes: Hero[]): void {
  try {
    const heroesData = heroes.length > 0 ? heroes : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(heroesData));
    console.log("Stored heroes:", localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    console.error("Error storing heroes:", error);
  }
}

/**
 * Retrieve heroes array from localStorage
 * @returns Array of Hero objects or empty array if none found
 */
function getHeroes(): Hero[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const loadedHeroes: Hero[] = stored ? JSON.parse(stored) : [];
    console.log("Loaded Heroes:", loadedHeroes);
    return loadedHeroes;
  } catch (error) {
    console.error("Error loading Heroes:", error);
    return [];
  }
}

/**
 * Clear all stored heroes from localStorage
 */
function clearHeroes(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log("Cleared stored heroes");
  } catch (error) {
    console.error("Error clearing heroes:", error);
  }
}

/**
 * Check if heroes data exists in localStorage
 * @returns true if heroes data exists, false otherwise
 */
function hasStoredHeroes(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch (error) {
    console.error("Error checking for stored heroes:", error);
    return false;
  }
}

export {storeHeroes, getHeroes, clearHeroes, hasStoredHeroes}