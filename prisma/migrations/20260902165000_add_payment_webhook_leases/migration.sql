-- PAY-06C: lease inbox work so concurrent and interrupted workers are recoverable.
ALTER TABLE "PaymentWebhookEvent" ADD COLUMN "lockedUntil" DATETIME;
ALTER TABLE "PaymentWebhookEvent" ADD COLUMN "lockedBy" TEXT;

CREATE INDEX "PaymentWebhookEvent_processingStatus_lockedUntil_idx"
ON "PaymentWebhookEvent"("processingStatus", "lockedUntil");
