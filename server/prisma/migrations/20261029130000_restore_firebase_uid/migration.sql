DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'UserProfile'
      AND column_name = 'authUid'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'UserProfile'
      AND column_name = 'firebaseUid'
  ) THEN
    ALTER TABLE "UserProfile" RENAME COLUMN "authUid" TO "firebaseUid";
  END IF;
END $$;
