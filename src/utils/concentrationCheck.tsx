import { DEVMODE } from "./devmode";

interface ConcentrationCheckModalProps {
  combatantName: string;
  dc: number;
  onPass: () => void;
  onFail: () => void;
}

export function ConcentrationCheckModal({ 
  combatantName, 
  dc, 
  onPass, 
  onFail 
}: ConcentrationCheckModalProps) {
  
  return (
    <div id="conCheckOuter">
      <div id="conCheckInner">
        <h3>
          ⚠️ Concentration Check
        </h3>
        
        <div id="conCheckMessage">
          <strong>{combatantName}</strong> must make a<br/>
          <span id="conCheckDC">
            DC {dc}
          </span><br/>
          Constitution saving throw
        </div>
        
        <p id="passConCheck">
          Did they pass the concentration check?
        </p>
        
        <div id="conCheckButtons">
          <button
            id="conPassButton"
            onClick={onPass}
          >
            ✓ Yes - Maintained
          </button>
          <button
            id="conFailButton"
            onClick={onFail}
          >
            ✗ No - Lost Concentration
          </button>
        </div>
      </div>
    </div>
  );
}
