// src/components/PatreonOverlay.tsx
import { useEffect } from "react";
import { track } from "../utils/telemetry";
import { patreonAuthorizeUrl } from "../utils/patreonSession";

export type SupporterPromptReason = "first_visit" | "battle_manager" | "locked_wallpaper";

interface PatreonOverlayProps {
    onClose: () => void;
    /** What put it on screen. The same prompt, three quite different moments. */
    reason: SupporterPromptReason;
}

/* Whether this is on screen is App's decision, not its own.

   It used to work the redirect out for itself — read `?code`, write it to
   localStorage, hide — which duplicated App's copy of the same logic and is
   now simply wrong: the code is exchanged server-side and nothing is stored.
   Rendering when mounted is the whole of it. */
export default function PatreonOverlay({ onClose, reason }: PatreonOverlayProps) {

    /* Mounted means visible now that App gates it, so this is the moment it is
       actually shown to somebody. */
    useEffect(() => {
        track("supporter_prompt_shown", { reason });
    }, [reason]);

    const handlePatreonLogin = () => {
        track("supporter_prompt_clicked", { reason });
        window.location.href = patreonAuthorizeUrl();
    };

    const handleContinue = () => {
        /* Closing is App's to do — it owns whether this is mounted. */
        onClose();
    };

    return (
        <div
            id="patreonOverlayDiv"
        >
            <h1>
                Thank you for using our Battle Tracker!
            </h1>
            <p>
                Support Simulacrum Technologies on Patreon to help us keep improving, or just continue to your tracker.
            </p>
            {/* The line inviting people to take the tour is gone: the tour is
                switched off behind TOUR_ENABLED (see utils/devmode.ts), so it
                was pointing at something that does not exist. The tour itself
                is still whole — bring this back with it. */}
            <div>
                <button
                    onClick={handlePatreonLogin}
                    id="patreonLogin"
                >
                    Login / Support us on Patreon
                </button>
                <button
                    onClick={handleContinue}
                    id="patreonContinue"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}
