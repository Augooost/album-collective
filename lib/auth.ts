import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

import { prisma } from "@/lib/prisma";

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
      authorization:
        "https://accounts.spotify.com/authorize?scope=user-read-email,user-read-private,playlist-read-private"
    })
  ],
  pages: {
    signIn: "/"
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
