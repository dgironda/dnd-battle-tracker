import { DEVMODE } from "../../utils/devmode";
import { useGlobalContext } from "../../hooks/optionsContext";

import { useState, useEffect } from "react";

interface RoundNumberSpanProps {
    roundNumber: number;
    timerRef: React.RefObject<HTMLSpanElement | null>;
}

const RoundNumberSpan: React.FC<RoundNumberSpanProps> = ({roundNumber, timerRef}) => {
    const [isVisible, setIsVisible] = useState(true);
    useEffect(() => {
    setIsVisible(roundNumber !== 0);
    }, [roundNumber]);
    const { settings } = useGlobalContext();
    const currentTurnTime = settings.currentTurnTime ?? true;
    
    return (
        <>
            {(isVisible ? <span>Combat Round {roundNumber}</span> : null)}
            {currentTurnTime && (<div id="turnTimeDisplay">
                <span>Current Turn Time: </span><span ref={timerRef}>Advance the turn to start the timer</span>
            </div>)}
        </>
    );
  }

  export default RoundNumberSpan
