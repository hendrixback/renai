import "server-only";

import { render } from "@react-email/render";
import * as React from "react";

import InvitationEmail, {
  type InvitationEmailProps,
} from "../../../emails/invitation";
import { dispatchEmail, type SendResult } from "./client";

export type SendInvitationEmailInput = InvitationEmailProps;

export async function sendInvitationEmail(
  input: SendInvitationEmailInput,
): Promise<SendResult> {
  const html = await render(React.createElement(InvitationEmail, input));
  const text = await render(React.createElement(InvitationEmail, input), {
    plainText: true,
  });

  return dispatchEmail({
    to: input.recipientEmail,
    subject: `You've been invited to ${input.companyName} on RenAI`,
    html,
    text,
    tags: [
      { name: "type", value: "invitation" },
      { name: "company", value: input.companyName.slice(0, 64) },
    ],
  });
}
