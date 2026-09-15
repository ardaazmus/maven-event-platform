-- PAY-06B: retain only normalized amount/currency metadata needed for order matching.
ALTER TABLE "PaymentWebhookEvent" ADD COLUMN "amountMinor" INTEGER;
ALTER TABLE "PaymentWebhookEvent" ADD COLUMN "currency" TEXT;
