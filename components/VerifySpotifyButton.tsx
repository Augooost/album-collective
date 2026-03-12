"use client";

import { signIn } from "next-auth/react";

export function VerifySpotifyButton() {
  const fallbackHref = "/api/auth/signin?callbackUrl=%2F";

  async function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    try {
      const result = await signIn("spotify", {
        callbackUrl: "/",
        redirect: false
      });

      window.location.assign(result?.url ?? fallbackHref);
    } catch {
      window.location.assign(fallbackHref);
    }
  }

  return (
    <a
      href={fallbackHref}
      className="button-link"
      onClick={handleClick}
    >
      Verify Spotify Sign-In
    </a>
  );
}
