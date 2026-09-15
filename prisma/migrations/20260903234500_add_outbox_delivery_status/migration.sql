-- Keep queue lifecycle (sent = provider accepted) separate from delivery evidence.
ALTER TABLE "OutboxEvent" ADD COLUMN "deliveryStatus" TEXT;
