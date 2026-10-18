import { useGlobalContext } from "../../hooks/optionsContext";

import { useState, useEffect } from "react";

interface RoundNumberSpanProps {
    roundNumber: number;
    timerRef: React.RefObject<HTMLSpanElement>;
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
                {/* ph-no-capture keeps the clock out of session replay, which
                    shows it as a blank box. Its text changes every second, and
                    each change made the recorder upload through the relay —
                    see SESSION_RECORDING in utils/telemetry.ts. */}
                <span ref={timerRef} className="ph-no-capture">Advance the turn to start the timer</span>
            </div>)}
        </>
    );
  }

  export default RoundNumberSpan
