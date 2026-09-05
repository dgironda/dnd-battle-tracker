import React, { useState, useEffect, useCallback } from 'react';
import { Hero, Monster, Combatant } from '../../types/index';
import { useCombat } from '../BattleTracker/CombatContext';
import {
  getHeroes,
  storeHeroes,
  getMonsters,
  storeMonsters,
  getCombatants,
  getRoundNumber,
  storeCombatants,
  writeKey,
  STORAGE_KEYS,
  StorageQuotaError,
} from "../../utils/LocalStorage";
import { useReloadRosters } from "../../hooks/rosterContext";
import { Popup } from '../../utils/Popup';
import monsterShareURL from '../../utils/monsterShareURL';
import BattlePhotoThumbnail from './BattlePhotoThumbnail';
import StorageWarning from '../../utils/StorageWarning';
import { compressImageForUpload } from '../../utils/imageCompression';
import { notify, confirmDialog } from '../../utils/notify';

interface SavedBattle {
  id: string;
  name: string;
  savedDate: string;
  combatants: Combatant[];
  roundNumber: number;
  currentTurnIndex: number;
  photo?: string; // Base64 encoded image
}

interface ExportedData {
  _header: Record<string, string>;
  heroes: Hero[];
  monsters: Monster[];
  combatants: Combatant[];
  round: number;
  currentTurnIndex: number;
  battles: SavedBattle[];
}

interface BattleManagerProps {
  onClose: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB, to stay inside the localStorage budget
const MAX_ENTRIES = 1000;

const BattleManager: React.FC<BattleManagerProps> = ({ onClose }) => {
  const {
    combatants,
    setCombatants,
    roundNumber,
    setRoundNumber,
    currentTurnIndex,
    setCurrentTurnIndex,
  } = useCombat();
  const reloadRosters = useReloadRosters();

  const [savedBattles, setSavedBattles] = useState<SavedBattle[]>([]);
  const [battleName, setBattleName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedBattle, setSelectedBattle] = useState<SavedBattle | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showImportConfirmPopup, setShowImportConfirmPopup] = useState(false);

  useEffect(() => {
    loadSavedBattles();
  }, []);

