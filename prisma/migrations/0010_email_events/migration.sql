-- Migration: 0010_email_events
--
-- WHAT:
--   Adds the EmailEvent table + EmailEventType enum to capture
--   inbound Resend webhook deliveries (bounces, spam complaints,
--   delivery confirmations). Adds Invitation.resendMessageId so
--   webhook events can be correlated back to the originating invite.
--
-- WHY:
--   Today the team-invite UI shows "Invite emailed to X" without any
--   verification that the message was actually delivered. If Gmail
--   bounces it, the admin keeps thinking the recipient got the link.
--   Persisted webhook events let /settings/team surface bounce status
--   per pending invitation.
--
-- SAFETY:
--   Zero-downtime. New table + new optional column with no default
--   change to existing rows.
--
-- ROLLBACK:
--   ALTER TABLE "Invitation" DROP COLUMN "resendMessageId";
--   DROP TABLE "EmailEvent";
--   DROP TYPE "EmailEventType";

-- CreateEnum
CREATE TYPE "EmailEventType" AS ENUM ('SENT', 'DELIVERED', 'DELIVERY_DELAYED', 'BOUNCED', 'COMPLAINED');

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN "resendMessageId" TEXT;

-- CreateIndex
CREATE INDEX "Invitation_resendMessageId_idx" ON "Invitation"("resendMessageId");

-- CreateTable
CREATE TABLE "EmailEvent" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "resendMessageId" TEXT NOT NULL,
    "type" "EmailEventType" NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "bounceType" TEXT,
    "reason" TEXT,
    "companyId" TEXT,
    "rawPayload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailEvent_webhookId_key" ON "EmailEvent"("webhookId");

-- CreateIndex
CREATE INDEX "EmailEvent_resendMessageId_idx" ON "EmailEvent"("resendMessageId");

-- CreateIndex
CREATE INDEX "EmailEvent_companyId_type_idx" ON "EmailEvent"("companyId", "type");

-- CreateIndex
CREATE INDEX "EmailEvent_emailAddress_type_idx" ON "EmailEvent"("emailAddress", "type");

-- CreateIndex
CREATE INDEX "EmailEvent_receivedAt_idx" ON "EmailEvent"("receivedAt");

-- AddForeignKey
ALTER TABLE "EmailEvent" ADD CONSTRAINT "EmailEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
