-- PAY-06D-18: opaque public payment status lookup key.
-- Existing orders receive a random key; the key is never derived from the
-- internal PaymentOrder id or exposed provider identifier.
ALTER TABLE "PaymentOrder" ADD COLUMN "publicKey" TEXT;

UPDATE "PaymentOrder"
SET "publicKey" = 'pk_' || lower(hex(randomblob(24)))
WHERE "publicKey" IS NULL;

CREATE UNIQUE INDEX "PaymentOrder_publicKey_key" ON "PaymentOrder"("publicKey");
