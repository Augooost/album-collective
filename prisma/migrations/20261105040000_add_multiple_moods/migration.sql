ALTER TABLE "JournalEntry" ADD COLUMN "moodTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "JournalEntry" SET "moodTags" = ARRAY["mood"] WHERE "mood" IS NOT NULL;
