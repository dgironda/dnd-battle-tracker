import React, { useState, useEffect } from 'react';
import { Combatant } from '../../types/index';
import { useCombat } from '../BattleTracker/CombatContext';

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Battle Manager</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="battle-manager-content">
          {/* Save Current Battle Section */}
          <div className="save-battle-section">
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
                    className="btn-primary"
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
              <p className="no-battle-warning">No active battle to save</p>
            )}
          </div>

          <hr />

          {/* Saved Battles List */}
          <div className="saved-battles-section">
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
      </div>
    </div>
  );
};

export default BattleManager;
