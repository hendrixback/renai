import "server-only";

import { render } from "@react-email/render";
import * as React from "react";

import TaskAssignedEmail, {
  type TaskAssignedEmailProps,
} from "../../../emails/task-assigned";
import { dispatchEmail, type SendResult } from "./client";

export type SendTaskAssignedEmailInput = TaskAssignedEmailProps & {
  /** Recipient email — kept separate from the template props so the
   *  template stays focused on rendering. */
  recipientEmail: string;
};

export async function sendTaskAssignedEmail(
  input: SendTaskAssignedEmailInput,
): Promise<SendResult> {
  const { recipientEmail, ...templateProps } = input;
  const html = await render(
    React.createElement(TaskAssignedEmail, templateProps),
  );
  const text = await render(
    React.createElement(TaskAssignedEmail, templateProps),
    { plainText: true },
  );

  return dispatchEmail({
    to: recipientEmail,
    subject: `New task assigned: ${input.taskTitle}`,
    html,
    text,
    tags: [
      { name: "type", value: "task-assigned" },
      { name: "priority", value: input.priority.toLowerCase() },
    ],
  });
}
