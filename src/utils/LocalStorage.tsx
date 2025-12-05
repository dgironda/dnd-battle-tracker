import { DEVMODE } from "./devmode";

import { Hero, Monster, Combatant } from '../types/index';
import { useGlobalContext } from '../hooks/versionContext';



const HEROES_KEY = "storedHeroes";
const MONSTERS_KEY = "storedMonsters";
const COMBATANTS_KEY = "storedCombatants";
const ROUND_KEY = "roundnumber"

/**
 * Store heroes array to localStorage
 */
function storeHeroes(heroes: Hero[]): void {
  try {
    localStorage.setItem(HEROES_KEY, JSON.stringify(heroes ?? []));
    // DEVMODE && console.log("Stored heroes:", localStorage.getItem(HEROES_KEY));
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
    // DEVMODE && console.log("Stored monsters:", localStorage.getItem(MONSTERS_KEY));
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
    // DEVMODE && console.log("Stored combatants:", localStorage.getItem(COMBATANTS_KEY));
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
interface DownloadFileParams {
  data: string
  fileName: string
  fileType: string
}
const downloadFile = ({ data, fileName, fileType }: DownloadFileParams) => {
  const blob = new Blob([data], { type: fileType })
  const a = document.createElement('a')
  a.download = fileName
  a.href = window.URL.createObjectURL(blob)
  const clickEvt = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true,
  })
  a.dispatchEvent(clickEvt)
  a.remove()
}
const exportAllToJson = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault()
  
  let heroes = getHeroes()
  let combatants = getCombatants()
  let round = getRoundNumber()
  
  const allData = {
    heroes: heroes ?? [],
    combatants: combatants ?? [],
    round: round
  }
  
  downloadFile({
    data: JSON.stringify(allData, null, 2), // null, 2 adds pretty formatting
    fileName: 'BattleTracker-data.json',
    fileType: 'application/json',
  })

}
const importFromJson = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  
  reader.onload = (event) => {
    try {
      const importedData = JSON.parse(event.target?.result as string)
      
      // Validate the data has the expected structure
      if (importedData.heroes !== undefined && 
          importedData.combatants !== undefined && 
          importedData.round !== undefined) {
        
        // Save to localStorage
        localStorage.setItem(HEROES_KEY, JSON.stringify(importedData.heroes))
        localStorage.setItem(COMBATANTS_KEY, JSON.stringify(importedData.combatants))
        localStorage.setItem(ROUND_KEY, importedData.round.toString())
        
        // Optionally refresh the UI or reload the page
        alert('Data imported successfully!')
        window.location.reload() // Or update state if using React state
      } else {
        alert('Invalid file format')
      }
    } catch (error) {
      console.error('Error importing data:', error)
      alert('Error reading file')
    }
  }
  
  reader.readAsText(file)
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
  exportAllToJson,
  importFromJson,
};
