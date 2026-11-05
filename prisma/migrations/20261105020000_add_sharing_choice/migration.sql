ALTER TABLE "User" ADD COLUMN "sharingChoiceMade" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User" SET "sharingChoiceMade" = true WHERE "shareListeningHistory" = true;
