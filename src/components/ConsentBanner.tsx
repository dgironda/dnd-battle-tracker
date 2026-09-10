import { useState } from "react";
import { DISCORD_URL } from "../utils/links";
import { needsDecision, setConsent } from "../utils/consent";

/**
 * The cookie bar.
 *
 * Two things it deliberately does not do. It does not block the page — a DM who
 * ignores it can still run their whole session, because holding a combat
 * tracker hostage over an analytics question would be worse than not measuring
 * at all. And Decline is a real button of the same size as Accept, rather than
 * a grey link hidden under a "Manage preferences" fold, because the pattern
 * where refusing takes four clicks is the one regulators keep fining people for.
 *
 * Mounted from App with its own visibility state so a decision removes it
 * immediately rather than on the next load.
 */
export default function ConsentBanner() {
  const [showing, setShowing] = useState(needsDecision);

  if (!showing) return null;

  const decide = (consent: "granted" | "denied") => {
    setConsent(consent);
    setShowing(false);
  };

  return (
    <div className="consentBar" role="dialog" aria-label="Analytics consent" aria-live="polite">
      <p className="consentText">
        We count how the tracker gets used — which managers get opened, how big
        fights are, what crashes — so we know what to fix next. No character
        names, no battle contents, ever.{" "}
        <a href={DISCORD_URL} target="_blank" rel="noreferrer">
          Ask us anything on Discord
        </a>
        .
      </p>
      <div className="consentButtons">
        <button type="button" className="drawnBtn" onClick={() => decide("denied")}>
          No thanks
        </button>
        <button type="button" className="drawnBtn isGreen" onClick={() => decide("granted")}>
          That&apos;s fine
        </button>
      </div>
    </div>
  );
}
