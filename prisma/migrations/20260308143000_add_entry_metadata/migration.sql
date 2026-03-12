-- CreateEnum
CREATE TYPE "EntryKind" AS ENUM ('TRACK', 'ALBUM', 'EP', 'PLAYLIST');

-- AlterTable
ALTER TABLE "JournalEntry"
ADD COLUMN "entryKind" "EntryKind",
ADD COLUMN "artistName" TEXT,
ADD COLUMN "albumName" TEXT,
ADD COLUMN "releaseDate" TEXT;

-- Backfill
UPDATE "JournalEntry"
SET "entryKind" =
  CASE
    WHEN "spotifyType" = 'TRACK' THEN 'TRACK'::"EntryKind"
    WHEN "spotifyType" = 'ALBUM' THEN 'ALBUM'::"EntryKind"
    ELSE 'PLAYLIST'::"EntryKind"
  END;

-- Enforce not null
ALTER TABLE "JournalEntry"
ALTER COLUMN "entryKind" SET NOT NULL;
