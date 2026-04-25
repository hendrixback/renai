import { Button, Section, Text } from "@react-email/components";
import * as React from "react";

import { EmailLayout } from "./_components";

export type TaskAssignedEmailProps = {
  assigneeName: string | null;
  assignerName: string | null;
  taskTitle: string;
  taskDescription: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate: Date | null;
  taskUrl: string;
  companyName: string;
};

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const PRIORITY_LABELS: Record<TaskAssignedEmailProps["priority"], string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export default function TaskAssignedEmail({
  assigneeName,
  assignerName,
  taskTitle,
  taskDescription,
  priority,
  dueDate,
  taskUrl,
  companyName,
}: TaskAssignedEmailProps) {
  const assignerLabel = assignerName ?? "An admin";
  const greetingName = assigneeName?.split(" ")[0] ?? "there";

  return (
    <EmailLayout
      preview={`${assignerLabel} assigned you "${taskTitle}" on RenAI`}
    >
      <Section>
        <Text className="m-0 text-xl font-semibold">New task assigned</Text>
        <Text className="mt-3 text-[15px] text-[#334155]">
          Hi {greetingName}, {assignerLabel} assigned you a task in{" "}
          <strong>{companyName}</strong>:
        </Text>
      </Section>

      <Section className="mt-4 rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-4">
        <Text className="m-0 text-base font-semibold text-[#0f172a]">
          {taskTitle}
        </Text>
        {taskDescription ? (
          <Text className="mt-2 text-sm text-[#475569]">{taskDescription}</Text>
        ) : null}
        <Text className="mt-3 text-xs text-[#64748b]">
          Priority: <strong>{PRIORITY_LABELS[priority]}</strong>
          {dueDate ? (
            <>
              {" · "}
              Due: <strong>{dateFmt.format(dueDate)}</strong>
            </>
          ) : null}
        </Text>
      </Section>

      <Section className="mt-6 text-center">
        <Button
          href={taskUrl}
          className="rounded-md bg-[#0f172a] px-6 py-3 text-sm font-medium text-white"
        >
          Open task
        </Button>
      </Section>

      <Section className="mt-6">
        <Text className="m-0 text-xs text-[#64748b]">
          You can view all your assigned work at{" "}
          <a href={taskUrl.split("/tasks")[0] + "/tasks?scope=mine"}>
            /tasks?scope=mine
          </a>
          .
        </Text>
      </Section>
    </EmailLayout>
  );
}

TaskAssignedEmail.PreviewProps = {
  assigneeName: "Alice Silva",
  assignerName: "João Carvalhosa",
  taskTitle: "Upload Q1 fuel invoices",
  taskDescription:
    "We need the diesel + LPG invoices for Jan-Mar to reconcile the Scope 1 entries before the audit.",
  priority: "HIGH",
  dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  taskUrl: "https://app.renai.pt/tasks",
  companyName: "Maxtil",
} satisfies TaskAssignedEmailProps;
