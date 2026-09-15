-- PAY-06D-27: durable provider-retrieve lease metadata.
-- The lease is only coordination state; it is not payment evidence.
ALTER TABLE "PaymentAttempt" ADD COLUMN "retrieveAttemptCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PaymentAttempt" ADD COLUMN "retrieveLockedUntil" DATETIME;
ALTER TABLE "PaymentAttempt" ADD COLUMN "retrieveLockedBy" TEXT;

CREATE INDEX "PaymentAttempt_status_retrieveLockedUntil_idx"
ON "PaymentAttempt"("status", "retrieveLockedUntil");
