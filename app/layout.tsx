import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Manrope } from "next/font/google";
import { getServerSession } from "next-auth";

import { LayoutShell } from "@/components/LayoutShell";
import { authOptions, getMissingSpotifyAuthEnv } from "@/lib/auth";

import "./globals.css";
import "./catalog-theme.css";
import "./album-drawer.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  fallback: ["sans-serif"]
});

export const metadata: Metadata = {
  title: "Album Collective",
  description: "Private Spotify-based shared music journal"
};

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const [session, cookieStore] = await Promise.all([getServerSession(authOptions), cookies()]);
  const theme = cookieStore.get("album-theme")?.value === "light" ? "light" : "dark";
  const missingSpotifyAuthEnv = getMissingSpotifyAuthEnv();

  return (
    <html lang="en" data-theme={theme} suppressHydrationWarning>
      <body className={manrope.className}>
        <LayoutShell
          loggedIn={Boolean(session?.user?.id)}
          missingEnv={missingSpotifyAuthEnv}
        >
          {children}
        </LayoutShell>
      </body>
    </html>
  );
}
