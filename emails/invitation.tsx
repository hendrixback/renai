import { Section, Text } from "@react-email/components";
import * as React from "react";

import {
  EmailLayout,
  PrimaryButton,
  baseStyles,
  captionStyle,
  headingStyle,
  monoCaptionStyle,
  paragraphStyle,
  tokens,
} from "./_components";

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

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Collaborator",
  VIEWER: "Viewer",
};

export default function InvitationEmail({
  recipientEmail,
  companyName,
  inviterName,
  role,
  inviteUrl,
  expiresAt,
}: InvitationEmailProps) {
  const inviterLabel = inviterName ?? "An admin";
  const roleLabel = ROLE_LABELS[role] ?? role;
  return (
    <EmailLayout
      preview={`${inviterLabel} invited you to join ${companyName} on RenAI`}
    >
      <Section style={baseStyles.contentSection}>
        <Text style={headingStyle}>You&apos;ve been invited to RenAI</Text>
        <Text style={paragraphStyle}>
          {inviterLabel} added you (<strong>{recipientEmail}</strong>) to{" "}
          <strong>{companyName}</strong>.
        </Text>

        <Section
          style={{
            margin: "20px 0 4px",
            padding: "14px 16px",
            backgroundColor: tokens.colors.accentSoft,
            borderRadius: tokens.radius.chip,
            border: `1px solid ${tokens.colors.borderSoft}`,
          }}
        >
          <table
            role="presentation"
            cellPadding={0}
            cellSpacing={0}
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <tr>
              <td>
                <Text
                  style={{
                    margin: 0,
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: tokens.colors.textSubtle,
                  }}
                >
                  Workspace
                </Text>
                <Text
                  style={{
                    margin: "2px 0 0",
                    fontSize: "15px",
                    fontWeight: 600,
                    color: tokens.colors.text,
                  }}
                >
                  {companyName}
                </Text>
              </td>
              <td style={{ textAlign: "right" }}>
                <Text
                  style={{
                    margin: 0,
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: tokens.colors.textSubtle,
                  }}
                >
                  Role
                </Text>
                <Text
                  style={{
                    margin: "2px 0 0",
                    fontSize: "15px",
                    fontWeight: 600,
                    color: tokens.colors.brand,
                  }}
                >
                  {roleLabel}
                </Text>
              </td>
            </tr>
          </table>
        </Section>

        <Text style={paragraphStyle}>
          Accept the invite to set your password and start managing your
          company&apos;s sustainability data.
        </Text>
      </Section>

      <Section
        style={{
          padding: "16px 40px 28px",
          textAlign: "center" as const,
        }}
      >
        <PrimaryButton href={inviteUrl}>Accept invitation</PrimaryButton>
      </Section>

      <Section
        style={{
          padding: "0 40px 28px",
        }}
      >
        <Text style={captionStyle}>Or paste this link into your browser:</Text>
        <Text style={monoCaptionStyle}>{inviteUrl}</Text>
        <Text
          style={{
            ...captionStyle,
            marginTop: "16px",
          }}
        >
          This invitation expires on{" "}
          <strong>{dateFmt.format(expiresAt)}</strong>.
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
