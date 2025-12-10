import { DEVMODE } from "./utils/devmode";
import { GlobalProvider, useGlobalContext } from "./hooks/optionsContext";
import ToggleComponent from "./components/ToggleContext";
import { exportAllToJson, importFromJson } from "./utils/LocalStorage";
import { useState } from "react";
import React from "react";

interface OptionsProps {
  isVisible: boolean;
  onToggle: () => void;
  isSupporter: boolean
}

export default function Options({ isVisible, onToggle, isSupporter }: OptionsProps) {
  // const [overlayVisible, setOverlayVisible] = useState(true);
  const { settings, updateSetting } = useGlobalContext();
  const conditionReminderOn = settings.conditionReminderOn === true ? false : true;
  return (
    <>
      <button id="optionsButton" title="Options and settings" onClick={onToggle}>
        {isVisible ? "Close Options" : "Options"}
      </button>
      
      {isVisible && (
        <div id="options">
          <button id="optionsCloseButton" onClick={onToggle}>Close</button>
            <div>
                <ul>
                    <li><ToggleComponent /></li>
                    <li><button onClick={() => updateSetting('conditionReminderOn', !settings.conditionReminderOn)} id="buttonConditionReminder">Condition Reminder Pop-up: {conditionReminderOn === true ? 'On' : 'Off'}</button></li>
                    <li id="colorMode">{isSupporter && (<><input type="checkbox" id="light-dark"></input><label htmlFor="light-dark">Light/Dark mode</label></>)}</li>
                    {isSupporter && (
                          <>
                            <li><button id="buttonDownloadData" onClick={exportAllToJson}>Download Heroes and active Combat</button></li>
                            <li id="uploadData"><h2><label htmlFor="inputImportData">Upload your data</label></h2>
                            <input id="inputImportData" type="file" accept=".json" onChange={importFromJson}/></li>
                          </>
                        )}
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



