-- PAY-06C: retain the provider status needed to normalize iyzico webhook events.
ALTER TABLE "PaymentWebhookEvent" ADD COLUMN "providerStatus" TEXT;
