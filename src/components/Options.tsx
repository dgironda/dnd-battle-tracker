import { DEVMODE } from "../utils/devmode";
import { GlobalProvider, useGlobalContext } from "../hooks/optionsContext";
import ToggleComponent from "../components/ToggleContext";
import { useState, useEffect } from "react";
import React from "react";
import Icon from "./Icon";
import Cog from './assets/draftsvgs_v2/icon_settings.svg';

interface OptionsProps {
  isVisible: boolean;
  onToggle: () => void;
  isSupporter: boolean;
}

export default function Options({ isVisible, onToggle, isSupporter }: OptionsProps) {
  // const [overlayVisible, setOverlayVisible] = useState(true);
  const { settings, updateSetting } = useGlobalContext();

  const handleThemeChange = () => {
    updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark');}
  // const conditionReminderOn = !settings.conditionReminderOn;
  // const currentTurnTime = !settings.currentTurnTime;
  
  return (
    <>
      <button id="optionsButton" title="Options and settings" onClick={onToggle}>
        {/* <Icon className="optionsGear" name="gear" size={24} color="var(--color-bg1)"/> */}
      </button>
      
      {isVisible && (
        <div id="options">
          <button id="optionsCloseButton" onClick={onToggle}>X</button>
            <div>
                <ul>
                    <li><ToggleComponent /></li>
                    <li><button onClick={() => updateSetting('conditionReminderOn', !settings.conditionReminderOn)} id="buttonConditionReminder">Condition Reminder Pop-up: {settings.conditionReminderOn ? 'Off' : 'On'}</button></li>
                    <li><button onClick={() => updateSetting('currentTurnTime', !settings.currentTurnTime)} id="buttonCurrentTurnTime">Current Turn Time Display: {settings.currentTurnTime ? 'On' : 'Off'}</button></li>
                    <li><button onClick={() => updateSetting('tourReady', !settings.tourReady)} id="buttonTourReady">{settings.tourReady ? 'Tour Available' : 'Reset Tour'}</button></li>
                    <li id="colorMode">
                      {isSupporter && (
                          <button 
                            onClick={handleThemeChange} 
                            style={{ 
                              backgroundColor: settings.theme === 'dark' ? 'var(--color-fg)' : 'var(--color-hero-bg1)', 
                              color: settings.theme === 'dark' ? 'var(--color-bg1)' : 'var(--color-roweven)', 
                              border: 'none', 
                              padding: '10px 20px', 
                              borderRadius: '5px', 
                              cursor: 'pointer'
                            }}
                          >
                            {settings.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                          </button>
                      )}
                    </li>

                    <li></li>
                    {/* {isSupporter && (
                          <>
                            <li><button id="buttonDownloadData" onClick={exportAllToJson}>Download Heroes and active Combat</button></li>
                            <li id="uploadData"><h2><label htmlFor="inputImportData">Upload your data</label></h2>
                            <input id="inputImportData" type="file" accept=".json" onChange={importFromJson}/></li>
                          </>
                        )} */}
                </ul>
                {/* <div>
                    <h3>Keyboard Shortcuts</h3>
                    <p><span className="bold">a</span> check/uncheck current player's Action</p>
                    <p><span className="bold">s</span> check/uncheck current player's Bonus</p>
                    <p><span className="bold">d</span> check/uncheck current player's Movement</p>
                    <p><span className="bold">e</span> open/close Hero Manager</p>
                    <p><span className="bold">w</span> open/close Monster Manager</p>
                    <p><span className="bold">x</span> close Combatant stat box</p>
                </div> */}
            </div>
            
        </div>
        )}
    </>
  );
}



