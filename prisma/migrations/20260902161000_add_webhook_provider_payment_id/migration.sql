-- PAY-06A: keep provider payment identifiers for safe webhook-to-order matching.
ALTER TABLE "PaymentWebhookEvent" ADD COLUMN "providerPaymentId" TEXT;

CREATE INDEX "PaymentWebhookEvent_connectionId_providerPaymentId_idx"
ON "PaymentWebhookEvent"("connectionId", "providerPaymentId");
