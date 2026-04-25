import "server-only";

import { render } from "@react-email/render";
import * as React from "react";

import InvitationEmail, {
  type InvitationEmailProps,
} from "../../../emails/invitation";
import { dispatchEmail, type SendResult } from "./client";

export type SendInvitationEmailInput = InvitationEmailProps & {
  /** Tenant id — included as a Resend tag so the webhook handler
   *  can correlate inbound events back to the right company without
   *  doing a DB lookup on every event. */
  companyId: string;
};

export async function sendInvitationEmail(
  input: SendInvitationEmailInput,
): Promise<SendResult> {
  const { companyId, ...templateProps } = input;
  const html = await render(
    React.createElement(InvitationEmail, templateProps),
  );
  const text = await render(
    React.createElement(InvitationEmail, templateProps),
    { plainText: true },
  );

  return dispatchEmail({
    to: input.recipientEmail,
    subject: `You've been invited to ${input.companyName} on RenAI`,
    html,
    text,
    tags: [
      { name: "type", value: "invitation" },
      // Sanitised by dispatchEmail — pass the human-readable name
      // straight through.
      { name: "company", value: input.companyName },
      { name: "company_id", value: companyId },
    ],
  });
}
