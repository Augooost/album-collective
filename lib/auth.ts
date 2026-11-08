import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

import { prisma } from "@/lib/prisma";
import { hasListeningScope, spotifySignInScopes } from "@/lib/spotify-scopes";

export const requiredSpotifyAuthEnv = [
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "SPOTIFY_CLIENT_ID",
  "SPOTIFY_CLIENT_SECRET",
  "DATABASE_URL"
] as const;

export function getMissingSpotifyAuthEnv(): string[] {
  return requiredSpotifyAuthEnv.filter((key) => {
    const value = process.env[key];
    return !value || value.trim().length === 0;
  });
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "database"
  },
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID ?? "",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
      authorization: { params: { scope: spotifySignInScopes } }
    })
  ],
  pages: {
    signIn: "/",
    error: "/"
  },
  events: {
    async signIn({ account, user }) {
      if (account?.provider !== "spotify") return;
      const where = { userId: user.id, provider: account.provider, providerAccountId: account.providerAccountId };
      const data = {
        access_token: account.access_token,
        expires_at: account.expires_at,
        refresh_token: account.refresh_token,
        scope: account.scope
      };
      const grantedListening = hasListeningScope(account.scope);
      if (!grantedListening) {
        // Keep the listening grant when the user signs in with the basic scopes.
        await prisma.account.updateMany({
          where: { ...where, user: { listeningEnabled: false } },
          data
        });
        return;
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { listeningEnabled: true, listeningSyncedAt: null }
        }),
        prisma.account.updateMany({ where, data })
      ]);
    }
  },
  callbacks: {
    session: ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    }
  }
};
