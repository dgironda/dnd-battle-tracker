import React, { useState, useEffect } from 'react';
import { Combatant } from '../../types/index';
import { useCombat } from '../BattleTracker/CombatContext';
// import { exportAllToJson, importFromJson } from '../../utils/LocalStorage';
import { getHeroes, storeHeroes, getMonsters, storeMonsters, getCombatants, getRoundNumber, storeCombatants } from "../../utils/LocalStorage";

interface SavedBattle {
  id: string;
  name: string;
  savedDate: string;
  combatants: Combatant[];
  roundNumber: number;
  currentTurnIndex: number;
}

interface BattleManagerProps {
  onClose: () => void;
}

const SAVED_BATTLES_KEY = 'savedBattles';

const BattleManager: React.FC<BattleManagerProps> = ({ onClose }) => {
  // Get combat state from context
  const { 
    combatants, 
    setCombatants, 
    roundNumber, 
    setRoundNumber, 
    currentTurnIndex, 
    setCurrentTurnIndex 
  } = useCombat();

  const [savedBattles, setSavedBattles] = useState<SavedBattle[]>([]);
  const [battleName, setBattleName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedBattle, setSelectedBattle] = useState<SavedBattle | null>(null);

  // Load saved battles on mount
  useEffect(() => {
    loadSavedBattles();
  }, []);

  const loadSavedBattles = () => {
    try {
      const stored = localStorage.getItem(SAVED_BATTLES_KEY);
      if (stored) {
        setSavedBattles(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading saved battles:', error);
    }
  };

  const saveBattle = () => {
    if (!battleName.trim()) {
      alert('Please enter a battle name');
      return;
    }

    if (combatants.length === 0) {
      alert('No active battle to save');
      return;
    }

    const newBattle: SavedBattle = {
      id: Date.now().toString(),
      name: battleName.trim(),
      savedDate: new Date().toISOString(),
      combatants: combatants,
      roundNumber: roundNumber,
      currentTurnIndex: currentTurnIndex
    };

    const updated = [...savedBattles, newBattle];
    localStorage.setItem(SAVED_BATTLES_KEY, JSON.stringify(updated));
    setSavedBattles(updated);
    setBattleName('');
    setShowSaveDialog(false);
    alert(`Battle "${newBattle.name}" saved successfully!`);
  };

  const deleteBattle = (id: string) => {
    if (!confirm('Are you sure you want to delete this saved battle?')) {
      return;
    }

    const updated = savedBattles.filter(b => b.id !== id);
    localStorage.setItem(SAVED_BATTLES_KEY, JSON.stringify(updated));
    setSavedBattles(updated);
    if (selectedBattle?.id === id) {
      setSelectedBattle(null);
    }
  };

  const loadBattle = (battle: SavedBattle) => {
    if (combatants.length > 0) {
      if (!confirm('Loading this battle will overwrite your current battle. Continue?')) {
        return;
      }
    }

    // Load battle state into combat context
    setCombatants(battle.combatants);
    setRoundNumber(battle.roundNumber);
    setCurrentTurnIndex(battle.currentTurnIndex);
    
    alert(`Battle "${battle.name}" loaded successfully!`);
    onClose();
  };

  const getBattleStats = (battle: SavedBattle) => {
    const heroes = battle.combatants.filter(c => c.type === 'hero').length;
    const monsters = battle.combatants.filter(c => c.type === 'monster').length;
    return { heroes, monsters, total: battle.combatants.length };
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

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
  let exportDate = new Date().toISOString()
  e.preventDefault()
  
  let heroes = getHeroes()
  let combatants = getCombatants()
  let round = getRoundNumber()
  let battles = savedBattles
  
  const allData = {
    _header: {
      application: "Battle Tracker",
      website: "https://battletracker.simulacrumtechnologies.com/",
      exportDate: exportDate,
      exportFrom: navigator.userAgent,
      disclaimer: "This data belongs to the user who exported it. Battle Tracker and Simulacrum Technologies make no claim to ownership of user-generated content."
    },
    heroes: heroes ?? [],
    combatants: combatants ?? [],
    round: round,
    battles: battles ?? [],
  }
  
  downloadFile({
    data: JSON.stringify(allData, null, 2),
    fileName: `BattleTracker-data-${exportDate}.json`,
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
  const HEROES_KEY = "storedHeroes";
  const MONSTERS_KEY = "storedMonsters";
  const COMBATANTS_KEY = "storedCombatants";
  const ROUND_KEY = "roundnumber"
  
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
        alert('Invalid file format. Expected heroes, combatants, battles, and round data.')
        return
      }
      
      const sanitizedHeroes = importedData.heroes.map(sanitizeObject)
      const sanitizedCombatants = importedData.combatants.map(sanitizeObject)
      const sanitizedBattles = importedData.battles.map(sanitizeObject)

      // Get existing heroes and merge with imported ones
      const existingHeroes = getHeroes() ?? []
      const mergedHeroes = [...existingHeroes, ...sanitizedHeroes]
      const existingBattles = savedBattles ?? []
      const mergedBattles = [...existingBattles, ...sanitizedBattles]

      // Additional validation on the data content
      if (!Array.isArray(sanitizedHeroes) || 
          !Array.isArray(sanitizedCombatants) ||
          !Array.isArray(sanitizedBattles)) {
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
      if (mergedHeroes.length > 1000 || 
          sanitizedCombatants.length > 1000 ||
          mergedBattles.length > 1000) {
        alert('File contains too many entries')
        return
      }
      
      // Save to localStorage
      localStorage.setItem(HEROES_KEY, JSON.stringify(mergedHeroes))
      localStorage.setItem(COMBATANTS_KEY, JSON.stringify(sanitizedCombatants))
      localStorage.setItem(ROUND_KEY, importedData.round.toString())
      localStorage.setItem(SAVED_BATTLES_KEY, JSON.stringify(mergedBattles))
      
      
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

  return (
    <div id="battleAddManage">
      {/* Save Current Battle Section */}
      <div id="saveBattleOuter">
        <h3>Save Current Battle</h3>
        {combatants.length > 0 ? (
          <div>
            <p className="battle-info">
              Current: {combatants.filter(c => c.type === 'hero').length} heroes, 
              {' '}{combatants.filter(c => c.type === 'monster').length} monsters
              {' '}(Round {roundNumber})
            </p>
            
            {!showSaveDialog ? (
              <button 
                className="btn-save-battle"
                onClick={() => setShowSaveDialog(true)}
              >
                💾 Save Current Battle
              </button>
            ) : (
              <div className="save-dialog">
                <input
                  type="text"
                  placeholder="Enter battle name (e.g., 'Dragon Cave - Session 5')"
                  value={battleName}
                  onChange={(e) => setBattleName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && saveBattle()}
                  autoFocus
                />
                <div className="save-dialog-buttons">
                  <button onClick={saveBattle}>Save</button>
                  <button onClick={() => {
                    setShowSaveDialog(false);
                    setBattleName('');
                  }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="no-battle-warning">No active battle to save. Start a battle first!</p>
        )}
      </div>

      {/* Export/Import */}
      <div id="exportImportBattles">
        
          <p><button id="buttonDownloadData" onClick={exportAllToJson}>Download Heroes and active Combat</button></p>
          <p id="uploadData"><h3><label htmlFor="inputImportData">Upload your data</label></h3>
          <input id="inputImportData" type="file" accept=".json" onChange={importFromJson}/></p>
        
      </div>
      {/* Saved Battles List */}
      <div id="savedBattlesOuter">
        <h3>Saved Battles ({savedBattles.length})</h3>
        
        {savedBattles.length === 0 ? (
          <p className="empty-state">No saved battles yet. Save your current battle above!</p>
        ) : (
          <div className="battles-list">
            {savedBattles.sort((a, b) => 
              new Date(b.savedDate).getTime() - new Date(a.savedDate).getTime()
            ).map(battle => {
              const stats = getBattleStats(battle);
              const isSelected = selectedBattle?.id === battle.id;

              return (
                <div 
                  key={battle.id} 
                  className={`battle-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedBattle(isSelected ? null : battle)}
                >
                  <div className="battle-card-header">
                    <h4>{battle.name}</h4>
                    <div className="battle-card-actions">
                      <button
                        className="btn-load"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadBattle(battle);
                        }}
                        title="Load this battle"
                      >
                        ▶️ Load
                      </button>
                      <button
                        className="btn-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBattle(battle.id);
                        }}
                        title="Delete this battle"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="battle-card-info">
                    <p className="battle-date">📅 {formatDate(battle.savedDate)}</p>
                    <p className="battle-stats">
                      👥 {stats.heroes} Heroes | 👹 {stats.monsters} Monsters | 
                      🎲 Round {battle.roundNumber}
                    </p>
                  </div>

                  {/* Expanded view */}
                  {isSelected && (
                    <div className="battle-card-details">
                      <h5>Combatants:</h5>
                      <ul>
                        {battle.combatants
                          .sort((a, b) => b.initiative - a.initiative)
                          .map(c => (
                            <li key={c.id}>
                              {c.type === 'hero' ? '👤' : '👹'} {c.name} 
                              {' '}(Init: {c.initiative}, HP: {c.currHp}/{c.maxHp})
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BattleManager;
