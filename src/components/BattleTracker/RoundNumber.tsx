import { DEVMODE } from "../../utils/devmode";

import { useState, useEffect } from "react";

interface RoundNumberSpanProps {
    roundNumber: number;
}

const RoundNumberSpan: React.FC<RoundNumberSpanProps> = ({roundNumber}) => {
    const [isVisible, setIsVisible] = useState(true);
    useEffect(() => {
    setIsVisible(roundNumber !== 0);
    }, [roundNumber]);
    
    return (
        isVisible ? <span id="round">Combat Round {roundNumber}</span> : null
    );
  }

  export default RoundNumberSpan
