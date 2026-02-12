import { DEVMODE } from "../utils/devmode";



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
        {isVisible ? "Close About" : "About"}
      </button>
      
      {isVisible && (
        <div id="about">
          <button id="aboutCloseButton" onClick={onToggle}>Close</button>
            <div id="instructions">
              
              <h3>Instructions</h3>
                <ul>
                    <li>Toggle your D&D edition (5e 2014/2024) using the rules version button in Options.</li> 
                    <li className="indent">This affects concentration checks, condition definitions and which monsters auto populate in the monster manager dropdown.</li>
                    <br/>
                    <li>Monsters are removed from the Manager when added to battle.</li>
                    <br/>
                    <li>Patreon members can use the Battle Manager to save battles as well as export and import all data.</li>
                    
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



