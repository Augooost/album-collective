"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function VerifySpotifyButton({ disabled = false }: { disabled?: boolean }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick() {
    setConnecting(true);
    setError(false);

    try {
      await signIn("spotify", { callbackUrl: "/" });
    } catch {
      setError(true);
      setConnecting(false);
    }
  }

  return (
    <div className="welcome-signin">
      <button type="button" className="welcome-spotify-button" onClick={handleClick}
        disabled={disabled || connecting} aria-busy={connecting}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="12" />
          <g fill="none" stroke="var(--spotify-button-bg)" strokeLinecap="round">
            <path d="M5.2 8.7c4.2-1.3 9.6-.8 13 1.2" strokeWidth="1.8" />
            <path d="M6.1 12c3.7-1 7.7-.6 10.9 1.1" strokeWidth="1.6" />
            <path d="M6.9 15.2c2.9-.7 6.1-.4 8.8.9" strokeWidth="1.4" />
          </g>
        </svg>
        {connecting ? "Connecting to Spotify…" : "Continue with Spotify"}
      </button>
      {error && <p className="welcome-error" role="alert">Couldn’t connect to Spotify. Please try again.</p>}
    </div>
  );
}
