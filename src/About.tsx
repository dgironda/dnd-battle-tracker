import { DEVMODE } from "./utils/devmode";

import React from "react";

interface AboutProps {
  isVisible: boolean;
  onToggle: () => void;
}

export default function About({ isVisible, onToggle }: AboutProps) {
  return (
    <>
      <button title="Instructions and credits" onClick={onToggle}>
        {isVisible ? "Close About" : "About / Instructions"}
      </button>
      
      {isVisible && (
        <div id="about">
            <div id="instructions">
                <ul>
                    <li>Change your D&D 5e version with the button in the upper right as needed, this currently affects conditions</li>
                    <li>Add your party's heroes to the Hero Manager</li>
                    <li>Edit heroes' stats as needed, as much or as little as is useful for you, uncheck present for anyone not present for the battle</li>
                    <li>Add monsters in the Monster Manager and mark the ones for the upcoming battle as present</li>
                    <li>You can have as many monsters ready to be added to the battle or for upcoming battles as you like</li>
                    <li>Only monsters and heroes checked present are added on Battle Start</li>
                    <li>Monsters added to a battle are deleted from the Monster Manager</li>
                    <li>Press Start Battle to begin and input or roll initiative for each combatant</li>
                    <li>Check action, bonus action, and movement as used/passed and reactions when they are used</li>
                    <li>Turn automatically advances when Current Turn's action, bonus, and movement are checked</li>
                    <li>Add conditions as needed, you can hover over them to get a reminder of the effects</li>
                    <li>You can hover over any hero or monster in the current battle to see their stats</li>
                    
                </ul>
                <div>
                    <h3>Keyboard Shortcuts</h3>
                    <p><span className="bold">a</span> check/uncheck current player's Action</p>
                    <p><span className="bold">s</span> check/uncheck current player's Bonus</p>
                    <p><span className="bold">d</span> check/uncheck current player's Movement</p>
                    <p><span className="bold">e</span> open/close Hero Manager</p>
                    <p><span className="bold">w</span> open/close Monster Manager</p>
                </div>
            </div>
            <div id="credits">
                <p>Created by: DM Dave</p>
                <p>Additional coding by: <a href="https://madmilliner.github.io/jasonPeterson/" target="_blank">Jason Peterson</a></p>
                <p>QA Testers: Danny Cullen, Jayme Andrews, Zach Dender</p>
                <p>Special Thanks: Wolf Harrington</p>
                <p>Join our <a href="https://discord.gg/m4AnYSDueM" target="_blank">Discord server</a></p>
            </div>
        </div>
        )}
    </>
  );
}