  const loadSavedBattles = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.savedBattles);
      if (stored) {
        setSavedBattles(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading saved battles:', error);
    }
  };

  /** Persist the battle list, reporting a full quota instead of throwing. */
  const persistBattles = useCallback(async (battles: SavedBattle[]): Promise<boolean> => {
    try {
      writeKey(STORAGE_KEYS.savedBattles, JSON.stringify(battles));
      return true;
    } catch (error) {
      if (error instanceof StorageQuotaError) {
        await notify(error.message, { title: 'Storage full', tone: 'danger' });
        return false;
      }
      throw error;
    }
  }, []);

  const saveBattle = async () => {
    if (!battleName.trim()) {
      await notify('Give the battle a name so you can find it later.', { title: 'Name required' });
      return;
    }

    if (combatants.length === 0) {
      await notify('There is no active battle to save.', { title: 'Nothing to save' });
      return;
    }

    const newBattle: SavedBattle = {
      id: crypto.randomUUID(), // Date.now() collided when two saves landed in the same ms
      name: battleName.trim(),
      savedDate: new Date().toISOString(),
      combatants,
      roundNumber,
      currentTurnIndex,
      photo: selectedPhoto || undefined,
    };

    const updated = [...savedBattles, newBattle];
    // Write first — if the quota is blown, don't claim success.
    if (!(await persistBattles(updated))) return;

    setSavedBattles(updated);
    setBattleName('');
    setSelectedPhoto(null);
    setShowSaveDialog(false);
    await notify(`"${newBattle.name}" saved.`, { title: 'Battle saved' });
  };

  const deleteBattle = async (id: string) => {
    const target = savedBattles.find((b) => b.id === id);
    const ok = await confirmDialog(
      `Delete "${target?.name ?? 'this battle'}"? This can't be undone.`,
      { title: 'Delete saved battle', tone: 'danger', confirmLabel: 'Delete' }
    );
    if (!ok) return;

    const updated = savedBattles.filter((b) => b.id !== id);
    if (!(await persistBattles(updated))) return;
    setSavedBattles(updated);
    if (selectedBattle?.id === id) {
      setSelectedBattle(null);
    }
  };

  const loadBattle = async (battle: SavedBattle) => {
    if (combatants.length > 0) {
      const ok = await confirmDialog(
        'Loading this battle replaces the one in progress. Continue?',
        { title: 'Replace current battle', confirmLabel: 'Load battle' }
      );
      if (!ok) return;
    }

    setCombatants(battle.combatants);
    setRoundNumber(battle.roundNumber);
    // Clamp: a saved index can point past the end if the battle was edited.
    setCurrentTurnIndex(
      Math.min(Math.max(battle.currentTurnIndex ?? 0, 0), Math.max(battle.combatants.length - 1, 0))
    );

    await notify(`"${battle.name}" loaded.`, { title: 'Battle loaded' });
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

  const downloadFile = ({ data, fileName, fileType }: { data: string; fileName: string; fileType: string }) => {
    const blob = new Blob([data], { type: fileType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = fileName;
    a.href = url;
    a.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true }));
    a.remove();
    // The old version never revoked this, leaking a blob per export.
    window.URL.revokeObjectURL(url);
  };

  const exportAllToJson = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const exportDate = new Date().toISOString();

    const allData: ExportedData = {
      _header: {
        application: "Battle Tracker",
        website: "https://battletracker.simulacrumtechnologies.com/",
        exportDate,
        exportFrom: navigator.userAgent,
        disclaimer:
          "This data belongs to the user who exported it. Battle Tracker and Simulacrum Technologies make no claim to ownership of user-generated content.",
      },
      heroes: getHeroes() ?? [],
      // The monster roster used to be read here and then left out of the
      // payload, so every backup silently lost the Monster Manager.
      monsters: getMonsters() ?? [],
      combatants: getCombatants() ?? [],
      round: getRoundNumber(),
      currentTurnIndex,
      battles: savedBattles ?? [],
    };

    downloadFile({
      data: JSON.stringify(allData, null, 2),
      fileName: `BattleTracker-data-${exportDate.replace(/[:.]/g, '-')}.json`,
      fileType: 'application/json',
    });
  };

  const handleImport = () => {
    setShowImportConfirmPopup(true);
  };

  const handleImportContinue = () => {
    setShowImportConfirmPopup(false);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) importFromJson(file);
    };
    input.click();
  };

  const isValidGameData = (data: unknown): data is Partial<ExportedData> => {
    if (data === null || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return 'heroes' in d && 'combatants' in d && 'round' in d && 'battles' in d;
  };

  const importFromJson = (file: File) => {
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      notify('Choose a .json file exported from the Battle Tracker.', { title: 'Wrong file type' });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      notify(`That file is larger than ${MAX_FILE_SIZE / 1024 / 1024}MB.`, { title: 'File too large' });
      return;
    }

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const jsonString = event.target?.result as string;
        const importedData: unknown = JSON.parse(jsonString);

        if (!isValidGameData(importedData)) {
          await notify(
            'That file is missing heroes, combatants, battles or round data.',
            { title: 'Unrecognised file', tone: 'warning' }
          );
          return;
        }

        const incomingHeroes = Array.isArray(importedData.heroes) ? importedData.heroes : null;
        const incomingCombatants = Array.isArray(importedData.combatants) ? importedData.combatants : null;
        const incomingBattles = Array.isArray(importedData.battles) ? importedData.battles : null;
        // Monsters are optional so files exported before the fix still load.
        const incomingMonsters = Array.isArray(importedData.monsters) ? importedData.monsters : [];

        if (!incomingHeroes || !incomingCombatants || !incomingBattles) {
          await notify('The heroes, combatants and battles in that file are not lists.', {
            title: 'Invalid file', tone: 'warning',
          });
          return;
        }

        const round = importedData.round;
        if (typeof round !== 'number' || round < 0 || !Number.isFinite(round)) {
          await notify('That file has an invalid round number.', { title: 'Invalid file', tone: 'warning' });
          return;
        }

        const existingHeroes = getHeroes() ?? [];
        const existingMonsters = getMonsters() ?? [];
        const existingBattles = savedBattles ?? [];

        const existingHeroIds = new Set(existingHeroes.map(h => h.id));
        const existingMonsterIds = new Set(existingMonsters.map(m => m.id));
        const existingBattleIds = new Set(existingBattles.map(b => b.id));

        // Give anything that clashes with what's already stored a fresh id.
        const reId = <T extends { id: string }>(items: T[], taken: Set<string>): T[] =>
          items.map((item) => (taken.has(item.id) ? { ...item, id: crypto.randomUUID() } : item));

        const mergedHeroes = [...existingHeroes, ...reId(incomingHeroes, existingHeroIds)];
        const mergedMonsters = [...existingMonsters, ...reId(incomingMonsters, existingMonsterIds)];
        const mergedBattles = [...existingBattles, ...reId(incomingBattles, existingBattleIds)];

        if (
          mergedHeroes.length > MAX_ENTRIES ||
          mergedMonsters.length > MAX_ENTRIES ||
          incomingCombatants.length > MAX_ENTRIES ||
          mergedBattles.length > MAX_ENTRIES
        ) {
          await notify(`That would leave more than ${MAX_ENTRIES} entries in one list.`, {
            title: 'Too much data', tone: 'warning',
          });
          return;
        }

        // Every write goes through the shared key constants. The round used to
        // be written to "roundnumber" here while the app read "roundNumber",
        // so the imported round was silently discarded.
        storeHeroes(mergedHeroes);
        storeMonsters(mergedMonsters);
        storeCombatants(incomingCombatants, round);
        await persistBattles(mergedBattles);

        // Push the imported state into the live app instead of reloading.
        reloadRosters();
        setSavedBattles(mergedBattles);
        setCombatants(incomingCombatants);
        setRoundNumber(round);
        setCurrentTurnIndex(
          Math.min(
            Math.max(typeof importedData.currentTurnIndex === 'number' ? importedData.currentTurnIndex : 0, 0),
            Math.max(incomingCombatants.length - 1, 0)
          )
        );

        await notify(
          `Imported ${incomingHeroes.length} heroes, ${incomingMonsters.length} monsters and ${incomingBattles.length} saved battles.`,
          { title: 'Import complete' }
        );
      } catch (error) {
        console.error('Error importing data:', error);
        if (error instanceof StorageQuotaError) {
          await notify(error.message, { title: 'Storage full', tone: 'danger' });
        } else if (error instanceof SyntaxError) {
          await notify('That file is not valid JSON.', { title: 'Could not read file', tone: 'warning' });
        } else {
          await notify('Something went wrong reading that file.', { title: 'Import failed', tone: 'danger' });
        }
      }
    };

    reader.onerror = () => {
      notify('Something went wrong reading that file.', { title: 'Import failed', tone: 'danger' });
    };

    reader.readAsText(file);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      await notify('Choose an image file.', { title: 'Wrong file type' });
      return;
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      await notify('Choose an image smaller than 10MB.', { title: 'Image too large' });
      return;
    }

    try {
      const compressed = await compressImageForUpload(file, {
        thumbnailMaxWidth: 200,
        thumbnailMaxHeight: 200,
        // Reference photos are read on a laptop, not printed. 1280px at 0.7
        // keeps them legible while roughly halving what a saved battle costs
        // against the ~5MB localStorage budget.
        fullScreenMaxWidth: 1280,
        fullScreenMaxHeight: 720,
        quality: 0.7,
      });

      setSelectedPhoto(compressed.fullScreen);
    } catch (error) {
      console.error('Image compression failed:', error);
      await notify('That image could not be processed. Try a different one.', {
        title: 'Image failed', tone: 'danger',
      });
    } finally {
      // Let the same file be picked again after a removal.
      e.target.value = '';
    }
  };

  const removePhoto = () => {
    setSelectedPhoto(null);
  };

  return (
    <div id="battleAddManage">
      <button className="saveClose" id="bmSaveCloseButton" onClick={onClose} aria-label="Close Battle Manager">X</button>
      <div className='battle-content'>
        <h2>Battle Manager</h2>

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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveBattle();
                    }}
                    aria-label="Battle name"
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
                        <img src={selectedPhoto} alt="Reference photo preview" />
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
          <p>
            <button id="buttonDownloadData" onClick={exportAllToJson}>
              Download all your data
            </button>
          </p>
          <p id="uploadData">
            <button id="inputImportData" onClick={handleImport}>Upload your data</button>
          </p>
          <p>
            <button id='buttonMonsterShareURL' onClick={monsterShareURL.generateMonsterShareURL}>
              Export Monster Share URL
            </button>
            This will generate a link that will allow someone to import the monsters in your monster
            manager at the time it is generated.
          </p>
        </div>

        {/* Saved Battles List */}
        <div id="savedBattlesOuter">
          <StorageWarning threshold={3 * 1024 * 1024} />
          <h3>Saved Battles ({savedBattles.length})</h3>

          {savedBattles.length === 0 ? (
            <p className="empty-state">No saved battles yet. Save your current battle above!</p>
          ) : (
            <div className="battles-list">
              {[...savedBattles]
                .sort((a, b) => new Date(b.savedDate).getTime() - new Date(a.savedDate).getTime())
                .map(battle => {
                  const stats = getBattleStats(battle);
                  const isSelected = selectedBattle?.id === battle.id;

                  return (
                    <div
                      key={battle.id}
                      className={`battle-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedBattle(isSelected ? null : battle)}
                    >
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
                            aria-label={`Delete ${battle.name}`}
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

                      {isSelected && (
                        <div className="battle-card-details">
                          <h5>Combatants:</h5>
                          <ul>
                            {[...battle.combatants]
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
          message="Importing merges the file into what you already have. Have you saved your current battle?"
          isOpen={showImportConfirmPopup}
          onCancel={() => setShowImportConfirmPopup(false)}
          onContinue={handleImportContinue}
          title="Import new data"
        />
      </div>
    </div>
  );
};

export default BattleManager;
