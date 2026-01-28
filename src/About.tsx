import { DEVMODE } from "./utils/devmode";


import Options from "./Options";


import React from "react";

interface AboutProps {
  isVisible: boolean;
  onToggle: () => void;
}

export default function About({ isVisible, onToggle }: AboutProps) {

  return (
    <>
      <button id="aboutButton" title="Instructions and credits" onClick={onToggle}>
        {isVisible ? "Close About" : "About / Instructions"}
      </button>
      
      {isVisible && (
        <div id="about">
          <button id="aboutCloseButton" onClick={onToggle}>Close</button>
            <div id="instructions">
                <ul>
                    <li>Toggle your D&D edition (5e 2014/2024) using the rules version button in Options.</li> 
                    <li className="indent">This affects concentration checks, condition definitions and which monsters auto populate in the monster manager dropdown.</li>
                    <li>Add party members and recurring characters via the Hero Manager.</li>
                    <li>Configure hero stats as needed. Uncheck "Ready For Next Battle" for absent party members.</li>
                    <li>Add monsters via the Monster Manager either selecting from the list or typing a name and adding stats after.</li>
                    <li className="indent">Duplicate monster names are automatically appended with numbers.</li>
                    <li className="indent">Renamed monsters retain their stat blocks if added from the dropdown.</li>
                    <li>Store multiple monsters for current or future encounters—only "Ready For Next Battle" creatures join battles.</li>
                    <li>Monsters are removed from the Manager when added to battle.</li>
                    <li>Click "Start Battle" and either enter initiative or click for a random roll for each combatant.</li>
                    <li>Track actions, bonus actions, movement, and reactions. These auto-reset at round or turn start as appropriate.</li>
                    <li>Turns advance automatically when action, bonus action, and movement are marked complete.</li>
                    <li>Apply conditions as needed and hover for quick reference tooltips.</li>
                    <li>Hover over any combatant to view their stat block.</li>
                    <li>Click a combatant's name to pin their details, accessing notes and source links.</li>
                </ul>
                <div>
                    <h3>Keyboard Shortcuts</h3>
                    <p><span className="bold">a</span> check/uncheck current player's Action</p>
                    <p><span className="bold">s</span> check/uncheck current player's Bonus</p>
                    <p><span className="bold">d</span> check/uncheck current player's Movement</p>
                    <p><span className="bold">e</span> open/close Hero Manager</p>
                    <p><span className="bold">w</span> open/close Monster Manager</p>
                    <p><span className="bold">r</span> open/close Battle Manager</p>
                    <p><span className="bold">x</span> close Combatant stat box</p>
                </div>
            </div>
            <div id="credits">
                <p>Created by: DM Dave</p>
                <p>Additional coding by: <a href="https://madmilliner.github.io/jasonPeterson/" target="_blank">Jason Peterson</a></p>
                <p>QA Testers: Danny Cullen, Jayme Andrews, Zach Dender</p>
                <p>Special Thanks: Wolf Harrington</p>
            </div>
        </div>
        )}
    </>
  );
}



