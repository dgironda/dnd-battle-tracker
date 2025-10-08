import React from "react";

export function About() {

    return (
        <>
        <button id="aboutButton" onClick={openAbout}>About</button>
        <div id="about">
            <div id="instructions">
                <ul>
                    <li>Add your parties heroes to the Hero Manager</li>
                    <li>Add and delete monsters in the Monster Manager to suit your needs for the planned battle</li>
                    <li>Press Start Battle to begin the combat with Present heroes</li>
                    <li>Check actions, movement, bonus actions, and reactions as used</li>
                    <li>Turn automatically advances when Current Turn's action, bonus, and movement are checked</li>
                    <li>Add conditions as needed, you can hover over them to get a reminder of the effects</li>
                    <li>You can hover over any hero or monster in the current battle to see their stats</li>
                    
                </ul>
                <div>
                    <h3>Keyboard Shortcuts</h3>
                    <p><span className="bold">a</span> check/uncheck current player's Action</p>
                    <p><span className="bold">s</span> check/uncheck current player's Bonus</p>
                    <p><span className="bold">d</span> check/uncheck current player's Movement</p>
                </div>
            </div>
            <div id="credits">
                <p>Created by: DM Dave</p>
                <p>Additional coding by: <a href="https://madmilliner.github.io/jasonPeterson/" target="_blank">Jason Peterson</a></p>
                <p>QA Testers: Danny Cullen, Jayme Andrews, Jason Peterson</p>
                <p>Special Thanks: Wolf Harrington</p>
            </div>
        </div>
        </>
    )
        function openAbout() {
  var about = document.getElementById("about");
  if (!about) return
  if (about.style.display === "none") {
    about.style.display = "block";
  } else {
    about.style.display = "none";
  }
} 
}



