import { HomeShell } from "@/components/home/HomeShell";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { getMissingSpotifyAuthEnv } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { visibleListening } from "@/lib/listening";
import { readMoodTags } from "@/lib/moods";
import { connectedPeople } from "@/lib/people";
import { prisma } from "@/lib/prisma";

type SearchParams = Record<string, string | string[] | undefined>;

type HomePageProps = {
  searchParams?: Promise<SearchParams>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await getSession();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const authError =
    typeof resolvedSearchParams.error === "string"
      ? resolvedSearchParams.error
      : null;

  if (!session?.user?.id) {
    return <WelcomeScreen authError={authError} signInAvailable={getMissingSpotifyAuthEnv().length === 0} />;
  }

  const userId = session.user.id;
  const [settings, recent, shared, myEntries, people] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { listeningEnabled: true, shareListeningHistory: true, sharingChoiceMade: true, listeningSyncedAt: true }
    }),
    prisma.recentAlbum.findMany({
      where: visibleListening(userId),
      orderBy: [{ playedAt: "desc" }, { spotifyId: "asc" }],
      take: 250,
      include: { user: { select: { name: true, image: true } } }
    }),
    prisma.journalEntry.findMany({
      where: { catalogOnly: false },
      omit: { mood: true, moodTags: true, catalogOnly: true },
      orderBy: [{ addedAt: "desc" }, { id: "asc" }],
      take: 50,
      include: { user: { select: { name: true, image: true } } }
    }),
    prisma.journalEntry.findMany({
      where: { userId },
      select: { spotifyType: true, spotifyId: true, rating: true, mood: true, moodTags: true }
    }),
    connectedPeople(userId)
  ]);
  const mySelections = new Map(myEntries.map((entry) => [`${entry.spotifyType}:${entry.spotifyId}`, entry]));

  return (
    <HomeShell
      userId={userId}
      people={people}
      recent={recent.map((album) => {
        const own = mySelections.get(`ALBUM:${album.spotifyId}`);
        return {
          ...album,
          spotifyType: "ALBUM" as const,
          spotifyUrl: `https://open.spotify.com/album/${album.spotifyId}`,
          activityAt: album.playedAt.toISOString(),
          isMine: album.userId === userId,
          myRating: own?.rating ?? null,
          moodTags: own ? readMoodTags(own) : []
        };
      })}
      shared={shared.map((entry) => {
        const own = mySelections.get(`${entry.spotifyType}:${entry.spotifyId}`);
        return {
          ...entry,
          activityAt: entry.addedAt.toISOString(),
          isMine: entry.userId === userId,
          myRating: own?.rating ?? null,
          moodTags: own ? readMoodTags(own) : []
        };
      })}
      listeningEnabled={settings.listeningEnabled}
      shareListeningHistory={settings.shareListeningHistory}
      showSharingPrompt={!settings.sharingChoiceMade}
      lastSyncedAt={settings.listeningSyncedAt?.toISOString() ?? null}
    />
  );
}
