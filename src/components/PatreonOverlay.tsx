import { DEVMODE } from "../utils/devmode";

// src/components/PatreonOverlay.tsx
import { useEffect, useState } from "react";

interface PatreonOverlayProps {
    onClose: () => void;
}

export default function PatreonOverlay({ onClose }: PatreonOverlayProps) {
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

    const handlePatreonLogin = () => {
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
