import { Button, Section, Text } from "@react-email/components";
import * as React from "react";

import { EmailLayout } from "./_components";

export type InvitationEmailProps = {
  recipientEmail: string;
  companyName: string;
  inviterName: string | null;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
};

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function InvitationEmail({
  recipientEmail,
  companyName,
  inviterName,
  role,
  inviteUrl,
  expiresAt,
}: InvitationEmailProps) {
  const inviterLabel = inviterName ?? "An admin";
  return (
    <EmailLayout
      preview={`${inviterLabel} invited you to join ${companyName} on RenAI`}
    >
      <Section>
        <Text className="m-0 text-xl font-semibold">
          You&apos;ve been invited to RenAI
        </Text>
        <Text className="mt-3 text-[15px] text-[#334155]">
          {inviterLabel} added you ({recipientEmail}) to{" "}
          <strong>{companyName}</strong> as a <strong>{role}</strong>.
        </Text>
        <Text className="mt-2 text-[15px] text-[#334155]">
          Accept the invite to set your password and start using the platform.
        </Text>
      </Section>

      <Section className="mt-6 text-center">
        <Button
          href={inviteUrl}
          className="rounded-md bg-[#0f172a] px-6 py-3 text-sm font-medium text-white"
        >
          Accept invitation
        </Button>
      </Section>

      <Section className="mt-6">
        <Text className="m-0 text-xs text-[#64748b]">
          Or paste this link into your browser:
        </Text>
        <Text className="mt-1 break-all font-mono text-xs text-[#0f172a]">
          {inviteUrl}
        </Text>
        <Text className="mt-3 text-xs text-[#64748b]">
          This invitation expires on {dateFmt.format(expiresAt)}.
        </Text>
      </Section>
    </EmailLayout>
  );
}

InvitationEmail.PreviewProps = {
  recipientEmail: "alice@example.com",
  companyName: "Maxtil",
  inviterName: "João Carvalhosa",
  role: "MEMBER",
  inviteUrl: "https://app.renai.pt/signup?token=preview-token",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
} satisfies InvitationEmailProps;
