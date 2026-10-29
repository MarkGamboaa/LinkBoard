DROP INDEX "BoardInvite_boardId_email_idx";

ALTER TABLE "BoardInvite"
  DROP COLUMN "email";
