ALTER TABLE "User"
ADD COLUMN "listeningEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "shareListeningHistory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "listeningSyncedAt" TIMESTAMP(3);

CREATE TABLE "RecentAlbum" (
    "userId" TEXT NOT NULL,
    "spotifyId" TEXT NOT NULL,
    "entryKind" "EntryKind" NOT NULL,
    "title" TEXT NOT NULL,
    "artistName" TEXT,
    "releaseDate" TEXT,
    "imageUrl" TEXT,
    "playedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RecentAlbum_pkey" PRIMARY KEY ("userId", "spotifyId"),
    CONSTRAINT "RecentAlbum_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "RecentAlbum_playedAt_idx" ON "RecentAlbum"("playedAt");
CREATE INDEX "RecentAlbum_spotifyId_playedAt_idx" ON "RecentAlbum"("spotifyId", "playedAt");
