import { redirect } from "next/navigation";

import { CatalogShell } from "@/components/catalog/CatalogShell";
import { getSession } from "@/lib/session";
import { visibleListening } from "@/lib/listening";
import { readMoodTags } from "@/lib/moods";
import { connectedPeople } from "@/lib/people";
import { prisma } from "@/lib/prisma";

export default async function CatalogPage() {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect("/");
  }

  const userId = session.user.id;
  const [people, journal, listening] = await Promise.all([
    connectedPeople(userId),
    prisma.journalEntry.findMany({
      where: { OR: [{ userId }, { catalogOnly: false }] },
      orderBy: { addedAt: "desc" }
    }),
    prisma.recentAlbum.findMany({
      where: { ...visibleListening(userId), userId: { not: userId } },
      orderBy: { playedAt: "desc" }
    })
  ]);

  const myTags = new Map(journal.filter((entry) => entry.userId === userId)
    .map((entry) => [`${entry.spotifyType}:${entry.spotifyId}`, readMoodTags(entry)]));

  const names = new Map(people.map((person) => [person.id, person.name]));
  const entries = [
    ...journal.map(({ mood, moodTags, catalogOnly, ...entry }) => ({
      ...entry,
      moodTags: myTags.get(`${entry.spotifyType}:${entry.spotifyId}`) ?? [],
      activityLabel: "Shared" as const,
      sharedByName: catalogOnly ? null : names.get(entry.userId),
      sharedAt: catalogOnly ? undefined : entry.addedAt
    })),
    ...listening.map((album) => ({
      ...album,
      id: `listening:${album.userId}:${album.spotifyId}`,
      spotifyType: "ALBUM" as const,
      subtitle: album.artistName,
      spotifyUrl: `https://open.spotify.com/album/${album.spotifyId}`,
      addedAt: album.playedAt,
      moodTags: myTags.get(`ALBUM:${album.spotifyId}`) ?? [],
      activityLabel: "Played" as const,
      sharedByName: names.get(album.userId),
      sharedAt: album.playedAt
    }))
  ];

  return <CatalogShell entries={entries} people={people} viewerId={userId} />;
}
