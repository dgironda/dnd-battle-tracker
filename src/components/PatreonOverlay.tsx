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
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.85)",
                color: "white",
                zIndex: 9999,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
                padding: "2rem",
            }}
        >
            <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
                Thank you for using our Battle Tracker!
            </h1>
            <p style={{ fontSize: "1.2rem", marginBottom: "2rem", maxWidth: "600px" }}>
                Support Simulacrum Technologies on Patreon to help us keep improving, or just continue to your tracker.
            </p>
            <div style={{ display: "flex", gap: "1rem" }}>
                <button
                    onClick={handlePatreonLogin}
                    style={{
                        backgroundColor: "#e85b46",
                        color: "white",
                        fontWeight: "bold",
                        border: "none",
                        borderRadius: "8px",
                        padding: "12px 24px",
                        cursor: "pointer",
                    }}
                >
                    Login / Support us on Patreon
                </button>
                <button
                    onClick={handleContinue}
                    style={{
                        backgroundColor: "#444",
                        color: "white",
                        border: "1px solid #777",
                        borderRadius: "8px",
                        padding: "12px 24px",
                        cursor: "pointer",
                    }}
                >
                    Continue
                </button>
            </div>
        </div>
    );
}
