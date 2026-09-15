-- INV/F P-01C: optimistic version for atomic refresh-token rotation.
ALTER TABLE "ParasutConnection" ADD COLUMN "credentialVersion" INTEGER NOT NULL DEFAULT 1;
