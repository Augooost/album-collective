"use client";

import { signIn } from "next-auth/react";

export function VerifySpotifyButton() {
  return (
    <button
      type="button"
      className="button-link"
      onClick={() => signIn("spotify", { callbackUrl: "/" })}
    >
      Verify Spotify Sign-In
    </button>
  );
}
