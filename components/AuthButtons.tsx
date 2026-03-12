"use client";

import { signIn, signOut } from "next-auth/react";

type Props = {
  loggedIn: boolean;
  missingEnv: string[];
};

export function AuthButtons({ loggedIn, missingEnv }: Props) {
  if (!loggedIn) {
    const hasMissingEnv = missingEnv.length > 0;

    return (
      <div className="stack-sm">
        <button
          onClick={() => signIn("spotify")}
          disabled={hasMissingEnv}
          title={hasMissingEnv ? "Spotify auth is not configured." : undefined}
        >
          Sign in with Spotify
        </button>
        {hasMissingEnv ? (
          <p className="error">
            Spotify auth is not configured. Missing: {missingEnv.join(", ")}
          </p>
        ) : null}
      </div>
    );
  }

  return <button onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button>;
}
