-- Keep workspace media references separate from optional external image URLs.
ALTER TABLE "WorkspaceBranding" ADD COLUMN "logoMediaId" TEXT;
ALTER TABLE "WorkspaceBranding" ADD COLUMN "logoDarkMediaId" TEXT;
ALTER TABLE "WorkspaceBranding" ADD COLUMN "faviconMediaId" TEXT;
ALTER TABLE "WorkspaceBranding" ADD COLUMN "loginHeroMediaId" TEXT;
