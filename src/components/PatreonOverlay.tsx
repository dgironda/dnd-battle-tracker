// src/components/PatreonOverlay.tsx
import { useEffect, useState } from "react";
import { track } from "../utils/telemetry";

export type SupporterPromptReason = "first_visit" | "battle_manager" | "locked_wallpaper";

interface PatreonOverlayProps {
    onClose: () => void;
    /** What put it on screen. The same prompt, three quite different moments. */
    reason: SupporterPromptReason;
}

export default function PatreonOverlay({ onClose, reason }: PatreonOverlayProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const code = new URLSearchParams(window.location.search).get("code");
        const storedCode = localStorage.getItem("patreon_code");

        if (code) {
            // Store the code so they stay authorized
            localStorage.setItem("patreon_code", code);
            setIsVisible(false);
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (!storedCode) {
            // Show the overlay every time if not logged in
            setIsVisible(true);
        }
    }, []);

    /* Reported when it actually becomes visible, not on mount: the first-visit
       overlay decides in an effect whether it has anything to say, and counting
       the ones it decides against would make the prompt look far more common
       than it is. */
    useEffect(() => {
        if (isVisible) track("supporter_prompt_shown", { reason });
    }, [isVisible, reason]);

    const handlePatreonLogin = () => {
        track("supporter_prompt_clicked", { reason });
        const clientId = import.meta.env.VITE_PATREON_CLIENT_ID;
        const redirectUri = import.meta.env.VITE_PATREON_REDIRECT_URI;
        const authUrl = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`;
        window.location.href = authUrl;
    };

    const handleContinue = () => {
        // Simply close this session’s overlay, no localStorage persistence
        setIsVisible(false);
        onClose();
    };

    if (!isVisible) return null;

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
