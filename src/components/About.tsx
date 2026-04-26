import { DEVMODE } from "../utils/devmode";
import Options from "./Options";
import React from "react";
import KeyA from '../assets/draftsvgs_v2/key_a.svg'
import KeyS from '../assets/draftsvgs_v2/key_s.svg'
import KeyD from '../assets/draftsvgs_v2/key_d.svg'
import KeyW from '../assets/draftsvgs_v2/key_w.svg'
import KeyE from '../assets/draftsvgs_v2/key_e.svg'
import KeyR from '../assets/draftsvgs_v2/key_r.svg'
import KeyX from '../assets/draftsvgs_v2/key_x.svg'

interface AboutProps {
  isVisible: boolean;
  onToggle: () => void;
}

export default function About({ isVisible, onToggle }: AboutProps) {

  return (
    <>
      <button id="aboutButton" title="Instructions and credits" onClick={onToggle}>
        {isVisible ? "" : ""}
      </button>
      
      {isVisible && (
        <div id="about">
          <button id="aboutCloseButton" onClick={onToggle}>X</button>
            <div id="instructions">
              
              <h3>Instructions</h3>
                <ul>
                    <li>Toggle your D&D edition (5e 2014/2024) using the rules version button in Options.</li> 
                    <li className="indent">This affects concentration checks, condition definitions and which monsters you can add in the monster manager dropdown.</li>
                    <li>You can turn off/on the turn condition reminders and time display as well as reset the tour in Options.</li>
                    <br/>
                    <li>Monsters are removed from the Manager when added to battle.</li>
                    <br/>
                    <li>During battle Concentration and Death Saving Throw reminders will pop up if the correct status is marked.</li>
                    <li>Patreon members can use the Battle Manager to save battles as well as export and import all data.</li>
                    
                </ul>
                <div>
                    <h3>Keyboard Shortcuts</h3>
                    <p><img src={KeyA} alt="A key" className="keyShortcut"></img> - check/uncheck current player's Action</p>
                    <p><img src={KeyS} alt="S key" className="keyShortcut"></img> - check/uncheck current player's Bonus</p>
                    <p><img src={KeyD} alt="D key" className="keyShortcut"></img> - check/uncheck current player's Movement</p>
                    <p><img src={KeyE} alt="E key" className="keyShortcut"></img> - open/close Hero Manager</p>
                    <p><img src={KeyW} alt="W key" className="keyShortcut"></img> - open/close Monster Manager</p>
                    <p><img src={KeyR} alt="R key" className="keyShortcut"></img> - open/close Battle Manager</p>
                    <p><img src={KeyX} alt="X key" className="keyShortcut"></img> - close Combatant hover stat box</p>
                </div>
            </div>
            <div id="credits">
                <p>Created by: DM Dave</p>
                <p>Additional coding by: <a href="https://madmilliner.github.io/jasonPeterson/" target="_blank">Jason Peterson</a></p>
                <p>Art by <a href="https://bio.site/aetherillo" target="_blank">Aether Ilo - Emily</a></p>
                <p>QA Testers: Danny Cullen, Jayme Andrews, Zach Dender</p>
                <p>Special Thanks: Wolf Harrington</p>
            </div>
        </div>
        )}
    </>
  );
}



