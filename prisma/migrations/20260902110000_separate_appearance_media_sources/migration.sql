-- Keep local media references separate from optional external image URLs.
ALTER TABLE "FormAppearance" ADD COLUMN "headerLogoMediaId" TEXT;
ALTER TABLE "FormAppearance" ADD COLUMN "headerBgMediaId" TEXT;
ALTER TABLE "FormAppearance" ADD COLUMN "footerLogoMediaId" TEXT;
