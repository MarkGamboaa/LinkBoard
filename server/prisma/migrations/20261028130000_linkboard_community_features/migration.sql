-- Add notes, tags, and website preview metadata to saved links.
ALTER TABLE "Link"
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "note" TEXT,
  ADD COLUMN "siteTitle" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "previewImageUrl" TEXT,
  ADD COLUMN "faviconUrl" TEXT;

-- Board members can edit links on boards shared with them.
CREATE TABLE "BoardMember" (
  "boardId" TEXT NOT NULL,
  "userUid" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BoardMember_pkey" PRIMARY KEY ("boardId", "userUid")
);

CREATE INDEX "BoardMember_userUid_idx" ON "BoardMember"("userUid");

ALTER TABLE "BoardMember"
  ADD CONSTRAINT "BoardMember_boardId_fkey"
  FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invitations store only a hash of the bearer token; raw tokens are shown once to the board owner.
CREATE TABLE "BoardInvite" (
  "id" TEXT NOT NULL,
  "boardId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "invitedByUid" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BoardInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BoardInvite_tokenHash_key" ON "BoardInvite"("tokenHash");
CREATE INDEX "BoardInvite_boardId_email_idx" ON "BoardInvite"("boardId", "email");

ALTER TABLE "BoardInvite"
  ADD CONSTRAINT "BoardInvite_boardId_fkey"
  FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
