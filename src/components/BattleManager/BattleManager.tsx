import React, { useState, useEffect } from 'react';
import { Hero, Monster, Combatant } from '../../types/index';
import { useCombat } from '../BattleTracker/CombatContext';
// import { exportAllToJson, importFromJson } from '../../utils/LocalStorage';
import { getHeroes, storeHeroes, getMonsters, storeMonsters, getCombatants, getRoundNumber, storeCombatants } from "../../utils/LocalStorage";
import { Popup } from '../../utils/Popup';
import monsterShareURL from '../../utils/monsterShareURL';
import BattlePhotoThumbnail from './BattlePhotoThumbnail';
import StorageWarning from '../../utils/StorageWarning';


interface SavedBattle {
  id: string;
  name: string;
  savedDate: string;
  combatants: Combatant[];
  roundNumber: number;
  currentTurnIndex: number;
  photo?: string; // Base64 encoded image
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
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

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
    currentTurnIndex: currentTurnIndex,
    photo: selectedPhoto || undefined // Add photo if available
  };

    const updated = [...savedBattles, newBattle];
    localStorage.setItem(SAVED_BATTLES_KEY, JSON.stringify(updated));
    setSavedBattles(updated);
    setBattleName('');
    setSelectedPhoto(null);
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
  let monsters = getMonsters()
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
  const [showImportConfirmPopup, setShowImportConfirmPopup] = useState(false);
  const handleImport = () => {
    setShowImportConfirmPopup(true);
  };
const handleImportContinue = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      importFromJson(file)
    }
  }
  input.click()
}
const importFromJson = (file: File) => {
  if (!file) return
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB limit to stay compatible with localStorage
  const ALLOWED_FILE_TYPE = 'application/json'
  const sanitizeObject = (obj: any): any => {
    return JSON.parse(JSON.stringify(obj))
  }
  const HEROES_KEY = "storedHeroes";
  const COMBATANTS_KEY = "storedCombatants";
  const ROUND_KEY = "roundnumber"
  
  // Check file type
  if (file.type !== ALLOWED_FILE_TYPE && !file.name.endsWith('.json')) {
    alert('Please upload a valid JSON file')
    return
  }
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    alert(`File is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`)
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
      
      // Get existing data
      const existingHeroes = getHeroes() ?? []
      const existingMonsters = getMonsters() ?? []
      const existingBattles = savedBattles ?? []
      
      // Create sets of existing IDs for fast lookup
      const existingHeroIds = new Set(existingHeroes.map(h => h.id))
      const existingMonsterIds = new Set(existingMonsters.map(m => m.id))
      const existingBattleIds = new Set(existingBattles.map(b => b.id))
      
      // Check and regenerate IDs if they collide
      const processedHeroes = sanitizedHeroes.map((hero: Hero) => {
        if (existingHeroIds.has(hero.id)) {
          const newId = crypto.randomUUID()
          console.log(`Hero ID collision detected. Changing ${hero.id} to ${newId}`)
          return { ...hero, id: newId }
        }
        return hero
      })
      
      const processedBattles = sanitizedBattles.map((battle: SavedBattle) => {
        if (existingBattleIds.has(battle.id)) {
          const newId = crypto.randomUUID()
          console.log(`Battle ID collision detected. Changing ${battle.id} to ${newId}`)
          return { ...battle, id: newId }
        }
        return battle
      })
      
      // Merge with existing data
      const mergedHeroes = [...existingHeroes, ...processedHeroes]
      const mergedBattles = [...existingBattles, ...processedBattles]
      
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
    } 
  }
  
  reader.onerror = () => {
    alert('Error reading file')
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
    'round' in data &&
    'battles' in data
  )
}

const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Please upload an image file');
    return;
  }

  // Validate file size (max 2MB to avoid localStorage limits)
  const MAX_SIZE = 2 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    alert('Image is too large. Please upload an image smaller than 2MB');
    return;
  }

  // Convert to base64
  const reader = new FileReader();
  reader.onload = (event) => {
    const base64String = event.target?.result as string;
    setSelectedPhoto(base64String);
  };
  reader.onerror = () => {
    alert('Error reading file');
  };
  reader.readAsDataURL(file);
};

const removePhoto = () => {
  setSelectedPhoto(null);
};

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
                <div className="photo-upload-section">
                  <label htmlFor="photo-upload" className="photo-upload-label">
                    📷 Add Reference Photo (optional)
                  </label>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                  />
                  <button 
                    type="button"
                    onClick={() => document.getElementById('photo-upload')?.click()}
                    className="btn-upload-photo"
                  >
                    {selectedPhoto ? '✓ Photo Selected' : '+ Choose Photo'}
                  </button>
                  
                  {selectedPhoto && (
                    <div className="photo-preview">
                      <img src={selectedPhoto} alt="Preview" />
                      <button 
                        type="button"
                        onClick={removePhoto}
                        className="btn-remove-photo"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  )}
                </div>
                <div className="save-dialog-buttons">
                  <button onClick={saveBattle}>Save</button>
                  <button onClick={() => {
                    setShowSaveDialog(false);
                    setBattleName('');
                    setSelectedPhoto(null);
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
          <p id="uploadData">
            {/* <h3><label htmlFor="inputImportData">Upload your data</label></h3>
            <input id="inputImportData" type="file" accept=".json" onChange={handleImport}/> */}
            <button id="inputImportData" onClick={handleImport}>Upload your data</button>
          </p>
          <p><button onClick={monsterShareURL.generateMonsterShareURL}>Export Monster Share URL</button>This will generate a link that will allow someone to import the monsters in your monster manager at the time it is generated.</p>
        
      </div>
      {/* Saved Battles List */}
      <div id="savedBattlesOuter">
        <StorageWarning 
  threshold={3 * 1024 * 1024} // 3MB in bytes (default)
  onWarningChange={(isWarning) => console.log(isWarning)}
/>
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
                  {/* Photo Thumbnail */}
                  {battle.photo && (
        <BattlePhotoThumbnail photo={battle.photo} name={battle.name} />
      )}

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
      <Popup
        message="Have you saved your current battle first? If so continue."
        isOpen={showImportConfirmPopup}
        onCancel={() => setShowImportConfirmPopup(false)}
        onContinue={handleImportContinue}
        title="Import new data"
      />
      <p className="saveClose">
        <button onClick={onClose}>Save and Close</button>
      </p>
    </div>
    
  );
  
};

export default BattleManager;
