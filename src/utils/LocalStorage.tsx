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
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB limit
  const ALLOWED_FILE_TYPE = 'application/json'
  const sanitizeObject = (obj: any): any => {
  return JSON.parse(JSON.stringify(obj))
}
  
  // Check file type
  if (file.type !== ALLOWED_FILE_TYPE && !file.name.endsWith('.json')) {
    alert('Please upload a valid JSON file')
    e.target.value = '' // Reset input
    return
  }
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    alert(`File is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    e.target.value = '' // Reset input
    return
  }
  
  const reader = new FileReader()
  
  reader.onload = (event) => {
    try {
      const jsonString = event.target?.result as string
      
      // Check if string is too long (additional safety)
      if (jsonString.length > MAX_FILE_SIZE) {
        alert('File content is too large')
        return
      }
      
      const importedData = JSON.parse(jsonString)
      
      // Validate the data structure
      if (!isValidGameData(importedData)) {
        alert('Invalid file format. Expected heroes, combatants, and round data.')
        return
      }
      
      const sanitizedHeroes = importedData.heroes.map(sanitizeObject)
      const sanitizedCombatants = importedData.combatants.map(sanitizeObject)

      // Additional validation on the data content
      if (!Array.isArray(sanitizedHeroes) || 
          !Array.isArray(sanitizedCombatants)) {
        alert('Invalid data structure in file')
        return
      }
      
      // Validate round is a number
      if (typeof importedData.round !== 'number' || 
          importedData.round < 0 || 
          !Number.isFinite(importedData.round)) {
        alert('Invalid round number in file')
        return
      }
      
      // Optional: Validate array lengths aren't excessive
      if (importedData.heroes.length > 1000 || 
          importedData.combatants.length > 1000) {
        alert('File contains too many entries')
        return
      }
      
      // Save to localStorage
      localStorage.setItem(HEROES_KEY, JSON.stringify(sanitizedHeroes))
      localStorage.setItem(COMBATANTS_KEY, JSON.stringify(sanitizedCombatants))
      localStorage.setItem(ROUND_KEY, importedData.round.toString())
      
      alert('Data imported successfully!')
      window.location.reload()
      
    } catch (error) {
      console.error('Error importing data:', error)
      if (error instanceof SyntaxError) {
        alert('Invalid JSON format')
      } else {
        alert('Error reading file')
      }
    } finally {
      // Reset the input so the same file can be uploaded again if needed
      e.target.value = ''
    }
  }
  
  reader.onerror = () => {
    alert('Error reading file')
    e.target.value = ''
  }
  
  reader.readAsText(file)
}

// Validation helper function
const isValidGameData = (data: any): boolean => {
  return (
    data !== null &&
    typeof data === 'object' &&
    'heroes' in data &&
    'combatants' in data &&
    'round' in data
  )
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
