-- PAY-06D-36: durable retry schedule for provider retrieve failures.
ALTER TABLE "PaymentAttempt" ADD COLUMN "retrieveNextAttemptAt" DATETIME;

CREATE INDEX "PaymentAttempt_status_retrieveNextAttemptAt_idx"
ON "PaymentAttempt"("status", "retrieveNextAttemptAt");
