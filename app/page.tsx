import { getServerSession } from "next-auth";

import { HomeShell } from "@/components/home/HomeShell";
import { VerifySpotifyButton } from "@/components/VerifySpotifyButton";
import { authOptions } from "@/lib/auth";
import { visibleListening } from "@/lib/listening";
import { prisma } from "@/lib/prisma";

type SearchParams = Record<string, string | string[] | undefined>;

type HomePageProps = {
  searchParams?: Promise<SearchParams>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await getServerSession(authOptions);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const authBaseUrl = process.env.NEXTAUTH_URL ?? "";
  const spotifyCallbackUrl = authBaseUrl
    ? `${authBaseUrl}/api/auth/callback/spotify`
    : null;
  const authError =
    typeof resolvedSearchParams.error === "string"
      ? resolvedSearchParams.error
      : null;

  if (!session?.user?.id) {
    return (
      <section className="stack">
        {authError === "Callback" ? (
          <section className="card stack-sm">
            <h2>Spotify callback failed</h2>
            <p>
              Sign-in returned from Spotify, but session creation failed in the app.
            </p>
            <p className="muted">
              Most common cause: Prisma cannot connect with <code>DATABASE_URL</code>.
              Confirm your Postgres server is running and <code>DATABASE_URL</code> is
              valid in <code>.env.local</code>.
            </p>
          </section>
        ) : null}
        <section className="card stack">
          <h2>Welcome</h2>
          <p>Sign in with Spotify to start your private shared music journal.</p>
          <VerifySpotifyButton />
          {spotifyCallbackUrl ? (
            <p className="muted">
              Spotify callback URL: <code>{spotifyCallbackUrl}</code>
            </p>
          ) : null}
        </section>
      </section>
    );
  }

  const userId = session.user.id;
  const [settings, recent, shared, myRatings] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { listeningEnabled: true, shareListeningHistory: true, listeningSyncedAt: true }
    }),
    prisma.recentAlbum.findMany({
      where: visibleListening(userId),
      orderBy: [{ playedAt: "desc" }, { spotifyId: "asc" }],
      take: 250,
      include: { user: { select: { name: true, image: true } } }
    }),
    prisma.journalEntry.findMany({
      orderBy: [{ addedAt: "desc" }, { id: "asc" }],
      take: 50,
      include: { user: { select: { name: true, image: true } } }
    }),
    prisma.journalEntry.findMany({
      where: { userId, spotifyType: "ALBUM", rating: { not: null } },
      select: { spotifyId: true, rating: true }
    })
  ]);
  const ratings = new Map(myRatings.map(({ spotifyId, rating }) => [spotifyId, rating]));

  return (
    <HomeShell
      recent={recent.map((album) => ({
        ...album,
        spotifyType: "ALBUM" as const,
        spotifyUrl: `https://open.spotify.com/album/${album.spotifyId}`,
        activityAt: album.playedAt.toISOString(),
        isMine: album.userId === userId,
        myRating: ratings.get(album.spotifyId) ?? null
      }))}
      shared={shared.map((entry) => ({
        ...entry,
        activityAt: entry.addedAt.toISOString(),
        isMine: entry.userId === userId,
        myRating: entry.spotifyType === "ALBUM" ? ratings.get(entry.spotifyId) ?? null : null
      }))}
      listeningEnabled={settings.listeningEnabled}
      shareListeningHistory={settings.shareListeningHistory}
      lastSyncedAt={settings.listeningSyncedAt?.toISOString() ?? null}
      userImage={session.user.image ?? null}
    />
  );
}
