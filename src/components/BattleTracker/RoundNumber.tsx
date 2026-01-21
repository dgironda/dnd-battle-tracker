import { DEVMODE } from "../../utils/devmode";
import { useGlobalContext } from "../../hooks/optionsContext";

import { useState, useEffect } from "react";

interface RoundNumberSpanProps {
    roundNumber: number;
    elapsed: string;
}

const RoundNumberSpan: React.FC<RoundNumberSpanProps> = ({roundNumber, elapsed}) => {
    const [isVisible, setIsVisible] = useState(true);
    useEffect(() => {
    setIsVisible(roundNumber !== 0);
    }, [roundNumber]);
    const { settings } = useGlobalContext();
    const currentTurnTime = settings.currentTurnTime ?? true;
    
    return (
        <>
            {(isVisible ? <span>Combat Round {roundNumber}</span> : null)}
            {currentTurnTime && (<div id="turnTimeDisplay">Current turn time: {elapsed}</div>)}
        </>
    );
  }

  export default RoundNumberSpan
